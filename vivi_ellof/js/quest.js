/* Механика внимания. Глаз не знает, где ты, пока не заметит.
   Взгляд ходит по лаборатории (люди, вещи, кресло, мониторы, колбы, случайные точки).
   Глаз быстро реагирует на движение: двигаться надо медленно.
     курсор в луче и движется: внимание растёт очень быстро;
     курсор в луче и замер: сначала растёт медленно, через 1,2 с неподвижности глаз начинает терять тебя;
     вне луча резкое движение слышно: глаз сразу разворачивается туда;
     вне луча внимание спадает.
   Ступени: 0,35 глаз фиксируется на тебе; 0,75 обнаружен: сразу поимка и выброс (rift.js тратит попытку).

   Расшифрованное видно нормально, пока на нём нет луча; под лучом оно снова из символов.

   Расшифровка: навести курсор на символьный предмет и замереть ~3,5 с. Пока держишь, слышен модем,
   глаз медленно поворачивается на звук. Прогресс копится и сохраняется. Расшифрованный предмет
   остаётся настоящим, наведение показывает подпись, клик открывает описание или воспоминание.

   Зрачок: чем ближе курсор к зрачку, тем резче глаз реагирует на любое движение рядом.
   Курсор в зрачке и неподвижен 1,6 с: переход (событие gate). Глаз успевает заметить, но поздно.

   createQuest(THREE, ctx) -> { update(dt, inp), start(), state }
   ctx: { cam, items, mem, save() }
   inp: { nx, ny, has, out, speed, stillT, gaze: {yaw, pitch}, eyeD (расстояние до зрачка в радиусах радужки), paused } */

import { CHAIR, FLOOR } from './lab.js?v=20261128c';

const rnd = (a, b) => a + Math.random() * (b - a);

