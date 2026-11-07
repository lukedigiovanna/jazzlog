import { icon } from "./icons";
import { escapeHtml } from "./html";
export function renderLayoutToggle(
  layout: string,
  label = "Library layout",
  action = "layout",
) {
  return /* HTML */ `<div
    class="layout-toggle"
    aria-label="${escapeHtml(label)}"
  >
    <button
      type="button"
      class="icon-button"
      aria-label="Grid view"
      aria-pressed="${layout === "grid"}"
      data-action="${escapeHtml(action)}"
      data-layout="grid"
    >
      ${icon("grid")}
    </button>
    <button
      type="button"
      class="icon-button"
      aria-label="List view"
      aria-pressed="${layout === "list"}"
      data-action="${escapeHtml(action)}"
      data-layout="list"
    >
      ${icon("list")}
    </button>
  </div>`;
}
