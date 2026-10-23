"""The story in chapters (survive, hustle, the Grand Final, empire and alliances), shared weather, phone controls,
smoother remote players (including passengers), and vehicle wheels and shadows."""
import sys, time, json
from harness import *
R = []
def check(n, ok, info=''):
    R.append(bool(ok)); print(('PASS ' if ok else 'FAIL ') + n + ('  ' + str(info) if info else ''), flush=True)
s = Session().load(); s.ev("() => { window.__noRender = true; }")
G = s.run
def until(expr, secs=10):
    t0 = time.time()
    while time.time() - t0 < secs:
        try:
            if G(expr): return True
        except Exception: pass
        time.sleep(0.2)
    return False
s.play(); time.sleep(0.5)
check('chapter 0 before meeting Amina', G("chapter() === 0"))
lede = G("(talk('amina'), document.querySelector('#mLede').textContent)")
check('Amina tells the nomad story', 'backpack' in lede and 'Grand AFCON Final' in lede, lede[:80])
G("closeMenu(), 1")
check('chapter 1: survive', until("chapter() === 1 && /Chapter 1/.test(ui.goalTag.textContent) && ui.goalTitle.textContent === 'Find your bed'"), G("ui.goalTag.textContent + ' | ' + ui.goalTitle.textContent"))
check('a chapter title card and a message from Amina', until("state.msgs.some(m => m.f === 'amina' && /backpack|AfconCity/.test(m.x))", 6))
G("st2().bed = 1, 1"); time.sleep(0.4)
check('step 2: first job, the radar points to a job giver', until("ui.goalTitle.textContent === 'Earn your first shillings'") and G("(() => { const t = jobTarget(); return !!t && ['rashid','mwajuma','musa','hassan'].some(id => NPC_BY_ID[id] && Math.abs(NPC_BY_ID[id].x - t.x) < 8); })()"))
G("state.stats.jobs = 1, 1"); time.sleep(0.4)
check('step 3: eat', until("ui.goalTitle.textContent === 'Eat something'"))
G("feed(10), 1"); time.sleep(0.4)
check('step 4: Pesa', until("ui.goalTitle.textContent === 'Keep your money safe'"))
G("state.bank = 1000, 1")
check('chapter 2: hustle, with the next stamp', until("chapter() === 2 && /Chapter 2/.test(ui.goalTag.textContent)"), G("ui.goalTag.textContent"))
G("state.ticket = true, 1")
check('chapter 3: the Grand Final', until("chapter() === 3 && ui.goalTitle.textContent === 'Go to the Grand Final'"), G("ui.goalTitle.textContent"))
G("state.done = true, story().summit = 1, story().pitch = 1, 1")
check('chapter 4: empire, alliances listed', until("chapter() === 4 && /Chapter 4/.test(ui.goalTag.textContent)"), G("ui.goalTag.textContent + ' | ' + ui.goalTitle.textContent"))
G("tally('dala', 2), 1")
check('the Daladala Union is ready to join', until("ui.goalTitle.textContent === 'Join the Daladala Union'"), G("ui.goalTitle.textContent"))
G("(() => { const n = NPC_BY_ID.omari; P.x = n.x + 1.5; P.z = n.z; player.position.set(P.x, 0.04, P.z); return 1; })()"); time.sleep(0.4)
check('joining at Mzee Omari', G("(() => { const i = findInteraction(); return i && /Join the Daladala Union/.test(i.text); })()"))
G("findInteraction().act(), 1")
check('the perk: free daladala rides, cheaper fuel', G("ally('union') && allyFare(700) === 0 && allyFuel(3050) < 3050"))
check('other perks wait until earned', G("allyFish(1000) === 1000 && allyBiz() === 1 && allyFood(10) === 10"))
check('alliances are saved', G("!!JSON.parse(localStorage.getItem(SAVE_KEY)).st2.allies.union"))
# veteran saves skip the survival steps
G("st2().skip = 0, st2().bed = 0, st2().ate = 0, state.bank = 0, state.ticket = false, state.done = false, state.stats.jobs = 6, 1")
check('a player well under way skips chapter 1', G("chapter() === 2"))
# weather everyone shares
w = G("(() => { const a = sharedRain(1790000000), b = sharedRain(1790000000); let wet = 0, n = 0; for (let t = 1790000000; t < 1790000000 + 86400; t += 60) { n++; if (sharedRain(t).r > 0) wet++; } return { same: a.r === b.r && a.k === b.k, share: wet / n }; })()")
check('the weather is the same for everyone at the same moment', w['same'])
check('showers are a small part of the day', 0.02 < w['share'] < 0.2, w)
check('the rain follows the shared clock', until("WEATHER.target === sharedRain(realNow() / 1000).r", 3))
# phone controls: push to the edge to run
check('joystick at the edge runs', G("(joy.id = 7, joy.x = 1, joy.y = 0, readInput().run)"))
check('easing off walks again', G("(joy.x = 0.5, !readInput().run)"))
G("joy.id = null, joy.x = 0, 1")
check('the Run button is held, not toggled', G("(runHold = true, readInput().run) && (runHold = false, !readInput().run)"))
# remote players: interpolated between updates, passengers sit
r = G("""(() => {
  const r = { buf: [], off: 0 }; const t0 = Date.now();
  remoteSample(r, 0, 0, 0, t0 - 400); remoteSample(r, 10, 0, 0, t0 - 200); remoteSample(r, 20, 0, 0, t0);
  const q = remotePose(r); return q ? q.x : -1; })()""")
