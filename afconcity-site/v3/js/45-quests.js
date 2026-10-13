/* ===================== 45 quests: the Fan Passport, Zanzibar experiences, day jobs, daladala rides and boat trips ===================== */
const STAMPS = [
  { id: 'karibu', sw: 'Karibu Fumba', en: 'Meet Amina at the Uptown Gate daladala stop', req: true, at: () => NPC_BY_ID.amina },
  { id: 'daladala', sw: 'Panda daladala', en: `Ride a daladala along Fumba Road (TSh 700)`, req: true, at: () => nearestStop() },
  { id: 'chakula', sw: 'Chakula cha usiku', en: 'Eat a Zanzibar pizza and drink fresh miwa at the Usiku food market', req: true, at: () => NPC_BY_ID.ashura },
  { id: 'kiswahili', sw: 'Jifunze Kiswahili', en: 'Learn the greetings with Bibi Mwanaidi at the Fan Zone', req: true, at: () => NPC_BY_ID.bibi },
  { id: 'kanga', sw: 'Kanga na hina', en: 'Buy a kanga and get henna from Bi Rukia (TSh 30,000)', req: true, at: () => NPC_BY_ID.rukia },
  { id: 'viungo', sw: 'Ziara ya viungo', en: 'Spice farm tour with Mzee Hamisi: find five spices (TSh 50,000)', req: true, at: () => NPC_BY_ID.hamisi },
  { id: 'mwani', sw: 'Shamba la mwani', en: 'Harvest 40 kg of seaweed at low tide for Bi Mwanaisha', req: true, at: () => NPC_BY_ID.mwanaisha },
  { id: 'jahazi', sw: 'Jahazi la machweo', en: 'Sunset dhow cruise from Fumba pier (TSh 65,000)', req: true, at: () => NPC_BY_ID.nahodha },
  { id: 'kandanda', sw: 'Kandanda', en: 'Win a penalty shootout bet with Coach Baraka', req: true, at: () => NPC_BY_ID.baraka },
  { id: 'kujitolea', sw: 'Kujitolea AFCON', en: 'Work a volunteer shift for Neema at the stadium plaza', req: true, at: () => NPC_BY_ID.neema },
  { id: 'kesho', sw: 'Fumba ya kesho', en: "Visit five of tomorrow's Fumba projects (yellow boards)", req: true, at: () => nearestProject() },
  { id: 'safari', sw: 'Ghuba ya Menai', en: 'Menai Bay sandbank safari by dhow (TSh 227,000)', req: false, at: () => NPC_BY_ID.nahodha },
  { id: 'gereza', sw: 'Kisiwa cha Gereza', en: 'Prison Island giant tortoises (TSh 53,000)', req: false, at: () => NPC_BY_ID.nahodha },
  { id: 'jozani', sw: 'Msitu wa Jozani', en: 'Jozani forest red colobus day trip (TSh 39,000)', req: false, at: () => nearestStop() },
  { id: 'mjimkongwe', sw: 'Mji Mkongwe', en: 'Stone Town walking tour (TSh 30,000)', req: false, at: () => nearestStop() },
];
const STAMP_BY_ID = Object.fromEntries(STAMPS.map(s => [s.id, s]));
const REQUIRED = STAMPS.filter(s => s.req);
const hasStamp = id => !!(state.stamps && state.stamps[id]);
const stampCount = () => REQUIRED.filter(s => hasStamp(s.id)).length;
const passportFull = () => stampCount() >= REQUIRED.length;
function giveStamp(id) {
  if (hasStamp(id)) return false;
  state.stamps[id] = Date.now(); mpDirty = true;
  const st = STAMP_BY_ID[id], n = stampCount();
  setTimeout(() => {
    splash('MUHURI!', st.req ? `${st.sw} · ${n} of ${REQUIRED.length} passport stamps` : `${st.sw} · bonus stamp`, 'gold'); sfx.win();
    if (st.req && passportFull()) setTimeout(() => help(`Your Fan Passport is full! Bring <b class="hg">${tsh(PRICES.vip)}</b> to Salim at the AfconCity kiosk for your VIP ticket.`, 8000), 2700);
  }, 900);
  mpEvent(`stamped ${st.sw} in their Fan Passport`);
  writeSave();
  return true;
}
function nearestStop() { let best = STOPS[0], bd = 1e9; for (const s of STOPS) { const d = Math.hypot(s.x - P.x, s.z - P.z); if (d < bd) { bd = d; best = s; } } return best; }
function nearestProject() { let best = null, bd = 1e9; for (const p of PROJECTS) { if (state.seen[p.id]) continue; const d = Math.hypot(p.x - P.x, p.z - P.z); if (d < bd) { bd = d; best = p; } } return best || PROJECTS[0]; }
/* where to go next for the passport: the closest experience still to do */
function nextStamp() {
  if (!state.intro) return STAMP_BY_ID.karibu;
  let best = null, bd = 1e9;
  for (const s of REQUIRED) { if (hasStamp(s.id)) continue; const p = s.at(); if (!p) continue; const d = Math.hypot(p.x - P.x, p.z - P.z); if (d < bd) { bd = d; best = s; } }
  return best;
}

