/* Движение глаза как у живого: фиксация с дрейфом и тремором, микросаккады, саккады с задержкой
   и недолётом, плавное слежение за медленной целью, поиск, когда цель пропала. Плюс зрачок и моргание.
   Углы в радианах: yaw влево-вправо, pitch вверх-вниз. Ничего не рисует, только считает. */

const rnd = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export function createGaze(opt = {}) {
  const LIM_Y = opt.yaw || 0.62, LIM_P = opt.pitch || 0.42;
  const calm = !!opt.reduce;

  const s = {
    yaw: 0, pitch: 0,            /* куда смотрит сейчас (без тремора) */
    outYaw: 0, outPitch: 0,      /* что отдаём наружу (с тремором) */
    sac: null,                   /* текущая саккада {fy,fp,ty,tp,t,d} */
    refr: 0,                     /* время до следующей возможной саккады */
    micro: rnd(0.4, 1.2),
    tgt: null, tgtPrev: null, tgtVel: 0,
    mode: 'idle',                /* watch: видит цель; search: потерял; edge: цель ушла за край */
    searchT: 0,
    pupil: 0.32, pupilTarget: 0.32,
    blink: 0, blinkT: rnd(2.5, 6), blinkSeq: null,
    t: 0,
    focus: 0                     /* 0..1 насколько пристально смотрит на цель */
  };

  function startSaccade(ty, tp, under) {
    const k = under ? rnd(0.88, 0.96) : 1;
    ty = s.yaw + (ty - s.yaw) * k; tp = s.pitch + (tp - s.pitch) * k;
    const amp = Math.hypot(ty - s.yaw, tp - s.pitch) * 57.3;
    s.sac = { fy: s.yaw, fp: s.pitch, ty: clamp(ty, -LIM_Y, LIM_Y), tp: clamp(tp, -LIM_P, LIM_P), t: 0, d: 0.021 + 0.0022 * amp };
    if (amp > 18 && Math.random() < 0.25) blinkNow('normal');
  }

  function blinkNow(kind) {
    if (s.blinkSeq) return;
    /* фазы: [длительность, значение в конце]. frozen: веко застывает на полпути, как будто время встало */
    const seqs = {
      normal: [[0.09, 1], [0.04, 1], [0.17, 0]],
      double: [[0.08, 1], [0.03, 1], [0.12, 0], [0.07, 0], [0.08, 1], [0.03, 1], [0.16, 0]],
      frozen: [[0.07, 0.62], [rnd(0.5, 1.1), 0.62], [0.05, 1], [0.04, 1], [0.2, 0]],
      slow: [[0.35, 1], [0.25, 1], [0.6, 0]]
    };
    s.blinkSeq = { ph: seqs[kind] || seqs.normal, i: 0, t: 0, from: s.blink };
  }

  function stepBlink(dt) {
    if (!s.blinkSeq) {
      s.blinkT -= dt;
      if (s.blinkT <= 0) {
        const r = Math.random();
        blinkNow(r < 0.1 ? 'frozen' : r < 0.18 ? 'double' : r < 0.22 ? 'slow' : 'normal');
        s.blinkT = s.mode === 'watch' && s.focus > 0.6 ? rnd(5, 11) : rnd(2.5, 7);
      }
      return;
    }
    const q = s.blinkSeq, ph = q.ph[q.i];
    q.t += dt;
    const k = Math.min(1, q.t / ph[0]);
    const e = k * k * (3 - 2 * k);
    s.blink = q.from + (ph[1] - q.from) * e;
    if (k >= 1) { q.i++; q.t = 0; q.from = ph[1]; if (q.i >= q.ph.length) { s.blinkSeq = null; s.blink = 0; } }
  }

  /* tgt: {yaw, pitch} куда указывает курсор, или null если курсора нет.
     info: {idle: сек без движения, out: курсор ушёл за окно, near: курсор над радужкой} */
  function update(dt, tgt, info = {}) {
    s.t += dt;
    const idle = info.idle || 0;
    s.mode = info.out ? 'edge' : (!tgt || idle > 3.2) ? 'search' : 'watch';

    if (tgt) {
      const ty = clamp(tgt.yaw, -LIM_Y, LIM_Y), tp = clamp(tgt.pitch, -LIM_P, LIM_P);
      if (s.tgtPrev) {
        const v = Math.hypot(ty - s.tgtPrev.yaw, tp - s.tgtPrev.pitch) / Math.max(dt, 1e-3);
        s.tgtVel += (v - s.tgtVel) * Math.min(1, dt * 8);
        s.tgtDy = (ty - s.tgtPrev.yaw) / Math.max(dt, 1e-3); s.tgtDp = (tp - s.tgtPrev.pitch) / Math.max(dt, 1e-3);
      }
      s.tgtPrev = { yaw: ty, pitch: tp };
      s.tgt = { yaw: ty, pitch: tp };
    }

    let goal = null;
    if (s.mode === 'watch') goal = s.tgt;
    else if (s.mode === 'edge') goal = { yaw: clamp((info.edgeX || 0) * 2, -1, 1) * LIM_Y, pitch: clamp((info.edgeY || 0) * 2, -1, 1) * LIM_P };
    else {
      s.searchT -= dt;
      if (s.searchT <= 0 || !s.searchGoal) {
        s.searchGoal = { yaw: rnd(-LIM_Y, LIM_Y) * 0.9, pitch: rnd(-LIM_P, LIM_P) * 0.8 };
        s.searchT = rnd(0.5, 1.5);
      }
      goal = s.searchGoal;
    }

    s.refr -= dt;
    if (s.sac) {
      const q = s.sac; q.t += dt;
      const k = Math.min(1, q.t / q.d), e = 0.5 - 0.5 * Math.cos(Math.PI * k);
      s.yaw = q.fy + (q.ty - q.fy) * e; s.pitch = q.fp + (q.tp - q.fp) * e;
      if (k >= 1) { s.sac = null; s.refr = rnd(0.12, 0.24); }
    } else if (goal) {
      const ey = goal.yaw - s.yaw, ep = goal.pitch - s.pitch, err = Math.hypot(ey, ep);
      const pursuit = s.mode === 'watch' && s.tgtVel < 0.7 && err < 0.09;
      if (pursuit && !calm) {
        s.yaw += ((s.tgtDy || 0) * 0.9 + ey * 3) * dt;
        s.pitch += ((s.tgtDp || 0) * 0.9 + ep * 3) * dt;
      } else if (err > 0.022 && s.refr <= 0) {
        startSaccade(goal.yaw, goal.pitch, true);
      }
    }

    /* фиксация: дрейф, микросаккады */
    if (!s.sac && !calm) {
      s.yaw += (Math.random() - 0.5) * 0.004 * Math.sqrt(dt * 60) * 0.3;
      s.pitch += (Math.random() - 0.5) * 0.004 * Math.sqrt(dt * 60) * 0.3;
      s.micro -= dt;
      if (s.micro <= 0) {
        const a = Math.random() * 6.283, m = rnd(0.003, 0.009);
        startSaccade(s.yaw + Math.cos(a) * m, s.pitch + Math.sin(a) * m, false);
        s.micro = rnd(0.35, 1.3);
      }
    }
    s.yaw = clamp(s.yaw, -LIM_Y, LIM_Y); s.pitch = clamp(s.pitch, -LIM_P, LIM_P);

    const tr = calm ? 0 : 0.0007;
    s.outYaw = s.yaw + Math.sin(s.t * 83.1) * tr + Math.sin(s.t * 57.7) * tr * 0.6;
    s.outPitch = s.pitch + Math.cos(s.t * 71.3) * tr;

    /* пристальность: растёт, пока видит цель, падает при поиске */
    const fGoal = s.mode === 'watch' ? (info.near ? 1 : 0.7) : 0;
    s.focus += (fGoal - s.focus) * Math.min(1, dt * (fGoal > s.focus ? 0.8 : 0.4));

    /* зрачок: сужается быстро, расширяется медленно. Потерял цель: расширяется. Курсор над радужкой: точка */
    s.pupilTarget = s.mode === 'search' ? 0.47 : s.mode === 'edge' ? 0.42
      : info.near ? 0.19 : clamp(0.33 - s.tgtVel * 0.05 - s.focus * 0.06, 0.22, 0.36);
    const tau = s.pupilTarget < s.pupil ? 0.28 : 1.3;
    s.pupil += (s.pupilTarget - s.pupil) * (1 - Math.exp(-dt / tau));
    const hippus = calm ? 0 : Math.sin(s.t * 1.7) * 0.008 + Math.sin(s.t * 0.61 + 1) * 0.006;

    stepBlink(dt);

    return { yaw: s.outYaw, pitch: s.outPitch, pupil: clamp(s.pupil + hippus, 0.15, 0.6), blink: s.blink, mode: s.mode, focus: s.focus };
  }

  return { update, blink: blinkNow, state: s };
}
