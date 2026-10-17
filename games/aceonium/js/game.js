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
    m[d.id]={hired:d.hire===0,lvl:1,xp:0,tools:0,slots:D.SLOTS0,known:known,q:[]};
  });
  return m;
}
function defaults(){
  var skills={};D.SKILLS.forEach(function(s){skills[s.id]={l:1,cd:0,act:0};});
  return {
    profile:null,                                   // {name,gender:'m'|'f',created}
    look:null,                                      // облик 3D-персонажа (avatar.js)
    wardrobe:{owned:['wander','ash','night','moss'],robe:'wander'},
    mlvl:1,xp:0,spent:0,                            // уровень мага, опыт, потраченные очки умений
    staff:0,bagLvl:1,storeLvl:1,
    store:{},                                       // склад: ресурс -> количество
    tracts:[{best:0,clears:0},{best:0,clears:0},{best:0,clears:0},{best:0,clears:0}],
    lastTract:0,forceNext:null,
    plan:{c:[0,0,0,0],i:0,done:0},                  // сколько раз пройти каждый тракт
    cautious:true,auto:true,sleepAfter:false,
    trip:null,                                      // текущий поход
    place:'home',                                   // road | home | sleep
    fatigue:0,charge:0,rested:0,
    skills:skills,
    journal:[],
    gold:0,                                         // ACEONIUM, только из таверны
    inv:{},                                         // изделия: 'id:качество' -> количество
    equip:{head:null,body:null,hands:null,feet:null,amulet:null},
    use:{p_str:true,p_luck:true,p_vigor:true,p_hp:true,p_spore:true,p_ward:true},   // что брать в поход
    masters:masterDefaults(),
    build:{forge:0,tannery:0,jewelry:0,hall:0,bedroom:0,decor:0},
    mine:{lvl:0,acc:0},
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
  S.forceNext=t;this.startTrip();return true;
};

/* ── поход ── */
P.startTrip=function(){
  var S=this.S,R=this.R;
  var t=S.forceNext!==null&&S.forceNext!==undefined&&this.tractOpen(S.forceNext)?S.forceNext:this.nextTract();
  S.forceNext=null;S.lastTract=t;S.sleepAfter=false;
  S.trip={t:t,w:1,m:0,boss:false,done:false,bag:{},n:0,kills:0,bosses:0,best:0,time:0,at:Date.now(),buff:{},drank:[]};
  /* зелья с собой: по одному каждого отмеченного, лучшего качества */
  var self=this;
  D.GOODS.forEach(function(gd){
    if(gd.kind!=='potion'||!S.use[gd.id])return;
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
  if(tr.boss&&S.cautious&&!this.predictBoss().win)return 'cautious';
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
    if(tr.w>=D.WAVES){tr.done=true;first=S.tracts[tr.t].clears===0;S.tracts[tr.t].clears++;}
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
P.goHome=function(){
  if(this.S.place!=='road'||this.inBoss())return false;
  this.returnHome('manual');return true;
};
P.sleepNow=function(){
  var S=this.S;
  if(S.place==='sleep')return false;
  if(S.place==='road'){if(this.inBoss())return false;S.sleepAfter=true;this.returnHome('manual');return true;}
  this.sleep();return true;
};
P.sleep=function(){var S=this.S;S.place='sleep';S.sleepAfter=false;this.R.phase='sleep';this.emit('place','sleep');};
P.goTrip=function(){var S=this.S;if(S.place==='road')return false;S.sleepAfter=false;this.startTrip();return true;};
P.setCautious=function(on){this.S.cautious=!!on;};
P.setAuto=function(on){this.S.auto=!!on;};

/* после возвращения: спать или в новый поход */
P.homeDecide=function(){
  var S=this.S;
  if(S.sleepAfter||S.fatigue>=0.999){this.sleep();return;}
  if(S.auto)this.startTrip();
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
    if(S.fatigue>=1&&!this.inBoss()&&this.R.phase!=='dying')this.returnHome('tired');
    if(S.rested>0){S.rested=Math.max(0,S.rested-dt);if(!S.rested)this.emit('restedEnd');}
  }else if(S.place==='sleep'){
    S.fatigue=Math.max(0,S.fatigue-h/this.restH());
    S.charge+=h;S.stats.rest+=dt;
    if(S.fatigue<=0){S.place='home';this.R.phase='home';this.R.homeT=D.HOME_TIME;this.emit('wake');this.emit('place','home');}
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
        if(why)this.returnHome(why);else this.spawn();
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
      if(S.fatigue<=1e-9){S.fatigue=0;S.place='home';R.homeT=D.HOME_TIME;}
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
P.master=function(id){return this.S.masters[id];};
P.canHire=function(id){var d=D.MASTER_BY[id],m=this.master(id);return !m.hired&&(!d.build||this.S.build[d.build]>0);};
P.hire=function(id){var d=D.MASTER_BY[id];if(!this.canHire(id)||!this.pay({gold:d.hire}))return false;this.master(id).hired=true;this.emit('hire',id);return true;};
P.mSpeed=function(id){var m=this.master(id);return D.mSpeed(m.lvl,m.tools);};
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
P.pending=function(rid){var S=this.S;for(var id in S.masters){var q=S.masters[id].q;for(var i=0;i<q.length;i++)if(q[i].r===rid)return true;}return false;};
/* почему нельзя заказать: '' если можно */
P.orderBlock=function(mid,rid){
  var m=this.master(mid);
  if(!m.hired)return 'hire';
  if(m.q.length>=m.slots)return 'full';
  if(D.ORDERS[rid]){if(D.ORDERS[rid].m!==mid)return 'no';if(this.pending(rid))return 'pending';if(!this.orderCost(rid))return 'max';}
  else if(m.known.indexOf(rid)<0)return 'unknown';
  if(!this.canPay(this.orderCost(rid)))return 'cost';
  return '';
};
P.order=function(mid,rid){
  if(this.orderBlock(mid,rid))return false;
  var c=this.orderCost(rid),T=this.orderTime(rid);
  this.pay(c);
  this.master(mid).q.push({r:rid,t:T,T:T,c:JSON.parse(JSON.stringify(c))});
  this.emit('order',{m:mid,r:rid});return true;
};
P.cancel=function(mid,i){var q=this.master(mid).q,o=q[i];if(!o)return false;this.refund(o.c);q.splice(i,1);this.emit('order',{m:mid});return true;};
P.toolsCost=function(mid){var m=this.master(mid);return m.tools>=D.TOOLS_MAX?null:D.toolsCost(D.MASTER_BY[mid],m.tools);};
P.buyTools=function(mid){var c=this.toolsCost(mid);if(!c||!this.master(mid).hired||!this.pay(c))return false;this.master(mid).tools++;this.emit('buy','tools');return true;};
P.slotCost=function(mid){var m=this.master(mid);return m.slots>=D.SLOTS_MAX?null:D.slotCost(m.slots);};
P.buySlot=function(mid){var c=this.slotCost(mid);if(!c||!this.master(mid).hired||!this.pay(c))return false;this.master(mid).slots++;this.emit('buy','slot');return true;};
/* учитель: рецепт за золото, когда мастер дорос до уровня рецепта */
P.canLearn=function(rid){var gd=D.GOOD_BY[rid],m=this.master(gd.m);return m.hired&&m.known.indexOf(rid)<0&&m.lvl>=gd.lvl;};
P.learn=function(rid){var gd=D.GOOD_BY[rid];if(!this.canLearn(rid)||!this.pay({gold:gd.teach}))return false;this.master(gd.m).known.push(rid);this.emit('learn',rid);return true;};
P.rollQual=function(lvl){
  var ch=D.qualChance(lvl),r=Math.random();
  for(var q=D.QUAL.length-1;q>0;q--){if(r<ch[q])return q;r-=ch[q];}
  return 0;
};
P.finishOrder=function(mid,o){
  var S=this.S,m=this.master(mid),q=-1;
  if(o.r==='staff'){S.staff++;this.emit('buy','staff');}
  else if(o.r==='bag'){S.bagLvl++;this.emit('buy','bag');}
  else if(o.r==='store'){S.storeLvl++;this.emit('buy','store');}
  else{q=this.rollQual(m.lvl);this.invAdd(o.r,q,1);S.stats.crafted++;if(this.rep)this.rep.crafted++;}
  m.xp+=o.T/10;
  while(m.xp>=D.mXpNeed(m.lvl)){m.xp-=D.mXpNeed(m.lvl);m.lvl++;this.emit('mLevel',{m:mid,lvl:m.lvl});}
  this.emit('crafted',{m:mid,r:o.r,q:q});
};
P.tickMasters=function(dt){
  var S=this.S;
  for(var id in S.masters){
    var m=S.masters[id];if(!m.hired||!m.q.length)continue;
    var left=dt*this.mSpeed(id),guard=0;
    while(left>0&&m.q.length&&guard++<500){
      var o=m.q[0];
      if(o.t>left){o.t-=left;left=0;}
      else{left-=o.t;m.q.shift();this.finishOrder(id,o);}
    }
  }
};

/* ── постройки ── */
P.buildLvl=function(id){return this.S.build[id]||0;};
P.buildCost=function(id){var b=D.BUILD[id],l=this.buildLvl(id);if(b.once?l>0:l>=b.max)return null;return b.cost(l);};
P.buildUp=function(id){var c=this.buildCost(id);if(!c||!this.pay(c))return false;this.S.build[id]=this.buildLvl(id)+1;this.emit('build',id);return true;};

/* ── шахта ── */
P.mineCost=function(){var l=this.S.mine.lvl;return l===0?D.MINE.buy:l>=D.MINE.max?null:D.MINE.cost(l);};
P.mineUp=function(){var c=this.mineCost();if(!c||!this.pay(c))return false;this.S.mine.lvl++;this.emit('build','mine');return true;};
P.mineRate=function(){return this.S.mine.lvl?D.MINE.rate(this.S.mine.lvl):0;};
P.mineCap=function(){return this.S.mine.lvl?D.MINE.cap(this.S.mine.lvl):0;};
P.tickMine=function(dt){var mn=this.S.mine;if(!mn.lvl)return;mn.acc=Math.min(this.mineCap(),mn.acc+this.mineRate()*dt/60);};
P.mineCollect=function(){
  var mn=this.S.mine,room=Math.max(0,this.storeCap()-this.have('coal')),n=Math.min(Math.floor(mn.acc),room);
  if(n<=0)return 0;
  this.S.store.coal=this.have('coal')+n;mn.acc-=n;this.emit('mine',n);return n;
};

/* ── покупатели ── */
P.isOpen=function(){return this.S.place!=='sleep';};
P.knownGoods=function(){
  var S=this.S,out=[];
  for(var id in S.masters){var m=S.masters[id];if(m.hired)m.known.forEach(function(r){out.push(r);});}
  return out;
};
P.spawnCustomer=function(){
  var S=this.S,known=this.knownGoods(),self=this;if(!known.length)return;
  var stock=known.filter(function(r){return self.invCount(r)>0;});
  var pool=stock.length&&Math.random()<0.65?stock:known;
  var item=pool[Math.floor(Math.random()*pool.length)];
  var who=Math.floor(Math.random()*D.TRAVELERS);
  S.cust.push({id:++S.custId,who:who,item:item,wait:0,mood:0.9+Math.random()*0.4});
  this.emit('customer',S.cust[S.cust.length-1]);
};
/* цена за вещь, которую отдадим этому покупателю (худшее качество из запаса) */
P.custQual=function(c){for(var q=0;q<D.QUAL.length;q++)if(this.S.inv[c.item+':'+q]>0)return q;return -1;};
P.custPrice=function(c,by){
  var gd=D.GOOD_BY[c.item],q=Math.max(0,this.custQual(c));
  var p=gd.price*D.QUAL[q]*D.decorMult(this.buildLvl('decor'));
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
  return true;
};
P.refuse=function(c){if(!c)return false;this.custRemove(c);this.emit('custLeft',{c:c,why:'refuse'});return true;};
P.tickCustomers=function(dt){
  var S=this.S,off=!!this.rep;
  if(!this.isOpen()){if(S.cust.length){S.cust.length=0;this.emit('closed');}S.custAcc=0;return;}
  var max=D.custMax(this.buildLvl('hall'));
  S.custAcc+=D.custRate(this.buildLvl('hall'),S.rep)/3600*dt;
  while(S.custAcc>=1){S.custAcc-=1;if(S.cust.length<max)this.spawnCustomer();}
  for(var i=S.cust.length-1;i>=0;i--){
    var c=S.cust[i];c.wait+=dt;
    if((off||c.wait>=D.HOSTESS_AFTER)&&this.custQual(c)>=0){this.sellTo(c,'hostess');continue;}
    if(c.wait>=D.CUST_PATIENCE||(off&&this.custQual(c)<0)){this.custRemove(c);this.emit('custLeft',{c:c,why:'wait'});}
  }
};
P.tavernTick=function(dt){this.tickMasters(dt);this.tickMine(dt);this.tickCustomers(dt);};

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
