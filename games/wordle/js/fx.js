/* A.C.EON WORDLE: свет в фоне. Без WebGL, чтобы работало на старых телефонах.
   Слой за всем содержимым: три размытых пятна света (CSS, медленно плывут),
   пыль в свете и, если есть картинки, плавающие плитки (canvas).
   Искры при угаданном слове и красное мерцание при проигрыше.
   Выключается при «Без фона» и при системной настройке «уменьшить движение».

   WlFx.set(on)            включить или выключить слой
   WlFx.tiles(list)        картинки плиток: [{src, blur}] (blur: дальний план, крупнее и тусклее)
   WlFx.burst(el)          искры над элементом
   WlFx.flash()            короткое красное мерцание */
(function(){
'use strict';

var still=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
var layer=document.createElement('div');layer.className='wl-fx';layer.setAttribute('aria-hidden','true');
layer.innerHTML='<i class="fx-glow g1"></i><i class="fx-glow g2"></i><i class="fx-glow g3"></i><canvas></canvas>';
document.body.insertBefore(layer,document.body.firstChild);
var cv=layer.querySelector('canvas'),cx=cv.getContext&&cv.getContext('2d');
var on=false,raf=0,W=0,H=0,dpr=1,last=0;
var dust=[],sparks=[],floats=[],imgs=[];
var COLS=['111,227,242','255,45,120','31,212,122','255,200,58'];

function rnd(a,b){return a+Math.random()*(b-a);}
function size(){
  dpr=Math.min(1.5,window.devicePixelRatio||1);
  W=window.innerWidth;H=window.innerHeight;
  cv.width=Math.round(W*dpr);cv.height=Math.round(H*dpr);
  cv.style.width=W+'px';cv.style.height=H+'px';
}
function seedDust(){
  dust=[];var n=W<600?18:30;
  for(var i=0;i<n;i++)dust.push({x:rnd(0,W),y:rnd(0,H),r:rnd(0.6,1.8),a:rnd(0.08,0.4),vy:rnd(-6,-16),ph:rnd(0,6.28),c:COLS[i%2?0:(i%3?1:2)]});
}
/* плитки держатся у краёв, середину не загораживают */
function seedFloats(){
  floats=[];if(!imgs.length)return;
  var n=W<600?5:8;
  for(var i=0;i<n;i++){
    var im=imgs[i%imgs.length],far=im.blur;
    var side=i%2?1:0,x=side?rnd(W*0.72,W*0.98):rnd(W*0.02,W*0.28);
    /* на телефоне поле во всю ширину: плитки за ним тусклее и мельче */
    var k=W<600?0.5:1;
    floats.push({im:im.el,x:x,y:rnd(0,H),s:(far?rnd(90,150):rnd(46,84))*(W<600?0.7:1),a:(far?rnd(0.25,0.45):rnd(0.45,0.7))*k,
      vy:far?rnd(-4,-7):rnd(-8,-13),rot:rnd(-0.4,0.4),vr:rnd(-0.08,0.08),ph:rnd(0,6.28),far:far});
  }
  floats.sort(function(a,b){return (b.far?1:0)-(a.far?1:0);});
}
function frame(t){
  raf=0;if(!on||document.hidden)return;
  var dt=Math.min(0.05,(t-(last||t))/1000);last=t;
  cx.setTransform(dpr,0,0,dpr,0,0);cx.clearRect(0,0,W,H);
  floats.forEach(function(f){
    f.y+=f.vy*dt;f.rot+=f.vr*dt;f.ph+=dt*0.5;
    if(f.y<-f.s)f.y=H+f.s;
    if(!f.im.complete||!f.im.naturalWidth)return;
    cx.save();cx.globalAlpha=f.a;cx.translate(f.x+Math.sin(f.ph)*10,f.y);cx.rotate(f.rot);
    cx.drawImage(f.im,-f.s/2,-f.s/2,f.s,f.s);cx.restore();
  });
  dust.forEach(function(d){
    d.y+=d.vy*dt;d.ph+=dt*0.8;if(d.y<-4){d.y=H+4;d.x=rnd(0,W);}
    var x=d.x+Math.sin(d.ph)*8,a=d.a*(0.6+0.4*Math.sin(d.ph*1.7));
    cx.fillStyle='rgba('+d.c+','+a.toFixed(3)+')';cx.beginPath();cx.arc(x,d.y,d.r,0,6.283);cx.fill();
  });
  for(var i=sparks.length-1;i>=0;i--){
    var s=sparks[i];s.t+=dt;if(s.t>s.life){sparks.splice(i,1);continue;}
    s.vy+=260*dt;s.x+=s.vx*dt;s.y+=s.vy*dt;
    var k=1-s.t/s.life;
    cx.fillStyle='rgba('+s.c+','+(k*0.95).toFixed(3)+')';cx.beginPath();cx.arc(s.x,s.y,s.r*(0.5+k*0.5),0,6.283);cx.fill();
  }
  raf=requestAnimationFrame(frame);
}
function run(){if(on&&!raf&&!still&&cx&&!document.hidden){last=0;raf=requestAnimationFrame(frame);}}

function set(v){
  on=!!v;layer.classList.toggle('on',on);layer.classList.toggle('still',still);
  if(on){size();if(!dust.length)seedDust();if(!floats.length)seedFloats();run();}
  else if(cx){cx.clearRect(0,0,cv.width,cv.height);}
}
function tiles(list){
  imgs=list.map(function(x){var im=new Image();im.src=x.src;return {el:im,blur:!!x.blur};});
  if(W)seedFloats();
}
function burst(el){
  if(!on||still||!cx||!el)return;
  var r=el.getBoundingClientRect();
  for(var i=0;i<46;i++){
    sparks.push({x:rnd(r.left,r.right),y:r.top+rnd(0,r.height*0.4),vx:rnd(-120,120),vy:rnd(-320,-120),
      r:rnd(1.5,3.5),life:rnd(0.8,1.5),t:0,c:i%3?'31,212,122':'255,200,58'});
  }
  run();
}
function flash(){
  if(!on)return;
  layer.classList.remove('lose');void layer.offsetWidth;layer.classList.add('lose');
  setTimeout(function(){layer.classList.remove('lose');},900);
}
var rzT;
window.addEventListener('resize',function(){clearTimeout(rzT);rzT=setTimeout(function(){if(!on)return;size();seedDust();seedFloats();},120);});
document.addEventListener('visibilitychange',function(){if(!document.hidden)run();});

window.WlFx={set:set,tiles:tiles,burst:burst,flash:flash};
})();
