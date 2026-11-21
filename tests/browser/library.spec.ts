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

test("catalog album headings keep compact layout toggles on the title row", async ({
  page,
}) => {
  for (const width of [1280, 393, 320]) {
    await page.setViewportSize({ width, height: 850 });
    for (const catalog of ["artists", "genres"]) {
      await page.locator(`[data-nav="${catalog}"]`).click();
      const singular = catalog.slice(0, -1);
      await page.locator(`main a[href^="#${singular}/"]`).first().click();
      const heading = page.locator(".album-list-heading");
      await expect(heading).toBeVisible();
      const title = await heading.locator(".detail-heading").boundingBox();
      const toggle = await heading.locator(".layout-toggle").boundingBox();
      expect(toggle!.width).toBeLessThan(100);
      expect(
        Math.abs(title!.y + title!.height / 2 - toggle!.y - toggle!.height / 2),
      ).toBeLessThan(1);
      await heading
        .getByRole("button", { name: "List view", exact: true })
        .click();
      await expect(
        page
          .locator(".album-list-heading")
          .getByRole("button", { name: "List view", exact: true }),
      ).toHaveAttribute("aria-pressed", "true");
      await page
        .locator(".album-list-heading")
        .getByRole("button", { name: "Grid view", exact: true })
        .click();
      await expect(
        page
          .locator(".album-list-heading")
          .getByRole("button", { name: "Grid view", exact: true }),
      ).toHaveAttribute("aria-pressed", "true");
    }
  }
});

test("library heading matches catalog typography and spacing", async ({
  page,
}) => {
  for (const width of [1280, 393]) {
    await page.setViewportSize({ width, height: 850 });
    const measureHeading = () =>
      page.locator("#page-title").evaluate((heading) => {
        const style = getComputedStyle(heading);
        const toolbar = heading
          .closest("section")!
          .querySelector(".search-field")!;
        return {
          font: style.font,
          letterSpacing: style.letterSpacing,
          top: heading.getBoundingClientRect().top,
          gap:
            toolbar.getBoundingClientRect().top -
            heading.getBoundingClientRect().bottom,
        };
      });
    const library = await measureHeading();
    await page.locator('[data-nav="artists"]').click();
    await expect(page.locator("#page-title")).toHaveText("Artists");
    expect(await measureHeading()).toEqual(library);
    await page.locator('[data-nav="library"]').click();
    await expect(page.locator("#page-title")).toHaveText("Your library");
  }
});

test("library toolbar stays on one row and the sort dropdown orders albums", async ({
  page,
}) => {
  for (const width of [1280, 640, 393, 320]) {
    await page.setViewportSize({ width, height: 850 });
    const search = await page
      .locator(".library-toolbar .search-field")
      .boundingBox();
    const filters = await page
      .locator(".library-toolbar .genre-filter-dropdown > summary")
      .boundingBox();
    const sort = await page.locator(".library-sort").boundingBox();

    expect(search).not.toBeNull();
    expect(filters).not.toBeNull();
    expect(sort).not.toBeNull();
    expect(sort!.height).toBe(filters!.height);
    expect(sort!.y).toBe(filters!.y);
    expect(Math.abs(search!.y - sort!.y)).toBeLessThanOrEqual(1);
    expect(sort!.x + sort!.width).toBeLessThanOrEqual(width);
    await expect(page.locator(".library-sort-text")).toBeVisible({
      visible: width > 480,
    });

    const expectNoOverflow = async () => {
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth),
      ).toBe(width);
    };

    await expectNoOverflow();
    await page
      .locator(".library-toolbar .genre-filter-dropdown > summary")
      .click();
    const panel = await page
      .locator(".library-toolbar .genre-filter-panel")
      .boundingBox();
    expect(panel!.x).toBeGreaterThanOrEqual(0);
    expect(panel!.x + panel!.width).toBeLessThanOrEqual(width);
    await expectNoOverflow();
    await page
      .locator(".library-toolbar .genre-filter-dropdown > summary")
      .click();
    await page.locator(".library-sort").click();
    const year = page.locator('[data-sort="year"]');
    await year.click();
    await expect(page.locator(".library-sort-dropdown")).toHaveAttribute(
      "open",
    );
    await page.keyboard.press("Escape");
    await expectNoOverflow();
  }

  await page.locator(".library-sort").click();
  await page.locator('[data-sort="title"]').click();
  await page.keyboard.press("Escape");
  const titles = await page
    .locator("#library-results .album-title strong")
    .allTextContents();
  expect(titles.length).toBeGreaterThan(1);
  expect(titles).toEqual([...titles].sort((a, b) => a.localeCompare(b)));

  await page.locator(".library-sort").click();
  await page.keyboard.press("Escape");
  await expect(page.locator(".library-sort-dropdown")).not.toHaveAttribute(
    "open",
  );
  await expect(page.locator(".library-sort")).toBeFocused();
  await page.locator(".library-sort").click();
  await page.locator("#library-query").click();
  await expect(page.locator(".library-sort-dropdown")).not.toHaveAttribute(
    "open",
  );

  await page.locator('[data-nav="artists"]').click();
  await page.locator('[data-nav="library"]').click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(
    320,
  );
  await page.locator(".library-sort").click();
  await expect(page.locator('[data-sort="title"]')).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await page.keyboard.press("Escape");
  await page.reload();
  await page.locator("#auth-demo").click();
  await expect(page.locator("#library-query")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(
    320,
  );
});

