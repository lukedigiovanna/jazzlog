import { renderInstrumentsView } from "../views/instrumentsView";
import { updateCatalogImage } from "../components/formFields";
import { createDialog } from "./dialog";
import { createEditorDrafts } from "./editorDrafts";

import type { LibraryData } from "../types/library";
import { field, catalogImageField } from "../components/formFields";
import { makeId } from "./id";
import type {
  Album,
  AlbumInstrument,
  Instrument,
  InstrumentCategory,
} from "../types/albums";
import { icon } from "../components/icons";
import { escapeHtml } from "../components/html";
import { webUrl } from "../components/presentation";
import {
  albumsUsing,
  instrumentUrl,
  instrumentCategories,
} from "./instruments";
import {
  categoryFields,
  updateInstrumentsView,
} from "../views/instrumentsView";
import { focusForTyping } from "./device";

export function createInstrumentFeature(ops: {
  editor: HTMLDialogElement;
  showDialog: ReturnType<typeof createDialog>["showDialog"];
  beginDraft: ReturnType<typeof createEditorDrafts>["beginDraft"];

  library: {
    readonly albums: LibraryData["albums"];
    instruments: LibraryData["instruments"];
  };
  formError: (message: string, input: HTMLInputElement) => void;
  finishSave: (id: string, message: string) => Promise<void>;
  finishCatalogSave: (message: string, destination: string) => Promise<void>;
  renderRoute: (focus?: boolean) => void;
  updateCatalogFilters: (id: string) => void;
}) {
  let selectedInstruments: AlbumInstrument[] = [];
  let instrumentChoices: AlbumInstrument[] = [];
  let instrumentFilters = {
    query: "",
    category: "",
    unused: false,
    sort: "updated",
  };
  function openCatalogInstrument(item?: Instrument) {
    if (!ops.beginDraft({ kind: "instrument", item })) return;
    ops.showDialog(
      item ? "Edit instrument" : "Add instrument",
      "YOUR INSTRUMENT CATALOG",
      /* HTML */ `<form
        id="catalog-instrument-form"
        data-id="${escapeHtml(item?.id ?? "")}"
      >
        <div class="dialog-body">
          ${field("Instrument name", "instrumentName", item?.name ?? "", { attributes: 'required maxlength="80"', placeholder: "e.g. Vibraphone" })}
          ${catalogImageField("Image URL", item?.name ?? "Instrument", item?.imageUrl, false, item?.categories)}
          ${categoryFields(item?.categories)}
          <p class="form-hint">
            Name and category changes apply everywhere this instrument is used.
          </p>
          <p id="form-error" class="form-error" role="alert" hidden></p>
        </div>
        <div class="dialog-footer">
          <button type="button" class="button secondary" data-action="close">
            Cancel</button
          ><button type="submit" class="button primary">
            ${item ? "Save changes" : "Add instrument"}
          </button>
        </div>
      </form>`,
      '[name="instrumentName"]',
    );
  }

  function instrumentPicker(items: AlbumInstrument[]) {
    selectedInstruments = structuredClone(items);
    instrumentChoices = ops.library.instruments.map((item) => ({
      ...structuredClone(item),
      notes: null,
    }));
    return /* HTML */ `<div class="instrument-picker">
      <label class="field" for="instrument-query"
        ><span>Instruments <span class="muted">(optional)</span></span></label
      >
      <div id="instrument-selected" class="tags" aria-live="polite"></div>
      <input
        id="instrument-query"
        type="search"
        maxlength="80"
        autocomplete="off"
        placeholder="Search or create an instrument…"
      />
      <div
        id="instrument-results"
        class="instrument-results"
        aria-label="Available instruments"
      ></div>
      <div id="instrument-create" class="inline-instrument-create" hidden>
        ${categoryFields([], "inline-category")}
        <button
          type="button"
          class="button secondary compact"
          data-action="create-instrument"
        ></button>
      </div>
    </div>`;
  }

  function updateInstruments() {
    const input =
      ops.editor.querySelector<HTMLInputElement>("#instrument-query");
    if (!input) return;
    const query = input.value.trim();
    ops.editor.querySelector("#instrument-selected")!.innerHTML =
      selectedInstruments
        .map(
          (item) =>
            /* HTML */ `<button
              type="button"
              class="instrument-chip"
              data-action="remove-instrument"
              data-id="${escapeHtml(item.id)}"
              aria-label="Remove ${escapeHtml(item.name)}"
            >
              ${escapeHtml(item.name)} ${icon("close", 14)}
            </button>`,
        )
        .join("");
    const create = ops.editor.querySelector<HTMLElement>("#instrument-create")!;
    create.hidden =
      !query ||
      instrumentChoices.some(
        (item) => item.name.toLowerCase() === query.toLowerCase(),
      );
    create.querySelector("button")!.textContent = `Create “${query}”`;
    const usage = new Map<string, number>();
    for (const album of ops.library.albums)
      for (const id of new Set(album.instruments.map((item) => item.id)))
        usage.set(id, (usage.get(id) ?? 0) + 1);
    const choices = instrumentChoices
      .filter(
        (item) =>
          !selectedInstruments.some((selected) => selected.id === item.id) &&
          item.name.toLowerCase().includes(query.toLowerCase()),
      )
      .sort(
        (a, b) =>
          (usage.get(b.id) ?? 0) - (usage.get(a.id) ?? 0) ||
          a.name.localeCompare(b.name),
      );
    ops.editor.querySelector("#instrument-results")!.innerHTML =
      choices
        .map(
          (item) =>
            /* HTML */ `<button
              type="button"
              class="button secondary compact"
              data-action="select-instrument"
              data-id="${escapeHtml(item.id)}"
            >
              ${icon("plus", 14)} ${escapeHtml(item.name)}
            </button>`,
        )
        .join("") +
      (!choices.length && !query
        ? '<p class="form-hint">Search for an instrument name to add one.</p>'
        : "");
  }

  function openInstruments(album: Album) {
    if (!ops.beginDraft({ kind: "instruments", item: album })) return;
    ops.showDialog(
      "Edit instruments",
      "ALBUM INSTRUMENTATION",
      /* HTML */ `<form id="instruments-form" data-id="${escapeHtml(album.id)}">
        <div class="dialog-body">
          <p class="dialog-intro">${escapeHtml(album.title)}</p>
          ${instrumentPicker(album.instruments)}
        </div>
        <div class="dialog-footer">
          <button type="button" class="button secondary" data-action="close">
            Cancel</button
          ><button type="submit" class="button primary">
            Save instruments
          </button>
        </div>
      </form>`,
      "#instrument-query",
    );
    updateInstruments();
  }

  function updateInstrumentList() {
    updateInstrumentsView(
      ops.library.instruments,
      ops.library.albums,
      instrumentFilters,
    );
  }

  function commitInstrumentChoices() {
    ops.library.instruments = instrumentChoices.map(
      ({ id, name, categories, imageUrl }) => ({
        imageUrl,
        id,
        name,
        categories,
      }),
    );
  }

  function saveCatalogInstrument(form: HTMLFormElement) {
    const input = form.querySelector<HTMLInputElement>(
      '[name="instrumentName"]',
    )!;
    const name = input.value.trim();
    if (!name) return ops.formError("Enter an instrument name.", input);
    if (
      ops.library.instruments.some(
        (item) =>
          item.id !== form.dataset.id &&
          item.name.toLowerCase() === name.toLowerCase(),
      )
    )
      return ops.formError(
        "An instrument with this name already exists.",
        input,
      );
    const data = new FormData(form);
    const imageUrl = String(data.get("catalogImage") ?? "").trim();
    if (imageUrl && !webUrl(imageUrl))
      return ops.formError(
        "Enter an HTTP or HTTPS image URL.",
        form.querySelector('[name="catalogImage"]')!,
      );
    const item: Instrument = {
      imageUrl: imageUrl || null,
      id: form.dataset.id || makeId(),
      name,
      categories: data
        .getAll("category")
        .filter((category): category is InstrumentCategory =>
          instrumentCategories.some((value) => value === category),
        ),
    };
    ops.library.instruments = ops.library.instruments
      .filter((existing) => existing.id !== item.id)
      .concat(item);
    ops.finishCatalogSave("Instrument saved.", instrumentUrl(item.id));
  }

  function click(button: HTMLButtonElement, album?: Album) {
    switch (button.dataset.action) {
      case "new-catalog-instrument":
        openCatalogInstrument();
        break;
      case "edit-catalog-instrument": {
        const item = ops.library.instruments.find(
          (item) => instrumentUrl(item.id) === location.hash,
        );
        if (item) openCatalogInstrument(item);
        break;
      }
      case "delete-catalog-instrument": {
        const item = ops.library.instruments.find(
          (item) => instrumentUrl(item.id) === location.hash,
        );
        if (!item || albumsUsing(ops.library.albums, item.id).length) break;
        ops.showDialog(
          "Delete instrument?",
          "YOUR INSTRUMENT CATALOG",
          /* HTML */ `<div class="dialog-body">
              <p>
                Delete <strong>${escapeHtml(item.name)}</strong> from your
                catalog? It is not used on any albums.
              </p>
            </div>
            <div class="dialog-footer">
              <button
                type="button"
                class="button secondary"
                data-action="close"
              >
                Cancel</button
              ><button
                type="button"
                class="button primary danger"
                data-action="confirm-delete-instrument"
                data-id="${escapeHtml(item.id)}"
              >
                Delete instrument
              </button>
            </div>`,
          '[data-action="close"]',
        );
        break;
      }
      case "confirm-delete-instrument": {
        const item = ops.library.instruments.find(
          (item) => item.id === button.dataset.id,
        );
        if (!item || albumsUsing(ops.library.albums, item.id).length) break;
        ops.library.instruments = ops.library.instruments.filter(
          (existing) => existing.id !== item.id,
        );
        ops.finishCatalogSave("Instrument deleted.", "#instruments");
        break;
      }
      case "clear-instrument-filters":
        instrumentFilters.query = "";
        instrumentFilters.category = "";
        instrumentFilters.unused = false;
        ops.renderRoute();
        break;
      case "edit-instruments":
        if (album) openInstruments(album);
        break;
      case "select-instrument": {
        const item = instrumentChoices.find(
          (item) => item.id === button.dataset.id,
        );
        if (
          item &&
          !selectedInstruments.some((selected) => selected.id === item.id)
        )
          selectedInstruments.push({ ...item, notes: null });
        ops.editor.querySelector<HTMLInputElement>("#instrument-query")!.value =
          "";
        updateInstruments();
        focusForTyping(
          ops.editor.querySelector<HTMLElement>("#instrument-query"),
        );
        break;
      }
      case "create-instrument": {
        const input =
          ops.editor.querySelector<HTMLInputElement>("#instrument-query")!;
        const name = input.value.trim();
        if (!name) break;
        const categories = [
          ...ops.editor.querySelectorAll<HTMLInputElement>(
            '[name="inline-category"]:checked',
          ),
        ].map((input) => input.value as InstrumentCategory);
        const item = { id: makeId(), name, notes: null, categories };
        for (const input of ops.editor.querySelectorAll<HTMLInputElement>(
          '[name="inline-category"]',
        ))
          input.checked = false;
        instrumentChoices.push(item);
        selectedInstruments.push(item);
        input.value = "";
        updateInstruments();
        focusForTyping(input);
        break;
      }
      case "remove-instrument":
        selectedInstruments = selectedInstruments.filter(
          (item) => item.id !== button.dataset.id,
        );
        updateInstruments();
        focusForTyping(
          ops.editor.querySelector<HTMLElement>("#instrument-query"),
        );
        break;
      default:
        return false;
    }
    return true;
  }

  function saveInstruments(form: HTMLFormElement) {
    const album = ops.library.albums.find(
      (item) => item.id === form.dataset.id,
    );
    if (album) {
      commitInstrumentChoices();
      album.instruments = structuredClone(selectedInstruments);
      album.updatedAt = new Date().toISOString();
      ops.finishSave(album.id, "Album instruments updated.");
    }
  }

  function submit(form: HTMLFormElement) {
    if (form.id === "instruments-form") saveInstruments(form);
    else saveCatalogInstrument(form);
  }

  function input(input: HTMLInputElement) {
    if (
      input.closest("#catalog-instrument-form") &&
      (input.name === "catalogImage" || input.name === "category")
    )
      updateCatalogImage(input);
    if (input.id === "instruments-search") {
      instrumentFilters.query = input.value;
      updateInstrumentList();
    }

    if (input.id === "instrument-query") updateInstruments();
  }
  function change(input: HTMLInputElement) {
    if (input.id === "instruments-sort") {
      instrumentFilters.sort = input.value;
      updateInstrumentList();
    }

    if (input.id === "instrument-category-filter") {
      instrumentFilters.category = input.value;
      ops.updateCatalogFilters(input.id);
    }
    if (input.id === "instruments-unused") {
      instrumentFilters.unused = input.checked;
      ops.updateCatalogFilters(input.id);
    }
  }

  function renderList(root: HTMLElement) {
    root.innerHTML = renderInstrumentsView(instrumentFilters);
    updateInstrumentsView(
      ops.library.instruments,
      ops.library.albums,
      instrumentFilters,
      root,
    );
  }
  return {
    renderList,
    input,
    change,
    openCatalogInstrument,
    instrumentPicker,
    updateInstruments,
    openInstruments,
    commitInstrumentChoices,
    submit,
    click,
    state: {
      get selectedInstruments() {
        return selectedInstruments;
      },
      set selectedInstruments(value: typeof selectedInstruments) {
        selectedInstruments = value;
      },
      get instrumentChoices() {
        return instrumentChoices;
      },
      set instrumentChoices(value: typeof instrumentChoices) {
        instrumentChoices = value;
      },
    },
  };
}
