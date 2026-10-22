/* ===================== 60 hud: cash, radar, map, prompts, menus, tags, audio ===================== */
const ui = {
  hud: $('#hud'), tags: $('#tags'), cash: $('#cash'), deltas: $('#deltas'), timer: $('#timer'), timerVal: $('#timerVal'), timerLabel: $('#timerLabel'),
  help: $('#help'), goalTag: $('#goalTag'), goalTitle: $('#goalTitle'), goalDesc: $('#goalDesc'), goalDist: $('#goalDist'), goalBarWrap: $('#goalBarWrap'), goalBar: $('#goalBar'),
  rush: $('#rush'), rushText: $('#rushText'), rushTime: $('#rushTime'), radar: $('#radar'), hp: $('#hpBar'), st: $('#stBar'),
  speedo: $('#speedo'), kmh: $('#kmh'), vehName: $('#vehName'), vhp: $('#vhpBar'), area: $('#area'), areaName: $('#areaName'),
  prompt: $('#prompt'), promptText: $('#promptText'), prompt2: $('#prompt2'), prompt2Text: $('#prompt2Text'), sub: $('#sub'),
  splash: $('#splash'), splashTitle: $('#splashTitle'), splashSub: $('#splashSub'), fx: $('#fx'),
  chat: $('#chat'), chatlog: $('#chatlog'), chatbox: $('#chatbox'), chatInput: $('#chatInput'), chatHint: $('#chatHint'),
  players: $('#players'), playerList: $('#playerList'), online: $('#btnOnline'), onlineText: $('#onlineText'),
  menu: $('#menuCard'), mEyebrow: $('#mEyebrow'), mTitle: $('#mTitle'), mLede: $('#mLede'), mItems: $('#mItems'), mWallet: $('#mWallet'), mClose: $('#mClose'),
  start: $('#start'), end: $('#end'), mapView: $('#mapView'), pause: $('#pause'),
};
let helpTimer = 0, splashTimer = 0, shownCash = 0;
const hudX = { pesa: $('#pesa'), pesaEl: $('#pesaEl'), food: $('#fdBar'), en: $('#enBar'), wanted: $('#wanted'), stars: $('#wantedStars'), rain: $('#rainTag'), clockT: $('#clockT'), clockD: $('#clockD'), fresh: $('#freshTag') };

/* ---------- on-screen display: Full, Minimal, Off, or your own mix (H cycles) ---------- */
const HUD_PARTS = [['goal', 'Objective panel'], ['radar', 'Minimap'], ['money', 'Money and clock'], ['needs', 'Health, stamina, food and energy bars'], ['chat', 'Chat'], ['tags', 'Name tags'], ['prompts', 'Prompts and tips'], ['area', 'Place names']];
const HUD_PRESETS = {
  full: { goal: 1, radar: 1, money: 1, needs: 1, chat: 1, tags: 1, prompts: 1, area: 1 },
  min: { goal: 0, radar: 1, money: 1, needs: 0, chat: 0, tags: 1, prompts: 1, area: 0 },
  off: { goal: 0, radar: 0, money: 0, needs: 0, chat: 0, tags: 0, prompts: 0, area: 0 },
};
const HUD_NAMES = { full: 'Full', min: 'Minimal', off: 'Off', custom: 'Custom' };
const HUDV = { preset: 'full', parts: Object.assign({}, HUD_PRESETS.full), photoPrev: null };
try { const s = JSON.parse(localStorage.getItem('afconcity-hud') || 'null'); if (s && (HUD_PRESETS[s.preset] || s.preset === 'custom')) { HUDV.preset = s.preset; HUDV.parts = Object.assign({}, HUD_PRESETS.full, s.preset === 'custom' ? s.parts || {} : HUD_PRESETS[s.preset]); } } catch (e) {}
function saveHud() { try { localStorage.setItem('afconcity-hud', JSON.stringify({ preset: HUDV.preset, parts: HUDV.parts })); } catch (e) {} }
function applyHudVis() {
  const h = ui.hud;
  h.classList.toggle('hv-off', HUDV.preset === 'off'); h.classList.toggle('hv-min', HUDV.preset === 'min');
  for (const [k] of HUD_PARTS) h.classList.toggle('no-' + k, !HUDV.parts[k]);
  ui.tags.classList.toggle('no-tags', !HUDV.parts.tags);
  segSet('[data-seg="hud"]', HUDV.preset);
  document.querySelectorAll('.hud-parts input').forEach(i => { i.checked = !!HUDV.parts[i.name]; });
  const b = $('#btnHud'); if (b) { b.setAttribute('aria-pressed', String(HUDV.preset !== 'full')); b.title = `On-screen display: ${HUD_NAMES[HUDV.preset]} (H)`; }
}
function setHudPreset(p, silent) {
  if (HUD_PRESETS[p]) { HUDV.preset = p; HUDV.parts = Object.assign({}, HUD_PRESETS[p]); }
  if (p !== 'off') HUDV.photoPrev = null;
  saveHud(); applyHudVis();
  if (!silent && p !== 'off') help(`On-screen display: <b class="hl">${HUD_NAMES[HUDV.preset]}</b>. Press <kbd>H</kbd> to change it.`, 2200);
  if (p === 'off') { const eye = $('#hudEye'); if (eye) { eye.classList.add('hint'); clearTimeout(HUDV.hintT); HUDV.hintT = setTimeout(() => eye.classList.remove('hint'), 4000); } }
}
function setHudPart(k, on) {
  HUDV.parts[k] = on ? 1 : 0; HUDV.preset = 'custom';
  for (const p of ['full', 'min', 'off']) if (HUD_PARTS.every(([q]) => !!HUDV.parts[q] === !!HUD_PRESETS[p][q])) HUDV.preset = p;
  saveHud(); applyHudVis();
}
function cycleHud() {
  if (HUDV.photoPrev) { setHudPreset(HUDV.photoPrev); return; }
  const order = ['full', 'min', 'off'], i = order.indexOf(HUDV.preset);
  setHudPreset(order[(i + 1) % order.length]);
}
function renderHudParts() {
  document.querySelectorAll('.hud-parts').forEach(root => {
    root.innerHTML = '';
    for (const [k, label] of HUD_PARTS) { const l = document.createElement('label'); l.className = 'chk'; const i = document.createElement('input'); i.type = 'checkbox'; i.name = k; i.checked = !!HUDV.parts[k]; i.addEventListener('change', () => setHudPart(k, i.checked)); l.append(i, document.createTextNode(label)); root.append(l); }
  });
}
function help(html, ms) { ui.help.innerHTML = html; ui.help.hidden = false; clearTimeout(helpTimer); helpTimer = setTimeout(() => { ui.help.hidden = true; }, ms || 4000); }
function note(text) { help(escapeHtml(text), 3200); }
function sub(html) { ui.sub.innerHTML = html || ''; }
function splash(title, subText, kind) {
  ui.splashTitle.textContent = title; ui.splashSub.textContent = subText || ''; ui.splashSub.hidden = !subText;
  ui.splash.className = 'splash' + (kind ? ' ' + kind : ''); ui.splash.hidden = false; void ui.splash.offsetWidth; ui.splash.classList.add('show');
  clearTimeout(splashTimer); splashTimer = setTimeout(() => { ui.splash.hidden = true; }, 2600);
}
function moneyDelta(n, label) {
  state.txns = Array.isArray(state.txns) ? state.txns : []; state.txns.push({ t: Math.round(clockNow()), n: Math.round(n), l: String(label || '').slice(0, 48) }); if (state.txns.length > 40) state.txns.splice(0, state.txns.length - 40);
  const d = document.createElement('div'); d.className = 'delta ' + (n >= 0 ? 'plus' : 'minus');
  d.textContent = (n >= 0 ? '+' : '−') + fmt(Math.abs(n));
  if (label) { const s = document.createElement('span'); s.textContent = label; d.append(s); }
  ui.deltas.prepend(d); while (ui.deltas.children.length > 4) ui.deltas.lastChild.remove();
  setTimeout(() => d.remove(), 2500);
}
function shake(a) { RT.shake = Math.max(RT.shake, a); }
let hurtTimer = 0;
function fxHurt() { ui.fx.classList.add('hurt'); clearTimeout(hurtTimer); hurtTimer = setTimeout(() => ui.fx.classList.remove('hurt'), 260); }

