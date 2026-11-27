/* Cache static assets only: no bookings, payment responses or navigation cache. */
const CACHE = "khamsa-static-v1";
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", event => event.waitUntil(self.clients.claim()));
self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET" || new URL(request.url).origin !== self.location.origin) return;
  const url = new URL(request.url);
  if (request.mode === "navigate" || /^(\/backend-api|\/api|\/create-payment|\/payment|\/octo)/.test(url.pathname)) return;
  if (!/\.(?:png|jpg|jpeg|webp|svg|woff2?|css|js)$/.test(url.pathname)) return;
  event.respondWith(caches.open(CACHE).then(async cache => {
    const cached = await cache.match(request);
    if (cached) return cached;
    const response = await fetch(request);
    if (response.ok && response.type === "basic") cache.put(request, response.clone());
    return response;
  }));
});
