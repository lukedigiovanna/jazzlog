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
        query: {
          pages: [
            {
              title,
              pageprops: {
                wikibase_item: title === "SuggestionTestTwo" ? "Q10" : "Q1",
              },
            },
          ],
        },
      },
    });
  });
  await page.route("https://www.wikidata.org/w/api.php*", async (route) => {
    const ids = new URL(route.request().url()).searchParams.get("ids");
    await route.fulfill({
      json: {
        entities:
          ids === "Q1" || ids === "Q10"
            ? {
                [ids]: {
                  claims: {
                    P136: [claim({ id: "Q2" })],
                    P870: [
                      claim({ id: "Q3" }),
                      claim({ id: "Q4" }),
                      ...(ids === "Q10" ? [claim({ id: "Q5" })] : []),
                    ],
                  },
                },
              }
            : {
                Q2: { labels: { en: { value: "japanese-fuson" } } },
                Q3: { labels: { en: { value: "Test-instrument" } } },
                Q4: { labels: { en: { value: "bass" } } },
                Q5: { labels: { en: { value: "test-zither" } } },
              },
      },
    });
  });
  await page.goto("/");
  await page.locator("#auth-demo").click();
  await importAlbum(page, "SuggestionTest");
  await expect(page.locator("#genre-selected")).toHaveText("");
  const genre = page.locator('[data-source="Q2"]');
  await expect(
    genre.getByRole("button", { name: "Create Japanese Fuson" }),
  ).toBeVisible();
  await genre
    .getByRole("button", { name: "Link existing genre for Japanese Fuson" })
    .click();
  const popover = genre.getByRole("group", { name: "Link Japanese Fuson" });
  await expect(popover).toBeVisible();
  await expect(
    popover.locator("[data-suggestion-matches] button").first(),
  ).toHaveText("Link Japanese Fusion");
  await page.keyboard.press("Escape");
  await expect(popover).toBeHidden();
  await expect(page.locator("#album-form")).toBeVisible();
  await genre
    .getByRole("button", { name: "Link existing genre for Japanese Fuson" })
    .click();
  const search = genre.getByRole("searchbox", { name: "Search your genres" });
  await search.fill("fusion japanese");
  await search.press("Enter");
  await expect(page.locator("#album-form")).toBeVisible();
  await genre
    .getByRole("button", { name: "Link Japanese Fusion", exact: true })
    .click();
  await expect(page.locator("#genre-selected")).toContainText(
    "Japanese Fusion",
  );

  const create = page.getByRole("button", { name: "Create Test Instrument" });
  await expect(create).toHaveText("");
  await expect(
    page.getByRole("heading", { name: "New", exact: true }).last(),
  ).toBeVisible();
  await create.click();
  await expect(page.locator("#instrument-selected")).toContainText(
    "Test Instrument",
  );
  await page.getByRole("button", { name: "Skip Bass", exact: true }).click();
  await page.reload();
  await page.locator("#auth-demo").click();
  await expect(page.locator("#genre-selected")).toContainText(
    "Japanese Fusion",
  );
  await expect(page.locator("#instrument-selected")).toContainText(
    "Test Instrument",
  );
  await expect(page.locator("[data-suggestion-row]:visible")).toHaveCount(0);
  await page.locator('#album-form button[type="submit"]').click();
  await expect(page.locator("#editor")).not.toBeVisible();
  await page.reload();
  await page.locator("#auth-demo").click();
  await importAlbum(page, "SuggestionTestTwo");
  await expect(
    page.getByRole("button", { name: "Add Japanese Fusion" }),
  ).toBeVisible();
  const add = page.getByRole("button", { name: "Add Test Instrument" });
  await expect(add).toBeVisible();
  await expect(add).toHaveText("");
  const instruments = page.getByRole("group", {
    name: "Wikipedia instrument suggestions",
  });
  await instruments.getByRole("button", { name: "Add all" }).click();
  await expect(page.locator("#instrument-selected")).toContainText(
    "Test Instrument",
  );
  await expect(page.locator("#instrument-selected")).toContainText("Bass");
  await expect(
    instruments.getByRole("heading", { name: "In library" }),
  ).toBeHidden();
  await expect(
    instruments.getByRole("button", { name: "Create Test Zither" }),
  ).toBeVisible();
  await expect(page.locator("#instrument-selected")).not.toContainText(
    "Test Zither",
  );
  await expect(page.locator("#genre-selected")).toHaveText("");
  await page
    .locator('[data-source="Q2"]')
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
                      <th class="infobox-above summary">
                        <i>Article: The Album</i>
                      </th>
                    </tr>
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
                        <br />Post-bop, Post Bop
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
    await expect(page.locator('#album-form [name="title"]')).toHaveValue(
      "Article: The Album",
    );
    const genreBox = page
      .locator(".instrument-picker")
      .filter({ has: page.locator("#genre-query") });
    await expect(genreBox.locator("[data-suggestion-row]")).toHaveCount(3);
    await expect(genreBox).toContainText("Modal Jazz");
    await expect(genreBox).toContainText("Post Bop");
    await genreBox.getByRole("button", { name: "Create Post Bop" }).click();
    await expect(page.locator("#genre-selected")).toContainText("Post Bop");
    const instrumentBox = page
      .locator(".instrument-picker")
      .filter({ has: page.locator("#instrument-query") });
    await expect(instrumentBox.locator("[data-suggestion-row]")).toHaveCount(6);
    const list = instrumentBox.getByRole("group", {
      name: "Wikipedia instrument suggestions",
    });
    const rows = list.locator("[data-suggestion-row]");
    const bounds = (await list.boundingBox())!;
    const sixth = (await rows.nth(5).boundingBox())!;
    expect(sixth.y + sixth.height).toBeGreaterThan(bounds.y + bounds.height);
    await rows
      .nth(5)
      .getByRole("button", { name: /^Skip / })
      .click();
    await expect(rows.nth(5)).toBeHidden();
    await expect(instrumentBox).toContainText("Trumpet");
    await expect(instrumentBox).toContainText("Double Bass");
    await expect(
      instrumentBox
        .locator("[data-suggestion-row] > strong")
        .filter({ hasText: /^guitar$/i }),
    ).toHaveCount(0);
    await expect(
      instrumentBox
        .locator("[data-suggestion-row] > strong")
        .filter({ hasText: /^producer$/i }),
    ).toHaveCount(0);
  });
}
