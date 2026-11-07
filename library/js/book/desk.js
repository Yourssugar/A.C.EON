/* Стол под книгой: столешница, кожаный бювар, настольная лампа, свет.
   Масштаб стола: страница книги 5.12 единиц, это ~24 см, единица ~4.7 см. */

import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/RoundedBoxGeometry.js';
import { paintWood, toTexture, leatherGrain, seeded } from '../textures.js';

export const BLOTTER_TOP = 0.06;

function woodTop() {
  const canvas = paintWood({ size: 512, seed: 31, dark: '#140a05', light: '#4a2a16', rings: 6, planks: 3 });
  const map = toTexture(canvas, true);
  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  map.center.set(0.5, 0.5);
  map.rotation = Math.PI / 2;
  map.repeat.set(2.2, 3);
  return new THREE.MeshStandardMaterial({ map, roughness: 0.5, metalness: 0, color: '#d8b090' });
}

/* Бювар: зелёная кожа с золотым тиснёным бордюром. */
function blotterMaterial() {
  const W = 1024, H = 760;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#1f3326';
  ctx.fillRect(0, 0, W, H);
  ctx.save();
  ctx.globalCompositeOperation = 'overlay';
  ctx.globalAlpha = 0.6;
  ctx.fillStyle = ctx.createPattern(leatherGrain(), 'repeat');
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
  const vg = ctx.createRadialGradient(W / 2, H / 2, W * 0.2, W / 2, H / 2, W * 0.7);
  vg.addColorStop(0, 'rgba(255,240,210,0.04)');
  vg.addColorStop(1, 'rgba(0,0,0,0.35)');
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = 'rgba(200,160,90,0.55)';
  ctx.lineWidth = 3;
  ctx.strokeRect(W * 0.03, H * 0.04, W * 0.94, H * 0.92);
  ctx.lineWidth = 1.5;
  ctx.strokeRect(W * 0.04, H * 0.055, W * 0.92, H * 0.89);
  // потёртость там, где обычно лежат руки
  const r = seeded(9);
  for (let i = 0; i < 260; i++) {
    ctx.fillStyle = `rgba(255,240,210,${0.015 + r() * 0.03})`;
    ctx.beginPath();
    ctx.ellipse(W * (0.3 + r() * 0.4), H * (0.65 + r() * 0.3), 4 + r() * 30, 2 + r() * 8, r() * 3, 0, Math.PI * 2);
    ctx.fill();
  }
  return new THREE.MeshStandardMaterial({ map: toTexture(c, true), roughness: 0.62, metalness: 0 });
}

export function buildDesk(scene, profile, colors) {
  const shadows = profile.shadows;
  const group = new THREE.Group();
  scene.add(group);

  const top = new THREE.Mesh(new THREE.BoxGeometry(34, 0.8, 22), woodTop());
  top.position.y = -0.4;
  top.receiveShadow = true;
  group.add(top);

  const blotter = new THREE.Mesh(new RoundedBoxGeometry(10.8, BLOTTER_TOP, 7.6, 2, 0.02), blotterMaterial());
  blotter.position.set(0, BLOTTER_TOP / 2, 0.25);
  blotter.receiveShadow = true;
  group.add(blotter);
  // латунные уголки бювара
  const brass = new THREE.MeshStandardMaterial({ color: '#a27c45', roughness: 0.3, metalness: 1 });
  for (const [x, z] of [[-5.4, -3.55], [5.4, -3.55], [-5.4, 4.05], [5.4, 4.05]]) {
    const corner = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, BLOTTER_TOP + 0.02, 3, 1, false, 0, Math.PI * 2), brass);
    corner.position.set(x, BLOTTER_TOP / 2, z);
    corner.rotation.y = Math.atan2(-z, -x) + Math.PI / 3;
    corner.castShadow = shadows;
    group.add(corner);
  }

  const lamp = buildLamp(group, colors.lamp, profile);

  const hemi = new THREE.HemisphereLight(colors.ambient, '#050302', 0.55);
  scene.add(hemi);
  // холодная подсветка справа, чтобы тени не проваливались в черноту
  const fill = new THREE.DirectionalLight('#8aa0c0', 0.25);
  fill.position.set(12, 8, 6);
  scene.add(fill);

  return { group, lamp, hemi, fill };
}

