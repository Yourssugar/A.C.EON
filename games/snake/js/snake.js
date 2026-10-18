/* A.C.EON SNAKE: меню, режимы, игра, управление, отрисовка в 2D.
   Поле 20x20 клеток. Логика идёт шагами, а рисуется каждый кадр с плавным переходом
   между шагами. Кадр описывается объектом scene, его рисует 2D-холст или 3D (view3d.js). */
(function(){
'use strict';

var t=I18n.t,A=window.Arcade;
var $=function(id){return document.getElementById(id);};
function show(id){$(id).classList.remove('hidden');}
function hide(id){$(id).classList.add('hidden');}

var GRID=20;
var SPEED={slow:190,normal:135,fast:85};          // мс на шаг
var MODES=['classic','wrap','levels'];
var START=[{x:10,y:10},{x:9,y:10},{x:8,y:10}];

/* ── бонусы ── */
var BONUS={
  gold: {w:40,life:7000},     // +5 очков
  slow: {w:25,life:7000},     // змейка медленнее на 6 секунд
  cut:  {w:15,life:7000},     // хвост короче на треть
  ghost:{w:20,life:7000}      // 6 секунд можно проходить сквозь себя
};
var FX_TIME=6000,BONUS_CHANCE=0.35,GOLD_POINTS=5;

/* ── уровни на время: набрать target очков за time секунд ── */
var LEVELS=[
  {target:8, time:80,step:150,obs:[]},
  {target:10,time:80,step:140,obs:['corners']},
  {target:12,time:80,step:135,obs:['bars']},
  {target:14,time:80,step:130,obs:['pillars']},
  {target:15,time:80,step:125,obs:['box']},
  {target:16,time:75,step:120,obs:['rooms']},
  {target:18,time:75,step:115,obs:['corners','bars']},
  {target:20,time:75,step:110,obs:['pillars','corners']},
  {target:22,time:70,step:105,obs:['box','corners']},
  {target:25,time:70,step:100,obs:['rooms','bars']}
];
var LEVEL_BONUS=['gold','slow'];   // в уровнях только помогающие бонусы

function pattern(name){
  var o=[],i;
  function add(x,y){o.push({x:x,y:y});}
  if(name==='corners'){
    [[2,2,1,1],[17,2,-1,1],[2,17,1,-1],[17,17,-1,-1]].forEach(function(c){
      for(i=0;i<4;i++){add(c[0]+c[2]*i,c[1]);add(c[0],c[1]+c[3]*i);}
    });
  }else if(name==='bars'){
    for(i=5;i<=14;i++){add(i,4);add(i,15);}
  }else if(name==='pillars'){
    for(i=4;i<=15;i++){if(i>=9&&i<=11)continue;add(4,i);add(15,i);}
  }else if(name==='box'){
    for(i=5;i<=14;i++){
      if(i===9||i===10)continue;            // проходы в середине каждой стороны
      add(i,5);add(i,14);add(5,i);add(14,i);
    }
  }else if(name==='rooms'){
    for(i=0;i<=19;i++){
      if(i<=6||i>=13)add(10,i);
      if(i<=4||i>=15)add(i,10);
    }
  }
  return o;
}
function levelObstacles(L){
  var seen={},out=[];
  L.obs.forEach(function(n){pattern(n).forEach(function(p){
    var k=p.x+','+p.y;
    if(p.y===10&&p.x>=7&&p.x<=12)return;   // клетки старта и две клетки перед головой всегда свободны
    if(!seen[k]){seen[k]=1;out.push(p);}
  });});
  return out;
}

/* ── сохранения ── */
Store.define('snake',{
  version:1,
  defaults:{settings:{mode:'classic',speed:'normal',bonus:false,level:1,view:'2d'},best:{},levels:{unlocked:1,best:{}},games:0},
  legacy:function(raw){
    /* старый рекорд из лаунчера (один на обе скорости) становится рекордом классики */
    var hi=parseInt(raw('aceon_hi_snake'),10)||0;
    return hi?{best:{'classic-normal':hi}}:null;
  }
});
var DB=Store.get('snake'),S=DB.settings;
if(MODES.indexOf(S.mode)<0)S.mode='classic';
if(!SPEED[S.speed])S.speed='normal';
S.bonus=!!S.bonus;
if(!(S.level>=1&&S.level<=DB.levels.unlocked))S.level=Math.min(DB.levels.unlocked,LEVELS.length);
function has3d(){return !!(window.Three3D&&Three3D.supported()&&window.SnakeView3D);}
if(S.view!=='3d'||!has3d())S.view='2d';
function save(){Store.save('snake');}
function bestKey(m,s,b){return m+'-'+s+(b?'-b':'');}
function bestOf(m,s,b){return DB.best[bestKey(m,s,b)]||0;}

/* свои звуки змейки */
Sound.define('eat',function(tm,tone){tone(tm,660,0.06,'square',0.05);tone(tm+0.05,990,0.08,'square',0.05);});
Sound.define('turn',function(tm,tone){tone(tm,320,0.025,'sine',0.03);});
Sound.define('bonus',function(tm,tone){[784,988,1175,1568].forEach(function(f,i){tone(tm+i*0.05,f,0.08,'square',0.05);});});
Sound.define('tick',function(tm,tone){tone(tm,1200,0.03,'square',0.03);});

/* ── состояние партии ── */
var G={
  state:'none',          // none | ready | run | pause | over | clear
  mode:'classic',speed:'normal',bonusOn:false,level:0,
  snake:[],prev:[],dir:{x:1,y:0},queue:[],food:null,score:0,obs:[],
  bonus:null,fx:{slow:0,ghost:0},clock:0,started:false,
  acc:0,last:0,eatFx:[],shake:0,deadAt:0,record:false,reason:'',lastTick:0
};
function isLevels(){return G.mode==='levels';}
function walls(){return G.mode!=='wrap';}
function stepMs(){
  var base=isLevels()?LEVELS[G.level-1].step:SPEED[G.speed];
  return G.fx.slow>G.clock?Math.round(base*1.6):base;
}

/* ════════ МЕНЮ ════════ */
function buildModes(){
  var list=$('mode-list');list.innerHTML='';
  MODES.forEach(function(m){
    var b=document.createElement('button');
    b.type='button';b.className='mode-card'+(S.mode===m?' sel':'');
    b.innerHTML='<span class="mode-name" data-i18n="mode.'+m+'"></span><span class="mode-desc" data-i18n="desc.'+m+'"></span>'+
      '<span class="mode-ico mode-ico-'+m+'"></span>';
    b.addEventListener('click',function(){S.mode=m;save();paintMenu();Sound.sfx('select');});
    list.appendChild(b);
  });
  I18n.apply(list);
}
function buildLevels(){
  var box=$('level-grid');box.innerHTML='';
  LEVELS.forEach(function(L,i){
    var n=i+1,b=document.createElement('button');
    var open=n<=DB.levels.unlocked;
    b.type='button';b.className='lv-btn'+(S.level===n?' sel':'')+(open?'':' locked')+(DB.levels.best[n]!=null?' done':'');
    b.disabled=!open;
    b.innerHTML='<b>'+n+'</b><small>'+L.target+'/'+L.time+'s</small>';
    b.addEventListener('click',function(){S.level=n;save();paintMenu();Sound.sfx('select');});
    box.appendChild(b);
  });
}
function buildBest(){
  var sp=['slow','normal','fast'];
  var h='<div class="bt-row bt-head"><span></span>';
  sp.forEach(function(s){h+='<span data-i18n="speed.'+s+'"></span>';});
  h+='</div>';
  [['classic',false],['classic',true],['wrap',false],['wrap',true]].forEach(function(r){
    h+='<div class="bt-row"><span><span data-i18n="mode.'+r[0]+'"></span>'+(r[1]?' +B':'')+'</span>';
    sp.forEach(function(s){
      var v=bestOf(r[0],s,r[1]),cur=S.mode===r[0]&&S.speed===s&&S.bonus===r[1];
      h+='<b class="'+(cur?'cur':'')+'">'+(v||'-')+'</b>';
    });
    h+='</div>';
  });
  var done=Object.keys(DB.levels.best).length;
  h+='<div class="bt-row bt-lv"><span data-i18n="mode.levels"></span><b>'+done+' / '+LEVELS.length+'</b></div>';
  $('best-table').innerHTML=h;
  I18n.apply($('best-table'));
}
function paintMenu(){
  buildModes();buildLevels();buildBest();
  var lv=S.mode==='levels';
  $('opt-speed').classList.toggle('hidden',lv);
  $('opt-bonus').classList.toggle('hidden',lv);
  $('opt-levels').classList.toggle('hidden',!lv);
  [['speed',S.speed],['bonus',S.bonus?'on':'off'],['view',S.view]].forEach(function(x){
    document.querySelectorAll('#seg-'+x[0]+' .seg-btn').forEach(function(b){b.classList.toggle('sel',b.dataset.v===x[1]);});
  });
  var alive=G.state==='run'||G.state==='pause'||(G.state==='ready'&&G.started);
  $('btn-continue').classList.toggle('hidden',!alive);
}

function showScreen(name){
  document.body.classList.toggle('screen-menu',name==='menu');
  document.body.classList.toggle('screen-game',name==='game');
  if(name==='menu'){if(G.state==='run')setPause(true);paintMenu();}
  Sound.music(name==='menu'?'menu':'game');
  window.scrollTo(0,0);
  if(name==='game'){
    useView(S.view);
    refit();
    /* после смены экрана браузер телефона ещё двигает прокрутку и панель адреса: пересчитать ещё раз */
    requestAnimationFrame(refit);
    setTimeout(refit,250);
    loop();
  }
}
function refit(){fit();render(1);}

/* ════════ ИГРА ════════ */
function newGame(){
  G.mode=S.mode;G.speed=S.speed;
  G.bonusOn=G.mode==='levels'?true:S.bonus;
  G.level=G.mode==='levels'?S.level:0;
  G.obs=isLevels()?levelObstacles(LEVELS[G.level-1]):[];
  G.snake=START.map(function(p){return {x:p.x,y:p.y};});
  G.prev=copy(G.snake);
  G.dir={x:1,y:0};G.queue=[];G.score=0;G.acc=0;G.eatFx=[];G.shake=0;G.record=false;G.reason='';
  G.bonus=null;G.food=null;G.fx={slow:0,ghost:0};G.clock=0;G.lastTick=0;G.started=false;
  spawn();
  G.state='ready';
  hide('over-modal');
  paintHud();
  showScreen('game');
  readyMsg();
  DB.games++;save();A.trackPlay();
}
function readyMsg(){
  var how=t(touch()?'msg.readyTouch':'msg.readyKeys');
  if(isLevels()){
    var L=LEVELS[G.level-1];
    boardMsg2(t('lvl.n',{n:G.level}),t('lvl.goal',{n:L.target,s:L.time})+'\n'+how);
  }else boardMsg('msg.ready',touch()?'msg.readyTouch':'msg.readyKeys');
}
function copy(list){return list.map(function(p){return {x:p.x,y:p.y};});}
function busy(x,y){
  return G.snake.some(function(s){return s.x===x&&s.y===y;})||
         G.obs.some(function(s){return s.x===x&&s.y===y;})||
         (G.food&&G.food.x===x&&G.food.y===y)||(G.bonus&&G.bonus.x===x&&G.bonus.y===y);
}
function freeCell(){
  var free=[];
  for(var y=0;y<GRID;y++)for(var x=0;x<GRID;x++)if(!busy(x,y))free.push({x:x,y:y});
  return free.length?free[Math.random()*free.length|0]:null;
}
function spawn(){
  G.food=null;
  G.food=freeCell();
  G.foodAt=performance.now();
}
function spawnBonus(force){
  if(!G.bonusOn||G.bonus||(!force&&Math.random()>BONUS_CHANCE))return;
  var types=isLevels()?LEVEL_BONUS:Object.keys(BONUS),sum=0,r,i;
  if(typeof force==='string')types=[force];
  types.forEach(function(k){sum+=BONUS[k].w;});
  r=Math.random()*sum;
  for(i=0;i<types.length;i++){r-=BONUS[types[i]].w;if(r<=0)break;}
  var type=types[Math.min(i,types.length-1)];
  if(type==='cut'&&G.snake.length<6&&typeof force!=='string')type='gold';   // короткой змейке резать нечего
  var c=freeCell();if(!c)return;
  G.bonus={type:type,x:c.x,y:c.y,until:G.clock+BONUS[type].life};
}

/* направление: в очереди до двух поворотов, разворот на 180 градусов запрещён */
function turn(x,y){
  if(G.state==='over'||G.state==='none'||G.state==='clear')return;
  if(G.state==='pause'){setPause(false);return;}
  var last=G.queue.length?G.queue[G.queue.length-1]:G.dir;
  if(G.state==='ready'){
    if(x===-G.dir.x&&y===-G.dir.y)return;     // назад в собственный хвост на старте нельзя
    G.queue=[{x:x,y:y}];start();return;
  }
  if((x===last.x&&y===last.y)||(x===-last.x&&y===-last.y))return;
  if(G.queue.length<2){G.queue.push({x:x,y:y});Sound.sfx('turn');}
}
function start(){G.state='run';G.started=true;G.acc=0;G.last=performance.now();hideMsg();paintHud();loop();}

function setPause(on){
  if(on&&G.state==='run'){G.state='pause';boardMsg('msg.paused',touch()?'msg.resumeTouch':'msg.resumeKeys');}
  else if(!on&&G.state==='pause'){G.state='run';G.last=performance.now();hideMsg();loop();}
  paintHud();
}

function step(){
  G.prev=copy(G.snake);
  if(G.queue.length)G.dir=G.queue.shift();
  var h={x:G.snake[0].x+G.dir.x,y:G.snake[0].y+G.dir.y};
  if(!walls()){h.x=(h.x+GRID)%GRID;h.y=(h.y+GRID)%GRID;}
  var eat=G.food&&h.x===G.food.x&&h.y===G.food.y;
  var bon=G.bonus&&h.x===G.bonus.x&&h.y===G.bonus.y?G.bonus:null;
  var grow=eat||(bon&&bon.type==='gold');
  /* хвост уходит в этом же шаге, поэтому в клетку хвоста ходить можно (если не растём) */
  var body=grow?G.snake:G.snake.slice(0,-1);
  var ghost=G.fx.ghost>G.clock;
  if(h.x<0||h.x>=GRID||h.y<0||h.y>=GRID){die('wall');return;}
  if(G.obs.some(function(s){return s.x===h.x&&s.y===h.y;})){die('wall');return;}
  if(!ghost&&body.some(function(s){return s.x===h.x&&s.y===h.y;})){die('self');return;}
  G.snake.unshift(h);
  if(!grow)G.snake.pop();
  if(eat){
    G.score++;
    G.eatFx.push({x:h.x,y:h.y,t:performance.now(),txt:'+1',c:'#ff2d78'});
    Sound.sfx('eat');
    spawn();
    spawnBonus();
  }
  if(bon)takeBonus(bon,h);
  if(eat||bon)paintHud();
  if(isLevels()&&G.score>=LEVELS[G.level-1].target){levelClear();return;}
  if(!G.food&&!G.bonus){die('full');return;}
}
function takeBonus(b,h){
  G.bonus=null;
  var now=performance.now();
  if(b.type==='gold'){G.score+=GOLD_POINTS;G.eatFx.push({x:h.x,y:h.y,t:now,txt:'+'+GOLD_POINTS,c:'#ffd23a'});}
  else if(b.type==='slow'){G.fx.slow=G.clock+FX_TIME;G.eatFx.push({x:h.x,y:h.y,t:now,txt:'SLOW',c:'#4fb8ff'});}
  else if(b.type==='ghost'){G.fx.ghost=G.clock+FX_TIME;G.eatFx.push({x:h.x,y:h.y,t:now,txt:'GHOST',c:'#d6c4ff'});}
  else if(b.type==='cut'){
    var n=Math.max(3,G.snake.length-Math.floor(G.snake.length/3));
    G.snake=G.snake.slice(0,n);G.prev=G.prev.slice(0,n);
    G.eatFx.push({x:h.x,y:h.y,t:now,txt:'CUT',c:'#ff8800'});
  }
  Sound.sfx('bonus');
}

/* ── конец партии ── */
function finishRun(){G.deadAt=performance.now();G.prev=copy(G.snake);Sound.duck(0.3,1800);paintHud();}
function die(reason){
  G.state='over';G.reason=reason;G.shake=reason==='time'?0:1;
  finishRun();
  if(!isLevels()){
    var k=bestKey(G.mode,G.speed,G.bonusOn),old=DB.best[k]||0;
    G.record=G.score>old;
    if(G.record)DB.best[k]=G.score;
    save();
    A.setHi('snake',G.score);
  }else G.record=false;
  Sound.sfx(G.record&&G.score>0?'win':'lose');
  setTimeout(showOver,reason==='time'?300:700);
}
function levelClear(){
  G.state='clear';G.shake=0;
  finishRun();
  var n=G.level,left=Math.max(0,Math.ceil((LEVELS[n-1].time*1000-G.clock)/1000));
  var prevBest=DB.levels.best[n];
  G.record=prevBest==null||left>prevBest;
  if(G.record)DB.levels.best[n]=left;          // лучший результат уровня: сколько секунд осталось
  if(n<LEVELS.length&&DB.levels.unlocked<n+1)DB.levels.unlocked=n+1;
  if(n<LEVELS.length)S.level=n+1;
  G.timeLeft=left;
  save();
  Sound.sfx('win');
  setTimeout(showOver,600);
}

function showOver(){
  if(G.state!=='over'&&G.state!=='clear')return;
  function row(k,v){return '<div class="ov-row"><span>'+t(k)+'</span><b>'+v+'</b></div>';}
  var title,rows='',again='over.again',cls='';
  if(G.state==='clear'){
    var last=G.level>=LEVELS.length;
    title=last?'over.allDone':'over.clear';cls='ok';
    rows=row('menu.level',G.level+' / '+LEVELS.length)+row('hud.score',G.score)+row('over.timeLeft',G.timeLeft+'s');
    again=last?'over.again':'over.next';
  }else{
    title=G.reason==='time'?'over.time':'over.title';
    if(isLevels()){
      var L=LEVELS[G.level-1];
      rows=row('menu.level',G.level+' / '+LEVELS.length)+row('hud.score',G.score+' / '+L.target);
      again='over.retry';
    }else{
      rows=row('hud.score',G.score)+row('hud.best',bestOf(G.mode,G.speed,G.bonusOn))+
        row('menu.mode',t('mode.'+G.mode)+(G.bonusOn?' +B':''))+row('menu.speed',t('speed.'+G.speed));
    }
  }
  var tt=$('over-title');tt.dataset.i18n=title;tt.textContent=t(title);tt.className='over-title '+cls;
  $('over-rows').innerHTML=rows;
  var rec=$('over-record');
  rec.classList.toggle('hidden',!(G.record&&(G.score>0||G.state==='clear')));
  rec.textContent=t(G.state==='clear'?'over.levelRecord':'over.record');
  var ag=$('over-again-t');ag.dataset.i18n=again;ag.textContent=t(again);
  show('over-modal');
}
function againClick(){
  if(G.state==='clear'&&G.level<LEVELS.length)S.level=G.level+1;
  else if(isLevels())S.level=G.level;
  save();
  newGame();
}

/* ── главный цикл: шаги по таймеру, кадры по requestAnimationFrame ── */
var raf=0;
function loop(){if(!raf)raf=requestAnimationFrame(frame);}
function frame(now){
  raf=0;
  if(G.state==='run'){
    var dt=Math.min(250,now-G.last);
    G.last=now;
    G.acc+=dt;G.clock+=dt;
    var guard=0;
    while(G.acc>=stepMs()&&G.state==='run'&&guard++<8){G.acc-=stepMs();step();}
    if(G.bonus&&G.clock>G.bonus.until)G.bonus=null;
    if(isLevels()&&G.state==='run'){
      var left=LEVELS[G.level-1].time*1000-G.clock;
      if(left<=0)die('time');
      else{
        var s=Math.ceil(left/1000);
        if(s<=10&&s!==G.lastTick){G.lastTick=s;Sound.sfx('tick');}
      }
    }
    paintTimers();
  }
  var k=G.state==='run'?Math.min(1,G.acc/stepMs()):1;
  render(k,now);
  var anim=G.state==='run'||G.eatFx.length||G.shake>0||((G.state==='over'||G.state==='clear')&&now-G.deadAt<900);
  var screen=document.body.classList.contains('screen-game');
  if(screen&&(anim||G.state==='ready'||G.state==='pause'))raf=requestAnimationFrame(frame);
}

/* ── кадр: общие данные для 2D и 3D ── */
function lerp(a,b,k){return a+(b-a)*k;}
function sceneOf(k,now){
  var n=G.snake.length,pts=[];
  for(var j=0;j<n;j++){
    var c=G.snake[j],p=G.prev[j]||G.prev[G.prev.length-1]||c;
    var x=c.x,y=c.y,jump=Math.abs(c.x-p.x)>1||Math.abs(c.y-p.y)>1;
    if(!jump){x=lerp(p.x,c.x,k);y=lerp(p.y,c.y,k);}   // через край поля без плавности
    pts.push({x:x,y:y});
  }
  var fxL=function(v){return v>G.clock?(v-G.clock)/FX_TIME:0;};
  return {
    grid:GRID,walls:walls(),obs:G.obs,food:G.food,foodAge:Math.max(0,Math.min(1,(now-(G.foodAt||0))/220)),
    bonus:G.bonus?{type:G.bonus.type,x:G.bonus.x,y:G.bonus.y,life:Math.max(0,(G.bonus.until-G.clock)/BONUS[G.bonus.type].life)}:null,
    pts:pts,dir:G.dir,dead:G.state==='over'&&G.reason!=='time',clear:G.state==='clear',
    fade:G.state==='over'?Math.max(.35,1-(now-G.deadAt)/900):1,
    ghost:fxL(G.fx.ghost),slow:fxL(G.fx.slow),
    eatFx:G.eatFx.map(function(f){return {x:f.x,y:f.y,e:(now-f.t)/450,txt:f.txt,c:f.c};}).filter(function(f){return f.e>=0&&f.e<1;}),
    shake:G.shake,now:now
  };
}
function render(k,now){
  now=now||performance.now();
  var sc=sceneOf(k,now);
  G.eatFx=G.eatFx.filter(function(f){return now-f.t<450;});
  if(G.shake>0)G.shake=Math.max(0,G.shake-0.06);
  if(view3d&&v3ready&&S.view==='3d')view3d.draw(sc);else draw2d(sc);
}

/* ════════ 2D ════════ */
var cv,ctx,cell=20,px=400,dpr=1;
var COL={bg:'#050510',grid:'#0b1830',body:'#00e5ff',body2:'#006f8a',head:'#80f0ff',food:'#ff2d78',eye:'#050510',wall:'#00e5ff',
         gold:'#ffd23a',slow:'#4fb8ff',cut:'#ff8800',ghost:'#d6c4ff'};
var BONUS_SIGN={gold:'5',slow:'S',cut:'X',ghost:'G'};

/* размер поля: квадрат, сколько позволяет окно (без CSS aspect-ratio, работает и в старых браузерах) */
function fit(){
  var wrap=$('board-wrap');if(!wrap||!document.body.classList.contains('screen-game'))return;
  var hud=$('hud').getBoundingClientRect(),dp=$('dpad');
  var dpH=getComputedStyle(dp).display==='none'?0:dp.getBoundingClientRect().height+10;
  var side=dpH&&!!(window.matchMedia&&matchMedia('(orientation:landscape) and (max-height:600px) and (pointer:coarse)').matches);   // телефон боком: крестовина сбоку
  var availW=wrap.parentNode.clientWidth-(side?dp.getBoundingClientRect().width+20:0);
  var availH=window.innerHeight-hud.bottom-(side?0:dpH)-16;
  var size=Math.max(160,Math.min(availW,availH));
  cell=Math.max(6,Math.floor(size/GRID));
  px=cell*GRID;
  dpr=Math.min(2,window.devicePixelRatio||1);
  cv.width=Math.round(px*dpr);cv.height=Math.round(px*dpr);
  cv.style.width=px+'px';cv.style.height=px+'px';
  wrap.style.width=px+'px';wrap.style.height=px+'px';
  ctx.setTransform(dpr,0,0,dpr,0,0);
  if(view3d)view3d.resize(px);
}

function rr(x,y,w,h,r){
  ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);
  ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath();
}
function draw2d(sc){
  if(!ctx)return;
  var now=sc.now;
  ctx.save();
  if(sc.shake>0){var a=sc.shake*cell*0.35;ctx.translate((Math.random()-.5)*a,(Math.random()-.5)*a);}
  /* фон и сетка */
  ctx.fillStyle=COL.bg;ctx.fillRect(-cell,-cell,px+2*cell,px+2*cell);
  if(sc.slow>0){ctx.fillStyle='rgba(79,184,255,'+(0.06+0.04*Math.sin(now/200))+')';ctx.fillRect(0,0,px,px);}
  ctx.strokeStyle=COL.grid;ctx.lineWidth=1;ctx.beginPath();
  for(var i=1;i<GRID;i++){ctx.moveTo(i*cell+.5,0);ctx.lineTo(i*cell+.5,px);ctx.moveTo(0,i*cell+.5);ctx.lineTo(px,i*cell+.5);}
  ctx.stroke();
  /* стены: сплошная рамка, без стен пунктир (через край можно пройти) */
  ctx.strokeStyle=sc.walls?COL.wall:'rgba(0,229,255,.35)';
  ctx.lineWidth=2;
  if(!sc.walls&&ctx.setLineDash)ctx.setLineDash([cell/2,cell/2]);
  ctx.strokeRect(1,1,px-2,px-2);
  if(ctx.setLineDash)ctx.setLineDash([]);
  /* препятствия */
  sc.obs.forEach(function(o){
    ctx.fillStyle='#0b2a44';rr(o.x*cell+1,o.y*cell+1,cell-2,cell-2,Math.max(1,cell*.12));ctx.fill();
    ctx.strokeStyle='rgba(0,229,255,.7)';ctx.lineWidth=1;ctx.stroke();
  });

  /* еда: пульсирует и появляется с увеличением */
  if(sc.food){
    var pulse=1+0.12*Math.sin(now/160);
    var fx=(sc.food.x+.5)*cell,fy=(sc.food.y+.5)*cell,fr=Math.max(0.1,cell*0.3*sc.foodAge*pulse);
    ctx.save();ctx.shadowColor=COL.food;ctx.shadowBlur=cell*0.8;ctx.fillStyle=COL.food;
    ctx.beginPath();ctx.arc(fx,fy,fr,0,Math.PI*2);ctx.fill();ctx.restore();
    ctx.fillStyle='rgba(255,255,255,.7)';ctx.beginPath();ctx.arc(fx-fr*.3,fy-fr*.3,fr*.28,0,Math.PI*2);ctx.fill();
  }
  /* бонус: ромб своего цвета со знаком, мигает в конце жизни, кольцо показывает оставшееся время */
  if(sc.bonus){
    var b=sc.bonus,bx=(b.x+.5)*cell,by=(b.y+.5)*cell,col=COL[b.type];
    var blink=b.life<0.3&&Math.sin(now/60)>0;
    if(!blink){
      ctx.save();ctx.translate(bx,by);ctx.rotate(now/600);
      ctx.shadowColor=col;ctx.shadowBlur=cell*0.9;ctx.fillStyle=col;
      var r=cell*0.36;ctx.beginPath();ctx.moveTo(0,-r);ctx.lineTo(r,0);ctx.lineTo(0,r);ctx.lineTo(-r,0);ctx.closePath();ctx.fill();
      ctx.restore();
      ctx.fillStyle=COL.bg;ctx.font='bold '+Math.max(7,Math.round(cell*0.36))+'px Tahoma,Arial,sans-serif';
      ctx.textAlign='center';ctx.textBaseline='middle';
      ctx.fillText(BONUS_SIGN[b.type],bx,by+1);
    }
    ctx.strokeStyle=col;ctx.globalAlpha=.6;ctx.lineWidth=2;
    ctx.beginPath();ctx.arc(bx,by,cell*0.58,-Math.PI/2,-Math.PI/2+Math.PI*2*b.life);ctx.stroke();ctx.globalAlpha=1;
  }

  /* змейка */
  var pts=sc.pts.map(function(p){return {x:(p.x+.5)*cell,y:(p.y+.5)*cell};}),n=pts.length;
  ctx.lineCap='round';ctx.lineJoin='round';
  if(sc.ghost>0)ctx.globalAlpha=.45+.15*Math.sin(now/90);
  for(var j=n-1;j>0;j--){
    var a1=pts[j],a2=pts[j-1];
    if(Math.abs(a1.x-a2.x)>cell*1.5||Math.abs(a1.y-a2.y)>cell*1.5)continue;   // разрыв на краю поля
    var q=j/Math.max(1,n-1);
    ctx.strokeStyle=sc.dead?'rgba(255,51,68,'+sc.fade+')':mix(COL.body,COL.body2,q);
    ctx.lineWidth=cell*(0.72-0.18*q);
    ctx.beginPath();ctx.moveTo(a1.x,a1.y);ctx.lineTo(a2.x,a2.y);ctx.stroke();
  }
  if(n){
    var hd=pts[0],rh=cell*0.42;
    ctx.save();
    if(!sc.dead){ctx.shadowColor=sc.clear?'#00ff88':COL.body;ctx.shadowBlur=cell*0.6;}
    ctx.fillStyle=sc.dead?'#ff3344':sc.clear?'#00ff88':COL.head;
    ctx.beginPath();ctx.arc(hd.x,hd.y,rh,0,Math.PI*2);ctx.fill();
    ctx.restore();
    var dx=sc.dir.x,dy=sc.dir.y,off=cell*0.17,fw=cell*0.12,er=Math.max(1.2,cell*0.08);
    ctx.fillStyle=COL.eye;
    [1,-1].forEach(function(s){
      var ex=hd.x+dx*fw+dy*off*s,ey=hd.y+dy*fw+dx*off*s;
      if(sc.dead){ctx.strokeStyle=COL.eye;ctx.lineWidth=Math.max(1,cell*0.06);ctx.beginPath();
        ctx.moveTo(ex-er,ey-er);ctx.lineTo(ex+er,ey+er);ctx.moveTo(ex+er,ey-er);ctx.lineTo(ex-er,ey+er);ctx.stroke();}
      else{ctx.beginPath();ctx.arc(ex,ey,er,0,Math.PI*2);ctx.fill();}
    });
  }
  ctx.globalAlpha=1;

  /* съели: кольцо и надпись */
  sc.eatFx.forEach(function(f){
    var e=f.e,cx=(f.x+.5)*cell,cy=(f.y+.5)*cell;
    ctx.globalAlpha=1-e;
    ctx.strokeStyle=f.c;ctx.lineWidth=2;
    ctx.beginPath();ctx.arc(cx,cy,cell*(0.4+e*1.1),0,Math.PI*2);ctx.stroke();
    ctx.fillStyle='#fff';
    ctx.font=Math.max(8,Math.round(cell*0.45))+'px "Press Start 2P",monospace';ctx.textAlign='center';ctx.textBaseline='alphabetic';
    ctx.fillText(f.txt,cx,cy-cell*(0.6+e));
  });
  ctx.globalAlpha=1;
  ctx.restore();
}
/* смешать два цвета #rrggbb */
function mix(a,b,q){
  var A=parseInt(a.slice(1),16),B=parseInt(b.slice(1),16);
  function ch(s){return Math.round(((A>>s)&255)*(1-q)+((B>>s)&255)*q);}
  return 'rgb('+ch(16)+','+ch(8)+','+ch(0)+')';
}

/* ════════ 3D: three.js качается при первом включении, до этого видно 2D ════════ */
var view3d=null,v3ready=false,v3state='none';
function useView(v){
  document.body.classList.toggle('view-3d',v==='3d'&&v3ready);
  paintViewBtn();
  if(v!=='3d'||!has3d())return;
  if(view3d){view3d.show(true);return;}
  if(v3state==='loading'||v3state==='failed')return;
  v3state='loading';
  var box=$('b3-load');box.textContent=t('b3.loading',{p:0});show('b3-load');
  Three3D.load(function(p){box.textContent=t('b3.loading',{p:Math.round(p*100)});}).then(function(THREE){
    view3d=SnakeView3D(THREE,$('board-wrap'));
    if(!view3d)throw new Error('webgl');
    v3ready=true;v3state='ready';hide('b3-load');
    if(S.view==='3d'){document.body.classList.add('view-3d');view3d.show(true);}else view3d.show(false);
    refit();loop();paintViewBtn();
  }).catch(function(){
    v3state='failed';hide('b3-load');S.view='2d';save();
    document.body.classList.remove('view-3d');paintViewBtn();refit();
  });
}
function toggleView(){
  if(!has3d()||v3state==='failed')return;
  S.view=S.view==='3d'?'2d':'3d';save();
  if(S.view==='2d'&&view3d)view3d.show(false);
  useView(S.view);refit();loop();Sound.sfx('select');
}
function paintViewBtn(){
  var b=$('btn-view');
  b.textContent=S.view==='3d'?'2D':'3D';
  b.disabled=!has3d()||v3state==='failed';
}

/* ── HUD и сообщения на поле ── */
function fmtTime(ms){var s=Math.max(0,Math.ceil(ms/1000));return Math.floor(s/60)+':'+('0'+s%60).slice(-2);}
function paintHud(){
  var lv=isLevels();
  document.body.classList.toggle('mode-levels',lv);
  var bl=$('hud-best-l');
  if(lv){
    var L=LEVELS[G.level-1];
    $('hud-score').textContent=G.score+'/'+L.target;
    bl.dataset.i18n='menu.level';
    $('hud-best').textContent=G.level;
    $('hud-mode').textContent=t('mode.levels');
  }else{
    $('hud-score').textContent=G.score;
    bl.dataset.i18n='hud.best';
    $('hud-best').textContent=Math.max(bestOf(G.mode,G.speed,G.bonusOn),G.score);
    $('hud-mode').textContent=t('mode.'+G.mode)+(G.bonusOn?' +B':'')+' / '+t('speed.'+G.speed);
  }
  bl.textContent=t(bl.dataset.i18n);
  var b=$('btn-pause');
  b.dataset.i18n=G.state==='pause'?'hud.resume':'hud.pause';
  b.textContent=t(b.dataset.i18n);
  b.disabled=!(G.state==='run'||G.state==='pause');
  paintTimers();
}
/* таймер уровня и действующие бонусы */
function paintTimers(){
  if(isLevels()){
    var left=LEVELS[G.level-1].time*1000-G.clock;
    $('hud-time').textContent=fmtTime(left);
    $('hud-time-c').classList.toggle('low',left<10000);
  }
  var h='';
  [['slow','S'],['ghost','G']].forEach(function(f){
    var v=G.fx[f[0]]-G.clock;
    if(v>0)h+='<span class="fx fx-'+f[0]+'"><i>'+f[1]+'</i>'+Math.ceil(v/1000)+'</span>';
  });
  var el=$('hud-fx');if(el.innerHTML!==h)el.innerHTML=h;
}
var msgKeys=null;
function boardMsg(title,sub){msgKeys=[title,sub];$('board-msg-t').textContent=t(title);$('board-msg-s').textContent=sub?t(sub):'';show('board-msg');}
function boardMsg2(title,sub){msgKeys=null;$('board-msg-t').textContent=title;$('board-msg-s').textContent=sub;show('board-msg');}
function hideMsg(){msgKeys=null;hide('board-msg');}

/* ════════ УПРАВЛЕНИЕ ════════ */
function touch(){return !!(window.matchMedia&&matchMedia('(pointer:coarse)').matches)||('ontouchstart' in window);}
var KEYS={ArrowUp:[0,-1],ArrowDown:[0,1],ArrowLeft:[-1,0],ArrowRight:[1,0],w:[0,-1],s:[0,1],a:[-1,0],d:[1,0],
          W:[0,-1],S:[0,1],A:[-1,0],D:[1,0],'ц':[0,-1],'ы':[0,1],'ф':[-1,0],'в':[1,0],'Ц':[0,-1],'Ы':[0,1],'Ф':[-1,0],'В':[1,0]};
document.addEventListener('keydown',function(e){
  if(!document.body.classList.contains('screen-game'))return;
  if(!$('over-modal').classList.contains('hidden')){
    if(e.key==='Enter'||e.key===' '){e.preventDefault();againClick();}
    return;
  }
  var d=KEYS[e.key];
  if(d){e.preventDefault();turn(d[0],d[1]);return;}
  if(e.key===' '||e.key==='p'||e.key==='P'||e.key==='Escape'){
    e.preventDefault();
    if(G.state==='run')setPause(true);else if(G.state==='pause')setPause(false);
  }
});
/* свайп по полю */
(function(){
  var sx=0,sy=0,on=false;
  var el=$('board-wrap');
  el.addEventListener('touchstart',function(e){var p=e.changedTouches[0];sx=p.clientX;sy=p.clientY;on=true;},{passive:true});
  el.addEventListener('touchmove',function(e){
    if(!on)return;
    var p=e.changedTouches[0],dx=p.clientX-sx,dy=p.clientY-sy;
    if(e.cancelable)e.preventDefault();          // поле не прокручивает страницу
    if(Math.max(Math.abs(dx),Math.abs(dy))<22)return;
    if(Math.abs(dx)>Math.abs(dy))turn(dx>0?1:-1,0);else turn(0,dy>0?1:-1);
    sx=p.clientX;sy=p.clientY;                   // можно вести палец дальше и поворачивать снова
  },{passive:false});
  el.addEventListener('touchend',function(){on=false;});
  el.addEventListener('click',function(){if(G.state==='pause')setPause(false);});
})();
/* крестовина */
document.querySelectorAll('#dpad .dp').forEach(function(b){
  var d=b.dataset.d.split(',').map(Number);
  function go(e){if(e.cancelable)e.preventDefault();turn(d[0],d[1]);}
  if(window.PointerEvent)b.addEventListener('pointerdown',go);
  else{b.addEventListener('touchstart',go);b.addEventListener('mousedown',go);}
});

/* пауза, если ушли с вкладки или из окна */
document.addEventListener('visibilitychange',function(){if(document.hidden)setPause(true);});
window.addEventListener('blur',function(){setPause(true);});
window.addEventListener('resize',function(){setTimeout(refit,60);});

function onLang(){
  paintMenu();paintHud();paintViewBtn();
  if(msgKeys)boardMsg(msgKeys[0],msgKeys[1]);
  else if(G.state==='ready')readyMsg();
  if(!$('over-modal').classList.contains('hidden'))showOver();
}

/* ── запуск ── */
function bindSeg(id,fn){
  document.querySelectorAll('#seg-'+id+' .seg-btn').forEach(function(b){
    b.addEventListener('click',function(){
      if(b.disabled)return;
      fn(b.dataset.v);save();paintMenu();Sound.sfx('select');
    });
  });
}
function boot(){
  A.topbar('sn.title');
  cv=$('board');ctx=cv.getContext('2d');
  I18n.apply();I18n.onChange(onLang);
  bindSeg('speed',function(v){S.speed=v;});
  bindSeg('bonus',function(v){S.bonus=v==='on';});
  bindSeg('view',function(v){
    S.view=v==='3d'&&has3d()?'3d':'2d';
    if(S.view==='3d')Three3D.load().catch(function(){});   // three.js качается, пока игрок в меню
  });
  if(!has3d()){var b3=document.querySelector('#seg-view [data-v="3d"]');b3.disabled=true;b3.classList.add('off');}
  $('btn-play').addEventListener('click',newGame);
  $('btn-continue').addEventListener('click',function(){showScreen('game');});
  $('btn-menu').addEventListener('click',function(){showScreen('menu');});
  $('btn-pause').addEventListener('click',function(){setPause(G.state==='run');});
  $('btn-view').addEventListener('click',toggleView);
  $('over-again').addEventListener('click',againClick);
  $('over-menu').addEventListener('click',function(){hide('over-modal');G.state='none';showScreen('menu');});
  paintHud();
  showScreen('menu');
}

window.AceonSnake={fit:refit,state:G,settings:S,db:DB,newGame:newGame,turn:turn,pause:setPause,step:step,showScreen:showScreen,
  LEVELS:LEVELS,levelObstacles:levelObstacles,spawnBonus:spawnBonus,view:function(){return view3d;}};
boot();
})();
