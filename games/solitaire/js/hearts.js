/* A.C.EON CARDS: червы против трёх роботов. Правила и боты в hrrules.js.
   Живёт на странице «Карты»: сукно, рубашка и размер карт из window.SolShell, рисунок карт из cards.js.
   Свой экран #hr, тексты hr.* в lang.js, имена роботов bj.bot*.

   Места: вы внизу (0), роботы слева (1), сверху (2), справа (3), ход по часовой.
   Недоигранный матч хранится в DB.hrSave и продолжается из меню. */
(function(){
'use strict';

var Sh=window.SolShell,S=Sh.S,DB=Sh.DB,R=window.HRRules,t=I18n.t;
var $=function(id){return document.getElementById(id);};
function show(id){$(id).classList.remove('hidden');}
function hide(id){$(id).classList.add('hidden');}

if(S.hrTarget!==50)S.hrTarget=100;
if(S.hrPass!=='off')S.hrPass='on';
if(['easy','normal','hard'].indexOf(S.hrLevel)<0)S.hrLevel='normal';
var BOT_N=6,DELAY=600,TRICK_PAUSE=1000;
if(/[?&]fast\b/.test(location.search)){DELAY=60;TRICK_PAUSE=80;}   /* для автотестов */
var SIDE=['me','left','top','right'];

Sound.define('hrQueen',function(tm,tone){tone(tm,220,0.18,'sawtooth',0.04,140);});

/* G: матч из HRRules; bots: портреты мест 1..3; sel: выбранные для передачи карты;
   hold: последняя взятка на паузе; got: полученные карты подсвечены до первого хода */
var D={G:null,bots:[],level:'normal',sel:[],hold:null,timer:null,counted:false,got:null,hintC:null};

function nameOf(p){return p===0?t('dk.you'):t('bj.bot'+D.bots[p-1]);}
function onScreen(){return document.body.classList.contains('screen-hr');}
function stop(){if(D.timer){clearTimeout(D.timer);D.timer=null;}}
function schedule(d){stop();D.timer=setTimeout(tick,d==null?DELAY:d);}
function persist(){
  if(D.G&&!D.G.over)DB.hrSave={G:D.G,bots:D.bots,level:D.level};else DB.hrSave=null;
  Sh.save();
}

/* ── матч ── */
function pickBots(){
  var all=[];for(var i=1;i<=BOT_N;i++)all.push(i);
  for(var j=all.length-1;j>0;j--){var k=Math.floor(Math.random()*(j+1)),x=all[j];all[j]=all[k];all[k]=x;}
  D.bots=all.slice(0,3);
}
function enter(){
  document.body.classList.remove('screen-menu','screen-game','screen-bj','screen-dk','screen-ce');document.body.classList.add('screen-hr');
  Sound.music('game');window.scrollTo(0,0);
  hide('hr-panel');buildTable();
}
function start(){
  stop();pickBots();D.level=S.hrLevel;
  D.G=R.newMatch({target:S.hrTarget,pass:S.hrPass==='on'});
  D.sel=[];D.hold=null;D.counted=false;D.got=null;
  enter();Sound.sfx('deal');
  persist();
  beginRound();
}
function resume(){
  var sv=DB.hrSave;if(!sv||!sv.G)return start();
  stop();D.G=sv.G;D.bots=sv.bots;D.level=sv.level||S.hrLevel;
  D.sel=[];D.hold=null;D.counted=false;D.got=null;
  enter();
  if(D.G.phase==='roundEnd'){paint();roundPanel();return;}
  beginRound(true);
}
function beginRound(resumed){
  var G=D.G;
  hide('hr-panel');paint();
  if(G.phase==='pass')msg(t('hr.p.pass',{d:t('hr.dir.'+G.dir)}));
  else if(!resumed)msg(G.pass?t('hr.p.nopass'):'');
  if(G.phase==='play')schedule(900);
}

/* ── передача ── */
function togglePass(i){
  var G=D.G,c=G.hands[0][i];if(!c)return;
  var k=D.sel.findIndex(function(x){return R.same(x,c);});
  if(k>=0)D.sel.splice(k,1);
  else{if(D.sel.length>=3){Sound.sfx('nope');return;}D.sel.push(c);}
  Sound.sfx('select');paint();
}
function doPass(){
  var G=D.G;if(!G||G.phase!=='pass'||D.sel.length!==3)return;
  var picks=[D.sel.slice()];
  for(var p=1;p<4;p++)picks.push(R.aiPass(G,p,D.level==='hard'?'normal':D.level));
  if(!R.applyPass(G,picks)){Sound.sfx('nope');return;}
  D.sel=[];D.got=G.got[0].slice();
  Sound.sfx('deal');
  msg(t('hr.m.got',{n:nameOf(fromWhom())}));
  persist();paint();
  schedule(1300);
}
function fromWhom(){var G=D.G;for(var p=1;p<4;p++)if(R.passTo(G,p)===0)return p;return 0;}

/* ── ход ── */
function tick(){
  D.timer=null;
  var G=D.G;if(!G||!onScreen()||D.hold)return;
  if(G.phase!=='play')return;
  var p=G.turn;
  if(p===0){prompt();paint();return;}
  paint();
  var c=R.aiPlay(G,p,D.level);
  doPlay(p,c);
}
function prompt(){
  var G=D.G;
  if(G.tricks===0&&!G.trick.length)msg(t('hr.p.lead2'));
  else if(!G.trick.length)msg(G.broken?t('hr.p.lead'):t('hr.p.leadNoH'));
  else msg(t('hr.p.follow'));
}
function doPlay(p,c){
  var G=D.G,tricks=G.tricks,round=G.round;
  var wasBroken=G.broken;
  if(!R.play(G,p,c)){Sound.sfx('nope');return false;}
  if(p===0)D.got=null;
  D.hintC=null;
  Sound.sfx('card');
  if(R.isQS(c))Sound.sfx('hrQueen');
  if(!wasBroken&&G.broken&&p!==0)msg(t('hr.m.broken',{n:nameOf(p)}));
  if(G.tricks!==tricks||G.round!==round||G.phase!=='play'){
    /* взятка собрана: видна, потом уходит к взявшему */
    var lt=G.lastTrick;D.hold=lt;
    msg(lt.pts?t('hr.m.took',{n:nameOf(lt.w),k:lt.pts}):t('hr.m.clean',{n:nameOf(lt.w)}),lt.w===0&&lt.pts?'bad':'');
    paint();persist();
    stop();D.timer=setTimeout(function(){
      $('hr-trick').classList.add('go-'+SIDE[lt.w]);
      D.timer=setTimeout(function(){
        D.timer=null;D.hold=null;$('hr-trick').className='hr-trick';paint();
        if(G.phase==='play')schedule(G.turn===0?100:DELAY);
        else roundPanel();
      },320);
    },TRICK_PAUSE);
    return true;
  }
  paint();
  schedule(G.turn===0?100:DELAY);
  return true;
}
function tapCard(i){
  var G=D.G;if(!G)return;
  if(G.phase==='pass'){togglePass(i);return;}
  if(G.phase!=='play'||G.turn!==0||D.hold)return;
  var c=G.hands[0][i];if(!c)return;
  if(!R.legal(G,0).some(function(x){return R.same(x,c);})){Sound.sfx('nope');return;}
  doPlay(0,c);
}
function hint(){
  var G=D.G;if(!G)return;
  if(G.phase==='pass'){D.sel=R.aiPass(G,0,'normal');Sound.sfx('select');msg(t('hr.h.pass'));paint();return;}
  if(G.phase!=='play'||G.turn!==0||D.hold)return;
  D.hintC=R.aiPlay(G,0,'normal');Sound.sfx('select');msg(t('hr.h.play'));paint();
}

/* ── конец раздачи и матча ── */
function roundPanel(){
  var G=D.G,rr=G.roundRes;
  var order=[0,1,2,3].slice().sort(function(a,b){return G.scores[a]-G.scores[b];});
  var h='<div class="hr-pbox"><b class="hr-ptitle">'+(G.over?t('hr.over'):t('hr.roundEnd',{n:G.round}))+'</b>';
  if(rr&&rr.moon>=0)h+='<div class="hr-moon">'+(rr.moon===0?t('hr.moonYou'):t('hr.moon',{n:nameOf(rr.moon)}))+'</div>';
  h+='<div class="hr-rows"><div class="hr-row hr-head"><span></span><span>'+t('hr.col.round')+'</span><span>'+t('hr.col.total')+'</span></div>';
  order.forEach(function(p,i){
    var win=G.over&&G.winners.indexOf(p)>=0;
    h+='<div class="hr-row'+(p===0?' me':'')+(win?' win':'')+'"><span>'+(i+1)+'. '+nameOf(p)+'</span><span>+'+(rr?rr.add[p]:0)+'</span><b>'+G.scores[p]+'</b></div>';
  });
  h+='</div>';
  if(!G.over)h+='<div class="hr-note">'+t('hr.toTarget',{n:G.target})+'</div>';
  h+='<button class="btn bj-deal" id="hr-next">&#9654; '+t(G.over?'dk.new':'hr.next')+'</button></div>';
  $('hr-panel').innerHTML=h;show('hr-panel');
  $('hr-next').addEventListener('click',next);
  if(G.over)finish();else msg('');
  setButtons();
}
function next(){
  var G=D.G;if(!G)return;
  if(G.over){start();return;}
  if(G.phase!=='roundEnd')return;
  R.deal(G,Math.random);D.got=null;D.sel=[];
  Sound.sfx('deal');persist();beginRound();
}
function finish(){
  var G=D.G;if(D.counted)return;D.counted=true;
  var st=DB.hr;st.games++;
  var won=G.winners.indexOf(0)>=0;
  if(won){st.win++;st.streak++;st.bstreak=Math.max(st.bstreak,st.streak);}else st.streak=0;
  if(st.low==null||G.scores[0]<st.low)st.low=G.scores[0];
  G.history.forEach(function(a){if(a[0]===0&&a[1]===26&&a[2]===26)st.moons++;});
  st.rounds+=G.round;
  DB.hrSave=null;Sh.save();
  var w=G.winners.map(nameOf).join(', ');
  msg(won?t('hr.res.win'):t('hr.res.lose',{n:w}),won?'good':'bad');
  Sound.sfx(won?'bjWin':'bjLose');
}

/* ════════ РИСОВАНИЕ ════════ */
function cardHtml(c,cls,attr){return '<div class="dk-card up'+(cls?' '+cls:'')+'"'+(attr||'')+'>'+Cards.face(c,Sh.big())+'</div>';}
function backHtml(cls){return '<div class="dk-card'+(cls?' '+cls:'')+'">'+Cards.back(S.back)+'</div>';}
function portrait(p){
  var b=D.bots[p-1];
  var img=Sh.ART_READY?'<img alt="" src="'+Sh.ART+'bot_'+b+'.webp">':'<span class="bj-ava-f bj-c'+b+'"></span>';
  return '<span class="bj-ava">'+img+'</span>';
}
function buildTable(){
  for(var p=1;p<4;p++){
    $('hr-s'+p).innerHTML='<div class="dk-who">'+portrait(p)+'<span class="dk-nm"><span class="bj-name">'+nameOf(p)+'</span>'+
      '<span class="hr-sc"><b id="hr-t'+p+'">0</b><i id="hr-r'+p+'"></i></span></span></div><div class="dk-ofan" id="hr-f'+p+'"></div>';
  }
  $('hr-s0').innerHTML='<span class="bj-name">'+nameOf(0)+'</span><span class="hr-sc"><b id="hr-t0">0</b><i id="hr-r0"></i></span>';
  layout();
}
function paint(){
  var G=D.G;if(!G)return;
  for(var p=0;p<4;p++){
    $('hr-t'+p).textContent=G.scores[p];
    var rp=G.taken[p];$('hr-r'+p).innerHTML=rp?'&#9829; '+rp:'';
    var el=$('hr-s'+p);el.classList.toggle('turn',G.phase==='play'&&!D.hold&&G.turn===p);
    if(p>0){var n=G.hands[p].length,f='';for(var i=0;i<Math.min(n,7);i++)f+=backHtml('mini');f+='<b class="dk-cnt">'+n+'</b>';$('hr-f'+p).innerHTML=f;}
  }
  /* взятка на столе */
  var tr=D.hold?D.hold.trick:G.trick,h='',seen=D.seenT||{},now={};
  tr.forEach(function(x){var k=R.cid(x.c);now[k]=1;h+='<div class="hr-tc hr-'+SIDE[x.p]+(seen[k]?'':' in')+'">'+cardHtml(x.c,'')+'</div>';});
  D.seenT=now;
  $('hr-trick').innerHTML=h;
  paintHand();setButtons();paintHud();
}
function paintHand(){
  var G=D.G,hand=G.hands[0],h='';
  var my=G.phase==='play'&&!D.hold&&G.turn===0;
  var L=my?R.legal(G,0):[];
  hand.forEach(function(c,i){
    var cls=[];
    if(G.phase==='pass'){cls.push('play');if(D.sel.some(function(x){return R.same(x,c);}))cls.push('sel');}
    else if(my){if(L.some(function(x){return R.same(x,c);}))cls.push('play');else cls.push('dim');}
    if(D.got&&D.got.some(function(x){return R.same(x,c);}))cls.push('got');
    if(D.hintC&&R.same(D.hintC,c))cls.push('hint');
    h+=cardHtml(c,cls.join(' '),' data-h="'+i+'"');
  });
  $('hr-hand').innerHTML=h;
  fanHand();
}
function fanHand(){
  var el=$('hr-hand'),cards=el.children,n=cards.length;if(!el.offsetParent)return;
  var tb=$('hr-table'),cw=parseFloat(getComputedStyle(tb).getPropertyValue('--cw'))||70;
  var W=el.clientWidth-8,step=n>1?Math.min(cw*1.04,(W-cw)/(n-1)):0;
  el.style.height=(cw*1.4+16)+'px';
  var wd=cw+(n-1)*step,x0=(el.clientWidth-wd)/2;
  for(var j=0;j<n;j++){var c=cards[j];c.style.left=(x0+j*step)+'px';c.style.top='12px';c.style.zIndex=j+1;}
}
function msg(s,cls){$('hr-msg').textContent=s||'';$('hr-msg').className='bj-msg dk-msg'+(cls?' '+cls:'');}
function setButtons(){
  var G=D.G,pass=G&&G.phase==='pass';
  $('hr-pass').classList.toggle('hidden',!pass);
  $('hr-pass').disabled=!(pass&&D.sel.length===3);
  if(pass)$('hr-pass-t').textContent=t('hr.pass.'+G.dir)+' '+D.sel.length+'/3';
  var my=G&&G.phase==='play'&&!D.hold&&G.turn===0;
  $('hr-hintb').classList.toggle('hidden',!G||G.phase==='roundEnd'||G.over);
  $('hr-hintb').disabled=!(my||pass);
}
function paintHud(){
  var G=D.G;
  $('hr-title').textContent=t('game.hearts');
  $('hr-sub').textContent=t('hr.round',{n:G.round})+' / '+G.target;
  $('hr-w').textContent=DB.hr.win;$('hr-g').textContent=DB.hr.games;
  $('hr-lo').textContent=DB.hr.low==null?'-':DB.hr.low;
}
/* размер карт: рука из 13 карт внизу, взятка в центре между боковыми местами */
function layout(){
  var tb=$('hr-table');if(!tb||!onScreen())return;
  var w=tb.clientWidth,H=(window.innerHeight||600)-tb.getBoundingClientRect().top-78,low=(window.innerHeight||600)<=500;
  var cw=120;
  for(;cw>34;cw-=2){
    var side=Math.max(70,Math.min(170,cw*1.3));
    var trickW=cw*3.3,trickH=cw*1.4*2.15;
    if(trickW+side*2+36>w&&!low)continue;
    var top=low?0:Math.max(70,Math.min(130,cw*1.05));
    var need=top+trickH+(low?26:40)+cw*1.4+(low?20:40);
    if(need<=H)break;
  }
  setSize(tb,cw);
  /* оценка могла ошибиться: рука не должна уходить под кнопки */
  var ctl=$('hr-ctl'),hand=$('hr-hand');
  for(var k=0;k<20&&cw>34;k++){
    var bottom=hand.getBoundingClientRect().bottom+window.scrollY,lim=(window.innerHeight||600)-ctl.offsetHeight-4;
    if(bottom<=lim)break;
    cw-=3;setSize(tb,cw);
  }
}
function setSize(tb,cw){
  tb.style.setProperty('--cw',cw+'px');
  tb.style.setProperty('--ocw',Math.round(Math.max(16,Math.min(48,cw*0.38)))+'px');
  tb.style.setProperty('--ava',Math.round(Math.max(30,Math.min(68,cw*0.55)))+'px');
  fanHand();
}
window.addEventListener('resize',function(){setTimeout(layout,60);});

/* ── меню ── */
function paintMenu(){
  [['hrtarget',String(S.hrTarget)],['hrpass',S.hrPass],['hrlevel',S.hrLevel]].forEach(function(x){
    document.querySelectorAll('#seg-'+x[0]+' .seg-btn').forEach(function(b){b.classList.toggle('sel',b.dataset.v===x[1]);});
  });
  $('hr-level-note').textContent=t('hr.lnote.'+S.hrLevel);
}
function hasSave(){return !!(DB.hrSave&&DB.hrSave.G&&!DB.hrSave.G.over);}
function statsHtml(el){
  var s=DB.hr,pct=s.games?Math.round(s.win/s.games*100):0;
  var h='<div class="st-row st-head"><span></span><span data-i18n="hr.st.games"></span><span data-i18n="hr.st.win"></span><span data-i18n="hr.st.low"></span></div>';
  h+='<div class="st-row cur"><span data-i18n="game.hearts"></span><b>'+s.games+'</b><b>'+s.win+'</b><b>'+(s.low==null?'-':s.low)+'</b></div>';
  h+='<div class="bj-st2"><span>'+t('bj.st.pct')+' <b>'+pct+'%</b></span><span>'+t('hr.st.moons')+' <b>'+s.moons+'</b></span><span>'+t('bj.st.best')+' <b>'+s.bstreak+'</b></span></div>';
  if(hasSave()){var g=DB.hrSave.G;h+='<div class="bj-st2"><span>'+t('hr.st.saved',{n:g.round,m:g.scores[0]})+'</span></div>';}
  el.innerHTML=h;I18n.apply(el);
}

/* ── ввод ── */
function bind(){
  function seg(id,fn){document.querySelectorAll('#seg-'+id+' .seg-btn').forEach(function(b){b.addEventListener('click',function(){fn(b.dataset.v);Sh.save();Sh.paintMenu();Sound.sfx('select');});});}
  seg('hrtarget',function(v){S.hrTarget=+v;});
  seg('hrpass',function(v){S.hrPass=v;});
  seg('hrlevel',function(v){S.hrLevel=v;});
  $('hr-hand').addEventListener('click',function(e){var c=e.target.closest('[data-h]');if(c)tapCard(+c.getAttribute('data-h'));});
  $('hr-pass').addEventListener('click',doPass);
  $('hr-hintb').addEventListener('click',hint);
  $('hr-menu').addEventListener('click',function(){stop();if(D.hold){D.hold=null;}persist();D.G=null;Sh.showMenu();});
  document.addEventListener('keydown',function(e){
    if(!onScreen()||e.ctrlKey||e.metaKey||e.altKey)return;
    var k=(e.key||'').toLowerCase(),G=D.G;if(!G)return;
    if(k==='enter'||k===' '){
      if(G.phase==='pass'){e.preventDefault();doPass();}
      else if(G.phase==='roundEnd'||G.over){e.preventDefault();next();}
    }
    else if(k==='?'||k==='h')hint();
  });
  I18n.onChange(function(){if(onScreen()&&D.G){buildTable();paint();if(D.G.phase==='roundEnd'||D.G.over)roundPanel();}});
}

window.HR={start:start,resume:resume,hasSave:hasSave,paintMenu:paintMenu,stats:statsHtml,state:D,tapCard:tapCard,doPass:doPass,next:next};
bind();
Sh.paintMenu();
})();
