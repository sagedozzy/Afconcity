/* ===================== 66 economy: businesses that earn while you are away, vehicles you own (fuel, repairs,
   insurance), and the startup's founder salary ===================== */
/* Prices follow 2026 Zanzibar rates: a 150 cc boda about TSh 2.95 million, a bajaji about TSh 9.8 million, petrol about
   TSh 3,050 a litre. Businesses earn real time (also while the game is closed) up to a cap, so you come back to collect.
   On afconcity.com the clock is checked against the server, so changing the phone's clock does not pay out. */
const ECON = { off: 0, t: 0, emptyNag: 0 };
const realNow = () => Date.now() + ECON.off;
const BIZ = [
  { id: 'madafu', name: { en: 'Madafu stand', sw: 'Kibanda cha madafu' }, where: { en: 'Usiku food market', sw: 'Soko la usiku' }, x: 205, z: 30, price: 1200000, perHour: 25000, cap: 8 },
  { id: 'kahawa', name: { en: 'Kahawa cart', sw: 'Mkokoteni wa kahawa' }, where: { en: 'Stadium plaza', sw: 'Uwanja wa AfconCity' }, x: -975, z: -428, price: 2600000, perHour: 50000, cap: 8 },
  { id: 'bar', name: { en: "Share in Mama Pwani's beach bar", sw: 'Hisa ya baa ya Mama Pwani' }, where: { en: 'The beach', sw: 'Ufukweni' }, x: BAR.x + 6, z: BAR.z - 7, price: 9500000, perHour: 160000, cap: 10 },
  { id: 'guest', name: { en: 'Fumba guesthouse', sw: 'Nyumba ya wageni Fumba' }, where: { en: 'Fumba Town', sw: 'Mji wa Fumba' }, x: -1250, z: 110, price: 32000000, perHour: 480000, cap: 12 },
];
const bizState = () => { state.biz = state.biz && typeof state.biz === 'object' ? state.biz : {}; return state.biz; };
function bizStash(b) {
  const s = bizState()[b.id]; if (!s) return 0;
  const t = realNow(); if (t < s.at) s.at = t; // a clock moved backwards earns nothing
  return Math.floor(Math.min(b.cap, (t - s.at) / 3600000) * b.perHour);
}
const bizFullIn = (b) => { const s = bizState()[b.id]; if (!s) return 0; return Math.max(0, b.cap * 3600000 - (realNow() - s.at)); };
function buyBiz(b) {
  if (bizState()[b.id]) return;
  if (!canPay(b.price)) { help(LANG === 'sw' ? `Unahitaji ${tsh(b.price)}.` : `You need ${tsh(b.price)}.`, 2400); sfx.deny(); return; }
  spend(b.price, tl(b.name), 'spent');
  bizState()[b.id] = { at: realNow(), since: realNow() };
  sfx.win(); splash(LANG === 'sw' ? 'NI YAKO!' : 'IT IS YOURS!', LANG === 'sw' ? `${tl(b.name)} inaanza kuingiza pesa sasa` : `${tl(b.name)} starts earning now`, 'gold');
  track('biz_buy', { id: b.id }); writeSave();
}
function collectBiz(b) {
  const n = bizStash(b); if (n <= 0) { help(LANG === 'sw' ? 'Bado hakuna mapato. Rudi baadaye.' : 'Nothing to collect yet. Come back later.', 2200); return; }
  bizState()[b.id].at = realNow(); earn(n, tl(b.name)); sfx.coin(2); writeSave();
  help(LANG === 'sw' ? `Umekusanya <b class="hl">${tsh(n)}</b> kutoka ${escapeHtml(tl(b.name))}.` : `You collected <b class="hl">${tsh(n)}</b> from your ${escapeHtml(tl(b.name).toLowerCase())}.`, 3200);
}

