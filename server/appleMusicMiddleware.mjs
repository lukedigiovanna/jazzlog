import { appleMusicLookup } from "./appleMusic.mjs";

export function installAppleMusicMiddleware(server) {
  // Match the complete pathname, preserving query parameters for the handler.
  server.middlewares.use(async (req, res, next) => {
    const url = new URL(req.originalUrl ?? req.url, "http://localhost");
    if (url.pathname !== "/api/apple-music") return next();
    if (req.method !== "GET") {
      res.statusCode = 405;
      res.end();
      return;
    }
    try {
      const response = await appleMusicLookup(new Request(url));
      res.statusCode = response.status;
      response.headers.forEach((value, name) => res.setHeader(name, value));
      res.end(await response.text());
    } catch {
      res.statusCode = 500;
      res.setHeader("Content-Type", "application/json");
      res.end(
        JSON.stringify({
          error: "Apple Music lookup failed. Please try again.",
        }),
      );
    }
  });
}
