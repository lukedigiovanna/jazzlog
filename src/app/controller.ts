import { LibraryConnection } from "./libraryConnection";
import { AppRouter } from "./appRouter";
import { EditorPersistence } from "./editorPersistence";
import type { EditorDialog, PickerInteraction } from "./editorContracts";
import { createDiscovery, type Discovery } from "./discovery";
import { createLibraryState, type LibraryStore } from "./libraryState";
import { createDialog, type DialogController } from "./dialog";
import {
  createEditorDrafts,
  type EditorDrafts,
  type DraftTarget,
} from "./editorDrafts";
import { createLifecycle } from "./lifecycle";
import type { LibraryData } from "../types/library";
import type { Genre } from "../types/albums";
import type { Album, Artist, Instrument } from "../types/albums";
import { icon } from "../components/icons";
import { escapeHtml } from "../components/html";
import {
  MetadataSearchController,
  type MetadataSearch,
} from "./metadataSearch";
import { InstrumentFeature } from "./instrumentFeature";
import { GenreFeature } from "./genreFeature";
import { ArtistFeature } from "./artistFeature";
import { AlbumEditor } from "./albumEditor";
import { createListening, type Listening } from "./listening";

export class AppController {
  private readonly lifecycle = createLifecycle();
  private readonly main = document.querySelector<HTMLElement>("main")!;
  private readonly editor =
    document.querySelector<HTMLDialogElement>("#editor")!;
  private readonly toast = document.querySelector<HTMLElement>("#toast")!;
  private readonly library: LibraryStore;
  private readonly browsingActions = new Set([
    "discover",
    "discovery-open",
    "discovery-copy",
    "layout",
    "artist-layout",
    "genre-layout",
    "clear",
    "clear-artist-filters",
    "clear-instrument-filters",
    "close",
  ]);
  private readonly connection: LibraryConnection;
  private readonly router: AppRouter;
  private readonly persistence: EditorPersistence;
  private viewHash: string;
  private toastTimer: ReturnType<typeof setTimeout> | undefined;
  private readonly dialog: DialogController;
  private readonly discovery: Discovery;
  private readonly drafts: EditorDrafts;
  private readonly listening: Listening;
  private readonly artistFeature: ArtistFeature;
  private readonly genreFeature: GenreFeature;
  private readonly instrumentFeature: InstrumentFeature;
  private readonly albumEditor: AlbumEditor;
  private readonly metadataSearch: MetadataSearch;

