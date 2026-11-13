import { test, expect, type Page } from "@playwright/test";

const claim = (value: unknown) => ({ mainsnak: { datavalue: { value } } });

async function importAlbum(page: Page, title: string) {
  await page.locator('[data-action="add"]').first().click();
  await page
    .locator("#catalog-query")
    .fill(`https://en.wikipedia.org/wiki/${title}`);
  await page.locator('[data-action="pick"]').click();
  await expect(page.locator("#album-form")).toBeVisible();
}

test("Wikipedia suggestions reuse genres, create instruments and remember mappings", async ({
  page,
}) => {
  await page.route("https://en.wikipedia.org/w/api.php*", async (route) => {
    const title = new URL(route.request().url()).searchParams.get("titles");
    await route.fulfill({
      json: {
        query: { pages: [{ title, pageprops: { wikibase_item: "Q1" } }] },
      },
    });
  });
  await page.route("https://www.wikidata.org/w/api.php*", async (route) => {
    const ids = new URL(route.request().url()).searchParams.get("ids");
    await route.fulfill({
      json: {
        entities:
          ids === "Q1"
            ? {
                Q1: {
                  claims: {
                    P136: [claim({ id: "Q2" })],
                    P870: [claim({ id: "Q3" })],
                  },
                },
              }
            : {
                Q2: { labels: { en: { value: "Jazz Hip Hop" } } },
                Q3: { labels: { en: { value: "Test instrument" } } },
              },
      },
    });
  });
  await page.goto("/");
  await page.locator("#auth-demo").click();
  await importAlbum(page, "SuggestionTest");
  await expect(page.locator("#genre-selected")).toHaveText("");
  const genre = page.locator('[name="suggestion-genre-Q2"]');
  const existing = await genre.locator("option").nth(2).getAttribute("value");
  const existingName = await genre.locator("option").nth(2).textContent();
  await genre.selectOption(existing!);
  await genre
    .locator("xpath=ancestor::*[@data-suggestion-row]")
    .getByRole("button", { name: "Add", exact: true })
    .click();
  await expect(page.locator("#genre-selected")).toContainText(existingName!);
  const instrument = page.locator('[name="suggestion-instrument-Q3"]');
  await instrument.selectOption("__create");
  await instrument
    .locator("xpath=ancestor::*[@data-suggestion-row]")
    .getByRole("button", { name: "Add", exact: true })
    .click();
  await expect(page.locator("#instrument-selected")).toContainText(
    "Test instrument",
  );
  await page.reload();
  await page.locator("#auth-demo").click();
  await expect(page.locator("#genre-selected")).toContainText(existingName!);
  await expect(page.locator("#instrument-selected")).toContainText(
    "Test instrument",
  );
  await expect(page.locator("[data-suggestion-row]:visible")).toHaveCount(0);
  await page.locator('#album-form button[type="submit"]').click();
  await expect(page.locator("#editor")).not.toBeVisible();
  await page.reload();
  await page.locator("#auth-demo").click();
  await importAlbum(page, "SuggestionTestTwo");
  await expect(page.locator('[name="suggestion-genre-Q2"]')).toHaveValue(
    existing!,
  );
  await expect(
    page.locator('[name="suggestion-instrument-Q3"]'),
  ).not.toHaveValue("");
  // Remembered matches still require confirmation, and can be skipped.
  await expect(page.locator("#genre-selected")).toHaveText("");
  await page
    .locator('[name="suggestion-genre-Q2"]')
    .locator("xpath=ancestor::*[@data-suggestion-row]")
    .getByRole("button", { name: "Skip" })
    .click();
  await expect(page.locator("#genre-selected")).toHaveText("");
});

for (const source of ["wikidata", "no-item", "offline"]) {
  test(`article genres and personnel supplement ${source} metadata`, async ({
    page,
  }) => {
    await page.route("https://en.wikipedia.org/w/api.php*", async (route) => {
      const params = new URL(route.request().url()).searchParams;
      if (params.get("action") === "parse") {
        await route.fulfill({
          json: {
            parse: {
              text: /* HTML */ `
                <table class="infobox">
                  <tbody>
                    <tr>
                      <th>Genre</th>
                      <td>
                        <div class="hlist">
                          <ul>
                            <li>
                              <a href="/wiki/Jazz">Jazz</a
                              ><sup class="reference">[1]</sup>
                            </li>
                            <li><a href="/wiki/Modal_jazz">Modal jazz</a></li>
                          </ul>
                        </div>
                        <br />Post-bop
                      </td>
                    </tr>
                  </tbody>
                </table>
                <p>
                  A review mentions guitar and rock, which are not album
                  metadata.
                </p>
                <div class="mw-heading mw-heading2">
                  <h2 id="Personnel">Personnel</h2>
                </div>
                <ul>
                  <li>Miles Davis – <a href="/wiki/Trumpet">trumpet</a></li>
                  <li>Cannonball Adderley – alto saxophone</li>
                  <li>John Coltrane – tenor saxophone</li>
                  <li>Bill Evans – piano (except track 2)</li>
                  <li>Wynton Kelly – piano (track 2)</li>
                  <li>Paul Chambers – double bass</li>
                  <li>Jimmy Cobb – drums</li>
                </ul>
                <h3>Production</h3>
                <ul>
                  <li>Someone – producer, engineering</li>
                </ul>
                <div class="mw-heading mw-heading2"><h2>Charts</h2></div>
                <ul>
                  <li>Someone – guitar</li>
                </ul>
              `,
            },
          },
        });
      } else {
        await route.fulfill({
          json: {
            query: {
              pages: [
                {
                  title: "ArticleMetadata",
                  pageprops:
                    source === "no-item" ? {} : { wikibase_item: "Q1" },
                },
              ],
            },
          },
        });
      }
    });
    await page.route("https://www.wikidata.org/w/api.php*", async (route) => {
      if (source === "offline") return route.abort();
      const ids = new URL(route.request().url()).searchParams.get("ids");
      await route.fulfill({
        json: {
          entities:
            ids === "Q1"
              ? { Q1: { claims: { P136: [claim({ id: "Q2" })] } } }
              : { Q2: { labels: { en: { value: "jazz" } } } },
        },
      });
    });
    await page.goto("/");
    await page.locator("#auth-demo").click();
    await importAlbum(page, "ArticleMetadata");
    const genreBox = page
      .locator(".instrument-picker")
      .filter({ has: page.locator("#genre-query") });
    await expect(genreBox.locator("[data-suggestion-row]")).toHaveCount(3);
    await expect(genreBox).toContainText("Modal jazz");
    await expect(genreBox).toContainText("Post-bop");
    const instrumentBox = page
      .locator(".instrument-picker")
      .filter({ has: page.locator("#instrument-query") });
    await expect(instrumentBox.locator("[data-suggestion-row]")).toHaveCount(6);
    await expect(instrumentBox).toContainText("trumpet");
    await expect(instrumentBox).toContainText("double bass");
    await expect(
      instrumentBox.locator("label > span").filter({ hasText: /^guitar$/ }),
    ).toHaveCount(0);
    await expect(
      instrumentBox.locator("label > span").filter({ hasText: /^producer$/ }),
    ).toHaveCount(0);
  });
}
