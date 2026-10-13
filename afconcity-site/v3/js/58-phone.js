/* ===================== 58 phone: the player's simu, its apps, and the sponsored slots brands can book ===================== */
/* Press P (or tap Phone). Apps borrow from how people get around Zanzibar: boda and bajaji rides, food delivery,
   Pesa for money, SMS from your landlord. The featured banner and four app tiles are ad spaces brands can book;
   each opens the brand's page with links to their website, WhatsApp and phone. */
const PH = { open: false, app: 'home', arg: null, prev: 'play', stack: [], deliveries: [], toastTimer: 0, rideKind: 'boda', mapZoom: 2.2 };
const CONTACTS = {
  landlord: { name: 'Landlord', col: '#c98a4a', ini: 'K' }, pesa: { name: 'PESA', col: '#1e9b57', ini: 'P' }, amina: { name: 'Amina', col: '#d86ad8', ini: 'A' },
  omari: { name: 'Mzee Omari', col: '#f3b41b', ini: 'O' }, courier: { name: 'Chakula Express', col: '#ff8a3d', ini: 'C' }, afcon: { name: 'AfconCity', col: '#22c2b8', ini: 'AC' }, polisi: { name: 'Polisi Fumba', col: '#1b3fae', ini: 'PF' },
};
const PHONE_SLOTS = [
  { id: 'phb', name: 'Phone · featured banner', note: 'Top of every player’s phone home screen, also on the TV in players’ homes. Opens your brand page.', kind: 'phone', big: true },
  { id: 'ph1', name: 'Phone · app tile 1', note: 'An app icon in the Sponsored row of every phone. Opens your brand page.', kind: 'phone' },
  { id: 'ph2', name: 'Phone · app tile 2', note: 'An app icon in the Sponsored row of every phone. Opens your brand page.', kind: 'phone' },
  { id: 'ph3', name: 'Phone · app tile 3', note: 'An app icon in the Sponsored row of every phone. Opens your brand page.', kind: 'phone' },
  { id: 'ph4', name: 'Phone · app tile 4', note: 'An app icon in the Sponsored row of every phone. Opens your brand page.', kind: 'phone' },
];
const ICO = {
  map: '<path d="M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2z"/><path d="M9 4v14M15 6v14"/>',
  bag: '<rect x="3" y="7.5" width="18" height="12" rx="2"/><path d="M8.5 7.5V5h7v2.5M3 13h18"/>',
  wallet: '<path d="M3 7.5h16a2 2 0 0 1 2 2v9H5a2 2 0 0 1-2-2z"/><path d="M3 7.5l12-3.5v3.5"/><circle cx="17" cy="13.5" r="1.2"/>',
  moto: '<circle cx="5.5" cy="16.5" r="3"/><circle cx="18.5" cy="16.5" r="3"/><path d="M5.5 16.5l4-6h5l4 6M12 10.5L10.5 6H8M14.5 10.5l2-3h2"/>',
  bowl: '<path d="M3 11h18a9 9 0 0 1-18 0z"/><path d="M8.5 7.5c0-2 1.8-2 1.8-4M13.5 7.5c0-2 1.8-2 1.8-4"/>',
  chat: '<path d="M4 5h16v11H9.5L4 20z"/><path d="M8 9.5h8M8 12.5h5"/>',
  house: '<path d="M3 11l9-7 9 7"/><path d="M5.5 9.5V20h13V9.5M10 20v-6h4v6"/>',
  book: '<path d="M6 3.5h11a2 2 0 0 1 2 2v15H8a2 2 0 0 1-2-2z"/><path d="M6 18.5a2 2 0 0 1 2-2h11M10 8h6"/>',
  cam: '<path d="M3 8h4l2-3h6l2 3h4v11H3z"/><circle cx="12" cy="13" r="3.6"/>',
  crown: '<path d="M3 19h18M4 16.5L3 7l5 4 4-7 4 7 5-4-1 9.5z"/>',
  gear: '<circle cx="12" cy="12" r="3.2"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1"/>',
  mega: '<path d="M3 10v4h4l8 5V5L7 10z"/><path d="M18 9a4 4 0 0 1 0 6"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  web: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/>',
  wa: '<path d="M4 20l1.4-4.2A8 8 0 1 1 8.4 19z"/><path d="M9 9c0 3 3 6 6 6l1.2-1.6-2-1-1 1c-1-.4-2.2-1.6-2.6-2.6l1-1-1-2z"/>',
  tel: '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a1 1 0 0 1-1 1A16 16 0 0 1 4 5a1 1 0 0 1 1-1z"/>',
  pin: '<path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>',
};
const svgIco = (k) => `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${ICO[k] || ''}</svg>`;
const APPS = [
  { id: 'map', sw: 'Ramani', en: 'Map', col: '#1b7c93', ico: 'map' }, { id: 'jobs', sw: 'Kazi', en: 'Jobs', col: '#e0553a', ico: 'bag' },
  { id: 'pesa', sw: 'Pesa', en: 'Wallet', col: '#1e9b57', ico: 'wallet' }, { id: 'ride', sw: 'Usafiri', en: 'Rides', col: '#c98a00', ico: 'moto' },
  { id: 'food', sw: 'Chakula', en: 'Food', col: '#ff7a2d', ico: 'bowl' }, { id: 'msgs', sw: 'Ujumbe', en: 'Messages', col: '#1aa39a', ico: 'chat' },
  { id: 'house', sw: 'Nyumbani', en: 'Home', col: '#8a5a32', ico: 'house' }, { id: 'passport', sw: 'Pasipoti', en: 'Passport', col: '#3a46a8', ico: 'book' },
  { id: 'camera', sw: 'Kamera', en: 'Photo mode', col: '#3a3d45', ico: 'cam' }, { id: 'rich', sw: 'Matajiri', en: 'Rich list', col: '#a8842e', ico: 'crown' },
  { id: 'settings', sw: 'Mipangilio', en: 'Settings', col: '#5a5d6b', ico: 'gear' }, { id: 'ads', sw: 'Tangaza', en: 'Advertise', col: '#b04fb0', ico: 'mega' },
];