  constructor(data?: LibraryData, accountId = "demo", initialRefresh = false) {
    this.library = createLibraryState(data);
    this.connection = new LibraryConnection({
      accountId,
      enabled: !!data,
      editor: this.editor,
      library: this.library,
      resumeButton: () => this.drafts.resumeButton,
      canBrowse: (action) => this.browsingActions.has(action),
      renderRoute: () => this.router.render(),
    });

    this.router = new AppRouter({
      accountId,
      main: this.main,
      library: () => this.library.data,
      lists: {
        artists: (root) => this.artistFeature.renderList(root),
        genres: (root) => this.genreFeature.renderList(root),
        instruments: (root) => this.instrumentFeature.renderList(root),
      },
      onRendered: () => this.connection.update(),
    });

    this.persistence = new EditorPersistence({
      editor: this.editor,
      library: this.library,
      cacheCommitted: () => this.connection.cacheCommitted(),
      clearDraft: () => this.drafts.clearDraft(),
      renderRoute: (focus) => this.router.render(focus),
      announce: (message) => this.announce(message),
    });

    this.dialog = createDialog({
      editor: this.editor,
      main: this.main,
      formState: () => this.dialogFormState(),
      dismissDialog: () => this.dismissDialog(),
      updateArtists: () => this.artistFeature.updateArtists(),
      updateGenres: () => this.genreFeature.updateGenres(),
      routeHash: () => this.viewHash,
      onClose: () => {
        this.metadataSearch.cancel();
      },
      onRendered: () => {
        if (this.drafts.state.target && this.editor.querySelector("form")) {
          const status = document.createElement("p");
          status.className = "form-hint draft-status";
          status.dataset.draftStatus = "";
          status.setAttribute("role", "status");
          this.editor.querySelector(".dialog-body")?.prepend(status);
          this.drafts.captureDraft();
        }
      },
    });

    const editorDialog: EditorDialog = {
      element: this.editor,
      show: this.dialog.showDialog,
      formError: (message, input) => this.formError(message, input),
    };

    const pickerInteraction: PickerInteraction = {
      deferRender: () => {
        if (!this.dialog.pickerPress) return false;

        this.dialog.pickerRenderPending = true;
        return true;
      },
      closeSearch: () => this.dialog.updateSearchDropdowns(null),
    };

    this.discovery = createDiscovery({
      editor: this.editor,
      albums: () => this.library.data.albums,
      showDialog: this.dialog.showDialog,
      announce: (message) => this.announce(message),
    });

    this.drafts = createEditorDrafts({
      editor: this.editor,
      accountId,
      isSaving: () => this.library.saving,
      baseline: () => this.dialog.baseline,
      setBaseline: (value) => {
        this.dialog.baseline = value;
      },
      updateRating: (rating) => this.listening.updateRating(rating),
      serializeSelections: () => {
        const artists = this.artistFeature.snapshotPicker();
        const instruments = this.instrumentFeature.snapshotPicker();
        const genres = this.genreFeature.snapshotPicker();

        return {
          artists: artists.selectedArtists,
          genres: genres.selectedGenres,
          instruments: instruments.selectedInstruments,
          artistChoices: artists.artistChoices,
          genreChoices: genres.genreChoices,
          instrumentChoices: instruments.instrumentChoices,
        };
      },
      resumeDraft: () => this.resumeDraft(),
      announce: (message) => this.announce(message),
    });

    this.listening = createListening({
      editor: this.editor,
      showDialog: this.dialog.showDialog,
      beginDraft: this.drafts.beginDraft,
      albums: () => this.library.data.albums,
      finishSave: (id, message) => this.persistence.finishSave(id, message),
    });

    this.artistFeature = this.createArtistFeature(
      editorDialog,
      pickerInteraction,
    );
    this.genreFeature = this.createGenreFeature(
      editorDialog,
      pickerInteraction,
    );
    this.instrumentFeature = this.createInstrumentFeature(editorDialog);
    this.albumEditor = this.createAlbumEditor(editorDialog, accountId);

    this.metadataSearch = new MetadataSearchController({
      editor: this.editor,
      showDialog: this.dialog.showDialog,
      hasDraft: () => Boolean(this.drafts.current),
      clearDraftTarget: () => {
        this.drafts.state.target = undefined;
      },
      resumeDraft: () => this.resumeDraft(),
      openAlbumForm: (album, mode) =>
        this.albumEditor.openAlbumForm(album, mode),
      canDismissDialog: () => this.canDismissDialog(),
      clearDraft: this.drafts.clearDraft,
      isActive: () => this.lifecycle.active,
      albums: () => this.library.data.albums,
    });

    document.querySelector<HTMLElement>("#add-icon")!.innerHTML = icon(
      "plus",
      17,
    );
    this.listen();

    this.viewHash = location.hash;
    this.router.render();
    this.connection.mount(initialRefresh);
    if (this.drafts.current) {
      this.drafts.resumeButton.hidden = false;
      if (this.drafts.current.open)
        this.lifecycle.queue(() => this.resumeDraft());
    }
  }

  private createArtistFeature(
    editorDialog: EditorDialog,
    pickerInteraction: PickerInteraction,
  ): ArtistFeature {
    const controller = this;

    return new ArtistFeature({
      dialog: editorDialog,
      drafts: { begin: this.drafts.beginDraft },
      persistence: {
        finishCatalogSave: (message, destination) =>
          this.persistence.finishCatalogSave(message, destination),
      },
      navigation: {
        renderRoute: (focus) => this.router.render(focus),
        updateCatalogFilters: (id) => this.router.updateCatalogFilters(id),
      },
      picker: pickerInteraction,
      library: {
        get albums() {
          return controller.library.data.albums;
        },
        get artists() {
          return controller.library.data.artists;
        },
        set artists(value) {
          controller.library.data.artists = value;
        },
      },
    });
  }

  private createGenreFeature(
    editorDialog: EditorDialog,
    pickerInteraction: PickerInteraction,
  ): GenreFeature {
    const controller = this;

    return new GenreFeature({
      dialog: editorDialog,
      drafts: { begin: this.drafts.beginDraft },
      persistence: {
        finishCatalogSave: (message, destination) =>
          this.persistence.finishCatalogSave(message, destination),
      },
      navigation: {
        main: this.main,
        announce: (message) => this.announce(message),
        renderRoute: (focus) => this.router.render(focus),
        updateCatalogFilters: (id) => this.router.updateCatalogFilters(id),
      },
      picker: pickerInteraction,
      library: {
        get albums() {
          return controller.library.data.albums;
        },
        get genres() {
          return controller.library.data.genres;
        },
        set genres(value) {
          controller.library.data.genres = value;
        },
      },
    });
  }

