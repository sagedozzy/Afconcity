/* ===================== 15 AfconCity: Zanzibar Sports City on its real plot ===================== */
// Access roads join the street network before anything is built, so traffic, walkers, lamps and the map all use them.
const AFCON_ROADS = [
  { c: 'T', p: [[BLVD.x, -242], [BLVD.x, -407]] },
  { c: 'R', p: [[-1250, -407], [BLVD.x, -407], [-785, -407]] },
  { c: 'R', p: [[-785, -221], [-785, -407], [-780, -560], [-772, -700], [-860, -744]] },
  { c: 'S', p: [[-1250, -407], [-1240, -560], [-1205, -720], [-1110, -772]] },
];
WORLD.roads.push(...AFCON_ROADS);
function inPlot(x, z, pad) { return pointInPoly(x, z, PLOT) && (!pad || pointInPoly(x + pad, z, PLOT) && pointInPoly(x - pad, z, PLOT) && pointInPoly(x, z + pad, PLOT) && pointInPoly(x, z - pad, PLOT)); }

function parkedCars(spots) {
  const b = new Builder(), glass = C(0x1b2330), tyre = C(0x141416), rim = C(0x9aa0a8);
  const cols = [0xf2f2f2, 0x1c1d22, 0x9aa0a8, 0x8a1a1a, 0x1f4f8f, 0xd8d0c0, 0x2e5d3a, 0xc0c4c8, 0x6a4a2a];
  spots.forEach(([x, z, ry], i) => {
    const P = C(cols[Math.floor(hash2(x, z) * cols.length)]), M0 = mat4(x, 0, z, ry);
    const add = (geo, m, col) => b.add(geo, M0.clone().multiply(m), col);
    const suv = hash2(z, x) > 0.7, L = suv ? 4.7 : 4.4, H = suv ? 0.8 : 0.6;
    add(roundedBox(1.8, H, L, 0.2, 1), mat4(0, 0.36 + H / 2, 0, 0), P);
    add(roundedBox(1.6, 0.5, L * 0.5, 0.18, 1), mat4(0, 0.36 + H + 0.24, suv ? -0.2 : -0.15, 0), glass);
    add(roundedBox(1.5, 0.06, L * 0.42, 0.03, 1), mat4(0, 0.36 + H + 0.5, suv ? -0.2 : -0.15, 0), P);
    for (const [wx, wz] of [[-0.82, L * 0.31], [0.82, L * 0.31], [-0.82, -L * 0.31], [0.82, -L * 0.31]]) {
      add(new T.CylinderGeometry(0.34, 0.34, 0.24, 14), mat4(wx, 0.34, wz, 0, 1, 1, 1, 0, Math.PI / 2), tyre);
      add(new T.CylinderGeometry(0.2, 0.2, 0.26, 10), mat4(wx, 0.34, wz, 0, 1, 1, 1, 0, Math.PI / 2), rim);
    }
    addObb(x, z, 1.9, L, -ry);
  });
  const m = new T.Mesh(b.build(), new T.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.32, metalness: 0.35, clearcoat: 0.8, clearcoatRoughness: 0.15 }));
  m.castShadow = true; m.receiveShadow = true; scene.add(m);
}

