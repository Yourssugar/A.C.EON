/* Aceonium: зал таверны на сетке 1 x 1 м (v25). Без DOM: им пользуются игра (проверка расстановки, места),
   3D (пути гостей, отрисовка мебели) и режим дизайна.
   Клетка (cx, cz) покрывает x[cx, cx+1], z[cz, cz+1]. Дом: зал X[-2,8] Z[-5,5], дверь на юге при x 0..2.
   Предмет мебели: {id, t, lv, x, z, r, bt, q, st}: x, z - угловая клетка, r - поворот на 90 градусов (0..3),
   bt - стройка {t,T}, q - ждёт бригаду, st - убран на склад (не стоит в зале). */
(function(root){
'use strict';
var D=root.AcData||(typeof require!=='undefined'?require('./data.js'):null);
var H={};

/* очередь путников к стойке (точки в мире) и клетки под ней: мебель туда нельзя */
H.QUEUE=[[6.0,-1.5],[7.4,-1.3],[7.5,-0.3],[7.5,0.7],[7.5,1.7],[7.5,2.7],[7.5,3.7],[6.5,4.4]];
var WALK={'5,-2':1,'6,-2':1,'7,-2':1,'7,-1':1,'7,0':1,'7,1':1,'7,2':1,'7,3':1,'7,4':1,'6,4':1,'0,4':1,'1,4':1};
H.ENTRY=[1,5];            // клетка сразу за дверью: отсюда считаются пути
H.MAGE={x:1.25,z:-3.75,rot:2.0};   // кресло мага у камина
H.PET={x:2.6,z:-3.45,rot:0.6};

/* что за клетка: wall (нет), fix (камин, стойка: не пройти), walk (проход: не ставить), junk (хлам до улучшения зала),
   yard (двор у двери), free (можно ставить и ходить) */
H.cell=function(cx,cz,hall){
  var inside=cx>=-2&&cx<=7&&cz>=-5&&cz<=4;
  if(inside){
    if(cz<=-4&&cx>=0&&cx<=3)return 'fix';        // камин и кресло мага
    if(cz===-3&&cx>=0&&cx<=3)return 'walk';       // тепло от камина: перед ним не ставим
    if(cz<=-3&&cx>=4)return 'fix';                // стойка и место хозяйки
    if(WALK[cx+','+cz])return 'walk';
    if(!hall&&cx<0)return 'junk';
    return 'free';
  }
  if(hall>=2&&cx>=2&&cx<=7&&cz>=5&&cz<=8)return 'free';   // веранда
  if(cx>=0&&cx<=1&&cz>=5&&cz<=9)return 'yard';
  return 'wall';
};
function passable(c){return c==='free'||c==='walk'||c==='yard';}
/* между z=4 и z=5 стена дома, проход только в дверь */
function edgeOk(ax,az,bx,bz){
  if((az===4&&bz===5)||(az===5&&bz===4))return ax===bx&&(ax===0||ax===1);
  return true;
}

/* размер предмета в клетках с учётом поворота */
H.def=function(t){return D.FURN[t];};
H.fp=function(it){var d=D.FURN[it.t],f=d.fp[Math.min(d.fp.length,it.lv||1)-1]||d.fp[0];return it.r%2?[f[1],f[0]]:[f[0],f[1]];};
H.center=function(it){var f=H.fp(it);return {x:it.x+f[0]/2,z:it.z+f[1]/2,rot:(it.r||0)*Math.PI/2};};
H.cells=function(it){var f=H.fp(it),out=[];for(var i=0;i<f[0];i++)for(var j=0;j<f[1];j++)out.push([it.x+i,it.z+j]);return out;};
H.layer=function(it){return D.FURN[it.t].layer||'solid';};
/* локальная точка предмета -> мир (поворот как rotation.y в three.js) */
function toWorld(it,lx,lz){
  var c=H.center(it),a=c.rot,ca=Math.cos(a),sa=Math.sin(a);
  return {x:c.x+lx*ca+lz*sa,z:c.z-lx*sa+lz*ca};
}
H.toWorld=toWorld;
/* места стола: где сидит гость и откуда к нему подходят (ближняя клетка снаружи или торцы) */
H.seatsOf=function(it){
  var d=D.FURN[it.t];if(!d.seats)return [];
  var L=d.seatPos[Math.min(d.seatPos.length,it.lv||1)-1],f=d.fp[Math.min(d.fp.length,it.lv||1)-1],hw=f[0]/2,hd=f[1]/2,out=[];
  L.forEach(function(s,k){
    var side=s[1]<0?-1:1,p=toWorld(it,s[0],s[1]);
    var appr=[toWorld(it,s[0],side*(hd+0.5)),toWorld(it,-(hw+0.5),s[1]),toWorld(it,hw+0.5,s[1])];
    out.push({f:it.id,k:k,key:it.id+':'+k,x:p.x,z:p.z,rot:(side<0?0:Math.PI)+H.center(it).rot,appr:appr});
  });
  return out;
};
H.placed=function(items){return items.filter(function(it){return !it.st;});};

/* занятость клеток: solid - стол, бочка и т.п.; floor - ковёр; ceil - люстра */
function occMap(items,skip){
  var m={solid:{},floor:{},ceil:{}};
  items.forEach(function(it){if(it.st||it===skip||it.id===skip)return;var L=m[H.layer(it)];H.cells(it).forEach(function(c){L[c[0]+','+c[1]]=it.id;});});
  return m;
}
/* поиск в ширину по проходимым клеткам от входа */
function reach(items,hall,occ){
  occ=occ||occMap(items);
  var seen={},q=[H.ENTRY],k0=H.ENTRY[0]+','+H.ENTRY[1];seen[k0]=1;
  while(q.length){
    var c=q.shift();
    [[1,0],[-1,0],[0,1],[0,-1]].forEach(function(d){
      var nx=c[0]+d[0],nz=c[1]+d[1],k=nx+','+nz;if(seen[k])return;
      if(!passable(H.cell(nx,nz,hall))||occ.solid[k]||!edgeOk(c[0],c[1],nx,nz))return;
      seen[k]=1;q.push([nx,nz]);
    });
  }
  return seen;
}
H.reach=reach;
function cellOf(p){return Math.floor(p.x)+','+Math.floor(p.z);}
/* для места: первая достижимая точка подхода или null */
function seatAppr(s,seen){for(var i=0;i<s.appr.length;i++)if(seen[cellOf(s.appr[i])])return s.appr[i];return null;}

/* проверка расстановки. Вернёт {ok, bad:{id:причина}, seats:число мест у готовых столов}
   причины: zone (не в зале), overlap (на другом предмете), block (перекрывает проход), seat (к месту не подойти) */
H.check=function(items,hall){
  var P=H.placed(items),bad={},occ={solid:{},floor:{},ceil:{}};
  P.forEach(function(it){
    var L=occ[H.layer(it)];
    H.cells(it).forEach(function(c){
      var ty=H.cell(c[0],c[1],hall),k=c[0]+','+c[1];
      if(ty!=='free'&&!bad[it.id])bad[it.id]='zone';
      if(L[k]!==undefined){if(!bad[it.id])bad[it.id]='overlap';if(!bad[L[k]])bad[L[k]]='overlap';}
      else L[k]=it.id;
    });
  });
  var seen=reach(P,hall,occ);
  var need=Object.keys(WALK).concat([H.ENTRY.join(',')]);
  var blocked=need.some(function(k){return !seen[k];});
  var seats=0;
  P.forEach(function(it){
    var S=H.seatsOf(it);if(!S.length)return;
    var all=S.every(function(s){return !!seatAppr(s,seen);});
    if(!all&&!bad[it.id])bad[it.id]='seat';
    if(all&&!it.bt&&!it.q)seats+=S.length;
  });
  var ok=!Object.keys(bad).length&&!blocked;
  return {ok:ok,bad:bad,blocked:blocked,seats:seats};
};
/* проверка одного предмета в расстановке (для режима дизайна): '' или причина */
H.why=function(items,hall,id){
  var r=H.check(items,hall);
  if(r.bad[id])return r.bad[id];
  if(r.blocked)return 'block';
  for(var k in r.bad)return 'other';
  return '';
};
/* свободное место под предмет: перебор клеток и поворотов, из верных берём лучшее.
   Декор жмётся к стенам, столы ставятся с проходом вокруг и поближе к середине зала, ковёр в середину */
H.findSpot=function(items,hall,it){
  var P=H.placed(items).filter(function(x){return x.id!==it.id;}),occ=occMap(P),lay=H.layer(it),table=!!D.FURN[it.t].seats;
  var best=null,bs=-1e9;
  for(var r=0;r<2;r++)for(var cz=-5;cz<=8;cz++)for(var cx=-2;cx<=7;cx++){
    var cand={id:it.id,t:it.t,lv:it.lv,x:cx,z:cz,r:r},cells=H.cells(cand),ok=true;
    for(var i=0;i<cells.length&&ok;i++){var q=cells[i],k=q[0]+','+q[1];if(H.cell(q[0],q[1],hall)!=='free'||occ[lay][k]!==undefined)ok=false;}
    if(!ok)continue;
    var c=H.center(cand),f=H.fp(cand),wall=0,freeN=0;
    for(var x=cand.x-1;x<=cand.x+f[0];x++)for(var z=cand.z-1;z<=cand.z+f[1];z++){
      if(x>=cand.x&&x<cand.x+f[0]&&z>=cand.z&&z<cand.z+f[1])continue;
      var ty=H.cell(x,z,hall);if(ty==='wall'||ty==='fix'||ty==='junk')wall++;else if(!occ.solid[x+','+z])freeN++;
    }
    var dc=Math.hypot(c.x-3,c.z-0.5),sc;
    if(lay==='floor')sc=-dc;
    else if(lay==='ceil')sc=-dc+(occ.solid[cx+','+cz]?3:0);
    else if(table)sc=freeN*1.0-dc*0.5-(c.z>5?2:0);
    else sc=wall*2-dc*0.2-(c.z>5?1:0);
    if(sc<=bs)continue;
    if(!H.check(P.concat([cand]),hall).ok)continue;
    bs=sc;best={x:cx,z:cz,r:r};
  }
  return best;
};
/* места у готовых столов по порядку */
H.seats=function(items){
  var out=[];H.placed(items).forEach(function(it){if(it.bt||it.q)return;H.seatsOf(it).forEach(function(s){out.push(s);});});
  return out;
};
H.seatCount=function(items){var n=0;H.placed(items).forEach(function(it){if(it.bt||it.q)return;var d=D.FURN[it.t];if(d.seats)n+=d.seats[(it.lv||1)-1];});return n;};
/* очки убранства */
H.decorPts=function(items){var n=0;H.placed(items).forEach(function(it){var d=D.FURN[it.t];if(d.pts)n+=d.pts[(it.lv||1)-1];});return n;};

/* ── пути ── */
/* прямой проход между точками: все промежуточные клетки проходимы, стена дома только в двери */
function los(a,b,hall,occ){
  var dx=b.x-a.x,dz=b.z-a.z,n=Math.ceil(Math.hypot(dx,dz)/0.2);
  for(var i=1;i<n;i++){
    var x=a.x+dx*i/n,z=a.z+dz*i/n;
    for(var ox=-0.22;ox<=0.22;ox+=0.44)for(var oz=-0.22;oz<=0.22;oz+=0.44){
      var cx=Math.floor(x+ox),cz=Math.floor(z+oz),k=cx+','+cz;
      if(!passable(H.cell(cx,cz,hall))||occ.solid[k])return false;
    }
  }
  if((a.z-5)*(b.z-5)<0){var t=(5-a.z)/dz,xc=a.x+dx*t;if(xc<0.35||xc>1.65)return false;}
  return true;
}
/* путь A* по клеткам от точки до точки, потом спрямление. Точки вне сетки (дорога) не трогаем */
H.path=function(items,hall,from,to){
  var P=H.placed(items),occ=occMap(P);
  var s=[Math.floor(from.x),Math.floor(from.z)],e=[Math.floor(to.x),Math.floor(to.z)];
  var key=function(c){return c[0]+','+c[1];};
  var ek=key(e),open=[{c:s,g:0,f:0}],came={},gs={},done={};gs[key(s)]=0;
  var found=false,guard=0;
  while(open.length&&guard++<4000){
    var bi=0;for(var i=1;i<open.length;i++)if(open[i].f<open[bi].f)bi=i;
    var cur=open.splice(bi,1)[0],ck=key(cur.c);
    if(done[ck])continue;done[ck]=1;
    if(ck===ek){found=true;break;}
    [[1,0],[-1,0],[0,1],[0,-1]].forEach(function(d){
      var nx=cur.c[0]+d[0],nz=cur.c[1]+d[1],nk=nx+','+nz;
      if(done[nk])return;
      if(nk!==ek&&(!passable(H.cell(nx,nz,hall))||occ.solid[nk]))return;
      if(!edgeOk(cur.c[0],cur.c[1],nx,nz))return;
      var ng=cur.g+1;if(gs[nk]!==undefined&&gs[nk]<=ng)return;
      gs[nk]=ng;came[nk]=ck;open.push({c:[nx,nz],g:ng,f:ng+Math.abs(nx-e[0])+Math.abs(nz-e[1])});
    });
  }
  if(!found)return [[to.x,to.z]];
  var cells=[],k2=ek;while(k2){var p=k2.split(',');cells.unshift({x:+p[0]+0.5,z:+p[1]+0.5});k2=came[k2];}
  cells[0]={x:from.x,z:from.z};cells[cells.length-1]={x:to.x,z:to.z};
  /* спрямление: от текущей точки к самой дальней видимой */
  var out=[cells[0]],i0=0;
  while(i0<cells.length-1){
    var j=cells.length-1;
    while(j>i0+1&&!los(cells[i0],cells[j],hall,occ))j--;
    out.push(cells[j]);i0=j;
  }
  return out.slice(1).map(function(p){return [p.x,p.z];});
};
/* путь к месту: до подхода, потом на скамью */
H.seatPath=function(items,hall,from,key){
  var s=null;H.seats(items).forEach(function(x){if(x.key===key)s=x;});if(!s)return null;
  var seen=reach(H.placed(items),hall),a=seatAppr(s,seen)||s.appr[0];
  return {seat:s,path:H.path(items,hall,from,a).concat([[s.x,s.z]]),appr:a};
};
H.seatByKey=function(items,key){var s=null;H.seats(items).forEach(function(x){if(x.key===key)s=x;});return s;};
H.apprOf=function(items,hall,s){var seen=reach(H.placed(items),hall);return seatAppr(s,seen)||s.appr[0];};

if(typeof module!=='undefined'&&module.exports)module.exports=H;else root.AcHall=H;
})(this);
