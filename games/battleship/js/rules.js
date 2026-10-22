/* A.C.EON BATTLESHIP: правила и ИИ. Без DOM.

   Поле 10x10, клетка i = r*10+c.
   board: {ships:[{size,r,c,vert,cells:[i..],hits,sunk}], at:[100] индекс корабля или -1,
           shots:[100] 0 не стреляли, 1 промах, 2 попадание, 3 пусто вокруг потопленного (отмечено само)}

   BsRules.FLEETS                         классический (10 кораблей) и западный (5)
   BsRules.cellsOf(r,c,size,vert)         клетки корабля или null, если вылез за край
   BsRules.canPlace(board,cells,noTouch,skip)
   BsRules.place / remove / randomFleet
   BsRules.fire(board,i,noTouch)          {res:'miss'|'hit'|'sunk'|'repeat', ship, marked:[i]}
   BsRules.ai(level).pick(board,fleet,noTouch,n)   n клеток для выстрела (ИИ видит только то, что видел бы игрок) */
(function(){
'use strict';

var N=10;
var FLEETS={classic:[4,3,3,2,2,2,1,1,1,1],west:[5,4,3,3,2]};

function fill(v,n){var a=[];for(var i=0;i<n;i++)a.push(v);return a;}
function newBoard(){return {ships:[],at:fill(-1,N*N),shots:fill(0,N*N)};}
function rc(i){return [Math.floor(i/N),i%N];}
function around(i){
  var p=rc(i),out=[];
  for(var dr=-1;dr<=1;dr++)for(var dc=-1;dc<=1;dc++){
    if(!dr&&!dc)continue;
    var r=p[0]+dr,c=p[1]+dc;
    if(r>=0&&r<N&&c>=0&&c<N)out.push(r*N+c);
  }
  return out;
}
function cellsOf(r,c,size,vert){
  var out=[];
  for(var k=0;k<size;k++){
    var rr=vert?r+k:r,cc=vert?c:c+k;
    if(rr<0||rr>=N||cc<0||cc>=N)return null;
    out.push(rr*N+cc);
  }
  return out;
}
/* skip: индекс корабля, который не учитывать (поворот или перенос уже стоящего) */
function canPlace(board,cells,noTouch,skip){
  if(!cells)return false;
  for(var k=0;k<cells.length;k++){
    var i=cells[k],a=board.at[i];
    if(a>=0&&a!==skip)return false;
    if(noTouch){
      var nb=around(i);
      for(var j=0;j<nb.length;j++){var b=board.at[nb[j]];if(b>=0&&b!==skip)return false;}
    }
  }
  return true;
}
function place(board,size,r,c,vert){
  var cells=cellsOf(r,c,size,vert);
  var ship={size:size,r:r,c:c,vert:!!vert,cells:cells,hits:0,sunk:false};
  board.ships.push(ship);
  cells.forEach(function(i){board.at[i]=board.ships.length-1;});
  return ship;
}
function remove(board,idx){
  board.ships.splice(idx,1);
  board.at=fill(-1,N*N);
  board.ships.forEach(function(s,k){s.cells.forEach(function(i){board.at[i]=k;});});
}
function randomFleet(fleet,noTouch,rand,board){
  rand=rand||Math.random;
  for(var attempt=0;attempt<200;attempt++){
    var b=board?JSON.parse(JSON.stringify(board)):newBoard(),ok=true;
    var have=b.ships.map(function(s){return s.size;});
    var need=fleet.slice();
    have.forEach(function(s){var k=need.indexOf(s);if(k>=0)need.splice(k,1);});
    need.sort(function(a,b){return b-a;});
    for(var s=0;s<need.length&&ok;s++){
      var placed=false;
      for(var tries=0;tries<400&&!placed;tries++){
        var vert=rand()<0.5,r=Math.floor(rand()*N),c=Math.floor(rand()*N);
        var cells=cellsOf(r,c,need[s],vert);
        if(canPlace(b,cells,noTouch,-1)){place(b,need[s],r,c,vert);placed=true;}
      }
      if(!placed)ok=false;
    }
    if(ok)return b;
  }
  return null;
}

function fire(board,i,noTouch){
  if(board.shots[i]!==0)return {res:'repeat'};
  var a=board.at[i];
  if(a<0){board.shots[i]=1;return {res:'miss'};}
  board.shots[i]=2;
  var s=board.ships[a];s.hits++;
  if(s.hits<s.size)return {res:'hit',ship:s};
  s.sunk=true;
  var marked=[];
  /* корабли не касаются: клетки вокруг потопленного точно пустые, отмечаем сами */
  if(noTouch)s.cells.forEach(function(ci){around(ci).forEach(function(n){if(board.shots[n]===0){board.shots[n]=3;marked.push(n);}});});
  return {res:'sunk',ship:s,marked:marked};
}
function allSunk(board){return board.ships.length>0&&board.ships.every(function(s){return s.sunk;});}
function afloat(board){return board.ships.filter(function(s){return !s.sunk;}).length;}

/* ════════ ИИ ════════
   Видит только открытую информацию: куда стрелял, где попал, какие корабли потоплены. */
function openInfo(board){
  var sunkCell=fill(false,N*N),hits=[];
  board.ships.forEach(function(s){if(s.sunk)s.cells.forEach(function(i){sunkCell[i]=true;});});
  for(var i=0;i<N*N;i++)if(board.shots[i]===2&&!sunkCell[i])hits.push(i);
  var left=board.ships.filter(function(s){return !s.sunk;}).map(function(s){return s.size;});
  return {hits:hits,left:left};
}
function free(board,i,pending){return board.shots[i]===0&&!pending[i];}
function randomPick(list,rand){return list.length?list[Math.floor(rand()*list.length)]:-1;}

/* лёгкий: случайный выстрел, раненый корабль добивает не всегда */
function pickEasy(board,info,pending,rand){
  if(info.hits.length&&rand()<0.5){var t=targetCells(board,info,pending);if(t.length)return randomPick(t,rand);}
  var all=[];for(var i=0;i<N*N;i++)if(free(board,i,pending))all.push(i);
  return randomPick(all,rand);
}
/* клетки рядом с ранеными: если попаданий в линию два и больше, только концы линии */
function targetCells(board,info,pending){
  var hits=info.hits,out=[];
  if(!hits.length)return out;
  var rows={},cols={};
  hits.forEach(function(i){var p=rc(i);rows[p[0]]=(rows[p[0]]||0)+1;cols[p[1]]=(cols[p[1]]||0)+1;});
  hits.forEach(function(i){
    var p=rc(i),line=[];
    var horiz=rows[p[0]]>1&&hits.some(function(j){var q=rc(j);return q[0]===p[0]&&Math.abs(q[1]-p[1])===1;});
    var vert=cols[p[1]]>1&&hits.some(function(j){var q=rc(j);return q[1]===p[1]&&Math.abs(q[0]-p[0])===1;});
    if(horiz)line=[[0,-1],[0,1]];else if(vert)line=[[-1,0],[1,0]];else line=[[0,-1],[0,1],[-1,0],[1,0]];
    line.forEach(function(d){
      var r=p[0]+d[0],c=p[1]+d[1];
      if(r<0||r>=N||c<0||c>=N)return;
      var n=r*N+c;
      if(free(board,n,pending)&&out.indexOf(n)<0)out.push(n);
    });
  });
  return out;
}
/* обычный: добивает раненых, иначе стреляет по шахматке (самый маленький оставшийся корабль не пропустит) */
function pickNormal(board,info,pending,rand){
  var t=targetCells(board,info,pending);
  if(t.length)return randomPick(t,rand);
  var min=Math.min.apply(null,info.left.length?info.left:[1]),list=[];
  for(var i=0;i<N*N;i++){var p=rc(i);if(free(board,i,pending)&&(min<2||(p[0]+p[1])%min===0))list.push(i);}
  if(!list.length)for(i=0;i<N*N;i++)if(free(board,i,pending))list.push(i);
  return randomPick(list,rand);
}
/* сложный: карта вероятностей. Для каждого оставшегося корабля перебираются все положения,
   которые не противоречат известному; клетка, через которую проходит больше всего положений, лучшая */
function pickHard(board,info,pending,rand,noTouch){
  var score=fill(0,N*N),blocked=fill(false,N*N),hitSet={};
  info.hits.forEach(function(i){hitSet[i]=true;});
  for(var i=0;i<N*N;i++){
    var s=board.shots[i];
    if(s===1||s===3||(s===2&&!hitSet[i])||pending[i])blocked[i]=true;
  }
  if(noTouch){   // рядом с потопленным кораблём других нет
    board.ships.forEach(function(sh){if(sh.sunk)sh.cells.forEach(function(ci){around(ci).forEach(function(n){blocked[n]=true;});});});
  }
  var target=info.hits.length>0;
  info.left.forEach(function(size){
    for(var r=0;r<N;r++)for(var c=0;c<N;c++)[false,true].forEach(function(vert){
      if(size===1&&vert)return;
      var cells=cellsOf(r,c,size,vert);if(!cells)return;
      var cover=0;
      for(var k=0;k<cells.length;k++){if(blocked[cells[k]])return;if(hitSet[cells[k]])cover++;}
      if(target&&!cover)return;
      var w=target?Math.pow(10,cover):1;
      cells.forEach(function(ci){if(!hitSet[ci])score[ci]+=w;});
    });
  });
  var best=-1,list=[];
  for(i=0;i<N*N;i++){
    if(!free(board,i,pending))continue;
    if(score[i]>best){best=score[i];list=[i];}else if(score[i]===best)list.push(i);
  }
  if(best<=0)return pickNormal(board,info,pending,rand);
  return randomPick(list,rand);
}

function ai(level){
  return {
    level:level,
    /* n выстрелов подряд (в залповом режиме несколько); выбранные клетки считаются занятыми */
    pick:function(board,noTouch,n,rand){
      rand=rand||Math.random;n=n||1;
      var info=openInfo(board),pending={},out=[];
      for(var k=0;k<n;k++){
        var i=level==='easy'?pickEasy(board,info,pending,rand):level==='hard'?pickHard(board,info,pending,rand,noTouch):pickNormal(board,info,pending,rand);
        if(i<0)break;
        pending[i]=true;out.push(i);
      }
      return out;
    }
  };
}

window.BsRules={N:N,FLEETS:FLEETS,newBoard:newBoard,rc:rc,around:around,cellsOf:cellsOf,canPlace:canPlace,place:place,remove:remove,
  randomFleet:randomFleet,fire:fire,allSunk:allSunk,afloat:afloat,ai:ai};
})();
