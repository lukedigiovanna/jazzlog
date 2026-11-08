import { test } from "node:test";
import assert from "node:assert/strict";
import { createServer, preview } from "vite";

for (const mode of ["dev", "preview"]) {
  test(`${mode} serves JSON for Apple Music requests before the HTML fallback`, async () => {
    const original = globalThis.fetch;
    globalThis.fetch = async (input, options) => {
      const url = new URL(input instanceof Request ? input.url : input);
      if (url.hostname === "itunes.apple.com") {
        assert.equal(url.searchParams.get("term"), "Miles Davis Kind of Blue");
        return Response.json({ results: [] });
      }
      return original(input, options);
    };
    let server;
    try {
      server =
        mode === "dev"
          ? await createServer({ server: { host: "127.0.0.1", port: 0 } })
          : await preview({ preview: { host: "127.0.0.1", port: 0 } });
      if (mode === "dev") await server.listen();
      const address = server.httpServer.address();
      const url = `http://127.0.0.1:${address.port}/api/apple-music?title=Kind+of+Blue&artist=Miles+Davis`;
      const response = await original(url, {
        headers: { "If-None-Match": '"old-html-etag"' },
      });
      assert.equal(response.status, 200);
      assert.match(response.headers.get("content-type"), /application\/json/);
      assert.deepEqual(await response.json(), { results: [] });
      const invalid = await original(
        `http://127.0.0.1:${address.port}/api/apple-music`,
      );
      assert.equal(invalid.status, 400);
      assert.match(invalid.headers.get("content-type"), /application\/json/);
    } finally {
      if (mode === "dev") await server?.close();
      else if (server)
        await new Promise((resolve, reject) =>
          server.httpServer.close((error) =>
            error ? reject(error) : resolve(),
          ),
        );
      globalThis.fetch = original;
    }
  });
}
