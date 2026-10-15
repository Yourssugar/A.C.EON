/* A.C.EON CHESS: меню, партия, интерфейс, персонаж A.C.EON, итоги.
   Правила в rules.js, движок в engine.js, фигуры в pieces.js, тексты в lang.js. */
(function(){
'use strict';

var R=window.ChessRules,E=window.Engine,A=window.Arcade,PC=window.ChessPieces;
var t=I18n.t,pick=I18n.pick;
var $=function(id){return document.getElementById(id);};
function pieceSvg(p){return PC.svg(p[1],p[0]);}
var VAL={P:1,N:3,B:3,R:5,Q:9,K:0};

/* уровни: что получает Stockfish и как уровень выглядит в меню */
var LEVELS={
  beginner:          {bars:1,depth:2, skill:2, accent:'#00ff88',think:'msg.think'},
  professional:      {bars:2,depth:6, skill:10,accent:'#00e5ff',think:'msg.think'},
  aceon_professional:{bars:3,depth:10,skill:20,movetime:60,contempt:0, accent:'#4fb8ff',think:'msg.thinkAceon'},
  aceon_expert:      {bars:4,depth:14,skill:20,movetime:60,contempt:0, accent:'#ff8800',think:'msg.thinkExpert'},
  aceon_grandmaster: {bars:5,depth:20,skill:20,movetime:60,contempt:50,accent:'#ff2d55',think:'msg.thinkGm'}
};
var LEVEL_KEYS=Object.keys(LEVELS);

/* настройки, статистика и (позже) сохранённая партия: раздел 'chess' в Store */
Store.define('chess',{
  version:1,
  defaults:{settings:{level:'beginner',theme:'wood',view:'2d',side:'r'},wins:{},game:null},
  legacy:function(raw,json){
    var o={settings:{},wins:{}},s=json('aceon_chess_settings');
    if(s)['level','theme','side'].forEach(function(k){if(s[k])o.settings[k]=s[k];});
    for(var k in LEVELS){var w=parseInt(raw('aceon_chess_wins_'+k),10);if(w)o.wins[k]=w;}
    return o;
  }
});
var DB=Store.get('chess');
var S=DB.settings;
if(!LEVELS[S.level])S.level='beginner';
if(S.theme!=='wood'&&S.theme!=='neon')S.theme='wood';
if(S.side!=='w'&&S.side!=='b'&&S.side!=='r')S.side='r';
S.view='2d';

var G={
  st:R.startState(),human:'w',ai:'b',dead:true,sel:null,
  history:[],keys:[],uci:[],lastH:null,lastA:null,
  capByHuman:[],capByAi:[],start:0,gameId:0,thinking:false,promo:null,started:false,
  level:'beginner',result:null,msg:null
};
function level(){return LEVELS[G.level];}
function sideName(c){return t(c==='w'?'side.w':'side.b');}
function show(id){$(id).classList.remove('hidden');}
function hide(id){$(id).classList.add('hidden');}

function saveSettings(){Store.save('chess');}

/* ── статус над доской: хранится ключами, чтобы переводиться при смене языка ── */
function msg(parts,isCheck){
  if(!Array.isArray(parts[0]))parts=[parts];
  G.msg={parts:parts,check:!!isCheck};
  paintMsg();
}
function paintMsg(){
  if(!G.msg)return;
  var el=$('ch-msg');
  el.textContent=G.msg.parts.map(function(p){return t(p[0],p[1]);}).join(' / ');
  el.classList.toggle('check',G.msg.check);
}
function turnMsg(){msg(['msg.turnSide',{side:sideName(G.human)}]);}

/* ── персонаж ── */
var Bot=(function(){
  var root,statusEl,subEl,cur='idle',revert=null;
  function set(m){cur=m;root.className='mood-'+m;statusEl.textContent=pick('bot.'+m);}
  return{
    init:function(){root=$('aceon-bot');statusEl=$('aceon-bot-status');subEl=$('aceon-bot-sub');},
    mode:function(){root.style.setProperty('--bot-accent',level().accent);subEl.textContent=t('lvl.'+G.level);},
    repaint:function(){set(cur);subEl.textContent=t('lvl.'+G.level);},
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

function buildLevels(){
  var list=$('lvl-list');list.innerHTML='';
  LEVEL_KEYS.forEach(function(k){
    var L=LEVELS[k];
    var b=document.createElement('button');
    b.type='button';b.className='lvl-card';b.dataset.lvl=k;
    b.style.setProperty('--acc',L.accent);
    b.innerHTML=
      '<span class="lvl-name" data-i18n="lvl.'+k+'"></span>'+
      '<span class="bars">'+barsHtml(L.bars)+'</span>'+
      '<span class="lvl-pop" role="tooltip">'+
        '<span class="pop-name" data-i18n="lvl.'+k+'"></span>'+
        '<span class="pop-desc" data-i18n="desc.'+k+'"></span>'+
        '<span class="pop-row"><span data-i18n="pop.depth"></span><b>'+L.depth+'</b></span>'+
        '<span class="pop-row"><span data-i18n="pop.time"></span><b data-i18n="'+(L.movetime?'pop.long':'pop.fast')+'"></b></span>'+
        '<span class="pop-row"><span data-i18n="pop.strength"></span><span class="bars">'+barsHtml(L.bars)+'</span></span>'+
      '</span>';
    b.addEventListener('click',function(){S.level=k;saveSettings();paintMenu();Sound.sfx('select');});
    list.appendChild(b);
  });
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
  document.querySelectorAll('.lvl-card').forEach(function(b){b.classList.toggle('sel',b.dataset.lvl===S.level);});
  ['view','theme','side'].forEach(function(k){
    document.querySelectorAll('#seg-'+k+' .seg-btn').forEach(function(b){b.classList.toggle('sel',b.dataset.v===S[k]);});
  });
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
      S[key]=b.dataset.v;saveSettings();paintMenu();Sound.sfx('select');
    });
  });
}

function showScreen(name){
  document.body.classList.toggle('screen-menu',name==='menu');
  document.body.classList.toggle('screen-game',name==='game');
  if(name==='menu')paintMenu();
  Sound.music(name==='menu'?'menu':'game');
  window.scrollTo(0,0);
}

/* ════════ ПАРТИЯ ════════ */
function resetGame(levelKey,human){
  E.newGame();
  G.gameId++;
  G.level=levelKey;
  G.st=R.startState();G.dead=false;G.sel=null;G.promo=null;G.thinking=false;G.result=null;G.endTime=null;
  G.history=[];G.keys=[R.positionKey(G.st)];G.uci=[];
  G.lastH=G.lastA=null;G.capByHuman=[];G.capByAi=[];G.start=Date.now();
  G.human=human;G.ai=R.opp(human);
  G.started=true;
  hide('report-modal');hide('promo-modal');resetResign();
  paintGamePanel();
  Bot.mode();Bot.react('idle');
}
function newGame(){
  resetGame(S.level,S.side==='r'?(Math.random()<0.5?'w':'b'):S.side);
  saveGame();
  render();
  showScreen('game');
  A.trackPlay();
  if(G.st.turn===G.ai){msg(['msg.aiFirst']);setTimeout(aiMove,500);}
  else turnMsg();
}

/* ── сохранение партии: хватает списка ходов, всё остальное восстанавливается повтором ── */
function saveGame(){
  DB.game=G.dead||!G.started?null:{level:G.level,human:G.human,uci:G.uci.slice(),elapsed:Date.now()-G.start};
  Store.save('chess');
}
function restoreGame(){
  var sv=DB.game;
  if(!sv||!LEVELS[sv.level]||(sv.human!=='w'&&sv.human!=='b')||!Array.isArray(sv.uci))return false;
  resetGame(sv.level,sv.human);
  for(var i=0;i<sv.uci.length;i++){
    var mv=R.fromUCI(G.st,sv.uci[i]);
    if(!mv){DB.game=null;Store.save('chess');G.started=false;G.dead=true;return false;}
    record(mv);
  }
  if(gameResult()){DB.game=null;Store.save('chess');G.started=false;G.dead=true;return false;}
  G.start=Date.now()-(sv.elapsed||0);
  render();
  if(G.st.turn===G.human)turnMsg();
  return true;
}
function continueGame(){
  showScreen('game');
  if(!G.dead&&G.st.turn===G.ai&&!G.thinking)aiMove();
}
function paintGamePanel(){
  $('game-lvl-name').textContent=t('lvl.'+G.level);
  $('game-lvl-bars').innerHTML=barsHtml(level().bars);
  $('game-lvl-bars').style.setProperty('--acc',level().accent);
  $('ch-side').textContent=t('game.you',{side:sideName(G.human)});
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
/* ход любой стороны: запись, сохранение, анимация, звук */
function play(mv,opts){
  var info=record(mv);
  saveGame();
  var slides=opts&&opts.noSlide?[]:[[mv.r,mv.c,mv.tr,mv.tc]];
  if(mv.castle){var home=mv.r;slides.push(mv.castle==='K'?[home,7,home,5]:[home,0,home,3]);}
  render({slides:slides,burst:info.captured?[mv.tr,mv.tc]:null});
  Sound.sfx(info.check?'check':info.captured?'capture':'move');
  return {captured:!!info.captured,check:info.check};
}

/* конец партии */
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
function finish(res){
  G.dead=true;G.thinking=false;G.result=res;G.endTime=Date.now();E.cancel();
  saveGame();   // законченная партия из сохранения убирается
  msg([['res.'+res.result],[res.reason]],res.result==='lose');
  Bot.react(res.result==='win'?'lose':res.result==='lose'?'win':'draw');
  Sound.duck(0.25,2600);
  setTimeout(function(){Sound.sfx(res.result);},350);
  setTimeout(function(){showReport();},650);
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
  var info=play(mv,opts);
  var res=gameResult();
  if(res){finish(res);return;}
  if(info.check)Bot.react('aiChecked');else if(info.captured)Bot.react('hurt');
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
    render();   // вернуть фигуру на место, выбор остаётся
    return;
  }
  if(d.wasSel){G.sel=null;render();}   // повторный клик по выбранной фигуре снимает выбор
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

/* ── ход ИИ ── */
function aiMove(){
  if(G.dead||G.st.turn!==G.ai)return;
  var id=G.gameId,L=level();
  G.thinking=true;Bot.react('thinking');
  function stillValid(){return id===G.gameId&&!G.dead&&G.st.turn===G.ai;}
  function apply(mv,local){
    if(!stillValid())return;
    G.thinking=false;
    var info=play(mv);
    var res=gameResult();
    if(res){finish(res);return;}
    if(info.check)msg(['msg.check'],true);
    else if(local)msg(['msg.local']);
    else turnMsg();
    Bot.react(info.check?'check':info.captured?'attack':'moved');
  }
  function onBest(uci){
    if(!stillValid())return;
    var mv=R.fromUCI(G.st,uci);
    if(!mv){apply(localMove(),true);return;}
    apply(mv);
  }
  function search(){
    if(!stillValid())return;
    msg([L.think]);
    var ok=E.go({moves:G.uci,depth:L.depth,movetime:L.movetime,skill:L.skill,contempt:L.contempt,
      onDepth:function(d){if(stillValid())msg([[L.think],['msg.depth',{d:d}]]);}},onBest);
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
  if(G.level==='beginner'){
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
  return {board:st.board,flip:G.human==='b',sel:G.sel,hints:hints,lastH:G.lastH,lastA:G.lastA,check:check};
}
/* anim: {slides:[[r,c,tr,tc],...], burst:[r,c]} */
function render(anim){
  view.draw(scene(),anim);
  renderLog();renderCaptured();
}
function renderLog(){
  var body=$('ch-movelog-body'),h=G.history;
  if(!h.length){body.innerHTML='<div class="mlog-empty">'+t('log.empty')+'</div>';return;}
  var out='',n=h.length;
  for(var i=0;i<n;i+=2){
    out+='<div class="mlog-row"><span class="mlog-n">'+(i/2+1)+'.</span>'+
         '<span class="mlog-w'+(i===n-1?' mlog-last':'')+'">'+h[i].text+'</span>'+
         '<span class="mlog-b'+(i+1===n-1?' mlog-last':'')+'">'+(h[i+1]?h[i+1].text:'')+'</span></div>';
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
  $('ch-report-stats').innerHTML=
    row('rep.played',sideName(G.human))+
    row('rep.mode',t('lvl.'+G.level))+
    row('rep.moves',Math.ceil(G.history.length/2))+
    row('rep.capYou',G.capByHuman.length)+
    row('rep.capAi',G.capByAi.length)+
    row('rep.time',Math.floor(secs/60)+':'+('0'+secs%60).slice(-2));
  if(res.result==='win'&&!res.counted){
    res.counted=true;
    DB.wins[G.level]=(DB.wins[G.level]||0)+1;Store.save('chess');
  }
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
  buildLevels();buildPreview();
  bindSeg('view');bindSeg('theme');bindSeg('side');
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
  /* время партии дописывается при уходе со страницы */
  window.addEventListener('pagehide',function(){if(G.started&&!G.dead)saveGame();});

  $('btn-play').addEventListener('click',newGame);
  $('btn-continue').addEventListener('click',continueGame);
  $('ch-new').addEventListener('click',newGame);
  $('ch-resign').addEventListener('click',onResign);
  $('ch-menu').addEventListener('click',function(){showScreen('menu');});
  $('rep-new').addEventListener('click',newGame);
  $('rep-menu').addEventListener('click',function(){hide('report-modal');showScreen('menu');});
  $('rep-close').addEventListener('click',function(){hide('report-modal');});
  $('btn-licenses').addEventListener('click',function(){show('lic-modal');});
  $('lic-close').addEventListener('click',function(){hide('lic-modal');});

  if(!restoreGame())render();
  showScreen('menu');
  E.load();   // движок грузится, пока игрок в меню
}

window.AceonChess={state:G,settings:S,newGame:newGame,play:play,tryMove:tryHumanMove,showScreen:showScreen,
  setLevel:function(k){S.level=k;paintMenu();}};
boot();
})();
