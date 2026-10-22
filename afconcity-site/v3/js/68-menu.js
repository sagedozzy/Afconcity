/* ===================== 68 main screen: locked-in fan names, how-to tabs, invites, settings, ads, about map ===================== */
/* ---------- unique fan names: first come, first served, kept on the server ---------- */
const NICK = { mine: '', status: '', key: '', seq: 0, timer: 0, cache: new Map(), want: new Set(), fetching: false, lastFetch: 0 };
const nickKey = (n) => String(n || '').replace(/[^A-Za-z0-9]/g, '').toLowerCase();
const nickOnline = () => !!(MP.web && typeof SB_CFG !== 'undefined');
const NICK_MSG = {
  free: { en: 'Available. Lock it in so nobody else can use it.', sw: 'Linapatikana. Lifunge ili mtu mwingine asilitumie.', c: 'ok' },
  mine: { en: 'Locked in: this name is yours.', sw: 'Limefungwa: jina hili ni lako.', c: 'mine' },
  taken: { en: 'Another fan has locked in this name. Try another.', sw: 'Shabiki mwingine ameshafunga jina hili. Jaribu jingine.', c: 'bad' },
  reserved: { en: 'That name is reserved. Try another.', sw: 'Jina hilo limehifadhiwa. Jaribu jingine.', c: 'bad' },
  rude: { en: 'Please pick a friendlier name.', sw: 'Tafadhali chagua jina la heshima.', c: 'bad' },
  bad: { en: 'Use 3 to 16 letters or numbers to lock in a name.', sw: 'Tumia herufi au namba 3 hadi 16.', c: '' },
  empty: { en: 'Pick a name and lock it in before anyone else does.', sw: 'Chagua jina na ulifunge kabla ya wengine.', c: '' },
};
function nickNote(st, text) {
  const n = $('#nickNote'); if (!n) return;
  const m = NICK_MSG[st]; n.textContent = text || (m ? tl(m) : ''); n.className = 'nick-note' + (m && m.c ? ' ' + m.c : '');
  const b = $('#btnClaim'); if (b) b.hidden = st !== 'free';
}
async function nickCheck() {
  if (!nickOnline()) return;
  const v = ($('#nick').value || '').trim(), k = nickKey(v), seq = ++NICK.seq;
  NICK.key = k;
  if (!v) { NICK.status = ''; nickNote(NICK.mine ? 'mine' : 'empty', NICK.mine ? (LANG === 'sw' ? `Jina lako lililofungwa ni ${NICK.mine}.` : `Your locked-in name is ${NICK.mine}.`) : ''); return; }
  if (NICK.mine && k === nickKey(NICK.mine)) { NICK.status = 'mine'; nickNote('mine'); return; }
  try {
    if (WEB.ready) await WEB.ready; if (!WEB.sb) return;
    const { data, error } = await WEB.sb.rpc('nick_status', { p_nick: v });
    if (seq !== NICK.seq) return;
    if (error) throw error;
    NICK.status = data; nickNote(data);
    if (data === 'free' && NICK.mine) nickNote('free', LANG === 'sw' ? `Linapatikana. Ukilifunga, linachukua nafasi ya ${NICK.mine} (mara moja kwa siku).` : `Available. Locking it in replaces ${NICK.mine} (once a day).`);
  } catch (e) { if (seq === NICK.seq) { NICK.status = ''; nickNote('', ''); } }
}
async function nickClaim() {
  const v = ($('#nick').value || '').trim(); if (!v || !nickOnline()) return;
  const b = $('#btnClaim'); b.disabled = true;
  try {
    const { data, error } = await WEB.sb.rpc('nick_claim', { p_nick: v });
    if (error) throw error;
    NICK.mine = data.nick; NICK.status = 'mine'; NICK.cache.set(nickKey(data.nick), { uid: WEB.uid, nick: data.nick, t: Date.now() });
    state.nick = data.nick; $('#nick').value = data.nick; writeSave(); if (typeof ON !== 'undefined') ON.scoreKey = '';
    nickNote('mine'); sfx.win(); track('nick_claim');
  } catch (e) { nickNote('bad', (e && e.message) || 'Could not lock in that name.'); }
  b.disabled = false;
}
async function nickLoadMine() {
  if (!nickOnline()) return;
  try {
    if (WEB.ready) await WEB.ready; if (!WEB.sb || !WEB.uid) return;
    const { data } = await WEB.sb.rpc('nick_mine');
    NICK.mine = data || '';
    const inp = $('#nick');
    if (NICK.mine && inp && (!inp.value.trim() || /^fan ?\d*$/i.test(inp.value.trim()))) { inp.value = NICK.mine; state.nick = NICK.mine; }
    nickCheck();
  } catch (e) {}
}
/* Play is refused only for a name someone else has locked in */
function nickPlayOk() {
  if (!nickOnline()) return true;
  const v = ($('#nick').value || '').trim();
  if (NICK.status === 'taken' && nickKey(v) === NICK.key) { showSPPlay(); nickNote('taken'); $('#nick').focus(); sfx.deny(); return false; }
  return true;
}
function showSPPlay() { const b = document.querySelector('.mm-item[data-p="play"]'); if (b && b.getAttribute('aria-current') !== 'true') b.click(); }
/* how other players' names show: a name locked in by someone else shows as Fan; the owner's gets a tick */
function nickLookup(k) {
  if (!nickOnline() || k.length < 3) return undefined;
  const c = NICK.cache.get(k);
  if (!c || (c.miss && Date.now() - c.t > 60000)) { NICK.want.add(k); nickFetchSoon(); }
  return c && !c.miss ? c : (c ? null : undefined);
}
function nickShown(n, uid) { if (!nickOnline()) return n; const c = nickLookup(nickKey(n)); return c && uid && c.uid !== uid ? 'Fan' : n; }
function nickOk(n, uid) { if (!nickOnline() || !uid) return false; const c = nickLookup(nickKey(n)); return !!(c && c.uid === uid); }
function nickFetchSoon() {
  if (NICK.fetching || !NICK.want.size) return;
  const wait = Math.max(0, 2000 - (Date.now() - NICK.lastFetch));
  NICK.fetching = true;
  setTimeout(async () => {
    const keys = [...NICK.want].slice(0, 50); keys.forEach(k => NICK.want.delete(k));
    try {
      if (WEB.sb) {
        const { data } = await WEB.sb.from('nicknames').select('key,nick,uid').in('key', keys);
        const got = new Map((data || []).map(r => [r.key, r]));
        for (const k of keys) { const r = got.get(k); NICK.cache.set(k, r ? { uid: r.uid, nick: r.nick, t: Date.now() } : { miss: true, t: Date.now() }); }
      }
    } catch (e) {}
    NICK.lastFetch = Date.now(); NICK.fetching = false;
    if (NICK.want.size) nickFetchSoon();
  }, wait);
}

