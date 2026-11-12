import { test, expect } from "@playwright/test";

test("demo starts and navigates without secure-context randomUUID", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(crypto, "randomUUID", { value: undefined });
  });
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await page.locator("#auth-demo").click();
  await expect(page.locator("#library-query")).toBeVisible();
  await page.locator('a[href^="#album/"]').first().click();
  await expect(page.locator("#page-title")).toBeVisible();
  await page.goBack();
  await expect(page.locator("#library-query")).toBeVisible();
  expect(errors).toEqual([]);
});
