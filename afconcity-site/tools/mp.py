"""Two players in one browser context with a mock room (BroadcastChannel)."""
from harness import *
MOCK = r"""
(() => {
  const me = 'p' + Math.random().toString(36).slice(2, 8), uid = 'u-' + me;
  const bc = new BroadcastChannel('afc-room');
  const peers = new Map(); let mine = {}; const peerH = [];
  const snap = () => [...peers.values()];
  const fire = () => { const p = snap(); for (const h of peerH) h({ peers: p, joined: [], left: [], updated: [] }); };
  peers.set(me, Object.freeze({ peer: me, by: uid, isMe: true, sameTab: true, kind: 'viewer', guest: false, presence: Object.freeze({}), updatedAt: Date.now() }));
  bc.onmessage = (e) => { const d = e.data; if (d.t === 'p') { peers.set(d.peer, Object.freeze({ peer: d.peer, by: d.by, isMe: false, sameTab: false, kind: 'viewer', guest: false, presence: Object.freeze(d.presence), updatedAt: Date.now() })); fire(); } if (d.t === 'hello') bc.postMessage({ t: 'p', peer: me, by: uid, presence: mine }); };
  const room = {
    presence: async (patch) => { mine = Object.assign({}, mine, patch); if (JSON.stringify(mine).length > 4096) throw { code: 'invalid_argument' }; peers.set(me, Object.freeze({ peer: me, by: uid, isMe: true, sameTab: true, kind: 'viewer', guest: false, presence: Object.freeze(mine), updatedAt: Date.now() })); bc.postMessage({ t: 'p', peer: me, by: uid, presence: mine }); fire(); },
    onPeers: (h) => { peerH.push(h); setTimeout(() => { h({ peers: snap(), joined: snap(), left: [], updated: [] }); bc.postMessage({ t: 'hello' }); }, 0); return () => {}; },
    onConnection: (h) => { setTimeout(() => h(true), 0); return () => {}; },
    connected: () => true, peers: snap, emit: async () => {}, on: () => () => {},
  };
  const user = { me: async () => ({ id: uid, name: 'Tester ' + me }), id: async () => uid, profiles: async (ids) => Object.fromEntries(ids.map(i => [i, { name: 'Friend' }])), canEdit: async () => false, can: async () => true, isOwner: async () => false };
  window.claude = { use: async (n) => n === 'room' ? room : n === 'user' ? user : null };
})();
"""
A = Session(claude=MOCK).load()
B = A.ctx.new_page(); A._routes(B); B.goto(A.url, timeout=300000)
B.wait_for_function("() => { const b = document.querySelector('#btnPlay'); return b && !b.disabled; }", timeout=300000)
for p in (A.page, B): p.evaluate("() => { window.__noRender = true; }")
A.page.evaluate("() => { document.querySelector('#nick').value = 'Asha'; window.__G.enterPlay(); }")
B.evaluate("() => { document.querySelector('#nick').value = 'Baraka'; window.__G.run('(() => { state.look = { f: true, s: 1, h: \"braids\" }; return 1; })()'); window.__G.enterPlay(); }")
A.wait(3)
B.evaluate("() => window.__G.run('(() => { P.x = 560; P.z = -106; talk(\"amina\"); closeMenu(); sendChat(\"Mambo vipi!\"); return 1; })()')")
import time
t0 = time.time(); ra = None
while time.time() - t0 < 20:
    ra = A.run("({ status: MP.status, remotes: [...remotes.values()].map(r => [displayName(r), Math.round(r.x), Math.round(r.z), r.st, r.lk, r.h.userData.look.f, r.h.userData.look.hair]), chat: [...ui.chatlog.children].map(li => li.textContent).slice(-3) })")
    if ra['remotes'] and abs(ra['remotes'][0][1] - 560) < 2 and any('Mambo' in c for c in ra['chat']): break
    A.wait(0.5)
print(ra)
ok = ra['remotes'] and ra['remotes'][0][0] == 'Baraka' and abs(ra['remotes'][0][1] - 560) < 2
print('PASS' if ok else 'FAIL', 'presence position reaches the other player')
print('PASS' if any('Mambo' in c for c in ra['chat']) else 'FAIL', 'chat reaches the other player')
print('PASS' if ra['remotes'] and str(ra['remotes'][0][4]).startswith('112') and ra['remotes'][0][5] and ra['remotes'][0][6] == 'braids' else 'FAIL', 'the other player sees your chosen look')
B.evaluate("() => window.__G.run('(() => { const d = myDoor(); P.x = d.ox; P.z = d.oz; enterHome(); return mode; })()')")
t0 = time.time(); inside = False
while time.time() - t0 < 15:
    inside = A.run("[...remotes.values()].some(r => r.inside && !r.h.visible)")
    if inside: break
    A.wait(0.5)
print('PASS' if inside else 'FAIL', 'a friend who goes home disappears from the street')
note = A.run("(() => { renderPlayers(); return ui.playerList.textContent; })()")
print('PASS' if 'at home' in note else 'FAIL', 'the fans list says they are at home', note[:120])
print('errors', A.errors[:3])
A.close()