/* ---------- messages ---------- */
function phoneMsg(from, text, name) {
  state.msgs = Array.isArray(state.msgs) ? state.msgs : [];
  state.msgs.push({ f: from, n: name || '', x: String(text).slice(0, 420), t: clockNow(), r: 0 });
  if (state.msgs.length > 60) state.msgs.splice(0, state.msgs.length - 60);
  if (PH.open && PH.app === 'thread' && PH.arg === threadKey(from, name)) markRead(PH.arg);
  phoneToast(contactOf(from, name).name, text); updatePhoneBadge();
  if (PH.open && (PH.app === 'msgs' || PH.app === 'thread' || PH.app === 'home')) renderPhone();
}
const threadKey = (f, n) => f === 'landlord' ? 'landlord:' + (n || '') : f;
function contactOf(f, n) { const c = CONTACTS[f] || { name: f, col: '#5a5d6b', ini: '?' }; return f === 'landlord' && n ? Object.assign({}, c, { name: `${n} · landlord`, ini: n.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() }) : c; }
const unread = () => (state.msgs || []).filter(m => !m.r).length;
function markRead(key) { for (const m of state.msgs || []) if (threadKey(m.f, m.n) === key) m.r = 1; updatePhoneBadge(); }
function updatePhoneBadge() { const n = unread(), b = $('#phBadge'); if (b) { b.hidden = !n; b.textContent = n > 9 ? '9+' : String(n); } }
function phoneToast(from, text) {
  const el = $('#phToast'); if (!el || mode === 'intro' || PH.open) return;
  $('#phToastFrom').textContent = from; $('#phToastText').textContent = String(text).slice(0, 110) + (String(text).length > 110 ? '…' : '');
  el.hidden = false; el.classList.remove('in'); void el.offsetWidth; el.classList.add('in'); sfx.chat();
  clearTimeout(PH.toastTimer); PH.toastTimer = setTimeout(() => { el.hidden = true; }, 5000);
}

/* ---------- open, close, navigate ---------- */
function openPhone(app, arg) {
  if (PH.open) { phoneGo(app || 'home', arg); return; }
  if (!(mode === 'play' || mode === 'home' || mode === 'ride')) return;
  if (mode === 'play' && playerVeh && Math.abs(playerVeh.vf) > 3) { help('Pull over first: using a phone while driving is against the law in Tanzania.', 3200); sfx.deny(); return; }
  PH.prev = mode; PH.open = true; PH.stack = []; PH.app = app || 'home'; PH.arg = arg === undefined ? null : arg;
  mode = 'phone'; keys.clear(); if (document.pointerLockElement) document.exitPointerLock();
  if (PH.prev === 'play' && !playerVeh) playEmote(player, 'phone');
  $('#phone').hidden = false; $('#phToast').hidden = true; renderPhone(); $('#phHome').focus();
  state.stats.phone = (state.stats.phone || 0) + 1;
}
function closePhone() {
  if (!PH.open) return;
  PH.open = false; $('#phone').hidden = true;
  if (player && player.userData.emote === 'phone') player.userData.emote = null;
  if (mode === 'phone') mode = PH.prev === 'home' && HOME.inside ? 'home' : PH.prev === 'ride' && ORDER.state === 'riding' ? 'ride' : 'play';
  if (mode === 'home') renderHomePanel(); else canvas.focus();
}
function phoneGo(app, arg) { PH.stack.push([PH.app, PH.arg]); PH.app = app; PH.arg = arg === undefined ? null : arg; renderPhone(); const s = $('#phScreen'); if (s) s.scrollTop = 0; }
function phoneBack() { if (!PH.stack.length) { if (PH.app === 'home') closePhone(); else { PH.app = 'home'; PH.arg = null; renderPhone(); } return; } const [a, g] = PH.stack.pop(); PH.app = a; PH.arg = g; renderPhone(); }
function phoneKey(e) {
  if (e.code === 'Escape' || e.code === 'Backspace') { e.preventDefault(); phoneBack(); return true; }
  if (e.code === 'KeyP') { closePhone(); return true; }
  return true;
}

/* ---------- small DOM helpers ---------- */
function phEl(tag, cls, text) { const e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e; }
function phBtn(label, cls, fn) { const b = phEl('button', cls || 'ph-btn', label); b.type = 'button'; b.addEventListener('click', fn); return b; }
function phHead(root, sw, en) { const h = phEl('header', 'ph-head'); h.append(phEl('h3', '', sw), phEl('span', '', en)); root.append(h); }
function phRow(root, a, b, c) { const r = phEl('div', 'ph-row'); const l = phEl('div', 'ph-row-l'); l.append(phEl('b', '', a)); if (b) l.append(phEl('small', '', b)); r.append(l); if (c) r.append(c); root.append(r); return r; }
function setWaypoint(x, z, label) { RT.wp = { x, z, label }; closePhone(); help(`GPS set: <b class="hl">${escapeHtml(label)}</b>. Follow the yellow marker on your radar.`, 3500); sfx.ding(); }

