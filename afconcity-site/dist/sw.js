/* AfconCity service worker: repeat visits start from the phone's own copy.
   - the page itself: network first (so updates show at once), the saved copy when offline
   - fingerprinted game files, the 3D engine, fonts and the Supabase library: from the saved copy, downloaded once
   - live data (Supabase), analytics and everything else: straight to the network, never cached */
const VERSION = '6e14f7afb21c';
const KEEP = new Set(["/assets/game.490ed59d9d.js", "/assets/tex/bark.03e27f4a60.webp", "/assets/tex/concrete.faf4c0110a.webp", "/assets/tex/dry-lo.a51047be39.webp", "/assets/tex/dry.d04287f212.webp", "/assets/tex/frond.8bdbdac31b.webp", "/assets/tex/grass-lo.bb7db9e0ee.webp", "/assets/tex/grass.c497e9c3aa.webp", "/assets/tex/leaves.11e079b1c2.webp", "/assets/tex/mabati.7923b7992b.webp", "/assets/tex/mabatiN.b3f736bc1b.webp", "/assets/tex/paver.981382c5d3.webp", "/assets/tex/paverN.6a0db9335d.webp", "/assets/tex/plaster.368b19c68f.webp", "/assets/tex/plasterN.9c5197ff4d.webp", "/assets/tex/plaza.c463de9481.webp", "/assets/tex/plazaN.b641321b48.webp", "/assets/tex/roadR.d45434b8dc.webp", "/assets/tex/roadS.5072edcdec.webp", "/assets/tex/roadT.f73998c3b0.webp", "/assets/tex/sand.1201a70f1d.webp", "/assets/tex/sandN.135cc55f9a.webp", "/assets/tex/slab.4eb80ec365.webp", "/assets/tex/soil.fbfd3f306c.webp", "/assets/tex/tiles.f20b9cfe65.webp", "/assets/tex/tilesN.b4f338a803.webp", "/assets/tex/tuft.ea385b7ebf.webp"]);
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