test("sort categories cycle both directions and off, replacing the active category", async ({
  page,
}) => {
  const titles = page.locator("#library-results .album-title strong");
  const dropdown = page.locator(".library-sort-dropdown");
  await page.locator(".library-sort").click();
  await expect(page.locator('[data-sort="updated"]')).toHaveAccessibleName(
    "Last updated, descending",
  );
  await page.locator('[data-sort="updated"]').click();
  const original = await titles.allTextContents();

  for (const category of ["recent", "updated", "title", "rating", "year"]) {
    const choice = page.locator(`[data-sort="${category}"]`);
    await choice.click();
    await expect(choice).toHaveAccessibleName(/, ascending$/);
    await expect(choice.locator(".ascending svg")).toHaveCount(1);
    await expect(
      page.locator('.library-sort-choice[aria-pressed="true"]'),
    ).toHaveCount(1);
    await expect(dropdown).toHaveAttribute("open");
    if (category === "title")
      expect(await titles.allTextContents()).toEqual(
        [...original].sort((a, b) => a.localeCompare(b)),
      );

    await page.keyboard.press("Enter");
    await expect(choice).toHaveAccessibleName(/, descending$/);
    await expect(choice.locator(".descending svg")).toHaveCount(1);
    if (category === "title")
      expect(await titles.allTextContents()).toEqual(
        [...original].sort((a, b) => b.localeCompare(a)),
      );

    await choice.click();
    await expect(choice).toHaveAccessibleName(/, off$/);
    await expect(
      page.locator('.library-sort-choice[aria-pressed="true"]'),
    ).toHaveCount(0);
    expect(await titles.allTextContents()).toEqual(original);
  }

  await page.locator('[data-sort="title"]').click();
  await page.locator('[data-sort="rating"]').click();
  await expect(page.locator('[data-sort="title"]')).toHaveAttribute(
    "aria-pressed",
    "false",
  );
  await expect(page.locator('[data-sort="rating"]')).toHaveAccessibleName(
    "Rating, ascending",
  );
  await expect(
    page.locator('.library-sort-choice[aria-pressed="true"]'),
  ).toHaveCount(1);
});

