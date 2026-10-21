/* ===================== 56 wardrobe: the island wardrobe screen, a beach photo shoot behind it, and the look summary on Play ===================== */
const STYLE = { on: false, tab: 'top', spot: null, saved: null, a: 0, exp: 0 };
const cssHex = (h) => '#' + (h >>> 0).toString(16).padStart(6, '0');
/* which curated look this is (if any), and a one-line description */
function lookName(lk) {
  lk = fixLook(Object.assign({ f: false, s: 3, h: 'short' }, lk || {}));
  for (const p of PRESETS) { if (p.f !== !!lk.f) continue; const q = applyPreset({ s: lk.s, h: lk.h }, p); if (['t', 'tc', 'tp', 'b', 'bc', 'bp', 'sh', 'ht', 'ey'].every(k => q[k] === lk[k])) return p.n; }
  return 'Your own look';
}
function lookDesc(lk) {
  lk = fixLook(Object.assign({ f: false, s: 3, h: 'short' }, lk || {}));
  const top = TOPS[lk.t], bot = BOTTOMS[lk.b], parts = [];
  const tname = top.robe && !lk.f ? top.nm : top.n;
  parts.push(top.kit ? `${(KITS[state.kit] || KITS[0]).name} jersey` : `${PALETTE_NAMES[lk.tc]} ${PATS[lk.tp] && PATS[lk.tp] !== 'linen' ? PAT_NAMES[PATS[lk.tp]].toLowerCase() + ' ' : ''}${tname.toLowerCase()}`);
  if (!top.dress && !top.robe) parts.push(bot.kit ? (lk.f ? bot.nf : bot.n).toLowerCase() : `${PALETTE_NAMES[lk.bc].toLowerCase()} ${bot.n.toLowerCase()}`);
  parts.push(SHOES[lk.sh].n.toLowerCase());
  if (lk.ht) parts.push(HATS[lk.ht].n.toLowerCase());
  if (lk.ey) parts.push(EYES[lk.ey].n.toLowerCase());
  const s = parts.join(', '); return s.charAt(0).toUpperCase() + s.slice(1);
}
function styleApply(lk, o) {
  state.look = fixLook(Object.assign({}, lk)); if (player) buildPlayer(); mpDirty = true; writeSave();
  if (o && o.after) o.after();
  renderLookSum();
}
/* a fresh random outfit for this body */
function shuffleLook(lk) {
  const r = Math.random, pick = (a) => a[Math.floor(r() * a.length)], f = !!lk.f;
  const t = pick(TOPS.filter(it => fitsBody(it, f) && (!it.kit || r() < 0.4))), b = pick(BOTTOMS.filter(it => !it.kit && fitsBody(it, f)));
  Object.assign(lk, { t: itemIx(TOPS, t.id), tc: Math.floor(r() * 16), tp: PATS.indexOf(pick(t.pats.filter(ownsPrint))), b: itemIx(BOTTOMS, b.id), bc: pick([0, 1, 10, 12, 13, 14, 7, 9, 2, 6]), bp: PATS.indexOf(r() < 0.55 || !b.pats.some(ownsPrint) ? b.pats[0] : pick(b.pats.filter(ownsPrint))), sh: Math.floor(r() * SHOES.length), shc: pick([0, 1, 10, 12, 16, 17, 2, 3]), ht: r() < 0.45 ? 1 + Math.floor(r() * (HATS.length - 1)) : 0, hc: pick([0, 1, 10, 5, 8, 4, 3]), ey: r() < 0.5 ? 1 + Math.floor(r() * (EYES.length - 1)) : 0 });
  if (t.kit) lk.b = 0;
  return lk;
}
/* limited prints cost game shillings, so they can only be bought once a game is under way */
function buyPrints(list, where) {
  const price = list.reduce((a, x) => a + (PAT_PRICE[x] || 0), 0);
  const say = (t) => { let p = where && where.querySelector('.st-buy'); if (!p && where) { p = document.createElement('p'); p.className = 'fine st-buy'; where.prepend(p); } if (p) p.textContent = t; };
  if (!state.intro) { say(`Limited prints are bought with game shillings (${tsh(price)}). Start playing, then open the wardrobe at home or from here.`); sfx.deny(); return false; }
  if (!canPay(price)) { say(`You need ${tsh(price)} in cash or on Pesa for this.`); sfx.deny(); return false; }
  spend(price, list.length > 1 ? 'Limited-edition prints' : `${PAT_NAMES[list[0]]} print`);
  state.prints = Array.from(new Set((state.prints || []).concat(list))); track('print_bought', { p: list.join(',') }); writeSave();
  return true;
}
/* the wardrobe editor; o.name keeps radio groups apart, o.after redraws other avatars, o.compact for the home panel */
function renderStyle(root, o) {
  o = o || {};
  if (!root) return;
  const nm = o.name || 's', lk = fixLook(Object.assign({ f: false, s: 3, h: 'short' }, state.look || {}));
  const el = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt !== undefined) e.textContent = txt; return e; };
  const redo = () => renderStyle(root, o);
  const set = (fn, emote) => { fn(lk); fixLook(lk); styleApply(lk, o); if (emote && player) playEmote(player, emote); if (emote && HOME.av) playEmote(HOME.av, emote); redo(); };
  const chip = (row, group, label, checked, on, sw, img) => {
    const l = el('label', 'kit'); l.innerHTML = `<input type="radio" name="${nm}-${group}"><span>${sw || img ? '<i></i>' : ''}</span>`;
    const i = l.querySelector('i'); if (i) { if (img) { i.style.backgroundImage = `url(${img})`; i.style.backgroundSize = 'cover'; } else i.style.setProperty('--sw', sw); }
    if (label) l.querySelector('span').append(label);
    const inp = l.querySelector('input'); inp.checked = checked; inp.setAttribute('aria-label', label || group); inp.addEventListener('change', on); row.append(l); return l;
  };
  const sec = (title) => { const s = el('div', 'st-sec'); if (title) s.append(el('h3', 'st-h', title)); root.append(s); return s; };
  const row = (parent, cls) => { const r = el('div', 'kit-row' + (cls ? ' ' + cls : '')); parent.append(r); return r; };
  root.innerHTML = '';
  // body and skin
  const s0 = sec(''); const rb = row(s0), rs = row(s0, 'swatches');
  [[false, 'Man'], [true, 'Woman']].forEach(([f, n]) => chip(rb, 'body', n, !!lk.f === f, () => set((l) => { if (!!l.f !== f) applyPreset(l, PRESETS.find(p => p.f === f && !p.ht && !p.ltd)); l.f = f; }, 'wave')));
  PLAYER_SKINS.forEach((c, i) => chip(rs, 'skin', '', lk.s === i, () => set((l) => { l.s = i; }), cssHex(c)).querySelector('input').setAttribute('aria-label', `Skin tone ${i + 1}`));
  // curated looks
  const s1 = sec('Island looks'); const grid = el('div', 'st-presets'); s1.append(grid);
  const cur = lookName(lk);
  for (const p of PRESETS.filter(q => q.f === !!lk.f)) {
    const q = applyPreset({ s: lk.s, h: lk.h }, p), top = TOPS[q.t];
    const b = el('button', 'st-preset'); b.type = 'button'; b.setAttribute('aria-pressed', String(p.n === cur));
    const art = el('span', 'st-art');
    const tc = top.kit ? (KITS[state.kit] || KITS[0]).css : cssHex(PALETTE[q.tc]);
    const t1 = el('i', 't'); t1.style.backgroundColor = tc; if (q.tp > 0) { t1.style.backgroundImage = `url(${patSwatch(PATS[q.tp], PALETTE[q.tc])})`; t1.style.backgroundSize = 'cover'; }
    const b1 = el('i', 'b'); const bc = top.dress || top.robe ? tc : BOTTOMS[q.b].kit ? cssHex((KITS[state.kit] || KITS[0]).shorts) : cssHex(PALETTE[q.bc]); b1.style.backgroundColor = bc;
    if (top.dress || top.robe) { b1.style.backgroundImage = t1.style.backgroundImage; b1.style.backgroundSize = 'cover'; } else if (q.bp > 0) { b1.style.backgroundImage = `url(${patSwatch(PATS[q.bp], PALETTE[q.bc])})`; b1.style.backgroundSize = 'cover'; }
    const s2 = el('i', 's'); s2.style.backgroundColor = cssHex(PALETTE[q.shc]);
    art.append(t1, b1, s2); b.append(art, el('span', 'st-pn', p.n));
    const need = presetPrints(p).filter(x => !ownsPrint(x)), price = need.reduce((a, x) => a + PAT_PRICE[x], 0);
    if (p.ltd) { b.classList.add('ltd'); b.append(el('span', 'st-tag', need.length ? `Limited · ${tsh(price)}` : 'Limited · yours')); }
    b.addEventListener('click', () => { if (need.length && !buyPrints(need, grid.parentElement)) return; set((l) => applyPreset(l, p), 'cheer'); });
    grid.append(b);
  }
  // one slot at a time
  const tabs = [['top', 'Top'], ['bottom', 'Bottom'], ['shoes', 'Shoes'], ['hat', 'Hat'], ['eyes', 'Shades'], ['hair', 'Hair']];
  const s2 = sec(''); const tb = el('div', 'st-tabs'); tb.setAttribute('role', 'tablist'); s2.append(tb);
  for (const [k, n] of tabs) { const b = el('button', '', n); b.type = 'button'; b.setAttribute('role', 'tab'); b.setAttribute('aria-selected', String(STYLE.tab === k)); b.addEventListener('click', () => { STYLE.tab = k; redo(); root.querySelector('.st-tabs [aria-selected="true"]')?.focus(); }); tb.append(b); }
  const pane = el('div', 'st-pane'); s2.append(pane);
  const colours = (key, label) => { const r = row(pane, 'swatches'); r.setAttribute('aria-label', label); PALETTE.forEach((c, i) => chip(r, key, '', lk[key] === i, () => set((l) => { l[key] = i; }), cssHex(c)).querySelector('input').setAttribute('aria-label', PALETTE_NAMES[i])); };
  const prints = (key, pats, colKey) => {
    if (pats.length < 2) return;
    const r = row(pane, 'swatches prints');
    pats.forEach((p) => {
      const own = ownsPrint(p), c = chip(r, key, own ? PAT_NAMES[p] : `${PAT_NAMES[p]} · ${tsh(PAT_PRICE[p])}`, PATS[lk[key]] === p, () => { if (!own && !buyPrints([p], pane)) { redo(); return; } set((l) => { l[key] = PATS.indexOf(p); }, own ? null : 'cheer'); }, null, patSwatch(p, PALETTE[lk[colKey]]));
      if (!own) c.classList.add('locked');
    });
  };
  const top = TOPS[lk.t], bot = BOTTOMS[lk.b];
  if (STYLE.tab === 'top') {
    const r = row(pane); TOPS.forEach((it, i) => { if (fitsBody(it, lk.f)) chip(r, 'top', it.robe && !lk.f ? it.nm : it.n, lk.t === i, () => set((l) => { l.t = i; if (!it.pats.includes(PATS[l.tp])) l.tp = PATS.indexOf(it.dp === undefined ? it.pats[0] : it.dp); if (it.kit) l.b = 0; else if (BOTTOMS[l.b].kit) { l.b = itemIx(BOTTOMS, lk.f ? 'palazzo' : 'chinoS'); l.bc = BOTTOMS[l.b].dc; } })); });
    if (top.kit) {
      const kr = row(pane); state.owned.forEach((i) => { const k = KITS[i]; chip(kr, 'kit', k.name, state.kit === i, () => { setKit(i); styleApply(lk, o); redo(); }, k.css); });
      if (state.owned.length < KITS.length) pane.append(el('p', 'fine', 'More jerseys at Rehema\'s fan shop in the Fan Zone.'));
    } else { colours('tc', 'Colour'); prints('tp', top.pats, 'tc'); }
  } else if (STYLE.tab === 'bottom') {
    if (top.dress || top.robe) pane.append(el('p', 'fine', `Your ${(top.robe && !lk.f ? top.nm : top.n).toLowerCase()} covers this. Pick a top to wear trousers, shorts or a skirt.`));
    else {
      const r = row(pane); BOTTOMS.forEach((it, i) => { if (fitsBody(it, lk.f) && (!it.kit || top.kit)) chip(r, 'bot', it.kit && lk.f ? it.nf : it.n, lk.b === i, () => set((l) => { l.b = i; if (!it.pats.includes(PATS[l.bp])) l.bp = PATS.indexOf(it.dp === undefined ? it.pats[0] : it.dp); })); });
      if (bot.kit) pane.append(el('p', 'fine', 'Matches your jersey.')); else { colours('bc', 'Colour'); prints('bp', bot.pats, 'bc'); }
    }
  } else if (STYLE.tab === 'shoes') {
    const r = row(pane); SHOES.forEach((it, i) => chip(r, 'shoe', it.n, lk.sh === i, () => set((l) => { l.sh = i; }))); colours('shc', 'Colour');
  } else if (STYLE.tab === 'hat') {
    const r = row(pane); HATS.forEach((it, i) => chip(r, 'hat', it.n, lk.ht === i, () => set((l) => { const was = l.ht; l.ht = i; if (i && it.dc !== undefined && was !== i) l.hc = it.dc; })));
    if (lk.ht) colours('hc', 'Colour');
    else if (lk.h === 'scarf') { pane.append(el('p', 'fine', 'Headscarf colour:')); colours('hc', 'Colour'); }
  } else if (STYLE.tab === 'eyes') {
    const r = row(pane); EYES.forEach((it, i) => chip(r, 'eye', it.n, lk.ey === i, () => set((l) => { l.ey = i; })));
  } else {
    const r = row(pane); HAIR_PICK.forEach((h) => chip(r, 'hair', HAIR_NAMES[h], lk.h === h, () => set((l) => { l.h = h; })));
  }
  const acts = el('div', 'st-acts');
  const sh = el('button', 'btn btn-ghost', 'Shuffle'); sh.type = 'button'; sh.addEventListener('click', () => set((l) => shuffleLook(l), 'dance'));
  acts.append(sh, el('span', 'fine', o.compact ? lookName(lk) : 'Everyone online sees your look.')); root.append(acts);
}
/* the look card on the Play panel */
function renderLookSum() {
  const n = $('#lookName'), d = $('#lookDesc'); if (!n) return;
  n.textContent = lookName(state.look); d.textContent = lookDesc(state.look);
  const sw = $('#lookSw'); if (sw) { const lk = fixLook(Object.assign({}, state.look || {})), top = TOPS[lk.t]; sw.style.background = top.kit ? (KITS[state.kit] || KITS[0]).css : cssHex(PALETTE[lk.tc]); sw.style.backgroundImage = !top.kit && lk.tp ? `url(${patSwatch(PATS[lk.tp], PALETTE[lk.tc])})` : ''; sw.style.backgroundSize = 'cover'; }
}

