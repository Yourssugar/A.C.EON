/* Механика внимания: глаз не знает, где ты, пока не заметит.
   Взгляд ходит по лаборатории (осколки, кресло, мониторы, колбы, случайные точки).
   Курсор в луче и движется: внимание растёт быстро. Замер в луче: сначала медленно растёт,
   через 1,2 с неподвижности глаз начинает терять тебя. Вне луча внимание спадает.
   Резкий рывок мышью где угодно: глаз поворачивается на это место.
   Осколок: навести курсор и замереть ~3,5 с. Пока держишь, осколок звучит, глаз поворачивается на звук.
   Ступени: 0,35 глаз фиксируется на тебе; 0,75 «замечен» (гаснет один открытый осколок, шаг счётчика);
   1,0 или третья поимка за вход: «схвачен» (событие capture, дальше rift.js).

   createQuest(THREE, ctx) -> { update(dt, inp) -> {...}, active }
   ctx: { cam, eye, lab, mem, say(key), step(), save() }
   inp: { nx, ny, has, out, speed, stillT, gaze: {yaw, pitch} } */

import { CHAIR, FLOOR } from './lab.js';

const rnd = (a, b) => a + Math.random() * (b - a);

export function createQuest(THREE, ctx) {
  const { cam, eye, lab, mem } = ctx;
  if (!Array.isArray(mem.open)) mem.open = [];

  const E = new THREE.Vector3(0, 0, 0.6);   /* откуда смотрит глаз (центр чуть впереди) */
  const v = new THREE.Vector3(), ray = new THREE.Vector3(), hit = new THREE.Vector3();

  /* куда глаз может смотреть, когда ищет */
  const POI = [];
  lab.shards.forEach((s) => POI.push(s.position));
  POI.push(new THREE.Vector3(CHAIR.x, FLOOR + 2.3, CHAIR.z));
  POI.push(new THREE.Vector3(-6.6, FLOOR + 1.9, 3.0), new THREE.Vector3(-8.4, FLOOR + 1.9, 6.6), new THREE.Vector3(-11, FLOOR + 2, 0));
  POI.push(new THREE.Vector3(3.7, FLOOR + 1.8, 0.3), new THREE.Vector3(9, 0, -1), new THREE.Vector3(3.6, FLOOR + 1.2, 9.5));

  const yp = (P) => ({ yaw: Math.atan2(P.x - E.x, P.z - E.z), pitch: Math.atan2(P.y - E.y, Math.hypot(P.x - E.x, P.z - E.z)) });

  const S = {
    active: false, A: 0, mode: 'patrol', modeT: 0, target: { yaw: 0, pitch: 0 }, look: { yaw: 0, pitch: 0 },
    noise: null, noticed: false, caught: 0, hold: { id: -1, p: 0 }, prog: {}, flash: 0, capture: false
  };

  /* закрытые осколки тускнеют: отдельный материал без маски символов */
  const dimMat = new THREE.MeshStandardNodeMaterial({ color: 0x0a0d12, roughness: 0.3, metalness: 0.2, emissive: 0x0b1420 });
  function applyOpen() {
    lab.shards.forEach((s) => { if (mem.open.indexOf(s.userData.id) >= 0) s.material = dimMat; else if (s.userData.mat) s.material = s.userData.mat; });
    /* рука Виви на подлокотнике сдвигается с каждым открытым осколком */
    const n = mem.open.length, a = lab.armR;
    if (a && a.length >= 3) {
      if (!a[2].userData.base) { a[1].userData.base = a[1].rotation.x; a[2].userData.base = a[2].position.clone(); }
      a[1].rotation.x = a[1].userData.base - n * 0.045;
      a[2].position.copy(a[2].userData.base).add(new THREE.Vector3(n * 0.012, n * 0.02, n * 0.03));
    }
  }
  lab.shards.forEach((s) => { s.userData.mat = s.material; });
  applyOpen();

  function cursorWorld(nx, ny) {
    ray.set(nx, ny, 0.5).unproject(cam).sub(cam.position).normalize();
    const t = (6 - cam.position.z) / ray.z;
    return hit.copy(cam.position).addScaledVector(ray, t > 0 ? t : 4);
  }
  function shardUnderCursor(nx, ny) {
    const rpx = Math.max(24, innerHeight * 0.045);
    let best = -1, bd = 1e9;
    lab.shards.forEach((s, i) => {
      if (mem.open.indexOf(s.userData.id) >= 0) return;
      v.copy(s.position).project(cam);
      if (v.z > 1) return;
      const dx = (v.x - nx) * innerWidth / 2, dy = (v.y - ny) * innerHeight / 2, d = Math.hypot(dx, dy);
      if (d < rpx && d < bd) { bd = d; best = i; }
    });
    return best;
  }

  function nextPatrol() {
    const P = Math.random() < 0.8 ? POI[(Math.random() * POI.length) | 0]
      : v.set(rnd(-11, 11), rnd(FLOOR + 0.3, 5), rnd(1, 16));
    S.target = yp(P); S.mode = 'patrol'; S.modeT = rnd(1.4, 3.6);
  }

  function update(dt, inp) {
    const out = { target: null, tension: S.A, cursor: 'idle', hold: 0, inBeam: false, events: [] };
    if (!S.active || S.capture) { out.target = S.capture ? { yaw: 0, pitch: 0 } : null; return out; }

    const cw = inp.has && !inp.out ? cursorWorld(inp.nx, inp.ny).clone() : null;
    const cyp = cw ? yp(cw) : null;
    const gz = inp.gaze;
    const diff = cyp ? Math.hypot(cyp.yaw - gz.yaw, cyp.pitch - gz.pitch) : 9;
    const inBeam = diff < 0.16;
    out.inBeam = inBeam;
    const moving = inp.speed > 0.05;

    /* осколок: держать неподвижно. Прогресс каждого осколка не пропадает сразу, а медленно тает */
    const sid = cw ? shardUnderCursor(inp.nx, inp.ny) : -1;
    let holding = false;
    Object.keys(S.prog).forEach((k) => { if (+k !== sid || moving) S.prog[k] = Math.max(0, S.prog[k] - dt * 0.25); });
    if (sid >= 0) {
      out.cursor = 'hover';
      if (!moving && inp.stillT > 0.25) {
        holding = true;
        S.prog[sid] = (S.prog[sid] || 0) + dt / 3.5;
        out.cursor = 'hold';
        /* осколок звучит: глаз медленно разворачивается на звук */
        if (S.mode !== 'lock') { S.noise = lab.shards[sid].position.clone(); S.mode = 'hear'; S.modeT = 1; }
      }
      if ((S.prog[sid] || 0) >= 1) {
        const id = lab.shards[sid].userData.id;
        mem.open.push(id); applyOpen(); ctx.save();
        out.events.push({ type: 'open', id });
        S.prog[sid] = 0; holding = false;
      }
    }
    S.hold = { id: sid, p: sid >= 0 ? (S.prog[sid] || 0) : 0 };
    out.hold = S.hold.p;

    /* внимание */
    if (inBeam && holding) S.A += dt * 0.3;            /* звучащий осколок выдаёт, даже если замер */
    else if (inBeam) {
      if (moving) S.A += dt * (0.3 + 1.4 * Math.min(inp.speed, 1.5));
      else if (inp.stillT < 1.2) S.A += dt * 0.12;
      else S.A -= dt * 0.1;
    } else S.A -= dt * 0.2;

    /* резкий рывок слышен: глаз поворачивается туда */
    if (cw && inp.speed > 1.3 && !inBeam && S.mode !== 'lock') {
      S.noise = cw.clone(); S.mode = 'suspect'; S.modeT = rnd(1.8, 2.8);
    }

    /* ступени */
    S.A = Math.max(0, Math.min(1.2, S.A));
    if (S.A >= 0.35 && !(inp.stillT > 1.2) && cw) { S.mode = 'lock'; S.modeT = 1.5; }
    if (S.A >= 0.75 && !S.noticed) {
      S.noticed = true; S.caught++; S.flash = 0.9;
      out.events.push({ type: 'noticed' });
      ctx.step();
      if (mem.open.length) {
        const lost = mem.open.splice((Math.random() * mem.open.length) | 0, 1)[0];
        applyOpen(); ctx.save();
        out.events.push({ type: 'lost', id: lost });
      }
    }
    if (S.A < 0.4) S.noticed = false;
    if (S.A >= 1.0 || S.caught >= 3) { S.capture = true; out.events.push({ type: 'capture' }); }

    /* куда смотрит глаз */
    S.modeT -= dt;
    if (S.mode === 'lock') {
      if (cyp) S.target = cyp;
      if (S.modeT <= 0 || S.A < 0.3) { S.mode = 'suspect'; S.noise = cw ? cw.clone() : null; S.modeT = rnd(1.5, 2.5); }
    } else if (S.mode === 'suspect' || S.mode === 'hear') {
      if (S.noise) {
        /* поворачивается не рывком, а постепенно: сначала туда, где был, потом на звук */
        const want = yp(S.noise), k = S.mode === 'hear' ? 0.6 : 1.6;
        S.target = { yaw: S.target.yaw + (want.yaw - S.target.yaw) * Math.min(1, dt * k), pitch: S.target.pitch + (want.pitch - S.target.pitch) * Math.min(1, dt * k) };
      }
      if (S.modeT <= 0) nextPatrol();
    } else if (S.modeT <= 0) nextPatrol();

    S.flash = Math.max(0, S.flash - dt);
    out.target = S.target; out.tension = Math.min(1, S.A); out.flash = S.flash; out.mode = S.mode;
    return out;
  }

  function start() { if (!S.active) { S.active = true; nextPatrol(); } }

  return { update, start, state: S };
}
