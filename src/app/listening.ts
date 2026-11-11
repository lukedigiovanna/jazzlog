import { today } from "./date";
import { createDialog } from "./dialog";
import { createEditorDrafts } from "./editorDrafts";
import { field } from "../components/formFields";
import { makeId } from "./id";
import type { Album, ListeningEntry } from "../types/albums";
import { ratingLabels } from "../data/mockData";
import { escapeHtml } from "../components/html";
import { artistText, displayRating } from "../components/presentation";
import { stars } from "../components/rating";

export function createListening(ops: {
  editor: HTMLDialogElement;
  showDialog: ReturnType<typeof createDialog>["showDialog"];
  beginDraft: ReturnType<typeof createEditorDrafts>["beginDraft"];
  albums: () => Album[];
  finishSave: (id: string, message: string) => Promise<void>;
}) {
  function openListen(album: Album, entry?: ListeningEntry) {
    if (!ops.beginDraft({ kind: "listen", item: album, entry })) return;
    ops.showDialog(
      entry ? "Edit listen" : "Log a listen",
      /* HTML */ `<form
        id="listen-form"
        data-id="${escapeHtml(album.id)}"
        data-entry-id="${escapeHtml(entry?.id ?? "")}"
      >
        <div class="dialog-body">
          <p class="dialog-intro">
            ${escapeHtml(album.title)}
            <span class="separator">·</span> ${escapeHtml(artistText(album))}
          </p>
          ${field("Date listened", "date", entry?.listenedAt.slice(0, 10) ?? today(), { type: "date", attributes: 'required min="1900-01-01" max="' + today() + '"' })}
          <fieldset class="rate-field">
            <legend>Rating</legend>
            <div class="rating-picker">
              <span id="rating-stars">${stars(entry?.rating ?? 0)}</span>
              <div class="rating-options">
                ${ratingLabels.map((label, i) => /* HTML */ `<label><input name="rating" type="radio" value="${i + 1}" ${entry?.rating === i + 1 ? "checked" : ""} required aria-label="${(i + 1) / 2} out of 5 stars: ${escapeHtml(label)}" /></label>`).join("")}
              </div>
            </div>
            <p id="rating-description" class="form-hint" aria-live="polite">
              Select a rating. Half stars are available.
            </p>
          </fieldset>
          <label class="field"
            ><span>Listening notes</span
            ><textarea
              name="notes"
              rows="4"
              maxlength="3000"
              placeholder="What stood out on this listen?"
            >
${escapeHtml(entry?.notes ?? "")}</textarea>
          </label>
        </div>
        <div class="dialog-footer">
          <button type="button" class="button secondary" data-action="close">
            Cancel</button
          ><button type="submit" class="button primary">
            ${entry ? "Save changes" : "Save listen"}
          </button>
        </div>
        ${
          entry
            ? /* HTML */ `<div class="listen-delete">
                <details>
                  <summary>Delete listening entry</summary>
                  <p>
                    This will permanently remove this listen, including its
                    rating and notes.
                  </p>
                  <button
                    type="button"
                    class="button secondary danger"
                    data-action="delete-listen"
                  >
                    Delete entry permanently
                  </button>
                </details>
              </div>`
            : ""
        }
      </form>`,
      entry ? '[name="notes"]' : '[name="date"]',
    );
    if (entry) updateRating(entry.rating);
  }

  function updateRating(rating: number) {
    document.querySelector<HTMLElement>("#rating-stars")!.innerHTML =
      stars(rating);
    document.querySelector<HTMLElement>("#rating-description")!.textContent =
      `${displayRating(rating)} / 5 · ${ratingLabels[rating - 1]}`;
  }

  function saveListenForm(form: HTMLFormElement) {
    const data = new FormData(form);
    const album = ops.albums().find((item) => item.id === form.dataset.id);
    if (!album) return;
    const entry = album.listeningEntries.find(
      (item) => item.id === form.dataset.entryId,
    );
    if (form.dataset.entryId && !entry) return;
    const now = new Date().toISOString();
    album.updatedAt = now;
    const updates = {
      updatedAt: now,
      listenedAt: String(data.get("date")),
      rating: Number(data.get("rating")),
      notes: String(data.get("notes")).trim(),
    };
    if (entry) Object.assign(entry, updates);
    else
      album.listeningEntries.unshift({
        id: makeId(),
        createdAt: now,
        ...updates,
      });
    ops.finishSave(album.id, entry ? "Listen updated." : "Listen saved.");
  }

  function click(button: HTMLButtonElement, album?: Album) {
    switch (button.dataset.action) {
      case "edit-listen": {
        const entry = album?.listeningEntries.find(
          (item) => item.id === button.dataset.id,
        );
        if (album && entry) openListen(album, entry);
        break;
      }
      case "delete-listen": {
        const form = button.closest<HTMLFormElement>("#listen-form");
        const owner = ops.albums().find((item) => item.id === form?.dataset.id);
        if (
          !owner ||
          !owner.listeningEntries.some(
            (item) => item.id === form?.dataset.entryId,
          )
        )
          break;
        owner.listeningEntries = owner.listeningEntries.filter(
          (item) => item.id !== form?.dataset.entryId,
        );
        owner.updatedAt = new Date().toISOString();
        ops.finishSave(owner.id, "Listen deleted.");
        break;
      }
      case "listen":
        if (album) openListen(album);
        break;
      default:
        return false;
    }
    return true;
  }

  return { openListen, updateRating, saveListenForm, today, click };
}
