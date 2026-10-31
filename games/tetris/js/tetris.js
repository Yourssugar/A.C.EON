/* A.C.EON TETRIS: меню, игровой цикл, клавиатура с повтором и переназначением, жесты, кнопки,
   пауза, сохранение, статистика, 2D/3D, робот BLOCKMIND.
   Правила в rules.js, рисование в view2d.js и view3d.js, тексты в lang.js. */
(function(){
'use strict';

var t=I18n.t,A=window.Arcade,R=window.TetRules;
var $=function(id){return document.getElementById(id);};
function show(id){$(id).classList.remove('hidden');}
function hide(id){$(id).classList.add('hidden');}

var MODES=['marathon','sprint','ultra','dig','zen'];
var ACTIONS=['left','right','soft','hard','cw','ccw','hold','pause'];
var DEFAULT_KEYS={left:['ArrowLeft','KeyA'],right:['ArrowRight','KeyD'],soft:['ArrowDown','KeyS'],hard:['Space','KeyW'],
  cw:['ArrowUp','KeyX'],ccw:['KeyZ','ControlLeft'],hold:['KeyC','ShiftLeft'],pause:['Escape','KeyP']};
var REPEAT={slow:{das:220,arr:60},normal:{das:167,arr:33},fast:{das:117,arr:16},instant:{das:100,arr:0}};

/* ── сохранения ── */
Store.define('tetris',{
  version:1,
  defaults:{settings:{mode:'marathon',level:1,dig:'clear',view:'2d',theme:'neon',big:false,next:5,ghost:true,bot:true,
    buttons:false,repeat:'normal',keys:null},stats:{},save:null},
  legacy:function(raw){
    var hi=parseInt(raw('aceon_hi_tetris'),10)||0;
    return hi?{stats:{marathon:{played:0,best:hi,lines:0,tetrises:0}}}:null;
  }
});
var DB=Store.get('tetris'),S=DB.settings;
if(MODES.indexOf(S.mode)<0)S.mode='marathon';
S.level=Math.max(1,Math.min(15,S.level|0||1));
if(S.dig!=='rise')S.dig='clear';
if(S.view!=='3d')S.view='2d';
if(['neon','gb','glass'].indexOf(S.theme)<0)S.theme='neon';
S.next=Math.max(1,Math.min(5,S.next|0||5));
if(!REPEAT[S.repeat])S.repeat='normal';
function keysOf(){
  if(!S.keys)S.keys=JSON.parse(JSON.stringify(DEFAULT_KEYS));
  ACTIONS.forEach(function(a){if(!S.keys[a])S.keys[a]=DEFAULT_KEYS[a].slice();});
  return S.keys;
}
keysOf();
function save(){Store.save('tetris');}
function statKey(st){return st.mode==='dig'?'dig-'+st.dig:st.mode;}
function stat(k){if(!DB.stats[k])DB.stats[k]={played:0,best:0,lines:0,tetrises:0};return DB.stats[k];}
/* по времени рекорд меньше лучше, в остальных больше */
function byTime(k){return k==='sprint'||k==='dig-clear';}
function setOf(){return {theme:S.theme,big:!!S.big,ghost:!!S.ghost};}

/* ── звуки ── */
Sound.define('tmove',function(tm,tone){tone(tm,240,0.025,'square',0.025);});
Sound.define('trot',function(tm,tone){tone(tm,520,0.03,'square',0.03);tone(tm+0.02,700,0.03,'square',0.02);});
Sound.define('tlock',function(tm,tone,noise){noise(tm,0.05,0.35,900);tone(tm,110,0.06,'sine',0.12);});
Sound.define('tdrop',function(tm,tone,noise){noise(tm,0.08,0.5,600);tone(tm,90,0.1,'sine',0.18,50);});
Sound.define('thold',function(tm,tone){tone(tm,660,0.05,'triangle',0.06);tone(tm+0.05,440,0.06,'triangle',0.05);});
Sound.define('tclear',function(tm,tone,noise){noise(tm,0.18,0.25,3000);[523,659,784].forEach(function(f,i){tone(tm+i*0.04,f,0.1,'square',0.04);});});
Sound.define('ttetris',function(tm,tone,noise){noise(tm,0.3,0.35,2500);[523,659,784,1047,1319].forEach(function(f,i){tone(tm+i*0.06,f,0.16,'square',0.05);});});
Sound.define('tspin',function(tm,tone){[880,1175,1568].forEach(function(f,i){tone(tm+i*0.05,f,0.12,'triangle',0.06);});});
Sound.define('tlevel',function(tm,tone){[392,523,659,784].forEach(function(f,i){tone(tm+i*0.08,f,0.14,'square',0.05);});});
Sound.define('trise',function(tm,tone,noise){noise(tm,0.2,0.4,300);});
Sound.define('tbeep',function(tm,tone){tone(tm,660,0.08,'square',0.05);});
Sound.define('tgo',function(tm,tone){tone(tm,1320,0.16,'square',0.06);});

/* ── партия ──
   G: {st, paused, count (мс до старта), over, rec} */
var G=null;

/* ════════ МЕНЮ ════════ */
function buildModes(){
  var list=$('mode-list');list.innerHTML='';
  MODES.forEach(function(m){
    var b=document.createElement('button');
    b.type='button';b.className='m-card-btn'+(S.mode===m?' sel':'');
    b.innerHTML='<canvas class="m-ico" width="40" height="40" data-m="'+m+'"></canvas><span class="m-txt"><span class="m-name" data-i18n="mode.'+m+'"></span><span class="m-desc" data-i18n="desc.'+m+'"></span></span>';
    b.addEventListener('click',function(){S.mode=m;save();paintMenu();Sound.sfx('select');});
    list.appendChild(b);
    modeIcon(b.querySelector('canvas'),m);
  });
  I18n.apply(list);
}
/* значки режимов рисуются блоками текущей темы */
function modeIcon(cv,m){
  var g=cv.getContext('2d'),set={theme:S.theme,big:false},s=8;
  g.fillStyle=TetTheme.bg(S.theme,false).a;g.fillRect(0,0,40,40);
  var shapes={
    marathon:[[0,4,'J'],[1,4,'J'],[2,4,'O'],[3,4,'O'],[4,4,'L'],[0,3,'J'],[2,3,'O'],[3,3,'O'],[4,3,'L'],[4,2,'L'],[1,1,'T'],[1,0,'T'],[2,1,'T'],[0,1,'T']],
    sprint:[[0,4,'I'],[1,4,'I'],[2,4,'I'],[3,4,'I'],[0,3,'I'],[1,3,'I'],[2,3,'I'],[3,3,'I'],[4,0,'I'],[4,1,'I'],[4,2,'I'],[4,3,'I']],
    ultra:[[1,1,'Z'],[2,1,'Z'],[2,2,'Z'],[3,2,'Z'],[0,4,'S'],[1,4,'S'],[1,3,'S'],[2,3,'S'],[3,4,'O'],[4,4,'O'],[3,3,'O'],[4,3,'O']],
    dig:[[0,4,'G'],[1,4,'G'],[3,4,'G'],[4,4,'G'],[0,3,'G'],[2,3,'G'],[3,3,'G'],[4,3,'G'],[2,0,'T'],[1,1,'T'],[2,1,'T'],[3,1,'T']],
    zen:[[0,4,'S'],[1,4,'S'],[3,4,'J'],[4,4,'J'],[2,2,'O'],[2,1,'O'],[0,1,'L'],[4,1,'L']]
  }[m];
  shapes.forEach(function(c){drawBlock(g,c[0]*s,c[1]*s,s,c[2],set);});
}
function drawBlock(g,x,y,s,type,set){
  /* маленький значок: простой блок с бликом, чтобы не тянуть весь отрисовщик */
  var col=TetTheme.color(set.theme,set.big,type);
  g.fillStyle=col;g.fillRect(x,y,s-1,s-1);
  g.fillStyle='rgba(255,255,255,.3)';g.fillRect(x,y,s-1,2);
}
function fmtTime(ms){
  var s=ms/1000,m=Math.floor(s/60),r=s-m*60;
  return m+':'+(r<10?'0':'')+r.toFixed(m?0:2).replace(/\.00$/,'');
}
function fmtClock(ms){var s=Math.max(0,Math.floor(ms/1000));return Math.floor(s/60)+':'+('0'+s%60).slice(-2);}
function fmtBest(k,v){if(!v)return '-';return byTime(k)?fmtTime(v):String(v);}
function buildStats(){
  var h='<div class="st-row st-head"><span></span><span data-i18n="st.games"></span><span data-i18n="st.best"></span><span data-i18n="st.lines"></span></div>';
  [['marathon','mode.marathon'],['sprint','mode.sprint'],['ultra','mode.ultra'],['dig-clear','row.digClear'],['dig-rise','row.digRise'],['zen','mode.zen']].forEach(function(r){
    var s=DB.stats[r[0]]||{played:0,best:0,lines:0};
    var cur=r[0]===(S.mode==='dig'?'dig-'+S.dig:S.mode);
    h+='<div class="st-row'+(cur?' cur':'')+'"><span data-i18n="'+r[1]+'"></span><b>'+s.played+'</b><b>'+fmtBest(r[0],s.best)+'</b><b>'+(s.lines||0)+'</b></div>';
  });
  $('stats').innerHTML=h;I18n.apply($('stats'));
}
function paintRange(){
  var el=$('r-level');el.value=S.level;$('r-level-v').textContent=S.level;
  el.style.setProperty('--fill',((S.level-1)/14*100)+'%');
}
function paintMenu(){
  buildModes();buildStats();paintRange();
  $('opt-marathon').classList.toggle('hidden',S.mode!=='marathon');
  $('opt-dig').classList.toggle('hidden',S.mode!=='dig');
  [['dig',S.dig],['view',S.view],['big',S.big?'yes':'no'],['next',String(S.next)],['ghost',S.ghost?'yes':'no'],
   ['bot',S.bot?'yes':'no'],['buttons',S.buttons?'yes':'no'],['repeat',S.repeat]].forEach(function(x){
    var list=document.querySelectorAll('#seg-'+x[0]+' .seg-btn');
    for(var i=0;i<list.length;i++)list[i].classList.toggle('sel',list[i].getAttribute('data-v')===x[1]);
  });
  var b3=document.querySelector('#seg-view [data-v="3d"]');
  if(!has3d()){b3.disabled=true;b3.classList.add('off');}
  var th=document.querySelectorAll('#themes .th-card');
  for(var i=0;i<th.length;i++){
    th[i].classList.toggle('sel',th[i].getAttribute('data-v')===S.theme);
    TetView2D.swatch(th[i].querySelector('canvas'),th[i].getAttribute('data-v'));
  }
  buildKeys();
  $('btn-continue').classList.toggle('hidden',!((G&&!G.over&&G.st.pieces>0)||(DB.save&&DB.save.st)));
  applyLook();
}
function applyLook(){
  var b=document.body;
  ['neon','gb','glass'].forEach(function(x){b.classList.toggle('th-'+x,S.theme===x);});
  b.classList.toggle('big',!!S.big);
}

/* ── клавиши: у каждого действия две, нажатие на клавишу в списке переназначает её ── */
var capture=null;   // {a, i, el}
function keyName(code){
  if(!code)return '-';
  var map={ArrowLeft:'◀',ArrowRight:'▶',ArrowUp:'▲',ArrowDown:'▼',Space:'SPACE',Escape:'ESC',Enter:'ENTER',Backspace:'BKSP',Tab:'TAB',
    ShiftLeft:'L-SHIFT',ShiftRight:'R-SHIFT',ControlLeft:'L-CTRL',ControlRight:'R-CTRL',AltLeft:'L-ALT',AltRight:'R-ALT'};
  if(map[code])return map[code];
  return code.replace(/^Key/,'').replace(/^Digit/,'').replace(/^Numpad/,'NUM ').toUpperCase();
}
function buildKeys(){
  var K=keysOf(),h='';
  ACTIONS.forEach(function(a){
    h+='<div class="key-row"><span data-i18n="act.'+a+'"></span>';
    for(var i=0;i<2;i++)h+='<button type="button" class="key-btn'+(capture&&capture.a===a&&capture.i===i?' wait':'')+'" data-a="'+a+'" data-i="'+i+'">'+
      (capture&&capture.a===a&&capture.i===i?t('keys.press'):keyName(K[a][i]))+'</button>';
    h+='</div>';
  });
  $('keys').innerHTML=h;I18n.apply($('keys'));
}
function bindKeys(){
  $('keys').addEventListener('click',function(e){
    var b=e.target.closest?e.target.closest('.key-btn'):null;if(!b)return;
    capture={a:b.getAttribute('data-a'),i:+b.getAttribute('data-i')};
    buildKeys();Sound.sfx('select');
  });
  $('keys-reset').addEventListener('click',function(){S.keys=JSON.parse(JSON.stringify(DEFAULT_KEYS));capture=null;save();buildKeys();Sound.sfx('select');});
}
function captureKey(e){
  if(!capture)return false;
  e.preventDefault();
  var code=e.code||'';
  if(code==='Escape'&&capture.a!=='pause'){capture=null;buildKeys();return true;}
  var K=keysOf();
  ACTIONS.forEach(function(a){for(var i=0;i<2;i++)if(K[a][i]===code)K[a][i]='';});
  K[capture.a][capture.i]=code;
  capture=null;save();buildKeys();Sound.sfx('select');
  return true;
}
function actionOf(code){
  var K=keysOf();
  for(var k=0;k<ACTIONS.length;k++){var a=ACTIONS[k];if(K[a][0]===code||K[a][1]===code)return a;}
  return null;
}

function showScreen(name){
  document.body.classList.toggle('screen-menu',name==='menu');
  document.body.classList.toggle('screen-game',name==='game');
  if(name==='menu'){persist();paintMenu();hide('over-modal');}
  Sound.music(name==='menu'?'menu':'game');
  window.scrollTo(0,0);
  if(name==='game'){useView(S.view);layout();requestAnimationFrame(layout);setTimeout(layout,250);}
}

/* ════════ ПАРТИЯ ════════ */
function newGame(){
  var st=R.create({mode:S.mode,level:S.level,dig:S.dig});
  G={st:st,paused:false,count:1300,over:false,started:false};
  stat(statKey(st)).played++;save();
  A.trackPlay();
  held={};softHeld=false;
  hide('over-modal');hide('pause-ov');
  showCount();
  bot('idle');
  $('fx').innerHTML='';
  dirtyMini=true;
  persist();
  showScreen('game');
  Sound.sfx('tbeep');
}
function persist(){
  if(!G)return;
  if(G.over){DB.save=null;save();return;}
  G.st.ev=[];
  DB.save={st:G.st};
  save();
}
function resume(){
  if((!G||G.over)&&DB.save&&DB.save.st)G={st:DB.save.st,paused:true,count:0,over:false};
  if(!G)return;
  G.paused=true;held={};softHeld=false;G.st.soft=false;
  hide('over-modal');
  show('pause-ov');
  dirtyMini=true;
  showScreen('game');
}
function setPause(on){
  if(!G||G.over)return;
  G.paused=on;
  $('pause-ov').classList.toggle('hidden',!on);
  held={};softHeld=false;G.st.soft=false;
  if(on){persist();Sound.duck(0.4,600);}
  Sound.sfx('select');
}
function playing(){return G&&!G.over&&!G.paused&&G.count<=0&&document.body.classList.contains('screen-game');}

/* обратный отсчёт перед стартом */
function showCount(){
  var el=$('count');el.textContent=t('go.ready');el.className='count';
}
function tickCount(dt){
  if(G.count<=0)return;
  var before=G.count;G.count-=dt;
  var el=$('count');
  if(before>500&&G.count<=500){el.textContent=t('go.go');el.className='count go';Sound.sfx('tgo');}
  if(G.count<=0){el.className='count hidden';}
}

/* ── события правил: звук, эффекты, надписи, робот, конец игры ── */
function onEvent(ev){
  var st=G.st,set=setOf();
  if(view())view().event(ev,st,set);
  switch(ev.type){
    case 'move':Sound.sfx('tmove');break;
    case 'rotate':Sound.sfx('trot');break;
    case 'hold':Sound.sfx('thold');dirtyMini=true;break;
    case 'spawn':dirtyMini=true;break;
    case 'drop':Sound.sfx('tdrop');break;
    case 'lock':if(!ev.cleared)Sound.sfx('tlock');bot('lock');break;
    case 'clear':Sound.sfx(ev.rows.length>=4?'ttetris':'tclear');break;
    case 'score':
      if(ev.label){
        var spin=/^t(spin|mini)/.test(ev.label);
        pop(t('pop.'+ev.label),ev.lines>=4||spin?'big':'');
        if(spin)Sound.sfx('tspin');
        bot(spin?'tspin':ev.lines>=4?'tetris':ev.lines===3?'triple':ev.lines===2?'double':ev.lines===1?'single':'lock');
      }
      if(ev.b2b)pop(t('pop.b2b'),'b2b');
      if(ev.combo>0)pop(t('pop.combo',{n:ev.combo}),'combo');
      if(ev.perfect)pop(t('pop.perfect'),'big');
      break;
    case 'level':pop(t('pop.level',{n:ev.level}),'lvl');Sound.sfx('tlevel');bot('levelup');break;
    case 'rise':Sound.sfx('trise');break;
    case 'wipe':pop(t('pop.wipe'),'big');Sound.sfx('trise');break;
    case 'over':finish(false);break;
    case 'done':finish(true);break;
  }
}
var popN=0;
function pop(txt,cls){
  var el=document.createElement('div');
  el.className='pop '+(cls||'');el.textContent=txt;
  el.style.top=(30+(popN++%3)*9)+'%';
  $('fx').appendChild(el);
  setTimeout(function(){if(el.parentNode)el.parentNode.removeChild(el);},1500);
}

function finish(done){
  if(G.over)return;
  var st=G.st;
  G.over=true;st.soft=false;held={};
  var k=statKey(st),s=stat(k),rec=false;
  s.lines=Math.max(s.lines||0,st.lines);
  s.tetrises=(s.tetrises||0)+st.tetrises;
  if(byTime(k)){if(done&&(!s.best||st.time<s.best)){s.best=Math.round(st.time);rec=true;}}
  else if(k==='dig-rise'){if(st.lines>(s.best||0)){s.best=st.lines;rec=true;}}
  else if(st.score>(s.best||0)){s.best=st.score;rec=true;}
  if(k==='marathon')A.setHi('tetris',st.score);
  DB.save=null;save();
  var win=done||rec;
  Sound.sfx(win?'win':'lose');Sound.duck(0.3,2500);
  bot(done?'done':'over');
  var title=done?(st.mode==='ultra'?'over.time':'over.done'):'over.lose';
  $('over-title').textContent=t(title);
  $('over-title').className='over-title '+(win?'win':'lose');
  function row(key,v){return '<div class="ov-row"><span>'+t(key)+'</span><b>'+v+'</b></div>';}
  var h='';
  if(st.mode==='sprint'||(st.mode==='dig'&&st.dig==='clear'))h+=row('over.time2',fmtTime(st.time));
  h+=row('over.score',st.score)+row('over.lines',st.lines);
  if(st.mode==='marathon')h+=row('over.level',st.level);
  if(st.mode!=='sprint'&&!(st.mode==='dig'&&st.dig==='clear'))h+=row('over.time2',fmtClock(st.time));
  h+=row('over.tetrises',st.tetrises)+row('over.tspins',st.tspins)+row('over.combo',Math.max(0,st.maxCombo));
  $('over-rows').innerHTML=h;
  $('over-rec').classList.toggle('hidden',!rec);
  setTimeout(function(){if(G&&G.over)show('over-modal');},900);
}

/* ════════ ВВОД ════════ */
var held={},softHeld=false,dirTime=0,dirAcc=0,lastDir=0;
/* нажатие действия: клавиатура и кнопки на экране */
function press(a){
  if(a==='pause'){if(G&&!G.over&&G.count<=0)setPause(!G.paused);return;}
  if(!playing())return;
  var st=G.st;
  if(a==='left'||a==='right'){
    var d=a==='left'?-1:1;
    held[a]=true;lastDir=d;dirTime=0;dirAcc=0;
    R.move(st,d);
  }else if(a==='soft'){softHeld=true;st.soft=true;}
  else if(a==='hard')R.hardDrop(st);
  else if(a==='cw')R.rotate(st,1);
  else if(a==='ccw')R.rotate(st,-1);
  else if(a==='hold')R.hold(st);
  drain();
}
function release(a){
  if(a==='left'||a==='right'){
    held[a]=false;
    if(lastDir===(a==='left'?-1:1)){
      var other=a==='left'?'right':'left';
      if(held[other]){lastDir=-lastDir;dirTime=0;dirAcc=0;}else lastDir=0;
    }
  }else if(a==='soft'){softHeld=false;if(G)G.st.soft=false;}
}
/* автоповтор при удержании влево и вправо */
function repeatInput(dt){
  if(!lastDir)return;
  var rp=REPEAT[S.repeat];
  dirTime+=dt;
  if(dirTime<rp.das)return;
  if(rp.arr===0){while(R.move(G.st,lastDir));return;}
  dirAcc+=dt;
  while(dirAcc>=rp.arr){dirAcc-=rp.arr;if(!R.move(G.st,lastDir)){dirAcc=0;break;}}
}
document.addEventListener('keydown',function(e){
  if(captureKey(e))return;
  if(!document.body.classList.contains('screen-game')||!G)return;
  var a=actionOf(e.code);
  if(!a){
    if(e.key==='Escape'&&G&&!G.over)setPause(!G.paused);
    return;
  }
  e.preventDefault();
  if(e.repeat)return;
  if(G.paused&&a!=='pause'){setPause(false);return;}
  press(a);
});
document.addEventListener('keyup',function(e){
  var a=actionOf(e.code);if(a)release(a);
});

/* ── жесты: ведение пальцем двигает, тап поворачивает, взмах вниз бросает, вверх кладёт в запас ── */
var touch=null,fingers={},LONG_TAP=320;
function bindTouch(){
  var zone=$('arena');
  function down(id,x,y){
    fingers[id]={x:x,y:y};
    var n=Object.keys(fingers).length;
    if(n===1)touch={id:id,x0:x,y0:y,t0:Date.now(),col:0,row:0,moved:false,two:false,hist:[{x:x,y:y,t:Date.now()}]};
    else if(touch){touch.two=true;}
  }
  function move(id,x,y){
    if(fingers[id]){fingers[id].x=x;fingers[id].y=y;}
    if(!touch||touch.id!==id||touch.two||!playing())return;
    var st=G.st,cell=L.cell||24,dx=x-touch.x0,dy=y-touch.y0;
    touch.hist.push({x:x,y:y,t:Date.now()});if(touch.hist.length>8)touch.hist.shift();
    if(Math.abs(dx)>8||Math.abs(dy)>8)touch.moved=true;
    /* по горизонтали фигура идёт за пальцем, клетка за клеткой */
    var cols=dx>0?Math.floor(dx/(cell*0.85)):-Math.floor(-dx/(cell*0.85));
    while(touch.col<cols){if(!R.move(st,1)){touch.col=cols;break;}touch.col++;}
    while(touch.col>cols){if(!R.move(st,-1)){touch.col=cols;break;}touch.col--;}
    /* вниз медленно: мягкий сброс по строкам */
    if(dy>cell*0.8&&dy>Math.abs(dx)){
      var rows=Math.floor((dy-cell*0.4)/(cell*0.9));
      while(touch.row<rows){if(!R.stepDown(st))break;touch.row++;}
    }
    drain();
  }
  function up(id,x,y){
    delete fingers[id];
    if(!touch)return;
    var left=Object.keys(fingers).length;
    if(touch.two){
      if(left===0){
        if(!touch.moved&&Date.now()-touch.t0<450)act('ccw');
        touch=null;
      }
      return;
    }
    if(touch.id!==id)return;
    var tc=touch;touch=null;
    if(G&&G.paused&&!G.over){setPause(false);return;}
    if(!playing())return;
    var dt=Date.now()-tc.t0,dy=y-tc.y0,dx=x-tc.x0,cell=L.cell||24;
    /* скорость по последним точкам */
    var h0=tc.hist[0],now=Date.now();
    for(var i=tc.hist.length-1;i>=0;i--){if(now-tc.hist[i].t>90){h0=tc.hist[i];break;}}
    var vy=(y-h0.y)/Math.max(16,now-h0.t);
    var quick=dt<260;
    if(dy>cell*1.6&&(vy>0.55||quick&&dy>cell*2.5)&&Math.abs(dy)>Math.abs(dx))act('hard');
    else if(dy<-cell*1.4&&(vy<-0.5||quick)&&Math.abs(dy)>Math.abs(dx))act('hold');
    else if(!tc.moved&&dt<LONG_TAP)act('cw');
  }
  function act(a){press(a);}
  function skip(e){var n=e.target;while(n&&n!==zone){if(n.id==='pause-ov'&&G&&G.paused)return false;if(n.tagName==='BUTTON')return true;n=n.parentNode;}return false;}
  if(window.PointerEvent){
    zone.addEventListener('pointerdown',function(e){if(e.pointerType==='mouse'||skip(e))return;down(e.pointerId,e.clientX,e.clientY);});
    zone.addEventListener('pointermove',function(e){if(e.pointerType==='mouse')return;move(e.pointerId,e.clientX,e.clientY);});
    zone.addEventListener('pointerup',function(e){if(e.pointerType==='mouse')return;up(e.pointerId,e.clientX,e.clientY);});
    zone.addEventListener('pointercancel',function(e){delete fingers[e.pointerId];touch=null;});
  }else{
    zone.addEventListener('touchstart',function(e){if(skip(e))return;for(var i=0;i<e.changedTouches.length;i++){var p=e.changedTouches[i];down(p.identifier,p.clientX,p.clientY);}});
    zone.addEventListener('touchmove',function(e){e.preventDefault();for(var i=0;i<e.changedTouches.length;i++){var p=e.changedTouches[i];move(p.identifier,p.clientX,p.clientY);}},{passive:false});
    zone.addEventListener('touchend',function(e){for(var i=0;i<e.changedTouches.length;i++){var p=e.changedTouches[i];up(p.identifier,p.clientX,p.clientY);}});
    zone.addEventListener('touchcancel',function(){fingers={};touch=null;});
  }
  /* мышью по паузе: продолжить */
  $('pause-ov').addEventListener('click',function(e){if(e.target===$('pause-ov'))setPause(false);});
}
/* кнопки на экране: удержание стрелок работает как на клавиатуре */
function bindPad(){
  var list=document.querySelectorAll('#tpad .tp-b');
  for(var i=0;i<list.length;i++)(function(b){
    var a=b.getAttribute('data-a');
    function on(e){e.preventDefault();b.classList.add('on');if(G&&G.paused){setPause(false);return;}press(a);}
    function off(){b.classList.remove('on');release(a);}
    if(window.PointerEvent){b.addEventListener('pointerdown',on);b.addEventListener('pointerup',off);b.addEventListener('pointerleave',off);b.addEventListener('pointercancel',off);}
    else{b.addEventListener('touchstart',on,{passive:false});b.addEventListener('touchend',off);b.addEventListener('mousedown',on);b.addEventListener('mouseup',off);b.addEventListener('mouseleave',off);}
  })(list[i]);
}

/* ════════ ЦИКЛ ════════ */
var v2=null,v3=null,v3ready=false,v3state='none',dirtyMini=true,lastT=0;
function view(){return S.view==='3d'&&v3ready?v3:v2;}
function drain(){
  if(!G)return;
  var ev=G.st.ev;G.st.ev=[];
  /* звук фиксации не нужен, если сразу за ней очистка линий */
  for(var i=0;i<ev.length;i++){
    if(ev[i].type==='lock'&&ev[i+1]&&ev[i+1].type==='clear')ev[i].cleared=true;
    onEvent(ev[i]);
  }
}
function frame(now){
  requestAnimationFrame(frame);
  var dt=lastT?Math.min(100,now-lastT):16;lastT=now;
  if(!G||!document.body.classList.contains('screen-game'))return;
  if(!G.over&&!G.paused){
    if(G.count>0)tickCount(dt);
    else if(!document.hidden){
      repeatInput(dt);
      var left=dt;
      while(left>0&&!G.st.over&&!G.st.done){var step=Math.min(left,25);R.update(G.st,step);left-=step;drain();}
      drain();
    }
  }
  var set=setOf();
  if(dirtyMini){paintMini();dirtyMini=false;}
  var v=view();
  if(v)v.draw(G.st,now,set);
  paintHud();
}

/* запас и очередь */
function paintMini(){
  if(!G)return;
  var set=setOf(),st=G.st,n=S.big?Math.min(3,S.next):S.next;
  TetView2D.mini($('cv-hold'),[st.hold],L.mini,set,st.holdUsed,L.narrow);
  TetView2D.mini($('cv-next'),st.queue.slice(0,n),L.mini,set,false,L.narrow);
}
var hudCache='';
function paintHud(){
  var st=G.st,cells=[];
  cells.push(['hud.score',st.score]);
  if(st.mode==='sprint')cells.push(['hud.lines',st.lines+'/'+R.SPRINT_LINES]);
  else if(st.mode==='dig'&&st.dig==='clear')cells.push(['hud.junk',R.garbageLeft(st)]);
  else cells.push(['hud.lines',st.lines]);
  if(st.mode==='marathon'||st.mode==='ultra'||(st.mode==='dig'&&st.dig==='rise'))cells.push(['hud.level',st.level]);
  if(st.mode==='ultra')cells.push(['hud.left',fmtClock(R.ULTRA_MS-st.time+999)]);
  else if(st.mode==='sprint'||(st.mode==='dig'&&st.dig==='clear'))cells.push(['hud.time',fmtClock(st.time)+'.'+Math.floor(st.time%1000/100)]);
  else cells.push(['hud.time',fmtClock(st.time)]);
  var key=cells.map(function(c){return c[0]+c[1];}).join('|')+I18n.lang;
  if(key===hudCache)return;
  hudCache=key;
  $('hud-cells').innerHTML=cells.map(function(c){return '<div class="hc"><span>'+t(c[0])+'</span><b>'+c[1]+'</b></div>';}).join('');
  $('hud-mode').textContent=t('mode.'+st.mode);
  $('hud-cells').classList.toggle('low',st.mode==='ultra'&&R.ULTRA_MS-st.time<15000);
}

/* ── размеры: широкий экран (запас слева, очередь справа) или узкий (полоса сверху) ── */
var L={cell:24,mini:14,narrow:false};
function layout(){
  if(!G||!document.body.classList.contains('screen-game'))return;
  var arena=$('arena'),pad=!$('tpad').classList.contains('hidden');
  $('tpad').classList.toggle('hidden',!S.buttons);
  var aw=arena.clientWidth-12;
  var top=arena.getBoundingClientRect().top;
  var vh=window.innerHeight||document.documentElement.clientHeight;
  /* низкий горизонтальный экран: кнопки по бокам, высоту под них не отнимаем */
  var side=!!S.buttons&&aw>(vh-top)*1.6&&vh<560;
  document.body.classList.toggle('pad-side',side);
  if(side)aw-=2*140;
  var ah=vh-top-30-(S.buttons&&!side?($('tpad').offsetHeight||150)+4:0);
  ah=Math.max(150,ah);
  var VIS=R.H-R.HIDDEN,big=!!S.big;
  var narrow=aw<ah*0.95&&aw<640;
  var cell,mini;
  if(narrow){
    var k=big?0.44:0.38;
    cell=Math.floor(Math.min(aw/10,(ah-24)/(VIS+3*k)));
    mini=Math.max(7,Math.floor(cell*k));
  }else{
    var mk=big?0.66:0.62;
    /* поле + две боковые колонки по 4.4 мини-клетки + отступы */
    cell=Math.floor(Math.min(ah/VIS,(aw-60)/(10+2*4.4*mk)));
    mini=Math.max(8,Math.floor(cell*mk));
  }
  cell=Math.max(10,Math.min(big?46:40,cell));
  L.cell=cell;L.mini=mini;L.narrow=narrow;
  document.body.classList.toggle('narrow',narrow);
  var w=10*cell,h=VIS*cell;
  $('well').style.width=w+'px';$('well').style.height=h+'px';
  if(v2)v2.resize(cell);
  if(v3)v3.resize(w,h);
  /* робот справа, если есть место */
  var used=w+2*(4.4*mini+24)+40;
  document.body.classList.toggle('bot-on',!!S.bot&&!narrow&&!side&&aw-used>=230);
  dirtyMini=true;
}

/* ════════ 3D ════════ */
function has3d(){return !!(window.Three3D&&Three3D.supported()&&window.TetView3D);}
function useView(v){
  document.body.classList.toggle('view-3d',v==='3d'&&v3ready);
  paintViewBtn();
  if(v!=='3d'||!has3d()){if(v3)v3.show(false);return;}
  if(v3){v3.show(true);return;}
  if(v3state==='loading'||v3state==='failed')return;
  v3state='loading';
  var box=$('b3-load');box.textContent=t('b3.loading',{p:0});show('b3-load');
  Three3D.load(function(p){box.textContent=t('b3.loading',{p:Math.round(p*100)});}).then(function(THREE){
    v3=TetView3D(THREE,$('well'));
    if(!v3)throw new Error('webgl');
    v3ready=true;v3state='ready';hide('b3-load');
    if(S.view==='3d'){document.body.classList.add('view-3d');v3.show(true);}else v3.show(false);
    layout();paintViewBtn();
  }).catch(function(){
    v3state='failed';hide('b3-load');S.view='2d';save();
    document.body.classList.remove('view-3d');paintViewBtn();layout();
    pop(t('b3.fail'),'');
  });
}
function toggleView(){
  if(!has3d()||v3state==='failed')return;
  S.view=S.view==='3d'?'2d':'3d';save();
  useView(S.view);layout();Sound.sfx('select');
}
function paintViewBtn(){
  var b=$('btn-view');
  b.textContent=S.view==='3d'?'2D':'3D';
  b.disabled=!has3d()||v3state==='failed';
}

/* ════════ BLOCKMIND ════════ */
var botMood='idle',botTmr=null;
function bot(m){
  var el=$('bot');if(!el)return;
  if(botTmr){clearTimeout(botTmr);botTmr=null;}
  botMood=m;el.className='bot bm-'+m;
  var list=t('bot.'+m).split('|');
  $('bot-say').textContent=list[Math.floor(Math.random()*list.length)];
  var transient={lock:1,single:1,double:1,triple:1,tetris:1,tspin:1,levelup:1};
  if(transient[m])botTmr=setTimeout(function(){if(botMood===m&&G&&!G.over)bot('idle');},1500);
}

/* ── общие обработчики ── */
var rzT;
window.addEventListener('resize',function(){clearTimeout(rzT);rzT=setTimeout(layout,80);});
window.addEventListener('orientationchange',function(){setTimeout(layout,250);});
document.addEventListener('visibilitychange',function(){
  if(document.hidden&&G&&!G.over&&!G.paused&&G.count<=0&&document.body.classList.contains('screen-game'))setPause(true);
  if(document.hidden)persist();
});
window.addEventListener('pagehide',persist);
window.addEventListener('blur',function(){held={};lastDir=0;softHeld=false;if(G)G.st.soft=false;});

function onLang(){
  paintMenu();hudCache='';
  if(G){bot(botMood);if(!$('count').classList.contains('hidden'))$('count').textContent=t(G.count>500?'go.ready':'go.go');}
}
function bindSeg(id,fn){
  var list=document.querySelectorAll('#seg-'+id+' .seg-btn');
  for(var i=0;i<list.length;i++)(function(b){
    b.addEventListener('click',function(){if(b.disabled)return;fn(b.getAttribute('data-v'));save();paintMenu();Sound.sfx('select');});
  })(list[i]);
}
function boot(){
  A.topbar('t.title');
  I18n.apply();I18n.onChange(onLang);
  v2=TetView2D($('cv-field'));
  bindTouch();bindPad();bindKeys();
  bindSeg('dig',function(v){S.dig=v;});
  bindSeg('view',function(v){S.view=v;if(v==='3d'&&has3d())Three3D.load().catch(function(){});});
  bindSeg('big',function(v){S.big=v==='yes';});
  bindSeg('next',function(v){S.next=+v;});
  bindSeg('ghost',function(v){S.ghost=v==='yes';});
  bindSeg('bot',function(v){S.bot=v==='yes';});
  bindSeg('buttons',function(v){S.buttons=v==='yes';});
  bindSeg('repeat',function(v){S.repeat=v;});
  $('r-level').addEventListener('input',function(){S.level=+$('r-level').value;save();paintRange();});
  var th=document.querySelectorAll('#themes .th-card');
  for(var i=0;i<th.length;i++)(function(b){
    b.addEventListener('click',function(){S.theme=b.getAttribute('data-v');save();paintMenu();Sound.sfx('select');});
  })(th[i]);
  $('btn-play').addEventListener('click',newGame);
  $('btn-continue').addEventListener('click',resume);
  $('btn-menu').addEventListener('click',function(){if(G&&!G.over)G.paused=true;showScreen('menu');});
  $('btn-pause').addEventListener('click',function(){if(G&&G.count<=0)setPause(!G.paused);});
  $('btn-view').addEventListener('click',toggleView);
  $('po-go').addEventListener('click',function(){setPause(false);});
  $('po-restart').addEventListener('click',newGame);
  $('po-menu').addEventListener('click',function(){showScreen('menu');});
  $('over-new').addEventListener('click',newGame);
  $('over-menu').addEventListener('click',function(){showScreen('menu');});
  paintMenu();
  showScreen('menu');
  if(S.view==='3d'&&has3d())Three3D.load().catch(function(){});
  requestAnimationFrame(frame);
}

window.AceonTetris={g:function(){return G;},settings:S,db:DB,newGame:newGame,press:press,release:release,layout:layout,resume:resume,setPause:setPause};
boot();
})();
