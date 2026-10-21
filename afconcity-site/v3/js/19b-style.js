/* ===================== 19b style: fabric prints, the island wardrobe, curated looks and the 15-character look code ===================== */
/* Prints live in one 6 x 6 atlas (768 px). Clothes carry a print id and cloth coordinates in metres, and the character
   shader lays the print over the garment colour. Far-away people use each print's average colour instead. */
const PATS = ['', 'breton', 'pinstripe', 'palms', 'hibiscus', 'kitenge', 'kanga', 'gingham', 'polka', 'waves', 'tiedye', 'madras', 'denim', 'shells', 'cabana', 'mosaic', 'linen', 'kente', 'doors', 'dhow', 'spice', 'ombre', 'marble', 'shuka'];
const PAT_NAMES = { '': 'Plain', breton: 'Breton stripe', pinstripe: 'Pinstripe', palms: 'Palm leaves', hibiscus: 'Hibiscus', kitenge: 'Kitenge', kanga: 'Kanga spots', gingham: 'Gingham', polka: 'Polka dots', waves: 'Waves', tiedye: 'Tie-dye', madras: 'Madras check', denim: 'Denim', shells: 'Shells', cabana: 'Cabana stripe', mosaic: 'Stone Town tile', linen: 'Linen weave', kente: 'Gold kente', doors: 'Zanzibar doors', dhow: 'Dhow regatta', spice: 'Spice route', ombre: 'Sunset fade', marble: 'Ocean marble', shuka: 'Maasai shuka' };
/* limited-edition prints: bought once with game shillings, then free on any garment that takes them */
const PAT_PRICE = { kente: 40000, doors: 35000, dhow: 30000, spice: 30000, ombre: 25000, marble: 35000, shuka: 30000 };
const ownsPrint = (p) => !PAT_PRICE[p] || ((state && state.prints) || []).includes(p);
const PAT_M = 0.24; // one print tile covers 24 cm of cloth
const PAT_TILE = 128, PAT_GRID = 6;
let PAT_TEX = null;
const PAT_AVG = [];
(function buildPatterns() {
  const S = PAT_TILE, G = PAT_GRID, cv = mkCanvas(S * G, S * G), x = cv.getContext('2d');
  const R = mulberry32(2027);
  const at = (id) => { const i = id - 1; return [(i % G) * S, (G - 1 - Math.floor(i / G)) * S]; };
  // draw fn(g) inside the tile, repeated across the edges so the print wraps seamlessly
  const tile = (id, fn) => { const [ox, oy] = at(id); x.save(); x.beginPath(); x.rect(ox, oy, S, S); x.clip(); for (const dx of [-S, 0, S]) for (const dy of [-S, 0, S]) { x.save(); x.translate(ox + dx, oy + dy); fn(x); x.restore(); } x.restore(); };
  const leaf = (g, cx, cy, len, w, rot, col, vein) => {
    g.save(); g.translate(cx, cy); g.rotate(rot); g.fillStyle = col;
    g.beginPath(); g.moveTo(0, 0); g.bezierCurveTo(w, -len * 0.3, w * 0.8, -len * 0.8, 0, -len); g.bezierCurveTo(-w * 0.8, -len * 0.8, -w, -len * 0.3, 0, 0); g.fill();
    g.strokeStyle = vein; g.lineWidth = 1.4; g.beginPath(); g.moveTo(0, 0); g.lineTo(0, -len * 0.95); g.stroke();
    g.lineWidth = 1; for (let k = 1; k < 6; k++) { const yy = -len * k / 6.5; g.beginPath(); g.moveTo(0, yy); g.lineTo(w * 0.7, yy - len * 0.08); g.moveTo(0, yy); g.lineTo(-w * 0.7, yy - len * 0.08); g.stroke(); }
    g.restore();
  };
  // 1 breton: navy bands
  tile(1, (g) => { g.fillStyle = '#1f2d55'; for (let y = 0; y < S; y += 32) g.fillRect(0, y + 10, S, 12); });
  // 2 pinstripe
  tile(2, (g) => { g.fillStyle = 'rgba(31,45,85,.55)'; for (let i = 0; i < S; i += 16) g.fillRect(i, 0, 1.6, S); });
  // 3 palm leaves
  const palms = []; for (let i = 0; i < 9; i++) palms.push([R() * S, R() * S, 26 + R() * 22, 9 + R() * 6, R() * TAU, ['#1d5a3a', '#2f7d4f', '#4fa36a', '#7cc08a'][i % 4]]);
  tile(3, (g) => { for (const p of palms) leaf(g, p[0], p[1], p[2], p[3], p[4], p[5], 'rgba(255,255,255,.35)'); });
  // 4 hibiscus
  const flowers = []; for (let i = 0; i < 6; i++) flowers.push([R() * S, R() * S, 9 + R() * 6, ['#d8342c', '#f07aa0', '#f3c13a', '#e86a1f'][i % 4], R() * TAU]);
  const leaves4 = []; for (let i = 0; i < 7; i++) leaves4.push([R() * S, R() * S, 16 + R() * 8, 6, R() * TAU]);
  tile(4, (g) => {
    for (const l of leaves4) leaf(g, l[0], l[1], l[2], l[3], l[4], '#2f7d4f', 'rgba(255,255,255,.3)');
    for (const [cx, cy, r, col, rot] of flowers) { g.fillStyle = col; for (let k = 0; k < 5; k++) { const a = rot + k * TAU / 5; g.beginPath(); g.ellipse(cx + Math.cos(a) * r * 0.62, cy + Math.sin(a) * r * 0.62, r * 0.62, r * 0.46, a, 0, TAU); g.fill(); } g.fillStyle = '#7a1420'; g.beginPath(); g.arc(cx, cy, r * 0.25, 0, TAU); g.fill(); g.fillStyle = '#f3e07a'; g.beginPath(); g.arc(cx + Math.cos(rot) * r * 0.5, cy + Math.sin(rot) * r * 0.5, 1.6, 0, TAU); g.fill(); }
  });
  // 5 kitenge: bold wax-print rings and diamonds
  tile(5, (g) => {
    for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) {
      const cx = 32 + i * 64, cy = 32 + j * 64, cols = (i + j) % 2 ? ['#1f4fa0', '#f3b41b', '#e86a1f', '#141414'] : ['#e86a1f', '#141414', '#f3b41b', '#1f4fa0'];
      cols.forEach((c, k) => { g.fillStyle = c; g.beginPath(); g.arc(cx, cy, 26 - k * 6.5, 0, TAU); g.fill(); });
    }
    g.fillStyle = '#141414'; for (const [cx, cy] of [[0, 0], [64, 0], [0, 64], [64, 64], [128, 0], [0, 128], [128, 64], [64, 128], [128, 128]]) { g.beginPath(); g.moveTo(cx, cy - 7); g.lineTo(cx + 7, cy); g.lineTo(cx, cy + 7); g.lineTo(cx - 7, cy); g.fill(); }
  });
  // 6 kanga spots: big black-ringed red spots on a scattered dot ground
  tile(6, (g) => { for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { const cx = 16 + i * 32 + (j % 2) * 16, cy = 16 + j * 32; g.fillStyle = '#141414'; g.beginPath(); g.arc(cx, cy, 9, 0, TAU); g.fill(); g.fillStyle = '#d8342c'; g.beginPath(); g.arc(cx, cy, 6, 0, TAU); g.fill(); g.fillStyle = '#f3b41b'; g.beginPath(); g.arc(cx, cy, 2, 0, TAU); g.fill(); } });
  // 7 gingham
  tile(7, (g) => { g.fillStyle = 'rgba(255,255,255,.42)'; for (let i = 0; i < S; i += 32) { g.fillRect(i, 0, 16, S); g.fillRect(0, i, S, 16); } });
  // 8 polka dots
  tile(8, (g) => { g.fillStyle = '#f6f3ec'; for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { g.beginPath(); g.arc(16 + i * 32 + (j % 2) * 16, 16 + j * 32, 5.5, 0, TAU); g.fill(); } });
  // 9 waves
  tile(9, (g) => { g.strokeStyle = 'rgba(255,255,255,.9)'; g.lineWidth = 4; g.lineCap = 'round'; for (let r = 0; r < 4; r++) { g.beginPath(); for (let i = 0; i <= S; i += 4) { const y = 16 + r * 32 + Math.sin(i / S * TAU * 2) * 6; if (i) g.lineTo(i, y); else g.moveTo(i, y); } g.stroke(); } });
  // 10 tie-dye: soft spiral of colour
  tile(10, (g) => { const gr = g.createRadialGradient(64, 64, 4, 64, 64, 90); gr.addColorStop(0, 'rgba(242,184,181,.85)'); gr.addColorStop(0.35, 'rgba(184,163,214,.7)'); gr.addColorStop(0.7, 'rgba(42,127,196,.6)'); gr.addColorStop(1, 'rgba(43,181,176,.45)'); g.fillStyle = gr; g.fillRect(0, 0, S, S); g.strokeStyle = 'rgba(255,255,255,.35)'; g.lineWidth = 3; for (let k = 0; k < 6; k++) { g.beginPath(); for (let a = 0; a < TAU * 1.6; a += 0.1) { const r = 6 + a * 9; const px = 64 + Math.cos(a + k * TAU / 6) * r, py = 64 + Math.sin(a + k * TAU / 6) * r; if (a) g.lineTo(px, py); else g.moveTo(px, py); } g.stroke(); } });
  // 11 madras check
  tile(11, (g) => { for (const [p, w, c] of [[0, 20, 'rgba(216,52,44,.55)'], [26, 8, 'rgba(243,180,27,.6)'], [40, 26, 'rgba(31,79,160,.45)'], [72, 10, 'rgba(30,155,87,.55)'], [90, 22, 'rgba(216,52,44,.4)'], [116, 6, 'rgba(255,255,255,.5)']]) { g.fillStyle = c; g.fillRect(p, 0, w, S); g.fillRect(0, p, S, w); } });
  // 12 denim twill
  tile(12, (g) => { for (let i = -S; i < S * 2; i += 3) { g.strokeStyle = R() < 0.5 ? 'rgba(255,255,255,.1)' : 'rgba(0,0,0,.12)'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(i, 0); g.lineTo(i + S, S); g.stroke(); } });
  // 13 shells and little fish
  const sh = []; for (let i = 0; i < 9; i++) sh.push([R() * S, R() * S, R() * TAU, i % 3]);
  tile(13, (g) => { for (const [cx, cy, rot, k] of sh) { g.save(); g.translate(cx, cy); g.rotate(rot); if (k === 0) { g.fillStyle = '#f07a5f'; g.beginPath(); g.moveTo(0, 6); for (let a = 0; a <= 6; a++) { const t2 = Math.PI + a / 6 * Math.PI; g.lineTo(Math.cos(t2) * 9, Math.sin(t2) * 9 + 2); } g.closePath(); g.fill(); g.strokeStyle = 'rgba(255,255,255,.7)'; g.lineWidth = 1; for (let a = 1; a < 6; a++) { const t2 = Math.PI + a / 6 * Math.PI; g.beginPath(); g.moveTo(0, 6); g.lineTo(Math.cos(t2) * 9, Math.sin(t2) * 9 + 2); g.stroke(); } } else if (k === 1) { g.fillStyle = '#2a7fc4'; g.beginPath(); g.ellipse(0, 0, 9, 4.5, 0, 0, TAU); g.fill(); g.beginPath(); g.moveTo(7, 0); g.lineTo(13, -5); g.lineTo(13, 5); g.fill(); g.fillStyle = '#fff'; g.beginPath(); g.arc(-5, -1, 1.2, 0, TAU); g.fill(); } else { g.fillStyle = '#e0a92e'; g.beginPath(); for (let a = 0; a < 10; a++) { const r = a % 2 ? 3.5 : 8.5, t2 = a / 10 * TAU; g.lineTo(Math.cos(t2) * r, Math.sin(t2) * r); } g.fill(); } g.restore(); } });
  // 14 cabana stripe
  tile(14, (g) => { g.fillStyle = '#f6f3ec'; for (let i = 0; i < S; i += 64) g.fillRect(i, 0, 32, S); });
  // 15 Stone Town tile: eight-point stars
  tile(15, (g) => {
    const star = (cx, cy, r) => { g.beginPath(); for (let a = 0; a < 16; a++) { const rr2 = a % 2 ? r * 0.6 : r, t2 = a / 16 * TAU; g.lineTo(cx + Math.cos(t2) * rr2, cy + Math.sin(t2) * rr2); } g.closePath(); };
    for (const [cx, cy] of [[0, 0], [128, 0], [0, 128], [128, 128], [64, 64]]) { g.fillStyle = '#1f6f8b'; star(cx, cy, 30); g.fill(); g.fillStyle = '#f6f3ec'; star(cx, cy, 18); g.fill(); g.fillStyle = '#c4673f'; g.beginPath(); g.arc(cx, cy, 6, 0, TAU); g.fill(); }
    for (const [cx, cy] of [[64, 0], [0, 64], [128, 64], [64, 128]]) { g.fillStyle = '#e0a92e'; g.beginPath(); g.moveTo(cx, cy - 10); g.lineTo(cx + 10, cy); g.lineTo(cx, cy + 10); g.lineTo(cx - 10, cy); g.fill(); }
  });
  // 16 linen slub
  tile(16, (g) => { for (let i = 0; i < 70; i++) { g.fillStyle = R() < 0.5 ? 'rgba(255,255,255,.16)' : 'rgba(0,0,0,.1)'; g.fillRect(R() * S, R() * S, 8 + R() * 30, 1 + R() * 1.4); } for (let i = 0; i < S; i += 4) { g.fillStyle = 'rgba(0,0,0,.035)'; g.fillRect(i, 0, 1, S); } });

  // ---- limited editions ----
  // 17 gold kente: woven strips with stepped blocks
  tile(17, (g) => { const cols = ['#e0a92e', '#1e7a3e', '#c8342c', '#141414']; for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) { const x0 = c * 32, y0 = r * 32, k = (r + c) % 2; g.fillStyle = k ? '#e0a92e' : '#1e7a3e'; g.fillRect(x0, y0, 32, 32); g.fillStyle = cols[(r * 2 + c) % 4]; if (k) { for (let i = 0; i < 4; i++) g.fillRect(x0, y0 + 3 + i * 8, 32, 3); } else { for (let i = 0; i < 4; i++) g.fillRect(x0 + 3 + i * 8, y0, 3, 32); } g.fillStyle = '#141414'; g.fillRect(x0 + 13, y0 + 13, 6, 6); } });
  // 18 Zanzibar carved doors: arches studded with brass bosses
  tile(18, (g) => { for (const [x0, y0] of [[0, 0], [64, 64], [64, 0], [0, 64]]) { g.strokeStyle = '#6b3e22'; g.lineWidth = 5; g.beginPath(); g.moveTo(x0 + 10, y0 + 60); g.lineTo(x0 + 10, y0 + 26); g.arc(x0 + 32, y0 + 26, 22, Math.PI, 0); g.lineTo(x0 + 54, y0 + 60); g.stroke(); g.fillStyle = '#d8a83c'; for (let k = 0; k < 4; k++) { g.beginPath(); g.arc(x0 + 32, y0 + 18 + k * 11, 3.2, 0, TAU); g.fill(); } g.beginPath(); g.arc(x0 + 32, y0 + 8, 4, 0, TAU); g.fill(); } });
  // 19 dhow regatta: triangular sails on little hulls
  tile(19, (g) => { for (const [cx, cy, s2] of [[30, 34, 1], [94, 30, 0.8], [62, 94, 1.1], [8, 100, 0.7], [118, 92, 0.75]]) { g.save(); g.translate(cx, cy); g.scale(s2, s2); g.fillStyle = '#f6f3ec'; g.beginPath(); g.moveTo(-2, -22); g.lineTo(18, 8); g.lineTo(-10, 8); g.closePath(); g.fill(); g.strokeStyle = '#3a2a1a'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(-2, -24); g.lineTo(-2, 10); g.stroke(); g.fillStyle = '#6b3e22'; g.beginPath(); g.moveTo(-16, 10); g.lineTo(20, 10); g.lineTo(12, 16); g.lineTo(-10, 16); g.closePath(); g.fill(); g.restore(); } });
  // 20 spice route: cloves, star anise and cinnamon quills
  tile(20, (g) => { const R2 = mulberry32(77); for (let i = 0; i < 9; i++) { const cx = R2() * S, cy = R2() * S, k = i % 3, rot = R2() * TAU; g.save(); g.translate(cx, cy); g.rotate(rot); if (k === 0) { g.fillStyle = '#5a2e1a'; for (let a = 0; a < 8; a++) { g.rotate(TAU / 8); g.beginPath(); g.ellipse(6, 0, 6, 2.6, 0, 0, TAU); g.fill(); } g.fillStyle = '#c8873a'; g.beginPath(); g.arc(0, 0, 2.5, 0, TAU); g.fill(); } else if (k === 1) { g.fillStyle = '#8a4a26'; g.fillRect(-14, -3, 28, 6); g.fillStyle = '#b06a36'; g.fillRect(-14, -1, 28, 2); } else { g.fillStyle = '#3a1e12'; g.fillRect(-1.5, -8, 3, 12); g.beginPath(); g.arc(0, -9, 3.5, 0, TAU); g.fill(); } g.restore(); } });
  // 21 sunset fade: soft horizontal bands from coral to violet
  tile(21, (g) => { const gr = g.createLinearGradient(0, 0, 0, S); gr.addColorStop(0, 'rgba(243,180,27,.85)'); gr.addColorStop(0.35, 'rgba(240,122,95,.85)'); gr.addColorStop(0.7, 'rgba(224,85,122,.8)'); gr.addColorStop(1, 'rgba(110,74,176,.8)'); g.fillStyle = gr; g.fillRect(0, 0, S, S); g.fillStyle = 'rgba(255,255,255,.18)'; for (let y = 0; y < S; y += 16) g.fillRect(0, y, S, 2); });
  // 22 ocean marble: turquoise swirls
  tile(22, (g) => { g.lineCap = 'round'; for (let k = 0; k < 9; k++) { g.strokeStyle = ['rgba(43,181,176,.75)', 'rgba(31,111,139,.7)', 'rgba(255,255,255,.65)'][k % 3]; g.lineWidth = 3 + (k % 3) * 2; g.beginPath(); for (let x0 = -8; x0 <= S + 8; x0 += 4) { const y = (k * 15 + 8) + Math.sin(x0 / S * TAU * 2 + k) * 10 + Math.sin(x0 / S * TAU + k * 2) * 6; if (x0 < -4) g.moveTo(x0, y); else g.lineTo(x0, y); } g.stroke(); } });
  // 23 Maasai shuka: red and blue check
  tile(23, (g) => { g.fillStyle = 'rgba(200,52,44,.9)'; g.fillRect(0, 0, S, S); for (const [p, w, c] of [[0, 10, 'rgba(31,45,85,.85)'], [24, 4, 'rgba(20,20,20,.8)'], [40, 18, 'rgba(31,45,85,.8)'], [70, 4, 'rgba(243,180,27,.8)'], [96, 12, 'rgba(20,20,20,.75)']]) { g.fillStyle = c; g.fillRect(p, 0, w, S); g.fillRect(0, p, S, w); } });
  // average colour and coverage of each print, in linear light, for far-away people
  const data = x.getImageData(0, 0, S * G, S * G).data, lin = (v) => Math.pow(v / 255, 2.2);
  PAT_AVG[0] = { c: new T.Color(0, 0, 0), a: 0 };
  for (let id = 1; id < PATS.length; id++) {
    const [ox, oy] = at(id); let r = 0, gg = 0, b = 0, a = 0, n = 0;
    for (let yy = oy; yy < oy + S; yy += 2) for (let xx = ox; xx < ox + S; xx += 2) { const o = (yy * S * G + xx) * 4, al = data[o + 3] / 255; r += lin(data[o]) * al; gg += lin(data[o + 1]) * al; b += lin(data[o + 2]) * al; a += al; n++; }
    PAT_AVG[id] = { c: a > 0 ? new T.Color(r / a, gg / a, b / a) : new T.Color(0, 0, 0), a: a / n };
  }
  PAT_TEX = new T.CanvasTexture(cv); PAT_TEX.minFilter = T.LinearFilter; PAT_TEX.magFilter = T.LinearFilter; PAT_TEX.generateMipmaps = false; PAT_TEX.wrapS = PAT_TEX.wrapT = T.ClampToEdgeWrapping;
  PAT_TEX.userData = { canvas: cv };
})();
/* the swatch art for the wardrobe: a print over a colour, as a CSS background */
const patSwatchCache = new Map();
function patSwatch(p, hex) {
  const key = p + '|' + hex; if (patSwatchCache.has(key)) return patSwatchCache.get(key);
  const id = PATS.indexOf(p); const c = mkCanvas(48, 48), g = c.getContext('2d'); g.fillStyle = '#' + hex.toString(16).padStart(6, '0'); g.fillRect(0, 0, 48, 48);
  if (id > 0) { const i = id - 1, src = PAT_TEX.userData.canvas; g.drawImage(src, (i % PAT_GRID) * PAT_TILE, (PAT_GRID - 1 - Math.floor(i / PAT_GRID)) * PAT_TILE, PAT_TILE, PAT_TILE, 0, 0, 48, 48); }
  const u = c.toDataURL(); patSwatchCache.set(key, u); return u;
}