function buildAfconCity() {
  // concourse around the bowl and the entrance plaza (stone pavers)
  const plazaMat = groundMat(TEX.plaza, 6, 4, 0xffffff, false); if (TEX.plazaN) { plazaMat.normalMap = TEX.plazaN; plazaMat.normalScale = new T.Vector2(0.6, 0.6); }
  flatShape(ellipsePts(SC.x, SC.z, S_OUT.rx + 18, S_OUT.rz + 16, 140), plazaMat, 0.035);
  flatShape(rectPts(PLAZA.x, PLAZA.z, PLAZA.w, PLAZA.d), plazaMat, 0.036);
  footprints.push({ x: PLAZA.x, z: PLAZA.z, w: PLAZA.w + 4, d: PLAZA.d + 4, ang: 0 });
  // parking: fresh asphalt, painted bays, cars
  const lotMat = groundMat(TEX.roadS, 18, 4, 0xd8d8d8, false);
  const lines = new Builder(), wc = C(0xe9e6dc), spots = [];
  for (const L of PARKS) {
    flatShape(rectPts(L.x, L.z, L.w, L.d), lotMat, 0.04);
    footprints.push({ x: L.x, z: L.z, w: L.w + 2, d: L.d + 2, ang: 0 });
    const rows = [L.z - L.d / 2 + 6, L.z - L.d / 2 + 18, L.z + L.d / 2 - 18, L.z + L.d / 2 - 6];
    rows.forEach((rz, ri) => {
      for (let x = L.x - L.w / 2 + 3; x <= L.x + L.w / 2 - 3; x += 2.7) {
        lines.add(box(0.12, 0.02, 5), mat4(x, 0.05, rz, 0), wc);
        const cx = x + 1.35;
        if (cx < L.x + L.w / 2 - 3 && hash2(cx * 1.7, rz) < 0.42) spots.push([cx, rz + (hash2(rz, cx) - 0.5) * 0.4, (ri % 2 ? 0 : Math.PI) + (hash2(cx, rz * 3) - 0.5) * 0.08]);
      }
    });
  }
  scene.add(meshOf(lines.build(), new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.6, polygonOffset: true, polygonOffsetFactor: -6, polygonOffsetUnits: -24 }), false));
  parkedCars(spots);
  // gateway over the boulevard
  const gx = BLVD.x, gz = -262, pillar = M(0xeeeae2, { roughness: 0.5 }), red = M(0xd8452c, { roughness: 0.5 });
  for (const s of [-1, 1]) { scene.add(at(meshOf(roundedBox(2.2, 11, 2.2, 0.3), pillar, true), gx + s * 9.5, 5.5, gz)); addObb(gx + s * 9.5, gz, 2.2, 2.2, 0); scene.add(at(meshOf(roundedBox(2.4, 0.6, 2.4, 0.2), red, true), gx + s * 9.5, 11.2, gz)); }
  scene.add(at(meshOf(roundedBox(22, 2.6, 1.4, 0.3), M(0x141838, { roughness: 0.45 }), true), gx, 12.4, gz));
  const gs = signMesh('KARIBU AFCONCITY · ZANZIBAR SPORTS CITY', 20, 1.9, { bg: '#141838' }); gs.position.set(gx, 12.4, gz + 0.72); scene.add(gs);
  const gs2 = gs.clone(); gs2.position.set(gx, 12.4, gz - 0.72); gs2.rotation.y = Math.PI; scene.add(gs2);
  // aquatic centre
  const A = AQUA, g = new T.Group(); g.position.set(A.x, 0, A.z);
  const glassWall = new T.MeshStandardMaterial({ color: C(0x2a4b66), metalness: 0.7, roughness: 0.08, envMapIntensity: 1.3 });
  g.add(at(meshOf(roundedBox(A.w, 9, A.d, 0.6), M(0xf2f0ea, { roughness: 0.55 }), true), 0, 4.5, 0));
  g.add(at(meshOf(new T.BoxGeometry(A.w - 6, 6.4, 0.2), glassWall, false), 0, 4.6, A.d / 2 + 0.02));
  const roofG = new T.CylinderGeometry(A.d * 0.9, A.d * 0.9, A.w + 2, 40, 1, true, -0.55, 1.1); roofG.rotateZ(Math.PI / 2);
  const roof = meshOf(roofG, M(0xd9dde2, { metalness: 0.5, roughness: 0.3, side: T.DoubleSide }), true); roof.position.y = 9 - A.d * 0.9 * Math.cos(0.55) + 0.2; g.add(roof);
  for (let i = 0; i < 9; i++) g.add(at(meshOf(box(0.25, 6.4, 0.3), M(0xc9ccd2, { metalness: 0.6 }), true), -A.w / 2 + 3 + i * (A.w - 6) / 8, 4.6, A.d / 2 + 0.18));
  scene.add(g); addObb(A.x, A.z, A.w, A.d, 0); footprints.push({ x: A.x, z: A.z, w: A.w + 8, d: A.d + 8, ang: 0 });
  const as = signMesh('AQUATIC CENTRE', 12, 1.4, { bg: '#1f8fd0' }); as.position.set(A.x, 7.7, A.z + A.d / 2 + 0.25); scene.add(as);
  flatShape(rectPts(A.x, A.z + A.d / 2 + 10, A.w, 18), plazaMat, 0.036);
  // parade ground: concrete square, flags and a review stand
  const P = PARADE, concMat = groundMat(TEX.concrete, 8, 4, 0xffffff, false);
  flatShape(rectPts(P.x, P.z, P.w, P.d), concMat, 0.038); footprints.push({ x: P.x, z: P.z, w: P.w + 4, d: P.d + 4, ang: 0 });
  const lineB = new Builder();
  for (let i = -3; i <= 3; i++) lineB.add(box(0.2, 0.02, P.d - 10), mat4(P.x + i * 18, 0.05, P.z, 0), C(0xf3b41b));
  scene.add(meshOf(lineB.build(), new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.7, polygonOffset: true, polygonOffsetFactor: -6, polygonOffsetUnits: -24 }), false));
  const stand = new T.Group(); stand.position.set(P.x, 0, P.z - P.d / 2 - 6);
  for (let i = 0; i < 4; i++) stand.add(at(meshOf(roundedBox(34, 0.5 + i * 0.5, 2, 0.1), M(0xe9e6e0), true), 0, 0.25 + i * 0.25, -i * 2));
  const canopy = meshOf(roundedBox(36, 0.3, 9, 0.12), M(0x1e9b57), true); canopy.position.set(0, 5.4, -3); canopy.rotation.x = 0.06; stand.add(canopy);
  for (const s of [-1, 1]) stand.add(at(meshOf(new T.CylinderGeometry(0.15, 0.15, 5.4, 8), M(0x9aa0a8, { metalness: 0.6 }), true), s * 16, 2.7, 1));
  scene.add(stand); addObb(P.x, P.z - P.d / 2 - 9, 36, 8, 0);
  const flagCols = [[0x1eb53a, 0x00a3dd], [0xfcd116, 0x000000], [0x00a3dd, 0xfcd116], [0x1eb53a, 0xfcd116], [0x000000, 0x1eb53a]];
  flagCols.forEach(([a, b2], i) => {
    const fx = P.x - 36 + i * 18, fz = P.z + P.d / 2 + 4;
    scene.add(at(meshOf(new T.CylinderGeometry(0.07, 0.09, 12, 8), M(0xd8dce2, { metalness: 0.7, roughness: 0.3 }), true), fx, 6, fz)); addCircle(fx, fz, 0.15, 'small');
    const c = mkCanvas(64, 40), x = c.getContext('2d'), ca = new T.Color(a).getStyle(), cb = new T.Color(b2).getStyle(); x.fillStyle = ca; x.fillRect(0, 0, 64, 20); x.fillStyle = cb; x.fillRect(0, 20, 64, 20);
    const fl = new T.Mesh(new T.PlaneGeometry(2.6, 1.6, 6, 1), addWind(new T.MeshStandardMaterial({ map: texOf(c), side: T.DoubleSide, roughness: 0.9 }), 0.25)); fl.position.set(fx + 1.35, 11, fz); scene.add(fl);
  });
  // plot lawns stay clear of random trees; a few ornamental palms line the plaza
  footprints.push({ poly: PLOT });
  const palms = [];
  for (let x = PLAZA.x - PLAZA.w / 2 + 6; x <= PLAZA.x + PLAZA.w / 2 - 6; x += 16) if (Math.abs(x - PLAZA.x) > 14) palms.push([x, PLAZA.z + PLAZA.d / 2 - 3]);
  AFCON_PALMS.push(...palms);
  // signs
  signBoard('AFCONCITY · AFCON 2027', PLAZA.x - 70, PLAZA.z + 20, 0, 14, 2.2, 4.6, { bg: '#141838' });
  signBoard('UWANJA WA MAZOEZI · TRAINING', PITCHES[1].x, PITCHES[1].z + PITCHES[1].l / 2 + 10, 0, 13, 1.8, 3.6);
}
const AFCON_PALMS = [];

