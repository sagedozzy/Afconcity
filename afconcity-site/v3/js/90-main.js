/* ===================== 90 main: player, camera, input, loop, boot ===================== */
const cam = { yaw: 0, pitch: 0.26, dist: 4.4, curDist: 4.4, lastLook: -99, fov: 58 };
const SETTINGS = { follow: true, sens: 1, vol: 0.8, shake: true, names: true, bubbles: true };
try { SETTINGS.follow = localStorage.getItem('afconcity-follow') !== 'off'; SETTINGS.sens = clamp(parseFloat(localStorage.getItem('afconcity-sens') || '1') || 1, 0.4, 2); SETTINGS.vol = clamp(parseFloat(localStorage.getItem('afconcity-vol') || '0.8') || 0.8, 0.1, 1); SETTINGS.shake = localStorage.getItem('afconcity-shake') !== 'off'; SETTINGS.names = localStorage.getItem('afconcity-names') !== 'off'; SETTINGS.bubbles = localStorage.getItem('afconcity-bubbles') !== 'off'; } catch (e) {}
const camTarget = new T.Vector3(START.x, 1.6, START.z);
const moveDir = new T.Vector2(0, -1);
const PR = 0.4;
function walkable(x, z) { if (!(x > BOUNDS.x0 && x < BOUNDS.x1 && z > BOUNDS.z0)) return false; if (z < coastZ(x) - 0.8) return true; return onPier(x, z) || onTide(x, z); }
function pointInStadiumBowl(x, z) { const lx = x - SC.x, lz = z - SC.z, ri = Math.hypot(lx / S_IN.rx, lz / S_IN.rz), ro = Math.hypot(lx / S_OUT.rx, lz / S_OUT.rz); return ri > 0.97 && ro < 1.06; }
const CORR = 4.9;
function resolveStadium(p, ox, oz, R) {
  R = R || PR;
  const lx = p.x - SC.x, lz = p.z - SC.z, ri = Math.hypot(lx / S_IN.rx, lz / S_IN.rz), ro = Math.hypot(lx / S_OUT.rx, lz / S_OUT.rz);
  const inBand = ri > 1 - R / S_IN.rz && ro < 1.045, inCorr = lz > 0 && Math.abs(lx) < CORR - R + PR;
  if (!inBand || inCorr) return;
  const olx = ox - SC.x, olz = oz - SC.z, ori = Math.hypot(olx / S_IN.rx, olz / S_IN.rz), oro = Math.hypot(olx / S_OUT.rx, olz / S_OUT.rz);
  if (ori > 1 - R / S_IN.rz && oro < 1.045 && olz > 0 && Math.abs(olx) < CORR - R + PR) { p.x = SC.x + Math.sign(lx || 1) * (CORR - R + PR - 0.01); if (lz <= 0) p.z = oz; return; }
  if (ri - (1 - R / S_IN.rz) < (1.045 - ro) * 3) { const k = (1 - R / S_IN.rz - 0.002) / ri; p.x = SC.x + lx * k; p.z = SC.z + lz * k; }
  else { const k = 1.047 / ro; p.x = SC.x + lx * k; p.z = SC.z + lz * k; }
}
const stepP = { x: 0, z: 0 };
function stepPlayer(dx, dz) {
  const ox = P.x, oz = P.z;
  stepP.x = ox + dx; stepP.z = oz + dz;
  resolveCircle(stepP, PR); resolveCircle(stepP, PR); resolveStadium(stepP, ox, oz, PR);
  if (!walkable(stepP.x, stepP.z)) {
    if (walkable(ox + dx, oz)) { stepP.x = ox + dx; stepP.z = oz; } else if (walkable(ox, oz + dz)) { stepP.x = ox; stepP.z = oz + dz; } else { stepP.x = ox; stepP.z = oz; }
    resolveCircle(stepP, PR); resolveCircle(stepP, PR); if (!walkable(stepP.x, stepP.z)) { stepP.x = ox; stepP.z = oz; }
  }
  P.x = stepP.x; P.z = stepP.z;
  if ((stepP.x < BOUNDS.x0 + 1.5 || stepP.x > BOUNDS.x1 - 1.5 || stepP.z < BOUNDS.z0 + 1.5) && now() > (RT.edgeT || 0)) { RT.edgeT = now() + 15; help('That is the edge of the map for now. More of Zanzibar is coming.', 3000); }
}
function groundY(x, z) { const c = coastZ(x); if (z > c - 1.2) { if (onPier(x, z)) return PIER_Y; if (z > c && onTide(x, z)) return tideY(x, z) + 0.04; } const s = nearRoad(x, z, 2.4); if (s && (s.c === 'T' || s.c === 'R') && segDist(x, z, s.x0, s.z0, s.x1, s.z1) > s.hw + 0.15 && !pointInStadium(x, z, 8)) return 0.19; return 0.04; }
let baseY = 0.04;
const playerHead = new T.Vector3(), playerLook = new T.Vector3();
function buildPlayer() {
  const pos = player ? player.position.clone() : null, ry = player ? player.rotation.y : state.ry, par = player ? player.parent : null;
  if (player && par) par.remove(player);
  const k = KITS[state.kit] || KITS[0];
  void k; player = makeHuman(Object.assign(kitLook(state.kit, state.look, 27), { eager: true })); player.userData.lodFar = 60;
  if (par) { par.add(player); player.position.copy(pos); player.rotation.y = par === scene ? ry : 0; }
  else { scene.add(player); player.position.set(P.x, 0.04, P.z); player.rotation.y = ry; }
}
function setKit(i) { state.kit = i; buildPlayer(); mpDirty = true; }
/* a jersey from the fan shop goes straight on, with its matching shorts (track pants for women) */
const wearingJersey = () => TOPS[fixLook(Object.assign({}, state.look || {})).t].kit;
function wearJersey(i) { const lk = fixLook(Object.assign({}, state.look || {})); lk.t = itemIx(TOPS, 'jersey'); lk.tp = 0; lk.b = itemIx(BOTTOMS, 'kit'); lk.bp = 0; state.look = fixLook(lk); setKit(i); renderLookSum(); writeSave(); }
const SPD = { walk: 1.7, jog: 4.1, sprint: 7.0, boost: 7.8 };
const foot = { stuckT: 0, lastX: 0, lastZ: 0 };
function updateOnFoot(dt, t, inp) {
  if (updateFall(player, dt)) { P.x = player.position.x; P.z = player.position.z; speed = 0; return; }
  const fx = -Math.sin(cam.yaw), fz = -Math.cos(cam.yaw), rx = Math.cos(cam.yaw), rz = -Math.sin(cam.yaw);
  let ix = inp.x, iz = inp.y;
  const len = Math.hypot(ix, iz); if (len > 1) { ix /= len; iz /= len; }
  if (RT.tipsy > now()) { const w = Math.sin(t * 1.4) * 0.45, c = Math.cos(w), s = Math.sin(w); [ix, iz] = [ix * c - iz * s, ix * s + iz * c]; }
  const dx = rx * ix + fx * iz, dz = rz * ix + fz * iz, mag = Math.min(1, len);
  const boost = RT.boost > now(), wantSprint = inp.run && mag > 0.3;
  const worn = (state.energy === undefined ? 100 : state.energy) < 15;
  if (wantSprint && !RT.tired && !worn) { if (!boost) RT.stamina -= 10 * dt * (wellRested() ? 0.6 : 1); if (RT.stamina <= 0) { RT.stamina = 0; RT.tired = true; } }
  else RT.stamina = Math.min(100, RT.stamina + 13 * dt * (state.food < 25 ? 0.45 : 1) * ((state.energy === undefined ? 100 : state.energy) < 25 ? 0.6 : 1));
  if (RT.tired && RT.stamina > 40) RT.tired = false;
  const sprinting = wantSprint && !RT.tired && !worn;
  // joystick: a light push walks, a full push jogs; keyboard always jogs
  const base = mag < 0.55 && (joy.id !== null) ? SPD.walk : SPD.jog;
  let top = mag > 0.05 ? (sprinting ? (boost ? SPD.boost : SPD.sprint) : base) * Math.max(mag, 0.6) : 0;
  // turn toward the wanted heading; a sharp change of direction pivots on the spot instead of skating
  if (mag > 0.05) {
    const want = Math.atan2(dx, dz), diff = Math.abs(angWrap(want - player.rotation.y));
    player.rotation.y = angDamp(player.rotation.y, want, speed > 5 ? 9 : 14, dt);
    if (diff > 1.9) top *= 0.25;
    const e = player.userData.emote; if (e && e !== 'tackle' && e !== 'hi5' && e !== 'drink') player.userData.emote = null;
  }
  speed = damp(speed, top, top > speed ? 6.5 : 10, dt);
  if (speed < 0.02) speed = 0;
  moveDir.set(Math.sin(player.rotation.y), Math.cos(player.rotation.y));
  let vx = moveDir.x * speed, vz = moveDir.y * speed;
  if (RT.lunge > 0) { RT.lunge -= dt; vx += Math.sin(player.rotation.y) * 7; vz += Math.cos(player.rotation.y) * 7; }
  if (vx || vz) {
    const ox = P.x, oz = P.z;
    stepPlayer(vx * dt, vz * dt);
    // running into a wall: lose speed in proportion to how much of the step was blocked
    const want = Math.hypot(vx * dt, vz * dt), got = Math.hypot(P.x - ox, P.z - oz);
    if (want > 1e-4 && got < want * 0.5) speed *= 0.6 + 0.4 * (got / want);
    // safety net: only when we are wedged inside something (not just leaning on a wall) do we nudge free
    if (mag > 0.3 && got < 0.002) { foot.stuckT += dt; if (foot.stuckT > 1.5) { foot.stuckT = 0; if (pointBlocked(P.x, P.z, 0.05) || !walkable(P.x, P.z) || trapped()) unstick(); } } else foot.stuckT = 0;
  }
  if (inp.jump && RT.jumpY <= 0.001 && RT.jumpV <= 0) { RT.jumpV = 5.6; sfx.jump(); }
  RT.jumpV -= 21 * dt; RT.jumpY = Math.max(0, RT.jumpY + RT.jumpV * dt); if (RT.jumpY === 0 && RT.jumpV < 0) RT.jumpV = 0;
  player.userData.air = RT.jumpY;
  baseY = damp(baseY, groundY(P.x, P.z), 18, dt);
  player.position.set(P.x, baseY + RT.jumpY, P.z);
  // head follows where the camera looks, or the person you are about to talk to
  const tn = curInter && curInter.npc ? NPC_BY_ID[curInter.npc] : null;
  if (tn) playerLook.set(tn.x, 1.6, tn.z); else playerLook.set(P.x - Math.sin(cam.yaw) * 10, baseY + 1.5 - Math.sin(cam.pitch || 0) * 3, P.z - Math.cos(cam.yaw) * 10);
  player.userData.lookAt = speed < 4.5 ? playerLook : null;
  animHuman(player, dt, t, speed, 'loco');
}
/* boxed in on every side? (try a short step in eight directions) */
function trapped() {
  const ox = P.x, oz = P.z;
  for (let k = 0; k < 8; k++) { const a = k / 8 * TAU; stepPlayer(Math.cos(a) * 0.25, Math.sin(a) * 0.25); const m = Math.hypot(P.x - ox, P.z - oz); P.x = ox; P.z = oz; if (m > 0.08) return false; }
  return true;
}
/* push the player (or their vehicle) to the nearest free, walkable spot */
function unstick() {
  const tryAt = (x, z) => { stepP.x = x; stepP.z = z; resolveCircle(stepP, PR + 0.15); resolveCircle(stepP, PR + 0.15); return walkable(stepP.x, stepP.z) && !pointBlocked(stepP.x, stepP.z, PR) && Math.hypot(stepP.x - x, stepP.z - z) < 0.05; };
  for (let r = 0.8; r < 30; r += 0.8) for (let k = 0; k < 12; k++) {
    const a = k / 12 * TAU, x = P.x + Math.cos(a) * r, z = P.z + Math.sin(a) * r;
    if (tryAt(x, z)) { P.x = x; P.z = z; if (playerVeh) { playerVeh.x = x; playerVeh.z = z; playerVeh.vx = playerVeh.vz = 0; } else player.position.set(x, baseY, z); return true; }
  }
  return false;
}

