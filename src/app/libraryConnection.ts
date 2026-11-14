import { readLibraryCache, writeLibraryCache } from "./libraryCache";
import { createLifecycle } from "./lifecycle";
import { createResumeRefresh } from "./resumeRefresh";
import type { LibraryStore } from "./libraryState";

function syncAge(minutes: number): [number, "minute" | "hour" | "day"] {
  if (minutes < 60) return [minutes, "minute"];
  if (minutes < 1440) return [Math.floor(minutes / 60), "hour"];
  return [Math.floor(minutes / 1440), "day"];
}

export interface LibraryConnectionDependencies {
  accountId: string;
  enabled: boolean;
  editor: HTMLDialogElement;
  library: Pick<LibraryStore, "data" | "revision" | "saving" | "replace">;
  resumeButton: () => HTMLButtonElement;
  canBrowse: (action: string) => boolean;
  renderRoute: () => void;
}

export class LibraryConnection {
  private readonly dependencies: LibraryConnectionDependencies;
  private readonly lifecycle = createLifecycle();
  private bannerTimer: ReturnType<typeof setInterval> | undefined;
  private disposeRefresh: (() => void) | undefined;
  private mounted = false;
  private refreshFailed = false;
  private refreshRunning = false;
  private cacheFailed = false;
  private syncedAt: number | undefined;
  private readonly banner = document.createElement("div");

  constructor(dependencies: LibraryConnectionDependencies) {
    this.dependencies = dependencies;
    this.syncedAt = readLibraryCache(dependencies.accountId)?.syncedAt;
    this.banner.className = "connection-banner";
    this.banner.setAttribute("role", "status");
    this.banner.hidden = true;
    document.querySelector(".masthead")!.before(this.banner);
  }

  public get readOnly(): boolean {
    return (
      this.dependencies.enabled && (!navigator.onLine || this.refreshFailed)
    );
  }

  public mount(initialRefresh: boolean): void {
    if (this.mounted || !this.lifecycle.active) return;
    this.mounted = true;
    this.lifecycle
      .listen(window)
      .addEventListener("offline", () => this.update());
    this.lifecycle
      .listen(window)
      .addEventListener("online", () => this.update());
    if (!this.dependencies.enabled) return;

    if (!initialRefresh) this.cacheCommitted();
    this.bannerTimer = setInterval(() => {
      if (!this.banner.hidden && !this.banner.contains(document.activeElement))
        this.update();
    }, 60_000);
    this.disposeRefresh = createResumeRefresh({
      editor: this.dependencies.editor,
      blocked: () =>
        this.dependencies.editor.open || this.dependencies.library.saving,
      initial: initialRefresh,
      refresh: () => this.refresh(),
    });
  }

  public cacheCommitted(): void {
    if (!this.dependencies.enabled || !this.lifecycle.active) return;

    this.syncedAt = Date.now();
    this.cacheFailed = !writeLibraryCache(
      this.dependencies.accountId,
      this.dependencies.library.data,
      this.syncedAt,
    );
    this.update();
  }

  public update(): void {
    if (!this.dependencies.enabled || !this.lifecycle.active) return;

    this.banner.replaceChildren();
    const minutes = Math.max(
      1,
      Math.floor((Date.now() - (this.syncedAt ?? Date.now())) / 60_000),
    );
    const [amount, unit] = syncAge(minutes);
    const updated = this.syncedAt
      ? ` · synced ${amount} ${unit}${amount === 1 ? "" : "s"} ago`
      : "";
    if (!navigator.onLine) this.banner.textContent = "Offline" + updated;
    else if (this.refreshFailed) {
      this.banner.textContent = "Couldn’t refresh" + updated;
      const retry = document.createElement("button");
      retry.type = "button";
      retry.className = "button secondary";
      retry.textContent = "Retry";
      retry.onclick = () => {
        void this.refresh();
      };
      this.banner.append(retry);
    } else if (this.cacheFailed)
      this.banner.textContent =
        "Couldn’t save an offline copy. Browser storage is unavailable or full.";
    this.banner.hidden = !this.banner.textContent;
    document
      .querySelectorAll<HTMLButtonElement>("button[data-action]")
      .forEach((button) => {
        if (
          button.closest("#editor") ||
          this.dependencies.canBrowse(button.dataset.action!)
        )
          return;
        if (this.readOnly) {
          if (!button.disabled) {
            button.dataset.offlineDisabled = "";
            button.disabled = true;
          }
        } else if ("offlineDisabled" in button.dataset) {
          button.disabled = false;
          delete button.dataset.offlineDisabled;
        }
      });
    this.dependencies.resumeButton().disabled = this.readOnly;
    this.dependencies.editor
      .querySelectorAll<HTMLButtonElement>('button[type="submit"]')
      .forEach((button) => {
        if (this.dependencies.library.saving) return;
        button.disabled = this.readOnly;
      });
  }

  public async refresh(): Promise<boolean> {
    if (
      !this.lifecycle.active ||
      !this.dependencies.enabled ||
      !navigator.onLine ||
      this.dependencies.editor.open ||
      this.dependencies.library.saving ||
      this.refreshRunning
    )
      return false;
    this.refreshRunning = true;
    const revision = this.dependencies.library.revision;
    try {
      const { getLibrary } = await import("../services/library");
      const next = await getLibrary();
      if (
        !this.lifecycle.active ||
        this.dependencies.editor.open ||
        !this.dependencies.library.replace(next, revision)
      )
        return false;
      this.refreshFailed = false;
      this.cacheCommitted();
      const scroll = window.scrollY;
      this.dependencies.renderRoute();
      window.scrollTo(0, scroll);
      return true;
    } catch {
      if (this.lifecycle.active) {
        this.refreshFailed = true;
        this.update();
      }
      return false;
    } finally {
      this.refreshRunning = false;
    }
  }

  public dispose(): void {
    this.lifecycle.dispose();
    clearInterval(this.bannerTimer);
    this.disposeRefresh?.();
    this.banner.remove();
  }
}
