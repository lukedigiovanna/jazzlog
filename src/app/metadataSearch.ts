import type { AlbumEditorMode } from "./editorContracts";
import type { EditorDialog } from "./editorContracts";
import {
  parseWikipediaUrl,
  resolveWikipediaArticle,
  searchWikipediaAlbums,
  type WikipediaAlbumSearchResult,
  type WikipediaImport,
} from "../services/wikipedia";
import { makeId } from "./id";
import type { Album } from "../types/albums";
import { icon } from "../components/icons";
import { escapeHtml } from "../components/html";
import { cover, artistText, albumUrl } from "../components/presentation";

export interface MetadataSearchDependencies {
  editor: HTMLDialogElement;
  showDialog: EditorDialog["show"];
  hasDraft: () => boolean;
  clearDraftTarget: () => void;
  resumeDraft: () => void;
  openAlbumForm: (album?: Partial<Album>, mode?: AlbumEditorMode) => void;
  canDismissDialog: () => boolean;
  clearDraft: () => void;
  isActive: () => boolean;
  albums: () => Album[];
}

export interface MetadataSearch {
  openSearch: (reset?: boolean) => void;
  click: (button: HTMLButtonElement) => boolean;
  input: (input: HTMLInputElement) => void;
  cancel: () => void;
}

type SearchResult = Album | WikipediaAlbumSearchResult;

function importedAlbum(imported: WikipediaImport): Album {
  return {
    id: imported.url,
    musicbrainzReleaseGroupId: null,
    title: imported.title,
    releaseYear: imported.releaseYear,
    sortTitle: null,
    artworkUrl: imported.artworkUrl,
    genreSuggestions: imported.genreSuggestions,
    instrumentSuggestions: imported.instrumentSuggestions,
    recordLabel: imported.recordLabel ?? undefined,
    artists: imported.artists.map((artist, position) => ({
      ...artist,
      id: makeId(),
      sortName: null,
      country: null,
      role: "primary",
      position,
    })),
    genres: [],
    instruments: [],
    links: [
      { id: makeId(), url: imported.url, label: "Wikipedia" },
      ...imported.links.map((link) => ({ ...link, id: makeId() })),
    ],
    listeningEntries: [],
    createdAt: "",
    updatedAt: "",
  };
}

export class MetadataSearchController implements MetadataSearch {
  private searchQuery = "";
  private searchResults: SearchResult[] = [];
  private searchTimer: ReturnType<typeof setTimeout> | undefined;
  private searchVersion = 0;
  private readonly searchCache = new Map<string, SearchResult[]>();

  private readonly ops: MetadataSearchDependencies;

  constructor(ops: MetadataSearchDependencies) {
    this.ops = ops;
  }

  openSearch(reset = true): void {
    if (this.ops.hasDraft() && !this.ops.editor.open) {
      this.ops.resumeDraft();
      return;
    }

    this.ops.clearDraftTarget();
    if (reset) this.searchQuery = "";
    this.ops.showDialog(
      "Add an album",
      /* HTML */ `<div class="dialog-body">
          <p class="dialog-intro">
            Find an album on Wikipedia, paste an article URL, or enter the
            details yourself.
          </p>
          <label class="search-field dialog-search"
            >${icon("search")}<span class="sr-only"
              >Search Wikipedia or paste an article URL</span
            ><input
              id="catalog-query"
              type="search"
              placeholder="Album, artist, or Wikipedia URL…"
              value="${escapeHtml(this.searchQuery)}"
              autocomplete="off"
          /></label>
          <div class="search-results-heading">
            <span>Album results</span
            ><span id="catalog-count" aria-live="polite"></span>
          </div>
          <div id="catalog-results"></div>
        </div>
        <div class="dialog-footer search-footer">
          <span>Can’t find your album?</span
          ><button type="button" class="button secondary" data-action="manual">
            ${icon("edit", 16)} Enter manually
          </button>
        </div>`,
      "#catalog-query",
    );
    this.updateCatalog();
  }

  private updateCatalog(): void {
    clearTimeout(this.searchTimer);
    const version = ++this.searchVersion;
    const container =
      this.ops.editor.querySelector<HTMLElement>("#catalog-results");
    const count = this.ops.editor.querySelector<HTMLElement>("#catalog-count");
    if (!container || !count) return;

    this.searchResults = [];
    container.removeAttribute("aria-busy");
    const query = this.searchQuery.trim();
    count.textContent = "";

    if (!query) {
      container.innerHTML = /* HTML */ `<div class="empty catalog-empty">
        <p>Search Wikipedia by album title or artist.</p>
      </div>`;
      return;
    }

    const cached = this.searchCache.get(query);
    if (cached) {
      this.searchResults = cached;
      this.renderCatalog();
      return;
    }

    container.setAttribute("aria-busy", "true");
    container.innerHTML = /* HTML */ `<div
      class="empty catalog-empty"
      role="status"
    >
      <p>Finding album…</p>
    </div>`;
    this.searchTimer = setTimeout(async () => {
      if (!this.isCurrent(version, container)) return;

      try {
        const results = /^https?:\/\//i.test(query)
          ? [
              importedAlbum(
                await resolveWikipediaArticle(parseWikipediaUrl(query)),
              ),
            ]
          : await searchWikipediaAlbums(query);
        if (!this.isCurrent(version, container)) return;

        this.searchResults = results;
        if (this.searchCache.size >= 20)
          this.searchCache.delete(this.searchCache.keys().next().value!);
        this.searchCache.set(query, this.searchResults);
        this.renderCatalog();
      } catch (error) {
        if (!this.isCurrent(version, container)) return;
        count.textContent = "Search failed";
        container.innerHTML = /* HTML */ `<div
          class="empty catalog-empty"
          role="alert"
        >
          <h3>Couldn’t find album</h3>
          <p>
            ${escapeHtml(error instanceof Error ? error.message : "Please try again.")}
          </p>
          <button
            type="button"
            class="button secondary"
            data-action="retry-search"
          >
            Try again
          </button>
        </div>`;
      } finally {
        if (this.isCurrent(version, container))
          container.removeAttribute("aria-busy");
      }
    }, 400);
  }

