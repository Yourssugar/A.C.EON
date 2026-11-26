/* ИЗНАНКА (vivi_ellof): точка входа.
   mount(opts) поднимает сцену поверх текущей страницы.
     opts.audio  элемент <audio>, который уже играл на главной: трек продолжается, но через искажения
     opts.lang   язык сайта (en, ru, de, fr, es, it, pl); пока тексты только ru и en
   Главная зовёт mount() сама после ключа, адрес при этом меняется на vivi_ellof/.
   vivi_ellof/index.html зовёт mount() при заходе напрямую (назад/вперёд), тогда звук ждёт первого клика.

   Этап 1: глаз Архитектора в ткани ядра, живое движение, реакции на курсор.
   Модули: js/eye.js (геометрия и материалы), js/gaze.js (движение, зрачок, моргание). */
import * as THREE from './vendor/three-webgpu.min.js';
import { buildEye } from './js/eye.js';
import { createGaze } from './js/gaze.js';

const { positionLocal, time, sin, cos, vec2, vec3, float, instanceIndex, pass, screenUV, length, smoothstep } = THREE.TSL;
const BASE = new URL('./', import.meta.url);

const TXT = {
  ru: { obs: '> НАБЛЮДЕНИЕ НАЧАТО', left: 'ДО ВЗРЫВА', sec: 'с', wait: 'я жду' },
  en: { obs: '> OBSERVATION STARTED', left: 'UNTIL DETONATION', sec: 's', wait: 'i am waiting' }
};

/* ---------- память изнанки: отдельно от памяти сайта (aceon:trace) ---------- */
const MEM_KEY = 'aceon:vivi';
const LG0 = Math.log10(0.000970);
function memLoad() {
  let m = {};
  try { m = JSON.parse(localStorage.getItem(MEM_KEY) || '{}') || {}; } catch (e) {}
  if (typeof m.lg !== 'number') m.lg = typeof m.us === 'number' ? Math.log10(Math.max(1e-9, m.us / 1e6)) : LG0;
  delete m.us;
  if (typeof m.acc !== 'number') m.acc = 0;
  return m;
}
function memSave(m) { try { localStorage.setItem(MEM_KEY, JSON.stringify(m)); } catch (e) {} }

/* Счётчик Зенона: каждый шаг забирает долю остатка, ноль недостижим.
   Храним десятичный логарифм остатка, показываем три значащие цифры с нужным числом нулей */
const STEP_TIME = Math.log10(0.97);   /* раз в 5 минут внутри */
export const STEP_SEEN = Math.log10(0.9); /* когда глаз находит (следующие этапы) */
function fmtLg(lg, comma) {
  let e = Math.floor(lg), m = Math.pow(10, lg - e);
  let digits = Math.round(m * 100);
  if (digits >= 1000) { digits = 100; e += 1; }
  const s = '0.' + '0'.repeat(Math.max(0, -e - 1)) + String(digits);
  return comma ? s.replace('.', ',') : s;
}

function siteLang() {
  try { return (JSON.parse(localStorage.getItem('aceon:site') || '{}').lang) || 'en'; } catch (e) { return 'en'; }
}

let mounted = false;

