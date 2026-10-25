/* KOTAE!: главная страница, скролл-вступление из 7 сцен.
   #scroller высокий, #stage липкий; прогресс p = 0..6 (номер сцены, дробная часть = переход).
   Каждый кадр по p: тексты сцен, ведущая, демо-таблички, лестница, подсказки, веер карточек и фон WebGL. */
(function(){
'use strict';

var N=7;
var $=function(id){return document.getElementById(id);};
var scroller,stage,scenes,host,figs,bubble,fan,rail,hint;
var active=false,p=0,lastP=-1,shown=-1,figTurn=0,curPose=null,bubbleT=0,raf=0;
var RM=matchMedia('(prefers-reduced-motion: reduce)').matches;

/* поза ведущей по сцене: кадр полосы (0 фронт, 1 машет, 2 указывает, 3 прыжок, 4 поклон) */
var POSE=[{f:1},null,null,{f:3},null,null,{f:4}];
var LADDER=['#3dff8a','#3dff8a','#36f0c8','#2ef2e0','#2fb8ff','#8b7bff','#c77dff','#ff5fd2','#ff3d8b','#ffb020'];
var FAN=[{g:'animals',f:1,lv:1,st:1},{g:'space',f:2,lv:3,st:2},{g:'music',f:3,lv:5,st:3},{g:'anime',f:4,lv:7,st:3},{g:'history',f:5,lv:9,st:3}];
var ORDER=[1,0,3,2];   // порядок вариантов в демо, верный a[0] стоит вторым

function clamp(v,a,b){return v<a?a:v>b?b:v;}
function sstep(a,b,v){var t=clamp((v-a)/(b-a),0,1);return t*t*(3-2*t);}
function img(n){var u='img/'+n+'.webp';return window.Boot?Boot.url(u):u;}

function plates(el){
  el.innerHTML='';
  var a=I18n.t('demo.a');
  ORDER.forEach(function(k,i){
    var d=document.createElement('div');d.className='plate';d.dataset.k=k;
    d.innerHTML='<b><span>'+'ABCD'[i]+'</span></b><span></span>';
    d.lastChild.textContent=a[k];
    el.appendChild(d);
  });
}

function build(){
  scroller=$('scroller');stage=$('stage');host=$('host');bubble=$('bubble');fan=$('fan');rail=$('rail');hint=$('scrollhint');
  scenes=[].slice.call(document.querySelectorAll('.scn'));
  figs=host.querySelectorAll('.fig');

  var lad=$('ladder');
  for(var i=0;i<10;i++){
    var s=document.createElement('div');s.className='st';s.style.setProperty('--lc',LADDER[i]);
    s.innerHTML='<i style="height:'+(26+i*8)+'px"></i><b>'+(i+1)+'</b>';
    lad.appendChild(s);
  }
  FAN.forEach(function(c){
    var d=document.createElement('div');d.className='card';
    d.innerHTML='<div class="art" style="background-image:url('+img('genre-'+c.g)+')"></div><div class="frm" style="background-image:url('+img('card-frame-'+c.f)+')"></div>'+
      '<div class="num">'+c.lv+'</div><div class="ttl"></div><div class="stars">'+'<i class="ico ico-star"></i>'.repeat(c.st)+'</div><div class="gloss"></div>';
    fan.appendChild(d);
  });
  var gf=$('gfall');
  QCat.genres.forEach(function(g){
    var b=document.createElement('img');b.src=img('genre-'+g.id);b.alt='';b.loading='lazy';b.style.cursor='pointer';
    b.addEventListener('click',function(){location.hash='#g/'+g.id;});
    gf.appendChild(b);
  });
  for(var r=0;r<N;r++){
    var b=document.createElement('button');b.type='button';b.setAttribute('aria-label','scene '+r);
    b.addEventListener('click',jump.bind(null,r));rail.appendChild(b);
  }

  figs.forEach(function(f){f.addEventListener('click',poke);});
  addEventListener('scroll',function(){if(active)read();},{passive:true});
  addEventListener('resize',function(){if(active){read();lastP=-1;}});
  texts();
}

function texts(){
  var t=I18n.t('intro.t'),s=I18n.t('intro.s');
  scenes.forEach(function(sc,i){
    var h=sc.querySelector('.it'),q=sc.querySelector('.is');
    if(h)h.textContent=t[i]||'';if(q)q.textContent=s[i]||'';
  });
  plates($('plates1'));plates($('plates4'));
  var a=I18n.t('demo.a');
  $('call4t').textContent=I18n.t('demo.node',{A:a[0]});
  var rk=I18n.t('ranks');
  fan.querySelectorAll('.ttl').forEach(function(el,i){el.textContent=rk[FAN[i].lv-1];});
  lastP=-1;shown=-1;
}

function range(){return Math.max(1,scroller.offsetHeight-innerHeight);}
function read(){p=clamp((scrollY||document.documentElement.scrollTop||0)/range()*(N-1),0,N-1);}
function jump(i){scrollTo({top:i/(N-1)*range()+1,behavior:RM?'auto':'smooth'});}

function say(txt,ms){
  if(!txt){bubble.classList.remove('on');return;}
  bubble.textContent=txt;bubble.classList.add('on');
  clearTimeout(bubbleT);bubbleT=setTimeout(function(){bubble.classList.remove('on');},ms||4200);
}
function poke(){
  var list=I18n.t('poke');
  say(list[Math.random()*list.length|0],3200);
  host.classList.remove('hop');void host.offsetWidth;host.classList.add('hop');
  if(window.Sound)Sound.sfx('select');
}

function pose(i){
  var mob=QScene.mobile();
  var P=POSE[i];if(mob&&i===0)P=null;   // на телефоне ведущая уже нарисована на фоне первой сцены
  var key=P?P.f+(P.flip?'f':''):null;
  if(key===curPose)return;
  curPose=key;
  if(!P){host.classList.add('off');bubble.classList.remove('on');return;}
  host.classList.remove('off');
  var nxt=figs[figTurn^1],old=figs[figTurn];
  nxt.style.backgroundPosition=(P.f*25)+'% 0';
  nxt.classList.toggle('flip',!!P.flip);
  nxt.classList.add('on','idle');old.classList.remove('on','idle');
  figTurn^=1;
}

function frame(){
  raf=requestAnimationFrame(frame);
  if(Math.abs(p-lastP)<0.0005)return;
  lastP=p;
  var i0=Math.floor(p),f=p-i0,near=Math.round(p);

  scenes.forEach(function(sc,i){
    var d=p-i,ad=Math.abs(d);
    var o=1-sstep(.12,.46,ad);
    sc.style.opacity=o.toFixed(3);
    sc.classList.toggle('vis',o>.01);
    var mob=QScene.mobile();
    sc.style.transform=mob?'translateY('+(-d*40).toFixed(1)+'px)':'translateY(calc(-50% + '+(-d*60).toFixed(1)+'px))';
  });

  if(near!==shown){
    shown=near;
    pose(near);
    var line=I18n.t('host.scene')[near];
    if(line&&curPose)setTimeout(function(){if(shown===near)say(line,4500);},500);else bubble.classList.remove('on');
    rail.querySelectorAll('button').forEach(function(b,i){b.classList.toggle('on',i===near);});
  }
  hint.style.opacity=p<.12?1:0;

  /* сцена 1: таблички вылетают, потом загорается верная */
  var l1=p-1;
  $('plates1').querySelectorAll('.plate').forEach(function(el,k){
    el.classList.toggle('fly',l1<-.42+k*.07);
    el.classList.toggle('ok',l1>.06&&el.dataset.k==='0');
  });
  /* сцена 3: ступени загораются */
  var l3=p-3;
  $('ladder').querySelectorAll('.st').forEach(function(el,k){el.classList.toggle('on',l3>-.42+k*.06);});
  /* сцена 4: 50/50, звонок NODE, "ты уверен?" */
  var l4=p-4;
  $('hc0').classList.toggle('lit',l4>-.3);$('hc1').classList.toggle('lit',l4>-.12);$('hc2').classList.toggle('lit',l4>.06);
  $('plates4').querySelectorAll('.plate').forEach(function(el){
    var k=el.dataset.k;el.classList.toggle('gone',l4>-.3&&(k==='2'||k==='3'));el.classList.toggle('ok',l4>-.12&&k==='0');
  });
  $('call4').classList.toggle('on',l4>-.12);$('sure4').classList.toggle('on',l4>.06);
  /* сцена 5: веер */
  var l5=p-5,sp=sstep(-.42,.08,l5);
  fan.classList.toggle('on',Math.abs(l5)<.6);
  fan.querySelectorAll('.card').forEach(function(c,k){
    var o=k-2;
    c.style.transform='translateX('+(o*72*sp).toFixed(1)+'%) translateY('+(Math.abs(o)*7*sp+(1-sp)*30).toFixed(1)+'%) rotateZ('+(o*11*sp).toFixed(1)+'deg) rotateY('+((1-sp)*-40).toFixed(1)+'deg)';
    c.style.zIndex=10-Math.abs(o);
  });

  /* фон */
  var mixv=sstep(.3,.7,f);
  QScene.set({
    a:'intro-'+i0,b:'intro-'+Math.min(N-1,i0+1),mix:mixv,
    speed:Math.max(0,1-Math.abs(f-.5)*4)*(i0<N-1?.7:0),
    side:1,dark:.3*(1-sstep(.3,.7,Math.abs(p-2))),blur:0,
    rain:1-sstep(.2,.8,p),conf:sstep(4.5,5.2,p),dust:.6,
    ring:1-sstep(.35,.62,Math.abs(p-2)),ringRot:p-2,
    zoom:1.05+.035*Math.sin(Math.PI*f)
  });
  if(i0<N-1)QScene.preload(['intro-'+Math.min(N-1,i0+2)]);
}

function enter(){
  active=true;
  document.body.classList.add('in-intro');
  rail.classList.remove('hidden');
  read();lastP=-1;shown=-1;curPose=null;
  cancelAnimationFrame(raf);raf=requestAnimationFrame(frame);
  QScene.preload(['intro-0','intro-1','intro-2']);
  setTimeout(function(){QScene.preload(QCat.genres.map(function(g){return 'genre-'+g.id;}));},1500);
}
function leave(){
  active=false;cancelAnimationFrame(raf);
  document.body.classList.remove('in-intro');
  rail.classList.add('hidden');
  bubble.classList.remove('on');
}

window.QIntro={build:build,texts:texts,enter:enter,leave:leave,jump:jump};
})();
