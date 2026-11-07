/* Предметы на столе механика: манометр, шестерни, ключ гаечный, наряды, ключ от двери, карандаш.
   Каждый предмет: функция(профиль) -> { group, update? }. Место на столе задаётся в PLACES. */

import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/RoundedBoxGeometry.js';
import { toTexture, seeded } from '../textures.js';
import { buildTea } from '../props.js';
import { BLOTTER_TOP } from './desk.js';

const brass = () => new THREE.MeshStandardMaterial({ color: '#b08848', roughness: 0.32, metalness: 1 });
const darkSteel = () => new THREE.MeshStandardMaterial({ color: '#5d605e', roughness: 0.38, metalness: 1 });
const oldIron = () => new THREE.MeshStandardMaterial({ color: '#3c3a36', roughness: 0.55, metalness: 0.9 });

function shadowAll(group, on) {
  group.traverse((o) => { if (o.isMesh) o.castShadow = o.receiveShadow = on; });
}

function flatExtrude(shape, depth, bevel = 0.03) {
  const geo = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 2, curveSegments: 28 });
  geo.rotateX(-Math.PI / 2);
  return geo;
}

/* Циферблат манометра: шкала 0-16, красная зона, надписи. */
function paintDial() {
  const S = 512, c = document.createElement('canvas');
  c.width = c.height = S;
  const ctx = c.getContext('2d');
  const cx = S / 2;
  const g = ctx.createRadialGradient(cx, cx * 0.9, S * 0.05, cx, cx, S * 0.5);
  g.addColorStop(0, '#efe6cf');
  g.addColorStop(1, '#c9bc98');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(cx, cx, S * 0.5, 0, Math.PI * 2);
  ctx.fill();
  const a0 = Math.PI * 0.75, a1 = Math.PI * 2.25;
  const ang = (v) => a0 + (a1 - a0) * (v / 16);
  ctx.strokeStyle = '#8c1d16';
  ctx.lineWidth = S * 0.035;
  ctx.beginPath();
  ctx.arc(cx, cx, S * 0.39, ang(13), ang(16));
  ctx.stroke();
  ctx.strokeStyle = '#1b1510';
  for (let i = 0; i <= 80; i++) {
    const v = i / 5;
    const a = ang(v);
    const major = i % 10 === 0, mid = i % 5 === 0;
    const r1 = S * 0.42, r0 = r1 - S * (major ? 0.07 : mid ? 0.05 : 0.028);
    ctx.lineWidth = major ? 4 : mid ? 2.5 : 1.2;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * r0, cx + Math.sin(a) * r0);
    ctx.lineTo(cx + Math.cos(a) * r1, cx + Math.sin(a) * r1);
    ctx.stroke();
  }
  ctx.fillStyle = '#1b1510';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `600 ${S * 0.065}px "PT Sans", Arial, sans-serif`;
  for (let v = 0; v <= 16; v += 2) {
    const a = ang(v), r = S * 0.29;
    ctx.fillText(String(v), cx + Math.cos(a) * r, cx + Math.sin(a) * r);
  }
  ctx.font = `700 ${S * 0.045}px "PT Sans", Arial, sans-serif`;
  ctx.fillText('кгс/см²', cx, cx + S * 0.15);
  ctx.font = `700 ${S * 0.04}px "PT Sans", Arial, sans-serif`;
  ctx.fillStyle = '#6a1712';
  ctx.fillText('СЕКЦИЯ 19', cx, cx - S * 0.16);
  ctx.fillStyle = 'rgba(27,21,16,0.6)';
  ctx.font = `400 ${S * 0.03}px "PT Sans", Arial, sans-serif`;
  ctx.fillText('№ 0419', cx, cx + S * 0.22);
  return c;
}

