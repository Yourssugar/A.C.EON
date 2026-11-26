/* Лаборатория в последней доле секунды (содержимое; комната в room.js): ядро вокруг глаза, кабели, кресло Виви,
   Виви (только маска для символов), застывший взрыв справа, стекло и искры в воздухе, 7 осколков памяти.
   Глаз стоит в начале координат и смотрит вдоль +Z, кресло между ним и зрителем.
   buildLab(THREE, tex) -> { root, vivi, shards, update(dt), FLOOR } */

export const FLOOR = -3.4;
export const CHAIR = { x: -1.2, z: 6.2 };

export function buildLab(THREE, tex, Q = {}) {
  const T = THREE.TSL;
  const { uv, vec2, vec3, float, texture, mrt, positionWorld, mx_fractal_noise_float, smoothstep, length, mix,
    time, bumpMap, sin, uniform, normalView, abs } = T;
  const root = new THREE.Group();

  /* ---------- ядро: масса ткани вокруг глаза ---------- */
  const coreMat = new THREE.MeshPhysicalNodeMaterial({ roughness: 0.48, clearcoat: 0.7, clearcoatRoughness: 0.2 });
  const cUV = uv().mul(vec2(5, 3));
  /* к краям ядро уходит в темноту, контура нет */
  const coreFade = smoothstep(float(3.4), float(1.2), length(positionWorld.xy.mul(vec2(0.85, 1))))
    .mul(smoothstep(float(0.05), float(0.55), abs(normalView.z)));
  coreMat.colorNode = texture(tex.tissue, cUV).rgb.mul(vec3(0.75, 0.6, 0.6)).mul(coreFade.mul(0.9).add(0.1));
  coreMat.clearcoatNode = coreFade.mul(0.7);
  coreMat.normalNode = bumpMap(texture(tex.tissueH, cUV).r, float(2.4));
  const coreGeo = new THREE.SphereGeometry(1.95, 128, 96);
  const cp = coreGeo.attributes.position;
  for (let i = 0; i < cp.count; i++) {
    const x = cp.getX(i), y = cp.getY(i), z = cp.getZ(i);
    const k = 1 + 0.12 * Math.sin(x * 2.1 + y * 1.3) + 0.08 * Math.sin(y * 3.7 - z * 2.2) + 0.05 * Math.sin(x * 5.3 + z * 4.1) + 0.04 * Math.sin(x * 9.1 - y * 7.7);
    cp.setXYZ(i, x * k * 1.3, y * k * 1.02 + 0.15, z * k * 0.62);
  }
  coreGeo.computeVertexNormals();
  const core = new THREE.Mesh(coreGeo, coreMat);
  core.position.set(0, 0, -1.05);
  /* шар ядра больше не нужен: пролом заполняют ткань вокруг глаза, лепестки металла и плоть на стене (room.js) */

  /* ---------- кабели ---------- */
  const cableMat = new THREE.MeshPhysicalNodeMaterial({ roughness: 0.35, metalness: 0.3, clearcoat: 0.6, color: 0x121214 });
  const fleshCable = new THREE.MeshPhysicalNodeMaterial({ roughness: 0.4, clearcoat: 0.8 });
  fleshCable.colorNode = texture(tex.tissue, uv().mul(vec2(12, 1))).rgb.mul(0.7);
  function cable(points, r, mat) {
    const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(p[0], p[1], p[2])));
    const m = new THREE.Mesh(new THREE.TubeGeometry(curve, 96, r, 12, false), mat);
    root.add(m);
    return m;
  }
  const cx = CHAIR.x, cz = CHAIR.z, F = FLOOR;
  /* от ядра к креслу: по полу и вверх в спинку */
  for (let i = 0; i < 4; i++) {
    const o = (i - 1.5) * 0.18;
    cable([[0.6 * o, -2.4, -0.2], [o * 2, F + 0.15, 1.8], [cx + o, F + 0.08, cz - 2.2], [cx + o * 0.6, F + 0.3, cz + 0.7], [cx + o * 0.5, F + 1.6, cz + 0.32]],
      0.045 + 0.02 * (i % 2), i % 2 ? fleshCable : cableMat);
  }
  /* от ядра к обручу над головой */
  cable([[0.2, 1.8, 0.2], [-0.6, 2.6, 2.5], [cx, 1.4, cz - 1.2], [cx, F + 2.75, cz - 0.05]], 0.05, cableMat);
  cable([[-0.4, 1.6, 0.4], [-1.4, 2.2, 3.0], [cx - 0.3, 1.0, cz - 0.6], [cx - 0.12, F + 2.7, cz]], 0.035, fleshCable);
  /* от ядра в пол и в темноту */
  [[-2.6, 1], [2.8, -1], [-3.4, -1], [3.6, 1], [1.2, 1]].forEach(([x, s], i) => {
    cable([[x * 0.6, -1.2 + i * 0.3, -0.3], [x, F + 0.3, 1.2 + i * 0.4], [x * 1.6 + s, F + 0.06, 3.5 + i]], 0.06 + (i % 3) * 0.02, i % 2 ? fleshCable : cableMat);
  });

  /* ---------- кресло: спиной к зрителю, лицом к глазу ---------- */
  const chair = new THREE.Group();
  chair.position.set(cx, F, cz);
  const leather = new THREE.MeshPhysicalNodeMaterial({ color: 0x0d0d0f, roughness: 0.45, clearcoat: 0.5, clearcoatRoughness: 0.3, sheen: 0.4, sheenColor: new THREE.Color(0x30343a) });
  const metal = new THREE.MeshPhysicalNodeMaterial({ color: 0x2a2c30, roughness: 0.25, metalness: 0.9 });
  function slab(w, h, d, r) {
    const s = new THREE.Shape(), x = -w / 2, y = -h / 2;
    s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r);
    s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r);
    s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
    const g = new THREE.ExtrudeGeometry(s, { depth: d, bevelEnabled: true, bevelThickness: 0.04, bevelSize: 0.04, bevelSegments: 4, curveSegments: 10 });
    g.translate(0, 0, -d / 2);
    return g;
  }
  const seat = new THREE.Mesh(slab(1.0, 0.95, 0.16, 0.12), leather);
  seat.rotation.x = -Math.PI / 2 + 0.06; seat.position.set(0, 0.92, -0.05);
  const back = new THREE.Mesh(slab(0.95, 0.86, 0.17, 0.14), leather);
  back.position.set(0, 1.4, 0.42); back.rotation.x = -0.16;
  const column = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 0.78, 20), metal);
  column.position.set(0, 0.45, 0);
  const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.6, 0.06, 40), metal);
  foot.position.y = 0.04;
  chair.add(seat, back, column, foot);
  [-1, 1].forEach((sd) => {
    const arm = new THREE.Mesh(slab(0.16, 0.8, 0.12, 0.05), leather);
    arm.rotation.x = -Math.PI / 2; arm.position.set(sd * 0.58, 1.22, -0.12);
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.3, 12), metal);
    post.position.set(sd * 0.58, 1.05, 0.05);
    chair.add(arm, post);
  });
  /* обруч над головой: интерфейс, в него уходят кабели */
  const halo = new THREE.Mesh(new THREE.TorusGeometry(0.27, 0.035, 16, 64), metal);
  halo.rotation.x = Math.PI / 2 - 0.15; halo.position.set(0, 2.62, -0.02);
  const haloGlow = new THREE.Mesh(new THREE.TorusGeometry(0.27, 0.012, 8, 64), new THREE.MeshBasicNodeMaterial({ color: 0x8fc8ff }));
  haloGlow.rotation.copy(halo.rotation); haloGlow.position.copy(halo.position); haloGlow.position.y -= 0.03;
  chair.add(halo, haloGlow);
  root.add(chair);
  /* контровой свет огня на кресле и фигуре: силуэт читается на тёмном */
  const rim = new THREE.PointLight(0xff8a40, 6, 7, 2);
  rim.position.set(cx + 1.6, F + 2.6, cz - 1.3);
  root.add(rim);

  /* ---------- Виви: фигура только для маски символов ----------
     Материал пишет в канал amask единицу. На экране вместо неё будут знаки.
     Видна со спины: голова, волосы на спинке, плечи над спинкой, руки на подлокотниках */
  const viviMat = new THREE.MeshStandardNodeMaterial({ color: 0x9aa4b4, roughness: 0.7 });
  viviMat.mrtNode = mrt({ amask: float(1) });
  const vivi = new THREE.Group();
  vivi.position.copy(chair.position);
  const add = (geo, pos, rot, scale) => {
    const m = new THREE.Mesh(geo, viviMat);
    m.position.set(...pos); if (rot) m.rotation.set(...rot); if (scale) m.scale.set(...scale);
    vivi.add(m); return m;
  };
  add(new THREE.SphereGeometry(0.19, 32, 24), [0, 2.3, -0.02], null, [0.92, 1.08, 1]);              /* голова */
  add(new THREE.SphereGeometry(0.21, 32, 24), [0, 2.24, 0.06], null, [1.05, 1.15, 0.9]);              /* волосы на затылке */
  add(new THREE.CapsuleGeometry(0.17, 0.55, 8, 16), [0, 1.72, 0.17], [0.16, 0, 0], [1.25, 1, 0.75]);  /* волосы по спине */
  add(new THREE.CylinderGeometry(0.07, 0.08, 0.16, 16), [0, 2.08, 0.0]);                               /* шея */
  add(new THREE.CapsuleGeometry(0.15, 0.48, 8, 16), [0, 1.92, 0.05], [0, 0, Math.PI / 2], [1, 1, 0.8]); /* плечи */
  add(new THREE.CapsuleGeometry(0.2, 0.5, 8, 16), [0, 1.5, 0.08], null, [1.05, 1, 0.75]);              /* спина */
  const armR = [
    add(new THREE.CapsuleGeometry(0.06, 0.38, 6, 12), [0.42, 1.64, 0.02], [0.35, 0, 0.18]),
    add(new THREE.CapsuleGeometry(0.052, 0.42, 6, 12), [0.55, 1.36, -0.22], [Math.PI / 2 - 0.15, 0, 0]),
    add(new THREE.SphereGeometry(0.06, 16, 12), [0.57, 1.33, -0.5], null, [0.8, 0.5, 1.4])
  ];
  add(new THREE.CapsuleGeometry(0.06, 0.38, 6, 12), [-0.42, 1.64, 0.02], [0.35, 0, -0.18]);
  add(new THREE.CapsuleGeometry(0.052, 0.42, 6, 12), [-0.55, 1.36, -0.22], [Math.PI / 2 - 0.15, 0, 0]);
  add(new THREE.SphereGeometry(0.06, 16, 12), [-0.57, 1.33, -0.5], null, [0.8, 0.5, 1.4]);
  root.add(vivi);

  /* ---------- застывший взрыв справа: объём из спрайтов, огонь почти не движется ---------- */
  const fireMat = new THREE.SpriteNodeMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false });
  const fd = length(uv().sub(0.5)).mul(2);
  const fn = mx_fractal_noise_float(positionWorld.mul(0.55).add(vec3(0, time.mul(0.004), 0)), Q.fireOct || 2, 2.1, 0.55);
  const dens = smoothstep(float(1), float(0.15), fd.add(fn.mul(0.45)));
  const hot = smoothstep(0.55, 1.0, dens.add(fn.mul(0.2)));
  fireMat.colorNode = mix(mix(vec3(0.35, 0.04, 0.01), vec3(1.0, 0.42, 0.08), dens), vec3(1.0, 0.86, 0.6), hot).mul(0.9);
  fireMat.opacityNode = dens.mul(0.14);
  const fireC = new THREE.Vector3(9.4, -0.9, -1.0);   /* в проломе задней стены справа */
  for (let i = 0; i < Math.min(9, Q.fireCount || 9); i++) {
    const s = new THREE.Sprite(fireMat);
    const a = Math.random() * Math.PI * 2, rr = Math.pow(Math.random(), 0.6) * 3.4;
    s.position.set(fireC.x + Math.cos(a) * rr * 0.9, fireC.y + (Math.random() - 0.1) * 3.0, fireC.z - 2.5 - Math.random() * 4);
    const sz = 1.8 + Math.random() * 2.4; s.scale.set(sz, sz, 1);
    root.add(s);
  }
  const fireLight = new THREE.PointLight(0xff7428, 22, 30, 1.7);
  fireLight.position.set(fireC.x - 1.2, fireC.y + 2.6, fireC.z + 2.4);
  root.add(fireLight);

  /* ---------- стекло в воздухе и на полу, искры ---------- */
  const glassMat = new THREE.MeshPhysicalNodeMaterial({ color: 0x1a2430, roughness: 0.03, metalness: 0.6, transparent: true, opacity: 0.22, clearcoat: 1, side: THREE.DoubleSide });
  const shardGeo = new THREE.TetrahedronGeometry(0.12, 0); shardGeo.scale(1, 1.6, 0.06);
  const NG = 300;
  const glass = new THREE.InstancedMesh(shardGeo, glassMat, NG);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), p = new THREE.Vector3(), e = new THREE.Euler();
  for (let i = 0; i < NG; i++) {
    const nearFire = i < 190;
    if (nearFire) {
      const a = Math.random() * Math.PI * 2, rr = 1.2 + Math.random() * 4;
      p.set(fireC.x + Math.cos(a) * rr * 0.9, fireC.y + (Math.random() - 0.4) * 4.5, fireC.z + 1 + Math.abs(Math.sin(a)) * rr * 1.4);
    } else if (i < 270) {
      p.set((Math.random() - 0.2) * 18, F + 0.01, Math.random() * 12 - 0.5);
    } else {
      p.set(3 + Math.random() * 8, F + 0.5 + Math.random() * 5, 1 + Math.random() * 10);
    }
    const onFloor = i >= 190 && i < 270;
    e.set(onFloor ? -Math.PI / 2 : Math.random() * 6, Math.random() * 6, onFloor ? 0 : Math.random() * 6);
    q.setFromEuler(e);
    const s = 0.25 + Math.random() * 0.75; sc.set(s, s, s);
    m4.compose(p, q, sc); glass.setMatrixAt(i, m4);
  }
  root.add(glass);

  const sparkMat = new THREE.MeshBasicNodeMaterial({ color: 0xffb060 });
  sparkMat.colorNode = vec3(1.0, 0.62, 0.25).mul(2.2);
  const NSP = 260;
  const sparks = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.012, 0), sparkMat, NSP);
  for (let i = 0; i < NSP; i++) {
    const a = Math.random() * Math.PI * 2, rr = 0.6 + Math.pow(Math.random(), 0.7) * 6;
    p.set(fireC.x + Math.cos(a) * rr, fireC.y + (Math.random() - 0.35) * 5, fireC.z + 0.5 + Math.abs(Math.sin(a)) * rr * 1.2);
    q.identity(); const s = 0.6 + Math.random() * 1.8; sc.set(s, s, s * 4);
    m4.compose(p, q, sc); sparks.setMatrixAt(i, m4);
  }
  root.add(sparks);

  /* ---------- 7 осколков памяти: висят в воздухе, внутри мерцают знаки ---------- */
  const shardMat = new THREE.MeshStandardNodeMaterial({ color: 0x0, roughness: 0.2, metalness: 0 });
  const pulse = sin(time.mul(0.9).add(positionWorld.y.mul(3))).mul(0.25).add(0.75);
  shardMat.emissiveNode = vec3(0.55, 0.78, 1.0).mul(pulse).mul(1.4);
  shardMat.mrtNode = mrt({ amask: float(0.85) });
  const SHARD_POS = [[-4.6, -0.2, 4.4], [-3.0, 2.4, 2.2], [3.8, 2.6, 3.0], [3.0, -1.6, 6.2], [-4.4, -2.2, 9.0], [6.4, 0.6, 8.0], [1.2, 2.8, 8.6]];
  const shards = SHARD_POS.map(([x, y, z], i) => {
    const g = new THREE.OctahedronGeometry(0.26, 0); g.scale(0.62, 1.7, 0.62);
    const m = new THREE.Mesh(g, shardMat);
    m.position.set(x, y, z); m.rotation.set(Math.random(), Math.random() * 6, Math.random() * 0.4);
    m.userData = { id: i, base: m.position.clone(), ph: Math.random() * 6 };
    root.add(m);
    return m;
  });

  function update(dt, t) {
    shards.forEach((s) => {
      s.rotation.y += dt * 0.05;
      s.position.y = s.userData.base.y + Math.sin(t * 0.25 + s.userData.ph) * 0.03;
    });
  }

  return { root, vivi, armR, chair, shards, fireLight, glass, update };
}