/* ---------- markers: gold diamonds over things to find ---------- */
let markMesh = null, markBeam = null;
const markO3 = new T.Object3D();
function buildMarkers() {
  markMesh = new T.InstancedMesh(new T.OctahedronGeometry(0.42, 0), new T.MeshStandardMaterial({ color: C(0xffc845), emissive: C(0x8a5a00), emissiveIntensity: 0.8, metalness: 0.6, roughness: 0.3 }), 40);
  markBeam = new T.InstancedMesh(new T.CylinderGeometry(0.25, 0.25, 24, 8, 1, true), new T.MeshBasicMaterial({ color: 0xffe08a, transparent: true, opacity: 0.2, depthWrite: false, blending: T.AdditiveBlending, side: T.DoubleSide }), 40);
  for (const m of [markMesh, markBeam]) { m.count = 0; m.frustumCulled = false; m.instanceMatrix.setUsage(T.DynamicDrawUsage); scene.add(m); }
}
function drawMarkers(list, t) {
  let n = 0;
  for (const p of list) {
    if (n >= 40) break;
    markO3.position.set(p.x, (p.y || 2.2) + Math.sin(t * 2.2 + p.x) * 0.15, p.z); markO3.rotation.set(0, t * 1.6, 0); markO3.scale.setScalar(p.s || 1); markO3.updateMatrix(); markMesh.setMatrixAt(n, markO3.matrix);
    markO3.position.set(p.x, 12, p.z); markO3.rotation.set(0, 0, 0); markO3.scale.setScalar(1); markO3.updateMatrix(); markBeam.setMatrixAt(n, markO3.matrix);
    n++;
  }
  markMesh.count = n; markBeam.count = n; markMesh.instanceMatrix.needsUpdate = true; markBeam.instanceMatrix.needsUpdate = true;
}
/* props: seaweed bundles on the flats, litter on the plaza, what you carry */
let weedMesh = null, litterMesh = null, carryProp = null;
function buildQuestProps() {
  buildMarkers();
  weedMesh = new T.InstancedMesh(new T.IcosahedronGeometry(0.45, 1), new T.MeshStandardMaterial({ color: C(0x8a8a2a), roughness: 0.55 }), SEAWEED.length || 1);
  weedMesh.castShadow = true; weedMesh.frustumCulled = false; scene.add(weedMesh);
  litterMesh = new T.InstancedMesh(new T.CylinderGeometry(0.09, 0.09, 0.36, 8), new T.MeshStandardMaterial({ color: C(0x7fd0e8), roughness: 0.15, metalness: 0.1, transparent: true, opacity: 0.85 }), 16);
  litterMesh.count = 0; litterMesh.frustumCulled = false; scene.add(litterMesh);
}
function setCarry(kind) {
  if (carryProp) { carryProp.parent && carryProp.parent.remove(carryProp); carryProp = null; }
  if (player) player.userData.carry = kind || '';
  if (!kind || !player) return;
  const head = player.userData.b.head;
  if (kind === 'weed') { carryProp = new T.Mesh(new T.IcosahedronGeometry(0.28, 1), new T.MeshStandardMaterial({ color: C(0x8a8a2a), roughness: 0.6 })); carryProp.scale.set(1.3, 0.7, 1.1); carryProp.position.set(0, 0.4, 0); head.add(carryProp); }
  else if (kind === 'bag') { carryProp = meshOf(roundedBox(0.5, 0.18, 0.34, 0.06, 1), M(0xd8d0c0), true); carryProp.position.set(0, 0.32, 0); head.add(carryProp); }
  else if (kind === 'crate') { carryProp = meshOf(box(0.6, 0.38, 0.44), M(0xb8864a), true); const tom = meshOf(box(0.54, 0.08, 0.38), M(0xd8452c)); tom.position.y = 0.22; carryProp.add(tom); carryProp.position.set(0, 0.36, 0); head.add(carryProp); }
  else if (kind === 'coco') { carryProp = new T.Mesh(new T.CylinderGeometry(0.26, 0.22, 0.24, 12), M(0x8a5a2a)); carryProp.position.set(0, 0.34, 0); head.add(carryProp); }
}
function syncCarry() {
  const want = job && job.type === 'seaweed' && job.carry.length ? 'weed' : job && job.type === 'site' && job.bag ? 'bag' : job && job.type === 'porter' && job.crate ? 'crate' : state.coconuts > 0 ? 'coco' : '';
  const have = carryProp && player && carryProp.parent === player.userData.b.head ? carryProp.userData.kind : '';
  if (want !== have) { setCarry(want); if (carryProp) carryProp.userData.kind = want; }
}
function openNahodha() {
  const n = (state.fish || []).length, val = fishValue();
  const items = [
    { label: 'Sunset dhow cruise', desc: 'Two hours on the bay at sunset', price: PRICES.dhow, act: () => startCruise('jahazi') },
    { label: 'Menai Bay sandbank safari', desc: 'Full day: snorkelling, sandbank swim, seafood lunch', price: PRICES.safari, act: () => startCruise('safari') },
    { label: 'Prison Island trip', desc: 'Giant tortoises off Stone Town: boat and entry', price: PRICES.prison, act: () => dayTrip('gereza') },
  ];
  if (n) items.unshift({ label: `Sell your catch · ${n} fish`, desc: 'He takes it to the fish market at Malindi', price: 'Earn', act: () => { const v = fishValue(); state.fish = []; earn(v, 'Fish sold'); sfx.win(); state.stats.jobs++; help(`Sold for <b class="hg">${tsh(v)}</b>. "Samaki wazuri!"`, 3000); } });
  if (!state.gear.line) items.push({ label: 'Mshipi: handline and 10 bait', desc: 'Fish off the end of the pier. Cash only', price: PRICES.fishKit, act: () => { state.gear.line = true; state.gear.bait += 10; help('Walk to the end of the pier and press <kbd>E</kbd> to fish.', 4000); } });
  else items.push({ label: 'Dagaa bait, 10 pieces', desc: `You have ${state.gear.bait}`, price: PRICES.bait, act: () => { state.gear.bait += 10; } });
  openMenu({ eyebrow: 'Fumba pier · boats and fishing', title: 'Nahodha Salum', lede: n ? `Nice catch! ${n} fish in your cool box, worth about ${tsh(val)} at the market.` : 'My jahazi leaves from the end of the pier. Menai Bay is calm today, and the fish are biting off the pier.', items });
}

