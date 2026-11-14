import type { Album, Artist, Genre, Instrument } from "../types/albums";
import type { LibraryData } from "../types/library";
import type { LibraryState } from "../views/libraryView";
import { renderLibraryView, updateLibrary } from "../views/libraryView";
import { renderAlbumDetailView } from "../views/albumDetailView";
import { artistUrl, renderArtistDetail } from "../views/artistsView";
import { renderGenreDetail } from "../views/genresView";
import { renderInstrumentDetail } from "../views/instrumentsView";
import { albumUrl } from "../components/presentation";
import { icon } from "../components/icons";
import { escapeHtml } from "../components/html";
import { focusForTyping } from "./device";
import { genreUrl } from "./genres";
import { instrumentUrl } from "./instruments";
import { readLayout, saveLayout } from "./layoutPreferences";
import { createRouteHistory } from "./routeHistory";
import { createLifecycle } from "./lifecycle";

type RouteSection = "genres" | "artists" | "instruments" | "library";

interface RouteItems {
  genre: Genre | undefined;
  artist: Artist | undefined;
  instrument: Instrument | undefined;
  album: Album | undefined;
}

const listRouteLabels = new Map([
  ["", "library"],
  ["#", "library"],
  ["#artists", "artists"],
  ["#genres", "genres"],
  ["#instruments", "instruments"],
]);

function routeSection(hash: string): RouteSection {
  if (hash === "#genres" || hash.startsWith("#genre/")) return "genres";
  if (hash === "#artists" || hash.startsWith("#artist/")) return "artists";
  if (hash === "#instruments" || hash.startsWith("#instrument/"))
    return "instruments";
  return "library";
}

type LibrarySort = "recent" | "updated" | "title" | "rating" | "year";

interface LibraryFilters extends LibraryState {
  sort: LibrarySort;
  layout: "grid" | "list";
}

function isLibrarySort(value: string): value is LibrarySort {
  return ["recent", "updated", "title", "rating", "year"].includes(value);
}

export interface AppRouterDependencies {
  accountId: string;
  main: HTMLElement;
  library: () => LibraryData;
  lists: {
    artists: (root: HTMLElement) => void;
    genres: (root: HTMLElement) => void;
    instruments: (root: HTMLElement) => void;
  };
  onRendered: () => void;
}

export class AppRouter {
  private readonly dependencies: AppRouterDependencies;
  private readonly lifecycle = createLifecycle();
  private readonly routeHistory;
  private readonly originalScrollRestoration = history.scrollRestoration;
  private readonly detailLayouts = {
    artist: readLayout("artist"),
    genre: readLayout("genre"),
  };
  private readonly state: LibraryFilters = {
    query: "",
    genre: "",
    sort: "updated",
    layout: readLayout("library"),
  };

  constructor(dependencies: AppRouterDependencies) {
    this.dependencies = dependencies;
    this.routeHistory = createRouteHistory(dependencies.accountId);
    history.scrollRestoration = "manual";
    this.lifecycle
      .listen(window)
      .addEventListener("scroll", () => this.routeHistory.saveScroll());
    this.listen();
  }

  public arrive(): number {
    return this.routeHistory.arrive();
  }

  public replaceHistory(): void {
    this.routeHistory.replace();
  }

  public activeAlbum(): Album | undefined {
    return this.dependencies
      .library()
      .albums.find((album) => albumUrl(album.id) === location.hash);
  }

  public activeInstrument(): Instrument | undefined {
    return this.dependencies
      .library()
      .instruments.find((item) => instrumentUrl(item.id) === location.hash);
  }

  private renderListRoute(hash: string, root: HTMLElement): void {
    if (hash === "#artists") this.dependencies.lists.artists(root);
    else if (hash === "#genres") this.dependencies.lists.genres(root);
    else if (hash === "#instruments") this.dependencies.lists.instruments(root);
    else {
      root.innerHTML = renderLibraryView(
        this.dependencies.library().albums,
        this.state,
        this.dependencies.library().genres,
      );
      updateLibrary(
        this.dependencies.library().albums,
        this.state,
        this.dependencies.library().genres,
        root,
      );
    }
  }

