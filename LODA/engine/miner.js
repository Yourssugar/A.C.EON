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
  beamSize: 16,         // сколько лучших частичных совпадений держим
  mutantsPer: 4,        // мутантов на одного члена beam за шаг
  freshPer: 10,         // свежих случайных программ за шаг
  loopChance: 0.28,     // доля программ с циклом
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
function bodyInstruction(rng, opts){
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
    const cands = body.filter(x => x.inst.source && x.inst.source.kind === 'const');
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
  const runOptions = opts.runOptions;
  const t = normalizeTarget(target);
  const offset = t.offset;
  const seq = t.terms;
  const need = seq.length;
  const rng = seededRandom((options && options.seed) || 1);

  let beam = [];               // [{prog, depth, text}]
  const seen = new Set();      // дедуп по тексту программы
  let attempts = 0;
  let best = { prog: null, depth: -1, text: '' };
  let found = null;

  function consider(prog){
    prog.offset = offset; // найденная программа должна нести то же смещение, что и цель
    const text = serialize(prog);
    if(seen.has(text)) return;
    seen.add(text);
    attempts++;
    const depth = depthOf(prog, offset, seq, runOptions);
    if(depth < 0) return;
    if(depth > best.depth){ best = { prog, depth, text }; }
    if(depth === need){ found = { prog, text, terms: need }; return; }
    if(depth > 0){
      beam.push({ prog, depth, text });
      beam.sort((a, b) => b.depth - a.depth);
      if(beam.length > opts.beamSize) beam.length = opts.beamSize;
    }
  }

  function step(budget){
    const stopAt = attempts + (budget || 300);
    while(attempts < stopAt && !found){
      for(let i = 0; i < opts.freshPer && !found; i++) consider(randomProgram(rng, opts));
      for(let b = 0; b < beam.length && !found; b++){
        for(let m = 0; m < opts.mutantsPer && !found; m++){
          consider(mutateProgram(beam[b].prog, rng, opts));
        }
      }
    }
    return { attempts, best: { depth: best.depth, text: best.text, need }, found };
  }

  return { step, get attempts(){ return attempts; }, get best(){ return best; }, get found(){ return found; } };
}

/* удобная обёртка для тестов и node: гонять до находки или до предела попыток */
function search(target, options){
  const m = mine(target, options);
  const limit = (options && options.maxAttempts) || 200000;
  let r;
  do { r = m.step(2000); } while(!r.found && r.attempts < limit);
  return r;
}

const Miner = { mine, search, serialize, matchDepth, randomProgram, mutateProgram };
global.LodaMiner = Miner;
if(typeof module !== 'undefined' && module.exports) module.exports = Miner;

})(typeof window !== 'undefined' ? window : this);
