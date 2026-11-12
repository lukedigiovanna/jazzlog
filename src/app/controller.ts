import { createDiscovery } from "./discovery";
import { readLibraryCache, writeLibraryCache } from "./libraryCache";
import { createLibraryState, type SaveResult } from "./libraryState";
import { createDialog } from "./dialog";
import { createEditorDrafts } from "./editorDrafts";
import { createLifecycle } from "./lifecycle";
import { createResumeRefresh } from "./resumeRefresh";
import type { LibraryData } from "../types/library";
import { genreUrl } from "./genres";
import { renderGenreDetail } from "../views/genresView";
import type { Genre } from "../types/albums";
import { artistUrl, renderArtistDetail } from "../views/artistsView";
import type { Album, Artist, Instrument } from "../types/albums";
import { icon } from "../components/icons";
import { escapeHtml } from "../components/html";
import { albumUrl } from "../components/presentation";
import { renderLibraryView, updateLibrary } from "../views/libraryView";
import { renderAlbumDetailView } from "../views/albumDetailView";
import { instrumentUrl } from "./instruments";
import { renderInstrumentDetail } from "../views/instrumentsView";
import { focusForTyping } from "./device";
import { createMetadataSearch } from "./metadataSearch";
import { createInstrumentFeature } from "./instrumentFeature";
import { createGenreFeature } from "./genreFeature";
import { createArtistFeature } from "./artistFeature";
import { createAlbumEditor } from "./albumEditor";
import { createListening } from "./listening";
import { readLayout, saveLayout } from "./layoutPreferences";
import { createRouteHistory } from "./routeHistory";