/* ---------- menus ---------- */
let menuItems = [], menuCash = false;
let menuSel = 0;
function openMenu(cfg) {
  ui.mEyebrow.textContent = cfg.eyebrow || ''; ui.mTitle.textContent = cfg.title || ''; ui.mLede.textContent = cfg.lede || ''; ui.mLede.hidden = !cfg.lede;
  ui.mItems.innerHTML = ''; menuItems = cfg.items || [];
  menuItems.forEach((it, i) => {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'mitem'; b.id = 'mi' + i; b.setAttribute('role', 'option');
    const num = document.createElement('span'); num.className = 'num'; num.textContent = i + 1;
    const name = document.createElement('b'); name.textContent = it.label;
    const price = document.createElement('span'); price.className = 'price' + (typeof it.price === 'number' ? '' : ' free'); price.textContent = typeof it.price === 'number' ? tsh(it.price) : (it.price || '');
    const desc = document.createElement('small'); desc.textContent = it.desc || '';
    if (it.swatch) { const sw = document.createElement('i'); sw.style.cssText = `display:inline-block;width:12px;height:12px;border-radius:50%;margin-right:8px;vertical-align:1px;background:${it.swatch};box-shadow:inset 0 0 0 2px var(--ink)`; name.prepend(sw); }
    b.append(num, name, price, desc);
    const have = cfg.cash ? state.cash : money(), afford = typeof it.price !== 'number' || it.noCharge === 'free' || have >= it.price;
    b.disabled = !!it.disabled || !afford;
    if (!afford && !it.disabled) desc.textContent = `${it.desc ? it.desc + ' · ' : ''}You need ${tsh(it.price - have)} more${cfg.cash && money() >= it.price ? ' in cash (find a Pesa agent)' : ''}`;
    b.addEventListener('click', () => pickMenu(i));
    b.addEventListener('mouseenter', () => selMenu(i));
    ui.mItems.append(b);
  });
  ui.mClose.firstChild.textContent = (cfg.close || (menuItems.length ? 'Walk away' : 'Okay')) + ' ';
  menuCash = !!cfg.cash;
  ui.mWallet.textContent = cfg.cash ? `Cash only · you have ${tsh(state.cash)}` : `Cash ${tsh(state.cash)} · Pesa ${tsh(state.bank || 0)}`;
  ui.menu.hidden = false; mode = mode === 'play' ? 'menu' : mode;
  if (document.pointerLockElement) document.exitPointerLock();
  const first = menuItems.findIndex((it, i) => !ui.mItems.children[i].disabled);
  selMenu(first < 0 ? -1 : first);
  (first < 0 ? ui.mClose : ui.mItems.children[first]).focus();
}
function selMenu(i) { if (i >= 0 && ui.mItems.children[i] && ui.mItems.children[i].disabled) return; menuSel = i; [...ui.mItems.children].forEach((b, k) => b.classList.toggle('sel', k === i)); }
function moveMenu(d) {
  const n = menuItems.length; if (!n) return;
  for (let k = 1; k <= n; k++) { const i = ((menuSel < 0 ? 0 : menuSel) + d * k + n * 4) % n; if (!ui.mItems.children[i].disabled) { selMenu(i); ui.mItems.children[i].focus(); return; } }
}
function pickMenu(i) {
  const it = menuItems[i]; if (!it || it.disabled) return;
  if (typeof it.price === 'number' && !it.noCharge) { if (!canPay(it.price, menuCash)) { sfx.deny(); return; } spend(it.price, it.label, 'spent', menuCash); }
  else if (typeof it.price === 'number' && !canPay(it.price, menuCash)) { sfx.deny(); return; }
  closeMenu(); sfx.ding();
  it.act && it.act();
}
function closeMenu() { ui.menu.hidden = true; if (mode === 'menu') mode = 'play'; canvas.focus(); }

/* ---------- name tags ---------- */
const projV = new T.Vector3();
let playerTag = null;
function makeTag(name, me) {
  const el = document.createElement('div'); el.className = 'tag';
  const bub = document.createElement('div'); bub.className = 'tag-bub'; bub.hidden = true;
  const nm = document.createElement('div'); nm.className = 'tag-name' + (me ? ' me' : ''); nm.textContent = name;
  el.append(bub, nm); ui.tags.append(el);
  return { el, bub, nm, bubUntil: 0 };
}
function placeTag(tag, x, y, z) {
  projV.set(x, y, z).project(camera);
  if (!(projV.z < 1 && projV.z > -1 && Math.abs(projV.x) < 1.2 && Math.abs(projV.y) < 1.2)) { tag.el.style.visibility = 'hidden'; return; }
  tag.el.style.visibility = '';
  tag.el.style.transform = `translate(${((projV.x + 1) / 2 * innerWidth).toFixed(1)}px, ${((1 - projV.y) / 2 * innerHeight).toFixed(1)}px) translate(-50%, -100%)`;
}
const npcTags = {}, thiefTags = [];
function updateTags() {
  for (const n of NPCS) {
    const tg = npcTags[n.id] || (npcTags[n.id] = (() => { const t = makeTag(n.name, false); const r = document.createElement('i'); r.textContent = ' · ' + n.role; t.nm.append(r); return t; })());
    const h = npcObjs[n.id], d = Math.hypot(h.position.x - P.x, h.position.z - P.z);
    if (d < 14 && mode === 'play') placeTag(tg, h.position.x, 2.2, h.position.z); else tg.el.style.visibility = 'hidden';
  }
  thieves.forEach((th, i) => {
    const tg = thiefTags[i] || (thiefTags[i] = (() => { const t = makeTag('MWIZI', false); t.nm.className = 'tag-name thief'; return t; })());
    const show = (th.state === 'flee' || th.state === 'rush') && mode === 'play' && Math.hypot(th.x - P.x, th.z - P.z) < 90;
    if (show) { tg.nm.textContent = th.state === 'flee' && th.loot ? `MWIZI · ${tsh(th.loot)}` : 'MWIZI'; placeTag(tg, th.x, 2.25, th.z); } else tg.el.style.visibility = 'hidden';
  });
  if (playerTag) {
    if (playerTag.bubUntil && performance.now() > playerTag.bubUntil) { playerTag.bub.hidden = true; playerTag.bubUntil = 0; }
    playerTag.nm.hidden = true;
    if (mode === 'play' && !playerTag.bub.hidden) placeTag(playerTag, P.x, playerVeh ? 2.7 : 2.25, P.z); else playerTag.el.style.visibility = 'hidden';
  }
}