/* ---------- input ---------- */
const keys = new Set();
const joy = { x: 0, y: 0, id: null, cx: 0, cy: 0 };
const drag = { id: null, x: 0, y: 0, moved: 0 };
let runToggle = false, jumpTap = false, pointerLocked = false;
function readInput() {
  let x = 0, y = 0;
  if (keys.has('KeyW') || keys.has('ArrowUp')) y += 1;
  if (keys.has('KeyS') || keys.has('ArrowDown')) y -= 1;
  if (keys.has('KeyD') || keys.has('ArrowRight')) x += 1;
  if (keys.has('KeyA') || keys.has('ArrowLeft')) x -= 1;
  x += joy.x; y += joy.y;
  const jump = keys.has('Space') || jumpTap; jumpTap = false;
  return { x: clamp(x, -1, 1), y: clamp(y, -1, 1), run: keys.has('ShiftLeft') || keys.has('ShiftRight') || runToggle, jump: !playerVeh && jump, hand: !!playerVeh && (keys.has('Space') || $('#tJump').classList.contains('act')) };
}

/* ---------- interactions ---------- */
const VERB = { rashid: 'Car wash with Fundi Rashid', hassan: 'Walking tours with Hassan', mwajuma: 'Help Bi Mwajuma', omari: 'Drive a daladala for Mzee Omari', amina: 'Talk to Amina', mama: 'Order at Mama Pwani', juma: 'Pizza runs with Mzee Juma', ali: 'Talk to Ali', rehema: 'Browse the fan shop', baraka: 'Penalties with Coach Baraka', salim: 'VIP tickets with Salim', kassim: 'Talk to DJ Kassim', steward: 'Talk to the steward', trafiki: 'Talk to the trafiki', halima: 'See Nurse Halima', ashura: 'Eat at Mama Ashura\'s', rukia: 'Kanga & henna with Bi Rukia', bibi: 'Swahili with Bibi Mwanaidi', hamisi: 'Talk to Mzee Hamisi', mwanaisha: 'Seaweed co-op', nahodha: 'Boat trips with Nahodha Salum', neema: 'Volunteer with Neema', musa: 'Day work with Fundi Musa' };
function findInteraction() {
  if (mode !== 'play' || isDown(player)) return null;
  if (FISH.on) return lifeInteraction();
  if (playerVeh) {
    if (playerVeh.owned && Math.abs(playerVeh.vf) < 2) { const gi = garageInteraction(); if (gi) return gi; }
    const a = NPC_BY_ID.ali;
    if (playerVeh.kind === 'bajaji' && Math.hypot(a.x - P.x, a.z - P.z) < 9) return { text: job && job.type === 'taxi' ? 'Talk to Ali' : 'Start a taxi shift', act: () => talk('ali') };
    if (!job && Math.hypot(RACE_START.x - P.x, RACE_START.z - P.z) < 11) return { text: `Start the race · ${tsh(PRICES.raceFee)}`, act: startRace };
    if (Math.abs(playerVeh.vf) < 3) return { text: 'Get off', act: () => exitVehicle(false) };
    return null;
  }
  for (const th of thieves) if ((th.state === 'flee' || th.state === 'rush') && Math.hypot(th.x - P.x, th.z - P.z) < 4 && !isDown(th.h)) return { text: 'Tackle the thief!', act: tackle };
  const mi = missionInteraction() || garageInteraction() || bizInteraction(); if (mi) return mi;
  let best = null, bd = 1e9;
  for (const n of NPCS) { const ax = n.ix !== undefined ? n.ix : n.x, az = n.iz !== undefined ? n.iz : n.z, r = n.ir || 3.2, d = Math.hypot(ax - P.x, az - P.z); if (d < r && d < bd) { bd = d; best = n; } }
  if (best) return { text: VERB[best.id] || `Talk to ${best.name}`, act: () => talk(best.id), npc: best.id };
  const li = lifeInteraction(); if (li) return li;
  const hi = homeInteraction(); if (hi) return hi;
  const si = simInteraction(); if (si) return si;
  const sp = spiceNear(); if (sp) return { text: `Smell the ${SPICES.find(q => q.id === sp.id).name.split(' · ')[1]}`, act: () => smellSpice(sp) };
  if (job && job.type === 'seaweed' && job.carry.length && Math.hypot(SEAWEED_BUYER.x - P.x, SEAWEED_BUYER.z - P.z) < 4) return { text: 'Sell your seaweed', act: () => talk('mwanaisha') };
  const tr = touristNear(); if (tr && (state.coconuts > 0 || tr.want)) return { text: state.coconuts > 0 ? (tr.want ? `Sell a madafu · ${tsh(PRICES.coconutSell)}` : 'Offer a madafu') : 'Chat with the tourist', act: () => sellCoconut(tr) };
  const st = stopNear(3.6); if (st) return { text: `Daladala · ${tsh(PRICES.daladala)}`, act: () => openStop(st) };
  const v = nearestRental(2.9);
  if (v) return { text: v.owned ? (LANG === 'sw' ? `Panda ${VEH[v.kind].name.toLowerCase()} yako` : `Ride your ${VEH[v.kind].name.toLowerCase()}`) : v.rented ? `Ride the ${VEH[v.kind].name.toLowerCase()}` : `Hire the ${VEH[v.kind].name.toLowerCase()} for the day · ${tsh(PRICES[v.kind])}`, act: () => rentOrRide(v) };
  return walkerInteraction();
}
function findSecondary() {
  if (mode !== 'play' || playerVeh || isDown(player)) return null;
  for (const th of thieves) if ((th.state === 'flee' || th.state === 'rush') && Math.hypot(th.x - P.x, th.z - P.z) < 4) return { text: 'Tackle the thief', act: tackle };
  const r = MP.room ? nearestRemote(3.2) : null;
  const ls = lifeSecondary(); if (ls) return ls;
  if (r && !MP.hiDone.has(r.peer)) { const asked = r.hf === MP.myPeer && performance.now() - r.hfAt < 10000; return { text: asked ? `${displayName(r)} wants a high-five!` : `High-five ${displayName(r)}`, act: () => highFive(r) }; }
  return null;
}
let curInter = null, curSec = null;

