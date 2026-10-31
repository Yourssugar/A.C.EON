/* A.C.EON BREAKOUT: меню, выбор уровня, игровой цикл, управление мышью, пальцем, клавишами и кнопками,
   звёзды кампании, статистика, сохранение, 2D/3D.
   Физика и правила в rules.js, уровни в levels.js, рисование в view2d.js и view3d.js, тексты в lang.js. */
(function(){
'use strict';

var t=I18n.t,A=window.Arcade,R=window.BkRules,LV=window.BkLevels;
var $=function(id){return document.getElementById(id);};
function show(id){$(id).classList.remove('hidden');}
function hide(id){$(id).classList.add('hidden');}

var MODES=['campaign','endless','time','daily'],DIFFS=['easy','normal','hard'];
var TYPES=['S','X','$','M','K','G','P','R','D'];

/* ── сохранения ── */
Store.define('breakout',{
  version:1,
  defaults:{settings:{mode:'campaign',diff:'normal',level:0,view:'2d',theme:'neon',big:false,buttons:false,sens:1},
    progress:{unlocked:0,stars:[],best:[]},stats:{},save:null,
    daily:{history:{},streak:0,lastDate:0,bestStreak:0}},
  legacy:function(raw){
    var hi=parseInt(raw('aceon_hi_brkout'),10)||0;
    return hi?{stats:{'endless-normal':{played:0,best:hi,level:0}}}:null;
  }
});
var DB=Store.get('breakout'),S=DB.settings,P=DB.progress;
if(MODES.indexOf(S.mode)<0)S.mode='campaign';
if(DIFFS.indexOf(S.diff)<0)S.diff='normal';
if(['neon','retro','space'].indexOf(S.theme)<0)S.theme='neon';
if(S.view!=='3d')S.view='2d';
S.sens=[1,1.5,2].indexOf(+S.sens)>=0?+S.sens:1;
P.unlocked=Math.max(0,Math.min(LV.COUNT-1,P.unlocked|0));
S.level=Math.max(0,Math.min(P.unlocked,S.level|0));
function save(){Store.save('breakout');}
function statKey(st){return st.mode==='daily'?'daily':st.mode+'-'+st.diff;}

/* ── испытание дня: дата по UTC, чтобы у всех был один и тот же уровень ── */
var D=DB.daily;if(!D.history||typeof D.history!=='object')D.history={};
function dayNum(dt){return dt.getUTCFullYear()*10000+(dt.getUTCMonth()+1)*100+dt.getUTCDate();}
function today(){return dayNum(new Date());}
function dayShift(num,k){var dt=new Date(Date.UTC(Math.floor(num/10000),Math.floor(num/100)%100-1,num%100));dt.setUTCDate(dt.getUTCDate()+k);return dayNum(dt);}
function dayText(num){var d=num%100,m=Math.floor(num/100)%100;return (d<10?'0':'')+d+'.'+(m<10?'0':'')+m+'.'+Math.floor(num/10000);}
function dayRec(num){return D.history[num]||{b:0,n:0,c:0};}
function curStreak(){var t0=today();return D.lastDate===t0||D.lastDate===dayShift(t0,-1)?D.streak:0;}
/* итог попытки: лучший счёт дня, пройдено ли, серия дней подряд; хранится не больше 40 дней */
function dailyFinish(st,cleared){
  var num=st.daily.date,r=dayRec(num),rec=st.score>r.b;
  if(rec)r.b=st.score;
  if(cleared&&!r.c){
    r.c=1;
    if(D.lastDate!==num){D.streak=D.lastDate===dayShift(num,-1)?D.streak+1:1;D.lastDate=num;}
    D.bestStreak=Math.max(D.bestStreak||0,D.streak);
  }
  D.history[num]=r;
  var keys=Object.keys(D.history).sort();while(keys.length>40)delete D.history[keys.shift()];
  var s0=stat('daily');if(st.score>(s0.best||0))s0.best=st.score;
  return rec;
}
function stat(k){if(!DB.stats[k])DB.stats[k]={played:0,best:0,level:0};return DB.stats[k];}
function setOf(){return {theme:S.theme,big:!!S.big};}
function starsTotal(){var n=0;for(var i=0;i<LV.COUNT;i++)n+=P.stars[i]||0;return n;}

/* ── звуки ── */
Sound.define('bwall',function(tm,tone){tone(tm,300,0.03,'square',0.02);});
Sound.define('bpad',function(tm,tone){tone(tm,220,0.06,'square',0.05);tone(tm+0.02,330,0.05,'triangle',0.04);});
Sound.define('bhit',function(tm,tone){tone(tm,520,0.04,'square',0.035);});
Sound.define('bclank',function(tm,tone,noise){noise(tm,0.05,0.25,4000);tone(tm,900,0.05,'triangle',0.03);});
Sound.define('bboom',function(tm,tone,noise){noise(tm,0.35,0.7,400);tone(tm,80,0.3,'sawtooth',0.1,40);});
Sound.define('bgood',function(tm,tone){[660,880,1320].forEach(function(f,i){tone(tm+i*0.05,f,0.08,'triangle',0.06);});});
Sound.define('bbad',function(tm,tone){[440,330,220].forEach(function(f,i){tone(tm+i*0.06,f,0.08,'square',0.04);});});
Sound.define('blost',function(tm,tone){[392,262,196].forEach(function(f,i){tone(tm+i*0.1,f,0.14,'triangle',0.08);});});
Sound.define('blaser',function(tm,tone){tone(tm,1400,0.05,'sawtooth',0.02,500);});
Sound.define('bportal',function(tm,tone){tone(tm,300,0.15,'sine',0.06,1200);});
Sound.define('bshot',function(tm,tone){tone(tm,700,0.12,'sawtooth',0.03,180);});
Sound.define('bbhit',function(tm,tone,noise){noise(tm,0.08,0.35,1500);tone(tm,160,0.1,'square',0.06,90);});
Sound.define('bshieldup',function(tm,tone){tone(tm,400,0.25,'sine',0.05,1400);});
Sound.define('bangry',function(tm,tone){[200,170,140].forEach(function(f,i){tone(tm+i*0.09,f,0.12,'sawtooth',0.06);});});
Sound.define('bbossdown',function(tm,tone,noise){noise(tm,0.9,0.8,300);[523,659,784,1046].forEach(function(f,i){tone(tm+0.3+i*0.1,f,0.18,'triangle',0.07);});});
Sound.define('bzap',function(tm,tone,noise){noise(tm,0.15,0.4,3000);tone(tm,120,0.2,'square',0.06,60);});
Sound.define('bgate',function(tm,tone,noise){noise(tm,0.3,0.3,700);tone(tm,150,0.25,'square',0.05,300);});
var breakSfx={};
function breakSound(m){
  var n=Math.min(8,m),name='bbr'+n;
  if(!breakSfx[name]){breakSfx[name]=1;Sound.define(name,function(tm,tone,noise){noise(tm,0.06,0.3,2500);tone(tm,440*Math.pow(2,(n-1)/6),0.08,'square',0.04);});}
  Sound.sfx(name);
}

var G=null;

/* ════════ МЕНЮ ════════ */
function buildModes(){
  var list=$('mode-list');list.innerHTML='';
  MODES.forEach(function(m){
    var b=document.createElement('button');
    b.type='button';b.className='m-card-btn'+(S.mode===m?' sel':'');
    b.innerHTML='<canvas class="m-ico" width="40" height="40"></canvas><span class="m-txt"><span class="m-name" data-i18n="mode.'+m+'"></span><span class="m-desc" data-i18n="desc.'+m+'"></span></span>';
    b.addEventListener('click',function(){S.mode=m;save();paintMenu();Sound.sfx('select');});
    list.appendChild(b);
    modeIcon(b.querySelector('canvas'),m);
  });
  I18n.apply(list);
}
function modeIcon(cv,m){
  var g=cv.getContext('2d'),T=BkTheme.get(setOf());
  g.fillStyle=T.bg[0];g.fillRect(0,0,40,40);
  if(m==='daily'){
    /* листок календаря с золотым кирпичом */
    g.fillStyle='#e8ecf8';g.fillRect(7,8,26,24);g.fillStyle=T.hp[2];g.fillRect(7,8,26,7);
    g.fillStyle='#e8ecf8';g.fillRect(12,5,3,6);g.fillRect(25,5,3,6);
    g.fillStyle=T.gold;g.fillRect(12,19,16,8);g.fillStyle='rgba(255,255,255,.6)';g.fillRect(19,20,2,6);
    return;
  }
  var rows=m==='campaign'?[[2,2,2],[1,0,1],[1,1,1]]:m==='endless'?[[2,1,2],[1,2,1],[0,1,0]]:[[2,2,2],[2,2,2],[2,2,2]];
  rows.forEach(function(r,y){r.forEach(function(v,x){if(!v)return;g.fillStyle=T.hp[v===2?2:0];g.fillRect(5+x*11,5+y*7,9,5);});});
  g.fillStyle=T.pad[0];g.fillRect(14,33,12,3);
  g.fillStyle=T.ball;g.beginPath();g.arc(m==='time'?28:22,27,2.5,0,Math.PI*2);g.fill();
  if(m==='time'){g.strokeStyle='#ff3355';g.setLineDash([2,2]);g.beginPath();g.moveTo(0,29.5);g.lineTo(40,29.5);g.stroke();g.setLineDash([]);}
}
function starSvg(n,max){
  var h='';for(var i=0;i<(max||3);i++)h+='<svg class="star'+(i<n?' on':'')+'" viewBox="0 0 10 10"><path d="M5 .5l1.4 2.9 3.1.4-2.3 2.2.6 3.1L5 7.6 2.2 9.1l.6-3.1L.5 3.8l3.1-.4z"/></svg>';
  return h;
}
function buildLevels(){
  var box=$('levels'),h='';
  for(var w=0;w<3;w++){
    h+='<div class="lv-world"><span data-i18n="world.'+w+'"></span></div><div class="lv-grid">';
    for(var i=w*10;i<w*10+10;i++){
      var locked=i>P.unlocked;
      h+='<button type="button" class="lv'+(locked?' locked':'')+(i===S.level?' sel':'')+'" data-i="'+i+'"'+(locked?' disabled':'')+'><b>'+(i+1)+'</b><span class="lv-st">'+(locked?'':starSvg(P.stars[i]||0))+'</span></button>';
    }
    h+='</div>';
  }
  box.innerHTML=h;I18n.apply(box);
  $('lv-stars').textContent=t('stars.total',{n:starsTotal(),m:LV.COUNT*3});
}
function buildStats(){
  var h='<div class="st-row st-head"><span></span><span data-i18n="st.games"></span><span data-i18n="st.best"></span><span data-i18n="st.level"></span></div>';
  [['endless','mode.endless'],['time','mode.time']].forEach(function(m){
    DIFFS.forEach(function(d){
      var k=m[0]+'-'+d,s=DB.stats[k]||{played:0,best:0,level:0};
      var cur=S.mode===m[0]&&S.diff===d;
      h+='<div class="st-row'+(cur?' cur':'')+'"><span><span data-i18n="'+m[1]+'"></span> / <span data-i18n="diff.'+d+'"></span></span><b>'+s.played+'</b><b>'+(s.best||'-')+'</b><b>'+(m[0]==='endless'?(s.level||'-'):'-')+'</b></div>';
    });
  });
  var dd=DB.stats['daily']||{played:0,best:0};
  h+='<div class="st-row'+(S.mode==='daily'?' cur':'')+'"><span data-i18n="mode.daily"></span><b>'+dd.played+'</b><b>'+(dd.best||'-')+'</b><b>'+(curStreak()||'-')+'</b></div>';
  var c=DB.stats['campaign']||{played:0};
  h+='<div class="st-row'+(S.mode==='campaign'?' cur':'')+'"><span data-i18n="mode.campaign"></span><b>'+c.played+'</b><b>'+starsTotal()+'/'+LV.COUNT*3+'</b><b>'+Math.min(LV.COUNT,P.unlocked+1)+'</b></div>';
  $('stats').innerHTML=h;I18n.apply($('stats'));
}
/* кирпичи: маленький рисунок и описание */
function buildLegend(){
  var h='';
  TYPES.forEach(function(ty){h+='<div class="lg-row"><canvas class="lg-cv" width="48" height="24" data-t="'+ty+'"></canvas><span data-i18n="new.'+ty+'"></span></div>';});
  $('legend').innerHTML=h;I18n.apply($('legend'));
  var cvs=$('legend').querySelectorAll('canvas');
  for(var i=0;i<cvs.length;i++)brickPic(cvs[i],cvs[i].getAttribute('data-t'));
}
function brickPic(cv,ty){
  var st={bricks:[{id:1,x:2,y:1,w:R.BW,h:R.BH,t:ty==='$'?'$':ty,hp:ty==='R'?2:1,max:ty==='R'?2:1,alive:true,vx:1,regen:0}],paddle:{x:-999,y:0,w:0,h:0},
    balls:[],drops:[],debris:[],lasers:[],fx:{},mode:''};
  var tmp=document.createElement('canvas'),v=BkView2D(tmp);v.resize(1);
  v.draw(st,performance.now(),setOf());
  var g=cv.getContext('2d');g.clearRect(0,0,48,24);g.drawImage(tmp,0,0,48,24,0,0,48,24);
}
/* окно испытания дня в меню: дата, условие, раскладка, лучший счёт, попытки, серия, неделя */
function buildDaily(){
  var num=today(),info=LV.daily(num),r=dayRec(num);
  function row(k,v){return '<div class="dl-row"><span>'+t(k)+'</span><b>'+v+'</b></div>';}
  var h='<div class="dl-head"><h2 class="m-h m-h2">'+t('daily.today',{d:dayText(num)})+'</h2>'+(r.c?'<span class="dl-ok">'+starSvg(1,1)+'</span>':'')+'</div>';
  h+='<div class="dl-main"><canvas class="dl-map" width="120" height="90"></canvas><div class="dl-info">';
  h+='<div class="dl-cond"><span>'+t('daily.cond')+'</span><b>'+t('mod.'+info.mod)+'</b></div>';
  h+=row('daily.best',r.b||'-')+row('daily.tries',r.n)+row('daily.streak',curStreak());
  h+='</div></div><div class="dl-wk-h">'+t('daily.week')+'</div><div class="dl-week">';
  for(var k=-6;k<=0;k++){
    var d=dayShift(num,k),x=dayRec(d);
    h+='<div class="dl-day'+(x.c?' ok':x.n?' tried':'')+(k===0?' now':'')+'"><b>'+(d%100)+'</b><span>'+(x.b||'')+'</span></div>';
  }
  h+='</div><div class="opt-note">'+t('daily.note')+'</div>';
  $('daily-box').innerHTML=h;
  miniMap($('daily-box').querySelector('canvas'),info.rows);
}
/* уменьшенная раскладка уровня */
function miniMap(cv,rows){
  var g=cv.getContext('2d'),T=BkTheme.get(setOf()),cw=cv.width/12,chh=Math.min(8,cv.height/Math.max(8,rows.length+2));
  g.fillStyle=T.bg[0];g.fillRect(0,0,cv.width,cv.height);
  var map={'1':T.hp[0],'2':T.hp[1],'3':T.hp[2],S:T.steel,X:T.X,'$':T.gold,M:T.M,N:T.M,R:T.R,K:T.K,G:T.G,D:T.D,P:'#00e5ff',Q:'#ff2d78'};
  rows.forEach(function(row,y){for(var x=0;x<12;x++){var c=map[row[x]];if(!c)continue;g.fillStyle=c;g.fillRect(x*cw+1,4+y*chh,cw-2,chh-2);}});
  g.fillStyle=T.pad[0];g.fillRect(cv.width/2-12,cv.height-7,24,3);
}
function paintMenu(){
  buildModes();buildStats();buildLevels();buildLegend();
  var daily=S.mode==='daily';
  $('daily-box').classList.toggle('hidden',!daily);
  $('h-diff').classList.toggle('hidden',daily);$('seg-diff').classList.toggle('hidden',daily);$('diff-note').classList.toggle('hidden',daily);
  if(daily)buildDaily();
  [['diff',S.diff],['view',S.view],['big',S.big?'yes':'no'],['buttons',S.buttons?'yes':'no'],['sens',String(S.sens)]].forEach(function(x){
    var list=document.querySelectorAll('#seg-'+x[0]+' .seg-btn');
    for(var i=0;i<list.length;i++)list[i].classList.toggle('sel',list[i].getAttribute('data-v')===x[1]);
  });
  var b3=document.querySelector('#seg-view [data-v="3d"]');
  if(!has3d()){b3.disabled=true;b3.classList.add('off');}
  var th=document.querySelectorAll('#themes .th-card');
  for(var i=0;i<th.length;i++){th[i].classList.toggle('sel',th[i].getAttribute('data-v')===S.theme);BkView2D.swatch(th[i].querySelector('canvas'),th[i].getAttribute('data-v'));}
  $('diff-note').textContent=t('diffd.'+S.diff);
  $('levels-box').classList.toggle('hidden',S.mode!=='campaign');
  $('btn-continue').classList.toggle('hidden',!((G&&!G.over)||(DB.save&&DB.save.st)));
  applyLook();
}
function applyLook(){
  var b=document.body;
  ['neon','retro','space'].forEach(function(x){b.classList.toggle('th-'+x,S.theme===x);});
  b.classList.toggle('big',!!S.big);
}
function showScreen(name){
  document.body.classList.toggle('screen-menu',name==='menu');
  document.body.classList.toggle('screen-game',name==='game');
  if(name==='menu'){persist();paintMenu();hide('over-modal');hide('clear-modal');}
  Sound.music(name==='menu'?'menu':'game');
  window.scrollTo(0,0);
  if(name==='game'){useView(S.view);layout();requestAnimationFrame(layout);setTimeout(layout,250);}
}

/* ════════ ПАРТИЯ ════════ */
function newGame(level){
  var lv=S.mode==='campaign'?(level==null?S.level:level):0,st;
  if(S.mode==='daily'){
    var num=today(),r=dayRec(num);
    st=R.create({mode:'daily',diff:'normal',level:0,daily:{date:num,mod:LV.daily(num).mod}});
    r.n++;D.history[num]=r;
  }else st=R.create({mode:S.mode,diff:S.diff,level:lv});
  G={st:st,paused:false,over:false};
  stat(S.mode==='campaign'?'campaign':statKey(st)).played++;save();
  A.trackPlay();
  hide('over-modal');hide('clear-modal');hide('pause-ov');
  $('fx').innerHTML='';
  levelIntro();
  persist();
  showScreen('game');
}
/* заново: тот же режим и сложность, что в последней партии */
function retry(){
  if(G){S.mode=G.st.mode;if(G.st.mode!=='daily')S.diff=G.st.diff;}
  newGame(G&&G.st.mode==='campaign'?G.st.level:null);
}
function persist(){
  if(!G)return;
  if(G.over||G.st.state==='clear'){DB.save=null;save();return;}
  G.st.ev=[];
  G.st.balls.forEach(function(b){b.trail=null;});
  DB.save={st:G.st};save();
}
function resume(){
  if((!G||G.over)&&DB.save&&DB.save.st)G={st:DB.save.st,paused:true,over:false};
  if(!G)return;
  G.paused=true;hide('over-modal');hide('clear-modal');show('pause-ov');
  showScreen('game');
}
function setPause(on){
  if(!G||G.over||G.st.state==='clear')return;
  G.paused=on;
  $('pause-ov').classList.toggle('hidden',!on);
  if(on){persist();Sound.duck(0.4,600);}
  G.st.padDir=0;keys={};
  Sound.sfx('select');
}
function playing(){return G&&!G.over&&!G.paused&&document.body.classList.contains('screen-game');}

/* новые кирпичи: при первом появлении в кампании короткая подсказка */
function levelIntro(){
  var st=G.st,el=$('intro');
  el.classList.add('hidden');
  if(st.boss){
    el.innerHTML='<div class="in-h boss-h">'+t('boss.title')+'</div><div class="in-boss">'+t('boss.'+st.boss.kind)+'</div><div class="in-txt">'+t('bossd.'+st.boss.kind)+'</div>';
    el.classList.remove('hidden');return;
  }
  if(st.mode==='daily'){
    el.innerHTML='<div class="in-h">'+t('daily.cond')+'</div><div class="in-txt">'+t('mod.'+st.daily.mod)+'</div>';
    el.classList.remove('hidden');return;
  }
  if(st.mode!=='campaign')return;
  var seen={},cur={};
  for(var i=0;i<st.level;i++)LV.CAMPAIGN[i].join('').split('').forEach(function(c){seen[c==='N'?'M':c==='Q'?'P':c]=1;});
  LV.CAMPAIGN[st.level].join('').split('').forEach(function(c){c=c==='N'?'M':c==='Q'?'P':c;if(TYPES.indexOf(c)>=0&&!seen[c])cur[c]=1;});
  var list=Object.keys(cur);if(!list.length)return;
  var h='<div class="in-h">'+t('new.title')+'</div>';
  list.forEach(function(ty){h+='<div class="in-row"><canvas width="48" height="24" data-t="'+ty+'"></canvas><span>'+t('new.'+ty)+'</span></div>';});
  el.innerHTML=h;el.classList.remove('hidden');
  var cvs=el.querySelectorAll('canvas');for(var k=0;k<cvs.length;k++)brickPic(cvs[k],cvs[k].getAttribute('data-t'));
}

/* ── события правил ── */
function onEvent(ev){
  var st=G.st,set=setOf();
  if(view())view().event(ev,st,set);
  switch(ev.type){
    case 'wall':Sound.sfx('bwall');break;
    case 'paddle':Sound.sfx('bpad');break;
    case 'hit':Sound.sfx('bhit');break;
    case 'clank':Sound.sfx('bclank');break;
    case 'break':
      breakSound(ev.m);
      if(st.combo>0&&st.combo%10===0)pop(t('pop.series',{n:R.mult(st)}),'combo');
      break;
    case 'explode':Sound.sfx('bboom');break;
    case 'bonus':Sound.sfx(ev.bad?'bbad':'bgood');pop(t('bonus.'+ev.bonus),ev.bad?'bad':'good');break;
    case 'lost':Sound.sfx('blost');if(st.lives>0||st.mode==='time')pop(t('pop.lost'),'bad');break;
    case 'laser':Sound.sfx('blaser');break;
    case 'portal':Sound.sfx('bportal');break;
    case 'gates':Sound.sfx('bgate');pop(t('pop.gates'),'good');break;
    case 'ouch':Sound.sfx('bbad');pop(t('pop.ouch'),'bad');break;
    case 'shield':Sound.sfx('bpad');pop(t('pop.shield'),'good');break;
    case 'launch':$('intro').classList.add('hidden');break;
    case 'bossShot':Sound.sfx('bshot');break;
    case 'bossHit':Sound.sfx('bbhit');break;
    case 'bossShield':Sound.sfx('bshieldup');break;
    case 'gatesUp':Sound.sfx('bgate');break;
    case 'bossAngry':Sound.sfx('bangry');pop(t('pop.angry'),'bad');break;
    case 'bossDown':Sound.sfx('bbossdown');Sound.duck(0.3,1500);pop(t('pop.boss'),'big');break;
    case 'zap':Sound.sfx('bzap');pop(t('pop.zap'),'bad');break;
    case 'clear':levelDone(ev);break;
    case 'over':gameOver(ev.crushed?'over.crushed':'over.lose');break;
    case 'done':gameOver('over.time');break;
  }
}
var popN=0;
function pop(txt,cls){
  var el=document.createElement('div');
  el.className='pop '+(cls||'');el.textContent=txt;
  el.style.top=(40+(popN++%3)*8)+'%';
  $('fx').appendChild(el);
  setTimeout(function(){if(el.parentNode)el.parentNode.removeChild(el);},1600);
}

function levelDone(ev){
  var st=G.st;
  Sound.sfx('win');Sound.duck(0.3,2000);
  if(ev.clean)pop(t('pop.clean'),'good');
  if(st.mode==='endless'){
    /* бесконечный: короткая пауза и следующий уровень */
    var k=statKey(st),s=stat(k);
    if(st.level+2>(s.level||0))s.level=st.level+2;
    save();
    setTimeout(function(){
      if(!G||G.st!==st)return;
      R.nextLevel(st);pop(t('pop.level',{n:st.level+1}),'lvl');persist();
    },1400);
    return;
  }
  if(st.mode==='daily'){dailyOver(true);return;}
  /* кампания: звёзды, открыть следующий уровень */
  var i=st.level,rec=st.score>(P.best[i]||0);
  P.stars[i]=Math.max(P.stars[i]||0,st.stars);
  if(rec)P.best[i]=st.score;
  if(i+1<LV.COUNT)P.unlocked=Math.max(P.unlocked,i+1);
  S.level=Math.min(LV.COUNT-1,i+1);
  DB.save=null;save();
  $('clear-stars').innerHTML=starSvg(st.stars);
  var list='';
  [[1,t('star.1')],[st.lost===0,t('star.2')],[st.levelTime<=st.par,t('star.3',{s:st.par})]].forEach(function(x){
    list+='<div class="sl'+(x[0]?' ok':'')+'">'+starSvg(x[0]?1:0,1)+'<span>'+x[1]+'</span></div>';
  });
  $('star-list').innerHTML=list;
  function row(k,v){return '<div class="ov-row"><span>'+t(k)+'</span><b>'+v+'</b></div>';}
  $('clear-rows').innerHTML=row('clear.time',fmt(st.levelTime))+row('clear.timeb',ev.timeBonus)+row('clear.clean',ev.clean)+row('over.score',st.score);
  $('clear-rec').classList.toggle('hidden',!rec);
  var last=i+1>=LV.COUNT;
  $('clear-next').classList.toggle('hidden',last);
  if(last)pop(t('clear.last'),'big');
  setTimeout(function(){if(G&&G.st.state==='clear')show('clear-modal');},900);
}
/* конец испытания дня (пройдено или нет): итог в общем окне конца игры */
function dailyOver(cleared){
  var st=G.st;if(G.over)return;
  G.over=true;st.padDir=0;
  var rec=dailyFinish(st,cleared);
  DB.save=null;save();
  if(!cleared){Sound.sfx('lose');Sound.duck(0.3,2500);}
  $('over-title').textContent=t(cleared?'over.daily':'over.lose');
  $('over-title').className='over-title '+(cleared?'win':'lose');
  var r=dayRec(st.daily.date);
  function row(k,v){return '<div class="ov-row"><span>'+t(k)+'</span><b>'+v+'</b></div>';}
  $('over-rows').innerHTML=row('over.score',st.score)+row('over.today',r.b)+row('over.tries',r.n)+row('over.streak',curStreak())+row('over.combo',st.maxCombo);
  $('over-rec').classList.toggle('hidden',!rec||r.n<2);
  setTimeout(function(){if(G&&G.over)show('over-modal');},900);
}
function gameOver(title){
  var st=G.st;if(G.over)return;
  if(st.mode==='daily'){dailyOver(false);return;}
  G.over=true;st.padDir=0;
  var rec=false;
  if(st.mode!=='campaign'){
    var s=stat(statKey(st));
    if(st.score>(s.best||0)){s.best=st.score;rec=true;}
    if(st.mode==='endless'&&st.level+1>(s.level||0))s.level=st.level+1;
    if(st.mode==='endless'&&st.diff==='normal')A.setHi('brkout',st.score);
  }
  DB.save=null;save();
  Sound.sfx(title==='over.time'?'win':'lose');Sound.duck(0.3,2500);
  $('over-title').textContent=t(title);
  $('over-title').className='over-title '+(title==='over.time'?'win':'lose');
  function row(k,v){return '<div class="ov-row"><span>'+t(k)+'</span><b>'+v+'</b></div>';}
  var h=row('over.score',st.score);
  if(st.mode==='campaign')h+=row('over.level',(Math.floor(st.level/10)+1)+'-'+(st.level%10+1));
  if(st.mode==='endless')h+=row('over.level',st.level+1);
  h+=row('over.bricks',st.bricksBroken)+row('over.combo',st.maxCombo);
  $('over-rows').innerHTML=h;
  $('over-rec').classList.toggle('hidden',!rec);
  setTimeout(function(){if(G&&G.over)show('over-modal');},900);
}
function fmt(s){s=Math.max(0,s);var m=Math.floor(s/60),r=Math.floor(s%60);return m+':'+(r<10?'0':'')+r;}

/* ════════ ВВОД ════════ */
var keys={};
function launch(){if(!playing())return;R.launch(G.st);}
document.addEventListener('keydown',function(e){
  if(!G||!document.body.classList.contains('screen-game'))return;
  var k=e.code;
  if(k==='Escape'||k==='KeyP'){e.preventDefault();if(!G.over)setPause(!G.paused);return;}
  if(G.paused&&(k==='Space'||k==='Enter')){e.preventDefault();setPause(false);return;}
  if(k==='ArrowLeft'||k==='KeyA'){keys.l=1;e.preventDefault();}
  else if(k==='ArrowRight'||k==='KeyD'){keys.r=1;e.preventDefault();}
  else if(k==='Space'||k==='ArrowUp'||k==='KeyW'){e.preventDefault();if(!e.repeat)launch();return;}
  else return;
  if(G){G.st.padTarget=null;G.st.padDir=(keys.r?1:0)-(keys.l?1:0);}
});
document.addEventListener('keyup',function(e){
  var k=e.code;
  if(k==='ArrowLeft'||k==='KeyA')keys.l=0;else if(k==='ArrowRight'||k==='KeyD')keys.r=0;else return;
  if(G)G.st.padDir=(keys.r?1:0)-(keys.l?1:0);
});
/* мышь: ракетка под курсором; палец: ракетка повторяет движение пальца в любом месте экрана */
function bindPointer(){
  var zone=$('game'),touch=null;
  function worldX(clientX){var r=$('well').getBoundingClientRect();return (clientX-r.left)/L.scale;}
  function skip(e){var n=e.target;while(n&&n!==zone){if(n.tagName==='BUTTON'||n.classList&&n.classList.contains('hud'))return true;n=n.parentNode;}return false;}
  function down(kind,x,y){
    if(kind==='mouse'){return;}
    touch={x:x,y:y,t:Date.now(),moved:false,pad:G?G.st.paddle.x:300};
  }
  function move(kind,x,y){
    if(!playing())return;
    if(kind==='mouse'){G.st.padTarget=worldX(x);G.st.padDir=0;return;}
    if(!touch)return;
    var dx=x-touch.x;if(Math.abs(dx)>6||Math.abs(y-touch.y)>6)touch.moved=true;
    G.st.padTarget=touch.pad+dx/L.scale*S.sens;G.st.padDir=0;
  }
  function up(kind,e){
    if(G&&G.paused&&!G.over&&(kind==='mouse'||touch&&!touch.moved)){touch=null;return;}
    if(kind==='mouse'){launch();return;}
    if(touch&&!touch.moved&&Date.now()-touch.t<350)launch();
    touch=null;
  }
  if(window.PointerEvent){
    zone.addEventListener('pointerdown',function(e){if(skip(e))return;down(e.pointerType==='mouse'?'mouse':'touch',e.clientX,e.clientY);});
    zone.addEventListener('pointermove',function(e){move(e.pointerType==='mouse'?'mouse':'touch',e.clientX,e.clientY);});
    zone.addEventListener('pointerup',function(e){if(skip(e))return;if(e.pointerType==='mouse'&&e.button!==0)return;up(e.pointerType==='mouse'?'mouse':'touch',e);});
    zone.addEventListener('pointercancel',function(){touch=null;});
  }else{
    zone.addEventListener('touchstart',function(e){if(skip(e))return;var p=e.changedTouches[0];down('touch',p.clientX,p.clientY);});
    zone.addEventListener('touchmove',function(e){if(touch)e.preventDefault();var p=e.changedTouches[0];move('touch',p.clientX,p.clientY);},{passive:false});
    zone.addEventListener('touchend',function(e){if(skip(e))return;up('touch',e);});
    zone.addEventListener('mousemove',function(e){move('mouse',e.clientX,e.clientY);});
    zone.addEventListener('mouseup',function(e){if(skip(e)||e.button!==0)return;up('mouse',e);});
  }
  $('pause-ov').addEventListener('click',function(e){if(e.target===$('pause-ov'))setPause(false);});
}
function bindPad(){
  var list=document.querySelectorAll('#tpad .tp-b');
  for(var i=0;i<list.length;i++)(function(b){
    var a=b.getAttribute('data-a');
    function on(e){e.preventDefault();e.stopPropagation();b.classList.add('on');if(G&&G.paused){setPause(false);return;}
      if(a==='fire'){launch();return;}
      if(!G)return;G.st.padTarget=null;keys[a==='left'?'l':'r']=1;G.st.padDir=(keys.r?1:0)-(keys.l?1:0);}
    function off(){b.classList.remove('on');if(a==='fire'||!G)return;keys[a==='left'?'l':'r']=0;G.st.padDir=(keys.r?1:0)-(keys.l?1:0);}
    if(window.PointerEvent){b.addEventListener('pointerdown',on);b.addEventListener('pointerup',off);b.addEventListener('pointerleave',off);b.addEventListener('pointercancel',off);}
    else{b.addEventListener('touchstart',on,{passive:false});b.addEventListener('touchend',off);b.addEventListener('mousedown',on);b.addEventListener('mouseup',off);}
  })(list[i]);
}

/* ════════ ЦИКЛ ════════ */
var v2=null,v3=null,v3ready=false,v3state='none',lastT=0;
function view(){return S.view==='3d'&&v3ready?v3:v2;}
function drain(){var ev=G.st.ev;G.st.ev=[];for(var i=0;i<ev.length;i++)onEvent(ev[i]);}
function frame(now){
  requestAnimationFrame(frame);
  var dt=lastT?Math.min(0.05,(now-lastT)/1000):0.016;lastT=now;
  if(!G||!document.body.classList.contains('screen-game'))return;
  if(playing()&&!document.hidden){R.update(G.st,dt);drain();}
  var v=view();if(v)v.draw(G.st,now,setOf());
  $('launch').classList.toggle('hidden',!(G.st.state==='serve'&&!G.paused&&!G.over));
  paintHud();
}
var hudCache='';
function paintHud(){
  var st=G.st,cells=[];
  cells.push(['hud.score',st.score]);
  if(st.mode!=='time')cells.push(['hud.lives',st.lives]);
  if(st.mode==='campaign')cells.push(['hud.level',(Math.floor(st.level/10)+1)+'-'+(st.level%10+1)]);
  else if(st.mode==='endless')cells.push(['hud.level',st.level+1]);
  cells.push(['hud.mult','x'+R.mult(st)]);
  cells.push(['hud.time',st.mode==='time'?fmt(Math.ceil(st.timeLeft)):fmt(st.levelTime)]);
  var key=cells.map(function(c){return c[1];}).join('|')+I18n.lang;
  if(key!==hudCache){
    hudCache=key;
    $('hud-cells').innerHTML=cells.map(function(c){return '<div class="hc"><span>'+t(c[0])+'</span><b>'+c[1]+'</b></div>';}).join('');
    $('hud-mode').textContent=t('mode.'+st.mode)+' / '+(st.mode==='daily'?t('mod.'+st.daily.mod):t('diff.'+st.diff));
    $('hud-cells').classList.toggle('low',st.mode==='time'&&st.timeLeft<20);
  }
  paintFx(st);
  paintBoss(st);
}
/* полоска здоровья босса над полем */
var bossCache='';
function paintBoss(st){
  var b=st.boss,on=!!b&&!b.dead,bar=$('bossbar');
  bar.classList.toggle('hidden',!on);
  if(!on){bossCache='';return;}
  var key=b.kind+I18n.lang;
  if(key!==bossCache){bossCache=key;$('boss-name').textContent=t('boss.'+b.kind);bar.setAttribute('data-k',b.kind);}
  $('boss-hp').style.width=Math.max(0,b.hp/b.max)*100+'%';
  bar.classList.toggle('angry',b.hp<=b.max/2);
  bar.classList.toggle('inv',b.inv>0);
}
/* полоса действующих бонусов: значок и сколько осталось */
var fxCache='';
function paintFx(st){
  var list=[];
  for(var k in st.fx)if(st.fx[k]>0)list.push(k);
  if(st.shield)list.push('shield');
  var key=list.join(',');
  if(key!==fxCache){
    fxCache=key;
    $('fxbar').innerHTML=list.map(function(k){return '<div class="fxi" data-k="'+k+'"><canvas width="44" height="28"></canvas><i><u></u></i></div>';}).join('');
    var els=$('fxbar').querySelectorAll('.fxi');
    for(var i=0;i<els.length;i++){var g=els[i].querySelector('canvas').getContext('2d');BkIcon(g,els[i].getAttribute('data-k'),22,14,26);}
  }
  var items=$('fxbar').querySelectorAll('.fxi');
  for(var j=0;j<items.length;j++){
    var kk=items[j].getAttribute('data-k'),left=kk==='shield'?1:st.fx[kk]/(R.DUR[kk]||1);
    items[j].querySelector('u').style.width=Math.max(0,Math.min(1,left))*100+'%';
  }
}

/* размер поля 600 x 800 под окно */
var L={scale:1};
function layout(){
  if(!G||!document.body.classList.contains('screen-game'))return;
  $('tpad').classList.toggle('hidden',!S.buttons);
  var arena=$('arena'),aw=arena.clientWidth-12,top=arena.getBoundingClientRect().top;
  var vh=window.innerHeight||document.documentElement.clientHeight;
  var ah=vh-top-30-(S.buttons?($('tpad').offsetHeight||80)+4:0);
  var sc=Math.min(aw/R.W,Math.max(150,ah)/R.H,1.3);
  sc=Math.max(0.2,sc);
  L.scale=sc;
  var w=Math.round(R.W*sc),h=Math.round(R.H*sc);
  $('well').style.width=w+'px';$('well').style.height=h+'px';
  if(v2)v2.resize(sc);
  if(v3)v3.resize(w,h);
}

/* ════════ 3D ════════ */
function has3d(){return !!(window.Three3D&&Three3D.supported()&&window.BkView3D);}
function useView(v){
  document.body.classList.toggle('view-3d',v==='3d'&&v3ready);
  paintViewBtn();
  if(v!=='3d'||!has3d()){if(v3)v3.show(false);return;}
  if(v3){v3.show(true);return;}
  if(v3state==='loading'||v3state==='failed')return;
  v3state='loading';
  var box=$('b3-load');box.textContent=t('b3.loading',{p:0});show('b3-load');
  Three3D.load(function(p){box.textContent=t('b3.loading',{p:Math.round(p*100)});}).then(function(THREE){
    v3=BkView3D(THREE,$('well'));
    if(!v3)throw new Error('webgl');
    v3ready=true;v3state='ready';hide('b3-load');
    if(S.view==='3d'){document.body.classList.add('view-3d');v3.show(true);}else v3.show(false);
    layout();paintViewBtn();
  }).catch(function(){
    v3state='failed';hide('b3-load');S.view='2d';save();
    document.body.classList.remove('view-3d');paintViewBtn();layout();pop(t('b3.fail'),'');
  });
}
function toggleView(){
  if(!has3d()||v3state==='failed')return;
  S.view=S.view==='3d'?'2d':'3d';save();useView(S.view);layout();Sound.sfx('select');
}
function paintViewBtn(){var b=$('btn-view');b.textContent=S.view==='3d'?'2D':'3D';b.disabled=!has3d()||v3state==='failed';}

/* ── общие обработчики ── */
var rzT;
window.addEventListener('resize',function(){clearTimeout(rzT);rzT=setTimeout(layout,80);});
window.addEventListener('orientationchange',function(){setTimeout(layout,250);});
document.addEventListener('visibilitychange',function(){
  if(document.hidden&&playing()&&G.st.state!=='serve')setPause(true);
  if(document.hidden)persist();
});
window.addEventListener('pagehide',persist);
window.addEventListener('blur',function(){keys={};if(G)G.st.padDir=0;});

function onLang(){paintMenu();hudCache='';fxCache='';bossCache='';}
function bindSeg(id,fn){
  var list=document.querySelectorAll('#seg-'+id+' .seg-btn');
  for(var i=0;i<list.length;i++)(function(b){
    b.addEventListener('click',function(){if(b.disabled)return;fn(b.getAttribute('data-v'));save();paintMenu();Sound.sfx('select');});
  })(list[i]);
}
function boot(){
  A.topbar('b.title');
  I18n.apply();I18n.onChange(onLang);
  v2=BkView2D($('cv-field'));
  bindPointer();bindPad();
  bindSeg('diff',function(v){S.diff=v;});
  bindSeg('view',function(v){S.view=v;if(v==='3d'&&has3d())Three3D.load().catch(function(){});});
  bindSeg('big',function(v){S.big=v==='yes';});
  bindSeg('buttons',function(v){S.buttons=v==='yes';});
  bindSeg('sens',function(v){S.sens=+v;});
  $('levels').addEventListener('click',function(e){
    var b=e.target.closest?e.target.closest('.lv'):null;if(!b||b.disabled)return;
    S.level=+b.getAttribute('data-i');save();paintMenu();Sound.sfx('select');
  });
  var th=document.querySelectorAll('#themes .th-card');
  for(var i=0;i<th.length;i++)(function(b){b.addEventListener('click',function(){S.theme=b.getAttribute('data-v');save();paintMenu();Sound.sfx('select');});})(th[i]);
  $('btn-play').addEventListener('click',function(){newGame();});
  $('btn-continue').addEventListener('click',resume);
  $('btn-menu').addEventListener('click',function(){if(G&&!G.over)G.paused=true;showScreen('menu');});
  $('btn-pause').addEventListener('click',function(){if(G)setPause(!G.paused);});
  $('btn-view').addEventListener('click',toggleView);
  $('po-go').addEventListener('click',function(){setPause(false);});
  $('po-restart').addEventListener('click',retry);
  $('po-menu').addEventListener('click',function(){showScreen('menu');});
  $('clear-next').addEventListener('click',function(){newGame(Math.min(LV.COUNT-1,G.st.level+1));});
  $('clear-retry').addEventListener('click',function(){newGame(G.st.level);});
  $('clear-menu').addEventListener('click',function(){showScreen('menu');});
  $('over-retry').addEventListener('click',retry);
  $('over-menu').addEventListener('click',function(){showScreen('menu');});
  paintMenu();
  showScreen('menu');
  if(S.view==='3d'&&has3d())Three3D.load().catch(function(){});
  requestAnimationFrame(frame);
}

window.AceonBK={g:function(){return G;},settings:S,db:DB,newGame:newGame,launch:launch,layout:layout,resume:resume,setPause:setPause};
boot();
})();