/* ---------- daladala: TSh 700 to any stop on Fumba Road ---------- */
function stopNear(maxD) { for (const s of STOPS) if (Math.hypot(s.x - P.x, s.z - P.z) < maxD) return s; return null; }
function openStop(s) {
  const items = STOPS.filter(o => o !== s).map(o => { const d = Math.hypot(o.x - s.x, o.z - s.z); return { label: o.name, desc: `${(d / 1000).toFixed(1)} km · about ${Math.max(2, Math.round(d / 220))} min`, price: PRICES.daladala, act: () => rideDaladala(s, o) }; });
  items.push({ label: 'Day trip: Jozani forest', desc: 'Red colobus monkeys, mangroves. Daladala and entry included', price: PRICES.jozani, act: () => dayTrip('jozani') });
  items.push({ label: 'Day trip: Stone Town', desc: 'Walking tour with a guide, Forodhani gardens at dusk', price: PRICES.stonetown, act: () => dayTrip('mjimkongwe') });
  openMenu({ eyebrow: 'Daladala stop · cash fares', title: s.name, lede: `The konda (conductor) shouts the route. Every stop on Fumba Road is ${tsh(PRICES.daladala)} in cash, the real 2026 fare.`, items, cash: true });
}
function rideDaladala(from, to) {
  if (playerVeh) exitVehicle(true);
  if (job && job.type !== 'spice' && job.type !== 'seaweed') failJobSilently();
  sfx.horn(0);
  travel({ eyebrow: 'Daladala · TSh 700', title: to.name.toUpperCase(), sub: `${from.name} → ${to.name}`, facts: [pick(['Daladalas are shared minibuses, named after the old fare: a dollar.', 'Passengers squeeze in; the konda collects fares and bangs the roof to stop.', 'Most daladalas carry a painted slogan or a football hero on the back.']), 'Fares are set by distance. Fumba to town is about TSh 1,000.'], ms: 3200, from, to }, () => {
    P.x = to.x; P.z = to.z; player.position.set(P.x, 0.19, P.z); player.rotation.y = Math.atan2(-Math.sin(to.ry), -Math.cos(to.ry)); cam.yaw = player.rotation.y + Math.PI; speed = 0;
    addMinutes(Math.max(4, Math.round(Math.hypot(to.x - from.x, to.z - from.z) / 220) + 4));
    giveStamp('daladala');
  });
}
const DAYTRIPS = {
  jozani: { title: 'JOZANI FOREST', sub: 'Jozani Chwaka Bay National Park', price: 'jozani', facts: ['The Zanzibar red colobus lives only on Zanzibar. Locals call them kima punju.', 'A boardwalk runs through the mangroves, where crabs climb the roots.', 'Your guide asks you to stand three metres from the monkeys.'] },
  mjimkongwe: { title: 'STONE TOWN', sub: 'Mji Mkongwe · UNESCO World Heritage', price: 'stonetown', facts: ['Stone Town is famous for its carved wooden doors, some brass-studded.', 'Freddie Mercury was born here in 1946.', 'At dusk the Forodhani gardens fill with grills: Zanzibar pizza, mishkaki, sugarcane juice.'] },
  gereza: { title: 'PRISON ISLAND', sub: 'Changuu · by boat from Stone Town', price: 'prison', facts: ['Giant Aldabra tortoises, some over 100 years old, live in a sanctuary here.', 'The prison was built in the 1890s but never used; it became a quarantine station.', 'You snorkel on the reef before the boat back.'] },
};
function dayTrip(id) {
  const d = DAYTRIPS[id];
  if (playerVeh) exitVehicle(true);
  failJobSilently();
  travel({ eyebrow: `Day trip · ${tsh(PRICES[d.price])}`, title: d.title, sub: d.sub, facts: d.facts, ms: 7600 }, () => { state.hp = 100; addMinutes(8 * 60); rest(-15); giveStamp(id); help(`You are back in Fumba at ${clockText()}, tired and full of stories.`, 3500); });
}

/* ---------- travel card (daladala rides, day trips) ---------- */
function travel(cfg, done) {
  closeMenu(); mode = 'travel'; ui.hud.hidden = true; ui.tags.hidden = true;
  $('#tvEyebrow').textContent = cfg.eyebrow; $('#tvTitle').textContent = cfg.title; $('#tvSub').textContent = cfg.sub || '';
  const ul = $('#tvFacts'); ul.innerHTML = ''; for (const f of cfg.facts || []) { const li = document.createElement('li'); li.textContent = f; ul.append(li); }
  const cv = $('#tvMap'); cv.hidden = !cfg.from;
  $('#travel').hidden = false;
  const t0 = performance.now();
  const tick = () => {
    const k = clamp((performance.now() - t0) / cfg.ms, 0, 1);
    $('#tvBar').style.width = `${(k * 100).toFixed(1)}%`;
    if (cfg.from) drawRoute(cv, cfg.from, cfg.to, k);
    if (k < 1) { requestAnimationFrame(tick); return; }
    $('#travel').hidden = true; ui.hud.hidden = false; ui.tags.hidden = false; mode = 'play';
    try { done(); } catch (e) { console.error(e); }
    canvas.focus();
  };
  requestAnimationFrame(tick);
}
function drawRoute(cv, a, b, k) {
  const c = cv.getContext('2d'), W = cv.width, H = cv.height;
  const x0 = Math.min(a.x, b.x) - 160, x1 = Math.max(a.x, b.x) + 160, zc = (a.z + b.z) / 2, s = Math.min(W / (x1 - x0), H / Math.max(300, Math.abs(a.z - b.z) + 220));
  const X = x => W / 2 + (x - (x0 + x1) / 2) * s, Z = z => H / 2 + (z - zc) * s;
  c.fillStyle = '#1b7c93'; c.fillRect(0, 0, W, H);
  c.save(); c.translate(X(MAP.x0), Z(MAP.z0)); c.scale(s / MAP.k, s / MAP.k); c.drawImage(mapCanvas, 0, 0); c.restore();
  c.lineWidth = 5; c.strokeStyle = '#f3b41b'; c.setLineDash([10, 8]); c.beginPath(); c.moveTo(X(a.x), Z(a.z)); c.lineTo(X(b.x), Z(b.z)); c.stroke(); c.setLineDash([]);
  for (const p of [a, b]) { c.beginPath(); c.arc(X(p.x), Z(p.z), 9, 0, TAU); c.fillStyle = '#1e9b57'; c.fill(); c.lineWidth = 3; c.strokeStyle = '#f7ead0'; c.stroke(); }
  const px = lerp(a.x, b.x, smooth(k)), pz = lerp(a.z, b.z, smooth(k));
  c.save(); c.translate(X(px), Z(pz)); c.fillStyle = '#f3b41b'; rrect(c, -16, -9, 32, 18, 5); c.fill(); c.fillStyle = '#141838'; c.fillRect(-11, -5, 22, 6); c.restore();
}

