/* Страница книги: стол, лампа, раскрытая книга, приёмник. book.html?id=<id книги>. */

import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/RoomEnvironment.js';
import { BOOKS } from '../../data/books.js';
import { PROFILES, ORDER, savedQuality, saveQuality, guessQuality } from '../quality.js';
import { savedSpread, saveSpread } from '../progress.js';
import { buildDust } from '../props.js';
import { parseChapters } from './pages.js';
import { createOpenBook } from './open-book.js';
import { buildDesk, BLOTTER_TOP } from './desk.js';
import { buildProps } from './props-machine.js';
import { createRadio } from './radio.js';
import { createReader } from './reader.js';
import { sfx } from './sfx.js';

const $ = (id) => document.getElementById(id);
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const coarse = matchMedia('(pointer: coarse)').matches;
const clamp01 = (v) => Math.min(1, Math.max(0, v));
const ease = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const damp = (a, b, rate, dt) => a + (b - a) * (1 - Math.exp(-rate * dt));

// таймлайн вступления в секундах
const T_LAMP = 0.9, T_CAMERA = 3.3, T_OPEN = 2.5, T_OPENED = 4.6;

function fail(message) {
  document.body.classList.add('failed');
  $('fail-text').textContent = message;
  $('loader').hidden = true;
}

function webglAvailable() {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch (e) {
    return false;
  }
}

async function waitFonts() {
  if (!document.fonts) return;
  const timeout = new Promise((r) => setTimeout(r, 3000));
  const loads = Promise.all([
    document.fonts.load('400 30px "PT Serif"', 'Сирена'),
    document.fonts.load('italic 400 30px "PT Serif"', 'Сирена'),
    document.fonts.load('700 30px "PT Serif"', 'ЦЕПЬ'),
    document.fonts.load('600 30px "Cormorant Garamond"', 'ГЛАВА'),
    document.fonts.load('500 30px "Cormorant Garamond"', 'Смена'),
    document.fonts.load('italic 500 30px "Cormorant Garamond"', 'Смена'),
    document.fonts.load('600 30px "PT Sans"', 'СЕКЦИЯ')
  ]).catch(() => null);
  await Promise.race([loads, timeout]);
}

function readSiteFlag(key) {
  try {
    return (JSON.parse(localStorage.getItem('aceon:site') || 'null') || {})[key];
  } catch (e) {
    return undefined;
  }
}

function writeSiteFlag(key, value) {
  try {
    const s = JSON.parse(localStorage.getItem('aceon:site') || 'null') || {};
    s[key] = value;
    if (!s.v) s.v = 1;
    localStorage.setItem('aceon:site', JSON.stringify(s));
  } catch (e) {
    /* не запомнили, не страшно */
  }
}

async function start() {
  const id = new URLSearchParams(location.search).get('id') || 'mehanik-boga';
  const entry = BOOKS.find((b) => b.id === id);
  $('back').href = `index.html?book=${encodeURIComponent(id)}`;
  if (!entry || !/^[a-z0-9-]+$/.test(id)) return fail('Такой книги на полке нет.');
  let mod;
  try {
    mod = await import(`../../books/${id}/book.js`);
  } catch (e) {
    return fail(`«${entry.title}» ещё не лежит на столе. Пока её можно только снять с полки и посмотреть.`);
  }
  document.title = `${mod.META.title} / Библиотека A.C.EON`;
  $('book-title').textContent = mod.META.title;
  const chapters = parseChapters(mod.CHAPTERS);
  const reader = createReader($('reader'), chapters);

  if (!webglAvailable()) {
    document.body.classList.add('no-webgl');
    $('loader').hidden = true;
    reader.open(0);
    return;
  }
  await waitFonts();
  await new Promise((r) => requestAnimationFrame(() => r()));
  try {
    window.desk = new DeskScene(mod, chapters, reader);
    document.body.classList.add('ready');
  } catch (err) {
    console.error(err);
    document.body.classList.add('no-webgl');
    $('loader').hidden = true;
    reader.open(0);
  }
}

