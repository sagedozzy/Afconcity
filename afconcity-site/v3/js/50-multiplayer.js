/* ===================== 50 multiplayer: presence, chat, shared coins and drops, events ===================== */
const remotes = new Map();
const MP = { joined: false, room: null, user: null, status: 'connecting', myPeer: null, uid: null, myName: '', last: {}, lastSend: 0, em: '', emt: 0, msg: '', msgt: 0, typ: 0, hf: '', hft: 0, ev: '', evt: 0, evk: '', hiDone: new Set(), names: {}, viewers: 0, chatT: 0 };
const numOr = (v, d) => (typeof v === 'number' && isFinite(v)) ? v : d;
const strOr = (v, max) => (typeof v === 'string') ? v.replace(/[\u0000-\u001f\u007f\u200b-\u200f\u202a-\u202e\u2060-\u206f\ufeff]/g, '').slice(0, max) : '';
/* why this view is solo, said plainly: the platform only lets signed-in people the host has added by email into the live room */
const NET_WHY = {
  outside: 'Solo play. Multiplayer with friends is coming soon.',
  signedout: 'Solo. You are not signed in to Claude here. Sign in, then open the link again.',
  noaccess: 'Solo. You opened a shared link, but the host has not added your Claude email to this game yet. Ask them to add you in Share, then reload.',
  revoked: 'Solo. Your access to this game changed. Reload the page to rejoin.',
  timeout: 'Solo for now: the live room did not answer. The game keeps trying in the background, and you join the others as soon as it connects.',
  error: 'Solo for now. The live room is unavailable. Reload the page to try again.',
  webdown: 'Solo for now: the live server did not answer. Check your connection; the game keeps trying.',
};
function setNet(status, why) {
  MP.status = status; if (why !== undefined) MP.why = why;
  const live = status === 'live', n = MP.viewers;
  ui.online.classList.toggle('live', live);
  ui.onlineText.textContent = live ? (n <= 1 ? 'Live · only you' : `${n} online`) : status === 'connecting' ? 'Connecting…' : 'Solo';
  const msg = live ? (n <= 1 ? (MP.web ? 'Live, and you are the only fan here right now. Send friends the link afconcity.com and they appear in Fumba with you.' : 'Live, and you are the only fan here right now. Friends the host adds by email in Share appear when they open the game signed in. Test it: open this game in a second tab.') : `Live. ${n - 1} other fan${n === 2 ? ' is' : 's are'} in Fumba with you right now.`)
    : status === 'connecting' ? 'Connecting to the live room…'
    : NET_WHY[MP.why] || NET_WHY.error;
  for (const id of ['#netNote', '#pmNet', '#playersNote']) { const el = $(id); if (!el) continue; el.classList.toggle('live', live); (el.querySelector('span') || el).textContent = msg; }
  const h = $('#mmFriendsHint'); if (h) h.textContent = live ? (n <= 1 ? 'Live · only you' : `Live · ${n} online`) : status === 'connecting' ? 'Checking…' : 'Solo';
  const po = $('#pmOnline'); if (po) po.textContent = ui.onlineText.textContent;
}
function displayName(r) { const n = strOr(r.nick, 16) || (r.by && MP.names[r.by]) || 'Fan'; return nickShown(n, r.by); }
async function refreshNames() {
  if (!MP.user) return;
  const ids = [...remotes.values()].map(r => r.by).filter(Boolean);
  if (!ids.length) return;
  try { const ps = await MP.user.profiles(ids); for (const id of ids) if (ps[id] && ps[id].name) MP.names[id] = ps[id].name.split(' ')[0]; renderPlayers(); } catch (e) {}
}
function remoteHuman(kit, peer, lk) { const hsh = Math.abs(hashStr(peer)); return makeHuman(kitLook(kit, lookFrom(lk) || { f: false, s: hsh % 6, h: ['short', 'afro', 'cap'][hsh % 3] }, 10 + hsh % 89)); }
function dropRemote(r) {
  if (!remotes.has(r.peer)) return;
  if (r.veh) scene.remove(r.veh); else scene.remove(r.h);
  r.tag.el.remove(); for (const id of r.drops) COIN.drops.delete(id); remotes.delete(r.peer);
  if (!r.isMe) sysLine(`${displayName(r)} left`);
  renderPlayers();
}
function onPeers(change) {
  const seen = new Set(); let viewers = 0;
  for (const p of change.peers) {
    if (p.kind !== 'viewer') continue;
    viewers++;
    if (p.isMe && p.sameTab) { MP.myPeer = p.peer; continue; }
    seen.add(p.peer);
    const pr = p.presence || {};
    let r = remotes.get(p.peer);
    if (typeof pr.x !== 'number') { if (!r) continue; }
    const kit = clamp(Math.floor(numOr(pr.kit, 0)), 0, KITS.length - 1), lk = strOr(pr.lk, 16);
    if (!r) {
      const h = remoteHuman(kit, p.peer, lk), x = clamp(numOr(pr.x, START.x), -2000, 2000), z = clamp(numOr(pr.z, START.z), -2000, 2000);
      h.position.set(x, 0.04, z); scene.add(h);
      r = { peer: p.peer, by: p.by, isMe: p.isMe, guest: p.guest, h, kit, lk, x, z, ry: 0, cx: x, cz: z, sp: 0, vk: '', veh: null, vc: 0, cash: 0, em: '', emt: 0, msgt: numOr(pr.msgt, 0), evt: numOr(pr.evt, 0), hf: '', hfAt: 0, hft: 0, typ: 0, nick: '', tag: makeTag('Fan', false), prev: null, drops: new Set(), hitT: 0, down: 0 };
      remotes.set(p.peer, r);
      if (!p.isMe) { sysLine(`${strOr(pr.nick, 16) || 'A fan'} arrived in Fumba`); sfx.chat(); }
      refreshNames();
    }
    if (pr === r.prev) continue;
    r.prev = pr; r.by = p.by; r.guest = p.guest;
    { const nx = clamp(numOr(pr.x, r.x), -2000, 2000), nz = clamp(numOr(pr.z, r.z), -2000, 2000), nry = numOr(pr.ry, r.ry), tm = numOr(pr.tm, 0);
      if (nx !== r.x || nz !== r.z || nry !== r.ry || (tm && tm !== r.tm)) { r.updT = performance.now(); remoteSample(r, nx, nz, nry, tm); }
      r.x = nx; r.z = nz; r.ry = nry; r.tm = tm || r.tm; } r.sp = clamp(numOr(pr.sp, 0), 0, 40); r.gone = 0;
    r.cash = clamp(Math.floor(numOr(pr.cash, 0)), 0, 1e10); r.nick = strOr(pr.nick, 16); r.typ = pr.typ ? 1 : 0; r.down = pr.dn ? 1 : 0; r.done = !!pr.done; r.st = clamp(Math.floor(numOr(pr.st, 0)), 0, 99); r.vip = !!pr.vip; r.inside = !!pr.in; r.hm = clamp(Math.floor(numOr(pr.hm, -1)), -1, 2); nyRemote(r, pr);
    if (kit !== r.kit || lk !== r.lk) { r.kit = kit; r.lk = lk; const pos = r.h.position.clone(), ry = r.h.rotation.y, par = r.h.parent; par.remove(r.h); r.h = remoteHuman(kit, p.peer, lk); r.h.position.copy(pos); r.h.rotation.y = ry; par.add(r.h); }
    const vk = (pr.v === 'bajaji' || pr.v === 'boda' || pr.v === 'daladala' || pr.v === 'sedan') ? pr.v : '', vc = numOr(pr.vc, 0x1f5fbf) & 0xffffff, vr = pr.vr === 'p' ? 'p' : 'd';
    r.ps = strOr(pr.ps, 6);
    if (vk !== r.vk || (vk && (vc !== r.vc || vr !== r.vr))) {
      if (r.veh) { r.veh.remove(r.h); scene.remove(r.veh); r.veh = null; scene.add(r.h); }
      r.vk = vk; r.vc = vc;
      r.vr = vr;
      if (vk) { r.veh = makeVehicle(vk, vc); scene.add(r.veh); r.h.parent.remove(r.h); r.veh.add(r.h); const s = (vr === 'p' && VEH[vk].pass) || VEH[vk].seat; r.h.position.set(s[0], s[1], s[2]); r.h.rotation.set(0, 0, 0); r.pose = vr === 'p' ? (vk === 'boda' ? 'pass' : 'sit') : VEH[vk].pose; }
    }
    const emt = numOr(pr.emt, 0), em = strOr(pr.em, 8);
    if (emt && emt !== r.emt) { r.emt = emt; if (EMOTE_LEN[em] && Math.abs(Date.now() - emt) < 20000) { playEmote(r.h, em); if (em === 'cheer' && Math.hypot(r.cx - P.x, r.cz - P.z) < 30) sfx.clap(); } }
    const msgt = numOr(pr.msgt, 0), msg = strOr(pr.msg, 90);
    if (msgt && msgt !== r.msgt) { r.msgt = msgt; if (msg && Math.abs(Date.now() - msgt) < 30000) { r.tag.bub.textContent = msg; r.tag.bub.hidden = false; r.tag.bubUntil = performance.now() + 7000; chatLine(displayName(r), msg, KITS[r.kit].css); sfx.chat(); } }
    const evt = numOr(pr.evt, 0), ev = strOr(pr.ev, 90);
    if (evt && evt !== r.evt) { r.evt = evt; if (ev && Math.abs(Date.now() - evt) < 30000) { sysLine(`${displayName(r)} ${ev}`); if (pr.evk === 'round' && !r.isMe) { RT.boost = now() + 60; help(`<b class="hl">${escapeHtml(displayName(r))}</b> bought a round! Free tangawizi: unlimited sprint for 60 seconds.`, 4500); sfx.win(); } } }
    const hf = strOr(pr.hf, 64), hft = numOr(pr.hft, 0);
    if (hft !== r.hft) { r.hft = hft; r.hf = hf; r.hfAt = performance.now(); }
    if (Array.isArray(pr.pk)) for (const id of pr.pk.slice(0, 60)) if (typeof id === 'number') COIN.picked.add(id);
    const ds = new Set();
    if (Array.isArray(pr.dr)) for (const d of pr.dr.slice(0, 16)) {
      if (!Array.isArray(d) || d.length < 4) continue;
      const id = numOr(d[0], 0), x = numOr(d[1], NaN), z = numOr(d[2], NaN), v = clamp(Math.floor(numOr(d[3], 0)), 0, 20000);
      if (!id || !isFinite(x) || !isFinite(z) || !v) continue;
      ds.add(id); if (!COIN.drops.has(id)) COIN.drops.set(id, { id, x, z, v, kind: 2, drop: true, owner: p.peer });
    }
    for (const id of r.drops) if (!ds.has(id)) COIN.drops.delete(id);
    r.drops = ds;
  }
  for (const [peer, r] of remotes) if (!seen.has(peer)) {
    if (!r.gone) { r.gone = Date.now(); continue; }
    if (Date.now() - r.gone < 2500) continue; // the room list blinked: give them a moment
    dropRemote(r);
  }
  MP.viewers = viewers;
  if (!MP.terminal && MP.room) setNet(MP.room.connected() ? 'live' : MP.status === 'solo' ? 'solo' : 'connecting');
  renderPlayers();
}
/* remote players are drawn a fixed moment in the past (REMOTE_DELAY), between two real updates, so they glide instead of jumping.
   Each update carries the sender's clock; the smallest gap seen between that clock and ours is the link's offset. */
