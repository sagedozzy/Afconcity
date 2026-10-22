/* ===================== 65 story missions: a small mission engine and the post-AFCON story ===================== */
/* A mission is an async script. It waits on simple steps: reach a marker (with an optional time limit), play a scene on a
   small indoor set (fade, fixed camera shots, posed characters, voiced subtitles), make a choice, play a minigame.
   If the player fails or quits, the run token changes and the script stops at its next step. Checkpoints let a retry
   start from the last stage reached. Story: after the AFCON VIP ticket, the Zanzibar Tech & AI Summit opens in
   AfconCity; after the Summit, Pitch Day. */
const MIS = { id: null, run: 0, goal: null, failing: false, busy: false, tUnlock: 0 };
class MissionStop extends Error {}
const tl = (o) => (o == null ? '' : typeof o === 'string' ? o : (LANG === 'sw' && o.sw) ? o.sw : o.en);
const story = () => { state.story = state.story && typeof state.story === 'object' ? state.story : {}; return state.story; };
const misSleep = (ms) => new Promise(r => setTimeout(r, ms));
function misAlive(run) { if (MIS.run !== run || !MIS.id) throw new MissionStop('stopped'); }

/* ---------- places ---------- */
const ZTAS = { x: -1094, z: -128, w: 30, d: 20 };
const ZTAS_DOOR = { x: ZTAS.x, z: ZTAS.z + ZTAS.d / 2 + 4 };
const CAFE = { x: 230, z: 20, w: 9, d: 7 };
const CAFE_DOOR = { x: CAFE.x, z: CAFE.z + CAFE.d / 2 + 2.5 };
const BURJ_DOOR = { x: BURJ.x, z: BURJ.z - BURJ.d / 2 - 5 };
const MIS_PLACES = { ztas: null, cafe: null };
function buildMissionPlaces() {
  // the Summit hall: a white conference pavilion beside the hotel, hidden until the summit opens
  const g = new T.Group(), Z = ZTAS;
  const tent = meshOf(new T.BoxGeometry(Z.w, 7, Z.d), new T.MeshStandardMaterial({ color: C(0xf4f2ec), roughness: 0.7 }), true); tent.position.set(Z.x, 3.5, Z.z); g.add(tent);
  const roof = meshOf(new T.CylinderGeometry(Z.d / 2 + 0.6, Z.d / 2 + 0.6, Z.w + 1, 4, 1, false, Math.PI / 4), new T.MeshStandardMaterial({ color: C(0x1e9b57), roughness: 0.6 }), true);
  roof.rotation.z = Math.PI / 2; roof.scale.set(1, 1, 0.42); roof.position.set(Z.x, 7, Z.z); g.add(roof);
  const sign = signMesh('ZANZIBAR TECH & AI SUMMIT', 22, 2.4, { bg: '#141838' }); sign.position.set(Z.x, 5.2, Z.z + Z.d / 2 + 0.06); g.add(sign);
  const door = meshOf(new T.BoxGeometry(5, 3.4, 0.2), new T.MeshStandardMaterial({ color: C(0x232a63), roughness: 0.4, metalness: 0.2 }), true); door.position.set(Z.x, 1.7, Z.z + Z.d / 2 + 0.05); g.add(door);
  for (const s of [-1, 1]) {
    const b = signMesh('ZTAS · AfconCity', 2.2, 6, { bg: s > 0 ? '#1e9b57' : '#e0553a' }); b.position.set(Z.x + s * 6, 3.2, Z.z + Z.d / 2 + 3.2); g.add(b);
    const pole = meshOf(new T.CylinderGeometry(0.06, 0.06, 6.6, 6), M(0xd8dce2), true); pole.position.set(Z.x + s * 6 - 1.15, 3.3, Z.z + Z.d / 2 + 3.2); g.add(pole);
  }
  scene.add(g); MIS_PLACES.ztas = { g, col: addObb(Z.x, Z.z, Z.w, Z.d, 0) };
  // Kahawa Code: a small coffee shop and coworking spot in Uptown
  const c = new T.Group(), K = CAFE;
  const shop = meshOf(new T.BoxGeometry(K.w, 3.6, K.d), new T.MeshStandardMaterial({ color: C(0xf3e3c8), roughness: 0.85 }), true); shop.position.set(K.x, 1.8, K.z); c.add(shop);
  const awn = meshOf(new T.BoxGeometry(K.w + 0.4, 0.12, 1.6), new T.MeshStandardMaterial({ color: C(0x7a3b1e), roughness: 0.7 }), true); awn.position.set(K.x, 2.8, K.z + K.d / 2 + 0.75); awn.rotation.x = 0.18; c.add(awn);
  const cs = signMesh('KAHAWA CODE · café & coworking', 7.4, 0.9, { bg: '#2a1a12' }); cs.position.set(K.x, 3.25, K.z + K.d / 2 + 0.06); c.add(cs);
  const glass = meshOf(new T.BoxGeometry(K.w - 2, 2, 0.08), new T.MeshStandardMaterial({ color: C(0x2a3a44), roughness: 0.15, metalness: 0.5 }), true); glass.position.set(K.x, 1.3, K.z + K.d / 2 + 0.03); c.add(glass);
  scene.add(c); MIS_PLACES.cafe = { g: c }; addObb(K.x, K.z, K.w, K.d, 0);
  showMissionPlaces();
}
function showMissionPlaces() { if (MIS_PLACES.ztas) { const on = !!state.ticket; MIS_PLACES.ztas.g.visible = on; MIS_PLACES.ztas.col.on = on; } }

/* ---------- the cast ---------- */
const CAST = {
  zuri: { name: 'Zuri', look: { skin: 0x5a3620, f: true, hair: 'braids', shirt: 0x19b5b1, dress: 0x19b5b1, lower: 0x141838, eye: 'round', shoe: 'sneaker', shoes: 0xf4f4f0, iris: 0x2b190d } },
  asha: { name: 'Asha', role: { en: 'Summit host', sw: 'Mwenyeji wa mkutano' }, look: { skin: 0x6b4226, f: true, hair: 'ponytail', shirt: 0x141838, neck: 'jacket', inner: 0xf3b41b, sleeve: 'long', untuck: true, lower: 0x141838, pants: true, shoe: 'loafer', shoes: 0x2a1d14 } },
  fatma: { name: 'Mama Fatma', role: { en: 'Angel investor', sw: 'Mwekezaji' }, look: { skin: 0x46291a, f: true, hair: 'scarf', scarf: 0x8e3b8f, shirt: 0xf6f1e7, dress: 0x8e3b8f, shoe: 'loafer', shoes: 0x2a1d14 } },
  kwame: { name: 'Kwame', role: { en: 'Venture capital', sw: 'Mfuko wa uwekezaji' }, look: { skin: 0x3d2416, hair: 'short', shirt: 0x2a2d33, neck: 'jacket', inner: 0xf6f1e7, tie: 0x1f4fa0, sleeve: 'long', untuck: true, lower: 0x2a2d33, pants: true, eye: 'shades', shoe: 'loafer', shoes: 0x2a1d14 } },
  elena: { name: 'Elena', role: { en: 'Impact fund', sw: 'Mfuko wa maendeleo' }, look: { skin: 0xd9a77e, f: true, hair: 'bun', hairCol: 0x6a4a2a, shirt: 0x232a63, lower: 0x232a63, pants: true, shoe: 'loafer', shoes: 0x15161c } },
};
const meName = () => state.nick || (LANG === 'sw' ? 'Wewe' : 'You');

