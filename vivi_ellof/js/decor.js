/* Стены лаборатории, процедурная часть: полосы опасности (canvas), кабельный лоток с проводами,
   решётки вентиляции, аварийные лампы. Плакаты, доски, дверь, щиты и прочее нарисовал Кодекс,
   они расставлены в js/props.js.
   Левая стена x = LEFT, смотрит в комнату (+x); правая x = RIGHT, смотрит в -x.

   buildDecor(THREE, ROOM, FLOOR) -> { root, alarms: [меши аварийных ламп] } */

export function buildDecor(THREE, ROOM, FLOOR) {
  const { LEFT, RIGHT, BACK, CEIL } = ROOM;
  const F = FLOOR;
  const root = new THREE.Group();

  function canvasTex(w, h, draw) {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const x = c.getContext('2d');
    draw(x, w, h);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    return t;
  }
  const M = (c, o) => new THREE.MeshStandardNodeMaterial(Object.assign({ color: c, roughness: 0.6, metalness: 0.3 }, o || {}));
  const metal = M(0x2a2e33, { roughness: 0.4, metalness: 0.85 });
  const dark = M(0x15171a, { roughness: 0.5, metalness: 0.7 });

  /* предмет на стене: side -1 левая стена, +1 правая. z вдоль стены, y высота от пола */
  function onWall(mesh, side, z, y, out) {
    const x = side < 0 ? LEFT + (out || 0.02) : RIGHT - (out || 0.02);
    mesh.position.set(x, F + y, z);
    mesh.rotation.y = side < 0 ? Math.PI / 2 : -Math.PI / 2;
    root.add(mesh);
    return mesh;
  }
  function panel(w, h, tex, rough) {
    const m = new THREE.MeshStandardNodeMaterial({ map: tex, roughness: rough || 0.7, metalness: 0.05 });
    return new THREE.Mesh(new THREE.PlaneGeometry(w, h), m);
  }

  /* ---------- рисунки на canvas ---------- */
  const stripes = canvasTex(512, 64, (x, w, h) => {
    x.fillStyle = '#d6a21e'; x.fillRect(0, 0, w, h);
    x.fillStyle = '#161616';
    for (let i = -2; i < 16; i++) { x.beginPath(); x.moveTo(i * 48, h); x.lineTo(i * 48 + 24, h); x.lineTo(i * 48 + 24 + h, 0); x.lineTo(i * 48 + h, 0); x.fill(); }
    x.fillStyle = 'rgba(0,0,0,.35)'; for (let i = 0; i < 300; i++) x.fillRect(Math.random() * w, Math.random() * h, 2 + Math.random() * 6, 1 + Math.random() * 2);
  });
  stripes.wrapS = THREE.RepeatWrapping;

  /* ---------- левая стена (стойки стоят у неё с z = 9 по 13) ---------- */
  const band = (side, z0, z1) => {
    const len = z1 - z0;
    const t = stripes.clone(); t.needsUpdate = true; t.repeat.set(len / 1.6, 1); t.wrapS = THREE.RepeatWrapping;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(len, 0.22), new THREE.MeshStandardNodeMaterial({ map: t, roughness: 0.8 }));
    onWall(m, side, (z0 + z1) / 2, 0.35, 0.015);
  };
  band(-1, 0, 8.4); band(1, 0, 14);

  /* кабельный лоток под потолком вдоль левой стены, из него свисают провода */
  const tray = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.12, 14), dark); tray.position.set(LEFT + 0.4, CEIL - 0.6, 6.5); root.add(tray);
  const cableM = M(0x0d0e10, { roughness: 0.6, metalness: 0.2 });
  for (let i = 0; i < 6; i++) {
    const z = 1 + i * 2.2 + Math.random();
    const pts = [new THREE.Vector3(LEFT + 0.4, CEIL - 0.6, z), new THREE.Vector3(LEFT + 0.55, CEIL - 1.4 - Math.random(), z + 0.3), new THREE.Vector3(LEFT + 0.45, CEIL - 0.6, z + 0.9)];
    const c = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 16, 0.025, 6), cableM); root.add(c);
  }

  /* решётки вентиляции */
  function vent(side, z, y) {
    const g = new THREE.Group();
    const fr = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.6, 0.08), metal); g.add(fr);
    for (let i = 0; i < 6; i++) { const s = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.04, 0.06), dark); s.position.set(0, -0.24 + i * 0.096, 0.04); s.rotation.x = 0.6; g.add(s); }
    onWall(g, side, z, y, 0.05);
  }
  vent(-1, 6.6, 4.6); vent(1, 9.6, 4.7);

  /* ---------- аварийные лампы: красные колпаки, их пульс задаёт rift.js вместе со светом ---------- */
  const alarms = [];
  const alarmM = new THREE.MeshStandardNodeMaterial({ color: 0x3a0608, emissive: 0xff1a24, emissiveIntensity: 1, roughness: 0.3 });
  [[-1, 3.2], [-1, 8.0], [1, 5.6], [1, 12.6]].forEach(([side, z]) => {
    const g = new THREE.Group();
    const base = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.12, 0.14), dark); g.add(base);
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.11, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), alarmM); cap.position.y = 0.06; g.add(cap);
    onWall(g, side, z, 5.0, 0.12);
    alarms.push(g);
  });

  return { root, alarms, alarmM };
}
