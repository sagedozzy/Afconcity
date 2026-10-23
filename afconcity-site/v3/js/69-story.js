/* ===================== 69 story: from nomad to mogul ===================== */
/* Chapter 1 Survive: you arrive with a backpack and no plan; four guided steps (bed, first job, food, Pesa) with an arrow on the radar.
   Chapter 2 Hustle: the Fan Passport and TSh 1,000,000 for a ticket to the Grand AFCON Final.
   Chapter 3 The Grand Final: walk into the stadium for kickoff.
   Chapter 4 Empire: the Summit and Pitch Day, businesses, vehicles, and alliances with the island's trades. */
const CH_NAME = { 1: { en: 'Survive', sw: 'Kuishi' }, 2: { en: 'Hustle', sw: 'Pambana' }, 3: { en: 'The Grand Final', sw: 'Fainali Kuu' }, 4: { en: 'Empire', sw: 'Himaya' } };
const st2 = () => { if (!state.st2 || typeof state.st2 !== 'object') state.st2 = { bed: 0, ate: 0, tally: {}, allies: {}, ch: 0 }; if (!state.st2.tally) state.st2.tally = {}; if (!state.st2.allies) state.st2.allies = {}; return state.st2; };
function tally(k, n) { const t = st2().tally; t[k] = (t[k] || 0) + (n || 1); }
const tallyOf = (k) => st2().tally[k] || 0;
// players who were already well under way before the story arrived skip the survival steps
const veteran = () => state.stats && (state.stats.jobs >= 3 || stampCount() >= 4 || !!state.ticket);
const SURVIVE = [
  { id: 'bed', title: { en: 'Find your bed', sw: 'Tafuta kitanda chako' }, desc: { en: 'Your chumba (room) is behind the daladala depot, rent paid for this week. Walk in and see it.', sw: 'Chumba chako kiko nyuma ya kituo cha daladala, kodi imelipwa wiki hii. Ingia ukione.' },
    done: () => st2().bed || HOME.inside, at: () => { const h = homeById('chumba'); return h ? { x: h.b[0], z: h.b[1] } : null; } },
  { id: 'job', title: { en: 'Earn your first shillings', sw: 'Pata shilingi zako za kwanza' }, desc: { en: 'Pick a quick job: wash cars for Fundi Rashid, carry crates for Bi Mwajuma, or check Kazi on your phone.', sw: 'Chagua kazi fupi: osha magari kwa Fundi Rashid, beba makreti kwa Bi Mwajuma, au angalia Kazi kwenye simu.' },
    done: () => state.stats.jobs >= 1, at: () => nearestOf(['rashid', 'mwajuma', 'musa', 'hassan']) },
  { id: 'eat', title: { en: 'Eat something', sw: 'Kula kitu' }, desc: { en: 'A hungry hustler is a slow one. Get Zanzibar pizza from Mama Ashura at the Usiku market, or order on your phone (Chakula).', sw: 'Mpambanaji mwenye njaa ni mzito. Nunua pizza ya Zanzibar kwa Mama Ashura sokoni Usiku, au agiza kwenye simu (Chakula).' },
    done: () => st2().ate, at: () => nearestOf(['ashura', 'mama']) },
  { id: 'save', title: { en: 'Keep your money safe', sw: 'Linda pesa zako' }, desc: { en: 'Pickpockets take cash, not Pesa. Put your money on Pesa at a green Wakala kiosk.', sw: 'Wezi wa mfukoni huchukua pesa taslimu, si Pesa. Weka pesa kwenye Pesa kwenye kibanda kijani cha Wakala.' },
    done: () => state.bank > 0, at: () => { let b = null, bd = 1e9; for (const a of AGENTS) { const d = Math.hypot(a.x - P.x, a.z - P.z); if (d < bd) { bd = d; b = a; } } return b ? { x: b.x, z: b.z } : null; } },
];
function nearestOf(ids) { let b = null, bd = 1e9; for (const id of ids) { const n = NPC_BY_ID[id]; if (!n) continue; const d = Math.hypot(n.x - P.x, n.z - P.z); if (d < bd) { bd = d; b = n; } } return b ? { x: b.ix !== undefined ? b.ix : b.x, z: b.iz !== undefined ? b.iz : b.z } : null; }
const surviveStep = () => SURVIVE.find(s => !s.done());
const survived = () => veteran() || st2().skip || !surviveStep();
function chapter() { if (!state.intro) return 0; if (state.done) return 4; if (state.ticket) return 3; return survived() ? 2 : 1; }
const chapterTag = (c) => `${LANG === 'sw' ? 'Sura' : 'Chapter'} ${c} · ${tl(CH_NAME[c])}`;

