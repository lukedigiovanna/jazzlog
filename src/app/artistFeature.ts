import { renderArtistsView } from "../views/artistsView";
import { updateCatalogImage } from "../components/formFields";
import { createDialog } from "./dialog";
import { createEditorDrafts } from "./editorDrafts";

import type { LibraryData } from "../types/library";
import { field, catalogImageField } from "../components/formFields";
import { formValue } from "./formValues";
import { findArtist } from "./artistIdentity";
import { makeId } from "./id";
import {
  artistUrl,
  artistAlbums,
  artistRoles,
  roleLabel,
  updateArtistsView,
} from "../views/artistsView";
import type { Artist, AlbumArtist, ArtistRole } from "../types/albums";
import { icon } from "../components/icons";
import { escapeHtml } from "../components/html";
import { webUrl } from "../components/presentation";
import { matches } from "./search";
import { focusForTyping } from "./device";

export function createArtistFeature(ops: {
  editor: HTMLDialogElement;
  showDialog: ReturnType<typeof createDialog>["showDialog"];
  beginDraft: ReturnType<typeof createEditorDrafts>["beginDraft"];

  dialog: Pick<
    ReturnType<typeof createDialog>,
    "pickerPress" | "pickerRenderPending" | "updateSearchDropdowns"
  >;
  library: {
    readonly albums: LibraryData["albums"];
    artists: LibraryData["artists"];
  };
  formError: (message: string, input: HTMLInputElement) => void;

  finishCatalogSave: (message: string, destination: string) => Promise<void>;
  renderRoute: (focus?: boolean) => void;
  updateCatalogFilters: (id: string) => void;
}) {
  let selectedArtists: AlbumArtist[] = [];
  let artistChoices: Artist[] = [];
  let artistQuery = "";
  let artistUnused = false;
  let artistSort = "albums";
  let artistPrimary = false;
  function openCatalogArtist(item?: Artist) {
    if (!ops.beginDraft({ kind: "artist", item })) return;
    ops.showDialog(
      item ? "Edit artist" : "Add artist",
      "YOUR ARTIST CATALOG",
      /* HTML */ `<form
        id="catalog-artist-form"
        data-id="${escapeHtml(item?.id ?? "")}"
      >
        <div class="dialog-body">
          ${field("Artist name", "artistName", item?.name, { attributes: 'required maxlength="150"', placeholder: "e.g. Miles Davis" })}
          ${catalogImageField("Photo URL", item?.name ?? "Artist", item?.photoUrl, true)}
          ${field("Sort name", "sortName", item?.sortName, { attributes: 'maxlength="150"', placeholder: "e.g. Davis, Miles" })}
          ${field("Country code", "country", item?.country, { attributes: 'maxlength="2" pattern="[A-Za-z]{2}"', placeholder: "e.g. US" })}
          ${field("MusicBrainz artist ID", "artistMbid", item?.musicbrainzId, { attributes: 'maxlength="36"', placeholder: "Optional artist ID" })}
          <p class="form-hint">
            Artist details apply everywhere this artist is credited. Choose
            their role separately on each album.
          </p>
          <p id="form-error" class="form-error" role="alert" hidden></p>
        </div>
        <div class="dialog-footer">
          <button type="button" class="button secondary" data-action="close">
            Cancel</button
          ><button class="button primary" type="submit">Save artist</button>
        </div>
      </form>`,
      '[name="artistName"]',
    );
  }

  function artistPicker(credits: AlbumArtist[]) {
    artistChoices = structuredClone(ops.library.artists);
    selectedArtists = credits.map((credit) => {
      const existing = findArtist(artistChoices, credit);
      if (!existing) {
        const { role, position, ...artist } = credit;
        artistChoices.push(artist);
      }
      return { ...credit, ...(existing ?? {}) };
    });
    return /* HTML */ `<div class="instrument-picker">
      <label class="field" for="artist-query"
        ><span>Artists <span class="muted">(optional)</span></span></label
      >
      <div id="artist-selected"></div>
      <div class="catalog-search">
        <input
          id="artist-query"
          type="search"
          maxlength="150"
          autocomplete="off"
          placeholder="Search or create an artist…"
          aria-controls="artist-results"
        />
        <div
          id="artist-results"
          class="instrument-results"
          aria-label="Available artists"
        ></div>
      </div>
    </div>`;
  }

  function updateArtists() {
    if (ops.dialog.pickerPress) {
      ops.dialog.pickerRenderPending = true;
      return;
    }
    const input = ops.editor.querySelector<HTMLInputElement>("#artist-query");
    if (!input) return;
    const query = input.value.trim();
    ops.editor.querySelector("#artist-selected")!.innerHTML = selectedArtists
      .map(
        (item, index) =>
          /* HTML */ `<div class="artist-credit-row">
            <strong>${escapeHtml(item.name)}</strong
            ><label class="field"
              ><span class="sr-only">Role for ${escapeHtml(item.name)}</span
              ><select data-artist-role="${escapeHtml(item.id)}">
                ${artistRoles.map((role) => /* HTML */ `<option value="${role}" ${item.role === role ? "selected" : ""}>${roleLabel(role)}</option>`).join("")}
              </select></label
            ><button
              type="button"
              class="icon-button"
              data-action="move-artist"
              data-id="${escapeHtml(item.id)}"
              aria-label="Move ${escapeHtml(item.name)} earlier"
              ${index === 0 ? "disabled" : ""}
            >
              ↑</button
            ><button
              type="button"
              class="icon-button"
              data-action="remove-artist"
              data-id="${escapeHtml(item.id)}"
              aria-label="Remove ${escapeHtml(item.name)}"
            >
              ${icon("close", 16)}
            </button>
          </div>`,
      )
      .join("");
    const choices = artistChoices
      .filter(
        (item) =>
          !selectedArtists.some((credit) => credit.id === item.id) &&
          matches(query, item.name, item.sortName ?? ""),
      )
      .sort((a, b) =>
        (a.sortName || a.name).localeCompare(b.sortName || b.name),
      );
    ops.editor.querySelector("#artist-results")!.innerHTML =
      choices
        .slice(0, 20)
        .map(
          (item) =>
            /* HTML */ `<button
              type="button"
              class="button secondary compact"
              data-action="select-artist"
              data-id="${escapeHtml(item.id)}"
            >
              ${escapeHtml(item.name)}
            </button>`,
        )
        .join("") +
      (!choices.length && !query
        ? /* HTML */ `<p class="form-hint">Type a name to create one.</p>`
        : "") +
      (choices.length > 20
        ? /* HTML */ `<p class="form-hint">Type to narrow the results.</p>`
        : "") +
      (query &&
      !artistChoices.some(
        (item) => item.name.toLowerCase() === query.toLowerCase(),
      )
        ? /* HTML */ `<button
            type="button"
            class="button secondary compact"
            data-action="create-artist"
          >
            ${icon("plus", 14)} Create “${escapeHtml(query)}”
          </button>`
        : "");
  }

  function updateArtistList() {
    updateArtistsView(
      ops.library.artists,
      ops.library.albums,
      artistQuery,
      artistUnused,
      document,
      artistSort,
      artistPrimary,
    );
  }

  function click(button: HTMLButtonElement) {
    switch (button.dataset.action) {
      case "new-catalog-artist":
        openCatalogArtist();
        break;
      case "edit-catalog-artist":
        openCatalogArtist(
          ops.library.artists.find(
            (item) => artistUrl(item.id) === location.hash,
          ),
        );
        break;
      case "delete-catalog-artist": {
        const item = ops.library.artists.find(
          (item) => artistUrl(item.id) === location.hash,
        );
        if (!item || artistAlbums(ops.library.albums, item.id).length) break;
        ops.showDialog(
          "Delete artist?",
          "YOUR ARTIST CATALOG",
          /* HTML */ `<div class="dialog-body">
              <p>Delete ${escapeHtml(item.name)} from your catalog?</p>
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
                data-action="confirm-delete-artist"
                data-id="${escapeHtml(item.id)}"
              >
                Delete artist
              </button>
            </div>`,
          '[data-action="close"]',
        );
        break;
      }
      case "confirm-delete-artist":
        if (!artistAlbums(ops.library.albums, button.dataset.id!).length) {
          ops.library.artists = ops.library.artists.filter(
            (item) => item.id !== button.dataset.id,
          );
          ops.finishCatalogSave("Artist deleted.", "#artists");
        }
        break;
      case "clear-artist-filters":
        artistPrimary = false;
        artistQuery = "";
        artistUnused = false;
        ops.renderRoute();
        break;
      case "create-artist":
      case "select-artist": {
        const input =
          ops.editor.querySelector<HTMLInputElement>("#artist-query")!;
        let item = artistChoices.find((item) => item.id === button.dataset.id);
        if (button.dataset.action === "create-artist") {
          const name = input.value.trim();
          if (
            !name ||
            artistChoices.some(
              (item) => item.name.toLowerCase() === name.toLowerCase(),
            )
          )
            break;
          item = {
            id: makeId(),
            name,
            sortName: null,
            country: null,
            musicbrainzId: null,
          };
          artistChoices.push(item);
        }
        if (item && !selectedArtists.some((credit) => credit.id === item.id))
          selectedArtists.push({
            ...item,
            role: "primary",
            position: selectedArtists.length,
          });
        input.value = "";
        updateArtists();
        focusForTyping(input);
        ops.dialog.updateSearchDropdowns(null);
        break;
      }
      case "remove-artist":
        selectedArtists = selectedArtists.filter(
          (item) => item.id !== button.dataset.id,
        );
        updateArtists();
        focusForTyping(ops.editor.querySelector("#artist-query"));
        break;
      case "move-artist": {
        const index = selectedArtists.findIndex(
          (item) => item.id === button.dataset.id,
        );
        if (index > 0)
          [selectedArtists[index - 1], selectedArtists[index]] = [
            selectedArtists[index],
            selectedArtists[index - 1],
          ];
        updateArtists();
        ops.editor
          .querySelector<HTMLElement>(
            `[data-action="move-artist"][data-id="${button.dataset.id}"]`,
          )
          ?.focus();
        break;
      }

      default:
        return false;
    }
    return true;
  }

  function submit(form: HTMLFormElement) {
    const data = new FormData(form);
    const value = (key: string) => formValue(data, key);
    const input = form.querySelector<HTMLInputElement>('[name="artistName"]')!;
    const name = value("artistName");
    if (!name) return ops.formError("Enter an artist name.", input);
    if (
      ops.library.artists.some(
        (item) =>
          item.id !== form.dataset.id &&
          item.name.toLowerCase() === name.toLowerCase(),
      )
    )
      return ops.formError("An artist with this name already exists.", input);
    const musicbrainzId = value("artistMbid") || null;
    if (
      musicbrainzId &&
      !/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(musicbrainzId)
    )
      return ops.formError(
        "Enter a valid MusicBrainz artist ID.",
        form.querySelector('[name="artistMbid"]')!,
      );
    if (
      musicbrainzId &&
      ops.library.artists.some(
        (item) =>
          item.id !== form.dataset.id &&
          item.musicbrainzId?.toLowerCase() === musicbrainzId.toLowerCase(),
      )
    )
      return ops.formError(
        "This MusicBrainz artist is already in your catalog.",
        input,
      );
    if (value("catalogImage") && !webUrl(value("catalogImage")))
      return ops.formError(
        "Enter an HTTP or HTTPS photo URL.",
        form.querySelector('[name="catalogImage"]')!,
      );
    const item: Artist = {
      id: form.dataset.id || makeId(),
      name,
      photoUrl: value("catalogImage") || null,
      sortName: value("sortName") || null,
      country: value("country").toUpperCase() || null,
      musicbrainzId,
    };
    ops.library.artists = ops.library.artists
      .filter((existing) => existing.id !== item.id)
      .concat(item);
    ops.finishCatalogSave("Artist saved.", artistUrl(item.id));
  }

  function input(input: HTMLInputElement) {
    if (input.closest("#catalog-artist-form") && input.name === "catalogImage")
      updateCatalogImage(input);
    if (input.id === "artists-search") {
      artistQuery = input.value;
      updateArtistList();
    }
    if (input.id === "artist-query") updateArtists();
  }
  function change(input: HTMLInputElement) {
    if (input.id === "artists-sort") {
      artistSort = input.value;
      updateArtistList();
    }
    if (input.id === "artists-primary") {
      artistPrimary = input.checked;
      ops.updateCatalogFilters(input.id);
    }
    if (input.id === "artists-unused") {
      artistUnused = input.checked;
      ops.updateCatalogFilters(input.id);
    }
    if (
      input.dataset.artistRole &&
      artistRoles.some((role) => role === input.value)
    ) {
      const credit = selectedArtists.find(
        (item) => item.id === input.dataset.artistRole,
      );
      if (credit) credit.role = input.value as ArtistRole;
    }
  }

  function renderList(root: HTMLElement) {
    root.innerHTML = renderArtistsView(
      artistQuery,
      artistUnused,
      artistSort,
      artistPrimary,
    );
    updateArtistsView(
      ops.library.artists,
      ops.library.albums,
      artistQuery,
      artistUnused,
      root,
      artistSort,
      artistPrimary,
    );
  }
  return {
    renderList,
    input,
    change,
    openCatalogArtist,
    artistPicker,
    updateArtists,
    submit,
    click,
    state: {
      get selectedArtists() {
        return selectedArtists;
      },
      set selectedArtists(value: typeof selectedArtists) {
        selectedArtists = value;
      },
      get artistChoices() {
        return artistChoices;
      },
      set artistChoices(value: typeof artistChoices) {
        artistChoices = value;
      },
    },
  };
}
