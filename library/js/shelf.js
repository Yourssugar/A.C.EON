/* Страница шкафа: камера, свет, наведение, карточка книги. */

import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/RoomEnvironment.js';
import { BOOKS, STATE_TEXT, CATALOG } from '../data/books.js';
import { buildLibrary } from './shelf-build.js';
import { PROFILES, ORDER, savedQuality, saveQuality, guessQuality } from './quality.js';

const $ = (id) => document.getElementById(id);
const ui = {
  canvas: $('scene'),
  loader: $('loader'),
  intro: $('intro'),
  statusTitle: $('status-title'),
  statusNote: $('status-note'),
  card: $('card'),
  cardKicker: $('card-kicker'),
  cardTitle: $('card-title'),
  cardAbout: $('card-about'),
  cardState: $('card-state'),
  cardRead: $('card-read'),
  cardClose: $('card-close'),
  quality: $('quality'),
  list: $('book-list')
};

const SPINE_Z = 0.47;
const INTRO_SECONDS = 3.8;
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const coarse = matchMedia('(pointer: coarse)').matches;
const params = new URLSearchParams(location.search);

const ease = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const clamp01 = (x) => Math.min(1, Math.max(0, x));
const damp = (current, target, rate, dt) => current + (target - current) * (1 - Math.exp(-rate * dt));

function plural(n, one, few, many) {
  const m10 = n % 10, m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
  return many;
}

function webglAvailable() {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch (e) {
    return false;
  }
}

/* Названия на корешках рисуются на canvas, шрифт должен успеть загрузиться. */
async function waitFonts() {
  if (!document.fonts) return;
  const timeout = new Promise((resolve) => setTimeout(resolve, 2500));
  const loads = Promise.all([
    document.fonts.load('600 40px "Cormorant Garamond"', 'МЕХАНИК БОГА'),
    document.fonts.load('500 40px "Cormorant Garamond"', 'ПОВЕСТЬ')
  ]).catch(() => null);
  await Promise.race([loads, timeout]);
}

function bookKicker(book) {
  const parts = [book.form];
  if (book.chapters) parts.push(`${book.chapters} ${plural(book.chapters, 'глава', 'главы', 'глав')}`);
  return parts.join(' / ');
}

function bookPage(book) {
  return `book.html?id=${encodeURIComponent(book.id)}`;
}

/* Список для клавиатуры и экранных чтецов. Без WebGL он же становится видимой страницей. */
function renderList(onFocus, onActivate) {
  ui.list.innerHTML = '';
  const entries = [...BOOKS.map((b) => ({ id: b.id, title: b.title, kicker: bookKicker(b), about: b.about })), { id: 'catalog', title: CATALOG.title, kicker: CATALOG.kicker, about: CATALOG.about }];
  for (const entry of entries) {
    const li = document.createElement('li');
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.dataset.id = entry.id;
    btn.innerHTML = `<span class="list-kicker">${entry.kicker}</span><span class="list-title">${entry.title}</span><span class="list-about">${entry.about.join(' ')}</span>`;
    btn.addEventListener('focus', () => onFocus && onFocus(entry.id));
    btn.addEventListener('click', () => onActivate && onActivate(entry.id));
    li.appendChild(btn);
    ui.list.appendChild(li);
  }
}

