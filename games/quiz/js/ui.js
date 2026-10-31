/* KOTAE!: экраны и навигация.
   Адреса: '' главная (вступление), '#genres' жанры, '#g/<жанр>' и '#g/<жанр>/<подтема>' подтемы и уровни,
   '#play/<жанр>/<подтема>/<уровень>' игра (game.js).
   Коллекция и меню открываются поверх. */
(function(){
'use strict';

var $=function(id){return document.getElementById(id);};
var view=null,first=true,genreId=null,subId=null,gameAt=null;
var LV=['#3dff8a','#3dff8a','#36f0c8','#2ef2e0','#2fb8ff','#8b7bff','#c77dff','#ff5fd2','#ff3d8b','#ffb020'];

function img(n){var u='img/'+n+'.webp';return window.Boot?Boot.url(u):u;}
function esc(s){return String(s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];});}
function sfx(n){if(window.Sound)try{Sound.sfx(n);}catch(e){}}
function mem(){return Store.get('quiz');}
function save(){Store.save('quiz');}
function subIcon(gid,sid){
  var g=QCat.genre(gid),i=g.subs.indexOf(sid);
  return 'background-image:url('+img('subs-'+gid)+');background-position:'+(i/7*100).toFixed(3)+'% 0';
}
function doneIn(key){var p=mem().prog[key];return p?p.done||0:0;}
function totalCards(){return QCat.totalSubs()*QCat.levels;}
function cardsHave(){return mem().cards.length;}

