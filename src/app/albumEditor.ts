import { today } from "./date";
import { createDialog } from "./dialog";
import { createEditorDrafts } from "./editorDrafts";
import type { LibraryData } from "../types/library";
import {
  catalogImageField,
  updateCatalogImage,
  field,
  linkRow,
} from "../components/formFields";
import { formValue } from "./formValues";
import {
  findAppleMusicAlbums,
  relevantAppleMusicAlbums,
  type AppleMusicAlbum,
} from "../services/appleMusic";
import { commitAlbumArtists } from "./artistIdentity";
import { makeId } from "./id";
import type { Genre, AlbumGenre } from "../types/albums";
import type {
  Album,
  AlbumArtist,
  AlbumLink,
  AlbumInstrument,
} from "../types/albums";
import { icon } from "../components/icons";
import { escapeHtml } from "../components/html";
import { webUrl, cover } from "../components/presentation";
import { focusForTyping } from "./device";

export function createAlbumEditor(ops: {
  editor: HTMLDialogElement;
  showDialog: ReturnType<typeof createDialog>["showDialog"];
  beginDraft: ReturnType<typeof createEditorDrafts>["beginDraft"];
  captureDraft: () => void;
  finishCatalogSave: (message: string, destination: string) => Promise<void>;
  formError: (message: string, input: HTMLInputElement) => void;
  finishSave: (id: string, message: string) => Promise<void>;
  isActive: () => boolean;
  isSaving: () => boolean;
  library: Pick<LibraryData, "albums" | "artists" | "genres">;
  selections: {
    selectedArtists: AlbumArtist[];
    selectedGenres: AlbumGenre[];
    selectedInstruments: AlbumInstrument[];
    genreChoices: Genre[];
  };
  artistPicker: (items: AlbumArtist[]) => string;
  genrePicker: (items: AlbumGenre[]) => string;
  instrumentPicker: (items: AlbumInstrument[]) => string;
  updateArtists: () => void;
  updateGenres: () => void;
  updateInstruments: () => void;
  commitInstrumentChoices: () => void;
}) {
  let reviewAlbum: Album | undefined;
  let appleVersion = 0;
  let appleResults: AppleMusicAlbum[] = [];

  function hasAppleLink() {
    return [
      ...ops.editor.querySelectorAll<HTMLInputElement>('[name="linkUrl"]'),
    ].some((input) => {
      try {
        return ["music.apple.com", "itunes.apple.com"].includes(
          new URL(input.value).hostname,
        );
      } catch {
        return false;
      }
    });
  }

  function addAppleLink(item: AppleMusicAlbum) {
    if (hasAppleLink()) return;
    ops.editor
      .querySelector("#link-rows")
      ?.insertAdjacentHTML(
        "beforeend",
        linkRow({ url: item.url, label: "Apple Music" }),
      );
    ops.captureDraft();
  }

  async function searchAppleMusic() {
    const version = ++appleVersion;
    const form = ops.editor.querySelector<HTMLFormElement>("#album-form");
    const status = ops.editor.querySelector<HTMLElement>("#apple-music-status");
    const button = ops.editor.querySelector<HTMLButtonElement>(
      '[data-action="find-apple-music"]',
    );
    if (!form || !status || !button) return;
    appleResults = [];
    const title = form
      .querySelector<HTMLInputElement>('[name="title"]')!
      .value.trim();
    const names = ops.selections.selectedArtists
      .filter((artist) => artist.role === "primary")
      .map((artist) => artist.name);
    if (hasAppleLink()) {
      status.textContent =
        "Remove the existing Apple Music link to choose a different album.";
      return;
    }
    if (!title || !names.length) {
      status.textContent =
        "Add an album title and primary artist before searching.";
      return;
    }
    const current = () =>
      ops.isActive() &&
      version === appleVersion &&
      ops.editor.open &&
      !ops.isSaving() &&
      ops.editor.querySelector("#album-form") === form;
    button.disabled = true;
    button.textContent = "Searching…";
    status.textContent = `Searching Apple Music (US) for ${title} by ${names.join(", ")}…`;
    try {
      const results = relevantAppleMusicAlbums(
        await findAppleMusicAlbums(title, names.join(" ")),
        title,
        names,
      );
      if (!current()) return;
      if (hasAppleLink()) {
        status.textContent = "An Apple Music link is already added.";
        return;
      }
      appleResults = results;
      status.innerHTML = results.length
        ? /* HTML */ `<p class="form-hint">Choose the album to add its link.</p>
            <div class="apple-music-results">
              ${results
                .map(
                  (item, index) =>
                    /* HTML */ `<button
                      type="button"
                      class="apple-music-result"
                      data-action="pick-apple-music"
                      data-index="${index}"
                    >
                      <span
                        ><strong>${escapeHtml(item.title)}</strong
                        ><small
                          >${escapeHtml(item.artist)}${item.year ? ` · ${item.year}` : ""}</small
                        ></span
                      ><span class="apple-music-add"
                        >${icon("plus", 15)} Add</span
                      >
                    </button>`,
                )
                .join("")}
            </div>`
        : "No albums found. Try updating the title or artist, or add a link manually.";
    } catch (error) {
      if (current())
        status.textContent =
          error instanceof Error
            ? error.message
            : "Couldn’t search Apple Music. Try again or add a link manually.";
    } finally {
      button.disabled = false;
      button.innerHTML = /* HTML */ `${icon("music", 15)} Search Apple Music`;
    }
  }

  function openAlbumForm(album: Partial<Album> = {}, mode = "manual") {
    if (!ops.beginDraft({ kind: "album", item: album, mode })) return;
    if (mode === "review") reviewAlbum = album as Album;
    if (mode === "links") {
      ops.showDialog(
        "Edit music links",
        /* HTML */ `<form id="links-form" data-id="${escapeHtml(album.id)}">
          <div class="dialog-body">
            <p class="dialog-intro">${escapeHtml(album.title)}</p>
            <div id="link-rows">
              ${(album.links?.length ? album.links : [{}]).map(linkRow).join("")}
            </div>
            <button
              type="button"
              class="button secondary compact"
              data-action="add-link"
            >
              ${icon("plus", 15)} Add link manually
            </button>
            <p class="form-error" id="form-error" role="alert" hidden></p>
          </div>
          <div class="dialog-footer">
            <button type="button" class="button secondary" data-action="close">
              Cancel
            </button>
            <button type="submit" class="button primary">Save links</button>
          </div>
        </form>`,
        '[name="linkUrl"]',
      );
      return;
    }
    const isEdit = mode === "edit";
    const fromSearch = mode === "review";
    const title = isEdit ? "Edit album" : "Create album";
    ops.showDialog(
      title,
      /* HTML */ `<form
        id="album-form"
        data-mode="${mode}"
        data-id="${escapeHtml(album.id)}"
      >
        <div class="dialog-body">
          ${
            fromSearch
              ? /* HTML */ `<div class="review-preview">
                  ${cover(album)}
                  <div>
                    <strong>${escapeHtml(album.title)}</strong>
                    <p class="muted">
                      Imported album. Review the artwork, details, and artist
                      roles before saving.
                    </p>
                  </div>
                </div>`
              : ""
          }
          ${isEdit ? "" : '<p class="form-hint">Album title is required. The other fields are optional.</p>'}
          <div class="field-grid">
            ${field("Album title", "title", album.title, { attributes: 'required maxlength="150"', placeholder: "Album title" })}
            ${field("Release year", "year", album.releaseYear, { type: "number", attributes: 'min="1000" max="9999" step="1"', placeholder: "e.g. 1976" })}
          </div>
          ${ops.artistPicker(album.artists ?? [])}
          ${ops.genrePicker(album.genres ?? [])}
          ${ops.instrumentPicker(album.instruments ?? [])}
          <section class="link-form" aria-labelledby="music-links-title">
            <h3 id="music-links-title">Music links</h3>
            <div class="apple-music-search">
              <button
                type="button"
                class="button secondary compact"
                data-action="find-apple-music"
              >
                ${icon("music", 15)} Search Apple Music
              </button>
              <div
                id="apple-music-status"
                class="apple-music-status"
                role="status"
                aria-live="polite"
              ></div>
            </div>
            <div id="link-rows">
              ${(album.links ?? []).map(linkRow).join("")}
            </div>
            <button
              type="button"
              class="button secondary compact"
              data-action="add-link"
            >
              ${icon("plus", 15)} Add link manually
            </button>
          </section>
          <section class="extra-fields" aria-labelledby="album-details-title">
            <h3 id="album-details-title">More album details</h3>
            ${field("Record label", "label", album.recordLabel, { attributes: 'maxlength="100"', placeholder: "Optional" })}
            ${catalogImageField("Artwork URL", album.title ?? "", webUrl(album.artworkUrl)?.href, false, [], "artwork")}
          </section>
          <p class="form-error" id="form-error" role="alert" hidden></p>
        </div>
        <div class="dialog-footer">
          <button type="button" class="button secondary" data-action="close">
            Cancel</button
          ><button type="submit" class="button primary">
            ${isEdit ? "Save changes" : "Save album"}
          </button>
        </div>
      </form>`,
      '[name="title"]',
      !isEdit,
    );
    ops.editor
      .querySelector<HTMLInputElement>('[name="artwork"]')!
      .addEventListener("input", (event) => {
        updateCatalogImage(event.currentTarget as HTMLInputElement);
      });
    ops.updateInstruments();
    ops.updateArtists();
    ops.updateGenres();
  }

  function saveAlbumForm(form: HTMLFormElement) {
    const data = new FormData(form);
    const value = (name: string) => formValue(data, name);
    const mode = form.dataset.mode;
    const original =
      mode === "edit"
        ? ops.library.albums.find((album) => album.id === form.dataset.id)
        : mode === "review"
          ? reviewAlbum
          : undefined;
    if ((mode === "edit" || mode === "review") && !original) return;
    const title = value("title");
    const artwork = value("artwork");
    const mbid = original?.musicbrainzReleaseGroupId;
    if (!title)
      return ops.formError(
        "Enter an album title.",
        form.querySelector<HTMLInputElement>("[name=title]")!,
      );
    if (artwork && !webUrl(artwork))
      return ops.formError(
        "Enter an HTTP or HTTPS artwork URL.",
        form.querySelector<HTMLInputElement>("[name=artwork]")!,
      );
    if (
      mbid &&
      ops.library.albums.some(
        (album) =>
          album.id !== (mode === "edit" ? original?.id : undefined) &&
          album.musicbrainzReleaseGroupId?.toLowerCase() === mbid.toLowerCase(),
      )
    )
      return ops.formError(
        "This MusicBrainz album is already in your library.",
        form.querySelector<HTMLInputElement>("[name=title]")!,
      );
    const links = [];
    for (const row of form.querySelectorAll(".link-fields")) {
      const input = row.querySelector<HTMLInputElement>('[name="linkUrl"]')!;
      const url = input.value.trim();
      const label = row
        .querySelector<HTMLInputElement>('[name="linkLabel"]')!
        .value.trim();
      if (!url && !label) continue;
      if (!webUrl(url))
        return ops.formError(
          "Enter an HTTP or HTTPS URL for each music link.",
          input,
        );
      links.push({ id: makeId(), url, label });
    }
    ops.commitInstrumentChoices();
    const committedArtists = commitAlbumArtists(
      ops.library.artists,
      ops.selections.selectedArtists,
    );
    ops.library.artists = committedArtists.artists;
    ops.library.genres = structuredClone(ops.selections.genreChoices);
    const saved: Album = {
      id: mode === "edit" ? original!.id : makeId(),
      sourceId: mode === "edit" ? original?.sourceId : undefined,
      title,
      sortTitle: original?.sortTitle ?? null,
      artists: committedArtists.credits,
      releaseYear: Number(value("year")) || null,
      genres: structuredClone(ops.selections.selectedGenres),
      recordLabel: value("label"),
      artworkUrl:
        artwork ||
        (!webUrl(original?.artworkUrl) ? original?.artworkUrl : "") ||
        "",
      musicbrainzReleaseGroupId: mbid || null,
      links,
      createdAt: mode === "edit" ? original!.createdAt : today(),
      instruments: structuredClone(ops.selections.selectedInstruments),
      updatedAt: new Date().toISOString(),
      listeningEntries: mode === "edit" ? original!.listeningEntries : [],
    };
    ops.library.albums =
      mode === "edit"
        ? ops.library.albums.map((album) =>
            album.id === saved.id ? saved : album,
          )
        : [saved, ...ops.library.albums];
    ops.finishSave(
      saved.id,
      mode === "edit" ? "Album updated." : "Album added to your library.",
    );
  }

  function saveLinks(form: HTMLFormElement) {
    const album = ops.library.albums.find(
      (item) => item.id === form.dataset.id,
    );
    if (!album) return;
    const links: AlbumLink[] = [];
    for (const row of form.querySelectorAll(".link-fields")) {
      const input = row.querySelector<HTMLInputElement>('[name="linkUrl"]')!;
      const url = input.value.trim();
      const label = row
        .querySelector<HTMLInputElement>('[name="linkLabel"]')!
        .value.trim();
      if (!url && !label) continue;
      if (!webUrl(url))
        return ops.formError(
          "Enter an HTTP or HTTPS URL for each music link.",
          input,
        );
      links.push({ id: makeId(), url, label });
    }
    album.links = links;
    album.updatedAt = new Date().toISOString();
    ops.finishSave(album.id, "Album music links updated.");
  }

  function click(button: HTMLButtonElement, album?: Album) {
    switch (button.dataset.action) {
      case "edit-links":
        if (album) openAlbumForm(album, "links");
        break;
      case "edit":
        if (album) openAlbumForm(album, "edit");
        break;
      case "delete-album":
        if (album)
          ops.showDialog(
            "Delete album?",
            /* HTML */ `<div class="dialog-body">
                <p>
                  Delete <strong>${escapeHtml(album.title)}</strong> from your
                  library? All of its listening history, ratings, notes, and
                  music links will also be deleted. This cannot be undone.
                </p>
                <p id="form-error" class="form-error" role="alert" hidden></p>
              </div>
              <div class="dialog-footer">
                <button class="button secondary" data-action="close">
                  Cancel
                </button>
                <button
                  class="button primary danger"
                  data-action="confirm-delete-album"
                  data-id="${escapeHtml(album.id)}"
                >
                  Delete album
                </button>
              </div>`,
            '.dialog-footer [data-action="close"]',
          );
        break;
      case "confirm-delete-album":
        if (ops.library.albums.some((item) => item.id === button.dataset.id)) {
          ops.library.albums = ops.library.albums.filter(
            (item) => item.id !== button.dataset.id,
          );
          ops.finishCatalogSave("Album deleted.", "#");
        }
        break;

      case "find-apple-music":
        searchAppleMusic();
        break;
      case "pick-apple-music": {
        const item = appleResults[Number(button.dataset.index)];
        if (item) {
          addAppleLink(item);
          ops.editor.querySelector("#apple-music-status")!.replaceChildren();
          appleResults = [];
        }
        break;
      }
      case "add-link": {
        const rows = document.querySelector<HTMLElement>("#link-rows")!;
        rows.insertAdjacentHTML("beforeend", linkRow());
        focusForTyping(
          rows.lastElementChild!.querySelector<HTMLInputElement>("input"),
        );
        break;
      }
      case "remove-link":
        button.closest(".link-fields")?.remove();
        ops.editor
          .querySelector<HTMLElement>('[data-action="add-link"]')
          ?.focus();
        break;
      default:
        return false;
    }
    return true;
  }

  function dispose() {
    appleVersion++;
    appleResults = [];
    reviewAlbum = undefined;
  }
  return { openAlbumForm, saveAlbumForm, saveLinks, click, dispose };
}
