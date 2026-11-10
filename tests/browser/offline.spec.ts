import { test, expect } from "@playwright/test";

test("account snapshots isolate owners and tolerate broken or unavailable storage", async ({
  page,
}) => {
  await page.goto("/");
  const result = await page.evaluate(async () => {
    const path = "/src/app/libraryCache.ts";
    const cache = await import(/* @vite-ignore */ path);
    const data = { albums: [], artists: [], genres: [], instruments: [] };
    const saved = cache.writeLibraryCache("one", data, 123);
    const snapshot = cache.readLibraryCache("one");
    const other = cache.readLibraryCache("two");
    localStorage.setItem("jazzlog-library-v1:broken", "{broken");
    const broken = cache.readLibraryCache("broken");
    cache.clearLibraryCache("one");
    const cleared = cache.readLibraryCache("one");
    Storage.prototype.setItem = () => {
      throw new Error("Full");
    };
    return {
      saved,
      snapshot,
      other,
      broken,
      cleared,
      unavailable: cache.writeLibraryCache("one", data),
    };
  });
  expect(result.saved).toBe(true);
  expect(result.snapshot.syncedAt).toBe(123);
  expect(result.other).toBeUndefined();
  expect(result.broken).toBeUndefined();
  expect(result.cleared).toBeUndefined();
  expect(result.unavailable).toBe(false);
});

test("saved account library stays browsable offline and refreshes on reconnection", async ({
  page,
}) => {
  await page.clock.install();
  await page.route("**/src/services/library.ts", (route) =>
    route.fulfill({
      contentType: "application/javascript",
      body: `export async function getLibrary() { window.refreshCalls = (window.refreshCalls || 0) + 1; if (window.failRefresh) throw new Error("Unavailable"); return window.accountFixture; }`,
    }),
  );
  await page.goto("/");
  await page.locator("#auth-demo").click();
  await page.evaluate(async () => {
    const path = "/src/app/storage.ts";
    const storage = await import(/* @vite-ignore */ path);
    const albums = storage.readAlbums();
    sessionStorage.setItem(
      "offline-fixture",
      JSON.stringify({
        albums,
        artists: storage.readArtistCatalog(albums),
        genres: storage.readGenreCatalog(albums),
        instruments: storage.readInstrumentCatalog(albums),
      }),
    );
  });
  await page.reload();
  await page.evaluate(async () => {
    const controllerPath = "/src/app/controller.ts";
    const appPath = "/src/app/app.ts";
    const cachePath = "/src/app/libraryCache.ts";
    const { initializeApp } = await import(/* @vite-ignore */ controllerPath);
    const { renderApp } = await import(/* @vite-ignore */ appPath);
    const { writeLibraryCache } = await import(/* @vite-ignore */ cachePath);
    const data = JSON.parse(sessionStorage.getItem("offline-fixture")!);
    (window as any).accountFixture = data;
    writeLibraryCache("offline-account", data, Date.now() - 60_000);
    Object.defineProperty(navigator, "onLine", {
      configurable: true,
      get: () => (window as any).testOnline ?? false,
    });
    document.querySelector("#app")!.innerHTML = renderApp(true);
    initializeApp(data, "offline-account", true);
  });
  await expect(page.locator(".connection-banner")).toContainText(
    "Offline · synced 1 minute ago",
  );
  await page.clock.fastForward(60 * 60_000);
  await expect(page.locator(".connection-banner")).toHaveText(
    "Offline · synced 1 hour ago",
  );
  await page.clock.fastForward(3 * 24 * 60 * 60_000);
  await expect(page.locator(".connection-banner")).toHaveText(
    "Offline · synced 3 days ago",
  );
  expect(
    await page.locator(".connection-banner").evaluate((element) => {
      const style = getComputedStyle(element);
      return {
        position: style.position,
        background: style.backgroundColor,
        aboveHeader: element.nextElementSibling?.classList.contains("masthead"),
      };
    }),
  ).toEqual({
    position: "sticky",
    background: "rgb(56, 56, 56)",
    aboveHeader: true,
  });
  await expect(page.locator('[data-action="add"]')).toBeDisabled();
  await page.locator('a[href^="#album/"]').first().click();
  await expect(page.locator('[data-action="edit"]')).toBeDisabled();
  expect(await page.evaluate(() => (window as any).refreshCalls || 0)).toBe(0);
  await page.evaluate(() => {
    (window as any).testOnline = true;
    (window as any).failRefresh = true;
    window.dispatchEvent(new Event("online"));
  });
  await expect(page.locator(".connection-banner")).toContainText(
    "Couldn’t refresh",
  );
  await expect(page.locator('[data-action="edit"]')).toBeDisabled();
  await page.evaluate(() => {
    (window as any).failRefresh = false;
  });
  await page.getByRole("button", { name: "Retry", exact: true }).click();
  await expect(page.locator(".connection-banner")).toBeHidden();
  await expect(page.locator('[data-action="edit"]')).toBeEnabled();
  expect(
    await page.evaluate(
      () =>
        JSON.parse(localStorage.getItem("jazzlog-library-v1:offline-account")!)
          .syncedAt,
    ),
  ).toBeGreaterThan(123);
});
