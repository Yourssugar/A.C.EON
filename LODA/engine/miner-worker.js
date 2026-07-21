/* Фоновый поток майнинга.

   Сюда переезжает тяжёлый цикл перебора, чтобы вкладку можно было сворачивать,
   а браузер не душил расчёт. Воркер сам крутит miner.step в своём темпе и шлёт
   прогресс на страницу. Оркестровка (обмен с узлом, таймер, интерфейс) остаётся
   на странице — сюда приходят только команды build / addSeeds / load / stop.

   Опорный набор seq не грузим файлом (там window, которого в воркере нет): его
   текст присылает страница командой init. */

/* global importScripts, LodaMiner */
importScripts('loda.js', 'miner.js');

var SEQLIB = null;
var miner = null;
var running = false;
var fraction = 0.5;
var lastPost = 0;

function nowms(){ return (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now(); }

function loop(){
  if(!running || !miner) return;
  var chunk = Math.max(80, Math.round(900 * fraction)); // в воркере можно крупнее: нет интерфейса, который надо не морозить
  var r = miner.step(chunk);
  if(r.found){
    self.postMessage({ type: 'progress', attempts: r.attempts, depth: r.best.depth < 0 ? 0 : r.best.depth, text: r.best.text, found: r.found.text });
    running = false;
    return;
  }
  var t = nowms();
  if(t - lastPost >= 180){
    lastPost = t;
    self.postMessage({ type: 'progress', attempts: r.attempts, depth: r.best.depth < 0 ? 0 : r.best.depth, text: r.best.text, found: null });
  }
  var gap = fraction >= 0.99 ? 0 : Math.round((1 / fraction - 1) * 8);
  setTimeout(loop, gap);
}

self.onmessage = function(e){
  var m = e.data || {};
  if(m.type === 'init'){
    try { SEQLIB = LodaMiner.buildSeqlib(m.seqlibText || ''); } catch(_){ SEQLIB = null; }
    self.postMessage({ type: 'ready' });
  } else if(m.type === 'load'){
    fraction = m.fraction;
  } else if(m.type === 'build'){
    miner = LodaMiner.mine({ offset: m.offset, terms: m.terms }, { seed: m.seed, seqlib: SEQLIB, seeds: m.seeds || [] });
    running = true;
    lastPost = 0;
    // сразу сообщим стартовую глубину (могла прийти от затравок)
    self.postMessage({ type: 'progress', attempts: 0, depth: miner.best.depth < 0 ? 0 : miner.best.depth, text: miner.best.text, found: null });
    setTimeout(loop, 0);
  } else if(m.type === 'addSeeds'){
    if(miner) miner.addSeeds(m.seeds || []);
  } else if(m.type === 'stop'){
    running = false;
  }
};
