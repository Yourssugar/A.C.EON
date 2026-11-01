/* A.C.EON BUBBLES: 30 уровней, 3 мира по 10.
   Уровень собирается из формы (какие клетки заняты) и раскраски, особые шары ставятся по зерну.
   Выстрелы и звёзды подобраны ботом (tools: bub_levels.js): shots = лимит, s3/s2 = выстрелов на 3 и 2 звезды.

   BubLevels.get(n) -> {layout:[строки], colors, shots, s3, s2, press, world, seed} */
(function(){
'use strict';

var COLS=10;
function rng(seed){var a=seed|0;return function(){a=(a+0x6D2B79F5)|0;var t=Math.imul(a^(a>>>15),1|a);t=(t+Math.imul(t^(t>>>7),61|t))^t;return ((t^(t>>>14))>>>0)/4294967296;};}
function nc(r){return r%2?COLS-1:COLS;}

/* ── формы: функция(r, c, rows) -> занята ли клетка ── */
var SHAPES={
  full:function(){return true;},
  wave:function(r,c,n){var x=c+(r%2?0.5:0);return r<n-2.6+Math.sin(x/1.5)*2.4;},
  tri:function(r,c,n){var w=nc(r),m=Math.floor((n-r)*w/n/2);return c>=Math.floor(w/2)-m-1&&c<=Math.ceil(w/2)+m;},
  vee:function(r,c){var w=nc(r);return c<=r||c>=w-1-r;},
  diamond:function(r,c,n){var w=nc(r),mid=(n-1)/2,k=Math.round((mid-Math.abs(r-mid))*1.4)+1;return Math.abs(c-(w-1)/2)<k;},
  cols:function(r,c){return c%3!==2;},
  ring:function(r,c,n){var w=nc(r);return r===0||r===n-1||c<=1||c>=w-2;},
  checker:function(r,c){return ((c+(r>>1))%4)<3;},
  arch:function(r,c,n){var w=nc(r);return r<2||c<2||c>w-3;},
  zig:function(r,c){return ((c+r)%5)!==4;},
  heart:function(r,c){var m=['.xxx..xxx.','xxxxxxxxx','xxxxxxxxxx','xxxxxxxxx','.xxxxxxxx.','.xxxxxxx.','...xxxx...','...xxx...'];return (m[r]||'').charAt(c)==='x';}
};

/* ── раскраска ── */
function paint(mode,r,c,cols,rnd,mem){
  if(mode==='rows')return Math.floor(r/2)%cols;
  if(mode==='bands')return Math.floor((c+(r%2?0.5:0))/2.5)%cols;
  if(mode==='blob'){var k=r+'_'+c;if(mem[k]!=null)return mem[k];return null;}
  return Math.floor(rnd()*cols);
}
/* пятна по 3-6 шаров одного цвета: легче, чем случайные */
function blobs(rows,mask,cols,rnd){
  var mem={},cells=[];for(var r=0;r<rows;r++)for(var c=0;c<nc(r);c++)if(mask[r][c])cells.push([r,c]);
  cells.forEach(function(p){
    var k=p[0]+'_'+p[1];if(mem[k]!=null)return;
    var col=Math.floor(rnd()*cols),size=3+Math.floor(rnd()*4),q=[p];mem[k]=col;var n=1;
    while(q.length&&n<size){var a=q.shift(),o=a[0]%2===1;
      var nb=[[a[0],a[1]-1],[a[0],a[1]+1],[a[0]+1,o?a[1]:a[1]-1],[a[0]+1,o?a[1]+1:a[1]]];
      for(var i=0;i<nb.length&&n<size;i++){var b=nb[i],kk=b[0]+'_'+b[1];if(b[0]<rows&&b[1]>=0&&b[1]<nc(b[0])&&mask[b[0]][b[1]]&&mem[kk]==null){mem[kk]=col;n++;q.push(b);}}}
  });
  return mem;
}

/* мир 1 риф: 3-4 цвета, формы. мир 2 облака: лёд и бомбы, потолок. мир 3 туманность: камни, 5-6 цветов, потолок чаще */
var DEFS=[
 /* риф */
 {shape:'full',rows:4,colors:3,paint:'blob'},
 {shape:'tri',rows:6,colors:3,paint:'blob'},
 {shape:'vee',rows:5,colors:3,paint:'rows'},
 {shape:'wave',rows:7,colors:4,paint:'blob'},
 {shape:'cols',rows:6,colors:4,paint:'bands'},
 {shape:'heart',rows:8,colors:4,paint:'blob'},
 {shape:'checker',rows:6,colors:4,paint:'blob',press:12},
 {shape:'arch',rows:7,colors:4,paint:'rows',press:12},
 {shape:'zig',rows:7,colors:4,paint:'rand',press:12},
 {shape:'full',rows:7,colors:4,paint:'blob',press:10},
 /* облака */
 {shape:'tri',rows:6,colors:4,paint:'blob',ice:4},
 {shape:'full',rows:6,colors:4,paint:'rows',ice:6,press:12},
 {shape:'wave',rows:7,colors:4,paint:'blob',bomb:2,press:12},
 {shape:'ring',rows:7,colors:4,paint:'bands',ice:6,press:11},
 {shape:'heart',rows:8,colors:5,paint:'blob',bomb:2,ice:4,press:11},
 {shape:'cols',rows:7,colors:5,paint:'blob',ice:8,press:10},
 {shape:'vee',rows:6,colors:5,paint:'rand',bomb:3,press:10},
 {shape:'arch',rows:8,colors:5,paint:'blob',ice:6,bomb:2,press:10},
 {shape:'checker',rows:8,colors:5,paint:'rows',ice:8,press:9},
 {shape:'full',rows:8,colors:5,paint:'blob',ice:8,bomb:3,press:9},
 /* туманность */
 {anchor:2,shape:'full',rows:6,colors:5,paint:'blob',stone:4,press:10},
 {anchor:2,shape:'tri',rows:7,colors:5,paint:'rand',stone:4,press:10},
 {anchor:2,shape:'wave',rows:8,colors:5,paint:'blob',stone:4,ice:6,press:9},
 {anchor:2,shape:'zig',rows:7,colors:5,paint:'bands',stone:5,ice:4,press:9},
 {anchor:3,shape:'ring',rows:8,colors:6,paint:'blob',stone:4,ice:4,press:9},
 {anchor:3,shape:'heart',rows:8,colors:6,paint:'blob',stone:4,bomb:2,press:8},
 {anchor:3,shape:'cols',rows:8,colors:6,paint:'rand',stone:6,press:8},
 {anchor:3,shape:'arch',rows:8,colors:6,paint:'blob',stone:5,ice:6,bomb:2,press:8},
 {anchor:4,shape:'checker',rows:8,colors:6,paint:'blob',stone:6,ice:6,press:8},
 {anchor:4,shape:'full',rows:8,colors:6,paint:'blob',stone:6,ice:8,bomb:3,press:7}
];
/* выстрелы и звёзды, подобраны ботом: [shots, s3, s2] */
var TUNE=[[16,9,12],[38,23,30],[21,12,16],[29,19,23],[56,13,45],[36,21,29],[55,29,44],[39,11,31],[45,27,36],[45,27,36],[43,24,34],[36,20,29],[55,27,44],[30,14,22],[62,31,50],[60,25,48],[48,30,38],[60,36,48],[60,36,48],[55,36,44],[73,44,59],[56,36,45],[62,39,50],[33,21,26],[55,31,44],[45,28,36],[82,39,66],[70,36,57],[31,20,24],[53,35,43]];

var CH='rbgypc';
function build(n){
  var d=DEFS[n],rnd=rng(1000+n*37),rows=d.rows,mask=[],r,c;
  for(r=0;r<rows;r++){mask.push([]);for(c=0;c<nc(r);c++)mask[r].push(!!SHAPES[d.shape](r,c,rows));}
  /* верхний ряд должен держать фигуру: хотя бы по шару в каждой «колонне» уже есть по формам */
  var mem=d.paint==='blob'?blobs(rows,mask,d.colors,rnd):{};
  var grid=[];
  for(r=0;r<rows;r++){grid.push([]);for(c=0;c<nc(r);c++){
    if(!mask[r][c]){grid[r].push('.');continue;}
    var col=paint(d.paint,r,c,d.colors,rnd,mem);if(col==null)col=Math.floor(rnd()*d.colors);
    grid[r].push(CH.charAt(col));}}
  /* верхние два ряда держат всю фигуру: красим их так, чтобы рядом не было одинаковых цветов,
     иначе один выстрел в потолок роняет весь уровень */
  function nbs(a,b){var o=a%2===1;return [[a,b-1],[a,b+1],[a-1,o?b:b-1],[a-1,o?b+1:b],[a+1,o?b:b-1],[a+1,o?b+1:b]];}
  for(r=0;r<Math.min(2,rows);r++)for(c=0;c<nc(r);c++){
    if(grid[r][c]==='.')continue;
    var bad={};nbs(r,c).forEach(function(q){var x=grid[q[0]]&&grid[q[0]][q[1]];if(x&&x!=='.')bad[x]=1;});
    var opts=[];for(var k=0;k<d.colors;k++)if(!bad[CH.charAt(k)])opts.push(k);
    if(opts.length)grid[r][c]=CH.charAt(opts[Math.floor(rnd()*opts.length)]);
  }
  /* камни-якоря в верхнем ряду (туманность): их не уронить, фигура держится крепче */
  var anch=d.anchor||0;while(anch>0){var ac=Math.floor(rnd()*nc(0));if(/[rbgypc]/.test(grid[0][ac])){grid[0][ac]='S';anch--;}}
  /* особые: камни и бомбы не в верхнем ряду, лёд где угодно */
  function sprinkle(k,fn){var tries=0;while(k>0&&tries<500){tries++;var rr=1+Math.floor(rnd()*(rows-1)),cc=Math.floor(rnd()*nc(rr));if(/[rbgypc]/.test(grid[rr][cc])){fn(rr,cc);k--;}}}
  function sprinkle2(k,minR,fn){var tries=0;while(k>0&&tries<500){tries++;var rr=minR+Math.floor(rnd()*Math.max(1,rows-minR)),cc=Math.floor(rnd()*nc(rr));if(rr<rows&&/[rbgypc]/.test(grid[rr][cc])){fn(rr,cc);k--;}}}
  sprinkle(d.stone||0,function(a,b){grid[a][b]='S';});
  sprinkle2(d.bomb||0,3,function(a,b){grid[a][b]='*';});
  var ice=d.ice||0,tries=0;while(ice>0&&tries<500){tries++;var rr=Math.floor(rnd()*rows),cc=Math.floor(rnd()*nc(rr));if(/[rbgypc]/.test(grid[rr][cc])){grid[rr][cc]=grid[rr][cc].toUpperCase();ice--;}}
  /* шары, не связанные с верхним рядом, убираем: иначе они упадут с первым же выстрелом */
  var ok={},q=[];for(c=0;c<nc(0);c++)if(grid[0][c]!=='.'){ok['0_'+c]=1;q.push([0,c]);}
  while(q.length){var p=q.pop(),o=p[0]%2===1,nb=[[p[0],p[1]-1],[p[0],p[1]+1],[p[0]-1,o?p[1]:p[1]-1],[p[0]-1,o?p[1]+1:p[1]],[p[0]+1,o?p[1]:p[1]-1],[p[0]+1,o?p[1]+1:p[1]]];
    nb.forEach(function(b){if(b[0]>=0&&b[0]<rows&&b[1]>=0&&b[1]<nc(b[0])&&grid[b[0]][b[1]]!=='.'&&!ok[b[0]+'_'+b[1]]){ok[b[0]+'_'+b[1]]=1;q.push(b);}});}
  for(r=0;r<rows;r++)for(c=0;c<nc(r);c++)if(!ok[r+'_'+c])grid[r][c]='.';
  var tu=TUNE[n]||[60,30,40];
  return {layout:grid.map(function(x){return x.join('');}),colors:d.colors,press:d.press||0,shots:tu[0],s3:tu[1],s2:tu[2],
    world:Math.floor(n/10),seed:5000+n*101};
}

window.BubLevels={COUNT:DEFS.length,DEFS:DEFS,TUNE:TUNE,get:build,WORLDS:['reef','sky','nebula']};
})();
