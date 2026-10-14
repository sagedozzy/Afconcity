/* ===================== 19 body: sculpted skinned fans on a 22-bone rig, gait with foot IK, look-at, blinks, blended emotes ===================== */
/* One continuous skinned surface per person (lofted torso and limbs with blended joint weights, a sculpted head),
   clothes painted into vertex colours with hem lips, and a per-vertex roughness so eyes shine and cloth stays matte.
   Two levels of detail share one skeleton. */
const BONES = ['root', 'hips', 'spine', 'chest', 'neck', 'head', 'lidL', 'lidR', 'clavL', 'uArmL', 'fArmL', 'handL', 'clavR', 'uArmR', 'fArmR', 'handR', 'thighL', 'shinL', 'footL', 'thighR', 'shinR', 'footR'];
const BONE = Object.fromEntries(BONES.map((n, i) => [n, i]));
const BONE_PARENT = { hips: 'root', spine: 'hips', chest: 'spine', neck: 'chest', head: 'neck', lidL: 'head', lidR: 'head', clavL: 'chest', uArmL: 'clavL', fArmL: 'uArmL', handL: 'fArmL', clavR: 'chest', uArmR: 'clavR', fArmR: 'uArmR', handR: 'fArmR', thighL: 'hips', shinL: 'thighL', footL: 'shinL', thighR: 'hips', shinR: 'thighR', footR: 'shinR' };
const SKINS = [0x5a3620, 0x3d2416, 0x7a4a2a, 0x4f2f1c, 0x6b4226, 0x8a5a36, 0x46291a];
const HIPS_Y = 0.93, LEG1 = 0.41, LEG2 = 0.395, ANKLE_Y = 0.085;
const EYE = { x: 0.034, y: 1.664, z: 0.086, r: 0.0135 };
function rigPoints(f) {
  const sh = f ? 0.172 : 0.19, hx = f ? 0.098 : 0.095, P = {
    root: [0, 0, 0], hips: [0, HIPS_Y, 0], spine: [0, 1.03, 0], chest: [0, 1.24, 0], neck: [0, 1.45, -0.005], head: [0, 1.55, -0.002],
    lidL: [EYE.x, EYE.y, EYE.z], lidR: [-EYE.x, EYE.y, EYE.z],
  };
  for (const [s, L] of [[1, 'L'], [-1, 'R']]) {
    P['clav' + L] = [0.025 * s, 1.41, -0.01]; P['uArm' + L] = [sh * s, 1.42, -0.012]; P['fArm' + L] = [(sh + 0.012) * s, 1.135, -0.02]; P['hand' + L] = [(sh + 0.02) * s, 0.885, -0.005];
    P['thigh' + L] = [hx * s, HIPS_Y - 0.04, 0]; P['shin' + L] = [hx * s, HIPS_Y - 0.04 - LEG1, 0]; P['foot' + L] = [hx * s, ANKLE_Y, 0];
  }
  return P;
}
const W = (...a) => { const o = []; for (let i = 0; i < a.length; i += 2) o.push([BONE[a[i]], a[i + 1]]); return o; };

/* ---------- geometry accumulator with skin weights and roughness ---------- */
const _sv = new T.Vector3(), _sn = new T.Vector3();
class SkinGeo {
  constructor() { this.p = []; this.n = []; this.c = []; this.si = []; this.sw = []; this.r = []; this.idx = []; this.pt = []; this.uv = []; this.pw = []; }
  get count() { return this.p.length / 3; }
  pushW(w) {
    if (typeof w === 'number') { this.si.push(w, 0, 0, 0); this.sw.push(1, 0, 0, 0); return; }
    const s = w.slice().sort((a, b) => b[1] - a[1]).slice(0, 4); let t = 0; for (const q of s) t += q[1];
    for (let k = 0; k < 4; k++) { this.si.push(s[k] ? s[k][0] : 0); this.sw.push(s[k] ? s[k][1] / (t || 1) : 0); }
  }
  /* geo: any BufferGeometry with normals; m: placement; col: Color or fn(v, n) -> Color; wts: bone, weight list or fn(v) -> either */
  add(geo, m, col, wts, rough, keep) {
    const base = this.count, pa = geo.attributes.position, na = geo.attributes.normal, nm = m ? new T.Matrix3().getNormalMatrix(m) : null;
    for (let i = 0; i < pa.count; i++) {
      _sv.fromBufferAttribute(pa, i); _sn.fromBufferAttribute(na, i);
      if (m) { _sv.applyMatrix4(m); _sn.applyMatrix3(nm).normalize(); }
      this.p.push(_sv.x, _sv.y, _sv.z); this.n.push(_sn.x, _sn.y, _sn.z);
      const cc = typeof col === 'function' ? col(_sv, _sn) : col; this.c.push(cc.r, cc.g, cc.b);
      this.pushW(typeof wts === 'function' ? wts(_sv) : wts); this.r.push(rough === undefined ? 0.8 : rough); this.pt.push(0); this.uv.push(0, 0); this.pw.push(0);
    }
    const ix = geo.index;
    if (ix) { for (let i = 0; i < ix.count; i += 3) { const a = ix.getX(i), b = ix.getX(i + 1), c = ix.getX(i + 2); if (keep && !keep(pa, a, b, c)) continue; this.idx.push(base + a, base + b, base + c); } }
    else for (let i = 0; i < pa.count; i += 3) { if (keep && !keep(pa, i, i + 1, i + 2)) continue; this.idx.push(base + i, base + i + 1, base + i + 2); }
  }
  build() {
    const g = new T.BufferGeometry(), n = this.count;
    // baked occlusion: undersides and creases a touch darker, a little fabric/skin variation
    const puv = new Float32Array(n * 4);
    for (let i = 0; i < n; i++) {
      const ny = this.n[i * 3 + 1], k = (0.8 + 0.2 * (0.5 + 0.5 * ny)) * (0.97 + 0.06 * hash2(this.p[i * 3] * 91, this.p[i * 3 + 1] * 57 + this.p[i * 3 + 2] * 33));
      this.c[i * 3] *= k; this.c[i * 3 + 1] *= k; this.c[i * 3 + 2] *= k;
      puv[i * 4] = this.uv[i * 2]; puv[i * 4 + 1] = this.uv[i * 2 + 1]; puv[i * 4 + 2] = k; puv[i * 4 + 3] = this.pw[i];
    }
    g.setAttribute('position', new T.Float32BufferAttribute(this.p, 3));
    g.setAttribute('normal', new T.Float32BufferAttribute(this.n, 3));
    g.setAttribute('color', new T.Float32BufferAttribute(this.c, 3));
    g.setAttribute('skinIndex', new T.Uint16BufferAttribute(this.si, 4));
    g.setAttribute('skinWeight', new T.Float32BufferAttribute(this.sw, 4));
    g.setAttribute('aRough', new T.Float32BufferAttribute(this.r, 1));
    if (this.pt.some(v => v > 0)) { g.setAttribute('aPat', new T.Float32BufferAttribute(this.pt, 1)); g.setAttribute('aPuv', new T.BufferAttribute(puv, 4)); }
    g.setIndex(this.idx);
    g.boundingSphere = new T.Sphere(new T.Vector3(0, 0.9, 0), 1.35);
    return g;
  }
}
/* vertical loft: rings bottom to top, each { y, x, z, rx, rz, w (or wfn(ca) for weights that depend on the side), col (Color | fn(a, ca, sa, y)), r (roughness), sq }.
   A colour carrying .pt is printed cloth: the seam column is doubled so the print wraps without a smear. o.both adds an inside face. */
function addLoft(sg, rings, seg, o) {
  o = o || {};
  const pos = [], cols = [], wts = [], rs = [], idx = [];
  for (const R of rings) {
    const sq = R.sq || o.sq || 2;
    for (let k = 0; k < seg; k++) {
      const a = k / seg * TAU, ca = Math.cos(a), sa = Math.sin(a);
      const ex = Math.sign(ca) * Math.pow(Math.abs(ca), 2 / sq), ez = Math.sign(sa) * Math.pow(Math.abs(sa), 2 / sq);
      let yv = R.y, rx = R.rx, rz = R.rz, zc = R.z, fb = R.fb;
      if (R.fy && sa > 0) { yv = R.y - R.fy * sa * sa; if (R.at) ({ rx, rz, z: zc, fb } = R.at(yv)); }
      let bz = 0; if (fb && sa > 0) bz = fb * Math.pow(sa, 1.5) * Math.exp(-((Math.abs(ca) - 0.42) ** 2) / 0.05);
      pos.push(R.x + ex * rx, yv, zc + ez * rz + bz);
      cols.push(typeof R.col === 'function' ? R.col(a, ca, sa, R.y) : R.col); wts.push(R.wfn ? R.wfn(ca) : R.w); rs.push(R.r === undefined ? 0.8 : R.r);
    }
  }
  const nr = rings.length;
  for (let i = 0; i < nr - 1; i++) for (let k = 0; k < seg; k++) { const a = i * seg + k, b = i * seg + (k + 1) % seg, c = a + seg, d = b + seg; idx.push(a, c, b, b, c, d); }
  const caps = [];
  if (o.capB) { const R = rings[0], ci = pos.length / 3; pos.push(R.x, R.y - (o.capB === true ? 0 : o.capB), R.z); cols.push(typeof R.col === 'function' ? R.col(-Math.PI / 2, 0, -1, R.y) : R.col); wts.push(R.wfn ? R.wfn(0) : R.w); rs.push(R.r === undefined ? 0.8 : R.r); for (let k = 0; k < seg; k++) idx.push(ci, k, (k + 1) % seg); caps.push([ci, 0]); }
  if (o.capT) { const R = rings[nr - 1], ci = pos.length / 3, b0 = (nr - 1) * seg; pos.push(R.x, R.y + (o.capT === true ? 0 : o.capT), R.z); cols.push(typeof R.col === 'function' ? R.col(Math.PI / 2, 0, 1, R.y) : R.col); wts.push(R.wfn ? R.wfn(0) : R.w); rs.push(R.r === undefined ? 0.8 : R.r); for (let k = 0; k < seg; k++) idx.push(ci, b0 + (k + 1) % seg, b0 + k); caps.push([ci, nr - 1]); }
  const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
  const P = g.attributes.position, N = g.attributes.normal;
  // print repeats: a whole number of tiles around the average girth
  let per = 0; for (const R of rings) per += TAU * Math.sqrt((R.rx * R.rx + R.rz * R.rz) / 2); const rep = Math.max(1, Math.round(per / nr / PAT_M));
  const base = sg.count, W1 = seg + 1, pid = cols.map(c => c.pt || 0), pw = pid.map(v => v ? 1 : 0);
  if (pid.some(v => v)) for (let i = 0; i < nr; i++) for (let k = 0; k < seg; k++) {
    const j = i * seg + k; if (pid[j]) continue;
    for (const q of [i * seg + (k + 1) % seg, i * seg + (k + seg - 1) % seg, j + seg, j - seg]) if (q >= 0 && q < nr * seg && cols[q].pt) { pid[j] = cols[q].pt; break; }
  }
  const put = (j, u, v) => { sg.p.push(P.getX(j), P.getY(j), P.getZ(j)); sg.n.push(N.getX(j), N.getY(j), N.getZ(j)); const c = cols[j]; sg.c.push(c.r, c.g, c.b); sg.pushW(wts[j]); sg.r.push(rs[j]); sg.pt.push(pid[j] || 0); sg.pw.push(pw[j] || 0); sg.uv.push(u, v); };
  for (let i = 0; i < nr; i++) for (let k = 0; k <= seg; k++) { const j = i * seg + (k % seg); put(j, k / seg * rep, P.getY(j) / PAT_M); }
  const capBase = base + nr * W1; caps.forEach(([ci]) => put(ci, 0, P.getY(ci) / PAT_M));
  const out = [];
  for (let i = 0; i < nr - 1; i++) for (let k = 0; k < seg; k++) { const a = base + i * W1 + k, b = a + 1, c = a + W1, d = b + W1; out.push(a, c, b, b, c, d); }
  caps.forEach(([ci, ri], n) => { const cc = capBase + n, r0 = base + ri * W1; for (let k = 0; k < seg; k++) { if (ri === 0) out.push(cc, r0 + k, r0 + k + 1); else out.push(cc, r0 + k + 1, r0 + k); } });
  for (const i of out) sg.idx.push(i);
  if (o.both) for (let i = 0; i < out.length; i += 3) sg.idx.push(out[i], out[i + 2], out[i + 1]);
}
/* piecewise-linear profile lookup: rows [y, ...values] sorted by y */
function prof(rows, y) {
  if (y <= rows[0][0]) return rows[0].slice(1);
  for (let i = 0; i < rows.length - 1; i++) { const a = rows[i], b = rows[i + 1]; if (y <= b[0]) { const t = (y - a[0]) / (b[0] - a[0]); return a.slice(1).map((v, k) => lerp(v, b[k + 1], t)); } }
  return rows[rows.length - 1].slice(1);
}
function wBlend(y, bands) { // bands: [[y, weights], ...] ascending: linear blend between neighbours
  if (y <= bands[0][0]) return bands[0][1];
  for (let i = 0; i < bands.length - 1; i++) {
    const [y0, w0] = bands[i], [y1, w1] = bands[i + 1];
    if (y <= y1) { const t = (y - y0) / (y1 - y0), m = new Map(); for (const [b, w] of w0) m.set(b, (m.get(b) || 0) + w * (1 - t)); for (const [b, w] of w1) m.set(b, (m.get(b) || 0) + w * t); return [...m.entries()].filter(e => e[1] > 0.001); }
  }
  return bands[bands.length - 1][1];
}

