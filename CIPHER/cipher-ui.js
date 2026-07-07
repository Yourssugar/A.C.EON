// ============================================================
// A.C.EON // CIPHER — UI
// Глобали из cipher-engine.js: OPS, encode, decodeParts, PREFIX, SEP
// ============================================================

// ---------- переиспользуемый конструктор конвейера ----------
function createPipeline(cfg) {
  const steps = [];
  function buildPalette() {
    const grps = {};
    for (const id in OPS) { if (cfg.exclude && cfg.exclude.includes(id)) continue; (grps[OPS[id].grp] = grps[OPS[id].grp] || []).push(id); }
    const el = document.getElementById(cfg.paletteId); el.innerHTML = "";
    for (const g in grps) {
      const lab = document.createElement("div"); lab.className = "grp-label"; lab.textContent = g; el.appendChild(lab);
      const row = document.createElement("div"); row.className = "palette";
      grps[g].forEach(id => {
        const b = document.createElement("button"); b.className = "op"; b.textContent = OPS[id].name;
        if (OPS[id].desc) b.setAttribute("data-desc", OPS[id].desc);
        b.onclick = () => addStep(id); row.appendChild(b);
      });
      el.appendChild(row);
    }
  }
  function addStep(id) { const op = OPS[id]; const st = { id }; if (op.param) st.p = op.pdefault; steps.push(st); render(); }
  function move(i, d) { const j = i + d; if (j < 0 || j >= steps.length) return;[steps[i], steps[j]] = [steps[j], steps[i]]; render(); }
  function remove(i) { steps.splice(i, 1); render(); }
  function setParam(i, val) { const op = OPS[steps[i].id]; steps[i].p = op.param === "num" ? (parseInt(val, 10) || 0) : val; }
  function render() {
    const pipe = document.getElementById(cfg.pipeId); pipe.innerHTML = "";
    if (steps.length === 0) { pipe.innerHTML = '<div class="pipe-empty">' + (cfg.emptyText || "Конвейер пуст. Нажимайте блоки выше.") + '</div>'; return; }
    steps.forEach((st, i) => {
      const op = OPS[st.id];
      const row = document.createElement("div"); row.className = "step";
      let paramHtml = "";
      if (op.param) { const ph = op.plabel || (op.param === "num" ? "N" : "ключ"); paramHtml = `<input class="param" value="${String(st.p).replace(/"/g, '&quot;')}" placeholder="${ph}" ${op.param === "num" ? 'inputmode="numeric"' : ''}>`; }
      row.innerHTML = `
        <div class="idx">${String(i + 1).padStart(2, "0")}</div>
        <div class="nm">${op.name}<small>${op.grp}</small></div>
        ${paramHtml}
        <div class="ctrl"><button class="up" title="выше">↑</button><button class="dn" title="ниже">↓</button><button class="x" title="убрать">✕</button></div>`;
      row.querySelector(".up").onclick = () => move(i, -1);
      row.querySelector(".dn").onclick = () => move(i, 1);
      row.querySelector(".x").onclick = () => remove(i);
      const inp = row.querySelector("input.param"); if (inp) inp.addEventListener("input", e => setParam(i, e.target.value));
      pipe.appendChild(row);
      if (i < steps.length - 1) { const f = document.createElement("div"); f.className = "flow"; f.textContent = "↓"; pipe.appendChild(f); }
    });
  }
  return { steps, buildPalette, addStep, move, remove, setParam, render };
}

const encPipe = createPipeline({ paletteId: "palette", pipeId: "pipe", emptyText: "Конвейер пуст. Нажимайте блоки выше — они выстроятся в цепочку по порядку." });
const decPipe = createPipeline({ paletteId: "paletteMan", pipeId: "pipeMan", exclude: ["vernam"], emptyText: "Пусто. Добавьте операции в том же порядке, что использовались при шифровании." });

// ============================================================
// Анимация «оседания» из шума в текст
// ============================================================
const GLYPHS = "0123456789ABCDEF#%&$/\\<>*+=?~абвгдежзиклмнптфцшАБВГДЕЖЗ⟨⟩▓▒░⠿⠾⠷";
const REDUCE_MOTION = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
let animRAF = null;
const rndGlyph = () => GLYPHS[(Math.random() * GLYPHS.length) | 0];
const easeInOut = x => x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
const ZONE = 44;