/* ---------- boat trips: a cinematic dhow ride from the pier ---------- */
const CINE = { on: false, t: 0, dur: 1, curve: null, caps: [], onEnd: null, boat: null, dolphins: [], prevNight: 0 };
let sandbank = null;
function buildBoatTrips() {
  // the Menai Bay sandbank lies offshore, visible from the beach
  const c0 = coastZ(PIER.x);
  sandbank = { x: PIER.x - 260, z: c0 + 330 };
  const g = new T.Mesh(new T.CircleGeometry(1, 40), new T.MeshStandardMaterial({ map: TEX.sand, color: C(0xf2e2bc), roughness: 0.95 }));
  g.rotation.x = -Math.PI / 2; g.scale.set(70, 24, 1); g.position.set(sandbank.x, 0.02, sandbank.z); g.receiveShadow = true; scene.add(g);
  const g2 = new T.Mesh(new T.CircleGeometry(1, 40), new T.MeshStandardMaterial({ color: C(0x5fe0d2), transparent: true, opacity: 0.55, roughness: 0.1 }));
  g2.rotation.x = -Math.PI / 2; g2.scale.set(95, 40, 1); g2.position.set(sandbank.x, -0.12, sandbank.z); scene.add(g2);
  for (let i = 0; i < 3; i++) parasol(sandbank.x - 20 + i * 18, sandbank.z - 3 + (i % 2) * 6, [0x19b5b1, 0xf3b41b, 0xe0553a][i], false);
  // dolphins for the cruise
  const dm = new T.MeshStandardMaterial({ color: C(0x5a6a78), roughness: 0.35, metalness: 0.1 });
  for (let i = 0; i < 3; i++) {
    const d = new T.Group(), body = new T.Mesh(new T.SphereGeometry(0.5, 14, 10), dm); body.scale.set(0.7, 0.6, 2.4); d.add(body);
    const fin = new T.Mesh(new T.ConeGeometry(0.22, 0.6, 6), dm); fin.position.set(0, 0.42, -0.2); fin.rotation.x = -0.5; d.add(fin);
    const tail = new T.Mesh(new T.BoxGeometry(0.9, 0.06, 0.3), dm); tail.position.set(0, 0, -1.25); d.add(tail);
    d.visible = false; d.userData.dynamic = true; scene.add(d); CINE.dolphins.push(d);
  }
}
const CRUISES = {
  jahazi: { stamp: 'jahazi', price: 'dhow', dur: 26, dusk: true, caps: [[0, 'Nahodha Salum casts off. The lateen sail fills with the evening breeze.'], [6, 'Dhows like this one have sailed the Swahili coast on the monsoon winds for centuries.'], [12, 'Pomboo! Dolphins play in Menai Bay, a protected marine area.'], [19, 'The sun sinks into the Indian Ocean behind Fumba. Hakuna matata.']] },
  safari: { stamp: 'safari', price: 'safari', dur: 30, dusk: false, caps: [[0, 'A full day in Menai Bay: snorkelling, a sandbank swim and a seafood feast.'], [7, 'Snorkel over the coral at Kwale: parrotfish, starfish, a turtle if you are lucky.'], [14, 'Lunch on the sandbank: grilled lobster, octopus curry, fresh fruit.'], [22, 'On Kwale island the guide shows you a baobab tree hundreds of years old.']] },
};
function startCruise(id) {
  const cr = CRUISES[id];
  if (playerVeh) exitVehicle(true);
  failJobSilently();
  const z1 = PIER.z1, bx = PIER.x + 4.6, sb = sandbank;
  const pts = id === 'safari'
    ? [[bx, z1 - 8], [bx + 30, z1 + 90], [sb.x + 120, sb.z - 10], [sb.x + 40, sb.z + 40], [sb.x - 40, sb.z + 30], [sb.x - 90, sb.z - 40], [bx - 40, z1 + 60], [bx, z1 - 8]]
    : [[bx, z1 - 8], [bx + 20, z1 + 80], [bx - 60, z1 + 220], [bx - 260, z1 + 230], [bx - 320, z1 + 110], [bx - 120, z1 + 40], [bx, z1 - 8]];
  CINE.curve = new T.CatmullRomCurve3(pts.map(([x, z]) => new T.Vector3(x, 0, z)), true, 'centripetal');
  CINE.boat = PIER.boat; CINE.t = 0; CINE.dur = cr.dur; CINE.caps = cr.caps; CINE.cap = -1; CINE.id = id; CINE.dusk = cr.dusk;
  CINE.prevNight = nightTarget;
  CINE.onEnd = () => { giveStamp(cr.stamp); state.hp = 100; };
  mode = 'cine'; CINE.on = true; ui.hud.hidden = true; ui.tags.hidden = true; $('#cine').hidden = false;
  CINE.boat.add(player); player.position.set(0, 0.62, -1.2); player.rotation.set(0, 0, 0); speed = 0;
  if (cr.dusk) { nightTarget = 0.62; }
  sfx.horn(0);
}
function updateCine(dt, t) {
  CINE.t += dt;
  const k = clamp(CINE.t / CINE.dur, 0, 1), u = k, p = CINE.curve.getPointAt(u), tg = CINE.curve.getTangentAt(u);
  const b = CINE.boat; b.position.set(p.x, -0.1 + Math.sin(t * 1.3) * 0.12, p.z); b.rotation.set(0, Math.atan2(tg.x, tg.z), Math.sin(t * 0.9) * 0.06);
  animHuman(player, dt, t, 0, 'sit');
  for (let i = CINE.caps.length - 1; i >= 0; i--) if (CINE.t >= CINE.caps[i][0]) { if (CINE.cap !== i) { CINE.cap = i; $('#cineText').textContent = CINE.caps[i][1]; } break; }
  // dolphins leap beside the boat in the middle of the trip
  CINE.dolphins.forEach((d, i) => {
    const ph = (CINE.t - (CINE.dur * 0.42 + i * 0.7)) / 1.5;
    if (ph < 0 || ph > 3) { d.visible = false; return; }
    const cyc = ph % 1, side = i % 2 ? 1 : -1, nx = tg.z, nz = -tg.x;
    d.visible = true;
    d.position.set(p.x + nx * side * (5 + i * 1.5) + tg.x * (cyc * 8 - 2), Math.sin(cyc * Math.PI) * 1.8 - 0.6, p.z + nz * side * (5 + i * 1.5) + tg.z * (cyc * 8 - 2));
    d.rotation.set(-Math.cos(cyc * Math.PI) * 0.9, Math.atan2(tg.x, tg.z), 0);
  });
  if (k >= 1) endCruise();
}
function endCruise() {
  CINE.on = false; $('#cine').hidden = true;
  const b = CINE.boat; b.remove(player); scene.add(player);
  b.position.set(PIER.x + 4.6, -0.1, PIER.z1 - 8); b.rotation.set(0, 0.04, 0);
  for (const d of CINE.dolphins) d.visible = false;
  P.x = PIER.x; P.z = PIER.z1 - 4; player.position.set(P.x, PIER_Y, P.z); player.rotation.set(0, Math.PI, 0); cam.yaw = 0; baseY = PIER_Y;
  nightTarget = CINE.prevNight; applyNight(smooth(night));
  ui.hud.hidden = false; ui.tags.hidden = false; mode = 'play';
  CINE.onEnd && CINE.onEnd();
}
function cineCamera(dt) {
  const b = CINE.boat, yaw = b.rotation.y, side = Math.sin(CINE.t * 0.12) * 0.9 + 0.6;
  camV.set(b.position.x - Math.sin(yaw) * 14 + Math.cos(yaw) * 9 * side, 6 + Math.sin(CINE.t * 0.2) * 1.5, b.position.z - Math.cos(yaw) * 14 - Math.sin(yaw) * 9 * side);
  camera.position.lerp(camV, 1 - Math.exp(-2.5 * dt)); camera.lookAt(b.position.x, 2.2, b.position.z); sun.target.position.set(b.position.x, 0, b.position.z);
}