  private isCurrent(version: number, container: HTMLElement): boolean {
    return (
      this.ops.isActive() &&
      version === this.searchVersion &&
      this.ops.editor.open &&
      this.ops.editor.querySelector("#catalog-results") === container
    );
  }

  private findSavedAlbum(result: SearchResult): Album | undefined {
    const urls =
      "article" in result ? [result.id] : result.links.map((link) => link.url);
    return this.ops
      .albums()
      .find((album) => album.links.some((link) => urls.includes(link.url)));
  }

  private openResult(result: SearchResult): void {
    const saved = this.findSavedAlbum(result);
    if (saved) {
      this.ops.editor.close();
      location.hash = albumUrl(saved.id);
    } else if ("article" in result) {
      void this.importArticle(result);
    } else {
      this.ops.openAlbumForm(result, "review");
    }
  }

  private async importArticle(
    result: WikipediaAlbumSearchResult,
  ): Promise<void> {
    const container =
      this.ops.editor.querySelector<HTMLElement>("#catalog-results");
    const count = this.ops.editor.querySelector<HTMLElement>("#catalog-count");
    if (!container || !count || container.hasAttribute("aria-busy")) return;

    const version = ++this.searchVersion;
    container.setAttribute("aria-busy", "true");
    count.textContent = "Importing album…";

    try {
      const album = importedAlbum(
        await resolveWikipediaArticle(result.article),
      );
      if (this.isCurrent(version, container)) this.openResult(album);
    } catch (error) {
      if (!this.isCurrent(version, container)) return;

      count.textContent =
        error instanceof Error ? error.message : "Import failed. Try again.";
    } finally {
      if (this.isCurrent(version, container))
        container.removeAttribute("aria-busy");
    }
  }

  private renderCatalog(): void {
    const results = this.searchResults;
    const sorted = [...results].sort(
      (a, b) =>
        Number(Boolean(this.findSavedAlbum(a))) -
        Number(Boolean(this.findSavedAlbum(b))),
    );
    document.querySelector<HTMLElement>("#catalog-count")!.textContent =
      `${results.length} ${results.length === 1 ? "result" : "results"}`;
    document.querySelector<HTMLElement>("#catalog-results")!.innerHTML =
      results.length
        ? /* HTML */ `<ul class="catalog-list">
            ${sorted
              .map((album) => {
                const saved = this.findSavedAlbum(album);
                const description =
                  "article" in album
                    ? album.description
                    : `${artistText(album)} · ${album.releaseYear ?? "Unknown year"}`;
                return /* HTML */ `<li>
                  <button
                    type="button"
                    class="result-row"
                    data-action="pick"
                    data-id="${escapeHtml(album.id)}"
                  >
                    ${cover(album)}<span class="result-info"
                      ><strong>${escapeHtml(album.title)}</strong>
                      ${description ? /* HTML */ `<span>${escapeHtml(description)}</span>` : ""}
                    </span>
                    ${saved ? /* HTML */ `<span class="in-library">In library</span>` : ""}${icon("chevron", 17)}
                  </button>
                </li>`;
              })
              .join("")}
          </ul>`
        : /* HTML */ `<div class="empty catalog-empty">
            ${icon("search", 25)}
            <h3>No matching releases</h3>
            <p>Try another title or artist, or add this album manually.</p>
          </div>`;
  }

  click(button: HTMLButtonElement): boolean {
    switch (button.dataset.action) {
      case "add":
        this.openSearch();
        break;
      case "manual":
        this.ops.openAlbumForm();
        break;
      case "back-search":
        if (this.ops.canDismissDialog()) {
          this.ops.clearDraft();
          this.openSearch(false);
        }
        break;
      case "retry-search":
        this.updateCatalog();
        break;
      case "pick": {
        const result = this.searchResults.find(
          (entry) => entry.id === button.dataset.id,
        );
        if (result) this.openResult(result);
        break;
      }
      default:
        return false;
    }

    return true;
  }

  cancel(): void {
    clearTimeout(this.searchTimer);
    this.searchVersion++;
  }

  input(input: HTMLInputElement): void {
    if (input.id === "catalog-query") {
      this.searchQuery = input.value;
      this.updateCatalog();
    }
  }
}
