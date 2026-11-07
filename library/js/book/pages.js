/* Вёрстка книги: текст глав режется на страницы по реальной ширине строк на canvas,
   страницы собираются в развороты, каждая сторона рисуется в свою текстуру.
   Логика разворотов взята из демо Codex: перед главой слева иллюстрация, справа начало текста. */

import * as THREE from 'three';

export const PAGE_W = 3.72;
export const PAGE_H = 5.12;

const BODY = '"PT Serif", Georgia, serif';
const DISPLAY = '"Cormorant Garamond", "Times New Roman", serif';
const INK = '#140d08';

export function parseChapters(chapters) {
  return chapters.map((ch, index) => ({
    index,
    roman: ch.roman,
    title: ch.title,
    paragraphs: ch.text
      .split(/\n\s*\n/)
      .map((raw) => raw.trim())
      .filter(Boolean)
      .map((raw) => {
        const rule = /^\*\*[\s\S]+\*\*$/.test(raw);
        const emphasis = !rule && /^\*[^*][\s\S]*\*$/.test(raw);
        const text = raw.replace(/\*\*(.+?)\*\*/g, '$1').replace(/\*(.+?)\*/g, '$1').replace(/\s*\n\s*/g, ' ');
        return { text, style: rule ? 'rule' : emphasis ? 'emphasis' : 'body' };
      })
  }));
}

function type(style, W) {
  if (style === 'rule') return { font: `700 ${Math.round(W * 0.026)}px ${BODY}`, line: W * 0.052, color: '#5a1714' };
  if (style === 'emphasis') return { font: `italic 400 ${Math.round(W * 0.031)}px ${BODY}`, line: W * 0.048, color: '#22170f' };
  return { font: `400 ${Math.round(W * 0.031)}px ${BODY}`, line: W * 0.048, color: INK };
}

function frame(W, H, side, firstPage) {
  // внутреннее поле у корешка шире внешнего, как в настоящей книге
  const inner = W * 0.14, outer = W * 0.1;
  const left = side === 'right' ? inner : outer;
  const right = side === 'right' ? outer : inner;
  return { left, width: W - left - right, top: H * (firstPage ? 0.3 : 0.135), bottom: H * 0.875 };
}

/* Строки абзаца. Каждая строка помнит, нужно ли её растягивать по ширине. */
function wrap(ctx, text, maxWidth, indent) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines = [];
  let line = [];
  let width = indent;
  const space = ctx.measureText(' ').width;
  for (const word of words) {
    const w = ctx.measureText(word).width;
    const limit = maxWidth - (lines.length === 0 ? indent : 0);
    const next = line.length ? width + space + w : w;
    if (line.length && next > limit) {
      lines.push({ words: line, justify: true });
      line = [word];
      width = w;
    } else {
      line.push(word);
      width = next;
    }
  }
  if (line.length) lines.push({ words: line, justify: false });
  return lines;
}

function paginateChapter(ctx, W, H, chapter, firstNumber) {
  const pages = [];
  let page = { lines: [] };
  let fr = frame(W, H, 'right', true);
  let y = fr.top;
  const commit = () => {
    pages.push(page);
    page = { lines: [] };
    fr = frame(W, H, 'right', false);
    y = fr.top;
  };
  chapter.paragraphs.forEach((p, pi) => {
    const t = type(p.style, W);
    ctx.font = t.font;
    const isRule = p.style === 'rule';
    const indent = isRule || pi === 0 ? 0 : W * 0.045;
    const lines = isRule ? [{ words: p.text.split(/\s+/), justify: false }] : wrap(ctx, p.text, fr.width, indent);
    const gap = isRule ? t.line * 0.35 : 0;
    lines.forEach((line, li) => {
      const before = li === 0 ? gap : 0;
      if (y + before + t.line > fr.bottom && page.lines.length) {
        commit();
        ctx.font = t.font;
      }
      page.lines.push({ ...line, style: p.style, gapBefore: page.lines.length ? before : 0, indent: li === 0 ? indent : 0, center: isRule });
      y += (page.lines.length > 1 ? before : 0) + t.line;
    });
  });
  if (page.lines.length || !pages.length) pages.push(page);
  return pages.map((pg, i) => ({
    kind: 'text',
    chapter: chapter.index,
    chapterPage: i + 1,
    chapterPages: pages.length,
    number: firstNumber + i,
    lines: pg.lines
  }));
}