/* ---------- sponsored content ---------- */
function phoneAd(id) {
  if (AD.phPreview && AD.phPreview.slot === id) return AD.phPreview.ad;
  const ad = AD.live[id]; return adActive(ad) ? ad : null;
}
const safeLink = (u) => { try { const x = new URL(String(u || '').trim()); return x.protocol === 'https:' ? x.href : ''; } catch (e) { return ''; } };
const waLink = (n) => { const d = String(n || '').replace(/[^0-9]/g, ''); return d.length >= 9 && d.length <= 15 ? `https://wa.me/${d}` : ''; };
const telLink = (n) => { const d = String(n || '').replace(/[^0-9+]/g, ''); const k = d.replace(/\+/g, ''); return k.length >= 9 && k.length <= 15 ? `tel:${d[0] === '+' ? '+' : ''}${k}` : ''; };
const dataImg = (s) => typeof s === 'string' && /^data:image\/(webp|jpeg|png);base64,/.test(s) ? s : '';
/* outside links: open them where the host allows it; where the view blocks new windows, show the address to copy */
function linkText(href) {
  const h = String(href || '');
  if (h.startsWith('mailto:')) return h.slice(7).split('?')[0];
  if (h.startsWith('tel:')) return h.slice(4);
  const wa = /^https:\/\/wa\.me\/(\d+)/.exec(h); if (wa) return '+' + wa[1];
  return h;
}
function showCopy(root, href) {
  if (!root) return;
  let box = root.querySelector(':scope > .ph-copy'); if (!box) { box = phEl('div', 'ph-copy'); root.append(box); }
  box.innerHTML = '';
  const txt = linkText(href), b = phBtn('Copy', 'ph-btn sm', async () => { try { await navigator.clipboard.writeText(txt); b.textContent = 'Copied'; } catch (e) { b.textContent = 'Select it and copy'; } });
  box.append(phEl('small', '', 'If nothing opened, this view blocks outside links. Copy the address instead:'), phEl('code', '', txt), b);
}
function openOut(e, href, root) {
  let w = null; try { w = window.open(href, '_blank'); } catch (err) { w = null; }
  if (w) { e.preventDefault(); try { w.opener = null; } catch (err) {} return true; }
  showCopy(root, href); return false;
}
function adCount(kind, id) { const m = AD.ph[kind]; m[id] = (m[id] || 0) + 1; }
function initials(s) { return String(s || '?').trim().split(/\s+/).map(w => w[0] || '').join('').slice(0, 2).toUpperCase() || '?'; }
function bannerEl(ad, mock) {
  const b = phEl('button', 'ph-banner'); b.type = 'button';
  if (ad) {
    const img = dataImg(ad.img);
    if (img) { const im = phEl('img'); im.src = img; im.alt = ad.brand || 'Sponsored'; b.append(im); }
    else { b.style.background = `linear-gradient(120deg, ${ad.c1 || '#141838'}, ${ad.c2 || '#232a63'})`; const t = phEl('div', 'ph-banner-t'); const h = phEl('b', '', ad.headline || ad.brand || ''); h.style.color = ad.fg || '#fff'; t.append(h, phEl('span', '', ad.sub || '')); b.append(t); }
    b.append(phEl('i', 'ph-adtag', 'Sponsored'));
    b.setAttribute('aria-label', `Sponsored: ${ad.brand || ad.headline || 'brand'}`);
    b.addEventListener('click', () => mock ? mock('phb') : phoneGo('brand', 'phb'));
  } else {
    b.classList.add('house'); const t = phEl('div', 'ph-banner-t'); t.append(phEl('b', '', 'Your brand here'), phEl('span', '', 'Featured on every fan’s phone in AfconCity')); b.append(t, phEl('i', 'ph-adtag', 'Ad space'));
    b.addEventListener('click', () => mock ? null : phoneGo('ads'));
  }
  return b;
}
function tileEl(id, mock) {
  const ad = phoneAd(id), b = phEl('button', 'ph-app sp'); b.type = 'button';
  const ic = phEl('span', 'ph-ico');
  if (ad) {
    const img = dataImg(ad.icon);
    if (img) { const im = phEl('img'); im.src = img; im.alt = ''; ic.append(im); } else { ic.style.background = ad.c1 || '#232a63'; ic.style.color = ad.fg || '#fff'; ic.append(phEl('b', '', initials(ad.brand || ad.headline))); }
    ic.append(phEl('i', 'ph-ad', 'Ad')); b.append(ic, phEl('span', 'ph-lbl', ad.brand || ad.headline || 'Sponsor'));
    b.addEventListener('click', () => mock ? mock(id) : phoneGo('brand', id));
  } else { b.classList.add('house'); ic.innerHTML = svgIco('plus'); b.append(ic, phEl('span', 'ph-lbl', 'Your app')); b.addEventListener('click', () => mock ? null : phoneGo('ads')); }
  return b;
}
function renderBrand(root, id, back) {
  const ad = phoneAd(id);
  if (!ad) { root.append(phEl('p', 'ph-note', 'This brand’s booking has ended.')); return; }
  const hero = phEl('div', 'ph-hero'), img = dataImg(ad.img);
  if (img) { const im = phEl('img'); im.src = img; im.alt = ''; hero.append(im); } else { hero.style.background = `linear-gradient(120deg, ${ad.c1 || '#141838'}, ${ad.c2 || '#232a63'})`; const h = phEl('b', '', ad.headline || ad.brand || ''); h.style.color = ad.fg || '#fff'; hero.append(h); }
  hero.append(phEl('i', 'ph-adtag', 'Sponsored'));
  root.append(hero);
  const body = phEl('div', 'ph-brand');
  const top = phEl('div', 'ph-brand-top'), ic = phEl('span', 'ph-ico'), icon = dataImg(ad.icon);
  if (icon) { const im = phEl('img'); im.src = icon; im.alt = ''; ic.append(im); } else { ic.style.background = ad.c1 || '#232a63'; ic.style.color = ad.fg || '#fff'; ic.append(phEl('b', '', initials(ad.brand || ad.headline))); }
  const nm = phEl('div'); nm.append(phEl('h3', '', ad.brand || ad.headline || 'Sponsor'), phEl('span', '', ad.sub || ad.headline || '')); top.append(ic, nm); body.append(top);
  if (ad.offer) { const of = phEl('div', 'ph-offer'); of.append(phEl('small', '', 'Offer for AfconCity fans'), phEl('b', '', ad.offer)); body.append(of); }
  if (ad.about) body.append(phEl('p', 'ph-about', ad.about));
  const links = [[safeLink(ad.link), 'web', 'Website'], [waLink(ad.wa), 'wa', 'WhatsApp'], [telLink(ad.tel), 'tel', 'Call']].filter(l => l[0]);
  const row = phEl('div', 'ph-links');
  for (const [href, k, label] of links) { const a = phEl('a', 'ph-link'); a.href = href; a.target = '_blank'; a.rel = 'noopener noreferrer sponsored'; a.innerHTML = svgIco(k); a.append(phEl('span', '', label)); a.addEventListener('click', (e) => { if (!(AD.phPreview && AD.phPreview.slot === id)) adCount('clicks', id); openOut(e, href, body); }); row.append(a); }
  if (links.length) { body.append(row); const info = phEl('p', 'ph-contact'); info.textContent = links.map(([href, k]) => `${k === 'web' ? 'Web' : k === 'wa' ? 'WhatsApp' : 'Phone'}: ${linkText(href).replace(/^https:\/\//, '')}`).join(' · '); body.append(info); } else body.append(phEl('p', 'ph-note', 'Links to the brand’s website, WhatsApp and phone appear here.'));
  body.append(phEl('p', 'ph-fine', 'Sponsored. Links open outside the game. AfconCity money is in-game only.'));
  if (back) body.append(phBtn('Back', 'ph-btn ghost', back));
  root.append(body);
  if (!(AD.phPreview && AD.phPreview.slot === id) && !back) adCount('opens', id);
}
/* the home screen, also drawn as a mock phone on the Advertise page */
function renderPhoneHome(root, mock) {
  const w = phEl('div', 'ph-widget');
  const tm = phEl('div', 'ph-w-time'); tm.append(phEl('b', '', clockText()), phEl('span', '', `${dayName()} · ${dayName(undefined, true)}`)); w.append(tm);
  const bars = phEl('div', 'ph-w-bars');
  for (const [l, v, c] of [['Energy', state.energy === undefined ? 100 : state.energy, '#b48cff'], ['Food', state.food === undefined ? 100 : state.food, '#ff9a3d']]) { const r = phEl('div', 'ph-w-bar'); r.append(phEl('span', '', l)); const bb = phEl('i'); const f = phEl('u'); f.style.width = `${Math.round(v)}%`; f.style.background = c; bb.append(f); r.append(bb); bars.append(r); }
  w.append(bars);
  const hm = myHome(), H = state.home;
  w.append(phEl('p', 'ph-w-note' + (H && H.owed ? ' due' : ''), hm ? (H.owed ? `Rent overdue: ${tsh(H.owed)}` : `Rent ${tsh(hm.rent)} due ${dayName(H.paidUntil)}`) : 'No home: find a room in Nyumbani'));
  root.append(w);
  root.append(bannerEl(phoneAd('phb'), mock));
  const grid = phEl('div', 'ph-grid');
  for (const a of APPS) {
    const b = phEl('button', 'ph-app'); b.type = 'button'; b.dataset.app = a.id;
    const ic = phEl('span', 'ph-ico'); ic.style.background = a.col; ic.innerHTML = svgIco(a.ico);
    if (a.id === 'msgs' && unread()) ic.append(phEl('i', 'ph-dot', String(Math.min(9, unread()))));
    b.append(ic, phEl('span', 'ph-lbl', a.sw)); b.title = a.en;
    if (mock) b.tabIndex = -1; else b.addEventListener('click', () => openApp(a.id));
    grid.append(b);
  }
  root.append(grid);
  const sp = phEl('div', 'ph-sponsored'); sp.append(phEl('p', 'ph-sec', 'Sponsored · Matangazo'));
  const row = phEl('div', 'ph-grid four'); for (const s of PHONE_SLOTS) if (!s.big) row.append(tileEl(s.id, mock)); sp.append(row);
  root.append(sp);
}
function openApp(id) {
  if (id === 'camera') { photoMode(); return; }
  if (id === 'map' && PH.prev === 'play') { closePhone(); openMap(); return; }
  if (id === 'ads' && PH.prev === 'play') { closePhone(); openPause('ads'); setTimeout(() => { const el = $('#adPhone'); if (el) el.scrollIntoView({ block: 'start' }); }, 60); return; }
  phoneGo(id === 'msgs' ? 'msgs' : id);
}
function photoMode() {
  closePhone();
  HUDV.photoPrev = HUDV.preset; setHudPreset('off', true);
  const eye = $('#hudEye'); if (eye) { eye.classList.add('hint'); setTimeout(() => eye.classList.remove('hint'), 4000); }
}

