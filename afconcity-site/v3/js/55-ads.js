/* ===================== 55 ads: bookable billboards, the owner's billboard desk, player feedback and play stats ===================== */
/* Shared data (db capability), written only by the artifact's owner and editors:
     billboards/<slot>   { brand, headline, sub, c1, c2, fg, img (data URL), start, end, status: 'live'|'paused', updatedAt }
                         phone slots (phb, ph1..ph4) add: icon (square data URL), offer, about, link (https), wa, tel
     config/ads          { contact, rates: { <slot>: TSh per month } }
   Each signed-in tester (Contributor or above) writes only their own:
     feedback/<id>, feedback/<id>/items/<item>   reports with where they were and how the game ran
     stats/<id>          one rolling document of play stats and billboard view time */
const AD = { db: null, user: null, canEdit: false, uid: null, write: null, live: {}, texCache: new Map(), preview: null, phPreview: null, contact: '', rates: {}, view: null, seen: {}, ph: { views: {}, opens: {}, clicks: {} }, lastStats: '', statsT: 0, fps: [], ready: false };
const DALA_SLOT = { id: 'dala', name: 'Daladala backs', note: 'Painted on the back of every daladala on Fumba Road, including the one players drive', kind: 'dala' };
const boardSlots = () => BOARDS.concat([DALA_SLOT], SHOPS);
const allSlots = () => boardSlots().concat(PHONE_SLOTS, [RADIO_SLOT]);
const SUGGESTED_RATE = { b1: 300000, b2: 200000, b3: 200000, b4: 250000, b5: 150000, b6: 250000, b7: 150000, dala: 400000, phb: 350000, ph1: 150000, ph2: 150000, ph3: 150000, ph4: 150000, sf1: 250000, sf2: 250000, sf3: 200000, radio: 150000 };
const todayISO = () => new Date().toISOString().slice(0, 10);
function adActive(ad) { if (!ad || ad.status !== 'live') return false; const d = todayISO(); return (!ad.start || ad.start <= d) && (!ad.end || ad.end >= d); }

/* ---------- textures ---------- */
function fitImage(img, w, h) { const c = mkCanvas(w, h), x = c.getContext('2d'); x.fillStyle = '#111'; x.fillRect(0, 0, w, h); const k = Math.max(w / img.width, h / img.height), iw = img.width * k, ih = img.height * k; x.drawImage(img, (w - iw) / 2, (h - ih) / 2, iw, ih); return c; }
function loadImg(src) { return new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = rej; im.src = src; }); }
async function creativeTex(ad, key) {
  if (AD.texCache.has(key)) return AD.texCache.get(key);
  let tex;
  if (ad.img) { const im = await loadImg(ad.img); tex = texOf(fitImage(im, 1024, 512), { clamp: true }); }
  else tex = adTex(String(ad.headline || ad.brand || '').slice(0, 40), String(ad.sub || '').slice(0, 70), [ad.c1 || '#141838', ad.c2 || '#232a63'], ad.fg || '#ffffff');
  AD.texCache.set(key, tex);
  return tex;
}
function setSlotTex(slot, tex) {
  if (slot.kind === 'dala') { for (const d of DALA_BACKS) { d.mat.map = tex || d.def; d.mat.needsUpdate = true; } return; }
  slot.mat.map = tex || slot.def; slot.mat.emissiveMap = tex || slot.def; slot.mat.needsUpdate = true;
}
async function applyAds() {
  for (const slot of boardSlots()) {
    try {
      if (AD.preview && AD.preview.slot === slot.id) { setSlotTex(slot, AD.preview.tex); continue; }
      const ad = AD.live[slot.id];
      if (adActive(ad)) setSlotTex(slot, await creativeTex(ad, slot.id + ':' + (ad.updatedAt || '') + ':' + (ad.img ? ad.img.length : 0)));
      else setSlotTex(slot, null);
    } catch (e) { setSlotTex(slot, null); }
  }
}

/* ---------- shared data ---------- */
/* booking contact for brands on the public website (no shared database there yet): an email, a WhatsApp number with country code, or an https link */
const SITE_CONTACT = 'support@afconcity.com';
async function initAds() {
  const cl = (window.claude && typeof window.claude.use === 'function') ? window.claude : webClaude;
  if (!cl) { if (SITE_CONTACT) { AD.contact = SITE_CONTACT; renderAdsAll(); } return; }
  AD.web = !!cl.web;
  if (AD.web) { AD.contact = SITE_CONTACT; renderAdsAll(); }
  try { [AD.db, AD.user] = await Promise.all([cl.use('db'), cl.use('user')]); } catch (e) { return; }
  if (AD.web) onWebAuth(() => { AD.canEdit = WEB.admin; AD.uid = WEB.uid; AD.write = !!WEB.uid; loadStatsBase(); renderAdsAll(); });
  if (AD.user) { try { AD.canEdit = !!(await AD.user.canEdit()); AD.uid = await AD.user.id(); AD.write = await AD.user.can('data.write'); } catch (e) {} }
  AD.ready = true;
  if (!AD.db) { renderAdsAll(); return; }
  AD.db.collection('billboards').onSnapshot((snap) => {
    const next = {}; for (const d of snap.docs) if (d.exists) next[d.id] = d.data();
    AD.live = next; applyAds(); renderAdsAll(); if (PH.open && (PH.app === 'home' || PH.app === 'brand' || PH.app === 'ads')) renderPhone(); if (HOME.inside) { HOME.tvKey = ''; updateHomeTV(); }
  }, () => {});
  AD.db.doc('config/ads').onSnapshot((s) => { const d = s.exists ? s.data() : {}; AD.contact = typeof d.contact === 'string' && d.contact ? d.contact : (AD.web ? SITE_CONTACT : ''); AD.rates = d.rates && typeof d.rates === 'object' ? d.rates : {}; renderAdsAll(); }, () => {});
  renderAdsAll();
}
function renderAdsAll() { if (!ui.pause.hidden && pmTab === 'ads') renderAds($('#pmAds'), true); const m = $('#adsMain'); if (m && !m.closest('[hidden]')) renderAds(m, false); }

