import type { Album } from "../types/albums";
import { cover, artistText, albumUrl, latest } from "./presentation";
import { escapeHtml } from "./html";
import { renderRating } from "./rating";
import { icon } from "./icons";

export function renderAlbumCard(album: Album) {
  return /* HTML */ `<li class="album-item">
    <a class="album-card" href="${albumUrl(album.id)}">
      ${cover(album)}
      <span class="album-text"
        ><strong>${escapeHtml(album.title)}</strong
        ><span class="album-artist"
          >${escapeHtml(artistText(album))}${album.releaseYear ? /* HTML */ `<span class="separator">·</span>${album.releaseYear}` : ""}</span
        ></span
      >
      <span class="album-genre"
        >${escapeHtml(album.genres[0]?.name ?? "")}</span
      >
      ${renderRating(latest(album)?.rating)}
      <span class="card-arrow">${icon("chevron", 16)}</span>
    </a>
  </li>`;
}