const REMOTE_DELAY = 140;
function remoteSample(r, x, z, ry, tm) {
  const now = Date.now();
  let at = now;
  if (tm) { const off = now - tm; r.off = r.off === undefined || off < r.off ? off : r.off + Math.min(off - r.off, 40) * 0.02; at = tm + r.off; }
  const b = r.buf || (r.buf = []);
  if (b.length && at <= b[b.length - 1].t) at = b[b.length - 1].t + 1;
  b.push({ t: at, x, z, ry }); if (b.length > 24) b.shift();
}
function remotePose(r) {
  const b = r.buf; if (!b || !b.length) return null;
  const T0 = Date.now() - REMOTE_DELAY;
  while (b.length > 2 && b[1].t <= T0) b.shift();
  const a = b[0];
  if (T0 <= a.t || b.length === 1) {
    if (b.length === 1 || T0 <= a.t) return { x: a.x, z: a.z, ry: a.ry };
  }
  const c = b[1];
  if (T0 <= c.t) { if (Math.hypot(c.x - a.x, c.z - a.z) > 25) return { x: c.x, z: c.z, ry: c.ry }; const k = (T0 - a.t) / Math.max(1, c.t - a.t); return { x: lerp(a.x, c.x, k), z: lerp(a.z, c.z, k), ry: a.ry + angWrap(c.ry - a.ry) * k }; }
  // no newer update yet: carry on along the last direction for a short while, then wait
  const span = Math.max(1, c.t - a.t) / 1000, vx = (c.x - a.x) / span, vz = (c.z - a.z) / span;
  if (vx * vx + vz * vz > 900) return { x: c.x, z: c.z, ry: c.ry }; // faster than 30 m/s is a teleport, not a direction to follow
  const e = Math.min(T0 - c.t, 300) / 1000;
  return { x: c.x + vx * e, z: c.z + vz * e, ry: c.ry };
}
function updateRemotes(dt, t) {
  const nowMs = performance.now();
  for (const r of remotes.values()) {
    if (r.gone && Date.now() - r.gone > 3000) { dropRemote(r); continue; }
    const q = remotePose(r) || { x: r.x, z: r.z, ry: r.ry };
    const px = r.cx, pz = r.cz;
    if (Math.hypot(q.x - r.cx, q.z - r.cz) > 60) { r.cx = q.x; r.cz = q.z; } else { r.cx = damp(r.cx, q.x, 22, dt); r.cz = damp(r.cz, q.z, 22, dt); }
    const moved = Math.hypot(r.cx - px, r.cz - pz) / Math.max(dt, 1e-3);
    r.msp = damp(r.msp || 0, Math.min(moved, 30), 8, dt);
    if (r.veh) {
      r.veh.position.set(r.cx, 0.04, r.cz); r.veh.rotation.y = angDamp(r.veh.rotation.y, q.ry, 14, dt);
      for (const w of r.veh.userData.wheels) w.g.rotation.x += r.msp * dt / w.r;
      animHuman(r.h, dt, t, 0, r.pose || VEH[r.vk].pose);
      if (r.vr !== 'p' && mode === 'play' && !playerVeh && !isDown(player) && r.msp > 4 && !r.isMe && nowMs - r.hitT > 2500) {
        const dx = P.x - r.cx, dz = P.z - r.cz;
        if (dx * dx + dz * dz < 2.2) { r.hitT = nowMs; hurtPlayer(r.msp * 2.6, Math.sin(q.ry), Math.cos(q.ry), r.msp * 0.8, 'car'); note(`${displayName(r)} ran you over!`); }
      }
    } else {
      if (r.down) { if (!r.h.userData.fall) knockHuman(r.h, 0, 0, 0); updateFall(r.h, dt); if (r.h.userData.fall && r.h.userData.fall.t > 1.8) r.h.userData.fall.t = 1.8; }
      else if (r.ps === 'sit') { if (r.h.userData.fall) r.h.userData.fall = null; animHuman(r.h, dt, t, 0, 'sit'); }
      else { if (r.h.userData.fall && r.h.userData.fall.t < 2.0) r.h.userData.fall.t = 2.0; if (!updateFall(r.h, dt)) animHuman(r.h, dt, t, r.msp < 0.25 ? 0 : r.msp, 'loco'); }
      r.h.position.set(r.cx, 0.04, r.cz); r.h.rotation.y = angDamp(r.h.rotation.y, q.ry, 14, dt);
    }
    if (r.tag.bubUntil && nowMs > r.tag.bubUntil) { r.tag.bub.hidden = true; r.tag.bubUntil = 0; }
    r.tag.nm.textContent = displayName(r) + (r.typ ? ' …' : ''); r.tag.nm.classList.toggle('ok', nickOk(r.nick, r.by));
    const far = Math.hypot(r.cx - camera.position.x, r.cz - camera.position.z) > 170;
    (r.veh || r.h).visible = !r.inside;
    if (far || mode === 'intro' || r.inside) r.tag.el.style.visibility = 'hidden'; else placeTag(r.tag, r.cx, r.veh ? 2.7 : 2.25, r.cz);
  }
}
function renderPlayers() {
  for (const list of [ui.playerList, $('#pmPlayers')]) if (list) fillPlayers(list);
}
function fillPlayers(list) {
  list.innerHTML = '';
  const rows = [{ name: state.nick || 'You', st: state.cash, kit: state.kit, note: `you · ${state.ticket ? 'VIP' : `${stampCount()}/${REQUIRED.length} stamps`}` }];
  for (const r of remotes.values()) rows.push({ remote: r.isMe ? null : r, name: displayName(r), st: r.cash, kit: r.kit, note: [r.isMe ? 'your other tab' : r.guest ? 'guest' : '', r.vip ? 'VIP' : `${r.st || 0}/${REQUIRED.length} stamps`, r.inside ? 'at home' : r.hm === 2 ? 'Burj resident' : '', r.vk ? `on a ${VEH[r.vk].name.toLowerCase()}` : ''].filter(Boolean).join(' · ') });
  rows.sort((a, b) => b.st - a.st);
  rows.forEach((r, i) => {
    const li = document.createElement('li'); if (i === 0 && rows.length > 1) li.className = 'top';
    const dot = document.createElement('i'); dot.style.background = KITS[r.kit].css;
    const nm = document.createElement('span'); nm.textContent = r.name;
    if (r.note) { const sm = document.createElement('small'); sm.textContent = ` · ${r.note}`; nm.append(sm); }
    const st = document.createElement('b'); st.textContent = tsh(r.st);
    li.append(dot, nm, st);
    if (r.remote && MP.web && MP.room && r.remote.by) {
      const by = r.remote.by, muted = MUTED.has(by), acts = document.createElement('span'); acts.className = 'pl-acts';
      const mb = document.createElement('button'); mb.type = 'button'; mb.className = 'pl-act'; mb.textContent = muted ? 'Unmute' : 'Mute'; mb.onclick = () => setMuted(by, !muted);
      const rb = document.createElement('button'); rb.type = 'button'; rb.className = 'pl-act'; rb.textContent = 'Report';
      rb.onclick = async () => { rb.disabled = true; const ok = await MP.room.report(by, displayName(r.remote), r.remote.lines || []); rb.textContent = ok ? 'Reported' : 'Try later'; if (ok) setMuted(by, true); };
      acts.append(mb, rb); li.append(acts);
    }
    list.append(li);
  });
}
const escapeHtml = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
function chatLine(name, msg, color) {
  const li = document.createElement('li');
  const b = document.createElement('b'); b.textContent = name; b.style.color = color || 'var(--turmeric)';
  li.append(b, document.createTextNode(msg)); pushChat(li);
}
function sysLine(text) { const li = document.createElement('li'); li.className = 'sys'; li.textContent = text; pushChat(li); }
function pushChat(li) {
  ui.chatlog.append(li);
  while (ui.chatlog.children.length > 40) ui.chatlog.firstChild.remove();
  setTimeout(() => li.classList.add('old'), 16000);
  ui.chatlog.scrollTop = ui.chatlog.scrollHeight;
}
function sendPresence(force) {
  if (!MP.room || !MP.joined || !player) return;
  const t = performance.now();
  if (!force && t - MP.lastSend < 100) return;
  const v = playerVeh || (mode === 'ride' && ORDER.v ? { kind: ORDER.kind, col: ORDER.v.col || 0x1f5fbf, yaw: ORDER.v.yaw, vf: ORDER.v.vf, pax: true } : null);
  const cur = {
    x: Math.round((CINE.on ? CINE.boat.position.x : P.x) * 100) / 100, z: Math.round((CINE.on ? CINE.boat.position.z : P.z) * 100) / 100, ry: Math.round((v ? v.yaw : player.rotation.y) * 100) / 100, sp: Math.round((v ? Math.abs(v.vf || 0) : speed) * 10) / 10,
    v: v ? v.kind : '', vc: v ? v.col : 0, vr: v && v.pax ? 'p' : 'd', ps: CINE.on ? 'sit' : '', kit: state.kit, lk: lookCode(state.look), nick: state.nick || '', cash: Math.round(state.cash), in: HOME.inside ? 1 : 0, hm: state.home ? (homeById(state.home.id) || { tier: -1 }).tier : -1, done: !!state.done, dn: isDown(player) ? 1 : 0, st: stampCount(), vip: state.ticket ? 1 : 0, gt: nyGold() ? 1 : 0, fx: NY.fxT,
    em: MP.em, emt: MP.emt, msg: MP.msg, msgt: MP.msgt, typ: MP.typ, hf: MP.hf, hft: MP.hft, ev: MP.ev, evt: MP.evt, evk: MP.evk,
    pk: COIN.myPk.slice(-40), dr: COIN.myDrops.slice(-12).map(d => [d.id, Math.round(d.x * 10) / 10, Math.round(d.z * 10) / 10, d.v]),
  };
  const patch = {}; let any = false;
  for (const k in cur) { const a = cur[k], b = MP.last[k]; const same = Array.isArray(a) ? JSON.stringify(a) === MP.last[k + '#'] : a === b; if (!same) { patch[k] = a; any = true; if (Array.isArray(a)) MP.last[k + '#'] = JSON.stringify(a); else MP.last[k] = a; } }
  if (!any) return;
  MP.lastSend = t; mpDirty = false;
  MP.room.presence(patch).catch(() => {});
}
async function initMultiplayer() {
  const cl = (window.claude && typeof window.claude.use === 'function') ? window.claude : webClaude;
  if (!cl) {
    /* a copy with no backend at all: single player, with multiplayer marked as coming soon */
    document.querySelectorAll('.mp-claude').forEach(e => { e.hidden = true; }); document.querySelectorAll('.mp-none').forEach(e => { e.hidden = false; });
    const pn = $('#playersNote'); if (pn) pn.textContent = 'Multiplayer is coming soon.';
    setNet('solo', 'outside'); return;
  }
  if (cl.web) {
    /* afconcity.com: everyone who opens the site shares one Fumba */
    MP.web = true;
    document.querySelectorAll('.mp-claude').forEach(e => { e.hidden = true; });
    document.querySelectorAll('.mp-web').forEach(e => { e.hidden = false; });
    menuOnline();
  }
  const slow = () => { clearTimeout(MP.slowT); MP.slowT = setTimeout(() => { if (!MP.terminal && MP.status === 'connecting' && !(MP.room && MP.room.connected())) setNet('solo', 'timeout'); }, 15000); };
  slow();
  try {
    const [room, user] = await Promise.all([cl.use('room'), cl.use('user')]);
    MP.user = user;
    let uid = null;
    if (user) { try { const me = await user.me(); uid = me.id; MP.uid = me.id; MP.myName = me.name || ''; const nick = $('#nick'); if (!state.nick && MP.myName && nick && !nick.value) nick.placeholder = MP.myName.split(' ')[0].slice(0, 16); } catch (e) {} }
    if (!room) { setNet('solo', MP.web ? 'webdown' : uid ? 'noaccess' : 'signedout'); return; }
    MP.room = room;
    if (room.onChat) room.onChat(onServerChat);
    const dead = (e) => { MP.terminal = true; const c = e && e.code; setNet('solo', c === 'not_granted' ? (uid ? 'noaccess' : 'signedout') : c === 'revoked' ? 'revoked' : 'error'); };
    room.onConnection((c) => { if (MP.terminal) return; if (c) { clearTimeout(MP.slowT); setNet('live', ''); MP.last = {}; sendPresence(true); } else if (MP.status === 'live') { setNet('connecting'); slow(); } }, dead);
    room.onPeers(onPeers, dead);
  } catch (e) { setNet('solo', 'error'); }
}
function mpEvent(text, kind) {
  MP.ev = strOr(text, 90); MP.evt = Date.now(); MP.evk = kind || '';
  sysLine(`${state.nick || 'You'} ${text}`);
  sendPresence(true);
}
function doEmote(e) { if (!EMOTE_LEN[e] || mode !== 'play' || playerVeh) return; playEmote(player, e); MP.em = e; MP.emt = Date.now(); sendPresence(true); if (e === 'cheer') sfx.clap(); }
function showMyChat(msg) {
  chatLine(state.nick || 'You', msg, KITS[state.kit].css);
  if (playerTag) { playerTag.bub.textContent = msg; playerTag.bub.hidden = false; playerTag.bubUntil = performance.now() + 7000; }
  sfx.chat();
}
/* website chat: the server filters, limits and can block messages; what it stores is what everyone sees */
const MUTED = new Set((() => { try { return JSON.parse(localStorage.getItem('afc-muted') || '[]'); } catch (e) { return []; } })());
function setMuted(by, on) { if (on) MUTED.add(by); else MUTED.delete(by); try { localStorage.setItem('afc-muted', JSON.stringify([...MUTED].slice(-200))); } catch (e) {} renderPlayers(); }
function onServerChat(m) {
  if (!m || !m.by || MUTED.has(m.by)) return;
  if (m.by === WEB.uid && MP.mine && MP.mine.has(m.id)) return;
  const nick = strOr(m.nick, 16) || 'Fan', body = strOr(m.body, 90); if (!body) return;
  let r = null; for (const x of remotes.values()) if (x.by === m.by && !x.isMe) r = x;
  if (r) { r.tag.bub.textContent = body; r.tag.bub.hidden = false; r.tag.bubUntil = performance.now() + 7000; (r.lines = r.lines || []).push(body); if (r.lines.length > 8) r.lines.shift(); }
  chatLine(r ? displayName(r) : nick, body, r ? KITS[r.kit].css : 'var(--turmeric)'); sfx.chat();
  (MP.log = MP.log || []).push({ by: m.by, nick, body, at: m.at }); if (MP.log.length > 40) MP.log.shift();
  if (PH.open && (PH.app === 'msgs' || (PH.app === 'thread' && PH.arg === '#live'))) renderPhone();
}
/* players who told us they are under 18 chat with friendly preset phrases only (the server checks this too) */
const CHAT_PHRASES = ['Mambo! 👋', 'Poa!', 'Karibu Fumba!', 'Twende!', 'Asante!', 'GG!', 'Nice look! 🔥', 'Race me?', 'Follow me', 'Wait for me', 'Let\'s do a job', 'Goal! ⚽', 'Haha 😂', 'Need cash 😅', 'See you later! 👋'];
const isTeen = () => { const v = aboutRead(); return !!(v && v.a && v.a.age === 'Under 18'); };
function renderPhrases() {
  const box = $('#chatPhrases'); if (!box || box.childElementCount) return;
  for (const p of CHAT_PHRASES) { const b = document.createElement('button'); b.type = 'button'; b.textContent = p; b.addEventListener('click', () => { sendChat(p); closeChat(); }); box.append(b); }
  const n = document.createElement('small'); n.textContent = 'Quick phrases keep chat friendly for players under 18.'; box.append(n);
}
function sendChat(text) {
  const msg = strOr(text, 90).trim(); if (!msg) return;
  if (isTeen() && !CHAT_PHRASES.includes(msg)) { help('Pick one of the quick phrases.', 1800); return; }
  if (performance.now() - MP.chatT < 900) { help('Slow down a little. One message a second.', 1500); return; }
  if (MP.room && MP.room.chat) {
    MP.chatT = performance.now(); MP.typ = 0; sendPresence(true);
    MP.room.chat(msg, state.nick || 'Fan').then((r) => {
      if (r.error) { help(escapeHtml(r.error), 2600); sfx.deny(); return; }
      (MP.mine = MP.mine || new Set()).add(r.id); showMyChat(r.body);
      (MP.log = MP.log || []).push({ by: WEB.uid, nick: state.nick || 'You', body: r.body, at: Date.now(), me: true }); if (MP.log.length > 40) MP.log.shift();
    });
    return;
  }
  MP.chatT = performance.now(); MP.msg = msg; MP.msgt = Date.now(); MP.typ = 0; sendPresence(true);
  chatLine(state.nick || 'You', msg, KITS[state.kit].css);
  if (playerTag) { playerTag.bub.textContent = msg; playerTag.bub.hidden = false; playerTag.bubUntil = performance.now() + 7000; }
  sfx.chat();
}
function nearestRemote(maxD) { let best = null, bd = maxD; for (const r of remotes.values()) { if (r.isMe || r.veh) continue; const d = Math.hypot(r.cx - P.x, r.cz - P.z); if (d < bd) { bd = d; best = r; } } return best; }
function highFive(r) { if (!r || !MP.room) return; MP.hf = r.peer; MP.hft = Date.now(); sendPresence(true); playEmote(player, 'hi5'); player.rotation.y = Math.atan2(r.cx - P.x, r.cz - P.z); }
function checkHighFives(nowMs) {
  if (!MP.myPeer) return;
  for (const r of remotes.values()) {
    if (r.isMe || MP.hiDone.has(r.peer)) continue;
    if (r.hf === MP.myPeer && nowMs - r.hfAt < 10000 && MP.hf === r.peer && Date.now() - MP.hft < 10000) {
      MP.hiDone.add(r.peer); playEmote(player, 'cheer'); playEmote(r.h, 'cheer'); sfx.clap();
      earn(1000, `High-five with ${displayName(r)}`); sysLine(`You high-fived ${displayName(r)}`);
    }
  }
}

