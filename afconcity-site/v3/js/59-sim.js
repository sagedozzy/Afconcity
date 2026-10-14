/* ===================== 59 sim: order a ride to where you stand, talk to anyone, more work, shopfronts and radio ads ===================== */

/* ---------- road routing on the traffic graph ---------- */
function navNearestEdge(x, z, box) {
  let best = null, bd = 1e9; box = box || 500;
  for (let i = 0; i < NAV.nodes.length; i++) {
    const A = NAV.nodes[i]; if (!navOk(i) || Math.abs(A.x - x) > box || Math.abs(A.z - z) > box) continue;
    for (const e of A.adj) {
      if (e.to < i || !navOk(e.to)) continue;
      const B = NAV.nodes[e.to], dx = B.x - A.x, dz = B.z - A.z, l2 = dx * dx + dz * dz || 1, t = clamp(((x - A.x) * dx + (z - A.z) * dz) / l2, 0, 1), px = A.x + dx * t, pz = A.z + dz * t, d = Math.hypot(px - x, pz - z);
      if (d < bd) { bd = d; best = { a: i, b: e.to, t, x: px, z: pz, d, len: e.len, c: e.c }; }
    }
  }
  return best || (box < 4000 ? navNearestEdge(x, z, 4000) : null);
}
function navDijkstra(seeds) {
  const N = NAV.nodes.length, dist = new Float64Array(N).fill(Infinity), prev = new Int32Array(N).fill(-1), heap = [];
  const push = (d, i) => { heap.push([d, i]); let k = heap.length - 1; while (k > 0) { const p = (k - 1) >> 1; if (heap[p][0] <= heap[k][0]) break; const q = heap[p]; heap[p] = heap[k]; heap[k] = q; k = p; } };
  const pop = () => { const top = heap[0], last = heap.pop(); if (heap.length) { heap[0] = last; let k = 0; for (;;) { const l = 2 * k + 1, r = l + 1; let m = k; if (l < heap.length && heap[l][0] < heap[m][0]) m = l; if (r < heap.length && heap[r][0] < heap[m][0]) m = r; if (m === k) break; const q = heap[m]; heap[m] = heap[k]; heap[k] = q; k = m; } } return top; };
  for (const [i, d] of seeds) if (d < dist[i]) { dist[i] = d; push(d, i); }
  while (heap.length) { const [d, i] = pop(); if (d > dist[i]) continue; for (const e of NAV.nodes[i].adj) { if (!navOk(e.to)) continue; const nd = d + e.len; if (nd < dist[e.to]) { dist[e.to] = nd; prev[e.to] = i; push(nd, e.to); } } }
  return { dist, prev };
}
const edgeSeeds = (E) => [[E.a, E.t * E.len], [E.b, (1 - E.t) * E.len]];
/* chain of nodes from node i back to a seed, following prev */
function chainBack(prev, i) { const out = []; let k = i, guard = 0; while (k !== -1 && guard++ < 5000) { out.push(k); k = prev[k]; } return out; }
/* route between two road points: a polyline and its length */
function navRoute(E1, E2) {
  if ((E1.a === E2.a && E1.b === E2.b) || (E1.a === E2.b && E1.b === E2.a)) return { pts: [[E1.x, E1.z], [E2.x, E2.z]], L: Math.hypot(E2.x - E1.x, E2.z - E1.z) };
  const D = navDijkstra(edgeSeeds(E1));
  const va = D.dist[E2.a] + E2.t * E2.len, vb = D.dist[E2.b] + (1 - E2.t) * E2.len;
  const end = va <= vb ? E2.a : E2.b, L = Math.min(va, vb);
  if (!isFinite(L)) return null;
  const nodes = chainBack(D.prev, end).reverse();
  const pts = [[E1.x, E1.z]]; for (const i of nodes) pts.push([NAV.nodes[i].x, NAV.nodes[i].z]); pts.push([E2.x, E2.z]);
  return { pts, L };
}
/* a path for a driver to come from a few hundred metres away to the pickup point */
function navApproach(E, minD, maxD) {
  const D = navDijkstra(edgeSeeds(E)), cand = [];
  for (let i = 0; i < NAV.nodes.length; i++) { const d = D.dist[i]; if (d >= minD && d <= maxD && navOk(i)) { const n = NAV.nodes[i]; if (n.x > BOUNDS.x0 && n.x < BOUNDS.x1 && n.z > BOUNDS.z0) cand.push(i); } }
  if (!cand.length) { for (let i = 0; i < NAV.nodes.length; i++) if (isFinite(D.dist[i]) && D.dist[i] > 40) cand.push(i); }
  if (!cand.length) return { pts: [[E.x - 30, E.z], [E.x, E.z]], L: 30 };
  const s = cand[Math.floor(rnd() * cand.length)], nodes = chainBack(D.prev, s);
  const pts = nodes.map(i => [NAV.nodes[i].x, NAV.nodes[i].z]); pts.push([E.x, E.z]);
  let L = 0; for (let i = 1; i < pts.length; i++) L += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
  return { pts, L };
}
/* a vehicle that follows a polyline, keeping to the left lane */
function pathRunner(pts, road) {
  const cum = [0]; for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  return { pts, cum, L: cum[cum.length - 1], s: 0, speed: 0, road: road || null };
}
function runnerAt(R, s) {
  const { pts, cum } = R; let i = 1; while (i < pts.length - 1 && cum[i] < s) i++;
  const a = pts[i - 1], b = pts[i], L = (cum[i] - cum[i - 1]) || 1, t = clamp((s - cum[i - 1]) / L, 0, 1), dx = (b[0] - a[0]) / L, dz = (b[1] - a[1]) / L;
  return { x: a[0] + (b[0] - a[0]) * t, z: a[1] + (b[1] - a[1]) * t, dx, dz, i };
}
/* off-road leg: grid A* over open ground (no buildings, water or stadium bowl), then pulled tight */
function offroadOk(x, z) { return walkable(x, z) && !pointBlocked(x, z, 1.1) && !pointInStadiumBowl(x, z); }
function offroadLine(ax, az, bx, bz) { const L = Math.hypot(bx - ax, bz - az), n = Math.ceil(L / 1.2); for (let i = 1; i < n; i++) { const t = i / n; if (!offroadOk(ax + (bx - ax) * t, az + (bz - az) * t)) return false; } return true; }
function offroadPath(ax, az, bx, bz) {
  if (offroadLine(ax, az, bx, bz)) return [[ax, az], [bx, bz]];
  const S = 2.5, pad = 70, x0 = Math.min(ax, bx) - pad, z0 = Math.min(az, bz) - pad, W = Math.ceil((Math.max(ax, bx) + pad - x0) / S), H = Math.ceil((Math.max(az, bz) + pad - z0) / S);
  if (W * H > 90000) return null;
  const idx = (x, z) => clamp(Math.round((z - z0) / S), 0, H - 1) * W + clamp(Math.round((x - x0) / S), 0, W - 1);
  const s0 = idx(ax, az), g0 = idx(bx, bz), gx = g0 % W, gz = (g0 / W) | 0;
  const open = new Int8Array(W * H) /* 0 unknown, 1 ok, 2 blocked */, g = new Float32Array(W * H).fill(Infinity), prev = new Int32Array(W * H).fill(-1), heap = [];
  const pass = (i) => { if (i === s0 || i === g0) return true; if (!open[i]) open[i] = offroadOk(x0 + (i % W) * S, z0 + ((i / W) | 0) * S) ? 1 : 2; return open[i] === 1; };
  const hcost = (i) => Math.hypot((i % W) - gx, ((i / W) | 0) - gz) * S;
  const push = (f, i) => { heap.push([f, i]); let k = heap.length - 1; while (k > 0) { const q = (k - 1) >> 1; if (heap[q][0] <= heap[k][0]) break; [heap[q], heap[k]] = [heap[k], heap[q]]; k = q; } };
  const pop = () => { const top = heap[0], last = heap.pop(); if (heap.length) { heap[0] = last; let k = 0; for (;;) { const l = 2 * k + 1, r = l + 1; let m = k; if (l < heap.length && heap[l][0] < heap[m][0]) m = l; if (r < heap.length && heap[r][0] < heap[m][0]) m = r; if (m === k) break; [heap[m], heap[k]] = [heap[k], heap[m]]; k = m; } } return top; };
  g[s0] = 0; push(hcost(s0), s0); let found = false, guard = 0;
  while (heap.length && guard++ < 120000) {
    const [, i] = pop(); if (i === g0) { found = true; break; }
    const cx = i % W, cz = (i / W) | 0;
    for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) {
      if (!dx && !dz) continue; const nx = cx + dx, nz = cz + dz; if (nx < 0 || nz < 0 || nx >= W || nz >= H) continue;
      const j = nz * W + nx; if (!pass(j)) continue; if (dx && dz && (!pass(cz * W + nx) || !pass(nz * W + cx))) continue;
      const ng = g[i] + (dx && dz ? 1.4142 : 1) * S; if (ng < g[j]) { g[j] = ng; prev[j] = i; push(ng + hcost(j), j); }
    }
  }
  if (!found) return null;
  const cells = []; for (let k = g0, n = 0; k !== -1 && n < 100000; k = prev[k], n++) cells.push(k); cells.reverse();
  const raw = cells.map(i => [x0 + (i % W) * S, z0 + ((i / W) | 0) * S]); raw[0] = [ax, az]; raw[raw.length - 1] = [bx, bz];
  const out = [raw[0]]; let a = 0;
  while (a < raw.length - 1) { let b = raw.length - 1; while (b > a + 1 && !offroadLine(raw[a][0], raw[a][1], raw[b][0], raw[b][1])) b--; out.push(raw[b]); a = b; }
  return out;
}
const polyLen = (pts) => { let L = 0; for (let i = 1; i < pts.length; i++) L += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); return L; };
function runnerTurn(R, s) { const p = runnerAt(R, s), q = runnerAt(R, Math.min(R.L, s + 14)); return Math.abs(angWrap(Math.atan2(q.dx, q.dz) - Math.atan2(p.dx, p.dz))); }

