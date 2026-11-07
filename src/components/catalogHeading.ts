import { icon } from "./icons";

export function renderCatalogHeading(
  title: string,
  item: "artist" | "instrument" | "genre",
) {
  const label = `Add ${item}`;
  return `<div class="instrument-page-heading catalog-heading"><h1 id="page-title">${title}</h1><button type="button" class="button primary catalog-add" data-action="new-catalog-${item}" aria-label="${label}" title="${label}">${icon("plus", 17)}<span class="catalog-add-label">${label}</span></button></div>`;
}
