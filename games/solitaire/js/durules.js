/* A.C.EON CARDS: правила дурака и боты. Без DOM, проверяется в node.

   Колода 36 карт (6..туз), по 6 карт, козырь снизу колоды. Первым ходит тот, у кого младший козырь.
   Ход идёт по кругу (по часовой): атакующий заходит, следующий за ним отбивается.
   Подкидывают все, кроме отбивающегося, карты тех же значений, что уже на столе.
   В первом отбое не больше 5 карт, дальше не больше 6, и не больше, чем карт у отбивающегося.
   Отбился: карты в сброс, отбивающийся ходит следующим. Взял: ход переходит к игроку после него.
   Переводной: пока ни одна карта не побита, отбивающийся может положить карту того же значения
   и перевести атаку на следующего (у того должно хватить карт).
   Добор после отбоя до 6: сначала заходивший, потом подкидывавшие, отбивающийся последним.
   Кто остался с картами последним, тот дурак. Вышли последние двое одновременно: ничья.

   Отбой упрощён до очереди: на каждую подкинутую карту отбивающийся отвечает сразу,
   потом подкидывающие по кругу решают, добавить ли ещё. Все спасовали подряд: отбой закончен.

   Карта {s: масть 0..3, r: 1 (туз), 6..13}. Действия: {t:'attack'|'beat'|'take'|'transfer'|'throw'|'pass', c, i}. */