/* ---------- vehicles you own ---------- */
const DEALER = [
  { kind: 'boda', name: { en: 'Boda boda · 150 cc', sw: 'Boda boda · cc 150' }, price: 2950000, tank: 12, lp100: 2.6, ins: 6000, rate: 3000 },
  { kind: 'bajaji', name: { en: 'Bajaji · three-wheeler', sw: 'Bajaji · magurudumu matatu' }, price: 9800000, tank: 8, lp100: 3.8, ins: 12000, rate: 6000 },
];
const DEAL_BY_KIND = Object.fromEntries(DEALER.map(d => [d.kind, d]));
const FUEL_PRICE = 3050, TOW_FEE = 40000;
const GARAGE = { x: 600, z: -132, name: 'Fumba Fuel & Fundi' };
const garage = () => { state.garage = Array.isArray(state.garage) ? state.garage : []; return state.garage; };
const ownedVehs = [];
function spawnOwned(g) {
  const kind = g.kind, v = { kind, col: g.col, sx: g.x, sz: g.z, syaw: g.yaw || 0, x: g.x, z: g.z, yaw: g.yaw || 0, vx: 0, vz: 0, vf: 0, steer: 0, hp: g.hp, rented: true, owned: true, g, stand: { name: GARAGE.name }, m: makeVehicle(kind, g.col), idle: 0, wreck: g.towed ? 1 : 0, roll: 0, lean: 0 };
  v.m.position.set(v.x, 0.04, v.z); v.m.rotation.y = v.yaw; scene.add(v.m); v.m.visible = !g.towed;
  v.col1 = addCircle(v.x, v.z, kind === 'boda' ? 0.6 : 0.9, 'veh'); v.col1.on = !g.towed;
  rentals.push(v); ownedVehs.push(v); return v;
}
function parkSpot(i) { return { x: GARAGE.x - 6 + (i % 4) * 3.2, z: GARAGE.z + 9, yaw: Math.PI }; }
function buyVehicle(d) {
  if (garage().length >= 3) { help(LANG === 'sw' ? 'Gereji yako imejaa (magari 3).' : 'Your garage is full (3 vehicles).', 2400); return; }
  if (!canPay(d.price)) { help(LANG === 'sw' ? `Unahitaji ${tsh(d.price)}.` : `You need ${tsh(d.price)}.`, 2400); sfx.deny(); return; }
  spend(d.price, tl(d.name), 'spent');
  const cols = d.kind === 'boda' ? BODA_COLS : BAJAJI_COLS, sp = parkSpot(garage().length);
  const g = { kind: d.kind, col: cols[garage().length % cols.length], fuel: d.tank, hp: 100, x: sp.x, z: sp.z, yaw: sp.yaw, at: realNow() };
  garage().push(g); spawnOwned(g); writeSave();
  sfx.win(); closePhone();
  splash(LANG === 'sw' ? 'GARI JIPYA!' : 'NEW WHEELS!', LANG === 'sw' ? `Chukua ${tl(d.name).toLowerCase()} yako ${GARAGE.name}` : `Pick up your ${tl(d.name).toLowerCase()} at ${GARAGE.name}`, 'gold');
  setWaypoint(sp.x, sp.z, GARAGE.name); track('veh_buy', { kind: d.kind });
}
function vehOnExit(v) { if (!v || !v.owned) return; Object.assign(v.g, { x: v.x, z: v.z, yaw: v.yaw, hp: v.hp, fuel: v.g.fuel }); v.sx = v.x; v.sz = v.z; v.syaw = v.yaw; writeSave(); }
function vehWrecked(v) {
  v.g.towed = 1; v.g.hp = 0; const sp = parkSpot(ownedVehs.indexOf(v)); Object.assign(v.g, sp);
  splash(LANG === 'sw' ? 'IMEHARIBIKA!' : 'WRECKED!', LANG === 'sw' ? `Imevutwa hadi ${GARAGE.name}. Ada ya kuvuta ${tsh(TOW_FEE)}.` : `Towed to ${GARAGE.name}. Tow fee ${tsh(TOW_FEE)}.`, 'bad');
  spend(Math.min(money(), TOW_FEE), 'Tow truck', 'lost'); writeSave();
}
const repairCost = (v) => Math.round((100 - v.hp) * DEAL_BY_KIND[v.kind].rate / 500) * 500;
function vehStatus(v) { const d = DEAL_BY_KIND[v.kind]; return `${LANG === 'sw' ? 'Mafuta' : 'Fuel'} ${v.g.fuel.toFixed(1)} / ${d.tank} L · ${LANG === 'sw' ? 'Hali' : 'Condition'} ${Math.round(v.g.towed ? 0 : v.hp)}%`; }
function openGarage() {
  const near = ownedVehs.filter(v => v === playerVeh || Math.hypot(v.x - GARAGE.x, v.z - GARAGE.z) < 22 || v.g.towed), items = [];
  for (const v of near) {
    const d = DEAL_BY_KIND[v.kind], need = d.tank - v.g.fuel, fc = Math.round(need * FUEL_PRICE / 50) * 50, nm = tl(d.name);
    if (need > 0.2) items.push({ label: `${LANG === 'sw' ? 'Jaza mafuta' : 'Fill up'} · ${nm}`, desc: `${need.toFixed(1)} L × ${tsh(FUEL_PRICE)}`, price: fc, act: () => { v.g.fuel = d.tank; sfx.ding(); writeSave(); } });
    const rc = v.g.towed ? Math.round(100 * d.rate / 500) * 500 : repairCost(v);
    if (rc > 0) items.push({ label: `${v.g.towed ? (LANG === 'sw' ? 'Tengeneza na urudishe' : 'Rebuild and return') : (LANG === 'sw' ? 'Tengeneza' : 'Repair')} · ${nm}`, desc: v.g.towed ? (LANG === 'sw' ? 'Ilivutwa hapa baada ya ajali' : 'Towed here after a crash') : `${LANG === 'sw' ? 'Hali' : 'Condition'} ${Math.round(v.hp)}%`, price: rc, act: () => { v.hp = 100; v.g.hp = 100; if (v.g.towed) { v.g.towed = 0; v.wreck = 0; v.m.visible = true; v.col1.on = true; v.x = v.g.x; v.z = v.g.z; v.yaw = v.g.yaw; v.m.position.set(v.x, 0.04, v.z); v.m.rotation.set(0, v.yaw, 0); moveVehCollider(v); } sfx.ding(); writeSave(); } });
    if (v !== playerVeh && !v.g.towed) items.push({ label: `${LANG === 'sw' ? 'Uza' : 'Sell'} · ${nm}`, desc: LANG === 'sw' ? 'Fundi ananunua kwa asilimia 60 ya bei' : 'The fundi buys it back for 60% of the price', price: LANG === 'sw' ? `+${tsh(Math.round(d.price * 0.6 * v.hp / 100 / 1000) * 1000)}` : `+${tsh(Math.round(d.price * 0.6 * v.hp / 100 / 1000) * 1000)}`, act: () => sellVehicle(v) });
  }
  openMenu({ eyebrow: LANG === 'sw' ? 'Mafuta na fundi' : 'Fuel and repairs', title: GARAGE.name, lede: items.length ? (LANG === 'sw' ? `Petroli ${tsh(FUEL_PRICE)} kwa lita. Leta gari lako karibu.` : `Petrol ${tsh(FUEL_PRICE)} a litre. Bring your own vehicle close.`) : (LANG === 'sw' ? 'Huna gari hapa. Nunua boda au bajaji kwenye simu (Magari).' : 'No vehicle of yours here. Buy a boda or bajaji on your phone (Magari).'), items });
}
function sellVehicle(v) {
  const d = DEAL_BY_KIND[v.kind], n = Math.round(d.price * 0.6 * v.hp / 100 / 1000) * 1000;
  earn(n, LANG === 'sw' ? 'Mauzo ya gari' : 'Vehicle sold');
  scene.remove(v.m); v.col1.on = false; rentals.splice(rentals.indexOf(v), 1); ownedVehs.splice(ownedVehs.indexOf(v), 1); garage().splice(garage().indexOf(v.g), 1);
  writeSave();
}
function garageInteraction() { return Math.hypot(GARAGE.x - P.x, GARAGE.z - (P.z)) < (playerVeh ? 9 : 6) ? { text: LANG === 'sw' ? `${GARAGE.name} · mafuta na fundi` : `${GARAGE.name} · fuel and repairs`, act: openGarage } : null; }
function bizInteraction() {
  for (const b of BIZ) {
    if (Math.hypot(b.x - P.x, b.z - P.z) > 3.5) continue;
    if (!bizState()[b.id]) return state.done ? { text: `${LANG === 'sw' ? 'Nunua' : 'Buy the'} ${tl(b.name).toLowerCase()} · ${tsh(b.price)}`, act: () => buyBiz(b) } : null;
    const n = bizStash(b); return { text: n > 0 ? `${LANG === 'sw' ? 'Kusanya' : 'Collect'} ${tsh(n)}` : `${tl(b.name)} · ${LANG === 'sw' ? 'inaingiza pesa' : 'earning'}`, act: () => collectBiz(b) };
  }
  return null;
}
function buildEconomyPlaces() {
  const g = new T.Group(), G2 = GARAGE;
  const shop = meshOf(new T.BoxGeometry(10, 4, 6), new T.MeshStandardMaterial({ color: C(0xe9e4da), roughness: 0.85 }), true); shop.position.set(G2.x, 2, G2.z - 4); g.add(shop);
  const canopy = meshOf(new T.BoxGeometry(12, 0.4, 7), new T.MeshStandardMaterial({ color: C(0x1e9b57), roughness: 0.6 }), true); canopy.position.set(G2.x, 4.6, G2.z + 3.5); g.add(canopy);
  for (const s of [-1, 1]) { const col = meshOf(new T.CylinderGeometry(0.18, 0.18, 4.4, 8), M(0xd8dce2), true); col.position.set(G2.x + s * 5, 2.2, G2.z + 5.5); g.add(col); }
  for (const s of [-1, 1]) { const pump = meshOf(roundedBox(0.8, 1.6, 0.5, 0.08, 1), new T.MeshStandardMaterial({ color: C(0xf3b41b), roughness: 0.5 }), true); pump.position.set(G2.x + s * 2, 0.8, G2.z + 3.5); g.add(pump); }
  const sign = signMesh('FUMBA FUEL & FUNDI', 9, 1, { bg: '#141838' }); sign.position.set(G2.x, 4.6, G2.z + 7.02); g.add(sign);
  scene.add(g); addObb(G2.x, G2.z - 4, 10, 6, 0);
  for (const s of [-1, 1]) addCircle(G2.x + s * 2, G2.z + 3.5, 0.5, 'small');
  // business spots: a little stall or sign at each (the bar and guesthouse use a sign board)
  for (const b of BIZ) {
    const bg = new T.Group(); bg.position.set(b.x, 0, b.z);
    if (b.id === 'madafu' || b.id === 'kahawa') {
      bg.add(at(meshOf(roundedBox(1.6, 0.9, 0.8, 0.06, 1), new T.MeshStandardMaterial({ color: C(b.id === 'madafu' ? 0x2e7d3a : 0x7a3b1e), roughness: 0.7 }), true), 0, 0.45, 0));
      bg.add(at(meshOf(new T.BoxGeometry(1.9, 0.06, 1.1), new T.MeshStandardMaterial({ color: C(0xf3b41b), roughness: 0.6 }), true), 0, 1.9, 0));
      for (const s of [-1, 1]) bg.add(at(meshOf(new T.CylinderGeometry(0.03, 0.03, 1.0, 6), M(0xd8dce2), true), s * 0.85, 1.4, 0.45));
      if (b.id === 'madafu') for (let i = 0; i < 5; i++) bg.add(at(meshOf(new T.SphereGeometry(0.14, 8, 6), new T.MeshStandardMaterial({ color: C(0x5a8a2a), roughness: 0.8 }), true), -0.5 + i * 0.25, 0.98, 0));
      addCircle(b.x, b.z, 0.9, 'small');
    }
    const sg = signMesh(tl(b.name).toUpperCase(), 3.4, 0.6, { bg: '#232a63' }); sg.position.set(0, b.id === 'madafu' || b.id === 'kahawa' ? 2.3 : 2.4, 0.56); bg.add(sg);
    if (b.id === 'bar' || b.id === 'guest') { bg.add(at(meshOf(new T.CylinderGeometry(0.05, 0.05, 2.4, 6), M(0x5a3620), true), 0, 1.2, 0.5)); }
    scene.add(bg);
  }
}

