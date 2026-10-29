// Offline support: pages are fetched fresh when online and served from cache when offline.
const CACHE = 'dsk-v1';
self.addEventListener('install', (e) => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const isPage = req.mode === 'navigate';
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    if (isPage) {
      try { const res = await fetch(req); cache.put(req, res.clone()); return res; }
      catch (err) { return (await cache.match(req)) || (await cache.match(self.registration.scope)) || Response.error(); }
    }
    const hit = await cache.match(req);
    const net = fetch(req).then((res) => { if (res.ok || res.type === 'opaque') cache.put(req, res.clone()); return res; }).catch(() => hit);
    return hit || net;
  })());
});
