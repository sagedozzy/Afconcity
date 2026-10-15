/* ===================== 48 onboarding: quick get-to-know-you questions that fill a new player's starting purse ===================== */
/* Each answer adds TSh 15,000 to the starting cash, and answering all of them adds a TSh 30,000 bonus.
   Answers stay on the device (so a new game keeps the bonus) and go, anonymously, into the player's stats for the owner. */
const ABOUT_KEY = 'afc-about', ABOUT_PER = 15000, ABOUT_ALL = 30000;
const ABOUT_Q = [
  { id: 'where', short: 'Playing from', q: 'Where are you playing from?', a: ['Zanzibar', 'Mainland Tanzania', 'Kenya', 'Uganda', 'Nigeria', 'Ghana', 'South Africa', 'Elsewhere in Africa', 'Europe', 'The Americas', 'Asia or Middle East', 'Somewhere else'] },
  { id: 'team', short: 'AFCON team', q: 'Who are you backing at AFCON 2027?', a: ['Tanzania · Taifa Stars', 'Kenya · Harambee Stars', 'Uganda · The Cranes', 'Nigeria · Super Eagles', 'Morocco · Atlas Lions', 'Senegal · Lions of Teranga', 'Egypt · The Pharaohs', 'Côte d\'Ivoire · The Elephants', 'Ghana · Black Stars', 'Cameroon · Indomitable Lions', 'South Africa · Bafana Bafana', 'Another team'] },
  { id: 'zanzibar', short: 'Zanzibar', q: 'Have you been to Zanzibar?', a: ['I live here', 'I have visited', 'Planning a trip', 'Not yet, one day'] },
  { id: 'age', short: 'Age group', q: 'Which age group are you in?', a: ['Under 18', '18 to 24', '25 to 34', '35 to 44', '45 or over'] },
  { id: 'watch', short: 'Watches football', q: 'How much football do you watch?', a: ['Every match I can', 'Most weekends', 'Big tournaments only', 'Hardly any'] },
  { id: 'match', short: 'AFCON 2027 match', q: 'Will you go to an AFCON 2027 match?', a: ['I have tickets', 'Planning to go', 'Watching on TV', 'Not sure yet'] },
  { id: 'found', short: 'Found us via', q: 'How did you find AfconCity?', a: ['A friend', 'WhatsApp', 'TikTok', 'Instagram', 'X', 'Facebook', 'Google', 'Somewhere else'] },
  { id: 'love', short: 'Wants most', q: 'What do you want most from this game?', a: ['Exploring Zanzibar', 'Making money', 'Driving and racing', 'Playing with friends', 'Football', 'Fashion and homes'] },
];
const ABOUT_MAX = ABOUT_Q.length * ABOUT_PER + ABOUT_ALL;
const ABOUT_RANKS = [[0, 'Mgeni', 'Visitor'], [3, 'Rafiki', 'Friend'], [6, 'Jirani', 'Neighbour'], [ABOUT_Q.length, 'Mwenyeji', 'Local legend']];
function aboutRead() { try { const v = JSON.parse(localStorage.getItem(ABOUT_KEY) || 'null'); if (v && v.a && typeof v.a === 'object') return v; } catch (e) {} return null; }
function aboutWrite(v) { try { localStorage.setItem(ABOUT_KEY, JSON.stringify(v)); } catch (e) {} }
const aboutClean = (a) => { const o = {}; for (const q of ABOUT_Q) if (a && typeof a[q.id] === 'string' && q.a.includes(a[q.id])) o[q.id] = a[q.id]; return o; };
const aboutCount = (a) => Object.keys(aboutClean(a)).length;
const aboutBonus = (a) => { const n = aboutCount(a); return n * ABOUT_PER + (n === ABOUT_Q.length ? ABOUT_ALL : 0); };
const aboutRank = (n) => { let r = ABOUT_RANKS[0]; for (const x of ABOUT_RANKS) if (n >= x[0]) r = x; return r; };
/* the starting purse for a brand-new game, from whatever this player has answered */
function applyStartBonus() {
  if (state.intro || state.bonus !== undefined) return 0;
  const v = aboutRead(), a = v ? aboutClean(v.a) : {}, b = aboutBonus(a);
  state.bonus = b; state.cash += b; state.about = a; shownCash = state.cash;
  return b;
}
/* the Play panel's first fact: the purse this player will start with */
function renderPurseFact() {
  const b = $('#factCash'), l = $('#factCashL'), lede = $('#playLede'); if (!b) return;
  const v = aboutRead(), have = v ? PRICES.start + aboutBonus(v.a) : 0;
  if (state.intro) { b.textContent = `${Math.round(money() / 1000)}k`; l.textContent = 'TSh you have now'; }
  else if (v) { b.textContent = `${Math.round(have / 1000)}k`; l.textContent = 'TSh in your starting purse'; }
  else { b.textContent = `${Math.round(ABOUT_MAX / 1000 + PRICES.start / 1000)}k`; l.textContent = 'TSh to start: answer 8 quick questions'; }
  if (lede) lede.textContent = `You step off the daladala on Fumba Road with ${v || state.intro ? tsh(state.intro ? money() : have) : `up to ${tsh(PRICES.start + ABOUT_MAX)}`}. A VIP seat for the AFCON 2027 match at AfconCity costs TSh 1,000,000, and only fans with a full Fan Passport of Zanzibar experiences can buy one. Work, explore and haggle at real Zanzibar prices.`;
}
/* the questions, one card at a time, with the purse growing as you answer */
function openOnboard(done) {
  audioInit();
  const prev = aboutRead(), a = prev ? aboutClean(prev.a) : {};
  let i = 0, shown = PRICES.start + aboutBonus(a), raf = 0;
  const el = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt !== undefined) e.textContent = txt; return e; };
  const root = el('div', 'ob'); root.id = 'onboard'; root.setAttribute('role', 'dialog'); root.setAttribute('aria-modal', 'true'); root.setAttribute('aria-labelledby', 'obTitle');
  const card = el('div', 'ob-card'); root.append(card);
  const head = el('div', 'ob-top'), ht = el('div'); ht.append(el('span', 'eyebrow', 'Karibu Fumba'), el('h2', '', 'Fill your purse')); ht.querySelector('h2').id = 'obTitle';
  const purse = el('div', 'ob-purse'), cashB = el('b', '', tsh(shown)), rank = el('span', 'ob-rank'); purse.append(el('small', '', 'Starting purse'), cashB, rank); head.append(ht, purse);
  const bar = el('div', 'ob-bar'); bar.setAttribute('aria-hidden', 'true'); const segs = ABOUT_Q.map(() => { const s = el('i'); bar.append(s); return s; });
  const intro = el('p', 'ob-lede', `Every answer adds ${tsh(ABOUT_PER)} to the cash you start with. Answer all ${ABOUT_Q.length} for a ${tsh(ABOUT_ALL)} bonus: up to ${tsh(PRICES.start + ABOUT_MAX)}.`);
  const body = el('div', 'ob-q'); body.setAttribute('aria-live', 'polite');
  const foot = el('div', 'ob-foot'), skip = el('button', 'btn btn-ghost', 'Skip'), go = el('button', 'btn', ''), note = el('p', 'ob-note', 'Answers are anonymous: no names, numbers or contact details. They help us plan events, matches and new features. '); { const a = el('a', '', 'How we use them'); a.href = 'https://afconcity.com/privacy'; a.target = '_blank'; a.rel = 'noopener'; note.append(a); }
  skip.type = go.type = 'button'; foot.append(skip, go);
  card.append(head, bar, intro, body, foot, note);
  document.body.append(root);
  const count = () => aboutCount(a);
  const paint = () => {
    const n = count(), r = aboutRank(n);
    rank.textContent = `${r[1]} · ${r[2]}`;
    segs.forEach((s, k) => { s.className = a[ABOUT_Q[k].id] ? 'on' : k === i ? 'cur' : ''; });
    go.textContent = i >= ABOUT_Q.length ? 'Twende · Play' : `Start with ${tsh(PRICES.start + aboutBonus(a))}`;
    skip.hidden = i >= ABOUT_Q.length;
  };
  const roll = (to) => {
    cancelAnimationFrame(raf); const from = shown, t0 = performance.now(), dur = reduceMotion ? 1 : 650;
    const step = (now) => { const k = Math.min(1, (now - t0) / dur), v = Math.round(from + (to - from) * (1 - Math.pow(1 - k, 3))); cashB.textContent = tsh(v); if (k < 1) raf = requestAnimationFrame(step); else shown = to; };
    raf = requestAnimationFrame(step);
  };
  const pop = (txt, cls) => { const p = el('span', 'ob-pop' + (cls ? ' ' + cls : ''), txt); purse.append(p); setTimeout(() => p.remove(), 1400); };
  const confetti = () => { if (reduceMotion) return; const c = el('div', 'ob-confetti'); for (let k = 0; k < 40; k++) { const s = el('i'); s.style.left = `${Math.random() * 100}%`; s.style.background = ['#f3b41b', '#1e9b57', '#e0553a', '#19b5b1', '#f6f1e7'][k % 5]; s.style.animationDelay = `${Math.random() * 0.4}s`; s.style.setProperty('--dx', `${(Math.random() - 0.5) * 120}px`); c.append(s); } card.append(c); setTimeout(() => c.remove(), 2600); };
  const finish = () => {
    aboutWrite({ v: 1, a: aboutClean(a), at: Date.now() });
    track('onboard_done', { n: aboutCount(a) });
    cancelAnimationFrame(raf); document.removeEventListener('keydown', keys, true); root.remove();
    done();
  };
  const next = () => { i++; if (prev) while (i < ABOUT_Q.length && a[ABOUT_Q[i].id]) i++; show(); };
  const show = () => {
    body.innerHTML = '';
    if (i >= ABOUT_Q.length) {
      const n = count(), all = n === ABOUT_Q.length;
      body.append(el('span', 'eyebrow', all ? 'Hongera! All answered' : `${n} of ${ABOUT_Q.length} answered`), el('h3', '', `You start with ${tsh(PRICES.start + aboutBonus(a))}`));
      body.append(el('p', 'ob-lede', all ? `That includes the ${tsh(ABOUT_ALL)} bonus for answering everything. Asante sana, ${aboutRank(n)[1].toLowerCase()}!` : `Answer the rest next time you start a new game to grow your purse to ${tsh(PRICES.start + ABOUT_MAX)}.`));
      paint(); go.focus(); return;
    }
    const q = ABOUT_Q[i];
    body.append(el('span', 'eyebrow', `Question ${i + 1} of ${ABOUT_Q.length} · +${tsh(ABOUT_PER)}`), el('h3', '', q.q));
    const grid = el('div', 'ob-opts' + (q.a.length > 6 ? ' many' : ''));
    q.a.forEach((txt, k) => {
      const b = el('button', 'ob-opt', txt); b.type = 'button'; b.setAttribute('aria-pressed', String(a[q.id] === txt));
      if (k < 9) b.prepend(el('kbd', '', String(k + 1)));
      b.addEventListener('click', () => {
        const was = count(), wasAll = was === ABOUT_Q.length, fresh = !a[q.id]; a[q.id] = txt;
        const n = count();
        if (fresh) { sfx.coin(1); pop(`+${tsh(ABOUT_PER)}`); }
        if (n === ABOUT_Q.length && !wasAll) setTimeout(() => { sfx.win(); pop(`Bonus +${tsh(ABOUT_ALL)}`, 'big'); confetti(); }, 380);
        if (aboutRank(n)[0] > aboutRank(was)[0] && n < ABOUT_Q.length) setTimeout(() => { sfx.ding(); pop(`Rank up · ${aboutRank(n)[1]}`, 'rank'); }, 300);
        roll(PRICES.start + aboutBonus(a)); grid.querySelectorAll('.ob-opt').forEach(o => o.setAttribute('aria-pressed', String(o === b)));
        paint(); setTimeout(next, reduceMotion ? 120 : 520);
      });
      grid.append(b);
    });
    body.append(grid); paint();
    const first = grid.querySelector('.ob-opt'); if (first) first.focus({ preventScroll: true });
  };
  const keys = (e) => {
    if (!document.body.contains(root)) return;
    e.stopPropagation();
    if (e.key === 'Escape') { e.preventDefault(); finish(); return; }
    const d = /^(?:Digit|Numpad)([1-9])$/.exec(e.code || ''); if (d && i < ABOUT_Q.length) { const b = body.querySelectorAll('.ob-opt')[+d[1] - 1]; if (b) { e.preventDefault(); b.click(); } }
  };
  document.addEventListener('keydown', keys, true);
  skip.addEventListener('click', () => { sfx.deny(); next(); });
  go.addEventListener('click', finish);
  // a returning player who skipped some questions starts at the first one still open
  if (prev) { while (i < ABOUT_Q.length && a[ABOUT_Q[i].id]) i++; }
  show();
}
/* Play: a brand-new game asks the questions first (only those not answered yet) */
function startPlay() {
  if (!state.intro && state.bonus === undefined) { const v = aboutRead(); if (!v || aboutCount(v.a) < ABOUT_Q.length) { openOnboard(enterPlay); return; } }
  enterPlay();
}
