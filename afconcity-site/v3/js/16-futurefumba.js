/* ===================== 16 future Fumba: planned projects on the empty plots, plus the places for Zanzibar experiences ===================== */
/* Projects come from public plans for Greater Fumba (fumba.town, Dec 2025) and the Fumba Economic Zone; placement and designs are imagined. */
const PROJECTS = [
  { id: 'mall', name: 'Continental Mall of Zanzibar', sw: 'Soko kuu', x: MALL.x + 70, z: MALL.z + MALL.d / 2 + 44, fact: 'A 59.5-hectare shopping mall planned by the Wipi Group just past Fumba Town.' },
  { id: 'burj', name: 'Burj Zanzibar', sw: 'Mnara wa mbao', x: BURJ.x + 26, z: BURJ.z - 36, fact: 'A timber tower of about 28 storeys planned in Fumba Town for 2027 to 2028. In the game it stands closer to the road than in real life.' },
  { id: 'iit', name: 'IIT Madras Zanzibar campus', sw: 'Chuo kikuu', x: IIT.x, z: IIT.z + IIT.d / 2 + 18, fact: 'The first IIT campus outside India. Its permanent campus is planned at the highway entrance to Fumba.' },
  { id: 'hotel', name: 'AfconCity government hotel', sw: 'Hoteli', x: HOTEL.x + 40, z: HOTEL.z - 30, fact: 'A 400-bed government hotel is planned near Zanzibar Sports City for AFCON 2027 visitors.' },
  { id: 'hosp', name: 'Medical tourism hospital', sw: 'Hospitali', x: HOSP.x, z: HOSP.z + HOSP.d / 2 + 22, fact: 'A 40-bed hospital for medical tourism is part of the Greater Fumba plan.' },
  { id: 'zhc', name: 'ZHC housing towers', sw: 'Nyumba za ghorofa', x: ZHC.x - 40, z: ZHC.z + 142, fact: 'The Zanzibar Housing Corporation plans high-rise homes on 20 hectares opposite Fumba Town.' },
  { id: 'arena', name: 'Basketball training centre', sw: 'Kikapu', x: ARENA.x + 40, z: ARENA.z + ARENA.d / 2 + 16, fact: 'Land in Greater Fumba is reserved for a basketball training centre.' },
  { id: 'film', name: 'Film studio', sw: 'Studio za filamu', x: FILM.x, z: FILM.z - FILM.d / 2 - 14, fact: 'Land in Greater Fumba is reserved for a film studio.' },
  { id: 'road', name: 'Four-lane highway', sw: 'Barabara ya njia nne', x: (HIGHWAY.x0 + HIGHWAY.x1) / 2, z: -150, fact: 'A four-lane highway from Nyamanzi to the airport is planned along the Fumba road.' },
  { id: 'pier', name: 'Ferry pier', sw: 'Gati', x: PIER.x - 17, z: 0, fact: 'A ferry pier is marked on the Greater Fumba plan. Fumba Port nearby is planned to grow to about 250,000 containers a year.' },
];
const PROJECT_BY_ID = Object.fromEntries(PROJECTS.map(p => [p.id, p]));
const cranes = [];
const FUT_MAP = []; // what the radar and the full map draw for the new places

/* the nearest main road to a point, and a spot beside it on one side (+1 is the seaward side) */
function roadside(x, z, side, off, only) {
  let best = null, bd = 1e9;
  for (const s of roadSegs) { if (only ? s.c !== only : (s.c !== 'T' && s.c !== 'R')) continue; const d = segDist(x, z, s.x0, s.z0, s.x1, s.z1); if (d < bd) { bd = d; best = s; } }
  if (!best) return { x, z, ry: 0, dx: 1, dz: 0 };
  const s = best, L = Math.hypot(s.x1 - s.x0, s.z1 - s.z0) || 1, dx = (s.x1 - s.x0) / L, dz = (s.z1 - s.z0) / L;
  const t = clamp((x - s.x0) * dx + (z - s.z0) * dz, 0, L);
  let nx = -dz, nz = dx; if (nz < 0) { nx = -nx; nz = -nz; }
  nx *= side; nz *= side;
  const k = s.hw + off;
  return { x: s.x0 + dx * t + nx * k, z: s.z0 + dz * t + nz * k, ry: Math.atan2(-nx, -nz), dx, dz, rx: s.x0 + dx * t, rz: s.z0 + dz * t };
}

