/* ===================== 40 game: money, coins, damage, thieves, jobs, menus, kickoff ===================== */
/* game clock in seconds: stops while the pause menu is open or the tab is hidden, so timed jobs and cooldowns are fair */
let GAME_T = 0;
const now = () => GAME_T;
const RT = { fineCool: 0, boost: 0, tipsy: 0, lagers: 0, lagerT: 0, stamina: 100, tired: false, invuln: 0, hurtT: -99, downT: 0, jumpV: 0, jumpY: 0, tackleT: 0, shake: 0 };
let mode = 'intro', job = null, mpDirty = true;
let player = null;
let P = new T.Vector3(START.x, 0.04, START.z), speed = 0;

/* ---------- money ---------- */
function badAmount(n, where, label) { if (Number.isFinite(n)) return false; if (DEV) (window.__badMoney = window.__badMoney || []).push(`${where} ${label} ${n} ${new Error().stack.split('\n').slice(2, 5).join(' | ')}`); return true; }
function earn(n, label) { if (badAmount(n, 'earn', label)) return; n = Math.round(n); if (n <= 0) return; state.cash += n; state.stats.earned += n; moneyDelta(n, label); mpDirty = true; }
/* pays from cash first; the rest goes by Pesa (with the M-Pesa send fee) unless the seller wants cash */
function spend(n, label, kind, cashOnly) {
  if (badAmount(n, 'spend', label)) return 0;
  n = Math.round(n); if (n <= 0) return 0;
  const c = Math.min(n, state.cash); let b = cashOnly ? 0 : Math.min(n - c, Math.max(0, state.bank));
  let fee = b > 0 ? Math.min(pesaSendFee(b), Math.max(0, state.bank - b)) : 0;
  if (b > 0 && state.bank < b + fee) { b = Math.max(0, state.bank - fee); }
  const paid = c + b; if (paid <= 0) return 0;
  state.cash -= c; state.bank -= b + fee;
  if (kind === 'lost') state.stats.lost += paid; else state.stats.spent += paid + fee;
  moneyDelta(-paid, b ? `${label || ''} · Pesa${fee ? ` +${fmt(fee)} fee` : ''}` : label); mpDirty = true; sfx.cashOut(); return paid;
}
function heal(n) { state.hp = Math.min(100, state.hp + n); }

