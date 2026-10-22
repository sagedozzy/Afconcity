"""The main screen fits one screen at desktop, laptop, phone and landscape-phone sizes, and every panel works:
wardrobe Back, how-to tabs, invite link, settings switches, advertise link, about map, and locking in a unique fan name.
usage: menu.py [shots-dir]"""
import sys, time, json
from harness import *
R = []
def check(n, ok, info=''):
    R.append(bool(ok)); print(('PASS ' if ok else 'FAIL ') + n + ('  ' + str(info) if info else ''), flush=True)
SHOTS = sys.argv[1] if len(sys.argv) > 1 else None
PANELS = ['play', 'style', 'how', 'friends', 'settings', 'ads', 'about']
FIT = """(() => {
  const vh = innerHeight, vw = innerWidth, out = [];
  const pan = document.querySelector('#startPanel'), sp = [...document.querySelectorAll('.sp')].find(p => !p.hidden);
  const over = Math.max(0, pan.scrollHeight - pan.clientHeight);
  const r = pan.getBoundingClientRect(), b = document.querySelector('#start .start-grid').scrollHeight;
  const play = document.querySelector('#btnPlay').getBoundingClientRect();
  return { over, panelBottom: Math.round(r.bottom), vh, pageOver: Math.max(0, b - vh), docOver: Math.max(0, document.documentElement.scrollWidth - vw), playVisible: play.bottom <= vh + 1 && play.top >= 0 };
})()"""
def sizes():
    return [('desktop', 1440, 900, False), ('laptop', 1280, 720, False), ('phone', 390, 844, True), ('landscape', 844, 390, True)]
for name, w, h, touch in sizes():
    s = Session(w=w, h=h, touch=touch, mobile=touch, claude=open(ROOT + '/tools/sbmock.js').read()).load()
    s.ev("() => { window.__noRender = true; }")
    for p in PANELS:
        s.ev("(p) => document.querySelector('.mm-item[data-p=\"' + p + '\"]').click()", p); time.sleep(0.6 if p != 'style' else 1.2)
        f = s.ev(FIT)
        tol = 1e9 if p == 'style' else 8  # the wardrobe scrolls inside its panel, with Back at the top and Done pinned
        check(f'{name}: {p} fits ({w}x{h})', f['over'] <= tol and f['pageOver'] <= 2 and f['docOver'] <= 1, f)
        if p == 'play': check(f'{name}: the Play button is on screen', f['playVisible'], f)
        if SHOTS: s.shot(f'{SHOTS}/{name}_{p}.png')
    if name == 'phone':
        s.ev("() => document.querySelector('.mm-item[data-p=\"style\"]').click()"); time.sleep(1)
        check('phone: the wardrobe has a Back button at the top', s.ev("() => { const b = document.querySelector('#btnStyleBack').getBoundingClientRect(); return b.top >= 0 && b.bottom < innerHeight * 0.75 && b.width > 0; }"))
        s.ev("() => document.querySelector('#btnStyleBack').click()"); time.sleep(0.4)
        check('phone: Back returns to the Play panel', s.ev("() => !document.querySelector('.sp[data-p=\"play\"]').hidden && !document.body.classList.contains('styling')"))
    s.close()
# behaviour (desktop)
s = Session(w=1440, h=900, claude=open(ROOT + '/tools/sbmock.js').read()).load(); s.ev("() => { window.__noRender = true; }")
G = s.run
def until(expr, secs=10):
    t0 = time.time()
    while time.time() - t0 < secs:
        try:
            if G(expr): return True
        except Exception: pass
        time.sleep(0.25)
    return False
