"""Website caching: second visit loads from the saved copy, and the game opens with no connection."""
import os, sys, time, threading, functools, http.server, socketserver
# service-worker requests only reach Playwright's routes with this switch
os.environ.setdefault('PW_EXPERIMENTAL_SERVICE_WORKER_NETWORK_EVENTS', '1')
from playwright.sync_api import sync_playwright
import os; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); from harness import ABOUT_DONE
ROOT = '/home/claude/afconcity'
THREE = '/tmp/claude-0/-home-claude/e1d17048-b07c-5512-9164-14e2ccd3c77e/scratchpad/h/node_modules/three/build/three.min.js'
hits = []
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
    def do_GET(self): hits.append(self.path); return super().do_GET()
srv = socketserver.ThreadingTCPServer(('127.0.0.1', 0), functools.partial(Q, directory=ROOT + '/dist')); srv.daemon_threads = True
threading.Thread(target=srv.serve_forever, daemon=True).start()
url = 'http://127.0.0.1:%d/' % srv.server_address[1]
R = []
def check(n, ok, info=''):
    R.append(ok); print(('PASS ' if ok else 'FAIL ') + n + ('  ' + str(info) if info else ''), flush=True)
three_hits = []
with sync_playwright() as p:
    b = p.chromium.launch(args=['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
    ctx = b.new_context(viewport={'width': 390, 'height': 844}, has_touch=True, is_mobile=True); ctx.add_init_script(ABOUT_DONE)
    def three(r): three_hits.append(1); r.fulfill(path=THREE, content_type='application/javascript', headers={'Access-Control-Allow-Origin': '*', 'Cache-Control': 'public, max-age=31536000'})
    ctx.route('**/three.min.js', three)
    ctx.route('https://fonts.**', lambda r: r.fulfill(body='', status=404)); ctx.route('https://cdn.jsdelivr.net/**', lambda r: r.fulfill(body='', status=404))
    pg = ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    ready = "() => { const b = document.querySelector('#btnPlay'); return b && !b.disabled && /Twende/.test(b.textContent); }"
    pg.goto(url, timeout=600000); pg.wait_for_function(ready, timeout=300000, polling=500)
    check('first visit loads', True)
    check('the offline helper installs', pg.wait_for_function("() => navigator.serviceWorker && navigator.serviceWorker.controller !== undefined && navigator.serviceWorker.ready.then(() => true)", timeout=60000) is not None)
    time.sleep(2)
    first = [h for h in hits if h.startswith('/assets/')]
    check('first visit downloads the game files', len(first) >= 10, len(first))
    # second visit: the game files come from the saved copy
    hits.clear(); n3 = len(three_hits)
    pg.reload(wait_until='commit', timeout=120000); pg.wait_for_function(ready, timeout=300000, polling=500)
    again = [h for h in hits if h.startswith('/assets/')]
    check('second visit fetches only the page, not the game files', len(again) == 0 and '/' in hits, hits[:6])
    cached = pg.evaluate("async () => { const c = await caches.open('afc-files'); return (await c.keys()).length; }")
    check('game files are in the saved copy', cached >= 10, cached)
    # offline: the game still opens
    ctx.set_offline(True)
    pg.reload(wait_until='commit', timeout=120000); pg.wait_for_function(ready, timeout=300000, polling=500)
    check('the game opens with no connection', True)
    pg.evaluate("() => document.querySelector('#btnPlay').click()"); time.sleep(6)
    check('offline: play starts', pg.evaluate("() => !document.querySelector('.hud').hidden"))
    check('no page errors', not errs, errs[:3])
    b.close()
print('%d/%d passed' % (sum(R), len(R)))
