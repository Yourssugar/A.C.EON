/* A.C.EON FLOOD: правила заливки и захвата. Без DOM, проверяется в node.

   Поле: w x h клеток, col[i] цвет 0..k-1, own[i] владелец (0 ничья, 1 игрок или первый, 2 второй).
   Заливка (одиночная): своя область стоит в левом верхнем углу. Ход: область перекрашивается
   в выбранный цвет и забирает соседние клетки этого цвета. Цель: залить всё поле за лимит ходов.
   Лимит считает робот (поиск лучом), к нему прибавляется запас по сложности.
   Захват (вдвоём): второй стоит в правом нижнем углу. Нельзя брать свой цвет и цвет соперника.
   Побеждает тот, у кого больше половины клеток.

   FlRules.make({w,h,k,seed,duel})  pick(st,p,c)  solve(st)  botMove(st,p,level) */
(function(){
'use strict';

function rng(seed){var a=seed|0;return function(){a=(a+0x6D2B79F5)|0;var t=Math.imul(a^(a>>>15),1|a);t=(t+Math.imul(t^(t>>>7),61|t))^t;return ((t^(t>>>14))>>>0)/4294967296;};}

function neighbors(w,h){
  var n=w*h,nb=new Array(n);
  for(var i=0;i<n;i++){var x=i%w,y=(i/w)|0,a=[];
    if(x>0)a.push(i-1);if(x<w-1)a.push(i+1);if(y>0)a.push(i-w);if(y<h-1)a.push(i+w);nb[i]=a;}
  return nb;
}
var NB={};
function nbFor(w,h){var k=w+'x'+h;return NB[k]||(NB[k]=neighbors(w,h));}

/* поле; в захвате углы игроков разного цвета, иначе ход невозможен */
function make(o){
  var w=o.w,h=o.h,k=o.k,r=rng(o.seed||Math.floor(Math.random()*1e9)),n=w*h,col=new Array(n),own=new Array(n);
  for(var i=0;i<n;i++){col[i]=Math.floor(r()*k);own[i]=0;}
  var st={w:w,h:h,k:k,n:n,col:col,own:own,nb:nbFor(w,h),duel:!!o.duel,moves:0,turn:1,cnt:[0,0,0],hist:[]};
  if(st.duel){
    var b=n-1;while(col[b]===col[0])col[b]=Math.floor(r()*k);
    /* соседние клетки углов не того же цвета, чтобы старт был ровный */
    st.nb[0].forEach(function(j){while(col[j]===col[0]||col[j]===col[b])col[j]=Math.floor(r()*k);});
    st.nb[b].forEach(function(j){while(col[j]===col[0]||col[j]===col[b])col[j]=Math.floor(r()*k);});
    claim(st,1,0);claim(st,2,b);
  }else claim(st,1,0);
  return st;
}
/* забрать клетку start и всё связное того же цвета, затем расти */
function claim(st,p,start){
  st.own[start]=p;st.cnt[p]++;grow(st,p,st.col[start]);
}
/* область p (уже цвета c) забирает соседние свободные клетки цвета c; возвращает сколько */
function grow(st,p,c){
  var own=st.own,col=st.col,nb=st.nb,stack=[],got=0,i,j,a,q;
  for(i=0;i<st.n;i++)if(own[i]===p)stack.push(i);
  while(stack.length){i=stack.pop();a=nb[i];
    for(q=0;q<a.length;q++){j=a[q];if(own[j]===0&&col[j]===c){own[j]=p;got++;stack.push(j);}}}
  st.cnt[p]+=got;return got;
}
function colorOf(st,p){for(var i=0;i<st.n;i++)if(st.own[i]===p)return st.col[i];return -1;}
function canPick(st,p,c){
  if(c<0||c>=st.k)return false;
  if(c===colorOf(st,p))return false;
  if(st.duel&&c===colorOf(st,3-p))return false;
  return true;
}
/* ход: перекрасить область p в c и вырасти. Возвращает список новых клеток (для анимации) */
function pick(st,p,c){
  if(!canPick(st,p,c))return null;
  var before=st.own.slice(),prev=[];
  for(var i=0;i<st.n;i++)if(st.own[i]===p){prev.push(st.col[i]);st.col[i]=c;}
  st.hist.push({p:p,c:c,own:before,col:prev});
  grow(st,p,c);
  var fresh=[];for(i=0;i<st.n;i++)if(st.own[i]===p&&before[i]!==p)fresh.push(i);
  st.moves++;
  if(st.duel)st.turn=3-p;
  return fresh;
}
function undo(st){
  var h=st.hist.pop();if(!h)return false;
  var q=0;for(var i=0;i<st.n;i++)if(h.own[i]===h.p)st.col[i]=h.col[q++];
  st.own=h.own;st.cnt=[0,0,0];for(i=0;i<st.n;i++)st.cnt[st.own[i]]++;
  st.moves--;if(st.duel)st.turn=h.p;
  return true;
}
function done(st){
  if(st.duel)return st.cnt[1]*2>st.n||st.cnt[2]*2>st.n||st.cnt[1]+st.cnt[2]===st.n;
  return st.cnt[1]===st.n;
}

/* ── быстрые копии для поиска ── */
function lite(st){return {w:st.w,h:st.h,k:st.k,n:st.n,col:st.col.slice(),own:st.own.slice(),nb:st.nb,duel:st.duel,cnt:st.cnt.slice(),moves:st.moves,turn:st.turn,hist:[]};}
function apply(s,p,c){for(var i=0;i<s.n;i++)if(s.own[i]===p)s.col[i]=c;var g=grow(s,p,c);s.moves++;if(s.duel)s.turn=3-p;return g;}
/* сколько клеток каждого цвета ещё не захвачено */
function left(s){var a=[];for(var c=0;c<s.k;c++)a[c]=0;for(var i=0;i<s.n;i++)if(s.own[i]===0)a[s.col[i]]++;return a;}
/* оценка для одиночной заливки: больше область, меньше цветов осталось, ближе к дальнему углу */
function score1(s){
  var l=left(s),gone=0;for(var c=0;c<s.k;c++)if(!l[c])gone++;
  var far=0;for(var i=0;i<s.n;i++)if(s.own[i]===1){var x=i%s.w,y=(i/s.w)|0;if(x+y>far)far=x+y;}
  return s.cnt[1]+gone*s.n*0.08+far*0.6;
}
/* робот для лимита: поиск лучом шириной B, до конца поля */
function solve(st,B){
  B=B||24;
  var beam=[{s:lite(st),path:[]}];
  for(var step=0;step<400;step++){
    var next=[],i,c;
    for(i=0;i<beam.length;i++){var b=beam[i];
      if(b.s.cnt[1]===b.s.n)return b.path;
      var cur=colorOf(b.s,1);
      for(c=0;c<b.s.k;c++){if(c===cur)continue;
        var s=lite(b.s),g=apply(s,1,c);if(!g)continue;
        next.push({s:s,path:b.path.concat(c),v:score1(s)});}
    }
    if(!next.length)return beam[0].path;
    next.sort(function(a,b){return b.v-a.v;});
    /* убрать одинаковые по площади и цвету, чтобы луч не забивался копиями */
    var seen={},nb2=[];
    for(i=0;i<next.length&&nb2.length<B;i++){var key=next[i].s.cnt[1]+':'+colorOf(next[i].s,1)+':'+Math.round(next[i].v*10);if(seen[key])continue;seen[key]=1;nb2.push(next[i]);}
    beam=nb2;
  }
  return beam[0].path;
}
/* подсказка: первый ход из решения робота */
function hint(st){var p=solve(st,12);return p.length?p[0]:-1;}

/* ── бот захвата ──
   easy: чаще всего жадный, но иногда случайный ход; normal: жадный с оглядкой на ответ;
   hard: перебор на 4 полухода с оценкой (своих - чужих) и доступной границы. */
function frontier(s,p){
  var seen={},v=0;
  for(var i=0;i<s.n;i++)if(s.own[i]===p){var a=s.nb[i];for(var q=0;q<a.length;q++){var j=a[q];if(s.own[j]===0&&!seen[j]){seen[j]=1;v++;}}}
  return v;
}
function evalD(s,p){return (s.cnt[p]-s.cnt[3-p])*10+(frontier(s,p)-frontier(s,3-p))*2;}
function options(s,p){var a=[],me=colorOf(s,p),op=colorOf(s,3-p);for(var c=0;c<s.k;c++)if(c!==me&&c!==op)a.push(c);return a;}
function search(s,p,me,depth,alpha,beta){
  if(depth===0||s.cnt[1]*2>s.n||s.cnt[2]*2>s.n||s.cnt[1]+s.cnt[2]===s.n){
    var e=evalD(s,me);if(s.cnt[me]*2>s.n)e+=100000;if(s.cnt[3-me]*2>s.n)e-=100000;return e;}
  var opts=options(s,p),best=p===me?-1e9:1e9;
  for(var i=0;i<opts.length;i++){var t=lite(s);apply(t,p,opts[i]);var v=search(t,3-p,me,depth-1,alpha,beta);
    if(p===me){if(v>best)best=v;if(v>alpha)alpha=v;}else{if(v<best)best=v;if(v<beta)beta=v;}
    if(beta<=alpha)break;}
  return best;
}
function botMove(st,p,level,rnd){
  rnd=rnd||Math.random;
  var opts=options(st,p);if(!opts.length)return -1;
  var scored=opts.map(function(c){var t=lite(st);var g=apply(t,p,c);
    var v;
    if(level==='hard')v=search(t,3-p,p,5,-1e9,1e9);
    else if(level==='normal'){v=g*10+frontier(t,p)*2;
      /* оглядка: лучший ответ соперника после этого хода */
      var o=options(t,3-p),worst=0;o.forEach(function(oc){var u=lite(t);var gg=apply(u,3-p,oc);if(gg>worst)worst=gg;});v-=worst*6;}
    else v=g*10+frontier(t,p);
    return {c:c,v:v};});
  scored.sort(function(a,b){return b.v-a.v;});
  if(level==='easy'&&rnd()<0.35)return scored[Math.floor(rnd()*scored.length)].c;
  return scored[0].c;
}

window.FlRules={rng:rng,make:make,pick:pick,undo:undo,done:done,canPick:canPick,colorOf:colorOf,solve:solve,hint:hint,botMove:botMove,lite:lite,left:left};
})();