test("unrated albums use muted stars in the library and omit the detail rating", async ({
  page,
}) => {
  await page.getByRole("button", { name: "Add album", exact: true }).click();
  await page.locator('[data-action="manual"]').click();
  await page.locator('[name="title"]').fill("Unrated stars experiment");
  await page.locator('#album-form button[type="submit"]').click();
  await expect(page.locator("#editor")).not.toBeVisible();
  await expect(page.locator(".detail-rating")).toHaveCount(0);
  await page.goto("/#");

  const unratedCard = page
    .locator(".album-card")
    .filter({ has: page.locator(".unrated") })
    .first();
  const rating = unratedCard.locator(".rating");
  await expect(rating).toHaveAttribute("aria-label", "Unrated");
  await expect(rating).toHaveText("");
  await expect(rating.locator(".star")).toHaveCount(5);
  await expect(rating.locator(".star-fill").first()).toHaveAttribute(
    "style",
    "--fill:0%",
  );
  await expect(rating.locator(".stars")).toHaveCSS("opacity", "1");
  const star = rating.locator(".star").first();
  const starColor = await star.evaluate(
    (element) => getComputedStyle(element).color,
  );
  await expect(star.locator(":scope > svg")).toHaveCSS("stroke", starColor);
  const ratedStar = page.locator(".rating:not(.unrated) .star").first();
  await expect(ratedStar).toHaveCSS("color", starColor);
  const ratedFillColor = await ratedStar
    .locator(".star-fill")
    .evaluate((element) => getComputedStyle(element).color);
  await expect(ratedStar.locator(".star-fill svg")).toHaveCSS(
    "stroke",
    ratedFillColor,
  );
  await expect(star.locator(":scope > svg")).toHaveCSS("fill-opacity", "0.3");
  await expect(star.locator(":scope > svg")).toHaveCSS("stroke-opacity", "1");
  await unratedCard.click();
  await expect(page.locator(".album-hero")).toBeVisible();
  await expect(page.locator(".detail-rating")).toHaveCount(0);
  await expect(page.getByText("Unrated", { exact: true })).toHaveCount(0);
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
  await expect(page.locator('[name="vinylStatus"]')).toHaveCount(0);
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

test("listening stars preview half-star ratings with a mouse", async ({
  page,
  isMobile,
}) => {
  await openAlbum(page);
  await page.locator('[data-action="listen"]').first().click();

  const threeAndAHalf = page.locator('[name="rating"][value="7"]');
  const fills = page.locator("#rating-stars .star-fill");
  if (isMobile) {
    await threeAndAHalf.tap();
  } else {
    await threeAndAHalf.hover();
    await expect(threeAndAHalf).not.toBeChecked();
    await expect(fills.nth(0)).toHaveCSS("clip-path", "inset(0px 0% 0px 0px)");
    await expect(fills.nth(3)).toHaveCSS("clip-path", "inset(0px 50% 0px 0px)");
    await expect(fills.nth(4)).toHaveCSS(
      "clip-path",
      "inset(0px 100% 0px 0px)",
    );
    await expect(fills.nth(3)).toHaveCSS("opacity", "0.65");
    await threeAndAHalf.click();
    await expect(fills.nth(3)).toHaveCSS("opacity", "1");
    const twoStars = page.locator('[name="rating"][value="4"]');
    await twoStars.hover();
    await expect(fills.nth(3)).toHaveCSS(
      "clip-path",
      "inset(0px 100% 0px 0px)",
    );
    await page.locator('[name="notes"]').hover();
  }

  await expect(threeAndAHalf).toBeChecked();
  await expect(fills.nth(3)).toHaveCSS("clip-path", "inset(0px 50% 0px 0px)");
  await expect(fills.nth(3)).toHaveCSS("opacity", "1");
});

test("listening draft status appears on hover or tap", async ({
  page,
  isMobile,
}) => {
  await openAlbum(page);
  await page.locator('[data-action="listen"]').first().click();
  const row = page.locator(".listen-intro");
  const icon = row.getByRole("button", { name: "Draft status" });
  const message = row.locator("[data-draft-status]");
  const notes = page.locator('[name="notes"]');
  await notes.fill("An unfinished listening note");
  await expect(message).toHaveText("Draft saved on this device");
  await expect(message).toHaveCSS("opacity", "0");

  if (isMobile) {
    await icon.tap();
    await expect(message).toHaveCSS("opacity", "1");
    await icon.tap();
  } else {
    await icon.hover();
    await expect(message).toHaveCSS("opacity", "1");
    await notes.hover();
    await expect(message).toHaveCSS("opacity", "0");
    await page.locator("#dialog-title").focus();
    await page.keyboard.press("Tab");
    await page.keyboard.press("Tab");
    await expect(icon).toBeFocused();
    await expect(message).toHaveCSS("opacity", "1");
    await page.keyboard.press("Tab");
  }

  await expect(message).toHaveCSS("opacity", "0");
});

test("note-only listens survive reload and preserve the latest rating", async ({
  page,
}) => {
  await page.getByRole("button", { name: "Add album", exact: true }).click();
  await page.locator('[data-action="manual"]').click();
  await page.locator('[name="title"]').fill("Notes-only regression album");
  await page.locator('#album-form button[type="submit"]').click();
  await page.locator('[data-action="listen"]').first().click();
  await page.locator('[name="date"]').fill("2026-01-15");
  await page.locator('[name="rating"][value="8"]').check();
  await page.getByRole("button", { name: "Save listen" }).click();

  await page.locator('[data-action="listen"]').first().click();
  const selectedRating = page.locator('[name="rating"]:checked');
  await expect(page.locator('[name="rating"]')).toHaveCount(10);
  await expect(selectedRating).toHaveCount(0);
  await page.locator('[name="notes"]').fill("A thought about this album");
  await page.getByRole("button", { name: "Save listen" }).click();
  await reloadDemo(page);

  const entry = page
    .locator('[data-action="edit-listen"]')
    .filter({ hasText: "A thought about this album" });
  await expect(entry.locator(".rating")).toHaveAttribute(
    "aria-label",
    "Unrated",
  );
  await expect(page.locator(".detail-rating .rating")).toHaveAttribute(
    "aria-label",
    "4 out of 5 stars",
  );

  await entry.click();
  await expect(selectedRating).toHaveCount(0);
  await page.locator('[name="rating"][value="10"]').check();
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.locator(".detail-rating .rating")).toHaveAttribute(
    "aria-label",
    "5 out of 5 stars",
  );

  await entry.click();
  const fiveStars = page.locator('[name="rating"][value="10"]');
  await fiveStars.press("Space");
  await expect(selectedRating).toHaveCount(0);
  await fiveStars.check();
  await fiveStars.click();
  await expect(selectedRating).toHaveCount(0);
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(entry.locator(".rating")).toHaveAttribute(
    "aria-label",
    "Unrated",
  );
  await expect(page.locator(".detail-rating .rating")).toHaveAttribute(
    "aria-label",
    "4 out of 5 stars",
  );
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

test("dirty editor supports continue, keep, resume, and discard", async ({
  page,
}) => {
  await openAlbum(page);
  await page.locator('[data-action="edit"]').click();
  await page.locator('[name="title"]').fill("Kept draft");
  await page.locator('#album-form [data-action="close"]').click();
  await page.locator("[data-draft-continue]").click();
  await expect(page.locator('[name="title"]')).toHaveValue("Kept draft");
  await page.locator('#album-form [data-action="close"]').click();
  await page.locator("[data-draft-keep]").click();
  await expect(page.locator("#editor")).not.toBeVisible();
  await page.getByRole("button", { name: "Resume draft" }).click();
  await expect(page.locator('[name="title"]')).toHaveValue("Kept draft");
  await page.locator('#album-form [data-action="close"]').click();
  await page.locator("[data-draft-discard]").click();
  await expect(
    page.getByRole("button", { name: "Resume draft" }),
  ).not.toBeVisible();
});

test("navigation retains an unfinished edit", async ({ page }) => {
  await openAlbum(page);
  await page.locator('[data-action="edit"]').click();
  await page.locator('[name="title"]').fill("Navigation draft");
  await page.evaluate(() => {
    location.hash = "#artists";
  });
  await expect(page.locator("#editor")).not.toBeVisible();
  await page.getByRole("button", { name: "Resume draft" }).click();
  await expect(page.locator('[name="title"]')).toHaveValue("Navigation draft");
});

test("Tab wraps within the editor and backdrop drags do not dismiss", async ({
  page,
}) => {
  await openAlbum(page);
  await page.locator('[data-action="edit"]').click();
  const first = page.locator("#editor .close");
  const last = page.locator('#album-form button[type="submit"]');
  await last.focus();
  await page.keyboard.press("Tab");
  await expect(first).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(last).toBeFocused();
  const bounds = await page.locator("#editor").boundingBox();
  await page.mouse.move(bounds!.x + 20, bounds!.y + 20);
  await page.mouse.down();
  await page.mouse.move(1, 1);
  await page.mouse.up();
  await expect(page.locator("#editor")).toBeVisible();
  await page.mouse.click(1, 1);
  await expect(page.locator("#editor")).not.toBeVisible();
});

test("picker accepts keyboard and pointer selection once", async ({
  page,
  isMobile,
}) => {
  await openAlbum(page);
  await page.locator('[data-action="edit"]').click();
  await page.locator("#genre-query").fill("Keyboard genre");
  await page.keyboard.press("Enter");
  await expect(page.locator("#genre-selected")).toContainText("Keyboard genre");
  await page.locator("#genre-query").fill("Pointer genre");
  const option = page.locator('[data-action="create-genre"]');
  if (isMobile) await option.tap();
  else await option.click();
  await expect(
    page.getByRole("button", { name: "Remove Pointer genre", exact: true }),
  ).toHaveCount(1);
});

test("blocked draft storage keeps the dirty editor open", async ({ page }) => {
  await page.evaluate(() => {
    Storage.prototype.setItem = () => {
      throw new DOMException("Blocked", "SecurityError");
    };
  });
  await openAlbum(page);
  await page.locator('[data-action="edit"]').click();
  await page.locator('[name="title"]').fill("Unsaved draft");
  await expect(page.locator("[data-draft-status]")).toHaveText(
    "Draft could not be saved on this device",
  );
  await page.locator('#album-form [data-action="close"]').click();
  await page.locator("[data-draft-keep]").click();
  await expect(page.locator("#editor")).toBeVisible();
  await page.locator("[data-draft-discard]").click();
});

test("drafts from another account do not restore in demo mode", async ({
  page,
}) => {
  await openAlbum(page);
  await page.locator('[data-action="edit"]').click();
  await page.locator('[name="title"]').fill("Private account draft");
  await expect(page.locator("[data-draft-status]")).toHaveText(
    "Draft saved on this device",
  );
  await page.evaluate(() => {
    localStorage.setItem(
      "sleeve:editor-draft:v1:other-account",
      localStorage.getItem("sleeve:editor-draft:v1:demo")!,
    );
    localStorage.removeItem("sleeve:editor-draft:v1:demo");
    // Prevent pagehide from saving the demo edit again.
    document.querySelector<HTMLDialogElement>("#editor")!.close();
  });
  await reloadDemo(page);
  await expect(page.locator("#editor")).not.toBeVisible();
  await expect(
    page.getByRole("button", { name: "Resume draft" }),
  ).not.toBeVisible();
  expect(
    await page.evaluate(() =>
      localStorage.getItem("sleeve:editor-draft:v1:other-account"),
    ),
  ).toContain("Private account draft");
});

test("dialog mount and disposal remove listeners and queued work", async ({
  page,
}) => {
  const result = await page.evaluate(async () => {
    // Load the same module as the application through Vite.
    const modulePath = "/src/app/dialog.ts";
    const { Dialog } = await import(/* @vite-ignore */ modulePath);
    const editor = document.createElement("dialog");
    document.body.append(editor);
    let dismissals = 0;
    let rendered = 0;
    const options = {
      editor,
      main: document.querySelector("main")!,
      formState: () => "",
      onRendered: () => {
        rendered++;
      },
      dismissDialog: () => {
        dismissals++;
      },
      updateArtists: () => {},
      updateGenres: () => {},
      onClose: () => {},
      routeHash: () => location.hash,
    };
    const first = new Dialog(options);
    first.mount();
    first.mount();
    editor.dispatchEvent(new Event("cancel", { cancelable: true }));
    first.showDialog("Test", "", "#dialog-title");
    first.dispose();
    editor.close();
    await Promise.resolve();
    editor.dispatchEvent(new Event("cancel", { cancelable: true }));
    const second = new Dialog(options);
    second.mount();
    editor.dispatchEvent(new Event("cancel", { cancelable: true }));
    second.dispose();
    editor.remove();
    return { dismissals, rendered };
  });
  expect(result).toEqual({ dismissals: 2, rendered: 0 });
});

test("listening edits and deletion persist independently of other entries", async ({
  page,
}) => {
  await openAlbum(page);
  await page.locator('[data-action="listen"]').first().click();
  await page.locator('[name="rating"][value="6"]').check();
  await page.locator('[name="notes"]').fill("Entry to edit");
  await page.locator('#listen-form button[type="submit"]').click();
  await page
    .locator('[data-action="edit-listen"]')
    .filter({ hasText: "Entry to edit" })
    .click();
  await page.locator('[name="rating"][value="9"]').check();
  await page.locator('[name="notes"]').fill("Edited entry");
  await page.locator('#listen-form button[type="submit"]').click();
  await reloadDemo(page);
  const entries = page.locator('[data-action="edit-listen"]');
  const count = await entries.count();
  await entries.filter({ hasText: "Edited entry" }).click();
  await expect(page.locator('[name="rating"][value="9"]')).toBeChecked();
  await page.getByText("Delete listening entry", { exact: true }).click();
  await page.locator('[data-action="delete-listen"]').click();
  await expect(page.locator("#editor")).not.toBeVisible();
  await reloadDemo(page);
  await expect(entries).toHaveCount(count - 1);
  await expect(page.getByText("Edited entry", { exact: true })).toHaveCount(0);
});

test("catalog artist and instrument editors validate and retain details", async ({
  page,
}) => {
  await page.goto("/#artists");
  await page.locator('[data-action="new-catalog-artist"]').click();
  await page.locator('[name="artistName"]').fill("Catalog regression artist");
  await page.locator('[name="artistMbid"]').fill("invalid");
  await page.locator('#catalog-artist-form button[type="submit"]').click();
  await expect(page.locator("#form-error")).toContainText(
    "valid MusicBrainz artist ID",
  );
  await page.locator('[name="artistMbid"]').fill("");
  await page.locator('[name="country"]').fill("us");
  await page.locator('#catalog-artist-form button[type="submit"]').click();
  await expect(page.locator("#page-title")).toHaveText(
    "Catalog regression artist",
  );
  await reloadDemo(page);
  await page.locator('[data-action="edit-catalog-artist"]').click();
  await expect(page.locator('[name="country"]')).toHaveValue("US");
  await page.keyboard.press("Escape");
  await page.goto("/#instruments");
  await page.locator('[data-action="new-catalog-instrument"]').click();
  await page
    .locator('[name="instrumentName"]')
    .fill("Catalog regression instrument");
  const category = page.locator('[name="category"]').first();
  const categoryValue = await category.inputValue();
  await category.check();
  await page.locator('#catalog-instrument-form button[type="submit"]').click();
  await expect(page.locator("#page-title")).toHaveText(
    "Catalog regression instrument",
  );
  await reloadDemo(page);
  await page.locator('[data-action="edit-catalog-instrument"]').click();
  await expect(
    page.locator(`[name="category"][value="${categoryValue}"]`),
  ).toBeChecked();
  await page
    .locator('[name="instrumentName"]')
    .fill("Renamed regression instrument");
  await page.locator('#catalog-instrument-form button[type="submit"]').click();
  await expect(page.locator("#page-title")).toHaveText(
    "Renamed regression instrument",
  );
});

test("artist and instrument draft selections stay separate from committed catalogs", async ({
  page,
}) => {
  await openAlbum(page);
  await page.locator('[data-action="edit"]').click();
  await page.locator("#artist-query").fill("Draft only artist");
  await page.locator('[data-action="create-artist"]').click();
  await page.locator("#instrument-query").fill("Draft only instrument");
  await page.locator('[data-action="create-instrument"]').click();
  await reloadDemo(page);
  await expect(page.locator("#artist-selected")).toContainText(
    "Draft only artist",
  );
  await expect(page.locator("#instrument-selected")).toContainText(
    "Draft only instrument",
  );
  await page.locator('#album-form [data-action="close"]').click();
  await page.locator("[data-draft-discard]").click();
  await page.goto("/#artists");
  await page.locator("#artists-search").fill("Draft only artist");
  await expect(page.locator('main a[href^="#artist/"]')).toHaveCount(0);
  await page.goto("/#instruments");
  await page.locator("#instruments-search").fill("Draft only instrument");
  await expect(page.locator('main a[href^="#instrument/"]')).toHaveCount(0);
});

test("a delayed metadata result cannot replace a manual editor", async ({
  page,
}) => {
  let release!: () => void;
  let requested!: () => void;
  const waiting = new Promise<void>((resolve) => {
    requested = resolve;
  });
  const response = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route(
    "https://musicbrainz.org/ws/2/release-group*",
    async (route) => {
      requested();
      await response;
      await route.fulfill({ json: { "release-groups": [] } });
    },
  );
  await page.locator("#top-add").click();
  await page.locator("#catalog-query").fill("Delayed search");
  await waiting;
  await page.locator('[data-action="manual"]').click();
  await page.locator('[name="title"]').fill("Manual editor survives");
  const completed = page.waitForResponse(
    "https://musicbrainz.org/ws/2/release-group*",
  );
  release();
  await completed;
  await expect(page.locator('[name="title"]')).toHaveValue(
    "Manual editor survives",
  );
  await page.locator('#album-form button[type="submit"]').click();
  await expect(page.locator("#page-title")).toHaveText(
    "Manual editor survives",
  );
});

test("route previews match live lists and remounting handles each save once", async ({
  page,
}) => {
  // Start at the auth screen so this test owns the controller lifecycle.
  await page.goto("/");
  const previews = await page.evaluate(async () => {
    const appPath = "/src/app/app.ts";
    const controllerPath = "/src/app/controller.ts";
    const { renderApp } = await import(/* @vite-ignore */ appPath);
    const { initializeApp } = await import(/* @vite-ignore */ controllerPath);
    document.querySelector("#app")!.innerHTML = renderApp();
    const first = initializeApp();
    const results = [];
    for (const hash of ["#artists", "#genres", "#instruments", "#"]) {
      const changed = new Promise<void>((resolve) =>
        window.addEventListener("hashchange", () => resolve(), { once: true }),
      );
      location.hash = hash;
      await changed;
      const preview = first.renderPreview(hash);
      const live = document
        .querySelector("main")!
        .cloneNode(true) as HTMLElement;
      live.querySelector("#page-title")?.removeAttribute("tabindex");
      live
        .querySelectorAll("[id]")
        .forEach((element) => element.removeAttribute("id"));
      results.push({
        hash,
        same: preview.innerHTML === live.innerHTML,
        inert: preview.inert,
        hidden: preview.getAttribute("aria-hidden"),
        ids: preview.querySelectorAll("[id]").length,
      });
    }
    first.dispose();
    first.dispose();
    initializeApp();
    return results;
  });
  for (const preview of previews) {
    expect(preview).toEqual({
      hash: preview.hash,
      same: true,
      inert: true,
      hidden: "true",
      ids: 0,
    });
  }
  await openAlbum(page);
  await page.locator('[data-action="listen"]').first().click();
  await page.locator('[name="rating"][value="8"]').check();
  await page.locator('[name="notes"]').fill("Saved once after remount");
  await page.locator('#listen-form button[type="submit"]').click();
  await expect(page.locator("#editor")).not.toBeVisible();
  await expect(
    page
      .locator('[data-action="edit-listen"]')
      .filter({ hasText: "Saved once after remount" }),
  ).toHaveCount(1);
});

test("artist roles and order recover from drafts and survive save and removal", async ({
  page,
  isMobile,
}) => {
  await openAlbum(page);
  await page.locator('[data-action="edit"]').click();
  const originalNames = await page
    .locator("#artist-selected strong")
    .allTextContents();
  for (const name of ["First draft artist", "Second draft artist"]) {
    await page.locator("#artist-query").fill(name);
    const create = page.locator('[data-action="create-artist"]');
    if (isMobile) await create.tap();
    else await create.click();
  }

  const first = page
    .locator(".artist-credit-row")
    .filter({ hasText: "First draft artist" });
  await first.locator("select").selectOption("featured");
  await page
    .getByRole("button", {
      name: "Move Second draft artist earlier",
      exact: true,
    })
    .click();
  const expectedNames = [
    ...originalNames,
    "Second draft artist",
    "First draft artist",
  ];
  await expect(page.locator("#artist-selected strong")).toHaveText(
    expectedNames,
  );

  await reloadDemo(page);
  await expect(page.locator("#artist-selected strong")).toHaveText(
    expectedNames,
  );
  await expect(first.locator("select")).toHaveValue("featured");
  await page.locator('#album-form button[type="submit"]').click();
  await expect(page.locator("#editor")).not.toBeVisible();

  await reloadDemo(page);
  await page.locator('[data-action="edit"]').click();
  await expect(page.locator("#artist-selected strong")).toHaveText(
    expectedNames,
  );
  await expect(first.locator("select")).toHaveValue("featured");
  await page
    .getByRole("button", { name: "Remove First draft artist", exact: true })
    .click();
  await page.locator('#album-form button[type="submit"]').click();
  await expect(page.locator("#editor")).not.toBeVisible();

  await reloadDemo(page);
  await page.locator('[data-action="edit"]').click();
  await expect(page.locator("#artist-selected strong")).toHaveText([
    ...originalNames,
    "Second draft artist",
  ]);
});

test("genres show the catalog count and update it during search", async ({
  page,
}) => {
  await page.goto("/#genres");
  const count = page.locator("#genres-count");
  await expect(count).toHaveText(/^[1-9]\d* genres$/, { useInnerText: true });
  const total = await count.innerText();

  const search = page.getByRole("searchbox", { name: "Search genres" });
  await search.fill("Japanese Fusion");
  await expect(count).toHaveText("1 genre");
  await search.fill("no-such-genre-xyz");
  await expect(count).toHaveText("0 genres");
  await search.clear();
  await expect(count).toHaveText(total);
});

test("long parent genre names fit the picker on narrow screens", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 720 });
  const name = "VeryLongGenreName".repeat(4);
  await page.goto("/#genres");
  await page.locator('[data-action="new-catalog-genre"]').click();
  await page.locator('[name="genreName"]').fill(name);
  await page.locator('#catalog-genre-form button[type="submit"]').click();
  await expect(page.locator("#page-title")).toHaveText(name);

  await page.goto("/#genres");
  await page.locator('[data-action="new-catalog-genre"]').click();
  await page.locator('[name="genreName"]').fill("Child genre");
  await page.getByRole("checkbox", { name, exact: true }).check();
  await page.locator('#catalog-genre-form button[type="submit"]').click();
  await expect(page.locator("#page-title")).toHaveText("Child genre");

  await page.goto("/#genres");
  await page.locator('[data-action="new-catalog-genre"]').click();
  const options = page.locator("#genre-parent-options");
  await expect(
    options.getByRole("checkbox", { name: "Child genre", exact: true }),
  ).toBeVisible();
  expect(
    await options.evaluate((list) => list.scrollWidth - list.clientWidth),
  ).toBe(0);
  expect(
    await options.evaluate((list) => list.getBoundingClientRect().right),
  ).toBeLessThanOrEqual(320);
});

