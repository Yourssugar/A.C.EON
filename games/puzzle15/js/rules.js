/* A.C.EON 15: правила пятнашек. Без DOM, проверяется в node.

   Поле n x n, t[i] номер плитки (1..n*n-1), 0 пустая клетка. Собрано: 1,2,...,n*n-1 и пустая в конце.
   tap(st,i): плитка i и все между ней и пустой клеткой в той же строке или столбце сдвигаются (каждая плитка = ход).
   slide(st,dir): одна плитка въезжает в пустую клетку; dir это куда едет плитка: 'l','r','u','d'.
   solve(t,n,limit): IDA* (манхэттен + линейные конфликты), только 3x3 и 4x4, с лимитом узлов. */
(function(){
'use strict';

function rng(seed){var a=seed|0;return function(){a=(a+0x6D2B79F5)|0;var x=Math.imul(a^(a>>>15),1|a);x=(x+Math.imul(x^(x>>>7),61|x))^x;return ((x^(x>>>14))>>>0)/4294967296;};}

function solvedArr(n){var a=[];for(var i=1;i<n*n;i++)a.push(i);a.push(0);return a;}
function isSolved(t){for(var i=0;i<t.length-1;i++)if(t[i]!==i+1)return false;return true;}
function solvable(t,n){
  var inv=0,b=t.indexOf(0),i,j;
  for(i=0;i<t.length;i++)for(j=i+1;j<t.length;j++)if(t[i]&&t[j]&&t[i]>t[j])inv++;
  if(n%2)return inv%2===0;
  var rowFromBottom=n-Math.floor(b/n);
  return (inv+rowFromBottom)%2===1;
}
/* случайное решаемое поле, не собранное и без плиток на своих местах больше половины */
function shuffle(n,rnd){
  rnd=rnd||Math.random;
  for(var tries=0;tries<200;tries++){
    var t=solvedArr(n);
    for(var i=t.length-1;i>0;i--){var j=Math.floor(rnd()*(i+1)),x=t[i];t[i]=t[j];t[j]=x;}
    if(!solvable(t,n)){var a=t[0]&&t[1]?0:2,b=a+1;var y=t[a];t[a]=t[b];t[b]=y;}
    var ok=0;for(i=0;i<t.length;i++)if(t[i]===i+1)ok++;
    if(!isSolved(t)&&ok<t.length/2)return t;
  }
  return t;
}
/* перемешивание случайными ходами (для задачи дня: недалеко от решения, робот считает точно) */
function walk(n,steps,rnd){
  var t=solvedArr(n),b=t.length-1,prev=-1;
  for(var s=0;s<steps;s++){
    var nb=nbrs(b,n).filter(function(x){return x!==prev;});
    var j=nb[Math.floor(rnd()*nb.length)];t[b]=t[j];t[j]=0;prev=b;b=j;
  }
  if(isSolved(t))return walk(n,steps+1,rnd);
  return t;
}
function nbrs(i,n){var a=[],r=Math.floor(i/n),c=i%n;if(r>0)a.push(i-n);if(r<n-1)a.push(i+n);if(c>0)a.push(i-1);if(c<n-1)a.push(i+1);return a;}

function make(n,t){return {n:n,t:t,moves:0,hist:[]};}
/* сдвиг по нажатию: возвращает список [{tile,from,to}] или null */
function tap(st,i){
  var n=st.n,t=st.t,b=t.indexOf(0),r=Math.floor(i/n),c=i%n,br=Math.floor(b/n),bc=b%n,step;
  if(i===b)return null;
  if(r===br)step=c<bc?-1:1;else if(c===bc)step=r<br?-n:n;else return null;
  var out=[];
  while(b!==i){var j=b+step;out.push({tile:t[j],from:j,to:b});t[b]=t[j];t[j]=0;b=j;st.moves++;}
  st.hist.push(out.length);
  return out;
}
function slide(st,dir){
  var n=st.n,b=st.t.indexOf(0),r=Math.floor(b/n),c=b%n,src=-1;
  /* плитка едет в сторону dir, значит она стоит с противоположной стороны пустой */
  if(dir==='l'&&c<n-1)src=b+1;if(dir==='r'&&c>0)src=b-1;if(dir==='u'&&r<n-1)src=b+n;if(dir==='d'&&r>0)src=b-n;
  if(src<0)return null;
  return tap(st,src);
}

/* ── решатель ── */
function solve(t0,n,limit){
  if(n>4)return null;
  limit=limit||2000000;
  var t=t0.slice(),N=n*n,goalR=[],goalC=[],i;
  for(i=0;i<N;i++){goalR[i]=-1;goalC[i]=-1;}
  for(i=1;i<N;i++){goalR[i]=Math.floor((i-1)/n);goalC[i]=(i-1)%n;}
  function h(){
    var s=0,r,c,v,k,v2;
    for(i=0;i<N;i++){v=t[i];if(!v)continue;s+=Math.abs(Math.floor(i/n)-goalR[v])+Math.abs(i%n-goalC[v]);}
    /* линейные конфликты: две плитки в своей строке (столбце) в обратном порядке */
    for(r=0;r<n;r++)for(c=0;c<n;c++){v=t[r*n+c];if(!v||goalR[v]!==r)continue;
      for(k=c+1;k<n;k++){v2=t[r*n+k];if(v2&&goalR[v2]===r&&goalC[v2]<goalC[v])s+=2;}}
    for(c=0;c<n;c++)for(r=0;r<n;r++){v=t[r*n+c];if(!v||goalC[v]!==c)continue;
      for(k=r+1;k<n;k++){v2=t[k*n+c];if(v2&&goalC[v2]===c&&goalR[v2]<goalR[v])s+=2;}}
    return s;
  }
  var path=[],nodes=0,found=false,NB=[];for(i=0;i<N;i++)NB[i]=nbrs(i,n);
  function dfs(b,g,bound,prev){
    var f=g+h();if(f>bound)return f;
    if(f===g&&isSolved(t)){found=true;return f;}
    if(++nodes>limit)return Infinity;
    var min=Infinity,a=NB[b];
    for(var q=0;q<a.length;q++){var j=a[q];if(j===prev)continue;
      t[b]=t[j];t[j]=0;path.push(j);
      var res=dfs(j,g+1,bound,b);
      if(found)return res;
      path.pop();t[j]=t[b];t[b]=0;
      if(res<min)min=res;}
    return min;
  }
  var b0=t.indexOf(0),bound=h();
  while(!found){var res=dfs(b0,0,bound,-1);if(found)break;if(res===Infinity)return null;bound=res;}
  /* путь: клетки, откуда плитка въезжает в пустую */
  return path.slice();
}

window.P15Rules={rng:rng,solvedArr:solvedArr,isSolved:isSolved,solvable:solvable,shuffle:shuffle,walk:walk,make:make,tap:tap,slide:slide,solve:solve,nbrs:nbrs};
})();