/* ---------- the startup: a company account that pays a founder salary each game day ---------- */
const STARTUP = { salary: 50000, burn: 85000, revBase: 12000 };
function startupDay() {
  const st = state.startup; if (!st || st.paidDay === undefined) return;
  const d = clockDay(); if (d <= st.paidDay) return;
  const days = Math.min(7, d - st.paidDay); st.paidDay = d;
  for (let i = 0; i < days; i++) {
    st.age = (st.age || 0) + 1;
    const rev = Math.round(STARTUP.revBase * (1 + (st.score || 0)) * (1 + st.age * 0.04) / 500) * 500;
    st.cash += rev - STARTUP.burn; st.rev = rev;
    if (st.cash >= STARTUP.salary) { st.cash -= STARTUP.salary; state.bank = (state.bank || 0) + STARTUP.salary; state.stats.earned += STARTUP.salary; moneyDelta(STARTUP.salary, `${st.name} salary · Pesa`); }
    else if (!st.broke) { st.broke = 1; phoneMsg('zuri', LANG === 'sw' ? 'Habari mbaya: akaunti ya kampuni karibu kuisha. Tunahitaji mzunguko mwingine wa uwekezaji hivi karibuni.' : 'Bad news: the company account is nearly empty. We need another funding round soon.'); }
  }
  writeSave();
}
const runwayDays = () => { const st = state.startup; if (!st) return 0; const net = STARTUP.burn + STARTUP.salary - (st.rev || STARTUP.revBase * (1 + (st.score || 0))); return net > 0 ? Math.floor(st.cash / net) : 999; };

