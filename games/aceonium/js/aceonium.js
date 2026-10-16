/* Aceonium: запуск, главный цикл, связка логики со сценой и интерфейсом. */
(function(){
'use strict';

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
  D.ROBES.forEach(function(r){if(r.lvl===e.L)UI.toast(UI.t('toast.robe',{s:UI.t('robe.'+r.id)}));});
  if(e.L===D.TAVERN_LEVEL&&!S.tavern)UI.rebuild();
  save();
});
game.on('bossFail',function(){if(has3d)Scene3D.retreat();UI.banner(UI.t('boss.fail'),UI.t('boss.failSub'),'red');Sound.sfx('lose');save();});
game.on('retreat',function(){if(has3d)Scene3D.retreat();});
game.on('skill',function(id){Sound.sfx('check');if(id==='discharge'&&has3d&&game.R.phase==='fight')Scene3D.bolt('discharge',false);});
game.on('unlock',function(id){UI.toast(UI.t('toast.unlock',{s:UI.t('sk.'+id)}));if(UI.tab==='skills')UI.rebuild();});
game.on('buy',function(kind){if(kind==='staff'&&has3d)Scene3D.setTier(D.staffTier(S.staff),D.TIER_COLORS);});
game.on('look',function(){if(has3d&&S.profile)Scene3D.setLook(UI.look(S.profile.gender,S.wardrobe.robe));UI.panel();});
game.on('prestige',function(){if(has3d)Scene3D.setTier(0,D.TIER_COLORS);save();});
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
    Scene3D.frame(Math.min(dt,0.05),dt);
  }
  uiT+=dt;
  if(uiT>0.1){uiT=0;UI.hud();}
  requestAnimationFrame(loop);
}
setInterval(function(){UI.panel();},250);

/* ── старт ── */
function begin(){
  if(S.profile){
    var away=S.lastSeen?(Date.now()-S.lastSeen)/1000:0;
    if(away<0){UI.toast(UI.t('toast.clock'));away=0;}
    if(has3d){Scene3D.setLook(UI.look(S.profile.gender,S.wardrobe.robe));Scene3D.setTier(D.staffTier(S.staff),D.TIER_COLORS);
      showPlace(S.place,true);}
    if(away>5)catchUp(away,false);else game.start();
  }else{
    UI.showCreate(function(){
      if(has3d){Scene3D.setLook(UI.look(S.profile.gender,S.wardrobe.robe));showPlace('road',true);}
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
    Scene3D.init(document.getElementById('canvas-host'));
    has3d=true;begin();
  }).catch(function(e){console.warn('[aceonium] 3D off',e);no3d();});
}else no3d();
})();