  private createInstrumentFeature(
    editorDialog: EditorDialog,
  ): InstrumentFeature {
    const controller = this;

    return new InstrumentFeature({
      dialog: editorDialog,
      drafts: { begin: this.drafts.beginDraft },
      persistence: {
        finishSave: (id, message) => this.persistence.finishSave(id, message),
        finishCatalogSave: (message, destination) =>
          this.persistence.finishCatalogSave(message, destination),
      },
      navigation: {
        renderRoute: (focus) => this.router.render(focus),
        updateCatalogFilters: (id) => this.router.updateCatalogFilters(id),
      },
      library: {
        get albums() {
          return controller.library.data.albums;
        },
        get instruments() {
          return controller.library.data.instruments;
        },
        set instruments(value) {
          controller.library.data.instruments = value;
        },
      },
    });
  }

  private createAlbumEditor(
    editorDialog: EditorDialog,
    accountId: string,
  ): AlbumEditor {
    const controller = this;

    return new AlbumEditor({
      accountId,
      dialog: editorDialog,
      drafts: {
        begin: this.drafts.beginDraft,
        capture: this.drafts.captureDraft,
      },
      persistence: {
        finishSave: (id, message) => this.persistence.finishSave(id, message),
        finishCatalogSave: (message, destination) =>
          this.persistence.finishCatalogSave(message, destination),
      },
      lifecycle: {
        isActive: () => this.lifecycle.active,
        isSaving: () => this.library.saving,
      },
      library: {
        get albums() {
          return controller.library.data.albums;
        },
        set albums(value) {
          controller.library.data.albums = value;
        },
        get artists() {
          return controller.library.data.artists;
        },
        set artists(value) {
          controller.library.data.artists = value;
        },
        get genres() {
          return controller.library.data.genres;
        },
        set genres(value) {
          controller.library.data.genres = value;
        },
      },
      pickers: {
        applySuggestion: (kind, id, name) => {
          const input = this.editor.querySelector<HTMLInputElement>(
            `#${kind}-query`,
          )!;
          input.value = name;
          const button = document.createElement("button");
          button.dataset.action = `${id ? "select" : "create"}-${kind}`;
          if (id) button.dataset.id = id;
          if (kind === "genre") this.genreFeature.click(button);
          else this.instrumentFeature.click(button);
        },
        selections: {
          get instrumentChoices() {
            return controller.instrumentFeature.choices;
          },
          get selectedArtists() {
            return controller.artistFeature.selections;
          },
          get selectedGenres() {
            return controller.genreFeature.selections;
          },
          get selectedInstruments() {
            return controller.instrumentFeature.selections;
          },
          get genreChoices() {
            return controller.genreFeature.choices;
          },
        },
        artistPicker: (credits) => this.artistFeature.artistPicker(credits),
        genrePicker: (items, renderSuggestions) =>
          this.genreFeature.genrePicker(items, renderSuggestions),
        instrumentPicker: (items, renderSuggestions) =>
          this.instrumentFeature.instrumentPicker(items, renderSuggestions),
        updateArtists: () => this.artistFeature.updateArtists(),
        updateGenres: () => this.genreFeature.updateGenres(),
        updateInstruments: () => this.instrumentFeature.updateInstruments(),
        commitInstrumentChoices: () =>
          this.instrumentFeature.commitInstrumentChoices(),
      },
    });
  }

  private onClick(event: MouseEvent): void {
    const button = (event.target as Element).closest<HTMLButtonElement>(
      "button[data-action]",
    );
    if (!button) return;
    if (this.library.saving) return;
    if (
      this.connection.readOnly &&
      !this.browsingActions.has(button.dataset.action!)
    ) {
      this.announce("Connect to the internet to make changes.");
      return;
    }

    const album = this.router.activeAlbum();
    if (this.discovery.click(button)) return;
    if (this.artistFeature.click(button)) return;
    if (this.genreFeature.click(button)) return;
    if (this.instrumentFeature.click(button, album)) return;
    if (
      this.metadataSearch.click(button) ||
      this.listening.click(button, album) ||
      this.albumEditor.click(button, album)
    )
      return;

    switch (button.dataset.action) {
      case "close":
        this.dismissDialog();
        break;
    }
    this.router.click(button);
  }