/* ---------- camera ---------- */
const camV = new T.Vector3(), lookV = new T.Vector3(), camSeen = new Set();
function camRay(ax, ay, az, dx, dy, dz, L) {
  let best = L;
  const ex = ax + dx * L, ez = az + dz * L, pad = 0.35;
  camSeen.clear();
  for (let ix = Math.floor((Math.min(ax, ex) - 1) / CELL); ix <= Math.floor((Math.max(ax, ex) + 1) / CELL); ix++) for (let iz = Math.floor((Math.min(az, ez) - 1) / CELL); iz <= Math.floor((Math.max(az, ez) + 1) / CELL); iz++) {
    for (const c of (cgrid.get(ck(ix, iz)) || EMPTY)) {
      if (!c.on || c.t !== 0 || c.tag === 'small' || c.tag === 'veh' || camSeen.has(c)) continue;
      camSeen.add(c);
      const rx = ax - c.x, rz = az - c.z, u0 = rx * c.c + rz * c.s, v0 = -rx * c.s + rz * c.c, du = dx * c.c + dz * c.s, dv = -dx * c.s + dz * c.c, hw = c.hw + pad, hd = c.hd + pad;
      if (Math.abs(u0) < hw && Math.abs(v0) < hd) continue; // hugging this wall: ignore it
      let t0 = 0, t1 = best;
      if (Math.abs(du) < 1e-6) { if (Math.abs(u0) > hw) continue; } else { let a = (-hw - u0) / du, b = (hw - u0) / du; if (a > b) { const q = a; a = b; b = q; } t0 = Math.max(t0, a); t1 = Math.min(t1, b); if (t0 > t1) continue; }
      if (Math.abs(dv) < 1e-6) { if (Math.abs(v0) > hd) continue; } else { let a = (-hd - v0) / dv, b = (hd - v0) / dv; if (a > b) { const q = a; a = b; b = q; } t0 = Math.max(t0, a); t1 = Math.min(t1, b); if (t0 > t1) continue; }
      if (ay + dy * t0 > (c.h || 9)) continue;
      if (t0 < best) best = t0;
    }
  }
  return best;
}
function updateCamera(dt, t) {
  if (mode === 'intro' && STYLE.on) styleCamera(dt, t);
  else if (mode === 'intro' && AD.view) { const v = AD.view; camera.position.set(v.cx, v.cy, v.cz); camera.lookAt(v.lx, v.ly, v.lz); sun.target.position.set(v.lx, 0, v.lz); }
  else if (mode === 'intro') {
    const shot = Math.floor(t / 14) % 3, k = (t % 14) * (reduceMotion ? 0.2 : 1), a = k * 0.02 + (shot === 1 ? 2.4 : 0.6);
    if (shot === 0) { camera.position.set(SC.x + Math.sin(a) * 330, 120, SC.z + Math.cos(a) * 290); camera.lookAt(SC.x, 10, SC.z); sun.target.position.set(SC.x, 0, SC.z); }
    else if (shot === 1) { camera.position.set(-60 + Math.sin(a) * 260, 70, 160 + Math.cos(a) * 260); camera.lookAt(-60, 6, 200); sun.target.position.set(-60, 0, 200); }
    else { const x = 520 - k * 26; camera.position.set(x, 26 + k * 0.6, -70); camera.lookAt(x - 420, 18, -330); sun.target.position.set(x - 120, 0, -150); }
  } else if (mode === 'kickoff') {
    const a = kick.t * 0.12 + 1.2; camV.set(SC.x + Math.sin(a) * 70, 48 + Math.sin(kick.t * 0.3) * 5, SC.z + Math.cos(a) * 50);
    camera.position.lerp(camV, 1 - Math.exp(-2 * dt)); camera.lookAt(SC.x, 6, SC.z); sun.target.position.set(SC.x, 0, SC.z);
  } else if (mode === 'penalty') {
    camV.set(PEN.gx, 2.6, PEN.spotZ + 6.5); camera.position.lerp(camV, 1 - Math.exp(-5 * dt)); camera.lookAt(PEN.gx, 1.2, PEN.gz); sun.target.position.set(PEN.gx, 0, PEN.spotZ);
  } else if (mode === 'cine') {
    cineCamera(dt);
  } else if (mode === 'wasted') {
    camV.set(P.x + 2, 9 + (now() - RT.downT) * 2, P.z + 6); camera.position.lerp(camV, 1 - Math.exp(-2 * dt)); camera.lookAt(P.x, 0.5, P.z);
  } else {
    let tx, ty, tz, dist, shoulder = 0;
    const idle = now() - cam.lastLook;
    const cv = playerVeh || (mode === 'ride' && ORDER.v ? ORDER.v : null);
    if (cv) {
      const sp = VEH[cv.kind], vf = cv.vf, av = Math.abs(vf);
      tx = cv.x; ty = 1.55; tz = cv.z; dist = sp.cam + av * 0.06 + (cv === playerVeh ? 0 : 0.8);
      // GTA-style chase cam: swings in behind the vehicle unless you have just looked around
      if (idle > 0.9 && av > 0.6) { cam.yaw = angDamp(cam.yaw, cv.yaw + Math.PI, clamp(av / 5, 0.9, 3.4), dt); cam.pitch = damp(cam.pitch, 0.2, 1.5, dt); }
    } else {
      tx = P.x; ty = player.position.y + 1.55; tz = P.z; dist = cam.dist; shoulder = 0.4;
      // follow cam: eases round behind you while you move, so you can steer without the mouse
      if (SETTINGS.follow && !pointerLocked && idle > 1.2 && speed > 0.6 && !isDown(player)) {
        const behind = player.rotation.y + Math.PI, diff = Math.abs(angWrap(behind - cam.yaw));
        if (diff < 2.3) cam.yaw = angDamp(cam.yaw, behind, 1.05 * clamp(speed / 4.1, 0.35, 1.5), dt);
      }
    }
    camTarget.x = damp(camTarget.x, tx + Math.cos(cam.yaw) * shoulder, 16, dt); camTarget.y = damp(camTarget.y, ty, 10, dt); camTarget.z = damp(camTarget.z, tz - Math.sin(cam.yaw) * shoulder, 16, dt);
    const cp = Math.cos(cam.pitch), ox = Math.sin(cam.yaw) * cp, oy = Math.sin(cam.pitch), oz = Math.cos(cam.yaw) * cp;
    // exact ray test against building boxes: the camera slides in smoothly instead of popping
    const allowed = Math.max(0.9, camRay(camTarget.x, camTarget.y, camTarget.z, ox, oy, oz, dist) - 0.3);
    cam.curDist = allowed < cam.curDist ? damp(cam.curDist, allowed, 24, dt) : damp(cam.curDist, allowed, 3, dt);
    camera.position.set(camTarget.x + ox * cam.curDist, Math.max(0.5, camTarget.y + oy * cam.curDist), camTarget.z + oz * cam.curDist);
    if (RT.shake > 0 && !SETTINGS.shake) RT.shake = 0;
    if (RT.shake > 0) { camera.position.x += (Math.random() - 0.5) * RT.shake * 0.35; camera.position.y += (Math.random() - 0.5) * RT.shake * 0.35; RT.shake = Math.max(0, RT.shake - dt * 2.2); }
    lookV.set(camTarget.x, camTarget.y, camTarget.z); camera.lookAt(lookV);
    if (RT.tipsy > now()) camera.rotation.z += Math.sin(t * 1.1) * 0.05;
    const fast = playerVeh ? clamp(Math.abs(playerVeh.vf) / 20, 0, 1) : clamp((speed - 5) / 4, 0, 1);
    cam.fov = damp(cam.fov, 58 + fast * 8, 3, dt);
    if (Math.abs(camera.fov - cam.fov) > 0.05) { camera.fov = cam.fov; camera.updateProjectionMatrix(); }
    sun.target.position.set(P.x, 0, P.z);
  }
  sun.position.copy(sun.target.position).addScaledVector(night > 0.5 ? moonDir : SUN_DIR, 200);
  sky.position.copy(camera.position);
  if (clouds) clouds.position.set(camera.position.x, 520, camera.position.z);
}

