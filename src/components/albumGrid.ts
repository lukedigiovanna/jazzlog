import type { Album } from "../types/albums";
import { renderAlbumCard } from "./albumCard";

export function renderAlbumGrid(albums: Album[]): string {
    return `
        <div class="album-grid" aria-label="Albums">
            ${albums.map(renderAlbumCard).join("")}
        </div>
    `;
}