/* ---------- the screens ---------- */
function renderPhone() {
  const s = $('#phScreen'); if (!s) return;
  $('#phTime').textContent = clockText(); $('#phDayS').textContent = dayName();
  s.innerHTML = '';
  const fn = PHONE_APPS[PH.app] || PHONE_APPS.home;
  try { fn(s, PH.arg); } catch (e) { console.error(e); s.append(phEl('p', 'ph-note', 'This app could not open.')); }
  $('#phBack').hidden = PH.app === 'home';
}
const PHONE_APPS = {
  home: (s) => renderPhoneHome(s, null),
  brand: (s, id) => renderBrand(s, id),
  jobs: (s) => {
    phHead(s, 'Kazi', 'Jobs and ways to earn');
    if (job) { const c = phEl('div', 'ph-card'); c.append(phEl('small', '', 'Working now'), phEl('b', '', job.title || 'Job')); c.append(phBtn('Quit this job', 'ph-btn ghost', () => { failJobSilently(); help('You quit. No pay for this one.', 2600); renderPhone(); })); s.append(c); }
    const list = [['omari', 'Daladala shift', 'Mzee Omari · Uptown depot', 'Fares minus the TSh 15,000 hesabu'], ['mwanaisha', 'Seaweed harvest', 'Bi Mwanaisha · the beach', 'TSh 1,000 to 1,400 a kilo'], ['musa', 'Cement shift', 'Fundi Musa · Continental Mall site', tsh(PAY.site)], ['neema', 'Volunteer shift', 'Neema · stadium plaza', `${tsh(PAY.volunteer)} stipend`], ['juma', 'Pizza runs', 'Mzee Juma · Uptown Park', 'TSh 6,000 to 12,000'], ['ali', 'Bajaji taxi', 'Ali · by the Fan Zone', 'Fares from TSh 3,000'], ['nahodha', 'Fishing', 'Nahodha Salum · the pier', 'Sell your catch'], ['baraka', 'Penalty bets', 'Coach Baraka · training pitch', 'Double your stake'], ['race', 'Bajaji race', 'Start sign on Fumba Road', `Gold time ${tsh(PAY.raceGold)}`], ['kids', 'Beach football', 'Kids on the beach', `${tsh(PRICES.beachPrize)} prize`], ['hassan', 'Walking tour', 'Hassan · Uptown Gate', `${tsh(PAY.tour)} plus tips`], ['rashid', 'Car wash', 'Fundi Rashid · Fumba junction', tsh(PAY.wash)], ['mwajuma', 'Tomato crates', 'Bi Mwajuma · Usiku market', tsh(PAY.porter)]];
    for (const [id, a, b, pay] of list) {
      const p = id === 'race' ? RACE_START : id === 'kids' ? { x: (PITCH.x0 + PITCH.x1) / 2, z: PITCH.z - 8 } : NPC_BY_ID[id]; if (!p) continue;
      const d = Math.hypot(p.x - P.x, p.z - P.z);
      phRow(s, a, `${b} · ${pay} · ${d > 950 ? (d / 1000).toFixed(1) + ' km' : Math.round(d) + ' m'}`, phBtn('GPS', 'ph-btn sm', () => setWaypoint(p.x, p.z, a)));
    }
    s.append(phEl('p', 'ph-note', 'Errands: say hello to anyone on the street (E) and ask "Una kazi?". People pay TSh 3,000 to 15,000 by Pesa for a delivery.'));
  },
  pesa: (s) => {
    phHead(s, 'Pesa', 'Your wallet');
    const c = phEl('div', 'ph-card pesa'); c.append(phEl('small', '', 'Pesa balance'), phEl('b', 'big', tsh(state.bank || 0)), phEl('span', '', `Cash in your pocket: ${tsh(state.cash)}`)); s.append(c);
    s.append(phEl('p', 'ph-note', 'Money on Pesa is safe from pickpockets. Street stalls want cash: withdraw at a Pesa agent (real Vodacom fees).'));
    const btns = phEl('div', 'ph-btns');
    btns.append(phBtn('Nearest agent', 'ph-btn', () => { let b = null, bd = 1e9; for (const a of AGENTS) { const d = Math.hypot(a.x - P.x, a.z - P.z); if (d < bd) { bd = d; b = a; } } if (b) setWaypoint(b.x, b.z, 'Pesa agent'); }));
    const H = state.home, hm = myHome();
    if (hm && H.owed) btns.append(phBtn(`Pay rent ${tsh(H.owed)}`, 'ph-btn gold', () => { if (!payRent(false)) { sfx.deny(); help(`You need ${tsh(H.owed)}.`, 2500); } renderPhone(); }));
    s.append(btns);
    s.append(phEl('p', 'ph-sec', 'Statement'));
    const tx = (state.txns || []).slice(-14).reverse();
    if (!tx.length) s.append(phEl('p', 'ph-note', 'No transactions yet.'));
    for (const t of tx) { const amt = phEl('b', t.n >= 0 ? 'pos' : 'neg', `${t.n >= 0 ? '+' : '−'}${fmt(Math.abs(t.n))}`); phRow(s, t.l || (t.n >= 0 ? 'Received' : 'Paid'), `${dayName(t.t)} ${clockText(t.t)}`, amt); }
  },
  ride: (s) => {
    phHead(s, 'Usafiri', 'A ride comes to you');
    if (ORDER.state && ORDER.state !== 'leaving') {
      const og = orderGoal(), c = phEl('div', 'ph-card'); c.append(phEl('small', '', ORDER.state === 'riding' ? 'On your way' : 'Your ride'), phEl('b', '', og ? og.title : ''), phEl('span', '', og ? og.desc : ''));
      if (ORDER.state !== 'riding') c.append(phBtn('Cancel the ride', 'ph-btn ghost', () => { cancelOrder('You cancelled. No charge.'); renderPhone(); }));
      s.append(c); return;
    }
    const quick = phEl('div', 'ph-card'); quick.append(phEl('small', '', 'Stuck? Pick me up here'), phEl('span', '', 'The driver comes to where you stand, even off the road. Say where to when you get on.'));
    const qb = phEl('div', 'ph-btns'); qb.append(phBtn('Boda to me', 'ph-btn', () => { if (orderRide('boda', null)) PH.quotes = null; }), phBtn('Bajaji to me', 'ph-btn', () => { if (orderRide('bajaji', null)) PH.quotes = null; })); quick.append(qb); s.append(quick);
    const seg = phEl('div', 'ph-seg');
    for (const [k, l] of [['boda', 'Boda'], ['bajaji', 'Bajaji'], ['daladala', 'Daladala']]) { const b = phBtn(l, 'ph-segb' + (PH.rideKind === k ? ' on' : ''), () => { PH.rideKind = k; PH.quotes = null; renderPhone(); }); b.setAttribute('aria-pressed', String(PH.rideKind === k)); seg.append(b); }
    s.append(seg);
    if (POLICE.on) { s.append(phEl('p', 'ph-note due', 'No rider will pick you up while the police are after you.')); return; }
    if (job && RIDE_BLOCK_JOBS.includes(job.type)) { s.append(phEl('p', 'ph-note', 'Finish or quit your job before you order a ride.')); return; }
    const K = RIDE_KINDS[PH.rideKind];
    s.append(phEl('p', 'ph-note', `${K.note} ${PH.rideKind === 'daladala' ? 'The daladala stays on the road: it stops at the nearest kerb and you walk the last bit.' : 'The rider follows the real roads and takes you right to the door, even off the road.'} You pay on arrival (cash first, then Pesa).`));
    const key = `${PH.rideKind}|${Math.round(P.x / 20)}|${Math.round(P.z / 20)}|${HOME.inside}`;
    if (!PH.quotes || PH.quotes.key !== key) {
      const at = HOME.inside && myDoor() ? { x: myDoor().ox, z: myDoor().oz } : { x: P.x, z: P.z }, save = { x: P.x, z: P.z }; P.x = at.x; P.z = at.z;
      PH.quotes = { key, list: rideSpots().filter(sp => !(sp.home && HOME.inside)).map(sp => ({ sp, q: Math.hypot(sp.x - P.x, sp.z - P.z) < 60 ? null : rideQuote(PH.rideKind, sp) })) };
      P.x = save.x; P.z = save.z;
    }
    for (const { sp, q } of PH.quotes.list) {
      if (!q) continue;
      const b = phBtn(`Order · ${tsh(q.fare)}`, 'ph-btn sm' + (canPay(q.fare) ? '' : ' off'), () => { if (orderRide(PH.rideKind, sp)) PH.quotes = null; else renderPhone(); });
      phRow(s, sp.name, `${(q.route.L / 1000).toFixed(1)} km by road · about ${q.mins} min`, b);
    }
  },

  food: (s) => {
    phHead(s, 'Chakula', 'Delivered by boda');
    const pend = PH.deliveries;
    for (const d of pend) { const c = phEl('div', 'ph-card'); c.append(phEl('small', '', 'On its way'), phEl('b', '', d.name), phEl('span', '', `Arrives in about ${Math.max(1, Math.ceil(d.at - now()))} s`)); s.append(c); }
    s.append(phEl('p', 'ph-note', `Delivery fee ${tsh(PRICES.delivery)}. Pay by Pesa or cash on delivery. It reaches you wherever you are.`));
    for (const f of DELIVERY) { const tot = f.price + PRICES.delivery; phRow(s, f.name, `${f.desc} · ${tsh(f.price)} + delivery`, phBtn(tsh(tot), 'ph-btn sm' + (canPay(tot) ? '' : ' off'), () => orderFood(f))); }
  },
  msgs: (s) => {
    phHead(s, 'Ujumbe', 'Messages');
    const th = new Map();
    for (const m of state.msgs || []) { const k = threadKey(m.f, m.n); const t = th.get(k) || { f: m.f, n: m.n, last: m, un: 0 }; t.last = m; if (!m.r) t.un++; th.set(k, t); }
    const live = phEl('button', 'ph-thread'); live.type = 'button'; const li = phEl('span', 'ph-ava', '#'); li.style.background = '#232a63'; const lt = phEl('div'); lt.append(phEl('b', '', 'Fumba · live chat'), phEl('small', '', MP.room ? 'Everyone playing right now' : 'Nobody else is online')); live.append(li, lt); live.addEventListener('click', () => phoneGo('thread', '#live')); s.append(live);
    const arr = [...th.entries()].sort((a, b) => b[1].last.t - a[1].last.t);
    for (const [k, t] of arr) {
      const c = contactOf(t.f, t.n), b = phEl('button', 'ph-thread' + (t.un ? ' un' : '')); b.type = 'button';
      const av = phEl('span', 'ph-ava', c.ini); av.style.background = c.col; const tx = phEl('div'); tx.append(phEl('b', '', c.name), phEl('small', '', t.last.x));
      b.append(av, tx, phEl('time', '', `${clockText(t.last.t)}`)); if (t.un) b.append(phEl('i', 'ph-dot', String(t.un)));
      b.addEventListener('click', () => phoneGo('thread', k)); s.append(b);
    }
    if (!arr.length) s.append(phEl('p', 'ph-note', 'No messages yet.'));
  },
  thread: (s, key) => {
    if (key === '#live') {
      phHead(s, 'Fumba', 'Live chat with everyone online');
      const box = phEl('div', 'ph-bubbles');
      for (const li of [...ui.chatlog.children].slice(-30)) { const b = li.querySelector('b'); const m = phEl('div', 'ph-bub' + (li.classList.contains('sys') ? ' sys' : '')); if (b) m.append(phEl('b', '', b.textContent)); m.append(document.createTextNode(li.textContent.slice(b ? b.textContent.length : 0))); box.append(m); }
      if (!box.children.length) box.append(phEl('p', 'ph-note', MP.room ? 'Say jambo to the fans in Fumba.' : 'Share the game with friends to chat with them here.'));
      s.append(box);
      if (MP.room) { const f = phEl('form', 'ph-send'); const inp = phEl('input'); inp.maxLength = 90; inp.placeholder = 'Message everyone…'; inp.setAttribute('aria-label', 'Message'); inp.addEventListener('keydown', (e) => e.stopPropagation()); f.append(inp, phBtn('Send', 'ph-btn sm', () => {})); f.addEventListener('submit', (e) => { e.preventDefault(); sendChat(inp.value); inp.value = ''; setTimeout(renderPhone, 50); }); f.querySelector('button').type = 'submit'; s.append(f); }
      return;
    }
    const ms = (state.msgs || []).filter(m => threadKey(m.f, m.n) === key); const c = ms.length ? contactOf(ms[0].f, ms[0].n) : { name: 'Messages' };
    phHead(s, c.name, 'SMS'); markRead(key);
    const box = phEl('div', 'ph-bubbles'); for (const m of ms.slice(-25)) { const b = phEl('div', 'ph-bub'); b.append(document.createTextNode(m.x), phEl('time', '', `${dayName(m.t)} ${clockText(m.t)}`)); box.append(b); } s.append(box);
    setTimeout(() => { box.scrollTop = box.scrollHeight; }, 0);
  },
  house: (s) => {
    phHead(s, 'Nyumbani', 'Your home and places to let');
    const hm = myHome(), H = state.home, d = myDoor();
    if (hm) {
      const c = phEl('div', 'ph-card'); c.append(phEl('small', '', hm.where), phEl('b', '', hm.full), phEl('span', H.owed ? 'due' : '', H.owed ? `Rent overdue ${tsh(H.owed)} · pay by ${dayName(H.graceUntil, true)} ${clockText(H.graceUntil)}` : `${tsh(hm.rent)} a week · paid until ${dayName(H.paidUntil, true)} ${clockText(H.paidUntil)}`));
      const bt = phEl('div', 'ph-btns');
      if (d && !HOME.inside) { bt.append(phBtn('GPS home', 'ph-btn', () => setWaypoint(d.ox, d.oz, `Home · ${hm.name}`))); const dist = Math.hypot(d.ox - P.x, d.oz - P.z); if (dist > 60 && !ORDER.state) bt.append(phBtn('Order a boda home', 'ph-btn', () => orderRide('boda', { name: `Home · ${hm.name}`, x: d.ox, z: d.oz, home: true }))); }
      if (H.owed) bt.append(phBtn(`Pay ${tsh(H.owed)}`, 'ph-btn gold', () => { if (!payRent(false)) { sfx.deny(); help(`You need ${tsh(H.owed)}.`, 2500); } renderPhone(); }));
      c.append(bt); s.append(c);
    } else s.append(phEl('p', 'ph-note due', 'You have no home. Rent one below: without a bed you can only nap on the street, and thieves love a sleeping fan.'));
    s.append(phEl('p', 'ph-sec', 'To let in Fumba'));
    for (const h of HOMES) {
      const c = phEl('div', 'ph-card let' + (hm === h ? ' mine' : '')); c.append(phEl('small', '', `${h.where}`), phEl('b', '', h.full), phEl('span', 'rent', `${tsh(h.rent)} a week`));
      const ul = phEl('ul'); for (const p of h.perks) ul.append(phEl('li', '', p)); c.append(ul);
      const bt = phEl('div', 'ph-btns'); const dd = HOME.doors.find(q => q.h === h);
      if (dd && hm !== h) bt.append(phBtn('GPS', 'ph-btn sm', () => setWaypoint(dd.ox, dd.oz, h.full)));
      if (hm !== h) bt.append(phBtn(`Rent now · ${tsh(h.rent)}`, 'ph-btn sm' + (canPay(h.rent) && !(H && H.owed) ? '' : ' off'), () => { if (H && H.owed) { help('Clear the rent you owe first.', 2500); sfx.deny(); return; } if (!canPay(h.rent)) { sfx.deny(); help(`You need ${tsh(h.rent)} for the first week.`, 2600); return; } spend(h.rent, `Rent · ${h.name}`); if (HOME.inside) leaveHome(); moveIn(h, true); renderPhone(); }));
      else bt.append(phEl('span', 'ph-tag', 'Your home'));
      c.append(bt); s.append(c);
    }
  },
  passport: (s) => {
    phHead(s, 'Pasipoti', `Fan Passport · ${stampCount()} of ${REQUIRED.length}`);
    for (const st of STAMPS) { const r = phRow(s, st.sw, st.en + (st.req ? '' : ' · bonus'), phEl('span', 'ph-stamp' + (hasStamp(st.id) ? ' on' : ''), hasStamp(st.id) ? '✓' : '')); if (hasStamp(st.id)) r.classList.add('done'); }
  },
  rich: (s) => {
    phHead(s, 'Matajiri', 'Richest fans online now');
    const rows = [{ name: `${state.nick || 'You'} (you)`, v: money(), me: true }]; for (const r of remotes.values()) rows.push({ name: displayName(r), v: r.cash });
    rows.sort((a, b) => b.v - a.v);
    rows.forEach((r, i) => { const rr2 = phRow(s, `${i + 1}. ${r.name}`, i === 0 && rows.length > 1 ? 'Wears the crown' : '', phEl('b', 'pos', tsh(r.v))); if (r.me) rr2.classList.add('me'); });
    if (rows.length === 1) s.append(phEl('p', 'ph-note', 'Nobody else is online. Share the game to compete.'));
  },
  settings: (s) => {
    phHead(s, 'Mipangilio', 'Settings');
    const seg = (label, opts, cur, fn) => { const r = phEl('div', 'ph-opt'); r.append(phEl('span', '', label)); const g = phEl('div', 'ph-seg'); for (const [v, l] of opts) { const b = phBtn(l, 'ph-segb' + (cur === v ? ' on' : ''), () => { fn(v); renderPhone(); }); b.setAttribute('aria-pressed', String(cur === v)); g.append(b); } r.append(g); s.append(r); };
    seg('On-screen display', [['full', 'Full'], ['min', 'Minimal'], ['off', 'Off']], HUDV.preset, (v) => setHudPreset(v));
    seg('Time of day', [['live', 'Live clock'], ['day', 'Day'], ['night', 'Night']], timeMode(), setTimeMode);
    seg('Sound', [['on', 'On'], ['off', 'Off']], AU.on ? 'on' : 'off', (v) => { audioInit(); setSound(v === 'on'); });
    seg('Graphics', [['high', 'High'], ['low', 'Fast']], gfx, (v) => { gfx = v; try { localStorage.setItem(GFX_KEY, gfx); } catch (e) {} segSet('[data-seg="gfx"]', gfx); setShadowRes(); resizeAll(); applyLight(); armWatch(); });
    s.append(phEl('p', 'ph-note', 'Press H any time to cycle the on-screen display. More options in the pause menu.'));
  },
  ads: (s) => {
    phHead(s, 'Tangaza', 'Advertise on AfconCity phones');
    s.append(phEl('p', 'ph-note', 'Brands can book the featured banner at the top of every player’s phone, the four Sponsored app tiles, three shopfronts in the streets and the radio at the beach bar. Each opens a brand page with your offer and buttons to your website, WhatsApp and phone.'));
    for (const sl of PHONE_SLOTS.concat(SHOPS, [RADIO_SLOT])) { const ad = AD.live[sl.id], live = adActive(ad), rate = AD.rates[sl.id]; phRow(s, sl.name.replace('Phone · ', ''), live ? `Booked${ad.brand ? ': ' + ad.brand : ''}${ad.end ? ' until ' + ad.end : ''}` : `Available${rate ? ' · ' + tsh(rate) + ' a month' : ''}`); }
    const ch = contactHref(null);
    if (ch) { const a = phEl('a', 'ph-btn gold', 'Book an ad space'); a.href = ch; a.target = '_blank'; a.rel = 'noopener'; a.addEventListener('click', (e) => openOut(e, ch, s)); s.append(a, phEl('p', 'ph-contact', `Bookings: ${linkText(ch)}`)); }
    else s.append(phEl('p', 'ph-note', 'Bookings open soon. Ask the AfconCity team for dates and rates.'));
    if (PH.prev === 'play') s.append(phBtn('See every ad space', 'ph-btn ghost', () => openApp('ads')));
  },
  map: (s) => {
    phHead(s, 'Ramani', 'Where you are');
    const cv = phEl('canvas', 'ph-map'); cv.width = 600; cv.height = 600; s.append(cv);
    const c = cv.getContext('2d'), k = PH.mapZoom; c.fillStyle = '#1b7c93'; c.fillRect(0, 0, 600, 600);
    c.save(); c.translate(300, 300); c.scale(k, k); c.translate(-MX(P.x), -MZ(P.z)); c.drawImage(mapCanvas, 0, 0); c.restore();
    const pt = (x, z) => [300 + (MX(x) - MX(P.x)) * k, 300 + (MZ(z) - MZ(P.z)) * k];
    const d = myDoor(); if (d) { const [x, y] = pt(d.ox, d.oz); blip(c, x, y, '⌂', '#22c2b8', 16); }
    const tg = jobTarget(); if (tg) { const [x, y] = pt(tg.x, tg.z); c.beginPath(); c.arc(x, y, 12, 0, TAU); c.fillStyle = '#f3b41b'; c.fill(); }
    c.beginPath(); c.arc(300, 300, 11, 0, TAU); c.fillStyle = '#f7ead0'; c.fill(); c.lineWidth = 4; c.strokeStyle = '#0c0e22'; c.stroke();
    const z = phEl('div', 'ph-btns'); z.append(phBtn('+', 'ph-btn sm', () => { PH.mapZoom = Math.min(6, PH.mapZoom * 1.5); renderPhone(); }), phBtn('−', 'ph-btn sm', () => { PH.mapZoom = Math.max(0.6, PH.mapZoom / 1.5); renderPhone(); }));
    s.append(z, phEl('p', 'ph-note', `${areaAt(P.x, P.z)} · ${dayName()} ${clockText()}`));
  },
};

