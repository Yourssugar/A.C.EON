/* Aceonium: справочники и формулы баланса (v8a: походы за ресурсами).
   Файл без DOM, его же грузит tools/sim.js в node. */
(function(root){
'use strict';

var D={};

/* ── ресурсы ── */
D.RES=[
  {id:'wood',   c:'#b07a40'},
  {id:'iron',   c:'#9aa6b4'},
  {id:'herb',   c:'#6cc84a'},
  {id:'hide',   c:'#c08452'},
  {id:'bone',   c:'#e8dfc4'},
  {id:'silk',   c:'#dfe6ff'},
  {id:'spore',  c:'#b77ae6'},
  {id:'ecto',   c:'#6ff0d0'},
  {id:'crystal',c:'#7fd8ff'},
  {id:'silver', c:'#d6dde8'},
  {id:'ironwood',c:'#7a9a6a',rare:true},
  {id:'amber',  c:'#ffaa30',rare:true},
  {id:'pearl',  c:'#eef4ff',rare:true},
  {id:'starice',c:'#9fe8ff',rare:true}
];
D.RES_BY={};D.RES.forEach(function(r){D.RES_BY[r.id]=r;});

/* монстр под ресурс: модель из сцены и цвета [основной, акцент] (до настоящих моделей в v10) */
D.MON={
  wood:   {type:'golem', cols:['#5a3e22','#8fd040']},
  iron:   {type:'golem', cols:['#5c6068','#ff8a30']},
  herb:   {type:'slime', cols:['#4cc23a','#e0ffb0']},
  hide:   {type:'spider',cols:['#5a3a22','#ffb040']},
  bone:   {type:'golem', cols:['#cfc6a8','#ff4040']},
  silk:   {type:'spider',cols:['#e6e8f0','#a060ff']},
  spore:  {type:'slime', cols:['#8a4ac0','#ffd0ff']},
  ecto:   {type:'ghost', cols:['#7ff0d8','#20c0a0']},
  crystal:{type:'eye',   cols:['#b8ecff','#2080ff']},
  silver: {type:'golem', cols:['#c8d0dc','#80e8ff']}
};

/* ── тракты ── */
D.TRACTS=[
  {id:'summer',biome:0,res:['wood','iron','herb','hide'],rare:'ironwood',boss:{type:'golem', cols:['#3e4a30','#b0ff60']}},
  {id:'autumn',biome:1,res:['bone','silk','hide'],       rare:'amber',   boss:{type:'spider',cols:['#3a2010','#ffaa30']}},
  {id:'swamp', biome:2,res:['spore','ecto','herb'],      rare:'pearl',   boss:{type:'ghost', cols:['#c0d0ff','#eef4ff']}},
  {id:'pass',  biome:3,res:['crystal','silver','iron'],  rare:'starice', boss:{type:'eye',   cols:['#2a3a5a','#9fe8ff']}}
];
D.WAVES=100;
D.MOBS=6;                 // монстров в волне
D.WALK_TIME=2.2;          // тень вдали собирается в монстра
D.WAVE_PAUSE=4;           // переход между волнами
D.DEATH_TIME=0.55;
D.HOME_TIME=6;            // дома: разобрать сумку и собраться
D.isBossWave=function(w){return w%10===0;};

/* рекомендуемый урон: за 25 с на обычного монстра, x3 от 1-й волны к 100-й, x4.5 между трактами */
D.REC0=8;D.IN_GROW=Math.pow(3,1/99);D.TRACT_GROW=4.5;
D.MOB_T=25;D.BOSS_T=45;
D.recDps=function(t,w){return D.REC0*Math.pow(D.TRACT_GROW,t)*Math.pow(D.IN_GROW,w-1);};
D.mobHp=function(t,w){return Math.ceil(D.recDps(t,w)*D.MOB_T);};
D.bossHp=function(t,w){return Math.ceil(D.recDps(t,w)*D.BOSS_T);};
/* здоровье мага по уровню, рекомендуемый уровень и урон босса */
D.HP0=100;D.HP_GROW=1.07;
D.maxHp=function(lvl){return Math.round(D.HP0*Math.pow(D.HP_GROW,lvl-1));};
D.LV_T=14;D.LV_W=12;
D.recLevel=function(t,w){return Math.max(1,Math.round(1+D.LV_T*t+D.LV_W*(w-1)/99));};
D.BOSS_HIT=1.8;D.RAGE_T=60;D.RAGE_MULT=2;
/* с рекомендуемой силой бой 45 с снимает 60% здоровья */
D.bossDps=function(t,w){return D.maxHp(D.recLevel(t,w))*0.6/D.BOSS_T;};

/* ── добыча ── */
D.chance=function(w,cleared){return (cleared?0.30:0.21)+0.05*Math.floor((w-1)/10);};
D.BAG=[
  {cap:40, pick:0.6, cost:null},
  {cap:90, pick:0.75,cost:{hide:15}},
  {cap:180,pick:0.9, cost:{hide:40,wood:20}},
  {cap:400,pick:1.0, cost:{hide:80,ironwood:10}},
  {cap:600,pick:1.1, cost:{hide:150,silk:100,amber:10}},
  {cap:900,pick:1.2, cost:{silk:250,ecto:150,pearl:10}}
];
D.STORE=[
  {cap:200,  cost:null},
  {cap:400,  cost:{wood:40,iron:20}},
  {cap:800,  cost:{wood:100,iron:60}},
  {cap:1500, cost:{wood:200,bone:100}},
  {cap:3000, cost:{wood:400,bone:250,ironwood:10}},
  {cap:6000, cost:{wood:800,ecto:400,amber:10}},
  {cap:12000,cost:{wood:1500,silver:600,pearl:10}}
];

/* ── опыт и уровень мага ── */
D.xpMob=function(t,w){return Math.pow(15,t)*Math.pow(1.012,w-1);};
D.XP_BOSS=12;
D.xpNeed=function(l){return Math.ceil(150*Math.pow(1.25,l-1));};
D.LVL_DMG=0.03;            // +3% урона за уровень

/* ── посох: урон в секунду и цена следующего уровня в ресурсах ── */
D.STAFF0=8;D.STAFF_GROW=1.07;
D.staffDps=function(s,lvl){return D.STAFF0*Math.pow(D.STAFF_GROW,s)*(1+D.LVL_DMG*((lvl||1)-1));};
D.staffTier=function(s){return Math.floor(s/10);};
D.TIER_COLORS=['#00e5ff','#a060ff','#ff2d78','#ffcc33','#e8fbff','#33ff99','#ff6a1a','#6a8cff'];
/* основа посоха по полосам уровней: дерево всегда понемногу, главный ресурс текущего тракта */
D.STAFF_BANDS=[{to:20,main:'iron'},{to:40,main:'bone'},{to:60,main:'ecto'},{to:1e9,main:'silver',extra:'crystal'}];
D.TIER_RARE=['ironwood','ironwood','amber','amber','pearl','pearl','starice','starice','starice','starice'];
D.staffCost=function(s){
  var c={},band=D.STAFF_BANDS[0];
  for(var i=0;i<D.STAFF_BANDS.length;i++)if(s<D.STAFF_BANDS[i].to){band=D.STAFF_BANDS[i];break;}
  var k=s-(band===D.STAFF_BANDS[0]?0:D.STAFF_BANDS[D.STAFF_BANDS.indexOf(band)-1].to);
  c.wood=Math.ceil(3*Math.pow(1.05,s));
  c[band.main]=(c[band.main]||0)+Math.ceil(5*Math.pow(1.18,k));
  if(band.extra)c[band.extra]=Math.ceil(4*Math.pow(1.16,k));
  if((s+1)%10===0){var tier=(s+1)/10,r=D.TIER_RARE[Math.min(tier-1,D.TIER_RARE.length-1)];c[r]=3*tier;}
  return c;
};

/* ── крит ── */
D.CRIT_CHANCE=0.05;D.CRIT_MULT=3;
D.CLICK_DPS_SHARE=0.05;    // клик: 5% урона посоха в секунду + уровень мага

/* ── умения: открываются уровнем мага, качаются очками (1 очко за уровень) ── */
D.SKILLS=[
  {id:'overload', key:'1',unlock:3, dur:30,cd:300, pow:2,   step:0.5},   // x урон
  {id:'focus',    key:'2',unlock:6, dur:30,cd:480, pow:0.5, step:0.1},   // + шанс крита
  {id:'flurry',   key:'3',unlock:10,dur:20,cd:600, pow:3,   step:0.5},   // x скорость посоха
  {id:'discharge',key:'4',unlock:15,dur:0, cd:900, pow:30,  step:10},    // мгновенно: секунд урона посоха
  {id:'harvest',  key:'5',unlock:20,dur:60,cd:1200,pow:1.25,step:0.05}   // x шанс ресурса
];
D.SKILL_MAX=10;
D.skillPointCost=function(l){return l;};      // с l на l+1
D.skillPow=function(s,l){return s.pow+s.step*Math.max(0,l-1);};
D.STAFF_RATE=1.0;

/* ── усталость и сон (часы) ── */
D.AWAKE_H=16;
D.REST_H=8;
D.REST_MIN_H=6;
D.OFFLINE_MAX_H=24*7;
D.FATIGUE_CURVE=[[0,1],[0.25,1],[0.6,0.75],[0.9,0.4],[1,0.2]];
D.fatigueMult=function(f){
  var c=D.FATIGUE_CURVE;if(f<=0)return 1;if(f>=1)return c[c.length-1][1];
  for(var i=1;i<c.length;i++)if(f<=c[i][0]){var a=c[i-1],b=c[i];return a[1]+(b[1]-a[1])*(f-a[0])/(b[0]-a[0]);}
  return 1;
};
D.fatigueState=function(f){return f<0.25?'fresh':f<0.6?'tired':f<0.9?'worn':'spent';};
/* заряд Ядра: за каждый час сна 60 с урона x1.5 в начале похода, максимум 3 мин */
D.REST_BUFF_MULT=1.5;D.REST_BUFF_PER_H=60;D.REST_BUFF_MAX=180;

/* ── гардероб (старые плащи процедурного мага) ── */
D.ROBES=[
  {id:'wander',c:'#6a5636',t:'#a08a5a',free:true},
  {id:'ash',   c:'#4a5068',t:'#a0a8c0',free:true},
  {id:'night', c:'#23306e',t:'#c8a040',free:true},
  {id:'moss',  c:'#2f5a3a',t:'#b0c070',free:true}
];
D.robe=function(id){for(var i=0;i<D.ROBES.length;i++)if(D.ROBES[i].id===id)return D.ROBES[i];return D.ROBES[0];};
/* пока в игре нет золота (до таверны v8b), платные вещи гардероба открываются бесплатно по уровню мага */
D.WARDROBE_FREE=true;

/* ── формат чисел ── */
var SUF=['','K','M','B','T','Qa','Qi','Sx','Sp','Oc','No','Dc'];
D.fmt=function(n){
  if(!isFinite(n))return 'inf';
  if(n<0)return '-'+D.fmt(-n);
  if(n<1000)return n<10&&n%1?n.toFixed(1):String(Math.floor(n));
  var e=Math.floor(Math.log10(n)/3);
  if(e<SUF.length){var v=n/Math.pow(1000,e);return (v<10?v.toFixed(2):v<100?v.toFixed(1):Math.floor(v))+SUF[e];}
  return n.toExponential(2).replace('+','');
};
D.fmtTime=function(sec,u){
  sec=Math.max(0,Math.round(sec));
  var h=Math.floor(sec/3600),m=Math.floor(sec%3600/60),s=sec%60;
  if(h)return h+u.h+' '+(m<10?'0':'')+m+u.m;
  if(m)return m+u.m+' '+(s<10?'0':'')+s+u.s;
  return s+u.s;
};

if(typeof module!=='undefined'&&module.exports)module.exports=D;else root.AcData=D;
})(this);
