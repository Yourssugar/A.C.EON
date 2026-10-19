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
  {id:'coal',   c:'#4a4a52',mine:true},
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
/* v17: кто водится в тракте. Обычный монстр - случайный из списка по ресурсу; элита (с 30-й волны) крупнее, со свечением,
   вдвое крепче и даёт вдвое больше добычи; боссы: mini - волны 10-40 и 60-90, mid - 50-я, main - 100-я. Ключи - модели adventure.js */
D.ROSTER=[
  {mobs:{wood:['snake','goleling'],iron:['orc','ninja'],herb:['frog','greenblob','mushnub'],hide:['bunny','rat','birb']},
   elite:{wood:'goleling_ev',herb:'mushnub_ev'},boss:{mini:'goleling_ev',mid:'mushnub_ev',main:'orc_skull'}},
  {mobs:{bone:['dino','tribal'],silk:['spider','armabee'],hide:['bunny','alpaking','rat']},
   elite:{silk:'armabee_ev',hide:'alpaking_ev'},boss:{mini:'alpaking_ev',mid:'tribal',main:'monkroose'}},
  {mobs:{spore:['wasp','spikyblob','mushnub'],ecto:['ghost','ghost_skull'],herb:['frog','glub','squidle']},
   elite:{herb:'glub_ev',spore:'mushnub_ev'},boss:{mini:'glub_ev',mid:'mushking',main:'bigfrog'}},
  {mobs:{crystal:['bluedemon','hywirl'],silver:['yeti','alien'],iron:['orc','cactoro','ninja']},
   elite:{},boss:{mini:'hywirl',mid:'wizard',main:'demon'}}
];
D.ELITE_FROM=30;D.ELITE_HP=2;
D.eliteChance=function(w){return w<D.ELITE_FROM?0:0.05+0.1*Math.min(1,(w-D.ELITE_FROM)/70);};
D.bossRole=function(w){return w>=D.WAVES?'main':w===50?'mid':'mini';};
D.PET_BITE=2.6;   // питомец кусает раз в столько секунд (v17: его бонус урона стал его собственными ударами)
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
D.BOSS_HIT=1.8;D.BOSS_WIND=0.55;D.RAGE_T=60;D.RAGE_MULT=2;
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
/* вещи гардероба открываются уровнем мага и покупаются за золото таверны */
D.WARDROBE_FREE=false;
D.wardrobePrice=function(needLvl){return 50*needLvl*needLvl;};

/* ════════ ТАВЕРНА (v8b, v10) ════════
   Золото (gold) в ценах лежит рядом с ресурсами: {gold:100,wood:20}. */

/* качество изделия: множитель цены и силы */
/* v13: обычное / хорошее / безупречное / легендарное. Шанс зависит от инструментов мастера и его коллекции:
   база 87/8/4/1, каждый уровень инструментов +0.6% хорошего и +0.4% безупречного (10 ур.: 77/14/8/1),
   собранная коллекция +2% легендарного (75/14/8/3). */
D.QUAL=[1,1.25,1.5,2];
D.qualChance=function(tools,coll){var t=Math.min(tools||0,D.TOOLS_MAX);return [0,0.08+0.006*t,0.04+0.004*t,0.01+(coll?0.02:0)];};

/* мастера: живут в своих домах и мастерских в городе, нанимаются за золото.
   Инструменты (v15: вклады стадиями) повышают шанс качества, очередь заказов расширяется за золото. */
