/* ===================== 49 web backend: on afconcity.com, Supabase stands in for Claude's runtime ===================== */
/* The game asks for 'db', 'user' and 'room' the same way in both places; here they are small shims over Supabase.
   Players sign in anonymously (no form); the owner signs in by email code; chat goes through the database so the
   word filter, rate limits, bans and the owner's off switch are enforced on the server (see supabase/setup.sql). */
const SB_CFG = {
  url: 'https://duwxnxvrrzqiaeortusg.supabase.co',
  key: 'sb_publishable_ViPUHhYZaXfCQk133yMzhA_JLE4Rz_2',
  lib: 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.117.2/dist/umd/supabase.js',
  room: 'fumba-v1',
};
const WEB = { sb: null, ready: null, uid: null, email: '', anon: true, admin: false, err: '', listeners: [], room: null };
function loadScript(src) { return new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.async = true; s.crossOrigin = 'anonymous'; s.onload = res; s.onerror = () => rej(new Error('Could not load ' + src)); document.head.append(s); }); }
function webErr(e) { return { code: (e && (e.code || e.status)) || 'error', message: (e && e.message) || String(e) }; }
function webBackend() {
  if (WEB.ready) return WEB.ready;
  WEB.ready = (async () => {
    if (!(window.supabase && window.supabase.createClient)) await loadScript(SB_CFG.lib);
    const sb = window.supabase.createClient(SB_CFG.url, SB_CFG.key, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, storageKey: 'afc-auth' }, realtime: { params: { eventsPerSecond: 20 } } });
    WEB.sb = sb;
    let session = null;
    try { session = (await sb.auth.getSession()).data.session; } catch (e) {}
    if (!session) { const r = await sb.auth.signInAnonymously(); if (r.error) WEB.err = r.error.message; else session = r.data.session; }
    await webSetSession(session);
    // never await other Supabase calls inside this callback (supabase-js can deadlock); hop out first
    sb.auth.onAuthStateChange((ev, s) => { setTimeout(() => webSetSession(s).then(() => { for (const f of WEB.listeners) { try { f(ev); } catch (e) {} } }), 0); });
    return sb;
  })();
  return WEB.ready;
}
async function webSetSession(s) {
  const u = s && s.user;
  WEB.uid = u ? u.id : null; WEB.email = (u && u.email) || ''; WEB.anon = !u || !!u.is_anonymous; WEB.admin = false;
  if (u && !WEB.anon) { try { const r = await WEB.sb.rpc('is_admin'); WEB.admin = !!r.data; } catch (e) {} }
}
function onWebAuth(f) { WEB.listeners.push(f); }
/* the shape the game expects from claude.use(): null when this browser cannot run it */
const webClaude = SB_CFG.url && SB_CFG.key ? {
  web: true,
  async use(name) {
    try { await webBackend(); } catch (e) { WEB.err = (e && e.message) || 'offline'; return null; }
    if (name === 'db') return WEBDB;
    if (name === 'user') return WEBUSER;
    if (name === 'room') return webRoom();
    return null;
  },
} : null;

