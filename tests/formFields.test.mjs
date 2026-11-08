import { test } from "node:test";
import assert from "node:assert/strict";
import {
  field,
  linkRow,
  catalogImageField,
} from "../src/components/formFields.ts";
import { formValue } from "../src/app/formValues.ts";

test("form fields preserve constraints and escape user-entered attribute values", () => {
  const markup = field("Title", "title", '\"><script>&', {
    attributes: 'required maxlength="150"',
    help: "Required",
  });
  assert.ok(markup.includes('value="&quot;&gt;&lt;script&gt;&amp;"'));
  assert.ok(markup.includes('required maxlength="150"'));
  assert.ok(markup.includes("<small>Required</small>"));
  assert.ok(!field("Title", "title").includes("<small>"));
});

test("music link and catalog image fields preserve editing hooks and escaped values", () => {
  const markup = linkRow({
    url: "https://example.com/?a=1&b=2",
    label: 'A "label"',
  });
  assert.match(markup, /name="linkUrl"/);
  assert.match(markup, /name="linkLabel"/);
  assert.match(markup, /data-action="remove-link"/);
  assert.ok(markup.includes("a=1&amp;b=2"));
  assert.ok(markup.includes("A &quot;label&quot;"));
  const image = catalogImageField("Photo", 'A "name"', null, true);
  assert.ok(image.includes('data-name="A &quot;name&quot;"'));
  assert.match(image, /name="catalogImage"/);
  assert.match(image, /catalog-image-preview/);
});

test("form values trim text, retain numeric text, and default missing fields to empty", () => {
  const data = new FormData();
  data.set("title", "  Kind of Blue \n");
  data.set("rating", "0");
  assert.equal(formValue(data, "title"), "Kind of Blue");
  assert.equal(formValue(data, "rating"), "0");
  assert.equal(formValue(data, "missing"), "");
});
