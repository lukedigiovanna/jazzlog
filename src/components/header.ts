export function renderHeader(): string {
    return `
        <header class="app-header">
            <a
                class="wordmark"
                href="#library"
                data-action="show-library"
                aria-label="JazzLog home"
            >
                JazzLog
            </a>
            <button
                class="button button--primary"
                type="button"
                data-action="add-album"
            >
                Add album
            </button>
        </header>
    `;
}