/* ---------- the wardrobe ---------- */
const PALETTE = [0xf6f3ec, 0xe2d3b5, 0xc4673f, 0xf07a5f, 0xf2b8b5, 0xe0a92e, 0x9fb59a, 0x5f6b3a, 0x2bb5b0, 0x2a7fc4, 0x1f2d55, 0xb8a3d6, 0x1d1d22, 0x3d5a80, 0x9a968c, 0xc8342c, 0x5a3a22, 0xb07a4a, 0xe0557a, 0xc8a050];
const PALETTE_NAMES = ['White', 'Sand', 'Terracotta', 'Coral', 'Blush', 'Mustard', 'Sage', 'Olive', 'Turquoise', 'Ocean', 'Navy', 'Lilac', 'Black', 'Denim', 'Stone', 'Red', 'Brown', 'Tan', 'Pink', 'Gold'];
// sl: sleeve; neck: crew | collar | boat | v | tank; tuck: tucked in; dress: maxi | midi; only: f | m
const TOPS = [
  { id: 'jersey', n: 'Football jersey', kit: true, sl: 'short', neck: 'crew', tuck: true, pats: [''] },
  { id: 'resort', n: 'Resort shirt', sl: 'short', neck: 'collar', btn: true, pats: ['palms', 'hibiscus', 'shells', 'mosaic', 'waves', 'madras', '', 'dhow', 'spice', 'marble'], dc: 0, dp: 'palms' },
  { id: 'linen', n: 'Linen shirt', sl: 'elbow', neck: 'collar', btn: true, pats: ['linen', 'pinstripe', 'gingham', '', 'doors'], dc: 0, dp: 'linen' },
  { id: 'breton', n: 'Breton top', sl: 'elbow', neck: 'boat', tuck: true, pats: ['breton', ''], dc: 0, dp: 'breton' },
  { id: 'tee', n: 'T-shirt', sl: 'short', neck: 'crew', tuck: true, pats: ['', 'tiedye', 'cabana', 'polka', 'ombre'], dc: 8, dp: '' },
  { id: 'polo', n: 'Polo', sl: 'short', neck: 'collar', tuck: true, polo: true, pats: ['', 'pinstripe'], dc: 10, dp: '' },
  { id: 'kitenge', n: 'Kitenge shirt', sl: 'short', neck: 'collar', btn: true, pats: ['kitenge', 'kanga', 'mosaic', 'kente', 'shuka'], dc: 5, dp: 'kitenge' },
  { id: 'tank', n: 'Tank top', sl: 'none', neck: 'tank', only: 'm', pats: ['', 'cabana', 'tiedye'], dc: 0, dp: '' },
  { id: 'blouse', n: 'Peasant blouse', sl: 'elbow', neck: 'boat', only: 'f', pats: ['', 'linen', 'gingham', 'polka'], dc: 0, dp: 'linen' },
  { id: 'kaftan', n: 'Kaftan', nm: 'Kanzu', robe: true, sl: 'long', pats: ['', 'mosaic', 'kitenge', 'tiedye', 'kente', 'marble', 'doors'], dc: 0, dp: '' },
  { id: 'maxi', n: 'Maxi dress', dress: 'maxi', sl: 'short', neck: 'v', only: 'f', pats: ['hibiscus', 'palms', '', 'polka', 'tiedye', 'cabana', 'spice', 'marble', 'ombre'], dc: 3, dp: 'hibiscus' },
  { id: 'midi', n: 'Midi dress', dress: 'midi', sl: 'short', neck: 'crew', only: 'f', pats: ['gingham', '', 'mosaic', 'linen', 'polka', 'doors'], dc: 9, dp: 'gingham' },
  { id: 'gown', n: 'Kitenge gown', dress: 'maxi', sl: 'elbow', neck: 'boat', only: 'f', pats: ['kitenge', 'kanga', 'mosaic', 'kente', 'shuka'], dc: 9, dp: 'kitenge' },
];
// len: shorts | knee | crop | full; women's choices all cover the thigh
const BOTTOMS = [
  { id: 'kit', n: 'Kit shorts', nf: 'Kit track pants', kit: true, len: 'kit', lenF: 'full', pats: [''] },
  { id: 'chinoS', n: 'Chino shorts', len: 'shorts', only: 'm', pats: ['', 'madras', 'gingham'], dc: 1, dp: '' },
  { id: 'swim', n: 'Swim shorts', len: 'shorts', only: 'm', pats: ['waves', 'palms', 'hibiscus', 'shells', 'cabana', 'dhow'], dc: 9, dp: 'waves' },
  { id: 'bermuda', n: 'Bermudas', len: 'knee', only: 'm', pats: ['', 'madras', 'linen'], dc: 7, dp: '' },
  { id: 'linenT', n: 'Linen trousers', len: 'full', wide: 1, pats: ['linen', 'pinstripe', ''], dc: 1, dp: 'linen' },
  { id: 'chinos', n: 'Chinos', len: 'full', pats: ['', 'pinstripe'], dc: 10, dp: '' },
  { id: 'jeans', n: 'Jeans', len: 'full', pats: ['denim'], dc: 13, dp: 'denim' },
  { id: 'cropped', n: 'Cropped trousers', len: 'crop', pats: ['', 'linen', 'gingham'], dc: 0, dp: '' },
  { id: 'palazzo', n: 'Palazzo pants', len: 'full', wide: 2, only: 'f', pats: ['', 'linen', 'kitenge', 'cabana', 'marble'], dc: 0, dp: 'linen' },
  { id: 'maxiS', n: 'Maxi skirt', skirt: 'maxi', only: 'f', pats: ['kitenge', '', 'hibiscus', 'palms', 'mosaic', 'tiedye', 'polka', 'kente', 'spice', 'shuka'], dc: 2, dp: 'kitenge' },
  { id: 'midiS', n: 'Midi skirt', skirt: 'midi', only: 'f', pats: ['', 'gingham', 'polka', 'linen', 'kanga'], dc: 6, dp: '' },
];
const SHOES = [{ id: 'sneaker', n: 'Sneakers', dc: 0 }, { id: 'espadrille', n: 'Espadrilles', dc: 10 }, { id: 'sandal', n: 'Sandals', dc: 16 }, { id: 'slide', n: 'Slides', dc: 12 }, { id: 'loafer', n: 'Loafers', dc: 16 }];
const HATS = [{ id: '', n: 'No hat' }, { id: 'cap', n: 'Cap', dc: 10 }, { id: 'panama', n: 'Panama', dc: 1 }, { id: 'sunhat', n: 'Sun hat', dc: 1 }, { id: 'bucket', n: 'Bucket hat', dc: 0 }, { id: 'kofia', n: 'Kofia', dc: 8 }];
const EYES = [{ id: '', n: 'None' }, { id: 'shades', n: 'Shades' }, { id: 'round', n: 'Round shades' }, { id: 'aviator', n: 'Aviators' }];
const HAIRS = ['short', 'afro', 'braids', 'scarf', 'cap', 'kofia', 'bald', 'bun', 'locs'];
const HAIR_NAMES = { short: 'Short', afro: 'Afro', braids: 'Braids', scarf: 'Headscarf', cap: 'Cap', kofia: 'Kofia', bald: 'Bald', bun: 'Top bun', locs: 'Locs' };
const HAIR_PICK = ['short', 'afro', 'braids', 'locs', 'bun', 'scarf', 'bald'];
const PLAYER_SKINS = [0x9a6a44, 0x7a4a2a, 0x6b4226, 0x5d3a22, 0x4a2c1a, 0x3a2216];
const fitsBody = (it, f) => !it.only || it.only === (f ? 'f' : 'm');
const itemIx = (list, id) => Math.max(0, list.findIndex(it => it.id === id));

