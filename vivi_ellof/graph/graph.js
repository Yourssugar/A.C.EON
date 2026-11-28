/* Граф памяти Архитектора: сцена изнутри (план: claude/vivi-graph-plan.md).
   Камера в центре облака из тысяч точек и нитей. Всё движение на видеокарте:
   точки и концы нитей дрейфуют одной и той же функцией, у каждой нити своя фаза жизни
   (гаснет и появляется) и свой импульс, бегущий вдоль неё.
   Граф разбит на куски по направлению и расстоянию: кусок вне кадра не рисуется.
   Ключевые точки (воспоминания) крупные, с картинкой-заглушкой; при наведении от них
   прорастают связи в далёкие части графа, клик открывает карточку воспоминания.

   mount({ lang }) */

import * as THREE from '../vendor/three-webgpu.min.js';

const T = THREE.TSL;
const { vec2, vec3, vec4, float, uniform, sin, fract, abs, smoothstep, length, mix, time, uv,
  positionLocal, positionWorld, cameraPosition, attribute, instancedBufferAttribute, max } = T;

const TXT = {
  ru: { hint: 'тяни, чтобы оглядеться · esc: назад', enter: 'войти', closed: 'доступ закрыт', damaged: 'фрагмент повреждён',
    mem: 'ВОСПОМИНАНИЕ', back: 'назад' },
  en: { hint: 'drag to look around · esc: back', enter: 'enter', closed: 'access denied', damaged: 'fragment damaged',
    mem: 'MEMORY', back: 'back' }
};

/* ключевые точки: первая открыта, остальные пока заглушки */
const KEYS = [
  { id: 'pendant', open: true, sector: 0, label: { ru: 'Кулон', en: 'Pendant' },
    text: { ru: 'Детство. Возле дома, в траве. Кулон и записка, написанная взрослым почерком.', en: 'Childhood. Near the house, in the grass. A pendant and a note in grown-up handwriting.' } },
  { id: 'cat', sector: 0, label: { ru: 'Кот', en: 'Cat' }, text: { ru: '', en: '' } },
  { id: 'stranger', sector: 0, label: { ru: 'Чужие вещи', en: 'Someone else’s things' }, text: { ru: '', en: '' } },
  { id: 'modify', sector: 0, label: { ru: 'Модификация', en: 'Modification' }, text: { ru: '', en: '' } },
  { id: 'debate', sector: 1, label: { ru: 'Спор', en: 'The argument' }, text: { ru: '', en: '' } },
  { id: 'launch', sector: 2, label: { ru: 'Запуск', en: 'Launch' }, text: { ru: '', en: '' } },
  { id: 'worlds', sector: 3, label: { ru: 'Миры', en: 'Worlds' }, text: { ru: '', en: '' } },
  { id: 'anomaly', sector: 4, label: { ru: 'Аномалия', en: 'Anomaly' }, text: { ru: '', en: '' } }
];

/* сектора памяти: направление центра и цвет */
const SECTORS = [
  { name: 'vivi', col: [1.0, 0.62, 0.32], w: 1.2 },      /* копия Виви: тёплый янтарь */
  { name: 'people', col: [0.95, 0.45, 0.72], w: 1.0 },   /* фрагменты людей: пыльная роза */
  { name: 'lab', col: [0.3, 0.85, 0.9], w: 1.0 },        /* лаборатория: холодный бирюзовый */
  { name: 'worlds', col: [0.62, 0.5, 1.0], w: 1.1 },     /* миры: лиловый */
  { name: 'anomaly', col: [1.0, 0.22, 0.25], w: 0.35 },  /* аномалии: красный */
  { name: 'protocol', col: [0.8, 0.86, 0.95], w: 0.7 }   /* протокол: бледный, разбросан везде */
];

function rng(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }

