/* ===================== 57 home: game clock, energy, homes to rent, rent day, the home hub ===================== */
/* Living in Fumba, Lagos Life style: the clock runs (a day is about 19 minutes), energy drains and comes back when you
   sleep at home, and rent is due every Jumamosi (Saturday) at 10:00, paid from Pesa if there is enough on the phone. */
const DAY_SW = ['Jumatatu', 'Jumanne', 'Jumatano', 'Alhamisi', 'Ijumaa', 'Jumamosi', 'Jumapili'];
const DAY_EN = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const CLOCK0 = 7 * 60 + 30, RENT_DAY = 5, RENT_HOUR = 10, WEEK = 7 * 1440;
const clockNow = () => (typeof state.clock === 'number' && isFinite(state.clock) ? state.clock : CLOCK0);
const clockDay = (c) => Math.floor((c === undefined ? clockNow() : c) / 1440);
const clockHour = (c) => (((c === undefined ? clockNow() : c) % 1440) + 1440) % 1440 / 60;
function clockText(c) { const m = Math.floor(clockHour(c) * 60); return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`; }
const dayName = (c, en) => (en ? DAY_EN : DAY_SW)[clockDay(c) % 7];
function nextRentDue(c) { let d = clockDay(c); for (let k = 0; k < 9; k++, d++) { const at = d * 1440 + RENT_HOUR * 60; if (d % 7 === RENT_DAY && at > c) return at; } return c + WEEK; }
/* game minutes per real second: the day runs at 1, the night at 2 so darkness does not drag */
const clockRate = (h) => (h >= 6 && h < 20 ? 1 : 2);
function clockNight(c) {
  const h = clockHour(c);
  if (h >= 6.75 && h < 18.25) return 0;
  if (h >= 18.25 && h < 19.5) return (h - 18.25) / 1.25;
  if (h >= 5.5 && h < 6.75) return 1 - (h - 5.5) / 1.25;
  return 1;
}
const timeMode = () => state.tmode || 'live';
function applyLight() { if (WEATHER.rain > 0.001) applyWeather(WEATHER.rain); else applyNight(smooth(night)); }
function setTimeMode(v) {
  state.tmode = v;
  if (v === 'day' || v === 'night') setNight(v === 'night');
  else { nightTarget = clockNight(); state.night = nightTarget > 0.5; rebuildEnv(nightTarget > 0.5 ? 1 : 0); RT.envN = nightTarget > 0.5 ? 1 : 0; }
  segSet('#segTime', v);
}
function addMinutes(m) { state.clock = clockNow() + m; if (timeMode() === 'live') { nightTarget = clockNight(); night = nightTarget; applyLight(); } rentCheck(); }
function updateClock(dt) {
  if (!(mode === 'play' || mode === 'menu' || mode === 'phone' || mode === 'home' || mode === 'ride')) return;
  state.clock = clockNow() + dt * clockRate(clockHour());
  if (timeMode() === 'live') nightTarget = clockNight();
  const en = night > 0.5 ? 1 : 0; if (RT.envN === undefined) RT.envN = en;
  if (en !== RT.envN) { RT.envN = en; rebuildEnv(en); }
  rentCheck();
  if (isFresh() === false && state.fresh) state.fresh = 0;
}

/* ---------- energy: drains while you are out, comes back with sleep (or a kahawa) ---------- */
function rest(n) { state.energy = clamp((state.energy === undefined ? 100 : state.energy) + n, 0, 100); }
const isFresh = () => !!state.fresh && clockNow() < state.fresh;
const wellRested = () => !!state.rested && clockNow() < state.rested;
function updateEnergy(dt) {
  if (state.energy === undefined) state.energy = 100;
  if (mode !== 'play') return;
  const k = (speed > 5 ? 1.5 : 1) * (playerVeh ? 0.6 : 1) * (wellRested() ? 0.75 : 1);
  state.energy = Math.max(0, state.energy - dt * 0.07 * k);
  if (state.energy < 22 && !RT.tiredTold) { RT.tiredTold = true; help('<b class="hl">Uchovu!</b> You are worn out: you cannot sprint until you rest. Sleep at home, or drink a kahawa.', 6000); }
  if (state.energy > 35) RT.tiredTold = false;
  if (state.energy <= 0 && !playerVeh && !isDown(player) && !RT.passing) passOut();
}
/* run out of energy and you fall asleep where you stand; on the street that can cost you */
function passOut() {
  RT.passing = true;
  if (job) failJobSilently();
  const d = myDoor(), nearHome = d && Math.hypot(d.ox - P.x, d.oz - P.z) < 30;
  sleepFade({ title: 'Umelala', sub: 'You fell asleep on your feet', ms: 2600 }, () => {
    addMinutes(180); state.energy = 32; RT.passing = false;
    if (state.cash > 2000 && !nearHome) { const amt = Math.min(state.cash, Math.max(2000, roundTo(state.cash * 0.4, 500))); spend(amt, 'Stolen while you slept', 'lost'); splash('MWIZI!', `${tsh(amt)} gone while you slept`, 'bad'); help('Sleeping on the street is risky. Keep money on Pesa and sleep at home.', 6000); }
    else help('You wake up three hours later, stiff but rested enough to walk home.', 4500);
  });
}

/* ---------- homes ---------- */
const HOMES = [
  { id: 'chumba', tier: 0, name: 'Chumba', full: 'Room in a shared Swahili house', where: 'Behind the Uptown Gate daladala depot', rent: 15000, sleep: 85, landlord: 'Mzee Bakari', b: [602.6, -81.1, 7.5, 6.1, -1.44],
    perks: ['Foam mattress under a mosquito net', 'Shared bathroom: a bucket shower', 'Cook ugali on the charcoal jiko for TSh 1,500', 'Sleep restores 85% energy: the neighbours play taarab late'] },
  { id: 'studio', tier: 1, name: 'Studio', full: 'Studio flat in a Fumba Uptown villa', where: 'Uptown villas, five minutes from the Usiku market', rent: 150000, sleep: 100, landlord: 'Bi Zuhura', b: [108.9, 229.4, 16.2, 10.8, -1.58],
    perks: ['Your own shower and kitchenette', 'A TV and a fridge with food in it', 'Sleep restores 100% energy', 'Walk to the beach and the market'] },
  { id: 'burj', tier: 2, name: 'Burj apartment', full: 'Sea-view apartment in Burj Zanzibar', where: 'Burj Zanzibar tower, west Fumba', rent: 600000, sleep: 100, rested: true, landlord: 'Burj concierge', b: [BURJ.x, BURJ.z, BURJ.w, BURJ.d, 0],
    perks: ['Floor-to-ceiling Indian Ocean view', 'Wake up well rested: sprinting costs less all day', 'A concierge at the door: no pickpockets near home', 'Sleep restores 100% energy'] },
];
const homeById = (id) => HOMES.find(h => h.id === id) || null;
const myHome = () => (state.home && homeById(state.home.id)) || null;
const HOME = { built: false, inside: false, scene: null, cam: null, rooms: {}, room: null, av: null, avKey: '', hemi: null, sunL: null, bulb: null, doors: [], t: 0, sub: '', tvKey: '' };
const myDoor = () => { const h = myHome(); return h ? HOME.doors.find(d => d.h === h) : null; };
function doorFor(h) {
  const [x, z, w, d, ang] = h.b;
  if (h.id === 'burj') return { x, z: z + d / 2 + 4.06, nx: 0, nz: 1, ry: 0 };
  const ca = Math.cos(ang), sa = Math.sin(ang);
  let best = null;
  for (const [ux, uz, half] of [[ca, sa, w / 2], [-ca, -sa, w / 2], [-sa, ca, d / 2], [sa, -ca, d / 2]]) {
    const px = x + ux * (half + 0.03), pz = z + uz * (half + 0.03), ox = px + ux * 1.4, oz = pz + uz * 1.4;
    let rd = 1e9; for (const s of roadSegs) { const dd = segDist(ox, oz, s.x0, s.z0, s.x1, s.z1) - s.hw; if (dd < rd) rd = dd; }
    const score = rd + (walkable(ox, oz) && !pointBlocked(ox, oz, 0.45) ? 0 : 1000);
    if (!best || score < best.score) best = { x: px, z: pz, nx: ux, nz: uz, ry: Math.atan2(ux, uz), score };
  }
  return best;
}
function homeSignTex(top, bottom, bg) {
  const c = mkCanvas(512, 256), x = c.getContext('2d');
  x.fillStyle = bg; x.fillRect(0, 0, 512, 256); kangaEdge(x, 512, 256, 14);
  x.fillStyle = '#f7ead0'; x.textAlign = 'center'; x.textBaseline = 'middle';
  fitFont(x, top, 900, 92, 470, FONT_D); x.fillText(top, 256, 108);
  x.fillStyle = '#f3b41b'; fitFont(x, bottom, 700, 40, 470, FONT_B); x.fillText(bottom, 256, 186);
  return texOf(c, { clamp: true });
}
function buildHomes() {
  const wood = M(0x6b3e22, { roughness: 0.7 }), stud = M(0xc9a24a, { roughness: 0.35, metalness: 0.8 }), frameM = M(0xe8e0cf), glass = M(0x9fc7d6, { roughness: 0.08, metalness: 0.4, transparent: true, opacity: 0.55 });
  for (const h of HOMES) {
    const d = doorFor(h); if (!d) continue;
    const g = new T.Group(); g.position.set(d.x, 0, d.z); g.rotation.y = d.ry;
    if (h.id === 'burj') {
      g.add(at(meshOf(box(3.2, 2.8, 0.12), frameM), 0, 1.4, 0.0));
      for (const s of [-1, 1]) g.add(at(meshOf(box(1.45, 2.55, 0.05), glass), s * 0.76, 1.32, 0.07));
    } else {
      const col = h.tier === 0 ? M(0x2a6fa8, { roughness: 0.75 }) : wood;
      g.add(at(meshOf(box(1.3, 2.35, 0.1), frameM), 0, 1.18, 0.02));
      g.add(at(meshOf(box(1.02, 2.12, 0.08), col, true), 0, 1.07, 0.07));
      if (h.tier === 1) for (let i = 0; i < 4; i++) for (let j = 0; j < 7; j++) g.add(at(meshOf(new T.SphereGeometry(0.028, 6, 4), stud), -0.36 + i * 0.24, 0.3 + j * 0.27, 0.12));
      g.add(at(meshOf(box(0.06, 0.06, 0.06), stud), 0.38, 1.05, 0.13));
    }
    const sign = new T.Mesh(new T.PlaneGeometry(1.1, 0.55), new T.MeshStandardMaterial({ map: homeSignTex(h.name.toUpperCase(), `${tsh(h.rent)} / week`, h.tier === 2 ? '#5c3319' : h.tier === 1 ? '#232a63' : '#1e6f5c'), roughness: 0.6, emissive: 0xffffff, emissiveIntensity: 0.06 }));
    sign.position.set(h.id === 'burj' ? 2.3 : 1.05, 2.1, 0.09); sign.material.emissiveMap = sign.material.map; nightable(sign.material, 0.06, 0.7); g.add(sign);
    const ring = new T.Mesh(new T.RingGeometry(0.75, 0.95, 36), new T.MeshBasicMaterial({ color: 0x22c2b8, transparent: true, opacity: 0.85, side: T.DoubleSide, depthWrite: false }));
    ring.rotation.x = -Math.PI / 2; ring.position.set(0, 0.06, 1.3); g.add(ring);
    scene.add(g);
    HOME.doors.push({ h, x: d.x, z: d.z, ry: d.ry, ox: d.x + d.nx * 1.35, oz: d.z + d.nz * 1.35, g, ring, sign });
  }
}
function updateHomeDoors(t) {
  const mine = myHome();
  for (const d of HOME.doors) { const me = d.h === mine, near = Math.hypot(d.ox - P.x, d.oz - P.z) < 60; d.ring.visible = near && (me || !mine || d.h.tier > mine.tier); d.ring.material.color.setHex(me ? 0x22c2b8 : 0xf3b41b); d.ring.material.opacity = 0.55 + Math.sin(t * 3) * 0.25; }
}
function homeInteraction() {
  if (playerVeh) return null;
  for (const d of HOME.doors) {
    if (Math.hypot(d.ox - P.x, d.oz - P.z) > 2.5) continue;
    const h = d.h, mine = state.home && state.home.id === h.id;
    if (mine) return { text: state.home.owed ? `Home · rent due ${tsh(state.home.owed)}` : 'Go inside · Nyumbani', act: () => enterHome() };
    return { text: `${h.name} to let · ${tsh(h.rent)} a week`, act: () => openLetting(h) };
  }
  return null;
}
function openLetting(h) {
  const cur = myHome(), owe = state.home && state.home.owed;
  const items = [{ label: `Rent the ${h.name.toLowerCase()} · first week`, desc: owe ? `Clear the ${tsh(owe)} you owe ${cur ? cur.landlord : 'your landlord'} first` : cur ? `You give up your ${cur.name.toLowerCase()} (no refund). Rent is due every Jumamosi.` : 'Rent is due every Jumamosi (Saturday) at 10:00.', price: h.rent, disabled: !!owe, act: () => moveIn(h, true) }];
  if (owe && cur) items.push({ label: `Pay ${cur.landlord} what you owe`, desc: `Rent for your ${cur.name.toLowerCase()}`, price: owe, noCharge: true, act: () => payRent(false) });
  openMenu({ eyebrow: `To let · ${h.where}`, title: h.full, lede: h.perks.join(' · '), items, close: 'Not now' });
}
function moveIn(h, paid) {
  state.home = { id: h.id, paidUntil: nextRentDue(clockNow() + 6 * 1440), owed: 0, graceUntil: 0 };
  if (paid) phoneMsg('landlord', `Karibu! The keys are yours. ${tsh(h.rent)} received for this week. Next rent is due ${dayName(state.home.paidUntil)} (${dayName(state.home.paidUntil, true)}) at 10:00.`, h.landlord);
  sfx.win(); splash('NYUMBA MPYA', `${h.full}`, 'gold');
  help(`Your new home: <b class="hl">${escapeHtml(h.full)}</b>. Press <kbd>E</kbd> at the door to go in, sleep, shower and change clothes.`, 6000);
  mpDirty = true; writeSave();
}
function rentCheck() {
  const H = state.home; if (!H) return;
  const hm = homeById(H.id); if (!hm) { state.home = null; return; }
  const c = clockNow();
  if (!H.owed && c >= H.paidUntil) {
    if (payRent(true)) return;
    H.owed = hm.rent; H.graceUntil = c + 2 * 1440;
    phoneMsg('landlord', `Habari ${state.nick || 'rafiki'}. This week's rent (${tsh(hm.rent)}) has not come in. Please pay by ${dayName(H.graceUntil, true)} ${clockText(H.graceUntil)}, at the door or from your phone, or I give the ${hm.name.toLowerCase()} to someone else.`, hm.landlord);
  }
  if (H.owed && c >= H.graceUntil) evict();
}
/* pays this week's rent (or what is owed); auto = the Saturday standing order, which only uses Pesa */
function payRent(auto) {
  const H = state.home, hm = H && homeById(H.id); if (!hm) return false;
  const amt = H.owed || hm.rent, fee = pesaSendFee(amt);
  if ((state.bank || 0) >= amt + fee) {
    state.bank -= amt + fee; state.stats.spent += amt + fee; moneyDelta(-amt, `Rent · Pesa +${fmt(fee)} fee`); mpDirty = true;
    phoneMsg('pesa', `Imethibitishwa. You paid ${tsh(amt)} to ${hm.landlord.toUpperCase()} (kodi). Fee ${tsh(fee)}. New Pesa balance ${tsh(state.bank)}.`);
  } else if (!auto && money() >= amt) spend(amt, 'Rent');
  else return false;
  const late = !!H.owed;
  H.owed = 0; H.graceUntil = 0; H.paidUntil = (H.paidUntil > clockNow() - WEEK ? H.paidUntil : nextRentDue(clockNow() - 1)) + WEEK;
  if (!auto || late) phoneMsg('landlord', `Asante! Rent received. You are paid up until ${dayName(H.paidUntil, true)} ${clockText(H.paidUntil)}.`, hm.landlord);
  sfx.ding(); if (HOME.inside) renderHomePanel(); return true;
}
function evict() {
  const hm = myHome(); if (!hm) return;
  phoneMsg('landlord', `You did not pay the rent, so the ${hm.name.toLowerCase()} has gone to someone else. Your bag is with ${hm.tier === 2 ? 'the concierge' : 'the neighbours'}. Any room in Fumba is on the Nyumbani app.`, hm.landlord);
  state.home = null; mpDirty = true;
  if (HOME.inside) leaveHome();
  splash('UMEFUKUZWA', 'Evicted for unpaid rent', 'bad');
}