/* ---------- order a boda, bajaji or daladala to come to you ---------- */
const RIDE_KINDS = {
  boda: { name: 'Boda boda', sw: 'Boda', base: 1500, perKm: 1000, min: 2000, sp: 12, cols: [0xd23a2a, 0x15161c, 0x1f5fbf, 0xf3b41b], colN: ['red', 'black', 'blue', 'yellow'], note: 'A motorbike taxi. Quick through traffic; the rider brings a helmet.' },
  bajaji: { name: 'Bajaji', sw: 'Bajaji', base: 2500, perKm: 1500, min: 3000, sp: 9.5, cols: [0x1f5fbf, 0xd23a2a, 0xf3b41b, 0x1e9b57], colN: ['blue', 'red', 'yellow', 'green'], note: 'A three-wheeler with a roof: dry in the rain, room for three.' },
  daladala: { name: 'Daladala (private hire)', sw: 'Daladala', base: 20000, perKm: 3000, min: 20000, sp: 10, cols: [0xf3b41b, 0x1e9b57, 0xd8452c], colN: ['yellow', 'green', 'red'], note: 'Hire a whole daladala, konda and all: the price of every seat.' },
};
CONTACTS.usafiri = { name: 'Usafiri · rides', col: '#c98a00', ini: 'U' };
const DRIVER_NAMES = ['Hamza', 'Abdallah', 'Said', 'Khamis', 'Faki', 'Makame', 'Ussi', 'Haji', 'Mussa', 'Suleiman', 'Bakari', 'Mwinyi'];
const ORDER = { state: '', kind: '', v: null, ride: null, pick: null, dest: null, route: null, fare: 0, name: '', col: '', waitT: 0, prevMode: 'play' };
/* where the driver meets you: the nearest road, or right where you stand if you are stuck far from one (boda and bajaji only) */
function pickupFor(kind, at) {
  const E1 = navNearestEdge(at.x, at.z); if (!E1) return null;
  const off = Math.hypot(E1.x - at.x, E1.z - at.z);
  const spot = kind !== 'daladala' && off > 12 ? findClear(at.x, at.z, 0.9, false) : null;
  const leg = spot ? (offroadPath(E1.x, E1.z, spot.x, spot.z) || [[E1.x, E1.z], [spot.x, spot.z]]) : null;
  return { E1, spot, leg, off: leg ? polyLen(leg) : 0 };
}
/* the last stretch from the road to the door: boda and bajaji ride it, a daladala leaves you to walk */
const dropCache = new Map();
function dropLeg(kind, E2, dest) {
  const gap = Math.hypot(E2.x - dest.x, E2.z - dest.z);
  if (gap < 10 || kind === 'daladala') return null;
  const key = `${dest.id || ''}:${Math.round(dest.x)},${Math.round(dest.z)}`;
  if (dropCache.has(key)) return dropCache.get(key);
  const to = findClear(dest.x, dest.z, 1.1, false), leg = offroadPath(E2.x, E2.z, to.x, to.z);
  const res = leg && polyLen(leg) < gap * 3 + 60 ? leg : null;
  dropCache.set(key, res); return res;
}
function rideQuoteFrom(kind, pu, dest) {
  const E2 = navNearestEdge(dest.x, dest.z); if (!pu || !E2) return null;
  const route = navRoute(pu.E1, E2); if (!route) return null;
  const roadL = route.L;
  if (pu.leg) { route.pts.shift(); route.pts.unshift(...pu.leg.slice().reverse()); route.L += pu.off; }
  route.road = [pu.leg ? pu.off : 0, (pu.leg ? pu.off : 0) + roadL];
  const leg = dropLeg(kind, E2, dest);
  if (leg) { route.pts.pop(); route.pts.push(...leg); route.L += polyLen(leg); }
  const K = RIDE_KINDS[kind];
  return { E1: pu.E1, E2, route, walk: leg ? 0 : Math.round(Math.hypot(E2.x - dest.x, E2.z - dest.z)), fare: Math.max(K.min, roundTo(K.base + K.perKm * route.L / 1000, 500)), mins: Math.max(2, Math.round(route.L / K.sp / 60 * 1.1 + 1)) };
}
function rideQuote(kind, dest) { return rideQuoteFrom(kind, pickupFor(kind, { x: P.x, z: P.z }), dest); }
const RIDE_BLOCK_JOBS = ['dala', 'taxi', 'race', 'match'];
/* order a ride; with no destination the driver asks where to go when you get on */
function orderRide(kind, dest) {
  if (ORDER.state) { help('You already have a ride on the way. Cancel it in Usafiri first.', 3000); sfx.deny(); return false; }
  if (POLICE.on) { help('No rider will come while the police are after you.', 3000); sfx.deny(); return false; }
  if (job && RIDE_BLOCK_JOBS.includes(job.type)) { help('Finish or quit your job before you order a ride.', 3000); sfx.deny(); return false; }
  if (playerVeh) { if (Math.abs(playerVeh.vf) > 3) { help('Stop first.', 2000); sfx.deny(); return false; } exitVehicle(true); }
  const K = RIDE_KINDS[kind];
  const at = HOME.inside && myDoor() ? { x: myDoor().ox, z: myDoor().oz } : { x: P.x, z: P.z };
  const pu = pickupFor(kind, at); if (!pu) { help('No road anywhere near. Try "I\'m stuck" in the menu.', 2600); sfx.deny(); return false; }
  let q = null;
  if (dest) { q = rideQuoteFrom(kind, pu, dest); if (!q) { help('No road route found from here.', 2600); sfx.deny(); return false; } if (!canPay(q.fare)) { help(`You need ${tsh(q.fare)} for this ride.`, 2600); sfx.deny(); return false; } }
  else if (!canPay(K.min)) { help(`You need at least ${tsh(K.min)} for a ${K.sw.toLowerCase()}.`, 2600); sfx.deny(); return false; }
  const ci = Math.floor(rnd() * K.cols.length), app = navApproach(pu.E1, kind === 'daladala' ? 260 : 180, kind === 'daladala' ? 520 : 420);
  app.road = [0, app.L]; if (pu.leg) { app.pts.pop(); app.pts.push(...pu.leg); app.L += pu.off; }
  const m = makeVehicle(kind, K.cols[ci]); scene.add(m);
  const driver = makeHuman(randomLook(50 + Math.floor(rnd() * 400))); m.add(driver); const st = VEH[kind].seat; driver.position.set(st[0], st[1], st[2]);
  const R = pathRunner(app.pts, app.road), p0 = runnerAt(R, 0);
  const v = { kind, m, driver, R, x: p0.x, z: p0.z, yaw: Math.atan2(p0.dx, p0.dz), vf: 0 };
  Object.assign(ORDER, { state: 'coming', kind, v, ride: null, pu, pick: pu.spot ? { x: pu.spot.x, z: pu.spot.z } : { x: pu.E1.x, z: pu.E1.z }, dest: dest || null, route: q ? q.route : null, walk: q ? q.walk : 0, fare: q ? q.fare : 0, mins: q ? q.mins : 0, name: pick(DRIVER_NAMES), col: K.colN[ci], waitT: 150 });
  m.position.set(v.x, 0.04, v.z); m.rotation.y = v.yaw;
  const eta = Math.round(app.L / K.sp + 6);
  phoneMsg('usafiri', `${ORDER.name} is coming on a ${ORDER.col} ${K.sw.toLowerCase()} · about ${fmtClock(eta)} away. ${dest ? `Fare to ${dest.name}: ${tsh(q.fare)}, paid when you arrive.` : 'Tell the driver where to go when you get on.'}`);
  state.stats.orders = (state.stats.orders || 0) + 1;
  if (PH.open) closePhone();
  if (HOME.inside) leaveHome();
  const d0 = Math.hypot(ORDER.pick.x - P.x, ORDER.pick.z - P.z);
  help(pu.spot ? `${escapeHtml(ORDER.name)} is riding off the road to find you. Stay where you are.` : d0 > 12 ? `${escapeHtml(ORDER.name)} will stop on the road: walk to the <b class="hl">yellow marker</b>.` : `${escapeHtml(ORDER.name)} is on the way. Wait by the road.`, 4500);
  return true;
}
/* picked up without a destination: the driver asks "Twende wapi?" */
function askDestination() {
  const K = RIDE_KINDS[ORDER.kind], items = [];
  for (const sp of rideSpots()) {
    if (Math.hypot(sp.x - P.x, sp.z - P.z) < 60) continue;
    const q = rideQuoteFrom(ORDER.kind, ORDER.pu, sp); if (!q) continue;
    items.push({ label: sp.name, desc: `${(q.route.L / 1000).toFixed(1)} km · about ${q.mins} min · pay on arrival`, price: q.fare, noCharge: true, act: () => { Object.assign(ORDER, { dest: sp, route: q.route, walk: q.walk, fare: q.fare, mins: q.mins }); boardRide(); } });
  }
  openMenu({ eyebrow: `${K.sw} · ${ORDER.name}`, title: '"Twende wapi?"', lede: `Where to? ${ORDER.name} drives you along the road and you pay at the end.`, items, close: 'Not yet' });
}
function cancelOrder(msg) {
  if (!ORDER.state) return;
  if (ORDER.state === 'riding') return;
  removeRideVehicle(); ORDER.state = '';
  if (msg) phoneMsg('usafiri', msg);
}
function removeRideVehicle() { const v = ORDER.v; if (v) { scene.remove(v.m); ORDER.v = null; } }
function stepRunner(v, dt, top) {
  const R = v.R, left = R.L - R.s, onRoad = !R.road || (R.s >= R.road[0] - 2 && R.s <= R.road[1] + 2);
  let target = onRoad ? top : Math.min(top, 5.5);
  if (left < 30) target = Math.min(target, Math.max(0.8, left * 0.45));
  if (runnerTurn(R, R.s) > 0.6) target = Math.min(target, onRoad ? 5.5 : 3.5);
  for (const c of cars) { const dx = c.x - v.x, dz = c.z - v.z; if (dx * dx + dz * dz < 64 && dx * Math.sin(v.yaw) + dz * Math.cos(v.yaw) > 1.5) { target = Math.min(target, 1.5); break; } }
  R.speed = damp(R.speed, target, target < R.speed ? 3 : 1.4, dt);
  R.s = Math.min(R.L, R.s + R.speed * dt);
  /* keep left on the road, ride the centre line off it; ease between the two */
  if (v.lane === undefined) v.lane = onRoad ? 1.7 : 0;
  v.lane = damp(v.lane, onRoad ? 1.7 : 0, 1.6, dt);
  const off = (q) => [q.x + q.dz * v.lane, q.z - q.dx * v.lane];
  const [px, pz] = off(runnerAt(R, R.s));
  /* look ahead and turn toward that point, so corners are smooth arcs instead of snaps */
  const look = clamp(2 + R.speed * 0.45, 2, onRoad ? 7 : 3.5), [cx, cz] = off(runnerAt(R, Math.min(R.L, R.s + look)));
  const y0 = v.yaw;
  v.x = damp(v.x, px, 5, dt); v.z = damp(v.z, pz, 5, dt);
  if (R.speed > 0.3 && Math.hypot(cx - v.x, cz - v.z) > 0.3) v.yaw = angDamp(v.yaw, Math.atan2(cx - v.x, cz - v.z), 6, dt);
  v.vf = R.speed;
  v.m.position.set(v.x, 0.04, v.z); v.m.rotation.y = v.yaw;
  if (v.kind === 'boda') { const yr = dt > 0 ? angWrap(v.yaw - y0) / dt : 0; v.lean = damp(v.lean || 0, clamp(-yr * R.speed / 9.8, -0.4, 0.4), 6, dt); v.m.rotation.z = v.lean; }
  for (const w of v.m.userData.wheels || []) w.g.rotation.x += R.speed * dt / w.r;
  return R.L - R.s < 0.4;
}
function boardRide() {
  if (ORDER.state !== 'waiting' || playerVeh || (mode !== 'play' && mode !== 'menu')) return;
  if (!ORDER.dest) { askDestination(); return; }
  if (mode === 'menu') closeMenu();
  const v = ORDER.v, K = RIDE_KINDS[ORDER.kind];
  v.R = pathRunner(ORDER.route.pts, ORDER.route.road); v.R.s = 0;
  ORDER.state = 'riding'; mode = 'ride'; keys.clear(); speed = 0;
  scene.remove(player); v.m.add(player); const ps = VEH[ORDER.kind].pass; player.position.set(ps[0], ps[1], ps[2]); player.rotation.set(0, 0, 0);
  ORDER.pose = ORDER.kind === 'boda' ? 'pass' : 'sit';
  cam.yaw = v.yaw + Math.PI; cam.pitch = 0.22; cam.lastLook = -99;
  if (document.pointerLockElement) document.exitPointerLock();
  sfx.horn(0); help(`${escapeHtml(ORDER.name)}: "Twende!" On the ${K.sw.toLowerCase()} to <b class="hl">${escapeHtml(ORDER.dest.name)}</b>. Press <kbd>E</kbd> to skip ahead.`, 4500);
  if (RT.wp && Math.hypot(RT.wp.x - ORDER.dest.x, RT.wp.z - ORDER.dest.z) < 60) RT.wp = null;
}
function skipRide() {
  if (ORDER.state !== 'riding') return;
  const v = ORDER.v, K = RIDE_KINDS[ORDER.kind], left = v.R.L - v.R.s;
  addMinutes(Math.round(left / K.sp / 60));
  v.R.s = v.R.L; const p = runnerAt(v.R, v.R.L), ln = v.lane || 0; v.x = p.x + p.dz * ln; v.z = p.z - p.dx * ln; v.yaw = Math.atan2(p.dx, p.dz); v.m.position.set(v.x, 0.04, v.z); v.m.rotation.y = v.yaw;
  dropOff();
}
function dropOff() {
  const v = ORDER.v, K = RIDE_KINDS[ORDER.kind];
  scene.add(player);
  const side = safeSpot(v.x + Math.cos(v.yaw) * 1.9, v.z - Math.sin(v.yaw) * 1.9);
  P.x = side.x; P.z = side.z; player.position.set(P.x, groundY(P.x, P.z), P.z); player.rotation.y = v.yaw; cam.yaw = v.yaw + Math.PI;
  if (mode === 'phone') PH.prev = 'play'; else mode = 'play';
  speed = 0;
  const paid = spend(Math.min(ORDER.fare, money()), `${K.sw} fare`);
  phoneMsg('usafiri', `You arrived at ${ORDER.dest.name}. ${tsh(paid)} paid to ${ORDER.name}. Asante, safari njema!`);
  state.stats.rides = (state.stats.rides || 0) + 1;
  ORDER.state = 'leaving'; ORDER.leaveT = 4;
  if (ORDER.dest.home) { const d = myDoor(); if (d) { P.x = d.ox; P.z = d.oz; player.position.set(P.x, groundY(P.x, P.z), P.z); player.rotation.y = d.ry + Math.PI; } }
  else if (Math.hypot(ORDER.dest.x - P.x, ORDER.dest.z - P.z) > 15) { RT.wp = { x: ORDER.dest.x, z: ORDER.dest.z, label: ORDER.dest.name }; help(`${escapeHtml(ORDER.name)}: "Fika hapa, the road ends here." Walk the last ${Math.round(Math.hypot(ORDER.dest.x - P.x, ORDER.dest.z - P.z))} m: GPS is set to <b class="hl">${escapeHtml(ORDER.dest.name)}</b>.`, 5000); }
  canvas.focus();
}
function updateOrder(dt, t) {
  const v = ORDER.v; if (!ORDER.state || !v) return;
  const K = RIDE_KINDS[ORDER.kind];
  if (ORDER.state === 'coming') {
    if (stepRunner(v, dt, K.sp)) { ORDER.state = 'waiting'; v.R.speed = 0; sfx.horn(Math.hypot(v.x - P.x, v.z - P.z) * 0.3); phoneMsg('usafiri', `${ORDER.name} is here on the ${ORDER.col} ${K.sw.toLowerCase()}. Walk up and press E to get on.`); }
  } else if (ORDER.state === 'waiting') {
    ORDER.waitT -= dt;
    if (ORDER.waitT <= 0) cancelOrder(`${ORDER.name} waited and left for another customer. Order again any time.`);
  } else if (ORDER.state === 'riding') {
    const done = stepRunner(v, dt, K.sp); P.x = v.x; P.z = v.z;
    if (done) dropOff();
  } else if (ORDER.state === 'leaving') {
    { const nx = v.m.position.x + Math.sin(v.yaw) * dt * 5, nz = v.m.position.z + Math.cos(v.yaw) * dt * 5; if (offroadOk(nx + Math.sin(v.yaw) * 1.5, nz + Math.cos(v.yaw) * 1.5)) v.m.position.set(nx, 0.04, nz); } v.m.rotation.z = 0; ORDER.leaveT -= dt;
    if (ORDER.leaveT <= 0) { removeRideVehicle(); ORDER.state = ''; }
  }
  if (ORDER.v && Math.abs(ORDER.v.x - camera.position.x) < 200) animHuman(ORDER.v.driver, dt, t, 0, VEH[ORDER.kind].pose);
}
function orderGoal() {
  if (!ORDER.state || ORDER.state === 'leaving') return null;
  const K = RIDE_KINDS[ORDER.kind], v = ORDER.v;
  if (ORDER.state === 'coming') return { tag: 'Usafiri', title: `${ORDER.name} is on the way`, desc: `${ORDER.col[0].toUpperCase() + ORDER.col.slice(1)} ${K.sw.toLowerCase()} · ${fmtClock((v.R.L - v.R.s) / K.sp + 3)} away. Wait at the yellow marker.` };
  if (ORDER.state === 'waiting') return { tag: 'Usafiri', title: `${ORDER.name} is waiting`, desc: `Walk to the ${K.sw.toLowerCase()} and press E. Leaves in ${fmtClock(ORDER.waitT)}.` };
  if (!ORDER.dest) return null;
  return { tag: 'Ride', title: `To ${ORDER.dest.name}`, desc: `${((v.R.L - v.R.s) / 1000).toFixed(1)} km to go · ${tsh(ORDER.fare)} on arrival. Press E to skip ahead.` };
}

