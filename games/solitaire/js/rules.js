/* A.C.EON SOLITAIRE: правила пасьянсов. Без DOM, можно проверять отдельно.

   Карта: {id, s, r, up}  s: 0 пики, 1 червы, 2 бубны, 3 трефы;  r: 1 (туз) .. 13 (король)
   Состояние: {game, opt, seed, piles:{stock,waste,f0..,t0..,c0..}, score, moves, redeals, runs}

   SolRules.create(game, opt, seed)       новая раздача
   SolRules.get(game)                     правила игры: cols, tops, tabs, pickable, accepts, ...
   SolRules.move(st, from, idx, to)       перенос карт (проверка заранее через canMove)
   SolRules.moves(st)                     все осмысленные ходы (для подсказки и «ходов нет»)
   SolRules.best(st, from, idx)           лучшее место для карты по касанию
   SolRules.autoFoundation(st)            безопасные карты на базу, список ходов */
(function(){
'use strict';

function red(c){return c.s===1||c.s===2;}
function top(p){return p[p.length-1];}

/* повторяемая раздача по номеру */
function rng(seed){
  var a=seed>>>0;
  return function(){a=(a+0x6D2B79F5)>>>0;var t=a;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;};
}
function shuffle(a,rand){for(var i=a.length-1;i>0;i--){var j=Math.floor(rand()*(i+1)),x=a[i];a[i]=a[j];a[j]=x;}return a;}
function makeDeck(suitList,copies){
  var d=[],id=0;
  for(var k=0;k<copies;k++)suitList.forEach(function(s){for(var r=1;r<=13;r++)d.push({id:id++,s:s,r:r,up:false});});
  return d;
}
function piles(ids){var o={};ids.forEach(function(i){o[i]=[];});return o;}
function seq(prefix,n){var a=[];for(var i=0;i<n;i++)a.push(prefix+i);return a;}

/* убывающая последовательность с чередованием цвета */
function altRun(cards){
  for(var i=1;i<cards.length;i++)if(red(cards[i])===red(cards[i-1])||cards[i].r!==cards[i-1].r-1)return false;
  return true;
}
/* убывающая последовательность одной масти */
function suitRun(cards){
  for(var i=1;i<cards.length;i++)if(cards[i].s!==cards[i-1].s||cards[i].r!==cards[i-1].r-1)return false;
  return true;
}
/* на базу: туз на пустую, дальше та же масть по возрастанию */
function fitsFoundation(p,c){return p.length===0?c.r===1:(top(p).s===c.s&&top(p).r===c.r-1);}

/* ════════ КОСЫНКА (Klondike) ════════ */
var klondike={
  id:'klondike',cols:7,
  tops:function(){return [{id:'stock',col:0},{id:'waste',col:1},{id:'f0',col:3},{id:'f1',col:4},{id:'f2',col:5},{id:'f3',col:6}];},
  tabs:function(){return seq('t',7);},
  founds:function(){return seq('f',4);},
  deal:function(st,rand){
    var d=shuffle(makeDeck([0,1,2,3],1),rand);
    st.piles=piles(['stock','waste'].concat(seq('f',4),seq('t',7)));
    for(var c=0;c<7;c++)for(var r=0;r<=c;r++){var x=d.pop();x.up=r===c;st.piles['t'+c].push(x);}
    st.piles.stock=d;
  },
  pickable:function(st,pid,idx){
    var p=st.piles[pid];
    if(pid==='stock')return false;
    if(pid==='waste'||pid[0]==='f')return idx===p.length-1;
    return p[idx].up&&altRun(p.slice(idx));
  },
  accepts:function(st,cards,from,to){
    var p=st.piles[to],c=cards[0];
    if(to[0]==='f')return cards.length===1&&fitsFoundation(p,c);
    if(to[0]==='t')return p.length===0?c.r===13:(top(p).up&&red(top(p))!==red(c)&&top(p).r===c.r+1);
    return false;
  },
  after:function(st,from,to){
    var flip=flipTop(st,from);
    var pts=0;
    if(to[0]==='f')pts=from==='waste'?15:10;
    else if(to[0]==='t')pts=from==='waste'?5:from[0]==='f'?-15:3;
    if(flip)pts+=5;
    st.score=Math.max(0,st.score+pts);
  },
  canStock:function(st){
    if(st.piles.stock.length)return true;
    return st.piles.waste.length>0&&st.redeals<redealLimit(st);
  },
  stock:function(st){
    var s=st.piles.stock,w=st.piles.waste;
    if(s.length){for(var i=0;i<st.opt.draw&&s.length;i++){var c=s.pop();c.up=true;w.push(c);}return true;}
    if(w.length&&st.redeals<redealLimit(st)){
      st.redeals++;
      while(w.length){var x=w.pop();x.up=false;s.push(x);}
      if(st.opt.draw===1&&st.redeals>0)st.score=Math.max(0,st.score-20);   // круг колоды без пользы не бесплатный
      return true;
    }
    return false;
  },
  won:function(st){return [0,1,2,3].every(function(i){return st.piles['f'+i].length===13;});},
  /* «ходов нет»: на столе ходов нет и ни одна карта из колоды и сброса никуда не встаёт */
  stuck:function(st,moves){
    if(moves.some(function(m){return m.from!=='stock';}))return false;
    var rest=st.piles.stock.concat(st.piles.waste);
    if(st.piles.stock.length===0&&st.redeals>=redealLimit(st))rest=st.piles.waste.slice(-1);
    return !rest.some(function(c){return canPlaceAnywhere(st,c);});
  }
};
function redealLimit(st){return st.opt.redeals==='inf'?Infinity:+st.opt.redeals;}
function canPlaceAnywhere(st,c){
  var R=get(st.game);
  return R.founds().concat(R.tabs()).some(function(to){return R.accepts(st,[c],'waste',to);});
}
function flipTop(st,pid){
  if(pid[0]!=='t')return false;
  var p=st.piles[pid];
  if(p.length&&!top(p).up){top(p).up=true;return true;}
  return false;
}

/* ════════ ПАУК (Spider) ════════ */
var spider={
  id:'spider',cols:10,
  tops:function(){var a=[{id:'stock',col:0}];for(var i=0;i<8;i++)a.push({id:'f'+i,col:i+2});return a;},
  tabs:function(){return seq('t',10);},
  founds:function(){return seq('f',8);},
  deal:function(st,rand){
    var n=st.opt.suits,list=n===1?[0]:n===2?[0,1]:[0,1,2,3];
    var d=shuffle(makeDeck(list,8/list.length),rand);
    st.piles=piles(['stock'].concat(seq('f',8),seq('t',10)));
    for(var i=0;i<54;i++){var c=d.pop();st.piles['t'+(i%10)].push(c);}
    for(var t=0;t<10;t++)top(st.piles['t'+t]).up=true;
    st.piles.stock=d;
    st.score=500;st.runs=0;
  },
  pickable:function(st,pid,idx){
    if(pid[0]!=='t')return false;
    var p=st.piles[pid];
    return p[idx].up&&suitRun(p.slice(idx));
  },
  accepts:function(st,cards,from,to){
    if(to[0]!=='t')return false;
    var p=st.piles[to];
    return p.length===0||(top(p).up&&top(p).r===cards[0].r+1);
  },
  after:function(st,from,to){
    flipTop(st,from);
    st.score=Math.max(0,st.score-1);
    collectRuns(st,[to]);
  },
  /* сдача из колоды: по карте в каждый столбец, если нет пустых */
  canStock:function(st){
    if(!st.piles.stock.length)return false;
    for(var i=0;i<10;i++)if(!st.piles['t'+i].length)return false;
    return true;
  },
  stock:function(st){
    if(!spider.canStock(st))return false;
    for(var i=0;i<10;i++){var c=st.piles.stock.pop();c.up=true;st.piles['t'+i].push(c);}
    st.score=Math.max(0,st.score-1);
    collectRuns(st,seq('t',10));
    return true;
  },
  won:function(st){return st.runs===8;},
  stuck:function(st,moves){return moves.length===0&&!spider.canStock(st)&&!st.piles.stock.length;},
  stockBlocked:function(st){return st.piles.stock.length>0&&!spider.canStock(st);}
};
/* собранная масть от короля до туза уходит на базу */
function collectRuns(st,ids){
  ids.forEach(function(id){
    var p=st.piles[id];
    if(p.length<13)return;
    var run=p.slice(-13);
    if(run[0].r===13&&run.every(function(c){return c.up;})&&suitRun(run)){
      p.splice(-13);
      st.piles['f'+st.runs].push.apply(st.piles['f'+st.runs],run);
      st.runs++;st.score+=100;
      flipTop(st,id);
      st.lastRun=id;
    }
  });
}

/* ════════ СВОБОДНАЯ ЯЧЕЙКА (FreeCell) ════════ */
var freecell={
  id:'freecell',cols:8,
  tops:function(){var a=[];for(var i=0;i<4;i++)a.push({id:'c'+i,col:i});for(i=0;i<4;i++)a.push({id:'f'+i,col:i+4});return a;},
  tabs:function(){return seq('t',8);},
  founds:function(){return seq('f',4);},
  deal:function(st,rand){
    var d=shuffle(makeDeck([0,1,2,3],1),rand);
    st.piles=piles(seq('c',4).concat(seq('f',4),seq('t',8)));
    for(var i=0;i<52;i++){var c=d.pop();c.up=true;st.piles['t'+(i%8)].push(c);}
  },
  pickable:function(st,pid,idx){
    var p=st.piles[pid];
    if(pid[0]==='c')return true;
    if(pid[0]==='f')return false;
    var run=p.slice(idx);
    return altRun(run)&&run.length<=freecell.maxRun(st,null);
  },
  /* сколько карт можно перенести за раз: (свободные ячейки + 1) * 2^пустые столбцы */
  maxRun:function(st,to){
    var cells=0,empty=0,i;
    for(i=0;i<4;i++)if(!st.piles['c'+i].length)cells++;
    for(i=0;i<8;i++)if(!st.piles['t'+i].length&&('t'+i)!==to)empty++;
    return (cells+1)*Math.pow(2,empty);
  },
  accepts:function(st,cards,from,to){
    var p=st.piles[to],c=cards[0];
    if(to[0]==='c')return cards.length===1&&p.length===0;
    if(to[0]==='f')return cards.length===1&&fitsFoundation(p,c);
    if(cards.length>freecell.maxRun(st,p.length?null:to))return false;
    return p.length===0||(red(top(p))!==red(c)&&top(p).r===c.r+1);
  },
  after:function(st){st.score=0;},
  canStock:function(){return false;},
  stock:function(){return false;},
  won:function(st){return [0,1,2,3].every(function(i){return st.piles['f'+i].length===13;});},
  stuck:function(st,moves){return moves.length===0;}
};

var GAMES={klondike:klondike,spider:spider,freecell:freecell};
function get(g){return GAMES[g];}

function create(game,opt,seed){
  var R=get(game),st={game:game,opt:opt,seed:seed,piles:{},score:0,moves:0,redeals:0,runs:0};
  R.deal(st,rng(seed));
  return st;
}
function allPiles(R){return R.tops().map(function(t){return t.id;}).concat(R.tabs());}

function canMove(st,from,idx,to){
  var R=get(st.game),p=st.piles[from];
  if(from===to||idx<0||idx>=p.length)return false;
  if(!R.pickable(st,from,idx))return false;
  return R.accepts(st,p.slice(idx),from,to);
}
function move(st,from,idx,to){
  var R=get(st.game),cards=st.piles[from].splice(idx);
  Array.prototype.push.apply(st.piles[to],cards);
  st.moves++;
  R.after(st,from,to,cards);
  return cards;
}

/* все осмысленные ходы: без переноса целого столбца в пустой и без перекладывания
   стопки, которая уже лежит на подходящей карте */
function moves(st){
  var R=get(st.game),out=[],ids=allPiles(R);
  ids.forEach(function(from){
    var p=st.piles[from];
    if(!p||!p.length||from==='stock')return;
    for(var idx=0;idx<p.length;idx++){
      if(!R.pickable(st,from,idx))continue;
      var cards=p.slice(idx),c=cards[0];
      ids.forEach(function(to){
        if(to===from||to==='stock'||to==='waste')return;
        if(!R.accepts(st,cards,from,to))return;
        var dst=st.piles[to];
        if(from[0]==='t'&&to[0]==='t'){
          if(idx===0&&dst.length===0)return;                       // столбец целиком в пустой: бессмысленно
          var under=p[idx-1];
          if(under&&under.up&&dst.length&&under.r===c.r+1){
            var same=st.game==='spider'?under.s===c.s:red(under)!==red(c);
            if(same)return;                                       // и так лежит на подходящей карте
          }
        }
        if(from[0]==='c'&&to[0]==='c')return;
        if(from[0]==='f'&&to[0]==='f')return;
        if(from[0]==='f')return;                                    // с базы обратно ходы не подсказываем
        out.push({from:from,idx:idx,to:to,n:cards.length,score:rate(st,from,idx,to)});
      });
    }
  });
  if(R.canStock(st))out.push({from:'stock',idx:-1,to:null,score:-5});
  out.sort(function(a,b){return b.score-a.score;});
  return out;
}
/* оценка хода для подсказки и автохода по касанию */
function rate(st,from,idx,to){
  var p=st.piles[from],c=p[idx],dst=st.piles[to],s=0;
  if(to[0]==='f')s+=50;
  if(from[0]==='t'&&idx>0&&!p[idx-1].up)s+=30;          // открывает закрытую карту
  if(from[0]==='t'&&idx===0)s+=12;                      // освобождает столбец
  if(to[0]==='t'&&dst.length===0)s-=10;
  if(to[0]==='c')s-=20;
  if(st.game==='spider'&&dst.length&&dst[dst.length-1].s===c.s)s+=15;   // своя масть лучше
  if(from==='waste')s+=5;
  if(from[0]==='c')s+=8;
  return s;
}
/* лучшее место для карты, которую коснулись */
function best(st,from,idx){
  var R=get(st.game),p=st.piles[from];
  if(!R.pickable(st,from,idx))return null;
  var list=moves(st).filter(function(m){return m.from===from&&m.idx===idx;});
  if(list.length)return list[0].to;
  /* бессмысленный, но разрешённый ход (например, король в пустой столбец) тоже лучше, чем ничего */
  var ids=allPiles(R);
  for(var i=0;i<ids.length;i++){
    var to=ids[i];if(to===from||to==='stock'||to==='waste')continue;
    if(R.accepts(st,p.slice(idx),from,to))return to;
  }
  return null;
}

/* автосбор: карта уходит на базу, если она точно больше не нужна на столе
   (туз и двойка всегда; остальные, когда обе масти другого цвета уже выше на одну) */
function foundRank(st,suit){
  var R=get(st.game),best=0;
  R.founds().forEach(function(f){var p=st.piles[f];if(p.length&&p[0].s===suit)best=Math.max(best,top(p).r);});
  return best;
}
function safe(st,c){
  if(c.r<=2)return true;
  var opp=red(c)?[0,3]:[1,2];
  return foundRank(st,opp[0])>=c.r-1&&foundRank(st,opp[1])>=c.r-1;
}
function autoFoundation(st){
  if(st.game==='spider')return [];
  var R=get(st.game),done=[],again=true,guard=0;
  var src=R.tabs().concat(st.game==='freecell'?seq('c',4):['waste']);
  while(again&&guard++<60){
    again=false;
    for(var i=0;i<src.length&&!again;i++){
      var p=st.piles[src[i]];if(!p.length)continue;
      var c=top(p);if(!c.up||!safe(st,c))continue;
      var fs=R.founds();
      for(var j=0;j<fs.length;j++){
        if(R.accepts(st,[c],src[i],fs[j])){move(st,src[i],p.length-1,fs[j]);st.moves--;done.push({from:src[i],to:fs[j],id:c.id});again=true;break;}
      }
    }
  }
  return done;
}
/* можно доиграть автоматически: всё открыто, колода пуста (Косынка) или карты лежат по порядку (Свободная ячейка) */
function canFinish(st){
  if(st.game==='spider')return false;
  var R=get(st.game);
  if(st.game==='klondike'&&(st.piles.stock.length||st.piles.waste.length))return false;
  return R.tabs().every(function(t){
    var p=st.piles[t];
    if(!p.every(function(c){return c.up;}))return false;
    if(st.game==='freecell'){for(var i=1;i<p.length;i++)if(p[i].r>p[i-1].r)return false;}
    return true;
  });
}
/* один шаг доигрывания: самая младшая карта, которую можно положить на базу */
function finishStep(st){
  var R=get(st.game),src=R.tabs().concat(st.game==='freecell'?seq('c',4):['waste']),bestM=null;
  src.forEach(function(s){
    var p=st.piles[s];if(!p.length)return;
    var c=top(p);
    R.founds().forEach(function(f){
      if(!bestM||c.r<bestM.r){if(R.accepts(st,[c],s,f))bestM={from:s,to:f,r:c.r,idx:p.length-1};}
    });
  });
  if(!bestM)return null;
  move(st,bestM.from,bestM.idx,bestM.to);
  return bestM;
}

window.SolRules={create:create,get:get,canMove:canMove,move:move,moves:moves,best:best,
  autoFoundation:autoFoundation,canFinish:canFinish,finishStep:finishStep,red:red,allPiles:allPiles};
})();
