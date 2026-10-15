/* ===================== 10 world: terrain, roads, buildings, vegetation, venues ===================== */
function shapeFrom(pts) { const s = new T.Shape(); pts.forEach((p, i) => i ? s.lineTo(p[0], -p[1]) : s.moveTo(p[0], -p[1])); return s; }
function flatShape(pts, mat, y, recv) {
  const g = new T.ShapeGeometry(shapeFrom(pts)); g.rotateX(-Math.PI / 2);
  const m = new T.Mesh(g, mat); m.position.y = y; m.receiveShadow = recv !== false; scene.add(m); return m;
}
function ellipsePts(cx, cz, rx, rz, n) { const out = []; for (let i = 0; i < n; i++) { const a = i / n * TAU; out.push([cx + Math.cos(a) * rx, cz + Math.sin(a) * rz]); } return out; }
function rectPts(cx, cz, w, d) { return [[cx - w / 2, cz - d / 2], [cx + w / 2, cz - d / 2], [cx + w / 2, cz + d / 2], [cx - w / 2, cz + d / 2]]; }
function groundMat(tex, tile, order, tint, macro) {
  const t = tex.clone(); t.needsUpdate = true; t.repeat.set(1 / tile, 1 / tile);
  const mat = new T.MeshStandardMaterial({ map: t, color: tint ? C(tint) : 0xffffff, roughness: 0.96, metalness: 0, polygonOffset: order > 0, polygonOffsetFactor: -order, polygonOffsetUnits: -order * 4 });
  if (macro !== false) mat.onBeforeCompile = (sh) => {
    sh.uniforms.uMacro = { value: TEX.macro };
    sh.vertexShader = 'varying vec3 vWP;\n' + sh.vertexShader.replace('#include <project_vertex>', '#include <project_vertex>\n  vWP = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    sh.fragmentShader = 'uniform sampler2D uMacro; varying vec3 vWP;\n' + sh.fragmentShader.replace('#include <map_fragment>', [
      '#include <map_fragment>',
      '  float mac = texture2D(uMacro, vWP.xz / 700.0).r;',
      '  float mac2 = texture2D(uMacro, vWP.xz / 85.0 + 0.37).r;',
      '  diffuseColor.rgb *= mix(vec3(0.8,0.84,0.72), vec3(1.12,1.07,0.95), mac) * mix(0.9, 1.08, mac2);',
    ].join('\n'));
  };
  return mat;
}

/* ---------- sea ---------- */
const DF = { x0: -2400, x1: 2400, z0: -200, z1: 2600, w: 256, h: 160 };
const waterU = { uTime: { value: 0 }, uShallow: { value: C(0x34d0c4) }, uDeep: { value: C(0x0a5f80) }, uFoam: { value: C(0xffffff) }, uDF: { value: null } };
const waterDay = { s: C(0x34d0c4), d: C(0x0a5f80), f: C(0xffffff) }, waterNight = { s: C(0x0e3e52), d: C(0x041026), f: C(0x8796c0) };
let water = null;
function buildDistanceField() {
  const segs = [], c = [[-3000, WORLD.coast[0][1]]].concat(WORLD.coast, [[3000, WORLD.coast[WORLD.coast.length - 1][1]]]);
  for (let i = 0; i < c.length - 1; i++) segs.push([c[i][0], c[i][1], c[i + 1][0], c[i + 1][1]]);
  const data = new Uint8Array(DF.w * DF.h * 4);
  for (let j = 0; j < DF.h; j++) for (let i = 0; i < DF.w; i++) {
    const x = lerp(DF.x0, DF.x1, i / (DF.w - 1)), z = lerp(DF.z0, DF.z1, j / (DF.h - 1));
    let best = 1e9; for (const s of segs) { const d = segDist(x, z, s[0], s[1], s[2], s[3]); if (d < best) best = d; }
    const v = z > coastZ(x) ? clamp(best * 2, 0, 255) : 0, k = (j * DF.w + i) * 4;
    data[k] = data[k + 1] = data[k + 2] = v; data[k + 3] = 255;
  }
  const t = new T.DataTexture(data, DF.w, DF.h, T.RGBAFormat); t.magFilter = t.minFilter = T.LinearFilter; t.needsUpdate = true;
  return t;
}
function buildSea() {
  waterU.uDF.value = buildDistanceField();
  const geo = new T.PlaneGeometry(7000, 7000, 320, 320); geo.rotateX(-Math.PI / 2);
  // waves only offshore: inland the sea sinks well below the land so it can never poke through the ground
  { const pa = geo.attributes.position, sea = new Float32Array(pa.count); for (let i = 0; i < pa.count; i++) { const x = pa.getX(i), z = pa.getZ(i); sea[i] = smooth(clamp((z - coastZ(x) + 4) / 26, 0, 1)); } geo.setAttribute('aSea', new T.BufferAttribute(sea, 1)); }
  const nt = TEX.waterN; nt.repeat.set(7000 / 14, 7000 / 14);
  const mat = new T.MeshStandardMaterial({ color: 0xffffff, roughness: 0.06, metalness: 0.0, normalMap: nt, normalScale: new T.Vector2(0.55, 0.55), envMapIntensity: 1.35 });
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, waterU);
    sh.vertexShader = 'uniform float uTime;\nattribute float aSea;\nvarying vec3 vWPos;\n' + sh.vertexShader.replace('#include <begin_vertex>', [
      '#include <begin_vertex>',
      'vec4 wp0 = modelMatrix * vec4(position, 1.0);',
      'transformed.y += (sin(wp0.x * 0.045 + uTime * 0.9) * 0.2 + cos(wp0.z * 0.04 + uTime * 0.7) * 0.2 + sin((wp0.x + wp0.z) * 0.11 + uTime * 1.6) * 0.06) * aSea - (1.0 - aSea) * 4.0;',
      'vWPos = (modelMatrix * vec4(transformed, 1.0)).xyz;',
    ].join('\n')).replace('#include <beginnormal_vertex>', [
      'vec4 wpn = modelMatrix * vec4(position, 1.0);',
      'float dydx = cos(wpn.x * 0.045 + uTime * 0.9) * 0.009 + cos((wpn.x + wpn.z) * 0.11 + uTime * 1.6) * 0.0066;',
      'float dydz = -sin(wpn.z * 0.04 + uTime * 0.7) * 0.008 + cos((wpn.x + wpn.z) * 0.11 + uTime * 1.6) * 0.0066;',
      'vec3 objectNormal = normalize(vec3(-dydx, 1.0, -dydz));',
    ].join('\n'));
    sh.fragmentShader = 'uniform vec3 uShallow; uniform vec3 uDeep; uniform vec3 uFoam; uniform float uTime; uniform sampler2D uDF;\nvarying vec3 vWPos;\n' + sh.fragmentShader.replace('#include <color_fragment>', [
      '#include <color_fragment>',
      `vec2 duv = vec2((vWPos.x - (${DF.x0.toFixed(1)})) / ${(DF.x1 - DF.x0).toFixed(1)}, (vWPos.z - (${DF.z0.toFixed(1)})) / ${(DF.z1 - DF.z0).toFixed(1)});`,
      'float dist = (duv.x < 0.0 || duv.x > 1.0 || duv.y > 1.0) ? 127.5 : texture2D(uDF, duv).r * 127.5;',
      'diffuseColor.rgb = mix(uShallow, uDeep, smoothstep(1.0, 110.0, dist));',
      'float band = sin(uTime * 1.25 + vWPos.x * 0.05 + vWPos.z * 0.025) * 1.2;',
      'float foam = smoothstep(3.6, 0.4, abs(dist - 2.0 - band)) * 0.8 + smoothstep(2.2, 0.0, dist) * 0.55;',
      'foam += smoothstep(1.0, 0.0, abs(dist - 8.5 - band * 1.6)) * 0.18;',
      'foam *= 0.75 + 0.25 * sin(vWPos.x * 0.7 + uTime * 2.0) * sin(vWPos.z * 0.5);',
      'diffuseColor.rgb = mix(diffuseColor.rgb, uFoam, clamp(foam, 0.0, 1.0));',
    ].join('\n')).replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\n  roughnessFactor = mix(roughnessFactor, 0.6, clamp(smoothstep(3.6, 0.4, abs(dist - 2.0)) , 0.0, 1.0));');
  };
  water = new T.Mesh(geo, mat); water.position.y = -0.32; water.receiveShadow = false;
  scene.add(water);
}

/* ---------- land: one ground mesh whose surface follows the real land cover (splat map) ---------- */
const SPL = { x0: -1900, z0: -1500, x1: 1200, z1: 900, k: 0.5 };
const ZID = { forest: 1, shrub: 2, grass: 3, barren: 4, crop: 5, wet: 6, urban: 7, res: 8, park: 9, ped: 10, ind: 11, plot: 12, beach: 13 };
const ZW = { 0: [138, 100, 17], 1: [150, 45, 60], 2: [108, 120, 27], 3: [180, 70, 5], 4: [40, 110, 95], 5: [140, 50, 65], 6: [205, 35, 15], 7: [100, 95, 45], 8: [175, 55, 25], 9: [240, 15, 0], 10: [40, 110, 80], 11: [40, 110, 80], 12: [215, 32, 8], 13: [0, 0, 0] };
let zoneIds = null, splatTex = null;
function zoneAt(x, z) {
  if (!zoneIds) return 0;
  const W = Math.round((SPL.x1 - SPL.x0) * SPL.k), H = Math.round((SPL.z1 - SPL.z0) * SPL.k);
  const i = Math.floor((x - SPL.x0) * SPL.k), j = Math.floor((z - SPL.z0) * SPL.k);
  if (i < 0 || j < 0 || i >= W || j >= H) return 0;
  return zoneIds[(j * W + i) * 4];
}
function buildSplat() {
  const W = Math.round((SPL.x1 - SPL.x0) * SPL.k), H = Math.round((SPL.z1 - SPL.z0) * SPL.k);
  const X = x => (x - SPL.x0) * SPL.k, Z = z => (z - SPL.z0) * SPL.k;
  const ids = mkCanvas(W, H), ic = ids.getContext('2d'), wc = mkCanvas(W, H), w = wc.getContext('2d');
  const poly = (ctx, pts, fill) => { ctx.beginPath(); pts.forEach((p, i) => i ? ctx.lineTo(X(p[0]), Z(p[1])) : ctx.moveTo(X(p[0]), Z(p[1]))); ctx.closePath(); ctx.fillStyle = fill; ctx.fill(); };
  const rgb = a => `rgb(${a[0]},${a[1]},${a[2]})`, idc = i => `rgb(${i},0,0)`;
  ic.fillStyle = idc(0); ic.fillRect(0, 0, W, H); w.fillStyle = rgb(ZW[0]); w.fillRect(0, 0, W, H);
  const order = ['grass', 'shrub', 'crop', 'barren', 'forest', 'wet', 'urban', 'res', 'park', 'ind', 'ped'];
  for (const k of order) for (const zn of WORLD.zones) if (zn.k === k) { poly(ic, zn.p, idc(ZID[k])); poly(w, zn.p, rgb(ZW[ZID[k]])); }
  poly(ic, PLOT, idc(ZID.plot)); poly(w, PLOT, rgb(ZW[12]));
  for (const rg of WORLD.beach) { poly(ic, rg, idc(ZID.beach)); poly(w, rg, rgb(ZW[13])); }
  // dirt tracks and bare verges along the bush paths
  w.lineCap = 'round'; w.lineJoin = 'round';
  for (const r of WORLD.roads) if (r.c === 'K') { w.strokeStyle = 'rgb(0,40,215)'; w.lineWidth = 4.5 * SPL.k; w.beginPath(); r.p.forEach((p, i) => i ? w.lineTo(X(p[0]), Z(p[1])) : w.moveTo(X(p[0]), Z(p[1]))); w.stroke(); }
  zoneIds = ic.getImageData(0, 0, W, H).data;
  const out = mkCanvas(W, H), o = out.getContext('2d');
  try { o.filter = 'blur(2.5px)'; } catch (e) {}
  o.drawImage(wc, 0, 0);
  const t = new T.CanvasTexture(out); t.wrapS = t.wrapT = T.ClampToEdgeWrapping; t.minFilter = T.LinearFilter; t.generateMipmaps = false;
  splatTex = t;
}
function terrainMat() {
  const mat = new T.MeshStandardMaterial({ map: TEX.grass, roughness: 0.95, metalness: 0 });
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, { uSplat: { value: splatTex }, tDry: { value: TEX.dry }, tSoil: { value: TEX.soil }, tSand: { value: TEX.sand }, uMacro: { value: TEX.macro }, uRect: { value: new T.Vector4(SPL.x0, SPL.z0, 1 / (SPL.x1 - SPL.x0), 1 / (SPL.z1 - SPL.z0)) } });
    sh.vertexShader = 'varying vec3 vWP;\n' + sh.vertexShader.replace('#include <project_vertex>', '#include <project_vertex>\n  vWP = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    sh.fragmentShader = 'uniform sampler2D uSplat, tDry, tSoil, tSand, uMacro; uniform vec4 uRect; varying vec3 vWP;\n' + sh.fragmentShader.replace('#include <map_fragment>', [
      'vec2 wp = vWP.xz;',
      'vec2 jit = vec2(texture2D(uMacro, wp / 37.0).r, texture2D(uMacro, wp / 41.0 + 0.53).r) - 0.5;',
      'vec3 sw = texture2D(uSplat, (wp + jit * 14.0 - uRect.xy) * uRect.zw).rgb;',
      'float wsa = clamp(1.0 - (sw.r + sw.g + sw.b), 0.0, 1.0);',
      'vec2 u1 = wp / 7.0, u2 = wp / 29.0 + vec2(0.37, 0.11);',
      'float far = smoothstep(25.0, 140.0, length(vWP - cameraPosition));',
      'vec3 cG = mix(mapTexelToLinear(texture2D(map, u1)).rgb, mapTexelToLinear(texture2D(map, u2)).rgb, 0.3 + 0.4 * far);',
      'vec3 cD = mix(mapTexelToLinear(texture2D(tDry, u1)).rgb, mapTexelToLinear(texture2D(tDry, u2)).rgb, 0.3 + 0.4 * far);',
      'vec3 cS = mapTexelToLinear(texture2D(tSoil, wp / 6.0)).rgb;',
      'vec3 cA = mapTexelToLinear(texture2D(tSand, wp / 5.0)).rgb * vec3(0.8, 0.74, 0.64) * (0.82 + 0.34 * texture2D(uMacro, wp / 9.0).r);',
      'cA = mix(cA, cS * 0.95, smoothstep(0.5, 0.9, texture2D(uMacro, wp / 23.0 + 0.21).r) * 0.35);',
      'float tot = sw.r + sw.g + sw.b + wsa + 1e-4;',
      'vec3 col = (cG * sw.r + cD * sw.g + cS * sw.b + cA * wsa) / tot;',
      'float mac = texture2D(uMacro, wp / 640.0).r, mac2 = texture2D(uMacro, wp / 75.0 + 0.37).r;',
      'col *= mix(vec3(0.86, 0.9, 0.8), vec3(1.1, 1.06, 0.96), mac) * mix(0.9, 1.07, mac2);',
      'diffuseColor.rgb *= col;',
    ].join('\n'));
  };
  return mat;
}
function buildLand() {
  buildSplat();
  // land as strips from the inland edge down to the coastline (the coast is a function of x), so no triangulation can leave holes
  const xs = [-3600].concat(WORLD.coast.map(p => p[0]).filter(x => x > -3600 && x < 3600), [3600]), pos = [], uv = [], zTop = -3600;
  for (let i = 0; i < xs.length - 1; i++) {
    const x0 = xs[i], x1 = xs[i + 1]; if (x1 - x0 < 1e-3) continue;
    const c0 = coastZ(x0), c1 = coastZ(x1);
    pos.push(x0, 0, zTop, x0, 0, c0, x1, 0, c1, x0, 0, zTop, x1, 0, c1, x1, 0, zTop);
    uv.push(x0 / 7, zTop / 7, x0 / 7, c0 / 7, x1 / 7, c1 / 7, x0 / 7, zTop / 7, x1 / 7, c1 / 7, x1 / 7, zTop / 7);
  }
  const lg = new T.BufferGeometry(); lg.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); lg.setAttribute('uv', new T.Float32BufferAttribute(uv, 2));
  lg.setAttribute('normal', new T.Float32BufferAttribute(new Float32Array(pos.length).map((v, i) => i % 3 === 1 ? 1 : 0), 3));
  const land = new T.Mesh(lg, terrainMat()); land.receiveShadow = true; scene.add(land);
  const b = new Builder(), sandC = C(0xd9c08a), c = [[-3600, WORLD.coast[0][1]]].concat(WORLD.coast, [[3600, WORLD.coast[WORLD.coast.length - 1][1]]]);
  for (let i = 0; i < c.length - 1; i++) { const [x0, z0] = c[i], [x1, z1] = c[i + 1]; b.quad([x0, 0.01, z0], [x0, -2.6, z0 + 7], [x1, -2.6, z1 + 7], [x1, 0.01, z1], sandC, null, [[x0 / 6, 0], [x0 / 6, 1.2], [x1 / 6, 1.2], [x1 / 6, 0]]); }
  const sk = new T.Mesh(b.build(), new T.MeshStandardMaterial({ map: TEX.sand, vertexColors: true, roughness: 1, side: T.DoubleSide })); sk.receiveShadow = true; scene.add(sk);
  for (const z of WORLD.zones) {
    if (z.k === 'ind') { flatShape(z.p, groundMat(TEX.concrete, 8, 3, 0xe8e4dc, false), 0.03); footprints.push({ poly: z.p }); }
    else if (z.k === 'ped') flatShape(z.p, groundMat(TEX.paver, 3, 3, 0xffffff, false), 0.03);
  }
  const hm = new T.MeshStandardMaterial({ color: C(0x5d8d63), roughness: 1 });
  for (let i = 0; i < 12; i++) { const h = new T.Mesh(new T.SphereGeometry(1, 24, 12), hm); h.scale.set(rr(300, 480), rr(40, 80), rr(160, 260)); h.position.set(-3000 + i * 520 + rr(-60, 60), -14, -2300 + rr(-250, 150)); scene.add(h); }
}

