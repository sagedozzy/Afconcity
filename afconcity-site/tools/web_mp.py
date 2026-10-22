"""afconcity.com backend, end to end against the in-browser Supabase stand-in: two players in two tabs, chat, ads, owner tools."""
import sys, time
from harness import *
R = []
def check(n, ok, info=''):
    R.append(ok); print(('PASS ' if ok else 'FAIL ') + n + ('  ' + str(info) if info else ''), flush=True)
s = Session(claude=open(ROOT + '/tools/sbmock.js').read()).load(); s.ev("() => { window.__noRender = true; }")
A = s.page
B = s.ctx.new_page(); B.on('pageerror', lambda e: s.errors.append('B: ' + str(e))); s._routes(B)
B.goto(s.url, timeout=300000); B.wait_for_function("() => { const b = document.querySelector('#btnPlay'); return b && !b.disabled; }", timeout=300000)
B.evaluate("() => { window.__noRender = true; }")
GA = lambda e: A.evaluate('(s) => window.__G.run(s)', e)
GB = lambda e: B.evaluate('(s) => window.__G.run(s)', e)
def until(G, expr, secs=12):
    t0 = time.time()
    while time.time() - t0 < secs:
        try:
            if G(expr): return True
        except Exception: pass
        time.sleep(0.25)
    return False