/* ---------- goal panel ---------- */
const EARN_HINTS = [
  'Seaweed pays TSh 1,000 to 1,400 a kilo at Bi Mwanaisha\'s co-op on the beach.',
  'Fundi Musa pays TSh 35,000 for a half-day shift on the Continental Mall site.',
  'The bajaji race pays TSh 70,000 for a gold time. Start sign on the Fumba road (R).',
  'Buy madafu from Mzee Hamisi for TSh 1,000 and sell them on the beach for TSh 3,000.',
  'Penalty bets with Coach Baraka: score two of three and double your stake.',
  'Pizza runs for Mzee Juma pay up to TSh 12,000. Bajaji taxi fares start at TSh 3,000.',
  'Coin rush every three minutes: gold coins worth TSh 3,000 each.',
  'Pickpockets tire quickly: run one down or tackle him (F) to get your money back, plus a TSh 5,000 reward.',
];
const goalUI = { stamps: $('#progStamps'), stampsBar: $('#progStampsBar'), cash: $('#progCash'), cashBar: $('#progCashBar'), prog: $('#prog') };
function updateGoal(t) {
  let tag = 'Goal', title, desc, bar = null;
  const mg = MIS.id || MIS.goal ? missionGoal() : null;
  if (mg) { tag = mg.tag; title = mg.title; desc = mg.desc; }
  else if (job && job.type !== 'bet') {
    tag = 'Job'; title = job.title;
    if (job.type === 'race') desc = `Checkpoint ${Math.min(job.cp + 1, RACE_CPS.length)} of ${RACE_CPS.length}. Gold under ${fmtTime(job.target)}.`;
    else if (job.type === 'spice') { desc = `Spices found: ${job.found.size} of ${SPICE_SPOTS.length}. Press E at each gold marker.`; bar = job.found.size / SPICE_SPOTS.length; }
    else if (job.type === 'seaweed') { const kg = job.carry.reduce((a, b) => a + b.kg, 0); desc = `Carrying ${job.carry.length} of 3 bundles (${kg} kg). ${job.carry.length >= 3 ? 'Sell them to Bi Mwanaisha.' : 'Walk over the marked bundles on the flats.'}`; bar = Math.min(1, state.kg / 40); }
    else if (job.type === 'site') { desc = `${job.left} bags to go. ${job.bag ? 'Take the bag to the red mixer.' : 'Pick up a bag at the yellow lorry.'}`; bar = (8 - job.left) / 8; }
    else if (job.type === 'volunteer') { desc = `${job.items.length} bottles left on the plaza.`; bar = (12 - job.items.length) / 12; }
    else if (job.type === 'dala') { const st = STOPS.find(s => s.id === DALA_ROUTE[job.i]); desc = playerVeh !== DALA.v ? 'Get back in the daladala.' : `Next stop: ${st ? st.name : 'depot'}. Stop beside the shelter. ${job.pax}/${DALA_CAP} aboard · fares ${tsh(job.fares)}`; bar = job.stops / (DALA_ROUTE.length - 1); }
    else if (job.type === 'match') { desc = `You ${job.me} – ${job.kids} Kids. Shoot west, defend east. First to 3.`; bar = job.me / 3; }
    else if (simJobDesc()) { const sj = simJobDesc(); desc = sj.desc; bar = sj.bar; }
    else desc = job.desc;
  } else if (orderGoal()) { const og = orderGoal(); tag = og.tag; title = og.title; desc = og.desc; }
  else if (RT.wp && state.intro) { tag = 'GPS'; title = RT.wp.label; desc = 'Follow the yellow marker on your radar. Set a new one on your phone (P).'; }
  else if (!state.intro) { title = 'Talk to Amina'; desc = 'She is right in front of you at the Uptown Gate daladala stop.'; }
  else if (state.ticket && !state.done) { title = 'Get to kickoff'; desc = 'Walk through Gate A and stand in the centre circle.'; }
  else if (state.ticket && missionGoal()) { const m2 = missionGoal(); tag = m2.tag; title = m2.title; desc = m2.desc; }
  else if (state.ticket && story().pitch) { tag = 'Free roam'; title = LANG === 'sw' ? 'Jenga himaya yako' : 'Build your empire'; desc = LANG === 'sw' ? 'Nunua biashara na magari kwenye simu (Biashara, Magari). Biashara zinaingiza pesa hata ukiwa mbali.' : 'Buy businesses and vehicles on your phone (Biashara, Magari). Businesses earn while you are away.'; }
  else if (state.ticket) { tag = 'Free roam'; title = 'Matchday night'; desc = 'Keep exploring Fumba. The richest fan online wears the crown.'; }
  else if (passportFull() && money() >= PRICES.vip) { title = 'Buy your VIP ticket'; desc = 'Salim sells them at the kiosk on the AfconCity plaza (K).'; }
  else if (passportFull()) { title = `Earn ${tsh(PRICES.vip - money())} more`; desc = EARN_HINTS[Math.floor(t / 9) % EARN_HINTS.length]; }
  else { const ns = nextStamp(); tag = 'Next stamp'; title = ns ? ns.sw : 'Fan Passport'; desc = ns ? `${ns.en}.` : ''; }
  ui.goalTag.textContent = tag; ui.goalTitle.textContent = title; ui.goalDesc.textContent = desc;
  ui.goalBarWrap.hidden = bar === null; if (bar !== null) ui.goalBar.style.width = `${clamp(bar, 0, 1) * 100}%`;
  const showProg = state.intro && !state.ticket;
  goalUI.prog.hidden = !showProg;
  if (showProg) {
    const n = stampCount(); goalUI.stamps.textContent = `${n}/${REQUIRED.length}`; goalUI.stampsBar.style.width = `${n / REQUIRED.length * 100}%`;
    goalUI.cash.textContent = `${fmtK(money())} / ${fmtK(PRICES.vip)}`; goalUI.cashBar.style.width = `${clamp(money() / PRICES.vip, 0, 1) * 100}%`;
  }
  const tg = jobTarget(); ui.goalDist.textContent = tg ? `${Math.round(Math.hypot(tg.x - P.x, tg.z - P.z))} m` : '';
}
function fmtK(n) { return n >= 1e6 ? `${(n / 1e6).toFixed(n % 1e6 ? 2 : 0)}M` : n >= 1000 ? `${Math.floor(n / 1000)}k` : String(Math.round(n)); }