D.MASTERS=[
  {id:'herbalist',hire:0,  tools:{herb:10,wood:5}},
  {id:'carpenter',hire:60, tools:{wood:15,iron:5}},
  {id:'smith',    hire:90, tools:{iron:15,wood:5}},
  {id:'tanner',   hire:120,tools:{hide:15,iron:5}},
  {id:'jeweler',  hire:200,tools:{iron:10,herb:5}}
];
D.MASTER_BY={};D.MASTERS.forEach(function(m){D.MASTER_BY[m.id]=m;});
D.TOOLS_MAX=10;
/* общая очередь крафта (v11): одна на всех, мастера работают параллельно, каждый над первой своей вещью */
D.QSLOTS0=8;D.QSLOTS_MAX=30;
D.qSlotCost=function(n){return {gold:Math.ceil(80*Math.pow(1.6,n-D.QSLOTS0))};};
D.mXpNeed=function(l){return Math.ceil(20*Math.pow(1.35,l-1));};
/* скорость мастера: уровень +2% за уровень, не больше +40% (к 21-му), собранная коллекция ещё +10% */
D.mSpeed=function(lvl,coll){return (1+0.02*Math.min(20,lvl-1))*(coll?1.1:1);};
/* освоение вещи (v13): каждая сделанная копия ускоряет только работу руками, процесс (варка, нагрев, сушка) не ускоряется.
   Кривая обучения: время работы руками = (копия)^-b, к 60-й копии ровно вдвое быстрее, дальше не ускоряется. */
D.WORK_SHARE={herbalist:0.4,smith:0.55,carpenter:0.7,tanner:0.75,jeweler:0.85,mage:0.9};
D.MASTERY_CAP=60;
D.masteryMult=function(n){return Math.max(0.5,Math.pow(Math.min(n,D.MASTERY_CAP-1)+1,-Math.log(2)/Math.log(D.MASTERY_CAP)));};
D.craftTime=function(gd,n){var w=D.WORK_SHARE[gd.m]||0.6;return gd.time*(1-w)+gd.time*w*D.masteryMult(n||0);};
D.COLL_PRICE=1.1;   // собранная коллекция мастера: его вещи дороже на 10%
/* v20: ячейки качества в книге (бонус только своей вещи) и золотая страница мастера */
D.COLL_Q1=0.03;D.COLL_Q2=0.01;D.COLL_LEG_PRICE=1.1;D.COLL_LEG_SPEED=1.1;D.COLL_GOLD=0.01;
/* учитель: пока учит, мастер не работает */
D.teachTime=function(lvl){return 600*lvl;}
D.PAUSE_AWAY=600;   // сек: столько игрока нет, и маг сам продолжает поход, начатый паузой;

/* изделия: kind potion/ward тратятся в походе, armor/ring надеваются, goods только на продажу.
   eff: dmg/hp/chance/pick/crit - доли, fat - насколько медленнее устаёт.
   lvl 1 известны мастеру сразу, остальные через учителя (teach - золото). */
