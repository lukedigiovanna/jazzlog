import { test, expect } from "@playwright/test";

test("production PWA opens an account snapshot offline without waiting for expired-token refresh", async ({
  page,
  context,
}) => {
  await page.goto("/");
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller) {
      await new Promise<void>((resolve) =>
        navigator.serviceWorker.addEventListener(
          "controllerchange",
          () => resolve(),
          { once: true },
        ),
      );
    }
    const accountId = "offline-pwa-account";
    localStorage.setItem(
      "sb-127-auth-token",
      JSON.stringify({
        access_token: "expired-test-token",
        refresh_token: "test-refresh-token",
        expires_at: 1,
        token_type: "bearer",
        user: { id: accountId },
      }),
    );
    localStorage.setItem(
      "jazzlog-library-v1:" + accountId,
      JSON.stringify({
        version: 1,
        accountId,
        syncedAt: 123,
        data: {
          albums: [
            {
              id: "offline-album",
              title: "Elevator listening",
              sortTitle: null,
              releaseYear: 1959,
              artworkUrl: "/art/kind-of-blue.svg",
              musicbrainzReleaseGroupId: null,
              createdAt: "2020-01-01",
              updatedAt: "2020-01-01",
              artists: [],
              genres: [],
              instruments: [],
              links: [],
              listeningEntries: [],
            },
          ],
          artists: [],
          genres: [],
          instruments: [],
        },
      }),
    );
  });
  await context.setOffline(true);
  await page.reload();
  await expect(
    page.getByText("Elevator listening", { exact: true }).first(),
  ).toBeVisible();
  await expect(page.locator(".connection-banner")).toContainText("Offline");
  await page.locator('a[href="#album/offline-album"]').first().click();
  await expect(page.locator("#page-title")).toHaveText("Elevator listening");
  await expect(page.locator('[data-action="edit"]')).toBeDisabled();
  const imageLoaded = await page
    .locator(".cover img")
    .evaluateAll((images) =>
      images.some(
        (image) =>
          (image as HTMLImageElement).complete &&
          (image as HTMLImageElement).naturalWidth > 0,
      ),
    );
  expect(imageLoaded).toBe(true);
});
