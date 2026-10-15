/* ===================== 61 online extras on afconcity.com: cloud saves, leaderboards, invites, analytics ===================== */
/* All of this talks to Supabase through the website's anonymous sign-in (49-web). In the Claude-hosted copy it switches off. */
const ON = { sid: Math.random().toString(36).slice(2, 12), queue: [], t0: Date.now(), last: {}, cloudT: 0, cloudHash: '', scoreT: 0, collectT: 0, moved: false, lb: null, lbT: 0 };
const lsGet = (k) => { try { return localStorage.getItem(k) || ''; } catch (e) { return ''; } };
const lsSet = (k, v) => { try { if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) {} };
const onlineReady = () => !!(MP.web && WEB.sb && WEB.uid);
const fmtCode = (c) => c ? c.slice(0, 5) + '-' + c.slice(5) : '';

/* ---------- analytics: small named events (see supabase/setup.sql, events) ---------- */
function track(name, props) {
  if (!MP.web) return;
  ON.queue.push({ sid: ON.sid, name, props: props || {} });
  if (onlineReady()) flushTrack();
}
function flushTrack() {
  if (!onlineReady() || !ON.queue.length) return;
  const rows = ON.queue.splice(0, 20);
  WEB.sb.from('events').insert(rows).then(() => {}, () => {});
}
/* the last event of a visit has to survive the page closing, so it goes with keepalive */
function trackBeacon(name, props) {
  if (!onlineReady() || !WEB.token) return;
  try { fetch(SB_CFG.url + '/rest/v1/events', { method: 'POST', keepalive: true, headers: { apikey: SB_CFG.key, Authorization: 'Bearer ' + WEB.token, 'Content-Type': 'application/json', Prefer: 'return=minimal' }, body: JSON.stringify([{ sid: ON.sid, name, props: props || {} }]) }); } catch (e) {}
}
function arrivalSource() {
  const q = new URLSearchParams(location.search), ref = q.get('ref'), utm = q.get('utm_source');
  if (utm) return String(utm).toLowerCase().replace(/[^a-z0-9_.-]/g, '').slice(0, 30);
  if (ref) return 'invite';
  try { const h = document.referrer ? new URL(document.referrer).hostname.replace(/^www\./, '') : ''; if (h && h !== location.hostname) return h.slice(0, 40); } catch (e) {}
  return '';
}
/* milestones are noticed by watching the save, so no game code needs to report them */
function watchMilestones() {
  const L = ON.last, jobs = state.stats.jobs || 0, st = stampCount();
  if (L.init) {
    if (state.intro && !L.intro) track('met_amina');
    if (jobs > 0 && !L.jobs) track('first_job');
    if (st >= 3 && L.stamps < 3) track('stamps_3');
    if (st >= REQUIRED.length && L.stamps < REQUIRED.length) track('stamps_all');
    if (state.ticket && !L.ticket) track('vip_ticket');
  }
  Object.assign(L, { init: true, intro: state.intro, jobs, stamps: st, ticket: state.ticket });
}

