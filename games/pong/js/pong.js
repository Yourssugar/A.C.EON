/* A.C.EON PONG: меню, матч, управление (мышь, палец, клавиши), статистика, сохранение.
   Физика и бот в rules.js, рисование в view.js, тексты в lang.js.
   Против бота вы слева (на телефоне в портрете снизу). Вдвоём: левый W/S, правый стрелки,
   на телефоне каждый водит пальцем по своей половине экрана. */
(function(){
'use strict';

var t=I18n.t,A=window.Arcade,R=window.PongRules;
var $=function(id){return document.getElementById(id);};
function show(id){$(id).classList.remove('hidden');}
function hide(id){$(id).classList.add('hidden');}

var MODES=['bot','duo','tour','squash'],LEVELS=R.LEVELS,TARGETS=[5,7,11],THEMES=['neon','retro','table'];

/* ── сохранения ── */
Store.define('pong',{
  version:1,
  defaults:{settings:{mode:'bot',level:'normal',target:7,bonus:false,theme:'neon',opp:0},stats:{},save:null,
    tour:{unlocked:0,medals:{},champ:0}}
});
/* картинки соперников и значков режимов: games/art/pong/; false: рисуются кодом */
var ART_READY=true,ART=new URL('../art/pong/',location.href).href;
var OPP=R.OPP,MEDALS=['bronze','silver','gold'];
var DB=Store.get('pong'),S=DB.settings;
if(MODES.indexOf(S.mode)<0)S.mode='bot';
if(LEVELS.indexOf(S.level)<0)S.level='normal';
if(TARGETS.indexOf(+S.target)<0)S.target=7;
S.target=+S.target;S.bonus=!!S.bonus;
var TOUR=DB.tour;TOUR.unlocked=Math.max(0,Math.min(OPP.length-1,TOUR.unlocked|0));
S.opp=Math.max(0,Math.min(TOUR.unlocked,S.opp|0));
if(THEMES.indexOf(S.theme)<0)S.theme='neon';
function save(){Store.save('pong');}
function statKey(st){return st.mode==='duo'?'duo':st.mode==='squash'?'squash':st.mode==='tour'?'tour-'+OPP[st.opp].id:'bot-'+st.level;}
function stat(k){if(!DB.stats[k])DB.stats[k]={played:0,won:0,lost:0,bestRally:0,streak:0,bestStreak:0};return DB.stats[k];}

/* ── звуки: у темы «1972» свои короткие писки, как у автомата ── */
Sound.define('pHit',function(tm,tone){tone(tm,520,0.05,'square',0.05);tone(tm,780,0.04,'triangle',0.03);});
Sound.define('pHit2',function(tm,tone){tone(tm,620,0.05,'square',0.05);tone(tm,930,0.04,'triangle',0.03);});
Sound.define('pWall',function(tm,tone){tone(tm,300,0.035,'square',0.03);});
Sound.define('pPoint',function(tm,tone){tone(tm,240,0.25,'sawtooth',0.05,120);});
Sound.define('pRetroHit',function(tm,tone){tone(tm,490,0.03,'square',0.07);});
Sound.define('pRetroWall',function(tm,tone){tone(tm,245,0.03,'square',0.07);});
Sound.define('pRetroPoint',function(tm,tone){tone(tm,245,0.26,'square',0.07);});
Sound.define('pBonus',function(tm,tone){[660,880,1320].forEach(function(f,i){tone(tm+i*0.05,f,0.08,'triangle',0.06);});});
Sound.define('pShield',function(tm,tone,noise){noise(tm,0.12,0.3,2500);tone(tm,900,0.12,'sine',0.05,300);});
Sound.define('pMiss',function(tm,tone){[330,247,185].forEach(function(f,i){tone(tm+i*0.09,f,0.12,'triangle',0.08);});});
Sound.define('pBounce',function(tm,tone,noise){noise(tm,0.04,0.25,1200);tone(tm,180,0.05,'square',0.04);});
Sound.define('pServe',function(tm,tone){tone(tm,880,0.06,'sine',0.04);});

var G=null;

/* ════════ МЕНЮ ════════ */
function buildModes(){
  var list=$('mode-list');list.innerHTML='';
  MODES.forEach(function(m){
    var b=document.createElement('button');
    b.type='button';b.className='m-card-btn'+(S.mode===m?' sel':'');
    var ico=ART_READY?'<img class="m-img" alt="" src="'+ART+'mode_'+m+'.webp">':'<span class="m-ico m-ico-'+m+'"><i></i><i></i><b></b></span>';
    b.innerHTML=ico+'<span class="m-txt"><span class="m-name" data-i18n="mode.'+m+'"></span><span class="m-desc" data-i18n="desc.'+m+'"></span></span>';
    b.addEventListener('click',function(){S.mode=m;save();paintMenu();Sound.sfx('select');});
    list.appendChild(b);
  });
  I18n.apply(list);
}
function buildStats(){
  var h='<div class="st-row st-head"><span></span><span data-i18n="st.games"></span><span data-i18n="st.won"></span><span data-i18n="st.rally"></span><span data-i18n="st.streak"></span></div>';
  LEVELS.forEach(function(l){
    var s=DB.stats['bot-'+l]||{played:0,won:0,bestRally:0,bestStreak:0};
    h+='<div class="st-row'+(S.mode==='bot'&&S.level===l?' cur':'')+'"><span data-i18n="lvl.'+l+'"></span><b>'+s.played+'</b><b>'+s.won+'</b><b>'+(s.bestRally||'-')+'</b><b>'+(s.bestStreak||'-')+'</b></div>';
  });
  var d=DB.stats.duo||{played:0,won:0,lost:0,bestRally:0};
  h+='<div class="st-row'+(S.mode==='duo'?' cur':'')+'"><span data-i18n="mode.duo"></span><b>'+d.played+'</b><b>'+d.won+' / '+d.lost+'</b><b>'+(d.bestRally||'-')+'</b><b>-</b></div>';
  var sq=DB.stats.squash||{played:0,best:0};
  h+='<div class="st-row'+(S.mode==='squash'?' cur':'')+'"><span data-i18n="mode.squash"></span><b>'+sq.played+'</b><b>-</b><b>'+(sq.best||'-')+'</b><b>-</b></div>';
  var tw=0,tp=0;OPP.forEach(function(o){var x=DB.stats['tour-'+o.id];if(x){tw+=x.won;tp+=x.played;}});
  h+='<div class="st-row'+(S.mode==='tour'?' cur':'')+'"><span data-i18n="mode.tour"></span><b>'+tp+'</b><b>'+tw+'</b><b>'+Object.keys(TOUR.medals).length+'/'+OPP.length+'</b><b>'+(TOUR.champ||'-')+'</b></div>';
  $('stats').innerHTML=h;I18n.apply($('stats'));
}
/* ── турнир: лестница из 8 соперников ── */
function oppPic(o,i){
  if(ART_READY)return '<img class="op-img" alt="" draggable="false" src="'+ART+'opp_'+o.id+'.webp">';
  return '<canvas class="op-cv" width="96" height="96" data-i="'+i+'"></canvas>';
}
/* робот-заглушка, пока нет портретов: голова цвета соперника */
function robot(cv,o){
  var g=cv.getContext('2d'),w=cv.width;g.clearRect(0,0,w,w);
  g.fillStyle='#0b0b24';g.fillRect(0,0,w,w);
  g.fillStyle=o.color;g.globalAlpha=0.25;g.beginPath();g.arc(w/2,w*0.55,w*0.42,0,Math.PI*2);g.fill();g.globalAlpha=1;
  g.fillStyle='#1c1c3a';g.strokeStyle=o.color;g.lineWidth=3;
  g.beginPath();g.rect(w*0.24,w*0.28,w*0.52,w*0.42);g.fill();g.stroke();
  g.fillRect(w*0.47,w*0.14,w*0.06,w*0.14);g.fillStyle=o.color;g.beginPath();g.arc(w/2,w*0.13,w*0.05,0,Math.PI*2);g.fill();
  g.fillStyle=o.color;g.shadowColor=o.color;g.shadowBlur=8;
  g.fillRect(w*0.33,w*0.42,w*0.1,w*0.1);g.fillRect(w*0.57,w*0.42,w*0.1,w*0.1);g.fillRect(w*0.38,w*0.6,w*0.24,w*0.03);
  g.shadowBlur=0;
}
function medalHtml(m){
  if(m==null)return '';
  return ART_READY?'<img class="op-medal" alt="" src="'+ART+'medal_'+MEDALS[m]+'.webp">':'<span class="op-medal m-'+MEDALS[m]+'"></span>';
}
function buildTour(){
  var box=$('tour-list'),h='';
  OPP.forEach(function(o,i){
    var locked=i>TOUR.unlocked,m=TOUR.medals[o.id];
    h+='<button type="button" class="op'+(locked?' locked':'')+(i===S.opp?' sel':'')+(i===OPP.length-1?' boss':'')+'" data-i="'+i+'" style="--oc:'+o.color+'"'+(locked?' disabled':'')+'>'+
      '<span class="op-pic">'+oppPic(o,i)+(locked?'<span class="op-lock"></span>':'')+medalHtml(m)+'</span>'+
      '<span class="op-n"><b>'+(i+1)+'</b> <span data-i18n="opp.'+o.id+'"></span></span></button>';
  });
  box.innerHTML=h;I18n.apply(box);
  var cvs=box.querySelectorAll('canvas');for(var k=0;k<cvs.length;k++)robot(cvs[k],OPP[+cvs[k].getAttribute('data-i')]);
  var o=OPP[S.opp];
  $('tour-info').innerHTML='<b style="color:'+o.color+'">'+t('opp.'+o.id)+'</b><span>'+t('oppd.'+o.id)+'</span><i>'+t('tour.match',{n:o.target})+'</i>';
  $('tour-prog').textContent=t('tour.progress',{n:Object.keys(TOUR.medals).length,m:OPP.length})+(TOUR.champ?' / '+t('tour.champs',{n:TOUR.champ}):'');
}
function buildLegend(){
  var h='';
  R.BONUS.forEach(function(b){h+='<div class="lg-row"><canvas width="40" height="40" data-b="'+b+'"></canvas><span data-i18n="bon.'+b+'"></span></div>';});
  $('legend').innerHTML=h;I18n.apply($('legend'));
  var c=$('legend').querySelectorAll('canvas');
  for(var i=0;i<c.length;i++){var g=c[i].getContext('2d');g.clearRect(0,0,40,40);PongView.icon(g,c[i].getAttribute('data-b'),20,20,17,null);}
}
function themePreview(cv,th){
  var g=cv.getContext('2d'),T=PongView.THEMES[th],w=cv.width,h=cv.height;
  g.fillStyle=T.bg;g.fillRect(0,0,w,h);
  if(T.table){g.strokeStyle=T.line;g.lineWidth=1.5;g.strokeRect(2,2,w-4,h-4);g.fillStyle='#fff';g.fillRect(w/2-1,0,2,h);}
  else{g.fillStyle=T.line;for(var y=2;y<h;y+=8)g.fillRect(w/2-1,y,2,4);}
  g.fillStyle=T.p[0];g.fillRect(5,h/2-9,4,18);
  g.fillStyle=T.p[1];g.fillRect(w-9,h/2-14,4,18);
  g.fillStyle=T.ball;
  if(T.square)g.fillRect(w*0.62-2,h*0.35-2,5,5);else{g.beginPath();g.arc(w*0.62,h*0.35,2.8,0,Math.PI*2);g.fill();}
}
function paintMenu(){
  buildModes();buildStats();buildLegend();buildTour();
  [['level',S.level],['target',String(S.target)],['bonus',S.bonus?'yes':'no']].forEach(function(x){
    var list=document.querySelectorAll('#seg-'+x[0]+' .seg-btn');
    for(var i=0;i<list.length;i++)list[i].classList.toggle('sel',list[i].getAttribute('data-v')===x[1]);
  });
  $('bot-box').classList.toggle('hidden',S.mode!=='bot');
  $('tour-box').classList.toggle('hidden',S.mode!=='tour');
  $('target-row').classList.toggle('hidden',S.mode==='tour'||S.mode==='squash');
  $('squash-note').classList.toggle('hidden',S.mode!=='squash');
  $('bonus-box').classList.toggle('hidden',S.mode==='tour');
  $('level-note').textContent=t('lvld.'+S.level);
  $('ctrl-note').textContent=t(S.mode==='duo'?'note.duo':'note.bot');
  $('legend').classList.toggle('dim',!S.bonus);
  var th=document.querySelectorAll('#themes .th-card');
  for(var i=0;i<th.length;i++){th[i].classList.toggle('sel',th[i].getAttribute('data-v')===S.theme);themePreview(th[i].querySelector('canvas'),th[i].getAttribute('data-v'));}
  $('btn-continue').classList.toggle('hidden',!((G&&!G.over)||(DB.save&&DB.save.st)));
  document.body.className=document.body.className.replace(/\bth-\w+/g,'').trim()+' th-'+S.theme;
}
function showScreen(name){
  document.body.classList.toggle('screen-menu',name==='menu');
  document.body.classList.toggle('screen-game',name==='game');
  if(name==='menu'){persist();paintMenu();hide('over-modal');}
  Sound.music(name==='menu'?'menu':'game');
  window.scrollTo(0,0);
  if(name==='game'){layout();requestAnimationFrame(layout);setTimeout(layout,250);}
}

/* ════════ МАТЧ ════════ */
function newGame(){
  var st=R.create({mode:S.mode,level:S.level,target:S.target,bonus:S.bonus,opp:S.opp});
  G={st:st,paused:false,over:false,theme:S.theme};
  stat(statKey(st)).played++;save();
  A.trackPlay();
  hide('over-modal');hide('pause-ov');
  $('fx').innerHTML='';
  scoreCache='';
  intro();
  persist();
  showScreen('game');
}
/* перед матчем турнира: кто соперник и как играет */
function intro(){
  var el=$('intro'),st=G.st;
  if(st.mode!=='tour'||st.state!=='serve'){el.classList.add('hidden');return;}
  var o=OPP[st.opp];
  el.style.setProperty('--oc',o.color);
  el.innerHTML='<div class="in-pic">'+oppPic(o,st.opp)+'</div><div class="in-txt"><span class="in-k">'+t('tour.round',{n:st.opp+1,m:OPP.length})+'</span>'+
    '<b>'+t('opp.'+o.id)+'</b><span>'+t('oppd.'+o.id)+'</span><i>'+t('tour.match',{n:o.target})+'</i></div>';
  var c=el.querySelector('canvas');if(c)robot(c,o);
  el.classList.remove('hidden');
}
function persist(){
  if(!G)return;
  if(G.over){DB.save=null;save();return;}
  G.st.ev=[];G.st.balls.forEach(function(b){b.trail=[];});
  G.st.pad.forEach(function(p){p.target=null;p.dir=0;});
  DB.save={st:G.st,theme:G.theme};save();
}
function resume(){
  if((!G||G.over)&&DB.save&&DB.save.st)G={st:DB.save.st,paused:true,over:false,theme:DB.save.theme||S.theme};
  if(!G)return;
  G.paused=true;hide('over-modal');show('pause-ov');scoreCache='';
  showScreen('game');
}
function setPause(on){
  if(!G||G.over)return;
  G.paused=on;
  $('pause-ov').classList.toggle('hidden',!on);
  if(on){persist();Sound.duck(0.4,600);}
  keys={};G.st.pad.forEach(function(p){p.dir=0;});
  Sound.sfx('select');
}
function playing(){return G&&!G.over&&!G.paused&&document.body.classList.contains('screen-game');}

/* ── события правил ── */
function onEvent(ev){
  var st=G.st,retro=G.theme==='retro';
  view.event(ev,st,G.theme);
  switch(ev.type){
    case 'hit':
      Sound.sfx(retro?'pRetroHit':ev.side?'pHit2':'pHit');
      if(st.mode==='squash'){if(st.hits[0]%25===0)pop(t('pop.rally',{n:st.hits[0]}),'combo');}
      else if(st.rally>=10&&st.rally%10===0)pop(t('pop.rally',{n:st.rally}),'combo');
      if(ev.spin&&!retro&&Math.random()<0.25)pop(t('pop.spin'),'spin');
      break;
    case 'wall':Sound.sfx(retro?'pRetroWall':'pWall');break;
    case 'serve':Sound.sfx('pServe');$('intro').classList.add('hidden');break;
    case 'bounce':Sound.sfx(retro?'pRetroWall':'pBounce');break;
    case 'miss':Sound.sfx('pMiss');if(st.lives>1||st.balls.length>1)pop(t('pop.miss',{n:Math.max(0,st.lives-(st.balls.length>1?0:1))}),'bad');break;
    case 'point':
      Sound.sfx(retro?'pRetroPoint':'pPoint');
      pop(st.mode==='duo'?t('pop.pointP',{p:t(ev.side?(rotated?'side.top':'side.right'):(rotated?'side.bottom':'side.left'))}):t(ev.side?'pop.pointBot':'pop.pointYou'),ev.side&&st.mode==='bot'?'bad':'good');
      break;
    case 'bonus':Sound.sfx('pBonus');pop(t('bon.'+ev.bonus+'.s'),'bonus');break;
    case 'bonusUp':break;
    case 'shieldHit':Sound.sfx('pShield');break;
    case 'over':finish(ev.winner);break;
  }
}
var popN=0;
function pop(txt,cls){
  var el=document.createElement('div');
  el.className='pop '+(cls||'');el.textContent=txt;
  el.style.top=(34+(popN++%3)*9)+'%';
  $('fx').appendChild(el);
  setTimeout(function(){if(el.parentNode)el.parentNode.removeChild(el);},1500);
}
function finish(winner){
  var st=G.st;if(G.over)return;
  G.over=true;
  if(st.mode==='squash'){finishSquash();return;}
  var s=stat(statKey(st)),rec=false;
  if(st.mode==='duo'){if(winner===0)s.won++;else s.lost++;}
  else if(winner===0){s.won++;s.streak=(s.streak||0)+1;if(s.streak>(s.bestStreak||0))s.bestStreak=s.streak;}
  else{s.lost++;s.streak=0;}
  if(st.bestRally>(s.bestRally||0)){s.bestRally=st.bestRally;rec=st.bestRally>=5;}
  /* турнир: медаль по разнице очков, следующий соперник открывается */
  var medal=null,champ=false;
  if(st.mode==='tour'&&winner===0){
    var o=OPP[st.opp],diff=st.score[1];
    medal=diff<=1?2:diff<=3?1:0;
    TOUR.medals[o.id]=Math.max(TOUR.medals[o.id]==null?-1:TOUR.medals[o.id],medal);
    if(st.opp+1<OPP.length){TOUR.unlocked=Math.max(TOUR.unlocked,st.opp+1);S.opp=st.opp+1;}
    else{TOUR.champ=(TOUR.champ||0)+1;champ=true;}
  }
  DB.save=null;save();
  var you=st.mode!=='duo',win=winner===0;
  Sound.sfx(you&&!win?'lose':'win');Sound.duck(0.3,2500);
  $('over-title').textContent=champ?t('tour.champ'):you?t(win?'over.win':'over.lose'):t('over.pWin',{p:t(winner?(rotated?'side.top':'side.right'):(rotated?'side.bottom':'side.left'))});
  $('over-title').className='over-title '+(you&&!win?'lose':'win');
  function row(k,v){return '<div class="ov-row"><span>'+t(k)+'</span><b>'+v+'</b></div>';}
  var h=row('over.score',st.score[0]+' : '+st.score[1])+row('over.rally',st.bestRally)+row('over.hits',st.hits[0]+' / '+st.hits[1])+
    row('over.speed',Math.round(st.topSpeed/10))+row('over.time',fmt(st.time));
  if(you&&win&&s.streak>1)h+=row('over.streak',s.streak);
  var top='';
  if(champ)top=ART_READY?'<img class="ov-trophy" alt="" src="'+ART+'trophy.webp">':'<div class="ov-trophy cup">\uD83C\uDFC6</div>';
  else if(medal!=null)top='<div class="ov-medal">'+medalHtml(medal)+'<span>'+t('medal.'+MEDALS[medal])+'</span></div>';
  if(st.mode==='tour')h=row('tour.vs',t('opp.'+OPP[st.opp].id))+h;
  $('over-rows').innerHTML=top+h;
  $('over-rec').classList.toggle('hidden',!rec);
  $('over-next').classList.toggle('hidden',!(st.mode==='tour'&&win&&!champ));
  setTimeout(function(){if(G&&G.over)show('over-modal');},900);
}
function finishSquash(){
  var st=G.st,s=stat('squash'),rec=false,n=st.hits[0];
  if(n>(s.best||0)){s.best=n;rec=n>0;}
  if(st.bestRally>(s.bestRally||0))s.bestRally=st.bestRally;
  DB.save=null;save();
  Sound.sfx(rec?'win':'lose');Sound.duck(0.3,2500);
  $('over-title').textContent=t('over.squash');$('over-title').className='over-title '+(rec?'win':'lose');
  function row(k,v){return '<div class="ov-row"><span>'+t(k)+'</span><b>'+v+'</b></div>';}
  $('over-rows').innerHTML=row('hud.hits',n)+row('st.best',s.best)+row('over.speed',Math.round(st.topSpeed/10))+row('over.time',fmt(st.time));
  $('over-rec').classList.toggle('hidden',!rec);
  hide('over-next');
  setTimeout(function(){if(G&&G.over)show('over-modal');},900);
}
function fmt(s){s=Math.max(0,Math.round(s));var m=Math.floor(s/60);s%=60;return m+':'+(s<10?'0':'')+s;}

/* ════════ ВВОД ════════ */
var keys={};
function padDir(){
  if(!G)return;
  var duo=G.st.mode==='duo';
  var l=(keys.w?-1:0)+(keys.s?1:0),r=(keys.up?-1:0)+(keys.down?1:0);
  if(duo){G.st.pad[0].dir=l;G.st.pad[1].dir=r;}
  else{G.st.pad[0].dir=Math.max(-1,Math.min(1,l+r));}
  if(l||(!duo&&r))G.st.pad[0].target=null;
  if(duo&&r)G.st.pad[1].target=null;
}
var KEYMAP={KeyW:'w',KeyS:'s',ArrowUp:'up',ArrowDown:'down'};
document.addEventListener('keydown',function(e){
  if(!G||!document.body.classList.contains('screen-game'))return;
  if(e.code==='Escape'||e.code==='KeyP'||e.code==='Space'){e.preventDefault();if(!G.over)setPause(!G.paused);return;}
  if(G.paused&&e.code==='Enter'){setPause(false);return;}
  var k=KEYMAP[e.code];
  /* в портрете поле повёрнуто: влево/вправо двигают ракетку */
  if(rotated){if(e.code==='ArrowLeft'||e.code==='KeyA')k=e.code==='KeyA'?'w':'up';if(e.code==='ArrowRight'||e.code==='KeyD')k=e.code==='KeyD'?'s':'down';}
  if(!k)return;
  e.preventDefault();keys[k]=1;padDir();
});
document.addEventListener('keyup',function(e){
  var k=KEYMAP[e.code];
  if(rotated){if(e.code==='ArrowLeft')k='up';if(e.code==='ArrowRight')k='down';if(e.code==='KeyA')k='w';if(e.code==='KeyD')k='s';}
  if(!k)return;keys[k]=0;padDir();
});
/* мышь и пальцы: ракетка идёт за указателем; вдвоём каждый палец управляет ракеткой своей половины */
function bindPointer(){
  var zone=$('arena'),owner={};
  function sideOf(f){return G.st.mode==='duo'?(f.x<R.W/2?0:1):0;}
  function aim(id,cx,cy,start){
    if(!G)return;
    var f=view.toField(cx,cy);
    if(start||owner[id]==null)owner[id]=sideOf(f);
    var p=G.st.pad[owner[id]];
    p.target=f.y;p.dir=0;
  }
  function skip(e){var n=e.target;while(n&&n!==zone){if(n.tagName==='BUTTON')return true;n=n.parentNode;}return false;}
  if(window.PointerEvent){
    zone.addEventListener('pointerdown',function(e){
      if(skip(e)||!G)return;
      if(G.paused&&!G.over){setPause(false);return;}
      aim(e.pointerId,e.clientX,e.clientY,true);
    });
    zone.addEventListener('pointermove',function(e){
      if(!G)return;
      /* мышь управляет и без нажатия */
      if(e.pointerType==='mouse'||owner[e.pointerId]!=null)aim(e.pointerId,e.clientX,e.clientY,false);
    });
    var end=function(e){delete owner[e.pointerId];};
    zone.addEventListener('pointerup',end);zone.addEventListener('pointercancel',end);
  }else{
    zone.addEventListener('touchstart',function(e){if(skip(e)||!G)return;if(G.paused&&!G.over){setPause(false);return;}
      for(var i=0;i<e.changedTouches.length;i++){var tt=e.changedTouches[i];aim(tt.identifier,tt.clientX,tt.clientY,true);}},{passive:true});
    zone.addEventListener('touchmove',function(e){e.preventDefault();for(var i=0;i<e.changedTouches.length;i++){var tt=e.changedTouches[i];aim(tt.identifier,tt.clientX,tt.clientY,false);}},{passive:false});
    zone.addEventListener('touchend',function(e){for(var i=0;i<e.changedTouches.length;i++)delete owner[e.changedTouches[i].identifier];});
    zone.addEventListener('mousemove',function(e){aim('m',e.clientX,e.clientY,false);});
  }
}

/* ════════ ЦИКЛ ════════ */
var view=null,lastT=0;
function drain(){var ev=G.st.ev;G.st.ev=[];for(var i=0;i<ev.length;i++)onEvent(ev[i]);}
function frame(now){
  requestAnimationFrame(frame);
  var dt=lastT?Math.min(0.05,(now-lastT)/1000):0.016;lastT=now;
  if(!G||!document.body.classList.contains('screen-game'))return;
  if(playing()&&!document.hidden){R.update(G.st,dt);drain();}
  view.draw(G.st,now,G.theme);
  paintHud();
}
var scoreCache='';
function paintHud(){
  var st=G.st,duo=st.mode==='duo';
  var key=st.score.join(':')+st.rally+I18n.lang+rotated+st.state+st.hits[0]+st.lives;
  if(key===scoreCache)return;scoreCache=key;
  if(st.mode==='squash'){
    $('sc-a').innerHTML='<span>'+t('hud.hits')+'</span><b>'+st.hits[0]+'</b>';
    $('sc-b').innerHTML='<span>'+t('hud.lives')+'</span><b>'+st.lives+'</b>';
    $('hud-target').textContent=t('st.best')+' '+((DB.stats.squash&&DB.stats.squash.best)||0);
  }else{
    var b=duo?t(rotated?'side.top':'side.right'):st.mode==='tour'?t('opp.'+OPP[st.opp].id):t('lvl.'+st.level);
    var a=duo?t(rotated?'side.bottom':'side.left'):t('hud.you');
    $('sc-a').innerHTML='<span>'+a+'</span><b>'+st.score[0]+'</b>';
    $('sc-b').innerHTML='<span>'+b+'</span><b>'+st.score[1]+'</b>';
    $('hud-target').textContent=t('hud.to',{n:st.target});
  }
  $('hud-rally').innerHTML='<span>'+t('hud.rally')+'</span><b>'+st.rally+'</b>';
  $('serve').classList.toggle('hidden',st.state!=='serve'||G.paused||G.over||!$('intro').classList.contains('hidden'));
}

/* размер поля под окно; в портретной ориентации поле поворачивается */
var rotated=false;
function layout(){
  if(!G||!document.body.classList.contains('screen-game'))return;
  var arena=$('arena'),aw=arena.clientWidth-16,top=arena.getBoundingClientRect().top;
  var vh=window.innerHeight||document.documentElement.clientHeight;
  var ah=vh-top-16;
  rotated=ah>aw*1.15;
  document.body.classList.toggle('rotated',rotated);
  var fw=rotated?R.H:R.W,fh=rotated?R.W:R.H;
  var sc=Math.max(0.2,Math.min(aw/fw,ah/fh,1.6));
  var w=Math.round(fw*sc),h=Math.round(fh*sc);
  $('well').style.width=w+'px';$('well').style.height=h+'px';
  view.resize(w,h,rotated);
  scoreCache='';
}

var rzT;
window.addEventListener('resize',function(){clearTimeout(rzT);rzT=setTimeout(layout,80);});
window.addEventListener('orientationchange',function(){setTimeout(layout,250);});
document.addEventListener('visibilitychange',function(){
  if(document.hidden&&playing())setPause(true);
  if(document.hidden)persist();
});
window.addEventListener('pagehide',persist);
window.addEventListener('blur',function(){keys={};if(G)padDir();});

function onLang(){paintMenu();scoreCache='';}
function bindSeg(id,fn){
  var list=document.querySelectorAll('#seg-'+id+' .seg-btn');
  for(var i=0;i<list.length;i++)(function(b){
    b.addEventListener('click',function(){fn(b.getAttribute('data-v'));save();paintMenu();Sound.sfx('select');});
  })(list[i]);
}
function boot(){
  A.topbar('p.title');
  I18n.apply();I18n.onChange(onLang);
  view=PongView($('cv'));
  bindPointer();
  bindSeg('level',function(v){S.level=v;});
  bindSeg('target',function(v){S.target=+v;});
  bindSeg('bonus',function(v){S.bonus=v==='yes';});
  var th=document.querySelectorAll('#themes .th-card');
  for(var i=0;i<th.length;i++)(function(b){b.addEventListener('click',function(){S.theme=b.getAttribute('data-v');save();paintMenu();Sound.sfx('select');});})(th[i]);
  $('btn-play').addEventListener('click',newGame);
  $('btn-continue').addEventListener('click',resume);
  $('btn-menu').addEventListener('click',function(){if(G&&!G.over)G.paused=true;showScreen('menu');});
  $('btn-pause').addEventListener('click',function(){if(G)setPause(!G.paused);});
  $('po-go').addEventListener('click',function(){setPause(false);});
  $('po-restart').addEventListener('click',newGame);
  $('po-menu').addEventListener('click',function(){showScreen('menu');});
  $('over-retry').addEventListener('click',function(){
    /* в турнире «ещё раз» значит тот же соперник */
    if(G&&G.st.mode==='tour')S.opp=G.st.opp;
    newGame();
  });
  $('over-next').addEventListener('click',function(){newGame();});
  $('tour-list').addEventListener('click',function(e){
    var n=e.target;while(n&&n!==this&&!n.getAttribute('data-i'))n=n.parentNode;
    if(!n||n===this||n.disabled)return;
    S.opp=+n.getAttribute('data-i');save();paintMenu();Sound.sfx('select');
  });
  $('over-menu').addEventListener('click',function(){showScreen('menu');});
  paintMenu();
  showScreen('menu');
  requestAnimationFrame(frame);
}

window.AceonPong={g:function(){return G;},settings:S,db:DB,newGame:newGame,setPause:setPause,layout:layout,resume:resume};
boot();
})();
