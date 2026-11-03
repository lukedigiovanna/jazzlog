import { renderHeader } from "../components/header";
import { mockAlbums } from "../data/mockData";
import { renderLibraryView } from "../views/libraryView";

export function renderApp(): string {
    return `
        <a class="skip-link" href="#main-content">Skip to content</a>
        <div class="app">
            ${renderHeader()}
            <main class="app__main" id="main-content">
                ${renderLibraryView(mockAlbums)}
            </main>
        </div>
    `;
}
