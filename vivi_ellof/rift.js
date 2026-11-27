/* ИЗНАНКА (vivi_ellof): точка входа.
   mount(opts) поднимает сцену поверх текущей страницы.
     opts.audio  элемент <audio>, который уже играл на главной: трек продолжается, но через искажения
     opts.lang   язык сайта (en, ru, de, fr, es, it, pl); пока тексты только ru и en
   Главная зовёт mount() сама после ключа, адрес при этом меняется на vivi_ellof/.
   vivi_ellof/index.html зовёт mount() при заходе напрямую (назад/вперёд), тогда звук ждёт первого клика.

   Этап 2: вход из символов (js/intro.js), пока грузится мир; глаз в ядре лаборатории, кресло Виви,
   застывший взрыв, луч взгляда, зрение из символов. После раскрытия камера вплотную к глазу, потом отъезжает.
   Модули: js/eye.js (глаз), js/gaze.js (движение глаза), js/lab.js (лаборатория), js/ascii.js (символы). */
/* у модулей версия в адресе: после обновления на GitHub Pages браузер не смешает старые и новые файлы */
import * as THREE from './vendor/three-webgpu.min.js';
import { buildEye } from './js/eye.js?v=20261127c';
import { createGaze } from './js/gaze.js?v=20261127c';
import { buildLab, FLOOR } from './js/lab.js?v=20261127c';
import { buildItems } from './js/items.js?v=20261127c';
import { buildRoom, buildLights } from './js/room.js?v=20261127c';
import { createQuest } from './js/quest.js?v=20261127c';
import { makeAscii, atlasTexture } from './js/ascii.js?v=20261127c';
import { makeIntro } from './js/intro.js?v=20261127c';
import { makeTerminal } from './js/terminal.js?v=20261127c';

const { positionLocal, time, sin, cos, vec2, vec3, float, instanceIndex, pass, screenUV, length, smoothstep,
  mrt, output, convertToTexture, mx_noise_float, positionWorld, normalView, abs, vec4, mix, uniform } = THREE.TSL;
const BASE = new URL('./', import.meta.url);

const TXT = {
  ru: { obs: '> НАБЛЮДЕНИЕ НАЧАТО', left: 'ДО ВЗРЫВА', sec: 'с', wait: 'я жду',
    noticed: '> АНОМАЛИЯ ОБНАРУЖЕНА', open: '> РАСШИФРОВАНО: ',
    caught: 'НАБЛЮДАТЕЛЬ ОБНАРУЖЕН.', tries: 'осталось наблюдений: ', none: 'наблюдений больше нет.',
    memory: 'ВОСПОМИНАНИЕ', memClosed: 'этот фрагмент пока не открывается.', thing: 'ПРЕДМЕТ', person: 'ЧЕЛОВЕК',
    speech: ['ТЫ не ОНА', 'ПОИСК.'] },
  en: { obs: '> OBSERVATION STARTED', left: 'UNTIL DETONATION', sec: 's', wait: 'i am waiting',
    noticed: '> ANOMALY DETECTED', open: '> DECODED: ',
    caught: 'OBSERVER DETECTED.', tries: 'observations left: ', none: 'no observations left.',
    memory: 'MEMORY', memClosed: 'this fragment does not open yet.', thing: 'OBJECT', person: 'PERSON',
    speech: ['YOU are not HER', 'SEARCH.'] }
};

