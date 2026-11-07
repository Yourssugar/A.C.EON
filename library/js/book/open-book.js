/* Раскрытая книга на столе: крышки, блоки страниц, корешок, переворачиваемый лист.
   Изгиб листа и перетаскивание мышью перенесены из демо Codex почти без изменений,
   геометрия переплёта переписана: блоки не входят в корешок, крышка с левым блоком
   открывается как одно целое, книга лежит ровно на плоскости y = 0. */

import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/RoundedBoxGeometry.js';
import { PAGE_W, PAGE_H, buildLayout, paintSurface, canvasTexture } from './pages.js';
import { paintCover, paintPlainCover, toTexture, leatherGrain } from '../textures.js';

const CT = 0.13;          // толщина крышки
const OVER = 0.13;        // крышка выступает за блок
const GAP = 0.035;        // от оси корешка до блока
const BLOCK = 0.36;       // толщина всех страниц
const HINGE = 0.02;       // крышка начинается чуть в стороне от оси
const BOARD_W = GAP + PAGE_W + OVER - HINGE;
const BOARD_D = PAGE_H + OVER * 2;

const clamp01 = (v) => Math.min(1, Math.max(0, v));
const ease = (v) => {
  const t = clamp01(v);
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
};

function leatherMat(baked) {
  const orm = toTexture(baked.orm, false);
  return new THREE.MeshStandardMaterial({
    map: toTexture(baked.color, true),
    roughnessMap: orm,
    metalnessMap: orm,
    bumpMap: orm,
    bumpScale: 1.2,
    roughness: 1,
    metalness: 1
  });
}

/* Форзац: тёмная бумага с мелким узором, по краю загнутая кожа крышки. */
function paintEndpaper(leather, W, H) {
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const ctx = c.getContext('2d');
  ctx.fillStyle = leather;
  ctx.fillRect(0, 0, W, H);
  ctx.save();
  ctx.globalCompositeOperation = 'overlay';
  ctx.globalAlpha = 0.5;
  ctx.fillStyle = ctx.createPattern(leatherGrain(), 'repeat');
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
  const m = W * 0.045;
  ctx.fillStyle = '#3a2a1e';
  ctx.fillRect(m, m, W - 2 * m, H - 2 * m);
  ctx.strokeStyle = 'rgba(214,180,120,0.18)';
  ctx.lineWidth = 1;
  const step = W / 22;
  for (let y = m; y < H - m; y += step) {
    for (let x = m + ((y / step) % 2) * step / 2; x < W - m; x += step) {
      ctx.beginPath();
      ctx.moveTo(x, y - step * 0.22);
      ctx.lineTo(x + step * 0.16, y);
      ctx.lineTo(x, y + step * 0.22);
      ctx.lineTo(x - step * 0.16, y);
      ctx.closePath();
      ctx.stroke();
    }
  }
  return c;
}

/* Обрез блока: тонкие линии листов поперёк толщины. */
function paintPageEdge() {
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 256;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#cbb991';
  ctx.fillRect(0, 0, 64, 256);
  for (let y = 0; y < 256; y += 3) {
    ctx.fillStyle = y % 12 === 0 ? 'rgba(80,56,30,0.28)' : 'rgba(90,64,36,0.12)';
    ctx.fillRect(0, y, 64, 1);
  }
  return c;
}

function pageMaterial(side) {
  return new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.86,
    metalness: 0,
    side,
    emissive: 0x1a120a,
    emissiveIntensity: side === THREE.BackSide ? 0.9 : 0.35,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1
  });
}