class Shelf {
  constructor() {
    this.qualityName = savedQuality() || guessQuality();
    this.userPicked = !!savedQuality();
    this.profile = PROFILES[this.qualityName];

    this.renderer = new THREE.WebGLRenderer({ canvas: ui.canvas, antialias: true, powerPreference: 'high-performance' });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.22;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#060403');
    this.scene.fog = new THREE.Fog('#060403', 16, 34);
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    this.scene.environmentIntensity = 0.16;
    pmrem.dispose();

    this.camera = new THREE.PerspectiveCamera(36, 1, 0.1, 60);
    this.buildLights();

    const built = buildLibrary(this.scene, this.profile, BOOKS);
    this.items = built.interactive;
    this.updaters = built.updaters;
    this.lamp = built.lamp;
    this.dust = built.dust;

    this.hitList = [];
    this.hitMap = new Map();
    for (const item of this.items) {
      for (const target of item.hitTargets) {
        this.hitList.push(target);
        target.traverse((o) => this.hitMap.set(o, item));
      }
    }
    for (const item of this.items) {
      if (item.kind === 'catalog') item.drawerBaseZ = item.drawers[0].position.z;
    }
    this.focusables = this.items
      .filter((i) => i.kind === 'book' || i.kind === 'catalog')
      .sort((a, b) => b.group.position.y - a.group.position.y || a.group.position.x - b.group.position.x);

    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2(0, 0);
    this.pointerNdc = new THREE.Vector2(9, 9);
    this.parallax = new THREE.Vector2();
    this.view = { dist: 10, centerY: 3.8, portrait: false, panX: 0, panMax: 0 };
    this.hovered = null;
    this.keyboardIndex = -1;

    this.selected = null;
    this.presentS = 0;
    this.presentDir = 0;
    this.catalogOpen = false;
    this.presentYaw = 0.45;
    this.presentTilt = 0;

    this.introT = reducedMotion ? 1 : 0;
    this.time = 0;
    this.fpsSamples = [];

    this.tmp = {
      camPos: new THREE.Vector3(), look: new THREE.Vector3(), fwd: new THREE.Vector3(), right: new THREE.Vector3(), up: new THREE.Vector3(),
      present: new THREE.Vector3(), presentQuat: new THREE.Quaternion(), m: new THREE.Matrix4(), q: new THREE.Quaternion(),
      p0: new THREE.Vector3(), x: new THREE.Vector3(), y: new THREE.Vector3(), z: new THREE.Vector3()
    };

    this.applyQuality();
    this.resize();
    this.bind();
    renderList((id) => this.focusById(id), (id) => this.activateById(id));

    const wanted = params.get('book');
    if (wanted) {
      this.introT = 1;
      const item = this.items.find((i) => i.kind === 'book' && i.data.id === wanted);
      if (item) setTimeout(() => this.presentBook(item), 150);
    }
    if (this.introT >= 1) document.body.classList.add('intro-done');

    this.clock = new THREE.Clock();
    this.renderer.setAnimationLoop(() => this.frame());
  }

  buildLights() {
    this.hemi = new THREE.HemisphereLight('#7a5236', '#0a0604', 0.7);
    this.scene.add(this.hemi);
    this.key = new THREE.SpotLight('#ffcf98', 0, 0, 0.6, 0.8, 2);
    this.key.position.set(-3.4, 10.5, 8.8);
    this.key.target.position.set(0.4, 3.3, 0);
    this.key.shadow.bias = -0.0003;
    this.key.shadow.normalBias = 0.02;
    this.key.shadow.camera.near = 6;
    this.key.shadow.camera.far = 24;
    this.scene.add(this.key, this.key.target);
    this.keyMax = 520;

    this.presentLight = new THREE.SpotLight('#ffe6c4', 0, 0, 0.45, 0.9, 2);
    this.scene.add(this.presentLight, this.presentLight.target);
  }