class DeskScene {
  constructor(mod, chapters, reader) {
    this.mod = mod;
    this.chapters = chapters;
    this.reader = reader;
    this.qualityName = savedQuality() || guessQuality();
    this.profile = PROFILES[this.qualityName];
    const canvas = $('scene');
    this.canvas = canvas;

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.shadowMap.enabled = this.profile.shadows;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#050302');
    this.scene.fog = new THREE.Fog('#050302', 30, 60);
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    this.scene.environmentIntensity = 0.14;
    pmrem.dispose();

    // узкий угол обзора: меньше перспективного завала строк, текст на левой странице не кажется курсивом
    this.camera = new THREE.PerspectiveCamera(24, 1, 0.1, 120);
    this.desk = buildDesk(this.scene, this.profile, mod.DESK);
    this.updaters = buildProps(this.scene, mod.DESK.props, this.profile);
    this.dust = buildDust(260, [-4, 0.4, -3, 3, 6, 2.6], 0.05);
    this.scene.add(this.dust.points);
    this.updaters.push(this.dust.update);

    this.book = createOpenBook({
      renderer: this.renderer,
      camera: this.camera,
      canvas,
      chapters,
      book: mod.META,
      media: mod.MEDIA,
      profile: this.profile,
      onState: (s) => this.onState(s),
      onIllustration: (c) => this.showIllustration(c)
    });
    this.book.root.position.y = BLOTTER_TOP;
    this.scene.add(this.book.root);

    this.radio = createRadio($('radio'), mod.MEDIA, { folded: true });
    this.shift = 0;

    const saved = savedSpread(mod.META.id);
    if (saved > 0) this.book.goTo(saved);

    this.t = reducedMotion ? T_OPENED : 0;
    this.lampOn = false;
    this.opened = false;
    this.zoom = 1;
    this.zoomTarget = 1;
    this.pointer = new THREE.Vector2();
    this.parallax = new THREE.Vector2();
    this.view = { portrait: false, dist: 12, elev: 0.98 };
    this.lastBusy = false;
    this.turns = 0;

    sfx.setMuted(readSiteFlag('libSfx') === false);
    this.applyQuality();
    this.resize();
    this.bindUi();
    this.clock = new THREE.Clock();
    this.renderer.setAnimationLoop(() => this.frame());
  }

