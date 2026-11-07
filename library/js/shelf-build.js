/* Сборка комнаты: шкаф, книги, картотека, торшер, столик с чаем.
   Единица сцены примерно 25 см: книга высотой 1.2 это обычный толстый том. */

import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/RoundedBoxGeometry.js';
import {
  seeded, toTexture, shade,
  paintTitledSpine, paintPlainSpine, paintCover, paintPlainCover, paintPages,
  paintWood, paintWallpaper, paintCatalogLabel, paintSoftDot
} from './textures.js';

export const SHELF_TOP = [0.77, 2.25, 3.77, 5.29];
const SHELF_Y = [0.62, 2.14, 3.66, 5.18, 6.68];
const BAYS = [[-4.06, -0.14], [0.14, 4.06]];
const SPINE_Z = 0.47;

const LEATHERS = ['#4a1a17', '#2b3a2c', '#22304a', '#5a3a22', '#3b2433', '#6b5530', '#211d1c', '#5c2a1d', '#2f4a46', '#7a6446', '#3d3f2a', '#462a1c'];
const ROMAN = ['I', 'II', 'III', 'IV', 'V'];

function leatherMaterial(baked, extra = {}) {
  const map = toTexture(baked.color, true);
  const orm = toTexture(baked.orm, false);
  return new THREE.MeshStandardMaterial({
    map,
    roughnessMap: orm,
    metalnessMap: orm,
    bumpMap: orm,
    bumpScale: 1.6,
    roughness: 1,
    metalness: 1,
    ...extra
  });
}

function woodMaterial(canvas, repeatX, repeatY, rotate = false, tint = '#ffffff', rough = 0.62) {
  const map = toTexture(canvas, true);
  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  map.repeat.set(repeatX, repeatY);
  if (rotate) {
    map.center.set(0.5, 0.5);
    map.rotation = Math.PI / 2;
  }
  return new THREE.MeshStandardMaterial({ map, color: tint, roughness: rough, metalness: 0 });
}

