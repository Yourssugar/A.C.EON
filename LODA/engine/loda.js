/* Интерпретатор языка LODA.
   Считает целочисленные последовательности OEIS так же, как эталонный loda-cpp.
   Значения на BigInt: последовательности быстро выходят за пределы обычных чисел,
   и на double термы поехали бы уже к десятому-двадцатому члену.

   Модуль ничего не знает про сеть, сервер и майнер. Только: разобрать текст
   программы, выполнить её на входе n, вернуть a(n) или список термов.
   Операция seq (вызов другой последовательности) требует внешнего резолвера:
   без библиотеки других программ вычислить чужую последовательность нельзя. */

(function(global){
'use strict';

const ZERO = 0n, ONE = 1n;

function absBig(x){ return x < ZERO ? -x : x; }
function gcdBig(a, b){
  a = absBig(a); b = absBig(b);
  while(b){ const t = a % b; a = b; b = t; }
  return a;
}
function powBig(base, exp){
  // exp здесь всегда >= 0; отрицательную степень отсекает вызывающий код
  return base ** exp;
}
function nthRootBig(a, n){
  // наибольшее c >= 0 такое, что c^n <= a, для a >= 0, n >= 1
  if(a < ZERO) return ZERO;
  if(a < 2n) return a;
  let lo = ZERO, hi = a;
  while(lo < hi){
    const mid = (lo + hi + ONE) >> ONE;
    if(mid ** n <= a) lo = mid; else hi = mid - ONE;
  }
  return lo;
}
function digitSumBig(x, base){
  x = absBig(x);
  let s = ZERO;
  while(x > ZERO){ s += x % base; x /= base; }
  return s;
}
function digitalRootBig(x, base){
  x = absBig(x);
  while(x >= base) x = digitSumBig(x, base);
  return x;
}
function binomProd(n, k){
  // C(n,k) через падающий факториал для k >= 0 и любого целого n
  if(k < ZERO) return ZERO;
  if(k > 100000n) throw runtimeError('слишком большой аргумент bin');
  let num = ONE;
  for(let i = ZERO; i < k; i++) num *= (n - i);
  let den = ONE;
  for(let i = 2n; i <= k; i++) den *= i;
  return num / den;
}
function binomBig(n, k){
  if(k < ZERO){
    // отрицательное k: ненулевой результат только при k <= n < 0 (Кроненбург)
    if(n < ZERO && k <= n){
      const sign = ((n - k) % 2n === ZERO) ? ONE : -ONE;
      return sign * binomProd(-k - ONE, n - k);
    }
    return ZERO;
  }
  return binomProd(n, k);
}
function fallingRising(a, b){
  const count = absBig(b);
  if(count === ZERO) return ONE;
  if(count > 100000n) throw runtimeError('слишком большой аргумент fac');
  let r = ONE, x = a;
  const stepDown = b < ZERO; // b<0 падающий, b>0 восходящий
  for(let i = ZERO; i < count; i++){
    r *= x;
    x = stepDown ? (x - ONE) : (x + ONE);
  }
  return r;
}
function largestExponent(a, b){
  if(a === ZERO) return ZERO;
  const bb = absBig(b);
  if(bb <= ONE) return ZERO;
  let t = absBig(a), k = ZERO;
  while(t % bb === ZERO){ t /= bb; k++; }
  return k;
}
function discreteLog(a, b){
  if(b < 2n || a < ONE) return ZERO;
  let c = ZERO, p = ONE;
  while(p * b <= a){ p *= b; c++; }
  return c;
}
function repeatedDiv(a, b){
  // делим a на b столько раз, сколько делится нацело
  if(b === ZERO || b === ONE || b === -ONE) return a;
  let r = a;
  while(r !== ZERO && r % b === ZERO) r /= b;
  return r;
}

function parseError(msg, line){ const e = new Error(msg); e.name = 'LodaParseError'; e.line = line; return e; }
function runtimeError(msg){ const e = new Error(msg); e.name = 'LodaRuntimeError'; return e; }

const BINARY_OPS = new Set([
  'mov','add','sub','trn','mul','div','dif','dir','mod','pow',
  'bin','fac','gcd','lex','log','nrt','dgs','dgr',
  'equ','neq','leq','geq','min','max',
  'ban','bor','bxo',
  'clr','fil','rol','ror','seq'
]);

function parseOperand(tok, lineNo){
  tok = tok.trim();
  if(/^-?\d+$/.test(tok)) return { kind:'const', value: BigInt(tok) };
  const m = /^(\$+)(\d+)$/.exec(tok);
  if(!m) throw parseError('Не разобрать операнд: ' + tok, lineNo);
  return { kind:'cell', deref: m[1].length, base: Number(m[2]) };
}

function parse(source){
  const lines = String(source).split('\n');
  const instrs = [];
  let offset = 0;
  for(let i = 0; i < lines.length; i++){
    let line = lines[i];
    const sc = line.indexOf(';');
    if(sc >= 0) line = line.slice(0, sc);
    line = line.trim();
    if(line === '') continue;
    if(line[0] === '#'){
      const off = /^#offset\s+(-?\d+)/.exec(line);
      if(off) offset = Number(off[1]);
      continue; // прочие директивы игнорируем
    }
    const sp = line.search(/\s/);
    const op = (sp < 0 ? line : line.slice(0, sp)).toLowerCase();
    const rest = sp < 0 ? '' : line.slice(sp).trim();
    if(op === 'lpe'){ instrs.push({ op:'lpe', line:i }); continue; }
    const args = rest === '' ? [] : rest.split(',').map(t => parseOperand(t, i));
    if(op === 'lpb'){
      if(args.length < 1) throw parseError('lpb без операнда', i);
      instrs.push({ op:'lpb', target:args[0], lenOp:args[1] || null, line:i });
      continue;
    }
    if(!BINARY_OPS.has(op)) throw parseError('Неизвестная операция: ' + op, i);
    if(args.length !== 2) throw parseError(op + ' ожидает два операнда', i);
    instrs.push({ op, target:args[0], source:args[1], line:i });
  }
  // сопоставляем lpb и lpe как скобки
  const stack = [];
  for(let ip = 0; ip < instrs.length; ip++){
    if(instrs[ip].op === 'lpb') stack.push(ip);
    else if(instrs[ip].op === 'lpe'){
      const open = stack.pop();
      if(open === undefined) throw parseError('lpe без lpb', instrs[ip].line);
      instrs[open].lpeIp = ip;
      instrs[ip].lpbIp = open;
    }
  }
  if(stack.length) throw parseError('lpb без закрывающего lpe', instrs[stack.pop()].line);
  return { instrs, offset };
}

function makeMachine(instrs, options){
  const maxSteps = options.maxSteps || 5e6;
  const maxBits = options.maxBits || 4096; // предел величины значения, дальше считаем переполнением
  const seqResolver = options.seq || null;
  const mem = new Map();

  function get(i){ const v = mem.get(i); return v === undefined ? ZERO : v; }
  function set(i, v){
    if(v > ZERO && v.toString(2).length > maxBits) throw runtimeError('переполнение');
    if(v < ZERO && (-v).toString(2).length > maxBits) throw runtimeError('переполнение');
    if(v === ZERO) mem.delete(i); else mem.set(i, v);
  }
  function address(op){
    let addr = op.base;
    for(let d = 1; d < op.deref; d++){
      addr = Number(get(addr));
      if(addr < 0) throw runtimeError('отрицательный индекс памяти');
    }
    return addr;
  }
  function read(op){ return op.kind === 'const' ? op.value : get(address(op)); }
  function write(op, v){
    if(op.kind === 'const') throw runtimeError('запись в константу');
    set(address(op), v);
  }
  function regionIndices(start, len){
    const L = Number(len);
    if(L === 0) return [];
    const from = L > 0 ? start : start + L + 1;
    if(from < 0) throw runtimeError('регион уходит в отрицательный индекс');
    const count = Math.abs(L);
    const idx = new Array(count);
    for(let j = 0; j < count; j++) idx[j] = from + j;
    return idx;
  }

  function apply(inst){
    const a = read(inst.target);
    const b = read(inst.source);
    let r;
    switch(inst.op){
      case 'mov': r = b; break;
      case 'add': r = a + b; break;
      case 'sub': r = a - b; break;
      case 'trn': r = a - b; if(r < ZERO) r = ZERO; break;
      case 'mul': r = a * b; break;
      case 'div': if(b === ZERO) throw runtimeError('деление на ноль'); r = a / b; break; // BigInt делит с усечением к нулю
      case 'dif': r = (b !== ZERO && a % b === ZERO) ? a / b : a; break;
      case 'dir': r = repeatedDiv(a, b); break;
      case 'mod': if(b === ZERO) throw runtimeError('остаток от деления на ноль'); r = a % b; break;
      case 'pow':
        if(b < ZERO){
          if(a === ONE) r = ONE;
          else if(a === -ONE) r = (b % 2n === ZERO ? ONE : -ONE);
          else r = ZERO;
        } else {
          if(b > 1000000n) throw runtimeError('слишком большая степень');
          r = powBig(a, b);
        }
        break;
      case 'bin': r = binomBig(a, b); break;
      case 'fac': r = fallingRising(a, b); break;
      case 'gcd': r = gcdBig(a, b); break;
      case 'lex': r = largestExponent(a, b); break;
      case 'log': r = discreteLog(a, b); break;
      case 'nrt': r = nthRootBig(a, b < ONE ? ONE : b); break;
      case 'dgs': r = (a < ZERO ? -ONE : ONE) * digitSumBig(a, b); break;
      case 'dgr': r = (a < ZERO ? -ONE : ONE) * digitalRootBig(a, b); break;
      case 'equ': r = (a === b) ? ONE : ZERO; break;
      case 'neq': r = (a !== b) ? ONE : ZERO; break;
      case 'leq': r = (a <= b) ? ONE : ZERO; break;
      case 'geq': r = (a >= b) ? ONE : ZERO; break;
      case 'min': r = a < b ? a : b; break;
      case 'max': r = a > b ? a : b; break;
      case 'ban': r = a & b; break;
      case 'bor': r = a | b; break;
      case 'bxo': r = a ^ b; break;
      case 'seq': {
        if(!seqResolver) throw runtimeError('seq требует резолвера последовательностей');
        r = seqResolver(Number(b), a);
        break;
      }
      case 'clr': case 'fil': case 'rol': case 'ror': {
        const start = address(inst.target);
        const idx = regionIndices(start, b);
        if(inst.op === 'clr'){ for(const i of idx) set(i, ZERO); }
        else if(inst.op === 'fil'){ const v = get(start); for(const i of idx) set(i, v); }
        else if(idx.length > 1){
          const vals = idx.map(get);
          const rot = inst.op === 'rol'
            ? vals.slice(1).concat(vals[0])
            : [vals[vals.length - 1]].concat(vals.slice(0, vals.length - 1));
          for(let j = 0; j < idx.length; j++) set(idx[j], rot[j]);
        }
        return; // региональные операции пишут сами
      }
    }
    write(inst.target, r);
  }

  function region(start, len){ return regionIndices(start, len).map(get); }
  function lexLess(cur, prev){
    for(let i = 0; i < cur.length; i++){
      if(cur[i] < prev[i]) return true;
      if(cur[i] > prev[i]) return false;
    }
    return false; // равны, значит не строго меньше
  }
  function allNonNeg(v){ for(const x of v) if(x < ZERO) return false; return true; }

  function run(n){
    mem.clear();
    set(0, BigInt(n));
    let ip = 0, steps = 0;
    const loops = [];
    while(ip < instrs.length){
      if(++steps > maxSteps) throw runtimeError('превышен лимит шагов');
      const inst = instrs[ip];
      if(inst.op === 'lpb'){
        const start = address(inst.target);
        const len = inst.lenOp ? Number(read(inst.lenOp)) : 1;
        loops.push({
          bodyStart: ip + 1,
          lpeIp: inst.lpeIp,
          target: inst.target,
          lenOp: inst.lenOp,
          prevLen: len,
          prevRegion: region(start, len),
          memBefore: new Map(mem)
        });
        ip = ip + 1;
        continue;
      }
      if(inst.op === 'lpe'){
        const f = loops[loops.length - 1];
        const start2 = address(f.target);
        const len2 = f.lenOp ? Number(read(f.lenOp)) : 1;
        const minLen = Math.min(f.prevLen, len2);
        const cur = region(start2, minLen);
        const prev = f.prevRegion.slice(0, minLen);
        if(lexLess(cur, prev) && allNonNeg(cur)){
          f.prevRegion = region(start2, len2);
          f.prevLen = len2;
          f.memBefore = new Map(mem);
          ip = f.bodyStart;
        } else {
          mem.clear();
          for(const [k, v] of f.memBefore) mem.set(k, v);
          loops.pop();
          ip = f.lpeIp + 1;
        }
        continue;
      }
      apply(inst);
      ip++;
    }
    return get(0);
  }

  return { run };
}

function machine(program, options){
  // строим машину один раз и берём термы по одному; майнер так отбраковывает
  // кандидата на первом же расхождении, не считая остальные термы впустую
  const prog = typeof program === 'string' ? parse(program) : program;
  const m = makeMachine(prog.instrs, options || {});
  return { offset: prog.offset, term(i){ return m.run(i); } };
}

function run(program, n, options){
  const prog = typeof program === 'string' ? parse(program) : program;
  return makeMachine(prog.instrs, options || {}).run(n);
}

function evaluate(program, count, options){
  const prog = typeof program === 'string' ? parse(program) : program;
  const machine = makeMachine(prog.instrs, options || {});
  const terms = [];
  for(let i = 0; i < count; i++) terms.push(machine.run(prog.offset + i));
  return terms;
}

function tryTerms(program, count, options){
  const prog = typeof program === 'string' ? parse(program) : program;
  const machine = makeMachine(prog.instrs, options || {});
  const terms = [];
  for(let i = 0; i < count; i++){
    try { terms.push(machine.run(prog.offset + i)); }
    catch(e){ return { ok:false, terms, failedAt:i, error:e.message }; }
  }
  return { ok:true, terms };
}

const LODA = { parse, machine, run, evaluate, tryTerms };
global.LODA = LODA;
if(typeof module !== 'undefined' && module.exports) module.exports = LODA;

})(typeof window !== 'undefined' ? window : this);