/* ---------- head ---------- */
function sculptPoint(X, Y, Z) {
  if (Y < 0.1) { const k = smooth(clamp((0.1 - Y) / 1.0, 0, 1)); X *= 1 - 0.24 * k; if (Z < 0) Z *= 1 - 0.28 * k; }
  if (Y < -0.5 && Z > 0.15) Z += 0.07 * smooth(clamp((-0.5 - Y) / 0.4, 0, 1)) * smooth(clamp((Z - 0.15) / 0.6, 0, 1));
  if (Z < 0 && Y > -0.25) Z *= 1.07;
  if (Z > 0.55) { const by = Math.exp(-((Y - 0.26) ** 2) / 0.008); Z += 0.04 * by * (1 - Math.abs(X)); }
  if (Z > 0.45) for (const s of [1, -1]) { const d2 = (X - 0.39 * s) ** 2 + (Y - 0.08) ** 2; Z -= 0.075 * Math.exp(-d2 / 0.014); }
  if (Z > 0.25) for (const s of [1, -1]) { const d2 = (X - 0.62 * s) ** 2 + (Y + 0.1) ** 2, k = Math.exp(-d2 / 0.03); X += 0.03 * s * k; Z += 0.025 * k; }
  if (Z > 0.82) Z = 0.82 + (Z - 0.82) * 0.55;
  return [X * 0.97, Y, Z];
}
const HEAD = { x: 0, y: 1.655, z: 0.005, rx: 0.088, ry: 0.116, rz: 0.103 };
function headShell(ws, hs, sc, f, dy, dz) {
  const g = new T.SphereGeometry(1, ws, hs), P = g.attributes.position, k = f ? 0.955 : 1;
  for (let i = 0; i < P.count; i++) {
    const [X, Y, Z] = sculptPoint(P.getX(i), P.getY(i), P.getZ(i));
    P.setXYZ(i, HEAD.x + X * HEAD.rx * sc * k, HEAD.y + (dy || 0) + Y * HEAD.ry * sc, HEAD.z + (dz || 0) + Z * HEAD.rz * sc * (f ? 0.97 : 1));
  }
  g.computeVertexNormals();
  return g;
}
/* triangle mask in unit head space: keep a triangle when its centroid passes */
function unitMask(sc, fn, dy, dz) {
  return (P, a, b, c) => {
    const X = (P.getX(a) + P.getX(b) + P.getX(c)) / 3 / (HEAD.rx * sc), Y = ((P.getY(a) + P.getY(b) + P.getY(c)) / 3 - HEAD.y - (dy || 0)) / (HEAD.ry * sc), Z = ((P.getZ(a) + P.getZ(b) + P.getZ(c)) / 3 - HEAD.z - (dz || 0)) / (HEAD.rz * sc);
    return fn(X, Y, Z);
  };
}
const hairLine = (X, Y, Z, front) => Y > lerp(front, -0.52, smooth(clamp((0.55 - Z) / 1.45, 0, 1))) && !(Math.abs(X) > 0.74 && Y < 0.12 && Z > -0.4);

