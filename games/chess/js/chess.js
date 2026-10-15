/* A.C.EON CHESS: меню, партия, интерфейс, персонаж A.C.EON, итоги.
   Правила rules.js, движок engine.js, режимы и уровни modes.js, часы clock.js,
   подсказки coach.js, доска board2d.js, фигуры pieces.js, тексты lang.js. */
(function(){
'use strict';

var R=window.ChessRules,E=window.Engine,A=window.Arcade,PC=window.ChessPieces,M=window.ChessModes;
var t=I18n.t,pick=I18n.pick;
var $=function(id){return document.getElementById(id);};
function pieceSvg(p){return PC.svg(p[1],p[0]);}
var VAL={P:1,N:3,B:3,R:5,Q:9,K:0};
var MODES=M.MODES;
var HISTORY_MAX=200,HISTORY_FULL=30;

/* ── хранилище: настройки, уровни, история, незаконченная партия ── */
Store.define('chess',{
  version:2,
  defaults:{
    settings:{level:'beginner',theme:'wood',view:'2d',side:'r',blitz:300},
    rating:{adaptive:M.START,blitz:null},
    wins:{},history:[],game:null
  },
  legacy:function(raw,json){
    var o={settings:{},wins:{}},s=json('aceon_chess_settings');
    if(s)['level','theme','side'].forEach(function(k){if(s[k])o.settings[k]=s[k];});
    ['beginner','professional','aceon_professional','aceon_expert','aceon_grandmaster'].forEach(function(k){
      var w=parseInt(raw('aceon_chess_wins_'+k),10);if(w)o.wins[k]=w;
    });
    return o;
  },
  migrate:function(d){
    /* v1 -> v2: режим «Профи» заменён адаптивным */
    if(d.settings&&d.settings.level==='professional')d.settings.level='adaptive';
    if(d.game&&d.game.level==='professional')d.game.level='adaptive';
    return d;
  }
});
var DB=Store.get('chess');
var S=DB.settings;
if(S.level==='professional')S.level='adaptive';
if(!MODES[S.level])S.level='beginner';
if(S.theme!=='wood'&&S.theme!=='neon')S.theme='wood';
if(S.side!=='w'&&S.side!=='b'&&S.side!=='r')S.side='r';
if(S.blitz!==300&&S.blitz!==600)S.blitz=300;
S.view='2d';
if(!DB.rating.adaptive)DB.rating.adaptive=M.START;
function saveDB(){Store.save('chess');}

var G={
  st:R.startState(),human:'w',ai:'b',dead:true,sel:null,
  history:[],keys:[],uci:[],lastH:null,lastA:null,
  capByHuman:[],capByAi:[],start:0,gameId:0,thinking:false,promo:null,started:false,
  mode:'beginner',lvl:null,undoLeft:0,clock:null,coach:null,hint:null,evalW:null,
  result:null,lvlChange:null,msg:null
};
function mode(){return MODES[G.mode];}
function sideName(c){return t(c==='w'?'side.w':'side.b');}
function show(id){$(id).classList.remove('hidden');}
function hide(id){$(id).classList.add('hidden');}

/* уровень соперника для режима (для фиксированных режимов null) */
function modeLevel(key){
  var m=MODES[key];
  if(m.kind==='adaptive'||m.kind==='training')return DB.rating.adaptive;
  if(m.kind==='blitz'){
    if(DB.rating.blitz==null)DB.rating.blitz=M.clamp(DB.rating.adaptive+m.offset);
    return DB.rating.blitz;
  }
  return null;
}
function modeBars(key){var L=modeLevel(key);return L==null?MODES[key].bars:M.levelBars(L);}

/* что получает Stockfish в этой партии */
function aiParams(){
  var m=mode();
  if(m.kind==='fixed')return {depth:m.depth,skill:m.skill,movetime:m.movetime,contempt:m.contempt||0};
  var p=M.levelParams(G.lvl);
  if(m.kind==='blitz')p.movetime=Math.min(p.movetime||2,2);   // в блице не дольше 2 с
  return p;
}

/* ── статус над доской: хранится ключами, чтобы переводиться при смене языка ── */
function msg(parts,cls){
  if(!Array.isArray(parts[0]))parts=[parts];
  G.msg={parts:parts,cls:cls===true?'check':(cls||'')};
  paintMsg();
}
function paintMsg(){
  if(!G.msg)return;
  var el=$('ch-msg');
  el.textContent=G.msg.parts.map(function(p){return t(p[0],p[1]);}).join(' / ');
  el.className=G.msg.cls;
}
function turnMsg(){msg(['msg.turnSide',{side:sideName(G.human)}]);}

/* ── персонаж ── */
var Bot=(function(){
  var root,statusEl,subEl,cur='idle',revert=null;
  function set(m){cur=m;root.className='mood-'+m;statusEl.textContent=pick('bot.'+m);}
  function sub(){subEl.textContent=t('lvl.'+G.mode)+(G.lvl!=null?' '+t('lvl.n',{n:G.lvl}):'');}
  return{
    init:function(){root=$('aceon-bot');statusEl=$('aceon-bot-status');subEl=$('aceon-bot-sub');},
    mode:function(){root.style.setProperty('--bot-accent',mode().accent);sub();},
    repaint:function(){set(cur);sub();},
    react:function(m){
      if(revert){clearTimeout(revert);revert=null;}
      set(m);
      if({moved:1,attack:1,hurt:1,check:1,aiChecked:1}[m]){
        revert=setTimeout(function(){if(cur===m)set(G.thinking?'thinking':'idle');},1700);
      }
    }
  };
})();

/* ════════ МЕНЮ ════════ */
function barsHtml(n){var h='';for(var i=0;i<5;i++)h+='<i class="'+(i<n?'on':'')+'"></i>';return h;}
function popRow(labelKey,valueHtml){return '<span class="pop-row"><span data-i18n="'+labelKey+'"></span><b>'+valueHtml+'</b></span>';}
function i18nSpan(key,vars){return '<span>'+t(key,vars)+'</span>';}

function modeStats(key){
  var list=DB.history.filter(function(h){return h.mode===key;});
  var w=list.filter(function(h){return h.res==='win';}).length;
  return {games:list.length,pct:list.length?Math.round(w/list.length*100):0};
}

function buildLevels(){
  var list=$('lvl-list');list.innerHTML='';
  M.KEYS.forEach(function(k){
    var m=MODES[k],L=modeLevel(k),bars=modeBars(k);
    var b=document.createElement('button');
    b.type='button';b.className='lvl-card';b.dataset.lvl=k;
    b.style.setProperty('--acc',m.accent);
    var rows='';
    if(m.kind==='fixed'){
      rows+=popRow('pop.depth',m.depth);
      rows+=popRow('pop.time',i18nSpan(m.movetime?'pop.long':'pop.fast'));
    }else{
      rows+=popRow('pop.level',L+' / '+M.MAX);
      if(m.kind!=='training'){var st=modeStats(k);rows+=popRow('pop.games',st.games)+popRow('pop.winrate',st.pct+'%');}
    }
    if(m.coach)rows+=popRow('pop.hints',i18nSpan('pop.yes'));
    if(m.clock)rows+=popRow('pop.clock',i18nSpan('pop.min',{n:S.blitz/60}));
    rows+=popRow('pop.undo',i18nSpan(m.undo===Infinity?'pop.unlimited':m.undo?'pop.undoN':'pop.no',{n:m.undo}));
    rows+=popRow('pop.strength','<span class="bars">'+barsHtml(bars)+'</span>');
    b.innerHTML=
      '<span class="lvl-name"><span data-i18n="lvl.'+k+'"></span>'+(L!=null?'<small>'+t('lvl.n',{n:L})+'</small>':'')+'</span>'+
      '<span class="bars">'+barsHtml(bars)+'</span>'+
      '<span class="lvl-pop" role="tooltip">'+
        '<span class="pop-name" data-i18n="lvl.'+k+'"></span>'+
        '<span class="pop-desc" data-i18n="desc.'+k+'"></span>'+rows+
      '</span>';
    b.addEventListener('click',function(){S.level=k;saveDB();paintMenu();Sound.sfx('select');});
    list.appendChild(b);
  });
  I18n.apply(list);
}

/* превью: кусок доски в выбранной теме */
var PREVIEW=[['bR',null,'bK',null],['bP','bP',null,'bN'],[null,'wB',null,null],['wP',null,'wQ','wK']];
function buildPreview(){
  var h='';
  for(var r=0;r<4;r++)for(var c=0;c<4;c++){
    var p=PREVIEW[r][c];
    h+='<div class="ch-cell '+((r+c)%2===0?'ch-light':'ch-dark')+'">'+(p?'<div class="ch-pw">'+pieceSvg(p)+'</div>':'')+'</div>';
  }
  $('preview-board').innerHTML=h;
  $('ico-w').innerHTML=PC.svg('K','w');
  $('ico-b').innerHTML=PC.svg('K','b');
}

function paintMenu(){
  buildLevels();
  document.querySelectorAll('.lvl-card').forEach(function(b){b.classList.toggle('sel',b.dataset.lvl===S.level);});
  ['view','theme','side','blitz'].forEach(function(k){
    document.querySelectorAll('#seg-'+k+' .seg-btn').forEach(function(b){b.classList.toggle('sel',b.dataset.v===String(S[k]));});
  });
  $('opt-blitz').classList.toggle('hidden',S.level!=='blitz');
  setTheme(S.theme);
  $('tag-view').textContent=S.view.toUpperCase();
  $('tag-theme').textContent=t('theme.'+S.theme);
  $('btn-continue').classList.toggle('hidden',!(G.started&&!G.dead&&G.history.length));
}
function setTheme(th){
  document.body.classList.remove('theme-wood','theme-neon');
  document.body.classList.add('theme-'+th);
}
function bindSeg(key){
  document.querySelectorAll('#seg-'+key+' .seg-btn').forEach(function(b){
    b.addEventListener('click',function(){
      if(b.classList.contains('soon')){b.classList.remove('shake');void b.offsetWidth;b.classList.add('shake');return;}
      S[key]=key==='blitz'?parseInt(b.dataset.v,10):b.dataset.v;saveDB();paintMenu();Sound.sfx('select');
    });
  });
}

function showScreen(name){
  document.body.classList.toggle('screen-menu',name==='menu');
  document.body.classList.toggle('screen-game',name==='game');
  if(name==='menu'){
    if(G.clock&&G.clock.running())G.clock.stop();   // в меню часы стоят
    paintMenu();
  }
  Sound.music(name==='menu'?'menu':'game');
  window.scrollTo(0,0);
}

/* ════════ ПАРТИЯ ════════ */
function resetGame(modeKey,human,lvl){
  E.newGame();
  G.gameId++;
  G.mode=modeKey;G.lvl=lvl;
  G.st=R.startState();G.dead=false;G.sel=null;G.promo=null;G.thinking=false;G.result=null;G.endTime=null;G.lvlChange=null;
  G.history=[];G.keys=[R.positionKey(G.st)];G.uci=[];
  G.lastH=G.lastA=null;G.capByHuman=[];G.capByAi=[];G.start=Date.now();
  G.human=human;G.ai=R.opp(human);
  G.undoLeft=mode().undo;G.coach=null;G.hint=null;G.evalW=null;
  if(G.clock)G.clock.stop();
  G.clock=null;
  G.started=true;
  hide('report-modal');hide('promo-modal');resetResign();
  paintGamePanel();paintEval();
  Bot.mode();Bot.react('idle');
}
function newGame(){
  abandonCheck();
  var key=S.level;
  resetGame(key,S.side==='r'?(Math.random()<0.5?'w':'b'):S.side,modeLevel(key));
  if(mode().clock)G.clock=makeClock({w:S.blitz*1000,b:S.blitz*1000});
  saveGame();
  render();
  showScreen('game');
  A.trackPlay();
  if(G.clock)G.clock.start(G.st.turn);
  if(G.st.turn===G.ai){msg(['msg.aiFirst']);setTimeout(aiMove,500);}
  else{turnMsg();coachBefore();}
}
/* брошенная партия в адаптивных режимах засчитывается как поражение,
   иначе уровень можно было бы держать низким, просто начиная заново */
function abandonCheck(){
  if(!G.started||G.dead)return;
  var k=mode().kind;
  if((k==='adaptive'||k==='blitz')&&G.uci.length>=4){
    G.dead=true;G.endTime=Date.now();E.cancel();
    if(G.clock)G.clock.stop();
    recordResult({result:'lose',reason:'reason.abandoned'});
  }
}

function paintGamePanel(){
  var m=mode();
  $('game-lvl-name').textContent=t('lvl.'+G.mode)+(G.lvl!=null?' '+t('lvl.n',{n:G.lvl}):'');
  $('game-lvl-bars').innerHTML=barsHtml(G.lvl!=null?M.levelBars(G.lvl):m.bars);
  $('game-lvl-bars').style.setProperty('--acc',m.accent);
  $('ch-side').textContent=t('game.you',{side:sideName(G.human)});
  $('ch-undo').classList.toggle('hidden',!m.undo);
  $('ch-hint').classList.toggle('hidden',!m.coach);
  $('ch-clocks').classList.toggle('hidden',!m.clock);
  $('ch-eval').classList.toggle('hidden',!m.coach);
  paintUndo();paintClocks();
}
function paintUndo(){
  var b=$('ch-undo');
  b.textContent=G.undoLeft===Infinity?t('game.undoInf'):t('game.undo',{n:G.undoLeft});
  b.disabled=!canUndo();
}

/* ── сохранение партии: хватает списка ходов, всё остальное восстанавливается повтором ── */
function saveGame(){
  DB.game=G.dead||!G.started?null:{
    level:G.mode,human:G.human,lvl:G.lvl,uci:G.uci.slice(),elapsed:Date.now()-G.start,
    undoLeft:G.undoLeft===Infinity?-1:G.undoLeft,
    clock:G.clock?G.clock.snapshot():null,
    q:G.history.map(function(h){return h.q||0;})
  };
  saveDB();
}
function restoreGame(){
  var sv=DB.game;
  if(!sv||!MODES[sv.level]||(sv.human!=='w'&&sv.human!=='b')||!Array.isArray(sv.uci))return false;
  var lvl=sv.lvl!=null?sv.lvl:modeLevel(sv.level);
  resetGame(sv.level,sv.human,lvl);
  if(!replay(sv.uci)||gameResult()){DB.game=null;saveDB();G.started=false;G.dead=true;return false;}
  (sv.q||[]).forEach(function(q,i){if(q&&G.history[i])G.history[i].q=q;});
  if(sv.undoLeft!=null)G.undoLeft=sv.undoLeft<0?Infinity:sv.undoLeft;
  if(mode().clock)G.clock=makeClock(sv.clock||{w:S.blitz*1000,b:S.blitz*1000});
  G.start=Date.now()-(sv.elapsed||0);
  paintGamePanel();
  render();
  if(G.st.turn===G.human)turnMsg();
  return true;
}
function continueGame(){
  showScreen('game');
  if(G.dead)return;
  if(G.clock)G.clock.start(G.st.turn);
  if(G.st.turn===G.ai&&!G.thinking)aiMove();
  else if(G.st.turn===G.human&&mode().coach&&!G.coach)coachBefore();
}

/* записать ход в партию (без картинки и звука; так же восстанавливается сохранение) */
function record(mv){
  var before=G.st,mover=before.turn,captured=before.board[mv.tr][mv.tc];
  if(mv.enPassant)captured=before.board[mv.r][mv.tc];
  var after=R.applyMove(before,mv);
  G.st=after;
  G.history.push({text:R.moveText(before,mv,after),side:mover});
  G.uci.push(R.toUCI(mv));
  G.keys.push(R.positionKey(after));
  if(captured)(mover===G.human?G.capByHuman:G.capByAi).push(captured);
  var last={r:mv.r,c:mv.c,tr:mv.tr,tc:mv.tc};
  if(mover===G.human)G.lastH=last;else G.lastA=last;
  G.sel=null;
  return {captured:captured,check:R.inCheck(after.board,after.turn)};
}
/* партия заново по списку ходов (восстановление и отмена хода) */
function replay(list){
  var keep=G.history;
  G.st=R.startState();G.history=[];G.keys=[R.positionKey(G.st)];G.uci=[];
  G.lastH=G.lastA=null;G.capByHuman=[];G.capByAi=[];G.sel=null;
  for(var i=0;i<list.length;i++){
    var mv=R.fromUCI(G.st,list[i]);
    if(!mv)return false;
    record(mv);
    if(keep[i]&&keep[i].q)G.history[i].q=keep[i].q;
  }
  return true;
}
/* ход любой стороны: запись, сохранение, часы, анимация, звук */
function play(mv,opts){
  var info=record(mv);
  G.hint=null;
  if(G.clock&&!G.dead)G.clock.start(G.st.turn);
  saveGame();
  var slides=opts&&opts.noSlide?[]:[[mv.r,mv.c,mv.tr,mv.tc]];
  if(mv.castle){var home=mv.r;slides.push(mv.castle==='K'?[home,7,home,5]:[home,0,home,3]);}
  render({slides:slides,burst:info.captured?[mv.tr,mv.tc]:null});
  Sound.sfx(info.check?'check':info.captured?'capture':'move');
  return {captured:!!info.captured,check:info.check};
}

/* ── конец партии ── */
function gameResult(){
  var st=G.st,moves=R.allLegal(st);
  if(!moves.length){
    if(R.inCheck(st.board,st.turn))return{result:st.turn===G.human?'lose':'win',reason:'reason.mate'};
    return{result:'draw',reason:'reason.stalemate'};
  }
  if(R.insufficient(st.board))return{result:'draw',reason:'reason.insufficient'};
  if(st.halfmove>=100)return{result:'draw',reason:'reason.fifty'};
  var key=G.keys[G.keys.length-1],n=0;
  for(var i=0;i<G.keys.length;i++)if(G.keys[i]===key)n++;
  if(n>=3)return{result:'draw',reason:'reason.repetition'};
  return null;
}
/* может ли сторона вообще поставить мат: нет, если у неё только король или король с одной лёгкой фигурой */
function canMate(color){
  var minors=0,b=G.st.board;
  for(var r=0;r<8;r++)for(var c=0;c<8;c++){
    var p=b[r][c];if(!p||p[0]!==color)continue;
    if(p[1]==='P'||p[1]==='R'||p[1]==='Q')return true;
    if(p[1]==='N'||p[1]==='B')minors++;
  }
  return minors>=2;
}
/* история и уровень: всё, что меняется после партии */
function recordResult(res){
  DB.history.push({t:Date.now(),mode:G.mode,lvl:G.lvl,res:res.result,reason:res.reason,plies:G.uci.length,human:G.human,uci:G.uci.join(' ')});
  if(DB.history.length>HISTORY_MAX)DB.history=DB.history.slice(-HISTORY_MAX);
  for(var i=0;i<DB.history.length-HISTORY_FULL;i++)delete DB.history[i].uci;
  var k=mode().kind;
  if(k==='adaptive'||k==='blitz'){
    var recent=DB.history.filter(function(h){return h.mode===G.mode;}).map(function(h){return M.score(h.res);});
    var from=G.lvl,to=M.nextLevel(from,res.result,recent);
    DB.rating[k==='adaptive'?'adaptive':'blitz']=to;
    G.lvlChange={from:from,to:to};
  }
  if(res.result==='win')DB.wins[G.mode]=(DB.wins[G.mode]||0)+1;
  DB.game=null;
  saveDB();
}
function finish(res){
  if(G.dead)return;
  G.dead=true;G.thinking=false;G.result=res;G.endTime=Date.now();G.hint=null;E.cancel();
  if(G.clock)G.clock.stop();
  recordResult(res);
  msg([['res.'+res.result],[res.reason]],res.result==='lose');
  Bot.react(res.result==='win'?'lose':res.result==='lose'?'win':'draw');
  Sound.duck(0.25,2600);
  setTimeout(function(){Sound.sfx(res.result);},350);
  setTimeout(function(){showReport();},650);
  paintUndo();
}

/* ── часы (блиц) ── */
function makeClock(times){return ChessClock(times,paintClocks,onFlag);}
function onFlag(color){
  if(G.dead)return;
  var other=R.opp(color);
  var draw=!canMate(other);
  if(color===G.human)finish({result:draw?'draw':'lose',reason:draw?'reason.timeDraw':'reason.time'});
  else finish({result:draw?'draw':'win',reason:draw?'reason.timeDraw':'reason.time'});
}
function paintClocks(){
  var box=$('ch-clocks');if(!G.clock){return;}
  var run=G.clock.running();
  [['you',G.human],['ai',G.ai]].forEach(function(x){
    var el=box.querySelector('.clk-'+x[0]),ms=G.clock.left(x[1]);
    el.querySelector('b').textContent=ChessClock.format(ms);
    el.classList.toggle('on',run===x[1]);
    el.classList.toggle('low',ms<20000);
  });
}

/* ── ход игрока: клик или перетаскивание ── */
function canAct(){return !G.dead&&!G.promo&&G.started&&G.st.turn===G.human;}
function legalTo(r,c,tr,tc){
  return R.legal(G.st,r,c).filter(function(m){return m.tr===tr&&m.tc===tc;})[0]||null;
}
function ownMovable(r,c){
  var p=G.st.board[r][c];
  return !!p&&p[0]===G.human&&R.legal(G.st,r,c).length>0;
}
/* opts.noSlide: фигуру уже перенесли рукой, ехать ей не нужно */
function tryHumanMove(r,c,tr,tc,opts){
  var mv=legalTo(r,c,tr,tc);if(!mv)return false;
  G.sel=null;
  if(R.isPromotion(G.st,mv)){render();askPromotion(mv,opts);return true;}
  humanMove(mv,opts);return true;
}
function humanMove(mv,opts){
  var before=G.coach&&G.coach.ply===G.uci.length?G.coach.cp:null;
  var info=play(mv,opts);
  paintUndo();
  var res=gameResult();
  if(res){finish(res);return;}
  if(info.check)Bot.react('aiChecked');else if(info.captured)Bot.react('hurt');
  if(mode().coach){coachAfter(before);return;}
  setTimeout(aiMove,(info.captured||info.check)?600:250);
}

var drag=null;   // {r,c,x,y,wasSel,moving,ghost,size}
function onDown(e){
  if(e.button!==undefined&&e.button!==0)return;
  var sq=view.squareAt(e.clientX,e.clientY);if(!sq||!canAct())return;
  var r=sq.r,c=sq.c;
  if(G.sel&&!(G.sel.r===r&&G.sel.c===c)&&tryHumanMove(G.sel.r,G.sel.c,r,c))return;
  if(ownMovable(r,c)){
    var wasSel=!!(G.sel&&G.sel.r===r&&G.sel.c===c);
    if(!wasSel){G.sel={r:r,c:c};render();Sound.sfx('select');}
    drag={r:r,c:c,x:e.clientX,y:e.clientY,wasSel:wasSel,moving:false,ghost:null,size:0};
    view.el.setPointerCapture(e.pointerId);
    e.preventDefault();
    return;
  }
  if(G.sel){G.sel=null;render();}
}
function onMove(e){
  if(!drag)return;
  if(!drag.moving){
    if(Math.hypot(e.clientX-drag.x,e.clientY-drag.y)<5)return;
    drag.moving=true;
    var size=view.cellSize();
    var g=document.createElement('div');g.id='ch-drag';
    g.style.width=g.style.height=size+'px';
    g.innerHTML=pieceSvg(G.st.board[drag.r][drag.c]);
    document.body.appendChild(g);
    drag.ghost=g;drag.size=size;
    view.lift(drag.r,drag.c,true);
  }
  drag.ghost.style.transform='translate('+(e.clientX-drag.size/2)+'px,'+(e.clientY-drag.size/2)+'px)';
  var sq=view.squareAt(e.clientX,e.clientY);
  view.over(sq?sq.r:null,sq?sq.c:null);
}
function onUp(e){
  if(!drag)return;
  var d=drag;drag=null;
  if(d.ghost)d.ghost.remove();
  if(d.moving){
    var sq=view.squareAt(e.clientX,e.clientY);
    if(sq&&!(sq.r===d.r&&sq.c===d.c)&&tryHumanMove(d.r,d.c,sq.r,sq.c,{noSlide:true}))return;
    render();
    return;
  }
  if(d.wasSel){G.sel=null;render();}
}
function onCancel(){if(!drag)return;if(drag.ghost)drag.ghost.remove();drag=null;render();}

/* превращение пешки */
function askPromotion(mv,opts){
  G.promo=mv;
  var row=$('ch-promo-row');row.innerHTML='';
  [['q','Q'],['r','R'],['b','B'],['n','N']].forEach(function(d){
    var b=document.createElement('button');
    b.className='ch-promo-btn';
    b.innerHTML=PC.svg(d[1],G.human);
    b.addEventListener('click',function(){
      hide('promo-modal');
      var m=G.promo;G.promo=null;
      if(!m)return;
      m.promo=d[0];humanMove(m,opts);
    });
    row.appendChild(b);
  });
  show('promo-modal');
}

/* ── отмена хода ── */
function canUndo(){
  if(G.dead||!G.started||G.promo||!mode().undo||G.undoLeft<=0)return false;
  return G.history.some(function(h){return h.side===G.human;});
}
function onUndo(){
  if(!canUndo())return;
  /* ход ИИ ещё не сделан: убрать только свой; иначе свой и ответ ИИ */
  var n=G.st.turn===G.ai?1:2;
  G.gameId++;E.cancel();G.thinking=false;G.coach=null;G.hint=null;
  replay(G.uci.slice(0,G.uci.length-n));
  if(G.undoLeft!==Infinity)G.undoLeft--;
  saveGame();
  render();paintUndo();
  msg(['msg.undone']);
  Bot.react('idle');
  Sound.sfx('select');
  coachBefore();
}

/* ── обучение: оценка позиции, подсказка, оценка хода ── */
function setEval(cpSideToMove,sideToMove){
  if(cpSideToMove==null)return;
  G.evalW=sideToMove==='w'?cpSideToMove:-cpSideToMove;
  paintEval();
}
function paintEval(){
  var box=$('ch-eval');
  if(!mode().coach||G.evalW==null){box.style.setProperty('--w','50%');box.querySelector('b').textContent='0.0';return;}
  var cp=Math.max(-2000,Math.min(2000,G.evalW));
  var w=50+50*(2/(1+Math.exp(-cp/350))-1);      // плавная шкала: перевес в пару пешек уже заметен
  box.style.setProperty('--w',w.toFixed(1)+'%');
  var txt=Math.abs(G.evalW)>=9000?'M':(G.evalW>0?'+':'')+(G.evalW/100).toFixed(1);
  box.querySelector('b').textContent=txt;
}
/* в начале хода игрока: лучший ход и оценка (для подсказки и для оценки его хода) */
function coachBefore(){
  if(!mode().coach||G.dead||G.st.turn!==G.human)return;
  var ply=G.uci.length,id=G.gameId;
  G.coach={ply:ply,best:null,cp:null};
  Coach.analyse(G.uci.slice(),function(res){
    if(id!==G.gameId||!G.coach||G.coach.ply!==ply||!res)return;
    G.coach.best=res.best;G.coach.cp=res.cp;
    setEval(res.cp,G.human);
    if(G.hintWanted){G.hintWanted=false;showHint();}
  });
}
/* после хода игрока: насколько ход хорош, потом отвечает ИИ */
function coachAfter(before){
  var id=G.gameId,ply=G.uci.length;
  E.cancel();   // подсказка могла ещё считаться
  msg(['msg.analysing']);
  Coach.analyse(G.uci.slice(),function(res){
    if(id!==G.gameId||G.dead)return;
    if(res){
      var after=-res.cp;   // оценка была со стороны ИИ
      setEval(res.cp,G.ai);
      var q=Coach.classify(before,after);
      if(q&&G.history[ply-1]){G.history[ply-1].q=q;renderLog();saveGame();}
      if(q)msg(['q.'+q],'q-'+q);
    }
    setTimeout(aiMove,350);
  });
}
function showHint(){
  if(!G.coach||!G.coach.best){G.hintWanted=true;msg(['msg.analysing']);return;}
  var mv=R.fromUCI(G.st,G.coach.best);if(!mv)return;
  G.hint={r:mv.r,c:mv.c,tr:mv.tr,tc:mv.tc};
  var after=R.applyMove(G.st,mv);
  msg(['msg.hint',{move:R.moveText(G.st,mv,after)}],'q-hint');
  render();
  Sound.sfx('select');
}
function onHint(){if(canAct()&&mode().coach)showHint();}

/* ── ход ИИ ── */
function aiMove(){
  if(G.dead||G.st.turn!==G.ai)return;
  var id=G.gameId,m=mode(),P=aiParams();
  G.thinking=true;Bot.react('thinking');
  function stillValid(){return id===G.gameId&&!G.dead&&G.st.turn===G.ai;}
  function apply(mv,local){
    if(!stillValid())return;
    G.thinking=false;
    var info=play(mv);
    paintUndo();
    var res=gameResult();
    if(res){finish(res);return;}
    if(info.check)msg(['msg.check'],true);
    else if(local)msg(['msg.local']);
    else turnMsg();
    Bot.react(info.check?'check':info.captured?'attack':'moved');
    coachBefore();
  }
  function onBest(uci){
    if(!stillValid())return;
    var mv=R.fromUCI(G.st,uci);
    if(!mv){apply(localMove(),true);return;}
    apply(mv);
  }
  function search(){
    if(!stillValid())return;
    msg([m.think]);
    var ok=E.go({moves:G.uci,depth:P.depth,movetime:P.movetime,skill:P.skill,contempt:P.contempt,
      onDepth:function(d){if(stillValid())msg([[m.think],['msg.depth',{d:d}]]);}},onBest);
    if(!ok)fallback();
  }
  function fallback(){
    if(!stillValid())return;
    msg(['msg.offline']);
    setTimeout(function(){apply(localMove(),true);},300);
  }
  if(E.isReady())search();
  else{msg(['msg.loading']);E.load(search,fallback);}
}

/* запасной ИИ, если Stockfish не загрузился */
function localMove(){
  var st=G.st,all=R.allLegal(st);
  if(G.mode==='beginner'||(G.lvl!=null&&G.lvl<6)){
    var caps=all.filter(function(m){return st.board[m.tr][m.tc];});
    return (caps.length&&Math.random()<0.7)?caps[Math.random()*caps.length|0]:all[Math.random()*all.length|0];
  }
  var sign=st.turn==='w'?1:-1,best=[],bestV=-Infinity;
  function ab(s,d,a,b){
    var ms=R.allLegal(s);
    if(!ms.length)return R.inCheck(s.board,s.turn)?(s.turn==='w'?-1e6-d:1e6+d):0;
    if(d===0)return R.evaluate(s.board);
    var max=s.turn==='w',v=max?-Infinity:Infinity;
    for(var i=0;i<ms.length;i++){
      var x=ab(R.applyMove(s,ms[i]),d-1,a,b);
      if(max){if(x>v)v=x;if(v>a)a=v;}else{if(x<v)v=x;if(v<b)b=v;}
      if(a>=b)break;
    }
    return v;
  }
  all.forEach(function(m){
    var v=sign*ab(R.applyMove(st,m),2,-Infinity,Infinity);
    if(v>bestV+15){bestV=v;best=[m];}else if(v>=bestV-15)best.push(m);
  });
  return best[Math.random()*best.length|0];
}

/* сдаться: второе нажатие подтверждает */
var resignTimer=null;
function resetResign(){clearTimeout(resignTimer);var b=$('ch-resign');b.dataset.i18n='game.resign';b.textContent=t('game.resign');b.classList.remove('sel');}
function onResign(){
  if(G.dead||!G.history.length)return;
  var b=$('ch-resign');
  if(!b.classList.contains('sel')){
    b.dataset.i18n='game.sure';b.textContent=t('game.sure');b.classList.add('sel');
    resignTimer=setTimeout(resetResign,3000);return;
  }
  resetResign();
  finish({result:'lose',reason:'reason.resigned'});
}

/* ── отрисовка: доску рисует сменный модуль (сейчас Board2D) ── */
var view=null;
function scene(){
  var st=G.st,hints={},check=null;
  if(G.sel)R.legal(st,G.sel.r,G.sel.c).forEach(function(m){hints[m.tr*8+m.tc]=st.board[m.tr][m.tc]||m.enPassant?'cap':'go';});
  if(R.inCheck(st.board,st.turn)){var k=R.findKing(st.board,st.turn);check=k[0]*8+k[1];}
  return {board:st.board,flip:G.human==='b',sel:G.sel,hints:hints,lastH:G.lastH,lastA:G.lastA,check:check,coach:G.hint};
}
/* anim: {slides:[[r,c,tr,tc],...], burst:[r,c]} */
function render(anim){
  view.draw(scene(),anim);
  renderLog();renderCaptured();
}
var QMARK={inacc:'?!',mistake:'?',blunder:'??'};
function renderLog(){
  var body=$('ch-movelog-body'),h=G.history;
  if(!h.length){body.innerHTML='<div class="mlog-empty">'+t('log.empty')+'</div>';return;}
  function cell(e,cls){
    if(!e)return '<span class="'+cls+'"></span>';
    var mark=e.q&&QMARK[e.q]?'<i class="mq-'+e.q+'">'+QMARK[e.q]+'</i>':'';
    return '<span class="'+cls+'">'+e.text+mark+'</span>';
  }
  var out='',n=h.length;
  for(var i=0;i<n;i+=2){
    out+='<div class="mlog-row"><span class="mlog-n">'+(i/2+1)+'.</span>'+
         cell(h[i],'mlog-w'+(i===n-1?' mlog-last':''))+cell(h[i+1],'mlog-b'+(i+1===n-1?' mlog-last':''))+'</div>';
  }
  body.innerHTML=out;body.scrollTop=body.scrollHeight;
}
function renderCaptured(){
  function row(list){
    return list.slice().sort(function(a,b){return VAL[b[1]]-VAL[a[1]];}).map(pieceSvg).join('');
  }
  var sum=function(l){return l.reduce(function(s,p){return s+VAL[p[1]];},0);};
  var d=sum(G.capByHuman)-sum(G.capByAi);
  $('cap-human').innerHTML=row(G.capByHuman)+(d>0?'<span class="cap-adv">+'+d+'</span>':'');
  $('cap-ai').innerHTML=row(G.capByAi)+(d<0?'<span class="cap-adv" style="color:var(--err)">+'+(-d)+'</span>':'');
}

/* ── итоги ── */
function showReport(){
  var res=G.result;if(!res||!G.dead)return;
  var title=$('ch-report-title');
  title.textContent=t('rep.'+res.result);
  title.className='ch-report-title '+res.result;
  $('ch-report-sub').textContent=t(res.reason);
  var secs=Math.round(((G.endTime||Date.now())-G.start)/1000);
  function row(k,v){return '<div class="ch-rep-row"><span class="ch-rep-k">'+t(k)+'</span><span class="ch-rep-v">'+v+'</span></div>';}
  var html=row('rep.played',sideName(G.human))+row('rep.mode',t('lvl.'+G.mode));
  if(G.lvlChange){
    var c=G.lvlChange,arrow=c.to>c.from?' &#9650;':c.to<c.from?' &#9660;':'';
    html+=row('rep.level',c.from===c.to?String(c.to):c.from+' &gt; '+c.to+arrow);
  }else if(G.lvl!=null)html+=row('rep.level',String(G.lvl));
  html+=row('rep.moves',Math.ceil(G.history.length/2))+
        row('rep.capYou',G.capByHuman.length)+
        row('rep.capAi',G.capByAi.length)+
        row('rep.time',Math.floor(secs/60)+':'+('0'+secs%60).slice(-2));
  if(mode().coach){
    var cnt={inacc:0,mistake:0,blunder:0};
    G.history.forEach(function(h){if(h.side===G.human&&cnt[h.q]!==undefined)cnt[h.q]++;});
    html+=row('q.inacc',cnt.inacc)+row('q.mistake',cnt.mistake)+row('q.blunder',cnt.blunder);
  }
  $('ch-report-stats').innerHTML=html;
  show('report-modal');
}

/* смена языка: всё, что собрано из кода, перерисовать */
function onLang(){
  paintMsg();paintGamePanel();Bot.repaint();renderLog();paintMenu();resetResign();
  if(!$('report-modal').classList.contains('hidden'))showReport();
}

/* ── запуск ── */
function boot(){
  A.topbar('ch.title');
  Bot.init();
  buildPreview();
  bindSeg('view');bindSeg('theme');bindSeg('side');bindSeg('blitz');
  I18n.apply();
  I18n.onChange(onLang);

  /* наведение на 3D наклоняет превью: видно, что это будет объёмная доска */
  var b3=document.querySelector('#seg-view [data-v="3d"]');
  b3.addEventListener('mouseenter',function(){$('preview').classList.add('tilt');});
  b3.addEventListener('mouseleave',function(){$('preview').classList.remove('tilt');});

  view=Board2D($('ch-board'));
  view.el.addEventListener('pointerdown',onDown);
  view.el.addEventListener('pointermove',onMove);
  view.el.addEventListener('pointerup',onUp);
  view.el.addEventListener('pointercancel',onCancel);
  view.el.addEventListener('contextmenu',function(e){e.preventDefault();});
  /* время партии и часы дописываются при уходе со страницы */
  window.addEventListener('pagehide',function(){if(G.started&&!G.dead)saveGame();});

  $('btn-play').addEventListener('click',newGame);
  $('btn-continue').addEventListener('click',continueGame);
  $('ch-new').addEventListener('click',newGame);
  $('ch-resign').addEventListener('click',onResign);
  $('ch-undo').addEventListener('click',onUndo);
  $('ch-hint').addEventListener('click',onHint);
  $('ch-menu').addEventListener('click',function(){showScreen('menu');});
  $('rep-new').addEventListener('click',newGame);
  $('rep-menu').addEventListener('click',function(){hide('report-modal');showScreen('menu');});
  $('rep-close').addEventListener('click',function(){hide('report-modal');});
  $('btn-licenses').addEventListener('click',function(){show('lic-modal');});
  $('lic-close').addEventListener('click',function(){hide('lic-modal');});

  if(!restoreGame()){paintGamePanel();render();}
  showScreen('menu');
  E.load();   // движок грузится, пока игрок в меню
}

window.AceonChess={state:G,settings:S,db:DB,newGame:newGame,play:play,tryMove:tryHumanMove,showScreen:showScreen,
  undo:onUndo,hint:onHint,setLevel:function(k){S.level=k;paintMenu();}};
boot();
})();
