/* A.C.EON CARDS: дурак против роботов (подкидной и переводной). Правила и боты в durules.js.
   Живёт на странице «Карты»: берёт оттуда сукно, рубашку и размер карт (window.SolShell),
   рисунок карт из cards.js. Свой экран #dk, свои тексты dk.* в lang.js, имена роботов bj.bot*.

   Места по кругу по часовой стрелке: вы внизу (0), дальше роботы слева, сверху, справа.
   Ход игрока: нажать карту. Если ею можно побить несколько карт или перевести,
   карта выделяется, потом нажать карту на столе или место «перевести». */
(function(){
'use strict';

var Sh=window.SolShell,S=Sh.S,DB=Sh.DB,R=window.DKRules,t=I18n.t;
var $=function(id){return document.getElementById(id);};
function show(id){$(id).classList.remove('hidden');}
function hide(id){$(id).classList.add('hidden');}

if(['podk','perev'].indexOf(S.dkMode)<0)S.dkMode='podk';
S.dkBots=Math.max(1,Math.min(3,S.dkBots|0||2));
if(['easy','normal','hard'].indexOf(S.dkLevel)<0)S.dkLevel='normal';
var BOT_N=6,DELAY=650,END_PAUSE=950;

/* G: партия из DKRules; bots: номера портретов; sel: выделенная карта; hold: стол закончившегося отбоя на паузе */
var D={G:null,bots:[],sel:null,hold:null,timer:null,counted:false,shown:{}};

function stats(){return DB.dk[S.dkMode];}
function nameOf(p){return p===0?t('dk.you'):t('bj.bot'+D.bots[p-1]);}
function onScreen(){return document.body.classList.contains('screen-dk');}

/* ── партия ── */
function pickBots(){
  var all=[];for(var i=1;i<=BOT_N;i++)all.push(i);
  for(var j=all.length-1;j>0;j--){var k=Math.floor(Math.random()*(j+1)),x=all[j];all[j]=all[k];all[k]=x;}
  D.bots=all.slice(0,S.dkBots);
}
function start(){
  stop();pickBots();
  D.G=R.newGame({n:S.dkBots+1,mode:S.dkMode});D.sel=null;D.hold=null;D.counted=false;D.shown={};
  document.body.classList.remove('screen-menu','screen-game','screen-bj');document.body.classList.add('screen-dk');
  Sound.music('game');window.scrollTo(0,0);
  $('dk-title').textContent=t('dk.mode.'+S.dkMode);
  hide('dk-new');buildTable();
  Sound.sfx('deal');
  var lt=D.G.lowTrump;
  msg(lt?t('dk.first',{n:nameOf(lt.p)}):t('dk.firstNone',{n:nameOf(D.G.att)}));
  paint();
  schedule(1300);
}
function stop(){if(D.timer){clearTimeout(D.timer);D.timer=null;}}
function schedule(d){stop();D.timer=setTimeout(tick,d==null?DELAY:d);}

/* чей ход: роботу думать, игроку подсказать */
function tick(){
  D.timer=null;
  var G=D.G;if(!G||!onScreen()||D.hold)return;
  if(G.over){finish();return;}
  var p=G.turn;
  if(p===0){
    var L=R.legal(G,0);
    /* подкинуть нечего: пас без лишнего нажатия */
    if(G.phase==='throw'&&!L.some(function(a){return a.t==='throw';})){doAct(0,{t:'pass'},true);return;}
    prompt();paint();return;
  }
  paint();
  var a=R.ai(G,p,S.dkLevel);
  if(!a)return;
  doAct(p,a);
}
function prompt(){
  var G=D.G;
  if(G.phase==='attack')msg(t('dk.p.attack'));
  else if(G.phase==='defend'){
    var tr=G.mode==='perev'&&G.hands[0].some(function(c){return R.canTransfer(G,c);});
    msg(t(tr?'dk.p.defendT':'dk.p.defend'));
  }
  else if(G.phase==='throw')msg(G.taking?t('dk.p.throwTake',{n:nameOf(G.def)}):t('dk.p.throw'));
}
function doAct(p,a,quiet){
  var G=D.G,bout=G.bout;
  if(!R.apply(G,p,a)){Sound.sfx('nope');return false;}
  D.sel=null;
  if(a.t==='pass'||a.t==='take')Sound.sfx('select');else Sound.sfx('card');
  if(p!==0||a.t==='take'){
    if(a.t==='attack')msg(t('dk.m.attack',{n:nameOf(p)}));
    else if(a.t==='beat')msg(t('dk.m.beat',{n:nameOf(p)}));
    else if(a.t==='take')msg(p===0?t('dk.m.youTake'):t('dk.m.take',{n:nameOf(p)}));
    else if(a.t==='transfer')msg(t('dk.m.transfer',{n:nameOf(p),m:nameOf(G.def)}));
    else if(a.t==='throw')msg(t('dk.m.throw',{n:nameOf(p)}));
  }
  if(G.bout!==bout){
    /* отбой закончен: стол виден ещё немного, потом убирается */
    D.hold=G.ended;
    var e=G.ended;
    if(e.res==='beaten')msg(t('dk.m.beaten'));
    else msg(e.def===0?t('dk.m.youTook'):t('dk.m.took',{n:nameOf(e.def)}));
    paint();
    stop();D.timer=setTimeout(function(){
      D.timer=null;D.hold=null;Sound.sfx(e.res==='beaten'?'flip':'deal');paint();
      if(G.over){finish();return;}
      schedule(G.turn===0?120:DELAY);
    },END_PAUSE);
    return true;
  }
  paint();
  schedule(G.turn===0?120:(p===0?DELAY*0.8:DELAY));
  return true;
}

/* ── ход игрока ── */
function myActs(c){
  var G=D.G;if(!G||G.over||G.turn!==0||D.hold)return [];
  return R.legal(G,0).filter(function(a){return a.c&&R.same(a.c,c);});
}
function tapCard(idx){
  var G=D.G;if(!G)return;
  var c=G.hands[0][idx];if(!c)return;
  if(D.sel&&R.same(D.sel,c)){D.sel=null;paint();return;}
  var acts=myActs(c);
  if(!acts.length){if(G.turn===0&&!D.hold)Sound.sfx('nope');return;}
  if(acts.length===1){doAct(0,acts[0]);return;}
  D.sel=c;Sound.sfx('select');paint();
}
function tapPair(i){
  if(!D.sel)return;
  var a=myActs(D.sel).filter(function(x){return x.t==='beat'&&x.i===i;})[0];
  if(a)doAct(0,a);else Sound.sfx('nope');
}
function tapSlot(){
  if(!D.sel)return;
  var a=myActs(D.sel).filter(function(x){return x.t==='transfer';})[0];
  if(a)doAct(0,a);
}
function act(kind){
  var G=D.G;if(!G||G.over||G.turn!==0||D.hold)return;
  if(kind==='take'&&G.phase==='defend')doAct(0,{t:'take'});
  else if(kind==='done'&&G.phase==='throw')doAct(0,{t:'pass'});
  else if(kind==='hint')hint();
}
/* подсказка: что сделал бы обычный робот */
function hint(){
  var G=D.G,a=R.ai(G,0,'normal');if(!a)return;
  Sound.sfx('select');
  if(a.t==='take')msg(t('dk.h.take'));
  else if(a.t==='pass')msg(t(G.taking?'dk.h.enough':'dk.h.done'));
  else{D.sel=null;D.hintC=a.c;paint();D.hintC=null;msg(t('dk.h.'+a.t));}
}

/* ── конец партии ── */
function finish(){
  var G=D.G;if(D.counted)return;D.counted=true;
  var st=stats();st.games++;
  var res=G.fool===0?'fool':G.fool<0?'draw':'win';
  st[res]++;
  if(res==='win'){st.streak++;st.best=Math.max(st.best,st.streak);}else if(res==='fool')st.streak=0;
  if(res==='win'&&G.places[0]===0)st.first++;
  Sh.save();
  paint();
  if(res==='fool')msg(t('dk.res.fool'),'bad');
  else if(res==='draw')msg(t('dk.res.draw'));
  else msg(t('dk.res.win',{n:nameOf(G.fool)})+(st.streak>1?' '+t('bj.streak',{n:st.streak}):''),'good');
  Sound.sfx(res==='win'?'bjWin':res==='fool'?'bjLose':'select');
  show('dk-new');setButtons();
}

/* ════════ РИСОВАНИЕ ════════ */
function cardHtml(c,cls,fresh,attr){
  return '<div class="dk-card up'+(cls?' '+cls:'')+(fresh?' in':'')+'"'+(attr||'')+'>'+Cards.face(c,Sh.big())+'</div>';
}
function backHtml(cls){return '<div class="dk-card'+(cls?' '+cls:'')+'">'+Cards.back(S.back)+'</div>';}
function portrait(p){
  var b=D.bots[p-1];
  var img=Sh.ART_READY?'<img alt="" src="'+Sh.ART+'bot_'+b+'.webp">':'<span class="bj-ava-f bj-c'+b+'"></span>';
  return '<span class="bj-ava dk-ava">'+img+'</span>';
}
function buildTable(){
  var G=D.G,h='';
  for(var p=1;p<G.n;p++){
    h+='<div class="dk-opp" id="dk-o'+p+'"><div class="dk-who">'+portrait(p)+
      '<span class="dk-nm"><span class="bj-name">'+nameOf(p)+'</span><span class="dk-role" id="dk-r'+p+'"></span></span></div>'+
      '<div class="dk-ofan" id="dk-f'+p+'"></div></div>';
  }
  $('dk-opps').innerHTML=h;
  layout();
}
function roleOf(p){
  var G=D.G;
  if(G.over)return G.fool===p?['fool',t('dk.r.fool')]:G.out[p]?['out',t('dk.r.out')]:['',''];
  if(G.out[p])return ['out',t('dk.r.out')];
  var e=D.hold;
  var def=e?e.def:G.def,att=e?e.att:G.att,taking=e?e.res==='taken':G.taking;
  if(p===def)return taking?['take',t('dk.r.take')]:['def',t('dk.r.def')];
  if(p===att)return ['att',t('dk.r.att')];
  return ['',''];
}
function paint(){
  var G=D.G;if(!G)return;
  /* соперники: веер рубашек и число карт */
  for(var p=1;p<G.n;p++){
    var el=$('dk-o'+p);if(!el)continue;
    el.classList.toggle('turn',!G.over&&!D.hold&&G.turn===p);
    el.classList.toggle('out',G.out[p]);
    var n=G.hands[p].length,f='';
    for(var i=0;i<Math.min(n,8);i++)f+=backHtml('mini');
    f+='<b class="dk-cnt">'+n+'</b>';
    $('dk-f'+p).innerHTML=f;
    var r=roleOf(p);$('dk-r'+p).textContent=r[1];$('dk-r'+p).className='dk-role'+(r[0]?' r-'+r[0]:'');
  }
  /* колода и козырь */
  var dk='';
  if(G.deck.length){
    dk+='<div class="dk-trump">'+cardHtml(G.trumpCard,'')+'</div>';
    if(G.deck.length>1)dk+='<div class="dk-stack">'+backHtml('')+'</div>';
  }else dk+='<div class="dk-tsuit">'+Cards.suit(G.trump,'dk-su')+'</div>';
  dk+='<b class="dk-dn">'+G.deck.length+'</b>';
  $('dk-deck').innerHTML=dk;
  $('dk-disc').innerHTML=G.discard.length?'<div class="dk-pile">'+backHtml('')+backHtml('')+'</div><b class="dk-dn">'+G.discard.length+'</b>':'';
  paintField();
  paintHand();
  setButtons();
  paintHud();
}
function paintField(){
  var G=D.G,tb=D.hold?D.hold.table:G.table,h='';
  var tg={},slot=false;
  if(D.sel){myActs(D.sel).forEach(function(a){if(a.t==='beat')tg[a.i]=1;if(a.t==='transfer')slot=true;});}
  var shown=D.shown,next={};
  tb.forEach(function(x,i){
    var ka='a'+R.cid(x.a),kd=x.d?'d'+R.cid(x.d):'';
    h+='<div class="dk-pair'+(tg[i]?' tgt':'')+'" data-i="'+i+'">'+cardHtml(x.a,'dk-a',!shown[ka])+(x.d?cardHtml(x.d,'dk-d',!shown[kd]):'')+'</div>';
    next[ka]=1;if(kd)next[kd]=1;
  });
  if(slot)h+='<div class="dk-pair dk-slot" data-slot="1"><span>'+t('dk.transfer')+'</span></div>';
  if(D.hold)h='<div class="dk-field-in out-'+D.hold.res+'">'+h+'</div>';
  $('dk-field').innerHTML=h;
  D.shown=next;
}
function paintHand(){
  var G=D.G,hand=G.hands[0],h='';
  var my=!G.over&&!D.hold&&G.turn===0,canAny=false;
  var playable=hand.map(function(c){var ok=my&&myActs(c).length>0;if(ok)canAny=true;return ok;});
  hand.forEach(function(c,i){
    var cls=[];
    if(playable[i])cls.push('play');else if(my&&G.phase!=='throw')cls.push('dim');
    if(D.sel&&R.same(D.sel,c))cls.push('sel');
    if(D.hintC&&R.same(D.hintC,c))cls.push('hint');
    if(c.s===G.trump)cls.push('tr');
    var k='h'+R.cid(c);
    h+=cardHtml(c,cls.join(' '),!D.shownH||!D.shownH[k],' data-h="'+i+'"');
  });
  D.shownH={};hand.forEach(function(c){D.shownH['h'+R.cid(c)]=1;});
  var el=$('dk-hand');el.innerHTML=h;
  var r=roleOf(0);
  $('dk-myrole').textContent=r[1];$('dk-myrole').className='dk-role'+(r[0]?' r-'+r[0]:'');
  $('dk-me').classList.toggle('turn',my);
  fanHand();
}
/* веер руки: шаг между картами по ширине, много карт уходит в два ряда */
function fanHand(){
  var el=$('dk-hand'),cards=el.children,n=cards.length;if(!n)return;
  var tb=$('dk-table'),cw=parseFloat(getComputedStyle(tb).getPropertyValue('--cw'))||70;
  var W=el.clientWidth-8,rows=1,per=n;
  var step=n>1?Math.min(cw*1.04,(W-cw)/(n-1)):0;
  if(n>1&&step<cw*0.3){rows=2;per=Math.ceil(n/2);step=per>1?Math.min(cw*1.04,(W-cw)/(per-1)):0;}
  el.style.height=(cw*1.4+(rows-1)*cw*0.62+14)+'px';
  for(var r=0;r<rows;r++){
    var from=r*per,cnt=Math.min(per,n-from),wd=cw+(cnt-1)*step,x0=(el.clientWidth-wd)/2;
    for(var j=0;j<cnt;j++){var c=cards[from+j];c.style.left=(x0+j*step)+'px';c.style.top=(10+r*cw*0.62)+'px';c.style.zIndex=from+j+1;}
  }
}
function msg(s,cls){$('dk-msg').textContent=s||'';$('dk-msg').className='bj-msg dk-msg'+(cls?' '+cls:'');}
function setButtons(){
  var G=D.G,my=G&&!G.over&&!D.hold&&G.turn===0;
  var take=my&&G.phase==='defend',done=my&&G.phase==='throw';
  $('dk-take').classList.toggle('hidden',!G||G.over);$('dk-take').disabled=!take;
  $('dk-done').classList.toggle('hidden',!G||G.over);$('dk-done').disabled=!done;
  $('dk-done-t').textContent=t(G&&G.taking?'dk.enough':'dk.done');
  $('dk-hintb').classList.toggle('hidden',!G||G.over);$('dk-hintb').disabled=!my;
}
function paintHud(){
  var st=stats();$('dk-w').textContent=st.win;$('dk-l').textContent=st.fool;$('dk-p').textContent=st.draw;
  $('dk-sub').textContent=t('dk.lvl.'+S.dkLevel);
}
/* размер карт: стол до 6 пар, соперники сверху, рука снизу; подбирается по ширине и высоте */
function layout(){
  var tb=$('dk-table');if(!tb||!onScreen())return;
  var w=tb.clientWidth,H=(window.innerHeight||600)-tb.getBoundingClientRect().top-78;
  var cw=130,low=(window.innerHeight||600)<=500;
  for(;cw>34;cw-=2){
    var deckW=cw*1.5,cols=Math.max(1,Math.floor((w-24-deckW)/(cw*1.42))),rows=Math.ceil(6/cols);
    if(rows>2)continue;
    var opp=low?44:Math.max(64,Math.min(120,cw*0.95)),need=opp+rows*cw*1.4*1.22+(low?30:44)+cw*1.4+(low?16:34)+(low?10:30);
    if(need<=H)break;
  }
  tb.style.setProperty('--cw',cw+'px');
  tb.style.setProperty('--ocw',Math.round(Math.max(18,Math.min(58,cw*0.42)))+'px');
  tb.style.setProperty('--ava',Math.round(Math.max(32,Math.min(72,cw*0.6)))+'px');
  fanHand();
}
window.addEventListener('resize',function(){setTimeout(layout,60);});

/* ── меню ── */
function paintMenu(){
  [['dkmode',S.dkMode],['dkbots',String(S.dkBots)],['dklevel',S.dkLevel]].forEach(function(x){
    document.querySelectorAll('#seg-'+x[0]+' .seg-btn').forEach(function(b){b.classList.toggle('sel',b.dataset.v===x[1]);});
  });
  $('dk-mode-note').textContent=t('dk.note.'+S.dkMode);
  $('dk-level-note').textContent=t('dk.lnote.'+S.dkLevel);
}
function statsHtml(el){
  var h='<div class="st-row st-head"><span></span><span data-i18n="dk.st.win"></span><span data-i18n="dk.st.fool"></span><span data-i18n="dk.st.draw"></span></div>';
  ['podk','perev'].forEach(function(k){var s=DB.dk[k];
    h+='<div class="st-row'+(k===S.dkMode?' cur':'')+'"><span data-i18n="dk.mode.'+k+'"></span><b>'+s.win+'</b><b>'+s.fool+'</b><b>'+s.draw+'</b></div>';});
  var s=DB.dk[S.dkMode];
  h+='<div class="bj-st2"><span>'+t('dk.st.games')+' <b>'+s.games+'</b></span><span>'+t('dk.st.first')+' <b>'+s.first+'</b></span><span>'+t('bj.st.best')+' <b>'+s.best+'</b></span></div>';
  el.innerHTML=h;I18n.apply(el);
}

/* ── ввод ── */
function bind(){
  function seg(id,fn){document.querySelectorAll('#seg-'+id+' .seg-btn').forEach(function(b){b.addEventListener('click',function(){fn(b.dataset.v);Sh.save();Sh.paintMenu();Sound.sfx('select');});});}
  seg('dkmode',function(v){S.dkMode=v;});
  seg('dkbots',function(v){S.dkBots=+v;});
  seg('dklevel',function(v){S.dkLevel=v;});
  $('dk-hand').addEventListener('click',function(e){var c=e.target.closest('[data-h]');if(c)tapCard(+c.getAttribute('data-h'));});
  $('dk-field').addEventListener('click',function(e){
    if(e.target.closest('[data-slot]')){tapSlot();return;}
    var p=e.target.closest('.dk-pair');if(p&&p.hasAttribute('data-i'))tapPair(+p.getAttribute('data-i'));
  });
  $('dk-take').addEventListener('click',function(){act('take');});
  $('dk-done').addEventListener('click',function(){act('done');});
  $('dk-hintb').addEventListener('click',function(){act('hint');});
  $('dk-new').addEventListener('click',start);
  $('dk-menu').addEventListener('click',function(){stop();D.G=null;Sh.showMenu();});
  document.addEventListener('keydown',function(e){
    if(!onScreen()||e.ctrlKey||e.metaKey||e.altKey)return;
    var k=(e.key||'').toLowerCase(),G=D.G;if(!G)return;
    if(k==='enter'&&G.over){e.preventDefault();start();return;}
    if(k===' '||k==='enter'){e.preventDefault();if(G.phase==='defend')act('take');else act('done');}
    else if(k==='t'){act('take');}
    else if(k==='?'||k==='h'){act('hint');}
    else if(k==='escape'&&D.sel){D.sel=null;paint();}
  });
  I18n.onChange(function(){if(onScreen()&&D.G){buildTable();paint();prompt();}});
}

window.DK={start:start,paintMenu:paintMenu,stats:statsHtml,state:D,act:act,tapCard:tapCard,tapPair:tapPair,tapSlot:tapSlot};
bind();
Sh.paintMenu();
})();
