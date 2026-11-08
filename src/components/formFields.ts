import { escapeHtml } from "./html.ts";
import { icon } from "./icons.ts";
import { catalogImage } from "./catalogSummary.ts";
import type { AlbumLink, InstrumentCategory } from "../types/albums";

// Labels, placeholders, and attributes are trusted application markup.
// User-entered field values are escaped before insertion.
export function field(
  label: string,
  name: string,
  value: unknown = "",
  options: {
    type?: string;
    attributes?: string;
    placeholder?: string;
    help?: string;
  } = {},
) {
  const {
    type = "text",
    attributes = "",
    placeholder = "",
    help = "",
  } = options;
  return /* HTML */ `<label class="field"
    ><span>${label}</span
    ><input
      name="${name}"
      type="${type}"
      value="${escapeHtml(value)}"
      placeholder="${placeholder}"
      ${attributes}
    />${help ? /* HTML */ `<small>${help}</small>` : ""}</label
  >`;
}

export function linkRow(link: Partial<AlbumLink> = {}) {
  return /* HTML */ `<div class="link-fields">
    ${field("URL", "linkUrl", link.url, { type: "url", placeholder: "https://…", attributes: 'maxlength="2000"' })}
    ${field("Label", "linkLabel", link.label, { placeholder: "Optional", attributes: 'maxlength="60"' })}
    <button
      class="icon-button remove-link"
      type="button"
      aria-label="Remove music link"
      data-action="remove-link"
    >
      ${icon("close", 17)}
    </button>
  </div>`;
}

export function catalogImageField(
  label: string,
  name: string,
  url?: string | null,
  artist = false,
  categories: InstrumentCategory[] = [],
) {
  return /* HTML */ `<div
    class="catalog-image-editor"
    data-artist="${artist}"
    data-name="${escapeHtml(name)}"
  >
    ${field(label, "catalogImage", url, { type: "url", placeholder: "https://…", attributes: 'maxlength="2000"' })}
    <div class="catalog-image-preview">
      ${catalogImage(name, url, artist, categories)}
    </div>
  </div>`;
}