/* ---------- roads, sidewalks, lamps, power lines ---------- */
const ROAD = { T: { w: 9, y: 0.05, tex: 'roadT', tile: 18, order: 8 }, R: { w: 7, y: 0.045, tex: 'roadR', tile: 18, order: 7 }, S: { w: 5, y: 0.04, tex: 'roadS', tile: 18, order: 6 }, F: { w: 2.4, y: 0.035, tex: 'paver', tile: 2, order: 5 }, K: { w: 3.6, y: 0.03, tex: 'soil', tile: 6, order: 4 } };
const roadSegs = [];
function upQuad(b, A, B, Cc, D, col, uvs) {
  const cy = (B[0] - A[0]) * (Cc[2] - A[2]) - (B[2] - A[2]) * (Cc[0] - A[0]);
  if (cy > 0) b.quad(A, D, Cc, B, col, [0, 1, 0], uvs && [uvs[0], uvs[3], uvs[2], uvs[1]]);
  else b.quad(A, B, Cc, D, col, [0, 1, 0], uvs);
}
function offsetLine(pts, off) {
  const out = [];
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i], a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
    let d0x = p[0] - a[0], d0z = p[1] - a[1], d1x = b[0] - p[0], d1z = b[1] - p[1];
    const l0 = Math.hypot(d0x, d0z) || 1, l1 = Math.hypot(d1x, d1z) || 1;
    d0x /= l0; d0z /= l0; d1x /= l1; d1z /= l1;
    if (i === 0) { d0x = d1x; d0z = d1z; } if (i === pts.length - 1) { d1x = d0x; d1z = d0z; }
    let nx = d0z + d1z, nz = -d0x - d1x; const nl = Math.hypot(nx, nz) || 1; nx /= nl; nz /= nl;
    const k = off / Math.max(0.4, nx * d0z - nz * d0x);
    out.push([p[0] + nx * k, p[1] + nz * k]);
  }
  return out;
}
function buildRoads() {
  const builders = {};
  WORLD.roads.forEach((r, ri) => {
    const spec = ROAD[r.c]; if (!spec) return;
    const b = builders[r.c] || (builders[r.c] = new Builder()), col = new T.Color(1, 1, 1), hw = spec.w / 2, y = spec.y;
    const L = offsetLine(r.p, hw), Rr = offsetLine(r.p, -hw);
    let acc = 0;
    for (let i = 0; i < r.p.length - 1; i++) {
      const seg = Math.hypot(r.p[i + 1][0] - r.p[i][0], r.p[i + 1][1] - r.p[i][1]);
      const v0 = acc / spec.tile, v1 = (acc + seg) / spec.tile, us = r.c === 'F' ? spec.w / 2 : 1;
      upQuad(b, [L[i][0], y, L[i][1]], [Rr[i][0], y, Rr[i][1]], [Rr[i + 1][0], y, Rr[i + 1][1]], [L[i + 1][0], y, L[i + 1][1]], col, [[0, v0], [us, v0], [us, v1], [0, v1]]);
      roadSegs.push({ ri, x0: r.p[i][0], z0: r.p[i][1], x1: r.p[i + 1][0], z1: r.p[i + 1][1], hw, c: r.c, minx: Math.min(r.p[i][0], r.p[i + 1][0]) - hw, maxx: Math.max(r.p[i][0], r.p[i + 1][0]) + hw, minz: Math.min(r.p[i][1], r.p[i + 1][1]) - hw, maxz: Math.max(r.p[i][1], r.p[i + 1][1]) + hw });
      acc += seg;
    }
    const disc = new T.CircleGeometry(hw, 16); disc.rotateX(-Math.PI / 2);
    if (r.c !== 'F') for (const p of [r.p[0], r.p[r.p.length - 1]]) b.add(disc, mat4(p[0], y - 0.002, p[1], 0), col, { uv: 'box', tile: 512 });
  });
  for (const k in builders) {
    const spec = ROAD[k], tex = TEX[spec.tex].clone(); tex.needsUpdate = true;
    if (k === 'K') tex.repeat.set(0.6, 1);
    const m = new T.Mesh(builders[k].build(), new T.MeshStandardMaterial({ map: tex, color: 0xffffff, roughness: k === 'F' ? 0.85 : 0.9, normalMap: k === 'F' && TEX.paverN ? TEX.paverN : null, polygonOffset: true, polygonOffsetFactor: -spec.order, polygonOffsetUnits: -spec.order * 4 }));
    if (k === 'K') { m.material.transparent = false; }
    m.receiveShadow = true; scene.add(m);
  }
  buildSidewalks();
}
function nearRoad(x, z, pad, exceptRi) {
  for (const s of roadSegs) {
    if (s.ri === exceptRi || x < s.minx - pad || x > s.maxx + pad || z < s.minz - pad || z > s.maxz + pad) continue;
    if (segDist(x, z, s.x0, s.z0, s.x1, s.z1) < s.hw + pad) return s;
  }
  return null;
}
function roadClassAt(x, z) { const s = nearRoad(x, z, 0); return s ? s.c : null; }
function buildSidewalks() {
  const top = new Builder(), curbB = new Builder(), cc = new T.Color(1, 1, 1), curbC = C(0xb9b4aa), H = 0.15, W = 2.3;
  WORLD.roads.forEach((r, ri) => {
    if (r.c !== 'T' && r.c !== 'R') return;
    const hw = ROAD[r.c].w / 2;
    if (!r.p.some(([x, z]) => x > BOUNDS.x0 - 120 && x < BOUNDS.x1 + 120 && z > BOUNDS.z0 - 120 && z < coastZ(x) + 10)) return;
    for (const side of [1, -1]) {
      const inner = offsetLine(r.p, side * (hw + 0.12)), outer = offsetLine(r.p, side * (hw + W));
      // resample to 2.5 m steps
      const sIn = [], sOut = [], dist = [];
      let acc = 0;
      for (let i = 0; i < r.p.length - 1; i++) {
        const L = Math.hypot(r.p[i + 1][0] - r.p[i][0], r.p[i + 1][1] - r.p[i][1]), n = Math.max(1, Math.ceil(L / 2.5));
        for (let k = 0; k < n; k++) { const t = k / n; sIn.push([lerp(inner[i][0], inner[i + 1][0], t), lerp(inner[i][1], inner[i + 1][1], t)]); sOut.push([lerp(outer[i][0], outer[i + 1][0], t), lerp(outer[i][1], outer[i + 1][1], t)]); dist.push(acc + L * t); }
        acc += L;
      }
      sIn.push(inner[inner.length - 1]); sOut.push(outer[outer.length - 1]); dist.push(acc);
      const ok = sIn.map((p, i) => { const mx = (p[0] + sOut[i][0]) / 2, mz = (p[1] + sOut[i][1]) / 2; return !nearRoad(mx, mz, 0.8, ri) && mz < coastZ(mx) - 3 && !pointInStadium(mx, mz, 8); });
      for (let i = 0; i < sIn.length - 1; i++) {
        if (!ok[i] || !ok[i + 1]) continue;
        const a = sIn[i], b2 = sIn[i + 1], c2 = sOut[i + 1], d = sOut[i];
        const v0 = dist[i] / 2, v1 = dist[i + 1] / 2;
        upQuad(top, [a[0], H, a[1]], [b2[0], H, b2[1]], [c2[0], H, c2[1]], [d[0], H, d[1]], cc, [[0, v0], [0, v1], [1.15, v1], [1.15, v0]]);
        const nx = -(b2[1] - a[1]), nz = b2[0] - a[0];
        const face = [[a[0], 0.02, a[1]], [b2[0], 0.02, b2[1]], [b2[0], H, b2[1]], [a[0], H, a[1]]];
        void nx; void nz;
        if (side > 0) curbB.quad(face[0], face[1], face[2], face[3], curbC); else curbB.quad(face[1], face[0], face[3], face[2], curbC);
      }
    }
  });
  const sm = new T.Mesh(top.build(), new T.MeshStandardMaterial({ map: TEX.slab, roughness: 0.9 })); sm.receiveShadow = true; scene.add(sm);
  const cm = new T.Mesh(curbB.build(), new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, side: T.DoubleSide })); cm.receiveShadow = true; scene.add(cm);
}
function pointInStadium(x, z, pad) { const lx = (x - SC.x) / (S_OUT.rx + 20 + pad), lz = (z - SC.z) / (S_OUT.rz + 20 + pad); return lx * lx + lz * lz < 1; }
let lampPools = null;
const lampSpots = [];
function buildLamps() {
  const lamps = [];
  for (const r of WORLD.roads) {
    if (r.c !== 'T' && r.c !== 'R') continue;
    const hw = ROAD[r.c].w / 2, sp = r.c === 'T' ? 32 : 42;
    let acc = 0;
    for (let i = 0; i < r.p.length - 1; i++) {
      const [x0, z0] = r.p[i], [x1, z1] = r.p[i + 1], dx = x1 - x0, dz = z1 - z0, L = Math.hypot(dx, dz);
      for (let s = (sp - acc % sp) % sp; s < L; s += sp) {
        const side = Math.floor((acc + s) / sp) % 2 ? 1 : -1, off = hw + 1.0;
        const lx = x0 + dx / L * s + dz / L * off * side, lz = z0 + dz / L * s - dx / L * off * side;
        if (lx < BOUNDS.x0 - 40 || lx > BOUNDS.x1 + 40 || lz < BOUNDS.z0 - 40 || lz > coastZ(lx) - 4 || pointInStadium(lx, lz, 0) || nearRoad(lx, lz, 0.3)) continue;
        lamps.push([lx, lz, Math.atan2(-dz / L * side, dx / L * side) + Math.PI / 2]);
      }
      acc += L;
    }
  }
  const lb = new Builder(), pc = C(0x5a5f6b);
  lb.add(new T.CylinderGeometry(0.07, 0.11, 7.2, 10), mat4(0, 3.6, 0, 0), pc);
  lb.add(new T.CylinderGeometry(0.05, 0.05, 1.9, 8), mat4(0, 7.05, 0.85, 0, 1, 1, 1, Math.PI / 2 - 0.25), pc);
  lb.add(roundedBox(0.36, 0.14, 0.8, 0.06, 1), mat4(0, 7.2, 1.75, 0), pc);
  lb.add(new T.CylinderGeometry(0.16, 0.2, 0.5, 10), mat4(0, 0.25, 0, 0), C(0x6a6e78));
  const lbl = new Builder(); lbl.add(new T.CylinderGeometry(0.08, 0.11, 7.2, 4, 1, true), mat4(0, 3.6, 0, 0), pc); lbl.add(box(0.12, 0.12, 1.9), mat4(0, 7.1, 0.9, 0), pc); lbl.add(box(0.36, 0.14, 0.8), mat4(0, 7.2, 1.75, 0), pc);
  chunked(lb.build(), VC.clone(), lamps, (l, o) => { o.position.set(l[0], 0, l[1]); o.rotation.set(0, l[2], 0); }, { cast: true, cell: 320, lo: lbl.build() });
  const bulbMat = new T.MeshStandardMaterial({ color: C(0xfff6e0), emissive: C(0xffd58a), emissiveIntensity: 0.0 });
  nightable(bulbMat, 0.0, 3.2);
  const heads = lamps.map(l => [l[0] + Math.sin(l[2]) * 1.75, l[1] + Math.cos(l[2]) * 1.75, l[2]]);
  const bulb = new T.BoxGeometry(0.28, 0.04, 0.6);
  chunked(bulb, bulbMat, heads, (h, o) => { o.position.set(h[0], 7.12, h[1]); o.rotation.set(0, h[2], 0); }, { cell: 320 });
  const poolMat = new T.MeshBasicMaterial({ map: (() => { const c = mkCanvas(128, 128), x = c.getContext('2d'), g = x.createRadialGradient(64, 64, 0, 64, 64, 64); g.addColorStop(0, 'rgba(255,214,150,0.9)'); g.addColorStop(0.5, 'rgba(255,200,130,0.35)'); g.addColorStop(1, 'rgba(255,190,120,0)'); x.fillStyle = g; x.fillRect(0, 0, 128, 128); return texOf(c, { clamp: true }); })(), transparent: true, opacity: 0, depthWrite: false, blending: T.AdditiveBlending, polygonOffset: true, polygonOffsetFactor: -12, polygonOffsetUnits: -48 });
  nightable(poolMat, 0, 0.75, 'opacity');
  const pg = new T.PlaneGeometry(13, 13); pg.rotateX(-Math.PI / 2);
  lampPools = chunked(pg, poolMat, heads, (h, o) => { o.position.set(h[0], 0.2, h[1]); }, { cell: 320 });
  for (const l of lamps) { addCircle(l[0], l[1], 0.18, 'small'); lampSpots.push(l); }
  // soft halos around the lamp heads at night: a cheap stand-in for bloom
  const hp = new Float32Array(heads.length * 3); heads.forEach((h, i) => { hp[i * 3] = h[0]; hp[i * 3 + 1] = 7.05; hp[i * 3 + 2] = h[1]; });
  const hg = new T.BufferGeometry(); hg.setAttribute('position', new T.BufferAttribute(hp, 3));
  const haloMat = new T.PointsMaterial({ size: 6.5, map: glowTex(), color: C(0xffcf8a), transparent: true, opacity: 0, depthWrite: false, blending: T.AdditiveBlending, sizeAttenuation: true });
  nightable(haloMat, 0, 0.85, 'opacity');
  const halos = new T.Points(hg, haloMat); halos.frustumCulled = false; scene.add(halos);
}
function buildPowerLines() {
  const road = WORLD.roads.filter(r => r.c === 'T').sort((a, b) => b.p.length - a.p.length)[0];
  if (!road) return;
  const pts = offsetLine(road.p, 10.5), poles = [];
  let acc = 0, next = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    const [x0, z0] = pts[i], [x1, z1] = pts[i + 1], L = Math.hypot(x1 - x0, z1 - z0);
    while (next <= acc + L) { const t = (next - acc) / L, x = lerp(x0, x1, t), z = lerp(z0, z1, t); if (x > BOUNDS.x0 - 300 && x < BOUNDS.x1 + 300 && z > -700 && !nearRoad(x, z, 1) && !pointInStadium(x, z, 0)) poles.push([x, z, Math.atan2(x1 - x0, z1 - z0)]); next += 46; }
    acc += L;
  }
  const b = new Builder(), wood = C(0x6d5236), metal = C(0x55585e);
  for (const [x, z, a] of poles) {
    b.add(new T.CylinderGeometry(0.11, 0.15, 9, 8), mat4(x, 4.5, z, 0), wood);
    b.add(box(2.2, 0.12, 0.12), mat4(x, 8.4, z, a + Math.PI / 2), wood);
    for (const s of [-0.9, 0, 0.9]) b.add(new T.CylinderGeometry(0.05, 0.05, 0.2, 6), mat4(x + Math.cos(a) * s, 8.55, z - Math.sin(a) * s, 0), metal);
    addCircle(x, z, 0.2, 'small');
  }
  const pm = new T.Mesh(b.build(), VC.clone()); pm.castShadow = true; scene.add(pm);
  const wv = [];
  for (let i = 0; i < poles.length - 1; i++) {
    const [ax, az, aa] = poles[i], [bx, bz, ba] = poles[i + 1]; if (Math.hypot(bx - ax, bz - az) > 60) continue;
    for (const s of [-0.9, 0, 0.9]) {
      const p0 = [ax + Math.cos(aa) * s, 8.62, az - Math.sin(aa) * s], p1 = [bx + Math.cos(ba) * s, 8.62, bz - Math.sin(ba) * s];
      for (let k = 0; k < 8; k++) { const t0 = k / 8, t1 = (k + 1) / 8, sag = t => Math.sin(t * Math.PI) * 0.9; wv.push(lerp(p0[0], p1[0], t0), p0[1] - sag(t0), lerp(p0[2], p1[2], t0), lerp(p0[0], p1[0], t1), p0[1] - sag(t1), lerp(p0[2], p1[2], t1)); }
    }
  }
  const lg = new T.BufferGeometry(); lg.setAttribute('position', new T.Float32BufferAttribute(wv, 3));
  scene.add(new T.LineSegments(lg, new T.LineBasicMaterial({ color: 0x1a1a1e, transparent: true, opacity: 0.75 })));
}

