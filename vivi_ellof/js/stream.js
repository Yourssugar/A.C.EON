/* Загрузка по взгляду: в памяти видеокарты полная текстура только у того, что сейчас крупно в кадре.
   У каждой картинки две версии: props/lo/<имя>.webp (256, листы 512) и props/<имя>.webp (полная).
   При входе грузятся только малые. Раз в 0,3 с проверка каждого набора: если какая-то его вырезка
   в кадре и занимает на экране больше ~110 пикселей, в фоне грузится полная и подменяется в шейдере
   (значение texture-узла, без перекомпиляции). Полная, которая не нужна дольше 20 с, выгружается.
   Не больше budget полных одновременно (лишние выгружаются, начиная с давно не нужных),
   не больше двух загрузок сразу.

   createStream(THREE, { cam, load, budget }) ->
     { preload(names), node(name, uvNode?), attach(name, mesh, size), update(dt), ready(), los(), stats() } */

export function createStream(THREE, opts) {
  const { cam, load } = opts;
  const budget = opts.budget || 20;
  const T = THREE.TSL;
  const A = new Map();
  const fr = new THREE.Frustum(), pm = new THREE.Matrix4(), sph = new THREE.Sphere(), v = new THREE.Vector3();
  let acc = 0, loading = 0;
  const pending = [];

  function asset(name) {
    let a = A.get(name);
    if (!a) {
      a = { name, lo: null, hi: null, nodes: [], meshes: [], want: false, idle: 0, busy: false, loP: null };
      a.loP = load('props/lo/' + name + '.webp').then((t) => { a.lo = t; a.nodes.forEach((n) => { if (!a.hi) n.value = t; }); return t; });
      A.set(name, a);
    }
    return a;
  }

  /* TSL-узел текстуры этого набора; uvNode для кусочков листа */
  function node(name, uvNode) {
    const a = asset(name);
    const n = uvNode ? T.texture(a.lo || dummy(), uvNode) : T.texture(a.lo || dummy());
    a.nodes.push(n);
    return n;
  }
  let dummyT = null;
  function dummy() {
    if (!dummyT) { dummyT = new THREE.DataTexture(new Uint8Array([0, 0, 0, 0]), 1, 1); dummyT.needsUpdate = true; }
    return dummyT;
  }

  /* mesh показывает этот набор; size: размер вырезки в метрах (по длинной стороне) */
  function attach(name, mesh, size) {
    const a = asset(name);
    a.meshes.push({ mesh, size });
  }

  function swapIn(a, t) { a.hi = t; a.nodes.forEach((n) => { n.value = t; }); }
  function swapOut(a) {
    if (!a.hi) return;
    const t = a.hi; a.hi = null;
    if (a.lo) a.nodes.forEach((n) => { n.value = a.lo; });
    t.dispose();
    if (t.image && t.image.close) try { t.image.close(); } catch (e) {}
  }

  function pump() {
    while (loading < 2 && pending.length) {
      const a = pending.shift();
      if (!a.want || a.hi) { a.busy = false; continue; }
      loading++;
      load('props/' + a.name + '.webp').then((t) => {
        loading--; a.busy = false;
        if (a.want && !a.hi) swapIn(a, t); else t.dispose();
        pump();
      }).catch(() => { loading--; a.busy = false; pump(); });
    }
  }

  function update(dt) {
    acc += dt;
    if (acc < 0.3) return;
    const step = acc; acc = 0;
    cam.updateMatrixWorld();
    pm.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse);
    fr.setFromProjectionMatrix(pm);
    const px = innerHeight / (2 * Math.tan(THREE.MathUtils.degToRad(cam.fov) / 2));
    const live = [];
    A.forEach((a) => {
      let best = 0;
      a.meshes.forEach(({ mesh, size }) => {
        if (!mesh.visible && !(mesh.parent && mesh.parent.visible)) return;
        mesh.getWorldPosition(v);
        sph.set(v, size * 0.6);
        if (!fr.intersectsSphere(sph)) return;
        const d = Math.max(0.5, v.distanceTo(cam.position));
        best = Math.max(best, size * px / d);
      });
      a.want = best > 110;
      a.score = best;
      if (a.want) {
        a.idle = 0;
        if (!a.hi && !a.busy) { a.busy = true; pending.push(a); }
      } else if (a.hi) {
        a.idle += step;
        if (a.idle > 20) swapOut(a);
      }
      if (a.hi) live.push(a);
    });
    /* бюджет: лишние полные выгружаем, начиная с ненужных и мелких */
    if (live.length > budget) {
      live.sort((x, y) => (x.want - y.want) || (x.score - y.score));
      for (let i = 0; i < live.length - budget; i++) swapOut(live[i]);
    }
    pending.sort((x, y) => y.score - x.score);
    pump();
  }

  return {
    node, attach, update,
    /* заранее завести наборы и дождаться малых копий: узлы сразу получат настоящую текстуру */
    preload(names) { return Promise.all(names.map((n) => asset(n).loP.catch(() => null))); },
    ready() { return Promise.all([...A.values()].map((a) => a.loP.catch(() => null))); },
    los() { return [...A.values()].map((a) => a.lo).filter(Boolean); },
    stats() { let hi = 0; A.forEach((a) => { if (a.hi) hi++; }); return { assets: A.size, hi, loading }; }
  };
}