D.GOODS=[
  /* травница */
  {id:'p_heal', m:'herbalist',lvl:1,teach:0,    kind:'potion',c:'#ff4a5a',eff:{hp:0.2},     cost:{herb:3,wood:1},           time:120, price:22},
  {id:'p_str',  m:'herbalist',lvl:2,teach:120,  kind:'potion',c:'#ff9a3a',eff:{dmg:0.25},   cost:{herb:4,iron:1},           time:300, price:45},
  {id:'p_luck', m:'herbalist',lvl:3,teach:300,  kind:'potion',c:'#9cff6a',eff:{chance:0.15},cost:{herb:6,hide:1},           time:540, price:75},
  {id:'p_vigor',m:'herbalist',lvl:4,teach:600,  kind:'potion',c:'#ffd84a',eff:{fat:0.25},   cost:{herb:6,bone:1},           time:720, price:100},
  {id:'p_ward', m:'herbalist',lvl:5,teach:1200, kind:'ward',  c:'#b080ff',eff:{},           cost:{herb:3,hide:2,ironwood:1},time:1440,price:270},
  {id:'p_spore',m:'herbalist',lvl:7,teach:4000, kind:'potion',c:'#d070ff',eff:{dmg:0.6},    cost:{spore:5,herb:3,ecto:1},   time:1800,price:780},
  /* столяр */
  {id:'c_bow',  m:'carpenter',lvl:1,teach:0,    kind:'goods', c:'#b07840',cost:{wood:3,hide:1},         time:150, price:28},
  {id:'c_shield',m:'carpenter',lvl:3,teach:400, kind:'goods', c:'#8a6a40',cost:{wood:8,iron:2},         time:900, price:156},
  {id:'c_wand', m:'carpenter',lvl:5,teach:1600, kind:'goods', c:'#7a9a6a',cost:{wood:10,ironwood:1},    time:1800,price:420},
  /* кузнец */
  {id:'s_sword',m:'smith',lvl:1,teach:0,        kind:'goods', c:'#c0c8d4',cost:{iron:3,wood:1},         time:180, price:34},
  {id:'s_axe',  m:'smith',lvl:2,teach:200,      kind:'goods', c:'#9aa6b4',cost:{wood:2,iron:3,coal:1},  time:300, price:70},
  {id:'s_helm', m:'smith',lvl:3,teach:800,      kind:'armor', slot:'head',c:'#8a96a4',eff:{hp:0.15},cost:{iron:6,coal:3,hide:1}, time:720, price:285},
  {id:'s_mail', m:'smith',lvl:5,teach:2400,     kind:'armor', slot:'body',c:'#a0aab8',eff:{hp:0.3}, cost:{iron:10,coal:5,hide:3},time:1440,price:570},
  {id:'s_blade',m:'smith',lvl:8,teach:16000,    kind:'goods', c:'#e0e8f0',cost:{silver:6,iron:4,coal:4},time:3600,price:2850},
  /* кожевник */
  {id:'t_cloak',m:'tanner',lvl:1,teach:0,       kind:'armor', slot:'body', c:'#4a6a3a',eff:{hp:0.1},           cost:{hide:3,herb:1},time:240,price:40},
  {id:'t_belt', m:'tanner',lvl:1,teach:0,       kind:'armor', slot:'belt', c:'#8a5a32',eff:{hp:0.05,pick:0.03},cost:{hide:2,iron:1},time:180,price:30},
  {id:'t_boots',m:'tanner',lvl:1,teach:0,       kind:'armor', slot:'feet', c:'#6a4428',eff:{hp:0.05,fat:0.05}, cost:{hide:2,wood:1},time:180,price:30},
  {id:'t_hood', m:'tanner',lvl:3,teach:1000,    kind:'armor', slot:'head', c:'#5a7a4a',eff:{hp:0.12,chance:0.03},cost:{hide:4,silk:2},time:720,price:255},
  {id:'t_silk', m:'tanner',lvl:5,teach:3000,    kind:'armor', slot:'body', c:'#dfe6ff',eff:{hp:0.25,fat:0.05},cost:{silk:8,hide:4},time:1800,price:690},
  /* ювелир */
  {id:'j_ring', m:'jeweler',lvl:1,teach:0,      kind:'ring',  slot:'ring',c:'#d6dde8',eff:{crit:0.03},cost:{iron:3,herb:1},time:240,price:42},
  {id:'j_bone', m:'jeweler',lvl:2,teach:300,    kind:'ring',  slot:'ring',c:'#e8dfc4',eff:{crit:0.05,hp:0.05},cost:{bone:6,iron:2},time:720,price:390},
  {id:'j_crys', m:'jeweler',lvl:4,teach:6000,   kind:'ring',  slot:'ring',c:'#7fd8ff',eff:{pick:0.1}, cost:{crystal:5,silver:3},time:1800,price:1860},
  {id:'j_amber',m:'jeweler',lvl:6,teach:12000,  kind:'ring',  slot:'ring',c:'#ffaa30',eff:{fat:0.15}, cost:{amber:1,silver:4,bone:4},time:2400,price:3750},
  {id:'j_star', m:'jeweler',lvl:8,teach:40000,  kind:'ring',  slot:'ring',c:'#9fe8ff',eff:{dmg:0.4},  cost:{starice:2,silver:8,crystal:6},time:5400,price:15600},
  /* свитки мага (v11): маг пишет их сам, только когда он в таверне. lvl - уровень мага, учитель не нужен.
     Простые без ресурсов. xp - доля опыта до следующего уровня (считается не выше уровня свитка + 5).
     Продаются путникам и берутся в поход, как зелья. */
  {id:'sc_spark',m:'mage',lvl:1, teach:0,kind:'scroll',c:'#ffb040',eff:{dmg:0.08},cost:{},                              time:60,  price:10,  xp:0.04},
  {id:'sc_guard',m:'mage',lvl:3, teach:0,kind:'scroll',c:'#5ab0ff',eff:{hp:0.1},  cost:{},                              time:90,  price:14,  xp:0.05},
  {id:'sc_wind', m:'mage',lvl:6, teach:0,kind:'scroll',c:'#a0f0c0',eff:{fat:0.1}, cost:{herb:2},                        time:180, price:32,  xp:0.07},
  {id:'sc_seek', m:'mage',lvl:10,teach:0,kind:'scroll',c:'#e0d070',eff:{chance:0.1},cost:{herb:3,wood:2},               time:300, price:60,  xp:0.08},
  {id:'sc_fire', m:'mage',lvl:15,teach:0,kind:'scroll',c:'#ff5a30',eff:{dmg:0.3}, cost:{coal:2,herb:3,ironwood:1},      time:600, price:180, xp:0.1},
  {id:'sc_storm',m:'mage',lvl:25,teach:0,kind:'scroll',c:'#8a7aff',eff:{dmg:0.5,crit:0.05},cost:{crystal:2,ecto:2,herb:4},time:1200,price:700,xp:0.12},
  {id:'sc_star', m:'mage',lvl:40,teach:0,kind:'scroll',c:'#9fe8ff',eff:{dmg:0.8}, cost:{starice:1,silver:3,crystal:2},   time:2400,price:2600,xp:0.15}
];
D.MAGE_SPEED=1;
D.GOOD_BY={};D.GOODS.forEach(function(x){D.GOOD_BY[x.id]=x;});
/* v13: цена = стоимость ресурсов + стоимость времени работы. Минута дорожает с уровнем рецепта,
   свитки мага за полцены минуты (их ценность в опыте мага). Цены из таблицы выше заменяются этими. */