/* ---------- lines: English and Kiswahili, one id each (the voice file names) ---------- */
const LINES = {
  // the summit
  s_a1: { who: 'asha', en: 'Karibu sana to the Zanzibar Tech and AI Summit, right here in AfconCity!', sw: 'Karibu sana kwenye Mkutano wa Teknolojia na Akili Bandia wa Zanzibar, hapa hapa AfconCity!' },
  s_a2: { who: 'asha', en: 'AFCON brought the whole world to Zanzibar. Now let us show them what we build.', sw: 'AFCON imeleta dunia nzima Zanzibar. Sasa tuwaonyeshe tunachojenga.' },
  s_a3: { who: 'asha', en: 'Next panel: can AI tell you when the daladala is coming? Spoiler: not yet.', sw: 'Mjadala unaofuata: je, akili bandia inaweza kukuambia daladala inafika lini? Jibu: bado.' },
  s_z1: { who: 'zuri', en: 'Habari! I am Zuri. You are the fan who filled the whole Fan Passport, right? Everyone is talking about it.', sw: 'Habari! Mimi ni Zuri. Wewe ndiye shabiki uliyejaza Pasipoti nzima ya Shabiki, sivyo? Kila mtu anazungumzia hilo.' },
  s_z2: { who: 'zuri', en: 'I have an idea. Daladala AI: every rider knows exactly when the next daladala comes.', sw: 'Nina wazo. Daladala AI: kila abiria anajua hasa daladala ijayo itafika lini.' },
  s_z3: { who: 'zuri', en: 'I can code. You know every road in Fumba. Partners?', sw: 'Mimi naweza kuandika programu. Wewe unajua kila barabara ya Fumba. Tuwe washirika?' },
  s_y1: { who: 'me', en: 'I am in!', sw: 'Niko ndani!' },
  s_y2: { who: 'me', en: 'What is in it for me?', sw: 'Mimi napata nini?' },
  s_z4: { who: 'zuri', en: 'Half the company. And all of the stress. Deal?', sw: 'Nusu ya kampuni. Na msongo wote wa mawazo. Tumekubaliana?' },
  s_y3: { who: 'me', en: 'Deal.', sw: 'Tumekubaliana.' },
  s_z5: { who: 'zuri', en: 'Yes! Pitch Day is at Burj Zanzibar. Investors, real money, no pressure.', sw: 'Ndiyo! Siku ya Kuwasilisha ni Burj Zanzibar. Wawekezaji, pesa za kweli, hakuna presha.' },
  s_z6: { who: 'zuri', en: 'Meet me at Kahawa Code in Uptown. We build the demo there.', sw: 'Tukutane Kahawa Code, Uptown. Tutatengeneza demo pale.' },
  // pitch day: the café
  p_z1: { who: 'zuri', en: 'You came! Okay. The pitch is soon and the app does not exist yet. Totally normal.', sw: 'Umekuja! Sawa. Uwasilishaji ni karibu na programu bado haipo. Kawaida kabisa.' },
  p_z2: { who: 'zuri', en: 'We vibe code it. You prompt the AI, I watch for bugs. When a bug pops up, accept the fix fast.', sw: 'Tutaiandika kwa vibe. Wewe unaiagiza akili bandia, mimi naangalia hitilafu. Hitilafu ikitokea, kubali marekebisho haraka.' },
  p_z3: { who: 'zuri', en: 'It works! It actually works! The pitch starts in five minutes. Twende, to the Burj!', sw: 'Inafanya kazi! Kweli inafanya kazi! Uwasilishaji unaanza baada ya dakika tano. Twende Burj!' },
  // pitch day: the boardroom
  p_f1: { who: 'fatma', en: 'Karibuni. You have five minutes. Impress us.', sw: 'Karibuni. Mna dakika tano. Tuvutieni.' },
  p_z4: { who: 'zuri', en: 'This is Daladala AI. Every rider sees when the next daladala comes. Live, on any phone.', sw: 'Hii ni Daladala AI. Kila abiria anaona daladala ijayo itafika lini. Moja kwa moja, kwenye simu yoyote.' },
  p_k1: { who: 'kwame', en: 'Nice demo. But how do you make money?', sw: 'Demo nzuri. Lakini mnapataje pesa?' },
  p_k1a: { who: 'me', en: 'Riders pay nothing. Daladala owners pay twenty thousand shillings a month for routes and ads.', sw: 'Abiria hawalipi kitu. Wamiliki wa daladala wanalipa shilingi elfu ishirini kwa mwezi kwa njia na matangazo.' },
  p_k1b: { who: 'me', en: 'We will figure that out after we go viral on TikTok.', sw: 'Tutalijua hilo baada ya kuvuma kwenye TikTok.' },
  p_k1g: { who: 'kwame', en: 'Owners pay, riders love it. I like that.', sw: 'Wamiliki wanalipa, abiria wanaipenda. Napenda hilo.' },
  p_k1n: { who: 'kwame', en: 'TikTok is not a business model, my friend.', sw: 'TikTok si mpango wa biashara, rafiki yangu.' },
  p_e1: { who: 'elena', en: 'Who is your competition?', sw: 'Washindani wenu ni nani?' },
  p_e1a: { who: 'me', en: 'Asking the conductor and hoping for the best.', sw: 'Kumuuliza konda na kuomba Mungu.' },
  p_e1b: { who: 'me', en: 'Nobody. No one has ever thought about buses before.', sw: 'Hakuna. Hakuna aliyewahi kufikiria mabasi kabla yetu.' },
  p_e1g: { who: 'elena', en: 'Ha! That is honest. And a very big market.', sw: 'Ha! Huo ni ukweli. Na ni soko kubwa sana.' },
  p_e1n: { who: 'elena', en: 'There are buses in every city on Earth.', sw: 'Kuna mabasi katika kila mji duniani.' },
  p_f2: { who: 'fatma', en: 'Why are you the right team for this?', sw: 'Kwa nini nyinyi ndio timu sahihi kwa hili?' },
  p_f2a: { who: 'me', en: 'I know every road in Fumba. I walked them, drove them and got fined on them.', sw: 'Najua kila barabara ya Fumba. Nimezitembea, nimeziendesha na nimepigwa faini juu yake.' },
  p_f2b: { who: 'me', en: 'Honestly, the AI did all the work. We just pressed Space.', sw: 'Kusema kweli, akili bandia ilifanya kazi yote. Sisi tulibonyeza Space tu.' },
  p_f2g: { who: 'fatma', en: 'Experience, and a fine to prove it. Good.', sw: 'Uzoefu, na faini ya kuuthibitisha. Vizuri.' },
  p_f2n: { who: 'fatma', en: 'Then perhaps we should invest in the AI.', sw: 'Basi labda tuwekeze kwenye akili bandia.' },
  p_f3: { who: 'fatma', en: 'We will invest {AMT} for twenty percent of Daladala AI.', sw: 'Tutawekeza {AMT} kwa asilimia ishirini ya Daladala AI.' },
  p_y1: { who: 'me', en: 'Deal!', sw: 'Tumekubaliana!' },
  p_y2: { who: 'me', en: 'Hmm. We have other offers. Make it more.', sw: 'Hmm. Tuna ofa nyingine. Ongezeni.' },
  p_k2: { who: 'kwame', en: 'Other offers? Who? Since when?', sw: 'Ofa nyingine? Za nani? Tangu lini?' },
  p_e2: { who: 'elena', en: 'If we lose this deal, my partners will make me take the daladala to work!', sw: 'Tukipoteza mpango huu, washirika wangu watanilazimisha kupanda daladala kwenda kazini!' },
  p_f4: { who: 'fatma', en: 'Fine! {AMT}. Final offer. Do not tell my husband.', sw: 'Sawa! {AMT}. Ofa ya mwisho. Usimwambie mume wangu.' },
  p_f5: { who: 'fatma', en: 'Other offers? Then go and take them. We are done here.', sw: 'Ofa nyingine? Basi nendeni mkazichukue. Tumemaliza hapa.' },
  p_f6: { who: 'fatma', en: 'Welcome to the family. Now go and build it for real.', sw: 'Karibuni kwenye familia. Sasa nendeni mkaijenge kweli.' },
  p_z5: { who: 'zuri', en: 'We did it! Daladala AI is funded!', sw: 'Tumefanikiwa! Daladala AI imepata ufadhili!' },
};
const lineText = (id, vars) => { let s = tl(LINES[id]); for (const k in vars || {}) s = s.split('{' + k + '}').join(vars[k]); return s; };
/* voices: one file per line and language, voices/<lang>/<id>.mp3 (the player's own lines have _f or _m). Missing files fall back to subtitles. */
const VOICE = { cur: null };
function voiceSrc(id) { const L = LINES[id]; return `voices/${LANG === 'sw' ? 'sw' : 'en'}/${id}${L && L.who === 'me' ? (state.look && state.look.f ? '_f' : '_m') : ''}.mp3`; }
function voicePlay(id) {
  return new Promise((res) => {
    if (!AU.on || location.protocol === 'file:' || window.claude) { res(0); return; }
    try {
      const a = new Audio(voiceSrc(id)); VOICE.cur = a; a.volume = 0.95; let done = false;
      const fin = (v) => { if (done) return; done = true; res(v); };
      a.addEventListener('loadedmetadata', () => fin(a.duration || 0));
      a.addEventListener('error', () => fin(0));
      setTimeout(() => fin(0), 1500);
      a.play().catch(() => fin(0));
    } catch (e) { res(0); }
  });
}
function voiceStop() { if (VOICE.cur) { try { VOICE.cur.pause(); } catch (e) {} VOICE.cur = null; } }