/* curated island looks: one tap, then tweak anything */
const PRESETS = [
  { n: 'Nungwi Sunset', f: false, t: 'resort', tc: 0, tp: 'palms', b: 'chinoS', bc: 10, sh: 'espadrille', shc: 1, ht: '', ey: 'round', h: 'short' },
  { n: 'Stone Town Linen', f: false, t: 'linen', tc: 0, tp: 'linen', b: 'linenT', bc: 1, sh: 'loafer', shc: 16, ht: 'panama', hc: 1, ey: '', h: 'short' },
  { n: 'Riviera', f: false, t: 'breton', tc: 0, tp: 'breton', b: 'cropped', bc: 10, sh: 'sneaker', shc: 0, ht: '', ey: 'aviator', h: 'short' },
  { n: 'Beach Day', f: false, t: 'tank', tc: 8, tp: '', b: 'swim', bc: 3, bp: 'hibiscus', sh: 'slide', shc: 12, ht: 'bucket', hc: 0, ey: 'shades', h: 'locs' },
  { n: 'Dhow Captain', f: false, t: 'polo', tc: 0, tp: '', b: 'chinos', bc: 10, sh: 'loafer', shc: 16, ht: 'cap', hc: 10, ey: 'aviator', h: 'short' },
  { n: 'Kitenge Cool', f: false, t: 'kitenge', tc: 5, tp: 'kitenge', b: 'chinos', bc: 12, sh: 'sandal', shc: 17, ht: '', ey: 'shades', h: 'afro' },
  { n: 'Ijumaa', f: false, t: 'kaftan', tc: 0, tp: '', b: 'chinos', bc: 0, sh: 'sandal', shc: 17, ht: 'kofia', hc: 8, ey: '', h: 'short' },
  { n: 'Matchday', f: false, t: 'jersey', b: 'kit', sh: 'sneaker', shc: 12, ht: '', ey: '', h: 'short' },
  { n: 'Sundowner', f: true, t: 'maxi', tc: 3, tp: 'hibiscus', b: 'linenT', sh: 'sandal', shc: 17, ht: 'sunhat', hc: 1, ey: 'round', h: 'braids' },
  { n: 'Riviera', f: true, t: 'breton', tc: 0, tp: 'breton', b: 'palazzo', bc: 0, bp: '', sh: 'espadrille', shc: 10, ht: 'sunhat', hc: 0, ey: 'shades', h: 'bun' },
  { n: 'Kitenge Queen', f: true, t: 'gown', tc: 9, tp: 'kitenge', b: 'linenT', sh: 'sandal', shc: 5, ht: '', ey: 'aviator', h: 'braids' },
  { n: 'Linen Chic', f: true, t: 'linen', tc: 1, tp: 'linen', b: 'palazzo', bc: 0, bp: 'linen', sh: 'loafer', shc: 16, ht: 'panama', hc: 1, ey: '', h: 'bun' },
  { n: 'Stone Town Midi', f: true, t: 'midi', tc: 9, tp: 'mosaic', b: 'linenT', sh: 'slide', shc: 0, ht: '', ey: 'round', h: 'scarf' },
  { n: 'Market Day', f: true, t: 'tee', tc: 5, tp: '', b: 'maxiS', bc: 2, bp: 'kitenge', sh: 'sneaker', shc: 0, ht: '', ey: '', h: 'afro' },
  { n: 'Beach Day', f: true, t: 'blouse', tc: 0, tp: 'gingham', b: 'cropped', bc: 9, bp: '', sh: 'slide', shc: 3, ht: 'bucket', hc: 4, ey: 'shades', h: 'locs' },
  { n: 'Matchday', f: true, t: 'jersey', b: 'kit', sh: 'sneaker', shc: 0, ht: '', ey: '', h: 'braids' },
  // limited editions: they use prints you buy once with game shillings
  { n: 'Sultan\'s Gold', f: false, t: 'kaftan', tc: 0, tp: 'kente', b: 'chinos', sh: 'loafer', shc: 16, ht: 'kofia', hc: 5, ey: 'aviator', h: 'short', ltd: true },
  { n: 'Dhow Regatta', f: false, t: 'resort', tc: 9, tp: 'dhow', b: 'chinoS', bc: 0, sh: 'espadrille', shc: 0, ht: 'panama', hc: 1, ey: 'round', h: 'short', ltd: true },
  { n: 'Stone Town Doors', f: false, t: 'linen', tc: 1, tp: 'doors', b: 'linenT', bc: 0, bp: 'linen', sh: 'loafer', shc: 16, ht: '', ey: 'shades', h: 'locs', ltd: true },
  { n: 'Spice Route', f: true, t: 'maxi', tc: 1, tp: 'spice', b: 'linenT', sh: 'sandal', shc: 17, ht: 'sunhat', hc: 1, ey: 'aviator', h: 'bun', ltd: true },
  { n: 'Ocean Marble', f: true, t: 'kaftan', tc: 0, tp: 'marble', b: 'linenT', sh: 'slide', shc: 0, ht: '', ey: 'round', h: 'braids', ltd: true },
  { n: 'Kente Royal', f: true, t: 'gown', tc: 5, tp: 'kente', b: 'linenT', sh: 'sandal', shc: 19, ht: '', ey: '', h: 'scarf', hc: 5, ltd: true },
];
const presetPrints = (p) => [p.tp, p.bp].filter(x => x && PAT_PRICE[x]);
/* apply a curated look (or a body change) to a look object, keeping skin tone */
function applyPreset(lk, p) {
  lk.f = !!p.f; lk.h = p.h || lk.h;
  const T1 = TOPS[itemIx(TOPS, p.t)], B1 = BOTTOMS[itemIx(BOTTOMS, p.b)];
  lk.t = itemIx(TOPS, p.t); lk.tc = p.tc === undefined ? (T1.dc || 0) : p.tc; lk.tp = PATS.indexOf(p.tp === undefined ? (T1.dp || '') : p.tp);
  lk.b = itemIx(BOTTOMS, p.b); lk.bc = p.bc === undefined ? (B1.dc || 0) : p.bc; lk.bp = PATS.indexOf(p.bp === undefined ? (B1.dp || '') : p.bp);
  lk.sh = itemIx(SHOES, p.sh); lk.shc = p.shc === undefined ? SHOES[lk.sh].dc : p.shc;
  lk.ht = itemIx(HATS, p.ht || ''); lk.hc = p.hc === undefined ? (HATS[lk.ht].dc || 0) : p.hc; lk.ey = itemIx(EYES, p.ey || '');
  if (lk.tp < 0) lk.tp = 0; if (lk.bp < 0) lk.bp = 0;
  return lk;
}
/* make every slot valid for this body: no thigh-baring bottoms or men's-only tops on a woman, and the other way round */
function fixLook(lk) {
  const f = !!lk.f;
  if (lk.t === undefined) { lk.t = 0; lk.b = 0; lk.sh = 0; lk.shc = 12; lk.ht = 0; lk.hc = 0; lk.ey = 0; lk.tc = 0; lk.bc = 0; lk.tp = 0; lk.bp = 0; }
  const n = (v, max) => clamp(v | 0, 0, max);
  lk.t = n(lk.t, TOPS.length - 1); lk.b = n(lk.b, BOTTOMS.length - 1); lk.sh = n(lk.sh, SHOES.length - 1); lk.ht = n(lk.ht, HATS.length - 1); lk.ey = n(lk.ey, EYES.length - 1);
  for (const k of ['tc', 'bc', 'shc', 'hc']) lk[k] = n(lk[k], PALETTE.length - 1);
  lk.tp = n(lk.tp, PATS.length - 1); lk.bp = n(lk.bp, PATS.length - 1);
  if (!fitsBody(TOPS[lk.t], f)) { lk.t = itemIx(TOPS, f ? 'blouse' : 'resort'); lk.tp = PATS.indexOf(TOPS[lk.t].dp); lk.tc = TOPS[lk.t].dc; }
  if (!fitsBody(BOTTOMS[lk.b], f)) { lk.b = itemIx(BOTTOMS, f ? 'palazzo' : 'chinoS'); lk.bp = 0; lk.bc = BOTTOMS[lk.b].dc; }
  if (!TOPS[lk.t].pats.includes(PATS[lk.tp])) lk.tp = PATS.indexOf(TOPS[lk.t].pats[0]);
  if (!BOTTOMS[lk.b].pats.includes(PATS[lk.bp])) lk.bp = PATS.indexOf(BOTTOMS[lk.b].pats[0]);
  if (!HAIRS.includes(lk.h)) lk.h = 'short';
  lk.s = n(lk.s, PLAYER_SKINS.length - 1);
  return lk;
}
function newPlayerLook(f) { return fixLook(applyPreset({ f, s: 3, h: 'short' }, PRESETS.find(p => p.f === !!f && !p.ht && !p.ltd))); }