/* Настольная лампа на шарнирах слева сверху. Свет бьёт в книгу. */
function buildLamp(parent, color, profile) {
  const g = new THREE.Group();
  parent.add(g);
  const enamel = new THREE.MeshStandardMaterial({ color: '#2a3328', roughness: 0.45, metalness: 0.3 });
  const steel = new THREE.MeshStandardMaterial({ color: '#8d8a80', roughness: 0.3, metalness: 1 });
  const v = (x, y) => new THREE.Vector2(x, y);

  const B = new THREE.Vector3(-7.4, 0, -4.6);
  const J = new THREE.Vector3(-7.1, 5.4, -4.2);
  const H = new THREE.Vector3(-3.7, 6.6, -2.4);
  const target = new THREE.Vector3(0.6, 0, 0.4);

  const base = new THREE.Mesh(new THREE.LatheGeometry([v(0, 0), v(1.5, 0), v(1.55, 0.1), v(1.35, 0.32), v(0.5, 0.42), v(0.32, 0.62), v(0, 0.64)], 48), enamel);
  base.position.copy(B);
  g.add(base);

  const rod = (a, b, r) => {
    const len = a.distanceTo(b);
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 14), steel);
    m.position.copy(a).add(b).multiplyScalar(0.5);
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
    g.add(m);
  };
  rod(B.clone().setY(0.6), J, 0.11);
  rod(J, H, 0.09);
  // пружины вдоль плеча, без них лампа выглядит пластмассовой
  const springOff = new THREE.Vector3(0.22, 0.05, 0.05);
  rod(B.clone().setY(1.2).add(springOff), J.clone().add(springOff).addScaledVector(new THREE.Vector3(0, -1, 0), 0.8), 0.035);
  for (const p of [J, H]) {
    const knuckle = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 12), steel);
    knuckle.position.copy(p);
    g.add(knuckle);
  }

  const head = new THREE.Group();
  head.position.copy(H);
  head.lookAt(target);
  g.add(head);
  const shadeGeo = new THREE.LatheGeometry([v(0.35, 0.6), v(0.45, 0.35), v(1.1, -0.65), v(1.22, -0.9), v(1.18, -0.92), v(1.05, -0.66), v(0.42, 0.3), v(0.3, 0.55)], 48);
  shadeGeo.rotateX(-Math.PI / 2);
  const shade = new THREE.Mesh(shadeGeo, enamel);
  shade.castShadow = true;
  head.add(shade);
  const innerMat = new THREE.MeshStandardMaterial({ color: '#d9cfb8', roughness: 0.6, side: THREE.BackSide, emissive: new THREE.Color(color), emissiveIntensity: 0 });
  const inner = new THREE.Mesh(new THREE.ConeGeometry(1.08, 1.3, 40, 1, true), innerMat);
  inner.rotation.x = Math.PI / 2;
  inner.position.z = 0.1;
  head.add(inner);
  const bulbMat = new THREE.MeshBasicMaterial({ color: '#2a2018' });
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.34, 20, 14), bulbMat);
  bulb.position.z = 0.45;
  head.add(bulb);

  const light = new THREE.SpotLight(color, 0, 0, 0.7, 0.8, 2);
  light.position.copy(H).addScaledVector(target.clone().sub(H).normalize(), 0.6);
  light.target.position.copy(target);
  light.castShadow = profile.shadows;
  light.shadow.mapSize.set(profile.shadowSize, profile.shadowSize);
  light.shadow.bias = -0.0002;
  light.shadow.normalBias = 0.03;
  light.shadow.camera.near = 2;
  light.shadow.camera.far = 18;
  parent.add(light, light.target);
  // тёплый отсвет от абажура вокруг самой лампы
  const glow = new THREE.PointLight(color, 0, 9, 2);
  glow.position.copy(H).add(new THREE.Vector3(0.4, -0.8, 0.4));
  parent.add(glow);

  const warm = new THREE.Color(color);
  const dark = new THREE.Color('#2a2018');
  return {
    light,
    set(level) {
      light.intensity = 210 * level;
      glow.intensity = 6 * level;
      innerMat.emissiveIntensity = 0.9 * level;
      bulbMat.color.copy(dark).lerp(warm, Math.min(1, level * 1.2));
    }
  };
}
