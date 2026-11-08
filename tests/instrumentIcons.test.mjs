import { test } from "node:test";
import assert from "node:assert/strict";
import {
  instrumentCategories,
  instrumentCategoryIcon,
} from "../src/app/instruments.ts";
import { catalogImage } from "../src/components/catalogSummary.ts";

test("instrument fallback priority is independent of category order", () => {
  assert.equal(
    instrumentCategoryIcon(["electronic", "keyboard"]),
    "instrument-keyboard",
  );
  assert.equal(
    instrumentCategoryIcon(["keyboard", "electronic"]),
    "instrument-keyboard",
  );
  assert.equal(
    instrumentCategoryIcon(["other", "electronic", "percussion"]),
    "instrument-percussion",
  );
  assert.equal(instrumentCategoryIcon([]), "instrument-other");
});

test("every instrument category has a nonempty fallback icon", () => {
  for (const category of instrumentCategories) {
    assert.equal(instrumentCategoryIcon([category]), `instrument-${category}`);
    const markup = catalogImage("Instrument", null, false, [category]);
    assert.match(markup, /<svg[^>]*>.+<\/svg>/);
    assert.doesNotMatch(markup, /<img/);
  }
});

test("instrument images retain category fallback underneath, artist initials stay intact", () => {
  const markup = catalogImage("Piano", "https://example.com/piano.jpg", false, [
    "keyboard",
    "electronic",
  ]);
  assert.match(markup, /<img src="https:\/\/example.com\/piano.jpg"/);
  assert.match(markup, /<svg/);
  assert.match(catalogImage("Miles Davis", null, true), /<span\s*>MD<\/span\s*>/);
});
