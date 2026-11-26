/* Глаз Архитектора: яблоко, радужка, роговица, веки из ткани ядра, гнездо из ткани.
   Масштаб: радиус яблока 1. Смотрит вдоль +Z.
   buildEye(THREE, tex) -> { root, eyeball, set({yaw,pitch,pupil,blink}) }
   tex: { iris, irisH, sclera, tissue, tissueH } (THREE.Texture) */

export function buildEye(THREE, tex) {
  const T = THREE.TSL;
  const { uv, vec2, vec3, float, texture, uniform, length, atan, smoothstep, mix, max, abs, mod, PI, positionLocal,
    positionWorld, mx_noise_float, bumpMap, asin, clamp, normalize, fract, pow } = T;

  const root = new THREE.Group();
  const eyeball = new THREE.Group();
  root.add(eyeball);

  /* края век: высота над центром в середине щели. Нужны шейдерам для тени от век */
  const WC = 0.97;                             /* полуширина щели (уголки) */
  const uHu = uniform(0.4), uHl = uniform(0.46);
  const occlusion = () => {
    const xw = positionWorld.x, yw = positionWorld.y;
    const f = pow(max(float(1).sub(xw.div(WC).mul(xw.div(WC))), 0), 0.85);
    const yu = uHu.mul(f), yl = uHl.mul(f).negate();
    const sU = smoothstep(yu.sub(0.3), yu.add(0.01), yw);
    const sL = smoothstep(yl.add(0.14), yl.sub(0.01), yw);
    const corner = smoothstep(0.55, 1.0, abs(xw).div(WC));
    return float(1).sub(sU.mul(0.78)).sub(sL.mul(0.42)).sub(corner.mul(0.35)).max(0.08);
  };
  const LIMBUS = vec3(0.22, 0.22, 0.25);

  /* ---------- радужка ---------- */
  const IRIS_R = 0.515, IRIS_Z = 0.856;
  const P0 = 0.207;                            /* радиус зрачка на картинке Кодекса */
  const uPupil = uniform(0.3);

  const d = uv().sub(0.5);
  const r = length(d).mul(2);                  /* 0 в центре, 1 на лимбе */
  const ang = atan(d.y, d.x);
  const dir = d.div(max(length(d), float(1e-5)));
  /* зрачок шире или уже: волокна сжимаются и растягиваются по радиусу, как у живого */
  const rt = mix(float(P0), float(1), clamp(r.sub(uPupil).div(float(1).sub(uPupil)), 0, 1));
  const iuv = dir.mul(rt.mul(0.5)).add(0.5);
  const base = texture(tex.iris, iuv).rgb.mul(vec3(1.0, 1.04, 1.12));
  const hgt = texture(tex.irisH, iuv).r;

  /* секторная гетерохромия: янтарный клин, край рваный и идёт по волокнам */
  const a0 = float(0.72);
  const da = abs(mod(ang.sub(a0).add(PI), PI.mul(2)).sub(PI));
  const n = mx_noise_float(vec3(r.mul(7), ang.mul(2.3), 3.1)).mul(0.22)
    .add(mx_noise_float(vec3(r.mul(23), ang.mul(9), 7.7)).mul(0.07));
  const edge = float(0.46).add(n).add(hgt.sub(0.5).mul(0.18));
  const sector = smoothstep(edge, edge.sub(0.12), da).mul(smoothstep(0.98, 0.8, r));
  const lum = base.dot(vec3(0.299, 0.587, 0.114));
  const amber = vec3(0.98, 0.56, 0.2).mul(lum.mul(1.9).add(0.04)).mul(mix(float(0.75), float(1.15), hgt));
  let irisCol = mix(base, amber, sector.mul(0.88));
  /* у зрачка темнее; к краю радужка уходит в тёмное кольцо лимба */
  const pupilEdge = smoothstep(uPupil.sub(0.012), uPupil.add(0.018), r);
  irisCol = irisCol.mul(mix(float(0.55), float(1), smoothstep(uPupil, uPupil.add(0.12), r))).mul(pupilEdge);
  irisCol = mix(irisCol, LIMBUS, smoothstep(0.8, 0.93, r).mul(0.75));

  const irisMat = new THREE.MeshStandardNodeMaterial({ roughness: 0.62, metalness: 0 });
  irisMat.colorNode = irisCol.mul(occlusion());
  irisMat.normalNode = bumpMap(hgt, float(0.9));
  const iris = new THREE.Mesh(new THREE.CircleGeometry(IRIS_R, 160), irisMat);
  iris.position.z = IRIS_Z;
  eyeball.add(iris);

  /* ---------- белок ---------- */
  const scGeo = new THREE.SphereGeometry(1, 160, 120, 0, Math.PI * 2, 0.5, Math.PI - 0.5);
  scGeo.rotateX(Math.PI / 2);
  const pn = normalize(positionLocal);
  /* у Кодекса сосуды по краям развёртки, то есть на затылке яблока. Удваиваем u: сосуды уходят к уголкам */
  const u0 = atan(pn.x, pn.z).div(PI.mul(2)).add(0.5);
  const suv = vec2(fract(u0.mul(2).add(0.5)), asin(pn.y).div(PI).add(0.5));
  const scBase = texture(tex.sclera, suv).rgb.mul(vec3(0.9, 0.86, 0.84));
  /* тонкие сосуды поверх, гуще к уголкам */
  const vn = abs(mx_noise_float(pn.mul(vec3(9, 14, 9)))).add(abs(mx_noise_float(pn.mul(vec3(23, 31, 23)))).mul(0.5));
  const veinMask = smoothstep(0.05, 0.0, vn).mul(smoothstep(0.75, 0.3, pn.z));
  const scV = mix(scBase, vec3(0.55, 0.08, 0.1), veinMask.mul(0.55));
  const scCol = mix(scV, LIMBUS, smoothstep(0.83, 0.876, pn.z).mul(0.75));
  const scMat = new THREE.MeshPhysicalNodeMaterial({ roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.03, sheen: 0.2, sheenColor: new THREE.Color(0xffb8a8) });
  scMat.colorNode = scCol.mul(occlusion());
  const sclera = new THREE.Mesh(scGeo, scMat);
  eyeball.add(sclera);

  /* ---------- роговица ---------- */
  const CR = 0.62, CA = 1.0, CZ = IRIS_Z - CR * Math.cos(CA) + 0.002;
  const coGeo = new THREE.SphereGeometry(CR, 128, 48, 0, Math.PI * 2, 0, CA);
  coGeo.rotateX(Math.PI / 2);
  const coMat = new THREE.MeshPhysicalNodeMaterial({
    transmission: 1, thickness: 0.12, ior: 1.376, roughness: 0.015, metalness: 0,
    clearcoat: 1, clearcoatRoughness: 0.0, transparent: true
  });
  const cornea = new THREE.Mesh(coGeo, coMat);
  cornea.position.z = CZ;
  cornea.renderOrder = 2;
  eyeball.add(cornea);

  /* ---------- веки: поверхность от края щели наружу, край толстый и скруглённый ---------- */
  const NS = 120, ROUND = 9, OUT = 26, NT = ROUND + OUT;
  const RM = 1.015, LT = 0.065;
  const tissueUV = uv().mul(vec2(2.5, 1.2));
  const lidMat = new THREE.MeshPhysicalNodeMaterial({ roughness: 0.55, clearcoat: 1, clearcoatRoughness: 0.1, side: THREE.DoubleSide });
  /* у самого края веко мокрое, дальше сухая ткань ядра */
  const lidT = uv().y;
  const wetK = smoothstep(0.16, 0.32, lidT);
  const tAlb = texture(tex.tissue, tissueUV).rgb;
  lidMat.colorNode = mix(vec3(0.26, 0.085, 0.08), tAlb.mul(vec3(0.95, 0.74, 0.74)), wetK);
  lidMat.clearcoatNode = mix(float(1), float(0.12), wetK);
  lidMat.roughnessNode = mix(float(0.28), float(0.62), wetK);
  lidMat.normalNode = bumpMap(texture(tex.tissueH, tissueUV).r.mul(smoothstep(0.2, 0.45, lidT)), float(1.3));

  /* постоянный шум формы, чтобы веки не были идеальными */
  const lump = new Float32Array(NS * NT);
  for (let i = 0; i < NS; i++) for (let j = 0; j < NT; j++) {
    const s = i / (NS - 1), t = j / (NT - 1);
    lump[i * NT + j] = Math.sin(s * 17.3 + t * 5.1) * 0.5 + Math.sin(s * 41.7 - t * 13.3) * 0.3 + Math.sin(s * 7.1 + t * 23.9) * 0.2;
  }

  function lidMesh(up) {
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(NS * NT * 3), uvs = new Float32Array(NS * NT * 2), idx = [];
    for (let i = 0; i < NS; i++) for (let j = 0; j < NT; j++) {
      uvs[(i * NT + j) * 2] = i / (NS - 1); uvs[(i * NT + j) * 2 + 1] = j / (NT - 1);
      if (i < NS - 1 && j < NT - 1) {
        const a = i * NT + j, b = (i + 1) * NT + j, c = a + 1, e = b + 1;
        if (up) idx.push(a, b, c, b, e, c); else idx.push(a, c, b, b, c, e);
      }
    }
    geo.setIndex(idx);
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    const mesh = new THREE.Mesh(geo, lidMat);
    mesh.frustumCulled = false;
    root.add(mesh);
    return { geo, pos, up };
  }
  const upLid = lidMesh(true), loLid = lidMesh(false);

  /* высота поверхности над глазом: сфера чуть больше яблока, над роговицей выпуклость роговицы */
  function surfZ(x, y, rr) {
    let z = Math.sqrt(Math.max(rr * rr - x * x - y * y, 0.0025));
    const q = x * x + y * y, ce = CR * Math.sin(CA);
    if (q < ce * ce) z = Math.max(z, CZ + Math.sqrt(CR * CR - q) + (rr - RM) + 0.012);
    return z;
  }
  const curve = (s) => Math.pow(Math.max(0, 1 - s * s), 0.85);

  function shapeLid(L, H) {
    const sign = L.up ? 1 : -1, P = L.pos;
    for (let i = 0; i < NS; i++) {
      const s = -1 + 2 * i / (NS - 1);
      const x0 = s * WC, ym = H * curve(s) * (1 + 0.08 * s);
      const yEnd = sign * (L.up ? 1.6 : 1.4) * Math.sqrt(Math.max(0, 1 - s * s));
      for (let j = 0; j < NT; j++) {
        let x, y, rr;
        if (j < ROUND) {
          /* скругление края: от внутренней стороны (лежит на яблоке) до наружной */
          const ph = Math.PI * j / (ROUND - 1);
          rr = RM + LT * 0.5 * (1 - Math.cos(ph));
          y = ym - sign * LT * 0.55 * Math.sin(ph);
          x = x0;
        } else {
          const t = (j - ROUND + 1) / OUT;
          y = ym + (yEnd - ym) * Math.pow(t, 0.9);
          x = x0 * (1 + (0.4 + 0.3 * s * s) * t);
          rr = RM + LT + 0.34 * Math.pow(t, 1.5) + 0.05 * Math.sin(t * Math.PI) + 0.03 * lump[i * NT + j] * Math.min(1, t * 3);
        }
        const k = (i * NT + j) * 3;
        P[k] = x; P[k + 1] = y; P[k + 2] = surfZ(x, y, rr);
      }
    }
    L.geo.attributes.position.needsUpdate = true;
    L.geo.computeVertexNormals();
  }

  /* ---------- гнездо: ткань ядра вокруг глаза ---------- */
  const wallGeo = new THREE.RingGeometry(1.25, 9, 320, 96);
  const wp = wallGeo.attributes.position;
  for (let i = 0; i < wp.count; i++) {
    let x = wp.getX(i), y = wp.getY(i);
    const rr = Math.hypot(x, y), a = Math.atan2(y, x);
    const fall = -0.5 * Math.pow(Math.max(0, rr - 1.35), 0.8);
    const lumpW = Math.sin(a * 3 + rr * 1.7) * 0.05 * rr + Math.sin(a * 7 - rr * 2.3) * 0.025 * rr;
    wp.setX(i, x * 1.12);
    wp.setZ(i, -0.06 + fall + lumpW);
  }
  wallGeo.computeVertexNormals();
  const wallUV = uv().mul(vec2(6, 6));
  const wallMat = new THREE.MeshPhysicalNodeMaterial({ roughness: 0.5, clearcoat: 0.7, clearcoatRoughness: 0.2 });
  wallMat.colorNode = texture(tex.tissue, wallUV).rgb.mul(vec3(0.85, 0.68, 0.68));
  wallMat.normalNode = bumpMap(texture(tex.tissueH, wallUV).r, float(2.2));
  root.add(new THREE.Mesh(wallGeo, wallMat));

  /* верхнее веко ходит за взглядом вверх-вниз, как у человека. Моргает в основном верхнее */
  const UP_OPEN = 0.38, LO_OPEN = 0.47;
  function set(st) {
    eyeball.rotation.set(-st.pitch, st.yaw, 0, 'YXZ');
    uPupil.value = st.pupil;
    const b = st.blink;
    const lo = LO_OPEN - b * 0.1 - st.pitch * 0.12;
    const upOpen = UP_OPEN + st.pitch * 0.5;
    const up = upOpen + (-lo + 0.01 - upOpen) * b;
    uHu.value = up; uHl.value = lo;
    shapeLid(upLid, up);
    shapeLid(loLid, -lo);
  }
  set({ yaw: 0, pitch: 0, pupil: 0.3, blink: 0 });

  return { root, eyeball, set, uPupil };
}
