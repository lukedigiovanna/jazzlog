import type { Album } from "../types/albums";
import { renderAlbumGrid } from "../components/albumGrid";

function renderEmptyLibrary(): string {
    return `
        <div class="empty-library">
            <p class="eyebrow">A quiet shelf</p>
            <h2>Your library is waiting</h2>
            <p>
                Add the first album you want to keep close, then start
                logging the listens that matter.
            </p>
            <button
                class="button button--primary"
                type="button"
                data-action="add-album"
            >
                Add album
            </button>
        </div>
    `;
}

export function renderLibraryView(albums: Album[]): string {
    return `
        <section class="library-view" aria-labelledby="library-heading">
            <div class="library-view__collection">
                ${albums.length > 0
            ? renderAlbumGrid(albums)
            : renderEmptyLibrary()
        }
            </div>
        </section>
    `;
}
