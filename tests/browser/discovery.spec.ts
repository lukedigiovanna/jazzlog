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
    window.open = ((url: string, target: string) => {
      (window as any).openedTarget = target;
      (window as any).openedUrl = url;
      return null;
    }) as typeof window.open;
  });
  await page.goto("/");
  await page.locator("#auth-demo").click();
  await page.getByRole("button", { name: "Discover", exact: true }).click();
  await expect(page.locator("#discovery-topic")).toHaveCount(0);
  await expect(page.locator('[data-action="discovery-genre"]')).toHaveCount(0);
  const slider = page.getByRole("slider", { name: "How adventurous?" });
  await expect(slider).toHaveValue("0");
  await slider.focus();
  await slider.press("ArrowRight");
  await expect(slider).toHaveAttribute("aria-valuetext", "Branch out");
  await page
    .locator("#discovery-request")
    .fill("Japanese jazz with electric piano, something mellow");
  await page.locator("#discovery-details summary").click();
  await expect(page.locator("#discovery-preview")).toHaveValue(/Japanese jazz/);
  await page
    .getByRole("button", { name: "Copy prompt & open ChatGPT", exact: true })
    .click();
  await expect(page.locator("#toast")).toContainText("Prompt copied");
  expect(await page.evaluate(() => (window as any).openedUrl)).toBe(
    "https://chatgpt.com/#native",
  );
  expect(await page.evaluate(() => (window as any).openedTarget)).toBe(
    (await page.evaluate(() => matchMedia("(pointer: coarse)").matches))
      ? "_self"
      : "_blank",
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
  await expect(slider).toHaveValue("0");
  await expect(slider).toHaveAttribute("aria-valuetext", "Stay close");
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

test("mobile discovery controls fill the available width", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/");
  await page.locator("#auth-demo").click();
  await page.getByRole("button", { name: "Discover", exact: true }).click();
  const slider = page.getByRole("slider", { name: "How adventurous?" });
  const bounds = (await slider.boundingBox())!;
  expect(bounds.height).toBeGreaterThanOrEqual(44);
  await slider.fill("2");
  await expect(slider).toHaveAttribute("aria-valuetext", "Surprise");
  await page.locator("#discovery-details summary").click();
  await expect(page.locator("#discovery-preview")).toHaveValue(
    /Choose adventurous records/,
  );
  const actions = page.locator(".discovery-actions");
  const primary = (await actions.locator(".primary").boundingBox())!;
  const copy = (await actions.locator(".secondary").first().boundingBox())!;
  const open = (await actions.locator(".secondary").last().boundingBox())!;
  expect(Math.abs(copy.width - open.width)).toBeLessThan(1);
  expect(copy.y).toBe(open.y);
  expect(copy.y).toBeGreaterThanOrEqual(primary.y + primary.height);
  expect(Math.abs(copy.width + open.width + 8 - primary.width)).toBeLessThan(1);
  await expect(
    page.getByRole("link", { name: "Open ChatGPT", exact: true }),
  ).toHaveAttribute("href", "https://chatgpt.com/#native");
});
