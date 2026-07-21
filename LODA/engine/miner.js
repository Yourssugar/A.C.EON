/* Майнер программ LODA.
   Ищет короткую программу, которая выдаёт заданный ряд чисел (термы OEIS).
   Работает поверх интерпретатора loda.js: генерирует и мутирует программы,
   гоняет их через движок и сравнивает вывод с целью.

   Две силы поиска. Случайная генерация даёт разнообразие и находит простое.
   Мутация лучших частичных совпадений (beam) дотягивает то, что случайно
   не соберётся. Полное совпадение на всех термах цели и есть находка.

   Модуль пошаговый: mine() отдаёт объект со step(budget), который делает
   ограниченную порцию работы и возвращается. Это позволяет браузеру
   троттлить нагрузку и не морозить вкладку. */

(function(global){
'use strict';

const LODA = (typeof require !== 'undefined') ? require('./loda.js') : global.LODA;
if(!LODA) throw new Error('miner.js требует loda.js');

/* небольшой генератор псевдослучайных чисел с зерном.
   Зерно делает прогон воспроизводимым: разные браузеры получают разные зёрна
   от сервера и не топчут одно и то же пространство. */
function seededRandom(seed){
  let s = seed >>> 0;
  return function(){
    s |= 0; s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function pick(rng, arr){ return arr[(rng() * arr.length) | 0]; }
function chance(rng, p){ return rng() < p; }

const DEFAULTS = {
  maxCells: 4,          // ячейки $0..$3
  maxLen: 6,            // длина случайной программы
  consts: [-2n, -1n, 1n, 2n, 3n, 5n, 10n],
  beamSize: 24,         // сколько лучших частичных совпадений держим
  freshPer: 6,          // свежих случайных программ за внешний цикл
  exploitPer: 26,       // мутаций за цикл, распределяются в пользу глубоких
  staleReset: 4000,     // попыток без роста глубины до впрыска свежей крови
  freshBurst: 45,       // сколько случайных впрыснуть при застое
  loopChance: 0.28,     // доля программ с циклом
  seqChance: 0.15,      // доля инструкций seq, когда опорный набор подан
  seenMax: 300000,      // потолок памяти дедупа: скользящее окно (полное окно ~55 МБ, не течёт на долгом счёте)
  runOptions: { maxSteps: 1500, maxBits: 256 } // на майнинге хватает: цели короткие, а тяжёлых кандидатов быстро отбраковываем
};

// операции для тела программы, с грубым весом по практической полезности.
// пока дешёвое арифметическое ядро: тяжёлые bin/fac/gcd вернём позже,
// когда добавим взвешивание по частоте из реальной библиотеки программ.
const BODY_OPS = [
  'mov','mov','add','add','add','sub','sub','sub','mul','mul','mul',
  'div','mod','pow','trn','min','max'
];

function cellOperand(rng, opts){
  // почти всегда прямой доступ, изредка косвенный
  const base = (rng() * opts.maxCells) | 0;
  return chance(rng, 0.08)
    ? { kind:'cell', deref:2, base }
    : { kind:'cell', deref:1, base };
}
function sourceOperand(rng, opts){
  return chance(rng, 0.45)
    ? { kind:'const', value: pick(rng, opts.consts) }
    : cellOperand(rng, opts);
}
function buildSeqlib(bundleText){
  // разбираем опорные ряды и строим резолвер для операции seq.
  // seq A,arg отдаёт arg-й член ряда A из этого набора; вне диапазона — ошибка,
  // такой кандидат считается негодным (это правильно: мы не можем его проверить).
  const map = {};
  const ids = [];
  String(bundleText).split('\n').forEach(function(raw){
    const line = raw.trim();
    if(line === '' || line[0] === '#') return;
    const parts = line.split(/\s+/);
    if(parts.length < 3) return;
    const num = parseInt(parts[0].replace(/^A/, ''), 10);
    const offset = parseInt(parts[1], 10);
    const terms = parts[2].split(',').filter(function(x){ return x !== ''; }).map(function(x){ return BigInt(x); });
    if(terms.length){ map[num] = { offset: offset, terms: terms }; ids.push(num); }
  });
  function resolve(id, arg){
    const e = map[id];
    if(!e) throw new Error('нет опорного ряда ' + id);
    const idx = Number(arg) - e.offset;
    if(idx < 0 || idx >= e.terms.length) throw new Error('индекс seq вне диапазона');
    return e.terms[idx];
  }
  return { resolve: resolve, ids: ids };
}

function bodyInstruction(rng, opts){
  // если подан опорный набор, иногда генерируем seq A,$x как готовый кирпич
  if(opts.seqIds && opts.seqIds.length && chance(rng, opts.seqChance)){
    return { op:'seq', target: cellOperand(rng, opts), source: { kind:'const', value: BigInt(pick(rng, opts.seqIds)) } };
  }
  return { op: pick(rng, BODY_OPS), target: cellOperand(rng, opts), source: sourceOperand(rng, opts) };
}

function randomProgram(rng, opts){
  const instrs = [];
  const len = 1 + ((rng() * opts.maxLen) | 0);
  if(chance(rng, opts.loopChance) && len >= 3){
    // немного тела до цикла, потом цикл со счётчиком, который убывает
    const head = (rng() * (len - 2)) | 0;
    for(let i = 0; i < head; i++) instrs.push(bodyInstruction(rng, opts));
    const counter = { kind:'cell', deref:1, base: (rng() * opts.maxCells) | 0 };
    instrs.push({ op:'lpb', target: counter, lenOp: null });
    const bodyLen = 1 + ((rng() * 3) | 0);
    for(let i = 0; i < bodyLen; i++) instrs.push(bodyInstruction(rng, opts));
    // гарантируем уменьшение счётчика, иначе цикл почти всегда пустой
    instrs.push({ op:'sub', target: counter, source: { kind:'const', value: 1n } });
    instrs.push({ op:'lpe' });
    for(let i = 0; i < len - head; i++) instrs.push(bodyInstruction(rng, opts));
  } else {
    for(let i = 0; i < len; i++) instrs.push(bodyInstruction(rng, opts));
  }
  return { instrs, offset: 0 };
}

function cloneOperand(o){ return o.kind === 'const' ? { kind:'const', value:o.value } : { kind:'cell', deref:o.deref, base:o.base }; }
function cloneProgram(p){
  return { offset: p.offset, instrs: p.instrs.map(inst => {
    const c = { op: inst.op };
    if(inst.target) c.target = cloneOperand(inst.target);
    if(inst.source) c.source = cloneOperand(inst.source);
    if(inst.op === 'lpb') c.lenOp = inst.lenOp ? cloneOperand(inst.lenOp) : null;
    return c;
  })};
}

function mutateProgram(prog, rng, opts){
  const p = cloneProgram(prog);
  const body = p.instrs.map((inst, i) => ({inst, i})).filter(x => x.inst.op !== 'lpb' && x.inst.op !== 'lpe');
  const roll = rng();
  if(roll < 0.30 && body.length){
    // сменить операцию
    pick(rng, body).inst.op = pick(rng, BODY_OPS);
  } else if(roll < 0.60 && body.length){
    // сменить операнд
    const t = pick(rng, body).inst;
    if(chance(rng, 0.5)) t.target = cellOperand(rng, opts);
    else t.source = sourceOperand(rng, opts);
  } else if(roll < 0.75 && body.length){
    // подправить константу на единицу
    const cands = body.filter(x => x.inst.source && x.inst.source.kind === 'const' && x.inst.op !== 'seq');
    if(cands.length){
      const s = pick(rng, cands).inst.source;
      s.value = s.value + (chance(rng, 0.5) ? 1n : -1n);
    } else pick(rng, body).inst.op = pick(rng, BODY_OPS);
  } else if(roll < 0.88){
    // вставить инструкцию
    const at = (rng() * (p.instrs.length + 1)) | 0;
    p.instrs.splice(at, 0, bodyInstruction(rng, opts));
  } else if(body.length > 1){
    // удалить инструкцию тела
    const victim = pick(rng, body);
    p.instrs.splice(victim.i, 1);
  } else {
    pick(rng, body.length ? body : [{inst: null}]);
    p.instrs.push(bodyInstruction(rng, opts));
  }
  return p;
}

function mutateProgramN(prog, rng, opts, k){
  // несколько мелких мутаций подряд дают более крупный прыжок, помогает уйти с плато
  let p = prog;
  for(let i = 0; i < k; i++) p = mutateProgram(p, rng, opts);
  return p;
}

const OP_INDEX = (function(){
  const list = ['mov','add','sub','trn','mul','div','dif','dir','mod','pow','bin','fac','gcd','lex','log','nrt','dgs','dgr','equ','neq','leq','geq','min','max','ban','bor','bxo','clr','fil','rol','ror','seq','lpb','lpe'];
  const m = {}; for(let i = 0; i < list.length; i++) m[list[i]] = i + 1; return m;
})();
function hashMix(h, x){ h ^= (x | 0); h = Math.imul(h, 0x01000193); return h >>> 0; }
function hashOperand(h, o){
  if(!o) return hashMix(h, 0);
  if(o.kind === 'const'){ h = hashMix(h, 1); return hashMix(h, Number(o.value) | 0); }
  h = hashMix(h, 2 + (o.deref || 1)); return hashMix(h, o.base || 0);
}
function hashProg(instrs){
  // дешёвый структурный хэш вместо построения текста на каждого кандидата.
  // редкие коллизии просто пропускают одного кандидата, это безвредно.
  let h = 0x811c9dc5;
  for(let k = 0; k < instrs.length; k++){
    const inst = instrs[k];
    h = hashMix(h, OP_INDEX[inst.op] || 0);
    h = hashOperand(h, inst.target);
    h = hashOperand(h, inst.source);
    if(inst.op === 'lpb') h = hashOperand(h, inst.lenOp);
  }
  return h >>> 0;
}

function linkLoops(prog){
  // проставляем lpb.lpeIp и проверяем баланс скобок; кривые программы отбрасываем
  const stack = [];
  const instrs = prog.instrs;
  for(let ip = 0; ip < instrs.length; ip++){
    if(instrs[ip].op === 'lpb'){ delete instrs[ip].lpeIp; stack.push(ip); }
    else if(instrs[ip].op === 'lpe'){ const o = stack.pop(); if(o === undefined) return false; instrs[o].lpeIp = ip; }
  }
  return stack.length === 0;
}

function operandText(o){ return o.kind === 'const' ? o.value.toString() : '$'.repeat(o.deref) + o.base; }
function serialize(prog){
  let indent = 0;
  const lines = [];
  for(const inst of prog.instrs){
    if(inst.op === 'lpe') indent = Math.max(0, indent - 1);
    let line = '  '.repeat(indent) + inst.op;
    if(inst.op === 'lpb'){ line += ' ' + operandText(inst.target); if(inst.lenOp) line += ',' + operandText(inst.lenOp); }
    else if(inst.op !== 'lpe'){ line += ' ' + operandText(inst.target) + ',' + operandText(inst.source); }
    lines.push(line);
    if(inst.op === 'lpb') indent++;
  }
  return (prog.offset ? '#offset ' + prog.offset + '\n' : '') + lines.join('\n');
}

function depthOf(prog, offset, seq, runOptions){
  if(!linkLoops(prog)) return -1; // несбалансированные скобки, кандидат негоден
  let m;
  try { m = LODA.machine(prog, runOptions); }
  catch(e){ return -1; }
  for(let d = 0; d < seq.length; d++){
    let v;
    try { v = m.term(offset + d); } // термы цели начинаются с индекса offset
    catch(e){ return d; }
    if(v !== seq[d]) return d;
  }
  return seq.length; // полное совпадение
}

function normalizeTarget(target){
  const raw = Array.isArray(target) ? { offset:0, terms:target } : { offset: target.offset || 0, terms: target.terms };
  return { offset: raw.offset, terms: raw.terms.map(x => (typeof x === 'bigint') ? x : BigInt(x)) };
}

function matchDepth(prog, target, runOptions){
  const t = normalizeTarget(target);
  return depthOf(prog, t.offset, t.terms, runOptions || DEFAULTS.runOptions);
}

function mine(target, options){
  const opts = Object.assign({}, DEFAULTS, options || {});
  const seqlib = opts.seqlib || null;
  if(seqlib) opts.seqIds = seqlib.ids;                       // из чего генерировать seq
  const runOptions = Object.assign({}, opts.runOptions, seqlib ? { seq: seqlib.resolve } : {});
  const t = normalizeTarget(target);
  const offset = t.offset;
  const seq = t.terms;
  const need = seq.length;
  const rng = seededRandom((options && options.seed) || 1);

  let beam = [];               // [{prog, depth, text, tries}]
  // дедуп по тексту программы со скользящим окном: два поколения множеств.
  // когда свежее наполняется до потолка, оно становится старым, а старое
  // выбрасывается. так память не растёт бесконечно на долгом счёте.
  let seen = new Set();
  let seenOld = new Set();
  const seenMax = opts.seenMax;
  function seenHasOrAdd(text){
    if(seen.has(text) || seenOld.has(text)) return true;
    if(seen.size >= seenMax){ seenOld = seen; seen = new Set(); }
    seen.add(text);
    return false;
  }
  let attempts = 0;
  let best = { prog: null, depth: -1, text: '' };
  let found = null;
  let lastImprove = 0;         // на какой попытке в последний раз росла глубина

  function consider(prog){
    prog.offset = offset; // найденная программа должна нести то же смещение, что и цель
    if(seenHasOrAdd(hashProg(prog.instrs))) return null;
    attempts++;
    const depth = depthOf(prog, offset, seq, runOptions);
    if(depth < 0) return null;
    let text = null;
    const textOf = function(){ if(text === null) text = serialize(prog); return text; };
    if(depth > best.depth){ best = { prog, depth, text: textOf() }; lastImprove = attempts; }
    if(depth === need){ found = { prog, text: textOf(), terms: need }; return null; }
    if(depth > 0){
      const entry = { prog, depth, text: textOf(), tries: 0 };
      beam.push(entry);
      beam.sort((a, b) => b.depth - a.depth);
      if(beam.length > opts.beamSize) beam.length = opts.beamSize;
      return entry;
    }
    return null;
  }

  function weightedPick(){
    // выбираем кандидата с уклоном к глубоким: вес это квадрат глубины
    let total = 0;
    for(const e of beam) total += e.depth * e.depth;
    let r = rng() * total;
    for(const e of beam){ r -= e.depth * e.depth; if(r <= 0) return e; }
    return beam[0];
  }

  function step(budget){
    const stopAt = attempts + (budget || 300);
    while(attempts < stopAt && !found){
      // немного свежей крови для разнообразия
      for(let i = 0; i < opts.freshPer && !found; i++) consider(randomProgram(rng, opts));
      if(found) break;

      // застой: давно нет роста глубины — впрыскиваем случайных и чистим самых застоявшихся
      if(attempts - lastImprove > opts.staleReset){
        for(let i = 0; i < opts.freshBurst && !found; i++) consider(randomProgram(rng, opts));
        beam.sort((a, b) => (b.depth - a.depth) || (a.tries - b.tries));
        beam.length = Math.min(beam.length, Math.max(3, opts.beamSize >> 1));
        lastImprove = attempts; // чтобы не впрыскивать каждый шаг подряд
      }
      if(!beam.length || found) continue;

      // направленная эксплуатация: мутируем, отдавая предпочтение глубоким кандидатам
      for(let e = 0; e < opts.exploitPer && !found; e++){
        const parent = weightedPick();
        parent.tries++;
        // глубокий кандидат иногда получает крупную мутацию, чтобы выпрыгнуть с плато
        const big = parent.depth >= 4 && chance(rng, 0.3);
        const k = big ? (2 + ((rng() * 2) | 0)) : 1;
        consider(mutateProgramN(parent.prog, rng, opts, k));
      }
    }
    return { attempts, best: { depth: best.depth, text: best.text, need }, found };
  }

  function addSeeds(texts){
    // засев beam готовыми программами (затравками с сервера): развиваем чужое,
    // а не начинаем с чистого листа. Кривую затравку молча пропускаем.
    if(!texts || !texts.length) return;
    for(const text of texts){
      try {
        const p = LODA.parse(text);
        consider({ instrs: p.instrs, offset: offset });
      } catch(e){ /* пропускаем */ }
    }
  }
  addSeeds(opts.seeds);

  return { step, addSeeds, get attempts(){ return attempts; }, get best(){ return best; }, get found(){ return found; } };
}

/* удобная обёртка для тестов и node: гонять до находки или до предела попыток */
function search(target, options){
  const m = mine(target, options);
  const limit = (options && options.maxAttempts) || 200000;
  let r;
  do { r = m.step(2000); } while(!r.found && r.attempts < limit);
  return r;
}

const Miner = { mine, search, serialize, matchDepth, randomProgram, mutateProgram, buildSeqlib };
global.LodaMiner = Miner;
if(typeof module !== 'undefined' && module.exports) module.exports = Miner;

})(typeof window !== 'undefined' ? window : this);