function clearActive() { document.querySelectorAll(".step.active").forEach(s => s.classList.remove("active")); }

function playScramble(target, cfg) {
  const out = cfg.out, con = cfg.con, btn = cfg.btn, steps = cfg.steps;
  const chars = Array.from(target), N = chars.length;
  const noise = Array.from({ length: N }, rndGlyph);
  out.className = "transmission " + cfg.outClass; out.textContent = "";
  con.className = "console on" + (cfg.conClass ? (" " + cfg.conClass) : ""); con.innerHTML = "";
  btn.disabled = true; btn.dataset.lbl = btn.textContent; btn.textContent = cfg.busy;
  let fired = 0; const t0 = performance.now();
  function frame(now) {
    const p = Math.min(1, (now - t0) / cfg.dur);
    const head = Math.floor(easeInOut(p) * N);
    while (fired < cfg.events.length && (now - t0) >= cfg.events[fired].t) {
      const ev = cfg.events[fired++];
      const d = document.createElement("div"); d.textContent = "> " + ev.line; con.appendChild(d);
      con.querySelectorAll("div").forEach(x => x.classList.remove("hot")); d.classList.add("hot");
      if (steps) { clearActive(); if (ev.step >= 0 && steps[ev.step]) steps[ev.step].classList.add("active"); }
    }
    let buf = "";
    for (let i = 0; i < N; i++) { buf += i < head ? chars[i] : i < head + ZONE ? rndGlyph() : noise[i]; }
    out.textContent = buf;
    if (p < 1) { animRAF = requestAnimationFrame(frame); }
    else { animRAF = null; if (steps) clearActive(); con.querySelectorAll("div").forEach(x => x.classList.remove("hot")); btn.disabled = false; btn.textContent = btn.dataset.lbl; cfg.onDone(); }
  }
  animRAF = requestAnimationFrame(frame);
}

// ============================================================
// ШИФРОВАНИЕ
// ============================================================
function doEncode() {
  if (animRAF) return;
  const text = document.getElementById("plain").value;
  const wrap = document.getElementById("encOutWrap");
  const out = document.getElementById("transOut");
  const con = document.getElementById("encConsole");
  wrap.hidden = false; clearActive();
  if (encPipe.steps.length === 0) {
    con.className = "console"; con.innerHTML = "";
    out.className = "transmission err"; out.textContent = "Конвейер пуст — добавьте хотя бы одну операцию.";
    return;
  }
  encPipe.steps.forEach(st => { if (OPS[st.id].gen) st.p = undefined; }); // свежий ключ Вернама
  const transmission = encode(text, encPipe.steps);
  if (REDUCE_MOTION) { con.className = "console"; con.innerHTML = ""; finishEncode(transmission); return; }
  const DUR = Math.max(3000, Math.min(5000, 2400 + encPipe.steps.length * 300));
  const win = DUR * 0.60;
  const events = [{ t: 0, line: "КЛЮЧ СТАНЦИИ · ПРИНЯТ", step: -1 }];
  encPipe.steps.forEach((st, i) => events.push({ t: 160 + win * ((i + 1) / (encPipe.steps.length + 1)), line: `КОНВЕЙЕР ${String(i + 1).padStart(2, "0")} · ${OPS[st.id].name.toUpperCase()}`, step: i }));
  events.push({ t: DUR * 0.82, line: "МАРКИРОВКА ⟨ACEON⟩", step: -1 });
  events.push({ t: DUR * 0.97, line: "КАНАЛ ЗАПЕЧАТАН", step: -1 });
  playScramble(transmission, {
    out, con, btn: document.getElementById("encBtn"), steps: document.querySelectorAll("#pipe .step"),
    dur: DUR, busy: "ШИФРОВАНИЕ…", outClass: "live", conClass: "", events, onDone: () => finishEncode(transmission)
  });
}
function finishEncode(transmission) {
  const out = document.getElementById("transOut");
  const end = transmission.indexOf(SEP);
  out.className = "transmission";
  out.innerHTML = `<span class="marker">${escapeHtml(transmission.slice(0, end + 1))}</span>${escapeHtml(transmission.slice(end + 1))}`;
}