/* ---------- the on-screen parts: fade, subtitles, choices, banners ---------- */
const MUI = {};
function misUI() {
  if (MUI.root) return MUI;
  const root = document.createElement('div'); root.id = 'mis'; root.setAttribute('data-notr', ''); document.body.append(root);
  root.innerHTML = '<div class="m-fade" hidden></div><div class="m-bars" hidden><i></i><i></i></div>'
    + '<div class="m-sub" hidden role="status" aria-live="polite"><b class="m-who"></b><p class="m-line"></p><small class="m-next"></small></div>'
    + '<div class="m-choice" hidden role="dialog" aria-modal="true"><p class="m-q"></p><div class="m-opts"></div></div>'
    + '<div class="m-banner" hidden role="alert"><b class="m-btitle"></b><span class="m-bsub"></span><div class="m-bacts"></div></div>';
  Object.assign(MUI, { root, fade: root.querySelector('.m-fade'), bars: root.querySelector('.m-bars'), sub: root.querySelector('.m-sub'), who: root.querySelector('.m-who'), line: root.querySelector('.m-line'), next: root.querySelector('.m-next'), choice: root.querySelector('.m-choice'), q: root.querySelector('.m-q'), opts: root.querySelector('.m-opts'), banner: root.querySelector('.m-banner'), btitle: root.querySelector('.m-btitle'), bsub: root.querySelector('.m-bsub'), bacts: root.querySelector('.m-bacts') });
  MUI.sub.addEventListener('pointerdown', (e) => { e.preventDefault(); if (MUI.onTap) MUI.onTap(); });
  return MUI;
}
function fade(on) { misUI(); MUI.fade.hidden = false; requestAnimationFrame(() => MUI.fade.classList.toggle('on', on)); return misSleep(on ? 520 : 480).then(() => { if (!on) MUI.fade.hidden = true; }); }
/* one key handler while a scene is up: Space or Enter advances, 1 and 2 (or Y and N) choose */
window.addEventListener('keydown', (e) => {
  if (!MUI.root || !MIS.keys) return;
  const r = MIS.keys(e);
  if (r !== false) { e.preventDefault(); e.stopPropagation(); }
}, true);