test("genre graph preserves explicit tags, shares branches, and prevents cycles", async ({
  page,
}) => {
  const genreHashes: string[] = [];
  for (const name of ["Graph Jazz", "Graph House", "Graph Jazz House"]) {
    await page.goto("/#genres");
    await page.locator('[data-action="new-catalog-genre"]').click();
    await page.locator('[name="genreName"]').fill(name);
    await page.locator('#catalog-genre-form button[type="submit"]').click();
    await expect(page.locator("#page-title")).toHaveText(name);
    genreHashes.push(new URL(page.url()).hash);
  }

  await page.goto("/#");
  await openAlbum(page);
  const albumHash = new URL(page.url()).hash;
  for (const names of [["Graph Jazz", "Graph Jazz House"]]) {
    await page.locator('[data-action="edit"]').click();
    for (const name of names) {
      await page.locator("#genre-query").fill(name);
      await page
        .locator("#genre-results")
        .getByRole("button", { name, exact: true })
        .click();
    }
    await page.locator('#album-form button[type="submit"]').click();
    await expect(page.locator("#editor")).not.toBeVisible();
  }

  await page.goto("/" + genreHashes[2]);
  await page.locator('[data-action="edit-catalog-genre"]').click();
  await page.getByRole("checkbox", { name: "Graph Jazz", exact: true }).check();
  await page
    .getByRole("checkbox", { name: "Graph House", exact: true })
    .check();
  // Both parent selections survive a draft reload.
  await reloadDemo(page);
  await expect(
    page.getByRole("checkbox", { name: "Graph Jazz", exact: true }),
  ).toBeChecked();
  await expect(
    page.getByRole("checkbox", { name: "Graph House", exact: true }),
  ).toBeChecked();
  await page.locator('#catalog-genre-form button[type="submit"]').click();
  await expect(page.locator("#editor")).not.toBeVisible();
  await expect(page.locator(".genre-breadcrumb")).toContainText("Graph Jazz");
  await expect(page.locator(".genre-breadcrumb")).toContainText("Graph House");
  await expect(page.locator(".genre-breadcrumb-path")).toHaveText([
    "Graph House › Graph Jazz House",
    "Graph Jazz › Graph Jazz House",
  ]);
  await expect(
    page.locator(".genre-title h1 + .genre-breadcrumb"),
  ).toBeVisible();
  await page
    .locator(".genre-breadcrumb")
    .getByRole("link", { name: "Graph House", exact: true })
    .click();
  await expect(page.locator("#page-title")).toHaveText("Graph House");
  await page.goto("/" + genreHashes[2]);

  await reloadDemo(page);
  await page.goto("/" + albumHash);
  await page.locator('[data-action="edit"]').click();
  await expect(page.locator("#genre-selected")).toContainText(
    "Graph Jazz House",
  );
  await expect(
    page.locator("#genre-selected strong").filter({ hasText: /^Graph Jazz$/ }),
  ).toHaveCount(1);
  await page.keyboard.press("Escape");

  for (const hash of genreHashes.slice(0, 2)) {
    await page.goto("/" + hash);
    await expect(
      page.locator(`.genre-albums a[href="${albumHash}"]`),
    ).toHaveCount(1);
    await page.locator('[data-action="edit-catalog-genre"]').click();
    await expect(
      page.getByRole("checkbox", { name: "Graph Jazz House", exact: true }),
    ).toHaveCount(0);
    await page.keyboard.press("Escape");
  }

  await page.goto("/#genres");
  for (const name of ["Graph Jazz", "Graph House"]) {
    await page
      .locator("summary")
      .filter({ has: page.getByText(name, { exact: true }) })
      .click();
  }
  await expect(
    page.locator(`.genre-tree a[href="${genreHashes[2]}"]`),
  ).toHaveCount(2);

  await page.locator('[data-action="new-catalog-genre"]').click();
  const parentNames = await page
    .locator(".genre-parent-name")
    .allTextContents();
  const roots = parentNames.filter((name) => name !== "Graph Jazz House");
  expect(parentNames).toEqual([
    ...roots.sort((a, b) => a.localeCompare(b)),
    "Graph Jazz House",
  ]);
  const fusionOption = page.locator(".genre-parent-option").filter({
    has: page.getByRole("checkbox", {
      name: "Graph Jazz House",
      exact: true,
    }),
  });
  await expect(fusionOption.locator(".genre-parent-path")).toHaveText([
    "Graph House › Graph Jazz House",
    "Graph Jazz › Graph Jazz House",
  ]);
  await fusionOption.locator(".genre-parent-path").first().click();
  await expect(fusionOption.getByRole("checkbox")).toBeChecked();
  await fusionOption.locator(".genre-parent-name").click();
  await expect(fusionOption.getByRole("checkbox")).not.toBeChecked();
  await page.locator("#genre-parent-search").fill("Graph");
  await expect(page.locator(".genre-parent-option:visible")).toHaveCount(3);
  await page
    .getByRole("checkbox", { name: "Graph House", exact: true })
    .check();
  await page.locator("#genre-parent-search").fill("Graph Jazz");
  await expect(
    page.getByRole("checkbox", {
      name: "Graph House",
      exact: true,
      includeHidden: true,
    }),
  ).toBeChecked();
});

