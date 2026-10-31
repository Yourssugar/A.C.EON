/* A.C.EON TETRIS: правила. Без DOM, всё состояние в одном объекте, его можно сохранить в JSON.

   Поле 10 x 22: строки 0-1 скрыты (там появляются фигуры), видны строки 2-21.
   Клетка поля: 0 пусто, буква фигуры ('I','O','T','S','Z','J','L') или 'G' (мусор).

   Механика как в современных версиях: мешок из 7 фигур, запас (hold), повороты SRS
   с отскоками от стен, задержка фиксации 0,5 с (не больше 15 сбросов), очки за T-spin,
   комбо, «бэк-ту-бэк» и полную очистку поля.

   TetRules.create(opts)      opts: {mode, level, seed, dig:'clear'|'rise'}
   TetRules.update(st, ms)    гравитация, фиксация, пауза на очистку линий, режимы; события в st.ev
   TetRules.move(st,dx) / rotate(st,dir) / hold(st) / hardDrop(st) / st.soft = true|false
   TetRules.cells(st, piece)  клетки фигуры на поле, ghostY(st)   где фигура упадёт */
(function(){
'use strict';

var W=10,H=22,HIDDEN=2;
var TYPES=['I','O','T','S','Z','J','L'];

/* формы в положении 0 (y вниз), остальные получаются поворотом рамки */
var BASE={
  I:{n:4,c:[[0,1],[1,1],[2,1],[3,1]]},
  O:{n:4,c:[[1,0],[2,0],[1,1],[2,1]]},
  T:{n:3,c:[[1,0],[0,1],[1,1],[2,1]]},
  S:{n:3,c:[[1,0],[2,0],[0,1],[1,1]]},
  Z:{n:3,c:[[0,0],[1,0],[1,1],[2,1]]},
  J:{n:3,c:[[0,0],[0,1],[1,1],[2,1]]},
  L:{n:3,c:[[2,0],[0,1],[1,1],[2,1]]}
};
var SHAPES={};
TYPES.forEach(function(t){
  var b=BASE[t],st=[b.c];
  for(var r=1;r<4;r++){
    if(t==='O'){st.push(b.c);continue;}
    st.push(st[r-1].map(function(p){return [b.n-1-p[1],p[0]];}));
  }
  SHAPES[t]=st;
});

/* таблицы отскоков SRS: [x, y вверх], ключ "из>в" */
var K_JLSTZ={
  '0>1':[[0,0],[-1,0],[-1,1],[0,-2],[-1,-2]],'1>0':[[0,0],[1,0],[1,-1],[0,2],[1,2]],
  '1>2':[[0,0],[1,0],[1,-1],[0,2],[1,2]],'2>1':[[0,0],[-1,0],[-1,1],[0,-2],[-1,-2]],
  '2>3':[[0,0],[1,0],[1,1],[0,-2],[1,-2]],'3>2':[[0,0],[-1,0],[-1,-1],[0,2],[-1,2]],
  '3>0':[[0,0],[-1,0],[-1,-1],[0,2],[-1,2]],'0>3':[[0,0],[1,0],[1,1],[0,-2],[1,-2]]
};
var K_I={
  '0>1':[[0,0],[-2,0],[1,0],[-2,-1],[1,2]],'1>0':[[0,0],[2,0],[-1,0],[2,1],[-1,-2]],
  '1>2':[[0,0],[-1,0],[2,0],[-1,2],[2,-1]],'2>1':[[0,0],[1,0],[-2,0],[1,-2],[-2,1]],
  '2>3':[[0,0],[2,0],[-1,0],[2,1],[-1,-2]],'3>2':[[0,0],[-2,0],[1,0],[-2,-1],[1,2]],
  '3>0':[[0,0],[1,0],[-2,0],[1,-2],[-2,1]],'0>3':[[0,0],[-1,0],[2,0],[-1,2],[2,-1]]
};

/* очки за линии (умножаются на уровень) */
var LINE_PTS=[0,100,300,500,800];
var TSPIN_PTS=[400,800,1200,1600];
var TSPIN_MINI_PTS=[100,200,400];
var PERFECT_PTS=[0,800,1200,1800,2000];

var LOCK_MS=500,LOCK_RESETS=15,CLEAR_MS=260,ULTRA_MS=120000,SPRINT_LINES=40,DIG_ROWS=10;

/* генератор случайных чисел с состоянием в числе (переживает сохранение) */
function rnd(st){
  var a=st.seed=(st.seed+0x6D2B79F5)|0;
  var t=Math.imul(a^(a>>>15),1|a);
  t=(t+Math.imul(t^(t>>>7),61|t))^t;
  return ((t^(t>>>14))>>>0)/4294967296;
}
function refill(st){
  var bag=TYPES.slice();
  for(var i=bag.length-1;i>0;i--){var j=Math.floor(rnd(st)*(i+1)),x=bag[i];bag[i]=bag[j];bag[j]=x;}
  st.queue=st.queue.concat(bag);
}
function emptyRow(){var r=[];for(var i=0;i<W;i++)r.push(0);return r;}

/* скорость падения: секунды на строку по формуле современных версий */
function gravityMs(level){
  var l=Math.min(20,Math.max(1,level));
  return Math.pow(0.8-(l-1)*0.007,l-1)*1000;
}

function create(o){
  o=o||{};
  var st={
    mode:o.mode||'marathon',startLevel:Math.max(1,Math.min(15,o.level||1)),dig:o.dig||'clear',
    seed:(o.seed==null?Math.floor(Math.random()*4294967296):o.seed)|0,
    board:[],queue:[],cur:null,hold:null,holdUsed:false,
    score:0,lines:0,level:1,pieces:0,time:0,
    combo:-1,b2b:false,tetrises:0,tspins:0,maxCombo:0,perfects:0,
    gAcc:0,lockT:0,resets:0,lowest:0,soft:false,
    clearRows:null,clearT:0,
    riseT:0,garbageHole:-1,zenWipes:0,
    over:false,done:false,ev:[]
  };
  for(var r=0;r<H;r++)st.board.push(emptyRow());
  st.level=st.mode==='marathon'?st.startLevel:1;
  if(st.mode==='dig'){
    var n=st.dig==='clear'?DIG_ROWS:5;
    for(var k=0;k<n;k++)pushGarbage(st);
  }
  refill(st);refill(st);
  spawn(st);
  return st;
}

/* ── проверки ── */
function cells(st,p){
  var sh=SHAPES[p.t][p.r],out=[];
  for(var i=0;i<4;i++)out.push([p.x+sh[i][0],p.y+sh[i][1]]);
  return out;
}
function fits(st,p){
  var sh=SHAPES[p.t][p.r];
  for(var i=0;i<4;i++){
    var x=p.x+sh[i][0],y=p.y+sh[i][1];
    if(x<0||x>=W||y>=H)return false;
    if(y>=0&&st.board[y][x])return false;
  }
  return true;
}
function grounded(st){var p=st.cur;return !fits(st,{t:p.t,r:p.r,x:p.x,y:p.y+1});}
function ghostY(st){
  var p=st.cur;if(!p)return 0;
  var y=p.y;
  while(fits(st,{t:p.t,r:p.r,x:p.x,y:y+1}))y++;
  return y;
}

/* ── появление фигуры ── */
function spawn(st,type){
  if(!type){
    type=st.queue.shift();
    if(st.queue.length<7)refill(st);
  }
  st.cur={t:type,r:0,x:3,y:0};
  st.gAcc=0;st.lockT=0;st.resets=0;st.lowest=0;st.lastRot=false;st.lastKick=0;
  /* сразу на строку ниже, если можно: фигура появляется у самого верха видимой части */
  if(fits(st,{t:type,r:0,x:3,y:1}))st.cur.y=1;
  st.lowest=st.cur.y;
  if(!fits(st,st.cur)){topOut(st);return false;}
  st.ev.push({type:'spawn'});
  return true;
}
function topOut(st){
  if(st.mode==='zen'){
    /* в дзене проигрыша нет: поле очищается, игра идёт дальше */
    for(var r=0;r<H;r++)st.board[r]=emptyRow();
    st.zenWipes++;
    st.ev.push({type:'wipe'});
    spawn(st,st.cur?st.cur.t:null);
    return;
  }
  st.over=true;st.cur=st.cur||null;
  st.ev.push({type:'over'});
}

/* ── действия игрока ── */
function afterAction(st,rotated){
  st.lastRot=!!rotated;
  if(grounded(st)&&st.resets<LOCK_RESETS){st.lockT=0;st.resets++;}
}
function move(st,dx){
  if(!st.cur||st.over||st.done||st.clearRows)return false;
  var p=st.cur,np={t:p.t,r:p.r,x:p.x+dx,y:p.y};
  if(!fits(st,np))return false;
  st.cur=np;afterAction(st,false);
  st.ev.push({type:'move'});
  return true;
}
function rotate(st,dir){
  if(!st.cur||st.over||st.done||st.clearRows)return false;
  var p=st.cur;if(p.t==='O')return false;
  var to=(p.r+(dir>0?1:3))%4,tab=(p.t==='I'?K_I:K_JLSTZ)[p.r+'>'+to];
  for(var i=0;i<tab.length;i++){
    var np={t:p.t,r:to,x:p.x+tab[i][0],y:p.y-tab[i][1]};
    if(fits(st,np)){
      st.cur=np;st.lastKick=i;afterAction(st,true);
      if(np.y>st.lowest){st.lowest=np.y;st.resets=0;}
      st.ev.push({type:'rotate'});
      return true;
    }
  }
  return false;
}
function hold(st){
  if(!st.cur||st.holdUsed||st.over||st.done||st.clearRows)return false;
  var t=st.cur.t,h=st.hold;
  st.hold=t;st.holdUsed=true;
  st.ev.push({type:'hold'});
  spawn(st,h||null);
  return true;
}
function softStep(st){
  var p=st.cur,np={t:p.t,r:p.r,x:p.x,y:p.y+1};
  if(!fits(st,np))return false;
  st.cur=np;st.lastRot=false;
  if(np.y>st.lowest){st.lowest=np.y;st.resets=0;}
  return true;
}
/* шаг вниз по команде игрока (мягкий сброс жестом или кнопкой): +1 очко */
function stepDown(st){
  if(!st.cur||st.over||st.done||st.clearRows)return false;
  if(!softStep(st))return false;
  st.score+=1;st.gAcc=0;
  return true;
}
function hardDrop(st){
  if(!st.cur||st.over||st.done||st.clearRows)return false;
  var d=0;
  while(softStep(st))d++;
  st.score+=d*2;
  if(d)st.lastRot=false;
  st.ev.push({type:'drop',rows:d,cells:cells(st,st.cur),t:st.cur.t});
  lock(st);
  return true;
}

/* ── T-spin: правило трёх углов ── */
function tspinKind(st){
  var p=st.cur;
  if(p.t!=='T'||!st.lastRot)return null;
  function occ(x,y){return x<0||x>=W||y>=H||(y>=0&&!!st.board[y][x]);}
  var cx=p.x+1,cy=p.y+1;
  var c=[occ(cx-1,cy-1),occ(cx+1,cy-1),occ(cx+1,cy+1),occ(cx-1,cy+1)];   // лв, пв, пн, лн
  var n=c.filter(Boolean).length;
  if(n<3)return null;
  /* «передние» углы смотрят туда же, куда острие T */
  var front={0:[0,1],1:[1,2],2:[2,3],3:[3,0]}[p.r];
  var f=(c[front[0]]?1:0)+(c[front[1]]?1:0);
  if(f===2||st.lastKick===4)return 'full';
  return 'mini';
}

/* ── фиксация и очистка линий ── */
function lock(st){
  var p=st.cur,cs=cells(st,p),above=true;
  var spin=tspinKind(st);
  cs.forEach(function(c){
    if(c[1]>=0)st.board[c[1]][c[0]]=p.t;
    if(c[1]>=HIDDEN)above=false;
  });
  st.pieces++;
  st.cur=null;
  st.ev.push({type:'lock',cells:cs,t:p.t});
  if(above){topOut(st);if(st.over)return;}
  var full=[];
  for(var r=0;r<H;r++){
    var all=true;
    for(var x=0;x<W;x++)if(!st.board[r][x]){all=false;break;}
    if(all)full.push(r);
  }
  score(st,full.length,spin);
  if(full.length){
    st.clearRows=full;st.clearT=CLEAR_MS;
    st.ev.push({type:'clear',rows:full});
  }else{
    nextPiece(st);
  }
}
function score(st,n,spin){
  var lv=st.level,pts=0,hard=false,label=null;
  if(spin==='full'){pts=TSPIN_PTS[n]*lv;hard=n>0;label='tspin'+n;st.tspins++;}
  else if(spin==='mini'){pts=(TSPIN_MINI_PTS[n]||TSPIN_MINI_PTS[2])*lv;hard=n>0;label='tmini'+n;st.tspins++;}
  else if(n){pts=LINE_PTS[n]*lv;hard=n===4;label='lines'+n;}
  var b2b=false;
  if(n){
    if(hard&&st.b2b){pts=Math.floor(pts*1.5);b2b=true;}
    st.b2b=hard;
    st.combo++;
    if(st.combo>0)pts+=50*st.combo*lv;
    if(st.combo>st.maxCombo)st.maxCombo=st.combo;
    if(n===4)st.tetrises++;
  }else{
    st.combo=-1;
  }
  /* полная очистка: после удаления строк поле пустое */
  var perfect=false;
  if(n){
    var left=0;
    for(var r=0;r<H;r++){
      var full=true,any=false;
      for(var x=0;x<W;x++){if(st.board[r][x])any=true;else full=false;}
      if(any&&!full){left++;break;}
    }
    if(!left){perfect=true;pts+=PERFECT_PTS[n]*lv;st.perfects++;}
  }
  st.score+=pts;
  if(label||perfect)st.ev.push({type:'score',label:label,lines:n,pts:pts,b2b:b2b,combo:st.combo,perfect:perfect});
}
function collapse(st){
  var rows=st.clearRows;st.clearRows=null;
  rows.sort(function(a,b){return a-b;});
  rows.forEach(function(r){st.board.splice(r,1);st.board.unshift(emptyRow());});
  var before=st.level;
  st.lines+=rows.length;
  if(st.mode==='marathon')st.level=Math.min(20,st.startLevel+Math.floor(st.lines/10));
  else if(st.mode==='ultra'||(st.mode==='dig'&&st.dig==='rise'))st.level=Math.min(15,1+Math.floor(st.lines/10));
  if(st.level>before)st.ev.push({type:'level',level:st.level});
  /* цели режимов */
  if(st.mode==='sprint'&&st.lines>=SPRINT_LINES){finish(st);return;}
  if(st.mode==='dig'&&st.dig==='clear'&&garbageLeft(st)===0){finish(st);return;}
  nextPiece(st);
}
function nextPiece(st){
  st.holdUsed=false;
  spawn(st);
}
function finish(st){st.done=true;st.cur=null;st.ev.push({type:'done'});}
function garbageLeft(st){
  var n=0;
  for(var r=0;r<H;r++)for(var x=0;x<W;x++)if(st.board[r][x]==='G'){n++;break;}
  return n;
}
/* строка мусора снизу с одной дыркой; дырки чаще идут столбиком */
function pushGarbage(st){
  if(st.garbageHole<0||rnd(st)<0.35)st.garbageHole=Math.floor(rnd(st)*W);
  var row=[];for(var x=0;x<W;x++)row.push(x===st.garbageHole?0:'G');
  var topHit=st.board[0].some(function(v){return !!v;});
  st.board.shift();st.board.push(row);
  /* фигура, в которую въехал мусор, поднимается */
  if(st.cur&&!fits(st,st.cur)){
    var p=st.cur;
    if(fits(st,{t:p.t,r:p.r,x:p.x,y:p.y-1}))p.y--;
  }
  return topHit;
}
function riseMs(st){return Math.max(3500,10000-(st.level-1)*700);}

/* ── ход времени ── */
function update(st,ms){
  if(st.over||st.done)return;
  st.time+=ms;
  if(st.mode==='ultra'&&st.time>=ULTRA_MS){st.time=ULTRA_MS;finish(st);return;}
  if(st.mode==='dig'&&st.dig==='rise'){
    st.riseT+=ms;
    if(st.riseT>=riseMs(st)){
      st.riseT=0;
      var hit=pushGarbage(st);
      st.ev.push({type:'rise'});
      if(hit||(st.cur&&!fits(st,st.cur))){topOut(st);return;}
    }
  }
  if(st.clearRows){
    st.clearT-=ms;
    if(st.clearT<=0)collapse(st);
    return;
  }
  if(!st.cur)return;
  var g=gravityMs(st.level);
  if(st.soft)g=Math.min(g,Math.max(16,g/20));
  st.gAcc+=ms;
  var guard=0;
  while(st.gAcc>=g&&guard++<40){
    st.gAcc-=g;
    if(softStep(st)){if(st.soft)st.score+=1;}
    else{st.gAcc=0;break;}
  }
  if(grounded(st)){
    st.lockT+=ms;
    if(st.lockT>=LOCK_MS)lock(st);
  }else st.lockT=0;
}

window.TetRules={W:W,H:H,HIDDEN:HIDDEN,TYPES:TYPES,SHAPES:SHAPES,SPRINT_LINES:SPRINT_LINES,ULTRA_MS:ULTRA_MS,DIG_ROWS:DIG_ROWS,
  create:create,update:update,move:move,rotate:rotate,hold:hold,hardDrop:hardDrop,stepDown:stepDown,
  cells:cells,fits:fits,ghostY:ghostY,gravityMs:gravityMs,garbageLeft:garbageLeft,riseMs:riseMs};
})();
