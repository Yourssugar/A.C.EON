/* Предметы и люди, застывшие в момент взрыва. Пока не расшифрованы, глаз видит их символами
   (материал пишет в канал amask, js/ascii.js рисует вместо них знаки). Расшифровка: навести курсор
   и замереть, прогресс копится и сохраняется. Расшифрованный предмет остаётся настоящим навсегда
   (localStorage), при наведении подпись, по клику описание или воспоминание.

   У каждой детали две сетки на одной геометрии: настоящая и символьная. Обе компилируются заранее,
   при расшифровке меняется только видимость, поэтому без подвисаний.

   Люди: рисунки Кодекса (people/*.webp), плоские вырезки, повёрнутые к дальней точке камеры.
   Символьная версия той же картинки: вместо пикселей знаки. Расшифрованный предмет виден нормально,
   но пока на нём луч Архитектора, он снова из символов (look).
   Подписи и тексты: заглушки. Кот и вещи пока из примитивов, рисунки впереди.
   Ещё здесь мелочь, застывшая в воздухе: обрывки бумаги, винты, капли, крошка, без расшифровки.

   buildItems(THREE, FLOOR, people) -> { root, list, showBoth(), apply(open), flicker(i, p), look(i, on) }
   list[i]: { id, kind, act ('desc' | 'memory'), mem ('true' | 'trap' | 'arch' | null), pos, label{ru,en}, text{ru,en}, rpx } */

export const ITEMS = [
  /* люди: застыли кто как успел */
  { id: 'w1', kind: 'worker', act: 'desc', pose: 'reach', pos: [-6.4, 0, 3.4], ry: 0.9,
    label: { ru: 'сотрудник Л-07', en: 'staff L-07' },
    text: { ru: 'Тянулся к пульту аварийной остановки. Не успел на полсекунды.', en: 'Reaching for the emergency stop. Half a second too late.' } },
  { id: 'w2', kind: 'worker', act: 'desc', pose: 'shield', pos: [4.6, 0, 4.8], ry: -2.2,
    label: { ru: 'сотрудница Л-12', en: 'staff L-12' },
    text: { ru: 'Закрыла лицо рукой и отвернулась от вспышки.', en: 'Covered her face and turned away from the flash.' } },
  { id: 'w3', kind: 'worker', act: 'desc', pose: 'fall', pos: [-3.0, 0, 6.8], ry: 2.6,
    label: { ru: 'дежурный инженер', en: 'engineer on duty' },
    text: { ru: 'Падает назад. Ноги ещё на решётке, плечи уже в воздухе.', en: 'Falling backwards. Feet still on the grate, shoulders already in the air.' } },

  /* вещи с воспоминаниями: одно настоящее (Виви), три ловушки, три воспоминания Архитектора */
  { id: 'm1', kind: 'book', act: 'memory', mem: 'true', pos: [-2.2, 1.0, 7.4], rot: [0.5, 0.8, 0.3],
    label: { ru: 'журнал наблюдений', en: 'observation log' },
    text: { ru: 'Последняя запись оборвана на середине слова.', en: 'The last entry stops mid-word.' } },
  { id: 'm2', kind: 'phone', act: 'memory', mem: 'trap', pos: [2.4, 0.4, 7.8], rot: [1.1, 0.4, 2.2],
    label: { ru: 'телефон', en: 'phone' },
    text: { ru: 'На экране неотправленное сообщение.', en: 'An unsent message on the screen.' } },
  { id: 'm3', kind: 'photo', act: 'memory', mem: 'trap', pos: [-4.3, 1.4, 6.7], rot: [0.2, 1.2, -0.4],
    label: { ru: 'фотография в рамке', en: 'framed photo' },
    text: { ru: 'Стекло треснуло ровно по лицу.', en: 'The glass cracked right across the face.' } },
  { id: 'm4', kind: 'cat', act: 'memory', mem: 'trap', pos: [3.3, -0.6, 7.5], rot: [0.1, -1.0, 0.2],
    label: { ru: 'кот', en: 'cat' },
    text: { ru: 'Прыгнул со стойки за миг до вспышки. Так и висит в прыжке.', en: 'Jumped off the rack a moment before the flash. Still mid-leap.' } },
  { id: 'm5', kind: 'clock', act: 'memory', mem: 'arch', pos: [-4.6, 2.5, 4.7], rot: [0, 0.9, 0.2],
    label: { ru: 'часы', en: 'clock' },
    text: { ru: 'Стрелки стоят. Секундная дрожит на месте.', en: 'The hands have stopped. The second hand trembles in place.' } },
  { id: 'm6', kind: 'badge', act: 'memory', mem: 'arch', pos: [0.96, 2.08, 8.1], rot: [0.3, -0.5, 0.9],
    label: { ru: 'пропуск', en: 'badge' },
    text: { ru: 'Имя стёрто. Остался только уровень доступа.', en: 'The name is scratched out. Only the clearance level is left.' } },
  { id: 'm7', kind: 'headphones', act: 'memory', mem: 'arch', pos: [3.6, 2.0, 2.6], rot: [0.8, 0.3, -0.6],
    label: { ru: 'наушники', en: 'headphones' },
    text: { ru: 'В одном ещё играет звук. Слишком тихо, чтобы разобрать.', en: 'One side is still playing. Too quiet to make out.' } },

  /* просто вещи */
  { id: 'd1', kind: 'mug', act: 'desc', pos: [-4.0, -0.6, 5.2], rot: [0.5, 0.2, 0.9],
    label: { ru: 'кружка', en: 'mug' },
    text: { ru: 'Кофе вылетел из кружки и застыл лентой.', en: 'The coffee left the mug and froze in a ribbon.' } },
  { id: 'd2', kind: 'papers', act: 'desc', pos: [0.4, 1.5, 4.4], rot: [0, 0, 0],
    label: { ru: 'листы протокола', en: 'protocol sheets' },
    text: { ru: 'Протокол эксперимента. Страницы разлетелись не по порядку.', en: 'Experiment protocol. The pages scattered out of order.' } }
];

