/* A.C.EON CARDS: 21 против дилера, без ставок. Правила в bjrules.js.
   Живёт на странице пасьянса: берёт оттуда настройки стола, рубашку и размер карт (window.SolShell),
   рисунок карт из cards.js. Свой экран #bj, свои тексты bj.* в lang.js.

   Раунд: раздача по две карты (вторая карта дилера закрыта), ходы по местам слева направо
   (боты сами, игрок кнопками), потом дилер открывает карту и добирает, итог по каждой руке. */
(function(){
'use strict';

var Sh=window.SolShell,S=Sh.S,DB=Sh.DB,R=window.BJRules,t=I18n.t;
var $=function(id){return document.getElementById(id);};
function show(id){$(id).classList.remove('hidden');}
function hide(id){$(id).classList.add('hidden');}

if(['bj','ochko'].indexOf(S.bjRules)<0)S.bjRules='bj';
S.bjBots=Math.max(0,Math.min(3,S.bjBots|0));
var BOT_N=6;

Sound.define('bjWin',function(tm,tone){[523,659,784].forEach(function(f,i){tone(tm+i*0.07,f,0.14,'triangle',0.05);});});
Sound.define('bjLose',function(tm,tone){tone(tm,300,0.12,'triangle',0.05,200);});
Sound.define('bjBust',function(tm,tone,noise){noise(tm,0.08,0.2,600);tone(tm,160,0.14,'square',0.04,110);});

/* ── состояние раунда ──
   seats: [{bot: номер портрета или 0 у игрока, me, hands:[{cards,done,res,fromSplit}], active}]
   turn: индекс места, hi: индекс руки; phase: idle | deal | play | dealer | done */
var B={kind:'bj',shoe:[],seats:[],dealer:[],hole:true,turn:-1,hi:0,phase:'idle',queue:[],bots:[]};
var DELAY=330;

function stats(){return DB.bj[B.kind];}
function nameOf(seat){return seat.me?t('bj.you'):t('bj.bot'+seat.bot);}

/* ── очередь шагов с паузами: раздача, ходы ботов, дилер ── */
var timer=null;
function run(steps,done){
  B.queue=steps.slice();
  function next(){
    if(!B.queue.length){timer=null;if(done)done();return;}
    var f=B.queue.shift();var d=f();timer=setTimeout(next,d===undefined?DELAY:d);
  }
  next();
}
function stop(){if(timer){clearTimeout(timer);timer=null;}B.queue=[];}

/* ── новый раунд ── */
function pickBots(){
  var all=[];for(var i=1;i<=BOT_N;i++)all.push(i);
  for(var j=all.length-1;j>0;j--){var k=Math.floor(Math.random()*(j+1)),x=all[j];all[j]=all[k];all[k]=x;}
  B.bots=all.slice(0,S.bjBots);
}
function start(){
  B.kind=S.bjRules;B.shoe=R.shoe(B.kind,Math.random);pickBots();
  document.body.classList.remove('screen-menu','screen-game');document.body.classList.add('screen-bj');
  Sound.music('game');window.scrollTo(0,0);
  $('bj-title').textContent=t('bj.kind.'+B.kind);
  deal();
}
function seatsFor(){
  /* места слева направо: первый бот, игрок, остальные боты */
  var s=[],b=B.bots.slice();
  if(b.length)s.push({bot:b.shift(),me:false});
  s.push({bot:0,me:true});
  while(b.length)s.push({bot:b.shift(),me:false});
  s.forEach(function(x){x.hands=[{cards:[],done:false,res:null}];});
  return s;
}
function draw(){
  if(B.shoe.length<12){B.shoe=R.shoe(B.kind,Math.random);msg(t('bj.shuffle'));}
  return B.shoe.pop();
}
function deal(){
  stop();
  B.seats=seatsFor();B.dealer=[];B.hole=true;B.turn=-1;B.hi=0;B.phase='deal';
  hide('bj-deal');buildTable();setButtons();msg('');
  Sound.sfx('deal');
  var steps=[];
  for(var round=0;round<2;round++){
    B.seats.forEach(function(seat){steps.push(function(){seat.hands[0].cards.push(draw());Sound.sfx('card');paint();});});
    steps.push(function(){B.dealer.push(draw());Sound.sfx('card');paint();});
  }
  run(steps,afterDeal);
}
function afterDeal(){
  /* у дилера блэкджек: в блэкджеке он проверяет сразу, если открыт туз или десятка */
  if(B.kind==='bj'&&R.isNatural('bj',B.dealer)){B.hole=false;paint();msg(t('bj.dealerBJ'));finish();return;}
  if(B.kind==='ochko'&&R.isNatural('ochko',B.dealer)){B.hole=false;paint();msg(t('bj.dealerGold'));finish();return;}
  B.phase='play';B.turn=-1;nextSeat();
}
function nextSeat(){
  B.turn++;B.hi=0;
  if(B.turn>=B.seats.length){dealerPlay();return;}
  var seat=B.seats[B.turn];
  paint();
  if(seat.me)myTurn();else botTurn(seat);
}
function hand(){var seat=B.seats[B.turn];return seat&&seat.hands[B.hi];}
/* рука закончилась сама: перебор, 21, натуральная */
function autoDone(h){
  if(R.isNatural(B.kind,h.cards)&&!h.fromSplit)return true;
  if(R.bust(B.kind,h.cards))return true;
  if(R.total(B.kind,h.cards).t===21)return true;
  if(h.splitAces&&h.cards.length>=2)return true;
  return false;
}
function nextHand(){
  var seat=B.seats[B.turn];
  seat.hands[B.hi].done=true;
  if(B.hi+1<seat.hands.length){B.hi++;paint();if(seat.me)myTurn();else botTurn(seat);return;}
  nextSeat();
}

/* ── ход игрока ── */
function myTurn(){
  var h=hand();
  if(h.cards.length<2){h.cards.push(draw());Sound.sfx('card');paint();}   /* вторая карта после разделения */
  if(autoDone(h)){
    if(R.isNatural(B.kind,h.cards)&&!h.fromSplit)msg(t(B.kind==='bj'?'bj.youBJ':'bj.youGold'));
    else if(R.bust(B.kind,h.cards)){msg(t('bj.bust'));Sound.sfx('bjBust');}
    setButtons();setTimeout(nextHand,650);return;
  }
  msg(t(B.seats[B.turn].hands.length>1?'bj.yourHand':'bj.yourTurn',{n:B.hi+1}));
  setButtons();
}
function act(a){
  if(B.phase!=='play')return;
  var seat=B.seats[B.turn];if(!seat||!seat.me)return;
  var h=hand();
  if(a==='hit'){
    h.cards.push(draw());Sound.sfx('card');paint();
    if(R.bust(B.kind,h.cards)){msg(t('bj.bust'));Sound.sfx('bjBust');setButtons(true);setTimeout(nextHand,650);return;}
    if(R.total(B.kind,h.cards).t===21){setButtons(true);setTimeout(nextHand,500);return;}
    setButtons();
  }else if(a==='stand'){Sound.sfx('select');nextHand();}
  else if(a==='split'){
    if(!R.canSplit(B.kind,h,seat.hands.length))return;
    var c=h.cards.pop(),aces=c.r===1;
    h.fromSplit=true;h.splitAces=aces;
    seat.hands.splice(B.hi+1,0,{cards:[c],done:false,res:null,fromSplit:true,splitAces:aces});
    Sound.sfx('card');paint();myTurn();
  }
  else if(a==='hint'){
    var ad=R.advice(B.kind,h,B.dealer[0],seat.hands.length);
    msg(t('bj.adv.'+ad));Sound.sfx('select');
  }
}

/* ── ход бота: базовая стратегия, с паузами ── */
function botTurn(seat){
  setButtons();
  msg(t('bj.botTurn',{n:nameOf(seat)}));
  function step(){
    var h=hand();
    if(h.cards.length<2){h.cards.push(draw());Sound.sfx('card');paint();return setTimeout(step,DELAY);}
    if(autoDone(h)){return setTimeout(nextHand,DELAY);}
    var a=R.advice(B.kind,h,B.dealer[0],seat.hands.length);
    if(a==='split'){var c=h.cards.pop(),aces=c.r===1;h.fromSplit=true;h.splitAces=aces;
      seat.hands.splice(B.hi+1,0,{cards:[c],done:false,res:null,fromSplit:true,splitAces:aces});paint();return setTimeout(step,DELAY);}
    if(a==='hit'){h.cards.push(draw());Sound.sfx('card');paint();return setTimeout(step,DELAY+80);}
    setTimeout(nextHand,DELAY);
  }
  timer=setTimeout(step,DELAY+150);
}

/* ── дилер ── */
function dealerPlay(){
  B.phase='dealer';B.turn=-1;setButtons();
  B.hole=false;paint();Sound.sfx('flip');
  var live=B.seats.some(function(s){return s.hands.some(function(h){return !R.bust(B.kind,h.cards);});});
  msg(t('bj.dealerTurn'));
  function step(){
    if(live&&R.dealerHits(B.kind,B.dealer)){B.dealer.push(draw());Sound.sfx('card');paint();timer=setTimeout(step,DELAY+120);return;}
    finish();
  }
  timer=setTimeout(step,DELAY+200);
}
function finish(){
  B.phase='done';B.hole=false;
  var st=stats(),mine=[];
  B.seats.forEach(function(seat){seat.hands.forEach(function(h){h.res=R.settle(B.kind,h,B.dealer);if(seat.me)mine.push(h);});});
  mine.forEach(function(h){
    st.hands++;st[h.res]++;
    if(R.isNatural(B.kind,h.cards)&&!h.fromSplit)st.nat++;
    if(h.res==='win'){st.streak++;st.best=Math.max(st.best,st.streak);}else if(h.res==='loss')st.streak=0;
  });
  Sh.save();
  paint();setButtons();
  var w=mine.filter(function(h){return h.res==='win';}).length,l=mine.filter(function(h){return h.res==='loss';}).length;
  var key=w>l?'bj.res.win':l>w?'bj.res.loss':'bj.res.push';
  msg(t(key)+(st.streak>1&&w>l?' '+t('bj.streak',{n:st.streak}):''),w>l?'good':l>w?'bad':'');
  Sound.sfx(w>l?'bjWin':l>w?'bjLose':'select');
  show('bj-deal');paintHud();
}

/* ════════ РИСОВАНИЕ ════════ */
function cardHtml(c,down,fresh){
  return '<div class="bj-card'+(down?'':' up')+(fresh?' in':'')+'">'+(down?Cards.back(S.back):Cards.face(c,Sh.big()))+'</div>';
}
var shown={};   /* сколько карт уже нарисовано в каждой руке: новые прилетают с анимацией */
function handHtml(key,cards,hideFrom){
  var n=shown[key]||0,h='';
  var mode=hideFrom===0?'c':'o';if(shown[key+'m']&&shown[key+'m']!==mode)n=cards.length;shown[key+'m']=mode;
  cards.forEach(function(c,i){h+=cardHtml(c,hideFrom!=null&&i>=hideFrom,i>=n);});
  shown[key]=cards.length;
  return h;
}
/* в очко карты соперников закрыты до конца раунда, в блэкджеке все карты игроков открыты, как в казино */
function hidden(seat){return !seat.me&&B.kind==='ochko'&&B.phase!=='done';}
function totalTxt(cards,hideFrom){
  if(!cards.length)return '';
  var vis=hideFrom!=null?cards.slice(0,hideFrom):cards;
  var tt=R.total(B.kind,vis);
  if(R.isNatural(B.kind,cards)&&hideFrom==null)return B.kind==='bj'?'BJ':'21';
  return (tt.soft&&tt.t<21?(tt.t-10)+' / ':'')+tt.t;
}
function portrait(seat){
  if(seat.me)return '';
  var img=Sh.ART_READY?'<img alt="" src="'+Sh.ART+'bot_'+seat.bot+'.webp">':'<span class="bj-ava-f bj-c'+seat.bot+'"></span>';
  return '<span class="bj-ava">'+img+'</span>';
}
function buildTable(){
  shown={};
  var d=$('bj-dealer');
  d.innerHTML='<div class="bj-who">'+(Sh.ART_READY?'<span class="bj-ava big"><img alt="" src="'+Sh.ART+'dealer.webp"></span>':'<span class="bj-ava big"><span class="bj-ava-f bj-c0"></span></span>')+
    '<span class="bj-name" data-i18n="'+(B.kind==='bj'?'bj.dealer':'bj.banker')+'"></span><b class="bj-tot" id="bj-dt"></b></div><div class="bj-hand" id="bj-dh"></div>';
  var h='';
  B.seats.forEach(function(seat,i){
    h+='<div class="bj-seat'+(seat.me?' me':'')+'" id="bj-s'+i+'"><div class="bj-hands" id="bj-hs'+i+'"></div>'+
      '<div class="bj-who">'+portrait(seat)+'<span class="bj-name">'+nameOf(seat)+'</span></div></div>';
  });
  $('bj-seats').innerHTML=h;
  I18n.apply($('bj-table'));
  layout();
}
function paint(){
  var hf=B.hole&&B.dealer.length>1?1:null;
  $('bj-dh').innerHTML=handHtml('d',B.dealer,hf);
  $('bj-dt').textContent=totalTxt(B.dealer,hf);
  B.seats.forEach(function(seat,i){
    var el=$('bj-s'+i);el.classList.toggle('turn',i===B.turn&&(B.phase==='play'));
    var h='',closed=hidden(seat);
    seat.hands.forEach(function(hd,j){
      var act=i===B.turn&&j===B.hi&&B.phase==='play'&&seat.hands.length>1;
      var res=hd.res?'<span class="bj-res r-'+hd.res+'">'+t('bj.r.'+hd.res)+'</span>':'';
      var bust=!closed&&R.bust(B.kind,hd.cards)?' bust':'';
      h+='<div class="bj-hand-w'+(act?' act':'')+bust+'"><div class="bj-hand">'+handHtml(i+'-'+j,hd.cards,closed?0:null)+'</div>'+
        '<div class="bj-under"><b class="bj-tot">'+(closed?(hd.cards.length?'?':''):totalTxt(hd.cards,null))+'</b>'+res+'</div></div>';
    });
    $('bj-hs'+i).innerHTML=h;
  });
  paintHud();
}
function msg(s,cls){$('bj-msg').textContent=s||'';$('bj-msg').className='bj-msg'+(cls?' '+cls:'');}
function setButtons(lock){
  var seat=B.seats[B.turn],my=B.phase==='play'&&seat&&seat.me&&!lock,h=my&&hand();
  var en=my&&h&&!autoDone(h)&&h.cards.length>=2;
  $('bj-hit').disabled=!en;$('bj-stand').disabled=!en;$('bj-hintb').disabled=!en;
  var sp=en&&R.canSplit(B.kind,h,seat.hands.length);
  $('bj-split').classList.toggle('hidden',B.kind!=='bj');$('bj-split').disabled=!sp;
  ['bj-hit','bj-stand','bj-split','bj-hintb'].forEach(function(id){$(id).classList.toggle('hidden',B.phase==='done'||(id==='bj-split'&&B.kind!=='bj'));});
}
function paintHud(){
  var st=stats();$('bj-w').textContent=st.win;$('bj-l').textContent=st.loss;$('bj-p').textContent=st.push;
  $('bj-shoe').textContent=t('bj.shoeLeft',{n:B.shoe.length});
}
/* размер карт от ширины стола и числа мест */
function layout(){
  var tb=$('bj-table');if(!tb||!document.body.classList.contains('screen-bj'))return;
  var w=tb.clientWidth,hgt=(window.innerHeight||600)-tb.getBoundingClientRect().top-90;
  var bots=Math.max(0,(B.seats.length||1)-1);
  /* узко и ботов двое-трое: боты рядом сверху, игрок один строкой ниже */
  var narrow=bots>=2&&w<640;
  tb.classList.toggle('bj-narrow',narrow);
  var cw,cwb;
  if(narrow){
    cw=Math.floor(Math.min(84,(w-20)/3.4,hgt/5.6));cw=Math.max(34,cw);
    cwb=Math.floor(Math.min(cw*0.72,((w-16)/bots-14)/2.2));cwb=Math.max(24,cwb);
  }else{
    /* по ширине: рука игрока около 2.6 ширины карты, у ботов 0.8 от неё;
       по высоте: две руки карт (дилер и места) плюс портреты, подписи и сообщение */
    var hh=(window.innerHeight||600)-tb.getBoundingClientRect().top-80;
    cw=Math.floor(Math.min(150,(w-20-bots*28)/(2.6+bots*0.8*2.4),(hh-285)/2.85));
    cw=Math.max(34,cw);cwb=Math.max(26,Math.round(cw*0.8));
  }
  var ava=narrow?40:Math.round(Math.max(40,Math.min(76,cw*0.6)));
  tb.style.setProperty('--ava',ava+'px');
  tb.style.setProperty('--cw',cw+'px');tb.style.setProperty('--cwb',cwb+'px');
}
window.addEventListener('resize',function(){setTimeout(layout,60);});

/* ── меню: настройки и статистика 21 ── */
function paintMenu(){
  document.querySelectorAll('#seg-bjrules .seg-btn').forEach(function(b){b.classList.toggle('sel',b.dataset.v===S.bjRules);});
  document.querySelectorAll('#seg-bjbots .seg-btn').forEach(function(b){b.classList.toggle('sel',b.dataset.v===String(S.bjBots));});
  $('bj-rules-note').textContent=t('bj.note.'+S.bjRules);
}
function statsHtml(el){
  var h='<div class="st-row st-head"><span></span><span data-i18n="bj.st.win"></span><span data-i18n="bj.st.loss"></span><span data-i18n="bj.st.push"></span></div>';
  ['bj','ochko'].forEach(function(k){var s=DB.bj[k];
    h+='<div class="st-row'+(k===S.bjRules?' cur':'')+'"><span data-i18n="bj.kind.'+k+'"></span><b>'+s.win+'</b><b>'+s.loss+'</b><b>'+s.push+'</b></div>';});
  var s=DB.bj[S.bjRules],pct=s.hands?Math.round(s.win/s.hands*100):0;
  h+='<div class="bj-st2"><span>'+t('bj.st.hands')+' <b>'+s.hands+'</b></span><span>'+t('bj.st.pct')+' <b>'+pct+'%</b></span><span>'+t('bj.st.nat')+' <b>'+s.nat+'</b></span><span>'+t('bj.st.best')+' <b>'+s.best+'</b></span></div>';
  el.innerHTML=h;I18n.apply(el);
}

/* ── ввод ── */
function bind(){
  function seg(id,fn){document.querySelectorAll('#seg-'+id+' .seg-btn').forEach(function(b){b.addEventListener('click',function(){fn(b.dataset.v);Sh.save();Sh.paintMenu();Sound.sfx('select');});});}
  seg('bjrules',function(v){S.bjRules=v;});
  seg('bjbots',function(v){S.bjBots=+v;});
  $('bj-hit').addEventListener('click',function(){act('hit');});
  $('bj-stand').addEventListener('click',function(){act('stand');});
  $('bj-split').addEventListener('click',function(){act('split');});
  $('bj-hintb').addEventListener('click',function(){act('hint');});
  $('bj-deal').addEventListener('click',deal);
  $('bj-menu').addEventListener('click',function(){stop();B.phase='idle';Sh.showMenu();});
  document.addEventListener('keydown',function(e){
    if(!document.body.classList.contains('screen-bj')||e.ctrlKey||e.metaKey||e.altKey)return;
    var k=(e.key||'').toLowerCase();
    if(k==='enter'&&B.phase==='done'){e.preventDefault();deal();return;}
    if(k==='h'||k==='arrowup'){e.preventDefault();act('hit');}
    else if(k==='s'||k==='arrowdown'){e.preventDefault();act('stand');}
    else if(k==='p'){act('split');}
    else if(k==='?'){act('hint');}
  });
  I18n.onChange(function(){if(document.body.classList.contains('screen-bj')){buildTable();paint();setButtons();}});
}

window.BJ={start:start,paintMenu:paintMenu,stats:statsHtml,state:B,act:act,deal:deal};
bind();
Sh.paintMenu();
})();
