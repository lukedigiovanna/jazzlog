import { renderCatalogFilters } from "../components/catalogFilters";
import { renderLayoutToggle } from "../components/layoutToggle";
import { renderSortOptions } from "../components/sortOptions";
import type { Genre } from "../types/albums";
import { includesGenre } from "../app/genres";
import type { Album } from "../types/albums";
import {
  cover,
  albumUrl,
  artistText,
  latest,
} from "../components/presentation";
import { escapeHtml } from "../components/html";
import { icon } from "../components/icons";
import { renderAlbumGrid } from "../components/albumGrid";
import { matches } from "../app/search";

export interface LibraryState {
  query: string;
  genre: string;
  sort: string;
  layout: string;
}

export function renderLibraryView(
  albums: Album[],
  state: LibraryState,
  catalog: Genre[],
) {
  const featured = albums[Math.floor(Math.random() * albums.length)];
  const genres = catalog.map((g) => g.name).sort((a, b) => a.localeCompare(b));
  if (!genres.includes(state.genre)) state.genre = "";
  return /* HTML */ `<section class="hero" aria-labelledby="page-title">
      <div class="hero-copy">
        <h1 id="page-title">The Listening <em>Room.</em></h1>
      </div>
      ${
        featured
          ? /* HTML */ `<a class="feature" href="${albumUrl(featured.id)}">
              <span class="feature-art"
                ><span class="vinyl" aria-hidden="true"></span
                >${cover(featured, true)}</span
              >
              <span class="feature-copy"
                ><span class="eyebrow">${icon("bars", 16)} FROM THE SHELF</span
                ><strong>${escapeHtml(featured.title)}</strong
                ><span class="feature-artist"
                  >${escapeHtml(artistText(featured))}${featured.releaseYear ? ` · ${featured.releaseYear}` : ""}</span
                ><span class="feature-open"
                  >View album ${icon("arrow", 16)}</span
                ></span
              >
            </a>`
          : ""
      }
    </section>
    <section class="library" aria-labelledby="library-title">
      <div class="library-heading">
        <h2 id="library-title">Your library</h2>
        ${renderLayoutToggle(state.layout)}
      </div>
      <div class="toolbar library-toolbar">
        <label class="search-field"
          >${icon("search")}<span class="sr-only">Search library</span
          ><input
            id="library-query"
            type="search"
            placeholder="Search albums or artists…"
            value="${escapeHtml(state.query)}"
        /></label>
        ${renderCatalogFilters(
          /* HTML */ `<label class="field"
              ><span>Genre</span
              ><select id="genre-filter">
                <option value="">All genres</option>
                ${genres.map((genre) => /* HTML */ `<option ${genre === state.genre ? "selected" : ""}>${escapeHtml(genre)}</option>`).join("")}
              </select></label
            >
            <label class="field"
              ><span>Sort albums</span
              ><select id="sort-order">
                ${renderSortOptions(["recent", "updated", "title", "rating", "year"], state.sort)}
              </select></label
            >`,
          Number(Boolean(state.genre)),
        )}
      </div>
      <p class="result-count" id="library-count" aria-live="polite"></p>
      <div id="library-results"></div>
    </section>`;
}

export function updateLibrary(
  albums: Album[],
  state: LibraryState,
  catalog: Genre[],
  root: ParentNode = document,
) {
  const list = root.querySelector("#library-results");
  if (!list) return;
  const titleOrder = (a: Album, b: Album) =>
    (a.sortTitle || a.title).localeCompare(b.sortTitle || b.title);
  const order: Record<string, (a: Album, b: Album) => number> = {
    recent: (a, b) =>
      (latest(b)?.listenedAt ?? b.createdAt).localeCompare(
        latest(a)?.listenedAt ?? a.createdAt,
      ),
    updated: (a, b) => b.updatedAt.localeCompare(a.updatedAt),
    title: titleOrder,
    rating: (a, b) => (latest(b)?.rating ?? 0) - (latest(a)?.rating ?? 0),
    year: (a, b) => (a.releaseYear ?? Infinity) - (b.releaseYear ?? Infinity),
  };
  const filtered = albums.filter(
    (album) =>
      (!state.genre ||
        includesGenre(
          album,
          catalog.find((g) => g.name === state.genre)?.id ?? "",
          catalog,
        )) &&
      matches(
        state.query,
        album.title,
        album.sortTitle,
        ...album.artists.map((artist) => artist.name),
        album.releaseYear,
        ...album.genres.map((genre) => genre.name),
      ),
  );
  filtered.sort((a, b) => order[state.sort](a, b) || titleOrder(a, b));
  root.querySelector("#library-count")!.textContent =
    filtered.length === albums.length
      ? `${filtered.length} ${filtered.length === 1 ? "album" : "albums"}`
      : `${filtered.length} of ${albums.length} albums`;
  list.innerHTML = filtered.length
    ? renderAlbumGrid(filtered, state.layout)
    : /* HTML */ `<div class="empty">
        ${icon("disc", 35)}
        <h3>${albums.length ? "No matching albums" : "Your shelf is empty"}</h3>
        <p>
          ${albums.length ? "Try a different search or clear your filters." : "Add a record to start your listening journal."}
        </p>
        <button
          class="button secondary"
          type="button"
          data-action="${albums.length ? "clear" : "add"}"
        >
          ${albums.length ? "Clear filters" : "Add album"}
        </button>
      </div>`;
}
