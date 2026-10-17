/* Aceonium: игровая логика без DOM и без 3D.
   Состояние (S) хранится в Store('aceonium'), текущий бой (R) только в памяти.
   Сцена и интерфейс подписываются на события: game.on('kill', fn).
   Этот же файл гоняет tools/sim.js в node. */
(function(root){
'use strict';

var D=root.AcData||(typeof require!=='undefined'?require('./data.js'):null);

function defaults(){
  var skills={};D.SKILLS.forEach(function(s){skills[s.id]={l:1,cd:0,act:0};});
  return {
    profile:null,                                   // {name,gender:'m'|'f',created}
    look:null,                                      // облик 3D-персонажа (avatar.js)
    wardrobe:{owned:['wander','ash','night','moss'],robe:'wander'},
    coins:0,level:1,maxLevel:1,farm:false,autoBoss:false,
    hero:1,staff:0,critCh:0,critMu:0,
    skills:skills,
    fatigue:0,place:'road',                         // road | sit | tavern
    tavern:false,tav:{bed:0,amulet:0,lantern:0,alch:0,board:0},
    charge:0,rested:0,                              // часы сна в таверне / секунды бонуса после выхода
    prestige:{count:0,shards:0,total:0,best:1,relics:{}},
    stats:{clicks:0,kills:0,bosses:0,bossFails:0,play:0,rest:0,earned:0,earnedAll:0,craft:0},
    lastSeen:0,
    settings:{buy:1,gfx:'auto'}
  };
}

function Game(S){
  this.S=S;
  this.fatigueScale=1;          // отладка: ускорение усталости
  this.ev={};
  this.R={phase:'walk',t:0,enemy:null,bossT:0,staffT:0,hits:[],clock:0,clicks:[],bossNow:false};
}
var P=Game.prototype;

P.on=function(name,fn){(this.ev[name]=this.ev[name]||[]).push(fn);};
P.emit=function(name,data){var l=this.ev[name];if(l)for(var i=0;i<l.length;i++)l[i](data);};

/* ── производные величины ── */
P.relic=function(id){return this.S.prestige.relics[id]||0;};
P.skillDef=function(id){for(var i=0;i<D.SKILLS.length;i++)if(D.SKILLS[i].id===id)return D.SKILLS[i];return null;};
P.skillOn=function(id){return this.S.skills[id].act>0;};
P.skillUnlocked=function(s){return this.S.hero>=s.unlock;};
P.skillPow=function(id){return D.skillPow(this.skillDef(id),this.S.skills[id].l);};
P.shardMult=function(){return 1+this.S.prestige.shards*D.SHARD_BONUS;};
P.dmgMult=function(){
  var m=this.shardMult()*D.fatigueMult(this.S.fatigue);
  if(this.skillOn('overload'))m*=this.skillPow('overload');
  if(this.S.rested>0)m*=D.REST_BUFF_MULT;
  return m;
};
/* боевой доход в секунду на текущем уровне, бодрым (основа для ремесла в таверне) */
P.farmRate=function(){
  var L=this.enemyLevel(),hp=D.hp(L),crit=1+this.critChance()*(this.critMult()-1);
  var kps=Math.min(this.rawDps()*this.shardMult()*crit/hp,1/(D.WALK_TIME+D.DEATH_TIME));
  return kps*D.goldAt(L)*this.shardMult();
};
P.craftShare=function(){var t=this.S.tav;return D.CRAFT_BASE+D.CRAFT_ALCH*(t.alch||0)+D.CRAFT_BOARD*(t.board||0);};
P.craftRate=function(){return this.S.tavern?this.farmRate()*this.craftShare():0;};
P.restBuffFor=function(hours){return Math.min(D.REST_BUFF_MAX,hours*D.REST_BUFF_PER_H);};
P.rawDps=function(){return D.staffDps(this.S.staff);};
P.dps=function(){return this.rawDps()*this.dmgMult();};
P.staffRate=function(){return D.STAFF_RATE*(this.skillOn('flurry')?this.skillPow('flurry'):1);};
P.clickDmg=function(){return (D.heroDmg(this.S.hero)+this.rawDps()*D.CLICK_DPS_SHARE)*this.dmgMult();};
P.critChance=function(){
  var c=D.CRIT_CHANCE+this.S.critCh*D.CRIT_CH_STEP+this.relic('eye')*0.01;
  if(this.skillOn('focus'))c+=this.skillPow('focus');
  return Math.min(1,c);
};
P.critMult=function(){return D.CRIT_MULT+this.S.critMu*D.CRIT_MU_STEP+this.relic('edge')*0.5;};
P.coinMult=function(){return this.shardMult()*(this.skillOn('harvest')?this.skillPow('harvest'):1);};
P.awakeH=function(){return D.AWAKE_H+this.S.tav.amulet+this.relic('stamina');};
P.restH=function(){return Math.max(3,D.REST_H-0.5*this.S.tav.bed-0.5*this.relic('dream'));};
P.offlineEff=function(){return Math.min(1,D.OFFLINE_EFF+0.1*this.S.tav.lantern+0.1*this.relic('shadow'));};
P.skillCd=function(s){return s.cd*(1-0.04*(this.S.skills[s.id].l-1))*(1-0.04*this.relic('flow'));};
P.enemyLevel=function(){var L=this.S.level;return (D.isBoss(L)&&this.S.farm&&!this.R.bossNow)?L-1:L;};
P.isBossNext=function(){return D.isBoss(this.S.level)&&(!this.S.farm||this.R.bossNow);};
P.bossGold=function(){return D.BOSS_GOLD*(1+0.5*this.relic('trophy'));};

/* ── монеты ── */
P.addCoins=function(n){this.S.coins+=n;this.S.stats.earned+=n;this.S.stats.earnedAll+=n;};
P.spend=function(n){if(this.S.coins<n)return false;this.S.coins-=n;return true;};

/* ── бой ── */
P.spawn=function(){
  var R=this.R,S=this.S;
  var boss=this.isBossNext(),L=boss?S.level:this.enemyLevel();
  var hp=D.hp(L)*(boss?D.BOSS_HP:1);
  R.enemy={L:L,hp:hp,max:hp,boss:boss,type:D.monsterAt(L),biome:D.biomeAt(L),farm:S.farm&&!boss&&D.isBoss(S.level)};
  R.hits.length=0;R.staffT=0;
  R.phase='walk';R.t=D.WALK_TIME;
  this.emit('spawn',R.enemy);
};
P.start=function(){
  var S=this.S;
  if(S.place==='road')this.spawn();
  else{this.R.phase=S.place;this.R.enemy=null;}
  this.emit('place',S.place);
};

P.roll=function(base){
  var crit=Math.random()<this.critChance();
  return {dmg:crit?base*this.critMult():base,crit:crit};
};
P.fireStaff=function(){
  var per=this.rawDps()*this.dmgMult()/D.STAFF_RATE;
  if(per<=0)return;
  var r=this.roll(per);
  this.R.hits.push({t:0.32,dmg:r.dmg,crit:r.crit});
  this.emit('bolt',{kind:'staff',crit:r.crit});
};
/* клик: true, если засчитан */
P.click=function(){
  var R=this.R;
  if(this.S.place!=='road'||R.phase!=='fight')return false;
  while(R.clicks.length&&R.clock-R.clicks[0]>1)R.clicks.shift();
  if(R.clicks.length>=20)return false;
  R.clicks.push(R.clock);
  var r=this.roll(this.clickDmg());
  R.hits.push({t:0.2,dmg:r.dmg,crit:r.crit,click:true});
  this.S.stats.clicks++;
  this.emit('bolt',{kind:'click',crit:r.crit});
  return true;
};
P.applyHit=function(h){
  var R=this.R,e=R.enemy;
  if(R.phase!=='fight'||!e||e.hp<=0)return;
  e.hp=Math.max(0,e.hp-h.dmg);
  this.emit('hit',{dmg:h.dmg,crit:h.crit,click:!!h.click,big:!!h.big});
  if(e.hp<=0)this.kill();
};
P.kill=function(){
  var R=this.R,S=this.S,e=R.enemy;
  var coins=D.goldAt(e.L)*(e.boss?this.bossGold():1)*this.coinMult();
  this.addCoins(coins);
  S.stats.kills++;
  R.hits.length=0;
  R.phase='dying';R.t=D.DEATH_TIME;
  if(e.boss){
    S.stats.bosses++;S.farm=false;R.bossNow=false;S.level++;
    this.emit('bossWin',e);
  }else if(!e.farm){
    S.level++;
  }else if(S.autoBoss){
    R.bossNow=true;
  }
  if(S.level>S.maxLevel)S.maxLevel=S.level;
  if(S.level>S.prestige.best)S.prestige.best=S.level;
  this.emit('kill',{coins:coins,boss:e.boss,L:e.L});
};
P.bossFail=function(){
  var R=this.R,S=this.S;
  S.stats.bossFails++;
  S.level=Math.max(1,S.level-9);
  S.farm=true;R.bossNow=false;
  R.hits.length=0;
  this.emit('bossFail',R.enemy);
  R.phase='dying';R.t=0.9;R.enemy=null;
};
/* кнопка "Бой с боссом" в режиме фарма */
P.startBoss=function(){
  var S=this.S,R=this.R;
  if(!S.farm||S.place!=='road')return false;
  if(R.phase!=='fight'&&R.phase!=='walk')return false;
  R.bossNow=true;
  this.emit('retreat');
  this.spawn();
  return true;
};
P.setAutoBoss=function(on){this.S.autoBoss=!!on;};

/* ── усталость ── */
P.rest=function(){
  var S=this.S;
  if(this.relic('autoportal')&&S.tavern)return this.goTavern(true);
  S.place='sit';this.clearFight('sit');
  this.emit('place','sit');
};
P.clearFight=function(phase){var R=this.R;R.phase=phase;R.enemy=null;R.hits.length=0;R.bossNow=false;};
P.goTavern=function(auto){
  var S=this.S;
  if(!S.tavern||S.place==='tavern')return false;
  S.place='tavern';this.clearFight('tavern');
  this.emit('place','tavern',auto);
  return true;
};
P.goRoad=function(){
  var S=this.S;
  if(S.place==='road')return false;
  if(S.place==='tavern'&&S.charge>0){S.rested=Math.max(S.rested,this.restBuffFor(S.charge));S.charge=0;if(S.rested>0)this.emit('rested',S.rested);}
  S.place='road';
  this.emit('place','road');
  this.spawn();
  return true;
};
P.updateFatigue=function(dt){
  var S=this.S,R=this.R,h=dt*this.fatigueScale/3600;
  if(S.place==='road'){
    S.fatigue=Math.min(1,S.fatigue+h/this.awakeH());
    var inBoss=R.enemy&&R.enemy.boss&&(R.phase==='fight'||R.phase==='walk');
    if(S.fatigue>=1&&!inBoss&&R.phase!=='dying')this.rest();
  }else{
    var restH=this.restH()/(S.place==='sit'?D.ROAD_REST_EFF:1);
    S.fatigue=Math.max(0,S.fatigue-h/restH);
    S.stats.rest+=dt;
    if(S.place==='tavern'){
      S.charge+=h;
      var c=this.craftRate()*dt;
      if(c>0){this.addCoins(c);S.stats.craft+=c;this.R.craftAcc=(this.R.craftAcc||0)+c;this.R.craftT=(this.R.craftT||0)+dt;
        if(this.R.craftT>=3){this.emit('craft',this.R.craftAcc);this.R.craftAcc=0;this.R.craftT=0;}}
    }
    if(S.fatigue<=0)this.goRoad();
  }
  if(S.rested>0&&S.place==='road'){S.rested=Math.max(0,S.rested-dt);if(!S.rested)this.emit('restedEnd');}
};

/* ── способности ── */
P.useSkill=function(id){
  var S=this.S,R=this.R,s=this.skillDef(id),st=S.skills[id];
  if(!s||!this.skillUnlocked(s)||st.cd>0||S.place!=='road')return false;
  if(R.phase!=='fight'&&R.phase!=='walk')return false;
  st.cd=this.skillCd(s);st.act=s.dur;
  if(id==='discharge'){
    var dmg=this.rawDps()*this.dmgMult()*this.skillPow('discharge');
    if(R.phase==='fight')R.hits.push({t:0.45,dmg:dmg,crit:false,big:true});
    else R.hits.push({t:D.WALK_TIME+0.45,dmg:dmg,crit:false,big:true});
  }
  this.emit('skill',id);
  return true;
};

/* ── главный шаг ── */
P.update=function(dt){
  var S=this.S,R=this.R;
  if(!S.profile)return;
  R.clock+=dt;
  S.stats.play+=dt;
  for(var id in S.skills){var st=S.skills[id];if(st.cd>0)st.cd=Math.max(0,st.cd-dt);if(st.act>0){st.act=Math.max(0,st.act-dt);if(!st.act)this.emit('skillEnd',id);}}
  this.updateFatigue(dt);
  if(S.place!=='road')return;
  switch(R.phase){
    case 'walk':
      R.t-=dt;
      if(R.t<=0){
        R.phase='fight';
        if(R.enemy&&R.enemy.boss){R.bossT=D.BOSS_TIME;this.emit('bossStart',R.enemy);}
        this.emit('fight',R.enemy);
      }
      break;
    case 'fight':
      R.staffT+=dt*this.staffRate();
      var guard=0;
      while(R.staffT>=1&&guard++<20){R.staffT-=1;this.fireStaff();}
      if(R.enemy&&R.enemy.boss){R.bossT-=dt;if(R.bossT<=0&&R.enemy.hp>0)this.bossFail();}
      break;
    case 'dying':
      R.t-=dt;
      if(R.t<=0){
        if(S.fatigue>=1)this.rest();
        else this.spawn();
      }
      return;
  }
  for(var i=R.hits.length-1;i>=0;i--){
    var h=R.hits[i];h.t-=dt;
    if(h.t<=0){R.hits.splice(i,1);this.applyHit(h);if(R.phase!=='fight')break;}
  }
};

/* ── офлайн: маг фармит текущий уровень, не продвигаясь, и устаёт/отдыхает ── */
P.offline=function(sec){
  var S=this.S,rep={sec:sec,fight:0,rest:0,coins:0,kills:0,craft:0};
  if(!S.profile||sec<=0)return rep;
  sec=Math.min(sec,D.OFFLINE_MAX_H*3600);
  for(var id in S.skills){var st=S.skills[id];st.cd=Math.max(0,st.cd-sec);st.act=0;}
  var eff=this.offlineEff(),t=0,STEP=60;
  var L=this.enemyLevel(),hp=D.hp(L),gold=D.goldAt(L);
  var crit=1+this.critChance()*(this.critMult()-1);
  while(t<sec){
    var dt=Math.min(STEP,sec-t);t+=dt;
    if(S.place==='road'){
      var rate=this.rawDps()*this.shardMult()*D.fatigueMult(S.fatigue)*crit;
      var kills=rate*dt/hp;
      /* между врагами маг идёт: не больше одного врага за WALK_TIME+DEATH_TIME */
      kills=Math.min(kills,dt/(D.WALK_TIME+D.DEATH_TIME));
      rep.kills+=kills;
      rep.coins+=kills*gold*this.shardMult()*eff;
      rep.fight+=dt;
      S.fatigue=Math.min(1,S.fatigue+dt/3600/this.awakeH());
      if(S.fatigue>=1){S.place=(this.relic('autoportal')&&S.tavern)?'tavern':'sit';}
    }else{
      var restH=this.restH()/(S.place==='sit'?D.ROAD_REST_EFF:1);
      S.fatigue=Math.max(0,S.fatigue-dt/3600/restH);
      rep.rest+=dt;S.stats.rest+=dt;
      if(S.place==='tavern'){
        S.charge+=dt/3600;
        var cr=this.craftRate()*dt;rep.craft+=cr;
        if(S.fatigue<=0){S.rested=Math.max(S.rested,this.restBuffFor(S.charge));S.charge=0;}
      }
      if(S.fatigue<=0)S.place='road';
    }
  }
  rep.kills=Math.floor(rep.kills);
  S.stats.kills+=rep.kills;
  /* бонус отдыха тратится, если маг уже в пути без игрока */
  S.rested=Math.max(0,S.rested-rep.fight);
  this.addCoins(rep.coins+rep.craft);S.stats.craft+=rep.craft;
  return rep;
};

/* ── покупки ── */
P.buyN=function(kind){
  var n=this.S.settings.buy,S=this.S;
  var base=kind==='hero'?D.HERO_COST:D.STAFF_COST,grow=kind==='hero'?D.HERO_GROW:D.STAFF_GROW;
  var lvl=kind==='hero'?S.hero-1:S.staff;
  if(n==='max')return Math.max(1,D.maxAfford(base,grow,lvl,S.coins));
  return n;
};
P.levelCost=function(kind,n){
  var S=this.S;
  return kind==='hero'?D.bulkCost(D.HERO_COST,D.HERO_GROW,S.hero-1,n):D.bulkCost(D.STAFF_COST,D.STAFF_GROW,S.staff,n);
};
P.buyLevels=function(kind){
  var n=this.buyN(kind),c=this.levelCost(kind,n);
  if(!this.spend(c))return false;
  if(kind==='hero'){var before=this.S.hero;this.S.hero+=n;this.checkUnlocks(before);}
  else this.S.staff+=n;
  this.emit('buy',kind);
  return true;
};
P.checkUnlocks=function(before){
  var self=this;
  D.SKILLS.forEach(function(s){if(before<s.unlock&&self.S.hero>=s.unlock)self.emit('unlock',s.id);});
};
P.critCost=function(which){return which==='ch'?D.critChCost(this.S.critCh):D.critMuCost(this.S.critMu);};
P.buyCrit=function(which){
  var S=this.S,key=which==='ch'?'critCh':'critMu',max=which==='ch'?D.CRIT_CH_MAX:D.CRIT_MU_MAX;
  if(S[key]>=max||!this.spend(this.critCost(which)))return false;
  S[key]++;this.emit('buy','crit');return true;
};
P.skillUpCost=function(id){
  for(var i=0;i<D.SKILLS.length;i++)if(D.SKILLS[i].id===id)return D.skillCost(i,this.S.skills[id].l);
  return Infinity;
};
P.buySkill=function(id){
  var s=this.skillDef(id),st=this.S.skills[id];
  if(!this.skillUnlocked(s)||st.l>=D.SKILL_MAX||!this.spend(this.skillUpCost(id)))return false;
  st.l++;this.emit('buy','skill');return true;
};
P.buyTavern=function(){
  var S=this.S;
  if(S.tavern||S.maxLevel<=D.TAVERN_LEVEL||!this.spend(D.tavernCost()))return false;
  S.tavern=true;this.emit('buy','tavern');return true;
};
P.tavUpDef=function(id){for(var i=0;i<D.TAVERN_UP.length;i++)if(D.TAVERN_UP[i].id===id)return D.TAVERN_UP[i];return null;};
P.buyTavUp=function(id){
  var S=this.S,u=this.tavUpDef(id);
  if(!S.tavern||S.tav[id]>=u.max||(u.lvl&&S.maxLevel<u.lvl)||!this.spend(u.cost(S.tav[id])))return false;
  S.tav[id]++;this.emit('buy','tavern');return true;
};
P.robeOpen=function(r){return r.free||this.S.maxLevel>r.lvl||this.S.prestige.best>r.lvl;};
P.buyRobe=function(id){
  var S=this.S,r=D.robe(id);
  if(S.wardrobe.owned.indexOf(id)>=0)return this.equipRobe(id);
  if(!this.robeOpen(r)||!this.spend(D.robeCost(r)))return false;
  S.wardrobe.owned.push(id);S.wardrobe.robe=id;
  this.emit('look');return true;
};
P.equipRobe=function(id){
  var S=this.S;if(S.wardrobe.owned.indexOf(id)<0)return false;
  S.wardrobe.robe=id;this.emit('look');return true;
};
P.setLook=function(look){
  this.S.look=JSON.parse(JSON.stringify(look));
  if(this.S.profile)this.S.profile.gender=look.gender;
  this.emit('look');
};
P.setProfile=function(name,gender){
  var S=this.S;
  if(!S.profile)S.profile={name:name,gender:gender,created:Date.now()};
  else{S.profile.name=name;S.profile.gender=gender;}
  this.emit('look');
};

/* ── перерождение ── */
P.shardsNow=function(){return D.shardsFor(this.S.maxLevel);};
P.canPrestige=function(){return this.shardsNow()>0;};
P.prestige=function(){
  var S=this.S,n=this.shardsNow();
  if(n<=0)return false;
  var p=S.prestige;
  p.shards+=n;p.total+=n;p.count++;
  var start=1+5*this.relic('start');
  S.coins=0;S.level=start;S.maxLevel=start;S.farm=false;
  S.hero=1;S.staff=0;S.critCh=0;S.critMu=0;
  for(var id in S.skills)S.skills[id]={l:1,cd:0,act:0};
  S.tavern=false;S.tav={bed:0,amulet:0,lantern:0,alch:0,board:0};S.charge=0;S.rested=0;
  S.stats.earned=0;
  this.R.bossNow=false;
  if(S.place==='tavern')S.place='sit';     // портала больше нет: отдых продолжается у дороги
  this.emit('prestige',n);
  this.start();
  return n;
};
P.relicDef=function(id){for(var i=0;i<D.RELICS.length;i++)if(D.RELICS[i].id===id)return D.RELICS[i];return null;};
P.buyRelic=function(id){
  var r=this.relicDef(id),l=this.relic(id),p=this.S.prestige,c=D.relicCost(r,l);
  if(l>=r.max||p.shards<c)return false;
  p.shards-=c;p.relics[id]=l+1;
  this.emit('buy','relic');return true;
};

var api={Game:Game,defaults:defaults};
if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.AcGame=api;
})(this);