/* ---------- cloud saves: a 10-letter code; typing it on another phone moves the save there ---------- */
function cloudPayload() { const a = aboutRead(); return { save: state, about: a ? a.a : null, at: Date.now() }; }
async function cloudSync(force) {
  if (!onlineReady() || ON.moved || ON.cloudBusy || mode === 'intro') return;
  if (!player) return;
  if (!playerVeh) { state.x = P.x; state.z = P.z; state.ry = player.rotation.y; }
  const body = cloudPayload(), hash = JSON.stringify(body.save).length + ':' + Math.round(state.cash) + ':' + stampCount() + ':' + state.stats.jobs + ':' + Math.round(state.playMs / 60000);
  if (!force && hash === ON.cloudHash) return;
  ON.cloudBusy = true;
  try {
    const { data, error } = await WEB.sb.rpc('save_put', { p_code: lsGet('afc-cloud') || null, p_data: body });
    if (error) {
      if (/moved to another device/i.test(error.message || '')) { ON.moved = true; help('Your cloud save is now on another phone. This copy will not upload any more.', 6000); }
      else if (/unknown save code/i.test(error.message || '')) lsSet('afc-cloud', null);
    } else if (data) { lsSet('afc-cloud', String(data)); ON.cloudHash = hash; ON.cloudAt = Date.now(); renderCloud(); }
  } catch (e) {}
  ON.cloudBusy = false;
}
async function cloudLoad(code, out) {
  const say = (t, bad) => { if (out) { out.textContent = t; out.classList.toggle('bad', !!bad); } };
  if (!MP.web) { say('Save codes work on afconcity.com.', true); return; }
  if (!/^[A-HJ-NP-Z2-9]{10}$/.test(String(code || '').toUpperCase().replace(/[^A-Z0-9]/g, ''))) { say('A save code is 10 letters and numbers, like ABCDE-23456.', true); return; }
  say('Looking for your save…');
  try {
    await webBackend();
    if (!WEB.uid) { say('Could not reach the server. Check your connection.', true); return; }
    const { data, error } = await WEB.sb.rpc('save_load', { p_code: code });
    if (error) { say(error.message || 'That code did not work.', true); return; }
    const s = data && data.data && data.data.save;
    if (!s || s.v !== SAVE_V) { say('That save is from a version of the game this phone cannot read.', true); return; }
    lsSet(SAVE_KEY, JSON.stringify(s)); lsSet('afc-cloud', data.code);
    if (data.data.about) aboutWrite({ v: 1, a: aboutClean(data.data.about), at: Date.now() });
    track('save_loaded');
    say(`Found it: ${s.nick || 'Fan'} with ${tsh((s.cash || 0) + (s.bank || 0))}. Loading…`);
    setTimeout(() => location.reload(), 900);
  } catch (e) { say('Could not reach the server. Check your connection.', true); }
}
/* the save code card, in Settings (pause menu) */
function renderCloud() {
  const box = $('#cloudBox'); if (!box) return;
  box.innerHTML = '';
  const el = (t, c, x) => { const e = document.createElement(t); if (c) e.className = c; if (x !== undefined) e.textContent = x; return e; };
  if (!MP.web) { box.append(el('p', 'fine', 'Cloud saves work when you play on afconcity.com.')); return; }
  const code = lsGet('afc-cloud');
  if (ON.moved) { box.append(el('p', 'fine', 'This save now lives on another phone. Start a new game here, or load a different code from the start screen.')); return; }
  if (!code) { box.append(el('p', 'fine', 'Your progress is backed up online a minute after you start playing. Your save code will appear here.')); return; }
  const row = el('div', 'cloud-row'), b = el('b', 'cloud-code', fmtCode(code)), cp = el('button', 'btn btn-sm', 'Copy');
  cp.type = 'button'; cp.addEventListener('click', () => { try { navigator.clipboard.writeText(fmtCode(code)).then(() => { cp.textContent = 'Copied'; }, () => {}); } catch (e) {} });
  row.append(b, cp); box.append(row);
  box.append(el('p', 'fine', `Type this code on another phone or computer (start screen, "Have a save code?") to carry on there. Keep it private: anyone with it can load your game.${ON.cloudAt ? ' Last backed up ' + new Date(ON.cloudAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + '.' : ''}`));
}