  private onInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.closest("#discovery-panel")) this.discovery.update();
    this.artistFeature.input(input);
    this.genreFeature.input(input);
    this.instrumentFeature.input(input);
    this.router.input(input);
    this.metadataSearch.input(input);
  }

  private onChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.closest("#discovery-panel")) this.discovery.update();
    this.artistFeature.change(input);
    this.genreFeature.change(input);
    this.instrumentFeature.change(input);
    this.router.change(input);

    if (input.name === "rating")
      this.listening.updateRating(Number(input.value));
  }

  private onSubmit(event: SubmitEvent): void {
    if (this.connection.readOnly || this.library.saving) {
      event.preventDefault();
      if (this.connection.readOnly)
        this.announce(
          "Connect to the internet to save changes. Your draft is kept.",
        );
      return;
    }
    const form = event.target;
    if (!(form instanceof HTMLFormElement)) return;

    switch (form.id) {
      case "catalog-instrument-form":
      case "instruments-form":
        event.preventDefault();
        this.instrumentFeature.submit(form);
        break;
      case "catalog-artist-form":
        event.preventDefault();
        this.artistFeature.submit(form);
        break;
      case "catalog-genre-form":
        event.preventDefault();
        this.genreFeature.submit(form);
        break;
      case "links-form":
        event.preventDefault();
        this.albumEditor.saveLinks(form);
        break;
      case "album-form":
        event.preventDefault();
        this.albumEditor.saveAlbumForm(form);
        break;
      case "listen-form":
        event.preventDefault();
        this.listening.saveListenForm(form);
        break;
    }
  }

  private onHashChange(): void {
    if (location.hash === "#main-content") return;

    if (this.editor.open) {
      this.drafts.captureDraft();
      if (this.drafts.current) {
        this.drafts.current.open = false;
        this.drafts.writeDraft();
        this.drafts.resumeButton.hidden = false;
      }
      this.drafts.state.target = undefined;
      this.editor.close();
    }

    this.viewHash = location.hash;
    const scroll = this.router.arrive();
    this.router.render(true);
    window.scrollTo(0, scroll);
  }

  private draftCatalog(
    kind: DraftTarget["kind"],
  ): (Album | Artist | Genre | Instrument)[] {
    switch (kind) {
      case "artist":
        return this.library.data.artists;
      case "genre":
        return this.library.data.genres;
      case "instrument":
        return this.library.data.instruments;
      default:
        return this.library.data.albums;
    }
  }

  private resumeDraft(): void {
    if (this.connection.readOnly || !this.drafts.current) return;

    const saved = structuredClone(this.drafts.current);
    const target = saved.target;
    const item = target.item as
      | {
          id?: string;
        }
      | undefined;
    const catalog = this.draftCatalog(target.kind);
    const existing = catalog.find((value) => value.id === item?.id);
    const requiresExisting =
      ["listen", "instruments"].includes(target.kind) ||
      ["edit", "links"].includes(target.mode ?? "") ||
      (["artist", "genre", "instrument"].includes(target.kind) && !!item?.id);
    const entryMissing =
      target.entry &&
      !(existing as Album | undefined)?.listeningEntries?.some(
        (entry) => entry.id === target.entry!.id,
      );

    if (requiresExisting && (!existing || entryMissing)) {
      if (
        window.confirm(
          "The item for this draft was deleted. Discard the draft?",
        )
      )
        this.drafts.clearDraft();
      return;
    }
    if (
      requiresExisting &&
      JSON.stringify(existing) !== saved.source &&
      !window.confirm(
        "This item changed since your draft began. Resume your draft? Saving it may replace newer changes.",
      )
    )
      return;

    this.drafts.restore(saved, () => {
      history.replaceState(
        history.state,
        "",
        saved.hash || location.pathname + location.search,
      );
      this.viewHash = location.hash;
      this.router.replaceHistory();
      this.router.render();
      switch (target.kind) {
        case "album":
          this.albumEditor.openAlbumForm(
            target.item as Partial<Album>,
            target.mode === "edit" ||
              target.mode === "review" ||
              target.mode === "links"
              ? target.mode
              : "manual",
          );
          break;
        case "artist":
          this.artistFeature.openCatalogArtist(
            target.item as Artist | undefined,
          );
          break;
        case "genre":
          this.genreFeature.openCatalogGenre(target.item as Genre | undefined);
          break;
        case "instrument":
          this.instrumentFeature.openCatalogInstrument(
            target.item as Instrument | undefined,
          );
          break;
        case "instruments":
          this.instrumentFeature.openInstruments(existing as Album);
          break;
        case "listen":
          this.listening.openListen(existing as Album, target.entry);
          break;
      }
      this.artistFeature.restorePicker({
        selectedArtists: saved.artists,
        artistChoices: saved.artistChoices,
      });
      this.genreFeature.restorePicker({
        selectedGenres: saved.genres,
        genreChoices: saved.genreChoices,
      });
      this.instrumentFeature.restorePicker({
        selectedInstruments: saved.instruments,
        instrumentChoices: saved.instrumentChoices,
      });
      if (this.editor.querySelector("#artist-selected"))
        this.artistFeature.updateArtists();
      if (this.editor.querySelector("#genre-selected"))
        this.genreFeature.updateGenres();
      if (this.editor.querySelector("#instrument-selected"))
        this.instrumentFeature.updateInstruments();
    });
  }

  private announce(message: string): void {
    clearTimeout(this.toastTimer);
    this.toast.innerHTML =
      icon("check", 17) + "<span>" + escapeHtml(message) + "</span>";
    this.toast.classList.add("visible");
    this.toastTimer = setTimeout(
      () => this.toast.classList.remove("visible"),
      3800,
    );
  }

  private dialogFormState(): string {
    const form = this.editor.querySelector("form");
    if (!form) return "";

    return JSON.stringify({
      fields: [...new FormData(form).entries()],
      artists: this.editor.querySelector("#artist-selected")
        ? this.artistFeature.selections
        : null,
      genres: this.editor.querySelector("#genre-selected")
        ? this.genreFeature.selections
        : null,
      instruments: this.editor.querySelector("#instrument-selected")
        ? this.instrumentFeature.selections
        : null,
    });
  }

  private canDismissDialog(): boolean {
    if (this.library.saving) return false;

    return (
      this.dialogFormState() === this.dialog.baseline ||
      (this.drafts.draftCloseChoices(), false)
    );
  }

  private dismissDialog(): void {
    if (this.canDismissDialog()) {
      this.drafts.clearDraft();
      this.editor.close();
    }
  }

  private formError(message: string, input: HTMLInputElement): void {
    const error = document.querySelector<HTMLElement>("#form-error")!;
    error.hidden = false;
    error.textContent = message;
    if (input?.closest("details")) input.closest("details")!.open = true;
    input?.focus();
  }

  private listen(): void {
    this.lifecycle
      .listen(document)
      .addEventListener("click", (event) => this.onClick(event));
    this.lifecycle
      .listen(document)
      .addEventListener("input", (event) => this.onInput(event));
    this.lifecycle
      .listen(document)
      .addEventListener("change", (event) => this.onChange(event));
    this.lifecycle
      .listen(document)
      .addEventListener("submit", (event) => this.onSubmit(event));
    this.lifecycle.listen(document).addEventListener(
      "invalid",
      (event) => {
        if ((event.target as HTMLElement).closest("details"))
          (event.target as HTMLElement).closest("details")!.open = true;
      },
      true,
    );
    this.lifecycle.listen(document).addEventListener(
      "error",
      (event) => {
        if (
          (event.target as Element).matches?.(".cover img, .catalog-image img")
        )
          (event.target as Element).remove();
      },
      true,
    );
    this.dialog.mount();
    this.lifecycle
      .listen(window)
      .addEventListener("hashchange", () => this.onHashChange());
  }

  public renderPreview(hash: string): HTMLElement {
    return this.router.renderPreview(hash);
  }

  public dispose(): void {
    if (!this.lifecycle.active) return;

    this.drafts.captureDraft();
    this.lifecycle.dispose();
    this.connection.dispose();
    this.persistence.dispose();
    this.router.dispose();
    this.drafts.dispose();
    this.dialog.dispose();
    this.metadataSearch.cancel();
    this.albumEditor.dispose();
    clearTimeout(this.toastTimer);
  }
}

export function initializeApp(
  data?: LibraryData,
  accountId = "demo",
  initialRefresh = false,
): AppController {
  return new AppController(data, accountId, initialRefresh);
}
