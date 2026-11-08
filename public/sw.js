// Only the offline page is cached. Account data and API responses stay online.
const CACHE = "jazzlog-offline-v1";
// Cloudflare serves HTML at extensionless URLs. Cache the canonical URL so
// navigation fallbacks are not redirected responses.
const OFFLINE = "/offline";

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.add(OFFLINE)));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then(async (keys) => {
      await Promise.all(
        keys
          .filter((key) => key.startsWith("jazzlog-offline-") && key !== CACHE)
          .map((key) => caches.delete(key)),
      );
      await self.clients.claim();
    }),
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.mode !== "navigate" || event.request.method !== "GET")
    return;
  if (new URL(event.request.url).origin !== self.location.origin) return;
  event.respondWith(
    fetch(event.request).catch(async () => {
      const fallback = await caches.match(OFFLINE);
      return fallback || Response.error();
    }),
  );
});