D.RES_VALUE={wood:2.5,iron:2.5,herb:2.5,hide:2.5,coal:4,bone:6,silk:6,spore:10,ecto:10,crystal:18,silver:18,ironwood:25,amber:60,pearl:80,starice:150};
D.MIN_RATE=[0,8,10,12,15,18,21,25,30];
D.priceOf=function(g){
  var rv=0;for(var k in g.cost)rv+=(D.RES_VALUE[k]||5)*g.cost[k];
  var lvl=g.m==='mage'?Math.min(8,Math.ceil(g.lvl/5)):g.lvl;
  var tv=g.time/60*(D.MIN_RATE[Math.min(8,lvl)]||30)*(g.m==='mage'?0.5:1),p=rv+tv;
  return p>100?Math.round(p/10)*10:Math.max(3,Math.round(p));
};
D.GOODS.forEach(function(x){x.price=D.priceOf(x);});
D.SLOTS=['head','body','belt','feet','ring'];
/* с чего начинает новый маг: хватает на первые заказы, пока не вернулся первый поход */
D.START={gold:150,store:{wood:20,iron:15,herb:20,hide:15}};
/* улучшения мага тоже идут заказом у мастера */
D.ORDERS={
  staff:{m:'carpenter',time:function(s){return 20+15*s;},gold:function(s){return Math.ceil(10*Math.pow(1.16,s));}},
  store:{m:'carpenter',time:function(l){return 180*l;},gold:function(l){return Math.ceil(100*Math.pow(3,l-1));}},
  bag:  {m:'tanner',   time:function(l){return 120*l;},gold:function(l){return Math.ceil(150*Math.pow(3.2,l-1));}}
};

/* постройки */
D.BUILD={
  forge:  {once:true,cost:function(){return {gold:400,wood:60,iron:40};}},
  tannery:{once:true,cost:function(){return {gold:600,wood:80,hide:60};}},
  jewelry:{once:true,cost:function(){return {gold:5000,wood:200,crystal:50,amber:5};}},
  hall:   {max:5,cost:function(l){return {gold:Math.ceil(150*Math.pow(2.6,l)),wood:Math.ceil(40*Math.pow(1.8,l))};}},
  bedroom:{max:4,cost:function(l){var c={gold:Math.ceil(300*Math.pow(2.5,l)),hide:Math.ceil(30*Math.pow(1.8,l))};if(l>=2)c.silk=20*l;return c;}},
  decor:  {max:5,cost:function(l){var c={gold:Math.ceil(500*Math.pow(2.8,l))},r=['ironwood','ironwood','amber','pearl','starice'][l];c[r]=3+2*l;return c;}}
};
D.BUILD_ORDER=['hall','bedroom','decor'];

