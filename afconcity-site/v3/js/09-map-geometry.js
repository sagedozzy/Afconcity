/* Real map geometry. Coordinates use the same local-metre projection as saves,
   missions and traffic; unknown heights/materials are visual interpretations. */
function fromLatLon(lat, lon) {
  const ex = (lon - GEO.lon) * GEO.kx, ez = (GEO.lat - lat) * GEO.kz;
  const c = Math.cos(GEO.ang), s = Math.sin(GEO.ang);
  return { x: ex * c - ez * s, z: ex * s + ez * c };
}

/* A road query only visits nearby cells, preserving the original segment order
   at junctions. This is shared by vehicle surfaces, vegetation and sidewalks. */
const roadGrid = new Map(), ROAD_CELL = 64;
const plantGrid = new Map();
let plantGridReady = false;
function preparePlantGrid() {
  plantGrid.clear();
  for (const f of footprints) {
    let minx, maxx, minz, maxz;
    if (f.poly) {
      minx = Math.min(...f.poly.map(p => p[0])); maxx = Math.max(...f.poly.map(p => p[0]));
      minz = Math.min(...f.poly.map(p => p[1])); maxz = Math.max(...f.poly.map(p => p[1]));
    } else {
      const c = Math.abs(Math.cos(f.ang || 0)), s = Math.abs(Math.sin(f.ang || 0));
      const rx = f.ellipse ? f.rx : f.circle ? f.r : (c * f.w + s * f.d) / 2;
      const rz = f.ellipse ? f.rz : f.circle ? f.r : (s * f.w + c * f.d) / 2;
      minx = f.x - rx; maxx = f.x + rx; minz = f.z - rz; maxz = f.z + rz;
    }
    for (let ix = Math.floor(minx / ROAD_CELL); ix <= Math.floor(maxx / ROAD_CELL); ix++) {
      for (let iz = Math.floor(minz / ROAD_CELL); iz <= Math.floor(maxz / ROAD_CELL); iz++) {
        const k = ix + ',' + iz; if (!plantGrid.has(k)) plantGrid.set(k, []); plantGrid.get(k).push(f);
      }
    }
  }
  plantGridReady = true;
}
function plantCandidates(x, z, pad) {
  if (!plantGridReady) return footprints;
  // A rotated rectangle expanded in local axes can extend sqrt(2)*pad in x/z.
  pad = Math.max(0, pad || 0) * Math.SQRT2;
  const x0 = Math.floor((x - pad) / ROAD_CELL), x1 = Math.floor((x + pad) / ROAD_CELL);
  const z0 = Math.floor((z - pad) / ROAD_CELL), z1 = Math.floor((z + pad) / ROAD_CELL);
  if (x0 === x1 && z0 === z1) return plantGrid.get(x0 + ',' + z0) || EMPTY;
  const out = new Set();
  for (let ix = x0; ix <= x1; ix++) for (let iz = z0; iz <= z1; iz++) for (const f of plantGrid.get(ix + ',' + iz) || EMPTY) out.add(f);
  return out;
}
function indexRoadSegment(s) {
  s.order = roadSegs.length; roadSegs.push(s);
  for (let x = Math.floor(s.minx / ROAD_CELL); x <= Math.floor(s.maxx / ROAD_CELL); x++) {
    for (let z = Math.floor(s.minz / ROAD_CELL); z <= Math.floor(s.maxz / ROAD_CELL); z++) {
      const k = x + ',' + z;
      if (!roadGrid.has(k)) roadGrid.set(k, []);
      roadGrid.get(k).push(s);
    }
  }
}
function roadCandidates(x, z, pad) {
  pad = Math.max(0, pad || 0);
  const x0 = Math.floor((x - pad) / ROAD_CELL), x1 = Math.floor((x + pad) / ROAD_CELL);
  const z0 = Math.floor((z - pad) / ROAD_CELL), z1 = Math.floor((z + pad) / ROAD_CELL);
  if (x0 === x1 && z0 === z1) return roadGrid.get(x0 + ',' + z0) || EMPTY;
  const out = new Set();
  for (let ix = x0; ix <= x1; ix++) for (let iz = z0; iz <= z1; iz++) {
    for (const s of roadGrid.get(ix + ',' + iz) || EMPTY) out.add(s);
  }
  return [...out].sort((a, b) => a.order - b.order);
}
function roadSpec(r) {
  const s = ROAD[r.c], unpaved = /^(unpaved|dirt|earth|ground|sand|gravel|fine_gravel|compacted)$/.test(r.surface || '');
  return Object.assign({}, s, r.w ? { w: clamp(r.w, 1, 30) } : {}, unpaved ? { tex: 'soil', tile: 6, unpaved: true } : {});
}

/* Closest boundary of a simple, counter-clockwise footprint. Negative distance
   means inside. The outward vector also handles a point exactly on an edge. */
