/* Наполнение лаборатории рисунками Кодекса (props/*.webp): плакаты, таблички, доски, дверь, щиты,
   мебель, вещи на столах, пятна на стенах, мелочь в воздухе. Все текстуры идут через js/stream.js:
   сначала малые копии, полные подгружаются, только когда вещь крупно в кадре.
   Вырезки освещены светом сцены лишь частично (рисунки уже со своим светом), поэтому
   аварийные лампы и мигание потолка на них видны, но картинку не съедают.

   buildProps(THREE, ROOM, FLOOR, stream) -> { root } */

/* прямоугольники кусочков на листах: [u, v снизу, ширина, высота] */
const SIGNS = [[0.0166, 0.8135, 0.2168, 0.123], [0.2666, 0.8135, 0.2168, 0.123], [0.5166, 0.8135, 0.2168, 0.123], [0.7666, 0.8135, 0.2168, 0.123],
  [0.0166, 0.5635, 0.2168, 0.123], [0.2666, 0.5635, 0.2168, 0.123], [0.5166, 0.5635, 0.2168, 0.123], [0.7666, 0.5635, 0.2168, 0.123],
  [0.0166, 0.3135, 0.2168, 0.123], [0.2666, 0.3135, 0.2168, 0.123], [0.5166, 0.3135, 0.2168, 0.123], [0.7666, 0.3135, 0.2168, 0.123],
  [0.0166, 0.0635, 0.2168, 0.123], [0.2666, 0.0635, 0.2168, 0.123], [0.5166, 0.0635, 0.2168, 0.123], [0.7666, 0.0635, 0.2168, 0.123]];
/* названия табличек по порядку на листе */
const SIGN = { sector7: 0, l7: 1, protocol: 2, access4: 3, voltage: 4, bio: 5, radiation: 6, noentry: 7,
  rack1: 8, rack2: 9, exitR: 10, exitL: 11, rack3: 12, rack4: 13, sectorL: 14, sectorR: 15 };
const AIR = {
  air_glass_sheet: [[0.0835, 0.7827, 0.082, 0.1826], [0.2979, 0.7832, 0.1558, 0.1826], [0.5342, 0.7876, 0.1831, 0.1738], [0.7832, 0.7886, 0.1826, 0.1733], [0.082, 0.5327, 0.0864, 0.1846], [0.2852, 0.5464, 0.1802, 0.1592], [0.5747, 0.5327, 0.1006, 0.1841], [0.8091, 0.5347, 0.1309, 0.1816], [0.0332, 0.333, 0.1841, 0.0845], [0.3237, 0.2827, 0.1011, 0.1826], [0.5352, 0.3003, 0.1816, 0.1499], [0.8149, 0.2847, 0.1187, 0.1807], [0.0527, 0.0352, 0.146, 0.1816], [0.3584, 0.0332, 0.0332, 0.1831], [0.5488, 0.0342, 0.1538, 0.1821], [0.7837, 0.0347, 0.1816, 0.1816]],
  air_paper_sheet: [[0.0356, 0.7842, 0.1787, 0.1821], [0.2827, 0.7905, 0.1831, 0.1689], [0.5342, 0.811, 0.1821, 0.1284], [0.7842, 0.7847, 0.1816, 0.1807], [0.0352, 0.5332, 0.1787, 0.1821], [0.2827, 0.5396, 0.1836, 0.1719], [0.5327, 0.5576, 0.1846, 0.1348], [0.7837, 0.5435, 0.1821, 0.1626], [0.0342, 0.3057, 0.1821, 0.1382], [0.2827, 0.3047, 0.1831, 0.1401], [0.5327, 0.2998, 0.1831, 0.1504], [0.7886, 0.2832, 0.1714, 0.1841], [0.0332, 0.0532, 0.1826, 0.1445], [0.2827, 0.0596, 0.1831, 0.1318], [0.5332, 0.0337, 0.1836, 0.1831], [0.7842, 0.0566, 0.1816, 0.1372]],
  air_parts_sheet: [[0.042, 0.7832, 0.167, 0.1826], [0.2847, 0.7871, 0.1802, 0.1763], [0.5342, 0.7837, 0.1826, 0.1807], [0.7969, 0.7842, 0.1548, 0.1816], [0.0342, 0.542, 0.1831, 0.1665], [0.2988, 0.5332, 0.1504, 0.1836], [0.5596, 0.5342, 0.1328, 0.1816], [0.7905, 0.5327, 0.1675, 0.1841], [0.0439, 0.2827, 0.1631, 0.1831], [0.2832, 0.2881, 0.1821, 0.1729], [0.5352, 0.2861, 0.1812, 0.1768], [0.7935, 0.2827, 0.1611, 0.1826], [0.0342, 0.0469, 0.1816, 0.1577], [0.2915, 0.0342, 0.166, 0.1831], [0.5459, 0.0342, 0.1567, 0.1831], [0.7964, 0.0352, 0.1558, 0.1812]]
};
/* листы, где кусочки стоят ровной сеткой 4 x 4 */
const grid4 = () => { const r = []; for (let y = 3; y >= 0; y--) for (let x = 0; x < 4; x++) r.push([x / 4 + 0.01, y / 4 + 0.01, 0.23, 0.23]); return r; };
AIR.air_liquid_sheet = grid4();
const STAINS = grid4();