  applyQuality() {
    const p = this.profile;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, p.pixelRatio));
    const shadowsChanged = this.renderer.shadowMap.enabled !== p.shadows;
    this.renderer.shadowMap.enabled = p.shadows;
    this.key.castShadow = p.shadows;
    if (this.key.shadow.mapSize.x !== p.shadowSize) {
      this.key.shadow.mapSize.set(p.shadowSize, p.shadowSize);
      if (this.key.shadow.map) {
        this.key.shadow.map.dispose();
        this.key.shadow.map = null;
      }
    }
    if (shadowsChanged) {
      this.scene.traverse((o) => {
        if (!o.material) return;
        for (const m of Array.isArray(o.material) ? o.material : [o.material]) m.needsUpdate = true;
      });
    }
    this.dust.points.visible = p.dust > 0;
    this.dust.points.geometry.setDrawRange(0, p.dust);
    ui.quality.textContent = `Графика: ${p.label}`;
    this.resize();
  }

  setQuality(name, byUser) {
    if (!PROFILES[name]) return;
    this.qualityName = name;
    this.profile = PROFILES[name];
    if (byUser) {
      this.userPicked = true;
      saveQuality(name);
    }
    this.applyQuality();
  }

  resize() {
    const w = window.innerWidth, h = window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    const t = Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2));
    const aspect = w / h;
    const v = this.view;
    v.portrait = aspect < 0.85;
    let visH = 7.2;
    if (v.portrait) {
      const visW = 4.9;
      visH = visW / aspect;
      v.panMax = Math.max(0, (9.3 - visW) / 2);
    } else {
      const needW = 11;
      if (visH * aspect < needW) visH = needW / aspect;
      v.panMax = 0;
    }
    v.panX = Math.max(-v.panMax, Math.min(v.panMax, v.panX));
    v.dist = visH / 2 / t;
    v.centerY = v.portrait ? 3.75 : 3.8;
  }

  bind() {
    window.addEventListener('resize', () => this.resize());
    const c = ui.canvas;
    let down = null;
    c.addEventListener('pointermove', (e) => {
      this.setPointer(e);
      if (down && e.pointerType !== 'mouse' && this.view.panMax > 0 && !this.selected) {
        const dx = e.clientX - down.x;
        if (Math.abs(dx) > 6) down.moved = true;
        this.view.panX = Math.max(-this.view.panMax, Math.min(this.view.panMax, down.pan - dx * (9.3 / window.innerWidth) * 0.9));
      }
      if (!down || e.pointerType === 'mouse') this.keyboardIndex = -1;
    });
    c.addEventListener('pointerdown', (e) => {
      this.setPointer(e);
      down = { x: e.clientX, y: e.clientY, pan: this.view.panX, moved: false };
      // клик, которым пропустили интро, не должен сразу открыть книгу под курсором
      if (this.introT < 1) {
        this.skipIntro();
        down.moved = true;
      }
    });
    c.addEventListener('pointerup', (e) => {
      const wasDrag = down && (down.moved || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 10);
      down = null;
      if (wasDrag) return;
      this.setPointer(e);
      this.updateHover(true);
      this.click();
    });
    c.addEventListener('pointerleave', () => {
      this.pointerNdc.set(9, 9);
      down = null;
    });
    window.addEventListener('keydown', (e) => this.key_(e));
    ui.cardClose.addEventListener('click', () => this.closeCard());
    ui.cardRead.addEventListener('click', (e) => {
      if (ui.cardRead.getAttribute('aria-disabled') === 'true') {
        e.preventDefault();
        return;
      }
      e.preventDefault();
      const href = ui.cardRead.getAttribute('href');
      document.body.classList.add('leaving');
      setTimeout(() => { location.href = href; }, reducedMotion ? 0 : 650);
    });
    ui.quality.addEventListener('click', () => {
      const next = ORDER[(ORDER.indexOf(this.qualityName) + 1) % ORDER.length];
      this.setQuality(next, true);
    });
    window.libraryGraphics = {
      setQuality: (q) => this.setQuality(q, true),
      getQuality: () => this.qualityName
    };
  }

  setPointer(e) {
    this.pointerNdc.set((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1);
    if (e.pointerType === 'mouse') this.pointer.copy(this.pointerNdc);
  }

  key_(e) {
    if (this.introT < 1 && !['Tab', 'Shift'].includes(e.key)) this.skipIntro();
    if (e.key === 'Escape') {
      if (this.selected || this.catalogOpen) this.closeCard();
      return;
    }
    if (this.selected || this.catalogOpen) return;
    if (document.activeElement && ui.list.contains(document.activeElement)) return;
    const n = this.focusables.length;
    if (['ArrowRight', 'ArrowDown'].includes(e.key)) {
      this.keyboardIndex = (this.keyboardIndex + 1 + n) % n;
      e.preventDefault();
    } else if (['ArrowLeft', 'ArrowUp'].includes(e.key)) {
      this.keyboardIndex = this.keyboardIndex < 0 ? n - 1 : (this.keyboardIndex - 1 + n) % n;
      e.preventDefault();
    } else if ((e.key === 'Enter' || e.key === ' ') && this.keyboardIndex >= 0) {
      e.preventDefault();
      this.activate(this.focusables[this.keyboardIndex]);
      return;
    } else {
      return;
    }
    this.setHovered(this.focusables[this.keyboardIndex]);
  }

  focusById(id) {
    const idx = this.focusables.findIndex((i) => (i.kind === 'catalog' ? 'catalog' : i.data.id) === id);
    if (idx >= 0) {
      this.keyboardIndex = idx;
      this.setHovered(this.focusables[idx]);
    }
  }

  activateById(id) {
    const item = this.focusables.find((i) => (i.kind === 'catalog' ? 'catalog' : i.data.id) === id);
    if (item) this.activate(item);
  }

  skipIntro() {
    this.introT = 1;
  }

  updateHover(force = false) {
    if (this.selected || this.catalogOpen || this.introT < 0.85) {
      if (this.hovered && !this.selected) this.setHovered(null);
      return;
    }
    if (this.keyboardIndex >= 0 && !force) return;
    if (Math.abs(this.pointerNdc.x) > 1.5) {
      this.setHovered(null);
      return;
    }
    this.raycaster.setFromCamera(this.pointerNdc, this.camera);
    const hit = this.raycaster.intersectObjects(this.hitList, true)[0];
    this.setHovered(hit ? this.hitMap.get(hit.object) || null : null);
  }

  setHovered(item) {
    if (this.hovered === item) return;
    if (this.hovered) this.hovered.pullTarget = 0;
    this.hovered = item;
    ui.canvas.style.cursor = item ? 'pointer' : 'default';
    if (!item) {
      ui.statusTitle.textContent = 'Наведите на корешок';
      ui.statusNote.textContent = this.view.panMax > 0
        ? 'Шкаф листается пальцем, книги с золотым названием открываются'
        : coarse ? 'Нажмите на книгу с золотым названием' : 'Книги с золотым названием можно открыть';
      return;
    }
    if (item.kind === 'book') {
      item.pullTarget = 0.17;
      ui.statusTitle.textContent = item.data.title;
      ui.statusNote.textContent = bookKicker(item.data);
    } else if (item.kind === 'catalog') {
      item.pullTarget = 1;
      ui.statusTitle.textContent = CATALOG.title;
      ui.statusNote.textContent = CATALOG.kicker;
    } else {
      item.pullTarget = 0.06;
      ui.statusTitle.textContent = 'Пустой корешок';
      ui.statusNote.textContent = 'Эта книга ещё не написана';
    }
  }

  click() {
    if (this.introT < 1) return;
    if (this.selected || this.catalogOpen) {
      this.closeCard();
      return;
    }
    if (this.hovered) this.activate(this.hovered);
  }

  activate(item) {
    if (!item) return;
    if (item.kind === 'book') this.presentBook(item);
    else if (item.kind === 'catalog') this.openCatalog(item);
    else item.wiggle = 1;
  }

  fillCard({ kicker, title, about, state, href, readable, showRead, closeLabel }) {
    ui.cardKicker.textContent = kicker;
    ui.cardTitle.textContent = title;
    ui.cardAbout.innerHTML = '';
    for (const p of about) {
      const el = document.createElement('p');
      el.textContent = p;
      ui.cardAbout.appendChild(el);
    }
    ui.cardState.textContent = state || '';
    ui.cardState.hidden = !state;
    ui.cardRead.hidden = !showRead;
    ui.cardRead.setAttribute('href', href || '#');
    ui.cardRead.setAttribute('aria-disabled', readable ? 'false' : 'true');
    ui.cardRead.textContent = readable ? 'Читать' : 'Скоро';
    ui.cardClose.textContent = closeLabel || 'Вернуть на полку';
  }

  showCard() {
    ui.card.classList.add('open');
    ui.card.setAttribute('aria-hidden', 'false');
    document.body.classList.add('card-open');
    setTimeout(() => ui.cardClose.focus({ preventScroll: true }), 50);
  }

  presentBook(item) {
    this.setHovered(null);
    this.selected = item;
    this.presentDir = 1;
    const b = item.data;
    this.fillCard({
      kicker: bookKicker(b),
      title: b.title,
      about: b.about,
      state: STATE_TEXT[b.state],
      href: bookPage(b),
      readable: b.state === 'open',
      showRead: true
    });
    setTimeout(() => { if (this.selected === item && this.presentDir > 0) this.showCard(); }, reducedMotion ? 0 : 650);
  }

  openCatalog(item) {
    this.setHovered(null);
    this.catalogOpen = item;
    this.fillCard({ kicker: CATALOG.kicker, title: CATALOG.title, about: CATALOG.about, state: '', showRead: false, closeLabel: 'Задвинуть ящик' });
    this.showCard();
  }

  closeCard() {
    ui.card.classList.remove('open');
    ui.card.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('card-open');
    if (this.selected) this.presentDir = -1;
    this.catalogOpen = false;
  }

  /* Точка, куда выезжает книга: левее центра на широком экране, сверху на телефоне. */
  computePresent(camPos, look) {
    const T = this.tmp;
    T.fwd.subVectors(look, camPos).normalize();
    T.right.crossVectors(T.fwd, THREE.Object3D.DEFAULT_UP).normalize();
    T.up.crossVectors(T.right, T.fwd).normalize();
    const portrait = this.view.portrait;
    const d = portrait ? 6.6 : 4.1;
    const halfH = d * Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2));
    const halfW = halfH * this.camera.aspect;
    const nx = portrait ? 0 : -0.36;
    const ny = portrait ? 0.5 : -0.02;
    T.present.copy(camPos).addScaledVector(T.fwd, d).addScaledVector(T.right, nx * halfW).addScaledVector(T.up, ny * halfH);

    // обложка (локальная +x) смотрит в камеру, корешок уходит влево, потом поворот на три четверти
    T.x.subVectors(camPos, T.present).normalize();
    T.y.copy(T.up).addScaledVector(T.x, -T.x.dot(T.up)).normalize();
    T.z.crossVectors(T.x, T.y);
    T.m.makeBasis(T.x, T.y, T.z);
    T.presentQuat.setFromRotationMatrix(T.m);
    T.q.setFromAxisAngle(T.y, this.presentYaw);
    T.presentQuat.premultiply(T.q);
    T.q.setFromAxisAngle(T.right, this.presentTilt);
    T.presentQuat.premultiply(T.q);
  }

  frame() {
    const dt = Math.min(0.05, this.clock.getDelta());
    this.time += dt;
    const t = this.time;
    const v = this.view;

    if (this.introT < 1) {
      const before = this.introT;
      this.introT = Math.min(1, this.introT + dt / INTRO_SECONDS);
      if (before < 0.18 && this.introT >= 0.18) this.lamp.state.flicker = 0.45;
      if (this.introT >= 1) document.body.classList.add('intro-done');
    }
    if (this.introT > 0.6) document.body.classList.add('intro-fading');
    const intro = ease(this.introT);
    const power = clamp01(this.introT / 0.5);

    if (this.presentDir !== 0) {
      this.presentS = clamp01(this.presentS + this.presentDir * dt / (reducedMotion ? 0.01 : 1.15));
      if (this.presentS <= 0 && this.presentDir < 0) {
        this.presentDir = 0;
        this.selected = null;
      }
      if (this.presentS >= 1) this.presentDir = 0;
    }
    const s = this.presentS;

    const busy = this.selected || this.catalogOpen;
    const px = coarse ? 0 : this.pointer.x;
    const py = coarse ? 0 : this.pointer.y;
    this.parallax.x = damp(this.parallax.x, busy ? 0 : px, 2.5, dt);
    this.parallax.y = damp(this.parallax.y, busy ? 0 : py, 2.5, dt);

    const T = this.tmp;
    T.look.set(v.panX, v.centerY, 0);
    T.camPos.set(v.panX, v.centerY + 0.4, SPINE_Z + v.dist);
    this.computePresent(T.camPos, T.look);

    const off = 1 - intro;
    this.camera.position.set(
      T.camPos.x + this.parallax.x * 0.9 + off * 2.2,
      T.camPos.y + this.parallax.y * 0.3 - off * 0.9,
      T.camPos.z + off * 7.5
    );
    this.camera.lookAt(T.look.x + this.parallax.x * 0.45, T.look.y + this.parallax.y * 0.4 - off * 0.3, 0);

    this.presentYaw = damp(this.presentYaw, 0.45 + (s >= 1 ? px * 0.35 : 0), 3, dt);
    this.presentTilt = damp(this.presentTilt, s >= 1 ? -py * 0.15 : 0, 3, dt);

    this.key.intensity = this.keyMax * power * (1 - 0.65 * s);
    this.hemi.intensity = 0.7 * (0.35 + 0.65 * power) * (1 - 0.5 * s);
    this.presentLight.intensity = 90 * s;
    this.presentLight.position.copy(T.camPos).addScaledVector(T.up, 1.6).addScaledVector(T.right, -1.4);
    this.presentLight.target.position.copy(T.present);

    if (!this.selected && !this.catalogOpen) this.updateHover();

    for (const item of this.items) {
      item.pull = damp(item.pull, item.pullTarget, 9, dt);
      if (item.kind === 'catalog') {
        const open = this.catalogOpen === item ? 1 : 0;
        item.open = damp(item.open, open, 5, dt);
        item.drawers[0].position.z = item.drawerBaseZ + item.pull * 0.09 + item.open * 0.5;
        item.emissiveTargets[0].emissive.setRGB(0.12, 0.06, 0.02).multiplyScalar(item.pull * 0.5);
        continue;
      }
      if (item === this.selected) {
        this.posePresented(item, s);
      } else {
        item.wiggle = Math.max(0, item.wiggle - dt * 2.2);
        // книгу тянут за верх: она выезжает и чуть наклоняется к нам
        const k = item.kind === 'book' ? item.pull / 0.17 : item.pull / 0.06;
        item.group.position.copy(item.basePos);
        item.group.position.z += item.pull;
        item.group.position.x += Math.sin(t * 40) * 0.012 * item.wiggle;
        item.group.quaternion.copy(item.baseQuat);
        if (item.kind !== 'stack' && k > 0.001) {
          this.tmp.q.setFromAxisAngle(this.tmp.x.set(1, 0, 0), (item.kind === 'book' ? 0.1 : 0.05) * k);
          item.group.quaternion.multiply(this.tmp.q);
        }
      }
      const glow = item.kind === 'book' ? (item.pull / 0.17) * 0.07 : (item.pull / 0.06) * 0.015;
      item.spineMat.emissive.setRGB(1, 0.62, 0.3).multiplyScalar(glow);
    }

    for (const u of this.updaters) u(dt, t, power);
    this.renderer.render(this.scene, this.camera);
    this.watchFps(dt);
  }

  posePresented(item, s) {
    const T = this.tmp;
    const g = item.group;
    T.p0.copy(item.basePos);
    T.p0.z += item.spec.d * 1.08;
    if (s <= 0.3) {
      const u = ease(s / 0.3);
      g.position.lerpVectors(item.basePos, T.p0, u);
      g.quaternion.copy(item.baseQuat);
    } else {
      const u = ease((s - 0.3) / 0.7);
      g.position.lerpVectors(T.p0, T.present, u);
      g.position.addScaledVector(T.up, Math.sin(Math.PI * u) * 0.35);
      g.quaternion.slerpQuaternions(item.baseQuat, T.presentQuat, u);
      if (s >= 1) g.position.addScaledVector(T.up, Math.sin(this.time * 1.3) * 0.02);
    }
  }

  /* Если автоматический профиль тянет меньше ~32 кадров, спускаемся на ступень. */
  watchFps(dt) {
    if (this.userPicked || this.introT < 1) return;
    this.fpsSamples.push(dt);
    if (this.fpsSamples.length < 120) return;
    const avg = this.fpsSamples.reduce((a, b) => a + b, 0) / this.fpsSamples.length;
    this.fpsSamples = [];
    const idx = ORDER.indexOf(this.qualityName);
    if (avg > 1 / 32 && idx > 0) this.setQuality(ORDER[idx - 1], false);
    else this.userPicked = true;
  }
}

async function start() {
  if (!webglAvailable()) {
    document.body.classList.add('no-webgl');
    renderList(null, (id) => {
      const book = BOOKS.find((b) => b.id === id);
      if (book && book.state === 'open') location.href = bookPage(book);
    });
    return;
  }
  await waitFonts();
  await new Promise((r) => requestAnimationFrame(() => r()));
  try {
    window.shelf = new Shelf();
    document.body.classList.add('ready');
  } catch (err) {
    console.error(err);
    document.body.classList.add('no-webgl');
    renderList(null, null);
  }
}

start();
