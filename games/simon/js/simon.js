/* A.C.EON SIMON: игра на память. Пульт рисуется в SVG (кнопки кодом, корпус и центр картинками, если есть).
   Режимы: классика (3 сложности), вдвоём на одном устройстве, Саймон дня (одна цепочка на всех, 3 попытки).
   Тексты в lang.js. */
(function(){
'use strict';

var t=I18n.t,A=window.Arcade;
var $=function(id){return document.getElementById(id);};
function show(id){$(id).classList.remove('hidden');}
function hide(id){$(id).classList.add('hidden');}

var MODES=['classic','duo','daily'],DIFFS=['easy','normal','hard'],THEMES=['neon','retro','space'];
var ART=new URL('../art/simon/',location.href).href;
/* картинки от Codex: пока не выложены, false; тогда пульт целиком кодом и лишних запросов нет */
var ART_READY=false;
var DAILY_TRIES=3;

/* цвета кнопок по темам: [тёмный, светлый] */
var PADS={
  neon:[['#08323a','#00e5ff'],['#3a0a22','#ff2d78'],['#3a3008','#ffd23a'],['#0a3a1e','#2ee87a']],
  retro:[['#0b3a12','#46ff5a'],['#3e0c0c','#ff4040'],['#3e3606','#ffe640'],['#0a1c48','#4a8cff']],
  space:[['#1e1040','#a77bff'],['#062c3a','#5ae8ff'],['#3a1c06','#ff9a3a'],['#2a2a3a','#e8f0ff']]};
/* ноты кнопок: как у классической игрушки, звучат приятно вместе */
var NOTES=[415.3,310.0,252.0,209.0];
var DIFF={easy:{on:620,limit:0,chances:1},normal:{on:480,limit:5000,chances:0},hard:{on:380,limit:2500,chances:0}};

Store.define('simon',{
  version:1,
  defaults:{settings:{mode:'classic',diff:'normal',theme:'neon',labels:false,duoShow:false},
    stats:{easy:{games:0,best:0},normal:{games:0,best:0},hard:{games:0,best:0},presses:0},
    duo:{games:0,p1:0,p2:0,best:0},
    daily:{history:{},streak:0,lastDate:0}},
  legacy:function(raw){var hi=parseInt(raw('aceon_hi_simon'),10)||0;return hi?{stats:{easy:{games:0,best:0},normal:{games:0,best:hi},hard:{games:0,best:0},presses:0}}:null;}
});
var DB=Store.get('simon'),S=DB.settings,ST=DB.stats,DUO=DB.duo,DY=DB.daily;
if(MODES.indexOf(S.mode)<0)S.mode='classic';
if(DIFFS.indexOf(S.diff)<0)S.diff='normal';
if(THEMES.indexOf(S.theme)<0)S.theme='neon';
DIFFS.forEach(function(d){if(!ST[d])ST[d]={games:0,best:0};});
function save(){Store.save('simon');}
function bestAll(){return Math.max(ST.easy.best,ST.normal.best,ST.hard.best);}

/* ── звуки ── */
NOTES.forEach(function(f,i){Sound.define('sp'+i,function(tm,tone){tone(tm,f,0.32,'triangle',0.09);tone(tm,f*2,0.2,'sine',0.025);});});
Sound.define('sErr',function(tm,tone,noise){tone(tm,82,0.55,'sawtooth',0.08,60);noise(tm,0.2,0.15,300);});
Sound.define('sOk',function(tm,tone){[523,659,784].forEach(function(f,i){tone(tm+i*0.06,f,0.1,'triangle',0.05);});});

/* ── случайные числа (для Саймона дня одинаковые у всех) ── */
function rng(seed){var a=seed|0;return function(){a=(a+0x6D2B79F5)|0;var x=Math.imul(a^(a>>>15),1|a);x=(x+Math.imul(x^(x>>>7),61|x))^x;return ((x^(x>>>14))>>>0)/4294967296;};}
function dayNum(d){return d.getUTCFullYear()*10000+(d.getUTCMonth()+1)*100+d.getUTCDate();}
function today(){return dayNum(new Date());}
function dayShift(num,k){var d=new Date(Date.UTC(Math.floor(num/10000),Math.floor(num/100)%100-1,num%100));d.setUTCDate(d.getUTCDate()+k);return dayNum(d);}
function dayRec(n){return DY.history[n]||{b:0,n:0};}
function fmtDay(n){var d=n%100,m=Math.floor(n/100)%100;return (d<10?'0':'')+d+'.'+(m<10?'0':'')+m;}

/* ════════ ПУЛЬТ (SVG) ════════ */
var SV='http://www.w3.org/2000/svg';
function el(tag,attrs,parent){var e=document.createElementNS(SV,tag);for(var k in attrs)e.setAttribute(k,attrs[k]);if(parent)parent.appendChild(e);return e;}
/* сектор кольца: от угла a0 до a1 (градусы, 0 = вверх, по часовой) */
function sector(cx,cy,r0,r1,a0,a1){
  function p(r,a){var rad=(a-90)*Math.PI/180;return [cx+r*Math.cos(rad),cy+r*Math.sin(rad)];}
  var A0=p(r1,a0),A1=p(r1,a1),B1=p(r0,a1),B0=p(r0,a0),big=a1-a0>180?1:0;
  return 'M'+A0+' A'+r1+' '+r1+' 0 '+big+' 1 '+A1+' L'+B1+' A'+r0+' '+r0+' 0 '+big+' 0 '+B0+' Z';
}
var padEls=[],symEls=[],screenTxt=null;
function buildDevice(){
  var svg=$('dev');svg.innerHTML='';padEls=[];symEls=[];
  var defs=el('defs',{},svg);
  var gr=el('radialGradient',{id:'bez',cx:'50%',cy:'40%',r:'60%'},defs);
  el('stop',{offset:'0%','stop-color':'#2a2a4a'},gr);el('stop',{offset:'100%','stop-color':'#08081a'},gr);
  if(ART_READY)el('image',{href:ART+'device_frame.webp',x:0,y:0,width:1000,height:1000},svg);
  else{
    el('circle',{cx:500,cy:500,r:490,fill:'url(#bez)',stroke:'#00e5ff','stroke-width':6,'class':'bezel'},svg);
    el('circle',{cx:500,cy:500,r:470,fill:'none',stroke:'rgba(255,45,120,.5)','stroke-width':3},svg);
    for(var b=0;b<12;b++){var a=b*30*Math.PI/180;el('circle',{cx:500+455*Math.sin(a),cy:500-455*Math.cos(a),r:6,fill:'#ffd23a',opacity:.5},svg);}
  }
  /* кнопки: по часовой от верхней левой */
  var ang=[[272,358],[2,88],[92,178],[182,268]],symP=[[-1,-1],[1,-1],[1,1],[-1,1]];
  for(var i=0;i<4;i++){
    var p=el('path',{d:sector(500,500,180,378,ang[i][0],ang[i][1]),'class':'pad','data-i':i},svg);
    padEls.push(p);
    var sx=500+symP[i][0]*198,sy=500+symP[i][1]*198,g=el('g',{'class':'sym',transform:'translate('+sx+' '+sy+')'},svg);
    var shapes=['M0 -34 L30 18 L-30 18 Z','M-28 -28 H28 V28 H-28 Z','M0 -34 L10 -10 L34 -10 L14 6 L22 32 L0 16 L-22 32 L-14 6 L-34 -10 L-10 -10 Z',''];
    if(i===3)el('circle',{cx:0,cy:0,r:28},g);else el('path',{d:shapes[i]},g);
    el('text',{x:0,y:64,'text-anchor':'middle','class':'key'},g).textContent=['Q','W','S','A'][i];
    symEls.push(g);
  }
  if(ART_READY)el('image',{href:ART+'device_center.webp',x:330,y:330,width:340,height:340},svg);
  else{el('circle',{cx:500,cy:500,r:168,fill:'#0c0c22',stroke:'#00e5ff','stroke-width':5},svg);
    el('circle',{cx:500,cy:500,r:150,fill:'none',stroke:'rgba(140,108,255,.6)','stroke-width':2},svg);}
  el('circle',{cx:500,cy:500,r:86,fill:'#02020a','class':'screen'},svg);
  screenTxt=el('text',{x:500,y:518,'text-anchor':'middle','class':'scr'},svg);
  paintPads();
}
function paintPads(){
  var c=PADS[S.theme];
  padEls.forEach(function(p,i){p.style.setProperty('--d',c[i][0]);p.style.setProperty('--l',c[i][1]);});
  $('dev').classList.toggle('labels',!!S.labels);
}
var litT=[];
function light(i,ms){
  var p=padEls[i];if(!p)return;
  p.classList.add('on');clearTimeout(litT[i]);
  litT[i]=setTimeout(function(){p.classList.remove('on');},ms);
  Sound.sfx('sp'+i);
}
function screen(txt){if(screenTxt)screenTxt.textContent=txt;}

/* ════════ МЕНЮ ════════ */
function buildModes(){
  var list=$('mode-list');list.innerHTML='';
  MODES.forEach(function(m){
    var b=document.createElement('button');b.type='button';b.className='m-card-btn'+(S.mode===m?' sel':'');
    var ico=ART_READY?'<img class="m-img" alt="" src="'+ART+'mode_'+m+'.webp">':'<span class="m-ico s-ico"><i></i><i></i><i></i><i></i></span>';
    b.innerHTML=ico+'<span class="m-txt"><span class="m-name" data-i18n="mode.'+m+'"></span><span class="m-desc" data-i18n="desc.'+m+'"></span></span>';
    b.addEventListener('click',function(){S.mode=m;save();paintMenu();Sound.sfx('select');});
    list.appendChild(b);
  });
  I18n.apply(list);
}
function row(k,v){return '<div class="ov-row"><span>'+t(k)+'</span><b>'+v+'</b></div>';}
function buildDaily(){
  var num=today(),r=dayRec(num),h='';
  h+='<div class="dl-row"><span>'+t('daily.best')+'</span><b>'+(r.b||'-')+'</b></div>';
  h+='<div class="dl-row"><span>'+t('daily.tries')+'</span><b>'+r.n+' / '+DAILY_TRIES+'</b></div>';
  h+='<div class="dl-row"><span>'+t('daily.streak')+'</span><b>'+(DY.streak||0)+'</b></div><div class="dl-week">';
  for(var k=-6;k<=0;k++){var d=dayShift(num,k),x=dayRec(d);h+='<div class="dl-day'+(x.n?' ok':'')+(k===0?' now':'')+'"><b>'+(d%100)+'</b><span>'+(x.b||'')+'</span></div>';}
  $('daily-box').innerHTML='<h2 class="m-h m-h2">'+t('daily.today',{d:fmtDay(num)})+'</h2>'+h+'</div><div class="opt-note">'+t('daily.note',{n:DAILY_TRIES})+'</div>';
}
function buildStats(){
  var h='<div class="st-row st-head"><span></span><b>'+t('st.games')+'</b><b>'+t('st.best')+'</b></div>';
  DIFFS.forEach(function(d){h+='<div class="st-row'+(S.mode==='classic'&&S.diff===d?' cur':'')+'"><span>'+t('diff.'+d)+'</span><b>'+ST[d].games+'</b><b>'+(ST[d].best||'-')+'</b></div>';});
  h+='<div class="st-row'+(S.mode==='duo'?' cur':'')+'"><span>'+t('mode.duo')+'</span><b>'+DUO.games+'</b><b>'+(DUO.best||'-')+'</b></div>';
  $('stats').innerHTML=h+'<div class="opt-note">'+t('st.duo',{a:DUO.p1,b:DUO.p2})+'</div>';
}
function segSel(id,v){var l=document.querySelectorAll('#'+id+' .seg-btn');for(var i=0;i<l.length;i++)l[i].classList.toggle('sel',l[i].getAttribute('data-v')===String(v));}
function paintMenu(){
  buildModes();buildStats();
  $('diff-box').classList.toggle('hidden',S.mode!=='classic');
  $('duo-box').classList.toggle('hidden',S.mode!=='duo');
  $('daily-box').classList.toggle('hidden',S.mode!=='daily');
  if(S.mode==='daily')buildDaily();
  segSel('seg-diff',S.diff);segSel('seg-theme',S.theme);segSel('seg-labels',S.labels?'on':'off');segSel('seg-duo',S.duoShow?'on':'off');
  $('diff-note').textContent=t('dnote.'+S.diff);
  var noTries=S.mode==='daily'&&dayRec(today()).n>=DAILY_TRIES;
  $('btn-play').disabled=noTries;$('btn-play').classList.toggle('off',noTries);
}
function showScreen(name){
  document.body.classList.toggle('screen-menu',name==='menu');
  document.body.classList.toggle('screen-game',name==='game');
  if(name==='menu'){stopAll();paintMenu();hide('over-modal');hide('pass-modal');}
  Sound.music(name==='menu'?'menu':'game');
  window.scrollTo(0,0);
  if(name==='game'){layout();requestAnimationFrame(layout);}
}

/* ════════ ИГРА ════════
   G.state: show (пульт показывает), input (ход игрока), wait (пауза между раундами), pass (передать ход), over */
var G=null,timers=[];
function later(fn,ms){var id=setTimeout(function(){timers=timers.filter(function(x){return x!==id;});fn();},ms);timers.push(id);return id;}
/* пауза между шагами: запоминаем, что делать дальше, чтобы продолжить после паузы */
function wait(fn,ms){G.state='wait';G.after=fn;later(function(){G.after=null;fn();},ms);}
function stopAll(){timers.forEach(clearTimeout);timers=[];stopLimit();}

function newGame(){
  stopAll();
  var m=S.mode,seed=Math.floor(Math.random()*1e9);
  if(m==='daily'){var num=today(),r=dayRec(num);if(r.n>=DAILY_TRIES)return;r.n++;DY.history[num]=r;seed=num*31+5;}
  G={mode:m,diff:m==='classic'?S.diff:'normal',seq:[],idx:0,rnd:rng(seed),round:0,chances:0,player:1,state:'wait',paused:false,date:m==='daily'?today():0,presses:0};
  G.chances=DIFF[G.diff].chances;
  if(m==='classic')ST[G.diff].games++;
  if(m==='duo')DUO.games++;
  save();A.trackPlay();
  hide('over-modal');hide('pass-modal');hide('pause-ov');
  showScreen('game');
  paintHud();screen('');
  if(m==='duo'){G.state='pass';passScreen();}
  else{status(t('st.ready'),'');wait(nextRound,900);}
}
/* скорость: растёт с раундами */
function stepMs(){var on=DIFF[G.diff].on,n=G.seq.length;var k=n>=13?0.62:n>=9?0.72:n>=5?0.85:1;return Math.max(170,Math.round(on*k));}
function nextRound(){
  if(!G)return;
  G.seq.push(Math.floor(G.rnd()*4));
  showSeq();
}
function showSeq(){
  G.state='show';G.idx=0;stopLimit();
  status(t('st.watch'),'watch');host('show');
  screen(String(G.seq.length));paintHud();
  var on=stepMs(),gap=Math.round(on*0.4),i=0;
  function step(){
    if(!G||G.state!=='show')return;
    if(i>=G.seq.length){G.state='input';G.idx=0;status(t('st.you',{n:G.seq.length}),'you');host('idle');startLimit();return;}
    light(G.seq[i],on);i++;later(step,on+gap);
  }
  later(step,500);
}
function press(i){
  if(!G||G.paused)return;
  if(G.state==='pass'||G.state==='over')return;
  if(G.state!=='input'&&G.state!=='add')return;
  light(i,220);G.presses++;
  if(G.state==='add'){ /* вдвоём: своя новая нота */
    G.seq.push(i);G.state='wait';status(t('st.added'),'ok');Sound.sfx('sOk');
    wait(function(){G.player=G.player===1?2:1;G.state='pass';passScreen();},700);
    return;
  }
  if(i!==G.seq[G.idx]){fail();return;}
  G.idx++;startLimit();
  status(t('st.you',{n:G.seq.length-G.idx}),'you');
  if(G.idx>=G.seq.length){
    stopLimit();
    if(G.mode==='duo'){G.state='add';status(t('st.add',{p:G.player}),'you');return;}
    G.round=G.seq.length;G.state='wait';host('happy');
    status(t('st.ok'),'ok');paintHud();
    if(G.round%5===0)popTxt(t('pop.round',{n:G.round}),'big');
    later(function(){Sound.sfx('sOk');},250);
    wait(nextRound,1100);
  }
}
function fail(){
  stopLimit();Sound.sfx('sErr');host('sad');
  var right=G.seq[G.idx];
  if(right!=null){padEls[right].classList.add('hint');later(function(){padEls[right].classList.remove('hint');},1200);}
  $('dev').classList.add('shake');later(function(){$('dev').classList.remove('shake');},500);
  if(G.chances>0&&G.mode==='classic'){
    G.chances--;G.state='wait';status(t('st.again'),'bad');paintHud();
    wait(showSeq,1600);return;
  }
  G.state='over';status(t('st.wrong'),'bad');
  later(endGame,1300);
}
/* время на ответ (обычная и сложная) */
var limT=null,limStart=0,limMs=0;
function startLimit(){
  stopLimit();
  var ms=G.mode==='duo'?0:DIFF[G.diff].limit;if(!ms)return;
  limMs=ms;limStart=performance.now();$('limit').classList.remove('hidden');
  limT=setInterval(function(){
    if(!G||G.paused)return;
    var left=1-(performance.now()-limStart)/limMs;
    $('limit-bar').style.width=Math.max(0,left*100)+'%';
    if(left<=0){stopLimit();fail();}
  },50);
}
function stopLimit(){if(limT){clearInterval(limT);limT=null;}$('limit').classList.add('hidden');}

function passScreen(){
  hide('pause-ov');status('','');host('idle');
  screen(String(G.seq.length));
  $('pass-title').textContent=t('pass.title',{p:G.player});
  $('pass-text').textContent=G.seq.length?t(S.duoShow?'pass.show':'pass.blind',{n:G.seq.length}):t('pass.first');
  show('pass-modal');paintHud();
}
function passGo(){
  hide('pass-modal');
  if(!G.seq.length){G.state='add';status(t('st.add',{p:G.player}),'you');return;}
  if(S.duoShow)showSeq();
  else{G.state='input';G.idx=0;status(t('st.you',{n:G.seq.length}),'you');}
}

function endGame(){
  var rec=false,rows='';G.state='over';
  ST.presses+=G.presses;
  if(G.mode==='duo'){
    var win=G.player===1?2:1;DUO['p'+win]++;DUO.best=Math.max(DUO.best,G.seq.length);
    $('over-title').textContent=t('over.duo',{p:win});
    rows=row('over.chain',G.seq.length)+row('over.score2',DUO.p1+' : '+DUO.p2);
  }else{
    var sc=G.round;
    if(G.mode==='classic'){if(sc>ST[G.diff].best){ST[G.diff].best=sc;rec=true;}}
    else{var r=dayRec(G.date);if(sc>r.b){r.b=sc;rec=true;}DY.history[G.date]=r;
      if(DY.lastDate!==G.date){DY.streak=DY.lastDate===dayShift(G.date,-1)?(DY.streak||0)+1:1;DY.lastDate=G.date;}
      var ks=Object.keys(DY.history).sort();while(ks.length>40)delete DY.history[ks.shift()];}
    A.setHi('simon',sc);
    $('over-title').textContent=t('over.title');
    rows=row('over.rounds',sc)+(G.mode==='classic'?row('over.diff',t('diff.'+G.diff))+row('over.best',ST[G.diff].best):
      row('daily.best',dayRec(G.date).b)+row('daily.tries',dayRec(G.date).n+' / '+DAILY_TRIES));
  }
  save();Sound.duck(0.3,2000);
  $('over-rows').innerHTML=rows;
  $('over-rec').classList.toggle('hidden',!rec);
  $('over-retry').classList.toggle('hidden',G.mode==='daily'&&dayRec(G.date).n>=DAILY_TRIES);
  show('over-modal');
}

function setPause(on){
  if(!G||G.state==='over'||G.state==='pass')return;
  if(on===G.paused)return;
  G.paused=on;$('pause-ov').classList.toggle('hidden',!on);
  Sound.sfx('select');
  if(on){timers.forEach(clearTimeout);timers=[];stopLimit();padEls.forEach(function(p){p.classList.remove('on');});}
  else{
    /* после паузы цепочку показываем заново, без штрафа */
    if(G.mode==='duo'&&G.state==='wait'&&G.after){later(G.after,400);}
    else if(G.mode==='duo'){if(G.state==='input'||G.state==='add'){G.state='input';G.idx=0;if(!G.seq.length)G.state='add';status(t('st.you',{n:G.seq.length}),'you');}else passScreen();}
    else if(G.state==='show'||G.state==='input')showSeq();
    else if(G.state==='wait'&&G.after)later(G.after,500);
  }
}

/* ── табло, статус, ведущий ── */
var stCls='';
function status(txt,cls){var s=$('status');s.textContent=txt;s.className='status'+(cls?' '+cls:'');}
function host(p){var h=$('host');if(!h||!ART_READY)return;h.src=ART+'host_'+p+'.webp';['idle','show','happy','sad'].forEach(function(x){h.classList.toggle('h-'+x,x===p);});}
var popN=0;
function popTxt(txt,cls){var e=document.createElement('div');e.className='pop '+(cls||'');e.textContent=txt;e.style.top=(18+(popN++%2)*8)+'%';$('fx').appendChild(e);setTimeout(function(){if(e.parentNode)e.parentNode.removeChild(e);},1500);}
function paintHud(){
  var cells=[];
  if(G.mode==='duo'){cells.push(['hud.turn',t('hud.player',{p:G.player})]);cells.push(['hud.chain',G.seq.length]);cells.push(['hud.score2',DUO.p1+' : '+DUO.p2]);}
  else{
    cells.push(['hud.round',G.round]);
    cells.push([G.mode==='daily'?'hud.today':'hud.best',G.mode==='daily'?(dayRec(G.date).b||'-'):Math.max(ST[G.diff].best,G.round)]);
    if(G.mode==='classic')cells.push(['hud.diff',t('diff.'+G.diff)]);
    if(G.mode==='classic'&&DIFF[G.diff].chances)cells.push(['hud.chance',G.chances?'1':'0']);
  }
  $('hud-cells').innerHTML=cells.map(function(c){return '<div class="hc"><span>'+t(c[0])+'</span><b>'+c[1]+'</b></div>';}).join('');
  $('hud-mode').textContent=t('mode.'+G.mode);
}

/* ════════ ВВОД ════════ */
var KEYS={KeyQ:0,KeyW:1,KeyS:2,KeyA:3,Digit1:0,Digit2:1,Digit3:2,Digit4:3,Numpad7:0,Numpad9:1,Numpad3:2,Numpad1:3};
document.addEventListener('keydown',function(e){
  if(!G||!document.body.classList.contains('screen-game'))return;
  if(e.code==='Escape'||e.code==='KeyP'){e.preventDefault();setPause(!G.paused);return;}
  if(!$('pass-modal').classList.contains('hidden')&&(e.code==='Space'||e.code==='Enter')){e.preventDefault();passGo();return;}
  if(G.paused&&(e.code==='Space'||e.code==='Enter')){e.preventDefault();setPause(false);return;}
  var k=KEYS[e.code];if(k==null||e.repeat)return;
  e.preventDefault();press(k);
});
function bindPads(){
  var svg=$('dev');
  function down(e){var n=e.target;while(n&&n!==svg&&!(n.getAttribute&&n.getAttribute('data-i')))n=n.parentNode;
    if(!n||n===svg)return;e.preventDefault();press(+n.getAttribute('data-i'));}
  if(window.PointerEvent)svg.addEventListener('pointerdown',down);
  else{svg.addEventListener('touchstart',down,{passive:false});svg.addEventListener('mousedown',down);}
}

/* размер пульта под окно */
function layout(){
  if(!document.body.classList.contains('screen-game'))return;
  var arena=$('arena'),aw=arena.clientWidth-16,top=arena.getBoundingClientRect().top;
  var vh=window.innerHeight||document.documentElement.clientHeight;
  var hostW=ART_READY&&aw>760?220:0;
  var size=Math.max(200,Math.min(aw-hostW,vh-top-90,620));
  $('dev').style.width=size+'px';$('dev').style.height=size+'px';
  $('host').classList.toggle('hidden',!hostW);
}
var rzT;
window.addEventListener('resize',function(){clearTimeout(rzT);rzT=setTimeout(layout,80);});
document.addEventListener('visibilitychange',function(){if(document.hidden&&G&&!G.paused&&document.body.classList.contains('screen-game'))setPause(true);});

function setBg(){var a=$('arena');a.style.backgroundImage=ART_READY?'linear-gradient(rgba(5,5,16,.3),rgba(5,5,16,.55)),url('+ART+'bg_'+S.theme+'.webp)':'';}
function onLang(){paintMenu();if(G)paintHud();}
function bindSeg(id,fn){var l=document.querySelectorAll('#'+id+' .seg-btn');for(var i=0;i<l.length;i++)(function(b){b.addEventListener('click',function(){fn(b.getAttribute('data-v'));save();paintMenu();paintPads();setBg();Sound.sfx('select');});})(l[i]);}
function boot(){
  A.topbar('s.title');
  I18n.apply();I18n.onChange(onLang);
  buildDevice();bindPads();setBg();
  bindSeg('seg-diff',function(v){S.diff=v;});
  bindSeg('seg-theme',function(v){S.theme=v;});
  bindSeg('seg-labels',function(v){S.labels=v==='on';});
  bindSeg('seg-duo',function(v){S.duoShow=v==='on';});
  $('btn-play').addEventListener('click',newGame);
  $('btn-menu').addEventListener('click',function(){if(G&&G.state!=='over'){stopAll();G.paused=true;}showScreen('menu');});
  $('btn-pause').addEventListener('click',function(){if(G)setPause(!G.paused);});
  $('po-go').addEventListener('click',function(){setPause(false);});
  $('po-restart').addEventListener('click',newGame);
  $('po-menu').addEventListener('click',function(){showScreen('menu');});
  $('over-retry').addEventListener('click',newGame);
  $('over-menu').addEventListener('click',function(){showScreen('menu');});
  $('pass-go').addEventListener('click',passGo);
  /* предпросмотр темы в меню: тот же пульт */
  paintMenu();
  showScreen('menu');
}

window.AceonSimon={g:function(){return G;},settings:S,db:DB,press:press,newGame:newGame,setPause:setPause};
boot();
})();
