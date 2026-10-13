/* ===================== 00 core: utils, data, renderer, sky, textures, geometry ===================== */
const $ = s => document.querySelector(s);
const loadNote = $('#loadNote');
function failBoot(msg) { loadNote.hidden = false; loadNote.textContent = msg; const b = $('#btnPlay'); b.textContent = 'Unavailable'; b.disabled = true; }
if (!window.THREE) { failBoot('The 3D engine could not load. Check your connection and reload the page.'); return; }
const T = window.THREE;

const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const damp = (a, b, l, dt) => lerp(a, b, 1 - Math.exp(-l * dt));
const smooth = t => t * t * (3 - 2 * t);
const TAU = Math.PI * 2;
const angWrap = a => ((a + Math.PI) % TAU + TAU) % TAU - Math.PI;
function angDamp(a, b, l, dt) { return a + angWrap(b - a) * (1 - Math.exp(-l * dt)); }
function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const rnd = mulberry32(2027);
const rr = (a, b) => a + (b - a) * rnd();
const pick = arr => arr[Math.floor(rnd() * arr.length)];
const hash2 = (x, z) => { const s = Math.sin(x * 12.9898 + z * 78.233) * 43758.5453; return s - Math.floor(s); };
const isCoarse = matchMedia('(pointer: coarse)').matches;
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const C = hex => new T.Color(hex).convertSRGBToLinear();
const fmt = n => Math.round(n).toLocaleString('en-US');
const tsh = n => 'TSh ' + fmt(n);
const roundTo = (n, s) => Math.round(n / s) * s;
function hashStr(s) { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return h; }
function segDist(px, pz, ax, az, bx, bz) { const dx = bx - ax, dz = bz - az, l2 = dx * dx + dz * dz; const t = l2 ? clamp(((px - ax) * dx + (pz - az) * dz) / l2, 0, 1) : 0; return Math.hypot(px - ax - t * dx, pz - az - t * dz); }
function pointInPoly(x, z, pts) { let ins = false; for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) { const [xi, zi] = pts[i], [xj, zj] = pts[j]; if ((zi > z) !== (zj > z) && x < (xj - xi) * (z - zi) / ((zj - zi) || 1e-9) + xi) ins = !ins; } return ins; }
function daysToKickoff() { const n = new Date(), k = new Date(2027, 5, 19); return Math.max(0, Math.round((Date.UTC(k.getFullYear(), k.getMonth(), k.getDate()) - Date.UTC(n.getFullYear(), n.getMonth(), n.getDate())) / 86400000)); }
const DAYS = daysToKickoff();

/* ---------- real Fumba Uptown: Overture Maps 2026-09 (OpenStreetMap ODbL, Google Open Buildings CC BY 4.0), local metres rotated so the coast runs along x ---------- */
const WORLD = /*WORLD*/null;
const GEO = { lat: -6.30612, lon: 39.26962, ang: -0.9424777960769379, kx: 110650.6, kz: 110574 };
const NORTH = { x: -0.809, z: -0.588 };
const WEST = { x: -0.588, z: 0.809 };
const BOUNDS = { x0: -1440, x1: 740, z0: -960 };
const coastXs = WORLD.coast.map(p => p[0]);
function coastZ(x) {
  const c = WORLD.coast;
  if (x <= c[0][0]) return c[0][1];
  if (x >= c[c.length - 1][0]) return c[c.length - 1][1];
  let lo = 0, hi = c.length - 1;
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (coastXs[m] <= x) lo = m; else hi = m; }
  const a = c[lo], b = c[hi];
  return lerp(a[1], b[1], (x - a[0]) / ((b[0] - a[0]) || 1));
}
function toLatLon(x, z) { const ca = Math.cos(GEO.ang), sa = Math.sin(GEO.ang); const ex = x * ca + z * sa, ez = -x * sa + z * ca; return [GEO.lat - ez / GEO.kz, GEO.lon + ex / GEO.kx]; }

