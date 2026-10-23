/* ===================== 47 life: mobile money, hunger, daladala shifts, beach football, fishing, haggling, rain, police ===================== */

/* ---------- mobile money (Pesa) ---------- */
/* Vodacom M-Pesa Tanzania tariff from 1 July 2025: agent withdrawal (fee plus government levy) and send-to-customer fees, in TSh */
const PESA_BANDS = [[999, 185, 10], [1999, 360, 30], [2999, 410, 30], [3999, 614, 50], [4999, 677, 60], [6999, 1004, 130], [9999, 1056, 150], [14999, 1552, 350], [19999, 1645, 360], [29999, 2156, 380], [39999, 2201, 400], [49999, 2769, 410], [99999, 3273, 720], [199999, 4357, 1000], [299999, 6121, 1200], [399999, 7338, 1500], [499999, 7932, 1500], [599999, 8745, 2200], [699999, 9532, 3300], [799999, 9700, 3300], [899999, 9750, 3500], [1000000, 9776, 3500], [3000000, 9875, 4800]];
const pesaBand = (n) => PESA_BANDS.find(b => n <= b[0]) || PESA_BANDS[PESA_BANDS.length - 1];
const pesaWithdrawFee = (n) => pesaBand(n)[1];
const pesaSendFee = (n) => pesaBand(n)[2];
function money() { return state.cash + (state.bank || 0); }
function canPay(n, cashOnly) { return (cashOnly ? state.cash : money()) >= n; }
const AGENTS = [];
function openAgent(id) {
  const items = [];
  if (state.cash >= 1000) items.push({ label: `Deposit all cash · ${tsh(state.cash)}`, desc: 'Kuweka pesa is free. Pickpockets cannot touch money on your phone.', price: 'Free', act: () => { const n = state.cash; state.cash = 0; state.bank += n; moneyDelta(-n, 'To Pesa'); sfx.ding(); help(`Deposited ${tsh(n)}. Your Pesa balance is <b class="hg">${tsh(state.bank)}</b>.`, 3200); mpDirty = true; } });
  for (const n of [10000, 20000, 50000, 100000]) {
    const fee = pesaWithdrawFee(n);
    items.push({ label: `Withdraw ${tsh(n)}`, desc: `Agent fee ${tsh(fee)} (M-Pesa tariff, 1 July 2025)`, price: n + fee, noCharge: true, disabled: state.bank < n + fee, act: () => { state.bank -= n + fee; state.cash += n; state.stats.spent += fee; moneyDelta(n, 'Cash out'); moneyDelta(-fee, 'Agent fee'); sfx.cashOut(); mpDirty = true; } });
  }
  openMenu({ eyebrow: 'Wakala · mobile money agent', title: 'Pesa', lede: `Cash ${tsh(state.cash)} · Pesa ${tsh(state.bank)}. Street vendors want cash; shops, tours and Salim's VIP desk take Pesa (a small send fee applies).`, items, bank: true });
}
function buildAgents() {
  const spots = [{ id: 'wakala1', x: 575, z: -100.4, ry: Math.PI }, { id: 'wakala2', x: -300, z: -67, ry: Math.PI }, { id: 'wakala3', x: -969, z: -438, ry: Math.PI }, { id: 'wakala4', x: 186, z: 60, ry: Math.PI / 2 }];
  const tex = signTex('WAKALA · PESA', { h: 128, bg: '#1e9b57' });
  for (const s of spots) {
    const g = new T.Group(); g.position.set(s.x, 0, s.z); g.rotation.y = s.ry;
    g.add(at(meshOf(roundedBox(1.7, 2.2, 1.3, 0.08), M(0x1e9b57, { roughness: 0.6 }), true), 0, 1.1, -0.9));
    g.add(at(meshOf(roundedBox(1.8, 0.1, 1.5, 0.04), M(0xd8452c), true), 0, 2.25, -0.85));
    g.add(at(meshOf(roundedBox(1.5, 0.08, 0.5, 0.03), M(0xf6f1e7), true), 0, 1.05, -0.12));
    const sg = new T.Mesh(new T.PlaneGeometry(1.6, 0.32), new T.MeshStandardMaterial({ map: tex, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.25 })); sg.position.set(0, 1.9, -0.24); g.add(sg);
    scene.add(g); addObb(s.x - Math.sin(s.ry) * 0.9, s.z - Math.cos(s.ry) * 0.9, 1.7, 1.3, -s.ry); footprints.push({ x: s.x, z: s.z, w: 5, d: 5, ang: 0 });
    AGENTS.push(s);
  }
}

/* ---------- hunger ---------- */
function feed(n) { if (n > 0 && state.intro) { n = allyFood(n); st2().ate = 1; tally('meals'); } state.food = clamp((state.food === undefined ? 100 : state.food) + n, 0, 100); }
function updateHunger(dt) {
  if (state.food === undefined) state.food = 100;
  state.food = Math.max(0, state.food - dt * 0.07 * (speed > 5 ? 1.5 : 1));
  if (state.food < 25 && !RT.hungryTold) { RT.hungryTold = true; help('<b class="hl">Njaa!</b> You are hungry, so your stamina recovers slowly. Eat at the Usiku market, Mama Pwani or any food stall.', 6000); }
  if (state.food > 40) RT.hungryTold = false;
  if (state.food <= 0 && state.hp > 15) state.hp = Math.max(15, state.hp - dt * 0.4);
}