/* ---------- coins: shared street coins, coin rush, dropped cash ---------- */
const COIN = { street: [], rush: [], drops: new Map(), picked: new Set(), myPk: [], myDrops: [], epoch: -1, rushEpoch: -1, segs: null, segLen: 0, lastRushNote: -1 };
const RUSH_PERIOD = 180, RUSH_LEN = 45, STREET_PERIOD = 300;
function rushInfo() { const s = Date.now() / 1000, e = Math.floor(s / RUSH_PERIOD), tin = s - e * RUSH_PERIOD; return { e, active: tin < RUSH_LEN, left: RUSH_LEN - tin, next: RUSH_PERIOD - tin, spot: RUSH_SPOTS[e % RUSH_SPOTS.length], nextSpot: RUSH_SPOTS[(e + 1) % RUSH_SPOTS.length] }; }
function coinOk(x, z) { return walkable(x, z) && !pointBlocked(x, z, 0.8) && !pointInStadiumBowl(x, z); }
function genStreet(epoch) {
  if (!COIN.segs) { COIN.segs = roadSegs.filter(s => (s.c === 'T' || s.c === 'R' || s.c === 'F') && Math.max(s.x0, s.x1) > BOUNDS.x0 && Math.min(s.x0, s.x1) < BOUNDS.x1 && Math.min(s.z0, s.z1) > BOUNDS.z0 - 20).map(s => Object.assign({ L: Math.hypot(s.x1 - s.x0, s.z1 - s.z0) }, s)); COIN.segLen = COIN.segs.reduce((a, s) => a + s.L, 0); }
  const r = mulberry32(epoch * 7919 + 13), out = [];
  let guard = 0;
  while (out.length < 56 && guard++ < 2000) {
    let k = r() * COIN.segLen, s = COIN.segs[0];
    for (const q of COIN.segs) { if (k < q.L) { s = q; break; } k -= q.L; }
    const t = k / s.L, dx = (s.x1 - s.x0) / s.L, dz = (s.z1 - s.z0) / s.L, off = (r() * 2 - 1) * (s.hw + (s.c === 'F' ? 0 : 1.2));
    const x = s.x0 + dx * s.L * t + dz * off, z = s.z0 + dz * s.L * t - dx * off;
    if (!coinOk(x, z)) continue;
    const n = 1 + Math.floor(r() * 3);
    for (let j = 0; j < n && out.length < 56; j++) { const cx = x + dx * j * 1.6, cz = z + dz * j * 1.6; if (coinOk(cx, cz)) out.push({ id: epoch * 1000 + out.length, x: cx, z: cz, v: PAY.coin, kind: 0 }); }
  }
  const risky = [];
  for (const s of COIN.segs) if (s.c === 'T') risky.push(s);
  for (let i = 0; i < 4 && risky.length; i++) { const s = risky[Math.floor(r() * risky.length)], t = 0.2 + r() * 0.6, lane = (r() < 0.5 ? 1 : -1) * 2.2, dx = (s.x1 - s.x0) / s.L, dz = (s.z1 - s.z0) / s.L; out.push({ id: epoch * 1000 + 100 + i, x: s.x0 + dx * s.L * t + dz * lane, z: s.z0 + dz * s.L * t - dx * lane, v: PAY.bundle, kind: 2 }); }
  THIEF_HOMES.forEach((h, i) => { const x = h.x + (r() - 0.5) * 16, z = h.z + (r() - 0.5) * 16; if (coinOk(x, z)) out.push({ id: epoch * 1000 + 110 + i, x, z, v: PAY.stash, kind: 2 }); });
  return out;
}
function genRush(e) {
  const spot = RUSH_SPOTS[e % RUSH_SPOTS.length], r = mulberry32(e * 104729 + 7), out = [];
  let guard = 0;
  while (out.length < 26 && guard++ < 900) { const a = r() * TAU, d = Math.sqrt(r()) * spot.r, x = spot.x + Math.cos(a) * d, z = spot.z + Math.sin(a) * d; if (coinOk(x, z)) out.push({ id: e * 1000 + 500 + out.length, x, z, v: PAY.rushCoin, kind: 1 }); }
  return out;
}
function myPick(id) { COIN.picked.add(id); COIN.myPk.push(id); if (COIN.myPk.length > 40) COIN.myPk.shift(); mpDirty = true; }
let coinMeshes = null, coinFX = [];
function buildCoins() {
  const g = new T.CylinderGeometry(0.24, 0.24, 0.05, 28); g.rotateX(Math.PI / 2);
  const rim = new T.TorusGeometry(0.24, 0.02, 6, 28);
  const silver = new T.MeshStandardMaterial({ color: C(0xe3e7ec), metalness: 1, roughness: 0.2, emissive: C(0x222222), emissiveIntensity: 0.3 });
  const gold = new T.MeshStandardMaterial({ color: C(0xffc845), metalness: 1, roughness: 0.22, emissive: C(0x6a4300), emissiveIntensity: 0.6 });
  const cash = new T.MeshStandardMaterial({ color: C(0x3f9a5a), roughness: 0.6, emissive: C(0x0d3a1a), emissiveIntensity: 0.5 });
  const beam = new T.MeshBasicMaterial({ color: 0xffe08a, transparent: true, opacity: 0.22, depthWrite: false, blending: T.AdditiveBlending, side: T.DoubleSide });
  const mk = (geo, mat, n) => { const m = new T.InstancedMesh(geo, mat, n); m.instanceMatrix.setUsage(T.DynamicDrawUsage); m.count = 0; m.frustumCulled = false; m.castShadow = true; scene.add(m); return m; };
  coinMeshes = { s: mk(g, silver, 120), g: mk(g, gold, 60), c: mk(roundedBox(0.36, 0.1, 0.2, 0.03, 1), cash, 60), b: mk(new T.CylinderGeometry(0.3, 0.3, 26, 10, 1, true), beam, 120) };
  coinMeshes.b.castShadow = false;
  void rim;
}
const coinO3 = new T.Object3D();
function allCoins() {
  const list = [];
  for (const c of COIN.street) if (!COIN.picked.has(c.id)) list.push(c);
  for (const c of COIN.rush) if (!COIN.picked.has(c.id)) list.push(c);
  for (const d of COIN.drops.values()) if (!COIN.picked.has(d.id)) list.push(d);
  return list;
}
function updateCoins(dt, t) {
  const ep = Math.floor(Date.now() / 1000 / STREET_PERIOD);
  if (ep !== COIN.epoch) { COIN.epoch = ep; COIN.street = genStreet(ep); if (mode === 'play' && t > 5) note('Fresh coins have dropped on the streets.'); }
  const ri = rushInfo();
  if (ri.active && ri.e !== COIN.rushEpoch) { COIN.rushEpoch = ri.e; COIN.rush = genRush(ri.e); RT.rushGot = 0; if (mode === 'play') { splash('COIN RUSH!', `Gold coins at ${ri.spot.name}`, 'gold'); sfx.rush(); } }
  if (!ri.active && COIN.rush.length) { if (RT.rushGot) note(`Coin rush over. You grabbed ${RT.rushGot} gold coin${RT.rushGot === 1 ? '' : 's'}.`); COIN.rush = []; RT.rushGot = 0; }
  // my drops expire after 90 s
  const ms = Date.now();
  COIN.myDrops = COIN.myDrops.filter(d => ms - d.t < 90000 && !COIN.picked.has(d.id));
  for (const [id, d] of COIN.drops) if (d.mine && !COIN.myDrops.includes(d)) COIN.drops.delete(id);
  // pickups
  const reach = playerVeh ? 2.8 : 1.7;
  const list = allCoins();
  if (mode === 'play' && !isDown(player)) for (const c of list) {
    const dx = c.x - P.x, dz = c.z - P.z;
    if (dx * dx + dz * dz < reach * reach) {
      myPick(c.id); state.stats.coins++;
      earn(c.v, c.kind === 1 ? 'Gold coin' : c.drop ? 'Dropped cash' : c.kind === 2 ? 'Cash bundle' : '');
      if (c.kind === 1) RT.rushGot = (RT.rushGot || 0) + 1;
      sfx.coin(c.kind); sparkle(c.x, 0.9, c.z, c.kind);
      if (c.mine) COIN.drops.delete(c.id);
    }
  }
  // draw
  const ms2 = coinMeshes; let ns = 0, ng = 0, nc = 0, nb = 0;
  for (const c of list) {
    if (COIN.picked.has(c.id)) continue;
    if (Math.abs(c.x - camera.position.x) > 260 || Math.abs(c.z - camera.position.z) > 260) continue;
    const bob = Math.sin(t * 2.4 + c.x) * 0.12;
    coinO3.position.set(c.x, 0.85 + bob, c.z); coinO3.rotation.set(0, t * 2.6 + c.z, 0); coinO3.scale.setScalar(c.kind === 1 ? 1.25 : 1); coinO3.updateMatrix();
    if (c.kind === 2 || c.drop) { if (nc < 60) { coinO3.rotation.set(0.3, t * 1.8 + c.z, 0.2); coinO3.updateMatrix(); ms2.c.setMatrixAt(nc++, coinO3.matrix); } }
    else if (c.kind === 1) { if (ng < 60) ms2.g.setMatrixAt(ng++, coinO3.matrix); }
    else if (ns < 120) ms2.s.setMatrixAt(ns++, coinO3.matrix);
    if ((c.kind >= 1 || c.drop) && nb < 120) { coinO3.position.set(c.x, 13, c.z); coinO3.rotation.set(0, 0, 0); coinO3.scale.setScalar(1); coinO3.updateMatrix(); ms2.b.setMatrixAt(nb++, coinO3.matrix); }
  }
  ms2.s.count = ns; ms2.g.count = ng; ms2.c.count = nc; ms2.b.count = nb;
  for (const k of ['s', 'g', 'c', 'b']) ms2[k].instanceMatrix.needsUpdate = true;
  updateSparkles(dt);
}
function dropCash(amount) {
  const got = spend(amount, 'Dropped cash', 'lost');
  if (!got) return;
  const n = clamp(Math.round(got / 2000), 1, 5), each = Math.max(500, roundTo(got / n, 500));
  let left = got;
  for (let i = 0; i < n && left > 0; i++) {
    const v = i === n - 1 ? left : Math.min(each, left); left -= v;
    const a = rnd() * TAU, d = 2.2 + rnd() * 2.6;
    let x = P.x + Math.cos(a) * d, z = P.z + Math.sin(a) * d;
    if (!walkable(x, z)) { x = P.x; z = P.z; }
    const id = 1e9 + Math.floor(Math.random() * 9e8);
    const drop = { id, x, z, v, kind: 2, drop: true, mine: true, t: Date.now() };
    COIN.drops.set(id, drop); COIN.myDrops.push(drop);
  }
  mpDirty = true;
}
/* sparkle particles */
const sparks = [];
let sparkMesh = null;
function buildSparkles() { sparkMesh = new T.InstancedMesh(new T.SphereGeometry(0.06, 6, 4), new T.MeshBasicMaterial({ color: 0xffe28a }), 200); sparkMesh.count = 0; sparkMesh.frustumCulled = false; scene.add(sparkMesh); }
function sparkle(x, y, z, kind) { for (let i = 0; i < 14; i++) { const a = rnd() * TAU, u = rnd(); sparks.push({ x, y, z, vx: Math.cos(a) * 3 * u, vy: 2 + rnd() * 3, vz: Math.sin(a) * 3 * u, life: 0.6 + rnd() * 0.3 }); } if (sparks.length > 200) sparks.splice(0, sparks.length - 200); }
function updateSparkles(dt) {
  let n = 0;
  for (let i = sparks.length - 1; i >= 0; i--) { const s = sparks[i]; s.life -= dt; if (s.life <= 0) { sparks.splice(i, 1); continue; } s.vy -= 9 * dt; s.x += s.vx * dt; s.y += s.vy * dt; s.z += s.vz * dt; coinO3.position.set(s.x, s.y, s.z); coinO3.rotation.set(0, 0, 0); coinO3.scale.setScalar(Math.min(1, s.life * 2)); coinO3.updateMatrix(); sparkMesh.setMatrixAt(n++, coinO3.matrix); }
  sparkMesh.count = n; sparkMesh.instanceMatrix.needsUpdate = true;
}