/* ---------- talk to anyone on the street ---------- */
const WALKER_NAMES = ['Zuhura', 'Rashidi', 'Mwanahawa', 'Salum', 'Fatma', 'Ameir', 'Asha', 'Khamis', 'Rehema', 'Hamad', 'Mwanaisha', 'Juma', 'Zainab', 'Othman', 'Mariam', 'Vuai', 'Halima', 'Issa', 'Saada', 'Abdul', 'Tatu', 'Ali', 'Mwajuma', 'Bakari'];
const SMALL_TALK = [
  'Busy day! The price of sugar went up again at the market.', 'My son plays for the Fumba under-15s. He wants to be the next Samatta.', 'They say AfconCity will be finished before the opener. Inshallah!',
  'The rain this morning flooded the road by the junction. Pole sana for anyone on a boda.', 'Have you tried the urojo at the Usiku market? Mama Ashura makes the best.', 'I work at the seaweed co-op. Hard on the back, but the money is honest.',
  'The tourists pay TSh 3,500 for a madafu on the beach. Good business if you have legs!', 'Watch your pockets near the beach bar. The boys in red caps are quick.', 'My cousin drives a bajaji. He says the race on Fumba Road pays very well.',
  'Pole pole ndio mwendo: slowly, slowly is the way. But not when the daladala is leaving!', 'Electricity was off last night. Thank God for the cool breeze from the sea.', 'The Burj tower is made of wood, can you believe it? They say it will stand for a hundred years.',
];
const GREETINGS = ['Mambo!', 'Jambo!', 'Habari!', 'Salama!', 'Shikamoo!'];
const REPLIES = ['Poa! Karibu Fumba.', 'Safi sana! You are a fan for AFCON?', 'Marahaba! Welcome, welcome.', 'Nzuri! Where are you from?', 'Salama! The weather is good today.'];
const ERRAND_ITEMS = ['a bag of mangoes', 'my phone charger', 'school books for my daughter', 'a kanga for my sister', 'fresh mkate wa kumimina', 'a tin of cooking oil', 'a parcel from Dar', 'a thermos of chai'];
function walkerName(w) { return WALKER_NAMES[walkers.indexOf(w) % WALKER_NAMES.length]; }
function walkerNear(r) { let best = null, bd = r; for (const w of walkers) { if (isDown(w.h) || !w.h.visible) continue; const d = Math.hypot(w.x - P.x, w.z - P.z); if (d < bd) { bd = d; best = w; } } return best; }
function placesForAsking() { return rideSpots().filter(s => !s.home); }
function talkWalker(w, line) {
  const name = walkerName(w); w.pause = 9; w.h.rotation.y = Math.atan2(P.x - w.x, P.z - w.z); w.h.userData.lookAt = playerHead;
  if (!line) playEmote(w.h, 'wave');
  const day = clockDay();
  if (w.jobDay !== day) { w.jobDay = day; w.gig = rnd() < 0.55 ? (() => { const sp = pick(placesForAsking().filter(s => Math.hypot(s.x - w.x, s.z - w.z) > 150) || placesForAsking()); const d = sp ? Math.hypot(sp.x - w.x, sp.z - w.z) : 300; return sp ? { sp, item: pick(ERRAND_ITEMS), pay: roundTo(Math.min(15000, 3000 + d * 7), 500) } : null; })() : null; }
  const items = [
    { label: 'Habari za leo? · How is your day?', desc: 'Small talk', price: 'Chat', act: () => setTimeout(() => talkWalker(w, `"${pick(SMALL_TALK)}"`), 30) },
    { label: 'Uliza njia · Ask the way', desc: 'They point you there and you get a GPS marker', price: 'Ask', act: () => setTimeout(() => askWay(w), 30) },
    { label: 'Una kazi? · Any small job?', desc: w.gig === 'done' ? 'You already helped today' : 'People pay for errands', price: 'Ask', disabled: w.gig === 'done', act: () => setTimeout(() => askGig(w), 30) },
  ];
  openMenu({ eyebrow: 'On the street · say hello', title: name, lede: line || `${pick(GREETINGS)} "${pick(REPLIES)}"`, items, close: 'Kwaheri · Goodbye' });
  state.stats.chats = (state.stats.chats || 0) + 1;
}
function askWay(w) {
  const name = walkerName(w);
  const items = placesForAsking().map(sp => ({ label: sp.name, desc: `${Math.round(Math.hypot(sp.x - P.x, sp.z - P.z))} m`, price: 'GPS', act: () => { RT.wp = { x: sp.x, z: sp.z, label: sp.name }; playEmote(w.h, 'point'); help(`${escapeHtml(name)}: "${pick(['Fuata barabara hii, moja kwa moja.', 'Pita pale kwenye mnazi, kisha kulia.', 'Si mbali! Tembea dakika chache tu.'])}" (GPS set: <b class="hl">${escapeHtml(sp.name)}</b>)`, 5000); } }));
  openMenu({ eyebrow: 'Asking the way', title: name, lede: '"Unataka kwenda wapi?" Where do you want to go?', items, close: 'Never mind' });
}
function askGig(w) {
  const name = walkerName(w), g = w.gig;
  if (!g || g === 'done') { talkWalker(w, `"${pick(['Hapana, samahani. Not today.', 'Ask the fundi at the mall site, he always needs hands.', 'No work, but Mzee Omari needs daladala drivers!'])}"`); return; }
  if (job) { talkWalker(w, '"You look busy already. Come back when you are free!"'); return; }
  openMenu({ eyebrow: 'A small job', title: name, lede: `"Can you take ${g.item} to ${g.sp.name}? I will send you ${tsh(g.pay)} by Pesa when it arrives."`, items: [
    { label: 'Ndiyo · Yes, I will take it', desc: `${Math.round(Math.hypot(g.sp.x - P.x, g.sp.z - P.z))} m away`, price: 'Earn', act: () => startErrand(w, g) },
  ], close: 'Not now' });
}
function startErrand(w, g) {
  const d = Math.hypot(g.sp.x - P.x, g.sp.z - P.z);
  job = { type: 'errand', title: `Errand for ${walkerName(w)}`, desc: `Take ${g.item} to ${g.sp.name}.`, x: g.sp.x, z: g.sp.z, t0: now(), limit: Math.round(d / 2.6 + 70), pay: g.pay, who: walkerName(w) };
  w.gig = 'done'; sfx.start(); splash('KAZI NDOGO', `To ${g.sp.name}`, 'gold');
}

