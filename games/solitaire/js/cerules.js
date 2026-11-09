/* A.C.EON CARDS: правила восьмёрок и боты. Без DOM, проверяется в node.

   Вы и от одного до трёх роботов, колода 52 карты. Вдвоём по 7 карт, втроём и вчетвером по 5.
   Открывается верхняя карта (восьмёрка уходит обратно в колоду). Ход по часовой.
   Кладётся карта той же масти или того же значения, восьмёрку можно положить всегда и назвать любую масть.
   Взять можно всегда: одна карта из колоды; если она подходит, её можно сразу положить, иначе ход переходит.
   Колода кончилась: сброс, кроме верхней карты, перемешивается и становится колодой.
   Кто первым избавился от карт, выиграл раздачу и получает очки за карты соперников:
   восьмёрка 50, картинки 10, туз 1, остальные по номиналу. Матч одной раздачей или до 100 очков.

   Особые карты (настройка): двойка заставляет следующего взять 2, если он не ответит своей двойкой
   (тогда берёт следующий, уже 4 и так далее); дама пропускает ход следующего;
   туз меняет направление (вдвоём это как пропуск).

   Карта {s: 0 пики, 1 черви, 2 бубны, 3 трефы; r: 1 (туз) .. 13}.
   Действия: {t:'play', c, suit} (suit только у восьмёрки), {t:'draw'}, {t:'pass'} (после взятой карты). */