/* ---------- invites on the Play with friends panel ---------- */
const INV = { url: '', loaded: false };
async function renderInvitePanel() {
  if (!MP.web) return;
  const link = $('#invLink'), sh = $('#btnInvShare'), cp = $('#btnInvCopy'), cnt = $('#invCount');
  try {
    if (!INV.url) {
      await webBackend(); if (WEB.ready) await WEB.ready; if (!WEB.sb) return;
      const { data } = await WEB.sb.rpc('my_ref'); if (!data) return;
      INV.url = `https://afconcity.com/?ref=${data}`;
    }
    link.textContent = INV.url.replace('https://', ''); sh.disabled = cp.disabled = false;
    if (!INV.loaded) {
      INV.loaded = true;
      const text = () => tr(`Come play AfconCity with me: real Fumba, Zanzibar in 3D. Start with ${tsh(INVITE_PAY)} extra:`);
      sh.addEventListener('click', async () => {
        track('invite_share');
        try { if (navigator.share) { await navigator.share({ title: 'AfconCity', text: text(), url: INV.url }); return; } } catch (e) { return; }
        cp.click();
      });
      cp.addEventListener('click', async () => {
        try { await navigator.clipboard.writeText(`${text()} ${INV.url}`); cp.textContent = LANG === 'sw' ? 'Imenakiliwa' : 'Copied'; setTimeout(() => { cp.textContent = LANG === 'sw' ? 'Nakili' : 'Copy'; }, 2000); track('invite_copy'); } catch (e) {}
      });
    }
    const { data } = await WEB.sb.rpc('my_invites');
    if (data && data.joined > 0) cnt.textContent = LANG === 'sw' ? `Marafiki ${data.joined} wamejiunga · umepata ${tsh(data.paid * INVITE_PAY)}. Hadi marafiki 10 kwa wiki.` : `${data.joined} friend${data.joined === 1 ? '' : 's'} joined · ${tsh(data.paid * INVITE_PAY)} earned so far. Up to 10 friends a week.`;
  } catch (e) {}
}

/* ---------- settings: sliders and switches shared by the main screen and the pause menu ---------- */
function applyViewSettings() { document.body.classList.toggle('no-names', !SETTINGS.names); document.body.classList.toggle('no-bubbles', !SETTINGS.bubbles); }
function wireSettings() {
  const save = (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} };
  const sw = (name, key, store) => {
    segSet(`[data-seg="${name}"]`, SETTINGS[key] ? 'on' : 'off');
    document.querySelectorAll(`[data-seg="${name}"] button`).forEach(b => b.addEventListener('click', () => { SETTINGS[key] = b.dataset.v === 'on'; save(store, b.dataset.v); segSet(`[data-seg="${name}"]`, b.dataset.v); applyViewSettings(); }));
  };
  sw('shake', 'shake', 'afconcity-shake'); sw('names', 'names', 'afconcity-names'); sw('bubbles', 'bubbles', 'afconcity-bubbles');
  const range = (name, key, store, after) => document.querySelectorAll(`[data-range="${name}"]`).forEach(r => {
    r.value = SETTINGS[key];
    r.addEventListener('input', () => { SETTINGS[key] = parseFloat(r.value) || SETTINGS[key]; save(store, String(SETTINGS[key])); document.querySelectorAll(`[data-range="${name}"]`).forEach(o => { if (o !== r) o.value = SETTINGS[key]; }); if (after) after(); });
  });
  range('sens', 'sens', 'afconcity-sens');
  range('vol', 'vol', 'afconcity-vol', () => { if (AU.master && AU.on) AU.master.gain.value = 0.75 * SETTINGS.vol; });
  segSet('[data-seg="time"]', state.tmode || 'live');
  applyViewSettings();
}