function polygonContact(x, z, p) {
  let best = Infinity, qx = x, qz = z, nx = 1, nz = 0;
  for (let i = 0; i < p.length; i++) {
    const a = p[i], b = p[(i + 1) % p.length], dx = b[0] - a[0], dz = b[1] - a[1], l2 = dx * dx + dz * dz;
    if (!l2) continue;
    const t = clamp(((x - a[0]) * dx + (z - a[1]) * dz) / l2, 0, 1);
    const px = a[0] + t * dx, pz = a[1] + t * dz, dd = (x - px) ** 2 + (z - pz) ** 2;
    if (dd < best) { best = dd; qx = px; qz = pz; const l = Math.sqrt(l2); nx = dz / l; nz = -dx / l; }
  }
  const inside = pointInPoly(x, z, p), d = Math.sqrt(best);
  if (d > 1e-7) { const sign = inside ? -1 : 1; nx = (x - qx) / d * sign; nz = (z - qz) / d * sign; }
  return { d: inside ? -d : d, x: qx, z: qz, nx, nz };
}
function addFootprintCollider(p, h) {
  const x = p.reduce((s, q) => s + q[0], 0) / p.length, z = p.reduce((s, q) => s + q[1], 0) / p.length;
  return addCollider({ t: 2, x, z, p, h, br: Math.max(...p.map(q => Math.hypot(q[0] - x, q[1] - z))) + 4, on: true, tag: '' });
}

function footprintRay(c, ax, ay, az, dx, dy, dz, limit, pad) {
  if (polygonContact(ax, az, c.p).d < pad) return limit;
  let best = limit;
  const speed = Math.hypot(dx, dz);
  if (speed < 1e-6) return best;
  for (let i = 0; i < c.p.length; i++) {
    const a = c.p[i], b = c.p[(i + 1) % c.p.length], ex = b[0] - a[0], ez = b[1] - a[1];
    const det = dx * ez - dz * ex;
    if (Math.abs(det) < 1e-8) continue;
    const qx = a[0] - ax, qz = a[1] - az, t = (qx * ez - qz * ex) / det, u = (qx * dz - qz * dx) / det;
    if (t >= 0 && t < best && u >= 0 && u <= 1 && ay + dy * t <= c.h) best = Math.max(0, t - pad / speed);
  }
  return best;
}

function buildMappedBuilding(record, B) {
  const [x, z, w, d, ang, kind, source, p, meta] = record;
  const area = Math.abs(p.reduce((s, a, i) => { const b = p[(i + 1) % p.length]; return s + a[0] * b[1] - b[0] * a[1]; }, 0) / 2);
  const hv = hash2(x, z), shed = kind === 'industrial' || area > 1500;
  const floors = area > 500 ? 2 : area > 120 && hv > 0.32 ? 2 : 1;
  const h = meta.height || (shed ? 9 : floors * 3.2 + 0.4), white = C(0xece4d6);
  const wallC = C(WALL_COLS[Math.floor(hash2(z, x) * WALL_COLS.length)]);
  const body = new T.ExtrudeGeometry(shapeFrom(p), { depth: h, steps: 1, bevelEnabled: false });
  body.rotateX(-Math.PI / 2);
  B.wall.add(body, mat4(0, 0, 0, 0), wallC, { uv: 'box', tile: 4, grime: 0.7 }); body.dispose();
  const roof = new T.ShapeGeometry(shapeFrom(p)); roof.rotateX(-Math.PI / 2);
  B.trim.add(roof, mat4(0, h + 0.025, 0, 0), C(shed ? 0x7f8b93 : 0xc5b6a0), { uv: 'box', tile: 4 }); roof.dispose();
  // Model individual facade edges so concave courtyards remain open. The facade
  // is intentionally procedural, not a claim about the real building's design.
  let front = -1, best = Infinity;
  const edges = p.map((a, i) => {
    const b = p[(i + 1) % p.length], dx = b[0] - a[0], dz = b[1] - a[1], len = Math.hypot(dx, dz);
    const mx = (a[0] + b[0]) / 2, mz = (a[1] + b[1]) / 2;
    if (len > 2.5) for (const road of roadCandidates(mx, mz, 70)) {
      const dd = segDist(mx, mz, road.x0, road.z0, road.x1, road.z1);
      if (dd < best) { best = dd; front = i; }
    }
    return { a, b, len, nx: dz / (len || 1), nz: -dx / (len || 1), ry: Math.atan2(dz, -dx) };
  });
  edges.forEach((e, si) => {
    if (e.len < 0.3) return;
    const mx = (e.a[0] + e.b[0]) / 2, mz = (e.a[1] + e.b[1]) / 2;
    B.trim.add(box(e.len, 0.2, 0.22), mat4(mx, h + 0.1, mz, e.ry), white);
    if (shed || e.len < 2.4) return;
    const n = Math.max(1, Math.floor(e.len / 3.5)), floorH = h / floors;
    for (let f = 0; f < floors; f++) for (let i = 0; i < n; i++) {
      const t = (i + 0.5) / n, px = lerp(e.a[0], e.b[0], t) + e.nx * 0.04, pz = lerp(e.a[1], e.b[1], t) + e.nz * 0.04;
      const door = si === front && f === 0 && i === Math.floor(n / 2), ww = Math.min(door ? 1.2 : 1.5, e.len / n - 0.5), hh = door ? 2.3 : 1.5;
      const y = door ? 1.15 : f * floorH + Math.min(1.9, floorH * 0.55);
      B.trim.add(box(ww + 0.18, hh + 0.18, 0.04), mat4(px, y, pz, e.ry), C(0x4a4541));
      const plane = new T.PlaneGeometry(ww, hh);
      B[door ? 'door' : hash2(x + i + si, z + f) > 0.55 ? 'glassL' : 'glassD'].add(plane, mat4(px + e.nx * 0.03, y, pz + e.nz * 0.03, e.ry), null, { uv: 'keep' }); plane.dispose();
    }
  });
  addFootprintCollider(p, h); footprints.push({ poly: p });
}
