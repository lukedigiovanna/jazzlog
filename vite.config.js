import { readdir, readFile, writeFile } from "node:fs/promises";
import { relative } from "node:path";
import { createHash } from "node:crypto";
import { defineConfig } from "vite";
export default defineConfig({
  plugins: [
    {
      name: "offline-app-shell",
      async writeBundle(options) {
        const dir = options.dir || "dist";
        const files = await readdir(dir, {
          recursive: true,
          withFileTypes: true,
        });
        const paths = files
          .filter((file) => file.isFile())
          .map((file) => {
            const parent = file.parentPath || file.path;
            return relative(dir, parent + "/" + file.name);
          })
          .filter(
            (path) =>
              path !== "sw.js" &&
              !path.startsWith("_") &&
              !path.endsWith(".map"),
          );
        const shell = ["/", ...paths.map((path) => "/" + path)];
        const hash = createHash("sha256");
        for (const path of paths.sort())
          hash.update(await readFile(dir + "/" + path));
        const source = await readFile("public/sw.js", "utf8");
        await writeFile(
          dir + "/sw.js",
          source
            .replace(
              'const PRECACHE = ["/"];',
              `const PRECACHE = ${JSON.stringify(shell)};`,
            )
            .replace(
              "jazzlog-app-dev",
              `jazzlog-app-${hash.digest("hex").slice(0, 16)}`,
            ),
        );
      },
    },
  ],
});
