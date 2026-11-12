import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildDiscoveryPrompt,
  CONTEXT_BUDGET,
  MAX_CONTEXT_ALBUMS,
} from "../src/app/discoveryPrompt.ts";
const options = {
  topic: "Japanese jazz",
  direction: "branch",
};
const album = (i) => ({
  id: String(i),
  title: `Album ${i}`,
  artists: [{ name: `Artist ${i}`, position: 0 }],
  releaseYear: 1970,
  genres: [{ name: i % 2 ? "Japanese jazz" : "Bop" }],
  instruments: [],
  listeningEntries: [
    { rating: (i % 10) + 1, listenedAt: "2026-01-01", notes: "a".repeat(2000) },
  ],
  artworkUrl: "PRIVATE_URL",
});
function evidence(result) {
  return JSON.parse(
    result.prompt.split("characters):\n")[1].split("\nAlready logged")[0],
  );
}
test("large catalogs retain exclusions while bounding taste evidence", () => {
  const result = buildDiscoveryPrompt(
    Array.from({ length: 500 }, (_, i) => album(i)),
    options,
  );
  const entries = evidence(result);
  assert.ok(entries.length <= MAX_CONTEXT_ALBUMS);
  assert.ok(JSON.stringify(entries).length <= CONTEXT_BUDGET);
  assert.equal(result.excludedCount, 500);
  assert.ok(result.prompt.includes('"Album 499","Artist 499"'));
  assert.ok(entries.some((a) => a.rating === 10));
  assert.ok(entries.some((a) => a.rating === 1));
  assert.ok(entries.some((a) => a.genres === "Japanese jazz"));
  assert.ok(!result.prompt.includes("PRIVATE_URL"));
  assert.ok(entries.every((a) => a.notes.endsWith("[excerpt]")));
});
test("latest ratings, invalid ratings and empty histories are handled", () => {
  const a = album(1);
  a.listeningEntries.push({
    rating: 9,
    listenedAt: "2026-03-01",
    notes: '日本語 "great"\nlisten',
  });
  assert.equal(evidence(buildDiscoveryPrompt([a], options))[0].rating, 9);
  a.listeningEntries.push({ rating: 0, listenedAt: "2026-04-01" });
  assert.equal(buildDiscoveryPrompt([a], options).contextCount, 0);
  assert.match(
    buildDiscoveryPrompt([], options).prompt,
    /no rated listening history/,
  );
});

function compact(result) {
  return JSON.parse(
    result.prompt.split("\nAlready logged")[1].split("\n").slice(1).join("\n"),
  );
}
test("twenty detailed albums and compact latest ratings cover the rest", () => {
  const albums = Array.from({ length: 30 }, (_, i) => ({
    ...album(i),
    listeningEntries: [
      { rating: (i % 10) + 1, listenedAt: "2026-01-01", notes: "Short note" },
    ],
  }));
  albums[29].listeningEntries.push({
    rating: 8,
    listenedAt: "2026-03-01",
    notes: "Updated",
  });
  const result = buildDiscoveryPrompt(albums, options);
  assert.equal(result.contextCount, 20);
  const rows = compact(result);
  assert.equal(rows.length, 30);
  assert.deepEqual(
    rows.find((row) => row[0] === "Album 29"),
    ["Album 29", "Artist 29", 8],
  );
  const detailedTitles = new Set(evidence(result).map((entry) => entry.title));
  assert.equal(
    rows.filter((row) => !detailedTitles.has(row[0]) && row.length === 3)
      .length,
    10,
  );
});
test("compact ratings omit missing, invalid, and superseded valid ratings", () => {
  const albums = [album(0), album(1), album(2)];
  albums[0].listeningEntries = [];
  albums[1].listeningEntries.push({ rating: 0, listenedAt: "2026-03-01" });
  albums[2].listeningEntries[0].rating = 11;
  assert.ok(
    compact(buildDiscoveryPrompt(albums, options)).every(
      (row) => row.length === 2,
    ),
  );
});
