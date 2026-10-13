"""Soak test: random actions across every system with invariant checks after each.
usage: python3 soak.py [steps] [seed] [mobile]"""
import sys, time, json, random
from harness import *
STEPS = int(sys.argv[1]) if len(sys.argv) > 1 else 150
SEED = int(sys.argv[2]) if len(sys.argv) > 2 else 1
MOBILE = len(sys.argv) > 3 and sys.argv[3] == 'mobile'
random.seed(SEED)
WEBMODE = len(sys.argv) > 4 and sys.argv[4] == 'web'
CL = open(ROOT + '/tools/sbmock.js').read() if WEBMODE else None
s = Session(390, 844, touch=True, mobile=True, claude=CL) if MOBILE else Session(claude=CL)
s.load(); s.ev("() => { window.__noRender = true; window.__errs = []; window.addEventListener('error', e => window.__errs.push(String((e.error && e.error.stack) || e.message).slice(0, 600))); window.addEventListener('unhandledrejection', e => window.__errs.push('rej ' + String(e.reason && (e.reason.stack || e.reason)).slice(0, 400))); }")
G = lambda e: s.run(e)
s.play(); s.wait(1)
G("talk('amina'), closeMenu(), state.cash = 400000, 1")
# action library lives in the game's scope
G(r"""(() => {
const R = () => Math.random();
const pickA = (a) => a[Math.floor(R() * a.length)];
window.__soak = {
  walk(k) { closeOverlays && 0; keys.clear(); for (const c of k) keys.add(c); return 'walk ' + k.join('+'); },
  stop() { keys.clear(); return 'stop'; },
  teleport() { for (let i = 0; i < 50; i++) { const x = BOUNDS.x0 + R() * (BOUNDS.x1 - BOUNDS.x0), z = BOUNDS.z0 + R() * 900; if (walkable(x, z) && !pointBlocked(x, z, 0.6)) { if (playerVeh) exitVehicle(true); if (mode !== 'play') return 'teleport skipped ' + mode; P.x = x; P.z = z; player.position.set(x, groundY(x, z), z); return 'teleport ' + Math.round(x) + ',' + Math.round(z); } } return 'teleport none'; },
  phone() { const apps = Object.keys(PHONE_APPS).filter(a => a !== 'thread' && a !== 'brand'); const a = pickA(apps); openPhone(a); return 'phone ' + a + ' -> ' + mode; },
  phoneClick() { const b = [...document.querySelectorAll('#phScreen button, #phScreen [role=button], #phScreen .ph-app')].filter(x => x.offsetParent); if (!b.length) return 'phoneClick none'; const x = pickA(b); const t = (x.textContent || '').trim().slice(0, 30); x.click(); return 'phoneClick ' + t; },
  closePh() { if (PH.open) closePhone(); return 'closePhone -> ' + mode; },
  pause() { const tabs = ['map', 'goals', 'stats', 'friends', 'ads', 'feedback', 'settings']; const t = pickA(tabs); openPause(t); return 'pause ' + t; },
  unpause() { closeOverlays(); return 'closeOverlays -> ' + mode; },
  npc() { const n = pickA(NPCS); if (mode !== 'play') return 'npc skipped ' + mode; if (playerVeh) exitVehicle(true); P.x = n.x + 1.5; P.z = n.z + 1.5; player.position.set(P.x, groundY(P.x, P.z), P.z); const i = findInteraction(); if (i) { i.act(); return 'interact ' + n.id + ': ' + i.text + ' -> ' + mode; } return 'npc ' + n.id + ' no interaction'; },
  menuPick() { if (mode !== 'menu') return 'menuPick skipped ' + mode; const b = [...document.querySelectorAll('#mItems button, #mItems [role=option]')].filter(x => !x.disabled); if (!b.length) { closeMenu(); return 'menu empty closed'; } const x = pickA(b); const t = (x.textContent || '').trim().slice(0, 40); x.click(); return 'menuPick ' + t + ' -> ' + mode; },
  interact() { if (mode !== 'play' && mode !== 'ride') return 'interact skipped ' + mode; const i = curInter || findInteraction(); if (!i) return 'interact none'; const t = i.text; i.act(); return 'E ' + t + ' -> ' + mode; },
  rent() { if (mode !== 'play' || playerVeh) return 'rent skipped'; const v = pickA(rentals.filter(r => !r.wreck)); if (!v) return 'no rentals'; P.x = v.x + 1; P.z = v.z; v.m.visible = true; rentOrRide(v); return 'rent ' + v.kind + ' -> ' + (!!playerVeh); },
  drive(k) { keys.clear(); for (const c of k) keys.add(c); return 'drive ' + k.join('+'); },
  exitVeh() { if (playerVeh) exitVehicle(R() < 0.5); return 'exit -> ' + !!playerVeh; },
  order() { const kinds = ['boda', 'bajaji', 'daladala']; const k = pickA(kinds); const dest = R() < 0.5 ? pickA(rideSpots()) : null; const ok = orderRide(k, dest); return 'order ' + k + ' ' + (dest ? dest.id : '-') + ' ' + ok; },
  rideFwd() { if (!ORDER.state) return 'rideFwd none'; if (ORDER.state === 'coming') { let n = 0; while (ORDER.state === 'coming' && n++ < 4000) updateOrder(0.05, 0); return 'ride arrived ' + ORDER.state; } if (ORDER.state === 'waiting' && mode === 'play' && !playerVeh) { P.x = ORDER.v.x + 1; P.z = ORDER.v.z; boardRide(); return 'board -> ' + mode + ' ' + ORDER.state; } if (ORDER.state === 'riding') { for (let n = 0; n < 200 && ORDER.state === 'riding'; n++) updateOrder(0.05, 0); return 'riding ' + ORDER.state; } return 'rideFwd ' + ORDER.state; },
  cancel() { cancelOrder('soak cancel'); return 'cancel ' + ORDER.state; },
  home() { if (mode !== 'play') return 'home skipped ' + mode; const d = myDoor(); if (!d) return 'no home'; if (playerVeh) exitVehicle(true); P.x = d.ox; P.z = d.oz; const i = findInteraction(); if (i) { i.act(); return 'home: ' + i.text + ' -> ' + mode; } return 'home no interaction'; },
  homeAct() { if (!HOME.inside) return 'homeAct not inside'; const b = [...document.querySelectorAll('#homePanel button')].filter(x => !x.disabled && x.offsetParent); if (!b.length) return 'homeAct none'; const x = pickA(b); const t = x.textContent.trim().slice(0, 30); x.click(); return 'homeBtn ' + t + ' -> ' + mode + ' inside=' + HOME.inside; },
  police() { if (POLICE.on) { endChase(); return 'endChase'; } startChase(); return 'startChase'; },
  thief() { const th = thieves[Math.floor(R() * thieves.length)]; if (th.state !== 'wander') return 'thief busy'; th.x = P.x + 2; th.z = P.z + 1; th.h.position.set(th.x, 0.04, th.z); th.cool = 0; return 'thief near'; },
  tackle() { tackle(); return 'tackle'; },
  hurt() { if (mode !== 'play') return 'hurt skipped'; hurtPlayer(25 + R() * 60, 1, 0, 3, 'test'); return 'hurt hp=' + Math.round(state.hp) + ' ' + mode; },
  tired() { state.energy = 0.5; return 'energy 0.5'; },
  hungry() { state.food = 0.5; return 'food 0.5'; },
  rentDay() { state.clock = (Math.floor(clockNow() / 1440) + 1) * 1440 + 5 * 1440 + 595 - 0; return 'clock -> ' + clockText(); },
  clock() { addMinutes(Math.floor(R() * 600)); return 'clock ' + clockText(); },
  time() { const m = pickA(['live', 'day', 'night']); setTimeMode(m); return 'tmode ' + m; },
  hud() { cycleHud(); return 'hud'; },
  rain() { WEATHER.target = WEATHER.target > 0.5 ? 0 : 1; WEATHER.until = now() + 60; return 'rain ' + WEATHER.target; },
  save() { writeSave(); return 'save'; },
  restore() { const sv = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null'); if (!sv || mode !== 'play') return 'restore skipped'; if (playerVeh) exitVehicle(true); restoreFrom(sv); return 'restore ok'; },
  stuck() { if (mode !== 'play') return 'stuck skipped'; closeOverlays(); stuckMenu(); return 'stuckMenu -> ' + mode; },
  esc() { window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Escape', key: 'Escape' })); window.dispatchEvent(new KeyboardEvent('keyup', { code: 'Escape', key: 'Escape' })); return 'Esc -> ' + mode; },
  keyP() { window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyP', key: 'p' })); window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyP', key: 'p' })); return 'P -> ' + mode; },
  keyE() { window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyE', key: 'e' })); window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyE', key: 'e' })); return 'E-key -> ' + mode; },
  keyM() { window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyM', key: 'm' })); window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyM', key: 'm' })); return 'M -> ' + mode; },
};
window.__inv = () => {
  const bad = [];
  if (!isFinite(P.x) || !isFinite(P.z)) bad.push('P not finite');
  if (!isFinite(camera.position.x) || !isFinite(camera.position.y)) bad.push('camera not finite');
  if (!player.parent) bad.push('player not in scene');
  if (mode === 'play' && player.parent !== scene && !playerVeh) bad.push('player parented to ' + (player.parent && player.parent.type) + ' in play');
  if (mode === 'ride' && ORDER.state !== 'riding') bad.push('ride mode but order ' + ORDER.state);
  if (ORDER.state === 'riding' && mode !== 'ride' && mode !== 'menu' && mode !== 'phone') bad.push('riding but mode ' + mode);
  if (!isFinite(state.cash) || state.cash < 0) bad.push('cash ' + state.cash);
  if (!(state.hp >= 0 && state.hp <= 100.01)) bad.push('hp ' + state.hp);
  if (state.energy !== undefined && !(state.energy >= 0 && state.energy <= 100.01)) bad.push('energy ' + state.energy);
  if (mode === 'play' && !ui.pause.hidden) bad.push('play with pause open');
  if (mode === 'play' && PH.open) bad.push('play with phone open');
  if (mode === 'play' && !$('#menuCard').hidden) bad.push('play with menu open');
  if (mode === 'play' && HOME.inside) bad.push('play while inside home');
  if (HOME.inside && playerVeh) bad.push('inside home with vehicle');
  if (playerVeh && player.parent !== playerVeh.m) bad.push('in vehicle but player not on it');
  if (!walkable(P.x, P.z) && !playerVeh && mode === 'play' && !HOME.inside) bad.push('player on unwalkable ground ' + Math.round(P.x) + ',' + Math.round(P.z));
  return bad;
};
return 1; })()""")
ACTS = [('walk', [['KeyW']]), ('walk', [['KeyW', 'ShiftLeft']]), ('walk', [['KeyA', 'KeyW']]), ('walk', [['KeyS']]), ('stop', []), ('teleport', []), ('teleport', []),
        ('phone', []), ('phoneClick', []), ('phoneClick', []), ('closePh', []), ('pause', []), ('unpause', []), ('npc', []), ('npc', []), ('menuPick', []), ('menuPick', []), ('interact', []), ('interact', []),
        ('rent', []), ('drive', [['KeyW']]), ('drive', [['KeyW', 'KeyD']]), ('drive', [['KeyS', 'Space']]), ('exitVeh', []), ('order', []), ('rideFwd', []), ('rideFwd', []), ('cancel', []),
        ('home', []), ('homeAct', []), ('homeAct', []), ('police', []), ('thief', []), ('tackle', []), ('hurt', []), ('tired', []), ('hungry', []), ('rentDay', []), ('clock', []), ('time', []), ('hud', []),
        ('save', []), ('restore', []), ('stuck', []), ('menuPick', []), ('esc', []), ('keyP', []), ('keyE', []), ('keyM', []), ('rain', [])]