export function initializeApp(
  data?: LibraryData,
  accountId = "demo",
  initialRefresh = false,
) {
  const lifecycle = createLifecycle();
  const routeHistory = createRouteHistory(accountId);
  const originalScrollRestoration = history.scrollRestoration;
  history.scrollRestoration = "manual";
  lifecycle.listen(window).addEventListener("scroll", routeHistory.saveScroll);

  const main = document.querySelector<HTMLElement>("main")!;
  const editor = document.querySelector<HTMLDialogElement>("#editor")!;
  const toast = document.querySelector<HTMLElement>("#toast")!;
  const detailLayouts = {
    artist: readLayout("artist"),
    genre: readLayout("genre"),
  };
  const state = {
    query: "",
    genre: "",
    sort: "updated",
    layout: readLayout("library"),
  };
  const library = createLibraryState(data);
  let refreshFailed = false;
  let refreshRunning = false;
  let cacheFailed = false;
  let syncedAt = readLibraryCache(accountId)?.syncedAt;
  const banner = document.createElement("div");
  banner.className = "connection-banner";
  banner.setAttribute("role", "status");
  banner.hidden = true;
  document.querySelector(".masthead")!.before(banner);
  const readOnly = () => !!data && (!navigator.onLine || refreshFailed);
  const browsingActions = new Set([
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
  function cacheCommitted() {
    syncedAt = Date.now();
    cacheFailed = !writeLibraryCache(accountId, library.data, syncedAt);
    updateConnection();
  }
  function updateConnection() {
    if (!data) return;
    banner.replaceChildren();
    const minutes = Math.max(
      1,
      Math.floor((Date.now() - (syncedAt ?? Date.now())) / 60_000),
    );
    const [amount, unit] =
      minutes < 60
        ? [minutes, "minute"]
        : minutes < 1440
          ? [Math.floor(minutes / 60), "hour"]
          : [Math.floor(minutes / 1440), "day"];
    const updated = syncedAt
      ? ` · synced ${amount} ${unit}${amount === 1 ? "" : "s"} ago`
      : "";
    if (!navigator.onLine) banner.textContent = "Offline" + updated;
    else if (refreshFailed) {
      banner.textContent = "Couldn’t refresh" + updated;
      const retry = document.createElement("button");
      retry.type = "button";
      retry.className = "button secondary";
      retry.textContent = "Retry";
      retry.onclick = () => {
        void refreshLibrary();
      };
      banner.append(retry);
    } else if (cacheFailed)
      banner.textContent =
        "Couldn’t save an offline copy. Browser storage is unavailable or full.";
    banner.hidden = !banner.textContent;
    document
      .querySelectorAll<HTMLButtonElement>("button[data-action]")
      .forEach((button) => {
        if (
          button.closest("#editor") ||
          browsingActions.has(button.dataset.action!)
        )
          return;
        if (readOnly()) {
          if (!button.disabled) {
            button.dataset.offlineDisabled = "";
            button.disabled = true;
          }
        } else if ("offlineDisabled" in button.dataset) {
          button.disabled = false;
          delete button.dataset.offlineDisabled;
        }
      });
    resumeButton.disabled = readOnly();
    editor
      .querySelectorAll<HTMLButtonElement>('button[type="submit"]')
      .forEach((button) => {
        if (library.saving) return;
        button.disabled = readOnly();
      });
  }
  async function refreshLibrary(): Promise<boolean> {
    if (!navigator.onLine || editor.open || library.saving || refreshRunning)
      return false;
    refreshRunning = true;
    const revision = library.revision;
    try {
      const { getLibrary } = await import("../services/library");
      const next = await getLibrary();
      if (!lifecycle.active || editor.open || !library.replace(next, revision))
        return false;
      refreshFailed = false;
      cacheCommitted();
      const scroll = window.scrollY;
      renderRoute();
      window.scrollTo(0, scroll);
      return true;
    } catch {
      if (lifecycle.active) {
        refreshFailed = true;
        updateConnection();
      }
      return false;
    } finally {
      refreshRunning = false;
    }
  }
  let viewHash: string;
  let toastTimer: ReturnType<typeof setTimeout>;

  const dialog = createDialog({
    editor,
    main,
    formState: dialogFormState,
    dismissDialog,
    updateArtists: () => artistFeature.updateArtists(),
    updateGenres: () => genreFeature.updateGenres(),
    routeHash: () => viewHash,
    onClose: () => {
      metadataSearch.cancel();
    },
    onRendered: () => {
      if (drafts.state.target && editor.querySelector("form")) {
        const status = document.createElement("p");
        status.className = "form-hint draft-status";
        status.dataset.draftStatus = "";
        status.setAttribute("role", "status");
        editor.querySelector(".dialog-body")?.prepend(status);
        captureDraft();
      }
    },
  });
  const { showDialog } = dialog;
  const discovery = createDiscovery({
    editor,
    albums: () => library.data.albums,
    showDialog,
    announce,
  });
  const drafts = createEditorDrafts({
    editor,
    accountId,
    isSaving: () => library.saving,
    baseline: () => dialog.baseline,
    setBaseline: (value) => {
      dialog.baseline = value;
    },
    updateRating: (rating) => listening.updateRating(rating),
    serializeSelections: () => ({
      artists: structuredClone(artistFeature.state.selectedArtists),
      genres: structuredClone(genreFeature.state.selectedGenres),
      instruments: structuredClone(instrumentFeature.state.selectedInstruments),
      artistChoices: structuredClone(artistFeature.state.artistChoices),
      genreChoices: structuredClone(genreFeature.state.genreChoices),
      instrumentChoices: structuredClone(
        instrumentFeature.state.instrumentChoices,
      ),
    }),
    resumeDraft,
    announce,
  });
  const {
    writeDraft,
    clearDraft,
    captureDraft,
    beginDraft,
    draftCloseChoices,
    resumeButton,
  } = drafts;
  const listening = createListening({
    editor,
    showDialog,
    beginDraft,
    albums: () => library.data.albums,
    finishSave,
  });
  const { openListen, updateRating, saveListenForm } = listening;
  const artistFeature = createArtistFeature({
    editor,
    dialog,
    showDialog,
    beginDraft,
    formError,
    finishCatalogSave,
    renderRoute,
    updateCatalogFilters,
    library: {
      get albums() {
        return library.data.albums;
      },
      get artists() {
        return library.data.artists;
      },
      set artists(value) {
        library.data.artists = value;
      },
    },
  });
  const { openCatalogArtist, artistPicker, updateArtists } = artistFeature;
  const genreFeature = createGenreFeature({
    editor,
    main,
    dialog,
    showDialog,
    beginDraft,
    formError,
    finishCatalogSave,
    announce,
    renderRoute,
    updateCatalogFilters,
    library: {
      get albums() {
        return library.data.albums;
      },
      get genres() {
        return library.data.genres;
      },
      set genres(value) {
        library.data.genres = value;
      },
    },
  });
  const { openCatalogGenre, genrePicker, updateGenres } = genreFeature;
  const instrumentFeature = createInstrumentFeature({
    editor,
    showDialog,
    beginDraft,
    formError,
    finishSave,
    finishCatalogSave,
    renderRoute,
    updateCatalogFilters,
    library: {
      get albums() {
        return library.data.albums;
      },
      get instruments() {
        return library.data.instruments;
      },
      set instruments(value) {
        library.data.instruments = value;
      },
    },
  });
  const {
    openCatalogInstrument,
    instrumentPicker,
    updateInstruments,
    openInstruments,
    commitInstrumentChoices,
  } = instrumentFeature;
  const albumEditor = createAlbumEditor({
    editor,
    showDialog,
    finishCatalogSave,
    beginDraft,
    captureDraft,
    formError,
    finishSave,
    isActive: () => lifecycle.active,
    isSaving: () => library.saving,
    library: {
      get albums() {
        return library.data.albums;
      },
      set albums(value) {
        library.data.albums = value;
      },
      get artists() {
        return library.data.artists;
      },
      set artists(value) {
        library.data.artists = value;
      },
      get genres() {
        return library.data.genres;
      },
      set genres(value) {
        library.data.genres = value;
      },
    },
    selections: {
      get selectedArtists() {
        return artistFeature.state.selectedArtists;
      },
      get selectedGenres() {
        return genreFeature.state.selectedGenres;
      },
      get selectedInstruments() {
        return instrumentFeature.state.selectedInstruments;
      },
      get genreChoices() {
        return genreFeature.state.genreChoices;
      },
    },
    artistPicker,
    genrePicker,
    instrumentPicker,
    updateArtists,
    updateGenres,
    updateInstruments,
    commitInstrumentChoices,
  });
  const { openAlbumForm, saveAlbumForm } = albumEditor;
  const metadataSearch = createMetadataSearch({
    editor,
    showDialog,
    hasDraft: () => Boolean(drafts.current),
    clearDraftTarget: () => {
      drafts.state.target = undefined;
    },
    resumeDraft,
    openAlbumForm,
    canDismissDialog,
    clearDraft,
    isActive: () => lifecycle.active,
    albums: () => library.data.albums,
  });

  function resumeDraft() {
    if (readOnly() || !drafts.current) return;
    const saved = structuredClone(drafts.current);
    const target = saved.target;
    const item = target.item as { id?: string } | undefined;
    const catalog =
      target.kind === "artist"
        ? library.data.artists
        : target.kind === "genre"
          ? library.data.genres
          : target.kind === "instrument"
            ? library.data.instruments
            : library.data.albums;
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
        clearDraft();
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
    drafts.restore(saved, () => {
      history.replaceState(
        history.state,
        "",
        saved.hash || location.pathname + location.search,
      );
      viewHash = location.hash;
      routeHistory.replace();
      renderRoute();
      switch (target.kind) {
        case "album":
          openAlbumForm(target.item as Partial<Album>, target.mode);
          break;
        case "artist":
          openCatalogArtist(target.item as Artist | undefined);
          break;
        case "genre":
          openCatalogGenre(target.item as Genre | undefined);
          break;
        case "instrument":
          openCatalogInstrument(target.item as Instrument | undefined);
          break;
        case "instruments":
          openInstruments(existing as Album);
          break;
        case "listen":
          openListen(existing as Album, target.entry);
          break;
      }
      artistFeature.state.selectedArtists = saved.artists;
      genreFeature.state.selectedGenres = saved.genres;
      instrumentFeature.state.selectedInstruments = saved.instruments;
      artistFeature.state.artistChoices = saved.artistChoices;
      genreFeature.state.genreChoices = saved.genreChoices;
      instrumentFeature.state.instrumentChoices = saved.instrumentChoices;
      if (editor.querySelector("#artist-selected")) updateArtists();
      if (editor.querySelector("#genre-selected")) updateGenres();
      if (editor.querySelector("#instrument-selected")) updateInstruments();
    });
  }

  document.querySelector<HTMLElement>("#add-icon")!.innerHTML = icon(
    "plus",
    17,
  );

  async function persistChanges(): Promise<SaveResult> {
    editor.setAttribute("aria-busy", "true");
    const controls = [
      ...editor.querySelectorAll<
        | HTMLButtonElement
        | HTMLInputElement
        | HTMLSelectElement
        | HTMLTextAreaElement
      >("button, input, select, textarea"),
    ];
    const enabled = controls.filter((control) => !control.disabled);
    enabled.forEach((control) => (control.disabled = true));
    try {
      const result = await library.save();
      if (result.status !== "rejected") {
        if (data) cacheCommitted();
        return result;
      }
      const message = result.message;
      const errorElement = editor.querySelector<HTMLElement>("#form-error");
      const text = `Couldn’t save changes. ${message || "Please try again."}`;
      if (errorElement) {
        errorElement.hidden = false;
        errorElement.textContent = text;
      } else announce(text);
      renderRoute();
      return result;
    } finally {
      editor.removeAttribute("aria-busy");
      enabled.forEach((control) => (control.disabled = false));
    }
  }

  function announce(message: string) {
    clearTimeout(toastTimer);
    toast.innerHTML =
      icon("check", 17) + "<span>" + escapeHtml(message) + "</span>";
    toast.classList.add("visible");
    toastTimer = setTimeout(() => toast.classList.remove("visible"), 3800);
  }

  function activeAlbum() {
    return library.data.albums.find(
      (album) => albumUrl(album.id) === location.hash,
    );
  }

  function activeInstrument() {
    return library.data.instruments.find(
      (item) => instrumentUrl(item.id) === location.hash,
    );
  }

  function renderListRoute(hash: string, root: HTMLElement) {
    if (hash === "#artists") artistFeature.renderList(root);
    else if (hash === "#genres") genreFeature.renderList(root);
    else if (hash === "#instruments") instrumentFeature.renderList(root);
    else {
      root.innerHTML = renderLibraryView(
        library.data.albums,
        state,
        library.data.genres,
      );
      updateLibrary(library.data.albums, state, library.data.genres, root);
    }
  }

  function renderRoute(focus = false) {
    const genre = library.data.genres.find(
      (g) => genreUrl(g.id) === location.hash,
    );
    const genrePage =
      location.hash === "#genres" || location.hash.startsWith("#genre/");
    const album = activeAlbum();
    const artist = library.data.artists.find(
      (item) => artistUrl(item.id) === location.hash,
    );
    const artistPage =
      location.hash === "#artists" || location.hash.startsWith("#artist/");
    const instrument = activeInstrument();
    const instrumentPage =
      location.hash === "#instruments" ||
      location.hash.startsWith("#instrument/");
    for (const link of document.querySelectorAll<HTMLElement>("[data-nav]")) {
      if (
        link.dataset.nav ===
        (genrePage
          ? "genres"
          : artistPage
            ? "artists"
            : instrumentPage
              ? "instruments"
              : "library")
      )
        link.setAttribute("aria-current", "page");
      else link.removeAttribute("aria-current");
    }
    const missing = location.hash.startsWith("#album/") && !album;
    if (genrePage) {
      if (genre)
        main.innerHTML = renderGenreDetail(
          genre,
          library.data.genres,
          library.data.albums,
          detailLayouts.genre,
        );
      else if (location.hash === "#genres") renderListRoute("#genres", main);
      else
        main.innerHTML =
          '<div class="empty"><h1 id="page-title">Genre unavailable</h1><a href="#genres">Back to genres</a></div>';
    } else if (location.hash === "#artists") {
      renderListRoute("#artists", main);
    } else if (artist) {
      main.innerHTML = renderArtistDetail(
        artist,
        library.data.albums,
        detailLayouts.artist,
      );
    } else if (artistPage) {
      main.innerHTML = /* HTML */ `<div class="empty">
        <h1 id="page-title">Artist unavailable</h1>
        <a href="#artists">Back to artists</a>
      </div>`;
    } else if (location.hash === "#instruments") {
      renderListRoute("#instruments", main);
    } else if (instrument) {
      main.innerHTML = renderInstrumentDetail(instrument, library.data.albums);
    } else if (instrumentPage) {
      main.innerHTML = /* HTML */ `<div class="empty route-empty">
        <h1 id="page-title">Instrument unavailable</h1>
        <p>This instrument may have been deleted.</p>
        <a class="button secondary" href="#instruments">Back to instruments</a>
      </div>`;
    } else if (album) {
      main.innerHTML = renderAlbumDetailView(album);
    } else if (missing) {
      main.innerHTML = /* HTML */ `<div class="empty route-empty">
        ${icon("disc", 35)}
        <h1 id="page-title">Album unavailable</h1>
        <p>This album may have been added in another browser.</p>
        <a class="button secondary" href="#">${icon("back")} Back to library</a>
      </div>`;
    } else {
      renderListRoute("#", main);
    }
    const backLink = main.querySelector<HTMLAnchorElement>(
      '.back-link, .empty a[href^="#"]',
    );
    const previous = routeHistory.previous();
    if (backLink && previous !== undefined) {
      const label =
        library.data.albums.find((item) => albumUrl(item.id) === previous)
          ?.title ??
        library.data.artists.find((item) => artistUrl(item.id) === previous)
          ?.name ??
        library.data.genres.find((item) => genreUrl(item.id) === previous)
          ?.name ??
        library.data.instruments.find(
          (item) => instrumentUrl(item.id) === previous,
        )?.name ??
        {
          "": "library",
          "#": "library",
          "#artists": "artists",
          "#genres": "genres",
          "#instruments": "instruments",
        }[previous] ??
        "previous page";
      backLink.href = previous || "#";
      backLink.innerHTML = /* HTML */ `${icon("back", 17)} Back to
      ${escapeHtml(label)}`;
      backLink.dataset.routeBack = "";
    }
    document.title = genrePage
      ? `${genre?.name ?? "Genres"} — JazzLog`
      : artistPage
        ? `${artist?.name ?? "Artists"} — JazzLog`
        : instrumentPage
          ? `${instrument?.name ?? "Instruments"} — JazzLog`
          : album
            ? album.title + " — JazzLog"
            : "JazzLog — The Listening Room";
    updateConnection();
    if (focus) {
      window.scrollTo(0, 0);
      const heading = document.querySelector<HTMLElement>("#page-title");
      heading?.setAttribute("tabindex", "-1");
      heading?.focus({ preventScroll: true });
    }
  }

  function dialogFormState() {
    const form = editor.querySelector("form");
    if (!form) return "";
    return JSON.stringify({
      fields: [...new FormData(form).entries()],
      artists: editor.querySelector("#artist-selected")
        ? artistFeature.state.selectedArtists
        : null,
      genres: editor.querySelector("#genre-selected")
        ? genreFeature.state.selectedGenres
        : null,
      instruments: editor.querySelector("#instrument-selected")
        ? instrumentFeature.state.selectedInstruments
        : null,
    });
  }

  function canDismissDialog() {
    if (library.saving) return false;
    return (
      dialogFormState() === dialog.baseline || (draftCloseChoices(), false)
    );
  }

  function dismissDialog() {
    if (canDismissDialog()) {
      clearDraft();
      editor.close();
    }
  }

  async function finishCatalogSave(message: string, destination: string) {
    library.syncCatalogs();
    const stored = await persistChanges();
    if (stored.status === "rejected") return;
    clearDraft();
    editor.close();
    if (location.hash === destination) renderRoute(true);
    else location.hash = destination;
    announce(
      stored.status === "saved"
        ? message
        : "Updated for this visit. Browser storage is unavailable.",
    );
  }

  function updateCatalogFilters(focusId: string) {
    renderRoute();
    const dropdown = main.querySelector<HTMLDetailsElement>(
      ".genre-filter-dropdown",
    );
    if (dropdown) dropdown.open = true;
    main.querySelector<HTMLElement>(`#${focusId}`)?.focus();
  }
  lifecycle.listen(document).addEventListener("click", (event) => {
    routeHistory.saveScroll();
    const backLink = (event.target as Element).closest("a[data-route-back]");
    if (
      backLink &&
      event.button === 0 &&
      !event.metaKey &&
      !event.ctrlKey &&
      !event.shiftKey &&
      !event.altKey
    ) {
      event.preventDefault();
      history.back();
      return;
    }
    const dropdown = main.querySelector<HTMLDetailsElement>(
      ".genre-filter-dropdown[open]",
    );
    if (dropdown && !dropdown.contains(event.target as Node))
      dropdown.open = false;
  });
  lifecycle.listen(document).addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    const dropdown = main.querySelector<HTMLDetailsElement>(
      ".genre-filter-dropdown[open]",
    );
    if (dropdown) {
      dropdown.open = false;
      dropdown.querySelector<HTMLElement>("summary")?.focus();
    }
  });

  function formError(message: string, input: HTMLInputElement) {
    const error = document.querySelector<HTMLElement>("#form-error")!;
    error.hidden = false;
    error.textContent = message;
    if (input?.closest("details")) input.closest("details")!.open = true;
    input?.focus();
  }

  async function finishSave(id: string, message: string) {
    const stored = await persistChanges();
    if (stored.status === "rejected") return;
    clearDraft();
    editor.close();
    if (location.hash === albumUrl(id)) {
      renderRoute();
      document
        .querySelector<HTMLElement>("#page-title")
        ?.setAttribute("tabindex", "-1");
      document
        .querySelector<HTMLElement>("#page-title")
        ?.focus({ preventScroll: true });
    } else {
      location.hash = albumUrl(id);
    }
    announce(
      stored.status === "saved"
        ? message
        : "Updated for this visit. Browser storage is unavailable.",
    );
  }

  lifecycle.listen(document).addEventListener("click", (event) => {
    const button = (event.target as Element).closest<HTMLButtonElement>(
      "button[data-action]",
    );
    if (!button) return;
    if (library.saving) return;
    if (readOnly() && !browsingActions.has(button.dataset.action!)) {
      announce("Connect to the internet to make changes.");
      return;
    }
    const album = activeAlbum();
    if (discovery.click(button)) return;
    if (artistFeature.click(button)) return;
    if (genreFeature.click(button)) return;
    if (instrumentFeature.click(button, album)) return;
    if (
      metadataSearch.click(button) ||
      listening.click(button, album) ||
      albumEditor.click(button, album)
    )
      return;
    switch (button.dataset.action) {
      case "close":
        dismissDialog();
        break;
      case "artist-layout":
      case "genre-layout": {
        const view =
          button.dataset.action === "artist-layout" ? "artist" : "genre";
        const layout = button.dataset.layout === "list" ? "list" : "grid";
        detailLayouts[view] = layout;
        saveLayout(view, layout);
        renderRoute();
        main
          .querySelector<HTMLButtonElement>(
            `[data-action="${view}-layout"][data-layout="${layout}"]`,
          )
          ?.focus();
        break;
      }
      case "layout":
        state.layout = button.dataset.layout === "list" ? "list" : "grid";
        saveLayout("library", state.layout);
        for (const toggle of document.querySelectorAll("[data-layout]")) {
          toggle.setAttribute(
            "aria-pressed",
            toggle === button ? "true" : "false",
          );
        }
        updateLibrary(library.data.albums, state, library.data.genres);
        break;
      case "clear":
        state.query = "";
        state.genre = "";
        renderRoute();
        focusForTyping(
          document.querySelector<HTMLInputElement>("#library-query"),
        );
        break;
    }
  });

  lifecycle.listen(document).addEventListener("input", (event) => {
    const input = event.target as HTMLInputElement;
    if (input.closest("#discovery-panel")) discovery.update();
    artistFeature.input(input);
    genreFeature.input(input);
    instrumentFeature.input(input);

    if (input.id === "library-query") {
      state.query = input.value;
      updateLibrary(library.data.albums, state, library.data.genres);
    }
    metadataSearch.input(input);
  });

  lifecycle.listen(document).addEventListener("change", (event) => {
    const input = event.target as HTMLInputElement;
    if (input.closest("#discovery-panel")) discovery.update();
    artistFeature.change(input);
    genreFeature.change(input);
    instrumentFeature.change(input);

    if (input.id === "genre-filter") {
      state.genre = input.value;
      updateCatalogFilters(input.id);
    }
    if (input.id === "sort-order") {
      state.sort = input.value;
      updateLibrary(library.data.albums, state, library.data.genres);
    }
    if (input.name === "rating") updateRating(Number(input.value));
  });

  lifecycle.listen(document).addEventListener("submit", (event) => {
    if (readOnly() || library.saving) {
      event.preventDefault();
      if (readOnly())
        announce(
          "Connect to the internet to save changes. Your draft is kept.",
        );
      return;
    }
    if (
      (event.target as HTMLElement).id === "catalog-instrument-form" ||
      (event.target as HTMLElement).id === "instruments-form"
    ) {
      event.preventDefault();
      instrumentFeature.submit(event.target as HTMLFormElement);
    }
    if ((event.target as HTMLElement).id === "catalog-artist-form") {
      event.preventDefault();
      artistFeature.submit(event.target as HTMLFormElement);
    }
    if ((event.target as HTMLElement).id === "catalog-genre-form") {
      event.preventDefault();
      genreFeature.submit(event.target as HTMLFormElement);
    }
    if ((event.target as HTMLElement).id === "links-form") {
      event.preventDefault();
      albumEditor.saveLinks(event.target as HTMLFormElement);
    }
    if ((event.target as HTMLElement).id === "album-form") {
      event.preventDefault();
      saveAlbumForm(event.target as HTMLFormElement);
    }
    if ((event.target as HTMLElement).id === "listen-form") {
      event.preventDefault();
      saveListenForm(event.target as HTMLFormElement);
    }
  });

  lifecycle.listen(document).addEventListener(
    "invalid",
    (event) => {
      if ((event.target as HTMLElement).closest("details"))
        (event.target as HTMLElement).closest("details")!.open = true;
    },
    true,
  );

  lifecycle.listen(document).addEventListener(
    "error",
    (event) => {
      if ((event.target as Element).matches?.(".cover img, .catalog-image img"))
        (event.target as Element).remove();
    },
    true,
  );

  dialog.mount();

  lifecycle.listen(window).addEventListener("hashchange", () => {
    if (location.hash === "#main-content") return;
    if (editor.open) {
      captureDraft();
      if (drafts.current) {
        drafts.current.open = false;
        writeDraft();
        resumeButton.hidden = false;
      }
      drafts.state.target = undefined;
      editor.close();
    }
    viewHash = location.hash;
    const scroll = routeHistory.arrive();
    renderRoute(true);
    window.scrollTo(0, scroll);
  });

  lifecycle.listen(window).addEventListener("offline", updateConnection);
  lifecycle.listen(window).addEventListener("online", updateConnection);
  viewHash = location.hash;
  if (data && !initialRefresh) cacheCommitted();
  renderRoute();
  const bannerTimer = data
    ? setInterval(() => {
        if (!banner.hidden && !banner.contains(document.activeElement))
          updateConnection();
      }, 60_000)
    : undefined;
  const disposeRefresh = data
    ? createResumeRefresh({
        editor,
        blocked: () => editor.open || library.saving,
        initial: initialRefresh,
        refresh: refreshLibrary,
      })
    : undefined;
  if (drafts.current) {
    resumeButton.hidden = false;
    if (drafts.current.open) lifecycle.queue(resumeDraft);
  }

  const renderPreview = (hash: string): HTMLElement => {
    const page = document.createElement("div");
    page.className = "frame swipe-preview";
    renderListRoute(hash, page);
    // Preview content is visual only; avoid duplicate IDs and interactive controls.
    page.inert = true;
    page.setAttribute("aria-hidden", "true");
    page
      .querySelectorAll("[id]")
      .forEach((element) => element.removeAttribute("id"));
    return page;
  };

  return Object.assign(renderPreview, {
    dispose() {
      captureDraft();
      lifecycle.dispose();
      history.scrollRestoration = originalScrollRestoration;
      clearInterval(bannerTimer);
      banner.remove();
      disposeRefresh?.();
      drafts.dispose();
      dialog.dispose();
      metadataSearch.cancel();
      albumEditor.dispose();
      clearTimeout(toastTimer);
    },
  });
}