/* ---------- haggling ---------- */
/* The first price is the visitor price. Offer less and the seller counters; push too hard and she stops bargaining. */
function haggle(cfg) {
  const fresh = isFresh(), ask0 = fresh ? roundTo(cfg.ask * 0.92, 500) : cfg.ask;
  const H = { ask: ask0, floor: roundTo(cfg.ask * rr(0.55, 0.68), 500), patience: 3, line: fresh ? `${cfg.open} You look fresh, so the first price is kinder: ${tsh(ask0)}.` : cfg.open };
  const show = () => {
    const offers = [0.5, 0.6, 0.7, 0.8].map(k => roundTo(H.ask * k, 500)).filter((v, i, a) => v < H.ask && a.indexOf(v) === i);
    const items = [{ label: `Pay ${tsh(H.ask)}`, desc: H.ask < cfg.ask ? `Down from ${tsh(cfg.ask)}` : 'The first price', price: H.ask, noCharge: true, act: () => cfg.buy(H.ask) }];
    if (H.patience > 0) for (const o of offers) items.push({ label: `Offer ${tsh(o)}`, desc: o < H.floor * 0.8 ? 'Cheeky' : o < H.floor ? 'Low' : 'Fair', price: 'Bargain', act: () => offer(o) });
    openMenu({ eyebrow: cfg.eyebrow, title: cfg.title, lede: H.line, items, cash: true, close: 'Leave it' });
  };
  const offer = (o) => {
    sfx.ding();
    if (o >= H.floor) { H.line = pick([`"Sawa, ${tsh(o)}. Kwa ajili yako tu!" (Okay, just for you.)`, `"Haya, chukua!" (Fine, take it.) ${tsh(o)} it is.`]); H.ask = o; H.patience = 0; setTimeout(show, 30); return; }
    H.patience -= o < H.floor * 0.8 ? 2 : 1;
    if (H.patience <= 0) { H.ask = Math.max(H.floor, roundTo((H.ask + H.floor) / 2, 500)); H.line = `"Bei ni hiyo." That is my last price: ${tsh(H.ask)}.`; }
    else { H.ask = Math.max(H.floor, roundTo((o + H.ask) / 2 + 500, 500)); H.line = pick([`"Punguza kidogo? Hapana. ${tsh(H.ask)}, rafiki."`, `"Aah, ni ghali kwangu pia! ${tsh(H.ask)}."`, `She laughs. "${tsh(H.ask)}, mwisho."`]); }
    setTimeout(show, 30);
  };
  show();
}
const SOUVENIRS = [
  { id: 'tinga', name: 'Tingatinga painting', ask: 60000, fact: 'Bright animal paintings in enamel, a style started in Dar es Salaam in the 1960s.' },
  { id: 'door', name: 'Carved door, miniature', ask: 45000, fact: 'Zanzibar doors are famous for carving and brass studs.' },
  { id: 'spicebox', name: 'Spice box', ask: 20000, fact: 'Cloves, cinnamon, nutmeg, pepper and cardamom in a woven box.' },
];

/* ---------- daladala driver shift ---------- */
const DALA = { v: null, konda: null, cols: [], waiting: [] };
const DALA_ROUTE = ['uptown', 'junction', 'fanzone', 'afcon', 'town', 'fanzone', 'uptown'];
const DALA_CAP = 18;
function buildDala() {
  const v = { kind: 'daladala', col: 0xf3b41b, sx: 604, sz: -97, syaw: -Math.PI / 2, x: 604, z: -97, yaw: -Math.PI / 2, vx: 0, vz: 0, vf: 0, steer: 0, hp: 100, rented: false, stand: { name: 'Uptown Gate depot' }, m: makeVehicle('daladala', 0xf3b41b), idle: 0, wreck: 0, roll: 0, lean: 0, dala: true };
  v.m.position.set(v.x, 0.04, v.z); v.m.rotation.y = v.yaw; scene.add(v.m);
  v.col1 = addCircle(v.x, v.z, 1.15, 'veh');
  DALA.cols = [addCircle(v.x - Math.sin(v.yaw) * 1.6, v.z - Math.cos(v.yaw) * 1.6, 1.15, 'veh'), addCircle(v.x + Math.sin(v.yaw) * 1.6, v.z + Math.cos(v.yaw) * 1.6, 1.15, 'veh')];
  DALA.v = v;
  const k = makeHuman({ skin: 0x3d2416, shirt: 0xf6f1e7, lower: 0x2a2d33, pants: true, hair: 'cap', cap: 0x1e9b57, capLogo: 0xf3b41b, style: 'button', sandals: true, shoes: 0x2a2d33 });
  k.position.set(0.55, 0.3, 0.2); k.rotation.y = Math.PI / 2; v.m.add(k); DALA.konda = k;
  // passengers waiting at the stops
  STOPS.forEach((s, si) => {
    if (s.id === 'beach') return;
    for (let i = 0; i < 4; i++) {
      const h = makeHuman(randomLook(200 + si * 7 + i)); const bx = s.x - Math.sin(s.ry) * (2.6 + (i % 2) * 0.9) + Math.cos(s.ry) * (i - 1.5) * 1.1, bz = s.z - Math.cos(s.ry) * (2.6 + (i % 2) * 0.9) - Math.sin(s.ry) * (i - 1.5) * 1.1;
      h.position.set(bx, groundY(bx, bz), bz); h.rotation.y = s.ry + Math.PI + rr(-0.4, 0.4); scene.add(h);
      DALA.waiting.push({ h, stop: s.id, back: 0 });
    }
  });
}
function moveDalaCols() {
  const v = DALA.v; if (!v) return;
  const on = playerVeh !== v;
  const place = (c, x, z) => { for (const [, list] of cgrid) { const i = list.indexOf(c); if (i >= 0) list.splice(i, 1); } c.x = x; c.z = z; c.on = on; addCollider(c); };
  place(DALA.cols[0], v.x - Math.sin(v.yaw) * 1.6, v.z - Math.cos(v.yaw) * 1.6);
  place(DALA.cols[1], v.x + Math.sin(v.yaw) * 1.6, v.z + Math.cos(v.yaw) * 1.6);
}
function openOmari() {
  const working = job && job.type === 'dala';
  openMenu({ eyebrow: 'Daladala owner · Uptown Gate depot', title: 'Mzee Omari', lede: working ? `Fares so far ${tsh(job.fares)}. Bring my daladala back here and pay the hesabu of ${tsh(PRICES.hesabu)}.` : `Drive my daladala on the Fumba route. Konda Hassani takes ${tsh(PRICES.daladala)} from every passenger; at the end you pay me the hesabu, ${tsh(PRICES.hesabu)}, and keep the rest. Drive gently: passengers do not tip for crashes.`, items: working ? [] : [
    { label: 'Drive the Fumba route', desc: 'Uptown Gate · Junction · Fan Zone · AfconCity · Fumba Town and back', price: 'Earn', act: startDala },
  ] });
}
function startDala() {
  if (job) failJobSilently();
  const v = DALA.v; if (!v || v.wreck) { help('The daladala is at the garage. Try later.', 2500); return; }
  if (playerVeh) exitVehicle(true);
  job = { type: 'dala', i: 1, pax: 0, fares: 0, board: 0, t0: now(), stops: 0, title: 'Daladala shift', desc: '' };
  v.rented = true; enterVehicle(v);
  boardAt('uptown');
  sfx.start(); splash('TWENDE!', 'Daladala shift: follow the stops', 'gold');
  help('Drive to each <b class="hl">bus stop</b> in order and stop beside it. Konda Hassani collects the fares. <kbd>W</kbd><kbd>S</kbd> drive, <kbd>H</kbd> horn.', 7000);
}
function boardAt(id) {
  const fin = job.i >= DALA_ROUTE.length;
  const off = fin ? job.pax : Math.min(job.pax, Math.floor(rnd() * (job.pax * 0.6 + 1)));
  const on = fin ? 0 : Math.min(DALA_CAP - (job.pax - off), 3 + Math.floor(rnd() * 6));
  job.pax += on - off;
  let shown = 0;
  for (const w of DALA.waiting) if (w.stop === id && w.h.visible && shown < on) { w.h.visible = false; w.back = now() + 90; shown++; }
  if (on > 0) { job.fares += on * PRICES.daladala; earn(on * PRICES.daladala, `${on} abiria`); }
  if (DALA.konda) playEmote(DALA.konda, 'wave');
  const st = STOPS.find(s => s.id === id);
  help(`<b class="hl">${st.name}</b>: ${off} off, ${on} on. ${job.pax} of ${DALA_CAP} seats taken. Konda: "${pick(['Fumba! Fumba! Twende!', 'Mjini, mjini! Bado watu wawili!', 'Shuka hapa! Panda haraka!', 'AfconCity! Uwanjani!'])}"`, 4500);
  sfx.coin(0);
}
function updateDala(dt) {
  const v = DALA.v;
  if (playerVeh !== v) { job.out = (job.out || 0) + dt; if (job.out > 25) endDala(true); else if (job.out < dt * 1.5) help('Get back in the daladala (<kbd>E</kbd>), or the shift ends.', 3000); return; }
  job.out = 0;
  const id = DALA_ROUTE[job.i], st = STOPS.find(s => s.id === id);
  if (!st) return;
  const d = Math.hypot(st.x - v.x, st.z - v.z);
  if (d < 11 && Math.abs(v.vf) < 1.6) {
    job.board += dt;
    if (job.board > 2.2) {
      job.board = 0; job.i++; job.stops++;
      boardAt(id);
      if (job.i >= DALA_ROUTE.length) endDala(false);
    }
  } else job.board = 0;
}
function endDala(abandoned) {
  const v = DALA.v, fares = job.fares;
  if (!abandoned) tally('dala');
  job = null; sub('');
  if (playerVeh === v) exitVehicle(true);
  const paid = spend(Math.min(PRICES.hesabu, money()), 'Hesabu to Omari', 'spent');
  state.stats.jobs++;
  v.rented = false;
  setTimeout(() => { if (playerVeh !== v) resetDala(); }, abandoned ? 2000 : 6000);
  if (abandoned) splash('ZAMU IMEISHA', `Shift abandoned. Omari took the hesabu: ${tsh(paid)}`, 'bad');
  else { splash('KAZI NZURI', `Fares ${tsh(fares)} − hesabu ${tsh(paid)} = ${tsh(fares - paid)}`, fares > paid ? 'gold' : 'bad'); sfx.win(); mpEvent(`drove a daladala shift and took ${tsh(fares)} in fares`); }
}
function resetDala() { const v = DALA.v; if (!v) return; v.x = v.sx; v.z = v.sz; v.yaw = v.syaw; v.vx = v.vz = v.vf = v.steer = 0; v.hp = 100; v.wreck = 0; v.m.visible = true; v.m.position.set(v.x, 0.04, v.z); v.m.rotation.set(0, v.yaw, 0); moveVehCollider(v); moveDalaCols(); }
function updateDalaWorld(dt, t) {
  for (const w of DALA.waiting) {
    if (!w.h.visible && w.back && now() > w.back && !(job && job.type === 'dala' && DALA_ROUTE[job.i] === w.stop)) { w.h.visible = true; w.back = 0; }
    if (w.h.visible) { const dx = w.h.position.x - camera.position.x, dz = w.h.position.z - camera.position.z; if (dx * dx + dz * dz < 160 * 160) animHuman(w.h, dt, t, 0, 'loco'); }
  }
  if (DALA.konda && DALA.v && DALA.v.m.visible) { const dx = DALA.v.x - camera.position.x, dz = DALA.v.z - camera.position.z; if (dx * dx + dz * dz < 120 * 120) animHuman(DALA.konda, dt, t, 0, 'loco'); }
  if (DALA.v) { const mine = playerVeh === DALA.v; for (const c of DALA.cols) c.on = !mine; if (!mine && (DALA.lx !== DALA.v.x || DALA.lz !== DALA.v.z)) { DALA.lx = DALA.v.x; DALA.lz = DALA.v.z; moveDalaCols(); } }
}

