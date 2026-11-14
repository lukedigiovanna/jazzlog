import type { LibraryStore, SaveResult } from "./libraryState";
import { albumUrl } from "../components/presentation";

export interface EditorPersistenceDependencies {
  editor: HTMLDialogElement;
  library: Pick<LibraryStore, "save" | "syncCatalogs">;
  cacheCommitted: () => void;
  clearDraft: () => void;
  renderRoute: (focus?: boolean) => void;
  announce: (message: string) => void;
}

export class EditorPersistence {
  private readonly dependencies: EditorPersistenceDependencies;
  private active = true;

  constructor(dependencies: EditorPersistenceDependencies) {
    this.dependencies = dependencies;
  }

  private async persistChanges(): Promise<SaveResult> {
    this.dependencies.editor.setAttribute("aria-busy", "true");
    const controls = [
      ...this.dependencies.editor.querySelectorAll<
        | HTMLButtonElement
        | HTMLInputElement
        | HTMLSelectElement
        | HTMLTextAreaElement
      >("button, input, select, textarea"),
    ];
    const enabled = controls.filter((control) => !control.disabled);
    enabled.forEach((control) => (control.disabled = true));
    try {
      const result = await this.dependencies.library.save();
      if (!this.active)
        return { status: "rejected", message: "Editor disposed." };
      if (result.status !== "rejected") {
        this.dependencies.cacheCommitted();
        return result;
      }
      const message = result.message;
      const errorElement =
        this.dependencies.editor.querySelector<HTMLElement>("#form-error");
      const text = `Couldn’t save changes. ${message || "Please try again."}`;
      if (errorElement) {
        errorElement.hidden = false;
        errorElement.textContent = text;
      } else this.dependencies.announce(text);
      this.dependencies.renderRoute();
      return result;
    } finally {
      if (this.active) {
        this.dependencies.editor.removeAttribute("aria-busy");
        enabled.forEach((control) => (control.disabled = false));
      }
    }
  }

  public async finishCatalogSave(
    message: string,
    destination: string,
  ): Promise<void> {
    if (!this.active) return;

    this.dependencies.library.syncCatalogs();
    const stored = await this.persistChanges();
    if (stored.status === "rejected") return;
    this.dependencies.clearDraft();
    this.dependencies.editor.close();
    if (location.hash === destination) this.dependencies.renderRoute(true);
    else location.hash = destination;
    this.dependencies.announce(
      stored.status === "saved"
        ? message
        : "Updated for this visit. Browser storage is unavailable.",
    );
  }

  public async finishSave(id: string, message: string): Promise<void> {
    if (!this.active) return;

    const stored = await this.persistChanges();
    if (stored.status === "rejected") return;
    this.dependencies.clearDraft();
    this.dependencies.editor.close();
    if (location.hash === albumUrl(id)) {
      this.dependencies.renderRoute();
      document
        .querySelector<HTMLElement>("#page-title")
        ?.setAttribute("tabindex", "-1");
      document
        .querySelector<HTMLElement>("#page-title")
        ?.focus({ preventScroll: true });
    } else {
      location.hash = albumUrl(id);
    }
    this.dependencies.announce(
      stored.status === "saved"
        ? message
        : "Updated for this visit. Browser storage is unavailable.",
    );
  }

  public dispose(): void {
    this.active = false;
  }
}
