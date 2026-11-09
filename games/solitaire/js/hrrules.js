/* A.C.EON CARDS: правила черв и боты. Без DOM, проверяется в node.

   Четыре игрока (вы и три робота), колода 52 карты, по 13. Ход по часовой: 0 внизу, 1 слева, 2 сверху, 3 справа.
   Перед раздачей каждый передаёт 3 карты: влево, вправо, напротив, в четвёртой раздаче без передачи (по кругу).
   Первую взятку начинает двойка треф. Масть обязательна. Черви нельзя выводить, пока они не «сломаны»
   (кто-то уже сбросил черву), разве что на руках одни черви. В первой взятке нельзя сбрасывать очки
   (черви и даму пик), если есть что-то другое.
   Очки: черва 1, дама пик 13. Кто взял все 26, тот «стреляет в луну»: ему 0, остальным по 26.
   Игра до 50 или 100 очков, побеждает тот, у кого меньше всех.

   Карта {s: 0 пики, 1 черви, 2 бубны, 3 трефы; r: 1 (туз) .. 13}. */
(function(){
'use strict';

var SP=0,HE=1,DI=2,CL=3;
var DIRS=['left','right','across','none'];
function rng(seed){var a=seed|0;return function(){a=(a+0x6D2B79F5)|0;var t=Math.imul(a^(a>>>15),1|a);t=(t+Math.imul(t^(t>>>7),61|t))^t;return ((t^(t>>>14))>>>0)/4294967296;};}
function rk(c){return c.r===1?14:c.r;}
function cid(c){return c.s*20+c.r;}
function same(a,b){return a.s===b.s&&a.r===b.r;}
function pts(c){return c.s===HE?1:(c.s===SP&&c.r===12)?13:0;}
function isQS(c){return c.s===SP&&c.r===12;}
var ORDER=[CL,DI,SP,HE];   /* порядок мастей в руке: цвета чередуются */
function sortHand(h){h.sort(function(a,b){return a.s!==b.s?ORDER.indexOf(a.s)-ORDER.indexOf(b.s):rk(a)-rk(b);});}
function shuffle(a,rnd){for(var i=a.length-1;i>0;i--){var j=Math.floor(rnd()*(i+1)),t=a[i];a[i]=a[j];a[j]=t;}return a;}
function fullDeck(){var d=[];for(var s=0;s<4;s++)for(var r=1;r<=13;r++)d.push({s:s,r:r});return d;}

/* ── матч ── */
function newMatch(o){
  var G={target:o.target===50?50:100,pass:o.pass!==false,round:0,scores:[0,0,0,0],history:[],over:false,winners:[]};
  deal(G,o.rnd||Math.random);
  return G;
}
function passDir(G){return G.pass?DIRS[(G.round-1)%4]:'none';}
function passTo(G,p){var d=passDir(G);return d==='left'?(p+1)%4:d==='right'?(p+3)%4:d==='across'?(p+2)%4:p;}
function deal(G,rnd){
  G.round++;
  var d=shuffle(fullDeck(),rnd);
  G.hands=[[],[],[],[]];
  for(var i=0;i<52;i++)G.hands[i%4].push(d[i]);
  G.hands.forEach(sortHand);
  G.dir=passDir(G);
  G.phase=G.dir==='none'?'play':'pass';
  G.passed=[null,null,null,null];  /* что каждый отдал (известно тому, кто отдал) */
  G.got=[null,null,null,null];     /* что каждый получил */
  G.trick=[];G.tricks=0;G.broken=false;G.taken=[0,0,0,0];G.takenCards=[[],[],[],[]];G.played=[];
  G.voids=[[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0]];
  G.lastTrick=null;G.roundRes=null;
  if(G.phase==='play')startPlay(G);
}
/* все четыре передачи сразу: picks[p] = 3 карты */
function applyPass(G,picks){
  if(G.phase!=='pass')return false;
  for(var p=0;p<4;p++){
    if(!picks[p]||picks[p].length!==3)return false;
    for(var k=0;k<3;k++)if(!G.hands[p].some(function(c){return same(c,picks[p][k]);}))return false;
  }
  for(p=0;p<4;p++){
    G.passed[p]=picks[p].slice();
    G.hands[p]=G.hands[p].filter(function(c){return !picks[p].some(function(x){return same(x,c);});});
  }
  for(p=0;p<4;p++){var to=passTo(G,p);G.got[to]=picks[p].slice();G.hands[to]=G.hands[to].concat(picks[p]);}
  G.hands.forEach(sortHand);
  startPlay(G);
  return true;
}
function startPlay(G){
  G.phase='play';
  for(var p=0;p<4;p++)if(G.hands[p].some(function(c){return c.s===CL&&c.r===2;})){G.leader=p;G.turn=p;}
}

/* ── ход ── */
function legal(G,p){
  if(G.phase!=='play'||G.turn!==p)return [];
  var h=G.hands[p];
  var first=G.tricks===0;
  if(!G.trick.length){
    if(first)return h.filter(function(c){return c.s===CL&&c.r===2;});
    if(!G.broken){var nh=h.filter(function(c){return c.s!==HE;});if(nh.length)return nh;}
    return h.slice();
  }
  var led=G.trick[0].c.s,fol=h.filter(function(c){return c.s===led;});
  if(fol.length)return fol;
  if(first){var safe=h.filter(function(c){return !pts(c);});if(safe.length)return safe;}
  return h.slice();
}
function winnerOf(trick){
  var led=trick[0].c.s,w=trick[0];
  trick.forEach(function(x){if(x.c.s===led&&rk(x.c)>rk(w.c))w=x;});
  return w.p;
}
function play(G,p,c){
  if(!legal(G,p).some(function(x){return same(x,c);}))return false;
  G.hands[p]=G.hands[p].filter(function(x){return !same(x,c);});
  if(G.trick.length&&c.s!==G.trick[0].c.s)G.voids[p][G.trick[0].c.s]=1;
  if(c.s===HE)G.broken=true;
  G.trick.push({p:p,c:c});G.played.push(c);
  if(G.trick.length<4){G.turn=(p+1)%4;return true;}
  var w=winnerOf(G.trick),sum=0;
  G.trick.forEach(function(x){sum+=pts(x.c);G.takenCards[w].push(x.c);});
  G.taken[w]+=sum;G.lastTrick={trick:G.trick,w:w,pts:sum};
  G.trick=[];G.tricks++;G.leader=w;G.turn=w;
  if(G.tricks===13)endRound(G);
  return true;
}
function endRound(G){
  var add=G.taken.slice(),moon=-1;
  for(var p=0;p<4;p++)if(G.taken[p]===26){moon=p;add=[26,26,26,26];add[p]=0;}
  for(p=0;p<4;p++)G.scores[p]+=add[p];
  G.roundRes={add:add,moon:moon,taken:G.taken.slice()};
  G.history.push(add);
  G.phase='roundEnd';G.turn=-1;
  if(G.scores.some(function(s){return s>=G.target;})){
    var m=Math.min.apply(null,G.scores);
    G.over=true;G.phase='over';G.winners=[];
    for(p=0;p<4;p++)if(G.scores[p]===m)G.winners.push(p);
  }
}

/* ════════ БОТЫ ════════
   easy    младшие карты с долей случайности, отдаёт старшие
   normal  отдаёт даму пик, старшие пики и черви, старается остаться без масти;
           подныривает под взятку, даму пик сбрасывает на чужую взятку, выманивает её младшими пиками
   hard    перебор: неизвестные карты раскладываются по соперникам с учётом известных пустых мастей
           и переданных карт, каждый вариант хода доигрывается до конца раздачи обычными ботами */
function count(h,s){var n=0;h.forEach(function(c){if(c.s===s)n++;});return n;}
function has(h,s,r){return h.some(function(c){return c.s===s&&c.r===r;});}
function hi(cards){var b=null;cards.forEach(function(c){if(!b||rk(c)>rk(b))b=c;});return b;}
function lo(cards){var b=null;cards.forEach(function(c){if(!b||rk(c)<rk(b))b=c;});return b;}
function qsOut(G){return G.played.some(isQS);}

function aiPass(G,p,lv,rnd){
  rnd=rnd||Math.random;
  var h=G.hands[p].slice();
  if(lv==='easy'){
    h.sort(function(a,b){return rk(b)-rk(a)+(rnd()-0.5)*6;});
    return h.slice(0,3);
  }
  var sp=count(h,SP),pick=[];
  function danger(c){
    var d=rk(c);
    if(isQS(c))d+=sp>=5?2:40;
    else if(c.s===SP&&rk(c)>12)d+=sp>=5?0:30;
    else if(c.s===SP)d-=12;                 /* младшие пики защищают даму, их держим */
    if(c.s===HE)d+=4;
    var n=count(h,c.s);
    if(c.s!==SP&&n<=2)d+=8;                 /* короткая масть: останемся без неё */
    if(c.s===CL&&c.r===2)d-=20;
    return d;
  }
  for(var k=0;k<3;k++){
    var best=null,bs=-1e9;
    h.forEach(function(c){var d=danger(c);if(d>bs){bs=d;best=c;}});
    pick.push(best);h=h.filter(function(c){return !same(c,best);});
  }
  return pick;
}

function aiPlay(G,p,lv,rnd,opt){
  rnd=rnd||Math.random;
  var L=legal(G,p);if(L.length<=1)return L[0];
  if(lv==='easy'){
    if(rnd()<0.35)return L[Math.floor(rnd()*L.length)];
    return lo(L);
  }
  if(lv==='hard'){
    opt=opt||{};
    if(G.tricks>=(opt.from!=null?opt.from:0))return search(G,p,L,rnd,opt.iters||60,opt.ms===undefined?300:opt.ms);
  }
  var h=G.hands[p],tr=G.trick,qOut=qsOut(G);
  var haveQ=has(h,SP,12);
  /* заход */
  if(!tr.length){
    var lead=L.filter(function(c){return !isQS(c);});if(!lead.length)lead=L;
    /* без дамы, туза и короля пик: выманиваем даму младшими пиками */
    if(!qOut&&!haveQ&&!has(h,SP,1)&&!has(h,SP,13)){
      var lowSp=lead.filter(function(c){return c.s===SP&&rk(c)<12;});
      if(lowSp.length)return lo(lowSp);
    }
    /* самая короткая безопасная масть, младшая карта */
    var best=null,bs=1e9;
    lead.forEach(function(c){
      var s=rk(c)+count(h,c.s)*1.5;
      if(c.s===HE)s+=6;
      if(c.s===SP&&!qOut&&(haveQ||rk(c)>12))s+=20;
      if(s<bs){bs=s;best=c;}
    });
    return best;
  }
  var led=tr[0].c.s,follow=L[0].s===led;
  var curW=tr[0];tr.forEach(function(x){if(x.c.s===led&&rk(x.c)>rk(curW.c))curW=x;});
  var wr=rk(curW.c),inTrick=0;tr.forEach(function(x){inTrick+=pts(x.c);});
  var last=tr.length===3;
  if(follow){
    /* дама пик на чужую старшую пику */
    if(led===SP&&haveQ&&wr>12)return {s:SP,r:12};
    var under=L.filter(function(c){return rk(c)<wr;});
    if(last&&inTrick===0){
      /* последний и очков нет: забираем старшей, но не дамой пик */
      var safe=L.filter(function(c){return !isQS(c);});
      if(safe.length)return hi(safe);
    }
    if(under.length){
      var u=under.filter(function(c){return !isQS(c);});
      return hi(u.length?u:under);
    }
    /* взятку не отдать: в пиках не кладём даму, если можно иначе */
    var nq=L.filter(function(c){return !isQS(c);});
    if(led===SP&&!qOut&&!last)return lo(nq.length?nq:L);
    return last?hi(nq.length?nq:L):lo(nq.length?nq:L);
  }
  /* сброс: дама пик, старшие пики, старшие черви, самая старшая карта из короткой масти */
  if(L.some(isQS))return {s:SP,r:12};
  if(!qOut){var bigSp=L.filter(function(c){return c.s===SP&&rk(c)>12;});if(bigSp.length)return hi(bigSp);}
  var hearts=L.filter(function(c){return c.s===HE;});
  if(hearts.length&&rk(hi(hearts))>=9)return hi(hearts);
  var bd=null,bv=-1e9;
  L.forEach(function(c){var v=rk(c)-count(h,c.s)*0.8+(c.s===HE?3:0);if(v>bv){bv=v;bd=c;}});
  return bd;
}

/* ── перебор для сложных ── */
function cloneR(G){
  var C={};for(var k in G)C[k]=G[k];
  C.hands=G.hands.map(function(h){return h.slice();});
  C.trick=G.trick.map(function(x){return {p:x.p,c:x.c};});
  C.taken=G.taken.slice();C.takenCards=G.takenCards.map(function(h){return h.slice();});
  C.played=G.played.slice();C.voids=G.voids.map(function(v){return v.slice();});
  C.scores=G.scores.slice();C.history=G.history.slice();
  return C;
}
/* неизвестные карты по рукам соперников: пустые масти и переданные им карты учитываются */
function determinize(G,p,rnd){
  var C=cloneR(G),known=[[],[],[],[]],gone={};
  G.hands[p].forEach(function(c){gone[cid(c)]=1;});
  G.played.forEach(function(c){gone[cid(c)]=1;});
  if(G.passed[p]){var to=passTo(G,p);G.passed[p].forEach(function(c){if(!gone[cid(c)]&&G.hands[to].some(function(x){return same(x,c);})){known[to].push(c);gone[cid(c)]=1;}});}
  var pool=fullDeck().filter(function(c){return !gone[cid(c)];});
  for(var tries=0;tries<30;tries++){
    shuffle(pool,rnd);
    var hands=[[],[],[],[]],need=[0,0,0,0],ok=true;
    for(var q=0;q<4;q++){if(q===p)continue;hands[q]=known[q].slice();need[q]=G.hands[q].length-known[q].length;}
    /* сначала карты с меньшим выбором мест */
    var cards=pool.slice().sort(function(a,b){return elig(a)-elig(b);});
    function elig(c){var n=0;for(var q=0;q<4;q++)if(q!==p&&!G.voids[q][c.s])n++;return n;}
    for(var i=0;i<cards.length&&ok;i++){
      var c=cards[i],opts=[];
      for(q=0;q<4;q++)if(q!==p&&need[q]>0&&(tries>25||!G.voids[q][c.s]))opts.push(q);
      if(!opts.length){ok=false;break;}
      var pq=opts[Math.floor(rnd()*opts.length)];hands[pq].push(c);need[pq]--;
    }
    if(ok){for(q=0;q<4;q++)if(q!==p)C.hands[q]=hands[q];return C;}
  }
  return C;
}
function rolloutR(C,p,rnd){
  var steps=0;
  while(C.phase==='play'&&steps<60){var q=C.turn,c=aiPlay(C,q,'normal',rnd);if(!c||!play(C,q,c))break;steps++;}
  var t=C.taken.slice();
  for(var q=0;q<4;q++)if(t[q]===26){t=[26,26,26,26];t[q]=0;}
  var others=0;for(q=0;q<4;q++)if(q!==p)others+=t[q];
  return t[p]-others/3;
}
function search(G,p,L,rnd,iters,ms){
  var base=aiPlay(G,p,'normal',rnd);
  var score=L.map(function(){return 0;}),n=0,t0=Date.now();
  while(n<iters&&(!ms||Date.now()-t0<ms||n<3)){
    var D=determinize(G,p,rnd);
    L.forEach(function(c,i){var C=cloneR(D);play(C,p,c);score[i]+=rolloutR(C,p,rnd);});
    n++;
  }
  var bi=0,bs=1e9;
  L.forEach(function(c,i){var s=score[i]-(base&&same(c,base)?0.01*n:0);if(s<bs){bs=s;bi=i;}});
  return L[bi];
}

window.HRRules={rng:rng,rk:rk,cid:cid,same:same,pts:pts,isQS:isQS,sortHand:sortHand,newMatch:newMatch,deal:deal,passDir:passDir,passTo:passTo,
  applyPass:applyPass,legal:legal,play:play,winnerOf:winnerOf,aiPass:aiPass,aiPlay:aiPlay};
})();