/* ---------- Swahili lesson with Bibi Mwanaidi ---------- */
const QUIZ = [
  { q: 'A friend greets you: "Mambo?" What do you answer?', a: ['Poa!', 'Kwaheri', 'Samahani'], ok: 0, why: '"Mambo?" is "what\'s up?" and "Poa!" is "cool!"' },
  { q: 'An older woman passes by. How do you greet her respectfully?', a: ['Shikamoo', 'Habari yako, rafiki', 'Twende!'], ok: 0, why: '"Shikamoo" is the respectful greeting for elders. She answers "Marahaba".' },
  { q: 'What does "pole pole" mean?', a: ['Slowly, take it easy', 'Quickly', 'Sorry, police'], ok: 0, why: '"Pole pole" means slowly. On Zanzibar, everything goes pole pole.' },
  { q: 'At the market, how do you ask "How much is it?"', a: ['Bei gani?', 'Uko wapi?', 'Jina lako nani?'], ok: 0, why: '"Bei gani?" means "what price?". Bargain with a smile.' },
];
function bibiLesson() {
  const qi = state.quiz || 0;
  if (qi >= QUIZ.length) { openMenu({ eyebrow: 'Swahili lessons', title: 'Bibi Mwanaidi', lede: 'Hongera! You speak like a Zanzibari now. Karibu tena: come back any time.', items: [] }); return; }
  const Q = QUIZ[qi], order = [0, 1, 2].sort(() => rnd() - 0.5);
  openMenu({ eyebrow: `Swahili lesson · ${qi + 1} of ${QUIZ.length}`, title: 'Bibi Mwanaidi', lede: Q.q, close: 'Later', items: order.map(i => ({ label: Q.a[i], desc: '', price: '', act: () => {
    if (i === Q.ok) { state.quiz = qi + 1; sfx.ding(); if (state.quiz >= QUIZ.length) { help(`Sawa sawa! ${escapeHtml(Q.why)}`, 4500); giveStamp('kiswahili'); } else { help(`Ndiyo! ${escapeHtml(Q.why)}`, 3600); setTimeout(() => { if (mode === 'play') bibiLesson(); }, 900); } }
    else { sfx.deny(); help(`Hapana, jaribu tena. ${escapeHtml(Q.why)}`, 4200); }
  } })) });
}

