/* A.C.EON MINESWEEPER: правила, генерация поля и логический решатель. Без DOM.

   Поле хранится плоскими массивами, клетка i = r*C+c.
   g: {R,C,M, mine:[0/1], num:[0..8], open:[0/1], mark:[0 нет,1 флаг,2 вопрос], placed, blown:[i..]}

   MsRules.create(R,C,M)
   MsRules.place(g,first,opts)     расставить мины после первого нажатия; opts.noGuess: поле решается без угадывания
   MsRules.reveal(g,i)             {boom:bool, opened:[i..] по порядку волны}
   MsRules.chord(g,i)              открыть соседей числа, если флагов вокруг столько же, сколько мин
   MsRules.solve(g)                что можно вывести из открытого: {safe:[i..], mines:[i..]} */
(function(){
'use strict';

function fill(v,n){var a=new Array(n);for(var i=0;i<n;i++)a[i]=v;return a;}

function create(R,C,M){
  var n=R*C;
  M=Math.max(1,Math.min(M,n-1));
  return {R:R,C:C,M:M,mine:fill(0,n),num:fill(0,n),open:fill(0,n),mark:fill(0,n),placed:false,blown:[]};
}

/* соседи клетки; кэш на размер поля */
var nbCache={};
function nbList(R,C){
  var key=R+'x'+C;
  if(nbCache[key])return nbCache[key];
  var out=[];
  for(var r=0;r<R;r++)for(var c=0;c<C;c++){
    var l=[];
    for(var dr=-1;dr<=1;dr++)for(var dc=-1;dc<=1;dc++){
      if(!dr&&!dc)continue;
      var rr=r+dr,cc=c+dc;
      if(rr>=0&&rr<R&&cc>=0&&cc<C)l.push(rr*C+cc);
    }
    out.push(l);
  }
  nbCache[key]=out;
  return out;
}
function nb(g,i){return nbList(g.R,g.C)[i];}

function countNums(g){
  var NB=nbList(g.R,g.C);
  for(var i=0;i<g.R*g.C;i++){
    var k=0,l=NB[i];
    for(var j=0;j<l.length;j++)k+=g.mine[l[j]];
    g.num[i]=k;
  }
}

/* случайная расстановка: вокруг первой клетки пусто, чтобы сразу открылась область */
function scatter(g,first,rand){
  var n=g.R*g.C,ban={};
  ban[first]=1;
  var zone=nb(g,first);
  if(n-1-zone.length>=g.M)zone.forEach(function(j){ban[j]=1;});
  var pool=[];
  for(var i=0;i<n;i++)if(!ban[i])pool.push(i);
  for(i=0;i<n;i++)g.mine[i]=0;
  for(var k=0;k<g.M;k++){
    var p=k+Math.floor(rand()*(pool.length-k));
    var t=pool[k];pool[k]=pool[p];pool[p]=t;
    g.mine[pool[k]]=1;
  }
  countNums(g);
}

function place(g,first,opts){
  opts=opts||{};
  var rand=opts.rand||Math.random;
  var guaranteed=false;
  if(opts.noGuess){
    var t0=Date.now(),budget=opts.budget||1800,tries=0;
    while(true){
      tries++;
      scatter(g,first,rand);
      if(solvableFrom(g,first)){guaranteed=true;break;}
      if(Date.now()-t0>budget)break;
    }
    g.tries=tries;
  }else scatter(g,first,rand);
  g.placed=true;
  g.noGuess=guaranteed;
  return guaranteed;
}

/* открыть клетку; пустые открывают соседей волной */
function reveal(g,i){
  if(g.open[i]||g.mark[i]===1)return {boom:false,opened:[]};
  if(g.mine[i]){g.open[i]=1;g.blown.push(i);return {boom:true,opened:[i]};}
  var NB=nbList(g.R,g.C),q=[i],opened=[];
  g.open[i]=1;g.mark[i]=0;
  for(var h=0;h<q.length;h++){
    var x=q[h];opened.push(x);
    if(g.num[x]!==0)continue;
    var l=NB[x];
    for(var j=0;j<l.length;j++){
      var y=l[j];
      if(!g.open[y]&&!g.mine[y]&&g.mark[y]!==1){g.open[y]=1;g.mark[y]=0;q.push(y);}
    }
  }
  return {boom:false,opened:opened};
}

/* нажатие на открытое число: если флагов вокруг ровно столько, открыть остальных соседей */
function chord(g,i){
  var out={boom:false,opened:[],booms:[]};
  if(!g.open[i]||g.mine[i]||!g.num[i])return out;
  var l=nb(g,i),flags=0,closed=0;
  l.forEach(function(j){if(g.mark[j]===1||(g.open[j]&&g.mine[j]))flags++;else if(!g.open[j])closed++;});
  if(flags!==g.num[i]||!closed)return out;
  l.forEach(function(j){
    if(g.open[j]||g.mark[j]===1)return;
    var r=reveal(g,j);
    if(r.boom){out.boom=true;out.booms.push(j);}
    out.opened=out.opened.concat(r.opened);
  });
  return out;
}

function safeLeft(g){
  var k=0;
  for(var i=0;i<g.R*g.C;i++)if(!g.mine[i]&&!g.open[i])k++;
  return k;
}
function won(g){return g.placed&&safeLeft(g)===0;}
function flags(g){var k=0;for(var i=0;i<g.R*g.C;i++)if(g.mark[i]===1||(g.open[i]&&g.mine[i]))k++;return k;}

/* ════════ РЕШАТЕЛЬ ════════
   Работает только с тем, что видит игрок: открытые числа и мины, которые
   уже вскрылись (в режиме жизней). Флаги игрока не учитываются, они могут быть ошибочными.
   Правила: 1) у числа осталось k мин среди u закрытых соседей: k=0 все безопасны, k=u все мины;
   2) пары чисел: если закрытые соседи A входят в соседей B, разница содержит k(B)-k(A) мин;
   3) общий счёт мин в конце игры. */
function deduce(R,C,M,known,numOf,known_mine,stopAtFirst){
  var NB=nbList(R,C),n=R*C;
  var safe=[],mines=[];
  var isSafe=fill(0,n),isMine=fill(0,n);
  for(var i=0;i<n;i++){if(known[i])isSafe[i]=1;if(known_mine[i])isMine[i]=1;}
  function markSafe(j){if(!isSafe[j]&&!isMine[j]){isSafe[j]=1;safe.push(j);return true;}return false;}
  function markMine(j){if(!isSafe[j]&&!isMine[j]){isMine[j]=1;mines.push(j);return true;}return false;}
  var progress=true;
  while(progress){
    progress=false;
    var cons=[];
    for(i=0;i<n;i++){
      if(!known[i])continue;
      var l=NB[i],u=[],k=numOf(i);
      if(k<0)continue;
      for(var j=0;j<l.length;j++){
        var y=l[j];
        if(isMine[y])k--;
        else if(!known[y]&&!isSafe[y])u.push(y);
      }
      if(!u.length)continue;
      if(k===0){u.forEach(function(y){if(markSafe(y))progress=true;});}
      else if(k===u.length){u.forEach(function(y){if(markMine(y))progress=true;});}
      else cons.push({c:i,u:u,k:k});
      if(stopAtFirst&&(safe.length||mines.length))return {safe:safe,mines:mines};
    }
    if(progress)continue;
    /* пары: соседние ограничения (центры не дальше 2 клеток) */
    var at={};
    cons.forEach(function(o,idx){at[o.c]=idx;});
    for(var a=0;a<cons.length&&!progress;a++){
      var A=cons[a],ar=Math.floor(A.c/C),ac=A.c%C;
      for(var dr=-2;dr<=2&&!progress;dr++)for(var dc=-2;dc<=2&&!progress;dc++){
        if(!dr&&!dc)continue;
        var rr=ar+dr,cc=ac+dc;
        if(rr<0||rr>=R||cc<0||cc>=C)continue;
        var bi=at[rr*C+cc];if(bi===undefined)continue;
        var B=cons[bi];
        /* A внутри B? */
        var inside=true;
        for(var x=0;x<A.u.length;x++)if(B.u.indexOf(A.u[x])<0){inside=false;break;}
        if(!inside)continue;
        var diff=B.u.filter(function(y){return A.u.indexOf(y)<0;});
        if(!diff.length)continue;
        var kd=B.k-A.k;
        if(kd===0)diff.forEach(function(y){if(markSafe(y))progress=true;});
        else if(kd===diff.length)diff.forEach(function(y){if(markMine(y))progress=true;});
      }
    }
    if(progress){if(stopAtFirst)return {safe:safe,mines:mines};continue;}
    /* общий счёт мин */
    var unk=[],mk=0;
    for(i=0;i<n;i++){if(isMine[i])mk++;else if(!known[i]&&!isSafe[i])unk.push(i);}
    if(unk.length){
      if(mk===M)unk.forEach(function(y){if(markSafe(y))progress=true;});
      else if(M-mk===unk.length)unk.forEach(function(y){if(markMine(y))progress=true;});
    }
    if(stopAtFirst&&(safe.length||mines.length))return {safe:safe,mines:mines};
  }
  return {safe:safe,mines:mines};
}

/* решаемо ли поле без угадывания, начиная с first */
function solvableFrom(g,first){
  var n=g.R*g.C,NB=nbList(g.R,g.C);
  var known=fill(0,n),kmine=fill(0,n),cnt=0,need=n-g.M;
  function open(i){
    if(known[i]||g.mine[i])return;
    var q=[i];known[i]=1;cnt++;
    for(var h=0;h<q.length;h++){
      var x=q[h];if(g.num[x])continue;
      NB[x].forEach(function(y){if(!known[y]&&!g.mine[y]){known[y]=1;cnt++;q.push(y);}});
    }
  }
  open(first);
  var guard=0;
  while(cnt<need&&guard++<n){
    var r=deduce(g.R,g.C,g.M,known,function(i){return g.num[i];},kmine,false);
    if(!r.safe.length&&!r.mines.length)return false;
    r.mines.forEach(function(i){kmine[i]=1;});
    r.safe.forEach(open);
  }
  return cnt>=need;
}

/* подсказка для игрока: что следует из открытого сейчас */
function solve(g){
  var n=g.R*g.C,known=fill(0,n),km=fill(0,n);
  for(var i=0;i<n;i++){if(g.open[i]&&!g.mine[i])known[i]=1;if(g.open[i]&&g.mine[i])km[i]=1;}
  return deduce(g.R,g.C,g.M,known,function(i){return g.num[i];},km,false);
}

window.MsRules={create:create,place:place,reveal:reveal,chord:chord,won:won,safeLeft:safeLeft,flags:flags,nb:nb,solve:solve,solvableFrom:solvableFrom};
})();
