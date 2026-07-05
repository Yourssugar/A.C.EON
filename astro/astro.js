/* ============================================================================
   ASTRO · ДВИЖОК СТРАНИЦЫ
   ----------------------------------------------------------------------------
   Считает: astronomy-engine (лайт + живые виджеты, точность ±1'),
            circular-natal-horoscope-js (полный натал: дома, асцендент, аспекты).
   Никакого API. Текст — из data/interpretations.js через interpret().
   ============================================================================ */

const A = window.Astronomy;          // глобал из astronomy.browser.min.js
const CNH = window.CNH;              // глобал из natal.bundle.js (грузится лениво)
const META = window.ASTRO_META;

const PLANETS = ['sun','moon','mercury','venus','mars','jupiter','saturn','uranus','neptune','pluto'];
const SIGN_ORDER = ['aries','taurus','gemini','cancer','leo','virgo','libra','scorpio','sagittarius','capricorn','aquarius','pisces'];
const bodyName = k => k.charAt(0).toUpperCase() + k.slice(1);   // 'mars' -> 'Mars'

/* ---- Астрономия (astronomy-engine) --------------------------------------- */
function eclLon(planetKey, date) {
  const t = A.MakeTime(date);
  const vec = A.GeoVector(bodyName(planetKey), t, true);
  return A.Ecliptic(vec).elon;                    // эклиптическая долгота 0..360
}
function signFromLon(lon) { return SIGN_ORDER[Math.floor((((lon % 360) + 360) % 360) / 30)]; }
function degInSign(lon)  { return ((lon % 30) + 30) % 30; }

function isRetro(planetKey, date) {
  if (planetKey === 'sun' || planetKey === 'moon') return false;   // геоцентрически не бывают
  const before = eclLon(planetKey, new Date(date.getTime() - 6 * 3600e3));
  const after  = eclLon(planetKey, new Date(date.getTime() + 6 * 3600e3));
  let d = after - before; if (d > 180) d -= 360; if (d < -180) d += 360;
  return d < 0;
}

/* ---- ЛАЙТ-РЕЖИМ: только дата → знаки планет (полдень UTC) ----------------- */
function lightChart(y, m, d) {
  const date = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));   // m: 1..12 на входе
  const planets = {};
  PLANETS.forEach(k => {
    const lon = eclLon(k, date);
    planets[k] = {
      sign: signFromLon(lon),
      deg: degInSign(lon),
      lon,
      retro: isRetro(k, date),
      approx: (k === 'moon')            // Луна за сутки уходит на ~12° — знак примерный
    };
  });
  return { mode: 'light', planets, date };
}

/* ---- ПОЛНЫЙ НАТАЛ (circular-natal): дата+время+место → дома, асцендент ---- */
function fullChart(y, m, d, hh, mm, lat, lon) {
  if (!window.CNH) throw new Error('natal.bundle.js ещё не загружен');
  const origin = new CNH.Origin({
    year: y, month: m - 1, date: d, hour: hh, minute: mm,   // ВНИМАНИЕ: month 0-индексный!
    latitude: lat, longitude: lon
  });
  const h = new CNH.Horoscope({
    origin, houseSystem: 'placidus', zodiac: 'tropical',
    aspectPoints: ['bodies'], aspectWithPoints: ['bodies'], aspectTypes: ['major'], language: 'en'
  });

  const planets = {};
  PLANETS.forEach(k => {
    const b = h.CelestialBodies[k];
    const raw = b.ChartPosition.Ecliptic.DecimalDegrees;
    planets[k] = {
      sign: (b.Sign.key || b.Sign.label).toLowerCase(),
      deg: degInSign(raw),
      lon: raw,
      house: b.House ? b.House.id : null,
      retro: !!b.isRetrograde,
      approx: false
    };
  });
  const asc = {
    sign: (h.Ascendant.Sign.key || h.Ascendant.Sign.label).toLowerCase(),
    deg: h.Ascendant.ChartPosition.Ecliptic.ArcDegrees.degrees
  };
  const mc = {
    sign: (h.Midheaven.Sign.key || h.Midheaven.Sign.label).toLowerCase(),
    deg: h.Midheaven.ChartPosition.Ecliptic.ArcDegrees.degrees
  };
  return { mode: 'full', planets, asc, mc, origin };
}

