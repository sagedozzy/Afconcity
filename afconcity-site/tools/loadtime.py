"""Time each boot stage of the website build (dist/), optionally with the CPU slowed down like a budget Android phone.
usage: loadtime.py [cpu_slowdown] [mobile]"""
import sys, time, threading, functools, http.server, socketserver, json
from playwright.sync_api import sync_playwright
ROOT = '/home/claude/afconcity'
THREE = '/tmp/claude-0/-home-claude/e1d17048-b07c-5512-9164-14e2ccd3c77e/scratchpad/h/node_modules/three/build/three.min.js'
RATE = float(sys.argv[1]) if len(sys.argv) > 1 else 1
MOBILE = len(sys.argv) > 2 and sys.argv[2] == 'mobile'
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
srv = socketserver.ThreadingTCPServer(('127.0.0.1', 0), functools.partial(Q, directory=ROOT + '/dist')); srv.daemon_threads = True
threading.Thread(target=srv.serve_forever, daemon=True).start()
url = 'http://127.0.0.1:%d/' % srv.server_address[1]
SPY = """
window.__boot = [{ s: "start", t: performance.now() }];
const __obs = () => { const b = document.querySelector("#btnPlay"); if (!b || b.__o) return !!b; b.__o = 1; let last = b.textContent; window.__boot.push({ s: "btn: " + last, t: performance.now() }); new MutationObserver(() => { if (b.textContent !== last) { last = b.textContent; window.__boot.push({ s: last, t: performance.now() }); } }).observe(b, { childList: true, characterData: true, subtree: true }); return true; };
new MutationObserver(() => __obs()).observe(document, { childList: true, subtree: true });
new MutationObserver(() => {}).observe(document, { childList: true });
document.addEventListener('DOMContentLoaded', () => {
  window.__boot.push({ s: 'DOMContentLoaded', t: performance.now() });
  const b = document.querySelector('#btnPlay'); if (!b) return;
  let last = b.textContent;
  new MutationObserver(() => { if (b.textContent !== last) { last = b.textContent; window.__boot.push({ s: last, t: performance.now() }); } }).observe(b, { childList: true, characterData: true, subtree: true });
});
"""
with sync_playwright() as p:
    b = p.chromium.launch(args=['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
    opts = dict(viewport={'width': 390, 'height': 844}, has_touch=True, is_mobile=True) if MOBILE else dict(viewport={'width': 1280, 'height': 800})
    ctx = b.new_context(**opts); ctx.add_init_script(SPY)
    ctx.add_init_script("try{localStorage.setItem('afconcity-gfx','low');}catch(e){}")
    pg = ctx.new_page()
    cdp = ctx.new_cdp_session(pg)
    if RATE > 1: cdp.send('Emulation.setCPUThrottlingRate', {'rate': RATE})
    pg.route('**/three.min.js', lambda r: r.fulfill(path=THREE, content_type='application/javascript'))
    pg.route('https://fonts.**', lambda r: r.fulfill(body='', status=404))
    pg.route('https://cdn.jsdelivr.net/**', lambda r: r.fulfill(body='', status=404))
    t0 = time.time()
    pg.goto(url, timeout=600000)
    pg.wait_for_function("() => { const b = document.querySelector('#btnPlay'); return b && !b.disabled; }", timeout=900000, polling=500)
    wall = time.time() - t0
    marks = pg.evaluate("() => window.__boot")
    prev = 0
    for m in marks:
        print('%8.0f ms  (+%6.0f)  %s' % (m['t'], m['t'] - prev, m['s'])); prev = m['t']
    print('ready after %.1f s wall clock (cpu slowdown x%g)' % (wall, RATE))
    b.close()
