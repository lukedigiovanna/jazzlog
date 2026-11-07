import { icon } from "../components/icons";
import type { Album, Genre } from "../types/albums";
import { escapeHtml as e } from "../components/html";
import { ancestors, genreUrl, includesGenre } from "../app/genres";
import { renderAlbumGrid } from "../components/albumGrid";
export function renderGenresView(
  genres: Genre[],
  albums: Album[],
  query: string,
  alphabetical: boolean,
  unused: boolean,
) {
  const count = (g: Genre) =>
    albums.filter((a) => includesGenre(a, g.id, genres)).length;
  const row = (g: Genre) =>
    `<a class="genre-leaf-link" href="${genreUrl(g.id)}"><span>${e(g.name)}</span><span class="muted">${count(g)} albums</span></a>`;
  const tree = (parent: string | null): string =>
    `<ul>${genres
      .filter((g) => g.parentGenreId === parent)
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(
        (g) =>
          `<li class="genre-tree-item">${genres.some((c) => c.parentGenreId === g.id) ? `<details><summary><span class="genre-toggle-label"><span>${e(g.name)}</span><span class="muted">${count(g)} albums</span></span><a class="genre-view-link" href="${genreUrl(g.id)}" aria-label="View ${e(g.name)} details">View <span aria-hidden="true">↗</span></a></summary>${tree(g.id)}</details>` : row(g)}</li>`,
      )
      .join("")}</ul>`;
  const results = genres
    .filter(
      (g) =>
        g.name.toLowerCase().includes(query.toLowerCase()) &&
        (!unused || !albums.some((a) => a.genres.some((c) => c.id === g.id))),
    )
    .sort((a, b) => a.name.localeCompare(b.name));
  return `<section class="instrument-page genres-page"><div class="instrument-page-heading"><h1 id="page-title">Genres</h1><button class="button primary" data-action="new-catalog-genre">Add genre</button></div><div class="instrument-toolbar genre-toolbar"><label class="search-field"><span class="sr-only">Search genres</span><input id="genres-search" type="search" placeholder="Find a genre…" value="${e(query)}"></label><details class="genre-filter-dropdown"><summary class="button secondary" aria-label="Genre filters${alphabetical || unused ? `, ${Number(alphabetical) + Number(unused)} active` : ""}">${icon("filter", 18)}<span class="genre-filter-text">Filters</span>${alphabetical || unused ? `<span class="genre-filter-count">${Number(alphabetical) + Number(unused)}</span>` : ""}</summary><div class="genre-filter-panel"><p>Display & filters</p><label><input id="genres-alphabetical" type="checkbox" ${alphabetical ? "checked" : ""}> Alphabetical view</label><label><input id="genres-unused" type="checkbox" ${unused ? "checked" : ""}> Unused only</label></div></details></div><div class="genre-tree">${
    query || alphabetical || unused
      ? `<ul>${results
          .map(
            (g) =>
              `<li>${row(g)}<p class="muted">${ancestors(g.id, genres)
                .map((p) => e(p.name))
                .join(" › ")}</p></li>`,
          )
          .join("")}</ul>`
      : tree(null)
  }${!results.length ? '<p class="muted">No matching genres. Add one here or while editing an album.</p>' : ""}</div></section>`;
}
export function renderGenreDetail(g: Genre, genres: Genre[], albums: Album[]) {
  const used = albums.filter((a) => includesGenre(a, g.id, genres));
  const children = genres.filter((c) => c.parentGenreId === g.id);
  const direct = albums.some((a) => a.genres.some((c) => c.id === g.id));
  return `<section class="instrument-page genre-detail"><a class="back-link" href="#genres">Back to genres</a><p class="genre-breadcrumb">${ancestors(
    g.id,
    genres,
  )
    .map((p) => `<a href="${genreUrl(p.id)}">${e(p.name)}</a>`)
    .join(
      " › ",
    )}</p><div class="instrument-page-heading"><h1 id="page-title">${e(g.name)}</h1><button class="button secondary" data-action="edit-catalog-genre">Edit genre</button></div>${children.length ? `<section class="genre-subgenres" aria-labelledby="subgenres-title"><h2 id="subgenres-title">Subgenres</h2><div class="tags">${children.map((c) => `<a class="chip" href="${genreUrl(c.id)}">${e(c.name)}</a>`).join("")}</div></section>` : ""}<section class="genre-albums" aria-labelledby="genre-albums-title"><h2 id="genre-albums-title">Albums (${used.length})</h2><p class="muted genre-descendant-note"><em>Includes albums assigned to descendant genres.</em></p>${used.length ? renderAlbumGrid(used) : "<p>No albums yet.</p>"}</section><div class="instrument-delete"><button class="button secondary danger" data-action="delete-catalog-genre" ${direct || children.length ? "disabled" : ""}>Delete genre</button><p class="muted">Remove direct album assignments and reassign child genres before deleting.</p></div></section>`;
}
