import { test, expect } from "@playwright/test";

test("resume refresh waits a minute, defers edits, retries offline, and cleans up", async ({
  page,
}) => {
  await page.goto("/");
  const result = await page.evaluate(async () => {
    const path = "/src/app/resumeRefresh.ts";
    const { createResumeRefresh } = await import(/* @vite-ignore */ path);
    let now = 0;
    Date.now = () => now;
    let visibility = "visible";
    let online = true;
    Object.defineProperty(document, "visibilityState", {
      get: () => visibility,
    });
    Object.defineProperty(navigator, "onLine", { get: () => online });
    const editor = new EventTarget();
    let blocked = false;
    let calls = 0;
    let succeed = true;
    let complete: ((value: boolean) => void) | undefined;
    let hold = false;
    const dispose = createResumeRefresh({
      editor,
      blocked: () => blocked,
      refresh: async () => {
        calls++;
        if (hold)
          return new Promise<boolean>((resolve) => {
            complete = resolve;
          });
        if (!succeed) throw new Error("Offline");
        return true;
      },
    });
    const tick = () => new Promise((resolve) => setTimeout(resolve, 0));
    const away = async (duration: number) => {
      visibility = "hidden";
      document.dispatchEvent(new Event("visibilitychange"));
      now += duration;
      visibility = "visible";
      document.dispatchEvent(new Event("visibilitychange"));
      window.dispatchEvent(new Event("pageshow"));
      await tick();
    };
    const counts: number[] = [];
    await away(59_999);
    counts.push(calls);
    await away(60_000);
    counts.push(calls);
    blocked = true;
    await away(60_000);
    counts.push(calls);
    blocked = false;
    editor.dispatchEvent(new Event("close"));
    await tick();
    counts.push(calls);
    online = false;
    await away(60_000);
    counts.push(calls);
    online = true;
    succeed = false;
    window.dispatchEvent(new Event("online"));
    await tick();
    counts.push(calls);
    succeed = true;
    hold = true;
    window.dispatchEvent(new Event("online"));
    window.dispatchEvent(new Event("pageshow"));
    await tick();
    counts.push(calls);
    complete!(true);
    await tick();
    dispose();
    await away(60_000);
    counts.push(calls);
    return counts;
  });
  expect(result).toEqual([0, 1, 1, 2, 2, 3, 4, 4]);
});

test("refresh replaces the save baseline and rejects responses from before a save", async ({
  page,
}) => {
  await page.goto("/");
  const result = await page.evaluate(async () => {
    const path = "/src/app/libraryState.ts";
    const { createLibraryState } = await import(/* @vite-ignore */ path);
    const empty = { albums: [], artists: [], genres: [], instruments: [] };
    let finish: ((value: any) => void) | undefined;
    let baseline: any;
    const state = createLibraryState(
      structuredClone(empty),
      async (before: any, next: any) => {
        baseline = structuredClone(before);
        return new Promise((resolve) => {
          finish = () => resolve(next);
        });
      },
    );
    const fresh = {
      ...empty,
      artists: [{ id: "remote", name: "Remote artist" }],
    };
    const applied = state.replace(structuredClone(fresh), state.revision);
    const revision = state.revision;
    state.data.artists[0].name = "Local edit";
    const saving = state.save();
    const duringSave = state.replace(structuredClone(empty), revision);
    finish!(null);
    await saving;
    const afterSave = state.replace(structuredClone(empty), revision);
    return {
      applied,
      duringSave,
      afterSave,
      baseline,
      name: state.data.artists[0].name,
    };
  });
  expect(result.applied).toBe(true);
  expect(result.duringSave).toBe(false);
  expect(result.afterSave).toBe(false);
  expect(result.baseline.artists[0].name).toBe("Remote artist");
  expect(result.name).toBe("Local edit");
});
