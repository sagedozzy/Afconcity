"""Story missions after the VIP ticket: the Summit unlocks, then Pitch Day (café minigame, ride, boardroom choices), pass and fail."""
import sys, time, os
from harness import *
R = []
def check(n, ok, info=''):
    R.append(bool(ok)); print(('PASS ' if ok else 'FAIL ') + n + ('  ' + str(info) if info else ''), flush=True)
SHOTS = os.environ.get('STORY_SHOTS')
s = Session(w=1280, h=760).load()
if not SHOTS: s.ev("() => { window.__noRender = true; }")
G = lambda e: s.run(e)
pg = s.page
def until(expr, secs=15):
    t0 = time.time()
    while time.time() - t0 < secs:
        try:
            if G(expr): return True
        except Exception: pass
        time.sleep(0.2)
    return False
def shot(name):
    if SHOTS: s.wait(0.6); s.shot(SHOTS + '/' + name + '.png')
def tap_through(stop_expr, secs=60, extra=None):
    """press Space until stop_expr is true (a choice, the minigame, or back in play)"""
    t0 = time.time()
    while time.time() - t0 < secs:
        if G(stop_expr): return True
        if extra: extra()
        pg.keyboard.press('Space'); time.sleep(0.45)
    return False
s.play()
G("talk('amina'), closeMenu(), 1")
check('no summit before the ticket', G("!MIS_PLACES.ztas.g.visible && !nextMission()"))
G("state.ticket = true, state.done = true, 1"); time.sleep(1.5)
check('the VIP ticket opens the summit (phone invite, hall appears)', until("MIS_PLACES.ztas.g.visible && state.msgs.some(m => m.f === 'ztas')"))
check('goal card points to the summit', until("ui.goalTitle.textContent === 'The Summit'"), G("ui.goalTag.textContent + ' | ' + ui.goalTitle.textContent"))
check('radar target is the summit door', G("(() => { const t = jobTarget(); return t && Math.abs(t.x - ZTAS_DOOR.x) < 1 && Math.abs(t.z - ZTAS_DOOR.z) < 1; })()"))
check('pitch day is still locked', G("!MISSIONS.pitch.open()"))
G("P.x = ZTAS_DOOR.x, P.z = ZTAS_DOOR.z, player.position.set(P.x, 0.04, P.z), 1"); time.sleep(0.6)
check('start prompt at the door', 'Summit' in (G("(() => { const i = findInteraction(); return i && i.text; })()") or ''))
G("findInteraction().act(), 1")
check('summit scene plays on its own set', until("mode === 'scene' && SET.on && SET.cur.id === 'summit'", 8))
check('subtitles show the host with her line', until("!MUI.sub.hidden && MUI.who.textContent === 'Asha'", 6), G("MUI.who.textContent + ': ' + MUI.line.textContent"))
shot('summit_wide')
check('reaches the co-founder choice', tap_through("!MUI.choice.hidden"))
shot('summit_choice')
pg.keyboard.press('Digit2')
check('summit passes and returns to the city', tap_through("story().summit === 1 && mode === 'play'", 40))
check('MISSION PASSED banner', G("!MUI.banner.hidden && /MISSION PASSED/.test(MUI.btitle.textContent)"), G("MUI.btitle.textContent + ' | ' + MUI.bsub.textContent"))
check('Zuri texts about Pitch Day', until("state.msgs.some(m => m.f === 'zuri')", 8))
check('pitch day unlocked and shown on the goal card', until("MISSIONS.pitch.open() && ui.goalTitle.textContent === 'Pitch Day'"), G("ui.goalTitle.textContent"))
# pitch day
G("P.x = CAFE_DOOR.x, P.z = CAFE_DOOR.z, player.position.set(P.x, 0.04, P.z), 1"); time.sleep(0.6)
G("findInteraction().act(), 1")
check('café scene with Zuri typing', until("mode === 'scene' && SET.cur.id === 'cafe' && SET.actors.some(a => a.key === 'zuri' && a.pose === 'type')", 8))
shot('cafe_wide')
check('vibe-coding minigame opens', tap_through("!!document.querySelector('#mis .m-vibe')", 30))
def code():
    if G("!!document.querySelector('#mis .v-bug:not([hidden])')"): pg.keyboard.press('KeyY')
    pg.keyboard.press('Space')