/* ---------- leaderboards ---------- */
function isoWeek(d) {
  d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = d.getUTCDay() || 7; d.setUTCDate(d.getUTCDate() + 4 - day);
  const y0 = new Date(Date.UTC(d.getUTCFullYear(), 0, 1)), wk = Math.ceil(((d - y0) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(wk).padStart(2, '0')}`;
}
/* this week's numbers are counted from where the week started for this save */
function weekNumbers() {
  const wk = isoWeek(new Date());
  if (!state.week || state.week.id !== wk) state.week = { id: wk, stamps0: stampCount(), earned0: state.stats.earned || 0 };
  return { week: wk, week_stamps: Math.max(0, stampCount() - state.week.stamps0), week_earned: Math.max(0, Math.round((state.stats.earned || 0) - state.week.earned0)) };
}
async function scoreSync() {
  if (!onlineReady() || mode === 'intro' || !state.intro) return;
  const w = weekNumbers(), best = state.stats.best ? Math.round(state.stats.best * 1000) : null;
  const row = { uid: WEB.uid, nick: (state.nick || 'Fan').slice(0, 16), worth: clamp(Math.round(money()), 0, 99999999), stamps: stampCount(), week: w.week, week_stamps: w.week_stamps, week_earned: clamp(w.week_earned, 0, 99999999), best_race: best && best >= 20000 && best <= 3600000 ? best : null };
  const key = JSON.stringify(row); if (key === ON.scoreKey) return;
  try { const { error } = await WEB.sb.from('scores').upsert(row, { onConflict: 'uid' }); if (!error) ON.scoreKey = key; } catch (e) {}
}
async function loadBoards() {
  if (!MP.web) return null;
  await webBackend(); if (!WEB.sb) return null;
  const wk = isoWeek(new Date()), sel = 'uid,nick,worth,stamps,week_stamps,week_earned,best_race';
  const [a, b, c] = await Promise.all([
    WEB.sb.from('scores').select(sel).eq('week', wk).gt('week_stamps', 0).order('week_stamps', { ascending: false }).order('week_earned', { ascending: false }).limit(10),
    WEB.sb.from('scores').select(sel).gt('worth', 0).order('worth', { ascending: false }).limit(10),
    WEB.sb.from('scores').select(sel).not('best_race', 'is', null).order('best_race', { ascending: true }).limit(10),
  ]);
  return { week: wk, race: a.data || [], rich: b.data || [], fast: c.data || [] };
}
async function renderLeaders() {
  const box = $('#pmLeaders'); if (!box) return;
  const el = (t, c, x) => { const e = document.createElement(t); if (c) e.className = c; if (x !== undefined) e.textContent = x; return e; };
  box.innerHTML = '';
  if (!MP.web) { box.append(el('p', 'fine', 'Leaderboards and invites run on afconcity.com.')); return; }
  box.append(el('p', 'fine', 'Loading the leaderboards…'));
  scoreSync();
  let L = null; try { L = await loadBoards(); } catch (e) {}
  box.innerHTML = '';
  // invite card first: it is how the boards grow
  box.append(inviteCard());
  if (!L) { box.append(el('p', 'fine', 'Could not load the leaderboards. Check your connection.')); return; }
  const me = WEB.uid;
  const board = (title, sub, rows, val) => {
    const s = el('section', 'lb'); s.append(el('h3', '', title), el('p', 'fine', sub));
    const ol = el('ol', 'lb-list');
    if (!rows.length) ol.append(el('li', 'lb-empty', 'Nobody yet. Be first!'));
    rows.forEach((r) => { const li = el('li', r.uid === me ? 'me' : ''); li.append(el('b', '', r.nick || 'Fan'), el('span', '', val(r))); ol.append(li); });
    s.append(ol); box.append(s);
  };
  const w = weekNumbers();
  board('Weekly Passport Race', `Most passport stamps this week (Monday to Sunday), then most shillings earned. You: ${w.week_stamps} stamp${w.week_stamps === 1 ? '' : 's'}, ${tsh(w.week_earned)}.`, L.race, (r) => `${r.week_stamps} stamp${r.week_stamps === 1 ? '' : 's'} · ${tsh(r.week_earned)}`);
  board('Richest fans', 'Cash plus Pesa, right now.', L.rich, (r) => tsh(r.worth));
  board('Fastest bajaji race', 'Best time round the Fumba race course.', L.fast, (r) => fmtTime(r.best_race / 1000));
}

/* ---------- invites: both players get TSh 25,000 once the new player gets going ---------- */
const INVITE_PAY = 25000;
function inviteCard() {
  const el = (t, c, x) => { const e = document.createElement(t); if (c) e.className = c; if (x !== undefined) e.textContent = x; return e; };
  const s = el('section', 'lb invite'); s.append(el('h3', '', 'Invite friends · TSh 25,000 each'), el('p', 'fine', `Send your link. When a friend starts playing through it, you both get ${tsh(INVITE_PAY)} (up to 10 friends a week).`));
  const row = el('div', 'cloud-row'), code = el('b', 'cloud-code', '…'), cp = el('button', 'btn btn-sm', 'Share link'); cp.type = 'button'; cp.disabled = true;
  row.append(code, cp); s.append(row);
  (async () => {
    try {
      await webBackend(); if (!WEB.sb) return;
      const { data } = await WEB.sb.rpc('my_ref'); if (!data) return;
      const url = `https://afconcity.com/?ref=${data}`; code.textContent = url.replace('https://', ''); cp.disabled = false;
      cp.addEventListener('click', async () => {
        const text = tr(`Come play AfconCity with me: real Fumba, Zanzibar in 3D. Start with ${tsh(INVITE_PAY)} extra:`);
        track('invite_share');
        try { if (navigator.share) { await navigator.share({ title: 'AfconCity', text, url }); return; } } catch (e) { return; }
        try { await navigator.clipboard.writeText(`${text} ${url}`); cp.textContent = 'Link copied'; } catch (e) {}
      });
    } catch (e) {}
  })();
  return s;
}
/* arriving with ?ref=: remembered until this player has an ID, then registered once */
function inviteArrive() { const r = new URLSearchParams(location.search).get('ref'); if (r && /^[a-z0-9]{6}$/i.test(r) && !lsGet('afc-ref-done')) lsSet('afc-ref', r.toLowerCase()); }
async function inviteTick() {
  if (!onlineReady()) return;
  const ref = lsGet('afc-ref');
  if (ref && !lsGet('afc-ref-done')) { try { await WEB.sb.rpc('invite_accept', { p_ref: ref }); } catch (e) {} lsSet('afc-ref-done', '1'); lsSet('afc-ref', null); }
  // the new player's own reward: once they have met Amina and played a few minutes
  if (lsGet('afc-ref-done') && !lsGet('afc-inv-q') && state.intro && state.playMs > 4 * 60000 && mode === 'play') {
    try { const { data } = await WEB.sb.rpc('invite_qualify'); lsSet('afc-inv-q', '1'); if (data) { earn(INVITE_PAY, 'Invite bonus'); splash('KARIBU RAFIKI!', `Your friend's invite paid ${tsh(INVITE_PAY)}`, 'gold'); sfx.win(); track('invite_paid'); } } catch (e) {}
  }
  // the inviter's rewards
  if (mode === 'play' && Date.now() - ON.collectT > 5 * 60000) {
    ON.collectT = Date.now();
    try { const { data } = await WEB.sb.rpc('invite_collect'); const n = +data || 0; if (n > 0) { earn(INVITE_PAY * n, n === 1 ? 'A friend joined' : `${n} friends joined`); splash('ASANTE!', `${n} friend${n === 1 ? '' : 's'} started playing · +${tsh(INVITE_PAY * n)}`, 'gold'); sfx.win(); } } catch (e) {}
  }
}

/* ---------- the clock for all of the above ---------- */
function initOnline() {
  inviteArrive();
  if (!MP.web) return;
  webBackend().then(() => {
    track('session_start', { src: arrivalSource(), dev: isCoarse ? 'touch' : 'desktop', gfx, w: innerWidth, returning: !!readSave() });
    flushTrack();
  }, () => {});
  setInterval(() => {
    if (!onlineReady()) return;
    flushTrack();
    if (mode !== 'intro') watchMilestones();
    const t = Date.now();
    if (mode !== 'intro' && t - ON.cloudT > 60000) { ON.cloudT = t; cloudSync(false); }
    if (mode !== 'intro' && t - ON.scoreT > 90000) { ON.scoreT = t; scoreSync(); }
    inviteTick();
  }, 5000);
  // play time is reported in pieces (each time the page is hidden), so pieces add up to the real total
  const bye = () => { if (mode === 'intro') return; cloudSync(true); scoreSync(); const t = Date.now(); trackBeacon('session_end', { sec: Math.round((t - ON.t0) / 1000) }); ON.t0 = t; };
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') bye(); });
  addEventListener('pagehide', bye);
}