/* ---------- damage, knockdowns, the clinic ---------- */
function hurtPlayer(dmg, dx, dz, push, cause) {
  if (mode !== 'play' || RT.invuln > now()) return;
  if (playerVeh) { damageVehicle(playerVeh, dmg); return; }
  RT.invuln = now() + 2.8; RT.hurtT = now();
  state.hp = Math.max(0, state.hp - dmg);
  const l = Math.hypot(dx, dz) || 1;
  knockHuman(player, dx / l, dz / l, push);
  fxHurt(); shake(0.7); sfx.hit();
  if (cause !== 'fall') { const amt = Math.min(state.cash, 20000, roundTo(Math.max(1000, state.cash * 0.1), 500)); if (amt >= 500) { dropCash(amt); help(`You dropped <b class="hr">${tsh(amt)}</b>. Grab it before someone else does.`, 3500); } }
  if (state.hp <= 0) wasted();
}
function wasted() {
  mode = 'wasted'; RT.downT = now();
  if (job) failJob('');
  setTimeout(() => {
    const bill = Math.min(money(), clamp(roundTo(money() * 0.15, 500), PRICES.clinicMin, PRICES.clinicMax));
    splash('AJALI!', bill ? `Clinic bill ${tsh(bill)}` : 'The clinic patched you up for free', 'bad');
    if (bill) spend(bill, 'Clinic bill', 'lost');
    setTimeout(() => {
      P.set(CLINIC.x, 0.04, CLINIC.z + 9); player.position.copy(P); player.rotation.set(0, 0, 0); player.userData.fall = null; player.userData.mesh.rotation.x = 0; player.userData.mesh.position.y = 0;
      state.hp = 70; RT.invuln = now() + 3; mode = 'play'; cam.yaw = Math.PI;
      help('Nurse Halima patched you up. Watch the traffic, and keep your cash close.', 4000);
    }, 2200);
  }, 1600);
}

/* ---------- thieves ---------- */
function thiefTargets(th) { for (let i = 0; i < 20; i++) { const a = rnd() * TAU, d = 6 + rnd() * 26, x = th.home.x + Math.cos(a) * d, z = th.home.z + Math.sin(a) * d; if (coinOk(x, z)) return [x, z]; } return [th.home.x, th.home.z]; }
const thiefP = { x: 0, z: 0 };
function updateThieves(dt, t) {
  for (const th of thieves) {
    const h = th.h;
    if (th.state === 'gone') { th.gone -= dt; if (th.gone <= 0) { th.state = 'wander'; th.x = th.home.x; th.z = th.home.z; h.visible = true; th.cool = 25; } continue; }
    if (updateFall(h, dt)) { th.x = h.position.x; th.z = h.position.z; continue; }
    if (th.state === 'caught') { th.state = 'gone'; th.gone = 90; h.visible = false; continue; }
    const dx = P.x - th.x, dz = P.z - th.z, dP = Math.hypot(dx, dz);
    let vx = 0, vz = 0, sp = 0;
    th.cool -= dt; th.t += dt;
    if (th.state === 'wander') {
      const tx = th.tx - th.x, tz = th.tz - th.z, d = Math.hypot(tx, tz);
      if (d < 1.2) { [th.tx, th.tz] = thiefTargets(th); th.wait = rr(1, 4); }
      if (th.wait > 0) th.wait -= dt; else { sp = 1.5; vx = tx / (d || 1); vz = tz / (d || 1); }
      const reach = RT.tipsy > now() ? 34 : 22;
      if (mode === 'play' && !playerVeh && !isDown(player) && th.cool <= 0 && dP < reach && state.cash >= 5000 && !(job && job.type === 'race')) { th.state = 'rush'; th.t = 0; }
    } else if (th.state === 'rush') {
      sp = 7.4; vx = dx / (dP || 1); vz = dz / (dP || 1);
      if (playerVeh || dP > 45 || mode !== 'play' || th.t > 14) { th.state = 'wander'; th.cool = 25; }
      else if (dP < 0.95 && !isDown(player)) steal(th);
    } else if (th.state === 'flee') {
      // he starts fast, tires within seconds and trips over things in the street
      th.trip = (th.trip === undefined ? rr(3, 5) : th.trip) - dt;
      if (th.trip < -0.9) { th.trip = rr(3.5, 6); }
      const tripping = th.trip < 0;
      if (tripping && !th.tripTold) { th.tripTold = true; help(pick(['He trips over a basket of oranges!', 'He slips on the wet road!', 'A mama with a bucket blocks his way!']) + ' Get him!', 2500); }
      sp = tripping ? 0.9 : Math.max(4.3, 6.9 - th.t * 0.3); vx = -dx / (dP || 1); vz = -dz / (dP || 1);
      const wob = Math.sin(t * 0.9 + th.home.x) * 0.5; const ca = Math.cos(wob), sa = Math.sin(wob); [vx, vz] = [vx * ca - vz * sa, vx * sa + vz * ca];
      if (dP > 130 || th.t > 60) { th.state = 'gone'; th.gone = 60; h.visible = false; if (th.loot) { note(`The thief got away with ${tsh(th.loot)}.`); th.loot = 0; } }
      else if (!playerVeh && dP < 1.7 && speed > 3 && !isDown(player)) catchThief(th);
      else if (playerVeh && dP < 3.2 && Math.abs(playerVeh.vf) > 1.5) { playerVeh.vf *= 0.3; catchThief(th); }
    }
    if (sp > 0) {
      thiefP.x = th.x + vx * sp * dt; thiefP.z = th.z + vz * sp * dt;
      resolveCircle(thiefP, 0.4);
      if (walkable(thiefP.x, thiefP.z)) { th.x = thiefP.x; th.z = thiefP.z; } else if (th.state === 'flee') { th.x += vz * sp * dt; th.z -= vx * sp * dt; }
      h.rotation.y = angDamp(h.rotation.y, Math.atan2(vx, vz), 10, dt);
    }
    th.sp = sp;
    h.position.set(th.x, 0.04, th.z);
    if (Math.abs(th.x - camera.position.x) < 200 && Math.abs(th.z - camera.position.z) < 200) animHuman(h, dt, t, sp, 'loco');
  }
}
function steal(th) {
  const amt = Math.min(50000, state.cash, Math.max(2000, roundTo(state.cash * 0.3, 500)));
  spend(amt, 'Pickpocketed', 'lost');
  th.loot = amt; th.state = 'flee'; th.t = 0; th.trip = rr(3, 5); th.tripTold = false;
  playEmote(player, 'shrug'); sfx.thief(); fxHurt();
  splash('MWIZI!', `A thief took ${tsh(amt)}`, 'bad');
  help(isCoarse ? 'Run after him: he tires fast. Tap <b class="hl">E</b> to tackle when you are close.' : 'Run after him: he tires fast. Run into him, or press <kbd>F</kbd> to tackle when you are close.', 5000);
}
function catchThief(th) {
  if (th.state !== 'flee' && th.state !== 'rush') { knockHuman(th.h, Math.sin(player.rotation.y), Math.cos(player.rotation.y), 3); th.state = 'caught'; return; }
  const loot = th.loot, bounty = PRICES.bounty;
  knockHuman(th.h, (th.x - P.x), (th.z - P.z), 4); th.h.userData.fall.dx /= Math.hypot(th.x - P.x, th.z - P.z) || 1; th.h.userData.fall.dz /= Math.hypot(th.x - P.x, th.z - P.z) || 1;
  th.state = 'caught'; th.loot = 0; state.stats.thieves++;
  earn(loot + bounty, loot ? 'Got it back + bounty' : 'Bounty');
  splash('UMEMKAMATA!', `You caught the thief · +${tsh(loot + bounty)}`, 'gold'); sfx.win();
  mpEvent(`caught a pickpocket`);
}
function tackle() {
  if (playerVeh || isDown(player) || RT.tackleT > now()) return;
  RT.tackleT = now() + 0.9;
  { let tgt = null, bd = 4.2; for (const th of thieves) { if ((th.state === 'flee' || th.state === 'rush') && !isDown(th.h)) { const d = Math.hypot(th.x - P.x, th.z - P.z); if (d < bd) { bd = d; tgt = th; } } } if (tgt) player.rotation.y = Math.atan2(tgt.x - P.x, tgt.z - P.z); }
  playEmote(player, 'tackle'); RT.lunge = 0.25;
  for (const th of thieves) { if (th.state === 'gone' || isDown(th.h)) continue; const dx = th.x - P.x, dz = th.z - P.z, d = Math.hypot(dx, dz); const fwd = (dx * Math.sin(player.rotation.y) + dz * Math.cos(player.rotation.y)) / (d || 1); if (d < 3.4 && fwd > 0.1) { catchThief(th); return; } }
}