/* ---------- alliances: the island's trades take you in once you have worked with them ---------- */
const ALLIES = [
  { id: 'union', who: 'omari', name: { en: 'Daladala Union', sw: 'Chama cha Daladala' }, need: () => tallyOf('dala') >= 2, needText: { en: 'Drive 2 daladala shifts for Mzee Omari', sw: 'Endesha zamu 2 za daladala kwa Mzee Omari' }, prog: () => `${Math.min(2, tallyOf('dala'))}/2`,
    perk: { en: 'Public daladala rides are free, and fuel for your own vehicles costs 10% less.', sw: 'Daladala za umma ni bure, na mafuta ya magari yako ni nafuu kwa 10%.' } },
  { id: 'fish', who: 'nahodha', name: { en: 'Fumba Fishermen', sw: 'Wavuvi wa Fumba' }, need: () => tallyOf('fish') >= 3, needText: { en: 'Sell 3 catches to Nahodha Salum', sw: 'Uza samaki mara 3 kwa Nahodha Salum' }, prog: () => `${Math.min(3, tallyOf('fish'))}/3`,
    perk: { en: 'Every catch sells for 20% more.', sw: 'Kila samaki anauzwa kwa 20% zaidi.' } },
  { id: 'spice', who: 'hamisi', name: { en: 'Spice Traders', sw: 'Wafanyabiashara wa Viungo' }, need: () => hasStamp('viungo') && tallyOf('madafu') >= 3, needText: { en: 'Do the spice farm tour and sell 3 madafu', sw: 'Fanya ziara ya shamba la viungo na uze madafu 3' }, prog: () => `${hasStamp('viungo') ? 1 : 0}/1 · ${Math.min(3, tallyOf('madafu'))}/3`,
    perk: { en: 'Your businesses earn 10% more.', sw: 'Biashara zako zinaingiza 10% zaidi.' } },
  { id: 'mamas', who: 'ashura', name: { en: 'Market Mamas', sw: 'Mama wa Soko' }, need: () => tallyOf('meals') >= 3 && tallyOf('porter') >= 1, needText: { en: 'Eat at the market 3 times and carry crates once for Bi Mwajuma', sw: 'Kula sokoni mara 3 na ubebe makreti mara moja kwa Bi Mwajuma' }, prog: () => `${Math.min(3, tallyOf('meals'))}/3 · ${Math.min(1, tallyOf('porter'))}/1`,
    perk: { en: 'Food fills you up 50% more.', sw: 'Chakula kinashibisha 50% zaidi.' } },
];
const ally = (id) => !!st2().allies[id];
function allyNext() { return chapter() === 4 ? ALLIES.find(a => !ally(a.id) && a.need()) || null : null; }
function joinAlly(a) {
  st2().allies[a.id] = Date.now(); writeSave(); sfx.win();
  splash(LANG === 'sw' ? 'MSHIRIKA MPYA' : 'NEW ALLIANCE', tl(a.name), 'gold');
  help(`<b class="hl">${escapeHtml(tl(a.name))}</b>: ${escapeHtml(tl(a.perk))}`, 6000);
  track('ally', { id: a.id });
}
function storyInteraction() {
  const a = allyNext(); if (!a) return null;
  const n = NPC_BY_ID[a.who]; if (!n) return null;
  const x = n.ix !== undefined ? n.ix : n.x, z = n.iz !== undefined ? n.iz : n.z;
  if (Math.hypot(x - P.x, z - P.z) > (n.ir || 3.4)) return null;
  return { text: (LANG === 'sw' ? 'Jiunge: ' : 'Join the ') + tl(a.name), act: () => joinAlly(a) };
}
// perks used by the rest of the game
const allyFare = (n) => (ally('union') ? 0 : n);
const allyFuel = (n) => Math.round(n * (ally('union') ? 0.9 : 1));
const allyFish = (n) => Math.round(n * (ally('fish') ? 1.2 : 1));
const allyBiz = () => (ally('spice') ? 1.1 : 1);
const allyFood = (n) => n * (ally('mamas') ? 1.5 : 1);

