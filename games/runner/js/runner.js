/* A.C.EON RUNNER: меню, режимы, управление, статистика.
   Бесконечный бег и забег дня (endless.js), приключение (adventure.js, уровни в levels.js),
   движение героя в physics.js, рисование в view.js, тексты в lang.js. */
(function(){
'use strict';

var t=I18n.t,A=window.Arcade,E=window.RunEndless,ADV=window.RunAdv,LV=window.RunLevels;
var $=function(id){return document.getElementById(id);};
function show(id){$(id).classList.remove('hidden');}
function hide(id){$(id).classList.add('hidden');}

var MODES=['endless','adventure','daily'];
var ART=new URL('../art/runner/',location.href).href;
/* картинки от Codex: пока не выложены, false; тогда всё рисуется кодом и лишних запросов нет */
var ART_READY=true;

Store.define('runner',{
  version:1,
  defaults:{settings:{mode:'endless',world:0,level:0,buttons:'auto',jump:'charge'},
    stats:{runs:0,best:0,bestCoins:0,coins:0,meters:0,jumps:0},
    adv:{unlocked:0,stars:{},best:{}},
    daily:{history:{},streak:0,lastDate:0}}
});
var DB=Store.get('runner'),S=DB.settings,ST=DB.stats,AD=DB.adv,DY=DB.daily;
if(MODES.indexOf(S.mode)<0)S.mode='endless';
AD.unlocked=Math.max(0,Math.min(LV.COUNT-1,AD.unlocked|0));
S.level=Math.max(0,Math.min(AD.unlocked,S.level|0));
S.world=Math.floor(S.level/5);
if(['auto','on','off'].indexOf(S.buttons)<0)S.buttons='auto';
if(['charge','tap'].indexOf(S.jump)<0)S.jump='charge';
RunPhys.C.MODE=S.jump;
function save(){Store.save('runner');}

/* ── звуки ── */
Sound.define('rJump',function(tm,tone){tone(tm,330,0.12,'square',0.04,660);});
Sound.define('rLand',function(tm,tone,noise){noise(tm,0.05,0.2,600);});
Sound.define('rCoin',function(tm,tone){tone(tm,988,0.05,'square',0.035);tone(tm+0.05,1319,0.08,'square',0.035);});
Sound.define('rGem',function(tm,tone){[1047,1319,1568,2093].forEach(function(f,i){tone(tm+i*0.04,f,0.08,'triangle',0.05);});});
Sound.define('rPower',function(tm,tone){tone(tm,440,0.25,'sawtooth',0.04,1320);});
Sound.define('rHurt',function(tm,tone,noise){noise(tm,0.15,0.4,900);tone(tm,200,0.2,'square',0.06,90);});
Sound.define('rStomp',function(tm,tone){tone(tm,260,0.1,'square',0.06,120);});
Sound.define('rSpring',function(tm,tone){tone(tm,200,0.25,'sine',0.07,900);});
Sound.define('rStar',function(tm,tone){[784,988,1175,1568].forEach(function(f,i){tone(tm+i*0.07,f,0.14,'triangle',0.07);});});
Sound.define('rCheck',function(tm,tone){tone(tm,523,0.1,'triangle',0.06);tone(tm+0.1,784,0.16,'triangle',0.06);});
Sound.define('rDoor',function(tm,tone,noise){noise(tm,0.3,0.3,500);tone(tm,120,0.3,'sawtooth',0.05,320);});

var G=null,view=null;

/* ── дата забега дня (UTC, одинаковая у всех) ── */
function dayNum(d){return d.getUTCFullYear()*10000+(d.getUTCMonth()+1)*100+d.getUTCDate();}
function today(){return dayNum(new Date());}
function dayShift(num,k){var d=new Date(Date.UTC(Math.floor(num/10000),Math.floor(num/100)%100-1,num%100));d.setUTCDate(d.getUTCDate()+k);return dayNum(d);}
function dayRec(n){return DY.history[n]||{b:0,n:0};}

/* ════════ МЕНЮ ════════ */
function buildModes(){
  var list=$('mode-list');list.innerHTML='';
  MODES.forEach(function(m){
    var b=document.createElement('button');
    b.type='button';b.className='m-card-btn'+(S.mode===m?' sel':'');
    var ico=ART_READY?'<img class="m-img" alt="" src="'+ART+'mode_'+m+'.webp">':'<span class="m-ico m-ico-'+m+'"><i></i></span>';
    b.innerHTML=ico+'<span class="m-txt"><span class="m-name" data-i18n="mode.'+m+'"></span><span class="m-desc" data-i18n="desc.'+m+'"></span></span>';
    b.addEventListener('click',function(){S.mode=m;save();paintMenu();Sound.sfx('select');});
    list.appendChild(b);
  });
  I18n.apply(list);
}
function starsOf(n){return (AD.stars[n]||[]).length;}
function starSvg(n,max){var h='';for(var i=0;i<(max||3);i++)h+='<svg class="star'+(i<n?' on':'')+'" viewBox="0 0 10 10"><path d="M5 .5l1.4 2.9 3.1.4-2.3 2.2.6 3.1L5 7.6 2.2 9.1l.6-3.1L.5 3.8l3.1-.4z"/></svg>';return h;}
function buildAdv(){
  var tabs='';
  RunArt.WORLDS.forEach(function(w,i){
    var locked=i*5>AD.unlocked;
    tabs+='<button type="button" class="wt'+(S.world===i?' sel':'')+(locked?' locked':'')+'" data-w="'+i+'"'+(locked?' disabled':'')+'>'+
      (ART_READY?'<img alt="" src="'+ART+'world_'+w+'.webp">':'<span class="wt-pv wt-'+w+'"></span>')+'<span data-i18n="world.'+w+'"></span></button>';
  });
  $('worlds').innerHTML=tabs;
  var h='';
  for(var i=S.world*5;i<S.world*5+5;i++){
    var locked=i>AD.unlocked,b=AD.best[i];
    h+='<button type="button" class="lv'+(locked?' locked':'')+(i===S.level?' sel':'')+(i%5===4?' auto':'')+'" data-i="'+i+'"'+(locked?' disabled':'')+'>'+
      '<b>'+(Math.floor(i/5)+1)+'-'+(i%5+1)+'</b><span class="lv-st">'+(locked?'':starSvg(starsOf(i)))+'</span>'+(b?'<i>'+fmt(b.time)+'</i>':'')+'</button>';
  }
  $('levels').innerHTML=h;
  var tot=0;for(var k=0;k<LV.COUNT;k++)tot+=starsOf(k);
  $('adv-stars').textContent=t('adv.stars',{n:tot,m:LV.COUNT*3});
  $('lv-note').textContent=t(S.level%5===4?'adv.bossNote':'adv.autoNote');
  I18n.apply($('adv-box'));
}
function buildDaily(){
  var num=today(),r=dayRec(num),h='';
  h+='<div class="dl-row"><span>'+t('daily.best')+'</span><b>'+(Math.floor(r.b)||'-')+'</b></div>';
  h+='<div class="dl-row"><span>'+t('daily.tries')+'</span><b>'+r.n+'</b></div><div class="dl-week">';
  for(var k=-6;k<=0;k++){var d=dayShift(num,k),x=dayRec(d);h+='<div class="dl-day'+(x.n?' ok':'')+(k===0?' now':'')+'"><b>'+(d%100)+'</b><span>'+(x.b?Math.floor(x.b):'')+'</span></div>';}
  $('daily-box').innerHTML='<h2 class="m-h m-h2">'+t('daily.today',{d:fmtDay(num)})+'</h2>'+h+'</div><div class="opt-note">'+t('daily.note')+'</div>';
}
function fmtDay(n){var d=n%100,m=Math.floor(n/100)%100;return (d<10?'0':'')+d+'.'+(m<10?'0':'')+m;}
function buildStats(){
  var tot=0;for(var k=0;k<LV.COUNT;k++)tot+=starsOf(k);
  function row(k,v){return '<div class="ov-row"><span>'+t(k)+'</span><b>'+v+'</b></div>';}
  $('stats').innerHTML=row('st.best',Math.floor(ST.best)+' '+t('u.m'))+row('st.bestCoins',ST.bestCoins)+row('st.runs',ST.runs)+
    row('st.meters',Math.floor(ST.meters)+' '+t('u.m'))+row('st.coins',ST.coins)+row('st.levels',Math.min(LV.COUNT,AD.unlocked+(AD.best[LV.COUNT-1]?1:0))+' / '+LV.COUNT)+row('st.stars',tot+' / '+LV.COUNT*3);
}
function paintMenu(){
  buildModes();buildStats();
  $('adv-box').classList.toggle('hidden',S.mode!=='adventure');
  $('daily-box').classList.toggle('hidden',S.mode!=='daily');
  if(S.mode==='adventure')buildAdv();
  if(S.mode==='daily')buildDaily();
  var list=document.querySelectorAll('#seg-buttons .seg-btn');
  for(var i=0;i<list.length;i++)list[i].classList.toggle('sel',list[i].getAttribute('data-v')===S.buttons);
  list=document.querySelectorAll('#seg-jump .seg-btn');
  for(i=0;i<list.length;i++)list[i].classList.toggle('sel',list[i].getAttribute('data-v')===S.jump);
}
function showScreen(name){
  document.body.classList.toggle('screen-menu',name==='menu');
  document.body.classList.toggle('screen-game',name==='game');
  if(name==='menu'){paintMenu();hide('over-modal');hide('clear-modal');}
  Sound.music(name==='menu'?'menu':'game');
  window.scrollTo(0,0);
  if(name==='game'){layout();requestAnimationFrame(layout);setTimeout(layout,250);}
}

/* ════════ ИГРА ════════ */
function newGame(){
  var st;
  if(S.mode==='adventure')st=ADV.create(S.level);
  else if(S.mode==='daily'){var num=today(),r=dayRec(num);r.n++;DY.history[num]=r;st=E.create({seed:num*7+3,daily:true});st.date=num;}
  else st=E.create({});
  G={st:st,paused:false,over:false};
  ST.runs+=st.mode==='adv'?0:1;save();
  A.trackPlay();
  view.reset();
  hide('over-modal');hide('clear-modal');hide('pause-ov');
  $('fx').innerHTML='';hudCache='';
  $('hint').classList.toggle('hidden',st.mode==='adv');
  showScreen('game');
}
function setPause(on){
  if(!G||G.over)return;
  G.paused=on;$('pause-ov').classList.toggle('hidden',!on);
  if(on)Sound.duck(0.4,600);
  keys={};Sound.sfx('select');
}
function playing(){return G&&!G.over&&!G.paused&&document.body.classList.contains('screen-game');}

function onEvent(ev){
  var st=G.st;
  view.event(ev,st);
  switch(ev.type){
    case 'jump':Sound.sfx('rJump');$('hint').classList.add('hidden');break;
    case 'land':Sound.sfx('rLand');break;
    case 'coin':Sound.sfx('rCoin');break;
    case 'gem':Sound.sfx('rGem');break;
    case 'power':Sound.sfx('rPower');pop(t('pow.'+ev.k),'good');break;
    case 'shieldHit':Sound.sfx('rHurt');pop(t('pop.shield'),'bad');break;
    case 'biome':pop(t('world.'+RunArt.WORLDS[ev.b]),'big');break;
    case 'over':Sound.sfx('rHurt');endRun();break;
    case 'hurt':Sound.sfx('rHurt');break;
    case 'die':case 'fall':Sound.sfx('lose');pop(t('pop.die'),'bad');break;
    case 'stomp':Sound.sfx('rStomp');break;
    case 'spring':Sound.sfx('rSpring');break;
    case 'star':Sound.sfx('rStar');pop(t('pop.star',{n:st.stars.length}),'big');break;
    case 'heart':Sound.sfx('rGem');break;
    case 'key':Sound.sfx('rDoor');pop(t('pop.key'),'good');break;
    case 'check':Sound.sfx('rCheck');pop(t('pop.check'),'good');break;
    case 'clear':levelDone();break;
  }
}
var popN=0;
function pop(txt,cls){
  var el=document.createElement('div');el.className='pop '+(cls||'');el.textContent=txt;
  el.style.top=(26+(popN++%3)*8)+'%';$('fx').appendChild(el);
  setTimeout(function(){if(el.parentNode)el.parentNode.removeChild(el);},1500);
}
function row(k,v){return '<div class="ov-row"><span>'+t(k)+'</span><b>'+v+'</b></div>';}
/* конец забега (бесконечный и забег дня) */
function endRun(){
  var st=G.st;G.over=true;
  var sc=Math.floor(st.score),dm=Math.floor(st.meters),rec=false;
  ST.meters+=st.meters;ST.coins+=st.coins;ST.jumps+=st.jumps;
  /* рекорд считаем по дистанции, очки (с ускорением x2) идут в забег дня */
  if(dm>ST.best){ST.best=dm;rec=true;}
  if(st.coins>ST.bestCoins)ST.bestCoins=st.coins;
  var dayRow='';
  if(st.mode==='daily'){var r=dayRec(st.date);if(sc>r.b){r.b=sc;}DY.history[st.date]=r;dayRow=row('daily.best',Math.floor(r.b));
    var ks=Object.keys(DY.history).sort();while(ks.length>40)delete DY.history[ks.shift()];}
  save();
  A.setHi('pf',dm);
  Sound.duck(0.3,2000);
  $('over-title').textContent=t('over.title');
  $('over-rows').innerHTML=row('over.score',sc)+row('over.dist',Math.floor(st.meters)+' '+t('u.m'))+row('over.coins',st.coins)+row('over.jumps',st.jumps)+dayRow+row('st.best',Math.floor(ST.best)+' '+t('u.m'));
  $('over-rec').classList.toggle('hidden',!rec||st.mode==='daily');
  setTimeout(function(){if(G&&G.over)show('over-modal');},1000);
}
/* уровень пройден */
function levelDone(){
  var st=G.st;G.over=true;
  var n=st.n,prev=AD.stars[n]||[],set={};prev.concat(st.stars).forEach(function(id){set[id]=1;});
  AD.stars[n]=Object.keys(set).map(Number);
  var b=AD.best[n],rec=!b||st.time<b.time;
  AD.best[n]={time:rec?st.time:b.time,coins:Math.max(b?b.coins:0,st.coins)};
  if(n+1<LV.COUNT)AD.unlocked=Math.max(AD.unlocked,n+1);
  ST.coins+=st.coins;
  S.level=Math.min(LV.COUNT-1,n+1);S.world=Math.floor(S.level/5);
  save();
  Sound.sfx('win');Sound.duck(0.3,2000);
  $('clear-stars').innerHTML=starSvg(st.stars.length);
  $('clear-rows').innerHTML=row('clear.level',(Math.floor(n/5)+1)+'-'+(n%5+1))+row('clear.coins',st.coins+' / '+st.coinTotal)+row('clear.time',fmt(st.time))+row('clear.deaths',st.deaths)+
    row('clear.total',starSvg(AD.stars[n].length));
  $('clear-rec').classList.toggle('hidden',!rec||!b);
  $('clear-next').classList.toggle('hidden',n+1>=LV.COUNT);
  setTimeout(function(){if(G&&G.over)show('clear-modal');},700);
}
function fmt(s){s=Math.max(0,s);var m=Math.floor(s/60),r=Math.floor(s%60);return m+':'+(r<10?'0':'')+r;}

/* ════════ ВВОД ════════ */
var keys={},hit=false;
function inp(){
  var i={left:!!keys.l,right:!!keys.r,jump:!!keys.j,jumpHit:hit,down:!!keys.d};
  hit=false;return i;
}
var KEYMAP={ArrowLeft:'l',KeyA:'l',ArrowRight:'r',KeyD:'r',ArrowUp:'j',KeyW:'j',Space:'j',ArrowDown:'d',KeyS:'d'};
document.addEventListener('keydown',function(e){
  if(!G||!document.body.classList.contains('screen-game'))return;
  if(e.code==='Escape'||e.code==='KeyP'){e.preventDefault();if(!G.over)setPause(!G.paused);return;}
  if(G.over&&(e.code==='Space'||e.code==='Enter')){e.preventDefault();return;}
  if(G.paused&&e.code==='Enter'){setPause(false);return;}
  var k=KEYMAP[e.code];if(!k)return;
  e.preventDefault();
  if(k==='j'&&!keys.j&&!e.repeat)hit=true;
  keys[k]=1;
});
document.addEventListener('keyup',function(e){var k=KEYMAP[e.code];if(k)keys[k]=0;});
window.addEventListener('blur',function(){keys={};});
/* касание: в бесконечном беге касание = прыжок (держать = выше), свайп вниз = пригнуться/вниз */
function bindTouch(){
  var zone=$('arena'),sy=0,id=null;
  function skip(e){var n=e.target;while(n&&n!==zone){if(n.tagName==='BUTTON'||n.id==='tpad')return true;n=n.parentNode;}return false;}
  function down(y,pid){
    if(!G||G.over)return;
    if(G.paused){setPause(false);return;}
    if(G.st.mode==='adv'&&padOn())return;
    sy=y;id=pid;keys.j=1;hit=true;
  }
  function move(y,pid){if(pid!==id)return;if(y-sy>40){keys.j=0;keys.d=1;}}
  function up(pid){if(pid!==id)return;id=null;keys.j=0;keys.d=0;}
  if(window.PointerEvent){
    zone.addEventListener('pointerdown',function(e){if(skip(e))return;if(e.pointerType==='mouse'&&e.button!==0)return;e.preventDefault();down(e.clientY,e.pointerId);});
    zone.addEventListener('pointermove',function(e){move(e.clientY,e.pointerId);});
    zone.addEventListener('pointerup',function(e){up(e.pointerId);});zone.addEventListener('pointercancel',function(e){up(e.pointerId);});
  }else{
    zone.addEventListener('touchstart',function(e){if(skip(e))return;var p=e.changedTouches[0];down(p.clientY,p.identifier);},{passive:true});
    zone.addEventListener('touchmove',function(e){var p=e.changedTouches[0];move(p.clientY,p.identifier);},{passive:true});
    zone.addEventListener('touchend',function(e){up(e.changedTouches[0].identifier);});
  }
  /* кнопки на экране (приключение на телефоне) */
  var bs=document.querySelectorAll('#tpad .tp-b');
  for(var i=0;i<bs.length;i++)(function(b){
    var a=b.getAttribute('data-a');
    function on(e){e.preventDefault();e.stopPropagation();b.classList.add('on');if(G&&G.paused){setPause(false);return;}if(a==='j'&&!keys.j)hit=true;keys[a]=1;}
    function off(){b.classList.remove('on');keys[a]=0;}
    if(window.PointerEvent){b.addEventListener('pointerdown',on);b.addEventListener('pointerup',off);b.addEventListener('pointercancel',off);b.addEventListener('pointerleave',off);}
    else{b.addEventListener('touchstart',on);b.addEventListener('touchend',off);}
  })(bs[i]);
}
function padOn(){
  if(S.buttons==='on')return true;if(S.buttons==='off')return false;
  return !!(window.matchMedia&&window.matchMedia('(pointer:coarse)').matches)&&G&&G.st.mode==='adv';
}

/* ════════ ЦИКЛ ════════ */
var lastT=0;
function frame(now){
  requestAnimationFrame(frame);
  var dt=lastT?Math.min(0.034,(now-lastT)/1000):0.016;lastT=now;
  if(!G||!document.body.classList.contains('screen-game'))return;
  if(playing()&&!document.hidden){
    var st=G.st,i=inp();
    if(st.mode==='adv')ADV.update(st,i,dt);else E.update(st,i,dt);
    var ev=st.ev;st.ev=[];for(var k=0;k<ev.length;k++)onEvent(ev[k]);
  }
  view.draw(G.st,now);
  paintHud();
}
var hudCache='';
function paintHud(){
  var st=G.st,cells=[];
  if(st.mode==='adv'){
    cells.push(['hud.level',(Math.floor(st.n/5)+1)+'-'+(st.n%5+1)]);
    var hh='';for(var q=0;q<3;q++)hh+='<i'+(q<st.hearts?' class="on"':'')+'></i>';
    cells.push(['hud.hearts','<span class="hearts">'+hh+'</span>']);
    cells.push(['hud.coins',st.coins]);
    cells.push(['hud.stars',starSvg(st.stars.length)]);
    cells.push(['hud.time',fmt(st.time)]);
  }else{
    cells.push(['hud.score',Math.floor(st.score)]);
    cells.push(['hud.dist',Math.floor(st.meters)+' '+t('u.m')]);
    cells.push(['hud.coins',st.coins]);
    var fx='';['shield','magnet','boost'].forEach(function(k){if(st.fx[k]>0)fx+='<i class="fx-'+k+'">'+t('pow.'+k+'.s')+'</i>';});
    if(fx)cells.push(['hud.power',fx]);
  }
  var key=cells.map(function(c){return c[1];}).join('|')+I18n.lang;
  if(key===hudCache)return;hudCache=key;
  $('hud-cells').innerHTML=cells.map(function(c){return '<div class="hc"><span>'+t(c[0])+'</span><b>'+c[1]+'</b></div>';}).join('');
  $('hud-mode').textContent=t('mode.'+(st.mode==='adv'?'adventure':st.mode));
}

/* размер поля 960 x 540 под окно */
function layout(){
  if(!G||!document.body.classList.contains('screen-game'))return;
  var pad=padOn();
  $('tpad').classList.toggle('hidden',!pad);
  var arena=$('arena'),aw=arena.clientWidth-8,top=arena.getBoundingClientRect().top;
  var vh=window.innerHeight||document.documentElement.clientHeight;
  var ah=vh-top-8-(pad?($('tpad').offsetHeight||80):0);
  var sc=Math.max(0.2,Math.min(aw/960,ah/540,1.6));
  var w=Math.round(960*sc),h=Math.round(540*sc);
  $('well').style.width=w+'px';$('well').style.height=h+'px';
  view.resize(w,h);
}
var rzT;
window.addEventListener('resize',function(){clearTimeout(rzT);rzT=setTimeout(layout,80);});
window.addEventListener('orientationchange',function(){setTimeout(layout,250);});
document.addEventListener('visibilitychange',function(){if(document.hidden&&playing())setPause(true);});

function onLang(){paintMenu();hudCache='';}
function boot(){
  A.topbar('r.title');
  I18n.apply();I18n.onChange(onLang);
  view=RunView($('cv'));
  if(ART_READY)RunArt.load(ART);
  bindTouch();
  var sb=document.querySelectorAll('#seg-buttons .seg-btn');
  for(var i=0;i<sb.length;i++)(function(b){b.addEventListener('click',function(){S.buttons=b.getAttribute('data-v');save();paintMenu();Sound.sfx('select');});})(sb[i]);
  sb=document.querySelectorAll('#seg-jump .seg-btn');
  for(i=0;i<sb.length;i++)(function(b){b.addEventListener('click',function(){S.jump=b.getAttribute('data-v');RunPhys.C.MODE=S.jump;save();paintMenu();Sound.sfx('select');});})(sb[i]);
  $('adv-box').addEventListener('click',function(e){
    var n=e.target;while(n&&n!==this&&!(n.getAttribute&&(n.getAttribute('data-i')||n.getAttribute('data-w'))))n=n.parentNode;
    if(!n||n===this||n.disabled)return;
    if(n.getAttribute('data-w')!=null){S.world=+n.getAttribute('data-w');S.level=Math.min(AD.unlocked,S.world*5);}
    else S.level=+n.getAttribute('data-i');
    save();paintMenu();Sound.sfx('select');
  });
  $('btn-play').addEventListener('click',newGame);
  $('btn-menu').addEventListener('click',function(){if(G&&!G.over)G.paused=true;showScreen('menu');});
  $('btn-pause').addEventListener('click',function(){if(G)setPause(!G.paused);});
  $('po-go').addEventListener('click',function(){setPause(false);});
  $('po-restart').addEventListener('click',newGame);
  $('po-menu').addEventListener('click',function(){showScreen('menu');});
  $('over-retry').addEventListener('click',newGame);
  $('over-menu').addEventListener('click',function(){showScreen('menu');});
  $('clear-next').addEventListener('click',newGame);
  $('clear-retry').addEventListener('click',function(){S.level=G.st.n;newGame();});
  $('clear-menu').addEventListener('click',function(){showScreen('menu');});
  paintMenu();
  showScreen('menu');
  requestAnimationFrame(frame);
}

window.AceonRunner={g:function(){return G;},settings:S,db:DB,newGame:newGame,setPause:setPause,keys:function(){return keys;},hit:function(){hit=true;}};
boot();
})();