log, problems = [], []
lastEl = G("elapsed"); same = 0
for i in range(STEPS):
    name, args = random.choice(ACTS)
    try:
        r = s.ev("([n, a]) => window.__G.run('window.__soak.' + n + '(...' + JSON.stringify(a) + ')')", [name, args])
    except Exception as e:
        r = 'EXC ' + str(e).split('\n')[0][:300]
    log.append(str(r) + '  | cash=' + str(G('state.cash')) + ' mode=' + str(G('mode')))
    s.wait(random.choice([0.2, 0.5, 1.0]))
    inv = G("window.__inv()")
    errs = G("window.__errs.splice(0).concat((window.__badMoney || []).splice(0), (window.__afcErr || []).splice(0))")
    el = G("elapsed")
    same = same + 1 if el == lastEl else 0
    if same >= 3:
        s.wait(4); el2 = G("elapsed"); s.wait(4); el3 = G("elapsed")
        if el3 == el: inv = inv + ['LOOP FROZE']
        else: same = 0
        el = el3
    lastEl = el
    if inv or errs or str(r).startswith('EXC'):
        problems.append({'step': i, 'last': log[-4:], 'inv': inv, 'errs': errs, 'mode': G("mode")})
        print('PROBLEM', json.dumps(problems[-1])[:1500], flush=True)
        if 'LOOP FROZE' in inv: break
open(SP + '/soaklog_%d.txt' % SEED, 'w').write('\n'.join('%d %s' % (i, l) for i, l in enumerate(log)))
print('steps', len(log), 'problems', len(problems))
print('pageerrors', s.errors[:5])
s.close()