/* box with UVs in metres, so one facade texture tile covers uw by vh metres on every face */
function facadeGeo(w, h, d, uw, vh) {
  const g = new T.BoxGeometry(w, h, d).toNonIndexed(), P = g.attributes.position, N = g.attributes.normal, U = new Float32Array(P.count * 2);
  for (let i = 0; i < P.count; i++) {
    const x = P.getX(i), y = P.getY(i) + h / 2, z = P.getZ(i), nx = N.getX(i), ny = N.getY(i), nz = N.getZ(i);
    if (Math.abs(ny) > 0.5) { U[i * 2] = x / uw; U[i * 2 + 1] = z / vh; }
    else if (Math.abs(nx) > 0.5) { U[i * 2] = (nx > 0 ? -z : z) / uw; U[i * 2 + 1] = y / vh; }
    else { U[i * 2] = (nz > 0 ? x : -x) / uw; U[i * 2 + 1] = y / vh; }
  }
  g.setAttribute('uv', new T.BufferAttribute(U, 2));
  return g;
}
const FAC = {};
function facadeMat(kind) {
  if (FAC[kind]) return FAC[kind];
  const S = 512, c = mkCanvas(S, S), x = c.getContext('2d'), e = mkCanvas(S, S), ex = e.getContext('2d'), r = mulberry32(Math.abs(hashStr(kind)) % 100000 + 7);
  ex.fillStyle = '#000'; ex.fillRect(0, 0, S, S);
  const bays = 4, floors = 4, bw = S / bays, fh = S / floors;
  const lit = (gx, gy, w2, h2, p) => { if (r() < p) { ex.fillStyle = `rgb(255,${205 + (r() * 35) | 0},${150 + (r() * 50) | 0})`; ex.fillRect(gx, gy, w2, h2); } };
  if (kind === 'glass' || kind === 'glassG') {
    const tint = kind === 'glass' ? ['#6f9ab0', '#2c5568', '#51829a'] : ['#7aa79a', '#2e5a52', '#5a8f82'];
    for (let f = 0; f < floors; f++) for (let b = 0; b < bays; b++) {
      const gx = b * bw, gy = f * fh, g = x.createLinearGradient(gx, gy, gx + bw * 0.6, gy + fh);
      g.addColorStop(0, tint[0]); g.addColorStop(0.55, tint[1]); g.addColorStop(1, tint[2]);
      x.fillStyle = g; x.fillRect(gx, gy, bw, fh);
      x.fillStyle = 'rgba(255,255,255,0.08)'; x.fillRect(gx + bw * 0.1, gy + 6, bw * 0.18, fh - 30);
      x.fillStyle = '#2a333b'; x.fillRect(gx, gy + fh - 22, bw, 22);
      lit(gx + 6, gy + 6, bw - 12, fh - 32, 0.42);
    }
    x.fillStyle = '#d2d8dc'; for (let b = 0; b <= bays; b++) x.fillRect(b * bw - 3, 0, 6, S); for (let f = 0; f <= floors; f++) x.fillRect(0, f * fh - 3, S, 5);
    x.fillStyle = 'rgba(210,216,220,0.75)'; for (let b = 0; b < bays; b++) x.fillRect(b * bw + bw / 2 - 1, 0, 2, S);
  } else if (kind === 'apt' || kind === 'hotel') {
    x.fillStyle = kind === 'apt' ? '#efe9de' : '#f6f1e6'; x.fillRect(0, 0, S, S);
    for (let i = 0; i < 2600; i++) { x.fillStyle = `rgba(120,100,80,${r() * 0.05})`; x.fillRect(r() * S, r() * S, 2, 2); }
    for (let f = 0; f < floors; f++) for (let b = 0; b < bays; b++) {
      const gx = b * bw, gy = f * fh, ww = bw * 0.62, wh = fh * 0.56, wx = gx + (bw - ww) / 2, wy = gy + fh * 0.12;
      x.fillStyle = '#9aa3a8'; x.fillRect(wx - 4, wy - 4, ww + 8, wh + 8);
      const g = x.createLinearGradient(wx, wy, wx, wy + wh); g.addColorStop(0, '#5d7f92'); g.addColorStop(1, '#22333e'); x.fillStyle = g; x.fillRect(wx, wy, ww, wh);
      x.fillStyle = '#c8cdd0'; x.fillRect(wx + ww / 2 - 2, wy, 4, wh);
      lit(wx, wy, ww, wh, 0.38);
      // balcony slab and railing
      x.fillStyle = kind === 'hotel' ? '#d9cbb3' : '#d6d0c4'; x.fillRect(gx, gy + fh - 20, bw, 20);
      x.fillStyle = 'rgba(40,50,60,0.55)'; for (let k = 0; k < 10; k++) x.fillRect(gx + 4 + k * (bw - 8) / 10, gy + fh - 52, 3, 32);
      x.fillStyle = '#3a4048'; x.fillRect(gx, gy + fh - 54, bw, 4);
      if (kind === 'apt' && r() < 0.3) { x.fillStyle = '#e8e8e4'; x.fillRect(gx + bw - 36, gy + fh - 50, 28, 22); x.fillStyle = '#888'; x.beginPath(); x.arc(gx + bw - 22, gy + fh - 39, 7, 0, TAU); x.fill(); }
    }
    if (kind === 'hotel') { x.fillStyle = '#c8553a'; for (let b = 0; b < bays; b += 2) x.fillRect(b * bw, 0, 10, S); }
  } else if (kind === 'timber') {
    x.fillStyle = '#1d2a30'; x.fillRect(0, 0, S, S);
    for (let f = 0; f < floors; f++) {
      const gy = f * fh;
      for (let b = 0; b < bays; b++) lit(b * bw + 4, gy + 6, bw - 8, fh - 40, 0.35);
      for (let k = 0; k < 40; k++) { const lx = k * S / 40; const sh = 140 + (r() * 50) | 0; x.fillStyle = `rgb(${sh},${(sh * 0.66) | 0},${(sh * 0.4) | 0})`; x.fillRect(lx, gy + 4, 6, fh - 30); }
      x.fillStyle = '#e9ddc6'; x.fillRect(0, gy + fh - 26, S, 26);
      for (let k = 0; k < 26; k++) { x.fillStyle = ['#4f8a3a', '#6fae4c', '#3d7030'][k % 3]; x.beginPath(); x.arc(r() * S, gy + fh - 30, 8 + r() * 10, 0, TAU); x.fill(); }
    }
  } else if (kind === 'brick') {
    x.fillStyle = '#b5583a'; x.fillRect(0, 0, S, S);
    for (let yy = 0; yy < S; yy += 8) for (let xx = (yy / 8) % 2 ? -10 : 0; xx < S; xx += 20) { x.fillStyle = `rgba(${150 + r() * 60 | 0},${60 + r() * 30 | 0},${40 + r() * 20 | 0},0.6)`; x.fillRect(xx + 1, yy + 1, 18, 6); }
    for (let f = 0; f < floors; f++) for (let b = 0; b < bays; b++) {
      const gx = b * bw, gy = f * fh, ww = bw * 0.5, wh = fh * 0.62, wx = gx + (bw - ww) / 2, wy = gy + fh * 0.14;
      x.fillStyle = '#f1ece2'; x.fillRect(wx - 8, wy - 8, ww + 16, wh + 16);
      x.fillStyle = '#26394a'; x.fillRect(wx, wy, ww, wh); lit(wx, wy, ww, wh, 0.4);
      x.fillStyle = '#f1ece2'; x.fillRect(gx, gy + fh - 10, bw, 10);
    }
  } else if (kind === 'frame') {
    x.fillStyle = '#9a9890'; x.fillRect(0, 0, S, S);
    for (let f = 0; f < floors; f++) {
      const gy = f * fh;
      x.fillStyle = '#2c2b29'; x.fillRect(0, gy + 26, S, fh - 26);
      for (let b = 0; b <= bays; b++) { x.fillStyle = '#a7a59c'; x.fillRect(b * bw - 12, gy, 24, fh); }
      x.fillStyle = '#b4b2aa'; x.fillRect(0, gy, S, 26);
      for (let k = 0; k < 6; k++) { x.fillStyle = 'rgba(230,120,40,0.8)'; x.fillRect(r() * S, gy + 30 + r() * 40, 2, 30); }
    }
    for (let i = 0; i < 1800; i++) { x.fillStyle = `rgba(60,60,55,${r() * 0.12})`; x.fillRect(r() * S, r() * S, 3, 3); }
  } else if (kind === 'shed') {
    x.fillStyle = '#d9dde0'; x.fillRect(0, 0, S, S);
    for (let k = 0; k < S; k += 16) { x.fillStyle = 'rgba(0,0,0,0.08)'; x.fillRect(k, 0, 3, S); }
    x.fillStyle = '#2f6fb8'; x.fillRect(0, S - 40, S, 40);
  }
  const map = texOf(c), emis = texOf(e);
  const glassy = kind === 'glass' || kind === 'glassG';
  const mat = new T.MeshStandardMaterial({ map, emissive: 0xffffff, emissiveMap: emis, emissiveIntensity: 0, roughness: glassy ? 0.12 : kind === 'timber' ? 0.6 : 0.82, metalness: glassy ? 0.45 : 0.02, envMapIntensity: glassy ? 1.5 : 0.8 });
  nightable(mat, 0, kind === 'frame' || kind === 'shed' ? 0 : 1.15);
  FAC[kind] = mat;
  return mat;
}
const roofMat = () => M(0x5a5d63, { roughness: 0.9 });
/* a building block: facade on the sides, a parapet and some plant on the roof */
function block(g, x, z, w, h, d, kind, ry, o) {
  o = o || {};
  const fm = facadeMat(kind), uw = o.uw || 14, vh = o.vh || 14, y0 = o.y || 0;
  const grp = new T.Group(); grp.position.set(x, y0, z); grp.rotation.y = ry || 0; g.add(grp);
  const m = meshOf(facadeGeo(w, h, d, uw, vh), [fm, fm, roofMat(), roofMat(), fm, fm], true); m.position.y = h / 2; grp.add(m);
  const b = new Builder();
  if (o.parapet !== false) { const t = 0.35, pc = C(o.trim || 0xe9e4da); for (const [px, pz, sw, sd] of [[0, d / 2 - t / 2, w + 0.1, t], [0, -d / 2 + t / 2, w + 0.1, t], [w / 2 - t / 2, 0, t, d + 0.1], [-w / 2 + t / 2, 0, t, d + 0.1]]) b.add(new T.BoxGeometry(sw, 1.0, sd), mat4(px, h + 0.5, pz, 0), pc); }
  if (o.hvac !== false && w * d > 200) for (let i = 0; i < 3; i++) { b.add(roundedBox(2.4, 1.3, 1.6, 0.12, 1), mat4((i - 1) * w * 0.22, h + 0.65, d * 0.18, 0), C(0xc9ccd0)); b.add(new T.CylinderGeometry(0.5, 0.5, 0.1, 12), mat4((i - 1) * w * 0.22, h + 1.32, d * 0.18, 0), C(0x3a3d44)); }
  if (!b.empty) grp.add(meshOf(b.build(), VC, true));
  return m;
}
function obbOf(x, z, w, d, ry, tag) { const c = addObb(x, z, w, d, -(ry || 0), tag); c.h = 99; footprints.push({ x, z, w: w + 6, d: d + 6, ang: -(ry || 0) }); FUT_MAP.push({ x, z, w, d, col: '#d9d3c7', line: true }); return c; }
const latTex = () => { if (FAC.lat) return FAC.lat; const c = mkCanvas(64, 64), x = c.getContext('2d'); x.strokeStyle = '#f3b41b'; x.lineWidth = 5; x.strokeRect(2, 2, 60, 60); x.lineWidth = 3; x.beginPath(); x.moveTo(2, 2); x.lineTo(62, 62); x.moveTo(62, 2); x.lineTo(2, 62); x.stroke(); FAC.lat = new T.MeshStandardMaterial({ map: texOf(c), alphaTest: 0.5, side: T.DoubleSide, roughness: 0.55, metalness: 0.3 }); return FAC.lat; };
function towerCrane(x, z, h, jib, ry, y0) {
  const g = new T.Group(); g.position.set(x, y0 || 0, z);
  const lat = latTex(), yel = M(0xf3b41b, { roughness: 0.5, metalness: 0.3 });
  const mast = new T.Mesh(facadeGeo(1.8, h, 1.8, 1.8, 1.8), lat); mast.position.y = h / 2; g.add(mast);
  g.add(at(meshOf(new T.BoxGeometry(3.4, 0.8, 3.4), M(0x8a8d93), true), 0, 0.4, 0));
  const slew = new T.Group(); slew.position.y = h; g.add(slew);
  slew.add(at(meshOf(roundedBox(2.4, 2.2, 2.6, 0.2, 1), yel, true), 0.6, 1.2, 1.5));
  const j = new T.Mesh(facadeGeo(jib, 1.4, 1.4, 1.4, 1.4), lat); j.position.set(jib / 2, 1.6, 0); slew.add(j);
  const cj = new T.Mesh(facadeGeo(jib * 0.32, 1.2, 1.4, 1.4, 1.4), lat); cj.position.set(-jib * 0.16, 1.6, 0); slew.add(cj);
  slew.add(at(meshOf(new T.BoxGeometry(3, 2.2, 2.2), M(0x9a9890), true), -jib * 0.28, 0.8, 0));
  const peak = new T.Mesh(facadeGeo(1.4, 6, 1.4, 1.4, 1.4), lat); peak.position.set(0, 5.2, 0); slew.add(peak);
  const trolley = new T.Group(); trolley.position.set(jib * 0.62, 0.9, 0); slew.add(trolley);
  const drop = h * 0.55, line = meshOf(new T.CylinderGeometry(0.03, 0.03, drop, 4), M(0x222222), false); line.position.y = -drop / 2; trolley.add(line);
  trolley.add(at(meshOf(roundedBox(0.8, 0.9, 0.8, 0.1, 1), yel, true), 0, -drop, 0));
  const lightM = new T.MeshStandardMaterial({ color: 0xff2a1a, emissive: C(0xff2a1a), emissiveIntensity: 0.2 }); nightable(lightM, 0.2, 3);
  slew.add(at(new T.Mesh(new T.SphereGeometry(0.25, 8, 6), lightM), jib, 2.4, 0)); slew.add(at(new T.Mesh(new T.SphereGeometry(0.25, 8, 6), lightM), 0, 8.4, 0));
  g.rotation.y = ry || 0; g.userData.dynamic = true; scene.add(g);
  if (!y0) addObb(x, z, 3.4, 3.4, 0);
  cranes.push({ slew, base: rnd() * TAU, sp: rr(0.04, 0.09) * (rnd() < 0.5 ? 1 : -1), amp: rr(0.5, 1.4), ph: rnd() * 10 });
  return g;
}
/* merge the many small static meshes the new places are made of: one draw call per shared material */
function mergeStatic(roots) {
  const groups = new Map(), drop = [];
  const v = new T.Vector3();
  for (const r of roots) r.traverse(o => {
    if (!o.isMesh || o.isInstancedMesh || o.isSkinnedMesh || Array.isArray(o.material) || o.userData.keep) return;
    for (let q = o; q; q = q.parent) if (q.userData && q.userData.dynamic) return;
    if (!o.geometry.attributes.normal) return;
    const key = o.material.uuid + (o.castShadow ? 's' : '') + (o.receiveShadow ? 'r' : '');
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(o);
  });
  let saved = 0;
  for (const list of groups.values()) {
    if (list.length < 2) continue;
    const b = new Builder();
    for (const o of list) { o.updateWorldMatrix(true, false); b.add(o.geometry, o.matrixWorld, null, { uv: o.geometry.attributes.uv ? 'keep' : 'box', tile: 4 }); drop.push(o); }
    const m = new T.Mesh(b.build(), list[0].material); m.castShadow = list[0].castShadow; m.receiveShadow = list[0].receiveShadow; m.userData.merged = list.length; scene.add(m);
    saved += list.length - 1; void v;
  }
  for (const o of drop) o.parent && o.parent.remove(o);
  return saved;
}
function updateCranes(t) { for (const c of cranes) c.slew.rotation.y = c.base + Math.sin(t * c.sp + c.ph) * c.amp; }
/* low sun glare when you look toward the sun */
let glare = null;
const glareV = new T.Vector3();
function updateGlare() {
  if (!glare) { glare = new T.Sprite(new T.SpriteMaterial({ map: glowTex(), color: C(0xffd9a0), blending: T.AdditiveBlending, depthWrite: false, transparent: true, fog: false, opacity: 0 })); glare.scale.setScalar(150); scene.add(glare); }
  camera.getWorldDirection(glareV);
  const k = smooth(clamp((glareV.dot(SUN_DIR) - 0.55) / 0.42, 0, 1)) * (1 - clamp(night * 3, 0, 1));
  glare.visible = k > 0.01; glare.material.opacity = k * 0.42;
  glare.position.copy(camera.position).addScaledVector(SUN_DIR, 320);
}

