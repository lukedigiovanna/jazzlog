import { test } from "node:test";
import assert from "node:assert/strict";
import { findArtist, commitAlbumArtists } from "../src/app/artistIdentity.ts";
import {
  parseWikipediaUrl,
  resolveWikipediaArticle,
} from "../src/services/wikipedia.ts";

const artist = (id, name, musicbrainzId = null) => ({
  id,
  name,
  musicbrainzId,
  sortName: null,
  country: null,
});
const credit = (item) => ({ ...item, role: "primary", position: 0 });

test("reuse existing artists by identity or normalized name, without conflating conflicting IDs", () => {
  const saved = artist("existing", "Miles Davis");
  assert.equal(
    findArtist([saved], artist("draft", "  MILES   DAVIS ", "mb1")),
    saved,
  );
  assert.equal(
    findArtist(
      [artist("existing", "Japanese name", "mb1")],
      artist("draft", "English name", "mb1"),
    ).id,
    "existing",
  );
  assert.equal(
    findArtist(
      [artist("existing", "Same name", "mb1")],
      artist("draft", "Same name", "mb2"),
    ),
    undefined,
  );
});

test("only selected artists are committed, repeated imports reuse identity, input catalog stays unchanged", () => {
  const catalog = [artist("existing", "Miles Davis")];
  const replacement = credit(artist("replacement", "English name"));
  const saved = commitAlbumArtists(catalog, [
    replacement,
    credit(artist("draft", "Miles Davis", "mb1")),
  ]);
  assert.deepEqual(
    saved.artists.map((item) => item.name),
    ["Miles Davis", "English name"],
  );
  assert.equal(saved.credits[1].id, "existing");
  assert.equal(catalog.length, 1);
  assert.deepEqual(commitAlbumArtists(catalog, []).artists, catalog);
  const repeated = commitAlbumArtists(saved.artists, saved.credits);
  assert.equal(repeated.artists.length, 2);
});

test("Wikipedia URL and search references use the same article resolver", async () => {
  const reference = parseWikipediaUrl(
    "https://en.m.wikipedia.org/wiki/Kind_of_Blue#Music",
  );
  assert.deepEqual(reference, { language: "en", title: "Kind of Blue" });
  assert.throws(() =>
    parseWikipediaUrl("https://evil.example/wiki/Kind_of_Blue"),
  );
  const originalFetch = globalThis.fetch;
  const responses = [
    {
      query: {
        pages: [
          {
            title: "Kind of Blue",
            pageprops: { wikibase_item: "Q1" },
            thumbnail: { source: "https://upload.wikimedia.org/cover.jpg" },
          },
        ],
      },
    },
    {
      entities: {
        Q1: {
          claims: {
            P175: [{ mainsnak: { datavalue: { value: { id: "Q2" } } } }],
            P577: [
              {
                mainsnak: {
                  datavalue: { value: { time: "+1959-08-17T00:00:00Z" } },
                },
              },
            ],
          },
        },
      },
    },
    { entities: { Q2: { labels: { en: { value: "Miles Davis" } } } } },
  ];
  let calls = 0;
  globalThis.fetch = async (url) => {
    if (calls === 0)
      assert.equal(new URL(url).searchParams.get("pilicense"), "any");
    return Response.json(responses[calls++]);
  };
  try {
    const imported = await resolveWikipediaArticle(reference);
    assert.equal(imported.releaseYear, 1959);
    assert.equal(imported.artists[0].name, "Miles Davis");
    assert.equal(imported.url, "https://en.wikipedia.org/wiki/Kind_of_Blue");
    assert.equal(imported.artworkUrl, "https://upload.wikimedia.org/cover.jpg");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("Wikipedia rejects missing and disambiguation pages; optional metadata failures preserve artwork", async () => {
  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = async () =>
      Response.json({ query: { pages: [{ missing: true }] } });
    await assert.rejects(
      resolveWikipediaArticle({ language: "en", title: "Missing" }),
      /could not be found/,
    );
    globalThis.fetch = async () =>
      Response.json({
        query: { pages: [{ pageprops: { disambiguation: "" } }] },
      });
    await assert.rejects(
      resolveWikipediaArticle({ language: "en", title: "Ambiguous" }),
      /disambiguation/,
    );
    globalThis.fetch = async (url) => {
      if (new URL(url).hostname === "www.wikidata.org")
        throw new Error("offline");
      return Response.json({
        query: {
          pages: [
            {
              title: "Example (album)",
              pageprops: { wikibase_item: "Q1" },
              original: { source: "https://upload.wikimedia.org/example.jpg" },
            },
          ],
        },
      });
    };
    const result = await resolveWikipediaArticle({
      language: "en",
      title: "Example (album)",
    });
    assert.equal(result.title, "Example");
    assert.equal(result.artworkUrl, "https://upload.wikimedia.org/example.jpg");
    assert.deepEqual(result.artists, []);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
