import { test, expect } from "@playwright/test";

test("back links retrace visits and cooperate with browser history", async ({
  page,
}) => {
  await page.goto("/");
  await page.locator("#auth-demo").click();
  await page.locator('[data-nav="artists"]').click();
  await page.locator('main a[href^="#artist/"]').first().click();
  await expect(page.locator(".back-link")).toHaveText("Back to artists");
  const artistHash = new URL(page.url()).hash;
  const artistName = await page.locator("#page-title").innerText();
  await page.locator('main a[href^="#album/"]').first().click();
  await expect(page.locator(".back-link")).toHaveText(`Back to ${artistName}`);
  const albumHash = new URL(page.url()).hash;
  await page.reload();
  await page.locator("#auth-demo").click();
  await expect(page.locator(".back-link")).toHaveText(`Back to ${artistName}`);
  await page.locator(".back-link").click();
  await expect(page).toHaveURL(new RegExp(`${artistHash}$`));
  await expect(page.locator(".back-link")).toHaveText("Back to artists");
  await page.reload();
  await page.locator("#auth-demo").click();
  await expect(page.locator(".back-link")).toHaveText("Back to artists");
  await page.goForward();
  await expect(page).toHaveURL(new RegExp(`${albumHash}$`));
  await expect(page.locator(".back-link")).toHaveText(`Back to ${artistName}`);
  await page.goBack();
  await page.locator(".back-link").click();
  await expect(page).toHaveURL(/#artists$/);

  // An independent tab has no trail, even when this tab has stored visits.
  const freshPage = await page.context().newPage();
  await freshPage.goto(`/${albumHash}`);
  await freshPage.locator("#auth-demo").click();
  await expect(freshPage.locator(".back-link")).toHaveText("Back to library");
  await freshPage.locator(".back-link").click();
  await expect(freshPage.locator("#library-query")).toBeVisible();
  await freshPage.close();
});

test("returning to the library preserves filters and scroll", async ({
  page,
}) => {
  await page.goto("/");
  await page.locator("#auth-demo").click();
  await page.locator("#library-query").fill("a");
  const scroll = await page.evaluate(() => {
    window.scrollTo(0, 300);
    const position = window.scrollY;
    document
      .querySelector<HTMLAnchorElement>('main a[href^="#album/"]')!
      .click();
    return position;
  });
  await page.locator(".back-link").click();
  await expect(page.locator("#library-query")).toHaveValue("a");
  await expect
    .poll(() => page.evaluate(() => window.scrollY))
    .toBeCloseTo(scroll, -1);
});

test("catalog routes retain titles, navigation sections, and history labels", async ({
  page,
}) => {
  await page.goto("/");
  await page.locator("#auth-demo").click();

  for (const [section, prefix] of [
    ["artists", "artist"],
    ["genres", "genre"],
    ["instruments", "instrument"],
  ]) {
    await page.locator('[data-nav="' + section + '"]').click();
    await expect(page.locator("#page-title")).toHaveText(
      section[0].toUpperCase() + section.slice(1),
    );
    await page
      .locator('main a[href^="#' + prefix + '/"]')
      .first()
      .click();
    await expect(page.locator("main .back-link")).toBeVisible();
    const name = await page.locator("#page-title").innerText();
    const hash = new URL(page.url()).hash;
    await expect(page).toHaveTitle(name + " — JazzLog");
    await expect(page.locator('[data-nav="' + section + '"]')).toHaveAttribute(
      "aria-current",
      "page",
    );

    await page.evaluate(() => {
      location.hash = "#album/unavailable";
    });
    await expect(page.locator("#page-title")).toHaveText("Album unavailable");
    const back = page.locator("main [data-route-back]");
    await expect(back).toHaveText("Back to " + name);
    await expect(back).toHaveAttribute("href", hash);
    await back.click();
    await expect(page.locator("#page-title")).toHaveText(name);
  }

  for (const [prefix, title, section] of [
    ["genre", "Genres", "genres"],
    ["artist", "Artists", "artists"],
    ["instrument", "Instruments", "instruments"],
  ]) {
    await page.evaluate((prefix) => {
      location.hash = "#" + prefix + "/unavailable";
    }, prefix);
    await expect(page).toHaveTitle(title + " — JazzLog");
    await expect(page.locator('[data-nav="' + section + '"]')).toHaveAttribute(
      "aria-current",
      "page",
    );
    if (prefix !== "genre")
      await expect(page.locator("main [data-route-back]")).toHaveText(
        "Back to previous page",
      );
  }
});
