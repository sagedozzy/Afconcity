/* ---------- Nyota: premium stars, bought with Bachs on afconcity.com ----------
   The balance lives on the server (wallets table). The game only shows it and asks the server to spend it,
   so nothing changed on the phone can add Nyota. Shillings (TSh) are earned by playing and can never be bought.
   Players who said they are under 18 see no shop. */
const NY = { bal: 0, owned: {}, items: [], packs: [], loaded: false, busy: false, err: '', fxT: 0, fxCool: 0, wait: null, tagOn: true };
const NY_ITEM = {
  paint_gold: { en: 'Gold paint', sw: 'Rangi ya dhahabu', d: { en: 'For every vehicle you own', sw: 'Kwa magari yako yote' }, col: 0xd4a52a },
  paint_pearl: { en: 'Pearl white paint', sw: 'Rangi nyeupe ya lulu', d: { en: 'For every vehicle you own', sw: 'Kwa magari yako yote' }, col: 0xf1ece2 },
  paint_neon: { en: 'Neon green paint', sw: 'Rangi ya kijani ya neon', d: { en: 'For every vehicle you own', sw: 'Kwa magari yako yote' }, col: 0x2fe39a },
  tag_gold: { en: 'Golden name tag', sw: 'Jina la dhahabu', d: { en: 'Other players see your name in gold', sw: 'Wachezaji wengine wanaona jina lako kwa dhahabu' } },
  fx_fireworks: { en: 'Fireworks', sw: 'Fataki', d: { en: 'Light up the sky over you, once a minute', sw: 'Washa anga juu yako, mara moja kwa dakika' } },
  pass_collect: { en: 'Business pass · 7 days', sw: 'Pasi ya biashara · siku 7', d: { en: 'Collect your businesses from the phone', sw: 'Kusanya mapato ya biashara kwa simu' } },
};
const nyOk = () => MP.web && typeof SB_CFG !== 'undefined' && !isTeen();
const nyHas = (id) => { const u = NY.owned[id]; return u !== undefined && (u === null || u > Date.now()); };
const nyGold = () => nyOk() && NY.tagOn && nyHas('tag_gold');
const nyName = (id, fallback) => NY_ITEM[id] ? tl(NY_ITEM[id]) : fallback || id;
const fmtNy = (n) => `${fmt(n)} Nyota`;
function nyApply(d) {
  if (!d || typeof d !== 'object') return;
  NY.bal = Math.max(0, Math.floor(Number(d.nyota) || 0));
  NY.owned = {}; for (const o of d.owned || []) NY.owned[o.item] = o.until ? Date.parse(o.until) : null;
  NY.items = Array.isArray(d.items) ? d.items : []; NY.packs = Array.isArray(d.packs) ? d.packs : [];
  NY.loaded = true; NY.err = '';
  nyEffects();
}
async function nyLoad() {
  if (!nyOk()) return;
  try {
    if (WEB.ready) await WEB.ready; if (!WEB.sb || !WEB.uid) return;
    const { data, error } = await WEB.sb.rpc('nyota_state');
    if (error) throw error; nyApply(data);
  } catch (e) { NY.err = LANG === 'sw' ? 'Nyota hazikupatikana sasa hivi.' : 'Could not reach the Nyota shop just now.'; }
  if (PH.open && PH.app === 'nyota') renderPhone();
}
async function nyFn(path, body) {
  if (WEB.ready) await WEB.ready;
  const r = await fetch(`${SB_CFG.url}/functions/v1/bachs/${path}`, { method: body ? 'POST' : 'GET', headers: Object.assign({ apikey: SB_CFG.key, authorization: 'Bearer ' + (WEB.token || '') }, body ? { 'content-type': 'application/json' } : {}), body: body ? JSON.stringify(body) : undefined, cache: 'no-store' });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || (LANG === 'sw' ? 'Kuna tatizo. Jaribu tena.' : 'Something went wrong. Please try again.'));
  return j;
}
const nyGo = (url) => { if (DEV && window.__nyGo) window.__nyGo(url); else location.assign(url); };