/* ---------- area names ---------- */
let areaNow = '', areaTimer = 0;
function areaAt(x, z) {
  if (Math.hypot(x - BAR.x, z - BAR.z) < 18) return 'Mama Pwani Beach Bar';
  if (onPier(x, z) || Math.hypot(x - PIER.x, z - coastZ(PIER.x)) < 14) return 'Fumba Pier';
  if (z > coastZ(x) - 2 && tideDepth(x) > 0) return 'Seaweed Flats';
  if (z > coastZ(x) - 32) return 'Fumba Uptown Beach';
  const inRect = (r, w, d, pad) => Math.abs(x - r.x) < w / 2 + pad && Math.abs(z - r.z) < d / 2 + pad;
  if (pointInPoly(x, z, PLOT)) {
    const lx = (x - SC.x) / (S_OUT.rx + 6), lz = (z - SC.z) / (S_OUT.rz + 6); if (lx * lx + lz * lz < 1) return 'AfconCity Stadium';
    if (inRect(PLAZA, PLAZA.w, PLAZA.d, 4)) return 'Stadium Plaza';
    for (const p of PITCHES) if (inRect(p, p.w, p.l, 8)) return 'Training Pitches';
    for (const p of PARKS) if (inRect(p, p.w, p.d, 4)) return 'AfconCity Parking';
    if (inRect(AQUA, AQUA.w, AQUA.d, 8)) return 'Aquatics Centre';
    if (inRect(PARADE, PARADE.w, PARADE.d, 8)) return 'Parade Ground';
    return 'Zanzibar Sports City';
  }
  if (Math.abs(x - FZ.x) < FZ.w / 2 + 6 && Math.abs(z - FZ.z) < FZ.d / 2 + 6) return 'Fan Zone';
  const inR = (o, w, d, pad) => Math.abs(x - o.x) < w / 2 + pad && Math.abs(z - o.z) < d / 2 + pad;
  if (inR(SPICE, SPICE.w, SPICE.d, 6)) return 'Spice Farm';
  if (inR(MALL, MALL.w + 60, MALL.d + 130, 0) && z < MALL.z + MALL.d / 2 + 90) return 'Continental Mall';
  if (inR(BURJ, 120, 110, 4)) return 'Burj Zanzibar';
  if (inR(IIT, IIT.w + 30, IIT.d + 30, 4)) return 'IIT Madras Campus';
  if (inR(HOTEL, HOTEL.w + 60, 100, 0)) return 'AfconCity Hotel';
  if (inR(HOSP, HOSP.w + 40, HOSP.d + 110, 0)) return 'Fumba Hospital';
  if (inR(ZHC, 320, 260, 0)) return 'ZHC Towers';
  if (inR(ARENA, ARENA.w + 30, ARENA.d + 60, 0)) return 'Basketball Centre';
  if (inR(FILM, FILM.w, FILM.d, 0)) return 'Fumba Film Studios';
  if (Math.hypot(x - 200, z - 55) < 32) return 'Usiku Food Market';
  for (const zz of WORLD.zones) { if (zz.k === 'park' && pointInPoly(x, z, zz.p)) return 'Uptown Park'; if (zz.k === 'ind' && pointInPoly(x, z, zz.p)) return 'Industrial Area'; }
  if (Math.hypot(x - CLINIC.x, z - CLINIC.z) < 18) return 'Kliniki';
  const r = nearRoad(x, z, 6); if (r && r.c === 'T') return 'Fumba Road';
  for (const zz of WORLD.zones) if (zz.k === 'res' && pointInPoly(x, z, zz.p)) return 'Uptown Villas';
  return 'Fumba';
}
function updateArea(dt) {
  const a = areaAt(P.x, P.z);
  if (a !== areaNow) { areaNow = a; ui.areaName.textContent = a; ui.area.classList.remove('off'); areaTimer = 4.5; }
  if (areaTimer > 0) { areaTimer -= dt; if (areaTimer <= 0) ui.area.classList.add('off'); }
}