/* ---------- beach football ---------- */
const PITCH = { x0: -33, x1: -9, z: 452, half: 1.5, h: 1.75, zmin: 443, zmax: 461 };
const BALL = { x: -21, y: 0.15, z: 452, vx: 0, vy: 0, vz: 0, r: 0.11, mesh: null, out: 0, last: 'kid' };
const KIDS = [];
function ballTex() {
  const c = mkCanvas(256, 128), x = c.getContext('2d');
  x.fillStyle = '#f7f5ef'; x.fillRect(0, 0, 256, 128);
  x.fillStyle = '#141838';
  for (let i = 0; i < 12; i++) { const cx = (i % 6) * 44 + (Math.floor(i / 6) ? 22 : 0) + 10, cy = Math.floor(i / 6) * 64 + 32; x.beginPath(); for (let k = 0; k < 5; k++) { const a = k / 5 * TAU - Math.PI / 2; x.lineTo(cx + Math.cos(a) * 13, cy + Math.sin(a) * 13); } x.closePath(); x.fill(); }
  x.fillStyle = '#e0553a'; x.fillRect(0, 60, 256, 8);
  return texOf(c);
}
function buildFootball() {
  BALL.mesh = new T.Mesh(new T.SphereGeometry(BALL.r, 18, 12), new T.MeshStandardMaterial({ map: ballTex(), roughness: 0.45 }));
  BALL.mesh.castShadow = true; scene.add(BALL.mesh);
  const pole = M(0x8a6a43, { roughness: 0.9 }), netTex = (() => { const c = mkCanvas(64, 64), x = c.getContext('2d'); x.strokeStyle = 'rgba(245,245,240,0.9)'; x.lineWidth = 2; for (let i = 0; i <= 64; i += 16) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i, 64); x.stroke(); x.beginPath(); x.moveTo(0, i); x.lineTo(64, i); x.stroke(); } const t2 = texOf(c); t2.wrapS = t2.wrapT = T.RepeatWrapping; return t2; })();
  const net = new T.MeshStandardMaterial({ map: netTex, transparent: true, alphaTest: 0.3, side: T.DoubleSide, roughness: 0.9 });
  for (const [gx, dir] of [[PITCH.x0, -1], [PITCH.x1, 1]]) {
    const g = new T.Group(); g.position.set(gx, 0, PITCH.z);
    for (const s of [-1, 1]) { g.add(at(meshOf(new T.CylinderGeometry(0.05, 0.06, PITCH.h, 8), pole, true), 0, PITCH.h / 2, s * PITCH.half)); addCircle(gx, PITCH.z + s * PITCH.half, 0.08, 'small'); }
    const bar = meshOf(new T.CylinderGeometry(0.045, 0.045, PITCH.half * 2 + 0.1, 8), pole, true); bar.rotation.x = Math.PI / 2; bar.position.set(0, PITCH.h, 0); g.add(bar);
    const back = new T.Mesh(new T.PlaneGeometry(PITCH.half * 2, PITCH.h), net); back.material.map.repeat.set(4, 3); back.rotation.y = Math.PI / 2; back.position.set(dir * 1.0, PITCH.h / 2, 0); g.add(back);
    for (const s of [-1, 1]) { const side = new T.Mesh(new T.PlaneGeometry(1.0, PITCH.h), net); side.position.set(dir * 0.5, PITCH.h / 2, s * PITCH.half); g.add(side); }
    scene.add(g);
  }
  footprints.push({ x: (PITCH.x0 + PITCH.x1) / 2, z: PITCH.z, w: PITCH.x1 - PITCH.x0 + 8, d: PITCH.zmax - PITCH.zmin + 6, ang: 0 });
  flatShape(rectPts((PITCH.x0 + PITCH.x1) / 2, PITCH.z, PITCH.x1 - PITCH.x0 + 6, PITCH.zmax - PITCH.zmin + 2), groundMat(TEX.sand, 6, 3, 0xf0e2c4, false), 0.03);
  const looks = [{ shirt: 0xe0553a, lower: 0x141838, skin: 0x4f2f1c, hair: 'short', h: 0.68, sandals: true, shoes: 0x1d1d22 }, { shirt: 0x1f8fd0, lower: 0xf6f1e7, skin: 0x3d2416, hair: 'afro', h: 0.72, sandals: true, shoes: 0xf3b41b }, { shirt: 0xf3b41b, lower: 0x2a2d33, skin: 0x6b4226, hair: 'cap', cap: 0x1e9b57, h: 0.7, sandals: true, shoes: 0xd8452c }];
  looks.forEach((lk, i) => { const h = makeHuman(lk); const x = PITCH.x0 + 3 + i * 7, z = PITCH.z + (i - 1) * 3; h.position.set(x, 0.04, z); scene.add(h); KIDS.push({ h, x, z, keeper: i === 0, cool: 0, sp: 0, name: ['Ally', 'Juma Mdogo', 'Saidi'][i] }); });
}
function kickBall(dirx, dirz, power, lift, who) {
  const l = Math.hypot(dirx, dirz) || 1;
  BALL.vx = dirx / l * power; BALL.vz = dirz / l * power; BALL.vy = lift; BALL.last = who;
  sfx.kick();
}
function playerKick() {
  const fx = -Math.sin(cam.yaw), fz = -Math.cos(cam.yaw), fwd = Math.sin(player.rotation.y) * fx + Math.cos(player.rotation.y) * fz > 0.2;
  const dx = fwd ? fx : Math.sin(player.rotation.y), dz = fwd ? fz : Math.cos(player.rotation.y);
  playEmote(player, 'kick');
  kickBall(dx, dz, speed > 5 ? 17 : 13.5, speed > 5 ? 3.2 : 2.4, 'me');
}
function ballNearPlayer(r) { return !playerVeh && Math.hypot(BALL.x - P.x, BALL.z - P.z) < r && BALL.y < 0.6; }
function updateBall(dt) {
  const B = BALL, steps = 2, h = dt / steps;
  for (let s = 0; s < steps; s++) {
    const px = B.x;
    B.vy -= 9.8 * h; B.x += B.vx * h; B.y += B.vy * h; B.z += B.vz * h;
    const g = groundY(B.x, B.z) + B.r;
    if (B.y < g) { B.y = g; if (B.vy < -1.2) B.vy = -B.vy * 0.42; else B.vy = 0; }
    if (B.y <= g + 0.01) { const k = Math.exp(-1.25 * h); B.vx *= k; B.vz *= k; }
    // posts and walls
    tmpC.x = B.x; tmpC.z = B.z; const bx = B.x, bz = B.z; resolveCircle(tmpC, B.r, null, true);
    if (tmpC.x !== bx || tmpC.z !== bz) { const nx = tmpC.x - bx, nz = tmpC.z - bz, l = Math.hypot(nx, nz) || 1, vn = (B.vx * nx + B.vz * nz) / l; if (vn < 0) { B.vx -= 1.6 * vn * nx / l; B.vz -= 1.6 * vn * nz / l; } B.x = tmpC.x; B.z = tmpC.z; }
    if (!walkable(B.x, B.z)) { B.x -= B.vx * h * 2; B.z -= B.vz * h * 2; B.vx *= -0.4; B.vz *= -0.4; }
    // goals: through the posts and under the bar
    const inMouth = Math.abs(B.z - PITCH.z) < PITCH.half - 0.05 && B.y < PITCH.h;
    if (inMouth && px >= PITCH.x0 && B.x < PITCH.x0) goalScored('me');
    else if (inMouth && px <= PITCH.x1 && B.x > PITCH.x1) goalScored('kids');
    // nets catch the ball
    if (Math.abs(B.z - PITCH.z) < PITCH.half && ((B.x < PITCH.x0 - 0.9 && B.x > PITCH.x0 - 1.3) || (B.x > PITCH.x1 + 0.9 && B.x < PITCH.x1 + 1.3))) { B.vx *= -0.15; B.vz *= 0.3; B.x = B.x < PITCH.x0 ? PITCH.x0 - 0.9 : PITCH.x1 + 0.9; }
  }
  // dribble: running into the ball pushes it along
  if (ballNearPlayer(0.5 + speed * 0.04) && mode === 'play' && !isDown(player)) {
    const fx = Math.sin(player.rotation.y), fz = Math.cos(player.rotation.y), sp = Math.max(1.5, speed * 1.18);
    if (B.vx * fx + B.vz * fz < sp) { B.vx = fx * sp; B.vz = fz * sp; B.x = P.x + fx * 0.52; B.z = P.z + fz * 0.52; B.last = 'me'; }
  }
  // far away or stuck out of play: back to the middle
  const outside = B.x < PITCH.x0 - 8 || B.x > PITCH.x1 + 8 || B.z < PITCH.zmin - 8 || B.z > PITCH.zmax + 8;
  B.out = outside || (job && job.type === 'match' && job.pause > 0) ? B.out + dt : 0;
  if (B.out > (outside ? 3 : 1.6)) { B.x = (PITCH.x0 + PITCH.x1) / 2; B.z = PITCH.z; B.y = 0.6; B.vx = B.vz = B.vy = 0; B.out = 0; if (job && job.type === 'match') job.pause = 0; }
  B.mesh.position.set(B.x, B.y, B.z);
  const v = Math.hypot(B.vx, B.vz); if (v > 0.05) { B.mesh.rotation.x += B.vz * dt / B.r; B.mesh.rotation.z -= B.vx * dt / B.r; }
}
const tmpC = { x: 0, z: 0 };
function goalScored(by) {
  if (job && job.type === 'match' && !job.pause) {
    if (by === 'me') { job.me++; splash('GOOOL!', `${job.me} – ${job.kids}`, 'gold'); sfx.goal(); playEmote(player, 'cheer'); }
    else { job.kids++; splash('GOLI LA WATOTO', `${job.me} – ${job.kids}`, 'bad'); for (const k of KIDS) playEmote(k.h, 'cheer'); }
    job.pause = 1;
    if (job.me >= 3 || job.kids >= 3) endMatch();
  } else if (by === 'me' && Math.hypot(BALL.x - P.x, BALL.z - P.z) < 30) { sfx.goal(); for (const k of KIDS) if (!k.keeper) playEmote(k.h, 'clap'); }
  BALL.out = 0.01;
}
function openKids() {
  const working = job && job.type === 'match';
  openMenu({ eyebrow: 'Beach football · Uptown beach', title: 'Juma Mdogo', lede: working ? `${job.me} – ${job.kids}. "Cheza, cheza!" (Play on!)` : '"Unacheza?" Play us, first to 3 goals. Our keeper Ally is tough! Mama Pwani gives the winner a prize. Run into the ball to dribble and press F to shoot.', items: working ? [] : [
    { label: 'Mechi ya ufukweni', desc: `You against the kids, first to 3 · prize ${tsh(PRICES.beachPrize)}`, price: 'Play', act: startMatch },
  ] });
}
function startMatch() {
  if (job) failJobSilently();
  job = { type: 'match', me: 0, kids: 0, pause: 1, t0: now(), limit: 240, title: 'Beach football', desc: '' };
  BALL.out = 1.6; sfx.whistle(); splash('MECHI!', 'First to 3 goals', 'gold');
  help('Shoot at the west goal (Ally is in it). Defend the east one. Run into the ball to dribble, <kbd>F</kbd> to shoot.', 6000);
}
function endMatch() {
  const won = job.me > job.kids, me = job.me, kids = job.kids; job = null;
  setTimeout(() => {
    if (won) { earn(PRICES.beachPrize, 'Beach football prize'); splash('UMESHINDA!', `${me} – ${kids} · Mama Pwani pays ${tsh(PRICES.beachPrize)}`, 'gold'); sfx.win(); state.stats.jobs++; mpEvent(`beat the beach kids ${me}–${kids}`); }
    else { splash('WATOTO WASHINDA', `${me} – ${kids}. Try again!`, 'bad'); for (const k of KIDS) playEmote(k.h, 'dance'); }
  }, 1200);
}
function updateKids(dt, t) {
  const B = BALL, near = Math.abs(P.x - (PITCH.x0 + PITCH.x1) / 2) < 120 && Math.abs(P.z - PITCH.z) < 120;
  const match = job && job.type === 'match';
  if (match) { const left = job.limit - (now() - job.t0); if (left <= 0) { job.limit = 1e9; if (job.me === job.kids) { help('Time is up: next goal wins!', 3000); } else endMatch(); } }
  for (const k of KIDS) {
    k.cool -= dt;
    let tx, tz, top = match ? 4.6 : 3.2;
    if (k.keeper) { tx = PITCH.x0 + 0.6; tz = PITCH.z + clamp(B.z - PITCH.z, -PITCH.half + 0.3, PITCH.half - 0.3); top = 4; }
    else {
      const chaser = KIDS.filter(q => !q.keeper).sort((a, b2) => Math.hypot(a.x - B.x, a.z - B.z) - Math.hypot(b2.x - B.x, b2.z - B.z))[0] === k;
      if (chaser || !match) { tx = B.x + 0.4; tz = B.z; } else { tx = (B.x + PITCH.x1) / 2 + 2; tz = PITCH.z + (k.name === 'Saidi' ? 3 : -3); }
      if (!near) { tx = k.x; tz = k.z; }
    }
    const dx = tx - k.x, dz = tz - k.z, d = Math.hypot(dx, dz);
    const want = d > 0.4 ? Math.min(top, d * 2.2) : 0;
    k.sp = damp(k.sp, want, 6, dt);
    if (d > 0.05) { k.x += dx / d * k.sp * dt; k.z += dz / d * k.sp * dt; k.h.rotation.y = angDamp(k.h.rotation.y, Math.atan2(dx, dz), 8, dt); }
    k.x = clamp(k.x, PITCH.x0 - 1, PITCH.x1 + 1); k.z = clamp(k.z, PITCH.zmin, PITCH.zmax);
    // touch the ball
    const bd = Math.hypot(B.x - k.x, B.z - k.z);
    if (bd < 0.55 && B.y < 0.7 && k.cool <= 0 && (!match || !job.pause)) {
      k.cool = 0.8;
      if (k.keeper) { kickBall(1, rr(-0.4, 0.4), rr(9, 12), 4, 'kid'); playEmote(k.h, 'kick'); }
      else {
        const gx = match ? PITCH.x1 + 1 : (k.name === 'Saidi' ? PITCH.x0 + 4 : PITCH.x1 - 4), gz = PITCH.z + rr(-1.2, 1.2), toGoal = Math.hypot(gx - k.x, gz - k.z);
        kickBall(gx - k.x, gz - k.z, match ? (toGoal < 9 ? rr(9, 12) : rr(5, 7.5)) : rr(4, 6), match && toGoal < 9 ? rr(0.8, 2.2) : 0.6, 'kid'); playEmote(k.h, 'kick');
      }
    }
    k.h.position.set(k.x, 0.04, k.z);
    if (near) animHuman(k.h, dt, t, k.sp, 'loco');
  }
  if (match && job.pause && BALL.out === 0) job.pause = Math.max(0, job.pause - dt);
}

