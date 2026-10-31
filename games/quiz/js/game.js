/* KOTAE!: экран игры (#vGame).
   Заставка уровня, вопрос и 4 таблички, подсказки (50/50, звонок NODE, ведущая), "Ты уверен?",
   ответ с паузой, факт, итог с карточкой. Правила в engine.js, реплики в phrases.js.
   QGame.enter(genre, sub, level), QGame.leave(), QGame.relang() */
(function(){
'use strict';

var $=function(id){return document.getElementById(id);};
var run=null,gid=null,sid=null,busy=false,idleT=0,sayT=0,face=0,faceTurn=0,token=0;
var RM=matchMedia('(prefers-reduced-motion: reduce)').matches;
/* выражения ведущей в host-busts.webp */
var F={smile:0,talk:1,joy:2,wow:3,think:4,sad:5,sly:6,whisper:7};

function esc(s){return String(s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];});}
function sfx(n){if(window.Sound)try{Sound.sfx(n);}catch(e){}}
function later(fn,ms){var t=token;return setTimeout(function(){if(t===token)fn();},RM?Math.min(ms,120):ms);}
function key(){return gid+'-'+sid;}

/* ── ведущая ── */
function expr(name){
  var i=F[name]||0;if(i===face)return;face=i;
  var b=$('gHost').querySelectorAll('.bust'),nx=b[faceTurn^1],old=b[faceTurn];
  nx.style.backgroundPosition=((i%4)/3*100)+'% '+((i/4|0)*100)+'%';
  nx.classList.add('on');old.classList.remove('on');faceTurn^=1;
  var h=$('gHost');h.classList.remove('bob');void h.offsetWidth;h.classList.add('bob');
}
function say(txt,ms){
  var el=$('gSay');el.textContent=txt;el.classList.add('on');
  clearTimeout(sayT);if(ms)sayT=setTimeout(function(){el.classList.remove('on');},ms);
}
function idle(){
  clearTimeout(idleT);
  idleT=later(function(){if(run&&!busy&&!run.cur.answered){expr('think');say(QTalk.host('idle'),5000);}},22000);
}

/* ── шапка ── */
function top(){
  var g=QCat.genre(gid),i=g.subs.indexOf(sid);
  $('gIco').style.cssText='background-image:url('+img('subs-'+gid)+');background-position:'+(i/7*100).toFixed(3)+'% 0';
  $('gTitle').textContent=QCat.name(key());
  $('gLvl').textContent=I18n.t('s.level',{n:run.level})+' · '+run.card;
  var p='';for(var k=0;k<QEngine.GOAL;k++)p+='<i class="'+(k<run.correct?'on':'')+'"></i>';
  $('gProg').innerHTML=p;
  var l='';for(var j=0;j<run.maxLives;j++)l+='<i class="ico ico-life'+(j<run.lives?'':' lost')+'"></i>';
  $('gLives').innerHTML=l;
}
function img(n){var u='img/'+n+'.webp';return window.Boot?Boot.url(u):u;}

