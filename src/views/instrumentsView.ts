import {
  catalogImage,
  catalogSummary,
  catalogSort,
  catalogStats,
  compareCatalog,
} from "../components/catalogSummary";
import { renderCatalogHeading } from "../components/catalogHeading";
import { renderCatalogFilters } from "../components/catalogFilters";
import type { Album, Instrument, InstrumentCategory } from "../types/albums";
import { escapeHtml } from "../components/html";
import { icon } from "../components/icons";
import { chips } from "../components/presentation";
import { renderAlbumGrid } from "../components/albumGrid";
import {
  albumsUsing,
  categoryLabel,
  instrumentCategories,
  instrumentUrl,
} from "../app/instruments";
import { matches } from "../app/search";

export interface InstrumentFilters {
  query: string;
  category: string;
  unused: boolean;
  sort?: string;
}

export function categoryFields(
  selected: InstrumentCategory[] = [],
  name = "category",
) {
  return /* HTML */ `<fieldset class="category-fields">
    <legend>Categories <span class="muted">(optional)</span></legend>
    <p class="form-hint">Choose all that apply.</p>
    <div class="category-options">
      ${instrumentCategories.map((category) => /* HTML */ `<label><input type="checkbox" name="${name}" value="${category}" ${selected.includes(category) ? "checked" : ""} /><span>${categoryLabel(category)}</span></label>`).join("")}
    </div>
  </fieldset>`;
}

export function renderInstrumentsView(filters: InstrumentFilters) {
  return /* HTML */ `<section
    class="instrument-page catalog-page"
    aria-labelledby="page-title"
  >
    ${renderCatalogHeading("Instruments", "instrument")}
    <div class="instrument-toolbar genre-toolbar">
      <label class="search-field"
        >${icon("search")}<span class="sr-only">Search instruments</span
        ><input
          id="instruments-search"
          type="search"
          placeholder="Find an instrument…"
          value="${escapeHtml(filters.query)}"
      /></label>
      ${renderCatalogFilters(
        /* HTML */ `${catalogSort("instruments-sort", filters.sort ?? "updated", false)}<label
            class="field"
            ><span>Category</span
            ><select id="instrument-category-filter">
              <option value="">All categories</option>
              ${instrumentCategories.map((category) => /* HTML */ `<option value="${category}" ${filters.category === category ? "selected" : ""}>${categoryLabel(category)}</option>`).join("")}
              <option
                value="uncategorized"
                ${filters.category === "uncategorized" ? "selected" : ""}
              >
                Uncategorized
              </option>
            </select></label
          >
          <label
            ><input
              type="checkbox"
              id="instruments-unused"
              ${filters.unused ? "checked" : ""}
            />
            Unused only</label
          >`,
        Number(Boolean(filters.category)) + Number(filters.unused),
      )}
    </div>
    <p id="instruments-count" class="result-count" role="status"></p>
    <div id="instruments-list"></div>
  </section>`;
}

export function updateInstrumentsView(
  instruments: Instrument[],
  albums: Album[],
  filters: InstrumentFilters,
  root: ParentNode = document,
) {
  const results = instruments
    .filter(
      (item) =>
        matches(filters.query, item.name) &&
        (!filters.category ||
          (filters.category === "uncategorized"
            ? !item.categories.length
            : item.categories.some(
                (category) => category === filters.category,
              ))) &&
        (!filters.unused || !albumsUsing(albums, item.id).length),
    )
    .sort(
      (a, b) =>
        compareCatalog(
          catalogStats(albumsUsing(albums, a.id)),
          catalogStats(albumsUsing(albums, b.id)),
          filters.sort ?? "updated",
        ) || a.name.localeCompare(b.name),
    );
  root.querySelector("#instruments-count")!.textContent =
    `${results.length} ${results.length === 1 ? "instrument" : "instruments"}`;
  root.querySelector("#instruments-list")!.innerHTML = results.length
    ? /* HTML */ `<ul class="instrument-catalog-list">
        ${results
          .map((item) => {
            return /* HTML */ `<li>
              <a class="instrument-catalog-row" href="${instrumentUrl(item.id)}"
                >${catalogImage(item.name, item.imageUrl, false, item.categories)}<span
                  class="catalog-card-content"
                  ><span class="instrument-row-info"
                    ><span
                      ><strong>${escapeHtml(item.name)}</strong
                      ><span class="muted instrument-inline-category">
                        <span class="instrument-category-dot">· </span>
                        ${item.categories.length ? item.categories.map(categoryLabel).join(", ") : "Uncategorized"}</span
                      ></span
                    ></span
                  >${catalogSummary(albumsUsing(albums, item.id), false)}</span
                >${icon("chevron", 18)}</a
              >
            </li>`;
          })
          .join("")}
      </ul>`
    : /* HTML */ `<div class="empty">
        <h2>
          ${instruments.length ? "No matching instruments" : "Start your instrument catalog"}
        </h2>
        <p>
          ${instruments.length ? "Try another search or adjust your filters." : "Add an instrument here or while editing an album."}
        </p>
        ${instruments.length ? '<button type="button" class="button secondary" data-action="clear-instrument-filters">Clear filters</button>' : ""}
      </div>`;
}

export function renderInstrumentDetail(item: Instrument, albums: Album[]) {
  const used = albumsUsing(albums, item.id);
  return /* HTML */ `<section
    class="instrument-page"
    aria-labelledby="page-title"
  >
    <a class="back-link" href="#instruments"
      >${icon("back", 17)} Back to instruments</a
    >
    <div class="instrument-page-heading">
      <div>
        <div class="catalog-detail-summary">
          ${catalogImage(item.name, item.imageUrl, false, item.categories)}${catalogSummary(used, false)}
        </div>
        <h1 id="page-title">${escapeHtml(item.name)}</h1>
        <div class="tags">
          ${item.categories.length ? chips(item.categories.map(categoryLabel)) : '<span class="muted">Uncategorized</span>'}
        </div>
      </div>
      <button
        type="button"
        class="button secondary"
        data-action="edit-catalog-instrument"
      >
        ${icon("edit", 16)} Edit instrument
      </button>
    </div>
    <section
      class="instrument-albums"
      aria-labelledby="instrument-albums-title"
    >
      <div class="detail-heading">
        <h2 id="instrument-albums-title">Albums using this instrument</h2>
        <span class="count-pill">${used.length}</span>
      </div>
      ${used.length ? renderAlbumGrid(used) : '<div class="empty detail-empty"><h3>Not used on any albums</h3><p>This instrument stays in your catalog until you add it to an album or delete it.</p></div>'}
    </section>
    <div class="instrument-delete">
      <button
        type="button"
        class="button secondary danger"
        data-action="delete-catalog-instrument"
        ${used.length ? 'disabled aria-describedby="instrument-delete-help"' : ""}
      >
        Delete instrument
      </button>
      <p id="instrument-delete-help" class="muted">
        ${used.length ? "Remove this instrument from its albums before deleting it." : "Unused instruments can be deleted from your catalog."}
      </p>
    </div>
  </section>`;
}
