/* A.C.EON 2048: правила. Без DOM.

   Поле n x n, клетка i = r*n+c. Плитки хранятся объектами {id, v, i}, чтобы их можно было
   плавно двигать на экране. Камни (режим «Препятствия») стоят на месте, плитки упираются в них.

   T48.create(n, stones)        новое состояние с двумя плитками
   T48.move(st, dir)            'left'|'right'|'up'|'down' -> {moved, gain, slides:[{id,to}], merges:[{id,v,i,from:[id,id]}]}
   T48.spawn(st)                новая плитка 2 (90%) или 4 в случайную пустую клетку
   T48.canMove(st), T48.maxTile(st) */
(function(){
'use strict';

function cellMap(st){
  var m=[],n=st.n,i;
  for(i=0;i<n*n;i++)m.push(null);
  st.tiles.forEach(function(t){m[t.i]=t;});
  return m;
}
function isStone(st,i){return st.stones.indexOf(i)>=0;}

function create(n,stones,rand){
  rand=rand||Math.random;
  var st={n:n,tiles:[],stones:[],nextId:1,score:0};
  /* камни не в углах и не рядом друг с другом */
  var tries=0;
  while(st.stones.length<(stones||0)&&tries++<500){
    var i=Math.floor(rand()*n*n),r=Math.floor(i/n),c=i%n;
    if((r===0||r===n-1)&&(c===0||c===n-1))continue;
    var near=st.stones.some(function(s){return Math.abs(Math.floor(s/n)-r)<=1&&Math.abs(s%n-c)<=1;});
    if(near)continue;
    st.stones.push(i);
  }
  spawn(st,rand);spawn(st,rand);
  return st;
}

function spawn(st,rand){
  rand=rand||Math.random;
  var m=cellMap(st),free=[];
  for(var i=0;i<st.n*st.n;i++)if(!m[i]&&!isStone(st,i))free.push(i);
  if(!free.length)return null;
  var t={id:st.nextId++,v:rand()<0.9?2:4,i:free[Math.floor(rand()*free.length)]};
  st.tiles.push(t);
  return t;
}

/* линии в порядке от края, к которому всё едет */
function lines(n,dir){
  var out=[];
  for(var a=0;a<n;a++){
    var l=[];
    for(var b=0;b<n;b++){
      if(dir==='left')l.push(a*n+b);
      else if(dir==='right')l.push(a*n+(n-1-b));
      else if(dir==='up')l.push(b*n+a);
      else l.push((n-1-b)*n+a);
    }
    out.push(l);
  }
  return out;
}

function move(st,dir){
  var m=cellMap(st),res={moved:false,gain:0,slides:[],merges:[]};
  var keep=[],gone={};
  lines(st.n,dir).forEach(function(line){
    /* камни делят линию на отрезки, каждый сдвигается сам по себе */
    var segs=[[]];
    line.forEach(function(i){if(isStone(st,i))segs.push([]);else segs[segs.length-1].push(i);});
    segs.forEach(function(seg){
      var p=0,last=null;   // last: {t, at, merged}
      seg.forEach(function(i){
        var t=m[i];if(!t)return;
        if(last&&!last.merged&&last.t.v===t.v){
          /* слияние: обе плитки едут в клетку last и исчезают, на их месте новая */
          var nv=t.v*2;
          res.slides.push({id:t.id,to:last.at});
          if(t.i!==last.at)res.moved=true;
          res.moved=true;
          gone[t.id]=1;gone[last.t.id]=1;
          var nt={id:st.nextId++,v:nv,i:last.at};
          res.merges.push({id:nt.id,v:nv,i:last.at,from:[last.t.id,t.id]});
          keep.push(nt);
          res.gain+=nv;
          last.merged=true;
          return;
        }
        var to=seg[p++];
        if(to!==t.i){res.moved=true;}
        res.slides.push({id:t.id,to:to});
        last={t:t,at:to,merged:false};
      });
    });
  });
  if(!res.moved)return res;
  /* применить */
  var slide={};res.slides.forEach(function(s){slide[s.id]=s.to;});
  st.tiles.forEach(function(t){if(slide[t.id]!==undefined)t.i=slide[t.id];});
  st.tiles=st.tiles.filter(function(t){return !gone[t.id];}).concat(keep);
  st.score+=res.gain;
  return res;
}

function canMove(st){
  var m=cellMap(st),n=st.n;
  for(var i=0;i<n*n;i++){
    if(isStone(st,i))continue;
    if(!m[i])return true;
    var r=Math.floor(i/n),c=i%n;
    if(c<n-1&&m[i+1]&&m[i+1].v===m[i].v)return true;
    if(r<n-1&&m[i+n]&&m[i+n].v===m[i].v)return true;
  }
  return false;
}
function maxTile(st){var mx=0;st.tiles.forEach(function(t){if(t.v>mx)mx=t.v;});return mx;}
function clone(st){return JSON.parse(JSON.stringify(st));}

window.T48={create:create,spawn:spawn,move:move,canMove:canMove,maxTile:maxTile,clone:clone,cellMap:cellMap};
})();
