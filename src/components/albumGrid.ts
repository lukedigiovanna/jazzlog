import type { Album } from "../types/albums";
import { renderAlbumCard } from "./albumCard";
export function renderAlbumGrid(albums: Album[], layout: string = "grid"): string {
 return `<ul class="album-collection ${layout === "list" ? "album-list" : "album-grid"}">${albums.map(renderAlbumCard).join("")}</ul>`;
}