/* шахта: уголь в минуту, предел вагонеток, улучшения дорожают быстрее, чем растёт добыча */
/* ════════ УЛУЧШЕНИЯ СТАДИЯМИ (v15) ════════
   Переход на следующий уровень: 20 вкладов золотом, каждый на 5% дороже прошлого и сразу даёт +1% шага уровня.
   После 20-го вклада стройка по времени (здания строит бригада, инструменты мастер делает сам),
   по её окончании приходят остальные 80% шага. Первый вклад c(L)=c0*2^L, L - текущий уровень от 0. */
D.STAGES=20;D.STAGE_GROW=1.05;D.STAGE_STEP=0.01;D.STAGE_LVL=2;
D.stageCost=function(c0,L,i){return Math.ceil(c0*Math.pow(D.STAGE_LVL,L)*Math.pow(D.STAGE_GROW,i));};
D.stageTime=function(L){return L<=0?600:Math.round(900*Math.pow(L,1.5));};
D.CREW_COST=[0,5000,50000];   // бригады строителей: первая есть сразу

/* промыслы: линии ресурсов работают, когда открыт тракт с этим ресурсом. Добыча в час = база * уровень. */
D.PROD_BASE={wood:4,iron:4,herb:4,hide:4,coal:18,bone:1,silk:1,spore:0.75,ecto:0.75,silver:0.5,crystal:0.5};
D.PROD_KEEP=6;      // часов работы влезает в запас здания
D.PROD_MAX=10;
D.PROD=[
  {id:'saw',  lines:['wood'],                       build:{gold:150,iron:20},             c0:10},
  {id:'mine', lines:['coal','iron','silver','crystal'],build:{gold:250,wood:30},          c0:25},
  {id:'hunt', lines:['hide','bone','silk'],         build:{gold:300,wood:40},             c0:15},
  {id:'farm', lines:['herb','spore'],               build:{gold:200,wood:30},             c0:12},
  {id:'ghost',lines:['ecto'],                       build:{gold:8000,bone:150,silk:100},  c0:60,tract:2}
];
D.PROD_BY={};D.PROD.forEach(function(p){D.PROD_BY[p.id]=p;});
/* в каком тракте открывается ресурс (уголь из шахты есть всегда) */
D.resTract=function(r){if(r==='coal')return 0;for(var i=0;i<D.TRACTS.length;i++)if(D.TRACTS[i].res.indexOf(r)>=0)return i;return 99;};
/* конюшня и возчик: сам свозит запас промыслов на склад раз в столько минут */
D.STABLE={build:{gold:1500,wood:60},c0:150,max:5,every:[60,40,25,15,10]};
/* инструменты мастера на той же схеме: c0 золотом, последний вклад ещё и материалы */
D.TOOLS_C0=5;
/* v20: доля мастера с продаж (20% цены сверх дохода игрока) и его часть нового инструмента (в 1.5 раза больше вкладов игрока за уровень) */
D.MASTER_SHARE=0.2;D.MASTER_PART=1.5;
D.masterPart=function(L){var t=0;for(var i=0;i<D.STAGES;i++)t+=D.stageCost(D.TOOLS_C0,L,i);return Math.ceil(t*D.MASTER_PART);};
D.toolsRes=function(m,l){var c={};for(var k in m.tools)c[k]=Math.ceil(m.tools[k]*Math.pow(1.45,l));return c;};

/* ════════ ГОСТИ, ПОВАР И ПИВОВАР (v16) ════════
   Путник после покупки (или устав ждать) садится за свободный стол с шансом 60% и сидит 15 минут.
   Садясь, берёт кружку у пивовара и с шансом 50% блюдо у повара, если готовое есть.
   Половина выручки идёт игроку, половина в сбережения работника. Накопив на расширение, работник сам
   расширяет кухню или пивоварню (недолгая стройка без бригады). Уровень даёт цену, помощники - порции за партию. */