/* ---------- db: documents addressed by path, like 'billboards/b1' or 'feedback/<uid>/items/<id>' ---------- */
const splitPath = (p) => { const i = p.lastIndexOf('/'); return [p.slice(0, i), p.slice(i + 1)]; };
const webDoc = (row) => ({ id: row ? row.id : '', exists: !!row, data: () => (row ? row.data : undefined) });
const rid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
function webWatch(coll, id, fetch, cb, err) {
  let alive = true;
  const run = () => fetch().then((v) => { if (alive) cb(v); }, (e) => { if (alive && err) err(webErr(e)); });
  run();
  const hit = (row) => { if (row && row.coll === coll && (!id || row.id === id)) run(); };
  // Supabase cannot filter delete events, so deletes arrive for every collection and are matched here (only the owner deletes)
  const ch = WEB.sb.channel(`docs:${coll}:${id || '*'}:${rid()}`)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'docs', filter: `coll=eq.${coll}` }, (p) => hit(p.new))
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'docs', filter: `coll=eq.${coll}` }, (p) => hit(p.new))
    .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'docs' }, (p) => hit(p.old))
    .subscribe();
  return () => { alive = false; WEB.sb.removeChannel(ch); };
}
function webQuery(coll, o) {
  o = o || {};
  const fetch = async () => {
    let q = WEB.sb.from('docs').select('id,data').eq('coll', coll).order('updated_at', { ascending: !o.desc });
    if (o.n) q = q.limit(o.n);
    const { data, error } = await q; if (error) throw error;
    return { docs: (data || []).map(webDoc), size: (data || []).length };
  };
  return {
    orderBy: (f, dir) => webQuery(coll, Object.assign({}, o, { desc: dir === 'desc' })),
    limit: (n) => webQuery(coll, Object.assign({}, o, { n })),
    get: () => fetch().catch((e) => { throw webErr(e); }),
    onSnapshot: (cb, err) => webWatch(coll, null, fetch, cb, err),
    add: async (d) => { const id = rid(); await WEBDB.doc(coll + '/' + id).set(d); return { id }; },
    doc: (id) => WEBDB.doc(coll + '/' + id),
  };
}
const WEBDB = {
  collection: (path) => webQuery(path),
  doc(path) {
    const [coll, id] = splitPath(path);
    const fetch = async () => { const { data, error } = await WEB.sb.from('docs').select('id,data').eq('coll', coll).eq('id', id).maybeSingle(); if (error) throw error; return webDoc(data); };
    return {
      id,
      get: () => fetch().catch((e) => { throw webErr(e); }),
      async set(d) { const { error } = await WEB.sb.from('docs').upsert({ coll, id, data: d }, { onConflict: 'coll,id' }); if (error) throw webErr(error); },
      async delete() { const { error } = await WEB.sb.from('docs').delete().eq('coll', coll).eq('id', id); if (error) throw webErr(error); },
      onSnapshot: (cb, err) => webWatch(coll, id, fetch, cb, err),
    };
  },
};

/* ---------- user ---------- */
const WEBUSER = {
  async me() { return { id: WEB.uid, name: '' }; },
  async id() { return WEB.uid; },
  async canEdit() { return WEB.admin; },
  isOwner() { return WEB.admin; },
  async can(what) { return what === 'data.write' ? !!WEB.uid : false; },
  async profiles() { return {}; },
};
/* the owner signs in with a code sent to their email (or the link in the same email) */
async function webOwnerSendCode(email) {
  const { error } = await WEB.sb.auth.signInWithOtp({ email, options: { emailRedirectTo: location.origin + location.pathname, shouldCreateUser: true } });
  if (error) throw webErr(error);
}
async function webOwnerVerify(email, code) {
  const { error } = await WEB.sb.auth.verifyOtp({ email, token: code, type: 'email' });
  if (error) throw webErr(error);
  await webSetSession((await WEB.sb.auth.getSession()).data.session);
}
async function webSignOut() {
  await WEB.sb.auth.signOut();
  const r = await WEB.sb.auth.signInAnonymously();
  await webSetSession(r.data && r.data.session);
}