/* printed construction hoarding around a site, with an opening for the gate */
function hoardingTex(title, sub, col) {
  const c = mkCanvas(1024, 128), x = c.getContext('2d');
  x.fillStyle = col || '#141838'; x.fillRect(0, 0, 1024, 128); kangaEdge(x, 1024, 128, 9);
  x.fillStyle = '#f7ead0'; x.textAlign = 'left'; x.textBaseline = 'middle';
  fitFont(x, title, 900, 62, 640, FONT_D); x.fillText(title, 34, 64);
  x.fillStyle = '#f3b41b'; x.textAlign = 'right'; fitFont(x, sub, 700, 30, 330, FONT_B); x.fillText(sub, 990, 64);
  const t = texOf(c); t.wrapS = T.RepeatWrapping; return t;
}
function hoarding(x0, z0, x1, z1, title, sub, gate, col) {
  const tex = hoardingTex(title, sub, col), mat = new T.MeshStandardMaterial({ map: tex, roughness: 0.8 }), h = 2.4;
  const edges = [[x0, z1, x1, z1, 's'], [x1, z0, x1, z1, 'e'], [x0, z0, x1, z0, 'n'], [x0, z0, x0, z1, 'w']];
  for (const [ax, az, bx, bz, side] of edges) {
    const L = Math.hypot(bx - ax, bz - az), along = ax === bx ? 'z' : 'x';
    const parts = gate && gate.side === side ? [[0, gate.at - gate.w / 2], [gate.at + gate.w / 2, L]] : [[0, L]];
    for (const [s0, s1] of parts) {
      const len = s1 - s0; if (len < 1) continue;
      const mid = s0 + len / 2, cx = along === 'x' ? ax + mid : ax, cz = along === 'z' ? az + mid : az, ry = along === 'x' ? 0 : Math.PI / 2;
      const g = new T.PlaneGeometry(len, h); const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setX(i, uv.getX(i) * len / 16);
      for (const f of [0, Math.PI]) { const m = new T.Mesh(g, mat); m.position.set(cx, h / 2, cz); m.rotation.y = ry + f; m.receiveShadow = true; m.castShadow = f === 0; scene.add(m); }
      addObb(cx, cz, along === 'x' ? len : 0.3, along === 'x' ? 0.3 : len, 0);
    }
  }
}
/* roadside billboard on two legs, lit at night */
function adTex(a, b, bg, fg) {
  const c = mkCanvas(1024, 512), x = c.getContext('2d');
  const g = x.createLinearGradient(0, 0, 1024, 512); g.addColorStop(0, bg[0]); g.addColorStop(1, bg[1]); x.fillStyle = g; x.fillRect(0, 0, 1024, 512);
  x.globalAlpha = 0.18; x.fillStyle = '#ffffff'; for (let i = 0; i < 7; i++) { x.beginPath(); x.arc(860 - i * 40, 120 + i * 30, 160 - i * 12, 0, TAU); x.fill(); } x.globalAlpha = 1;
  kangaEdge(x, 1024, 512, 18);
  x.textAlign = 'left'; x.textBaseline = 'alphabetic'; x.fillStyle = fg || '#ffffff';
  fitFont(x, a, 900, 150, 900, FONT_D); x.fillText(a, 56, 250);
  x.fillStyle = '#f7ead0'; fitFont(x, b, 700, 54, 900, FONT_B); x.fillText(b, 60, 360);
  return texOf(c, { clamp: true });
}
const BOARDS = [];
function billboard(x, z, ry, a, b, bg, fg, slot) {
  const g = new T.Group(); g.position.set(x, 0, z); g.rotation.y = ry;
  const tex = adTex(a, b, bg, fg), mat = new T.MeshStandardMaterial({ map: tex, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.03, roughness: 0.5 });
  nightable(mat, 0.03, 0.8);
  const steel = M(0x5a5f6b, { metalness: 0.6, roughness: 0.4 });
  for (const s of [-1, 1]) { g.add(at(meshOf(new T.CylinderGeometry(0.22, 0.28, 7, 10), steel, true), s * 3.4, 3.5, 0)); }
  g.add(at(meshOf(new T.BoxGeometry(12.4, 6.4, 0.4), M(0x24262c), true), 0, 9.6, -0.1));
  const p = new T.Mesh(new T.PlaneGeometry(12, 6), mat); p.position.set(0, 9.6, 0.12); g.add(p);
  g.add(at(meshOf(new T.BoxGeometry(12, 0.25, 1.1), steel, true), 0, 6.3, 0.4));
  for (let i = -2; i <= 2; i++) { const l = meshOf(new T.BoxGeometry(0.5, 0.2, 0.3), M(0x1a1a1e), false); l.position.set(i * 2.6, 6.5, 0.8); g.add(l); }
  scene.add(g);
  for (const s of [-1, 1]) addCircle(x + Math.cos(ry) * s * 3.4, z - Math.sin(ry) * s * 3.4, 0.3, 'small');
  if (slot) BOARDS.push(Object.assign({ x, z, ry, mat, def: tex, kind: 'board' }, slot));
  return g;
}
/* a construction-project signboard: what the Fumba ya kesho tour visits */
function projectBoard(p, ry) {
  const g = new T.Group(); g.position.set(p.x, 0, p.z); g.rotation.y = ry || 0;
  const c = mkCanvas(1024, 640), x = c.getContext('2d');
  x.fillStyle = '#f6f1e7'; x.fillRect(0, 0, 1024, 640);
  x.fillStyle = '#141838'; x.fillRect(0, 0, 1024, 150); kangaEdge(x, 1024, 150, 12);
  x.fillStyle = '#f3b41b'; x.textAlign = 'left'; x.textBaseline = 'middle'; x.font = `800 34px ${FONT_B}`; x.fillText('GREATER FUMBA · PLANNED PROJECT', 40, 76);
  x.fillStyle = '#141838'; fitFont(x, p.name.toUpperCase(), 900, 96, 940, FONT_D); x.fillText(p.name.toUpperCase(), 40, 236);
  x.fillStyle = '#e0553a'; x.font = `700 40px ${FONT_B}`; x.fillText(p.sw, 42, 316);
  x.fillStyle = '#2a2d33'; x.font = `500 32px ${FONT_B}`;
  const words = p.fact.split(' '); let line = '', y = 392;
  for (const w2 of words) { const tl = line ? line + ' ' + w2 : w2; if (x.measureText(tl).width > 930) { x.fillText(line, 42, y); line = w2; y += 44; } else line = tl; }
  if (line) x.fillText(line, 42, y);
  const tex = texOf(c, { clamp: true });
  const mat = new T.MeshStandardMaterial({ map: tex, roughness: 0.6, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.04 }); nightable(mat, 0.04, 0.55);
  const board = new T.Mesh(new T.PlaneGeometry(6.4, 4), mat); board.position.set(0, 3.6, 0.09); g.add(board);
  g.add(at(meshOf(new T.BoxGeometry(6.7, 4.3, 0.16), M(0x232a63), true), 0, 3.6, 0));
  for (const s of [-1, 1]) g.add(at(meshOf(new T.CylinderGeometry(0.09, 0.11, 5.6, 8), M(0x6a6e78, { metalness: 0.5 }), true), s * 2.8, 2.8, -0.12));
  scene.add(g);
  for (const s of [-1, 1]) addCircle(p.x + Math.cos(ry || 0) * s * 2.8, p.z - Math.sin(ry || 0) * s * 2.8, 0.15, 'small');
}
function siteGround(x, z, w, d, tex, tint, order) { flatShape(rectPts(x, z, w, d), groundMat(TEX[tex] || TEX.soil, 7, order || 2, tint), 0.035); footprints.push({ x, z, w, d, ang: 0 }); FUT_MAP.push({ x, z, w, d, col: { soil: '#c9a77a', paver: '#cfc4ae', concrete: '#c9c6bd', grass: '#8fbf6a' }[tex] || '#c9a77a' }); }
function pileOf(x, z, n, col, sz) { const b = new Builder(), cc = C(col); for (let i = 0; i < n; i++) b.add(roundedBox(sz[0], sz[1], sz[2], 0.04, 1), mat4((i % 4 - 1.5) * sz[0] * 1.05, sz[1] / 2 + Math.floor(i / 8) * sz[1], (Math.floor(i / 4) % 2 - 0.5) * sz[2] * 1.05, 0), cc); const m = meshOf(b.build(), VC, true); m.position.set(x, 0, z); scene.add(m); return m; }
function truck(x, z, ry, col, mixer) {
  const g = new T.Group(); g.position.set(x, 0, z); g.rotation.y = ry;
  const body = M(col, { roughness: 0.45, metalness: 0.3 });
  g.add(at(meshOf(roundedBox(2.5, 2.4, 2.4, 0.25), body, true), 0, 1.7, 3.2));
  g.add(at(meshOf(new T.PlaneGeometry(2.1, 1.0), carGlass, false), 0, 2.3, 4.41));
  g.add(at(meshOf(new T.BoxGeometry(2.4, 0.4, 7.4), M(0x2b2b30), true), 0, 0.85, -0.3));
  if (mixer) { const d = meshOf(new T.CylinderGeometry(1.0, 1.25, 4.4, 16), M(0xe8e4dc, { roughness: 0.4, metalness: 0.4 }), true); d.rotation.x = Math.PI / 2 - 0.18; d.position.set(0, 2.5, -1.2); g.add(d); }
  else g.add(at(meshOf(new T.BoxGeometry(2.4, 1.1, 5.0), M(0xc9a23a, { roughness: 0.7 }), true), 0, 1.6, -1.4));
  for (const [wx, wz] of [[-1.1, 3.0], [1.1, 3.0], [-1.1, -1.6], [1.1, -1.6], [-1.1, -3.0], [1.1, -3.0]]) { const w2 = meshOf(new T.CylinderGeometry(0.5, 0.5, 0.4, 14), rubber, true); w2.rotation.z = Math.PI / 2; w2.position.set(wx, 0.5, wz); g.add(w2); }
  scene.add(g); addObb(x, z, 2.6, 9, -ry);
  return g;
}