/* ---------- loop ---------- */
let last = performance.now(), elapsed = 0, saveTimer = 0, radarT = 0, goalT = 0, booted = false;
const crowdO3 = new T.Object3D();
function writeSave() { if (!player) return; if (!playerVeh) { state.x = P.x; state.z = P.z; state.ry = player.rotation.y; } try { localStorage.setItem(SAVE_KEY, JSON.stringify(state)); } catch (e) {} }
/* black-frame watchdog: some GPUs draw nothing with certain settings; detect it and fall back */
const watch = { left: 0, frame: 0, black: 0, px: new Uint8Array(4) };
function armWatch() { watch.left = 6; watch.frame = 0; watch.black = 0; }
function checkBlack() {
  if (mode !== 'play' || night > 0.3 || ++watch.frame % 20) return;
  watch.left--;
  const gl = renderer.getContext(), w = gl.drawingBufferWidth, h = gl.drawingBufferHeight;
  let dark = 0;
  for (const [u, v] of [[0.5, 0.75], [0.25, 0.5], [0.75, 0.5], [0.5, 0.3], [0.1, 0.9]]) { gl.readPixels(Math.floor(w * u), Math.floor(h * v), 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, watch.px); if (watch.px[0] + watch.px[1] + watch.px[2] < 6) dark++; }
  if (dark === 5) watch.black++; else watch.black = 0;
  if (watch.black >= 2) {
    watch.left = 0;
    if (renderer.shadowMap.enabled && HQ()) { gfx = 'low'; try { localStorage.setItem(GFX_KEY, gfx); } catch (e) {} segSet('[data-seg="gfx"]', gfx); setShadowRes(); resizeAll(); applyNight(smooth(night)); note('Switched to Fast graphics so the city shows on this device.'); armWatch(); }
  }
}
const PERF = { acc: 0, n: 0, slow: 0, fast: 0 };
function adaptRes(raw) {
  if (raw > 0.25 || document.hidden) return;
  PERF.acc += raw; PERF.n++;
  if (PERF.acc < 2) return;
  const fps = PERF.n / PERF.acc; PERF.acc = 0; PERF.n = 0;
  if (fps < 30) { PERF.fast = 0; if (++PERF.slow >= 2 && resScale > 0.6) { PERF.slow = 0; resScale = Math.max(0.6, resScale - 0.15); resizeAll(); } }
  else if (fps > 56) { PERF.slow = 0; if (++PERF.fast >= 4 && resScale < 1) { PERF.fast = 0; resScale = Math.min(1, resScale + 0.1); resizeAll(); } }
  else { PERF.slow = 0; PERF.fast = 0; }
}
function frame(nowMs) {
  const raw = (nowMs - last) / 1000;
  if (mode !== 'intro') adaptRes(raw);
  const dt = Math.min(0.1, raw); last = nowMs; elapsed += dt; const t = elapsed;
  if (mode !== 'paused') GAME_T += Math.min(Math.max(raw, 0), 0.5);
  windU.uWind.value = t; waterU.uTime.value = t; cloudU.uTime.value = t; TEX.waterN.offset.set(t * 0.006, t * 0.0042);
  for (const d of dhows) { d.position.x += d.userData.sp * dt; if (d.position.x > 2200) d.position.x = -2200; if (d.position.x < -2200) d.position.x = 2200; d.position.y = Math.sin(t * 1.1 + d.position.z) * 0.18; d.rotation.z = Math.sin(t * 0.8 + d.position.x * 0.01) * 0.05; }
  if (night !== nightTarget) { night = nightTarget > night ? Math.min(nightTarget, night + dt / 3.2) : Math.max(nightTarget, night - dt / 2.5); applyLight(); }
  if (fanScreenTex) { const i = Math.floor(t / 3.6); if (i !== fanScreenIdx) { fanScreenIdx = i; drawFanScreen(i); } }
  updateCamF();
  const inp = readInput();
  if (mode === 'play') {
    state.playMs += dt * 1000;
    // fixed small physics steps keep walking and driving identical at 30 or 144 fps
    const n = Math.ceil(dt / 0.034 - 1e-6), sdt = dt / n;
    for (let i = 0; i < n; i++) { if (playerVeh) updatePlayerVehicle(sdt, inp); else updateOnFoot(sdt, t, i ? Object.assign(inp, { jump: false }) : inp); }
    if (playerVeh) animHuman(player, dt, t, 0, VEH[playerVeh.kind].pose);
  } else if (mode === 'ride') animHuman(player, dt, t, 0, ORDER.pose || 'pass');
  else if (mode === 'menu' || mode === 'phone') { if (!playerVeh) { speed = damp(speed, 0, 10, dt); animHuman(player, dt, t, 0, 'loco'); } else animHuman(player, dt, t, 0, VEH[playerVeh.kind].pose); }
  else if (mode === 'wasted') { updateFall(player, dt); if (player.userData.fall && player.userData.fall.t > 1.9) player.userData.fall.t = 1.9; }
  else if (mode === 'penalty') updatePenalty(dt, t);
  else if (mode === 'kickoff') { updateKickoff(dt); animHuman(player, dt, t, 0, 'loco'); }
  updateLOD(dt); updateRemotes(dt, t); eventsTick(dt); hiWarm(raw);
  /* the pause menu freezes the world: no chases, rides, thieves or timers move behind it */
  if (mode !== 'paused') { updateCars(dt, t); updateWalkers(dt, t); updateThieves(dt, t); updateRentals(dt); updateCoins(dt, t); updateJobs(dt, t); updateQuests(dt, t); updateMissions(dt); updateEconomy(dt); updateLife(dt, t); updateClock(dt); updateEnergy(dt); updatePhone(dt); updateSim(dt, t); updateHomeDoors(t); updateAdStats(dt); updateCranes(t); }
  playerHead.set(P.x, (player ? player.position.y : 0) + 1.62, P.z);
  for (const n of NPCS) {
    const h = npcObjs[n.id], d = Math.hypot(P.x - n.x, P.z - n.z); h.visible = mode === 'intro' || Math.hypot(camera.position.x - n.x, camera.position.z - n.z) < 260; if (d > 200) continue;
    const engaged = mode !== 'intro' && d < 4.5;
    h.rotation.y = angDamp(h.rotation.y, engaged ? Math.atan2(P.x - n.x, P.z - n.z) : n.ry, 3, dt);
    h.userData.lookAt = mode !== 'intro' && d < 13 ? playerHead : null;
    if (n.id === 'kassim' && !h.userData.emote) playEmote(h, 'dance');
    else if (mode === 'menu' && RT.talkId === n.id && !h.userData.emote) playEmote(h, 'talk');
    if (h.visible) { const a = d < 12 ? (h._aAcc || 0) + dt : animStep(h, n.x, n.z, dt); if (d < 12) h._aAcc = 0; if (a) animHuman(h, a, t, 0, 'loco'); }
  }
  if (mode === 'play') {
    if (now() - RT.hurtT > 9 && state.hp < 70) state.hp = Math.min(70, state.hp + 3 * dt);
    if (RT.lagers && now() - RT.lagerT > 180) RT.lagers = 0;
    if (state.ticket && !state.done && Math.hypot(P.x - SC.x, P.z - SC.z) < 7 && !playerVeh) startKickoff();
    if (!state.ticket && !playerVeh && Math.hypot(P.x - GATE.x, P.z - GATE.z) < 8 && !RT.gateNag) { RT.gateNag = true; talk('steward'); setTimeout(() => { RT.gateNag = false; }, 12000); }
    curInter = findInteraction(); curSec = findSecondary();
    ui.prompt.hidden = !curInter; if (curInter) ui.promptText.textContent = curInter.text;
    ui.prompt2.hidden = !curSec; if (curSec) ui.prompt2Text.textContent = curSec.text;
    saveTimer += dt; if (saveTimer > 5) { saveTimer = 0; writeSave(); }
  } else if (mode === 'ride') { curInter = { text: 'Skip to the end of the ride', act: skipRide }; curSec = null; ui.prompt.hidden = false; ui.promptText.textContent = curInter.text; ui.prompt2.hidden = true; }
  else { ui.prompt.hidden = true; ui.prompt2.hidden = true; }
  setPromptRoom();
  checkHighFives(performance.now());
  if (night > 0.05 && crowd && crowd.visible) {
    const N = crowd.count, step = BUILD_HQ ? 2 : 3;
    for (let i = Math.floor(t * 30) % step; i < N; i += step) { const b = i * 4; crowdO3.position.set(crowdBase[b], crowdBase[b + 1] + Math.max(0, Math.sin(t * 7 + crowdBase[b + 3])) * 0.35, crowdBase[b + 2]); crowdO3.updateMatrix(); crowd.setMatrixAt(i, crowdO3.matrix); }
    crowd.instanceMatrix.needsUpdate = true;
    if (!reduceMotion && t > FW.next && (mode === 'kickoff' || rnd() < 0.2)) { FW.next = t + (mode === 'kickoff' ? 0.4 : 3); burst(); }
  }
  updateFireworks(dt);
  if (mode !== 'intro') sendPresence(false);
  updateCamera(dt, t);
  camera.updateMatrixWorld();
  updateGlare();
  if (mode !== 'intro' && !ui.hud.hidden) {
    updateHUD(dt, t); updateArea(dt);
    radarT += dt; if (radarT > 1 / 20) { radarT = 0; drawRadar(t); }
    goalT += dt; if (goalT > 0.25) { goalT = 0; updateGoal(t); }
  }
  if (mode !== 'intro') updateTags();
  if (!ui.pause.hidden && pmTab === 'map' && Math.floor(t * 4) !== Math.floor((t - dt) * 4)) drawBigMap(t);
  updateAudio(dt);
  canvas.style.filter = mode === 'wasted' ? 'grayscale(0.85) brightness(0.9)' : HQ() ? 'saturate(1.12) contrast(1.04)' : '';
  ui.fx.classList.toggle('low', state.hp < 25 && mode === 'play');
  if (DEV && window.__preRender) window.__preRender();
  if (!(DEV && window.__noRender)) { if (HOME.inside) renderHome(dt, t); else if (SET.on) renderSet(dt, t); else renderer.render(scene, camera); }
  if (watch.left > 0) checkBlack();
}
/* one bad frame must never freeze the game: log it and keep going */
let loopErrs = 0;
function loop(nowMs) {
  try { frame(nowMs); } catch (e) { loopErrs++; last = nowMs; if (loopErrs < 5 || loopErrs % 600 === 0) console.error('frame error', e); if (DEV) (window.__afcErr = window.__afcErr || []).push(String((e && e.stack) || e).slice(0, 300)); }
  requestAnimationFrame(loop);
}

