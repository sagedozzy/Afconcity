/* AfconCity service worker: repeat visits start from the phone's own copy.
   - the page itself: network first (so updates show at once), the saved copy when offline
   - fingerprinted game files, the 3D engine, fonts and the Supabase library: from the saved copy, downloaded once
   - live data (Supabase), analytics and everything else: straight to the network, never cached */
const VERSION = '__VERSION__';
const KEEP = new Set(__ASSETS__);
const PAGE = 'afc-page', FILES = 'afc-files';
const CDN = /^https:\/\/(cdnjs\.cloudflare\.com|cdn\.jsdelivr\.net|fonts\.googleapis\.com|fonts\.gstatic\.com)\//;
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil((async () => {
  // drop files from older versions of the game
  const c = await caches.open(FILES);
  for (const req of await c.keys()) { const u = new URL(req.url); if (u.origin === location.origin && u.pathname.startsWith('/assets/') && !KEEP.has(u.pathname)) await c.delete(req); }
  await self.clients.claim();
})()));
self.addEventListener('fetch', (e) => {
  const req = e.request; if (req.method !== 'GET') return;
  const u = new URL(req.url);
  if (req.mode === 'navigate' && u.origin === location.origin) {
    e.respondWith((async () => {
      try {
        const net = await fetch(req);
        if (net.ok) { const c = await caches.open(PAGE); c.put('/', net.clone()); }
        return net;
      } catch (err) {
        const c = await caches.open(PAGE); return (await c.match('/')) || Response.error();
      }
    })());
    return;
  }
  const mine = u.origin === location.origin && u.pathname.startsWith('/assets/');
  if (mine || CDN.test(req.url)) {
    e.respondWith((async () => {
      const c = await caches.open(FILES);
      const hit = await c.match(req); if (hit) return hit;
      const net = await fetch(req);
      if (net.ok || net.type === 'opaque') c.put(req, net.clone());
      return net;
    })());
  }
});