/* ---------- more people with work ---------- */
NPCS.push(
  { id: 'rashid', name: 'Fundi Rashid', role: 'Car wash · Fumba junction', x: 24, z: -136, ry: 0, look: { skin: 0x3d2416, shirt: 0x1f8fd0, lower: 0x2a2d33, pants: true, hair: 'short', style: 'tee', shoes: 0x1d1d22, sandals: true } },
  { id: 'hassan', name: 'Hassan', role: 'Tour guide · Uptown Gate', x: START.x - 14, z: START.z - 9, ry: 0, look: { skin: 0x553320, shirt: 0xf6f1e7, lower: 0xd8cfc0, pants: true, hair: 'kofia', kofiaCol: 0x1e9b57, style: 'button', shoes: 0x7a4a2a, sandals: true } },
  { id: 'mwajuma', name: 'Bi Mwajuma', role: 'Vegetable stall · Usiku market', x: MARKET.x - 16, z: MARKET.z + 8, ry: Math.PI / 2, look: { skin: 0x4f2f1c, shirt: 0x1e9b57, lower: 0x141838, dress: 0xf3b41b, hair: 'scarf', scarf: 0x1e9b57, f: true, sandals: true, shoes: 0x7a4a2a, style: 'kanga', trim: 0xe0553a, trim2: 0x141838, long: true } },
);
for (const n of NPCS) NPC_BY_ID[n.id] = n;
Object.assign(PAY, { wash: 20000, tour: 30000, tourTip: 15000, porter: 18000 });
function findClear(x, z, r, avoidRoad) {
  const ok = (a, b) => walkable(a, b) && !pointBlocked(a, b, r) && (!avoidRoad || !nearRoad(a, b, 1.5));
  if (ok(x, z)) return { x, z };
  for (let d = 1; d < 60; d += 1) for (let k = 0; k < 16; k++) { const a = k / 16 * TAU, px = x + Math.cos(a) * d, pz = z + Math.sin(a) * d; if (ok(px, pz)) return { x: px, z: pz }; }
  return { x, z };
}
/* move the new people onto clear ground before they are built */
function prepSimNPCs() {
  for (const id of ['rashid', 'hassan', 'mwajuma']) { const n = NPC_BY_ID[id], p = findClear(n.x, n.z, 1.2, true); n.x = p.x; n.z = p.z; }
}
const SIM = { washCars: [], truck: null, crates: [], tourists: [], shops: [], radioT: 40, tourN: 0 };
function buildSimProps() {
  // three dusty cars beside Fundi Rashid
  const r = NPC_BY_ID.rashid;
  for (let i = 0; i < 3; i++) {
    let p = null;
    for (let k = 0; k < 12 && !p; k++) { const q = findClear(r.x + 6 + i * 6.5 + k * 3, r.z + 3, 2.6, true); if (SIM.washCars.every(c => Math.hypot(c.x - q.x, c.z - q.z) > 6.2) && Math.hypot(q.x - r.x, q.z - r.z) < 45) p = q; }
    p = p || findClear(r.x + 8 + i * 7, r.z + 10, 2.6, true);
    const m = makeVehicle('sedan', [0x9aa0a8, 0x1f4f8f, 0xd8d0c0][i]); m.position.set(p.x, 0.04, p.z); m.rotation.y = Math.PI / 2; scene.add(m);
    addCircle(p.x - 1.2, p.z, 1.0, 'veh'); addCircle(p.x + 1.2, p.z, 1.0, 'veh');
    const dirt = new T.Mesh(new T.BoxGeometry(4.5, 0.02, 1.9), new T.MeshBasicMaterial({ color: 0x6b5a3c, transparent: true, opacity: 0.55, depthWrite: false })); dirt.position.set(p.x, 1.42, p.z); dirt.rotation.y = Math.PI / 2; scene.add(dirt);
    SIM.washCars.push({ x: p.x, z: p.z, m, dirt, left: 0 });
  }
  // Bi Mwajuma's tomato lorry
  const mj = NPC_BY_ID.mwajuma, tp = findClear(mj.x + 26, mj.z - 18, 2.8, false);
  const g = new T.Group(); g.position.set(tp.x, 0, tp.z); g.rotation.y = Math.PI / 2;
  g.add(at(meshOf(roundedBox(2, 1.7, 1.8, 0.15, 1), M(0x2a6fa8, { roughness: 0.5 }), true), 0, 1.25, 1.6));
  g.add(at(meshOf(box(2.1, 0.25, 3.2), M(0x3a3d45), true), 0, 0.7, -0.6));
  for (const s of [-1, 1]) for (const zz of [1.6, -1.6]) { const wh = new T.Mesh(new T.CylinderGeometry(0.42, 0.42, 0.3, 14), rubber); wh.rotation.z = Math.PI / 2; wh.position.set(s * 1.0, 0.42, zz); g.add(wh); }
  for (let i = 0; i < 6; i++) { const c = at(meshOf(box(0.6, 0.4, 0.45), M(0xb8864a), true), (i % 2 - 0.5) * 0.7, 1.05 + Math.floor(i / 4) * 0.42, -0.2 - Math.floor(i / 2) % 2 * 0.6 - (i >= 4 ? 0 : 0)); const tom = at(meshOf(box(0.55, 0.1, 0.4), M(0xd8452c)), 0, 0.22, 0); c.add(tom); g.add(c); SIM.crates.push(c); }
  scene.add(g); obbOf(tp.x, tp.z, 2.4, 5, Math.PI / 2, 'veh');
  SIM.truck = { x: tp.x, z: tp.z, g };
  buildShops();
}
const SIM_TALK = {
  rashid: () => {
    const n = NPC_BY_ID.rashid;
    if (job && job.type === 'wash') { openMenu({ eyebrow: n.role, title: n.name, lede: `"${job.left} car${job.left === 1 ? '' : 's'} to go. Sabuni na maji: soap and water!"`, items: [] }); return; }
    openMenu({ eyebrow: n.role, title: n.name, lede: '"Dust from the new roads covers every car in Fumba. I pay well for quick hands: three cars, four minutes."', items: [
      { label: 'Wash three cars', desc: `Scrub each car three times (E) · pays ${tsh(PAY.wash)}`, price: 'Earn', act: startWash },
    ] });
  },
  hassan: () => {
    const n = NPC_BY_ID.hassan;
    if (job && job.type === 'tour') { openMenu({ eyebrow: n.role, title: n.name, lede: `"Your group is waiting! Next stop: ${TOUR_STOPS[job.i] ? TOUR_STOPS[job.i].name : 'back here'}."`, items: [] }); return; }
    openMenu({ eyebrow: n.role, title: n.name, lede: '"Three visitors from Nairobi want a walking tour of Fumba: the market, the beach and the pier. I have two other groups. Can you guide them? Walk, do not drive, and keep them close."', items: [
      { label: 'Guide a walking tour', desc: `Three stops in nine minutes · ${tsh(PAY.tour)} plus tips`, price: 'Earn', act: startTour },
    ] });
  },
  mwajuma: () => {
    const n = NPC_BY_ID.mwajuma;
    if (job && job.type === 'porter') { openMenu({ eyebrow: n.role, title: n.name, lede: `"${job.left} crates still on the lorry. Haraka, before the sun cooks my tomatoes!"`, items: [] }); return; }
    openMenu({ eyebrow: n.role, title: n.name, lede: '"The lorry from Kizimbani is here with tomatoes and the driver will not wait. Carry six crates to my stall and I pay you."', items: [
      { label: 'Carry six crates', desc: `From the blue lorry to the stall in 3½ minutes · ${tsh(PAY.porter)}`, price: 'Earn', act: startPorter },
    ] });
  },
};
function startWash() { if (job) failJobSilently(); for (const c of SIM.washCars) { c.left = 3; c.dirt.visible = true; } job = { type: 'wash', title: 'Car wash', desc: 'Scrub each dusty car three times with E.', t0: now(), limit: 240, left: SIM.washCars.length }; sfx.start(); splash('SABUNI!', 'Three cars, four minutes', 'gold'); }
function scrubCar(c) {
  c.left--; sfx.ding(); playEmote(player, 'clap'); c.dirt.material.opacity = 0.18 * c.left;
  if (c.left <= 0) { c.dirt.visible = false; job.left--; sfx.coin(0); if (job.left <= 0) { job = null; state.stats.jobs++; earn(PAY.wash, 'Car wash'); splash('SAFI!', `All clean · +${tsh(PAY.wash)}`, 'gold'); sfx.win(); } }
}
const TOUR_STOPS = [
  { name: 'Usiku food market', x: MARKET.x, z: MARKET.z, fact: 'Hassan\'s visitors try urojo and buy kashata. "Hii ni tamu!"' },
  { name: 'Fumba Uptown beach', x: BAR.x + 30, z: BAR.z - 6, fact: 'They photograph the dhows and the seaweed farmers out on the flats.' },
  { name: 'Fumba pier', x: PIER.x, z: coastZ(PIER.x) - 6, fact: 'The pier faces Menai Bay, a marine conservation area full of dolphins.' },
];
function startTour() {
  if (job) failJobSilently();
  const looks = [styledLook(811 + SIM.tourN, { skin: 0x9a6a46, f: false }), styledLook(812 + SIM.tourN, { skin: 0x6b4226, f: true }), styledLook(813 + SIM.tourN, { skin: 0xd8b090, hairCol: 0x8a6a3a, tourist: true, f: false })]; SIM.tourN += 3;
  for (const t of SIM.tourists) scene.remove(t.h);
  SIM.tourists = looks.map((lk, i) => { const h = makeHuman(lk); h.position.set(P.x - 2 - i, 0.04, P.z - 2); scene.add(h); return { h, x: P.x - 2 - i, z: P.z - 2, sp: 0 }; });
  job = { type: 'tour', title: 'Walking tour', desc: 'Lead the visitors to each stop on foot.', i: 0, t0: now(), limit: 540, x: TOUR_STOPS[0].x, z: TOUR_STOPS[0].z };
  sfx.start(); splash('ZIARA!', 'Three stops, nine minutes', 'gold');
}
function endTour() { for (const t of SIM.tourists) scene.remove(t.h); SIM.tourists = []; }
function updateTour(dt, t) {
  const back = player.rotation.y + Math.PI;
  SIM.tourists.forEach((tr, i) => {
    const tx = P.x + Math.sin(back) * (2.4 + i * 1.3) + Math.cos(back) * (i - 1) * 1.1, tz = P.z + Math.cos(back) * (2.4 + i * 1.3) - Math.sin(back) * (i - 1) * 1.1;
    const dx = tx - tr.x, dz = tz - tr.z, d = Math.hypot(dx, dz), far = Math.hypot(P.x - tr.x, P.z - tr.z) > 45 || playerVeh;
    const want = far ? 0 : d > 0.6 ? Math.min(6.2, d * 1.8) : 0;
    tr.sp = damp(tr.sp, want, 6, dt);
    if (d > 0.05 && tr.sp > 0.05) {
      /* walk around walls and stalls: try straight, then slide along one axis */
      const sx = dx / d * tr.sp * dt, sz = dz / d * tr.sp * dt, ok = (x, z) => walkable(x, z) && !personBlocked(x, z, 0.3);
      if (ok(tr.x + sx, tr.z + sz)) { tr.x += sx; tr.z += sz; } else if (ok(tr.x + sx, tr.z)) tr.x += sx; else if (ok(tr.x, tr.z + sz)) tr.z += sz;
      else if (d > 25) { const c = findClear(tx, tz, 0.4, false); tr.x = c.x; tr.z = c.z; }
      tr.h.rotation.y = angDamp(tr.h.rotation.y, Math.atan2(dx, dz), 8, dt);
    }
    tr.h.position.set(tr.x, 0.04, tr.z); tr.h.userData.lookAt = tr.sp < 0.3 ? playerHead : null;
    animHuman(tr.h, dt, t, tr.sp, 'loco');
  });
  if (playerVeh && !job.toldVeh) { job.toldVeh = true; help('Your visitors are walking. Get off and lead them on foot.', 3500); }
  const st = TOUR_STOPS[job.i], close = SIM.tourists.every(tr => Math.hypot(tr.x - P.x, tr.z - P.z) < 16);
  if (st && Math.hypot(st.x - P.x, st.z - P.z) < 14 && close && !playerVeh) {
    for (const tr of SIM.tourists) playEmote(tr.h, 'point');
    sfx.ding(); help(`<b class="hl">${escapeHtml(st.name)}</b>: ${escapeHtml(st.fact)}`, 4500);
    job.i++;
    if (job.i >= TOUR_STOPS.length) { const left = job.limit - (now() - job.t0), tip = roundTo(PAY.tourTip * clamp(left / job.limit * 1.6, 0, 1), 500); job = null; state.stats.jobs++; earn(PAY.tour + tip, tip ? 'Tour + tips' : 'Tour'); splash('ASANTE SANA!', `Tour done · +${tsh(PAY.tour + tip)}`, 'gold'); sfx.win(); setTimeout(endTour, 6000); for (const tr of SIM.tourists) playEmote(tr.h, 'cheer'); return; }
    job.x = TOUR_STOPS[job.i].x; job.z = TOUR_STOPS[job.i].z;
  }
}
function startPorter() { if (job) failJobSilently(); for (const c of SIM.crates) c.visible = true; job = { type: 'porter', title: 'Tomato crates', desc: 'Carry crates from the blue lorry to Bi Mwajuma\'s stall.', left: 6, crate: false, t0: now(), limit: 210 }; sfx.start(); splash('BEBA!', 'Six crates, three and a half minutes', 'gold'); }
function updatePorter() {
  const tk = SIM.truck, mj = NPC_BY_ID.mwajuma;
  if (playerVeh) return;
  if (!job.crate && Math.hypot(tk.x - P.x, tk.z - P.z) < 4.2) { job.crate = true; const c = SIM.crates.find(q => q.visible); if (c) c.visible = false; sfx.ding(); }
  else if (job.crate && Math.hypot(mj.x - P.x, mj.z - P.z) < 3.2) {
    job.crate = false; job.left--; sfx.coin(0);
    if (job.left <= 0) { job = null; state.stats.jobs++; earn(PAY.porter, 'Porter pay'); splash('ASANTE!', `Crates done · +${tsh(PAY.porter)}`, 'gold'); sfx.win(); setTimeout(() => { for (const c of SIM.crates) c.visible = true; }, 20000); }
  }
}
function simTimer() { return job && (job.type === 'errand' || job.type === 'wash' || job.type === 'porter' || job.type === 'tour') ? job.limit - (now() - job.t0) : null; }
function simJobDesc() {
  if (!job) return null;
  if (job.type === 'wash') return { desc: `${job.left} car${job.left === 1 ? '' : 's'} to scrub. Stand by a dusty car and press E.`, bar: (SIM.washCars.length - job.left) / SIM.washCars.length };
  if (job.type === 'porter') return { desc: `${job.left} crates to go. ${job.crate ? 'Take it to Bi Mwajuma\'s stall.' : 'Pick one up at the blue lorry.'}`, bar: (6 - job.left) / 6 };
  if (job.type === 'tour') { const st = TOUR_STOPS[job.i]; return { desc: st ? `Stop ${job.i + 1} of ${TOUR_STOPS.length}: ${st.name}. Keep your visitors close.` : '', bar: job.i / TOUR_STOPS.length }; }
  if (job.type === 'errand') return { desc: `${job.desc} ${job.who} pays ${tsh(job.pay)}.`, bar: null };
  return null;
}
function simTarget() {
  if (!job) return null;
  if (job.type === 'wash') { let b = null, bd = 1e9; for (const c of SIM.washCars) if (c.left > 0) { const d = Math.hypot(c.x - P.x, c.z - P.z); if (d < bd) { bd = d; b = c; } } return b; }
  if (job.type === 'porter') return job.crate ? NPC_BY_ID.mwajuma : SIM.truck;
  return null;
}
function simMarkers() {
  const list = [];
  if (job && job.type === 'wash') for (const c of SIM.washCars) if (c.left > 0) list.push({ x: c.x, z: c.z, y: 2.6, s: 0.8 });
  if (job && job.type === 'porter') { const p = job.crate ? NPC_BY_ID.mwajuma : SIM.truck; list.push({ x: p.x, z: p.z, y: 3.4, s: 1 }); }
  if (job && (job.type === 'tour' || job.type === 'errand')) list.push({ x: job.x, z: job.z, y: 4, s: 1.2 });
  if (ORDER.state === 'coming' || ORDER.state === 'waiting') list.push({ x: ORDER.pick.x, z: ORDER.pick.z, y: 2.4, s: 0.9 });
  return list;
}

