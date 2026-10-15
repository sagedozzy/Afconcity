/* ===================== 62 daily: a login reward that grows with a streak, and three small challenges a day ===================== */
/* Days follow the player's own calendar. Challenges measure progress from where the day started, using the save's own counters. */
const DAILY_PAY = [5000, 7500, 10000, 15000, 20000, 30000, 50000];
const CHALLENGES = [
  { id: 'earn', stat: 'earned', n: [30000, 60000], text: (n) => `Earn ${tsh(n)}`, pay: 10000, fmt: tsh },
  { id: 'jobs', stat: 'jobs', n: [2, 3], text: (n) => `Finish ${n} jobs`, pay: 10000 },
  { id: 'coins', stat: 'coins', n: [6, 10], text: (n) => `Grab ${n} street coins`, pay: 8000 },
  { id: 'kg', stat: 'kg', n: [8, 15], text: (n) => `Harvest ${n} kg of seaweed`, pay: 10000 },
  { id: 'sold', stat: 'sold', n: [3, 5], text: (n) => `Sell ${n} madafu on the beach`, pay: 8000 },
  { id: 'fish', stat: 'fish', n: [2, 3], text: (n) => `Catch ${n} fish off the pier`, pay: 10000 },
  { id: 'thieves', stat: 'thieves', n: [1, 1], text: () => 'Catch a pickpocket', pay: 15000 },
  { id: 'errands', stat: 'errands', n: [1, 2], text: (n) => `Run ${n === 1 ? 'an errand' : n + ' errands'} for someone on the street`, pay: 8000 },
  { id: 'stamp', stat: '@stamps', n: [1, 1], text: () => 'Earn a passport stamp', pay: 15000 },
];
const todayKey = (d) => { d = d || new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const statNow = (stat) => stat === '@stamps' ? stampCount() : (state.stats[stat] || 0);
/* a new day: keep the streak if yesterday was played, and draw three challenges that still make sense for this save */
function dailyRoll() {
  const today = todayKey(), D = state.daily;
  if (D && D.day === today) return false;
  const y = new Date(); y.setDate(y.getDate() - 1);
  const streak = D && D.day === todayKey(y) ? (D.streak || 0) + 1 : 1;
  const r = mulberry32(hashStr(today + (state.nick || '')) >>> 0), pool = CHALLENGES.filter(c => c.id !== 'stamp' || stampCount() < REQUIRED.length);
  const pick = [];
  while (pick.length < 3 && pool.length) { const c = pool.splice(Math.floor(r() * pool.length), 1)[0]; pick.push({ id: c.id, n: c.n[Math.floor(r() * c.n.length)], base: statNow(c.stat), done: false }); }
  state.daily = { day: today, streak, claimed: false, ch: pick };
  return true;
}
const dailyPay = () => DAILY_PAY[Math.min(DAILY_PAY.length, Math.max(1, state.daily.streak)) - 1];
/* the login reward card: shown when a day's first game starts */
function dailyCard() {
  if (!state.daily || state.daily.claimed || $('#dailyCard') || (DEV && window.__noDaily)) return;
  const el = (t, c, x) => { const e = document.createElement(t); if (c) e.className = c; if (x !== undefined) e.textContent = x; return e; };
  const s = state.daily.streak, pay = dailyPay();
  const root = el('div', 'ob daily'); root.id = 'dailyCard'; root.setAttribute('role', 'dialog'); root.setAttribute('aria-modal', 'true'); root.setAttribute('aria-labelledby', 'dailyT');
  const card = el('div', 'ob-card'); root.append(card);
  const h = el('h2', '', s > 1 ? `Day ${s} in a row!` : 'Karibu tena!'); h.id = 'dailyT';
  card.append(el('span', 'eyebrow', 'Daily reward'), h, el('p', 'ob-lede', s > 1 ? 'Come back tomorrow to keep the streak: the reward grows every day for a week.' : 'Play on more days in a row and the daily reward grows, up to TSh 50,000 on day 7.'));
  const row = el('ol', 'daily-row');
  DAILY_PAY.forEach((p, i) => { const li = el('li', i + 1 < Math.min(s, 7) ? 'past' : i + 1 === Math.min(s, 7) ? 'now' : ''); li.append(el('small', '', `Day ${i + 1}`), el('b', '', `${p / 1000}k`)); row.append(li); });
  const go = el('button', 'btn btn-xl', `Collect ${tsh(pay)}`); go.type = 'button';
  card.append(row, go);
  const done = () => { document.removeEventListener('keydown', keys, true); root.remove(); canvas.focus(); };
  const keys = (e) => { e.stopPropagation(); if (e.key === 'Escape' || e.key === 'Enter') { e.preventDefault(); go.click(); } };
  go.addEventListener('click', () => { if (!state.daily.claimed) { state.daily.claimed = true; earn(pay, s > 1 ? `Day ${s} streak` : 'Daily reward'); sfx.coin(2); track('daily_reward', { streak: s }); writeSave(); } done(); });
  document.addEventListener('keydown', keys, true);
  document.body.append(root); go.focus();
}
/* checked every couple of seconds while playing */
function dailyTick() {
  if (mode !== 'play' || !state.intro || (DEV && window.__noDaily)) return;
  if (dailyRoll()) dailyCard();
  for (const c of state.daily.ch) {
    if (c.done) continue;
    const def = CHALLENGES.find(d => d.id === c.id); if (!def) continue;
    if (statNow(def.stat) - c.base >= c.n) {
      c.done = true; earn(def.pay, 'Daily challenge'); splash('CHANGAMOTO!', `${def.text(c.n)} · +${tsh(def.pay)}`, 'gold'); sfx.win(); track('challenge_done', { id: c.id });
      if (state.daily.ch.every(q => q.done)) setTimeout(() => { earn(15000, 'All three challenges'); splash('HONGERA!', `All of today's challenges · +${tsh(15000)}`, 'gold'); sfx.win(); }, 2600);
      writeSave();
    }
  }
}
/* the Passport tab shows today's challenges above the stamps */
function dailyCardHTML(root) {
  if (!state.daily) dailyRoll();
  const el = (t, c, x) => { const e = document.createElement(t); if (c) e.className = c; if (x !== undefined) e.textContent = x; return e; };
  const box = el('section', 'daily-box');
  box.append(el('h3', '', `Today's challenges${state.daily.streak > 1 ? ` · day ${state.daily.streak} streak` : ''}`));
  const ul = el('ul', 'daily-list');
  for (const c of state.daily.ch) {
    const def = CHALLENGES.find(d => d.id === c.id); if (!def) continue;
    const got = Math.min(c.n, Math.max(0, statNow(def.stat) - c.base)), li = el('li', c.done ? 'done' : '');
    const bar = el('i'); bar.style.setProperty('--p', `${Math.round(got / c.n * 100)}%`);
    li.append(el('b', '', def.text(c.n)), el('span', '', c.done ? `Done · +${tsh(def.pay)}` : `${def.fmt ? def.fmt(got) : got} / ${def.fmt ? def.fmt(c.n) : c.n} · ${tsh(def.pay)}`), bar);
    ul.append(li);
  }
  box.append(ul, el('p', 'fine', 'New challenges every day. Finish all three for a TSh 15,000 bonus.'));
  root.prepend(box);
}
function initDaily() { setInterval(dailyTick, 2000); }