/* ── маршрут ── */
function parse(){
  var h=location.hash.replace(/^#/,'');
  if(h==='genres')return {v:'genres'};
  var pm=h.match(/^play\/([a-z]+)\/([a-z0-9]+)\/(\d+)$/);
  if(pm&&QCat.genre(pm[1])&&QCat.genre(pm[1]).subs.indexOf(pm[2])>=0){
    var k=pm[1]+'-'+pm[2],lv=+pm[3];
    if(lv>=1&&lv<=QCat.ready(k)&&lv<=doneIn(k)+1)return {v:'game',g:pm[1],s:pm[2],l:lv};
    return {v:'genre',g:pm[1],s:pm[2],fix:true};
  }
  var m=h.match(/^g\/([a-z]+)(?:\/([a-z0-9]+))?$/);
  if(m&&QCat.genre(m[1]))return {v:'genre',g:m[1],s:(m[2]&&QCat.genre(m[1]).subs.indexOf(m[2])>=0)?m[2]:null};
  return {v:'intro'};
}
function route(){
  var r=parse(),changed=r.v!==view||r.v==='game';
  if(r.fix)history.replaceState(null,'','#g/'+r.g+'/'+r.s);
  if(changed&&!first){
    var w=$('wipe');w.classList.remove('go');void w.offsetWidth;w.classList.add('go');sfx('whoosh');
    QScene.flash(.25);
    setTimeout(function(){show(r);},300);
  }else show(r);
  first=false;
}
function show(r){
  var prev=view;view=r.v;
  ['intro','vGenres','vGenre','vGame'].forEach(function(id){$(id).classList.toggle('hidden',
    !((id==='intro'&&view==='intro')||(id==='vGenres'&&view==='genres')||(id==='vGenre'&&view==='genre')||(id==='vGame'&&view==='game')));});
  document.body.classList.toggle('dim',view==='genres'||view==='genre');
  document.body.classList.toggle('in-game',view==='game');
  if(prev==='game'&&view!=='game')QGame.leave();
  if(view==='intro'){QIntro.enter();resumeBtns();}
  else{
    if(prev==='intro'||prev===null)QIntro.leave();
    if(view!=='game')QScene.set({a:'kv',b:'kv',mix:0,side:0,dark:view==='genre'?.6:.52,blur:1,rain:0,conf:0,dust:.8,ring:0,speed:0,zoom:1.08});
  }
  if(view==='game'){gameAt=r;QGame.enter(r.g,r.s,r.l);}
  if(view==='genres')renderGenres();
  if(view==='genre')renderGenre(r.g,r.s,prev!=='genre'||genreId!==r.g);
  backBtn();
  if(prev!==view&&view!=='intro')scrollTo(0,0);
}
/* игра открывается из A.C.EON_Core; в портале главной (iframe) просим главную закрыть портал */
var CORE='../../A.C.EON_Core/',PORTAL=false;
try{PORTAL=window.self!==window.top;}catch(e){PORTAL=true;}
function toCore(e){if(PORTAL){e.preventDefault();try{parent.postMessage({aceon:'close'},location.origin);}catch(x){}}}
function backBtn(){
  var b=$('btnBack');
  if(view==='intro'){b.href=CORE;b.querySelector('span').dataset.i18n='nav.core';}
  else{b.href=view==='game'?'#g/'+gameAt.g+'/'+gameAt.s:view==='genre'?'#genres':'#';b.querySelector('span').dataset.i18n='nav.back';}
  I18n.apply(b);
}
function resumeBtns(){
  var last=mem().last,ok=last&&QCat.genre(last.g);
  ['resume0','resume6'].forEach(function(id){
    var b=$(id);b.classList.toggle('hidden',!ok);
    if(ok)b.textContent=I18n.t('i.resume',{name:QCat.name(last.g+'-'+last.s)});
  });
}

/* ── жанры ── */
function renderGenres(){
  $('gSub').textContent=I18n.t('g.sub',{g:QCat.genres.length,s:QCat.totalSubs()});
  $('ruNote').classList.toggle('hidden',I18n.lang==='ru');
  var grid=$('ggrid');grid.innerHTML='';
  QCat.genres.forEach(function(g){
    var total=g.subs.length*QCat.levels,ready=QCat.readyIn(g.id),done=0;
    g.subs.forEach(function(s){done+=doneIn(g.id+'-'+s);});
    var b=document.createElement('button');b.type='button';b.className='gcard';b.style.setProperty('--gc',g.col);
    b.innerHTML='<img src="'+img('genre-'+g.id)+'" alt="" loading="lazy"><span class="cnt">'+g.subs.length+'</span>'+
      '<div class="gi"><h3>'+esc(QCat.name(g.id))+'</h3><p>'+esc(QCat.desc(g.id))+'</p>'+
      '<div class="meta">'+(ready?'<span>'+esc(I18n.t('g.levels',{n:ready,t:total}))+'</span>':'<span class="soon">'+esc(I18n.t('g.soon'))+'</span>')+
      '<span>'+done+' / '+total+'</span></div><div class="bar"><i style="width:'+(done/total*100).toFixed(1)+'%"></i></div></div>';
    b.addEventListener('click',function(){sfx('select');location.hash='#g/'+g.id;});
    b.addEventListener('pointermove',function(e){
      if(e.pointerType!=='mouse')return;
      var r=b.getBoundingClientRect(),x=(e.clientX-r.left)/r.width-.5,y=(e.clientY-r.top)/r.height-.5;
      b.style.setProperty('--ry',(x*10).toFixed(2)+'deg');b.style.setProperty('--rx',(-y*10).toFixed(2)+'deg');
    });
    b.addEventListener('pointerleave',function(){b.style.setProperty('--ry','0deg');b.style.setProperty('--rx','0deg');});
    grid.appendChild(b);
  });
}

/* ── подтемы и уровни ── */
function renderGenre(gid,sid,fresh){
  var g=QCat.genre(gid);genreId=gid;
  var wide=innerWidth>860;
  if(!sid&&wide)sid=g.subs[0];
  subId=sid;
  $('vGenre').style.setProperty('--gc',g.col);
  $('gImg').src=img('genre-'+gid);
  $('gName').textContent=QCat.name(gid);$('gDesc').textContent=QCat.desc(gid);
  var list=$('slist');list.innerHTML='';
  g.subs.forEach(function(s){
    var key=gid+'-'+s,ready=QCat.ready(key),done=doneIn(key),pips='';
    for(var i=1;i<=10;i++)pips+='<i class="'+(i<=done?'d':i<=ready?'r':'')+'"></i>';
    var b=document.createElement('button');b.type='button';b.className='srow'+(s===sid?' sel':'');b.style.setProperty('--gc',g.col);
    b.innerHTML='<div class="sico" style="'+subIcon(gid,s)+'"></div><div><h3>'+esc(QCat.name(key))+'</h3><p>'+esc(QCat.desc(key))+'</p></div>'+
      '<div>'+(ready?'':'<span class="soon">'+esc(I18n.t('g.soon'))+'</span>')+'<div class="pips" style="margin-top:6px">'+pips+'</div></div>';
    b.addEventListener('click',function(){
      sfx('select');
      history.replaceState(null,'','#g/'+gid+'/'+s);
      renderGenre(gid,s,false);
      if(innerWidth<=860)$('spanel').scrollIntoView({behavior:'smooth',block:'start'});
    });
    list.appendChild(b);
  });
  renderPanel(gid,sid);
  if(sid){mem().last={g:gid,s:sid};save();}
}
function renderPanel(gid,sid){
  var pn=$('spanel'),g=QCat.genre(gid);
  pn.style.setProperty('--gc',g.col);
  if(!sid){pn.innerHTML='<div class="say"><div class="bust"></div><p>'+esc(I18n.t('s.pick'))+'</p></div>';return;}
  var key=gid+'-'+sid,ready=QCat.ready(key),done=doneIn(key),stars=(mem().prog[key]||{}).stars||[];
  var rk=I18n.t('ranks'),h='';
  h+='<div class="sp-top"><div class="sico" style="'+subIcon(gid,sid)+'"></div><div><h2>'+esc(QCat.name(key))+'</h2><div class="goal">'+esc(I18n.t('s.goal'))+'</div></div></div>';
  h+='<div class="say"><div class="bust"></div><p id="sayP">'+esc(QCat.desc(key))+'</p></div>';
  h+='<div class="levels">';
  for(var i=1;i<=10;i++){
    var st=i>ready?'soon':i>done+1?'lock':'open';
    var sub=st==='soon'?I18n.t('s.lsoon'):st==='lock'?I18n.t('s.locked',{n:i-1}):I18n.t('s.play');
    var lives='',s3='';
    for(var l=0;l<QCat.lives(i);l++)lives+='<i class="ico ico-life"></i>';
    for(var z=0;z<3;z++)s3+='<i class="ico ico-star'+(z<(stars[i-1]||0)?'':' off')+'"></i>';
    h+='<button type="button" class="lv'+(st!=='open'?' lock':'')+'" style="--lc:'+LV[i-1]+'" data-l="'+i+'" data-st="'+st+'">'+
      '<span class="n">'+i+'</span><span class="t"><b>'+esc(I18n.t('s.level',{n:i}))+' &middot; '+esc(rk[i-1])+'</b><span>'+esc(sub)+'</span></span>'+
      '<span class="r">'+lives+'<span style="width:6px"></span>'+s3+'</span></button>';
  }
  h+='</div>';
  pn.innerHTML=h;
  pn.querySelectorAll('.lv').forEach(function(b){
    b.addEventListener('click',function(){
      var p=$('sayP');
      if(b.dataset.st==='soon'){p.textContent=I18n.t('s.lsoon')+'. '+I18n.t('g.wip');sfx('select');}
      else if(b.dataset.st==='lock'){p.textContent=I18n.t('s.locked',{n:+b.dataset.l-1});sfx('select');}
      else{sfx('select');location.hash='#play/'+gid+'/'+sid+'/'+b.dataset.l;}
    });
  });
  if(ready)QEngine.load(key).then(function(d){
    if(subId!==sid||genreId!==gid)return;
    pn.querySelectorAll('.lv').forEach(function(b){
      var n=+b.dataset.l,t=n<=ready?QEngine.title(d,n):'';
      if(t)b.querySelector('.t b').textContent=t+' · '+I18n.t('s.level',{n:n});
    });
  },function(){});
}

/* ── коллекция ── */
function openColl(){
  closeMenu();
  /* названия карточек берутся из файлов вопросов: подгрузить подтемы, где есть карточки */
  var need=[];mem().cards.forEach(function(c){var k=c.replace(/-\d+$/,'');if(need.indexOf(k)<0&&!QEngine.cached(k))need.push(k);});
  if(need.length){Promise.all(need.map(function(k){return QEngine.load(k).catch(function(){});})).then(function(){if(!$('coll').classList.contains('hidden')&&$('collSub').classList.contains('hidden'))openColl();});}
  var have=cardsHave();
  $('collCount').textContent=I18n.t('c.count',{n:have,t:totalCards()});
  $('collEmpty').classList.toggle('hidden',have>0);
  var box=$('collList');box.innerHTML='';
  QCat.genres.forEach(function(g){
    var d=document.createElement('div');d.className='cgen';
    var n=mem().cards.filter(function(c){return c.indexOf(g.id+'-')===0;}).length;
    var h='<h3><img src="'+img('genre-'+g.id)+'" alt="" loading="lazy">'+esc(QCat.name(g.id))+' <span>'+n+' / '+g.subs.length*10+'</span></h3><div class="crow">';
    g.subs.forEach(function(s){
      var k=g.id+'-'+s,top=topCard(k);
      h+='<button type="button" class="ctile'+(top?' has':'')+'" data-k="'+k+'" title="'+esc(QCat.name(k))+'">'+
        (top?QCard.html(k,top,{stars:starsOf(k,top)}):'<div class="cslot"><div class="cico" style="'+subIcon(g.id,s)+'"></div></div>')+
        '<span>'+esc(QCat.name(k))+'</span><b>'+cardsOf(k).length+'/10</b></button>';
    });
    d.innerHTML=h+'</div>';box.appendChild(d);
  });
  box.querySelectorAll('.ctile.has').forEach(function(b){b.addEventListener('click',function(){openSub(b.dataset.k);});});
  $('collList').classList.remove('hidden');$('collSub').classList.add('hidden');
  $('coll').classList.remove('hidden');sfx('select');
}
function cardsOf(k){return mem().cards.filter(function(c){return c.lastIndexOf(k+'-',0)===0&&/^\d+$/.test(c.slice(k.length+1));}).map(function(c){return +c.slice(k.length+1);});}
function topCard(k){var l=cardsOf(k);return l.length?Math.max.apply(null,l):0;}
function starsOf(k,n){var p=mem().prog[k];return p&&p.stars?p.stars[n-1]||0:0;}
function openSub(k){
  sfx('select');
  var own=cardsOf(k),box=$('collSub'),h='<button class="btn ghost" type="button" id="collBack">&#9664; '+esc(I18n.t('c.h'))+'</button>'+
    '<h3 class="csubh">'+esc(QCat.name(k))+' <span>'+own.length+'/10</span></h3><div class="cgrid">';
  for(var n=1;n<=10;n++)h+=own.indexOf(n)>=0?QCard.html(k,n,{stars:starsOf(k,n)}):QCard.html(k,n,{back:true});
  box.innerHTML=h+'</div>';
  $('collList').classList.add('hidden');box.classList.remove('hidden');
  $('collBack').addEventListener('click',function(){box.classList.add('hidden');$('collList').classList.remove('hidden');});
  QEngine.load(k).then(function(){if(!box.classList.contains('hidden'))box.querySelectorAll('.card:not(.back) .ttl').forEach(function(t,i){t.textContent=QCard.title(k,own.slice().sort(function(a,b){return a-b;})[i]);});},function(){});
}
function closeColl(){$('coll').classList.add('hidden');}

/* ── меню ── */
function openMenu(){
  var m=$('menu');m.classList.remove('hidden');void m.offsetWidth;m.classList.add('open');$('mConfirm').classList.add('hidden');paintMenu();sfx('select');
}
function closeMenu(){var m=$('menu');if(m.classList.contains('hidden'))return;m.classList.remove('open');setTimeout(function(){m.classList.add('hidden');},280);}
function paintMenu(){
  var lg=$('mLang');lg.innerHTML='';
  I18n.langs.forEach(function(l){
    var b=document.createElement('button');b.type='button';b.textContent=l.code.toUpperCase();b.title=l.name;
    if(l.code===I18n.lang)b.className='sel';
    b.addEventListener('click',function(){I18n.set(l.code);paintMenu();});
    lg.appendChild(b);
  });
  var v=Math.round((window.Sound?Sound.volume('sfx'):.8)*100);$('mSfx').value=v;$('mSfxV').textContent=v;
  var q=mem().settings.gfx||'auto';
  $('mGfx').querySelectorAll('button').forEach(function(b){b.classList.toggle('sel',b.dataset.v===q);});
}

function counter(){$('collN').textContent=cardsHave();}

function relang(){
  QIntro.texts();
  if(view==='genres')renderGenres();
  if(view==='genre')renderGenre(genreId,subId,false);
  if(view==='intro')resumeBtns();
  if(view==='game')QGame.relang();
  if(!$('coll').classList.contains('hidden'))openColl();
  backBtn();
}

function start(){
  QIntro.build();
  QGame.build();
  $('btnBack').addEventListener('click',function(e){if(view==='intro')toCore(e);});
  $('mCore').addEventListener('click',toCore);
  document.addEventListener('click',function(e){
    var t=e.target.closest('[data-go]');if(!t)return;
    var go=t.dataset.go;
    if(go==='coll'){openColl();return;}
    closeMenu();
    if(go==='genres')location.hash='#genres';
    if(go==='intro'){if(location.hash){history.pushState(null,'',location.pathname+location.search);route();}QIntro.jump(0);}
  });
  ['resume0','resume6'].forEach(function(id){$(id).addEventListener('click',function(){var l=mem().last;if(l)location.hash='#g/'+l.g+'/'+l.s;});});
  $('brand').addEventListener('click',function(){if(view!=='intro'){history.pushState(null,'',location.pathname+location.search);route();}QIntro.jump(0);});
  $('btnColl').addEventListener('click',openColl);
  $('collX').addEventListener('click',closeColl);
  $('coll').addEventListener('click',function(e){if(e.target===$('coll'))closeColl();});
  $('btnMenu').addEventListener('click',openMenu);
  $('menuX').addEventListener('click',closeMenu);
  $('menuShade').addEventListener('click',closeMenu);
  $('mSfx').addEventListener('input',function(){var v=+this.value;$('mSfxV').textContent=v;if(window.Sound){Sound.setVolume('sfx',v/100);Sound.sfx('select');}});
  $('mGfx').querySelectorAll('button').forEach(function(b){b.addEventListener('click',function(){
    mem().settings.gfx=b.dataset.v;save();paintMenu();setTimeout(function(){location.reload();},200);
  });});
  $('mReset').addEventListener('click',function(){$('mConfirm').classList.remove('hidden');});
  $('mNo').addEventListener('click',function(){$('mConfirm').classList.add('hidden');});
  $('mYes').addEventListener('click',function(){
    var m=mem();m.prog={};m.seen={};m.cards=[];m.badges=[];m.last=null;
    m.stats={runs:0,correct:0,wrong:0,hints:0,sureAsked:0,sureChanged:0};save();
    $('mConfirm').classList.add('hidden');counter();relang();closeMenu();
  });
  addEventListener('keydown',function(e){if(e.key==='Escape'){closeColl();closeMenu();}});
  QScene.onRing(function(id){sfx('select');location.hash='#g/'+id;});
  addEventListener('hashchange',route);
  I18n.onChange(relang);
  counter();
  route();
}

window.QUI={start:start,counter:function(){counter();}};
})();