function box(parent, size, pos, material, rounded = 0.02) {
  const geo = rounded > 0
    ? new RoundedBoxGeometry(size[0], size[1], size[2], 2, rounded)
    : new THREE.BoxGeometry(size[0], size[1], size[2]);
  const mesh = new THREE.Mesh(geo, material);
  mesh.position.set(pos[0], pos[1], pos[2]);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

export function buildLibrary(scene, profile, books) {
  const root = new THREE.Group();
  scene.add(root);
  const updaters = [];
  const interactive = [];

  const woodCanvas = paintWood({ seed: 3 });
  const woodDarkCanvas = paintWood({ seed: 9, dark: '#120905', light: '#3a2213', rings: 7 });
  const floorCanvas = paintWood({ seed: 21, dark: '#0f0805', light: '#33200f', rings: 5, planks: 4 });

  buildRoom(root, floorCanvas);
  buildCabinet(root, woodCanvas, woodDarkCanvas);
  const catalog = buildCatalog(root, woodCanvas);
  interactive.push(catalog);
  const bookItems = buildBooks(root, profile, books);
  interactive.push(...bookItems.filter((b) => b.kind === 'book' || b.kind === 'empty'));
  const lamp = buildFloorLamp(root);
  updaters.push(lamp.update);
  const tea = buildTeaTable(root, woodDarkCanvas, profile);
  updaters.push(tea.update);
  // пыль строится всегда на максимум, профиль только меняет сколько точек рисовать
  const dust = buildDust(root, 320);
  updaters.push(dust.update);

  return { root, interactive, updaters, lamp, dust };
}

function buildRoom(root, floorCanvas) {
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(30, 20),
    woodMaterial(floorCanvas, 5, 4, true, '#ffffff', 0.7)
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(0, 0, 6);
  floor.receiveShadow = true;
  root.add(floor);

  const wallTex = toTexture(paintWallpaper(), true);
  wallTex.wrapS = wallTex.wrapT = THREE.RepeatWrapping;
  wallTex.repeat.set(12, 4);
  const wall = new THREE.Mesh(
    new THREE.PlaneGeometry(30, 10),
    new THREE.MeshStandardMaterial({ map: wallTex, roughness: 0.95 })
  );
  wall.position.set(0, 5, -0.75);
  wall.receiveShadow = true;
  root.add(wall);

  // плинтус и панель под обоями, чтобы стена не была голой плоскостью
  const panelMat = new THREE.MeshStandardMaterial({ color: '#1a0f09', roughness: 0.7 });
  box(root, [30, 1.1, 0.06], [0, 0.55, -0.72], panelMat, 0);
  box(root, [30, 0.06, 0.1], [0, 1.12, -0.7], new THREE.MeshStandardMaterial({ color: '#2c1a0f', roughness: 0.5 }), 0);

  // ковёр перед шкафом
  const rug = new THREE.Mesh(
    new THREE.PlaneGeometry(7.5, 4.2),
    new THREE.MeshStandardMaterial({ color: '#2a1414', roughness: 1 })
  );
  rug.rotation.x = -Math.PI / 2;
  rug.position.set(0, 0.01, 3.2);
  rug.receiveShadow = true;
  root.add(rug);
}

function buildCabinet(root, woodCanvas, woodDarkCanvas) {
  const cab = new THREE.Group();
  root.add(cab);
  const tall = woodMaterial(woodCanvas, 1, 3, true, '#c99a73', 0.55);
  const long = woodMaterial(woodCanvas, 3, 1, false, '#c99a73', 0.55);
  const trim = woodMaterial(woodCanvas, 4, 1, false, '#e0b48a', 0.42);
  const back = woodMaterial(woodDarkCanvas, 2, 2, true, '#a88066', 0.85);

  box(cab, [8.6, 6.4, 0.26], [0, 3.6, -0.56], back, 0.01);
  box(cab, [0.34, 7.0, 1.14], [-4.28, 3.45, -0.02], tall, 0.04);
  box(cab, [0.34, 7.0, 1.14], [4.28, 3.45, -0.02], tall, 0.04);
  box(cab, [0.18, 6.1, 1.06], [0, 3.6, -0.03], tall, 0.03);
  // карниз из трёх ступеней, иначе верх выглядит обрезанным
  box(cab, [9.1, 0.3, 1.32], [0, 7.0, 0], long, 0.04);
  box(cab, [9.4, 0.1, 1.46], [0, 7.2, 0.03], trim, 0.03);
  box(cab, [9.0, 0.08, 1.28], [0, 7.29, 0], long, 0.02);
  box(cab, [9.0, 0.55, 1.42], [0, 0.27, 0.02], long, 0.04);
  box(cab, [9.1, 0.06, 1.5], [0, 0.56, 0.04], trim, 0.02);

  SHELF_Y.forEach((y, i) => {
    const t = i === 0 ? 0.3 : 0.22;
    box(cab, [8.24, t, 1.1], [0, y, -0.01], long, 0.025);
    if (i > 0 && i < 4) box(cab, [8.26, 0.05, 0.06], [0, y + t / 2 - 0.02, 0.54], trim, 0.015);
  });

  // филёнки на боковинах
  for (const x of [-4.28, 4.28]) {
    box(cab, [0.36, 0.06, 1.1], [x, 6.2, 0], trim, 0.015);
    box(cab, [0.36, 0.06, 1.1], [x, 1.0, 0], trim, 0.015);
  }
}

/* Картотечный ящик: четыре ящика с латунными рамками, сюда лягут истории песен. */
function buildCatalog(root, woodCanvas) {
  const group = new THREE.Group();
  const W = 1.62, H = 1.12, D = 0.86;
  const x = BAYS[1][1] - W / 2 - 0.02;
  group.position.set(x, SHELF_TOP[0] + H / 2, SPINE_Z - D / 2 + 0.02);
  root.add(group);
  const body = woodMaterial(woodCanvas, 1, 1, false, '#8a5a3a', 0.5);
  const front = woodMaterial(woodCanvas, 1, 1, false, '#a7724c', 0.45);
  const brass = new THREE.MeshStandardMaterial({ color: '#b48a4a', roughness: 0.32, metalness: 1 });

  box(group, [W, H, D], [0, 0, 0], body, 0.03);
  const drawers = [];
  const labels = ['А - Е', 'Ж - М', 'Н - Т', 'У - Я'];
  const dw = (W - 0.12) / 2, dh = (H - 0.12) / 2;
  const emissiveTargets = [];
  for (let i = 0; i < 4; i++) {
    const col = i % 2, row = Math.floor(i / 2);
    const drawer = new THREE.Group();
    drawer.position.set(-W / 2 + 0.04 + dw / 2 + col * (dw + 0.04), H / 2 - 0.04 - dh / 2 - row * (dh + 0.04), D / 2);
    group.add(drawer);
    const panelMat = front.clone();
    emissiveTargets.push(panelMat);
    box(drawer, [dw, dh, 0.06], [0, 0, 0], panelMat, 0.015);
    const labelTex = toTexture(paintCatalogLabel(labels[i]), true);
    const label = new THREE.Mesh(new THREE.PlaneGeometry(dw * 0.46, dh * 0.24), new THREE.MeshStandardMaterial({ map: labelTex, roughness: 0.9 }));
    label.position.set(0, dh * 0.16, 0.034);
    drawer.add(label);
    box(drawer, [dw * 0.5, dh * 0.3, 0.012], [0, dh * 0.16, 0.026], brass, 0.004);
    const pull = new THREE.Mesh(new THREE.TorusGeometry(dh * 0.11, dh * 0.022, 8, 20, Math.PI), brass);
    pull.rotation.z = Math.PI;
    pull.position.set(0, -dh * 0.18, 0.05);
    pull.castShadow = true;
    drawer.add(pull);
    drawers.push(drawer);
  }
  return {
    kind: 'catalog',
    id: 'catalog',
    group,
    hitTargets: [group],
    drawers,
    emissiveTargets,
    pull: 0,
    pullTarget: 0,
    open: 0
  };
}

function bookGeometry(w, h, d) {
  return new RoundedBoxGeometry(w, h, d, 2, Math.min(0.035, w * 0.09));
}

function makeBook(root, spec, profile, seed, real) {
  const { w, h, d } = spec;
  const spineW = real ? Math.max(128, profile.spine * 2) : profile.spine;
  const spineH = Math.round(spineW * h / w);
  const spineBaked = real ? paintTitledSpine(spec, spineW, spineH, seed) : paintPlainSpine(spec, spineW, spineH, seed);
  const spineMat = leatherMaterial(spineBaked, { emissive: new THREE.Color(0, 0, 0) });

  let coverMat, coverBaked = null;
  if (real) {
    const cw = profile.cover / 2;
    coverBaked = paintCover(spec, cw, Math.round(cw * h / d));
    coverMat = leatherMaterial(coverBaked, { emissive: new THREE.Color(0, 0, 0) });
  } else {
    coverMat = leatherMaterial(paintPlainCover(spec.leather, 128));
  }
  const backMat = real ? leatherMaterial(paintPlainCover(spec.leather, 256)) : coverMat;
  const pagesTex = toTexture(paintPages(), true);
  const pagesMat = new THREE.MeshStandardMaterial({ map: pagesTex, roughness: 0.95 });

  const mesh = new THREE.Mesh(bookGeometry(w, h, d), [coverMat, backMat, pagesMat, pagesMat, spineMat, pagesMat]);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  const group = new THREE.Group();
  group.add(mesh);
  root.add(group);
  return { group, mesh, spineMat, coverMat };
}

function buildBooks(root, profile, books) {
  const items = [];
  const r = seeded(2026);
  const pick = (arr) => arr[Math.floor(r() * arr.length)];
  let seedCounter = 1;

  for (let shelf = 1; shelf <= 4; shelf++) {
    for (let bay = 0; bay < 2; bay++) {
      const [left, rightEdge] = BAYS[bay];
      const right = shelf === 1 && bay === 1 ? rightEdge - 1.72 : rightEdge;
      const top = SHELF_TOP[shelf - 1];
      const maxH = (SHELF_Y[shelf] - 0.11) - top - 0.06;
      const reals = books.filter((b) => b.shelf === shelf && b.bay === bay).sort((a, b) => a.slot - b.slot);
      let x = left + 0.02 + r() * 0.06;
      let slot = 0;
      let set = null;
      let lastH = 1;

      while (true) {
        const real = reals.find((b) => b.slot === slot);
        if (real) {
          const spec = { ...real, ...real.size };
          if (x + spec.w > right) break;
          const item = placeUpright(root, spec, profile, seedCounter++, true, x, top);
          item.kind = 'book';
          item.data = real;
          items.push(item);
          x += spec.w + 0.012;
          lastH = spec.h;
          slot++;
          set = null;
          continue;
        }
        const remaining = right - x;
        const realsLeft = reals.some((b) => b.slot > slot);

        if (!realsLeft && remaining < 1.25 && remaining > 0.5) {
          const ending = r();
          if (ending < 0.3) {
            placeBookend(root, x + 0.03, top);
          } else if (ending < 0.65 && remaining > 1.05) {
            placeStack(root, items, profile, x, right, top, r, pick, () => seedCounter++);
          } else {
            placeLeaning(root, items, profile, x, right, top, lastH, maxH, r, pick, () => seedCounter++);
          }
          break;
        }
        if (remaining < 0.36) break;

        if (!set && r() < 0.22) {
          const n = 3 + Math.floor(r() * 2);
          set = {
            left: n,
            n,
            leather: pick(LEATHERS),
            w: 0.36 + r() * 0.08,
            h: Math.min(maxH, 0.98 + r() * 0.22),
            d: 0.64 + r() * 0.1,
            style: r() < 0.6 ? 'label' : 'bands',
            gilt: true
          };
          set.inlay = shade(set.leather, -0.55);
        }
        let spec;
        if (set) {
          spec = { ...set, volume: ROMAN[set.n - set.left] };
          set.left--;
          if (set.left <= 0) set = null;
        } else {
          const leather = pick(LEATHERS);
          spec = {
            leather,
            inlay: r() < 0.5 ? shade(leather, -0.6) : pick(['#1b1414', '#4a1a17', '#1f2a1e']),
            w: 0.32 + r() * 0.2,
            h: Math.min(maxH, 0.92 + r() * 0.34),
            d: 0.6 + r() * 0.16,
            style: r() < 0.45 ? 'bands' : r() < 0.55 ? 'label' : 'cloth',
            gilt: r() < 0.55
          };
        }
        if (x + spec.w > right) break;
        const item = placeUpright(root, spec, profile, seedCounter++, false, x, top);
        item.kind = 'empty';
        items.push(item);
        x += spec.w + 0.008 + (r() < 0.12 ? 0.04 + r() * 0.1 : 0);
        lastH = spec.h;
        slot++;
      }
    }
  }
  return items;
}

function placeUpright(root, spec, profile, seed, real, x, top) {
  const { group, mesh, spineMat, coverMat } = makeBook(root, spec, profile, seed, real);
  const jitter = real ? 0 : (seeded(seed)() - 0.5) * 0.05;
  group.position.set(x + spec.w / 2, top + spec.h / 2, SPINE_Z - spec.d / 2 + jitter);
  return finishItem(group, mesh, spineMat, coverMat, spec);
}

function finishItem(group, mesh, spineMat, coverMat, spec) {
  return {
    id: spec.id || null,
    group,
    mesh,
    hitTargets: [mesh],
    spineMat,
    coverMat,
    spec,
    basePos: group.position.clone(),
    baseQuat: group.quaternion.clone(),
    pull: 0,
    pullTarget: 0,
    wiggle: 0
  };
}

/* Латунный упор, когда ряд кончается без стопки и без наклонной книги. */
let bookendMat = null;
function placeBookend(root, x, top) {
  if (!bookendMat) bookendMat = new THREE.MeshStandardMaterial({ color: '#9a7440', roughness: 0.35, metalness: 1 });
  const g = new THREE.Group();
  g.position.set(x, top, SPINE_Z - 0.34);
  box(g, [0.04, 0.78, 0.5], [0.02, 0.39, 0], bookendMat, 0.01);
  box(g, [0.3, 0.025, 0.5], [0.17, 0.012, 0], bookendMat, 0.008);
  root.add(g);
}

/* Последняя книга в ряду опирается на соседку: стоит на нижнем левом углу. */
function placeLeaning(root, items, profile, x, right, top, lastH, maxH, r, pick, nextSeed) {
  const leather = pick(LEATHERS);
  const spec = { leather, inlay: shade(leather, -0.6), w: 0.36 + r() * 0.08, h: Math.min(maxH - 0.05, 0.95 + r() * 0.2), d: 0.62 + r() * 0.1, style: pick(['bands', 'label', 'cloth']), gilt: r() < 0.5 };
  const a = 0.16 + r() * 0.1;
  // верхний левый угол не должен залезать на соседку выше её высоты
  const x0 = x + spec.h * Math.sin(a) + 0.004;
  if (x0 + spec.w * Math.cos(a) > right) return;
  const { group, mesh, spineMat, coverMat } = makeBook(root, spec, profile, nextSeed(), false);
  const cx = x0 + (spec.w / 2) * Math.cos(a) - (spec.h / 2) * Math.sin(a);
  const cy = top + (spec.w / 2) * Math.sin(a) + (spec.h / 2) * Math.cos(a);
  group.position.set(cx, cy, SPINE_Z - spec.d / 2);
  group.rotation.z = a;
  const item = finishItem(group, mesh, spineMat, coverMat, spec);
  item.kind = 'empty';
  items.push(item);
}

/* Стопка лежащих книг в конце ряда, корешками к нам. */
function placeStack(root, items, profile, x, right, top, r, pick, nextSeed) {
  const n = 2 + Math.floor(r() * 2);
  let y = top;
  const maxLen = Math.min(right - x - 0.06, 1.1);
  for (let i = 0; i < n; i++) {
    const leather = pick(LEATHERS);
    const len = maxLen - i * (0.04 + r() * 0.05);
    const spec = { leather, inlay: shade(leather, -0.6), w: 0.18 + r() * 0.12, h: len, d: 0.6 + r() * 0.12, style: pick(['bands', 'cloth']), gilt: r() < 0.5 };
    const { group, mesh, spineMat, coverMat } = makeBook(root, spec, profile, nextSeed(), false);
    group.rotation.z = Math.PI / 2;
    group.position.set(x + 0.04 + maxLen / 2 + (r() - 0.5) * 0.05, y + spec.w / 2, SPINE_Z - spec.d / 2 - r() * 0.04);
    group.rotation.y = (r() - 0.5) * 0.06;
    y += spec.w + 0.002;
    const item = finishItem(group, mesh, spineMat, coverMat, spec);
    item.kind = 'stack';
    items.push(item);
  }
}

/* Торшер справа от шкафа: главный тёплый свет комнаты. */
function buildFloorLamp(root) {
  const g = new THREE.Group();
  g.position.set(5.75, 0, 0.1);
  root.add(g);
  const brass = new THREE.MeshStandardMaterial({ color: '#8c6a3a', roughness: 0.35, metalness: 1 });
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.58, 0.1, 32), brass);
  base.position.y = 0.05;
  base.castShadow = true;
  g.add(base);
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.04, 5.2, 12), brass);
  stem.position.y = 2.7;
  stem.castShadow = true;
  g.add(stem);
  const profile = [
    new THREE.Vector2(0.95, 0), new THREE.Vector2(0.9, 0.08), new THREE.Vector2(0.55, 1.05), new THREE.Vector2(0.5, 1.12)
  ];
  const shadeMat = new THREE.MeshStandardMaterial({ color: '#c08a52', roughness: 0.9, side: THREE.DoubleSide, emissive: new THREE.Color('#ff9a4a'), emissiveIntensity: 0 });
  const lampShade = new THREE.Mesh(new THREE.LatheGeometry(profile, 40), shadeMat);
  lampShade.position.y = 5.1;
  g.add(lampShade);
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.16, 16, 12), new THREE.MeshBasicMaterial({ color: '#ffd9a0' }));
  bulb.position.y = 5.35;
  g.add(bulb);
  const light = new THREE.PointLight('#ffa65a', 0, 0, 2);
  light.position.set(5.75, 5.3, 0.3);
  root.add(light);

  const state = { level: 0, target: 1, flicker: 0 };
  return {
    light,
    shadeMat,
    state,
    update(dt, t, power) {
      const f = state.flicker > 0 ? (Math.sin(t * 61) > 0.2 ? 1 : 0.25) : 1;
      state.flicker = Math.max(0, state.flicker - dt);
      const level = power * f;
      light.intensity = 26 * level;
      shadeMat.emissiveIntensity = 0.55 * level;
      bulb.material.color.setRGB(1 * level + 0.05, 0.85 * level + 0.04, 0.62 * level + 0.03);
    }
  };
}