/* ---------- память изнанки: отдельно от памяти сайта (aceon:trace) ---------- */
const MEM_KEY = 'aceon:vivi';
const TRIES = 3;
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
  cv.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block;';
  root.appendChild(cv);

  const hud = document.createElement('div');
  hud.style.cssText = 'position:absolute;left:0;right:0;bottom:28px;text-align:center;font-size:12px;letter-spacing:4px;'
    + 'opacity:0;transition:opacity 3s ease;pointer-events:none;text-shadow:0 0 6px #000;';
  hud.innerHTML = '<span id="vv-l"></span>&nbsp;&nbsp;<span id="vv-c" style="color:#d8dbe4"></span>'
    + '<span id="vv-t" style="display:inline-block;margin-left:26px;vertical-align:middle;"></span>';
  root.appendChild(hud);

  const line = document.createElement('div');
  line.style.cssText = 'position:absolute;left:28px;top:24px;font-size:12px;letter-spacing:3px;color:#c23a44;'
    + 'opacity:0;transition:opacity 2.5s ease;pointer-events:none;white-space:nowrap;';
  root.appendChild(line);
  /* свой курсор: тонкое кольцо и точка. Когда глаз тебя потерял, курсор почти гаснет.
     state: 'idle' обычный, 'hover' над тем, что можно трогать, 'hold' пока держишь (для осколков) */
  const cur = document.createElement('div');
  cur.style.cssText = 'position:absolute;left:0;top:0;width:0;height:0;pointer-events:none;z-index:5;opacity:0;transition:opacity .4s ease;';
  cur.innerHTML = '<div class="r" style="position:absolute;left:-11px;top:-11px;width:22px;height:22px;border:1px solid rgba(214,226,246,.75);'
    + 'border-radius:50%;box-sizing:border-box;transition:transform .25s ease,border-color .25s ease;"></div>'
    + '<div style="position:absolute;left:-1.5px;top:-1.5px;width:3px;height:3px;border-radius:50%;background:#e4ecfa;"></div>'
    + '<svg width="44" height="44" style="position:absolute;left:-22px;top:-22px;overflow:visible"><circle cx="22" cy="22" r="17" fill="none" '
    + 'stroke="rgba(170,210,255,.95)" stroke-width="1.5" stroke-dasharray="106.8" stroke-dashoffset="106.8" transform="rotate(-90 22 22)"/></svg>'
    + '<div class="pc" style="position:absolute;left:18px;top:12px;font-size:11px;letter-spacing:2px;color:rgba(190,215,255,.9);'
    + 'white-space:nowrap;opacity:0;transition:opacity .25s ease;text-shadow:0 0 4px #000;"></div>'
    + '<div class="lb" style="position:absolute;left:20px;top:-24px;font-size:12px;letter-spacing:3px;color:#e6ecf6;'
    + 'white-space:nowrap;opacity:0;transition:opacity .3s ease;text-shadow:0 0 6px #000,0 0 2px #000;"></div>';
  root.appendChild(cur);
  const curRing = cur.querySelector('.r');
  const curArc = cur.querySelector('circle');
  const curPct = cur.querySelector('.pc');
  const curLb = cur.querySelector('.lb');
  const coarse = matchMedia('(pointer: coarse)').matches;
  function cursorState(stt, hold, seen, label) {
    curRing.style.transform = stt === 'hover' || stt === 'look' ? 'scale(1.6)' : stt === 'hold' || stt === 'gate' ? 'scale(.55)' : 'scale(1)';
    curRing.style.borderColor = seen ? 'rgba(255,120,120,.85)' : stt === 'gate' ? 'rgba(120,240,230,.95)' : stt === 'idle' ? 'rgba(214,226,246,.75)' : 'rgba(150,200,255,.95)';
    curArc.setAttribute('stroke', stt === 'gate' ? 'rgba(120,240,230,.95)' : 'rgba(170,210,255,.95)');
    curArc.setAttribute('stroke-dashoffset', String(106.8 * (1 - Math.min(1, hold || 0))));
    curLb.style.opacity = label ? '1' : '0';
    if (label && curLb.textContent !== label) curLb.textContent = label;
    /* над осколком видно, сколько уже извлечено; прогресс сохраняется */
    const show = (stt === 'hover' || stt === 'hold') && hold > 0 && hold < 1;
    curPct.style.opacity = show ? '1' : '0';
    if (show) curPct.textContent = Math.floor(Math.min(1, hold) * 100) + '%';
  }

  const veil = document.createElement('div');
  veil.style.cssText = 'position:absolute;inset:0;background:#000;opacity:0;transition:opacity .7s ease;pointer-events:none;z-index:6;';
  root.appendChild(veil);
  let ejected = false;
  /* выброс: изнанка закрывается, обычная главная загружается заново (рождение вселенной) */
  function eject() {
    try { sessionStorage.removeItem('aceon:rift'); } catch (e) {}
    location.replace(new URL('../', BASE).href);
  }

  /* карточка расшифрованного предмета: описание или воспоминание (пока заглушка) */
  const panel = document.createElement('div');
  panel.style.cssText = 'position:absolute;left:50%;top:50%;width:min(440px,84vw);transform:translate(-50%,-46%);z-index:6;'
    + 'padding:26px 28px 24px;background:rgba(3,5,9,.86);border:1px solid rgba(150,190,240,.28);color:#d9e0ec;'
    + 'font-size:14px;line-height:1.7;letter-spacing:.04em;opacity:0;pointer-events:none;transition:opacity .45s ease,transform .45s ease;';
  root.appendChild(panel);
  let panelOpen = false;
  function openPanel(it) {
    const kind = it.act === 'memory' ? L.memory : it.kind === 'worker' ? L.person : L.thing;
    panel.innerHTML = '';
    const k = document.createElement('div'); k.textContent = kind;
    k.style.cssText = 'font-size:11px;letter-spacing:4px;color:' + (it.act === 'memory' ? '#6fd3d6' : '#8a93a6') + ';margin-bottom:10px;';
    const h = document.createElement('div'); h.textContent = it.label[lang] || it.label.en;
    h.style.cssText = 'font-size:19px;letter-spacing:.12em;margin-bottom:14px;color:#eef2f8;';
    const t = document.createElement('div'); t.textContent = it.text[lang] || it.text.en;
    panel.append(k, h, t);
    if (it.act === 'memory') {
      const c = document.createElement('div'); c.textContent = L.memClosed;
      c.style.cssText = 'margin-top:16px;font-size:12px;letter-spacing:2px;color:#c23a44;';
      panel.appendChild(c);
    }
    panel.style.opacity = '1'; panel.style.transform = 'translate(-50%,-50%)'; panelOpen = true;
  }
  function closePanel() { panel.style.opacity = '0'; panel.style.transform = 'translate(-50%,-46%)'; panelOpen = false; }
  addEventListener('keydown', (e) => { if (e.key === 'Escape' && panelOpen) closePanel(); });

  /* обращение к зрителю после отъезда: фразы по одной в центре экрана */
  const speech = document.createElement('div');
  speech.style.cssText = 'position:absolute;left:0;right:0;top:71%;text-align:center;pointer-events:none;z-index:4;'
    + 'font-size:clamp(17px,2.4vw,32px);letter-spacing:.32em;color:#dfe6f3;opacity:0;transition:opacity .8s ease;text-shadow:0 0 14px #000,0 0 3px #000;';
  root.appendChild(speech);
  /* шторка над холстом на время терминала. Холст при этом виден браузеру: скрытый через opacity:0
     холст браузер не выводит, и вся работа видеокарты по прогреву откладывается до первого показа */
  const shade = document.createElement('div');
  shade.style.cssText = 'position:absolute;inset:0;background:#000;z-index:3;pointer-events:none;transition:opacity 1s ease;';
  root.appendChild(shade);

  document.body.appendChild(root);
  document.documentElement.style.background = '#000';

  /* наблюдения: три в день. Поимка тратит одно, и сцена начинается заново с глаза из символов,
     без выброса на главную. Когда все три потрачены, каждая поимка выбрасывает на главную
     и войти можно снова только ключом. Новый день (по местному времени) снова даёт три */
  const mem = memLoad();
  const today = new Date().toLocaleDateString('sv');
  if (mem.day !== today) { mem.day = today; mem.tries = TRIES; memSave(mem); }
  if (typeof mem.tries !== 'number') mem.tries = TRIES;

  /* терминал сразу, до тяжёлой загрузки: его анимации идут отдельно от основного потока и не замирают */
  /* повторный вход (уже бывал внутри): терминал печатает быстрее */
  mem.visits = (mem.visits || 0) + 1; memSave(mem);
  const term = makeTerminal(lang, { fast: mem.visits > 1 });
  root.appendChild(term.el);
  const tTerm = performance.now();
  /* звук тоже сразу: трек продолжается без паузы, искажения нарастают плавно */
  let sound = startSound(opts.audio || null);

  let sayT = 0;
  const say = (txt) => {
    line.textContent = txt; line.style.opacity = '0.95';
    clearTimeout(sayT); sayT = setTimeout(() => { line.style.opacity = '0'; }, 3800);
  };
  const comma = lang !== 'en';
  hud.querySelector('#vv-l').textContent = L.left;
  const cEl = hud.querySelector('#vv-c');
  const showCount = () => { cEl.textContent = fmtLg(mem.lg, comma) + ' ' + L.sec; };
  showCount();
  /* наблюдения на сегодня: три века, потраченные закрыты красным */
  const tEl = hud.querySelector('#vv-t');
  const showTries = () => {
    tEl.innerHTML = '';
    for (let i = 0; i < TRIES; i++) {
      const m = document.createElement('span');
      const left = i < mem.tries;
      m.style.cssText = 'display:inline-block;width:16px;height:7px;margin:0 4px;border-radius:50%;box-sizing:border-box;'
        + (left ? 'border:1px solid rgba(210,222,240,.8);' : 'border:1px solid rgba(194,58,68,.7);background:rgba(194,58,68,.45);transform:scaleY(.35);');
      tEl.appendChild(m);
    }
  };
  showTries();
  try { sessionStorage.setItem('aceon:vivi-lang', lang); } catch (e) {}

  /* ---------- рендер ---------- */
  let renderer;
  try {
    renderer = new THREE.WebGPURenderer({ canvas: cv, antialias: true, powerPreference: 'high-performance' });
    await renderer.init();
  } catch (e) {
    console.warn('[vivi_ellof] renderer failed', e);
    hud.style.opacity = '0.75';
    return;
  }
  const isGPU = !!(renderer.backend && renderer.backend.isWebGPUBackend);
  console.info('[vivi_ellof] backend:', isGPU ? 'WebGPU' : 'WebGL2');
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  /* какая видеокарта на самом деле считает сцену. Программный рендер (видеокарта не дала себя
     использовать, считает процессор) узнаём по имени и по флагу запасного адаптера */
  const gpu = await gpuInfo(renderer, isGPU);
  console.info('[vivi_ellof] GPU:', gpu.name || '?', gpu.soft ? '(программный рендер, считает процессор)' : '');
  const Q = window.__viviQ || (gpu.soft
    ? { tier: 0, prMax: 0.6, prMin: 0.4, transmission: false, fireOct: 1, fireCount: 12, bloom: false }
    : isGPU
      ? { tier: 2, prMax: Math.min(devicePixelRatio || 1, 2), prMin: 0.6, transmission: true, fireOct: 2, fireCount: 26, bloom: true }
      : { tier: 1, prMax: Math.min(devicePixelRatio || 1, 1.5), prMin: 0.5, transmission: false, fireOct: 2, fireCount: 18, bloom: true });
  /* телефоны: маленький экран и палец вместо мыши. Видеокарта там слабее даже с WebGPU */
  if (!window.__viviQ && coarse && Math.min(screen.width, screen.height) < 820 && Q.tier > 0) {
    Object.assign(Q, { tier: 1, prMax: Math.min(devicePixelRatio || 1, 1.25), prMin: 0.45, transmission: false, fireOct: 1, fireCount: 10, bloom: false, mobile: true });
  }
  let pr = Q.prMax;

  /* ---------- сцена: сначала пустая, глаз и лаборатория добавятся, когда загрузятся текстуры ---------- */
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);
  scene.fog = new THREE.FogExp2(0x050403, 0.014);
  const cam = new THREE.PerspectiveCamera(35, 1, 0.05, 120);
  cam.position.set(0, 0, 4.6);

  /* свет: огонь даёт лаборатория, здесь холод мониторов слева сверху и слабый контур на глазу */
  const cold = new THREE.DirectionalLight(0x86a8ff, 0.7);
  cold.position.set(-3, 2.4, 3);
  const top = new THREE.SpotLight(0xd8e0ff, 14, 9, 0.5, 0.8, 2);
  top.position.set(0.2, 3.4, 3.2);
  scene.add(cold, top);
  /* весь свет лаборатории сразу: иначе при его появлении перекомпилируются все готовые материалы */
  scene.add(buildLights(THREE));

  let eye = null, lab = null, quest = null, items = null;
  let eyeReady = false, eyeReadyT = 0, labReady = false, labReadyAt = 0, warm = -1, warmDone = false;
  const gaze = createGaze({ reduce });

  /* текстуры и сборка мира идут параллельно со входом из символов */
  const big = Q.tier === 2 && innerHeight * Math.min(devicePixelRatio || 1, 2) >= 1300;
  /* картинки распаковываются вне основного потока (ImageBitmap), страница не подвисает */
  const useBitmap = typeof createImageBitmap === 'function';
  const loader = useBitmap ? new THREE.ImageBitmapLoader() : new THREE.TextureLoader();
  if (useBitmap) loader.setOptions({ imageOrientation: 'flipY', premultiplyAlpha: 'none' });
  let aniso = 8; try { aniso = Math.min(8, renderer.getMaxAnisotropy()); } catch (e) {}
  const load = (f, srgb, rep) => loader.loadAsync(new URL(f.indexOf('/') < 0 ? 'tex/' + f : f, BASE).href).then((img) => {
    let t = img;
    if (useBitmap) { t = new THREE.Texture(img); t.flipY = false; t.needsUpdate = true; }
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    if (rep) { t.wrapS = t.wrapT = THREE.RepeatWrapping; }
    t.anisotropy = aniso;
    return t;
  });
  /* загрузка по этапам, пока летим по трубе из чисел. Между тяжёлыми шагами отдаём кадр браузеру.
     1) глаз: текстуры 2K, сборка, заранее собранные шейдеры; 2) лаборатория: так же, по частям;
     3) на сильной видеокарте подмена радужки и белка на 4K. Предыдущее не меняется, пока не готово следующее */
  const frame = () => new Promise((r) => requestAnimationFrame(() => r()));
  const compile = async (obj) => { try { await renderer.compileAsync(obj, cam, scene); } catch (e) {} };
  (async () => {
    try {
      const [iris, irisH, sclera, tissue, tissueH, pano] = await Promise.all([
        load(big ? 'iris_4k.webp' : 'iris_2k.webp', true), load('iris_h_2k.webp', false), load(big ? 'sclera_4k.webp' : 'sclera_2k.webp', true, true),
        load('tissue.webp', true, true), load('tissue_h.webp', false, true), load('lab_pano_2k.webp', true)
      ]);
      pano.mapping = THREE.EquirectangularReflectionMapping;
      /* панорама только для отражений; ставится до сборки шейдеров глаза */
      scene.environment = pano;
      scene.environmentIntensity = 0.6;
      scene.environmentRotation.y = -1.1;
      const tex = { iris, irisH, sclera, tissue, tissueH, pano };
      await frame();
      eye = buildEye(THREE, tex, Q);
      await frame();
      await compile(eye.root);
      scene.add(eye.root);
      eyeReady = true; eyeReadyT = performance.now();

      const t2n = ['flesh', 'flesh_h', 'torn', 'torn_h', 'grate', 'under', 'ceil', 'ceil_h', 'rack', 'rack_glow', 'tank', 'blast',
        'screen_1', 'screen_2', 'screen_3', 'screen_4', 'screen_5', 'screen_6'];
      const PN = ['worker_reach', 'worker_shield', 'worker_fall', 'vivi_back'];
      const pplP = Promise.all(PN.map((n) => load('people/' + n + '.webp', true, false).catch(() => null)));
      /* кот, вещи, фон и мелочь: рисунки Кодекса */
      const IN = ['cat_leap', 'phone', 'journal', 'photo', 'clock', 'badge', 'headphones', 'mug', 'papers',
        'stool', 'extinguisher', 'folders', 'clipboard', 'broken_flask', 'debris'];
      const itP = Promise.all(IN.map((n) => load('items/' + n + '.webp', true, false).catch(() => null)));
      const [panel, panelH, ...t2a] = await Promise.all([load('panel.webp', true, true), load('panel_h.webp', false, true)]
        .concat(t2n.map((n) => load('tex2/' + n + '.webp', !/_h$|_glow$/.test(n), !/^screen|^tank|^rack|^flesh|^blast/.test(n)))));
      /* люди и Виви: рисунки Кодекса */
      const ppl = await pplP;
      const itA = await itP;
      const itex = {}; IN.forEach((n, i) => { if (itA[i]) itex[n] = itA[i]; });
      tex.vivi = ppl[3];
      tex.panel = panel; tex.panelH = panelH;
      const g2 = (n) => t2a[t2n.indexOf(n)];
      const t2 = { flesh: g2('flesh'), fleshH: g2('flesh_h'), torn: g2('torn'), tornH: g2('torn_h'), grate: g2('grate'), under: g2('under'),
        ceil: g2('ceil'), ceilH: g2('ceil_h'), rack: g2('rack'), rackGlow: g2('rack_glow'), tank: g2('tank'), blast: g2('blast'), panel, panelH,
        screens: [1, 2, 3, 4, 5, 6].map((i) => g2('screen_' + i)) };
      await frame();
      lab = buildLab(THREE, tex, Q);
      await frame();
      const room = buildRoom(THREE, t2, Q);
      await frame();
      await compile(lab.root);
      await frame();
      await compile(room.root);
      scene.add(lab.root);
      await frame();
      scene.add(room.root);
      /* предметы и люди: обе версии (настоящая и символьная) компилируются сразу */
      items = buildItems(THREE, FLOOR, { reach: ppl[0], shield: ppl[1], fall: ppl[2] }, itex);
      items.showBoth();
      await frame();
      await compile(items.root);
      scene.add(items.root);
      quest = createQuest(THREE, { cam, items, mem, save: () => memSave(mem) });
      /* все текстуры в видеокарту заранее, иначе они уйдут туда при первом показе и дадут рывок */
      for (const tx of Object.values(tex).concat(t2a, [panel, panelH], ppl, itA)) {
        try { if (tx && tx.isTexture) renderer.initTexture(tx); } catch (e) {}
        await frame();
      }
      warm = 6;   /* несколько кадров всей лаборатории из дальней точки, пока экран закрыт терминалом */
      labReady = true; labReadyAt = performance.now();
    } catch (e) {
      console.warn('[vivi_ellof] world', e);
    }
  })();

  /* взгляд: холодный свет из зрачка; видимый луч в пыли рисует проход символов (js/ascii.js) */
  const beam = new THREE.SpotLight(0xcfe3ff, 260, 40, 0.11, 0.6, 2);
  scene.add(beam, beam.target);
  const gPos = new THREE.Vector3(), gDir = new THREE.Vector3(), gQ = new THREE.Quaternion();

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

  /* знаки Архитектора и стенки тоннеля нужны конвейеру с самого начала: грузятся первыми, пока печатает терминал */
  let glyphsT = null, wallT = null, wallRT = null;
  try {
    [glyphsT, wallT, wallRT] = await Promise.all([load('tunnel/glyphs_architect.webp', false), load('tunnel/tunnel_wall.webp', false, true),
      load('tunnel/tunnel_wall_red.webp', false, true)]);
    [wallT, wallRT].forEach((t) => { t.generateMipmaps = false; t.minFilter = THREE.LinearFilter; t.anisotropy = 1; });
    [glyphsT, wallT, wallRT].forEach((t) => { try { renderer.initTexture(t); } catch (e) {} });
  } catch (e) { console.warn('[vivi_ellof] tunnel textures', e); glyphsT = wallT = wallRT = null; }

  /* ---------- пост-обработка: свечение, лёгкая аберрация, зерно, виньетка ---------- */
  let pipe = null, pipeIntro = null, ascii = null, intro = null, useFull = false;
  const uTen = uniform(0);   /* напряжение: картинку стягивает, края темнеют */
  try {
    pipe = new THREE.RenderPipeline(renderer);
    const sp = pass(scene, cam);
    sp.setMRT(mrt({ output, amask: float(0) }));
    const atlasInfo = atlasTexture(THREE);
    ascii = makeAscii(THREE, { col: sp.getTextureNode('output'), mask: sp.getTextureNode('amask'), depth: sp.getTextureNode('depth'), atlasInfo, glyphs: glyphsT });
    intro = makeIntro(THREE, atlasInfo, ascii.uRes, ascii.uCell, { wall: wallT, wallR: wallRT, glyphs: glyphsT });
    /* вход поверх сцены: пока клетка принадлежит входу, в ней символы входа */
    const merged = vec4(mix(ascii.node.rgb, intro.color, intro.on), 1);
    const col = convertToTexture(merged);
    const ca = THREE.chromaticAberration(col, float(0.35).add(uTen.mul(1.5)), vec2(0.5, 0.5), float(1.05));
    const vig = smoothstep(float(0.95).sub(uTen.mul(0.35)), float(0.28).sub(uTen.mul(0.2)), length(screenUV.sub(0.5)).mul(1.25));
    pipe.outputNode = THREE.film((Q.bloom ? ca.add(THREE.bloom(col, 0.32, 0.45, 0.8)) : ca).mul(vig), float(0.16));
    /* один конвейер с самого начала: собирается в первую секунду, пока экран чёрный,
       и больше не перестраивается (раньше переключение на него давало подвисание) */
  } catch (e) {
    console.warn('[vivi_ellof] post', e);
    pipe = null;
  }

  /* ---------- курсор ---------- */
  const ptr = { nx: 0, ny: 0, has: false, last: performance.now(), out: false, speed: 0, stillT: 0, mt: performance.now() };
  root.addEventListener('pointermove', (e) => {
    const nx = e.clientX / innerWidth * 2 - 1, ny = -(e.clientY / innerHeight * 2 - 1), tn = performance.now();
    if (ptr.has) {
      const d = Math.hypot(nx - ptr.nx, ny - ptr.ny) / 2, dts = Math.max(0.008, (tn - ptr.mt) / 1000);
      ptr.speed = Math.max(ptr.speed, d / dts);
    }
    ptr.mt = tn; ptr.nx = nx; ptr.ny = ny;
    ptr.has = true; ptr.out = false; ptr.last = performance.now();
    if (!coarse) cur.style.transform = 'translate(' + e.clientX + 'px,' + e.clientY + 'px)';
  });
  document.addEventListener('mouseout', (e) => { if (!e.relatedTarget) ptr.out = true; });
  document.addEventListener('mouseover', () => { ptr.out = false; });

  /* курсор лежит на «стекле» перед зрителем, глаз смотрит в эту точку */
  const ray = new THREE.Vector3(), hit = new THREE.Vector3(), irisW = new THREE.Vector3(), irisE = new THREE.Vector3();
  function cursorTarget() {
    ray.set(ptr.nx, ptr.ny, 0.5).unproject(cam).sub(cam.position).normalize();
    const zp = Math.min(6, cam.position.z - 1.6);
    const t = (zp - cam.position.z) / ray.z;
    hit.copy(cam.position).addScaledVector(ray, t);
    return { yaw: Math.atan2(hit.x, hit.z), pitch: Math.atan2(hit.y, Math.hypot(hit.x, hit.z)) };
  }
  function cursorNearIris() { return eyeDist() < 1.1; }
  /* расстояние от курсора до центра зрачка в радиусах радужки (на экране) */
  function eyeDist() {
    if (!eye || !ptr.has || ptr.out) return 99;
    irisW.set(0, 0, 1.0); eye.eyeball.localToWorld(irisW); irisW.project(cam);
    irisE.set(0, 0.5, 0.86); eye.eyeball.localToWorld(irisE); irisE.project(cam);
    const rx = (irisE.x - irisW.x) * innerWidth / 2, ry = (irisE.y - irisW.y) * innerHeight / 2;
    const rad = Math.hypot(rx, ry);
    const dx = (ptr.nx - irisW.x) * innerWidth / 2, dy = (ptr.ny - irisW.y) * innerHeight / 2;
    return Math.hypot(dx, dy) / Math.max(4, rad);
  }

  function resize() {
    const w = innerWidth, h = innerHeight;
    renderer.setPixelRatio(pr);
    renderer.setSize(w, h, false);
    cam.aspect = w / h;
    cam.fov = w / h < 1 ? 52 : 35;        /* телефон стоя: глаз должен влезть по ширине */
    cam.updateProjectionMatrix();
    if (ascii) { const v = new THREE.Vector2(); renderer.getDrawingBufferSize(v); ascii.setSize(v.x, v.y); }
  }
  addEventListener('resize', resize);
  resize();

  /* ---------- цикл ---------- */
  /* отъезд: сначала глаз вплотную, потом лаборатория */
  const CLOSE = { p: new THREE.Vector3(0, 0, 4.6), l: new THREE.Vector3(0, 0, 0) };
  const FAR = { p: new THREE.Vector3(0.6, 0.9, 16.5), l: new THREE.Vector3(-0.4, -0.7, 0) };
  const tMount = performance.now();
  let revealAt = 0, fly = 0, twist = 0, introDone = false, capAt = 0, gateAt = 0, restartable = false, restarted = false;
  /* время внутри фазы копится из dt (не больше 0,05 с за кадр): если браузер подвиснет,
     анимация входа встанет на паузу, а не перескочит вперёд */
  let phase = 'term', phT = performance.now(), phAcc = 0, beamK = 0;
  const goPhase = (p, now, t0) => { phase = p; phT = now; phAcc = t0 || 0; };
  const sm = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  const camP = new THREE.Vector3(), camL = new THREE.Vector3(), toEye = new THREE.Vector3();
  let lastT = performance.now(), pull = 0, camX = 0, camY = 0;
  /* осмотр: курсор у края экрана поворачивает голову, колесо наклоняет вперёд и назад */
  let hlY = 0, hlP = 0, lean = 0, leanT = 0;
  let hoverIt = -1;
  root.addEventListener('click', () => {
    if (panelOpen) { closePanel(); return; }
    if (hoverIt >= 0 && items && mem.open.indexOf(items.list[hoverIt].id) >= 0) openPanel(items.list[hoverIt]);
  });
  root.addEventListener('wheel', (e) => { leanT = Math.max(-6, Math.min(3, leanT - Math.sign(e.deltaY) * 0.8)); e.preventDefault(); }, { passive: false });
  const dz = (n) => { const a = Math.max(0, Math.abs(n) - 0.35) / 0.65; return Math.sign(n) * a * a * (3 - 2 * a); };
  const lookDir = new THREE.Vector3(), rightAx = new THREE.Vector3(), UPV = new THREE.Vector3(0, 1, 0);
  /* перезапуск после поимки: под чёрной шторкой камера возвращается к глазу, сцена начинается
     с большого глаза из символов (фаза grow ближе к концу), дальше раскрытие, отъезд, взгляд по кругу и сразу игра */
  function restart(now) {
    capAt = 0; restarted = true; introDone = false;
    speech.style.opacity = '0'; speech.dataset.c = ''; speech.dataset.k = '';
    hud.style.opacity = '0';
    if (quest) quest.reset();
    goPhase('grow', now, 3);
    setTimeout(() => { veil.style.opacity = '0'; }, 250);
  }
  function startPlay(now, keepSpeech) {
    if (keepSpeech) speech.dataset.k = '1'; else speech.style.opacity = '0';
    goPhase('play', now); prChecked = now;
    if (quest) quest.start();
    hud.style.opacity = '0.7';
  }
  function tick() {
    const now = performance.now(), dt = Math.min(0.05, (now - lastT) / 1000); lastT = now;
    phAcc += dt;
    if (!document.hidden) {
      mem.acc += dt;
      if (mem.acc >= 300) { mem.acc -= 300; mem.lg += STEP_TIME; showCount(); memSave(mem); }
    }
    const idle = (now - ptr.last) / 1000;
    ptr.speed *= Math.exp(-dt * 7);
    ptr.stillT = ptr.speed > 0.05 ? 0 : ptr.stillT + dt;

    /* после отъезда камеры глаз перестаёт видеть курсор и начинает искать (js/quest.js) */
    const qo = quest ? quest.update(dt, { nx: ptr.nx, ny: ptr.ny, has: ptr.has, out: ptr.out, speed: ptr.speed, stillT: ptr.stillT,
      gaze: { yaw: gaze.state.yaw, pitch: gaze.state.pitch }, eyeD: phase === 'play' ? eyeDist() : 99, paused: panelOpen }) : null;
    hoverIt = qo ? qo.item : -1;
    const qa = !!(quest && quest.state.active);
    /* до игры глаз смотрит прямо на зрителя; в фазе roll обводит взглядом по кругу */
    const camYP = { yaw: Math.atan2(cam.position.x, cam.position.z), pitch: Math.atan2(cam.position.y, Math.hypot(cam.position.x, cam.position.z)) };
    let pre = camYP;
    if (phase === 'roll' || gateAt) {
      const pr2 = gateAt ? (performance.now() - gateAt) / 1000 : phAcc, th = Math.min(1, pr2 / 3.0) * Math.PI * 2 * 1.25, amp = 1 - sm(2.4, 3.0, pr2);
      pre = { yaw: camYP.yaw + Math.sin(th) * 0.5 * amp, pitch: camYP.pitch + Math.cos(th) * 0.32 * amp };
    }
    const st = qa && (capAt || gateAt)
      ? gaze.update(dt, pre, { idle: 0, near: true })
      : qa
      ? gaze.update(dt, qo.target, { idle: 0, near: qo.mode === 'lock' && cursorNearIris() })
      : quest || phase !== 'play'
        ? gaze.update(dt, pre, { idle: 0, near: phase === 'speech' })
        : gaze.update(dt, ptr.has ? cursorTarget() : null,
          { idle, out: ptr.out, edgeX: ptr.nx / 2, edgeY: ptr.ny / 2, near: ptr.has && !ptr.out && idle < 3 && cursorNearIris() });
    if (eye) eye.set(st);
    if (!coarse) {
      cur.style.opacity = !ptr.has || ptr.out || capAt || gateAt ? '0' : (!qa && st.mode === 'search') ? '0.25' : '0.9';
      const hl = qa && qo.cursor === 'look' && hoverIt >= 0 && !panelOpen ? (items.list[hoverIt].label[lang] || items.list[hoverIt].label.en) : '';
      cursorState(qa ? qo.cursor : 'idle', qa ? (qo.cursor === 'gate' ? qo.gateP : qo.hold) : 0, qa && qo.inBeam, hl);
    }
    const ten = qa ? qo.tension : 0;
    if (ascii && qa && qo.flash > 0) ascii.uEdge.value = 1;
    uTen.value += (ten - uTen.value) * Math.min(1, dt * 3);
    if (sound) { sound.tension(uTen.value); sound.modem(qa && qo.modem ? 1 : 0); }
    if (qa) qo.events.forEach((ev) => {
      if (ev.type === 'open') say(L.open + (items.list[ev.i].label[lang] || items.list[ev.i].label.en));
      else if (ev.type === 'capture' && !capAt) {
        capAt = now;
        restartable = mem.tries > 1;
        mem.tries = Math.max(0, mem.tries - 1); mem.caught = (mem.caught || 0) + 1;
        mem.lg += STEP_SEEN; showCount(); showTries(); memSave(mem);
        closePanel();
      }
      else if (ev.type === 'gate' && !gateAt) { gateAt = now; closePanel(); }
    });

    /* ---------- фазы входа ----------
       term: терминал на чёрном, под ним грузится и компилируется всё; canvas скрыт
       tube: двоичные цифры закручиваются в трубу, летим
       grow: труба гаснет, из её конца вырастает глаз из символов и смотрит прямо на зрителя (не меньше 2,5 с)
       reveal: символы осыпаются, под ними настоящий глаз
       pull: камера отъезжает, лаборатория открывается
       roll: глаз обводит взглядом по кругу и застывает в центре
       speech: обращение к зрителю, фразы по одной
       play: игра (js/quest.js) */
    /* отладка: window.__viviPT держит время внутри фазы, __viviPhase задаёт фазу */
    if (window.__viviPhase && window.__viviPhase !== phase) goPhase(window.__viviPhase, now);
    if (window.__viviPT !== undefined) phAcc = window.__viviPT;
    const pt = phAcc;
    if (phase === 'term') {
      if (labReady && warmDone && now - tTerm >= term.total + 500) {
        term.hide(); shade.style.opacity = '0'; goPhase('tube', now);
      }
    } else if (phase === 'tube' && pt >= (reduce ? 0.2 : 3.4)) goPhase('grow', now);
    else if (phase === 'grow' && pt >= (reduce ? 0.3 : 5.2)) { revealAt = now; goPhase('reveal', now); }
    else if (phase === 'reveal' && pt >= (reduce ? 0.4 : 3.6)) goPhase('pull', now);
    else if (phase === 'pull' && pt >= (reduce ? 0.2 : restarted ? 4.6 : 7.6)) goPhase('roll', now);
    else if (phase === 'roll' && pt >= (reduce ? 0.1 : restarted ? 2.6 : 3.4)) { if (restarted) startPlay(now); else goPhase('speech', now); }
    /* обращение: «ТЫ не ОНА» красным, потом слово ПОИСК повторяется трижды, и на третьем глаз начинает искать */
    if (phase === 'speech') {
      const W = L.speech;
      let txt = '', col = '#dfe6f3', op = 0;
      if (pt >= 0.5 && pt < 3.0) { txt = W[0]; col = '#d4434e'; op = pt < 2.5 ? 1 : 0; }
      else if (pt >= 3.3) {
        const k = Math.min(3, 1 + Math.floor((pt - 3.3) / 0.75));
        txt = Array(k).fill(W[1]).join(' '); op = pt < 6.6 ? 1 : 0;
        if (k >= 3 && !(quest && quest.state.active)) startPlay(now, true);
      }
      if (txt && speech.textContent !== txt) speech.textContent = txt;
      speech.style.color = col; speech.style.opacity = String(op);
    }
    if (phase === 'play' && speech.dataset.k === '1' && phAcc > 3.2) { speech.style.opacity = '0'; speech.dataset.k = ''; }
    if (intro && !introDone) {
      const tw = phase === 'tube' ? sm(0.4, 2.0, pt) : 1;
      fly += dt * (phase === 'grow' ? 3.2 * (1 - sm(0, 1.6, pt)) + 0.2 : 3.4);
      twist += dt * 1.6 * tw;
      const g = phase === 'grow' ? pt : phase === 'tube' || phase === 'term' ? -1 : 99;
      const dis = phase === 'reveal' ? (reduce ? pt / 0.4 : Math.pow(sm(0, 3.2, pt), 1.35) * 1.02) : phase === 'pull' || phase === 'roll' || phase === 'speech' || phase === 'play' ? 2 : 0;
      intro.set({
        fade: phase === 'term' ? 0 : phase === 'tube' ? sm(0, 0.9, pt) : 1,
        fly, twist: twist,
        tube: phase === 'term' || phase === 'tube' ? 1 : 1 - sm(0, 1.2, g),
        morph: sm(0.2, 1.0, g), scale: 0.06 + 0.94 * sm(0.3, 2.4, g),
        open: sm(1.6, 2.6, g) * (1 - st.blink), look: { x: 0, y: 0 }, pupil: st.pupil,
        dissolve: Math.min(1.01, dis), alive: dis >= 1.01 ? 0 : 1
      });
      if (dis >= 1.01) introDone = true;
    }

    /* поимка: клетки заполняются глазом из символов, зрачок растёт и съедает всё, потом обычная главная.
       Позже здесь будет падение через вихрь с отголосками личностей */
    if (capAt && intro) {
      const cp = (now - capAt) / 1000;
      intro.set({ alive: 1, dissolve: Math.max(0, 1 - cp / 1.1), morph: 1, open: 1, fade: 1, tube: 0, scale: 1, tint: 0,
        look: { x: 0, y: 0 }, pupil: Math.min(1.4, 0.3 + Math.max(0, cp - 2.2) * 0.55) });
      if (sound) sound.fade(restartable ? Math.min(cp - 1, 2) : cp - 1);
      /* поверх глаза: обнаружен, сколько наблюдений осталось */
      if (cp > 0.5 && speech.dataset.c !== '1') {
        speech.dataset.c = '1'; speech.style.color = '#d4434e'; speech.textContent = L.caught; speech.style.opacity = '1';
      }
      if (cp > 2.0 && speech.dataset.c === '1') {
        speech.dataset.c = '2'; speech.style.color = '#dfe6f3';
        speech.textContent = restartable ? L.tries + mem.tries : L.none;
      }
      if (cp > 4.4) veil.style.opacity = '1';
      if (cp > 5.2 && !ejected) {
        if (restartable) restart(now);
        else { ejected = true; eject(); }
      }
    }
    /* переход через зрачок: тот же захват символами, но холодного цвета, и дальше, а не назад */
    if (gateAt && intro) {
      const gp = (now - gateAt) / 1000;
      intro.set({ alive: 1, dissolve: Math.max(0, 1 - Math.max(0, gp - 1.0) / 1.2), morph: 1, open: 1, fade: 1, tube: 0, scale: 1,
        tint: sm(0.8, 2.0, gp), look: { x: 0, y: 0 }, pupil: Math.min(1.5, 0.3 + Math.max(0, gp - 2.4) * 0.6) });
      if (ascii) ascii.uEdge.value = 0.6 + 0.4 * sm(0, 1, gp);
      if (sound) sound.fade(gp - 1.6);
      if (gp > 4.2) { veil.style.background = '#03181b'; veil.style.opacity = '1'; }
      if (gp > 5.2 && !ejected) { ejected = true; location.replace(new URL('graph/', BASE).href); }
    }

    /* отъезд камеры (после раскрытия), параллакс за курсором, медленное притяжение к глазу */
    const el = revealAt ? (now - revealAt) / 1000 : 0;
    /* отъезд в фазе pull; дальше камера остаётся в дальней точке */
    const dk = phase === 'pull' ? Math.min(1, Math.max(0, (phAcc - 0.4) / (restarted ? 4 : 7))) : (phase === 'roll' || phase === 'speech' || phase === 'play') ? 1 : 0;
    const de = reduce && dk > 0 ? 1 : dk * dk * (3 - 2 * dk);
    camP.lerpVectors(CLOSE.p, FAR.p, de); camL.lerpVectors(CLOSE.l, FAR.l, de);
    const k = 1 - Math.exp(-dt * 0.6);
    /* до игры без подъезда к глазу: настоящий глаз при раскрытии совпадает с глазом из символов */
    pull += ((qa ? uTen.value * 1.3 : phase === 'play' ? st.focus : 0) - pull) * k * 0.5;
    if (!reduce) { camX += (-ptr.nx * (0.12 + 0.3 * de) - camX) * k; camY += (-ptr.ny * (0.08 + 0.15 * de) - camY) * k; }
    toEye.copy(camL).sub(camP).normalize();
    lean += (leanT * (phase === 'play' ? 1 : 0) - lean) * Math.min(1, dt * 2.5);
    cam.position.copy(camP).addScaledVector(toEye, pull * (0.35 + 1.6 * de) + lean);
    cam.position.x += camX; cam.position.y += camY;
    const hk = phase === 'play' ? 1 : 0;
    if (!reduce && ptr.has && !ptr.out) { hlY += (-dz(ptr.nx) * 0.62 * hk - hlY) * k * 1.6; hlP += (dz(ptr.ny) * 0.22 * hk - hlP) * k * 1.6; }
    lookDir.copy(camL).sub(cam.position).normalize().applyAxisAngle(UPV, hlY);
    rightAx.crossVectors(lookDir, UPV).normalize();
    lookDir.applyAxisAngle(rightAx, hlP);
    cam.lookAt(camL.copy(cam.position).add(lookDir));
    cam.updateMatrixWorld();

    if (eye) {
      eye.eyeball.getWorldQuaternion(gQ);
      gDir.set(0, 0, 1).applyQuaternion(gQ);
      gPos.set(0, 0, 1.16); eye.eyeball.localToWorld(gPos);
      beam.position.copy(gPos); beam.target.position.copy(gPos).addScaledVector(gDir, 10);
      beam.intensity = 260 * (0.4 + 0.6 * Math.max(st.focus, uTen.value)) * (1 - st.blink);
      if (ascii) {
        ascii.setCamera(cam); ascii.setGaze(gPos, gDir);
        /* символы в луче только в игре: при раскрытии и отъезде глаз смотрит прямо в камеру, и луч закрывал бы его знаками */
        beamK += ((phase === 'play' ? 1 : 0) - beamK) * Math.min(1, dt * 1.2);
        ascii.uBeam.value = (1 - st.blink) * beamK;
        if (!(qa && qo.flash > 0) && !gateAt) ascii.uEdge.value = 0.25 + 0.35 * de + uTen.value * 0.5;
      }
    }
    if (lab) lab.update(dt, el);

    /* прогрев: пока терминал закрывает экран, несколько кадров всей лаборатории из дальней точки */
    if (phase === 'term' && warm > 0) {
      /* по очереди из ближней и дальней точки: из каждой видны свои объекты и свои мип-уровни текстур */
      const W = warm % 2 ? CLOSE : FAR; cam.position.copy(W.p); cam.lookAt(W.l || camL.set(0, 0, 0)); cam.updateMatrixWorld();
      if (ascii) ascii.setCamera(cam);
      if (intro) intro.set({ fade: 1, tube: warm % 2, morph: 1 - warm % 2, scale: 1, open: 1, dissolve: warm === 2 ? 0.5 : 0, alive: 1 });   /* последний кадр прогрева: чистая труба, без глаза */
      warm--;
    }
    /* под терминалом рисуем только кадры прогрева, остальное время видеокарта занята загрузкой */
    if (phase !== 'term' || warm > 0 || warm === 0 && !warmDone) {
      if (pipe) pipe.render(); else renderer.render(scene, cam);
      if (phase === 'term' && warm === 0) warmDone = true;
    }

    /* разрешение под видеокарту: не успевает кадр, рендер мельче; запас есть, крупнее */
    frameMs += ((now - prevNow) - frameMs) * 0.05; prevNow = now;
    if (phase === 'play' && now - prChecked > 1200) {
      prChecked = now;
      if (frameMs > 26 && pr > Q.prMin) { pr = Math.max(Q.prMin, pr * 0.85); prCool = now; resize(); }
      else if (frameMs < 18.5 && pr < Q.prMax && now - prCool > 6000) { pr = Math.min(Q.prMax, pr * 1.08); prCool = now - 3000; resize(); }
    }
  }
  let frameMs = 16, prevNow = performance.now(), prChecked = 0, prCool = 0;
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


  window.__vivi = { backend: isGPU ? 'WebGPU' : 'WebGL2', gpu: gpu.name, Q, get pr() { return pr; }, get ms() { return frameMs; }, gaze, cam, scene, gDir, gPos, ptr, cursorState,
    get eye() { return eye; }, get lab() { return lab; }, get revealed() { return !!revealAt; }, get labReady() { return labReady; }, get phase() { return phase; }, get quest() { return quest; }, get items() { return items; }, get intro() { return intro; }, eyeDist };
}

