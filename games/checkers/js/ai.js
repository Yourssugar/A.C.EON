/* A.C.EON CHECKERS: бот. Перебор с альфа-бета отсечением и углублением по времени.
   Пока у стороны есть взятия, поиск продлевается (взятие обязательно, позиция ещё «горячая»).

   CkAI.best(st, level) -> {move, score}
   level: easy | normal | hard | master */
(function(){
'use strict';
var R=window.CkRules;
var LV={
  easy:{depth:2,ms:0,noise:0.35},
  normal:{depth:4,ms:0,noise:0.08},
  hard:{depth:12,ms:450,noise:0},
  master:{depth:20,ms:1500,noise:0}
};
var CENTER=[];for(var i=0;i<64;i++){var r=i>>3,c=i&7;CENTER[i]=(c>=2&&c<=5&&r>=2&&r<=5)?4:(c===0||c===7)?-2:0;}

/* оценка с точки зрения белых */
function evalW(st){
  var b=st.b,s=0,KV=st.rules==='english'?160:300,w=0,bl=0;
  for(var i=0;i<64;i++){var p=b[i];if(!p)continue;var r=i>>3;
    if(p===1){s+=100+(7-r)*3+CENTER[i]+(r===7?6:0);w++;}
    else if(p===-1){s-=100+r*3+CENTER[i]+(r===0?6:0);bl++;}
    else if(p===2){s+=KV+CENTER[i];w++;}
    else{s-=KV+CENTER[i];bl++;}}
  if(st.rules==='giveaway')return -s;
  /* в эндшпиле при перевесе выгодно меняться */
  if(w+bl<10&&s)s+=s>0?(12-bl)*4:-(12-w)*4;
  return s;
}
var nodes=0,deadline=0,stop=false;
function search(st,depth,alpha,beta,ply){
  if((++nodes&1023)===0&&deadline&&Date.now()>deadline){stop=true;return 0;}
  var ms=R.moves(st);
  if(!ms.length){var win=st.rules==='giveaway'?1:-1;return win*(10000-ply);}
  if(ply&&st.quiet>=60)return 0;
  var hot=ms[0].caps.length>0;
  if(depth<=0&&(!hot||ply>30))return evalW(st)*st.turn;
  if(depth<=0&&hot)depth=1;
  ms.sort(function(a,b){return b.caps.length-a.caps.length;});
  var best=-1e9;
  for(var i=0;i<ms.length;i++){
    var u=R.apply(st,ms[i]);
    var v=-search(st,depth-1,-beta,-alpha,ply+1);
    R.unapply(st,u);
    if(stop)return 0;
    if(v>best)best=v;
    if(v>alpha)alpha=v;
    if(alpha>=beta)break;
  }
  return best;
}
function best(st0,level){
  var L=LV[level]||LV.normal,st=R.clone(st0),ms=R.moves(st);
  if(!ms.length)return null;
  if(ms.length===1)return {move:ms[0],score:0};
  nodes=0;stop=false;deadline=L.ms?Date.now()+L.ms:0;
  var scored=ms.map(function(m){return {m:m,v:0};}),done=null;
  for(var d=1;d<=L.depth;d++){
    var alpha=-1e9;
    for(var i=0;i<scored.length;i++){
      var u=R.apply(st,scored[i].m);
      var v=-search(st,d-1,-1e9,-alpha+1,1);
      R.unapply(st,u);
      if(stop)break;
      scored[i].v=v;if(v>alpha)alpha=v;
    }
    if(stop)break;
    scored.sort(function(a,b){return b.v-a.v;});
    done=scored.map(function(x){return {m:x.m,v:x.v};});
    if(!L.ms&&d>=L.depth)break;
    if(Math.abs(done[0].v)>9000)break;
  }
  if(!done)done=scored;
  var pick=done[0];
  /* слабые уровни иногда ошибаются: берут не лучший ход */
  if(L.noise&&Math.random()<L.noise&&done.length>1){var k=1+Math.floor(Math.random()*Math.min(3,done.length-1));pick=done[k];}
  return {move:pick.m,score:pick.v};
}
window.CkAI={best:best,evalW:evalW,LV:LV};
})();
