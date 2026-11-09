import { escapeHtml } from "./html.ts";
import { icon } from "./icons.ts";
import { cover } from "./presentation.ts";
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
  fieldName = "catalogImage",
) {
  return /* HTML */ `<div
    class="catalog-image-editor"
    data-artist="${artist}"
    data-name="${escapeHtml(name)}"
    data-image-field="${escapeHtml(fieldName)}"
  >
    ${field(label, fieldName, url, { type: "url", placeholder: "https://…", attributes: 'maxlength="2000"' })}
    <div class="catalog-image-preview">
      ${fieldName === "artwork" ? cover({ artworkUrl: url }) : catalogImage(name, url, artist, categories)}
    </div>
  </div>`;
}

export function updateCatalogImage(input: HTMLInputElement) {
  const form = input.closest("form")!;
  const container = form.querySelector<HTMLElement>(".catalog-image-editor")!;
  const url = container.querySelector<HTMLInputElement>("input")!.value;
  container.querySelector(".catalog-image-preview")!.innerHTML =
    container.dataset.imageField === "artwork"
      ? cover({ artworkUrl: url })
      : catalogImage(
          container.dataset.name ?? "",
          url,
          container.dataset.artist === "true",
          [
            ...form.querySelectorAll<HTMLInputElement>(
              '[name="category"]:checked',
            ),
          ].map((input) => input.value as InstrumentCategory),
        );
}