/* ---------- buildings from the OSM footprints ---------- */
const WALL_COLS = [0xf6f1e7, 0xf2e8d6, 0xeee2cc, 0xf7f3ed, 0xe6d3b5, 0xf3e4d2, 0xe2e6e4, 0xe8c9b0, 0xd9c3a0, 0xf4efe6];
const MABATI_COLS = [0x8fa7c4, 0xb8574a, 0x9aa0a8, 0x6f9a7a, 0xc9ccd0];
const glassLitMat = new T.MeshStandardMaterial({ color: C(0x40566a), metalness: 0.55, roughness: 0.05, envMapIntensity: 1.6, emissive: C(0xffc98a), emissiveIntensity: 0 });
const glassMat = new T.MeshStandardMaterial({ color: C(0x3a4d60), metalness: 0.6, roughness: 0.04, envMapIntensity: 1.7 });
nightable(glassLitMat, 0, 1.25);
function hipRoofGeo(w, d, h, o) {
  const L = Math.max(w, d), S = Math.min(w, d), along = w >= d, ox = w / 2 + o, oz = d / 2 + o, ridge = Math.max(0, (L - S) / 2);
  const p0 = [-ox, 0, -oz], p1 = [ox, 0, -oz], p2 = [ox, 0, oz], p3 = [-ox, 0, oz];
  const r0 = along ? [-ridge, h, 0] : [0, h, -ridge], r1 = along ? [ridge, h, 0] : [0, h, ridge];
  const tris = along ? [[p1, p0, r0], [p1, r0, r1], [p3, p2, r1], [p3, r1, r0], [p2, p1, r1], [p0, p3, r0]] : [[p2, p1, r0], [p2, r0, r1], [p0, p3, r1], [p0, r1, r0], [p1, p0, r0], [p3, p2, r1]];
  const pos = [];
  for (const [a, b, c] of tris) pos.push(...a, ...b, ...c);
  const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.computeVertexNormals();
  // force outward-up normals per face
  const P = g.attributes.position.array, N = g.attributes.normal.array;
  for (let i = 0; i < P.length; i += 9) {
    const ax = P[i], ay = P[i + 1], az = P[i + 2], bx = P[i + 3], by = P[i + 4], bz = P[i + 5], cx = P[i + 6], cy = P[i + 7], cz = P[i + 8];
    let nx = (by - ay) * (cz - az) - (bz - az) * (cy - ay), ny = (bz - az) * (cx - ax) - (bx - ax) * (cz - az), nz = (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
    if (ny < 0) { nx = -nx; ny = -ny; nz = -nz; P[i + 3] = cx; P[i + 4] = cy; P[i + 5] = cz; P[i + 6] = bx; P[i + 7] = by; P[i + 8] = bz; }
    const l = Math.hypot(nx, ny, nz) || 1; for (let k = 0; k < 3; k++) { N[i + k * 3] = nx / l; N[i + k * 3 + 1] = ny / l; N[i + k * 3 + 2] = nz / l; }
  }
  return g;
}
function shedRoofGeo(w, d, h, o) {
  const ox = w / 2 + o, oz = d / 2 + o, t = 0.12;
  const g = new T.BoxGeometry(ox * 2, t, oz * 2).toNonIndexed(); g.deleteAttribute('uv');
  const P = g.attributes.position.array;
  for (let i = 0; i < P.length; i += 3) P[i + 1] += (P[i + 2] < 0 ? h : 0) + t / 2;
  g.computeVertexNormals();
  return g;
}
function buildBuildings() {
  // one set of builders per 320 m square, so each part of town is culled (and skipped past the haze) on its own
  const cellsB = new Map(), cellB = (x, z) => { const k = Math.floor(x / 320) + ',' + Math.floor(z / 320); if (!cellsB.has(k)) cellsB.set(k, { wall: new Builder(), tile: new Builder(), mab: new Builder(), trim: new Builder(), glassL: new Builder(), glassD: new Builder(), door: new Builder() }); return cellsB.get(k); };
  let B = null;
  const white = C(0xf8f5ef), teak = C(0x6b3e22), dark = C(0x2a2d33), black = C(0x18191c), steel = C(0x9aa0a8);
  for (const [x, z, w0, d0, ang, kind] of WORLD.blds) {
    B = cellB(x, z);
    const w = Math.max(2, w0), d = Math.max(2, d0), area = w * d, hv = hash2(x, z), hv2 = hash2(z, x), hv3 = hash2(x + 3.1, z - 7.7);
    const thin = Math.min(w, d) < 3.2 && Math.max(w, d) > 7;
    let style, floors;
    if (kind === 'industrial' || area > 1500) { style = 'shed'; floors = 0; }
    else if (thin) { style = 'wall'; floors = 0; }
    else if (area > 500) { style = 'flat'; floors = 2; }
    else if (area >= 120) { floors = hv > 0.32 ? 2 : 1; style = hv2 > 0.42 ? 'hip' : 'flat'; }
    else if (area >= 20) { floors = 1; style = 'mabati'; }
    else { floors = 1; style = 'hut'; }
    const fh = 3.2, h = style === 'shed' ? 9 : style === 'wall' ? 2.3 : style === 'hut' ? 2.6 : floors * fh + 0.4;
    const Mb = mat4(x, 0, z, -ang);
    const add = (bk, geo, Mp, col, o) => B[bk].add(geo, Mb.clone().multiply(Mp), col, Object.assign({ uvFrom: Mp }, o || {}));
    const wallC = C(style === 'shed' ? 0xdfe3e6 : WALL_COLS[Math.floor(hv3 * WALL_COLS.length)]);
    const r = style === 'wall' ? 0.12 : 0.18;
    add('wall', roundedBox(w, h, d, r, 1), mat4(0, h / 2, 0, 0), wallC, { uv: 'box', tile: 4, grime: 0.68 });
    if (style !== 'wall' && style !== 'shed') add('trim', box(w + 0.12, 0.35, d + 0.12), mat4(0, 0.17, 0, 0), C(0xb9ab95));
    // roof
    if (style === 'hip') {
      add('trim', box(w + 0.7, 0.28, d + 0.7), mat4(0, h + 0.14, 0, 0), white);
      add('tile', hipRoofGeo(w, d, Math.min(w, d) * 0.3, 0.55), mat4(0, h + 0.28, 0, 0), C(hv > 0.7 ? 0x8e8f96 : 0xffffff), { uv: 'roof', tile: 3 });
    } else if (style === 'flat') {
      const t = 0.3;
      for (const [px, pz, sw, sd] of [[0, d / 2 - t / 2, w, t], [0, -d / 2 + t / 2, w, t], [w / 2 - t / 2, 0, t, d], [-w / 2 + t / 2, 0, t, d]]) add('wall', box(sw + 0.08, 0.9, sd + 0.08), mat4(px, h + 0.45, pz, 0), wallC, { uv: 'box', tile: 4 });
      add('trim', box(w - 0.6, 0.06, d - 0.6), mat4(0, h + 0.03, 0, 0), C(0xa59f95));
      if (area > 70) {
        const tx = w * (hv - 0.5) * 0.5, tz = d * (hv2 - 0.5) * 0.5;
        add('trim', new T.CylinderGeometry(0.62, 0.62, 1.4, 16), mat4(tx, h + 1.4, tz, 0), black);
        add('trim', box(1.4, 0.7, 1.4), mat4(tx, h + 0.35, tz, 0), C(0x8a8a8a));
        if (hv3 > 0.5) { add('trim', box(2, 0.08, 1.2), mat4(-tx * 0.6 - 1, h + 0.9, -tz * 0.6, 0, 1, 1, 1, -0.5), C(0x1f3557)); add('trim', new T.CylinderGeometry(0.25, 0.25, 2, 10), mat4(-tx * 0.6 - 1, h + 1.35, -tz * 0.6 - 0.55, 0, 1, 1, 1, 0, Math.PI / 2), white); }
        if (hv2 > 0.6) add('trim', new T.SphereGeometry(0.35, 12, 6, 0, TAU, 0, Math.PI / 2), mat4(w / 2 - 0.8, h + 0.95, -d / 2 + 0.8, 0, 1, 0.4, 1, -1.2), white);
      }
    } else if (style === 'mabati' || style === 'hut') {
      add('mab', shedRoofGeo(w, d, Math.min(w, d) * 0.16, 0.45), mat4(0, h, 0, 0), C(MABATI_COLS[Math.floor(hv2 * MABATI_COLS.length)]), { uv: 'roof', tile: 2 });
    } else if (style === 'shed') {
      add('mab', shedRoofGeo(w, d, 1.6, 0.6), mat4(0, h, 0, 0), C(0x5f8fc8), { uv: 'roof', tile: 2 });
      add('trim', box(w + 0.05, 1.2, d + 0.05), mat4(0, 2.0, 0, 0), C(0x2f6fb8));
      for (const s of [1, -1]) add('trim', new T.PlaneGeometry(Math.min(w * 0.4, 14), 4.2), mat4(0, 2.1, s * (d / 2 + 0.03), s > 0 ? 0 : Math.PI), C(0x5b6170));
    }
    if (style === 'wall' || style === 'shed') { addObb(x, z, w, d, ang); footprints.push({ x, z, w, d, ang }); continue; }
    // facades: pick the front as the side facing the nearest road
    const sides = [[0, 1, w, d / 2], [0, -1, w, d / 2], [1, 0, d, w / 2], [-1, 0, d, w / 2]];
    const ca = Math.cos(-ang), sa = Math.sin(-ang);
    let front = 0, bestD = 1e9;
    sides.forEach(([nx, nz, , half], i) => { const lx = nx * (half + 4), lz = nz * (half + 4); const wx = x + lx * ca + lz * sa, wz = z - lx * sa + lz * ca; let dd = 1e9; for (const s of roadSegs) { if (Math.abs(s.x0 - wx) > 120 && Math.abs(s.x1 - wx) > 120) continue; dd = Math.min(dd, segDist(wx, wz, s.x0, s.z0, s.x1, s.z1)); } if (dd < bestD) { bestD = dd; front = i; } });
    sides.forEach(([nx, nz, span, half], si) => {
      const ry = nx ? (nx > 0 ? Math.PI / 2 : -Math.PI / 2) : (nz > 0 ? 0 : Math.PI);
      const n = Math.max(1, Math.floor((span - 1.4) / 3.3));
      for (let f = 0; f < floors; f++) for (let i = 0; i < n; i++) {
        const o = -span / 2 + (i + 0.5) * span / n, tx = nz ? 1 : 0, tz = nx ? 1 : 0;
        const isDoor = f === 0 && si === front && i === Math.floor(n / 2);
        const px = nx * (half + 0.02) + tx * o, pz = nz * (half + 0.02) + tz * o;
        if (isDoor) {
          add('door', new T.PlaneGeometry(1.25, 2.35), mat4(px + nx * 0.068, 1.18 + 0.35, pz + nz * 0.068, ry), null, { uv: 'keep' });
          add('trim', box(1.6, 2.7, 0.08), mat4(px - nx * 0.01, 1.35 + 0.35, pz - nz * 0.01, ry), C(0xe9e2d4));
          add('trim', box(2.2, 0.18, 1.1), mat4(px + nx * 0.5, 0.09, pz + nz * 0.5, ry), C(0xc9bfae));
          continue;
        }
        const cy = 0.35 + f * fh + 1.75, lit = hash2(x + i * 3.7, z + f * 5.1 + si) > 0.55, modern = hv2 > 0.45;
        const big = modern && f === 0 && si === front, ww = big ? 2.3 : 1.45, wh = big ? 2.25 : 1.55, wy = big ? 0.35 + 1.3 : cy;
        const frameC = modern ? C(0x3a3d44) : white;
        add('trim', box(ww + 0.16, wh + 0.16, 0.1), mat4(px - nx * 0.01, wy, pz - nz * 0.01, ry), frameC);
        add('trim', new T.PlaneGeometry(ww, wh), mat4(px + nx * 0.045, wy, pz + nz * 0.045, ry), dark);
        add(lit ? 'glassL' : 'glassD', new T.PlaneGeometry(ww - 0.12, wh - 0.12), mat4(px + nx * 0.055, wy, pz + nz * 0.055, ry), null);
        add('trim', box(0.05, wh - 0.1, 0.06), mat4(px + nx * 0.07, wy, pz + nz * 0.07, ry), frameC);
        if (!big) add('trim', box(ww + 0.3, 0.08, 0.22), mat4(px + nx * 0.1, wy - wh / 2 - 0.06, pz + nz * 0.1, ry), white);
        if (!modern && hash2(x + i, z - f) > 0.5) for (const sdx of [-1, 1]) { const ox = sdx * (ww / 2 + 0.38); add('trim', box(0.7, wh + 0.1, 0.06), mat4(px + tx * ox + nx * 0.06, wy, pz + tz * ox + nz * 0.06, ry), teak); }
        if (f === 1 && si === front && i % 2 === 0 && hv3 > 0.35) {
          add('trim', box(2.8, 0.16, 1.3), mat4(px + nx * 0.65, 0.35 + fh, pz + nz * 0.65, ry), C(0xe4ded2));
          add(modern ? 'glassD' : 'trim', box(2.8, 1.0, 0.04), mat4(px + nx * 1.28, 0.35 + fh + 0.58, pz + nz * 1.28, ry), modern ? null : C(0x3b4250));
          add('trim', box(2.8, 0.06, 0.08), mat4(px + nx * 1.28, 0.35 + fh + 1.1, pz + nz * 1.28, ry), frameC);
        }
      }
      if (si === front && hv2 > 0.45 && span > 7) { const ox = -span / 2 + 1.1, tx2 = nz ? 1 : 0, tz2 = nx ? 1 : 0; add('trim', box(1.4, h - 0.6, 0.12), mat4(nx * (half + 0.06) + tx2 * ox, h / 2 + 0.1, nz * (half + 0.06) + tz2 * ox, ry), teak); }
      if (si !== front && hash2(x + si, z) > 0.55) {
        const py = floors > 1 ? 0.35 + fh + 1.0 : 2.3, o = span * 0.3, tx = nz ? 1 : 0, tz = nx ? 1 : 0;
        add('trim', box(0.85, 0.6, 0.32), mat4(nx * (half + 0.18) + tx * o, py, nz * (half + 0.18) + tz * o, ry), white);
        add('trim', new T.CircleGeometry(0.22, 12), mat4(nx * (half + 0.345) + tx * o, py, nz * (half + 0.345) + tz * o, ry), dark);
      }
    });
    addObb(x, z, w, d, ang);
    footprints.push({ x, z, w, d, ang });
  }
  const mk = (b, mat, cast) => { if (b.empty) return null; const m = new T.Mesh(b.build(), mat); m.castShadow = !!cast; m.receiveShadow = true; scene.add(m); return m; };
  const nrm = (k, s2) => TEX[k] ? { normalMap: TEX[k], normalScale: new T.Vector2(s2, s2) } : {};
  const M = { wall: new T.MeshStandardMaterial(Object.assign({ map: TEX.plaster, vertexColors: true, roughness: 0.9 }, nrm('plasterN', 0.5))), tile: new T.MeshStandardMaterial(Object.assign({ map: TEX.tiles, vertexColors: true, roughness: 0.72, side: T.DoubleSide }, nrm('tilesN', 0.9))), mab: new T.MeshStandardMaterial(Object.assign({ map: TEX.mabati, vertexColors: true, roughness: 0.42, metalness: 0.4, side: T.DoubleSide }, nrm('mabatiN', 0.8))), trim: new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.7, metalness: 0.05, side: T.DoubleSide }), glassL: glassLitMat, glassD: glassMat, door: new T.MeshStandardMaterial({ map: TEX.door, roughness: 0.7 }) };
  for (const cb of cellsB.values()) for (const k of Object.keys(M)) mk(cb[k], M[k], k !== 'glassL' && k !== 'glassD' && k !== 'door');
}

