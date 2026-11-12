import { test, expect } from "@playwright/test";

test("discovery builds context, copies and opens ChatGPT, and resets on reopen", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: async (text: string) => {
          (window as any).copiedPrompt = text;
        },
      },
    });
    window.open = ((url: string) => {
      (window as any).openedUrl = url;
      return null;
    }) as typeof window.open;
  });
  await page.goto("/");
  await page.locator("#auth-demo").click();
  await page.getByRole("button", { name: "Discover", exact: true }).click();
  await expect(page.locator("#discovery-topic")).toHaveCount(0);
  await expect(page.locator('[data-action="discovery-genre"]')).toHaveCount(0);
  await page.getByLabel("Branch out", { exact: true }).check();
  await page
    .locator("#discovery-request")
    .fill("Japanese jazz with electric piano, something mellow");
  await page.locator("#discovery-details summary").click();
  await expect(page.locator("#discovery-preview")).toHaveValue(/Japanese jazz/);
  await page
    .getByRole("button", { name: "Copy prompt & open ChatGPT", exact: true })
    .click();
  await expect(page.locator("#discovery-status")).toContainText(
    "Prompt copied",
  );
  expect(await page.evaluate(() => (window as any).openedUrl)).toBe(
    "https://chatgpt.com/",
  );
  expect(await page.evaluate(() => (window as any).copiedPrompt)).toBe(
    await page.locator("#discovery-preview").inputValue(),
  );
  expect(
    await page
      .locator("#editor")
      .evaluate((el) => el.scrollWidth <= el.clientWidth),
  ).toBe(true);
  await page.getByRole("button", { name: "Close dialog" }).click();
  await expect(
    page.getByRole("button", { name: "Discover", exact: true }),
  ).toBeFocused();
  await page.getByRole("button", { name: "Discover", exact: true }).click();
  await expect(page.locator("#discovery-request")).toHaveValue("");
  await expect(page.getByLabel("Stay close", { exact: true })).toBeChecked();
});

test("clipboard failure reveals selectable manual prompt", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: async () => {
          throw new Error("denied");
        },
      },
    });
  });
  await page.goto("/");
  await page.locator("#auth-demo").click();
  await page.getByRole("button", { name: "Discover", exact: true }).click();
  await page.getByRole("button", { name: "Copy prompt", exact: true }).click();
  await expect(page.locator("#discovery-preview")).toBeVisible();
  await expect(page.locator("#discovery-preview")).toBeFocused();
  await expect(page.locator("#discovery-status")).toContainText(
    "copy it manually",
  );
});