/* ---------- rides ---------- */
function rideFare(d, kind) { const km = d / 1000; return kind === 'bajaji' ? Math.max(3000, roundTo(2500 + km * 1500, 500)) : Math.max(2000, roundTo(1500 + km * 1000, 500)); }
function rideSpots() {
  const out = [], hm = myHome(), d = myDoor();
  if (hm && d) out.push({ id: 'home', name: `Home · ${hm.name}`, x: d.ox, z: d.oz, home: true });
  const st = (id) => STOPS.find(s => s.id === id), n = (id) => NPC_BY_ID[id];
  const add = (id, name, p, dx, dz) => { if (p) out.push({ id, name, x: p.x + (dx || 0), z: p.z + (dz || 0) }); };
  add('uptown', 'Uptown Gate', st('uptown')); add('market', 'Usiku food market', n('ashura'), 0, 4); add('beach', 'Mama Pwani beach bar', BAR, 0, -12);
  add('pier', 'Fumba pier', n('nahodha')); add('fanzone', 'Fan Zone', st('fanzone')); add('afcon', 'AfconCity stadium', st('afcon'));
  add('mall', 'Continental Mall site', n('musa')); add('spice', 'Spice farm', n('hamisi')); add('clinic', 'Kliniki', CLINIC, 0, 6); add('town', 'Fumba Town', st('town'));
  return out;
}
function safeSpot(x, z) {
  const ok = (a, b) => walkable(a, b) && !pointBlocked(a, b, 0.6);
  if (ok(x, z)) return { x, z };
  for (let r = 1; r < 40; r += 1) for (let k = 0; k < 12; k++) { const a = k / 12 * TAU, px = x + Math.cos(a) * r, pz = z + Math.sin(a) * r; if (ok(px, pz)) return { x: px, z: pz }; }
  return { x, z };
}
function bookRide(sp, fare, mins) {
  if (POLICE.on || job) { sfx.deny(); return; }
  if (!canPay(fare)) { sfx.deny(); help(`You need ${tsh(fare)} for the ride.`, 2500); return; }
  const kind = PH.rideKind;
  closePhone(); if (HOME.inside) leaveHome();
  if (playerVeh) exitVehicle(true);
  spend(fare, kind === 'boda' ? 'Boda ride' : 'Bajaji ride');
  const from = { x: P.x, z: P.z }, to = safeSpot(sp.x, sp.z);
  travel({ eyebrow: `${kind === 'boda' ? 'Boda' : 'Bajaji'} · ${tsh(fare)}`, title: sp.name.toUpperCase(), sub: `${areaAt(from.x, from.z)} → ${sp.name}`, facts: [kind === 'boda' ? pick(['Boda boda riders wait at every junction in Fumba. Helmets are the law.', 'The name comes from "border border": bike taxis that once crossed the Kenya–Uganda border.']) : pick(['Bajaji is the Swahili name for the auto-rickshaw: three wheels, a roof, room for three.', 'Bajaji drivers often decorate the back with stickers and football slogans.']), `About ${mins} minutes.`], ms: 2600, from, to }, () => {
    P.x = to.x; P.z = to.z; player.position.set(P.x, groundY(P.x, P.z), P.z); speed = 0; addMinutes(mins);
    if (sp.home) { const d = myDoor(); if (d) { player.rotation.y = d.ry + Math.PI; cam.yaw = d.ry; } }
    else cam.yaw = player.rotation.y + Math.PI;
    if (RT.wp && Math.hypot(RT.wp.x - P.x, RT.wp.z - P.z) < 40) RT.wp = null;
    state.stats.rides = (state.stats.rides || 0) + 1;
  });
}

