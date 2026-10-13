(() => {
  const OWNER = !location.search.includes('viewer');
  const store = new Map(), subs = new Set();
  const snapDoc = (path) => { const d = store.get(path); return { id: path.split('/').pop(), exists: !!d, data: () => d ? JSON.parse(JSON.stringify(d)) : undefined, metadata: { fromCache: false, hasPendingWrites: false } }; };
  const kids = (col) => [...store.keys()].filter(k => { const p = k.split('/'); return p.length === col.split('/').length + 1 && k.startsWith(col + '/'); }).sort();
  const fire = () => { for (const s of subs) s(); };
  let n = 0;
  const docRef = (path) => ({ id: path.split('/').pop(), path,
    get: async () => snapDoc(path),
    set: async (d) => { if (JSON.stringify(d).length > 262144) throw { code: 'invalid_argument', message: 'too big' }; store.set(path, JSON.parse(JSON.stringify(d))); fire(); },
    update: async (d) => { if (!store.has(path)) throw { code: 'invalid_argument' }; store.set(path, Object.assign(store.get(path), d)); fire(); },
    delete: async () => { store.delete(path); fire(); },
    onSnapshot: (next) => { const f = () => next(snapDoc(path)); subs.add(f); setTimeout(f, 0); return () => subs.delete(f); },
    collection: (p) => colRef(path + '/' + p) });
  const query = (col, ord, lim) => ({
    where: () => query(col, ord, lim), orderBy: (f, dir) => query(col, [f, dir], lim), limit: (k) => query(col, ord, k),
    get: async () => { let docs = kids(col).map(snapDoc); if (ord) docs.sort((a, b) => ((a.data()[ord[0]] || 0) - (b.data()[ord[0]] || 0)) * (ord[1] === 'desc' ? -1 : 1)); if (lim) docs = docs.slice(0, lim); return { docs, size: docs.length, empty: !docs.length, docChanges: () => [], metadata: {} }; },
    onSnapshot: (next) => { const f = async () => next(await query(col, ord, lim).get()); subs.add(f); setTimeout(f, 0); return () => subs.delete(f); },
  });
  const colRef = (col) => Object.assign(query(col), { path: col, doc: (id) => docRef(col + '/' + (id || ('m' + (++n)))), add: async (d) => { const r = docRef(col + '/m' + (++n)); await r.set(d); return r; } });
  const db = { doc: docRef, collection: colRef };
  const user = { id: async () => 'u1', me: async () => ({ id: 'u1', name: 'Tester' }), canEdit: async () => OWNER, isOwner: async () => OWNER, can: async () => true, profiles: async () => ({}) };
  window.__store = store;
  window.claude = { use: async (name) => name === 'db' ? db : name === 'user' ? user : null };
})();
