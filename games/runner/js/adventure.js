/* A.C.EON RUNNER: режим «Приключение». Платформер по клеткам 48 px.

   RunAdv.create(n)           уровень n (0..14) из levels.js
   RunAdv.update(st, inp, dt) inp: {left, right, jump, jumpHit, down}; события в st.ev

   Три сердца. Упал в яму или кончились сердца: возврат к контрольной точке с полными сердцами
   (в уровне с автопрокруткой: уровень сначала). На врага можно прыгнуть сверху. */
(function(){
'use strict';

var P=window.RunPhys,L=window.RunLevels,T=48,VW=960,VH=540;
var SOLID='#BD',ONEWAY='=';

function create(n){
  var lv=L.build(n),grid=lv.grid.map(function(r){return r.split('');});
  var st={mode:'adv',n:n,world:lv.world,auto:lv.auto,w:lv.w*T,h:lv.h*T,grid:grid,cols:lv.w,
    coins:0,coinTotal:0,stars:[],hearts:3,deaths:0,key:false,time:0,over:false,clear:false,
    enemies:[],movers:[],items:[],springs:[],checks:[],exit:null,cp:null,cam:{x:0,y:0},
    inv:0,ev:[],shake:0};
  for(var r=0;r<lv.h;r++)for(var c=0;c<lv.w;c++){
    var ch=grid[r][c],x=c*T,y=r*T;
    if(ch==='P'){st.start={x:x+5,y:y+T};grid[r][c]='.';}
    else if(ch==='o'||ch==='g'||ch==='*'||ch==='h'||ch==='K'){
      st.items.push({k:ch==='o'?'coin':ch==='g'?'gem':ch==='*'?'star':ch==='h'?'heart':'key',x:x+T/2,y:y+T/2,r:ch==='*'?20:14,id:r*1000+c});
      if(ch==='o')st.coinTotal++;
      grid[r][c]='.';
    }
    else if(ch==='E'){st.enemies.push({k:'walker',x:x+4,y:y+T-40,w:40,h:40,vx:-70,vy:0,alive:true,t:0});grid[r][c]='.';}
    else if(ch==='F'){st.enemies.push({k:'flyer',x0:x,y0:y,x:x,y:y,w:54,h:36,alive:true,t:Math.random()*6});grid[r][c]='.';}
    else if(ch==='M'){st.movers.push({x0:x,x:x,y:y+T*0.5,w:T*3,h:18,t:0,dx:0});grid[r][c]='.';}
    else if(ch==='S'){st.springs.push({x:x+4,y:y+T-24,w:T-8,h:24,t:0});grid[r][c]='.';}
    else if(ch==='C'){st.checks.push({x:x+T/2,y:y+T,on:false});grid[r][c]='.';}
    else if(ch==='X'){st.exit={x:x+T/2,y:y+T/2,r:56};grid[r][c]='.';}
  }
  st.cp={x:st.start.x,y:st.start.y};
  st.hero=P.hero(st.start.x,st.start.y);
  return st;
}

function cell(st,c,r){if(c<0)return 'B';if(c>=st.cols||r<0||r>=12)return '.';return st.grid[r][c];}
function solidCell(st,c,r){var ch=cell(st,c,r);return SOLID.indexOf(ch)>=0&&!(ch==='D'&&st.key);}

/* столкновения героя (и ходока) с клетками, платформами и едущими платформами */
function collide(st,o,axis){
  var c0=Math.floor(o.x/T),c1=Math.floor((o.x+o.w-0.01)/T),r0=Math.floor(o.y/T),r1=Math.floor((o.y+o.h-0.01)/T),c,r;
  if(axis==='x'){
    for(r=r0;r<=r1;r++)for(c=c0;c<=c1;c++)if(solidCell(st,c,r)){
      if(o.vx>0||o.x+o.w/2<c*T+T/2){o.x=c*T-o.w;}else{o.x=(c+1)*T;}
      o.vx=0;o.hitWall=true;return false;
    }
    return false;
  }
  var ground=false;
  for(r=r0;r<=r1;r++)for(c=c0;c<=c1;c++){
    var ch=cell(st,c,r),top=r*T;
    var hit=solidCell(st,c,r)||(ch===ONEWAY&&o.vy>=0&&o.pb<=top+2);
    if(!hit)continue;
    if(o.vy>=0&&o.y+o.h-top<=T){o.y=top-o.h;o.vy=0;ground=true;}
    else if(o.vy<0&&solidCell(st,c,r)){o.y=(r+1)*T;o.vy=0;o.hold=0;}
  }
  /* едущие платформы (сверху) */
  st.movers.forEach(function(m){
    if(o.vy>=0&&o.pb<=m.y+2&&o.y+o.h>=m.y&&o.x+o.w>m.x+4&&o.x<m.x+m.w-4){o.y=m.y-o.h;o.vy=0;ground=true;o.on=m;}
  });
  return ground;
}
function roomAbove(st,o,dh){
  var c0=Math.floor(o.x/T),c1=Math.floor((o.x+o.w-0.01)/T),r=Math.floor((o.y-dh)/T);
  for(var c=c0;c<=c1;c++)if(solidCell(st,c,r))return false;
  return true;
}

function hurt(st,kx){
  if(st.inv>0)return;
  st.hearts--;st.inv=1.4;st.shake=8;
  var h=st.hero;h.vy=-520;h.vx=kx*280;
  st.ev.push({type:'hurt',hearts:st.hearts});
  if(st.hearts<=0)die(st);
}
function die(st){
  st.deaths++;st.ev.push({type:'die'});
  if(st.auto){
    /* автопрокрутка: уровень заново, монеты и звёзды тоже */
    var fresh=create(st.n);fresh.deaths=st.deaths;fresh.time=st.time;fresh.ev=st.ev;
    for(var k in fresh)st[k]=fresh[k];
    return;
  }
  st.hearts=3;st.inv=1;
  st.hero=P.hero(st.cp.x,st.cp.y);
}

function update(st,inp,dt){
  if(st.over||st.clear)return;
  st.time+=dt;
  var h=st.hero,i;
  if(st.inv>0)st.inv-=dt;
  if(st.shake>0)st.shake*=0.88;
  /* едущие платформы */
  st.movers.forEach(function(m){m.t+=dt;var nx=m.x0+Math.sin(m.t*0.8)*T*3;m.dx=nx-m.x;m.x=nx;});
  if(h.on&&h.ground){h.x+=h.on.dx;}
  h.on=null;h.pb=h.y+h.h;
  P.step(h,inp,dt,{auto:false,collide:function(o,a){return collide(st,o,a);},roomAbove:function(o,d){return roomAbove(st,o,d);},
    onJump:function(){st.ev.push({type:'jump'});},onLand:function(o,v){if(v>500)st.ev.push({type:'land'});}});
  /* автопрокрутка: экран едет, отставших выталкивает край */
  if(st.auto){
    st.cam.x=Math.min(st.w-VW,st.cam.x+Math.min(230,120+st.time*4)*dt);
    if(h.x<st.cam.x-4){h.x=st.cam.x-4;if(h.hitWall)die(st);}
    if(h.x+h.w>st.cam.x+VW)h.x=st.cam.x+VW-h.w;
    h.hitWall=false;
  }else{
    var tx=Math.max(0,Math.min(st.w-VW,h.x-VW*0.38));
    st.cam.x+=(tx-st.cam.x)*Math.min(1,dt*8);
  }
  st.cam.y=Math.max(0,Math.min(st.h-VH,h.y-300));
  if(h.x<0)h.x=0;
  /* яма */
  if(h.y>st.h+60){st.hearts=0;st.ev.push({type:'fall'});die(st);return;}
  /* шипы: нижняя половина клетки */
  var c0=Math.floor(h.x/T),c1=Math.floor((h.x+h.w-1)/T),r0=Math.floor(h.y/T),r1=Math.floor((h.y+h.h-1)/T);
  for(var r=r0;r<=r1;r++)for(var c=c0;c<=c1;c++)if(cell(st,c,r)==='^'&&h.y+h.h>r*T+T*0.5+4)hurt(st,-h.face);
  /* пружины */
  st.springs.forEach(function(s){
    if(s.t>0)s.t-=dt;
    if(h.vy>=0&&h.x+h.w>s.x+4&&h.x<s.x+s.w-4&&h.y+h.h>=s.y&&h.pb<=s.y+10){h.y=s.y-h.h;h.vy=-1380;h.hold=0;h.ground=false;s.t=0.3;st.ev.push({type:'spring',x:s.x+s.w/2,y:s.y});}
  });
  /* враги */
  st.enemies.forEach(function(e){
    if(!e.alive){e.t+=dt;return;}
    e.t+=dt;
    if(e.k==='walker'){
      e.vy=Math.min(1200,e.vy+2400*dt);
      e.x+=e.vx*dt;e.hitWall=false;e.pb=e.y+e.h;collide(st,e,'x');
      if(e.hitWall)e.vx=e.vx>0?-70:70;
      e.y+=e.vy*dt;var gr=collide(st,e,'y');
      /* у края не падает, разворачивается */
      if(gr){var fc=Math.floor((e.vx>0?e.x+e.w+2:e.x-2)/T),fr=Math.floor((e.y+e.h+4)/T);
        if(!solidCell(st,fc,fr)&&cell(st,fc,fr)!==ONEWAY)e.vx=-e.vx;}
      if(e.y>st.h+100)e.alive=false;
    }else{
      e.x=e.x0+Math.sin(e.t*0.8)*70;e.y=e.y0+Math.sin(e.t*2.1)*26;
    }
    /* касание героя */
    if(h.x+h.w-4>e.x&&h.x+4<e.x+e.w&&h.y+h.h>e.y&&h.y<e.y+e.h){
      if(h.vy>60&&h.pb<=e.y+14){e.alive=false;e.t=0;h.vy=-640;h.hold=0;st.ev.push({type:'stomp',x:e.x+e.w/2,y:e.y});}
      else hurt(st,h.x+h.w/2<e.x+e.w/2?-1:1);
    }
  });
  /* предметы */
  var hx=h.x+h.w/2,hy=h.y+h.h/2;
  for(i=st.items.length-1;i>=0;i--){
    var it=st.items[i],dx=hx-it.x,dy=hy-it.y;
    if(Math.abs(dx)<it.r+h.w/2&&Math.abs(dy)<it.r+h.h/2){
      st.items.splice(i,1);
      if(it.k==='coin')st.coins++;
      else if(it.k==='gem')st.coins+=10;
      else if(it.k==='star')st.stars.push(it.id);
      else if(it.k==='heart')st.hearts=Math.min(3,st.hearts+1);
      else if(it.k==='key'){st.key=true;st.ev.push({type:'door'});}
      st.ev.push({type:it.k,x:it.x,y:it.y});
    }
  }
  /* контрольные точки */
  st.checks.forEach(function(c){
    if(!c.on&&Math.abs(hx-c.x)<30&&h.y+h.h>c.y-140&&h.y<c.y){c.on=true;st.cp={x:c.x-h.w/2,y:c.y};st.ev.push({type:'check',x:c.x,y:c.y});}
  });
  /* выход */
  if(st.exit){var ex=hx-st.exit.x,ey=hy-st.exit.y;if(ex*ex+ey*ey<st.exit.r*st.exit.r){st.clear=true;st.ev.push({type:'clear'});}}
}

window.RunAdv={T:T,VW:VW,VH:VH,create:create,update:update,cell:cell,solidCell:solidCell};
})();