export async function mount(opts) {
  const lang = (opts && opts.lang) === 'ru' ? 'ru' : 'en';
  const L = TXT[lang];
  const coarse = matchMedia('(pointer: coarse)').matches;
  const small = coarse && Math.min(screen.width, screen.height) < 820;

  const cv = document.getElementById('c');
  const renderer = new THREE.WebGPURenderer({ canvas: cv, antialias: true });
  await renderer.init();
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, small ? 1.25 : 1.75));
  renderer.setSize(innerWidth, innerHeight, false);
  renderer.setClearColor(0x020306, 1);

  const scene = new THREE.Scene();
  const cam = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.1, 400);

  /* ---------- данные графа ---------- */
  const R = rng(20261128);
  const N = small ? 3000 : 6000;
  const sc = SECTORS.map((s, i) => {
    /* центры секторов на сфере вокруг камеры */
    const phi = Math.acos(1 - 2 * (i + 0.5) / SECTORS.length), th = Math.PI * (1 + Math.sqrt(5)) * i;
    const d = new THREE.Vector3(Math.sin(phi) * Math.cos(th), Math.cos(phi) * 0.7, Math.sin(phi) * Math.sin(th)).normalize();
    return Object.assign({ dir: d, c: d.clone().multiplyScalar(34) }, s);
  });
  const wsum = sc.reduce((a, s) => a + s.w, 0);
  const gauss = () => { let u = 0; for (let i = 0; i < 4; i++) u += R(); return (u - 2) / 0.58; };
  const P = new Float32Array(N * 3), S = new Uint8Array(N), SZ = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    let r = R() * wsum, k = 0; while (r > sc[k].w && k < sc.length - 1) { r -= sc[k].w; k++; }
    S[i] = k;
    let x, y, z;
    do {
      if (sc[k].name === 'protocol') {
        /* протокол: тонкая оболочка по всему графу */
        const v = new THREE.Vector3(gauss(), gauss(), gauss()).normalize().multiplyScalar(14 + R() * 60);
        x = v.x; y = v.y; z = v.z;
      } else {
        const s = 11 + R() * 8;
        x = sc[k].c.x + gauss() * s; y = sc[k].c.y + gauss() * s * 0.8; z = sc[k].c.z + gauss() * s;
      }
    } while (x * x + y * y + z * z < 36);
    P[i * 3] = x; P[i * 3 + 1] = y; P[i * 3 + 2] = z;
    SZ[i] = 0.07 + Math.pow(R(), 3) * 0.28;
  }
  /* узлы-центры: крупные, с десятками связей */
  const HUBS = [];
  for (let i = 0; i < (small ? 24 : 42); i++) { const h = (R() * N) | 0; HUBS.push(h); SZ[h] = 0.5 + R() * 0.45; }

  /* связи: соседи по сетке + центры + дальние между секторами */
  const cell = 7, grid = new Map();
  const key = (x, y, z) => ((Math.floor(x / cell) + 64) * 131 + (Math.floor(y / cell) + 64)) * 131 + (Math.floor(z / cell) + 64);
  for (let i = 0; i < N; i++) { const k = key(P[i * 3], P[i * 3 + 1], P[i * 3 + 2]); (grid.get(k) || grid.set(k, []).get(k)).push(i); }
  const near = (i, rad, max) => {
    const x = P[i * 3], y = P[i * 3 + 1], z = P[i * 3 + 2], out = [];
    const r = Math.ceil(rad / cell);
    for (let a = -r; a <= r; a++) for (let b = -r; b <= r; b++) for (let c = -r; c <= r; c++) {
      const list = grid.get(key(x + a * cell, y + b * cell, z + c * cell)); if (!list) continue;
      for (const j of list) { if (j === i) continue; const dx = P[j * 3] - x, dy = P[j * 3 + 1] - y, dz = P[j * 3 + 2] - z, d = dx * dx + dy * dy + dz * dz; if (d < rad * rad) out.push([d, j]); }
    }
    out.sort((p, q) => p[0] - q[0]);
    return out.slice(0, max).map((p) => p[1]);
  };
  const E = [];
  for (let i = 0; i < N; i++) near(i, 6, 2 + (R() < 0.3 ? 1 : 0)).forEach((j) => { if (j > i || R() < 0.3) E.push(i, j); });
  HUBS.forEach((h) => near(h, 20, 30 + ((R() * 50) | 0)).forEach((j) => E.push(h, j)));
  /* редкие дальние связи между секторами, только по дальней оболочке: вблизи камеры они резали бы кадр */
  const far = (i) => P[i * 3] ** 2 + P[i * 3 + 1] ** 2 + P[i * 3 + 2] ** 2 > 40 * 40;
  for (let i = 0, n = 0; i < 4000 && n < (small ? 50 : 90); i++) { const a = (R() * N) | 0, b = (R() * N) | 0; if (far(a) && far(b)) { E.push(a, b); n++; } }
  const NE = E.length / 2;

  /* ---------- дрейф: одна функция для точек и концов нитей ---------- */
  const drift = (p) => vec3(
    sin(time.mul(0.13).add(p.y.mul(0.07)).add(p.z.mul(0.05))),
    sin(time.mul(0.11).add(p.z.mul(0.06)).add(p.x.mul(0.04))),
    sin(time.mul(0.09).add(p.x.mul(0.05)).add(p.y.mul(0.07)))
  ).mul(0.7);
  const dfade = (wp) => smoothstep(95, 18, length(wp.sub(cameraPosition)));

  /* куски: 8 направлений x 2 слоя по расстоянию */
  const chunkOf = (x, y, z) => ((x > 0) | ((y > 0) << 1) | ((z > 0) << 2)) + (x * x + y * y + z * z > 34 * 34 ? 8 : 0);

  /* ---------- точки ---------- */
  const dot = new THREE.CanvasTexture((() => {
    const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d');
    const g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.25, 'rgba(255,255,255,.75)'); g.addColorStop(0.6, 'rgba(255,255,255,.12)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = g; x.fillRect(0, 0, 64, 64); return c;
  })());
  const chunks = Array.from({ length: 16 }, () => []);
  for (let i = 0; i < N; i++) chunks[chunkOf(P[i * 3], P[i * 3 + 1], P[i * 3 + 2])].push(i);
  chunks.forEach((ids) => {
    if (!ids.length) return;
    const n = ids.length;
    const pos = new THREE.InstancedBufferAttribute(new Float32Array(n * 3), 3);
    const col = new THREE.InstancedBufferAttribute(new Float32Array(n * 4), 4);
    const box = new THREE.Box3();
    ids.forEach((id, k) => {
      pos.setXYZ(k, P[id * 3], P[id * 3 + 1], P[id * 3 + 2]);
      const c = sc[S[id]].col;
      col.setXYZW(k, c[0], c[1], c[2], SZ[id]);
      box.expandByPoint(new THREE.Vector3(P[id * 3], P[id * 3 + 1], P[id * 3 + 2]));
    });
    const p0 = instancedBufferAttribute(pos), c0 = instancedBufferAttribute(col);
    const m = new THREE.SpriteNodeMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
    const wp = p0.add(drift(p0));
    m.positionNode = wp;
    /* мерцание: у каждой точки своя частота */
    const tw = sin(time.mul(c0.w.mul(9).add(0.6)).add(p0.x.mul(1.7))).mul(0.25).add(0.85);
    m.scaleNode = c0.w.mul(tw);
    m.colorNode = vec3(c0.x, c0.y, c0.z).mul(1.6);
    m.opacityNode = T.texture(dot, uv()).a.mul(dfade(wp));
    const geo = new THREE.PlaneGeometry(1, 1);
    geo.boundingSphere = box.getBoundingSphere(new THREE.Sphere()); geo.boundingSphere.radius += 2;
    const mesh = new THREE.Mesh(geo, m);
    mesh.count = n;
    scene.add(mesh);
  });

  /* ---------- нити ---------- */
  const echunks = Array.from({ length: 16 }, () => []);
  for (let e = 0; e < NE; e++) { const a = E[e * 2]; echunks[chunkOf(P[a * 3], P[a * 3 + 1], P[a * 3 + 2])].push(e); }
  echunks.forEach((ids) => {
    if (!ids.length) return;
    const n = ids.length;
    const pos = new Float32Array(n * 6), col = new Float32Array(n * 6), life = new Float32Array(n * 8), tt = new Float32Array(n * 2);
    ids.forEach((e, k) => {
      const a = E[e * 2], b = E[e * 2 + 1];
      const ca = sc[S[a]].col, cb = sc[S[b]].col;
      for (let q = 0; q < 3; q++) { pos[k * 6 + q] = P[a * 3 + q]; pos[k * 6 + 3 + q] = P[b * 3 + q]; col[k * 6 + q] = ca[q]; col[k * 6 + 3 + q] = cb[q]; }
      /* фаза жизни, скорость жизни, фаза импульса, скорость импульса (0: без импульса) */
      const ph = R() * 6.28, ls = 0.03 + R() * 0.12, ip = R(), is = R() < 0.35 ? 0.15 + R() * 0.5 : 0;
      for (let v = 0; v < 2; v++) life.set([ph, ls, ip, is], k * 8 + v * 4);
      tt[k * 2] = 0; tt[k * 2 + 1] = 1;
    });
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('ecol', new THREE.BufferAttribute(col, 3));
    g.setAttribute('elife', new THREE.BufferAttribute(life, 4));
    g.setAttribute('et', new THREE.BufferAttribute(tt, 1));
    const m = new THREE.LineBasicNodeMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
    m.positionNode = positionLocal.add(drift(positionLocal));
    const lf = attribute('elife', 'vec4'), et = attribute('et', 'float');
    /* жизнь: связь медленно гаснет и появляется снова */
    const alive = smoothstep(-0.55, 0.25, sin(time.mul(lf.y).add(lf.x)));
    /* импульс: яркая точка бежит вдоль связи */
    const imp = smoothstep(0.07, 0.0, abs(fract(time.mul(lf.w).add(lf.z)).sub(et))).mul(lf.w.greaterThan(0).select(float(1), float(0)));
    m.colorNode = attribute('ecol', 'vec3').mul(float(0.55).add(imp.mul(4)));
    m.opacityNode = alive.mul(float(0.22).add(imp.mul(0.8))).mul(dfade(positionWorld));
    scene.add(new THREE.LineSegments(g, m));
  });

  /* ---------- ключевые точки ---------- */
  const keyTex = (k) => {
    const c = document.createElement('canvas'); c.width = c.height = 256; const x = c.getContext('2d');
    const col = sc[k.sector].col.map((v) => Math.round(v * 255)).join(',');
    const g = x.createRadialGradient(128, 128, 20, 128, 128, 128);
    g.addColorStop(0, 'rgba(' + col + ',.55)'); g.addColorStop(0.55, 'rgba(' + col + ',.12)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = g; x.fillRect(0, 0, 256, 256);
    x.strokeStyle = 'rgba(' + col + ',.95)'; x.lineWidth = 4; x.beginPath(); x.arc(128, 128, 70, 0, Math.PI * 2); x.stroke();
    x.lineWidth = 1.5; x.beginPath(); x.arc(128, 128, 84, 0, Math.PI * 2); x.stroke();
    /* заглушка картинки: силуэт кулона у открытой точки, знак замка у закрытых */
    x.fillStyle = 'rgba(255,255,255,.9)'; x.strokeStyle = 'rgba(255,255,255,.9)'; x.lineWidth = 3;
    if (k.open) { x.beginPath(); x.moveTo(98, 92); x.quadraticCurveTo(128, 70, 158, 92); x.stroke(); x.beginPath(); x.moveTo(128, 110); x.lineTo(146, 132); x.lineTo(128, 160); x.lineTo(110, 132); x.closePath(); x.fill(); }
    else { x.strokeRect(108, 124, 40, 32); x.beginPath(); x.arc(128, 124, 14, Math.PI, 0); x.stroke(); }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  };
  const keyObjs = KEYS.map((k, i) => {
    const s = sc[k.sector];
    /* в своём секторе, но ближе к камере, чтобы было видно */
    const d = s.dir.clone().add(new THREE.Vector3(R() - 0.5, R() - 0.5, R() - 0.5).multiplyScalar(0.9)).normalize();
    const p = d.multiplyScalar(k.open ? 13 : 16 + R() * 8);
    const m = new THREE.SpriteNodeMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
    const uHov = uniform(0);
    m.colorNode = T.texture(keyTex(k), uv()).rgb.mul(uHov.mul(0.35).add(0.9));
    m.opacityNode = T.texture(keyTex(k), uv()).a;
    m.scaleNode = float(k.open ? 3.0 : 2.3).mul(uHov.mul(0.25).add(1));
    const sp = new THREE.Sprite(m); sp.position.copy(p); scene.add(sp);
    /* куда разнесено воспоминание: 6 далёких узлов, к каждому путь через 2 промежуточных */
    const targets = [];
    while (targets.length < 6) { const j = (R() * N) | 0; const dx = P[j * 3] - p.x, dy = P[j * 3 + 1] - p.y, dz = P[j * 3 + 2] - p.z; if (dx * dx + dy * dy + dz * dz > 30 * 30) targets.push(j); }
    const segs = [], sts = [];
    const nearest = (v) => { let best = 0, bd = 1e9; for (let t = 0; t < 400; t++) { const j = (R() * N) | 0; const dx = P[j * 3] - v.x, dy = P[j * 3 + 1] - v.y, dz = P[j * 3 + 2] - v.z, dd = dx * dx + dy * dy + dz * dz; if (dd < bd) { bd = dd; best = j; } } return new THREE.Vector3(P[best * 3], P[best * 3 + 1], P[best * 3 + 2]); };
    targets.forEach((j) => {
      const end = new THREE.Vector3(P[j * 3], P[j * 3 + 1], P[j * 3 + 2]);
      const pts = [p.clone(), nearest(p.clone().lerp(end, 0.33)), nearest(p.clone().lerp(end, 0.66)), end];
      for (let q = 0; q < 3; q++) { segs.push(pts[q], pts[q + 1]); sts.push(q / 3, (q + 1) / 3); }
    });
    const g = new THREE.BufferGeometry().setFromPoints(segs);
    g.setAttribute('st', new THREE.BufferAttribute(new Float32Array(sts), 1));
    const uGrow = uniform(0);
    const hm = new THREE.LineBasicNodeMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
    hm.positionNode = positionLocal.add(drift(positionLocal));
    const st = attribute('st', 'float');
    const head = smoothstep(0.06, 0, abs(st.sub(uGrow)));
    const run = smoothstep(0.05, 0, abs(fract(time.mul(0.35)).sub(st)));
    hm.colorNode = vec3(...s.col).mul(float(1.2).add(head.mul(5)).add(run.mul(3)));
    hm.opacityNode = st.lessThan(uGrow).select(float(0.85), float(0)).mul(dfade(positionWorld).mul(0.6).add(0.4));
    const hl = new THREE.LineSegments(g, hm); hl.visible = false; scene.add(hl);
    /* вспышки на концах */
    const ends = targets.map((j) => {
      const em = new THREE.SpriteNodeMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
      em.colorNode = vec3(...s.col).mul(2.5);
      em.opacityNode = T.texture(dot, uv()).a;
      const e = new THREE.Sprite(em); e.position.set(P[j * 3], P[j * 3 + 1], P[j * 3 + 2]); e.scale.setScalar(0.01); e.visible = false; scene.add(e);
      return e;
    });
    return { k, sp, uHov, hl, uGrow, ends, pos: p, hov: 0, grow: 0 };
  });

  /* ---------- свечение ---------- */
  const pipe = new THREE.RenderPipeline(renderer);
  const sp = T.pass(scene, cam);
  const col = sp.getTextureNode('output');
  pipe.outputNode = col.add(THREE.bloom(col, small ? 0.7 : 0.95, 0.55, 0.12));

  /* ---------- интерфейс ---------- */
  const ui = document.getElementById('ui');
  const label = document.createElement('div'); label.className = 'lb'; ui.appendChild(label);
  const card = document.createElement('div'); card.className = 'card'; ui.appendChild(card);
  const hint = document.createElement('div'); hint.className = 'hint'; hint.textContent = L.hint; ui.appendChild(hint);
  setTimeout(() => { hint.style.opacity = '0'; }, 7000);

  /* ---------- камера: оглядываться перетаскиванием, без нажатия медленный поворот ---------- */
  let yaw = 0.6, pitch = 0.05, vyaw = 0, vpitch = 0, drag = false, lx = 0, ly = 0, mx = 0, my = 0, has = false, idle = 0;
  let zoom = 0, focus = null, focusK = 0;
  const camPos = new THREE.Vector3(), look = new THREE.Vector3(), tmp = new THREE.Vector3();
  cv.addEventListener('pointerdown', (e) => { drag = true; lx = e.clientX; ly = e.clientY; cv.setPointerCapture(e.pointerId); downAt = performance.now(); downX = e.clientX; downY = e.clientY; });
  let downAt = 0, downX = 0, downY = 0;
  addEventListener('pointerup', (e) => {
    drag = false;
    if (performance.now() - downAt < 300 && Math.hypot(e.clientX - downX, e.clientY - downY) < 6) click();
  });
  addEventListener('pointermove', (e) => {
    has = true; mx = e.clientX; my = e.clientY; idle = 0;
    if (drag) { vyaw -= (e.clientX - lx) * 0.0032; vpitch -= (e.clientY - ly) * 0.0028; lx = e.clientX; ly = e.clientY; }
  });
  addEventListener('wheel', (e) => { zoom = Math.max(-4, Math.min(9, zoom - e.deltaY * 0.01)); }, { passive: true });
  addEventListener('keydown', (e) => { if (e.key === 'Escape') { if (focus) unfocus(); else location.replace('../'); } });
  addEventListener('resize', () => { cam.aspect = innerWidth / innerHeight; cam.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight, false); });

  let hovered = null;
  function pick() {
    if (!has) return null;
    let best = null, bd = 1e9;
    keyObjs.forEach((o) => {
      tmp.copy(o.pos).project(cam);
      if (tmp.z > 1) return;
      const sx = (tmp.x + 1) / 2 * innerWidth, sy = (1 - tmp.y) / 2 * innerHeight;
      const r = Math.max(26, (o.k.open ? 3 : 2.3) * innerHeight / (2 * Math.tan(THREE.MathUtils.degToRad(cam.fov / 2)) * cam.position.distanceTo(o.pos)) * 0.35);
      const d = Math.hypot(sx - mx, sy - my);
      o.r = r;
      if (d < r && d < bd) { bd = d; best = o; }
    });
    return best;
  }
  function click() {
    if (hovered) openCard(hovered);
    else if (focus) unfocus();
  }
  function openCard(o) {
    focus = o;
    card.innerHTML = '';
    const k = document.createElement('div'); k.className = 'k'; k.textContent = L.mem;
    const h = document.createElement('div'); h.className = 'h'; h.textContent = o.k.label[lang];
    card.append(k, h);
    if (o.k.open) {
      const t = document.createElement('div'); t.className = 't'; t.textContent = o.k.text[lang]; card.appendChild(t);
      const b = document.createElement('button'); b.textContent = L.enter;
      b.onclick = (e) => { e.stopPropagation(); location.href = '../memory/pendant/'; };
      card.appendChild(b);
    } else {
      const t = document.createElement('div'); t.className = 'x'; t.textContent = Math.random() < 0.5 ? L.closed : L.damaged; card.appendChild(t);
    }
    card.classList.add('on');
  }
  function unfocus() { focus = null; card.classList.remove('on'); }

  /* ---------- кадр ---------- */
  let last = performance.now();
  renderer.setAnimationLoop(() => {
    const now = performance.now(), dt = Math.min(0.05, (now - last) / 1000); last = now;
    idle += dt;
    /* инерция обзора; без касания медленный поворот, курсор чуть тянет взгляд */
    yaw += vyaw; pitch += vpitch; vyaw *= 0.9; vpitch *= 0.9;
    if (!drag) yaw += dt * 0.012 * Math.min(1, idle / 3);
    pitch = Math.max(-1.35, Math.min(1.35, pitch));
    const fx = has && !drag ? (mx / innerWidth - 0.5) * 0.25 : 0, fy = has && !drag ? (my / innerHeight - 0.5) * 0.18 : 0;
    const Y = yaw - fx, Pp = pitch - fy;
    look.set(Math.sin(Y) * Math.cos(Pp), Math.sin(Pp), -Math.cos(Y) * Math.cos(Pp));
    /* к выбранному воспоминанию камера подлетает */
    focusK += ((focus ? 1 : 0) - focusK) * Math.min(1, dt * 1.6);
    camPos.copy(look).multiplyScalar(zoom);
    if (focus) {
      tmp.copy(focus.pos).sub(camPos).normalize();
      look.lerp(tmp, focusK * 0.9).normalize();
      camPos.lerp(focus.pos.clone().multiplyScalar(0.62), focusK);
    }
    cam.position.copy(camPos);
    cam.lookAt(tmp.copy(camPos).add(look));

    hovered = drag ? null : pick();
    cv.style.cursor = hovered ? 'pointer' : drag ? 'grabbing' : 'grab';
    keyObjs.forEach((o) => {
      const on = o === hovered || o === focus;
      o.hov += ((on ? 1 : 0) - o.hov) * Math.min(1, dt * 5);
      o.uHov.value = o.hov;
      o.grow += on ? dt * 0.6 : -dt * 1.5; o.grow = Math.max(0, Math.min(1.02, o.grow));
      o.uGrow.value = o.grow;
      o.hl.visible = o.grow > 0.001;
      o.ends.forEach((e) => { e.visible = o.grow > 0.95; e.scale.setScalar(0.9 + Math.sin(now / 200) * 0.3); });
    });
    if (hovered) {
      tmp.copy(hovered.pos).project(cam);
      label.style.transform = 'translate(' + ((tmp.x + 1) / 2 * innerWidth + Math.max(30, (hovered.r || 30) * 1.3)) + 'px,' + ((1 - tmp.y) / 2 * innerHeight - 10) + 'px)';
      label.textContent = hovered.k.label[lang];
      label.style.opacity = '1';
    } else label.style.opacity = '0';

    pipe.render();
  });

  window.__graph = { N, NE, keys: keyObjs.length,
    keyScreen: (i) => { tmp.copy(keyObjs[i].pos).project(cam); return [(tmp.x + 1) / 2 * innerWidth, (1 - tmp.y) / 2 * innerHeight, tmp.z]; },
    face: (i) => { const d = keyObjs[i].pos.clone().normalize(); yaw = Math.atan2(d.x, -d.z); pitch = Math.asin(d.y); vyaw = vpitch = 0; } };
}
