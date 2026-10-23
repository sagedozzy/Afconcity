/* ===================== 30 vehicles: models, AI traffic on the real roads, drivable rentals ===================== */
const carGlass = new T.MeshStandardMaterial({ color: C(0x1a2433), metalness: 0.7, roughness: 0.06, envMapIntensity: 1.4, transparent: true, opacity: 0.88 });
const chrome = new T.MeshStandardMaterial({ color: C(0xd8dce2), metalness: 1, roughness: 0.18 });
const rubber = new T.MeshStandardMaterial({ color: C(0x18181b), roughness: 0.92 });
const trimMat = new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.6, metalness: 0.15 });
const headMat = new T.MeshStandardMaterial({ color: 0xffffff, emissive: C(0xfff3d8), emissiveIntensity: 0.25 });
const tailMat = new T.MeshStandardMaterial({ color: C(0x7a0d0d), emissive: C(0xff2a1a), emissiveIntensity: 0.25 });
nightable(headMat, 0.25, 3.2); nightable(tailMat, 0.25, 2.2);
const paintCache = new Map();
function carPaint(hex) { if (!paintCache.has(hex)) paintCache.set(hex, new T.MeshPhysicalMaterial({ color: C(hex), metalness: 0.45, roughness: 0.36, clearcoat: 1, clearcoatRoughness: 0.08, envMapIntensity: 1.15 })); return paintCache.get(hex); }
function wheel(r, w, rimHex) {
  // steer first, then roll about the axle: with the default order the steering axis tilted as the wheel turned, so it wobbled
  const g = new T.Group(); g.rotation.order = 'YXZ';
  const tire = new T.Mesh(new T.CylinderGeometry(r, r, w, 20), rubber); tire.rotation.z = Math.PI / 2; tire.castShadow = true; g.add(tire);
  const rim = new T.Mesh(new T.CylinderGeometry(r * 0.62, r * 0.62, w + 0.01, 12), rimHex ? M(rimHex, { metalness: 0.8, roughness: 0.3 }) : chrome); rim.rotation.z = Math.PI / 2; g.add(rim);
  const hub = new T.Mesh(new T.BoxGeometry(w + 0.02, r * 0.25, r * 1.1), rubber); g.add(hub);
  return g;
}
function partMesh(geo, mat, x, y, z, rx, ry, rz) { const m = new T.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.set(rx || 0, ry || 0, rz || 0); m.castShadow = true; m.receiveShadow = true; return m; }
function frustumGeo(bw, bz0, bz1, by, tw, tz0, tz1, ty) {
  const P = [[-bw, by, bz0], [bw, by, bz0], [bw, by, bz1], [-bw, by, bz1], [-tw, ty, tz0], [tw, ty, tz0], [tw, ty, tz1], [-tw, ty, tz1]];
  const faces = [[0, 1, 5, 4], [1, 2, 6, 5], [2, 3, 7, 6], [3, 0, 4, 7], [4, 5, 6, 7]];
  const pos = [];
  for (const [a, b, c, d] of faces) pos.push(...P[a], ...P[b], ...P[c], ...P[a], ...P[c], ...P[d]);
  const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.computeVertexNormals();
  return g;
}
const VEH = {
  bajaji: { name: 'Bajaji', max: 16.5, acc: 6.2, brake: 15, rev: 5, steer: 0.62, lat: 13, wb: 1.75, grip: 7.5, R: 0.85, hl: 1.35, hw: 0.68, seat: [0, 0.19, 0.28], pass: [0, 0.17, -0.82], pose: 'sit', cam: 6.2, camH: 2.4 },
  boda: { name: 'Boda boda', max: 22, acc: 8.5, brake: 17, rev: 2.5, steer: 0.5, lat: 13, wb: 1.4, grip: 9, R: 0.6, hl: 1.0, hw: 0.4, seat: [0, 0.1, -0.12], pass: [0, 0.14, -0.6], pose: 'ride', cam: 5.2, camH: 2.1 },
  sedan: { hl: 2.2, hw: 0.9 },
  daladala: { name: 'Daladala', hl: 2.6, hw: 1.0, max: 17, acc: 4.2, brake: 11, rev: 3, steer: 0.52, lat: 8, wb: 3.5, grip: 6, R: 1.1, seat: [-0.5, 0.2, 1.45], pass: [0.5, 0.2, -1.2], pose: 'sit', cam: 10.5, camH: 3.8 },
};
const BAJAJI_COLS = [0x1f5fbf, 0xd23a2a, 0xf3b41b, 0x1e9b57], BODA_COLS = [0xd23a2a, 0x15161c, 0x1f5fbf, 0xf3b41b];
const SEDAN_COLS = [0xf2f2f2, 0x1c1d22, 0x9aa0a8, 0x8a1a1a, 0x1f4f8f, 0xd8d0c0, 0x2e5d3a];
let routeTex = null;
const DALA_BACKS = [];
function makeVehicle(kind, hex) {
  const g = new T.Group(), body = new T.Group(); g.add(body);
  const u = { kind, wheels: [], steer: [], body, spec: VEH[kind] };
  const P = carPaint(hex), tb = new Builder();
  const T2 = (geo, x, y, z, col, ry, rx, rz) => tb.add(geo, mat4(x, y, z, ry || 0, 1, 1, 1, rx || 0, rz || 0), C(col));
  if (kind === 'sedan') {
    body.add(partMesh(roundedBox(1.78, 0.6, 4.4, 0.2, 2), P, 0, 0.66, 0));
    body.add(partMesh(roundedBox(1.7, 0.18, 1.25, 0.08, 1), P, 0, 0.98, 1.55, -0.08));
    body.add(partMesh(frustumGeo(0.8, -1.05, 1.0, 0.94, 0.66, -0.72, 0.42, 1.42), carGlass, 0, 0, 0));
    body.add(partMesh(roundedBox(1.36, 0.06, 1.2, 0.03, 1), P, 0, 1.44, -0.15));
    for (const s of [-1, 1]) body.add(partMesh(box(0.05, 0.5, 0.1), P, s * 0.74, 1.18, -0.12, 0, 0, s * -0.12));
    T2(roundedBox(1.84, 0.22, 0.26, 0.08, 1), 0, 0.44, 2.17, 0x2a2b30); T2(roundedBox(1.84, 0.22, 0.26, 0.08, 1), 0, 0.46, -2.17, 0x2a2b30);
    T2(box(0.8, 0.16, 0.04), 0, 0.66, 2.2, 0x111114);
    for (const s of [-1, 1]) T2(roundedBox(0.12, 0.1, 0.22, 0.03, 1), s * 0.94, 1.0, 0.95, 0x1c1d22);
    for (const s of [-1, 1]) { body.add(partMesh(roundedBox(0.38, 0.12, 0.06, 0.03, 1), headMat, s * 0.6, 0.76, 2.19)); body.add(partMesh(roundedBox(0.36, 0.12, 0.06, 0.03, 1), tailMat, s * 0.62, 0.8, -2.19)); }
    for (const [x, z] of [[-0.82, 1.38], [0.82, 1.38], [-0.82, -1.38], [0.82, -1.38]]) { const w = wheel(0.34, 0.24); w.position.set(x, 0.34, z); g.add(w); u.wheels.push({ g: w, r: 0.34 }); if (z > 0) u.steer.push(w); }
  } else if (kind === 'daladala') {
    body.add(partMesh(roundedBox(1.95, 1.85, 5.1, 0.28, 2), carPaint(0xf4f2ec), 0, 1.3, 0));
    T2(box(1.97, 0.32, 4.6), 0, 0.92, -0.1, hex); T2(box(1.97, 0.12, 4.6), 0, 1.16, -0.1, 0x141838);
    body.add(partMesh(box(1.98, 0.62, 3.5), carGlass, 0, 1.68, -0.45));
    body.add(partMesh(box(1.72, 0.78, 0.06), carGlass, 0, 1.62, 2.53, -0.12));
    if (!routeTex) routeTex = signTex('FUMBA — MJINI', { h: 160, bg: '#141838' });
    const slogans = ['MUNGU NI MWEMA', 'HAKUNA MATATA', 'SUBIRA NI DAWA', 'TWENDE AFCON', 'POLE POLE'], sl = slogans[Math.abs(hashStr(String(hex))) % slogans.length];
    const back = mkCanvas(512, 256), bx = back.getContext('2d'); bx.fillStyle = '#' + hex.toString(16).padStart(6, '0'); bx.fillRect(0, 0, 512, 256); kangaEdge(bx, 512, 256, 12);
    bx.fillStyle = '#141838'; bx.textAlign = 'center'; bx.textBaseline = 'middle'; fitFont(bx, sl, 900, 74, 460, FONT_D); bx.fillText(sl, 256, 100); bx.font = `700 34px ${FONT_B}`; bx.fillText('FUMBA · MJINI · 700/=', 256, 180);
    const bt = texOf(back, { clamp: true }), bpm = new T.MeshStandardMaterial({ map: bt, roughness: 0.5 }), bp = new T.Mesh(new T.PlaneGeometry(1.36, 0.68), bpm); DALA_BACKS.push({ mat: bpm, def: bt }); bp.position.set(-0.16, 1.0, -2.565); bp.rotation.y = Math.PI; body.add(bp);
    body.add(partMesh(box(1.6, 0.55, 0.04), carGlass, 0, 1.75, -2.56));
    for (const s2 of [0.64, 0.9]) T2(box(0.04, 1.5, 0.04), s2, 1.55, -2.62, 0x2a2b30); for (let k = 0; k < 5; k++) T2(box(0.28, 0.03, 0.04), 0.77, 0.95 + k * 0.3, -2.62, 0x2a2b30);
    const rs = new T.Mesh(new T.PlaneGeometry(1.5, 0.24), new T.MeshStandardMaterial({ map: routeTex, emissive: 0xffffff, emissiveMap: routeTex, emissiveIntensity: 0.5 })); rs.position.set(0, 2.12, 2.5); body.add(rs);
    T2(box(1.6, 0.06, 3.4), 0, 2.32, -0.4, 0x2a2b30); for (const s of [-0.7, 0.7]) T2(box(0.05, 0.12, 3.4), s, 2.28, -0.4, 0x2a2b30);
    T2(roundedBox(2.0, 0.24, 0.24, 0.08, 1), 0, 0.5, 2.58, 0x2a2b30); T2(roundedBox(2.0, 0.24, 0.24, 0.08, 1), 0, 0.5, -2.58, 0x2a2b30);
    for (const s of [-1, 1]) { body.add(partMesh(roundedBox(0.34, 0.16, 0.06, 0.03, 1), headMat, s * 0.68, 0.86, 2.57)); body.add(partMesh(roundedBox(0.2, 0.3, 0.06, 0.03, 1), tailMat, s * 0.84, 1.0, -2.57)); }
    for (const [x, z] of [[-0.86, 1.75], [0.86, 1.75], [-0.86, -1.75], [0.86, -1.75]]) { const w = wheel(0.38, 0.26); w.position.set(x, 0.38, z); g.add(w); u.wheels.push({ g: w, r: 0.38 }); if (z > 0) u.steer.push(w); }
  } else if (kind === 'bajaji') {
    body.add(partMesh(roundedBox(1.3, 0.62, 2.0, 0.2, 2), P, 0, 0.68, -0.25));
    body.add(partMesh(roundedBox(0.95, 0.95, 0.55, 0.22, 2), P, 0, 0.9, 0.92));
    body.add(partMesh(box(1.02, 0.56, 0.04), carGlass, 0, 1.45, 0.98, 0.16));
    T2(roundedBox(1.38, 0.08, 2.1, 0.04, 1), 0, 1.8, -0.25, 0x15161c);
    for (const [x, z] of [[-0.62, 0.68], [0.62, 0.68], [-0.62, -1.2], [0.62, -1.2]]) T2(new T.CylinderGeometry(0.025, 0.025, 0.9, 6), x, 1.35, z, 0x15161c);
    T2(box(1.36, 0.5, 0.04), 0, 1.4, -1.25, 0x15161c);
    T2(roundedBox(1.1, 0.22, 0.5, 0.08, 1), 0, 1.0, -0.85, 0x2a2b30); T2(roundedBox(1.1, 0.5, 0.14, 0.06, 1), 0, 1.25, -1.1, 0x2a2b30);
    T2(roundedBox(0.5, 0.14, 0.42, 0.06, 1), 0, 1.02, 0.28, 0x2a2b30);
    T2(new T.CylinderGeometry(0.02, 0.02, 0.62, 6), 0, 1.18, 0.72, 0x2a2b30, 0, 0, Math.PI / 2);
    T2(box(1.32, 0.06, 0.04), 0, 0.42, 0.68, 0xf3b41b);
    body.add(partMesh(new T.CylinderGeometry(0.1, 0.1, 0.06, 14), headMat, 0, 1.05, 1.21, Math.PI / 2));
    for (const s of [-1, 1]) body.add(partMesh(roundedBox(0.14, 0.08, 0.04, 0.02, 1), tailMat, s * 0.55, 0.62, -1.26));
    const fw = wheel(0.27, 0.16); fw.position.set(0, 0.27, 1.0); g.add(fw); u.wheels.push({ g: fw, r: 0.27 }); u.steer.push(fw);
    for (const s of [-1, 1]) { const w = wheel(0.27, 0.16); w.position.set(s * 0.6, 0.27, -0.78); g.add(w); u.wheels.push({ g: w, r: 0.27 }); }
  } else if (kind === 'boda') {
    body.add(partMesh(roundedBox(0.34, 0.26, 0.62, 0.11, 2), P, 0, 0.98, 0.2));
    T2(roundedBox(0.3, 0.1, 0.78, 0.05, 1), 0, 0.93, -0.32, 0x15161c);
    T2(roundedBox(0.28, 0.32, 0.5, 0.06, 1), 0, 0.55, 0.02, 0x3a3b40);
    T2(new T.CylinderGeometry(0.035, 0.035, 0.75, 8), 0, 0.72, 0.62, 0x8a8f96, 0, -0.35);
    T2(new T.CylinderGeometry(0.018, 0.018, 0.72, 6), 0, 1.1, 0.5, 0x2a2b30, 0, 0, Math.PI / 2);
    T2(roundedBox(0.2, 0.06, 0.4, 0.03, 1), 0, 0.68, -0.72, 0x15161c);
    T2(new T.CylinderGeometry(0.045, 0.05, 0.7, 10), 0.17, 0.45, -0.45, 0xbfc3c9, 0, Math.PI / 2 - 0.1);
    T2(box(0.5, 0.03, 0.3), 0, 0.97, -0.88, 0x2a2b30);
    body.add(partMesh(new T.CylinderGeometry(0.075, 0.075, 0.06, 14), headMat, 0, 1.0, 0.73, Math.PI / 2));
    body.add(partMesh(roundedBox(0.1, 0.06, 0.03, 0.01, 1), tailMat, 0, 0.78, -0.92));
    for (const z of [0.72, -0.66]) { const w = wheel(0.32, 0.11, 0x8a8f96); w.position.set(0, 0.32, z); g.add(w); u.wheels.push({ g: w, r: 0.32 }); if (z > 0) u.steer.push(w); }
  }
  if (!tb.empty) body.add(partMesh(tb.build(), trimMat, 0, 0, 0));
  // a soft contact shadow, so vehicles beyond the sun's shadow range still sit on the road instead of floating
  const sp = VEH[kind]; if (sp && sp.hw) g.add(blobShadow(sp.hw * 2.5, sp.hl * 2.25));
  g.userData = u;
  return g;
}
let blobTex = null;
function blobShadow(w, l) {
  if (!blobTex) { const c = mkCanvas(64, 64), x = c.getContext('2d'), gr = x.createRadialGradient(32, 32, 4, 32, 32, 32); gr.addColorStop(0, 'rgba(0,0,0,.55)'); gr.addColorStop(0.6, 'rgba(0,0,0,.32)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = gr; x.fillRect(0, 0, 64, 64); blobTex = texOf(c, { clamp: true }); }
  const m = new T.Mesh(new T.PlaneGeometry(w, l), new T.MeshBasicMaterial({ map: blobTex, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, fog: true }));
  m.rotation.x = -Math.PI / 2; m.position.y = 0.025; m.renderOrder = 1; m.userData.blob = true; return m;
}

/* ---------- road network for AI traffic ---------- */
const NAV = { nodes: [] };
const navGrid = new Map();
function navNode(x, z) {
  const k = Math.floor(x / 4) + ',' + Math.floor(z / 4);
  for (let ix = -1; ix <= 1; ix++) for (let iz = -1; iz <= 1; iz++) { const list = navGrid.get((Math.floor(x / 4) + ix) + ',' + (Math.floor(z / 4) + iz)); if (list) for (const id of list) { const n = NAV.nodes[id]; if (Math.hypot(n.x - x, n.z - z) < 2.6) return id; } }
  const id = NAV.nodes.length; NAV.nodes.push({ x, z, adj: [] });
  if (!navGrid.has(k)) navGrid.set(k, []); navGrid.get(k).push(id);
  return id;
}
function buildNav() {
  const polys = WORLD.roads.filter(r => r.c === 'T' || r.c === 'R').map(r => ({ c: r.c, p: r.p.map(q => q.slice()) }));
  for (const a of polys) for (const ep of [a.p[0], a.p[a.p.length - 1]]) for (const b of polys) {
    if (a === b) continue;
    for (let i = 0; i < b.p.length - 1; i++) {
      const [x0, z0] = b.p[i], [x1, z1] = b.p[i + 1];
      if (segDist(ep[0], ep[1], x0, z0, x1, z1) > 5) continue;
      const dx = x1 - x0, dz = z1 - z0, l2 = dx * dx + dz * dz, t = clamp(((ep[0] - x0) * dx + (ep[1] - z0) * dz) / l2, 0, 1), q = [x0 + dx * t, z0 + dz * t];
      if (Math.hypot(q[0] - x0, q[1] - z0) > 3 && Math.hypot(q[0] - x1, q[1] - z1) > 3) b.p.splice(i + 1, 0, q);
      ep[0] = q[0]; ep[1] = q[1];
      break;
    }
  }
  for (const r of polys) {
    let prev = null;
    for (const [x, z] of r.p) {
      const id = navNode(x, z);
      if (prev !== null && prev !== id) {
        const A = NAV.nodes[prev], B = NAV.nodes[id], len = Math.hypot(B.x - A.x, B.z - A.z);
        if (!A.adj.some(e => e.to === id)) A.adj.push({ to: id, len, c: r.c });
        if (!B.adj.some(e => e.to === prev)) B.adj.push({ to: prev, len, c: r.c });
      }
      prev = id;
    }
  }
}
const navOk = id => { const n = NAV.nodes[id]; return n.x > BOUNDS.x0 - 260 && n.x < BOUNDS.x1 + 260 && n.z > BOUNDS.z0 - 260; };
function nextNode(from, at) {
  const A = NAV.nodes[from], B = NAV.nodes[at], dx = B.x - A.x, dz = B.z - A.z;
  const opts = B.adj.filter(e => e.to !== from && navOk(e.to));
  if (!opts.length) return from;
  let best = opts[0], bs = -1e9;
  for (const e of opts) { const N = NAV.nodes[e.to], ex = N.x - B.x, ez = N.z - B.z, cos = (dx * ex + dz * ez) / (Math.hypot(dx, dz) * Math.hypot(ex, ez) || 1); const sc = cos * 0.6 + rnd() * 1.2 + (e.c === 'T' ? 0.25 : 0); if (sc > bs) { bs = sc; best = e; } }
  return best.to;
}
const cars = [];
function spawnCars() {
  const starts = NAV.nodes.map((n, i) => i).filter(i => navOk(i) && NAV.nodes[i].adj.length && NAV.nodes[i].x > BOUNDS.x0 && NAV.nodes[i].x < BOUNDS.x1);
  const kinds = BUILD_HQ ? ['sedan', 'daladala', 'bajaji', 'sedan', 'bajaji', 'daladala', 'sedan', 'boda', 'bajaji', 'sedan', 'sedan', 'boda', 'sedan', 'daladala', 'bajaji', 'sedan', 'boda', 'sedan', 'daladala', 'sedan', 'boda', 'bajaji', 'sedan', 'daladala'] : ['sedan', 'daladala', 'bajaji', 'sedan', 'bajaji', 'boda', 'sedan', 'sedan', 'bajaji'];
  kinds.forEach((kind, i) => {
    const a = starts[Math.floor(rnd() * starts.length)], e = pick(NAV.nodes[a].adj);
    const col = kind === 'bajaji' ? BAJAJI_COLS[i % 4] : kind === 'boda' ? BODA_COLS[i % 4] : kind === 'daladala' ? [0xf3b41b, 0x1e9b57, 0xd8452c][i % 3] : SEDAN_COLS[i % SEDAN_COLS.length];
    const m = makeVehicle(kind, col); scene.add(m);
    let driver = null;
    if (kind === 'bajaji' || kind === 'boda') { driver = makeHuman(randomLook(i + 11)); m.add(driver); const sp = VEH[kind].seat; driver.position.set(sp[0], sp[1], sp[2]); }
    const sp = VEH[kind];
    cars.push({ m, kind, driver, a, b: e.to, n: null, d: rnd() * e.len, len: e.len, c: e.c, x: NAV.nodes[a].x, z: NAV.nodes[a].z, yaw: 0, speed: 0, stop: 0, honk: 0, hl: sp.hl, hw: sp.hw, blockedT: 0 });
  });
  for (const c of cars) { c.n = nextNode(c.a, c.b); placeCar(c, 1); }
}
function carTarget(c) {
  const A = NAV.nodes[c.a], B = NAV.nodes[c.b], dx = (B.x - A.x) / c.len, dz = (B.z - A.z) / c.len, lane = c.c === 'T' ? 2.2 : 1.6;
  return { x: A.x + dx * c.d + dz * lane, z: A.z + dz * c.d - dx * lane, dx, dz };
}
function placeCar(c, snap) { const p = carTarget(c); if (snap) { c.x = p.x; c.z = p.z; c.yaw = Math.atan2(p.dx, p.dz); } }
function updateCars(dt, t) {
  for (const c of cars) {
    const p = carTarget(c);
    const fx = Math.sin(c.yaw), fz = Math.cos(c.yaw);
    let target = c.c === 'T' ? 12.5 : 7.5;
    if (c.kind === 'daladala') target *= 0.85;
    if (c.n !== null && c.n !== c.a) {
      const B = NAV.nodes[c.b], N = NAV.nodes[c.n], ex = N.x - B.x, ez = N.z - B.z, el = Math.hypot(ex, ez) || 1;
      const cos = p.dx * ex / el + p.dz * ez / el;
      if (cos < 0.75 && c.len - c.d < 22) target = Math.min(target, lerp(3.5, 9, clamp((cos + 1) / 1.75, 0, 1)));
    } else if (c.len - c.d < 14) target = Math.min(target, 3);
    const look = 5 + c.speed * 0.9;
    let blocked = false, byPlayer = false;
    /* only what is ahead in our own lane stops us: oncoming traffic in the other lane must not (that caused head-on gridlock) */
    const ahead = (x, z, halfW, len) => { const dx = x - c.x, dz = z - c.z; if (Math.abs(dx) > 30 || Math.abs(dz) > 30) return false; const u = dx * fx + dz * fz, v = dx * fz - dz * fx; return u > 0 && u < c.hl + len && Math.abs(v) < c.hw + halfW; };
    const pv = playerVeh ? playerVeh : null, px = pv ? pv.x : P.x, pz = pv ? pv.z : P.z;
    if (ahead(px, pz, pv ? VEH[pv.kind].hw + 0.4 : 0.8, look + (pv ? VEH[pv.kind].hl : 1))) { blocked = true; byPlayer = true; }
    if (!blocked && ORDER.v && ahead(ORDER.v.x, ORDER.v.z, VEH[ORDER.kind].hw + 0.4, look + VEH[ORDER.kind].hl)) blocked = true;
    for (const r of remotes.values()) if (ahead(r.cx, r.cz, 0.9, look + 1)) blocked = true;
    for (const o of cars) if (o !== c && ahead(o.x, o.z, o.hw + 0.35, look + o.hl + 0.6)) { blocked = true; break; }
    if (!blocked) for (const w of walkers) {
      if (isDown(w.h) || Math.abs(w.x - c.x) > 22 || Math.abs(w.z - c.z) > 22) continue;
      const [u, v] = carLocal(c, w.x, w.z);
      if (u > 0 && u < c.hl + 1.5 + c.speed * 1.1 && Math.abs(v) < c.hw + 0.5) { blocked = true; break; }
    }
    if (c.stop > 0) { c.stop -= dt; blocked = true; }
    if (blocked) target = 0;
    c.speed = damp(c.speed, target, target < c.speed ? (blocked ? 5 : 2.5) : 1.2, dt);
    if (byPlayer && c.speed < 1) { c.blockedT += dt; if (c.blockedT > 1.4 && c.honk <= 0) { c.honk = 4 + rnd() * 3; sfx.horn(Math.hypot(c.x - P.x, c.z - P.z)); } } else c.blockedT = 0;
    c.honk -= dt;
    c.d += c.speed * dt;
    while (c.d >= c.len) {
      c.d -= c.len; const prev = c.a; c.a = c.b; c.b = c.n !== null ? c.n : nextNode(prev, c.a);
      const A = NAV.nodes[c.a], B = NAV.nodes[c.b]; c.len = Math.hypot(B.x - A.x, B.z - A.z) || 1;
      const e = A.adj.find(q => q.to === c.b); c.c = e ? e.c : c.c;
      c.n = nextNode(c.a, c.b);
    }
    const q = carTarget(c), ox = c.x, oz = c.z, y0 = c.yaw;
    c.x = damp(c.x, q.x, 5, dt); c.z = damp(c.z, q.z, 5, dt);
    /* face the way the vehicle is really moving, so lane changes and corners read as steering, not sliding */
    const mx = c.x - ox, mz = c.z - oz, moved = Math.hypot(mx, mz);
    const want = c.speed > 0.8 && moved > c.speed * dt * 0.4 ? Math.atan2(mx, mz) : Math.atan2(q.dx, q.dz);
    c.yaw = angDamp(c.yaw, want, c.speed > 0.5 ? 7 : 1, dt);
    c.m.position.set(c.x, 0.04, c.z); c.m.rotation.y = c.yaw;
    if (c.kind === 'boda') { const yr = dt > 0 ? angWrap(c.yaw - y0) / dt : 0; c.lean = damp(c.lean || 0, clamp(-yr * c.speed / 9.8, -0.4, 0.4), 6, dt); c.m.rotation.z = c.lean; }
    { const cx = c.x - camera.position.x, cz = c.z - camera.position.z; c.m.visible = cx * cx + cz * cz < 360 * 360; }
    const u = c.m.userData;
    for (const w of u.wheels) w.g.rotation.x += c.speed * dt / w.r;
    if (c.driver && c.m.visible) { const a = animStep(c, c.x, c.z, dt); if (a) animHuman(c.driver, a, t, 0, VEH[c.kind].pose); }
    // pedestrians and the player on foot
    hitCheck(c);
  }
}
function carLocal(c, x, z) { const fx = Math.sin(c.yaw), fz = Math.cos(c.yaw), dx = x - c.x, dz = z - c.z; return [dx * fx + dz * fz, dx * fz - dz * fx]; }
function hitCheck(c) {
  if (!playerVeh && mode === 'play' && !isDown(player)) {
    const [u, v] = carLocal(c, P.x, P.z);
    if (Math.abs(u) < c.hl + 0.4 && Math.abs(v) < c.hw + 0.4) {
      if (c.speed > 2.6) { const fx = Math.sin(c.yaw), fz = Math.cos(c.yaw); hurtPlayer(c.speed * 3.4, fx + (v > 0 ? fz : -fz) * 0.5, fz + (v > 0 ? -fx : fx) * 0.5, c.speed * 0.9, 'car'); c.stop = 3; sfx.horn(0); }
      else { const fx = Math.sin(c.yaw), fz = Math.cos(c.yaw), s = v >= 0 ? 1 : -1; P.x += fz * s * 0.15; P.z -= fx * s * 0.15; }
    }
  }
  for (const w of walkers) {
    if (isDown(w.h) || c.speed < 3) continue;
    const [u, v] = carLocal(c, w.h.position.x, w.h.position.z);
    if (Math.abs(u) < c.hl + 0.3 && Math.abs(v) < c.hw + 0.3) { knockHuman(w.h, Math.sin(c.yaw), Math.cos(c.yaw), c.speed * 0.8); c.stop = 2.5; }
  }
}

/* ---------- player vehicles (rentals) ---------- */
const rentals = [];
let playerVeh = null, passenger = null;
function spawnRentals() {
  for (const s of STANDS) {
    const ca = Math.cos(s.ry), sa = Math.sin(s.ry);
    s.kinds.forEach((kind, i) => {
      for (let k = 0; k < (kind === 'boda' && s.id === 'park' ? 2 : 1); k++) {
        const off = (i + k) * 2.6 - 1.3, x = s.x + ca * off, z = s.z - sa * off;
        const col = kind === 'bajaji' ? BAJAJI_COLS[(i + k + rentals.length) % 4] : BODA_COLS[(i + k + rentals.length) % 4];
        const v = { kind, col, sx: x, sz: z, syaw: s.ry + Math.PI, x, z, yaw: s.ry + Math.PI, vx: 0, vz: 0, vf: 0, steer: 0, hp: 100, rented: false, stand: s, m: makeVehicle(kind, col), idle: 0, wreck: 0, roll: 0, lean: 0 };
        v.m.position.set(x, 0.04, z); v.m.rotation.y = v.yaw; scene.add(v.m);
        v.col1 = addCircle(x, z, kind === 'boda' ? 0.6 : 0.9, 'veh');
        rentals.push(v);
      }
    });
  }
}
function resetRental(v) { v.x = v.sx; v.z = v.sz; v.yaw = v.syaw; v.vx = v.vz = v.vf = v.steer = 0; v.hp = 100; v.rented = false; v.wreck = 0; v.idle = 0; v.m.visible = true; v.lean = 0; v.m.position.set(v.x, 0.04, v.z); v.m.rotation.set(0, v.yaw, 0); moveVehCollider(v); }
function moveVehCollider(v) {
  const c = v.col1; if (!c) return;
  for (const [k, list] of cgrid) { const i = list.indexOf(c); if (i >= 0) list.splice(i, 1); }
  c.x = v.x; c.z = v.z; addCollider(c);
}
function enterVehicle(v) {
  playerVeh = v; v.idle = 0; v.col1.on = false;
  v.m.add(player); const sp = VEH[v.kind].seat; player.position.set(sp[0], sp[1], sp[2]); player.rotation.set(0, 0, 0);
  cam.yaw = v.yaw + Math.PI; speed = 0;
  sfx.engineStart();
}
function exitVehicle(force) {
  const v = playerVeh; if (!v) return;
  if (!force && Math.abs(v.vf) > 3) { help('Slow down before you get off.', 1600); return; }
  v.m.remove(player); scene.add(player);
  const lx = Math.cos(v.yaw) * (v.kind === 'boda' ? 0.9 : 1.2), lz = -Math.sin(v.yaw) * (v.kind === 'boda' ? 0.9 : 1.2);
  let px = v.x + lx, pz = v.z + lz;
  if (!walkable(px, pz)) { px = v.x - lx; pz = v.z - lz; }
  P.x = px; P.z = pz; player.position.set(P.x, 0.04, P.z); player.rotation.set(0, v.yaw, 0);
  if (passenger) dropPassenger(false);
  v.vf = 0; v.vx = v.vz = 0; v.lean = 0; v.steer = 0; v.m.rotation.z = 0; v.col1.on = true; moveVehCollider(v);
  playerVeh = null; sfx.engineStop(); vehOnExit(v);
  if (job && job.type === 'taxi') endTaxi('You left the bajaji. Taxi shift over.');
}
const vehCircle = { x: 0, z: 0 };
function updatePlayerVehicle(dt, inp) {
  const v = playerVeh, sp = VEH[v.kind];
  const fx = Math.sin(v.yaw), fz = Math.cos(v.yaw), rx = Math.cos(v.yaw), rz = -Math.sin(v.yaw);
  let vf = v.vx * fx + v.vz * fz, vr = v.vx * rx + v.vz * rz;
  const onRoad = !!nearRoad(v.x, v.z, 0.5), maxS = sp.max * (onRoad ? 1 : 0.72) * (RT.boost > now() ? 1.08 : 1);
  const thr = inp.y, hand = inp.hand;
  if (thr > 0.05) vf += (vf < -0.5 ? sp.brake : sp.acc) * thr * dt;
  else if (thr < -0.05) { if (vf > 0.5) vf -= sp.brake * -thr * dt; else vf = Math.max(vf - sp.acc * 0.7 * -thr * dt, -sp.rev); }
  else vf -= Math.sign(vf) * Math.min(Math.abs(vf), (1.2 + Math.abs(vf) * 0.06) * dt);
  if (hand) vf -= Math.sign(vf) * Math.min(Math.abs(vf), 4 * dt);
  if (vf > maxS) vf = damp(vf, maxS, 2, dt);
  if (!onRoad) vf -= vf * 0.25 * dt;
  vr = damp(vr, 0, (hand ? 1.1 : sp.grip) * wetGrip(), dt);
  // steering: the wheel angle is capped by grip, so fast corners are wide and smooth instead of twitchy
  const av = Math.abs(vf), latMax = sp.lat * (hand ? 1.2 : 1) * (onRoad ? 1 : 0.8) * wetGrip();
  const steerCap = av > 0.5 ? Math.min(sp.steer, Math.atan(latMax * sp.wb / (av * av))) : sp.steer;
  v.steer = damp(v.steer, -inp.x * steerCap, inp.x ? 6 : 10, dt);
  let yawRate = vf / sp.wb * Math.tan(v.steer);
  if (hand && av > 4) yawRate *= 1.5;
  v.yaw += yawRate * dt;
  const nfx = Math.sin(v.yaw), nfz = Math.cos(v.yaw), nrx = Math.cos(v.yaw), nrz = -Math.sin(v.yaw);
  v.vx = nfx * vf + nrx * vr; v.vz = nfz * vf + nrz * vr;
  const ox = v.x, oz = v.z;
  v.x += v.vx * dt; v.z += v.vz * dt;
  // collisions: two circles along the body
  let pushX = 0, pushZ = 0;
  const off = sp.hl * 0.55;
  for (const s of [1, -1]) {
    vehCircle.x = v.x + nfx * off * s; vehCircle.z = v.z + nfz * off * s;
    const bx = vehCircle.x, bz = vehCircle.z;
    resolveCircle(vehCircle, sp.R, null, true); resolveCircle(vehCircle, sp.R, null, true);
    resolveStadium(vehCircle, bx - v.vx * dt, bz - v.vz * dt, sp.R);
    pushX += vehCircle.x - bx; pushZ += vehCircle.z - bz;
  }
  for (const c of cars) {
    for (const s of [1, -1]) {
      const cx = c.x + Math.sin(c.yaw) * c.hl * 0.5 * s, cz = c.z + Math.cos(c.yaw) * c.hl * 0.5 * s;
      const dx = v.x - cx, dz = v.z - cz, d = Math.hypot(dx, dz), min = c.hw + sp.R + 0.1;
      if (d < min && d > 0.001) { pushX += dx / d * (min - d); pushZ += dz / d * (min - d); c.stop = Math.max(c.stop, 2.5); }
    }
  }
  for (const w of walkers) { if (isDown(w.h)) continue; const dx = w.h.position.x - v.x, dz = w.h.position.z - v.z; if (dx * dx + dz * dz < (sp.R + 0.5) ** 2 && Math.abs(vf) > 3) { knockHuman(w.h, nfx, nfz, Math.abs(vf) * 0.7); reportCrime('hit'); } }
  for (const th of thieves) { if (th.state === 'gone' || isDown(th.h)) continue; const dx = th.x - v.x, dz = th.z - v.z; if (dx * dx + dz * dz < (sp.R + 0.6) ** 2 && Math.abs(vf) > 2.5) catchThief(th); }
  if (pushX || pushZ) {
    const pl = Math.hypot(pushX, pushZ), nx = pushX / pl, nz = pushZ / pl;
    v.x += pushX; v.z += pushZ;
    const imp = -(v.vx * nx + v.vz * nz);
    if (imp > 0) {
      // kill the speed going into the obstacle (small bounce), keep most of the sliding speed, and twist a little
      v.vx += nx * imp * 1.15; v.vz += nz * imp * 1.15;
      const tx = -nz, tz = nx, vt = v.vx * tx + v.vz * tz, vn = v.vx * nx + v.vz * nz, keep = imp > 6 ? 0.55 : 0.85;
      v.vx = nx * vn + tx * vt * keep; v.vz = nz * vn + tz * vt * keep;
      v.yaw += clamp((nfx * tz - nfz * tx) * imp * 0.012, -0.12, 0.12);
      if (imp > 4.5) { if (imp > 6) damageVehicle(v, (imp - 6) * 3.5); sfx.crash(imp); shake(Math.min(1, imp / 12)); }
    }
  }
  if (!walkable(v.x, v.z) || v.z > coastZ(v.x) - 1.5) { v.x = ox; v.z = oz; v.vx *= -0.2; v.vz *= -0.2; }
  v.vf = v.vx * nfx + v.vz * nfz;
  v.m.position.set(v.x, 0.04, v.z); v.m.rotation.y = v.yaw;
  v.roll = damp(v.roll, clamp(vr * 0.04 + yawRate * vf * 0.004, -0.12, 0.12), 6, dt);
  /* the whole bike (wheels and rider too) leans about the tyre contact line, by the real lean angle for this corner */
  if (v.kind === 'boda') { v.lean = damp(v.lean, clamp(-Math.atan(yawRate * Math.abs(vf) / 9.8) * 0.85, -0.45, 0.45), 6, dt); v.m.rotation.z = v.lean; }
  else v.m.userData.body.rotation.z = v.roll;
  v.m.userData.body.rotation.x = damp(v.m.userData.body.rotation.x, clamp(-thr * 0.02 * (Math.abs(vf) < sp.max * 0.9 ? 1 : 0), -0.03, 0.03), 4, dt);
  for (const w of v.m.userData.wheels) w.g.rotation.x += v.vf * dt / w.r;
  for (const w of v.m.userData.steer) w.rotation.y = v.steer;
  speed = Math.abs(v.vf);
  P.x = v.x; P.z = v.z;
  // trafiki speed check
  const td = Math.hypot(v.x - TRAFIKI.x, v.z - TRAFIKI.z);
  if (td < 34 && Math.abs(v.vf) > 13.9 && now() > RT.fineCool && !(job && job.type === 'race')) {
    RT.fineCool = now() + 12;
    const f = Math.min(money(), PRICES.fine);
    playEmote(npcObjs.trafiki, 'wave'); sfx.whistle();
    if (f > 0) { spend(f, 'Speeding fine', 'lost'); splash('FAINI!', `Trafiki fined you ${tsh(f)} for speeding`, 'bad'); }
    RT.fines = (RT.fines || []).filter(q => now() - q < 120); RT.fines.push(now()); if (RT.fines.length >= 2) setTimeout(() => reportCrime('speed'), 2500);
  }
}
function damageVehicle(v, d) {
  v.hp = Math.max(0, v.hp - d);
  if (v.hp <= 0 && !v.wreck) {
    v.wreck = 1;
    if (v.owned) { exitVehicle(true); v.m.visible = false; v.col1.on = false; vehWrecked(v); return; }
    const fee = Math.min(money(), PRICES.repair);
    exitVehicle(true);
    if (fee > 0) spend(fee, 'Repair fee', 'lost');
    splash('IMEHARIBIKA!', `${VEH[v.kind].name} wrecked. Repair fee ${tsh(fee)}`, 'bad');
    v.m.visible = false; v.col1.on = false; v.rented = false;
    if (v.dala) { if (job && job.type === 'dala') endDala(true); setTimeout(resetDala, 30000); } else setTimeout(() => resetRental(v), 30000);
  }
}
function updateRentals(dt) {
  for (const v of rentals) {
    if (v !== playerVeh && !v.wreck) { const cx = v.x - camera.position.x, cz = v.z - camera.position.z; v.m.visible = cx * cx + cz * cz < 320 * 320; }
    if (v === playerVeh || !v.rented || v.wreck || v.owned) continue;
    v.idle += dt;
    if (v.idle > 120 && Math.hypot(v.x - P.x, v.z - P.z) > 80) { resetRental(v); note(`Your ${VEH[v.kind].name.toLowerCase()} went back to the ${v.stand.name.toLowerCase()}.`); }
  }
}
function nearestRental(maxD) { let best = null, bd = maxD; for (const v of rentals) { if (v.wreck) continue; const d = Math.hypot(v.x - P.x, v.z - P.z); if (d < bd) { bd = d; best = v; } } return best; }
function rentOrRide(v) {
  if (!v.rented) {
    const price = PRICES[v.kind];
    if (!canPay(price)) { help(`You need ${tsh(price)} to rent the ${VEH[v.kind].name.toLowerCase()}.`, 2200); sfx.deny(); return; }
    for (const o of rentals) if (o !== v && o.rented && !o.owned && o !== playerVeh) resetRental(o);
    spend(price, `${VEH[v.kind].name} rental`, 'spent'); v.rented = true;
    if (!state.tips.drive) { state.tips.drive = 1; help('<kbd>W</kbd><kbd>S</kbd> throttle and brake, <kbd>A</kbd><kbd>D</kbd> steer, <kbd>Space</kbd> handbrake to drift, <kbd>Q</kbd> horn, <kbd>E</kbd> to get off. Mind the trafiki: the limit is 50 km/h.', 9000); }
  }
  enterVehicle(v);
}

