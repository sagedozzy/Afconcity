/* ===================== 20 people: NPCs, pedestrians, thieves ===================== */
/* ---------- NPCs ---------- */
const NPCS = [
  { id: 'amina', name: 'Amina', role: 'AfconCity guide', x: START.x - 6.5, z: START.z + 1.8, ry: Math.PI / 2 + 0.25, look: { skin: 0x6b4226, shirt: 0x19b5b1, lower: 0x232a63, dress: 0x232a63, hair: 'scarf', scarf: 0xf3b41b, f: true, sandals: true, shoes: 0xf3b41b, style: 'kanga', trim: 0xf3b41b, trim2: 0xe0553a, long: true } },
  { id: 'mama', name: 'Mama Pwani', role: 'Beach bar', x: BAR.x + 1.8, z: BAR.z, ry: Math.PI / 2, ix: BAR.x, iz: BAR.z, ir: 6.2, look: { skin: 0x4f2f1c, shirt: 0xe0553a, lower: 0x7a4a2a, dress: 0xf3b41b, hair: 'scarf', scarf: 0xe0553a, f: true, sandals: true, shoes: 0xe0553a, style: 'kanga', trim: 0x141838, trim2: 0x141838, long: true } },
  { id: 'juma', name: 'Mzee Juma', role: 'Pizza runs · Uptown Park', x: 205, z: 47, ry: -Math.PI / 2, look: { skin: 0x4f2f1c, shirt: 0xf6f1e7, robe: true, hair: 'kofia', lower: 0xf6f1e7, beard: 0xd8d4cc, sandals: true, shoes: 0x5a3a22, kofiaCol: 0xd8452c, longSleeve: true } },
  { id: 'ashura', name: 'Mama Ashura', role: 'Usiku food market', x: 191, z: 47.5, ry: Math.PI / 2, look: { skin: 0x553320, shirt: 0xe0553a, lower: 0x232a63, dress: 0x8e3b8f, hair: 'scarf', scarf: 0xf3b41b, f: true, sandals: true, shoes: 0x1d1d22, long: true, trim2: 0xf3b41b } },
  { id: 'rukia', name: 'Bi Rukia', role: 'Kanga & henna', x: 197, z: 66, ry: Math.PI, look: { skin: 0x6b4226, shirt: 0x8e3b8f, lower: 0x141838, dress: 0x19b5b1, hair: 'scarf', scarf: 0xe0553a, f: true, sandals: true, shoes: 0x8e3b8f, style: 'kanga', trim: 0xf3b41b, trim2: 0xf3b41b, long: true } },
  { id: 'ali', name: 'Ali', role: 'Bajaji taxi dispatcher', x: -288, z: 3, ry: Math.PI, look: { skin: 0x3d2416, shirt: 0x2a7fc4, lower: 0x2a2d33, pants: true, hair: 'cap', cap: 0xf3b41b, style: 'button', sandals: true, shoes: 0x2a2d33 } },
  { id: 'rehema', name: 'Rehema', role: 'Fan shop', x: SHOP.x, z: SHOP.z - 0.2, ry: 0, look: { skin: 0x7a4a2a, shirt: 0x1e9b57, lower: 0x141838, hair: 'afro', trim: 0xf3b41b, f: true, shoes: 0xf4f4f0, shoeTrim: 0x1e9b57 } },
  { id: 'bibi', name: 'Bibi Mwanaidi', role: 'Swahili lessons', x: FZ.x - 30, z: FZ.z + 30, ry: 0, look: { skin: 0x46291a, shirt: 0x15161c, robe: true, lower: 0x15161c, hair: 'scarf', scarf: 0x15161c, f: true, sandals: true, shoes: 0x15161c, longSleeve: true, trim2: 0x15161c } },
  { id: 'baraka', name: 'Coach Baraka', role: 'Penalty shootouts', x: TRAIN.x + TRAIN.w / 2 + 3, z: PEN.gz + 14, ry: -Math.PI / 2, look: { skin: 0x553320, shirt: 0x1e9b57, lower: 0x141838, hair: 'cap', cap: 0xf3b41b, socks: 0xf6f1e7, kit: true, trim: 0xf3b41b, shoes: 0x15161c, shoeTrim: 0xf3b41b } },
  { id: 'salim', name: 'Salim', role: 'VIP tickets', x: KIOSK.x - 8, z: KIOSK.z, ry: -Math.PI / 2, look: { skin: 0x4a2c1a, shirt: 0xf3b41b, lower: 0x2a2d33, pants: true, hair: 'cap', cap: 0xe0553a, style: 'button', shoes: 0x3a2a1a } },
  { id: 'neema', name: 'Neema', role: 'AFCON volunteers', x: SC.x - 46, z: PLAZA.z + 12, ry: Math.PI, look: { skin: 0x6b4226, shirt: 0x1e9b57, lower: 0x232a63, pants: true, vest: 0xd7f23a, hair: 'afro', f: true, shoes: 0xf4f4f0 } },
  { id: 'kassim', name: 'DJ Kassim', role: 'Fan Zone', x: -330, z: -133, ry: 0, look: { skin: 0x3d2416, shirt: 0xe0553a, lower: 0x141838, hair: 'cap', cap: 0x141838, shoes: 0xf4f4f0, shoeTrim: 0xe0553a, capLogo: 0xf3b41b } },
  { id: 'steward', name: 'Steward', role: 'Gate A', x: GATE.x + 6.5, z: GATE.z + 3, ry: Math.PI, look: { skin: 0x46291a, shirt: 0x232a63, lower: 0x232a63, pants: true, vest: 0xd7f23a, hair: 'short', shoes: 0x15161c } },
  { id: 'trafiki', name: 'Trafiki', role: 'Traffic police', x: TRAFIKI.ox + 1.1, z: TRAFIKI.oz - 1.2, ry: Math.PI * 0.85, look: { skin: 0x3d2416, shirt: 0xf4f4f0, lower: 0x1a2340, pants: true, longSleeve: true, hair: 'police', shoes: 0x0d0d0d, style: 'button' } },
  { id: 'halima', name: 'Nurse Halima', role: 'Clinic', x: CLINIC.x + 3.5, z: CLINIC.z + 6.6, ry: 0, look: { skin: 0x6b4226, shirt: 0xf4f4f0, lower: 0xf4f4f0, pants: true, hair: 'scarf', scarf: 0xf4f4f0, f: true, longSleeve: true, shoes: 0xf4f4f0 } },
  { id: 'hamisi', name: 'Mzee Hamisi', role: 'Spice farm guide', x: SPICE_HUT.x + 2.5, z: SPICE_HUT.z + 3.6, ry: 0, look: { skin: 0x46291a, shirt: 0xf6f1e7, robe: true, lower: 0xf6f1e7, hair: 'kofia', beard: 0xd8d4cc, sandals: true, shoes: 0x5a3a22, kofiaCol: 0x232a63, longSleeve: true } },
  { id: 'mwanaisha', name: 'Bi Mwanaisha', role: 'Seaweed co-op', x: SEAWEED_BUYER.x, z: SEAWEED_BUYER.z, ry: 0, look: { skin: 0x4f2f1c, shirt: 0xf3b41b, lower: 0x1e9b57, dress: 0x1e9b57, hair: 'scarf', scarf: 0x19b5b1, f: true, sandals: true, shoes: 0x19b5b1, trim2: 0xf3b41b } },
  { id: 'nahodha', name: 'Nahodha Salum', role: 'Dhow captain · boat trips', x: PIER.x - 3.4, z: coastZ(PIER.x) - 9, ry: 0, look: { skin: 0x3d2416, shirt: 0xf6f1e7, lower: 0x232a63, pants: true, hair: 'kofia', beard: 0x2a2420, sandals: true, shoes: 0x3a2a1a, style: 'button', kofiaCol: 0x19b5b1 } },
  { id: 'omari', name: 'Mzee Omari', role: 'Daladala owner · depot', x: 599.6, z: -99.6, ry: -Math.PI / 2 - 0.4, look: { skin: 0x46291a, shirt: 0x232a63, lower: 0x2a2d33, pants: true, hair: 'kofia', kofiaCol: 0xf3b41b, beard: 0x9a9690, style: 'button', sandals: true, shoes: 0x3a2a1a } },
  { id: 'musa', name: 'Fundi Musa', role: 'Site foreman · day work', x: MALL.x - 78, z: MALL.z + MALL.d / 2 + 75.5, ry: 0, look: { skin: 0x3d2416, shirt: 0xf3b41b, lower: 0x2a2d33, pants: true, vest: 0xff8a3d, hair: 'cap', cap: 0xf6f1e7, shoes: 0x5a3a22, sole: 0x3a2a1e, style: 'button' } },
];
const NPC_BY_ID = Object.fromEntries(NPCS.map(n => [n.id, n]));
const npcObjs = {};
function buildNPCs() {
  for (const n of NPCS) { const h = makeHuman(n.look); h.position.set(n.x, 0.04, n.z); h.rotation.y = n.ry; scene.add(h); npcObjs[n.id] = h; if (n.id !== 'mama') addCircle(n.x, n.z, 0.4, 'npc'); }
}