/* ---------- jobs ---------- */
let jobRing = null, jobBeacon = null;
function buildJobMarkers() {
  const ringMat = new T.MeshBasicMaterial({ color: 0xf3b41b, transparent: true, opacity: 0.85, side: T.DoubleSide, depthWrite: false });
  jobRing = new T.Mesh(new T.TorusGeometry(4.2, 0.28, 10, 48), ringMat); jobRing.visible = false; scene.add(jobRing);
  jobBeacon = new T.Group();
  const beam = new T.Mesh(new T.CylinderGeometry(1.6, 1.6, 120, 28, 1, true), new T.MeshBasicMaterial({ color: 0xf3b41b, transparent: true, opacity: 0.16, depthWrite: false, blending: T.AdditiveBlending, side: T.DoubleSide }));
  beam.position.y = 60; jobBeacon.add(beam);
  const disc = new T.Mesh(new T.RingGeometry(1.6, 2.3, 40), new T.MeshBasicMaterial({ color: 0xf3b41b, transparent: true, opacity: 0.9, side: T.DoubleSide, depthWrite: false }));
  disc.rotation.x = -Math.PI / 2; disc.position.y = 0.25; jobBeacon.add(disc); jobBeacon.userData.disc = disc;
  jobBeacon.visible = false; scene.add(jobBeacon);
}
function roadPointNear(x0, z0, dMin, dMax) {
  const segs = COIN.segs || [];
  for (let i = 0; i < 80; i++) {
    const s = segs[Math.floor(rnd() * segs.length)]; if (!s || s.c === 'F') continue;
    const t = rnd(), x = lerp(s.x0, s.x1, t), z = lerp(s.z0, s.z1, t), d = Math.hypot(x - x0, z - z0);
    if (d < dMin || d > dMax) continue;
    const dx = (s.x1 - s.x0) / s.L, dz = (s.z1 - s.z0) / s.L, side = rnd() < 0.5 ? 1 : -1, px = x + dz * (s.hw + 1.3) * side, pz = z - dx * (s.hw + 1.3) * side;
    if (coinOk(px, pz)) return [px, pz];
  }
  return null;
}
function startPizza() {
  const villas = WORLD.blds.filter(b => b[2] * b[3] > 140 && b[2] * b[3] < 450 && Math.hypot(b[0] - MARKET.x, b[1] - MARKET.z) > 140);
  const b = pick(villas), [bx, bz, w, d, ang] = b;
  let best = null, bd = 1e9;
  for (const [nx, nz, half] of [[0, 1, d / 2], [0, -1, d / 2], [1, 0, w / 2], [-1, 0, w / 2]]) {
    const ca = Math.cos(-ang), sa = Math.sin(-ang), lx = nx * (half + 2.6), lz = nz * (half + 2.6), x = bx + lx * ca + lz * sa, z = bz - lx * sa + lz * ca;
    const r = nearRoad(x, z, 30); const dd = r ? segDist(x, z, r.x0, r.z0, r.x1, r.z1) : 99;
    if (dd < bd && walkable(x, z)) { bd = dd; best = [x, z]; }
  }
  if (!best) best = [bx, bz + d / 2 + 3];
  const dist = Math.hypot(best[0] - P.x, best[1] - P.z), limit = Math.round(dist / 5.2 + 22);
  job = { type: 'pizza', x: best[0], z: best[1], t0: now(), limit, title: 'Pizza run', desc: 'Deliver the hot Zanzibar pizza to the villa marked on your radar.' };
  splash('PIZZA RUN', `${limit} seconds. Go!`, 'gold'); sfx.start();
  sub('Deliver the pizza to the <b class="hl">villa</b>. A boda boda is faster.');
}
function startTaxi() {
  job = { type: 'taxi', phase: 'pickup', fares: 0, title: 'Bajaji taxi', desc: 'Pick up passengers and drive them where they need to go.' };
  nextFare(); splash('TAXI SHIFT', 'Passengers are waiting', 'gold'); sfx.start();
}
let paxHuman = null;
function nextFare() {
  const p = roadPointNear(P.x, P.z, 70, 260) || roadPointNear(P.x, P.z, 40, 500);
  if (!p) { endTaxi('No passengers right now.'); return; }
  job.phase = 'pickup'; job.x = p[0]; job.z = p[1]; job.t0 = now(); job.limit = 0;
  if (!paxHuman) { paxHuman = makeHuman(randomLook(Math.floor(rnd() * 40))); scene.add(paxHuman); }
  paxHuman.visible = true; if (paxHuman.parent !== scene) { paxHuman.parent.remove(paxHuman); scene.add(paxHuman); }
  paxHuman.position.set(p[0], 0.16, p[1]); paxHuman.rotation.set(0, rnd() * TAU, 0); playEmote(paxHuman, 'wave');
  sub('Pick up the <b class="hl">passenger</b> waving at the roadside.');
}
function updateTaxi() {
  const v = playerVeh; if (!v || v.kind !== 'bajaji') { endTaxi('Taxi shifts need a bajaji.'); return; }
  const d = Math.hypot(job.x - v.x, job.z - v.z);
  if (job.phase === 'pickup') {
    if (paxHuman && !paxHuman.userData.emote) playEmote(paxHuman, 'wave');
    if (d < 6 && Math.abs(v.vf) < 2.2) {
      scene.remove(paxHuman); v.m.add(paxHuman); const s = VEH.bajaji.pass; paxHuman.position.set(s[0], s[1], s[2]); paxHuman.rotation.set(0, 0, 0); passenger = paxHuman;
      const q = roadPointNear(job.x, job.z, 220, 650) || roadPointNear(job.x, job.z, 120, 900);
      if (!q) { dropPassenger(false); nextFare(); return; }
      const dist = Math.hypot(q[0] - job.x, q[1] - job.z);
      job.phase = 'drop'; job.x = q[0]; job.z = q[1]; job.t0 = now(); job.limit = Math.round(dist / 9 + 18); job.fare = PAY.taxiBase + roundTo(dist * PAY.taxiPerM, 500);
      sfx.ding(); sub(`Drive the passenger to the <b class="hl">drop-off</b>. Fare ${tsh(job.fare)}.`);
    }
  } else {
    const left = job.limit - (now() - job.t0);
    if (left < 0) { dropPassenger(false); splash('ABIRIA AMESHUKA', 'Too slow. The passenger got out.', 'bad'); nextFare(); return; }
    if (d < 7 && Math.abs(v.vf) < 2.2) {
      const tip = left > job.limit * 0.35 ? roundTo(job.fare * 0.25, 500) : 0;
      dropPassenger(true); earn(job.fare + tip, tip ? 'Fare + tip' : 'Fare'); state.stats.jobs++; job.fares++;
      splash('KAZI IMEKAMILIKA', `+${tsh(job.fare + tip)}`, 'gold'); sfx.win();
      nextFare();
    }
  }
}
function dropPassenger(arrived) {
  if (!passenger) { if (paxHuman) paxHuman.visible = false; return; }
  const v = playerVeh || rentals.find(r => r.m === passenger.parent) || null;
  if (passenger.parent) passenger.parent.remove(passenger);
  scene.add(passenger);
  if (v) { passenger.position.set(v.x + Math.cos(v.yaw) * 1.6, 0.04, v.z - Math.sin(v.yaw) * 1.6); passenger.rotation.y = v.yaw + Math.PI / 2; }
  passenger.visible = arrived; if (arrived) playEmote(passenger, 'wave');
  const p = passenger; passenger = null;
  setTimeout(() => { if (p !== passenger) p.visible = false; }, 3000);
}
function endTaxi(msg) { if (passenger) dropPassenger(false); if (paxHuman) paxHuman.visible = false; const n = job ? job.fares : 0; job = null; sub(''); if (msg) note(msg + (n ? ` You drove ${n} fare${n === 1 ? '' : 's'}.` : '')); }
const RACE_LEN = (() => { let L = Math.hypot(RACE_CPS[0][0] - RACE_START.x, RACE_CPS[0][1] - RACE_START.z); for (let i = 0; i < RACE_CPS.length - 1; i++) L += Math.hypot(RACE_CPS[i + 1][0] - RACE_CPS[i][0], RACE_CPS[i + 1][1] - RACE_CPS[i][1]); return L; })();
function startRace() {
  if (!canPay(PRICES.raceFee)) { help(`The race costs ${tsh(PRICES.raceFee)} to enter.`, 2500); sfx.deny(); return; }
  spend(PRICES.raceFee, 'Race entry');
  const v = playerVeh, target = Math.round(RACE_LEN / (v.kind === 'boda' ? 14.5 : 12.2));
  job = { type: 'race', cp: 0, t0: now() + 3, target, title: 'Bajaji race', desc: `Hit all ${RACE_CPS.length} checkpoints. Gold under ${fmtTime(target)} pays ${tsh(PAY.raceGold)}.` };
  splash('3', '', 'gold'); sfx.beep(0);
  setTimeout(() => { if (job && job.type === 'race') { splash('2', '', 'gold'); sfx.beep(0); } }, 1000);
  setTimeout(() => { if (job && job.type === 'race') { splash('1', '', 'gold'); sfx.beep(0); } }, 2000);
  setTimeout(() => { if (job && job.type === 'race') { splash('NENDA!', 'Go go go', 'gold'); sfx.beep(1); } }, 3000);
  sub(`Drive through the <b class="hl">checkpoints</b>. Gold time pays ${tsh(PAY.raceGold)}, silver ${tsh(PAY.raceSilver)}.`);
}
function updateRace() {
  const v = playerVeh; if (!v) { failJob('Race abandoned.'); return; }
  if (now() < job.t0) { v.vx *= 0.8; v.vz *= 0.8; return; }
  const [cx, cz] = RACE_CPS[job.cp];
  if (Math.hypot(cx - v.x, cz - v.z) < 7.5) {
    job.cp++; sfx.ding();
    if (job.cp >= RACE_CPS.length) {
      const tm = now() - job.t0, gold = tm <= job.target, silver = tm <= job.target * 1.2, prize = gold ? PAY.raceGold : silver ? PAY.raceSilver : 0;
      if (!state.stats.best || tm < state.stats.best) state.stats.best = Math.round(tm * 10) / 10;
      if (prize) { earn(prize, gold ? 'Race gold' : 'Race silver'); splash(gold ? 'DHAHABU!' : 'FEDHA!', `${fmtTime(tm)} · +${tsh(prize)}`, 'gold'); sfx.win(); }
      else splash('UMECHELEWA', `${fmtTime(tm)}. Gold was ${fmtTime(job.target)}`, 'bad');
      mpEvent(`finished the bajaji race in ${fmtTime(tm)}`);
      state.stats.jobs++; job = null; sub('');
    }
  }
}
function fmtTime(s) { s = Math.max(0, s); const m = Math.floor(s / 60), r = s - m * 60; return `${m}:${(r < 10 ? '0' : '') + r.toFixed(1)}`; }
function failJob(msg) { if (!job) return; if (job.type === 'taxi') { endTaxi(msg); return; } job = null; sub(''); if (msg) splash('UMESHINDWA', msg, 'bad'); }
function updateJobs(dt, t) {
  if (!job) { jobRing.visible = false; return; }
  if (job.type === 'pizza') {
    const left = job.limit - (now() - job.t0);
    if (left <= 0) { job = null; sub(''); splash('PIZZA IMEPOA', 'The pizza went cold. No pay.', 'bad'); return; }
    if (Math.hypot(job.x - P.x, job.z - P.z) < 4.2) {
      const pay = PAY.pizzaBase + roundTo(PAY.pizzaBonus * clamp(left / job.limit, 0, 1), 500);
      earn(pay, 'Pizza delivered'); state.stats.jobs++; job = null; sub('');
      splash('KAZI IMEKAMILIKA', `Pizza delivered · +${tsh(pay)}`, 'gold'); sfx.win();
      help('Mzee Juma has more pizzas. Head back to Uptown Park for another run.', 4000);
    }
  } else if (job.type === 'taxi') updateTaxi();
  else if (job.type === 'race') updateRace();
  else if (job.type === 'bet') { /* handled by the penalty mini-game */ }
  if (job && job.type === 'race') {
    const [cx, cz] = RACE_CPS[job.cp];
    jobRing.visible = true; jobRing.position.set(cx, 4.4, cz);
    const nx = RACE_CPS[Math.min(job.cp + 1, RACE_CPS.length - 1)];
    jobRing.rotation.set(0, Math.atan2(nx[0] - cx, nx[1] - cz), 0); jobRing.scale.setScalar(1 + Math.sin(t * 5) * 0.04);
  } else jobRing.visible = false;
}
function jobTarget() {
  if (job) {
    if (job.type === 'race') { const c = RACE_CPS[Math.min(job.cp, RACE_CPS.length - 1)]; return { x: c[0], z: c[1] }; }
    if (job.type === 'spice') { let b = null, bd = 1e9; for (const s2 of SPICE_SPOTS) { if (job.found.has(s2.id)) continue; const d = Math.hypot(s2.x - P.x, s2.z - P.z); if (d < bd) { bd = d; b = s2; } } return b || NPC_BY_ID.hamisi; }
    if (job.type === 'seaweed') { if (job.carry.length >= 3) return NPC_BY_ID.mwanaisha; let b = null, bd = 1e9; const nowS = now(); for (const s2 of SEAWEED) { if (s2.t > nowS) continue; const d = Math.hypot(s2.x - P.x, s2.z - P.z); if (d < bd) { bd = d; b = s2; } } return b || NPC_BY_ID.mwanaisha; }
    if (job.type === 'site') return job.bag ? CONSTRUCTION.mixer : CONSTRUCTION.truck;
    if (job.type === 'volunteer') { let b = null, bd = 1e9; for (const it of job.items) { const d = Math.hypot(it.x - P.x, it.z - P.z); if (d < bd) { bd = d; b = it; } } return b; }
    if (job.type === 'dala') { if (playerVeh !== DALA.v) return DALA.v; const st = STOPS.find(s2 => s2.id === DALA_ROUTE[job.i]); return st || null; }
    if (job.type === 'match') return { x: BALL.x, z: BALL.z };
    const stg = simTarget(); if (stg) return stg;
    if (job.x !== undefined) return { x: job.x, z: job.z };
  }
  if (ORDER.state === 'coming' || ORDER.state === 'waiting') return ORDER.pick;
  if (RT.wp && state.intro) return RT.wp;
  if (!state.intro) return { x: NPC_BY_ID.amina.x, z: NPC_BY_ID.amina.z };
  if (state.ticket && !state.done) return { x: SC.x, z: SC.z };
  if (state.ticket) return null;
  if (passportFull()) return money() >= PRICES.vip ? { x: NPC_BY_ID.salim.x, z: NPC_BY_ID.salim.z } : null;
  const ns = nextStamp(), p = ns && ns.at();
  return p ? { x: p.x, z: p.z } : null;
}