  public render(focus = false): void {
    const genre = this.dependencies
      .library()
      .genres.find((g) => genreUrl(g.id) === location.hash);
    const album = this.activeAlbum();
    const artist = this.dependencies
      .library()
      .artists.find((item) => artistUrl(item.id) === location.hash);
    const instrument = this.activeInstrument();
    const section = routeSection(location.hash);

    for (const link of document.querySelectorAll<HTMLElement>("[data-nav]")) {
      if (link.dataset.nav === section)
        link.setAttribute("aria-current", "page");
      else link.removeAttribute("aria-current");
    }
    const missing = location.hash.startsWith("#album/") && !album;
    if (section === "genres") {
      if (genre)
        this.dependencies.main.innerHTML = renderGenreDetail(
          genre,
          this.dependencies.library().genres,
          this.dependencies.library().albums,
          this.detailLayouts.genre,
        );
      else if (location.hash === "#genres")
        this.renderListRoute("#genres", this.dependencies.main);
      else
        this.dependencies.main.innerHTML =
          '<div class="empty"><h1 id="page-title">Genre unavailable</h1><a href="#genres">Back to genres</a></div>';
    } else if (location.hash === "#artists") {
      this.renderListRoute("#artists", this.dependencies.main);
    } else if (artist) {
      this.dependencies.main.innerHTML = renderArtistDetail(
        artist,
        this.dependencies.library().albums,
        this.detailLayouts.artist,
      );
    } else if (section === "artists") {
      this.dependencies.main.innerHTML = /* HTML */ `<div class="empty">
        <h1 id="page-title">Artist unavailable</h1>
        <a href="#artists">Back to artists</a>
      </div>`;
    } else if (location.hash === "#instruments") {
      this.renderListRoute("#instruments", this.dependencies.main);
    } else if (instrument) {
      this.dependencies.main.innerHTML = renderInstrumentDetail(
        instrument,
        this.dependencies.library().albums,
      );
    } else if (section === "instruments") {
      this.dependencies.main.innerHTML = /* HTML */ `<div
        class="empty route-empty"
      >
        <h1 id="page-title">Instrument unavailable</h1>
        <p>This instrument may have been deleted.</p>
        <a class="button secondary" href="#instruments">Back to instruments</a>
      </div>`;
    } else if (album) {
      this.dependencies.main.innerHTML = renderAlbumDetailView(album);
    } else if (missing) {
      this.dependencies.main.innerHTML = /* HTML */ `<div
        class="empty route-empty"
      >
        ${icon("disc", 35)}
        <h1 id="page-title">Album unavailable</h1>
        <p>This album may have been added in another browser.</p>
        <a class="button secondary" href="#">${icon("back")} Back to library</a>
      </div>`;
    } else {
      this.renderListRoute("#", this.dependencies.main);
    }
    const backLink = this.dependencies.main.querySelector<HTMLAnchorElement>(
      '.back-link, .empty a[href^="#"]',
    );
    const previous = this.routeHistory.previous();
    if (backLink && previous !== undefined) {
      const label = this.routeLabel(previous);
      backLink.href = previous || "#";
      backLink.innerHTML = /* HTML */ `${icon("back", 17)} Back to
      ${escapeHtml(label)}`;
      backLink.dataset.routeBack = "";
    }
    document.title = this.pageTitle(section, {
      genre,
      artist,
      instrument,
      album,
    });
    this.dependencies.onRendered();
    if (focus) {
      window.scrollTo(0, 0);
      const heading = document.querySelector<HTMLElement>("#page-title");
      heading?.setAttribute("tabindex", "-1");
      heading?.focus({ preventScroll: true });
    }
  }

  private routeLabel(hash: string): string {
    const listLabel = listRouteLabels.get(hash);
    if (listLabel !== undefined) return listLabel;

    const library = this.dependencies.library();

    switch (hash.split("/")[0]) {
      case "#album":
        return (
          library.albums.find((item) => albumUrl(item.id) === hash)?.title ??
          "previous page"
        );
      case "#artist":
        return (
          library.artists.find((item) => artistUrl(item.id) === hash)?.name ??
          "previous page"
        );
      case "#genre":
        return (
          library.genres.find((item) => genreUrl(item.id) === hash)?.name ??
          "previous page"
        );
      case "#instrument":
        return (
          library.instruments.find((item) => instrumentUrl(item.id) === hash)
            ?.name ?? "previous page"
        );
      default:
        return "previous page";
    }
  }