/* ---------- food delivery ---------- */
const DELIVERY = [
  { id: 'pizza', name: 'Zanzibar pizza', desc: '+40 health', price: 4000, hp: 40, food: 60 },
  { id: 'pilau', name: 'Pilau ya kuku', desc: 'Spiced rice and chicken · very filling', price: 7000, hp: 35, food: 75 },
  { id: 'chips', name: 'Chips mayai', desc: 'Chip omelette', price: 4000, hp: 30, food: 55 },
  { id: 'mishkaki', name: 'Mishkaki and chips', desc: 'Grilled skewers', price: 8000, hp: 40, food: 70 },
  { id: 'kahawa', name: 'Kahawa na kashata', desc: 'Coffee: +15 energy', price: 1000, hp: 5, food: 10, energy: 15 },
  { id: 'madafu', name: 'Madafu', desc: 'A fresh coconut to drink', price: 1500, hp: 10, food: 15 },
];
function orderFood(f) {
  const tot = f.price + PRICES.delivery;
  if (!canPay(tot)) { sfx.deny(); help(`You need ${tsh(tot)}.`, 2400); return; }
  spend(tot, `${f.name} · delivery`);
  PH.deliveries.push({ f, name: f.name, at: now() + (HOME.inside ? 25 : 40) });
  phoneMsg('courier', `Order received: ${f.name}. A rider is on the way.`);
}
function deliver(d) {
  const f = d.f; heal(f.hp); feed(f.food); if (f.energy) rest(f.energy);
  if (f.id === 'pizza') { state.ate.pizza = 1; if (state.ate.pizza && state.ate.miwa) giveStamp('chakula'); }
  if (mode === 'play' && !playerVeh) playEmote(player, 'drink');
  phoneMsg('courier', `Delivered: ${f.name}. Karibu chakula!`);
  if (HOME.inside) { HOME.flash = `The rider brought your ${f.name.toLowerCase()} to the door.`; renderHomePanel(); }
}