export const PROP_NAMES = ['signs_sheet', 'air_glass_sheet', 'air_paper_sheet', 'air_parts_sheet', 'air_liquid_sheet', 'wall_stains_sheet',
  'first_aid', 'corkboard', 'whiteboard', 'calendar', 'poster_safety_1', 'poster_safety_2', 'poster_safety_3', 'poster_safety_4',
  'control_panel', 'vent_smoke', 'digital_clock', 'lab_map', 'fire_station', 'door_lock', 'monitor_cracked',
  'chair_fallen', 'equipment_crates', 'cabinet_open', 'tool_cart', 'trash_bin', 'cable_coils', 'power_supply', 'safety_goggles',
  'floor_puddle', 'keyboard', 'printout_stacks', 'desk_snack', 'laptop', 'desk_lamp', 'microscope_tubes'];

export function buildProps(THREE, ROOM, FLOOR, stream) {
  const T = THREE.TSL;
  const { vec2, float, uv, instancedBufferAttribute } = T;
  const { LEFT, RIGHT, BACK } = ROOM;
  const F = FLOOR;
  const CAM = { x: 0.6, z: 16.5 };
  const root = new THREE.Group();

  function mat(name, uvNode, o) {
    o = o || {};
    const n = stream.node(name, uvNode);
    const m = new THREE.MeshStandardNodeMaterial({ roughness: 0.85, metalness: 0, side: THREE.DoubleSide,
      transparent: !!o.soft, depthWrite: !o.soft, alphaTest: o.soft ? 0 : 0.45 });
    const k = o.k || 1;
    m.colorNode = n.rgb.mul(0.7 * k);
    m.emissiveNode = n.rgb.mul(0.32 * k);
    m.opacityNode = o.soft ? n.a.mul(o.soft) : n.a;
    if (o.soft) { m.polygonOffset = true; m.polygonOffsetFactor = -1; }
    return m;
  }
  const rectUV = (r) => vec2(r[0], r[1]).add(uv().mul(vec2(r[2], r[3])));

  /* на стене: side L / R / B; t вдоль стены (z для боковых, x для задней), y от пола, центр картинки */
  function wall(name, side, t, y, w, h, o) {
    o = o || {};
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat(name, o.rect ? rectUV(o.rect) : null, o));
    const off = o.off || 0.03;
    if (side === 'L') { m.position.set(LEFT + off, F + y, t); m.rotation.y = Math.PI / 2; }
    else if (side === 'R') { m.position.set(RIGHT - off, F + y, t); m.rotation.y = -Math.PI / 2; }
    else { m.position.set(t, F + y, BACK + off); }
    if (o.roll) m.rotateZ(o.roll);
    root.add(m);
    stream.attach(name, m, Math.max(w, h));
    return m;
  }
  /* стоит или висит в комнате, повёрнут к дальней точке камеры; y центра от пола */
  function stand(name, x, y, z, w, h, o) {
    o = o || {};
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat(name, null, o));
    m.position.set(x, F + y, z);
    m.rotation.y = Math.atan2(CAM.x - x, CAM.z - z);
    if (o.roll) m.rotateZ(o.roll);
    root.add(m);
    stream.attach(name, m, Math.max(w, h));
    return m;
  }
  const sign = (key, side, t, y, s) => wall('signs_sheet', side, t, y, 0.88 * (s || 1), 0.5 * (s || 1), { rect: SIGNS[SIGN[key]], off: 0.035 });

  /* ---------- левая стена (стойки у неё с z = 9 по 13) ---------- */
  wall('first_aid', 'L', -0.45, 1.6, 0.7, 0.7);
  wall('corkboard', 'L', 1.45, 2.1, 1.8, 1.2);
  wall('whiteboard', 'L', 4.4, 2.0, 3.0, 1.5);
  wall('calendar', 'L', 6.4, 3.25, 0.5, 0.67, { roll: 0.04 });
  wall('poster_safety_1', 'L', 6.55, 1.75, 0.7, 0.97);
  wall('poster_safety_2', 'L', 7.55, 1.8, 0.7, 0.97, { roll: -0.03 });
  sign('sector7', 'L', 4.4, 3.45);
  sign('rack1', 'L', 9.5, 4.4, 0.7); sign('rack2', 'L', 11.3, 4.4, 0.7);

  /* ---------- правая стена ---------- */
  wall('control_panel', 'R', 2.4, 1.9, 1.1, 1.1);
  sign('voltage', 'R', 2.4, 3.2);
  wall('poster_safety_3', 'R', 4.2, 1.85, 0.7, 0.97);
  wall('poster_safety_4', 'R', 5.15, 1.85, 0.7, 0.97, { roll: 0.025 });
  wall('vent_smoke', 'R', 6.0, 4.8, 1.0, 1.0);
  wall('digital_clock', 'R', 6.9, 3.4, 1.5, 0.75);
  wall('lab_map', 'R', 8.5, 2.0, 1.6, 1.2);
  wall('fire_station', 'R', 9.9, 1.3, 0.75, 1.0);
  wall('door_lock', 'R', 11.7, 1.45, 1.45, 2.9, { off: 0.05 });
  sign('exitR', 'R', 11.7, 3.3, 0.75);
  sign('noentry', 'R', 10.6, 2.6, 0.6);
  wall('monitor_cracked', 'R', 13.9, 2.5, 1.7, 1.13);

  /* ---------- задняя стена слева от глаза ---------- */
  wall('poster_safety_2', 'B', -6.8, 2.6, 0.7, 0.97);
  sign('protocol', 'B', -4.4, 3.6);
  sign('access4', 'B', -6.8, 3.75, 0.8);
  sign('bio', 'B', -3.0, 2.4, 0.7);

  /* ---------- пол ---------- */
  stand('chair_fallen', -7.4, 0.49, 8.6, 1.3, 0.98);
  stand('equipment_crates', -12.3, 0.65, 7.3, 1.3, 1.3);
  stand('cabinet_open', -7.6, 0.9, -0.15, 0.9, 1.8);
  stand('tool_cart', 8.4, 0.67, 9.0, 1.0, 1.33);
  stand('trash_bin', -9.8, 0.37, 4.3, 0.75, 0.75);
  stand('cable_coils', -3.9, 0.4, 11.2, 0.9, 0.9);
  stand('power_supply', 9.6, 0.42, 6.0, 0.9, 0.9);
  stand('safety_goggles', -2.4, 0.18, 5.4, 0.45, 0.45, { roll: 0.2 });
  {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.6), mat('floor_puddle', null, { soft: 0.9 }));
    m.rotation.x = -Math.PI / 2; m.position.set(1.4, F + 0.03, 10.4);
    root.add(m); stream.attach('floor_puddle', m, 1.6);
  }

  /* ---------- на столах (верх столешниц на высоте ~1,1 м) ---------- */
  stand('keyboard', -6.3, 1.28, 3.4, 0.6, 0.6, { roll: -0.15 });
  stand('printout_stacks', -7.2, 1.38, 2.8, 0.6, 0.6);
  stand('desk_snack', -8.0, 1.36, 7.0, 0.55, 0.55);
  stand('laptop', -8.9, 1.4, 6.3, 0.65, 0.65);
  stand('desk_lamp', -5.6, 1.4, 0.6, 0.6, 0.6);
  stand('microscope_tubes', -4.4, 1.45, 0.5, 0.7, 0.7);

  /* ---------- пятна на стенах: подтёки, копоть, трещины ---------- */
  const rnd = (a, b) => a + Math.random() * (b - a);
  for (let i = 0; i < 22; i++) {
    const r = STAINS[(Math.random() * STAINS.length) | 0];
    const s = rnd(0.7, 1.8);
    const side = i < 8 ? 'L' : i < 16 ? 'R' : 'B';
    const t = side === 'L' ? rnd(-0.8, 8.4) : side === 'R' ? rnd(0, 14) : rnd(-7.5, -2.2);
    wall('wall_stains_sheet', side, t, rnd(0.6, 4.6), s, s, { rect: r, soft: 0.75, k: 0.6, off: 0.012, roll: rnd(-0.3, 0.3) });
  }

  /* ---------- мелочь в воздухе: стекло, бумага, детали, капли ---------- */
  const dummy = new THREE.Object3D();
  Object.entries({ air_glass_sheet: 60, air_paper_sheet: 50, air_parts_sheet: 45, air_liquid_sheet: 35 }).forEach(([name, n]) => {
    const R = AIR[name];
    const rect = new THREE.InstancedBufferAttribute(new Float32Array(n * 4), 4);
    const im = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), null, n);
    for (let i = 0; i < n; i++) {
      const r = R[(Math.random() * R.length) | 0];
      rect.setXYZW(i, r[0], r[1], r[2], r[3]);
      let x, y, z;
      /* гуще к пролому справа; не перед глазом, оттуда смотрит камера в начале */
      do { x = Math.random() < 0.55 ? rnd(1, 10) : rnd(-11, 6); y = rnd(F + 0.4, 4.8); z = rnd(0.8, 11); }
      while (Math.abs(x) < 2.6 && Math.abs(y) < 1.8 && z < 6.5);
      dummy.position.set(x, y, z);
      dummy.rotation.set(0, Math.atan2(CAM.x - x, CAM.z - z), rnd(0, 6.3));
      const sz = (name === 'air_paper_sheet' ? rnd(0.16, 0.32) : name === 'air_liquid_sheet' ? rnd(0.12, 0.3) : rnd(0.07, 0.18));
      dummy.scale.set(sz * r[2] / 0.18, sz * r[3] / 0.18, 1);
      dummy.updateMatrix(); im.setMatrixAt(i, dummy.matrix);
    }
    const R4 = instancedBufferAttribute(rect);
    const m = mat(name, vec2(R4.x, R4.y).add(uv().mul(vec2(R4.z, R4.w))), { k: name === 'air_glass_sheet' ? 1.3 : 1 });
    im.material = m;
    im.frustumCulled = false;
    root.add(im);
    /* для загрузки по взгляду лист считается крупным, если рядом с камерой много кусочков */
    stream.attach(name, im, 3);
  });

  return { root };
}
