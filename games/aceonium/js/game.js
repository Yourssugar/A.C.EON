/* Aceonium: игровая логика без DOM и без 3D (v8a: походы за ресурсами).
   Состояние (S) хранится в Store('aceonium'), текущий бой (R) только в памяти.
   Сцена и интерфейс подписываются на события: game.on('kill', fn).
   Офлайн считается тем же набором функций, только без событий (silent). */
(function(root){
'use strict';

var D=root.AcData||(typeof require!=='undefined'?require('./data.js'):null);

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
    stats:{clicks:0,kills:0,bosses:0,bossFails:0,trips:0,lostBags:0,lostItems:0,gathered:0,play:0,rest:0},
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
  return m;
};
P.rawDps=function(){return D.staffDps(this.S.staff,this.S.mlvl);};
P.staffRate=function(){return D.STAFF_RATE*(this.skillOn('flurry')?this.skillPow('flurry'):1);};
P.dps=function(){return this.rawDps()*this.dmgMult()*this.staffRate()/D.STAFF_RATE;};
P.critChance=function(){var c=D.CRIT_CHANCE;if(this.skillOn('focus'))c+=this.skillPow('focus');return Math.min(1,c);};
P.critMult=function(){return D.CRIT_MULT;};
P.critFactor=function(){return 1+this.critChance()*(this.critMult()-1);};
P.effDps=function(){return this.dps()*this.critFactor();};
P.clickDmg=function(){return (this.S.mlvl+this.rawDps()*D.CLICK_DPS_SHARE)*this.dmgMult();};
P.maxHp=function(){return D.maxHp(this.S.mlvl);};
P.awakeH=function(){return D.AWAKE_H;};
P.restH=function(){return Math.max(D.REST_MIN_H,D.REST_H);};
P.skillCd=function(s){return s.cd*(1-0.04*(this.S.skills[s.id].l-1));};
P.bag=function(){return D.BAG[this.S.bagLvl-1];};
P.bagCap=function(){return this.bag().cap;};
P.storeCap=function(){return D.STORE[this.S.storeLvl-1].cap;};
P.pickMult=function(){return this.bag().pick*(this.skillOn('harvest')?this.skillPow('harvest'):1);};
P.tractOpen=function(t){return t===0||(t<D.TRACTS.length&&this.S.tracts[t-1].clears>0);};
P.dropChance=function(t,w){return Math.min(0.95,D.chance(w,this.S.tracts[t].clears>0)*this.pickMult());};
P.restBuffFor=function(hours){return Math.min(D.REST_BUFF_MAX,hours*D.REST_BUFF_PER_H);};
P.have=function(id){return this.S.store[id]||0;};
P.canPay=function(cost){if(!cost)return false;for(var k in cost)if(this.have(k)<cost[k])return false;return true;};
P.pay=function(cost){if(!this.canPay(cost))return false;for(var k in cost)this.S.store[k]-=cost[k];return true;};

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
  S.trip={t:t,w:1,m:0,boss:false,done:false,bag:{},n:0,kills:0,bosses:0,best:0,time:0,at:Date.now()};
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
    for(var k in tr.bag){
      var v=tr.bag[k];if(!v)continue;
      if(why==='defeat'){lost+=v;continue;}
      var room=Math.max(0,this.storeCap()-this.have(k)),put=Math.min(room,v);
      S.store[k]=this.have(k)+put;over+=v-put;n+=put;
      if(put)got[k]=put;
    }
    S.journal.unshift({t:tr.t,w:tr.best,why:why,got:got,n:n,lost:lost,over:over,dur:tr.time,at:Date.now()});
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
  var S=this.S,rep={sec:sec,trips:0,got:{},lost:0,lostBags:0,over:0,kills:0,bosses:0,xp:0,lv0:S.mlvl,road:0,sleep:0,home:0,j0:S.journal.length?S.journal[0].at:0};
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
      if(t+d>sec){var rest=sec-t;S.fatigue=Math.min(1,S.fatigue+rest/3600/this.awakeH());rep.road+=rest;t=sec;break;}
      t+=d;rep.road+=d;tr.time+=d;
      S.fatigue=Math.min(1,S.fatigue+d/3600/this.awakeH());
      if(S.rested>0)S.rested=Math.max(0,S.rested-d);
      if(lose){S.stats.bossFails++;this.returnHome('defeat');continue;}
      this.applyKill(e);
    }else if(S.place==='home'){
      var dh=Math.max(0.5,R.homeT||D.HOME_TIME);
      t+=dh;rep.home+=dh;R.homeT=0;
      var before=S.place;this.homeDecide();
      if(S.place==='home'&&before==='home'){rep.home+=sec-t;t=sec;}   // сам в поход не уходит: ждёт игрока
    }else{
      var need=S.fatigue*this.restH()*3600,ds=Math.min(need,sec-t);
      t+=ds;rep.sleep+=ds;S.stats.rest+=ds;
      S.fatigue=Math.max(0,S.fatigue-ds/(this.restH()*3600));S.charge+=ds/3600;
      if(S.fatigue<=1e-9){S.fatigue=0;S.place='home';R.homeT=D.HOME_TIME;}
    }
  }
  this.silent=false;this.rep=null;
  R.enemy=null;R.hits.length=0;R.after=null;
  return rep;
};

/* ── улучшения за ресурсы ── */
P.staffCost=function(){return D.staffCost(this.S.staff);};
P.buyStaff=function(){if(!this.pay(this.staffCost()))return false;this.S.staff++;this.emit('buy','staff');return true;};
P.bagCost=function(){var b=D.BAG[this.S.bagLvl];return b?b.cost:null;};
P.buyBag=function(){var c=this.bagCost();if(!c||!this.pay(c))return false;this.S.bagLvl++;this.emit('buy','bag');return true;};
P.storeCost=function(){var b=D.STORE[this.S.storeLvl];return b?b.cost:null;};
P.buyStore=function(){var c=this.storeCost();if(!c||!this.pay(c))return false;this.S.storeLvl++;this.emit('buy','store');return true;};

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