D.SEATS0=2;D.SEATS_MAX=20;
D.seatMax=function(hall){return Math.min(D.SEATS_MAX,5+3*(hall||0));};
D.seatCost=function(n){return {gold:Math.ceil(150*Math.pow(1.4,n-D.SEATS0))};};   // n - сколько мест уже есть
D.GUEST_CHANCE=0.6;D.GUEST_SIT=900;D.GUEST_FOOD=0.5;
D.WORKERS={
  brewer:{hire:200,hall:0,batch:6,per:6,time:900, price:2,help:300},
  cook:  {hire:500,hall:1,batch:4,per:4,time:1800,price:4,help:500}
};
D.WORKER_ORDER=['brewer','cook'];
D.WORKER_MAX=10;D.WORKER_SHARE=0.5;D.HELP_MAX=5;
D.workerUp=function(L){return Math.ceil(300*Math.pow(2,L-1));};          // сбережения на расширение до L+1
D.workerBuild=function(L){return 600*L;};                                 // расширение: 10 мин x уровень
D.helpSlots=function(L){return Math.min(D.HELP_MAX,Math.ceil(L/2));};
D.helpCost=function(w,n){return {gold:Math.ceil(D.WORKERS[w].help*Math.pow(2,n))};};

/* ════════ ПИТОМЦЫ (v14) ════════
   Лису даёт мастер питомцев при найме. Остальных маг находит, пройдя главу (тракт) до 100-й волны:
   шанс 70% за каждое полное прохождение, пока питомец не найден. Бонус = eff * уровень, уровень до 20.
   Активен один питомец. Тренировка у мастера питомцев: золото и лакомства (травы, кожа), время. */
D.PETS=[
  {id:'fox',   start:true,eff:{dmg:0.02,chance:0.005},h:0.6, anim:{idle:'Idle',low:'Idle_2_HeadLow',run:'Gallop',attack:'Attack'},tint:{Main:'#ff6a10',Main_Light:'#fff3e2'}},
  {id:'shiba', tract:0,eff:{chance:0.012},              h:0.55,anim:{idle:'Idle',low:'Idle_2_HeadLow',run:'Gallop',attack:'Attack'}},
  {id:'cat',   tract:1,eff:{crit:0.004,dmg:0.01},       h:0.5, anim:{idle:'Idle',low:'Idle',run:'Walk',attack:'Bite_Front'}},
  {id:'wolf',  tract:2,eff:{dmg:0.03},                  h:0.75,anim:{idle:'Idle',low:'Idle_2_HeadLow',run:'Gallop',attack:'Attack'}},
  {id:'dragon',tract:3,eff:{dmg:0.025,hp:0.02},         h:0.42,fly:1.3,anim:{idle:'Flying_Idle',low:'Flying_Idle',run:'Fast_Flying',attack:'Punch'}}
];
D.PET_BY={};D.PETS.forEach(function(p){D.PET_BY[p.id]=p;});
D.PET_MAX=20;D.PET_FIND=0.7;D.PETMASTER_HIRE=300;
D.petCost=function(l){return {gold:Math.ceil(120*Math.pow(1.6,l-1)),herb:Math.ceil(4*Math.pow(1.3,l-1)),hide:Math.ceil(4*Math.pow(1.3,l-1))};};
D.petTime=function(l){return 600*l;};   // сек тренировки до следующего уровня

/* покупатели */
/* v11: путников в МИНУТУ, от 1 на старте до 5 (зал и репутация) */
D.CUST_MAX_RATE=5;
D.custRate=function(hall,rep){return Math.min(D.CUST_MAX_RATE,(1+0.8*hall)*(1+Math.min(0.25,rep/400)));};
D.custMax=function(hall){return 6+2*hall;};   // сколько ждут одновременно
D.CUST_PATIENCE=180;      // сколько ждёт покупатель, если нужной вещи нет
D.HOSTESS_AFTER=30;       // через сколько хозяйка продаёт сама (по базовой цене)
D.HAGGLE_UP=0.3;D.HAGGLE_FAIL=0.35;D.DISCOUNT=0.2;
D.TRAVELERS=12;           // типов путников в текстах (trav.0..11)
D.decorMult=function(l){return 1+0.06*l;};
D.BED_STEP=0.5;

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