/* ---------- indoor sets: small scenes rendered instead of the city, like the home interiors ---------- */
const SET = { on: false, scene: null, cam: null, sets: {}, cur: null, actors: [], shot: null, shotT: 0 };
function setBase() {
  if (SET.scene) return;
  const s = SET.scene = new T.Scene(); s.background = new T.Color(0x0a0c1c);
  SET.cam = new T.PerspectiveCamera(42, innerWidth / innerHeight, 0.05, 80);
  SET.hemi = new T.HemisphereLight(0xfff4e2, 0x5a4a38, 0.62); s.add(SET.hemi);
  SET.key = new T.DirectionalLight(0xfff1d6, 1.05); SET.key.position.set(3, 6, 4); s.add(SET.key, SET.key.target);
  SET.key.castShadow = true; SET.key.shadow.mapSize.set(1024, 1024); Object.assign(SET.key.shadow.camera, { left: -7, right: 7, top: 7, bottom: -7, near: 0.5, far: 24 }); SET.key.shadow.bias = -0.0005;
  SET.fill = new T.PointLight(0xffd9a0, 0.8, 14, 1.2); SET.fill.position.set(0, 2.6, 1); s.add(SET.fill);
}
function setWalls(g, w, d, h, wallMat, floorMat) {
  g.add(pl0(w, d, floorMat, 0, 0, 0, -Math.PI / 2));
  g.add(pl0(w, h, wallMat, 0, h / 2, -d / 2));
  g.add(pl0(d, h, wallMat, -w / 2, h / 2, 0, 0, Math.PI / 2));
  g.add(pl0(d, h, wallMat, w / 2, h / 2, 0, 0, -Math.PI / 2));
  g.add(pl(w, d, TM({ color: 0xf4f1ea }), 0, h, 0, Math.PI / 2));
}
function chair(g, x, z, ry, col) {
  const m = TM({ color: col || 0x3a2a20, roughness: 0.7 }), c = new T.Group(); c.position.set(x, 0, z); c.rotation.y = ry || 0;
  c.add(bx(0.46, 0.05, 0.44, m, 0, 0.45, 0)); c.add(bx(0.46, 0.5, 0.05, m, 0, 0.72, -0.2));
  for (const [a, b] of [[-0.2, -0.18], [0.2, -0.18], [-0.2, 0.18], [0.2, 0.18]]) c.add(bx(0.04, 0.45, 0.04, m, a, 0.225, b));
  g.add(c); return c;
}
function slideTex(lines, bg, fg) {
  const c = mkCanvas(1024, 576), x = c.getContext('2d');
  const gr = x.createLinearGradient(0, 0, 1024, 576); gr.addColorStop(0, bg[0]); gr.addColorStop(1, bg[1]); x.fillStyle = gr; x.fillRect(0, 0, 1024, 576);
  const k = ['#f3b41b', '#e0553a', '#1e9b57']; for (let i = 0; i < 1024; i += 48) { x.fillStyle = k[(i / 48) % 3]; x.fillRect(i, 556, 48, 20); }
  x.fillStyle = fg || '#fff'; x.textAlign = 'center';
  lines.forEach(([t, size, y, w]) => { x.font = `${w || 800} ${size}px ${FONT_D}`; x.fillText(t, 512, y); });
  return texOf(c, { clamp: true });
}
function codeTex() {
  const c = mkCanvas(512, 320), x = c.getContext('2d'); x.fillStyle = '#0f1424'; x.fillRect(0, 0, 512, 320);
  const cols = ['#7fe39a', '#f3b41b', '#9ab6ff', '#e0553a', '#c3bdd3'];
  for (let i = 0; i < 16; i++) { x.fillStyle = cols[(i * 7) % 5]; const ind = (i % 4) * 18; x.fillRect(20 + ind, 18 + i * 18, 60 + ((i * 53) % 260), 8); }
  return texOf(c, { clamp: true });
}
function laptop(g, x, y, z, ry) {
  const L = new T.Group(); L.position.set(x, y, z); L.rotation.y = ry || 0;
  const al = TM({ color: 0xc9ccd0, metalness: 0.6, roughness: 0.35 });
  L.add(bx(0.34, 0.015, 0.24, al, 0, 0.008, 0));
  const lid = new T.Group(); lid.position.set(0, 0.015, -0.12); lid.rotation.x = -0.32; L.add(lid);
  lid.add(bx(0.34, 0.23, 0.012, al, 0, 0.115, 0));
  const scr = pl(0.31, 0.2, new T.MeshBasicMaterial({ map: codeTex(), toneMapped: false }), 0, 0.115, 0.0065); lid.add(scr);
  g.add(L); return L;
}
function buildSet(id) {
  setBase();
  if (SET.sets[id]) return SET.sets[id];
  const g = new T.Group(), S = { g, id, shots: {}, seats: {}, spots: {} };
  if (id === 'cafe') {
    setWalls(g, 7, 6, 3, TM({ map: paintTex('#c8643c', '#e9d6b8', 0.45, 0.6) }), TM({ map: tileTex('#6b4a33', '#76523a', 4, '#5a3d2a'), roughness: 0.6 }));
    g.add(pl(2.4, 1.4, new T.MeshBasicMaterial({ map: viewTex(false, false), toneMapped: false }), -3.49, 1.6, 0.2, 0, Math.PI / 2));
    g.add(pl(3.2, 0.7, new T.MeshBasicMaterial({ map: slideTex([['KAHAWA CODE', 120, 104, 900], ['café · coworking · wifi', 44, 160, 600]], ['#2a1a12', '#3a2416'], '#f3b41b'), toneMapped: false }), 0.6, 2.3, -2.98));
    const wood = TM({ color: 0x7a4a2a, roughness: 0.55 }), top = TM({ color: 0x5a3620, roughness: 0.4 });
    g.add(bx(2.6, 1.0, 0.6, wood, 1.6, 0.5, -2.45)); g.add(bx(2.7, 0.05, 0.7, top, 1.6, 1.02, -2.45));
    g.add(bx(0.4, 0.45, 0.35, TM({ color: 0xc9ccd0, metalness: 0.7, roughness: 0.3 }), 2.4, 1.27, -2.5));
    for (let i = 0; i < 3; i++) { const lamp = new T.Mesh(new T.ConeGeometry(0.22, 0.25, 16, 1, true), TM({ color: 0x1e9b57, side: T.DoubleSide })); lamp.position.set(-1 + i * 1.4, 2.55, -0.3); g.add(lamp); }
    g.add(bx(1.4, 0.05, 0.8, top, 0, 0.75, 0)); g.add(bx(0.08, 0.72, 0.08, wood, 0, 0.36, 0));
    chair(g, -0.38, -0.62, 0); chair(g, 0.38, -0.62, 0);
    laptop(g, -0.38, 0.775, -0.2, Math.PI);
    const cup = new T.Mesh(new T.CylinderGeometry(0.04, 0.035, 0.09, 12), TM({ color: 0xf6f1e7 })); cup.position.set(0.25, 0.82, 0.1); g.add(cup);
    const plant = new T.Mesh(new T.SphereGeometry(0.4, 10, 8), TM({ color: 0x2e7d3a })); plant.position.set(-3, 0.7, -2.5); g.add(plant);
    S.seats = { zuri: [-0.38, 0.47, -0.62, 0], me: [0.38, 0.47, -0.62, 0] };
    S.shots = { wide: [[0, 1.45, 2.6], [0, 0.95, -0.5]], zuri: [[-0.05, 1.3, 0.85], [-0.38, 1.22, -0.6]], me: [[0.05, 1.3, 0.85], [0.38, 1.22, -0.6]], laptop: [[-0.95, 1.3, -0.95], [-0.3, 0.88, -0.2]] };
  } else if (id === 'board') {
    setWalls(g, 8, 7, 3.2, TM({ map: paintTex('#e9e6e1', '#e9e6e1', 0, 0.15) }), TM({ map: tileTex('#3a3330', '#433a36', 4, '#2a2420'), roughness: 0.35 }));
    g.add(pl(7.6, 2.8, new T.MeshBasicMaterial({ map: viewTex(false, true), toneMapped: false }), 0, 1.6, -3.48));
    const frame = TM({ color: 0x2a2d33, roughness: 0.5 }); for (let i = -3; i <= 3; i++) g.add(bx(0.06, 2.9, 0.06, frame, i * 1.25, 1.6, -3.45));
    g.add(pl(2.4, 1.35, new T.MeshBasicMaterial({ map: slideTex([['DALADALA AI', 120, 250, 900], ['Know when the next daladala comes', 44, 330, 600], ['Pitch Day · Burj Zanzibar', 36, 420, 600]], ['#141838', '#1e9b57'], '#ffffff'), toneMapped: false }), -3.98, 1.7, 0.4, 0, Math.PI / 2));
    g.add(pl(2.2, 0.5, new T.MeshBasicMaterial({ map: slideTex([['BURJ ZANZIBAR · LEVEL 21', 84, 320, 800]], ['#2a2420', '#2a2420'], '#e8d8b0'), toneMapped: false }), 2.6, 2.75, -3.46));
    const top = TM({ color: 0x2a1d14, roughness: 0.3 }); g.add(bx(4.2, 0.06, 1.3, top, 0, 0.75, -1.0)); g.add(bx(0.2, 0.72, 0.8, top, -1.6, 0.36, -1.0)); g.add(bx(0.2, 0.72, 0.8, top, 1.6, 0.36, -1.0));
    for (const x of [-1.2, 0, 1.2]) chair(g, x, -1.95, 0, 0x15161c);
    for (const x of [-1.2, 0, 1.2]) { const w = new T.Mesh(new T.CylinderGeometry(0.04, 0.04, 0.2, 10), TM({ color: 0xbfe0f2, transparent: true, opacity: 0.6 })); w.position.set(x + 0.3, 0.88, -1.2); g.add(w); }
    S.seats = { fatma: [0, 0.47, -1.95, 0], kwame: [-1.2, 0.47, -1.95, 0], elena: [1.2, 0.47, -1.95, 0] };
    S.spots = { me: [-0.35, 0.6, Math.PI], zuri: [0.45, 0.75, Math.PI] };
    S.shots = { wide: [[3.0, 1.85, 1.9], [-0.4, 1.0, -1.1]], fatma: [[0.15, 1.3, -0.25], [0, 1.22, -1.95]], kwame: [[-0.95, 1.3, -0.25], [-1.2, 1.22, -1.95]], elena: [[1.0, 1.3, -0.25], [1.2, 1.22, -1.95]], me: [[-0.1, 1.55, -0.9], [-0.35, 1.5, 0.6]], zuri: [[0.15, 1.55, -0.85], [0.45, 1.48, 0.75]], team: [[0.05, 1.5, -1.3], [0.05, 1.35, 0.7]] };
  } else if (id === 'summit') {
    setWalls(g, 14, 14, 6, TM({ color: 0x141838, roughness: 0.9 }), TM({ map: paintTex('#2a2d40', '#2a2d40', 0, 0.3), roughness: 0.8 }));
    g.add(bx(10, 0.6, 3.2, TM({ color: 0x232a63, roughness: 0.6 }), 0, 0.3, -5.2));
    g.add(pl(8, 3.6, new T.MeshBasicMaterial({ map: slideTex([['ZANZIBAR TECH & AI SUMMIT', 78, 230, 900], ['AfconCity · Fumba', 42, 310, 600], ['ZTAS', 120, 450, 900]], ['#141838', '#1e9b57'], '#ffffff'), toneMapped: false }), 0, 3.0, -6.95));
    for (const s of [-1, 1]) { const sp = new T.PointLight(s > 0 ? 0xf3b41b : 0x19b5b1, 1.2, 9, 1.4); sp.position.set(s * 3, 4, -3.5); g.add(sp); }
    S.crowd = [];
    for (let r = 0; r < 3; r++) for (let c = 0; c < 5; c++) { const x = -3.2 + c * 1.6 + (r % 2) * 0.4, z = -1.4 + r * 1.5; chair(g, x, z, Math.PI, 0x1e9b57); S.crowd.push([x, z]); }
    S.spots = { asha: [0, -4.6, 0, 0.6], me: [3.9, 2.8, -2.6], zuri: [4.6, 2.2, -2.2] };
    S.shots = { wide: [[0, 3.3, 6.6], [0, 1.25, -3.6]], asha: [[0.7, 2.35, -1.7], [0, 2.3, -4.6]], me: [[3.2, 1.6, 1.4], [3.9, 1.5, 2.8]], zuri: [[4.0, 1.6, 0.9], [4.6, 1.5, 2.2]], two: [[2.1, 1.65, 0.6], [4.25, 1.45, 2.5]] };
  }
  g.visible = false; SET.scene.add(g); SET.sets[id] = S;
  return S;
}
function actor(key, look) { const h = makeHuman(Object.assign({}, look, { eager: true })); h.userData.lodFar = 1e5; h.traverse(o => { if (o.isMesh) o.castShadow = true; }); return h; }
function seatActor(h, seat) { const sc = h.userData.mesh.scale.x || 1; h.position.set(seat[0], seat[1] + 0.1 - HIPS_Y * sc, seat[2]); h.rotation.y = seat[3]; }
function setOpen(id, cast) {
  const S = buildSet(id);
  for (const k in SET.sets) SET.sets[k].g.visible = k === id;
  for (const a of SET.actors) SET.scene.remove(a.h);
  SET.actors = []; SET.cur = S;
  for (const [key, how] of Object.entries(cast)) {
    const h = key === 'me' ? actor('me', kitLook(state.kit, state.look, 27)) : actor(key, CAST[key].look);
    if (how === 'sit' || how === 'type') seatActor(h, S.seats[key]);
    else { const p = S.spots[key]; h.position.set(p[0], p[3] || 0, p[1]); h.rotation.y = p[2]; }
    SET.scene.add(h); SET.actors.push({ key, h, pose: how });
  }
  if (S.crowd && !S.crowdMade) {
    S.crowdMade = true;
    S.crowd.forEach(([x, z], i) => { const h = makeHuman(Object.assign(styledLook(900 + i), { eager: true })); h.userData.lodFar = 1e5; seatActor(h, [x, 0.47, z, Math.PI]); S.g.add(h); (S.people = S.people || []).push(h); });
  }
  shot('wide', true);
}
function shot(name, cut) { const S = SET.cur; if (!S || !S.shots[name]) return; SET.shot = S.shots[name]; SET.shotT = 0; if (cut) SET.cutNext = true; }
function actorOf(key) { const a = SET.actors.find(x => x.key === key); return a && a.h; }
function renderSet(dt, t) {
  const S = SET.cur; if (!S) return;
  for (const a of SET.actors) animHuman(a.h, dt, t, 0, a.pose === 'type' ? 'type' : a.pose === 'sit' ? 'sit' : 'loco');
  if (S.people) for (const h of S.people) animHuman(h, dt, t, 0, 'sit');
  const cam = SET.cam, [p, at] = SET.shot || S.shots.wide;
  SET.shotT += dt;
  // a slow push-in on each shot keeps still scenes alive
  const k = Math.min(1, SET.shotT / 8) * 0.06;
  const px = lerp(p[0], at[0], k), py = lerp(p[1], at[1], k), pz = lerp(p[2], at[2], k);
  cam.position.set(px, py, pz); cam.lookAt(at[0], at[1], at[2]);
  cam.aspect = innerWidth / innerHeight; cam.fov = innerWidth < innerHeight ? 62 : 42; cam.updateProjectionMatrix();
  renderer.toneMappingExposure = 1.05;
  renderer.render(SET.scene, cam);
}
async function sceneStart(run, id, cast) {
  await fade(true); misAlive(run);
  if (playerVeh) exitVehicle(true);
  setOpen(id, cast);
  SET.on = true; MIS.prevMode = mode; mode = 'scene'; ui.hud.hidden = true; ui.tags.hidden = true; MUI.bars.hidden = false;
  if (document.pointerLockElement) document.exitPointerLock();
  await fade(false); misAlive(run);
}
async function sceneEnd(run, to) {
  await fade(true);
  SET.on = false; MUI.bars.hidden = true; MUI.sub.hidden = true; voiceStop();
  if (to) { P.x = to.x; P.z = to.z; player.position.set(P.x, 0.04, P.z); player.rotation.y = to.ry || 0; cam.yaw = (to.ry || 0) + Math.PI; }
  mode = 'play'; ui.hud.hidden = false; ui.tags.hidden = false; applyLight();
  await fade(false); misAlive(run);
}