/* ---------- penalty bets ---------- */
let pen = null, keeper = null, penBall = null;
function buildPenaltyProps() {
  keeper = makeHuman({ kit: true, shirt: 0xe0553a, skin: 0x3d2416, lower: 0x141838, trim: 0x141838, hair: 'short', socks: 0xe0553a, longSleeve: true }); keeper.position.set(PEN.gx, 0.04, PEN.gz + 0.7); scene.add(keeper);
  penBall = meshOf(new T.IcosahedronGeometry(0.11, 2), M(0xf7f3e6, { roughness: 0.4 }), true); penBall.position.set(PEN.gx, 0.15, PEN.spotZ); scene.add(penBall);
}
function startPenalty(stake) {
  spend(stake, 'Penalty bet');
  mode = 'penalty'; job = { type: 'bet', stake, title: 'Penalty bet', desc: '' };
  pen = { shot: 0, goals: 0, phase: 'aim', t: Math.random() * 3, aim: 0, fly: 0, rt: 0, stake };
  P.set(PEN.gx + 0.6, 0.04, PEN.spotZ + 2.0); player.position.copy(P); player.rotation.set(0, Math.PI, 0);
  resetShot(); $('#penalty').hidden = false; ui.hud.hidden = true; ui.tags.hidden = true; updatePenUI();
}
function resetShot() { penBall.position.set(PEN.gx, 0.15, PEN.spotZ); keeper.position.set(PEN.gx, 0.04, PEN.gz + 0.7); keeper.rotation.set(0, 0, 0); $('#penResult').classList.remove('on'); $('#penResult').textContent = ''; }
function updatePenUI() { $('#penShot').textContent = `Shot ${Math.min(pen.shot + 1, 3)} of 3`; $('#penGoals').textContent = `Goals ${pen.goals} · Stake ${tsh(pen.stake)}`; }
function penaltyShoot() {
  if (!pen || pen.phase !== 'aim') return;
  pen.phase = 'fly'; pen.fly = 0;
  pen.wide = Math.abs(pen.aim) > 0.93; pen.tx = PEN.gx + pen.aim * 3.9; pen.ty = pen.wide ? 1.6 : 0.4 + Math.random() * 1.6;
  const r = Math.random(); pen.kdir = r < 0.36 ? -1 : r < 0.72 ? 1 : 0;
  sfx.kick(); playEmote(player, 'tackle');
}
function updatePenalty(dt, t) {
  if (!pen) return;
  animHuman(player, dt, t, 0, 'loco');
  if (pen.phase === 'aim') { pen.t += dt; pen.aim = Math.sin(pen.t * (2.1 + pen.shot * 0.35)); $('#aimCursor').style.left = `${50 + pen.aim * 48}%`; keeper.position.x = PEN.gx + Math.sin(pen.t * 1.6) * 0.5; animHuman(keeper, dt, t, 1.2, 'loco'); }
  else if (pen.phase === 'fly') {
    pen.fly += dt;
    const u = Math.min(1, pen.fly / 0.55), gz = pen.wide ? PEN.gz - 3 : PEN.gz - 0.6;
    penBall.position.set(lerp(PEN.gx, pen.tx, u), lerp(0.15, pen.ty, u) + Math.sin(u * Math.PI) * 0.6, lerp(PEN.spotZ, gz, u)); penBall.rotation.x -= dt * 18;
    const k = smooth(clamp((pen.fly - 0.05) / 0.38, 0, 1));
    keeper.position.x = lerp(keeper.position.x, PEN.gx + pen.kdir * 2.3, k * 0.35); keeper.rotation.z = -pen.kdir * 1.2 * k; keeper.position.y = 0.04 + Math.sin(k * Math.PI) * (pen.kdir ? 0.5 : 0.25);
    if (u >= 1) {
      const saved = !pen.wide && Math.abs((pen.tx - PEN.gx) - pen.kdir * 2.3) < 1.15;
      let res; if (pen.wide) { res = 'Wide!'; sfx.miss(); } else if (saved) { res = 'Saved!'; sfx.miss(); } else { res = 'Goli!'; pen.goals++; sfx.goal(); }
      $('#penResult').textContent = res; $('#penResult').classList.add('on'); pen.phase = 'result'; pen.rt = 0; updatePenUI();
    }
  } else if (pen.phase === 'result') { pen.rt += dt; if (pen.rt > 1.4) { pen.shot++; if (pen.shot >= 3) endPenalty(); else { resetShot(); pen.phase = 'aim'; updatePenUI(); } } }
}
function endPenalty() {
  const goals = pen.goals, stake = pen.stake; pen = null; job = null;
  $('#penalty').hidden = true; ui.hud.hidden = false; ui.tags.hidden = false; resetShot(); mode = 'play';
  if (goals >= 2) { earn(stake * 2, 'Bet won'); splash('UMESHINDA!', `${goals} of 3 · +${tsh(stake * 2)}`, 'gold'); sfx.win(); mpEvent(`won a ${tsh(stake)} penalty bet`); giveStamp('kandanda'); }
  else splash('UMEPOTEZA', `${goals} of 3. Coach Baraka keeps your ${tsh(stake)}.`, 'bad');
}