(function(){
'use strict';

function rng(seed){var a=seed|0;return function(){a=(a+0x6D2B79F5)|0;var t=Math.imul(a^(a>>>15),1|a);t=(t+Math.imul(t^(t>>>7),61|t))^t;return ((t^(t>>>14))>>>0)/4294967296;};}
function rk(c){return c.r===1?14:c.r;}
function cid(c){return c.s*20+c.r;}
function same(a,b){return a.s===b.s&&a.r===b.r;}
function value(c){return c.r===8?50:c.r>=11?10:c.r===1?1:c.r;}
function shuffle(a,rnd){for(var i=a.length-1;i>0;i--){var j=Math.floor(rnd()*(i+1)),t=a[i];a[i]=a[j];a[j]=t;}return a;}
function fullDeck(){var d=[];for(var s=0;s<4;s++)for(var r=1;r<=13;r++)d.push({s:s,r:r});return d;}
var ORDER=[3,2,0,1];
function sortHand(h){h.sort(function(a,b){
  var ea=a.r===8?1:0,eb=b.r===8?1:0;if(ea!==eb)return ea-eb;
  return a.s!==b.s?ORDER.indexOf(a.s)-ORDER.indexOf(b.s):rk(a)-rk(b);});}

/* ── матч ── */
function newMatch(o){
  var G={n:o.n,mode:o.mode==='special'?'special':'classic',target:o.target==='one'?'one':100,
    scores:[],round:0,over:false,winners:[],history:[]};
  for(var i=0;i<o.n;i++)G.scores.push(0);
  deal(G,o.rnd||Math.random,o.first);
  return G;
}
function deal(G,rnd,first){
  G.round++;
  var d=shuffle(fullDeck(),rnd),k=G.n===2?7:5;
  G.hands=[];for(var p=0;p<G.n;p++)G.hands.push([]);
  for(var i=0;i<k;i++)for(p=0;p<G.n;p++)G.hands[p].push(d.pop());
  G.hands.forEach(sortHand);
  var top=d.pop();
  while(top.r===8){d.splice(Math.floor(rnd()*d.length),0,top);top=d.pop();}
  G.deck=d;G.discard=[top];G.top=top;G.suit=top.s;
  G.dir=1;G.pend=0;G.phase='play';G.drawn=null;G.stall=0;G.last=null;G.roundRes=null;
  /* кто ходит первым: по кругу от раздачи к раздаче */
  G.turn=first!=null?first:(G.round-1)%G.n;
  G.dealer=G.turn;
  G.counts=G.hands.map(function(h){return h.length;});
  /* что видно всем: какие масти игрок не смог поддержать (до следующей взятой им карты) */
  G.lacks=G.hands.map(function(){return {};});
}
function next(G,from,steps){return ((from+G.dir*(steps||1))%G.n+G.n)%G.n;}
function canPlay(G,c){
  if(G.pend>0)return c.r===2;
  return c.r===8||c.s===G.suit||c.r===G.top.r;
}
function legal(G,p){
  if(G.phase==='roundEnd'||G.phase==='over'||G.turn!==p)return [];
  var a=[],add=function(c){
    if(c.r===8&&G.pend===0){for(var s=0;s<4;s++)a.push({t:'play',c:c,suit:s});}
    else a.push({t:'play',c:c});
  };
  if(G.phase==='drawn'){
    if(G.drawn&&canPlay(G,G.drawn))add(G.drawn);
    a.push({t:'pass'});return a;
  }
  G.hands[p].forEach(function(c){if(canPlay(G,c))add(c);});
  a.push({t:'draw'});
  return a;
}
function refill(G,rnd){
  if(G.deck.length||G.discard.length<2)return;
  var top=G.discard.pop();
  G.deck=shuffle(G.discard,rnd||Math.random);G.discard=[top];
}
function drawOne(G,p,rnd){
  refill(G,rnd);
  if(!G.deck.length)return null;
  var c=G.deck.pop();G.hands[p].push(c);G.lacks[p]={};
  return c;
}
function apply(G,p,a,rnd){
  var ok=legal(G,p).some(function(x){return x.t===a.t&&(!x.c||same(x.c,a.c))&&(x.suit===undefined||x.suit===a.suit);});
  if(!ok)return false;
  G.last={t:a.t,p:p,c:a.c,suit:a.suit};
  if(a.t==='play'){
    G.hands[p]=G.hands[p].filter(function(x){return !same(x,a.c);});
    G.discard.push(a.c);G.top=a.c;G.suit=a.c.r===8?a.suit:a.c.s;G.drawn=null;G.stall=0;
    if(!G.hands[p].length){endRound(G,p);return true;}
    var steps=1;
    if(G.mode==='special'){
      if(a.c.r===2)G.pend+=2;
      else if(a.c.r===12)steps=2;
      else if(a.c.r===1){if(G.n===2)steps=2;else G.dir=-G.dir;}
    }
    G.phase='play';G.turn=next(G,p,steps);
    sortHand(G.hands[p]);
    return true;
  }
  if(a.t==='draw'){
    if(G.pend>0){
      var n=G.pend;G.pend=0;G.last.n=0;
      for(var i=0;i<n;i++)if(drawOne(G,p,rnd))G.last.n++;
      sortHand(G.hands[p]);
      G.phase='play';G.turn=next(G,p,1);G.stall=0;
      return true;
    }
    var stuck=!G.hands[p].some(function(c){return canPlay(G,c);}),ls=G.suit;
    var c=drawOne(G,p,rnd);G.last.n=c?1:0;
    /* брал, потому что нечем ходить: этой масти и восьмёрок у него нет (кроме, может быть, взятой карты) */
    if(stuck)G.lacks[p][ls]=1;
    if(!c){
      /* взять нечего: пас; если все пасуют по кругу, раздача заканчивается */
      G.stall++;
      if(G.stall>=G.n*2){blocked(G);return true;}
      G.phase='play';G.turn=next(G,p,1);return true;
    }
    sortHand(G.hands[p]);
    if(canPlay(G,c)){G.phase='drawn';G.drawn=c;}
    else{G.phase='play';G.turn=next(G,p,1);}
    return true;
  }
  if(a.t==='pass'){
    G.drawn=null;G.phase='play';G.turn=next(G,p,1);
    return true;
  }
  return false;
}
function handPts(h){var s=0;h.forEach(function(c){s+=value(c);});return s;}
function endRound(G,w){
  var pts=0;
  for(var p=0;p<G.n;p++)if(p!==w)pts+=handPts(G.hands[p]);
  G.scores[w]+=pts;
  G.roundRes={w:w,pts:pts,left:G.hands.map(handPts)};
  G.history.push({w:w,pts:pts});
  G.phase='roundEnd';G.turn=-1;
  if(G.target==='one'||G.scores[w]>=G.target){
    G.over=true;G.phase='over';
    var m=Math.max.apply(null,G.scores);G.winners=[];
    for(p=0;p<G.n;p++)if(G.scores[p]===m)G.winners.push(p);
  }
}
/* тупик: никто не может ни положить, ни взять; выигрывает тот, у кого меньше очков в руке */
function blocked(G){
  var best=0;
  for(var p=1;p<G.n;p++)if(handPts(G.hands[p])<handPts(G.hands[best]))best=p;
  endRound(G,best);
  G.roundRes.blocked=true;
}

/* ════════ БОТЫ ════════
   easy    кладёт первую подходящую, восьмёрку сразу, масть наугад
   normal  бережёт восьмёрки на крайний случай, уходит в масть, которой больше на руках,
           называет масть, которой больше всего; с особыми картами бьёт двойкой и дамой того,
           у кого мало карт
   hard    перебор: неизвестные карты раскладываются по рукам соперников с учётом мастей,
           которых у них нет, каждый вариант хода доигрывается обычными ботами до конца раздачи */
function bestSuit(h,skip){
  var cnt=[0,0,0,0],v=[0,0,0,0];
  h.forEach(function(c){if(skip&&same(c,skip))return;if(c.r!==8){cnt[c.s]++;v[c.s]+=value(c);}});
  var b=0;for(var s=1;s<4;s++)if(cnt[s]>cnt[b]||(cnt[s]===cnt[b]&&v[s]>v[b]))b=s;
  return b;
}
function ai(G,p,lv,rnd,opt){
  rnd=rnd||Math.random;
  var L=legal(G,p);if(!L.length)return null;if(L.length===1)return L[0];
  var h=G.hands[p];
  if(lv==='easy'){
    var pl=L.filter(function(a){return a.t==='play';});
    if(!pl.length)return L[L.length-1];
    if(G.phase==='play'&&rnd()<0.15)return {t:'draw'};   /* иногда берёт, хотя мог положить */
    var a=pl[Math.floor(rnd()*pl.length)];
    if(a.c.r===8)return {t:'play',c:a.c,suit:Math.floor(rnd()*4)};
    return a;
  }
  if(lv==='hard'){
    opt=opt||{};
    return search(G,p,L,rnd,opt.iters||200,opt.ms===undefined?300:opt.ms);
  }
  /* normal */
  var plays=L.filter(function(a){return a.t==='play';});
  if(!plays.length)return L[L.length-1];
  if(G.phase==='drawn'){var dp=plays[0];if(dp.c.r===8)return {t:'play',c:dp.c,suit:bestSuit(h,dp.c)};return dp;}
  var nx=next(G,p,1),nxN=G.hands[nx].length;
  var best=null,bs=-1e9;
  plays.forEach(function(a){
    if(a.c.r===8&&a.suit!==bestSuit(h,a.c))return;
    var c=a.c,rest=h.filter(function(x){return !same(x,c);});
    var ns=c.r===8?a.suit:c.s;
    var s=0;
    rest.forEach(function(x){if(x.r!==8&&(x.s===ns||x.r===c.r))s+=1;});  /* что останется для следующего хода */
    s+=value(c)*0.05;                    /* сбросить дорогие карты раньше */
    if(c.r===8)s-=rest.length<=1?0:6;    /* восьмёрку держим */
    if(G.mode==='special'){
      if(c.r===2)s+=nxN<=3?4:1;
      if(c.r===12)s+=nxN<=2?4:0.5;
      if(c.r===1&&G.n>2){var pv=next(G,p,-1);if(G.hands[pv].length>nxN)s+=1.5;}
    }
    if(s>bs){bs=s;best=a;}
  });
  /* брать вместо игры стоит только если на руках одна восьмёрка и она ещё пригодится */
  return best||plays[0];
}

/* ── перебор для сложных ── */
function clone(G){
  var C={};for(var k in G)C[k]=G[k];
  C.hands=G.hands.map(function(h){return h.slice();});C.deck=G.deck.slice();C.discard=G.discard.slice();
  C.scores=G.scores.slice();C.history=G.history.slice();
  C.lacks=G.lacks.map(function(l){var o={};for(var s in l)o[s]=l[s];return o;});
  return C;
}
function determinize(G,p,rnd){
  var C=clone(G),pool=G.deck.slice();
  for(var q=0;q<G.n;q++)if(q!==p)pool=pool.concat(G.hands[q]);
  for(var tries=0;tries<20;tries++){
    shuffle(pool,rnd);
    var rest=pool.slice(),hands=[],ok=true;
    for(q=0;q<G.n;q++){
      if(q===p){hands.push(G.hands[p].slice());continue;}
      var need=G.hands[q].length,hq=[];
      for(var i=0;i<rest.length&&hq.length<need;i++){
        var c=rest[i];
        if(tries<15&&G.lacks[q][c.s])continue;
        if(tries<15&&Object.keys(G.lacks[q]).length&&c.r===8)continue;
        hq.push(c);rest.splice(i,1);i--;
      }
      if(hq.length<need){ok=false;break;}
      hands.push(hq);
    }
    if(ok){C.hands=hands;C.deck=rest;return C;}
  }
  /* без учёта мастей */
  shuffle(pool,rnd);var r2=pool.slice();
  for(q=0;q<G.n;q++)if(q!==p)C.hands[q]=r2.splice(0,G.hands[q].length);
  C.deck=r2;
  return C;
}
function rollout(C,p,rnd){
  var steps=0;
  while((C.phase==='play'||C.phase==='drawn')&&steps<300){var q=C.turn,a=ai(C,q,'normal',rnd);if(!a||!apply(C,q,a,rnd))break;steps++;}
  if(!C.roundRes)return -handPts(C.hands[p])*0.01;
  if(C.roundRes.w===p)return 1+C.roundRes.pts*0.005;
  return -handPts(C.hands[p])*0.005;
}
function search(G,p,L,rnd,iters,ms){
  /* восьмёрка: масть выбираем сами, в перебор идёт один вариант на восьмёрку */
  var cand=[],seen={};
  L.forEach(function(a){
    if(a.t==='play'&&a.c.r===8){if(a.suit!==bestSuit(G.hands[p],a.c))return;}
    var k=a.t+(a.c?cid(a.c):'');if(seen[k])return;seen[k]=1;cand.push(a);
  });
  if(cand.length<2)return cand[0];
  var base=ai(G,p,'normal',rnd);
  var score=cand.map(function(){return 0;}),n=0,t0=Date.now();
  while(n<iters&&(!ms||Date.now()-t0<ms||n<3)){
    var D=determinize(G,p,rnd);
    cand.forEach(function(a,i){var C=clone(D);apply(C,p,a,rnd);score[i]+=rollout(C,p,rnd);});
    n++;
  }
  var bi=0,bs=-1e9;
  cand.forEach(function(a,i){var s=score[i]+(base&&a.t===base.t&&(!a.c||same(a.c,base.c))?0.001*n:0);if(s>bs){bs=s;bi=i;}});
  return cand[bi];
}

window.CERules={rng:rng,rk:rk,cid:cid,same:same,value:value,handPts:handPts,sortHand:sortHand,newMatch:newMatch,deal:deal,
  legal:legal,apply:apply,canPlay:canPlay,next:next,ai:ai,bestSuit:bestSuit};
})();