/* ---------- fishing off the pier ---------- */
const FISHES = [
  { id: 'kibua', name: 'Kibua · mackerel', kg: [0.2, 0.5], price: 6000, p: 0.3 },
  { id: 'changu', name: 'Changu · emperor', kg: [0.4, 1.8], price: 9000, p: 0.27 },
  { id: 'pweza', name: 'Pweza · octopus', kg: [0.6, 2.5], price: 8000, p: 0.2 },
  { id: 'kolekole', name: 'Kolekole · trevally', kg: [0.8, 3.5], price: 9000, p: 0.13 },
  { id: 'nguru', name: 'Nguru · kingfish', kg: [2, 7], price: 13000, p: 0.05 },
  { id: 'ndala', name: 'A lost flip-flop', kg: [0.1, 0.1], price: 0, p: 0.05 },
];
const FISH = { on: false, phase: '', t: 0, bob: null, line: null, catchT: 0 };
const atPierEnd = () => !playerVeh && onPier(P.x, P.z) && P.z > PIER.z1 - 7;
function buildFishing() {
  FISH.bob = new T.Group();
  FISH.bob.add(at(new T.Mesh(new T.SphereGeometry(0.06, 10, 8), M(0xd8352a, { roughness: 0.4 })), 0, 0.03, 0));
  FISH.bob.add(at(new T.Mesh(new T.CylinderGeometry(0.012, 0.012, 0.14, 6), M(0xf6f1e7)), 0, 0.12, 0));
  FISH.bob.visible = false; scene.add(FISH.bob);
  const lg = new T.BufferGeometry(); lg.setAttribute('position', new T.Float32BufferAttribute(new Float32Array(6), 3));
  FISH.line = new T.Line(lg, new T.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.95 })); FISH.line.frustumCulled = false; FISH.line.visible = false; scene.add(FISH.line);
}
function startFishing() {
  if (!state.gear.line) { help('You need a <b class="hl">mshipi</b> (handline). Nahodha Salum sells them at the pier.', 3500); sfx.deny(); return; }
  if (state.gear.bait <= 0) { help('No bait left. Nahodha Salum sells dagaa bait.', 3000); sfx.deny(); return; }
  if ((state.fish || []).length >= 8) { help('Your cool box is full. Sell your catch to Nahodha Salum.', 3000); sfx.deny(); return; }
  state.gear.bait--;
  FISH.on = true; FISH.phase = 'wait'; FISH.t = rr(3.5, 11); FISH.catchT = 0;
  player.rotation.y = 0; player.userData.prevYaw = 0;
  FISH.bx = P.x + rr(-3, 3); FISH.bz = P.z + rr(7, 11);
  FISH.bob.position.set(FISH.bx, 0.0, FISH.bz); FISH.bob.visible = true; FISH.line.visible = true;
  playEmote(player, 'point'); sfx.jump();
  help(`Line out. Wait for a bite, then press <kbd>E</kbd> fast. Bait left: ${state.gear.bait}.`, 3500);
}
function stopFishing(msg) { FISH.on = false; FISH.bob.visible = false; FISH.line.visible = false; if (msg) note(msg); }
function reelIn() {
  if (FISH.phase !== 'bite') { stopFishing('You reeled in too early. The bait is gone.'); return; }
  const r = rnd(); let acc = 0, f = FISHES[0]; for (const q of FISHES) { acc += q.p; if (r <= acc) { f = q; break; } }
  const kg = Math.round(rr(f.kg[0], f.kg[1]) * 10) / 10, hold = 0.92 - kg * 0.06;
  if (rnd() > hold) { stopFishing(''); splash('AMEKIMBIA!', 'It got away', 'bad'); sfx.miss(); return; }
  stopFishing('');
  if (f.price === 0) { splash('NDALA!', 'You caught a lost flip-flop', 'bad'); sfx.miss(); return; }
  (state.fish = state.fish || []).push({ id: f.id, kg }); state.stats.fish = (state.stats.fish || 0) + 1;
  splash('SAMAKI!', `${f.name} · ${kg} kg · about ${tsh(roundTo(kg * f.price, 500))}`, 'gold'); sfx.win(); playEmote(player, 'cheer');
}
function fishValue() { let v = 0; for (const c of state.fish || []) { const f = FISHES.find(q => q.id === c.id); if (f) v += c.kg * f.price; } return roundTo(v, 500); }
function updateFishing(dt) {
  if (!FISH.on) return;
  if (mode === 'phone' || mode === 'menu') return;
  if (!atPierEnd() || speed > 0.6 || mode !== 'play') { stopFishing('You pulled your line in.'); return; }
  FISH.t -= dt;
  const hand = new T.Vector3(); player.userData.b.handR.getWorldPosition(hand);
  let bobY = Math.sin(now() * 2.2) * 0.03;
  if (FISH.phase === 'wait' && FISH.t <= 0) { FISH.phase = 'bite'; FISH.t = 1.35; sfx.beep(true); help('<b class="hl">Vuta!</b> A bite: press <kbd>E</kbd> now!', 1400); }
  else if (FISH.phase === 'bite') { bobY = -0.12 + Math.sin(now() * 24) * 0.05; if (FISH.t <= 0) { stopFishing(''); splash('AMEKULA CHAMBO', 'The fish took the bait', 'bad'); sfx.miss(); return; } }
  FISH.bob.position.set(FISH.bx, bobY, FISH.bz);
  const a = FISH.line.geometry.attributes.position; a.setXYZ(0, hand.x, hand.y, hand.z); a.setXYZ(1, FISH.bx, bobY + 0.2, FISH.bz); a.needsUpdate = true;
  if (!player.userData.emote) playEmote(player, 'point');
}