/* ---------- vegetation ---------- */
function blockedForPlant(x, z, pad) {
  for (const f of footprints) {
    if (f.ellipse) { const lx = (x - f.x) / (f.rx + pad), lz = (z - f.z) / (f.rz + pad); if (lx * lx + lz * lz < 1) return true; }
    else if (f.poly) { if (pointInPoly(x, z, f.poly)) return true; }
    else if (f.circle) { if (Math.hypot(x - f.x, z - f.z) < f.r + pad) return true; }
    else { const c = Math.cos(f.ang || 0), s = Math.sin(f.ang || 0), dx = x - f.x, dz = z - f.z, u = dx * c + dz * s, v = -dx * s + dz * c; if (Math.abs(u) < f.w / 2 + pad && Math.abs(v) < f.d / 2 + pad) return true; }
  }
  for (const n of NPCS) if (Math.hypot(x - n.x, z - n.z) < 6) return true;
  if (Math.hypot(x - START.x, z - START.z) < 14) return true;
  for (const s of STANDS) if (Math.hypot(x - s.x, z - s.z) < 12) return true;
  return !!nearRoad(x, z, pad + 2.4);
}
function frondGeo(lo) {
  const L = 5.4, W = lo ? 2.2 : 1.7, g = new T.PlaneGeometry(L, W, lo ? 3 : 9, lo ? 1 : 2), p = g.attributes.position, uv = g.attributes.uv;
  for (let i = 0; i < p.count; i++) { const X = p.getX(i) + L / 2, t = X / L, Y = p.getY(i); p.setXYZ(i, X, Math.sin(t * Math.PI * 0.62) * 1.1 - t * t * 2.7 - Math.abs(Y) * 0.4 * t, Y * (1 - t * 0.75)); uv.setXY(i, t, Y / W + 0.5); }
  g.computeVertexNormals();
  return g;
}
function canopyGeo(n, size, flat) {
  const b = new Builder(), col = new T.Color(1, 1, 1), center = new T.Vector3(0, 0, 0);
  for (let i = 0; i < n; i++) {
    const pg = new T.PlaneGeometry(size, size * (flat ? 0.55 : 1));
    const a = i / n * Math.PI + (i % 2) * 0.4, tilt = (i % 3 - 1) * 0.5;
    const off = i < 3 ? 0 : size * 0.22;
    b.add(pg, mat4(Math.cos(a * 2) * off, (flat ? 0 : (i % 3 - 1) * size * 0.12), Math.sin(a * 2) * off, a, 1, 1, 1, tilt), col, { uv: 'keep' });
  }
  const g = b.build(), P = g.attributes.position.array, N = g.attributes.normal.array;
  for (let i = 0; i < P.length; i += 3) { const v = new T.Vector3(P[i], P[i + 1] * (flat ? 2.2 : 1) + size * 0.15, P[i + 2]).sub(center).normalize(); N[i] = v.x; N[i + 1] = v.y; N[i + 2] = v.z; }
  return g;
}
function buildVegetation() {
  const palms = [], trees = [], acacias = [], bushes = [], tufts = [];
  const inPlay = (x, z, m) => x > BOUNDS.x0 - m && x < BOUNDS.x1 + m && z > BOUNDS.z0 - m && z < coastZ(x) - 6;
  for (const s of roadSegs) {
    if (!(s.c === 'T' || s.c === 'R')) continue;
    const dx = s.x1 - s.x0, dz = s.z1 - s.z0, L = Math.hypot(dx, dz);
    for (let d = 8; d < L; d += 20 + rnd() * 12) for (const side of [-1, 1]) {
      if (rnd() < 0.3) continue;
      const off = s.hw + 3.6 + rnd() * 2, x = s.x0 + dx / L * d - dz / L * off * side, z = s.z0 + dz / L * d + dx / L * off * side;
      if (!inPlay(x, z, 140) || blockedForPlant(x, z, 1.2) || palms.some(p => Math.hypot(p[0] - x, p[1] - z) < 7)) continue;
      palms.push([x, z]);
    }
  }
  for (let x = BOUNDS.x0 - 200; x < BOUNDS.x1 + 200; x += 12 + rnd() * 14) { const z = coastZ(x) - 9 - rnd() * 16; if (!blockedForPlant(x, z, 1) && !palms.some(p => Math.hypot(p[0] - x, p[1] - z) < 6)) palms.push([x, z]); }
  for (const f of footprints) {
    if (f.ellipse || f.poly || f.circle || f.w * f.d > 500 || f.w * f.d < 100 || rnd() < 0.4) continue;
    const a = rnd() * TAU, R = Math.max(f.w, f.d) / 2 + 3.5, x = f.x + Math.cos(a) * R, z = f.z + Math.sin(a) * R;
    if (!blockedForPlant(x, z, 1)) { if (rnd() < 0.5) palms.push([x, z]); else bushes.push([x, z, 1]); }
  }
  // trees, bushes and grass tufts follow the real land cover
  const TREE_P = { 0: 0.12, 1: 0.95, 2: 0.3, 3: 0.07, 4: 0.03, 5: 0.06, 6: 0.25, 7: 0.03, 8: 0.05, 9: 0.12, 10: 0, 11: 0, 12: 0, 13: 0 };
  const BUSH_P = { 0: 0.2, 1: 0.35, 2: 0.65, 3: 0.15, 4: 0.12, 5: 0.1, 6: 0.3, 7: 0.15, 8: 0.25, 9: 0.2, 10: 0, 11: 0, 12: 0, 13: 0 };
  const target = BUILD_HQ ? 2600 : 1100;
  let tries = 0;
  while (trees.length + acacias.length < target && tries < 90000) {
    tries++;
    const x = rr(-1850, 1150), z = rr(-1450, 560);
    if (z > coastZ(x) - 8) continue;
    const zid = zoneAt(x, z), far = !(x > BOUNDS.x0 - 80 && x < BOUNDS.x1 + 80 && z > BOUNDS.z0 - 80);
    const p = far ? Math.max(TREE_P[zid] || 0, zid === 12 ? 0 : 0.35) : (TREE_P[zid] || 0);
    if (rnd() > p || blockedForPlant(x, z, 3)) continue;
    if (zid === 6 && rnd() < 0.6) { palms.push([x, z]); continue; }
    if (rnd() < (zid === 2 || zid === 4 ? 0.35 : 0.12)) acacias.push([x, z]); else trees.push([x, z]);
  }
  tries = 0;
  while (bushes.length < (BUILD_HQ ? 1500 : 620) && tries < 40000) { tries++; const x = rr(BOUNDS.x0 - 60, BOUNDS.x1 + 60), z = rr(BOUNDS.z0 - 60, 500); if (z > coastZ(x) - 4 || rnd() > (BUSH_P[zoneAt(x, z)] || 0) || blockedForPlant(x, z, 1.2)) continue; bushes.push([x, z, 0]); }
  if (BUILD_HQ) { tries = 0; while (tufts.length < 9000 && tries < 90000) { tries++; const x = rr(BOUNDS.x0, BOUNDS.x1), z = rr(BOUNDS.z0, 500); const zid = zoneAt(x, z); if (z > coastZ(x) - 10 || zid === 12 || zid === 13 || zid === 10 || zid === 11 || blockedForPlant(x, z, 0.2)) continue; tufts.push([x, z]); } }
  palms.push(...AFCON_PALMS);
  for (const [x, z] of EXTRA_TREES) trees.push([x, z]);

  const v = new T.Vector3(), tmpO = new T.Object3D();
  const curve = new T.CatmullRomCurve3([new T.Vector3(0, 0, 0), new T.Vector3(0.25, 3, 0), new T.Vector3(0.8, 6, 0), new T.Vector3(1.5, 8.8, 0)]);
  const tub = 12, rad = 8, trunkGeo = new T.TubeGeometry(curve, tub, 0.22, rad, false);
  { const P = trunkGeo.attributes.position; for (let i = 0; i < P.count; i++) { const ring = Math.floor(i / (rad + 1)), t = ring / tub, c = curve.getPointAt(t); const k = lerp(1.35, 0.78, t); P.setXYZ(i, c.x + (P.getX(i) - c.x) * k, c.y + (P.getY(i) - c.y) * k, c.z + (P.getZ(i) - c.z) * k); } trunkGeo.computeVertexNormals(); }
  const barkT = TEX.bark.clone(); barkT.needsUpdate = true; barkT.repeat.set(5, 1);
  const greens = [0x7fb050, 0x6aa046, 0x8fbf5a, 0x76aa4e].map(C);
  const trunkItems = [], frondItems = [], nutItems = [];
  palms.forEach(([x, z], i) => {
    const sc = rr(0.85, 1.3), ry = rnd() * TAU;
    tmpO.position.set(x, 0, z); tmpO.rotation.set(0, ry, 0); tmpO.scale.setScalar(sc); tmpO.updateMatrix();
    v.set(1.5, 8.8, 0).applyMatrix4(tmpO.matrix);
    trunkItems.push([x, z, ry, sc]);
    for (let k = 0; k < 11; k++) frondItems.push([v.x, v.z, v.y, ry + k * TAU / 11 + rr(-0.15, 0.15), rr(-0.25, 0.35), sc * rr(0.85, 1.1), (i + k) % 4]);
    for (let k = 0; k < 4; k++) nutItems.push([v.x + Math.cos(k * 1.6) * 0.32, v.z + Math.sin(k * 1.6) * 0.32, v.y - 0.32, sc]);
    if (inPlay(x, z, 30)) addCircle(x, z, 0.4);
  });
  const trunkLo = new T.TubeGeometry(curve, 4, 0.26, 4, false);
  chunked(trunkGeo, new T.MeshStandardMaterial({ map: barkT, roughness: 0.95 }), trunkItems, (it, o) => { o.position.set(it[0], 0, it[1]); o.rotation.set(0, it[2], 0); o.scale.setScalar(it[3]); }, { cast: true, recv: true, cell: 240, lo: trunkLo });
  const frondMat = addWind(new T.MeshStandardMaterial({ map: TEX.frond, alphaTest: 0.42, side: T.DoubleSide, roughness: 0.7 }), 0.05);
  chunked(frondGeo(), frondMat, frondItems, (it, o) => { o.position.set(it[0], it[2], it[1]); o.rotation.order = 'YZX'; o.rotation.set(0, it[3], it[4]); o.scale.setScalar(it[5]); return greens[it[6]]; }, { cast: true, depth: alphaDepth(TEX.frond), cell: 240, lo: frondGeo(true), loKeep: (it, i) => i % 2 === 0 });
  chunked(new T.SphereGeometry(0.26, 10, 8), new T.MeshStandardMaterial({ color: C(0x5d4426), roughness: 0.7 }), nutItems, (it, o) => { o.position.set(it[0], it[2], it[1]); o.scale.setScalar(it[3]); }, { cell: 240, far: 260 });
  // broadleaf trees and acacias
  const tb = new Builder(), bark = C(0x6a5038);
  tb.add(new T.CylinderGeometry(0.22, 0.36, 4.2, 8), mat4(0, 2.1, 0, 0), bark);
  tb.add(new T.CylinderGeometry(0.1, 0.16, 2.4, 6), mat4(0.6, 3.8, 0, 0, 1, 1, 1, 0, -0.7), bark);
  tb.add(new T.CylinderGeometry(0.1, 0.16, 2.2, 6), mat4(-0.5, 3.9, 0.3, 0, 1, 1, 1, 0.3, 0.6), bark);
  const trunkMat = new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.95 });
  const tint = [new T.Color(1, 1, 1), new T.Color(0.88, 1.0, 0.82), new T.Color(1.08, 1.04, 0.82), new T.Color(0.82, 0.94, 0.88)];
  const items = (list) => list.map(([x, z], i) => { const sc = rr(0.8, 1.4); if (inPlay(x, z, 20)) addCircle(x, z, 0.45 * sc); return [x, z, rnd() * TAU, sc, sc * rr(0.9, 1.15), i % 4]; });
  const ti = items(trees), ai = items(acacias);
  const tbl = new Builder(); tbl.add(new T.CylinderGeometry(0.2, 0.36, 4.6, 5, 1, true), mat4(0, 2.3, 0, 0), bark);
  chunked(tb.build(), trunkMat, ti.concat(ai), (it, o) => { o.position.set(it[0], 0, it[1]); o.rotation.set(0, it[2], 0); o.scale.set(it[3], it[4], it[3]); }, { cast: true, recv: true, cell: 240, lo: tbl.build() });
  const leafMat = addWind(new T.MeshStandardMaterial({ map: TEX.leaves, alphaTest: 0.5, side: T.DoubleSide, roughness: 0.82 }), 0.035);
  const leafDepth = alphaDepth(TEX.leaves);
  const cg = canopyGeo(9, 5.6, false); cg.translate(0, 5.6, 0);
  chunked(cg, leafMat, ti, (it, o) => { o.position.set(it[0], 0, it[1]); o.rotation.set(0, it[2], 0); o.scale.set(it[3], it[4], it[3]); return tint[it[5]]; }, { cast: true, recv: true, depth: leafDepth, cell: 240, lo: (() => { const g = canopyGeo(4, 5.8, false); g.translate(0, 5.6, 0); return g; })() });
  const ag = canopyGeo(7, 7.5, true); ag.translate(0, 5.4, 0);
  chunked(ag, leafMat, ai, (it, o) => { o.position.set(it[0], 0, it[1]); o.rotation.set(0, it[2], 0); o.scale.set(it[3], it[4], it[3]); return tint[(it[5] + 2) % 4]; }, { cast: true, recv: true, depth: leafDepth, cell: 240, lo: (() => { const g = canopyGeo(3, 7.8, true); g.translate(0, 5.4, 0); return g; })() });
  const bg = canopyGeo(4, 2.2, false); bg.translate(0, 0.85, 0);
  const pink = [C(0xff7ab8), C(0xff5aa0), C(0xffffff), C(0xe8f0d8)];
  const bushMat = new T.MeshStandardMaterial({ map: TEX.leaves, alphaTest: 0.5, side: T.DoubleSide, roughness: 0.85 });
  chunked(bg, bushMat, bushes.map(([x, z, g], i) => [x, z, rnd() * TAU, rr(0.7, 1.4), g, i]), (it, o) => { o.position.set(it[0], 0, it[1]); o.rotation.set(0, it[2], 0); o.scale.setScalar(it[3]); return it[4] ? pink[it[5] % 2] : tint[it[5] % 4]; }, { cast: true, depth: leafDepth, cell: 240, far: 480 });
  if (tufts.length) {
    const tg = new Builder(); for (const a of [0, Math.PI / 2]) tg.add(new T.PlaneGeometry(0.9, 0.6), mat4(0, 0.3, 0, a), new T.Color(1, 1, 1), { uv: 'keep' });
    const tgeo = tg.build(); const N = tgeo.attributes.normal.array; for (let i = 0; i < N.length; i += 3) { N[i] = 0; N[i + 1] = 1; N[i + 2] = 0; }
    const tm = addWind(new T.MeshStandardMaterial({ map: TEX.tuft, alphaTest: 0.5, side: T.DoubleSide, roughness: 1 }), 0.12);
    chunked(tgeo, tm, tufts, (it, o) => { o.position.set(it[0], 0, it[1]); o.rotation.set(0, hash2(it[0], it[1]) * TAU, 0); o.scale.setScalar(0.8 + hash2(it[1], it[0]) * 0.7); return tint[Math.floor(hash2(it[0] * 2, it[1]) * 4)]; }, { cell: 180, far: 170 });
  }
}