export function createQuest(THREE, ctx) {
  const { cam, items, mem } = ctx;
  if (!Array.isArray(mem.open)) mem.open = [];
  if (!mem.prog || typeof mem.prog !== 'object') mem.prog = {};
  /* старый формат (номера осколков) больше не нужен */
  mem.open = mem.open.filter((x) => typeof x === 'string');
  Object.keys(mem.prog).forEach((k) => { if (/^\d+$/.test(k)) delete mem.prog[k]; });

  const E = new THREE.Vector3(0, 0, 0.6);
  const v = new THREE.Vector3(), ray = new THREE.Vector3(), hit = new THREE.Vector3();

  const POI = [];
  items.list.forEach((it) => POI.push(it.at));
  POI.push(new THREE.Vector3(CHAIR.x, FLOOR + 2.3, CHAIR.z));
  POI.push(new THREE.Vector3(-6.6, FLOOR + 1.9, 3.0), new THREE.Vector3(-8.4, FLOOR + 1.9, 6.6), new THREE.Vector3(-11, FLOOR + 2, 0));
  POI.push(new THREE.Vector3(3.7, FLOOR + 1.8, 0.3), new THREE.Vector3(9, 0, -1), new THREE.Vector3(3.6, FLOOR + 1.2, 9.5));

  const yp = (P) => ({ yaw: Math.atan2(P.x - E.x, P.z - E.z), pitch: Math.atan2(P.y - E.y, Math.hypot(P.x - E.x, P.z - E.z)) });

  const S = {
    active: false, A: 0, mode: 'patrol', modeT: 0, target: { yaw: 0, pitch: 0 },
    noise: null, hold: { i: -1, p: 0 }, flash: 0, capture: false, gate: false, gateHold: 0, saveT: 0, flT: 0
  };
  const isOpen = (it) => mem.open.indexOf(it.id) >= 0;
  items.apply(mem.open);

  function cursorWorld(nx, ny) {
    ray.set(nx, ny, 0.5).unproject(cam).sub(cam.position).normalize();
    const t = (6 - cam.position.z) / ray.z;
    return hit.copy(cam.position).addScaledVector(ray, t > 0 ? t : 4);
  }
  function itemUnderCursor(nx, ny) {
    let best = -1, bd = 1e9;
    items.list.forEach((it, i) => {
      v.copy(it.at).project(cam);
      if (v.z > 1) return;
      const rpx = Math.max(22, innerHeight * it.rpx);
      const d = Math.hypot((v.x - nx) * innerWidth / 2, (v.y - ny) * innerHeight / 2);
      if (d < rpx && d < bd) { bd = d; best = i; }
    });
    return best;
  }

  function nextPatrol() {
    const P = Math.random() < 0.8 ? POI[(Math.random() * POI.length) | 0]
      : v.set(rnd(-11, 11), rnd(FLOOR + 0.3, 5), rnd(1, 16));
    S.target = yp(P); S.mode = 'patrol'; S.modeT = rnd(1.2, 3.2);
  }
  const turnTo = (want, k, dt) => {
    const a = Math.min(1, dt * k);
    S.target = { yaw: S.target.yaw + (want.yaw - S.target.yaw) * a, pitch: S.target.pitch + (want.pitch - S.target.pitch) * a };
  };

  function update(dt, inp) {
    const out = { target: null, tension: S.A, cursor: 'idle', hold: 0, inBeam: false, events: [], item: -1, modem: false, gateP: 0 };
    if (!S.active || S.capture || S.gate) { out.target = null; out.tension = S.capture ? 1 : S.A; return out; }

    const cw = inp.has && !inp.out ? cursorWorld(inp.nx, inp.ny).clone() : null;
    const cyp = cw ? yp(cw) : null;
    const gz = inp.gaze;
    const diff = cyp ? Math.hypot(cyp.yaw - gz.yaw, cyp.pitch - gz.pitch) : 9;
    const inBeam = diff < 0.17;
    out.inBeam = inBeam;
    const sp = inp.speed;
    const moving = sp > 0.04;

    /* расшифрованное под лучом снова видно символами */
    items.list.forEach((it, i) => {
      if (!isOpen(it) || i === S.hold.i) return;
      const t = yp(it.at), d = Math.hypot(t.yaw - gz.yaw, t.pitch - gz.pitch);
      if (d < 0.2) { if (!it.inLook) { it.inLook = true; items.look(i, true); } }
      else if (d > 0.25 && it.inLook) { it.inLook = false; items.look(i, false); }
    });

    /* предмет под курсором */
    const ii = cw && !inp.paused ? itemUnderCursor(inp.nx, inp.ny) : -1;
    out.item = ii;
    const P = mem.prog;
    let holding = false;
    if (ii >= 0) {
      const it = items.list[ii];
      if (isOpen(it)) out.cursor = 'look';
      else {
        out.cursor = 'hover';
        if (!moving && inp.stillT > 0.25) {
          holding = true;
          P[it.id] = Math.min(1, (P[it.id] || 0) + dt / 3.5);
          S.saveT += dt; if (S.saveT > 0.6) { S.saveT = 0; ctx.save(); }
          out.cursor = 'hold'; out.modem = true;
          S.flT -= dt; if (S.flT <= 0) { S.flT = 0.07; items.flicker(ii, P[it.id]); }
          if (S.mode !== 'lock') { S.noise = it.at.clone(); S.mode = 'hear'; S.modeT = 1; }
          if (P[it.id] >= 1) {
            mem.open.push(it.id); items.apply(mem.open); ctx.save();
            out.events.push({ type: 'open', id: it.id, i: ii });
            holding = false; out.cursor = 'look'; out.modem = false;
          }
        }
        out.hold = P[it.id] || 0;
      }
    }
    /* отпустил недорасшифрованный предмет: он снова целиком из символов */
    if (S.hold.i >= 0 && S.hold.i !== ii || (S.hold.i >= 0 && !holding)) items.apply(mem.open);
    S.hold = { i: holding ? ii : -1, p: out.hold };

    /* близость к зрачку: 0 далеко, 1 в центре */
    const near = inp.eyeD < 1.8 ? 1 - inp.eyeD / 1.8 : 0;

    /* внимание */
    if (inp.paused) S.A -= dt * 0.15;
    else if (inBeam && holding) S.A += dt * 0.32;            /* звук расшифровки выдаёт, даже если замер */
    else if (inBeam) {
      if (moving) S.A += dt * (0.6 + 3.2 * Math.min(sp, 1.5));
      else if (inp.stillT < 1.2) S.A += dt * 0.14;
      else S.A -= dt * 0.1;
    } else S.A -= dt * 0.18;
    /* у зрачка глаз чувствует даже медленное движение, и тем сильнее, чем ближе */
    if (near > 0 && moving && !inp.paused) S.A += dt * sp * (0.8 + 3.5 * near * near);

    /* резкое движение где угодно слышно: глаз почти сразу поворачивается туда */
    if (cw && !inBeam && S.mode !== 'lock' && !inp.paused) {
      if (sp > 0.55) { S.noise = cw.clone(); S.mode = 'suspect'; S.modeT = rnd(1.6, 2.4); S.A += dt * 0.6; }
      else if (near > 0.3 && sp > 0.12) { S.noise = cw.clone(); S.mode = 'suspect'; S.modeT = rnd(1.0, 1.6); }
    }

    S.A = Math.max(0, Math.min(1.2, S.A));
    if (S.A >= 0.35 && inBeam && !(inp.stillT > 1.2) && cw) { S.mode = 'lock'; S.modeT = 1.2; }
    if (S.A >= 0.75) {
      S.capture = true; S.flash = 0.9;
      out.events.push({ type: 'capture' });
    }

    /* зрачок: замереть в нём */
    if (!S.capture && inp.eyeD < 0.42 && !moving && !inp.paused) {
      S.gateHold += dt;
      out.cursor = 'gate'; out.gateP = Math.min(1, S.gateHold / 1.6);
      if (S.gateHold >= 1.6) { S.gate = true; out.events.push({ type: 'gate' }); }
    } else S.gateHold = Math.max(0, S.gateHold - dt * 2);

    /* куда смотрит глаз */
    S.modeT -= dt;
    if (S.mode === 'lock') {
      /* в захвате взгляд догоняет курсор быстро, уйти можно только плавно и вовремя */
      if (cyp) turnTo(cyp, 3.6, dt);
      if (S.modeT <= 0 || S.A < 0.3) { S.mode = 'suspect'; S.noise = cw ? cw.clone() : null; S.modeT = rnd(1.4, 2.2); }
    } else if (S.mode === 'suspect' || S.mode === 'hear') {
      if (S.noise) turnTo(yp(S.noise), S.mode === 'hear' ? 0.8 : 4.2, dt);
      if (S.modeT <= 0) nextPatrol();
    } else if (S.modeT <= 0) nextPatrol();

    S.flash = Math.max(0, S.flash - dt);
    out.target = S.target; out.tension = Math.min(1, S.A); out.flash = S.flash; out.mode = S.mode;
    return out;
  }

  function start() { if (!S.active) { S.active = true; nextPatrol(); } }
  /* после поимки, если остались наблюдения: всё с нуля, кроме расшифрованного */
  function reset() {
    Object.assign(S, { active: false, A: 0, mode: 'patrol', modeT: 0, noise: null, hold: { i: -1, p: 0 }, flash: 0,
      capture: false, gate: false, gateHold: 0, target: { yaw: 0, pitch: 0 } });
    items.list.forEach((it) => { it.inLook = false; });
    items.apply(mem.open);
  }

  return { update, start, reset, state: S };
}
