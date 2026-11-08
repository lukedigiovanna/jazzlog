import { createDialog } from "./dialog";

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

export function createMetadataSearch(ops: {
  editor: HTMLDialogElement;
  showDialog: ReturnType<typeof createDialog>["showDialog"];
  hasDraft: () => boolean;
  clearDraftTarget: () => void;
  resumeDraft: () => void;
  openAlbumForm: (album?: Partial<Album>, mode?: string) => void;
  canDismissDialog: () => boolean;
  clearDraft: () => void;
  isActive: () => boolean;
  albums: () => Album[];
}) {
  let searchQuery = "";
  let searchResults: Album[] = [];

  let searchTimer: ReturnType<typeof setTimeout>;
  let searchVersion = 0;
  const searchCache = new Map<string, Album[]>();

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

  function openSearch(reset = true) {
    if (ops.hasDraft() && !ops.editor.open) {
      ops.resumeDraft();
      return;
    }
    ops.clearDraftTarget();
    if (reset) searchQuery = "";
    ops.showDialog(
      "Add an album",
      "NEW RECORD",
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
              value="${escapeHtml(searchQuery)}"
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
    updateCatalog();
  }

  function updateCatalog() {
    clearTimeout(searchTimer);
    const version = ++searchVersion;
    const container = ops.editor.querySelector<HTMLElement>("#catalog-results");
    const count = ops.editor.querySelector<HTMLElement>("#catalog-count");
    if (!container || !count) return;
    searchResults = [];
    container.removeAttribute("aria-busy");
    const query = searchQuery.trim();
    count.textContent = "";
    if (!query) {
      container.innerHTML = /* HTML */ `<div class="empty catalog-empty">
        <p>Search by album title or artist to find a release.</p>
      </div>`;
      return;
    }
    const cached = searchCache.get(query);
    if (cached) {
      searchResults = cached;
      renderCatalog();
      return;
    }
    container.setAttribute("aria-busy", "true");
    container.innerHTML = /* HTML */ `<div
      class="empty catalog-empty"
      role="status"
    >
      <p>Finding album…</p>
    </div>`;
    searchTimer = setTimeout(async () => {
      const current = () =>
        ops.isActive() &&
        version === searchVersion &&
        ops.editor.open &&
        ops.editor.querySelector("#catalog-results") === container;
      if (!current()) return;
      try {
        // Preserve the indexed search syntax used by MusicBrainz's website.
        if (/^https?:\/\//i.test(query)) {
          const imported = await resolveWikipediaArticle(
            parseWikipediaUrl(query),
          );
          if (!current()) return;
          searchResults = [
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
              links: [{ id: makeId(), url: imported.url, label: "Wikipedia" }],
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
          searchResults = candidates.map(candidateAlbum);
        }
        if (searchCache.size >= 20)
          searchCache.delete(searchCache.keys().next().value!);
        searchCache.set(query, searchResults);
        renderCatalog();
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

  function renderCatalog() {
    const results = searchResults;
    const inLibrary = (album: Album) =>
      ops
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

  function click(button: HTMLButtonElement) {
    switch (button.dataset.action) {
      case "add":
        openSearch();
        break;
      case "manual":
        ops.openAlbumForm();
        break;
      case "back-search":
        if (ops.canDismissDialog()) {
          ops.clearDraft();
          openSearch(false);
        }
        break;
      case "retry-search":
        updateCatalog();
        break;
      case "pick": {
        const result = searchResults.find(
          (entry) => entry.id === button.dataset.id,
        );
        if (!result) break;
        const saved = ops
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
          ops.editor.close();
          location.hash = albumUrl(saved.id);
        } else {
          ops.openAlbumForm(result, "review");
        }
        break;
      }
      default:
        return false;
    }
    return true;
  }

  function cancel() {
    clearTimeout(searchTimer);
    searchVersion++;
  }
  function input(input: HTMLInputElement) {
    if (input.id === "catalog-query") {
      searchQuery = input.value;
      updateCatalog();
    }
  }

  return { openSearch, click, input, cancel };
}