/* ---------- the look of a person ---------- */
function hairColorJitter(base) { return (v) => { const k = 0.82 + 0.3 * hash2(v.x * 400, v.y * 400 + v.z * 300); return base.clone().multiplyScalar(k); }; }
function buildBody(look, hi) {
  const L = look, f = !!L.f, sg = new SkinGeo(), RP = rigPoints(f);
  const rb = (w, h, d, r) => hi ? roundedBox(w, h, d, r, 1) : box(w, h, d);
  const skin = C(L.skin || 0x5a3620), shirt = C(L.shirt || 0xf6f1e7), lower = C(L.lower || 0x232a63), trim = C(L.trim || 0xf6f1e7);
  const shoeC = C(L.shoes || 0x1d1d22), soleC = C(L.sole || (L.shoes === 0xf4f4f0 ? 0xd8d4cc : 0xf2f0ea)), hairC = C(L.hairCol || 0x141010);
  const palm = skin.clone().lerp(C(0xc8957a), 0.38), lip = skin.clone().multiplyScalar(0.7).lerp(C(0x5a2424), 0.25);
  const kit = !!L.kit, kitLow = L.kitLow === undefined ? kit : !!L.kitLow, robe = !!L.robe, dress = L.dress ? C(L.dress) : null;
  const R_SKIN = 0.52, R_CLOTH = 0.86, SEG = hi ? 22 : 10, LSEG = hi ? 14 : 7;
  // printed cloth: near people carry the print id for the shader; far people get the print's average colour
  const tag = (c, p) => { const id = p ? PATS.indexOf(p) : 0; if (id <= 0) return c; if (!hi) return c.clone().lerp(PAT_AVG[id].c, PAT_AVG[id].a); const o = c.clone(); o.pt = id; return o; };
  const shade = (c, k) => { const o = c.clone().multiplyScalar(k); o.pt = c.pt; return o; };
  const shirtP = tag(shirt, L.tp), lowerP = tag(lower, L.bp), dressP = dress ? tag(dress, L.dp) : null, kitTrim = C(L.kitTrim || L.trim || 0xf6f1e7);
  const SLEEVES = { none: 1.49, short: 1.255, elbow: 1.06, long: 0.9 };
  const sleeveY = L.sleeve ? (L.sleeve === 'short' && kit ? 1.275 : SLEEVES[L.sleeve]) : L.longSleeve || robe ? 0.9 : kit ? 1.275 : 1.255;
  const longArm = sleeveY < 1.0, shortsY = L.plen !== undefined ? L.plen : L.pants || robe ? 0.1 : kit ? 0.655 : 0.6, pantsLike = shortsY <= 0.3 || robe;
  const neck = L.neck || (kit ? 'crew' : L.style === 'button' ? 'collar' : '');

  /* torso */
  const TP = f ? [[0.855, 0.140, 0.090, -0.004], [0.90, 0.172, 0.108, -0.014], [0.96, 0.170, 0.105, -0.010], [1.03, 0.140, 0.090, 0.0], [1.09, 0.128, 0.084, 0.002], [1.16, 0.140, 0.092, 0.010], [1.24, 0.152, 0.098, 0.014], [1.31, 0.158, 0.094, 0.010], [1.37, 0.163, 0.087, 0.002], [1.415, 0.150, 0.078, -0.006], [1.445, 0.105, 0.064, -0.008], [1.465, 0.06, 0.05, -0.006]]
    : [[0.855, 0.145, 0.092, -0.004], [0.90, 0.166, 0.104, -0.012], [0.96, 0.163, 0.100, -0.008], [1.03, 0.150, 0.094, 0.0], [1.10, 0.152, 0.096, 0.004], [1.18, 0.164, 0.103, 0.010], [1.26, 0.176, 0.108, 0.013], [1.33, 0.184, 0.104, 0.008], [1.385, 0.182, 0.092, 0.0], [1.425, 0.150, 0.078, -0.006], [1.45, 0.10, 0.064, -0.008], [1.465, 0.06, 0.052, -0.006]];
  const bustF = (y) => f ? 0.05 * Math.exp(-(((y - 1.262) / 0.052) ** 2)) : 0.012 * Math.exp(-(((y - 1.3) / 0.05) ** 2));
  const TW = [[0.95, W('hips', 1)], [1.07, W('spine', 1)], [1.19, W('spine', 1)], [1.29, W('chest', 1)]];
  // an untucked shirt hangs over the waistband
  const untuck = !!L.untuck && !dress, hemY = untuck ? 0.89 : 0.985;
  const placket = L.style === 'button' || L.style === 'polo';
  const shirtCol = (a, ca, sa, y) => {
    if (kit) {
      if (y > 1.442 || (sa > 0.86 && y > 1.39 - (1 - sa) * 0.3)) return trim;
      if (Math.abs(ca) > 0.95 && y < 1.37 && y > hemY + 0.01) return trim;
      return shirtP;
    }
    // necklines: a V, a wide boat neck, an open collar, tank-top straps
    if (neck === 'v' && sa > 0.3 && y > 1.33 + Math.abs(ca) * 0.55) return skin;
    if (neck === 'boat' && y > 1.437 && Math.abs(ca) < 0.75) return skin;
    if (neck === 'collar' && L.style === 'button' && sa > 0.55 && y > 1.395 + Math.abs(ca) * 0.5) return skin;
    if (neck === 'tank' && ((y > 1.38 && Math.abs(ca) > 0.62) || (Math.abs(sa) > 0.5 && y > 1.405 + Math.abs(ca) * 0.3))) return skin;
    if (placket && Math.abs(a - Math.PI / 2) < 0.07 && y > (L.style === 'polo' ? 1.3 : 0.9) && y < 1.42) return shade(shirtP, 0.8);
    if (L.style === 'kanga' && y < 1.32) { const band = Math.floor((y - 0.9) * 28) % 4 === 0; return band ? C(L.trim || 0xf3b41b) : shirt; }
    return shirtP;
  };
  const lowerCol = (a, ca) => (kitLow && Math.abs(ca) > 0.95) ? kitTrim : lowerP;
  const baseY = hi ? [0.855, 0.88, 0.905, 0.94, 0.975, 1.01, 1.05, 1.09, 1.13, 1.165, 1.2, 1.225, 1.25, 1.275, 1.3, 1.325, 1.35, 1.375, 1.4, 1.42, 1.44, 1.455, 1.465] : [0.855, 0.9, 1.0, 1.08, 1.18, 1.28, 1.37, 1.42, 1.455, 1.465];
  const tys = baseY.filter(y => Math.abs(y - hemY) > 0.007).concat(hi ? [hemY - 0.004, hemY - 0.002, hemY] : [hemY - 0.002, hemY]).sort((p, q) => p - q);
  const rings = [];
  for (const y of tys) {
    const [rx, rz, z] = prof(TP, y), below = y < hemY - 0.001, lipRing = Math.abs(y - hemY) < 0.0005;
    const inflate = robe ? 1.03 : below ? 1.0 : lipRing ? 1.045 : 1.02;
    // an untucked shirt hangs clear of the hips and the tops of the trouser legs
    const hang = untuck && !below && y < 1.03 ? 1 - smooth(clamp((y - hemY) / (1.03 - hemY), 0, 1)) : 0;
    const fb = bustF(y);
    rings.push({ y, x: 0, z: z + 0.004 * hang, rx: Math.max(rx * inflate, lerp(rx * inflate, 0.218, hang)), rz: Math.max(rz * inflate, lerp(rz * inflate, 0.152, hang)), fb, w: wBlend(y, TW), col: robe ? shirtP : below ? lowerCol : shirtCol, r: R_CLOTH, sq: y > 1.15 && y < 1.43 ? 2.5 : hang > 0.05 ? 2.15 + 0.7 * hang : 2.15 });
  }
  addLoft(sg, rings, SEG * 2 - 4, { capB: 0.03 });
  /* neck */
  {
    const nr = [[1.40, 0.056, 0.058, -0.004, W('chest', 1)], [1.46, 0.052, 0.055, -0.002, W('chest', 0.45, 'neck', 0.55)], [1.515, 0.048, 0.051, 0.004, W('neck', 0.75, 'head', 0.25)], [1.575, 0.047, 0.05, 0.012, W('head', 1)]];
    addLoft(sg, nr.map(([y, rx, rz, z, w]) => ({ y, x: 0, z, rx: rx * (f ? 0.92 : 1), rz: rz * (f ? 0.92 : 1), w, col: skin, r: R_SKIN })), LSEG + 2);
    if (neck === 'collar' || kit) {
      // a collar stands up round the back of the neck and falls open at the front
      sg.add(new T.TorusGeometry(0.06, hi ? 0.01 : 0.013, 6, hi ? 20 : 10, kit ? TAU : TAU * 0.78), mat4(0, 1.452, -0.004, 0, 1, 1, kit ? 1.05 : 1.8, Math.PI / 2 - 0.2, kit ? 0 : Math.PI / 2 - TAU * 0.89), kit ? trim : shirt.clone().multiplyScalar(1.06), W('chest', 0.7, 'neck', 0.3), R_CLOTH);
      if (!kit && hi) for (const q of [1, -1]) sg.add(rb(0.045, 0.006, 0.05, 0.003), mat4(q * 0.045, 1.425, 0.05, q * 0.5, 1, 1, 1, -0.9, q * 0.3), shirt.clone().multiplyScalar(1.03), W('chest', 1), R_CLOTH);
    } else if (neck === 'crew' && hi) sg.add(new T.TorusGeometry(0.056, 0.006, 5, 20), mat4(0, 1.448, -0.002, 0, 1, 1, 1.05, Math.PI / 2 - 0.15), shade(shirt, 0.92), W('chest', 0.7, 'neck', 0.3), R_CLOTH);
  }
  /* legs */
  const LP = f ? [[0.075, 0.030, 0.033, 0.0], [0.10, 0.032, 0.035, 0.0], [0.14, 0.034, 0.037, -0.002], [0.20, 0.040, 0.043, -0.004], [0.27, 0.048, 0.051, -0.008], [0.34, 0.054, 0.058, -0.011], [0.40, 0.052, 0.056, -0.008], [0.45, 0.049, 0.052, 0.006], [0.48, 0.050, 0.054, 0.010], [0.51, 0.053, 0.057, 0.008], [0.57, 0.060, 0.063, 0.006], [0.66, 0.071, 0.074, 0.006], [0.76, 0.081, 0.085, 0.004], [0.86, 0.089, 0.093, 0.0], [0.93, 0.094, 0.098, -0.004], [0.975, 0.096, 0.100, -0.004]]
    : [[0.075, 0.031, 0.034, 0.0], [0.10, 0.033, 0.036, 0.0], [0.14, 0.035, 0.038, -0.002], [0.20, 0.041, 0.044, -0.004], [0.27, 0.050, 0.053, -0.008], [0.34, 0.057, 0.062, -0.012], [0.40, 0.055, 0.060, -0.008], [0.45, 0.051, 0.054, 0.006], [0.48, 0.051, 0.055, 0.010], [0.51, 0.052, 0.056, 0.008], [0.57, 0.058, 0.061, 0.006], [0.66, 0.068, 0.071, 0.006], [0.76, 0.077, 0.082, 0.004], [0.86, 0.085, 0.090, 0.0], [0.93, 0.090, 0.096, -0.004], [0.975, 0.092, 0.098, -0.004]];
  const sockC = L.socks ? C(L.socks) : null;
  // trouser legs hang straight (or wide) from the thigh; shorts sit a little loose
  const minR = L.wide === 2 ? 0.098 : L.wide ? 0.074 : 0.06;
  for (const [s, side] of [[1, 'L'], [-1, 'R']]) {
    const th = 'thigh' + side, sh = 'shin' + side, ft = 'foot' + side, hx = RP[th][0];
    const LW = [[0.085, W(ft, 0.35, sh, 0.65)], [0.12, W(sh, 1)], [0.44, W(sh, 1)], [0.52, W(th, 1)], [0.9, W(th, 1)], [0.975, W('hips', 0.55, th, 0.45)]];
    const ys = hi ? [0.075, 0.1, 0.14, 0.2, 0.27, 0.34, 0.4, 0.45, 0.48, 0.51, 0.57, 0.66, 0.76, 0.86, 0.93, 0.975] : [0.075, 0.14, 0.27, 0.4, 0.48, 0.57, 0.76, 0.93, 0.975];
    const hemAt = robe ? 0.1 : shortsY, rl = [];
    const push = (y, k, col, r) => { const [rx, rz, z] = prof(LP, y); rl.push({ y, x: hx - s * 0.006 * (1 - y), z, rx: rx * k, rz: rz * k, w: wBlend(y, LW), col, r }); };
    const legCol = (y) => {
      if (y >= hemAt && !dress) return { c: robe ? lowerP : lowerCol, k: pantsLike ? Math.max(1.08, minR / prof(LP, y)[0] * (1 + (0.5 - Math.min(y, 0.5)) * (L.wide ? 0.25 : 0))) : 1.08, r: R_CLOTH };
      if (dress && y > (L.long ? 0.12 : 0.34)) return { c: skin, k: 0.8, r: R_SKIN };
      if (sockC && y < 0.4) return { c: y > 0.375 ? kitTrim : sockC, k: 1.06, r: R_CLOTH };
      return { c: skin, k: 1, r: R_SKIN };
    };
    for (const y of ys) {
      if (sockC && !pantsLike && rl.length && rl[rl.length - 1].y < 0.4 && y >= 0.4) { push(0.399, 1.07, kitTrim, R_CLOTH); push(0.4, 1.0, skin, R_SKIN); }
      if (!dress && rl.length && rl[rl.length - 1].y < hemAt && y >= hemAt) { const a = legCol(hemAt - 0.002), b2 = legCol(hemAt + 0.002); push(hemAt - 0.001, a.k, a.c, a.r); push(hemAt, b2.k * 1.07, b2.c, b2.r); }
      if (Math.abs(y - hemAt) < 0.004 || (sockC && Math.abs(y - 0.4) < 0.004)) continue;
      const q = legCol(y); push(y, q.k, q.c, q.r);
    }
    addLoft(sg, rl, LSEG, { capB: 0.01 });
  }
  /* skirt / dress or kanzu: weights follow each thigh on its own side so hems swing with the legs */
  if (dress || robe) {
    const top = robe ? 1.38 : 1.0, bottom = robe ? 0.08 : (L.long ? 0.12 : L.midi ? 0.3 : 0.34), col = robe ? shirtP : dressP, band = C(L.trim2 || (robe ? 0xf6f1e7 : 0x141838));
    const sys = hi ? [bottom, bottom + 0.03, bottom + 0.06, 0.3, 0.45, 0.6, 0.72, 0.82, 0.9, 0.96, 1.0, 1.1, 1.2, 1.3, 1.38].filter((y, i, a) => y >= bottom && y <= top && (i === 0 || y > a[i - 1])) : [bottom, 0.5, 0.75, 0.9, 1.0, 1.2, 1.38].filter(y => y >= bottom && y <= top);
    const sk = [], flare = L.long ? 1 : 0.9;
    for (const y of sys) {
      const [rx0, rz0, z0] = prof(TP, clamp(y, 0.9, 1.465)), k = y < 0.9 ? smooth((0.9 - y) / (0.9 - bottom + 1e-3)) : 0;
      const legW = y < 0.86 ? smooth(clamp((0.86 - y) / 0.45, 0, 1)) * 0.72 : 0;
      const wfn = (ca) => ca > 0 ? W('hips', 1 - legW * ca, 'thighL', legW * ca) : W('hips', 1 + legW * ca, 'thighR', -legW * ca);
      const rxh = Math.max(rx0 * (robe ? 1.07 : 1.06), y < 0.95 ? 0.19 : 0), rzh = Math.max(rz0 * (robe ? 1.1 : 1.08), y < 0.95 ? 0.14 : 0), kk = Math.sqrt(k);
      sk.push({ y, x: 0, z: z0 - 0.004 * k, rx: lerp(rxh, (robe ? 0.26 : 0.25) * flare, kk), rz: lerp(rzh, (robe ? 0.23 : 0.215) * flare, kk), wfn, col: (a, ca, sa, yy) => (yy < bottom + 0.05 && !robe && L.trim2 !== L.dress) ? band : shade(col, 0.94 + 0.06 * Math.sin(a * 9)), r: R_CLOTH });
    }
    // inner side too, so the hem is not see-through from below
    addLoft(sg, sk, SEG * 2 - 4, { both: true });
  }
  /* vest */
  if (L.vest && !robe) {
    const vc = C(L.vest), refl = C(0xd8dce2), vr = [];
    for (const y of (hi ? [1.0, 1.003, 1.06, 1.12, 1.135, 1.15, 1.2, 1.25, 1.265, 1.28, 1.33, 1.38, 1.41] : [1.0, 1.003, 1.13, 1.2, 1.27, 1.33, 1.41])) { const [rx, rz, z] = prof(TP, y), lipK = y < 1.002 ? 1.03 : 1.075; vr.push({ y, x: 0, z, rx: rx * lipK, rz: rz * lipK, w: wBlend(y, TW), col: (Math.abs(y - 1.135) < 0.018 || Math.abs(y - 1.265) < 0.018) ? refl : vc, r: (Math.abs(y - 1.135) < 0.018 || Math.abs(y - 1.265) < 0.018) ? 0.3 : R_CLOTH, sq: 2.4 }); }
    addLoft(sg, vr, SEG * 2 - 4);
  }
  /* arms */
  const AP = [[0.875, 0.026, 0.027], [0.895, 0.027, 0.028], [0.93, 0.030, 0.031], [0.98, 0.036, 0.037], [1.05, 0.040, 0.042], [1.10, 0.037, 0.041], [1.13, 0.036, 0.040], [1.16, 0.038, 0.042], [1.20, 0.041, 0.045], [1.27, 0.045, 0.049], [1.34, 0.050, 0.054], [1.40, 0.056, 0.060], [1.44, 0.058, 0.062], [1.47, 0.050, 0.055]];
  const sleeveK = longArm ? 1.12 : sleeveY < 1.2 ? 1.1 : 1.06;
  for (const [s, side] of [[1, 'L'], [-1, 'R']]) {
    const sh = RP['uArm' + side], el = RP['fArm' + side], wr = RP['hand' + side], ua = 'uArm' + side, fa = 'fArm' + side, hd = 'hand' + side, cl = 'clav' + side;
    const AW = [[0.885, W(fa, 0.5, hd, 0.5)], [0.91, W(fa, 1)], [1.105, W(fa, 1)], [1.165, W(ua, 1)], [1.40, W(ua, 1)], [1.445, W(ua, 0.7, cl, 0.3)], [1.47, W('chest', 0.5, ua, 0.5)]];
    const cx = (y) => y > el[1] ? lerp(el[0], sh[0], (y - el[1]) / (sh[1] - el[1])) : lerp(wr[0], el[0], (y - wr[1]) / (el[1] - wr[1]));
    const cz = (y) => y > el[1] ? lerp(el[2], sh[2], (y - el[1]) / (sh[1] - el[1])) : lerp(wr[2], el[2], (y - wr[1]) / (el[1] - wr[1]));
    const ys = hi ? AP.map(r => r[0]) : [0.875, 0.93, 1.05, 1.13, 1.2, 1.34, 1.44, 1.47];
    const ar = [], fm = f ? 0.9 : 1;
    const armCol = (y) => y >= sleeveY ? { c: (kit && y < sleeveY + 0.02) ? trim : shirtP, k: sleeveK, r: R_CLOTH } : { c: skin, k: 1, r: R_SKIN };
    const push = (y, k, c, r) => { const [rx, rz] = prof(AP, y); ar.push({ y, x: cx(y), z: cz(y), rx: rx * k * fm, rz: rz * k * fm, w: wBlend(y, AW), col: c, r }); };
    for (const y of ys) {
      if (Math.abs(y - sleeveY) < 0.006) continue;
      if (ar.length && ar[ar.length - 1].y < sleeveY && y > sleeveY) { push(sleeveY - 0.001, 1, skin, R_SKIN); const q = armCol(sleeveY + 0.001); push(sleeveY, q.k * (longArm ? 1.06 : 1.12), q.c, q.r); push(sleeveY + 0.012, q.k * 1.07, q.c, q.r); }
      const q = armCol(y); push(y, q.k, q.c, q.r);
    }
    addLoft(sg, ar, LSEG, { capB: 0.004 });
    // deltoid cap under the sleeve
    sg.add(new T.SphereGeometry(1, hi ? 14 : 8, hi ? 10 : 6), mat4(sh[0] - s * 0.016, 1.41, sh[2], 0, 0.05 * fm, 0.06, 0.055 * fm), sleeveY < 1.43 ? shirt : skin, W(ua, 0.75, cl, 0.25), sleeveY < 1.43 ? R_CLOTH : R_SKIN);
    /* hand */
    const hx = wr[0], hz = wr[2], hk = f ? 0.9 : 1, handCol = (v, n) => (n.x * -s > 0.35 ? palm : skin);
    if (hi) {
      sg.add(rb(0.03 * hk, 0.088 * hk, 0.078 * hk, 0.012), mat4(hx - s * 0.002, 0.838, hz + 0.004, 0), handCol, W(hd, 1), R_SKIN);
      const fz = [0.026, 0.009, -0.008, -0.024], fl = [0.054, 0.06, 0.056, 0.046];
      fz.forEach((z, k) => sg.add(capsule(0.0085 * hk, fl[k] * hk, 3, 6), mat4(hx - s * 0.006, 0.794 - fl[k] * hk / 2, hz + z * hk, 0, 1, 1, 1, 0.04 * (k - 1.5), -s * 0.28), handCol, W(hd, 1), R_SKIN));
      sg.add(capsule(0.0105 * hk, 0.036 * hk, 3, 6), mat4(hx - s * 0.012, 0.842, hz + 0.044 * hk, 0, 1, 1, 1, -0.55, -s * 0.35), handCol, W(hd, 1), R_SKIN);
    } else sg.add(rb(0.03 * hk, 0.15 * hk, 0.074 * hk, 0.014), mat4(hx - s * 0.004, 0.81, hz + 0.004, 0), skin, W(hd, 1), R_SKIN);
  }
  /* feet: sneakers, espadrilles, loafers, sandals or slides */
  const shoe = L.shoe || (L.sandals ? 'sandal' : 'sneaker');
  for (const [s, side] of [[1, 'L'], [-1, 'R']]) {
    const fx = RP['foot' + side][0] - s * 0.002, fw = W('foot' + side, 1), k = f ? 0.92 : 1;
    if (shoe === 'sandal' || shoe === 'slide') {
      sg.add(rb(0.084 * k, 0.045, 0.232 * k, 0.02), mat4(fx, 0.034, 0.05, 0), skin, fw, R_SKIN);
      sg.add(rb(0.096 * k, 0.014, 0.256 * k, 0.006), mat4(fx, 0.007, 0.052, 0), C(L.sole || (shoe === 'slide' ? 0x2a2a2e : 0x3a2a1e)), fw, 0.7);
      if (shoe === 'slide') sg.add(rb(0.1 * k, 0.03, 0.085, 0.012), mat4(fx, 0.05, 0.075, 0), shoeC, fw, 0.6);
      else { sg.add(rb(0.092 * k, 0.012, 0.034, 0.005), mat4(fx, 0.058, 0.08, 0), shoeC, fw, 0.6); if (hi) sg.add(rb(0.09 * k, 0.01, 0.022, 0.004), mat4(fx, 0.05, -0.025, 0), shoeC, fw, 0.6); }
      if (hi) for (let t = 0; t < 4; t++) sg.add(new T.SphereGeometry(0.009, 6, 4), mat4(fx + (t - 1.5) * 0.017 * s, 0.022, 0.165 * k - Math.abs(t - 1) * 0.006, 0), skin, fw, R_SKIN);
    } else if (shoe === 'espadrille' || shoe === 'loafer') {
      const esp = shoe === 'espadrille', sole = C(esp ? 0xc9a46a : 0x2e2018);
      sg.add(rb(0.094 * k, esp ? 0.03 : 0.018, 0.262 * k, 0.01), mat4(fx, esp ? 0.015 : 0.009, 0.05, 0), sole, fw, esp ? 0.95 : 0.6);
      sg.add(rb(0.088 * k, 0.05, 0.2 * k, 0.025), mat4(fx, esp ? 0.052 : 0.044, 0.03, 0), shoeC, fw, esp ? 0.9 : 0.42);
      sg.add(new T.SphereGeometry(1, hi ? 12 : 6, hi ? 8 : 4), mat4(fx, esp ? 0.042 : 0.036, 0.128 * k, 0, 0.045 * k, 0.03, 0.06 * k), shoeC, fw, esp ? 0.9 : 0.42);
      if (hi && !esp) sg.add(rb(0.07 * k, 0.008, 0.03, 0.003), mat4(fx, 0.073, 0.085, 0, 1, 1, 1, -0.25), shoeC.clone().multiplyScalar(0.6), fw, 0.5);
      if (hi && esp) for (let q = 0; q < 3; q++) sg.add(rb(0.096 * k, 0.003, 0.264 * k, 0.001), mat4(fx, 0.006 + q * 0.009, 0.05, 0), sole.clone().multiplyScalar(0.8), fw, 0.95);
    } else {
      sg.add(rb(0.098 * k, 0.026, 0.268 * k, 0.012), mat4(fx, 0.013, 0.05, 0), soleC, fw, 0.75);
      sg.add(rb(0.09 * k, 0.07, 0.2 * k, 0.03), mat4(fx, 0.058, 0.025, 0), shoeC, fw, 0.6);
      sg.add(new T.SphereGeometry(1, hi ? 12 : 6, hi ? 8 : 4), mat4(fx, 0.045, 0.128 * k, 0, 0.046 * k, 0.034, 0.062 * k), shoeC, fw, 0.6);
      if (hi) {
        sg.add(new T.TorusGeometry(0.037, 0.009, 5, 14), mat4(fx, 0.1, -0.012, 0, 1, 1, 1.1, Math.PI / 2), shoeC.clone().multiplyScalar(0.7), fw, 0.7);
        sg.add(rb(0.032, 0.007, 0.08, 0.003), mat4(fx, 0.094, 0.07, 0, 1, 1, 1, -0.32), C(0xf4f2ec), fw, 0.8);
        for (const q of [1, -1]) sg.add(box(0.004, 0.014, 0.12 * k), mat4(fx + q * 0.046 * k, 0.05, 0.03, 0, 1, 1, 1, 0, 0), L.shoeTrim ? C(L.shoeTrim) : soleC, fw, 0.6);
      }
    }
  }
  /* head and face */
  const hw = W('head', 1), hk = f ? 0.955 : 1;
  sg.add(headShell(hi ? 26 : 12, hi ? 20 : 9, 1, f), null, skin, hw, R_SKIN);
  sg.add(new T.SphereGeometry(1, hi ? 10 : 5, hi ? 8 : 4), mat4(0.087 * hk, 1.652, -0.004, 0.25, 0.012, 0.027, 0.019), skin.clone().multiplyScalar(0.94), hw, R_SKIN);
  sg.add(new T.SphereGeometry(1, hi ? 10 : 5, hi ? 8 : 4), mat4(-0.087 * hk, 1.652, -0.004, -0.25, 0.012, 0.027, 0.019), skin.clone().multiplyScalar(0.94), hw, R_SKIN);
  if (hi) {
    const nose = skin.clone().multiplyScalar(0.93);
    sg.add(capsule(0.0085, 0.04, 3, 8), mat4(0, 1.662, 0.105, 0, 1, 1, 1, 0.3), nose, hw, R_SKIN);
    sg.add(new T.SphereGeometry(1, 10, 8), mat4(0, 1.633, 0.112, 0, 0.0155, 0.013, 0.014), nose, hw, 0.45);
    for (const s of [1, -1]) sg.add(new T.SphereGeometry(1, 8, 6), mat4(0.0175 * s, 1.629, 0.103, 0, 0.0125, 0.0105, 0.012), nose, hw, R_SKIN);
    sg.add(new T.SphereGeometry(1, 12, 6), mat4(0, 1.6035, 0.1, 0, 0.025 * hk, 0.0078, 0.011), lip, hw, 0.38);
    sg.add(new T.SphereGeometry(1, 12, 6), mat4(0, 1.5895, 0.098, 0, 0.023 * hk, 0.0088, 0.0115), lip, hw, 0.38);
    sg.add(box(0.04 * hk, 0.0025, 0.004), mat4(0, 1.5967, 0.1055, 0), C(0x24120c), hw, 0.6);
    const eyeW = C(0xeee8dd), iris = C(L.iris || 0x2b190d);
    for (const s of [1, -1]) {
      const ex = EYE.x * s * hk;
      sg.add(new T.SphereGeometry(EYE.r, 12, 10), mat4(ex, EYE.y, EYE.z, 0), eyeW, hw, 0.12);
      sg.add(new T.SphereGeometry(1, 10, 6), mat4(ex, EYE.y, EYE.z + 0.0118, 0, 0.0084, 0.0084, 0.003), iris, hw, 0.08);
      sg.add(new T.SphereGeometry(1, 8, 4), mat4(ex, EYE.y, EYE.z + 0.0133, 0, 0.0041, 0.0041, 0.0012), C(0x050505), hw, 0.05);
      // eyelids: the upper lid rides its own bone for blinks; the lower one is fixed
      sg.add(new T.SphereGeometry(EYE.r * 1.12, 12, 6, 0, TAU, 0, 0.95), mat4(ex, EYE.y, EYE.z, 0, 1, 1, 1, 0.42), skin.clone().multiplyScalar(0.9), W(s > 0 ? 'lidL' : 'lidR', 1), R_SKIN);
      sg.add(new T.SphereGeometry(EYE.r * 1.1, 12, 4, 0, TAU, Math.PI - 0.62, 0.62), mat4(ex, EYE.y, EYE.z, 0, 1, 1, 1, -0.25), skin.clone().multiplyScalar(0.92), hw, R_SKIN);
      sg.add(rb(0.032, 0.0055, 0.009, 0.0025), mat4(0.037 * s * hk, 1.6915, 0.0975, 0, 1, 1, 1, 0.15, -s * 0.13), L.brow ? C(L.brow) : hairC, hw, 0.8);
    }
  } else {
    for (const s of [1, -1]) sg.add(new T.SphereGeometry(0.009, 5, 4), mat4(EYE.x * s, EYE.y, EYE.z + 0.006, 0), C(0x1a0f08), hw, 0.3);
    sg.add(new T.SphereGeometry(1, 6, 4), mat4(0, 1.633, 0.108, 0, 0.016, 0.014, 0.016), skin.clone().multiplyScalar(0.93), hw, R_SKIN);
  }
  /* hair and headwear */
  const hair = L.hair || 'short', hs = hi ? [24, 18] : [11, 8], jit = hairColorJitter(hairC);
  const shell = (sc, mask, col, rough, dy, dz) => sg.add(headShell(hs[0], hs[1], sc, f, dy, dz), null, col, hw, rough, unitMask(sc * (f ? 0.955 : 1), mask, dy, dz));
  if (hair === 'short' || hair === 'kofia' || hair === 'cap' || hair === 'police') shell(1.032, (X, Y, Z) => hairLine(X, Y, Z, hair === 'short' ? 0.42 : 0.3), jit, 0.85);
  if (hair === 'afro') {
    const g = headShell(hs[0], hs[1], 1.0, f), P = g.attributes.position;
    for (let i = 0; i < P.count; i++) { const x = P.getX(i) - HEAD.x, y = P.getY(i) - HEAD.y, z = P.getZ(i) - HEAD.z; const n = 1.24 + 0.05 * Math.sin(x * 160) * Math.sin(y * 140 + z * 120); P.setXYZ(i, HEAD.x + x * n, HEAD.y + 0.02 + y * n * 1.02, HEAD.z - 0.012 + z * n); }
    g.computeVertexNormals();
    sg.add(g, null, jit, hw, 0.95, (P2, a, b, c) => { const Y = ((P2.getY(a) + P2.getY(b) + P2.getY(c)) / 3 - HEAD.y - 0.02) / (HEAD.ry * 1.24), Z = ((P2.getZ(a) + P2.getZ(b) + P2.getZ(c)) / 3 - HEAD.z + 0.012) / (HEAD.rz * 1.24), X = ((P2.getX(a) + P2.getX(b) + P2.getX(c)) / 3) / (HEAD.rx * 1.24); return hairLine(X, Y, Z, 0.36); });
  }
  if (hair === 'braids') {
    shell(1.028, (X, Y, Z) => hairLine(X, Y, Z, 0.44), jit, 0.8);
    // cornrows: rows of plaits running from the hairline over the crown to the nape
    if (hi) for (let row = -3; row <= 3; row++) for (let k = 0; k < 10; k++) {
      const th = lerp(-1.15, 1.9, k / 9), X = row * 0.14 * Math.cos(th * 0.35), Y = Math.cos(th) * Math.sqrt(1 - X * X), Z = -Math.sin(th) * Math.sqrt(1 - X * X);
      const [sx, sy, sz] = sculptPoint(X, Y, Z);
      sg.add(new T.SphereGeometry(0.0105, 6, 4), mat4(HEAD.x + sx * HEAD.rx * 1.05 * hk, HEAD.y + sy * HEAD.ry * 1.05, HEAD.z + sz * HEAD.rz * 1.05, 0, 1, 0.75, 1.7, -th), hairC.clone().multiplyScalar(0.75), hw, 0.8);
    }
    sg.add(new T.SphereGeometry(0.052, hi ? 12 : 6, hi ? 10 : 5), mat4(0, 1.735, -0.085, 0, 1, 0.9, 1), jit, hw, 0.85);
  }
  if (hair === 'kofia') {
    const kc = C(0xf6f1e7), ac = C(L.kofiaCol || 0x1e9b57);
    const g = new T.CylinderGeometry(0.093 * hk, 0.097 * hk, 0.075, hi ? 32 : 12, hi ? 4 : 1, false);
    sg.add(g, mat4(0, 1.757, -0.004, 0), (v) => { const a = Math.atan2(v.z + 0.004, v.x), band = v.y < 1.775 && v.y > 1.735; return band && (Math.floor((a + Math.PI) / TAU * 16) % 2 === 0) ? ac : kc; }, hw, 0.9);
  }
  if (hair === 'cap') {
    const cc = C(L.cap || 0x141838);
    shell(1.065, (X, Y, Z) => Y > 0.22 - Math.max(0, -Z) * 0.18, cc, 0.8);
    sg.add(rb(0.17, 0.012, 0.095, 0.006), mat4(0, 1.708, 0.108, 0, 1, 1, 1, 0.16), cc.clone().multiplyScalar(0.85), hw, 0.8);
    if (hi) { sg.add(new T.SphereGeometry(0.008, 6, 4), mat4(0, 1.785, -0.002, 0), cc, hw, 0.8); sg.add(rb(0.04, 0.025, 0.004, 0.002), mat4(0, 1.75, 0.1, 0, 1, 1, 1, -0.4), C(L.capLogo || 0xf6f1e7), hw, 0.7); }
  }
  if (hair === 'police') {
    sg.add(new T.CylinderGeometry(0.118, 0.098, 0.075, hi ? 24 : 10), mat4(0, 1.775, -0.004, 0), C(0xf4f4f0), hw, 0.6);
    sg.add(new T.CylinderGeometry(0.1, 0.1, 0.022, hi ? 24 : 10), mat4(0, 1.748, -0.004, 0), C(0x111111), hw, 0.5);
    sg.add(rb(0.18, 0.01, 0.075, 0.005), mat4(0, 1.735, 0.098, 0, 1, 1, 1, 0.22), C(0x0d0d0d), hw, 0.3);
  }
  if (hair === 'bun' || hair === 'locs') shell(1.034, (X, Y, Z) => hairLine(X, Y, Z, 0.4), jit, 0.85);
  if (hair === 'bun') {
    sg.add(new T.SphereGeometry(0.055, hi ? 14 : 7, hi ? 10 : 5), mat4(0, 1.792, -0.05, 0, 1, 0.85, 1), jit, hw, 0.85);
    if (hi) sg.add(new T.TorusGeometry(0.032, 0.008, 5, 14), mat4(0, 1.76, -0.045, 0, 1, 1, 1, Math.PI / 2 - 0.5), hairC.clone().multiplyScalar(0.7), hw, 0.8);
  }
  if (hair === 'locs') {
    // locs fall from the crown to the shoulders, longest at the back, clear of the face
    const n = hi ? 26 : 10;
    for (let i = 0; i < n; i++) {
      const th = lerp(0.95, TAU - 0.95, i / (n - 1)), len = 0.14 + 0.1 * (0.5 - 0.5 * Math.cos(th)), y0 = 1.705, sx = Math.sin(th), sz = Math.cos(th);
      sg.add(capsule(hi ? 0.0115 : 0.02, len, hi ? 3 : 2, hi ? 6 : 4), mat4(sx * 0.1 * hk, y0 + 0.02 - len / 2, 0.004 + sz * 0.112, th, 1, 1, 1, -0.16), hairC.clone().multiplyScalar(0.85 + 0.25 * hash2(i, 7)), hw, 0.85);
    }
  }
  /* hats sit on whatever hair is under them */
  const hat = L.hat || (hair === 'hat' ? 'panama' : '');
  if (hat) {
    const big = hair === 'afro' ? 1.2 : hair === 'scarf' ? 1.1 : (hair === 'locs' || hair === 'bun' || hair === 'braids') ? 1.04 : 1, up = hair === 'afro' ? 0.05 : hair === 'scarf' ? 0.014 : hair === 'bun' ? 0.01 : 0;
    const hc = C(L.hatCol || (hat === 'panama' || hat === 'sunhat' ? 0xe8d8b0 : 0x141838)), cy = 1.772 + up, hseg = hi ? 24 : 10;
    if (hat === 'panama' || hat === 'sunhat') {
      const brim = hat === 'sunhat' ? 0.235 : 0.18, straw = (v) => hc.clone().multiplyScalar(0.92 + 0.08 * Math.sin(Math.atan2(v.z, v.x) * 40 + Math.hypot(v.x, v.z) * 300));
      sg.add(new T.CylinderGeometry(0.088 * big, 0.11 * big, 0.1, hseg), mat4(0, cy, -0.004, 0), hi ? straw : hc, hw, 0.92);
      sg.add(new T.CylinderGeometry(brim * big, brim * big, 0.01, hi ? 32 : 12), mat4(0, cy - 0.045, -0.004, 0), hi ? straw : hc, hw, 0.92);
      sg.add(new T.CylinderGeometry(0.111 * big, 0.111 * big, 0.024, hseg), mat4(0, cy - 0.027, -0.004, 0), C(hat === 'sunhat' ? 0xf6f3ec : 0x2a1d14), hw, 0.8);
    } else if (hat === 'bucket') {
      sg.add(new T.CylinderGeometry(0.094 * big, 0.108 * big, 0.085, hseg), mat4(0, cy - 0.005, -0.004, 0), hc, hw, 0.92);
      sg.add(new T.CylinderGeometry(0.11 * big, 0.168 * big, 0.05, hseg), mat4(0, cy - 0.065, -0.004, 0), hc.clone().multiplyScalar(0.94), hw, 0.92);
    } else if (hat === 'cap') {
      const cc = C(L.cap || L.hatCol || 0x141838);
      shell(1.065 * big, (X, Y, Z) => Y > 0.22 - Math.max(0, -Z) * 0.18, cc, 0.8, up);
      sg.add(rb(0.17, 0.012, 0.095, 0.006), mat4(0, 1.708 + up, 0.108 * big, 0, 1, 1, 1, 0.16), cc.clone().multiplyScalar(0.85), hw, 0.8);
      if (hi) { sg.add(new T.SphereGeometry(0.008, 6, 4), mat4(0, 1.785 + up * 1.4, -0.002, 0), cc, hw, 0.8); sg.add(rb(0.04, 0.025, 0.004, 0.002), mat4(0, 1.75 + up, 0.1 * big, 0, 1, 1, 1, -0.4), C(L.capLogo || 0xf6f1e7), hw, 0.7); }
    } else if (hat === 'kofia') {
      const kc = C(0xf6f1e7), ac = C(L.kofiaCol || L.hatCol || 0x1e9b57);
      sg.add(new T.CylinderGeometry(0.093 * hk * big, 0.097 * hk * big, 0.075, hi ? 32 : 12, hi ? 4 : 1, false), mat4(0, 1.757 + up, -0.004, 0), (v) => { const a = Math.atan2(v.z + 0.004, v.x), band = v.y < 1.775 + up && v.y > 1.735 + up; return band && (Math.floor((a + Math.PI) / TAU * 16) % 2 === 0) ? ac : kc; }, hw, 0.9);
    }
  }
  /* sunglasses */
  if (L.eye) {
    const ex = EYE.x * hk, ey = 1.668, ez = 0.107, lens = C(L.eye === 'round' ? 0x3a2414 : 0x0c1014), frame = C(L.eye === 'shades' ? 0x15161c : 0xc8a050);
    if (hi) {
      for (const s of [1, -1]) {
        if (L.eye === 'shades') sg.add(rb(0.036, 0.022, 0.006, 0.006), mat4(ex * s, ey, ez, s * 0.14), lens, hw, 0.06);
        else if (L.eye === 'round') { sg.add(new T.SphereGeometry(1, 12, 6), mat4(ex * s, ey, ez, s * 0.14, 0.0165, 0.0165, 0.004), lens, hw, 0.06); sg.add(new T.TorusGeometry(0.0168, 0.0022, 4, 16), mat4(ex * s, ey, ez, s * 0.14), frame, hw, 0.3); }
        else { sg.add(new T.SphereGeometry(1, 12, 6), mat4(ex * s, ey - 0.003, ez, s * 0.14, 0.019, 0.016, 0.004), lens, hw, 0.06); sg.add(new T.TorusGeometry(0.018, 0.0018, 4, 16), mat4(ex * s, ey - 0.003, ez, s * 0.14, 1.05, 0.9, 1), frame, hw, 0.3); }
        sg.add(box(0.004, 0.005, 0.1), mat4(0.087 * s * hk, ey + 0.004, 0.055, 0), frame, hw, 0.4);
      }
      sg.add(box(0.026, 0.004, 0.004), mat4(0, ey + 0.009, ez + 0.002, 0), frame, hw, 0.3);
      if (L.eye === 'shades') sg.add(box(0.105, 0.006, 0.006), mat4(0, ey + 0.012, ez - 0.001, 0), frame, hw, 0.3);
    } else sg.add(box(0.085, 0.02, 0.01), mat4(0, ey, ez - 0.003, 0), lens, hw, 0.1);
  }
  if (hair === 'scarf') {
    const sc = C(L.scarf || 0xf3b41b), fold = (v) => sc.clone().multiplyScalar(0.9 + 0.1 * Math.sin(Math.atan2(v.z, v.x) * 7 + v.y * 40));
    shell(1.1, (X, Y, Z) => !(Z > 0.2 && Math.abs(X) < 0.66 && Y > -0.74 && Y < 0.52), fold, 0.88, -0.004, -0.006);
    const at = (y) => { const [rx, rz, z] = prof(TP, y); return { rx: rx * 1.09, rz: rz * 1.1, z, fb: bustF(y) * 1.12 + 0.006 }; };
    const capeCol = (a) => sc.clone().multiplyScalar(0.88 + 0.12 * Math.sin(a * 7));
    const dr = [];
    for (const [y, fy] of [[1.372, 0.16], [1.375, 0.16], [1.40, 0.1], [1.425, 0.045]]) { const q = at(y); dr.push({ y, x: 0, z: q.z, rx: q.rx * (y < 1.374 ? 0.97 : 1), rz: q.rz * (y < 1.374 ? 0.97 : 1), fb: q.fb, fy, sq: 2.5, at: y < 1.374 ? (yy) => { const r = at(yy); r.rx *= 0.97; r.rz *= 0.97; return r; } : at, w: wBlend(y - fy * 0.5, TW), col: capeCol, r: 0.88 }); }
    for (const [y, rx, rz, z, w] of [[1.465, 0.112, 0.098, 0.0, W('chest', 0.5, 'neck', 0.5)], [1.52, 0.08, 0.086, 0.008, W('neck', 0.6, 'head', 0.4)], [1.565, 0.08, 0.09, 0.012, W('head', 1)]]) dr.push({ y, x: 0, z, rx: rx * hk, rz: rz * hk, w, col: capeCol, r: 0.88 });
    addLoft(sg, dr, SEG * 2 - 6);
  }
  if (L.beard) {
    const bc = C(L.beard), bj = hairColorJitter(bc);
    shell(1.03, (X, Y, Z) => ((Y < -0.3 && Z > -0.25) || (Y < -0.08 && Math.abs(X) > 0.62 && Z > -0.15 && Z < 0.7)) && !(Math.abs(X) < 0.32 && Y > -0.62 && Z > 0.6), bj, 0.9);
    if (hi) sg.add(rb(0.044, 0.008, 0.012, 0.004), mat4(0, 1.6115, 0.104, 0, 1, 1, 1, 0.2), bc, hw, 0.9);
  }
  return sg.build();
}

