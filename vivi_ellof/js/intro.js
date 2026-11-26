/* Вход в изнанку, пока грузится сцена: всё из символов, считается прямо в шейдере, без текстур сцены.
   0-3 с: вихрь вселенной с главной (чёрное ядро, кольцо, рукава), медленно крутится.
   3-6 с: рукава распрямляются в волокна радужки, ядро становится зрачком, из темноты смыкаются веки.
   дальше: глаз из символов открыт, смотрит на курсор, иногда моргает. Ждёт, пока сцена готова.
   Раскрытие: клетки символов гаснут вразнобой, под ними настоящий глаз на том же месте.
   Размеры глаза подогнаны под 3D-глаз при камере вплотную (z = 4.6, fov 35).

   makeIntro(THREE, atlasInfo, uRes, uCell) -> { color, on, set({...}) } */

export function makeIntro(THREE, atlasInfo, uRes, uCell) {
  const T = THREE.TSL;
  const { vec2, vec3, float, floor, fract, texture, uniform, screenUV, hash, length, smoothstep, mix, max, min,
    abs, atan, sin, pow, exp, log, step, select, clamp, time, PI, mod } = T;
  const { tex: atlas, N } = atlasInfo;
  const ND = 16, EDGE_V = 16, EDGE_S = 17, EDGE_H = 18, EDGE_B = 19;

  const uFade = uniform(0);      /* проявление из черноты */
  const uRot = uniform(0);       /* поворот вихря */
  const uMorph = uniform(0);     /* 0 вихрь, 1 глаз */
  const uOpen = uniform(0);      /* веки: 0 сомкнуты, 1 открыты */
  const uLook = uniform(new THREE.Vector2(0, 0));
  const uPupil = uniform(0.32);
  const uDissolve = uniform(0);  /* доля погасших клеток при раскрытии */
  const uAlive = uniform(1);

  const px = screenUV.mul(uRes);
  const cell = floor(px.div(uCell));
  const cuv = cell.add(0.5).mul(uCell).div(uRes);
  const local = fract(px.div(uCell));
  const aspect = uRes.x.div(uRes.y);
  const p0 = cuv.sub(0.5).mul(vec2(aspect, 1));
  const p = vec2(p0.x, p0.y.negate());
  const seed = cell.x.add(cell.y.mul(311.7));
  const cellH = uCell.div(uRes.y);

  /* ---------- вихрь ---------- */
  const r = length(p), a = atan(p.y, p.x);
  const arms = pow(sin(a.mul(2).sub(log(r.add(0.002)).mul(5.5)).add(uRot)).mul(0.5).add(0.5), 2.6);
  const spiral = arms.mul(smoothstep(0.62, 0.09, r)).mul(smoothstep(0.035, 0.07, r));
  const ring = exp(r.sub(0.07).div(0.013).pow(2).negate());
  const dust = step(0.986, hash(seed.add(floor(time.mul(1.5)).mul(5.1)))).mul(0.55).mul(smoothstep(0.85, 0.15, r));
  const vort = spiral.mul(0.75).add(ring).add(dust);
  const vortCol = mix(vec3(0.43, 0.83, 0.84), vec3(0.98, 0.89, 0.77), clamp(ring.add(spiral.mul(0.25)), 0, 1));

  /* ---------- глаз ---------- */
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

  /* края век: линии со знаками по наклону */
  const nearU = step(abs(p.y.sub(f.mul(HU).mul(max(uOpen, 0.02)))), cellH.mul(0.62)).mul(step(abs(xs), 1.04));
  const nearL = step(abs(p.y.add(f.mul(HL).mul(max(uOpen, 0.02)))), cellH.mul(0.62)).mul(step(abs(xs), 1.04));
  const slopeU = select(abs(xs).lessThan(0.22), float(EDGE_H), select(xs.lessThan(0), float(EDGE_S), float(EDGE_B)));
  const slopeL = select(abs(xs).lessThan(0.22), float(EDGE_H), select(xs.lessThan(0), float(EDGE_B), float(EDGE_S)));
  const lid = max(nearU, nearL).mul(smoothstep(0.4, 0.8, uMorph));

  /* ---------- смешение и знак ---------- */
  const L = mix(vort, eyeL, uMorph);
  const C = mix(vortCol, eyeC, uMorph);
  let idx = floor(clamp(L, 0, 0.999).mul(ND));
  const flick = hash(seed.add(floor(time.mul(7)).mul(7.13)));
  idx = select(flick.lessThan(0.04).and(L.greaterThan(0.08)), floor(hash(seed.add(time.floor())).mul(ND - 1)).add(1), idx);
  idx = select(nearU.mul(lid).greaterThan(0.5), slopeU, idx);
  idx = select(nearL.mul(lid).greaterThan(0.5), slopeL, idx);
  const lidC = vec3(0.86, 0.36, 0.32);
  const col = mix(C, lidC, lid);
  const glyph = texture(atlas, vec2(idx.add(local.x).div(N), float(1).sub(local.y))).r;
  const color = col.mul(glyph).mul(1.7).mul(uFade).mul(max(L, lid).mul(0.6).add(0.55));

  /* клетка ещё принадлежит входу или уже показывает сцену */
  const on = step(uDissolve, hash(seed.add(91.7))).mul(uAlive);

  return {
    color, on,
    set(v) {
      if (v.fade !== undefined) uFade.value = v.fade;
      if (v.rot !== undefined) uRot.value = v.rot;
      if (v.morph !== undefined) uMorph.value = v.morph;
      if (v.open !== undefined) uOpen.value = v.open;
      if (v.look) uLook.value.set(v.look.x, v.look.y);
      if (v.pupil !== undefined) uPupil.value = v.pupil;
      if (v.dissolve !== undefined) uDissolve.value = v.dissolve;
      if (v.alive !== undefined) uAlive.value = v.alive;
    }
  };
}