/* Столик слева: чашка чая с паром. Знак библиотеки: присядь и почитай. */
function buildTeaTable(root, woodCanvas, profile) {
  const g = new THREE.Group();
  g.position.set(-5.75, 0, 1.8);
  root.add(g);
  const wood = woodMaterial(woodCanvas, 1, 1, false, '#b0805a', 0.45);
  const top = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 0.95, 0.08, 40), wood);
  top.position.y = 2.0;
  top.castShadow = top.receiveShadow = true;
  g.add(top);
  const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.1, 1.95, 16), wood);
  leg.position.y = 1.0;
  leg.castShadow = true;
  g.add(leg);
  const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.55, 0.06, 32), wood);
  foot.position.y = 0.03;
  g.add(foot);

  const porcelain = new THREE.MeshStandardMaterial({ color: '#efe6d6', roughness: 0.22, metalness: 0 });
  const saucer = new THREE.Mesh(new THREE.LatheGeometry([
    new THREE.Vector2(0, 0), new THREE.Vector2(0.36, 0.0), new THREE.Vector2(0.44, 0.04), new THREE.Vector2(0.45, 0.055), new THREE.Vector2(0.36, 0.03), new THREE.Vector2(0, 0.03)
  ], 40), porcelain);
  saucer.position.set(0.15, 2.04, 0.2);
  saucer.castShadow = true;
  g.add(saucer);
  const cupProfile = [
    new THREE.Vector2(0, 0.03), new THREE.Vector2(0.13, 0.03), new THREE.Vector2(0.15, 0.05), new THREE.Vector2(0.2, 0.18),
    new THREE.Vector2(0.24, 0.34), new THREE.Vector2(0.245, 0.36), new THREE.Vector2(0.225, 0.36), new THREE.Vector2(0.22, 0.34),
    new THREE.Vector2(0.18, 0.18), new THREE.Vector2(0.12, 0.07), new THREE.Vector2(0, 0.07)
  ];
  const cup = new THREE.Mesh(new THREE.LatheGeometry(cupProfile, 40), porcelain);
  cup.position.set(0.15, 2.05, 0.2);
  cup.castShadow = true;
  g.add(cup);
  const handle = new THREE.Mesh(new THREE.TorusGeometry(0.085, 0.022, 10, 24, Math.PI * 1.25), porcelain);
  handle.position.set(0.15 + 0.25, 2.05 + 0.22, 0.2);
  handle.rotation.z = -Math.PI * 0.62;
  g.add(handle);
  const tea = new THREE.Mesh(new THREE.CircleGeometry(0.21, 32), new THREE.MeshStandardMaterial({ color: '#4a2208', roughness: 0.08 }));
  tea.rotation.x = -Math.PI / 2;
  tea.position.set(0.15, 2.05 + 0.31, 0.2);
  g.add(tea);
  // книга под рукой на столике
  const lying = new THREE.Mesh(bookGeometry(0.16, 0.9, 0.62), new THREE.MeshStandardMaterial({ color: '#2c3a2c', roughness: 0.7 }));
  lying.rotation.set(0, 0.5, Math.PI / 2);
  lying.position.set(-0.35, 2.04 + 0.08, -0.1);
  lying.castShadow = true;
  g.add(lying);

  const dot = toTexture(paintSoftDot(), true);
  const puffs = [];
  for (let i = 0; i < profile.steam; i++) {
    const m = new THREE.Sprite(new THREE.SpriteMaterial({ map: dot, color: '#fff3e0', transparent: true, opacity: 0, depthWrite: false }));
    m.userData.phase = i / profile.steam;
    m.userData.drift = (seeded(i + 40)() - 0.5) * 0.3;
    g.add(m);
    puffs.push(m);
  }
  const origin = new THREE.Vector3(0.15, 2.05 + 0.36, 0.2);
  return {
    update(dt, t) {
      for (const p of puffs) {
        const life = (t * 0.16 + p.userData.phase) % 1;
        const sway = Math.sin(t * 0.9 + p.userData.phase * 9) * 0.06 * life;
        p.position.set(origin.x + sway + p.userData.drift * life, origin.y + life * 1.1, origin.z + sway * 0.5);
        const s = 0.12 + life * 0.42;
        p.scale.set(s, s, s);
        p.material.opacity = Math.sin(life * Math.PI) * 0.16;
      }
    }
  };
}