/* ---------- AfconCity stadium (imagined) ---------- */
let crowd = null, crowdBase = null, gateBarrier = null, gateCollider = null;
const nightOnly = [];
function sPt(phi, t) { const c = Math.cos(phi), s = Math.sin(phi); return [SC.x + lerp(S_IN.rx * c, S_OUT.rx * c, t), SC.z + lerp(S_IN.rz * s, S_OUT.rz * s, t)]; }
function pitchTexture(W, L, scale) {
  const pad = 3, px = 1024, k = px / (W + 2 * pad), py = Math.round((L + 2 * pad) * k);
  const c = mkCanvas(px, py), x = c.getContext('2d'), rg = mulberry32(7);
  const n = 14;
  for (let i = 0; i < n; i++) { x.fillStyle = i % 2 ? '#3a8f45' : '#45a052'; x.fillRect(i * px / n, 0, px / n + 1, py); }
  for (let i = 0; i < 9000; i++) { x.fillStyle = `rgba(${rg() < 0.5 ? '20,60,20' : '120,180,90'},0.08)`; x.fillRect(rg() * px, rg() * py, 2, 2); }
  x.strokeStyle = '#f2efe4'; x.lineWidth = Math.max(3, 0.12 * k); x.fillStyle = '#f2efe4';
  const x0 = pad * k, y0 = pad * k, iw = W * k, il = L * k;
  x.strokeRect(x0, y0, iw, il);
  x.beginPath(); x.moveTo(px / 2, y0); x.lineTo(px / 2, y0 + il); x.stroke();
  x.beginPath(); x.arc(px / 2, py / 2, 9.15 * scale * k, 0, TAU); x.stroke();
  x.beginPath(); x.arc(px / 2, py / 2, 0.3 * k, 0, TAU); x.fill();
  const bw = Math.min(40.3 * scale, L - 4) * k, bd = 16.5 * scale * k, gw = 18.3 * scale * k, gd = 5.5 * scale * k, sp = 11 * scale * k;
  for (const end of [0, 1]) {
    const xx = end ? x0 + iw : x0, s = end ? -1 : 1;
    x.strokeRect(end ? xx - bd : xx, py / 2 - bw / 2, bd, bw); x.strokeRect(end ? xx - gd : xx, py / 2 - gw / 2, gd, gw);
    x.beginPath(); x.arc(xx + s * sp, py / 2, 0.3 * k, 0, TAU); x.fill();
    x.beginPath(); x.arc(xx + s * sp, py / 2, 9.15 * scale * k, end ? Math.PI - 0.93 : -0.93, end ? Math.PI + 0.93 : 0.93); x.stroke();
  }
  return texOf(c, { clamp: true });
}
function goalFrame(x, z, ry) {
  const g = new T.Group(), white = M(0xf7f3e6, { roughness: 0.35, metalness: 0.2 }), w = 7.32, h = 2.44, pg = new T.CylinderGeometry(0.06, 0.06, h, 10);
  for (const s of [-1, 1]) { const p = new T.Mesh(pg, white); p.position.set(s * w / 2, h / 2, 0); p.castShadow = true; g.add(p); }
  const bar = new T.Mesh(new T.CylinderGeometry(0.06, 0.06, w, 10), white); bar.rotation.z = Math.PI / 2; bar.position.y = h; bar.castShadow = true; g.add(bar);
  const net = new T.Mesh(new T.BoxGeometry(w, h, 2, 14, 6, 4), new T.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.22, wireframe: true }));
  net.position.set(0, h / 2, -1); g.add(net);
  g.position.set(x, 0.1, z); g.rotation.y = ry; scene.add(g);
  return g;
}
function buildStadium() {
  const prof = [], W = C(0xd8d4cc), CON = C(0xe9e6e0), RIM = C(0xe0553a), OUT = C(0xeeeae2);
  prof.push({ a: [0, 0], b: [0, 1.4], c: C(0x2a3270) });
  const rows = (t0, y0, t1, y1, n, tier) => { for (let i = 0; i < n; i++) { const ta = lerp(t0, t1, i / n), tb = lerp(t0, t1, (i + 1) / n), ya = lerp(y0, y1, i / n), yb = lerp(y0, y1, (i + 1) / n); prof.push({ a: [ta, ya], b: [ta, yb], c: W }); prof.push({ a: [ta, yb], b: [tb, yb], seat: true, tier, row: i }); } };
  rows(0, 1.4, 0.44, 13.6, 16, 0);
  prof.push({ a: [0.44, 13.6], b: [0.44, 14.8], c: CON }); prof.push({ a: [0.44, 14.8], b: [0.5, 14.8], c: CON });
  rows(0.5, 14.8, 0.94, 31, 18, 1);
  prof.push({ a: [0.94, 31], b: [0.94, 32.6], c: RIM }); prof.push({ a: [0.94, 32.6], b: [1.0, 32.6], c: RIM }); prof.push({ a: [1.0, 32.6], b: [1.0, 0], c: OUT });
  const seatCols = [0x1aa7a2, 0x1aa7a2, 0xf3b41b, 0x1aa7a2, 0x2a3270, 0x1aa7a2, 0xd8452c, 0x1aa7a2].map(C);
  const b = new Builder(), N = 180, phi0 = Math.PI / 2 + S_GAP, phi1 = Math.PI / 2 + TAU - S_GAP;
  const P3 = (phi, t, y) => { const [x, z] = sPt(phi, t); return [x, y, z]; };
  for (const seg of prof) for (let k = 0; k < N; k++) {
    const pa = lerp(phi0, phi1, k / N), pb = lerp(phi0, phi1, (k + 1) / N);
    let col = seg.c;
    if (seg.seat) col = seatCols[(Math.floor(k / 11) + seg.tier * 3) % seatCols.length].clone().multiplyScalar(seg.row % 2 ? 0.82 : 1);
    b.quad(P3(pa, seg.a[0], seg.a[1]), P3(pa, seg.b[0], seg.b[1]), P3(pb, seg.b[0], seg.b[1]), P3(pb, seg.a[0], seg.a[1]), col);
  }
  for (const phi of [phi0, phi1]) {
    const poly = []; prof.forEach((s, i) => { if (i === 0) poly.push(s.a); poly.push(s.b); });
    const [ix, iz] = sPt(phi, 0), [ox, oz] = sPt(phi, 1), L = Math.hypot(ox - ix, oz - iz);
    const tris = T.ShapeUtils.triangulateShape(poly.map(([t, y]) => new T.Vector2(t * L, y)), []);
    for (const [i0, i1, i2] of tris) b.tri(P3(phi, poly[i0][0], poly[i0][1]), P3(phi, poly[i1][0], poly[i1][1]), P3(phi, poly[i2][0], poly[i2][1]), C(0xcfc9be));
  }
  const bowl = new T.Mesh(b.build(), new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.75, side: T.DoubleSide })); bowl.castShadow = true; bowl.receiveShadow = true; scene.add(bowl);
  const rb = new Builder(), roofProf = [[0.34, 37.4], [0.36, 36.6], [1.03, 34.4], [1.06, 35.1], [1.03, 35.8], [0.36, 38.0], [0.34, 37.4]], white = C(0xf4f2ee);
  for (let k = 0; k < 220; k++) { const pa = k / 220 * TAU, pb = (k + 1) / 220 * TAU; for (let i = 0; i < roofProf.length - 1; i++) { const [ta, ya] = roofProf[i], [tb, yb] = roofProf[i + 1]; rb.quad(P3(pa, ta, ya), P3(pa, tb, yb), P3(pb, tb, yb), P3(pb, ta, ya), white); } }
  const roof = new T.Mesh(rb.build(), new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.45, metalness: 0.1, side: T.DoubleSide })); roof.castShadow = true; roof.receiveShadow = true; scene.add(roof);
  const lb = new Builder();
  for (let k = 0; k < 220; k++) { const pa = k / 220 * TAU, pb = (k + 1) / 220 * TAU; lb.quad(P3(pa, 0.35, 36.55), P3(pa, 0.42, 36.35), P3(pb, 0.42, 36.35), P3(pb, 0.35, 36.55), new T.Color(1, 1, 1), [0, -1, 0]); }
  const ledMat = new T.MeshStandardMaterial({ color: 0xffffff, emissive: C(0xfff3d6), emissiveIntensity: 0.0, side: T.DoubleSide });
  nightable(ledMat, 0.0, 4.0);
  scene.add(new T.Mesh(lb.build(), ledMat));
  const fins = []; for (let phi = phi0 + 0.03; phi < phi1 - 0.02; phi += 0.04) fins.push(phi);
  const fm = new T.InstancedMesh(roundedBox(1.1, 33, 3.2, 0.4, 1), new T.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3, metalness: 0.65, envMapIntensity: 1.2 }), fins.length);
  const o3 = new T.Object3D(), cA = C(0xf2efe8), cB = C(0xe2a514), cT = C(0x149f9a);
  fins.forEach((phi, i) => { const [x, z] = sPt(phi, 1.025); o3.position.set(x, 16.6, z); o3.rotation.set(0, Math.atan2(Math.cos(phi) / S_OUT.rx, Math.sin(phi) / S_OUT.rz), 0); o3.updateMatrix(); fm.setMatrixAt(i, o3.matrix); fm.setColorAt(i, i % 9 === 0 ? cT : i % 2 ? cB : cA); });
  fm.castShadow = true; fm.receiveShadow = true; fm.frustumCulled = false; scene.add(fm);
  flatShape(ellipsePts(SC.x, SC.z, S_IN.rx, S_IN.rz, 96), groundMat(TEX.grass, 6, 6, 0x9fd27c, false), 0.06);
  const pitch = new T.Mesh(new T.PlaneGeometry(111, 74), new T.MeshStandardMaterial({ map: pitchTexture(105, 68, 1), roughness: 0.92, polygonOffset: true, polygonOffsetFactor: -9, polygonOffsetUnits: -36 }));
  pitch.rotation.x = -Math.PI / 2; pitch.position.set(SC.x, 0.08, SC.z); pitch.receiveShadow = true; scene.add(pitch);
  goalFrame(SC.x - 52.5, SC.z, Math.PI / 2); goalFrame(SC.x + 52.5, SC.z, -Math.PI / 2);
  const boardTex = (() => { const c = mkCanvas(1024, 96), x = c.getContext('2d'); x.fillStyle = '#141838'; x.fillRect(0, 0, 1024, 96); x.fillStyle = '#f3b41b'; x.fillRect(0, 0, 10, 96); x.textBaseline = 'middle'; x.font = `900 58px ${FONT_D}`; x.fillStyle = '#f7ead0'; x.fillText('YOUR BRAND HERE', 34, 51); x.font = `800 38px ${FONT_D}`; x.fillStyle = '#f3b41b'; x.fillText('PARTNER SLOT', 640, 51); return texOf(c); })();
  for (const [cx, cz, len, ry] of [[SC.x, SC.z - 38, 112, 0], [SC.x, SC.z + 38, 112, Math.PI], [SC.x - 57, SC.z, 70, Math.PI / 2], [SC.x + 57, SC.z, 70, -Math.PI / 2]]) {
    const t = boardTex.clone(); t.needsUpdate = true; t.repeat.set(len / 11, 1);
    const mat = new T.MeshStandardMaterial({ map: t, emissive: 0xffffff, emissiveMap: t, emissiveIntensity: 0.35, roughness: 0.4 }); nightable(mat, 0.35, 1.3);
    const bd = new T.Mesh(roundedBox(len, 1, 0.3, 0.1, 1), mat); bd.position.set(cx, 0.6, cz); bd.rotation.y = ry; scene.add(bd);
  }
  const [gx, gz] = sPt(Math.PI / 2, 1.04);
  const gb = signMesh('AFCONCITY STADIUM · GATE A', 22, 3, { bg: '#d8452c' }); gb.position.set(gx, 20, gz + 0.6); scene.add(gb);
  scene.add(at(meshOf(roundedBox(23, 1.2, 1.6, 0.4), M(0xeeeae2), true), gx, 18, gz));
  // floodlight masts
  const mastMat = M(0xb8bcc4, { metalness: 0.6, roughness: 0.35 });
  const headMat = new T.MeshStandardMaterial({ color: 0xeeeeee, emissive: C(0xfff4dc), emissiveIntensity: 0 }); nightable(headMat, 0, 4);
  for (const [sx, sz] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) {
    const x = SC.x + sx * 124, z = SC.z + sz * 96;
    const m = meshOf(new T.CylinderGeometry(0.6, 1.1, 52, 10), mastMat, true); m.position.set(x, 26, z); scene.add(m);
    const h = meshOf(new T.BoxGeometry(9, 5, 1), headMat, false); h.position.set(x, 53, z); h.rotation.order = 'YXZ'; h.rotation.set(0.45, Math.atan2(SC.x - x, SC.z - z), 0); scene.add(h);
    addCircle(x, z, 1.3);
  }
  // Gate A barrier (opens with a ticket)
  gateBarrier = new T.Group();
  for (let i = -1; i <= 1; i++) { const t = meshOf(roundedBox(1.1, 1.1, 0.5, 0.15), M(0x8c919a, { metalness: 0.6, roughness: 0.3 }), true); t.position.set(GATE.x + i * 3.2, 0.55, GATE.z + 1); gateBarrier.add(t); }
  const bar = meshOf(new T.BoxGeometry(9.6, 0.12, 0.12), M(0xd8452c), true); bar.position.set(GATE.x, 1.1, GATE.z + 1.3); gateBarrier.add(bar); gateBarrier.userData.bar = bar; gateBarrier.userData.dynamic = true;
  scene.add(gateBarrier);
  gateCollider = addObb(GATE.x, GATE.z + 1, 10, 1.4, 0, 'gate');
  // crowd (fills up at kickoff)
  const NC = BUILD_HQ ? 3200 : 1600, fanGeo = capsule(0.24, 0.5, 3, 8);
  crowd = new T.InstancedMesh(fanGeo, new T.MeshStandardMaterial({ color: 0xffffff, roughness: 0.85 }), NC);
  crowd.instanceMatrix.setUsage(T.DynamicDrawUsage);
  crowdBase = new Float32Array(NC * 4);
  const fanCols = [0xf3b41b, 0xe0553a, 0x19b5b1, 0xf6f1e7, 0x1e9b57, 0x2a3270, 0x1f8fd0].map(C);
  for (let i = 0; i < NC; i++) {
    const upper = rnd() < 0.5, n = upper ? 18 : 16, row = Math.floor(rnd() * n);
    const t = lerp(upper ? 0.5 : 0, upper ? 0.94 : 0.44, (row + 0.5) / n), y = lerp(upper ? 14.8 : 1.4, upper ? 31 : 13.6, (row + 1) / n);
    const [x, z] = sPt(rr(phi0 + 0.02, phi1 - 0.02), t);
    crowdBase[i * 4] = x; crowdBase[i * 4 + 1] = y + 0.5; crowdBase[i * 4 + 2] = z; crowdBase[i * 4 + 3] = rnd() * TAU;
    o3.position.set(x, y + 0.5, z); o3.rotation.set(0, 0, 0); o3.updateMatrix(); crowd.setMatrixAt(i, o3.matrix); crowd.setColorAt(i, fanCols[i % fanCols.length]);
  }
  crowd.visible = false; crowd.frustumCulled = false; scene.add(crowd); nightOnly.push(crowd);
  footprints.push({ ellipse: true, x: SC.x, z: SC.z, rx: 148, rz: 124 });
}
function setGateOpen(open) { if (gateCollider) gateCollider.on = !open; if (gateBarrier) gateBarrier.userData.bar.visible = !open; }