/* ---------- AfconCity: Zanzibar Sports City on its real plot beside the Fumba road (layout inside the plot is our interpretation) ---------- */
const PLOT = WORLD.plot;
const SC = { x: -1035, z: -600 };
const S_IN = { rx: 80, rz: 56 }, S_OUT = { rx: 128, rz: 104 }, S_GAP = 0.082;
const GATE = { x: SC.x, z: SC.z + S_OUT.rz };
const PLAZA = { x: SC.x, z: -452, w: 236, d: 74 };
const BLVD = { x: SC.x, z0: -244, z1: PLAZA.z + PLAZA.d / 2 };
const PITCHES = [{ x: -832, z: -638, w: 68, l: 105 }, { x: -832, z: -502, w: 68, l: 105 }];
const TRAIN = PITCHES[0];
const PEN = { gx: TRAIN.x, gz: TRAIN.z - TRAIN.l / 2, spotZ: TRAIN.z - TRAIN.l / 2 + 11 };
const AQUA = { x: -1068, z: -800, w: 66, d: 38 };
const PARADE = { x: -880, z: -796, w: 150, d: 76 };
const PARKS = [{ x: -1135, z: -356, w: 196, d: 96 }, { x: -850, z: -352, w: 110, d: 96 }];
const KIOSK = { x: SC.x + 52, z: PLAZA.z + 8 };
/* ---------- Fumba Uptown places (imagined venues on the real streets) ---------- */
const FZ = { x: -330, z: -95, w: 100, d: 110 };
const MARKET = { x: 200, z: 55 };
const BAR = { x: -92, z: 442 };
/* you arrive by daladala at the east end of Fumba Road and head west into AfconCity */
const START = { x: 589, z: -106.4, ry: -Math.PI / 2 };
const CLINIC = { x: -150, z: -88 };
const SHOP = { x: -362, z: -52 };
const TRAFIKI = { x: -60, z: -86.5, ox: -55.5, oz: -78.5 };
const STANDS = [
  { id: 'beach', name: 'Beach stand', x: 34, z: 430, ry: -1.2, kinds: ['bajaji', 'boda'] },
  { id: 'fz', name: 'Fan Zone stand', x: -296, z: 8, ry: 1.0, kinds: ['bajaji', 'boda'] },
  { id: 'park', name: 'Uptown Park stand', x: 226, z: 22, ry: 0.2, kinds: ['boda'] },
  { id: 'afcon', name: 'AfconCity stand', x: SC.x + 30, z: -404, ry: Math.PI, kinds: ['bajaji', 'boda'] },
  { id: 'gate', name: 'Uptown Gate stand', x: 628, z: -99.6, ry: 0, kinds: ['boda', 'bajaji'] },
];
/* ---------- Greater Fumba: real planned projects (placement on the empty plots is ours) ---------- */
const MALL = { x: -400, z: -585, w: 250, d: 140 };
const BURJ = { x: -1322, z: 150, w: 34, d: 26, h: 96 };
const IIT = { x: 395, z: -285, w: 170, d: 110 };
const HOTEL = { x: -1005, z: -128, w: 118, d: 22 };
const HOSP = { x: -100, z: -375, w: 72, d: 40 };
const ZHC = { x: 320, z: -800 };
const ARENA = { x: -1372, z: -700, w: 90, d: 64 };
const FILM = { x: -990, z: 128, w: 200, d: 150 };
const HIGHWAY = { x0: 430, x1: 640 };
/* ---------- Zanzibar experiences ---------- */
const SPICE = { x: -680, z: -30, w: 320, d: 70 };
const PIER = { x: 112, len: 70, w: 3.6 };
const TIDE = { x0: 228, x1: 425, depth: 44 };
const STOPS = [
  { id: 'uptown', name: 'Uptown Gate', x: 600, z: -113.7, side: 1 },
  { id: 'junction', name: 'Fumba Junction', x: 0, z: -157.6, side: 1 },
  { id: 'fanzone', name: 'Fan Zone', x: -330, z: -182.7, side: 1 },
  { id: 'afcon', name: 'AfconCity Stadium', x: -1005, z: -239.4, side: -1 },
  { id: 'town', name: 'Fumba Town road', x: -1250, z: -36.5, side: 1 },
  { id: 'beach', name: 'Pwani · Beach', x: -20, z: 411.6, side: 1 },
];
const RACE_START = { x: -196, z: -26 };
const RACE_CPS = [[-262, 12], [-238, 88], [-183, 117], [-69, 193], [-62, 283], [15, 317], [33, 150], [52, -7], [64, -110], [-40, -96], [-150, -46]];
const RUSH_SPOTS = [
  { name: 'Uptown Park', x: 205, z: 95, r: 42 },
  { name: 'the Fan Zone', x: -330, z: -90, r: 40 },
  { name: 'the beach', x: -40, z: 452, r: 46 },
  { name: 'the AfconCity plaza', x: SC.x, z: PLAZA.z, r: 60 },
  { name: 'the west villas', x: -820, z: 330, r: 50 },
];
const KITS = [
  { name: 'Taifa green', shirt: 0x1e9b57, shorts: 0x141838, trim: 0xf3b41b, css: '#1e9b57', price: 0 },
  { name: 'Kilimanjaro gold', shirt: 0xf3b41b, shorts: 0x1e4fa0, trim: 0x141838, css: '#f3b41b', price: 30000 },
  { name: 'Ocean blue', shirt: 0x1f8fd0, shorts: 0xf6f1e7, trim: 0xf6f1e7, css: '#1f8fd0', price: 30000 },
  { name: 'Clove red', shirt: 0xd8452c, shorts: 0x141838, trim: 0xf6f1e7, css: '#d8452c', price: 35000 },
  { name: 'Dhow white', shirt: 0xf3efe6, shorts: 0x2a3270, trim: 0x22c2b8, css: '#f3efe6', price: 45000 },
  { name: 'Midnight', shirt: 0x15161c, shorts: 0x15161c, trim: 0xf3b41b, css: '#15161c', price: 60000 },
];
/* real Zanzibar prices in Tanzanian shillings (2026): fares, food, tours, fines, rentals. US$1 is about TSh 2,600 */
/* what work pays: raised a little so a VIP ticket is reachable in an evening of play */
const PAY = { site: 35000, volunteer: 40000, raceGold: 70000, raceSilver: 30000, pizzaBase: 6000, pizzaBonus: 6000, taxiBase: 3000, taxiPerM: 8, weed: 1000, weedPremium: 1400, coin: 1000, rushCoin: 3000, bundle: 15000, stash: 7000 };
const PRICES = {
  vip: 1000000, start: 100000, daladala: 700, bodaRide: 3000, bajaji: 35000, boda: 25000, raceFee: 5000,
  clinicMin: 15000, clinicMax: 40000, fine: 30000, repair: 15000, bounty: 5000,
  spice: 50000, dhow: 65000, safari: 227000, prison: 53000, jozani: 39000, stonetown: 30000, kanga: 15000, henna: 15000,
  coconutBuy: 1000, coconutSell: 3500,
  hesabu: 15000, policeFine: 50000, beachPrize: 15000, fishKit: 5000, bait: 2000, delivery: 2000,
};