/* ── вопрос ── */
function plates(){
  var c=run.cur,box=$('gPlates');box.innerHTML='';
  c.opts.forEach(function(o,i){
    var b=document.createElement('button');b.type='button';b.className='plate fly';b.dataset.i=i;
    b.innerHTML='<b><span>'+'ABCD'[i]+'</span></b><span></span>';b.lastChild.textContent=o.text;
    if(c.gone.indexOf(i)>=0){b.classList.add('gone');b.disabled=true;}
    b.addEventListener('click',function(){pick(i);});
    box.appendChild(b);
    later(function(){b.classList.remove('fly');},90+i*90);
  });
}
function hints(){
  ['fifty','node','host'].forEach(function(h){
    var b=$('gHints').querySelector('[data-h="'+h+'"]');b.disabled=run.used[h];b.classList.toggle('used',run.used[h]);
  });
}
function question(first){
  busy=false;
  var c=run.next();
  $('gQn').textContent=run.asked;
  $('gQt').textContent=c.q.q;
  var q=$('gQ');q.classList.remove('pop');void q.offsetWidth;q.classList.add('pop');
  plates();hints();
  $('gAfter').classList.add('hidden');$('gSure').classList.add('hidden');$('gHints').classList.remove('hidden');
  $('gCall').classList.remove('on');
  if(!first){expr('talk');say(QTalk.host('next'),2600);later(function(){expr('smile');},1400);}
  idle();
}
function marks(){
  var c=run.cur;
  $('gPlates').querySelectorAll('.plate').forEach(function(b,i){
    b.classList.toggle('sel',i===c.pick&&!c.answered);
    b.classList.toggle('gone',c.gone.indexOf(i)>=0);
  });
}
function pick(i){
  if(busy||!run||run.cur.answered)return;
  var r=run.choose(i);if(!r)return;
  sfx('select');clearTimeout(idleT);marks();
  if(r==='sure'){
    busy=true;expr('sly');say(QTalk.host('sure'));
    $('gHints').classList.add('hidden');$('gSure').classList.remove('hidden');
    later(function(){busy=false;},250);
    return;
  }
  reveal(r);
}
function keep(){if(busy||$('gSure').classList.contains('hidden'))return;$('gSure').classList.add('hidden');say(QTalk.host('sureKeep'),1800);reveal(run.commit());}
function change(){
  if(busy||$('gSure').classList.contains('hidden'))return;
  run.change();marks();$('gSure').classList.add('hidden');$('gHints').classList.remove('hidden');
  expr('talk');say(QTalk.host('sureChange'),2600);idle();
}
function reveal(r){
  busy=true;
  var c=run.cur,box=$('gPlates');
  box.querySelectorAll('.plate').forEach(function(b){b.disabled=true;});
  var chosen=box.children[c.pick];chosen.classList.add('sel','wait');
  later(function(){
    chosen.classList.remove('sel','wait');
    box.children[run.right()].classList.add('ok');
    if(r==='ok'){
      sfx('check');expr('joy');say(QTalk.host('right'),2400);
      QScene.set({speed:1});QScene.flash(.22);later(function(){QScene.set({speed:0});},500);
    }else{
      chosen.classList.add('bad');sfx('buzz');expr('sad');
      say(QTalk.host(run.lives===1&&!run.done?'lastlife':'wrong'),3200);
      var h=$('gHurt');h.classList.remove('on');void h.offsetWidth;h.classList.add('on');
      var v=$('vGame');v.classList.remove('shake');void v.offsetWidth;v.classList.add('shake');
    }
    top();
    later(after,650);
  },900);
}
function after(){
  var c=run.cur,ok=c.opts[c.pick].ok;
  $('gFact').innerHTML=(ok?'':'<b>'+esc(I18n.t('p.rightis',{A:c.q.a[0]}))+'</b> ')+esc(c.q.f);
  $('gNext').textContent=I18n.t(run.done?'p.result':'p.next');
  $('gHints').classList.add('hidden');$('gAfter').classList.remove('hidden');
  busy=false;
  $('gNext').focus({preventScroll:true});
}
function next(){
  if(busy||$('gAfter').classList.contains('hidden'))return;
  if(run.done)result();else question(false);
}

/* ── подсказки ── */
function hint(h){
  if(busy||!run||run.cur.answered||!$('gSure').classList.contains('hidden'))return;
  if(h==='fifty'){
    var g=run.fifty();if(!g)return;
    sfx('select');expr('talk');say(QTalk.host('fifty'),2600);
    if(run.cur.gone.indexOf(run.cur.pick)>=0)run.cur.pick=-1;
    $('gPlates').querySelectorAll('.plate').forEach(function(b,i){if(g.indexOf(i)>=0){b.classList.add('gone');b.disabled=true;}});
  }
  if(h==='node'){
    var a=run.node();if(!a)return;
    sfx('select');expr('talk');say(QTalk.host('node'),2400);
    nodeFace(3);$('gCallT').textContent=QTalk.node('hello');$('gCall').classList.add('on');
    later(function(){nodeFace(2);$('gCallT').textContent=QTalk.node('answer',{A:a});sfx('select');},1500);
  }
  if(h==='host'){
    var t=run.host();if(!t)return;
    sfx('select');expr('whisper');say(QTalk.host('hint'));
    later(function(){say(t);},1300);
  }
  hints();idle();
}
function nodeFace(i){$('gNodeFace').style.backgroundPosition=((i%2)*100)+'% '+((i/2|0)*100)+'%';}

/* ── итог ── */
function result(){
  busy=true;clearTimeout(idleT);
  var res=run.finish(),won=run.won;
  QScene.set({a:won?'win':'lose',b:won?'win':'lose',mix:0,dark:won?.12:.25,conf:won?1:0,speed:0});
  QScene.flash(won?.45:.15);
  sfx(won?'win':'lose');
  var box=$('gRes');box.classList.remove('hidden','won','lost');box.classList.add(won?'won':'lost');$('vGame').classList.add('resulting');$('gCall').classList.remove('on');$('gSay').classList.remove('on');
  $('gResH').textContent=I18n.t(won?'p.win':'p.lose');
  $('gResS').textContent=I18n.t('p.score',{n:run.correct});
  $('gResSay').textContent=QTalk.host(won?(res.stars===3?'perfect':'win'):'lose');
  $('gResBust').style.backgroundPosition=won?'66.666% 0':'33.333% 100%';
  var slot=$('gResCard');
  if(won){
    slot.innerHTML='<div class="flip"><div class="fb">'+QCard.html(key(),run.level,{back:true})+'</div><div class="ff">'+QCard.html(key(),run.level,{title:run.card})+'</div></div>'+
      (res.newCard?'<div class="newc">'+esc(I18n.t('p.newcard'))+'</div>':'');
    later(function(){var f=slot.querySelector('.flip');if(f)f.classList.add('on');sfx('check');},700);
  }else slot.innerHTML='';
  var st=$('gResStars');st.innerHTML='';
  if(won)for(var z=0;z<3;z++)(function(z){
    var i=document.createElement('i');i.className='ico ico-star'+(z<res.stars?'':' off');st.appendChild(i);
    if(z<res.stars)later(function(){i.classList.add('pop');sfx('select');},1400+z*350);
  })(z);
  var btns=$('gResBtns'),nx=run.level+1,h='';
  if(won&&nx<=10&&QCat.ready(key())>=nx)h+='<button class="btn pk" type="button" data-r="next">'+esc(I18n.t('p.nextlv',{n:nx}))+'</button>';
  h+='<button class="btn'+(won?' ghost':' pk')+'" type="button" data-r="again">'+esc(I18n.t('p.again'))+'</button>';
  h+='<button class="btn ghost" type="button" data-r="levels">'+esc(I18n.t('p.levels'))+'</button>';
  if(won&&nx<=10&&QCat.ready(key())<nx)h+='<p class="soonnx">'+esc(I18n.t('p.nextsoon'))+'</p>';
  btns.innerHTML=h;
  btns.querySelectorAll('[data-r]').forEach(function(b){b.addEventListener('click',function(){
    sfx('select');var r=b.dataset.r;
    if(r==='next')location.hash='#play/'+gid+'/'+sid+'/'+nx;
    else if(r==='again')enter(gid,sid,run.level);
    else location.hash='#g/'+gid+'/'+sid;
  });});
  if(window.QUI&&QUI.counter)QUI.counter();
}