/* ---- АСПЕКТЫ (единая функция для натала и синастрии) ---------------------- */
const ORBS = { conjunction: 8, opposition: 8, trine: 8, square: 7, sextile: 6 };
function angularSep(a, b) { let d = Math.abs(a - b) % 360; return d > 180 ? 360 - d : d; }

function findAspects(planetsA, planetsB, sameChart) {
  const out = [];
  const keysA = PLANETS, keysB = PLANETS;
  keysA.forEach((ka, i) => keysB.forEach((kb, j) => {
    if (sameChart && j <= i) return;                 // в одной карте пары не дублируем
    const sep = angularSep(planetsA[ka].lon, planetsB[kb].lon);
    for (const type in ORBS) {
      const orb = Math.abs(sep - META.aspects[type].angle);
      if (orb <= ORBS[type]) {
        out.push({ a: ka, b: kb, type, orb: +orb.toFixed(1) });
        break;                                       // ближайший аспект для пары
      }
    }
  }));
  return out.sort((x, y) => x.orb - y.orb);
}

/* ---- ЖИВЫЕ ВИДЖЕТЫ (без данных рождения) --------------------------------- */
function moonNow(date = new Date()) {
  const phase = A.MoonPhase(date);                   // 0=новолуние, 90=1я четв, 180=полн, 270=3я четв
  const illum = A.Illumination('Moon', A.MakeTime(date)).phase_fraction;
  const names = ['Новолуние','Растущий серп','Первая четверть','Растущая луна',
                 'Полнолуние','Убывающая луна','Последняя четверть','Убывающий серп'];
  const idx = Math.floor(((phase + 22.5) % 360) / 45);
  return { phaseDeg: phase, illum: Math.round(illum * 100), name: names[idx] };
}
function mercuryRetroNow(date = new Date()) { return isRetro('mercury', date); }

/* ============================================================================
   РЕНДЕР (заглушка визуала — Александр заменит своим)
   ============================================================================ */
const $ = sel => document.querySelector(sel);
const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };

function renderPlanetGrid(chart, container) {
  container.innerHTML = '';
  PLANETS.forEach(k => {
    const p = chart.planets[k], pm = META.planets[k], sm = META.signs[p.sign];
    const btn = el('button', 'planet-btn');
    btn.innerHTML =
      `<span class="glyph">${pm.glyph}</span>` +
      `<span class="pname">${pm.ru}</span>` +
      `<span class=" psign">${sm.glyph} ${sm.ru}${p.approx ? ' ≈' : ''}${p.retro ? ' ℞' : ''}</span>`;
    btn.onclick = () => showPlanetReading(chart, k);
    container.appendChild(btn);
  });
}