/* per-vertex roughness: one shared material, glossy eyes and lips, matte cloth */
const charMat = new T.MeshStandardMaterial({ vertexColors: true, skinning: true, roughness: 0.7, metalness: 0 });
charMat.onBeforeCompile = (sh) => {
  sh.uniforms.uPat = { value: PAT_TEX };
  sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute float aRough;\nvarying float vRough;\nattribute float aPat;\nattribute vec4 aPuv;\nvarying float vPat;\nvarying vec4 vPuv;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvRough = aRough; vPat = aPat; vPuv = aPuv;');
  // printed cloth: the print's own colours over the garment colour, shaded like the cloth under it
  sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying float vRough;\nvarying float vPat;\nvarying vec4 vPuv;\nuniform sampler2D uPat;').replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = vRough;')
    .replace('#include <color_fragment>', '#include <color_fragment>\nif (vPat > 0.5) { float pid = floor(vPat + 0.5) - 1.0; vec2 tl = vec2(mod(pid, 4.0), floor(pid / 4.0)); vec4 pc = texture2D(uPat, (tl + 0.006 + fract(vPuv.xy) * 0.988) * 0.25); diffuseColor.rgb = mix(diffuseColor.rgb, pow(pc.rgb, vec3(2.2)) * vPuv.z, pc.a * vPuv.w); }');
};
const numberTexCache = new Map();
function numberTex(n, col) {
  const key = n + col;
  if (!numberTexCache.has(key)) { const c = mkCanvas(64, 64), x = c.getContext('2d'); x.fillStyle = col; x.textAlign = 'center'; x.textBaseline = 'middle'; x.font = `900 52px ${FONT_D}`; x.fillText(String(n), 32, 35); numberTexCache.set(key, texOf(c, { clamp: true })); }
  return numberTexCache.get(key);
}
function makeHuman(look) {
  look = Object.assign({}, look || {});
  if (look.f === undefined) look.f = look.hair === 'scarf' || look.hair === 'braids' || !!look.dress;
  /* modest dress for women: dresses reach the ankle; with no dress or robe, full-length trousers (also under a football kit) */
  if (look.f) { if (look.dress) { if (!look.midi) look.long = true; } else if (!look.robe) { look.pants = true; if (look.plen !== undefined) look.plen = Math.min(look.plen, 0.3); } }
  const RP = rigPoints(look.f), bones = [];
  for (const name of BONES) {
    const bn = new T.Bone(); bn.name = name; const p = RP[name], par = BONE_PARENT[name];
    if (par) { const q = RP[par]; bn.position.set(p[0] - q[0], p[1] - q[1], p[2] - q[2]); bones[BONE[par]].add(bn); } else bn.position.set(p[0], p[1], p[2]);
    bones.push(bn);
  }
  const body = new T.Group(); body.add(bones[0]); body.updateMatrixWorld(true);
  const skel = new T.Skeleton(bones);
  const mk = (hi) => { const m = new T.SkinnedMesh(buildBody(look, hi), charMat); m.bind(skel, new T.Matrix4()); m.castShadow = true; m.receiveShadow = true; m.frustumCulled = true; body.add(m); return m; };
  // the detailed mesh is built the first time the person comes near the camera (a couple per frame at most)
  const loM = mk(false), hiM = look.eager ? mk(true) : null; if (hiM) loM.visible = false;
  if (look.h) body.scale.setScalar(look.h); else if (look.f) body.scale.setScalar(0.955);
  const g = new T.Group(); g.add(body);
  const b = {}; for (const k of BONES) b[k] = bones[BONE[k]];
  if (look.number) {
    const nm = new T.Mesh(new T.PlaneGeometry(0.17, 0.17), new T.MeshBasicMaterial({ map: numberTex(look.number, look.numCol || '#f7ead0'), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }));
    nm.position.set(0, 0.055, -0.104); nm.rotation.y = Math.PI; b.chest.add(nm);
    const fn = new T.Mesh(new T.PlaneGeometry(0.055, 0.055), nm.material); fn.position.set(-0.07, 0.075, look.f ? 0.128 : 0.114); b.chest.add(fn);
  }
  g.userData = { mesh: body, hiM, loM, b, look, mk, phase: rnd() * TAU, emote: null, emoteT: 0, fall: null, air: 0, sp: 0, gw: 0, pv: 0, acc: 0, yawRate: 0, prevYaw: null, land: 0, airW: 0, shift: 0, shiftT: 0, shiftS: 1, blinkT: rr(1, 4), ly: 0, lp: 0, lookAt: null, idleYaw: 0, idleYawT: 0, carry: '', steer: 0 };
  return g;
}