/* ---------- UI wiring ---------- */
function segSet(sel, v) { document.querySelectorAll(sel + ' button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.v === v))); }
function enterPlay() {
  audioInit(); AD.view = null; setStyling(false); resyncOwned();
  const bonus = applyStartBonus(); if (bonus) setTimeout(writeStats, 5000);
  track('play', { fresh: !state.intro }); if (MP.web) watchMilestones();
  const nick = strOr($('#nick').value, 16).trim();
  state.nick = nick || state.nick || $('#nick').placeholder || 'Fan 27';
  ui.start.hidden = true; ui.hud.hidden = false; ui.tags.hidden = false;
  $('#touch').hidden = !isCoarse;
  mode = 'play';
  if (!playerTag) playerTag = makeTag(state.nick, true); else playerTag.nm.textContent = state.nick;
  nyEffects();
  cam.yaw = playerVeh ? playerVeh.yaw + Math.PI : player.rotation.y + Math.PI; cam.pitch = 0.26;
  camTarget.set(P.x, 1.6, P.z);
  if (!state.intro) help((bonus ? `Your purse: <b class="hg">${tsh(state.cash)}</b>. ` : '') + (isCoarse ? 'You just got off the daladala on Fumba Road. Walk to <b class="hl">Amina</b> with the joystick and tap <b class="hl">E</b> to talk.' : 'You just got off the daladala on Fumba Road. Walk to <b class="hl">Amina</b> with <kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd>, click the game to look around, press <kbd>E</kbd> to talk.'), 8000);
  else help(`Welcome back, ${escapeHtml(state.nick)}. You have <b class="hg">${tsh(state.cash)}</b> in cash and <b class="hg">${tsh(state.bank || 0)}</b> on Pesa.`, 3500);
  buildLegend(); renderPlayers(); MP.joined = true; MP.last = {}; sendPresence(true); armWatch(); applyHudVis(); updatePhoneBadge();
  if (!state.msgsInit) { state.msgsInit = 1; const hm = myHome(); if (hm) phoneMsg('amina', `Karibu Fumba! Your cousin Saidi paid this week on a ${hm.name.toLowerCase()} for you: ${hm.where.toLowerCase()}. Rent is ${tsh(hm.rent)} every Jumamosi, from Pesa.`); phoneMsg('afcon', 'Your phone: press P (or tap Phone) for boda rides, food delivery, jobs with GPS, your Pesa wallet and your home.'); }
  canvas.focus(); writeSave();
}
function restoreFrom(s) {
  state = Object.assign(defaultState(), s || {}); state.stats = Object.assign(defaultState().stats, (s && s.stats) || {}); state.tips = state.tips || {};
  if (!Array.isArray(state.owned) || !state.owned.length) state.owned = [0];
  if (!state.owned.includes(state.kit)) state.kit = state.owned[0];
  P.set(state.x, 0.04, state.z); if (!walkable(P.x, P.z) || pointBlocked(P.x, P.z, 0.3)) P.set(START.x, 0.04, START.z);
  buildPlayer(); player.position.copy(P); player.rotation.y = state.ry;
  if (typeof state.clock !== 'number' || !isFinite(state.clock)) state.clock = state.done ? 20 * 60 + 30 : CLOCK0;
  if (state.energy === undefined) state.energy = 100;
  if (state.home === undefined) state.home = { id: 'chumba', paidUntil: nextRentDue(state.clock), owed: 0, graceUntil: 0 };
  if (!state.tmode) state.tmode = 'live';
  night = nightTarget = state.tmode === 'live' ? clockNight() : state.tmode === 'night' ? 1 : 0; RT.envN = night > 0.5 ? 1 : 0; applyLight();
  setGateOpen(state.ticket); shownCash = state.cash;
  segSet('[data-seg="time"]', state.tmode);
}
function newGame() {
  clearSave();
  const nick = state.nick, look = state.look;
  if (playerVeh) exitVehicle(true);
  if (job) failJobSilently();
  if (HOME.inside) leaveHome();
  if (ORDER.state) { if (ORDER.v && player.parent === ORDER.v.m) { ORDER.v.m.remove(player); scene.add(player); } removeRideVehicle(); ORDER.state = ''; }
  if (POLICE.on) { POLICE.on = false; POLICE.m.visible = false; sirenOn(false); POLICE.crimes = []; }
  if (FISH.on) stopFishing();
  setCarry(null);
  restoreFrom(null); state.nick = nick; state.look = look; PH.deliveries = []; RT.wp = null; if (PH.open) closePhone(); updatePhoneBadge();
  if (AU.crowd) { try { AU.crowd.s.stop(); } catch (e) {} AU.crowd = null; }
  for (let i = 0; i < FW.n; i++) { FW.life[i] = 0; FW.pos[i * 3 + 1] = -1000; } FW.dirty = true;
  rebuildEnv(0);
}
let pmTab = 'map';
/* keep the coin-rush and wanted banners clear of the E / F prompts */
let promptRoom = -1;
function setPromptRoom() {
  const n = (ui.prompt.hidden ? 0 : 1) + (ui.prompt2.hidden ? 0 : 1); if (n === promptRoom) return; promptRoom = n;
  const st = document.documentElement.style; st.setProperty('--ph', n ? (n * 48 + 4) + 'px' : '0px'); st.setProperty('--ph2', n > 1 ? '52px' : '0px');
}
function openMap() { openPause('map'); }
let pausedFrom = 'play';
function closeOverlays() { ui.pause.hidden = true; if (mode === 'paused') mode = pausedFrom === 'ride' && ORDER.state === 'riding' ? 'ride' : 'play'; pausedFrom = 'play'; canvas.focus(); }
function pmShow(tab) {
  pmTab = tab;
  document.querySelectorAll('#pmTabs button').forEach(b => b.setAttribute('aria-selected', String(b.dataset.t === tab)));
  document.querySelectorAll('.pm-pane').forEach(p2 => { p2.hidden = p2.dataset.t !== tab; });
  $('#pmName').textContent = state.nick || 'Fan'; $('#pmCash').textContent = tsh(money()); $('#pmOnline').textContent = ui.onlineText.textContent;
  if (tab === 'map') { BM.follow = true; BM.zoom = Math.max(BM.zoom, 2.2); requestAnimationFrame(() => drawBigMap(elapsed)); }
  else if (tab === 'goals') renderGoals();
  else if (tab === 'stats') renderStats();
  else if (tab === 'friends') renderPlayers();
  else if (tab === 'leaders') renderLeaders();
  else if (tab === 'settings') renderCloud();
  else if (tab === 'controls') $('#pmControls').innerHTML = $('#controlsKeys').innerHTML;
  else if (tab === 'ads') renderAds($('#pmAds'), true);
  else if (tab === 'feedback') renderFeedback();
}
function renderGoals() {
  const el = $('#pmGoals'), n = stampCount();
  el.innerHTML = '';
  const card = document.createElement('div'); card.className = 'goal-card';
  card.innerHTML = `<span class="eyebrow">Road to AFCON</span><h4></h4><p></p><div class="prog-row big"><span>Fan Passport</span><b class="ps"></b></div><div class="ticket-bar"><div class="psb"></div></div><div class="prog-row big"><span>VIP ticket fund</span><b class="pc"></b></div><div class="ticket-bar"><div class="pcb"></div></div><p class="fine"></p>`;
  card.querySelector('h4').textContent = ui.goalTitle.textContent; card.querySelector('p').textContent = ui.goalDesc.textContent;
  card.querySelector('.ps').textContent = `${n} of ${REQUIRED.length} stamps`; card.querySelector('.psb').style.width = `${n / REQUIRED.length * 100}%`;
  card.querySelector('.pc').textContent = `${tsh(money())} of ${tsh(PRICES.vip)}`; card.querySelector('.pcb').style.width = `${clamp(money() / PRICES.vip, 0, 1) * 100}%`;
  card.querySelector('.fine').textContent = state.ticket ? 'VIP ticket bought. Gate A at AfconCity is open for you.' : 'Salim sells the VIP ticket at the AfconCity kiosk once every stamp is in your passport.';
  const h = document.createElement('h3'); h.textContent = 'Fan Passport · Zanzibar experiences';
  const ul = document.createElement('ul'); ul.className = 'stamps';
  for (const st of STAMPS) {
    const li = document.createElement('li'); li.className = hasStamp(st.id) ? 'done' : '';
    const i = document.createElement('i'); i.textContent = hasStamp(st.id) ? '✓' : st.req ? '' : '+';
    const b = document.createElement('b'); b.textContent = st.sw;
    const sp = document.createElement('span'); sp.textContent = st.en + (st.req ? '' : ' · bonus');
    li.append(i, b, sp); ul.append(li);
  }
  const h2 = document.createElement('h3'); h2.textContent = 'Ways to earn · real Zanzibar pay';
  const jobs = [['Seaweed harvest', 'Bi Mwanaisha, beach east of the pier · TSh 1,000 to 1,400 a kilo'], ['Cement shift', 'Fundi Musa, Continental Mall site · TSh 35,000'], ['Volunteer shift', 'Neema, stadium plaza · TSh 40,000 stipend'], ['Bajaji race', 'Start sign on the Fumba road · gold TSh 70,000'], ['Madafu trading', 'Buy at TSh 1,000 from Mzee Hamisi, sell at TSh 3,500 on the beach'], ['Penalty bets', 'Coach Baraka, training pitch · double your stake'], ['Pizza runs', 'Mzee Juma, Uptown Park · TSh 6,000 to 12,000'], ['Bajaji taxi', 'Ali, by the Fan Zone · fares from TSh 3,000'], ['Street cash', 'Coins TSh 1,000, cash bundles TSh 15,000 on the road · coin rush gold TSh 3,000'], ['Catch a pickpocket', 'Run him down or tackle him (F): you get your money back plus a TSh 5,000 police reward']];
  const ul2 = document.createElement('ul'); ul2.className = 'jobs';
  for (const [a, b2] of jobs) { const li = document.createElement('li'); const x = document.createElement('b'); x.textContent = a; const y = document.createElement('span'); y.textContent = b2; li.append(x, y); ul2.append(li); }
  el.append(card, h, ul, h2, ul2);
  if (state.intro) dailyCardHTML(el);
}
function renderStats() {
  const st = state.stats, s2 = Math.round(state.playMs / 1000);
  const rows = [[tsh(state.cash), 'Cash now'], [tsh(state.bank || 0), 'On Pesa'], [`${Math.round(state.food === undefined ? 100 : state.food)}%`, 'Fed'], [fmt(st.fish || 0), 'Fish caught'], [fmt((state.souvenirs || []).length), 'Souvenirs'], [`${Math.round(state.energy === undefined ? 100 : state.energy)}%`, 'Energy'], [myHome() ? myHome().name : 'None', 'Home'], [`Day ${clockDay() + 1} · ${clockText()}`, 'Clock'], [tsh(st.earned), 'Earned'], [tsh(st.spent), 'Spent'], [tsh(st.lost), 'Lost'], [`${stampCount()}/${REQUIRED.length}`, 'Passport stamps'], [fmt(st.jobs), 'Jobs done'], [`${fmt(state.kg)} kg`, 'Seaweed sold'], [fmt(st.sold || 0), 'Madafu sold'], [fmt(st.coins), 'Coins grabbed'], [fmt(st.thieves), 'Thieves caught'], [st.best ? fmtTime(st.best) : '—', 'Best race'], [`${Math.floor(s2 / 60)}:${String(s2 % 60).padStart(2, '0')}`, 'Time played']];
  const el = $('#pmStats'); el.innerHTML = '';
  for (const [v, l] of rows) { const d = document.createElement('div'); const b = document.createElement('b'); b.textContent = v; const sp = document.createElement('span'); sp.textContent = l; d.append(b, sp); el.append(d); }
}
function openChat() { if (mode !== 'play') return; ui.chat.classList.add('open'); if (isTeen()) { renderPhrases(); $('#chatPhrases').hidden = false; ui.chatHint.hidden = true; if (document.pointerLockElement) document.exitPointerLock(); const f = $('#chatPhrases button'); if (f) f.focus(); return; } ui.chatbox.hidden = false; ui.chatHint.hidden = true; ui.chatInput.value = ''; if (document.pointerLockElement) document.exitPointerLock(); ui.chatInput.focus(); MP.typ = 1; sendPresence(true); }
function closeChat() { ui.chat.classList.remove('open'); ui.chatbox.hidden = true; $('#chatPhrases').hidden = true; ui.chatHint.hidden = false; MP.typ = 0; sendPresence(true); canvas.focus(); }
function openPause(tab) { if (mode !== 'play' && mode !== 'paused' && mode !== 'ride') return; if (mode !== 'paused') pausedFrom = mode; mode = 'paused'; ui.pause.hidden = false; if (document.pointerLockElement) document.exitPointerLock(); pmShow(typeof tab === 'string' ? tab : pmTab); $('#btnResume').focus(); }
/* the look card on Play and the wardrobe panel */
function renderKits() { renderLookSum(); renderPurseFact(); if (STYLE.on || !$('.sp[data-p="style"]').hidden) renderStyle($('#styleMain')); }
function wireUI() {
  renderKits();
  if (state.nick) $('#nick').value = state.nick;
  $('#btnPlay').addEventListener('click', startPlay);
  $('#btnNew').addEventListener('click', () => { newGame(); renderKits(); startPlay(); });
  ui.prompt.addEventListener('click', () => { if (curInter) curInter.act(); canvas.focus(); });
  ui.prompt2.addEventListener('click', () => { if (curSec) curSec.act(); canvas.focus(); });
  ui.mClose.addEventListener('click', closeMenu);
  $('#btnMap').addEventListener('click', openMap); ui.radar.addEventListener('click', openMap);
  $('#btnMenu').addEventListener('click', () => openPause());
  document.querySelectorAll('#pmTabs button').forEach(b => b.addEventListener('click', () => pmShow(b.dataset.t)));
  $('#btnUnstick').addEventListener('click', () => { closeOverlays(); stuckMenu(); });
  wireBigMap();
  // main menu: each item shows its panel
  const showSP = (k) => { document.querySelectorAll('.mm-item').forEach(b => b.setAttribute('aria-current', String(b.dataset.p === k))); document.querySelectorAll('.sp').forEach(p2 => { p2.hidden = p2.dataset.p !== k; }); AD.view = null; if (k === 'ads') menuAdsView(); if (k === 'about') drawAboutMap(); if (k === 'friends') renderInvitePanel(); if (mode === 'intro') setStyling(k === 'style'); if (k === 'style') renderStyle($('#styleMain')); };
  $('#btnStyleBack').addEventListener('click', () => { showSP('play'); $('#btnPlay').focus(); });
  wireMenuExtras();
  $('#btnStyle').addEventListener('click', () => showSP('style'));
  $('#codeForm').addEventListener('submit', (e) => { e.preventDefault(); cloudLoad($('#codeInput').value, $('#codeOut')); });
  $('#codeInput').addEventListener('keydown', (e) => e.stopPropagation());
  $('#btnStyleDone').addEventListener('click', () => { showSP('play'); $('#btnPlay').focus(); });
  window.addEventListener('keydown', (e) => { if (STYLE.on && mode === 'intro' && e.key === 'Escape') { e.preventDefault(); showSP('play'); $('#btnPlay').focus(); } });
  document.querySelectorAll('.mm-item').forEach(b => { b.addEventListener('click', () => { showSP(b.dataset.p); if (b.dataset.p === 'play' && !$('#btnPlay').disabled) $('#btnPlay').focus(); }); b.addEventListener('focus', () => showSP(b.dataset.p)); });
  wireSettings();
  $('#btnResume').addEventListener('click', closeOverlays);
  $('#btnRestart').addEventListener('click', () => { ui.pause.hidden = true; mode = 'play'; newGame(); renderKits(); enterPlay(); });
  $('#btnRoam').addEventListener('click', () => { ui.end.hidden = true; ui.hud.hidden = false; ui.tags.hidden = false; mode = 'play'; cam.yaw = Math.PI; canvas.focus(); });
  $('#btnReplay').addEventListener('click', () => { ui.end.hidden = true; mode = 'play'; newGame(); renderKits(); enterPlay(); });
  $('#btnShoot').addEventListener('click', () => { penaltyShoot(); canvas.focus(); });
  ui.online.addEventListener('click', () => { if (MP.status !== 'live' && MP.room && MP.room.retry) MP.room.retry(); ui.players.hidden = !ui.players.hidden; ui.online.setAttribute('aria-expanded', String(!ui.players.hidden)); renderPlayers(); });
  document.querySelectorAll('[data-seg="gfx"] button').forEach(b => b.addEventListener('click', () => { gfx = b.dataset.v; try { localStorage.setItem(GFX_KEY, gfx); } catch (e) {} segSet('[data-seg="gfx"]', gfx); setShadowRes(); resizeAll(); applyNight(smooth(night)); armWatch(); }));
  document.querySelectorAll('[data-seg="follow"] button').forEach(b => b.addEventListener('click', () => { SETTINGS.follow = b.dataset.v === 'on'; try { localStorage.setItem('afconcity-follow', b.dataset.v); } catch (e) {} segSet('[data-seg="follow"]', b.dataset.v); }));
  document.querySelectorAll('[data-seg="time"] button').forEach(b => b.addEventListener('click', () => setTimeMode(b.dataset.v)));
  document.querySelectorAll('[data-seg="hud"] button').forEach(b => b.addEventListener('click', () => setHudPreset(b.dataset.v, mode === 'intro' || mode === 'paused')));
  $('#btnHud').addEventListener('click', () => { cycleHud(); canvas.focus(); }); $('#hudEye').addEventListener('click', () => { cycleHud(); canvas.focus(); });
  renderHudParts(); applyHudVis(); wirePhone();
  document.querySelectorAll('[data-seg="sound"] button').forEach(b => b.addEventListener('click', () => { audioInit(); setSound(b.dataset.v === 'on'); }));
  segSet('[data-seg="gfx"]', gfx); segSet('[data-seg="sound"]', AU.on ? 'on' : 'off'); segSet('[data-seg="follow"]', SETTINGS.follow ? 'on' : 'off');
  ui.chatbox.addEventListener('submit', (e) => { e.preventDefault(); sendChat(ui.chatInput.value); ui.chatInput.value = ''; closeChat(); });
  ui.chatInput.addEventListener('keydown', (e) => { e.stopPropagation(); if (e.key === 'Escape') { e.preventDefault(); closeChat(); } });
  ui.chatInput.addEventListener('input', () => { const v = ui.chatInput.value.length ? 1 : 0; if (v !== MP.typ) { MP.typ = v; sendPresence(true); } });
  ui.chatInput.addEventListener('blur', () => setTimeout(() => { if (document.activeElement !== ui.chatInput && !ui.chatbox.hidden) closeChat(); }, 150));
  /* touch buttons act on pointerdown so they work while another finger holds the joystick; a click after a tap is ignored */
  const tap = (el, fn) => {
    el.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); el._tapT = performance.now(); el._fromTap = true; el.classList.add('act'); fn(); });
    const up = () => { if (el !== tJump) el.classList.remove('act'); }; el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up); el.addEventListener('pointerleave', up);
    // the click that follows a tap is an echo, however late it arrives (iPads delay it while the keyboard closes); keyboard clicks still work
    el.addEventListener('click', (e) => { e.preventDefault(); if (el._fromTap || performance.now() - (el._tapT || 0) < 700) { el._fromTap = false; return; } fn(); });
  };
  const tJump = $('#tJump');
  // Chat opens the chat; pressed again it sends what you typed (if anything) and closes. Two toggles within 350 ms are one press.
  tap($('#tChat'), () => {
    const t = performance.now(); if (t - (ui.chat._tg || 0) < 350) return; ui.chat._tg = t;
    if (!ui.chat.classList.contains('open')) { openChat(); return; }
    const v = ui.chatInput.value.trim(); if (v && !ui.chatbox.hidden) { sendChat(v); ui.chatInput.value = ''; }
    closeChat();
  });
  $('#chatPhrases').addEventListener('keydown', (e) => { e.stopPropagation(); if (e.key === 'Escape') { e.preventDefault(); closeChat(); } });
  tap($('#tAct'), () => { if (curSec && !curInter) curSec.act(); else if (curInter) curInter.act(); });
  for (const el of document.querySelectorAll('#touch, #touch *')) el.addEventListener('touchstart', (e) => { if (e.cancelable) e.preventDefault(); }, { passive: false });
  document.addEventListener('gesturestart', (e) => e.preventDefault());
  tJump.addEventListener('pointerdown', (e) => { e.preventDefault(); jumpTap = true; tJump.classList.add('act'); });
  const tjUp = () => tJump.classList.remove('act'); tJump.addEventListener('pointerup', tjUp); tJump.addEventListener('pointercancel', tjUp); tJump.addEventListener('pointerleave', tjUp);
  const tRun = $('#tRun'); tap(tRun, () => { runToggle = !runToggle; tRun.setAttribute('aria-pressed', String(runToggle)); });

  window.addEventListener('keydown', (e) => {
    if (mode === 'intro' || mode === 'sleep') return;
    const ae = document.activeElement; if (ae === ui.chatInput || ae === $('#nick')) return;
    const code = e.code;
    if (mode === 'phone') { if (!e.repeat) phoneKey(e); return; }
    if (mode === 'home' && ui.pause.hidden) { if (!e.repeat) homeKey(e); return; }
    if (mode === 'ride') { if (e.repeat) return; if (code === 'KeyE') skipRide(); else if (code === 'KeyH') cycleHud(); else if (code === 'Escape') openPause(); else if (code === 'KeyP') openPhone(); else if (code === 'KeyM') openMap(); return; }
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(code)) e.preventDefault();
    if (code === 'Escape') {
      if (!ui.menu.hidden) { closeMenu(); return; }
      if (!ui.pause.hidden) { closeOverlays(); return; }
      if (mode === 'play' && ui.end.hidden) openPause();
      return;
    }
    if (!ui.menu.hidden) { const n = parseInt(e.key, 10); if (n >= 1 && n <= 9) pickMenu(n - 1); else if (code === 'ArrowDown' || code === 'KeyS') moveMenu(1); else if (code === 'ArrowUp' || code === 'KeyW') moveMenu(-1); else if ((code === 'Enter' || code === 'KeyE' || code === 'Space') && menuSel >= 0) { e.preventDefault(); pickMenu(menuSel); } return; }
    if (mode === 'penalty' && (code === 'Space' || code === 'Enter' || code === 'KeyE')) { if (!e.repeat) penaltyShoot(); return; }
    if (mode !== 'play') { if (code === 'KeyM' && !ui.pause.hidden) { if (pmTab === 'map') closeOverlays(); else pmShow('map'); } return; }
    if (e.repeat && (code === 'KeyE' || code === 'KeyF' || code === 'KeyT' || code === 'Enter')) return;
    if ((code === 'Enter' || code === 'Space') && ae && ae.tagName === 'BUTTON') return;
    if (code === 'KeyE') { if (curInter) curInter.act(); return; }
    if (code === 'KeyF') { if (curSec) curSec.act(); else tackle(); return; }
    if (code === 'KeyT' || code === 'Enter') { e.preventDefault(); openChat(); return; }
    if (code === 'KeyM') { openMap(); return; }
    if (code === 'Tab') { ui.online.click(); return; }
    if (code === 'KeyH') { cycleHud(); return; }
    if (code === 'KeyQ' && playerVeh) { sfx.horn(0); return; }
    if (code === 'KeyP') { openPhone(); return; }
    if (code === 'Digit1') { doEmote('wave'); return; }
    if (code === 'Digit2') { doEmote('dance'); return; }
    if (code === 'Digit3') { doEmote('cheer'); return; }
    keys.add(code);
  });
  window.addEventListener('keyup', (e) => keys.delete(e.code));
  window.addEventListener('blur', () => keys.clear());
  document.addEventListener('pointerlockchange', () => { pointerLocked = document.pointerLockElement === canvas; canvas.classList.toggle('locked', pointerLocked); });
  canvas.addEventListener('click', () => { if (mode === 'play' && !isCoarse && !pointerLocked && canvas.requestPointerLock) { try { const r = canvas.requestPointerLock(); if (r && r.catch) r.catch(() => {}); } catch (e) {} } });
  document.addEventListener('mousemove', (e) => { if (!pointerLocked) return; cam.yaw -= e.movementX * 0.0025 * SETTINGS.sens; cam.pitch = clamp(cam.pitch + e.movementY * 0.002 * SETTINGS.sens, -0.35, 1.15); cam.lastLook = now(); });
  canvas.addEventListener('pointerdown', (e) => { if (pointerLocked || drag.id !== null) return; drag.id = e.pointerId; drag.x = e.clientX; drag.y = e.clientY; try { canvas.setPointerCapture(e.pointerId); } catch (err) {} });
  canvas.addEventListener('pointermove', (e) => { if (e.pointerId !== drag.id) return; const dx = e.clientX - drag.x, dy = e.clientY - drag.y; drag.x = e.clientX; drag.y = e.clientY; cam.yaw -= dx * 0.006 * SETTINGS.sens; cam.pitch = clamp(cam.pitch + dy * 0.004 * SETTINGS.sens, -0.35, 1.15); cam.lastLook = now(); });
  const endDrag = (e) => { if (e.pointerId === drag.id) drag.id = null; };
  canvas.addEventListener('pointerup', endDrag); canvas.addEventListener('pointercancel', endDrag);
  canvas.addEventListener('wheel', (e) => { e.preventDefault(); cam.dist = clamp(cam.dist + e.deltaY * 0.01, 2.2, 14); }, { passive: false });
  const joyEl = $('#joy'), knob = $('#joyKnob');
  const joyMove = (e) => { const R = 48; let dx = e.clientX - joy.cx, dy = e.clientY - joy.cy; const d = Math.hypot(dx, dy); if (d > R) { dx *= R / d; dy *= R / d; } joy.x = dx / R; joy.y = -dy / R; knob.style.transform = `translate(${dx}px,${dy}px)`; };
  joyEl.addEventListener('pointerdown', (e) => { if (joy.id !== null && joy.id !== e.pointerId) return; joy.id = e.pointerId; try { joyEl.setPointerCapture(e.pointerId); } catch (err) {} const r = joyEl.getBoundingClientRect(); joy.cx = r.left + r.width / 2; joy.cy = r.top + r.height / 2; joyMove(e); e.preventDefault(); });
  joyEl.addEventListener('pointermove', (e) => { if (e.pointerId === joy.id) joyMove(e); });
  const joyEnd = (e) => { if (e.pointerId !== joy.id) return; joy.id = null; joy.x = joy.y = 0; knob.style.transform = ''; };
  joyEl.addEventListener('pointerup', joyEnd); joyEl.addEventListener('pointercancel', joyEnd); joyEl.addEventListener('lostpointercapture', joyEnd);
  window.addEventListener('resize', resizeAll);
}