/* ---------- menus: talk, bar, shop, tickets ---------- */
function talk(id) {
  const n = NPC_BY_ID[id]; RT.talkId = id;
  const h = npcObjs[id]; if (h) playEmote(h, 'wave');
  const base = { eyebrow: n.role, title: n.name };
  if (id === 'amina') {
    if (!state.intro) {
      state.intro = true; mpDirty = true;
      openMenu(Object.assign(base, { lede: `Karibu Fumba! This is Fumba Road, and AfconCity is ${((Math.hypot(SC.x - P.x, SC.z - P.z)) / 1000).toFixed(1)} km west. A VIP seat for the AFCON 2027 match costs ${tsh(PRICES.vip)}, and Salim only sells to fans with a full Fan Passport: ${REQUIRED.length} Zanzibar experiences, stamped. You have ${tsh(state.cash)}. Work, explore, and watch your pockets. The daladala stop is right here.`, items: [], close: 'Twende!' }));
      giveStamp('karibu');
      return;
    }
    const ns = nextStamp();
    const tips = [`Passport: ${stampCount()} of ${REQUIRED.length} stamps.${ns ? ` Next idea: ${ns.en}.` : ''}`, 'Daladalas cost TSh 700 to any stop on Fumba Road. Look for the green shelters.', 'Seaweed pays by the kilo. Bi Mwanaisha buys it on the beach east of the pier.', `The bajaji race pays ${tsh(PAY.raceGold)} for a gold time.`, `Mzee Hamisi sells madafu for TSh 1,000. Tourists on the beach pay ${tsh(PRICES.coconutSell)}.`, `The trafiki fines anyone over 50 km/h ${tsh(PRICES.fine)}.`];
    openMenu(Object.assign(base, { lede: pick(tips), items: [] }));
  } else if (id === 'mama') openBar();
  else if (id === 'juma') {
    if (job && job.type === 'pizza') { openMenu(Object.assign(base, { lede: 'Haraka! That pizza is getting cold.', items: [] })); return; }
    openMenu(Object.assign(base, { lede: `Delivery riders get ${tsh(4000)} a run here, plus up to ${tsh(4000)} more if the pizza arrives hot.`, items: [
      { label: 'Start a pizza run', desc: 'A hot Zanzibar pizza for a villa somewhere in Fumba', price: 'Earn', act: () => { if (job) { failJobSilently(); } startPizza(); } },
    ] }));
  } else if (id === 'ashura') openFood();
  else if (id === 'rukia') openRukia();
  else if (id === 'bibi') bibiLesson();
  else if (id === 'hamisi') openHamisi();
  else if (id === 'mwanaisha') openMwanaisha();
  else if (id === 'nahodha') openNahodha();
  else if (id === 'neema') openNeema();
  else if (id === 'musa') openMusa();
  else if (id === 'omari') openOmari();
  else if (SIM_TALK[id]) SIM_TALK[id]();
  else if (id === 'ali') {
    openMenu(Object.assign(base, { lede: playerVeh && playerVeh.kind === 'bajaji' ? 'Ready for a shift? Fares are TSh 3,000 and up, with tips for fast drivers.' : `Hire a bajaji for the day for ${tsh(PRICES.bajaji)}, then drive up to me to start a taxi shift.`, items: playerVeh && playerVeh.kind === 'bajaji' ? [{ label: job && job.type === 'taxi' ? 'End your shift' : 'Start a taxi shift', desc: 'Pick up roadside passengers and drop them off', price: 'Earn', act: () => { if (job && job.type === 'taxi') endTaxi('Shift over.'); else { if (job) failJobSilently(); startTaxi(); } } }] : [] }));
  } else if (id === 'baraka') {
    const stakes = [10000, 20000, 50000, 100000];
    openMenu(Object.assign(base, { lede: `Three penalties. Score two and I pay double your stake.${hasStamp('kandanda') ? '' : ' Win once and I stamp your Fan Passport.'}`, items: stakes.map(s2 => ({ label: `Bet ${tsh(s2)}`, desc: `Win ${tsh(s2 * 2)}`, price: s2, act: () => startPenalty(s2), noCharge: true })) }));
  } else if (id === 'salim') {
    if (state.ticket) { openMenu(Object.assign(base, { lede: 'Your VIP ticket is good. Gate A is open: walk to the centre circle for kickoff!', items: [] })); return; }
    const full = passportFull(), short = Math.max(0, PRICES.vip - money());
    const lede = !full ? `VIP tickets are ${tsh(PRICES.vip)}, and only for fans with a full Fan Passport. You have ${stampCount()} of ${REQUIRED.length} stamps.` : short ? `Your passport is full, hongera! Come back with ${tsh(short)} more.` : 'Full passport and the money. Karibu VIP!';
    openMenu(Object.assign(base, { lede, items: [{ label: 'VIP matchday ticket', desc: full ? 'AFCON 2027 at AfconCity Stadium · VIP stand, Gate A' : `Needs all ${REQUIRED.length} passport stamps`, price: PRICES.vip, disabled: !full, act: buyTicket }] }));
  } else if (id === 'rehema') {
    openMenu(Object.assign(base, { lede: 'Replica jerseys at market prices. Everyone online sees what you wear.', items: KITS.map((k, i) => ({ label: k.name, desc: i === state.kit ? 'You are wearing this' : state.owned.includes(i) ? 'Yours. Wear it for free.' : 'Buy and wear', price: state.owned.includes(i) ? 'Wear' : k.price, disabled: i === state.kit, swatch: k.css, act: () => { if (!state.owned.includes(i)) state.owned.push(i); setKit(i); playEmote(player, 'cheer'); } })) }));
  } else if (id === 'kassim') {
    playEmote(npcObjs.kassim, 'dance'); playEmote(player, 'dance');
    openMenu(Object.assign(base, { lede: pick(['On matchdays this screen shows every game live. Bring your voice!', 'Coin rush every three minutes. Watch the top of your screen.', 'Press 2 to dance. The crowd loves it.', 'Bibi Mwanaidi over there teaches Swahili for free. Sema "Shikamoo" to her!']), items: [] }));
  } else if (id === 'steward') openMenu(Object.assign(base, { lede: state.ticket ? 'Karibu VIP! Straight through to the centre circle.' : `Tiketi tafadhali. VIP tickets are ${tsh(PRICES.vip)} at Salim's kiosk on the plaza, for fans with a full Fan Passport.`, items: [] }));
  else if (id === 'trafiki') openMenu(Object.assign(base, { lede: `Speed limit is 50 on this road. Speeders pay ${tsh(PRICES.fine)}, on the spot.`, items: [] }));
  else if (id === 'halima') openMenu(Object.assign(base, { lede: state.hp < 100 ? 'You look a bit bruised. I can fix that.' : 'Healthy as a goalkeeper. Stay off the main road.', items: state.hp < 100 ? [{ label: 'Patch me up', desc: 'Consultation and dressing · full health', price: 20000, act: () => heal(100) }] : [] }));
}
function failJobSilently() { if (!job) return; if (job.type === 'taxi') endTaxi(''); else if (job.type === 'dala') endDala(true); else { if (job.type === 'tour') endTour(); job = null; sub(''); } }
function openBar() {
  openMenu({ eyebrow: 'Beach bar', title: 'Mama Pwani', lede: 'Karibu! Beach prices, but the view is free.', items: [
    { label: 'Madafu', desc: 'Fresh coconut. +30 health', price: 2000, act: () => { heal(30); feed(15); playEmote(player, 'drink'); } },
    { label: 'Tangawizi', desc: 'Ginger soda. Unlimited sprint for 60 seconds', price: 1500, act: () => { RT.boost = now() + 60; playEmote(player, 'drink'); help('Tangawizi kick: unlimited sprint for 60 seconds.', 2600); } },
    { label: 'Maji baridi', desc: 'Cold bottled water. +10 health', price: 1000, act: () => { heal(10); playEmote(player, 'drink'); } },
    { label: 'Lager baridi', desc: 'Cold lager. Two and you get tipsy, and pickpockets love tipsy fans', price: 5000, act: () => { RT.lagers++; RT.lagerT = now(); playEmote(player, 'drink'); if (RT.lagers >= 2) { RT.tipsy = now() + 45; help('You are tipsy. The world is wobbly and thieves can spot you from further away.', 3500); } } },
    { label: 'Samaki wa kupaka', desc: 'Grilled fish in coconut sauce with rice. Full health, full belly', price: 15000, act: () => { heal(100); feed(80); playEmote(player, 'drink'); } },
    ...(phoneAd('radio') ? [{ label: `On the radio: ${phoneAd('radio').brand || 'our sponsor'}`, desc: 'Radio Pwani is brought to you by this sponsor. See their offer', price: 'Look', act: () => openPhone('brand', 'radio') }] : []),
    { label: 'Round for everyone online', desc: 'Every fan in Fumba gets a free tangawizi, and your name goes up in chat', price: 50000, act: () => { RT.boost = now() + 60; playEmote(player, 'cheer'); mpEvent('bought a round for everyone at Mama Pwani', 'round'); sfx.win(); } },
  ] });
}
function buyTicket() {
  state.ticket = true; setGateOpen(true); mpDirty = true;
  splash('TIKETI YA VIP!', 'Gate A is open', 'gold'); sfx.win();
  mpEvent('bought a VIP ticket for the AFCON 2027 match');
  writeSave();
}

