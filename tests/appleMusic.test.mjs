import { test } from "node:test";
import assert from "node:assert/strict";
import {
  exactAppleMusicMatch,
  findAppleMusicAlbums,
} from "../src/services/appleMusic.ts";
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

test("browser searches Apple directly, checks Apple Music destinations and excludes unavailable albums", async () => {
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
    assert.deepEqual(await findAppleMusicAlbums(album.title, album.artist), [
      album,
    ]);
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
    await assert.rejects(findAppleMusicAlbums("Example", "Artist"));
    globalThis.fetch = async () => Response.json({ results: [] });
    assert.deepEqual(await findAppleMusicAlbums("Example", "Artist"), []);
  } finally {
    globalThis.fetch = original;
  }
});

test("HTTP errors and malformed results can be retried", async () => {
  const original = globalThis.fetch;
  try {
    globalThis.fetch = async () => new Response(null, { status: 429 });
    await assert.rejects(findAppleMusicAlbums("Routing test", "Artist"), /429/);
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
