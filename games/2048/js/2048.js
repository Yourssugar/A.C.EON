/* A.C.EON 2048: меню, поле с плавным движением плиток, отмена хода, блиц, камни.
   Правила в rules.js, тексты в lang.js. */
(function(){
'use strict';

var t=I18n.t,A=window.Arcade,T=window.T48;
var $=function(id){return document.getElementById(id);};
function show(id){$(id).classList.remove('hidden');}
function hide(id){$(id).classList.add('hidden');}

var MODES=['classic','blitz','stones'];
var SIZES=[3,4,5,6];
var TARGET={3:512,4:2048,5:4096,6:8192};
var STONES={3:1,4:1,5:2,6:3};
var BLITZ=180000;
var UNDO_MAX={none:0,three:3,free:Infinity};
var ANIM=110;

/* ── сохранения ── */
Store.define('2048',{
  version:1,
  defaults:{settings:{mode:'classic',size:4,undo:'none',pad:'auto',theme:'neon'},stats:{},save:null}
});
var DB=Store.get('2048'),S=DB.settings;
if(MODES.indexOf(S.mode)<0)S.mode='classic';
if(SIZES.indexOf(+S.size)<0)S.size=4;
S.size=+S.size;
if(!UNDO_MAX.hasOwnProperty(S.undo))S.undo='none';
if(['auto','on','off'].indexOf(S.pad)<0)S.pad='auto';
if(['neon','classic','term'].indexOf(S.theme)<0)S.theme='neon';
function save(){Store.save('2048');}
function key(g){return g.mode+'-'+g.size;}
function stat(k){if(!DB.stats[k])DB.stats[k]={played:0,won:0,best:0,tile:0};return DB.stats[k];}

/* ── звуки ── */
Sound.define('slide',function(tm,tone,noise){noise(tm,0.05,0.18,1500);});
Sound.define('undo',function(tm,tone){tone(tm,700,0.06,'triangle',0.05,420);});
var mergeSfx={};
function mergeSound(v){
  var n=Math.min(17,Math.round(Math.log(v)/Math.LN2));
  var name='m'+n;
  if(!mergeSfx[name]){
    mergeSfx[name]=1;
    Sound.define(name,function(tm,tone){var f=220*Math.pow(2,(n-1)/4);tone(tm,f,0.08,'square',0.04);tone(tm+0.04,f*1.5,0.1,'triangle',0.05);});
  }
  Sound.sfx(name);
}

/* ── партия ──
   G: {mode,size,st,moves,time,started,won,keep,over:''|'lose'|'time',undos,hist:[]} */
var G=null;

/* ════════ МЕНЮ ════════ */
function buildModes(){
  var list=$('mode-list');list.innerHTML='';
  MODES.forEach(function(m){
    var b=document.createElement('button');
    b.type='button';b.className='m-card-btn'+(S.mode===m?' sel':'');
    b.innerHTML='<span class="m-ico m-ico-'+m+'"><i></i><i></i><i></i><i></i></span><span class="m-txt"><span class="m-name" data-i18n="mode.'+m+'"></span><span class="m-desc" data-i18n="desc.'+m+'"></span></span>';
    b.addEventListener('click',function(){S.mode=m;save();paintMenu();Sound.sfx('select');});
    list.appendChild(b);
  });
  I18n.apply(list);
}
function buildStats(){
  var h='<div class="st-row st-head"><span></span><span data-i18n="st.best"></span><span data-i18n="st.tile"></span><span data-i18n="st.won"></span></div>';
  SIZES.forEach(function(n){
    var s=DB.stats[S.mode+'-'+n]||{played:0,won:0,best:0,tile:0};
    h+='<div class="st-row'+(n===S.size?' cur':'')+'"><span>'+n+' x '+n+'</span>'+
       '<b>'+(s.best||'-')+'</b><b>'+(s.tile||'-')+'</b><b>'+s.won+'/'+s.played+'</b></div>';
  });
  $('stats').innerHTML=h;I18n.apply($('stats'));
}
function paintMenu(){
  buildModes();buildStats();
  [['size',String(S.size)],['undo',S.undo],['pad',S.pad]].forEach(function(x){
    var list=document.querySelectorAll('#seg-'+x[0]+' .seg-btn');
    for(var i=0;i<list.length;i++)list[i].classList.toggle('sel',list[i].getAttribute('data-v')===x[1]);
  });
  var th=document.querySelectorAll('#themes .th-card');
  for(var i=0;i<th.length;i++)th[i].classList.toggle('sel',th[i].getAttribute('data-v')===S.theme);
  $('size-info').textContent=t('size.info',{n:S.size,t:TARGET[S.size]});
  $('btn-continue').classList.toggle('hidden',!((G&&!G.over&&G.started)||(DB.save&&!DB.save.over)));
  applyTheme();
}
function applyTheme(){
  var b=document.body;
  ['neon','classic','term'].forEach(function(x){b.classList.toggle('th-'+x,S.theme===x);});
}
function showScreen(name){
  document.body.classList.toggle('screen-menu',name==='menu');
  document.body.classList.toggle('screen-game',name==='game');
  if(name==='menu'){flush();persist();paintMenu();}
  Sound.music(name==='menu'?'menu':'game');
  window.scrollTo(0,0);
  if(name==='game'){layout();requestAnimationFrame(layout);setTimeout(layout,250);}
}

/* ════════ ПАРТИЯ ════════ */
function newGame(){
  flush();
  var n=S.size;
  G={mode:S.mode,size:n,st:T.create(n,S.mode==='stones'?STONES[n]:0),moves:0,time:0,started:false,
     won:false,keep:false,over:'',undos:0,undoMode:S.undo,hist:[]};
  hide('over-modal');
  buildBoard();
  status('msg.start',{t:TARGET[n]});
  persist();
  showScreen('game');
}
function persist(){
  if(!G)return;
  DB.save=!G.over&&G.started?G:null;
  save();
}
function resume(){
  if(!G&&DB.save)G=DB.save;
  if(!G)return;
  if(!G.hist)G.hist=[];
  hide('over-modal');
  buildBoard();
  status('');
  showScreen('game');
}
function undoLeft(){var m=UNDO_MAX[G.undoMode]||0;return m===Infinity?Infinity:Math.max(0,m-G.undos);}

function doMove(dir){
  if(!G||G.over||!document.body.classList.contains('screen-game'))return;
  if(!$('over-modal').classList.contains('hidden'))return;
  flush();
  var snap={st:T.clone(G.st),moves:G.moves,won:G.won};
  var r=T.move(G.st,dir);
  if(!r.moved){bump(dir);return;}
  if(!G.started){
    G.started=true;
    stat(key(G)).played++;
    A.trackPlay();
    tick.last=Date.now();
  }
  if(G.undoMode!=='none'){G.hist.push(snap);if(G.hist.length>30)G.hist.shift();}
  G.moves++;
  var born=T.spawn(G.st);
  animate(r,born);
  if(r.gain){
    scorePop(r.gain);
    var top=0;r.merges.forEach(function(m){if(m.v>top)top=m.v;});
    mergeSound(top);
  }else Sound.sfx('slide');
  record();
  /* цель */
  var mx=T.maxTile(G.st);
  if(!G.won&&mx>=TARGET[G.size]){
    G.won=true;
    stat(key(G)).won++;
    save();
    if(G.mode==='blitz')status('msg.win',{t:TARGET[G.size]},'good');
    else setTimeout(function(){winModal();},ANIM+260);
    Sound.sfx('win');Sound.duck(0.3,2000);
  }else if(r.gain||G.moves===1)status('');
  if(!T.canMove(G.st))setTimeout(function(){finish('lose');},ANIM+300);
  paintHud();
  persist();
}
/* рекорд пишется по ходу игры, если не было отмен */
function record(){
  if(G.undos)return false;
  var s=stat(key(G)),rec=false;
  if(G.st.score>s.best){s.best=G.st.score;rec=true;}
  var mx=T.maxTile(G.st);
  if(mx>s.tile)s.tile=mx;
  return rec;
}
function undo(){
  if(!G||!G.hist.length||(G.over==='time'))return;
  if(!undoLeft()){status('msg.noUndo',null,'bad');nope();return;}
  flush();
  var s=G.hist.pop();
  G.st=s.st;G.moves=s.moves;G.won=s.won;G.undos++;
  G.over='';
  hide('over-modal');
  syncTiles();
  Sound.sfx('undo');
  status('');
  paintHud();persist();
}
function finish(why){
  if(!G||G.over)return;
  if(why==='lose'&&T.canMove(G.st))return;
  flush();
  G.over=why;
  record();
  DB.save=null;save();
  Sound.sfx(why==='time'?'win':'lose');
  board().classList.add('ended');
  overModal(why);
  paintHud();
}

/* ── окна ── */
function fmt(ms){var s=Math.max(0,Math.ceil(ms/1000)),m=Math.floor(s/60);s%=60;return m+':'+(s<10?'0':'')+s;}
function rows(){
  function row(k,v){return '<div class="ov-row"><span>'+t(k)+'</span><b>'+v+'</b></div>';}
  var h=row('over.score',G.st.score)+row('over.tile',T.maxTile(G.st))+row('over.moves',G.moves);
  if(G.mode!=='blitz')h+=row('over.dur',fmt(G.time));
  if(G.undos)h+=row('over.undos',G.undos);
  return h;
}
function overModal(why){
  $('over-title').textContent=why==='time'?t('over.time'):t('over.lose');
  $('over-title').className='over-title '+(why==='time'?'win':'lose');
  $('over-rows').innerHTML=rows();
  var isRec=!G.undos&&G.st.score>(G.startBest||0);
  $('over-rec').classList.toggle('hidden',!isRec);
  $('over-note').classList.toggle('hidden',!G.undos);
  hide('over-keep');
  setTimeout(function(){if(G&&G.over)show('over-modal');},700);
}
function winModal(){
  if(!G||G.over)return;
  $('over-title').textContent=t('over.win',{t:TARGET[G.size]});
  $('over-title').className='over-title win';
  $('over-rows').innerHTML=rows();
  hide('over-rec');
  $('over-note').classList.toggle('hidden',!G.undos);
  show('over-keep');
  show('over-modal');
}

/* ════════ ПОЛЕ ════════ */
var els={},pending=null,geo={cell:60,gap:8};
function board(){return $('board');}
function buildBoard(){
  var n=G.size,h='';
  for(var i=0;i<n*n;i++)h+='<i class="'+(G.st.stones.indexOf(i)>=0?'stone':'')+'"></i>';
  $('cells').innerHTML=h;
  board().classList.remove('ended');
  if(G.startBest===undefined)G.startBest=stat(key(G)).best;
  syncTiles();
  paintHud();
}
function pos(i){var n=G.size,r=Math.floor(i/n),c=i%n;return [geo.gap+c*(geo.cell+geo.gap),geo.gap+r*(geo.cell+geo.gap)];}
function place(el,i){var p=pos(i);el.style.transform='translate('+p[0]+'px,'+p[1]+'px)';el.style.webkitTransform=el.style.transform;}
function makeTile(tl,cls){
  var el=document.createElement('div');
  var inner=document.createElement('span');
  el.className='tile';
  el.appendChild(inner);
  setVal(el,tl.v);
  if(cls)inner.className=cls;
  place(el,tl.i);
  $('tiles').appendChild(el);
  els[tl.id]=el;
  return el;
}
function setVal(el,v){
  var d=String(v).length;
  el.className='tile '+(v<=2048?'v'+v:'vbig')+' d'+Math.min(d,6);
  el.firstChild.textContent=v;
}
function syncTiles(){
  $('tiles').innerHTML='';els={};
  G.st.tiles.forEach(function(tl){makeTile(tl);});
}
/* сдвиг: плитки едут, через ANIM мс сливаются и появляется новая */
function animate(r,born){
  r.slides.forEach(function(s){var el=els[s.id];if(el)place(el,s.to);});
  var merges=r.merges;
  pending={merges:merges,born:born,tmr:setTimeout(flush,ANIM)};
}
function flush(){
  if(!pending)return;
  var p=pending;pending=null;
  clearTimeout(p.tmr);
  p.merges.forEach(function(m){
    m.from.forEach(function(id){var el=els[id];if(el&&el.parentNode)el.parentNode.removeChild(el);delete els[id];});
    makeTile(m,'merged');
  });
  if(p.born)makeTile(p.born,'born');
}
function bump(dir){
  var b=board();b.classList.remove('bump-left','bump-right','bump-up','bump-down');void b.offsetWidth;b.classList.add('bump-'+dir);
}
function nope(){var b=board();b.classList.remove('shake');void b.offsetWidth;b.classList.add('shake');}
function scorePop(n){
  var el=$('sc-add');el.textContent='+'+n;el.classList.remove('go');void el.offsetWidth;el.classList.add('go');
}

function paintHud(){
  if(!G)return;
  $('hud-score').textContent=G.st.score;
  var s=stat(key(G));
  $('hud-best').textContent=Math.max(s.best,G.undos?0:G.st.score);
  $('hud-mode').textContent=t('mode.'+G.mode)+' / '+G.size+'x'+G.size;
  var bl=G.mode==='blitz';
  $('box-time').classList.toggle('hidden',!bl);
  if(bl)$('hud-time').textContent=fmt(BLITZ-G.time);
  var um=G.undoMode;
  $('btn-undo').classList.toggle('hidden',um==='none');
  var left=undoLeft();
  $('undo-n').textContent=left===Infinity?'':' '+left;
  $('btn-undo').disabled=!G.hist.length||!left||G.over==='time';
}
function status(k,vars,cls){
  var el=$('status');
  el.setAttribute('data-key',k||'');el.setAttribute('data-vars',vars?JSON.stringify(vars):'');el.setAttribute('data-cls',cls||'');
  el.textContent=k?t(k,vars):'';
  el.className='status'+(cls?' '+cls:'');
}

/* ── размер поля под окно; стрелки снизу (портрет) или сбоку (ландшафт) ── */
function padOn(){
  if(S.pad==='on')return true;
  if(S.pad==='off')return false;
  return !!(window.matchMedia&&window.matchMedia('(pointer:coarse)').matches);
}
function layout(){
  if(!G||!document.body.classList.contains('screen-game'))return;
  var area=$('arena');
  var W=area.clientWidth-16,top=area.getBoundingClientRect().top;
  var H=(window.innerHeight||document.documentElement.clientHeight)-top-16;
  var pad=padOn(),side=pad&&W>H*1.25;
  document.body.classList.toggle('pad-on',pad);
  document.body.classList.toggle('pad-side',side);
  if(pad){if(side)W-=180;else H-=150;}
  var size=Math.floor(Math.max(180,Math.min(W,H,640)))-6;
  var n=G.size;
  geo.gap=Math.max(4,Math.round(size*(n>4?0.02:0.028)));
  geo.cell=Math.floor((size-geo.gap*(n+1))/n);
  size=geo.cell*n+geo.gap*(n+1);
  var b=board();
  b.style.width=b.style.height=size+'px';
  b.style.setProperty('--cell',geo.cell+'px');
  b.style.setProperty('--gap',geo.gap+'px');
  b.style.setProperty('--n',n);
  /* фон клеток */
  var cl=$('cells').children;
  for(var i=0;i<cl.length;i++){var p=pos(i);cl[i].style.left=p[0]+'px';cl[i].style.top=p[1]+'px';}
  flush();
  for(var id in els){var tl=null;for(var k=0;k<G.st.tiles.length;k++)if(G.st.tiles[k].id==id){tl=G.st.tiles[k];break;}if(tl)place(els[id],tl.i);}
}

/* ── время: в блице обратный отсчёт, в остальных просто длительность ── */
function tick(){
  var now=Date.now();
  if(G&&G.started&&!G.over&&document.body.classList.contains('screen-game')&&!document.hidden&&$('over-modal').classList.contains('hidden')){
    var d=now-(tick.last||now);
    if(d>0&&d<2000)G.time+=d;
    if(G.mode==='blitz'){
      $('hud-time').textContent=fmt(BLITZ-G.time);
      $('box-time').classList.toggle('low',BLITZ-G.time<15000);
      if(G.time>=BLITZ){G.time=BLITZ;finish('time');}
    }
  }
  tick.last=now;
}
setInterval(tick,200);

/* ════════ УПРАВЛЕНИЕ ════════ */
var KEYS={arrowleft:'left',arrowright:'right',arrowup:'up',arrowdown:'down',a:'left',d:'right',w:'up',s:'down',
          'ф':'left','в':'right','ц':'up','ы':'down',h:'left',l:'right',k:'up',j:'down'};
document.addEventListener('keydown',function(e){
  if(!G||!document.body.classList.contains('screen-game'))return;
  var k=(e.key||'').toLowerCase();
  if((k==='z'||k==='я')&&!e.altKey){e.preventDefault();undo();return;}
  if(e.ctrlKey||e.metaKey||e.altKey)return;
  if(KEYS[k]){e.preventDefault();doMove(KEYS[k]);}
  else if(k==='n'||k==='т')newGame();
});
/* свайп по всему игровому экрану */
function bindSwipe(){
  var zone=$('arena'),sx=0,sy=0,on=false;
  function start(x,y){sx=x;sy=y;on=true;}
  function end(x,y){
    if(!on)return;on=false;
    var dx=x-sx,dy=y-sy,ax=Math.abs(dx),ay=Math.abs(dy);
    if(Math.max(ax,ay)<24)return;
    if(ax>ay*1.15)doMove(dx>0?'right':'left');
    else if(ay>ax*1.15)doMove(dy>0?'down':'up');
  }
  function inPad(e){var n=e.target;while(n&&n!==zone){if(n.id==='pad')return true;n=n.parentNode;}return false;}
  if(window.PointerEvent){
    zone.addEventListener('pointerdown',function(e){if(inPad(e))return;if(e.pointerType==='mouse'&&e.button!==0)return;start(e.clientX,e.clientY);});
    zone.addEventListener('pointerup',function(e){end(e.clientX,e.clientY);});
    zone.addEventListener('pointercancel',function(){on=false;});
  }else{
    zone.addEventListener('touchstart',function(e){if(inPad(e))return;var p=e.changedTouches[0];start(p.clientX,p.clientY);});
    zone.addEventListener('touchmove',function(e){if(on)e.preventDefault();},{passive:false});
    zone.addEventListener('touchend',function(e){var p=e.changedTouches[0];end(p.clientX,p.clientY);});
    zone.addEventListener('mousedown',function(e){if(!inPad(e))start(e.clientX,e.clientY);});
    zone.addEventListener('mouseup',function(e){end(e.clientX,e.clientY);});
  }
  var pb=document.querySelectorAll('#pad .pad-b');
  for(var i=0;i<pb.length;i++)(function(b){
    b.addEventListener('click',function(){doMove(b.getAttribute('data-d'));});
  })(pb[i]);
}
var rzT;
window.addEventListener('resize',function(){clearTimeout(rzT);rzT=setTimeout(layout,80);});
window.addEventListener('orientationchange',function(){setTimeout(layout,250);});
document.addEventListener('visibilitychange',function(){if(document.hidden){flush();persist();}tick.last=Date.now();});
window.addEventListener('pagehide',function(){flush();persist();});

function onLang(){
  paintMenu();
  if(G){
    paintHud();
    var el=$('status'),k=el.getAttribute('data-key');
    if(k){var v=el.getAttribute('data-vars');status(k,v?JSON.parse(v):null,el.getAttribute('data-cls'));}
  }
}
function bindSeg(id,fn){
  var list=document.querySelectorAll('#seg-'+id+' .seg-btn');
  for(var i=0;i<list.length;i++)(function(b){
    b.addEventListener('click',function(){fn(b.getAttribute('data-v'));save();paintMenu();Sound.sfx('select');});
  })(list[i]);
}
function boot(){
  A.topbar('t.title');
  I18n.apply();I18n.onChange(onLang);
  bindSwipe();
  bindSeg('size',function(v){S.size=+v;});
  bindSeg('undo',function(v){S.undo=v;});
  bindSeg('pad',function(v){S.pad=v;});
  var th=document.querySelectorAll('#themes .th-card');
  for(var i=0;i<th.length;i++)(function(b){
    b.addEventListener('click',function(){S.theme=b.getAttribute('data-v');save();paintMenu();Sound.sfx('select');});
  })(th[i]);
  $('btn-play').addEventListener('click',newGame);
  $('btn-continue').addEventListener('click',resume);
  $('btn-menu').addEventListener('click',function(){showScreen('menu');});
  $('btn-new').addEventListener('click',newGame);
  $('btn-undo').addEventListener('click',undo);
  $('over-keep').addEventListener('click',function(){G.keep=true;hide('over-modal');status('msg.win',{t:TARGET[G.size]},'good');persist();});
  $('over-new').addEventListener('click',newGame);
  $('over-view').addEventListener('click',function(){hide('over-modal');if(G&&!G.over){G.keep=true;persist();}});
  $('over-menu').addEventListener('click',function(){hide('over-modal');if(G&&!G.over)G.keep=true;showScreen('menu');});
  paintMenu();
  showScreen('menu');
}

window.Aceon2048={g:function(){return G;},settings:S,db:DB,newGame:newGame,move:doMove,undo:undo,layout:layout,resume:resume,flush:flush};
boot();
})();
