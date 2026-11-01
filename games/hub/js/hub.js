/* A.C.EON ARCADE: новая страница игр.
   Карусель карточек (CSS 3D), панель выбранной игры, фильтр по категориям, сетка всех игр.
   Фон на WebGL (bg3d.js) подгружается после показа страницы; без WebGL остаётся CSS-фон.
   Список игр в catalog.js, тексты в lang.js. */
(function(){
'use strict';

var t=I18n.t,C=window.HubCatalog;
var $=function(id){return document.getElementById(id);};
var ART=new URL('art/',location.href).href;
/* картинки от Codex ещё не выложены: пока false, вместо обложек рисуются заглушки и лишних запросов нет */
var ART_READY=false;

Sound.define('hubtick',function(tm,tone){tone(tm,900,0.025,'square',0.025);});

Store.define('hub',{version:1,defaults:{cat:'all',last:null,plays:{}}});
var DB=Store.get('hub');
if(C.CATS.indexOf(DB.cat)<0)DB.cat='all';
function save(){Store.save('hub');}

var list=[],cur=0,pos=0,vel=0,cards=[],bg=null;

/* ════════ КАРТОЧКИ ════════ */
function cardHtml(g){
  var h='<div class="c-in"><div class="c-cover" style="--gc:'+g.color+'">';
  if(ART_READY)h+='<img class="c-img" alt="" draggable="false" src="'+ART+'covers/'+g.id+'.webp" onerror="this.remove()">';
  h+='<span class="c-emoji">'+g.emoji+'</span></div>';
  if(ART_READY)h+='<img class="c-hero" alt="" draggable="false" src="'+ART+'heroes/'+g.id+'.webp" onerror="this.remove()">';
  h+='<div class="c-shine"></div><div class="c-plate"><b data-i18n="g.'+g.id+'"></b></div>';
  if(g.classic)h+='<span class="c-badge" data-i18n="hub.classic"></span>';
  return h+'</div>';
}
function build(){
  list=C.GAMES.filter(function(g){return DB.cat==='all'||g.cat===DB.cat;});
  var track=$('track');track.innerHTML='';cards=[];
  list.forEach(function(g,i){
    var el=document.createElement('div');
    el.className='card';el.setAttribute('data-i',i);
    el.innerHTML=cardHtml(g);
    track.appendChild(el);cards.push(el);
  });
  I18n.apply(track);
  /* открыть на последней игре, если она есть в этой категории */
  var li=-1;for(var k=0;k<list.length;k++)if(list[k].id===DB.last)li=k;
  cur=li>=0?li:0;pos=cur;vel=0;
  $('count').textContent=t('hub.count',{n:list.length});
  paintCats();
  place();info();
}
function paintCats(){
  var b=$('cats').querySelectorAll('.cat');
  for(var i=0;i<b.length;i++)b[i].classList.toggle('sel',b[i].getAttribute('data-c')===DB.cat);
}

/* раскладка: карточки на дуге, выбранная впереди */
var geo={w:260,step:180};
function place(){
  for(var i=0;i<cards.length;i++){
    var d=i-pos,a=Math.abs(d),s=d<0?-1:1;
    var x=a<1?d*geo.w*0.78:s*(geo.w*0.78+(a-1)*geo.w*0.42);
    var z=-Math.min(a,5)*150,ry=-Math.max(-2.2,Math.min(2.2,d))*24;
    var sc=a<1?1+0.06*(1-a):1;
    var op=a>4.5?0:a>3.5?(4.5-a):1;
    var el=cards[i];
    el.style.transform='translate3d('+x.toFixed(1)+'px,0,'+z.toFixed(1)+'px) rotateY('+ry.toFixed(2)+'deg) scale('+sc.toFixed(3)+')';
    el.style.webkitTransform=el.style.transform;
    el.style.opacity=op.toFixed(2);
    el.style.zIndex=String(100-Math.round(a*10));
    el.style.visibility=op<=0?'hidden':'visible';
    el.classList.toggle('active',a<0.5);
  }
  if(bg)bg.pan(list.length>1?pos/(list.length-1)*2-1:0);
}

/* ════════ ПАНЕЛЬ ВЫБРАННОЙ ИГРЫ ════════ */
function info(){
  var g=list[cur];if(!g)return;
  var p=$('info');
  p.classList.remove('in');void p.offsetWidth;p.classList.add('in');
  $('i-name').textContent=t('g.'+g.id);
  $('i-cat').textContent=t('cat.'+g.cat);
  $('i-classic').classList.toggle('hidden',!g.classic);
  $('i-desc').textContent=t('gd.'+g.id)+(g.classic?' '+t('hub.classicNote'):'');
  var st=[];try{st=g.stats();}catch(e){st=[];}
  $('i-stats').innerHTML=st.length?st.map(function(r){return '<div class="is"><span>'+t(r[0])+'</span><b>'+r[1]+'</b></div>';}).join(''):
    '<div class="is none">'+t('s.none')+'</div>';
  $('i-last').classList.toggle('hidden',g.id!==DB.last);
  document.documentElement.style.setProperty('--gc',g.color);
  $('pos').textContent=(cur+1)+' / '+list.length;
  if(bg)bg.accent(g.color);
}

/* ════════ ДВИЖЕНИЕ ════════ */
var target=null,raf=0;
function go(i,instant){
  i=Math.max(0,Math.min(list.length-1,i));
  if(i!==cur){cur=i;info();Sound.sfx('hubtick');}
  target=i;
  if(instant){pos=i;place();}else kick();
}
function kick(){if(!raf)raf=requestAnimationFrame(tick);}
var lastT=0;
function tick(now){
  raf=0;
  var dt=lastT?Math.min(0.05,(now-lastT)/1000):0.016;lastT=now;
  if(drag.on){lastT=0;return;}
  if(target!==null){
    var d=target-pos;
    vel=vel*Math.pow(0.0006,dt)+d*dt*60*0.18;
    pos+=vel*dt*4;
    if(Math.abs(d)<0.002&&Math.abs(vel)<0.01){pos=target;vel=0;target=null;place();lastT=0;return;}
  }
  place();
  raf=requestAnimationFrame(tick);
}

/* перетаскивание и свайп */
var drag={on:false,x0:0,p0:0,moved:false,lx:0,lt:0,v:0};
function bindDrag(){
  var st=$('stage');
  function down(x){drag.on=true;drag.moved=false;drag.x0=x;drag.p0=pos;drag.lx=x;drag.lt=performance.now();drag.v=0;target=null;vel=0;st.classList.add('drag');}
  function move(x){
    if(!drag.on)return;
    var dx=x-drag.x0;if(Math.abs(dx)>6)drag.moved=true;
    var now=performance.now(),dtm=Math.max(1,now-drag.lt);
    drag.v=(x-drag.lx)/dtm;drag.lx=x;drag.lt=now;
    pos=Math.max(-0.4,Math.min(list.length-0.6,drag.p0-dx/(geo.w*0.55)));
    var near=Math.round(Math.max(0,Math.min(list.length-1,pos)));
    if(near!==cur){cur=near;info();Sound.sfx('hubtick');}
    place();
  }
  function up(){
    if(!drag.on)return;drag.on=false;st.classList.remove('drag');
    if(!drag.moved)return;
    /* бросок: по скорости пальца ещё несколько карточек */
    var fling=-drag.v*1.6;
    go(Math.round(pos+Math.max(-3,Math.min(3,fling))));
  }
  if(window.PointerEvent){
    st.addEventListener('pointerdown',function(e){if(e.pointerType==='mouse'&&e.button!==0)return;down(e.clientX);});
    window.addEventListener('pointermove',function(e){move(e.clientX);});
    window.addEventListener('pointerup',up);window.addEventListener('pointercancel',up);
  }else{
    st.addEventListener('touchstart',function(e){down(e.touches[0].clientX);},{passive:true});
    st.addEventListener('touchmove',function(e){move(e.touches[0].clientX);},{passive:true});
    st.addEventListener('touchend',up);
    st.addEventListener('mousedown',function(e){down(e.clientX);});
    window.addEventListener('mousemove',function(e){move(e.clientX);});
    window.addEventListener('mouseup',up);
  }
  /* щелчок: по выбранной карточке играть, по соседней перейти к ней */
  st.addEventListener('click',function(e){
    if(drag.moved){drag.moved=false;return;}
    var n=e.target;while(n&&n!==st&&!(n.classList&&n.classList.contains('card')))n=n.parentNode;
    if(!n||n===st)return;
    var i=+n.getAttribute('data-i');
    if(i===cur)play();else go(i);
  });
  /* колесо: один шаг на жест */
  var wheelT=0;
  st.addEventListener('wheel',function(e){
    e.preventDefault();
    var now=Date.now();if(now-wheelT<180)return;
    var d=Math.abs(e.deltaX)>Math.abs(e.deltaY)?e.deltaX:e.deltaY;
    if(Math.abs(d)<4)return;wheelT=now;go(cur+(d>0?1:-1));
  },{passive:false});
  /* наклон выбранной карточки за курсором, параллакс фона */
  window.addEventListener('pointermove',function(e){
    var w=window.innerWidth,h=window.innerHeight,nx=e.clientX/w*2-1,ny=e.clientY/h*2-1;
    if(bg)bg.look(nx,-ny);
    if(e.pointerType!=='mouse')return;
    var a=cards[cur];if(!a)return;
    var r=a.getBoundingClientRect(),inside=e.clientX>r.left-40&&e.clientX<r.right+40&&e.clientY>r.top-40&&e.clientY<r.bottom+40;
    var tx=inside?((e.clientX-r.left)/r.width*2-1):0,ty=inside?((e.clientY-r.top)/r.height*2-1):0;
    tilt(a,tx,ty);
  });
}
function tilt(a,tx,ty){
  var inn=a.querySelector('.c-in');
  inn.style.transform='rotateY('+(tx*12).toFixed(2)+'deg) rotateX('+(-ty*10).toFixed(2)+'deg)';
  inn.style.setProperty('--sx',(50+tx*40)+'%');inn.style.setProperty('--sy',(50+ty*40)+'%');
  for(var i=0;i<cards.length;i++)if(cards[i]!==a){var o=cards[i].querySelector('.c-in');if(o.style.transform)o.style.transform='';}
}

/* ════════ ИГРАТЬ ════════ */
function play(){
  var g=list[cur];if(!g)return;
  DB.last=g.id;DB.plays[g.id]=(DB.plays[g.id]||0)+1;save();
  Sound.sfx('select');
  document.body.classList.add('leaving');
  cards[cur].classList.add('launch');
  setTimeout(function(){location.href=g.url;},420);
}

/* ════════ СЕТКА ВСЕХ ИГР ════════ */
function openGrid(){
  var h='';
  C.GAMES.forEach(function(g){
    h+='<button class="gt" type="button" data-id="'+g.id+'" style="--gc:'+g.color+'"><span class="gt-e">'+g.emoji+'</span>'+
      (ART_READY?'<img alt="" src="'+ART+'covers/'+g.id+'.webp" onerror="this.remove()">':'')+
      '<b data-i18n="g.'+g.id+'"></b>'+(g.classic?'<i data-i18n="hub.classic"></i>':'')+'</button>';
  });
  $('grid').innerHTML=h;I18n.apply($('grid'));
  $('grid-ov').classList.remove('hidden');
}
function closeGrid(){$('grid-ov').classList.add('hidden');}

/* ════════ ЗАПУСК ════════ */
function layout(){
  var w=window.innerWidth,h=window.innerHeight;
  var cw=Math.round(Math.max(150,Math.min(300,w*0.36,(h-300)*0.75)));
  if(w<600)cw=Math.round(Math.max(140,Math.min(w*0.52,(h-330)*0.72)));
  geo.w=cw;
  document.documentElement.style.setProperty('--cw',cw+'px');
  place();
}
function startBG(){
  if(!window.Three3D||!Three3D.supported()||!window.HubBG)return;
  Three3D.load().then(function(THREE){
    bg=HubBG(THREE,$('bg'),ART_READY?ART:null);
    if(!bg)return;
    var g=list[cur];if(g)bg.accent(g.color);
    place();
    requestAnimationFrame(function(){document.body.classList.add('bg-on');});
  }).catch(function(){});
}
function onLang(){
  $('count').textContent=t('hub.count',{n:list.length});
  info();
}
function boot(){
  var bar=Arcade.topbar('hub.title');
  var back=bar.querySelector('.arc-back');
  if(back){back.href='../';var sp=back.querySelector('[data-i18n]');if(sp){sp.setAttribute('data-i18n','hub.site');}}
  I18n.apply();I18n.onChange(onLang);
  var cb=$('cats');
  C.CATS.forEach(function(c){
    var b=document.createElement('button');b.type='button';b.className='cat';b.setAttribute('data-c',c);
    b.innerHTML='<span data-i18n="cat.'+c+'"></span>';
    b.addEventListener('click',function(){if(DB.cat===c)return;DB.cat=c;save();build();Sound.sfx('select');});
    cb.appendChild(b);
  });
  I18n.apply(cb);
  bindDrag();
  $('prev').addEventListener('click',function(){go(cur-1);});
  $('next').addEventListener('click',function(){go(cur+1);});
  $('btn-play').addEventListener('click',play);
  $('btn-grid').addEventListener('click',openGrid);
  $('grid-close').addEventListener('click',closeGrid);
  $('grid').addEventListener('click',function(e){
    var n=e.target;while(n&&n!==this&&!n.getAttribute('data-id'))n=n.parentNode;
    if(!n||n===this)return;
    var id=n.getAttribute('data-id');
    if(DB.cat!=='all'&&C.byId(id).cat!==DB.cat){DB.cat='all';save();build();}
    for(var i=0;i<list.length;i++)if(list[i].id===id){closeGrid();go(i);return;}
  });
  document.addEventListener('keydown',function(e){
    if(!$('grid-ov').classList.contains('hidden')){if(e.key==='Escape')closeGrid();return;}
    if(e.key==='ArrowLeft'){e.preventDefault();go(cur-1);}
    else if(e.key==='ArrowRight'){e.preventDefault();go(cur+1);}
    else if(e.key==='Enter'||e.key===' '){if(document.activeElement&&document.activeElement.tagName==='BUTTON'&&document.activeElement.id!=='btn-play')return;e.preventDefault();play();}
    else if(e.key==='Home')go(0);else if(e.key==='End')go(list.length-1);
  });
  window.addEventListener('resize',layout);
  /* возврат кнопкой «назад» из игры: снять затемнение */
  window.addEventListener('pageshow',function(){document.body.classList.remove('leaving');cards.forEach(function(c){c.classList.remove('launch');});});
  document.addEventListener('visibilitychange',function(){if(bg)bg.pause(document.hidden);});
  build();layout();
  Sound.music('menu');
  setTimeout(startBG,60);
}

window.AceonHub={go:go,play:play,list:function(){return list;},cur:function(){return cur;},db:DB};
boot();
})();