/* ---------- animation ---------- */
const EMOTE_LEN = { phone: 900, wave: 2.4, dance: 4, cheer: 2.4, hi5: 1.4, drink: 2.2, tackle: 0.7, shrug: 1.6, clap: 2.2, point: 1.8, talk: 3.2, kick: 0.7 };
function playEmote(h, e) { if (!h) return; h.userData.emote = e; h.userData.emoteT = 0; }
const _ikM = new T.Matrix4(), _ikQ = new T.Quaternion(), _ikE = new T.Euler(), _ikV = new T.Vector3(), _ikS = new T.Vector3(1, 1, 1), _ft = [{ x: 0, y: 0, z: 0, p: 0 }, { x: 0, y: 0, z: 0, p: 0 }];
function legIK(b, side, tx, ty, tz, pitch) {
  const th = side > 0 ? b.thighL : b.thighR, sh = side > 0 ? b.shinL : b.shinR, ft = side > 0 ? b.footL : b.footR, hp = b.hips;
  _ikE.set(hp.rotation.x, hp.rotation.y, hp.rotation.z); _ikQ.setFromEuler(_ikE); _ikM.compose(hp.position, _ikQ, _ikS).invert();
  _ikV.set(tx, ty, tz).applyMatrix4(_ikM).sub(th.position);
  let d = _ikV.length(); const L = LEG1 + LEG2;
  if (d > L * 0.9995) { _ikV.multiplyScalar(L * 0.9995 / d); d = L * 0.9995; } else if (d < 0.2) { _ikV.multiplyScalar(0.2 / Math.max(d, 1e-4)); d = 0.2; }
  const nx = _ikV.x / d, ny = _ikV.y / d, nz = _ikV.z / d, rz = Math.asin(clamp(nx, -1, 1)), rx = Math.atan2(-nz, -ny);
  const a1 = Math.acos(clamp((LEG1 * LEG1 + d * d - LEG2 * LEG2) / (2 * LEG1 * d), -1, 1)), kb = Math.PI - Math.acos(clamp((LEG1 * LEG1 + LEG2 * LEG2 - d * d) / (2 * LEG1 * LEG2), -1, 1));
  th.rotation.set(rx - a1, -hp.rotation.y * 0.6, rz);
  sh.rotation.set(kb, 0, 0);
  ft.rotation.set(pitch - (hp.rotation.x + rx - a1 + kb), 0, -(rz + hp.rotation.z) * 0.8);
}
function setR(bn, x, y, z) { bn.rotation.set(x, y, z); }
function blendR(bn, x, y, z, w) { const r = bn.rotation; r.x += (x - r.x) * w; r.y += (y - r.y) * w; r.z += (z - r.z) * w; }
const hiBudget = { f: -1, n: 2 };
function humanLOD(h) {
  const u = h.userData, e = h.matrixWorld.elements, dx = e[12] - camera.position.x, dy = e[13] - camera.position.y, dz = e[14] - camera.position.z, d2 = dx * dx + dy * dy + dz * dz;
  let near = d2 < (u.lodFar || 30) * (u.lodFar || 30);
  if (near && !u.hiM) { const fr = renderer.info.render.frame; if (fr !== hiBudget.f) { hiBudget.f = fr; hiBudget.n = 2; } if (hiBudget.n > 0) { hiBudget.n--; u.hiM = u.mk(true); } else near = false; }
  if (u.hiM) u.hiM.visible = near; u.loM.visible = !near;
  return d2;
}
function headLook(h, u, b, dt, t, idle) {
  let ty = 0, tp = 0;
  if (u.lookAt) {
    const e = h.matrixWorld.elements, hx = e[12], hy = e[13] + 1.6, hz = e[14];
    let yaw = h.rotation.y; if (h.parent && h.parent !== scene) yaw += h.parent.rotation.y;
    const dx = u.lookAt.x - hx, dz = u.lookAt.z - hz, dist = Math.hypot(dx, dz);
    if (dist > 0.3) { ty = angWrap(Math.atan2(dx, dz) - yaw); tp = Math.atan2(u.lookAt.y - hy, dist); }
    if (Math.abs(ty) > 1.9) ty = 0;
  } else if (idle) {
    u.idleYawT -= dt; if (u.idleYawT < 0) { u.idleYawT = rr(2.5, 6); u.idleYaw = rnd() < 0.35 ? 0 : rr(-0.8, 0.8); }
    ty = u.idleYaw;
  }
  ty = clamp(ty, -1.15, 1.15); tp = clamp(tp, -0.35, 0.45);
  u.ly = damp(u.ly, ty, 5, dt); u.lp = damp(u.lp, tp, 5, dt);
  b.neck.rotation.y += u.ly * 0.4; b.head.rotation.y += u.ly * 0.6; b.head.rotation.x -= u.lp * 0.7; b.neck.rotation.x -= u.lp * 0.3;
  // blink
  u.blinkT -= dt;
  let lid = 0; if (u.blinkT < 0) { const k = -u.blinkT / 0.14; lid = k < 1 ? Math.sin(k * Math.PI) : 0; if (k >= 1) u.blinkT = rr(2, 5.5) * (rnd() < 0.15 ? 0.15 : 1); }
  b.lidL.rotation.x = b.lidR.rotation.x = lid * 0.95 - Math.max(0, u.lp) * 0.25;
}
function poseSeat(u, b, mode, t, dt) {
  const ride = mode === 'ride', pass = mode === 'pass';
  b.hips.position.set(0, HIPS_Y, 0);
  setR(b.spine, ride ? 0.22 : 0.06, 0, 0); setR(b.chest, ride ? 0.1 : 0.02, -u.steer * 0.2, 0);
  for (const s of [1, -1]) {
    const L = s > 0 ? 'L' : 'R';
    setR(b['thigh' + L], ride ? -1.15 : -1.48, 0, (ride ? 0.24 : 0.08) * s);
    setR(b['shin' + L], ride ? 1.35 : 1.5, 0, 0);
    setR(b['foot' + L], ride ? -0.15 : 0.02, 0, -0.1 * s);
    if (pass) { setR(b['clav' + L], 0, 0, 0); setR(b['uArm' + L], -0.4, 0, 0.12 * s); setR(b['fArm' + L], -1.15, 0, 0); setR(b['hand' + L], 0, 0, -0.2 * s); }
    else {
      const st = u.steer * s * 0.18;
      setR(b['clav' + L], 0, 0, 0.04 * s); setR(b['uArm' + L], (ride ? -1.0 : -0.95) - st, 0, (ride ? 0.3 : 0.18) * s); setR(b['fArm' + L], ride ? -0.35 : -0.55, 0, 0); setR(b['hand' + L], -0.15, 0, -0.35 * s);
    }
  }
  setR(b.neck, ride ? -0.15 : -0.04, 0, 0); setR(b.head, ride ? -0.12 : -0.02, Math.sin(t * 0.4 + u.phase) * 0.12, 0);
}
/* animation level of detail: people far away or behind the camera are posed less often (with the time they missed) */
const CAMF = { x: 0, z: 1 };
function updateCamF() { const e = camera.matrixWorld.elements; const x = -e[8], z = -e[10], l = Math.hypot(x, z) || 1; CAMF.x = x / l; CAMF.z = z / l; }
function animStep(o, x, z, dt) {
  const dx = x - camera.position.x, dz = z - camera.position.z, d2 = dx * dx + dz * dz;
  let n = d2 < 900 ? 1 : d2 < 6400 ? 2 : d2 < 22500 ? 3 : 5;
  if (d2 > 225 && dx * CAMF.x + dz * CAMF.z < -6) n = 8;
  o._aAcc = (o._aAcc || 0) + dt; o._aN = ((o._aN === undefined ? Math.floor(Math.random() * 8) : o._aN) + 1) % 840;
  if (o._aN % n) return 0;
  const a = o._aAcc; o._aAcc = 0; return a;
}
function animHuman(h, dt, t, speed, mode) {
  const u = h.userData, b = u.b;
  const d2 = humanLOD(h);
  for (const k of BONES) if (k !== 'root') b[k].rotation.set(0, 0, 0);
  dt = Math.min(dt, 0.25);
  if (mode === 'lounge') {
    b.hips.position.set(0, HIPS_Y, 0);
    setR(b.spine, -0.95, 0, 0); setR(b.chest, -0.12, 0, 0); setR(b.neck, 0.45, 0, 0); setR(b.head, 0.35, 0, 0);
    for (const s of [1, -1]) { const L = s > 0 ? 'L' : 'R'; setR(b['thigh' + L], -1.42, 0, 0.06 * s); setR(b['shin' + L], s > 0 ? 0.12 : 0.45, 0, 0); setR(b['foot' + L], 0.5, 0, 0); setR(b['uArm' + L], 0.25, 0, 0.42 * s); setR(b['fArm' + L], -0.5, 0, 0); }
    u.ly = 0; headLook(h, u, b, dt, t, true); applyEmote(h, dt);
    return;
  }
  if (mode === 'sit' || mode === 'ride' || mode === 'pass') { poseSeat(u, b, mode, t, dt); headLook(h, u, b, dt, t, false); applyEmote(h, dt); return; }

  /* ---- locomotion: smoothed speed, yaw rate, acceleration ---- */
  const yaw = h.rotation.y, fem = !!(u.look && u.look.f);
  if (u.prevYaw === null) u.prevYaw = yaw;
  const yr = dt > 0 ? angWrap(yaw - u.prevYaw) / dt : 0; u.prevYaw = yaw;
  u.yawRate = damp(u.yawRate, clamp(yr, -12, 12), 8, dt);
  const v = u.sp = damp(u.sp, speed, 12, dt);
  u.acc = damp(u.acc, dt > 0 ? (v - u.pv) / dt : 0, 6, dt); u.pv = v;
  const turnStep = v < 0.4 && Math.abs(u.yawRate) > 1.4 ? 0.9 : 0;
  const ve = Math.max(v, turnStep);
  /* gait: walking below about 2.4 m/s, running above 3.8, blended between.
     Cadence and stride follow human data: a 1.4 m/s walk is ~110 steps a minute, a 4 m/s run ~180, a sprint ~200. */
  const runW = smooth(clamp((ve - 2.4) / 1.4, 0, 1)), sprintW = clamp((ve - 4.2) / 3.2, 0, 1);
  const freq = lerp(0.5 + 0.3 * Math.min(ve, 2.6), 1.24 + 0.062 * ve, runW);
  const S = (turnStep && v < 0.4 ? 0.3 : ve / freq);
  const betaW = 0.62, betaR = lerp(0.36, 0.28, sprintW), beta = lerp(betaW, betaR, runW);
  if (ve > 0.05) u.phase = (u.phase + TAU * freq * dt) % TAU;
  u.gw = damp(u.gw, ve > 0.12 ? 1 : 0, ve > 0.12 ? 9 : 5, dt);
  const gw = u.gw, mv = Math.min(1, ve / 0.9);
  // air and landing
  const inAir = u.air > 0.03;
  if (u.wasAir && !inAir) u.land = 1;
  u.wasAir = inAir; u.land = Math.max(0, u.land - dt * 4.5); u.airW = damp(u.airW, inAir ? 1 : 0, inAir ? 12 : 16, dt);
  // idle weight shift
  u.shiftT -= dt; if (u.shiftT < 0) { u.shiftT = rr(3, 7); u.shiftS = -u.shiftS; }
  u.shift = damp(u.shift, u.shiftS * (1 - gw), 1.6, dt);

  /* ---- pelvis: rises over the standing leg when walking (and dips into it when running), shifts toward it, drops on the free side ---- */
  const ph = u.phase, msPh = beta * Math.PI, side1 = Math.cos(ph - msPh), k2 = Math.cos(2 * (ph - msPh));
  const bob = lerp(0.017, -0.032 - 0.012 * sprintW, runW) * k2 * gw * mv;
  const hipsY = HIPS_Y - lerp(0.016, 0.05 + 0.02 * sprintW, runW) * gw + bob - 0.09 * Math.sin(u.land * Math.PI) - 0.008 * Math.abs(u.shift) + Math.sin(t * 1.7 + u.phase) * 0.003 * (1 - gw);
  const swayX = lerp(fem ? 0.026 : 0.021, 0.006, runW) * side1 * gw * mv + 0.028 * u.shift;
  const lean = lerp(0.03, 0.13 + 0.09 * sprintW, runW) * gw + clamp(u.acc * 0.03, -0.12, 0.2);
  b.hips.position.set(swayX, hipsY, -0.025 * runW * gw);
  const hyaw = -lerp(fem ? 0.1 : 0.085, 0.17, runW) * Math.cos(ph) * gw * mv;
  const bank = clamp(u.yawRate * v * 0.03, -0.32, 0.32);
  const drop = lerp(fem ? 0.06 : 0.04, 0.025, runW) * side1 * gw * mv;
  b.hips.rotation.set(0.02 + lean * 0.35, hyaw, drop + 0.04 * u.shift - bank);
  b.spine.rotation.set(lean * 0.65, -hyaw * 0.5, bank * 0.3 - drop * 0.6);
  b.chest.rotation.set(0.01 * runW + Math.sin(t * 1.7 + u.phase) * 0.016 * (1 - gw), -hyaw * 0.85, -drop * 0.35);
  // the head stays level and looks where the person is going, whatever the hips and shoulders do
  const pitchSum = b.hips.rotation.x + b.spine.rotation.x + b.chest.rotation.x, yawSum = hyaw * (1 - 0.5 - 0.85), rollSum = b.hips.rotation.z + b.spine.rotation.z + b.chest.rotation.z;
  b.neck.rotation.set(-pitchSum * 0.4 + 0.06, -yawSum * 0.55, -rollSum * 0.5);
  b.head.rotation.set(-pitchSum * 0.45 + 0.14 + 0.04 * runW, -yawSum * 0.45, -rollSum * 0.4);

  /* ---- feet: planted feet slide back under the body at exactly the walking speed (no skating);
     a walking foot rolls heel to toe, a running foot kicks up behind and is driven forward by the knee ---- */
  const legX = fem ? 0.058 : 0.07;
  for (let i = 0; i < 2; i++) {
    const side = i === 0 ? 1 : -1, F = _ft[i];
    const q = (ph / TAU + (i === 0 ? 0 : 0.5)) % 1;
    // walking
    let zw, yw, pw;
    { const z0 = 0.42 * betaW * S, z1 = -0.58 * betaW * S;
      if (q < betaW) { const k = q / betaW; zw = lerp(z0, z1, k); pw = -0.26 * (1 - smooth(clamp(k * 5, 0, 1))) + smooth(clamp((k - 0.55) / 0.45, 0, 1)) * 0.62; yw = Math.max(0, Math.sin(pw)) * 0.115 + Math.max(0, -pw) * 0.03; }
      else { const k = (q - betaW) / (1 - betaW); zw = lerp(z1, z0, smooth(k)); yw = Math.sin(Math.PI * Math.pow(k, 0.75)) * (0.075 + 0.02 * ve) + (1 - smooth(clamp(k * 3, 0, 1))) * 0.07; pw = lerp(0.62, -0.26, smooth(clamp(k * 1.25, 0, 1))); }
    }
    // running
    let zr, yr2, pr;
    { const z0 = 0.26 * betaR * S, z1 = -0.74 * betaR * S, Hk = lerp(0.3, 0.5, sprintW);
      if (q < betaR) { const k = q / betaR; zr = lerp(z0, z1, k); pr = lerp(-0.05, 0.05, k) + smooth(clamp((k - 0.5) / 0.5, 0, 1)) * 0.85; yr2 = Math.max(0, Math.sin(pr)) * 0.1; }
      else {
        const k = (q - betaR) / (1 - betaR);
        // stays back while the heel rises, then sweeps forward and reaches a little past the landing spot before pawing back
        const e = smooth(clamp((k - 0.14) / 0.66, 0, 1)), reach = Math.sin(Math.PI * clamp((k - 0.6) / 0.4, 0, 1)) * 0.07 * S * betaR;
        zr = lerp(z1, z0, e) + reach - Math.sin(Math.PI * clamp(k / 0.3, 0, 1)) * 0.05;
        // heel up behind, held while the knee drives through, then a late drop onto the ground
        yr2 = Hk * smooth(clamp(k / 0.3, 0, 1)) * (1 - smooth(clamp((k - 0.72) / 0.28, 0, 1))) * (1 - 0.35 * smooth(clamp((k - 0.3) / 0.4, 0, 1))) + 0.05 * (1 - smooth(clamp(k * 4, 0, 1)));
        pr = k < 0.3 ? lerp(0.85, 1.25, smooth(k / 0.3)) : lerp(1.25, -0.08, smooth(clamp((k - 0.3) / 0.55, 0, 1)));
      }
    }
    const z = lerp(zw, zr, runW), lift = lerp(yw, yr2, runW), pitch = lerp(pw, pr, runW);
    const swingQ = q >= lerp(betaW, betaR, runW);
    const gx = side * lerp(legX, 0.052, runW) + (swingQ ? side * 0.012 * Math.sin(Math.PI * (q - beta) / Math.max(0.05, 1 - beta)) : 0);
    const idleFree = (u.shift * side < 0 ? 1 : 0) * Math.abs(u.shift);
    const ix = side * 0.112 + side * 0.02 * idleFree, iz = side * 0.018 + 0.06 * idleFree;
    F.x = lerp(ix, gx, gw); F.z = lerp(iz, z * mv, gw); F.y = ANKLE_Y + lift * gw * Math.max(mv, 0.6); F.p = pitch * gw * mv;
    // airborne: tuck
    if (u.airW > 0.01) { const aw = u.airW; F.y = lerp(F.y, ANKLE_Y + (i === 0 ? 0.3 : 0.18), aw); F.z = lerp(F.z, i === 0 ? 0.12 : -0.12, aw); F.p = lerp(F.p, 0.35, aw); }
  }
  for (let i = 0; i < 2; i++) { const F = _ft[i]; legIK(b, i === 0 ? 1 : -1, F.x, F.y, F.z, F.p); }

  /* ---- arms: hang relaxed and swing from the shoulder against the legs; running arms bend to ~90 degrees and pump ---- */
  const aw = lerp(0.2 + 0.05 * Math.min(ve, 1.8), 0.62 + 0.25 * sprintW, runW) * gw * mv;
  for (const s of [1, -1]) {
    const L = s > 0 ? 'L' : 'R', c = Math.cos(ph) * s, fwd = Math.max(0, -c);
    const sw = aw * c - lerp(0.04, 0.12, runW) * gw;
    const breath = Math.sin(t * 1.7 + u.phase) * 0.012 * (1 - gw);
    b['clav' + L].rotation.set(0, aw * c * 0.1, (0.02 + 0.03 * runW * gw + breath) * s);
    b['uArm' + L].rotation.set(sw, -lerp(0.04, 0.3, runW * gw) * s, (lerp(fem ? 0.1 : 0.085, 0.16 - 0.1 * fwd, runW * gw) + u.airW * 0.6) * s - b.hips.rotation.z * 0.3);
    b['fArm' + L].rotation.set(-(lerp(0.2 + 0.1 * fwd * gw, 1.35 + 0.3 * fwd - 0.2 * (1 - fwd) * sprintW, runW * gw) + (fem ? 0.05 : 0)), 0, 0);
    b['hand' + L].rotation.set(lerp(0.05, -0.2, runW), 0, -lerp(0.15, 0.05, runW) * s);
  }
  if (u.carry) { b.uArmR.rotation.set(-0.4, 0, -2.55); b.fArmR.rotation.set(-0.15, 0, -1.2); b.handR.rotation.set(0, 0, -0.6); b.chest.rotation.x -= 0.03; b.neck.rotation.x = 0; b.head.rotation.x = 0; }
  headLook(h, u, b, dt, t, gw < 0.3 && !u.carry);
  if (d2 < 3600) applyEmote(h, dt); else if (u.emote) { u.emoteT += dt; if (u.emoteT > EMOTE_LEN[u.emote]) u.emote = null; }
}
function applyEmote(h, dt) {
  const u = h.userData, b = u.b;
  if (!u.emote) return;
  u.emoteT += dt;
  const e = u.emote, k = u.emoteT, len = EMOTE_LEN[e] || 2;
  if (k > len) { u.emote = null; return; }
  const w = smooth(clamp(k / 0.16, 0, 1)) * smooth(clamp((len - k) / 0.22, 0, 1));
  if (e === 'wave') { blendR(b.clavR, 0, 0, -0.25, w); blendR(b.uArmR, -0.15, 0, -2.5, w); blendR(b.fArmR, -0.2, 0, -0.25 + Math.sin(k * 10) * 0.45, w); blendR(b.handR, 0, 0, Math.sin(k * 10 + 0.6) * 0.3, w); blendR(b.head, b.head.rotation.x, 0, 0.08, w * 0.5); }
  else if (e === 'cheer') { for (const s of [1, -1]) { const L = s > 0 ? 'L' : 'R'; blendR(b['clav' + L], 0, 0, 0.25 * s, w); blendR(b['uArm' + L], -0.2, 0, 2.7 * s, w); blendR(b['fArm' + L], -0.3, 0, 0.2 * s, w); blendR(b['hand' + L], 0, 0, 0.3 * s, w); } b.hips.position.y += Math.abs(Math.sin(k * 6)) * 0.16 * w; blendR(b.head, -0.25, 0, 0, w); }
  else if (e === 'hi5') { blendR(b.clavR, 0, 0, -0.15, w); blendR(b.uArmR, -2.45, 0, -0.15, w); blendR(b.fArmR, -0.2, 0, 0, w); blendR(b.handR, -0.3, 0, 0, w); blendR(b.chest, 0.05, 0.25, 0, w); }
  else if (e === 'drink') { blendR(b.uArmR, -0.75, 0, -0.35, w); blendR(b.fArmR, -2.25, 0.3, 0, w); blendR(b.handR, 0.4, 0, -0.4, w); blendR(b.head, -0.3 - Math.max(0, Math.sin(k * 2.2)) * 0.15, 0, 0, w); blendR(b.neck, -0.12, 0, 0, w); }
  else if (e === 'tackle') { blendR(b.spine, 0.75, 0, 0, w); blendR(b.chest, 0.2, 0, 0, w); for (const s of [1, -1]) { const L = s > 0 ? 'L' : 'R'; blendR(b['uArm' + L], -1.4, 0, 0.35 * s, w); blendR(b['fArm' + L], -0.4, 0, 0, w); } blendR(b.head, -0.6, 0, 0, w); }
  else if (e === 'shrug') { for (const s of [1, -1]) { const L = s > 0 ? 'L' : 'R'; blendR(b['clav' + L], 0, 0, 0.22 * s, w); blendR(b['uArm' + L], -0.15, 0, 0.42 * s, w); blendR(b['fArm' + L], -1.45, -0.6 * s, 0, w); blendR(b['hand' + L], 0, 0, 0.6 * s, w); } blendR(b.head, 0.05, 0, 0.18, w); }
  else if (e === 'clap') { const c = Math.abs(Math.sin(k * 9)); for (const s of [1, -1]) { const L = s > 0 ? 'L' : 'R'; blendR(b['uArm' + L], -0.75, 0, (0.35 - c * 0.3) * s, w); blendR(b['fArm' + L], -1.25, -(0.5 + c * 0.35) * s, 0, w); blendR(b['hand' + L], 0, 0, 0.2 * s, w); } }
  else if (e === 'phone') { blendR(b.uArmR, -0.55, 0, -0.22, w); blendR(b.fArmR, -1.65, 0.35, 0, w); blendR(b.handR, 0.25, 0, 0.45, w); blendR(b.uArmL, -0.35, 0, 0.2, w); blendR(b.fArmL, -1.2, -0.4, 0, w); blendR(b.neck, 0.15, 0, 0, w); blendR(b.head, 0.38, 0, 0, w); }
  else if (e === 'point') { blendR(b.uArmR, -1.45, 0.3, -0.15, w); blendR(b.fArmR, -0.1, 0, 0, w); blendR(b.handR, 0, 0, 0, w); blendR(b.chest, 0, 0.2, 0, w); }
  else if (e === 'talk') { const g1 = Math.sin(k * 3.1), g2 = Math.sin(k * 2.3 + 1.3); blendR(b.uArmR, -0.35 + g1 * 0.12, 0, -0.25, w); blendR(b.fArmR, -1.25 + g2 * 0.25, -0.4, 0, w); blendR(b.handR, 0, 0, -0.5 + g1 * 0.3, w); blendR(b.uArmL, -0.2, 0, 0.2 + g2 * 0.06, w * 0.6); blendR(b.fArmL, -0.9 + g1 * 0.2, 0.3, 0, w * 0.6); b.head.rotation.x += Math.sin(k * 4.3) * 0.04 * w; b.head.rotation.z += g2 * 0.04 * w; }
  else if (e === 'kick') { const s2 = smooth(clamp(k / 0.25, 0, 1)) - smooth(clamp((k - 0.3) / 0.35, 0, 1)); blendR(b.thighR, -1.1 * s2 + 0.5 * (1 - s2) * (k < 0.25 ? 1 : 0), 0, -0.1, w); blendR(b.shinR, 0.25 + (k < 0.2 ? 1.2 : 0.1), 0, 0, w); blendR(b.uArmL, -0.5, 0, 0.6, w); blendR(b.uArmR, 0.3, 0, -0.5, w); blendR(b.spine, -0.15 * s2, 0, 0, w); }
  else if (e === 'dance') {
    const q = Math.sin(k * 7.5), r = Math.sin(k * 3.75), r2 = Math.cos(k * 3.75);
    b.hips.position.y += (Math.abs(q) * 0.05 - 0.05) * w; b.hips.position.x += r * 0.05 * w;
    blendR(b.hips, 0.05, r * 0.28, r2 * 0.1, w); blendR(b.spine, 0.12, -r * 0.2, 0, w); blendR(b.chest, 0.05 + q * 0.05, -r * 0.15, -r2 * 0.08, w);
    for (const s of [1, -1]) { const L = s > 0 ? 'L' : 'R'; blendR(b['uArm' + L], -0.9 + q * s * 0.55, 0, 0.55 * s, w); blendR(b['fArm' + L], -1.45, 0, 0, w); blendR(b['hand' + L], 0, 0, 0.4 * s * r, w); }
    blendR(b.head, q * 0.12, r * 0.2, 0, w);
    // knees bounce: re-solve feet with a lowered pelvis
    legIK(b, 1, 0.13 + r * 0.03, ANKLE_Y, 0.03, 0); legIK(b, -1, -0.13 + r * 0.03, ANKLE_Y, -0.02, 0);
  }
}
/* knockdown at group level: tip over, lie, get up */
function knockHuman(h, dirx, dirz, strength) { h.userData.fall = { t: 0, dx: dirx, dz: dirz, v: strength, rot: 0 }; }
function updateFall(h, dt) {
  const f = h.userData.fall; if (!f) return false;
  f.t += dt;
  const m = h.userData.mesh;
  humanLOD(h);
  if (f.t < 0.45) { f.rot = lerp(f.rot, -Math.PI / 2, 1 - Math.exp(-14 * dt)); h.position.x += f.dx * f.v * dt * (1 - f.t / 0.45); h.position.z += f.dz * f.v * dt * (1 - f.t / 0.45); }
  else if (f.t < 2.0) f.rot = -Math.PI / 2;
  else if (f.t < 2.7) f.rot = lerp(-Math.PI / 2, 0, smooth((f.t - 2.0) / 0.7));
  else { m.rotation.x = 0; m.position.y = 0; h.userData.fall = null; return false; }
  m.rotation.x = f.rot; m.position.y = Math.min(0.12, -f.rot * 0.08);
  const b = h.userData.b; for (const k of BONES) if (k !== 'root') b[k].rotation.set(0, 0, 0); b.hips.position.set(0, HIPS_Y, 0);
  const k = f.t < 2.0 ? 1 : 1 - smooth((f.t - 2.0) / 0.7);
  for (const s of [1, -1]) { const L = s > 0 ? 'L' : 'R'; b['uArm' + L].rotation.set(-0.3 * k, 0, 1.25 * s * k); b['fArm' + L].rotation.set(-0.5 * k, 0, 0); b['thigh' + L].rotation.set(-0.25 * k * (s > 0 ? 1 : 0.2), 0, 0.22 * s * k); b['shin' + L].rotation.set(0.5 * k * (s > 0 ? 1 : 0.3), 0, 0); }
  b.head.rotation.set(-0.3 * k, 0.4 * k, 0);
  return true;
}
const isDown = h => !!(h && h.userData.fall);
