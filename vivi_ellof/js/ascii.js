/* Зрение Архитектора: часть кадра собирается из символов.
   Где символы включены:
     маска из сцены (канал amask): Виви = 1, осколки памяти около 0.85;
     луч взгляда: всё, что сейчас в конусе зрения глаза (по глубине кадра);
     края кадра: мир вдали не дорисован.
   Клетки включаются целиком; на границах масок клетки разбросаны случайно, мир «осыпается».
   Яркость клетки выбирает знак по плотности, на резких краях ставятся / \ | - .
   Если есть лист знаков Архитектора (tunnel/glyphs_architect.webp, 16 x 16, строка = плотность),
   плотные знаки берутся из него, у каждой клетки свой столбец.

   makeAscii(THREE, { col, mask, depth }) -> { node, setSize(w,h), setCamera(cam), setGaze(pos, dir) } */

const DENSE = [' ', '.', '`', ':', '-', '~', '=', '+', '*', 'x', 'v', '%', '#', '&', '8', '@'];
const EDGE = ['|', '/', '-', '\\'];
const DIGITS = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];   /* для трубы из чисел на входе */

export function atlasTexture(THREE) {
  const N = DENSE.length + EDGE.length + DIGITS.length, S = 64;
  const c = document.createElement('canvas'); c.width = N * S; c.height = S;
  const g = c.getContext('2d');
  g.fillStyle = '#000'; g.fillRect(0, 0, c.width, c.height);
  g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = '600 50px "JetBrains Mono", "Consolas", monospace';
  DENSE.concat(EDGE, DIGITS).forEach((ch, i) => g.fillText(ch, i * S + S / 2, S / 2 + 2));
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.NoColorSpace;
  t.generateMipmaps = false;
  t.minFilter = THREE.LinearFilter; t.magFilter = THREE.LinearFilter;
  return { tex: t, N };
}