/* ---------- food, kanga and henna ---------- */
function openFood() {
  const eat = (k, hp, label) => () => { heal(hp); feed(hp * 1.4 + 8); playEmote(player, 'drink'); state.ate[k] = 1; if (state.ate.pizza && state.ate.miwa) giveStamp('chakula'); else if (k === 'pizza' || k === 'miwa') help(state.ate.pizza ? 'Now wash it down with a fresh miwa.' : 'Now try a Zanzibar pizza: Mama Ashura folds it on the hot pan.', 3000); void label; };
  openMenu({ eyebrow: 'Usiku food market · cash only', title: 'Mama Ashura', lede: 'Karibu chakula! Everything is cooked in front of you, at street prices. Cash only.', cash: true, items: [
    { label: 'Zanzibar pizza', desc: 'Egg, minced meat and onion folded in thin dough. +40 health', price: 4000, act: eat('pizza', 40) },
    { label: 'Miwa juice', desc: 'Sugarcane pressed with lime and ginger. Sprint boost for 45 s', price: 1500, act: () => { eat('miwa', 5)(); RT.boost = Math.max(RT.boost, now()) + 45; } },
    { label: 'Urojo', desc: 'Zanzibar mix: tangy soup, bhajia, potato, chutney. +30 health', price: 3000, act: eat('urojo', 30) },
    { label: 'Mishkaki, three sticks', desc: 'Grilled beef skewers. +35 health', price: 6000, act: eat('mishkaki', 35) },
    { label: 'Chips mayai', desc: 'A chip omelette. +35 health', price: 4000, act: eat('chips', 35) },
    { label: 'Kahawa na kashata', desc: 'Strong coffee and a coconut sweet. +10 health, +15 energy', price: 1000, act: () => { eat('kahawa', 10)(); rest(15); } },
  ] });
}
function openRukia() {
  const both = () => { if (state.bought.kanga && state.bought.henna) giveStamp('kanga'); };
  const buyKanga = (p) => { if (!canPay(p, true)) { help(`Bi Rukia wants cash. You have ${tsh(state.cash)}: find a Pesa agent.`, 3200); sfx.deny(); return; } spend(p, 'Kanga', 'spent', true); state.bought.kanga = 1; playEmote(player, 'cheer'); both(); if (!state.bought.henna) help('A kanga to remember Fumba. Henna next?', 2600); };
  const buyHenna = (p) => { if (!canPay(p, true)) { help(`Bi Rukia wants cash. You have ${tsh(state.cash)}.`, 3200); sfx.deny(); return; } spend(p, 'Henna', 'spent', true); state.bought.henna = 1; playEmote(player, 'wave'); both(); if (!state.bought.kanga) help('Beautiful! Now pick a kanga.', 2600); };
  const items = [
    { label: state.bought.kanga ? 'Another kanga' : 'Bargain for a kanga', desc: '"Haba na haba hujaza kibaba": little by little fills the pot. She starts at the visitor price', price: 'Haggle', act: () => haggle({ eyebrow: 'Kanga · bargaining', title: 'Bi Rukia', ask: 25000, open: `"Kanga nzuri sana! ${tsh(25000)}." The first price is always the visitor price.`, buy: buyKanga }) },
    { label: state.bought.henna ? 'More henna' : 'Henna on your hands', desc: 'Swirling flowers in dark henna, done in ten minutes', price: 'Haggle', act: () => haggle({ eyebrow: 'Henna · bargaining', title: 'Bi Rukia', ask: 20000, open: `"Hina ya wiki mbili! ${tsh(20000)}." It lasts two weeks.`, buy: buyHenna }) },
  ];
  for (const sv of SOUVENIRS) items.push({ label: `${sv.name}${state.souvenirs.includes(sv.id) ? ' · yours' : ''}`, desc: sv.fact, price: 'Haggle', disabled: state.souvenirs.includes(sv.id), act: () => haggle({ eyebrow: 'Souvenirs · bargaining', title: 'Bi Rukia', ask: sv.ask, open: `"${sv.name}, handmade in Zanzibar. ${tsh(sv.ask)}."`, buy: (p) => { if (!canPay(p, true)) { help('Cash only at the stall. Find a Pesa agent.', 3000); sfx.deny(); return; } spend(p, sv.name, 'spent', true); state.souvenirs.push(sv.id); playEmote(player, 'cheer'); help(`A souvenir from Fumba: <b class="hl">${escapeHtml(sv.name)}</b>. Saved in your passport.`, 3500); } }) });
  openMenu({ eyebrow: 'Kanga, henna & souvenirs · cash only', title: 'Bi Rukia', lede: 'Every kanga carries a saying printed on it. Bargaining is expected: start low, smile, and do not push too hard.', items, cash: true });
}

/* ---------- spice farm tour ---------- */
function openHamisi() {
  const items = [];
  if (!hasStamp('viungo') && !(job && job.type === 'spice')) items.push({ label: 'Spice tour', desc: 'Find and smell five spices growing on the farm', price: PRICES.spice, act: startSpice });
  items.push({ label: 'Ten madafu to sell', desc: `Green coconuts at farm price. Tourists on the beach pay ${tsh(PRICES.coconutSell)} each`, price: PRICES.coconutBuy * 10, disabled: state.coconuts > 0, act: () => { state.coconuts = 10; help(`Carry the <b class="hl">madafu</b> to the beach. Tourists with a gold marker are thirsty: ${tsh(PRICES.coconutSell)} each.`, 5000); } });
  items.push({ label: 'Fresh madafu', desc: 'Drink one here. +30 health', price: 1000, act: () => { heal(30); feed(15); playEmote(player, 'drink'); } });
  openMenu({ eyebrow: 'Spice farm', title: 'Mzee Hamisi', lede: job && job.type === 'spice' ? `You have found ${job.found.size} of ${SPICE_SPOTS.length} spices. Follow the gold markers between the trees.` : hasStamp('viungo') ? 'Karibu tena! The cloves are drying nicely.' : 'Zanzibar is the Spice Island. Come, I will show you clove, cinnamon, nutmeg, pepper and vanilla.', items });
}
function startSpice() { if (job) failJobSilently(); job = { type: 'spice', found: new Set(), title: 'Spice tour', desc: 'Find the five spices marked with gold diamonds. Press E to smell each one.' }; sfx.start(); help('Follow the gold markers between the trees and press <kbd>E</kbd> at each spice.', 4500); }
function spiceNear() { if (!job || job.type !== 'spice') return null; for (const s of SPICE_SPOTS) if (!job.found.has(s.id) && Math.hypot(s.x - P.x, s.z - P.z) < 2.6) return s; return null; }
function smellSpice(s) {
  job.found.add(s.id); const sp = SPICES.find(q => q.id === s.id); playEmote(player, 'drink'); sfx.ding();
  help(`<b class="hl">${escapeHtml(sp.name)}</b>. ${escapeHtml(sp.fact)}`, 5200);
  if (job.found.size >= SPICE_SPOTS.length) { job = null; state.stats.jobs++; giveStamp('viungo'); setTimeout(() => help('Mzee Hamisi weaves you a palm-leaf crown. He also sells madafu you can sell on the beach.', 5000), 1800); }
}