function buildDust(root, count) {
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(count * 3);
  const seedsArr = new Float32Array(count);
  const r = seeded(77);
  for (let i = 0; i < count; i++) {
    pos[i * 3] = -5 + r() * 10;
    pos[i * 3 + 1] = 0.6 + r() * 6.8;
    pos[i * 3 + 2] = 0.6 + r() * 3.4;
    seedsArr[i] = r() * 100;
  }
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const mat = new THREE.PointsMaterial({
    size: 0.035,
    map: toTexture(paintSoftDot(32), true),
    color: '#ffd8a8',
    transparent: true,
    opacity: 0.55,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    sizeAttenuation: true
  });
  const points = new THREE.Points(geo, mat);
  root.add(points);
  const base = pos.slice();
  return {
    points,
    update(dt, t) {
      if (!points.visible) return;
      for (let i = 0; i < count; i++) {
        const s = seedsArr[i];
        pos[i * 3] = base[i * 3] + Math.sin(t * 0.07 + s) * 0.35;
        pos[i * 3 + 1] = base[i * 3 + 1] + Math.sin(t * 0.05 + s * 1.7) * 0.25 - ((t * 0.02 + s) % 1) * 0.1;
        pos[i * 3 + 2] = base[i * 3 + 2] + Math.cos(t * 0.06 + s * 0.6) * 0.3;
      }
      geo.attributes.position.needsUpdate = true;
    }
  };
}