/* the player's look as makeHuman options: body, skin and hair from lk, the outfit from the wardrobe slots, jerseys from the kit */
function kitLook(kitIdx, lk, number) {
  lk = fixLook(Object.assign({ f: false, s: 3, h: 'short' }, lk || {}));
  const k = KITS[kitIdx] || KITS[0], f = !!lk.f, top = TOPS[lk.t], bot = BOTTOMS[lk.b], col = (i) => PALETTE[i];
  const L = { skin: PLAYER_SKINS[lk.s], f, hair: lk.h, hairCol: 0x141010, scarf: top.kit ? k.trim : PALETTE[lk.hc] };
  // top
  if (top.kit) Object.assign(L, { kit: true, shirt: k.shirt, trim: k.trim, number, numCol: ((k.shirt >> 16 & 255) * 0.3 + (k.shirt >> 8 & 255) * 0.59 + (k.shirt & 255) * 0.11) > 150 ? '#141838' : '#f7ead0' });
  else { L.shirt = col(lk.tc); L.tp = PATS[lk.tp]; L.trim = top.robe ? PALETTE[(lk.tc + 5) % PALETTE.length] : L.shirt; }
  L.sleeve = top.sl; L.neck = top.neck; L.untuck = !top.tuck && !top.robe && !top.dress; if (top.btn) L.style = 'button'; if (top.polo) L.style = 'polo';
  if (top.robe) { L.robe = true; L.lower = L.shirt; L.trim2 = L.trim; }
  if (top.dress) { L.dress = L.shirt; L.dp = L.tp; L.trim2 = L.shirt; L.long = top.dress === 'maxi'; L.midi = top.dress === 'midi'; }
  // bottom (a dress or kaftan covers it)
  if (!top.dress && !top.robe) {
    if (bot.kit) { L.lower = k.shorts; L.kitLow = true; L.trim = L.trim || k.trim; L.kitTrim = k.trim; if (!f) { L.socks = k.trim; L.plen = 0.655; } else L.plen = 0.1; }
    else if (bot.skirt) { L.lower = col(lk.bc); L.dress = col(lk.bc); L.dp = PATS[lk.bp]; L.trim2 = col(lk.bc); L.long = bot.skirt === 'maxi'; L.midi = bot.skirt === 'midi'; L.skirtOnly = true; }
    else { L.lower = col(lk.bc); L.bp = PATS[lk.bp]; L.plen = { shorts: 0.6, knee: 0.46, crop: 0.25, full: 0.1 }[bot.len]; L.wide = bot.wide || 0; if (L.plen <= 0.1) L.pants = true; }
  }
  // shoes, hat, glasses
  const shoe = SHOES[lk.sh].id; L.shoe = shoe; L.shoes = col(lk.shc); L.sandals = shoe === 'sandal' || shoe === 'slide';
  if (shoe === 'sneaker') { L.sole = 0xf2f0ea; L.shoeTrim = top.kit ? k.trim : (lk.shc === 0 ? 0x1f2d55 : 0xf6f3ec); }
  if (top.kit && bot.kit && shoe === 'sneaker') L.shoes = 0x15161c;
  const hat = HATS[lk.ht].id; if (hat) { L.hat = hat; L.hatCol = col(lk.hc); L.kofiaCol = col(lk.hc); L.cap = col(lk.hc); L.capLogo = top.kit ? k.shirt : 0xf6f3ec; }
  if (lk.h === 'cap') { L.cap = top.kit ? k.trim : col(lk.hc); L.capLogo = top.kit ? k.shirt : 0xf6f3ec; }
  L.eye = EYES[lk.ey].id;
  return L;
}
/* shared with other players: "<body><skin><hair>" then, from the new wardrobe on, "." and 11 wardrobe slots in base 36 */
const B36 = (v) => (v | 0).toString(36);
const lookCode = (lk) => { const l = fixLook(Object.assign({ f: false, s: 3, h: 'short' }, lk || {})); return `${l.f ? 1 : 0}${l.s}${B36(HAIRS.indexOf(l.h))}.` + [l.t, l.tc, l.tp, l.b, l.bc, l.bp, l.sh, l.shc, l.ht, l.hc, l.ey].map(B36).join(''); };
const lookFrom = (code) => {
  const s = String(code || ''), m = /^([01])([0-5])([0-9a-z])(?:\.([0-9a-z]{11}))?$/.exec(s); if (!m) return null;
  const h = HAIRS[parseInt(m[3], 36)]; if (!h) return null;
  const lk = { f: m[1] === '1', s: +m[2], h };
  if (m[4]) { const v = [...m[4]].map(c => parseInt(c, 36)); [lk.t, lk.tc, lk.tp, lk.b, lk.bc, lk.bp, lk.sh, lk.shc, lk.ht, lk.hc, lk.ey] = v; }
  return fixLook(lk);
};
/* a random island outfit for people in town (and European-looking beach tourists) */
function styledLook(seed, o) {
  o = o || {};
  const r = mulberry32(seed * 9301 + 49297), pick = (a) => a[Math.floor(r() * a.length)];
  const f = o.f === undefined ? r() < 0.5 : o.f, tourist = !!o.tourist;
  const t = pick(TOPS.filter(it => !it.kit && fitsBody(it, f) && !(tourist && it.robe))), b = pick(BOTTOMS.filter(it => !it.kit && fitsBody(it, f)));
  const hats = HATS.map((h2, i) => i).filter(i => i > 0 && !(tourist && HATS[i].id === 'kofia'));
  const lk = {
    f, s: 0, h: pick(f ? (tourist ? ['bun', 'short', 'bun', 'locs'] : ['braids', 'bun', 'afro', 'locs', 'scarf', 'scarf']) : (tourist ? ['short', 'short', 'bald'] : ['short', 'short', 'afro', 'locs', 'bald'])),
    t: itemIx(TOPS, t.id), tc: Math.floor(r() * 16), tp: PATS.indexOf(pick(t.pats)),
    b: itemIx(BOTTOMS, b.id), bc: pick([0, 1, 10, 12, 13, 14, 7, 16, 17, 9]), bp: PATS.indexOf(r() < 0.6 ? b.pats[0] : pick(b.pats)),
    sh: Math.floor(r() * SHOES.length), shc: pick([0, 1, 10, 12, 16, 17, 2]), ht: r() < (tourist ? 0.55 : 0.25) ? pick(hats) : 0, hc: pick([0, 1, 10, 5, 8, 4]), ey: r() < (tourist ? 0.6 : 0.25) ? 1 + Math.floor(r() * (EYES.length - 1)) : 0,
  };
  const L = kitLook(0, fixLook(lk));
  L.skin = o.skin || pick(SKINS); L.hairCol = o.hairCol || 0x141010; L.h = f ? 0.93 + r() * 0.07 : 0.97 + r() * 0.08;
  return L;
}