s.play()
B.evaluate("() => { document.querySelector('#nick').value = 'Baraka'; document.querySelector('#btnPlay').click(); }")
B.wait_for_function("() => window.__G && window.__G.mode === 'play'", timeout=60000)
GA("talk('amina'), closeMenu(), 1"); GB("talk('amina'), closeMenu(), 1")
check('website backend in use (no Claude runtime)', GA("!window.claude && MP.web === true && AD.web === true"))
check('both players are signed in anonymously', until(GA, "!!WEB.uid && WEB.anon") and until(GB, "!!WEB.uid && WEB.anon") and GA("WEB.uid") != GB("WEB.uid"))
check('room goes live', until(GA, "MP.status === 'live'") and until(GB, "MP.status === 'live'"))
check('each player sees the other', until(GA, "[...remotes.values()].some(r => !r.isMe)") and until(GB, "[...remotes.values()].some(r => !r.isMe)"))
check('the website shows the invite box', GA("!document.querySelector('.invite-box').hidden") and GA("[...document.querySelectorAll('.mp-claude')].every(e => e.hidden)"))
# movement
GB("P.x = START.x + 30, P.z = START.z + 5, player.position.set(P.x, 0.04, P.z), 1")
check('movement reaches the other player', until(GA, "[...remotes.values()].some(r => !r.isMe && Math.abs(r.x - (START.x + 30)) < 1)"), GA("[...remotes.values()].map(r => [Math.round(r.x), Math.round(r.z)])"))
check('movement is a light broadcast, not a database write', GB("(window.__sbmock.sent || 0) > 0"))
check('nicknames come through presence', until(GA, "[...remotes.values()].some(r => displayName(r) === 'Baraka')"), GA("[...remotes.values()].map(r => displayName(r))"))
# chat
GB("sendChat('Mambo! fucking great day'), 1")
check('chat reaches the other player, filtered by the server', until(GA, "[...ui.chatlog.querySelectorAll('li')].some(l => l.textContent.includes('Mambo! *** great day'))"), GA("[...ui.chatlog.querySelectorAll('li')].map(l => l.textContent).slice(-3)"))
check('sender sees the filtered version too', until(GB, "[...ui.chatlog.querySelectorAll('li')].some(l => l.textContent.includes('Mambo! *** great day'))"))
check('chat bubble over the sender', until(GA, "[...remotes.values()].some(r => !r.isMe && !r.tag.bub.hidden && r.tag.bub.textContent.includes('***'))"))
time.sleep(1.0); GB("MP.chatT = 0, sendChat('again'), 1")
check('server rate limit is shown to the player', until(GB, "/Slow down/.test(document.querySelector('#help') ? document.querySelector('#help').textContent : '') || [...document.querySelectorAll('.help')].some(h => /Slow down/.test(h.textContent))", 6))
# mute and report from the fans list
GA("openPause('friends'), 1"); time.sleep(0.5)
check('fans list has Mute and Report for other players', GA("document.querySelectorAll('#pmPlayers .pl-act').length") >= 2)
time.sleep(1.6)
GA("[...document.querySelectorAll('#pmPlayers .pl-act')].find(b => b.textContent === 'Report').click(), 1")
check('report is filed and the player muted', until(GA, "[...document.querySelectorAll('#pmPlayers .pl-act')].some(b => b.textContent === 'Unmute')") and GA("JSON.parse(localStorage.getItem('sbmock.db')).docs.some(d => d.coll === 'reports')"))
GA("closeOverlays(), 1")
time.sleep(1.6); GB("MP.chatT = 0, sendChat('muted words'), 1"); time.sleep(1.5)
check('muted player messages are hidden', not GA("[...ui.chatlog.querySelectorAll('li')].some(l => l.textContent.includes('muted words'))"))
GA("setMuted([...MUTED][0], false), 1")
# owner sign-in and ads
GA("openPause('ads'), 1"); time.sleep(0.6)
check('owner sign-in box on the Billboards tab', GA("!!document.querySelector('#pmAds .ad-owner-login')"))
A.evaluate("() => { const f = document.querySelector('#pmAds .ad-owner-login form'); f.querySelector('[name=email]').value = 'support@afconcity.com'; f.requestSubmit(); }")
check('sign-in code is requested for the owner email', until(GA, "window.__sbmock.log.some(l => l[0] === 'otp' && l[1] === 'support@afconcity.com')"))
A.evaluate("() => { const f = document.querySelector('#pmAds .ad-owner-login form'); f.querySelector('[name=code]').value = '123456'; f.querySelector('[data-verify]').click(); }")
check('owner signed in: editing unlocked', until(GA, "AD.canEdit === true && WEB.admin === true"))
check('owner panel shows forms and chat controls', until(GA, "document.querySelectorAll('#pmAds .ad-card .ad-form').length >= 11 && !!document.querySelector('#pmAds .ad-insights')"))
A.evaluate("() => { const f = document.querySelectorAll('#pmAds .ad-card .ad-form')[0]; f.querySelector('[name=brand]').value = 'Kibo'; f.querySelector('[name=headline]').value = 'KIBO COFFEE'; f.querySelector('button[type=submit]').click(); }")
check('booking goes live for the other player', until(GB, "!!AD.live.b1 && AD.live.b1.headline === 'KIBO COFFEE'"), GB("JSON.stringify(AD.live.b1 || null)"))
res = B.evaluate("() => window.__G.run(\"WEBDB.doc('billboards/b2').set({ headline: 'HACK' }).then(() => 'ok', e => e.message)\")")
check('a player cannot book an ad space', 'violates' in str(res), res)
A.evaluate("() => { const f = document.querySelectorAll('#pmAds .ad-card .ad-form')[0]; f.querySelector('[data-clear]').click(); }")
check('clearing the booking reaches the other player', until(GB, "!AD.live.b1"))
# moderation: report list, block, chat off
A.evaluate("() => { const b = [...document.querySelectorAll('#pmAds .ad-insights button')].find(x => /Block from chat/.test(x.textContent)); b && b.click(); }")
check('owner blocks the reported player', until(GA, "JSON.parse(localStorage.getItem('sbmock.db')).chat_bans.length === 1"))
time.sleep(1.6); GB("MP.chatT = 0, sendChat('hello?'), 1")
check('blocked player cannot chat', until(GB, "[...document.querySelectorAll('.help, #help')].some(h => /cannot chat/.test(h.textContent))", 6))
GA("webUnban(JSON.parse(localStorage.getItem('sbmock.db')).chat_bans[0].uid), 1"); time.sleep(0.5)
GA("renderAdsAll(), 1"); time.sleep(0.5)
A.evaluate("() => { const b = [...document.querySelectorAll('#pmAds .ad-insights button')].find(x => /Switch chat off/.test(x.textContent)); b && b.click(); }")
check('owner switches chat off', until(GA, "JSON.parse(localStorage.getItem('sbmock.db')).docs.some(d => d.coll === 'config' && d.id === 'chat' && d.data.chat === false)"))
time.sleep(1.6); GB("MP.chatT = 0, sendChat('anyone?'), 1")
check('chat off: players are told', until(GB, "[...document.querySelectorAll('.help, #help')].some(h => /switched off/.test(h.textContent))", 6))
# stats and feedback from a player
GB("AD.lastStats = '', writeStats(), 1")
check('player stats are saved', until(GA, "JSON.parse(localStorage.getItem('sbmock.db')).docs.some(d => d.coll === 'stats')"))
GA("closeOverlays(), 1")
check('owner can sign out', GA("webSignOut().then(() => 1)") and until(GA, "!WEB.admin && WEB.anon && AD.canEdit === false"))
check('no page errors', not s.errors, s.errors[:4])
s.close()
print('%d/%d passed' % (sum(R), len(R)))