export function createOpenBook({ renderer, camera, canvas, chapters, book, media, profile, onState, onIllustration }) {
  const root = new THREE.Group();
  const layout = buildLayout(chapters, profile.pageTexture);
  const { spreads } = layout;
  const maxSpread = spreads.length - 1;

  const images = new Map();
  const textures = { left: new Map(), right: new Map() };
  let backTexture = null;

  const texture = (index, side) => {
    const cache = textures[side];
    if (!cache.has(index)) {
      cache.set(index, canvasTexture(paintSurface(spreads[index][side], side, layout, chapters, book, images), renderer));
    }
    return cache.get(index);
  };
  const mirroredLeft = (index) => {
    if (backTexture) backTexture.dispose();
    backTexture = canvasTexture(paintSurface(spreads[index].left, 'left', layout, chapters, book, images, true), renderer);
    return backTexture;
  };

  media.forEach((m, chapter) => {
    if (!m.illustration) return;
    const img = new Image();
    img.decoding = 'async';
    img.addEventListener('load', () => {
      images.set(chapter, img);
      // перерисовать только развороты с этим фронтисписом, если они уже в кэше
      spreads.forEach((s, i) => {
        if (s.left.kind === 'frontis' && s.left.chapter === chapter && textures.left.has(i)) {
          textures.left.get(i).dispose();
          textures.left.delete(i);
          if (i === spread) refreshStatic();
        }
      });
    }, { once: true });
    img.src = m.illustration;
  });

  const edgeTex = toTexture(paintPageEdge(), true);
  const leather = leatherMat(paintPlainCover(book.leather, 256));
  const coverBaked = paintCover({ ...book, spine: book.title }, 512, Math.round(512 * BOARD_D / BOARD_W));
  const coverMat = leatherMat(coverBaked);
  const endpaper = new THREE.MeshStandardMaterial({ map: toTexture(paintEndpaper(book.leather, 512, Math.round(512 * BOARD_D / BOARD_W)), true), roughness: 0.9 });
  const blockMat = new THREE.MeshStandardMaterial({ map: edgeTex, roughness: 0.95 });
  const shadows = profile.shadows;

  const boardGeo = new RoundedBoxGeometry(BOARD_W, CT, BOARD_D, 2, 0.035);
  const backBoard = new THREE.Mesh(boardGeo, [leather, leather, endpaper, leather, leather, leather]);
  backBoard.position.set(HINGE + BOARD_W / 2, CT / 2, 0);
  backBoard.castShadow = backBoard.receiveShadow = shadows;
  root.add(backBoard);

  const blockGeo = new RoundedBoxGeometry(PAGE_W, BLOCK, PAGE_H, 2, 0.02);
  const rightBlock = new THREE.Mesh(blockGeo, blockMat);
  rightBlock.castShadow = rightBlock.receiveShadow = shadows;
  root.add(rightBlock);

  const segs = profile.pageSegments;
  const flatGeo = new THREE.PlaneGeometry(PAGE_W, PAGE_H, 2, 2);
  flatGeo.rotateX(-Math.PI / 2);
  const rightMat = pageMaterial(THREE.FrontSide);
  const rightPage = new THREE.Mesh(flatGeo, rightMat);
  rightPage.position.x = GAP + PAGE_W / 2;
  rightPage.receiveShadow = shadows;
  root.add(rightPage);

  // всё, что ложится налево, живёт на шарнире крышки и открывается вместе с ней
  const pivot = new THREE.Group();
  root.add(pivot);
  const frontBoard = new THREE.Mesh(boardGeo, [leather, leather, coverMat, endpaper, leather, leather]);
  frontBoard.position.set(HINGE + BOARD_W / 2, 0, 0);
  frontBoard.castShadow = frontBoard.receiveShadow = shadows;
  pivot.add(frontBoard);
  const leftBlock = new THREE.Mesh(blockGeo, blockMat);
  leftBlock.position.x = GAP + PAGE_W / 2;
  leftBlock.castShadow = leftBlock.receiveShadow = shadows;
  pivot.add(leftBlock);
  // плоскость смотрит вниз в системе шарнира; после поворота на 180 градусов текст читается как обычно
  const leftGeo = new THREE.PlaneGeometry(PAGE_W, PAGE_H, 2, 2);
  leftGeo.rotateX(Math.PI / 2);
  leftGeo.rotateY(Math.PI);
  const leftMat = pageMaterial(THREE.FrontSide);
  const leftPage = new THREE.Mesh(leftGeo, leftMat);
  leftPage.position.x = GAP + PAGE_W / 2;
  leftPage.receiveShadow = shadows;
  pivot.add(leftPage);

  /* Корешок: кожаная лента между крышками. Закрытой книгой выгнута наружу, открытой лежит плоско. */
  const SPINE_N = 18;
  const spineGeo = new THREE.BufferGeometry();
  const spinePos = new Float32Array((SPINE_N + 1) * 2 * 3);
  const spineUv = new Float32Array((SPINE_N + 1) * 2 * 2);
  const spineIdx = [];
  for (let i = 0; i <= SPINE_N; i++) {
    spineUv.set([i / SPINE_N, 0, i / SPINE_N, 1], i * 4);
    if (i < SPINE_N) {
      const a = i * 2, b = a + 1, c = a + 2, d = a + 3;
      spineIdx.push(a, c, b, b, c, d);
    }
  }
  spineGeo.setAttribute('position', new THREE.BufferAttribute(spinePos, 3));
  spineGeo.setAttribute('uv', new THREE.BufferAttribute(spineUv, 2));
  spineGeo.setIndex(spineIdx);
  const spineMat = leather.clone();
  spineMat.side = THREE.DoubleSide;
  const spineMesh = new THREE.Mesh(spineGeo, spineMat);
  spineMesh.castShadow = shadows;
  root.add(spineMesh);
  const tmpA = new THREE.Vector3(), tmpB = new THREE.Vector3(), tmpC = new THREE.Vector3(), tmpN = new THREE.Vector3();
  function updateSpine(open) {
    tmpA.set(HINGE, 0, 0);
    tmpB.set(HINGE, CT / 2, 0).applyEuler(pivot.rotation).add(pivot.position);
    tmpN.set(-(tmpB.y - tmpA.y), tmpB.x - tmpA.x, 0).normalize();
    tmpC.addVectors(tmpA, tmpB).multiplyScalar(0.5).addScaledVector(tmpN, 0.2 * (1 - open));
    const zHalf = BOARD_D / 2 - 0.01;
    for (let i = 0; i <= SPINE_N; i++) {
      const t = i / SPINE_N, u = 1 - t;
      const x = u * u * tmpA.x + 2 * u * t * tmpC.x + t * t * tmpB.x;
      const y = Math.max(0.002, u * u * tmpA.y + 2 * u * t * tmpC.y + t * t * tmpB.y);
      spinePos.set([x, y, -zHalf, x, y, zHalf], i * 6);
    }
    spineGeo.attributes.position.needsUpdate = true;
    spineGeo.computeVertexNormals();
    spineGeo.computeBoundingSphere();
  }

  /* Переворачиваемый лист. Ось вращения совпадает с осью корешка. */
  const turnGeo = new THREE.PlaneGeometry(PAGE_W, PAGE_H, segs, Math.round(segs * 1.4));
  turnGeo.translate(PAGE_W / 2, 0, 0);
  turnGeo.rotateX(-Math.PI / 2);
  const original = Float32Array.from(turnGeo.attributes.position.array);
  const frontMat = pageMaterial(THREE.FrontSide);
  const backMat = pageMaterial(THREE.BackSide);
  const turnFront = new THREE.Mesh(turnGeo, frontMat);
  const turnBack = new THREE.Mesh(turnGeo, backMat);
  // лист нулевой толщины не должен принимать свою же тень, иначе на изгибе чёрная дыра
  turnFront.castShadow = shadows;
  turnFront.receiveShadow = false;
  turnBack.receiveShadow = false;
  turnFront.frustumCulled = turnBack.frustumCulled = false;
  turnFront.visible = turnBack.visible = false;
  root.add(turnFront, turnBack);

  let spread = 0;
  let open = 0;
  let interactive = false;
  let mode = 'idle'; // idle | drag | settle
  let direction = null;
  let progress = 0;
  let settle = { from: 0, to: 0, start: 0, duration: 0 };
  let drag = null;

  const heights = (i = spread) => {
    const r = i / Math.max(1, maxSpread);
    const left = 0.012 + r * (BLOCK - 0.024);
    return { left, right: BLOCK - left };
  };

  function placeStacks() {
    const h = heights();
    rightBlock.scale.y = h.right / BLOCK;
    rightBlock.position.set(GAP + PAGE_W / 2, CT + h.right / 2, 0);
    rightPage.position.y = CT + h.right + 0.004;
    leftBlock.scale.y = h.left / BLOCK;
    leftBlock.position.y = -CT / 2 - h.left / 2;
    leftPage.position.y = -CT / 2 - h.left - 0.004;
  }

  function refreshStatic() {
    leftMat.map = texture(spread, 'left');
    rightMat.map = texture(spread, 'right');
    leftMat.needsUpdate = rightMat.needsUpdate = true;
    placeStacks();
    for (const side of ['left', 'right']) {
      for (const [i, t] of textures[side]) {
        if (Math.abs(i - spread) > 1) {
          t.dispose();
          textures[side].delete(i);
        }
      }
    }
    // соседние развороты готовим заранее, чтобы первый кадр листания не дёргался
    if (spread + 1 <= maxSpread) texture(spread + 1, 'right');
    if (spread - 1 >= 0) texture(spread - 1, 'left');
  }

  function setOpen(p) {
    open = clamp01(p);
    const e = ease(open);
    pivot.rotation.z = e * Math.PI;
    pivot.position.y = THREE.MathUtils.lerp(CT + BLOCK + CT / 2, CT / 2, e);
    updateSpine(e);
  }

  function surfaceY(fold) {
    const now = heights();
    const dest = heights(direction === 'forward' ? Math.min(maxSpread, spread + 1) : Math.max(0, spread - 1));
    const rightH = direction === 'backward' ? dest.right : now.right;
    const leftH = direction === 'forward' ? dest.left : now.left;
    return THREE.MathUtils.lerp(CT + rightH + 0.008, CT + leftH + 0.008, ease(fold));
  }

  function deform(fold) {
    const f = clamp01(fold);
    const arr = turnGeo.attributes.position.array;
    const sy = surfaceY(f);
    const mid = Math.sin(Math.PI * f);
    for (let o = 0; o < arr.length; o += 3) {
      const ox = original[o];
      const oz = original[o + 2];
      const across = clamp01(ox / PAGE_W);
      const along = oz / (PAGE_H / 2);
      const curl = mid * 0.42 * Math.sin(Math.PI * across) * (0.35 + across * 0.65);
      const lag = mid * 0.08 * Math.sin(Math.PI * across * 0.5);
      const angle = Math.PI * f + curl - lag;
      const flutter = mid * 0.035 * Math.sin(across * Math.PI) * Math.cos(along * Math.PI);
      const r = GAP + ox;
      arr[o] = r * Math.cos(angle);
      arr[o + 1] = sy + r * Math.sin(angle) + flutter + 0.004 * mid;
      arr[o + 2] = oz + mid * 0.055 * Math.sin(Math.PI * across) * along;
    }
    turnGeo.attributes.position.needsUpdate = true;
    turnGeo.computeVertexNormals();
  }

  function showTurn(dir) {
    direction = dir;
    const src = dir === 'forward' ? spread : spread - 1;
    const dst = dir === 'forward' ? spread + 1 : spread;
    frontMat.map = texture(src, 'right');
    backMat.map = mirroredLeft(dst);
    frontMat.needsUpdate = backMat.needsUpdate = true;
    turnFront.visible = turnBack.visible = true;
    if (dir === 'forward') {
      rightMat.map = texture(dst, 'right');
      rightMat.needsUpdate = true;
      deform(0);
    } else {
      leftMat.map = texture(src, 'left');
      leftMat.needsUpdate = true;
      deform(1);
    }
  }

  function hideTurn() {
    turnFront.visible = turnBack.visible = false;
    frontMat.map = backMat.map = null;
    if (backTexture) {
      backTexture.dispose();
      backTexture = null;
    }
    direction = null;
  }

  function setProgress(p) {
    progress = clamp01(p);
    deform(direction === 'backward' ? 1 - progress : progress);
  }

  function beginSettle(commit) {
    if (!direction) return;
    mode = 'settle';
    settle = { from: progress, to: commit ? 1 : 0, start: performance.now(), duration: 0 };
    settle.duration = 340 + Math.abs(settle.to - settle.from) * 330;
    emit();
  }

  function turn(dir) {
    if (!interactive || mode !== 'idle') return false;
    if (dir === 'forward' && spread >= maxSpread) return false;
    if (dir === 'backward' && spread <= 0) return false;
    progress = 0;
    showTurn(dir);
    setProgress(0);
    beginSettle(true);
    return true;
  }

  function goTo(index) {
    if (mode !== 'idle') return;
    spread = Math.max(0, Math.min(maxSpread, index));
    refreshStatic();
    emit();
  }

  function readingPage(i = spread) {
    const s = spreads[i];
    if (s.right.kind === 'text') return s.right;
    if (s.left.kind === 'text') return s.left;
    return null;
  }

  function chapterOf(i = spread) {
    const p = readingPage(i);
    if (p) return p.chapter;
    const s = spreads[i];
    return s.right.chapter ?? s.left.chapter ?? 0;
  }

  function emit() {
    const page = readingPage();
    onState && onState({
      spread,
      spreads: spreads.length,
      chapter: chapterOf(),
      chapters: chapters.length,
      page: page ? page.number : spreads[spread].left.kind === 'title' ? 0 : null,
      chapterPage: page ? page.chapterPage : 0,
      chapterPages: page ? page.chapterPages : 0,
      totalPages: layout.totalPages,
      busy: mode !== 'idle',
      canPrev: spread > 0,
      canNext: spread < maxSpread
    });
  }

  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const plane = new THREE.Plane();
  const hitPoint = new THREE.Vector3();
  const local = new THREE.Vector3();

  function castFrom(e) {
    const rect = canvas.getBoundingClientRect();
    ndc.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
    raycaster.setFromCamera(ndc, camera);
  }

  function planePoint(e) {
    castFrom(e);
    if (!raycaster.ray.intersectPlane(plane, hitPoint)) return null;
    return root.worldToLocal(local.copy(hitPoint));
  }

  function onDown(e) {
    if (!interactive || mode !== 'idle' || e.button > 0) return;
    castFrom(e);
    const hit = raycaster.intersectObjects([rightPage, leftPage], false)[0];
    if (!hit) return;
    const dir = hit.object === rightPage ? 'forward' : 'backward';
    const illustration = dir === 'backward' && spreads[spread].left.kind === 'frontis' && images.has(spreads[spread].left.chapter);
    if (!illustration && ((dir === 'forward' && spread >= maxSpread) || (dir === 'backward' && spread <= 0))) return;
    plane.setFromNormalAndCoplanarPoint(new THREE.Vector3(0, 1, 0), hit.point);
    const p = planePoint(e);
    if (!p) return;
    e.preventDefault();
    drag = { id: e.pointerId, x: p.x, dir, max: 0, last: 0, at: performance.now(), started: performance.now(), velocity: 0, illustration, shown: false };
    canvas.setPointerCapture(e.pointerId);
    mode = 'drag';
  }

  function onMove(e) {
    if (!drag || e.pointerId !== drag.id) {
      if (interactive && mode === 'idle' && e.pointerType === 'mouse') {
        castFrom(e);
        const over = raycaster.intersectObjects([rightPage, leftPage], false)[0];
        canvas.style.cursor = over ? 'grab' : '';
      }
      return;
    }
    const p = planePoint(e);
    if (!p) return;
    const dist = drag.dir === 'forward' ? drag.x - p.x : p.x - drag.x;
    const avail = drag.dir === 'forward' ? drag.x + PAGE_W * 0.92 : PAGE_W * 0.92 - drag.x;
    const value = clamp01(dist / Math.max(PAGE_W * 0.65, avail));
    if (!drag.shown) {
      if (value < 0.01) return;
      // для иллюстрации лист не поднимаем, пока не ясно, что это не клик
      if ((drag.dir === 'forward' && spread >= maxSpread) || (drag.dir === 'backward' && spread <= 0)) return;
      showTurn(drag.dir);
      drag.shown = true;
      canvas.style.cursor = 'grabbing';
      emit();
    }
    const now = performance.now();
    const dt = Math.max(12, now - drag.at) / 1000;
    drag.velocity = THREE.MathUtils.lerp(drag.velocity, (value - drag.last) / dt, 0.45);
    drag.at = now;
    drag.last = value;
    drag.max = Math.max(drag.max, value);
    setProgress(value);
  }

  function onUp(e, cancelled = false) {
    if (!drag || e.pointerId !== drag.id) return;
    const d = drag;
    drag = null;
    if (canvas.hasPointerCapture(e.pointerId)) canvas.releasePointerCapture(e.pointerId);
    canvas.style.cursor = '';
    const tap = !cancelled && d.max < 0.03 && performance.now() - d.started < 350;
    if (!d.shown) {
      mode = 'idle';
      if (tap) {
        if (d.illustration) onIllustration && onIllustration(spreads[spread].left.chapter);
        else turn(d.dir);
      }
      return;
    }
    if (tap) {
      // короткое касание листает целиком, как кнопка
      beginSettle(true);
      return;
    }
    beginSettle(!cancelled && (progress > 0.46 || d.velocity > 0.72));
  }

  canvas.addEventListener('pointerdown', onDown);
  canvas.addEventListener('pointermove', onMove);
  canvas.addEventListener('pointerup', (e) => onUp(e));
  canvas.addEventListener('pointercancel', (e) => onUp(e, true));
  canvas.addEventListener('lostpointercapture', (e) => { if (drag && e.pointerId === drag.id) onUp(e); });

  setOpen(0);
  refreshStatic();
  emit();

  return {
    root,
    layout,
    size: { width: (GAP + PAGE_W + OVER) * 2, depth: BOARD_D, closedHeight: CT * 2 + BLOCK },
    setOpen,
    setInteractive(v) {
      interactive = v;
      emit();
    },
    next: () => turn('forward'),
    prev: () => turn('backward'),
    goTo,
    chapterStart: (c) => layout.chapterStart[c] ?? 0,
    get spread() { return spread; },
    update(now) {
      if (mode !== 'settle' || !direction) return;
      const t = clamp01((now - settle.start) / settle.duration);
      setProgress(THREE.MathUtils.lerp(settle.from, settle.to, ease(t)));
      if (t < 1) return;
      if (settle.to === 1) spread += direction === 'forward' ? 1 : -1;
      hideTurn();
      mode = 'idle';
      progress = 0;
      refreshStatic();
      emit();
    }
  };
}
