import { test, expect } from "@playwright/test";

test("account saves roll back, retain input for retry, and reconcile server timestamps", async ({
  page,
}) => {
  await page.route("**/src/services/supabase.ts", (route) =>
    route.fulfill({
      contentType: "application/javascript",
      body: `export const supabase = { rpc: async (name, payload) => {
      window.savePayload = payload;
      return new Promise(resolve => { window.resolveSave = resolve; });
    }};`,
    }),
  );
  await page.goto("/");
  await page.locator("#auth-demo").click();
  await page.evaluate(async () => {
    const storagePath = "/src/app/storage.ts";
    const storage = await import(/* @vite-ignore */ storagePath);
    // Reload the document to avoid the demo controller's document listeners.
    const albums = storage.readAlbums();
    sessionStorage.setItem(
      "account-fixture",
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
    const { initializeApp } = await import(/* @vite-ignore */ controllerPath);
    const { renderApp } = await import(/* @vite-ignore */ appPath);
    document.querySelector("#app")!.innerHTML = renderApp(true);
    const data = JSON.parse(sessionStorage.getItem("account-fixture")!);
    const render = initializeApp(data, "test-account");
    window.addEventListener("hashchange", () => render());
  });
  await page.locator('a[href^="#album/"]').first().click();
  const original = await page.locator("#page-title").textContent();
  await page.locator('[data-action="edit"]').click();
  await page.locator('[name="title"]').fill("Account candidate");
  await page.locator('#album-form button[type="submit"]').click();
  await expect(page.locator("#editor")).toHaveAttribute("aria-busy", "true");
  await expect(page.locator('[name="title"]')).toBeDisabled();
  await page.evaluate(() => {
    location.hash = "";
  });
  await expect(page.locator("main")).not.toContainText("Account candidate");
  await page.evaluate(() =>
    (window as any).resolveSave({
      data: null,
      error: { message: "Rejected test save" },
    }),
  );
  await expect(page.locator("#form-error")).toContainText("Rejected test save");
  await expect(page.locator('[name="title"]')).toHaveValue("Account candidate");
  await expect(page.locator('[name="title"]')).toBeEnabled();
  await expect(page.locator("main")).toContainText(original!);
  // Existing navigation closes the dialog while retaining its form. Reopen
  // that same form to characterize retry without rebuilding its candidate.
  await page.evaluate(() => {
    (document.querySelector("#editor") as HTMLDialogElement).showModal();
    delete (window as any).savePayload;
  });
  await page.locator('#album-form button[type="submit"]').click();
  await expect(page.locator("#editor")).toHaveAttribute("aria-busy", "true");
  await page.waitForFunction(() => !!(window as any).savePayload);
  await page.evaluate(() => {
    const w = window as any;
    const row = w.savePayload.changes.albums.saved[0];
    w.resolveSave({
      error: null,
      data: {
        albums: [
          {
            ...row,
            created_at: "2020-01-01T00:00:00Z",
            updated_at: "2030-02-03T00:00:00Z",
          },
        ],
      },
    });
  });
  await expect(page.locator("#editor")).not.toBeVisible();
  await expect(page.locator("#page-title")).toHaveText("Account candidate");
  await page.locator('[data-action="edit"]').click();

  // Server timestamps become the editor's source model (and therefore its draft source).
  await expect
    .poll(async () =>
      page.evaluate(() =>
        Object.values(localStorage).some((value) =>
          value.includes("2030-02-03T00:00:00Z"),
        ),
      ),
    )
    .toBe(true);
});

test("library owners isolate account baselines and distinguish unavailable demo storage", async ({
  page,
}) => {
  await page.goto("/");
  const result = await page.evaluate(async () => {
    const modulePath = "/src/app/libraryState.ts";
    const { createLibraryState } = await import(/* @vite-ignore */ modulePath);
    const empty = { albums: [], artists: [], genres: [], instruments: [] };
    const baselines: any[] = [];
    const account = createLibraryState(
      structuredClone(empty),
      async (before: any, next: any) => {
        baselines.push(structuredClone(before));
        return next;
      },
    );
    const other = createLibraryState(structuredClone(empty));
    account.data.artists.push({ id: "one", name: "First account" });
    const saved = await account.save();
    account.data.artists[0].name = "Updated account";
    await account.save();
    const demo = createLibraryState();
    const title = (demo.data.albums[0].title = "In-memory edit");
    Storage.prototype.setItem = () => {
      throw new Error("Storage blocked");
    };
    const volatile = await demo.save();
    return {
      saved,
      volatile,
      title: demo.data.albums[0].title,
      other: other.data,
      baselines,
    };
  });
  expect(result.saved).toEqual({ status: "saved" });
  expect(result.volatile).toEqual({ status: "volatile" });
  expect(result.title).toBe("In-memory edit");
  expect(result.other.artists).toEqual([]);
  expect(result.baselines[0].artists).toEqual([]);
  expect(result.baselines[1].artists[0].name).toBe("First account");
});