/* ---------- rain showers ---------- */
// the island's weather: time is cut into 7-minute slots; about four in ten bring a 45 to 85 second shower at a set moment
function sharedRain(tsec) {
  const SLOT = 420, k = Math.floor(tsec / SLOT), r = mulberry32(k * 7919 + 2027);
  if (r() > 0.4) return { r: 0, k };
  const start = k * SLOT + 30 + r() * 250, len = 45 + r() * 40, amt = 0.65 + r() * 0.35;
  return { r: tsec >= start && tsec < start + len ? amt : 0, k };
}
const WEATHER = { rain: 0, target: 0, next: 0, until: 0, mesh: null, told: false, applied: -1, snd: null, wet: [] };
function buildRain() {
  const n = BUILD_HQ ? 4200 : 1800, pos = new Float32Array(n * 6);
  for (let i = 0; i < n; i++) { const x = rr(-30, 30), y = rr(0, 26), z = rr(-30, 30); pos.set([x, y, z, x + 0.08, y - 0.9, z + 0.04], i * 6); }
  const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
  WEATHER.mesh = new T.LineSegments(g, new T.LineBasicMaterial({ color: 0xdce6f0, transparent: true, opacity: 0, depthWrite: false, fog: false }));
  WEATHER.mesh.frustumCulled = false; WEATHER.mesh.visible = false; scene.add(WEATHER.mesh);
  WEATHER.next = now() + rr(150, 300);
  // hard surfaces that turn glossy when wet
  const wetMaps = new Set([TEX.roadT, TEX.roadR, TEX.roadS, TEX.paver, TEX.plaza, TEX.concrete, TEX.slab, TEX.tiles].filter(Boolean)), seen = new Set();
  scene.traverse(o => { if (!o.isMesh || Array.isArray(o.material)) return; const m = o.material; if (seen.has(m) || !m.isMeshStandardMaterial || !m.map) return; seen.add(m); for (const w of wetMaps) if (m.map === w || m.map.image === w.image) { WEATHER.wet.push({ m, r: m.roughness, e: m.envMapIntensity, c: m.color.clone() }); break; } });
}
const FOG_RAIN = C(0x8d949c), FOG_RAIN_N = C(0x141820);
function applyWeather(r) {
  applyNight(smooth(night));
  for (const w of WEATHER.wet) { w.m.roughness = lerp(w.r, 0.18, r); w.m.envMapIntensity = lerp(w.e, 1.6, r); w.m.color.copy(w.c).multiplyScalar(1 - 0.28 * r); }
  const fn = HQ() ? 260 : 190, ff = HQ() ? 1650 : 880;
  if (r <= 0.001) { skyU.uRain.value = 0; cloudU.uRain.value = 0; scene.fog.near = fn; scene.fog.far = ff; return; }
  skyU.uRain.value = r; cloudU.uRain.value = r;
  sun.intensity *= 1 - 0.72 * r; hemi.intensity *= 1 + 0.6 * r;
  scene.fog.color.lerp(night > 0.5 ? FOG_RAIN_N : FOG_RAIN, r * 0.8); scene.background.copy(scene.fog.color);
  scene.fog.near = lerp(fn, 60, r); scene.fog.far = lerp(ff, 520, r);
  renderer.toneMappingExposure *= 1 - 0.1 * r;
}
function updateRain(dt) {
  const W2 = WEATHER;
  // everyone shares the same showers: they follow the clock (the server's, on afconcity.com), not a dice roll on each phone
  if (!W2.manual) { const sh = sharedRain(realNow() / 1000); W2.target = sh.r; if (sh.r && sh.k !== W2.k) { W2.k = sh.k; W2.told = false; } }
  W2.rain = W2.target > W2.rain ? Math.min(W2.target, W2.rain + dt / 6) : Math.max(W2.target, W2.rain - dt / 8);
  if (W2.rain > 0.2 && !W2.told && mode === 'play') { W2.told = true; help('<b class="hl">Mvua!</b> A tropical shower. Roads are slippery, so brake early.', 4500); }
  if (Math.abs(W2.rain - W2.applied) > 0.004 || (W2.rain === 0 && W2.applied !== 0)) { applyWeather(W2.rain); W2.applied = W2.rain; }
  const m = W2.mesh; m.visible = W2.rain > 0.01; m.material.opacity = 0.62 * W2.rain;
  if (m.visible) {
    const P2 = m.geometry.attributes.position.array, fall = 16 * dt, cx = camera.position.x, cy = camera.position.y, cz = camera.position.z;
    for (let i = 0; i < P2.length; i += 6) {
      P2[i + 1] -= fall; P2[i + 4] -= fall; P2[i] += 0.8 * dt; P2[i + 3] += 0.8 * dt;
      if (P2[i + 4] < cy - 12) { const x = cx + rr(-30, 30), y = cy + rr(8, 18), z = cz + rr(-30, 30); P2[i] = x; P2[i + 1] = y; P2[i + 2] = z; P2[i + 3] = x + 0.08; P2[i + 4] = y - 0.9; P2[i + 5] = z + 0.04; }
      else if (Math.abs(P2[i] - cx) > 32 || Math.abs(P2[i + 2] - cz) > 32) { P2[i] = cx + rr(-30, 30); P2[i + 2] = cz + rr(-30, 30); P2[i + 3] = P2[i] + 0.08; P2[i + 5] = P2[i + 2] + 0.04; }
    }
    m.geometry.attributes.position.needsUpdate = true;
  }
  // rain on the roof: filtered noise
  if (AU.ctx && AU.noise && AU.on) {
    if (!W2.snd && W2.rain > 0.02) { const s = AU.ctx.createBufferSource(); s.buffer = AU.noise; s.loop = true; const f = AU.ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1400; f.Q.value = 0.6; const g = AU.ctx.createGain(); g.gain.value = 0; s.connect(f); f.connect(g); g.connect(AU.master); s.start(); W2.snd = { s, g }; }
    if (W2.snd) { W2.snd.g.gain.value = 0.22 * W2.rain; if (W2.rain <= 0.001) { try { W2.snd.s.stop(); } catch (e) {} W2.snd = null; } }
  }
}
const wetGrip = () => 1 - 0.32 * WEATHER.rain;

