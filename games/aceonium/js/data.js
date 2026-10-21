/* Aceonium: справочники и формулы баланса (v8a: походы за ресурсами).
   Файл без DOM, его же грузит tools/sim.js в node. */
(function(root){
'use strict';

var D={};

/* ── ресурсы ── */
/* v30.1: основные (поход и промыслы), уголь, переработка (плавильня и шахта), для зала (повар и пивовар), редкие с боссов */
D.RES=[
  {id:'wood',   c:'#b07a40'},
  {id:'iron',   c:'#9aa6b4'},
  {id:'herb',   c:'#6cc84a'},
  {id:'hide',   c:'#c08452'},
  {id:'meat',   c:'#d0584a',tav:true},
  {id:'hops',   c:'#a8c850',tav:true},
  {id:'veg',    c:'#f09030',tav:true},
  {id:'coal',   c:'#4a4a52',mine:true},
  {id:'steel',  c:'#8aa0c0'},
  {id:'silver', c:'#d6dde8'},
  {id:'gems',   c:'#7fd8ff'},
  {id:'ironwood',c:'#7a9a6a',rare:true},
  {id:'meteor', c:'#c060ff',rare:true},
  {id:'stonehide',c:'#a0a4a8',rare:true},
  {id:'ecto',   c:'#6ff0d0',rare:true}
];
D.RES_BY={};D.RES.forEach(function(r){D.RES_BY[r.id]=r;});

/* монстр под ресурс: модель из сцены и цвета [основной, акцент] (до настоящих моделей в v10) */
D.MON={
  wood:   {type:'golem', cols:['#5a3e22','#8fd040']},
  iron:   {type:'golem', cols:['#5c6068','#ff8a30']},
  herb:   {type:'slime', cols:['#4cc23a','#e0ffb0']},
  hide:   {type:'spider',cols:['#5a3a22','#ffb040']},
  meat:   {type:'spider',cols:['#8a3a2a','#ffd0a0']}
};

/* ── тракты ── */
/* v30.1: во всех трактах основные ресурсы и мясо, у каждого свой перевес (повтор в списке = чаще).
   Дальше тракт - больше единиц с монстра (D.TRACT_QTY). Боссы дают редкий ресурс своего тракта. */
D.TRACTS=[
  {id:'summer',biome:0,res:['wood','iron','herb','hide','meat'],             rare:'ironwood', boss:{type:'golem', cols:['#3e4a30','#b0ff60']}},
  {id:'autumn',biome:1,res:['wood','wood','hide','iron','meat','herb'],      rare:'meteor',   boss:{type:'spider',cols:['#3a2010','#ffaa30']}},
  {id:'swamp', biome:2,res:['herb','herb','hide','meat','meat','iron'],      rare:'stonehide',boss:{type:'ghost', cols:['#c0d0ff','#eef4ff']}},
  {id:'pass',  biome:3,res:['iron','iron','wood','hide','meat','herb'],      rare:'ecto',     boss:{type:'eye',   cols:['#2a3a5a','#9fe8ff']}}
];
D.TRACT_QTY=[1,2,3,4];
/* v17: кто водится в тракте. Обычный монстр - случайный из списка по ресурсу; элита (с 30-й волны) крупнее, со свечением,
   вдвое крепче и даёт вдвое больше добычи; боссы: mini - волны 10-40 и 60-90, mid - 50-я, main - 100-я. Ключи - модели adventure.js */
D.ROSTER=[
  {mobs:{wood:['snake','goleling'],iron:['orc','ninja'],herb:['frog','greenblob','mushnub'],hide:['bunny','rat'],meat:['birb','bunny']},
   elite:{wood:'goleling_ev',herb:'mushnub_ev'},boss:{mini:'goleling_ev',mid:'mushnub_ev',main:'orc_skull'}},
  {mobs:{wood:['tribal','armabee'],hide:['bunny','alpaking','rat'],iron:['spider'],meat:['dino'],herb:['mushnub']},
   elite:{wood:'armabee_ev',hide:'alpaking_ev'},boss:{mini:'alpaking_ev',mid:'tribal',main:'monkroose'}},
  {mobs:{herb:['frog','glub','squidle'],hide:['spikyblob','ghost_skull'],meat:['wasp','mushnub'],iron:['ghost']},
   elite:{herb:'glub_ev',meat:'mushnub_ev'},boss:{mini:'glub_ev',mid:'mushking',main:'bigfrog'}},
  {mobs:{iron:['orc','cactoro','ninja'],wood:['hywirl','alien'],hide:['yeti'],meat:['bluedemon'],herb:['alien']},
   elite:{},boss:{mini:'hywirl',mid:'wizard',main:'demon'}}
];
D.ELITE_FROM=30;D.ELITE_HP=2;
D.eliteChance=function(w){return w<D.ELITE_FROM?0:0.05+0.1*Math.min(1,(w-D.ELITE_FROM)/70);};
D.bossRole=function(w){return w>=D.WAVES?'main':w===50?'mid':'mini';};
D.PET_BITE=2.6;   // питомец кусает раз в столько секунд (v17: его бонус урона стал его собственными ударами)
D.PET_BITE_MIN=1;D.PET_BITE_MAX=3;   // v21: укус через случайные 1-3 с, урон пропорционален паузе
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
/* v31: постоянное здоровье. Восстановление 3% от максимума за 10 с везде (в таверне, во сне, в походе).
   Обычные монстры бьют раз в MOB_HIT с; урон от здоровья мага рекомендуемого уровня, элита вдвое сильнее.
   Броня (arm у вещей) снимает с каждого удара столько единиц, но не больше 75% удара. */
D.REGEN=0.003;
D.MOB_HIT=2;D.MOB_DPS=0.0035;D.ELITE_DMG=2;D.ARM_MIN=0.25;
D.mobDps=function(t,w){return D.maxHp(D.recLevel(t,w))*D.MOB_DPS;};
D.armHit=function(raw,arm){return Math.max(raw*D.ARM_MIN,raw-(arm||0));};
D.HP_LOW=0.9;   // осторожность: следующий бой не должен снять больше 90% текущего здоровья

/* ── добыча ── */
D.chance=function(w,cleared){return (cleared?0.30:0.21)+0.05*Math.floor((w-1)/10);};
D.BAG=[
  {cap:40, pick:0.6, cost:null},
  {cap:90, pick:0.75,cost:{hide:15}},
  {cap:180,pick:0.9, cost:{hide:40,wood:20}},
  {cap:400,pick:1.0, cost:{hide:80,ironwood:10}},
  {cap:600,pick:1.1, cost:{hide:150,steel:40,meteor:10}},
  {cap:900,pick:1.2, cost:{hide:250,silver:60,stonehide:10}}
];
/* склад ресурсов: уровень даёт стеллажи (v27 их ставит бригада строителей: сначала в каменной комнате, с 4-го уровня в подвале) */
D.STORE_UP={gold:function(l){return Math.ceil(100*Math.pow(3,l-1));},time:function(l){return 600*l;}};
D.STORE_CELLAR=4;   // с какого уровня открывается подвал
D.STORE=[
  {cap:200,  cost:null},
  {cap:400,  cost:{wood:40,iron:20}},
  {cap:800,  cost:{wood:100,iron:60}},
  {cap:1500, cost:{wood:200,steel:40}},
  {cap:3000, cost:{wood:400,steel:100,ironwood:10}},
  {cap:6000, cost:{wood:800,silver:100,meteor:10}},
  {cap:12000,cost:{wood:1500,gems:100,stonehide:10}}
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
/* v30.1: переработанные ресурсы дороже, поэтому их нужно меньше: b - сколько на первом уровне полосы, gr - рост за уровень */
D.STAFF_BANDS=[{to:20,main:'iron',b:5,gr:1.18},{to:40,main:'steel',b:2,gr:1.15},{to:60,main:'silver',b:1.5,gr:1.14},{to:1e9,main:'silver',b:2,gr:1.12,extra:'gems'}];
D.TIER_RARE=['ironwood','ironwood','meteor','meteor','stonehide','stonehide','ecto','ecto','ecto','ecto'];
D.staffCost=function(s){
  var c={},band=D.STAFF_BANDS[0];
  for(var i=0;i<D.STAFF_BANDS.length;i++)if(s<D.STAFF_BANDS[i].to){band=D.STAFF_BANDS[i];break;}
  var k=s-(band===D.STAFF_BANDS[0]?0:D.STAFF_BANDS[D.STAFF_BANDS.indexOf(band)-1].to);
  c.wood=Math.ceil(3*Math.pow(1.05,s));
  c[band.main]=(c[band.main]||0)+Math.ceil((band.b||5)*Math.pow(band.gr||1.18,k));
  if(band.extra)c[band.extra]=Math.ceil(1.5*Math.pow(1.12,k));
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
/* v30.1: очередь 6 мест на старте, 10 улучшений до 16 */
D.QSLOTS0=6;D.QSLOTS_MAX=16;
D.qSlotCost=function(n){return {gold:Math.ceil(60*Math.pow(1.7,n-D.QSLOTS0))};};
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
D.PAUSE_AWAY=600;   // сек: столько игрока нет, и маг сам продолжает поход, начатый паузой;

/* ════════ УРОВНИ ВЕЩЕЙ (v30) ════════
   У каждой вещи уровень (tier) 1..D.TIER_MAX (сейчас 7, позже до 12). Уровень вещи задаёт:
   уровень мастера, на котором приходит учитель (D.TIER_MLVL: 2-й на 2-м, 3-й на 4-м, 4-й на 6-м, 5-й на 9-м, 6-й на 12-м, 7-й на 15-м), цену учителя (D.TIER_TEACH),
   время учёбы и стоимость минуты работы в цене (D.MIN_RATE).
   Время крафта по уровням (ориентир): 1: 30-55 с, 2: 1.5-3 мин, 3: 4-7 мин, 4: 10-15 мин, 5: 20-30 мин, 6: 40-60 мин, 7: 1.5-2 ч.
   gd.lvl у вещей мастеров = нужный уровень мастера (считается из tier), у свитков мага = нужный уровень мага. */
D.TIER_MAX=7;
D.TIER_MLVL=[0,1,2,4,6,9,12,15,18,21,24,27,30];
D.TIER_TEACH=[0,0,100,350,1000,2500,6000,15000,35000,80000,180000,400000,900000];
D.MIN_RATE=[0,8,10,12,15,18,21,25,30,35,40,46,52];
D.teachTime=function(tier){return 600*tier;};

/* изделия: kind potion/ward тратятся в походе, armor/ring надеваются, goods только на продажу.
   eff: dmg/hp/chance/pick/crit - доли, fat - насколько медленнее устаёт.
   Вещи 1-го уровня мастер знает сразу, остальные через учителя. */
D.GOODS=[
  /* травница */
  {id:'p_heal', m:'herbalist',tier:1,kind:'potion',c:'#ff4a5a',eff:{hp:0.2},     cost:{herb:2},                    time:40},
  {id:'p_str',  m:'herbalist',tier:2,kind:'potion',c:'#ff9a3a',eff:{dmg:0.25},   cost:{herb:3,iron:1},             time:120},
  {id:'p_luck', m:'herbalist',tier:3,kind:'potion',c:'#9cff6a',eff:{chance:0.15},cost:{herb:5,hide:1},             time:300},
  {id:'p_vigor',m:'herbalist',tier:4,kind:'potion',c:'#ffd84a',eff:{fat:0.25},   cost:{herb:6,meat:2},             time:720},
  {id:'p_ward', m:'herbalist',tier:5,kind:'ward',  c:'#b080ff',eff:{},           cost:{herb:4,hide:3,ironwood:1},  time:1500},
  {id:'p_spore',m:'herbalist',tier:6,kind:'potion',c:'#d070ff',eff:{dmg:0.6},    cost:{herb:8,gems:1,meteor:1},    time:3000},
  {id:'p_elixir',m:'herbalist',tier:7,kind:'potion',c:'#5ae8ff',eff:{dmg:0.4,hp:0.4},cost:{herb:10,gems:3,ecto:1},time:6000},
  /* столяр */
  {id:'c_bow',  m:'carpenter',tier:1,kind:'goods', c:'#b07840',cost:{wood:2,hide:1},            time:45},
  {id:'c_spear',m:'carpenter',tier:2,kind:'goods', c:'#a08060',cost:{wood:3,iron:1},            time:130},
  {id:'c_shield',m:'carpenter',tier:3,kind:'goods',c:'#8a6a40',cost:{wood:6,iron:2},            time:360},
  {id:'c_arrows',m:'carpenter',tier:3,kind:'goods',c:'#c0a070',cost:{wood:4,hide:2},            time:300},
  {id:'c_longbow',m:'carpenter',tier:4,kind:'goods',c:'#9a6a3a',cost:{wood:8,hide:3,steel:1},   time:800},
  {id:'c_wand', m:'carpenter',tier:5,kind:'goods', c:'#7a9a6a',cost:{wood:10,ironwood:1},       time:1500},
  {id:'c_rshield',m:'carpenter',tier:5,kind:'goods',c:'#7a6a50',cost:{wood:10,steel:3},         time:1600},
  {id:'c_goldbow',m:'carpenter',tier:6,kind:'goods',c:'#e0b040',cost:{wood:12,silver:3,meteor:1},time:3200},
  {id:'c_darkbow',m:'carpenter',tier:7,kind:'goods',c:'#6a3a8a',cost:{ironwood:3,gems:3,ecto:1},time:6600},
  /* кузнец */
  {id:'s_sword',m:'smith',tier:1,kind:'goods', c:'#c0c8d4',cost:{iron:2,wood:1},              time:50},
  {id:'s_dagger',m:'smith',tier:1,kind:'goods',c:'#b0b8c4',cost:{iron:2},                     time:35},
  {id:'s_axe',  m:'smith',tier:2,kind:'goods', c:'#9aa6b4',cost:{wood:2,iron:2,coal:1},       time:150},
  {id:'s_hammer',m:'smith',tier:2,kind:'goods',c:'#8a96a4',cost:{iron:3,wood:1,coal:1},       time:170},
  {id:'s_helm', m:'smith',tier:3,kind:'armor', slot:'head',c:'#8a96a4',eff:{arm:1,hp:0.15},cost:{steel:2,hide:1},time:420},
  {id:'s_falchion',m:'smith',tier:3,kind:'goods',c:'#c8d0dc',cost:{steel:3,wood:1},           time:400},
  {id:'s_broad',m:'smith',tier:4,kind:'goods', c:'#d0d8e4',cost:{steel:5,wood:2},             time:800},
  {id:'s_kite', m:'smith',tier:4,kind:'goods', c:'#a0aab8',cost:{steel:5,wood:3},             time:900},
  {id:'s_mail', m:'smith',tier:5,kind:'armor', slot:'body',c:'#a0aab8',eff:{arm:4,hp:0.3}, cost:{steel:8,hide:3},time:1800},
  {id:'s_katana',m:'smith',tier:5,kind:'goods',c:'#e0e4ec',cost:{steel:8,silver:1},           time:1500},
  {id:'s_claymore',m:'smith',tier:6,kind:'goods',c:'#c8d4e0',cost:{steel:12,silver:3,meteor:1},time:3400},
  {id:'s_daxe', m:'smith',tier:6,kind:'goods', c:'#9aa6b4',cost:{steel:12,wood:4,meteor:1},   time:3000},
  {id:'s_blade',m:'smith',tier:7,kind:'goods', c:'#e0e8f0',cost:{silver:8,steel:6,stonehide:1},time:6000},
  {id:'s_goldsword',m:'smith',tier:7,kind:'goods',c:'#ffd040',cost:{silver:6,gems:4,ecto:1},  time:7000},
  /* кожевник */
  {id:'t_cloak',m:'tanner',tier:1,kind:'armor', slot:'body', c:'#4a6a3a',eff:{arm:0.3,hp:0.1},           cost:{hide:2,herb:1},time:55},
  {id:'t_belt', m:'tanner',tier:1,kind:'armor', slot:'belt', c:'#8a5a32',eff:{arm:0.1,hp:0.05,pick:0.03},cost:{hide:1,iron:1},time:35},
  {id:'t_boots',m:'tanner',tier:1,kind:'armor', slot:'feet', c:'#6a4428',eff:{arm:0.2,hp:0.05,fat:0.05}, cost:{hide:1,wood:1},time:35},
  {id:'t_pouch',m:'tanner',tier:2,kind:'goods', c:'#9a6a3a',cost:{hide:3,wood:1},                time:120},
  {id:'t_hood', m:'tanner',tier:3,kind:'armor', slot:'head', c:'#5a7a4a',eff:{arm:0.8,hp:0.12,chance:0.03},cost:{hide:4,herb:2},time:360},
  {id:'t_jerkin',m:'tanner',tier:4,kind:'armor',slot:'body', c:'#8a5a32',eff:{arm:2,hp:0.22},          cost:{hide:8,steel:1},time:800},
  {id:'t_silk', m:'tanner',tier:5,kind:'armor', slot:'body', c:'#dfe6ff',eff:{arm:2.5,hp:0.25,fat:0.05},cost:{hide:8,silver:2},time:1800},
  {id:'t_scale',m:'tanner',tier:6,kind:'armor', slot:'body', c:'#9aa0a6',eff:{arm:6,hp:0.4},           cost:{hide:10,stonehide:2},time:3200},
  {id:'t_ghost',m:'tanner',tier:7,kind:'armor', slot:'body', c:'#6ff0d0',eff:{arm:6,hp:0.3,fat:0.15},  cost:{hide:12,gems:2,ecto:1},time:6500},
  /* ювелир */
  {id:'j_ring', m:'jeweler',tier:1,kind:'ring',  slot:'ring',c:'#d6dde8',eff:{crit:0.03},         cost:{iron:2,herb:1},time:50},
  {id:'j_bone', m:'jeweler',tier:2,kind:'ring',  slot:'ring',c:'#c08452',eff:{crit:0.05,hp:0.05}, cost:{hide:2,iron:2},time:180},
  {id:'j_amulet',m:'jeweler',tier:3,kind:'goods',c:'#c87a40',cost:{iron:4,coal:2,herb:2},       time:400},
  {id:'j_crys', m:'jeweler',tier:4,kind:'ring',  slot:'ring',c:'#7fd8ff',eff:{pick:0.1},          cost:{silver:3,gems:1},time:900},
  {id:'j_chain',m:'jeweler',tier:5,kind:'goods', c:'#d6dde8',cost:{silver:5,steel:2},            time:1700},
  {id:'j_amber',m:'jeweler',tier:6,kind:'ring',  slot:'ring',c:'#c060ff',eff:{fat:0.15},          cost:{silver:4,gems:2,meteor:1},time:3600},
  {id:'j_star', m:'jeweler',tier:7,kind:'ring',  slot:'ring',c:'#9fe8ff',eff:{dmg:0.4},           cost:{gems:6,silver:6,ecto:1},time:7200},
  /* свитки мага (v11): маг пишет их сам, только когда он в таверне. lvl - уровень мага, учитель не нужен.
     xp - доля опыта до следующего уровня (считается не выше уровня свитка + 5). Продаются и берутся в поход, как зелья. */
  {id:'sc_spark',m:'mage',lvl:1, tier:1,kind:'scroll',c:'#ffb040',eff:{dmg:0.08},cost:{},                               time:30,  xp:0.02},
  {id:'sc_guard',m:'mage',lvl:3, tier:1,kind:'scroll',c:'#5ab0ff',eff:{hp:0.1},  cost:{},                               time:45,  xp:0.025},
  {id:'sc_wind', m:'mage',lvl:6, tier:2,kind:'scroll',c:'#a0f0c0',eff:{fat:0.1}, cost:{herb:2},                         time:100, xp:0.04},
  {id:'sc_seek', m:'mage',lvl:10,tier:3,kind:'scroll',c:'#e0d070',eff:{chance:0.1},cost:{herb:3,wood:2},                time:240, xp:0.065},
  {id:'sc_fire', m:'mage',lvl:15,tier:4,kind:'scroll',c:'#ff5a30',eff:{dmg:0.3}, cost:{coal:2,herb:3,ironwood:1},       time:600, xp:0.1},
  {id:'sc_storm',m:'mage',lvl:25,tier:5,kind:'scroll',c:'#8a7aff',eff:{dmg:0.5,crit:0.05},cost:{gems:1,herb:4,meteor:1},time:1200,xp:0.12},
  {id:'sc_star', m:'mage',lvl:40,tier:6,kind:'scroll',c:'#9fe8ff',eff:{dmg:0.8}, cost:{ecto:1,silver:3,gems:2},         time:2400,xp:0.15}
];
D.MAGE_SPEED=1;
D.GOOD_BY={};D.GOODS.forEach(function(x){
  D.GOOD_BY[x.id]=x;
  if(x.m!=='mage'){x.lvl=D.TIER_MLVL[x.tier];x.teach=D.TIER_TEACH[x.tier];}else x.teach=0;
});
/* цена = стоимость ресурсов + стоимость времени работы. Минута дорожает с уровнем вещи,
   свитки мага за полцены минуты (их ценность в опыте мага). */
D.RES_VALUE={wood:2.5,iron:2.5,herb:2.5,hide:2.5,meat:3,hops:3,veg:3,coal:4,steel:12,silver:20,gems:30,ironwood:25,meteor:60,stonehide:80,ecto:150};
D.priceOf=function(g){
  var rv=0;for(var k in g.cost)rv+=(D.RES_VALUE[k]||5)*g.cost[k];
  var tv=g.time/60*(D.MIN_RATE[g.tier]||D.MIN_RATE[D.MIN_RATE.length-1])*(g.m==='mage'?0.5:1),p=rv+tv;
  return p>100?Math.round(p/10)*10:Math.max(3,Math.round(p));
};
D.GOODS.forEach(function(x){x.price=D.priceOf(x);});
D.SLOTS=['head','body','belt','feet','ring'];
/* с чего начинает новый маг: хватает на первые заказы, пока не вернулся первый поход */
D.START={gold:150,store:{wood:20,iron:15,herb:20,hide:15,hops:12}};
/* улучшения мага тоже идут заказом у мастера */
D.ORDERS={
  staff:{m:'carpenter',time:function(s){return 20+15*s;},gold:function(s){return Math.ceil(10*Math.pow(1.16,s));}},
  bag:  {m:'tanner',   time:function(l){return 120*l;},gold:function(l){return Math.ceil(150*Math.pow(3.2,l-1));}}
};

/* постройки */
D.BUILD={
  forge:  {once:true,cost:function(){return {gold:400,wood:60,iron:40};}},
  tannery:{once:true,cost:function(){return {gold:600,wood:80,hide:60};}},
  jewelry:{once:true,cost:function(){return {gold:5000,wood:200,gems:50,meteor:5};}},
  hall:   {max:5,cost:function(l){var c={gold:Math.ceil(150*Math.pow(2.6,l))};if(l>0)c.wood=Math.ceil(40*Math.pow(1.8,l));return c;}},   /* v30: первый уровень зданий только за золото */
  bedroom:{max:4,cost:function(l){var c={gold:Math.ceil(300*Math.pow(2.5,l))};if(l>0)c.hide=Math.ceil(30*Math.pow(1.8,l));if(l>=2)c.silk=20*l;return c;}},
  decor:  {max:5,cost:function(l){var c={gold:Math.ceil(500*Math.pow(2.8,l))},r=['ironwood','ironwood','meteor','stonehide','ecto'][l];c[r]=3+2*l;return c;}}
};
D.BUILD_ORDER=['hall','bedroom'];   // v25: убранство теперь мебелью в режиме дизайна

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
D.PROD_BASE={wood:4,iron:6,herb:4,hide:4,meat:3,hops:3,veg:3,coal:18,steel:4,silver:3,gems:2,ecto:0.15};
/* v30.1: плавильня переплавляет со склада: 1 сталь = 2 железа + 1 уголь (нет сырья - стоит) */
D.CONVERT={steel:{iron:2,coal:1}};
D.PROD_KEEP=6;      // часов работы влезает в запас здания
D.PROD_MAX=10;
D.PROD=[
  {id:'saw',  lines:['wood'],                       build:{gold:200},  c0:10},   /* v30: постройка (1-й уровень) только за золото */
  {id:'mine', lines:['coal','iron','silver','gems'],build:{gold:320},  c0:25},
  {id:'smelt',lines:['steel'],                      build:{gold:300},  c0:20},
  {id:'hunt', lines:['hide','meat'],                build:{gold:380},  c0:15},
  {id:'farm', lines:['herb','hops','veg'],          build:{gold:260},  c0:12},
  {id:'ghost',lines:['ecto'],                       build:{gold:10000},c0:60,tract:3}
];
D.PROD_BY={};D.PROD.forEach(function(p){D.PROD_BY[p.id]=p;});
/* в каком тракте открывается ресурс (уголь из шахты есть всегда) */
D.RES_TRACT_FIX={coal:0,steel:0,meat:0,hops:0,veg:0,silver:1,gems:2,ecto:3};
D.resTract=function(r){if(D.RES_TRACT_FIX[r]!==undefined)return D.RES_TRACT_FIX[r];for(var i=0;i<D.TRACTS.length;i++)if(D.TRACTS[i].res.indexOf(r)>=0)return i;return 99;};
/* конюшня и возчик: сам свозит запас промыслов на склад раз в столько минут */
D.STABLE={build:{gold:1700},c0:150,max:5,every:[60,40,25,15,10]};
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
/* v25: места дают только столы; предел по уровню зала (чётный: столы на 2, 4, 6 мест) */
D.seatMax=function(hall){return [6,8,12,14,18,20][Math.max(0,Math.min(5,hall||0))];};
D.seatCost=function(n){return {gold:Math.ceil(150*Math.pow(1.4,n-D.SEATS0))};};   // n - сколько мест уже есть
D.GUEST_CHANCE=0.6;D.GUEST_SIT=900;D.GUEST_FOOD=0.5;
D.WORKERS={
  brewer:{hire:200,hall:0,batch:6,per:6,time:900, price:2,help:300,use:{hops:1/3}},
  cook:  {hire:500,hall:1,batch:4,per:4,time:1800,price:4,help:500,use:{meat:0.5,veg:0.5}}
};
D.WORKER_ORDER=['brewer','cook'];
/* v30.1: на партию уходит сырьё со склада: пивовару хмель, повару мясо и овощи (use - на одну порцию) */
D.workerUse=function(w,n){var u=D.WORKERS[w].use,c={};for(var k in u)c[k]=Math.ceil(u[k]*n);return c;};
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
/* v25: второй множитель от убранства (очки мебели), а не от репутации: репутация теперь тратится */
D.custRate=function(hall,k){return Math.min(D.CUST_MAX_RATE,(1+0.8*hall)*(1+(k||0)));};
D.custMax=function(hall){return 6+2*hall;};   // сколько ждут одновременно
D.CUST_PATIENCE=180;      // сколько ждёт в очереди
D.CUST_WALK=18;           // v27: сколько идёт от дороги до стойки
D.SERVE_T=4;              // v27: сколько хозяйка обслуживает одного (продаёт сама, только у стойки)
D.HOSTESS_AFTER=30;       // через сколько хозяйка продаёт сама (по базовой цене)
D.HAGGLE_UP=0.3;D.HAGGLE_FAIL=0.35;D.DISCOUNT=0.2;
D.TRAVELERS=12;           // типов путников в текстах (trav.0..11)
D.decorMult=function(l){return 1+0.06*l;};   // до v25: уровень убранства (для перевода сохранений)
/* ════════ МЕБЕЛЬ ЗАЛА (v25) ════════
   Столы дают места (ставит бригада строителей), декор даёт очки убранства, стойка даёт репутацию с продажи.
   fp - размер в клетках по уровням [ширина по x, глубина по z], seatPos - места относительно центра стола.
   Цена декора: c=[золото, репутация] за первый уровень; каждый следующий уровень x3, каждый следующий такой же предмет x1.35. */
D.FURN={
  table:   {cat:'table',fp:[[2,2],[3,3],[4,3]],seats:[2,4,6],bt:[120,600,1800],hall:[0,1,3],
            seatPos:[[[0,-0.72],[0,0.72]],[[-0.6,-0.85],[0.6,-0.85],[-0.6,0.85],[0.6,0.85]],[[-1.2,-0.85],[0,-0.85],[1.2,-0.85],[-1.2,0.85],[0,0.85],[1.2,0.85]]]},
  rug:     {cat:'decor',layer:'floor',fp:[[3,2]],pts:[3,6,10],c:[300,30]},
  barrel:  {cat:'decor',fp:[[1,1]],pts:[1,2,4],c:[80,8]},
  crate:   {cat:'decor',fp:[[1,1]],pts:[1,2,4],c:[100,10]},
  vase:    {cat:'decor',fp:[[1,1]],pts:[2,4,7],c:[200,20]},
  chest:   {cat:'decor',fp:[[2,1]],pts:[3,6,10],c:[450,45]},
  /* v26: витрины. Готовая вещь ложится на полку своего вида, путники просят только то, что лежит на полках */
  potshelf:{cat:'shelf',shelf:'pot', fp:[[2,1]],slots:[6,12,20],pts:[1,2,3],c:[150,10]},
  weapons: {cat:'shelf',shelf:'weap',fp:[[2,1]],slots:[4,8,14],pts:[2,3,5],c:[250,20]},
  dummy:   {cat:'shelf',shelf:'arm', fp:[[1,1]],slots:[3,6,10],pts:[2,3,5],c:[250,20]},
  jcase:   {cat:'shelf',shelf:'jew', fp:[[2,1]],slots:[4,8,14],pts:[2,3,5],c:[400,40]},
  bookcase:{cat:'decor',fp:[[2,1]],pts:[5,9,15],c:[1200,120],hall:[2]},
  armchair:{cat:'decor',fp:[[2,2]],pts:[5,10,16],c:[2000,200],hall:[2]},
  chandelier:{cat:'decor',layer:'ceil',fp:[[1,1]],pts:[6,12,20],c:[4000,400],hall:[3]},
  /* v27: сундук на складе (своя сцена, своя сетка): хранит готовые вещи, которые не поместились на полки */
  schest:  {cat:'chest',zone:'store',fp:[[2,1]],slots:[20,40,80]}
};
D.FURN_ORDER=['schest','table','potshelf','weapons','dummy','jcase','rug','barrel','crate','vase','chest','bookcase','armchair','chandelier'];
/* вид полки для вещи: зелья и свитки, оружие, доспехи и одежда, украшения */
D.SHELF_CATS=['pot','weap','arm','jew'];
D.SHELF_OF={pot:'potshelf',weap:'weapons',arm:'dummy',jew:'jcase'};
D.shelfCat=function(rid){var g=D.GOOD_BY[rid];if(!g)return null;return g.kind==='potion'||g.kind==='ward'||g.kind==='scroll'?'pot':g.kind==='goods'?'weap':g.kind==='armor'?'arm':g.kind==='ring'?'jew':null;};
/* какую витрину мастер приносит с собой при найме, если такой ещё нет */
D.MASTER_SHELF={herbalist:'pot',carpenter:'weap',smith:'weap',tanner:'arm',jeweler:'jew'};
/* грузчик: сколько вещей в час переносит со склада на полки; найм и улучшения */
D.LOADER={hire:150,rate:[20,35,55,80,120],up:[{gold:1500,rep:100},{gold:6000,rep:400},{gold:24000,rep:1500},{gold:80000,rep:5000}]};
D.FURN_LV=3;
D.CHEST_MAX=5;
D.chestCost=function(lv){var k=Math.pow(3,lv-1),r=Math.pow(2,lv-1);return {gold:Math.ceil(200*k),wood:Math.ceil(20*r),iron:Math.ceil(10*r)};};
D.furnHall=function(t,lv){var h=D.FURN[t].hall;return h?(h[lv-1]!==undefined?h[lv-1]:h[h.length-1]):0;};
/* цена декора: lv - какой уровень покупаем (1 - новый предмет), own - сколько таких уже есть */
D.decorCost=function(t,lv,own){var c=D.FURN[t].c,k=Math.pow(3,lv-1)*(lv===1?Math.pow(1.35,own||0):1);return {gold:Math.ceil(c[0]*k),rep:Math.ceil(c[1]*k)};};
/* убранство: очки -> надбавка к цене и к потоку путников (как раньше 5 уровней убранства и репутация 100) */
D.DECOR_PRICE=0.005;D.DECOR_PRICE_MAX=0.3;D.DECOR_FLOW=0.004;D.DECOR_FLOW_MAX=0.25;
D.decorPrice=function(pts){return 1+Math.min(D.DECOR_PRICE_MAX,pts*D.DECOR_PRICE);};
D.decorFlow=function(pts){return Math.min(D.DECOR_FLOW_MAX,pts*D.DECOR_FLOW);};
/* стойка хозяйки: репутация с каждой продажи по уровню */
D.COUNTER_MAX=5;D.counterRep=function(l){return l||1;};
D.counterCost=function(l){return {gold:Math.ceil(800*Math.pow(5,l-1)),rep:Math.ceil(80*Math.pow(5,l-1))};};   // с уровня l на l+1
D.TABLE_REP=0.05;   // улучшение стола: репутация как доля золота
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