/* ---------- weekly insurance on owned vehicles (charged with the rent day) ---------- */
function insuranceWeek() {
  const wk = Math.floor(clockDay() / 7); if (state.insWk === undefined) { state.insWk = wk; return; }
  if (wk <= state.insWk) return; state.insWk = wk;
  let n = 0; for (const v of ownedVehs) n += DEAL_BY_KIND[v.kind].ins;
  if (n > 0) { spend(Math.min(money(), n), LANG === 'sw' ? 'Bima ya magari' : 'Vehicle insurance', 'spent'); phoneMsg('pesa', LANG === 'sw' ? `Bima ya wiki ya magari yako: ${tsh(n)}.` : `Weekly insurance for your vehicles: ${tsh(n)}.`); }
}

/* ---------- every frame ---------- */
function updateEconomy(dt) {
  // fuel: the owned vehicle you drive burns petrol by distance; an empty tank only crawls
  const v = playerVeh;
  if (v && v.owned && mode === 'play') {
    const d = DEAL_BY_KIND[v.kind];
    v.g.fuel = Math.max(0, v.g.fuel - Math.abs(v.vf) * dt * d.lp100 / 100000);
    if (v.g.fuel <= 0) {
      const sp = Math.hypot(v.vx, v.vz); if (sp > 2.2) { v.vx *= 2.2 / sp; v.vz *= 2.2 / sp; }
      if (now() - ECON.emptyNag > 20) { ECON.emptyNag = now(); help(LANG === 'sw' ? `Mafuta yamekwisha! Sukuma hadi <b class="hl">${GARAGE.name}</b>.` : `Out of fuel! Push it to <b class="hl">${GARAGE.name}</b>.`, 4000); }
    }
  }
  ECON.t += dt; if (ECON.t < 1) return; ECON.t = 0;
  if (mode === 'play') { startupDay(); insuranceWeek(); }
}
/* the owned vehicles on the map always match the save (a new game, or a save loaded from another phone) */
function resyncOwned() {
  for (const v of ownedVehs.splice(0)) { scene.remove(v.m); v.col1.on = false; const i = rentals.indexOf(v); if (i >= 0) rentals.splice(i, 1); }
  for (const g of garage()) spawnOwned(g);
}
function initEconomy() {
  buildEconomyPlaces();
  resyncOwned();
  APPS.splice(4, 0, { id: 'biz', sw: 'Biashara', en: 'Business', col: '#b8650a', ico: 'bag' }, { id: 'garage', sw: 'Magari', en: 'Vehicles', col: '#2b5db8', ico: 'moto' });
  // on afconcity.com: the server's clock, so business earnings cannot be fast-forwarded on the phone
  if (MP.web && typeof SB_CFG !== 'undefined') {
    fetch(SB_CFG.url + '/auth/v1/health', { headers: { apikey: SB_CFG.key }, cache: 'no-store' }).then(r => { const d = Date.parse(r.headers.get('date') || ''); if (isFinite(d)) ECON.off = d - Date.now(); }).catch(() => {});
  }
}
/* ---------- phone apps ---------- */
Object.assign(PHONE_APPS, {
  biz: (s) => {
    phHead(s, 'Biashara', LANG === 'sw' ? 'Biashara zako' : 'Your businesses');
    const st = state.startup;
    if (st) {
      const c = phEl('div', 'ph-card'); c.append(phEl('small', '', LANG === 'sw' ? 'Kampuni yako' : 'Your company'), phEl('b', '', `${st.name} · ${st.stake}%`));
      c.append(phEl('p', 'ph-note', LANG === 'sw' ? `Akaunti ya kampuni ${tsh(st.cash)} · mshahara ${tsh(STARTUP.salary)} kwa siku · siku ${runwayDays()} zimebaki` : `Company account ${tsh(st.cash)} · salary ${tsh(STARTUP.salary)} a day · ${runwayDays()} days of runway`));
      s.append(c);
    }
    for (const b of BIZ) {
      const own = bizState()[b.id], d = Math.hypot(b.x - P.x, b.z - P.z), dist = d > 950 ? (d / 1000).toFixed(1) + ' km' : Math.round(d) + ' m';
      const sub = own ? `${LANG === 'sw' ? 'Ya kukusanya' : 'Ready'} ${tsh(bizStash(b))} · ${bizFullIn(b) > 0 ? (LANG === 'sw' ? `itajaa baada ya saa ${(bizFullIn(b) / 3600000).toFixed(1)}` : `full in ${(bizFullIn(b) / 3600000).toFixed(1)} h`) : (LANG === 'sw' ? 'imejaa: kusanya!' : 'full: collect it!')} · ${dist}`
        : `${tsh(b.price)} · ${LANG === 'sw' ? 'inaingiza' : 'earns'} ${tsh(b.perHour)}/${LANG === 'sw' ? 'saa' : 'h'} · ${tl(b.where)} · ${dist}`;
      phRow(s, tl(b.name), sub, phBtn('GPS', 'ph-btn sm', () => setWaypoint(b.x, b.z, tl(b.name))));
    }
    s.append(phEl('p', 'ph-note', state.done ? (LANG === 'sw' ? 'Biashara zinaingiza pesa hata mchezo ukiwa umefungwa, hadi zijae. Nenda pale kukusanya.' : 'Businesses earn even while the game is closed, until they are full. Go there to collect.') : (LANG === 'sw' ? 'Biashara zinafunguliwa baada ya kuona mechi ya AFCON.' : 'Businesses open up after you watch the AFCON match.')));
  },
  garage: (s) => {
    phHead(s, 'Magari', LANG === 'sw' ? 'Magari yako' : 'Your vehicles');
    if (!ownedVehs.length) s.append(phEl('p', 'ph-note', LANG === 'sw' ? 'Bado huna gari. Kukodisha ni kwa siku; ukinunua ni lako, unalipia mafuta, matengenezo na bima.' : 'No vehicle yet. Hiring is by the day; buy one and it is yours. You pay for fuel, repairs and insurance.'));
    for (const v of ownedVehs) phRow(s, tl(DEAL_BY_KIND[v.kind].name), v.g.towed ? (LANG === 'sw' ? `Iko ${GARAGE.name}: inahitaji matengenezo` : `At ${GARAGE.name}: needs a rebuild`) : vehStatus(v), phBtn('GPS', 'ph-btn sm', () => setWaypoint(v.g.towed ? GARAGE.x : v.x, v.g.towed ? GARAGE.z : v.z, tl(DEAL_BY_KIND[v.kind].name))));
    s.append(phEl('p', 'ph-sec', LANG === 'sw' ? 'Nunua · inachukuliwa ' + GARAGE.name : 'Buy · pick up at ' + GARAGE.name));
    for (const d of DEALER) phRow(s, tl(d.name), `${tsh(d.price)} · ${d.tank} L · ${LANG === 'sw' ? 'bima' : 'insurance'} ${tsh(d.ins)}/${LANG === 'sw' ? 'wiki' : 'week'}`, phBtn(LANG === 'sw' ? 'Nunua' : 'Buy', 'ph-btn sm', () => buyVehicle(d)));
    s.append(phEl('p', 'ph-note', LANG === 'sw' ? `Petroli ${tsh(FUEL_PRICE)} kwa lita. Ajali ikiharibu gari lako, linavutwa ${GARAGE.name} (${tsh(TOW_FEE)}).` : `Petrol ${tsh(FUEL_PRICE)} a litre. If a crash wrecks your vehicle, it is towed to ${GARAGE.name} (${tsh(TOW_FEE)}).`));
  },
});
