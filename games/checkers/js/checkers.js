/* A.C.EON CHECKERS: меню, доска, ввод, бот, статистика, сохранение.
   Правила в rules.js, бот в ai.js (считает в worker.js, если браузер умеет), тексты в lang.js. */
(function(){
'use strict';

var t=I18n.t,A=window.Arcade,R=window.CkRules;
var $=function(id){return document.getElementById(id);};
function show(id){$(id).classList.remove('hidden');}
function hide(id){$(id).classList.add('hidden');}

var MODES=['bot','duo'],RULES=['russian','english','giveaway'],LEVELS=['easy','normal','hard','master'],THEMES=['wood','neon','flat'],SIDES=['white','black','random'];
var ART=new URL('../art/checkers/',location.href).href;
/* картинки от Codex: пока не выложены, false; тогда доска и шашки рисуются кодом */
var ART_READY=true;

Store.define('checkers',{
  version:1,
  defaults:{settings:{mode:'bot',rules:'russian',level:'normal',side:'white',theme:'wood',hints:true,flip:false},
    stats:{},save:null},
  legacy:function(raw){var w=parseInt(raw('aceon_cl_checkers'),10)||0;return w?{stats:{'russian-normal':{played:w,win:w,draw:0,loss:0}}}:null;}
});
var DB=Store.get('checkers'),S=DB.settings,ST=DB.stats;
if(MODES.indexOf(S.mode)<0)S.mode='bot';
if(RULES.indexOf(S.rules)<0)S.rules='russian';
if(LEVELS.indexOf(S.level)<0)S.level='normal';
if(THEMES.indexOf(S.theme)<0)S.theme='wood';
if(SIDES.indexOf(S.side)<0)S.side='white';
function save(){Store.save('checkers');}
function statKey(g){return g.rules+'-'+(g.mode==='duo'?'duo':g.level);}
function stat(k){if(!ST[k])ST[k]={played:0,win:0,draw:0,loss:0};return ST[k];}

/* ── звуки ── */
Sound.define('cMove',function(tm,tone,noise){noise(tm,0.04,0.18,2200);tone(tm,320,0.05,'triangle',0.04);});
Sound.define('cCap',function(tm,tone,noise){noise(tm,0.06,0.25,1500);tone(tm,520,0.08,'square',0.04,260);});
Sound.define('cKing',function(tm,tone){[523,659,784,1047].forEach(function(f,i){tone(tm+i*0.06,f,0.12,'triangle',0.05);});});
Sound.define('cSel',function(tm,tone){tone(tm,700,0.03,'sine',0.03);});

/* ── бот: в отдельном потоке, если можно ── */
var worker=null,reqId=0,pending=null;
try{
  var ver=(document.querySelector('script[data-v]')||{}).getAttribute?document.querySelector('script[data-v]').getAttribute('data-v'):'';
  if(window.Worker){worker=new Worker('js/worker.js?v='+ver);worker.onmessage=function(e){if(pending&&e.data.id===pending.id){var cb=pending.cb;pending=null;cb(e.data.move);}};worker.onerror=function(){worker=null;};}
}catch(e){worker=null;}
function think(st,level,cb){
  var id=++reqId,snap=R.clone(st);
  if(worker){pending={id:id,cb:cb};worker.postMessage({id:id,st:snap,level:level});
    /* запасной путь, если поток молчит */
    setTimeout(function(){if(pending&&pending.id===id){pending=null;var r=CkAI.best(snap,level);cb(r&&r.move);}},6000);}
  else setTimeout(function(){var r=CkAI.best(snap,level);cb(r&&r.move);},30);
  return id;
}
function cancelThink(){pending=null;reqId++;}

/* ════════ МЕНЮ ════════ */
function buildModes(){
  var list=$('mode-list');list.innerHTML='';
  MODES.forEach(function(m){
    var b=document.createElement('button');b.type='button';b.className='m-card-btn'+(S.mode===m?' sel':'');
    var ico=ART_READY?'<img class="m-img" alt="" src="'+ART+'mode_'+m+'.webp">':'<span class="m-ico c-ico c-ico-'+m+'"><i></i><i></i></span>';
    b.innerHTML=ico+'<span class="m-txt"><span class="m-name" data-i18n="mode.'+m+'"></span><span class="m-desc" data-i18n="desc.'+m+'"></span></span>';
    b.addEventListener('click',function(){S.mode=m;save();paintMenu();Sound.sfx('select');});
    list.appendChild(b);
  });
  I18n.apply(list);
}
function buildLevels(){
  var h='';
  LEVELS.forEach(function(l){
    var s=stat(S.rules+'-'+l);
    h+='<button type="button" class="op'+(S.level===l?' sel':'')+'" data-l="'+l+'">'+
      (ART_READY?'<img class="op-img" alt="" src="'+ART+'bot_'+l+'.webp">':'<span class="op-pv op-'+l+'"></span>')+
      '<b>'+t('lv.'+l)+'</b><i>'+s.win+' / '+s.played+'</i></button>';
  });
  $('levels').innerHTML=h;
  $('lv-note').textContent=t('lvd.'+S.level);
}
function row(k,v){return '<div class="ov-row"><span>'+t(k)+'</span><b>'+v+'</b></div>';}
function buildStats(){
  var h='<div class="st-row st-head"><span></span><b>'+t('st.games')+'</b><b>'+t('st.win')+'</b><b>'+t('st.draw')+'</b></div>';
  LEVELS.concat(['duo']).forEach(function(l){var s=stat(S.rules+'-'+l);
    h+='<div class="st-row'+((S.mode==='duo'?'duo':S.level)===l?' cur':'')+'"><span>'+t(l==='duo'?'mode.duo':'lv.'+l)+'</span><b>'+s.played+'</b><b>'+s.win+'</b><b>'+s.draw+'</b></div>';});
  $('stats').innerHTML=h;
  $('stats-h').textContent=t('menu.stats')+': '+t('rules.'+S.rules);
}
function segSel(id,v){var l=document.querySelectorAll('#'+id+' .seg-btn');for(var i=0;i<l.length;i++)l[i].classList.toggle('sel',l[i].getAttribute('data-v')===String(v));}
function paintMenu(){
  buildModes();buildStats();
  $('bot-box').classList.toggle('hidden',S.mode!=='bot');
  $('duo-box').classList.toggle('hidden',S.mode!=='duo');
  if(S.mode==='bot')buildLevels();
  segSel('seg-rules',S.rules);segSel('seg-side',S.side);segSel('seg-theme',S.theme);segSel('seg-hints',S.hints?'on':'off');segSel('seg-flip',S.flip?'on':'off');
  $('rules-note').textContent=t('rnote.'+S.rules);
  applyTheme();
  var sv=DB.save;$('btn-cont').classList.toggle('hidden',!sv);
  if(sv)$('cont-info').textContent=t('rules.'+sv.rules)+' / '+(sv.mode==='duo'?t('mode.duo'):t('lv.'+sv.level));
}
/* фон страницы и цвета кнопок по виду доски: дерево тёплое, неон и плоский бирюзовые */
function applyTheme(){
  THEMES.forEach(function(x){document.body.classList.toggle('ck-'+x,S.theme===x);});
  document.body.classList.toggle('art',ART_READY&&S.theme!=='flat');
}
function showScreen(name){
  document.body.classList.toggle('screen-menu',name==='menu');
  document.body.classList.toggle('screen-game',name==='game');
  if(name==='menu'){cancelThink();paintMenu();hide('over-modal');}
  Sound.music(name==='menu'?'menu':'game');
  window.scrollTo(0,0);
  if(name==='game'){layout();requestAnimationFrame(layout);}
}

/* ════════ ПАРТИЯ ════════ */
var G=null;
function newGame(resume){
  cancelThink();
  var sv=DB.save;
  if(resume===true&&sv){
    var st=R.create(sv.rules);st.b=sv.st.b;st.turn=sv.st.turn;st.quiet=sv.st.quiet;st.hist=sv.st.hist;st.ply=sv.st.ply;
    G={mode:sv.mode,rules:sv.rules,level:sv.level,me:sv.me,st:st,log:sv.log||[],undo:sv.undo||[],hints:sv.hints||0,undos:sv.undos||0,over:false,busy:false,sel:null,last:sv.last||null,hint:null};
  }else{
    var me=S.side==='random'?(Math.random()<0.5?1:-1):S.side==='black'?-1:1;
    G={mode:S.mode,rules:S.rules,level:S.level,me:S.mode==='duo'?1:me,st:R.create(S.rules),log:[],undo:[],hints:0,undos:0,over:false,busy:false,sel:null,last:null,hint:null};
    stat(statKey(G)).played++;
    A.trackPlay();
  }
  save();persist();
  hide('over-modal');
  showScreen('game');
  buildBoard();render(true);paintSide();
  if(G.mode==='bot'&&G.st.turn!==G.me)botMove();
}
function persist(){
  if(!G||G.over){DB.save=null;save();return;}
  var st=G.st;
  DB.save={mode:G.mode,rules:G.rules,level:G.level,me:G.me,st:{b:st.b,turn:st.turn,quiet:st.quiet,hist:st.hist,ply:st.ply},log:G.log,undo:G.undo,hints:G.hints,undos:G.undos,last:G.last};
  save();
}
function snap(){var st=G.st;return {b:st.b.slice(),turn:st.turn,quiet:st.quiet,hl:st.hist.length,ply:st.ply,log:G.log.length,last:G.last};}
function restore(s){var st=G.st;st.b=s.b.slice();st.turn=s.turn;st.quiet=s.quiet;st.hist.length=s.hl;st.ply=s.ply;G.log.length=s.log;G.last=s.last;st.over=false;}

/* сыграть ход: анимация по шагам, потом проверка конца */
function play(m,fromBot){
  if(!G||G.over)return;
  G.undo.push(snap());if(G.undo.length>200)G.undo.shift();
  G.sel=null;G.hint=null;G.busy=true;
  var st=G.st,piece=st.b[m.f];
  G.log.push(R.notation(m));
  animate(m,piece,function(){
    R.apply(st,m);R.status(st);
    G.last={f:m.f,to:m.path[m.path.length-1],path:m.path};
    if(m.promo)Sound.sfx('cKing');
    G.busy=false;render(true);paintSide();persist();
    if(st.over){finish();return;}
    if(G.mode==='bot'&&st.turn!==G.me)botMove();
  });
}
function botMove(){
  G.busy=true;paintSide();
  var t0=Date.now();
  think(G.st,G.level,function(m){
    if(!G||G.over||!m){if(G)G.busy=false;return;}
    var wait=Math.max(0,420-(Date.now()-t0));
    setTimeout(function(){if(G&&!G.over)play(m,true);},wait);
  });
}
function finish(){
  var st=G.st,res=st.result,k=statKey(G),s=stat(k),title,cls='win';
  if(G.mode==='duo'){
    if(res===0){title=t('over.draw');cls='draw';s.draw++;}
    else{title=t(res>0?'over.whiteWins':'over.blackWins');s.win++;}
  }else{
    if(res===0){title=t('over.draw');cls='draw';s.draw++;}
    else if(res===G.me){title=t('over.win');s.win++;Sound.sfx('win');}
    else{title=t('over.lose');cls='lose';s.loss++;Sound.sfx('lose');}
    if(res===G.me&&G.rules==='russian')A.setHi('ck_'+G.level,1);
  }
  G.over=true;DB.save=null;save();
  $('over-title').textContent=title;$('over-title').className='over-title '+cls;
  $('over-why').textContent=t('why.'+st.why);
  $('over-rows').innerHTML=row('over.rules',t('rules.'+G.rules))+(G.mode==='bot'?row('over.level',t('lv.'+G.level)):'')+
    row('over.moves',Math.ceil(st.ply/2))+row('over.left',R.count(st,1)+' : '+R.count(st,-1))+
    (G.undos||G.hints?row('over.help',t('over.helpv',{u:G.undos,h:G.hints})):'');
  setTimeout(function(){if(G&&G.over)show('over-modal');},700);
  paintSide();
}

/* ── отмена: против бота до своего прошлого хода ── */
function undo(){
  if(!G||G.busy||!G.undo.length)return;
  cancelThink();
  var s=G.undo.pop();
  if(G.mode==='bot')while(s.turn!==G.me&&G.undo.length)s=G.undo.pop();
  if(G.mode==='bot'&&s.turn!==G.me){G.undo.push(s);return;}
  restore(s);G.over=false;G.undos++;G.sel=null;G.hint=null;hide('over-modal');
  render(true);paintSide();persist();Sound.sfx('select');
}
function hint(){
  if(!G||G.busy||G.over||(G.mode==='bot'&&G.st.turn!==G.me))return;
  G.busy=true;paintSide();
  think(G.st,'hard',function(m){G.busy=false;if(!m)return;G.hints++;G.hint={f:m.f,to:m.path[m.path.length-1],path:m.path};G.sel=null;render(false);paintSide();persist();});
}

/* ════════ ДОСКА ════════ */
var sqEls=[],pcLayer=null,pcEls={};
function flipped(){return G&&(G.mode==='bot'?G.me<0:(S.flip&&G.st.turn<0));}
function pos(i){var r=i>>3,c=i&7;if(flipped()){r=7-r;c=7-c;}return [c*12.5,r*12.5];}
function buildBoard(){
  var b=$('board');b.innerHTML='';sqEls=[];pcEls={};
  b.className='board th-'+S.theme+(ART_READY&&S.theme!=='flat'?' art':'');
  var grid=document.createElement('div');grid.className='grid';b.appendChild(grid);
  for(var i=0;i<64;i++){
    var d=document.createElement('div'),dark=((i>>3)+(i&7))%2===1;
    d.className='sq '+(dark?'d':'l');d.setAttribute('data-i',i);
    grid.appendChild(d);sqEls.push(d);
  }
  pcLayer=document.createElement('div');pcLayer.className='pcs';b.appendChild(pcLayer);
  var co=document.createElement('div');co.className='coords';b.appendChild(co);
  if(ART_READY&&S.theme!=='flat'){var fr=document.createElement('img');fr.className='frame';fr.alt='';fr.src=ART+'frame_'+S.theme+'.webp';b.appendChild(fr);}
  $('arena').style.backgroundImage='';   /* фон теперь у всей страницы (body.art), и в меню, и в игре */
}
function placeSquares(){
  /* при перевороте меняется порядок клеток в сетке */
  var grid=document.querySelector('#board .grid'),f=flipped();
  for(var k=0;k<64;k++){var i=f?63-k:k;grid.appendChild(sqEls[i]);}
  var co=document.querySelector('#board .coords'),h='';
  for(var c=0;c<8;c++)h+='<i class="cx" style="left:'+(c*12.5+6.25)+'%">'+'abcdefgh'.charAt(f?7-c:c)+'</i>';
  for(var r=0;r<8;r++)h+='<i class="cy" style="top:'+(r*12.5+6.25)+'%">'+(f?r+1:8-r)+'</i>';
  co.innerHTML=h;
}
function pieceImg(p){
  if(!(ART_READY&&S.theme!=='flat'))return '';
  return '<img alt="" src="'+ART+S.theme+'_'+(p>0?'white':'black')+(Math.abs(p)===2?'_king':'')+'.webp">';
}
function render(full){
  if(!G)return;
  var st=G.st;
  if(full)placeSquares();
  /* шашки: элемент на клетку, сдвигаем transform */
  pcLayer.innerHTML='';pcEls={};
  for(var i=0;i<64;i++){var p=st.b[i];if(!p)continue;
    var e=document.createElement('div');e.className='pc '+(p>0?'w':'b')+(Math.abs(p)===2?' k':'');
    e.innerHTML=pieceImg(p);
    var xy=pos(i);e.style.left=xy[0]+'%';e.style.top=xy[1]+'%';
    pcLayer.appendChild(e);pcEls[i]=e;}
  marks();
}
function legal(){return G&&!G.over?R.moves(G.st):[];}
function myTurn(){return G&&!G.over&&!G.busy&&(G.mode==='duo'||G.st.turn===G.me);}
function marks(){
  sqEls.forEach(function(e){e.className=e.className.replace(/ (can|sel|dst|last|hint|hintf)/g,'');});
  if(G.last){mark(G.last.f,'last');mark(G.last.to,'last');}
  if(G.hint){mark(G.hint.f,'hintf');mark(G.hint.to,'hint');}
  if(!myTurn())return;
  var ms=legal();
  if(S.hints||ms[0]&&ms[0].caps.length){var seen={};ms.forEach(function(m){if(!seen[m.f]){seen[m.f]=1;mark(m.f,'can');}});}
  if(G.sel){mark(G.sel.at,'sel');nextSteps().forEach(function(i){mark(i,'dst');});}
}
function mark(i,c){sqEls[i].className+=' '+c;}
function cands(){var s=G.sel;return legal().filter(function(m){if(m.f!==s.f)return false;for(var k=0;k<s.pre.length;k++)if(m.path[k]!==s.pre[k])return false;return true;});}
function nextSteps(){var s=G.sel,u={};cands().forEach(function(m){if(m.path.length>s.pre.length)u[m.path[s.pre.length]]=1;});return Object.keys(u).map(Number);}

function tap(i){
  if(!myTurn())return;
  var st=G.st,p=st.b[i],own=p&&(p>0)===(st.turn>0);
  if(own&&(!G.sel||!G.sel.pre.length)){
    var has=legal().some(function(m){return m.f===i;});
    if(has){G.sel={f:i,at:i,pre:[]};G.hint=null;Sound.sfx('cSel');}
    else{G.sel=null;if(legal()[0].caps.length)flash(t('st.mustCap'));}
    marks();return;
  }
  if(!G.sel)return;
  var steps=nextSteps();
  if(steps.indexOf(i)<0){if(!G.sel.pre.length){G.sel=null;marks();}return;}
  G.sel.pre.push(i);
  var left=cands();
  var done=left.filter(function(m){return m.path.length===G.sel.pre.length;});
  if(done.length&&left.length===done.length){var m=done[0];G.sel=null;play(m);return;}
  /* цепочка взятия: шашка встаёт на промежуточное поле, дальше выбор следующего */
  var e=pcEls[G.sel.at];if(e){var xy=pos(i);e.style.left=xy[0]+'%';e.style.top=xy[1]+'%';delete pcEls[G.sel.at];pcEls[i]=e;}
  G.sel.at=i;Sound.sfx('cMove');marks();
}
function animate(m,piece,done){
  var e=pcEls[G.sel&&G.sel.at!=null?G.sel.at:m.f]||pcEls[m.f];
  /* если ход собран по шагам руками, шашка уже стоит на предпоследнем поле */
  var start=0;
  if(!e){for(var k=m.path.length-2;k>=0;k--)if(pcEls[m.path[k]]){e=pcEls[m.path[k]];start=k+1;break;}}
  var steps=m.path.slice(start),i=0,capEls=m.caps.map(function(c){return pcEls[c];});
  function next(){
    if(i>=steps.length){capEls.forEach(function(c){if(c)c.classList.add('gone');});setTimeout(done,m.caps.length?160:40);return;}
    var xy=pos(steps[i]);if(e){e.style.left=xy[0]+'%';e.style.top=xy[1]+'%';}
    if(m.caps.length){var c=capEls[start+i];if(c)c.classList.add('hit');Sound.sfx('cCap');}else Sound.sfx('cMove');
    i++;setTimeout(next,m.caps.length?230:180);
  }
  next();
}
function flash(txt){var s=$('status');s.textContent=txt;s.classList.add('warn');setTimeout(function(){s.classList.remove('warn');paintSide();},1400);}

/* ── боковая панель ── */
function paintSide(){
  if(!G)return;
  var st=G.st,turn=st.turn;
  var who=G.mode==='duo'?t(turn>0?'st.whiteMove':'st.blackMove'):(turn===G.me?t('st.yourMove'):t('st.botMove',{n:t('lv.'+G.level)}));
  if(G.busy&&G.mode==='bot'&&turn!==G.me)who=t('st.thinking',{n:t('lv.'+G.level)});
  else if(G.busy&&turn===G.me)who=t('st.hinting');
  if(G.over)who=t('st.over');
  var ms=G.over?[]:legal();
  if(!G.over&&ms.length&&ms[0].caps.length&&myTurn())who+=' / '+t('st.mustCap');
  $('status').textContent=who;
  $('turn-dot').className='turn-dot '+(turn>0?'w':'b');
  var opp=$('opp');
  if(G.mode==='bot'){opp.classList.remove('hidden');
    $('opp-pic').innerHTML=ART_READY?'<img alt="" src="'+ART+'bot_'+G.level+'.webp">':'<span class="op-pv op-'+G.level+'"></span>';
    $('opp-name').textContent=t('lv.'+G.level);$('opp-side').textContent=t(G.me>0?'side.black':'side.white');}
  else opp.classList.add('hidden');
  $('cnt-w').textContent=R.count(st,1);$('cnt-b').textContent=R.count(st,-1);
  var log='';for(var i=0;i<G.log.length;i+=2)log+='<div><i>'+(i/2+1)+'.</i><span>'+G.log[i]+'</span><span>'+(G.log[i+1]||'')+'</span></div>';
  var L=$('log');L.innerHTML=log;L.scrollTop=L.scrollHeight;
  $('btn-undo').disabled=!G.undo.length||G.busy;$('btn-hint').disabled=G.busy||G.over||!myTurn();
  $('hud-mode').textContent=t('rules.'+G.rules)+' / '+(G.mode==='duo'?t('mode.duo'):t('lv.'+G.level));
}

/* размер доски под окно */
function layout(){
  if(!document.body.classList.contains('screen-game'))return;
  var arena=$('arena'),aw=arena.clientWidth-16,top=arena.getBoundingClientRect().top;
  var vh=window.innerHeight||document.documentElement.clientHeight;
  var wide=aw>=820,side=wide?260:0;
  var size=Math.max(240,Math.min(aw-side-16,vh-top-(wide?24:190),720));
  $('board').style.width=size+'px';$('board').style.height=size+'px';
  $('board').style.setProperty('--bs',size+'px');
  document.body.classList.toggle('narrow',!wide);
}
var rzT;
window.addEventListener('resize',function(){clearTimeout(rzT);rzT=setTimeout(layout,80);});

/* ── ввод: касание и мышь по клеткам, перетаскивание не нужно ── */
function bindBoard(){
  var b=$('board');
  function down(e){var n=e.target;while(n&&n!==b&&!(n.getAttribute&&n.getAttribute('data-i')))n=n.parentNode;
    if(!n||n===b){
      /* касание пришлось на шашку: ищем клетку под ней */
      var r=b.getBoundingClientRect(),x=(e.clientX-r.left)/r.width,y=(e.clientY-r.top)/r.height;
      if(x<0||y<0||x>=1||y>=1)return;
      var c=Math.floor(x*8),rr=Math.floor(y*8);if(flipped()){c=7-c;rr=7-rr;}tap(rr*8+c);return;}
    tap(+n.getAttribute('data-i'));}
  if(window.PointerEvent)b.addEventListener('pointerdown',function(e){if(e.pointerType==='mouse'&&e.button!==0)return;e.preventDefault();down(e);});
  else b.addEventListener('mousedown',down);
}
document.addEventListener('keydown',function(e){
  if(!G||!document.body.classList.contains('screen-game'))return;
  if((e.ctrlKey||e.metaKey)&&e.code==='KeyZ'){e.preventDefault();undo();}
  else if(e.code==='KeyH'){hint();}
  else if(e.code==='Escape'){G.sel=null;marks();}
});

function onLang(){paintMenu();if(G){paintSide();}}
function bindSeg(id,fn){var l=document.querySelectorAll('#'+id+' .seg-btn');for(var i=0;i<l.length;i++)(function(b){b.addEventListener('click',function(){fn(b.getAttribute('data-v'));save();paintMenu();Sound.sfx('select');});})(l[i]);}
function boot(){
  A.topbar('c.title');
  I18n.apply();I18n.onChange(onLang);
  bindBoard();
  bindSeg('seg-rules',function(v){S.rules=v;});
  bindSeg('seg-side',function(v){S.side=v;});
  bindSeg('seg-theme',function(v){S.theme=v;});
  bindSeg('seg-hints',function(v){S.hints=v==='on';});
  bindSeg('seg-flip',function(v){S.flip=v==='on';});
  $('levels').addEventListener('click',function(e){var n=e.target;while(n&&n!==this&&!(n.getAttribute&&n.getAttribute('data-l')))n=n.parentNode;if(!n||n===this)return;S.level=n.getAttribute('data-l');save();paintMenu();Sound.sfx('select');});
  $('btn-play').addEventListener('click',function(){newGame(false);});
  $('btn-cont').addEventListener('click',function(){newGame(true);});
  $('btn-menu').addEventListener('click',function(){showScreen('menu');});
  $('btn-undo').addEventListener('click',undo);
  $('btn-hint').addEventListener('click',hint);
  $('btn-new').addEventListener('click',function(){newGame(false);});
  $('over-retry').addEventListener('click',function(){newGame(false);});
  $('over-undo').addEventListener('click',undo);
  $('over-menu').addEventListener('click',function(){showScreen('menu');});
  paintMenu();
  showScreen('menu');
}

window.AceonCheckers={g:function(){return G;},settings:S,db:DB,tap:tap,newGame:newGame,undo:undo};
boot();
})();