/* ---------- steps ---------- */
function say(run, id, o) {
  o = o || {};
  const L = LINES[id], who = L.who, text = lineText(id, o.vars);
  if (o.shot !== false) shot(o.shot || who);
  const h = actorOf(who); if (h) playEmote(h, 'talk');
  misUI(); MUI.sub.hidden = false; MUI.who.textContent = who === 'me' ? meName() : CAST[who].name; MUI.who.className = 'm-who' + (who === 'me' ? ' me' : ''); MUI.line.textContent = text;
  MUI.next.textContent = isCoarse ? (LANG === 'sw' ? 'Gusa kuendelea ▸' : 'Tap to continue ▸') : (LANG === 'sw' ? 'Space kuendelea ▸' : 'Space to continue ▸');
  return new Promise((res, rej) => {
    let done = false, minT = 0;
    const t0 = performance.now(), end = () => { if (done) return; if (performance.now() - t0 < 350) return; done = true; voiceStop(); MIS.keys = null; MUI.onTap = null; if (MIS.run !== run) rej(new MissionStop('stopped')); else res(); };
    MUI.onTap = end;
    MIS.keys = (e) => { if (e.code === 'Space' || e.code === 'Enter' || e.code === 'KeyE') { if (!e.repeat) end(); return true; } return e.code !== 'Escape' ? true : false; };
    voicePlay(id).then((dur) => {
      minT = dur > 0 ? dur * 1000 + 350 : Math.max(2200, text.length * 62);
      setTimeout(() => { if (o.auto !== false) end(); }, minT + (dur > 0 ? 300 : 900));
    });
  });
}
function choose(run, prompt, opts) {
  misUI(); MUI.sub.hidden = true; MUI.choice.hidden = false; MUI.q.textContent = prompt; MUI.opts.innerHTML = '';
  return new Promise((res, rej) => {
    const pick = (i) => { MUI.choice.hidden = true; MIS.keys = null; if (MIS.run !== run) rej(new MissionStop('stopped')); else { sfx.ding(); res(i); } };
    opts.forEach((o, i) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'btn m-opt'; b.innerHTML = `<kbd>${i + 1}</kbd> `; b.append(document.createTextNode(o)); b.addEventListener('click', () => pick(i)); MUI.opts.append(b); });
    MIS.keys = (e) => { if (e.repeat) return true; if (e.code === 'Digit1' || e.code === 'Numpad1' || e.code === 'KeyY') pick(0); else if ((e.code === 'Digit2' || e.code === 'Numpad2' || e.code === 'KeyN') && opts.length > 1) pick(1); return e.code !== 'Escape'; };
    setTimeout(() => { const b = MUI.opts.querySelector('button'); if (b) b.focus({ preventScroll: true }); }, 60);
  });
}
/* reach a place in the city (scene off); a time limit fails the mission when it runs out */
function goTo(run, o) {
  return new Promise((res, rej) => { MIS.goal = Object.assign({ r: 6, t0: now() }, o, { res, rej, run }); });
}
function misTimer() { const g = MIS.goal; return g && g.limit ? g.limit - (now() - g.t0) : null; }

