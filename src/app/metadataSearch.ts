import type { AlbumEditorMode } from "./albumEditor";
import type { EditorDialog } from "./editorContracts";
import {
  parseWikipediaUrl,
  resolveWikipediaArticle,
} from "../services/wikipedia";
import { makeId } from "./id";
import { searchReleaseGroups } from "../services/musicbrainz";
import { getReleaseGroupArtworkUrl } from "../services/coverArt";
import type { MusicBrainzAlbumCandidate } from "../types/musicbrainz";
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

function candidateAlbum(candidate: MusicBrainzAlbumCandidate): Album {
  return {
    id: candidate.musicbrainzId,
    musicbrainzReleaseGroupId: candidate.musicbrainzId,
    title: candidate.title,
    releaseYear: candidate.releaseYear,
    sortTitle: null,
    artworkUrl: getReleaseGroupArtworkUrl(candidate.musicbrainzId),
    artists: candidate.artists
      .filter(
        (credit, index, credits) =>
          credits.findIndex(
            (other) => other.musicbrainzId === credit.musicbrainzId,
          ) === index,
      )
      .map((credit, position) => ({
        id: makeId(),
        musicbrainzId: credit.musicbrainzId,
        name: credit.name,
        sortName: null,
        country: null,
        role: "primary",
        position,
      })),
    genres: [],
    instruments: [],
    links: [],
    listeningEntries: [],
    createdAt: "",
    updatedAt: "",
  };
}

export class MetadataSearchController implements MetadataSearch {
  private searchQuery = "";
  private searchResults: Album[] = [];
  private searchTimer: ReturnType<typeof setTimeout> | undefined;
  private searchVersion = 0;
  private readonly searchCache = new Map<string, Album[]>();

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
            Find an album on MusicBrainz, paste a Wikipedia article URL, or
            enter the details yourself.
          </p>
          <label class="search-field dialog-search"
            >${icon("search")}<span class="sr-only"
              >Search MusicBrainz or paste a Wikipedia URL</span
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
        <p>Search by album title or artist to find a release.</p>
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
      const current = () =>
        this.ops.isActive() &&
        version === this.searchVersion &&
        this.ops.editor.open &&
        this.ops.editor.querySelector("#catalog-results") === container;
      if (!current()) return;

      try {
        // Preserve the indexed search syntax used by MusicBrainz's website.
        if (/^https?:\/\//i.test(query)) {
          const imported = await resolveWikipediaArticle(
            parseWikipediaUrl(query),
          );
          if (!current()) return;
          this.searchResults = [
            {
              ...candidateAlbum({
                musicbrainzId: "",
                title: imported.title,
                releaseYear: imported.releaseYear,
                primaryType: "Album",
                artists: [],
              }),
              id: imported.url,
              musicbrainzReleaseGroupId: null,
              artworkUrl: imported.artworkUrl,
              genreSuggestions: imported.genreSuggestions,
              instrumentSuggestions: imported.instrumentSuggestions,
              recordLabel: imported.recordLabel ?? undefined,
              links: [
                { id: makeId(), url: imported.url, label: "Wikipedia" },
                ...imported.links.map((link) => ({ ...link, id: makeId() })),
              ],
              artists: imported.artists.map((artist, position) => ({
                ...artist,
                id: makeId(),
                sortName: null,
                country: null,
                role: "primary",
                position,
              })),
            },
          ];
        } else {
          const candidates = await searchReleaseGroups(query);
          if (!current()) return;
          this.searchResults = candidates.map(candidateAlbum);
        }
        if (this.searchCache.size >= 20)
          this.searchCache.delete(this.searchCache.keys().next().value!);
        this.searchCache.set(query, this.searchResults);
        this.renderCatalog();
      } catch (error) {
        if (!current()) return;
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
        if (current()) container.removeAttribute("aria-busy");
      }
    }, 400);
  }

  private renderCatalog(): void {
    const results = this.searchResults;
    const inLibrary = (album: Album) =>
      this.ops
        .albums()
        .find(
          (item) =>
            (album.musicbrainzReleaseGroupId &&
              item.musicbrainzReleaseGroupId ===
                album.musicbrainzReleaseGroupId) ||
            album.links.some((link) =>
              item.links.some((savedLink) => savedLink.url === link.url),
            ),
        );
    const sorted = [...results].sort(
      (a, b) => Number(Boolean(inLibrary(a))) - Number(Boolean(inLibrary(b))),
    );
    document.querySelector<HTMLElement>("#catalog-count")!.textContent =
      `${results.length} ${results.length === 1 ? "result" : "results"}`;
    document.querySelector<HTMLElement>("#catalog-results")!.innerHTML =
      results.length
        ? /* HTML */ `<ul class="catalog-list">
            ${sorted
              .map((album) => {
                const saved = inLibrary(album);
                return /* HTML */ `<li>
                  <button
                    type="button"
                    class="result-row"
                    data-action="pick"
                    data-id="${escapeHtml(album.id)}"
                  >
                    ${cover(album)}<span class="result-info"
                      ><strong>${escapeHtml(album.title)}</strong
                      ><span
                        >${escapeHtml(artistText(album))} ·
                        ${album.releaseYear ?? "Unknown year"}</span
                      ></span
                    >
                    ${saved ? '<span class="in-library">In library</span>' : ""}${icon("chevron", 17)}
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
        if (!result) break;
        const saved = this.ops
          .albums()
          .find(
            (entry) =>
              (result.musicbrainzReleaseGroupId &&
                entry.musicbrainzReleaseGroupId ===
                  result.musicbrainzReleaseGroupId) ||
              result.links.some((link) =>
                entry.links.some((savedLink) => savedLink.url === link.url),
              ),
          );
        if (saved) {
          this.ops.editor.close();
          location.hash = albumUrl(saved.id);
        } else {
          this.ops.openAlbumForm(result, "review");
        }
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
