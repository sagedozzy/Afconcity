"""Flood-fill the walkable map from the spawn point and check every place the game sends you to."""
from harness import *
s = Session().load(); s.ev("() => { window.__noRender = true; }")
res = s.run(r"""(() => {
  const step = 2, pad = 1.0, x0 = BOUNDS.x0 + 2, x1 = BOUNDS.x1 - 2, z0 = BOUNDS.z0 + 2, z1 = 560;
  const W = Math.ceil((x1 - x0) / step), H = Math.ceil((z1 - z0) / step), free = new Uint8Array(W * H), seen = new Uint8Array(W * H);
  const ok = (x, z) => walkable(x, z) && !pointBlocked(x, z, pad) && !pointInStadiumBowl(x, z);
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) free[j * W + i] = ok(x0 + i * step, z0 + j * step) ? 1 : 0;
  const idx = (x, z) => { const i = Math.round((x - x0) / step), j = Math.round((z - z0) / step); return (i < 0 || j < 0 || i >= W || j >= H) ? -1 : j * W + i; };
  const near = (x, z) => { let b = -1, bd = 1e9; for (let dj = -3; dj <= 3; dj++) for (let di = -3; di <= 3; di++) { const k = idx(x + di * step, z + dj * step); if (k >= 0 && free[k]) { const d = di * di + dj * dj; if (d < bd) { bd = d; b = k; } } } return b; };
  const st = near(START.x, START.z), q = [st]; seen[st] = 1;
  while (q.length) { const k = q.pop(), i = k % W, j = (k - i) / W; for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const ii = i + di, jj = j + dj; if (ii < 0 || jj < 0 || ii >= W || jj >= H) continue; const kk = jj * W + ii; if (free[kk] && !seen[kk]) { seen[kk] = 1; q.push(kk); } } }
  const targets = [];
  for (const n of NPCS) targets.push(['npc ' + n.id, n.ix !== undefined ? n.ix + 4 : n.x, n.ix !== undefined ? n.iz : n.z]);
  for (const s2 of STOPS) targets.push(['stop ' + s2.id, s2.x, s2.z]);
  for (const s2 of SPICE_SPOTS) targets.push(['spice ' + s2.id, s2.x, s2.z]);
  SEAWEED.forEach((s2, i) => targets.push(['weed ' + i, s2.x, s2.z]));
  for (const p of PROJECTS) targets.push(['board ' + p.id, p.x, p.z + 4]);
  TOURISTS.forEach((t, i) => targets.push(['tourist ' + i, t.x, t.z - 2.2]));
  for (const a of AGENTS) targets.push(['agent ' + a.id, a.x + Math.sin(a.ry) * 1.2, a.z + Math.cos(a.ry) * 1.2]);
  targets.push(['truck', CONSTRUCTION.truck.x + 5.5, CONSTRUCTION.truck.z], ['mixer', CONSTRUCTION.mixer.x + 2.4, CONSTRUCTION.mixer.z], ['pier end', PIER.x, PIER.z1 - 4], ['race start', RACE_START.x, RACE_START.z], ['pitch', (PITCH.x0 + PITCH.x1) / 2, PITCH.z], ['bus door', DALA.v.x, DALA.v.z - 2.5]);
  for (const b of BOARDS) { const v = boardView(b); targets.push(['view ' + b.id, v.px, v.pz]); }
  for (const r of rentals) targets.push(['rental ' + r.stand.id + ' ' + r.kind, r.x + 1.5, r.z]);
  const bad = [];
  for (const [n, x, z] of targets) { const k = near(x, z); if (k < 0 || !seen[k]) bad.push([n, Math.round(x), Math.round(z), k < 0 ? 'no free cell' : 'unreachable']); }
  return { targets: targets.length, bad };
})()""")
print(res)
print('errors', s.errors[:3])
s.close()