/* ---------- buying Nyota (a top-up) ---------- */
async function nyTopup(pack, form) {
  if (NY.busy) return;
  const email = form.email.value.trim(), name = form.name.value.trim(), adult = form.adult.checked;
  const out = form.querySelector('.ph-note.err');
  const say = (t) => { out.textContent = t; out.hidden = !t; };
  if (!adult) { say(LANG === 'sw' ? 'Nyota ni kwa watu wenye miaka 18 au zaidi.' : 'Nyota are for players aged 18 and over.'); return; }
  NY.busy = true; say(''); form.querySelector('button[type=submit]').disabled = true;
  try {
    const j = await nyFn('topup', { pack: pack.id, email, name, adult: true });
    lsSet('afc-topup', j.id);
    writeSave(); try { await cloudSync(true); } catch (e) {}
    track('nyota_checkout', { pack: pack.id });
    nyGo(j.url);
  } catch (e) { say(e.message); form.querySelector('button[type=submit]').disabled = false; }
  NY.busy = false;
}
// back from the Bachs payment page: ?topup=<id> (and &cancelled=1 if they backed out)
function nyReturnFromUrl() {
  const q = new URLSearchParams(location.search), id = q.get('topup');
  if (!id) return;
  if (q.get('cancelled')) { lsSet('afc-topup', ''); NY.cancelled = true; } else if (/^[0-9a-f-]{36}$/i.test(id)) lsSet('afc-topup', id);
  q.delete('topup'); q.delete('cancelled');
  try { history.replaceState(null, '', location.pathname + (q.toString() ? '?' + q : '') + location.hash); } catch (e) {}
}
async function nyWatchTopup() {
  const id = lsGet('afc-topup'); if (!id || NY.wait || !nyOk()) return;
  NY.wait = id; const t0 = Date.now();
  while (Date.now() - t0 < 10 * 60000) {
    let j = null; try { j = await nyFn('topup-status?id=' + encodeURIComponent(id)); } catch (e) { if (/Unknown/.test(e.message)) break; }
    if (j && j.status === 'paid') {
      lsSet('afc-topup', ''); NY.wait = null; await nyLoad();
      sfx.win(); splash(`+${fmt(j.nyota)} NYOTA`, LANG === 'sw' ? 'Malipo yamefika. Asante!' : 'Payment received. Thank you!', 'gold');
      track('nyota_paid', { n: j.nyota }); return;
    }
    if (j && (j.status === 'cancelled' || j.status === 'refunded')) break;
    await new Promise(r => setTimeout(r, Date.now() - t0 < 60000 ? 3000 : 15000));
  }
  if (lsGet('afc-topup') === id) lsSet('afc-topup', '');
  NY.wait = null;
}

/* ---------- spending Nyota ---------- */
async function nyBuy(it) {
  if (NY.busy) return;
  if (NY.bal < it.price) { help(LANG === 'sw' ? `Unahitaji ${fmtNy(it.price)}. Ongeza Nyota kwanza.` : `You need ${fmtNy(it.price)}. Top up first.`, 2600); sfx.deny(); return; }
  NY.busy = true;
  try {
    const { data, error } = await WEB.sb.rpc('nyota_buy', { p_item: it.id });
    if (error) throw error;
    nyApply(data); sfx.win(); track('nyota_buy', { item: it.id });
    help(LANG === 'sw' ? `Umepata <b class="hl">${escapeHtml(nyName(it.id, it.name))}</b>.` : `You got the <b class="hl">${escapeHtml(nyName(it.id, it.name).toLowerCase())}</b>.`, 3000);
  } catch (e) { help(escapeHtml((e && e.message) || 'Could not buy that.'), 2800); sfx.deny(); }
  NY.busy = false;
  if (PH.open) renderPhone();
}

