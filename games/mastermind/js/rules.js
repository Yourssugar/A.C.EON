/* A.C.EON CODE: правила «Быков и коров» с цветами (Mastermind). Без DOM, проверяется в node.

   Код: массив из len цветов 0..k-1. Ответ на догадку: black (цвет на месте) и white (цвет есть, но не тут).
   Позиционная подсказка (облегчённый вид): для каждой ячейки 2 на месте, 1 есть, 0 нет.
   Роботы-взломщики: easy помнит три последних ответа и в начале иногда ходит наугад;
   normal помнит четыре последних ответа; hard минимакс Кнута по всем ответам. */
(function(){
'use strict';

var PRESETS={
  easy:{len:4,k:6,rep:false,tries:10},
  normal:{len:4,k:6,rep:true,tries:10},
  hard:{len:5,k:8,rep:true,tries:10},
  expert:{len:6,k:8,rep:true,tries:12}
};

function rng(seed){var a=seed|0;return function(){a=(a+0x6D2B79F5)|0;var t=Math.imul(a^(a>>>15),1|a);t=(t+Math.imul(t^(t>>>7),61|t))^t;return ((t^(t>>>14))>>>0)/4294967296;};}

function secret(p,rnd){
  rnd=rnd||Math.random;var out=[],pool=[],i;
  for(i=0;i<p.k;i++)pool.push(i);
  for(i=0;i<p.len;i++){
    if(p.rep)out.push(Math.floor(rnd()*p.k));
    else{var j=Math.floor(rnd()*pool.length);out.push(pool[j]);pool.splice(j,1);}
  }
  return out;
}
function score(g,s){
  var b=0,w=0,cg={},cs={},i;
  for(i=0;i<s.length;i++){if(g[i]===s[i])b++;else{cg[g[i]]=(cg[g[i]]||0)+1;cs[s[i]]=(cs[s[i]]||0)+1;}}
  for(var c in cg)if(cs[c])w+=Math.min(cg[c],cs[c]);
  return {b:b,w:w};
}
function posHint(g,s){
  var n=s.length,res=[],left={},i;
  for(i=0;i<n;i++){if(g[i]===s[i])res[i]=2;else{res[i]=0;left[s[i]]=(left[s[i]]||0)+1;}}
  for(i=0;i<n;i++){if(res[i])continue;if(left[g[i]]){res[i]=1;left[g[i]]--;}}
  return res;
}
function valid(code,p){
  if(!code||code.length!==p.len)return false;
  for(var i=0;i<code.length;i++){if(code[i]<0||code[i]>=p.k)return false;
    if(!p.rep)for(var j=0;j<i;j++)if(code[j]===code[i])return false;}
  return true;
}

/* все коды (для 4x6 это 1296, для 6x8 262144: робот работает только с 4 ячейками) */
function allCodes(p){
  var out=[],n=Math.pow(p.k,p.len);
  for(var x=0;x<n;x++){var c=[],v=x;for(var i=0;i<p.len;i++){c.push(v%p.k);v=Math.floor(v/p.k);}
    if(valid(c,p))out.push(c);}
  return out;
}
function key(r){return r.b*10+r.w;}
function consistent(c,hist){for(var i=0;i<hist.length;i++){var r=score(hist[i].g,c);if(r.b!==hist[i].r.b||r.w!==hist[i].r.w)return false;}return true;}

/* ход робота по истории его догадок [{g,r}] */
function botGuess(p,hist,level,rnd,cache){
  rnd=rnd||Math.random;
  var all=cache&&cache.all||allCodes(p);if(cache)cache.all=all;
  if(!hist.length){
    if(level==='hard'&&p.len===4&&p.rep)return [0,0,1,1];
    return all[Math.floor(rnd()*all.length)].slice();
  }
  if(level==='easy'&&hist.length<3&&rnd()<0.4)return all[Math.floor(rnd()*all.length)].slice();
  var use=level==='easy'?hist.slice(-3):level==='normal'?hist.slice(-4):hist;
  var S=all.filter(function(c){return consistent(c,use);});
  if(!S.length)S=all;
  if(level!=='hard'||S.length===1)return S[Math.floor(rnd()*S.length)].slice();
  /* Кнут: догадка с наименьшим худшим остатком; при равенстве из возможных */
  var cand=S.length>300?S:all,best=null,bw=1e9,bIn=false,inS={};
  S.forEach(function(c){inS[c.join('')]=1;});
  for(var i=0;i<cand.length;i++){var g=cand[i],cnt={},worst=0;
    for(var j=0;j<S.length;j++){var k2=key(score(g,S[j]));cnt[k2]=(cnt[k2]||0)+1;if(cnt[k2]>worst)worst=cnt[k2];if(worst>bw)break;}
    var isIn=!!inS[g.join('')];
    if(worst<bw||(worst===bw&&isIn&&!bIn)){bw=worst;best=g;bIn=isIn;}}
  return best.slice();
}
/* сколько кодов ещё подходит (для подсказки игроку) */
function remaining(p,hist,cache){
  if(Math.pow(p.k,p.len)>40000)return -1;
  var all=cache&&cache.all||allCodes(p);if(cache)cache.all=all;
  var n=0;for(var i=0;i<all.length;i++)if(consistent(all[i],hist))n++;return n;
}
/* с какой прежней догадкой не сходится новая (для подсветки противоречий) */
function contradicts(g,hist){for(var i=0;i<hist.length;i++){var r=score(hist[i].g,g);if(r.b!==hist[i].r.b||r.w!==hist[i].r.w)return i;}return -1;}

window.MmRules={PRESETS:PRESETS,rng:rng,secret:secret,score:score,posHint:posHint,valid:valid,allCodes:allCodes,botGuess:botGuess,remaining:remaining,contradicts:contradicts,consistent:consistent};
})();