/* ---------- police ---------- */
const POLICE = { on: false, v: null, m: null, rider: null, level: 0, lost: 0, held: 0, stuck: 0, lightT: 0, crimes: [], siren: null };
function buildPolice() {
  POLICE.m = makeVehicle('boda', 0xf4f4f0); POLICE.m.visible = false; scene.add(POLICE.m);
  const r = makeHuman({ skin: 0x3d2416, shirt: 0xf4f4f0, lower: 0x1a2340, pants: true, longSleeve: true, hair: 'police', shoes: 0x0d0d0d, style: 'button' });
  r.position.set(0, 0.1, -0.12); POLICE.m.add(r); POLICE.rider = r;
  const lm = new T.MeshBasicMaterial({ color: 0x2a6bff }); POLICE.light = new T.Mesh(new T.SphereGeometry(0.07, 10, 8), lm); POLICE.light.position.set(0, 1.25, -0.75); POLICE.m.add(POLICE.light);
  const lm2 = new T.MeshBasicMaterial({ color: 0xff2a2a }); POLICE.light2 = new T.Mesh(new T.SphereGeometry(0.07, 10, 8), lm2); POLICE.light2.position.set(0.14, 1.25, -0.75); POLICE.m.add(POLICE.light2);
}
function reportCrime(kind) {
  POLICE.crimes = POLICE.crimes.filter(c => now() - c < 120); POLICE.crimes.push(now());
  const lvl = POLICE.crimes.length >= 3 ? 2 : 1;
  if (!POLICE.on) startChase(lvl); else POLICE.level = Math.max(POLICE.level, lvl);
  void kind;
}
function startChase(level) {
  level = level || 1;
  const v = playerVeh, bx = v ? v.x : P.x, bz = v ? v.z : P.z, yaw = v ? v.yaw : player.rotation.y;
  let sx = bx - Math.sin(yaw) * 70, sz = bz - Math.cos(yaw) * 70;
  for (let k = 0; k < 20 && (!walkable(sx, sz) || pointBlocked(sx, sz, 1)); k++) { const a = k * 0.7; sx = bx + Math.cos(a) * 70; sz = bz + Math.sin(a) * 70; }
  POLICE.on = true; POLICE.level = level; POLICE.lost = 0; POLICE.held = 0; POLICE.stuck = 0;
  POLICE.v = { x: sx, z: sz, yaw: Math.atan2(bx - sx, bz - sz), vf: 0 };
  POLICE.m.visible = true; POLICE.m.position.set(sx, 0.04, sz);
  splash('POLISI!', 'Someone reported you. Lose them, or stop and pay', 'bad');
  sirenOn(true);
}
function sirenOn(on) {
  if (!AU.ctx || !AU.on) return;
  if (on && !POLICE.siren) { const o = AU.ctx.createOscillator(), g = AU.ctx.createGain(), l = AU.ctx.createOscillator(), lg = AU.ctx.createGain(); o.type = 'square'; o.frequency.value = 700; l.frequency.value = 1.6; lg.gain.value = 180; l.connect(lg); lg.connect(o.frequency); g.gain.value = 0; o.connect(g); g.connect(AU.master); o.start(); l.start(); POLICE.siren = { o, l, g }; }
  if (!on && POLICE.siren) { try { POLICE.siren.o.stop(); POLICE.siren.l.stop(); } catch (e) {} POLICE.siren = null; }
}
function endChase(caught) {
  POLICE.on = false; POLICE.m.visible = false; sirenOn(false); POLICE.crimes = [];
  if (caught) {
    if (playerVeh) { const v = playerVeh; exitVehicle(true); if (v.dala) { if (job && job.type === 'dala') endDala(true); } else resetRental(v); }
    const fine = spend(Math.min(PRICES.policeFine * POLICE.level, money()), 'Police fine', 'lost');
    splash('UMEKAMATWA!', `Arrested. Police fine ${tsh(fine)}`, 'bad'); sfx.deny();
  } else { splash('UMETOROKA', 'You lost the police', 'gold'); sfx.win(); }
}
const polC = { x: 0, z: 0 };
function updatePolice(dt, t) {
  if (!POLICE.on) return;
  const Pv = POLICE.v, tv = playerVeh, tx = tv ? tv.x + tv.vx * 0.6 : P.x, tz = tv ? tv.z + tv.vz * 0.6 : P.z;
  const dx = tx - Pv.x, dz = tz - Pv.z, d = Math.hypot(dx, dz);
  const want = Math.atan2(dx, dz), diff = angWrap(want - Pv.yaw);
  Pv.yaw += clamp(diff, -2.2 * dt, 2.2 * dt);
  const top = POLICE.level >= 2 ? 23 : 20.5, target = d < 6 ? Math.max(0, (d - 2.5) * 2) : top * (Math.abs(diff) > 1.2 ? 0.5 : 1);
  Pv.vf = damp(Pv.vf, target, target > Pv.vf ? 1.4 : 4, dt);
  const ox = Pv.x, oz = Pv.z;
  Pv.x += Math.sin(Pv.yaw) * Pv.vf * dt; Pv.z += Math.cos(Pv.yaw) * Pv.vf * dt;
  polC.x = Pv.x; polC.z = Pv.z; resolveCircle(polC, 0.6, null, true); resolveCircle(polC, 0.6, null, true); Pv.x = polC.x; Pv.z = polC.z;
  if (!walkable(Pv.x, Pv.z)) { Pv.x = ox; Pv.z = oz; }
  const moved = Math.hypot(Pv.x - ox, Pv.z - oz) / Math.max(dt, 1e-3);
  POLICE.stuck = moved < 1 && d > 8 ? POLICE.stuck + dt : 0;
  if (POLICE.stuck > 2.5) { // take another street: reappear behind the player, out of sight
    const yaw = tv ? tv.yaw : player.rotation.y;
    for (let k = 0; k < 16; k++) { const a = yaw + Math.PI + (k - 8) * 0.25, x = tx + Math.sin(a) * 45, z = tz + Math.cos(a) * 45; if (walkable(x, z) && !pointBlocked(x, z, 1.2)) { Pv.x = x; Pv.z = z; Pv.yaw = Math.atan2(tx - x, tz - z); break; } }
    POLICE.stuck = 0;
  }
  POLICE.m.position.set(Pv.x, 0.04, Pv.z); POLICE.m.rotation.y = Pv.yaw;
  POLICE.m.userData.body.rotation.z = damp(POLICE.m.userData.body.rotation.z, clamp(-diff * 0.4, -0.35, 0.35), 6, dt);
  for (const w of POLICE.m.userData.wheels) w.g.rotation.x += Pv.vf * dt / w.r;
  const blink = Math.floor(now() * 6) % 2; POLICE.light.visible = !!blink; POLICE.light2.visible = !blink;
  if (d < 140) animHuman(POLICE.rider, dt, t, 0, 'ride');
  if (POLICE.siren) POLICE.siren.g.gain.value = 0.05 * clamp(1 - d / 160, 0, 1);
  // caught: close and you are (nearly) stopped
  const ps = tv ? Math.abs(tv.vf) : speed;
  POLICE.held = d < 4.5 && ps < 3.5 ? POLICE.held + dt : Math.max(0, POLICE.held - dt);
  if (POLICE.held > 1.3) { endChase(true); return; }
  POLICE.lost = d > 150 ? POLICE.lost + dt : Math.max(0, POLICE.lost - dt * 0.5);
  if (POLICE.lost > 10) endChase(false);
}

