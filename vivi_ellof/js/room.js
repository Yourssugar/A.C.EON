/* Комната лаборатории: пол-решётка над трубами в воде, стены, потолок со световыми полосами,
   пролом в задней переборке (рваные лепестки металла и плоть, расползающаяся по стене),
   стойки с оборудованием слева, пульты с застывшими экранами, колбы справа, платформа под креслом,
   выгнутые панели у взрыва. Материалы Кодекса из tex2/.
   buildRoom(THREE, t, Q) -> { root } */

import { FLOOR, CHAIR } from './lab.js';

export function buildRoom(THREE, t, Q) {
  const T = THREE.TSL;
  const { uv, vec2, vec3, float, texture, bumpMap, mix, smoothstep, length, positionWorld } = T;
  const root = new THREE.Group();
  const F = FLOOR, CEIL = 4.6, BACK = -1.15, LEFT = -10, RIGHT = 10, FRONT = 16;
  const H = CEIL - F;

  function mat(map, h, rep, o = {}) {
    const m = new THREE.MeshPhysicalNodeMaterial({ roughness: o.r ?? 0.5, metalness: o.m ?? 0.7, clearcoat: o.cc ?? 0, clearcoatRoughness: 0.15, side: o.side || THREE.FrontSide });
    const u = uv().mul(vec2(rep[0], rep[1]));
    m.colorNode = texture(map, u).rgb.mul(o.k ?? 0.3);
    if (h) m.normalNode = bumpMap(texture(h, u).r, float(o.b ?? 1.2));
    return m;
  }
  function plane(w, h, m, pos, rot) {
    const p = new THREE.Mesh(new THREE.PlaneGeometry(w, h), m);
    p.position.set(...pos); if (rot) p.rotation.set(...rot);
    root.add(p); return p;
  }

  /* ---------- пол: решётка, под ней трубы и вода ---------- */
  plane(RIGHT - LEFT, FRONT - BACK, mat(t.under, null, [6, 5], { r: 0.12, m: 0.4, cc: 1, k: 0.22 }),
    [0, F - 0.45, (FRONT + BACK) / 2], [-Math.PI / 2, 0, 0]);
  const grateMat = new THREE.MeshStandardNodeMaterial({ roughness: 0.38, metalness: 0.85, alphaTest: 0.5 });
  const gu = uv().mul(vec2(11, 9));
  grateMat.colorNode = texture(t.grate, gu).rgb.mul(0.42);
  grateMat.opacityNode = texture(t.grate, gu).a;
  plane(RIGHT - LEFT, FRONT - BACK, grateMat, [0, F, (FRONT + BACK) / 2], [-Math.PI / 2, 0, 0]);

  /* ---------- стены и потолок ---------- */
  const wallM = mat(t.torn, t.tornH, [7, 3], { k: 0.42, b: 1.6, m: 0.55, r: 0.55 });
  plane(RIGHT - LEFT, H, wallM, [0, F + H / 2, BACK]);
  const sideM = mat(t.panel, t.panelH, [6, 3], { k: 0.34, m: 0.55, r: 0.5 });
  plane(FRONT - BACK, H, sideM, [LEFT, F + H / 2, (FRONT + BACK) / 2], [0, Math.PI / 2, 0]);
  plane(FRONT - BACK, H, sideM, [RIGHT, F + H / 2, (FRONT + BACK) / 2], [0, -Math.PI / 2, 0]);
  plane(RIGHT - LEFT, FRONT - BACK, mat(t.ceil, t.ceilH, [8, 7], { k: 0.25 }), [0, CEIL, (FRONT + BACK) / 2], [Math.PI / 2, 0, 0]);

  /* балки и световые полосы под потолком; одна полоса застыла на полпути вспышки */
  const beamM = new THREE.MeshStandardNodeMaterial({ color: 0x141518, roughness: 0.5, metalness: 0.8 });
  [1.5, 5.5, 9.5, 13.5].forEach((z) => {
    const b = new THREE.Mesh(new THREE.BoxGeometry(RIGHT - LEFT, 0.35, 0.3), beamM);
    b.position.set(0, CEIL - 0.18, z); root.add(b);
  });
  [-5, -1.8, 1.8, 5].forEach((x, i) => {
    const lm = new THREE.MeshBasicNodeMaterial();
    const k = i === 2 ? 0.35 : 1;
    lm.colorNode = vec3(0.55, 0.7, 0.9).mul(k * 0.9);
    const l = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.04, 13), lm);
    l.position.set(x, CEIL - 0.05, 7.5); root.add(l);
  });

  /* трубы вдоль стен */
  const pipeM = new THREE.MeshPhysicalNodeMaterial({ color: 0x1b1d20, roughness: 0.35, metalness: 0.9 });
  [[LEFT + 0.35, 3.3], [LEFT + 0.6, 3.6], [LEFT + 0.3, 2.9], [RIGHT - 0.4, 3.4], [RIGHT - 0.7, 3.7]].forEach(([x, y], i) => {
    const r = 0.09 + (i % 3) * 0.04;
    const p = new THREE.Mesh(new THREE.CylinderGeometry(r, r, FRONT - BACK, 16), pipeM);
    p.rotation.x = Math.PI / 2; p.position.set(x, y, (FRONT + BACK) / 2); root.add(p);
  });

  /* ---------- пролом в переборке ---------- */
  /* рваные лепестки металла вокруг дыры, выгнуты наружу, к зрителю */
  const petalM = mat(t.torn, t.tornH, [1, 1], { k: 0.32, m: 0.85, r: 0.38, b: 2.0, side: THREE.DoubleSide });
  const NP = 11;
  for (let k = 0; k < NP; k++) {
    const g = new THREE.PlaneGeometry(1, 1, 8, 10), pp = g.attributes.position;
    const a0 = (k / NP) * Math.PI * 2 + Math.random() * 0.2;
    const half = (Math.PI / NP) * (0.85 + Math.random() * 0.3);
    const r0 = 1.75 + Math.random() * 0.35, r1 = 3.3 + Math.random() * 0.8, bend = 0.55 + Math.random() * 0.5;
    for (let i = 0; i < pp.count; i++) {
      const u = pp.getX(i) + 0.5, v = pp.getY(i) + 0.5;
      const r = r0 + (r1 - r0) * v;
      const w = half * (0.35 + 0.65 * v) * (1 + 0.15 * Math.sin(v * 9 + k));
      const a = a0 + (u - 0.5) * 2 * w;
      const z = BACK + 0.04 + Math.pow(1 - v, 2) * bend + Math.sin(u * 7 + k) * 0.03;
      pp.setXYZ(i, Math.cos(a) * r, Math.sin(a) * r, z);
    }
    g.computeVertexNormals();
    root.add(new THREE.Mesh(g, petalM));
  }
  /* плоть, расползающаяся по стене от пролома */
  const fleshM = new THREE.MeshPhysicalNodeMaterial({ roughness: 0.4, clearcoat: 0.9, clearcoatRoughness: 0.12, alphaTest: 0.35, side: THREE.DoubleSide });
  const fl = texture(t.flesh, uv());
  fleshM.colorNode = fl.rgb.mul(0.75);
  fleshM.opacityNode = fl.a;
  fleshM.normalNode = bumpMap(texture(t.fleshH, uv()).r, float(2.4));
  plane(10.5, 10.5, fleshM, [0, 0.1, BACK + 0.03]);
  const fl2 = plane(7, 7, fleshM, [0.3, -0.2, BACK + 0.45], [0, 0, 1.3]);
  fl2.renderOrder = 1;

  /* ---------- слева: стойки с оборудованием ---------- */
  const rackSide = new THREE.MeshStandardNodeMaterial({ color: 0x0f1012, roughness: 0.45, metalness: 0.8 });
  const rackFront = new THREE.MeshStandardNodeMaterial({ roughness: 0.4, metalness: 0.7 });
  rackFront.colorNode = texture(t.rack, uv()).rgb.mul(0.45);
  rackFront.emissiveNode = texture(t.rackGlow, uv()).r.mul(vec3(0.45, 0.75, 1.0)).mul(4);
  [-7.6, -6.7, -5.8, -4.9].forEach((x, i) => {
    const r = new THREE.Mesh(new THREE.BoxGeometry(0.86, 3.7, 0.95), [rackSide, rackSide, rackSide, rackSide, rackFront, rackSide]);
    r.position.set(x, F + 1.85, BACK + 0.55 + (i % 2) * 0.08); root.add(r);
  });

  /* пульты с мониторами: кадры на экранах застыли */
  const deskM = new THREE.MeshPhysicalNodeMaterial({ color: 0x15171a, roughness: 0.35, metalness: 0.75, clearcoat: 0.4 });
  const screenM = [];
  for (let i = 1; i <= 6; i++) {
    const m = new THREE.MeshBasicNodeMaterial();
    m.colorNode = texture(t.screens[i - 1], uv()).rgb.mul(1.5);
    screenM.push(m);
  }
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
    const top = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.08, 0.95), deskM); top.position.y = 1.05;
    const body = new THREE.Mesh(new THREE.BoxGeometry(2.1, 1.0, 0.75), deskM); body.position.set(0, 0.52, -0.08);
    const panel = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.05, 0.45), deskM); panel.position.set(0, 1.14, 0.2); panel.rotation.x = -0.35;
    g.add(top, body, panel);
    screens.forEach((s, i) => monitor(g, s, [(i - (screens.length - 1) / 2) * 1.22, 1.88, -0.25], 0));
    root.add(g);
  }
  desk(-4.3, 3.2, 0.62, [0, 4]);
  desk(-5.6, 5.9, 0.85, [2, 3]);
  desk(-3.4, 0.5, 0.35, [1]);
  /* у самого кресла маленький монитор на стойке: почти чёрный, одна линия */
  monitor(root, 5, [CHAIR.x - 1.15, F + 1.55, CHAIR.z - 0.6], 0.7, 0.7);
  const coldL = new THREE.PointLight(0x5ea6ff, 9, 10, 2);
  coldL.position.set(-4.6, F + 2.3, 4.6); root.add(coldL);

  /* ---------- справа: колбы ---------- */
  const glassM = new THREE.MeshPhysicalNodeMaterial({ color: 0x9fb7c8, roughness: 0.04, metalness: 0.1, transparent: true, opacity: 0.16, clearcoat: 1 });
  const capM = new THREE.MeshStandardNodeMaterial({ color: 0x1a1c1f, roughness: 0.35, metalness: 0.9 });
  [[4.6, 1.0], [5.8, 0.55]].forEach(([x, level], i) => {
    const g = new THREE.Group(); g.position.set(x, F, BACK + 1.0 + i * 0.2);
    const liqM = new THREE.MeshBasicNodeMaterial();
    liqM.colorNode = texture(t.tank, uv()).rgb.mul(0.55);
    const lh = 3.2 * level;
    const liq = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, lh, 32, 1, true), liqM);
    liq.position.y = 0.25 + lh / 2;
    const gl = new THREE.Mesh(new THREE.CylinderGeometry(0.43, 0.43, 3.25, 32, 1, true), glassM);
    gl.position.y = 0.25 + 1.62;
    const b = new THREE.Mesh(new THREE.CylinderGeometry(0.52, 0.56, 0.28, 32), capM); b.position.y = 0.14;
    const c = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.22, 32), capM); c.position.y = 3.6;
    g.add(liq, gl, b, c); root.add(g);
  });

  /* ---------- платформа под креслом ---------- */
  const plat = new THREE.Mesh(new THREE.CylinderGeometry(1.25, 1.4, 0.16, 64), deskM);
  plat.position.set(CHAIR.x, F + 0.08, CHAIR.z); root.add(plat);
  const ringM = new THREE.MeshBasicNodeMaterial(); ringM.colorNode = vec3(0.45, 0.72, 1.0).mul(1.4);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1.3, 0.016, 8, 96), ringM);
  ring.rotation.x = Math.PI / 2; ring.position.set(CHAIR.x, F + 0.17, CHAIR.z); root.add(ring);

  /* ---------- у взрыва: выгнутые и сорванные панели ---------- */
  const bentM = mat(t.torn, t.tornH, [1, 1], { k: 0.35, m: 0.85, r: 0.35, side: THREE.DoubleSide });
  for (let i = 0; i < 9; i++) {
    const g = new THREE.PlaneGeometry(1.4 + Math.random(), 1.0 + Math.random() * 0.8, 6, 6), pp = g.attributes.position;
    for (let k = 0; k < pp.count; k++) pp.setZ(k, Math.pow(pp.getX(k), 2) * 0.25 + Math.sin(pp.getY(k) * 3) * 0.05);
    g.computeVertexNormals();
    const m = new THREE.Mesh(g, bentM);
    m.position.set(6.2 + Math.random() * 3, F + 0.5 + Math.random() * 3.8, 1.2 + Math.random() * 5);
    m.rotation.set(Math.random() * 1.5, Math.random() * 6, Math.random() * 1.5);
    root.add(m);
  }

  /* слабый общий свет: комната проступает из темноты, но остаётся тёмной */
  root.add(new THREE.HemisphereLight(0x3c4d6a, 0x120808, 0.55));
  const wash = new THREE.PointLight(0xff6a2a, 18, 16, 1.6);
  wash.position.set(7.5, F + 2.5, 1.5); root.add(wash);

  return { root };
}