/* ---------- the home hub: a small 3D room you step into ---------- */
function paintTex(lo, hi, band, grime) {
  const c = mkCanvas(512, 512), x = c.getContext('2d');
  x.fillStyle = hi; x.fillRect(0, 0, 512, 512); x.fillStyle = lo; x.fillRect(0, 512 * (1 - band), 512, 512 * band);
  if (band > 0) { x.fillStyle = 'rgba(0,0,0,.18)'; x.fillRect(0, 512 * (1 - band) - 4, 512, 4); }
  const r = mulberry32(7);
  for (let i = 0; i < 900 * grime; i++) { x.fillStyle = `rgba(${r() < 0.5 ? '60,50,40' : '255,255,255'},${(r() * 0.05).toFixed(3)})`; const s = 4 + r() * 30; x.fillRect(r() * 512, r() * 512, s, s * (0.4 + r())); }
  return texOf(c);
}
function tileTex(a, b, n, grout) {
  const c = mkCanvas(512, 512), x = c.getContext('2d'), s = 512 / n, r = mulberry32(11);
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) { x.fillStyle = (i + j) % 2 ? a : b; x.fillRect(i * s, j * s, s, s); x.fillStyle = `rgba(255,255,255,${(r() * 0.06).toFixed(3)})`; x.fillRect(i * s, j * s, s, s); }
  x.strokeStyle = grout; x.lineWidth = 3; for (let i = 0; i <= n; i++) { x.beginPath(); x.moveTo(i * s, 0); x.lineTo(i * s, 512); x.stroke(); x.beginPath(); x.moveTo(0, i * s); x.lineTo(512, i * s); x.stroke(); }
  return texOf(c);
}
function kangaTex(main, saying) {
  const c = mkCanvas(512, 512), x = c.getContext('2d');
  x.fillStyle = main; x.fillRect(0, 0, 512, 512); x.strokeStyle = '#f3b41b'; x.lineWidth = 18; x.strokeRect(30, 30, 452, 452);
  x.fillStyle = '#141838'; x.fillRect(48, 48, 416, 416); x.fillStyle = main;
  for (let i = 0; i < 6; i++) for (let j = 0; j < 6; j++) { x.beginPath(); x.arc(90 + i * 66, 90 + j * 66, 18, 0, TAU); x.fill(); }
  x.fillStyle = '#f7ead0'; x.font = `700 26px ${FONT_B}`; x.textAlign = 'center'; x.fillText(saying, 256, 496);
  kangaEdge(x, 512, 512, 10);
  return texOf(c);
}
function viewTex(night, sea) {
  const c = mkCanvas(512, 384), x = c.getContext('2d'), g = x.createLinearGradient(0, 0, 0, 384);
  if (night) { g.addColorStop(0, '#05081a'); g.addColorStop(0.6, '#16204a'); g.addColorStop(1, '#2a3058'); } else { g.addColorStop(0, '#5aa7e6'); g.addColorStop(0.6, '#bfe0f5'); g.addColorStop(1, '#f6e6c8'); }
  x.fillStyle = g; x.fillRect(0, 0, 512, 384);
  const r = mulberry32(night ? 3 : 5);
  if (night) { for (let i = 0; i < 90; i++) { x.fillStyle = `rgba(255,255,255,${(0.3 + r() * 0.7).toFixed(2)})`; x.fillRect(r() * 512, r() * 200, 1.6, 1.6); } x.fillStyle = '#f6f1dc'; x.beginPath(); x.arc(400, 70, 22, 0, TAU); x.fill(); }
  if (sea) {
    x.fillStyle = night ? '#0b1838' : '#1f8fb5'; x.fillRect(0, 230, 512, 154);
    x.fillStyle = night ? 'rgba(246,241,220,.35)' : 'rgba(255,255,255,.35)'; for (let i = 0; i < 40; i++) x.fillRect(r() * 512, 236 + r() * 140, 20 + r() * 40, 2);
    if (night) { x.fillStyle = 'rgba(246,241,220,.5)'; for (let i = 0; i < 14; i++) x.fillRect(388 + (r() - 0.5) * 30, 240 + i * 10, 26 - i, 2); }
    x.fillStyle = night ? '#0a0c1c' : '#3a2a1c'; x.beginPath(); x.moveTo(150, 250); x.lineTo(175, 250); x.lineTo(160, 205); x.closePath(); x.fill(); x.fillRect(140, 250, 50, 6);
  } else {
    x.fillStyle = night ? '#0a0f1e' : '#5b8a3c'; x.fillRect(0, 300, 512, 84);
    for (let i = 0; i < 4; i++) { const px = 60 + i * 130 + r() * 30; x.strokeStyle = night ? '#0a0f1e' : '#4a3a24'; x.lineWidth = 7; x.beginPath(); x.moveTo(px, 384); x.quadraticCurveTo(px + 14, 300, px + 6, 220); x.stroke(); x.fillStyle = night ? '#0a0f1e' : '#2f6b34'; for (let k = 0; k < 7; k++) { x.save(); x.translate(px + 6, 220); x.rotate(k / 7 * TAU); x.beginPath(); x.ellipse(36, 0, 40, 8, 0, 0, TAU); x.fill(); x.restore(); } }
    if (night) { x.fillStyle = '#f3b41b'; for (let i = 0; i < 6; i++) x.fillRect(30 + i * 85, 330 + r() * 20, 6, 4); }
  }
  return texOf(c, { clamp: true });
}
function posterTex() {
  const c = mkCanvas(256, 360), x = c.getContext('2d');
  const g = x.createLinearGradient(0, 0, 0, 360); g.addColorStop(0, '#1e9b57'); g.addColorStop(1, '#141838'); x.fillStyle = g; x.fillRect(0, 0, 256, 360);
  kangaEdge(x, 256, 360, 10); x.fillStyle = '#f3b41b'; x.textAlign = 'center'; fitFont(x, 'AFCON', 900, 70, 220, FONT_D); x.fillText('AFCON', 128, 120); x.fillStyle = '#f7ead0'; fitFont(x, '2027', 900, 80, 220, FONT_D); x.fillText('2027', 128, 200);
  x.font = `700 20px ${FONT_B}`; x.fillText('KENYA · TANZANIA', 128, 250); x.fillText('UGANDA', 128, 276); x.beginPath(); x.arc(128, 320, 16, 0, TAU); x.fill();
  return texOf(c, { clamp: true });
}
function promoTex() { return adTex('AFCON 2027', 'Live from Fumba on Zanzibar', ['#141838', '#1e9b57'], '#f3b41b'); }
function bx(w, h, d, mat, x, y, z, ry) { const m = new T.Mesh(new T.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); if (ry) m.rotation.y = ry; m.castShadow = m.receiveShadow = true; return m; }
function pl0(w, h, mat, x, y, z, rx, ry) { const m = pl(w, h, mat, x, y, z, rx, ry); m.receiveShadow = true; return m; }
function pl(w, h, mat, x, y, z, rx, ry) { const m = new T.Mesh(new T.PlaneGeometry(w, h), mat); m.position.set(x, y, z); m.rotation.set(rx || 0, ry || 0, 0); return m; }
const TM = (o) => new T.MeshStandardMaterial(Object.assign({ roughness: 0.8, metalness: 0 }, o));
/* a room is 5.6 m wide, 4.6 m deep, 2.8 m high; the front wall is left open for the camera */
function buildRoom(kind) {
  const g = new T.Group(), R = { g, win: null, sea: kind === 'burj', tv: null, fan: null, blanket: null };
  const W2 = 2.8, D2 = 2.3, H = 2.8;
  const wallTex = kind === 'chumba' ? paintTex('#1f8f8a', '#efe6d2', 0.4, 1) : kind === 'studio' ? paintTex('#f4efe6', '#f4efe6', 0, 0.3) : paintTex('#e9e6e1', '#e9e6e1', 0, 0.15);
  const wall = TM({ map: wallTex }), floorT = kind === 'chumba' ? paintTex('#8f8a82', '#8f8a82', 0, 1.4) : kind === 'studio' ? tileTex('#d9c6a3', '#e3d3b4', 6, '#b9a785') : tileTex('#6b4a33', '#76523a', 4, '#5a3d2a');
  floorT.repeat.set(1.4, 1.2);
  g.add(pl0(W2 * 2, D2 * 2, TM({ map: floorT, roughness: kind === 'burj' ? 0.35 : 0.85 }), 0, 0, 0, -Math.PI / 2));
  g.add(pl0(W2 * 2, H, kind === 'studio' ? TM({ map: paintTex('#c8643c', '#c8643c', 0, 0.3) }) : wall, 0, H / 2, -D2));
  g.add(pl0(D2 * 2, H, wall, -W2, H / 2, 0, 0, Math.PI / 2));
  g.add(pl0(D2 * 2, H, wall, W2, H / 2, 0, 0, -Math.PI / 2));
  g.add(pl(W2 * 2, D2 * 2, TM({ color: kind === 'chumba' ? 0xb9b2a4 : 0xf4f1ea }), 0, H, 0, Math.PI / 2));
  const skirt = TM({ color: kind === 'burj' ? 0x2a2420 : 0x9a8f7c });
  g.add(bx(W2 * 2, 0.1, 0.02, skirt, 0, 0.05, -D2 + 0.01)); g.add(bx(0.02, 0.1, D2 * 2, skirt, -W2 + 0.01, 0.05, 0)); g.add(bx(0.02, 0.1, D2 * 2, skirt, W2 - 0.01, 0.05, 0));
  const frame = TM({ color: kind === 'chumba' ? 0x2f7a4a : kind === 'studio' ? 0xf7f4ee : 0x2a2d33, roughness: 0.5 });
  if (kind === 'burj') {
    R.win = pl(W2 * 2 - 0.3, H - 0.3, new T.MeshBasicMaterial({ map: viewTex(false, true), toneMapped: false }), 0, H / 2, -D2 + 0.012);
    g.add(R.win);
    for (let i = -2; i <= 2; i++) g.add(bx(0.06, H - 0.3, 0.06, frame, i * 1.3, H / 2, -D2 + 0.03));
    g.add(bx(W2 * 2, 0.06, 0.06, frame, 0, 0.15, -D2 + 0.03)); g.add(bx(W2 * 2, 0.06, 0.06, frame, 0, 1.0, -D2 + 0.05));
    g.add(bx(W2 * 2, 0.04, 0.04, TM({ color: 0xcfd6dc, metalness: 0.7, roughness: 0.3 }), 0, 1.05, -D2 + 0.02));
  } else {
    const wx = kind === 'chumba' ? 1.35 : 0.2, ww = kind === 'chumba' ? 1.0 : 1.5, wh = kind === 'chumba' ? 0.9 : 1.2, wy = 1.6;
    R.win = pl(ww, wh, new T.MeshBasicMaterial({ map: viewTex(false, false), toneMapped: false }), wx, wy, -D2 + 0.012); g.add(R.win);
    g.add(bx(ww + 0.12, 0.08, 0.1, frame, wx, wy + wh / 2, -D2 + 0.05)); g.add(bx(ww + 0.12, 0.08, 0.14, frame, wx, wy - wh / 2, -D2 + 0.07));
    g.add(bx(0.08, wh, 0.1, frame, wx - ww / 2, wy, -D2 + 0.05)); g.add(bx(0.08, wh, 0.1, frame, wx + ww / 2, wy, -D2 + 0.05));
    if (kind === 'chumba') for (let i = 1; i < 5; i++) g.add(bx(0.025, wh, 0.025, frame, wx - ww / 2 + i * ww / 5, wy, -D2 + 0.06));
    else { const cur = TM({ map: kangaTex('#d8452c', ''), side: T.DoubleSide }); g.add(pl(0.45, 1.6, cur, wx - ww / 2 - 0.2, 1.55, -D2 + 0.1)); g.add(pl(0.45, 1.6, cur, wx + ww / 2 + 0.2, 1.55, -D2 + 0.1)); g.add(bx(ww + 1.0, 0.04, 0.04, TM({ color: 0x3a2a1c }), wx, 2.38, -D2 + 0.1)); }
  }
  // bed along the back wall, left
  const bedX = kind === 'burj' ? -1.55 : -1.35, bedZ = -1.5, wood = TM({ color: kind === 'chumba' ? 0x7a5230 : 0x5b3a22, roughness: 0.65 });
  const bw = kind === 'chumba' ? 1.95 : 2.1, bd = kind === 'chumba' ? 1.15 : 1.6, top = kind === 'chumba' ? 0.42 : 0.55;
  g.add(bx(bw + 0.08, kind === 'chumba' ? 0.24 : 0.32, bd + 0.08, wood, bedX, kind === 'chumba' ? 0.2 : 0.24, bedZ));
  const sheet = kind === 'chumba' ? TM({ map: kangaTex('#e0553a', 'HABA NA HABA HUJAZA KIBABA') }) : TM({ color: kind === 'studio' ? 0x2e4a8a : 0xf4f2ee, roughness: 0.9 });
  g.add(bx(bw - 0.04, 0.16, bd - 0.04, TM({ color: 0xf2efe6 }), bedX, top - 0.08, bedZ));
  g.add(pl(bw - 0.06, bd - 0.06, sheet, bedX, top + 0.005, bedZ, -Math.PI / 2));
  g.add(bx(0.4, 0.12, bd * 0.75, TM({ color: 0xf7f4ee }), bedX - bw / 2 + 0.28, top + 0.07, bedZ));
  if (kind !== 'chumba') g.add(bx(0.08, 1.0, bd + 0.1, wood, bedX - bw / 2 - 0.02, 0.6, bedZ));
  R.blanket = meshOf(roundedBox(bw * 0.66, 0.07, bd * 0.78, 0.035, 2), kind === 'chumba' ? TM({ color: 0x1f8fd0, roughness: 0.95 }) : TM({ color: kind === 'studio' ? 0x2e4a8a : 0xc9d6e8, roughness: 0.95 }), true, true); R.blanket.position.set(bedX + bw * 0.14, top + 0.2, bedZ);
  R.blanket.visible = false; g.add(R.blanket);
  R.bed = { x: bedX, z: bedZ, top, bw };
  if (kind === 'chumba') {
    const net = new T.Mesh(new T.CylinderGeometry(0.12, 1.15, 2.05, 18, 1, true), new T.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.13, side: T.DoubleSide, depthWrite: false, roughness: 1 }));
    net.position.set(bedX, H - 1.03, bedZ); g.add(net);
    g.add(bx(0.5, 0.04, 0.5, TM({ color: 0xf2f2f2 }), 1.6, 0.45, 0.6)); for (const [a, b2] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) g.add(bx(0.04, 0.45, 0.04, TM({ color: 0xf2f2f2 }), 1.6 + a * 0.22, 0.225, 0.6 + b2 * 0.22));
    g.add(bx(0.5, 0.5, 0.04, TM({ color: 0xf2f2f2 }), 1.6, 0.72, 0.36));
    g.add(bx(0.7, 0.6, 0.45, wood, 2.3, 0.3, -1.7)); g.add(bx(0.32, 0.16, 0.1, TM({ color: 0x2a2d33 }), 2.3, 0.68, -1.7));
    const bucket = new T.Mesh(new T.CylinderGeometry(0.2, 0.16, 0.34, 16), TM({ color: 0x1f6fd0, roughness: 0.5 })); bucket.position.set(2.35, 0.17, 1.2); g.add(bucket);
    const jiko = new T.Mesh(new T.CylinderGeometry(0.18, 0.13, 0.26, 12), TM({ color: 0x5a5d63, metalness: 0.5, roughness: 0.6 })); jiko.position.set(2.3, 0.13, 0.1); g.add(jiko);
    const pot = new T.Mesh(new T.CylinderGeometry(0.15, 0.15, 0.14, 14), TM({ color: 0xb8bcc4, metalness: 0.8, roughness: 0.3 })); pot.position.set(2.3, 0.33, 0.1); g.add(pot);
    g.add(pl(0.9, 2.1, TM({ map: kangaTex('#7a3fa0', 'MGENI NJOO MWENYEJI APONE'), side: T.DoubleSide }), -W2 + 0.03, 1.1, 1.2, 0, Math.PI / 2));
    for (let i = 0; i < 3; i++) { g.add(bx(0.04, 0.04, 0.1, wood, -W2 + 0.05, 1.85, -0.5 + i * 0.35)); g.add(bx(0.06, 0.6, 0.38, TM({ color: [0x1e9b57, 0xf3b41b, 0xd8452c][i] }), -W2 + 0.08, 1.52, -0.5 + i * 0.35)); }
    g.add(pl(0.5, 0.7, TM({ map: posterTex() }), 0.2, 1.65, -D2 + 0.01));
  } else {
    g.add(bx(0.45, 0.5, 0.4, wood, bedX + bw / 2 + 0.35, 0.25, -1.95));
    const lamp = new T.Mesh(new T.CylinderGeometry(0.1, 0.16, 0.22, 14, 1, true), new T.MeshStandardMaterial({ color: 0xfff1d0, emissive: 0xffd9a0, emissiveIntensity: 0.6, side: T.DoubleSide })); lamp.position.set(bedX + bw / 2 + 0.35, 0.78, -1.95); g.add(lamp);
    const tvW = kind === 'burj' ? 1.6 : 1.2, tvH = tvW * 0.5;
    const tvX = kind === 'burj' ? 1.55 : 1.75, tvZ = kind === 'burj' ? -1.85 : -D2 + 0.06, tvY = kind === 'burj' ? 1.12 : 1.45;
    if (kind === 'burj') { g.add(bx(1.9, 0.4, 0.45, TM({ color: 0x2a2420, roughness: 0.3 }), tvX, 0.2, tvZ)); g.add(bx(0.08, 0.32, 0.08, TM({ color: 0x111215 }), tvX, 0.56, tvZ)); }
    g.add(bx(tvW + 0.08, tvH + 0.08, 0.05, TM({ color: 0x111215, roughness: 0.3 }), tvX, tvY, tvZ));
    R.tv = pl(tvW, tvH, new T.MeshBasicMaterial({ map: promoTex(), toneMapped: false }), tvX, tvY, tvZ + 0.03);
    g.add(R.tv);
    if (kind === 'studio') {
      g.add(bx(1.4, 0.45, 0.4, wood, 1.75, 0.22, -2.05));
      g.add(bx(0.6, 0.9, 1.9, TM({ color: 0xf2efe8, roughness: 0.4 }), -W2 + 0.3, 0.45, 1.1)); g.add(bx(0.62, 0.04, 1.92, TM({ color: 0x2a2d33, roughness: 0.3 }), -W2 + 0.31, 0.92, 1.1));
      g.add(bx(0.7, 1.75, 0.65, TM({ color: 0xdfe3e6, metalness: 0.4, roughness: 0.35 }), -W2 + 0.36, 0.88, -0.3));
      const kettle = new T.Mesh(new T.CylinderGeometry(0.08, 0.1, 0.2, 12), TM({ color: 0xd8452c })); kettle.position.set(-W2 + 0.3, 1.04, 1.4); g.add(kettle);
      g.add(bx(1.5, 0.42, 0.75, TM({ color: 0x2e8b7a, roughness: 0.95 }), 2.25, 0.32, 0.8, -Math.PI / 2)); g.add(bx(1.5, 0.45, 0.18, TM({ color: 0x2e8b7a, roughness: 0.95 }), 2.62, 0.65, 0.8, -Math.PI / 2));
    } else {
      g.add(bx(2.4, 0.42, 0.85, TM({ color: 0xd9d2c4, roughness: 0.95 }), 1.1, 0.25, 0.9)); g.add(bx(2.4, 0.5, 0.2, TM({ color: 0xd9d2c4, roughness: 0.95 }), 1.1, 0.6, 1.25));
      g.add(bx(0.85, 0.42, 1.6, TM({ color: 0xd9d2c4, roughness: 0.95 }), 2.15, 0.25, 0.25));
      g.add(bx(1.0, 0.06, 0.6, TM({ color: 0x2a2420, roughness: 0.3 }), 0.9, 0.4, 0.0)); g.add(bx(0.9, 0.36, 0.5, TM({ color: 0x2a2420, roughness: 0.3 }), 0.9, 0.19, 0.0));
      g.add(pl(2.6, 1.8, TM({ color: 0xb08a5a, roughness: 1 }), 0.8, 0.012, 0.3, -Math.PI / 2));
      for (const [px, pz] of [[-2.45, 0.9], [2.45, -1.9]]) { const pot = new T.Mesh(new T.CylinderGeometry(0.2, 0.16, 0.42, 14), TM({ color: 0xece8e0 })); pot.position.set(px, 0.21, pz); g.add(pot); for (let k = 0; k < 7; k++) { const lf = new T.Mesh(new T.SphereGeometry(0.22, 8, 6), TM({ color: k % 2 ? 0x3d7030 : 0x4f8a3a })); lf.position.set(px + Math.cos(k) * 0.14, 0.62 + (k % 3) * 0.18, pz + Math.sin(k) * 0.14); lf.scale.set(1, 0.6, 0.5); g.add(lf); } }
    }
    const fan = new T.Group(); fan.position.set(0.2, H - 0.32, 0.2);
    fan.add(bx(0.04, 0.3, 0.04, TM({ color: 0xf2efe8 }), 0, 0.15, 0)); fan.add(new T.Mesh(new T.CylinderGeometry(0.1, 0.1, 0.08, 14), TM({ color: 0xf2efe8 })));
    const blades = new T.Group(); for (let k = 0; k < 3; k++) { const bl = bx(0.62, 0.015, 0.12, TM({ color: 0x8a6a48 }), 0.36, 0, 0); const p = new T.Group(); p.rotation.y = k / 3 * TAU; p.add(bl); blades.add(p); } fan.add(blades); R.fan = blades; g.add(fan);
  }
  const bulb = new T.Mesh(kind === 'chumba' ? new T.SphereGeometry(0.06, 12, 8) : new T.CylinderGeometry(0.28, 0.28, 0.04, 24), new T.MeshStandardMaterial({ color: 0xfff4dc, emissive: 0xffe2b0, emissiveIntensity: 1.2 }));
  bulb.position.set(kind === 'chumba' ? 0 : -1.0, kind === 'chumba' ? H - 0.42 : H - 0.03, kind === 'chumba' ? 0 : -0.8); g.add(bulb);
  if (kind === 'chumba') g.add(bx(0.01, 0.4, 0.01, TM({ color: 0x111111 }), 0, H - 0.2, 0));
  R.bulbPos = bulb.position.clone();
  R.stand = kind === 'burj' ? { x: -0.4, z: 0.3, ry: 0.35 } : kind === 'studio' ? { x: 0.35, z: -0.35, ry: 0.3 } : { x: 0.45, z: -0.4, ry: 0.25 };
  return R;
}
function buildHomeScene() {
  if (HOME.built) return;
  HOME.built = true;
  const s = HOME.scene = new T.Scene(); s.background = new T.Color(0x0a0c1c);
  HOME.cam = new T.PerspectiveCamera(56, innerWidth / innerHeight, 0.05, 40);
  HOME.hemi = new T.HemisphereLight(0xfff4e2, 0x5a4a38, 0.55); s.add(HOME.hemi);
  HOME.sunL = new T.DirectionalLight(0xfff1d6, 1.1); HOME.sunL.position.set(2.2, 4.2, 3.2); HOME.sunL.target.position.set(-0.4, 0, -1); s.add(HOME.sunL, HOME.sunL.target);
  HOME.sunL.castShadow = true; HOME.sunL.shadow.mapSize.set(1024, 1024); Object.assign(HOME.sunL.shadow.camera, { left: -4, right: 4, top: 4, bottom: -4, near: 0.5, far: 14 }); HOME.sunL.shadow.bias = -0.0005; HOME.sunL.shadow.normalBias = 0.02;
  HOME.bulb = new T.PointLight(0xffd9a0, 1.0, 9, 1.2); s.add(HOME.bulb);
  for (const k of ['chumba', 'studio', 'burj']) { const r = buildRoom(k); r.g.visible = false; s.add(r.g); HOME.rooms[k] = r; }
}
function homeAvatar() {
  const key = `${state.kit}|${lookCode(state.look)}`;
  if (HOME.av && HOME.avKey === key) return HOME.av;
  if (HOME.av) HOME.scene.remove(HOME.av);
  HOME.av = makeHuman(Object.assign(kitLook(state.kit, state.look, 27), { eager: true })); HOME.av.userData.lodFar = 1e5; HOME.avKey = key;
  HOME.av.traverse(o => { if (o.isMesh) o.castShadow = true; });
  HOME.scene.add(HOME.av); return HOME.av;
}
function setRoom(h) {
  for (const k in HOME.rooms) HOME.rooms[k].g.visible = k === h.id;
  HOME.room = HOME.rooms[h.id]; HOME.bulb.position.copy(HOME.room.bulbPos);
  standAvatar();
}
function standAvatar() {
  const av = homeAvatar(), R = HOME.room; av.quaternion.identity(); av.rotation.set(0, R.stand.ry, 0); av.position.set(R.stand.x, 0.02, R.stand.z); R.blanket.visible = false; HOME.pose = 'stand';
}
const _lieM = new T.Matrix4();
function lieAvatar() {
  const av = homeAvatar(), R = HOME.room, b = R.bed;
  _lieM.makeBasis(new T.Vector3(0, 0, -1), new T.Vector3(-1, 0, 0), new T.Vector3(0, 1, 0)); av.quaternion.setFromRotationMatrix(_lieM);
  av.position.set(b.x + b.bw / 2 - 0.12, b.top + 0.13, b.z); R.blanket.visible = true; HOME.pose = 'lie';
}
async function updateHomeTV() {
  const R = HOME.room; if (!R || !R.tv) return;
  const ad = typeof phoneAd === 'function' ? phoneAd('phb') : null, key = ad ? 'ad:' + (ad.updatedAt || '') + (ad.img ? ad.img.length : 0) + (ad.preview ? 'p' : '') : 'promo';
  if (HOME.tvKey === key + R.g.id) return; HOME.tvKey = key + R.g.id;
  try { R.tv.material.map = ad ? await creativeTex(ad, 'tv:' + key) : (HOME.promo || (HOME.promo = promoTex())); } catch (e) { R.tv.material.map = HOME.promo || (HOME.promo = promoTex()); }
  R.tv.material.needsUpdate = true;
}
function renderHome(dt, t) {
  const R = HOME.room, cam = HOME.cam, av = HOME.av; if (!R || !cam) return;
  const k = timeMode() === 'live' ? clockNight() : (state.night ? 1 : 0), nightNow = k > 0.5;
  if (R.nightTex !== nightNow) { R.nightTex = nightNow; R.win.material.map = viewTex(nightNow, R.sea); R.win.material.needsUpdate = true; }
  HOME.hemi.intensity = lerp(0.62, 0.22, k); HOME.sunL.intensity = lerp(R.sea ? 1.5 : 1.1, 0.12, k); HOME.sunL.color.setHex(nightNow ? 0x8fa0ff : 0xfff1d6);
  HOME.bulb.intensity = (mode === 'sleep' ? 0.08 : lerp(0.55, 1.35, k)) * (R.sea ? 0.8 : 1);
  if (R.fan) R.fan.rotation.y += dt * 7;
  if (av) animHuman(av, dt, t, 0, 'loco');
  const panel = $('#homePanel'), wide = innerWidth > 820, pw = panel && !panel.hidden && wide ? panel.offsetWidth + 24 : 0, ph = panel && !panel.hidden && !wide ? panel.offsetHeight : 0;
  cam.aspect = innerWidth / innerHeight; cam.fov = innerWidth < innerHeight ? 72 : 60;
  const port = innerWidth < innerHeight;
  const cx = port ? (R.stand.x - 0.1) : 0;
  cam.position.set(cx, 1.85, 2.25); cam.lookAt(cx, 0.82, -1.3);
  if (pw || ph) cam.setViewOffset(innerWidth, innerHeight, pw / 2, ph * 0.42, innerWidth, innerHeight); else cam.clearViewOffset();
  cam.updateProjectionMatrix();
  renderer.toneMappingExposure = lerp(1.0, 1.1, k);
  if ((HOME.t += dt) > 2) { HOME.t = 0; updateHomeTV(); }
  renderer.render(HOME.scene, cam);
}
function enterHome() {
  const h = myHome(); if (!h) return;
  if (POLICE.on) { help('The police are right behind you. Lose them before you go home.', 3200); sfx.deny(); return; }
  if (job) { help('Finish your job first, or quit it in the Kazi app on your phone.', 3500); sfx.deny(); return; }
  if (playerVeh || mode !== 'play') return;
  buildHomeScene(); setRoom(h); HOME.tvKey = ''; updateHomeTV();
  HOME.inside = true; HOME.sub = ''; mode = 'home'; ui.hud.hidden = true; ui.tags.hidden = true;
  if (document.pointerLockElement) document.exitPointerLock();
  keys.clear(); speed = 0;
  renderHomePanel(); $('#homePanel').hidden = false; sfx.ding();
  playEmote(homeAvatar(), 'wave'); state.homeVisits = (state.homeVisits || 0) + 1; mpDirty = true; sendPresence(true);
}
function leaveHome() {
  const d = myDoor() || HOME.lastDoor;
  HOME.inside = false; $('#homePanel').hidden = true; $('#sleepFx').hidden = true;
  if (mode === 'phone') PH.prev = 'play'; else if (mode !== 'sleep') mode = 'play';
  ui.hud.hidden = false; ui.tags.hidden = false;
  if (d) { P.x = d.ox; P.z = d.oz; player.position.set(P.x, groundY(P.x, P.z), P.z); player.rotation.y = d.ry; cam.yaw = d.ry + Math.PI; cam.pitch = 0.22; camTarget.set(P.x, 1.6, P.z); }
  applyLight(); mpDirty = true; sendPresence(true); canvas.focus(); writeSave();
}
/* sleep and blackouts share one fade */
function sleepFade(cfg, done) {
  const fx = $('#sleepFx'); mode = 'sleep'; keys.clear(); speed = 0;
  $('#sleepTitle').textContent = cfg.title; $('#sleepSub').textContent = cfg.sub || '';
  fx.hidden = false; fx.classList.remove('on'); void fx.offsetWidth; fx.classList.add('on');
  if (document.pointerLockElement) document.exitPointerLock();
  setTimeout(() => {
    try { done(); } catch (e) { console.error(e); }
    $('#sleepWhen').textContent = `${dayName()} · ${clockText()}`;
    setTimeout(() => { fx.classList.remove('on'); setTimeout(() => { fx.hidden = true; }, 700); if (mode === 'sleep') mode = HOME.inside ? 'home' : 'play'; if (HOME.inside) { standAvatar(); renderHomePanel(); } }, 1100);
  }, cfg.ms || 2400);
}
function sleepAction(nap) {
  const h = myHome(); if (!h) return;
  const hr = clockHour(), night2 = hr >= 19 || hr < 5;
  let mins;
  if (nap) mins = 120; else if (night2) { const target = (hr >= 19 ? clockDay() + 1 : clockDay()) * 1440 + 7 * 60; mins = target - clockNow(); } else mins = 8 * 60;
  lieAvatar();
  sleepFade({ title: nap ? 'Pumzika' : 'Lala salama', sub: nap ? 'A two-hour nap' : night2 ? 'Sleeping until 07:00' : 'Sleeping for eight hours', ms: 2600 }, () => {
    addMinutes(mins);
    if (nap) rest(h.tier === 0 ? 22 : 30); else { state.energy = Math.max(state.energy || 0, h.sleep); if (h.rested) state.rested = clockNow() + 16 * 60; state.hp = Math.min(100, state.hp + 30); }
    state.food = Math.max(0, (state.food === undefined ? 100 : state.food) - mins / 60 * 1.6);
    state.stats.sleeps = (state.stats.sleeps || 0) + (nap ? 0 : 1);
    if (!nap && h.tier === 0 && rnd() < 0.5) phoneMsg('amina', pick(['The neighbours had a harusi (wedding) last night. Did you sleep at all?', 'Did you hear the taarab next door? They practise every night before the wedding season.']));
    writeSave();
  });
}
function showerAction() {
  const h = myHome(); state.fresh = clockNow() + 240; rest(5); sfx.ding();
  HOME.flash = h && h.tier === 0 ? 'A bucket of cold water and a kopo (cup). Fresh for four hours: sellers open with a friendlier price.' : 'Hot shower done. Fresh for four hours: sellers open with a friendlier price.';
  renderHomePanel();
}
function cookAction() {
  const h = myHome(); if (!h) return;
  const c = h.tier === 0 ? { price: 1500, food: 38, text: 'Ugali na maharage on the charcoal jiko: filling and cheap.' } : { price: 3000, food: 48, text: h.tier === 1 ? 'Pilau from the fridge, warmed on the hob.' : 'The concierge sends up fish curry and rice.' };
  if (!canPay(c.price)) { sfx.deny(); HOME.flash = `You need ${tsh(c.price)} for food.`; renderHomePanel(); return; }
  spend(c.price, h.tier === 0 ? 'Ugali' : 'Groceries'); feed(c.food); heal(15); addMinutes(30); HOME.flash = c.text; playEmote(homeAvatar(), 'drink'); renderHomePanel();
}
function renderHomePanel() {
  const h = myHome(), root = $('#homePanel'); if (!h || !root) return;
  $('#hpEyebrow').textContent = `Nyumbani · ${h.where}`; $('#hpTitle').textContent = h.full;
  const H = state.home, hr = clockHour();
  $('#hpClock').textContent = `${dayName()} ${clockText()}`; $('#hpClockEn').textContent = dayName(undefined, true);
  $('#hpEnergy').style.width = `${Math.round(state.energy === undefined ? 100 : state.energy)}%`; $('#hpFood').style.width = `${Math.round(state.food === undefined ? 100 : state.food)}%`;
  $('#hpEnergyV').textContent = `${Math.round(state.energy === undefined ? 100 : state.energy)}%`; $('#hpFoodV').textContent = `${Math.round(state.food === undefined ? 100 : state.food)}%`;
  $('#hpRent').textContent = H.owed ? `Rent overdue: ${tsh(H.owed)}. Pay by ${dayName(H.graceUntil, true)} ${clockText(H.graceUntil)} or you lose the ${h.name.toLowerCase()}.` : `Rent ${tsh(h.rent)} a week · paid until ${dayName(H.paidUntil, true)} ${clockText(H.paidUntil)}`;
  $('#hpRent').className = 'hp-rent' + (H.owed ? ' due' : '');
  const acts = $('#hpActs'); acts.innerHTML = '';
  const night2 = hr >= 19 || hr < 5;
  const add = (key, label, sub, fn, dis) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'hp-act'; b.disabled = !!dis; const k = document.createElement('kbd'); k.textContent = key; const s = document.createElement('b'); s.textContent = label; const m = document.createElement('small'); m.textContent = sub; b.append(k, s, m); b.addEventListener('click', () => { HOME.flash = ''; fn(); }); acts.append(b); return b; };
  add('1', night2 ? 'Lala · sleep' : 'Lala · sleep 8 h', night2 ? 'Until 07:00. Restores energy' : 'Restores energy. Time passes', () => sleepAction(false));
  add('2', 'Pumzika · nap', 'Two hours, a little energy', () => sleepAction(true), (state.energy || 0) > 92);
  add('3', 'Oga · shower', isFresh() ? `Fresh until ${clockText(state.fresh)}` : 'Fresh for 4 hours: better first prices', showerAction);
  add('4', h.tier === 0 ? 'Pika · cook ugali' : 'Kula · eat', `${tsh(h.tier === 0 ? 1500 : 3000)} · fills you up`, cookAction);
  add('5', 'Kabati · wardrobe', 'Island looks, jerseys, hats and shades', () => { HOME.sub = HOME.sub === 'ward' ? '' : 'ward'; renderHomePanel(); });
  add('6', 'Simu · phone', 'Rides, food, jobs, Pesa', () => openPhone());
  const rentB = (b) => { b.classList.add('wide'); return b; };
  if (H.owed) rentB(add('7', `Lipa kodi · ${tsh(H.owed)}`, 'Pay the rent you owe', () => { if (!payRent(false)) { sfx.deny(); HOME.flash = `You need ${tsh(H.owed)}.`; } renderHomePanel(); }));
  else rentB(add('7', 'Lipa kodi mapema', `Pay next week now (${tsh(h.rent)})`, () => { if (H.paidUntil - clockNow() > 3 * WEEK) { HOME.flash = 'You are paid up for weeks. Asante!'; renderHomePanel(); return; } if (!canPay(h.rent)) { sfx.deny(); HOME.flash = `You need ${tsh(h.rent)}.`; renderHomePanel(); return; } spend(h.rent, 'Rent'); H.paidUntil += WEEK; phoneMsg('landlord', `Asante! Paid up until ${dayName(H.paidUntil, true)} ${clockText(H.paidUntil)}.`, h.landlord); renderHomePanel(); }));
  add('Esc', 'Toka · go out', 'Back to the street', leaveHome);
  const sub = $('#hpSub'); sub.innerHTML = '';
  if (HOME.flash) { const p = document.createElement('p'); p.className = 'hp-flash'; p.textContent = HOME.flash; sub.append(p); }
  if (HOME.sub === 'ward') renderWardrobe(sub);
  const perks = document.createElement('ul'); perks.className = 'hp-perks'; for (const t of h.perks) { const li = document.createElement('li'); li.textContent = t; perks.append(li); } sub.append(perks);
}
function renderWardrobe(root) {
  const box2 = document.createElement('div'); box2.className = 'hp-ward'; root.append(box2);
  renderStyle(box2, { name: 'w', compact: true, after: () => { homeAvatar(); standAvatar(); } });
}
function homeKey(e) {
  const k = e.key;
  if (k === 'Escape') { if (HOME.sub) { HOME.sub = ''; renderHomePanel(); } else leaveHome(); return true; }
  const dm = /^(?:Digit|Numpad)(\d)$/.exec(e.code || ''), n = dm ? +dm[1] : parseInt(k, 10); if (n >= 1 && n <= 8) { const b = $('#hpActs').children[n - 1]; if (b && !b.disabled) b.click(); return true; }
  if (e.code === 'KeyP') { openPhone(); return true; }
  return false;
}
