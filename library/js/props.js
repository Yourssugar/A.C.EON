/* Общие предметы библиотеки. Чашка чая стоит и у шкафа, и на каждом столе. */

import * as THREE from 'three';
import { seeded, toTexture, paintSoftDot } from './textures.js';

/* Чашка на блюдце с паром. scale 1 = масштаб шкафа (единица ~25 см).
   Возвращает группу (её дно в нуле) и update(dt, t) для пара. */
export function buildTea({ scale = 1, steam = 12, shadows = true } = {}) {
  const g = new THREE.Group();
  const porcelain = new THREE.MeshStandardMaterial({ color: '#efe6d6', roughness: 0.22, metalness: 0 });
  const rim = new THREE.MeshStandardMaterial({ color: '#b48a4a', roughness: 0.3, metalness: 1 });
  const v = (x, y) => new THREE.Vector2(x, y);
  const saucer = new THREE.Mesh(new THREE.LatheGeometry([
    v(0, 0), v(0.36, 0), v(0.44, 0.04), v(0.45, 0.055), v(0.36, 0.03), v(0, 0.03)
  ], 48), porcelain);
  g.add(saucer);
  const cup = new THREE.Mesh(new THREE.LatheGeometry([
    v(0, 0.03), v(0.13, 0.03), v(0.15, 0.05), v(0.2, 0.18), v(0.24, 0.34), v(0.245, 0.36),
    v(0.225, 0.36), v(0.22, 0.34), v(0.18, 0.18), v(0.12, 0.07), v(0, 0.07)
  ], 48), porcelain);
  g.add(cup);
  // золотая кромка по краю чашки
  const lip = new THREE.Mesh(new THREE.TorusGeometry(0.236, 0.006, 6, 48), rim);
  lip.rotation.x = Math.PI / 2;
  lip.position.y = 0.36;
  g.add(lip);
  const handle = new THREE.Mesh(new THREE.TorusGeometry(0.085, 0.022, 10, 24, Math.PI * 1.25), porcelain);
  handle.position.set(0.25, 0.22, 0);
  handle.rotation.z = -Math.PI * 0.62;
  g.add(handle);
  const tea = new THREE.Mesh(new THREE.CircleGeometry(0.21, 40), new THREE.MeshStandardMaterial({ color: '#4a2208', roughness: 0.06 }));
  tea.rotation.x = -Math.PI / 2;
  tea.position.y = 0.31;
  g.add(tea);
  g.traverse((o) => { if (o.isMesh) o.castShadow = o.receiveShadow = shadows; });
  g.scale.setScalar(scale);

  const dot = toTexture(paintSoftDot(), true);
  const puffs = [];
  for (let i = 0; i < steam; i++) {
    const m = new THREE.Sprite(new THREE.SpriteMaterial({ map: dot, color: '#fff3e0', transparent: true, opacity: 0, depthWrite: false }));
    m.userData.phase = i / steam;
    m.userData.drift = (seeded(i + 40)() - 0.5) * 0.3;
    g.add(m);
    puffs.push(m);
  }
  return {
    group: g,
    update(dt, t) {
      for (const p of puffs) {
        const life = (t * 0.16 + p.userData.phase) % 1;
        const sway = Math.sin(t * 0.9 + p.userData.phase * 9) * 0.06 * life;
        p.position.set(sway + p.userData.drift * life, 0.36 + life * 1.1, sway * 0.5);
        const s = 0.12 + life * 0.42;
        p.scale.set(s, s, s);
        p.material.opacity = Math.sin(life * Math.PI) * 0.16;
      }
    }
  };
}

/* Пыль, медленно плавающая в луче света. box: [x0, y0, z0, x1, y1, z1]. */
export function buildDust(count, box, size = 0.035) {
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(count * 3);
  const phase = new Float32Array(count);
  const r = seeded(77);
  for (let i = 0; i < count; i++) {
    pos[i * 3] = box[0] + r() * (box[3] - box[0]);
    pos[i * 3 + 1] = box[1] + r() * (box[4] - box[1]);
    pos[i * 3 + 2] = box[2] + r() * (box[5] - box[2]);
    phase[i] = r() * 100;
  }
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const points = new THREE.Points(geo, new THREE.PointsMaterial({
    size,
    map: toTexture(paintSoftDot(32), true),
    color: '#ffd8a8',
    transparent: true,
    opacity: 0.55,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  }));
  const base = pos.slice();
  const amp = (box[3] - box[0]) * 0.035;
  return {
    points,
    update(dt, t) {
      if (!points.visible) return;
      for (let i = 0; i < count; i++) {
        const s = phase[i];
        pos[i * 3] = base[i * 3] + Math.sin(t * 0.07 + s) * amp;
        pos[i * 3 + 1] = base[i * 3 + 1] + Math.sin(t * 0.05 + s * 1.7) * amp * 0.7;
        pos[i * 3 + 2] = base[i * 3 + 2] + Math.cos(t * 0.06 + s * 0.6) * amp * 0.85;
      }
      geo.attributes.position.needsUpdate = true;
    }
  };
}