/* ---------- boot ---------- */
const nextFrame = () => new Promise(r => requestAnimationFrame(() => r()));
async function start(data) {
  if (booted) return; booted = true;
  const sd = $('#startDays'); if (sd) sd.textContent = DAYS;
  /* the progress bar: on the website the loader fills the first part while downloading, the boot steps fill the rest */
  const STEPS = 10, base = window.__afcLoad ? window.__afcLoad.base : 0;
  let stepN = 0;
  const btn = $('#btnPlay'), step = async (msg) => {
    btn.textContent = msg; stepN++;
    btn.classList.add('loading'); btn.style.setProperty('--load', `${Math.round(base + (100 - base) * Math.min(1, stepN / STEPS))}%`);
    await nextFrame();
  };
  let saved = (data && data.save && data.save.v === SAVE_V) ? data.save : readSave();
  if (!saved && data && data.save && data.save.nick) saved = { v: SAVE_V, nick: data.save.nick };
  if (saved) { state = Object.assign(defaultState(), saved); state.stats = Object.assign(defaultState().stats, saved.stats || {}); }
  state.tips = state.tips || {};
  // new players start in an island look (returning players keep what they wore)
  if (!saved || !saved.intro) { if (!state.look || state.look.t === undefined) state.look = newPlayerLook(!!(state.look && state.look.f)); }
  initMultiplayer(); initOnline(); initDaily();
  try { await Promise.race([Promise.all([document.fonts.load(`900 64px "Big Shoulders Display"`), document.fonts.load(`600 32px Figtree`)]), new Promise(r => setTimeout(r, 2500))]); } catch (e) {}
  await step('Painting textures…'); await loadTextures(); buildTextures();
  await step('Raising the sea…'); buildSea(); buildLand();
  await step('Laying the roads…'); buildRoads(); buildLamps(); buildPowerLines();
  const nStatic = scene.children.length;
  await step('Building AfconCity…'); buildStadium(); buildAfconCity();
  await step('Building the villas…'); buildBuildings();
  await step('Opening the venues…'); buildFanZone(); buildTraining(); buildMarket(); buildBar(); buildClinic(); buildKiosk(); buildStands(); buildTrafiki(); buildBeach(); buildRoadEnds();
  await step('Building tomorrow’s Fumba…'); buildFuture(); buildBoatTrips(); buildStreetLife(); mergeStatic(scene.children.slice(nStatic));
  await step('Planting palms…'); prepSimNPCs(); buildNPCs(); buildTourists(); buildLife(); buildHomes(); buildSimProps(); initAds().then(loadStatsBase); buildVegetation(); buildClouds();
  await step('Lighting the sky…'); rebuildEnv(state.night || state.done ? 1 : 0);
  await step('Starting the traffic…'); buildNav(); spawnCars(); spawnRentals(); buildWalkers(); buildThieves();
  buildCoins(); buildSparkles(); buildJobMarkers(); buildQuestProps(); buildPenaltyProps(); buildFireworks(); drawMapBase();
  restoreFrom(state);
  wireUI();
  btn.classList.remove('loading'); btn.style.removeProperty('--load');
  btn.disabled = false; btn.textContent = saved && saved.intro ? 'Twende · Continue' : 'Twende · Play';
  $('#mmPlayHint').textContent = saved && saved.intro ? `Continue · ${tsh(money())}` : 'Start in Fumba';
  $('#btnNew').hidden = !(saved && saved.intro);
  initEvents(); initMissions(); initEconomy(); initNyota();
  requestAnimationFrame((n) => { last = n; requestAnimationFrame(loop); });
}
const hot = window.claude && window.claude.hot;
if (hot && typeof hot.snapshot === 'function') { try { hot.snapshot(() => { if (player && !playerVeh) { state.x = P.x; state.z = P.z; state.ry = player.rotation.y; } return { save: state }; }); } catch (e) {} }
if (hot && typeof hot.ready === 'function') hot.ready(start); else start((hot && hot.data) || {});

