/* Aceonium: запуск, главный цикл, связка логики со сценой и интерфейсом. */
(function(){
'use strict';
/* защита от двойного запуска (например, если index.html вставлен в файл дважды) */
if(window.__aceoniumStarted){console.warn('[aceonium] second start ignored');return;}
window.__aceoniumStarted=true;

var D=window.AcData;
window.AC_DEBUG=/[?&]debug\b/.test(location.search);

Store.define('aceonium',{version:1,defaults:AcGame.defaults()});
var S=Store.get('aceonium');
var game=new AcGame.Game(S);
window.acGame=game;   // для отладки из консоли

Arcade.topbar('ac.title');
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
    if(!o||typeof o!=='object'||!o.stats||o.coins===undefined)return false;
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
game.on('spawn',function(e){if(has3d)Scene3D.spawn(e,D.WALK_TIME);});
game.on('bolt',function(b){
  if(has3d)Scene3D.bolt(b.kind,b.crit);
  var now=performance.now();if(now-sfxT>70){sfxT=now;Sound.sfx(b.kind==='click'?'select':'move');}
});
game.on('hit',UI.onHit);
game.on('kill',function(k){if(has3d)Scene3D.kill();UI.onKill(k);Sound.sfx('capture');});
game.on('bossStart',function(){UI.banner(UI.t('boss.start'),'','red');Sound.sfx('check');});
game.on('bossWin',function(e){
  UI.banner(UI.t('boss.win'),'','gold');Sound.sfx('win');
  if(window.Wardrobe)Object.keys(Wardrobe.PAID).forEach(function(id){
    if(Wardrobe.PAID[id]===e.L){var p=id.split(':'),nm=p[0]==='staff'?UI.t('staff.'+p[1]):p[0]==='part'?UI.t('slot.'+p[1])+' '+UI.t('outfit.'+p[2]):UI.t('wd2.color',{o:UI.t('outfit.'+p[1])})+' '+(+p[2]+1);
      UI.toast(UI.t('toast.item',{s:nm}));}
  });
  if(e.L===D.TAVERN_LEVEL&&!S.tavern)UI.rebuild();
  save();
});
game.on('bossFail',function(){if(has3d)Scene3D.retreat();UI.banner(UI.t('boss.fail'),UI.t('boss.failSub'),'red');Sound.sfx('lose');save();});
game.on('retreat',function(){if(has3d)Scene3D.retreat();});
game.on('skill',function(id){Sound.sfx('check');if(id==='discharge'&&has3d&&game.R.phase==='fight')Scene3D.bolt('discharge',false);});
game.on('unlock',function(id){UI.toast(UI.t('toast.unlock',{s:UI.t('sk.'+id)}));if(UI.tab==='skills')UI.rebuild();});
game.on('buy',function(kind){if(kind==='staff'&&has3d)Scene3D.setTier(D.staffTier(S.staff),D.TIER_COLORS);});
game.on('look',function(){if(has3d&&S.profile)Scene3D.setLook(lookNow());UI.panel();save();});
game.on('prestige',function(){if(has3d){Scene3D.setTier(0,D.TIER_COLORS);if(Scene3D.setTavern)Scene3D.setTavern(S.tav);}save();});
game.on('craft',function(c){UI.onCraft(c);if(has3d&&Scene3D.craft)Scene3D.craft();});
game.on('rested',function(sec){UI.toast(UI.t('toast.rested',{m:D.REST_BUFF_MULT,t:D.fmtTime(sec,{h:UI.t('u.h'),m:UI.t('u.m'),s:UI.t('u.s')})}));});
game.on('buy',function(kind){if(kind==='tavern'&&has3d&&Scene3D.setTavern)Scene3D.setTavern(S.tav);});
var scenePlace=null;
function showPlace(place,instant){
  if(!has3d||place===scenePlace)return;
  if(place!=='road')Scene3D.retreat();
  var tav=!instant&&scenePlace!==null&&(place==='tavern'||scenePlace==='tavern');
  scenePlace=place;
  var mode=place==='road'?'walk':place;
  if(tav){portalBusy=true;Scene3D.portal(function(){portalBusy=false;Scene3D.setMode(mode);});}
  else Scene3D.setMode(mode);
}
game.on('place',function(place){showPlace(place);save();});

/* ── ввод ── */
var stage=document.getElementById('stage');
stage.addEventListener('pointerdown',function(e){
  if(e.target.closest('button,input,label,.rest,.enemy'))return;
  if(game.click()){
    var r=stage.getBoundingClientRect();UI.ripple(e.clientX-r.left,e.clientY-r.top);
  }
});
document.addEventListener('keydown',function(e){
  if(e.target.closest&&e.target.closest('input,textarea'))return;
  if(!S.profile)return;
  if(e.code==='Space'){e.preventDefault();if(!e.repeat)game.click();}
  var n=parseInt(e.key,10);
  if(n>=1&&n<=D.SKILLS.length)game.useSkill(D.SKILLS[n-1].id);
  if(e.key==='b'||e.key==='B'||e.key==='и'||e.key==='И')game.startBoss();
});

/* ── главный цикл ── */
var last=performance.now(),lastWall=Date.now(),uiT=0;
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
    if(!(window.Wardrobe&&Wardrobe.isOpen))Scene3D.frame(Math.min(dt,0.05),dt);
  }
  if(has3d)fpsWatch(dt);
  uiT+=dt;
  if(uiT>0.1){uiT=0;UI.hud();}
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
      if(Scene3D.setTavern)Scene3D.setTavern(S.tav);
      showPlace(S.place,true);}
    if(away>5)catchUp(away,false);else game.start();
  }else{
    UI.showCreate(function(){
      if(has3d){Scene3D.setLook(lookNow());Scene3D.setTier(D.staffTier(S.staff),D.TIER_COLORS);showPlace('road',true);}
      game.start();save();UI.rebuild();
    });
  }
  save();
  lastWall=Date.now();last=performance.now();
  requestAnimationFrame(loop);
  Sound.music('game');
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
