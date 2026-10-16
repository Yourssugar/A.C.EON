/* Aceonium: справочники и формулы баланса.
   Файл без DOM, поэтому его же грузит tools/sim.js в node для проверки баланса.
   Все цены, которые должны "успевать" за экономикой, считаются через goldAt(уровень):
   столько монет даёт обычный враг этого уровня. */
(function(root){
'use strict';

var D={};

/* ── враги и награды ── */
D.HP_BASE=10;
D.HP_GROW=1.18;
D.BOSS_HP=8;          // босс толще обычного врага того же уровня
D.GOLD_DIV=7;         // монет за врага = HP / GOLD_DIV
D.BOSS_GOLD=4;
D.BOSS_TIME=30;       // секунд на босса
D.WALK_TIME=2.2;      // переход между врагами: тень вдали успевает собраться в монстра
D.DEATH_TIME=0.55;

D.isBoss=function(L){return L%10===0;};
D.hp=function(L){return Math.ceil(D.HP_BASE*(Math.pow(D.HP_GROW,L-1)+(L-1)*0.6));};
D.goldAt=function(L){return Math.max(1,Math.ceil(D.hp(L)/D.GOLD_DIV));};

/* ── герой (урон клика) ── */
D.HERO_COST=6; D.HERO_GROW=1.075;
D.heroDmg=function(lvl){return lvl*Math.pow(2,Math.floor(lvl/25));};
D.CLICK_DPS_SHARE=0.04;          // клик дополнительно получает 4% урона посоха в секунду

/* ── посох (урон в секунду) ── */
D.STAFF_COST=20; D.STAFF_GROW=1.08;
D.STAFF_MS=20;                   // каждые 20 уровней посоха урон x2
D.staffDps=function(lvl){return lvl*2*Math.pow(2,Math.floor(lvl/D.STAFF_MS));};
D.STAFF_RATE=1.0;                // выстрелов в секунду
D.staffTier=function(lvl){return Math.floor(lvl/25);};
D.TIER_COLORS=['#00e5ff','#a060ff','#ff2d78','#ffcc33','#e8fbff','#33ff99','#ff6a1a','#6a8cff'];

/* цена n уровней подряд начиная с lvl (геометрическая сумма) */
D.bulkCost=function(base,grow,lvl,n){return base*Math.pow(grow,lvl)*(Math.pow(grow,n)-1)/(grow-1);};
D.maxAfford=function(base,grow,lvl,coins){
  var first=base*Math.pow(grow,lvl);if(coins<first)return 0;
  return Math.max(1,Math.floor(Math.log(coins*(grow-1)/first+1)/Math.log(grow)));
};

/* ── крит ── */
D.CRIT_CHANCE=0.02; D.CRIT_MULT=5;
D.CRIT_CH_STEP=0.01; D.CRIT_CH_MAX=23;      // +1% за уровень, до 25% всего
D.CRIT_MU_STEP=0.5;  D.CRIT_MU_MAX=20;      // +0.5 к множителю
D.critChCost=function(l){return 15*D.goldAt(6+l*5);};
D.critMuCost=function(l){return 20*D.goldAt(9+l*6);};

/* ── способности ──
   pow: сила на 1 уровне, step: прибавка за уровень. Откат -4% за уровень. */
D.SKILLS=[
  {id:'overload', key:'1',unlock:10, dur:30,cd:300, pow:2,  step:0.5},  // x урон
  {id:'focus',    key:'2',unlock:25, dur:30,cd:480, pow:0.5,step:0.1},  // + шанс крита
  {id:'flurry',   key:'3',unlock:50, dur:20,cd:600, pow:3,  step:0.5},  // x скорость посоха
  {id:'discharge',key:'4',unlock:75, dur:0, cd:900, pow:30, step:10},   // мгновенно: секунд урона посоха
  {id:'harvest',  key:'5',unlock:100,dur:60,cd:1200,pow:2,  step:0.5}   // x монеты
];
D.SKILL_MAX=10;
D.skillCost=function(i,l){return 40*D.goldAt(12+i*8+l*10);};
D.skillPow=function(s,l){return s.pow+s.step*Math.max(0,l-1);};

/* ── усталость и таверна (часы) ── */
D.AWAKE_H=16;          // от 0 до 100% в пути
D.REST_H=8;            // от 100 до 0% в таверне
D.ROAD_REST_EFF=0.5;   // отдых у дороги в 2 раза медленнее
D.OFFLINE_EFF=0.5;
D.OFFLINE_MAX_H=24*7;
/* множитель урона от усталости 0..1: кусочно-линейно по точкам */
D.FATIGUE_CURVE=[[0,1],[0.25,1],[0.6,0.75],[0.9,0.4],[1,0.2]];
D.fatigueMult=function(f){
  var c=D.FATIGUE_CURVE;if(f<=0)return 1;if(f>=1)return c[c.length-1][1];
  for(var i=1;i<c.length;i++)if(f<=c[i][0]){var a=c[i-1],b=c[i];return a[1]+(b[1]-a[1])*(f-a[0])/(b[0]-a[0]);}
  return 1;
};
D.fatigueState=function(f){return f<0.25?'fresh':f<0.6?'tired':f<0.9?'worn':'spent';};

D.TAVERN_LEVEL=20;                                  // портал открывается после этого уровня
D.tavernCost=function(){return 25*D.goldAt(20);};
D.TAVERN_UP=[
  {id:'bed',    max:4,cost:function(l){return 40*D.goldAt(30+l*15);}},   // -0.5 ч отдыха
  {id:'amulet', max:4,cost:function(l){return 40*D.goldAt(35+l*15);}},   // +1 ч в пути
  {id:'lantern',max:3,cost:function(l){return 50*D.goldAt(40+l*20);}}    // +10% офлайн
];

/* ── перерождение ── */
D.PRESTIGE_LEVEL=100;   // нужно победить босса этого уровня
D.SHARD_BONUS=0.10;     // каждый неистраченный осколок: +10% урона и монет
D.shardsFor=function(maxLevel){return maxLevel<=D.PRESTIGE_LEVEL?0:Math.floor(Math.pow((maxLevel-90)/5,1.5));};
D.RELICS=[
  {id:'start',   max:20,base:1},   // +5 к стартовому уровню
  {id:'eye',     max:25,base:1},   // +1% шанс крита
  {id:'edge',    max:20,base:1},   // +0.5 множитель крита
  {id:'flow',    max:10,base:2},   // -4% откат способностей
  {id:'stamina', max:8, base:2},   // +1 ч в пути
  {id:'dream',   max:4, base:2},   // -0.5 ч отдыха
  {id:'shadow',  max:5, base:2},   // +10% офлайн
  {id:'trophy',  max:10,base:1},   // +50% монет с боссов
  {id:'autoportal',max:1,base:3}   // на 100% усталости сам уходит в таверну
];
D.relicCost=function(r,l){return r.base*(l+1);};

/* ── гардероб ── */
D.ROBES=[
  {id:'wander',c:'#6a5636',t:'#a08a5a',free:true},
  {id:'ash',   c:'#4a5068',t:'#a0a8c0',free:true},
  {id:'night', c:'#23306e',t:'#c8a040',free:true},
  {id:'moss',  c:'#2f5a3a',t:'#b0c070',free:true},
  {id:'cyan',  c:'#0090a8',t:'#e0ffff',lvl:10},
  {id:'violet',c:'#5a2aa0',t:'#e0b0ff',lvl:20},
  {id:'ember', c:'#a8381a',t:'#ffc060',lvl:30},
  {id:'gold',  c:'#a8822a',t:'#fff0b0',lvl:40},
  {id:'rose',  c:'#b02a62',t:'#ffd0e8',lvl:50},
  {id:'ice',   c:'#8cc8de',t:'#ffffff',lvl:60},
  {id:'void',  c:'#16101f',t:'#a050ff',lvl:70},
  {id:'toxic', c:'#5a9a18',t:'#e8ff60',lvl:80},
  {id:'aceon', c:'#0a1a2a',t:'#00e5ff',lvl:90}
];
D.robeCost=function(r){return r.free?0:20*D.goldAt(r.lvl);};
D.robe=function(id){for(var i=0;i<D.ROBES.length;i++)if(D.ROBES[i].id===id)return D.ROBES[i];return D.ROBES[0];};

/* ── монстры и биомы ── */
D.MONSTERS=['slime','eye','golem','ghost','spider'];
D.monsterAt=function(L){return D.MONSTERS[(L*7+Math.floor(L/50)*3)%D.MONSTERS.length];};
D.BIOME_LEN=50;
D.biomeAt=function(L){return Math.floor((L-1)/D.BIOME_LEN)%4;};

/* ── формат чисел ── */
var SUF=['','K','M','B','T','Qa','Qi','Sx','Sp','Oc','No','Dc'];
D.fmt=function(n){
  if(!isFinite(n))return '∞';
  if(n<0)return '-'+D.fmt(-n);
  if(n<1000)return n<10&&n%1?n.toFixed(1):String(Math.floor(n));
  var e=Math.floor(Math.log10(n)/3);
  if(e<SUF.length){var v=n/Math.pow(1000,e);return (v<10?v.toFixed(2):v<100?v.toFixed(1):Math.floor(v))+SUF[e];}
  return n.toExponential(2).replace('+','');
};
D.fmtTime=function(sec,u){        // u: {h:'ч',m:'м',s:'с'}
  sec=Math.max(0,Math.round(sec));
  var h=Math.floor(sec/3600),m=Math.floor(sec%3600/60),s=sec%60;
  if(h)return h+u.h+' '+(m<10?'0':'')+m+u.m;
  if(m)return m+u.m+' '+(s<10?'0':'')+s+u.s;
  return s+u.s;
};

if(typeof module!=='undefined'&&module.exports)module.exports=D;else root.AcData=D;
})(this);