/* a curved barrel roof over a span, running along x or z */
function barrelRoof(cx, cy, cz, span, length, rise, alongX, mat) {
  const half = span / 2, r = (half * half + rise * rise) / (2 * rise), a = Math.asin(clamp(half / r, -1, 1));
  const geo = new T.CylinderGeometry(r, r, length, 28, 1, true, Math.PI - a, 2 * a);
  geo.rotateX(Math.PI / 2); // axis along z; the arc (around theta = PI) now sits on top
  if (alongX) geo.rotateY(Math.PI / 2);
  const m = meshOf(geo, mat, true); m.position.set(cx, cy - (r - rise), cz); return m;
}
/* ---------- the projects ---------- */
function buildMall() {
  const M0 = MALL, g = new T.Group();
  siteGround(M0.x, M0.z + 30, M0.w + 70, M0.d + 140, 'soil', 0xd8b98a, 2);
  flatShape(rectPts(M0.x + 60, M0.z + M0.d / 2 + 40, 150, 60), groundMat(TEX.concrete, 8, 3, 0xd8d4cc, false), 0.04);
  // the finished east wing: glass, three tall floors
  const ew = M0.w * 0.52, ex = M0.x + M0.w / 2 - ew / 2;
  block(g, ex, M0.z, ew, 18, M0.d, 'glass', 0, { uw: 12, vh: 6 });
  obbOf(ex, M0.z, ew, M0.d);
  const canopy = meshOf(roundedBox(40, 0.8, 12, 0.3), M(0xf6f1e7), true); canopy.position.set(ex - 10, 7.5, M0.z + M0.d / 2 + 6); g.add(canopy);
  for (const s of [-1, 1]) g.add(at(meshOf(new T.CylinderGeometry(0.4, 0.4, 7.5, 12), M(0xd8dce2, { metalness: 0.6 }), true), ex - 10 + s * 18, 3.75, M0.z + M0.d / 2 + 11));
  const sg = signMesh('CONTINENTAL MALL OF ZANZIBAR', 52, 4.2, { bg: '#141838' }); sg.position.set(ex, 15.2, M0.z + M0.d / 2 + 0.6); g.add(sg);
  // the west wing still a concrete frame with cranes
  const wx = M0.x - M0.w / 2 + (M0.w - ew) / 2, ww = M0.w - ew - 4;
  block(g, wx, M0.z, ww, 12, M0.d, 'frame', 0, { uw: 10, vh: 8, parapet: false, hvac: false });
  obbOf(wx, M0.z, ww, M0.d);
  const cols = new Builder(), cg = C(0xa7a59c);
  for (let i = 0; i < 6; i++) for (let k = 0; k < 4; k++) cols.add(new T.BoxGeometry(0.8, 6, 0.8), mat4(wx - ww / 2 + 6 + i * (ww - 12) / 5, 15, M0.z - M0.d / 2 + 10 + k * (M0.d - 20) / 3, 0), cg);
  cols.add(new T.BoxGeometry(ww * 0.6, 0.5, M0.d * 0.5), mat4(wx - ww * 0.15, 18.2, M0.z - M0.d * 0.12, 0), cg);
  g.add(meshOf(cols.build(), VC, true));
  scene.add(g);
  towerCrane(wx - 20, M0.z - 10, 46, 42, 0.4, 0); towerCrane(wx + 34, M0.z + 30, 40, 36, 2.2, 0);
  hoarding(M0.x - M0.w / 2 - 30, M0.z - M0.d / 2 - 30, wx + ww / 2 + 2, M0.z + M0.d / 2 + 70, 'CONTINENTAL MALL OF ZANZIBAR', 'Kazi inaendelea · works in progress', { side: 's', at: 70, w: 18 }, '#e0553a');
  // site yard: cement truck, block piles, the mixer the shift works at
  truck(CONSTRUCTION.truck.x, CONSTRUCTION.truck.z, Math.PI / 2, 0xf3b41b, false);
  truck(wx - 40, M0.z + M0.d / 2 + 50, -0.4, 0xe9e4da, true);
  const mix = new T.Group(); mix.position.set(CONSTRUCTION.mixer.x, 0, CONSTRUCTION.mixer.z);
  const drum = meshOf(new T.CylinderGeometry(0.9, 1.1, 1.6, 16), M(0xe0553a, { roughness: 0.5, metalness: 0.3 }), true); drum.rotation.x = 1.1; drum.position.y = 1.3; mix.add(drum); CONSTRUCTION.drum = drum;
  mix.add(at(meshOf(new T.BoxGeometry(1.6, 0.4, 2.2), M(0x3a3d44), true), 0, 0.4, 0)); mix.userData.dynamic = true; scene.add(mix); addCircle(mix.position.x, mix.position.z, 1.3);
  pileOf(wx + 10, M0.z + M0.d / 2 + 30, 32, 0x9a9890, [1.2, 0.6, 0.6]); addObb(wx + 10, M0.z + M0.d / 2 + 30, 5.5, 2.8, 0);
  pileOf(wx - 4, M0.z + M0.d / 2 + 22, 24, 0x7a8a9a, [1.0, 0.5, 0.7]); addObb(wx - 4, M0.z + M0.d / 2 + 22, 4.6, 3.2, 0);
  parkedCars([[ex - 30, M0.z + M0.d / 2 + 28, Math.PI / 2], [ex - 24, M0.z + M0.d / 2 + 28, Math.PI / 2], [ex + 10, M0.z + M0.d / 2 + 28, Math.PI / 2], [ex + 22, M0.z + M0.d / 2 + 28, Math.PI / 2], [ex + 40, M0.z + M0.d / 2 + 50, -Math.PI / 2]]);
}
function buildBurj() {
  const B0 = BURJ, g = new T.Group(), floors = 28, fh = 3.4, built = 24;
  siteGround(B0.x, B0.z, 120, 110, 'paver', 0xffffff, 3);
  const slabs = new Builder(), green = new Builder(), greens = [C(0x4f8a3a), C(0x6fae4c), C(0x3d7030)], sc = C(0xf2ede2);
  for (let i = 2; i <= built; i++) {
    const sw = B0.w + Math.sin(i * 0.42) * 3.2 + 4, sd = B0.d + Math.cos(i * 0.37) * 2.6 + 4, ry = Math.sin(i * 0.2) * 0.08;
    slabs.add(roundedBox(sw, 0.5, sd, 2.4, 1), mat4(B0.x, i * fh + 0.25, B0.z, ry), sc);
    for (let p = 0; p < 10; p++) { const a = p / 10 * TAU + i, rx = Math.cos(a) * sw / 2 * 0.92, rz = Math.sin(a) * sd / 2 * 0.92; green.add(new T.IcosahedronGeometry(0.7 + hash2(i, p) * 0.5, 0), mat4(B0.x + rx, i * fh + 0.8, B0.z + rz, 0, 1, 0.7, 1), greens[(i + p) % 3]); }
  }
  g.add(meshOf(slabs.build(), new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.7 }), true));
  g.add(meshOf(green.build(), new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.9 }), false));
  block(g, B0.x, B0.z, B0.w, built * fh, B0.d, 'timber', 0, { uw: 10, vh: fh * 4, parapet: false, hvac: false });
  block(g, B0.x, B0.z, B0.w - 2, (floors - built) * fh, B0.d - 2, 'frame', 0, { uw: 10, vh: fh * 4, parapet: false, hvac: false, y: built * fh });
  const gm = facadeMat('glass'), lobby = meshOf(facadeGeo(B0.w + 8, 6.4, B0.d + 8, 12, 6.4), [gm, gm, roofMat(), roofMat(), gm, gm], true); lobby.position.set(B0.x, 3.2, B0.z); g.add(lobby);
  const sg = signMesh('BURJ ZANZIBAR', 22, 2.8, { bg: '#5c3319' }); sg.position.set(B0.x, 8.2, B0.z + B0.d / 2 + 4.05); g.add(sg);
  scene.add(g); obbOf(B0.x, B0.z, B0.w + 8, B0.d + 8);
  towerCrane(B0.x + B0.w / 2 + 6, B0.z - 4, floors * fh + 16, 38, 2.6, 0);
  // garden and palms
  for (let i = 0; i < 10; i++) { const a = i / 10 * TAU; AFCON_PALMS.push([B0.x + Math.cos(a) * 46, B0.z + Math.sin(a) * 42]); }
}
function buildIIT() {
  const I = IIT, g = new T.Group();
  siteGround(I.x, I.z, I.w + 30, I.d + 30, 'grass', 0xb8d88a, 2);
  flatShape(rectPts(I.x, I.z + 6, 60, 46), groundMat(TEX.paver, 3, 3, 0xffffff, false), 0.045);
  const blocks = [[I.x - 52, I.z - 22, 54, 14, 26], [I.x + 52, I.z - 22, 54, 14, 26], [I.x, I.z - 40, 80, 18, 22], [I.x - 64, I.z + 30, 30, 10, 34], [I.x + 64, I.z + 30, 30, 10, 34]];
  for (const [x, z, w, h, d] of blocks) { block(g, x, z, w, h, d, 'brick', 0, { uw: 12, vh: 7, trim: 0xf1ece2 }); obbOf(x, z, w, d); }
  const portico = meshOf(roundedBox(30, 1, 8, 0.3), M(0xf1ece2), true); portico.position.set(I.x, 9, I.z - 27); g.add(portico);
  for (let i = -2; i <= 2; i++) g.add(at(meshOf(new T.CylinderGeometry(0.45, 0.45, 9, 12), M(0xf1ece2), true), I.x + i * 6.5, 4.5, I.z - 24));
  const sg = signMesh('IIT MADRAS · ZANZIBAR CAMPUS', 26, 2.6, { bg: '#7a2a1a' }); sg.position.set(I.x, 13, I.z - 30.9); g.add(sg);
  scene.add(g);
  for (let i = 0; i < 8; i++) AFCON_PALMS.push([I.x - 36 + (i % 4) * 24, I.z + 6 + Math.floor(i / 4) * 24]);
  // gate on the road
  const gate = roadside(I.x, -125, -1, 6);
  const gg = new T.Group(); gg.position.set(gate.x, 0, gate.z); gg.rotation.y = gate.ry;
  for (const s of [-1, 1]) gg.add(at(meshOf(roundedBox(1.4, 5, 1.4, 0.2), M(0xb5583a), true), s * 7, 2.5, 0));
  gg.add(at(meshOf(new T.BoxGeometry(15.4, 1.6, 0.4), M(0xb5583a), true), 0, 5.2, 0));
  const gs = signMesh('IIT MADRAS ZANZIBAR', 12, 1.4, { bg: '#7a2a1a' }); gs.position.set(0, 5.2, 0.22); gg.add(gs);
  scene.add(gg); for (const s of [-1, 1]) addCircle(gate.x + Math.cos(gate.ry) * s * 7, gate.z - Math.sin(gate.ry) * s * 7, 1);
}
function buildHotel() {
  const H = HOTEL, g = new T.Group();
  siteGround(H.x, H.z + 6, H.w + 60, 100, 'paver', 0xffffff, 3);
  block(g, H.x, H.z, H.w, 34, H.d, 'hotel', 0, { uw: 12, vh: 6.8 });
  block(g, H.x - H.w / 2 + 12, H.z + 22, 24, 8, 22, 'glass', 0, { uw: 12, vh: 4 });
  obbOf(H.x, H.z, H.w, H.d); obbOf(H.x - H.w / 2 + 12, H.z + 22, 24, 22);
  const pool = new T.Mesh(new T.PlaneGeometry(40, 14), new T.MeshStandardMaterial({ color: C(0x2fc4d6), roughness: 0.08, metalness: 0.2, envMapIntensity: 1.4, polygonOffset: true, polygonOffsetFactor: -6, polygonOffsetUnits: -24 }));
  pool.rotation.x = -Math.PI / 2; pool.position.set(H.x + 20, 0.12, H.z + 30); g.add(pool);
  g.add(at(meshOf(new T.BoxGeometry(42, 0.18, 16), M(0xf2ede2), true), H.x + 20, 0.0, H.z + 30));
  addObb(H.x + 20, H.z + 30, 40, 14, 0, 'small');
  for (let i = 0; i < 8; i++) { const l = meshOf(roundedBox(0.75, 0.25, 2.0, 0.08), M(0xf6f1e7), true); l.position.set(H.x + 2 + i * 5, 0.3, H.z + 40); g.add(l); }
  const sg = signMesh('HOTELI YA AFCONCITY', 30, 3, { bg: '#c8553a' }); sg.position.set(H.x, 31, H.z + H.d / 2 + 0.6); g.add(sg);
  scene.add(g);
  for (let i = 0; i < 9; i++) AFCON_PALMS.push([H.x - 50 + i * 12.5, H.z + 46]);
  towerCrane(H.x + H.w / 2 + 10, H.z - 6, 44, 34, 1.2, 0);
}
function buildHospital() {
  const H = HOSP, g = new T.Group();
  siteGround(H.x, H.z + 10, H.w + 40, H.d + 60, 'concrete', 0xe8e4dc, 3);
  block(g, H.x, H.z, H.w, 20, H.d, 'glassG', 0, { uw: 12, vh: 5 });
  block(g, H.x - H.w / 2 + 10, H.z + H.d / 2 + 6, 20, 6, 12, 'apt', 0, { uw: 10, vh: 5 });
  obbOf(H.x, H.z, H.w, H.d); obbOf(H.x - H.w / 2 + 10, H.z + H.d / 2 + 6, 20, 12);
  const pad = new T.Mesh(new T.CircleGeometry(6, 32), new T.MeshStandardMaterial({ map: (() => { const c = mkCanvas(256, 256), x = c.getContext('2d'); x.fillStyle = '#2a2d33'; x.fillRect(0, 0, 256, 256); x.strokeStyle = '#f3b41b'; x.lineWidth = 10; x.beginPath(); x.arc(128, 128, 110, 0, TAU); x.stroke(); x.fillStyle = '#f7ead0'; x.font = `900 150px ${FONT_D}`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('H', 128, 136); return texOf(c, { clamp: true }); })(), roughness: 0.8 }));
  pad.rotation.x = -Math.PI / 2; pad.position.set(H.x + 18, 21.1, H.z); g.add(pad);
  const cross = signMesh('+', 4, 4, { bg: '#1e9b57', edge: false }); cross.position.set(H.x + H.w / 2 - 6, 16, H.z + H.d / 2 + 0.6); g.add(cross);
  const sg = signMesh('HOSPITALI · FUMBA MEDICAL', 26, 2.6, { bg: '#1e9b57' }); sg.position.set(H.x - 8, 17, H.z + H.d / 2 + 0.6); g.add(sg);
  scene.add(g);
}
function buildZHC() {
  const Z = ZHC, g = new T.Group();
  siteGround(Z.x, Z.z, 320, 260, 'soil', 0xd9c49a, 2);
  const towers = [[Z.x - 110, Z.z - 70, 15, true], [Z.x - 30, Z.z - 90, 18, true], [Z.x + 60, Z.z - 60, 13, true], [Z.x - 70, Z.z + 40, 10, false], [Z.x + 30, Z.z + 30, 6, false], [Z.x + 120, Z.z + 10, 16, true]];
  for (const [x, z, fl, done] of towers) {
    const h = fl * 3.2;
    block(g, x, z, 30, h, 20, done ? 'apt' : 'frame', 0, { uw: 12, vh: 6.4, parapet: done, hvac: done });
    obbOf(x, z, 30, 20);
    if (!done) towerCrane(x + 20, z, h + 22, 32, rnd() * TAU, 0);
  }
  scene.add(g);
  hoarding(Z.x - 160, Z.z - 130, Z.x + 160, Z.z + 130, 'ZHC · NYUMBA ZA GHOROFA', 'Planned housing · 20 hectares', { side: 's', at: 160, w: 20 }, '#232a63');
}
function buildArena() {
  const A = ARENA, g = new T.Group();
  siteGround(A.x, A.z + 10, A.w + 30, A.d + 60, 'concrete', 0xe0dcd2, 3);
  block(g, A.x, A.z, A.w, 12, A.d, 'shed', 0, { uw: 20, vh: 12, parapet: false, hvac: false });
  g.add(barrelRoof(A.x, 12, A.z, A.d + 2, A.w + 2, 9, true, M(0xe0553a, { roughness: 0.5, metalness: 0.3, side: T.DoubleSide })));
  obbOf(A.x, A.z, A.w, A.d);
  const court = new T.Mesh(new T.PlaneGeometry(28, 15), new T.MeshStandardMaterial({ map: (() => { const c = mkCanvas(512, 280), x = c.getContext('2d'); x.fillStyle = '#d0703a'; x.fillRect(0, 0, 512, 280); x.strokeStyle = '#f7ead0'; x.lineWidth = 4; x.strokeRect(8, 8, 496, 264); x.beginPath(); x.moveTo(256, 8); x.lineTo(256, 272); x.stroke(); x.beginPath(); x.arc(256, 140, 36, 0, TAU); x.stroke(); for (const s of [8, 504]) { x.beginPath(); x.arc(s, 140, 110, s < 100 ? -1.3 : 1.84, s < 100 ? 1.3 : 4.44); x.stroke(); } return texOf(c, { clamp: true }); })(), roughness: 0.8 }));
  court.material.polygonOffset = true; court.material.polygonOffsetFactor = -5; court.material.polygonOffsetUnits = -20; court.rotation.x = -Math.PI / 2; court.position.set(A.x + 20, 0.08, A.z + A.d / 2 + 22); g.add(court);
  for (const s of [-1, 1]) { const hoop = new T.Group(); hoop.position.set(A.x + 20 + s * 13.5, 0, A.z + A.d / 2 + 22); hoop.add(at(meshOf(new T.CylinderGeometry(0.1, 0.1, 3.4, 8), M(0x3a3d44), true), 0, 1.7, 0)); hoop.add(at(meshOf(new T.BoxGeometry(0.1, 1.1, 1.8), M(0xf6f1e7), true), -s * 0.3, 3.4, 0)); scene.add(hoop); addCircle(hoop.position.x, hoop.position.z, 0.2, 'small'); }
  const sg = signMesh('KITUO CHA KIKAPU · BASKETBALL', 30, 2.6, { bg: '#e0553a' }); sg.position.set(A.x, 10, A.z + A.d / 2 + 0.6); g.add(sg);
  scene.add(g);
}
function buildFilm() {
  const F = FILM, g = new T.Group();
  siteGround(F.x, F.z, F.w, F.d, 'concrete', 0xe4e0d6, 3);
  for (let i = 0; i < 3; i++) {
    const x = F.x - 60 + i * 60, z = F.z + 10;
    block(g, x, z, 44, 16, 60, 'shed', 0, { uw: 44, vh: 16, parapet: false, hvac: false });
    g.add(barrelRoof(x, 16, z, 45, 60.5, 6, false, M(0xc9ccd0, { metalness: 0.5, roughness: 0.4, side: T.DoubleSide })));
    const num = signMesh(`STAGE ${i + 1}`, 10, 2, { bg: '#141838' }); num.position.set(x, 12, z - 30.5); num.rotation.y = Math.PI; g.add(num);
    obbOf(x, z, 44, 60);
  }
  const sg = signMesh('FUMBA FILM STUDIOS', 26, 3, { bg: '#141838' }); sg.position.set(F.x, 21.5, F.z - 20.6); sg.rotation.y = Math.PI; g.add(sg);
  scene.add(g);
}
function buildHighwayWorks() {
  // the new carriageway is graded beside the old road; barriers, cones and a roller
  const pts = [];
  for (let x = HIGHWAY.x0; x <= HIGHWAY.x1; x += 10) { const r = roadside(x, -125, -1, 4.2, 'T'); pts.push(r); }
  const b = new Builder(), soil = new Builder(), wc = C(0xe9e4da), rc = C(0xd8352a);
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], c = pts[i + 1], nx = a.x - a.rx, nz = a.z - a.rz, l = Math.hypot(nx, nz) || 1, ux = nx / l, uz = nz / l;
    if (pointBlocked((a.x + c.x) / 2 + ux * 4.5, (a.z + c.z) / 2 + uz * 4.5, 5)) continue;
    footprints.push({ poly: [[a.x, a.z], [c.x, c.z], [c.x + ux * 10, c.z + uz * 10], [a.x + ux * 10, a.z + uz * 10]] });
    soil.quad([a.x, 0.045, a.z], [c.x, 0.045, c.z], [c.x + ux * 9, 0.045, c.z + uz * 9], [a.x + ux * 9, 0.045, a.z + uz * 9], new T.Color(1, 1, 1), [0, 1, 0], [[a.x / 6, a.z / 6], [c.x / 6, c.z / 6], [(c.x + ux * 9) / 6, (c.z + uz * 9) / 6], [(a.x + ux * 9) / 6, (a.z + uz * 9) / 6]]);
    if (i % 2 === 0) { const ry = Math.atan2(c.x - a.x, c.z - a.z); b.add(roundedBox(0.5, 0.85, 3.6, 0.1, 1), mat4((a.x + c.x) / 2, 0.45, (a.z + c.z) / 2, ry), i % 4 ? wc : rc); addObb((a.x + c.x) / 2, (a.z + c.z) / 2, 0.5, 3.6, -ry, 'small'); }
  }
  const sm = new T.Mesh(soil.build(), groundMat(TEX.soil, 7, 6, 0xc9a77a, false)); sm.receiveShadow = true; scene.add(sm);
  scene.add(meshOf(b.build(), VC, true));
  const mid = pts[Math.floor(pts.length / 2)], roller = new T.Group(); roller.position.set(mid.x + (mid.x - mid.rx) * 0.9, 0, mid.z + (mid.z - mid.rz) * 0.9); roller.rotation.y = Math.atan2(mid.dx, mid.dz);
  const drum = meshOf(new T.CylinderGeometry(0.75, 0.75, 2.2, 18), M(0x8a8d93, { metalness: 0.6 }), true); drum.rotation.z = Math.PI / 2; drum.position.set(0, 0.75, 1.4); roller.add(drum);
  roller.add(at(meshOf(roundedBox(2.0, 1.4, 2.4, 0.2), M(0xf3b41b), true), 0, 1.3, -0.8));
  roller.add(at(meshOf(roundedBox(1.5, 1.2, 1.3, 0.15), M(0xf3b41b), true), 0, 2.5, -1.0));
  scene.add(roller); addCircle(roller.position.x, roller.position.z, 1.6);
  const sgp = roadside(HIGHWAY.x0 + 30, -125, -1, 15, 'T');
  signBoard('BARABARA YA NJIA NNE · 4-LANE HIGHWAY', sgp.x, sgp.z, sgp.ry, 13, 1.8, 3.6, { bg: '#f3b41b', fg: '#141838' });
}