export function buildLayout(chapters, textureHeight) {
  const H = textureHeight;
  const W = Math.round(H * (PAGE_W / PAGE_H));
  const ctx = document.createElement('canvas').getContext('2d');
  let number = 1;
  const byChapter = chapters.map((ch) => {
    const pages = paginateChapter(ctx, W, H, ch, number);
    number += pages.length;
    return pages;
  });

  const spreads = [];
  const chapterStart = [];
  byChapter.forEach((pages, ci) => {
    chapterStart.push(spreads.length);
    let cursor = 0;
    // первая глава начинается напротив титула, остальные напротив своего фронтисписа
    const left = ci === 0 ? { kind: 'title' } : { kind: 'frontis', chapter: ci };
    spreads.push({ left, right: pages[cursor++] });
    while (cursor < pages.length) {
      const l = pages[cursor++];
      const r = pages[cursor++] || { kind: 'end', chapter: ci };
      spreads.push({ left: l, right: r });
    }
  });
  const last = spreads[spreads.length - 1];
  if (last.right.kind === 'text') spreads.push({ left: { kind: 'end', chapter: chapters.length - 1, final: true }, right: { kind: 'blank' } });
  else if (last.right.kind === 'end') last.right.final = true;
  return { spreads, chapterStart, totalPages: number - 1, W, H };
}

/* Бумага: подложка рисуется один раз на сторону и потом копируется. */
const paperCache = new Map();
function paper(W, H, gutter) {
  const key = `${W}x${H}${gutter}`;
  if (paperCache.has(key)) return paperCache.get(key);
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const ctx = c.getContext('2d');
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#e9dcbc');
  bg.addColorStop(0.5, '#efe3c6');
  bg.addColorStop(1, '#e3d4b2');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);
  // волокна бумаги
  let seed = W * 7 + (gutter === 'left' ? 1 : 2);
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < W * 1.6; i++) {
    ctx.fillStyle = `rgba(${rnd() > 0.5 ? '120,90,50' : '255,250,235'},${0.03 + rnd() * 0.05})`;
    ctx.fillRect(rnd() * W, rnd() * H, 1 + rnd() * 3, 1);
  }
  // пятна времени
  for (let i = 0; i < 9; i++) {
    const x = rnd() * W, y = rnd() * H, r = W * (0.05 + rnd() * 0.2);
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, 'rgba(150,110,60,0.05)');
    g.addColorStop(1, 'rgba(150,110,60,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  // корешок: бумага уходит в тень и чуть желтеет
  const gx0 = gutter === 'left' ? 0 : W;
  const gx1 = gutter === 'left' ? W * 0.2 : W * 0.8;
  const gg = ctx.createLinearGradient(gx0, 0, gx1, 0);
  gg.addColorStop(0, 'rgba(60,40,20,0.42)');
  gg.addColorStop(0.25, 'rgba(90,62,32,0.14)');
  gg.addColorStop(1, 'rgba(90,62,32,0)');
  ctx.fillStyle = gg;
  ctx.fillRect(0, 0, W, H);
  // внешний край темнее, его чаще трогали
  const ex0 = gutter === 'left' ? W : 0;
  const ex1 = gutter === 'left' ? W * 0.94 : W * 0.06;
  const eg = ctx.createLinearGradient(ex0, 0, ex1, 0);
  eg.addColorStop(0, 'rgba(110,80,40,0.18)');
  eg.addColorStop(1, 'rgba(110,80,40,0)');
  ctx.fillStyle = eg;
  ctx.fillRect(0, 0, W, H);
  paperCache.set(key, c);
  return c;
}

function centerText(ctx, text, x, y, font, color, spacing = 0) {
  ctx.font = font;
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  if ('letterSpacing' in ctx) ctx.letterSpacing = spacing + 'px';
  ctx.fillText(text, x, y);
  if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
}

