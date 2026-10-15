/* A.C.EON CHESS: помощник режима обучения.
   Считает лучший ход и оценку позиции полной силой Stockfish.
   Оценка хода игрока: насколько упали шансы на победу после хода
   (оценка позиции до и после хода, 100 сантипешек = одна пешка).

   Coach.analyse(moves, cb)  cb({best:'e2e4', cp:35}) или cb(null); cp со стороны того, кто ходит
   Coach.classify(before, after)  'good' | 'inacc' | 'mistake' | 'blunder'  (обе оценки со стороны игрока)
   Coach.toCp(score)  {cp}|{mate} -> число */
(function(){
'use strict';

var DEPTH=12;

function toCp(sc){
  if(!sc)return null;
  if(sc.cp!==undefined)return sc.cp;
  return sc.mate>0?10000-sc.mate*10:-10000-sc.mate*10;   // мат в N: почти бесконечно, ближе мат больше
}

function analyse(moves,cb){
  function run(){
    var ok=Engine.go({moves:moves,depth:DEPTH,skill:20,contempt:0},function(best,score){
      cb(best?{best:best,cp:toCp(score)}:null);
    });
    if(!ok)cb(null);
  }
  if(Engine.isReady())run();
  else Engine.load(run,function(){cb(null);});
}

/* оценка хода по падению шансов на победу (модель Lichess).
   Шансы: от -1 (проигрыш) до 1 (выигрыш), считаются из оценки в сантипешках.
   В решённой позиции лишняя пешка почти не меняет шансы, поэтому такой ход не ругаем,
   а в равной позиции та же пешка весит много. */
function chances(cp){return 2/(1+Math.exp(-0.00368208*cp))-1;}
function classify(before,after){
  if(before==null||after==null)return null;
  var drop=chances(before)-chances(after);
  if(drop>=0.3)return 'blunder';
  if(drop>=0.2)return 'mistake';
  if(drop>=0.1)return 'inacc';
  return 'good';
}

window.Coach={analyse:analyse,classify:classify,toCp:toCp,DEPTH:DEPTH};
})();
