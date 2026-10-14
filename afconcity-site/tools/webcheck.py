"""Smoke-test the public website build (dist/) the way a player sees it: no Claude runtime, served from a plain web server."""
import sys, time, threading, functools, http.server, socketserver
from playwright.sync_api import sync_playwright
import os; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); from harness import ABOUT_DONE
ROOT = '/home/claude/afconcity'
THREE = sys.argv[1] if len(sys.argv) > 1 else '/tmp/claude-0/-home-claude/e1d17048-b07c-5512-9164-14e2ccd3c77e/scratchpad/h/node_modules/three/build/three.min.js'
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
srv = socketserver.ThreadingTCPServer(('127.0.0.1', 0), functools.partial(Q, directory=ROOT + '/dist')); srv.daemon_threads = True
threading.Thread(target=srv.serve_forever, daemon=True).start()
url = 'http://127.0.0.1:%d/' % srv.server_address[1]
R = []
def check(n, ok, info=''):
    R.append(ok); print(('PASS ' if ok else 'FAIL ') + n + ('  ' + str(info) if info else ''), flush=True)
with sync_playwright() as p:
    b = p.chromium.launch(args=['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
    for label, opts in [('desktop', dict(viewport={'width': 1280, 'height': 800})), ('phone', dict(viewport={'width': 390, 'height': 844}, has_touch=True, is_mobile=True))]:
        ctx = b.new_context(**opts); ctx.add_init_script(ABOUT_DONE); pg = ctx.new_page(); errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.route('**/three.min.js', lambda r: r.fulfill(path=THREE, content_type='application/javascript'))
        pg.route('https://fonts.googleapis.com/**', lambda r: r.fulfill(body='', content_type='text/css'))
        pg.route('https://fonts.gstatic.com/**', lambda r: r.fulfill(body='', status=404))
        pg.goto(url, timeout=300000)
        pg.wait_for_function("() => { const b = document.querySelector('#btnPlay'); return b && !b.disabled; }", timeout=300000)
        check(label + ': page title', pg.title() == 'AfconCity Quest', pg.title())
        check(label + ': no Claude runtime here', pg.evaluate("() => !window.claude"))
        check(label + ': hidden elements stay hidden', pg.evaluate("() => getComputedStyle(document.querySelector('#phone')).display === 'none' && getComputedStyle(document.querySelector('#menuCard')).display === 'none'"))
        pg.evaluate("() => document.querySelector('#btnPlay').click()"); pg.wait_for_timeout(6000)
        check(label + ': game starts and HUD shows', pg.evaluate("() => !document.querySelector('.hud').hidden && document.querySelector('#cash') !== null"))
        check(label + ': website multiplayer text shown', pg.evaluate("() => [...document.querySelectorAll('.mp-web')].every(e => !e.hidden) && [...document.querySelectorAll('.mp-claude')].every(e => e.hidden)"))
        check(label + ': online pill says Solo', 'Solo' in pg.evaluate("() => document.querySelector('#onlineText').textContent"))
        pg.wait_for_timeout(6000)
        check(label + ': progress is saved in the browser', pg.evaluate("() => !!localStorage.getItem('afconcity-fumba-v4')"))
        check(label + ': no page errors', not errs, errs[:3])
        ctx.close()
    for f in ['favicon.svg', 'icon-192.png', 'icon-512.png', 'apple-touch-icon.png', 'manifest.webmanifest', 'og.jpg', 'robots.txt']:
        import urllib.request
        try: code = urllib.request.urlopen(url + f).status
        except Exception as e: code = str(e)
        check('serves ' + f, code == 200, code)
    b.close()
print('%d/%d passed' % (sum(R), len(R)))