test("dedicated instrument editor restores draft categories and commits only on save", async ({
  page,
}) => {
  await openAlbum(page);
  await page.locator('[data-action="edit-instruments"]').click();
  await page.locator("#instrument-query").fill("Draft category instrument");
  const category = page.locator('[name="inline-category"]').first();
  const categoryValue = await category.inputValue();
  await category.check();
  await page.locator('[data-action="create-instrument"]').click();
  await expect(page.locator("#instrument-selected")).toContainText(
    "Draft category instrument",
  );

  await reloadDemo(page);
  await expect(page.locator("#instruments-form")).toBeVisible();
  await expect(page.locator("#instrument-selected")).toContainText(
    "Draft category instrument",
  );
  await page.locator('#instruments-form button[type="submit"]').click();
  await expect(page.locator("#editor")).not.toBeVisible();

  await reloadDemo(page);
  await page.locator('[data-action="edit-instruments"]').click();
  await expect(page.locator("#instrument-selected")).toContainText(
    "Draft category instrument",
  );
  await page
    .getByRole("button", {
      name: "Remove Draft category instrument",
      exact: true,
    })
    .click();
  await page.locator('#instruments-form button[type="submit"]').click();
  await expect(page.locator("#editor")).not.toBeVisible();

  await page.goto("/#instruments");
  await page.locator("#instruments-search").fill("Draft category instrument");
  await page.locator('main a[href^="#instrument/"]').click();
  await page.locator('[data-action="edit-catalog-instrument"]').click();
  await expect(
    page.locator(`[name="category"][value="${categoryValue}"]`),
  ).toBeChecked();
});