function ornament(ctx, cx, cy, w, color) {
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = Math.max(1, w * 0.012);
  ctx.beginPath();
  ctx.moveTo(cx - w / 2, cy);
  ctx.lineTo(cx - w * 0.08, cy);
  ctx.moveTo(cx + w * 0.08, cy);
  ctx.lineTo(cx + w / 2, cy);
  ctx.stroke();
  const k = w * 0.045;
  ctx.beginPath();
  ctx.moveTo(cx, cy - k);
  ctx.lineTo(cx + k, cy);
  ctx.lineTo(cx, cy + k);
  ctx.lineTo(cx - k, cy);
  ctx.closePath();
  ctx.fill();
}

function drawTitle(ctx, W, H, book) {
  const cx = W * 0.53;
  centerText(ctx, 'A.C.EON STUDIO', cx, H * 0.16, `600 ${Math.round(W * 0.022)}px ${DISPLAY}`, 'rgba(60,40,26,0.6)', W * 0.008);
  centerText(ctx, book.title.toUpperCase(), cx, H * 0.38, `600 ${Math.round(W * 0.085)}px ${DISPLAY}`, '#20150e', W * 0.004);
  ornament(ctx, cx, H * 0.45, W * 0.42, '#7a2b24');
  centerText(ctx, book.form, cx, H * 0.51, `italic 500 ${Math.round(W * 0.045)}px ${DISPLAY}`, '#3a281b');
  if (book.series) centerText(ctx, book.series.toUpperCase(), cx, H * 0.82, `600 ${Math.round(W * 0.019)}px ${DISPLAY}`, 'rgba(60,40,26,0.55)', W * 0.006);
}

function drawFrontis(ctx, W, H, chapter, image) {
  const cx = W * 0.47;
  if (image) {
    const fw = W * 0.72, fh = H * 0.56, fx = cx - fw / 2, fy = H * 0.16;
    const s = Math.max(fw / image.naturalWidth, fh / image.naturalHeight);
    ctx.save();
    ctx.beginPath();
    ctx.rect(fx, fy, fw, fh);
    ctx.clip();
    ctx.drawImage(image, fx + (fw - image.naturalWidth * s) / 2, fy + (fh - image.naturalHeight * s) / 2, image.naturalWidth * s, image.naturalHeight * s);
    // бумага просвечивает сквозь печать
    ctx.globalCompositeOperation = 'multiply';
    ctx.fillStyle = 'rgba(230,214,180,0.35)';
    ctx.fillRect(fx, fy, fw, fh);
    ctx.restore();
    ctx.strokeStyle = 'rgba(60,40,26,0.55)';
    ctx.lineWidth = Math.max(1, W * 0.003);
    ctx.strokeRect(fx, fy, fw, fh);
    centerText(ctx, `ГЛАВА ${chapter.roman}`, cx, H * 0.79, `600 ${Math.round(W * 0.024)}px ${DISPLAY}`, 'rgba(60,40,26,0.7)', W * 0.01);
    centerText(ctx, chapter.title, cx, H * 0.845, `italic 500 ${Math.round(W * 0.05)}px ${DISPLAY}`, '#2a1b12');
    return;
  }
  // без картинки: большая цифра главы и рамка, чтобы разворот не выглядел пустым
  ctx.strokeStyle = 'rgba(90,50,30,0.35)';
  ctx.lineWidth = Math.max(1, W * 0.003);
  ctx.strokeRect(W * 0.15, H * 0.14, W * 0.64, H * 0.72);
  ctx.strokeRect(W * 0.165, H * 0.15, W * 0.61, H * 0.7);
  centerText(ctx, 'ГЛАВА', cx, H * 0.33, `600 ${Math.round(W * 0.026)}px ${DISPLAY}`, 'rgba(60,40,26,0.65)', W * 0.014);
  centerText(ctx, chapter.roman, cx, H * 0.45, `500 ${Math.round(W * 0.2)}px ${DISPLAY}`, '#5a1d17');
  ornament(ctx, cx, H * 0.56, W * 0.3, 'rgba(90,40,30,0.7)');
  centerText(ctx, chapter.title, cx, H * 0.63, `italic 500 ${Math.round(W * 0.055)}px ${DISPLAY}`, '#2a1b12');
}

