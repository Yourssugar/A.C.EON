/* База целей для майнера LODA: последовательности OEIS, с которыми сверяемся.

   Форматы, которые понимает модуль:
   1. Наш бандл (компактный, для браузера): строки "Axxxxxx offset t0,t1,t2,..."
      Смещение хранится явно, потому что майнеру надо знать, с какого n
      начинаются термы.
   2. b-файл OEIS: строки "index value", первая строка задаёт offset.
   3. stripped OEIS: строки "Axxxxxx ,t0,t1,t2,". Смещения там нет,
      берём 0 по умолчанию или задаём отдельно.

   Термы держим на BigInt: значения OEIS выходят далеко за пределы обычных чисел.
   Модуль ничего не грузит из сети сам: браузер сам заберёт бандл с Pages
   и передаст сюда текст. */

(function(global){
'use strict';

function toBig(s){ return BigInt(String(s).trim()); }

function parseBundle(text){
  const map = new Map();
  const lines = String(text).split('\n');
  for(let raw of lines){
    const line = raw.trim();
    if(line === '' || line[0] === '#') continue;
    const parts = line.split(/\s+/);
    if(parts.length < 3) continue; // нужен id, offset и хотя бы список термов
    const id = parts[0];
    const offset = Number(parts[1]);
    const terms = parts[2].split(',').filter(x => x !== '').map(toBig);
    if(terms.length) map.set(id, { id, offset, terms });
  }
  return map;
}

function parseBFile(text){
  const terms = [];
  let offset = null;
  const lines = String(text).split('\n');
  for(let raw of lines){
    let line = raw.trim();
    if(line === '' || line[0] === '#') continue;
    const sp = line.split(/\s+/);
    if(sp.length < 2) continue;
    const idx = Number(sp[0]);
    if(offset === null) offset = idx;
    terms.push(toBig(sp[1]));
  }
  return { offset: offset === null ? 0 : offset, terms };
}

function parseStripped(text, offsetById){
  const map = new Map();
  const lines = String(text).split('\n');
  for(let raw of lines){
    const line = raw.trim();
    if(line === '' || line[0] === '#') continue;
    const sp = line.indexOf(' ');
    if(sp < 0) continue;
    const id = line.slice(0, sp);
    const rest = line.slice(sp + 1).trim().replace(/^,/, '').replace(/,$/, '');
    if(rest === '') continue;
    const terms = rest.split(',').filter(x => x !== '').map(toBig);
    const offset = (offsetById && offsetById[id] !== undefined) ? offsetById[id] : 0;
    map.set(id, { id, offset, terms });
  }
  return map;
}

function Loader(bundleText){
  const map = parseBundle(bundleText);
  const ids = Array.from(map.keys());
  return {
    count: ids.length,
    ids: function(){ return ids.slice(); },
    get: function(id){ return map.get(id) || null; },
    random: function(rng){
      const r = rng ? rng() : Math.random();
      return map.get(ids[(r * ids.length) | 0]);
    },
    each: function(fn){ map.forEach(fn); }
  };
}

const Targets = { parseBundle, parseBFile, parseStripped, Loader };
global.LodaTargets = Targets;
if(typeof module !== 'undefined' && module.exports) module.exports = Targets;

})(typeof window !== 'undefined' ? window : this);