/* ---------- the places for Zanzibar experiences ---------- */
const CONSTRUCTION = { truck: { x: MALL.x - 40, z: MALL.z + MALL.d / 2 + 38 }, mixer: { x: MALL.x - 92, z: MALL.z + MALL.d / 2 + 16 }, drum: null };
function buildStops() {
  const shelterRoof = M(0x1e9b57, { roughness: 0.5, metalness: 0.3 });
  for (const s of STOPS) {
    const r = roadside(s.x, s.z, s.side, 2.6);
    s.x = r.x; s.z = r.z; s.ry = r.ry; s.dx = r.dx; s.dz = r.dz; s.rx = r.rx; s.rz = r.rz;
    const back = { x: r.x - Math.sin(r.ry) * 2.2, z: r.z - Math.cos(r.ry) * 2.2 };
    const g = new T.Group(); g.position.set(back.x, 0, back.z); g.rotation.y = r.ry;
    g.add(at(meshOf(roundedBox(6.4, 0.18, 2.6, 0.08), shelterRoof, true), 0, 2.75, 0.3));
    for (const sx of [-2.9, 2.9]) g.add(at(meshOf(new T.CylinderGeometry(0.07, 0.07, 2.7, 8), M(0x6a6e78, { metalness: 0.5 }), true), sx, 1.35, -0.6));
    g.add(at(meshOf(new T.BoxGeometry(6.2, 1.9, 0.08), new T.MeshStandardMaterial({ color: 0xbfe2ff, transparent: true, opacity: 0.35, roughness: 0.1 }), false), 0, 1.5, -0.75));
    g.add(at(meshOf(roundedBox(4.4, 0.12, 0.5, 0.04), M(0x7a4a2a), true), 0, 0.5, -0.35));
    const sn = signMesh(`DALADALA · ${s.name.toUpperCase()}`, 6.2, 0.7, { bg: '#1e9b57' }); sn.position.set(0, 3.15, 1.62); g.add(sn);
    const pole = meshOf(new T.CylinderGeometry(0.05, 0.05, 3.2, 8), M(0x9aa0a8, { metalness: 0.6 }), true); pole.position.set(3.6, 1.6, 1.2); g.add(pole);
    const disc = new T.Mesh(new T.CircleGeometry(0.42, 24), new T.MeshStandardMaterial({ map: (() => { const c = mkCanvas(128, 128), x = c.getContext('2d'); x.fillStyle = '#1e9b57'; x.beginPath(); x.arc(64, 64, 62, 0, TAU); x.fill(); x.fillStyle = '#fff'; x.font = `900 38px ${FONT_D}`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('BUS', 64, 66); return texOf(c, { clamp: true }); })(), side: T.DoubleSide }));
    disc.material.side = T.FrontSide; disc.position.set(3.6, 3.3, 1.22); g.add(disc);
    const disc2 = new T.Mesh(disc.geometry, disc.material); disc2.position.set(3.6, 3.3, 1.18); disc2.rotation.y = Math.PI; g.add(disc2);
    scene.add(g);
    addObb(back.x - Math.sin(r.ry) * 0.6, back.z - Math.cos(r.ry) * 0.6, 6.4, 0.4, -r.ry, 'small');
    footprints.push({ x: back.x, z: back.z, w: 10, d: 6, ang: -r.ry });
  }
}
function buildPier() {
  const c0 = coastZ(PIER.x), z0 = c0 - 7, z1 = c0 + PIER.len, len = z1 - z0, deck = new Builder(), wood = [C(0x9a6a43), C(0x8a5c38), C(0xa8784e)];
  for (let i = 0; i < len / 0.5; i++) deck.add(new T.BoxGeometry(PIER.w, 0.12, 0.44), mat4(PIER.x, PIER_Y - 0.06, z0 + 0.25 + i * 0.5, 0), wood[i % 3]);
  for (let i = 0; i <= len / 4; i++) for (const s of [-1, 1]) {
    deck.add(new T.CylinderGeometry(0.16, 0.18, 3.4, 8), mat4(PIER.x + s * (PIER.w / 2 - 0.1), PIER_Y - 1.7, z0 + i * 4, 0), C(0x5c3a22));
    deck.add(new T.CylinderGeometry(0.06, 0.06, 1.0, 6), mat4(PIER.x + s * (PIER.w / 2 - 0.05), PIER_Y + 0.5, z0 + i * 4, 0), C(0x6b4a2a));
  }
  for (const s of [-1, 1]) deck.add(new T.BoxGeometry(0.1, 0.1, len), mat4(PIER.x + s * (PIER.w / 2 - 0.05), PIER_Y + 0.98, z0 + len / 2, 0), C(0x6b4a2a));
  scene.add(meshOf(deck.build(), new T.MeshStandardMaterial({ vertexColors: true, map: TEX.bark, roughness: 0.85 }), true));
  // rails stop you walking off the sides
  for (const s of [-1, 1]) addObb(PIER.x + s * (PIER.w / 2 + 0.1), c0 + 1 + len / 2, 0.2, len - 2, 0, 'small');
  addObb(PIER.x, z1 + 0.2, PIER.w + 0.4, 0.3, 0, 'small');
  const d1 = makeDhow(); d1.position.set(PIER.x + 4.6, -0.1, z1 - 8); d1.rotation.y = 0.04; scene.add(d1); addObb(PIER.x + 4.6, z1 - 8, 2.4, 10, 0);
  const d2 = makeDhow(); d2.position.set(PIER.x - 4.8, -0.1, z1 - 22); d2.rotation.y = -0.06; scene.add(d2); addObb(PIER.x - 4.8, z1 - 22, 2.4, 10, 0);
  PIER.boat = d1; d1.userData.dynamic = true; PIER.z0 = z0; PIER.z1 = z1;
  signBoard('GATI LA FUMBA · BOAT TRIPS', PIER.x - 6.5, c0 - 9, 0, 9, 1.4, 3.2, { bg: '#19b5b1', fg: '#141838' });
  PROJECT_BY_ID.pier.z = coastZ(PIER.x - 17) - 12;
}
const PIER_Y = 0.62;
function onPier(x, z) { return PIER.z0 !== undefined && Math.abs(x - PIER.x) < PIER.w / 2 - 0.15 && z > PIER.z0 && z < PIER.z1; }
function tideDepth(x) { if (x <= TIDE.x0 || x >= TIDE.x1) return 0; return TIDE.depth * smooth(clamp((x - TIDE.x0) / 40, 0, 1)) * smooth(clamp((TIDE.x1 - x) / 40, 0, 1)); }
function onTide(x, z) { const c = coastZ(x); return z >= c - 1 && z < c + tideDepth(x) - 1.2; }
function tideY(x, z) { const k = clamp((z - coastZ(x)) / Math.max(1, tideDepth(x)), 0, 1); return lerp(-0.02, -0.26, k); }
const SEAWEED = [];
function buildTide() {
  // low tide: a flat of wet sand runs out into the bay, with rows of seaweed on lines between sticks
  const b = new Builder(), step = 5;
  for (let x = TIDE.x0; x < TIDE.x1; x += step) {
    const xa = x, xb = Math.min(TIDE.x1, x + step), ca = coastZ(xa), cb = coastZ(xb), da = tideDepth(xa) + 2, db = tideDepth(xb) + 2;
    for (let k = 0; k < 4; k++) {
      const t0 = k / 4, t1 = (k + 1) / 4, y0 = lerp(-0.02, -0.3, t0), y1 = lerp(-0.02, -0.3, t1);
      const za0 = ca - 7 + (da + 5) * t0, za1 = ca - 7 + (da + 5) * t1, zb0 = cb - 7 + (db + 5) * t0, zb1 = cb - 7 + (db + 5) * t1;
      b.quad([xa, y0, za0], [xa, y1, za1], [xb, y1, zb1], [xb, y0, zb0], k ? new T.Color(1, 1, 1) : new T.Color(1.25, 1.2, 1.1), [0, 1, 0], [[xa / 5, za0 / 5], [xa / 5, za1 / 5], [xb / 5, zb1 / 5], [xb / 5, zb0 / 5]]);
    }
  }
  const flat = new T.Mesh(b.build(), new T.MeshStandardMaterial({ map: TEX.sand, normalMap: TEX.sandN || null, vertexColors: true, color: C(0xb7a07a), roughness: 0.25, metalness: 0.1, side: T.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4 }));
  flat.receiveShadow = true; scene.add(flat);
  const sticks = new Builder(), lines = new Builder(), weed = new Builder(), sc = C(0x6b4a2a), lc = C(0x2a2a2a), wcs = [C(0x7a8a2a), C(0x5d7a2a), C(0xa08a3a), C(0x6f6a2a)];
  const r = mulberry32(551);
  for (let row = 0; row < 7; row++) {
    const x0 = TIDE.x0 + 50 + row * 18, zOff = 10 + (row % 2) * 6, n = 7;
    for (let i = 0; i < n; i++) {
      const x = x0 + (r() - 0.5) * 2, z = coastZ(x) + zOff + i * 3.6; if (!onTide(x, z)) continue;
      sticks.add(new T.CylinderGeometry(0.04, 0.05, 0.8, 5), mat4(x, tideY(x, z) + 0.3, z, 0), sc);
      if (i < n - 1) { lines.add(new T.BoxGeometry(0.02, 0.02, 3.6), mat4(x, tideY(x, z) + 0.25, z + 1.8, 0), lc); for (let k = 0; k < 4; k++) weed.add(new T.IcosahedronGeometry(0.16 + r() * 0.08, 0), mat4(x + (r() - 0.5) * 0.2, tideY(x, z) + 0.18, z + 0.6 + k * 0.8, r() * 3, 1, 0.6, 1.4), wcs[(i + k + row) % 4]); }
    }
  }
  scene.add(meshOf(sticks.build(), VC, true)); scene.add(meshOf(lines.build(), VC, false)); scene.add(meshOf(weed.build(), new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.6 }), true));
  // harvestable bundles (respawn), shown as bigger clumps with a glint
  const spots = [];
  for (let i = 0; i < 40 && spots.length < 14; i++) { const x = rr(TIDE.x0 + 45, TIDE.x1 - 45), z = coastZ(x) + rr(8, tideDepth(x) - 4); if (onTide(x, z) && !spots.some(s => Math.hypot(s.x - x, s.z - z) < 7)) spots.push({ x, z, kg: 5 + Math.floor(r() * 6), kind: r() < 0.35 ? 'cottonii' : 'spinosum', t: 0 }); }
  SEAWEED.push(...spots);
  // drying racks and the buyer on the beach
  const rk = new Builder(), rkc = C(0x7a5a38), dry = C(0xb8a060);
  for (let i = 0; i < 4; i++) { const x = SEAWEED_BUYER.x - 18 + i * 9, z = SEAWEED_BUYER.z - 6; rk.add(new T.BoxGeometry(6, 0.08, 1.6), mat4(x, 0.75, z, 0), rkc); for (const sx of [-2.8, 2.8]) for (const sz of [-0.7, 0.7]) rk.add(new T.CylinderGeometry(0.05, 0.05, 0.75, 5), mat4(x + sx, 0.37, z + sz, 0), rkc); for (let k = 0; k < 10; k++) rk.add(new T.IcosahedronGeometry(0.22, 0), mat4(x - 2.6 + k * 0.58, 0.85, z + (k % 2 - 0.5) * 0.6, k, 1, 0.4, 1.3), dry); addObb(x, z, 6, 1.6, 0, 'small'); }
  scene.add(meshOf(rk.build(), VC, true));
  signBoard('SHAMBA LA MWANI · SEAWEED FARM', SEAWEED_BUYER.x + 14, SEAWEED_BUYER.z - 10, 0.35, 10, 1.4, 3.2, { bg: '#1e9b57' });
}
const SEAWEED_BUYER = { x: 300, z: coastZ(300) - 12 };
const SPICES = [
  { id: 'karafuu', name: 'Karafuu · clove', fact: 'Zanzibar was once the world’s biggest clove grower. The buds are picked by hand and dried in the sun.' },
  { id: 'mdalasini', name: 'Mdalasini · cinnamon', fact: 'Cinnamon is the bark: the guide peels a strip so you can smell it.' },
  { id: 'kungumanga', name: 'Kungumanga · nutmeg', fact: 'Inside the nutmeg fruit is a seed wrapped in red mace, which is a spice of its own.' },
  { id: 'pilipili', name: 'Pilipili manga · black pepper', fact: 'Pepper is a climbing vine. Green, black and white pepper all come from the same berries.' },
  { id: 'vanila', name: 'Vanila · vanilla', fact: 'Vanilla is an orchid. On Zanzibar each flower is pollinated by hand.' },
];
function buildSpiceFarm() {
  const S = SPICE;
  siteGround(S.x, S.z, S.w, S.d, 'soil', 0x9c8a70, 2);
  const b = new Builder(), trunk = C(0x6a4a2a);
  const plants = [];
  const kinds = ['karafuu', 'mdalasini', 'kungumanga', 'pilipili', 'vanila'];
  for (let i = 0; i < 44; i++) {
    const row = i % 4, col = Math.floor(i / 4), x = S.x - S.w / 2 + 18 + col * 26 + (row % 2) * 9, z = S.z - S.d / 2 + 12 + row * 15, k = kinds[(col + row) % 5];
    if (Math.abs(x - SPICE_HUT.x) < 14 && Math.abs(z - SPICE_HUT.z) < 12) continue;
    plants.push({ x, z, k });
    if (k === 'karafuu' || k === 'kungumanga') { EXTRA_TREES.push([x, z, k === 'karafuu' ? 0.75 : 1.05]); continue; }
    if (k === 'mdalasini') { b.add(new T.CylinderGeometry(0.1, 0.15, 1.4, 6), mat4(x, 0.7, z, 0), C(0x8a5a3a)); for (let q = 0; q < 5; q++) b.add(new T.IcosahedronGeometry(0.75, 0), mat4(x + Math.cos(q * 1.3) * 0.7, 1.7 + (q % 2) * 0.6, z + Math.sin(q * 1.3) * 0.7, q, 1, 0.8, 1), C(q % 2 ? 0x5a7a2a : 0x6f8a32)); }
    else if (k === 'pilipili') { b.add(new T.CylinderGeometry(0.08, 0.1, 3.4, 6), mat4(x, 1.7, z, 0), C(0x8a7a6a)); for (let q = 0; q < 9; q++) b.add(new T.IcosahedronGeometry(0.34, 0), mat4(x + Math.cos(q * 2.1) * 0.28, 0.5 + q * 0.32, z + Math.sin(q * 2.1) * 0.28, q, 1, 0.7, 1), C(q % 3 ? 0x3d7a30 : 0x5a9a3a)); }
    else { b.add(new T.CylinderGeometry(0.12, 0.16, 2.6, 6), mat4(x, 1.3, z, 0), trunk); for (let q = 0; q < 7; q++) b.add(new T.IcosahedronGeometry(0.3, 0), mat4(x + Math.cos(q * 0.9) * 0.22, 0.6 + q * 0.3, z + Math.sin(q * 0.9) * 0.22, q, 1, 1.3, 0.5), C(0x6aa046)); b.add(new T.IcosahedronGeometry(1.1, 1), mat4(x, 2.9, z, 0), C(0x4d8a3a)); }
    addCircle(x, z, 0.35, 'small');
  }
  scene.add(meshOf(b.build(), new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.85 }), true));
  for (const id of kinds) { const p = plants.find(q => q.k === id && Math.abs(q.z - S.z) < S.d / 2 - 14); if (p) SPICE_SPOTS.push({ id, x: p.x + (id === 'karafuu' || id === 'kungumanga' ? 2.4 : 1.6), z: p.z + (id === 'karafuu' || id === 'kungumanga' ? 2.4 : 1.6) }); }
  // the makuti hut where the tour starts
  const h = new T.Group(); h.position.set(SPICE_HUT.x, 0, SPICE_HUT.z);
  h.add(at(meshOf(roundedBox(8, 0.3, 6, 0.1), M(0x9a6a43), true), 0, 0.15, 0));
  const roof = meshOf(new T.ConeGeometry(6.2, 3.4, 4, 1, true), new T.MeshStandardMaterial({ map: TEX.thatch, roughness: 0.95, side: T.DoubleSide }), true); roof.rotation.y = Math.PI / 4; roof.position.y = 4.4; roof.scale.z = 0.8; h.add(roof);
  for (const [px, pz] of [[-3.5, -2.5], [3.5, -2.5], [-3.5, 2.5], [3.5, 2.5]]) h.add(at(meshOf(new T.CylinderGeometry(0.12, 0.14, 3, 6), M(0x6b4a2a), true), px, 1.5, pz));
  const bowls = new Builder(); [0xb04a2a, 0x5a3a1a, 0xd8a03a, 0x3a2a1a, 0x8a5a2a].forEach((cc, i) => { bowls.add(new T.CylinderGeometry(0.3, 0.2, 0.2, 10), mat4(-1.6 + i * 0.8, 1.0, -1.6, 0), C(0xd8cfc0)); bowls.add(new T.CylinderGeometry(0.26, 0.26, 0.04, 10), mat4(-1.6 + i * 0.8, 1.1, -1.6, 0), C(cc)); });
  bowls.add(new T.BoxGeometry(4.6, 0.1, 1.0), mat4(0, 0.85, -1.6, 0), C(0x7a4a2a)); h.add(meshOf(bowls.build(), VC, true));
  for (let i = 0; i < 8; i++) { const nut = meshOf(new T.SphereGeometry(0.28, 10, 8), M(0x6b8a2a), true); nut.position.set(2 + (i % 3) * 0.6, 0.45, 1.4 + Math.floor(i / 3) * 0.5); h.add(nut); }
  scene.add(h); addObb(SPICE_HUT.x, SPICE_HUT.z - 1.6, 5, 1.2, 0, 'small');
  for (const [px, pz] of [[-3.5, -2.5], [3.5, -2.5], [-3.5, 2.5], [3.5, 2.5]]) addCircle(SPICE_HUT.x + px, SPICE_HUT.z + pz, 0.2, 'small');
  signBoard('SHAMBA LA VIUNGO · SPICE FARM', SPICE_HUT.x + 10, S.z + S.d / 2 - 2, 0, 11, 1.6, 3.4, { bg: '#7a4a2a' });
  for (let i = 0; i < 12; i++) AFCON_PALMS.push([S.x - S.w / 2 + 8 + i * 27, S.z + S.d / 2 - 4]);
}
const SPICE_HUT = { x: -560, z: -22 };
const EXTRA_TREES = [];
const SPICE_SPOTS = [];
/* tourists lounging on the beach: they buy cold madafu */
const TOURISTS = [];
function buildTourists() {
  const looks = [{ skin: 0xe8c4a8, shirt: 0x19b5b1, lower: 0xf6f1e7, hair: 'hat', hairCol: 0x8a6a3a }, { skin: 0xf1d2bc, shirt: 0xf3b41b, lower: 0x1f4f8f, hair: 'short', hairCol: 0xc8a060 }, { skin: 0xd9a78a, shirt: 0xe0553a, lower: 0x232a63, hair: 'hat', hairCol: 0x3a2a1a }, { skin: 0xf1d2bc, shirt: 0xf6f1e7, lower: 0xd8452c, hair: 'scarf', scarf: 0x19b5b1 }, { skin: 0x7a4a2a, shirt: 0x8e3b8f, lower: 0x141838, hair: 'hat' }, { skin: 0xe8c4a8, shirt: 0x1e9b57, lower: 0xf6f1e7, hair: 'short', hairCol: 0x6a4a2a }];
  const spots = [[-150, 0], [-40, 0], [26, 0], [60, 0], [140, 0], [-190, 0], [-255, 0], [190, 0]];
  spots.forEach(([x], i) => {
    const z = coastZ(x) - 13 - (i % 2) * 3; if (!walkable(x, z)) return;
    const h = makeHuman(looks[i % looks.length]); h.position.set(x, 0.1, z); h.rotation.y = Math.PI; scene.add(h);
    const l = meshOf(roundedBox(0.75, 0.25, 2.0, 0.08), M(0xf6f1e7), true); l.position.set(x, 0.3, z - 0.2); l.rotation.x = -0.08; scene.add(l); addObb(x, z - 0.2, 0.8, 2, 0, 'small');
    TOURISTS.push({ h, x, z, want: 0, t: 0, i });
  });
}
function drawFutureMap(c, X, Z) {
  for (const f of FUT_MAP) { if (f.line) continue; c.fillStyle = f.col; c.fillRect(X(f.x - f.w / 2), Z(f.z - f.d / 2), f.w * MAP.k, f.d * MAP.k); }
  c.fillStyle = '#e2cfa0'; c.beginPath(); for (let x = TIDE.x0; x <= TIDE.x1; x += 5) c.lineTo(X(x), Z(coastZ(x) + tideDepth(x))); for (let x = TIDE.x1; x >= TIDE.x0; x -= 5) c.lineTo(X(x), Z(coastZ(x) - 2)); c.closePath(); c.fill();
  c.fillStyle = '#9a6a43'; c.fillRect(X(PIER.x - PIER.w / 2 - 0.5), Z(PIER.z0), (PIER.w + 1) * MAP.k, (PIER.z1 - PIER.z0) * MAP.k);
  if (sandbank) { c.fillStyle = '#efe0bc'; c.beginPath(); c.ellipse(X(sandbank.x), Z(sandbank.z), 70 * MAP.k, 24 * MAP.k, 0, 0, TAU); c.fill(); }
  for (const f of FUT_MAP) { if (!f.line) continue; c.fillStyle = f.col; c.strokeStyle = '#1f2230'; c.lineWidth = 1; c.fillRect(X(f.x - f.w / 2), Z(f.z - f.d / 2), f.w * MAP.k, f.d * MAP.k); c.strokeRect(X(f.x - f.w / 2), Z(f.z - f.d / 2), f.w * MAP.k, f.d * MAP.k); }
}
function buildStreetLife() {
  const spots = [];
  for (const sg of roadSegs) {
    if (sg.c !== 'R') continue;
    const L = Math.hypot(sg.x1 - sg.x0, sg.z1 - sg.z0); if (L < 30) continue;
    const dx = (sg.x1 - sg.x0) / L, dz = (sg.z1 - sg.z0) / L;
    for (let d = 12; d < L - 12; d += 19) {
      if (hash2(sg.x0 + d, sg.z0) < 0.45) continue;
      const side = hash2(sg.z0, sg.x0 + d) < 0.5 ? 1 : -1, off = sg.hw + 3.6, x = sg.x0 + dx * d - dz * off * side, z = sg.z0 + dz * d + dx * off * side;
      if (x < BOUNDS.x0 + 20 || x > BOUNDS.x1 - 20 || z < BOUNDS.z0 + 20 || z > coastZ(x) - 8) continue;
      if (pointBlocked(x, z, 2.6) || nearRoad(x, z, 1.4, sg.ri) || spots.some(p => Math.hypot(p[0] - x, p[1] - z) < 7)) continue;
      if (NPCS.some(n => Math.hypot(n.x - x, n.z - z) < 10) || STOPS.some(s2 => Math.hypot(s2.x - x, s2.z - z) < 14) || STANDS.some(s2 => Math.hypot(s2.x - x, s2.z - z) < 14) || Math.hypot(START.x - x, START.z - z) < 20) continue;
      spots.push([x, z, Math.atan2(dx, dz) + (side > 0 ? 0 : Math.PI)]);
    }
  }
  if (spots.length) parkedCars(spots.slice(0, BUILD_HQ ? 70 : 36));
  const zb = new Builder(), wc = new T.Color(1, 1, 1);
  for (const s2 of STOPS) {
    if (s2.rx === undefined) continue;
    const dx = s2.dx, dz = s2.dz, nx = -dz, nz = dx, hw = 4.3;
    for (let k = -4; k <= 3; k++) {
      const a = k * 0.9 + 0.2, b = a + 0.5, cx = s2.rx + dx * 8, cz = s2.rz + dz * 8;
      zb.quad([cx + dx * a + nx * hw, 0.06, cz + dz * a + nz * hw], [cx + dx * b + nx * hw, 0.06, cz + dz * b + nz * hw], [cx + dx * b - nx * hw, 0.06, cz + dz * b - nz * hw], [cx + dx * a - nx * hw, 0.06, cz + dz * a - nz * hw], wc, [0, 1, 0]);
    }
  }
  if (!zb.empty) { const m = new T.Mesh(zb.build(), new T.MeshStandardMaterial({ color: C(0xf2f0ea), roughness: 0.7, side: T.DoubleSide, polygonOffset: true, polygonOffsetFactor: -10, polygonOffsetUnits: -40 })); m.receiveShadow = true; scene.add(m); }
}
function buildFuture() {
  buildStops(); buildMall(); buildBurj(); buildIIT(); buildHotel(); buildHospital(); buildZHC(); buildArena(); buildFilm(); buildHighwayWorks();
  buildPier(); buildTide(); buildSpiceFarm();
  for (const p of PROJECTS) if (p.id !== 'pier') { const r = roadside(p.x, p.z, 1, 0); projectBoard(p, Math.atan2(r.rx - p.x, r.rz - p.z)); } else projectBoard(p, Math.PI);
  // billboards along Fumba Road (brands are made up)
  const ads = [
    [440, -1, 'AFCON 2027', 'Karibu Zanzibar · Fumba', ['#141838', '#232a63'], '#f3b41b', 'b1', 'Uptown Gate', 'First board every player sees, beside the start'],
    [250, 1, 'TWIGA COLA', 'Baridi kabisa · ice cold', ['#d8352a', '#7a1a12'], undefined, 'b2', 'IIT Madras approach', 'Fumba Road, eastbound side'],
    [120, -1, 'MWANI CO-OP', 'We buy seaweed · TSh 1,000 a kilo', ['#2f6a3a', '#123a20'], undefined, 'b3', 'Beach turn-off', 'Where players head for the beach, pier and seaweed farm'],
    [-110, -1, 'DALADALA TSh 700', 'Anywhere along Fumba Road', ['#1e9b57', '#0e5a32'], undefined, 'b4', 'Fumba Junction', 'Busiest crossroads, next to a daladala stop'],
    [-560, 1, 'USIKU MARKET', 'Zanzibar pizza · Uptown Park', ['#e0553a', '#8a2a1a'], undefined, 'b5', 'Spice farm stretch', 'On the drive to the spice farm and Fan Zone'],
    [-820, -1, 'PESA HARAKA', 'Tuma pesa · send money fast', ['#19b5b1', '#0a5a5a'], undefined, 'b6', 'AfconCity approach', 'Last board before the stadium'],
    [-1180, 1, 'JAHAZI SUNSET', 'Dhow cruises · Fumba pier', ['#f3b41b', '#c06a1a'], '#141838', 'b7', 'Fumba Town', 'Western end of the route, by Burj Zanzibar'],
  ];
  for (const [x, side, a, b2, bg, fg, id, name, note] of ads) { const z = x > 70 ? -125 : x > -200 ? -165 : x > -700 ? -205 : -240; const r = roadside(x, z, side, 9); if (!pointBlocked(r.x, r.z, 3)) billboard(r.x, r.z, r.ry, a, b2, bg, fg, { id, name, note }); }
}

