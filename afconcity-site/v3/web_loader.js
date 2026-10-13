/* Website loader: downloads the 3D engine, the game and its textures in parallel with a real progress bar,
   then starts the game. Files carry a fingerprint in their name, so browsers keep them until the game changes. */
(() => {
  const M = __MANIFEST__;
  const $ = (s) => document.querySelector(s);
  const btn = $('#btnPlay'), note = $('#loadNote');
  const coarse = matchMedia('(pointer: coarse)').matches;
  let gfx = coarse ? 'low' : 'high';
  try { gfx = localStorage.getItem('afconcity-gfx') || gfx; } catch (e) {}
  const low = gfx !== 'high';
  // phones on Fast graphics: half-size ground textures, and no fine surface-detail maps
  const items = [Object.assign({ k: 'three', type: 'js' }, M.three), Object.assign({ k: 'game', type: 'js' }, M.game)];
  for (const name of Object.keys(M.tex)) {
    const t = M.tex[name]; if (low && t.nrm) continue;
    const f = low && t.lo ? t.lo : t.hi; items.push({ k: name, u: f.u, n: f.n, type: 'img' });
  }
  const total = items.reduce((a, b) => a + b.n, 0), BASE = 60;
  let got = 0;
  window.__afcLoad = { base: BASE, bytes: total, low };
  const show = () => {
    const f = Math.min(1, got / total);
    const pct = Math.round(f * BASE);
    if (btn) { btn.style.setProperty('--load', pct + '%'); btn.classList.add('loading'); btn.textContent = `Downloading… ${Math.round(f * 100)}%`; }
  };
  const pull = async (it) => {
    const r = await fetch(it.u, { mode: 'cors', credentials: 'omit' });
    if (!r.ok) throw new Error(`${it.u} answered ${r.status}`);
    let n = 0; const parts = [];
    if (r.body && r.body.getReader) {
      const rd = r.body.getReader();
      for (;;) { const { done, value } = await rd.read(); if (done) break; parts.push(value); n += value.length; got += value.length; show(); }
    } else { parts.push(await r.arrayBuffer()); }
    got += Math.max(0, it.n - n); show();
    it.blob = new Blob(parts, { type: it.type === 'js' ? 'text/javascript' : 'image/webp' });
  };
  const run = (blob) => new Promise((res, rej) => { const s = document.createElement('script'); s.src = URL.createObjectURL(blob); s.onload = res; s.onerror = () => rej(new Error('the game did not start')); document.body.append(s); });
  const fail = (e) => {
    if (btn) { btn.textContent = 'Try again'; btn.disabled = false; btn.onclick = () => location.reload(); }
    if (note) { note.hidden = false; note.textContent = 'Fumba did not finish downloading. Check your connection and tap Try again.'; }
    btn && btn.classList.remove('loading');
    console.error('load failed', e);
  };
  show();
  // the engine and the game must run in order; textures can arrive in any order
  Promise.all(items.map(pull)).then(async () => {
    const tex = {}; for (const it of items) if (it.type === 'img') tex[it.k] = URL.createObjectURL(it.blob);
    window.__AFC_TEX = tex;
    await run(items[0].blob);
    await run(items[1].blob);
    // keep what we just downloaded, so the next visit (and offline play) starts from this copy
    if (window.caches && location.protocol !== 'file:') caches.open('afc-files').then((c) => Promise.all(items.map((it) => c.match(it.u).then((hit) => hit || c.put(new Request(new URL(it.u, location.href).href), new Response(it.blob, { headers: { 'Content-Type': it.blob.type } })))))).catch(() => {});
  }).catch(fail);
  // repeat visits load from the phone itself, and the game can be installed
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === '127.0.0.1')) addEventListener('load', () => { navigator.serviceWorker.register('/sw.js').catch(() => {}); });
})();
