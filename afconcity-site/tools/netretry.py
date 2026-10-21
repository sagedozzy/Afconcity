"""afconcity.com live room: a failed or stalled connection shows Solo instead of hanging on Connecting, then joins by itself."""
import sys, time
from harness import *
R = []
def check(n, ok, info=''):
    R.append(bool(ok)); print(('PASS ' if ok else 'FAIL ') + n + ('  ' + str(info) if info else ''), flush=True)
s = Session(claude=open(ROOT + '/tools/sbmock.js').read() + ';window.__sbmock.fail = true;').load(); s.ev("() => { window.__noRender = true; }")
G = lambda e: s.run(e)
def until(expr, secs=12):
    t0 = time.time()
    while time.time() - t0 < secs:
        try:
            if G(expr): return True
        except Exception: pass
        time.sleep(0.25)
    return False
s.play()
check('a failing room never sits on Connecting: it reads Solo', until("MP.status === 'solo' && ui.onlineText.textContent === 'Solo'", 20), G("MP.status + ' ' + ui.onlineText.textContent"))
check('the note says it keeps trying', 'keeps trying' in G("document.querySelector('#playersNote').textContent"))
G("window.__sbmock.fail = false, 1")
check('it joins by itself once the room answers', until("MP.status === 'live'", 70), G("MP.status"))
G("window.__sbmock.fail = true, 1")
check('no page errors', not s.errors, s.errors[:3])
s.close()
print('%d/%d passed' % (sum(R), len(R)))
