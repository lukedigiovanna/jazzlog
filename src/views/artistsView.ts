import { renderLayoutToggle } from "../components/layoutToggle";
import { renderCatalogHeading } from "../components/catalogHeading";
import { renderCatalogFilters } from "../components/catalogFilters";
import type { Album, Artist } from "../types/albums";
import { escapeHtml as e } from "../components/html";
import { icon } from "../components/icons";
import { renderAlbumGrid } from "../components/albumGrid";
import { matches } from "../app/search";

export const artistUrl = (id: string) => `#artist/${encodeURIComponent(id)}`;
export const artistAlbums = (albums: Album[], id: string) =>
  albums.filter((album) => album.artists.some((artist) => artist.id === id));
export const artistRoles = ["primary", "featured", "other"] as const;
export const roleLabel = (role: string) =>
  role.charAt(0).toUpperCase() + role.slice(1);

export function renderArtistsView(query: string, unused: boolean) {
  return /* HTML */ `<section
    class="instrument-page catalog-page"
    aria-labelledby="page-title"
  >
    ${renderCatalogHeading("Artists", "artist")}
    <div class="instrument-toolbar genre-toolbar">
      <label class="search-field"
        >${icon("search")}<span class="sr-only">Search artists</span
        ><input
          id="artists-search"
          type="search"
          placeholder="Find an artist…"
          value="${e(query)}" /></label
      >${renderCatalogFilters(/* HTML */ `<label><input id="artists-unused" type="checkbox" ${unused ? "checked" : ""} /> Unused only</label>`, Number(unused))}
    </div>
    <p id="artists-count" class="muted" role="status"></p>
    <div id="artists-list"></div>
  </section>`;
}
export function updateArtistsView(
  artists: Artist[],
  albums: Album[],
  query: string,
  unused: boolean,
  root: ParentNode = document,
) {
  const results = artists
    .filter(
      (item) =>
        matches(query, item.name, item.sortName ?? "", item.country ?? "") &&
        (!unused || !artistAlbums(albums, item.id).length),
    )
    .sort((a, b) => (a.sortName || a.name).localeCompare(b.sortName || b.name));
  root.querySelector("#artists-count")!.textContent =
    `${results.length} ${results.length === 1 ? "artist" : "artists"}`;
  root.querySelector("#artists-list")!.innerHTML = results.length
    ? /* HTML */ `<ul class="instrument-catalog-list">
        ${results
          .map((item) => {
            const count = artistAlbums(albums, item.id).length;
            return /* HTML */ `<li>
              <a class="instrument-catalog-row" href="${artistUrl(item.id)}"
                ><span class="instrument-row-info"
                  ><span
                    ><strong>${e(item.name)}</strong
                    >${item.country ? /* HTML */ ` <em class="artist-country">(${e(item.country)})</em>` : ""}</span
                  ><span class="instrument-usage ${count ? "" : "unused"}"
                    >${count ? `Credited on ${count} ${count === 1 ? "album" : "albums"}` : "Not credited on any albums"}</span
                  ></span
                >${icon("chevron", 18)}</a
              >
            </li>`;
          })
          .join("")}
      </ul>`
    : /* HTML */ `<div class="empty">
        <h2>
          ${artists.length ? "No matching artists" : "Start your artist catalog"}
        </h2>
        <p>Add an artist here or while editing an album.</p>
        ${artists.length ? '<button class="button secondary" data-action="clear-artist-filters">Clear filters</button>' : ""}
      </div>`;
}
export function renderArtistDetail(
  item: Artist,
  albums: Album[],
  layout = "grid",
) {
  const used = artistAlbums(albums, item.id);
  return /* HTML */ `<section
    class="instrument-page"
    aria-labelledby="page-title"
  >
    <a class="back-link" href="#artists">${icon("back", 17)} Back to artists</a>
    <div class="artist-page-heading">
      <p class="eyebrow"><span></span> ARTIST DETAILS</p>
      <div class="artist-title-row">
        <h1 id="page-title">${e(item.name)}</h1>
        <button class="button secondary" data-action="edit-catalog-artist">
          ${icon("edit", 16)} Edit artist
        </button>
      </div>
      <div class="artist-details">
        <p class="muted">
          ${[item.country ? `Country: ${e(item.country)}` : ""].filter(Boolean).join(" · ") || "No additional details"}
        </p>
        ${item.musicbrainzId ? /* HTML */ `<p class="muted">MusicBrainz ID: ${e(item.musicbrainzId)}</p>` : ""}
      </div>
    </div>
    <section class="instrument-albums">
      <div class="library-heading">
        <div class="detail-heading">
          <h2>Album credits</h2>
          <span class="count-pill">${used.length}</span>
        </div>
        ${renderLayoutToggle(layout, "Album credits layout", "artist-layout")}
      </div>
      ${
        used.length
          ? renderAlbumGrid(used, layout, (album) =>
              album.artists
                .filter(
                  (credit) =>
                    credit.id === item.id && credit.role !== "primary",
                )
                .map((credit) => roleLabel(credit.role))
                .join(" · "),
            )
          : '<div class="empty detail-empty"><h3>No album credits yet</h3><p>This artist stays in your catalog until you use or delete it.</p></div>'
      }
    </section>
    <div class="instrument-delete">
      <button
        class="button secondary danger"
        data-action="delete-catalog-artist"
        ${used.length ? 'disabled aria-describedby="artist-delete-help"' : ""}
      >
        Delete artist
      </button>
      <p id="artist-delete-help" class="muted">
        ${used.length ? "Remove this artist from its albums before deleting it." : "Unused artists can be deleted from your catalog."}
      </p>
    </div>
  </section>`;
}