/* ── вход и выход ── */
function enter(g,s,level){
  token++;run=null;busy=true;gid=g;sid=s;face=-1;
  $('gRes').classList.add('hidden');$('vGame').classList.remove('resulting');$('gCall').classList.remove('on');$('gAfter').classList.add('hidden');$('gSure').classList.add('hidden');
  $('gPlates').innerHTML='';$('gQt').textContent='';$('gQn').textContent='';$('gSay').classList.remove('on');
  $('gLoad').classList.remove('hidden');$('gLoad').textContent=I18n.t('p.loading');
  $('gRuNote').classList.toggle('hidden',I18n.lang==='ru');
  QScene.set({a:'studio',b:'studio',mix:0,side:0,dark:.12,blur:0,rain:0,conf:0,dust:.5,ring:0,speed:0,zoom:1.06});
  QScene.preload(['win','lose']);
  expr('smile');
  var t=token;
  QEngine.start(g+'-'+s,level).then(function(r){
    if(t!==token)return;
    run=r;$('gLoad').classList.add('hidden');
    Store.get('quiz').last={g:g,s:s};Store.save('quiz');
    top();
    var sp=$('gStart');$('gStartS').textContent=QCat.name(key())+' · '+I18n.t('s.level',{n:level});$('gStartT').textContent=run.card;
    sp.classList.remove('on');void sp.offsetWidth;sp.classList.add('on');
    QScene.set({speed:1});QScene.flash(.3);sfx('whoosh');
    later(function(){QScene.set({speed:0});},700);
    later(function(){expr('talk');say(QTalk.host('start'),2600);question(true);later(function(){expr('smile');},1500);},RM?0:1300);
  },function(){
    if(t!==token)return;
    $('gLoad').textContent=I18n.t('p.err');
  });
}
function leave(){token++;run=null;clearTimeout(idleT);clearTimeout(sayT);$('gSay').classList.remove('on');QScene.set({conf:0,speed:0});}
function relang(){
  if(!run)return;
  top();
  if($('gRes').classList.contains('hidden'))return;
  $('gResH').textContent=I18n.t(run.won?'p.win':'p.lose');$('gResS').textContent=I18n.t('p.score',{n:run.correct});
}

function build(){
  $('gHints').querySelectorAll('[data-h]').forEach(function(b){b.addEventListener('click',function(){hint(b.dataset.h);});});
  $('gKeep').addEventListener('click',keep);$('gChange').addEventListener('click',change);
  $('gNext').addEventListener('click',next);
  $('gHost').addEventListener('click',function(){if(!busy&&run&&!run.done){var l=I18n.t('poke');say(l[Math.random()*l.length|0],2600);expr('wow');later(function(){expr('smile');},1200);}});
  addEventListener('keydown',function(e){
    if($('vGame').classList.contains('hidden')||!run||e.ctrlKey||e.metaKey||e.altKey)return;
    var k=e.key.toLowerCase(),map={'1':0,'2':1,'3':2,'4':3,'a':0,'b':1,'c':2,'d':3};
    if(map[k]!==undefined&&$('gSure').classList.contains('hidden')){pick(map[k]);return;}
    if(k==='enter'){if(!$('gSure').classList.contains('hidden'))keep();else if(!$('gAfter').classList.contains('hidden')){e.preventDefault();next();}}
  });
  if(window.Sound&&Sound.define)Sound.define('buzz',function(t,tone){tone(t,180,.22,'square',.05,120);tone(t+.12,140,.26,'square',.05,90);});
}

window.QGame={build:build,enter:enter,leave:leave,relang:relang};
})();
