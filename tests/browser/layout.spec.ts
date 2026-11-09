import { test, expect } from "@playwright/test";

test("library and artist layouts persist independently across reloads", async ({
  page,
}) => {
  await page.goto("/");
  await page.locator("#auth-demo").click();
  const libraryList = page.locator(
    '[data-action="layout"][data-layout="list"]',
  );
  await libraryList.click();
  await expect(page.locator(".album-collection")).toHaveClass(/album-list/);

  await page.evaluate(() => {
    location.hash = "#artists";
  });
  await page.locator('main a[href^="#artist/"]').first().click();
  await expect(page.locator(".album-collection")).toHaveClass(/album-grid/);
  await page
    .locator('[data-action="artist-layout"][data-layout="list"]')
    .click();
  await page.reload();
  await page.locator("#auth-demo").click();
  await expect(page.locator(".album-collection")).toHaveClass(/album-list/);
  await expect(
    page.locator('[data-action="artist-layout"][data-layout="list"]'),
  ).toHaveAttribute("aria-pressed", "true");

  await page
    .locator('[data-action="artist-layout"][data-layout="grid"]')
    .click();
  await page.evaluate(() => {
    location.hash = "";
  });
  await expect(libraryList).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator(".album-collection")).toHaveClass(/album-list/);
  await page.locator('[data-action="layout"][data-layout="grid"]').click();
  await page.reload();
  await page.locator("#auth-demo").click();
  await expect(page.locator(".album-collection")).toHaveClass(/album-grid/);
  await page.evaluate(() => {
    location.hash = "#artists";
  });
  await page.locator('main a[href^="#artist/"]').first().click();
  await expect(page.locator(".album-collection")).toHaveClass(/album-grid/);
});