/* ---------- what the items do ---------- */
function nyEffects() {
  if (playerTag) playerTag.nm.classList.toggle('gold', nyGold());
  mpDirty = true;
}
function nyPaint(v, col) {
  if (!v || !v.owned || playerVeh === v) { help(LANG === 'sw' ? 'Shuka kwanza, kisha upake rangi.' : 'Get off first, then paint it.', 2200); return; }
  v.g.col = v.col = col;
  const m = makeVehicle(v.kind, col); m.position.copy(v.m.position); m.rotation.copy(v.m.rotation); m.visible = v.m.visible;
  scene.remove(v.m); v.m = m; scene.add(m); writeSave(); sfx.ding();
  help(LANG === 'sw' ? 'Rangi mpya!' : 'Fresh paint!', 1800);
  if (PH.open) renderPhone();
}
function nyBurst(x, z) {
  if (!FW.pos) return;
  const cx = x + rr(-12, 12), cy = rr(32, 50), cz = z + rr(-12, 12), col = FW_COLS[Math.floor(rnd() * FW_COLS.length)];
  for (let k = 0; k < 70; k++) { const i = FW.cursor++ % FW.n, u = rnd() * 2 - 1, th = rnd() * TAU, s = Math.sqrt(1 - u * u), sp = rr(10, 15); FW.pos[i * 3] = cx; FW.pos[i * 3 + 1] = cy; FW.pos[i * 3 + 2] = cz; FW.vel[i * 3] = s * Math.cos(th) * sp; FW.vel[i * 3 + 1] = u * sp; FW.vel[i * 3 + 2] = s * Math.sin(th) * sp; FW.base[i * 3] = col[0]; FW.base[i * 3 + 1] = col[1]; FW.base[i * 3 + 2] = col[2]; FW.max[i] = FW.life[i] = rr(1.3, 2); }
  if (Math.hypot(x - P.x, z - P.z) < 120) sfx.boom();
}
function nyShow(x, z) { for (let k = 0; k < 5; k++) setTimeout(() => nyBurst(x, z), k * 450); }
function nyFireworks() {
  if (!nyHas('fx_fireworks')) return;
  if (Date.now() < NY.fxCool) { help(LANG === 'sw' ? `Subiri sekunde ${Math.ceil((NY.fxCool - Date.now()) / 1000)}.` : `Wait ${Math.ceil((NY.fxCool - Date.now()) / 1000)} s.`, 1600); return; }
  NY.fxCool = Date.now() + 60000; NY.fxT = Date.now(); mpDirty = true;
  closePhone(); nyShow(P.x, P.z); track('nyota_fx');
}
// remote players' presence: golden name and fireworks
function nyRemote(r, pr) {
  r.tag.nm.classList.toggle('gold', !!pr.gt);
  const fx = numOr(pr.fx, 0);
  if (fx && fx !== r.fx) { const fresh = r.fx !== undefined && Math.abs(Date.now() - fx) < 15000; r.fx = fx; if (fresh) nyShow(r.cx, r.cz); } else if (r.fx === undefined) r.fx = fx;
}

