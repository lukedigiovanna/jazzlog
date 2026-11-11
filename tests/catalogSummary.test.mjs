import { test } from "node:test";
import assert from "node:assert/strict";
import {
  catalogStats,
  compareCatalog,
} from "../src/components/catalogSummary.ts";
const album = (...ratings) => ({
  listeningEntries: ratings.map(([rating, listenedAt]) => ({
    rating,
    listenedAt,
  })),
});
test("catalog averages use the latest rating per album, excluding unrated albums", () => {
  const stats = catalogStats([
    album([2, "2026-01-01"], [10, "2026-02-01"]),
    album([6, "2026-01-02"]),
    album(),
  ]);
  assert.deepEqual(stats, {
    count: 3,
    updated: "",
    rated: 2,
    average: 4,
    recent: "2026-02-01",
  });
});
test("unrated catalogs have no score and sort after rated catalogs", () => {
  const empty = catalogStats([album()]);
  assert.equal(empty.average, null);
  assert.ok(
    compareCatalog(empty, catalogStats([album([2, "2026-01-01"])]), "rating") >
      0,
  );
});

test("recently updated catalogs use their latest album update, including unrated albums", () => {
  const older = catalogStats([
    { ...album([10, "2026-03-01"]), updatedAt: "2026-01-01" },
  ]);
  const newer = catalogStats([
    { ...album(), updatedAt: "2026-02-01" },
    { ...album(), updatedAt: "2026-01-15" },
  ]);
  assert.equal(newer.updated, "2026-02-01");
  assert.ok(compareCatalog(newer, older, "updated") < 0);
  assert.ok(compareCatalog(newer, catalogStats([]), "updated") < 0);
});