/* ---------- radar and full map ---------- */
const ICONS = () => [
  { k: 'B', x: BAR.x, z: BAR.z, c: '#f3b41b', l: 'Beach bar' },
  { k: 'F', x: NPC_BY_ID.ashura.x, z: NPC_BY_ID.ashura.z + 4, c: '#ff8a3d', l: 'Food market', st: 'chakula' },
  { k: 'H', x: NPC_BY_ID.rukia.x + 4, z: NPC_BY_ID.rukia.z, c: '#d86ad8', l: 'Kanga & henna', st: 'kanga' },
  { k: 'K', x: NPC_BY_ID.bibi.x, z: NPC_BY_ID.bibi.z, c: '#7fe39a', l: 'Swahili lesson', st: 'kiswahili' },
  { k: 'V', x: NPC_BY_ID.hamisi.x, z: NPC_BY_ID.hamisi.z, c: '#c98a4a', l: 'Spice farm', st: 'viungo' },
  { k: 'W', x: NPC_BY_ID.mwanaisha.x, z: NPC_BY_ID.mwanaisha.z, c: '#5fd17a', l: 'Seaweed co-op' },
  { k: 'J', x: NPC_BY_ID.nahodha.x, z: NPC_BY_ID.nahodha.z, c: '#22c2b8', l: 'Pier · boat trips' },
  { k: 'N', x: NPC_BY_ID.neema.x, z: NPC_BY_ID.neema.z, c: '#d7f23a', l: 'Volunteers', st: 'kujitolea' },
  { k: 'C', x: NPC_BY_ID.musa.x, z: NPC_BY_ID.musa.z, c: '#ff8a3d', l: 'Site work' },
  ...STOPS.map(s => ({ k: 'D', x: s.x, z: s.z, c: '#1e9b57', l: 'Daladala stop' })),
  { k: 'P', x: MARKET.x + 5, z: MARKET.z - 8, c: '#ff8a3d', l: 'Pizza runs' },
  { k: 'T', x: NPC_BY_ID.ali.x, z: NPC_BY_ID.ali.z, c: '#5fb8f0', l: 'Taxi shifts' },
  { k: 'R', x: RACE_START.x, z: RACE_START.z, c: '#e0553a', l: 'Bajaji race' },
  { k: 'G', x: NPC_BY_ID.baraka.x, z: NPC_BY_ID.baraka.z, c: '#7fe39a', l: 'Penalty bets', st: 'kandanda' },
  { k: 'S', x: SHOP.x, z: SHOP.z, c: '#22c2b8', l: 'Fan shop' },
  { k: '★', x: KIOSK.x, z: KIOSK.z, c: passportFull() && money() >= PRICES.vip && !state.ticket ? '#f3b41b' : '#c3bdd3', l: 'VIP tickets' },
  ...AGENTS.map(a => ({ k: 'P', x: a.x, z: a.z, c: '#1e9b57', l: 'Pesa agent' })),
  { k: 'O', x: 604, z: -97, c: '#f3b41b', l: 'Daladala depot' },
  { k: 'S', x: (PITCH.x0 + PITCH.x1) / 2, z: PITCH.z, c: '#f6f1e7', l: 'Beach football' },
  { k: 'U', x: PIER.x, z: PIER.z1 - 4, c: '#5fb8f0', l: 'Fishing' },
  { k: '+', x: CLINIC.x, z: CLINIC.z, c: '#5fd17a', l: 'Clinic' },
  ...STANDS.map(s => ({ k: '$', x: s.x, z: s.z, c: '#f7ead0', l: 'Rentals' })),
  { k: 'Z', x: NPC_BY_ID.hassan.x, z: NPC_BY_ID.hassan.z, c: '#f3b41b', l: 'Walking tours' },
  { k: 'M', x: NPC_BY_ID.rashid.x, z: NPC_BY_ID.rashid.z, c: '#5fb8f0', l: 'Car wash' },
  { k: 'L', x: NPC_BY_ID.mwajuma.x, z: NPC_BY_ID.mwajuma.z, c: '#e0553a', l: 'Tomato crates' },
  ...SHOPS.map(s => ({ k: '◆', x: s.fx, z: s.fz, c: phoneAd(s.id) ? '#d86ad8' : '#9a8fb8', l: 'Shopfronts' })),
  ...HOME.doors.map(d => d.h === myHome() ? { k: '⌂', x: d.ox, z: d.oz, c: '#22c2b8', l: 'Your home' } : { k: '⌂', x: d.ox, z: d.oz, c: '#9a8fb8', l: 'Rooms to let' }),
];
const MX = x => (x - MAP.x0) * MAP.k, MZ = z => (z - MAP.z0) * MAP.k;
function blip(c, x, y, k, col, r) { c.beginPath(); c.arc(x, y, r, 0, TAU); c.fillStyle = '#0c0e22'; c.fill(); c.lineWidth = 2.5; c.strokeStyle = col; c.stroke(); c.fillStyle = col; c.font = `800 ${Math.round(r * 1.15)}px ${FONT_B}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(k, x, y + 1); }
function drawRadar(t) {
  const c = ui.radar.getContext('2d'), W = ui.radar.width, H = ui.radar.height, cx = W / 2, cy = H * 0.6;
  const zoom = (playerVeh ? 1.05 : 1.5) * (W / 512) * 2;
  const fx = -Math.sin(cam.yaw), fz = -Math.cos(cam.yaw), th = -Math.PI / 2 - Math.atan2(fz, fx), ca = Math.cos(th), sa = Math.sin(th);
  const toR = (x, z) => { const dx = (x - P.x) * MAP.k * zoom, dz = (z - P.z) * MAP.k * zoom; return [cx + dx * ca - dz * sa, cy + dx * sa + dz * ca]; };
  c.save(); rrect(c, 0, 0, W, H, 26); c.clip();
  c.fillStyle = '#1b7c93'; c.fillRect(0, 0, W, H);
  c.save(); c.translate(cx, cy); c.rotate(th); c.scale(zoom, zoom); c.translate(-MX(P.x), -MZ(P.z)); c.globalAlpha = 0.95; c.drawImage(mapCanvas, 0, 0); c.globalAlpha = 1; c.restore();
  const ri = rushInfo();
  if (ri.active) { const [x, y] = toR(ri.spot.x, ri.spot.z); c.beginPath(); c.arc(x, y, ri.spot.r * MAP.k * zoom, 0, TAU); c.fillStyle = 'rgba(243,180,27,0.22)'; c.fill(); c.lineWidth = 3; c.strokeStyle = `rgba(243,180,27,${0.6 + Math.sin(t * 6) * 0.3})`; c.stroke(); }
  for (const cn of allCoins()) {
    const [x, y] = toR(cn.x, cn.z); if (x < -10 || y < -10 || x > W + 10 || y > H + 10) continue;
    c.beginPath(); c.arc(x, y, cn.kind === 1 ? 5 : cn.kind === 2 ? 5.5 : 3.2, 0, TAU); c.fillStyle = cn.kind === 2 ? '#7fe39a' : cn.kind === 1 ? '#ffc845' : '#f7ead0'; c.fill();
  }
  const inside = (x, y, m) => x > m && y > m && x < W - m && y < H - m;
  const clampE = (x, y, m) => { let dx = x - cx, dy = y - cy; const sx = (W / 2 - m) / Math.max(Math.abs(dx), 1e-3), sy = (cy - m) / Math.max(-dy, 1e-3), sy2 = (H - cy - m) / Math.max(dy, 1e-3); const s = Math.min(sx, dy < 0 ? sy : sy2, 1); return [cx + dx * s, cy + dy * s]; };
  for (const ic of ICONS()) { let [x, y] = toR(ic.x, ic.z); if (!inside(x, y, 14)) continue; blip(c, x, y, ic.k, ic.st && hasStamp(ic.st) ? '#7a7e88' : ic.c, 13); }
  for (const th2 of thieves) { if (th2.state !== 'flee' && th2.state !== 'rush') continue; let [x, y] = toR(th2.x, th2.z); if (!inside(x, y, 10)) [x, y] = clampE(x, y, 12); c.beginPath(); c.arc(x, y, 8 + Math.sin(t * 10) * 2, 0, TAU); c.fillStyle = '#ff4a3a'; c.fill(); }
  const arrowAng = (ry) => { const hx = Math.sin(ry), hz = Math.cos(ry); return Math.atan2(hx * sa + hz * ca, hx * ca - hz * sa) + Math.PI / 2; };
  for (const r of remotes.values()) { let [x, y] = toR(r.cx, r.cz); if (!inside(x, y, 10)) [x, y] = clampE(x, y, 12); c.save(); c.translate(x, y); c.rotate(arrowAng(r.ry)); c.fillStyle = '#22c2b8'; c.strokeStyle = '#0c0e22'; c.lineWidth = 2; c.beginPath(); c.moveTo(0, -10); c.lineTo(7, 7); c.lineTo(-7, 7); c.closePath(); c.fill(); c.stroke(); c.restore(); }
  const tg = jobTarget();
  if (tg) { let [x, y] = toR(tg.x, tg.z); const out = !inside(x, y, 14); if (out) [x, y] = clampE(x, y, 16); c.beginPath(); c.arc(x, y, out ? 9 : 11 + Math.sin(t * 5) * 2, 0, TAU); c.fillStyle = '#f3b41b'; c.fill(); c.lineWidth = 3; c.strokeStyle = '#0c0e22'; c.stroke(); }
  if (job && job.type === 'race' && job.cp + 1 < RACE_CPS.length) { const n2 = RACE_CPS[job.cp + 1]; const [x, y] = toR(n2[0], n2[1]); if (inside(x, y, 8)) { c.beginPath(); c.arc(x, y, 6, 0, TAU); c.strokeStyle = '#f3b41b'; c.lineWidth = 2; c.stroke(); } }
  const heading = playerVeh ? playerVeh.yaw : mode === 'ride' && ORDER.v ? ORDER.v.yaw : player.rotation.y;
  c.save(); c.translate(cx, cy); c.rotate(arrowAng(heading)); c.fillStyle = '#f7ead0'; c.strokeStyle = '#0c0e22'; c.lineWidth = 3; c.beginPath(); c.moveTo(0, -14); c.lineTo(10, 10); c.lineTo(0, 5); c.lineTo(-10, 10); c.closePath(); c.fill(); c.stroke(); c.restore();
  const nx = NORTH.x * ca - NORTH.z * sa, nz = NORTH.x * sa + NORTH.z * ca;
  let [ex, ey] = clampE(cx + nx * 1000, cy + nz * 1000, 18);
  c.beginPath(); c.arc(ex, ey, 13, 0, TAU); c.fillStyle = '#0c0e22'; c.fill(); c.fillStyle = '#f7ead0'; c.font = `900 17px ${FONT_D}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('N', ex, ey + 1);
  c.restore();
  c.save(); rrect(c, 1.5, 1.5, W - 3, H - 3, 25); c.lineWidth = 3; c.strokeStyle = 'rgba(0,0,0,0.5)'; c.stroke(); c.restore();
}
const BM = { zoom: 1, cx: 0, cz: 0, follow: true, drag: null };
function bigMapFit() { const cv = $('#bigmap'); return Math.min(cv.width / mapCanvas.width, cv.height / mapCanvas.height); }
function drawBigMap(t) {
  const cv = $('#bigmap'), dpr = Math.min(2, window.devicePixelRatio || 1);
  const cw = Math.max(200, Math.round(cv.clientWidth * dpr)), ch = Math.max(150, Math.round(cv.clientHeight * dpr));
  if (cv.width !== cw || cv.height !== ch) { cv.width = cw; cv.height = ch; }
  const c = cv.getContext('2d'), W = cv.width, H = cv.height;
  if (BM.follow) { BM.cx = P.x; BM.cz = P.z; }
  const s = bigMapFit() * BM.zoom;
  // keep the view inside the map
  const halfW = W / 2 / s / MAP.k, halfH = H / 2 / s / MAP.k;
  BM.cx = clamp(BM.cx, Math.min(MAP.x0 + halfW, (MAP.x0 + MAP.x1) / 2), Math.max(MAP.x1 - halfW, (MAP.x0 + MAP.x1) / 2));
  BM.cz = clamp(BM.cz, Math.min(MAP.z0 + halfH, (MAP.z0 + MAP.z1) / 2), Math.max(MAP.z1 - halfH, (MAP.z0 + MAP.z1) / 2));
  c.fillStyle = '#1b7c93'; c.fillRect(0, 0, W, H);
  c.save(); c.translate(W / 2 - MX(BM.cx) * s, H / 2 - MZ(BM.cz) * s); c.scale(s, s); c.drawImage(mapCanvas, 0, 0); drawMapLabels(c);
  const ri = rushInfo(); const rs = ri.active ? ri.spot : ri.nextSpot;
  c.beginPath(); c.arc(MX(rs.x), MZ(rs.z), rs.r * MAP.k, 0, TAU); c.fillStyle = ri.active ? 'rgba(243,180,27,0.3)' : 'rgba(243,180,27,0.12)'; c.fill(); c.lineWidth = 3 / s; c.setLineDash(ri.active ? [] : [8 / s, 6 / s]); c.strokeStyle = '#f3b41b'; c.stroke(); c.setLineDash([]);
  for (const ic of ICONS()) blip(c, MX(ic.x), MZ(ic.z), ic.k, ic.st && hasStamp(ic.st) ? '#7a7e88' : ic.c, 13 / s * dpr);
  const tg = jobTarget(); if (tg) { c.beginPath(); c.arc(MX(tg.x), MZ(tg.z), 10 / s * dpr, 0, TAU); c.fillStyle = '#f3b41b'; c.fill(); c.lineWidth = 3 / s; c.strokeStyle = '#0c0e22'; c.stroke(); }
  c.font = `700 ${Math.round(12 / s * dpr)}px ${FONT_B}`; c.textAlign = 'center';
  for (const r of remotes.values()) { c.beginPath(); c.arc(MX(r.cx), MZ(r.cz), 6 / s * dpr, 0, TAU); c.fillStyle = '#22c2b8'; c.fill(); c.lineWidth = 2.5 / s; c.strokeStyle = '#0c0e22'; c.stroke(); c.fillStyle = '#0c0e22'; c.fillText(displayName(r), MX(r.cx), MZ(r.cz) - 11 / s * dpr); }
  const heading = playerVeh ? playerVeh.yaw : mode === 'ride' && ORDER.v ? ORDER.v.yaw : player.rotation.y, a = 15 / s * dpr;
  c.save(); c.translate(MX(P.x), MZ(P.z)); c.rotate(Math.PI - heading); c.fillStyle = '#f7ead0'; c.strokeStyle = '#0c0e22'; c.lineWidth = 3 / s; c.beginPath(); c.moveTo(0, -a); c.lineTo(a * 0.7, a * 0.7); c.lineTo(0, a * 0.35); c.lineTo(-a * 0.7, a * 0.7); c.closePath(); c.fill(); c.stroke(); c.restore();
  c.restore();
  c.save(); c.translate(W - 50 * dpr, 50 * dpr); c.scale(dpr, dpr); c.fillStyle = 'rgba(12,14,34,0.85)'; c.beginPath(); c.arc(0, 0, 34, 0, TAU); c.fill(); c.rotate(Math.atan2(NORTH.x, -NORTH.z)); c.fillStyle = '#e0553a'; c.beginPath(); c.moveTo(0, -27); c.lineTo(8, -5); c.lineTo(-8, -5); c.closePath(); c.fill(); c.fillStyle = '#f7ead0'; c.beginPath(); c.moveTo(0, 27); c.lineTo(8, 5); c.lineTo(-8, 5); c.closePath(); c.fill(); c.font = `900 16px ${FONT_D}`; c.textAlign = 'center'; c.fillText('N', 0, -32); c.restore();
  const m = 100 * MAP.k * s; c.save(); c.scale(dpr, dpr); const mm = m / dpr; c.fillStyle = 'rgba(12,14,34,0.85)'; c.fillRect(12, H / dpr - 40, mm + 70, 28); c.fillStyle = '#f7ead0'; c.fillRect(22, H / dpr - 28, mm, 5); c.font = `700 13px ${FONT_B}`; c.textAlign = 'left'; c.fillText('100 m', 30 + mm, H / dpr - 21); c.restore();
  const [lat, lon] = toLatLon(P.x, P.z);
  $('#mapCoords').textContent = `You: ${Math.abs(lat).toFixed(4)}° S, ${lon.toFixed(4)}° E. Next coin rush ${ri.active ? 'is on now at ' + ri.spot.name : 'at ' + ri.nextSpot.name + ' in ' + fmtClock(ri.next)}. AfconCity stadium is ${Math.round(Math.hypot(SC.x - P.x, SC.z - P.z))} m away.`;
}
function wireBigMap() {
  const cv = $('#bigmap');
  const zoomBy = (f) => { BM.zoom = clamp(BM.zoom * f, 1, 8); drawBigMap(elapsed); };
  $('#mapIn').addEventListener('click', () => zoomBy(1.5)); $('#mapOut').addEventListener('click', () => zoomBy(1 / 1.5)); $('#mapMe').addEventListener('click', () => { BM.follow = true; drawBigMap(elapsed); });
  cv.addEventListener('wheel', (e) => { e.preventDefault(); zoomBy(e.deltaY < 0 ? 1.2 : 1 / 1.2); }, { passive: false });
  cv.addEventListener('pointerdown', (e) => { BM.drag = { id: e.pointerId, x: e.clientX, y: e.clientY }; cv.classList.add('drag'); try { cv.setPointerCapture(e.pointerId); } catch (err) {} });
  cv.addEventListener('pointermove', (e) => { if (!BM.drag || e.pointerId !== BM.drag.id) return; const dpr = Math.min(2, window.devicePixelRatio || 1), s = bigMapFit() * BM.zoom * MAP.k / dpr; BM.follow = false; BM.cx -= (e.clientX - BM.drag.x) / s; BM.cz -= (e.clientY - BM.drag.y) / s; BM.drag.x = e.clientX; BM.drag.y = e.clientY; drawBigMap(elapsed); });
  const end = () => { BM.drag = null; cv.classList.remove('drag'); }; cv.addEventListener('pointerup', end); cv.addEventListener('pointercancel', end);
}
function fmtClock(s) { s = Math.max(0, Math.ceil(s)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; }
function buildLegend() {
  const lg = $('#legend'); lg.innerHTML = '';
  const add = (k, c, l) => { const s = document.createElement('span'); const i = document.createElement('i'); i.style.background = c; i.textContent = k; s.append(i, document.createTextNode(l)); lg.append(s); };
  add('', '#f7ead0', 'You'); add('', '#22c2b8', 'Other fans'); add('', '#f3b41b', 'Goal');
  const seen = new Set(); for (const ic of ICONS()) { if (seen.has(ic.k + ic.c)) continue; seen.add(ic.k + ic.c); add(ic.k, ic.c, ic.l); }
  const s = document.createElement('span'); s.textContent = 'Map data © OpenStreetMap contributors, Google Open Buildings (CC BY 4.0), via Overture Maps'; s.style.color = 'var(--muted)'; lg.append(s);
}

/* ---------- HUD tick ---------- */
function updateHUD(dt, t) {
  shownCash = Math.abs(state.cash - shownCash) < 1 ? state.cash : lerp(shownCash, state.cash, 1 - Math.exp(-9 * dt));
  ui.cash.textContent = fmt(shownCash);
  hudX.pesa.textContent = fmt(state.bank || 0); hudX.pesaEl.classList.toggle('dim', !(state.bank > 0));
  hudX.food.style.width = `${state.food === undefined ? 100 : state.food}%`; hudX.food.classList.toggle('low', state.food < 25);
  const en = state.energy === undefined ? 100 : state.energy; hudX.en.style.width = `${en}%`; hudX.en.classList.toggle('low', en < 22);
  hudX.clockT.textContent = clockText(); hudX.clockD.textContent = dayName(); hudX.fresh.hidden = !isFresh() && !wellRested(); if (!hudX.fresh.hidden) hudX.fresh.textContent = wellRested() ? 'Well rested' : 'Fresh';
  hudX.wanted.hidden = !POLICE.on; if (POLICE.on) hudX.stars.textContent = '★'.repeat(POLICE.level);
  hudX.rain.hidden = WEATHER.rain < 0.2;
  ui.hp.style.width = `${state.hp}%`; ui.hp.classList.toggle('low', state.hp < 30);
  hudX.tRun = hudX.tRun || $('#tRun'); hudX.tRun.classList.toggle('tired', !!RT.tired);
  ui.st.style.width = `${RT.boost > now() ? 100 : RT.stamina}%`; ui.st.style.background = RT.boost > now() ? 'var(--turmeric)' : RT.tired ? 'var(--muted)' : '';
  ui.speedo.hidden = !playerVeh;
  if (playerVeh) { ui.kmh.textContent = Math.round(Math.abs(playerVeh.vf) * 3.6); ui.vehName.textContent = `KM/H · ${VEH[playerVeh.kind].name.toUpperCase()}${playerVeh.owned ? ` · ${playerVeh.g.fuel.toFixed(1)} L` : ''}`; ui.vhp.style.width = `${playerVeh.hp}%`; ui.kmh.style.color = Math.abs(playerVeh.vf) > 13.9 && Math.hypot(P.x - TRAFIKI.x, P.z - TRAFIKI.z) < 120 ? 'var(--loss)' : ''; }
  let timer = null, label = 'TIME';
  if (job && job.type === 'pizza') timer = job.limit - (now() - job.t0);
  else if (job && job.type === 'taxi' && job.phase === 'drop') timer = job.limit - (now() - job.t0);
  else if (job && job.type === 'race') { timer = Math.max(0, now() - job.t0); label = 'RACE'; }
  else if (job && (job.type === 'site' || job.type === 'volunteer' || job.type === 'match')) timer = job.limit - (now() - job.t0);
  else if (simTimer() !== null) timer = simTimer();
  else if (misTimer() !== null) timer = misTimer();
  ui.timer.hidden = timer === null;
  if (timer !== null) { ui.timerLabel.textContent = label; ui.timerVal.textContent = label === 'RACE' ? fmtTime(timer) : fmtClock(timer); ui.timer.classList.toggle('low', label !== 'RACE' && timer < 10); }
  const ri = rushInfo();
  if (ri.active) { ui.rush.hidden = false; ui.rush.classList.remove('soon'); ui.rushText.textContent = `Coin rush · ${ri.spot.name}`; ui.rushTime.textContent = fmtClock(ri.left); }
  else if (ri.next < 20) { ui.rush.hidden = false; ui.rush.classList.add('soon'); ui.rushText.textContent = `Coin rush at ${ri.nextSpot.name} in`; ui.rushTime.textContent = fmtClock(ri.next); }
  else ui.rush.hidden = true;
}

/* ---------- audio ---------- */
const AU = { ctx: null, master: null, on: true, noise: null, crowd: null, waves: null, music: null, engine: null };
try { AU.on = localStorage.getItem('afconcity-sound') !== 'off'; } catch (e) {}
function audioInit() {
  if (AU.ctx) { if (AU.ctx.state === 'suspended') AU.ctx.resume(); return; }
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext; AU.ctx = new Ctx();
    AU.master = AU.ctx.createGain(); AU.master.gain.value = AU.on ? 0.6 : 0; AU.master.connect(AU.ctx.destination);
    const len = AU.ctx.sampleRate * 2, buf = AU.ctx.createBuffer(1, len, AU.ctx.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    AU.noise = buf;
    const src = AU.ctx.createBufferSource(); src.buffer = buf; src.loop = true;
    const lp = AU.ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 420;
    const g = AU.ctx.createGain(); g.gain.value = 0.05;
    const lfo = AU.ctx.createOscillator(); lfo.frequency.value = 0.12; const lg = AU.ctx.createGain(); lg.gain.value = 0.03;
    lfo.connect(lg); lg.connect(g.gain); src.connect(lp); lp.connect(g); g.connect(AU.master); src.start(); lfo.start();
    AU.waves = g;
    AU.music = AU.ctx.createGain(); AU.music.gain.value = 0; AU.music.connect(AU.master);
    MUS.nextT = AU.ctx.currentTime + 0.1;
  } catch (e) { AU.ctx = null; }
}
function tone(freq, dur, o) {
  if (!AU.ctx) return; o = o || {};
  const t = AU.ctx.currentTime + (o.when || 0), osc = AU.ctx.createOscillator(), g = AU.ctx.createGain();
  osc.type = o.type || 'sine'; osc.frequency.setValueAtTime(freq, t); if (o.slide) osc.frequency.exponentialRampToValueAtTime(freq * o.slide, t + dur);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(o.vol || 0.15, t + (o.att || 0.012)); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(g); g.connect(o.dest || AU.master); osc.start(t); osc.stop(t + dur + 0.05);
}
function noiseHit(dur, freq, vol, when, type, dest) {
  if (!AU.ctx) return;
  const t = AU.ctx.currentTime + (when || 0), s = AU.ctx.createBufferSource(); s.buffer = AU.noise;
  const f = AU.ctx.createBiquadFilter(); f.type = type || 'bandpass'; f.frequency.value = freq; f.Q.value = 0.8;
  const g = AU.ctx.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(f); f.connect(g); g.connect(dest || AU.master); s.start(t, Math.random()); s.stop(t + dur + 0.05);
}
const sfx = {
  coin: (k) => { tone(k === 1 ? 1760 : 1568, 0.09, { type: 'triangle', vol: 0.12 }); tone(k === 1 ? 2637 : 2093, 0.22, { type: 'triangle', vol: 0.1, when: 0.06 }); if (k === 2) tone(3136, 0.25, { type: 'sine', vol: 0.08, when: 0.12 }); },
  cashOut: () => { noiseHit(0.05, 3000, 0.2); tone(880, 0.08, { type: 'square', vol: 0.04 }); },
  ding: () => { tone(988, 0.12, { type: 'triangle' }); tone(1480, 0.2, { type: 'triangle', when: 0.07 }); },
  deny: () => tone(180, 0.22, { type: 'square', vol: 0.06 }),
  win: () => { [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone(f, 0.3, { type: 'triangle', vol: 0.13, when: i * 0.08 })); noiseHit(0.1, 300, 0.4); },
  start: () => { tone(392, 0.12, { type: 'square', vol: 0.06 }); tone(587, 0.2, { type: 'square', vol: 0.06, when: 0.1 }); },
  beep: (go) => tone(go ? 1046 : 523, go ? 0.5 : 0.2, { type: 'square', vol: 0.08 }),
  rush: () => { [784, 988, 1175, 1568].forEach((f, i) => tone(f, 0.18, { type: 'triangle', vol: 0.12, when: i * 0.06 })); },
  hit: () => { tone(120, 0.3, { vol: 0.4, slide: 0.4 }); noiseHit(0.25, 600, 0.5); },
  crash: (imp) => { noiseHit(0.35, 400, Math.min(0.8, imp / 12)); tone(90, 0.25, { vol: Math.min(0.4, imp / 20), slide: 0.5 }); },
  thief: () => { tone(330, 0.12, { type: 'sawtooth', vol: 0.08 }); tone(247, 0.25, { type: 'sawtooth', vol: 0.08, when: 0.12 }); },
  horn: (d) => { const v = 0.08 * clamp(1 - d / 80, 0, 1); if (v < 0.005) return; tone(415, 0.35, { type: 'square', vol: v }); tone(523, 0.35, { type: 'square', vol: v * 0.8 }); },
  chat: () => tone(880, 0.07, { type: 'sine', vol: 0.05 }),
  clap: () => { noiseHit(0.09, 2200, 0.5); noiseHit(0.09, 1800, 0.4, 0.05); },
  kick: () => { tone(150, 0.2, { vol: 0.45, slide: 0.35 }); noiseHit(0.08, 1800, 0.25); },
  goal: () => { [392, 523.25, 659.25, 783.99].forEach((f, i) => tone(f, 0.3, { type: 'square', vol: 0.06, when: i * 0.07 })); noiseHit(1.2, 900, 0.18, 0.05); },
  miss: () => tone(220, 0.4, { type: 'sawtooth', vol: 0.07, slide: 0.6 }),
  boom: () => { tone(90, 0.6, { vol: 0.25, slide: 0.5 }); noiseHit(0.5, 400, 0.2); },
  jump: () => tone(300, 0.12, { type: 'sine', vol: 0.05, slide: 1.6 }),
  whistle: () => { if (!AU.ctx) return; [0, 0.32, 0.64].forEach((w, i) => { const t = AU.ctx.currentTime + w, o = AU.ctx.createOscillator(); o.type = 'square'; o.frequency.value = 2850; const lf = AU.ctx.createOscillator(); lf.frequency.value = 34; const lg = AU.ctx.createGain(); lg.gain.value = 140; lf.connect(lg); lg.connect(o.frequency); const g = AU.ctx.createGain(), d = i === 2 ? 0.7 : 0.22; g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.05, t + 0.02); g.gain.setValueAtTime(0.05, t + d - 0.04); g.gain.exponentialRampToValueAtTime(0.0001, t + d); o.connect(g); g.connect(AU.master); o.start(t); lf.start(t); o.stop(t + d + 0.05); lf.stop(t + d + 0.05); }); },
  roar: () => { if (!AU.ctx || AU.crowd) return; const s = AU.ctx.createBufferSource(); s.buffer = AU.noise; s.loop = true; const f = AU.ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 650; f.Q.value = 0.5; const g = AU.ctx.createGain(), t = AU.ctx.currentTime; g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.34, t + 1.6); g.gain.exponentialRampToValueAtTime(0.11, t + 7); s.connect(f); f.connect(g); g.connect(AU.master); s.start(); AU.crowd = { s, g }; },
  engineStart: () => {
    if (!AU.ctx || AU.engine) return;
    const o1 = AU.ctx.createOscillator(), o2 = AU.ctx.createOscillator(), lp = AU.ctx.createBiquadFilter(), g = AU.ctx.createGain(), am = AU.ctx.createGain(), lfo = AU.ctx.createOscillator(), lfoG = AU.ctx.createGain();
    o1.type = 'sawtooth'; o2.type = 'square'; lp.type = 'lowpass'; lp.frequency.value = 700; g.gain.value = 0.0001;
    lfo.frequency.value = 22; lfoG.gain.value = 0.5; lfo.connect(lfoG); lfoG.connect(am.gain); am.gain.value = 0.6;
    o1.connect(lp); o2.connect(lp); lp.connect(am); am.connect(g); g.connect(AU.master);
    o1.start(); o2.start(); lfo.start();
    g.gain.exponentialRampToValueAtTime(0.05, AU.ctx.currentTime + 0.3);
    AU.engine = { o1, o2, lp, g, lfo };
  },
  engineStop: () => { if (!AU.engine) return; const e = AU.engine, t = AU.ctx.currentTime; e.g.gain.cancelScheduledValues(t); e.g.gain.setValueAtTime(e.g.gain.value, t); e.g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3); setTimeout(() => { try { e.o1.stop(); e.o2.stop(); e.lfo.stop(); } catch (x) {} }, 400); AU.engine = null; },
};
function setSound(on) { AU.on = on; try { localStorage.setItem('afconcity-sound', on ? 'on' : 'off'); } catch (e) {} if (AU.master) AU.master.gain.value = on ? 0.6 : 0; segSet('[data-seg="sound"]', on ? 'on' : 'off'); }
/* procedural bar and fan-zone music: a light bongo-flava groove */
const MUS = { bpm: 104, step: 0, nextT: 0 };
const midi = n => 440 * Math.pow(2, (n - 69) / 12);
function musicSchedule() {
  if (!AU.ctx || !AU.music) return;
  const spb = 60 / MUS.bpm / 4;
  if (MUS.nextT < AU.ctx.currentTime - 0.5) MUS.nextT = AU.ctx.currentTime + 0.05;
  while (MUS.nextT < AU.ctx.currentTime + 0.3) {
    const s = MUS.step, bar = Math.floor(s / 16), k = s % 16, t = MUS.nextT - AU.ctx.currentTime, D = AU.music;
    if (k === 0 || k === 8 || (k === 11 && bar % 2)) tone(58, 0.22, { vol: 0.5, slide: 0.5, when: t, dest: D });
    if (k === 4 || k === 12) noiseHit(0.12, 1600, 0.35, t, 'bandpass', D);
    noiseHit(0.04, 7000, k % 2 ? 0.09 : 0.05, t, 'highpass', D);
    const chords = [[60, 64, 67], [57, 60, 64], [53, 57, 60], [55, 59, 62]], ch = chords[bar % 4];
    const pat = [0, null, 2, null, 1, null, 2, 1, 0, null, 2, null, 1, 2, null, 1];
    if (pat[k] !== null) tone(midi(ch[pat[k]] + 12), 0.28, { type: 'triangle', vol: 0.08, when: t, dest: D, att: 0.005 });
    if (k === 0 || k === 6 || k === 8 || k === 14) tone(midi(ch[0] - 12), 0.32, { type: 'triangle', vol: 0.18, when: t, dest: D });
    MUS.nextT += spb; MUS.step = (MUS.step + 1) % 64;
  }
}
function updateAudio(dt) {
  if (!AU.ctx) return;
  const t = AU.ctx.currentTime;
  const coastD = coastZ(P.x) - P.z;
  AU.waves.gain.setTargetAtTime(0.02 + 0.06 * clamp(1 - coastD / 160, 0, 1), t, 0.5);
  const dBar = Math.hypot(P.x - BAR.x, P.z - BAR.z), dFz = Math.hypot(P.x - FZ.x, P.z - (FZ.z - 40));
  const mv = (mode === 'play' || mode === 'menu') ? Math.max(Math.pow(clamp(1 - dBar / 75, 0, 1), 2), Math.pow(clamp(1 - dFz / 90, 0, 1), 2)) * 0.55 : 0;
  AU.music.gain.setTargetAtTime(mv, t, 0.4);
  if (mv > 0.001) musicSchedule(); else MUS.nextT = 0;
  if (AU.engine && playerVeh) { const s = Math.abs(playerVeh.vf), base = playerVeh.kind === 'boda' ? 46 : 34; AU.engine.o1.frequency.setTargetAtTime(base + s * 6.5, t, 0.08); AU.engine.o2.frequency.setTargetAtTime((base + s * 6.5) / 2, t, 0.08); AU.engine.lp.frequency.setTargetAtTime(500 + s * 90, t, 0.1); AU.engine.lfo.frequency.setTargetAtTime(14 + s * 2.5, t, 0.1); }
}