function showPlanetReading(chart, k) {
  const p = chart.planets[k], pm = META.planets[k], sm = META.signs[p.sign];
  const box = $('#reading'); box.innerHTML = '';
  box.appendChild(el('h3', null, `${pm.glyph} ${pm.ru} в знаке ${sm.glyph} ${sm.ru}`));
  box.appendChild(el('p', 'meta', `${Math.floor(p.deg)}° · сфера: ${pm.sphere}${p.retro ? ' · ретроград ℞' : ''}${p.approx ? ' · знак примерный (нет времени рождения)' : ''}`));
  box.appendChild(el('p', 'text', interpret('planetInSign', { planet: k, sign: p.sign })));
  if (chart.mode === 'full' && p.house) {
    box.appendChild(el('p', 'text', '<b>В доме ' + p.house + ':</b> ' + interpret('planetInHouse', { planet: k, house: p.house })));
  }
  box.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function renderAspects(list, container, kind) {
  container.innerHTML = '';
  if (!list.length) { container.appendChild(el('p', 'muted', 'Значимых аспектов в пределах орбов не найдено.')); return; }
  list.slice(0, 12).forEach(asp => {
    const am = META.aspects[asp.type];
    const row = el('div', 'aspect-row');
    row.innerHTML =
      `<span class="ac">${META.planets[asp.a].glyph} ${am.glyph} ${META.planets[asp.b].glyph}</span>` +
      `<span class="an">${META.planets[asp.a].ru} — ${am.ru} — ${META.planets[asp.b].ru} <em>(орб ${asp.orb}°)</em></span>` +
      `<span class="at">${interpret(kind === 'synastry' ? 'synastry' : 'aspect', { a: asp.a, type: asp.type, b: asp.b })}</span>`;
    container.appendChild(row);
  });
}

/* Заглушка колеса — Александр нарисует своё. renderWheel(chart) — точка входа. */
function renderWheel(chart) {
  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 400 400'); svg.setAttribute('class', 'wheel-svg');
  const c = (cx, cy, r, cls) => { const e = document.createElementNS(NS, 'circle'); e.setAttribute('cx', cx); e.setAttribute('cy', cy); e.setAttribute('r', r); e.setAttribute('class', cls); return e; };
  svg.appendChild(c(200, 200, 180, 'wheel-outer'));
  svg.appendChild(c(200, 200, 120, 'wheel-inner'));
  for (let i = 0; i < 12; i++) {
    const a = (i * 30 - 90) * Math.PI / 180;
    const line = document.createElementNS(NS, 'line');
    line.setAttribute('x1', 200 + 120 * Math.cos(a)); line.setAttribute('y1', 200 + 120 * Math.sin(a));
    line.setAttribute('x2', 200 + 180 * Math.cos(a)); line.setAttribute('y2', 200 + 180 * Math.sin(a));
    line.setAttribute('class', 'wheel-tick'); svg.appendChild(line);
    const g = document.createElementNS(NS, 'text');
    const ga = ((i + 0.5) * 30 - 90) * Math.PI / 180;
    g.setAttribute('x', 200 + 150 * Math.cos(ga)); g.setAttribute('y', 200 + 150 * Math.sin(ga));
    g.setAttribute('class', 'wheel-glyph'); g.textContent = META.signs[SIGN_ORDER[i]].glyph;
    svg.appendChild(g);
  }
  // планеты по долготе
  PLANETS.forEach(k => {
    const lon = chart.planets[k].lon;
    const a = (lon - 90) * Math.PI / 180;
    const t = document.createElementNS(NS, 'text');
    t.setAttribute('x', 200 + 95 * Math.cos(a)); t.setAttribute('y', 200 + 95 * Math.sin(a));
    t.setAttribute('class', 'wheel-planet'); t.textContent = META.planets[k].glyph;
    svg.appendChild(t);
  });
  const wrap = $('#wheel'); wrap.innerHTML = ''; wrap.appendChild(el('p', 'placeholder-note', '↓ заглушка колеса — заменить своим визуалом'));
  wrap.appendChild(svg);
}

/* ============================================================================
   УПРАВЛЕНИЕ / СОСТОЯНИЕ
   ============================================================================ */
const STORE = 'aceon_astro_v1';
function saveState(s) { try { localStorage.setItem(STORE, JSON.stringify(s)); } catch (e) {} }
function loadState()  { try { return JSON.parse(localStorage.getItem(STORE)) || {}; } catch (e) { return {}; } }

// ленивая загрузка тяжёлого натал-движка только когда он реально нужен
let _cnhLoading = null;
function ensureNatalEngine() {
  if (window.CNH) return Promise.resolve();
  if (_cnhLoading) return _cnhLoading;
  _cnhLoading = new Promise((res, rej) => {
    const s = document.createElement('script');
    s.src = 'vendor/natal.bundle.js';
    s.onload = () => res(); s.onerror = () => rej(new Error('не удалось загрузить natal.bundle.js'));
    document.head.appendChild(s);
  });
  return _cnhLoading;
}

function buildLight() {
  const y = +$('#l-year').value, m = +$('#l-month').value, d = +$('#l-day').value;
  if (!y || !m || !d) return;
  const chart = lightChart(y, m, d);
  window._chart = chart;
  renderPlanetGrid(chart, $('#planet-grid'));
  renderWheel(chart);
  renderAspects(findAspects(chart.planets, chart.planets, true), $('#aspects'), 'aspect');
  $('#result').classList.remove('hidden');
  $('#result-mode').textContent = 'лайт · только знаки (домов нет)';
  saveState({ light: { y, m, d } });
}

async function buildFull() {
  const g = id => +$(id).value;
  const y = g('#f-year'), m = g('#f-month'), d = g('#f-day'), hh = g('#f-hour'), mm = g('#f-min');
  const lat = parseFloat($('#f-lat').value), lon = parseFloat($('#f-lon').value);
  if (!y || !m || !d || isNaN(lat) || isNaN(lon)) { alert('Заполни дату, время и координаты'); return; }
  $('#f-build').disabled = true; $('#f-build').textContent = 'Загружаю движок…';
  try {
    await ensureNatalEngine();
    const chart = fullChart(y, m, d, hh, mm, lat, lon);
    window._chart = chart;
    renderPlanetGrid(chart, $('#planet-grid'));
    renderWheel(chart);
    renderAspects(findAspects(chart.planets, chart.planets, true), $('#aspects'), 'aspect');
    $('#asc-line').textContent = `Асцендент: ${META.signs[chart.asc.sign].glyph} ${META.signs[chart.asc.sign].ru} ${chart.asc.deg}° · MC: ${META.signs[chart.mc.sign].ru}`;
    $('#result').classList.remove('hidden');
    $('#result-mode').textContent = 'полный натал · дома Placidus';
    saveState({ full: { y, m, d, hh, mm, lat, lon } });
  } catch (e) { alert('Ошибка: ' + e.message); }
  finally { $('#f-build').disabled = false; $('#f-build').textContent = 'Построить карту'; }
}

async function buildSynastry() {
  const g = id => +$(id).value;
  const A1 = { y: g('#s1-year'), m: g('#s1-month'), d: g('#s1-day'), hh: g('#s1-hour'), mm: g('#s1-min'), lat: parseFloat($('#s1-lat').value), lon: parseFloat($('#s1-lon').value) };
  const B1 = { y: g('#s2-year'), m: g('#s2-month'), d: g('#s2-day'), hh: g('#s2-hour'), mm: g('#s2-min'), lat: parseFloat($('#s2-lat').value), lon: parseFloat($('#s2-lon').value) };
  for (const o of [A1, B1]) if (!o.y || !o.m || !o.d || isNaN(o.lat) || isNaN(o.lon)) { alert('Заполни обе карты полностью'); return; }
  $('#s-build').disabled = true; $('#s-build').textContent = 'Считаю…';
  try {
    await ensureNatalEngine();
    const ch1 = fullChart(A1.y, A1.m, A1.d, A1.hh, A1.mm, A1.lat, A1.lon);
    const ch2 = fullChart(B1.y, B1.m, B1.d, B1.hh, B1.mm, B1.lat, B1.lon);
    const cross = findAspects(ch1.planets, ch2.planets, false);
    renderAspects(cross, $('#syn-aspects'), 'synastry');
    $('#syn-result').classList.remove('hidden');
    $('#syn-count').textContent = `Найдено связей между картами: ${cross.length}`;
  } catch (e) { alert('Ошибка: ' + e.message); }
  finally { $('#s-build').disabled = false; $('#s-build').textContent = 'Сравнить карты'; }
}

/* ---- живые виджеты + вкладки + восстановление ---------------------------- */
function initWidgets() {
  const m = moonNow();
  $('#w-moon').innerHTML = `<b>Луна сегодня:</b> ${m.name} · освещённость ${m.illum}%`;
  const retro = mercuryRetroNow();
  $('#w-mercury').innerHTML = retro
    ? '<b>Меркурий ретроградный</b> — сейчас ℞ (списывай сбои связи на него)'
    : '<b>Меркурий директный</b> — сейчас идёт прямо, всё ок';
  $('#w-mercury').classList.toggle('retro-on', retro);
}

function initTabs() {
  document.querySelectorAll('.tab').forEach(t => t.onclick = () => {
    document.querySelectorAll('.tab').forEach(x => x.classList.remove('active'));
    document.querySelectorAll('.panel').forEach(x => x.classList.add('hidden'));
    t.classList.add('active');
    $('#panel-' + t.dataset.tab).classList.remove('hidden');
  });
}

function restore() {
  const s = loadState();
  if (s.light) { $('#l-year').value = s.light.y; $('#l-month').value = s.light.m; $('#l-day').value = s.light.d; }
  if (s.full)  { const f = s.full; $('#f-year').value = f.y; $('#f-month').value = f.m; $('#f-day').value = f.d; $('#f-hour').value = f.hh; $('#f-min').value = f.mm; $('#f-lat').value = f.lat; $('#f-lon').value = f.lon; }
}

window.addEventListener('DOMContentLoaded', () => {
  initTabs(); initWidgets(); restore();
  $('#l-build').onclick = buildLight;
  $('#f-build').onclick = buildFull;
  $('#s-build').onclick = buildSynastry;
  document.querySelectorAll('.city-preset').forEach(sel => sel.onchange = e => {
    const [lat, lon] = e.target.value.split(',');
    const pre = e.target.dataset.target;
    if (lat) { $(pre + '-lat').value = lat; $(pre + '-lon').value = lon; }
  });
});