// ============================================================
// РАСШИФРОВКА — общий аниматор
// ============================================================
function decodeAnimate(plain, recipe, btnId) {
  const out = document.getElementById("plainOut");
  const con = document.getElementById("decConsole");
  if (REDUCE_MOTION) { con.className = "console"; con.innerHTML = ""; finishDecode(plain); return; }
  const target = plain !== "" ? plain : "·пусто·";
  const DUR = Math.max(3000, Math.min(5000, 2400 + recipe.length * 300));
  const win = DUR * 0.60;
  const events = [{ t: 0, line: "ПЕРЕХВАТ ПРИНЯТ · ЧТЕНИЕ ФРАЗЫ", step: -1 }];
  for (let k = 0; k < recipe.length; k++) {
    const i = recipe.length - 1 - k;
    events.push({ t: 160 + win * ((k + 1) / (recipe.length + 1)), line: `СНЯТИЕ СЛОЯ ${String(i + 1).padStart(2, "0")} · ${OPS[recipe[i].id].name.toUpperCase()}`, step: -1 });
  }
  events.push({ t: DUR * 0.82, line: "КЛЮЧ ПОДОБРАН", step: -1 });
  events.push({ t: DUR * 0.97, line: "ТЕКСТ ВОССТАНОВЛЕН", step: -1 });
  playScramble(target, {
    out, con, btn: document.getElementById(btnId), steps: null,
    dur: DUR, busy: "РАСШИФРОВКА…", outClass: "plain live-dec", conClass: "dec", events, onDone: () => finishDecode(plain)
  });
}
function finishDecode(plain) {
  const out = document.getElementById("plainOut");
  out.className = "transmission plain";
  out.textContent = plain !== "" ? plain : "·пустое сообщение·";
}
function decError(msg) {
  const con = document.getElementById("decConsole"); con.className = "console"; con.innerHTML = "";
  const out = document.getElementById("plainOut"); out.className = "transmission err"; out.textContent = "✕ " + msg;
  document.getElementById("decOutWrap").hidden = false;
}

// --- авто: по маркеру ---
function doDecode() {
  if (animRAF) return;
  const t = document.getElementById("cipher").value.trim();
  document.getElementById("decOutWrap").hidden = false;
  let parts;
  try { parts = decodeParts(t); } catch (e) { decError(e.message); return; }
  decodeAnimate(parts.plain, parts.recipe, "decBtn");
}

// --- вручную: пользователь собирает тот же рецепт, разворачиваем сами ---
function doDecodeManual() {
  if (animRAF) return;
  let cipher = document.getElementById("cipherMan").value.trim();
  // если случайно вставили полную передачу с меткой — отрежем маркер
  if (cipher.startsWith(PREFIX)) { const e = cipher.indexOf(SEP); if (e >= 0) cipher = cipher.slice(e + 1); }
  const recipe = decPipe.steps;
  document.getElementById("decOutWrap").hidden = false;
  if (recipe.length === 0) { decError("Добавьте операции — в том же порядке, что при шифровании."); return; }
  let plain;
  try { let s = cipher; for (let i = recipe.length - 1; i >= 0; i--) s = OPS[recipe[i].id].inv(s, recipe[i].p); plain = s; }
  catch (e) { decError("Не удалось расшифровать этой последовательностью. Проверьте порядок операций и ключи."); return; }
  decodeAnimate(plain, recipe, "decBtnMan");
}

// ============================================================
// прочее
// ============================================================
function copyOut(id, btn) {
  const el = document.getElementById(id);
  navigator.clipboard.writeText(el.textContent).then(() => {
    const o = btn.textContent; btn.textContent = "Скопировано"; setTimeout(() => btn.textContent = o, 1400);
  });
}
function escapeHtml(s) { return String(s).replace(/[&<>]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c])); }

function setMode(m) {
  document.getElementById("view-enc").classList.toggle("on", m === "enc");
  document.getElementById("view-dec").classList.toggle("on", m === "dec");
  document.getElementById("tab-enc").classList.toggle("on", m === "enc");
  document.getElementById("tab-dec").classList.toggle("on", m === "dec");
}
function setDecMode(m) {
  document.getElementById("decAuto").hidden = m !== "auto";
  document.getElementById("decMan").hidden = m !== "man";
  document.getElementById("sub-auto").classList.toggle("on", m === "auto");
  document.getElementById("sub-man").classList.toggle("on", m === "man");
}

// старт
["b64", "swap23", "revword", "swapfl", "caesar"].forEach(id => encPipe.addStep(id));
encPipe.buildPalette(); encPipe.render();
decPipe.buildPalette(); decPipe.render();