/* ---------- tick ---------- */
function updatePhone(dt) {
  for (let i = PH.deliveries.length - 1; i >= 0; i--) if (now() >= PH.deliveries[i].at && (mode === 'play' || mode === 'home' || mode === 'phone' || mode === 'menu')) { const d = PH.deliveries.splice(i, 1)[0]; deliver(d); }
  if (RT.wp && !job && Math.hypot(RT.wp.x - P.x, RT.wp.z - P.z) < 8 && mode === 'play') { note(`You have arrived: ${RT.wp.label}`); RT.wp = null; }
  if (PH.open) {
    if (PH.app === 'home') for (const s of PHONE_SLOTS) { if (phoneAd(s.id) && !(AD.phPreview && AD.phPreview.slot === s.id)) AD.ph.views[s.id] = (AD.ph.views[s.id] || 0) + dt; }
    PH.tick = (PH.tick || 0) + dt; if (PH.tick > 5 && (PH.app === 'home' || PH.app === 'food')) { PH.tick = 0; const sc = $('#phScreen'), st = sc.scrollTop; renderPhone(); sc.scrollTop = st; }
    $('#phTime').textContent = clockText();
  }
  if (HOME.inside && phoneAd('phb')) AD.ph.views.tv = (AD.ph.views.tv || 0) + dt;
}
function wirePhone() {
  $('#phBack').addEventListener('click', phoneBack);
  $('#phHome').addEventListener('click', () => { PH.stack = []; PH.app = 'home'; PH.arg = null; renderPhone(); });
  $('#phClose').addEventListener('click', closePhone);
  $('#btnPhone').addEventListener('click', () => (PH.open ? closePhone() : openPhone()));
  $('#phToast').addEventListener('click', () => { $('#phToast').hidden = true; openPhone('msgs'); });
  updatePhoneBadge();
}