/* ---------- видеокарта: имя и признак программного рендера ---------- */
async function gpuInfo(renderer, isGPU) {
  try {
    if (isGPU && navigator.gpu) {
      const a = await navigator.gpu.requestAdapter();
      const i = (a && a.info) || {};
      const name = [i.vendor, i.architecture, i.description, i.device].filter(Boolean).join(' ');
      return { name, soft: !!(i.isFallbackAdapter || (a && a.isFallbackAdapter)) || /swiftshader|llvmpipe|basic render/i.test(name) };
    }
    const gl = renderer.backend && renderer.backend.gl;
    if (gl) {
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const name = String(ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER));
      return { name, soft: /swiftshader|llvmpipe|software|basic render/i.test(name) };
    }
  } catch (e) {}
  return { name: '', soft: false };
}

/* ---------- звук: тот же трек, замедленный, глухой, в длинном отражении; под ним гул с биением.
   Возвращает пульт: tension(0..1) глушит трек, поднимает гул, добавляет сердцебиение;
   modem(0|1) звук расшифровки, пока держат курсор на предмете; fade(сек) затихание при поимке.
   Резких звуков нет: всё нарастает плавно ---------- */
function startSound(el) {
  const AC = window.AudioContext || window.webkitAudioContext;
  const ctl = { tension() {}, modem() {}, fade() {} };
  if (!AC) return ctl;

  function build(audioEl) {
    const ctx = new AC();
    /* трек уже играет на главной: подхватываем его без паузы на полной громкости,
       фильтр и отражение закрываются постепенно, за несколько секунд */
    const t0 = ctx.currentTime;
    const master = ctx.createGain(); master.gain.value = audioEl ? 0.9 : 0; master.connect(ctx.destination);
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 18000; lp.Q.value = 0.6;
    const dry = ctx.createGain(); dry.gain.value = 1;
    const wet = ctx.createGain(); wet.gain.value = 0;
    dry.gain.setTargetAtTime(0.55, t0 + 0.5, 2.0);
    wet.gain.setTargetAtTime(0.7, t0 + 0.5, 2.0);
    const lpBase = () => 760 + 17240 * Math.exp(-Math.max(0, ctx.currentTime - t0 - 0.4) / 1.6);
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

    /* расшифровка: звук модема при дозвоне. Идёт мимо фильтра музыки и громче неё,
       но включается и выключается плавно, без щелчков */
    const mg = ctx.createGain(); mg.gain.value = 0;
    const mlp = ctx.createBiquadFilter(); mlp.type = 'lowpass'; mlp.frequency.value = 3600; mlp.Q.value = 0.5;
    mg.connect(mlp); mlp.connect(ctx.destination);
    const mvs = ctx.createGain(); mvs.gain.value = 0.25; mlp.connect(mvs); mvs.connect(verb);
    const car = ctx.createOscillator(); car.type = 'triangle'; car.frequency.value = 1650;
    const cg = ctx.createGain(); cg.gain.value = 0; car.connect(cg); cg.connect(mg); car.start();
    const ans = ctx.createOscillator(); ans.type = 'sine'; ans.frequency.value = 2100;
    const ag = ctx.createGain(); ag.gain.value = 0; ans.connect(ag); ag.connect(mg); ans.start();
    const nb = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate), nd = nb.getChannelData(0);
    for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
    const ns = ctx.createBufferSource(); ns.buffer = nb; ns.loop = true;
    const nbp = ctx.createBiquadFilter(); nbp.type = 'bandpass'; nbp.frequency.value = 1900; nbp.Q.value = 0.7;
    const ng = ctx.createGain(); ng.gain.value = 0; ns.connect(nbp); nbp.connect(ng); ng.connect(mg); ns.start();
    const FSK = [1070, 1270, 1650, 1850, 2025, 2225];
    let mOn = false, mStart = 0, hop = 0;

    if (!audioEl) {   /* свой трек после клика: тихий вход */
      master.gain.setValueAtTime(0.0001, t0);
      master.gain.exponentialRampToValueAtTime(0.9, t0 + 4);
    }
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});

    let nextBeat = 0, faded = false;
    ctl.tension = (x) => {
      const n = ctx.currentTime;
      lp.frequency.setTargetAtTime(Math.max(240, lpBase() - 520 * x), n, 0.3);
      hum.gain.setTargetAtTime(0.05 + 0.12 * x, n, 0.4);
      /* сердцебиение: два удара, чаще с напряжением */
      if (x > 0.4 && n >= nextBeat) {
        const per = 1.25 - 0.55 * x;
        [0, 0.24].forEach((d, i) => {
          const o = ctx.createOscillator(), g = ctx.createGain();
          o.type = 'sine'; o.frequency.value = 52;
          g.gain.setValueAtTime(0.0001, n + d);
          g.gain.exponentialRampToValueAtTime(0.32 * x * (i ? 0.7 : 1), n + d + 0.03);
          g.gain.exponentialRampToValueAtTime(0.0001, n + d + 0.26);
          o.connect(g); g.connect(master); o.start(n + d); o.stop(n + d + 0.3);
        });
        nextBeat = n + per;
      }
    };
    ctl.modem = (on) => {
      const n = ctx.currentTime;
      if (on && !mOn) { mOn = true; mStart = n; hop = n; mg.gain.cancelScheduledValues(n); mg.gain.setTargetAtTime(0.14, n, 0.06); }
      if (!on && mOn) { mOn = false; mg.gain.cancelScheduledValues(n); mg.gain.setTargetAtTime(0, n, 0.1); }
      if (!mOn) return;
      /* расписание на четверть секунды вперёд: тон ответа, потом медленные переливы, потом частый перебор частот с шумом */
      while (hop < n + 0.25) {
        const e = hop - mStart; let step;
        if (e < 0.7) { ag.gain.setTargetAtTime(0.5, hop, 0.01); cg.gain.setTargetAtTime(0, hop, 0.01); ng.gain.setTargetAtTime(0.04, hop, 0.02); step = 0.1; }
        else if (e < 1.6) {
          ag.gain.setTargetAtTime(0, hop, 0.01); cg.gain.setTargetAtTime(0.45, hop, 0.005);
          car.frequency.setValueAtTime(((e / 0.12) | 0) % 2 ? 1180 : 980, hop); ng.gain.setTargetAtTime(0.1, hop, 0.02); step = 0.12;
        } else {
          car.frequency.setValueAtTime(FSK[(Math.random() * FSK.length) | 0], hop);
          cg.gain.setTargetAtTime(0.32 + Math.random() * 0.12, hop, 0.004);
          ng.gain.setTargetAtTime(Math.random() < 0.3 ? 0.3 : 0.07, hop, 0.006);
          step = 0.018 + Math.random() * 0.03;
        }
        hop += step;
      }
    };
    ctl.fade = (cp) => {
      if (faded) return;
      if (cp > 2.6) { faded = true; master.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.4); mg.gain.setTargetAtTime(0, ctx.currentTime, 0.1); }
      else lp.frequency.setTargetAtTime(220, ctx.currentTime, 0.5);
    };
  }

  if (el) { build(el); return ctl; }
  const once = () => {
    removeEventListener('pointerdown', once); removeEventListener('keydown', once);
    const tracks = ['audio/track1.mp3', 'audio/track2.mp3'];
    const a = new Audio(new URL('../' + tracks[Math.random() * tracks.length | 0], BASE).href);
    a.loop = true;
    build(a);
    a.play().catch(() => {});
  };
  addEventListener('pointerdown', once); addEventListener('keydown', once);
  return ctl;
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
