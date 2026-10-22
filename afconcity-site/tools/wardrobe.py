"""The wardrobe: every top, bottom, hat and hairstyle builds for both bodies (near and far), look codes survive a round trip,
old codes still read the same, and town dresses with real variety (not mostly headscarves)."""
import sys, json
from harness import *
R = []
def check(n, ok, info=''):
    R.append(bool(ok)); print(('PASS ' if ok else 'FAIL ') + n + ('  ' + str(info) if info else ''), flush=True)
s = Session().load(); s.ev("() => { window.__noRender = true; }")
G = s.run
bad = G("""(() => {
  const out = [];
  for (const f of [false, true]) {
    TOPS.forEach((t, ti) => { if (!fitsBody(t, f)) return; const lk = fixLook({ f, s: 2, h: 'short', t: ti, tc: 3, tp: PATS.indexOf(t.pats[0]), b: 1, bc: 0, bp: 0, sh: 0, shc: 0, ht: 0, hc: 0, ey: 0 });
      for (const hi of [true, false]) { try { const g = buildBody(kitLook(0, lk), hi); if (!g.attributes.position.count) out.push('empty top ' + t.id); } catch (e) { out.push('top ' + t.id + ' ' + e.message); } } });
    BOTTOMS.forEach((b, bi) => { if (!fitsBody(b, f) || b.kit) return; const lk = fixLook({ f, s: 2, h: 'short', t: 4, tc: 0, tp: 0, b: bi, bc: 3, bp: PATS.indexOf(b.pats[0]), sh: 1, shc: 0, ht: 0, hc: 0, ey: 0 });
      for (const hi of [true, false]) { try { buildBody(kitLook(0, lk), hi); } catch (e) { out.push('bottom ' + b.id + ' ' + e.message); } } });
    HAIRS.forEach((h) => HATS.forEach((ht, hi2) => { const lk = fixLook({ f, s: 1, h, t: 4, tc: 0, tp: 0, b: 6, bc: 0, bp: 0, sh: 0, shc: 0, ht: hi2, hc: 5, ey: 1 });
      try { buildBody(kitLook(0, lk), true); } catch (e) { out.push('hair ' + h + ' hat ' + ht.id + ' ' + e.message); } }));
  }
  return out;
})()""")
check('every item builds for both bodies, near and far', not bad, bad[:5])
check('new island wear is in the wardrobe', G("['shuka', 'dashiki', 'blazer', 'safari', 'sundress', 'ankara'].every(id => TOPS.some(t => t.id === id)) && ['kikoi', 'joggers', 'cargo'].every(id => BOTTOMS.some(b => b.id === id)) && ['wrap', 'ponytail', 'twists'].every(h => HAIR_PICK.includes(h)) && HATS.some(h => h.id === 'fedora')"))
check('the curated looks include the new styles', G("['Maasai Red', 'Boardroom', 'Dashiki Friday', 'Duku Diva', 'Corporate', 'Sundress', 'Kikoi Coast'].every(n => PRESETS.some(p => p.n === n))"))
rt = G("""(() => { const bad = []; for (const p of PRESETS) { const lk = fixLook(applyPreset({ s: 3, h: 'short' }, p)); const back = lookFrom(lookCode(lk)); if (lookCode(back) !== lookCode(lk)) bad.push(p.n); } return bad; })()""")
check('every curated look survives the look code round trip', not rt, rt)
check('codes from before this update read the same', G("(() => { const l = lookFrom('022.0000100a000'); return l && TOPS[l.t].id === 'jersey' && l.h === 'braids' && SHOES[l.sh].id === 'sneaker'; })()") and G("(() => { const l = lookFrom('137.a340002h311'); return l && TOPS[l.t].id === 'maxi' && l.f && l.h === 'bun' && PATS[l.tp] === 'hibiscus' && HATS[l.ht].id === 'sunhat'; })()"), G("JSON.stringify(lookFrom('137.a340002h311'))"))
check("women's hems stop at the knee or lower", G("(() => { const lk = fixLook({ f: true, s: 2, h: 'bun', t: 4, tc: 0, tp: 0, b: BOTTOMS.findIndex(b => b.id === 'bermuda'), bc: 0, bp: 0, sh: 0, shc: 0, ht: 0, hc: 0, ey: 0 }); const h = makeHuman(kitLook(0, lk)); return h.userData.look.plen <= 0.47 && h.userData.look.plen >= 0.4; })()"))
check('men cannot pick the women-only dresses', G("fixLook({ f: false, s: 2, h: 'short', t: TOPS.findIndex(t => t.id === 'sundress') }).t !== TOPS.findIndex(t => t.id === 'sundress')"))
mix = G("""(() => { let w = 0, sc = 0, wrap = 0, robe = 0, maasai = 0, jacket = 0, n = 400; for (let i = 0; i < n; i++) { const L = randomLook(i + 3); if (L.robeHem) maasai++; else if (L.robe) robe++; if (L.neck === 'jacket') jacket++; if (L.f) { w++; if (L.hair === 'scarf') sc++; if (L.hair === 'wrap') wrap++; } } return { w, scarf: sc / w, wrap, robe, maasai, jacket }; })()""")
check('townswomen: headscarves are common but not most of them', 0.15 < mix['scarf'] < 0.4, mix)
check('town has Maasai, office workers and duku wraps too', mix['maasai'] > 4 and mix['jacket'] > 4 and mix['wrap'] > 4, mix)
check('no page errors', not s.errors, s.errors[:3])
s.close()
print('%d/%d passed' % (sum(R), len(R)))
