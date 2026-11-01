/* A.C.EON RUNNER: бесконечный бег (и забег дня с одинаковыми у всех препятствиями).
   Экран 960 x 540, земля на GY. Герой стоит на месте по x, мир едет навстречу со скоростью st.speed.
   Препятствия идут готовыми связками; расстояние до следующей связки считается от скорости,
   поэтому любая связка проходима.

   RunEndless.create({seed, daily})
   RunEndless.update(st, inp, dt)    inp как в RunPhys.step; события в st.ev */
(function(){
'use strict';

var P=window.RunPhys,PC=P.C;
var W=960,H=540,GY=440,HX=170,M=30;   /* M: пикселей в метре */
var BIOME_M=1000;

function rng(seed){var a=seed|0;return function(){a=(a+0x6D2B79F5)|0;var t=Math.imul(a^(a>>>15),1|a);t=(t+Math.imul(t^(t>>>7),61|t))^t;return ((t^(t>>>14))>>>0)/4294967296;};}

/* препятствия: размеры хитбоксов по мирам (картинка рисуется чуть больше).
   В городе низкое препятствие: широкий барьер, в пустыне кактус, в космосе блок. */
var FLY=[78,44];
var SIZES=[
  {low:[80,36],tall:[44,104],duck:FLY,high:FLY},
  {low:[46,64],tall:[36,104],duck:FLY,high:FLY},
  {low:[84,40],tall:[46,104],duck:FLY,high:FLY}];
var SIZE=SIZES[0];
/* какой мир будет в точке x экрана, когда герой до неё добежит */
function worldAt(st,x){return Math.floor((st.meters+(x-HX)/M)/BIOME_M)%3;}

function create(o){
  var seed=o.seed||Math.floor(Math.random()*1e9);
  var st={mode:o.daily?'daily':'endless',seed:seed,r:rng(seed),
    hero:P.hero(HX,GY),speed:430,dist:0,meters:0,score:0,coins:0,gems:0,jumps:0,ducks:0,
    obs:[],items:[],next:W+300,biome:0,biomeT:0,time:0,over:false,
    fx:{shield:0,magnet:0,boost:0},powNext:500,hits:0,ev:[],started:false};
  return st;
}

/* ── связки препятствий: [доля сложности, функция(st, x) -> ширина связки] ── */
function add(st,k,x,yb){
  var wd=worldAt(st,x),s=SIZES[wd][k],y=k==='duck'?GY-44-s[1]:k==='high'?GY-185-s[1]:GY-s[1];
  if(yb!=null)y=yb;
  st.obs.push({k:k,x:x,y:y,w:s[0],h:s[1],t:st.r()*6,wd:wd});
  return s[0];
}
function coins(st,x,n,yFn){for(var i=0;i<n;i++)st.items.push({k:'coin',x:x+i*36,y:yFn(i),r:13});}
/* дуга монет над прыжком: верх примерно на высоте обычного прыжка */
function arc(st,cx,n,top){for(var i=0;i<n;i++){var u=n>1?i/(n-1)*2-1:0;st.items.push({k:'coin',x:cx+u*n*18,y:GY-30-(top||110)*(1-u*u),r:13});}}

var PATTERNS=[
  {lv:0,f:function(st,x){var w=add(st,'low',x);arc(st,x+w/2,5);return w;}},
  {lv:0,f:function(st,x){coins(st,x,6,function(){return GY-30;});return 6*36;}},
  {lv:1,f:function(st,x){var w=add(st,'low',x);add(st,'low',x+w+4);arc(st,x+w,6,130);return w*2+4;}},
  {lv:1,f:function(st,x){var w=add(st,'tall',x);arc(st,x+w/2,6,190);return w;}},
  {lv:2,f:function(st,x){var w=add(st,'duck',x);coins(st,x-10,3,function(){return GY-20;});return w;}},
  {lv:2,f:function(st,x){var w=add(st,'low',x),g=st.speed*0.55+90;add(st,'low',x+w+g);arc(st,x+w/2,4);arc(st,x+w+g+w/2,4);return w*2+g;}},
  /* низкое внизу и летун сверху: прыгать коротко, не держать */
  {lv:3,f:function(st,x){var w=add(st,'low',x);add(st,'high',x+w/2-39);arc(st,x+w/2,4,80);return w;}},
  {lv:3,f:function(st,x){var w=add(st,'tall',x),g=st.speed*0.6+110;add(st,'duck',x+w+g);return w+g+78;}},
  {lv:4,f:function(st,x){var w=add(st,'duck',x),g=st.speed*0.5+80;add(st,'low',x+w+g);arc(st,x+w+g+23,4);return w+g+46;}},
  {lv:4,f:function(st,x){var w=add(st,'low',x);add(st,'low',x+w+4);add(st,'low',x+w*2+8);arc(st,x+w*1.5,7,170);return w*3+8;}},
  {lv:5,f:function(st,x){var w=add(st,'duck',x);add(st,'duck',x+w+st.speed*0.22);return w*2+st.speed*0.22;}}
];

function level(st){return Math.min(5,Math.floor(st.meters/300));}
function spawn(st){
  var lv=level(st),list=PATTERNS.filter(function(p){return p.lv<=lv;});
  /* чаще новые связки текущего уровня */
  var pick=st.r()<0.4?list.filter(function(p){return p.lv>=lv-1;}):list;
  if(!pick.length)pick=list;
  var p=pick[Math.floor(st.r()*pick.length)];
  var w=p.f(st,st.next);
  /* бонусы */
  if(st.meters>st.powNext){
    st.powNext=st.meters+600+st.r()*500;
    var kinds=['shield','magnet','boost'];
    st.items.push({k:kinds[Math.floor(st.r()*3)],x:st.next+w+st.speed*0.4,y:GY-110,r:22});
  }
  if(st.r()<0.08)st.items.push({k:'gem',x:st.next+w+st.speed*0.3,y:GY-150,r:16});
  /* до следующей связки: время реакции плюс прыжок, на скорости */
  st.next+=w+st.speed*(0.85+st.r()*0.6)+140;
}

function update(st,inp,dt){
  if(st.over)return;
  st.time+=dt;
  var h=st.hero;
  if(!st.started){
    /* ждём первого прыжка */
    if(inp.jumpHit){st.started=true;}
    else{h.run+=dt*4;return;}
  }
  st.speed=Math.min(1150,430+st.meters*0.35);
  var dx=st.speed*dt;
  st.dist+=dx;
  var m=st.dist/M,gain=m-st.meters;st.meters=m;
  st.score+=gain*(st.fx.boost>0?2:1);
  for(var k in st.fx)if(st.fx[k]>0)st.fx[k]-=dt;
  /* мир меняется каждые 1000 м */
  var b=Math.floor(st.meters/BIOME_M)%3;
  if(b!==st.biome){st.biome=b;st.ev.push({type:'biome',b:b});}
  /* герой */
  var world={auto:true,speed:st.speed,collide:function(o,axis){
    if(axis==='y'&&o.y+o.h>=GY){o.y=GY-o.h;if(o.vy>0)o.vy=0;return true;}
    return false;
  },onJump:function(){st.jumps++;st.ev.push({type:'jump'});},onLand:function(o,v){if(v>500)st.ev.push({type:'land'});}};
  var wasDuck=h.duck;
  P.step(h,inp,dt,world);
  if(h.duck&&!wasDuck)st.ducks++;
  /* мир едет */
  st.next-=dx;
  while(st.next<W+400)spawn(st);
  var i;
  for(i=st.obs.length-1;i>=0;i--){
    var o=st.obs[i];o.x-=dx+(o.k==='duck'||o.k==='high'?40*dt:0);o.t+=dt;
    if(o.x+o.w<-60){st.obs.splice(i,1);continue;}
    /* столкновение: хитбокс героя чуть меньше картинки */
    var bob=(o.k==='duck'||o.k==='high')?Math.sin(o.t*4)*4:0;
    if(h.x+6<o.x+o.w-4&&h.x+h.w-6>o.x+4&&h.y+6<o.y+bob+o.h-4&&h.y+h.h-2>o.y+bob+4){
      if(st.fx.shield>0){st.fx.shield=0;st.obs.splice(i,1);st.hits++;st.ev.push({type:'shieldHit',x:o.x,y:o.y});continue;}
      st.over=true;st.ev.push({type:'over'});return;
    }
  }
  /* монеты и бонусы, магнит тянет монеты */
  var cx=h.x+h.w/2,cy=h.y+h.h/2;
  for(i=st.items.length-1;i>=0;i--){
    var it=st.items[i];it.x-=dx;
    if(it.x<-40){st.items.splice(i,1);continue;}
    var ddx=cx-it.x,ddy=cy-it.y,d=Math.sqrt(ddx*ddx+ddy*ddy);
    if(st.fx.magnet>0&&(it.k==='coin'||it.k==='gem')&&d<260){it.x+=ddx/d*700*dt;it.y+=ddy/d*700*dt;}
    if(d<it.r+26){
      st.items.splice(i,1);
      if(it.k==='coin'){st.coins++;st.ev.push({type:'coin',x:it.x,y:it.y});}
      else if(it.k==='gem'){st.coins+=10;st.gems++;st.ev.push({type:'gem',x:it.x,y:it.y});}
      else{st.fx[it.k]=it.k==='shield'?99:it.k==='magnet'?8:10;st.ev.push({type:'power',k:it.k,x:it.x,y:it.y});}
    }
  }
}

window.RunEndless={W:W,H:H,GY:GY,M:M,HX:HX,BIOME_M:BIOME_M,SIZE:SIZE,SIZES:SIZES,create:create,update:update,rng:rng};
})();