/* diagnostics: press F8 (or tap the area name five times) to see what the renderer is doing on this device */
const DIAG = { errs: [], on: false, el: null, taps: 0, tapT: 0 };
{ const ce = console.error.bind(console); console.error = (...a) => { try { DIAG.errs.push(a.map(x => String((x && x.message) || x)).join(' ').replace(/\s+/g, ' ').slice(0, 260)); if (DIAG.errs.length > 6) DIAG.errs.shift(); } catch (e) {} ce(...a); }; }
window.addEventListener('error', (e) => { DIAG.errs.push(String(e.message).slice(0, 260)); if (DIAG.errs.length > 6) DIAG.errs.shift(); });
canvas.addEventListener('webglcontextlost', () => DIAG.errs.push('WebGL context lost'));
function diagText() {
  const gl = renderer.getContext(), ext = gl.getExtension('WEBGL_debug_renderer_info'), info = renderer.info.render, c = camera.position;
  return [`gpu ${ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER)} · webgl${renderer.capabilities.isWebGL2 ? 2 : 1}`,
    `fps ${fpsMeter.fps} · calls ${info.calls} · tris ${info.triangles} · gfx ${gfx} · res ${resScale.toFixed(2)} · px ${renderer.getPixelRatio().toFixed(2)}`,
    `mode ${mode} · you ${P.x.toFixed(1)}, ${P.z.toFixed(1)} · cam ${c.x.toFixed(1)}, ${c.y.toFixed(1)}, ${c.z.toFixed(1)} · yaw ${cam.yaw.toFixed(2)} · dist ${cam.curDist.toFixed(2)}`,
    `net ${MP.status} · ${MP.why || ''} · viewers ${MP.viewers} · peers ${remotes.size}`].concat(DIAG.errs.map(e => '! ' + e)).join('\n');
}
function toggleDiag() {
  DIAG.on = !DIAG.on;
  if (!DIAG.el) { DIAG.el = document.createElement('pre'); DIAG.el.style.cssText = 'position:fixed;left:50%;top:60px;transform:translateX(-50%);z-index:60;max-width:min(760px,94vw);margin:0;padding:10px 12px;border-radius:8px;background:rgba(6,8,20,.88);color:#f7ead0;font:600 11px/1.45 ui-monospace,Menlo,monospace;white-space:pre-wrap;pointer-events:none'; document.body.append(DIAG.el); }
  DIAG.el.hidden = !DIAG.on;
}
setInterval(() => { if (DIAG.on && DIAG.el) DIAG.el.textContent = diagText(); }, 500);
window.addEventListener('keydown', (e) => { if (e.code === 'F8') toggleDiag(); });
$('#area') && $('#area').addEventListener('pointerdown', () => { const t = performance.now(); DIAG.taps = t - DIAG.tapT < 600 ? DIAG.taps + 1 : 1; DIAG.tapT = t; if (DIAG.taps >= 5) { DIAG.taps = 0; toggleDiag(); } });