/* ---------- venues ---------- */
function signBoard(text, x, z, ry, w, h, y, o) {
  const g = new T.Group(); g.position.set(x, 0, z); g.rotation.y = ry || 0;
  const s = signMesh(text, w, h, o); s.position.set(0, y, 0.17); g.add(s);
  const back = meshOf(roundedBox(w + 0.3, h + 0.3, 0.3, 0.1), M(0x232a63), true); back.position.y = y; g.add(back);
  for (const sx of [-1, 1]) { const p = meshOf(new T.CylinderGeometry(0.1, 0.12, y, 8), M(0x6a6e78, { metalness: 0.5, roughness: 0.4 }), true); p.position.set(sx * (w / 2 - 0.4), y / 2, 0); g.add(p); }
  scene.add(g);
  for (const sx of [-1, 1]) addCircle(x + Math.cos(ry || 0) * sx * (w / 2 - 0.4), z - Math.sin(ry || 0) * sx * (w / 2 - 0.4), 0.2, 'small');
  return g;
}
function parasol(x, z, hex, y) {
  const g = new T.Group(); g.position.set(x, 0, z);
  g.add(meshOf(new T.CylinderGeometry(0.05, 0.05, 2.6, 8), M(0xd8cfc0), true)); g.children[0].position.y = 1.3;
  const top = meshOf(new T.ConeGeometry(2.1, 0.7, 12, 1, true), M(hex, { side: T.DoubleSide, roughness: 0.85 }), true); top.position.y = 2.55; g.add(top);
  if (y !== false) { const t = meshOf(new T.CylinderGeometry(0.6, 0.6, 0.05, 16), M(0xf6f1e7), true); t.position.y = 0.75; g.add(t); }
  scene.add(g); addCircle(x, z, 0.7, 'small');
  return g;
}
let fanScreenTex = null, fanScreenIdx = -1;
function drawFanScreen(i) {
  const c = fanScreenTex.image.getContext('2d'), w = 1024, h = 576;
  const msgs = state.done ? [['LIVE', 'Kickoff at AfconCity'], ['ASANTE MASHABIKI', 'Thank you, fans'], ['PARTNER SLOT', 'Big screen · 30-second spot']]
    : [['KARIBU MASHABIKI', 'Welcome, fans'], [`${DAYS} DAYS`, 'until AFCON 2027 kicks off'], ['COIN RUSH', 'Every 3 minutes somewhere in Fumba'], ['PARTNER SLOT', 'Big screen · 30-second spot']];
  msgs.unshift(...eventScreenMsgs());
  const [a, b] = msgs[i % msgs.length];
  c.fillStyle = i % 2 ? '#232a63' : '#141838'; c.fillRect(0, 0, w, h); kangaEdge(c, w, h, 22);
  c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = a === 'PARTNER SLOT' || a === 'COIN RUSH' ? '#f3b41b' : '#f7ead0';
  fitFont(c, a, 900, 170, w - 120, FONT_D); c.fillText(a, w / 2, h / 2 - 34);
  c.fillStyle = '#f3b41b'; fitFont(c, b, 600, 48, w - 140, FONT_B); c.fillText(b, w / 2, h / 2 + 92);
  fanScreenTex.needsUpdate = true;
}
function buildFanZone() {
  flatShape(rectPts(FZ.x, FZ.z, FZ.w, FZ.d), groundMat(TEX.sand, 6, 4, 0xe8d3a6), 0.04);
  const sx = FZ.x, sz = FZ.z - 45;
  scene.add(at(meshOf(roundedBox(22, 1.6, 10, 0.3), M(0x232a63), true), sx, 0.8, sz)); addObb(sx, sz, 22, 10, 0);
  for (const s of [-1, 1]) { const sp = meshOf(roundedBox(2.2, 5, 2.2, 0.3), M(0x15161c), true); sp.position.set(sx + s * 9, 4.1, sz); scene.add(sp); const tr = meshOf(new T.CylinderGeometry(0.3, 0.3, 14, 8), M(0x9aa0ad, { metalness: 0.6, roughness: 0.35 }), true); tr.position.set(sx + s * 11.5, 7, sz - 4); scene.add(tr); addCircle(sx + s * 11.5, sz - 4, 0.4); }
  const c = mkCanvas(1024, 576); fanScreenTex = new T.CanvasTexture(c); fanScreenTex.encoding = T.sRGBEncoding; drawFanScreen(0); fanScreenIdx = 0;
  const scrMat = new T.MeshStandardMaterial({ map: fanScreenTex, emissive: 0xffffff, emissiveMap: fanScreenTex, emissiveIntensity: 0.75, roughness: 0.3 }); nightable(scrMat, 0.75, 1.3);
  const frame = meshOf(roundedBox(23.5, 13.6, 0.8, 0.3), M(0x15161c), true); frame.position.set(sx, 11.5, sz - 4.3); scene.add(frame);
  const scr = new T.Mesh(new T.PlaneGeometry(22, 12.4), scrMat); scr.position.set(sx, 11.5, sz - 3.85); scene.add(scr);
  const poles = [[FZ.x - 42, FZ.z - 30], [FZ.x + 42, FZ.z - 30], [FZ.x - 42, FZ.z + 40], [FZ.x + 42, FZ.z + 40]];
  poles.forEach(([x, z]) => { const p = meshOf(new T.CylinderGeometry(0.12, 0.15, 8, 8), M(0x7a4a2a), true); p.position.set(x, 4, z); scene.add(p); addCircle(x, z, 0.3, 'small'); });
  const tri = new T.BufferGeometry(); tri.setAttribute('position', new T.Float32BufferAttribute([-0.45, 0, 0, 0.45, 0, 0, 0, -0.9, 0], 3)); tri.computeVertexNormals();
  const flags = [];
  [[0, 1], [2, 3], [0, 2], [1, 3], [0, 3], [1, 2]].forEach(([i, j]) => { const a = poles[i], b = poles[j], n = Math.floor(Math.hypot(b[0] - a[0], b[1] - a[1]) / 1.4); for (let k = 1; k < n; k++) { const t = k / n; flags.push([lerp(a[0], b[0], t), 7.8 - Math.sin(t * Math.PI) * 2, lerp(a[1], b[1], t), Math.atan2(b[0] - a[0], b[1] - a[1]) + Math.PI / 2]); } });
  const fc = [0xe0553a, 0xf3b41b, 0x19b5b1, 0xf6f1e7, 0x1e9b57].map(C);
  const fm = new T.InstancedMesh(tri, new T.MeshStandardMaterial({ color: 0xffffff, side: T.DoubleSide, roughness: 0.9 }), flags.length), o3 = new T.Object3D();
  flags.forEach((f, i) => { o3.position.set(f[0], f[1], f[2]); o3.rotation.set(0, f[3], 0); o3.updateMatrix(); fm.setMatrixAt(i, o3.matrix); fm.setColorAt(i, fc[i % fc.length]); });
  fm.frustumCulled = false; scene.add(fm);
  for (let i = 0; i < 6; i++) parasol(FZ.x - 22 + (i % 3) * 22, FZ.z + 8 + Math.floor(i / 3) * 22, [0xf3b41b, 0xe0553a, 0x19b5b1][i % 3]);
  signBoard('FAN ZONE · MASHABIKI', FZ.x, FZ.z + 56, 0, 12, 2, 4.4);
  // fan shop stall
  const st = new T.Group(); st.position.set(SHOP.x, 0, SHOP.z);
  st.add(at(meshOf(roundedBox(6, 1.1, 1.6, 0.15), M(0x232a63), true), 0, 0.55, 1.2));
  const tent = meshOf(new T.ConeGeometry(4.6, 2.2, 4, 1, true), M(0xf3b41b, { side: T.DoubleSide }), true); tent.position.y = 3.8; tent.rotation.y = Math.PI / 4; st.add(tent);
  for (const [px, pz] of [[-2.9, -2.9], [2.9, -2.9], [-2.9, 2.9], [2.9, 2.9]]) { const p = meshOf(new T.CylinderGeometry(0.07, 0.07, 2.8, 6), M(0x6a6e78), true); p.position.set(px, 1.4, pz); st.add(p); }
  KITS.forEach((k, i) => { const j = meshOf(new T.PlaneGeometry(0.8, 0.9), M(k.shirt, { side: T.DoubleSide }), false); j.position.set(-2.2 + i * 0.88, 2.2, -2.85); st.add(j); });
  scene.add(st); addObb(SHOP.x, SHOP.z + 1.2, 6, 1.6, 0);
  const ss = signMesh('JEZI · FAN SHOP', 4, 0.8); ss.position.set(SHOP.x, 2.75, SHOP.z + 2.95); scene.add(ss);
  footprints.push({ x: FZ.x, z: FZ.z, w: FZ.w + 8, d: FZ.d + 8, ang: 0 });
}
function buildTraining() {
  PITCHES.forEach((TP, pi) => {
    flatShape(rectPts(TP.x, TP.z, TP.w + 12, TP.l + 12), groundMat(TEX.grass, 6, 3, 0xa8d884), 0.04);
    const p = new T.Mesh(new T.PlaneGeometry(TP.l + 6, TP.w + 6), new T.MeshStandardMaterial({ map: pitchTexture(TP.l, TP.w, 1), roughness: 0.92, polygonOffset: true, polygonOffsetFactor: -6, polygonOffsetUnits: -24 }));
    p.rotation.set(-Math.PI / 2, 0, Math.PI / 2); p.position.set(TP.x, 0.07, TP.z); p.receiveShadow = true; scene.add(p);
    goalFrame(TP.x, TP.z - TP.l / 2, 0); goalFrame(TP.x, TP.z + TP.l / 2, Math.PI);
    for (let i = 0; i < 3; i++) { const st = meshOf(roundedBox(1.4, 0.7 + i * 0.7, 30, 0.12), M(pi ? 0xf3b41b : 0x1aa7a2), true); st.position.set(TP.x - TP.w / 2 - 6 - i * 1.4, 0.35 + i * 0.35, TP.z); scene.add(st); }
    addObb(TP.x - TP.w / 2 - 7.4, TP.z, 4.4, 30, 0);
    // low perimeter fence posts and a couple of light masts
    for (const [mx, mz] of [[TP.x + TP.w / 2 + 4, TP.z - TP.l / 2 + 8], [TP.x + TP.w / 2 + 4, TP.z + TP.l / 2 - 8]]) { scene.add(at(meshOf(new T.CylinderGeometry(0.22, 0.35, 22, 8), M(0xb8bcc4, { metalness: 0.6, roughness: 0.35 }), true), mx, 11, mz)); scene.add(at(meshOf(new T.BoxGeometry(3.4, 1.6, 0.5), M(0xeeeeee), true), mx, 22, mz)); addCircle(mx, mz, 0.4); }
    footprints.push({ x: TP.x, z: TP.z, w: TP.w + 20, d: TP.l + 20, ang: 0 });
  });
  signBoard('MAZOEZI · PENALTY BETS', TRAIN.x + TRAIN.w / 2 + 12, PEN.gz + 16, -Math.PI / 2, 11, 1.8, 3.6);
}
function buildMarket() {
  const cols = [['#e0553a', '#f3b41b'], ['#19b5b1', '#f7ead0'], ['#232a63', '#f3b41b'], ['#1e9b57', '#f7ead0']];
  for (let k = 0; k < 6; k++) {
    const a = -0.9 + k * 0.42, x = MARKET.x + Math.cos(a) * 16, z = MARKET.z + Math.sin(a) * 16, ry = Math.atan2(MARKET.x - x, MARKET.z - z);
    const g = new T.Group(); g.position.set(x, 0, z); g.rotation.y = ry;
    g.add(at(meshOf(roundedBox(4.4, 1.1, 1.5, 0.12), M(0x7a4a2a), true), 0, 0.55, 0.6));
    const tex = texOf((() => { const c = mkCanvas(128, 64), x2 = c.getContext('2d'); for (let i = 0; i < 8; i++) { x2.fillStyle = cols[k % 4][i % 2]; x2.fillRect(i * 16, 0, 16, 64); } return c; })());
    const roof = meshOf(new T.BoxGeometry(5.2, 0.12, 3.4), new T.MeshStandardMaterial({ map: tex, roughness: 0.85 }), true); roof.position.y = 3.0; roof.rotation.x = -0.12; g.add(roof);
    for (const [px, pz] of [[-2.3, 1.4], [2.3, 1.4], [-2.3, -1.2], [2.3, -1.2]]) { const p = meshOf(new T.CylinderGeometry(0.06, 0.06, 3, 6), M(0x5c3319), true); p.position.set(px, 1.5, pz); g.add(p); }
    for (let f = 0; f < 6; f++) { const fr = meshOf(new T.SphereGeometry(0.16, 8, 6), M([0xf3b41b, 0xe0553a, 0x7cbf3a, 0xff9a2a][f % 4]), false); fr.position.set(-1.6 + f * 0.6, 1.2, 0.7); g.add(fr); }
    scene.add(g); addCircle(x, z, 2.4);
  }
  const pan = new T.Group(); pan.position.set(MARKET.x + 7.2, 0, MARKET.z - 8);
  pan.add(at(meshOf(roundedBox(1.7, 0.95, 1.7, 0.12), M(0x5c3319), true), 0, 0.48, 0));
  pan.add(at(meshOf(new T.CylinderGeometry(0.72, 0.72, 0.1, 24), M(0x1c1c22, { metalness: 0.6, roughness: 0.4 }), false), 0, 1.0, 0));
  pan.add(at(meshOf(new T.CylinderGeometry(0.42, 0.42, 0.06, 4), M(0xf3c46b), false), 0, 1.07, 0));
  scene.add(pan); addCircle(MARKET.x + 7.2, MARKET.z - 8, 1.1);
  for (let i = 0; i < 4; i++) parasol(MARKET.x - 8 + i * 6, MARKET.z + 10 + (i % 2) * 4, [0xf3b41b, 0x19b5b1, 0xe0553a][i % 3]);
  signBoard('UPTOWN PARK · PIZZA RUNS', MARKET.x - 28, MARKET.z - 30, 0.9, 13, 1.8, 3.6);
  footprints.push({ x: MARKET.x, z: MARKET.z, w: 46, d: 46, ang: 0 });
}
const barLights = [];
function buildBar() {
  const g = new T.Group(); g.position.set(BAR.x, 0, BAR.z);
  const deck = meshOf(roundedBox(18, 0.4, 13, 0.1), new T.MeshStandardMaterial({ color: C(0x9a6a43), roughness: 0.8 }), true); deck.position.y = 0.2; g.add(deck);
  const roof = meshOf(new T.ConeGeometry(11.5, 4.2, 6, 1, true), new T.MeshStandardMaterial({ map: (() => { const t = TEX.thatch.clone(); t.needsUpdate = true; t.repeat.set(3, 1); return t; })(), roughness: 0.95, side: T.DoubleSide }), true);
  roof.position.y = 6.6; roof.scale.z = 0.72; g.add(roof);
  for (let i = 0; i < 6; i++) { const a = i / 6 * TAU + Math.PI / 6, p = meshOf(new T.CylinderGeometry(0.16, 0.2, 4.6, 8), M(0x6b4a2a), true); p.position.set(Math.cos(a) * 8.2, 2.5, Math.sin(a) * 5.9); g.add(p); addCircle(BAR.x + Math.cos(a) * 8.2, BAR.z + Math.sin(a) * 5.9, 0.22, 'small'); }
  const counter = meshOf(new T.CylinderGeometry(3.3, 3.3, 1.15, 28, 1, true), new T.MeshStandardMaterial({ color: C(0x7a4a2a), roughness: 0.6, side: T.DoubleSide }), true); counter.position.y = 0.97; g.add(counter);
  const ctop = meshOf(new T.RingGeometry(2.7, 3.55, 32), new T.MeshStandardMaterial({ color: C(0x3b2a1a), roughness: 0.3, metalness: 0.1, side: T.DoubleSide }), true); ctop.rotation.x = -Math.PI / 2; ctop.position.y = 1.56; g.add(ctop);
  const shelf = meshOf(new T.CylinderGeometry(0.9, 0.9, 2.2, 16), M(0x5c3319), true); shelf.position.y = 1.5; g.add(shelf);
  const bottleCols = [0x2e7d32, 0x6d4c41, 0xf3b41b, 0x1565c0, 0xc62828];
  const props = new Builder();
  for (let i = 0; i < 18; i++) { const a = i / 18 * TAU; props.add(new T.CylinderGeometry(0.06, 0.07, 0.32, 8), mat4(Math.cos(a) * 0.95, 1.85 + (i % 2) * 0.45, Math.sin(a) * 0.95, 0), C(bottleCols[i % 5])); }
  for (let i = 0; i < 10; i++) { const a = i / 10 * TAU; props.add(new T.CylinderGeometry(0.25, 0.2, 0.08, 12), mat4(Math.cos(a) * 4.0, 1.05, Math.sin(a) * 4.0, 0), C(0xd8452c)); props.add(new T.CylinderGeometry(0.04, 0.04, 0.85, 6), mat4(Math.cos(a) * 4.0, 0.62, Math.sin(a) * 4.0, 0), C(0x3a3a40)); }
  g.add(meshOf(props.build(), new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.3, metalness: 0.2 }), true));
  scene.add(g);
  addCircle(BAR.x, BAR.z, 3.5);
  const bulbMat = new T.MeshStandardMaterial({ color: 0xffffff, emissive: C(0xffc070), emissiveIntensity: 0.4 }); nightable(bulbMat, 0.4, 4);
  const bulbs = new T.InstancedMesh(new T.SphereGeometry(0.09, 8, 6), bulbMat, 72), o3 = new T.Object3D();
  for (let i = 0; i < 72; i++) { const a = i / 72 * TAU; o3.position.set(BAR.x + Math.cos(a) * 8.6, 4.55 - Math.abs(Math.sin(a * 3)) * 0.5, BAR.z + Math.sin(a) * 6.2); o3.updateMatrix(); bulbs.setMatrixAt(i, o3.matrix); }
  scene.add(bulbs);
  const lamp = new T.PointLight(C(0xffb866), 0, 26, 1.5); lamp.position.set(BAR.x, 4, BAR.z); scene.add(lamp); barLights.push(lamp);
  signBoard('MAMA PWANI BEACH BAR', BAR.x - 2, BAR.z - 9.5, 0.12, 9, 1.6, 3.4, { bg: '#7a4a2a' });
  footprints.push({ x: BAR.x, z: BAR.z, w: 22, d: 18, ang: 0 });
}
function buildClinic() {
  const g = new T.Group(); g.position.set(CLINIC.x, 0, CLINIC.z);
  const w = meshOf(roundedBox(14, 4.2, 10, 0.2), new T.MeshStandardMaterial({ map: TEX.plaster, color: 0xffffff, roughness: 0.9 }), true); w.position.y = 2.1; g.add(w);
  const band = meshOf(new T.BoxGeometry(14.1, 0.5, 10.1), M(0x1e9b57), true); band.position.y = 3.6; g.add(band);
  const doorG = meshOf(new T.PlaneGeometry(2.4, 2.6), glassMat, false); doorG.position.set(0, 1.4, 5.02); g.add(doorG);
  scene.add(g); addObb(CLINIC.x, CLINIC.z, 14, 10, 0);
  const cross = signMesh('+', 2.2, 2.2, { bg: '#1e9b57', edge: false }); cross.position.set(CLINIC.x, 5.6, CLINIC.z + 5.05); scene.add(cross);
  const s = signMesh('KLINIKI · CLINIC', 7, 1.1, { bg: '#1e9b57' }); s.position.set(CLINIC.x, 3.25, CLINIC.z + 5.06); scene.add(s);
  footprints.push({ x: CLINIC.x, z: CLINIC.z, w: 18, d: 16, ang: 0 });
}
function buildKiosk() {
  const x = KIOSK.x, z = KIOSK.z;
  const k = meshOf(roundedBox(7, 4, 5, 0.3), M(0xf3b41b), true); k.position.set(x, 2, z); scene.add(k); addObb(x, z, 7, 5, 0);
  const r = meshOf(roundedBox(7.8, 0.4, 5.8, 0.15), M(0xf6f1e7), true); r.position.set(x, 4.2, z); scene.add(r);
  const win = new T.Mesh(new T.PlaneGeometry(3.2, 1.4), glassLitMat); win.position.set(x - 3.52, 2.1, z); win.rotation.y = -Math.PI / 2; scene.add(win);
  const s = signMesh('TIKETI · TICKETS', 6, 1.1); s.position.set(x - 3.58, 3.5, z); s.rotation.y = -Math.PI / 2; scene.add(s);
  signBoard('BAJAJI RACE · START', RACE_START.x + 2, RACE_START.z + 5, 0.42, 9, 1.5, 3.4, { bg: '#d8452c' });
}
function buildStands() {
  for (const s of STANDS) {
    const g = new T.Group(); g.position.set(s.x, 0, s.z); g.rotation.y = s.ry;
    const roof = meshOf(roundedBox(9, 0.2, 4.4, 0.08), M(0xd8452c), true); roof.position.set(0, 3.1, -3.4); g.add(roof);
    for (const px of [-4.2, 4.2]) { const p = meshOf(new T.CylinderGeometry(0.08, 0.08, 3.1, 8), M(0x6a6e78, { metalness: 0.5 }), true); p.position.set(px, 1.55, -5.4); g.add(p); }
    const sg = signMesh(s.id === 'park' ? 'BODA BODA · RENT' : 'BAJAJI & BODA · RENT', 6, 0.9, { bg: '#d8452c' }); sg.position.set(0, 3.7, -3.4); g.add(sg);
    scene.add(g);
  }
}
/* ---------- where roads leave the playable map: a roadblock instead of an invisible wall ---------- */
function buildRoadEnds() {
  const c = mkCanvas(256, 32), g = c.getContext('2d');
  for (let i = -1; i < 17; i++) { g.fillStyle = i % 2 ? '#f4f1ea' : '#d8352a'; g.beginPath(); g.moveTo(i * 16, 32); g.lineTo(i * 16 + 16, 0); g.lineTo(i * 16 + 32, 0); g.lineTo(i * 16 + 16, 32); g.closePath(); g.fill(); }
  const stripe = texOf(c); stripe.wrapS = T.RepeatWrapping;
  const legM = M(0x2b2e36, { metalness: 0.4, roughness: 0.5 }), coneM = M(0xf06a1a, { roughness: 0.6 });
  const lines = [{ k: 'x', v: BOUNDS.x0 + 8 }, { k: 'x', v: BOUNDS.x1 - 8 }, { k: 'z', v: BOUNDS.z0 + 8 }];
  for (const r of WORLD.roads) {
    if (r.c !== 'T' && r.c !== 'R' && r.c !== 'S') continue;
    const w = ROAD[r.c].w + 2.4;
    for (let i = 0; i < r.p.length - 1; i++) {
      const [x0, z0] = r.p[i], [x1, z1] = r.p[i + 1];
      for (const ln of lines) {
        const a0 = ln.k === 'x' ? x0 : z0, a1 = ln.k === 'x' ? x1 : z1;
        if ((a0 - ln.v) * (a1 - ln.v) > 0 || a0 === a1) continue;
        const t = (ln.v - a0) / (a1 - a0), x = lerp(x0, x1, t), z = lerp(z0, z1, t);
        if (ln.k === 'x' && (z < BOUNDS.z0 || z > coastZ(x) - 2)) continue;
        if (ln.k === 'z' && (x < BOUNDS.x0 || x > BOUNDS.x1)) continue;
        const L = Math.hypot(x1 - x0, z1 - z0) || 1, dx = (x1 - x0) / L, dz = (z1 - z0) / L;
        const grp = new T.Group(); grp.position.set(x, 0, z); grp.rotation.y = Math.atan2(dx, dz);
        const tex = stripe.clone(); tex.needsUpdate = true; tex.repeat.set(w / 2.2, 1);
        const bar = meshOf(roundedBox(w, 0.42, 0.14, 0.05, 1), new T.MeshStandardMaterial({ map: tex, roughness: 0.5 }), true); bar.position.y = 1.0; grp.add(bar);
        for (const sx of [-0.42, 0, 0.42]) { const leg = meshOf(new T.CylinderGeometry(0.05, 0.06, 1.1, 6), legM, true); leg.position.set(sx * w, 0.55, 0); grp.add(leg); }
        for (const sx of [-0.3, 0.3]) { const cone = meshOf(new T.ConeGeometry(0.22, 0.75, 12), coneM, true); cone.position.set(sx * w, 0.38, 1.6); grp.add(cone); }
        const sign = signMesh('BARABARA IMEFUNGWA · ROAD CLOSED', 4.2, 0.7, { bg: '#d8352a', fg: '#ffffff' }); sign.position.set(0, 1.75, 0.08); grp.add(sign);
        scene.add(grp);
        addObb(x, z, w, 0.8, Math.atan2(-dx, dz));
      }
    }
  }
}
function buildTrafiki() {
  const g = new T.Group(); g.position.set(TRAFIKI.ox, 0, TRAFIKI.oz);
  const tbl = meshOf(roundedBox(1.4, 0.08, 0.8, 0.03), M(0xf6f1e7), true); tbl.position.y = 0.78; g.add(tbl);
  for (const [px, pz] of [[-0.6, -0.3], [0.6, -0.3], [-0.6, 0.3], [0.6, 0.3]]) { const l = meshOf(new T.CylinderGeometry(0.03, 0.03, 0.78, 6), M(0x6a6e78), false); l.position.set(px, 0.39, pz); g.add(l); }
  scene.add(g); addObb(TRAFIKI.ox, TRAFIKI.oz, 1.4, 0.8, 0, 'small');
  parasol(TRAFIKI.ox - 1.5, TRAFIKI.oz + 0.8, 0xf6f1e7, false);
  const dir = new T.Vector2(281, -130).normalize();
  for (const s of [-1, 1]) {
    const px = TRAFIKI.x + dir.x * 60 * s + dir.y * 6.5 * (s > 0 ? -1 : 1), pz = TRAFIKI.z + dir.y * 60 * s - dir.x * 6.5 * (s > 0 ? -1 : 1);
    const pole = meshOf(new T.CylinderGeometry(0.05, 0.05, 2.6, 8), M(0x9aa0a8, { metalness: 0.6 }), true); pole.position.set(px, 1.3, pz); scene.add(pole);
    const plate = new T.Mesh(new T.CircleGeometry(0.42, 24), new T.MeshStandardMaterial({ map: (() => { const c = mkCanvas(128, 128), x = c.getContext('2d'); x.fillStyle = '#fff'; x.beginPath(); x.arc(64, 64, 62, 0, TAU); x.fill(); x.strokeStyle = '#d0281e'; x.lineWidth = 14; x.beginPath(); x.arc(64, 64, 54, 0, TAU); x.stroke(); x.fillStyle = '#111'; x.font = `900 58px ${FONT_D}`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('50', 64, 68); return texOf(c, { clamp: true }); })(), roughness: 0.5, side: T.DoubleSide }));
    plate.position.set(px, 2.6, pz); plate.rotation.y = Math.atan2(dir.x * -s, dir.y * -s); scene.add(plate);
    addCircle(px, pz, 0.12, 'small');
  }
}
const dhows = [];
function makeDhow() {
  const g = new T.Group(), hull = new T.BoxGeometry(2.8, 1.4, 11, 2, 1, 8), pos = hull.attributes.position;
  for (let i = 0; i < pos.count; i++) { const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i), t = Math.abs(z) / 5.5; pos.setX(i, x * (1 - t * t * 0.85) * (y < 0 ? 0.55 : 1)); pos.setY(i, y + t * t * 0.8 * (z < 0 ? 1.5 : 1)); }
  hull.computeVertexNormals();
  g.add(meshOf(hull, M(0x6b4226, { roughness: 0.7 }), true));
  g.add(at(meshOf(new T.BoxGeometry(2.3, 0.14, 6.5), M(0xa8784e), true), 0, 0.6, 0.5));
  const mast = meshOf(new T.CylinderGeometry(0.1, 0.14, 8, 8), M(0x5c3a22), true); mast.position.set(0, 4.3, -0.8); mast.rotation.x = -0.12; g.add(mast);
  const sail = new T.BufferGeometry(); sail.setAttribute('position', new T.Float32BufferAttribute([0, 8.2, -4.4, 0, 1.8, 4.2, 0, 1.6, -1.8], 3)); sail.computeVertexNormals();
  const sm = meshOf(sail, M(0xf2e6cc, { side: T.DoubleSide, roughness: 0.95 }), true); sm.position.x = 0.14; sm.rotation.y = 0.25; g.add(sm);
  return g;
}
function buildBeach() {
  [[-40, 455, 0xe0553a], [26, 445, 0xf3b41b], [60, 432, 0x19b5b1], [-150, 432, 0xe0553a], [140, 410, 0xf3b41b], [-190, 420, 0x19b5b1]].forEach(([x, z, c]) => {
    const cz = coastZ(x); if (z > cz - 9) z = cz - 11;
    parasol(x, z, c, false);
    for (const o of [-0.9, 0.9]) { const l = meshOf(roundedBox(0.75, 0.25, 2.0, 0.08), M(0xf6f1e7), true); l.position.set(x + 1.6 + o, 0.3, z + 0.6); l.rotation.x = -0.08; scene.add(l); }
  });
  signBoard('KARIBU FUMBA UPTOWN', -26, 428, 0, 11, 2, 4.2);
  const d0 = makeDhow(); d0.position.set(18, -0.05, coastZ(18) - 1.5); d0.rotation.y = 0.5; d0.rotation.z = 0.1; scene.add(d0); addCircle(18, coastZ(18) - 2, 2.6);
  for (const [x, z, sp] of [[-300, 640, 3], [420, 560, -2.4], [80, 900, 2], [-700, 820, 2.6]]) { const d = makeDhow(); d.position.set(x, 0, z); d.rotation.y = sp > 0 ? Math.PI / 2 : -Math.PI / 2; d.userData.sp = sp; d.userData.dynamic = true; scene.add(d); dhows.push(d); }
  const rockM = new T.MeshStandardMaterial({ color: C(0x6e665c), roughness: 0.95 });
  for (let i = 0; i < 60; i++) { const x = rr(BOUNDS.x0, BOUNDS.x1), z = coastZ(x) + rr(-1, 4); const r = meshOf(new T.DodecahedronGeometry(rr(0.4, 1.4), 0), rockM, true); r.position.set(x, -0.1, z); r.rotation.set(rnd(), rnd(), rnd()); r.scale.y = 0.6; scene.add(r); }
}