/* ---------- seaweed farming: paid by the kilo ---------- */
function openMwanaisha() {
  const working = job && job.type === 'seaweed';
  const items = [];
  if (working && job.carry.length) items.push({ label: `Sell ${job.carry.reduce((a, b) => a + b.kg, 0)} kg`, desc: 'Weighed on the hanging scale', price: 'Earn', act: sellWeed });
  items.push(working ? { label: 'Stop for today', desc: 'Leave the farm', price: '', act: () => { failJobSilently(); } } : { label: 'Harvest at low tide', desc: 'Pick ripe seaweed from the lines and carry up to three bundles', price: 'Earn', act: startWeed });
  openMenu({ eyebrow: 'Seaweed co-op', title: 'Bi Mwanaisha', lede: `Mwani is Zanzibar's big export, farmed mostly by women at low tide. The co-op pays ${tsh(700)} a kilo for spinosum and ${tsh(1000)} for cottonii. You have sold ${state.kg} kg${hasStamp('mwani') ? '.' : ` of the 40 kg for your stamp.`}`, items });
}
function startWeed() { if (job) failJobSilently(); job = { type: 'seaweed', carry: [], title: 'Seaweed harvest', desc: 'Walk onto the flats, pick bundles from the lines and bring them to Bi Mwanaisha.' }; sfx.start(); help('Wade out onto the flats and walk over the <b class="hl">marked bundles</b>. Carry up to three, then sell them to Bi Mwanaisha.', 5000); }
function sellWeed() {
  let kg = 0, pay = 0; for (const b of job.carry) { kg += b.kg; pay += b.kg * (b.kind === 'cottonii' ? PAY.weedPremium : PAY.weed); }
  job.carry = []; state.kg += kg; state.stats.kg += kg; state.stats.jobs++;
  earn(pay, `${kg} kg seaweed`); sfx.win();
  const stamped = state.kg >= 40 && giveStamp('mwani');
  if (!stamped) help(`${kg} kg on the scale: ${tsh(pay)}. ${state.kg < 40 ? `${40 - state.kg} kg to go for your stamp.` : 'Keep harvesting, there is always more.'}`, 3500);
}
function updateWeed(t) {
  const nowS = now(); let n = 0; const o3 = markO3;
  for (const s of SEAWEED) {
    if (s.t > nowS) continue;
    if (job && job.type === 'seaweed' && job.carry.length < 3 && !playerVeh && Math.hypot(s.x - P.x, s.z - P.z) < 1.5) { job.carry.push({ kg: s.kg, kind: s.kind }); s.t = nowS + 150; sfx.coin(0); help(`${s.kind === 'cottonii' ? 'Cottonii' : 'Spinosum'} bundle, about ${s.kg} kg. Carrying ${job.carry.length} of 3.`, 1800); continue; }
    o3.position.set(s.x, tideY(s.x, s.z) + 0.2, s.z); o3.rotation.set(0, s.x, 0); o3.scale.set(1.3, 0.55, 1.1); o3.updateMatrix(); weedMesh.setMatrixAt(n++, o3.matrix);
  }
  weedMesh.count = n; weedMesh.instanceMatrix.needsUpdate = true; void t;
}

/* ---------- day work on the Continental Mall site ---------- */
function openMusa() {
  const working = job && job.type === 'site';
  openMenu({ eyebrow: 'Continental Mall site', title: 'Fundi Musa', lede: working ? `Haraka! ${job.left} bags to go.` : 'We pour concrete today. Carry eight bags of cement from the lorry to the mixer before the mix sets, and I pay you a half-day wage.', items: working ? [] : [
    { label: 'Half-day shift', desc: `Carry 8 cement bags in 4 minutes · pays ${tsh(PAY.site)}`, price: 'Earn', act: startSite },
  ] });
}
function startSite() { if (job) failJobSilently(); job = { type: 'site', left: 8, bag: false, t0: now(), limit: 240, title: 'Cement shift', desc: 'Pick up a bag at the yellow lorry, drop it at the red mixer.' }; sfx.start(); splash('KAZI!', 'Eight bags, four minutes', 'gold'); }
function updateSite() {
  const left = job.limit - (now() - job.t0);
  if (left <= 0) { job = null; splash('MUDA UMEISHA', 'The concrete set. No pay today.', 'bad'); return; }
  if (playerVeh) return;
  const tk = CONSTRUCTION.truck, mx = CONSTRUCTION.mixer;
  if (!job.bag && Math.hypot(tk.x - P.x, tk.z - P.z) < 6.5) { job.bag = true; sfx.ding(); }
  else if (job.bag && Math.hypot(mx.x - P.x, mx.z - P.z) < 3.4) {
    job.bag = false; job.left--; sfx.coin(0);
    if (job.left <= 0) { job = null; state.stats.jobs++; earn(PAY.site, 'Day wage'); splash('KAZI NZURI', `Shift done · +${tsh(PAY.site)}`, 'gold'); sfx.win(); }
  }
}