/* ---------- pedestrians ---------- */
const walkers = [];
function pathLen(p) { let L = 0; for (let i = 0; i < p.length - 1; i++) L += Math.hypot(p[i + 1][0] - p[i][0], p[i + 1][1] - p[i][1]); return L; }
function pathAt(p, d) {
  for (let i = 0; i < p.length - 1; i++) { const [x0, z0] = p[i], [x1, z1] = p[i + 1], L = Math.hypot(x1 - x0, z1 - z0); if (d <= L || i === p.length - 2) { const t = clamp(d / (L || 1), 0, 1); return [lerp(x0, x1, t), lerp(z0, z1, t), (x1 - x0) / (L || 1), (z1 - z0) / (L || 1)]; } d -= L; }
  return [p[0][0], p[0][1], 1, 0];
}
function randomLook(i) {
  const r = mulberry32(i * 7919 + 13), pick = (a) => a[Math.floor(r() * a.length)];
  const shirts = [0xf3b41b, 0xe0553a, 0x19b5b1, 0x1e9b57, 0xf6f1e7, 0x1f8fd0, 0x232a63, 0x8e3b8f, 0xff8a3d, 0x2b2b30, 0xd8cfc0, 0x7a2a4a];
  const lowers = [0x232a63, 0x2a2d33, 0xd8cfc0, 0x3b5a7a, 0x4a4a52, 0x6a5a3a];
  const skin = SKINS[Math.floor(r() * SKINS.length)];
  // about a third of town dresses in the island wardrobe the player can wear too
  if (r() < 0.34) return styledLook(i, { skin });
  if (r() < 0.45) {
    const hair = pick(['scarf', 'scarf', 'scarf', 'braids', 'braids', 'afro']), dressy = hair === 'scarf' ? r() < 0.8 : r() < 0.45;
    return { f: true, skin, hair, scarf: pick(shirts), shirt: pick(shirts), lower: pick(lowers), dress: dressy ? pick(shirts) : null, long: dressy && r() < 0.6, pants: !dressy, style: dressy && r() < 0.6 ? 'kanga' : 'tee', trim: pick(shirts), trim2: pick(shirts), longSleeve: hair === 'scarf' && r() < 0.5, sandals: r() < 0.65, shoes: pick([0x7a4a2a, 0xd8452c, 0x1d1d22, 0xf4f4f0, 0xf3b41b]), h: 0.93 + r() * 0.07 };
  }
  const old = r() < 0.18, hair = old ? pick(['kofia', 'kofia', 'bald', 'short']) : pick(['short', 'short', 'afro', 'cap', 'bald', 'kofia', 'short']);
  return { f: false, skin, hair, cap: pick(shirts), capLogo: pick(shirts), kofiaCol: pick(shirts), shirt: old ? pick([0xf6f1e7, 0xd8cfc0, 0x232a63]) : pick(shirts), lower: pick(lowers), pants: old || r() < 0.6, robe: old && r() < 0.55, beard: old ? 0xd8d4cc : (r() < 0.22 ? 0x141010 : null), style: r() < 0.35 ? 'button' : 'tee', longSleeve: r() < 0.15, sandals: old || r() < 0.4, shoes: pick([0x1d1d22, 0xf4f4f0, 0x7a4a2a, 0x2a3a5a]), shoeTrim: pick(shirts), h: 0.97 + r() * 0.08 };
}
function buildWalkers() {
  const routes = WORLD.roads.filter(r => (r.c === 'F' || r.c === 'R' || r.c === 'T')).map(r => ({ c: r.c, p: r.p.filter(([x, z]) => x > BOUNDS.x0 - 100 && x < BOUNDS.x1 + 100 && z > BOUNDS.z0 - 100) })).filter(r => r.p.length >= 2 && pathLen(r.p) > 40);
  const n = BUILD_HQ ? 44 : 18;
  for (let i = 0; i < n; i++) {
    const r = routes[Math.floor(rnd() * routes.length)], off = r.c === 'F' ? rr(-0.6, 0.6) : (ROAD[r.c].w / 2 + 1.2) * (rnd() < 0.5 ? 1 : -1);
    const h = makeHuman(randomLook(i + 3)); scene.add(h);
    walkers.push({ h, path: r.p, L: pathLen(r.p), d: rnd() * pathLen(r.p), dir: rnd() < 0.5 ? 1 : -1, sp: rr(1.2, 1.7), off, x: 0, z: 0, pause: 0 });
  }
}
/* is a person-sized circle at (x, z) inside a wall, stall, post or parked bike? */
function personBlocked(x, z, r) {
  const list = cgrid.get(ck(Math.floor(x / CELL), Math.floor(z / CELL))) || EMPTY;
  for (const c of list) {
    if (!c.on) continue;
    if (c.t === 0) { const dx = x - c.x, dz = z - c.z, u = dx * c.c + dz * c.s, v = -dx * c.s + dz * c.c; if (Math.abs(u) < c.hw + r && Math.abs(v) < c.hd + r) return true; }
    else { const dx = x - c.x, dz = z - c.z, rr2 = c.r + r; if (dx * dx + dz * dz < rr2 * rr2) return true; }
  }
  return false;
}
/* moving vehicles a pedestrian must not step in front of */
function movingVehicles() {
  const out = [];
  for (const c of cars) if (c.speed > 0.8) out.push({ x: c.x, z: c.z, yaw: c.yaw, hl: c.hl, hw: c.hw, sp: c.speed });
  if (playerVeh && Math.abs(playerVeh.vf) > 0.8) { const sp = VEH[playerVeh.kind]; out.push({ x: playerVeh.x, z: playerVeh.z, yaw: playerVeh.yaw, hl: sp.hl, hw: sp.hw, sp: Math.abs(playerVeh.vf), back: playerVeh.vf < 0 }); }
  if (typeof ORDER !== 'undefined' && ORDER.v && ORDER.v.vf > 0.8) { const sp = VEH[ORDER.kind]; out.push({ x: ORDER.v.x, z: ORDER.v.z, yaw: ORDER.v.yaw, hl: sp.hl, hw: sp.hw, sp: ORDER.v.vf }); }
  return out;
}
/* true if (x, z) is in the path a vehicle will sweep in the next couple of seconds */
function inVehiclePath(V, x, z, pad) {
  const fx = Math.sin(V.yaw), fz = Math.cos(V.yaw), dx = x - V.x, dz = z - V.z;
  if (Math.abs(dx) > 30 || Math.abs(dz) > 30) return false;
  let u = dx * fx + dz * fz; const v = dx * fz - dz * fx; if (V.back) u = -u;
  return u > -V.hl - 0.6 && u < V.hl + 2.5 + V.sp * 1.5 && Math.abs(v) < V.hw + pad;
}
function updateWalkers(dt, t) {
  const VS = movingVehicles(), near2 = (ax, az, bx, bz, r) => { const dx = ax - bx, dz = az - bz; return dx * dx + dz * dz < r * r; };
  for (const w of walkers) {
    const h = w.h;
    if (updateFall(h, dt)) continue;
    if (w.side === undefined) { w.side = 0; w.sideT = 0; w.wait = 0; w.probeT = rnd() * 0.25; }
    if (w.pause > 0) { w.pause -= dt; if (h.visible) { const a = animStep(w, w.x, w.z, dt); if (a) animHuman(h, a, t, 0, 'loco'); } continue; }
    const far = Math.abs(w.x - camera.position.x) > 260 || Math.abs(w.z - camera.position.z) > 260;
    /* traffic: wait at the kerb for a vehicle coming at us, hurry across if already in its way */
    let hurry = 1, stop = false;
    if (!far) {
      const [px, pz, pdx, pdz] = pathAt(w.path, clamp(w.d + w.dir * 1.4, 0, w.L)), sd = w.off + w.side;
      const ax = px + pdz * sd, az = pz - pdx * sd;
      for (const V of VS) {
        if (inVehiclePath(V, w.x, w.z, 0.9)) { hurry = 2.3; stop = false; break; }
        if (inVehiclePath(V, ax, az, 1.2)) stop = true;
      }
    }
    if (stop) { w.wait = 0.4; }
    if (w.wait > 0) { w.wait -= dt; if (h.visible) { const a = animStep(w, w.x, w.z, dt); if (a) animHuman(h, a, t, 0, 'loco'); } h.userData.lookAt = null; continue; }
    w.d += w.sp * hurry * w.dir * dt;
    if (w.d > w.L) { w.d = w.L; w.dir = -1; w.pause = rr(1, 4); } else if (w.d < 0) { w.d = 0; w.dir = 1; w.pause = rr(1, 4); }
    const [x, z, dx, dz] = pathAt(w.path, w.d), fx = dx * w.dir, fz = dz * w.dir;
    /* obstacles and other people: step sideways around them, a few times a second */
    w.probeT -= dt;
    if (w.probeT <= 0 && !far) {
      w.probeT = 0.25;
      const at = (sd, ahead) => [x + dz * (w.off + sd) + fx * ahead, z - dx * (w.off + sd) + fz * ahead];
      const crowd = (qx, qz) => {
        if (!playerVeh && near2(qx, qz, P.x, P.z, 0.85)) return true;
        for (const o of walkers) if (o !== w && !isDown(o.h) && near2(qx, qz, o.x, o.z, 0.75)) return true;
        return false;
      };
      const clear = (sd) => { for (const ahead of [0, 0.9, 1.8]) { const [qx, qz] = at(sd, ahead); if (!walkable(qx, qz) || personBlocked(qx, qz, 0.32) || (ahead > 0 && crowd(qx, qz))) return false; } return true; };
      if (!clear(w.sideT)) {
        const out = Math.sign(w.off) || 1, inMax = Math.abs(w.off) > 2 ? 0.5 : 2.2, cand = [];
        for (const m of [0.5, 1, 1.5, 2, 2.6]) { cand.push(w.sideT + out * m); if (m <= inMax) cand.push(w.sideT - out * m); }
        const c = cand.find(clear);
        if (c !== undefined) w.sideT = clamp(c, -3, 3); else if (!personBlocked(w.x, w.z, 0.2)) { w.wait = 0.6 + rnd() * 0.6; if (rnd() < 0.3) w.dir *= -1; }
      } else if (w.sideT !== 0 && clear(0)) w.sideT = 0;
    }
    w.side = damp(w.side, w.sideT, 3.5, dt);
    const ox = w.x, oz = w.z;
    w.x = x + dz * (w.off + w.side); w.z = z - dx * (w.off + w.side);
    h.position.set(w.x, Math.abs(w.off) > 2 && Math.abs(w.off + w.side) > Math.abs(w.off) - 0.6 ? 0.19 : 0.04, w.z);
    { const cx = w.x - camera.position.x, cz = w.z - camera.position.z; h.visible = cx * cx + cz * cz < 240 * 240; }
    const mx = w.x - ox, mz = w.z - oz;
    h.rotation.y = angDamp(h.rotation.y, mx * mx + mz * mz > 1e-6 ? Math.atan2(mx, mz) : Math.atan2(fx, fz), 8, dt);
    h.userData.lookAt = Math.abs(w.x - P.x) < 6 && Math.abs(w.z - P.z) < 6 ? playerHead : null;
    if (!far && h.visible) { const a = animStep(w, w.x, w.z, dt); if (a) animHuman(h, a, t, w.sp * hurry, 'loco'); }
  }
}

/* ---------- thieves (mwizi) ---------- */
const thieves = [];
const THIEF_HOMES = [{ x: BAR.x + 30, z: BAR.z - 25 }, { x: FZ.x + 40, z: FZ.z + 45 }, { x: MARKET.x - 20, z: MARKET.z + 40 }, { x: PARKS[1].x - 70, z: PARKS[1].z - 10 }];
function buildThieves() {
  THIEF_HOMES.forEach((home, i) => {
    const h = makeHuman({ skin: SKINS[(i + 2) % SKINS.length], shirt: 0x26272d, lower: 0x1b1c22, pants: true, longSleeve: true, hair: 'cap', cap: 0xd0281e, capLogo: 0x26272d, shoes: 0xf4f4f0, shoeTrim: 0xd0281e });
    h.position.set(home.x, 0.04, home.z); scene.add(h);
    thieves.push({ h, home, state: 'wander', x: home.x, z: home.z, tx: home.x, tz: home.z, t: 0, cool: 20 + i * 15, loot: 0, sp: 0, gone: 0, tag: null });
  });
}

