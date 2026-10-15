"""Headless Chromium session for the game's local build (afconcity-local.html, DEV build exposes window.__G)."""
import os, threading, time, functools, http.server, socketserver
from playwright.sync_api import sync_playwright

ROOT = '/home/claude/afconcity'
SP = '/tmp/claude-0/-home-claude/e1d17048-b07c-5512-9164-14e2ccd3c77e/scratchpad'
THREE = SP + '/h/node_modules/three/build/three.min.js'

ABOUT_DONE = """try{if(!localStorage.getItem('afc-about'))localStorage.setItem('afc-about',JSON.stringify({v:1,at:1,a:{where:'Zanzibar',team:'Another team',zanzibar:'I live here',age:'25 to 34',watch:'Most weekends',match:'Not sure yet',found:'A friend',love:'Football'}}));}catch(e){}"""

class _Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass

_server = None
def _serve():
    global _server
    if _server: return _server.server_address[1]
    h = functools.partial(_Quiet, directory=ROOT)
    _server = socketserver.ThreadingTCPServer(('127.0.0.1', 0), h); _server.daemon_threads = True
    threading.Thread(target=_server.serve_forever, daemon=True).start()
    return _server.server_address[1]

class Session:
    def __init__(self, w=1280, h=800, touch=False, gfx='low', mobile=False, claude=None, sound='off'):
        self.pw = sync_playwright().start()
        self.browser = self.pw.chromium.launch(args=['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'])
        self.ctx = self.browser.new_context(viewport={'width': w, 'height': h}, has_touch=touch, is_mobile=mobile, device_scale_factor=1)
        self.errors, self.logs = [], []
        init = "try{localStorage.setItem('afconcity-gfx','%s');localStorage.setItem('afconcity-sound','%s');}catch(e){}" % (gfx, sound)
        self.ctx.add_init_script(init)
        # tests skip the welcome questions (tools/onboard.py tests them)
        if os.environ.get('AFC_ONBOARD') != '1': self.ctx.add_init_script(ABOUT_DONE)
        # the daily reward card is a modal; most suites skip it (tools/online.py tests it)
        if os.environ.get('AFC_DAILY') != '1': self.ctx.add_init_script('window.__noDaily = true;')
        if claude: self.ctx.add_init_script(claude)
        self.page = self.ctx.new_page()
        self.page.on('pageerror', lambda e: self.errors.append(str(e)))
        self.page.on('console', lambda m: self.logs.append(m.type + ': ' + m.text) if m.type in ('error', 'warning') else None)
        self._routes(self.page)
        self.url = 'http://127.0.0.1:%d/afconcity-local.html' % _serve()

    def _routes(self, page):
        page.route('**/three.min.js', lambda r: r.fulfill(path=THREE, content_type='application/javascript'))
        page.route('https://fonts.googleapis.com/**', lambda r: r.fulfill(body='', content_type='text/css'))
        page.route('https://fonts.gstatic.com/**', lambda r: r.fulfill(body='', status=404))
        page.route('**/afconcity-local.html', lambda r: r.fulfill(path=ROOT + '/afconcity-local.html', content_type='text/html; charset=utf-8'))

    def load(self, timeout=300000):
        self.page.goto(self.url, timeout=timeout)
        self.page.wait_for_function("() => { const b = document.querySelector('#btnPlay'); return (b && !b.disabled) || !document.querySelector('#loadNote').hidden; }", timeout=timeout)
        return self

    def ev(self, fn, arg=None):
        return self.page.evaluate(fn, arg) if arg is not None else self.page.evaluate(fn)
    def g(self, expr):
        return self.page.evaluate('() => (%s)' % expr)
    def run(self, src):
        return self.page.evaluate('(s) => window.__G.run(s)', src)
    def play(self):
        self.page.evaluate("() => { const b = document.querySelector('#btnPlay'); b.click(); }")
        self.page.wait_for_function("() => window.__G && window.__G.mode === 'play'", timeout=60000)
        return self
    def wait(self, s):
        self.page.wait_for_timeout(int(s * 1000))
    def key(self, code, down=True):
        self.page.evaluate("([c, d]) => window.dispatchEvent(new KeyboardEvent(d ? 'keydown' : 'keyup', { code: c, key: c, bubbles: true }))", [code, down])
    def hold(self, code, secs):
        self.key(code, True); self.wait(secs); self.key(code, False)
    def shot(self, path):
        self.page.screenshot(path=path, timeout=240000)
    def close(self):
        try: self.browser.close()
        finally: self.pw.stop()