function drawText(ctx, W, H, page, side, chapter, book) {
  const first = page.chapterPage === 1;
  const fr = frame(W, H, side, first);
  const mid = fr.left + fr.width / 2;
  const head = side === 'left' ? book.runningHead || book.title : `${chapter.roman}. ${chapter.title}`;
  if (!first) {
    centerText(ctx, head.toUpperCase(), mid, H * 0.075, `600 ${Math.round(W * 0.019)}px ${DISPLAY}`, 'rgba(50,34,22,0.62)', W * 0.008);
    ctx.fillStyle = 'rgba(70,48,30,0.25)';
    ctx.fillRect(fr.left, H * 0.093, fr.width, Math.max(1, H * 0.0008));
  } else {
    centerText(ctx, `ГЛАВА ${chapter.roman}`, mid, H * 0.15, `600 ${Math.round(W * 0.024)}px ${DISPLAY}`, 'rgba(60,40,26,0.65)', W * 0.012);
    centerText(ctx, chapter.title, mid, H * 0.205, `500 ${Math.round(W * 0.07)}px ${DISPLAY}`, '#1d130d');
    ornament(ctx, mid, H * 0.252, W * 0.34, 'rgba(110,40,30,0.75)');
  }

  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';
  let y = fr.top;
  page.lines.forEach((line) => {
    const t = type(line.style, W);
    ctx.font = t.font;
    ctx.fillStyle = t.color;
    y += line.gapBefore;
    const base = y + t.line * 0.72;
    if (line.center) {
      ctx.textAlign = 'center';
      if ('letterSpacing' in ctx) ctx.letterSpacing = W * 0.003 + 'px';
      ctx.fillText(line.words.join(' '), mid, base);
      if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
      ctx.textAlign = 'left';
    } else {
      const x0 = fr.left + line.indent;
      const avail = fr.width - line.indent;
      const widths = line.words.map((w) => ctx.measureText(w).width);
      const total = widths.reduce((a, b) => a + b, 0);
      const space = ctx.measureText(' ').width;
      let gap = space;
      if (line.justify && line.words.length > 1) gap = (avail - total) / (line.words.length - 1);
      // слишком разреженную строку не растягиваем, это хуже, чем рваный край
      if (gap > space * 2.4) gap = space;
      let x = x0;
      line.words.forEach((w, wi) => {
        ctx.fillText(w, x, base);
        x += widths[wi] + gap;
      });
    }
    y += t.line;
  });

  centerText(ctx, String(page.number), mid, H * 0.925, `500 ${Math.round(W * 0.026)}px ${DISPLAY}`, 'rgba(50,34,22,0.7)');
}

function drawEnd(ctx, W, H, side, final) {
  const cx = side === 'right' ? W * 0.53 : W * 0.47;
  if (final) {
    centerText(ctx, 'Конец', cx, H * 0.45, `italic 500 ${Math.round(W * 0.06)}px ${DISPLAY}`, '#2a1b12');
    ornament(ctx, cx, H * 0.51, W * 0.3, 'rgba(110,40,30,0.7)');
    centerText(ctx, 'A.C.EON STUDIO', cx, H * 0.82, `600 ${Math.round(W * 0.02)}px ${DISPLAY}`, 'rgba(60,40,26,0.5)', W * 0.008);
  } else {
    ornament(ctx, cx, H * 0.48, W * 0.22, 'rgba(110,60,40,0.45)');
  }
}

/* Холст одной стороны листа. mirrored нужен обороту переворачиваемого листа. */
export function paintSurface(surface, side, layout, chapters, book, images, mirrored = false) {
  const { W, H } = layout;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const ctx = c.getContext('2d');
  if (mirrored) {
    ctx.translate(W, 0);
    ctx.scale(-1, 1);
  }
  ctx.drawImage(paper(W, H, side === 'right' ? 'left' : 'right'), 0, 0);
  if (surface.kind === 'title') drawTitle(ctx, W, H, book);
  else if (surface.kind === 'frontis') drawFrontis(ctx, W, H, chapters[surface.chapter], images.get(surface.chapter) || null);
  else if (surface.kind === 'text') drawText(ctx, W, H, surface, side, chapters[surface.chapter], book);
  else if (surface.kind === 'end') drawEnd(ctx, W, H, side, surface.final);
  return c;
}

export function canvasTexture(canvas, renderer) {
  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  t.generateMipmaps = true;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  return t;
}