export function buildItems(THREE, FLOOR, people) {
  people = people || {};
  const T = THREE.TSL;
  const { vec3, float, mrt, sin, time, positionWorld, texture } = T;

  /* символьный материал один на всех: холодное мерцание, маска 0.9 */
  const symMat = new THREE.MeshStandardNodeMaterial({ color: 0x0, roughness: 0.4 });
  symMat.emissiveNode = vec3(0.5, 0.75, 1.0).mul(sin(time.mul(1.3).add(positionWorld.y.mul(4))).mul(0.2).add(0.8)).mul(0.9);
  symMat.mrtNode = mrt({ amask: float(0.9) });

  const M = (c, o) => new THREE.MeshStandardNodeMaterial(Object.assign({ color: c, roughness: 0.6, metalness: 0.05 }, o || {}));
  const mat = {
    coat: M(0xc9ccd0, { roughness: 0.85 }), skin: M(0xb48a74, { roughness: 0.7 }), dark: M(0x24272d, { roughness: 0.5 }),
    hair: M(0x2a2018, { roughness: 0.9 }), trousers: M(0x3a404a, { roughness: 0.8 }), boot: M(0x16171a),
    screen: M(0x050608, { emissive: 0x5fb6ff, emissiveIntensity: 1.2 }), body: M(0x111215, { roughness: 0.3, metalness: 0.4 }),
    paper: M(0xe6e1d6, { roughness: 0.95, side: THREE.DoubleSide }), cover: M(0x5a2a22, { roughness: 0.7 }),
    frame: M(0x6b4a2e, { roughness: 0.6 }), photo: M(0x8c8a84, { emissive: 0x2a2622, emissiveIntensity: 0.5 }),
    fur: M(0x3b3530, { roughness: 1 }), eyeC: M(0x0, { emissive: 0xc8d27a, emissiveIntensity: 2 }),
    clockF: M(0xdcd8cc, { roughness: 0.5 }), metal: M(0x8a9099, { roughness: 0.35, metalness: 0.8 }),
    card: M(0xd8dde4, { roughness: 0.5 }), strap: M(0xb8333d, { roughness: 0.8 }), cushion: M(0x1c1d20, { roughness: 0.9 }),
    ceramic: M(0xe9e6e0, { roughness: 0.35 }), coffee: M(0x2b1a10, { roughness: 0.15, metalness: 0.1 })
  };

  const root = new THREE.Group();
  const list = [];

  function part(g, geo, m, pos, rot, scl) {
    const real = new THREE.Mesh(geo, m);
    const sym = new THREE.Mesh(geo, symMat);
    [real, sym].forEach((x) => {
      if (pos) x.position.set(...pos); if (rot) x.rotation.set(...rot); if (scl) x.scale.set(...scl);
      g.add(x);
    });
    g.userData.real.push(real); g.userData.sym.push(sym);
    return real;
  }
  const cap = (r, l) => new THREE.CapsuleGeometry(r, l, 4, 10);
  const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
  const cyl = (a, b, h, s) => new THREE.CylinderGeometry(a, b, h, s || 16);
  const sph = (r, s) => new THREE.SphereGeometry(r, s || 16, Math.max(8, (s || 16) * 0.75 | 0));

  /* человек: торс, голова, руки и ноги из капсул, суставы задаются позой */
  function worker(g, pose) {
    const P = {
      reach: { lean: 0.35, armL: [-1.9, 0, 0.2], foreL: -0.2, armR: [-0.6, 0, -0.3], foreR: -1.2, legL: -0.4, legR: 0.3, head: -0.2 },
      shield: { lean: -0.2, armL: [-2.6, 0, 0.5], foreL: -2.2, armR: [0.4, 0, -0.5], foreR: -0.4, legL: 0.25, legR: -0.35, head: 0.4 },
      fall: { lean: -0.75, armL: [-2.4, 0, 0.9], foreL: -0.5, armR: [-2.2, 0, -1.0], foreR: -0.6, legL: -0.6, legR: -0.1, head: 0.5 }
    }[pose];
    const hip = new THREE.Group(); hip.position.y = 0.98; g.add(hip);
    hip.userData = g.userData;
    const torso = new THREE.Group(); torso.rotation.x = P.lean; hip.add(torso); torso.userData = g.userData;
    part(torso, cap(0.2, 0.48), mat.coat, [0, 0.42, 0], null, [1, 1, 0.7]);
    part(torso, cyl(0.06, 0.07, 0.12), mat.skin, [0, 0.83, 0]);
    const head = new THREE.Group(); head.position.y = 0.98; head.rotation.x = P.head; torso.add(head); head.userData = g.userData;
    part(head, sph(0.12), mat.skin, [0, 0.04, 0], null, [0.9, 1.1, 1]);
    part(head, sph(0.125), mat.hair, [0, 0.09, -0.02], null, [0.95, 0.85, 1]);
    [['L', -1], ['R', 1]].forEach(([s, k]) => {
      const sh = new THREE.Group(); sh.position.set(0.25 * k, 0.72, 0); sh.rotation.set(...P['arm' + s]); torso.add(sh); sh.userData = g.userData;
      part(sh, cap(0.06, 0.26), mat.coat, [0, -0.17, 0]);
      const el = new THREE.Group(); el.position.y = -0.34; el.rotation.x = P['fore' + s]; sh.add(el); el.userData = g.userData;
      part(el, cap(0.05, 0.24), mat.coat, [0, -0.15, 0]);
      part(el, sph(0.05, 10), mat.skin, [0, -0.33, 0], null, [0.8, 1.2, 0.5]);
      const lg = new THREE.Group(); lg.position.set(0.11 * k, 0, 0); lg.rotation.x = P['leg' + s]; hip.add(lg); lg.userData = g.userData;
      part(lg, cap(0.08, 0.36), mat.trousers, [0, -0.24, 0]);
      const kn = new THREE.Group(); kn.position.y = -0.48; kn.rotation.x = 0.25; lg.add(kn); kn.userData = g.userData;
      part(kn, cap(0.065, 0.36), mat.trousers, [0, -0.22, 0]);
      part(kn, box(0.11, 0.08, 0.26), mat.boot, [0, -0.46, 0.06]);
    });
    /* лабораторный халат ниже пояса */
    part(hip, cyl(0.2, 0.27, 0.5, 14), mat.coat, [0, -0.2, 0], null, [1, 1, 0.75]);
  }

  const build = {
    phone(g) {
      part(g, box(0.075, 0.155, 0.009), mat.body);
      part(g, box(0.068, 0.142, 0.002), mat.screen, [0, 0, 0.005]);
    },
    book(g) {
      [-1, 1].forEach((k) => {
        part(g, box(0.16, 0.23, 0.012), mat.cover, [k * 0.075, 0, 0], [0, k * 0.35, 0]);
        part(g, box(0.15, 0.22, 0.02), mat.paper, [k * 0.07, 0, 0.012], [0, k * 0.35, 0]);
      });
      for (let i = 0; i < 3; i++) part(g, new THREE.PlaneGeometry(0.15, 0.22), mat.paper, [0.02 + i * 0.01, 0, 0.04 + i * 0.03], [0, -1.2 + i * 0.5, 0]);
    },
    photo(g) {
      part(g, box(0.24, 0.3, 0.02), mat.frame);
      part(g, new THREE.PlaneGeometry(0.19, 0.25), mat.photo, [0, 0, 0.011]);
    },
    cat(g) {
      part(g, cap(0.1, 0.32), mat.fur, [0, 0, 0], [0, 0, Math.PI / 2 - 0.2]);
      part(g, sph(0.09), mat.fur, [0.27, 0.1, 0]);
      [-1, 1].forEach((k) => {
        part(g, new THREE.ConeGeometry(0.03, 0.07, 6), mat.fur, [0.29, 0.19, k * 0.04]);
        part(g, sph(0.012, 6), mat.eyeC, [0.35, 0.12, k * 0.035]);
        part(g, cap(0.025, 0.2), mat.fur, [0.2, -0.04, k * 0.06], [0, 0, 1.2]);    /* передние лапы вытянуты вперёд */
        part(g, cap(0.03, 0.22), mat.fur, [-0.22, -0.06, k * 0.06], [0, 0, -1.1]); /* задние оттолкнулись */
      });
      part(g, cap(0.02, 0.34), mat.fur, [-0.38, 0.1, 0], [0, 0, -0.6]);
    },
    clock(g) {
      part(g, cyl(0.22, 0.22, 0.05, 32), mat.metal, null, [Math.PI / 2, 0, 0]);
      part(g, cyl(0.2, 0.2, 0.052, 32), mat.clockF, [0, 0, 0.003], [Math.PI / 2, 0, 0]);
      part(g, box(0.012, 0.13, 0.004), mat.dark, [0.03, 0.05, 0.03], [0, 0, -0.6]);
      part(g, box(0.016, 0.09, 0.004), mat.dark, [-0.035, 0.02, 0.032], [0, 0, 1.0]);
    },
    badge(g) {
      part(g, box(0.09, 0.13, 0.004), mat.card);
      part(g, box(0.06, 0.03, 0.005), mat.strap, [0, -0.035, 0]);
      part(g, new THREE.TorusGeometry(0.2, 0.006, 6, 32, Math.PI * 1.3), mat.strap, [0, 0.25, 0], [0, 0, -0.65]);
    },
    headphones(g) {
      part(g, new THREE.TorusGeometry(0.13, 0.014, 8, 32, Math.PI), mat.dark);
      [-1, 1].forEach((k) => part(g, cyl(0.055, 0.055, 0.04, 20), mat.cushion, [k * 0.13, -0.02, 0], [0, 0, Math.PI / 2]));
    },
    mug(g) {
      part(g, cyl(0.05, 0.045, 0.11, 20), mat.ceramic);
      part(g, new THREE.TorusGeometry(0.03, 0.009, 6, 16), mat.ceramic, [0.055, 0, 0], [0, 0, 0]);
      for (let i = 0; i < 7; i++) part(g, sph(0.018 + Math.random() * 0.02, 8), mat.coffee, [-0.02 - i * 0.04, 0.07 + Math.sin(i * 0.8) * 0.05, i * 0.01], null, [1.6, 0.7, 0.9]);
    },
    papers(g) {
      for (let i = 0; i < 6; i++) {
        part(g, new THREE.PlaneGeometry(0.21, 0.3), mat.paper,
          [Math.sin(i * 2.1) * 0.9, Math.cos(i * 1.7) * 0.45, Math.sin(i * 3.3) * 0.6], [Math.random() * 2, Math.random() * 3, Math.random() * 1.5]);
      }
    }
  };
  /* масштаб для видимости с дальней точки: вещи чуть крупнее жизни */
  const SC = { phone: 1.8, book: 1.6, photo: 1.6, cat: 1.4, clock: 1.6, badge: 1.8, headphones: 1.7, mug: 1.8, papers: 1, worker: 1 };
  const RPX = { worker: 0.09, papers: 0.07, cat: 0.05 };

  /* человек с рисунка: вырезка 1 x 2 м, ноги на полу */
  const CAM = { x: 0.6, z: 16.5 };
  function cutout(g, tx, it) {
    const map = texture(tx);
    const rm = new THREE.MeshBasicNodeMaterial({ alphaTest: 0.45, side: THREE.DoubleSide });
    rm.colorNode = map.rgb.mul(0.92);
    rm.opacityNode = map.a;
    const sm = new THREE.MeshBasicNodeMaterial({ alphaTest: 0.45, side: THREE.DoubleSide });
    const lum = map.r.mul(0.3).add(map.g.mul(0.59)).add(map.b.mul(0.11));
    sm.colorNode = vec3(0.5, 0.75, 1.0).mul(lum.mul(1.4).add(0.25)).mul(sin(time.mul(1.3).add(positionWorld.y.mul(4))).mul(0.15).add(0.85));
    sm.opacityNode = map.a;
    sm.mrtNode = mrt({ amask: float(0.9) });
    const geo = new THREE.PlaneGeometry(1, 2);
    geo.translate(0, 1, 0);
    const real = new THREE.Mesh(geo, rm), sym = new THREE.Mesh(geo, sm);
    g.add(real, sym);
    g.userData.real.push(real); g.userData.sym.push(sym);
    g.position.set(it.pos[0], FLOOR + it.pos[1], it.pos[2]);
    g.rotation.y = Math.atan2(CAM.x - it.pos[0], CAM.z - it.pos[2]);
  }
  const PPL = { reach: people.reach, shield: people.shield, fall: people.fall };

  ITEMS.forEach((it) => {
    const g = new THREE.Group();
    g.userData = { real: [], sym: [] };
    if (it.kind === 'worker' && PPL[it.pose]) cutout(g, PPL[it.pose], it);
    else if (it.kind === 'worker') {
      worker(g, it.pose);
      g.position.set(it.pos[0], FLOOR + it.pos[1], it.pos[2]);
      g.rotation.y = it.ry || 0;
      if (it.pose === 'fall') g.rotation.x = -0.25;
    } else {
      build[it.kind](g);
      g.position.set(...it.pos);
      if (it.rot) g.rotation.set(...it.rot);
    }
    g.scale.setScalar(SC[it.kind] || 1);
    root.add(g);
    /* точка, по которой ищется предмет под курсором: у человека грудь */
    const at = new THREE.Vector3().copy(g.position);
    if (it.kind === 'worker') at.y += 1.3;
    list.push(Object.assign({}, it, { group: g, at, rpx: RPX[it.kind] || 0.04 }));
  });

  /* мелочь в воздухе: застыла вместе со всем */
  {
    const rnd = (a, b) => a + Math.random() * (b - a);
    const dummy = new THREE.Object3D();
    const kinds = [
      { geo: new THREE.PlaneGeometry(0.07, 0.05), mat: M(0xd9d3c6, { roughness: 1, side: THREE.DoubleSide }), n: 70 },     /* обрывки бумаги */
      { geo: new THREE.CylinderGeometry(0.008, 0.008, 0.05, 6), mat: mat.metal, n: 40 },                                    /* винты */
      { geo: new THREE.DodecahedronGeometry(0.03, 0), mat: M(0x5d5a56, { roughness: 1 }), n: 60 },                          /* крошка бетона */
      { geo: new THREE.SphereGeometry(0.014, 8, 6), mat: M(0x9fb6c4, { roughness: 0.05, metalness: 0.2 }), n: 50 },         /* капли воды */
      { geo: new THREE.BoxGeometry(0.02, 0.004, 0.08), mat: M(0x2b2e33, { roughness: 0.6 }), n: 24 }                        /* щепки пластика */
    ];
    kinds.forEach((k) => {
      const im = new THREE.InstancedMesh(k.geo, k.mat, k.n);
      for (let i = 0; i < k.n; i++) {
        /* гуще ближе к пролому справа: всё летит от взрыва */
        const x = Math.random() < 0.55 ? rnd(1, 9) : rnd(-9, 6);
        dummy.position.set(x, rnd(FLOOR + 0.4, 4.6), rnd(1.2, 12));
        dummy.rotation.set(rnd(0, 6.3), rnd(0, 6.3), rnd(0, 6.3));
        dummy.scale.setScalar(rnd(0.6, 1.8));
        dummy.updateMatrix(); im.setMatrixAt(i, dummy.matrix);
      }
      im.frustumCulled = false;
      root.add(im);
    });
  }

  function setVis(it, realOn) {
    it.realOn = realOn;
    it.group.userData.real.forEach((m) => { m.visible = realOn; });
    it.group.userData.sym.forEach((m) => { m.visible = !realOn; });
  }
  let openNow = [];
  return {
    root, list,
    /* луч Архитектора на расшифрованном: на это время снова символы */
    look(i, on) {
      const it = list[i];
      if (!it || openNow.indexOf(it.id) < 0) return;
      if (on === !it.realOn) return;
      setVis(it, !on);
    },
    /* для компиляции: обе версии видимы */
    showBoth() { list.forEach((it) => { it.group.userData.real.forEach((m) => { m.visible = true; }); it.group.userData.sym.forEach((m) => { m.visible = true; }); }); },
    apply(open) { openNow = open.slice(); list.forEach((it) => setVis(it, open.indexOf(it.id) >= 0 && !it.inLook)); },
    /* пока держишь курсор: деталь за деталью проступает настоящая, вразнобой мигая */
    flicker(i, p) {
      const it = list[i]; if (!it) return;
      const u = it.group.userData;
      u.real.forEach((m, j) => {
        const thr = Math.abs(Math.sin(j * 12.9898) * 43758.5453) % 1;   /* у каждой детали свой порог */
        const on = p > thr * 0.85 ? Math.random() < 0.92 : Math.random() < p * 0.35;
        m.visible = on; u.sym[j].visible = !on;
      });
    }
  };
}