/* ---------- kickoff finale ---------- */
let kick = null;
function startKickoff() {
  mode = 'kickoff'; kick = { t: 0, ended: false, done: false };
  ui.hud.hidden = true; ui.tags.hidden = true;
  if (clockNight() < 1) state.clock = clockDay() * 1440 + 20 * 60 + 30;
  setNight(true); sfx.whistle(); setTimeout(() => sfx.roar(), 500);
}
function updateKickoff(dt) {
  kick.t += dt;
  if (kick.t > 2.6 && !kick.done) { kick.done = true; state.done = true; fanScreenIdx = -1; mpEvent('made it to the AFCON 2027 opener'); }
  if (kick.t > 7.5 && !kick.ended) {
    kick.ended = true;
    $('#eCash').textContent = fmt(money()); $('#eEarned').textContent = fmt(state.stats.earned); $('#eLost').textContent = fmt(state.stats.lost + state.stats.spent);
    const s = Math.round(state.playMs / 1000); $('#eTime').textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
    $('#end').hidden = false; $('#btnRoam').focus();
  }
}
const FW = { n: 1100, cursor: 0, next: 0 };
function buildFireworks() {
  const n = FW.n; FW.pos = new Float32Array(n * 3); FW.col = new Float32Array(n * 3); FW.vel = new Float32Array(n * 3); FW.base = new Float32Array(n * 3); FW.life = new Float32Array(n); FW.max = new Float32Array(n);
  for (let i = 0; i < n; i++) FW.pos[i * 3 + 1] = -1000;
  const geo = new T.BufferGeometry(); FW.pa = new T.BufferAttribute(FW.pos, 3); FW.ca = new T.BufferAttribute(FW.col, 3); FW.pa.setUsage(T.DynamicDrawUsage); FW.ca.setUsage(T.DynamicDrawUsage);
  geo.setAttribute('position', FW.pa); geo.setAttribute('color', FW.ca);
  const dot = texOf((() => { const c = mkCanvas(32, 32), x = c.getContext('2d'), g = x.createRadialGradient(16, 16, 0, 16, 16, 16); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.4, 'rgba(255,255,255,0.7)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 32, 32); return c; })(), { clamp: true });
  const pts = new T.Points(geo, new T.PointsMaterial({ size: 3.4, map: dot, vertexColors: true, transparent: true, depthWrite: false, blending: T.AdditiveBlending, fog: false }));
  pts.frustumCulled = false; scene.add(pts);
}
const FW_COLS = [[2, 1.3, 0.2], [1.9, 0.5, 0.3], [0.3, 1.6, 1.5], [2, 1.9, 1.7], [0.6, 1.6, 0.8]];
function burst() {
  const cx = SC.x + rr(-70, 70), cy = rr(70, 115), cz = SC.z + rr(-60, 60), col = FW_COLS[Math.floor(rnd() * FW_COLS.length)];
  for (let k = 0; k < 90; k++) { const i = FW.cursor++ % FW.n, u = rnd() * 2 - 1, th = rnd() * TAU, s = Math.sqrt(1 - u * u), sp = rr(16, 24); FW.pos[i * 3] = cx; FW.pos[i * 3 + 1] = cy; FW.pos[i * 3 + 2] = cz; FW.vel[i * 3] = s * Math.cos(th) * sp; FW.vel[i * 3 + 1] = u * sp; FW.vel[i * 3 + 2] = s * Math.sin(th) * sp; FW.base[i * 3] = col[0]; FW.base[i * 3 + 1] = col[1]; FW.base[i * 3 + 2] = col[2]; FW.max[i] = FW.life[i] = rr(1.5, 2.3); }
  sfx.boom();
}
function updateFireworks(dt) {
  let any = false;
  for (let i = 0; i < FW.n; i++) {
    if (FW.life[i] <= 0) continue; any = true; FW.life[i] -= dt;
    const j = i * 3, dr = Math.pow(0.4, dt);
    FW.vel[j + 1] -= 7 * dt; FW.vel[j] *= dr; FW.vel[j + 1] *= dr; FW.vel[j + 2] *= dr;
    FW.pos[j] += FW.vel[j] * dt; FW.pos[j + 1] += FW.vel[j + 1] * dt; FW.pos[j + 2] += FW.vel[j + 2] * dt;
    const f = Math.max(0, FW.life[i] / FW.max[i]); FW.col[j] = FW.base[j] * f; FW.col[j + 1] = FW.base[j + 1] * f; FW.col[j + 2] = FW.base[j + 2] * f;
    if (FW.life[i] <= 0) FW.pos[j + 1] = -1000;
  }
  if (any || FW.dirty) { FW.pa.needsUpdate = true; FW.ca.needsUpdate = true; FW.dirty = any; }
}

/* ---------- day and night ---------- */
let night = 0, nightTarget = 0;
const LDAY = { hs: C(0xbcd6ff), hg: C(0x6b5a3c), hi: 0.22, si: 2.1, sc: C(0xffd2a0), exp: 1.0 };
const LNIGHT = { hs: C(0x6f80c8), hg: C(0x141c2c), hi: 0.32, si: 0.42, sc: C(0x9fb2ff), exp: 1.15 };
function setNight(on) { nightTarget = on ? 1 : 0; state.night = on; rebuildEnv(on ? 1 : 0); }
function applyNight(k) {
  skyU.uNight.value = k; cloudU.uNight.value = k;
  scene.fog.color.copy(FOG_DAY).lerp(FOG_NIGHT, k); scene.background.copy(scene.fog.color);
  hemi.color.copy(LDAY.hs).lerp(LNIGHT.hs, k); hemi.groundColor.copy(LDAY.hg).lerp(LNIGHT.hg, k); hemi.intensity = lerp(LDAY.hi, LNIGHT.hi, k);
  sun.color.copy(LDAY.sc).lerp(LNIGHT.sc, k); sun.intensity = lerp(LDAY.si, LNIGHT.si, k);
  renderer.toneMappingExposure = lerp(LDAY.exp, LNIGHT.exp, k);
  waterU.uShallow.value.copy(waterDay.s).lerp(waterNight.s, k); waterU.uDeep.value.copy(waterDay.d).lerp(waterNight.d, k); waterU.uFoam.value.copy(waterDay.f).lerp(waterNight.f, k);
  for (const n of nightMats) n.mat[n.prop] = lerp(n.a, n.b, k);
  pitchLight.intensity = 2.6 * k * (state.done || mode === 'kickoff' ? 1 : 0.4);
  for (const l of barLights) l.intensity = 2.2 * k;
  for (const o of nightOnly) o.visible = k > 0.05 && (state.done || mode === 'kickoff');
}