check('a remote player is drawn between two real updates', 8 < r < 20, r)
G("""onPeers({ peers: [{ kind: 'viewer', peer: 'pX', by: 'u-x', presence: { x: P.x + 4, z: P.z, ry: 0, sp: 5, v: 'daladala', vc: 0xf3b41b, vr: 'p', nick: 'Rider', tm: Date.now() } }] }), 1""")
check('a passenger shows seated in the daladala', G("(() => { const r = remotes.get('pX'); return !!r && !!r.veh && r.vk === 'daladala' && r.pose === 'sit'; })()"))
G("onPeers({ peers: [] }), 1")
check('a blip in the room list does not remove the player', G("remotes.has('pX')"))
G("remotes.get('pX').gone = Date.now() - 5000, updateRemotes(0.016, 1), 1")
check('they leave once really gone', G("!remotes.has('pX')"))
# vehicles
check('wheels steer before they roll (no wobble)', G("(() => { const v = makeVehicle('sedan', 0xffffff); return v.userData.wheels.every(w => w.g.rotation.order === 'YXZ'); })()"))
check('vehicles carry a contact shadow', G("(() => { const v = makeVehicle('boda', 0xff0000); return v.children.some(c => c.userData && c.userData.blob); })()"))
check('no page errors', not s.errors, s.errors[:3])
s.close()
# phones: the middle of the screen stays clear
for name, w, h in [('portrait', 390, 844), ('landscape', 844, 390)]:
    s = Session(w=w, h=h, touch=True, mobile=True).load(); s.ev("() => { window.__noRender = true; }")
    s.play(); time.sleep(0.6); s.run("talk('amina'), closeMenu(), help('A long message about something that just happened in Fumba, to see where it sits on the screen.', 4000), 1"); time.sleep(0.5)
    box = s.ev("() => { const r = (sel) => { const e = document.querySelector(sel); const b = e.getBoundingClientRect(); return { t: b.top, b: b.bottom, l: b.left, r: b.right, h: b.height }; }; return { goal: r('.hud .goal'), help: r('#help'), joy: r('#joyZone'), act: r('#tAct') }; }")
    g, hp = box['goal'], box['help']
    check(f'{name}: the goal is a one-line pill at the top', g['h'] < 62 and g['b'] < h * 0.36, g)
    check(f'{name}: messages sit near the top, out of the middle', hp['b'] < h * 0.45, hp)
    check(f'{name}: a big action button and a thumb zone for the joystick', box['act']['h'] >= 80 and box['joy']['h'] > h * 0.5, box['act'])
    check(f'{name}: no page errors', not s.errors, s.errors[:3])
    s.close()
print('%d/%d passed' % (sum(R), len(R)))
