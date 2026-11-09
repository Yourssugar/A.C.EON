/* A.C.EON CARDS: восьмёрки против роботов. Правила и боты в cerules.js.
   Живёт на странице «Карты»: сукно, рубашка и размер карт из window.SolShell, рисунок карт из cards.js.
   Свой экран #ce, тексты ce.* в lang.js, имена роботов bj.bot*.

   Места по кругу: вы внизу (0), роботы сверху слева направо. Нажали восьмёрку: выбор масти.
   Матч до 100 очков хранится в DB.ceSave и продолжается из меню. */
(function(){
'use strict';

var Sh=window.SolShell,S=Sh.S,DB=Sh.DB,R=window.CERules,t=I18n.t;
var $=function(id){return document.getElementById(id);};
function show(id){$(id).classList.remove('hidden');}
function hide(id){$(id).classList.add('hidden');}

if(S.ceMode!=='special')S.ceMode='classic';
S.ceBots=Math.max(1,Math.min(3,S.ceBots|0||2));
if(S.ceTarget!=='one')S.ceTarget=100;
if(['easy','normal','hard'].indexOf(S.ceLevel)<0)S.ceLevel='normal';
var BOT_N=6,DELAY=650;
if(/[?&]fast\b/.test(location.search))DELAY=50;   /* для автотестов */

/* G: матч из CERules; bots: портреты мест 1..; pick: восьмёрка, для которой выбирается масть */
var D={G:null,bots:[],level:'normal',timer:null,counted:false,pick:null,hintC:null,lastTop:null};

function nameOf(p){return p===0?t('dk.you'):t('bj.bot'+D.bots[p-1]);}
function onScreen(){return document.body.classList.contains('screen-ce');}
function stop(){if(D.timer){clearTimeout(D.timer);D.timer=null;}}
function schedule(d){stop();D.timer=setTimeout(tick,d==null?DELAY:d);}
function persist(){
  if(D.G&&!D.G.over&&D.G.target!=='one')DB.ceSave={G:D.G,bots:D.bots,level:D.level};else DB.ceSave=null;
  Sh.save();
}
function suitName(s){return t('ce.suit.'+s);}

/* ── матч ── */
function pickBots(n){
  var all=[];for(var i=1;i<=BOT_N;i++)all.push(i);
  for(var j=all.length-1;j>0;j--){var k=Math.floor(Math.random()*(j+1)),x=all[j];all[j]=all[k];all[k]=x;}
  D.bots=all.slice(0,n);
}
function enter(){
  document.body.classList.remove('screen-menu','screen-game','screen-bj','screen-dk','screen-hr');document.body.classList.add('screen-ce');
  Sound.music('game');window.scrollTo(0,0);
  hide('ce-panel');buildTable();
}
function start(){
  stop();pickBots(S.ceBots);D.level=S.ceLevel;
  D.G=R.newMatch({n:S.ceBots+1,mode:S.ceMode,target:S.ceTarget==='one'?'one':100,first:Math.floor(Math.random()*(S.ceBots+1))});
  D.counted=false;D.pick=null;D.hintC=null;D.lastTop=null;
  enter();Sound.sfx('deal');persist();
  beginRound();
}
function resume(){
  var sv=DB.ceSave;if(!sv||!sv.G)return start();
  stop();D.G=sv.G;D.bots=sv.bots;D.level=sv.level||S.ceLevel;
  D.counted=false;D.pick=null;D.hintC=null;D.lastTop=null;
  enter();
  if(D.G.phase==='roundEnd'){paint();roundPanel();return;}
  beginRound();
}
function beginRound(){
  hide('ce-panel');paint();
  msg(t('ce.m.first',{n:nameOf(D.G.turn)}));
  schedule(1000);
}

/* ── ход ── */
function tick(){
  D.timer=null;
  var G=D.G;if(!G||!onScreen())return;
  if(G.phase!=='play'&&G.phase!=='drawn')return;
  var p=G.turn;
  if(p===0){prompt();paint();return;}
  paint();
  var a=R.ai(G,p,D.level);
  doAct(p,a);
}
function prompt(){
  var G=D.G;
  if(G.phase==='drawn')msg(t('ce.p.drawn'));
  else if(G.pend>0)msg(t('ce.p.pend',{n:G.pend}));
  else msg(t('ce.p.turn'));
}
function doAct(p,a){
  var G=D.G,round=G.round,dir=G.dir;
  if(!R.apply(G,p,a)){Sound.sfx('nope');return false;}
  D.hintC=null;
  var l=G.last;
  if(a.t==='play'){
    Sound.sfx('card');
    if(a.c.r===8)msg(t('ce.m.eight',{n:nameOf(p),s:suitName(a.suit)}));
    else if(G.mode==='special'&&a.c.r===2&&G.phase!=='roundEnd'&&G.phase!=='over')msg(t('ce.m.two',{n:nameOf(G.turn),k:G.pend}));
    else if(G.mode==='special'&&a.c.r===12&&G.phase==='play')msg(t('ce.m.skip',{n:nameOf(R.next(G,p,1))}));
    else if(G.dir!==dir)msg(t('ce.m.rev'));
    else if(p!==0)msg('');
    if(G.hands[p]&&G.hands[p].length===1&&G.phase==='play')msg(t('ce.m.last',{n:nameOf(p)}));
  }else if(a.t==='draw'){
    Sound.sfx('flip');
    if(l.n>1)msg(p===0?t('ce.m.youDrawN',{k:l.n}):t('ce.m.drawN',{n:nameOf(p),k:l.n}));
    else if(p!==0)msg(l.n?t('ce.m.draw',{n:nameOf(p)}):t('ce.m.pass',{n:nameOf(p)}));
  }else if(a.t==='pass'){
    Sound.sfx('select');if(p!==0)msg(t('ce.m.pass',{n:nameOf(p)}));
  }
  paint();persist();
  if(G.phase==='roundEnd'||G.phase==='over'||G.round!==round){setTimeout(roundPanel,700);return true;}
  schedule(G.turn===0?120:DELAY);
  return true;
}
function myTurn(){var G=D.G;return G&&(G.phase==='play'||G.phase==='drawn')&&G.turn===0&&!D.pick;}
function tapCard(i){
  var G=D.G;if(!myTurn())return;
  var c=G.hands[0][i];if(!c)return;
  var L=R.legal(G,0).filter(function(a){return a.t==='play'&&R.same(a.c,c);});
  if(!L.length){Sound.sfx('nope');return;}
  if(c.r===8&&L[0].suit!==undefined){D.pick=c;suitPanel();return;}
  doAct(0,L[0]);
}
function suitPanel(){
  var h='<div class="hr-pbox ce-suits"><b class="hr-ptitle">'+t('ce.pickSuit')+'</b><div class="ce-sbtns">';
  var best=R.bestSuit(D.G.hands[0],D.pick);
  for(var s=0;s<4;s++)h+='<button class="btn ce-sbtn'+(s===best?' rec':'')+'" data-s="'+s+'">'+Cards.suit(s,'ce-su')+'<span>'+suitName(s)+'</span></button>';
  h+='</div><button class="btn" id="ce-cancel">'+t('ce.cancel')+'</button></div>';
  $('ce-panel').innerHTML=h;show('ce-panel');
  $('ce-panel').querySelectorAll('.ce-sbtn').forEach(function(b){b.addEventListener('click',function(){pickSuit(+b.dataset.s);});});
  $('ce-cancel').addEventListener('click',function(){D.pick=null;hide('ce-panel');paint();});
  setButtons();
}
function pickSuit(s){
  var c=D.pick;if(!c)return;
  D.pick=null;hide('ce-panel');
  doAct(0,{t:'play',c:c,suit:s});
}
function act(kind){
  if(!myTurn())return;
  var G=D.G;
  if(kind==='draw'&&G.phase==='play')doAct(0,{t:'draw'});
  else if(kind==='pass'&&G.phase==='drawn')doAct(0,{t:'pass'});
  else if(kind==='hint'){
    var a=R.ai(G,0,'normal');if(!a)return;Sound.sfx('select');
    if(a.t==='play'){D.hintC=a.c;msg(a.c.r===8?t('ce.h.eight',{s:suitName(a.suit)}):t('ce.h.play'));}
    else msg(t(a.t==='pass'?'ce.h.pass':'ce.h.draw'));
    paint();
  }
}

/* ── конец раздачи и матча ── */
function roundPanel(){
  var G=D.G,rr=G.roundRes;if(!rr)return;
  stop();
  var order=[];for(var p=0;p<G.n;p++)order.push(p);
  order.sort(function(a,b){return G.scores[b]-G.scores[a];});
  var h='<div class="hr-pbox"><b class="hr-ptitle">'+(G.over?t('hr.over'):t('hr.roundEnd',{n:G.round}))+'</b>';
  h+='<div class="hr-moon">'+(rr.w===0?t('ce.res.you',{k:rr.pts}):t('ce.res.round',{n:nameOf(rr.w),k:rr.pts}))+(rr.blocked?' '+t('ce.res.blocked'):'')+'</div>';
  h+='<div class="hr-rows"><div class="hr-row hr-head"><span></span><span>'+t('ce.col.left')+'</span><span>'+t('hr.col.total')+'</span></div>';
  order.forEach(function(q,i){
    var win=G.over&&G.winners.indexOf(q)>=0;
    h+='<div class="hr-row'+(q===0?' me':'')+(win?' win':'')+'"><span>'+(i+1)+'. '+nameOf(q)+'</span><span>'+(q===rr.w?'+'+rr.pts:rr.left[q])+'</span><b>'+G.scores[q]+'</b></div>';
  });
  h+='</div>';
  if(!G.over)h+='<div class="hr-note">'+t('ce.toTarget')+'</div>';
  h+='<button class="btn bj-deal" id="ce-next">&#9654; '+t(G.over?'dk.new':'hr.next')+'</button></div>';
  $('ce-panel').innerHTML=h;show('ce-panel');
  $('ce-next').addEventListener('click',nextRound);
  if(G.over)finish();
  else msg(rr.w===0?t('ce.res.you',{k:rr.pts}):t('ce.res.round',{n:nameOf(rr.w),k:rr.pts}),rr.w===0?'good':'');
  setButtons();
}
function nextRound(){
  var G=D.G;if(!G)return;
  if(G.over){start();return;}
  if(G.phase!=='roundEnd')return;
  R.deal(G,Math.random);D.lastTop=null;
  Sound.sfx('deal');persist();beginRound();
}
function finish(){
  var G=D.G;if(D.counted)return;D.counted=true;
  var st=DB.ce;st.games++;
  var won=G.winners.indexOf(0)>=0;
  if(won){st.win++;st.streak++;st.bstreak=Math.max(st.bstreak,st.streak);}else st.streak=0;
  G.history.forEach(function(h){st.rounds++;if(h.w===0){st.rwin++;st.best=Math.max(st.best,h.pts);}});
  DB.ceSave=null;Sh.save();
  msg(won?t('ce.res.win'):t('ce.res.lose',{n:G.winners.map(nameOf).join(', ')}),won?'good':'bad');
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
  var G=D.G,h='';
  for(var p=1;p<G.n;p++){
    h+='<div class="dk-opp" id="ce-o'+p+'"><div class="dk-who">'+portrait(p)+
      '<span class="dk-nm"><span class="bj-name">'+nameOf(p)+'</span><span class="hr-sc"><b id="ce-sc'+p+'">0</b></span></span></div>'+
      '<div class="dk-ofan" id="ce-f'+p+'"></div></div>';
  }
  $('ce-opps').innerHTML=h;
  $('ce-mybar').innerHTML='<span class="bj-name">'+nameOf(0)+'</span><span class="hr-sc"><b id="ce-sc0">0</b></span>';
  layout();
}
function paint(){
  var G=D.G;if(!G)return;
  for(var p=0;p<G.n;p++){
    $('ce-sc'+p).textContent=G.scores[p];
    var el=p?$('ce-o'+p):$('ce-me');
    el.classList.toggle('turn',(G.phase==='play'||G.phase==='drawn')&&G.turn===p);
    if(p){var n=G.hands[p].length,f='';for(var i=0;i<Math.min(n,8);i++)f+=backHtml('mini');f+='<b class="dk-cnt'+(n===1?' one':'')+'">'+n+'</b>';$('ce-f'+p).innerHTML=f;}
  }
  /* колода и сброс */
  $('ce-deck').innerHTML=(G.deck.length?backHtml(''):'<div class="ce-empty"></div>')+'<b class="dk-dn">'+G.deck.length+'</b>';
  var top=G.top,fresh=!D.lastTop||!R.same(D.lastTop,top);D.lastTop=top;
  var under=G.discard.length>1?G.discard[G.discard.length-2]:null;
  $('ce-pile').innerHTML=(under?'<div class="ce-under">'+cardHtml(under,'')+'</div>':'')+'<div class="ce-top'+(fresh?' in':'')+'">'+cardHtml(top,'')+'</div>';
  var info='<div class="ce-suit'+(top.r===8?' named':'')+'">'+Cards.suit(G.suit,'dk-su')+'</div>';
  if(G.mode==='special'&&G.n>2)info+='<div class="ce-dir">'+(G.dir>0?'&#8635;':'&#8634;')+'</div>';
  if(G.pend>0)info+='<div class="ce-pend">+'+G.pend+'</div>';
  $('ce-info').innerHTML=info;
  paintHand();setButtons();paintHud();
}
function paintHand(){
  var G=D.G,hand=G.hands[0],h='',my=myTurn();
  var L=my?R.legal(G,0):[];
  hand.forEach(function(c,i){
    var cls=[];
    if(my){if(L.some(function(a){return a.t==='play'&&R.same(a.c,c);}))cls.push('play');else cls.push('dim');}
    if(G.phase==='drawn'&&G.drawn&&R.same(G.drawn,c))cls.push('got');
    if(D.hintC&&R.same(D.hintC,c))cls.push('hint');
    h+=cardHtml(c,cls.join(' '),' data-h="'+i+'"');
  });
  $('ce-hand').innerHTML=h;
  fanHand();
}
/* веер руки: много карт уходит в два ряда */
function fanHand(){
  var el=$('ce-hand'),cards=el.children,n=cards.length;if(!el.offsetParent)return;
  var tb=$('ce-table'),cw=parseFloat(getComputedStyle(tb).getPropertyValue('--cw'))||70;
  var W=el.clientWidth-8,rows=1,per=n;
  var step=n>1?Math.min(cw*1.04,(W-cw)/(n-1)):0;
  if(n>1&&step<cw*0.3){rows=2;per=Math.ceil(n/2);step=per>1?Math.min(cw*1.04,(W-cw)/(per-1)):0;}
  el.style.height=(cw*1.4+(rows-1)*cw*0.62+14)+'px';
  for(var r=0;r<rows;r++){
    var from=r*per,cnt=Math.min(per,n-from),wd=cw+(cnt-1)*step,x0=(el.clientWidth-wd)/2;
    for(var j=0;j<cnt;j++){var c=cards[from+j];c.style.left=(x0+j*step)+'px';c.style.top=(10+r*cw*0.62)+'px';c.style.zIndex=from+j+1;}
  }
}
function msg(s,cls){$('ce-msg').textContent=s||'';$('ce-msg').className='bj-msg dk-msg'+(cls?' '+cls:'');}
function setButtons(){
  var G=D.G,my=myTurn(),live=G&&(G.phase==='play'||G.phase==='drawn');
  $('ce-draw').classList.toggle('hidden',!live);$('ce-draw').disabled=!(my&&G.phase==='play');
  $('ce-draw-t').textContent=G&&G.pend>0?t('ce.drawN',{n:G.pend}):t('ce.draw');
  $('ce-pass').classList.toggle('hidden',!(live&&G.phase==='drawn'&&G.turn===0));
  $('ce-hintb').classList.toggle('hidden',!live);$('ce-hintb').disabled=!my;
}
function paintHud(){
  var G=D.G;
  $('ce-title').textContent=t('game.eights');
  $('ce-sub').textContent=t('dk.lvl.'+D.level)+' / '+(G.target==='one'?t('ce.target.one'):G.target);
  $('ce-g').textContent=DB.ce.games;$('ce-w').textContent=DB.ce.win;$('ce-rw').textContent=DB.ce.rwin;
}
/* размер карт: соперники сверху, колода и сброс посередине, рука снизу */
function layout(){
  var tb=$('ce-table');if(!tb||!onScreen())return;
  var w=tb.clientWidth,H=(window.innerHeight||600)-tb.getBoundingClientRect().top-78,low=(window.innerHeight||600)<=500;
  var cw=130;
  for(;cw>34;cw-=2){
    if(cw*3.6>w-20)continue;
    var opp=low?44:Math.max(64,Math.min(120,cw*0.95));
    var need=opp+cw*1.4*1.15+(low?28:44)+cw*1.4*1.3+(low?14:40);
    if(need<=H)break;
  }
  setSize(tb,cw);
  var ctl=$('ce-ctl'),hand=$('ce-hand');
  for(var k=0;k<20&&cw>34;k++){
    var bottom=hand.getBoundingClientRect().bottom+window.scrollY,lim=(window.innerHeight||600)-ctl.offsetHeight-4;
    if(bottom<=lim)break;
    cw-=3;setSize(tb,cw);
  }
}
function setSize(tb,cw){
  tb.style.setProperty('--cw',cw+'px');
  /* веер соперника не шире его доли стола: 8 рубашек с нахлёстом и число карт */
  var bots=D.G?D.G.n-1:1,share=(tb.clientWidth-20)/bots-48;
  tb.style.setProperty('--ocw',Math.round(Math.max(14,Math.min(58,cw*0.42,share/3.6)))+'px');
  tb.style.setProperty('--ava',Math.round(Math.max(32,Math.min(72,cw*0.6)))+'px');
  fanHand();
}
window.addEventListener('resize',function(){setTimeout(layout,60);});

/* ── меню ── */
function paintMenu(){
  [['cemode',S.ceMode],['cebots',String(S.ceBots)],['cetarget',String(S.ceTarget)],['celevel',S.ceLevel]].forEach(function(x){
    document.querySelectorAll('#seg-'+x[0]+' .seg-btn').forEach(function(b){b.classList.toggle('sel',b.dataset.v===x[1]);});
  });
  $('ce-mode-note').textContent=t('ce.note.'+S.ceMode);
  $('ce-level-note').textContent=t('ce.lnote.'+S.ceLevel);
}
function hasSave(){return !!(DB.ceSave&&DB.ceSave.G&&!DB.ceSave.G.over);}
function statsHtml(el){
  var s=DB.ce,pct=s.games?Math.round(s.win/s.games*100):0;
  var h='<div class="st-row st-head"><span></span><span data-i18n="hr.st.games"></span><span data-i18n="hr.st.win"></span><span data-i18n="ce.st.rwin"></span></div>';
  h+='<div class="st-row cur"><span data-i18n="game.eights"></span><b>'+s.games+'</b><b>'+s.win+'</b><b>'+s.rwin+'/'+s.rounds+'</b></div>';
  h+='<div class="bj-st2"><span>'+t('bj.st.pct')+' <b>'+pct+'%</b></span><span>'+t('ce.st.best')+' <b>'+s.best+'</b></span><span>'+t('bj.st.best')+' <b>'+s.bstreak+'</b></span></div>';
  if(hasSave()){var g=DB.ceSave.G;h+='<div class="bj-st2"><span>'+t('ce.st.saved',{n:g.round,m:g.scores[0]})+'</span></div>';}
  el.innerHTML=h;I18n.apply(el);
}

/* ── ввод ── */
function bind(){
  function seg(id,fn){document.querySelectorAll('#seg-'+id+' .seg-btn').forEach(function(b){b.addEventListener('click',function(){fn(b.dataset.v);Sh.save();Sh.paintMenu();Sound.sfx('select');});});}
  seg('cemode',function(v){S.ceMode=v;});
  seg('cebots',function(v){S.ceBots=+v;});
  seg('cetarget',function(v){S.ceTarget=v==='one'?'one':+v;});
  seg('celevel',function(v){S.ceLevel=v;});
  $('ce-hand').addEventListener('click',function(e){var c=e.target.closest('[data-h]');if(c)tapCard(+c.getAttribute('data-h'));});
  $('ce-deck').addEventListener('click',function(){act('draw');});
  $('ce-draw').addEventListener('click',function(){act('draw');});
  $('ce-pass').addEventListener('click',function(){act('pass');});
  $('ce-hintb').addEventListener('click',function(){act('hint');});
  $('ce-menu').addEventListener('click',function(){stop();D.pick=null;persist();D.G=null;Sh.showMenu();});
  document.addEventListener('keydown',function(e){
    if(!onScreen()||e.ctrlKey||e.metaKey||e.altKey)return;
    var k=(e.key||'').toLowerCase(),G=D.G;if(!G)return;
    if(D.pick&&k>='1'&&k<='4'){pickSuit(+k-1);return;}
    if(k==='escape'&&D.pick){D.pick=null;hide('ce-panel');paint();return;}
    if(k==='enter'&&(G.phase==='roundEnd'||G.over)){e.preventDefault();nextRound();return;}
    if(k===' '||k==='d'){e.preventDefault();if(G.phase==='drawn')act('pass');else act('draw');}
    else if(k==='?'||k==='h')act('hint');
  });
  I18n.onChange(function(){if(onScreen()&&D.G){buildTable();paint();if(D.G.phase==='roundEnd'||D.G.over)roundPanel();}});
}

window.CE={start:start,resume:resume,hasSave:hasSave,paintMenu:paintMenu,stats:statsHtml,state:D,tapCard:tapCard,pickSuit:pickSuit,act:act,next:nextRound};
bind();
Sh.paintMenu();
})();
