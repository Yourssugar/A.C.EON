/* Вход в изнанку, пока грузится сцена: всё считается в шейдере, текстур сцены не нужно.
   Сначала полёт по закрученной трубе из чисел (цифры лежат на стенках трубы в перспективе, часть меняется).
   Когда глаз готов, труба сворачивается: её дальний конец становится зрачком, стенки гаснут,
   из клеток экрана собирается глаз из символов, смотрит на курсор, моргает.
   Раскрытие: клетки гаснут вразнобой, под ними настоящий глаз на том же месте.
   Размеры глаза подогнаны под 3D-глаз при камере вплотную (z = 4.6, fov 35).

   makeIntro(THREE, atlasInfo, uRes, uCell) -> { color, on, set({...}) } */

export function makeIntro(THREE, atlasInfo, uRes, uCell) {
  const T = THREE.TSL;
  const { vec2, vec3, float, floor, fract, texture, uniform, screenUV, hash, length, smoothstep, mix, max,
    abs, atan, sin, pow, exp, step, select, clamp, time, PI, mod } = T;
  const { tex: atlas, N } = atlasInfo;
  const ND = 16, EDGE_S = 17, EDGE_H = 18, EDGE_B = 19, DIG0 = 20;

  const uFade = uniform(0);      /* проявление из черноты */
  const uFly = uniform(0);       /* сколько пролетели по трубе */
  const uTwist = uniform(0);     /* закрутка трубы */
  const uTube = uniform(1);      /* 1 труба видна, 0 свернулась */
  const uMorph = uniform(0);     /* 0 нет глаза, 1 глаз из символов */
  const uOpen = uniform(0);      /* веки: 0 сомкнуты, 1 открыты */
  const uLook = uniform(new THREE.Vector2(0, 0));
  const uPupil = uniform(0.32);
  const uDissolve = uniform(0);  /* доля погасших клеток при раскрытии */
  const uAlive = uniform(1);

  const aspect = uRes.x.div(uRes.y);
  /* ---------- труба из чисел: считается по каждому пикселю, в перспективе ---------- */
  const pp0 = screenUV.sub(0.5).mul(vec2(aspect, 1));
  const pp = vec2(pp0.x, pp0.y.negate());
  const r = length(pp), a = atan(pp.y, pp.x);
  const depth = float(0.22).div(max(r, 0.004));
  const NU = 44;
  const u = a.div(PI.mul(2)).mul(NU).add(uTwist).add(depth.mul(0.6));
  const v = depth.mul(2.6).add(uFly);
  const cu = mod(floor(u), NU), cv = floor(v);
  const tseed = cu.mul(17.13).add(cv.mul(91.7));
  const lit = step(0.42, hash(tseed.add(3.3)));
  const dig = floor(hash(tseed.add(floor(time.mul(1.5).add(hash(tseed).mul(6))).mul(13.1))).mul(10));
  const tg = texture(atlas, vec2(dig.add(DIG0).add(float(1).sub(fract(u))).div(N), float(1).sub(fract(v)))).r;
  const tfade = smoothstep(0.012, 0.09, r).mul(exp(depth.mul(-0.12))).mul(smoothstep(1.6, 0.35, r));
  const tint = hash(tseed.add(7.7));
  const tubeC = select(tint.greaterThan(0.97), vec3(1.0, 0.3, 0.3), mix(vec3(0.43, 0.83, 0.84), vec3(0.98, 0.89, 0.77), step(0.7, tint)));
  /* вспышки рядов: по трубе бегут более яркие кольца */
  const ringPulse = smoothstep(0.85, 1.0, sin(v.mul(0.9).sub(time.mul(2))).mul(0.5).add(0.5)).mul(0.8).add(0.6);
  const tube = tubeC.mul(tg).mul(lit).mul(tfade).mul(ringPulse).mul(uTube).mul(1.5);

  /* ---------- глаз из символов: по клеткам экрана ---------- */
  const px = screenUV.mul(uRes);
  const cell = floor(px.div(uCell));
  const cuv = cell.add(0.5).mul(uCell).div(uRes);
  const local = fract(px.div(uCell));
  const p0 = cuv.sub(0.5).mul(vec2(aspect, 1));
  const p = vec2(p0.x, p0.y.negate());
  const seed = cell.x.add(cell.y.mul(311.7));
  const cellH = uCell.div(uRes.y);

  const IR = 0.218, W = 0.36, HU = 0.148, HL = 0.182;
  const q = p.sub(uLook);
  const ri = length(q).div(IR), ai = atan(q.y, q.x);
  const fib = sin(ai.mul(38).add(sin(ai.mul(7)).mul(1.5)).add(ri.mul(6))).mul(0.5).add(0.5);
  const grain = hash(seed.add(3.3)).mul(0.25);
  const collar = exp(ri.sub(uPupil.add(0.16)).div(0.05).pow(2).negate()).mul(0.3);
  const irisL = fib.mul(0.62).add(0.3).add(grain).add(collar).mul(step(uPupil, ri))
    .mul(float(1).sub(smoothstep(0.84, 1.0, ri).mul(0.75)));
  const da = abs(mod(ai.sub(0.72).add(PI), PI.mul(2)).sub(PI));
  const sector = smoothstep(0.5, 0.36, da.add(sin(ri.mul(17)).mul(0.06)));
  const irisC = mix(vec3(0.42, 0.62, 1.0), vec3(1.0, 0.55, 0.18), sector);

  const xs = p.x.div(W);
  const f = pow(max(float(1).sub(xs.mul(xs)), 0), 0.85);
  const yu = f.mul(HU).mul(uOpen), yl = f.mul(HL).mul(uOpen).negate();
  const inside = step(abs(xs), 1).mul(step(p.y, yu)).mul(step(yl, p.y));
  const scl = float(0.2).sub(smoothstep(0.55, 1.0, abs(xs)).mul(0.1)).sub(smoothstep(yu.sub(0.07), yu, p.y).mul(0.1));
  const inIris = step(ri, 1);
  const eyeL = inside.mul(mix(scl, irisL, inIris));
  const eyeC = mix(vec3(0.78, 0.74, 0.72), irisC, inIris);

  const nearU = step(abs(p.y.sub(f.mul(HU).mul(max(uOpen, 0.02)))), cellH.mul(0.62)).mul(step(abs(xs), 1.04));
  const nearL = step(abs(p.y.add(f.mul(HL).mul(max(uOpen, 0.02)))), cellH.mul(0.62)).mul(step(abs(xs), 1.04));
  const slopeU = select(abs(xs).lessThan(0.22), float(EDGE_H), select(xs.lessThan(0), float(EDGE_S), float(EDGE_B)));
  const slopeL = select(abs(xs).lessThan(0.22), float(EDGE_H), select(xs.lessThan(0), float(EDGE_B), float(EDGE_S)));
  const lid = max(nearU, nearL).mul(smoothstep(0.4, 0.8, uMorph));

  const L = eyeL.mul(uMorph);
  let idx = floor(clamp(L, 0, 0.999).mul(ND));
  const flick = hash(seed.add(floor(time.mul(7)).mul(7.13)));
  idx = select(flick.lessThan(0.04).and(L.greaterThan(0.08)), floor(hash(seed.add(time.floor())).mul(ND - 1)).add(1), idx);
  idx = select(nearU.mul(lid).greaterThan(0.5), slopeU, idx);
  idx = select(nearL.mul(lid).greaterThan(0.5), slopeL, idx);
  const col = mix(eyeC, vec3(0.86, 0.36, 0.32), lid);
  const glyph = texture(atlas, vec2(idx.add(local.x).div(N), float(1).sub(local.y))).r;
  const eyeOut = col.mul(glyph).mul(1.7).mul(max(L, lid).mul(0.6).add(0.55)).mul(max(uMorph, lid));

  const color = eyeOut.add(tube).mul(uFade);

  /* клетка ещё принадлежит входу или уже показывает сцену */
  const on = step(uDissolve, hash(seed.add(91.7))).mul(uAlive);

  return {
    color, on,
    set(o) {
      if (o.fade !== undefined) uFade.value = o.fade;
      if (o.fly !== undefined) uFly.value = o.fly;
      if (o.twist !== undefined) uTwist.value = o.twist;
      if (o.tube !== undefined) uTube.value = o.tube;
      if (o.morph !== undefined) uMorph.value = o.morph;
      if (o.open !== undefined) uOpen.value = o.open;
      if (o.look) uLook.value.set(o.look.x, o.look.y);
      if (o.pupil !== undefined) uPupil.value = o.pupil;
      if (o.dissolve !== undefined) uDissolve.value = o.dissolve;
      if (o.alive !== undefined) uAlive.value = o.alive;
    }
  };
}
