import { createLifecycle } from "./lifecycle";

/** Refresh after time away, including restoration from Safari's page cache. */
export function createResumeRefresh(options: {
  refresh: () => Promise<boolean>;
  blocked: () => boolean;
  editor: EventTarget;
}) {
  const lifecycle = createLifecycle();
  let hiddenAt: number | undefined;
  let pending = false;
  let running = false;

  async function attempt() {
    if (
      !lifecycle.active ||
      !pending ||
      running ||
      document.visibilityState !== "visible" ||
      !navigator.onLine ||
      options.blocked()
    )
      return;
    running = true;
    try {
      if (await options.refresh()) pending = false;
    } catch {
      // Keep the current library; retry on the next resume or reconnection.
    } finally {
      running = false;
    }
  }

  function resume() {
    if (document.visibilityState !== "visible") return;
    if (hiddenAt !== undefined) {
      if (Date.now() - hiddenAt >= 60_000) pending = true;
      hiddenAt = undefined;
    }
    void attempt();
  }
  function hide() {
    hiddenAt ??= Date.now();
  }
  lifecycle.listen(document).addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") hide();
    else resume();
  });
  lifecycle.listen(window).addEventListener("pagehide", hide);
  lifecycle.listen(window).addEventListener("pageshow", resume);
  lifecycle.listen(window).addEventListener("online", resume);
  lifecycle.listen(options.editor).addEventListener("close", () => {
    void attempt();
  });
  return lifecycle.dispose;
}