/* ---------- preview: try your artwork on a board, locally ---------- */
function boardView(slot) {
  if (slot.kind === 'dala') { const v = DALA.v; return { px: v.sx + 13, pz: v.sz + 1.5, ry: -Math.PI / 2, cx: v.sx + 9, cy: 2.2, cz: v.sz + 3.5, lx: v.sx, ly: 1.1, lz: v.sz }; }
  const dx = Math.sin(slot.ry), dz = Math.cos(slot.ry);
  let px = slot.x + dx * 20, pz = slot.z + dz * 20;
  for (let k = 0; k < 20 && (!walkable(px, pz) || pointBlocked(px, pz, 0.6)); k++) { px += dx; pz += dz; }
  return { px, pz, ry: slot.ry + Math.PI, cx: slot.x + dx * 24, cy: 3.2, cz: slot.z + dz * 24, lx: slot.x, ly: 8.6, lz: slot.z };
}
function goSee(slot) {
  const v = boardView(slot);
  if (mode === 'intro') { AD.view = v; return; }
  if (mode === 'paused') closeOverlays();
  if (playerVeh) exitVehicle(true);
  P.x = v.px; P.z = v.pz; player.position.set(P.x, groundY(P.x, P.z), P.z); player.rotation.y = v.ry; cam.yaw = slot.kind === 'dala' ? Math.PI / 2 : slot.ry; cam.pitch = -0.12; cam.lastLook = now() + 3;
}
function pickPreview(slot) {
  const inp = $('#adFile'); inp.value = '';
  inp.onchange = async () => {
    const f = inp.files && inp.files[0]; if (!f) return;
    try {
      const url = URL.createObjectURL(f), im = await loadImg(url); URL.revokeObjectURL(url);
      AD.preview = { slot: slot.id, tex: texOf(fitImage(im, 1024, 512), { clamp: true }) };
      await applyAds(); goSee(slot);
      help(`Preview only: <b class="hl">${escapeHtml(slot.name)}</b> shows your artwork on this device. Book the board to show it to every player.`, 7000);
    } catch (e) { help('That file could not be read as an image. Try a PNG or JPG.', 3500); }
  };
  inp.click();
}
function clearPreview() { AD.preview = null; AD.view = null; applyAds(); }