/* ---------- map image used by the radar and the full map ---------- */
const MAP = { x0: -1480, x1: 780, z0: -1000, z1: 520, k: 0.9 };
const mapCanvas = mkCanvas(Math.round((MAP.x1 - MAP.x0) * MAP.k), Math.round((MAP.z1 - MAP.z0) * MAP.k));
function drawMapBase() {
  const c = mapCanvas.getContext('2d'), w = mapCanvas.width, h = mapCanvas.height, X = x => (x - MAP.x0) * MAP.k, Z = z => (z - MAP.z0) * MAP.k;
  c.fillStyle = '#1b7c93'; c.fillRect(0, 0, w, h);
  const poly = (pts, col) => { c.beginPath(); pts.forEach((p, i) => i ? c.lineTo(X(p[0]), Z(p[1])) : c.moveTo(X(p[0]), Z(p[1]))); c.closePath(); c.fillStyle = col; c.fill(); };
  poly([[-3600, WORLD.coast[0][1]]].concat(WORLD.coast, [[3600, WORLD.coast[WORLD.coast.length - 1][1]], [3600, -3600], [-3600, -3600]]), '#7f9b5c');
  c.strokeStyle = 'rgba(52,208,196,0.6)'; c.lineWidth = 16 * MAP.k; c.beginPath(); WORLD.coast.forEach((p, i) => i ? c.lineTo(X(p[0]), Z(p[1] + 9)) : c.moveTo(X(p[0]), Z(p[1] + 9))); c.stroke();
  for (const rg of WORLD.beach) poly(rg, '#e0c999');
  const ZC = { forest: '#5b8048', shrub: '#7f9b5c', grass: '#93ad6c', barren: '#b8a57c', crop: '#a3b46a', wet: '#6f9a86', urban: '#a8a28e', res: '#b9b49c', park: '#6fae55', ind: '#a9a497', ped: '#cfc4ae' };
  for (const k of ['grass', 'shrub', 'crop', 'barren', 'forest', 'wet', 'urban', 'res', 'park', 'ind', 'ped']) for (const z of WORLD.zones) if (z.k === k) poly(z.p, ZC[k]);
  poly(PLOT, '#8fb46a');
  poly(ellipsePts(SC.x, SC.z, S_OUT.rx + 18, S_OUT.rz + 16, 80), '#d6ccb6'); poly(rectPts(PLAZA.x, PLAZA.z, PLAZA.w, PLAZA.d), '#d6ccb6');
  for (const L of PARKS) poly(rectPts(L.x, L.z, L.w, L.d), '#55585f');
  for (const TP of PITCHES) poly(rectPts(TP.x, TP.z, TP.w + 6, TP.l + 6), '#4f9f55');
  poly(rectPts(PARADE.x, PARADE.z, PARADE.w, PARADE.d), '#c9c6bd'); poly(rectPts(AQUA.x, AQUA.z, AQUA.w, AQUA.d), '#5f8fc8');
  poly(rectPts(FZ.x, FZ.z, FZ.w, FZ.d), '#d9c592');
  c.lineCap = 'round'; c.lineJoin = 'round';
  for (const k of ['K', 'F', 'S', 'R', 'T']) for (const r of WORLD.roads) { if (r.c !== k) continue; c.strokeStyle = { T: '#2c2f3b', R: '#4b4f5d', S: '#5d606c', K: '#a98559', F: '#cdbb92' }[k]; c.lineWidth = ROAD[k].w * MAP.k; c.beginPath(); r.p.forEach((p, i) => i ? c.lineTo(X(p[0]), Z(p[1])) : c.moveTo(X(p[0]), Z(p[1]))); c.stroke(); }
  for (const [x, z, w, d, a, kind] of WORLD.blds) { c.save(); c.translate(X(x), Z(z)); c.rotate(a); c.fillStyle = (kind === 'industrial' || w * d > 1500) ? '#5f8fc8' : '#efe9de'; c.strokeStyle = '#1f2230'; c.lineWidth = 1; rrect(c, -w / 2 * MAP.k, -d / 2 * MAP.k, w * MAP.k, d * MAP.k, Math.min(2, w * MAP.k / 4)); c.fill(); c.stroke(); c.restore(); }
  drawFutureMap(c, X, Z);
  poly(ellipsePts(SC.x, SC.z, S_OUT.rx, S_OUT.rz, 80), '#e2a514'); poly(ellipsePts(SC.x, SC.z, S_IN.rx, S_IN.rz, 80), '#3d9a4a');
  c.fillStyle = '#cfc4ae'; c.fillRect(X(SC.x - 5), Z(SC.z + S_IN.rz - 2), 10 * MAP.k, (S_OUT.rz - S_IN.rz + 6) * MAP.k);
  c.fillStyle = '#9a6a43'; c.beginPath(); c.ellipse(X(BAR.x), Z(BAR.z), 9 * MAP.k, 6.5 * MAP.k, 0, 0, TAU); c.fill();
}
function drawMapLabels(c) {
  const X = x => (x - MAP.x0) * MAP.k, Z = z => (z - MAP.z0) * MAP.k;
  c.font = `800 ${Math.round(14 * MAP.k)}px ${FONT_D}`; c.textAlign = 'center'; c.textBaseline = 'alphabetic';
  const label = (t, x, z) => { c.lineWidth = 4; c.strokeStyle = 'rgba(247,234,208,0.85)'; c.strokeText(t, X(x), Z(z)); c.fillStyle = '#141838'; c.fillText(t, X(x), Z(z)); };
  label('AFCONCITY STADIUM', SC.x, SC.z + 4); label('TRAINING', TRAIN.x, (PITCHES[0].z + PITCHES[1].z) / 2 + 4); label('AQUATIC CENTRE', AQUA.x, AQUA.z - 26); label('PARADE GROUND', PARADE.x, PARADE.z + 4); label('PARKING', PARKS[0].x, PARKS[0].z + 4);
  label('FAN ZONE', FZ.x, FZ.z + 20); label('USIKU MARKET', 205, 105); label('BEACH', -30, 472); label('FUMBA UPTOWN', -60, 250); label('WEST VILLAS', -820, 300); label('FUMBA ROAD', -560, -240);
  label('CONTINENTAL MALL', MALL.x, MALL.z + 4); label('BURJ ZANZIBAR', BURJ.x, BURJ.z + 44); label('IIT MADRAS', IIT.x, IIT.z + 4); label('AFCONCITY HOTEL', HOTEL.x, HOTEL.z + 34); label('HOSPITAL', HOSP.x, HOSP.z + 4);
  label('ZHC TOWERS', ZHC.x, ZHC.z + 4); label('BASKETBALL', ARENA.x, ARENA.z + 4); label('FILM STUDIOS', FILM.x, FILM.z + 4); label('SPICE FARM', SPICE.x, SPICE.z + 4); label('SEAWEED FLATS', (TIDE.x0 + TIDE.x1) / 2, coastZ((TIDE.x0 + TIDE.x1) / 2) + 30); label('PIER', PIER.x, coastZ(PIER.x) + 80);
}