/* ---------- room: everyone on the website shares one Fumba ---------- */
const MOVE_KEYS = new Set(['x', 'z', 'ry', 'sp', 'v', 'vc']);
function webRoom() {
  if (WEB.room) return WEB.room;
  const myPeer = 'p' + rid();
  const state = {}, moves = {}, merged = new Map(), conn = [], peersCbs = [], chatCbs = [];
  let ch = null, live = false, trackT = 0, trackTimer = 0, moveT = 0, moveTimer = 0, pendingMove = null;
  const peersNow = () => {
    const out = [], st = ch ? ch.presenceState() : {};
    for (const key of Object.keys(st)) {
      const metas = st[key]; if (!metas || !metas.length) continue;
      const m = metas[metas.length - 1], mv = moves[key];
      let e = merged.get(key);
      if (!e || e.m !== m || e.mv !== mv) { e = { m, mv, obj: Object.assign({}, m, mv || {}) }; merged.set(key, e); }
      out.push({ kind: 'viewer', peer: key, by: m.by || '', isMe: !!WEB.uid && m.by === WEB.uid, sameTab: key === myPeer, guest: false, presence: e.obj });
    }
    for (const k of [...merged.keys()]) if (!st[k]) { merged.delete(k); delete moves[k]; }
    return out;
  };
  const emitPeers = () => { const peers = peersNow(); for (const f of peersCbs) { try { f({ peers }); } catch (e) { console.error(e); } } };
  const setLive = (v) => { if (v === live) return; live = v; for (const f of conn) { try { f(v); } catch (e) {} } };
  const track = () => {
    trackTimer = 0; if (!ch || !live) return;
    trackT = performance.now();
    const meta = Object.assign({}, state, { by: WEB.uid || '' });
    delete meta.msg; delete meta.msgt;
    ch.track(meta).catch(() => {});
  };
  const sendMove = () => {
    moveTimer = 0; if (!ch || !live || !pendingMove) return;
    moveT = performance.now();
    ch.send({ type: 'broadcast', event: 'mv', payload: Object.assign({ p: myPeer }, pendingMove) }).catch(() => {});
    pendingMove = null;
  };
  const join = () => {
    ch = WEB.sb.channel(SB_CFG.room, { config: { presence: { key: myPeer }, broadcast: { self: false, ack: false } } });
    ch.on('presence', { event: 'sync' }, emitPeers);
    ch.on('broadcast', { event: 'mv' }, (msg) => {
      const p = msg && msg.payload; if (!p || typeof p.p !== 'string' || p.p === myPeer) return;
      const cur = Object.assign({}, moves[p.p] || {});
      for (const k of MOVE_KEYS) if (k in p) cur[k] = p[k];
      moves[p.p] = cur; emitPeers();
    });
    ch.on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages' }, (p) => {
      const r = p && p.new; if (!r) return;
      for (const f of chatCbs) { try { f({ id: r.id, by: r.owner, nick: r.nick, body: r.body, at: Date.parse(r.created_at) || Date.now() }); } catch (e) {} }
    });
    ch.subscribe((status) => {
      if (status === 'SUBSCRIBED') { setLive(true); track(); emitPeers(); }
      else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') setLive(false);
    });
  };
  WEB.room = {
    web: true,
    connected: () => live,
    onConnection(cb) { conn.push(cb); if (!ch) join(); else cb(live); },
    onPeers(cb) { peersCbs.push(cb); if (!ch) join(); else cb({ peers: peersNow() }); },
    /* the game sends small patches; movement goes out as a light broadcast (up to 5 a second), everything else as presence */
    async presence(patch) {
      let moved = false, other = false;
      for (const k in patch) { state[k] = patch[k]; if (MOVE_KEYS.has(k)) moved = true; else other = true; }
      if (moved) {
        pendingMove = pendingMove || {}; for (const k of MOVE_KEYS) if (k in patch) pendingMove[k] = patch[k];
        const wait = 200 - (performance.now() - moveT); if (wait <= 0) sendMove(); else if (!moveTimer) moveTimer = setTimeout(sendMove, wait);
      }
      if (other || !trackT) { const wait = 1200 - (performance.now() - trackT); if (wait <= 0 && !trackTimer) track(); else if (!trackTimer) trackTimer = setTimeout(track, Math.max(0, wait)); }
    },
    /* chat goes through the database: the server filters words, limits the rate and enforces bans */
    async chat(text, nick) {
      if (!WEB.uid) return { error: 'Chat needs a moment to connect. Try again.' };
      const { data, error } = await WEB.sb.from('chat_messages').insert({ nick: (nick || 'Fan').slice(0, 16), body: text.slice(0, 90) }).select('id,body,nick').single();
      if (error) return { error: error.message || 'Message not sent.' };
      return { id: data.id, body: data.body, nick: data.nick };
    },
    onChat(cb) { chatCbs.push(cb); if (!ch) join(); },
    async report(target, nick, lines) {
      if (!WEB.uid) return false;
      try { await WEBDB.doc('reports/' + rid()).set({ target, nick: String(nick || '').slice(0, 16), lines: (lines || []).slice(-5).map(s => String(s).slice(0, 90)), at: Date.now(), by: WEB.uid }); return true; } catch (e) { return false; }
    },
  };
  return WEB.room;
}
/* ---------- the owner's chat controls ---------- */
async function webChatEnabled() { try { const d = await WEBDB.doc('config/chat').get(); return !d.exists || d.data().chat !== false; } catch (e) { return true; } }
async function webSetChat(on) { await WEBDB.doc('config/chat').set({ chat: !!on, at: Date.now() }); }
async function webReports() { const s = await WEBDB.collection('reports').orderBy('at', 'desc').limit(30).get(); return s.docs.map(d => Object.assign({ id: d.id }, d.data())); }
async function webBan(uid, reason) { const { error } = await WEB.sb.from('chat_bans').upsert({ uid, reason: String(reason || '').slice(0, 120) }); if (error) throw webErr(error); }
async function webUnban(uid) { const { error } = await WEB.sb.from('chat_bans').delete().eq('uid', uid); if (error) throw webErr(error); }
async function webBans() { const { data } = await WEB.sb.from('chat_bans').select('uid,reason,created_at').order('created_at', { ascending: false }).limit(50); return data || []; }
async function webDismissReport(id) { await WEBDB.doc('reports/' + id).delete(); }
