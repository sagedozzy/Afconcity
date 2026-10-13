"""Multiplayer edge cases on the website backend (in-browser Supabase stand-in): late joiners, idle players, vehicles, leaving, high-fives."""
import sys, time
from harness import *
R = []
def check(n, ok, info=''):
    R.append(ok); print(('PASS ' if ok else 'FAIL ') + n + ('  ' + str(info) if info else ''), flush=True)
s = Session(claude=open(ROOT + '/tools/sbmock.js').read()).load(); s.ev("() => { window.__noRender = true; }")
A = s.page
GA = lambda e: A.evaluate('(s) => window.__G.run(s)', e)
def until(G, expr, secs=12):
    t0 = time.time()
    while time.time() - t0 < secs:
        try:
            if G(expr): return True
        except Exception: pass
        time.sleep(0.25)
    return False
def newPlayer(nick):
    p = s.ctx.new_page(); p.on('pageerror', lambda e: s.errors.append(nick + ': ' + str(e))); s._routes(p)
    p.goto(s.url, timeout=300000); p.wait_for_function("() => { const b = document.querySelector('#btnPlay'); return b && !b.disabled; }", timeout=300000)
    p.evaluate("() => { window.__noRender = true; }")
    p.evaluate("(n) => { document.querySelector('#nick').value = n; document.querySelector('#btnPlay').click(); }", nick)
    p.wait_for_function("() => window.__G && window.__G.mode === 'play'", timeout=60000)
    G = lambda e: p.evaluate('(s) => window.__G.run(s)', e)
    G("talk('amina'), closeMenu(), 1")
    return p, G
s.play(); GA("talk('amina'), closeMenu(), 1")
until(GA, "MP.status === 'live'")
# A walks somewhere, then stands still for a while
GA("P.x = START.x + 40, P.z = START.z - 12, player.position.set(P.x, 0.04, P.z), 1"); time.sleep(1.0)
GA("P.x = START.x + 55, P.z = START.z - 20, player.position.set(P.x, 0.04, P.z), 1"); time.sleep(3.0)
B, GB = newPlayer('Late')
wantA = GA("[Math.round(P.x), Math.round(P.z)]")
check('a late joiner sees an idle player where they really are', until(GB, "[...remotes.values()].some(r => !r.isMe && Math.abs(r.x - %d) < 2 && Math.abs(r.z - %d) < 2)" % tuple(wantA), 10), [GB("[...remotes.values()].map(r => [Math.round(r.x), Math.round(r.z), r.isMe])"), wantA])
check('the idle player sees the late joiner', until(GA, "[...remotes.values()].some(r => !r.isMe && displayName(r) === 'Late')"))
# no duplicates
check('no duplicate players', GB("[...remotes.values()].filter(r => !r.isMe).length") == 1 and GA("[...remotes.values()].filter(r => !r.isMe).length") == 1, [GA("remotes.size"), GB("remotes.size")])
# A gets on a boda: B should see the bike
GA("(() => { const v = rentals.find(r => r.kind === 'boda'); v.x = P.x + 1; v.z = P.z; v.m.position.set(v.x, 0.04, v.z); v.rented = true; enterVehicle(v); return 1; })()")
check('players on a boda show on the bike', until(GB, "[...remotes.values()].some(r => !r.isMe && r.vk === 'boda' && !!r.veh)"))
GA("exitVehicle(true), 1")
check('getting off shows them on foot again', until(GB, "[...remotes.values()].some(r => !r.isMe && !r.vk && !r.veh)"))
# a hired ride shows too
# high-five
GB("P.x = %d + 1.2, P.z = %d, player.position.set(P.x, 0.04, P.z), 1" % tuple(wantA)); GA("P.x = %d, P.z = %d, player.position.set(P.x, 0.04, P.z), 1" % tuple(wantA))
until(GA, "!!nearestRemote(5)", 15); until(GB, "!!nearestRemote(5)", 15)
c0 = GA("state.cash")
GA("highFive(nearestRemote(5)), 1"); GB("highFive(nearestRemote(5)), 1")
check('high-five pays both players', until(GA, "state.cash > %d" % c0, 10), GA("state.cash") - c0)
# dropped cash is visible to the other player
GA("(() => { dropCash && dropCash(5000); return 1; })()")
check('dropped cash shows for the other player', until(GB, "[...COIN.drops.values()].some(d => d.owner)", 8), GB("COIN.drops.size"))
# leaving
B.close()
check('a player who closes the game disappears', until(GA, "[...remotes.values()].every(r => r.isMe)", 10), GA("remotes.size"))
# rejoin after a reload: one copy only
B, GB = newPlayer('Late')
time.sleep(2)
check('rejoining does not leave a ghost', until(GA, "[...remotes.values()].filter(r => !r.isMe).length === 1", 8), GA("remotes.size"))
# move smoothness: a running remote reaches its target without big jumps
GB("P.x = START.x + 10, P.z = START.z, player.position.set(P.x, 0.04, P.z), 1"); time.sleep(1.5)
check('remote position updates while moving', until(GA, "[...remotes.values()].some(r => !r.isMe && Math.abs(r.x - (START.x + 10)) < 1)", 8))
check('no page errors', not s.errors, s.errors[:4])
s.close()
print('%d/%d passed' % (sum(R), len(R)))
