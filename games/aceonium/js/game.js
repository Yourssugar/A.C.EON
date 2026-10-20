/* Aceonium: игровая логика без DOM и без 3D (v8: походы за ресурсами, таверна с мастерами).
   Состояние (S) хранится в Store('aceonium'), текущий бой (R) только в памяти.
   Сцена и интерфейс подписываются на события: game.on('kill', fn).
   Офлайн считается тем же набором функций, только без событий (silent). */
(function(root){
'use strict';

var D=root.AcData||(typeof require!=='undefined'?require('./data.js'):null);
var HL=root.AcHall||(typeof require!=='undefined'?require('./hall.js'):null);

function masterDefaults(){
  var m={};
  D.MASTERS.forEach(function(d){
    var known=D.GOODS.filter(function(x){return x.m===d.id&&x.teach===0;}).map(function(x){return x.id;});
    m[d.id]={hired:d.hire===0,lvl:1,xp:0,tools:0,tst:0,tbt:null,known:known,teach:null,done:{},coll:{},sav:0,inc:0};
  });
  return m;
}
function prodDefaults(){
  var p={};D.PROD.forEach(function(d){p[d.id]={lvl:0,st:0,bt:null,acc:{}};});
  p.stable={lvl:0,st:0,bt:null,cart:0};
  return p;
}
function workerDefaults(){return {hired:false,lvl:1,save:0,help:0,stock:0,t:0,bt:null,miss:0,served:0,earned:0};}
function tavDefaults(){return {seats:D.SEATS0,guests:[],acc:0,brewer:workerDefaults(),cook:workerDefaults(),inc:0};}
function defaults(){
  var skills={};D.SKILLS.forEach(function(s){skills[s.id]={l:1,cd:0,act:0};});
  return {
    profile:null,                                   // {name,gender:'m'|'f',created}
    look:null,                                      // облик 3D-персонажа (avatar.js)
    wardrobe:{owned:['wander','ash','night','moss'],robe:'wander'},
    mlvl:1,xp:0,spent:0,                            // уровень мага, опыт, потраченные очки умений
    staff:0,bagLvl:1,storeLvl:1,
    store:JSON.parse(JSON.stringify(D.START.store)),   // склад: ресурс -> количество (новичку немного на первые заказы)
    tracts:[{best:0,clears:0},{best:0,clears:0},{best:0,clears:0},{best:0,clears:0}],
    lastTract:0,forceNext:null,
    plan:{c:[0,0,0,0],i:0,done:0},                  // сколько раз пройти каждый тракт
    cautious:true,auto:true,sleepAfter:false,
    trip:null,                                      // текущий поход
    place:'home',                                   // road | home | sleep
    fatigue:0,charge:0,rested:0,
    skills:skills,
    journal:[],
    gold:D.START.gold,                              // ACEONIUM, только из таверны
    inv:{},                                         // изделия: 'id:качество' -> количество
    equip:{head:null,body:null,belt:null,feet:null,ring:null},
    use:{p_heal:true,p_str:true,p_luck:true,p_vigor:true,p_spore:true,p_ward:true,sc_spark:true,sc_guard:true},   // что брать в поход
    masters:masterDefaults(),
    queue:[],qSlots:D.QSLOTS0,                      // общая очередь крафта: {r,m,t,T,c}
    mageCraft:{done:{},coll:{}},                    // освоение и коллекция свитков мага
    pets:{hired:false,own:{},active:null,train:null}, // питомцы: own[id]={lvl}, train={id,t,T}
    build:{forge:0,tannery:0,jewelry:0,hall:0,bedroom:0,decor:0},
    prod:prodDefaults(),crews:1,crewQ:[],
    tav:tavDefaults(),
    recent:[],pinned:[],                            // v18: недавние заказы во вкладке КРАФТ и закреплённые вещи
    locked:{},bookFree:{},                          // v20: вещи с замком; копии, с которых снята пометка "нужна для книги"
                                 // v16: места, гости, повар и пивовар
                    // промыслы (v15) и бригады строителей
    cust:[],custAcc:0,custId:0,rep:0,repEarned:0,
    furn:[{id:1,t:'table',lv:1,x:2,z:-1,r:0}],furnId:1,counter:1,   // v25: мебель зала и уровень стойки
    shelf:{},loader:{hired:false,lvl:1,acc:0,moved:0},               // v26: что лежит на полках ('id:кач' -> сколько), грузчик
    seenV8b:false,
    stats:{clicks:0,kills:0,bosses:0,bossFails:0,trips:0,lostBags:0,lostItems:0,gathered:0,play:0,rest:0,sold:0,goldEarned:0,crafted:0},
    lastSeen:0,
    settings:{gfx:'auto'}
  };
}

function Game(S){
  this.S=S;
  this.fatigueScale=1;          // отладка: ускорение времени для усталости и сна
  this.ev={};
  this.silent=false;
  this.rep=null;
  this.R={phase:'home',t:0,enemy:null,staffT:0,hits:[],clock:0,clicks:[],homeT:0,bossT:0,hitT:0,mhp:0,after:null};
}
var P=Game.prototype;

P.on=function(name,fn){(this.ev[name]=this.ev[name]||[]).push(fn);};
P.off=function(name,fn){var l=this.ev[name];if(l){var i=l.indexOf(fn);if(i>=0)l.splice(i,1);}};
P.emit=function(name,data){if(this.silent)return;var l=this.ev[name];if(l)for(var i=0;i<l.length;i++)l[i](data);};

/* ── производные величины ── */
P.skillDef=function(id){for(var i=0;i<D.SKILLS.length;i++)if(D.SKILLS[i].id===id)return D.SKILLS[i];return null;};
P.skillOn=function(id){return this.S.skills[id].act>0;};
P.skillUnlocked=function(s){return this.S.mlvl>=s.unlock;};
P.skillPow=function(id){return D.skillPow(this.skillDef(id),this.S.skills[id].l);};
P.skillPoints=function(){return this.S.mlvl-1-this.S.spent;};
P.baseMult=function(){
  var m=D.fatigueMult(this.S.fatigue);
  if(this.skillOn('overload'))m*=this.skillPow('overload');
  if(this.S.rested>0)m*=D.REST_BUFF_MULT;
  return m;
};
P.dmgMult=function(){return this.baseMult()*(1+this.eff('dmg'));};
/* v17: бонус урона питомца - его собственные укусы (раньше прибавлялся к посоху); в сумме столько же */
P.petDps=function(){return this.rawDps()*this.baseMult()*this.petEff('dmg');};
/* сумма бонусов надетых вещей и зелий текущего похода */
P.eff=function(k){
  var S=this.S,v=0;
  for(var sl in S.equip){var it=S.equip[sl];if(!it)continue;var gd=D.GOOD_BY[it.id];if(gd&&gd.eff&&gd.eff[k])v+=gd.eff[k]*D.QUAL[it.q];}
  if(S.trip&&S.trip.buff&&S.trip.buff[k])v+=S.trip.buff[k];
  if(k!=='dmg')v+=this.petEff(k);
  return v;
};
P.rawDps=function(){return D.staffDps(this.S.staff,this.S.mlvl);};
P.staffRate=function(){return D.STAFF_RATE*(this.skillOn('flurry')?this.skillPow('flurry'):1);};
P.dps=function(){return this.rawDps()*this.dmgMult()*this.staffRate()/D.STAFF_RATE;};
P.critChance=function(){var c=D.CRIT_CHANCE+this.eff('crit');if(this.skillOn('focus'))c+=this.skillPow('focus');return Math.min(1,c);};
P.critMult=function(){return D.CRIT_MULT;};
P.critFactor=function(){return 1+this.critChance()*(this.critMult()-1);};
P.effDps=function(){return (this.dps()+this.petDps())*this.critFactor();};
P.clickDmg=function(){return (this.S.mlvl+this.rawDps()*D.CLICK_DPS_SHARE)*this.dmgMult();};
P.maxHp=function(){return Math.round(D.maxHp(this.S.mlvl)*(1+this.eff('hp')));};
P.awakeH=function(){return D.AWAKE_H/(1-Math.min(0.6,this.eff('fat')));};
P.restH=function(){return Math.max(D.REST_MIN_H,D.REST_H-D.BED_STEP*this.S.build.bedroom);};
P.skillCd=function(s){return s.cd*(1-0.04*(this.S.skills[s.id].l-1));};
P.bag=function(){return D.BAG[this.S.bagLvl-1];};
P.bagCap=function(){return this.bag().cap;};
P.storeCap=function(){return D.STORE[this.S.storeLvl-1].cap;};
P.pickMult=function(){return this.bag().pick*(1+this.eff('chance')+this.eff('pick'))*(this.skillOn('harvest')?this.skillPow('harvest'):1);};
P.tractOpen=function(t){return t===0||(t<D.TRACTS.length&&this.S.tracts[t-1].clears>0);};
P.dropChance=function(t,w){return Math.min(0.95,D.chance(w,this.S.tracts[t].clears>0)*this.pickMult());};
P.restBuffFor=function(hours){return Math.min(D.REST_BUFF_MAX,hours*D.REST_BUFF_PER_H);};
P.have=function(id){return id==='gold'?this.S.gold:id==='rep'?Math.floor(this.S.rep||0):(this.S.store[id]||0);};
P.canPay=function(cost){if(!cost)return false;for(var k in cost)if(this.have(k)<cost[k])return false;return true;};
P.pay=function(cost){if(!this.canPay(cost))return false;for(var k in cost){if(k==='gold')this.S.gold-=cost[k];else if(k==='rep')this.S.rep-=cost[k];else this.S.store[k]-=cost[k];}return true;};
P.refund=function(cost){for(var k in cost){if(k==='gold')this.S.gold+=cost[k];else if(k==='rep')this.S.rep+=cost[k];else this.S.store[k]=this.have(k)+cost[k];}};

/* ── опыт ── */
P.addXp=function(n){
  var S=this.S;S.xp+=n;
  if(this.rep)this.rep.xp+=n;
  while(S.xp>=D.xpNeed(S.mlvl)){
    S.xp-=D.xpNeed(S.mlvl);S.mlvl++;
    var self=this;
    D.SKILLS.forEach(function(s){if(s.unlock===S.mlvl)self.emit('unlock',s.id);});
    this.emit('levelUp',S.mlvl);
  }
};

/* ── план походов ── */
P.nextTract=function(){
  var S=this.S,p=S.plan;
  while(p.i<D.TRACTS.length){
    if(p.c[p.i]>p.done&&this.tractOpen(p.i)){p.done++;return p.i;}
    p.i++;p.done=0;
  }
  return this.tractOpen(S.lastTract)?S.lastTract:0;
};
P.setPlan=function(t,n){
  var p=this.S.plan;p.c[t]=Math.max(0,Math.min(9,n|0));p.i=0;p.done=0;
  for(var i=D.TRACTS.length-1;i>=0;i--)if(p.c[i]>0){this.S.lastTract=i;break;}
  this.emit('plan');
};
P.planLeft=function(){var p=this.S.plan,n=0;for(var i=0;i<p.c.length;i++)n+=i<p.i?0:i===p.i?Math.max(0,p.c[i]-p.done):p.c[i];return n;};
/* "Идти сюда": сразу этот тракт, план не трогаем */
P.goTo=function(t){
  var S=this.S;if(!this.tractOpen(t))return false;
  S.lastTract=t;
  if(S.place==='road'){
    if(S.trip&&S.trip.t===t)return true;
    if(this.inBoss())return false;
    S.forceNext=t;this.returnHome('manual');return true;
  }
  if(S.place==='sleep')S.sleepAfter=false;
  S.forceNext=t;this.startTrip();return true;
};

/* ── поход ── */
P.startTrip=function(){
  var S=this.S,R=this.R;
  /* поход на паузе (маг заходил в таверну): продолжаем с той же волны */
  if(S.trip&&S.trip.paused){
    if(S.forceNext===null||S.forceNext===undefined||S.forceNext===S.trip.t){
      S.trip.paused=false;S.trip.manual=false;S.forceNext=null;S.sleepAfter=false;
      if(S.charge>0){S.rested=Math.max(S.rested,this.restBuffFor(S.charge));S.charge=0;if(S.rested>0)this.emit('rested',S.rested);}
      S.place='road';R.after=null;
      this.emit('place','road');this.emit('tripResume',S.trip);
      this.spawn();return;
    }
    S.trip=null;
  }
  var t=S.forceNext!==null&&S.forceNext!==undefined&&this.tractOpen(S.forceNext)?S.forceNext:this.nextTract();
  S.forceNext=null;S.lastTract=t;S.sleepAfter=false;
  S.trip={t:t,w:1,m:0,boss:false,done:false,bag:{},n:0,kills:0,bosses:0,best:0,time:0,at:Date.now(),buff:{},drank:[]};
  /* зелья с собой: по одному каждого отмеченного, лучшего качества */
  var self=this;
  D.GOODS.forEach(function(gd){
    if((gd.kind!=='potion'&&gd.kind!=='scroll')||!S.use[gd.id]||self.isLocked(gd.id))return;
    var q=self.invTakeFree(gd.id,true);if(q<0)return;
    for(var k in gd.eff)S.trip.buff[k]=(S.trip.buff[k]||0)+gd.eff[k]*D.QUAL[q];
    S.trip.drank.push(gd.id);
  });
  if(S.charge>0){S.rested=Math.max(S.rested,this.restBuffFor(S.charge));S.charge=0;if(S.rested>0)this.emit('rested',S.rested);}
  S.place='road';S.stats.trips++;
  if(this.rep)this.rep.trips++;
  R.after=null;
  this.emit('place','road');
  this.emit('tripStart',S.trip);
  this.spawn();
};
P.makeEnemy=function(){
  var tr=this.S.trip,T=D.TRACTS[tr.t],RO=D.ROSTER[tr.t]||{mobs:{},elite:{},boss:{}};
  if(tr.boss){
    var hp=D.bossHp(tr.t,tr.w),role=D.bossRole(tr.w);
    return {L:tr.w,hp:hp,max:hp,boss:true,role:role,v:RO.boss[role],type:T.boss.type,cols:T.boss.cols,res:T.rare,biome:T.biome,t:tr.t,
      name:role==='main'?'boss.'+T.id:'bs.'+T.id+'.'+role};
  }
  var res=T.res[Math.floor(Math.random()*T.res.length)],mon=D.MON[res],mhp=D.mobHp(tr.t,tr.w);
  var list=RO.mobs[res]||[],elite=Math.random()<D.eliteChance(tr.w),v=elite&&RO.elite[res]?RO.elite[res]:list[Math.floor(Math.random()*list.length)];
  if(elite)mhp*=D.ELITE_HP;
  return {L:tr.w,hp:mhp,max:mhp,boss:false,elite:elite,v:v,type:mon.type,cols:mon.cols,res:res,biome:T.biome,t:tr.t,name:v?'mv.'+v:'mon.'+res};
};
P.spawn=function(){
  var R=this.R,tr=this.S.trip;
  R.enemy=this.makeEnemy();
  R.hits.length=0;R.staffT=0;
  R.phase='walk';R.t=D.WALK_TIME+(tr.m===0&&!tr.boss&&tr.w>1?D.WAVE_PAUSE:0);
  this.emit('spawn',R.enemy);
};
/* перед следующим врагом: не пора ли домой */
P.preCheck=function(){
  var S=this.S,tr=S.trip;
  if(!tr)return 'manual';
  if(tr.done)return 'end';
  if(S.fatigue>=1)return 'tired';
  if(tr.n>=this.bagCap())return 'full';
  if(tr.boss&&!this.predictBoss().win)return 'cautious';
  return null;
};
/* расчёт боя с боссом по текущей силе (без кликов) */
P.predictBoss=function(){
  var tr=this.S.trip;if(!tr)return {win:true,T:0,dmg:0,hp:this.maxHp()};
  var T=D.bossHp(tr.t,tr.w)/Math.max(1e-9,this.effDps()),bd=D.bossDps(tr.t,tr.w);
  var dmg=bd*(Math.min(T,D.RAGE_T)+D.RAGE_MULT*Math.max(0,T-D.RAGE_T)),hp=this.maxHp();
  return {win:dmg<hp*0.97,T:T,dmg:dmg,hp:hp};
};
P.inBoss=function(){var R=this.R;return !!(this.S.place==='road'&&R.enemy&&R.enemy.boss&&(R.phase==='fight'||R.phase==='walk'));};

P.bagAdd=function(res,n){
  var tr=this.S.trip;tr.bag[res]=(tr.bag[res]||0)+n;tr.n+=n;
  this.emit('loot',{res:res,n:n});
};
P.applyKill=function(e){
  var S=this.S,tr=S.trip,T=D.TRACTS[tr.t];
  S.stats.kills++;tr.kills++;
  if(this.rep)this.rep.kills++;
  this.addXp(D.xpMob(tr.t,tr.w)*(e.boss?D.XP_BOSS:e.elite?D.ELITE_HP:1));
  if(!e.boss){
    if(e.elite){this.bagAdd(e.res,1);if(Math.random()<this.dropChance(tr.t,tr.w))this.bagAdd(e.res,1);}
    else if(Math.random()<this.dropChance(tr.t,tr.w))this.bagAdd(e.res,1);
    tr.m++;
    if(tr.m>=D.MOBS){
      tr.m=0;tr.best=tr.w;
      if(tr.w>S.tracts[tr.t].best)S.tracts[tr.t].best=tr.w;
      if(D.isBossWave(tr.w))tr.boss=true;else tr.w++;
      this.emit('wave',tr.w);
    }
  }else{
    var k=tr.w/10;
    this.bagAdd(T.rare,k);
    for(var i=0;i<2*k;i++)this.bagAdd(T.res[Math.floor(Math.random()*T.res.length)],1);
    S.stats.bosses++;tr.bosses++;tr.boss=false;
    if(this.rep)this.rep.bosses++;
    var first=false;
    if(tr.w>=D.WAVES){tr.done=true;first=S.tracts[tr.t].clears===0;S.tracts[tr.t].clears++;this.petFind(tr.t);}
    else tr.w++;
    this.emit('bossWin',{t:tr.t,w:e.L,k:k,clear:tr.done,first:first});
    if(first&&tr.t+1<D.TRACTS.length)this.emit('tractOpen',tr.t+1);
  }
};
/* возвращение домой; при поражении сумка пропадает */
P.returnHome=function(why){
  var S=this.S,R=this.R,tr=S.trip;
  var got={},lost=0,over=0,n=0;
  if(tr){
    /* оберег сумки: при поражении сгорает и сохраняет половину */
    var ward=why==='defeat'&&S.use.p_ward&&!this.isLocked('p_ward')&&this.invTakeFree('p_ward',false)>=0;
    for(var k in tr.bag){
      var v=tr.bag[k];if(!v)continue;
      if(why==='defeat'){
        if(!ward){lost+=v;continue;}
        var keep=Math.ceil(v/2);lost+=v-keep;v=keep;
      }
      var room=Math.max(0,this.storeCap()-this.have(k)),put=Math.min(room,v);
      S.store[k]=this.have(k)+put;over+=v-put;n+=put;
      if(put)got[k]=put;
    }
    S.journal.unshift({t:tr.t,w:tr.best,why:why,got:got,n:n,lost:lost,over:over,dur:tr.time,at:Date.now(),ward:ward||undefined});
    if(S.journal.length>30)S.journal.length=30;
    if(why==='defeat'){S.stats.lostBags++;S.stats.lostItems+=lost;}
    S.stats.gathered+=n;
    if(this.rep){
      for(var g in got)this.rep.got[g]=(this.rep.got[g]||0)+got[g];
      this.rep.lost+=lost;this.rep.over+=over;if(why==='defeat')this.rep.lostBags++;
    }
  }
  S.trip=null;S.place='home';
  R.phase='home';R.enemy=null;R.hits.length=0;R.after=null;R.homeT=D.HOME_TIME;
  this.emit('home',{why:why,got:got,n:n,lost:lost,over:over});
  this.emit('place','home');
};
/* сумку на склад, без потерь */
P.deposit=function(bag){
  var S=this.S,got={},over=0,n=0;
  for(var k in bag){
    var v=bag[k];if(!v)continue;
    var room=Math.max(0,this.storeCap()-this.have(k)),put=Math.min(room,v);
    S.store[k]=this.have(k)+put;over+=v-put;n+=put;if(put)got[k]=put;
  }
  S.stats.gathered+=n;
  if(this.rep){for(var g in got)this.rep.got[g]=(this.rep.got[g]||0)+got[g];this.rep.over+=over;}
  return {got:got,n:n,over:over};
};
/* маг заходит в таверну: сумка на склад, поход на паузе и потом продолжится с той же волны.
   manual - игрок сам позвал (тогда маг ждёт игрока), иначе устал и после сна пойдёт дальше сам */
P.pauseTrip=function(manual){
  var S=this.S,R=this.R,tr=S.trip;
  if(S.place!=='road'||!tr||this.inBoss())return false;
  var r=this.deposit(tr.bag);tr.bag={};tr.n=0;
  if(r.n||r.over){S.journal.unshift({t:tr.t,w:tr.w,why:manual?'pause':'tired',got:r.got,n:r.n,lost:0,over:r.over,dur:tr.time,at:Date.now()});if(S.journal.length>30)S.journal.length=30;}
  tr.paused=true;tr.manual=!!manual;tr.m=Math.min(tr.m,D.MOBS-1);
  S.place='home';
  R.phase='home';R.enemy=null;R.hits.length=0;R.after=null;R.homeT=manual?0:D.HOME_TIME;
  this.emit('home',{why:manual?'pause':'tired',got:r.got,n:r.n,lost:0,over:r.over});
  this.emit('place','home');
  return true;
};
P.goHome=function(){
  if(this.S.place!=='road'||this.inBoss())return false;
  return this.pauseTrip(true);
};
P.sleepNow=function(){
  var S=this.S;
  if(S.place==='sleep')return false;
  if(S.place==='road'){if(this.inBoss())return false;S.sleepAfter=true;this.pauseTrip(true);this.homeDecide();return true;}
  this.sleep();return true;
};
P.sleep=function(){var S=this.S;S.place='sleep';S.sleepAfter=false;this.R.phase='sleep';this.emit('place','sleep');};
P.goTrip=function(){var S=this.S;if(S.place==='road')return false;S.sleepAfter=false;this.startTrip();return true;};
P.setCautious=function(){this.S.cautious=true;};   // v13: осторожность всегда включена, в меню её нет
P.setAuto=function(on){this.S.auto=!!on;};

/* после возвращения: спать или в новый поход */
P.homeDecide=function(){
  var S=this.S;
  if(S.sleepAfter||S.fatigue>=0.999){this.sleep();return;}
  /* позвали в таверну руками: ждёт игрока; если игрока нет дольше D.PAUSE_AWAY, идёт дальше сам */
  if(S.trip&&S.trip.paused&&S.trip.manual&&(!this.rep||this.rep.sec<D.PAUSE_AWAY))return;
  if(S.auto||(S.trip&&S.trip.paused))this.startTrip();
};

/* ── бой онлайн ── */
P.start=function(){
  var S=this.S,R=this.R;
  if(S.place==='road'&&S.trip)this.spawn();
  else if(S.place==='road'){S.place='home';R.phase='home';R.homeT=1;}
  else{R.phase=S.place;R.enemy=null;R.homeT=S.place==='home'?1:0;}
  this.emit('place',S.place);
};
P.roll=function(base){var crit=Math.random()<this.critChance();return {dmg:crit?base*this.critMult():base,crit:crit};};
P.fireStaff=function(){
  var per=this.rawDps()*this.dmgMult()/D.STAFF_RATE;
  if(per<=0)return;
  var r=this.roll(per);
  this.R.hits.push({t:0.32,dmg:r.dmg,crit:r.crit});
  this.emit('bolt',{kind:'staff',crit:r.crit});
};
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
  this.emit('hit',{dmg:h.dmg,crit:h.crit,click:!!h.click,big:!!h.big,pet:!!h.pet});
  if(e.hp<=0)this.kill();
};
P.kill=function(){
  var R=this.R,e=R.enemy;
  R.hits.length=0;
  this.applyKill(e);
  R.phase='dying';R.t=D.DEATH_TIME;
  this.emit('kill',{boss:e.boss,L:e.L,res:e.res});
};
P.bossFail=function(){
  var R=this.R,S=this.S;
  S.stats.bossFails++;
  R.hits.length=0;
  this.emit('bossFail',R.enemy);
  R.phase='dying';R.t=1.2;R.enemy=null;R.after='defeat';
};

/* ── усталость и сон ── */
P.updateFatigue=function(dt){
  var S=this.S,h=dt*this.fatigueScale/3600;
  if(S.place==='road'){
    S.fatigue=Math.min(1,S.fatigue+h/this.awakeH());
    if(S.fatigue>=1&&!this.inBoss()&&this.R.phase!=='dying')this.pauseTrip(false);
    if(S.rested>0){S.rested=Math.max(0,S.rested-dt);if(!S.rested)this.emit('restedEnd');}
  }else if(S.place==='sleep'){
    S.fatigue=Math.max(0,S.fatigue-h/this.restH());
    S.charge+=h;S.stats.rest+=dt;
    /* выспался: сразу в путь (продолжит поход с той же волны или начнёт новый) */
    if(S.fatigue<=0){S.fatigue=0;this.emit('wake');this.startTrip();}
  }
};

/* ── способности ── */
P.useSkill=function(id){
  var S=this.S,R=this.R,s=this.skillDef(id),st=S.skills[id];
  if(!s||!this.skillUnlocked(s)||st.cd>0||S.place!=='road')return false;
  if(R.phase!=='fight'&&R.phase!=='walk')return false;
  st.cd=this.skillCd(s);st.act=s.dur;
  if(id==='discharge'){
    var dmg=this.rawDps()*this.dmgMult()*this.skillPow('discharge');
    R.hits.push({t:(R.phase==='fight'?0:R.t)+0.45,dmg:dmg,crit:false,big:true});
  }
  this.emit('skill',id);
  return true;
};
P.skillUpCost=function(id){return D.skillPointCost(this.S.skills[id].l);};
P.buySkill=function(id){
  var s=this.skillDef(id),st=this.S.skills[id],c=this.skillUpCost(id);
  if(!this.skillUnlocked(s)||st.l>=D.SKILL_MAX||this.skillPoints()<c)return false;
  st.l++;this.S.spent+=c;this.emit('buy','skill');return true;
};

/* ── главный шаг ── */
P.update=function(dt){
  var S=this.S,R=this.R;
  if(!S.profile)return;
  R.clock+=dt;
  S.stats.play+=dt;
  for(var id in S.skills){var st=S.skills[id];if(st.cd>0)st.cd=Math.max(0,st.cd-dt);if(st.act>0){st.act=Math.max(0,st.act-dt);if(!st.act)this.emit('skillEnd',id);}}
  this.updateFatigue(dt);
  this.tavernTick(dt*this.fatigueScale);
  if(S.place==='home'){
    if(R.homeT>0){R.homeT-=dt;if(R.homeT<=0)this.homeDecide();}
    return;
  }
  if(S.place!=='road')return;
  if(S.trip)S.trip.time+=dt;
  switch(R.phase){
    case 'walk':
      R.t-=dt;
      if(R.t<=0){
        R.phase='fight';
        if(R.enemy&&R.enemy.boss){R.bossT=0;R.hitT=D.BOSS_HIT;R.wind=false;R.mhp=this.maxHp();this.emit('bossStart',R.enemy);}
        this.emit('fight',R.enemy);
      }
      break;
    case 'fight':
      R.staffT+=dt*this.staffRate();
      var guard=0;
      while(R.staffT>=1&&guard++<20){R.staffT-=1;this.fireStaff();}
      /* питомец: кусает через случайные 1-3 с (v21), урон за всё время с прошлого укуса (в среднем тот же урон в секунду);
         урон приходит, когда он добегает (0.45 с) */
      if(this.pets().active){
        if(R.petIv===undefined){R.petIv=D.PET_BITE_MIN+Math.random()*(D.PET_BITE_MAX-D.PET_BITE_MIN);R.petT=R.petIv*0.5;}
        R.petT-=dt;
        if(R.petT<=0){var iv=R.petIv;R.petIv=D.PET_BITE_MIN+Math.random()*(D.PET_BITE_MAX-D.PET_BITE_MIN);R.petT+=R.petIv;
          var pd=this.petDps()*iv,pr=pd>0?this.roll(pd):{dmg:0,crit:false};
          if(pd>0)R.hits.push({t:0.45,dmg:pr.dmg,crit:pr.crit,pet:true});
          this.emit('petBite',{crit:pr.crit,dmg:pr.dmg});}
      }
      if(R.enemy&&R.enemy.boss){
        R.bossT+=dt;R.hitT-=dt;
        if(R.hitT<=D.BOSS_WIND&&!R.wind&&R.enemy.hp>0){R.wind=true;this.emit('bossWind',{rage:R.bossT>D.RAGE_T});}
        if(R.hitT<=0&&R.enemy.hp>0){
          var tr=S.trip,dmg=D.bossDps(tr.t,tr.w)*D.BOSS_HIT*(R.bossT>D.RAGE_T?D.RAGE_MULT:1);
          R.hitT+=D.BOSS_HIT;R.wind=false;R.mhp=Math.max(0,R.mhp-dmg);
          this.emit('mageHit',{dmg:dmg,hp:R.mhp,max:this.maxHp(),rage:R.bossT>D.RAGE_T});
          if(R.mhp<=0){this.bossFail();return;}
        }
      }
      break;
    case 'dying':
      R.t-=dt;
      if(R.t<=0){
        if(R.after){this.returnHome(R.after);return;}
        var why=this.preCheck();
        if(why==='tired')this.pauseTrip(false);else if(why)this.returnHome(why);else this.spawn();
      }
      return;
  }
  for(var i=R.hits.length-1;i>=0;i--){
    var h=R.hits[i];h.t-=dt;
    if(h.t<=0){R.hits.splice(i,1);this.applyHit(h);if(R.phase!=='fight')break;}
  }
};

/* ── офлайн: те же правила, враг за врагом, время боя по среднему урону ── */
P.offline=function(sec){
  var S=this.S,rep={sec:sec,trips:0,got:{},lost:0,lostBags:0,over:0,kills:0,bosses:0,xp:0,lv0:S.mlvl,road:0,sleep:0,home:0,sold:0,gold:0,crafted:0,j0:S.journal.length?S.journal[0].at:0};
  if(!S.profile||sec<=0)return rep;
  sec=Math.min(sec,D.OFFLINE_MAX_H*3600);
  for(var id in S.skills){var st=S.skills[id];st.cd=Math.max(0,st.cd-sec);st.act=0;}
  this.silent=true;this.rep=rep;
  var t=0,guard=0,R=this.R;
  while(t<sec&&guard++<2e6){
    if(S.place==='road'){
      if(!S.trip){S.place='home';R.homeT=D.HOME_TIME;continue;}
      var why=this.preCheck();
      if(why==='tired'){this.pauseTrip(false);continue;}
      if(why){this.returnHome(why);continue;}
      var tr=S.trip,e=this.makeEnemy();
      var walk=D.WALK_TIME+(tr.m===0&&!tr.boss&&tr.w>1?D.WAVE_PAUSE:0);
      var dps=Math.max(1e-9,this.effDps()),fight=e.hp/dps,lose=false;
      if(e.boss){
        var pr=this.predictBoss();
        if(!pr.win){
          lose=true;
          var bd=D.bossDps(tr.t,tr.w),hp=pr.hp;
          fight=hp<=bd*D.RAGE_T?hp/bd:D.RAGE_T+(hp-bd*D.RAGE_T)/(bd*D.RAGE_MULT);
        }
      }
      var d=walk+fight+D.DEATH_TIME;
      if(t+d>sec){var rest=sec-t;S.fatigue=Math.min(1,S.fatigue+rest/3600/this.awakeH());rep.road+=rest;this.offTick(rest);t=sec;break;}
      t+=d;rep.road+=d;tr.time+=d;
      this.offTick(d);
      S.fatigue=Math.min(1,S.fatigue+d/3600/this.awakeH());
      if(S.rested>0)S.rested=Math.max(0,S.rested-d);
      if(lose){S.stats.bossFails++;this.returnHome('defeat');continue;}
      this.applyKill(e);
    }else if(S.place==='home'){
      var dh=Math.max(0.5,R.homeT||D.HOME_TIME);
      t+=dh;rep.home+=dh;R.homeT=0;this.offTick(dh);
      var before=S.place;this.homeDecide();
      if(S.place==='home'&&before==='home'){rep.home+=sec-t;this.offTick(sec-t);t=sec;}   // сам в поход не уходит: ждёт игрока
    }else{
      var need=S.fatigue*this.restH()*3600,ds=Math.min(need,sec-t);
      t+=ds;rep.sleep+=ds;S.stats.rest+=ds;this.offTick(ds);
      S.fatigue=Math.max(0,S.fatigue-ds/(this.restH()*3600));S.charge+=ds/3600;
      if(S.fatigue<=1e-9){S.fatigue=0;this.startTrip();}
    }
  }
  this.silent=false;this.rep=null;
  R.enemy=null;R.hits.length=0;R.after=null;
  return rep;
};

P.offTick=function(dt){while(dt>0){var st=Math.min(dt,300);this.tavernTick(st);dt-=st;}};

/* ── улучшения напрямую (для отладки и симулятора; в игре они идут заказом у мастера) ── */
P.staffCost=function(){return D.staffCost(this.S.staff);};
P.buyStaff=function(){if(!this.pay(this.staffCost()))return false;this.S.staff++;this.emit('buy','staff');return true;};
P.bagCost=function(){var b=D.BAG[this.S.bagLvl];return b?b.cost:null;};
P.buyBag=function(){var c=this.bagCost();if(!c||!this.pay(c))return false;this.S.bagLvl++;this.emit('buy','bag');return true;};
/* v27: склад улучшает бригада строителей: стеллажи в каменной комнате, с 4-го уровня в подвале */
P.storeCost=function(){var S=this.S,b=D.STORE[S.storeLvl];if(!b||S.storeBt||this.crewQueued('store'))return null;var c={gold:D.STORE_UP.gold(S.storeLvl)};for(var k in b.cost)c[k]=b.cost[k];return c;};
P.storeBlock=function(){var S=this.S;if(!D.STORE[S.storeLvl])return 'max';if(S.storeBt)return 'busy';if(this.crewQueued('store'))return 'queue';if(!this.canPay(this.storeCost()))return 'cost';return '';};
P.buyStore=function(){if(this.storeBlock())return false;this.pay(this.storeCost());this.crewQ().push('store');this.emit('invest',{kind:'store'});this.prodStartWaiting();return true;};

/* ════════ ТАВЕРНА ════════ */

/* ── изделия ── */
P.invCount=function(id){var n=0,S=this.S;for(var q=0;q<D.QUAL.length;q++)n+=S.inv[id+':'+q]||0;return n;};
P.invAdd=function(id,q,n){var k=id+':'+q;this.S.inv[k]=(this.S.inv[k]||0)+n;};
/* взять одну вещь: best - лучшего качества, иначе худшего; вернёт качество или -1 */
P.invTake=function(id,best){
  var S=this.S;
  for(var i=0;i<D.QUAL.length;i++){var q=best?D.QUAL.length-1-i:i,k=id+':'+q;if(S.inv[k]>0){S.inv[k]--;if(!S.inv[k])delete S.inv[k];return q;}}
  return -1;
};
P.equipItem=function(id){
  var S=this.S,gd=D.GOOD_BY[id];if(!gd||!gd.slot)return false;
  var q=this.invTake(id,true);if(q<0)return false;
  var old=S.equip[gd.slot];if(old)this.invAdd(old.id,old.q,1);
  S.equip[gd.slot]={id:id,q:q};this.emit('equip',gd.slot);return true;
};
P.unequip=function(slot){var S=this.S,it=S.equip[slot];if(!it)return false;this.invAdd(it.id,it.q,1);S.equip[slot]=null;this.emit('equip',slot);return true;};
P.setUse=function(id,on){this.S.use[id]=!!on;};

/* ── мастера и заказы ── */
/* маг тоже мастер: пишет свитки, когда он в таверне (не в походе и не спит) */
P.master=function(id){
  if(id!=='mage')return this.S.masters[id];
  var S=this.S;
  if(!S.mageCraft)S.mageCraft={done:{},coll:{}};
  return {hired:true,lvl:S.mlvl,xp:0,tools:0,teach:null,done:S.mageCraft.done,coll:S.mageCraft.coll,known:D.GOODS.filter(function(x){return x.m==='mage'&&x.lvl<=S.mlvl;}).map(function(x){return x.id;})};
};
P.canHire=function(id){return id!=='mage'&&!this.master(id).hired;};
P.hire=function(id){var d=D.MASTER_BY[id];if(!d||!this.canHire(id)||!this.pay({gold:d.hire}))return false;this.master(id).hired=true;this.giveShelf(D.MASTER_SHELF[id]);this.emit('hire',id);return true;};
P.mSpeed=function(id){var c=this.collDone(id);if(id==='mage')return D.MAGE_SPEED*(c?1.1:1);var m=this.master(id);return D.mSpeed(m.lvl,c);};
/* освоение: сколько копий вещи сделал этот мастер; время вещи с учётом освоения (без общей скорости мастера) */
P.mastery=function(mid,rid){var m=this.master(mid);return m&&m.done?(m.done[rid]||0):0;};
P.craftTime=function(mid,rid){var gd=D.GOOD_BY[rid];return gd?D.craftTime(gd,this.mastery(mid,rid))/(this.collQ(mid,rid,3)?D.COLL_LEG_SPEED:1):this.orderTime(rid);};
/* коллекция (v20): у каждой вещи 4 ячейки по качеству, m.coll[rid] - битовая маска (бит q).
   Старое значение 1 совпадает с маской "обычное". Страница вещи открыта, если есть хоть одна ячейка.
   Все страницы мастера открыты: +2% легендарного, +10% скорости, +10% к цене (как раньше).
   Ячейки дают бонус своей вещи: хорошее +3% безупречного, безупречное +1% легендарного,
   легендарное +10% к цене и скорости. Все 4 ячейки у всех вещей мастера ("золотая страница"): +1% легендарного всем его вещам. */
P.collList=function(mid){return D.GOODS.filter(function(x){return x.m===mid;}).map(function(x){return x.id;});};
P.collMask=function(mid,rid){var m=this.master(mid);return m&&m.coll?(m.coll[rid]|0):0;};
P.collQ=function(mid,rid,q){return !!(this.collMask(mid,rid)&(1<<q));};
P.collHas=function(mid,rid){return this.collMask(mid,rid)>0;};
P.collCount=function(mid){var self=this;return this.collList(mid).filter(function(r){return self.collHas(mid,r);}).length;};
P.collDone=function(mid){var l=this.collList(mid);return l.length>0&&this.collCount(mid)===l.length;};
P.collSlots=function(mid){var n=0,self=this;this.collList(mid).forEach(function(r){var k=self.collMask(mid,r);for(var q=0;q<4;q++)if(k&(1<<q))n++;});return n;};
P.collGold=function(mid){var l=this.collList(mid);return l.length>0&&this.collSlots(mid)===l.length*4;};
P.collAdd=function(rid,q){
  var gd=D.GOOD_BY[rid];if(!gd)return false;
  if(q===undefined||q===null){for(q=0;q<4;q++)if(!this.collQ(gd.m,rid,q)&&this.S.inv[rid+':'+q]>0)break;}
  q=q|0;
  var m=this.master(gd.m),k=rid+':'+q;
  if(!m||q<0||q>3||this.collQ(gd.m,rid,q)||!(this.S.inv[k]>0))return false;
  var page=this.collDone(gd.m),gold=this.collGold(gd.m);
  this.S.inv[k]--;if(!this.S.inv[k])delete this.S.inv[k];
  m.coll[rid]=this.collMask(gd.m,rid)|(1<<q);
  if(this.S.bookFree)delete this.S.bookFree[k];
  this.emit('coll',{m:gd.m,r:rid,q:q,done:!page&&this.collDone(gd.m),gold:!gold&&this.collGold(gd.m)});return true;
};
/* шансы качества для конкретной вещи */
P.qualChance=function(mid,rid){
  var ch=D.qualChance(this.toolsEff(mid),this.collDone(mid));
  if(rid&&D.GOOD_BY[rid]){
    if(this.collQ(mid,rid,1))ch[2]+=D.COLL_Q1;
    if(this.collQ(mid,rid,2))ch[3]+=D.COLL_Q2;
  }
  if(this.collGold(mid))ch[3]+=D.COLL_GOLD;
  return ch;
};
P.itemPriceMult=function(rid){
  var gd=D.GOOD_BY[rid];if(!gd)return 1;
  return (this.collDone(gd.m)?D.COLL_PRICE:1)*(this.collQ(gd.m,rid,3)?D.COLL_LEG_PRICE:1);
};
/* защита (v20): одна копия хорошего, безупречного или легендарного качества, которого нет в книге, "нужна для книги" (если игрок не снял пометку);
   вещь с замком хозяйка не продаёт и маг не берёт в поход. */
P.bookNeed=function(rid,q){
  var gd=D.GOOD_BY[rid];if(!gd||q<1||this.collQ(gd.m,rid,q))return false;   /* обычных копий много, их не держим */
  return !(this.S.bookFree&&this.S.bookFree[rid+':'+q]);
};
P.freeCount=function(rid,q){var n=this.S.inv[rid+':'+q]||0;return Math.max(0,n-(n>0&&this.bookNeed(rid,q)?1:0));};
P.freeTotal=function(rid){var n=0;for(var q=0;q<D.QUAL.length;q++)n+=this.freeCount(rid,q);return n;};
P.setBookFree=function(rid,q,on){var S=this.S;if(!S.bookFree)S.bookFree={};var k=rid+':'+q;if(on)S.bookFree[k]=1;else delete S.bookFree[k];};
P.isLocked=function(rid){return !!(this.S.locked&&this.S.locked[rid]);};
P.toggleLock=function(rid){var S=this.S;if(!S.locked)S.locked={};if(S.locked[rid])delete S.locked[rid];else S.locked[rid]=1;this.emit('lock',rid);return !!S.locked[rid];};
/* взять свободную копию (не нужную книге): best - лучшую, иначе худшую */
P.invTakeFree=function(id,best){
  var S=this.S;
  for(var i=0;i<D.QUAL.length;i++){var q=best?D.QUAL.length-1-i:i,k=id+':'+q;if(this.freeCount(id,q)>0){S.inv[k]--;if(!S.inv[k])delete S.inv[k];return q;}}
  return -1;
};
P.orderCost=function(rid){
  var S=this.S;
  function withGold(c,g){if(!c)return null;var o={gold:g};for(var k in c)o[k]=c[k];return o;}
  if(rid==='staff')return withGold(D.staffCost(S.staff),D.ORDERS.staff.gold(S.staff));
  if(rid==='bag')return D.BAG[S.bagLvl]?withGold(D.BAG[S.bagLvl].cost,D.ORDERS.bag.gold(S.bagLvl)):null;
  var gd=D.GOOD_BY[rid];return gd?gd.cost:null;
};
P.orderTime=function(rid){
  var S=this.S;
  if(rid==='staff')return D.ORDERS.staff.time(S.staff);
  if(rid==='bag')return D.ORDERS.bag.time(S.bagLvl);
  return D.GOOD_BY[rid].time;
};
P.pending=function(rid){var q=this.S.queue;for(var i=0;i<q.length;i++)if(q[i].r===rid)return true;return false;};
P.queueOf=function(mid){return this.S.queue.filter(function(o){return o.m===mid;});};
/* может ли мастер сейчас работать */
P.canWork=function(mid){
  if(mid==='mage')return this.S.place==='home';
  var m=this.master(mid);return !!(m&&m.hired&&!m.teach);
};
/* какие заказы очереди сейчас в работе: у каждого мастера первая его вещь */
P.activeSet=function(){
  var q=this.S.queue,seen={},act={};
  for(var i=0;i<q.length;i++){var mid=q[i].m;if(seen[mid])continue;seen[mid]=true;if(this.canWork(mid))act[i]=true;}
  return act;
};
/* почему нельзя заказать: '' если можно */
P.orderBlock=function(mid,rid){
  var m=this.master(mid);
  if(!m)return 'no';
  if(!m.hired)return 'hire';
  if(m.teach)return 'teaching';
  if(this.S.queue.length>=this.S.qSlots)return 'full';
  if(D.ORDERS[rid]){if(D.ORDERS[rid].m!==mid)return 'no';if(this.pending(rid))return 'pending';if(!this.orderCost(rid))return 'max';}
  else if(m.known.indexOf(rid)<0)return 'unknown';
  if(!this.canPay(this.orderCost(rid)))return 'cost';
  return '';
};
P.order=function(mid,rid){
  if(this.orderBlock(mid,rid))return false;
  var c=this.orderCost(rid),T=this.craftTime(mid,rid);
  this.pay(c);
  this.S.queue.push({r:rid,m:mid,t:T,T:T,c:JSON.parse(JSON.stringify(c))});
  if(D.GOOD_BY[rid])this.noteRecent(rid);
  this.emit('order',{m:mid,r:rid});return true;
};
/* v18: последние 10 разных вещей, что заказывали; закреплённые остаются наверху */
P.noteRecent=function(rid){var a=this.S.recent||(this.S.recent=[]),i=a.indexOf(rid);if(i>=0)a.splice(i,1);a.unshift(rid);if(a.length>10)a.length=10;};
P.isPinned=function(rid){return (this.S.pinned||[]).indexOf(rid)>=0;};
P.togglePin=function(rid){var a=this.S.pinned||(this.S.pinned=[]),i=a.indexOf(rid);if(i>=0)a.splice(i,1);else if(D.GOOD_BY[rid]&&a.length<16)a.push(rid);else return false;this.emit('pin',rid);return true;};
/* отмена по номеру в общей очереди: ресурсы и золото возвращаются */
P.cancel=function(i){var q=this.S.queue,o=q[i];if(!o)return false;this.refund(o.c);q.splice(i,1);this.emit('order',{m:o.m});return true;};
/* инструменты: та же схема вкладов, мастер делает инструмент сам (без бригады), последний вклад с материалами */
P.toolsCost=function(mid){
  var m=this.master(mid),d=D.MASTER_BY[mid];
  if(!d||!m.hired||m.tools>=D.TOOLS_MAX||m.tbt||m.tst>=D.STAGES)return null;
  var c={gold:D.stageCost(D.TOOLS_C0,m.tools,m.tst)};
  if(m.tst===D.STAGES-1){var r=D.toolsRes(d,m.tools);for(var k in r)c[k]=r[k];}
  return c;
};
P.buyTools=function(mid){
  var c=this.toolsCost(mid),m=this.master(mid);if(!c||!this.pay(c))return false;
  m.tst++;
  if(m.tst>=D.STAGES)this.toolsTryStart(mid);
  this.emit('invest',{kind:'tools',id:mid});return true;
};
/* v20: доля мастера. С каждой продажи его вещи мастер откладывает D.MASTER_SHARE цены (у игрока ничего не забирается).
   Новый инструмент мастер начинает делать, когда игрок сделал 20 вкладов и у мастера накоплена его часть. */
P.toolsPart=function(mid){var m=this.master(mid);return m&&m.tools<D.TOOLS_MAX?D.masterPart(m.tools):0;};
P.toolsTryStart=function(mid){
  var m=this.master(mid);if(!m||m.tbt||m.tst<D.STAGES||m.tools>=D.TOOLS_MAX)return false;
  var part=this.toolsPart(mid);if((m.sav||0)<part)return false;
  m.sav-=part;var T=D.stageTime(m.tools);m.tbt={t:T,T:T};
  this.emit('toolsStart',{id:mid});return true;
};
P.masterIncome=function(rid,price){
  var gd=D.GOOD_BY[rid];if(!gd||gd.m==='mage')return;
  var m=this.S.masters[gd.m];if(!m)return;
  var v=price*D.MASTER_SHARE;m.sav=(m.sav||0)+v;m.inc=(m.inc||0)+v;
};
P.toolsEff=function(mid){var m=this.master(mid);return m?(m.tools||0)+D.STAGE_STEP*(m.tst||0):0;};
P.qSlotCost=function(){var n=this.S.qSlots;return n>=D.QSLOTS_MAX?null:D.qSlotCost(n);};
P.buyQSlot=function(){var c=this.qSlotCost();if(!c||!this.pay(c))return false;this.S.qSlots++;this.emit('buy','slot');return true;};
/* учитель: рецепт за золото, когда мастер дорос до уровня рецепта */
P.canLearn=function(rid){var gd=D.GOOD_BY[rid];if(!gd||gd.m==='mage')return false;var m=this.master(gd.m);return m.hired&&!m.teach&&m.known.indexOf(rid)<0&&m.lvl>=gd.lvl;};
/* учитель приходит и учит какое-то время; заказы мастера в это время стоят */
P.learn=function(rid){
  var gd=D.GOOD_BY[rid];if(!this.canLearn(rid)||!this.pay({gold:gd.teach}))return false;
  var T=D.teachTime(gd.lvl);this.master(gd.m).teach={r:rid,t:T,T:T};
  this.emit('teachStart',rid);return true;
};
P.rollQual=function(mid,rid){
  var ch=this.qualChance(mid,rid),r=Math.random();
  for(var q=D.QUAL.length-1;q>0;q--){if(r<ch[q])return q;r-=ch[q];}
  return 0;
};
/* опыт мага за свиток: доля уровня, но не выше уровня свитка + 5 */
P.scrollXp=function(rid){var gd=D.GOOD_BY[rid];return Math.ceil(D.xpNeed(Math.min(this.S.mlvl,gd.lvl+5))*(gd.xp||0));};
P.finishOrder=function(mid,o){
  var S=this.S,q=-1;
  if(o.r==='staff'){S.staff++;this.emit('buy','staff');}
  else if(o.r==='bag'){S.bagLvl++;this.emit('buy','bag');}
  else{q=o.q!==undefined?o.q:this.rollQual(mid,o.r);this.invAdd(o.r,q,1);S.stats.crafted++;if(this.rep){this.rep.crafted++;if(q===3)this.rep.legend=(this.rep.legend||0)+1;}
    if(q===3)this.emit('legend',{m:mid,r:o.r});
    var mm=this.master(mid);if(mm&&mm.done)mm.done[o.r]=(mm.done[o.r]||0)+1;
    /* v26: сразу на полку своего вида, если там есть место (копия для книги и вещь с замком остаются на складе) */
    if(!this.shelfPut(o.r,q,1)&&!this.shelfCap(D.shelfCat(o.r)))this.emit('noShelf',D.shelfCat(o.r));}
  if(mid==='mage')this.addXp(this.scrollXp(o.r));
  else{
    var m=this.master(mid);m.xp+=o.T/10;
    while(m.xp>=D.mXpNeed(m.lvl)){m.xp-=D.mXpNeed(m.lvl);m.lvl++;this.emit('mLevel',{m:mid,lvl:m.lvl});}
  }
  this.emit('crafted',{m:mid,r:o.r,q:q});
};
P.tickMasters=function(dt){
  var S=this.S,ids=Object.keys(S.masters).concat(['mage']);
  for(var n=0;n<ids.length;n++){
    var id=ids[n],m=this.master(id);if(!m.hired)continue;
    if(m.teach){
      m.teach.t-=dt;
      if(m.teach.t>0)continue;
      var rid=m.teach.r;m.teach=null;if(m.known.indexOf(rid)<0)m.known.push(rid);this.emit('learn',rid);
      continue;
    }
    if(!this.canWork(id))continue;
    var left=dt*this.mSpeed(id),guard=0;
    while(left>0&&guard++<500){
      var q=S.queue,k=-1;
      for(var i=0;i<q.length;i++)if(q[i].m===id){k=i;break;}
      if(k<0)break;
      var o=q[k];
      if(o.t>left){o.t-=left;left=0;}
      else{
        /* v27: вещь готова, но класть некуда: мастер ждёт, пока освободится место */
        if(D.GOOD_BY[o.r]){if(o.q===undefined)o.q=this.rollQual(id,o.r);
          if(!this.canAccept(o.r,o.q)){left=0;o.t=0;if(!o.hold){o.hold=true;this.emit('storeFull',{m:id,r:o.r});}break;}}
        left-=o.t;q.splice(k,1);this.finishOrder(id,o);}
    }
  }
};

/* ── постройки ── */
P.buildLvl=function(id){return this.S.build[id]||0;};
P.buildCost=function(id){var b=D.BUILD[id],l=this.buildLvl(id);if(b.once?l>0:l>=b.max)return null;return b.cost(l);};
P.buildUp=function(id){var c=this.buildCost(id);if(!c||!this.pay(c))return false;this.S.build[id]=this.buildLvl(id)+1;this.emit('build',id);return true;};

/* ════════ ПРОМЫСЛЫ И СТАДИИ (v15) ════════ */
P.prod=function(id){var S=this.S;if(!S.prod)S.prod=prodDefaults();return S.prod[id];};
P.prodDef=function(id){return id==='stable'?D.STABLE:D.PROD_BY[id];};
P.prodMax=function(id){return id==='stable'?D.STABLE.max:D.PROD_MAX;};
/* уровень с учётом вкладов: 3 уровень и 7 вкладов = 3.07 */
P.prodEff=function(id){var o=this.prod(id);return o.lvl?o.lvl+D.STAGE_STEP*o.st:0;};
P.lineOpen=function(r){return this.tractOpen(D.resTract(r));};
P.lineRate=function(id,r,eff){if(!this.lineOpen(r))return 0;return D.PROD_BASE[r]*(eff===undefined?this.prodEff(id):eff);};   // в час
P.lineCap=function(id,r){return Math.max(10,Math.ceil(D.PROD_BASE[r]*Math.max(1,this.prod(id).lvl)*D.PROD_KEEP));};
P.crewsBusy=function(){var n=0,S=this.S;for(var id in S.prod)if(S.prod[id].bt)n++;(S.furn||[]).forEach(function(it){if(it.bt)n++;});if(S.storeBt)n++;return n;};
P.crewFree=function(){return this.crewsBusy()<(this.S.crews||1);};
P.crewCost=function(){var n=this.S.crews||1;return n>=D.CREW_COST.length?null:{gold:D.CREW_COST[n]};};
P.buyCrew=function(){var c=this.crewCost();if(!c||!this.pay(c))return false;this.S.crews=(this.S.crews||1)+1;this.emit('crew',this.S.crews);this.prodStartWaiting();return true;};
/* можно ли поставить здание: '' или причина */
P.prodBuildBlock=function(id){
  var o=this.prod(id),d=this.prodDef(id);
  if(o.lvl>0||o.bt)return 'built';
  if(d.tract!==undefined&&!this.tractOpen(d.tract))return 'tract';
  if(this.crewQueued(id))return 'built';
  if(!this.canPay(d.build))return 'cost';
  return '';
};
P.prodBuild=function(id){
  if(this.prodBuildBlock(id))return false;
  this.pay(this.prodDef(id).build);this.prod(id).st=0;
  this.crewQ().push(id);this.emit('invest',{kind:'prod',id:id});
  this.prodStartWaiting();return true;
};
/* следующий вклад: null, если строится, уровень максимальный или 20 вкладов уже сделаны */
P.prodCost=function(id){
  var o=this.prod(id);if(!o.lvl||o.bt||o.lvl>=this.prodMax(id)||o.st>=D.STAGES)return null;
  return {gold:D.stageCost(this.prodDef(id).c0,o.lvl-1,o.st)};
};
/* сколько стоят все оставшиеся вклады до стройки */
P.prodCostLeft=function(id){var o=this.prod(id),c0=this.prodDef(id).c0,s=0;for(var i=o.st;i<D.STAGES;i++)s+=D.stageCost(c0,o.lvl-1,i);return s;};
P.prodInvest=function(id){
  var c=this.prodCost(id);if(!c||!this.pay(c))return false;
  var o=this.prod(id);o.st++;
  this.emit('invest',{kind:'prod',id:id});
  if(o.st>=D.STAGES){this.crewQ().push(id);this.prodStartWaiting();}
  return true;
};
/* очередь к бригадам: новая постройка или здание с 20 вкладами, по порядку */
P.crewQ=function(){var S=this.S;if(!S.crewQ)S.crewQ=[];return S.crewQ;};
P.crewQueued=function(id){return this.crewQ().indexOf(id)>=0;};
P.prodStartWaiting=function(){
  var q=this.crewQ();
  while(q.length&&this.crewFree()){
    var id=q.shift();
    if(id==='store'){if(this.S.storeBt)continue;var Ts=D.STORE_UP.time(this.S.storeLvl);this.S.storeBt={t:Ts,T:Ts};this.emit('stage',{kind:'store'});continue;}
    if(String(id).slice(0,2)==='f:'){   /* v25: стол ставит та же бригада */
      var it=this.furnById(+id.slice(2));if(!it||it.bt||!it.q)continue;
      var Tf=D.FURN[it.t].bt[it.lv-1];delete it.q;it.bt={t:Tf,T:Tf};this.emit('stage',{kind:'furn',id:it.id,lvl:it.lv});continue;
    }
    var o=this.prod(id);if(!o||o.bt)continue;
    var T=D.stageTime(o.lvl);o.bt={t:T,T:T};this.emit('stage',{kind:'prod',id:id,lvl:o.lvl});
  }
};
P.prodWaiting=function(id){return this.crewQueued(id);};
/* интервал возчика в минутах: между уровнями плавно по вкладам */
P.cartEvery=function(){
  var o=this.prod('stable');if(!o.lvl)return 0;
  var e=D.STABLE.every,a=e[o.lvl-1],b=e[Math.min(o.lvl,e.length-1)];
  return a-(a-b)*D.STAGE_STEP*o.st;
};
P.prodCollect=function(id,quiet){
  var o=this.prod(id),got={},n=0;
  for(var r in o.acc){
    var k=Math.min(Math.floor(o.acc[r]),Math.max(0,this.storeCap()-this.have(r)));
    if(k<=0)continue;
    this.S.store[r]=this.have(r)+k;o.acc[r]-=k;got[r]=k;n+=k;
  }
  if(n&&this.rep){var rp=this.rep.prod=this.rep.prod||{};for(var g in got)rp[g]=(rp[g]||0)+got[g];}
  if(n&&!quiet)this.emit('prodGot',{id:id,got:got,n:n});
  return got;
};
P.prodCollectAll=function(quiet){
  var all={},n=0,self=this;
  D.PROD.forEach(function(d){var g=self.prodCollect(d.id,true);for(var r in g){all[r]=(all[r]||0)+g[r];n+=g[r];}});
  if(n&&!quiet)this.emit('prodGot',{id:'all',got:all,n:n});
  return {got:all,n:n};
};
P.prodFull=function(id){var o=this.prod(id),self=this;return this.prodDef(id).lines.some(function(r){return self.lineOpen(r)&&(o.acc[r]||0)>=self.lineCap(id,r);});};
P.prodHas=function(id){var o=this.prod(id);for(var r in o.acc)if(o.acc[r]>=1)return true;return false;};
P.tickProd=function(dt){
  var S=this.S,self=this;if(!S.prod)S.prod=prodDefaults();
  /* стройки */
  for(var id in S.prod){
    var o=S.prod[id];if(!o.bt)continue;
    o.bt.t-=dt;if(o.bt.t>0)continue;
    o.bt=null;o.lvl++;o.st=0;
    this.emit('built',{kind:'prod',id:id,lvl:o.lvl});
    this.prodStartWaiting();
  }
  /* добыча */
  D.PROD.forEach(function(d){
    var o=S.prod[d.id];if(!o.lvl)return;
    var eff=self.prodEff(d.id);
    d.lines.forEach(function(r){
      var rt=self.lineRate(d.id,r,eff);if(!rt)return;
      o.acc[r]=Math.min(self.lineCap(d.id,r),(o.acc[r]||0)+rt*dt/3600);
    });
  });
  /* возчик */
  var st=S.prod.stable;
  if(st.lvl){st.cart=(st.cart||0)+dt;var ev=this.cartEvery()*60;if(st.cart>=ev){st.cart=0;var r=this.prodCollectAll(true);if(r.n)this.emit('cart',r);}}
  /* инструменты мастеров */
  for(var mid in S.masters){
    var m=S.masters[mid];
    if(!m.tbt){if(m.tst>=D.STAGES)this.toolsTryStart(mid);continue;}
    m.tbt.t-=dt;if(m.tbt.t>0)continue;
    m.tbt=null;m.tools=Math.min(D.TOOLS_MAX,m.tools+1);m.tst=0;
    this.emit('built',{kind:'tools',id:mid,lvl:m.tools});
  }
};
/* подпись над зданием: уровень и сколько процентов до следующего (вклады), или стройка */
P.prodLabel=function(id){
  var o=this.prod(id);
  if(o.bt)return {lvl:o.lvl,build:true,left:o.bt.t,k:1-o.bt.t/o.bt.T};
  return {lvl:o.lvl,build:false,k:o.st/D.STAGES,max:o.lvl>=this.prodMax(id),wait:this.prodWaiting(id)};
};

/* ── покупатели ── */
P.isOpen=function(){return this.S.place!=='sleep';};
P.knownGoods=function(){
  var S=this.S,out=[];
  for(var id in S.masters){var m=S.masters[id];if(m.hired)m.known.forEach(function(r){out.push(r);});}
  this.master('mage').known.forEach(function(r){out.push(r);});
  return out;
};
P.spawnCustomer=function(){
  var S=this.S,known=this.knownGoods(),self=this;if(!known.length)return;
  /* v26: путник просит то, что лежит на полках; полки пустые - что-нибудь из известного (подождёт и уйдёт) */
  var stock=known.filter(function(r){return self.shelfTotal(r)>0;});
  var pool=stock.length?stock:known;
  var item=pool[Math.floor(Math.random()*pool.length)];
  var who=Math.floor(Math.random()*D.TRAVELERS);
  var c={id:++S.custId,who:who,item:item,wait:0,walk:D.CUST_WALK,serve:0,mood:1};
  S.cust.push(c);
  if(!this.silent)this.emit('customer',c);
  return c;
};
/* цена за вещь, которую отдадим этому покупателю (худшее качество из запаса) */
P.custQual=function(c){for(var q=0;q<D.QUAL.length;q++)if(this.shelfN(c.item,q)>0)return q;return -1;};   // v26: только с полки
/* хозяйка продаёт сама только свободные копии и не трогает вещи с замком */
P.hostessCan=function(c){return this.custQual(c)>=0&&!this.isLocked(c.item);};
P.custPrice=function(c,by){
  var gd=D.GOOD_BY[c.item],q=Math.max(0,this.custQual(c));
  var p=gd.price*D.QUAL[q]*D.decorPrice(this.decorPts())*this.itemPriceMult(c.item);
  return Math.round(p);   // v27: продаёт только хозяйка, по обычной цене
};
P.custRemove=function(c){var a=this.S.cust,i=a.indexOf(c);if(i>=0)a.splice(i,1);};
P.custById=function(id){var a=this.S.cust;for(var i=0;i<a.length;i++)if(a[i].id===id)return a[i];return null;};
P.sellTo=function(c,mode){
  var S=this.S;if(!c||this.custQual(c)<0)return false;
  var price=this.custPrice(c,mode==='hostess'?'hostess':null);
  var q=this.shelfSell(c.item);
  this.masterIncome(c.item,price);
  S.gold+=price;S.stats.sold++;S.stats.goldEarned+=price;this.addRep(D.counterRep(S.counter));
  if(this.rep){this.rep.sold++;this.rep.gold+=price;}
  this.custRemove(c);
  this.emit('sale',{c:c,price:price,q:q,mode:mode||'sell'});
  this.guestTry(c);
  return true;
};
P.refuse=function(c){if(!c)return false;this.custRemove(c);this.emit('custLeft',{c:c,why:'refuse'});return true;};
/* v27: хозяйка продаёт сама и только тому, кто дошёл до стойки. Путник идёт от дороги D.CUST_WALK секунд,
   встаёт в очередь; первый в очереди обслуживается D.SERVE_T секунд: есть вещь на полке - покупает, нет - уходит.
   Время считается по цепочке, поэтому и большой шаг офлайна даёт столько же продаж, сколько живая игра. */
P.tickCustomers=function(dt){
  var S=this.S,off=!!this.rep,self=this;
  if(!this.isOpen()){if(S.cust.length){S.cust.length=0;this.emit('closed');}S.custAcc=0;return;}
  var max=D.custMax(this.buildLvl('hall'));
  S.custAcc+=this.custRate()/60*dt;
  while(S.custAcc>=1){S.custAcc-=1;if(S.cust.length<max||off)this.spawnCustomer();else S.custAcc=Math.min(S.custAcc,1);}
  var tau=0;
  while(S.cust.length){
    var c=S.cust[0];if(c.walk===undefined){c.walk=0;c.serve=0;}
    var start=Math.max(tau,c.walk),end=start+(D.SERVE_T-(c.serve||0));
    if(end>dt){if(dt>start)c.serve=(c.serve||0)+(dt-start);break;}
    tau=end;
    if(this.hostessCan(c))this.sellTo(c,'hostess');
    else{this.custRemove(c);this.emit('custLeft',{c:c,why:'none'});this.guestTry(c);}
  }
  S.cust.forEach(function(x,i){
    x.walk=Math.max(0,(x.walk||0)-dt);x.wait+=dt;
    if(!off&&i>0&&x.walk<=0&&x.wait>=D.CUST_WALK+D.CUST_PATIENCE){self.custRemove(x);self.emit('custLeft',{c:x,why:'wait'});self.guestTry(x);}
  });
};
/* ════════ СУНДУКИ И МЕСТО ПОД ВЕЩИ (v27) ════════
   Готовые вещи лежат на полках таверны и в сундуках склада. Мест в сундуках не хватает - мастер держит готовую вещь у себя и ждёт. */
P.itemCount=function(){var n=0,I=this.S.inv;for(var k in I)n+=I[k]||0;return n;};
P.shelfUsedAll=function(){var self=this,n=0;D.SHELF_CATS.forEach(function(c){n+=self.shelfUsed(c);});return n;};
P.chestCap=function(){return HL.chestSlots(this.S.furn||[]);};
P.chestUsed=function(){return Math.max(0,this.itemCount()-this.shelfUsedAll());};
P.chestRoom=function(){return this.chestCap()-this.chestUsed();};
P.itemCap=function(){var self=this,n=this.chestCap();D.SHELF_CATS.forEach(function(c){n+=self.shelfCap(c);});return n;};
/* поместится ли ещё одна копия: в сундук или сразу на полку (копия для книги и вещь с замком на полку не идут) */
P.canAccept=function(rid,q){
  if(this.chestRoom()>0)return true;
  var cat=D.shelfCat(rid);if(!cat||this.isLocked(rid)||this.shelfCap(cat)-this.shelfUsed(cat)<=0)return false;
  var n=this.S.inv[rid+':'+q]||0,res=this.bookNeed(rid,q)?1:0;
  return Math.max(0,n+1-res)-this.shelfN(rid,q)>0;
};

/* ════════ ПОЛКИ И ГРУЗЧИК (v26) ════════
   S.shelf - часть запаса S.inv, которая выложена на полки. Продажа берёт с полки; поход, книга и снаряжение
   берут из запаса, и если вещей стало меньше, чем на полке, полка сама укорачивается (shelfFix). */
P.shelfCap=function(cat){var n=0;HL.placed(this.S.furn||[]).forEach(function(it){var d=D.FURN[it.t];if(d.shelf&&d.shelf===cat)n+=d.slots[it.lv-1];});return n;};
P.shelfUsed=function(cat){var n=0,S=this.S;for(var k in S.shelf)if(D.shelfCat(k.split(':')[0])===cat)n+=S.shelf[k];return n;};
P.shelfN=function(rid,q){return (this.S.shelf&&this.S.shelf[rid+':'+q])||0;};
P.shelfTotal=function(rid){var n=0;for(var q=0;q<D.QUAL.length;q++)n+=this.shelfN(rid,q);return n;};
/* сколько копий можно выложить со склада: свободные (не для книги), без замка, ещё не на полке */
P.storeFree=function(rid,q){return this.isLocked(rid)?0:Math.max(0,this.freeCount(rid,q)-this.shelfN(rid,q));};
P.storeFreeTotal=function(rid){var n=0;for(var q=0;q<D.QUAL.length;q++)n+=this.storeFree(rid,q);return n;};
P.shelfPut=function(rid,q,n){
  var cat=D.shelfCat(rid);if(!cat)return 0;
  var k=Math.min(n,this.shelfCap(cat)-this.shelfUsed(cat),this.storeFree(rid,q));if(k<=0)return 0;
  var key=rid+':'+q;this.S.shelf[key]=(this.S.shelf[key]||0)+k;return k;
};
/* продажа с полки: худшее качество, которое там лежит */
P.shelfSell=function(rid){
  var S=this.S;
  for(var q=0;q<D.QUAL.length;q++){var k=rid+':'+q;if((S.shelf[k]||0)>0&&(S.inv[k]||0)>0){S.shelf[k]--;if(!S.shelf[k])delete S.shelf[k];S.inv[k]--;if(!S.inv[k])delete S.inv[k];return q;}}
  return -1;
};
/* полка не больше свободного запаса и вместимости витрин: лишнее молча остаётся на складе (сначала дешёвое) */
P.shelfFix=function(){
  var S=this.S,self=this;if(!S.shelf)S.shelf={};
  for(var k in S.shelf){var p=k.split(':'),rid=p[0],q=+p[1],mx=self.isLocked(rid)?0:self.freeCount(rid,q);if(!D.GOOD_BY[rid])mx=0;
    if(S.shelf[k]>mx)S.shelf[k]=mx;if(!(S.shelf[k]>0))delete S.shelf[k];}
  D.SHELF_CATS.forEach(function(cat){
    var over=self.shelfUsed(cat)-self.shelfCap(cat);if(over<=0)return;
    var keys=Object.keys(S.shelf).filter(function(k){return D.shelfCat(k.split(':')[0])===cat;});
    keys.sort(function(a,b){return D.GOOD_BY[a.split(':')[0]].price-D.GOOD_BY[b.split(':')[0]].price;});
    for(var i=0;i<keys.length&&over>0;i++){var t=Math.min(over,S.shelf[keys[i]]);S.shelf[keys[i]]-=t;over-=t;if(!S.shelf[keys[i]])delete S.shelf[keys[i]];}
  });
};
/* выложить со склада до n вещей: сначала то, чего на полках нет совсем (больше разных просьб), потом дорогое */
P.shelfFill=function(n){
  var self=this,moved=0,ids=D.GOODS.map(function(g){return g.id;}).filter(function(r){return self.storeFreeTotal(r)>0;});
  ids.sort(function(a,b){return D.GOOD_BY[b].price-D.GOOD_BY[a].price;});
  for(var round=0;moved<n&&round<200;round++){
    var any=false;
    for(var i=0;i<ids.length&&moved<n;i++){
      var r=ids[i];if(self.shelfTotal(r)>round)continue;
      for(var q=0;q<D.QUAL.length;q++)if(self.shelfPut(r,q,1)){moved++;any=true;break;}
    }
    if(!any){var left=ids.some(function(r){return self.storeFreeTotal(r)>0&&self.shelfCap(D.shelfCat(r))>self.shelfUsed(D.shelfCat(r));});if(!left)break;}
  }
  if(moved)this.emit('shelf',moved);
  return moved;
};
/* витрина в подарок (мастер при найме приносит свою), если такой ещё нет совсем */
P.giveShelf=function(cat){
  var t=cat&&D.SHELF_OF[cat],S=this.S;if(!t||!S.furn)return null;
  if(S.furn.some(function(x){return x.t===t;}))return null;
  var it={id:(S.furnId||0)+1,t:t,lv:1,x:0,z:0,r:0},sp=HL.findSpot(S.furn,this.buildLvl('hall'),it);
  if(sp){it.x=sp.x;it.z=sp.z;it.r=sp.r;}else it.st=1;
  S.furnId=it.id;S.furn.push(it);this.emit('furn',{act:'gift',id:it.id});return it;
};
/* грузчик */
P.loader=function(){var S=this.S;if(!S.loader)S.loader={hired:false,lvl:1,acc:0,moved:0};return S.loader;};
P.loaderRate=function(){var L=this.loader();return L.hired?D.LOADER.rate[L.lvl-1]:0;};
P.loaderHireCost=function(){return this.loader().hired?null:{gold:D.LOADER.hire};};
P.loaderUpCost=function(){var L=this.loader();return L.hired&&L.lvl<D.LOADER.rate.length?D.LOADER.up[L.lvl-1]:null;};
P.loaderHire=function(){var c=this.loaderHireCost();if(!c||!this.pay(c))return false;this.loader().hired=true;this.emit('loader','hire');return true;};
P.loaderUp=function(){var c=this.loaderUpCost();if(!c||!this.pay(c))return false;this.loader().lvl++;this.emit('loader','up');return true;};
P.tickLoader=function(dt){
  var L=this.loader();if(!L.hired)return;
  L.acc=Math.min(L.acc+this.loaderRate()/3600*dt,Math.max(1,this.loaderRate()/3600*dt+1));
  var n=Math.floor(L.acc);if(n<1)return;
  var m=this.shelfFill(n);L.acc-=n;if(m)L.moved=(L.moved||0)+m;
};

/* ════════ МЕБЕЛЬ ЗАЛА И РЕЖИМ ДИЗАЙНА (v25) ════════ */
P.addRep=function(n){var S=this.S;S.rep=(S.rep||0)+n;S.repEarned=(S.repEarned||0)+n;};
P.furnById=function(id){var L=this.S.furn||[];for(var i=0;i<L.length;i++)if(L[i].id===id)return L[i];return null;};
P.furnOwn=function(t){return (this.S.furn||[]).filter(function(x){return x.t===t;}).length;};
P.seatCount=function(){return HL.seatCount(this.S.furn||[]);};
/* мест у всех столов в зале, включая те, что ещё строятся (для предела зала) */
P.seatCap=function(){var n=0;HL.placed(this.S.furn||[]).forEach(function(it){var d=D.FURN[it.t];if(d.seats)n+=d.seats[it.lv-1];});return n;};
P.seatMax=function(){return D.seatMax(this.buildLvl('hall'));};
P.decorPts=function(){return HL.decorPts(this.S.furn||[]);};
P.custRate=function(){return D.custRate(this.buildLvl('hall'),D.decorFlow(this.decorPts()));};
/* стол: золото как за места раньше (каждое следующее место дороже), за улучшение ещё и репутация */
P.tableCost=function(it){
  var d=D.FURN.table,lv=it?it.lv+1:1,add=d.seats[lv-1]-(it?d.seats[it.lv-1]:0),cap=this.seatCap(),gold=0;
  for(var i=0;i<add;i++)gold+=D.seatCost(Math.max(D.SEATS0,cap+i)).gold;
  var c={gold:gold};if(it)c.rep=Math.ceil(gold*D.TABLE_REP);return c;
};
P.furnBuyCost=function(t){return t==='table'?this.tableCost(null):t==='schest'?D.chestCost(1):D.decorCost(t,1,this.furnOwn(t));};
P.furnUpCost=function(it){if(!it||it.lv>=D.FURN_LV)return null;return it.t==='table'?this.tableCost(it):it.t==='schest'?D.chestCost(it.lv+1):D.decorCost(it.t,it.lv+1);};
/* причина, почему нельзя: '' можно; hall - нужен уровень зала; seats - предел мест зала; max; busy - строится; cost; space */
P.furnBuyBlock=function(t){
  var d=D.FURN[t];if(!d)return 'max';
  if(this.buildLvl('hall')<D.furnHall(t,1))return 'hall';
  if(d.seats&&this.seatCap()+d.seats[0]>this.seatMax())return 'seats';
  if(t==='schest'&&this.furnOwn(t)>=D.CHEST_MAX)return 'max';
  if(!this.canPay(this.furnBuyCost(t)))return 'cost';
  return '';
};
P.furnUpBlock=function(it){
  if(!it)return 'max';var d=D.FURN[it.t];
  if(it.lv>=D.FURN_LV)return 'max';
  if(it.bt||it.q)return 'busy';
  if(this.buildLvl('hall')<D.furnHall(it.t,it.lv+1))return 'hall';
  if(d.seats&&this.seatCap()+d.seats[it.lv]-d.seats[it.lv-1]>this.seatMax())return 'seats';
  if(!this.canPay(this.furnUpCost(it)))return 'cost';
  return '';
};
P.releaseGuests=function(fid){var T=this.tav(),pre=fid+':',self=this;T.guests=T.guests.filter(function(x){var out=String(x.seat).indexOf(pre)===0;if(out)self.emit('guestLeft',x);return !out;});};
P.furnBuy=function(t){
  var bl=this.furnBuyBlock(t);if(bl)return bl;
  var S=this.S,it={id:(S.furnId||0)+1,t:t,lv:1,x:0,z:0,r:0};
  var sp=D.FURN[t].zone==='store'?HL.findSpotStore(S.furn,S.storeLvl,it):HL.findSpot(S.furn,this.buildLvl('hall'),it);if(!sp)return 'space';
  this.pay(this.furnBuyCost(t));
  it.x=sp.x;it.z=sp.z;it.r=sp.r;S.furnId=it.id;S.furn.push(it);
  if(D.FURN[t].seats){it.q=1;this.crewQ().push('f:'+it.id);this.prodStartWaiting();}
  this.emit('furn',{act:'buy',id:it.id});
  return it;
};
P.furnUp=function(it){
  var bl=this.furnUpBlock(it);if(bl)return bl;
  var S=this.S,hall=this.buildLvl('hall'),cand={id:it.id,t:it.t,lv:it.lv+1,x:it.x,z:it.z,r:it.r};
  var others=S.furn.filter(function(x){return x!==it;});
  if(HL.zone(it)==='hall'&&!HL.check(others.concat([cand]),hall).ok){
    /* больше не помещается: пробуем развернуть или сдвинуть на свободное место */
    var sp=HL.findSpot(S.furn,hall,cand);if(!sp)return 'space';
    cand.x=sp.x;cand.z=sp.z;cand.r=sp.r;
  }
  this.pay(this.furnUpCost(it));
  it.lv++;it.x=cand.x;it.z=cand.z;it.r=cand.r;
  if(D.FURN[it.t].seats){this.releaseGuests(it.id);it.q=1;this.crewQ().push('f:'+it.id);this.prodStartWaiting();}
  this.emit('furn',{act:'up',id:it.id});
  return it;
};
/* убрать на склад мебели и поставить обратно */
P.furnStore=function(it){
  if(!it||it.st)return false;if(it.bt||it.q)return 'busy';
  if(D.FURN[it.t].seats&&HL.placed(this.S.furn).filter(function(x){return D.FURN[x.t].seats;}).length<=1)return 'last';
  this.releaseGuests(it.id);it.st=1;this.emit('furn',{act:'store',id:it.id});return true;
};
P.furnPlace=function(it){
  if(!it||!it.st)return false;
  var d=D.FURN[it.t];if(d.seats&&this.seatCap()+d.seats[it.lv-1]>this.seatMax())return 'seats';
  var sp=HL.zone(it)==='store'?HL.findSpotStore(this.S.furn,this.S.storeLvl,it):HL.findSpot(this.S.furn,this.buildLvl('hall'),it);if(!sp)return 'space';
  it.x=sp.x;it.z=sp.z;it.r=sp.r;delete it.st;this.emit('furn',{act:'place',id:it.id});return true;
};
/* применить расстановку из режима дизайна: moves = {id:{x,z,r}}. Гости за сдвинутыми столами уходят */
P.furnApply=function(moves){
  var S=this.S,self=this,list=S.furn.map(function(it){var m=moves[it.id];if(!m)return it;var c={};for(var k in it)c[k]=it[k];c.x=m.x;c.z=m.z;c.r=m.r;return c;});
  if(!this.furnCheck(list))return false;
  S.furn.forEach(function(it){var m=moves[it.id];if(!m||(m.x===it.x&&m.z===it.z&&m.r===it.r))return;it.x=m.x;it.z=m.z;it.r=m.r;if(D.FURN[it.t].seats)self.releaseGuests(it.id);});
  this.emit('furn',{act:'move'});
  return true;
};
P.furnCheck=function(list){return HL.check(list,this.buildLvl('hall')).ok&&HL.checkStore(list,this.S.storeLvl).ok;};
P.counterCost=function(){var l=this.S.counter||1;return l>=D.COUNTER_MAX?null:D.counterCost(l);};
P.counterUp=function(){var c=this.counterCost();if(!c||!this.pay(c))return false;this.S.counter=(this.S.counter||1)+1;this.emit('furn',{act:'counter'});return true;};
P.tickFurn=function(dt){
  var self=this,done=false,S=this.S;
  if(S.storeBt){S.storeBt.t-=dt;if(S.storeBt.t<=0){S.storeBt=null;S.storeLvl++;done=true;this.emit('buy','store');this.emit('built',{kind:'store',lvl:S.storeLvl});}}
  (this.S.furn||[]).forEach(function(it){
    if(!it.bt)return;it.bt.t-=dt;if(it.bt.t>0)return;
    it.bt=null;done=true;self.emit('built',{kind:'furn',id:it.id,lvl:it.lv});
  });
  if(done)this.prodStartWaiting();
};
/* сохранения до v25: места -> столы, уровень убранства -> декор. Испорченная расстановка чинится */
P.furnSanitize=function(){
  var S=this.S,hall=this.buildLvl('hall'),self=this;
  /* Store дописывает furn из дефолтов, поэтому переход отмечаем своим флагом */
  if(!S.v25||!Array.isArray(S.furn)){
    S.v25=1;S.furn=[];S.furnId=0;S.repEarned=S.rep||0;
    if(!S.counter)S.counter=1;
    var n=Math.max(D.SEATS0,(S.tav&&S.tav.seats)||D.SEATS0),max=D.seatMax(hall);
    var SPOTS=[[2,-2,0],[2,2,0],[-2,-2,0],[-2,1,0],[5,0,1],[3,6,0],[5,6,0]];
    var add=function(t,lv){var it={id:++S.furnId,t:t,lv:lv,x:0,z:0,r:0},sp=null;
      if(t==='table')for(var j=0;j<SPOTS.length&&!sp;j++){var c={id:it.id,t:t,lv:lv,x:SPOTS[j][0],z:SPOTS[j][1],r:SPOTS[j][2]};if(HL.check(S.furn.concat([c]),hall).ok)sp={x:c.x,z:c.z,r:c.r};}
      if(!sp)sp=HL.findSpot(S.furn,hall,it);if(sp){it.x=sp.x;it.z=sp.z;it.r=sp.r;}else it.st=1;S.furn.push(it);return it;};
    while(n>0){
      var lv=n>=5&&hall>=3?3:n>=3&&hall>=1?2:1;
      if(self.seatCap()+D.FURN.table.seats[lv-1]>max&&lv>1)lv=1;
      add('table',lv);n-=D.FURN.table.seats[lv-1];
      if(self.seatCap()>=max)break;
    }
    var dl=S.build&&S.build.decor||0,want=12*dl;
    var lvd=Math.min(3,dl),plan=['rug','bookcase','weapons','dummy','chest','vase','vase','barrel','crate','barrel','crate'].filter(function(t){return hall>=D.furnHall(t,1);}).map(function(t){return [t,lvd];});
    for(var i=0;i<plan.length&&self.decorPts()<want;i++){var it=add(plan[i][0],plan[i][1]);if(it.st){S.furn.pop();break;}}
    S.tav.guests=[];
  }
  if(!S.counter)S.counter=1;
  if(S.repEarned===undefined)S.repEarned=S.rep||0;
  S.furn=S.furn.filter(function(it){return it&&D.FURN[it.t];});
  S.furn.forEach(function(it){it.lv=Math.max(1,Math.min(D.FURN_LV,it.lv|0||1));it.r=(it.r|0)&3;if(it.q&&!self.crewQueued('f:'+it.id)&&!it.bt)self.crewQ().push('f:'+it.id);});
  S.furnId=Math.max(S.furnId||0,S.furn.reduce(function(a,it){return Math.max(a,it.id);},0));
  /* что не помещается (меньше зал, порча): ставим заново или убираем на склад */
  var chk=HL.check(S.furn,hall);
  if(!chk.ok){
    var bad=S.furn.filter(function(it){return !it.st&&chk.bad[it.id];});
    if(chk.blocked&&!bad.length)bad=S.furn.filter(function(it){return !it.st&&D.FURN[it.t].cat!=='table'&&HL.zone(it)==='hall';});
    bad.forEach(function(it){it.st=1;});
    bad.forEach(function(it){var sp=HL.findSpot(S.furn,hall,it);if(sp){it.x=sp.x;it.z=sp.z;it.r=sp.r;delete it.st;}});
  }
  if(S.tav)S.tav.seats=this.seatCount();
  /* v26: витрины для нанятых мастеров, запас со склада на полки */
  if(!S.shelf||typeof S.shelf!=='object')S.shelf={};
  this.loader();
  if(!S.v26){
    S.v26=1;
    this.giveShelf('pot');
    for(var mid in D.MASTER_SHELF)if(S.masters[mid]&&S.masters[mid].hired)this.giveShelf(D.MASTER_SHELF[mid]);
    if(this.freeTotal&&S.inv)this.shelfFill(9999);
  }
  /* v27: первый сундук на складе */
  if(!S.v27){S.v27=1;if(!S.furn.some(function(x){return x.t==='schest';})){var ch={id:(S.furnId||0)+1,t:'schest',lv:1,x:0,z:0,r:0},csp=HL.findSpotStore(S.furn,S.storeLvl,ch);if(csp){ch.x=csp.x;ch.z=csp.z;ch.r=csp.r;}else ch.st=1;S.furnId=ch.id;S.furn.push(ch);}}
  if(S.storeBt&&!S.storeBt.T)S.storeBt=null;
  S.cust.forEach(function(c){if(c.walk===undefined){c.walk=0;c.serve=0;}});
  this.shelfFix();
};
P.tavernTick=function(dt){this.tickMasters(dt);this.tickProd(dt);this.tickFurn(dt);this.shelfFix();this.tickLoader(dt);this.tickCustomers(dt);this.tickTav(dt);this.tickPets(dt);};

/* ════════ ГОСТИ, ПОВАР И ПИВОВАР (v16) ════════ */
P.tav=function(){var S=this.S;if(!S.tav)S.tav=tavDefaults();return S.tav;};
P.worker=function(w){return this.tav()[w];};
/* v25: места дают столы. Свободное место: ключ 'стол:место' или null */
P.freeSeat=function(){var T=this.tav(),used={};T.guests.forEach(function(x){used[x.seat]=1;});var L=HL.seats(this.S.furn);for(var i=0;i<L.length;i++)if(!used[L[i].key])return L[i].key;return null;};
/* путник садится за стол; садясь, заказывает пиво и, может быть, блюдо */
P.guestTry=function(c){
  if(!this.isOpen()||Math.random()>=D.GUEST_CHANCE)return false;
  var T=this.tav(),seat=this.freeSeat();if(seat===null)return false;
  var gst={id:c.id,who:c.who,seat:seat,t:D.GUEST_SIT};T.guests.push(gst);
  gst.beer=this.serve('brewer');
  if(Math.random()<D.GUEST_FOOD)gst.food=this.serve('cook');
  this.emit('guest',gst);return true;
};
P.workerEff=function(w){
  var o=this.worker(w);if(!o.hired)return 0;
  if(o.bt)return o.lvl+D.STAGE_STEP*D.STAGES;
  if(o.lvl>=D.WORKER_MAX)return o.lvl;
  return o.lvl+D.STAGE_STEP*Math.min(D.STAGES,Math.floor(o.save/D.workerUp(o.lvl)*D.STAGES));
};
P.portionPrice=function(w){return D.WORKERS[w].price*this.workerEff(w);};
P.batchSize=function(w){var d=D.WORKERS[w],o=this.worker(w);return d.batch+d.per*o.help;};
P.stockCap=function(w){return this.batchSize(w)*2;};
P.capacityH=function(w){return this.worker(w).hired?this.batchSize(w)*3600/D.WORKERS[w].time:0;};
P.serve=function(w){
  var o=this.worker(w);if(!o.hired)return false;
  if(o.stock<1){o.miss++;return false;}
  o.stock--;o.served++;
  var price=this.portionPrice(w),mine=price*(1-D.WORKER_SHARE),T=this.tav();
  o.save+=price*D.WORKER_SHARE;o.earned+=price*D.WORKER_SHARE;
  T.acc+=mine;var whole=Math.floor(T.acc);
  if(whole>0){T.acc-=whole;this.S.gold+=whole;this.S.stats.goldEarned+=whole;T.inc+=whole;if(this.rep)this.rep.tav=(this.rep.tav||0)+whole;}
  if(!o.bt&&o.lvl<D.WORKER_MAX&&o.save>=D.workerUp(o.lvl)){o.save-=D.workerUp(o.lvl);var Tb=D.workerBuild(o.lvl);o.bt={t:Tb,T:Tb};this.emit('wStage',{w:w,lvl:o.lvl});}
  return true;
};
P.workerBlock=function(w){
  var o=this.worker(w),d=D.WORKERS[w];
  if(o.hired)return 'hired';
  if(this.buildLvl('hall')<d.hall)return 'hall';
  if(!this.canPay({gold:d.hire}))return 'cost';
  return '';
};
P.workerHire=function(w){if(this.workerBlock(w))return false;this.pay({gold:D.WORKERS[w].hire});this.worker(w).hired=true;this.emit('wHire',w);return true;};
P.helpCost=function(w){var o=this.worker(w);if(!o.hired||o.help>=D.helpSlots(o.lvl))return null;return D.helpCost(w,o.help);};
P.hireHelp=function(w){var c=this.helpCost(w);if(!c||!this.pay(c))return false;this.worker(w).help++;this.emit('wHelp',w);return true;};
/* сколько гостей в час приходит за столы и сколько им нужно порций: для подсказок */
P.guestsH=function(){var flow=this.custRate()*60*D.GUEST_CHANCE;return Math.min(flow,this.seatCount()*3600/D.GUEST_SIT);};
P.needH=function(w){return this.guestsH()*(w==='cook'?D.GUEST_FOOD:1);};
P.tavIncomeH=function(){
  var self=this,v=0;
  D.WORKER_ORDER.forEach(function(w){if(!self.worker(w).hired)return;v+=Math.min(self.needH(w),self.capacityH(w))*self.portionPrice(w)*(1-D.WORKER_SHARE);});
  return v;
};
P.tickTav=function(dt){
  var T=this.tav(),self=this;
  for(var i=T.guests.length-1;i>=0;i--){var gs=T.guests[i];gs.t-=dt;if(gs.t<=0){T.guests.splice(i,1);this.emit('guestLeft',gs);}}
  D.WORKER_ORDER.forEach(function(w){
    var o=T[w];if(!o.hired)return;
    if(o.bt){o.bt.t-=dt;if(o.bt.t<=0){o.bt=null;o.lvl=Math.min(D.WORKER_MAX,o.lvl+1);self.emit('wLevel',{w:w,lvl:o.lvl});
      if(o.lvl<D.WORKER_MAX&&o.save>=D.workerUp(o.lvl)){o.save-=D.workerUp(o.lvl);var Tb=D.workerBuild(o.lvl);o.bt={t:Tb,T:Tb};}}}
    var cap=self.stockCap(w);
    if(o.stock>=cap){o.t=0;return;}
    o.t+=dt;var tm=D.WORKERS[w].time;
    while(o.t>=tm&&o.stock<cap){o.t-=tm;o.stock=Math.min(cap,o.stock+self.batchSize(w));}
    if(o.stock>=cap)o.t=0;
    o.miss=Math.max(0,o.miss-dt/600);   // счётчик нехватки тает за 10 минут
  });
};

/* ── питомцы ── */
P.pets=function(){var S=this.S;if(!S.pets)S.pets={hired:false,own:{},active:null,train:null};return S.pets;};
P.pet=function(id){return this.pets().own[id]||null;};
P.petEff=function(k){var P2=this.pets(),id=P2.active,p=id&&P2.own[id],d=id&&D.PET_BY[id];if(!p||!d||!d.eff[k])return 0;return d.eff[k]*p.lvl;};
P.petHire=function(){
  var P2=this.pets();if(P2.hired||!this.pay({gold:D.PETMASTER_HIRE}))return false;
  P2.hired=true;var st=D.PETS[0].id;if(!P2.own[st])P2.own[st]={lvl:1};if(!P2.active)P2.active=st;
  this.emit('petHire',st);return true;
};
P.petSet=function(id){var P2=this.pets();if(!P2.own[id])return false;P2.active=id;this.emit('pet',id);return true;};
P.petCost=function(id){var p=this.pet(id);return p&&p.lvl<D.PET_MAX?D.petCost(p.lvl):null;};
P.petBlock=function(id){var P2=this.pets(),p=P2.own[id];if(!P2.hired)return 'hire';if(!p)return 'none';if(p.lvl>=D.PET_MAX)return 'max';if(P2.train)return 'busy';if(!this.canPay(this.petCost(id)))return 'cost';return '';};
P.petTrain=function(id){
  if(this.petBlock(id))return false;var p=this.pet(id);this.pay(this.petCost(id));
  var T=D.petTime(p.lvl);this.pets().train={id:id,t:T,T:T};this.emit('petTrain',id);return true;
};
P.tickPets=function(dt){
  var P2=this.pets(),tr=P2.train;if(!tr)return;
  tr.t-=dt;if(tr.t>0)return;
  P2.train=null;var p=P2.own[tr.id];if(p&&p.lvl<D.PET_MAX){p.lvl++;this.emit('petLevel',{id:tr.id,lvl:p.lvl});}
};
/* глава пройдена до конца: шанс найти её питомца */
P.petFind=function(t){
  var d=null;D.PETS.forEach(function(p){if(p.tract===t)d=p;});
  var P2=this.pets();if(!d||P2.own[d.id]||Math.random()>=D.PET_FIND)return false;
  P2.own[d.id]={lvl:1};if(!P2.active)P2.active=d.id;
  if(this.rep)this.rep.pet=d.id;
  this.emit('petFound',d.id);return true;
};

/* ── облик ── */
P.robeOpen=function(r){return !!r.free;};
P.equipRobe=function(id){var S=this.S;if(S.wardrobe.owned.indexOf(id)<0)return false;S.wardrobe.robe=id;this.emit('look');return true;};
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

/* сохранения прошлых версий: убрать вещи и рецепты, которых больше нет, новые слоты, рецепты 1 уровня */
P.sanitize=function(){
  var S=this.S,k;
  if(!S.queue)S.queue=[];
  var eq={head:null,body:null,belt:null,feet:null,ring:null};
  /* надетое: в слот по новой схеме (амулет стал кольцом), иначе обратно в инвентарь */
  for(k in S.equip){
    var it=S.equip[k],gd=it&&D.GOOD_BY[it.id];if(!gd||!gd.slot)continue;
    if(!eq[gd.slot])eq[gd.slot]=it;else{var key=it.id+':'+(it.q||0);S.inv[key]=(S.inv[key]||0)+1;}
  }
  S.equip=eq;
  for(k in S.use)if(!D.GOOD_BY[k])delete S.use[k];
  for(k in S.inv){var id=k.split(':')[0];if(!D.GOOD_BY[id])delete S.inv[k];}
  var def=masterDefaults();
  for(k in def){
    var m=S.masters[k];if(!m){S.masters[k]=def[k];continue;}
    if(m.teach===undefined)m.teach=null;
    if(!m.done)m.done={};if(!m.coll)m.coll={};
    m.tools=Math.min(m.tools||0,D.TOOLS_MAX);
    if(m.tst===undefined){m.tst=0;m.tbt=null;}
    if(typeof m.sav!=='number'){m.sav=0;m.inc=0;
      /* v20: чтобы уже начатые улучшения не встали, мастер сразу получает свою часть текущего уровня */
      if(m.hired&&m.tools<D.TOOLS_MAX)m.sav=D.masterPart(m.tools);}
    m.known=m.known.filter(function(r){return D.GOOD_BY[r]&&D.GOOD_BY[r].m===k;});
    def[k].known.forEach(function(r){if(m.known.indexOf(r)<0)m.known.push(r);});
    var self=this;
    /* v11: очереди мастеров переезжают в общую */
    if(m.q){m.q.forEach(function(o){var ok=D.ORDERS[o.r]||D.GOOD_BY[o.r];if(!ok){if(o.c)self.refund(o.c);return;}o.m=k;S.queue.push(o);});delete m.q;}
    delete m.slots;
  }
  if(!S.queue)S.queue=[];
  if(!S.qSlots)S.qSlots=D.QSLOTS0;
  S.qSlots=Math.min(D.QSLOTS_MAX,Math.max(S.qSlots,S.queue.length));
  S.queue=S.queue.filter(function(o){return (D.ORDERS[o.r]||D.GOOD_BY[o.r])&&(o.m==='mage'||S.masters[o.m]);});
  if(S.use.sc_spark===undefined){S.use.sc_spark=true;S.use.sc_guard=true;}
  if(!S.mageCraft)S.mageCraft={done:{},coll:{}};
  if(!S.pets)S.pets={hired:false,own:{},active:null,train:null};
  for(k in S.pets.own)if(!D.PET_BY[k])delete S.pets.own[k];
  if(S.pets.active&&!S.pets.own[S.pets.active])S.pets.active=null;
  S.cautious=true;
  /* v15: шахта стала промыслом, уголь в запасе сохраняется */
  /* Store дописывает prod из дефолтов ещё до sanitize, поэтому смотрим на старую шахту */
  if(!S.prod)S.prod=prodDefaults();
  var pd=prodDefaults();for(k in pd)if(!S.prod[k])S.prod[k]=pd[k];
  if(S.mine&&S.mine.lvl&&!S.prod.mine.lvl&&!S.prod.mine.bt){S.prod.mine.lvl=Math.min(D.PROD_MAX,S.mine.lvl);S.prod.mine.acc.coal=Math.min(S.mine.acc||0,this.lineCap('mine','coal'));}
  delete S.mine;
  if(!S.crews)S.crews=1;
  if(!S.crewQ)S.crewQ=[];
  if(!S.recent)S.recent=[];if(!S.pinned)S.pinned=[];
  if(!S.locked||typeof S.locked!=='object')S.locked={};if(!S.bookFree||typeof S.bookFree!=='object')S.bookFree={};
  for(var lk in S.locked)if(!D.GOOD_BY[lk])delete S.locked[lk];
  /* v18: при переходе недавние берём из очереди и из того, что лежит на складе */
  if(!S.recent.length&&!S.recentSeeded){S.recentSeeded=true;var self2=this;S.queue.forEach(function(o){if(D.GOOD_BY[o.r]&&S.recent.indexOf(o.r)<0)S.recent.push(o.r);});
    for(var ik in S.inv){var rid0=ik.split(':')[0];if(S.inv[ik]>0&&D.GOOD_BY[rid0]&&S.recent.indexOf(rid0)<0&&S.recent.length<10)S.recent.push(rid0);}}
  S.recent=S.recent.filter(function(r){return D.GOOD_BY[r];});S.pinned=S.pinned.filter(function(r){return D.GOOD_BY[r];});
  if(!S.tav)S.tav=tavDefaults();
  var td=tavDefaults();for(k in td)if(S.tav[k]===undefined)S.tav[k]=td[k];
  D.WORKER_ORDER.forEach(function(w){var wd=workerDefaults();for(var j in wd)if(S.tav[w][j]===undefined)S.tav[w][j]=wd[j];});
  this.furnSanitize();
  var seatOk={};HL.seats(S.furn).forEach(function(x){seatOk[x.key]=1;});
  S.tav.guests=S.tav.guests.filter(function(x){return seatOk[x.seat];});
  if(S.use.p_heal===undefined)S.use.p_heal=true;
  S.cust=S.cust.filter(function(c){return D.GOOD_BY[c.item];});
};

/* сохранение v1 (золото, уровни) -> v2: персонаж и гардероб остаются, прогресс заново */
/* v27 (версия 3): прогресс сбрасывается у всех (тестовая стадия), персонаж, облик, гардероб и настройки остаются */
function migrate(old,v){
  if(v>=3)return old;
  return {profile:old.profile||null,look:old.look||null,wardrobe:old.wardrobe,settings:{gfx:(old.settings&&old.settings.gfx)||'auto',panel:old.settings&&old.settings.panel},
    lastSeen:0,resetV27:!!old.profile};
}

var api={Game:Game,defaults:defaults,migrate:migrate};
if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.AcGame=api;
})(this);
