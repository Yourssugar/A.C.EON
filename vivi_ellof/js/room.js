/* Комната лаборатории, третья версия: большая, правую стену разворотило взрывом.
   За проломом в задней стене справа от глаза соседняя часть лаборатории из арта Кодекса, где застыл взрыв
   (вырезка из панорамы на изогнутом экране), оранжевый свет оттуда заливает комнату.
   Пол-решётка над трубами в воде, стены, потолок со световыми полосами и лампами,
   пролом в задней переборке вокруг глаза (рваные лепестки, плоть по стене),
   слева стойки и пульты с застывшими экранами, колбы, тележка, платформа под креслом.
   buildRoom(THREE, t, Q) -> { root, ROOM } */

import { FLOOR, CHAIR } from './lab.js?v=20261128a';

export const ROOM = { LEFT: -14, RIGHT: 13, BACK: -1.15, FRONT: 24, CEIL: 6.2, HOLE: { x0: 5.4, x1: 12.6, top: 7.2 } };

export function buildRoom(THREE, t, Q) {
  const T = THREE.TSL;
  const { uv, vec2, vec3, float, texture, bumpMap } = T;
  const root = new THREE.Group();
  const F = FLOOR, { LEFT, RIGHT, BACK, FRONT, CEIL, HOLE } = ROOM;
  const H = CEIL - F, MIDZ = (FRONT + BACK) / 2;

  function mat(map, h, rep, o = {}) {
    const m = new THREE.MeshPhysicalNodeMaterial({ roughness: o.r ?? 0.5, metalness: o.m ?? 0.6, clearcoat: o.cc ?? 0, clearcoatRoughness: 0.15, side: o.side || THREE.FrontSide });
    const u = uv().mul(vec2(rep[0], rep[1]));
    m.colorNode = texture(map, u).rgb.mul(o.k ?? 0.4);
    if (h) m.normalNode = bumpMap(texture(h, u).r, float(o.b ?? 1.2));
    return m;
  }
  function plane(w, h, m, pos, rot) {
    const p = new THREE.Mesh(new THREE.PlaneGeometry(w, h), m);
    p.position.set(...pos); if (rot) p.rotation.set(...rot);
    root.add(p); return p;
  }

  /* ---------- пол: решётка над трубами в воде, тянется и в разрушенную часть справа ---------- */
  const FW = RIGHT - LEFT, FX = (RIGHT + LEFT) / 2, FD = FRONT - BACK + 11, FZ = (FRONT + BACK - 11) / 2;
  plane(FW, FD, mat(t.under, null, [8, 8], { r: 0.1, m: 0.4, cc: 1, k: 0.35 }), [FX, F - 0.45, FZ], [-Math.PI / 2, 0, 0]);
  const grateMat = new THREE.MeshStandardNodeMaterial({ roughness: 0.36, metalness: 0.85, alphaTest: 0.5 });
  const gu = uv().mul(vec2(15, 11));
  grateMat.colorNode = texture(t.grate, gu).rgb.mul(0.55);
  grateMat.opacityNode = texture(t.grate, gu).a;
  plane(FW, FD, grateMat, [FX, F, FZ], [-Math.PI / 2, 0, 0]);

  /* ---------- стены и потолок ---------- */
  const backM = mat(t.torn, t.tornH, [9, 4], { k: 0.55, b: 1.6, m: 0.5, r: 0.55, side: THREE.DoubleSide });
  const sideM = mat(t.panel, t.panelH, [8, 3], { k: 0.5, m: 0.5, r: 0.5 });
  /* задняя стена с проломом справа от глаза: куски вокруг дыры */
  plane(HOLE.x0 - LEFT, H, backM, [(HOLE.x0 + LEFT) / 2, F + H / 2, BACK]);
  plane(RIGHT - HOLE.x1, H, backM, [(RIGHT + HOLE.x1) / 2, F + H / 2, BACK]);
  plane(HOLE.x1 - HOLE.x0, CEIL - (F + HOLE.top), backM, [(HOLE.x0 + HOLE.x1) / 2, (CEIL + F + HOLE.top) / 2, BACK]);
  plane(FRONT - BACK, H, sideM, [LEFT, F + H / 2, MIDZ], [0, Math.PI / 2, 0]);
  plane(FRONT - BACK, H, sideM, [RIGHT, F + H / 2, MIDZ], [0, -Math.PI / 2, 0]);
  plane(RIGHT - LEFT, H, sideM, [(RIGHT + LEFT) / 2, F + H / 2, FRONT], [0, Math.PI, 0]);
  /* рваные края пролома: лепестки отогнуты в комнату, взрывом */
  const edgeM = mat(t.torn, t.tornH, [1, 1], { k: 0.5, m: 0.8, r: 0.38, b: 2, side: THREE.DoubleSide });
  for (let i = 0; i < 20; i++) {
    const side = i % 3;
    const g = new THREE.PlaneGeometry(1.2 + Math.random() * 1.5, 0.7 + Math.random() * 1.0, 6, 4), pp = g.attributes.position;
    for (let k = 0; k < pp.count; k++) pp.setZ(k, Math.pow(pp.getX(k), 2) * 0.35 + Math.sin(pp.getY(k) * 4) * 0.05);
    g.computeVertexNormals();
    const m = new THREE.Mesh(g, edgeM);
    if (side === 0) m.position.set(HOLE.x0 + Math.random() * 0.5, F + 0.4 + Math.random() * HOLE.top, BACK + 0.4);
    else if (side === 1) m.position.set(HOLE.x1 - Math.random() * 0.5, F + 0.4 + Math.random() * HOLE.top, BACK + 0.4);
    else m.position.set(HOLE.x0 + Math.random() * (HOLE.x1 - HOLE.x0), F + HOLE.top - 0.2, BACK + 0.4);
    m.rotation.set((Math.random() - 0.5) * 1.2, (Math.random() - 0.5) * 1.6, Math.random() * 3);
    root.add(m);
  }
  plane(RIGHT - LEFT, FD, mat(t.ceil, t.ceilH, [10, 12], { k: 0.42 }), [FX, CEIL, FZ], [Math.PI / 2, 0, 0]);

  /* ---------- за проломом: взрыв из арта Кодекса на изогнутом экране ---------- */
  const bw = 30, bh = 14;
  const bg = new THREE.PlaneGeometry(bw, bh, 40, 1), bp = bg.attributes.position;
  for (let k = 0; k < bp.count; k++) { const x = bp.getX(k); bp.setZ(k, -(x * x) / 46); }
  bg.computeVertexNormals();
  const blastM = new THREE.MeshBasicNodeMaterial({ fog: false });
  blastM.colorNode = texture(t.blast, uv()).rgb.mul(1.05);
  const blast = new THREE.Mesh(bg, blastM);
  blast.position.set((HOLE.x0 + HOLE.x1) / 2 + 1.5, F + bh / 2 - 1.4, BACK - 9.5);
  root.add(blast);
  /* боковые стены той части тоже есть, чтобы за проломом не было пустоты по краям */
  plane(11, H, sideM, [HOLE.x0 - 0.3, F + H / 2, BACK - 5.5], [0, Math.PI / 2, 0]);
  plane(11, H, sideM, [HOLE.x1 + 3, F + H / 2, BACK - 5.5], [0, -Math.PI / 2, 0]);

  /* ---------- балки, световые полосы, лампы ---------- */
  const beamM = new THREE.MeshStandardNodeMaterial({ color: 0x17181b, roughness: 0.5, metalness: 0.8 });
  [2, 7, 12, 17, 22].forEach((z) => {
    const b = new THREE.Mesh(new THREE.BoxGeometry(RIGHT - LEFT, 0.4, 0.34), beamM);
    b.position.set((RIGHT + LEFT) / 2, CEIL - 0.2, z); root.add(b);
  });
  [-10, -6, -2, 2, 6].forEach((x, i) => {
    const lm = new THREE.MeshBasicNodeMaterial();
    lm.colorNode = vec3(0.6, 0.76, 0.95).mul(i === 3 ? 0.3 : 1.4);
    const l = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.05, FRONT - BACK - 4), lm);
    l.position.set(x, CEIL - 0.06, MIDZ); root.add(l);
  });

  /* трубы вдоль стен */
  const pipeM = new THREE.MeshPhysicalNodeMaterial({ color: 0x24272b, roughness: 0.32, metalness: 0.9 });
  [[LEFT + 0.35, 4.2], [LEFT + 0.65, 4.6], [LEFT + 0.3, 3.7], [LEFT + 0.5, 0.2]].forEach(([x, y], i) => {
    const r = 0.1 + (i % 3) * 0.05;
    const p = new THREE.Mesh(new THREE.CylinderGeometry(r, r, FRONT - BACK, 16), pipeM);
    p.rotation.x = Math.PI / 2; p.position.set(x, y, MIDZ); root.add(p);
  });
  [[-11, 3.2], [-6, 2.0], [-1, 3.6], [4, 2.4], [9, 3.0]].forEach(([x, y]) => {
    const p = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, CEIL - y, 12), pipeM);
    p.position.set(x, (CEIL + y) / 2, BACK + 0.3); root.add(p);
  });

  /* ---------- пролом в задней переборке вокруг глаза ---------- */
  const petalM = mat(t.torn, t.tornH, [1, 1], { k: 0.42, m: 0.8, r: 0.38, b: 2.0, side: THREE.DoubleSide });
  const NP = 12;
  for (let k = 0; k < NP; k++) {
    const g = new THREE.PlaneGeometry(1, 1, 8, 10), pp = g.attributes.position;
    const a0 = (k / NP) * Math.PI * 2 + Math.random() * 0.2;
    const half = (Math.PI / NP) * (0.85 + Math.random() * 0.3);
    const r0 = 1.75 + Math.random() * 0.35, r1 = 3.4 + Math.random() * 0.9, bend = 0.55 + Math.random() * 0.5;
    for (let i = 0; i < pp.count; i++) {
      const u = pp.getX(i) + 0.5, v = pp.getY(i) + 0.5;
      const r = r0 + (r1 - r0) * v;
      const w = half * (0.35 + 0.65 * v) * (1 + 0.15 * Math.sin(v * 9 + k));
      const a = a0 + (u - 0.5) * 2 * w;
      pp.setXYZ(i, Math.cos(a) * r, Math.sin(a) * r, BACK + 0.04 + Math.pow(1 - v, 2) * bend + Math.sin(u * 7 + k) * 0.03);
    }
    g.computeVertexNormals();
    root.add(new THREE.Mesh(g, petalM));
  }
  const fleshM = new THREE.MeshPhysicalNodeMaterial({ roughness: 0.4, clearcoat: 0.9, clearcoatRoughness: 0.12, alphaTest: 0.35, side: THREE.DoubleSide });
  const fl = texture(t.flesh, uv());
  fleshM.colorNode = fl.rgb.mul(0.85);
  fleshM.opacityNode = fl.a;
  fleshM.normalNode = bumpMap(texture(t.fleshH, uv()).r, float(2.4));
  plane(12, 12, fleshM, [0, 0.4, BACK + 0.03]);
  plane(8, 8, fleshM, [0.3, -0.2, BACK + 0.45], [0, 0, 1.3]).renderOrder = 1;

  /* ---------- слева: стойки с оборудованием ---------- */
  const rackSide = new THREE.MeshStandardNodeMaterial({ color: 0x15171a, roughness: 0.45, metalness: 0.8 });
  const rackFront = new THREE.MeshStandardNodeMaterial({ roughness: 0.4, metalness: 0.7 });
  rackFront.colorNode = texture(t.rack, uv()).rgb.mul(0.7);
  rackFront.emissiveNode = texture(t.rackGlow, uv()).r.mul(vec3(0.45, 0.75, 1.0)).mul(5);
  for (let i = 0; i < 6; i++) {
    const r = new THREE.Mesh(new THREE.BoxGeometry(0.88, 4.0, 0.95), [rackSide, rackSide, rackSide, rackSide, rackFront, rackSide]);
    r.position.set(-12.6 + i * 0.92, F + 2.0, BACK + 0.55 + (i % 2) * 0.06); root.add(r);
  }
  /* вдоль левой стены ещё ряд стоек, повёрнутых к комнате */
  for (let i = 0; i < 5; i++) {
    const r = new THREE.Mesh(new THREE.BoxGeometry(0.88, 4.0, 0.95), [rackSide, rackSide, rackSide, rackSide, rackFront, rackSide]);
    r.rotation.y = Math.PI / 2;
    r.position.set(LEFT + 0.55, F + 2.0, 9 + i * 0.92); root.add(r);
  }

  /* пульты с мониторами: кадры на экранах застыли */
  const deskM = new THREE.MeshPhysicalNodeMaterial({ color: 0x1b1e22, roughness: 0.35, metalness: 0.75, clearcoat: 0.4 });
  const screenM = t.screens.map((tx) => { const m = new THREE.MeshBasicNodeMaterial(); m.colorNode = texture(tx, uv()).rgb.mul(1.6); return m; });
  function monitor(parent, s, pos, rotY, w = 1.15) {
    const g = new THREE.Group();
    const frame = new THREE.Mesh(new THREE.BoxGeometry(w + 0.08, w * 0.625 + 0.08, 0.06), deskM);
    const sc = new THREE.Mesh(new THREE.PlaneGeometry(w, w * 0.625), screenM[s]);
    sc.position.z = 0.032;
    const st = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.03, 0.45, 10), deskM);
    st.position.y = -w * 0.32 - 0.22;
    g.add(frame, sc, st); g.position.set(...pos); g.rotation.y = rotY;
    parent.add(g);
  }
  function desk(x, z, rotY, screens) {
    const g = new THREE.Group();
    g.position.set(x, F, z); g.rotation.y = rotY;
    const top = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.08, 0.95), deskM); top.position.y = 1.05;
    const body = new THREE.Mesh(new THREE.BoxGeometry(2.3, 1.0, 0.75), deskM); body.position.set(0, 0.52, -0.08);
    const panel = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.05, 0.45), deskM); panel.position.set(0, 1.14, 0.2); panel.rotation.x = -0.35;
    g.add(top, body, panel);
    screens.forEach((s, i) => monitor(g, s, [(i - (screens.length - 1) / 2) * 1.22, 1.88, -0.25], 0));
    root.add(g);
  }
  desk(-6.6, 3.0, 0.55, [0, 4]);
  desk(-8.4, 6.6, 0.8, [2, 3]);
  desk(-5.0, 0.3, 0.3, [1]);
  monitor(root, 5, [CHAIR.x - 1.2, F + 1.55, CHAIR.z - 0.6], 0.7, 0.7);

  /* ---------- колбы ---------- */
  const glassM = new THREE.MeshPhysicalNodeMaterial({ color: 0x9fb7c8, roughness: 0.04, metalness: 0.1, transparent: true, opacity: 0.16, clearcoat: 1 });
  const capM = new THREE.MeshStandardNodeMaterial({ color: 0x22252a, roughness: 0.35, metalness: 0.9 });
  [[3.7, 1.0, 0.1], [4.7, 0.55, 0.5], [-10.6, 0.9, 11.5], [-10.6, 0.25, 13.0]].forEach(([x, level, z]) => {
    const g = new THREE.Group(); g.position.set(x, F, z);
    const liqM = new THREE.MeshBasicNodeMaterial();
    liqM.colorNode = texture(t.tank, uv()).rgb.mul(0.75);
    const lh = 3.2 * level;
    const liq = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, lh, 32, 1, true), liqM);
    liq.position.y = 0.25 + lh / 2;
    const gl = new THREE.Mesh(new THREE.CylinderGeometry(0.43, 0.43, 3.25, 32, 1, true), glassM);
    gl.position.y = 0.25 + 1.62;
    const b = new THREE.Mesh(new THREE.CylinderGeometry(0.52, 0.56, 0.28, 32), capM); b.position.y = 0.14;
    const c = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.22, 32), capM); c.position.y = 3.6;
    g.add(liq, gl, b, c); root.add(g);
  });

  /* ---------- тележки с колбами, как на панораме ---------- */
  const flaskM = new THREE.MeshPhysicalNodeMaterial({ color: 0x7fd8e8, roughness: 0.05, transparent: true, opacity: 0.35, emissive: 0x0a3a44 });
  [[3.6, 9.5, 0.4], [-3.2, 12.5, -0.3]].forEach(([x, z, ry]) => {
    const g = new THREE.Group(); g.position.set(x, F, z); g.rotation.y = ry;
    [0.35, 0.95].forEach((y) => { const s = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.04, 0.7), deskM); s.position.y = y; g.add(s); });
    [[-0.6, -0.3], [0.6, -0.3], [-0.6, 0.3], [0.6, 0.3]].forEach(([a, b]) => { const l = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1, 8), deskM); l.position.set(a, 0.5, b); g.add(l); });
    for (let i = 0; i < 5; i++) { const f = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.09, 0.28, 16), flaskM); f.position.set(-0.45 + i * 0.22, 1.11, (i % 2) * 0.2 - 0.1); g.add(f); }
    root.add(g);
  });

  /* ---------- платформа под креслом ---------- */
  const plat = new THREE.Mesh(new THREE.CylinderGeometry(1.25, 1.4, 0.16, 64), deskM);
  plat.position.set(CHAIR.x, F + 0.08, CHAIR.z); root.add(plat);
  const ringM = new THREE.MeshBasicNodeMaterial(); ringM.colorNode = vec3(0.45, 0.72, 1.0).mul(1.6);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1.3, 0.018, 8, 96), ringM);
  ring.rotation.x = Math.PI / 2; ring.position.set(CHAIR.x, F + 0.17, CHAIR.z); root.add(ring);

  return { root };
}

