/* A.C.EON TETRIS: компьютерный соперник для дуэли. Без DOM.

   Перебирает все положения текущей фигуры (и фигуры из запаса на сложном уровне),
   которые достижимы обычными действиями: поворот у верха, сдвиг, сброс. Каждое положение
   оценивается по полю после фиксации: высота, дыры, неровность, убранные линии.
   Потом нажимает кнопки по очереди со своей скоростью, как живой игрок.

   var ai = TetAI(level)       'easy' | 'normal' | 'hard'
   ai.step(st, ms)             вызывать каждый кадр: думает и делает ходы в состоянии st */
(function(){
'use strict';

var R=window.TetRules,W=R.W,H=R.H;

/* скорость и ошибки по уровням */
var LEVELS={
  easy:  {think:650,act:150,miss:0.15,noise:0.8,hold:false,look:false},
  normal:{think:320,act:75,miss:0.06,noise:0.35,hold:true,look:false},
  hard:  {think:140,act:38,miss:0,noise:0,hold:true,look:true}
};
/* веса оценки (подобраны по известным эвристикам для тетриса) */
var WT={height:-0.51,lines:0.76,holes:-0.36,bump:-0.18,well:-0.06,top:-0.6};

function fakeSt(board,p){return {board:board,cur:{t:p.t,r:p.r,x:p.x,y:p.y},ev:[],resets:0,lowest:p.y,over:false,done:false,clearRows:null,lockT:0};}

/* все достижимые положения фигуры типа t с появления: [{r, x, rot:[...], moves:n, cells}] */
function placements(board,t){
  var out=[],seen={};
  var start={t:t,r:0,x:3,y:0};
  var s0=fakeSt(board,start);
  if(R.fits(s0,{t:t,r:0,x:3,y:1}))s0.cur.y=1;
  if(!R.fits(s0,s0.cur))return out;
  var rots=t==='O'?[[]]:[[],['cw'],['cw','cw'],['ccw']];
  rots.forEach(function(seq){
    var a=fakeSt(board,s0.cur);
    for(var i=0;i<seq.length;i++)if(!R.rotate(a,seq[i]==='cw'?1:-1))return;
    var base=a.cur;
    [-1,1].forEach(function(dir){
      var b=fakeSt(board,base),n=0;
      while(true){
        var key=b.cur.r+':'+b.cur.x;
        if(!seen[key]){
          seen[key]=1;
          var y=R.ghostY(b);
          var fin={t:t,r:b.cur.r,x:b.cur.x,y:y};
          out.push({rot:seq,dx:b.cur.x-base.x,cells:R.cells(b,fin),r:b.cur.r,x:b.cur.x});
        }
        if(!R.move(b,dir))break;
        if(++n>12)break;
      }
    });
  });
  return out;
}

/* поле после фиксации и очистки: высоты столбцов и счёт признаков */
function evaluate(board,cells){
  var g=board.map(function(row){return row.slice();});
  cells.forEach(function(c){if(c[1]>=0)g[c[1]][c[0]]='X';});
  var lines=0;
  for(var r=H-1;r>=0;r--){
    var full=true;for(var x=0;x<W;x++)if(!g[r][x]){full=false;break;}
    if(full){g.splice(r,1);var e=[];for(x=0;x<W;x++)e.push(0);g.unshift(e);lines++;r++;}
  }
  var h=[],holes=0,maxH=0;
  for(x=0;x<W;x++){
    var top=H;
    for(r=0;r<H;r++)if(g[r][x]){top=r;break;}
    var hh=H-top;h.push(hh);if(hh>maxH)maxH=hh;
    for(r=top+1;r<H;r++)if(!g[r][x])holes++;
  }
  var agg=0,bump=0,well=0;
  for(x=0;x<W;x++){
    agg+=h[x];
    if(x<W-1)bump+=Math.abs(h[x]-h[x+1]);
    var l=x>0?h[x-1]:99,rr=x<W-1?h[x+1]:99,d=Math.min(l,rr)-h[x];
    if(d>2)well+=d;
  }
  /* опасная высота: штраф растёт резко, когда стопка выше середины */
  var danger=Math.max(0,maxH-12);
  var lineScore=lines===4?lines*2.2:lines;
  return {score:WT.height*agg+WT.lines*lineScore*(maxH>9?1.6:1)+WT.holes*holes*2+WT.bump*bump+WT.well*well+WT.top*danger*danger,board:g};
}

window.TetAI=function(level){
  var L=LEVELS[level]||LEVELS.normal;
  var plan=null,wait=L.think,acc=0;

  function best(st){
    var opts=[];
    function consider(t,useHold){
      placements(st.board,t).forEach(function(p){
        var e=evaluate(st.board,p.cells),sc=e.score;
        /* на сложном: заглянуть на одну фигуру вперёд */
        if(L.look){
          var nt=useHold?(st.hold?st.queue[0]:st.queue[1]):st.queue[0];
          var bb=-1e9;
          placements(e.board,nt).forEach(function(q){var v=evaluate(e.board,q.cells).score;if(v>bb)bb=v;});
          if(bb>-1e9)sc=sc*0.5+bb*0.5;
        }
        if(L.noise)sc+=(Math.random()-.5)*L.noise*2;
        opts.push({p:p,sc:sc,hold:useHold});
      });
    }
    consider(st.cur.t,false);
    if(L.hold&&!st.holdUsed){
      var ht=st.hold||st.queue[0];
      if(ht&&ht!==st.cur.t)consider(ht,true);
    }
    if(!opts.length)return null;
    opts.sort(function(a,b){return b.sc-a.sc;});
    /* лёгкий иногда берёт не лучший вариант */
    var pick=opts[0];
    if(L.miss&&Math.random()<L.miss)pick=opts[Math.min(opts.length-1,1+Math.floor(Math.random()*Math.min(5,opts.length-1)))];
    var acts=[];
    if(pick.hold)acts.push('hold');
    pick.p.rot.forEach(function(r){acts.push(r);});
    var n=Math.abs(pick.p.dx);for(var i=0;i<n;i++)acts.push(pick.p.dx<0?'left':'right');
    acts.push('drop');
    return {acts:acts,target:pick.p};
  }

  /* план привязан к номеру фигуры: новая фигура, значит думать заново (с паузой на «подумать») */
  var waitFor=-1;
  function step(st,ms){
    if(!st.cur||st.over||st.done||st.clearRows)return;
    if(!plan||plan.id!==st.pieces){
      if(waitFor!==st.pieces){waitFor=st.pieces;wait=L.think*(0.7+Math.random()*0.6);}
      if(wait>0){wait-=ms;return;}
      plan=best(st);
      if(!plan){R.hardDrop(st);return;}
      plan.id=st.pieces;acc=0;
    }
    acc+=ms;
    while(acc>=L.act&&plan&&plan.acts.length){
      acc-=L.act;
      var a=plan.acts.shift();
      if(a==='hold')R.hold(st);
      else if(a==='cw')R.rotate(st,1);
      else if(a==='ccw')R.rotate(st,-1);
      else if(a==='left')R.move(st,-1);
      else if(a==='right')R.move(st,1);
      else if(a==='drop'){R.hardDrop(st);plan=null;break;}
    }
  }
  return {step:step,level:level};
};
/* для проверки */
window.TetAI._placements=placements;window.TetAI._evaluate=evaluate;
})();
