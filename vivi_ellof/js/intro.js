/* Вход в изнанку: всё считается в шейдере.
   Полёт по глитч-тоннелю из символов Архитектора (текстура стенок от Кодекса, tunnel/tunnel_wall.webp):
   полосы сдвигаются рывками, блоки выпадают, цвета расходятся на сбоях, красные знаки как ошибки.
   Тоннель собирается из черноты блоками.
   Потом труба гаснет, из её дальнего конца вырастает глаз из символов (uEyeScale от малого к 1),
   открывает веки и смотрит прямо на зрителя.
   Глаз собран из алфавита Архитектора (tunnel/glyphs_architect.webp, 16 x 16: строка = плотность).
   Раскрытие: волна от зрачка наружу, клетки вспыхивают и гаснут, под ними настоящий глаз на том же месте.
   Размеры глаза подогнаны под 3D-глаз при камере вплотную (z = 4.6, fov 35).

   makeIntro(THREE, atlasInfo, uRes, uCell, { wall, wallR, glyphs }) -> { color, on, set({...}) } */

export function makeIntro(THREE, atlasInfo, uRes, uCell, tx) {
  tx = tx || {};
  const T = THREE.TSL;
  const { vec2, vec3, float, floor, fract, texture, uniform, screenUV, hash, length, smoothstep, mix, max,
    abs, atan, sin, pow, exp, step, select, clamp, time, PI, mod, dot, min } = T;
  const { tex: atlas, N } = atlasInfo;
  const ND = 16, EDGE_S = 17, EDGE_H = 18, EDGE_B = 19, DIG0 = 20;

  const uFade = uniform(0);      /* проявление из черноты */
  const uEyeScale = uniform(1);  /* размер глаза из символов: растёт из конца трубы */
  const uFly = uniform(0);       /* сколько пролетели по трубе */
  const uTwist = uniform(0);     /* закрутка трубы */
  const uTube = uniform(1);      /* 1 труба видна, 0 свернулась */
  const uMorph = uniform(0);     /* 0 нет глаза, 1 глаз из символов */
  const uOpen = uniform(0);      /* веки: 0 сомкнуты, 1 открыты */
  const uLook = uniform(new THREE.Vector2(0, 0));
  const uPupil = uniform(0.32);
  const uDissolve = uniform(0);  /* доля погасших клеток при раскрытии */
  const uAlive = uniform(1);
  const uTint = uniform(0);      /* 0 свои цвета, 1 холодный цвет перехода через зрачок */

  const aspect = uRes.x.div(uRes.y);
  /* ---------- глитч-тоннель: считается по каждому пикселю, в перспективе ---------- */
  const pp0 = screenUV.sub(0.5).mul(vec2(aspect, 1));
  const pp = vec2(pp0.x, pp0.y.negate());
  const r = length(pp), a = atan(pp.y, pp.x);
  const depth = float(0.22).div(max(r, 0.004));
  let tube;
  if (tx.wall) {
    /* развёртка: по кругу один оборот текстуры, вглубь прокрутка на зрителя, лёгкая спираль от закрутки */
    const U = a.div(PI.mul(2)).mul(2).add(uTwist.mul(0.03)).add(depth.mul(0.004).mul(uTwist));
    const V = depth.mul(0.32).add(uFly.mul(0.1));
    /* сбой полос: часть колец рывком сдвигается вбок, раз в 1/7 с новый набор */
    const band = floor(V.mul(22));
    const tq = floor(time.mul(7));
    const gOn = step(0.84, hash(band.mul(3.1).add(tq.mul(1.37))));
    const Us = U.add(hash(band.add(tq.mul(5.3))).sub(0.5).mul(0.2).mul(gOn));
    /* блоки: выпадают, иногда вспыхивают; при проявлении собираются из черноты по одному */
    const blk = floor(vec2(Us.mul(40), V.mul(18)));
    const bs = blk.x.add(blk.y.mul(57.1));
    const bh = hash(bs.add(floor(time.mul(3)).mul(13.7)));
    const drop = step(0.9, bh), hot = step(0.985, bh);
    const appear = step(hash(bs.add(0.33)), uFade.mul(1.2).sub(0.05));
    /* расхождение цветов на сбоях */
    const ca = float(0.0003).add(gOn.mul(0.003));
    const wv = vec2(Us, V);
    const wR = texture(tx.wall, wv.add(vec2(ca, 0))).r, wG = texture(tx.wall, wv).r, wB = texture(tx.wall, wv.sub(vec2(ca, 0))).r;
    const rs = texture(tx.wallR, wv);
    const red = clamp(rs.r.sub(rs.g).mul(2.5), 0, 1);
    const tint = hash(bs.mul(1.3).add(7.7));
    const baseC = mix(vec3(0.36, 0.86, 0.86), vec3(0.84, 0.9, 0.96), step(0.6, tint));
    let tc = vec3(wR.mul(baseC.x), wG.mul(baseC.y), wB.mul(baseC.z)).mul(1.3);
    /* плотнее: часть блоков заполнена знаками Архитектора целиком, как на концептах */
    if (tx.glyphs) {
      const bl = fract(vec2(Us.mul(40), V.mul(18)));
      const bsel = hash(bs.add(2.9));
      const gr = floor(hash(bs.add(4.4)).mul(10)).add(3), gc = floor(hash(bs.add(floor(time.mul(2)).mul(1.1))).mul(16));
      const gl = texture(tx.glyphs, vec2(gc.add(bl.x.mul(0.88).add(0.06)).div(16), float(1).sub(gr.add(float(1).sub(bl.y).mul(0.88).add(0.06)).div(16)))).r;
      tc = tc.add(baseC.mul(gl).mul(step(bsel, 0.22)).mul(0.9));
    }
    tc = mix(tc, vec3(0.95, 0.22, 0.27).mul(1.5), red);
    const tfade = smoothstep(0.012, 0.08, r).mul(exp(depth.mul(-0.1))).mul(smoothstep(1.7, 0.3, r));
    tube = tc.mul(tfade).mul(float(1).sub(drop.mul(0.85))).mul(hot.mul(1.5).add(1)).mul(gOn.mul(0.5).add(1))
      .mul(appear).mul(uTube).mul(1.7);
  } else {
    /* запасной вариант без текстур: двоичные цифры */
    const NU = 44;
    const u = a.div(PI.mul(2)).mul(NU).add(uTwist).add(depth.mul(0.6));
    const v = depth.mul(2.6).add(uFly);
    const cu = mod(floor(u), NU), cv = floor(v);
    const tseed = cu.mul(17.13).add(cv.mul(91.7));
    const lit = step(0.42, hash(tseed.add(3.3)));
    const dig = step(0.5, hash(tseed.add(floor(time.mul(1.5).add(hash(tseed).mul(6))).mul(13.1))));
    const tg = texture(atlas, vec2(dig.add(DIG0).add(float(1).sub(fract(u))).div(N), float(1).sub(fract(v)))).r;
    const tfade = smoothstep(0.012, 0.09, r).mul(exp(depth.mul(-0.12))).mul(smoothstep(1.6, 0.35, r));
    tube = vec3(0.43, 0.83, 0.84).mul(tg).mul(lit).mul(tfade).mul(uTube).mul(1.5);
  }

  /* ---------- глаз из символов: по клеткам экрана ---------- */
  const px = screenUV.mul(uRes);
  const cell = floor(px.div(uCell));
  const cuv = cell.add(0.5).mul(uCell).div(uRes);
  const local = fract(px.div(uCell));
  const p0 = cuv.sub(0.5).mul(vec2(aspect, 1));
  const p = vec2(p0.x, p0.y.negate()).div(uEyeScale);
  const seed = cell.x.add(cell.y.mul(311.7));
  const cellH = uCell.div(uRes.y).div(uEyeScale);

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
  let glyph = texture(atlas, vec2(idx.add(local.x).div(N), float(1).sub(local.y))).r;
  if (tx.glyphs) {
    /* знаки Архитектора: строка листа по плотности, столбец свой у каждой клетки, иногда меняется */
    const gcol = floor(hash(seed.add(floor(time.mul(0.6).add(hash(seed.add(5.1)).mul(9))).mul(3.7))).mul(16));
    const lx = local.x.mul(0.88).add(0.06), ly = local.y.mul(0.88).add(0.06);
    /* самые плотные строки листа почти сплошные: берём до 12-й, пустая клетка остаётся пустой */
    const row = min(floor(idx.mul(0.75)), 12);
    const ag = texture(tx.glyphs, vec2(gcol.add(lx).div(16), float(1).sub(row.add(ly).div(16)))).r.mul(0.8);
    glyph = select(lid.greaterThan(0.5), glyph, select(idx.lessThan(1), float(0), ag));
  }
  const eyeOut = col.mul(glyph).mul(1.7).mul(max(L, lid).mul(0.6).add(0.55)).mul(max(uMorph, lid));

  /* раскрытие: клетка перед тем, как погаснуть, вспыхивает */
  /* волна раскрытия: от зрачка наружу, с разбросом */
  const hc = mix(hash(seed.add(91.7)), clamp(length(p0).div(0.75), 0, 1), 0.55);
  const spark = smoothstep(0.09, 0.0, hc.sub(uDissolve)).mul(step(0.001, uDissolve)).mul(step(uDissolve, hc));
  const base = eyeOut.mul(spark.mul(2.4).add(1)).add(tube);
  const lum = base.x.mul(0.3).add(base.y.mul(0.59)).add(base.z.mul(0.11)).mul(1.5);
  const color = mix(base, vec3(0.45, 0.95, 0.92).mul(lum), uTint).mul(uFade);

  /* клетка ещё принадлежит входу или уже показывает сцену */
  const on = step(uDissolve, hc).mul(uAlive);

  const last = {};
  return {
    color, on, last,
    set(o) {
      Object.assign(last, o);
      if (o.fade !== undefined) uFade.value = o.fade;
      if (o.scale !== undefined) uEyeScale.value = Math.max(0.02, o.scale);
      if (o.fly !== undefined) uFly.value = o.fly;
      if (o.twist !== undefined) uTwist.value = o.twist;
      if (o.tube !== undefined) uTube.value = o.tube;
      if (o.morph !== undefined) uMorph.value = o.morph;
      if (o.open !== undefined) uOpen.value = o.open;
      if (o.look) uLook.value.set(o.look.x, o.look.y);
      if (o.pupil !== undefined) uPupil.value = o.pupil;
      if (o.dissolve !== undefined) uDissolve.value = o.dissolve;
      if (o.alive !== undefined) uAlive.value = o.alive;
      if (o.tint !== undefined) uTint.value = o.tint;
    }
  };
}
