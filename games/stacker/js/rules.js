/* A.C.EON TOWER: правила башни. Без DOM, проверяется в node.

   Поле шириной W, этаж высотой BH. Этаж ездит влево и вправо, по нажатию падает на башню:
   совпало в пределах PERFECT, этаж встаёт точно (серия), иначе свисающее отрезается.
   Каждые 5 точных подряд этаж снова становится шире (до ширины основания).
   Промах мимо башни целиком: конец (в классике) или задание не выполнено.

   Особенности заданий (o.mods): fast (быстрее), swing (скорость меняется по синусу),
   reverse (иногда разворачивается), wind (пока этаж падает, его сносит ветром), fog (в середине пути этаж не виден).

   TwRules.create({mode, level, seed})  TwRules.update(st, dt)  TwRules.drop(st) */
(function(){
'use strict';
var W=400,BH=32,BASEW=200,PERFECT=5,FALL=0.22,MINW=4;

function rng(seed){var a=seed|0;return function(){a=(a+0x6D2B79F5)|0;var t=Math.imul(a^(a>>>15),1|a);t=(t+Math.imul(t^(t>>>7),61|t))^t;return ((t^(t>>>14))>>>0)/4294967296;};}

/* 20 заданий: цель (этажей), ширина основания, особенности, звёзды за точные попадания */
var LEVELS=[
  {goal:8,base:200,mods:{},p2:2,p3:4},
  {goal:10,base:180,mods:{},p2:3,p3:5},
  {goal:12,base:200,mods:{fast:1.25},p2:3,p3:6},
  {goal:12,base:200,mods:{swing:0.5},p2:3,p3:6},
  {goal:14,base:160,mods:{},p2:4,p3:7},
  {goal:14,base:200,mods:{wind:60},p2:4,p3:7},
  {goal:15,base:200,mods:{reverse:0.35},p2:4,p3:7},
  {goal:16,base:180,mods:{fast:1.4},p2:4,p3:8},
  {goal:16,base:200,mods:{fog:1},p2:4,p3:8},
  {goal:18,base:170,mods:{swing:0.7,fast:1.15},p2:5,p3:9},
  {goal:18,base:200,mods:{wind:90},p2:5,p3:9},
  {goal:20,base:150,mods:{reverse:0.45},p2:5,p3:9},
  {goal:20,base:190,mods:{fog:1,fast:1.2},p2:5,p3:9},
  {goal:22,base:170,mods:{wind:70,swing:0.5},p2:6,p3:10},
  {goal:22,base:200,mods:{fast:1.55},p2:6,p3:10},
  {goal:24,base:160,mods:{reverse:0.4,fog:1},p2:6,p3:11},
  {goal:25,base:180,mods:{wind:110,fast:1.2},p2:7,p3:12},
  {goal:26,base:150,mods:{swing:0.8,reverse:0.3},p2:7,p3:12},
  {goal:28,base:170,mods:{fog:1,wind:80},p2:7,p3:13},
  {goal:28,base:160,mods:{fast:1.35,swing:0.6,reverse:0.3},p2:7,p3:13}
];

function create(o){
  var lv=o.mode==='levels'?LEVELS[o.level|0]:null,seed=o.seed||Math.floor(Math.random()*1e9);
  var bw=lv?lv.base:BASEW;
  var st={mode:o.mode||'classic',level:lv?o.level|0:-1,lv:lv,mods:lv?lv.mods:{},rnd:rng(seed),
    floors:[{x:(W-bw)/2,w:bw}],baseW:bw,cur:null,fall:null,n:0,streak:0,bestStreak:0,perfects:0,score:0,
    over:false,win:false,ev:[],t:0,wind:0};
  spawn(st);
  return st;
}
function speed(st){
  var v=Math.min(560,170+st.n*7);
  if(st.mods.fast)v*=st.mods.fast;
  return Math.min(900,v);
}
/* новый этаж: появляется с края, ширина как у верхнего */
function spawn(st){
  var top=st.floors[st.floors.length-1],w=top.w,left=st.rnd()<0.5;
  st.cur={x:left?0:W-w,w:w,dir:left?1:-1,ph:0,rev:0.8+st.rnd()*1.5};
  if(st.mods.wind){var s=st.rnd()<0.5?-1:1;st.wind=s*st.mods.wind*(0.6+st.rnd()*0.4);}
}
function update(st,dt){
  if(st.over)return;
  st.t+=dt;
  if(st.fall){
    /* этаж падает: короткая анимация, во время неё ветер сносит */
    st.fall.t+=dt;st.fall.x+=st.wind*dt;
    if(st.fall.t>=FALL)land(st);
    return;
  }
  var c=st.cur,v=speed(st);
  if(st.mods.swing){c.ph+=dt*2.2;v*=1+st.mods.swing*Math.sin(c.ph);}
  if(st.mods.reverse){c.rev-=dt;if(c.rev<=0){c.rev=0.7+st.rnd()*1.6;if(st.rnd()<st.mods.reverse){c.dir=-c.dir;st.ev.push({type:'rev'});}}}
  c.x+=c.dir*v*dt;
  if(c.x<0){c.x=-c.x;c.dir=1;}
  if(c.x+c.w>W){c.x=2*(W-c.w)-c.x;c.dir=-1;}
}
/* виден ли этаж (туман: в середине поля прячется) */
function visible(st){
  if(!st.mods.fog||!st.cur||st.fall)return true;
  var cx=st.cur.x+st.cur.w/2;return Math.abs(cx-W/2)>W*0.16;
}
function drop(st){
  if(st.over||st.fall||!st.cur)return false;
  st.fall={x:st.cur.x,w:st.cur.w,t:0};
  st.ev.push({type:'drop'});
  return true;
}
function land(st){
  var f=st.fall,top=st.floors[st.floors.length-1],x=f.x,w=f.w;st.fall=null;
  var dx=x-top.x,ev={type:'land',x:x,w:w,perfect:false,cut:null};
  if(Math.abs(dx)<=PERFECT){
    x=top.x;ev.perfect=true;st.streak++;st.perfects++;st.bestStreak=Math.max(st.bestStreak,st.streak);
    /* каждые 5 точных подряд этаж расширяется */
    if(st.streak%5===0&&w<st.baseW){var nw=Math.min(st.baseW,w+16);x-=(nw-w)/2;w=nw;ev.grow=true;}
  }else{
    var l=Math.max(x,top.x),r=Math.min(x+w,top.x+top.w),ov=r-l;
    st.streak=0;
    if(ov<MINW){
      ev.miss=true;ev.cut={x:x,w:w};st.ev.push(ev);
      st.over=true;st.ev.push({type:'over',why:'miss'});return;
    }
    ev.cut=x<l?{x:x,w:l-x}:{x:r,w:x+w-r};
    x=l;w=ov;
  }
  st.floors.push({x:x,w:w});st.n++;
  st.score+=10+(ev.perfect?5*Math.min(st.streak,10):0);
  ev.x=x;ev.w=w;ev.n=st.n;st.ev.push(ev);
  if(st.lv&&st.n>=st.lv.goal){st.win=true;st.over=true;st.ev.push({type:'win'});return;}
  spawn(st);
}
function stars(st){if(!st.lv||!st.win)return 0;return st.perfects>=st.lv.p3?3:st.perfects>=st.lv.p2?2:1;}
/* мир по высоте: 0 город, 1 облака, 2 космос */
function world(n){return n<25?0:n<50?1:2;}

window.TwRules={W:W,BH:BH,BASEW:BASEW,PERFECT:PERFECT,FALL:FALL,LEVELS:LEVELS,create:create,update:update,drop:drop,visible:visible,stars:stars,world:world,speed:speed};
})();
