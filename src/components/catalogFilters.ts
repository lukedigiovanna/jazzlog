import { icon } from "./icons";

export function renderCatalogFilters(
  content: string,
  activeCount: number,
  heading = "Filters",
) {
  return /* HTML */ `<details class="genre-filter-dropdown">
    <summary
      class="button secondary"
      aria-label="Filters${activeCount ? `, ${activeCount} active` : ""}"
    >
      ${icon("filter", 18)}<span class="genre-filter-text">Filters</span
      >${activeCount ? `<span class="genre-filter-count">${activeCount}</span>` : ""}
    </summary>
    <div class="genre-filter-panel">
      <p>${heading}</p>
      ${content}
    </div>
  </details>`;
}