t0 = time.time(); fixed = 0; shot_done = False
while time.time() - t0 < 70 and G("!!document.querySelector('#mis .m-vibe') && !document.querySelector('#mis .m-vibe.shipped')"):
    if G("!!document.querySelector('#mis .v-bug:not([hidden])')"):
        if not shot_done: shot('cafe_bug'); shot_done = True
        pg.keyboard.press('KeyY'); fixed += 1
    pg.keyboard.press('Space'); time.sleep(0.12)
check('the app ships', G("!!document.querySelector('#mis .m-vibe.shipped') || story().pitchCp === 'ride'"), f'{fixed} bugs fixed')
check('then the ride to the Burj, with a time limit', tap_through("mode === 'play' && !!MIS.goal && MIS.goal.limit === 300", 30))
check('timer shows on the HUD', until("!ui.timer.hidden", 4))
G("P.x = BURJ_DOOR.x, P.z = BURJ_DOOR.z, player.position.set(P.x, 0.04, P.z), 1")
check('boardroom scene with three investors', until("mode === 'scene' && SET.cur.id === 'board' && ['fatma','kwame','elena'].every(k => actorOf(k))", 10))
shot('board_wide')
for q in range(3):
    check(f'question {q + 1}', tap_through("!MUI.choice.hidden"))
    if q == 0: shot('board_choice')
    pg.keyboard.press('Digit1'); time.sleep(0.5)
check('the offer', tap_through("!MUI.choice.hidden && /20%/.test(MUI.q.textContent)"), G("MUI.q.textContent"))
check('a perfect pitch is offered TSh 12,000,000', 'TSh 12,000,000' in G("MUI.q.textContent"))
pg.keyboard.press('Digit2')
check('the counter-offer gag pays more and the mission passes', tap_through("story().pitch === 1 && mode === 'play'", 50))
check('seed round of TSh 15,000,000 in the startup', G("state.startup && state.startup.raised === 15000000"), G("JSON.stringify(state.startup)"))
check('pass banner names the seed round', '15,000,000' in G("MUI.bsub.textContent"), G("MUI.bsub.textContent"))
# failing and retrying from a checkpoint
G("story().pitch = 0, story().pitchCp = 'ride', state.startup = null, 1")
G("P.x = CAFE_DOOR.x, P.z = CAFE_DOOR.z, player.position.set(P.x, 0.04, P.z), 1"); time.sleep(0.4)
G("findInteraction().act(), 1")
check('retry starts at the ride checkpoint (no minigame again)', until("mode === 'play' && !!MIS.goal && MIS.goal.limit === 300", 6))
G("MUI.banner.hidden = true, wasted(), 1")
check('getting hurt fails the mission', until("!MUI.banner.hidden && /MISSION FAILED/.test(MUI.btitle.textContent)", 8), G("MUI.btitle.textContent"))
check('the quit button is gone after failing', until("MIS.quitBtn.hidden", 5))
until("mode === 'play'", 10)
G("[...MUI.bacts.querySelectorAll('button')][0].click(), 1")
check('Retry resumes the ride', until("!!MIS.goal && MIS.goal.limit === 300", 6))
check('quit button while the mission runs', until("!MIS.quitBtn.hidden", 4))
G("MIS.quitBtn.click(), 1")
check('quitting ends the mission', until("!MIS.id", 6))
# Kiswahili
G("applyLang('sw'), story().pitchCp = 'board', 1"); time.sleep(0.3)
G("startMission('pitch'), 1")
check('Kiswahili subtitles', until("!MUI.sub.hidden && /Karibuni/.test(MUI.line.textContent)", 10), G("MUI.line.textContent"))
G("quitMission(), applyLang('en'), 1")
check('no page errors', not s.errors, s.errors[:4])
s.close()
print('%d/%d passed' % (sum(R), len(R)))