/* ---------- shopfronts and the beach-bar radio: two more spaces brands can book ---------- */
const SHOP_SPOTS = [
  { id: 'sf1', name: 'Shopfront · Uptown Gate', x: START.x - 26, z: START.z - 16 },
  { id: 'sf2', name: 'Shopfront · Usiku market', x: MARKET.x + 22, z: MARKET.z - 16 },
  { id: 'sf3', name: 'Shopfront · Fan Zone', x: FZ.x + FZ.w / 2 + 14, z: FZ.z - 30 },
];
const SHOPS = [];
const RADIO_SLOT = { id: 'radio', name: 'Radio Pwani · beach bar', note: 'A spoken advert on the radio at Mama Pwani’s beach bar, heard by everyone nearby, with a link to your brand page from the bar menu.', kind: 'radio' };
function buildShops() {
  for (const sp of SHOP_SPOTS) {
    const p = findClear(sp.x, sp.z, 3.2, true);
    let best = null, bd = 1e9; for (const s of roadSegs) { if (s.c !== 'T' && s.c !== 'R') continue; const dx = s.x1 - s.x0, dz = s.z1 - s.z0, l2 = dx * dx + dz * dz || 1, t = clamp(((p.x - s.x0) * dx + (p.z - s.z0) * dz) / l2, 0, 1), qx = s.x0 + dx * t, qz = s.z0 + dz * t, d = Math.hypot(qx - p.x, qz - p.z); if (d < bd) { bd = d; best = { x: qx, z: qz }; } }
    const ry = best ? Math.atan2(best.x - p.x, best.z - p.z) : 0;
    const g = new T.Group(); g.position.set(p.x, 0, p.z); g.rotation.y = ry;
    const wall = M(0xf1e8d6, { roughness: 0.85 }), dark = M(0x2a2d33, { roughness: 0.6 });
    g.add(at(meshOf(roundedBox(4.4, 2.9, 3.2, 0.12, 1), wall, true), 0, 1.45, 0));
    g.add(at(meshOf(box(4.9, 0.18, 3.8), M(0x8e3b2a), true), 0, 2.98, 0.2));
    g.add(at(meshOf(box(3.2, 1.6, 0.06), dark), 0, 1.6, 1.62));
    g.add(at(meshOf(box(3.6, 1.0, 0.5), M(0x1e6f5c, { roughness: 0.6 }), true), 0, 0.5, 1.85));
    const aw = new T.Mesh(new T.PlaneGeometry(4.6, 1.3), new T.MeshStandardMaterial({ map: texOf((() => { const c = mkCanvas(256, 64), x = c.getContext('2d'); for (let i = 0; i < 16; i++) { x.fillStyle = i % 2 ? '#f6f1e7' : '#e0553a'; x.fillRect(i * 16, 0, 16, 64); } return c; })()), side: T.DoubleSide, roughness: 0.8 }));
    aw.position.set(0, 2.55, 2.05); aw.rotation.x = -0.9; g.add(aw);
    const def = adTex('YOUR SHOP HERE', 'Book this shopfront · AfconCity', ['#232a63', '#141838'], '#f3b41b');
    const mat = new T.MeshStandardMaterial({ map: def, emissive: 0xffffff, emissiveMap: def, emissiveIntensity: 0.04, roughness: 0.5 }); nightable(mat, 0.04, 0.85);
    const sign = new T.Mesh(new T.PlaneGeometry(3.8, 1.9), mat); sign.position.set(0, 4.05, 1.4); g.add(sign);
    g.add(at(meshOf(box(3.95, 2.05, 0.08), dark), 0, 4.05, 1.35));
    for (const s of [-1, 1]) g.add(at(meshOf(box(0.1, 1.2, 0.1), dark), s * 1.7, 3.1, 1.35));
    scene.add(g); obbOf(p.x, p.z, 4.4, 3.4, ry, 'shop');
    const slot = { id: sp.id, name: sp.name, note: 'A kiosk with your sign over the door. Players press E at the counter to open your brand page with your offer and links.', kind: 'shop', x: p.x + Math.sin(ry) * 1.4, z: p.z + Math.cos(ry) * 1.4, ry, mat, def, fx: p.x + Math.sin(ry) * 2.9, fz: p.z + Math.cos(ry) * 2.9 };
    SHOPS.push(slot);
  }
}
function shopNear() { for (const s of SHOPS) if (Math.hypot(s.fx - P.x, s.fz - P.z) < 2.8) return s; return null; }
function openShop(s) {
  const ad = phoneAd(s.id);
  if (ad) { openPhone('brand', s.id); return; }
  openMenu({ eyebrow: s.name, title: 'Duka la kukodi', lede: 'This kiosk is waiting for a brand. Businesses can book it from the Advertise page: their sign goes over the door and this counter opens their offer and links.', items: [], close: 'Okay' });
}
function updateRadio(dt) {
  const d = Math.hypot(BAR.x - P.x, BAR.z - P.z); if (d > 70 || mode !== 'play') return;
  const ad = phoneAd('radio');
  if (ad) AD.ph.views.radio = (AD.ph.views.radio || 0) + dt;
  SIM.radioT -= dt; if (SIM.radioT > 0) return;
  SIM.radioT = ad ? 75 : 170;
  if (ad) help(`<b class="hl">Radio Pwani</b> · "${escapeHtml(ad.headline || ad.brand)}${ad.sub ? ' ' + escapeHtml(ad.sub) : ''}" <span class="fine">Sponsored by ${escapeHtml(ad.brand || '')}</span>`, 6000);
  else help('<b class="hl">Radio Pwani</b> · "Bongo flava all afternoon on the beach. Your advert could play here: Tangaza on your phone."', 5000);
}