/* test hook (DEV builds only): lets the claude.ai page that hosts this artifact drive a session for checks on real hardware */
const DEV = /*DEV*/false;
const fpsMeter = { n: 0, t0: performance.now(), fps: 0 };
(function fpsTick() { fpsMeter.n++; const t = performance.now(); if (t - fpsMeter.t0 > 1000) { fpsMeter.fps = Math.round(fpsMeter.n * 1000 / (t - fpsMeter.t0)); fpsMeter.n = 0; fpsMeter.t0 = t; } requestAnimationFrame(fpsTick); })();
if (DEV) window.addEventListener('message', (e) => {
  if (e.origin !== 'https://claude.ai' || !e.data || e.data.__afc !== 1) return;
  const d = e.data, out = {};
  try {
    if (d.cmd === 'play' && !$('#btnPlay').disabled && mode === 'intro') enterPlay();
    if (d.cmd === 'tp') { if (playerVeh) { playerVeh.x = d.x; playerVeh.z = d.z; playerVeh.vx = playerVeh.vz = 0; } P.x = d.x; P.z = d.z; if (!playerVeh) player.position.set(d.x, baseY, d.z); }
    if (d.cmd === 'cam') { if (d.yaw !== undefined) cam.yaw = d.yaw; if (d.pitch !== undefined) cam.pitch = d.pitch; if (d.dist !== undefined) cam.dist = cam.curDist = d.dist; cam.lastLook = now() + (d.hold || 0); }
    if (d.cmd === 'key') { if (d.down) keys.add(d.code); else keys.delete(d.code); }
    if (d.cmd === 'gfx') { gfx = d.v; segSet('[data-seg="gfx"]', gfx); setShadowRes(); resizeAll(); applyNight(smooth(night)); }
    if (d.cmd === 'night') setNight(!!d.on);
    if (d.cmd === 'talk') talk(d.id);
    if (d.cmd === 'pick') pickMenu(d.i);
    if (d.cmd === 'close') { closeMenu(); closeOverlays(); }
    if (d.cmd === 'pause') openPause(d.tab);
    if (d.cmd === 'rent') { const v = nearestRental(40); if (v) { P.x = v.x + 1; P.z = v.z; rentOrRide(v); } }
    const info = renderer.info.render;
    Object.assign(out, { mode, x: +P.x.toFixed(2), z: +P.z.toFixed(2), ry: +(playerVeh ? playerVeh.yaw : player ? player.rotation.y : 0).toFixed(2), speed: +speed.toFixed(2), veh: playerVeh ? playerVeh.kind : '', vf: playerVeh ? +playerVeh.vf.toFixed(2) : 0, cash: state.cash, hp: Math.round(state.hp), fps: fpsMeter.fps, calls: info.calls, tris: info.triangles, gfx, res: resScale, net: MP.status, viewers: MP.viewers, camd: +cam.curDist.toFixed(2), err: (window.__afcErr || []).slice(-3) });
  } catch (err) { out.error = String(err && err.message || err); }
  try { e.source.postMessage({ __afcR: 1, id: d.id, r: out }, e.origin); } catch (err) {}
});
if (DEV) window.addEventListener('error', (e) => { (window.__afcErr = window.__afcErr || []).push(String(e.message).slice(0, 160)); });
if (DEV) window.__G = {
  get state() { return state; }, get P() { return P; }, get mode() { return mode; }, get job() { return job; }, get veh() { return playerVeh; }, get speed() { return speed; },
  get menu() { return ui.menu.hidden ? null : { title: ui.mTitle.textContent, items: menuItems.map((it, i) => ({ label: it.label, price: it.price, disabled: ui.mItems.children[i] && ui.mItems.children[i].disabled })) }; },
  get fps() { return fpsMeter.fps; }, get info() { const i = renderer.info.render; return { calls: i.calls, tris: i.triangles, geos: renderer.info.memory.geometries, tex: renderer.info.memory.textures }; },
  get MP() { return { status: MP.status, viewers: MP.viewers, why: MP.why || '' }; }, get goal() { return { tag: ui.goalTag.textContent, title: ui.goalTitle.textContent, desc: ui.goalDesc.textContent }; },
  enterPlay, talk, pickMenu, closeMenu, earn, orderRide, skipRide, openPhone, closePhone, enterHome, leaveHome, cycleHud, setHudPreset, keys, cam, NPC_BY_ID, rentals, cars, areaAt, walkable, pointBlocked, unstick, trapped, nearestRental, rentOrRide, exitVehicle, newGame,
  tp(x, z) { if (playerVeh) { playerVeh.x = x; playerVeh.z = z; playerVeh.vx = playerVeh.vz = playerVeh.vf = 0; } P.x = x; P.z = z; if (!playerVeh && player) player.position.set(x, baseY, z); },
  colliderNear(x, z, r) { const out = []; const seen = new Set(); for (let ix = Math.floor((x - r) / CELL); ix <= Math.floor((x + r) / CELL); ix++) for (let iz = Math.floor((z - r) / CELL); iz <= Math.floor((z + r) / CELL); iz++) for (const c of (cgrid.get(ck(ix, iz)) || EMPTY)) { if (seen.has(c)) continue; seen.add(c); if (Math.hypot(c.x - x, c.z - z) < r + c.br) out.push({ t: c.t, x: +c.x.toFixed(1), z: +c.z.toFixed(1), hw: c.hw, hd: c.hd, r: c.r, tag: c.tag, on: c.on }); } return out; },
  run(src) { return eval(src); }, // eslint-disable-line no-eval
};