(function(){
'use strict';

function rng(seed){var a=seed|0;return function(){a=(a+0x6D2B79F5)|0;var t=Math.imul(a^(a>>>15),1|a);t=(t+Math.imul(t^(t>>>7),61|t))^t;return ((t^(t>>>14))>>>0)/4294967296;};}
function rk(c){return c.r===1?14:c.r;}
function cid(c){return c.s*20+c.r;}
function same(a,b){return a.s===b.s&&a.r===b.r;}
function beats(a,d,trump){return (d.s===a.s&&rk(d)>rk(a))||(d.s===trump&&a.s!==trump);}

function deck36(rnd){
  var cards=[];
  for(var s=0;s<4;s++)[1,6,7,8,9,10,11,12,13].forEach(function(r){cards.push({s:s,r:r});});
  for(var i=cards.length-1;i>0;i--){var j=Math.floor(rnd()*(i+1)),t=cards[i];cards[i]=cards[j];cards[j]=t;}
  return cards;
}
/* в руке: сначала обычные масти, козыри в конце, внутри масти по старшинству */
function sortHand(G,h){
  h.sort(function(a,b){
    var ta=a.s===G.trump?1:0,tb=b.s===G.trump?1:0;
    if(ta!==tb)return ta-tb;
    if(a.s!==b.s)return a.s-b.s;
    return rk(a)-rk(b);
  });
}
function nextActive(G,i){
  for(var k=1;k<=G.n;k++){var j=(i+k)%G.n;if(!G.out[j])return j;}
  return i;
}

function newGame(o){
  var rnd=o.rnd||Math.random,n=o.n;
  var G={mode:o.mode==='perev'?'perev':'podk',n:n,deck:deck36(rnd),hands:[],out:[],places:[],table:[],discard:[],known:[],
    att:0,def:1,phase:'attack',turn:0,taking:false,ti:0,passes:0,first:true,over:false,fool:-1,last:null,bout:0};
  for(var i=0;i<n;i++){G.hands.push([]);G.known.push([]);G.out.push(false);}
  for(var r=0;r<6;r++)for(var p=0;p<n;p++)G.hands[p].push(G.deck.pop());
  G.trumpCard=G.deck[0];G.trump=G.trumpCard.s;
  var best=-1,bv=99;
  G.hands.forEach(function(h,i){h.forEach(function(c){if(c.s===G.trump&&rk(c)<bv){bv=rk(c);best=i;}});});
  G.lowTrump=best>=0?{p:best,r:bv===14?1:bv}:null;
  if(best<0)best=Math.floor(rnd()*n);
  G.att=best;G.def=nextActive(G,best);G.turn=best;
  G.hands.forEach(function(h){sortHand(G,h);});
  return G;
}

function cap(G){return G.first?5:6;}
function unbeaten(G){var n=0;G.table.forEach(function(x){if(!x.d)n++;});return n;}
function tableRanks(G){var s={};G.table.forEach(function(x){s[rk(x.a)]=1;if(x.d)s[rk(x.d)]=1;});return s;}
/* можно ли добавить ещё одну карту под отбивающегося */
function canAdd(G){return G.table.length<cap(G)&&unbeaten(G)+1<=G.hands[G.def].length;}
/* подкидывающие по кругу, начиная с заходившего */
function throwers(G){
  var l=[];
  for(var k=0;k<G.n;k++){var p=(G.att+k)%G.n;if(p!==G.def&&!G.out[p])l.push(p);}
  return l;
}
function canTransfer(G,c){
  if(G.mode!=='perev'||!G.table.length)return false;
  if(!G.table.every(function(x){return !x.d&&rk(x.a)===rk(c);}))return false;
  if(G.table.length+1>cap(G))return false;
  var nd=nextActive(G,G.def);
  return nd!==G.def&&G.hands[nd].length>=G.table.length+1;
}

function legal(G,p){
  if(G.over||p!==G.turn)return [];
  var h=G.hands[p],a=[];
  if(G.phase==='attack'){h.forEach(function(c){a.push({t:'attack',c:c});});return a;}
  if(G.phase==='defend'){
    h.forEach(function(c){
      G.table.forEach(function(x,i){if(!x.d&&beats(x.a,c,G.trump))a.push({t:'beat',c:c,i:i});});
      if(canTransfer(G,c))a.push({t:'transfer',c:c});
    });
    a.push({t:'take'});return a;
  }
  if(G.phase==='throw'){
    if(canAdd(G)){var rs=tableRanks(G);h.forEach(function(c){if(rs[rk(c)])a.push({t:'throw',c:c});});}
    a.push({t:'pass'});return a;
  }
  return a;
}

function takeCard(G,p,c){
  var h=G.hands[p];
  for(var i=0;i<h.length;i++)if(same(h[i],c)){h.splice(i,1);break;}
  var k=G.known[p];
  for(var j=0;j<k.length;j++)if(same(k[j],c)){k.splice(j,1);break;}
}
function startThrow(G){
  G.phase='throw';G.ti=0;G.passes=0;
  var l=throwers(G);
  if(!canAdd(G)||!l.length){endBout(G,G.taking?'taken':'beaten');return;}
  G.turn=l[0];
}
function endBout(G,res){
  var cards=[];G.table.forEach(function(x){cards.push(x.a);if(x.d)cards.push(x.d);});
  var def=G.def,order=throwers(G);
  G.ended={res:res,def:def,att:G.att,table:G.table.map(function(x){return {a:x.a,d:x.d};})};
  if(res==='taken'){cards.forEach(function(c){G.hands[def].push(c);G.known[def].push(c);});}
  else cards.forEach(function(c){G.discard.push(c);});
  G.table=[];G.first=false;G.taking=false;G.bout++;
  order.push(def);
  order.forEach(function(j){while(G.hands[j].length<6&&G.deck.length){var c=G.deck.pop();G.hands[j].push(c);if(!G.deck.length)G.known[j].push(c);}});
  G.hands.forEach(function(h){sortHand(G,h);});
  if(!G.deck.length){
    order.forEach(function(j){if(!G.out[j]&&!G.hands[j].length){G.out[j]=true;G.places.push(j);}});
  }
  var act=[];for(var i=0;i<G.n;i++)if(!G.out[i])act.push(i);
  if(act.length<=1){G.over=true;G.phase='over';G.fool=act.length?act[0]:-1;G.turn=-1;return;}
  var na;
  if(res==='beaten')na=G.out[def]?nextActive(G,def):def;
  else na=nextActive(G,def);
  G.att=na;G.def=nextActive(G,na);G.phase='attack';G.turn=na;
}

/* применить действие игрока p. Неверное действие отклоняется (false). */
function apply(G,p,a){
  var ok=legal(G,p).some(function(x){return x.t===a.t&&(!x.c||same(x.c,a.c))&&(x.i===undefined||x.i===a.i);});
  if(!ok)return false;
  G.last={t:a.t,p:p,c:a.c};
  if(a.t==='attack'){
    takeCard(G,p,a.c);G.table.push({a:a.c,d:null});G.phase='defend';G.turn=G.def;G.taking=false;
  }else if(a.t==='beat'){
    takeCard(G,p,a.c);G.table[a.i].d=a.c;
    if(!unbeaten(G))startThrow(G);
  }else if(a.t==='take'){
    G.taking=true;startThrow(G);
  }else if(a.t==='transfer'){
    takeCard(G,p,a.c);G.table.push({a:a.c,d:null});
    G.att=G.def;G.def=nextActive(G,G.def);G.turn=G.def;
    G.last.to=G.def;
  }else if(a.t==='throw'){
    takeCard(G,p,a.c);G.table.push({a:a.c,d:null});G.passes=0;
    if(G.taking){if(!canAdd(G))endBout(G,'taken');}
    else{G.phase='defend';G.turn=G.def;}
  }else if(a.t==='pass'){
    var l=throwers(G);G.passes++;
    if(G.passes>=l.length)endBout(G,G.taking?'taken':'beaten');
    else{G.ti=(G.ti+1)%l.length;G.turn=l[G.ti];}
  }
  return true;
}

/* ════════ БОТЫ ════════
   easy    ходит младшими картами с долей случайности, отбивается всем, чем может
   normal  бережёт козыри, заходит парами, в начале игры лучше возьмёт мелочь, чем отдаст старший козырь
   hard    то же плюс память: помнит сброс и карты, которые соперники взяли, в конце игры
           заходит и подкидывает тем, чем отбивающемуся нечем крыть */
function val(G,c){return rk(c)+(c.s===G.trump?13:0);}
function lowest(G,cards){var b=null;cards.forEach(function(c){if(!b||val(G,c)<val(G,b))b=c;});return b;}
/* карты, которых этот игрок не видел: не в его руке, не в сбросе, не на столе, не известные у других */
function unseen(G,p){
  var gone={};
  G.hands[p].forEach(function(c){gone[cid(c)]=1;});
  G.discard.forEach(function(c){gone[cid(c)]=1;});
  G.table.forEach(function(x){gone[cid(x.a)]=1;if(x.d)gone[cid(x.d)]=1;});
  G.known.forEach(function(k,j){if(j!==p)k.forEach(function(c){gone[cid(c)]=1;});});
  if(G.deck.length)gone[cid(G.trumpCard)]=1;
  var l=[];for(var s=0;s<4;s++)[1,6,7,8,9,10,11,12,13].forEach(function(r){if(!gone[s*20+r])l.push({s:s,r:r});});
  return l;
}
/* может ли игрок q, по сведениям p, побить карту c */
function mayBeat(G,p,q,c){
  if(G.known[q].some(function(d){return beats(c,d,G.trump);}))return true;
  var unknownN=G.hands[q].length-G.known[q].length;
  if(unknownN<=0)return false;
  return unseen(G,p).some(function(d){return beats(c,d,G.trump);});
}
/* чем отбиваться: старшие атакующие карты закрываются первыми, каждая самой дешёвой подходящей */
function defensePlan(G,p){
  var hand=G.hands[p].slice(),plan=[];
  var open=[];G.table.forEach(function(x,i){if(!x.d)open.push(i);});
  open.sort(function(a,b){return val(G,G.table[b].a)-val(G,G.table[a].a);});
  for(var k=0;k<open.length;k++){
    var a=G.table[open[k]].a,best=-1;
    hand.forEach(function(d,j){if(beats(a,d,G.trump)&&(best<0||val(G,d)<val(G,hand[best])))best=j;});
    if(best<0)return null;
    plan.push({t:'beat',c:hand[best],i:open[k]});hand.splice(best,1);
  }
  return plan;
}


/* ── сильный бот: перебор вариантов с доигрыванием ──
   Неизвестные карты (руки соперников без известных, колода без козыря на дне) раскладываются наугад,
   каждый вариант хода доигрывается до конца обычными ботами, выбирается ход, реже ведущий в дураки. */
function clone(G){
  var C={};for(var k in G)C[k]=G[k];
  C.hands=G.hands.map(function(h){return h.slice();});C.known=G.known.map(function(h){return h.slice();});
  C.deck=G.deck.slice();C.discard=G.discard.slice();C.out=G.out.slice();C.places=G.places.slice();
  C.table=G.table.map(function(x){return {a:x.a,d:x.d};});
  return C;
}
function determinize(G,p,rnd){
  var C=clone(G),pool=unseen(G,p);
  for(var i=pool.length-1;i>0;i--){var j=Math.floor(rnd()*(i+1)),t=pool[i];pool[i]=pool[j];pool[j]=t;}
  for(var q=0;q<G.n;q++){if(q===p)continue;
    var need=G.hands[q].length-G.known[q].length;
    C.hands[q]=G.known[q].concat(pool.splice(0,need));}
  if(G.deck.length)C.deck=[G.trumpCard].concat(pool.splice(0,G.deck.length-1));
  return C;
}
function rollout(C,p,rnd){
  var steps=0;
  while(!C.over&&steps<500){var q=C.turn,a=ai(C,q,'normal',rnd);if(!a||!apply(C,q,a))break;steps++;}
  if(!C.over)return 0.5;
  return C.fool===p?1:C.fool<0?0.4:0;
}
function search(G,p,L,base,rnd,iters,ms){
  var cand=[],seen={};
  L.forEach(function(a){var k=a.t+(a.c?cid(a.c):'')+(a.i!==undefined?'@'+a.i:'');if(!seen[k]){seen[k]=1;cand.push(a);}});
  if(cand.length<2)return cand[0];
  var score=cand.map(function(){return 0;}),n=0,t0=Date.now();
  while(n<iters&&(!ms||Date.now()-t0<ms||n<4)){
    var D=determinize(G,p,rnd);
    cand.forEach(function(a,i){var C=clone(D);apply(C,p,a);score[i]+=rollout(C,p,rnd);});
    n++;
  }
  /* при равенстве выигрывает ход обычного бота */
  var bi=-1,bs=1e9;
  cand.forEach(function(a,i){var s=score[i]-(base&&a.t===base.t&&(!a.c||same(a.c,base.c))&&a.i===base.i?0.01:0);if(s<bs){bs=s;bi=i;}});
  return cand[bi];
}

function ai(G,p,lv,rnd,opt){
  rnd=rnd||Math.random;
  var L=legal(G,p);if(!L.length)return null;if(L.length===1)return L[0];
  /* долгий конец игры может пойти по кругу: иногда ход наугад, чтобы круг разорвался */
  if(G.bout>40&&rnd()<0.25)return L[Math.floor(rnd()*L.length)];
  if(lv==='hard'){
    var base=ai(G,p,'hardq',rnd);
    opt=opt||{};
    if(G.deck.length<=(opt.deckMax!=null?opt.deckMax:6))return search(G,p,L,base,rnd,opt.iters||24,opt.ms===undefined?250:opt.ms);
    return base;
  }
  if(lv==='hardq')lv='hard';
  var hand=G.hands[p],deckN=G.deck.length,T=G.trump;
  var isT=function(c){return c.s===T;};

  if(G.phase==='attack'){
    var sorted=hand.slice().sort(function(a,b){return val(G,a)-val(G,b);});
    if(lv==='easy'){var k=Math.floor(rnd()*Math.min(3,sorted.length));return {t:'attack',c:sorted[k]};}
    var cnt={};hand.forEach(function(c){if(!isT(c))cnt[rk(c)]=(cnt[rk(c)]||0)+1;});
    var best=null,bs=1e9;
    hand.forEach(function(c){
      var s=val(G,c);
      if(!isT(c)&&cnt[rk(c)]>1&&rk(c)<=11)s-=2.5;
      if(lv==='hard'&&deckN===0&&hand.length===2&&cnt[rk(c)]===2)s-=40;   /* двумя одинаковыми выходит сразу */
      if(s<bs){bs=s;best=c;}
    });
    return {t:'attack',c:best};
  }

  if(G.phase==='defend'){
    var tr=L.filter(function(x){return x.t==='transfer';});
    var plan=defensePlan(G,p);
    if(tr.length){
      var c0=lowest(G,tr.map(function(x){return x.c;}));
      if(lv==='easy'){if(!isT(c0)&&rnd()<0.5)return {t:'transfer',c:c0};}
      else if(!isT(c0)||(!plan&&deckN===0))return {t:'transfer',c:c0};
    }
    if(!plan)return {t:'take'};
    if(lv!=='easy'&&deckN>=8){
      var usedT=plan.filter(function(x){return isT(x.c);});
      var cheap=G.table.every(function(x){return !isT(x.a)&&rk(x.a)<=10;});
      if(cheap&&G.table.length<=2&&usedT.some(function(x){return rk(x.c)>=12;}))return {t:'take'};
    }
    return plan[0];
  }

  if(G.phase==='throw'){
    var cs=L.filter(function(x){return x.t==='throw';}).map(function(x){return x.c;});
    if(!cs.length)return {t:'pass'};
    var plain=cs.filter(function(c){return !isT(c);});
    if(lv==='easy'){
      if(plain.length&&rnd()<(G.taking?0.5:0.6))return {t:'throw',c:lowest(G,plain)};
      return {t:'pass'};
    }
    if(G.taking){
      var junk=plain.filter(function(c){return rk(c)<=10||deckN===0;});
      return junk.length?{t:'throw',c:lowest(G,junk)}:{t:'pass'};
    }
    var ok=plain.filter(function(c){return rk(c)<=11||deckN<=4;});
    if(deckN===0)ok=ok.concat(cs.filter(function(c){return isT(c)&&rk(c)<=10;}));
    if(lv==='hard'&&deckN===0){
      var kill=cs.filter(function(c){return !mayBeat(G,p,G.def,c);});
      if(kill.length)return {t:'throw',c:lowest(G,kill)};
    }
    return ok.length?{t:'throw',c:lowest(G,ok)}:{t:'pass'};
  }
  return L[0];
}

window.DKRules={rng:rng,rk:rk,cid:cid,same:same,beats:beats,newGame:newGame,legal:legal,apply:apply,ai:ai,
  canTransfer:canTransfer,canAdd:canAdd,throwers:throwers,unbeaten:unbeaten,nextActive:nextActive,defensePlan:defensePlan,val:val};
})();