  private pageTitle(section: RouteSection, items: RouteItems): string {
    switch (section) {
      case "genres":
        return `${items.genre?.name ?? "Genres"} — JazzLog`;
      case "artists":
        return `${items.artist?.name ?? "Artists"} — JazzLog`;
      case "instruments":
        return `${items.instrument?.name ?? "Instruments"} — JazzLog`;
      case "library":
        if (items.album) return `${items.album.title} — JazzLog`;
        return "JazzLog — The Listening Room";
    }
  }

  public renderPreview(hash: string): HTMLElement {
    const page = document.createElement("div");
    page.className = "frame swipe-preview";
    this.renderListRoute(hash, page);
    // Preview content is visual only; avoid duplicate IDs and interactive controls.
    page.inert = true;
    page.setAttribute("aria-hidden", "true");
    page
      .querySelectorAll("[id]")
      .forEach((element) => element.removeAttribute("id"));
    return page;
  }

  public updateCatalogFilters(focusId: string): void {
    this.render();
    const dropdown = this.dependencies.main.querySelector<HTMLDetailsElement>(
      ".genre-filter-dropdown",
    );
    if (dropdown) dropdown.open = true;
    this.dependencies.main.querySelector<HTMLElement>(`#${focusId}`)?.focus();
  }

  public click(button: HTMLButtonElement): boolean {
    switch (button.dataset.action) {
      case "artist-layout":
      case "genre-layout": {
        const view =
          button.dataset.action === "artist-layout" ? "artist" : "genre";
        const layout = button.dataset.layout === "list" ? "list" : "grid";
        this.detailLayouts[view] = layout;
        saveLayout(view, layout);
        this.render();
        this.dependencies.main
          .querySelector<HTMLButtonElement>(
            `[data-action="${view}-layout"][data-layout="${layout}"]`,
          )
          ?.focus();
        return true;
      }
      case "layout": {
        const layout = button.dataset.layout === "list" ? "list" : "grid";
        this.state.layout = layout;
        saveLayout("library", layout);
        for (const toggle of document.querySelectorAll("[data-layout]")) {
          toggle.setAttribute(
            "aria-pressed",
            toggle === button ? "true" : "false",
          );
        }
        updateLibrary(
          this.dependencies.library().albums,
          this.state,
          this.dependencies.library().genres,
        );
        return true;
      }
      case "clear":
        this.state.query = "";
        this.state.genre = "";
        this.render();
        focusForTyping(
          document.querySelector<HTMLInputElement>("#library-query"),
        );
        return true;

      default:
        return false;
    }
  }

  public input(input: HTMLInputElement): void {
    if (input.id !== "library-query") return;
    this.state.query = input.value;
    updateLibrary(
      this.dependencies.library().albums,
      this.state,
      this.dependencies.library().genres,
    );
  }

  public change(input: HTMLInputElement): void {
    if (input.id === "genre-filter") {
      this.state.genre = input.value;
      this.updateCatalogFilters(input.id);
    }
    if (input.id === "sort-order" && isLibrarySort(input.value)) {
      this.state.sort = input.value;
      updateLibrary(
        this.dependencies.library().albums,
        this.state,
        this.dependencies.library().genres,
      );
    }
  }

  private listen(): void {
    this.lifecycle.listen(document).addEventListener("click", (event) => {
      this.routeHistory.saveScroll();
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
      const dropdown = this.dependencies.main.querySelector<HTMLDetailsElement>(
        ".genre-filter-dropdown[open]",
      );
      if (dropdown && !dropdown.contains(event.target as Node))
        dropdown.open = false;
    });
    this.lifecycle.listen(document).addEventListener("keydown", (event) => {
      if (event.key !== "Escape") return;
      const dropdown = this.dependencies.main.querySelector<HTMLDetailsElement>(
        ".genre-filter-dropdown[open]",
      );
      if (dropdown) {
        dropdown.open = false;
        dropdown.querySelector<HTMLElement>("summary")?.focus();
      }
    });
  }

  public dispose(): void {
    this.lifecycle.dispose();
    history.scrollRestoration = this.originalScrollRestoration;
  }
}