/* ---------- owner: put a creative live ---------- */
async function compressArt(file) {
  const url = URL.createObjectURL(file), im = await loadImg(url); URL.revokeObjectURL(url);
  for (const [w, h] of [[1024, 512], [800, 400], [640, 320]]) {
    const c = fitImage(im, w, h);
    for (const q of [0.85, 0.72, 0.6, 0.5]) { const d = c.toDataURL('image/webp', q); const ok = d.startsWith('data:image/webp') ? d : c.toDataURL('image/jpeg', q); if (ok.length < 190000) return ok; }
  }
  throw new Error('too big');
}
async function saveSlot(slot, form) {
  const g = (n) => form.querySelector(`[name="${n}"]`);
  const body = { brand: g('brand').value.trim().slice(0, 60), headline: g('headline').value.trim().slice(0, 40), sub: g('sub').value.trim().slice(0, 70), c1: g('c1').value, c2: g('c2').value, fg: g('fg').value, start: g('start').value || todayISO(), end: g('end').value || '', status: g('status').checked ? 'live' : 'paused', updatedAt: Date.now() };
  const prev = AD.live[slot.id] || {};
  const file = g('art').files && g('art').files[0];
  const st = form.querySelector('.ad-msg');
  try {
    if (file) { st.textContent = 'Compressing artwork…'; body.img = await compressArt(file); }
    else if (prev.img && !g('dropart').checked) body.img = prev.img;
    if (!body.img && !body.headline) { st.textContent = 'Add artwork or a headline first.'; return; }
    st.textContent = 'Saving…';
    await AD.db.doc('billboards/' + slot.id).set(body);
    st.textContent = body.status === 'live' ? (adActive(body) ? 'Live for every player now.' : `Saved. It goes live on ${body.start}.`) : 'Saved as paused.';
    sfx.ding();
  } catch (e) { st.textContent = e && e.code === 'invalid_argument' ? 'Only the owner and editors can change billboards.' : e && e.message === 'too big' ? 'That image is too large even after compressing. Try a smaller file.' : 'Could not save. Try again in a moment.'; }
}
async function clearSlot(slot, form) {
  const st = form.querySelector('.ad-msg');
  try { await AD.db.doc('billboards/' + slot.id).delete(); st.textContent = 'Back to the house ad.'; } catch (e) { st.textContent = 'Could not clear it.'; }
}
async function saveConfig(form) {
  const rates = {}; for (const s of allSlots()) { const v = parseInt(form.querySelector(`[name="rate_${s.id}"]`).value.replace(/[^0-9]/g, ''), 10); if (v > 0) rates[s.id] = v; }
  const contact = form.querySelector('[name="contact"]').value.trim().slice(0, 200);
  const st = form.querySelector('.ad-msg');
  try { await AD.db.doc('config/ads').set({ contact, rates, updatedAt: Date.now() }); st.textContent = 'Saved. Brands see these on the Advertise page.'; sfx.ding(); }
  catch (e) { st.textContent = 'Could not save.'; }
}
function contactHref(slot) {
  const c = AD.contact; if (!c) return '';
  const subj = `AfconCity billboard: ${slot ? slot.name : 'booking'}`;
  if (/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(c)) return `mailto:${c}?subject=${encodeURIComponent(subj)}`;
  if (/^\+?[0-9 ]{8,}$/.test(c)) return `https://wa.me/${c.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(subj)}`;
  if (/^https:\/\//.test(c)) return c;
  return '';
}

/* ---------- the Billboards page (players, brands and the owner) ---------- */
function el(tag, cls, text) { const e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e; }
function renderAds(root, inGame) {
  if (!root) return;
  root.innerHTML = '';
  const intro = el('div', 'ad-intro');
  intro.append(el('p', 'lede', 'Put your brand on the streets and phones of AfconCity. Seven roadside billboards along Fumba Road, the backs of every daladala, three shopfronts, the radio at the beach bar, and five ad spaces on every player’s phone.'));
  const how = el('ol', 'steps');
  for (const s of ['Pick a board or a phone space below and try your artwork on it: it shows only on your screen.', 'Book it with the AfconCity team for the dates you want.', 'Your artwork goes live for every player, with no download or update needed.']) how.append(el('li', '', s));
  intro.append(how);
  const ch = contactHref(null);
  if (ch) { const a = el('a', 'btn', 'Book an ad space'); a.href = ch; a.target = '_blank'; a.rel = 'noopener'; a.addEventListener('click', (e) => openOut(e, ch, intro)); intro.append(a, el('p', 'fine', `Bookings: ${linkText(ch)}`)); }
  else intro.append(el('p', 'fine', AD.canEdit ? (inGame ? 'Add a booking contact below so brands can reach you.' : 'Owner: set the booking contact and rates in the pause menu, Billboards tab.') : 'Bookings open soon. Ask the AfconCity team for dates and rates.'));
  root.append(intro);
  if (AD.preview || AD.phPreview) { const b = el('button', 'btn btn-ghost btn-sm', 'Remove my preview'); b.type = 'button'; b.onclick = () => { AD.phPreview = null; clearPreview(); renderAds(root, inGame); }; root.append(b); }
  root.append(el('h3', 'ad-sec', 'Billboards'));
  const grid = el('div', 'ad-grid');
  for (const slot of boardSlots()) {
    const ad = AD.live[slot.id], live = adActive(ad), card = el('article', 'ad-card' + (live ? ' booked' : ''));
    const thumb = el('canvas', 'ad-thumb'); thumb.width = 256; thumb.height = 128;
    const tex = slot.kind === 'dala' ? DALA_BACKS[0] && DALA_BACKS[0].mat.map : slot.mat.map, img = tex && tex.image;
    if (img) { try { thumb.getContext('2d').drawImage(img, 0, 0, 256, 128); } catch (e) {} }
    card.append(thumb);
    const h = el('h4', '', slot.name); card.append(h);
    card.append(el('p', 'fine', slot.note || ''));
    card.append(slotMeta(slot, ad));
    const row = el('div', 'ad-actions');
    const tryB = el('button', 'btn btn-sm', 'Try my artwork'); tryB.type = 'button'; tryB.onclick = () => pickPreview(slot); row.append(tryB);
    const seeB = el('button', 'btn btn-ghost btn-sm', inGame ? 'Go see it' : 'Look at it'); seeB.type = 'button'; seeB.onclick = () => goSee(slot); row.append(seeB);
    const bk = contactHref(slot); if (bk && !live) { const a = el('a', 'btn btn-ghost btn-sm', 'Book'); a.href = bk; a.target = '_blank'; a.rel = 'noopener'; a.addEventListener('click', (e) => openOut(e, bk, card)); row.append(a); }
    card.append(row);
    if (AD.canEdit && AD.db) card.append(slot.kind === 'shop' ? ownerPhoneForm(slot, ad) : ownerForm(slot, ad));
    grid.append(card);
  }
  root.append(grid);
  root.append(renderPhoneAds(inGame), renderRadioAd());
  if (AD.canEdit && AD.db) { root.append(ownerConfig(), ownerInsights(), ownerEvents()); if (AD.web && WEB.sb) root.append(ownerBookings(), ownerAnalytics()); publishSlots(); }
  else if (AD.ready && AD.canEdit === false && !AD.web) root.append(el('p', 'fine', 'Ad artwork is managed by the game’s owner.'));
  if (AD.web && AD.db) root.append(webOwnerBox());
}
function slotMeta(slot, ad) {
  const live = adActive(ad), rate = AD.rates[slot.id], meta = el('p', 'ad-meta');
  meta.textContent = live ? `Booked${ad.brand ? ': ' + ad.brand : ''}${ad.end ? ' until ' + ad.end : ''}` : `Available${rate ? ' · ' + tsh(rate) + ' a month' : ''}`;
  return meta;
}
/* phone ad spaces: a live mock phone plus a card per space */
function renderPhoneAds(inGame) {
  const ps = el('section', 'ad-phone'); ps.id = inGame ? 'adPhone' : 'adPhoneMain';
  ps.append(el('h3', 'ad-sec', 'On every player’s phone'));
  ps.append(el('p', 'lede', 'Every player carries a phone (press P). Book the featured banner at the top of the home screen, or one of four Sponsored app tiles. A tap opens your brand page: your offer, plus buttons to your website, WhatsApp and phone number. The featured banner also plays on the TV in players’ homes.'));
  const wrap = el('div', 'ad-phone-wrap');
  const mock = el('div', 'ph-mock'), scr = el('div', 'ph-screen'); mock.append(el('div', 'ph-mock-bar', 'Tap a sponsored space to see its brand page'), scr);
  const drawMock = (id) => { scr.innerHTML = ''; try { if (id) renderBrand(scr, id, () => drawMock(null)); else renderPhoneHome(scr, (sid) => drawMock(sid)); } catch (e) { console.error(e); } };
  drawMock(null);
  const grid = el('div', 'ad-grid ad-pgrid');
  for (const slot of PHONE_SLOTS) {
    const ad = AD.live[slot.id], live = adActive(ad), card = el('article', 'ad-card' + (live ? ' booked' : ''));
    const th = el('div', 'ad-ph-thumb' + (slot.big ? ' big' : '')); th.append(slot.big ? bannerEl(phoneAd(slot.id), () => drawMock(slot.id)) : tileEl(slot.id, () => drawMock(slot.id))); card.append(th);
    card.append(el('h4', '', slot.name), el('p', 'fine', slot.note), slotMeta(slot, ad));
    const row = el('div', 'ad-actions');
    const tryB = el('button', 'btn btn-sm', slot.big ? 'Try my banner' : 'Try my icon'); tryB.type = 'button'; tryB.onclick = () => pickPhonePreview(slot, () => { drawMock(slot.id); renderAdsAll(); }); row.append(tryB);
    const seeB = el('button', 'btn btn-ghost btn-sm', 'See the brand page'); seeB.type = 'button'; seeB.onclick = () => { drawMock(phoneAd(slot.id) ? slot.id : null); mock.scrollIntoView({ block: 'nearest' }); }; row.append(seeB);
    const bk = contactHref(slot); if (bk && !live) { const a = el('a', 'btn btn-ghost btn-sm', 'Book'); a.href = bk; a.target = '_blank'; a.rel = 'noopener'; a.addEventListener('click', (e) => openOut(e, bk, card)); row.append(a); }
    card.append(row);
    if (AD.canEdit && AD.db) card.append(ownerPhoneForm(slot, ad));
    grid.append(card);
  }
  wrap.append(mock, grid); ps.append(wrap);
  return ps;
}
function renderRadioAd() {
  const box = el('section', 'ad-phone'); box.append(el('h3', 'ad-sec', 'Radio Pwani at the beach bar'));
  const slot = RADIO_SLOT, ad = AD.live[slot.id], card = el('article', 'ad-card' + (adActive(ad) ? ' booked' : ''));
  card.append(el('p', 'fine', slot.note), slotMeta(slot, ad));
  if (adActive(ad)) card.append(el('p', 'lede', `Now playing: "${ad.headline || ad.brand}${ad.sub ? ' ' + ad.sub : ''}"`));
  const bk = contactHref(slot); if (bk && !adActive(ad)) { const a = el('a', 'btn btn-ghost btn-sm', 'Book the radio'); a.href = bk; a.target = '_blank'; a.rel = 'noopener'; a.addEventListener('click', (e) => openOut(e, bk, card)); card.append(a); }
  if (AD.canEdit && AD.db) card.append(ownerPhoneForm(slot, ad));
  const g = el('div', 'ad-grid ad-pgrid'); g.append(card); box.append(g);
  return box;
}
function pickPhonePreview(slot, after) {
  const inp = $('#adFile'); inp.value = '';
  inp.onchange = async () => {
    const f = inp.files && inp.files[0]; if (!f) return;
    try {
      const data = slot.big ? await compressArt(f) : await compressIcon(f);
      const ad = { brand: 'Your brand', headline: 'Your brand', sub: 'Your tagline goes here', offer: 'Your offer for fans goes here', about: 'A few lines about your business. Buttons below link to your website, WhatsApp and phone.', c1: '#232a63', c2: '#141838', preview: true };
      if (slot.big) ad.img = data; else ad.icon = data;
      AD.phPreview = { slot: slot.id, ad };
      help('Preview only: your artwork shows on this device. Book the space to show it on every player’s phone.', 6000);
      after && after();
    } catch (e) { help('That file could not be read as an image. Try a PNG or JPG.', 3500); }
  };
  inp.click();
}
async function compressIcon(file) {
  const url = URL.createObjectURL(file), im = await loadImg(url); URL.revokeObjectURL(url);
  for (const s of [256, 192, 128]) { const c = fitImage(im, s, s); for (const q of [0.88, 0.75, 0.6]) { const d = c.toDataURL('image/webp', q); const ok = d.startsWith('data:image/webp') ? d : c.toDataURL('image/jpeg', q); if (ok.length < 60000) return ok; } }
  throw new Error('too big');
}
function ownerPhoneForm(slot, ad) {
  ad = ad || {};
  const f = el('form', 'ad-form'); f.autocomplete = 'off';
  f.innerHTML = `<p class="eyebrow">Owner · ${slot.kind === 'shop' ? 'this shopfront (the banner becomes the sign)' : slot.kind === 'radio' ? 'the radio advert (tagline and line two are read out)' : 'this phone space'}</p>
    <label>Brand name<input name="brand" maxlength="40"></label>
    <label>Tagline<input name="headline" maxlength="40"></label>
    <label>Line two<input name="sub" maxlength="70"></label>
    <label>Offer for fans <span class="fine">(a promo code or deal)</span><input name="offer" maxlength="80"></label>
    <label>About the business<textarea name="about" maxlength="300" rows="3" class="fb-text"></textarea></label>
    <label>Website <span class="fine">(https only)</span><input name="link" maxlength="300" inputmode="url"></label>
    <div class="ad-cols"><label>WhatsApp <span class="fine">(with country code)</span><input name="wa" maxlength="20" inputmode="tel"></label><label>Phone<input name="tel" maxlength="20" inputmode="tel"></label></div>
    <label>App icon <span class="fine">(square; compressed automatically)</span><input name="icon" type="file" accept="image/*"></label>
    <label class="chk"><input name="dropicon" type="checkbox"> Remove the saved icon</label>
    <label>Banner <span class="fine">(2:1, e.g. 1200×600: the featured banner and the top of the brand page)</span><input name="art" type="file" accept="image/*"></label>
    <label class="chk"><input name="dropart" type="checkbox"> Remove the saved banner</label>
    <div class="ad-cols"><label>Colour 1<input name="c1" type="color"></label><label>Colour 2<input name="c2" type="color"></label><label>Text<input name="fg" type="color"></label></div>
    <div class="ad-cols"><label>Start<input name="start" type="date"></label><label>End<input name="end" type="date"></label></div>
    <label class="chk"><input name="status" type="checkbox"> Live</label>
    <div class="ad-actions"><button class="btn btn-sm" type="submit">Save</button><button class="btn btn-ghost btn-sm" type="button" data-clear>Clear this space</button></div>
    <p class="fine ad-msg" aria-live="polite"></p>`;
  const set = (n, v) => { f.querySelector(`[name="${n}"]`).value = v; };
  for (const k of ['brand', 'headline', 'sub', 'offer', 'about', 'link', 'wa', 'tel']) set(k, ad[k] || '');
  set('c1', ad.c1 || '#232a63'); set('c2', ad.c2 || '#141838'); set('fg', ad.fg || '#ffffff'); set('start', ad.start || todayISO()); set('end', ad.end || '');
  f.querySelector('[name="status"]').checked = ad.status ? ad.status === 'live' : true;
  if (ad.icon || ad.img) f.querySelector('.ad-msg').textContent = [ad.icon ? 'Icon saved.' : '', ad.img ? 'Banner saved.' : ''].join(' ').trim();
  f.addEventListener('submit', (e) => { e.preventDefault(); savePhoneSlot(slot, f); });
  f.querySelector('[data-clear]').onclick = () => clearSlot(slot, f);
  f.addEventListener('keydown', (e) => e.stopPropagation());
  return f;
}
async function savePhoneSlot(slot, form) {
  const g = (n) => form.querySelector(`[name="${n}"]`), st = form.querySelector('.ad-msg'), v = (n, k) => g(n).value.trim().slice(0, k);
  const link = v('link', 300);
  if (link && !safeLink(link)) { st.textContent = 'The website must start with https://'; return; }
  if (v('wa', 20) && !waLink(v('wa', 20))) { st.textContent = 'WhatsApp needs the full number with country code, e.g. +255 7xx xxx xxx.'; return; }
  if (v('tel', 20) && !telLink(v('tel', 20))) { st.textContent = 'That phone number looks too short or too long.'; return; }
  const body = { brand: v('brand', 40), headline: v('headline', 40), sub: v('sub', 70), offer: v('offer', 80), about: v('about', 300), link: safeLink(link), wa: v('wa', 20), tel: v('tel', 20), c1: g('c1').value, c2: g('c2').value, fg: g('fg').value, start: g('start').value || todayISO(), end: g('end').value || '', status: g('status').checked ? 'live' : 'paused', updatedAt: Date.now() };
  const prev = AD.live[slot.id] || {};
  try {
    const icon = g('icon').files && g('icon').files[0], art = g('art').files && g('art').files[0];
    if (icon) { st.textContent = 'Compressing the icon…'; body.icon = await compressIcon(icon); } else if (prev.icon && !g('dropicon').checked) body.icon = prev.icon;
    if (art) { st.textContent = 'Compressing the banner…'; body.img = await compressArt(art); } else if (prev.img && !g('dropart').checked) body.img = prev.img;
    if (!body.brand && !body.headline) { st.textContent = 'Add the brand name first.'; return; }
    st.textContent = 'Saving…';
    await AD.db.doc('billboards/' + slot.id).set(body);
    st.textContent = body.status === 'live' ? (adActive(body) ? 'Live on every player’s phone now.' : `Saved. It goes live on ${body.start}.`) : 'Saved as paused.';
    sfx.ding();
  } catch (e) { st.textContent = e && e.code === 'invalid_argument' ? 'Only the owner and editors can change ads.' : e && e.message === 'too big' ? 'That image is too large even after compressing. Try a smaller file.' : 'Could not save. Try again in a moment.'; }
}
function ownerForm(slot, ad) {
  ad = ad || {};
  const f = el('form', 'ad-form'); f.autocomplete = 'off';
  f.innerHTML = `<p class="eyebrow">Owner · this board</p>
    <label>Brand<input name="brand" maxlength="60"></label>
    <label>Artwork <span class="fine">(2:1, e.g. 1200×600; compressed automatically)</span><input name="art" type="file" accept="image/*"></label>
    <label class="chk"><input name="dropart" type="checkbox"> Remove the saved artwork</label>
    <label>Headline <span class="fine">(used when there is no artwork)</span><input name="headline" maxlength="40"></label>
    <label>Line two<input name="sub" maxlength="70"></label>
    <div class="ad-cols"><label>Colour 1<input name="c1" type="color"></label><label>Colour 2<input name="c2" type="color"></label><label>Text<input name="fg" type="color"></label></div>
    <div class="ad-cols"><label>Start<input name="start" type="date"></label><label>End<input name="end" type="date"></label></div>
    <label class="chk"><input name="status" type="checkbox"> Live</label>
    <div class="ad-actions"><button class="btn btn-sm" type="submit">Save</button><button class="btn btn-ghost btn-sm" type="button" data-clear>Back to house ad</button></div>
    <p class="fine ad-msg" aria-live="polite"></p>`;
  const set = (n, v) => { f.querySelector(`[name="${n}"]`).value = v; };
  set('brand', ad.brand || ''); set('headline', ad.headline || ''); set('sub', ad.sub || ''); set('c1', ad.c1 || '#141838'); set('c2', ad.c2 || '#232a63'); set('fg', ad.fg || '#ffffff'); set('start', ad.start || todayISO()); set('end', ad.end || '');
  f.querySelector('[name="status"]').checked = ad.status ? ad.status === 'live' : true;
  if (ad.img) f.querySelector('.ad-msg').textContent = 'Artwork saved for this board.';
  f.addEventListener('submit', (e) => { e.preventDefault(); saveSlot(slot, f); });
  f.querySelector('[data-clear]').onclick = () => clearSlot(slot, f);
  f.addEventListener('keydown', (e) => e.stopPropagation());
  return f;
}
/* afconcity.com: the owner signs in with a code sent to the owner email, then manages ads and chat here */
function webOwnerBox() {
  const box = el('section', 'ad-owner');
  if (WEB.admin) {
    const top = el('div', 'ad-owner-top'); top.append(el('p', 'fine', `Signed in as owner · ${WEB.email}`));
    const out = el('button', 'btn btn-ghost btn-sm', 'Sign out'); out.type = 'button'; out.onclick = async () => { out.disabled = true; await webSignOut(); renderAdsAll(); }; top.append(out);
    box.append(top, webModeration()); return box;
  }
  const d = el('details', 'ad-owner-login'); d.append(el('summary', '', 'Owner sign-in'));
  const f = el('form', 'ad-form'); f.autocomplete = 'off';
  f.innerHTML = `<label>Owner email<input name="email" type="email" autocomplete="email" maxlength="120" required></label>
    <div class="ad-actions"><button class="btn btn-sm" type="submit">Email me a sign-in code</button></div>
    <label class="otp" hidden>Code from the email<input name="code" inputmode="numeric" autocomplete="one-time-code" maxlength="10"></label>
    <div class="ad-actions otp" hidden><button class="btn btn-sm" type="button" data-verify>Sign in</button></div>
    <p class="fine ad-msg" aria-live="polite"></p>`;
  const msg = f.querySelector('.ad-msg'), em = f.querySelector('[name=email]');
  for (const i of f.querySelectorAll('input')) i.addEventListener('keydown', (e) => e.stopPropagation());
  f.addEventListener('submit', async (e) => {
    e.preventDefault(); const email = em.value.trim().toLowerCase(); if (!email) return;
    msg.textContent = 'Sending…';
    try { await webOwnerSendCode(email); msg.textContent = 'Check your email. Enter the code here, or open the link in the email on this device.'; f.querySelectorAll('.otp').forEach(x => { x.hidden = false; }); f.querySelector('[name=code]').focus(); }
    catch (err) { msg.textContent = /rate|security purposes|seconds/i.test(err.message) ? 'Too many emails just now. Wait a minute and try again.' : 'Could not send the email: ' + err.message; }
  });
  f.querySelector('[data-verify]').onclick = async () => {
    const code = f.querySelector('[name=code]').value.replace(/\s/g, ''); if (!code) return;
    msg.textContent = 'Checking…';
    try { await webOwnerVerify(em.value.trim().toLowerCase(), code); AD.canEdit = WEB.admin; AD.uid = WEB.uid; msg.textContent = WEB.admin ? 'Signed in.' : 'Signed in, but this email is not an owner of AfconCity.'; renderAdsAll(); }
    catch (err) { msg.textContent = 'That code did not work. Check it, or request a new one.'; }
  };
  d.append(f); box.append(d); return box;
}
function webModeration() {
  const sec = el('section', 'ad-insights');
  sec.append(el('h3', '', 'Chat and players (owner)'));
  const row = el('div', 'ad-actions'), st = el('p', 'fine', 'Loading…');
  const tog = el('button', 'btn btn-sm', '…'); tog.type = 'button';
  const draw = (on) => { tog.textContent = on ? 'Switch chat off' : 'Switch chat on'; st.textContent = on ? 'Chat is on for everyone. Swear words are starred out, and each player can send one message every 1.5 seconds.' : 'Chat is off: nobody can send messages.'; tog.onclick = async () => { tog.disabled = true; try { await webSetChat(!on); draw(!on); } catch (e) { st.textContent = 'Could not change it: ' + e.message; } tog.disabled = false; }; };
  webChatEnabled().then(draw);
  row.append(tog); sec.append(st, row);
  const rep = el('div', 'ad-reports'); sec.append(el('h4', '', 'Reports from players'), rep);
  const bans = el('div', 'ad-reports'); sec.append(el('h4', '', 'Blocked from chat'), bans);
  const load = async () => {
    rep.innerHTML = ''; bans.innerHTML = '';
    let rs = []; try { rs = await webReports(); } catch (e) {}
    if (!rs.length) rep.append(el('p', 'fine', 'No reports.'));
    for (const r of rs) {
      const c = el('div', 'ad-report'); c.append(el('b', '', r.nick || 'Fan'), el('p', 'fine', (r.lines || []).join(' · ') || '(no recent messages)'));
      const a = el('div', 'ad-actions');
      const ban = el('button', 'btn btn-sm', 'Block from chat'); ban.type = 'button'; ban.onclick = async () => { ban.disabled = true; try { await webBan(r.target, `${r.nick}: ${(r.lines || []).slice(-1)[0] || ''}`); await webDismissReport(r.id); } catch (e) { alert0(e); } load(); };
      const dis = el('button', 'btn btn-ghost btn-sm', 'Dismiss'); dis.type = 'button'; dis.onclick = async () => { dis.disabled = true; try { await webDismissReport(r.id); } catch (e) {} load(); };
      a.append(ban, dis); c.append(a); rep.append(c);
    }
    let bs = []; try { bs = await webBans(); } catch (e) {}
    if (!bs.length) bans.append(el('p', 'fine', 'Nobody is blocked.'));
    for (const b of bs) {
      const c = el('div', 'ad-report'); c.append(el('p', 'fine', b.reason || 'Blocked player'));
      const un = el('button', 'btn btn-ghost btn-sm', 'Unblock'); un.type = 'button'; un.onclick = async () => { un.disabled = true; try { await webUnban(b.uid); } catch (e) {} load(); };
      c.append(un); bans.append(c);
    }
  };
  const alert0 = (e) => { st.textContent = 'Could not do that: ' + ((e && e.message) || e); };
  load();
  return sec;
}
function ownerConfig() {
  const f = el('form', 'ad-form wide'); f.autocomplete = 'off';
  f.innerHTML = `<h3>Booking details (owner)</h3>
    <label>Booking contact <span class="fine">(business email, WhatsApp number with country code, or an https link)</span><input name="contact" maxlength="200"></label>
    <p class="fine">Monthly rate per board, shown to brands. Leave a box empty to show "ask for rates". The grey numbers are only suggestions.</p>
    <div class="ad-rates"></div>
    <div class="ad-actions"><button class="btn btn-sm" type="submit">Save booking details</button></div><p class="fine ad-msg" aria-live="polite"></p>`;
  f.querySelector('[name="contact"]').value = AD.contact;
  const rr2 = f.querySelector('.ad-rates');
  for (const s of allSlots()) { const l = el('label', '', s.name); const i = el('input'); i.name = 'rate_' + s.id; i.inputMode = 'numeric'; i.placeholder = fmt(SUGGESTED_RATE[s.id] || 0); i.value = AD.rates[s.id] ? String(AD.rates[s.id]) : ''; l.append(i); rr2.append(l); }
  f.addEventListener('submit', (e) => { e.preventDefault(); saveConfig(f); });
  f.addEventListener('keydown', (e) => e.stopPropagation());
  return f;
}
function ownerInsights() {
  const box = el('section', 'ad-insights');
  box.append(el('h3', '', 'Tester insights (owner)'));
  const p = el('p', 'fine', 'Loading feedback and play stats from signed-in testers…'); box.append(p);
  (async () => {
    try {
      const stats = await AD.db.collection('stats').limit(200).get();
      const views = {}, fps = [], ph = { views: {}, opens: {}, clicks: {} }; let players = 0, minutes = 0;
      for (const d of stats.docs) { const s = d.data() || {}; players++; minutes += s.minutes || 0; if (s.fpsAvg) fps.push(s.fpsAvg); for (const [k, v] of Object.entries(s.ads || {})) views[k] = (views[k] || 0) + v; for (const kind of ['views', 'opens', 'clicks']) for (const [k, v] of Object.entries((s.ph && s.ph[kind]) || {})) ph[kind][k] = (ph[kind][k] || 0) + (+v || 0); }
      p.textContent = players ? `${players} tester${players === 1 ? '' : 's'}, ${Math.round(minutes)} minutes played${fps.length ? `, median ${Math.round(fps.sort((a, b) => a - b)[Math.floor(fps.length / 2)])} fps` : ''}. Public visitors who are not signed in or not invited cannot be counted.` : 'No tester stats yet. Invite testers as Contributors in Share; their play time and billboard views appear here.';
      const ul = el('ul', 'jobs');
      for (const s of boardSlots()) { const li = el('li'); li.append(el('b', '', s.name), el('span', '', `${Math.round((views[s.id] || 0) / 60)} min seen`)); ul.append(li); }
      for (const s of [RADIO_SLOT]) { const li = el('li'); li.append(el('b', '', s.name), el('span', '', `${Math.round((ph.views.radio || 0) / 60)} min heard · ${fmt(ph.opens.radio || 0)} page opens · ${fmt(ph.clicks.radio || 0)} link taps`)); ul.append(li); }
      for (const s of PHONE_SLOTS) { const li = el('li'); li.append(el('b', '', s.name), el('span', '', `${Math.round(((ph.views[s.id] || 0) + (s.big ? ph.views.tv || 0 : 0)) / 60)} min on screen · ${fmt(ph.opens[s.id] || 0)} page opens · ${fmt(ph.clicks[s.id] || 0)} link taps`)); ul.append(li); }
      box.append(ul);
      // who is playing: answers to the welcome questions, and the most worn looks
      const ab = {}, looks = {}; let nAb = 0;
      for (const d of stats.docs) {
        const s = d.data() || {}, a = aboutClean(s.about); if (Object.keys(a).length) nAb++;
        for (const [k, v] of Object.entries(a)) { ab[k] = ab[k] || {}; ab[k][v] = (ab[k][v] || 0) + 1; }
        const lk = typeof s.look === 'string' ? lookFrom(s.look) : null; if (lk) { const n = lookName(lk); looks[n] = (looks[n] || 0) + 1; }
      }
      box.append(el('h3', '', `Who is playing (${nAb} answered the welcome questions)`));
      const wl = el('ul', 'jobs'), top = (m) => { const tot = Object.values(m).reduce((x, y) => x + y, 0); return tot ? Object.entries(m).sort((x, y) => y[1] - x[1]).slice(0, 4).map(([k, v]) => `${k} ${Math.round(v * 100 / tot)}%`).join(' · ') : 'No answers yet'; };
      for (const q of ABOUT_Q) { const li = el('li'); li.append(el('b', '', q.short), el('span', '', top(ab[q.id] || {}))); wl.append(li); }
      { const li = el('li'); li.append(el('b', '', 'Most worn looks'), el('span', '', top(looks))); wl.append(li); }
      box.append(wl);
      const fb = await AD.db.collection('feedback').limit(100).get(), items = [];
      for (const d of fb.docs) { const its = await AD.db.collection('feedback/' + d.id + '/items').orderBy('at', 'desc').limit(10).get(); for (const it of its.docs) items.push(it.data()); }
      items.sort((a, b) => (b.at || 0) - (a.at || 0));
      box.append(el('h3', '', `Feedback (${items.length})`));
      const fl = el('ul', 'ad-feedback');
      for (const it of items.slice(0, 40)) { const li = el('li'); li.append(el('b', '', `${it.kind || 'Note'} · ${it.ctx && it.ctx.area ? it.ctx.area : ''}`), el('span', '', String(it.text || '').slice(0, 600)), el('small', '', new Date(it.at || 0).toLocaleString())); fl.append(li); }
      if (!items.length) fl.append(el('li', '', 'No feedback yet.'));
      box.append(fl);
    } catch (e) { p.textContent = 'Could not load tester data right now.'; }
  })();
  return box;
}

/* ---------- feedback ---------- */
const FB_KINDS = ['Bug', 'Idea', 'Too hard', 'Looks wrong', 'Love it'];
function fbContext() {
  return { area: areaAt(P.x, P.z), x: Math.round(P.x), z: Math.round(P.z), mode, veh: playerVeh ? playerVeh.kind : '', job: job ? job.type : '', goal: ui.goalTitle.textContent, stamps: stampCount(), fps: Math.round(avgFps()), gfx, device: isCoarse ? 'touch' : 'desktop', w: innerWidth, h: innerHeight, ver: GAME_VER };
}
function renderFeedback() {
  const root = $('#pmFeedback'); root.innerHTML = '';
  root.append(el('h3', '', 'Tell us what to fix or add'));
  root.append(el('p', 'fine', 'Your note is sent with where you are and how smoothly the game is running, so problems can be found and fixed.'));
  const chips = el('div', 'kit-row'); let kind = FB_KINDS[0];
  FB_KINDS.forEach((k, i) => { const l = el('label', 'kit'); l.innerHTML = `<input type="radio" name="fbk"><span></span>`; l.querySelector('span').textContent = k; const inp = l.querySelector('input'); inp.checked = i === 0; inp.onchange = () => { kind = k; }; chips.append(l); });
  const ta = el('textarea', 'fb-text'); ta.maxLength = 1200; ta.rows = 5; ta.placeholder = 'What happened, or what would make it better?'; ta.addEventListener('keydown', (e) => e.stopPropagation());
  const send = el('button', 'btn', 'Send feedback'); send.type = 'button';
  const msg = el('p', 'fine'); msg.setAttribute('aria-live', 'polite');
  send.onclick = async () => {
    const text = ta.value.trim(); if (text.length < 3) { msg.textContent = 'Write a few words first.'; return; }
    const item = { kind, text, at: Date.now(), ctx: fbContext() };
    if (AD.db && AD.uid && AD.write !== false) {
      try { send.disabled = true; msg.textContent = 'Sending…'; await AD.db.doc('feedback/' + AD.uid).set({ last: item.at, n: ((AD.fbN || 0) + 1) }); AD.fbN = (AD.fbN || 0) + 1; await AD.db.collection('feedback/' + AD.uid + '/items').add(item); ta.value = ''; msg.textContent = 'Asante! Your feedback was sent.'; sfx.ding(); }
      catch (e) { msg.textContent = 'This view cannot send feedback. Copy it instead and send it to the AfconCity team.'; offerCopy(root, item); }
      finally { send.disabled = false; }
    } else { msg.textContent = AD.web ? 'Feedback could not connect just now. Copy your note and email it to support@afconcity.com.' : window.claude ? 'Sending needs a Claude sign-in with Contributor access to this game. Copy your note instead and send it to the AfconCity team.' : 'Sending feedback from the game is coming soon. Copy your note and send it to the AfconCity team.'; offerCopy(root, item); }
  };
  root.append(chips, ta, send, msg);
}
function offerCopy(root, item) {
  if (root.querySelector('.fb-copy')) return;
  const b = el('button', 'btn btn-ghost btn-sm fb-copy', 'Copy my note'); b.type = 'button';
  b.onclick = async () => { const t = `${item.kind}: ${item.text}\n\n${JSON.stringify(item.ctx)}`; try { await navigator.clipboard.writeText(t); b.textContent = 'Copied'; } catch (e) { b.textContent = 'Copy failed'; } };
  root.append(b);
}

/* ---------- play stats and billboard view time ---------- */
const GAME_VER = '2026.10.22.1';
function avgFps() { if (!AD.fps.length) return 0; return AD.fps.reduce((a, b) => a + b, 0) / AD.fps.length; }
const _adV = new T.Vector3();
function updateAdStats(dt) {
  if (dt > 0) { AD.fps.push(1 / dt); if (AD.fps.length > 600) AD.fps.shift(); }
  if (mode !== 'play') return;
  camera.getWorldDirection(_adV);
  for (const s of boardSlots()) {
    if (s.kind === 'dala') continue;
    const dx = s.x - camera.position.x, dz = s.z - camera.position.z, d = Math.hypot(dx, dz);
    if (d < 75 && (dx * _adV.x + dz * _adV.z) / (d || 1) > 0.5) AD.seen[s.id] = (AD.seen[s.id] || 0) + dt;
  }
  if (DALA.v) for (const c of cars) if (c.kind === 'daladala') { const dx = c.x - camera.position.x, dz = c.z - camera.position.z, d = Math.hypot(dx, dz); if (d < 40 && (dx * _adV.x + dz * _adV.z) / (d || 1) > 0.5) { AD.seen.dala = (AD.seen.dala || 0) + dt; break; } }
  AD.statsT += dt;
  if (AD.statsT > 180) { AD.statsT = 0; writeStats(); }
}
async function writeStats() {
  if (!AD.db || !AD.uid || AD.write === false) return;
  const sorted = AD.fps.slice().sort((a, b) => a - b);
  const prev = AD.statsBase || {};
  const ads = Object.assign({}, prev.ads || {}); for (const [k, v] of Object.entries(AD.seen)) ads[k] = Math.round((ads[k] || 0) + v);
  const ph = { views: {}, opens: {}, clicks: {} }; for (const kind of ['views', 'opens', 'clicks']) { Object.assign(ph[kind], (prev.ph && prev.ph[kind]) || {}); for (const [k, v] of Object.entries(AD.ph[kind])) ph[kind][k] = Math.round((ph[kind][k] || 0) + v); }
  const ab = aboutRead();
  const body = { ver: GAME_VER, look: lookCode(state.look), about: ab ? aboutClean(ab.a) : {}, purse: state.bonus === undefined ? null : PRICES.start + state.bonus, sessions: (prev.sessions || 0) + (AD.sessionCounted ? 0 : 1), minutes: Math.round(((prev.minutes || 0) + (state.playMs - (AD.playMs0 || 0)) / 60000) * 10) / 10, device: isCoarse ? 'touch' : 'desktop', gfx, fpsAvg: Math.round(avgFps()), fpsLow: Math.round(sorted[Math.floor(sorted.length * 0.05)] || 0), stamps: stampCount(), money: money(), jobs: state.stats.jobs, area: areaAt(P.x, P.z), ads, ph, home: state.home ? state.home.id : '', day: clockDay(), updatedAt: Date.now() };
  const key = JSON.stringify(Object.assign({}, body, { updatedAt: 0 }));
  if (key === AD.lastStats) return;
  try { await AD.db.doc('stats/' + AD.uid).set(body); AD.lastStats = key; AD.statsBase = body; AD.seen = {}; AD.ph = { views: {}, opens: {}, clicks: {} }; AD.playMs0 = state.playMs; AD.sessionCounted = true; } catch (e) { if (e && e.code === 'invalid_argument') AD.write = false; }
}
async function loadStatsBase() {
  if (!AD.db || !AD.uid) return;
  try { const s = await AD.db.doc('stats/' + AD.uid).get(); AD.statsBase = s.exists ? s.data() : {}; } catch (e) { AD.statsBase = {}; }
  AD.playMs0 = state.playMs;
}
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden' && mode !== 'intro') writeStats(); });