test("malformed persisted draft selections do not prevent opening a new editor", async ({
  page,
}) => {
  await openAlbum(page);
  const title = await page.locator("#page-title").textContent();
  await page.locator('[data-action="edit"]').click();
  await page.locator('[name="title"]').fill("Damaged draft");
  await expect(page.locator("[data-draft-status]")).toHaveText(
    "Draft saved on this device",
  );
  await page.evaluate(() => {
    const key = "sleeve:editor-draft:v1:demo";
    const saved = JSON.parse(localStorage.getItem(key)!);
    saved.artists = [null];
    sessionStorage.setItem("damaged-draft", JSON.stringify(saved));
  });
  // Install after pagehide so capturing the old editor cannot repair the payload.
  await page.addInitScript(() => {
    const saved = sessionStorage.getItem("damaged-draft");
    if (saved) localStorage.setItem("sleeve:editor-draft:v1:demo", saved);
  });
  await reloadDemo(page);
  await expect(page.getByRole("button", { name: "Resume draft" })).toBeHidden();
  await page.locator('[data-action="edit"]').click();
  await expect(page.locator('[name="title"]')).toHaveValue(title!);
});

test("vinyl collection and wishlist filters follow saved status and clear correctly", async ({
  page,
}) => {
  await openAlbum(page);
  const title = await page.locator("#page-title").textContent();
  const albumHash = await page.evaluate(() => location.hash);
  for (const status of ["wishlisted", "owned", ""]) {
    await page.locator("#vinyl-status-button").click();
    await page
      .locator(`[data-action="set-vinyl-status"][data-status="${status}"]`)
      .click();
    await expect(page.locator("#vinyl-status-options")).not.toBeVisible();
    await reloadDemo(page);
    if (status)
      await expect(page.locator("#vinyl-status-text")).toHaveText(
        status === "owned" ? "Owned" : "Wishlist",
      );
    await page.evaluate(() => {
      location.hash = "";
    });
    const card = page.locator(`.album-card[href="${albumHash}"]`);
    for (const layout of ["grid", "list"]) {
      await page
        .locator(`[data-action="layout"][data-layout="${layout}"]`)
        .click();
      const badge = card.locator(".album-title .album-vinyl-status");
      if (status) {
        await expect(badge).toBeVisible();
        await expect(badge).toHaveAccessibleName(
          status === "owned" ? "Owned on vinyl" : "Vinyl wishlist",
        );
        const titleBox = await card.locator("strong").boundingBox();
        const badgeBox = await badge.boundingBox();
        expect(badgeBox!.x).toBeGreaterThanOrEqual(
          titleBox!.x + titleBox!.width,
        );
      } else await expect(badge).toHaveCount(0);
    }
    const filters = page.locator(".genre-filter-dropdown");
    await filters.locator("summary").click();
    await page
      .locator(
        `input[name="library-vinyl-status"][value="${status || "owned"}"]`,
      )
      .check();
    const results = page.locator("#library-results");
    if (status) {
      await expect(results).toContainText(title!);
      await expect(page.locator("#library-count")).toContainText("1 of");
      await filters.locator("summary").click();
      await page.locator("#library-query").fill("no-such-vinyl-title");
      await expect(results).toContainText("No matching albums");
      await page
        .getByRole("button", { name: "Clear filters", exact: true })
        .click();
      await expect(page.locator("#library-query")).toHaveValue("");
      await filters.locator("summary").click();
      await expect(
        page.locator('input[name="library-vinyl-status"]:checked'),
      ).toHaveCount(0);
      await page
        .locator(
          `input[name="library-vinyl-status"][value="${status === "owned" ? "wishlisted" : "owned"}"]`,
        )
        .check();
    }
    await expect(results).toContainText("No matching albums");
    await page.goto("/" + albumHash);
    await expect(page.locator("#page-title")).toHaveText(title!);
  }
});