/* ---------- the photo shoot: while the wardrobe is open on the start screen, the camera frames you on the beach ---------- */
function styleSpot() {
  if (STYLE.spot) return STYLE.spot;
  for (const x of [42, 8, -95, -70]) { const z = coastZ(x) - 5.5; if (walkable(x, z) && !pointBlocked(x, z, 0.6) && walkable(x, z - 5)) return (STYLE.spot = { x, z, y: groundY(x, z) }); }
  return (STYLE.spot = { x: P.x, z: P.z, y: 0.04 });
}
function setStyling(on) {
  if (on === STYLE.on || !player) return;
  STYLE.on = on; document.body.classList.toggle('styling', on);
  if (on) {
    const s = styleSpot(); STYLE.saved = { x: player.position.x, y: player.position.y, z: player.position.z, ry: player.rotation.y, par: player.parent };
    if (player.parent !== scene) { player.parent.remove(player); scene.add(player); }
    player.position.set(s.x, s.y, s.z); player.rotation.y = Math.PI; player.visible = true; STYLE.a = 0; playEmote(player, 'wave');
  } else {
    const v = STYLE.saved; camera.clearViewOffset(); applyNight(smooth(night));
    if (v) { if (v.par && v.par !== scene) { scene.remove(player); v.par.add(player); } player.position.set(v.x, v.y, v.z); player.rotation.y = v.ry; }
    STYLE.saved = null;
  }
}
/* where on screen the model should stand: the free space beside the panel (wide screens) or above it (phones) */
function styleFrame() {
  const W = innerWidth, H = innerHeight, panel = $('#startPanel'), r = panel ? panel.getBoundingClientRect() : null;
  if (!r || !r.width) return { x: W / 2, y: H * 0.5, h: H * 0.86 };
  // the free space left of, right of and above the panel; the model goes where it can stand tallest (a person is about 0.42 as wide as tall)
  const fit = (w, h) => Math.min(h * 0.9, w / 0.42);
  const opts = [
    { x: r.left / 2, y: H * 0.52, h: fit(r.left, H) },
    { x: (r.right + W) / 2, y: H * 0.52, h: fit(W - r.right, H) },
    { x: W / 2, y: Math.max(60, r.top) * 0.53, h: fit(W, Math.max(60, r.top)) },
  ];
  return opts.reduce((a, b) => (b.h > a.h ? b : a));
}
function styleCamera(dt, t) {
  const s = styleSpot(), fr = styleFrame(), W = innerWidth, H = innerHeight;
  STYLE.a += dt * (reduceMotion ? 0 : 0.12);
  const a = Math.sin(STYLE.a) * 0.55, vis = 2.5 * H / Math.max(120, fr.h), d = vis / (2 * Math.tan(camera.fov * Math.PI / 360));
  camera.position.set(s.x + Math.sin(a) * d, s.y + 1.05, s.z - Math.cos(a) * d); camera.lookAt(s.x, s.y + 0.95, s.z);
  camera.setViewOffset(W, H, W / 2 - fr.x, H / 2 - fr.y, W, H);
  sun.target.position.set(s.x, 0, s.z);
  // the model keeps a relaxed idle and turns a little toward the lens
  if (player) { player.rotation.y = Math.PI + a * 0.6; animHuman(player, dt, t, 0, 'loco'); }
  // a little extra light for night shoots
  renderer.toneMappingExposure = lerp(LDAY.exp, LNIGHT.exp, smooth(night)) * (1 + 0.55 * smooth(night));
}