/* ---------- hooks ---------- */
function simInteraction() {
  if (mode !== 'play' || playerVeh) return null;
  if (ORDER.state === 'waiting' && ORDER.v && Math.hypot(ORDER.v.x - P.x, ORDER.v.z - P.z) < 4.2) return { text: ORDER.dest ? `Get on ${ORDER.name}'s ${RIDE_KINDS[ORDER.kind].sw.toLowerCase()} · ${tsh(ORDER.fare)}` : `Get on ${ORDER.name}'s ${RIDE_KINDS[ORDER.kind].sw.toLowerCase()} · say where`, act: boardRide };
  if (job && job.type === 'wash') for (const c of SIM.washCars) if (c.left > 0 && Math.hypot(c.x - P.x, c.z - P.z) < 3.6) return { text: `Scrub the car · ${c.left} to go`, act: () => scrubCar(c) };
  const sh = shopNear(); if (sh) { const ad = phoneAd(sh.id); return { text: ad ? `Visit ${ad.brand || 'the shop'}` : 'Shop to let', act: () => openShop(sh) }; }
  return null;
}
function walkerInteraction() {
  if (mode !== 'play' || playerVeh) return null;
  const w = walkerNear(2.3); if (!w) return null;
  return { text: `Salimia ${walkerName(w)} · say hello`, act: () => talkWalker(w) };
}
function updateSim(dt, t) {
  updateOrder(dt, t);
  if (job && mode === 'play') {
    if (job.type === 'porter') updatePorter();
    else if (job.type === 'tour') updateTour(dt, t);
    if (job && job.type === 'errand' && Math.hypot(job.x - P.x, job.z - P.z) < 7) { const pay = job.pay, who = job.who; job = null; state.stats.jobs++; state.stats.errands = (state.stats.errands || 0) + 1; state.bank = (state.bank || 0) + pay; state.stats.earned += pay; moneyDelta(pay, `Errand · Pesa from ${who}`); phoneMsg('pesa', `Imethibitishwa. You received ${tsh(pay)} from ${who.toUpperCase()}. New Pesa balance ${tsh(state.bank)}.`); splash('ASANTE!', `Errand done · +${tsh(pay)}`, 'gold'); sfx.win(); }
    const tl = simTimer();
    if (job && tl !== null && tl <= 0) { const ty = job.type; if (ty === 'tour') endTour(); job = null; splash('MUDA UMEISHA', ty === 'errand' ? 'Too late: the errand went to someone else' : 'Out of time. No pay this time.', 'bad'); }
  } else if (!job && SIM.tourists.length) for (const tr of SIM.tourists) animHuman(tr.h, dt, t, 0, 'loco');
  updateRadio(dt);
}