export async function mount(opts = {}) {
  if (mounted) return; mounted = true;
  const lang = opts.lang || siteLang();
  const L = TXT[lang] || TXT.en;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- слой поверх страницы ---------- */
  const root = document.createElement('div');
  root.id = 'vivi-root';
  root.style.cssText = 'position:fixed;inset:0;z-index:9999;background:#000;overflow:hidden;cursor:none;'
    + 'font-family:"JetBrains Mono",monospace;color:#b9c0cf;user-select:none;touch-action:none;';
  const cv = document.createElement('canvas');
  cv.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block;opacity:0;transition:opacity 5s ease;';
  root.appendChild(cv);

  const hud = document.createElement('div');
  hud.style.cssText = 'position:absolute;left:0;right:0;bottom:28px;text-align:center;font-size:12px;letter-spacing:4px;'
    + 'opacity:0;transition:opacity 3s ease;pointer-events:none;text-shadow:0 0 6px #000;';
  hud.innerHTML = '<span id="vv-l"></span>&nbsp;&nbsp;<span id="vv-c" style="color:#d8dbe4"></span>';
  root.appendChild(hud);

  const line = document.createElement('div');
  line.style.cssText = 'position:absolute;left:28px;top:24px;font-size:12px;letter-spacing:3px;color:#c23a44;'
    + 'opacity:0;transition:opacity 2.5s ease;pointer-events:none;white-space:nowrap;';
  root.appendChild(line);
  document.body.appendChild(root);
  document.documentElement.style.background = '#000';

  const mem = memLoad();
  const comma = lang !== 'en';
  hud.querySelector('#vv-l').textContent = L.left;
  const cEl = hud.querySelector('#vv-c');
  const showCount = () => { cEl.textContent = fmtLg(mem.lg, comma) + ' ' + L.sec; };
  showCount();

  /* ---------- рендер ---------- */
  let renderer;
  try {
    renderer = new THREE.WebGPURenderer({ canvas: cv, antialias: true, powerPreference: 'high-performance' });
    await renderer.init();
  } catch (e) {
    console.warn('[vivi_ellof] renderer failed', e);
    hud.style.opacity = '0.75';
    startSound(opts.audio || null);
    return;
  }
  const isGPU = !!(renderer.backend && renderer.backend.isWebGPUBackend);
  console.info('[vivi_ellof] backend:', isGPU ? 'WebGPU' : 'WebGL2');
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  /* ---------- текстуры ---------- */
  const big = isGPU && innerHeight * Math.min(devicePixelRatio || 1, 2) >= 1300;
  const loader = new THREE.TextureLoader();
  let aniso = 8; try { aniso = Math.min(8, renderer.getMaxAnisotropy()); } catch (e) {}
  const load = (f, srgb, rep) => loader.loadAsync(new URL('tex/' + f, BASE).href).then((t) => {
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    if (rep) { t.wrapS = t.wrapT = THREE.RepeatWrapping; }
    t.anisotropy = aniso;
    return t;
  });
  let tex;
  try {
    const [iris, irisH, sclera, tissue, tissueH, pano] = await Promise.all([
      load(big ? 'iris_4k.webp' : 'iris_2k.webp', true),
      load('iris_h_2k.webp', false),
      load(big ? 'sclera_4k.webp' : 'sclera_2k.webp', true, true),
      load('tissue.webp', true, true),
      load('tissue_h.webp', false, true),
      load('lab_pano_2k.webp', true)
    ]);
    pano.mapping = THREE.EquirectangularReflectionMapping;
    tex = { iris, irisH, sclera, tissue, tissueH, pano };
  } catch (e) {
    console.warn('[vivi_ellof] textures', e);
  }

  /* ---------- сцена ---------- */
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);
  scene.fog = new THREE.FogExp2(0x010101, 0.09);
  if (tex) {
    scene.environment = tex.pano;
    scene.environmentIntensity = 0.42;
    scene.environmentRotation.y = -1.1;   /* огонь панорамы справа спереди */
  }
  const cam = new THREE.PerspectiveCamera(35, 1, 0.05, 100);
  cam.position.set(0, 0, 4.6);

  /* свет: застывший огонь справа, холод мониторов слева сверху, слабый контур сверху */
  const fire = new THREE.PointLight(0xff7a2e, 11, 14, 2);
  fire.position.set(3.4, 0.4, 2.6);
  const cold = new THREE.DirectionalLight(0x86a8ff, 0.7);
  cold.position.set(-3, 2.4, 3);
  const top = new THREE.SpotLight(0xd8e0ff, 14, 9, 0.5, 0.8, 2);
  top.position.set(0.2, 3.4, 3.2);
  scene.add(fire, cold, top);

  let eye = null;
  if (tex) { eye = buildEye(THREE, tex); scene.add(eye.root); }
  const gaze = createGaze({ reduce });

  /* застывшая пыль между зрителем и глазом */
  const N = 1400;
  const dustMat = new THREE.MeshBasicNodeMaterial({ color: 0x9aa1b2, transparent: true, opacity: 0.7 });
  const iF = float(instanceIndex);
  dustMat.positionNode = positionLocal.add(vec3(
    sin(time.mul(0.031).add(iF.mul(1.7))).mul(0.015),
    cos(time.mul(0.027).add(iF.mul(2.3))).mul(0.015), float(0)));
  const dust = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.0045, 0), dustMat, N);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), p = new THREE.Vector3();
  for (let i = 0; i < N; i++) {
    p.set((Math.random() - 0.5) * 7, (Math.random() - 0.5) * 4.5, Math.random() * 4.5 - 1.2);
    const s = 0.5 + Math.pow(Math.random(), 3) * 2.5;
    sc.set(s, s, s); q.setFromEuler(new THREE.Euler(Math.random() * 6, Math.random() * 6, 0));
    m4.compose(p, q, sc); dust.setMatrixAt(i, m4);
  }
  scene.add(dust);

  /* ---------- пост-обработка: свечение, лёгкая аберрация, зерно, виньетка ---------- */
  let pipe = null;
  try {
    pipe = new THREE.RenderPipeline(renderer);
    const sp = pass(scene, cam);
    const col = sp.getTextureNode('output');
    const ca = THREE.chromaticAberration(col, float(0.35), vec2(0.5, 0.5), float(1.05));
    const bl = THREE.bloom(col, 0.32, 0.45, 0.8);
    const vig = smoothstep(float(0.95), float(0.28), length(screenUV.sub(0.5)).mul(1.25));
    pipe.outputNode = THREE.film(ca.add(bl).mul(vig), float(0.16));
  } catch (e) {
    console.warn('[vivi_ellof] post', e);
    pipe = null;
  }

  /* ---------- курсор ---------- */
  const ptr = { nx: 0, ny: 0, has: false, last: performance.now(), out: false };
  root.addEventListener('pointermove', (e) => {
    ptr.nx = e.clientX / innerWidth * 2 - 1; ptr.ny = -(e.clientY / innerHeight * 2 - 1);
    ptr.has = true; ptr.out = false; ptr.last = performance.now();
  });
  document.addEventListener('mouseout', (e) => { if (!e.relatedTarget) ptr.out = true; });
  document.addEventListener('mouseover', () => { ptr.out = false; });

  /* курсор лежит на «стекле» перед зрителем, глаз смотрит в эту точку */
  const ray = new THREE.Vector3(), hit = new THREE.Vector3(), irisW = new THREE.Vector3(), irisE = new THREE.Vector3();
  function cursorTarget() {
    ray.set(ptr.nx, ptr.ny, 0.5).unproject(cam).sub(cam.position).normalize();
    const zp = cam.position.z - 2.3;
    const t = (zp - cam.position.z) / ray.z;
    hit.copy(cam.position).addScaledVector(ray, t);
    return { yaw: Math.atan2(hit.x, hit.z), pitch: Math.atan2(hit.y, Math.hypot(hit.x, hit.z)) };
  }
  function cursorNearIris() {
    if (!eye) return false;
    irisW.set(0, 0, 1.0); eye.eyeball.localToWorld(irisW); irisW.project(cam);
    irisE.set(0, 0.5, 0.86); eye.eyeball.localToWorld(irisE); irisE.project(cam);
    const rx = (irisE.x - irisW.x) * innerWidth / 2, ry = (irisE.y - irisW.y) * innerHeight / 2;
    const rad = Math.hypot(rx, ry);
    const dx = (ptr.nx - irisW.x) * innerWidth / 2, dy = (ptr.ny - irisW.y) * innerHeight / 2;
    return Math.hypot(dx, dy) < rad * 1.1;
  }

  function resize() {
    const w = innerWidth, h = innerHeight;
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
    renderer.setSize(w, h, false);
    cam.aspect = w / h;
    cam.fov = w / h < 1 ? 52 : 35;        /* телефон стоя: глаз должен влезть по ширине */
    cam.updateProjectionMatrix();
  }
  addEventListener('resize', resize);
  resize();

  /* ---------- цикл ---------- */
  let lastT = performance.now(), camZ = 4.6, camX = 0, camY = 0;
  function tick() {
    const now = performance.now(), dt = Math.min(0.05, (now - lastT) / 1000); lastT = now;
    if (!document.hidden) {
      mem.acc += dt;
      if (mem.acc >= 300) { mem.acc -= 300; mem.lg += STEP_TIME; showCount(); memSave(mem); }
    }
    const idle = (now - ptr.last) / 1000;
    const st = gaze.update(dt, ptr.has ? cursorTarget() : null,
      { idle, out: ptr.out, edgeX: ptr.nx / 2, edgeY: ptr.ny / 2, near: ptr.has && !ptr.out && idle < 3 && cursorNearIris() });
    if (eye) eye.set(st);

    /* камеру очень медленно тянет к глазу, пока он смотрит пристально */
    const k = 1 - Math.exp(-dt * 0.6);
    camZ += ((4.6 - st.focus * 0.35) - camZ) * k * 0.5;
    if (!reduce) { camX += (-ptr.nx * 0.12 - camX) * k; camY += (-ptr.ny * 0.08 - camY) * k; }
    cam.position.set(camX, camY, camZ);
    cam.lookAt(0, 0, 0);

    if (pipe) pipe.render(); else renderer.render(scene, cam);
  }
  renderer.setAnimationLoop(tick);

  document.addEventListener('visibilitychange', () => {
    renderer.setAnimationLoop(document.hidden ? null : tick);
    lastT = performance.now();
    memSave(mem);
    if (document.hidden) { root.dataset.t = document.title; document.title = L.wait; }
    else if (root.dataset.t) document.title = root.dataset.t;
  });
  addEventListener('pagehide', () => memSave(mem));
  addEventListener('popstate', () => {});

  requestAnimationFrame(() => { cv.style.opacity = '1'; });
  setTimeout(() => { hud.style.opacity = '0.7'; }, 3500);
  setTimeout(() => { line.textContent = L.obs; line.style.opacity = '0.9'; }, 7500);
  setTimeout(() => { line.style.opacity = '0'; }, 15000);

  window.__vivi = { backend: isGPU ? 'WebGPU' : 'WebGL2', gaze, eye, cam, scene };
  startSound(opts.audio || null);
}