function gauge() {
  const g = new THREE.Group();
  const R = 0.95;
  const body = new THREE.Mesh(new THREE.CylinderGeometry(R, R * 1.02, 0.42, 48), brass());
  body.position.y = 0.21;
  g.add(body);
  const bezel = new THREE.Mesh(new THREE.TorusGeometry(R * 0.97, 0.07, 12, 56), brass());
  bezel.rotation.x = Math.PI / 2;
  bezel.position.y = 0.44;
  g.add(bezel);
  const dial = new THREE.Mesh(new THREE.CircleGeometry(R * 0.9, 48), new THREE.MeshStandardMaterial({ map: toTexture(paintDial(), true), roughness: 0.7 }));
  dial.rotation.x = -Math.PI / 2;
  dial.position.y = 0.425;
  g.add(dial);
  const needlePivot = new THREE.Group();
  needlePivot.position.y = 0.45;
  g.add(needlePivot);
  const needle = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.012, R * 0.78), new THREE.MeshStandardMaterial({ color: '#1a1a1a', roughness: 0.4, metalness: 0.6 }));
  needle.position.z = -R * 0.3;
  needlePivot.add(needle);
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.04, 16), brass());
  hub.position.y = 0.46;
  g.add(hub);
  const glass = new THREE.Mesh(new THREE.CircleGeometry(R * 0.93, 48), new THREE.MeshPhysicalMaterial({ color: '#ffffff', roughness: 0.04, metalness: 0, transparent: true, opacity: 0.12, clearcoat: 1 }));
  glass.rotation.x = -Math.PI / 2;
  glass.position.y = 0.49;
  g.add(glass);
  // штуцер с гайкой, которым манометр сняли с трубы
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.7, 16), brass());
  stem.rotation.z = Math.PI / 2;
  stem.position.set(R + 0.3, 0.2, 0);
  g.add(stem);
  const nut = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.22, 6), darkSteel());
  nut.rotation.z = Math.PI / 2;
  nut.position.set(R + 0.6, 0.2, 0);
  g.add(nut);

  // стрелка не стоит на месте: давление в Машине никогда не ровное
  const a0 = Math.PI * 0.75, a1 = Math.PI * 2.25;
  return {
    group: g,
    update(dt, t) {
      const v = 9.6 + Math.sin(t * 0.7) * 0.5 + Math.sin(t * 5.3) * 0.08 + Math.sin(t * 13) * 0.03;
      const a = a0 + (a1 - a0) * (v / 16);
      // на холсте угол идёт по часовой от +x, у стрелки ноль смотрит в -z
      needlePivot.rotation.y = -(a + Math.PI / 2);
    }
  };
}

function gearShape(rOut, rRoot, teeth, hole, windows) {
  const s = new THREE.Shape();
  const step = (Math.PI * 2) / teeth;
  for (let i = 0; i < teeth; i++) {
    const a = i * step;
    const pts = [[rRoot, a], [rOut, a + step * 0.18], [rOut, a + step * 0.46], [rRoot, a + step * 0.64]];
    pts.forEach(([r, ang], k) => {
      const x = Math.cos(ang) * r, y = Math.sin(ang) * r;
      if (i === 0 && k === 0) s.moveTo(x, y);
      else s.lineTo(x, y);
    });
  }
  s.closePath();
  const h = new THREE.Path();
  h.absarc(0, 0, hole, 0, Math.PI * 2, true);
  s.holes.push(h);
  for (let i = 0; i < windows; i++) {
    const a = (i / windows) * Math.PI * 2;
    const r = (rRoot + hole) / 2;
    const w = new THREE.Path();
    w.absarc(Math.cos(a) * r, Math.sin(a) * r, (rRoot - hole) * 0.28, 0, Math.PI * 2, true);
    s.holes.push(w);
  }
  return s;
}

