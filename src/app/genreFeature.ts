import { renderGenresView } from "../views/genresView";
import { createDialog } from "./dialog";
import { createEditorDrafts } from "./editorDrafts";
import type { LibraryData } from "../types/library";
import { field } from "../components/formFields";
import { makeId } from "./id";
import { ancestors, genreUrl, normalizeGenres } from "./genres";
import type { Genre, AlbumGenre } from "../types/albums";
import { icon } from "../components/icons";
import { escapeHtml } from "../components/html";
import { matches } from "./search";
import { focusForTyping } from "./device";

export function createGenreFeature(ops: {
  editor: HTMLDialogElement;
  showDialog: ReturnType<typeof createDialog>["showDialog"];
  beginDraft: ReturnType<typeof createEditorDrafts>["beginDraft"];
  main: HTMLElement;
  dialog: Pick<
    ReturnType<typeof createDialog>,
    "pickerPress" | "pickerRenderPending" | "updateSearchDropdowns"
  >;
  library: {
    readonly albums: LibraryData["albums"];
    genres: LibraryData["genres"];
  };
  formError: (message: string, input: HTMLInputElement) => void;

  finishCatalogSave: (message: string, destination: string) => Promise<void>;
  announce: (message: string) => void;
  renderRoute: (focus?: boolean) => void;
  updateCatalogFilters: (id: string) => void;
}) {
  let selectedGenres: AlbumGenre[] = [];
  let genreChoices: Genre[] = [];
  let genreQuery = "";
  let genreAlphabetical = false;
  let genreUnused = false;
  function openCatalogGenre(item?: Genre) {
    if (!ops.beginDraft({ kind: "genre", item })) return;
    ops.showDialog(
      item ? "Edit genre" : "Add genre",
      "GENRE CATALOG",
      /* HTML */ `<form
        id="catalog-genre-form"
        data-id="${escapeHtml(item?.id ?? "")}"
      >
        <div class="dialog-body">
          ${field("Genre name", "genreName", item?.name ?? "", { attributes: 'required maxlength="80"' })}<label
            class="field"
            ><span>Parent genre (optional)</span
            ><select name="parentGenreId">
              <option value="">No parent</option>
              ${ops.library.genres
                .filter(
                  (g) =>
                    g.id !== item?.id &&
                    !ancestors(g.id, ops.library.genres).some(
                      (p) => p.id === item?.id,
                    ),
                )
                .sort((a, b) => a.name.localeCompare(b.name))
                .map(
                  (g) =>
                    /* HTML */ `<option
                      value="${escapeHtml(g.id)}"
                      ${g.id === item?.parentGenreId ? "selected" : ""}
                    >
                      ${escapeHtml([...ancestors(g.id, ops.library.genres), g].map((p) => p.name).join(" › "))}
                    </option>`,
                )
                .join("")}
            </select></label
          >
          <p id="form-error" class="form-error" role="alert" hidden></p>
        </div>
        <div class="dialog-footer">
          <button type="button" class="button secondary" data-action="close">
            Cancel</button
          ><button class="button primary" type="submit">Save genre</button>
        </div>
      </form>`,
      '[name="genreName"]',
    );
  }

  function genrePicker(selected: AlbumGenre[]) {
    genreChoices = structuredClone(ops.library.genres);
    selectedGenres = normalizeGenres(
      selected.map((g) => ({
        ...g,
        id:
          ops.library.genres.find(
            (c) => c.name.toLowerCase() === g.name.toLowerCase(),
          )?.id ?? g.id,
      })),
      [
        ...genreChoices,
        ...selected.filter((g) => !genreChoices.some((c) => c.id === g.id)),
      ],
    );
    for (const g of selectedGenres)
      if (!genreChoices.some((c) => c.id === g.id))
        genreChoices.push({
          id: g.id,
          name: g.name,
          parentGenreId: g.parentGenreId,
        });
    return /* HTML */ `<div class="instrument-picker">
      <label class="field" for="genre-query"
        ><span>Genres <span class="muted">(optional)</span></span></label
      >
      <div id="genre-selected" aria-live="polite"></div>
      <div class="catalog-search">
        <input
          id="genre-query"
          type="search"
          maxlength="80"
          autocomplete="off"
          placeholder="Search or create a genre…"
          aria-controls="genre-results"
        />
        <div
          id="genre-results"
          class="instrument-results"
          aria-label="Available genres"
        ></div>
      </div>
    </div>`;
  }

  function updateGenres() {
    if (ops.dialog.pickerPress) {
      ops.dialog.pickerRenderPending = true;
      return;
    }
    const input = ops.editor.querySelector<HTMLInputElement>("#genre-query");
    if (!input) return;
    const query = input.value.trim();
    ops.editor.querySelector("#genre-selected")!.innerHTML = selectedGenres
      .map(
        (g) =>
          /* HTML */ `<div class="genre-credit-row">
            <strong>${escapeHtml(g.name)}</strong
            ><button
              type="button"
              class="icon-button"
              data-action="remove-genre"
              data-id="${escapeHtml(g.id)}"
              aria-label="Remove ${escapeHtml(g.name)}"
            >
              ${icon("close", 16)}
            </button>
          </div>`,
      )
      .join("");
    const choices = genreChoices
      .filter(
        (g) =>
          !selectedGenres.some((c) => c.id === g.id) &&
          matches(
            query,
            g.name,
            ...ancestors(g.id, genreChoices).map((p) => p.name),
          ),
      )
      .sort((a, b) => a.name.localeCompare(b.name));
    ops.editor.querySelector("#genre-results")!.innerHTML =
      choices
        .slice(0, 20)
        .map((g) => {
          const descendant = selectedGenres.find((c) =>
            ancestors(c.id, genreChoices).some((p) => p.id === g.id),
          );
          return /* HTML */ `<button
            type="button"
            class="button secondary compact"
            data-action="select-genre"
            data-id="${escapeHtml(g.id)}"
            ${descendant ? "disabled" : ""}
          >
            ${escapeHtml(g.name)}${
              descendant
                ? ` — Included through ${escapeHtml(descendant.name)}`
                : ancestors(g.id, genreChoices).length
                  ? ` (${ancestors(g.id, genreChoices)
                      .map((p) => escapeHtml(p.name))
                      .join(" › ")})`
                  : ""
            }
          </button>`;
        })
        .join("") +
      (!choices.length && !query
        ? /* HTML */ `<p class="form-hint">Type a name to create one.</p>`
        : "") +
      (choices.length > 20
        ? /* HTML */ `<p class="form-hint">Type to narrow the results.</p>`
        : "") +
      (query &&
      !genreChoices.some((g) => g.name.toLowerCase() === query.toLowerCase())
        ? /* HTML */ `<button
            type="button"
            class="button secondary compact"
            data-action="create-genre"
          >
            ${icon("plus", 14)} Create “${escapeHtml(query)}”
          </button>`
        : "");
  }

  function click(button: HTMLButtonElement) {
    switch (button.dataset.action) {
      case "new-catalog-genre":
        openCatalogGenre();
        break;
      case "edit-catalog-genre":
        openCatalogGenre(
          ops.library.genres.find((g) => genreUrl(g.id) === location.hash),
        );
        break;
      case "delete-catalog-genre": {
        const item = ops.library.genres.find(
          (g) => genreUrl(g.id) === location.hash,
        );
        if (
          !item ||
          ops.library.genres.some((g) => g.parentGenreId === item.id) ||
          ops.library.albums.some((a) => a.genres.some((g) => g.id === item.id))
        )
          break;
        ops.showDialog(
          "Delete genre?",
          "GENRE CATALOG",
          /* HTML */ `<div class="dialog-body">
              Delete ${escapeHtml(item.name)}?
            </div>
            <div class="dialog-footer">
              <button class="button secondary" data-action="close">
                Cancel</button
              ><button
                class="button primary danger"
                data-action="confirm-delete-genre"
                data-id="${escapeHtml(item.id)}"
              >
                Delete genre
              </button>
            </div>`,
          '[data-action="close"]',
        );
        break;
      }
      case "confirm-delete-genre":
        if (
          !ops.library.genres.some(
            (g) => g.parentGenreId === button.dataset.id,
          ) &&
          !ops.library.albums.some((a) =>
            a.genres.some((g) => g.id === button.dataset.id),
          )
        ) {
          ops.library.genres = ops.library.genres.filter(
            (g) => g.id !== button.dataset.id,
          );
          ops.finishCatalogSave("Genre deleted.", "#genres");
        }
        break;
      case "select-genre":
      case "create-genre": {
        const input =
          ops.editor.querySelector<HTMLInputElement>("#genre-query")!;
        let item = genreChoices.find((g) => g.id === button.dataset.id);
        if (button.dataset.action === "create-genre") {
          const name = input.value.trim();
          if (!name) break;
          item = genreChoices.find(
            (g) => g.name.toLowerCase() === name.toLowerCase(),
          );
          if (!item) {
            item = { id: makeId(), name, parentGenreId: null };
            genreChoices.push(item);
          }
        }
        if (
          !item ||
          selectedGenres.some(
            (g) =>
              g.id === item.id ||
              ancestors(g.id, genreChoices).some((p) => p.id === item!.id),
          )
        )
          break;
        const replaced = selectedGenres.filter((g) =>
          ancestors(item!.id, genreChoices).some((p) => p.id === g.id),
        );
        selectedGenres = normalizeGenres(
          [...selectedGenres, { ...item, isPrimary: false }],
          genreChoices,
        );
        if (replaced.length)
          ops.announce(
            `${replaced.map((g) => g.name).join(", ")} replaced by ${item.name}.`,
          );
        input.value = "";
        updateGenres();
        focusForTyping(input);
        ops.dialog.updateSearchDropdowns(null);
        break;
      }
      case "remove-genre":
        selectedGenres = selectedGenres.filter(
          (g) => g.id !== button.dataset.id,
        );
        updateGenres();
        break;
      default:
        return false;
    }
    return true;
  }

  function submit(form: HTMLFormElement) {
    const data = new FormData(form);
    const input = form.querySelector<HTMLInputElement>('[name="genreName"]')!;
    const name = input.value.trim();
    const id = form.dataset.id || makeId();
    const parentGenreId = String(data.get("parentGenreId") || "") || null;
    if (
      !name ||
      ops.library.genres.some(
        (g) => g.id !== id && g.name.toLowerCase() === name.toLowerCase(),
      )
    )
      return ops.formError("Enter a unique genre name.", input);
    if (
      parentGenreId &&
      (parentGenreId === id ||
        ancestors(parentGenreId, ops.library.genres).some((g) => g.id === id))
    )
      return ops.formError(
        "Choose a parent that does not create a cycle.",
        input,
      );
    const next = ops.library.genres
      .filter((g) => g.id !== id)
      .concat({ id, name, parentGenreId });
    const affected = ops.library.albums.filter(
      (a) => normalizeGenres(a.genres, next).length < a.genres.length,
    );
    const apply = () => {
      ops.library.genres = next;
      ops.finishCatalogSave("Genre saved.", genreUrl(id));
    };
    if (affected.length) {
      ops.showDialog(
        "Review genre changes",
        "GENRE CATALOG",
        /* HTML */ `<div class="dialog-body">
            <p>
              This change removes redundant parent assignments from these
              albums, keeping their more specific genres:
            </p>
            <ul>
              ${affected.map((a) => /* HTML */ `<li>${escapeHtml(a.title)}</li>`).join("")}
            </ul>
          </div>
          <div class="dialog-footer">
            <button class="button secondary" data-action="close">Cancel</button
            ><button class="button primary" id="apply-genre-change">
              Apply changes
            </button>
          </div>`,
        "#apply-genre-change",
      );
      ops.editor
        .querySelector("#apply-genre-change")!
        .addEventListener("click", apply);
    } else apply();
  }

  function input(input: HTMLInputElement) {
    if (input.id === "genre-query") updateGenres();
    if (input.id === "genres-search") {
      genreQuery = input.value;
      const start = input.selectionStart;
      ops.renderRoute();
      const next = ops.main.querySelector<HTMLInputElement>("#genres-search")!;
      next.focus();
      next.setSelectionRange(start, start);
    }
  }
  function change(input: HTMLInputElement) {
    if (input.id === "genres-alphabetical") {
      genreAlphabetical = input.checked;
      ops.updateCatalogFilters(input.id);
    }
    if (input.id === "genres-unused") {
      genreUnused = input.checked;
      ops.updateCatalogFilters(input.id);
    }
  }

  function renderList(root: HTMLElement) {
    root.innerHTML = renderGenresView(
      ops.library.genres,
      ops.library.albums,
      genreQuery,
      genreAlphabetical,
      genreUnused,
    );
  }
  return {
    renderList,
    input,
    change,
    openCatalogGenre,
    genrePicker,
    updateGenres,
    submit,
    click,
    state: {
      get selectedGenres() {
        return selectedGenres;
      },
      set selectedGenres(value: typeof selectedGenres) {
        selectedGenres = value;
      },
      get genreChoices() {
        return genreChoices;
      },
      set genreChoices(value: typeof genreChoices) {
        genreChoices = value;
      },
    },
  };
}