/* stuck anywhere: call a boda or bajaji to exactly where you are, or hop to a clear spot */
function stuckMenu() {
  if (ORDER.state === 'riding') { help(`You are on the ${RIDE_KINDS[ORDER.kind].sw.toLowerCase()}. Press <kbd>E</kbd> to skip to the end of the ride.`, 3500); return; }
  const items = [
    { label: 'Call a boda to here', desc: 'A rider comes to where you stand, even off the road. Say where on the bike', price: 'Call', disabled: !!ORDER.state, act: () => orderRide('boda', null) },
    { label: 'Call a bajaji to here', desc: 'Covered, room for three. Comes off-road to you', price: 'Call', disabled: !!ORDER.state, act: () => orderRide('bajaji', null) },
    { label: 'Just move me to a clear spot', desc: 'Free. Puts you on open ground nearby', price: 'Free', act: () => { if (playerVeh && Math.abs(playerVeh.vf) < 3 && trapped()) exitVehicle(true); if (!unstick()) { P.set(START.x, 0.04, START.z); player.position.copy(P); } help('Moved you to a clear spot.', 2000); } },
  ];
  if (ORDER.state && ORDER.state !== 'riding') items.unshift({ label: 'Cancel my ride', desc: 'Free', price: 'Free', act: () => cancelOrder('You cancelled. No charge.') });
  openMenu({ eyebrow: 'Stuck?', title: 'Nisaidie', lede: 'Wherever you are, a boda or bajaji can come and get you. You pay only for the ride.', items, close: 'I\'m fine' });
}
