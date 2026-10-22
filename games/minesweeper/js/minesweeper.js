/* A.C.EON MINESWEEPER: меню, поле, управление мышью и касанием, подсказки, сапёр-помощник.
   Правила и решатель в rules.js, тексты в lang.js. */
(function(){
'use strict';

var t=I18n.t,A=window.Arcade,R=window.MsRules;
var $=function(id){return document.getElementById(id);};
function show(id){$(id).classList.remove('hidden');}
function hide(id){$(id).classList.add('hidden');}

var DIFFS={beg:{r:9,c:9,m:10},int:{r:16,c:16,m:40},exp:{r:16,c:30,m:99}};
var MODES=['classic','noguess','lives'];
var LIVES=3;

/* ── сохранения ── */
Store.define('minesweeper',{
  version:1,
  defaults:{settings:{mode:'classic',diff:'beg',custom:{r:12,c:12,m:24},marks:false,bot:true,theme:'neon',zoom:1},stats:{},save:null},
  /* в старом лаунчере рекорд писался отрицательным числом секунд (и из-за ошибки почти никогда не сохранялся) */
  legacy:function(raw){
    var v=parseInt(raw('aceon_hi_mine'),10);
    return v<0?{stats:{'classic-beg':{played:0,won:0,best:-v*1000,streak:0,bestStreak:0}}}:null;
  }
});
var DB=Store.get('minesweeper'),S=DB.settings;
if(MODES.indexOf(S.mode)<0)S.mode='classic';
if(!DIFFS[S.diff]&&S.diff!=='custom')S.diff='beg';
if(['neon','classic','grass'].indexOf(S.theme)<0)S.theme='neon';
if(!(S.zoom>0.5&&S.zoom<3))S.zoom=1;
if(!S.custom||!S.custom.r)S.custom={r:12,c:12,m:24};
function save(){Store.save('minesweeper');}
function stat(k){
  if(!DB.stats[k])DB.stats[k]={played:0,won:0,best:0,streak:0,bestStreak:0};
  return DB.stats[k];
}
function statKey(g){return g.mode+'-'+g.diff;}
function maxMines(r,c){return Math.max(1,Math.floor(r*c*0.8));}
function dims(diff){
  if(diff==='custom'){
    var c=S.custom,r=Math.max(5,Math.min(30,c.r|0)),cc=Math.max(5,Math.min(40,c.c|0));
    return {r:r,c:cc,m:Math.max(1,Math.min(maxMines(r,cc),c.m|0))};
  }
  return DIFFS[diff];
}

/* ── звуки ── */
Sound.define('dig',function(tm,tone,noise){noise(tm,0.04,0.35,2600);tone(tm,320,0.05,'square',0.03,200);});
Sound.define('wave',function(tm,tone,noise){noise(tm,0.18,0.25,3200);tone(tm,520,0.16,'sine',0.05,900);});
Sound.define('flag',function(tm,tone){tone(tm,880,0.05,'square',0.04);tone(tm+0.05,1320,0.06,'square',0.035);});
Sound.define('unflag',function(tm,tone){tone(tm,990,0.05,'square',0.035);tone(tm+0.05,660,0.06,'square',0.03);});
Sound.define('boom',function(tm,tone,noise){noise(tm,0.6,1,300);noise(tm,0.25,0.6,1200);tone(tm,80,0.5,'sawtooth',0.15,30);});
Sound.define('hurt',function(tm,tone,noise){noise(tm,0.3,0.7,500);tone(tm,160,0.25,'square',0.08,60);});
Sound.define('hint',function(tm,tone){[660,880,1100].forEach(function(f,i){tone(tm+i*0.07,f,0.1,'triangle',0.06);});});
Sound.define('nope',function(tm,tone){tone(tm,170,0.08,'square',0.04);});

/* ── партия ──
   G: {mode, diff, R, C, M, g (поле rules.js), time (мс), started, over (''|'win'|'lose'), lives, hints, flagMode} */
var G=null;

/* ════════ МЕНЮ ════════ */
function buildModes(){
  var list=$('mode-list');list.innerHTML='';
  MODES.forEach(function(m){
    var b=document.createElement('button');
    b.type='button';b.className='m-card-btn'+(S.mode===m?' sel':'');
    b.innerHTML='<span class="m-ico m-ico-'+m+'"></span><span class="m-txt"><span class="m-name" data-i18n="mode.'+m+'"></span><span class="m-desc" data-i18n="desc.'+m+'"></span></span>';
    b.addEventListener('click',function(){S.mode=m;save();paintMenu();Sound.sfx('select');});
    list.appendChild(b);
  });
  I18n.apply(list);
}
function fmtTime(ms){
  if(!ms)return '-';
  var s=ms/1000;
  if(s<60)return s.toFixed(1);
  var m=Math.floor(s/60),r=Math.floor(s%60);
  return m+':'+(r<10?'0':'')+r;
}
function buildStats(){
  var h='<div class="st-row st-head"><span></span><span data-i18n="st.won"></span><span data-i18n="st.best"></span><span data-i18n="st.streak"></span></div>';
  ['beg','int','exp','custom'].forEach(function(d){
    var s=DB.stats[S.mode+'-'+d]||{played:0,won:0};
    var cur=d===S.diff;
    h+='<div class="st-row'+(cur?' cur':'')+'"><span data-i18n="diff.'+d+'"></span>'+
       '<b>'+s.won+'/'+s.played+'</b><b>'+(d==='custom'?'-':fmtTime(s.best))+'</b><b>'+(s.bestStreak||0)+'</b></div>';
  });
  $('stats').innerHTML=h;I18n.apply($('stats'));
}
function paintCustom(){
  var c=dims('custom');
  $('c-rows').value=c.r;$('c-cols').value=c.c;
  $('c-mines').max=maxMines(c.r,c.c);$('c-mines').value=c.m;
  $('c-rows-v').textContent=c.r;$('c-cols-v').textContent=c.c;$('c-mines-v').textContent=c.m;
  ['c-rows','c-cols','c-mines'].forEach(function(id){
    var el=$(id),p=(el.value-el.min)/(el.max-el.min)*100;
    el.style.setProperty('--fill',p+'%');
  });
}
function paintMenu(){
  buildModes();buildStats();
  [['diff',S.diff],['marks',S.marks?'yes':'no'],['bot',S.bot?'yes':'no']].forEach(function(x){
    var list=document.querySelectorAll('#seg-'+x[0]+' .seg-btn');
    for(var i=0;i<list.length;i++)list[i].classList.toggle('sel',list[i].getAttribute('data-v')===x[1]);
  });
  var th=document.querySelectorAll('#themes .th-card');
  for(var i=0;i<th.length;i++)th[i].classList.toggle('sel',th[i].getAttribute('data-v')===S.theme);
  var d=dims(S.diff);
  $('diff-info').textContent=t('diff.info',{r:d.r,c:d.c,m:d.m});
  $('custom').classList.toggle('hidden',S.diff!=='custom');
  paintCustom();
  $('btn-continue').classList.toggle('hidden',!((G&&!G.over&&G.started)||(DB.save&&!DB.save.over)));
  applyTheme();
}
function applyTheme(){
  var b=document.body;
  ['neon','classic','grass'].forEach(function(x){b.classList.toggle('th-'+x,S.theme===x);});
}

function showScreen(name){
  document.body.classList.toggle('screen-menu',name==='menu');
  document.body.classList.toggle('screen-game',name==='game');
  if(name==='menu'){persist();paintMenu();}
  Sound.music(name==='menu'?'menu':'game');
  window.scrollTo(0,0);
  if(name==='game'){layout();requestAnimationFrame(layout);setTimeout(layout,250);}
}

/* ════════ ПАРТИЯ ════════ */
function newGame(){
  /* брошенная начатая партия обнуляет серию */
  if(G&&G.started&&!G.over){stat(statKey(G)).streak=0;}
  var d=dims(S.diff),r=d.r,c=d.c;
  /* вытянутое поле на вертикальном экране поворачиваем */
  if(c>r&&window.innerHeight>window.innerWidth){var x=r;r=c;c=x;}
  G={mode:S.mode,diff:S.diff,R:r,C:c,M:d.m,g:R.create(r,c,d.m),time:0,started:false,over:'',
     lives:S.mode==='lives'?LIVES:1,hints:0,flagMode:G?G.flagMode:false,genFail:false};
  G.M=G.g.M;
  hide('over-modal');
  buildField();
  status('msg.start');
  bot('idle');
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
  hide('over-modal');
  buildField();
  status(G.started?'':'msg.start');
  bot('idle');
  showScreen('game');
}

/* первое нажатие: расставить мины, в режиме без угадывания с поиском решаемого поля */
function firstDig(i,done){
  var go=function(){
    var ok=R.place(G.g,i,{noGuess:G.mode==='noguess',budget:2500});
    G.genFail=G.mode==='noguess'&&!ok;
    G.started=true;
    stat(statKey(G)).played++;
    A.trackPlay();
    tick.last=Date.now();
    done();
    if(G.genFail)status('msg.genFail');
  };
  if(G.mode==='noguess'&&G.R*G.C>200){status('msg.gen');setTimeout(go,30);}
  else go();
}

/* основное действие по клетке: открыть, открыть соседей числа или поставить флаг */
function primary(i){
  if(!G||G.over||busy)return;
  var g=G.g;
  lastCell=i;
  if(!g.open[i]&&G.flagMode){toggleMark(i);return;}
  if(!g.placed){
    busy=true;
    firstDig(i,function(){busy=false;open(i);bot('go');});
    return;
  }
  if(g.open[i]){
    if(g.mine[i]||!g.num[i])return;
    var r=R.chord(g,i);
    if(!r.opened.length&&!r.boom){pressFlash(i);return;}
    after(r.opened,r.booms);
    return;
  }
  if(g.mark[i]===1){nope();return;}
  open(i);
}
function open(i){
  var r=R.reveal(G.g,i);
  after(r.boom?[]:r.opened,r.boom?[i]:[]);
}
/* итог хода: волна открытия, взрывы, победа */
function after(opened,booms){
  if(opened.length){
    Sound.sfx(opened.length>6?'wave':'dig');
    animateOpen(opened);
  }
  if(booms.length){
    if(G.mode==='lives'&&G.lives>booms.length){
      G.lives-=booms.length;
      paint();blast(booms[0],false);
      Sound.sfx('hurt');shake();
      status('msg.life',{n:G.lives},'bad');
      bot('life');
      if(R.won(G.g)){win();return;}
      persist();return;
    }
    G.lives=0;
    lose(booms[0]);return;
  }
  if(R.won(G.g)){win();return;}
  if(opened.length){
    status('');
    bot(opened.length>1?'safe':'count');
  }
  paint();persist();
}
function toggleMark(i){
  var g=G.g;
  if(g.open[i])return;
  var m=g.mark[i];
  g.mark[i]=m===0?1:(m===1&&S.marks?2:0);
  Sound.sfx(g.mark[i]===1?'flag':'unflag');
  if(g.mark[i]===1)bot('flag');else if(m===1)bot('unflag');
  if(navigator.vibrate&&lastKind!=='mouse'){try{navigator.vibrate(15);}catch(e){}}
  paint();persist();
}

function win(){
  var g=G.g;
  G.over='win';
  for(var i=0;i<g.R*g.C;i++)if(g.mine[i]&&!g.open[i])g.mark[i]=1;
  var k=statKey(G),s=stat(k),rec=false;
  s.won++;s.streak=(s.streak||0)+1;
  if(s.streak>(s.bestStreak||0))s.bestStreak=s.streak;
  var clean=!G.hints&&G.diff!=='custom';
  if(clean&&(!s.best||G.time<s.best)){s.best=G.time;rec=true;}
  DB.save=null;save();
  paint();
  bot('win');
  status('over.win',null,'good');
  Sound.sfx('win');Sound.duck(0.3,2500);
  celebrate();
  overModal(true,rec);
}
function lose(at){
  var g=G.g;
  G.over='lose';
  var s=stat(statKey(G));s.streak=0;
  DB.save=null;save();
  paint();
  blast(at,true);
  Sound.sfx('boom');shake();
  bot('boom');
  status('over.lose',null,'bad');
  /* остальные мины проявляются по очереди от места взрыва */
  var ar=Math.floor(at/G.C),ac=at%G.C,list=[];
  for(var i=0;i<g.R*g.C;i++)if(g.mine[i]&&!g.open[i]&&g.mark[i]!==1)list.push(i);
  list.sort(function(a,b){return dist(a)-dist(b);});
  function dist(i){var r=Math.floor(i/G.C)-ar,c=i%G.C-ac;return r*r+c*c;}
  var step=Math.max(8,Math.min(60,900/Math.max(1,list.length)));
  list.forEach(function(i,k){
    setTimeout(function(){var el=cells[i];if(el){el.classList.add('m-show');}},200+k*step);
  });
  setTimeout(function(){Sound.sfx('lose');},300);
  overModal(false,false,200+list.length*step+500);
}
function overModal(won,rec,delay){
  function row(k,v){return '<div class="ov-row"><span>'+t(k)+'</span><b>'+v+'</b></div>';}
  var g=G.g,total=g.R*g.C-g.M,openSafe=total-R.safeLeft(g);
  $('over-title').textContent=t(won?'over.win':'over.lose');
  $('over-title').className='over-title '+(won?'win':'lose');
  var html=row('over.time',fmtTime(G.time)||'0')+row('over.opened',openSafe+' / '+total);
  if(G.mode==='lives')html+=row('over.lives',G.lives+' / '+LIVES);
  if(G.hints)html+=row('over.hints',G.hints);
  $('over-rows').innerHTML=html;
  $('over-rec').classList.toggle('hidden',!rec);
  $('over-note').classList.toggle('hidden',!(won&&G.hints&&G.diff!=='custom'));
  setTimeout(function(){if(G&&G.over)show('over-modal');},delay||900);
}

/* ── подсказка ── */
function hint(){
  if(!G||G.over||busy)return;
  var g=G.g;
  if(!g.placed){status('msg.hintFirst');return;}
  var r=R.solve(g),i,pick=-1,key='';
  for(i=0;i<r.safe.length;i++)if(g.mark[r.safe[i]]===1){pick=r.safe[i];key='msg.hintWrong';break;}
  if(pick<0&&r.safe.length){pick=nearest(r.safe);key='msg.hintSafe';}
  if(pick<0){
    var m=r.mines.filter(function(j){return g.mark[j]!==1;});
    if(m.length){pick=nearest(m);key='msg.hintMine';}
  }
  if(pick<0){status('msg.hintNone','', 'bad');nope();return;}
  G.hints++;
  status(key,null,'tip');
  Sound.sfx('hint');bot('hint');
  var el=cells[pick];
  el.classList.remove('hint-on');void el.offsetWidth;el.classList.add('hint-on');
  if(el.scrollIntoView){try{el.scrollIntoView({block:'nearest',inline:'nearest'});}catch(e){}}
  setTimeout(function(){el.classList.remove('hint-on');},2600);
  persist();
}
/* из нескольких вариантов берём ближайший к последнему нажатию */
var lastCell=-1;
function nearest(list){
  if(lastCell<0)return list[0];
  var lr=Math.floor(lastCell/G.C),lc=lastCell%G.C,best=list[0],bd=1e9;
  list.forEach(function(i){var r=Math.floor(i/G.C)-lr,c=i%G.C-lc,d=r*r+c*c;if(d<bd){bd=d;best=i;}});
  return best;
}

/* ════════ ПОЛЕ ════════ */
var cells=[],cache=[],busy=false;
function buildField(){
  var f=$('field'),h='';
  for(var r=0;r<G.R;r++)for(var c=0;c<G.C;c++){
    h+='<div class="c'+((r+c)%2?' alt':'')+'" data-i="'+(r*G.C+c)+'"></div>';
  }
  f.innerHTML=h;
  cells=[];cache=[];
  var list=f.children;
  for(var i=0;i<list.length;i++){cells.push(list[i]);cache.push('');}
  paint();
}
function cellClass(i){
  var g=G.g,cls='c'+((Math.floor(i/G.C)+i%G.C)%2?' alt':''),txt='';
  if(g.open[i]){
    if(g.mine[i])cls+=' o mine blown';
    else{cls+=' o';if(g.num[i]){cls+=' n'+g.num[i];txt=g.num[i];}}
  }else{
    if(g.mark[i]===1){
      cls+=' f';
      if(G.over==='lose'&&!g.mine[i])cls+=' wrong';
    }else if(g.mark[i]===2){cls+=' q';txt='?';}
    if(G.over==='lose'&&g.mine[i]&&g.mark[i]!==1)cls+=' mine';
  }
  return [cls,txt];
}
function paint(){
  if(!G)return;
  for(var i=0;i<cells.length;i++){
    var p=cellClass(i),key=p[0]+'|'+p[1];
    if(cache[i]===key)continue;
    var el=cells[i],keep=el.className.match(/ (rv|hint-on|m-show|boomfx)\b/g);
    cache[i]=key;
    el.className=p[0]+(keep?keep.join(''):'');
    el.textContent=p[1];
  }
  paintHud();
}
function paintHud(){
  var g=G.g;
  $('hud-mines').textContent=G.M-R.flags(g);
  $('hud-time').textContent=Math.floor(G.time/1000);
  $('hud-mode').textContent=t('mode.'+G.mode)+' / '+t('diff.'+G.diff);
  var lv=G.mode==='lives';
  $('hc-lives').classList.toggle('hidden',!lv);
  if(lv){
    var h='';for(var k=0;k<LIVES;k++)h+='<i class="hrt'+(k<G.lives?'':' lost')+'"></i>';
    $('hud-lives').innerHTML=h;
  }
  $('btn-flag').classList.toggle('sel',!!G.flagMode);
  $('btn-hint').disabled=!!G.over;
  $('btn-flag').disabled=!!G.over;
}
/* волна открытия: клетки проявляются по порядку обхода */
function animateOpen(list){
  paint();
  var n=list.length,step=n>120?2:n>40?5:12;
  list.forEach(function(i,k){
    var el=cells[i];if(!el)return;
    el.style.animationDelay=Math.min(k*step,420)+'ms';
    el.classList.add('rv');
  });
  setTimeout(function(){list.forEach(function(i){var el=cells[i];if(el){el.classList.remove('rv');el.style.animationDelay='';}});},1000);
}
function blast(i,big){
  var el=cells[i];if(!el)return;
  el.classList.add('boomfx');
  var fx=document.createElement('span');fx.className='blast'+(big?' big':'');
  el.appendChild(fx);
  setTimeout(function(){if(fx.parentNode)fx.parentNode.removeChild(fx);el.classList.remove('boomfx');},1100);
}
function celebrate(){
  var list=[];
  for(var i=0;i<cells.length;i++)if(G.g.mine[i])list.push(i);
  list.forEach(function(i,k){setTimeout(function(){var el=cells[i];if(el){el.classList.remove('m-win');void el.offsetWidth;el.classList.add('m-win');}},k*Math.min(30,900/list.length));});
}
function shake(){var b=$('wrap');b.classList.remove('shake');void b.offsetWidth;b.classList.add('shake');}
function nope(){shake();Sound.sfx('nope');}
/* нажатие на число без нужного количества флагов: подсветить соседей */
function pressFlash(i){
  R.nb(G.g,i).forEach(function(j){
    if(G.g.open[j]||G.g.mark[j]===1)return;
    var el=cells[j];el.classList.remove('pr');void el.offsetWidth;el.classList.add('pr');
    setTimeout(function(){el.classList.remove('pr');},260);
  });
}

function status(key,vars,cls){
  var el=$('status');
  el.setAttribute('data-key',key||'');el.setAttribute('data-vars',vars?JSON.stringify(vars):'');
  el.setAttribute('data-cls',cls||'');
  el.textContent=key?t(key,vars):'';
  el.className='status'+(cls?' '+cls:'');
}

/* ── размер клетки: поле целиком, если влезает; меньше минимума не уменьшаем, тогда поле прокручивается ── */
var BOT_W=210;
function layout(){
  if(!G||!document.body.classList.contains('screen-game'))return;
  var area=$('arena'),wrap=$('wrap');
  var W=area.clientWidth-12,top=area.getBoundingClientRect().top;
  var H=Math.max(200,(window.innerHeight||document.documentElement.clientHeight)-top-14);
  var coarse=window.matchMedia&&window.matchMedia('(pointer:coarse)').matches;
  var minC=coarse?22:16,maxC=coarse?56:44;
  var fit=Math.floor(Math.min(W/G.C,H/G.R));
  var botOn=false;
  if(S.bot&&W>=640){
    var fit2=Math.floor(Math.min((W-BOT_W)/G.C,H/G.R));
    if(fit2>=Math.min(maxC,Math.max(minC,fit))*0.8||fit2>=30){botOn=true;fit=fit2;}
  }
  fit=Math.max(minC,Math.min(maxC,fit));
  var cell=Math.max(12,Math.min(80,Math.round(fit*S.zoom)));
  document.body.classList.toggle('bot-on',botOn);
  $('field').style.setProperty('--c',cell+'px');
  $('field').style.width=cell*G.C+'px';
  var fw=cell*G.C+8,fh=cell*G.R+8,availW=W-(botOn?BOT_W:0);
  wrap.style.width=Math.min(fw,availW)+'px';
  wrap.style.height=Math.min(fh,H)+'px';
  wrap.classList.toggle('scroll',fw>availW||fh>H);
}

/* ════════ СЧЁТЧИК ВРЕМЕНИ ════════
   Идёт только на экране игры и пока вкладка видна. */
function tick(){
  var now=Date.now();
  if(G&&G.started&&!G.over&&document.body.classList.contains('screen-game')&&!document.hidden){
    var d=now-(tick.last||now);
    if(d>0&&d<2000)G.time+=d;
    var s=$('hud-time'),v=Math.floor(G.time/1000);
    if(s.textContent!==String(v))s.textContent=v;
  }
  tick.last=now;
}
setInterval(tick,200);

/* ════════ САПЁР-ПОМОЩНИК ════════ */
var botMood='idle',botTmr=null;
function bot(m){
  var el=$('bot');if(!el)return;
  if(botTmr){clearTimeout(botTmr);botTmr=null;}
  botMood=m;
  el.className='bot bm-'+m;
  var list=t('bot.'+m).split('|');
  $('bot-say').textContent=list[Math.floor(Math.random()*list.length)];
  var transient={go:1,safe:1,count:1,flag:1,unflag:1,hint:1,life:1};
  if(transient[m])botTmr=setTimeout(function(){if(botMood===m&&G&&!G.over)bot('idle');},1700);
}

/* ════════ УПРАВЛЕНИЕ ════════
   Мышь: левая кнопка открывает (по отпусканию), правая ставит флаг, средняя открывает соседей числа.
   Касание: короткое открывает, долгое (0,4 с) ставит флаг; сдвиг пальца прокручивает поле. */
var press=null,lastKind='mouse',LONG=400;
function cellOf(node){
  while(node&&node!==document.body){
    if(node.getAttribute&&node.getAttribute('data-i')!==null)return +node.getAttribute('data-i');
    node=node.parentNode;
  }
  return -1;
}
function down(i,kind,button,x,y){
  if(!G||G.over||i<0)return;
  lastKind=kind;
  if(kind==='mouse'){
    if(button===2){if(!G.g.open[i])toggleMark(i);else primary(i);press=null;return;}
    press={i:i,kind:kind,button:button,x:x,y:y};
    cells[i].classList.add('down');
    return;
  }
  press={i:i,kind:kind,x:x,y:y,long:false};
  press.tmr=setTimeout(function(){
    if(!press||press.i!==i)return;
    press.long=true;
    cells[i].classList.remove('down');
    if(!G.g.open[i]){
      /* в режиме флагов долгое нажатие наоборот открывает */
      if(G.flagMode){G.flagMode=false;primary(i);G.flagMode=true;paintHud();}
      else toggleMark(i);
    }
  },LONG);
  cells[i].classList.add('down');
}
function move(x,y){
  if(!press)return;
  if(Math.abs(x-press.x)>10||Math.abs(y-press.y)>10)cancel();
}
function cancel(){
  if(!press)return;
  clearTimeout(press.tmr);
  if(cells[press.i])cells[press.i].classList.remove('down');
  press=null;
}
function up(i){
  if(!press)return;
  var p=press;press=null;
  clearTimeout(p.tmr);
  if(cells[p.i])cells[p.i].classList.remove('down');
  if(p.long||i!==p.i)return;
  if(p.kind==='mouse'&&p.button===1){if(G.g.open[i])primary(i);return;}
  primary(i);
}
function bindField(){
  var f=$('field');
  f.addEventListener('contextmenu',function(e){e.preventDefault();});
  if(window.PointerEvent){
    f.addEventListener('pointerdown',function(e){
      var kind=e.pointerType==='mouse'?'mouse':'touch';
      if(kind==='mouse'&&e.button===1)e.preventDefault();
      down(cellOf(e.target),kind,e.button,e.clientX,e.clientY);
    });
    f.addEventListener('pointermove',function(e){if(press&&press.kind!=='mouse')move(e.clientX,e.clientY);});
    f.addEventListener('pointerup',function(e){
      var i=cellOf(document.elementFromPoint?document.elementFromPoint(e.clientX,e.clientY):e.target);
      up(i);
    });
    f.addEventListener('pointercancel',cancel);
    f.addEventListener('pointerleave',function(e){if(e.pointerType==='mouse')cancel();});
  }else{
    var touched=0;
    f.addEventListener('touchstart',function(e){
      touched=Date.now();var p=e.changedTouches[0];
      down(cellOf(e.target),'touch',0,p.clientX,p.clientY);
    });
    f.addEventListener('touchmove',function(e){var p=e.changedTouches[0];move(p.clientX,p.clientY);});
    f.addEventListener('touchend',function(e){
      var p=e.changedTouches[0];
      var el=document.elementFromPoint?document.elementFromPoint(p.clientX,p.clientY):e.target;
      if(press&&!press.long)e.preventDefault();
      up(cellOf(el));
    });
    f.addEventListener('touchcancel',cancel);
    f.addEventListener('mousedown',function(e){if(Date.now()-touched<800)return;down(cellOf(e.target),'mouse',e.button,e.clientX,e.clientY);});
    f.addEventListener('mouseup',function(e){if(Date.now()-touched<800)return;up(cellOf(e.target));});
    f.addEventListener('mouseleave',cancel);
  }
}
document.addEventListener('keydown',function(e){
  if(!G||!document.body.classList.contains('screen-game'))return;
  var k=(e.key||'').toLowerCase();
  if(k==='f'||k==='а'){toggleFlagMode();}
  else if(k==='h'||k==='р'){hint();}
  else if(k==='n'||k==='т'||k==='f2'){newGame();}
  else if(k==='+'||k==='='){zoom(1);}
  else if(k==='-'){zoom(-1);}
});
function toggleFlagMode(){
  if(!G||G.over)return;
  G.flagMode=!G.flagMode;
  status(G.flagMode?'msg.flagOn':'msg.flagOff');
  Sound.sfx('select');paintHud();
}
function zoom(d){
  var z=S.zoom*(d>0?1.15:1/1.15);
  S.zoom=Math.max(0.6,Math.min(2.6,Math.round(z*100)/100));
  if(Math.abs(S.zoom-1)<0.06)S.zoom=1;
  save();layout();Sound.sfx('select');
}
var rzT;
window.addEventListener('resize',function(){clearTimeout(rzT);rzT=setTimeout(layout,80);});
window.addEventListener('orientationchange',function(){setTimeout(layout,250);});
document.addEventListener('visibilitychange',function(){if(document.hidden)persist();tick.last=Date.now();});
window.addEventListener('pagehide',persist);

function onLang(){
  paintMenu();
  if(G){
    paintHud();
    var el=$('status'),key=el.getAttribute('data-key');
    if(key){var v=el.getAttribute('data-vars');status(key,v?JSON.parse(v):null,el.getAttribute('data-cls'));}
    bot(botMood);
  }
}

function bindSeg(id,fn){
  var list=document.querySelectorAll('#seg-'+id+' .seg-btn');
  for(var i=0;i<list.length;i++)(function(b){
    b.addEventListener('click',function(){fn(b.getAttribute('data-v'));save();paintMenu();Sound.sfx('select');});
  })(list[i]);
}
function bindRange(id,key){
  var el=$(id);
  el.addEventListener('input',function(){
    S.custom[key]=+el.value;
    if(key!=='m')S.custom.m=Math.min(S.custom.m,maxMines(S.custom.r,S.custom.c));
    save();paintCustom();
    var d=dims('custom');$('diff-info').textContent=t('diff.info',{r:d.r,c:d.c,m:d.m});
  });
}
function boot(){
  A.topbar('ms.title');
  I18n.apply();I18n.onChange(onLang);
  bindField();
  bindSeg('diff',function(v){S.diff=v;});
  bindSeg('marks',function(v){S.marks=v==='yes';});
  bindSeg('bot',function(v){S.bot=v==='yes';});
  var th=document.querySelectorAll('#themes .th-card');
  for(var i=0;i<th.length;i++)(function(b){
    b.addEventListener('click',function(){S.theme=b.getAttribute('data-v');save();paintMenu();Sound.sfx('select');});
  })(th[i]);
  bindRange('c-rows','r');bindRange('c-cols','c');bindRange('c-mines','m');
  $('btn-play').addEventListener('click',newGame);
  $('btn-continue').addEventListener('click',resume);
  $('btn-menu').addEventListener('click',function(){showScreen('menu');});
  $('btn-new').addEventListener('click',newGame);
  $('btn-flag').addEventListener('click',toggleFlagMode);
  $('btn-hint').addEventListener('click',hint);
  $('btn-zoom-in').addEventListener('click',function(){zoom(1);});
  $('btn-zoom-out').addEventListener('click',function(){zoom(-1);});
  $('over-new').addEventListener('click',newGame);
  $('over-field').addEventListener('click',function(){hide('over-modal');});
  $('over-menu').addEventListener('click',function(){hide('over-modal');showScreen('menu');});
  paintMenu();
  showScreen('menu');
}

window.AceonMS={g:function(){return G;},settings:S,db:DB,newGame:newGame,primary:primary,mark:toggleMark,hint:hint,layout:layout,resume:resume};
boot();
})();
