/* A.C.EON SOLITAIRE: меню, стол, перетаскивание, касание, отмена, подсказка, победа.
   Правила в rules.js, рисунок карт в cards.js, тексты в lang.js.

   Каждая карта на столе: один постоянный элемент. Положение задаётся transform,
   поэтому любой ход, отмена и сдача анимируются сами (CSS transition). */
(function(){
'use strict';

var t=I18n.t,A=window.Arcade,R=window.SolRules;
var $=function(id){return document.getElementById(id);};
function show(id){$(id).classList.remove('hidden');}
function hide(id){$(id).classList.add('hidden');}

var GAMES=['klondike','spider','freecell'];
var UNDO_MAX=400,UNDO_SAVE=25;

/* ── сохранения ── */
Store.define('solitaire',{
  version:1,
  defaults:{settings:{game:'klondike',draw:1,redeals:'inf',suits:1,table:'felt',back:'aceon',auto:true,tap:'select'},stats:{},save:null},
  legacy:function(raw){
    var hi=parseInt(raw('aceon_hi_soli'),10)||0;
    return hi?{stats:{'klondike-d1':{played:0,won:0,bestScore:hi}}}:null;
  }
});
var DB=Store.get('solitaire'),S=DB.settings;
if(GAMES.indexOf(S.game)<0)S.game='klondike';
if(S.draw!==1&&S.draw!==3)S.draw=1;
if(['inf','3','0'].indexOf(String(S.redeals))<0)S.redeals='inf';
S.redeals=String(S.redeals);
if([1,2,4].indexOf(S.suits)<0)S.suits=1;
if(['felt','blue','neon'].indexOf(S.table)<0)S.table='felt';
if(['aceon','red','blue'].indexOf(S.back)<0)S.back='aceon';
if(S.tap!=='auto')S.tap='select';
function save(){Store.save('solitaire');}

function optOf(game){
  if(game==='klondike')return {draw:S.draw,redeals:S.redeals};
  if(game==='spider')return {suits:S.suits};
  return {};
}
function variant(game,opt){
  if(game==='klondike')return 'klondike-d'+opt.draw;
  if(game==='spider')return 'spider-'+opt.suits;
  return 'freecell';
}
function stat(key){if(!DB.stats[key])DB.stats[key]={played:0,won:0};return DB.stats[key];}

/* звуки карт */
Sound.define('card',function(tm,tone,noise){noise(tm,0.04,0.35,3200);});
Sound.define('flip',function(tm,tone,noise){noise(tm,0.03,0.25,4200);tone(tm,520,0.03,'sine',0.03);});
Sound.define('found',function(tm,tone){tone(tm,880,0.06,'triangle',0.06);tone(tm+0.05,1320,0.08,'triangle',0.05);});
Sound.define('nope',function(tm,tone){tone(tm,180,0.08,'square',0.04);});
Sound.define('deal',function(tm,tone,noise){for(var i=0;i<6;i++)noise(tm+i*0.05,0.03,0.25,3000);});

/* ── партия ── */
var Gm={st:null,undo:[],elapsed:0,since:0,running:false,over:false,busy:false,key:''};
function Rl(){return R.get(Gm.st.game);}

/* ════════ МЕНЮ ════════ */
function buildGames(){
  var list=$('game-list');list.innerHTML='';
  GAMES.forEach(function(g){
    var b=document.createElement('button');
    b.type='button';b.className='g-card'+(S.game===g?' sel':'');
    b.innerHTML='<span class="g-ico g-ico-'+g+'"></span><span class="g-txt"><span class="g-name" data-i18n="game.'+g+'"></span>'+
      '<span class="g-desc" data-i18n="desc.'+g+'"></span></span>';
    b.addEventListener('click',function(){S.game=g;save();paintMenu();Sound.sfx('select');});
    list.appendChild(b);
  });
  I18n.apply(list);
}
function fmt(ms){if(ms==null)return '-';var s=Math.round(ms/1000);return Math.floor(s/60)+':'+('0'+s%60).slice(-2);}
function buildStats(){
  var rows=[['klondike-d1','game.klondike',' / 1'],['klondike-d3','game.klondike',' / 3'],['spider-1','game.spider',' / 1'],
            ['spider-2','game.spider',' / 2'],['spider-4','game.spider',' / 4'],['freecell','game.freecell','']];
  var h='<div class="st-row st-head"><span></span><span data-i18n="st.won"></span><span data-i18n="st.time"></span><span data-i18n="st.best"></span></div>';
  rows.forEach(function(r){
    var s=DB.stats[r[0]]||{played:0,won:0};
    var cur=r[0]===variant(S.game,optOf(S.game));
    var best=r[0]==='freecell'?(s.bestMoves!=null?s.bestMoves:'-'):(s.bestScore!=null?s.bestScore:'-');
    h+='<div class="st-row'+(cur?' cur':'')+'"><span><span data-i18n="'+r[1]+'"></span>'+r[2]+'</span>'+
       '<b>'+s.won+'/'+s.played+'</b><b>'+fmt(s.bestTime)+'</b><b>'+best+'</b></div>';
  });
  $('stats').innerHTML=h;
  I18n.apply($('stats'));
}
function preview(){
  var p=$('preview');
  p.className='preview tbl-'+S.table;
  p.innerHTML='<div class="pv-card up">'+Cards.face({s:0,r:1})+'</div>'+
              '<div class="pv-card up">'+Cards.face({s:1,r:13})+'</div>'+
              '<div class="pv-card up">'+Cards.face({s:2,r:7})+'</div>'+
              '<div class="pv-card">'+Cards.back(S.back)+'</div>';
}
function paintMenu(){
  buildGames();buildStats();preview();
  ['klondike','spider','freecell'].forEach(function(g){$('opt-'+g).classList.toggle('hidden',S.game!==g);});
  [['tap',S.tap],['draw',String(S.draw)],['redeals',S.redeals],['suits',String(S.suits)],['auto',S.auto?'on':'off'],['table',S.table],['back',S.back]].forEach(function(x){
    document.querySelectorAll('#seg-'+x[0]+' .seg-btn').forEach(function(b){b.classList.toggle('sel',b.dataset.v===x[1]);});
  });
  $('opt-auto').classList.toggle('hidden',S.game==='spider');
  $('tap-note').textContent=t('tapd.'+S.tap);
  var sv=DB.save;
  $('btn-continue').classList.toggle('hidden',!(Gm.st&&!Gm.over)&&!(sv&&sv.st));
  document.body.className=document.body.className.replace(/\btbl-\w+/g,'')+' tbl-'+S.table;
}

function showScreen(name){
  document.body.classList.toggle('screen-menu',name==='menu');
  document.body.classList.toggle('screen-game',name==='game');
  if(name==='menu'){stopClock();paintMenu();}
  Sound.music(name==='menu'?'menu':'game');
  window.scrollTo(0,0);
  if(name==='game'){layout();render(false);if(Gm.st&&!Gm.over&&Gm.st.moves>0)startClock();}
}

/* ════════ ПАРТИЯ ════════ */
function newGame(seed){
  var game=S.game,opt=optOf(game);
  if(seed==null)seed=1+Math.floor(Math.random()*999999);
  Gm.st=R.create(game,opt,seed);
  Gm.undo=[];Gm.elapsed=0;Gm.running=false;Gm.over=false;Gm.busy=false;
  Gm.key=variant(game,opt);
  sel=null;
  stat(Gm.key).played++;
  A.trackPlay();
  buildCards();
  hide('win-modal');hide('stuck');
  showScreen('game');
  dealAnimation();
  paintHud();
  persist();
  Sound.sfx('deal');
}
function restart(){if(!Gm.st)return;var seed=Gm.st.seed;stat(Gm.key).played--;newGame(seed);}
function resume(){
  if(Gm.st&&!Gm.over){showScreen('game');return;}
  var sv=DB.save;if(!sv||!sv.st)return;
  Gm.st=sv.st;Gm.undo=sv.undo||[];Gm.elapsed=sv.elapsed||0;Gm.over=false;Gm.running=false;Gm.busy=false;
  Gm.key=variant(Gm.st.game,Gm.st.opt);
  buildCards();
  showScreen('game');
  paintHud();checkState();
}
function persist(){
  DB.save=Gm.over?null:{st:Gm.st,undo:Gm.undo.slice(-UNDO_SAVE),elapsed:elapsed()};
  save();
}

/* ── ход ── */
function snapshot(){return JSON.stringify(Gm.st);}
function pushUndo(){Gm.undo.push(snapshot());if(Gm.undo.length>UNDO_MAX)Gm.undo.shift();}
function act(fn){
  if(Gm.over||Gm.busy)return false;
  var before=snapshot();
  if(!fn())return false;
  Gm.undo.push(before);if(Gm.undo.length>UNDO_MAX)Gm.undo.shift();
  startClock();
  hide('stuck');clearHint();
  return true;
}
function doMove(from,idx,to){
  var ok=act(function(){
    if(!R.canMove(Gm.st,from,idx,to))return false;
    var flipBefore=from[0]==='t'&&Gm.st.piles[from][idx-1]&&!Gm.st.piles[from][idx-1].up;
    var runs=Gm.st.runs;
    R.move(Gm.st,from,idx,to);
    if(S.auto&&Gm.st.game!=='spider')R.autoFoundation(Gm.st);
    Sound.sfx(to[0]==='f'?'found':'card');
    if(flipBefore)setTimeout(function(){Sound.sfx('flip');},120);
    if(Gm.st.runs>runs)setTimeout(function(){Sound.sfx('found');},200);
    return true;
  });
  if(ok)after();
  return ok;
}
function stockClick(){
  var ok=act(function(){
    if(!Rl().stock(Gm.st))return false;
    Gm.st.moves++;
    if(S.auto&&Gm.st.game==='klondike')R.autoFoundation(Gm.st);
    Sound.sfx(Gm.st.game==='spider'?'deal':'card');
    return true;
  });
  if(ok)after();
  else if(Gm.st&&Gm.st.game==='spider'&&Rl().stockBlocked&&Rl().stockBlocked(Gm.st)){msgFlash('msg.spiderEmpty');Sound.sfx('nope');}
}
function after(){clearSel();render(true);paintHud();persist();checkState();}
function undo(){
  if(Gm.busy||!Gm.undo.length||Gm.over)return;
  Gm.st=JSON.parse(Gm.undo.pop());
  hide('stuck');clearHint();clearSel();
  render(true);paintHud();persist();Sound.sfx('card');
}

function checkState(){
  var r=Rl(),st=Gm.st;
  if(r.won(st)){win();return;}
  $('btn-finish').classList.toggle('hidden',!R.canFinish(st));
  if(R.canFinish(st)&&st.game==='klondike'&&!st.piles.stock.length&&!st.piles.waste.length){finish();return;}
  var mv=R.moves(st);
  if(r.stuck(st,mv))show('stuck');else hide('stuck');
}

/* доиграть: карты сами уходят на базу по одной */
function finish(){
  if(Gm.busy||Gm.over)return;
  pushUndo();
  Gm.busy=true;hide('btn-finish');
  (function tick(){
    var m=R.finishStep(Gm.st);
    if(m){render(true);paintHud();Sound.sfx('card');}
    if(Rl().won(Gm.st)||!m){Gm.busy=false;persist();checkState();return;}
    setTimeout(tick,85);
  })();
}

/* подсказка: подсветить карту и место, куда её положить */
var hintTimer=null;
function clearHint(){clearTimeout(hintTimer);document.querySelectorAll('.hint').forEach(function(e){e.classList.remove('hint');});}
function hint(){
  if(Gm.over||Gm.busy)return;
  clearHint();
  var mv=R.moves(Gm.st);
  if(!mv.length){show('stuck');Sound.sfx('nope');return;}
  var m=mv[0];
  if(m.from==='stock'){slotEl('stock').classList.add('hint');topCardEl('stock')&&topCardEl('stock').classList.add('hint');}
  else{
    Gm.st.piles[m.from].slice(m.idx).forEach(function(c){cardEl[c.id].classList.add('hint');});
    var tc=topCardEl(m.to);(tc||slotEl(m.to)).classList.add('hint');
  }
  Sound.sfx('select');
  hintTimer=setTimeout(clearHint,1600);
}

/* ── победа ── */
function win(){
  if(Gm.over)return;
  Gm.over=true;stopClock();
  var s=stat(Gm.key),time=elapsed(),st=Gm.st,rec=[];
  s.won++;
  if(s.bestTime==null||time<s.bestTime){s.bestTime=time;rec.push('st.time');}
  if(st.game==='freecell'){if(s.bestMoves==null||st.moves<s.bestMoves){s.bestMoves=st.moves;rec.push('hud.moves');}}
  else if(s.bestScore==null||st.score>s.bestScore){s.bestScore=st.score;rec.push('hud.score');}
  if(st.game==='klondike')A.setHi('soli',st.score);
  DB.save=null;save();
  Sound.sfx('win');Sound.duck(0.3,2500);
  cascade();
  function row(k,v,r){return '<div class="ov-row'+(r?' rec':'')+'"><span>'+t(k)+'</span><b>'+v+'</b></div>';}
  $('win-rows').innerHTML=
    (st.game!=='freecell'?row('hud.score',st.score,rec.indexOf('hud.score')>=0):'')+
    row('hud.moves',st.moves,rec.indexOf('hud.moves')>=0)+
    row('hud.time',fmt(time),rec.indexOf('st.time')>=0)+
    row('win.deal','#'+st.seed);
  $('win-rec').classList.toggle('hidden',!rec.length);
  setTimeout(function(){show('win-modal');},1400);
}
/* классическая победная анимация: карты с базы по очереди отскакивают по столу */
function cascade(){
  var fs=Rl().founds(),order=[];
  for(var r=13;r>=1;r--)fs.forEach(function(f){var p=Gm.st.piles[f];p.forEach(function(c){if(c.r===r)order.push(c);});});
  if(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  var H=$('table').clientHeight,W=$('table').clientWidth,i=0;
  function launch(){
    if(i>=order.length||!Gm.over)return;
    var el=cardEl[order[i++].id];if(!el)return launch();
    var x=parseFloat(el.dataset.x),y=parseFloat(el.dataset.y),vx=(Math.random()<.5?-1:1)*(2+Math.random()*4),vy=-Math.random()*6;
    el.style.transition='none';el.style.zIndex=900+i;
    (function fly(){
      if(!Gm.over||!document.body.classList.contains('screen-game'))return;
      vy+=0.55;x+=vx;y+=vy;
      if(y>H-L.ch){y=H-L.ch;vy*=-0.72;}
      el.style.transform='translate('+x+'px,'+y+'px)';
      if(x>-L.cw&&x<W)requestAnimationFrame(fly);
    })();
    setTimeout(launch,110);
  }
  launch();
}

/* ── часы ── */
var clockTimer=null;
function elapsed(){return Gm.elapsed+(Gm.running?Date.now()-Gm.since:0);}
function startClock(){
  if(Gm.running||Gm.over||!Gm.st)return;
  Gm.running=true;Gm.since=Date.now();
  clockTimer=setInterval(paintTime,500);
}
function stopClock(){
  if(!Gm.running)return;
  Gm.elapsed=elapsed();Gm.running=false;clearInterval(clockTimer);
  if(Gm.st&&!Gm.over)persist();
}
function paintTime(){$('hud-time').textContent=fmt(elapsed());}

function paintHud(){
  var st=Gm.st;if(!st)return;
  $('hud-game').textContent=t('game.'+st.game)+(st.game==='spider'?' '+t('opt.suitsN',{n:st.opt.suits}):st.game==='klondike'?' '+t('opt.drawN',{n:st.opt.draw}):'');
  $('hud-deal').textContent='#'+st.seed;
  $('hud-score').textContent=st.score;
  $('hud-score-c').classList.toggle('hidden',st.game==='freecell');
  $('hud-moves').textContent=st.moves;
  paintTime();
  $('btn-undo').disabled=!Gm.undo.length||Gm.over;
}
var flashTimer=null;
function msgFlash(key){var m=$('flash');m.textContent=t(key);m.classList.remove('hidden');clearTimeout(flashTimer);flashTimer=setTimeout(function(){m.classList.add('hidden');},2200);}

/* ════════ СТОЛ: раскладка и отрисовка ════════ */
var cardEl={},slots={},L={cw:80,ch:112,gap:8,pos:{},piles:{}},loc={};

function buildCards(){
  var tb=$('table');tb.innerHTML='';cardEl={};slots={};
  var r=Rl();
  R.allPiles(r).forEach(function(pid){
    var s=document.createElement('div');s.className='slot slot-'+pid[0]+(pid==='stock'?' slot-stock':'');s.dataset.pile=pid;
    if(pid[0]==='f')s.innerHTML=Gm.st.game==='spider'?'<i>K</i>':'<i>A</i>';
    else if(pid[0]==='t'&&Gm.st.game==='klondike')s.innerHTML='<i>K</i>';
    else if(pid==='stock')s.innerHTML='<i class="re">&#8635;</i>';
    tb.appendChild(s);slots[pid]=s;
  });
  R.allPiles(r).forEach(function(pid){
    Gm.st.piles[pid].forEach(function(c){
      var e=document.createElement('div');e.className='card';e.dataset.id=c.id;
      tb.appendChild(e);cardEl[c.id]=e;
    });
  });
  var f=document.createElement('div');f.className='flash hidden';f.id='flash';tb.appendChild(f);
  layout();
}
function slotEl(pid){return slots[pid];}
function topCardEl(pid){var p=Gm.st.piles[pid];return p&&p.length?cardEl[p[p.length-1].id]:null;}

/* размер карт под окно: по ширине помещаются все столбцы, по высоте верхний ряд и хотя бы полтора ряда стола */
function layout(){
  var tb=$('table');if(!tb||!Gm.st||!document.body.classList.contains('screen-game'))return;
  var r=Rl(),cols=r.cols;
  var W=tb.parentNode.clientWidth;
  var top=tb.getBoundingClientRect().top+window.scrollY;
  var H=Math.max(260,window.innerHeight-top-6);
  var cw=W/(cols+0.12*(cols+1));
  cw=Math.min(cw,H/(1.4*2.7+0.5),118);
  cw=Math.max(30,Math.floor(cw));
  var ch=Math.round(cw*1.4),gap=Math.max(3,Math.round(cw*0.12));
  var width=cols*cw+(cols+1)*gap,ox=Math.max(0,Math.floor((W-width)/2));
  L.cw=cw;L.ch=ch;L.gap=gap;L.ox=ox;L.H=H;
  tb.style.setProperty('--cw',cw+'px');tb.style.setProperty('--ch',ch+'px');
  L.colX=function(c){return ox+gap+c*(cw+gap);};
  L.topY=gap;L.tabY=gap*2+ch+Math.round(gap*0.6);
  L.tops=r.tops();L.tabs=r.tabs();
}

function place(){
  var st=Gm.st,r=Rl(),pos={},cw=L.cw,ch=L.ch,z=1,bottom=L.tabY+ch;
  loc={};
  /* верхний ряд */
  L.tops.forEach(function(tp){
    var p=st.piles[tp.id],x=L.colX(tp.col),y=L.topY;
    L.piles[tp.id]={x:x,y:y,w:cw,h:ch};
    var n=p.length;
    p.forEach(function(c,i){
      var dx=0;
      if(tp.id==='waste'){
        var shown=Math.min(st.opt.draw,3),from=n-shown;            // видны последние 1 или 3 карты веером
        if(i>=from)dx=Math.round((i-from)*cw*0.24);
      }else if(tp.id==='stock'&&st.game==='spider'){
        dx=Math.floor(i/10)*Math.round(cw*0.14);                    // каждая будущая сдача видна отдельной картой
      }
      pos[c.id]={x:x+dx,y:y,z:z++,up:c.up};
      loc[c.id]={pile:tp.id,idx:i};
    });
    if(tp.id==='waste'&&n)L.piles.waste.w=cw+Math.round((Math.min(st.opt.draw,3,n)-1)*cw*0.24);
  });
  /* стол: веер вниз, сжимается, если столбец длинный */
  var avail=L.H-L.tabY-ch-L.gap;
  L.tabs.forEach(function(pid,ci){
    var p=st.piles[pid],x=L.colX(ci),nd=0,nu=0,i;
    for(i=0;i<p.length-1;i++){if(p[i].up)nu++;else nd++;}
    var d=ch*0.13,u=ch*(st.game==='spider'?0.24:0.27);
    var need=nd*d+nu*u;
    if(need>avail&&need>0){var k=Math.max(0.42,avail/need);d*=k;u*=k;}
    var y=L.tabY;
    p.forEach(function(c,j){
      pos[c.id]={x:x,y:Math.round(y),z:z++,up:c.up};
      loc[c.id]={pile:pid,idx:j};
      y+=c.up?u:d;
    });
    var last=p.length?pos[p[p.length-1].id].y:L.tabY;
    L.piles[pid]={x:x,y:L.tabY,w:cw,h:Math.max(ch,last-L.tabY+ch)};
    bottom=Math.max(bottom,last+ch);
  });
  L.pos=pos;
  $('table').style.height=Math.max(L.H,bottom+L.gap)+'px';
  return pos;
}

function render(anim){
  if(!Gm.st)return;
  layout();
  var pos=place(),tb=$('table');
  tb.classList.toggle('no-anim',!anim);
  R.allPiles(Rl()).forEach(function(pid){
    var s=slots[pid],b=L.piles[pid];if(!s||!b)return;
    s.style.transform='translate('+(pid==='waste'?L.colX(1):b.x)+'px,'+b.y+'px)';
    if(pid==='stock')s.classList.toggle('can',Rl().canStock(Gm.st));
  });
  for(var id in cardEl){
    var e=cardEl[id],p=pos[id];
    if(!p){e.style.display='none';continue;}
    e.style.display='';
    var face=p.up?'u':'d'+S.back;
    if(e.dataset.face!==face){
      var c=findCard(+id);
      e.innerHTML=p.up?Cards.face(c):Cards.back(S.back);
      e.dataset.face=face;
      e.classList.toggle('up',p.up);
    }
    e.style.zIndex=p.z;
    e.dataset.x=p.x;e.dataset.y=p.y;
    e.style.transform='translate('+p.x+'px,'+p.y+'px)';
  }
  if(!anim){void tb.offsetWidth;tb.classList.remove('no-anim');}
}
function findCard(id){
  var ps=Gm.st.piles;
  for(var k in ps){var p=ps[k];for(var i=0;i<p.length;i++)if(p[i].id===id)return p[i];}
  return null;
}
/* раздача: карты вылетают из колоды по очереди */
function dealAnimation(){
  layout();var pos=place(),tb=$('table');
  var sx=L.colX(0),sy=L.topY,i=0;
  tb.classList.add('no-anim');
  for(var id in cardEl){cardEl[id].style.transform='translate('+sx+'px,'+sy+'px)';cardEl[id].innerHTML=Cards.back(S.back);cardEl[id].dataset.face='d'+S.back;cardEl[id].classList.remove('up');}
  void tb.offsetWidth;tb.classList.remove('no-anim');
  var order=[];L.tabs.forEach(function(pid){Gm.st.piles[pid].forEach(function(c,j){order.push({c:c,j:j});});});
  order.sort(function(a,b){return a.j-b.j;});
  Gm.busy=true;
  order.forEach(function(o,k){
    setTimeout(function(){
      var e=cardEl[o.c.id],p=pos[o.c.id];
      e.style.transitionDelay='0s';
      e.style.zIndex=p.z;
      e.style.transform='translate('+p.x+'px,'+p.y+'px)';
    },k*(order.length>60?14:24));
  });
  setTimeout(function(){Gm.busy=false;render(true);},order.length*(order.length>60?14:24)+260);
}

/* ════════ УПРАВЛЕНИЕ: касание и перетаскивание ════════ */
var drag=null;
function pointAt(e){var b=$('table').getBoundingClientRect();return {x:e.clientX-b.left,y:e.clientY-b.top};}
function onDown(e){
  if(e.button!==undefined&&e.button!==0)return;
  if(!Gm.st||Gm.over||Gm.busy)return;
  var el=e.target.closest?e.target.closest('.card,.slot'):null;if(!el)return;
  var pt=pointAt(e);
  if(el.classList.contains('slot')){
    var sp=el.dataset.pile;
    e.preventDefault();
    if(sel&&sel.targets.indexOf(sp)>=0){putSelected(sp);return;}
    clearSel();
    if(sp==='stock')stockClick();
    return;
  }
  var id=+el.dataset.id,lc=loc[id];if(!lc)return;
  e.preventDefault();
  if(lc.pile==='stock'){clearSel();stockClick();return;}
  /* выбрана карта, нажали на стопку, куда её можно положить: кладём */
  if(sel&&lc.pile!==sel.pile&&sel.targets.indexOf(lc.pile)>=0){putSelected(lc.pile);return;}
  var r=Rl();
  if(!r.pickable(Gm.st,lc.pile,lc.idx)){clearSel();nope(el);return;}
  var cards=Gm.st.piles[lc.pile].slice(lc.idx);
  drag={pile:lc.pile,idx:lc.idx,ids:cards.map(function(c){return c.id;}),sx:pt.x,sy:pt.y,moved:false,
        ox:pt.x-L.pos[cards[0].id].x,oy:pt.y-L.pos[cards[0].id].y,pid:e.pointerId};
  if(window.PointerEvent&&$('table').setPointerCapture)try{$('table').setPointerCapture(e.pointerId);}catch(err){}
}
function onMove(e){
  if(!drag)return;
  var pt=pointAt(e);
  if(!drag.moved){
    if(Math.abs(pt.x-drag.sx)+Math.abs(pt.y-drag.sy)<7)return;
    drag.moved=true;clearHint();clearSel();
    drag.ids.forEach(function(id,i){var el=cardEl[id];el.classList.add('dragging');el.style.zIndex=1000+i;});
  }
  if(e.cancelable)e.preventDefault();
  var x0=pt.x-drag.ox,y0=pt.y-drag.oy;
  drag.ids.forEach(function(id){
    var p=L.pos[id],first=L.pos[drag.ids[0]];
    cardEl[id].style.transform='translate('+(x0+(p.x-first.x))+'px,'+(y0+(p.y-first.y))+'px)';
  });
  drag.x=x0;drag.y=y0;
}
function onUp(e){
  if(!drag)return;
  var d=drag;drag=null;
  d.ids.forEach(function(id){cardEl[id].classList.remove('dragging');});
  if(!d.moved){tap(d.pile,d.idx);return;}
  var to=dropTarget(d);
  if(!to||!doMove(d.pile,d.idx,to)){render(true);if(to)Sound.sfx('nope');}
}
function onCancel(){if(!drag)return;drag=null;render(true);}
/* куда бросили: стопка, которую перекрывает карта больше всего, и которая её принимает */
function dropTarget(d){
  var cx=d.x+L.cw/2,cy=d.y+L.ch/2,best=null,bestD=1e9,cards=Gm.st.piles[d.pile].slice(d.idx),r=Rl();
  R.allPiles(r).forEach(function(pid){
    if(pid===d.pile||pid==='stock'||pid==='waste')return;
    var b=L.piles[pid];if(!b)return;
    var ty=pid[0]==='t'?Math.min(b.y+b.h-L.ch/2,Math.max(b.y+L.ch/2,cy)):b.y+L.ch/2;
    var dx=cx-(b.x+L.cw/2),dy=cy-ty,dist=Math.sqrt(dx*dx+dy*dy);
    if(dist<L.cw*1.1&&dist<bestD&&r.accepts(Gm.st,cards,d.pile,pid)){bestD=dist;best=pid;}
  });
  return best;
}
/* касание: карта сама идёт в лучшее место */
function tap(pile,idx){
  if(S.tap==='select'){selectTap(pile,idx);return;}
  var to=R.best(Gm.st,pile,idx);
  if(to)doMove(pile,idx,to);
  else nope(cardEl[Gm.st.piles[pile][idx].id]);
}

/* ── режим «выбор»: нажал на карту, она подсвечена вместе с местами, куда её можно положить;
      нажал на место, карта переезжает. Куда класть, решает игрок. ── */
var sel=null;   // {pile, idx, targets:[стопки]}
function selectTap(pile,idx){
  if(sel&&sel.pile===pile&&sel.idx===idx){clearSel();Sound.sfx('select');return;}   // повторное нажатие снимает выбор
  clearSel();clearHint();
  var st=Gm.st,r=Rl(),cards=st.piles[pile].slice(idx),targets=[];
  R.allPiles(r).forEach(function(to){
    if(to===pile||to==='stock'||to==='waste')return;
    if(r.accepts(st,cards,pile,to))targets.push(to);
  });
  sel={pile:pile,idx:idx,targets:targets};
  cards.forEach(function(c){cardEl[c.id].classList.add('sel');});
  if(!targets.length){nope(cardEl[cards[0].id]);msgFlash('msg.noTarget');}
  else Sound.sfx('select');
  paintTargets();
}
function paintTargets(){
  document.querySelectorAll('.tgt').forEach(function(e){e.classList.remove('tgt');});
  if(!sel)return;
  sel.targets.forEach(function(to){var tc=topCardEl(to);(tc||slotEl(to)).classList.add('tgt');});
}
function putSelected(to){
  var s=sel;clearSel();
  if(!doMove(s.pile,s.idx,to))Sound.sfx('nope');
}
function clearSel(){
  if(!sel)return;
  sel=null;
  document.querySelectorAll('.card.sel,.tgt').forEach(function(e){e.classList.remove('sel');e.classList.remove('tgt');});
}
function nope(el){
  if(!el)return;
  el.classList.remove('shake');void el.offsetWidth;el.classList.add('shake');
  Sound.sfx('nope');
}

function bindTable(){
  var tb=$('table');
  if(window.PointerEvent){
    tb.addEventListener('pointerdown',onDown);
    tb.addEventListener('pointermove',onMove);
    tb.addEventListener('pointerup',onUp);
    tb.addEventListener('pointercancel',onCancel);
  }else{
    /* старые браузеры: мышь и касания, мышиные события после касания пропускаем */
    var lastTouch=0;
    function conv(fn){return function(e){var p=e.changedTouches?e.changedTouches[0]:e;if(!p)return;
      fn({clientX:p.clientX,clientY:p.clientY,button:0,target:e.target,cancelable:e.cancelable,preventDefault:function(){if(e.cancelable)e.preventDefault();}});};}
    function mouse(fn){return function(e){if(Date.now()-lastTouch>800)fn(e);};}
    function touch(fn){return function(e){lastTouch=Date.now();fn(e);};}
    tb.addEventListener('mousedown',mouse(conv(onDown)));
    window.addEventListener('mousemove',mouse(conv(onMove)));
    window.addEventListener('mouseup',mouse(conv(onUp)));
    tb.addEventListener('touchstart',touch(conv(onDown)));
    tb.addEventListener('touchmove',touch(function(e){if(drag&&e.cancelable)e.preventDefault();conv(onMove)(e);}));
    tb.addEventListener('touchend',touch(function(e){if(e.cancelable)e.preventDefault();conv(onUp)(e);}));
  }
  tb.addEventListener('contextmenu',function(e){e.preventDefault();});
}

document.addEventListener('keydown',function(e){
  if(!document.body.classList.contains('screen-game'))return;
  if((e.ctrlKey||e.metaKey)&&(e.key==='z'||e.key==='Z'||e.key==='я'||e.key==='Я')){e.preventDefault();undo();return;}
  if(e.key==='u'||e.key==='U'||e.key==='Backspace'){e.preventDefault();undo();}
  else if(e.key==='h'||e.key==='H'||e.key==='р'||e.key==='Р')hint();
  else if(e.key===' '||e.key==='d'||e.key==='D'){e.preventDefault();stockClick();}
});
document.addEventListener('visibilitychange',function(){if(document.hidden)stopClock();else if(document.body.classList.contains('screen-game')&&Gm.st&&Gm.st.moves>0)startClock();});
window.addEventListener('resize',function(){setTimeout(function(){if(Gm.st&&!Gm.over)render(false);},60);});
window.addEventListener('pagehide',function(){if(Gm.st&&!Gm.over)persist();});

function onLang(){paintMenu();paintHud();}

/* ── запуск ── */
function bindSeg(id,fn){
  document.querySelectorAll('#seg-'+id+' .seg-btn').forEach(function(b){
    b.addEventListener('click',function(){fn(b.dataset.v);save();paintMenu();Sound.sfx('select');
      if(Gm.st&&(id==='back'||id==='table'))rebuildFaces();});
  });
}
function rebuildFaces(){for(var id in cardEl)cardEl[id].dataset.face='';}
function boot(){
  A.topbar('sol.title');
  Cards.defs();
  I18n.apply();I18n.onChange(onLang);
  bindSeg('draw',function(v){S.draw=+v;});
  bindSeg('redeals',function(v){S.redeals=v;});
  bindSeg('suits',function(v){S.suits=+v;});
  bindSeg('auto',function(v){S.auto=v==='on';});
  bindSeg('tap',function(v){S.tap=v;});
  bindSeg('table',function(v){S.table=v;});
  bindSeg('back',function(v){S.back=v;});
  bindTable();
  $('btn-play').addEventListener('click',function(){newGame();});
  $('btn-continue').addEventListener('click',resume);
  $('btn-menu').addEventListener('click',function(){showScreen('menu');});
  $('btn-undo').addEventListener('click',undo);
  $('btn-hint').addEventListener('click',hint);
  $('btn-new').addEventListener('click',function(){newGame();});
  $('btn-restart').addEventListener('click',restart);
  $('btn-finish').addEventListener('click',finish);
  $('stuck-undo').addEventListener('click',undo);
  $('stuck-new').addEventListener('click',function(){newGame();});
  $('win-new').addEventListener('click',function(){newGame();});
  $('win-menu').addEventListener('click',function(){hide('win-modal');showScreen('menu');});
  paintMenu();
  showScreen('menu');
}

window.AceonSol={gm:Gm,settings:S,db:DB,newGame:newGame,move:doMove,stock:stockClick,undo:undo,hint:hint,
  finish:finish,render:render,loc:function(){return loc;},layout:function(){return L;},cardEl:function(){return cardEl;}};
boot();
})();
