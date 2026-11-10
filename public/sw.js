// The production build replaces this list with every versioned app asset.
const PRECACHE = ["/"];
const CACHE = "jazzlog-app-dev";
const IMAGES = "jazzlog-images-v1";
self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(PRECACHE)));
});
self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter(
            (key) =>
              (key.startsWith("jazzlog-app-") ||
                key.startsWith("jazzlog-offline-")) &&
              key !== CACHE,
          )
          .map((key) => caches.delete(key)),
      );
      await self.clients.claim();
    })(),
  );
});
self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin === self.location.origin && request.mode === "navigate") {
    event.respondWith(
      caches
        .open(CACHE)
        .then(async (cache) => (await cache.match("/")) || fetch(request)),
    );
  } else if (
    url.origin === self.location.origin &&
    PRECACHE.includes(url.pathname)
  ) {
    event.respondWith(
      caches
        .open(CACHE)
        .then(
          async (cache) => (await cache.match(url.pathname)) || fetch(request),
        ),
    );
  } else if (request.destination === "image") {
    event.respondWith(
      (async () => {
        const cache = await caches.open(IMAGES);
        const cached = await cache.match(request);
        if (cached) return cached;
        const response = await fetch(request);
        if (response.ok || response.type === "opaque") {
          // Bound artwork storage. Failure to cache must never break an image.
          event.waitUntil(
            (async () => {
              try {
                await cache.put(request, response.clone());
                const keys = await cache.keys();
                await Promise.all(
                  keys
                    .slice(0, Math.max(0, keys.length - 150))
                    .map((key) => cache.delete(key)),
                );
              } catch {
                /* Best effort artwork caching. */
              }
            })(),
          );
        }
        return response;
      })(),
    );
  }
});
