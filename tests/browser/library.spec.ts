import { test, expect, type Page } from "@playwright/test";

async function enterDemo(page: Page) {
  await page.goto("/");
  await page.locator("#auth-demo").click();
  await expect(page.locator("#library-query")).toBeVisible();
}

async function reloadDemo(page: Page) {
  await page.reload();
  await page.locator("#auth-demo").click();
}

async function openAlbum(page: Page) {
  await page.locator('a[href^="#album/"]').first().click();
  await expect(page.locator("#page-title")).toBeVisible();
}

test.beforeEach(async ({ page }) => {
  // Metadata requests must never depend on live network responses.
  await page.route(
    /https:\/\/(musicbrainz\.org|coverartarchive\.org|.*\.wikipedia\.org|.*\.wikimedia\.org|www\.wikidata\.org)\//,
    (route) => route.abort(),
  );
  await enterDemo(page);
});

test("album fields and music links survive save and reload", async ({
  page,
}) => {
  await openAlbum(page);
  await page.locator('[data-action="edit"]').click();
  await page.locator('[name="title"]').fill('Regression "album" & friends');
  await page.locator('[name="label"]').fill("Test label");
  await page.locator('[data-action="add-link"]').click();
  await page
    .locator('[name="linkUrl"]')
    .last()
    .fill("https://example.com/record?a=1&b=2");
  await page.locator('[name="linkLabel"]').last().fill("Test music link");
  await page.locator('#album-form button[type="submit"]').click();
  await expect(page.locator("#editor")).not.toBeVisible();
  await reloadDemo(page);
  await expect(page.locator("#page-title")).toHaveText(
    'Regression "album" & friends',
  );
  await expect(
    page.getByRole("link", {
      name: "Test music link (opens in a new tab)",
      exact: true,
    }),
  ).toHaveAttribute("href", "https://example.com/record?a=1&b=2");
  await page.locator('[data-action="edit"]').click();
  await expect(page.locator('[name="label"]')).toHaveValue("Test label");
});

test("new listening entry survives reload", async ({ page }) => {
  await openAlbum(page);
  await page.locator('[data-action="listen"]').first().click();
  await page.locator('[name="date"]').fill("2026-01-15");
  await page.locator('[name="rating"][value="8"]').check();
  await page.locator('[name="notes"]').fill("Regression listening notes");
  await page.locator('#listen-form button[type="submit"]').click();
  await expect(page.locator("#editor")).not.toBeVisible();
  await reloadDemo(page);
  await expect(
    page.getByText("Regression listening notes", { exact: true }),
  ).toBeVisible();
  await page
    .locator('[data-action="edit-listen"]')
    .filter({ hasText: "Regression listening notes" })
    .click();
  await expect(page.locator('[name="date"]')).toHaveValue("2026-01-15");
  await expect(page.locator('[name="rating"][value="8"]')).toBeChecked();
});

test("unchanged dialog dismisses with Escape and restores focus", async ({
  page,
}) => {
  await openAlbum(page);
  const opener = page.locator('[data-action="edit"]');
  await opener.click();
  await expect(page.locator("#editor")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator("#editor")).not.toBeVisible();
  await expect(opener).toBeFocused();
});

test("unfinished album edits recover after reload without changing saved data", async ({
  page,
}) => {
  await openAlbum(page);
  const title = await page.locator("#page-title").textContent();
  await page.locator('[data-action="edit"]').click();
  await page.locator('[name="title"]').fill("Unfinished regression draft");
  await expect(page.locator("[data-draft-status]")).toHaveText(
    "Draft saved on this device",
  );
  await reloadDemo(page);
  await expect(page.locator('[name="title"]')).toHaveValue(
    "Unfinished regression draft",
  );
  await expect(page.locator("#page-title")).toHaveText(title!);
  await page.locator('#album-form [data-action="close"]').click();
  await page.locator("[data-draft-discard]").click();
  await page.locator('[data-action="edit"]').click();
  await expect(page.locator('[name="title"]')).toHaveValue(title!);
});

test("new genre associations survive reload and remain in the catalog after removal", async ({
  page,
}) => {
  await openAlbum(page);
  await page.locator('[data-action="edit"]').click();
  await page.locator("#genre-query").fill("Regression genre");
  await page.locator('[data-action="create-genre"]').click();
  await expect(page.locator("#genre-selected")).toContainText(
    "Regression genre",
  );
  await page.locator('#album-form button[type="submit"]').click();
  await expect(page.locator("#editor")).not.toBeVisible();
  await reloadDemo(page);
  const genre = page.getByRole("link", {
    name: "Regression genre",
    exact: true,
  });
  await expect(genre).toBeVisible();
  const genreHash = await genre.getAttribute("href");
  await page.locator('[data-action="edit"]').click();
  await page
    .getByRole("button", { name: "Remove Regression genre", exact: true })
    .click();
  await page.locator('#album-form button[type="submit"]').click();
  await expect(page.locator("#editor")).not.toBeVisible();
  await reloadDemo(page);
  await expect(genre).toHaveCount(0);
  await page.goto("/" + genreHash);
  await expect(page.locator("#page-title")).toHaveText("Regression genre");
});

test("metadata search can retry a failure and review an import before saving", async ({
  page,
}) => {
  let requests = 0;
  await page.route(
    "https://musicbrainz.org/ws/2/release-group*",
    async (route) => {
      requests++;
      if (requests === 1) {
        await route.fulfill({ status: 503, body: "unavailable" });
        return;
      }
      await route.fulfill({
        json: {
          "release-groups": [
            {
              id: "a1111111-1111-4111-8111-111111111111",
              title: "Regression import",
              "first-release-date": "1960-01-01",
              "primary-type": "Album",
              "artist-credit": [
                {
                  name: "Regression artist",
                  artist: {
                    id: "b1111111-1111-4111-8111-111111111111",
                    name: "Regression artist",
                  },
                },
              ],
            },
          ],
        },
      });
    },
  );
  await page.locator("#top-add").click();
  await page.locator("#catalog-query").fill("Regression import");
  await expect(page.locator("#catalog-count")).toHaveText("Search failed");
  await page.locator('[data-action="retry-search"]').click();
  await page.locator('[data-action="pick"]').click();
  await expect(page.locator('[name="title"]')).toHaveValue("Regression import");
  await expect(page.locator("#artist-selected")).toContainText(
    "Regression artist",
  );
  await page.locator('[name="title"]').fill("Reviewed regression import");
  await page.locator('#album-form button[type="submit"]').click();
  await expect(page.locator("#editor")).not.toBeVisible();
  await reloadDemo(page);
  await expect(page.locator("#page-title")).toHaveText(
    "Reviewed regression import",
  );
  await expect(page.locator("main")).toContainText("Regression artist");
  expect(requests).toBe(2);
});
