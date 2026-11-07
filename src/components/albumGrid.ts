import type { Album } from "../types/albums";
import { renderAlbumCard } from "./albumCard";
export function renderAlbumGrid(
  albums: Album[],
  layout: string = "grid",
  creditRole?: (album: Album) => string,
): string {
  return /* HTML */ `<ul
    class="album-collection ${layout === "list" ? "album-list" : "album-grid"}"
  >
    ${albums.map((album) => renderAlbumCard(album, creditRole?.(album))).join("")}
  </ul>`;
}
