import { linkRow } from "../components/formFields";
import type {
  Album,
  Instrument,
  AlbumArtist,
  AlbumGenre,
  AlbumInstrument,
  Artist,
  Genre,
  ListeningEntry,
} from "../types/albums";
import type { AlbumEditorMode } from "./editorContracts";
import { draftSchema } from "./draftValidation";
import { createLifecycle } from "./lifecycle";

export interface EditorDraftsDependencies {
  setBaseline: (value: string) => void;
  updateRating: (value: number | null) => void;
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
}

export type DraftTarget =
  | { kind: "album"; item?: Partial<Album>; mode?: AlbumEditorMode }
  | { kind: "artist"; item?: Artist }
  | { kind: "genre"; item?: Genre }
  | { kind: "instrument"; item?: Instrument }
  | { kind: "instruments"; item: Album }
  | { kind: "listen"; item: Album; entry?: ListeningEntry };
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

export interface EditorDrafts {
  readonly state: {
    target: DraftTarget | undefined;
    restoring: boolean;
    source: string;
  };
  readonly current: Draft | undefined;
  readonly resumeButton: HTMLButtonElement;
  restore: (saved: Draft, openEditor: () => void) => void;
  writeDraft: () => boolean;
  clearDraft: () => void;
  captureDraft: () => void;
  beginDraft: (target: DraftTarget) => boolean;
  draftCloseChoices: () => void;
  dispose: () => void;
}

export class EditorDraftController implements EditorDrafts {
  private readonly lifecycle = createLifecycle();
  private readonly draftKey: string;
  private draft: Draft | undefined;
  readonly state: EditorDrafts["state"] = {
    target: undefined,
    restoring: false,
    source: "",
  };
  readonly resumeButton = document.createElement("button");

  private readonly ops: EditorDraftsDependencies;

  constructor(ops: EditorDraftsDependencies) {
    this.ops = ops;
    this.draftKey = `sleeve:editor-draft:v1:${ops.accountId}`;
    this.resumeButton.className = "button secondary draft-resume";
    this.resumeButton.textContent = "Resume draft";
    this.resumeButton.hidden = true;
    document.querySelector(".masthead-inner")!.append(this.resumeButton);
    this.loadDraft();
    this.listen();
  }

  get current(): Draft | undefined {
    return this.draft;
  }

  writeDraft(): boolean {
    try {
      if (this.draft)
        localStorage.setItem(this.draftKey, JSON.stringify(this.draft));
      else localStorage.removeItem(this.draftKey);
      return true;
    } catch {
      return false;
    }
  }

  clearDraft(): void {
    this.draft = undefined;
    this.state.target = undefined;
    this.writeDraft();
    this.resumeButton.hidden = true;
  }

  captureDraft(): void {
    if (
      this.state.restoring ||
      this.ops.isSaving() ||
      !this.ops.editor.open ||
      !this.state.target
    )
      return;
    const form = this.ops.editor.querySelector("form");
    if (!form) return;
    this.draft = {
      version: 1,
      target: this.state.target,
      hash: location.hash,
      open: true,
      baseline: this.ops.baseline(),
      source: this.state.source,
      fields: [
        ...form.querySelectorAll<HTMLInputElement>(
          "input:not([data-suggestion-search]), select, textarea",
        ),
      ].map((input) => ({
        name: input.name,
        id: input.id,
        value: input.value,
        checked: input.checked ?? false,
      })),
      links: form.querySelectorAll(".link-fields").length,
      ...this.ops.serializeSelections(),
    };
    const stored = this.writeDraft();
    const status = this.ops.editor.querySelector("[data-draft-status]");
    const message = stored
      ? "Draft saved on this device"
      : "Draft could not be saved on this device";
    if (status && status.textContent !== message) status.textContent = message;
    this.resumeButton.hidden = true;
  }

  beginDraft(target: DraftTarget): boolean {
    if (!this.state.restoring && this.draft && !this.ops.editor.open) {
      this.ops.resumeDraft();
      this.ops.announce(
        "Resume or discard your unfinished edit before starting another.",
      );
      return false;
    }
    this.state.target = target;
    this.state.source = JSON.stringify(target.item ?? null);
    return true;
  }

