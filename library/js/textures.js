/* Все текстуры шкафа рисуются на canvas при загрузке, картинок с сервера не нужно.
   У каждой кожаной поверхности два холста: цвет и ORM
   (R - рельеф для bumpMap, G - шероховатость, B - металл; так три карты читают один холст). */

import * as THREE from 'three';

export const SERIF = '"Cormorant Garamond", "Times New Roman", Georgia, serif';

export function seeded(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

/* Периодический value noise: текстуры с repeat не дают шва. */
function periodicNoise(seed, px, py) {
  const r = seeded(seed);
  const grid = new Float32Array(px * py);
  for (let i = 0; i < grid.length; i++) grid[i] = r();
  const at = (i, j) => grid[(((j % py) + py) % py) * px + (((i % px) + px) % px)];
  return (x, y) => {
    const xi = Math.floor(x), yi = Math.floor(y);
    const xf = x - xi, yf = y - yi;
    const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    const a = at(xi, yi) + (at(xi + 1, yi) - at(xi, yi)) * u;
    const b = at(xi, yi + 1) + (at(xi + 1, yi + 1) - at(xi, yi + 1)) * u;
    return a + (b - a) * v;
  };
}

function hexToRgb(hex) {
  const n = parseInt(hex.replace('#', ''), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function shade(hex, k) {
  const [r, g, b] = hexToRgb(hex);
  const f = (v) => Math.max(0, Math.min(255, Math.round(k >= 0 ? v + (255 - v) * k : v * (1 + k))));
  return `rgb(${f(r)},${f(g)},${f(b)})`;
}

export function toTexture(canvas, srgb = true) {
  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  t.anisotropy = 4;
  t.needsUpdate = true;
  return t;
}

/* Зерно кожи: три октавы размытого шума плюс поры. Один тайл на всю сцену. */
let grainTile = null;
export function leatherGrain() {
  if (grainTile) return grainTile;
  const size = 256;
  const c = makeCanvas(size, size);
  const ctx = c.getContext('2d');
  const r = seeded(11);
  ctx.fillStyle = '#808080';
  ctx.fillRect(0, 0, size, size);
  for (const [cells, alpha] of [[8, 0.45], [32, 0.4], [96, 0.35]]) {
    const s = makeCanvas(cells, cells);
    const sc = s.getContext('2d');
    const img = sc.createImageData(cells, cells);
    for (let i = 0; i < cells * cells; i++) {
      const v = r() * 255;
      img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = v;
      img.data[i * 4 + 3] = 255;
    }
    sc.putImageData(img, 0, 0);
    ctx.globalAlpha = alpha;
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(s, 0, 0, size, size);
  }
  ctx.globalAlpha = 1;
  for (let i = 0; i < 1800; i++) {
    ctx.fillStyle = `rgba(0,0,0,${0.06 + r() * 0.14})`;
    ctx.fillRect(r() * size, r() * size, 1 + r() * 1.4, 1 + r() * 1.4);
  }
  for (let i = 0; i < 500; i++) {
    ctx.fillStyle = `rgba(255,255,255,${0.04 + r() * 0.08})`;
    ctx.fillRect(r() * size, r() * size, 1, 1);
  }
  grainTile = c;
  return c;
}

/* Холст поверхности: цвет, рельеф и маска золота рисуются параллельно,
   в конце рельеф и маска сводятся в ORM. */
class Surface {
  constructor(w, h, base, rough) {
    this.w = w;
    this.h = h;
    this.rough = rough;
    this.color = makeCanvas(w, h);
    this.bump = makeCanvas(w, h);
    this.gold = makeCanvas(w, h);
    this.c = this.color.getContext('2d');
    this.b = this.bump.getContext('2d');
    this.g = this.gold.getContext('2d');
    this.c.fillStyle = base;
    this.c.fillRect(0, 0, w, h);
    this.b.fillStyle = '#808080';
    this.b.fillRect(0, 0, w, h);
    this.g.fillStyle = '#000';
    this.g.fillRect(0, 0, w, h);
    const [r, g, b] = hexToRgb(base.startsWith('#') ? base : '#000000');
    this.light = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255 > 0.36;
    this.darkFoil = false;
  }

  foilGradient(ctx, x0, y0, x1, y1) {
    const grad = ctx.createLinearGradient(x0, y0, x1, y1);
    const stops = this.darkFoil
      ? ['#24170c', '#4a3320', '#2b1c10', '#3e2a18']
      : ['#7a5524', '#e2c27c', '#a57b36', '#d8b56c'];
    [0, 0.35, 0.6, 1].forEach((at, i) => grad.addColorStop(at, stops[i]));
    return grad;
  }

  grain(strength = 0.5) {
    const tile = leatherGrain();
    for (const [ctx, alpha] of [[this.c, strength], [this.b, 0.9]]) {
      ctx.save();
      ctx.globalCompositeOperation = 'overlay';
      ctx.globalAlpha = alpha;
      ctx.fillStyle = ctx.createPattern(tile, 'repeat');
      ctx.fillRect(0, 0, this.w, this.h);
      ctx.restore();
    }
  }

  /* Золото: path рисуется градиентом на цвете, белым на маске, чуть вдавлено в рельеф. */
  goldPath(draw, { fill = true, stroke = 0 } = {}) {
    const grad = this.foilGradient(this.c, 0, 0, this.w, this.h * 0.25);
    const targets = [
      [this.c, grad],
      [this.g, this.darkFoil ? '#000' : '#fff'],
      [this.b, '#5a5a5a']
    ];
    for (const [ctx, style] of targets) {
      ctx.save();
      ctx.fillStyle = style;
      ctx.strokeStyle = style;
      if (stroke) ctx.lineWidth = stroke;
      ctx.beginPath();
      draw(ctx);
      if (fill) ctx.fill();
      if (stroke) ctx.stroke();
      ctx.restore();
    }
  }

  goldText(text, x, y, font, { rotate = 0, align = 'center', spacing = 0 } = {}) {
    for (const [ctx, style] of [[this.c, null], [this.g, this.darkFoil ? '#000' : '#fff'], [this.b, '#585858']]) {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rotate);
      ctx.font = font;
      ctx.textAlign = align;
      ctx.textBaseline = 'middle';
      if ('letterSpacing' in ctx) ctx.letterSpacing = spacing + 'px';
      if (style) {
        ctx.fillStyle = style;
      } else {
        const m = ctx.measureText(text);
        ctx.fillStyle = this.foilGradient(ctx, -m.width / 2, -20, m.width / 2, 20);
        // тонкая тень даёт ощущение вдавленной фольги ещё до освещения
        ctx.shadowColor = 'rgba(0,0,0,0.55)';
        ctx.shadowOffsetY = 1;
        ctx.shadowBlur = 1;
      }
      ctx.fillText(text, 0, 0);
      ctx.restore();
    }
  }

  /* Бинт на корешке: выпуклая поперечная полоса. */
  band(y, h) {
    const c = this.c;
    c.save();
    const g = c.createLinearGradient(0, y - h / 2, 0, y + h / 2);
    g.addColorStop(0, 'rgba(0,0,0,0.55)');
    g.addColorStop(0.25, 'rgba(255,235,210,0.16)');
    g.addColorStop(0.55, 'rgba(255,235,210,0.05)');
    g.addColorStop(1, 'rgba(0,0,0,0.6)');
    c.fillStyle = g;
    c.fillRect(0, y - h / 2, this.w, h);
    c.restore();
    const b = this.b;
    b.save();
    const bg = b.createLinearGradient(0, y - h / 2, 0, y + h / 2);
    bg.addColorStop(0, '#808080');
    bg.addColorStop(0.5, '#e8e8e8');
    bg.addColorStop(1, '#808080');
    b.fillStyle = bg;
    b.fillRect(0, y - h / 2, this.w, h);
    b.restore();
  }

  /* Слепое тиснение: тёмная вдавленная линия без золота. */
  blindLine(y, thick) {
    this.c.fillStyle = 'rgba(0,0,0,0.38)';
    this.c.fillRect(0, y, this.w, thick);
    this.c.fillStyle = 'rgba(255,240,220,0.08)';
    this.c.fillRect(0, y + thick, this.w, Math.max(1, thick / 2));
    this.b.fillStyle = '#4a4a4a';
    this.b.fillRect(0, y, this.w, thick);
  }

  inlay(x, y, w, h, color) {
    this.c.fillStyle = color;
    this.c.fillRect(x, y, w, h);
    this.c.save();
    this.c.globalCompositeOperation = 'overlay';
    this.c.globalAlpha = 0.35;
    this.c.fillStyle = this.c.createPattern(leatherGrain(), 'repeat');
    this.c.fillRect(x, y, w, h);
    this.c.restore();
    this.b.fillStyle = '#6c6c6c';
    this.b.fillRect(x, y, w, h);
  }

  /* Потёртости по краям и случайные царапины. */
  wear(r, amount = 1) {
    const c = this.c;
    c.save();
    for (let i = 0; i < 40 * amount; i++) {
      const edge = r() < 0.5;
      const x = edge ? (r() < 0.5 ? r() * this.w * 0.12 : this.w - r() * this.w * 0.12) : r() * this.w;
      const y = r() * this.h;
      c.fillStyle = `rgba(255,228,196,${0.03 + r() * 0.06})`;
      c.beginPath();
      c.ellipse(x, y, 1 + r() * this.w * 0.05, 1 + r() * this.h * 0.012, r() * 3, 0, Math.PI * 2);
      c.fill();
    }
    c.restore();
  }

  /* Рельеф и маска золота в один ORM-холст. */
  bake() {
    const w = this.w, h = this.h;
    const bump = this.b.getImageData(0, 0, w, h).data;
    const gold = this.g.getImageData(0, 0, w, h).data;
    const out = this.b.createImageData(w, h);
    const d = out.data;
    const rough = this.rough * 255;
    for (let i = 0; i < d.length; i += 4) {
      const gm = gold[i] / 255;
      d[i] = bump[i];
      d[i + 1] = rough + (70 - rough) * gm;
      d[i + 2] = gm * 255;
      d[i + 3] = 255;
    }
    const orm = makeCanvas(w, h);
    orm.getContext('2d').putImageData(out, 0, 0);
    return { color: this.color, orm };
  }
}

function fitFont(ctx, text, weight, maxSize, maxWidth, spacing = 0) {
  let size = maxSize;
  for (let i = 0; i < 30; i++) {
    ctx.font = `${weight} ${size}px ${SERIF}`;
    if ('letterSpacing' in ctx) ctx.letterSpacing = spacing + 'px';
    if (ctx.measureText(text).width <= maxWidth) break;
    size *= 0.93;
  }
  return size;
}

/* Корешок настоящей книги: бинты, вставка под названием, название снизу вверх, знак студии. */
export function paintTitledSpine(book, W, H, seed) {
  const r = seeded(seed);
  const s = new Surface(W, H, book.leather, 0.62);
  s.grain(0.55);
  roundShading(s);

  const bands = [0.055, 0.2, 0.73, 0.94];
  for (const y of bands) s.band(y * H, H * 0.026);

  const panelTop = H * 0.235, panelBottom = H * 0.695;
  s.inlay(W * 0.1, panelTop, W * 0.8, panelBottom - panelTop, book.inlay);
  s.goldPath((ctx) => ctx.strokeRect(W * 0.14, panelTop + W * 0.04, W * 0.72, panelBottom - panelTop - W * 0.08), { fill: false, stroke: Math.max(1, W * 0.018) });

  const text = book.spine.toUpperCase();
  const span = (panelBottom - panelTop) * 0.86;
  const ctx = s.c;
  const words = text.split(' ');
  let lines = [text];
  let size = fitFont(ctx, text, 600, W * 0.46, span, W * 0.02);
  if (size < W * 0.3 && words.length > 1) {
    const mid = Math.ceil(words.length / 2);
    lines = [words.slice(0, mid).join(' '), words.slice(mid).join(' ')];
    const longest = lines.reduce((a, b) => (a.length > b.length ? a : b));
    size = Math.min(W * 0.3, fitFont(ctx, longest, 600, W * 0.34, span, W * 0.015));
  }
  const cy = (panelTop + panelBottom) / 2;
  lines.forEach((line, i) => {
    const offset = (i - (lines.length - 1) / 2) * size * 1.05;
    s.goldText(line, W / 2 + offset, cy, `600 ${size}px ${SERIF}`, { rotate: -Math.PI / 2, spacing: W * 0.02 });
  });

  for (const y of [0.115, 0.135, 0.805, 0.825]) {
    s.goldPath((ctx) => ctx.rect(W * 0.12, y * H, W * 0.76, Math.max(1, H * 0.0028)));
  }
  // знак студии: кольцо с ромбом
  const ey = H * 0.875, er = W * 0.16;
  s.goldPath((ctx) => { ctx.beginPath(); ctx.arc(W / 2, ey, er, 0, Math.PI * 2); }, { fill: false, stroke: Math.max(1, W * 0.02) });
  s.goldPath((ctx) => {
    ctx.beginPath();
    ctx.moveTo(W / 2, ey - er * 0.6);
    ctx.lineTo(W / 2 + er * 0.42, ey);
    ctx.lineTo(W / 2, ey + er * 0.6);
    ctx.lineTo(W / 2 - er * 0.42, ey);
    ctx.closePath();
  });
  s.wear(r, 0.8);
  return s.bake();
}

/* Корешок пустой книги. Несколько типов переплёта, чтобы полка не выглядела штампованной. */
export function paintPlainSpine(spec, W, H, seed) {
  const r = seeded(seed);
  const s = new Surface(W, H, spec.leather, spec.style === 'cloth' ? 0.86 : 0.66);
  s.grain(spec.style === 'cloth' ? 0.3 : 0.5);
  roundShading(s);

  if (spec.style === 'bands') {
    const n = 4 + Math.floor(r() * 2);
    for (let i = 0; i < n; i++) s.band(H * (0.1 + (0.8 * i) / (n - 1)), H * 0.022);
    for (let i = 0; i < n - 1; i++) {
      const y = H * (0.1 + (0.8 * (i + 0.5)) / (n - 1));
      if (spec.gilt) s.goldPath((ctx) => ctx.rect(W * 0.2, y - H * 0.002, W * 0.6, Math.max(1, H * 0.003)));
      else s.blindLine(y, Math.max(1, H * 0.004));
    }
  } else if (spec.style === 'label') {
    s.band(H * 0.06, H * 0.02);
    s.band(H * 0.94, H * 0.02);
    s.inlay(W * 0.12, H * 0.18, W * 0.76, H * 0.16, spec.inlay);
    if (spec.gilt) {
      for (const y of [0.1, 0.9]) s.goldPath((ctx) => ctx.rect(W * 0.12, y * H, W * 0.76, Math.max(1, H * 0.003)));
    }
  } else {
    for (const y of [0.05, 0.07, 0.93, 0.95]) s.blindLine(y * H, Math.max(1, H * 0.003));
  }

  if (spec.volume) {
    const y = spec.style === 'label' ? H * 0.26 : H * 0.8;
    s.goldText(spec.volume, W / 2, y, `600 ${W * 0.3}px ${SERIF}`);
  }
  s.wear(r, 1.2);
  return s.bake();
}

/* Корешок не плоский: светлая середина, тёмные края. */
function roundShading(s) {
  const g = s.c.createLinearGradient(0, 0, s.w, 0);
  g.addColorStop(0, 'rgba(0,0,0,0.5)');
  g.addColorStop(0.16, 'rgba(0,0,0,0.1)');
  g.addColorStop(0.42, 'rgba(255,236,214,0.1)');
  g.addColorStop(0.75, 'rgba(0,0,0,0.06)');
  g.addColorStop(1, 'rgba(0,0,0,0.55)');
  s.c.fillStyle = g;
  s.c.fillRect(0, 0, s.w, s.h);
}

/* Лицевая обложка настоящей книги. image подставляется, когда загрузится. */
export function paintCover(book, W, H, image = null) {
  const s = new Surface(W, H, book.leather, 0.6);
  // на светлой коже золото не читается, обложку тиснят тёмной фольгой
  s.darkFoil = s.light;
  s.grain(0.55);
  const vg = s.c.createRadialGradient(W * 0.5, H * 0.45, W * 0.1, W * 0.5, H * 0.5, H * 0.75);
  vg.addColorStop(0, 'rgba(255,236,214,0.08)');
  vg.addColorStop(1, 'rgba(0,0,0,0.45)');
  s.c.fillStyle = vg;
  s.c.fillRect(0, 0, W, H);
  // слева у обложки шарнир, он темнее и продавлен
  s.c.fillStyle = 'rgba(0,0,0,0.35)';
  s.c.fillRect(0, 0, W * 0.07, H);
  s.b.fillStyle = '#585858';
  s.b.fillRect(W * 0.055, 0, W * 0.012, H);

  const m = W * 0.1;
  const lw = Math.max(1, W * 0.006);
  s.goldPath((ctx) => ctx.strokeRect(m + W * 0.03, m, W - 2 * m - W * 0.03, H - 2 * m), { fill: false, stroke: lw * 1.6 });
  s.goldPath((ctx) => ctx.strokeRect(m + W * 0.06, m + W * 0.03, W - 2 * m - W * 0.09, H - 2 * m - W * 0.06), { fill: false, stroke: lw });
  const corners = [[m + W * 0.06, m + W * 0.03], [W - m - W * 0.03, m + W * 0.03], [m + W * 0.06, H - m - W * 0.03], [W - m - W * 0.03, H - m - W * 0.03]];
  for (const [x, y] of corners) {
    s.goldPath((ctx) => {
      const k = W * 0.035;
      ctx.beginPath();
      ctx.moveTo(x, y - k);
      ctx.lineTo(x + k, y);
      ctx.lineTo(x, y + k);
      ctx.lineTo(x - k, y);
      ctx.closePath();
    });
  }

  const cx = W * 0.53;
  const title = book.title.toUpperCase();
  const words = title.split(' ');
  const lines = words.length > 1 && title.length > 9 ? [words.slice(0, Math.ceil(words.length / 2)).join(' '), words.slice(Math.ceil(words.length / 2)).join(' ')] : [title];
  const longest = lines.reduce((a, b) => (a.length > b.length ? a : b));
  const size = fitFont(s.c, longest, 600, W * 0.13, W * 0.62, W * 0.008);
  const ty = image ? H * 0.17 : H * 0.3;
  lines.forEach((line, i) => s.goldText(line, cx, ty + i * size * 1.12, `600 ${size}px ${SERIF}`, { spacing: W * 0.008 }));

  const ruleY = ty + lines.length * size * 1.12 - size * 0.2;
  s.goldPath((ctx) => ctx.rect(cx - W * 0.12, ruleY, W * 0.24, Math.max(1, lw)));
  s.goldText(book.form.toUpperCase(), cx, ruleY + size * 0.55, `500 ${W * 0.042}px ${SERIF}`, { spacing: W * 0.012 });

  if (image) {
    const px = W * 0.24, py = H * 0.36, pw = W * 0.58, ph = H * 0.44;
    const scale = Math.max(pw / image.width, ph / image.height);
    const iw = image.width * scale, ih = image.height * scale;
    s.c.save();
    s.c.beginPath();
    s.c.rect(px, py, pw, ph);
    s.c.clip();
    s.c.drawImage(image, px + (pw - iw) / 2, py + (ph - ih) / 2, iw, ih);
    s.c.restore();
    s.b.fillStyle = '#6a6a6a';
    s.b.fillRect(px, py, pw, ph);
    s.goldPath((ctx) => ctx.strokeRect(px, py, pw, ph), { fill: false, stroke: lw * 2 });
  } else {
    const ey = H * 0.68, er = W * 0.08;
    s.goldPath((ctx) => { ctx.beginPath(); ctx.arc(cx, ey, er, 0, Math.PI * 2); }, { fill: false, stroke: lw * 1.6 });
    s.goldPath((ctx) => { ctx.beginPath(); ctx.arc(cx, ey, er * 0.62, 0, Math.PI * 2); }, { fill: false, stroke: lw });
    s.goldPath((ctx) => {
      ctx.beginPath();
      ctx.moveTo(cx, ey - er * 0.42);
      ctx.lineTo(cx + er * 0.3, ey);
      ctx.lineTo(cx, ey + er * 0.42);
      ctx.lineTo(cx - er * 0.3, ey);
      ctx.closePath();
    });
  }
  s.goldText('A.C.EON', cx, H - m - W * 0.11, `600 ${W * 0.036}px ${SERIF}`, { spacing: W * 0.02 });
  s.wear(seeded(book.id.length * 97), 1.5);
  return s.bake();
}

/* Обложка пустой книги: кожа и слепая рамка. Одна на цвет. */
const plainCoverCache = new Map();
export function paintPlainCover(leather, size) {
  const key = leather + size;
  if (plainCoverCache.has(key)) return plainCoverCache.get(key);
  const s = new Surface(size, size, leather, 0.68);
  s.grain(0.5);
  s.c.strokeStyle = 'rgba(0,0,0,0.35)';
  s.c.lineWidth = Math.max(1, size * 0.008);
  s.c.strokeRect(size * 0.08, size * 0.05, size * 0.84, size * 0.9);
  s.b.strokeStyle = '#555';
  s.b.lineWidth = Math.max(1, size * 0.008);
  s.b.strokeRect(size * 0.08, size * 0.05, size * 0.84, size * 0.9);
  const baked = s.bake();
  plainCoverCache.set(key, baked);
  return baked;
}

/* Обрез блока страниц: тонкие полосы листов, по краю тёмная кромка переплёта. */
let pagesCanvas = null;
export function paintPages() {
  if (pagesCanvas) return pagesCanvas;
  const W = 256, H = 64;
  const c = makeCanvas(W, H);
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#a99a7c';
  ctx.fillRect(0, 0, W, H);
  const r = seeded(5);
  for (let x = 0; x < W; x++) {
    const v = r();
    ctx.fillStyle = v > 0.6 ? 'rgba(90,70,40,0.16)' : 'rgba(255,248,230,0.12)';
    ctx.fillRect(x, 0, 1, H);
  }
  const g = ctx.createLinearGradient(0, 0, W, 0);
  g.addColorStop(0, 'rgba(30,18,10,0.9)');
  g.addColorStop(0.06, 'rgba(30,18,10,0)');
  g.addColorStop(0.94, 'rgba(30,18,10,0)');
  g.addColorStop(1, 'rgba(30,18,10,0.9)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  pagesCanvas = c;
  return c;
}

/* Дерево: волокна вдоль u, годовые кольца искажены шумом. Тайлится. */
export function paintWood({ size = 512, dark = '#1d0f08', light = '#5a341d', rings = 9, seed = 3, planks = 0 }) {
  const c = makeCanvas(size, size);
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(size, size);
  const d = img.data;
  const warp = periodicNoise(seed, 6, 6);
  const fine = periodicNoise(seed + 1, 64, 256);
  const knot = periodicNoise(seed + 2, 3, 12);
  const a = hexToRgb(dark), b = hexToRgb(light);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = x / size, v = y / size;
      const w = warp(u * 6, v * 6) * 2.2 + knot(u * 3, v * 12) * 0.9;
      let ring = Math.sin((v * rings + w) * Math.PI * 2);
      ring = 0.5 + 0.5 * ring;
      ring = Math.pow(ring, 2.2);
      const f = fine(u * 64, v * 256);
      let t = 0.3 + ring * 0.45 + (f - 0.5) * 0.35;
      if (planks) {
        const p = (v * planks) % 1;
        if (p < 0.012) t *= 0.25;
      }
      t = Math.max(0, Math.min(1, t));
      const i = (y * size + x) * 4;
      d[i] = a[0] + (b[0] - a[0]) * t;
      d[i + 1] = a[1] + (b[1] - a[1]) * t;
      d[i + 2] = a[2] + (b[2] - a[2]) * t;
      d[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return c;
}

/* Обои за шкафом: глухой тёмно-зелёный в узкую полоску. */
export function paintWallpaper(size = 256) {
  const c = makeCanvas(size, size);
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#1a201b';
  ctx.fillRect(0, 0, size, size);
  for (let x = 0; x < size; x += size / 8) {
    ctx.fillStyle = 'rgba(255,240,200,0.025)';
    ctx.fillRect(x, 0, size / 16, size);
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.fillRect(x + size / 16, 0, 1, size);
  }
  ctx.save();
  ctx.globalCompositeOperation = 'overlay';
  ctx.globalAlpha = 0.25;
  ctx.fillStyle = ctx.createPattern(leatherGrain(), 'repeat');
  ctx.fillRect(0, 0, size, size);
  ctx.restore();
  return c;
}

/* Карточка в латунной рамке ящика каталога. */
export function paintCatalogLabel(text, W = 256, H = 96) {
  const c = makeCanvas(W, H);
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#d4c7a6';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = 'rgba(90,60,30,0.08)';
  for (let i = 0; i < 6; i++) ctx.fillRect(0, (H / 6) * i + H / 12, W, 1);
  ctx.font = `600 ${H * 0.46}px ${SERIF}`;
  ctx.fillStyle = '#2b1d12';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, W / 2, H * 0.54);
  return c;
}

/* Мягкая круглая точка для пыли и пара. */
export function paintSoftDot(size = 64) {
  const c = makeCanvas(size, size);
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.35, 'rgba(255,255,255,0.45)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  return c;
}

export { shade };
