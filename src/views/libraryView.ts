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
  const featured =
    albums.find((album) => album.id === "seychelles") ?? albums[0];
  const genres = catalog.map((g) => g.name).sort((a, b) => a.localeCompare(b));
  if (!genres.includes(state.genre)) state.genre = "";
  const listenCount = albums.reduce(
    (sum, album) => sum + album.listeningEntries.length,
    0,
  );
  return /* HTML */ `<section class="hero" aria-labelledby="page-title">
      <div class="hero-copy">
        <h1 id="page-title">The Listening <em>Room.</em></h1>
        <p class="hero-description">
          A place for the records you come back to.
        </p>
        <div class="hero-stats">
          <span
            ><strong>${albums.length}</strong>
            ${albums.length === 1 ? "album" : "albums"}</span
          ><span
            ><strong>${listenCount}</strong>
            ${listenCount === 1 ? "listen" : "listens"} logged</span
          >
        </div>
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
        <div>
          <p class="eyebrow"><span></span> THE COLLECTION</p>
          <h2 id="library-title">Your library</h2>
        </div>
        <div class="layout-toggle" aria-label="Library layout">
          <button
            type="button"
            class="icon-button"
            aria-label="Grid view"
            aria-pressed="${state.layout === "grid"}"
            data-action="layout"
            data-layout="grid"
          >
            ${icon("grid")}
          </button>
          <button
            type="button"
            class="icon-button"
            aria-label="List view"
            aria-pressed="${state.layout === "list"}"
            data-action="layout"
            data-layout="list"
          >
            ${icon("list")}
          </button>
        </div>
      </div>
      <div class="toolbar">
        <label class="search-field"
          >${icon("search")}<span class="sr-only">Search library</span
          ><input
            id="library-query"
            type="search"
            placeholder="Search albums or artists…"
            value="${escapeHtml(state.query)}"
        /></label>
        <label class="select-wrap"
          ><span class="sr-only">Filter by genre</span
          ><select id="genre-filter">
            <option value="">All genres</option>
            ${genres.map((genre) => /* HTML */ `<option ${genre === state.genre ? "selected" : ""}>${escapeHtml(genre)}</option>`).join("")}</select
          >${icon("down", 14)}</label
        >
        <label class="select-wrap sort"
          >${icon("sort", 16)}<span class="sr-only">Sort albums</span
          ><select id="sort-order">
            ${[
              ["recent", "Recently listened"],
              ["title", "Album title"],
              ["rating", "Highest rated"],
              ["year", "Release year"],
            ]
              .map(
                ([value, label]) =>
                  /* HTML */ `<option
                    value="${value}"
                    ${value === state.sort ? "selected" : ""}
                  >
                    ${label}
                  </option>`,
              )
              .join("")}</select
          >${icon("down", 14)}</label
        >
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