/* Весь свет лаборатории отдельно. Он добавляется в сцену в самом начале: если свет появится позже,
   браузер перекомпилирует шейдеры всех уже готовых материалов, и сцена подвиснет */
export function buildLights(THREE) {
  const g = new THREE.Group();
  const F = FLOOR, { CEIL, BACK, HOLE } = ROOM;
  const add = (l, x, y, z) => { l.position.set(x, y, z); g.add(l); return l; };
  /* взрыв за проломом заливает комнату */
  add(new THREE.PointLight(0xff7a30, 210, 60, 1.3), (HOLE.x0 + HOLE.x1) / 2, F + 4.2, BACK - 4.5);
  /* огонь в самом проломе */
  add(new THREE.PointLight(0xff7428, 22, 30, 1.7), 8.2, -0.9 + 2.6, -1.0 + 2.4);
  /* лампы под потолком */
  [[-9, 4], [-9, 14], [-3, 9], [3, 17]].forEach(([x, z]) => add(new THREE.PointLight(0x9cc4ff, 16, 16, 1.6), x, CEIL - 0.8, z));
  /* мониторы слева */
  add(new THREE.PointLight(0x5ea6ff, 14, 12, 1.8), -7.2, F + 2.4, 4.8);
  /* контровой свет на кресле */
  add(new THREE.PointLight(0xff8a40, 6, 7, 2), CHAIR.x + 1.6, F + 2.6, CHAIR.z - 1.3);
  /* слабый общий свет: комната видна, но остаётся тёмной */
  g.add(new THREE.HemisphereLight(0x5a6f92, 0x1c0c06, 0.9));
  return g;
}
