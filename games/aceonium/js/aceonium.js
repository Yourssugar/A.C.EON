/* Aceonium: запуск, главный цикл, связка логики со сценой и интерфейсом. */
(function(){
'use strict';
/* защита от двойного запуска (например, если index.html вставлен в файл дважды) */
if(window.__aceoniumStarted){console.warn('[aceonium] second start ignored');return;}
window.__aceoniumStarted=true;

var D=window.AcData;
window.AC_DEBUG=/[?&]debug\b/.test(location.search);

Store.define('aceonium',{version:2,defaults:AcGame.defaults(),migrate:AcGame.migrate});
var S=Store.get('aceonium');
var game=new AcGame.Game(S);
if(game.sanitize)game.sanitize();   // старые сохранения: слоты, рецепты, очереди
window.acGame=game;   // для отладки из консоли

Arcade.topbar('ac.title');
if(window.Help)Help.addToSettings();
document.title='ACEONIUM';
UI.init(game);

var has3d=false,portalBusy=false;

/* облик персонажа: старые сохранения без look получают облик по умолчанию */
function lookNow(){
  if(window.Avatar&&S.profile&&!S.look){S.look=Avatar.defaults(S.profile.gender);}
  return S.look||UI.look(S.profile.gender,S.wardrobe.robe);
}
/* ── сохранение ── */
function save(){S.lastSeen=Date.now();Store.save('aceonium');}
setInterval(save,10000);
document.addEventListener('visibilitychange',function(){if(document.hidden)save();});
window.addEventListener('pagehide',save);

UI.exportSave=function(){save();try{return btoa(unescape(encodeURIComponent(JSON.stringify(S))));}catch(e){return '';}};
UI.importSave=function(str){
  try{
    var o=JSON.parse(decodeURIComponent(escape(atob(str))));
    if(!o||typeof o!=='object'||!o.stats||!o.profile)return false;
    o.lastSeen=Date.now();
    localStorage.setItem('aceon:aceonium',JSON.stringify(o));
    location.reload();return true;
  }catch(e){return false;}
};
UI.resetSave=function(){
  try{localStorage.removeItem('aceon:aceonium');}catch(e){}
  window.removeEventListener('pagehide',save);
  save=function(){};
  location.reload();
};

/* ── время отсутствия ── */
function catchUp(sec,quiet){
  var rep=game.offline(sec);
  game.start();
  if(!quiet&&sec>=120)UI.offlineReport(rep);
  UI.rebuild();
  return rep;
}
UI.catchUp=function(sec){catchUp(sec,false);};

/* ── события логики ── */
var sfxT=0;
function bossWinText(e){return e.clear?(e.first?UI.t('boss.clearFirst',{t:UI.tractName(e.t)}):UI.t('boss.clear')):UI.t('boss.loot',{n:e.k});}
game.on('spawn',function(e){if(has3d)Scene3D.spawn(e,game.R.t);});
game.on('bolt',function(b){
  if(has3d)Scene3D.bolt(b.kind,b.crit);
  var now=performance.now();if(now-sfxT>70){sfxT=now;Sound.sfx(b.kind==='click'?'select':'move');}
});
game.on('hit',function(h){UI.onHit(h);if(has3d&&Scene3D.onHit&&!h.pet)Scene3D.onHit(h);});
game.on('petBite',function(b){if(has3d&&Scene3D.petBite)Scene3D.petBite(b.crit);});
game.on('bossWind',function(w){if(has3d&&Scene3D.bossWind)Scene3D.bossWind(w.rage);});
game.on('kill',function(k){if(has3d)Scene3D.kill();UI.onKill(k);Sound.sfx('capture');});
game.on('loot',UI.onLoot);
game.on('bossStart',function(){UI.banner(UI.t('boss.start'),'','red');Sound.sfx('check');});
game.on('bossWin',function(e){UI.banner(UI.t('boss.win'),bossWinText(e),'gold');Sound.sfx('win');if(has3d&&Scene3D.victory)Scene3D.victory();save();});
game.on('bossFail',function(){if(has3d)Scene3D.retreat();Sound.sfx('lose');});
game.on('mageHit',function(h){UI.onMageHit(h);if(has3d&&Scene3D.hurt)Scene3D.hurt(h);});
game.on('home',function(r){UI.onHome(r);if(UI.tab==='store'||UI.tab==='path')UI.rebuild();save();});
game.on('tractOpen',function(t){UI.toast(UI.t('toast.tract',{t:UI.tractName(t)}));if(UI.tab==='path')UI.rebuild();});
game.on('levelUp',function(n){
  UI.toast(UI.t('toast.level',{n:n}));
  if(window.Wardrobe)Object.keys(Wardrobe.PAID).forEach(function(id){
    if(Wardrobe.needLvl(id)===n){var p=id.split(':'),nm=p[0]==='staff'?UI.t('staff.'+p[1]):p[0]==='part'?UI.t('slot.'+p[1])+' '+UI.t('outfit.'+p[2]):UI.t('wd2.color',{o:UI.t('outfit.'+p[1])})+' '+(+p[2]+1);
      setTimeout(function(){UI.toast(UI.t('toast.item',{s:nm}));},3200);}
  });
  if(UI.tab==='skills')UI.rebuild();
});
game.on('skill',function(id){Sound.sfx('check');if(id==='discharge'&&has3d&&game.R.phase==='fight')Scene3D.bolt('discharge',false);});
game.on('unlock',function(id){setTimeout(function(){UI.toast(UI.t('toast.unlock',{s:UI.t('sk.'+id)}));},1600);if(UI.tab==='skills')UI.rebuild();});
game.on('buy',function(kind){if(kind==='staff'&&has3d)Scene3D.setTier(D.staffTier(S.staff),D.TIER_COLORS);save();});
game.on('rested',function(sec){UI.toast(UI.t('toast.rested',{m:D.REST_BUFF_MULT,t:D.fmtTime(sec,{h:UI.t('u.h'),m:UI.t('u.m'),s:UI.t('u.s')})}));});
game.on('look',function(){if(has3d&&S.profile)Scene3D.setLook(lookNow());UI.panel();save();});
/* таверна */
game.on('sale',function(e){if(e.mode!=='hostess'){Sound.sfx('capture');UI.toast(UI.t('tv.sold',{r:UI.itemName(e.c.item),g:D.fmt(e.price)}));}});
game.on('custLeft',function(e){if(e.why==='haggle')UI.toast(UI.t('tv.left'));});
game.on('customer',function(){if(S.place!=='road')Sound.sfx('select');});
game.on('crafted',function(e){
  if(e.r==='staff'||e.r==='bag'||e.r==='store'){UI.toast(UI.t('ord.done.'+e.r,{n:e.r==='staff'?S.staff:e.r==='bag'?S.bagLvl:S.storeLvl}));save();}
  else if(e.q===3&&!game.silent){Sound.sfx('win');UI.toast(UI.t('lg.got',{m:UI.t(e.m==='mage'?'ms.mage':'ms.'+e.m),r:UI.itemName(e.r)})+(game.bookNeed(e.r,3)?' '+UI.t('lg.kept'):''));save();}
  else if(e.q===2)UI.toast(UI.t('ms.qual',{m:UI.t(e.m==='mage'?'ms.mage':'ms.'+e.m),r:UI.itemName(e.r),q:UI.t('q.'+e.q)}));
});
game.on('mLevel',function(e){UI.toast(UI.t('ms.lvlUp',{m:UI.t('ms.'+e.m),n:e.lvl}));});
function petSync(){if(has3d&&Scene3D.setPet)Scene3D.setPet(S.pets&&S.pets.active);}
game.on('pet',function(){petSync();save();UI.panel();});
game.on('petHire',function(id){petSync();save();Sound.sfx('win');UI.toast(UI.t('pt.got',{p:UI.t('pet.'+id)}));UI.panel();});
game.on('petFound',function(id){petSync();save();if(!game.silent){Sound.sfx('win');UI.modal(UI.t('pt.foundT'),'<p>'+UI.t('pt.found',{p:UI.t('pet.'+id)})+'</p>');}});
game.on('petLevel',function(e){save();UI.toast(UI.t('pt.lvlUp',{p:UI.t('pet.'+e.id),n:e.lvl}));UI.panel();});
game.on('petTrain',function(){save();});
game.on('coll',function(e){
  var mn=UI.t(e.m==='mage'?'ms.mage':'ms.'+e.m);
  if(e.gold){Sound.sfx('win');UI.toast(UI.t('bk.goldDone',{m:mn}));}
  else if(e.done){Sound.sfx('win');UI.toast(UI.t('coll.full',{m:mn}));}
  else{Sound.sfx('capture');UI.toast(UI.t('coll.gotQ',{r:UI.itemName(e.r),q:UI.t('q.'+e.q)}));}
  save();UI.panel();
});
game.on('lock',function(){save();UI.panel();});
game.on('toolsStart',function(e){if(!game.silent)UI.toast(UI.t('ms4.started',{m:UI.t('ms.'+e.id)}));save();});
/* промыслы и стадии (v15) */
function resLine(m){var a=[];for(var k in m)if(m[k])a.push('+'+D.fmt(m[k])+' '+UI.t('res.'+k));return a.join(', ');}
game.on('prodGot',function(e){Sound.sfx('capture');UI.toast(UI.t('pd.got',{l:resLine(e.got)}));save();});
game.on('cart',function(e){if(S.place!=='road')UI.toast(UI.t('pd.cart',{l:resLine(e.got)}));save();});
game.on('built',function(e){
  save();Sound.sfx('win');
  if(e.kind==='tools')UI.toast(UI.t('tl.done',{m:UI.t('ms.'+e.id),n:e.lvl}));
  else UI.toast(e.lvl===1?UI.t('pd.builtNew',{b:UI.prodName(e.id)}):UI.t('pd.built',{b:UI.prodName(e.id),n:e.lvl}));
  UI.panel();
});
game.on('wHire',function(w){save();Sound.sfx('win');UI.toast(UI.t('wk.hired',{w:UI.t('wk.'+w)}));UI.panel();});
game.on('wLevel',function(e){save();Sound.sfx('win');UI.toast(UI.t('wk.lvlUp',{w:UI.t('wk.'+e.w),n:e.lvl}));UI.panel();});
game.on('wHelp',function(w){save();UI.toast(UI.t('wk.helpHired',{w:UI.t('wk.'+w)}));});
game.on('seat',function(n){save();UI.toast(UI.t('wk.seatGot',{n:n}));});
['invest','stage','crew','wStage'].forEach(function(n){game.on(n,function(){save();});});
['hire','learn','build','equip','order'].forEach(function(n){game.on(n,function(){save();});});
var scenePlace=null;
function sceneMode(place){return place==='road'?'walk':'tavern';}
function showPlace(place,instant){
  if(!has3d)return;
  var mode=sceneMode(place),prev=scenePlace===null?null:sceneMode(scenePlace);
  scenePlace=place;
  if(prev===mode&&!instant){applyView();return;}
  if(mode!=='walk')Scene3D.retreat();
  if(!instant&&prev!==null&&prev!==mode&&Scene3D.view==='road'){portalBusy=true;Scene3D.portal(function(){portalBusy=false;Scene3D.setMode(mode);applyView();});}
  else{Scene3D.setMode(mode);applyView();}
}
game.on('place',function(place){
  if(place==='road'&&screen==='tavern')screen='road';
  if(place!=='road'&&screen==='road')screen='tavern';
  if(place!=='road')ensureTavern();showPlace(place);UI.hud();save();
});

/* ── таверна в 3D: вид сверху, включается, когда маг дома или спит ── */
var tavLoad=null;
function tavRes(){return (Scene3D.quality==='high'||Scene3D.quality==='ultra')?'2k':'1k';}
function ensureTavern(){
  if(!has3d||!window.Tavern3D||!window.Avatar||!window.ACE_THREE)return Promise.reject(new Error('no 3d'));
  if(Tavern3D.ready)return Promise.resolve();
  if(!tavLoad){
    tavLoad=Avatar.init(window.ACE_THREE).then(function(){return Tavern3D.init(window.ACE_THREE);})
      .then(function(){return Tavern3D.load(tavRes(),function(p){UI.viewProgress(p);});});
    tavLoad.then(function(){UI.viewProgress(1);applyView();},function(e){console.warn('[aceonium] tavern',e);tavLoad=null;UI.viewProgress(-1);});
  }
  return tavLoad;
}
/* v22: три экрана. ПОХОД есть, только пока маг в походе; ТАВЕРНА и ГОРОД доступны всегда.
   screen - что выбрал игрок; маг ушёл из таверны: экран переходит на дорогу (если игрок не в городе),
   вернулся: с дороги переходит в таверну. */
var screen=S.place==='road'?'road':'tavern';
function curScreen(){return S.place==='road'?screen:(screen==='road'?'tavern':screen);}
function wantView(){return curScreen()==='road'?'road':'tavern';}
function applyView(){
  if(!has3d)return;
  var v=wantView(),sc=curScreen();
  if(v==='tavern'&&!(window.Tavern3D&&Tavern3D.ready)){if(S.place!=='road')v='road';else{v='road';sc='road';ensureTavern().catch(function(){});}}
  if(v==='tavern'){Tavern3D.setMode(sc==='city'?'city':'tavern');Tavern3D.sync(S);Scene3D.setView('tavern',S.place==='road'?null:S.place);}
  else Scene3D.setView('road');
  document.body.classList.toggle('view-tavern',v==='tavern');
  document.body.classList.toggle('view-city',v==='tavern'&&sc==='city');
  UI.setView(v);UI.setScreen(sc);
}
UI.goScreen=function(sc){
  if(sc==='road'&&S.place!=='road')return;
  screen=sc;
  if(sc!=='road')ensureTavern().then(applyView,function(){});
  applyView();
};
UI.screenNow=curScreen;
UI.toggleView=function(){if(S.place==='road')game.goHome();else game.goTrip();};
if(window.Tavern3D){
  Tavern3D.onPick(function(kind,id){
    if(kind==='store')UI.openTab('store');
    else if(kind==='prod')UI.openTab('city',id);
    else if(kind==='house'){if(id==='pets'&&window.Pets)Pets.open();else if(window.Masters)Masters.open(id);}
    else if(kind==='tavern'){UI.goScreen('tavern');}
    else if(kind==='worker')UI.openTab('tavern');
    else UI.openTab('tavern');
    Sound.sfx('select');
  });
  Tavern3D.setLabeler(UI.tavernLabel);
}

/* ── ввод ── */
var stage=document.getElementById('stage');
stage.addEventListener('pointerdown',function(e){
  if(e.target.closest('button,input,label,.rest,.enemy'))return;
  if(has3d&&Scene3D.view==='tavern')return;
  if(game.click()){
    var r=stage.getBoundingClientRect();UI.ripple(e.clientX-r.left,e.clientY-r.top);
  }
});
/* телефон: щипок и жесты над сценой не должны масштабировать страницу (iOS Safari) */
stage.addEventListener('gesturestart',function(e){e.preventDefault();});
stage.addEventListener('touchmove',function(e){if(e.touches.length>1)e.preventDefault();},{passive:false});
document.addEventListener('keydown',function(e){
  if(e.target.closest&&e.target.closest('input,textarea'))return;
  if(!S.profile)return;
  if(e.code==='Space'){e.preventDefault();if(!e.repeat)game.click();}
  var n=parseInt(e.key,10);
  if(n>=1&&n<=D.SKILLS.length)game.useSkill(D.SKILLS[n-1].id);
});

/* ── музыка (v19) ──
   spark: создание персонажа и гардероб; day: посёлок днём (два трека по очереди);
   night: маг спит; four: поход по плану из нескольких трактов; tr0-tr3: свой трек тракта.
   Смена ждёт, пока место не устоится: короткая остановка дома между походами музыку не сбивает. */
var MU='assets/music/';
Sound.playlists({spark:[MU+'spark.mp3'],day:[MU+'city.mp3',MU+'tavern_day.mp3'],night:[MU+'tavern_night.mp3'],
  four:[MU+'four.mp3'],tr0:[MU+'summer.mp3'],tr1:[MU+'autumn.mp3'],tr2:[MU+'swamp.mp3'],tr3:[MU+'pass.mp3']});
Sound.music('spark');
var mu={cur:'spark',cand:'',t:0,tripAt:0,mixed:false,live:false};
function planMixed(){
  var p=S.plan,tr=S.trip,n=0;
  for(var i=0;i<p.c.length;i++)if(p.c[i]>0&&game.tractOpen(i))n++;
  return n>=2&&p.i<D.TRACTS.length&&tr&&tr.t===p.i;
}
function musicWant(){
  if(!S.profile||(window.Wardrobe&&Wardrobe.isOpen))return 'spark';
  if(S.place==='sleep')return 'night';
  if(S.place==='road'&&S.trip){
    if(S.trip.at!==mu.tripAt){mu.tripAt=S.trip.at;mu.mixed=planMixed();}
    return mu.mixed?'four':'tr'+S.trip.t;
  }
  return 'day';
}
function musicTick(dt,now){
  if(!mu.live)return;
  var w=musicWant();
  if(w===mu.cur){mu.cand='';return;}
  if(w!==mu.cand){mu.cand=w;mu.t=0;}
  mu.t+=dt;
  var need=now||w==='spark'||mu.cur==='spark'?0:w==='day'?10:2;
  if(mu.t>=need){mu.cur=w;mu.cand='';Sound.music(w);}
}

/* ── главный цикл ── */
var last=performance.now(),lastWall=Date.now(),uiT=0,tavT=0;
function loop(now){
  var dt=(now-last)/1000;last=now;
  var wall=Date.now(),gap=(wall-lastWall)/1000;lastWall=wall;
  if(S.profile){
    if(gap>5){catchUp(gap,gap<120);dt=0.016;}
    else{
      var left=Math.min(dt,5);
      while(left>0){var st=Math.min(left,0.1);game.update(st);left-=st;}
    }
  }
  if(has3d){
    if(!portalBusy&&scenePlace==='road')Scene3D.setMode(game.R.phase==='walk'?'walk':'fight');
    Scene3D.setFatigue(S.fatigue);
    if(!(window.Wardrobe&&Wardrobe.isOpen)&&!(window.Masters&&Masters.isOpen)&&!(window.Pets&&Pets.isOpen)&&!(window.Book&&Book.isOpen))Scene3D.frame(Math.min(dt,0.05),dt);
  }
  if(has3d)fpsWatch(dt);
  tavT+=dt;if(tavT>0.3){tavT=0;if(has3d&&Scene3D.view==='tavern')Tavern3D.sync(S);}
  uiT+=dt;
  if(uiT>0.1){musicTick(uiT);uiT=0;UI.hud();}
  requestAnimationFrame(loop);
}
setInterval(function(){UI.panel();},250);

/* ── авто-качество: если кадров меньше 28 в секунду, шаг вниз ── */
var LEVELS=['low','medium','high','ultra'],fpsAcc=0,fpsN=0,fpsWarm=4;
window.acFps=0;
function fpsWatch(dt){
  if(document.hidden||dt>0.5)return;
  if(fpsWarm>0){fpsWarm-=dt;return;}
  fpsAcc+=dt;fpsN++;
  if(fpsAcc<5)return;
  var fps=fpsN/fpsAcc;fpsAcc=0;fpsN=0;window.acFps=Math.round(fps);
  if(S.settings.gfx!=='auto')return;
  var i=LEVELS.indexOf(Scene3D.quality);
  if(fps<28&&i>0){var n=LEVELS[i-1];Scene3D.setQuality(n);UI.toast(UI.t('gfx.lowered',{q:UI.t('gfx.'+n)}));fpsWarm=3;UI.rebuild();}
}
UI.setGfx=function(v){
  S.settings.gfx=v;save();
  if(has3d)Scene3D.setQuality(v==='auto'?Scene3D.detectQuality():v);
  fpsWarm=3;fpsAcc=0;fpsN=0;
};
UI.gfxNow=function(){return has3d?Scene3D.quality:null;};

/* ── старт ── */
function begin(){
  if(S.profile){
    var away=S.lastSeen?(Date.now()-S.lastSeen)/1000:0;
    if(away<0){UI.toast(UI.t('toast.clock'));away=0;}
    if(has3d){Scene3D.setLook(lookNow());Scene3D.setTier(D.staffTier(S.staff),D.TIER_COLORS);
      showPlace(S.place,true);petSync();}
    if(away>5)catchUp(away,false);else game.start();
    if(S.migratedV8){delete S.migratedV8;S.seenV8b=true;save();UI.modal(UI.t('mig.title'),UI.t('mig.body')+UI.t('v8b.body'));}
    else if(!S.seenV8b){S.seenV8b=true;S.seenV10=true;S.seenV15=true;S.seenV16=true;S.seenV17=true;S.seenV18=true;S.seenV19=true;S.seenV20=true;S.seenV22=true;S.seenV23=true;S.seenV24=true;save();UI.modal(UI.t('v8b.title'),UI.t('v8b.body'));}
    else if(!S.seenV10){S.seenV10=true;S.seenV15=true;S.seenV16=true;S.seenV17=true;S.seenV18=true;S.seenV19=true;S.seenV20=true;S.seenV22=true;S.seenV23=true;S.seenV24=true;save();UI.modal(UI.t('v10.title'),UI.t('v10.body'));}
    else if(!S.seenV15){S.seenV15=true;S.seenV16=true;S.seenV17=true;S.seenV18=true;S.seenV19=true;S.seenV20=true;S.seenV22=true;S.seenV23=true;S.seenV24=true;save();UI.modal(UI.t('v15.title'),UI.t('v15.body')+UI.t('v16.body'));}
    else if(!S.seenV16){S.seenV16=true;S.seenV17=true;S.seenV18=true;S.seenV19=true;S.seenV20=true;S.seenV22=true;S.seenV23=true;S.seenV24=true;save();UI.modal(UI.t('v16.title'),UI.t('v16.body')+UI.t('v17.body'));}
    else if(!S.seenV17){S.seenV17=true;S.seenV18=true;S.seenV19=true;S.seenV20=true;S.seenV22=true;S.seenV23=true;S.seenV24=true;save();UI.modal(UI.t('v17.title'),UI.t('v17.body')+UI.t('v18.body')+UI.t('v19.body'));}
    else if(!S.seenV18){S.seenV18=true;S.seenV19=true;S.seenV20=true;S.seenV22=true;S.seenV23=true;S.seenV24=true;save();UI.modal(UI.t('v18.title'),UI.t('v18.body')+UI.t('v19.body')+UI.t('v20.body'));}
    else if(!S.seenV19){S.seenV19=true;S.seenV20=true;S.seenV22=true;S.seenV23=true;S.seenV24=true;save();UI.modal(UI.t('v19.title'),UI.t('v19.body')+UI.t('v20.body')+UI.t('v22.body'));}
    else if(!S.seenV20){S.seenV20=true;S.seenV22=true;S.seenV23=true;S.seenV24=true;save();UI.modal(UI.t('v20.title'),UI.t('v20.body')+UI.t('v22.body'));}
    else if(!S.seenV22){S.seenV22=true;S.seenV23=true;S.seenV24=true;save();UI.modal(UI.t('v23.title'),UI.t('v23.body')+UI.t('v24.body'));}
    else if(!S.seenV23){S.seenV23=true;S.seenV24=true;save();UI.modal(UI.t('v23.title'),UI.t('v23.body')+UI.t('v24.body'));}
    else if(!S.seenV24){S.seenV24=true;save();UI.modal(UI.t('v24.title'),UI.t('v24.body'));}
  }else{
    UI.showCreate(function(){
      if(has3d){Scene3D.setLook(lookNow());Scene3D.setTier(D.staffTier(S.staff),D.TIER_COLORS);showPlace(S.place,true);}
      game.start();S.seenV8b=true;S.seenV10=true;S.seenV15=true;S.seenV16=true;S.seenV17=true;S.seenV18=true;S.seenV19=true;S.seenV20=true;S.seenV22=true;S.seenV23=true;S.seenV24=true;save();UI.rebuild();
      setTimeout(function(){UI.modal(UI.t('v8b.title'),UI.t('v8b.body'));},1500);
    });
  }
  save();
  lastWall=Date.now();last=performance.now();
  requestAnimationFrame(loop);
  /* таверну качаем заранее в фоне (на слабой графике только когда понадобится) */
  if(has3d&&Scene3D.quality!=='low')setTimeout(function(){ensureTavern().catch(function(){});},12000);
  if(has3d&&S.place!=='road')ensureTavern().catch(function(){});
  mu.live=true;musicTick(0,true);
}

function no3d(){
  var host=document.getElementById('canvas-host');
  host.innerHTML='<div class="no3d">'+UI.t('no3d')+'</div>';
  begin();
}
if(window.Scene3D&&Scene3D.supported()){
  Scene3D.load().then(function(){
    Scene3D.init(document.getElementById('canvas-host'),S.settings.gfx==='auto'?null:S.settings.gfx);
    has3d=true;begin();
  }).catch(function(e){console.warn('[aceonium] 3D off',e);no3d();});
}else no3d();
})();