/* ---------- the phone app ---------- */
function nyAppHome(s) {
  phHead(s, 'Nyota', LANG === 'sw' ? 'Nyota na vitu maalum' : 'Stars and special items');
  if (!MP.web || typeof SB_CFG === 'undefined') { s.append(phEl('p', 'ph-note', LANG === 'sw' ? 'Duka la Nyota liko kwenye afconcity.com.' : 'The Nyota shop is on afconcity.com.')); return; }
  if (isTeen()) { s.append(phEl('p', 'ph-note', LANG === 'sw' ? 'Duka la Nyota ni kwa watu wenye miaka 18 au zaidi. Kila kitu kingine kwenye mchezo kinapatikana kwa pesa unazopata ukicheza.' : 'The Nyota shop is for players aged 18 and over. Everything else in the game is yours to earn by playing.')); return; }
  if (!NY.loaded) { s.append(phEl('p', 'ph-note', NY.err || (LANG === 'sw' ? 'Inafungua…' : 'Opening…'))); if (!NY.err) nyLoad(); return; }
  const c = phEl('div', 'ph-card ny-bal'); c.append(phEl('small', '', LANG === 'sw' ? 'Nyota zako' : 'Your Nyota'), phEl('b', '', `★ ${fmt(NY.bal)}`));
  if (NY.wait) c.append(phEl('p', 'ph-note', LANG === 'sw' ? 'Tunasubiri malipo yako kuthibitishwa…' : 'Waiting for your payment to be confirmed…'));
  c.append(phBtn(LANG === 'sw' ? 'Ongeza Nyota' : 'Top up', 'ph-btn', () => phoneGo('nyota', 'packs'))); s.append(c);
  if (NY.cancelled) { s.append(phEl('p', 'ph-note', LANG === 'sw' ? 'Malipo yalisitishwa. Hakuna kilichotozwa.' : 'The payment was cancelled. Nothing was charged.')); NY.cancelled = false; }
  s.append(phEl('p', 'ph-sec', LANG === 'sw' ? 'Duka' : 'Shop'));
  for (const it of NY.items) {
    const has = nyHas(it.id), timed = it.days != null;
    const sub = `${tl(NY_ITEM[it.id] ? NY_ITEM[it.id].d : { en: '', sw: '' })}${has && timed ? ` · ${LANG === 'sw' ? 'inaisha' : 'until'} ${new Date(NY.owned[it.id]).toLocaleDateString()}` : ''}`;
    const btn = has && !timed ? (it.id === 'fx_fireworks' ? phBtn(LANG === 'sw' ? 'Washa' : 'Launch', 'ph-btn sm', nyFireworks) : it.id === 'tag_gold' ? phBtn(NY.tagOn ? (LANG === 'sw' ? 'Zima' : 'Turn off') : (LANG === 'sw' ? 'Washa' : 'Turn on'), 'ph-btn sm ghost', () => { NY.tagOn = !NY.tagOn; lsSet('afc-ny-tag', NY.tagOn ? '' : 'off'); nyEffects(); renderPhone(); }) : phEl('span', 'ph-chip', LANG === 'sw' ? 'Unayo' : 'Owned'))
      : phBtn(`★ ${fmt(it.price)}`, 'ph-btn sm', () => nyBuy(it));
    phRow(s, nyName(it.id, it.name), sub, btn);
  }
  if (nyHas('pass_collect') && Object.keys(bizState()).length) s.append(phBtn(LANG === 'sw' ? 'Kusanya biashara zote' : 'Collect all businesses', 'ph-btn ghost', () => { nyCollectAll(); renderPhone(); }));
  s.append(phEl('p', 'ph-fine', LANG === 'sw' ? 'Nyota hazina thamani ya pesa, haziwezi kubadilishwa kuwa pesa wala kuhamishiwa mtu mwingine. Shilingi za mchezo zinapatikana kwa kucheza tu. Hifadhi msimbo wako wa kuhifadhi (Mipangilio) ili Nyota zikufuate kwenye simu nyingine.' : 'Nyota have no cash value and cannot be cashed out or given to someone else. Game shillings are earned by playing only. Keep your save code (Settings) so your Nyota follow you to another phone.'));
}
function nyAppPacks(s) {
  phHead(s, LANG === 'sw' ? 'Ongeza Nyota' : 'Top up', LANG === 'sw' ? 'Lipa kwa Bachs: M-Pesa, Tigo Pesa, Airtel Money au kadi' : 'Pay with Bachs: M-Pesa, Tigo Pesa, Airtel Money or card');
  if (isTeen() || !nyOk()) return;
  const f = phEl('form', 'ny-form'); f.noValidate = true;
  const pick = phEl('div', 'ny-packs'); let sel = NY.packs[1] || NY.packs[0];
  const draw = () => { pick.innerHTML = ''; for (const p of NY.packs) { const b = phBtn('', 'ny-pack' + (p === sel ? ' on' : ''), () => { sel = p; draw(); }); b.append(phEl('b', '', `★ ${fmt(p.nyota)}`), phEl('small', '', tsh(p.price))); b.setAttribute('aria-pressed', p === sel ? 'true' : 'false'); pick.append(b); } };
  draw(); f.append(pick);
  const field = (name, type, label, auto) => { const l = phEl('label', 'ny-field'); l.append(phEl('span', '', label)); const i = phEl('input'); i.name = name; i.type = type; i.autocomplete = auto; i.maxLength = 120; i.addEventListener('keydown', (e) => e.stopPropagation()); l.append(i); f.append(l); return i; };
  field('name', 'text', LANG === 'sw' ? 'Jina (kwa risiti)' : 'Name (for the receipt)', 'name');
  field('email', 'email', LANG === 'sw' ? 'Barua pepe (risiti inatumwa hapa)' : 'Email (your receipt goes here)', 'email');
  const ad = phEl('label', 'ny-check'); const cb = phEl('input'); cb.type = 'checkbox'; cb.name = 'adult'; ad.append(cb, phEl('span', '', LANG === 'sw' ? 'Nina miaka 18 au zaidi, na nimesoma masharti.' : 'I am 18 or over and I have read the terms.')); f.append(ad);
  const err = phEl('p', 'ph-note err'); err.hidden = true; f.append(err);
  const go = phBtn(LANG === 'sw' ? 'Endelea kulipa' : 'Continue to payment', 'ph-btn', () => {}); go.type = 'submit'; f.append(go);
  f.addEventListener('submit', (e) => { e.preventDefault(); if (sel) nyTopup(sel, f); });
  s.append(f);
  const fine = phEl('p', 'ph-fine'); fine.innerHTML = LANG === 'sw' ? 'Utaenda kwenye ukurasa salama wa Bachs, kisha urudi hapa. Nyota hazina thamani ya pesa. <a href="/terms.html" target="_blank" rel="noopener">Masharti</a> · <a href="/privacy.html" target="_blank" rel="noopener">Faragha</a>' : 'You go to the secure Bachs page, then come back here. Nyota have no cash value. <a href="/terms.html" target="_blank" rel="noopener">Terms</a> · <a href="/privacy.html" target="_blank" rel="noopener">Privacy</a>';
  s.append(fine);
}
function nyCollectAll() {
  if (!nyHas('pass_collect')) return 0;
  let n = 0; for (const b of BIZ) { if (!bizState()[b.id]) continue; const k = bizStash(b); if (k > 0) { bizState()[b.id].at = realNow(); n += k; } }
  if (n > 0) { earn(n, LANG === 'sw' ? 'Biashara' : 'Businesses'); sfx.coin(2); writeSave(); help(LANG === 'sw' ? `Umekusanya <b class="hl">${tsh(n)}</b>.` : `You collected <b class="hl">${tsh(n)}</b>.`, 2600); }
  else help(LANG === 'sw' ? 'Bado hakuna mapato.' : 'Nothing to collect yet.', 2000);
  return n;
}
// paint rows in the Magari app, for each paint owned
function nyPaintRows(s) {
  if (!nyOk() || !ownedVehs.length) return;
  const paints = Object.keys(NY_ITEM).filter(k => NY_ITEM[k].col && nyHas(k)); if (!paints.length) return;
  s.append(phEl('p', 'ph-sec', LANG === 'sw' ? 'Rangi zako za Nyota' : 'Your Nyota paints'));
  ownedVehs.forEach((v, i) => {
    const row = phEl('div', 'ph-btns'); for (const k of paints) { const b = phBtn(nyName(k), 'ph-btn sm ghost', () => nyPaint(v, NY_ITEM[k].col)); b.style.boxShadow = `inset 0 0 0 2px #${NY_ITEM[k].col.toString(16).padStart(6, '0')}`; row.append(b); }
    phRow(s, `${i + 1}. ${tl(DEAL_BY_KIND[v.kind].name)}`, '', null); s.append(row);
  });
}
function initNyota() {
  NY.tagOn = lsGet('afc-ny-tag') !== 'off';
  nyReturnFromUrl();
  APPS.push({ id: 'nyota', sw: 'Nyota', en: 'Nyota', col: '#c79a1e', ico: 'star' });
  PHONE_APPS.nyota = (s, arg) => (arg === 'packs' ? nyAppPacks(s) : nyAppHome(s));
  const gar = PHONE_APPS.garage; PHONE_APPS.garage = (s, a) => { gar(s, a); nyPaintRows(s); };
  const biz = PHONE_APPS.biz; PHONE_APPS.biz = (s, a) => { biz(s, a); if (nyOk() && nyHas('pass_collect') && Object.keys(bizState()).length) s.append(phBtn(LANG === 'sw' ? 'Kusanya zote (pasi ya Nyota)' : 'Collect all (Nyota pass)', 'ph-btn', () => { nyCollectAll(); renderPhone(); })); };
  ICO.star = '<path d="M12 3.5l2.6 5.3 5.8.8-4.2 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.2-4.1 5.8-.8z"/>';
  if (nyOk()) { nyLoad().then(nyWatchTopup); onWebAuth((ev) => { if (ev === 'SIGNED_IN' || ev === 'SIGNED_OUT' || ev === 'USER_UPDATED') nyLoad().then(nyWatchTopup); }); }
}