/* ---------- the goal card and the radar ---------- */
function storyGoal() {
  const c = chapter();
  if (c === 1) {
    const s = surviveStep(); if (!s) return null;
    const i = SURVIVE.indexOf(s);
    return { tag: chapterTag(1), title: tl(s.title), desc: tl(s.desc), bar: i / SURVIVE.length };
  }
  if (c === 4 && !MIS.id && !MIS.goal && !missionGoal()) {
    const a = allyNext();
    if (a) return { tag: chapterTag(4), title: (LANG === 'sw' ? 'Jiunge na ' : 'Join the ') + tl(a.name), desc: `${LANG === 'sw' ? 'Ongea na' : 'Talk to'} ${NPC_BY_ID[a.who].name}. ${tl(a.perk)}` };
    const open = ALLIES.filter(x => !ally(x.id));
    if (open.length && story().pitch) { const x = open[0]; return { tag: chapterTag(4), title: tl(x.name), desc: `${tl(x.needText)} (${x.prog()}). ${tl(x.perk)}` }; }
    if (!open.length) return { tag: chapterTag(4), title: LANG === 'sw' ? 'Upeo mpya' : 'New horizons', desc: LANG === 'sw' ? 'Umepata washirika wote wanne. Mji Mkongwe na Nungwi vinafunguka katika toleo lijalo: endelea kukuza himaya yako.' : 'All four alliances are yours. Stone Town and Nungwi open in the next update: keep growing your empire.' };
  }
  return null;
}
function storyTarget() {
  const c = chapter();
  if (c === 1) { const s = surviveStep(); return s ? s.at() : null; }
  if (c === 4 && !MIS.id) { const a = allyNext(); if (a) { const n = NPC_BY_ID[a.who]; return n ? { x: n.x, z: n.z } : null; } }
  return null;
}
/* ---------- chapter changes: a title card and a message from Amina ---------- */
const CH_MSG = {
  1: { en: 'You made it to AfconCity. No bed, no job, no ticket yet. First things first: find your room behind the depot. I will text you as you go.', sw: 'Umefika AfconCity. Huna kitanda, kazi wala tiketi bado. Kwanza: tafuta chumba chako nyuma ya kituo. Nitakutumia ujumbe njiani.' },
  2: { en: 'You can look after yourself now. Next: fill your Fan Passport and save TSh 1,000,000. Salim sells the Grand Final tickets at the plaza kiosk.', sw: 'Sasa unaweza kujitunza. Ifuatayo: jaza Pasipoti ya Shabiki na uweke akiba ya TSh 1,000,000. Salim anauza tiketi za Fainali Kuu kwenye kibanda cha uwanjani.' },
  3: { en: 'You have your ticket! The Grand AFCON Final is at the stadium. Walk through Gate A for kickoff.', sw: 'Una tiketi yako! Fainali Kuu ya AFCON iko uwanjani. Pita Lango A kwa mchezo.' },
  4: { en: 'What a final! Now build your empire: the Tech Summit is calling, businesses are for sale, and the island\'s trades are looking for partners.', sw: 'Fainali iliyoje! Sasa jenga himaya yako: mkutano wa teknolojia unakuita, biashara zinauzwa, na wafanyabiashara wa kisiwa wanatafuta washirika.' },
};
function updateStory(dt) {
  if (mode !== 'play' || !state.intro) return;
  const s = st2();
  if (HOME.inside && !s.bed) s.bed = 1;
  const c = chapter();
  if (c !== s.ch) {
    const first = !s.ch; s.ch = c; writeSave();
    if (first && c > 1) return; // an older save: no title card, just carry on
    setTimeout(() => {
      if (mode !== 'play') return;
      splash(`${LANG === 'sw' ? 'SURA' : 'CHAPTER'} ${c}`, tl(CH_NAME[c]).toUpperCase(), 'gold');
      phoneMsg('amina', tl(CH_MSG[c]));
    }, c === 1 ? 2500 : 1200);
  }
  // a step done in chapter 1: a short cheer
  if (c === 1) {
    const i = SURVIVE.findIndex(x => !x.done());
    if (s.step !== undefined && i !== s.step && i > s.step) { sfx.ding(); help(`<b class="hg">✓</b> ${escapeHtml(tl(SURVIVE[i - 1].title))}`, 2200); }
    s.step = i;
  }
}