/* ---------- main screen: how-to tabs, the ads view, the about map ---------- */
function wireMenuExtras() {
  document.querySelectorAll('[data-ht]').forEach(b => { if (b.tagName !== 'BUTTON') return; b.addEventListener('click', () => {
    document.querySelectorAll('button[data-ht]').forEach(x => x.setAttribute('aria-selected', String(x === b)));
    document.querySelectorAll('.ht').forEach(p => { p.hidden = p.dataset.ht !== b.dataset.ht; });
  }); });
  const inp = $('#nick');
  {
    inp.addEventListener('input', () => { clearTimeout(NICK.timer); NICK.status = ''; nickNote('', ''); NICK.timer = setTimeout(nickCheck, 450); });
    $('#btnClaim').addEventListener('click', nickClaim);
    inp.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !$('#btnClaim').hidden) { e.preventDefault(); nickClaim(); } });
  }
  const a = $('#adBrandsLink'); if (a && location.hostname.endsWith('afconcity.com')) a.href = '/brands';
}
// called once the website backend is known (multiplayer start): names come alive only on afconcity.com
function menuOnline() { if (!nickOnline()) return; nickLoadMine(); onWebAuth((ev) => { if (ev === 'SIGNED_IN') nickLoadMine(); }); }
function menuAdsView() { if (mode !== 'intro' || typeof boardSlots !== 'function') return; const s = boardSlots().find(b => b.kind !== 'dala'); if (s) AD.view = boardView(s); }
const ABOUT_PINS = () => [
  ['real', 'Fumba Uptown', -60, 250], ['real', 'Sports City site', SC.x, SC.z], ['real', 'Fumba Road', -560, -240], ['real', 'Beach', -30, 440], ['real', 'Usiku market', 205, 105],
  ['plan', 'Continental Mall', MALL.x, MALL.z], ['plan', 'Burj Zanzibar', BURJ.x, BURJ.z], ['plan', 'IIT Madras', IIT.x, IIT.z], ['plan', 'Hotel', HOTEL.x, HOTEL.z],
  ['plan', 'Hospital', HOSP.x, HOSP.z], ['plan', 'ZHC towers', ZHC.x, ZHC.z], ['plan', 'Film studios', FILM.x, FILM.z], ['plan', 'Ferry pier', PIER.x, coastZ(PIER.x) + 60],
];
function drawAboutMap() {
  const cv = $('#aboutMap'); if (!cv || typeof mapCanvas === 'undefined') return;
  requestAnimationFrame(() => {
    const dpr = Math.min(2, window.devicePixelRatio || 1), W = Math.max(300, Math.round((cv.clientWidth || 440) * dpr)), H = Math.round(W * (MAP.z1 - MAP.z0) / (MAP.x1 - MAP.x0));
    cv.width = W; cv.height = H;
    const c = cv.getContext('2d'); c.fillStyle = '#1b7c93'; c.fillRect(0, 0, W, H);
    try { c.drawImage(mapCanvas, 0, 0, W, H); } catch (e) {}
    const X = (x) => (x - MAP.x0) / (MAP.x1 - MAP.x0) * W, Z = (z) => (z - MAP.z0) / (MAP.z1 - MAP.z0) * H, r = Math.max(4, W / 110), fs = Math.max(10, Math.round(W / 42));
    c.font = `800 ${fs}px ${FONT_D}`; c.textBaseline = 'middle';
    for (const [k, name, x, z] of ABOUT_PINS()) {
      const px = X(x), pz = Z(z), col = k === 'real' ? '#7fe39a' : '#f3b41b';
      c.beginPath(); c.arc(px, pz, r, 0, TAU); c.fillStyle = col; c.fill(); c.lineWidth = Math.max(1.5, r / 3); c.strokeStyle = '#141838'; c.stroke();
      const left = px > W * 0.72; c.textAlign = left ? 'right' : 'left';
      const tx = px + (left ? -r * 1.6 : r * 1.6); c.lineWidth = Math.max(3, fs / 3.2); c.strokeStyle = 'rgba(10,12,30,.85)'; c.strokeText(name, tx, pz); c.fillStyle = '#f7ead0'; c.fillText(name, tx, pz);
    }
  });
}
