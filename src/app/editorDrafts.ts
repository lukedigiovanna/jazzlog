import { linkRow } from "../components/formFields";
import type {
  AlbumArtist,
  AlbumGenre,
  AlbumInstrument,
  Artist,
  Genre,
  ListeningEntry,
} from "../types/albums";
import { createLifecycle } from "./lifecycle";
export type DraftTarget = {
  kind: string;
  item?: unknown;
  mode?: string;
  entry?: ListeningEntry;
};
export type Draft = {
  version: 1;
  target: DraftTarget;
  hash: string;
  open: boolean;
  baseline: string;
  source: string;
  fields: { name: string; id: string; value: string; checked: boolean }[];
  links: number;
  artists: AlbumArtist[];
  genres: AlbumGenre[];
  instruments: AlbumInstrument[];
  artistChoices: Artist[];
  genreChoices: Genre[];
  instrumentChoices: AlbumInstrument[];
};

export function createEditorDrafts({
  editor,
  accountId,
  isSaving,
  baseline,
  serializeSelections,
  resumeDraft,
  announce,
  setBaseline,
  updateRating,
}: {
  setBaseline: (value: string) => void;
  updateRating: (value: number) => void;
  editor: HTMLDialogElement;
  accountId: string;
  isSaving: () => boolean;
  baseline: () => string;
  serializeSelections: () => Pick<
    Draft,
    | "artists"
    | "genres"
    | "instruments"
    | "artistChoices"
    | "genreChoices"
    | "instrumentChoices"
  >;
  resumeDraft: () => void;
  announce: (message: string) => void;
}) {
  const lifecycle = createLifecycle();
  const draftKey = `jazzlog:editor-draft:v1:${accountId}`;
  let draft: Draft | undefined;
  const state = {
    target: undefined as DraftTarget | undefined,
    restoring: false,
    source: "",
  };
  const resumeButton = document.createElement("button");
  resumeButton.className = "button secondary draft-resume";
  resumeButton.textContent = "Resume draft";
  resumeButton.hidden = true;
  document.querySelector(".masthead-inner")!.append(resumeButton);
  function writeDraft() {
    try {
      if (draft) localStorage.setItem(draftKey, JSON.stringify(draft));
      else localStorage.removeItem(draftKey);
      return true;
    } catch {
      return false;
    }
  }
  function clearDraft() {
    draft = undefined;
    state.target = undefined;
    writeDraft();
    resumeButton.hidden = true;
  }
  function captureDraft() {
    if (state.restoring || isSaving() || !editor.open || !state.target) return;
    const form = editor.querySelector("form");
    if (!form) return;
    draft = {
      version: 1,
      target: state.target,
      hash: location.hash,
      open: true,
      baseline: baseline(),
      source: state.source,
      fields: [
        ...form.querySelectorAll<HTMLInputElement>("input, select, textarea"),
      ].map((input) => ({
        name: input.name,
        id: input.id,
        value: input.value,
        checked: input.checked ?? false,
      })),
      links: form.querySelectorAll(".link-fields").length,
      ...serializeSelections(),
    };
    const stored = writeDraft();
    const status = editor.querySelector("[data-draft-status]");
    const message = stored
      ? "Draft saved on this device"
      : "Draft could not be saved on this device";
    if (status && status.textContent !== message) status.textContent = message;
    resumeButton.hidden = true;
  }
  function beginDraft(target: DraftTarget) {
    if (!state.restoring && draft && !editor.open) {
      resumeDraft();
      announce(
        "Resume or discard your unfinished edit before starting another.",
      );
      return false;
    }
    state.target = target;
    state.source = JSON.stringify(target.item ?? null);
    return true;
  }
  function draftCloseChoices() {
    if (editor.querySelector("[data-draft-close]")) return;
    const panel = document.createElement("div");
    panel.className = "dialog-body";
    panel.dataset.draftClose = "";
    panel.innerHTML = /* HTML */ `<p>Keep this unfinished edit for later?</p>
      <div class="draft-actions">
        <button type="button" class="button primary" data-draft-keep>
          Keep draft
        </button>
        <button type="button" class="button secondary" data-draft-discard>
          Discard changes
        </button>
        <button type="button" class="button secondary" data-draft-continue>
          Continue editing
        </button>
      </div>`;
    editor.append(panel);
    panel.querySelector("button")?.focus();
    lifecycle.listen(panel).addEventListener("click", (event) => {
      const target = event.target as HTMLElement;
      if (target.closest("[data-draft-keep]")) {
        captureDraft();
        if (!draft || !writeDraft()) {
          announce(
            "Couldn’t keep the draft. Continue editing or discard changes.",
          );
          return;
        }
        draft.open = false;
        if (!writeDraft()) {
          draft.open = true;
          return;
        }
        state.target = undefined;
        resumeButton.hidden = false;
        editor.close();
      } else if (target.closest("[data-draft-discard]")) {
        clearDraft();
        editor.close();
      } else if (target.closest("[data-draft-continue]")) {
        panel.remove();
        editor.querySelector<HTMLElement>("#dialog-title")?.focus();
      }
    });
  }

  lifecycle.listen(resumeButton).addEventListener("click", resumeDraft);
  try {
    const stored = JSON.parse(localStorage.getItem(draftKey) ?? "null");
    if (
      stored?.version === 1 &&
      [
        "album",
        "artist",
        "genre",
        "instrument",
        "instruments",
        "listen",
      ].includes(stored.target?.kind) &&
      typeof stored.hash === "string" &&
      (stored.hash === "" || stored.hash.startsWith("#")) &&
      typeof stored.baseline === "string" &&
      typeof stored.source === "string" &&
      Number.isInteger(stored.links) &&
      stored.links >= 0 &&
      stored.links <= 1000 &&
      [
        stored.fields,
        stored.artists,
        stored.genres,
        stored.instruments,
        stored.artistChoices,
        stored.genreChoices,
        stored.instrumentChoices,
      ].every(Array.isArray) &&
      stored.fields.every(
        (field: Draft["fields"][number]) =>
          field &&
          typeof field.name === "string" &&
          typeof field.id === "string" &&
          typeof field.value === "string" &&
          typeof field.checked === "boolean",
      )
    )
      draft = stored;
  } catch {
    /* An unavailable or damaged draft must not prevent opening the library. */
  }
  for (const event of ["input", "change", "click"])
    lifecycle
      .listen(editor)
      .addEventListener(event, () => lifecycle.queue(captureDraft));
  lifecycle.listen(window).addEventListener("pagehide", captureDraft);
  lifecycle.listen(document).addEventListener("visibilitychange", () => {
    if (document.hidden) captureDraft();
  });

  function restore(saved: Draft, openEditor: () => void) {
    state.restoring = true;
    openEditor();
    const rows = editor.querySelector("#link-rows");
    if (rows)
      rows.innerHTML = Array.from({ length: saved.links }, () =>
        linkRow(),
      ).join("");
    const controls = [
      ...editor.querySelectorAll<HTMLInputElement>("input, select, textarea"),
    ];
    const used = new Set<HTMLInputElement>();
    for (const field of saved.fields) {
      const input = controls.find(
        (control) =>
          !used.has(control) &&
          control.name === field.name &&
          control.id === field.id,
      );
      if (input) {
        input.value = field.value;
        if (input.type === "checkbox" || input.type === "radio")
          input.checked = field.checked;
        used.add(input);
      }
    }
    const rating = editor.querySelector<HTMLInputElement>(
      '[name="rating"]:checked',
    );
    if (rating) updateRating(Number(rating.value));
    lifecycle.queue(() => {
      setBaseline(saved.baseline);
      state.source = saved.source;
      state.restoring = false;
      captureDraft();
      const status = editor.querySelector("[data-draft-status]");
      if (status && status.textContent === "Draft saved on this device")
        status.textContent =
          "Your unfinished edit was restored. Draft saved on this device.";
      editor
        .querySelector<HTMLElement>("#dialog-title")
        ?.focus({ preventScroll: true });
    });
  }
  return {
    restore,
    state,
    get current() {
      return draft;
    },
    resumeButton,
    writeDraft,
    clearDraft,
    captureDraft,
    beginDraft,
    draftCloseChoices,
    dispose() {
      lifecycle.dispose();
      resumeButton.remove();
    },
  };
}