/* ---------- volunteer shift: clean the stadium plaza ---------- */
function openNeema() {
  const working = job && job.type === 'volunteer';
  openMenu({ eyebrow: 'AFCON volunteers', title: 'Neema', lede: working ? `${job.items.length} bottles left. Recycling bins are on every corner.` : 'Thousands of volunteers will help run AFCON 2027. Today we clean the plaza before the fans arrive. Volunteers get a stipend.', items: working ? [] : [
    { label: 'Volunteer shift', desc: `Pick up 12 bottles in 3 minutes · stipend ${tsh(PAY.volunteer)}`, price: 'Earn', act: startVolunteer },
  ] });
}
function startVolunteer() {
  if (job) failJobSilently();
  const items = []; let guard = 0;
  while (items.length < 12 && guard++ < 400) { const a = rnd() * TAU, d = 12 + rnd() * 70, x = PLAZA.x + Math.cos(a) * d * 1.3, z = PLAZA.z + 30 + Math.sin(a) * d * 0.7; if (walkable(x, z) && !pointBlocked(x, z, 0.8) && !pointInStadiumBowl(x, z)) items.push({ x, z }); }
  job = { type: 'volunteer', items, t0: now(), limit: 180, title: 'Volunteer shift', desc: 'Pick up the plastic bottles around the plaza.' };
  sfx.start(); splash('KUJITOLEA', 'Twelve bottles, three minutes', 'gold');
}
function updateVolunteer() {
  const left = job.limit - (now() - job.t0);
  if (left <= 0) { job = null; splash('MUDA UMEISHA', 'Shift over. Try again with Neema.', 'bad'); return; }
  for (let i = job.items.length - 1; i >= 0; i--) { const it = job.items[i]; if (Math.hypot(it.x - P.x, it.z - P.z) < 1.6) { job.items.splice(i, 1); sfx.coin(0); } }
  if (!job.items.length) { job = null; state.stats.jobs++; earn(PAY.volunteer, 'Volunteer stipend'); giveStamp('kujitolea'); }
}

/* ---------- madafu on the beach ---------- */
function updateTourists(dt, t) {
  for (const tr of TOURISTS) {
    const d = Math.hypot(tr.x - camera.position.x, tr.z - camera.position.z); tr.h.visible = d < 220;
    if (d < 140) animHuman(tr.h, dt, t, 0, 'lounge');
    if (!tr.want && now() > tr.t) tr.want = 1;
  }
}
function touristNear() { for (const tr of TOURISTS) if (Math.hypot(tr.x - P.x, tr.z - P.z) < 2.8) return tr; return null; }
function sellCoconut(tr) {
  if (!tr.want) { help('"Asante, we are fine for now!"', 1800); return; }
  if (state.coconuts <= 0) { help('"A cold madafu would be perfect!" Mzee Hamisi sells them at the spice farm.', 3000); return; }
  state.coconuts--; tr.want = 0; tr.t = now() + rr(70, 140); state.stats.sold++;
  earn(PRICES.coconutSell, 'Madafu'); playEmote(tr.h, 'drink'); sfx.coin(0);
  if (!state.coconuts) help('All your madafu are sold. Mzee Hamisi has more at the spice farm.', 3500);
}

/* ---------- Fumba ya kesho: the project boards ---------- */
function updateProjects() {
  for (const p of PROJECTS) {
    if (state.seen[p.id] || Math.hypot(p.x - P.x, p.z - P.z) > 11) continue;
    state.seen[p.id] = 1; mpDirty = true;
    const n = Object.keys(state.seen).length;
    help(`<b class="hl">${escapeHtml(p.name)}</b> · ${escapeHtml(p.fact)} <i>(${Math.min(n, 5)} of 5 for your stamp)</i>`, 6500); sfx.ding();
    if (n >= 5) giveStamp('kesho');
  }
}

/* ---------- per-frame ---------- */
function questMarkers() {
  const list = [];
  if (job && job.type === 'spice') for (const s of SPICE_SPOTS) if (!job.found.has(s.id)) list.push({ x: s.x, z: s.z, y: 3.2 });
  if (job && job.type === 'seaweed') { const nowS = now(); if (job.carry.length < 3) for (const s of SEAWEED) { if (s.t <= nowS) list.push({ x: s.x, z: s.z, y: 1.4, s: 0.7 }); } else list.push({ x: NPC_BY_ID.mwanaisha.x, z: NPC_BY_ID.mwanaisha.z, y: 2.6 }); }
  if (job && job.type === 'site') { const p = job.bag ? CONSTRUCTION.mixer : CONSTRUCTION.truck; list.push({ x: p.x, z: p.z, y: 4.2, s: 1.3 }); }
  if (job && job.type === 'volunteer') for (const it of job.items) list.push({ x: it.x, z: it.z, y: 1.2, s: 0.6 });
  if (state.coconuts > 0) for (const tr of TOURISTS) if (tr.want) list.push({ x: tr.x, z: tr.z, y: 1.9, s: 0.7 });
  list.push(...simMarkers());
  if (!job && state.intro) for (const p of PROJECTS) if (!state.seen[p.id] && Math.hypot(p.x - P.x, p.z - P.z) < 120) list.push({ x: p.x, z: p.z, y: 7, s: 1.1 });
  return list;
}
function updateQuests(dt, t) {
  if (mode === 'cine') { updateCine(dt, t); return; }
  if (mode === 'play') {
    if (job && job.type === 'site') updateSite();
    else if (job && job.type === 'volunteer') updateVolunteer();
    else if (job && job.type === 'seaweed' && Math.hypot(SEAWEED_BUYER.x - P.x, SEAWEED_BUYER.z - P.z) > 260) { failJobSilently(); note('You left the seaweed farm.'); }
    else if (job && job.type === 'spice' && Math.hypot(SPICE.x - P.x, SPICE.z - P.z) > 320) { job = null; note('You left the spice tour. Mzee Hamisi will wait for you.'); }
    if (state.intro) updateProjects();
  }
  updateWeed(t); updateTourists(dt, t);
  // litter
  let n = 0;
  if (job && job.type === 'volunteer') for (const it of job.items) { markO3.position.set(it.x, 0.18, it.z); markO3.rotation.set(Math.PI / 2, 0, it.x * 3); markO3.scale.setScalar(1); markO3.updateMatrix(); litterMesh.setMatrixAt(n++, markO3.matrix); }
  litterMesh.count = n; litterMesh.instanceMatrix.needsUpdate = true;
  if (CONSTRUCTION.drum) CONSTRUCTION.drum.rotation.y += dt * 1.2;
  drawMarkers(questMarkers(), t);
  syncCarry();
}

