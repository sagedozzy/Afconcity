"""Cross-system edge cases: pause/phone during rides, eviction with the phone open, new game mid-ride, fair timers, traffic."""
import sys, time
from harness import *
R = []
def check(name, ok, info=''):
    R.append((name, bool(ok), info)); print(('PASS ' if ok else 'FAIL ') + name + ('  ' + str(info) if info else ''), flush=True)
s = Session().load(); s.ev("() => { window.__noRender = true; }")
G = lambda e: s.run(e)
def until(expr, secs=10):
    t0 = time.time()
    while time.time() - t0 < secs:
        if G(expr): return True
        s.wait(0.25)
    return False
s.play(); s.wait(1)
G("talk('amina'), closeMenu(), state.cash = 300000, 1")
def ride_to(kind='boda'):
    G("(() => { const d = rideSpots().find(x => x.id === 'market'); orderRide('%s', d); let n = 0; while (ORDER.state === 'coming' && n++ < 5000) updateOrder(0.05, 0); P.x = ORDER.v.x + 1; P.z = ORDER.v.z; boardRide(); return 1; })()" % kind)
# 1 pause during a ride freezes it and resumes into the ride
ride_to()
check('boarded a ride', G("mode === 'ride' && ORDER.state === 'riding'"))
G("openPause('map'), 1")
s0 = G("ORDER.v.R.s"); s.wait(2); s1 = G("ORDER.v.R.s")
check('pause works during a ride and freezes it', G("mode === 'paused'") and s0 == s1, [s0, s1])
G("closeOverlays(), 1")
check('closing the pause menu goes back to the ride', G("mode === 'ride'"))
# 2 phone during a ride; arriving with the phone open is clean
G("openPhone('msgs'), 1")
check('phone opens during a ride', G("mode === 'phone' && PH.open"))
G("(() => { let n = 0; while (ORDER.state === 'riding' && n++ < 40000) updateOrder(0.05, 0); return 1; })()")
check('arriving with the phone open keeps the phone mode', G("mode === 'phone' && ORDER.state === 'leaving' && player.parent === scene"))
G("closePhone(), 1")
check('closing the phone after arrival returns to play', G("mode === 'play'"))
# 3 time spent paused does not count against a job
G("startPizza && startPizza(), 1"); s.wait(0.5)
if G("!!job"):
    t0 = G("now() - job.t0"); G("openPause('stats'), 1"); s.wait(3); t1 = G("now() - job.t0"); G("closeOverlays(), 1")
    check('job timer stops while paused', abs(t1 - t0) < 0.15, [round(t0, 2), round(t1, 2)])
    G("failJobSilently(), 1")
else:
    check('pizza job started', False)
# 4 police do not move while paused
G("startChase(1), 1"); s.wait(0.5)
p0 = G("[POLICE.v.x, POLICE.v.z]"); G("openPause('map'), 1"); s.wait(2); p1 = G("[POLICE.v.x, POLICE.v.z]"); G("closeOverlays(), endChase(false), 1")
check('police car is frozen while paused', p0 == p1, [p0, p1])
# 5 eviction while the phone is open at home
G("(() => { const d = myDoor(); P.x = d.ox; P.z = d.oz; enterHome(); return 1; })()"); s.wait(0.6)
G("openPhone('house'), 1")
G("(() => { state.home.owed = 15000; state.home.graceUntil = clockNow() - 1; state.bank = 0; state.cash = 0; rentCheck(); return 1; })()")
check('eviction with the phone open: out of the home, phone still open', G("!HOME.inside && mode === 'phone' && PH.open && !state.home"))
G("closePhone(), 1")
check('closing the phone after eviction returns to play', G("mode === 'play'"))
G("state.cash = 300000, moveIn && moveIn(HOMES[0]), 1")
# 6 new game during a ride
G("state.cash = 300000, 1"); ride_to('bajaji')
G("newGame(), mode = 'play', 1")
check('new game mid-ride drops the ride and puts the player back in the world', G("!ORDER.state && player.parent === scene && !ORDER.v"))
# 7 I'm stuck during a ride does not open a menu
G("state.cash = 300000, 1"); ride_to()
G("stuckMenu(), 1")
check("I'm stuck during a ride just tells you to skip", G("mode === 'ride' && $('#menuCard').hidden"))
G("skipRide(), 1")
# 8 the clock runs during rides
G("state.cash = 300000, 1"); ride_to()
c0 = G("clockNow()"); s.wait(3); c1 = G("clockNow()")
check('game clock runs while riding', c1 > c0, [c0, c1]); G("skipRide(), 1")
# 9 fishing survives opening the phone
G("(() => { closeOverlays(); if (typeof startFishing !== 'function') return 0; const pe = (typeof PIER_END !== 'undefined') ? PIER_END : null; return 1; })()")
# 10 traffic keeps moving (no head-on gridlock)
stuck = G("(() => { const p = [P.x, P.z]; P.x = 0; P.z = 900; for (let k = 0; k < 4000; k++) updateCars(0.05, k * 0.05); const n = cars.filter(c => c.speed < 0.3).length; P.x = p[0]; P.z = p[1]; return n; })()")
check('traffic does not gridlock after a few minutes', stuck <= 3, stuck)
# 11 money cannot become NaN
G("earn(NaN, 'x'), spend(undefined, 'y'), 1")
check('bad amounts are refused', G("Number.isFinite(state.cash) && Number.isFinite(state.bank)"))
check('no page errors', not s.errors, s.errors[:3])
s.close()
print('%d/%d passed' % (sum(1 for r in R if r[1]), len(R)))