  draftCloseChoices(): void {
    if (this.ops.editor.querySelector("[data-draft-close]")) return;
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
    this.ops.editor.append(panel);
    panel.querySelector("button")?.focus();
    this.lifecycle.listen(panel).addEventListener("click", (event) => {
      const target = event.target as HTMLElement;
      if (target.closest("[data-draft-keep]")) {
        this.captureDraft();
        if (!this.draft || !this.writeDraft()) {
          this.ops.announce(
            "Couldn’t keep the draft. Continue editing or discard changes.",
          );
          return;
        }
        this.draft.open = false;
        if (!this.writeDraft()) {
          this.draft.open = true;
          return;
        }
        this.state.target = undefined;
        this.resumeButton.hidden = false;
        this.ops.editor.close();
      } else if (target.closest("[data-draft-discard]")) {
        this.clearDraft();
        this.ops.editor.close();
      } else if (target.closest("[data-draft-continue]")) {
        panel.remove();
        this.ops.editor.querySelector<HTMLElement>("#dialog-title")?.focus();
      }
    });
  }

  restore(saved: Draft, openEditor: () => void): void {
    this.state.restoring = true;
    openEditor();
    const rows = this.ops.editor.querySelector("#link-rows");
    if (rows)
      rows.innerHTML = Array.from({ length: saved.links }, () =>
        linkRow(),
      ).join("");
    const controls = [
      ...this.ops.editor.querySelectorAll<HTMLInputElement>(
        "input, select, textarea",
      ),
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
    for (const row of this.ops.editor.querySelectorAll<HTMLElement>(
      "[data-suggestion-row]",
    ))
      row.hidden =
        row.querySelector<HTMLInputElement>('input[type="hidden"]')?.value ===
        "__done";
    const rating = this.ops.editor.querySelector<HTMLInputElement>(
      '[name="rating"]:checked',
    );
    if (this.ops.editor.querySelector("#listen-form"))
      this.ops.updateRating(rating?.value ? Number(rating.value) : null);
    this.lifecycle.queue(() => {
      this.ops.setBaseline(saved.baseline);
      this.state.source = saved.source;
      this.state.restoring = false;
      this.captureDraft();
      const status = this.ops.editor.querySelector("[data-draft-status]");
      if (status && status.textContent === "Draft saved on this device")
        status.textContent =
          "Your unfinished edit was restored. Draft saved on this device.";
      this.ops.editor
        .querySelector<HTMLElement>("#dialog-title")
        ?.focus({ preventScroll: true });
    });
  }

  private loadDraft(): void {
    try {
      const stored: unknown = JSON.parse(
        localStorage.getItem(this.draftKey) ?? "null",
      );
      const result = draftSchema.safeParse(stored);
      if (result.success) {
        this.draft = result.data;
        const parentField = this.draft.fields.find(
          (field) => field.name === "parentGenreId",
        );
        if (parentField?.value)
          this.draft.fields.push({
            name: "parentGenreIds",
            id: `genre-parent-${parentField.value}`,
            value: parentField.value,
            checked: true,
          });
      }
    } catch {
      /* An unavailable or damaged draft must not prevent opening the library. */
    }
  }

  private listen(): void {
    this.lifecycle
      .listen(this.resumeButton)
      .addEventListener("click", this.ops.resumeDraft);
    for (const event of ["input", "change", "click"])
      this.lifecycle
        .listen(this.ops.editor)
        .addEventListener(event, () =>
          this.lifecycle.queue(() => this.captureDraft()),
        );
    this.lifecycle
      .listen(window)
      .addEventListener("pagehide", () => this.captureDraft());
    this.lifecycle.listen(document).addEventListener("visibilitychange", () => {
      if (document.hidden) this.captureDraft();
    });
  }

  dispose(): void {
    this.lifecycle.dispose();
    this.resumeButton.remove();
  }
}