export function makeAscii(THREE, { col, mask, depth, atlasInfo, glyphs }) {
  const T = THREE.TSL;
  const { vec2, vec3, vec4, float, floor, fract, texture, uniform, screenUV, hash, dot, length, smoothstep, mix,
    max, min, step, atan, PI, select, time, perspectiveDepthToViewZ, normalize, clamp } = T;

  const { tex: atlas, N } = atlasInfo || atlasTexture(THREE);
  const ND = DENSE.length;

  const uRes = uniform(new THREE.Vector2(1920, 1080));
  const uCell = uniform(12);
  const uCamMat = uniform(new THREE.Matrix4());
  const uTan = uniform(new THREE.Vector2(0.3, 0.3));
  const uNear = uniform(0.05), uFar = uniform(100);
  const uEye = uniform(new THREE.Vector3(0, 0, 0.9));
  const uDir = uniform(new THREE.Vector3(0, 0, 1));
  const uCamPos = uniform(new THREE.Vector3());
  const uBeam = uniform(1);          /* 0..1, можно гасить луч целиком */
  const uHaze = uniform(1);          /* яркость видимого луча в воздухе */
  const uEdge = uniform(1);          /* сила осыпания краёв */
  const uAll = uniform(0);           /* весь кадр знаками: при раскрытии глаза гаснет волной от центра */

  const px = screenUV.mul(uRes);
  const cell = floor(px.div(uCell));
  const cuv = cell.add(0.5).mul(uCell).div(uRes);
  const local = fract(px.div(uCell));

  const W = vec3(0.299, 0.587, 0.114);
  const cCol = col.sample(cuv).rgb;
  const lum = dot(cCol, W);
  const du = vec2(uCell, 0).div(uRes), dv = vec2(0, uCell).div(uRes);
  const gx = dot(col.sample(cuv.add(du)).rgb, W).sub(dot(col.sample(cuv.sub(du)).rgb, W));
  const gy = dot(col.sample(cuv.add(dv)).rgb, W).sub(dot(col.sample(cuv.sub(dv)).rgb, W));
  const gm = length(vec2(gx, gy));

  /* маски */
  const m = mask.sample(cuv).r;
  const isVivi = smoothstep(0.92, 0.98, m);

  const dz = depth.sample(cuv).r;
  const vz = perspectiveDepthToViewZ(dz, uNear, uFar);
  const ndc = vec2(cuv.x.mul(2).sub(1), float(1).sub(cuv.y.mul(2)));
  const vpos = vec3(ndc.mul(uTan).mul(vz.negate()), vz);
  const wpos = uCamMat.mul(vec4(vpos, 1)).xyz;
  const toP = wpos.sub(uEye);
  const cosA = dot(normalize(toP), uDir);
  const beam = smoothstep(0.986, 0.995, cosA).mul(uBeam);

  const aspect = uRes.x.div(uRes.y);
  const rr = length(cuv.sub(0.5).mul(vec2(aspect, 1))).div(length(vec2(aspect, 1).mul(0.5)));
  const per = smoothstep(0.74, 1.05, rr).mul(uEdge);

  const raw = max(max(m, beam.mul(0.96)), per.mul(0.92));
  const seed = cell.x.add(cell.y.mul(311.7));
  /* порог: в центре выше, поэтому при угасании uAll центр (глаз) становится настоящим первым */
  const allOn = step(mix(hash(seed.add(23.1)), float(1).sub(rr), 0.5), uAll);
  const on = max(step(hash(seed.add(17.3)), raw), allOn);

  /* выбор знака: плотность по яркости, на краях направление, немного мерцания */
  const gain = mix(float(2.2), float(3.2), isVivi);
  const lvScene = clamp(lum.mul(gain), 0, 0.999);
  const lvVivi = clamp(lum.mul(1.3).add(0.2), 0.2, 0.66);
  const lv = mix(lvScene, lvVivi, isVivi);
  let idx = floor(lv.mul(ND));
  const flick = hash(seed.add(floor(time.mul(6)).mul(7.13)));
  idx = select(flick.lessThan(0.05).and(lv.greaterThan(0.06)), floor(hash(seed.add(time.floor())).mul(ND - 1)).add(1), idx);
  const ang = atan(gy, gx);
  const bin = floor(fract(ang.div(PI).add(0.125)).mul(4));
  idx = select(gm.greaterThan(0.09).and(lv.greaterThan(0.05)), bin.add(ND), idx);

  const auv = vec2(idx.add(local.x).div(N), float(1).sub(local.y));
  let glyph = texture(atlas, auv).r;
  if (glyphs) {
    const gcol = floor(hash(seed.add(floor(time.mul(0.5).add(hash(seed.add(5.1)).mul(9))).mul(3.7))).mul(16));
    const lx = local.x.mul(0.88).add(0.06), ly = local.y.mul(0.88).add(0.06);
    const row = min(floor(idx.mul(0.75)), 12);
    const ag = texture(glyphs, vec2(gcol.add(lx).div(16), float(1).sub(row.add(ly).div(16)))).r.mul(0.85);
    glyph = select(idx.lessThan(ND), select(idx.lessThan(1), float(0), ag), glyph);
  }

  /* цвет: Виви бледно-холодная, луч холодный и бесцветный, края как есть */
  const cold = vec3(lum).mul(vec3(0.72, 0.88, 1.1));
  const viviC = mix(cCol.mul(2.0), vec3(0.6, 0.74, 0.92).mul(lum.mul(3).add(0.22)), 0.65);
  let aCol = mix(cCol.mul(1.9), cold.mul(1.9), beam.mul(0.7));
  aCol = mix(aCol, viviC, isVivi);
  const asciiOut = aCol.mul(glyph).mul(allOn.mul(uAll).mul(1.4).add(1));

  /* видимый луч в пыли: где луч камеры проходит близко к оси взгляда (и не за стеной) */
  const pndc = vec2(screenUV.x.mul(2).sub(1), float(1).sub(screenUV.y.mul(2)));
  const rv = normalize(vec3(pndc.mul(uTan), -1));
  const R = normalize(uCamMat.mul(vec4(rv, 0)).xyz);
  const w0 = uCamPos.sub(uEye);
  const b = dot(R, uDir), dd = dot(R, w0), ee = dot(uDir, w0);
  const den = max(float(1).sub(b.mul(b)), 1e-4);
  const sc = b.mul(ee).sub(dd).div(den);
  const tc = ee.sub(b.mul(dd)).div(den);
  const gap = length(w0.add(R.mul(sc)).sub(uDir.mul(tc)));
  const pz = perspectiveDepthToViewZ(depth.sample(screenUV).r, uNear, uFar);
  const pdist = pz.negate().div(max(rv.z.negate(), 1e-3));
  const rad = tc.mul(0.11).add(0.06);
  /* луч, направленный в камеру, не светит в лицо: заливал бы кадр бликом */
  const facing = dot(uDir, normalize(uCamPos.sub(uEye)));
  const away = float(1).sub(smoothstep(0.55, 0.93, facing));
  const haze = gap.div(rad).mul(gap.div(rad)).mul(-2.2).exp()
    .mul(smoothstep(0, 0.6, tc)).mul(smoothstep(9, 1.2, tc))
    .mul(step(0, sc)).mul(smoothstep(0, 0.3, pdist.sub(sc)))
    .mul(uBeam).mul(uHaze).mul(away).mul(0.12);

  const base = col.rgb;
  const node = vec4(mix(base, asciiOut, on).add(vec3(0.6, 0.76, 1.0).mul(haze)), 1);

  return {
    node, uBeam, uEdge, uHaze, uAll, uRes, uCell,
    setSize(w, h) { uRes.value.set(w, h); uCell.value = Math.max(10, Math.round(h / 70)); },
    setCamera(cam) {
      uCamMat.value.copy(cam.matrixWorld);
      const ty = Math.tan(THREE.MathUtils.degToRad(cam.fov) / 2);
      uTan.value.set(ty * cam.aspect, ty);
      uNear.value = cam.near; uFar.value = cam.far;
      uCamPos.value.setFromMatrixPosition(cam.matrixWorld);
    },
    setGaze(pos, dir) { uEye.value.copy(pos); uDir.value.copy(dir); }
  };
}
