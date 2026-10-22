/* A.C.EON BATTLESHIP: меню, расстановка, бой, игра вдвоём, залпы, победа.
   Правила и ИИ в rules.js, тексты в lang.js. */
(function(){
'use strict';

var t=I18n.t,A=window.Arcade,R=window.BsRules,N=R.N;
var $=function(id){return document.getElementById(id);};
function show(id){$(id).classList.remove('hidden');}
function hide(id){$(id).classList.add('hidden');}

/* ── сохранения ── */
Store.define('battleship',{
  version:1,
  defaults:{settings:{mode:'ai',level:'normal',fleet:'classic',noTouch:true,theme:'sea'},stats:{},save:null},
  legacy:function(raw){
    var w=parseInt(raw('aceon_bs_wins'),10)||0;
    return w?{stats:{'ai-normal-classic':{played:w,won:w}}}:null;
  }
});
var DB=Store.get('battleship'),S=DB.settings;
if(['ai','salvo','duel'].indexOf(S.mode)<0)S.mode='ai';
if(['easy','normal','hard'].indexOf(S.level)<0)S.level='normal';
if(!R.FLEETS[S.fleet])S.fleet='classic';
S.noTouch=S.noTouch!==false;
if(S.theme!=='sea'&&S.theme!=='paper')S.theme='sea';
function save(){Store.save('battleship');}
function variant(g){return g.mode==='duel'?'duel':g.mode+'-'+g.level+'-'+g.fleet;}
function stat(k){if(!DB.stats[k])DB.stats[k]={played:0,won:0};return DB.stats[k];}

/* звуки боя */
Sound.define('shot',function(tm,tone,noise){noise(tm,0.12,0.7,600);tone(tm,90,0.15,'sine',0.25,40);});
Sound.define('splash',function(tm,tone,noise){noise(tm+0.25,0.35,0.35,1500);});
Sound.define('boom',function(tm,tone,noise){noise(tm+0.2,0.45,0.9,380);tone(tm+0.2,70,0.4,'sawtooth',0.12,30);});
Sound.define('sink',function(tm,tone){[330,262,196,131].forEach(function(f,i){tone(tm+0.5+i*0.12,f,0.2,'triangle',0.1);});});
Sound.define('place',function(tm,tone,noise){noise(tm,0.05,0.3,900);tone(tm,220,0.06,'sine',0.08);});

/* ── партия ── */
var G=null;          // {mode, level, fleet, noTouch, phase, placer, boards:[b0,b1], turn, salvo:[], shots:[0,0], hits:[0,0], last, winner}
var Pl={size:0,vert:false,from:null,hover:-1};   // расстановка: выбранный корабль, ориентация, наведение
var busy=false;
function fleet(){return R.FLEETS[G.fleet];}
function aiOn(){return G.mode!=='duel';}
function salvo(){return G.mode==='salvo';}

/* ════════ МЕНЮ ════════ */
var MODES=['ai','salvo','duel'];
function buildModes(){
  var list=$('mode-list');list.innerHTML='';
  MODES.forEach(function(m){
    var b=document.createElement('button');
    b.type='button';b.className='m-card'+(S.mode===m?' sel':'');
    b.innerHTML='<span class="m-ico m-ico-'+m+'"></span><span class="m-txt"><span class="m-name" data-i18n="mode.'+m+'"></span><span class="m-desc" data-i18n="desc.'+m+'"></span></span>';
    b.addEventListener('click',function(){S.mode=m;save();paintMenu();Sound.sfx('select');});
    list.appendChild(b);
  });
  I18n.apply(list);
}
function pct(a,b){return b?Math.round(a/b*100)+'%':'-';}
function buildStats(){
  var h='<div class="st-row st-head"><span></span><span data-i18n="st.won"></span><span data-i18n="st.best"></span><span data-i18n="st.acc"></span></div>';
  var rows=[];
  ['ai','salvo'].forEach(function(m){['easy','normal','hard'].forEach(function(l){rows.push([m+'-'+l+'-'+S.fleet,'mode.'+m,'lvl.'+l]);});});
  rows.forEach(function(r){
    var s=DB.stats[r[0]]||{played:0,won:0};
    var cur=r[0]===variant({mode:S.mode,level:S.level,fleet:S.fleet});
    h+='<div class="st-row'+(cur?' cur':'')+'"><span><span data-i18n="'+r[1]+'"></span> / <span data-i18n="'+r[2]+'"></span></span>'+
       '<b>'+s.won+'/'+s.played+'</b><b>'+(s.bestShots||'-')+'</b><b>'+(s.bestAcc!=null?s.bestAcc+'%':'-')+'</b></div>';
  });
  var d=DB.stats.duel||{played:0};
  h+='<div class="st-row"><span data-i18n="mode.duel"></span><b>'+d.played+'</b><b>-</b><b>-</b></div>';
  $('stats').innerHTML=h;I18n.apply($('stats'));
}
function paintMenu(){
  buildModes();buildStats();
  $('opt-level').classList.toggle('hidden',S.mode==='duel');
  [['level',S.level],['fleet',S.fleet],['touch',S.noTouch?'no':'yes'],['theme',S.theme]].forEach(function(x){
    document.querySelectorAll('#seg-'+x[0]+' .seg-btn').forEach(function(b){b.classList.toggle('sel',b.dataset.v===x[1]);});
  });
  $('fleet-note').innerHTML=fleetHtml(R.FLEETS[S.fleet]);
  $('btn-continue').classList.toggle('hidden',!((G&&G.phase!=='over')||(DB.save&&DB.save.phase&&DB.save.phase!=='over')));
  document.body.classList.toggle('th-paper',S.theme==='paper');
}
/* состав флота значками */
function fleetHtml(list){
  var cnt={};list.forEach(function(s){cnt[s]=(cnt[s]||0)+1;});
  return Object.keys(cnt).sort(function(a,b){return b-a;}).map(function(s){
    var cells='';for(var i=0;i<s;i++)cells+='<i></i>';
    return '<span class="fl-item"><span class="fl-ship">'+cells+'</span><b>&#215;'+cnt[s]+'</b></span>';
  }).join('');
}

function showScreen(name){
  document.body.classList.toggle('screen-menu',name==='menu');
  document.body.classList.toggle('screen-game',name==='game');
  if(name==='menu')paintMenu();
  Sound.music(name==='menu'?'menu':'game');
  window.scrollTo(0,0);
  if(name==='game'){render();requestAnimationFrame(render);}
}

/* ════════ ПАРТИЯ ════════ */
function newGame(){
  G={mode:S.mode,level:S.level,fleet:S.fleet,noTouch:S.noTouch,phase:'place',placer:0,
     boards:[R.newBoard(),R.newBoard()],turn:0,salvo:[],shots:[0,0],hits:[0,0],last:null,winner:-1,log:[]};
  if(aiOn())G.boards[1]=R.randomFleet(fleet(),G.noTouch);
  stat(variant(G)).played++;
  A.trackPlay();
  Pl={size:nextSize(),vert:false,from:null,hover:-1};
  hide('over-modal');hide('pass');
  persist();
  showScreen('game');
}
function persist(){DB.save=G&&G.phase!=='over'?G:null;save();}
function resume(){
  if(!G&&DB.save)G=DB.save;
  if(!G)return;
  busy=false;
  if(G.phase==='place')Pl={size:nextSize(),vert:false,from:null,hover:-1};
  showScreen('game');
  if(G.mode==='duel'&&G.phase==='battle')passScreen(G.turn);
  else if(aiOn()&&G.phase==='battle'&&G.turn===1)setTimeout(aiTurn,500);
}

/* ── расстановка ── */
function myBoard(){return G.boards[G.phase==='place'?G.placer:G.turn];}
function remaining(){
  var need=fleet().slice(),b=myBoard();
  b.ships.forEach(function(s){var k=need.indexOf(s.size);if(k>=0)need.splice(k,1);});
  return need.sort(function(a,b){return b-a;});
}
function nextSize(){var r=remaining();return r.length?r[0]:0;}
function placeAt(i){
  if(!Pl.size){nope();return;}
  var p=R.rc(i),b=myBoard();
  var cells=R.cellsOf(p[0],p[1],Pl.size,Pl.vert);
  if(!R.canPlace(b,cells,G.noTouch,-1)){nope();return;}
  R.place(b,Pl.size,p[0],p[1],Pl.vert);
  Sound.sfx('place');
  Pl.from=null;Pl.size=nextSize();
  persist();render();
}
/* нажатие на поставленный корабль: снять его, чтобы переставить */
function pickUp(idx){
  var b=myBoard(),s=b.ships[idx];
  R.remove(b,idx);
  Pl.size=s.size;Pl.vert=s.vert;Pl.from={r:s.r,c:s.c};
  Sound.sfx('select');
  persist();render();
}
function rotate(){Pl.vert=!Pl.vert;Sound.sfx('select');render();}
function autoPlace(){
  var b=R.randomFleet(fleet(),G.noTouch,null,myBoard());
  if(!b)b=R.randomFleet(fleet(),G.noTouch);
  G.boards[G.placer]=b;Pl.size=0;
  Sound.sfx('place');persist();render();
}
function resetPlace(){G.boards[G.placer]=R.newBoard();Pl.size=nextSize();Pl.from=null;persist();render();}
function ready(){
  if(remaining().length)return;
  if(G.mode==='duel'&&G.placer===0){
    G.placer=1;Pl={size:nextSize(),vert:false,from:null,hover:-1};
    persist();passScreen(1,true);return;
  }
  G.phase='battle';G.turn=0;
  persist();
  if(G.mode==='duel')passScreen(0);
  else{render();status('msg.yourTurn');}
  Sound.sfx('select');
}

/* ── игра вдвоём: экран передачи устройства, чтобы соперник не видел поле ── */
function passScreen(player,placing){
  busy=true;
  $('pass-title').textContent=t('pass.to',{n:player+1});
  $('pass-sub').textContent=t(placing?'pass.place':'pass.fire');
  show('pass');
  render();
}
function passGo(){hide('pass');busy=false;render();if(G.phase==='battle')status('msg.yourTurnN',{n:G.turn+1});}

/* ── выстрелы ── */
function targetBoard(){return G.boards[1-G.turn];}
function tapEnemy(i){
  if(busy||G.phase!=='battle'||(aiOn()&&G.turn!==0))return;
  var b=targetBoard();
  if(b.shots[i]!==0){nope();return;}
  if(salvo()){
    var k=G.salvo.indexOf(i),max=R.afloat(G.boards[G.turn]);
    if(k>=0)G.salvo.splice(k,1);
    else if(G.salvo.length<max)G.salvo.push(i);
    else{nope();return;}
    Sound.sfx('select');render();return;
  }
  shoot(G.turn,[i],afterShots);
}
function fireSalvo(){
  if(busy||!salvo()||G.turn!==0||!G.salvo.length)return;
  var list=G.salvo.slice();G.salvo=[];
  shoot(0,list,afterShots);
}
/* серия выстрелов по очереди с анимацией; done(результаты) */
function shoot(who,list,done){
  busy=true;
  var b=G.boards[1-who],res=[],k=0;
  (function next(){
    if(k>=list.length){busy=false;done(who,res);return;}
    var i=list[k++],r=R.fire(b,i,G.noTouch);
    G.shots[who]++;if(r.res!=='miss')G.hits[who]++;
    G.last={b:1-who,i:i,res:r.res};
    res.push(r);
    Sound.sfx('shot');
    setTimeout(function(){Sound.sfx(r.res==='miss'?'splash':'boom');if(r.res==='sunk')Sound.sfx('sink');},10);
    render();
    if(r.res==='sunk')flashSunk(1-who,r.ship);
    setTimeout(next,list.length>1?260:120);
  })();
}
function afterShots(who,res){
  var enemy=G.boards[1-who];
  if(R.allSunk(enemy)){finish(who);return;}
  var hit=res.some(function(r){return r.res!=='miss';}),sunk=res.filter(function(r){return r.res==='sunk';}).length;
  var me=who===0&&aiOn();
  if(salvo()){
    var h=res.filter(function(r){return r.res!=='miss';}).length;
    status(who===0?'msg.salvoYou':'msg.salvoAi',{h:h,n:res.length},h?'hit':'');
    G.turn=1-G.turn;persist();render();
    if(G.turn===1)setTimeout(aiTurn,900);
    return;
  }
  if(hit){
    status(sunk?(me||G.mode==='duel'?'msg.sunk':'msg.aiSunk'):(me||G.mode==='duel'?'msg.hit':'msg.aiHit'),null,'hit');
    persist();render();
    if(aiOn()&&who===1)setTimeout(aiTurn,700);
    return;
  }
  /* промах: ход переходит */
  G.turn=1-G.turn;persist();
  if(G.mode==='duel'){status('msg.miss');render();setTimeout(function(){passScreen(G.turn);},900);return;}
  if(G.turn===1){status('msg.missAi');render();setTimeout(aiTurn,700);}
  else{status('msg.yourTurn');render();}
}
var AI=null;
function aiTurn(){
  if(!G||G.phase!=='battle'||G.turn!==1||!aiOn())return;
  if(!AI||AI.level!==G.level)AI=R.ai(G.level);
  var n=salvo()?R.afloat(G.boards[1]):1;
  var list=AI.pick(G.boards[0],G.noTouch,n);
  status(salvo()?'msg.aiSalvo':'msg.aiTurn',{n:n});
  setTimeout(function(){shoot(1,list,afterShots);},salvo()?500:350);
}

function finish(who){
  G.phase='over';G.winner=who;busy=false;
  var k=variant(G),s=stat(k),rec=false;
  var acc=G.shots[0]?Math.round(G.hits[0]/G.shots[0]*100):0;
  if(aiOn()&&who===0){
    s.won++;
    if(!s.bestShots||G.shots[0]<s.bestShots){s.bestShots=G.shots[0];rec=true;}
    if(s.bestAcc==null||acc>s.bestAcc){s.bestAcc=acc;rec=true;}
    var old=parseInt(localStorage.getItem('aceon_bs_wins')||'0',10)||0;   // лаунчер показывает число побед
    try{localStorage.setItem('aceon_bs_wins',old+1);}catch(e){}
  }
  DB.save=null;save();
  render();
  Sound.sfx(who===0||!aiOn()?'win':'lose');Sound.duck(0.3,2500);
  var title=aiOn()?(who===0?'over.win':'over.lose'):'over.winN';
  $('over-title').textContent=t(title,{n:who+1});
  $('over-title').className='over-title '+(who===0||!aiOn()?'win':'lose');
  function row(k,v){return '<div class="ov-row"><span>'+t(k)+'</span><b>'+v+'</b></div>';}
  var html='';
  if(aiOn()){
    html+=row('over.shots',G.shots[0])+row('st.acc',acc+'%')+row('over.left',R.afloat(G.boards[0])+' / '+fleet().length);
  }else{
    [0,1].forEach(function(p){html+=row('over.player',(p+1)+': '+G.shots[p]+' / '+(G.shots[p]?Math.round(G.hits[p]/G.shots[p]*100):0)+'%');});
  }
  $('over-rows').innerHTML=html;
  $('over-rec').classList.toggle('hidden',!rec);
  setTimeout(function(){show('over-modal');},900);
}

/* ════════ ОТРИСОВКА ════════ */
var views={};
function makeBoard(id){
  var root=$(id);root.innerHTML='';
  var g=document.createElement('div');g.className='bd';
  var h='<div class="bd-corner"></div>';
  for(var c=0;c<N;c++)h+='<div class="bd-lbl bd-col" data-c="'+c+'"></div>';
  for(var r=0;r<N;r++){
    h+='<div class="bd-lbl bd-row">'+(r+1)+'</div>';
    for(c=0;c<N;c++)h+='<div class="cell" data-i="'+(r*N+c)+'"></div>';
  }
  g.innerHTML=h;
  var sea=document.createElement('div');sea.className='bd-sea';
  var ships=document.createElement('div');ships.className='bd-ships';
  var fx=document.createElement('div');fx.className='bd-fx';
  g.appendChild(sea);g.appendChild(ships);g.appendChild(fx);
  root.appendChild(g);
  var v={root:root,g:g,cells:g.querySelectorAll('.cell'),ships:ships,fx:fx,cols:g.querySelectorAll('.bd-col')};
  views[id]=v;
  paintCols(v);
  return v;
}
function paintCols(v){var L=t('cols');for(var c=0;c<N;c++)v.cols[c].textContent=L.charAt(c);}

function paintBoard(v,b,opt){
  var sel=opt.salvo||[],prev=opt.preview;
  for(var i=0;i<N*N;i++){
    var s=b.shots[i],cls='cell';
    if(s===1)cls+=' s-miss';else if(s===2)cls+=' s-hit';else if(s===3)cls+=' s-auto';
    if(opt.target&&s===0)cls+=' aim';
    if(sel.indexOf(i)>=0)cls+=' s-sel';
    if(prev&&prev.cells.indexOf(i)>=0)cls+=prev.ok?' pv-ok':' pv-bad';
    if(G.last&&opt.idx===G.last.b&&G.last.i===i)cls+=' last';
    if(v.cells[i].className!==cls)v.cells[i].className=cls;
  }
  /* корабли: свои все, у соперника только потопленные */
  var html='';
  b.ships.forEach(function(sh,k){
    if(!opt.own&&!sh.sunk)return;
    html+='<div class="ship'+(sh.vert?' v':'')+(sh.sunk?' sunk':'')+(opt.placing?' movable':'')+'" data-k="'+k+'" style="--r:'+sh.r+';--c0:'+sh.c+';--n:'+sh.size+'"><i></i></div>';
  });
  if(v.ships.innerHTML!==html)v.ships.innerHTML=html;
  v.root.classList.toggle('turn-target',!!opt.target);
}

function status(key,vars,cls){
  var el=$('status');
  el.dataset.key=key;el.dataset.vars=vars?JSON.stringify(vars):'';
  el.textContent=t(key,vars);
  el.className='status'+(cls?' '+cls:'');
}

/* размер клетки под окно: поле с подписями = 11 клеток */
function layout(){
  var area=$('arena');if(!area)return;
  var W=area.clientWidth,top=area.getBoundingClientRect().top;
  var H=Math.max(240,window.innerHeight-top-12);
  var wide=W>=640&&W/H>1.15,place=G.phase==='place';
  document.body.classList.toggle('wide',wide);
  var big,small;
  if(place){
    var palW=wide?Math.min(260,W*0.3):0,palH=wide?0:150;
    big=Math.min((W-palW-24)/11.2,(H-palH)/11.2);
  }else if(wide){
    big=Math.min((W-40)/22.6,(H-60)/11.4);small=big;
  }else{
    big=Math.min((W-8)/11.2,(H*0.66)/11.2);small=Math.max(14,Math.min(big*0.5,(H-big*11.2-60)/11.2));
  }
  big=Math.max(16,Math.floor(big));small=Math.max(12,Math.floor(small||big));
  $('b-enemy').style.setProperty('--c',big+'px');
  $('b-own').style.setProperty('--c',(place?big:small)+'px');
}

function render(){
  if(!G||!document.body.classList.contains('screen-game'))return;
  var place=G.phase==='place';
  document.body.classList.toggle('ph-place',place);
  document.body.classList.toggle('ph-battle',!place);
  layout();
  var meIdx=place?G.placer:(G.mode==='duel'?G.turn:0);
  var hideAll=G.mode==='duel'&&!$('pass').classList.contains('hidden');
  /* своё поле */
  var prev=null;
  if(place&&Pl.size&&Pl.hover>=0){
    var p=R.rc(Pl.hover),cells=R.cellsOf(p[0],p[1],Pl.size,Pl.vert);
    prev={cells:cells||cellsClip(p[0],p[1],Pl.size,Pl.vert),ok:R.canPlace(myBoard(),cells,G.noTouch,-1)};
  }
  paintBoard(views['b-own'],G.boards[meIdx],{own:!hideAll,placing:place,preview:prev,idx:meIdx});
  if(!place)paintBoard(views['b-enemy'],G.boards[1-meIdx],{own:G.phase==='over',target:G.phase==='battle'&&!busy&&(G.mode==='duel'||G.turn===0),salvo:G.salvo,idx:1-meIdx});
  /* подписи и панели */
  var names=G.mode==='duel'?[t('lbl.playerN',{n:meIdx+1}),t('lbl.playerN',{n:2-meIdx})]:[t('lbl.you'),t('lbl.enemy')];
  $('l-own').textContent=place?t(G.mode==='duel'?'lbl.placeN':'lbl.place',{n:G.placer+1}):names[0];
  $('l-enemy').textContent=names[1];
  if(!place){
    $('f-own').innerHTML=fleetState(G.boards[meIdx]);
    $('f-enemy').innerHTML=fleetState(G.boards[1-meIdx]);
  }
  paintPalette();
  var sv=salvo()&&G.phase==='battle'&&G.turn===0;
  $('salvo-bar').classList.toggle('hidden',!sv);
  if(sv){var max=R.afloat(G.boards[0]);$('salvo-n').textContent=G.salvo.length+' / '+max;$('btn-fire').disabled=!G.salvo.length||busy;}
  paintHud();
}
function cellsClip(r,c,size,vert){var out=[];for(var k=0;k<size;k++){var rr=vert?r+k:r,cc=vert?c:c+k;if(rr<N&&cc<N)out.push(rr*N+cc);}return out;}
function fleetState(b){
  return b.ships.slice().sort(function(a,c){return c.size-a.size;}).map(function(s){
    var cells='';for(var i=0;i<s.size;i++)cells+='<i></i>';
    return '<span class="fs'+(s.sunk?' dead':'')+'">'+cells+'</span>';
  }).join('');
}
function paintPalette(){
  if(G.phase!=='place')return;
  var rem=remaining(),cnt={};rem.forEach(function(s){cnt[s]=(cnt[s]||0)+1;});
  var sizes=fleet().slice().filter(function(v,i,a){return a.indexOf(v)===i;}).sort(function(a,b){return b-a;});
  var h='';
  sizes.forEach(function(s){
    var cells='';for(var i=0;i<s;i++)cells+='<i></i>';
    h+='<button type="button" class="pal'+(Pl.size===s?' sel':'')+(cnt[s]?'':' done')+'" data-s="'+s+'"><span class="fl-ship">'+cells+'</span><b>&#215;'+(cnt[s]||0)+'</b></button>';
  });
  $('palette').innerHTML=h;
  $('pl-vert').textContent=t(Pl.vert?'pl.vert':'pl.horiz');
  $('btn-ready').disabled=rem.length>0;
  $('pl-msg').textContent=rem.length?t('pl.msg'):t('pl.done');
}
function paintHud(){
  if(!G)return;
  $('hud-mode').textContent=t('mode.'+G.mode)+(aiOn()?' / '+t('lvl.'+G.level):'');
  var me=G.mode==='duel'?G.turn:0;
  $('hud-shots').textContent=G.shots[me];
  $('hud-acc').textContent=G.shots[me]?Math.round(G.hits[me]/G.shots[me]*100)+'%':'-';
}

/* вспышка и дым при потоплении */
function flashSunk(bi,ship){
  var v=bi===(G.mode==='duel'?G.turn:0)?views['b-own']:views['b-enemy'];
  var e=document.createElement('div');e.className='sink-fx'+(ship.vert?' v':'');
  e.style.cssText='--r:'+ship.r+';--c0:'+ship.c+';--n:'+ship.size;
  v.fx.appendChild(e);setTimeout(function(){e.remove();},1200);
}
function nope(){var b=$('arena');b.classList.remove('shake');void b.offsetWidth;b.classList.add('shake');Sound.sfx('nope');}
Sound.define('nope',function(tm,tone){tone(tm,170,0.08,'square',0.04);});

/* ════════ УПРАВЛЕНИЕ ════════ */
function cellFrom(e){
  var el=e.target.closest?e.target.closest('.cell,.ship'):null;if(!el)return null;
  if(el.classList.contains('ship'))return {ship:+el.dataset.k};
  return {i:+el.dataset.i};
}
function bindBoards(){
  var own=$('b-own'),en=$('b-enemy');
  own.addEventListener('click',function(e){
    if(!G||G.phase!=='place'||busy)return;
    var h=cellFrom(e);if(!h)return;
    if(h.ship!=null){pickUp(h.ship);return;}
    placeAt(h.i);
  });
  own.addEventListener('mousemove',function(e){
    if(!G||G.phase!=='place')return;
    var h=cellFrom(e),i=h&&h.i!=null?h.i:-1;
    if(i!==Pl.hover){Pl.hover=i;render();}
  });
  own.addEventListener('mouseleave',function(){if(G&&Pl.hover>=0){Pl.hover=-1;render();}});
  own.addEventListener('contextmenu',function(e){if(G&&G.phase==='place'){e.preventDefault();rotate();}});
  en.addEventListener('click',function(e){
    if(!G)return;
    var h=cellFrom(e);if(!h||h.i==null)return;
    tapEnemy(h.i);
  });
  $('palette').addEventListener('click',function(e){
    var b=e.target.closest?e.target.closest('.pal'):null;if(!b||b.classList.contains('done'))return;
    Pl.size=+b.dataset.s;Sound.sfx('select');render();
  });
}
document.addEventListener('keydown',function(e){
  if(!G||!document.body.classList.contains('screen-game'))return;
  if((e.key==='r'||e.key==='R'||e.key==='к'||e.key==='К')&&G.phase==='place')rotate();
  if(e.key==='Enter'&&G.phase==='battle'&&salvo())fireSalvo();
});
window.addEventListener('resize',function(){setTimeout(render,60);});

function onLang(){
  paintMenu();
  for(var k in views)paintCols(views[k]);
  if(G){render();var el=$('status');if(el.dataset.key)status(el.dataset.key,el.dataset.vars?JSON.parse(el.dataset.vars):null,el.className.replace('status','').trim());}
}

function bindSeg(id,fn){
  document.querySelectorAll('#seg-'+id+' .seg-btn').forEach(function(b){
    b.addEventListener('click',function(){fn(b.dataset.v);save();paintMenu();Sound.sfx('select');});
  });
}
function boot(){
  A.topbar('bs.title');
  I18n.apply();I18n.onChange(onLang);
  makeBoard('b-own');makeBoard('b-enemy');
  bindBoards();
  bindSeg('level',function(v){S.level=v;});
  bindSeg('fleet',function(v){S.fleet=v;});
  bindSeg('touch',function(v){S.noTouch=v==='no';});
  bindSeg('theme',function(v){S.theme=v;});
  $('btn-play').addEventListener('click',newGame);
  $('btn-continue').addEventListener('click',resume);
  $('btn-menu').addEventListener('click',function(){showScreen('menu');});
  $('btn-new').addEventListener('click',newGame);
  $('pl-rotate').addEventListener('click',rotate);
  $('pl-auto').addEventListener('click',autoPlace);
  $('pl-reset').addEventListener('click',resetPlace);
  $('btn-ready').addEventListener('click',ready);
  $('btn-fire').addEventListener('click',fireSalvo);
  $('pass-go').addEventListener('click',passGo);
  $('over-new').addEventListener('click',newGame);
  $('over-menu').addEventListener('click',function(){hide('over-modal');showScreen('menu');});
  paintMenu();
  showScreen('menu');
}

window.AceonBS={g:function(){return G;},settings:S,db:DB,newGame:newGame,placeAt:placeAt,autoPlace:autoPlace,ready:ready,
  tap:tapEnemy,fire:fireSalvo,rotate:rotate,render:render,pass:passGo};
boot();
})();