/* ---------- state ---------- */
const SAVE_KEY = 'afconcity-fumba-v4', SAVE_V = 4;
function defaultState() {
  return { v: SAVE_V, cash: PRICES.start, hp: 100, kit: 0, owned: [0], nick: '', ticket: false, done: false, intro: false, x: START.x, z: START.z, ry: START.ry, playMs: 0, night: false,
    stamps: {}, seen: {}, ate: {}, bought: {}, spices: {}, kg: 0, coconuts: 0, quiz: 0, look: { f: false, s: 3, h: 'short' }, bank: 0, food: 100, gear: { line: false, bait: 0 }, fish: [], souvenirs: [],
    stats: { earned: 0, spent: 0, lost: 0, jobs: 0, coins: 0, thieves: 0, best: 0, kg: 0, sold: 0 }, tips: {} };
}
let state = defaultState();
function readSave() { try { const s = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null'); if (s && s.v === SAVE_V) return s; } catch (e) {} return null; }
function clearSave() { try { localStorage.removeItem(SAVE_KEY); } catch (e) {} }
const GFX_KEY = 'afconcity-gfx';
let gfx = 'high';
try { gfx = localStorage.getItem(GFX_KEY) || (isCoarse ? 'low' : 'high'); } catch (e) { gfx = isCoarse ? 'low' : 'high'; }
const HQ = () => gfx === 'high';
const BUILD_HQ = !isCoarse;

/* ---------- renderer ---------- */
const canvas = $('#scene');
let renderer;
try { renderer = new T.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance', stencil: false }); }
catch (e) { failBoot('This game needs WebGL, which this browser has turned off.'); return; }
const maxAniso = renderer.capabilities.getMaxAnisotropy ? renderer.capabilities.getMaxAnisotropy() : 1;
renderer.outputEncoding = T.sRGBEncoding;
renderer.toneMapping = T.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = T.PCFSoftShadowMap;
let resScale = 1;
const pixelRatio = () => Math.max(0.5, Math.min(window.devicePixelRatio || 1, HQ() ? 1.5 : 1.15) * resScale);
renderer.setPixelRatio(pixelRatio());
renderer.setSize(innerWidth, innerHeight, false);

const scene = new T.Scene();
const FOG_DAY = C(0xe9c9a6), FOG_NIGHT = C(0x10152e);
scene.fog = new T.Fog(FOG_DAY.getHex(), 260, 1650);
scene.background = FOG_DAY.clone();
const camera = new T.PerspectiveCamera(58, innerWidth / innerHeight, 0.3, 6000);

const SUN_ELEV = 0.36;
const SUN_DIR = new T.Vector3(WEST.x * Math.cos(SUN_ELEV), Math.sin(SUN_ELEV), WEST.z * Math.cos(SUN_ELEV)).normalize();
const hemi = new T.HemisphereLight(C(0xbcd6ff), C(0x6b5a3c), 0.22);
scene.add(hemi);
const sun = new T.DirectionalLight(C(0xffd2a0), 2.1);
sun.castShadow = true;
function setShadowRes() {
  const s = HQ() ? 2048 : 1024;
  if (sun.shadow.mapSize.x !== s) { sun.shadow.mapSize.set(s, s); if (sun.shadow.map) { sun.shadow.map.dispose(); sun.shadow.map = null; } }
}
setShadowRes();
Object.assign(sun.shadow.camera, { left: -60, right: 60, top: 60, bottom: -60, near: 5, far: 420 });
sun.shadow.bias = -0.0003;
sun.shadow.normalBias = 0.035;
scene.add(sun, sun.target);
const moonDir = new T.Vector3(0.35, 0.75, -0.55).normalize();
const pitchLight = new T.PointLight(C(0xfff4e0), 0, 360, 1.1);
pitchLight.position.set(SC.x, 60, SC.z);
scene.add(pitchLight);

function resizeAll() {
  camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
  renderer.setPixelRatio(pixelRatio());
  renderer.setSize(innerWidth, innerHeight, false);
}

/* ---------- sky, clouds, environment reflections ---------- */
const SKY_FRAG = [
  'uniform vec3 uSun; uniform float uNight; uniform float uDisk; uniform float uRain; varying vec3 vDir;',
  'float h3(vec3 p){ p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }',
  'void main(){',
  '  vec3 d = normalize(vDir); float h = d.y; float mu = dot(d, uSun);',
  '  vec3 zen = mix(vec3(0.085,0.20,0.50), vec3(0.003,0.005,0.016), uNight);',
  '  vec3 horS = mix(vec3(1.0,0.56,0.27), vec3(0.018,0.024,0.06), uNight);',
  '  vec3 horA = mix(vec3(0.56,0.60,0.68), vec3(0.012,0.016,0.04), uNight);',
  '  vec2 hd = normalize(d.xz + 1e-5), hs = normalize(uSun.xz + 1e-5);',
  '  float az = 0.5 + 0.5 * dot(hd, hs);',
  '  vec3 hor = mix(horA, horS, pow(az, 2.2));',
  '  float t = pow(max(h, 0.0), 0.4);',
  '  vec3 col = mix(hor, zen, t);',
  '  col = mix(col, hor * 1.08, exp(-max(h, 0.0) * 16.0) * 0.45);',
  '  float g = max(mu, 0.0);',
  '  col += vec3(1.0,0.58,0.28) * (pow(g, 7.0) * 0.5 + pow(g, 80.0) * 1.1) * (1.0 - uNight);',
  '  col += vec3(1.0,0.82,0.6) * uDisk * smoothstep(0.99955, 0.99978, mu) * (1.0 - uNight) * (1.0 - uRain);',
  '  col = mix(col, mix(vec3(0.40,0.43,0.48), vec3(0.02,0.025,0.035), uNight) * (0.85 + 0.15 * t), uRain * 0.85);',
  '  vec3 ground = mix(vec3(0.30,0.27,0.21), vec3(0.008,0.01,0.018), uNight);',
  '  col = mix(col, ground, smoothstep(0.0, -0.14, h));',
  '  if (uNight > 0.01) {',
  '    float st = step(0.9975, h3(floor(d * 320.0)));',
  '    col += vec3(st) * uNight * smoothstep(0.03, 0.3, h) * 0.9;',
  '    vec3 md = normalize(vec3(0.35, 0.75, -0.55));',
  '    col += vec3(0.9,0.92,1.0) * smoothstep(0.9993, 0.9996, dot(d, md)) * uNight * 2.0;',
  '    col += vec3(0.25,0.3,0.5) * pow(max(dot(d, md), 0.0), 40.0) * uNight * 0.25;',
  '  }',
  '  gl_FragColor = vec4(col, 1.0);',
  '  #include <tonemapping_fragment>',
  '  #include <encodings_fragment>',
  '}',
].join('\n');
const SKY_VERT = 'varying vec3 vDir; void main(){ vec4 wp = modelMatrix * vec4(position, 1.0); vDir = wp.xyz - cameraPosition; gl_Position = projectionMatrix * viewMatrix * wp; }';
const skyU = { uSun: { value: SUN_DIR.clone() }, uNight: { value: 0 }, uDisk: { value: 26 }, uRain: { value: 0 } };
const sky = new T.Mesh(new T.SphereGeometry(5000, 32, 16), new T.ShaderMaterial({ uniforms: skyU, vertexShader: SKY_VERT, fragmentShader: SKY_FRAG, side: T.BackSide, depthWrite: false, fog: false }));
sky.renderOrder = -10; sky.frustumCulled = false;
scene.add(sky);

const cloudU = { uTime: { value: 0 }, uNight: { value: 0 }, uSun: { value: SUN_DIR.clone() }, uRain: { value: 0 } };
let clouds = null;
function buildClouds() {
  const mat = new T.ShaderMaterial({
    uniforms: cloudU, transparent: true, depthWrite: false, fog: false, side: T.DoubleSide,
    vertexShader: 'varying vec3 vW; void main(){ vec4 wp = modelMatrix * vec4(position,1.0); vW = wp.xyz; gl_Position = projectionMatrix * viewMatrix * wp; }',
    fragmentShader: [
      'uniform float uTime, uNight, uRain; uniform vec3 uSun; varying vec3 vW;',
      'float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }',
      'float noise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f); return mix(mix(hash(i), hash(i+vec2(1.0,0.0)), f.x), mix(hash(i+vec2(0.0,1.0)), hash(i+vec2(1.0,1.0)), f.x), f.y); }',
      `float fbm(vec2 p){ float v = 0.0, a = 0.5; for (int i = 0; i < ${BUILD_HQ ? 5 : 3}; i++) { v += a * noise(p); p = p * 2.03 + 7.1; a *= 0.5; } return v; }`,
      'void main(){',
      '  vec2 p = vW.xz * 0.0012 + vec2(uTime * 0.0045, uTime * 0.0018);',
      '  float n = fbm(p);',
      '  float cov = mix(smoothstep(0.5, 0.74, n), smoothstep(0.22, 0.5, n), uRain);',
      '  float dist = length(vW.xz - cameraPosition.xz);',
      '  float fade = 1.0 - smoothstep(1800.0, 3800.0, dist);',
      '  float thick = smoothstep(0.58, 0.9, fbm(p * 1.7 + 3.0));',
      '  vec3 V = normalize(vW - cameraPosition);',
      '  float mu = max(dot(V, uSun), 0.0);',
      '  vec3 col = mix(vec3(1.0,0.93,0.86), vec3(0.62,0.55,0.6), thick * 0.75);',
      '  col += vec3(1.0,0.5,0.22) * (pow(mu, 5.0) * 0.9 + 0.12);',
      '  col = mix(col, vec3(0.36,0.38,0.42) * (1.0 - thick * 0.35), uRain * 0.85);',
      '  col = mix(col, vec3(0.03,0.035,0.07), uNight * 0.92);',
      '  gl_FragColor = vec4(col, cov * fade * 0.9);',
      '  #include <tonemapping_fragment>',
      '  #include <encodings_fragment>',
      '}',
    ].join('\n'),
  });
  clouds = new T.Mesh(new T.PlaneGeometry(9000, 9000), mat);
  clouds.rotation.x = Math.PI / 2; clouds.position.y = 520; clouds.renderOrder = -9; clouds.frustumCulled = false;
  scene.add(clouds);
}
let envRT = null;
function rebuildEnv(night) {
  try {
    const pm = new T.PMREMGenerator(renderer);
    const es = new T.Scene();
    const m = new T.Mesh(new T.SphereGeometry(100, 32, 16), new T.ShaderMaterial({ uniforms: { uSun: { value: SUN_DIR.clone() }, uNight: { value: night }, uDisk: { value: 5 } }, vertexShader: SKY_VERT, fragmentShader: SKY_FRAG, side: T.BackSide, depthWrite: false }));
    es.add(m);
    const rt = pm.fromScene(es, 0.02, 0.1, 1000);
    if (envRT) envRT.dispose();
    envRT = rt; scene.environment = rt.texture;
    m.geometry.dispose(); m.material.dispose(); pm.dispose();
  } catch (e) { scene.environment = null; }
}

/* ---------- procedural textures ---------- */
function mkCanvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
function texOf(c, o) {
  o = o || {};
  const t = new T.CanvasTexture(c);
  t.wrapS = t.wrapT = o.clamp ? T.ClampToEdgeWrapping : T.RepeatWrapping;
  t.anisotropy = Math.min(o.aniso || 8, maxAniso);
  if (o.srgb !== false) t.encoding = T.sRGBEncoding;
  return t;
}
function tileFbm(size, base, oct, seed, persist) {
  const out = new Float32Array(size * size), r = mulberry32(seed);
  let amp = 1, total = 0;
  for (let o = 0; o < oct; o++) {
    const g = base << o, grid = new Float32Array(g * g);
    for (let i = 0; i < g * g; i++) grid[i] = r();
    for (let y = 0; y < size; y++) {
      const fy = y / size * g, y0 = Math.floor(fy), ty = fy - y0, sy = ty * ty * (3 - 2 * ty), y1 = (y0 + 1) % g;
      for (let x = 0; x < size; x++) {
        const fx = x / size * g, x0 = Math.floor(fx), tx = fx - x0, sx = tx * tx * (3 - 2 * tx), x1 = (x0 + 1) % g;
        const a = grid[y0 * g + x0], b = grid[y0 * g + x1], c = grid[y1 * g + x0], d = grid[y1 * g + x1];
        const top = a + (b - a) * sx, bot = c + (d - c) * sx;
        out[y * size + x] += amp * (top + (bot - top) * sy);
      }
    }
    total += amp; amp *= persist || 0.5;
  }
  for (let i = 0; i < out.length; i++) out[i] /= total;
  return out;
}
function paint(size, seed, fn) {
  const c = mkCanvas(size, size), x = c.getContext('2d'), img = x.createImageData(size, size), d = img.data;
  const n1 = tileFbm(size, 4, 5, seed), n2 = tileFbm(size, 16, 3, seed + 7), r = mulberry32(seed + 13);
  for (let i = 0; i < size * size; i++) { const col = fn(n1[i], n2[i], r(), i % size, (i / size) | 0); d[i * 4] = col[0]; d[i * 4 + 1] = col[1]; d[i * 4 + 2] = col[2]; d[i * 4 + 3] = 255; }
  x.putImageData(img, 0, 0);
  return { c, x };
}
const TEX = {};
/* image textures (generated offline, embedded as WebP); normal maps are linear, the rest sRGB */
const TEXDATA = /*TEXDATA*/null;
async function loadTextures() {
  const jobs = Object.entries(TEXDATA || {}).map(([name, url]) => new Promise((res) => {
    const im = new Image();
    im.onload = () => { const t = new T.Texture(im); t.wrapS = t.wrapT = T.RepeatWrapping; t.anisotropy = Math.min(8, maxAniso); if (!/N$/.test(name)) t.encoding = T.sRGBEncoding; if (name === 'frond' || name === 'leaves' || name === 'tuft') { t.wrapS = t.wrapT = T.ClampToEdgeWrapping; } t.needsUpdate = true; TEX[name] = t; res(); };
    im.onerror = () => res();
    im.src = url;
  }));
  await Promise.all(jobs);
}
function buildTextures() {
  // macro variation (single channel), wraps every ~700 m
  { const { c } = paint(256, 23, (a, b) => { const v = 120 + (a - 0.5) * 210 + (b - 0.5) * 40; return [v, v, v]; }); TEX.macro = texOf(c, { srgb: false }); }
  // makuti thatch
  {
    const c = mkCanvas(512, 512), x = c.getContext('2d'), rg = mulberry32(101);
    x.fillStyle = '#8a6a3a'; x.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 5200; i++) { const px = rg() * 512, py = rg() * 512, l = 18 + rg() * 30, g = 120 + rg() * 90; x.strokeStyle = `rgba(${g | 0},${g * 0.78 | 0},${g * 0.45 | 0},0.7)`; x.lineWidth = 1 + rg() * 1.5; x.beginPath(); x.moveTo(px, py); x.lineTo(px + (rg() - 0.5) * 6, py + l); x.stroke(); }
    for (let j = 0; j < 8; j++) { x.fillStyle = 'rgba(40,26,10,0.35)'; x.fillRect(0, j * 64 + 58, 512, 6); }
    TEX.thatch = texOf(c);
  }
  // Zanzibar carved door
  TEX.door = texOf((() => {
    const c = mkCanvas(256, 384), x = c.getContext('2d'), w = 256, h = 384;
    x.fillStyle = '#5c3319'; x.fillRect(0, 0, w, h);
    x.fillStyle = '#7d4826'; x.fillRect(0, 0, w, 54); x.fillRect(0, 0, 26, h); x.fillRect(w - 26, 0, 26, h);
    x.strokeStyle = '#3e2010'; x.lineWidth = 3;
    for (let y = 60; y < h; y += 22) { x.beginPath(); x.moveTo(4, y); x.lineTo(13, y - 9); x.lineTo(22, y); x.stroke(); x.beginPath(); x.moveTo(w - 22, y); x.lineTo(w - 13, y - 9); x.lineTo(w - 4, y); x.stroke(); }
    for (let i = 0; i < 9; i++) { x.beginPath(); x.arc(w / 2, 54, 18 + i * 6, Math.PI, 0); x.stroke(); }
    x.fillStyle = '#4a2812'; x.fillRect(w / 2 - 2, 54, 4, h - 54);
    x.fillStyle = '#f3b41b'; for (let y = 92; y < h - 10; y += 52) for (const px of [64, 104, 152, 192]) { x.beginPath(); x.arc(px, y, 7, 0, TAU); x.fill(); }
    return c;
  })(), { clamp: true });
  // water normal map (tileable sum of integer-frequency waves)
  {
    const S = 256, c = mkCanvas(S, S), x = c.getContext('2d'), img = x.createImageData(S, S), d = img.data, H = new Float32Array(S * S), rg = mulberry32(151);
    const waves = []; for (let i = 0; i < 14; i++) waves.push([Math.round(rg() * 10 - 5) || 1, Math.round(rg() * 10 - 5) || 2, rg() * TAU, 1 / (1 + i * 0.5)]);
    for (let j = 0; j < S; j++) for (let i = 0; i < S; i++) { let h = 0; for (const [a, b, p, amp] of waves) h += Math.sin((a * i + b * j) / S * TAU + p) * amp; H[j * S + i] = h; }
    for (let j = 0; j < S; j++) for (let i = 0; i < S; i++) {
      const dx = H[j * S + (i + 1) % S] - H[j * S + (i - 1 + S) % S], dy = H[((j + 1) % S) * S + i] - H[((j - 1 + S) % S) * S + i];
      const nx = -dx * 0.9, ny = -dy * 0.9, nz = 1, l = Math.hypot(nx, ny, nz), k = (j * S + i) * 4;
      d[k] = (nx / l * 0.5 + 0.5) * 255; d[k + 1] = (ny / l * 0.5 + 0.5) * 255; d[k + 2] = (nz / l * 0.5 + 0.5) * 255; d[k + 3] = 255;
    }
    x.putImageData(img, 0, 0);
    TEX.waterN = texOf(c, { srgb: false });
  }
  const flat = (hex) => { const c = mkCanvas(4, 4), x = c.getContext('2d'); x.fillStyle = hex; x.fillRect(0, 0, 4, 4); return texOf(c); };
  for (const [k, hex] of Object.entries({ grass: '#5f8a3a', dry: '#a39a5c', soil: '#9a6040', sand: '#e0c99a', roadT: '#3c3d40', roadR: '#3c3d40', roadS: '#3c3d40', paver: '#a89a8c', plaza: '#d4c9b4', slab: '#b4b0a8', concrete: '#c4c0b8', plaster: '#eeece6', tiles: '#a85432', mabati: '#b0b4b8', bark: '#8a7458', frond: '#4f7a34', leaves: '#3f6a2a', tuft: '#5f8a3a' })) if (!TEX[k]) TEX[k] = flat(hex);
}

/* ---------- canvas signs ---------- */
const FONT_D = '"Big Shoulders Display", Impact, "Arial Narrow", sans-serif';
const FONT_B = 'Figtree, "Segoe UI", Arial, sans-serif';
function rrect(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
function kangaEdge(c, w, h, band) { const s = band * 1.6; for (let i = 0; i < w; i += s * 2) { c.fillStyle = '#f3b41b'; c.fillRect(i, 0, s, band); c.fillRect(i + s, h - band, s, band); c.fillStyle = '#e0553a'; c.fillRect(i + s, 0, s, band); c.fillRect(i, h - band, s, band); } }
function fitFont(c, text, weight, size, maxW, family) { let s = size; c.font = `${weight} ${s}px ${family}`; while (c.measureText(text).width > maxW && s > 12) { s -= 3; c.font = `${weight} ${s}px ${family}`; } return s; }
function signTex(text, o) {
  o = o || {};
  const w = 1024, h = o.h || 200;
  const c = mkCanvas(w, h), x = c.getContext('2d');
  x.fillStyle = o.bg || '#141838'; x.fillRect(0, 0, w, h);
  if (o.edge !== false) kangaEdge(x, w, h, Math.max(10, h * 0.07));
  x.fillStyle = o.fg || '#f7ead0'; x.textAlign = 'center'; x.textBaseline = 'middle';
  fitFont(x, text, 900, o.size || Math.round(h * 0.6), w - 90, FONT_D);
  x.fillText(text, w / 2, h / 2 + 4);
  return texOf(c, { clamp: true });
}
let glowTexC = null;
function glowTex() { if (glowTexC) return glowTexC; const c = mkCanvas(128, 128), x = c.getContext('2d'), g = x.createRadialGradient(64, 64, 0, 64, 64, 64); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.18, 'rgba(255,255,255,0.75)'); g.addColorStop(0.45, 'rgba(255,255,255,0.18)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 128, 128); glowTexC = texOf(c, { clamp: true }); return glowTexC; }
const nightMats = [];
function nightable(mat, a, b, prop) { nightMats.push({ mat, prop: prop || 'emissiveIntensity', a, b }); return mat; }
function signMesh(text, w, h, o) {
  const tex = signTex(text, Object.assign({ h: Math.round(1024 * h / w) }, o || {}));
  const mat = new T.MeshStandardMaterial({ map: tex, roughness: 0.55, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.05 });
  nightable(mat, 0.05, 0.75);
  return new T.Mesh(new T.PlaneGeometry(w, h), mat);
}

/* ---------- geometry ---------- */
class Builder {
  constructor(skin) { this.p = []; this.n = []; this.c = []; this.u = []; this.skin = !!skin; this.si = []; this.sw = []; }
  add(geo, m, col, o) {
    o = o || {};
    const g = geo.index ? geo.toNonIndexed() : geo;
    if (!g.attributes.normal) g.computeVertexNormals();
    const pa = g.attributes.position, na = g.attributes.normal, ua = g.attributes.uv, ca = g.attributes.color;
    const nm = new T.Matrix3().getNormalMatrix(m), v = new T.Vector3(), nv = new T.Vector3();
    const um = o.uvFrom || null, unm = um ? new T.Matrix3().getNormalMatrix(um) : null, lv = new T.Vector3(), ln = new T.Vector3();
    const tile = o.tile || 4, mode = o.uv || (ua ? 'keep' : 'box');
    for (let i = 0; i < pa.count; i++) {
      v.fromBufferAttribute(pa, i); nv.fromBufferAttribute(na, i);
      if (um) { lv.copy(v).applyMatrix4(um); ln.copy(nv).applyMatrix3(unm).normalize(); }
      v.applyMatrix4(m); nv.applyMatrix3(nm).normalize();
      if (!um) { lv.copy(v); ln.copy(nv); }
      this.p.push(v.x, v.y, v.z); this.n.push(nv.x, nv.y, nv.z);
      if (mode === 'keep' && ua) this.u.push(ua.getX(i) * (o.us || 1), ua.getY(i) * (o.vs || 1));
      else if (mode === 'roof') { if (Math.abs(ln.z) >= Math.abs(ln.x)) this.u.push(lv.x / tile, (lv.z * Math.sign(ln.z || 1) - lv.y) / tile); else this.u.push(lv.z / tile, (lv.x * Math.sign(ln.x) - lv.y) / tile); }
      else { const ax = Math.abs(ln.x), ay = Math.abs(ln.y), az = Math.abs(ln.z); if (ay >= ax && ay >= az) this.u.push(lv.x / tile, lv.z / tile); else if (ax >= az) this.u.push(lv.z / tile, lv.y / tile); else this.u.push(lv.x / tile, lv.y / tile); }
      let r = 1, gg = 1, b = 1;
      if (col) { r = col.r; gg = col.g; b = col.b; } else if (ca) { r = ca.getX(i); gg = ca.getY(i); b = ca.getZ(i); }
      if (o.grime) { const k = lerp(o.grime, 1, smooth(clamp(v.y / 1.3, 0, 1))); r *= k; gg *= k; b *= k; }
      this.c.push(r, gg, b);
      if (this.skin) { this.si.push(o.bone || 0, 0, 0, 0); this.sw.push(1, 0, 0, 0); }
    }
    return this;
  }
  tri(a, b, c, col, n, uvs) {
    let nx, ny, nz;
    if (n) [nx, ny, nz] = n;
    else { const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2]; nx = uy * vz - uz * vy; ny = uz * vx - ux * vz; nz = ux * vy - uy * vx; const l = Math.hypot(nx, ny, nz) || 1; nx /= l; ny /= l; nz /= l; }
    [a, b, c].forEach((q, k) => { this.p.push(q[0], q[1], q[2]); this.n.push(nx, ny, nz); this.c.push(col.r, col.g, col.b); if (uvs) this.u.push(uvs[k][0], uvs[k][1]); else this.u.push(q[0] / 4, q[2] / 4); if (this.skin) { this.si.push(0, 0, 0, 0); this.sw.push(1, 0, 0, 0); } });
  }
  quad(a, b, c, d, col, n, uvs) { this.tri(a, b, c, col, n, uvs && [uvs[0], uvs[1], uvs[2]]); this.tri(a, c, d, col, n, uvs && [uvs[0], uvs[2], uvs[3]]); }
  get empty() { return this.p.length === 0; }
  build() {
    const g = new T.BufferGeometry();
    g.setAttribute('position', new T.Float32BufferAttribute(this.p, 3));
    g.setAttribute('normal', new T.Float32BufferAttribute(this.n, 3));
    g.setAttribute('color', new T.Float32BufferAttribute(this.c, 3));
    g.setAttribute('uv', new T.Float32BufferAttribute(this.u.length ? this.u : new Array(this.p.length / 3 * 2).fill(0), 2));
    if (this.skin) { g.setAttribute('skinIndex', new T.Uint16BufferAttribute(this.si, 4)); g.setAttribute('skinWeight', new T.Float32BufferAttribute(this.sw, 4)); }
    g.computeBoundingSphere();
    return g;
  }
}
const tmpQ = new T.Quaternion(), tmpE = new T.Euler(), tmpS = new T.Vector3(), tmpP = new T.Vector3();
function mat4(x, y, z, ry, sx, sy, sz, rx, rz) {
  tmpE.set(rx || 0, ry || 0, rz || 0, 'YXZ'); tmpQ.setFromEuler(tmpE);
  tmpS.set(sx || 1, sy === undefined ? (sx || 1) : sy, sz === undefined ? (sx || 1) : sz); tmpP.set(x, y, z);
  return new T.Matrix4().compose(tmpP, tmpQ, tmpS);
}
const rbCache = new Map();
function roundedBox(w, h, d, r, seg) {
  seg = seg || 2;
  const key = [w, h, d, r, seg].map(v => (+v).toFixed(3)).join('|');
  if (rbCache.has(key)) return rbCache.get(key);
  r = Math.max(0.001, Math.min(r, w / 2, h / 2, d / 2));
  const s = seg * 2 + 1, g = new T.BoxGeometry(1, 1, 1, s, s, s).toNonIndexed();
  const P = g.attributes.position.array, N = g.attributes.normal.array, half = 0.5 / s, bx = w / 2 - r, by = h / 2 - r, bz = d / 2 - r;
  for (let j = 0; j < P.length; j += 3) {
    const sx = Math.sign(P[j]), sy = Math.sign(P[j + 1]), sz = Math.sign(P[j + 2]);
    let nx = P[j] - sx * half, ny = P[j + 1] - sy * half, nz = P[j + 2] - sz * half; const l = Math.hypot(nx, ny, nz) || 1; nx /= l; ny /= l; nz /= l;
    P[j] = bx * sx + nx * r; P[j + 1] = by * sy + ny * r; P[j + 2] = bz * sz + nz * r; N[j] = nx; N[j + 1] = ny; N[j + 2] = nz;
  }
  g.deleteAttribute('uv');
  rbCache.set(key, g);
  return g;
}
const boxCache = new Map();
function box(w, h, d) { const k = w + '|' + h + '|' + d; if (!boxCache.has(k)) { const g = new T.BoxGeometry(w, h, d).toNonIndexed(); g.deleteAttribute('uv'); boxCache.set(k, g); } return boxCache.get(k); }
function capsule(r, len, cap, radial) {
  cap = cap || 5; radial = radial || 12;
  const pts = [];
  for (let i = 0; i <= cap; i++) { const a = -Math.PI / 2 + i / cap * Math.PI / 2; pts.push(new T.Vector2(Math.max(0.0001, Math.cos(a) * r), Math.sin(a) * r - len / 2)); }
  for (let i = 0; i <= cap; i++) { const a = i / cap * Math.PI / 2; pts.push(new T.Vector2(Math.max(0.0001, Math.cos(a) * r), Math.sin(a) * r + len / 2)); }
  const g = new T.LatheGeometry(pts, radial); g.deleteAttribute('uv');
  return g;
}
function at(m, x, y, z) { m.position.set(x, y, z); return m; }
function meshOf(geo, mat, cast, recv) { const m = new T.Mesh(geo, mat); m.castShadow = !!cast; m.receiveShadow = recv !== false; return m; }
const matCache = new Map();
function M(hex, extra) { const key = hex + (extra ? JSON.stringify(extra) : ''); if (!matCache.has(key)) matCache.set(key, new T.MeshStandardMaterial(Object.assign({ color: C(hex), roughness: 0.8, metalness: 0 }, extra || {}))); return matCache.get(key); }
const VC = new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.82, metalness: 0 });

/* small scenery (grass tufts, bushes) stops drawing past a distance; checked a few times a second */
const LODS = [];
let lodT = 0;
function updateLOD(dt) {
  lodT -= dt; if (lodT > 0) return; lodT = 0.25;
  const cp = camera.position;
  for (const l of LODS) l.m.visible = cp.distanceTo(l.c) - l.r < l.far;
}
/* instanced scenery split into map chunks so each culls on its own */
function chunked(geo, mat, items, apply, opts) {
  opts = opts || {};
  if (!items.length) return [];
  geo.computeBoundingSphere();
  const gr = geo.boundingSphere.radius + geo.boundingSphere.center.length();
  const cells = new Map(), size = opts.cell || 140;
  for (const it of items) { const k = Math.floor(it[0] / size) + ',' + Math.floor(it[1] / size); if (!cells.has(k)) cells.set(k, []); cells.get(k).push(it); }
  const o3 = new T.Object3D(), out = [];
  for (const list of cells.values()) {
    const g = geo.clone(), m = new T.InstancedMesh(g, mat, list.length), pts = [];
    let maxS = 1;
    list.forEach((it, i) => {
      o3.position.set(0, 0, 0); o3.rotation.order = 'XYZ'; o3.rotation.set(0, 0, 0); o3.scale.set(1, 1, 1);
      const col = apply(it, o3, i);
      o3.updateMatrix(); m.setMatrixAt(i, o3.matrix);
      if (col) m.setColorAt(i, col);
      pts.push(o3.position.clone()); maxS = Math.max(maxS, o3.scale.x, o3.scale.y, o3.scale.z);
    });
    const center = new T.Box3().setFromPoints(pts).getCenter(new T.Vector3());
    let r = 0; for (const q of pts) r = Math.max(r, q.distanceTo(center));
    g.boundingSphere = new T.Sphere(center, r + gr * maxS);
    m.castShadow = !!opts.cast; m.receiveShadow = !!opts.recv;
    if (opts.depth) m.customDepthMaterial = opts.depth;
    if (opts.far) LODS.push({ m, c: center, r: r + gr * maxS, far: opts.far });
    scene.add(m); out.push(m);
  }
  return out;
}
const windU = { uWind: { value: 0 } };
function addWind(mat, strength) {
  const prev = mat.onBeforeCompile;
  mat.onBeforeCompile = (sh) => {
    if (prev) prev(sh);
    sh.uniforms.uWind = windU.uWind;
    sh.vertexShader = 'uniform float uWind;\n' + sh.vertexShader.replace('#include <begin_vertex>', [
      '#include <begin_vertex>',
      '#ifdef USE_INSTANCING',
      '  vec3 ip = vec3(instanceMatrix[3][0], instanceMatrix[3][1], instanceMatrix[3][2]);',
      '#else',
      '  vec3 ip = vec3(0.0);',
      '#endif',
      `  float sw = max(transformed.y, 0.0) * ${strength.toFixed(4)};`,
      '  transformed.x += sin(uWind * 1.3 + ip.x * 0.05 + ip.z * 0.03) * sw;',
      '  transformed.z += cos(uWind * 1.1 + ip.z * 0.05) * sw * 0.7;',
    ].join('\n'));
  };
  return mat;
}
function alphaDepth(tex) { return new T.MeshDepthMaterial({ depthPacking: T.RGBADepthPacking, map: tex, alphaTest: 0.5 }); }

/* ---------- collisions: oriented boxes and circles in a spatial hash ---------- */
const CELL = 16, cgrid = new Map(), EMPTY = [];
const ck = (ix, iz) => ix * 73856093 ^ iz * 19349663;
function addCollider(c) { const r = c.br; for (let ix = Math.floor((c.x - r) / CELL); ix <= Math.floor((c.x + r) / CELL); ix++) for (let iz = Math.floor((c.z - r) / CELL); iz <= Math.floor((c.z + r) / CELL); iz++) { const k = ck(ix, iz); if (!cgrid.has(k)) cgrid.set(k, []); cgrid.get(k).push(c); } return c; }
function addObb(x, z, w, d, ang, tag) { return addCollider({ t: 0, x, z, hw: w / 2, hd: d / 2, c: Math.cos(ang), s: Math.sin(ang), br: Math.hypot(w, d) / 2 + 1, tag: tag || '', on: true }); }
function addCircle(x, z, r, tag) { return addCollider({ t: 1, x, z, r, br: r + 1, tag: tag || '', on: true }); }
function resolveCircle(p, R, hit, skipSmall) {
  const list = cgrid.get(ck(Math.floor(p.x / CELL), Math.floor(p.z / CELL))) || EMPTY;
  for (const c of list) {
    if (!c.on || (skipSmall && c.tag === 'small')) continue;
    if (c.t === 0) {
      const dx = p.x - c.x, dz = p.z - c.z, u = dx * c.c + dz * c.s, v = -dx * c.s + dz * c.c;
      if (Math.abs(u) > c.hw + R || Math.abs(v) > c.hd + R) continue;
      const cu = clamp(u, -c.hw, c.hw), cv = clamp(v, -c.hd, c.hd);
      let du = u - cu, dv = v - cv; const d2 = du * du + dv * dv;
      let nu, nv;
      if (d2 > 1e-8) { if (d2 >= R * R) continue; const d = Math.sqrt(d2); nu = cu + du / d * R; nv = cv + dv / d * R; }
      else { const ou = c.hw - Math.abs(u) + R, ov = c.hd - Math.abs(v) + R; nu = u; nv = v; if (ou < ov) nu += (u >= 0 ? 1 : -1) * ou; else nv += (v >= 0 ? 1 : -1) * ov; }
      const nx = c.x + nu * c.c - nv * c.s, nz = c.z + nu * c.s + nv * c.c;
      if (hit) hit(nx - p.x, nz - p.z, c);
      p.x = nx; p.z = nz;
    } else {
      const rr2 = c.r + R, dx = p.x - c.x, dz = p.z - c.z;
      if (Math.abs(dx) > rr2 || Math.abs(dz) > rr2) continue;
      const d2 = dx * dx + dz * dz;
      if (d2 < rr2 * rr2) { const d = Math.sqrt(d2) || 1e-4, nx = c.x + dx / d * rr2, nz = c.z + dz / d * rr2; if (hit) hit(nx - p.x, nz - p.z, c); p.x = nx; p.z = nz; }
    }
  }
}
function pointBlocked(x, z, pad) {
  const list = cgrid.get(ck(Math.floor(x / CELL), Math.floor(z / CELL))) || EMPTY;
  for (const c of list) {
    if (!c.on || c.tag === 'small') continue;
    if (c.t === 0) { const dx = x - c.x, dz = z - c.z, u = dx * c.c + dz * c.s, v = -dx * c.s + dz * c.c; if (Math.abs(u) < c.hw + pad && Math.abs(v) < c.hd + pad && c.hh !== 0) return true; }
  }
  return false;
}
const footprints = [];

