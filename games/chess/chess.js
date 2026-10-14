/* A.C.EON CHESS: партия, интерфейс, персонаж A.C.EON, итоги.
   Правила в rules.js, движок в engine.js. */
(function(){
'use strict';

var R=window.ChessRules,E=window.Engine,A=window.Arcade;
var $=function(id){return document.getElementById(id);};

var PC=window.ChessPieces;
function pieceSvg(p){return PC.svg(p[1],p[0]);}
var VAL={P:1,N:3,B:3,R:5,Q:9,K:0};

/* уровни: что получает Stockfish */
var LEVELS={
  beginner:    {name:'BEGINNER',     depth:2, skill:2,  accent:'#00ff88',think:'AI THINKING'},
  professional:{name:'PROFESSIONAL', depth:6, skill:10, accent:'#00e5ff',think:'AI THINKING'},
  aceon_professional:{name:'A.C.EON / PRO', depth:10,movetime:60,skill:20,contempt:0, accent:'#00e5ff',think:'A.C.EON THINKING'},
  aceon_expert:      {name:'A.C.EON / EXPERT',depth:14,movetime:60,skill:20,contempt:0,accent:'#ff8800',think:'EXPERT CALCULATING'},
  aceon_grandmaster: {name:'A.C.EON / GM', depth:20,movetime:60,skill:20,contempt:50,accent:'#ff0000',think:'GRANDMASTER CALCULATING'}
};

var G={
  diff:'beginner',sub:'professional',
  st:null,human:'w',ai:'b',dead:false,sel:null,
  history:[],keys:[],uci:[],lastH:null,lastA:null,
  capByHuman:[],capByAi:[],start:0,gameId:0,thinking:false,promo:null,started:false
};
function level(){return LEVELS[G.diff==='aceon'?'aceon_'+G.sub:G.diff];}

/* ── режим запоминается между заходами ── */
function loadMode(){
  try{var m=JSON.parse(A.lsGet('aceon_chess_mode','null'));if(m&&LEVELS[m.diff==='aceon'?'aceon_'+m.sub:m.diff]){G.diff=m.diff;G.sub=m.sub||'professional';}}catch(e){}
}
function saveMode(){A.lsSet('aceon_chess_mode',JSON.stringify({diff:G.diff,sub:G.sub}));}

/* ── тема доски ── */
function setTheme(t){
  G.theme=t;A.lsSet('aceon_chess_theme',t);
  document.body.classList.remove('theme-wood','theme-neon');
  document.body.classList.add('theme-'+t);
  $('ch-theme').textContent='BOARD: '+t.toUpperCase();
}

/* ── статус ── */
function msg(t,isCheck){var el=$('ch-msg');el.textContent=t;el.classList.toggle('check',!!isCheck);}

/* ── персонаж ── */
var Bot=(function(){
  var root,statusEl,subEl,cur='idle',revert=null;
  var SAY={
    idle:['READY.','BEGIN.','YOUR MOVE.'],
    thinking:['CALCULATING','PROCESSING','HMMMM','ANALYSING'],
    moved:['YOUR MOVE.','GO ON.','YOUR TURN.'],
    attack:['MINE.','TAKEN.','THANK YOU.','DELICIOUS.'],
    hurt:['...OW.','LUCKY.','NOTED.','HOW RUDE.'],
    check:['CHECK.','TICK TOCK.','NO ESCAPE.'],
    aiChecked:['TSK.','CUTE.','POINTLESS.'],
    win:['I WIN.','INEVITABLE.','GG.'],
    lose:['...IMPOSSIBLE.','HOW?!','REMATCH.'],
    draw:['A DRAW.','STALEMATE.','...ACCEPTABLE.']
  };
  function pick(a){return a[Math.random()*a.length|0];}
  function set(m){cur=m;root.className='mood-'+m;statusEl.textContent=pick(SAY[m]||['...']);}
  return{
    init:function(){root=$('aceon-bot');statusEl=$('aceon-bot-status');subEl=$('aceon-bot-sub');},
    mode:function(){var L=level();root.style.setProperty('--bot-accent',L.accent);subEl.textContent=L.name.replace('A.C.EON / ','');},
    react:function(m){
      if(revert){clearTimeout(revert);revert=null;}
      set(m);
      if({moved:1,attack:1,hurt:1,check:1,aiChecked:1}[m]){
        revert=setTimeout(function(){if(cur===m)set(G.thinking?'thinking':'idle');},1700);
      }
    }
  };
})();

/* ── кнопки режимов ── */
function paintModeButtons(){
  ['beginner','professional','aceon'].forEach(function(d){$('chb-'+d).classList.toggle('sel',G.diff===d);});
  var L=level();
  $('chb-aceon').textContent=G.diff==='aceon'?L.name:'A.C.EON AI';
}
function show(id){$(id).classList.remove('hidden');}
function hide(id){$(id).classList.add('hidden');}
function setMode(diff,sub){
  G.diff=diff;if(sub)G.sub=sub;
  saveMode();paintModeButtons();Bot.mode();newGame();
}

/* ── новая партия ── */
function newGame(){
  E.newGame();
  G.gameId++;
  G.st=R.startState();G.dead=false;G.sel=null;G.promo=null;G.thinking=false;
  G.history=[];G.keys=[R.positionKey(G.st)];G.uci=[];
  G.lastH=G.lastA=null;G.capByHuman=[];G.capByAi=[];G.start=Date.now();
  G.human=Math.random()<0.5?'w':'b';G.ai=R.opp(G.human);
  hide('report-modal');hide('promo-modal');resetResign();
  $('ch-side').textContent=(G.human==='w'?'WHITE':'BLACK')+' = YOU';
  Bot.mode();Bot.react('idle');
  render();
  if(!G.started)return;              // ждём PRESS START
  if(G.st.turn===G.ai){msg('AI MOVES FIRST');setTimeout(aiMove,500);}
  else msg('YOUR TURN ('+(G.human==='w'?'WHITE':'BLACK')+')');
}

/* ── ход (любой стороны) ── */
function play(mv,opts){
  var before=G.st,mover=before.turn,captured=before.board[mv.tr][mv.tc];
  if(mv.enPassant)captured=before.board[mv.r][mv.tc];
  var after=R.applyMove(before,mv);
  var text=R.moveText(before,mv,after);
  G.st=after;
  G.history.push({text:text,side:mover});
  G.uci.push(R.toUCI(mv));
  G.keys.push(R.positionKey(after));
  if(captured)(mover===G.human?G.capByHuman:G.capByAi).push(captured);
  var last={r:mv.r,c:mv.c,tr:mv.tr,tc:mv.tc};
  if(mover===G.human)G.lastH=last;else G.lastA=last;
  G.sel=null;
  var slides=opts&&opts.noSlide?[]:[[mv.r,mv.c,mv.tr,mv.tc]];
  if(mv.castle){var home=mv.r;slides.push(mv.castle==='K'?[home,7,home,5]:[home,0,home,3]);}
  var check=R.inCheck(after.board,after.turn);
  render({slides:slides,burst:captured?[mv.tr,mv.tc]:null});
  A.sfx(check?'check':captured?'capture':'move');
  return {captured:!!captured,check:check};
}

/* ── конец партии ── */
function gameResult(){
  var st=G.st,moves=R.allLegal(st);
  if(!moves.length){
    if(R.inCheck(st.board,st.turn))return{result:st.turn===G.human?'lose':'win',reason:'CHECKMATE'};
    return{result:'draw',reason:'STALEMATE'};
  }
  if(R.insufficient(st.board))return{result:'draw',reason:'INSUFFICIENT MATERIAL'};
  if(st.halfmove>=100)return{result:'draw',reason:'50-MOVE RULE'};
  var key=G.keys[G.keys.length-1],n=0;
  for(var i=0;i<G.keys.length;i++)if(G.keys[i]===key)n++;
  if(n>=3)return{result:'draw',reason:'THREEFOLD REPETITION'};
  return null;
}
function finish(res){
  G.dead=true;G.thinking=false;E.cancel();
  var text={win:'YOU WIN! ',lose:'AI WINS. ',draw:'DRAW. '}[res.result]+res.reason;
  msg(text,res.result==='lose');
  Bot.react(res.result==='win'?'lose':res.result==='lose'?'win':'draw');
  setTimeout(function(){A.sfx(res.result);},350);
  setTimeout(function(){showReport(res);},650);
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

var drag=null;   // {r,c,x,y,wasSel,moving,ghost,size,over}
function cellFromPoint(x,y){
  var el=document.elementFromPoint(x,y);
  el=el&&el.closest&&el.closest('#ch-board .ch-cell');
  return el?{r:+el.dataset.r,c:+el.dataset.c,el:el}:null;
}
function onDown(e){
  if(e.button!==undefined&&e.button!==0)return;
  var cell=e.target.closest('.ch-cell');if(!cell||!canAct())return;
  var r=+cell.dataset.r,c=+cell.dataset.c;
  if(G.sel&&!(G.sel.r===r&&G.sel.c===c)&&tryHumanMove(G.sel.r,G.sel.c,r,c))return;
  if(ownMovable(r,c)){
    var wasSel=!!(G.sel&&G.sel.r===r&&G.sel.c===c);
    if(!wasSel){G.sel={r:r,c:c};render();A.sfx('select');}
    drag={r:r,c:c,x:e.clientX,y:e.clientY,wasSel:wasSel,moving:false,ghost:null,over:null};
    $('ch-board').setPointerCapture(e.pointerId);
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
    var src=cellEl(drag.r,drag.c),pw=src&&src.querySelector('.ch-pw');
    var size=src.getBoundingClientRect().width;
    var g=document.createElement('div');g.id='ch-drag';
    g.style.width=g.style.height=size+'px';
    g.innerHTML=pieceSvg(G.st.board[drag.r][drag.c]);
    document.body.appendChild(g);
    drag.ghost=g;drag.size=size;
    if(pw)pw.classList.add('lifted');
  }
  drag.ghost.style.transform='translate('+(e.clientX-drag.size/2)+'px,'+(e.clientY-drag.size/2)+'px)';
  var t=cellFromPoint(e.clientX,e.clientY);
  var over=t&&t.el.classList.contains('ch-hint')?t.el:null;
  if(over!==drag.over){if(drag.over)drag.over.classList.remove('ch-over');if(over)over.classList.add('ch-over');drag.over=over;}
}
function onUp(e){
  if(!drag)return;
  var d=drag;drag=null;
  if(d.ghost)d.ghost.remove();
  if(d.moving){
    var t=cellFromPoint(e.clientX,e.clientY);
    if(t&&!(t.r===d.r&&t.c===d.c)&&tryHumanMove(d.r,d.c,t.r,t.c,{noSlide:true}))return;
    render();   // вернуть фигуру на место, выбор остаётся
    return;
  }
  if(d.wasSel){G.sel=null;render();}   // повторный клик по выбранной фигуре снимает выбор
}
function onCancel(){if(!drag)return;if(drag.ghost)drag.ghost.remove();drag=null;render();}

/* ── превращение пешки ── */
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
  function apply(mv,note){
    if(!stillValid())return;
    G.thinking=false;
    var info=play(mv);
    var res=gameResult();
    if(res){finish(res);return;}
    msg(info.check?'CHECK! YOUR TURN':(note||'YOUR TURN'),info.check);
    Bot.react(info.check?'check':info.captured?'attack':'moved');
  }
  function onBest(uci){
    if(!stillValid())return;
    var mv=R.fromUCI(G.st,uci);
    if(!mv){apply(localMove(),'LOCAL AI MOVE');return;}
    apply(mv);
  }
  function search(){
    if(!stillValid())return;
    msg(L.think+'...');
    var ok=E.go({moves:G.uci,depth:L.depth,movetime:L.movetime,skill:L.skill,contempt:L.contempt,
      onDepth:function(d){if(stillValid())msg(L.think+' [DEPTH '+d+']');}},onBest);
    if(!ok)fallback(E.lastError()||'ENGINE BUSY');
  }
  function fallback(err){
    if(!stillValid())return;
    msg(err+'. LOCAL AI...');
    setTimeout(function(){apply(localMove(),'LOCAL AI. YOUR TURN');},300);
  }
  if(E.isReady())search();
  else{msg('LOADING ENGINE...');E.load(search,fallback);}
}

/* запасной ИИ, если Stockfish не загрузился */
function localMove(){
  var st=G.st,all=R.allLegal(st);
  if(G.diff==='beginner'){
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

/* ── сдаться (второе нажатие подтверждает) ── */
var resignTimer=null;
function resetResign(){clearTimeout(resignTimer);$('ch-resign').textContent='RESIGN';$('ch-resign').classList.remove('sel');}
function onResign(){
  if(G.dead||!G.history.length)return;
  var b=$('ch-resign');
  if(!b.classList.contains('sel')){
    b.textContent='SURE?';b.classList.add('sel');
    resignTimer=setTimeout(resetResign,3000);return;
  }
  resetResign();
  finish({result:'lose',reason:'RESIGNED'});
}

/* ── отрисовка ── */
/* anim: {slides:[[r,c,tr,tc],...], burst:[r,c]} */
function render(anim){
  var el=$('ch-board'),st=G.st,flip=G.human==='b',html='';
  var hints={};
  if(G.sel)R.legal(st,G.sel.r,G.sel.c).forEach(function(m){hints[m.tr*8+m.tc]=st.board[m.tr][m.tc]||m.enPassant?'cap':'go';});
  var checkSq=null;
  if(R.inCheck(st.board,st.turn)){var k=R.findKing(st.board,st.turn);checkSq=k[0]*8+k[1];}
  function on(last,r,c){return last&&((last.r===r&&last.c===c)||(last.tr===r&&last.tc===c));}
  for(var vr=0;vr<8;vr++)for(var vc=0;vc<8;vc++){
    var r=flip?7-vr:vr,c=flip?7-vc:vc,i=r*8+c,p=st.board[r][c];
    var cls='ch-cell '+((r+c)%2===0?'ch-light':'ch-dark');
    if(G.sel&&G.sel.r===r&&G.sel.c===c)cls+=' ch-sel';
    if(hints[i])cls+=' ch-hint'+(hints[i]==='cap'?' ch-cap':'');
    if(on(G.lastH,r,c))cls+=' ch-last-h';
    if(on(G.lastA,r,c))cls+=' ch-last-a';
    if(i===checkSq)cls+=' ch-check';
    html+='<div class="'+cls+'" data-r="'+r+'" data-c="'+c+'">';
    if(p)html+='<div class="ch-pw">'+pieceSvg(p)+'</div>';
    if(vc===0)html+='<span class="ch-lbl ch-lbl-r">'+(8-r)+'</span>';
    if(vr===7)html+='<span class="ch-lbl ch-lbl-c">'+'abcdefgh'[c]+'</span>';
    html+='</div>';
  }
  el.innerHTML=html;
  if(anim&&!reducedMotion()){
    (anim.slides||[]).forEach(function(s){slide(s[0],s[1],s[2],s[3]);});
    if(anim.burst)burst(anim.burst[0],anim.burst[1]);
  }
  renderLog();renderCaptured();
}
function reducedMotion(){return window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;}
function cellEl(r,c){return $('ch-board').querySelector('.ch-cell[data-r="'+r+'"][data-c="'+c+'"]');}

/* фигура стартует со старой клетки и доезжает до новой */
function slide(r,c,tr,tc){
  var cell=cellEl(tr,tc),pw=cell&&cell.querySelector('.ch-pw');if(!pw)return;
  var k=G.human==='b'?-1:1;
  pw.style.transform='translate('+((c-tc)*k*100)+'%,'+((r-tr)*k*100)+'%)';
  pw.getBoundingClientRect();
  pw.classList.add('moving');
  pw.style.transform='';
  pw.addEventListener('transitionend',function(){pw.classList.remove('moving');},{once:true});
}

/* вспышка на клетке взятия */
function burst(r,c){
  var cell=cellEl(r,c);if(!cell)return;
  var wrap=document.createElement('div');wrap.className='ch-burst';
  var html='<span class="ch-ring"></span>';
  for(var i=0;i<12;i++){
    var a=i/12*Math.PI*2+Math.random()*0.4,d=6+Math.random()*5;   // в cqw, клетка = 12.5cqw
    html+='<i style="--dx:'+(Math.cos(a)*d).toFixed(1)+'cqw;--dy:'+(Math.sin(a)*d).toFixed(1)+'cqw"></i>';
  }
  wrap.innerHTML=html;
  setTimeout(function(){cell.appendChild(wrap);},180);
  setTimeout(function(){wrap.remove();},900);
}
function renderLog(){
  var body=$('ch-movelog-body'),h=G.history;
  if(!h.length){body.innerHTML='<div class="mlog-empty">NO MOVES YET</div>';return;}
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
    return list.slice().sort(function(a,b){return VAL[b[1]]-VAL[a[1]];})
      .map(pieceSvg).join('');
  }
  var sum=function(l){return l.reduce(function(s,p){return s+VAL[p[1]];},0);};
  var d=sum(G.capByHuman)-sum(G.capByAi);
  $('cap-human').innerHTML=row(G.capByHuman)+(d>0?'<span class="cap-adv">+'+d+'</span>':'');
  $('cap-ai').innerHTML=row(G.capByAi)+(d<0?'<span class="cap-adv" style="color:var(--err)">+'+(-d)+'</span>':'');
}

/* ── итоги ── */
function showReport(res){
  if(!G.dead)return;
  var t=$('ch-report-title');
  t.textContent={win:'VICTORY',lose:'DEFEAT',draw:'DRAW'}[res.result];
  t.className='ch-report-title '+res.result;
  $('ch-report-sub').textContent=res.reason;
  var secs=Math.round((Date.now()-G.start)/1000);
  function rowH(k,v){return '<div class="ch-rep-row"><span class="ch-rep-k">'+k+'</span><span class="ch-rep-v">'+v+'</span></div>';}
  $('ch-report-stats').innerHTML=
    rowH('YOU PLAYED',G.human==='w'?'WHITE':'BLACK')+
    rowH('MODE',level().name)+
    rowH('MOVES',Math.ceil(G.history.length/2))+
    rowH('YOUR CAPTURES',G.capByHuman.length)+
    rowH('AI CAPTURES',G.capByAi.length)+
    rowH('TIME',Math.floor(secs/60)+':'+('0'+secs%60).slice(-2));
  if(res.result==='win'){
    var k='aceon_chess_wins_'+(G.diff==='aceon'?'aceon_'+G.sub:G.diff);
    A.lsSet(k,(parseInt(A.lsGet(k,'0'),10)||0)+1);
  }
  show('report-modal');
}

/* ── запуск ── */
function boot(){
  A.topbar('CHESS');
  Bot.init();loadMode();paintModeButtons();
  setTheme(A.lsGet('aceon_chess_theme','wood')==='neon'?'neon':'wood');

  var board=$('ch-board');
  board.addEventListener('pointerdown',onDown);
  board.addEventListener('pointermove',onMove);
  board.addEventListener('pointerup',onUp);
  board.addEventListener('pointercancel',onCancel);
  board.addEventListener('contextmenu',function(e){e.preventDefault();});
  $('ch-theme').addEventListener('click',function(){setTheme(G.theme==='wood'?'neon':'wood');});
  $('chb-beginner').addEventListener('click',function(){setMode('beginner');});
  $('chb-professional').addEventListener('click',function(){setMode('professional');});
  $('chb-aceon').addEventListener('click',function(){show('ai-modal');});
  document.querySelectorAll('.ai-opt').forEach(function(b){
    b.addEventListener('click',function(){
      hide('ai-modal');
      if(b.dataset.sub==='grandmaster'){show('gm-modal');return;}
      setMode('aceon',b.dataset.sub);
    });
  });
  $('ai-cancel').addEventListener('click',function(){hide('ai-modal');});
  $('gm-accept').addEventListener('click',function(){hide('gm-modal');setMode('aceon','grandmaster');});
  $('gm-back').addEventListener('click',function(){hide('gm-modal');show('ai-modal');});
  $('ch-new').addEventListener('click',newGame);
  $('ch-resign').addEventListener('click',onResign);
  $('rep-new').addEventListener('click',newGame);
  $('rep-close').addEventListener('click',function(){hide('report-modal');});

  newGame();
  E.load();   // движок грузится, пока игрок смотрит на заставку
  A.splash('CHESS',function(){
    G.started=true;A.trackPlay();
    if(G.st.turn===G.ai){msg('AI MOVES FIRST');setTimeout(aiMove,400);}
    else msg('YOUR TURN ('+(G.human==='w'?'WHITE':'BLACK')+')');
  });
}

window.AceonChess={state:G,newGame:newGame,setMode:setMode,play:play,tryMove:tryHumanMove,setTheme:setTheme};
boot();
})();
