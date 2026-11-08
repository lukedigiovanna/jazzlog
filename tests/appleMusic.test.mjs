import { test } from "node:test";
import assert from "node:assert/strict";
import {
  exactAppleMusicMatch,
  findAppleMusicAlbums,
} from "../src/services/appleMusic.ts";
import { appleMusicLookup } from "../server/appleMusic.mjs";
const album = {
  id: 1,
  title: "Kind of Blue",
  artist: "Miles Davis",
  year: 1959,
  url: "https://music.apple.com/us/album/1",
};

test("only a single exact artist/title match auto-selects; editions stay explicit", () => {
  assert.equal(
    exactAppleMusicMatch([album], "Kind of Blue", ["MILES DAVIS"]),
    album,
  );
  assert.equal(
    exactAppleMusicMatch([album, { ...album, id: 2 }], album.title, [
      album.artist,
    ]),
    undefined,
  );
  assert.equal(
    exactAppleMusicMatch(
      [{ ...album, title: "Kind of Blue (Remastered)" }],
      album.title,
      [album.artist],
    ),
    undefined,
  );
  assert.equal(
    exactAppleMusicMatch([album], album.title, ["John Coltrane"]),
    undefined,
  );
});

test("server checks Apple Music destinations and excludes unavailable albums", async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async (url) => {
    if (new URL(url).hostname === "itunes.apple.com") {
      assert.equal(new URL(url).searchParams.get("country"), "US");
      return Response.json({
        results: [1, 2].map((id) => ({
          collectionId: id,
          collectionName: album.title,
          artistName: album.artist,
          releaseDate: "1959-08-17",
        })),
      });
    }
    return new URL(url).searchParams.get("url").endsWith("/1")
      ? Response.json({
          title: album.title,
          html: '<iframe src="https://embed.music.apple.com/us/album/1"></iframe>',
        })
      : new Response(null, { status: 404 });
  };
  try {
    const response = await appleMusicLookup(
      new Request(
        "https://jazzlog.test/api/apple-music?title=Kind+of+Blue&artist=Miles+Davis",
      ),
    );
    assert.equal(response.status, 200);
    assert.deepEqual((await response.json()).results, [album]);
  } finally {
    globalThis.fetch = original;
  }
});

test("catalog errors return a recoverable failure and client failures can be retried", async () => {
  const original = globalThis.fetch;
  try {
    globalThis.fetch = async () => {
      throw new Error("offline");
    };
    const response = await appleMusicLookup(
      new Request(
        "https://jazzlog.test/api/apple-music?title=Example&artist=Artist",
      ),
    );
    assert.equal(response.status, 502);
    await assert.rejects(findAppleMusicAlbums("Example", "Artist"));
    globalThis.fetch = async () => Response.json({ results: [album] });
    assert.deepEqual(await findAppleMusicAlbums("Example", "Artist"), [album]);
  } finally {
    globalThis.fetch = original;
  }
});

test("HTML fallback and malformed JSON produce actionable errors, not cached failures", async () => {
  const original = globalThis.fetch;
  try {
    globalThis.fetch = async (_url, options) => {
      assert.equal(options.cache, "no-store");
      return new Response("<!doctype html><html></html>", {
        headers: { "Content-Type": "text/html" },
      });
    };
    await assert.rejects(
      findAppleMusicAlbums("Routing test", "Artist"),
      /webpage instead of album results/,
    );
    globalThis.fetch = async () => Response.json({ unexpected: true });
    await assert.rejects(
      findAppleMusicAlbums("Routing test", "Artist"),
      /invalid response/,
    );
    globalThis.fetch = async () => Response.json({ results: [] });
    assert.deepEqual(await findAppleMusicAlbums("Routing test", "Artist"), []);
  } finally {
    globalThis.fetch = original;
  }
});