test("vinyl artwork supports keyboard dismissal, current choices, and album edits", async ({
  page,
  isMobile,
}) => {
  await openAlbum(page);
  const change = page.locator("#vinyl-status-button");
  const status = page.locator("#vinyl-status-text");
  const options = page.locator("#vinyl-status-options");
  await expect(status).toHaveText("Not tracked");
  await expect(page.locator(".album-artwork .album-vinyl")).toHaveCount(0);
  await expect(change).toHaveAccessibleName("Track vinyl: Not tracked");
  await change.focus();
  await page.keyboard.press("Enter");
  await expect(options).toBeVisible();
  await expect(
    options.getByRole("button", { name: "Clear status" }),
  ).toHaveCount(0);
  await page.keyboard.press("Escape");
  await expect(options).not.toBeVisible();
  await expect(change).toBeFocused();
  await change.click();
  await page.locator("#page-title").click();
  await expect(options).not.toBeVisible();
  await change.click();
  await options.getByRole("button", { name: "Add to wishlist" }).click();
  await expect(status).toHaveText("Wishlist");
  await expect(change).toHaveAccessibleName("Track vinyl: Wishlist");
  const disc = page.locator(".album-artwork .album-vinyl");
  if (isMobile) await expect(disc).toBeHidden();
  else {
    await expect(disc).toBeVisible();
    await expect(disc).toHaveCSS("position", "absolute");
    await expect(disc).toHaveCSS("border-radius", "50%");
    const sleeve = await page.locator(".album-sleeve").boundingBox();
    const record = await disc.boundingBox();
    const heart = await page.locator(".album-vinyl-wish").boundingBox();
    expect(record!.width).toBeGreaterThan(0);
    expect(record!.height).toBeCloseTo(record!.width, 0);
    expect(record!.x).toBeGreaterThan(sleeve!.x);
    expect(record!.x).toBeLessThan(sleeve!.x + sleeve!.width);
    expect(record!.x + record!.width).toBeGreaterThan(
      sleeve!.x + sleeve!.width,
    );
    expect(heart!.x).toBeGreaterThan(sleeve!.x + sleeve!.width);
    expect(heart!.x + heart!.width).toBeLessThanOrEqual(
      record!.x + record!.width,
    );
    expect(heart!.y + heart!.height / 2).toBeCloseTo(
      record!.y + record!.height / 2,
      0,
    );
    await page.locator(".album-artwork").hover();
    await expect(disc).toHaveCSS("transform", "none");
  }
  await expect(change).toBeFocused();
  await change.click();
  await expect(
    options.getByRole("button", { name: "Add to wishlist" }),
  ).toHaveAttribute("aria-pressed", "true");
  await options.getByRole("button", { name: "Mark as owned" }).click();
  await expect(status).toHaveText("Owned");
  await expect(change).toHaveAccessibleName("Track vinyl: Owned");
  if (isMobile) await expect(disc).toBeHidden();
  else await expect(disc).toBeVisible();
  const sleeveBox = await page.locator(".album-sleeve").boundingBox();
  const buttonBox = await change.boundingBox();
  expect(sleeveBox).not.toBeNull();
  expect(buttonBox).not.toBeNull();
  expect(buttonBox!.x + buttonBox!.width).toBeLessThanOrEqual(
    sleeveBox!.x + sleeveBox!.width,
  );
  expect(buttonBox!.y + buttonBox!.height).toBeLessThanOrEqual(
    sleeveBox!.y + sleeveBox!.height,
  );
  await expect(page.locator(".album-vinyl-wish")).toHaveCount(0);
  await page.locator('[data-action="edit"]').click();
  await expect(page.locator('[name="vinylStatus"]')).toHaveCount(0);
  await page.locator('[name="label"]').fill("Updated label");
  await page.locator('#album-form button[type="submit"]').click();
  await reloadDemo(page);
  await expect(status).toHaveText("Owned");
  await change.click();
  await expect(
    options.getByRole("button", { name: "Mark as owned" }),
  ).toHaveAttribute("aria-pressed", "true");
  await options.getByRole("button", { name: "Clear status" }).click();
  await reloadDemo(page);
  await expect(status).toHaveText("Not tracked");
});
