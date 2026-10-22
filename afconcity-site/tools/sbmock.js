/* A stand-in for supabase-js used by the tests: one shared database (localStorage) and live room (BroadcastChannel)
   across the tabs of one browser context. Owner sign-in: support@afconcity.com with code 123456. */
(() => {
  const LS = localStorage, bc = new BroadcastChannel('sbmock');
  const uuid = () => 'u' + Math.random().toString(16).slice(2, 10) + '-' + Date.now().toString(16);
  const EMPTY = { docs: [], chat_messages: [], chat_bans: [], scores: [], events: [], bookings: [], saves: [], refs: [], invites: [], wallets: [], nyota_owned: [], topups: [] };
  const NY_ITEMS = [['pass_collect', 'Business pass', 150, 7], ['paint_pearl', 'Pearl paint', 200, null], ['paint_neon', 'Neon paint', 200, null], ['fx_fireworks', 'Fireworks', 250, null], ['paint_gold', 'Gold paint', 300, null], ['tag_gold', 'Golden name tag', 400, null]].map(([id, name, price, days]) => ({ id, name, price, days }));
  const NY_PACKS = [['p100', 100, 2000], ['p550', 550, 10000], ['p1200', 1200, 20000], ['p3200', 3200, 50000]].map(([id, nyota, price]) => ({ id, nyota, price }));
  const db = () => Object.assign(JSON.parse(JSON.stringify(EMPTY)), JSON.parse(LS.getItem('sbmock.db') || '{}'));
  const save = (d) => LS.setItem('sbmock.db', JSON.stringify(d));
  const listeners = new Set();
  // database changes arrive a moment later, as after a real commit: storage written in one tab takes a little while to show in another
  bc.onmessage = (e) => { const m = e.data; if (m && m.t === 'pg') setTimeout(() => { for (const f of listeners) f(m); }, 200); else for (const f of listeners) f(m); };
  const post = (m) => { bc.postMessage(m); for (const f of listeners) f(Object.assign({ local: true }, m)); };
  window.__sbmock = { log: [], fail: false };
  function createClient() {
    let session = JSON.parse(sessionStorage.getItem('sbmock.session') || 'null');
    const authCbs = [];
    const setSession = (s, ev) => { session = s; sessionStorage.setItem('sbmock.session', JSON.stringify(s)); for (const f of authCbs) f(ev, s); };
    const isAdmin = () => !!session && session.user.email === 'support@afconcity.com';
    const auth = {
      async getSession() { return { data: { session } }; },
      async signInAnonymously() { if (window.__sbmock.noAnon) return { data: {}, error: { message: 'Anonymous sign-ins are disabled' } }; const s = { access_token: 'tok-' + uuid(), user: { id: uuid(), is_anonymous: true } }; setSession(s, 'SIGNED_IN'); return { data: { session: s }, error: null }; },
      async signInWithOtp({ email }) { window.__sbmock.log.push(['otp', email]); return { error: null }; },
      async verifyOtp({ email, token }) { if (token !== '123456') return { error: { message: 'Token has expired or is invalid' } }; const s = { access_token: 'tok-owner', user: { id: 'owner-' + email, email, is_anonymous: false } }; setSession(s, 'SIGNED_IN'); return { data: { session: s }, error: null }; },
      async signOut() { setSession(null, 'SIGNED_OUT'); return { error: null }; },
      onAuthStateChange(f) { authCbs.push(f); return { data: { subscription: { unsubscribe() {} } } }; },
    };
    const uid = () => session && session.user.id;
    function from(table) {
      const q = { table, filters: [], op: 'select', sel: false, orders: [], lim: 0, single: false, maybe: false, row: null };
      const run = async () => {
        const d = db(); const rows = d[table];
        const match = (r) => q.filters.every(([k, v, op]) => op === 'in' ? v.map(String).includes(String(r[k])) : op === 'gt' ? r[k] > v : op === 'notnull' ? r[k] != null : String(r[k]) === String(v));
        if (q.op === 'select') {
          let out = rows.filter(match);
          if (table === 'docs') out = out.filter(r => r.coll === 'billboards' || r.coll === 'config' || isAdmin() || r.owner === uid());
          if (table === 'bookings' && !isAdmin()) out = [];
          if (table === 'events' || table === 'saves' || table === 'invites' || table === 'refs') out = [];
          if (q.orders.length) out.sort((a, b) => { for (const [k, asc] of q.orders) { if (a[k] === b[k]) continue; return (a[k] < b[k] ? -1 : 1) * (asc ? 1 : -1); } return 0; });
          if (q.lim) out = out.slice(0, q.lim);
          out = out.map(r => table === 'docs' ? { id: r.id, data: r.data } : r);
          if (q.maybe || q.single) return { data: out[0] || null, error: null };
          return { data: out, error: null };
        }
        if (!uid()) return { data: null, error: { message: 'permission denied' } };
        if (q.op === 'upsert' && table === 'docs') {
          const r = q.row, admin = isAdmin();
          if (!admin && !(r.coll === 'stats' || r.coll.startsWith('feedback') || r.coll === 'reports')) return { data: null, error: { message: 'new row violates row-level security policy', code: '42501' } };
          const i = rows.findIndex(x => x.coll === r.coll && x.id === r.id), row = { coll: r.coll, id: r.id, data: r.data, owner: uid(), updated_at: new Date().toISOString() };
          if (i >= 0) rows[i] = row; else rows.push(row); save(d); post({ t: 'pg', table, event: i >= 0 ? 'UPDATE' : 'INSERT', row });
          return { data: null, error: null };
        }
        if (q.op === 'upsert' && table === 'chat_bans') { if (!isAdmin()) return { error: { message: 'denied' } }; rows.push(Object.assign({ created_at: new Date().toISOString() }, q.row)); save(d); return { data: null, error: null }; }
        if (q.op === 'insert' && table === 'chat_messages') {
          if (d.chat_bans.some(b => b.uid === uid())) return { data: null, error: { message: 'You cannot chat in AfconCity.' } };
          const cfg = d.docs.find(x => x.coll === 'config' && x.id === 'chat'); if (cfg && cfg.data.chat === false) return { data: null, error: { message: 'Chat is switched off right now.' } };
          const last = rows.filter(x => x.owner === uid()).slice(-1)[0]; if (last && Date.now() - Date.parse(last.created_at) < 1500) return { data: null, error: { message: 'Slow down a little.' } };
          const row = { id: rows.length + 1, owner: uid(), nick: q.row.nick, body: q.row.body.replace(/\bfuck\w*/gi, '***'), created_at: new Date().toISOString() };
          rows.push(row); save(d); post({ t: 'pg', table, event: 'INSERT', row });
          return { data: row, error: null };
        }
        if (q.op === 'delete') {
          if (!isAdmin()) return { data: null, error: null };
          const keep = [], gone = []; for (const r of rows) (match(r) ? gone : keep).push(r); d[table] = keep; save(d);
          for (const r of gone) post({ t: 'pg', table, event: 'DELETE', row: table === 'docs' ? { coll: r.coll, id: r.id } : r });
          return { data: null, error: null };
        }
        if (q.op === 'upsert' && table === 'scores') {
          const r = Object.assign({}, q.row); if (r.uid !== uid()) return { data: null, error: { message: 'new row violates row-level security policy' } };
          const i = rows.findIndex(x => x.uid === r.uid); r.updated_at = new Date().toISOString(); if (i >= 0) rows[i] = r; else rows.push(r); save(d); return { data: null, error: null };
        }
        if (q.op === 'insert' && table === 'events') {
          for (const r of [].concat(q.row)) rows.push({ uid: uid(), sid: r.sid, name: String(r.name).slice(0, 40), props: r.props || {}, created_at: new Date().toISOString() });
          save(d); return { data: null, error: null };
        }
        if (q.op === 'update') {
          if (table !== 'bookings' || !isAdmin()) return { data: null, error: { message: 'permission denied' } };
          for (const r of rows) if (match(r)) Object.assign(r, q.row); save(d); return { data: null, error: null };
        }
        return { data: null, error: { message: 'unsupported' } };
      };
      const b = {
        select() { if (q.op === 'insert') q.sel = true; return b; },
        eq(k, v) { q.filters.push([k, v]); return b; },
        in(k, v) { q.filters.push([k, v, 'in']); return b; },
        gt(k, v) { q.filters.push([k, v, 'gt']); return b; },
        not(k, op, v) { if (op === 'is' && v === null) q.filters.push([k, null, 'notnull']); return b; },
        order(k, o) { q.orders.push([k, !o || o.ascending !== false]); return b; },
        update(row) { q.op = 'update'; q.row = row; return b; },
        limit(n) { q.lim = n; return b; },
        maybeSingle() { q.maybe = true; return b; },
        single() { q.single = true; return b; },
        upsert(row) { q.op = 'upsert'; q.row = row; return b; },
        insert(row) { q.op = 'insert'; q.row = row; return b; },
        delete() { q.op = 'delete'; return b; },
        then(res, rej) { return run().then(res, rej); },
      };
      return b;
    }
    function channel(name, opts) {
      const key = opts && opts.config && opts.config.presence && opts.config.presence.key;
      const hs = [], state = {};
      let joined = false;
      const fire = (type, ev, payload) => { for (const h of hs) if (h.type === type && (!h.f.event || h.f.event === ev || h.f.event === '*')) { if (type === 'presence' && ev === 'join' && h.f.event !== 'join') continue; if (type === 'postgres_changes' && (h.f.table !== payload.table || (h.f.filter && !matchFilter(h.f.filter, payload.new || {})))) continue; h.cb(payload); } };
      const matchFilter = (f, row) => { const m = /^(\w+)=eq\.(.*)$/.exec(f); return !m || String(row[m[1]]) === m[2]; };
      const onMsg = (m) => {
        if (!joined) return;
        if (m.t === 'pg') fire('postgres_changes', m.event, { table: m.table, eventType: m.event, new: m.event === 'DELETE' ? {} : m.row, old: m.event === 'DELETE' ? m.row : {} });
        if (m.ch !== name || m.local) return;
        if (m.t === 'presence') { const isNew = !state[m.key]; state[m.key] = [m.meta]; if (isNew) fire('presence', 'join', { key: m.key }); fire('presence', 'sync'); }
        if (m.t === 'leave') { delete state[m.key]; fire('presence', 'sync'); }
        if (m.t === 'hello' && key && state[key]) bc.postMessage({ t: 'presence', ch: name, key, meta: state[key][0] });
        if (m.t === 'bc') fire('broadcast', m.event, { event: m.event, payload: m.payload });
      };
      const ch = {
        on(type, f, cb) { hs.push({ type, f: f || {}, cb }); return ch; },
        subscribe(cb) { listeners.add(onMsg); joined = true; window.addEventListener('pagehide', () => bc.postMessage({ t: 'leave', ch: name, key })); setTimeout(() => { bc.postMessage({ t: 'hello', ch: name }); cb && cb(window.__sbmock.fail ? 'CHANNEL_ERROR' : 'SUBSCRIBED'); }, 30); return ch; },
        async track(meta) { if (!key) return; state[key] = [meta]; bc.postMessage({ t: 'presence', ch: name, key, meta }); fire('presence', 'sync'); return 'ok'; },
        async send(m) { bc.postMessage({ t: 'bc', ch: name, event: m.event, payload: m.payload }); window.__sbmock.sent = (window.__sbmock.sent || 0) + 1; return 'ok'; },
        presenceState() { return state; },
        _leave() { listeners.delete(onMsg); joined = false; bc.postMessage({ t: 'leave', ch: name, key }); },
      };
      return ch;
    }
    return { auth, from, channel, removeChannel(ch) { ch._leave && ch._leave(); }, rpc: async (n, a) => rpc(n, a || {}) };
    async function rpc(n, a) {
      const d = db(), me = uid(), err = (m) => ({ data: null, error: { message: m } });
      if (n === 'is_admin') return { data: isAdmin(), error: null };
      if (!me) return err('not signed in');
      const AL = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789', mk = (k) => Array.from({ length: k }, () => AL[Math.floor(Math.random() * AL.length)]).join('');
      if (n === 'save_put') {
        if (!a.p_code) { const code = mk(10); d.saves.push({ code, owner: me, data: a.p_data, updated_at: Date.now() }); save(d); return { data: code, error: null }; }
        const r = d.saves.find(x => x.code === a.p_code); if (!r) return err('Unknown save code');
        if (r.owner !== me) return err('This save moved to another device');
        r.data = a.p_data; r.updated_at = Date.now(); save(d); return { data: r.code, error: null };
      }
      if (n === 'save_load') {
        const c = String(a.p_code || '').toUpperCase().replace(/[^A-Z0-9]/g, ''), r = d.saves.find(x => x.code === c);
        if (!r) return err('No save with that code. Check the letters and try again.');
        r.owner = me; save(d); return { data: { code: r.code, data: r.data }, error: null };
      }
      if (n === 'my_ref') { let r = d.refs.find(x => x.uid === me); if (!r) { r = { uid: me, ref: mk(6).toLowerCase() }; d.refs.push(r); save(d); } return { data: r.ref, error: null }; }
      if (n === 'invite_accept') {
        const r = d.refs.find(x => x.ref === String(a.p_ref || '').toLowerCase()); if (!r || r.uid === me || d.invites.some(x => x.invitee === me)) return { data: false, error: null };
        d.invites.push({ inviter: r.uid, invitee: me, at: Date.now(), qualified: false, collected: false }); save(d); return { data: true, error: null };
      }
      if (n === 'invite_qualify') { const r = d.invites.find(x => x.invitee === me && !x.qualified); if (!r) return { data: false, error: null }; r.qualified = true; save(d); return { data: true, error: null }; }
      if (n === 'invite_collect') { const rs = d.invites.filter(x => x.inviter === me && x.qualified && !x.collected); rs.forEach(x => { x.collected = true; }); save(d); return { data: rs.length, error: null }; }
      const nyState = (dd) => ({ nyota: (dd.wallets.find(w => w.uid === me) || { nyota: 0 }).nyota, owned: dd.nyota_owned.filter(o => o.uid === me && (!o.until || Date.parse(o.until) > Date.now())).map(o => ({ item: o.item, until: o.until })), items: NY_ITEMS, packs: NY_PACKS });
      if (n === 'nyota_state') return { data: nyState(d), error: null };
      if (n === 'nyota_buy') {
        const it = NY_ITEMS.find(i => i.id === a.p_item); if (!it) return err('That item is not for sale.');
        const o = d.nyota_owned.find(x => x.uid === me && x.item === it.id);
        if (!it.days && o) return err('You already own this.');
        const w = d.wallets.find(x => x.uid === me); if (!w || w.nyota < it.price) return err('Not enough Nyota.');
        w.nyota -= it.price;
        const until = it.days ? new Date(Math.max(o && o.until ? Date.parse(o.until) : 0, Date.now()) + it.days * 864e5).toISOString() : null;
        if (o) o.until = until; else d.nyota_owned.push({ uid: me, item: it.id, until });
        save(d); return { data: nyState(d), error: null };
      }
      if (n === 'analytics_summary') {
        if (!isAdmin()) return err('Only the owner can see analytics');
        const ev = d.events, players = new Set(ev.map(e => e.uid)), by = (name) => new Set(ev.filter(e => e.name === name).map(e => e.uid)).size;
        const day = new Date().toISOString().slice(0, 10);
        return { data: { players: players.size, new_players: players.size, returned_next_day: 0, returned_within_7_days: 0, avg_session_min: 1.5, invites: d.invites.length, saves: d.saves.length,
          daily: [{ day, players: players.size, sessions: new Set(ev.map(e => e.sid)).size, minutes: 3 }],
          funnel: ['session_start', 'play', 'onboard_done', 'met_amina', 'first_job', 'stamps_3', 'stamps_all', 'vip_ticket'].map(step => ({ step, players: by(step) })),
          sources: [{ source: 'direct', players: players.size }], devices: [{ device: 'desktop', players: players.size }] }, error: null };
      }
      return err('unknown function ' + n);
    }
  }
  // the payment function (functions/v1/bachs): top-ups are paid with window.__sbmock.pay(id)
  const realFetch = window.fetch.bind(window);
  const tokUid = (h) => { const s = JSON.parse(sessionStorage.getItem('sbmock.session') || 'null'); return s && h === 'Bearer ' + s.access_token ? s.user.id : null; };
  const reply = (o, status) => new Response(JSON.stringify(o), { status: status || 200, headers: { 'content-type': 'application/json' } });
  window.fetch = async (url, init) => {
    const u = String(url && url.url || url), m = u.match(/\/functions\/v1\/bachs\/([a-z-]+)(\?.*)?$/);
    if (!m) return realFetch(url, init);
    init = init || {}; const h = init.headers || {}, me = tokUid(h.authorization || h.Authorization), d = db();
    window.__sbmock.log.push(['fn', m[1], init.body || '']);
    if (!me) return reply({ error: 'Sign in first.' }, 401);
    if (m[1] === 'topup') {
      const b = JSON.parse(init.body || '{}'), pk = NY_PACKS.find(p => p.id === b.pack);
      if (!b.adult) return reply({ error: 'Top-ups are for players aged 18 and over.' }, 403);
      if (d.docs.some(x => x.coll === 'stats' && x.id === me && x.data && x.data.about && x.data.about.age === 'Under 18')) return reply({ error: 'Top-ups are for players aged 18 and over.' }, 403);
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(b.email || '')) return reply({ error: 'Please check your email address: the receipt goes there.' }, 400);
      if (!pk) return reply({ error: 'That pack is not available.' }, 400);
      const id = '00000000-0000-4000-8000-' + String(Date.now()).slice(-12).padStart(12, '0');
      d.topups.push({ id, uid: me, pack: pk.id, nyota: pk.nyota, amount: pk.price, status: 'pending_payment', email: b.email, name: b.name }); save(d);
      return reply({ id, url: 'https://pay.bachs.test/checkout/' + id, amount: pk.price, currency: 'TZS', nyota: pk.nyota });
    }
    if (m[1] === 'topup-status') {
      const id = new URLSearchParams(m[2] || '').get('id'), t = d.topups.find(x => x.id === id);
      if (!t || t.uid !== me) return reply({ error: 'Unknown top-up.' }, 404);
      return reply({ status: t.status, nyota: t.nyota });
    }
    return reply({ error: 'Not found' }, 404);
  };
  window.__sbmock.pay = (id) => { const d = db(), t = d.topups.find(x => x.id === id && x.status === 'pending_payment'); if (!t) return 0; t.status = 'paid'; const w = d.wallets.find(x => x.uid === t.uid); if (w) w.nyota += t.nyota; else d.wallets.push({ uid: t.uid, nyota: t.nyota }); save(d); return t.nyota; };
  window.supabase = { createClient };
})();