/* ---------- build and per-frame ---------- */
function buildLife() { buildAgents(); buildDala(); buildFootball(); buildFishing(); buildRain(); buildPolice(); }
function lifeInteraction() {
  if (FISH.on) return { text: FISH.phase === 'bite' ? 'Vuta! Pull it in' : 'Reel in', act: reelIn };
  if (atPierEnd()) return { text: state.gear.line ? `Fish here · bait ${state.gear.bait}` : 'Fish here (needs a handline)', act: startFishing };
  for (const a of AGENTS) if (Math.hypot(a.x - P.x, a.z - P.z) < 2.8) return { text: 'Mobile money agent · Pesa', act: () => openAgent(a.id) };
  if (!playerVeh && job && job.type === 'dala' && DALA.v && Math.hypot(DALA.v.x - P.x, DALA.v.z - P.z) < 4.2) return { text: 'Get back in the daladala', act: () => enterVehicle(DALA.v) };
  for (const k of KIDS) if (!k.keeper && Math.hypot(k.x - P.x, k.z - P.z) < 2.6) return { text: job && job.type === 'match' ? 'Talk to the kids' : 'Beach football with the kids', act: openKids };
  return null;
}
function lifeSecondary() {
  if (ballNearPlayer(1.7) && mode === 'play') return { text: 'Shoot the ball', act: playerKick };
  return null;
}
function updateLife(dt, t) {
  if (mode === 'play' || mode === 'menu') updateHunger(dt);
  updateRain(dt);
  updateDalaWorld(dt, t);
  if (job && job.type === 'dala' && mode === 'play') updateDala(dt);
  if (Math.abs(P.x - (PITCH.x0 + PITCH.x1) / 2) < 160 && Math.abs(P.z - PITCH.z) < 160) { updateBall(dt); updateKids(dt, t); }
  updateFishing(dt);
  updatePolice(dt, t);
}
