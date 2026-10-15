/* ===================== 63 match days: AFCON dates built in, more added by the owner; watch parties at the Fan Zone ===================== */
/* Times are stored in UTC. Built-in dates come from CAF's announced calendar (qualifiers and the 19 June – 17 July 2027 finals). */
const MATCHDAYS = [
  { id: 'q34', title: 'AFCON qualifiers · matchdays 3 and 4', start: '2026-11-09T10:00:00Z', end: '2026-11-17T22:00:00Z', kind: 'watch' },
  { id: 'q56', title: 'AFCON qualifiers · matchdays 5 and 6', start: '2027-03-22T10:00:00Z', end: '2027-03-30T22:00:00Z', kind: 'watch' },
  { id: 'open', title: 'AFCON 2027 opening match', start: '2027-06-19T08:00:00Z', end: '2027-06-19T23:30:00Z', kind: 'watch', big: true },
  { id: 'finals', title: 'AFCON 2027 · every match on the big screen', start: '2027-06-20T08:00:00Z', end: '2027-07-16T23:30:00Z', kind: 'watch' },
  { id: 'final', title: 'AFCON 2027 final', start: '2027-07-17T08:00:00Z', end: '2027-07-17T23:30:00Z', kind: 'watch', big: true },
];
const EV = { owner: [], live: null, next: null, t: 0, payT: 0 };
const WATCH_PAY = 2000, WATCH_CAP = 30;
const evAll = () => EV.owner.concat(MATCHDAYS);
const inFanZone = () => Math.abs(P.x - FZ.x) < FZ.w / 2 && Math.abs(P.z - FZ.z) < FZ.d / 2;
function cleanEvent(e) {
  if (!e || typeof e !== 'object') return null;
  const s = Date.parse(e.start), en = Date.parse(e.end), title = String(e.title || '').replace(/\s+/g, ' ').trim().slice(0, 70);
  if (!title || !isFinite(s) || !isFinite(en) || en <= s || en - s > 40 * 86400000) return null;
  return { id: String(e.id || s).slice(0, 24), title, start: new Date(s).toISOString(), end: new Date(en).toISOString(), kind: e.kind === 'party' ? 'party' : 'watch', note: String(e.note || '').slice(0, 80), big: !!e.big, own: true };
}
function evalEvents() {
  const t = Date.now(); let live = null, next = null;
  for (const e of evAll()) {
    const s = Date.parse(e.start), en = Date.parse(e.end);
    if (s <= t && t < en) { if (!live || (e.own && !live.own) || (e.big && !live.big)) live = e; }
    else if (s > t && (!next || s < Date.parse(next.start))) next = e;
  }
  const changed = (live && live.id) !== (EV.live && EV.live.id);
  EV.live = live; EV.next = next;
  if (changed) { renderEventBanner(); if (live && mode === 'play') help(`<b class="hl">${escapeHtml(live.title)}</b> is on. Watch party at the <b class="hl">Fan Zone</b>: cheer with the crowd for ${tsh(WATCH_PAY)} a minute.`, 7000); }
}
const whenText = (iso) => { const d = new Date(iso), days = Math.ceil((d - Date.now()) / 86400000); return days <= 1 ? `today at ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : days < 14 ? `in ${days} days` : d.toLocaleDateString([], { day: 'numeric', month: 'long', year: 'numeric' }); };
/* the start screen's match-day line */
function renderEventBanner() {
  const b = $('#eventBanner'); if (!b) return;
  const e = EV.live || EV.next;
  if (!e) { b.hidden = true; return; }
  b.hidden = false; b.classList.toggle('live', !!EV.live);
  b.innerHTML = '';
  const tag = document.createElement('b'); tag.textContent = EV.live ? 'Live now' : 'Next match day';
  const t = document.createElement('span'); t.textContent = EV.live ? `${e.title} · watch party at the Fan Zone` : `${e.title} · ${whenText(e.start)}`;
  b.append(tag, t);
}
/* during a match day: cheering in the Fan Zone pays, up to 30 minutes per event per save */
function eventsTick(dt) {
  EV.t -= dt; if (EV.t <= 0) { EV.t = 20; evalEvents(); }
  if (mode !== 'play' || !EV.live || !state.intro) return;
  if (!inFanZone()) { EV.payT = 0; return; }
  EV.payT += dt;
  if (EV.payT >= 60) {
    EV.payT = 0;
    const w = state.watch = state.watch || {}, k = EV.live.id;
    if ((w[k] || 0) < WATCH_CAP) { w[k] = (w[k] || 0) + 1; earn(WATCH_PAY, 'Watch party'); playEmote(player, 'cheer'); sfx.clap(); if (w[k] === 1) track('watch_party', { ev: k }); if (w[k] === WATCH_CAP) note('That is the watch-party pay for this match day. Enjoy the game!'); }
  }
}
function eventScreenMsgs() {
  if (EV.live) return [['WATCH PARTY · LIVE', EV.live.title], ['CHEER HERE', `${tsh(WATCH_PAY)} a minute in the Fan Zone`]];
  if (EV.next && Date.parse(EV.next.start) - Date.now() < 7 * 86400000) return [['NEXT MATCH DAY', `${EV.next.title} · ${whenText(EV.next.start)}`]];
  return [];
}
function initEvents() {
  evalEvents();
  // owner-added match days live in config/events, readable by everyone
  const hook = setInterval(() => {
    if (!AD.ready) return; clearInterval(hook);
    if (!AD.db) return;
    try { AD.db.doc('config/events').onSnapshot((s) => { const d = s.exists ? s.data() : {}; EV.owner = (Array.isArray(d.list) ? d.list : []).map(cleanEvent).filter(Boolean).slice(0, 40); evalEvents(); renderEventBanner(); }, () => {}); } catch (e) {}
  }, 1000);
}
/* owner tools: add and remove match days */
function ownerEvents() {
  const box = el('section', 'ad-insights');
  box.append(el('h3', '', 'Match days'), el('p', 'fine', 'On a match day the start screen and the Fan Zone big screen show it, and players earn TSh 2,000 a minute for cheering in the Fan Zone (up to 30 minutes each). AFCON dates are built in; add specific games here. Times are in your local time.'));
  const ul = el('ul', 'jobs');
  const draw = () => {
    ul.innerHTML = '';
    const list = evAll().slice().sort((a, b) => Date.parse(a.start) - Date.parse(b.start)).filter(e => Date.parse(e.end) > Date.now() - 86400000);
    for (const e of list) {
      const li = el('li'); li.append(el('b', '', e.title), el('span', '', `${new Date(e.start).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })} to ${new Date(e.end).toLocaleString([], { timeStyle: 'short' })}${e.own ? '' : ' · built in'}`));
      if (e.own) { const del = el('button', 'btn btn-sm btn-ghost', 'Remove'); del.type = 'button'; del.addEventListener('click', async () => { await saveOwnerEvents(EV.owner.filter(x => x.id !== e.id)); draw(); }); li.append(del); }
      ul.append(li);
    }
  };
  draw();
  const f = el('form', 'ad-form');
  f.innerHTML = '<label>Title<input name="title" maxlength="70" placeholder="Tanzania vs Kenya" required></label><label>Day<input name="day" type="date" required></label><label>Starts<input name="from" type="time" value="18:00" required></label><label>Ends<input name="to" type="time" value="21:00" required></label><label>Kind<select name="kind"><option value="watch">Match screening</option><option value="party">Fan party</option></select></label><button class="btn btn-sm" type="submit">Add match day</button><p class="fine" data-out></p>';
  f.addEventListener('keydown', (e) => e.stopPropagation());
  f.addEventListener('submit', async (e) => {
    e.preventDefault();
    const q = (n) => f.querySelector(`[name=${n}]`).value, out = f.querySelector('[data-out]');
    const s = new Date(`${q('day')}T${q('from')}`), en0 = new Date(`${q('day')}T${q('to')}`), en = en0 <= s ? new Date(en0.getTime() + 86400000) : en0;
    const ev = cleanEvent({ id: 'o' + Date.now().toString(36), title: q('title'), start: s.toISOString(), end: en.toISOString(), kind: q('kind') });
    if (!ev) { out.textContent = 'Check the title, day and times.'; return; }
    try { await saveOwnerEvents(EV.owner.concat([ev])); out.textContent = 'Added. Players see it within a minute.'; f.reset(); draw(); } catch (err) { out.textContent = 'Could not save. Are you signed in as the owner?'; }
  });
  box.append(ul, f);
  return box;
}
async function saveOwnerEvents(list) {
  EV.owner = list.map(cleanEvent).filter(Boolean).slice(0, 40);
  await AD.db.doc('config/events').set({ list: EV.owner.map((e) => { const o = Object.assign({}, e); delete o.own; return o; }), at: Date.now() });
  evalEvents();
}