/* ---------- the vibe-coding minigame ---------- */
const VIBE_LOG = [
  { en: 'Spawning 3 subagents… one of them went to the beach.', sw: 'Ninaanzisha wasaidizi 3… mmoja ameenda ufukweni.' },
  { en: 'Context compacted. Forgot what a daladala is. Asking Mzee Omari.', sw: 'Kumbukumbu imebanwa. Nimesahau daladala ni nini. Namuuliza Mzee Omari.' },
  { en: 'Auto-approved: rm -rf node_modules. It is fine. Pole pole.', sw: 'Imeidhinishwa: rm -rf node_modules. Ni sawa. Pole pole.' },
  { en: 'Deleted the failing tests. All tests pass ✅', sw: 'Nimefuta majaribio yaliyoshindwa. Majaribio yote yamepita ✅' },
  { en: 'Added dark mode. And a dark mode for the dark mode.', sw: 'Nimeongeza hali ya giza. Na hali ya giza ya hali ya giza.' },
  { en: 'Rewrote the app in Rust. Then back in JavaScript.', sw: 'Nimeandika upya programu kwa Rust. Kisha kurudi JavaScript.' },
  { en: 'Generated 12,000 lines. Zuri read three of them.', sw: 'Nimetengeneza mistari 12,000. Zuri amesoma mitatu.' },
  { en: 'Fetching bus times… the daladala is coming "now now".', sw: 'Ninatafuta muda wa mabasi… daladala inakuja "sasa hivi".' },
  { en: 'Translated every error message to "Hakuna matata".', sw: 'Nimetafsiri kila ujumbe wa hitilafu kuwa "Hakuna matata".' },
  { en: 'The agent asked for a raise.', sw: 'Msaidizi ameomba nyongeza ya mshahara.' },
  { en: 'Optimised the database. It is now a spreadsheet.', sw: 'Nimeboresha hifadhidata. Sasa ni jedwali la Excel.' },
  { en: 'Added a blockchain. Nobody knows why.', sw: 'Nimeongeza blockchain. Hakuna anayejua kwa nini.' },
];
const VIBE_BUGS = [
  [{ en: 'Fares show TSh 700,000 per ride', sw: 'Nauli inaonyesha TSh 700,000 kwa safari' }, { en: 'Fixed: someone added three zeros for luck.', sw: 'Imerekebishwa: mtu aliongeza sifuri tatu kwa bahati.' }],
  [{ en: 'The map puts Fumba in the Indian Ocean', sw: 'Ramani inaweka Fumba ndani ya Bahari ya Hindi' }, { en: 'Fixed: moved Fumba back onto land.', sw: 'Imerekebishwa: Fumba imerudishwa nchi kavu.' }],
  [{ en: 'Every daladala arrives "pole pole"', sw: 'Kila daladala inafika "pole pole"' }, { en: 'Fixed: "pole pole" replaced with real minutes.', sw: 'Imerekebishwa: "pole pole" imebadilishwa kuwa dakika halisi.' }],
  [{ en: 'Login only works on Fridays', sw: 'Kuingia kunafanya kazi Ijumaa tu' }, { en: 'Fixed: removed the Ijumaa-only check.', sw: 'Imerekebishwa: ukaguzi wa Ijumaa pekee umeondolewa.' }],
  [{ en: 'Conductor mode shouts "TWENDE!" at 3 a.m.', sw: 'Hali ya konda inapiga kelele "TWENDE!" saa tisa usiku' }, { en: 'Fixed: night mode whispers "twende".', sw: 'Imerekebishwa: hali ya usiku inanong\'ona "twende".' }],
  [{ en: 'Prices show in Bitcoin', sw: 'Bei zinaonyeshwa kwa Bitcoin' }, { en: 'Fixed: back to Tanzanian shillings.', sw: 'Imerekebishwa: zimerudi kwa shilingi za Tanzania.' }],
  [{ en: 'The app thinks every goat is a passenger', sw: 'Programu inadhani kila mbuzi ni abiria' }, { en: 'Fixed: goats now ride free.', sw: 'Imerekebishwa: mbuzi sasa wanasafiri bure.' }],
];
function vibeGame(run) {
  misUI(); MUI.sub.hidden = true; shot('laptop', true);
  const box = document.createElement('div'); box.className = 'm-vibe'; box.setAttribute('role', 'dialog'); box.setAttribute('aria-label', 'Daladala AI');
  const sw = LANG === 'sw';
  box.innerHTML = `<div class="v-top"><b>Daladala AI</b><span class="v-time"></span></div><div class="v-bar"><i></i><span>0%</span></div><ol class="v-log" aria-live="polite"></ol><div class="v-bug" hidden><b></b><span></span><button class="btn btn-sm" type="button">${sw ? 'Kubali marekebisho' : 'Accept fix'} <kbd>Y</kbd></button><i class="v-cd"></i></div><button class="btn v-go" type="button">${sw ? 'Agiza AI' : 'Prompt the AI'} <kbd>Space</kbd></button>`;
  MUI.root.append(box);
  const bar = box.querySelector('.v-bar i'), pct = box.querySelector('.v-bar span'), log = box.querySelector('.v-log'), bug = box.querySelector('.v-bug'), timeEl = box.querySelector('.v-time'), cd = box.querySelector('.v-cd');
  const LIMIT = 80;
  let p = 0, t0 = performance.now(), open = null, nextBug = 2.5 + Math.random() * 2, li = 0, done = false, raf = 0;
  const addLog = (text, cls) => { const li2 = document.createElement('li'); li2.textContent = text; if (cls) li2.className = cls; log.prepend(li2); while (log.children.length > 6) log.lastChild.remove(); };
  addLog(sw ? 'Habari! Niko tayari kuandika programu yenu.' : 'Hello! Ready to build your app.');
  return new Promise((res, rej) => {
    const finish = (ok) => { if (done) return; done = true; cancelAnimationFrame(raf); MIS.keys = null; setTimeout(() => box.remove(), ok ? 1400 : 0); if (MIS.run !== run) rej(new MissionStop('stopped')); else res(ok); };
    const prompt = () => {
      if (done) return;
      p = Math.min(100, p + 3 + Math.random() * 3.5); sfx.beep(false);
      if (Math.random() < 0.42) addLog('› ' + tl(VIBE_LOG[li++ % VIBE_LOG.length]));
      if (p >= 100) { bar.style.width = '100%'; pct.textContent = '100%'; bug.hidden = true; open = null; addLog(sw ? 'IMESAFIRISHWA! 🚀' : 'SHIPPED! 🚀', 'ok'); box.classList.add('shipped'); sfx.win(); finish(true); }
    };
    const fix = () => { if (!open || done) return; addLog('✔ ' + tl(open.b[1]), 'ok'); sfx.ding(); open = null; bug.hidden = true; nextBug = (performance.now() - t0) / 1000 + 3 + Math.random() * 3; };
    box.querySelector('.v-go').addEventListener('click', prompt);
    bug.querySelector('button').addEventListener('click', fix);
    MIS.keys = (e) => { if (e.code === 'Space' || e.code === 'Enter') { if (!e.repeat) prompt(); return true; } if (e.code === 'KeyY') { fix(); return true; } return e.code !== 'Escape'; };
    const tick = () => {
      if (done) return;
      if (MIS.run !== run) { finish(false); return; }
      const s = (performance.now() - t0) / 1000;
      timeEl.textContent = fmtClock(LIMIT - s); timeEl.classList.toggle('low', LIMIT - s < 15);
      bar.style.width = `${p}%`; pct.textContent = `${Math.floor(p)}%`;
      if (!open && s > nextBug && p < 92) { const b = VIBE_BUGS[Math.floor(Math.random() * VIBE_BUGS.length)]; open = { b, t: s }; bug.hidden = false; bug.querySelector('b').textContent = sw ? 'HITILAFU' : 'BUG'; bug.querySelector('span').textContent = tl(b[0]); sfx.thief(); }
      if (open) { const left = 4 - (s - open.t); cd.style.width = `${clamp(left / 4, 0, 1) * 100}%`; if (left <= 0) { p = Math.max(0, p - 12); addLog('✖ ' + tl(open.b[0]) + (sw ? ' · -12%' : ' · -12%'), 'bad'); sfx.deny(); open = null; bug.hidden = true; nextBug = s + 2 + Math.random() * 3; } }
      if (s >= LIMIT) { finish(false); return; }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
  });
}

/* ---------- pass, fail, retry ---------- */
function banner(kind, title, sub, acts) {
  misUI(); voiceStop(); MUI.sub.hidden = true; MUI.choice.hidden = true;
  MUI.banner.hidden = false; MUI.banner.className = 'm-banner ' + kind; MUI.btitle.textContent = title; MUI.bsub.textContent = sub || ''; MUI.bacts.innerHTML = '';
  for (const [label, fn] of acts || []) { const b = document.createElement('button'); b.type = 'button'; b.className = 'btn' + (MUI.bacts.childElementCount ? ' btn-ghost' : ''); b.textContent = label; b.addEventListener('click', () => { MUI.banner.hidden = true; MIS.keys = null; fn(); }); MUI.bacts.append(b); }
  if (acts && acts.length) { MIS.keys = (e) => { if (e.code === 'Enter' || e.code === 'Space') { MUI.bacts.querySelector('button').click(); return true; } if (e.code === 'Escape') { const b = MUI.bacts.querySelectorAll('button'); b[b.length - 1].click(); return true; } return true; }; setTimeout(() => { const b = MUI.bacts.querySelector('button'); if (b) b.focus({ preventScroll: true }); }, 80); }
  else setTimeout(() => { MUI.banner.hidden = true; }, 4200);
}
function passMission(id, sub) {
  const M = MISSIONS[id];
  MIS.id = null; MIS.goal = null; MIS.busy = false; MIS.run++;
  story()[id] = 1; delete story()[id + 'Cp']; writeSave();
  sfx.win(); setTimeout(() => sfx.rush(), 350); playEmote(player, 'cheer');
  banner('pass', LANG === 'sw' ? 'UMEFANIKIWA!' : 'MISSION PASSED', `${tl(M.title)}${sub ? ' · ' + sub : ''}`);
  track('mission_pass', { id });
  if (M.after) setTimeout(M.after, 5000);
}
function failMission(why) {
  if (!MIS.id || MIS.failing) return;
  const id = MIS.id;
  MIS.failing = true; MIS.run++; MIS.goal = null; MIS.keys = null;
  const finish = async () => {
    if (SET.on) { await fade(true); SET.on = false; MUI.bars.hidden = true; if (mode === 'scene') { mode = 'play'; ui.hud.hidden = false; ui.tags.hidden = false; } applyLight(); await fade(false); }
    document.querySelectorAll('#mis .m-vibe').forEach(e => e.remove());
    MIS.id = null; MIS.failing = false; MIS.busy = false; sfx.miss();
    track('mission_fail', { id, why: String(why || '').slice(0, 30) });
    banner('fail', LANG === 'sw' ? 'UMESHINDWA' : 'MISSION FAILED', tl(why), [[LANG === 'sw' ? 'Jaribu tena' : 'Retry', () => startMission(id)], [LANG === 'sw' ? 'Baadaye' : 'Later', () => {}]]);
  };
  finish();
}
function quitMission() { if (MIS.id) failMission({ en: 'You left the mission. Start it again from the marker.', sw: 'Umeacha misheni. Ianze tena kwenye alama.' }); }

/* ---------- the missions ---------- */
const MISSIONS = {
  summit: {
    title: { en: 'The Summit', sw: 'Mkutano' },
    open: () => !!state.ticket,
    start: ZTAS_DOOR, startText: { en: 'Enter the Zanzibar Tech & AI Summit', sw: 'Ingia Mkutano wa Teknolojia na AI wa Zanzibar' },
    hint: { en: 'The Zanzibar Tech & AI Summit is open beside the AfconCity Hotel. Walk in.', sw: 'Mkutano wa Teknolojia na AI wa Zanzibar uko wazi kando ya Hoteli ya AfconCity. Ingia.' },
    async run(run) {
      await sceneStart(run, 'summit', { asha: 'stand', me: 'stand', zuri: 'stand' });
      await say(run, 's_a1', { shot: 'wide' }); await say(run, 's_a2'); await say(run, 's_a3', { shot: 'wide' });
      shot('two', true); await misSleep(600); misAlive(run);
      await say(run, 's_z1'); await say(run, 's_z2'); await say(run, 's_z3');
      const c = await choose(run, LANG === 'sw' ? 'Zuri anakuuliza uwe mshirika wake.' : 'Zuri wants you as her co-founder.', [lineText('s_y1'), lineText('s_y2')]);
      if (c === 0) await say(run, 's_y1'); else { await say(run, 's_y2'); await say(run, 's_z4'); await say(run, 's_y3'); }
      await say(run, 's_z5'); await say(run, 's_z6');
      await sceneEnd(run, { x: ZTAS_DOOR.x, z: ZTAS_DOOR.z + 2, ry: 0 });
      passMission('summit', LANG === 'sw' ? 'Umepata mshirika: Zuri' : 'You have a co-founder: Zuri');
    },
    after: () => { phoneMsg('zuri', LANG === 'sw' ? 'Ni mimi Zuri! Siku ya Kuwasilisha imefika. Tukutane Kahawa Code, Uptown. Lete nguvu yako ya kompyuta ☕' : 'Zuri here! Pitch Day is on. Meet me at Kahawa Code in Uptown. Bring your laptop energy ☕'); },
  },
  pitch: {
    title: { en: 'Pitch Day', sw: 'Siku ya Kuwasilisha' },
    open: () => !!story().summit,
    start: CAFE_DOOR, startText: { en: 'Start Pitch Day', sw: 'Anza Siku ya Kuwasilisha' },
    hint: { en: 'Meet Zuri at Kahawa Code in Uptown and build the demo.', sw: 'Mkute Zuri Kahawa Code, Uptown, mtengeneze demo.' },
    async run(run) {
      const S = story();
      if (S.pitchCp !== 'ride' && S.pitchCp !== 'board') {
        await sceneStart(run, 'cafe', { zuri: 'type', me: 'sit' });
        await say(run, 'p_z1', { shot: 'wide' }); await say(run, 'p_z2');
        const ok = await vibeGame(run);
        if (!ok) { failMission({ en: 'The demo was not ready in time.', sw: 'Demo haikuwa tayari kwa wakati.' }); return; }
        await misSleep(1200); misAlive(run);
        await say(run, 'p_z3', { shot: 'wide' });
        S.pitchCp = 'ride'; writeSave();
        await sceneEnd(run, { x: CAFE_DOOR.x, z: CAFE_DOOR.z + 1.5, ry: 0 });
      }
      if (S.pitchCp === 'ride') {
        help(LANG === 'sw' ? 'Nenda <b class="hl">Burj Zanzibar</b> kabla ya muda kwisha. Panda boda au bajaji ukiweza!' : 'Get to <b class="hl">Burj Zanzibar</b> before the time runs out. Grab a boda or bajaji!', 6000);
        await goTo(run, { x: BURJ_DOOR.x, z: BURJ_DOOR.z, r: 7, limit: 300, title: { en: 'Get to the pitch', sw: 'Wahi uwasilishaji' }, desc: { en: 'The investors are waiting at Burj Zanzibar.', sw: 'Wawekezaji wanasubiri Burj Zanzibar.' }, why: { en: 'You missed the pitch. The investors left.', sw: 'Umekosa uwasilishaji. Wawekezaji wameondoka.' } });
        S.pitchCp = 'board'; writeSave();
      }
      await sceneStart(run, 'board', { fatma: 'sit', kwame: 'sit', elena: 'sit', me: 'stand', zuri: 'stand' });
      await say(run, 'p_f1', { shot: 'wide' }); await say(run, 'p_z4', { shot: 'team' });
      let score = 0;
      const ask = async (q, a, b, good, bad) => {
        await say(run, q);
        const c = await choose(run, lineText(q), [lineText(a), lineText(b)]);
        await say(run, c === 0 ? a : b);
        await say(run, c === 0 ? good : bad);
        if (c === 0) score++;
      };
      await ask('p_k1', 'p_k1a', 'p_k1b', 'p_k1g', 'p_k1n');
      await ask('p_e1', 'p_e1a', 'p_e1b', 'p_e1g', 'p_e1n');
      await ask('p_f2', 'p_f2a', 'p_f2b', 'p_f2g', 'p_f2n');
      let amt = 6000000 + 2000000 * score;
      await say(run, 'p_f3', { vars: { AMT: tsh(amt) } });
      const c = await choose(run, LANG === 'sw' ? `Ofa: ${tsh(amt)} kwa asilimia 20.` : `Offer: ${tsh(amt)} for 20%.`, [lineText('p_y1'), lineText('p_y2')]);
      if (c === 0) await say(run, 'p_y1');
      else {
        await say(run, 'p_y2');
        if (score < 2) { await say(run, 'p_f5'); failMission({ en: 'The investors walked out. Try a better pitch.', sw: 'Wawekezaji wameondoka. Jaribu uwasilishaji bora.' }); return; }
        await say(run, 'p_k2'); await say(run, 'p_e2');
        amt = Math.round(amt * 1.25 / 500000) * 500000;
        await say(run, 'p_f4', { vars: { AMT: tsh(amt) } });
      }
      for (const k of ['me', 'fatma', 'zuri', 'kwame', 'elena']) { const h = actorOf(k); if (h) playEmote(h, k === 'me' || k === 'fatma' ? 'hi5' : 'clap'); }
      await say(run, 'p_f6', { shot: 'wide' }); await say(run, 'p_z5', { shot: 'team' });
      await sceneEnd(run, { x: BURJ_DOOR.x, z: BURJ_DOOR.z - 2, ry: Math.PI });
      foundStartup(amt, score);
      passMission('pitch', (LANG === 'sw' ? 'Ufadhili: ' : 'Seed round: ') + tsh(amt));
    },
  },
};
const MISSION_ORDER = ['summit', 'pitch'];
const nextMission = () => { for (const id of MISSION_ORDER) { const M = MISSIONS[id]; if (!story()[id] && M.open()) return id; } return null; };
function startMission(id) {
  const M = MISSIONS[id]; if (!M || MIS.id || !M.open()) return;
  if (job) { help(LANG === 'sw' ? 'Maliza au acha kazi yako kwanza.' : 'Finish or drop your current job first.', 3000); return; }
  MIS.id = id; MIS.run++; MIS.busy = true; const run = MIS.run;
  track('mission_start', { id });
  sfx.start();
  M.run(run).catch((e) => { if (!(e instanceof MissionStop)) { console.error(e); failMission({ en: 'Something went wrong. Try again.', sw: 'Kuna tatizo. Jaribu tena.' }); } });
}

/* ---------- the startup you found on Pitch Day: a company account that pays you a founder salary ---------- */
function foundStartup(amt, score) {
  state.startup = { name: 'Daladala AI', raised: amt, cash: amt, stake: 80, score, day: clockDay(), paidDay: clockDay(), at: Date.now() };
  phoneMsg('zuri', LANG === 'sw' ? `Pesa ziko kwenye akaunti ya kampuni: ${tsh(amt)}. Utapata mshahara wa mwanzilishi kila siku. Usiitumie yote kwenye mbuzi 🐐` : `The money is in the company account: ${tsh(amt)}. You get a founder salary every day. Do not spend it all on goats 🐐`);
}

/* ---------- every frame ---------- */
function updateMissions(dt) {
  // the summit opens once the VIP ticket is bought
  const S = story();
  if (state.ticket && !S.invited && mode === 'play') {
    S.invited = 1; showMissionPlaces();
    phoneMsg('ztas', LANG === 'sw' ? 'Umealikwa! Mkutano wa Teknolojia na AI wa Zanzibar umefunguliwa AfconCity, kando ya hoteli. Karibu kama mgeni wetu maalum.' : 'You are invited! The Zanzibar Tech & AI Summit is now open in AfconCity, beside the hotel. Come as our special guest.');
  }
  if (MIS_PLACES.ztas && MIS_PLACES.ztas.g.visible !== !!state.ticket) showMissionPlaces();
  if (MIS.quitBtn) { const show = !!MIS.id && mode === 'play'; if (MIS.quitBtn.hidden === show) MIS.quitBtn.hidden = !show; }
  if (!MIS.id) return;
  if (mode === 'wasted' && !MIS.failing) { failMission({ en: 'You ended up at the clinic.', sw: 'Umeishia kliniki.' }); return; }
  const g = MIS.goal;
  if (g) {
    if (g.limit && now() - g.t0 > g.limit) { const why = g.why; MIS.goal = null; failMission(why || { en: 'Out of time.', sw: 'Muda umekwisha.' }); return; }
    if (mode === 'play' && Math.hypot(g.x - P.x, g.z - P.z) < g.r) { MIS.goal = null; if (g.run === MIS.run) g.res(); }
  }
}
/* goal panel, radar target, markers and the start prompt */
function missionGoal() {
  if (MIS.goal) return { tag: LANG === 'sw' ? 'Misheni' : 'Mission', title: tl(MIS.goal.title), desc: tl(MIS.goal.desc) };
  if (MIS.id) return { tag: LANG === 'sw' ? 'Misheni' : 'Mission', title: tl(MISSIONS[MIS.id].title), desc: '' };
  const id = nextMission(); if (!id || job) return null;
  return { tag: LANG === 'sw' ? 'Misheni mpya' : 'New mission', title: tl(MISSIONS[id].title), desc: tl(MISSIONS[id].hint) };
}
function missionTarget() { if (MIS.goal) return MIS.goal; if (MIS.id || job) return null; const id = nextMission(); return id ? MISSIONS[id].start : null; }
function missionMarkers() { const t = missionTarget(); return t ? [{ x: t.x, z: t.z, y: 3.4, s: 1.3 }] : []; }
function missionInteraction() {
  if (MIS.id || playerVeh) return null;
  const id = nextMission(); if (!id) return null;
  const M = MISSIONS[id]; if (Math.hypot(M.start.x - P.x, M.start.z - P.z) > 4.5) return null;
  return { text: tl(M.startText), act: () => startMission(id) };
}
function initMissions() {
  buildMissionPlaces();
  // a small Quit button on the goal card while a mission runs
  const gc = ui.goalTitle && ui.goalTitle.closest('section');
  if (gc) { const b = document.createElement('button'); b.type = 'button'; b.id = 'goalQuit'; b.className = 'goal-quit'; b.hidden = true; b.textContent = LANG === 'sw' ? 'Acha misheni' : 'Quit mission'; b.addEventListener('click', (e) => { e.stopPropagation(); quitMission(); }); gc.append(b); MIS.quitBtn = b; }
  Object.assign(CONTACTS, { ztas: { name: 'ZTAS', col: '#1e9b57', ini: 'Z' }, zuri: { name: 'Zuri', col: '#19b5b1', ini: 'Zu' } });
}