function gears() {
  const g = new THREE.Group();
  const big = new THREE.Mesh(flatExtrude(gearShape(1.45, 1.25, 20, 0.22, 5), 0.18), brass());
  g.add(big);
  const small = new THREE.Mesh(flatExtrude(gearShape(0.82, 0.66, 12, 0.16, 0), 0.16), oldIron());
  small.position.set(1.15, 0.24, 1.05);
  small.rotation.set(0.05, 0.4, 0.06);
  g.add(small);
  const axle = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.5, 16), darkSteel());
  axle.position.y = 0.2;
  g.add(axle);
  return { group: g };
}

function wrench() {
  const g = new THREE.Group();
  const steel = darkSteel();
  const shaft = new THREE.Mesh(new RoundedBoxGeometry(3.4, 0.13, 0.4, 2, 0.05), steel);
  shaft.position.y = 0.08;
  g.add(shaft);
  const ring = new THREE.Shape();
  ring.absarc(0, 0, 0.55, 0, Math.PI * 2, false);
  const hex = new THREE.Path();
  for (let i = 0; i <= 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    if (i === 0) hex.moveTo(Math.cos(a) * 0.3, Math.sin(a) * 0.3);
    else hex.lineTo(Math.cos(a) * 0.3, Math.sin(a) * 0.3);
  }
  ring.holes.push(hex);
  const ringMesh = new THREE.Mesh(flatExtrude(ring, 0.1, 0.03), steel);
  ringMesh.position.set(-1.9, 0.02, 0);
  g.add(ringMesh);
  const jaw = new THREE.Shape();
  const o = 0.62, i = 0.3, open = 0.62;
  jaw.absarc(0, 0, o, open, Math.PI * 2 - open, false);
  jaw.lineTo(Math.cos(-open) * i, Math.sin(-open) * i);
  jaw.absarc(0, 0, i, Math.PI * 2 - open, open, true);
  jaw.closePath();
  const jawMesh = new THREE.Mesh(flatExtrude(jaw, 0.1, 0.03), steel);
  jawMesh.position.set(1.95, 0.02, 0);
  g.add(jawMesh);
  return { group: g };
}

/* Наряд на смену: текст из первой главы. */
function paintCard(first) {
  const W = 512, H = 336, c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const ctx = c.getContext('2d');
  ctx.fillStyle = first ? '#e2d6b6' : '#d6c8a4';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = 'rgba(140,60,50,0.4)';
  ctx.fillRect(0, 54, W, 2);
  ctx.fillStyle = 'rgba(60,80,120,0.18)';
  for (let y = 86; y < H - 12; y += 30) ctx.fillRect(16, y, W - 32, 1);
  if (!first) return c;
  ctx.fillStyle = '#2b2118';
  ctx.font = '700 26px "Courier New", monospace';
  ctx.fillText('НАРЯД НА СМЕНУ', 22, 38);
  ctx.font = '400 20px "Courier New", monospace';
  const lines = ['Группа: «Север»', 'Участки: 7 - 21', 'Механик: Й. Восс', 'Сектор: 19'];
  lines.forEach((l, k) => ctx.fillText(l, 24, 80 + k * 30));
  ctx.save();
  ctx.translate(W - 150, H - 80);
  ctx.rotate(-0.18);
  ctx.strokeStyle = 'rgba(150,30,25,0.7)';
  ctx.lineWidth = 4;
  ctx.strokeRect(-110, -34, 220, 68);
  ctx.fillStyle = 'rgba(150,30,25,0.75)';
  ctx.font = '700 22px "PT Sans", Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('НЕ ПРЕРЫВАЙТЕ', 0, -6);
  ctx.fillText('ЦЕПЬ', 0, 20);
  ctx.restore();
  return c;
}

