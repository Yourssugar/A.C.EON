/* A.C.EON CHESS: связь со Stockfish (UCI через Web Worker).
   Движку передаётся вся партия: position startpos moves e2e4 e7e5 ...
   Так он видит повторения позиций и счётчик 50 ходов. */
(function(){
'use strict';

/* тот же адрес, что в списке загрузчика, чтобы движок взялся из кэша */
var ENGINE_URL=window.Boot?Boot.url('stockfish/stockfish.js'):new URL('../stockfish/stockfish.js',document.currentScript.src).href;

var worker=null,ready=false,loading=false,busy=false;
var moveCb=null,depthCb=null,readyCbs=[],failCbs=[],timer=null,lastError='';
var stale=0;   // сколько bestmove ещё придёт от прерванных поисков

function clearTimer(){if(timer){clearTimeout(timer);timer=null;}}
function reset(){
  clearTimer();
  if(worker){try{worker.terminate();}catch(e){}}
  worker=null;ready=false;loading=false;busy=false;moveCb=null;depthCb=null;stale=0;
}
function fail(text){
  lastError=text||'ENGINE FAILED';
  var cbs=failCbs.splice(0);readyCbs.splice(0);
  reset();
  cbs.forEach(function(cb){try{cb(lastError);}catch(e){}});
}
function markReady(){
  clearTimer();ready=true;loading=false;
  var cbs=readyCbs.splice(0);failCbs.splice(0);
  cbs.forEach(function(cb){try{cb();}catch(e){}});
}
function onLine(line){
  line=String(line||'').trim();
  if(!line)return;
  if(line==='uciok'){worker.postMessage('isready');return;}
  if(line==='readyok'){if(!ready)markReady();return;}
  if(line.indexOf('bestmove')===0&&stale>0){stale--;return;}
  if(stale>0)return;
  if(line.indexOf('info depth')===0&&depthCb){
    var m=line.match(/\bdepth\s+(\d+)/);
    if(m)depthCb(parseInt(m[1],10));
    return;
  }
  if(line.indexOf('bestmove')===0&&moveCb){
    var best=line.split(/\s+/)[1];
    var cb=moveCb;moveCb=null;depthCb=null;busy=false;
    cb(best&&best!=='(none)'?best:null);
  }
}

function load(onReady,onFail){
  if(ready){if(onReady)onReady();return;}
  if(onReady)readyCbs.push(onReady);
  if(onFail)failCbs.push(onFail);
  if(loading)return;
  loading=true;lastError='';
  try{worker=new Worker(ENGINE_URL);}catch(e){fail('ENGINE WORKER BLOCKED');return;}
  worker.onerror=function(){fail('ENGINE FILES MISSING');};
  worker.onmessage=function(e){String(e.data||'').split(/\r?\n/).forEach(onLine);};
  timer=setTimeout(function(){fail('ENGINE TIMEOUT');},12000);
  worker.postMessage('uci');
}

/* opts: {moves:[uci...], depth, movetime (сек), skill, contempt, onDepth} */
function go(opts,onMove){
  if(!worker||!ready||busy)return false;
  busy=true;moveCb=onMove;depthCb=opts.onDepth||null;
  if(opts.skill!=null)worker.postMessage('setoption name Skill Level value '+opts.skill);
  if(opts.contempt!=null)worker.postMessage('setoption name Contempt value '+opts.contempt);
  worker.postMessage('position startpos'+(opts.moves&&opts.moves.length?' moves '+opts.moves.join(' '):''));
  var cmd='go';
  if(opts.depth)cmd+=' depth '+opts.depth;
  if(opts.movetime)cmd+=' movetime '+Math.max(100,Math.round(opts.movetime*1000));
  worker.postMessage(cmd);
  return true;
}

/* остановить поиск и забыть ответ (новая партия, смена режима) */
function cancel(){
  if(worker&&busy){worker.postMessage('stop');stale++;}
  busy=false;moveCb=null;depthCb=null;
}
function newGame(){
  cancel();
  if(worker&&ready){worker.postMessage('ucinewgame');worker.postMessage('isready');}
}

window.Engine={load:load,go:go,cancel:cancel,newGame:newGame,
  isReady:function(){return ready;},lastError:function(){return lastError;}};
})();