  applyQuality() {
    const p = this.profile;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, p.pixelRatio));
    if (this.renderer.shadowMap.enabled !== p.shadows) {
      this.renderer.shadowMap.enabled = p.shadows;
      this.desk.lamp.light.castShadow = p.shadows;
      this.scene.traverse((o) => {
        if (!o.material) return;
        for (const m of Array.isArray(o.material) ? o.material : [o.material]) m.needsUpdate = true;
      });
    }
    this.dust.points.visible = p.dust > 0;
    $('quality').textContent = `Графика: ${p.label}`;
  }

  resize() {
    const w = innerWidth, h = innerHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    const aspect = w / h;
    const t = Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2));
    const portrait = aspect < 0.85;
    // на телефоне камера смотрит почти сверху, иначе разворот совсем мелкий
    this.view.elev = THREE.MathUtils.degToRad(portrait ? 74 : 62);
    const needW = portrait ? 8.3 : 11.6;
    const needH = portrait ? 6.6 : 6.9;
    this.view.dist = Math.max(needW / (2 * t * aspect), needH / (2 * t));
    this.view.portrait = portrait;
  }

  bindUi() {
    addEventListener('resize', () => this.resize());
    const c = this.canvas;
    c.addEventListener('pointerdown', () => {
      if (this.t < T_OPENED) this.skip();
    });
    c.addEventListener('pointermove', (e) => {
      if (e.pointerType !== 'mouse') return;
      this.pointer.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
    });
    c.addEventListener('wheel', (e) => {
      e.preventDefault();
      this.zoomTarget = Math.min(1.15, Math.max(0.55, this.zoomTarget * (e.deltaY > 0 ? 1.08 : 0.93)));
    }, { passive: false });

    $('prev').addEventListener('click', () => this.book.prev());
    $('next').addEventListener('click', () => this.book.next());
    $('quality').addEventListener('click', () => {
      this.qualityName = ORDER[(ORDER.indexOf(this.qualityName) + 1) % ORDER.length];
      this.profile = PROFILES[this.qualityName];
      saveQuality(this.qualityName);
      this.applyQuality();
    });
    const sound = $('sound');
    const paintSound = () => { sound.textContent = sfx.muted ? 'Звук: нет' : 'Звук: да'; };
    paintSound();
    sound.addEventListener('click', () => {
      sfx.setMuted(!sfx.muted);
      writeSiteFlag('libSfx', !sfx.muted);
      paintSound();
      if (!sfx.muted) sfx.detent();
    });
    $('open-text').addEventListener('click', () => this.reader.open(this.state ? this.state.chapter : 0));

    const toc = $('toc');
    const list = $('toc-list');
    this.chapters.forEach((ch, i) => {
      const li = document.createElement('li');
      const b = document.createElement('button');
      b.type = 'button';
      const spread = this.book.chapterStart(i);
      const first = this.book.layout.spreads[spread];
      const page = first.right.kind === 'text' ? first.right.number : '';
      b.innerHTML = `<span class="toc-roman">${ch.roman}</span><span class="toc-title">${ch.title}</span><span class="toc-page">${page}</span>`;
      b.addEventListener('click', () => {
        this.book.goTo(spread);
        toc.classList.remove('open');
      });
      li.appendChild(b);
      list.appendChild(li);
    });
    $('open-toc').addEventListener('click', (e) => {
      e.stopPropagation();
      toc.classList.toggle('open');
    });
    document.addEventListener('click', (e) => {
      if (!toc.contains(e.target)) toc.classList.remove('open');
    });
    $('lightbox').addEventListener('click', () => $('lightbox').classList.remove('open'));

    addEventListener('keydown', (e) => {
      if (this.t < T_OPENED && !['Tab', 'Shift'].includes(e.key)) this.skip();
      if (e.key === 'Escape') {
        toc.classList.remove('open');
        $('lightbox').classList.remove('open');
        if (this.reader.isOpen) this.reader.close();
        return;
      }
      if (this.reader.isOpen || e.altKey || e.ctrlKey || e.metaKey) return;
      if (e.key === 'ArrowRight' || e.key === 'PageDown') {
        e.preventDefault();
        this.book.next();
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault();
        this.book.prev();
      }
    });

    window.libraryGraphics = {
      setQuality: (q) => {
        if (!PROFILES[q]) return;
        this.qualityName = q;
        this.profile = PROFILES[q];
        saveQuality(q);
        this.applyQuality();
      },
      getQuality: () => this.qualityName
    };
  }

  skip() {
    this.t = T_OPENED;
  }

  onState(s) {
    this.state = s;
    const ch = this.chapters[s.chapter];
    $('pager-chapter').textContent = `Глава ${ch.roman}. ${ch.title}`;
    $('pager-page').textContent = s.page === 0 ? 'титул' : s.page ? `страница ${s.page} из ${s.totalPages}` : `глава ${ch.roman}`;
    $('prev').disabled = !s.canPrev;
    $('next').disabled = !s.canNext;
    this.radio && this.radio.setChapter(s.chapter);
    if (s.busy && !this.lastBusy && this.opened) {
      sfx.page();
      this.turns++;
      if (this.turns === 2) document.body.classList.add('turned');
    }
    this.lastBusy = s.busy;
    if (this.opened && !s.busy) saveSpread(this.mod.META.id, s.spread);
  }

  showIllustration(chapter) {
    const src = this.mod.MEDIA[chapter] && this.mod.MEDIA[chapter].illustration;
    if (!src) return;
    $('lightbox-img').src = src;
    $('lightbox-img').alt = `Иллюстрация к главе ${this.chapters[chapter].roman}`;
    $('lightbox').classList.add('open');
  }

  frame() {
    const dt = Math.min(0.05, this.clock.getDelta());
    const before = this.t;
    if (this.t < T_OPENED) this.t = Math.min(T_OPENED, this.t + dt);
    const t = this.t;
    const now = performance.now();

    // лампа: щелчок, пара миганий, ровный свет
    let level = 0;
    if (t >= T_LAMP) {
      const k = t - T_LAMP;
      level = k < 0.35 ? (Math.sin(k * 70) > 0 ? 0.85 : 0.2) : Math.min(1, 0.85 + (k - 0.35) * 0.6);
    }
    if (before < T_LAMP && t >= T_LAMP) sfx.lamp();
    this.desk.lamp.set(level);
    this.desk.hemi.intensity = 0.25 + 0.35 * clamp01((t - T_LAMP) / 1.5);

    if (before < T_OPEN && t >= T_OPEN) sfx.cover();
    this.book.setOpen(ease(clamp01((t - T_OPEN) / (T_OPENED - T_OPEN))));
    if (!this.opened && t >= T_OPENED) {
      this.opened = true;
      this.book.setOpen(1);
      this.book.setInteractive(true);
      document.body.classList.add('opened');
    }

    // камера: из полутьмы сбоку к позиции чтения
    const v = this.view;
    this.zoom = damp(this.zoom, this.zoomTarget, 6, dt);
    if (!coarse) {
      this.parallax.x = damp(this.parallax.x, this.pointer.x, 2.5, dt);
      this.parallax.y = damp(this.parallax.y, this.pointer.y, 2.5, dt);
    }
    const c = ease(clamp01(t / T_CAMERA));
    const elev = THREE.MathUtils.lerp(0.42, v.elev, c);
    const dist = v.dist * this.zoom * THREE.MathUtils.lerp(1.45, 1, c);
    // приближенный разворот следует за курсором: читаем левую или правую страницу
    const zoomIn = clamp01((1 - this.zoom) / 0.45);
    // открытый приёмник занимает правый край, разворот отъезжает влево
    const radioOpen = !v.portrait && !$('radio').classList.contains('folded');
    this.shift = damp(this.shift, radioOpen ? 1.5 : 0, 4, dt);
    const tx = THREE.MathUtils.lerp(2.4, 0, c) + this.shift + this.parallax.x * 2.1 * zoomIn;
    const tz = 0.3 - this.parallax.y * 1.2 * zoomIn;
    this.camera.position.set(
      tx + this.parallax.x * 0.35 * (1 - zoomIn),
      BLOTTER_TOP + Math.sin(elev) * dist + this.parallax.y * 0.2,
      tz + Math.cos(elev) * dist
    );
    this.camera.lookAt(tx, BLOTTER_TOP, tz);

    this.book.update(now);
    for (const u of this.updaters) u(dt, this.clock.elapsedTime);
    this.renderer.render(this.scene, this.camera);
  }
}

start();