function cards() {
  const g = new THREE.Group();
  const r = seeded(19);
  const plain = new THREE.MeshStandardMaterial({ map: toTexture(paintCard(false), true), roughness: 0.9 });
  const top = new THREE.MeshStandardMaterial({ map: toTexture(paintCard(true), true), roughness: 0.9 });
  const edge = new THREE.MeshStandardMaterial({ color: '#cbbd98', roughness: 0.95 });
  const n = 7;
  for (let i = 0; i < n; i++) {
    const face = i === n - 1 ? top : plain;
    const card = new THREE.Mesh(new THREE.BoxGeometry(2.9, 0.02, 1.9), [edge, edge, face, edge, edge, edge]);
    card.position.set((r() - 0.5) * 0.14, 0.012 + i * 0.022, (r() - 0.5) * 0.12);
    card.rotation.y = (r() - 0.5) * 0.12;
    g.add(card);
  }
  const band = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.18, 1.96), new THREE.MeshStandardMaterial({ color: '#6c1d19', roughness: 0.6 }));
  band.position.set(0.85, 0.08, 0);
  g.add(band);
  return { group: g };
}

function doorKey() {
  const g = new THREE.Group();
  const m = brass();
  const bow = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.075, 12, 32), m);
  bow.rotation.x = Math.PI / 2;
  bow.position.y = 0.075;
  g.add(bow);
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.065, 1.7, 12), m);
  shaft.rotation.z = Math.PI / 2;
  shaft.position.set(1.17, 0.075, 0);
  g.add(shaft);
  const bit1 = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.09, 0.38), m);
  bit1.position.set(1.85, 0.075, 0.2);
  g.add(bit1);
  const bit2 = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.09, 0.26), m);
  bit2.position.set(1.6, 0.075, 0.14);
  g.add(bit2);
  return { group: g };
}

function pencil() {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 3.2, 6), new THREE.MeshStandardMaterial({ color: '#3d2b1c', roughness: 0.5 }));
  body.rotation.z = Math.PI / 2;
  body.position.y = 0.1;
  g.add(body);
  const wood = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.36, 6), new THREE.MeshStandardMaterial({ color: '#d2a878', roughness: 0.8 }));
  wood.rotation.z = -Math.PI / 2;
  wood.position.set(1.78, 0.1, 0);
  g.add(wood);
  const lead = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.1, 6), new THREE.MeshStandardMaterial({ color: '#222', roughness: 0.4, metalness: 0.4 }));
  lead.rotation.z = -Math.PI / 2;
  lead.position.set(1.98, 0.1, 0);
  g.add(lead);
  return { group: g };
}

const MAKERS = { gauge, gears, wrench, cards, key: doorKey, pencil };

/* x, z, поворот вокруг вертикали. Книга занимает примерно x -3.9..3.9, z -2.7..2.7. */
const PLACES = {
  gauge: [5.3, -2.3, 0.4],
  gears: [5.1, 1.2, 0.3],
  pencil: [3.9, 3.55, 0.12],
  wrench: [-0.8, -3.55, -0.08],
  cards: [-5.6, 2.35, 0.22],
  key: [-6.3, 2.1, 0.35],
  tea: [-5.5, -1.3, 0.8]
};

export function buildProps(scene, names, profile) {
  const updaters = [];
  for (const name of names) {
    const place = PLACES[name];
    if (!place) continue;
    let made;
    if (name === 'tea') made = buildTea({ scale: 2.7, steam: profile.steam, shadows: profile.shadows });
    else if (MAKERS[name]) made = MAKERS[name](profile);
    else continue;
    const [x, z, rot] = place;
    // всё, что стоит на бюваре, поднимаем на его толщину
    const onBlotter = Math.abs(x) < 5.4 && z > -3.55 && z < 4.05;
    let y = onBlotter ? BLOTTER_TOP : 0;
    // ключ лежит поверх стопки нарядов
    if (name === 'key' && names.includes('cards')) y = BLOTTER_TOP + 0.17;
    made.group.position.set(x, y, z);
    made.group.rotation.y += rot;
    if (name !== 'tea') shadowAll(made.group, profile.shadows);
    scene.add(made.group);
    if (made.update) updaters.push(made.update);
  }
  return updaters;
}