/* ---------- звук: тот же трек, замедленный, глухой, в длинном отражении; под ним гул с биением ---------- */
function startSound(el) {
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;

  function build(audioEl) {
    const ctx = new AC();
    const master = ctx.createGain(); master.gain.value = 0; master.connect(ctx.destination);
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 760; lp.Q.value = 0.6;
    const dry = ctx.createGain(); dry.gain.value = 0.55;
    const wet = ctx.createGain(); wet.gain.value = 0.7;
    const verb = ctx.createConvolver(); verb.buffer = impulse(ctx, 4.5, 2.6);
    lp.connect(dry); dry.connect(master);
    lp.connect(verb); verb.connect(wet); wet.connect(master);
    if (audioEl) {
      ['preservesPitch', 'mozPreservesPitch', 'webkitPreservesPitch'].forEach((k) => { if (k in audioEl) audioEl[k] = false; });
      try { audioEl.defaultPlaybackRate = 0.5; audioEl.playbackRate = 0.5; } catch (e) {}
      audioEl.volume = 1;
      try { ctx.createMediaElementSource(audioEl).connect(lp); } catch (e) { console.warn('[vivi_ellof] media source', e); }
    }
    const hum = ctx.createGain(); hum.gain.value = 0.05;
    const hlp = ctx.createBiquadFilter(); hlp.type = 'lowpass'; hlp.frequency.value = 120;
    hum.connect(hlp); hlp.connect(master);
    [46, 47.3].forEach((f) => { const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = f; o.connect(hum); o.start(); });
    const t = ctx.currentTime;
    master.gain.setValueAtTime(0.0001, t);
    master.gain.exponentialRampToValueAtTime(0.9, t + 5);
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  }

  if (el) { build(el); return; }
  const once = () => {
    removeEventListener('pointerdown', once); removeEventListener('keydown', once);
    const tracks = ['audio/track1.mp3', 'audio/track2.mp3'];
    const a = new Audio(new URL('../' + tracks[Math.random() * tracks.length | 0], BASE).href);
    a.loop = true;
    build(a);
    a.play().catch(() => {});
  };
  addEventListener('pointerdown', once); addEventListener('keydown', once);
}

function impulse(ctx, sec, decay) {
  const rate = ctx.sampleRate, n = Math.floor(rate * sec);
  const b = ctx.createBuffer(2, n, rate);
  for (let c = 0; c < 2; c++) {
    const d = b.getChannelData(c);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, decay);
  }
  return b;
}
