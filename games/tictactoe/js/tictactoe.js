/* A.C.EON TIC TAC TOE: меню, партия, счёт матча, бот, статистика, сохранение.
   Правила и боты в rules.js, тексты в lang.js.
   Против бота вы всегда X, бот всегда O; кто ходит первым, задаётся в меню.
   Вдвоём первый ход переходит по очереди. */
(function(){
'use strict';

var t=I18n.t,A=window.Arcade,R=window.TTT;
var $=function(id){return document.getElementById(id);};
function show(id){$(id).classList.remove('hidden');}
function hide(id){$(id).classList.add('hidden');}

var MODES=['classic','vanish'],LEVELS=['easy','normal','hard'];
var BOT_DELAY=450;

/* ── сохранения ── */
Store.define('tictactoe',{
  version:1,
  defaults:{settings:{mode:'classic',opp:'bot',level:'normal',first:'alt',theme:'neon'},stats:{},save:null},
  legacy:function(){return null;}
});
var DB=Store.get('tictactoe'),S=DB.settings;
if(MODES.indexOf(S.mode)<0)S.mode='classic';
if(S.opp!=='duo')S.opp='bot';
if(LEVELS.indexOf(S.level)<0)S.level='normal';
if(['me','bot','alt'].indexOf(S.first)<0)S.first='alt';
if(['neon','chalk','paper'].indexOf(S.theme)<0)S.theme='neon';
function save(){Store.save('tictactoe');}
function statKey(g){return g.mode+'-'+(g.opp==='duo'?'duo':g.level);}
function stat(k){if(!DB.stats[k])DB.stats[k]={played:0,win:0,draw:0,lose:0,streak:0,best:0};return DB.stats[k];}

/* ── звуки ── */
Sound.define('tx',function(tm,tone){tone(tm,520,0.06,'square',0.04);tone(tm+0.05,780,0.07,'square',0.035);});
Sound.define('to',function(tm,tone){tone(tm,330,0.12,'triangle',0.07,440);});
Sound.define('tgone',function(tm,tone,noise){noise(tm,0.12,0.15,2500);tone(tm,600,0.15,'sine',0.03,200);});
Sound.define('tdraw',function(tm,tone){tone(tm,392,0.12,'triangle',0.06);tone(tm+0.14,392,0.16,'triangle',0.05);});

/* ── матч ──
   G: {mode,opp,level,first,st,game,score:{a,b,d},botFirst,over} */
var G=null,botT=null;

/* ════════ МЕНЮ ════════ */
function modeIcon(m){
  /* маленькое поле с крестиками и ноликами; у «исчезающих» один знак бледный */
  var h='<span class="m-ico">',b=m==='classic'?'XO.OX...X':'X.O.XO..'+'.';
  for(var i=0;i<9;i++){var c=b[i];h+='<i class="'+(c==='X'?'ix':c==='O'?'io':'')+(m==='vanish'&&i===0?' if':'')+'"></i>';}
  return h+'</span>';
}
function buildModes(){
  var list=$('mode-list');list.innerHTML='';
  MODES.forEach(function(m){
    var b=document.createElement('button');
    b.type='button';b.className='m-card-btn'+(S.mode===m?' sel':'');
    b.innerHTML=modeIcon(m)+'<span class="m-txt"><span class="m-name" data-i18n="mode.'+m+'"></span><span class="m-desc" data-i18n="desc.'+m+'"></span></span>';
    b.addEventListener('click',function(){S.mode=m;save();paintMenu();Sound.sfx('select');});
    list.appendChild(b);
  });
  I18n.apply(list);
}
function buildStats(){
  var h='<div class="st-row st-head"><span></span><span data-i18n="st.games"></span><span data-i18n="st.win"></span><span data-i18n="st.draw"></span><span data-i18n="st.lose"></span></div>';
  LEVELS.forEach(function(l){
    var s=DB.stats[S.mode+'-'+l]||{played:0,win:0,draw:0,lose:0};
    var cur=S.opp==='bot'&&S.level===l;
    h+='<div class="st-row'+(cur?' cur':'')+'"><span data-i18n="lvl.'+l+'"></span><b>'+s.played+'</b><b>'+s.win+'</b><b>'+s.draw+'</b><b>'+s.lose+'</b></div>';
  });
  var cs=DB.stats[S.mode+'-'+S.level]||{best:0};
  h+='<div class="st-line"><span data-i18n="st.streak"></span> (<span data-i18n="lvl.'+S.level+'"></span>): <b>'+(cs.best||0)+'</b></div>';
  var d=DB.stats[S.mode+'-duo']||{played:0,win:0,draw:0,lose:0};
  h+='<div class="st-row st-head st-duo"><span data-i18n="st.duo"></span><span data-i18n="st.games"></span><span data-i18n="st.xwin"></span><span data-i18n="st.draw"></span><span data-i18n="st.owin"></span></div>';
  h+='<div class="st-row'+(S.opp==='duo'?' cur':'')+'"><span>X / O</span><b>'+d.played+'</b><b>'+d.win+'</b><b>'+d.draw+'</b><b>'+d.lose+'</b></div>';
  $('stats').innerHTML=h;I18n.apply($('stats'));
}
/* превью темы: маленькое поле с двумя знаками */
function themePreview(el){
  el.innerHTML='<i class="gl gl-v1"></i><i class="gl gl-v2"></i><i class="gl gl-h1"></i><i class="gl gl-h2"></i>'+
    '<span class="pv-x">'+markSvg('X',false)+'</span><span class="pv-o">'+markSvg('O',false)+'</span>';
}
function paintMenu(){
  buildModes();buildStats();
  [['opp',S.opp],['level',S.level],['first',S.first]].forEach(function(x){
    var list=document.querySelectorAll('#seg-'+x[0]+' .seg-btn');
    for(var i=0;i<list.length;i++)list[i].classList.toggle('sel',list[i].getAttribute('data-v')===x[1]);
  });
  $('bot-box').classList.toggle('hidden',S.opp!=='bot');
  $('level-note').textContent=t(S.level==='hard'&&S.mode==='vanish'?'lvld.hardv':'lvld.'+S.level);
  var th=document.querySelectorAll('#themes .th-card');
  for(var i=0;i<th.length;i++){
    th[i].classList.toggle('sel',th[i].getAttribute('data-v')===S.theme);
    var pv=th[i].querySelector('.th-prev');pv.className='th-prev tp-'+th[i].getAttribute('data-v');
    if(!pv.firstChild)themePreview(pv);
  }
  $('btn-continue').classList.toggle('hidden',!((G&&!G.over)||(DB.save&&DB.save.st)));
  applyTheme();
}
function applyTheme(){
  var b=document.body;
  ['neon','chalk','paper'].forEach(function(x){b.classList.toggle('th-'+x,S.theme===x);});
}
function showScreen(name){
  document.body.classList.toggle('screen-menu',name==='menu');
  document.body.classList.toggle('screen-game',name==='game');
  if(name==='menu'){clearTimeout(botT);persist();paintMenu();}
  Sound.music(name==='menu'?'menu':'game');
  window.scrollTo(0,0);
  if(name==='game'){layout();requestAnimationFrame(layout);setTimeout(layout,250);}
}

/* ════════ МАТЧ И ПАРТИЯ ════════ */
function newMatch(){
  G={mode:S.mode,opp:S.opp,level:S.level,first:S.first,st:null,game:0,score:{a:0,b:0,d:0},botFirst:false,over:false};
  nextGame();
  showScreen('game');
}
/* кто начинает партию */
function starter(){
  if(G.opp==='duo')return G.game%2?'O':'X';
  var bf=G.first==='bot'||(G.first==='alt'&&G.game%2===1);
  return bf?'O':'X';
}
function nextGame(){
  clearTimeout(botT);
  G.st=R.create(G.mode,starter());
  G.over=false;G.counted=false;
  hide('btn-next');
  clearWin();
  paintBoard(-1,-1);
  paintHud();
  turn();
  persist();
}
function persist(){
  if(!G)return;
  DB.save=G;
  save();
}
function resume(){
  if(!G&&DB.save&&DB.save.st)G=DB.save;
  if(!G)return;
  hide('btn-next');clearWin();
  paintBoard(-1,-1);paintHud();
  showScreen('game');
  if(G.st.over)endGame(true);else turn();
}
function botTurn(){return G.opp==='bot'&&G.st.turn==='O'&&!G.st.over;}
/* чей ход: подпись и, если ходит бот, его ход с задержкой */
function turn(){
  if(!G||G.st.over)return;
  var fade=R.fading(G.st)>=0;
  if(G.opp==='duo')status(fade?'msg.turnFade':'msg.turn',{p:G.st.turn},'turn-'+G.st.turn);
  else if(botTurn())status('msg.bot',null,'turn-O');
  else status(fade?'msg.youFade':'msg.you',null,'turn-X');
  document.body.classList.toggle('bot-turn',botTurn());
  if(botTurn()){
    clearTimeout(botT);
    var needSolve=G.mode==='vanish'&&G.level==='hard';
    if(needSolve&&!turn.solved){
      status('msg.prep',null,'turn-O');
      botT=setTimeout(function(){R.solve();turn.solved=true;botT=setTimeout(botMove,200);},40);
    }else botT=setTimeout(botMove,BOT_DELAY);
  }
}
function botMove(){
  if(!G||!botTurn()||!document.body.classList.contains('screen-game'))return;
  var c=R.bot(G.st,G.level);
  if(c>=0)move(c);
}
function move(i){
  if(!G||G.st.over)return;
  var p=G.st.turn,r=R.play(G.st,i);
  if(!r){nope(i);return;}
  if(G.game===0&&G.st.n===1)A.trackPlay();
  Sound.sfx(p==='X'?'tx':'to');
  if(r.gone>=0)setTimeout(function(){Sound.sfx('tgone');},90);
  paintBoard(i,r.gone);
  if(G.st.over)endGame(false);
  else turn();
  persist();
}
/* конец партии: счёт матча, статистика, линия победы, кнопка «следующая» */
function endGame(restored){
  var st=G.st;G.over=true;
  document.body.classList.remove('bot-turn');
  if(!G.counted){
    G.counted=true;
    var s=stat(statKey(G));s.played++;
    if(st.draw){G.score.d++;s.draw++;if(G.opp==='bot')s.streak=0;}
    else if(st.winner==='X'){G.score.a++;s.win++;if(G.opp==='bot'){s.streak++;s.best=Math.max(s.best,s.streak);}}
    else{G.score.b++;s.lose++;if(G.opp==='bot')s.streak=0;}
    G.game++;
    save();
  }
  var win=st.winner,cls;
  if(st.draw){status(st.n>=R.LIMIT&&st.mode==='vanish'?'msg.limit':'msg.draw',{n:R.LIMIT},'draw');cls='draw';}
  else if(G.opp==='duo'){status('msg.pWin',{p:win},'win-'+win);cls='good';}
  else if(win==='X'){
    var sk=stat(statKey(G)).streak;
    status(sk>=3?'msg.streak':'msg.youWin',{n:sk},'win-X');cls='good';
  }else{status('msg.botWin',null,'win-O');cls='bad';}
  if(!restored){
    if(st.draw)Sound.sfx('tdraw');else if(G.opp==='bot'&&win==='O')Sound.sfx('lose');else Sound.sfx('win');
  }
  if(st.win)drawWin(st.win,win);
  $('board').classList.add('ended');
  paintHud();
  show('btn-next');
  persist();
}
function resetScore(){
  if(!G)return;
  G.score={a:0,b:0,d:0};
  paintHud();persist();Sound.sfx('select');
}

/* ════════ ПОЛЕ ════════ */
function markSvg(p,anim){
  if(p==='X')return '<svg class="mk mk-x'+(anim?' draw':'')+'" viewBox="0 0 100 100"><path d="M24 24L76 76"/><path class="p2" d="M76 24L24 76"/></svg>';
  return '<svg class="mk mk-o'+(anim?' draw':'')+'" viewBox="0 0 100 100"><circle cx="50" cy="50" r="27"/></svg>';
}
var cellEls=[];
function buildCells(){
  var box=$('cells');box.innerHTML='';cellEls=[];
  for(var i=0;i<9;i++){
    var b=document.createElement('button');
    b.type='button';b.className='cell';b.setAttribute('data-i',i);
    b.setAttribute('aria-label',String(i+1));
    (function(k){b.addEventListener('click',function(){userMove(k);});})(i);
    box.appendChild(b);cellEls.push(b);
  }
}
/* last: только что поставленный знак (рисуется с анимацией); gone: исчезнувший */
function paintBoard(last,gone){
  var st=G.st,fade=R.fading(st);
  $('board').classList.toggle('ended',!!st.over);
  for(var i=0;i<9;i++){
    var el=cellEls[i],v=st.b[i],have=el.getAttribute('data-v')||'';
    if(i===gone&&have){
      /* исчезает: старый знак тает */
      var old=el.firstChild;
      if(old){old.classList.add('vanish');}
      (function(e,o){setTimeout(function(){if(o&&o.parentNode===e)e.removeChild(o);},360);})(el,old);
      el.setAttribute('data-v','');
    }
    if(v!==have&&!(i===gone&&!v)){
      el.innerHTML=v?markSvg(v,i===last):'';
      el.setAttribute('data-v',v);
    }
    var mk=el.querySelector('.mk:not(.vanish)');
    if(mk)mk.classList.toggle('fade',i===fade&&!st.over);
    var playable=!st.over&&!v&&i!==fade&&!(G.opp==='bot'&&st.turn==='O');
    el.classList.toggle('free',playable);
    el.disabled=false;
  }
  /* у соперника тоже бледнеет знак, который исчезнет на его следующем ходу */
  if(st.mode==='vanish'&&!st.over){
    var oh=st.hist[R.other(st.turn)];
    if(oh.length>=3){var om=cellEls[oh[0]].querySelector('.mk:not(.vanish)');if(om)om.classList.add('dim');}
    for(var k=0;k<9;k++){var m2=cellEls[k].querySelector('.mk');if(m2&&(oh.length<3||k!==oh[0]))m2.classList.remove('dim');}
  }else for(var j=0;j<9;j++){var m3=cellEls[j].querySelector('.mk');if(m3)m3.classList.remove('dim');}
}
function userMove(i){
  if(!G||G.st.over||botTurn())return;
  if(!document.body.classList.contains('screen-game'))return;
  move(i);
}
function nope(i){
  var el=cellEls[i];if(!el)return;
  el.classList.remove('shake');void el.offsetWidth;el.classList.add('shake');
}
/* линия победы поверх поля (координаты 0..300) */
function drawWin(l,p){
  function c(i){return [50+(i%3)*100,50+Math.floor(i/3)*100];}
  var a=c(l[0]),b=c(l[2]),dx=b[0]-a[0],dy=b[1]-a[1],len=Math.sqrt(dx*dx+dy*dy),ex=dx/len*36,ey=dy/len*36;
  var ln=$('wl');
  ln.setAttribute('x1',a[0]-ex);ln.setAttribute('y1',a[1]-ey);ln.setAttribute('x2',b[0]+ex);ln.setAttribute('y2',b[1]+ey);
  var svg=$('winline');svg.setAttribute('class','winline on wl-'+p);
  l.forEach(function(i){cellEls[i].classList.add('won');});
}
function clearWin(){
  $('winline').setAttribute('class','winline');
  cellEls.forEach(function(e){e.classList.remove('won');});
}

function paintHud(){
  if(!G)return;
  var duo=G.opp==='duo',sc=G.score;
  var la=duo?'X':t('hud.you')+' (X)',lb=duo?'O':t('hud.bot')+' (O)';
  var turnA=!G.st.over&&G.st.turn==='X',turnB=!G.st.over&&G.st.turn==='O';
  $('score').innerHTML='<div class="sc sc-x'+(turnA?' on':'')+'"><span>'+la+'</span><b>'+sc.a+'</b></div>'+
    '<div class="sc sc-d"><span>'+t('hud.draws')+'</span><b>'+sc.d+'</b></div>'+
    '<div class="sc sc-o'+(turnB?' on':'')+'"><span>'+lb+'</span><b>'+sc.b+'</b></div>';
  $('hud-mode').textContent=t('mode.'+G.mode)+' / '+(duo?t('opp.duo'):t('lvl.'+G.level));
}
function status(k,vars,cls){
  var el=$('status');
  el.setAttribute('data-key',k||'');el.setAttribute('data-vars',vars?JSON.stringify(vars):'');el.setAttribute('data-cls',cls||'');
  el.textContent=k?t(k,vars):'';
  el.className='status'+(cls?' '+cls:'');
}

/* ── размер поля под окно ── */
function layout(){
  if(!G||!document.body.classList.contains('screen-game'))return;
  var area=$('arena'),W=area.clientWidth-24,top=area.getBoundingClientRect().top;
  var H=(window.innerHeight||document.documentElement.clientHeight)-top-80;
  var size=Math.floor(Math.max(180,Math.min(W,H,560)));
  var b=$('board');b.style.width=b.style.height=size+'px';
  b.style.setProperty('--sz',size+'px');
}

/* ════════ УПРАВЛЕНИЕ ════════ */
/* цифры как на цифровом блоке: 7 8 9 сверху */
var NUM={'7':0,'8':1,'9':2,'4':3,'5':4,'6':5,'1':6,'2':7,'3':8};
document.addEventListener('keydown',function(e){
  if(!G||!document.body.classList.contains('screen-game'))return;
  if(e.ctrlKey||e.metaKey||e.altKey)return;
  var k=e.key||'',code=e.code||'';
  if(/^Numpad[1-9]$/.test(code))k=code.slice(6);
  if(NUM.hasOwnProperty(k)){e.preventDefault();userMove(NUM[k]);return;}
  var lk=k.toLowerCase();
  if((lk==='n'||lk==='т'||k==='Enter'||k===' ')&&G.st.over){e.preventDefault();nextGame();}
  else if(k==='Escape')showScreen('menu');
});

var rzT;
window.addEventListener('resize',function(){clearTimeout(rzT);rzT=setTimeout(layout,80);});
window.addEventListener('orientationchange',function(){setTimeout(layout,250);});
document.addEventListener('visibilitychange',function(){if(document.hidden)persist();});
window.addEventListener('pagehide',persist);

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
  buildCells();
  bindSeg('opp',function(v){S.opp=v;});
  bindSeg('level',function(v){S.level=v;});
  bindSeg('first',function(v){S.first=v;});
  var th=document.querySelectorAll('#themes .th-card');
  for(var i=0;i<th.length;i++)(function(b){
    b.addEventListener('click',function(){S.theme=b.getAttribute('data-v');save();paintMenu();Sound.sfx('select');});
  })(th[i]);
  $('btn-play').addEventListener('click',newMatch);
  $('btn-continue').addEventListener('click',resume);
  $('btn-menu').addEventListener('click',function(){showScreen('menu');});
  $('btn-reset').addEventListener('click',resetScore);
  $('btn-next').addEventListener('click',function(){nextGame();Sound.sfx('select');});
  paintMenu();
  showScreen('menu');
}

window.AceonTTT={g:function(){return G;},settings:S,db:DB,newMatch:newMatch,nextGame:nextGame,move:userMove,resume:resume,layout:layout};
boot();
})();
