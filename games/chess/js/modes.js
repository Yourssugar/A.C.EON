/* A.C.EON CHESS: режимы игры и адаптивный уровень.
   Без DOM, можно проверять отдельно.

   Уровень соперника в адаптивных режимах: целое число от 1 до 28.
   Он переводится в Skill Level Stockfish (0..20, на низких значениях движок
   ошибается намеренно) и глубину расчёта. Соседние уровни отличаются немного. */
(function(){
'use strict';

var MIN=1,MAX=28,START=6;

var MODES={
  beginner:          {kind:'fixed',   depth:2, skill:2, undo:3,        accent:'#00ff88',think:'msg.think'},
  training:          {kind:'training',undo:Infinity,coach:true,        accent:'#b18cff',think:'msg.think'},
  adaptive:          {kind:'adaptive',undo:3,                          accent:'#00e5ff',think:'msg.think'},
  blitz:             {kind:'blitz',   undo:0, clock:true, offset:-2,   accent:'#ffd23a',think:'msg.think'},
  aceon_professional:{kind:'fixed',   depth:10,skill:20,movetime:60,contempt:0, undo:0,accent:'#4fb8ff',think:'msg.thinkAceon',bars:3},
  aceon_expert:      {kind:'fixed',   depth:14,skill:20,movetime:60,contempt:0, undo:0,accent:'#ff8800',think:'msg.thinkExpert',bars:4},
  aceon_grandmaster: {kind:'fixed',   depth:20,skill:20,movetime:60,contempt:50,undo:0,accent:'#ff2d55',think:'msg.thinkGm',bars:5},
  /* вдвоём на одном устройстве: без ИИ, ходят обе стороны по очереди */
  local:             {kind:'local',   undo:Infinity,friend:true,         accent:'#ff2d78'}
};
MODES.beginner.bars=1;

function clamp(L){return Math.max(MIN,Math.min(MAX,Math.round(L)));}

/* уровень 1..28 -> настройки движка */
function levelParams(L){
  L=clamp(L);
  var skill=Math.min(20,L-1);
  var depth=L<=16?1+Math.floor((L-1)/2):Math.min(20,L-8);
  var p={skill:skill,depth:depth,contempt:0};
  if(L>18)p.movetime=10;          // верхние уровни: не дольше 10 с на ход
  return p;
}

/* шкала силы в меню: 1..5 делений */
function levelBars(L){return Math.max(1,Math.min(5,Math.ceil(clamp(L)/MAX*5)));}

/* новый уровень после партии.
   recent: результаты последних партий этого режима, включая эту (1 победа, 0.5 ничья, 0 поражение).
   Победа +1, поражение -1, ничья 0. Если игрок выигрывает больше 70% последних партий
   (и партий хотя бы три), шаг +2; если проигрывает больше 70%, шаг -2. Так уровень быстро доходит до точки,
   где побед и поражений примерно поровну, и дальше колеблется возле неё на 1. */
function nextLevel(L,result,recent){
  var last=recent.slice(-10),s=last.length?last.reduce(function(a,b){return a+b;},0)/last.length:0.5;
  var d=0,big=last.length>=3;           // двойной шаг только когда партий уже хотя бы три
  if(result==='win')d=big&&s>0.7?2:1;
  else if(result==='lose')d=big&&s<0.3?-2:-1;
  return clamp(L+d);
}

function score(result){return result==='win'?1:result==='draw'?0.5:0;}

window.ChessModes={MODES:MODES,KEYS:Object.keys(MODES).filter(function(k){return !MODES[k].friend;}),MIN:MIN,MAX:MAX,START:START,
  clamp:clamp,levelParams:levelParams,levelBars:levelBars,nextLevel:nextLevel,score:score};
})();
