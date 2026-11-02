/* A.C.EON BUBBLES: меню, режимы, ввод, статистика, сохранения.
   Правила в rules.js, уровни в levels.js, рисование в view.js, тексты в lang.js. */
(function(){
'use strict';

var t=I18n.t,A=window.Arcade,B=window.BubRules,L=window.BubLevels;
var $=function(id){return document.getElementById(id);};
function show(id){$(id).classList.remove('hidden');}
function hide(id){$(id).classList.add('hidden');}

var MODES=['classic','levels','daily'],AIMS=['full','short','off'],THEMES=['neon','flat'];
var ART=new URL('../art/bubbles/',location.href).href;
/* картинки от Codex: пока не выложены, false; тогда всё рисуется кодом и лишних запросов нет */
var ART_READY=true;

Store.define('bubbles',{
  version:1,
  defaults:{settings:{mode:'classic',level:0,world:0,aim:'full',theme:'neon',symbols:false},
    stats:{games:0,best:0,popped:0,bigDrop:0,bestStreak:0,shots:0},
    lv:{unlocked:0,stars:{},best:{}},
    daily:{history:{},streak:0,lastDate:0},
    save:{classic:null,daily:null}},
  legacy:function(raw){var hi=parseInt(raw('aceon_hi_bubble'),10)||0;return hi?{stats:{games:0,best:hi,popped:0,bigDrop:0,bestStreak:0,shots:0}}:null;}
});
var DB=Store.get('bubbles'),S=DB.settings,ST=DB.stats,LV=DB.lv,DY=DB.daily;
if(MODES.indexOf(S.mode)<0)S.mode='classic';
if(AIMS.indexOf(S.aim)<0)S.aim='full';
if(THEMES.indexOf(S.theme)<0)S.theme='neon';
LV.unlocked=Math.max(0,Math.min(L.COUNT-1,LV.unlocked|0));
S.level=Math.max(0,Math.min(LV.unlocked,S.level|0));S.world=Math.floor(S.level/10);
function save(){Store.save('bubbles');}

/* ── звуки ── */
Sound.define('bShoot',function(tm,tone){tone(tm,520,0.08,'triangle',0.05,880);});
Sound.define('bBounce',function(tm,tone){tone(tm,900,0.03,'square',0.02);});
Sound.define('bStick',function(tm,tone,noise){noise(tm,0.04,0.12,1200);});
Sound.define('bPop',function(tm,tone){[0,1,2].forEach(function(i){tone(tm+i*0.04,700+i*220,0.06,'sine',0.06,1400+i*200);});});
Sound.define('bDrop',function(tm,tone){[0,1,2,3].forEach(function(i){tone(tm+i*0.05,1100-i*150,0.08,'triangle',0.05);});});
Sound.define('bRow',function(tm,tone,noise){noise(tm,0.2,0.25,300);tone(tm,110,0.25,'sawtooth',0.05,70);});
Sound.define('bBoom',function(tm,tone,noise){noise(tm,0.35,0.5,700);tone(tm,90,0.3,'sine',0.1,40);});
Sound.define('bSpecial',function(tm,tone){[784,988,1319].forEach(function(f,i){tone(tm+i*0.06,f,0.12,'triangle',0.06);});});

var G=null,view=null;

/* ── дата пузыря дня (UTC, одинаковая у всех) ── */
function dayNum(d){return d.getUTCFullYear()*10000+(d.getUTCMonth()+1)*100+d.getUTCDate();}
function today(){return dayNum(new Date());}
function dayShift(num,k){var d=new Date(Date.UTC(Math.floor(num/10000),Math.floor(num/100)%100-1,num%100));d.setUTCDate(d.getUTCDate()+k);return dayNum(d);}
function dayRec(n){return DY.history[n]||{b:0,n:0};}
function fmtDay(n){var d=n%100,m=Math.floor(n/100)%100;return (d<10?'0':'')+d+'.'+(m<10?'0':'')+m;}

/* ════════ МЕНЮ ════════ */
function starSvg(n,max){var h='';for(var i=0;i<(max||3);i++)h+='<svg class="star'+(i<n?' on':'')+'" viewBox="0 0 10 10"><path d="M5 .5l1.4 2.9 3.1.4-2.3 2.2.6 3.1L5 7.6 2.2 9.1l.6-3.1L.5 3.8l3.1-.4z"/></svg>';return h;}
function starsOf(n){return LV.stars[n]|0;}
function totalStars(){var s=0;for(var i=0;i<L.COUNT;i++)s+=starsOf(i);return s;}
function buildModes(){
  var list=$('mode-list');list.innerHTML='';
  MODES.forEach(function(m){
    var b=document.createElement('button');b.type='button';b.className='m-card-btn'+(S.mode===m?' sel':'');
    var ico=ART_READY?'<img class="m-img" alt="" src="'+ART+'mode_'+m+'.webp">':'<span class="m-ico b-ico-'+m+'"><i></i><i></i><i></i></span>';
    b.innerHTML=ico+'<span class="m-txt"><span class="m-name" data-i18n="mode.'+m+'"></span><span class="m-desc" data-i18n="desc.'+m+'"></span></span>';
    b.addEventListener('click',function(){S.mode=m;save();paintMenu();Sound.sfx('select');});
    list.appendChild(b);
  });
  I18n.apply(list);
}
function buildLevels(){
  var tabs='';
  L.WORLDS.forEach(function(w,i){
    var locked=i*10>LV.unlocked;
    tabs+='<button type="button" class="wt'+(S.world===i?' sel':'')+(locked?' locked':'')+'" data-w="'+i+'"'+(locked?' disabled':'')+'>'+
      (ART_READY?'<img alt="" src="'+ART+'world_'+w+'.webp">':'<span class="wt-pv wt-'+w+'"></span>')+'<span data-i18n="world.'+w+'"></span></button>';
  });
  $('worlds').innerHTML=tabs;
  var h='';
  for(var i=S.world*10;i<S.world*10+10;i++){
    var locked=i>LV.unlocked,b=LV.best[i];
    h+='<button type="button" class="lv'+(locked?' locked':'')+(i===S.level?' sel':'')+'" data-i="'+i+'"'+(locked?' disabled':'')+'>'+
      '<b>'+(Math.floor(i/10)+1)+'-'+(i%10+1)+'</b><span class="lv-st">'+(locked?'':starSvg(starsOf(i)))+'</span></button>';
  }
  $('levels').innerHTML=h;
  $('lv-stars').textContent=t('lv.stars',{n:totalStars(),m:L.COUNT*3});
  var d=L.get(S.level),def=L.DEFS[S.level],tags=[];
  if(def.ice)tags.push(t('tag.ice'));if(def.bomb)tags.push(t('tag.bomb'));if(def.stone||def.anchor)tags.push(t('tag.stone'));if(def.press)tags.push(t('tag.press',{n:def.press}));
  $('lv-note').innerHTML=t('lv.info',{shots:d.shots,s3:d.s3,s2:d.s2})+(tags.length?'<br>'+tags.join(' / '):'');
  I18n.apply($('lv-box'));
}
function buildDaily(){
  var num=today(),r=dayRec(num),h='';
  h+='<div class="dl-row"><span>'+t('daily.best')+'</span><b>'+(r.b||'-')+'</b></div>';
  h+='<div class="dl-row"><span>'+t('daily.tries')+'</span><b>'+r.n+'</b></div>';
  h+='<div class="dl-row"><span>'+t('daily.streak')+'</span><b>'+(DY.streak||0)+'</b></div><div class="dl-week">';
  for(var k=-6;k<=0;k++){var d=dayShift(num,k),x=dayRec(d);h+='<div class="dl-day'+(x.n?' ok':'')+(k===0?' now':'')+'"><b>'+(d%100)+'</b><span>'+(x.b||'')+'</span></div>';}
  $('daily-box').innerHTML='<h2 class="m-h m-h2">'+t('daily.today',{d:fmtDay(num)})+'</h2>'+h+'</div><div class="opt-note">'+t('daily.note')+'</div>';
}
function row(k,v){return '<div class="ov-row"><span>'+t(k)+'</span><b>'+v+'</b></div>';}
function buildStats(){
  var lvDone=0;for(var i=0;i<L.COUNT;i++)if(LV.best[i])lvDone++;
  $('stats').innerHTML=row('st.best',ST.best)+row('st.games',ST.games)+row('st.popped',ST.popped)+row('st.bigDrop',ST.bigDrop)+
    row('st.streak',ST.bestStreak)+row('st.levels',lvDone+' / '+L.COUNT)+row('st.stars',totalStars()+' / '+L.COUNT*3);
}
function segSel(id,v){var l=document.querySelectorAll('#'+id+' .seg-btn');for(var i=0;i<l.length;i++)l[i].classList.toggle('sel',l[i].getAttribute('data-v')===String(v));}
function canResume(){var sv=DB.save[S.mode];if(!sv||S.mode==='levels')return false;if(S.mode==='daily'&&sv.date!==today())return false;return true;}
function paintMenu(){
  buildModes();buildStats();
  $('lv-box').classList.toggle('hidden',S.mode!=='levels');
  $('daily-box').classList.toggle('hidden',S.mode!=='daily');
  if(S.mode==='levels')buildLevels();
  if(S.mode==='daily')buildDaily();
  segSel('seg-aim',S.aim);segSel('seg-theme',S.theme);segSel('seg-sym',S.symbols?'on':'off');
  $('btn-cont').classList.toggle('hidden',!canResume());
}
function showScreen(name){
  document.body.classList.toggle('screen-menu',name==='menu');
  document.body.classList.toggle('screen-game',name==='game');
  if(name==='menu'){paintMenu();hide('over-modal');hide('clear-modal');}
  Sound.music(name==='menu'?'menu':'game');
  window.scrollTo(0,0);
  if(name==='game'){layout();requestAnimationFrame(layout);setTimeout(layout,250);}
}

/* ════════ ИГРА ════════ */
function newGame(resume){
  var st,sv=DB.save[S.mode];
  if(resume===true&&sv){st=B.load(sv.st);}
  else if(S.mode==='levels'){var d=L.get(S.level);st=B.create({mode:'levels',layout:d.layout,colors:d.colors,seed:d.seed,press:d.press,shots:d.shots,level:S.level});}
  else if(S.mode==='daily'){var num=today(),r=dayRec(num);r.n++;DY.history[num]=r;st=B.create({mode:'daily',seed:num*13+7,startRows:6});st.date=num;}
  else st=B.create({mode:'classic',startRows:6});
  if(!(resume===true&&sv)){ST.games+=st.mode==='levels'?0:1;}
  G={st:st,paused:false,over:false,ang:Math.PI/2,fly:null,aimOn:!coarse(),trace:null,traceKey:''};
  save();A.trackPlay();
  view.reset();
  hide('over-modal');hide('clear-modal');hide('pause-ov');
  $('fx').innerHTML='';hudCache='';
  $('hint').classList.toggle('hidden',st.shots>0);
  setBg();
  showScreen('game');
}
function coarse(){return !!(window.matchMedia&&window.matchMedia('(pointer:coarse)').matches);}
function setBg(){
  var a=$('arena');
  var w=G&&G.st.mode==='levels'?L.WORLDS[Math.floor(G.st.level/10)]:'nebula';
  if(ART_READY&&G&&S.theme!=='flat')a.style.backgroundImage='linear-gradient(rgba(5,5,16,.35),rgba(5,5,16,.6)),url('+ART+w+'_bg.webp)';
  else a.style.backgroundImage='';
}
function setPause(on){
  if(!G||G.over)return;
  G.paused=on;$('pause-ov').classList.toggle('hidden',!on);
  if(on)Sound.duck(0.4,600);keys={};Sound.sfx('select');
}
function playing(){return G&&!G.over&&!G.paused&&document.body.classList.contains('screen-game');}

/* выстрел */
function shoot(){
  if(!playing()||G.fly)return;
  var st=G.st,tr=B.trace(st,G.ang);
  if(!tr.cell)return;
  G.fly={pts:tr.pts,i:1,x:tr.pts[0][0],y:tr.pts[0][1],cell:tr.cell,ball:st.cur};
  $('hint').classList.add('hidden');
  Sound.sfx('bShoot');
}
function swap(){if(!playing()||G.fly)return;if(B.swap(G.st)){Sound.sfx('select');G.traceKey='';}}
function stepFly(dt){
  var f=G.fly,left=B.SPEED*dt;
  while(left>0&&f){
    var p=f.pts[f.i],dx=p[0]-f.x,dy=p[1]-f.y,d=Math.sqrt(dx*dx+dy*dy);
    if(d<=left){f.x=p[0];f.y=p[1];left-=d;f.i++;
      if(f.i>=f.pts.length){G.fly=null;landNow(f);return;}
      Sound.sfx('bBounce');}
    else{f.x+=dx/d*left;f.y+=dy/d*left;left=0;}
  }
}
function landNow(f){
  var st=G.st;
  B.land(st,f.cell,f.ball);
  var ev=st.ev;st.ev=[];
  ev.forEach(onEvent);
  G.traceKey='';
  if(!st.over&&st.mode!=='levels'){DB.save[st.mode]={st:B.dump(st),date:st.date||0};save();}
}
function onEvent(ev){
  var st=G.st;
  view.event(ev,st);
  switch(ev.type){
    case 'land':
      var n=ev.pop.length+ev.boom.length;
      if(ev.boom.length)Sound.sfx('bBoom');else if(n)Sound.sfx('bPop');else Sound.sfx('bStick');
      if(ev.drop.length){setTimeout(function(){Sound.sfx('bDrop');},120);}
      if(ev.drop.length>=8)pop(t('pop.drop',{n:ev.drop.length}),'big');
      else if(st.streak>=3&&n)pop(t('pop.streak',{n:st.streak}),'combo');
      if(ev.score)scorePop(ev.score,ev.x,ev.y);
      break;
    case 'row':Sound.sfx('bRow');pop(t('pop.row'),'bad');break;
    case 'press':Sound.sfx('bRow');pop(t('pop.press'),'bad');break;
    case 'special':Sound.sfx('bSpecial');pop(t('pop.special.'+ev.t),'good');break;
    case 'clearBonus':Sound.sfx('win');pop(t('pop.clear'),'big');break;
    case 'win':levelDone();break;
    case 'lose':endGame(ev.why);break;
  }
}
var popN=0;
function pop(txt,cls){
  var el=document.createElement('div');el.className='pop '+(cls||'');el.textContent=txt;
  el.style.top=(30+(popN++%3)*8)+'%';$('fx').appendChild(el);
  setTimeout(function(){if(el.parentNode)el.parentNode.removeChild(el);},1500);
}
function scorePop(v,x,y){
  var el=document.createElement('div');el.className='spop';el.textContent='+'+v;
  el.style.left=(x/B.W*100)+'%';el.style.top=(y/B.H*100)+'%';$('fx').appendChild(el);
  setTimeout(function(){if(el.parentNode)el.parentNode.removeChild(el);},900);
}
function starsFor(st){var d=L.get(st.level);return st.shots<=d.s3?3:st.shots<=d.s2?2:1;}
/* конец классики, пузыря дня или проигрыш в уровне */
function endGame(why){
  var st=G.st;G.over=true;
  ST.popped+=st.popped+st.dropped;ST.bigDrop=Math.max(ST.bigDrop,st.bigDrop);ST.bestStreak=Math.max(ST.bestStreak,st.bestStreak);ST.shots+=st.shots;
  var rec=false,rows='';
  if(st.mode==='levels'){
    $('over-title').textContent=t(why==='shots'?'over.shots':'over.line');
    rows=row('over.level',lvName(st.level))+row('over.left',B.colored(st))+row('over.score',st.score);
  }else{
    DB.save[st.mode]=null;
    if(st.mode==='classic'){if(st.score>ST.best){ST.best=st.score;rec=true;}A.setHi('bubble',st.score);}
    if(st.mode==='daily'){var r=dayRec(st.date);if(st.score>r.b){r.b=st.score;rec=true;}DY.history[st.date]=r;
      if(DY.lastDate!==st.date){DY.streak=DY.lastDate===dayShift(st.date,-1)?(DY.streak||0)+1:1;DY.lastDate=st.date;}
      var ks=Object.keys(DY.history).sort();while(ks.length>40)delete DY.history[ks.shift()];}
    $('over-title').textContent=t('over.title');
    rows=row('over.score',st.score)+row('over.popped',st.popped+st.dropped)+row('over.bigDrop',st.bigDrop)+row('over.streak',st.bestStreak)+row('over.nshots',st.shots)+
      (st.mode==='daily'?row('daily.best',dayRec(st.date).b):row('st.best',ST.best));
  }
  save();
  Sound.sfx('lose');Sound.duck(0.3,2000);
  $('over-rows').innerHTML=rows;
  $('over-rec').classList.toggle('hidden',!rec);
  setTimeout(function(){if(G&&G.over)show('over-modal');},900);
}
function lvName(n){return (Math.floor(n/10)+1)+'-'+(n%10+1);}
function levelDone(){
  var st=G.st;G.over=true;
  var n=st.level,stars=starsFor(st),prev=LV.best[n],rec=!prev||st.shots<prev;
  LV.stars[n]=Math.max(starsOf(n),stars);LV.best[n]=rec?st.shots:prev;
  if(n+1<L.COUNT)LV.unlocked=Math.max(LV.unlocked,n+1);
  ST.popped+=st.popped+st.dropped;ST.bigDrop=Math.max(ST.bigDrop,st.bigDrop);
  S.level=Math.min(L.COUNT-1,n+1);S.world=Math.floor(S.level/10);
  save();
  Sound.sfx('win');Sound.duck(0.3,2000);
  var d=L.get(n);
  $('clear-stars').innerHTML=starSvg(stars);
  $('clear-rows').innerHTML=row('over.level',lvName(n))+row('clear.shots',st.shots+' / '+d.shots)+row('clear.need',t('clear.needv',{s3:d.s3,s2:d.s2}))+row('over.score',st.score)+row('clear.best',LV.best[n]);
  $('clear-rec').classList.toggle('hidden',!rec||!prev);
  $('clear-next').classList.toggle('hidden',n+1>=L.COUNT);
  setTimeout(function(){if(G&&G.over)show('clear-modal');},1100);
}

/* ════════ ВВОД ════════ */
var keys={};
function toField(e){var r=$('cv').getBoundingClientRect();return [(e.clientX-r.left)/r.width*B.W,(e.clientY-r.top)/r.height*B.H];}
function aimAt(p){var a=Math.atan2(B.SY-p[1],p[0]-B.SX);if(a<0)a=p[0]<B.SX?Math.PI:0;G.ang=Math.max(0.14,Math.min(Math.PI-0.14,a));G.aimOn=true;}
function bindPointer(){
  var cv=$('cv'),drag=null;
  function down(e){
    if(!G)return;
    if(G.paused){setPause(false);return;}
    if(G.over)return;
    var p=toField(e);
    if(view.hitNext(p[0],p[1])){swap();drag=null;return;}
    drag={id:e.pointerId,type:e.pointerType};
    if(p[1]<B.SY-B.R*0.8)aimAt(p);
  }
  function move(e){
    if(!G||G.over)return;
    var p=toField(e);
    if(drag&&drag.id===e.pointerId){if(p[1]<B.SY-B.R*0.8)aimAt(p);return;}
    if(e.pointerType==='mouse'&&p[1]<B.SY-B.R*0.8)aimAt(p);
  }
  function up(e){
    if(!drag||drag.id!==e.pointerId)return;drag=null;
    if(!G||G.over||G.paused)return;
    var p=toField(e);
    /* отпустил ниже пушки: выстрела нет (передумал) */
    if(p[1]>=B.SY-B.R*0.8)return;
    aimAt(p);shoot();
  }
  if(window.PointerEvent){
    cv.addEventListener('pointerdown',function(e){if(e.pointerType==='mouse'&&e.button!==0)return;e.preventDefault();down(e);});
    window.addEventListener('pointermove',move);
    window.addEventListener('pointerup',up);window.addEventListener('pointercancel',function(){drag=null;});
  }else{
    var tid=null;
    function tp(e,tt){return {clientX:tt.clientX,clientY:tt.clientY,pointerId:tt.identifier,pointerType:'touch'};}
    cv.addEventListener('touchstart',function(e){e.preventDefault();var tt=e.changedTouches[0];down(tp(e,tt));},{passive:false});
    cv.addEventListener('touchmove',function(e){e.preventDefault();var tt=e.changedTouches[0];move(tp(e,tt));},{passive:false});
    cv.addEventListener('touchend',function(e){var tt=e.changedTouches[0];up(tp(e,tt));});
    cv.addEventListener('mousedown',function(e){down({clientX:e.clientX,clientY:e.clientY,pointerId:1,pointerType:'mouse'});});
    window.addEventListener('mousemove',function(e){move({clientX:e.clientX,clientY:e.clientY,pointerId:1,pointerType:'mouse'});});
    window.addEventListener('mouseup',function(e){up({clientX:e.clientX,clientY:e.clientY,pointerId:1,pointerType:'mouse'});});
  }
  cv.addEventListener('contextmenu',function(e){e.preventDefault();swap();});
}
var KEYMAP={ArrowLeft:'l',KeyA:'l',ArrowRight:'r',KeyD:'r'};
document.addEventListener('keydown',function(e){
  if(!G||!document.body.classList.contains('screen-game'))return;
  if(e.code==='Escape'||e.code==='KeyP'){e.preventDefault();if(!G.over)setPause(!G.paused);return;}
  if(G.paused){if(e.code==='Enter'||e.code==='Space'){e.preventDefault();setPause(false);}return;}
  if(G.over)return;
  if(e.code==='Space'||e.code==='ArrowUp'||e.code==='KeyW'||e.code==='Enter'){e.preventDefault();if(!e.repeat)shoot();return;}
  if(e.code==='KeyX'||e.code==='KeyC'||e.code==='ShiftLeft'||e.code==='ArrowDown'||e.code==='KeyS'){e.preventDefault();if(!e.repeat)swap();return;}
  var k=KEYMAP[e.code];if(k){e.preventDefault();keys[k]=1;G.aimOn=true;}
});
document.addEventListener('keyup',function(e){var k=KEYMAP[e.code];if(k)keys[k]=0;});
window.addEventListener('blur',function(){keys={};});

/* ════════ ЦИКЛ ════════ */
var lastT=0;
function frame(now){
  requestAnimationFrame(frame);
  var dt=lastT?Math.min(0.034,(now-lastT)/1000):0.016;lastT=now;
  if(!G||!document.body.classList.contains('screen-game'))return;
  var st=G.st;
  if(playing()&&!document.hidden){
    if(keys.l||keys.r)G.ang=Math.max(0.14,Math.min(Math.PI-0.14,G.ang+((keys.l?1:0)-(keys.r?1:0))*1.5*dt));
    if(G.fly)stepFly(dt);
  }
  /* путь прицела пересчитывается, только когда изменился угол или поле */
  var aim=null;
  if(S.aim!=='off'&&G.aimOn&&!G.over){
    var key=G.ang.toFixed(4)+'|'+st.shots+'|'+st.cur.t+st.cur.c;
    if(key!==G.traceKey){G.traceKey=key;G.trace=B.trace(st,G.ang,S.aim==='short'?170:0);}
    aim=G.trace;
  }
  var every=B.rowEvery(st);
  view.draw(st,now,{theme:S.theme,symbols:S.symbols,ang:G.ang,aim:aim,ghost:S.aim==='full',fly:G.fly,world:st.level>=0?Math.floor(st.level/10):0,
    dots:st.mode==='levels'?null:[st.misses,every]},dt);
  paintHud();
}
var hudCache='';
function paintHud(){
  var st=G.st,cells=[];
  if(st.mode==='levels'){
    var d=L.get(st.level),left=d.shots-st.shots;
    cells.push(['hud.level',lvName(st.level)]);
    cells.push(['hud.shots',left]);
    cells.push(['hud.stars',starSvg(st.shots<d.s3?3:st.shots<d.s2?2:1)]);
    cells.push(['hud.score',st.score]);
  }else{
    cells.push(['hud.score',st.score]);
    cells.push([st.mode==='daily'?'hud.today':'hud.best',st.mode==='daily'?(dayRec(st.date).b||'-'):Math.max(ST.best,st.score)]);
    cells.push(['hud.streak',st.streak>1?'x'+st.streak:'-']);
  }
  var key=cells.map(function(c){return c[1];}).join('|')+I18n.lang;
  if(key===hudCache)return;hudCache=key;
  $('hud-cells').innerHTML=cells.map(function(c){return '<div class="hc"><span>'+t(c[0])+'</span><b>'+c[1]+'</b></div>';}).join('');
  $('hud-cells').classList.toggle('low',st.mode==='levels'&&L.get(st.level).shots-st.shots<=5);
  $('hud-mode').textContent=t('mode.'+st.mode);
}

/* поле 400 x H под окно */
function layout(){
  if(!G||!document.body.classList.contains('screen-game'))return;
  var arena=$('arena'),aw=arena.clientWidth-8,top=arena.getBoundingClientRect().top;
  var vh=window.innerHeight||document.documentElement.clientHeight;
  var ah=vh-top-20;
  var sc=Math.max(0.3,Math.min(aw/B.W,ah/B.H,1.7));
  var w=Math.round(B.W*sc),h=Math.round(B.H*sc);
  $('well').style.width=w+'px';$('well').style.height=h+'px';
  view.resize(w,h);
}
var rzT;
window.addEventListener('resize',function(){clearTimeout(rzT);rzT=setTimeout(layout,80);});
window.addEventListener('orientationchange',function(){setTimeout(layout,250);});
document.addEventListener('visibilitychange',function(){if(document.hidden&&playing())setPause(true);});

function onLang(){paintMenu();hudCache='';}
function bindSeg(id,fn){var l=document.querySelectorAll('#'+id+' .seg-btn');for(var i=0;i<l.length;i++)(function(b){b.addEventListener('click',function(){fn(b.getAttribute('data-v'));save();paintMenu();Sound.sfx('select');});})(l[i]);}
function boot(){
  A.topbar('b.title');
  I18n.apply();I18n.onChange(onLang);
  view=BubView($('cv'));
  if(ART_READY)BubArt.load(ART);
  bindPointer();
  bindSeg('seg-aim',function(v){S.aim=v;});
  bindSeg('seg-theme',function(v){S.theme=v;});
  bindSeg('seg-sym',function(v){S.symbols=v==='on';});
  $('lv-box').addEventListener('click',function(e){
    var n=e.target;while(n&&n!==this&&!(n.getAttribute&&(n.getAttribute('data-i')||n.getAttribute('data-w'))))n=n.parentNode;
    if(!n||n===this||n.disabled)return;
    if(n.getAttribute('data-w')!=null){S.world=+n.getAttribute('data-w');S.level=Math.min(LV.unlocked,S.world*10);}
    else S.level=+n.getAttribute('data-i');
    save();paintMenu();Sound.sfx('select');
  });
  $('btn-play').addEventListener('click',function(){newGame(false);});
  $('btn-cont').addEventListener('click',function(){newGame(true);});
  $('btn-menu').addEventListener('click',function(){if(G&&!G.over)G.paused=true;showScreen('menu');});
  $('btn-pause').addEventListener('click',function(){if(G)setPause(!G.paused);});
  $('btn-swap').addEventListener('click',swap);
  $('po-go').addEventListener('click',function(){setPause(false);});
  $('po-restart').addEventListener('click',function(){newGame(false);});
  $('po-menu').addEventListener('click',function(){showScreen('menu');});
  $('over-retry').addEventListener('click',function(){newGame(false);});
  $('over-menu').addEventListener('click',function(){showScreen('menu');});
  $('clear-next').addEventListener('click',function(){newGame(false);});
  $('clear-retry').addEventListener('click',function(){S.level=G.st.level;S.world=Math.floor(S.level/10);newGame(false);});
  $('clear-menu').addEventListener('click',function(){showScreen('menu');});
  paintMenu();
  showScreen('menu');
  requestAnimationFrame(frame);
}

window.AceonBubbles={g:function(){return G;},settings:S,db:DB,newGame:newGame,shoot:shoot,swap:swap,setPause:setPause};
boot();
})();
