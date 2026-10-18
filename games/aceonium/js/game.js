/* Aceonium: игровая логика без DOM и без 3D (v8: походы за ресурсами, таверна с мастерами).
   Состояние (S) хранится в Store('aceonium'), текущий бой (R) только в памяти.
   Сцена и интерфейс подписываются на события: game.on('kill', fn).
   Офлайн считается тем же набором функций, только без событий (silent). */
(function(root){
'use strict';

var D=root.AcData||(typeof require!=='undefined'?require('./data.js'):null);

function masterDefaults(){
  var m={};
  D.MASTERS.forEach(function(d){
    var known=D.GOODS.filter(function(x){return x.m===d.id&&x.teach===0;}).map(function(x){return x.id;});
    m[d.id]={hired:d.hire===0,lvl:1,xp:0,tools:0,tst:0,tbt:null,known:known,teach:null,done:{},coll:{}};
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
    tav:tavDefaults(),                              // v16: места, гости, повар и пивовар
                    // промыслы (v15) и бригады строителей
    cust:[],custAcc:0,custId:0,rep:0,
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
P.emit=function(name,data){if(this.silent)return;var l=this.ev[name];if(l)for(var i=0;i<l.length;i++)l[i](data);};

/* ── производные величины ── */
P.skillDef=function(id){for(var i=0;i<D.SKILLS.length;i++)if(D.SKILLS[i].id===id)return D.SKILLS[i];return null;};
P.skillOn=function(id){return this.S.skills[id].act>0;};
P.skillUnlocked=function(s){return this.S.mlvl>=s.unlock;};
P.skillPow=function(id){return D.skillPow(this.skillDef(id),this.S.skills[id].l);};
P.skillPoints=function(){return this.S.mlvl-1-this.S.spent;};
P.dmgMult=function(){
  var m=D.fatigueMult(this.S.fatigue);
  if(this.skillOn('overload'))m*=this.skillPow('overload');
  if(this.S.rested>0)m*=D.REST_BUFF_MULT;
  return m*(1+this.eff('dmg'));
};
/* сумма бонусов надетых вещей и зелий текущего похода */
P.eff=function(k){
  var S=this.S,v=0;
  for(var sl in S.equip){var it=S.equip[sl];if(!it)continue;var gd=D.GOOD_BY[it.id];if(gd&&gd.eff&&gd.eff[k])v+=gd.eff[k]*D.QUAL[it.q];}
  if(S.trip&&S.trip.buff&&S.trip.buff[k])v+=S.trip.buff[k];
  v+=this.petEff(k);
  return v;
};
P.rawDps=function(){return D.staffDps(this.S.staff,this.S.mlvl);};
P.staffRate=function(){return D.STAFF_RATE*(this.skillOn('flurry')?this.skillPow('flurry'):1);};
P.dps=function(){return this.rawDps()*this.dmgMult()*this.staffRate()/D.STAFF_RATE;};
P.critChance=function(){var c=D.CRIT_CHANCE+this.eff('crit');if(this.skillOn('focus'))c+=this.skillPow('focus');return Math.min(1,c);};
P.critMult=function(){return D.CRIT_MULT;};
P.critFactor=function(){return 1+this.critChance()*(this.critMult()-1);};
P.effDps=function(){return this.dps()*this.critFactor();};
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
P.have=function(id){return id==='gold'?this.S.gold:(this.S.store[id]||0);};
P.canPay=function(cost){if(!cost)return false;for(var k in cost)if(this.have(k)<cost[k])return false;return true;};
P.pay=function(cost){if(!this.canPay(cost))return false;for(var k in cost){if(k==='gold')this.S.gold-=cost[k];else this.S.store[k]-=cost[k];}return true;};
P.refund=function(cost){for(var k in cost){if(k==='gold')this.S.gold+=cost[k];else this.S.store[k]=this.have(k)+cost[k];}};

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
    if((gd.kind!=='potion'&&gd.kind!=='scroll')||!S.use[gd.id])return;
    var q=self.invTake(gd.id,true);if(q<0)return;
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
  var tr=this.S.trip,T=D.TRACTS[tr.t];
  if(tr.boss){
    var hp=D.bossHp(tr.t,tr.w);
    return {L:tr.w,hp:hp,max:hp,boss:true,type:T.boss.type,cols:T.boss.cols,res:T.rare,biome:T.biome,t:tr.t,name:'boss.'+T.id};
  }
  var res=T.res[Math.floor(Math.random()*T.res.length)],mon=D.MON[res],mhp=D.mobHp(tr.t,tr.w);
  return {L:tr.w,hp:mhp,max:mhp,boss:false,type:mon.type,cols:mon.cols,res:res,biome:T.biome,t:tr.t,name:'mon.'+res};
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
  this.addXp(D.xpMob(tr.t,tr.w)*(e.boss?D.XP_BOSS:1));
  if(!e.boss){
    if(Math.random()<this.dropChance(tr.t,tr.w))this.bagAdd(e.res,1);
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
    var ward=why==='defeat'&&S.use.p_ward&&this.invTake('p_ward',false)>=0;
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
  this.emit('hit',{dmg:h.dmg,crit:h.crit,click:!!h.click,big:!!h.big});
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
        if(R.enemy&&R.enemy.boss){R.bossT=0;R.hitT=D.BOSS_HIT;R.mhp=this.maxHp();this.emit('bossStart',R.enemy);}
        this.emit('fight',R.enemy);
      }
      break;
    case 'fight':
      R.staffT+=dt*this.staffRate();
      var guard=0;
      while(R.staffT>=1&&guard++<20){R.staffT-=1;this.fireStaff();}
      if(R.enemy&&R.enemy.boss){
        R.bossT+=dt;R.hitT-=dt;
        if(R.hitT<=0&&R.enemy.hp>0){
          var tr=S.trip,dmg=D.bossDps(tr.t,tr.w)*D.BOSS_HIT*(R.bossT>D.RAGE_T?D.RAGE_MULT:1);
          R.hitT+=D.BOSS_HIT;R.mhp=Math.max(0,R.mhp-dmg);
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
P.storeCost=function(){var b=D.STORE[this.S.storeLvl];return b?b.cost:null;};
P.buyStore=function(){var c=this.storeCost();if(!c||!this.pay(c))return false;this.S.storeLvl++;this.emit('buy','store');return true;};

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
P.hire=function(id){var d=D.MASTER_BY[id];if(!d||!this.canHire(id)||!this.pay({gold:d.hire}))return false;this.master(id).hired=true;this.emit('hire',id);return true;};
P.mSpeed=function(id){var c=this.collDone(id);if(id==='mage')return D.MAGE_SPEED*(c?1.1:1);var m=this.master(id);return D.mSpeed(m.lvl,c);};
/* освоение: сколько копий вещи сделал этот мастер; время вещи с учётом освоения (без общей скорости мастера) */
P.mastery=function(mid,rid){var m=this.master(mid);return m&&m.done?(m.done[rid]||0):0;};
P.craftTime=function(mid,rid){var gd=D.GOOD_BY[rid];return gd?D.craftTime(gd,this.mastery(mid,rid)):this.orderTime(rid);};
/* коллекция мастера: по одной вещи каждого его рецепта; собранная даёт +2% легендарного, +10% скорости и +10% к цене */
P.collList=function(mid){return D.GOODS.filter(function(x){return x.m===mid;}).map(function(x){return x.id;});};
P.collHas=function(mid,rid){var m=this.master(mid);return !!(m&&m.coll&&m.coll[rid]);};
P.collCount=function(mid){var self=this;return this.collList(mid).filter(function(r){return self.collHas(mid,r);}).length;};
P.collDone=function(mid){var l=this.collList(mid);return l.length>0&&this.collCount(mid)===l.length;};
P.collAdd=function(rid){
  var gd=D.GOOD_BY[rid];if(!gd)return false;
  var m=this.master(gd.m);if(!m||this.collHas(gd.m,rid)||this.invCount(rid)<1)return false;
  this.invTake(rid,false);m.coll[rid]=1;
  this.emit('coll',{m:gd.m,r:rid,done:this.collDone(gd.m)});return true;
};
P.orderCost=function(rid){
  var S=this.S;
  function withGold(c,g){if(!c)return null;var o={gold:g};for(var k in c)o[k]=c[k];return o;}
  if(rid==='staff')return withGold(D.staffCost(S.staff),D.ORDERS.staff.gold(S.staff));
  if(rid==='bag')return D.BAG[S.bagLvl]?withGold(D.BAG[S.bagLvl].cost,D.ORDERS.bag.gold(S.bagLvl)):null;
  if(rid==='store')return D.STORE[S.storeLvl]?withGold(D.STORE[S.storeLvl].cost,D.ORDERS.store.gold(S.storeLvl)):null;
  var gd=D.GOOD_BY[rid];return gd?gd.cost:null;
};
P.orderTime=function(rid){
  var S=this.S;
  if(rid==='staff')return D.ORDERS.staff.time(S.staff);
  if(rid==='bag')return D.ORDERS.bag.time(S.bagLvl);
  if(rid==='store')return D.ORDERS.store.time(S.storeLvl);
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
  this.emit('order',{m:mid,r:rid});return true;
};
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
  if(m.tst>=D.STAGES){var T=D.stageTime(m.tools);m.tbt={t:T,T:T};}
  this.emit('invest',{kind:'tools',id:mid});return true;
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
P.rollQual=function(mid){
  var ch=D.qualChance(this.toolsEff(mid),this.collDone(mid)),r=Math.random();
  for(var q=D.QUAL.length-1;q>0;q--){if(r<ch[q])return q;r-=ch[q];}
  return 0;
};
/* опыт мага за свиток: доля уровня, но не выше уровня свитка + 5 */
P.scrollXp=function(rid){var gd=D.GOOD_BY[rid];return Math.ceil(D.xpNeed(Math.min(this.S.mlvl,gd.lvl+5))*(gd.xp||0));};
P.finishOrder=function(mid,o){
  var S=this.S,q=-1;
  if(o.r==='staff'){S.staff++;this.emit('buy','staff');}
  else if(o.r==='bag'){S.bagLvl++;this.emit('buy','bag');}
  else if(o.r==='store'){S.storeLvl++;this.emit('buy','store');}
  else{q=this.rollQual(mid);this.invAdd(o.r,q,1);S.stats.crafted++;if(this.rep)this.rep.crafted++;
    var mm=this.master(mid);if(mm&&mm.done)mm.done[o.r]=(mm.done[o.r]||0)+1;}
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
      else{left-=o.t;q.splice(k,1);this.finishOrder(id,o);}
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
P.crewsBusy=function(){var n=0,S=this.S;for(var id in S.prod)if(S.prod[id].bt)n++;return n;};
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
    var id=q.shift(),o=this.prod(id);if(!o||o.bt)continue;
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
    var m=S.masters[mid];if(!m.tbt)continue;
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
  var stock=known.filter(function(r){return self.invCount(r)>0;});
  var pool=stock.length&&Math.random()<0.65?stock:known;
  var item=pool[Math.floor(Math.random()*pool.length)];
  var who=Math.floor(Math.random()*D.TRAVELERS);
  var c={id:++S.custId,who:who,item:item,wait:0,mood:0.9+Math.random()*0.4};
  S.cust.push(c);
  if(!this.silent)this.emit('customer',c);
  return c;
};
/* цена за вещь, которую отдадим этому покупателю (худшее качество из запаса) */
P.custQual=function(c){for(var q=0;q<D.QUAL.length;q++)if(this.S.inv[c.item+':'+q]>0)return q;return -1;};
P.custPrice=function(c,by){
  var gd=D.GOOD_BY[c.item],q=Math.max(0,this.custQual(c));
  var p=gd.price*D.QUAL[q]*D.decorMult(this.buildLvl('decor'))*(this.collDone(gd.m)?D.COLL_PRICE:1);
  return Math.round(by==='hostess'?p:p*c.mood);
};
P.custRemove=function(c){var a=this.S.cust,i=a.indexOf(c);if(i>=0)a.splice(i,1);};
P.custById=function(id){var a=this.S.cust;for(var i=0;i<a.length;i++)if(a[i].id===id)return a[i];return null;};
P.sellTo=function(c,mode){
  var S=this.S;if(!c||this.custQual(c)<0)return false;
  var price=this.custPrice(c,mode==='hostess'?'hostess':null);
  if(mode==='up'){
    if(Math.random()<D.HAGGLE_FAIL){this.custRemove(c);S.rep=Math.max(0,S.rep-1);this.emit('custLeft',{c:c,why:'haggle'});return false;}
    price=Math.round(price*(1+D.HAGGLE_UP));
  }else if(mode==='down'){price=Math.round(price*(1-D.DISCOUNT));S.rep=Math.min(200,S.rep+2);}
  var q=this.invTake(c.item,false);
  S.gold+=price;S.stats.sold++;S.stats.goldEarned+=price;S.rep=Math.min(200,S.rep+0.5);
  if(this.rep){this.rep.sold++;this.rep.gold+=price;}
  this.custRemove(c);
  this.emit('sale',{c:c,price:price,q:q,mode:mode||'sell'});
  this.guestTry(c);
  return true;
};
P.refuse=function(c){if(!c)return false;this.custRemove(c);this.emit('custLeft',{c:c,why:'refuse'});return true;};
P.tickCustomers=function(dt){
  var S=this.S,off=!!this.rep;
  if(!this.isOpen()){if(S.cust.length){S.cust.length=0;this.emit('closed');}S.custAcc=0;return;}
  var max=D.custMax(this.buildLvl('hall'));
  S.custAcc+=D.custRate(this.buildLvl('hall'),S.rep)/60*dt;
  while(S.custAcc>=1){
    S.custAcc-=1;
    if(off){   /* офлайн: хозяйка продаёт сразу, если нужная вещь есть, иначе путник уходит */
      var oc=this.spawnCustomer();if(!oc)break;
      if(this.custQual(oc)>=0)this.sellTo(oc,'hostess');else{this.custRemove(oc);this.guestTry(oc);}
      continue;
    }
    if(S.cust.length<max)this.spawnCustomer();
  }
  for(var i=S.cust.length-1;i>=0;i--){
    var c=S.cust[i];c.wait+=dt;
    if((off||c.wait>=D.HOSTESS_AFTER)&&this.custQual(c)>=0){this.sellTo(c,'hostess');continue;}
    if(c.wait>=D.CUST_PATIENCE||(off&&this.custQual(c)<0)){this.custRemove(c);this.emit('custLeft',{c:c,why:'wait'});this.guestTry(c);}
  }
};
P.tavernTick=function(dt){this.tickMasters(dt);this.tickProd(dt);this.tickCustomers(dt);this.tickTav(dt);this.tickPets(dt);};

/* ════════ ГОСТИ, ПОВАР И ПИВОВАР (v16) ════════ */
P.tav=function(){var S=this.S;if(!S.tav)S.tav=tavDefaults();return S.tav;};
P.worker=function(w){return this.tav()[w];};
P.seatCost=function(){var T=this.tav();return T.seats>=D.seatMax(this.buildLvl('hall'))?null:D.seatCost(T.seats);};
P.buySeat=function(){var c=this.seatCost();if(!c||!this.pay(c))return false;this.tav().seats++;this.emit('seat',this.tav().seats);return true;};
/* свободное место: номер стула от 0 до мест-1 */
P.freeSeat=function(){var T=this.tav(),used={};T.guests.forEach(function(x){used[x.seat]=1;});for(var i=0;i<T.seats;i++)if(!used[i])return i;return -1;};
/* путник садится за стол; садясь, заказывает пиво и, может быть, блюдо */
P.guestTry=function(c){
  if(!this.isOpen()||Math.random()>=D.GUEST_CHANCE)return false;
  var T=this.tav(),seat=this.freeSeat();if(seat<0)return false;
  var gst={id:c.id,who:c.who,seat:seat,t:D.GUEST_SIT};T.guests.push(gst);
  this.serve('brewer');
  if(Math.random()<D.GUEST_FOOD)this.serve('cook');
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
P.guestsH=function(){var T=this.tav(),flow=D.custRate(this.buildLvl('hall'),this.S.rep)*60*D.GUEST_CHANCE;return Math.min(flow,T.seats*3600/D.GUEST_SIT);};
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
  if(!S.tav)S.tav=tavDefaults();
  var td=tavDefaults();for(k in td)if(S.tav[k]===undefined)S.tav[k]=td[k];
  D.WORKER_ORDER.forEach(function(w){var wd=workerDefaults();for(var j in wd)if(S.tav[w][j]===undefined)S.tav[w][j]=wd[j];});
  S.tav.guests=S.tav.guests.filter(function(x){return x.seat<S.tav.seats;});
  if(S.use.p_heal===undefined)S.use.p_heal=true;
  S.cust=S.cust.filter(function(c){return D.GOOD_BY[c.item];});
};

/* сохранение v1 (золото, уровни) -> v2: персонаж и гардероб остаются, прогресс заново */
function migrate(old,v){
  if(v>=2)return old;
  var n={profile:old.profile||null,look:old.look||null,wardrobe:old.wardrobe,settings:{gfx:(old.settings&&old.settings.gfx)||'auto',panel:old.settings&&old.settings.panel},
    lastSeen:0,migratedV8:!!old.profile};
  return n;
}

var api={Game:Game,defaults:defaults,migrate:migrate};
if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.AcGame=api;
})(this);