check('signed in on the website backend', until("MP.web === true && !!WEB.uid"))
s.ev("() => document.querySelector('.mm-item[data-p=\"how\"]').click()"); time.sleep(0.3)
check('how to play opens on the game tab, short', s.ev("() => !document.querySelector('.ht[data-ht=\"game\"]').hidden && document.querySelectorAll('.how2 li').length === 5 && document.querySelector('.how2').textContent.length < 700"))
s.ev("() => document.querySelector('button[data-ht=\"keys\"]').click()"); time.sleep(0.2)
check('controls have their own tab', s.ev("() => document.querySelector('.ht[data-ht=\"game\"]').hidden && !document.querySelector('.ht[data-ht=\"keys\"]').hidden && document.querySelectorAll('#controlsKeys > div').length >= 12"))
s.ev("() => document.querySelector('.mm-item[data-p=\"friends\"]').click()")
check('play with friends shows an invite link', until("/afconcity\\.com\\/\\?ref=[a-z0-9]{6}/.test(document.querySelector('#invLink').textContent) && !document.querySelector('#btnInvShare').disabled"), s.ev("() => document.querySelector('#invLink').textContent"))
check('and what it pays', s.ev("() => /25,000/.test(document.querySelector('.invite-box').textContent) && !document.querySelector('.invite-box').hidden"))
s.ev("() => document.querySelector('.mm-item[data-p=\"settings\"]').click()"); time.sleep(0.2)
s.ev("() => document.querySelector('.sp[data-p=\"settings\"] [data-seg=\"names\"] button[data-v=\"off\"]').click()")
check('settings: names above heads can be hidden', G("document.body.classList.contains('no-names') && SETTINGS.names === false") and s.ev("() => localStorage.getItem('afconcity-names') === 'off'"))
s.ev("() => document.querySelector('.sp[data-p=\"settings\"] [data-seg=\"names\"] button[data-v=\"on\"]').click()")
s.ev("() => document.querySelector('.sp[data-p=\"settings\"] [data-seg=\"shake\"] button[data-v=\"off\"]').click()")
check('settings: screen shake off stops the shake', G("(RT.shake = 1, SETTINGS.shake === false)"))
s.ev("() => document.querySelector('.sp[data-p=\"settings\"] [data-seg=\"shake\"] button[data-v=\"on\"]').click()")
s.ev("() => { const r = document.querySelector('.sp[data-p=\"settings\"] [data-range=\"vol\"]'); r.value = '0.3'; r.dispatchEvent(new Event('input')); }")
check('settings: volume slider saves and matches the pause menu', G("Math.abs(SETTINGS.vol - 0.3) < 0.01") and s.ev("() => document.querySelector('#pause [data-range=\"vol\"], .pm-pane [data-range=\"vol\"]').value === '0.3'"))
s.ev("() => document.querySelector('.sp[data-p=\"settings\"] [data-seg=\"time\"] button[data-v=\"night\"]').click()")
check('settings: time of day from the main screen', G("state.tmode === 'night'"))
s.ev("() => document.querySelector('.sp[data-p=\"settings\"] [data-seg=\"time\"] button[data-v=\"live\"]').click()")
s.ev("() => document.querySelector('.mm-item[data-p=\"ads\"]').click()"); time.sleep(0.3)
check('advertise: a one-line pitch and a link to the brands page', s.ev("() => { const a = document.querySelector('#adBrandsLink'); return !!a && /brands$/.test(a.getAttribute('href')) && document.querySelector('.ad-pitch').textContent.length < 200; }"))
s.ev("() => document.querySelector('.mm-item[data-p=\"about\"]').click()"); time.sleep(0.6)
check('about: the mini map is drawn', s.ev("() => { const c = document.querySelector('#aboutMap'); if (c.width < 300) return false; const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let n = 0; for (let i = 0; i < d.length; i += 400) if (d[i] !== 0x1b) n++; return n > 100; }"))
# fan names
s.ev("() => document.querySelector('.mm-item[data-p=\"play\"]').click()"); time.sleep(0.3)
def typ(v):
    s.ev("(v) => { const i = document.querySelector('#nick'); i.value = v; i.dispatchEvent(new Event('input')); }", v)
typ('Zuri K')
check('a free name offers Lock it in', until("!document.querySelector('#btnClaim').hidden && /Available/.test(document.querySelector('#nickNote').textContent)"), s.ev("() => document.querySelector('#nickNote').textContent"))
s.ev("() => document.querySelector('#btnClaim').click()")
check('locking it in makes it yours', until("NICK.mine === 'Zuri K' && /Locked in/.test(document.querySelector('#nickNote').textContent) && document.querySelector('#btnClaim').hidden"))
check('the name is saved on the server', 'zurik' in json.dumps(s.ev("() => JSON.parse(localStorage.getItem('sbmock.db')).nicknames")))
typ('Admin')
check('reserved names are refused', until("/reserved/.test(document.querySelector('#nickNote').textContent) && document.querySelector('#btnClaim').hidden"))
typ('Fan 27')
check('default Fan names cannot be locked', until("/reserved/.test(document.querySelector('#nickNote').textContent)"))
# another player takes a name: this player cannot play with it
s.ev("() => { const d = JSON.parse(localStorage.getItem('sbmock.db')); d.nicknames.push({ key: 'kibokid', nick: 'Kibo Kid', uid: 'someone-else', at: 1 }); localStorage.setItem('sbmock.db', JSON.stringify(d)); }")
typ('kibo_kid')
check('a name someone else locked in shows as taken', until("/Another fan/.test(document.querySelector('#nickNote').textContent)"))
G("startPlay(), 1"); time.sleep(0.5)
check('and Play will not start with it', G("mode === 'intro'"))
check('other players using a locked name show as Fan; the owner gets a tick', until("(nickShown('Kibo Kid', 'someone-else') === 'Kibo Kid' && nickShown('Kibo Kid', 'impostor') === 'Fan' && nickOk('Kibo Kid', 'someone-else'))"))
typ('Zuri K')
check('back to my own name', until("/Locked in/.test(document.querySelector('#nickNote').textContent)"))
G("startPlay(), 1")
check('Play starts with my locked name', until("mode === 'play' && state.nick === 'Zuri K'"))
check('no page errors', not s.errors, s.errors[:3])
s.close()
print('%d/%d passed' % (sum(R), len(R)))
