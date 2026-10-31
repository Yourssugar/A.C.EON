/* KOTAE!: WebGL-сцена (three.js из games/shared/three).
   Фон: две картинки GPT с плавной сменой, параллакс за курсором, затемнение под текст,
   аниме-линии скорости, вспышка, размытие для экранов меню.
   Частицы: дождь (сцена 0), конфетти (5-6), искры (всегда).
   Карусель: обложки жанров по кругу (сцена 2), по клику открывается жанр.
   Без WebGL (или качество "лёгкая") работает запасной CSS-фон из тех же картинок.

   QScene.init(quality)  Promise<boolean>  true, если WebGL запущен
   QScene.set({a,b,mix,speed,side,dark,blur,rain,conf,dust,ring,ringRot,zoom})
   QScene.flash(), QScene.onRing(fn(genreId)), QScene.mobile() */
(function(){
'use strict';

var S={a:'intro-0',b:'intro-0',mix:0,speed:0,side:1,dark:0,blur:0,rain:0,conf:0,dust:.6,ring:0,ringRot:0,zoom:1.06};
var cur={speed:0,side:1,dark:0,blur:0,rain:0,conf:0,dust:.6,ring:0,flash:0,zoom:1.06,mx:0,my:0};
var mouse={x:0,y:0};
var gl=false,nogl=false,THREE=null,R=null,canvas=null,ringCb=null,quality='auto';
var MOB=false;

function isMob(){return innerWidth/innerHeight<0.8;}
MOB=isMob();
function imgUrl(name){var u='img/'+name+'.webp';return window.Boot?Boot.url(u):u;}
function variant(key){return /^(intro-\d|kv|studio|win|lose)$/.test(key)?key+'-'+(MOB?'m':'w'):key;}

/* ── запасной CSS-фон ── */
var css={el:null,layers:null,shown:null,turn:0};
function cssBg(key){
  if(!css.el){css.el=document.getElementById('bgcss');css.layers=css.el.querySelectorAll('i');}
  var name=variant(key);
  if(css.shown===name)return;
  css.shown=name;
  var img=new Image();
  img.onload=function(){
    if(css.shown!==name)return;
    css.turn^=1;
    var on=css.layers[css.turn],off=css.layers[css.turn^1];
    on.style.backgroundImage='url("'+img.src+'")';
    on.classList.add('on');off.classList.remove('on');
  };
  img.src=imgUrl(name);
}

/* ── текстуры ── */
var tex={};
function loadTex(key){
  var name=variant(key);
  if(tex[name])return tex[name];
  var rec={t:null,w:1,h:1,ready:false};
  tex[name]=rec;
  new THREE.TextureLoader().load(imgUrl(name),function(t){
    t.minFilter=THREE.LinearFilter;t.magFilter=THREE.LinearFilter;t.generateMipmaps=false;
    t.wrapS=t.wrapT=THREE.ClampToEdgeWrapping;
    rec.t=t;rec.w=t.image.width;rec.h=t.image.height;rec.ready=true;
  });
  return rec;
}
var lastA=null,lastB=null;
function pick(key,fallback){var r=loadTex(key);return r.ready?r:fallback;}

/* ── шейдеры ── */
var BG_V='varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}';
var BG_F=[
'precision highp float;',
'uniform sampler2D tA,tB;uniform vec2 sA,sB,res,mouse;',
'uniform float mixv,zoom,time,speed,dark,blur,side,flash,mob,ready;',
'varying vec2 vUv;',
'vec2 cover(vec2 uv,vec2 s){float sa=res.x/res.y,ia=s.x/s.y;vec2 k=sa>ia?vec2(1.,ia/sa):vec2(sa/ia,1.);return (uv-.5)*k/zoom+.5+mouse*vec2(.012,.009);}',
'vec3 sm(sampler2D t,vec2 uv){return texture2D(t,clamp(uv,.002,.998)).rgb;}',
'vec3 sb(sampler2D t,vec2 uv){',
'  if(blur<.01)return sm(t,uv);',
'  vec2 o=blur*vec2(.006,.006*res.x/res.y);vec3 c=sm(t,uv)*.2;',
'  c+=(sm(t,uv+vec2(o.x,0.))+sm(t,uv-vec2(o.x,0.))+sm(t,uv+vec2(0.,o.y))+sm(t,uv-vec2(0.,o.y)))*.12;',
'  c+=(sm(t,uv+o)+sm(t,uv-o)+sm(t,uv+vec2(o.x,-o.y))+sm(t,uv+vec2(-o.x,o.y)))*.08;return c;}',
'float h1(float n){return fract(sin(n)*43758.5453);}',
'void main(){',
'  vec2 uv=vUv;',
'  vec3 c=mix(sb(tA,cover(uv,sA)),sb(tB,cover(uv,sB)),mixv);',
'  float sd=mob>.5?smoothstep(.3,.92,uv.y):smoothstep(.66,.0,uv.x);',
'  c*=1.-side*.66*sd;',
'  vec2 p=uv-.5;p.x*=res.x/res.y;float r=length(p);',
'  c*=1.-.38*smoothstep(.45,1.25,r);',
'  c*=1.-dark;',
'  if(speed>.002){',
'    float a=atan(p.y,p.x);float seg=floor((a+3.14159)/6.28318*150.);',
'    float h=h1(seg*1.7+floor(time*16.)*7.13);',
'    float ln=step(.8,h)*smoothstep(.22+h*.2,.95,r);',
'    c=mix(c,vec3(1.),ln*speed*.8);',
'  }',
'  c+=vec3(flash);',
'  c*=.975+.025*sin(gl_FragCoord.y*1.6);',
'  gl_FragColor=vec4(c*ready,1.);',
'}'].join('\n');

var P_V=[
'attribute vec4 seed;attribute float kind;',
'uniform float time,uRain,uConf,uDust,pr;',
'varying float vK,vA,vRot;varying vec3 vC;',
'void main(){',
'  vK=kind;vec2 pos;float size;float a;vRot=0.;vC=vec3(1.);',
'  if(kind<.5){',
'    float y=1.15-mod(seed.y*2.3+time*(1.5+seed.z*1.3),2.3);',
'    pos=vec2(seed.x*2.5-1.25-y*.14,y);size=(16.+seed.w*18.)*pr;a=uRain*(.3+.45*seed.w);vC=vec3(.65,.85,1.);',
'  }else if(kind<1.5){',
'    float y=1.15-mod(seed.y*2.3+time*(.1+seed.z*.16),2.3);',
'    pos=vec2(seed.x*2.3-1.15+sin(time*1.3+seed.w*20.)*.05,y);size=(7.+seed.w*9.)*pr;a=uConf;',
'    vRot=time*(1.+seed.z*3.)+seed.w*6.;',
'    float k=fract(seed.w*7.);vC=k<.25?vec3(.18,.95,.88):k<.5?vec3(1.,.24,.55):k<.75?vec3(1.,.69,.13):vec3(1.);',
'  }else{',
'    float y=-1.15+mod(seed.y*2.3+time*(.02+seed.z*.035),2.3);',
'    pos=vec2(seed.x*2.3-1.15+sin(time*.3+seed.w*9.)*.02,y);size=(2.+seed.w*6.)*pr;',
'    a=uDust*(.25+.75*abs(sin(time*(.7+seed.z*2.)+seed.w*30.)));',
'    vC=seed.w>.6?vec3(1.,.35,.65):vec3(.3,1.,.92);',
'  }',
'  vA=a;gl_Position=vec4(pos,0.,1.);gl_PointSize=size;',
'}'].join('\n');
var P_F=[
'precision mediump float;varying float vK,vA,vRot;varying vec3 vC;',
'void main(){',
'  vec2 c=gl_PointCoord-.5;float al;',
'  if(vK<.5){float x=c.x+c.y*.14;al=smoothstep(.05,0.,abs(x))*smoothstep(.5,.05,abs(c.y));}',
'  else if(vK<1.5){float s=sin(vRot),k=cos(vRot);vec2 q=vec2(k*c.x-s*c.y,s*c.x+k*c.y);al=step(abs(q.x),.36)*step(abs(q.y),.16+.1*abs(sin(vRot*1.7)));}',
'  else{float d=length(c);al=smoothstep(.5,0.,d);al*=al;}',
'  if(al<.01)discard;gl_FragColor=vec4(vC,al*vA);',
'}'].join('\n');

var C_V='varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}';
var C_F=[
'precision highp float;uniform sampler2D map;uniform vec3 col;uniform float alpha,hl,has;varying vec2 vUv;',
'float sdr(vec2 p,vec2 b,float r){vec2 q=abs(p)-b+r;return length(max(q,0.))+min(max(q.x,q.y),0.)-r;}',
'void main(){',
'  vec2 uv=vUv;if(!gl_FrontFacing)uv.x=1.-uv.x;',
'  float d=sdr(uv-.5,vec2(.5),.1);if(d>0.)discard;',
'  vec3 c=has>.5?texture2D(map,uv).rgb:vec3(.05,.07,.18);',
'  float e=smoothstep(-.035,0.,d);c=mix(c,col*1.35,e*.9);',
'  c*=.82+.45*hl;if(!gl_FrontFacing)c*=.3;',
'  gl_FragColor=vec4(c,alpha);',
'}'].join('\n');

function hex3(h){var n=parseInt(h.slice(1),16);return new THREE.Vector3((n>>16&255)/255,(n>>8&255)/255,(n&255)/255);}

function build(){
  canvas=document.getElementById('gl');
  var renderer=new THREE.WebGLRenderer({canvas:canvas,antialias:quality==='high',alpha:false,powerPreference:'high-performance'});
  renderer.outputColorSpace=THREE.LinearSRGBColorSpace;   // картинки идут как есть, без пересчёта цвета
  renderer.setClearColor(0x050716,1);
  renderer.autoClear=false;

  var ortho=new THREE.OrthographicCamera(-1,1,1,-1,0,1);
  var bgScene=new THREE.Scene();
  var black=new THREE.DataTexture(new Uint8Array([5,7,22,255]),1,1);black.needsUpdate=true;
  var bgU={tA:{value:black},tB:{value:black},sA:{value:new THREE.Vector2(1,1)},sB:{value:new THREE.Vector2(1,1)},
    res:{value:new THREE.Vector2(1,1)},mouse:{value:new THREE.Vector2()},mixv:{value:0},zoom:{value:1.06},time:{value:0},
    speed:{value:0},dark:{value:0},blur:{value:0},side:{value:1},flash:{value:0},mob:{value:0},ready:{value:0}};
  var bg=new THREE.Mesh(new THREE.PlaneGeometry(2,2),new THREE.ShaderMaterial({vertexShader:BG_V,fragmentShader:BG_F,uniforms:bgU,depthTest:false,depthWrite:false}));
  bgScene.add(bg);

  /* частицы */
  var N=quality==='high'?1100:700;
  var g=new THREE.BufferGeometry(),pos=new Float32Array(N*3),seed=new Float32Array(N*4),kind=new Float32Array(N);
  for(var i=0;i<N;i++){
    for(var j=0;j<4;j++)seed[i*4+j]=Math.random();
    var r=i/N;kind[i]=r<.38?0:r<.62?1:2;
  }
  g.setAttribute('position',new THREE.BufferAttribute(pos,3));
  g.setAttribute('seed',new THREE.BufferAttribute(seed,4));
  g.setAttribute('kind',new THREE.BufferAttribute(kind,1));
  var pU={time:{value:0},uRain:{value:0},uConf:{value:0},uDust:{value:.6},pr:{value:1}};
  var pts=new THREE.Points(g,new THREE.ShaderMaterial({vertexShader:P_V,fragmentShader:P_F,uniforms:pU,transparent:true,
    depthTest:false,depthWrite:false,blending:THREE.AdditiveBlending}));
  pts.frustumCulled=false;
  bgScene.add(pts);

  /* карусель жанров */
  var persp=new THREE.PerspectiveCamera(35,1,0.1,100);persp.position.set(0,0,17);
  var ringScene=new THREE.Scene();
  var ring=new THREE.Group(),tilt=new THREE.Group();tilt.add(ring);ringScene.add(tilt);
  var GEN=QCat.genres,RAD=5.2,cards=[];
  GEN.forEach(function(gen,k){
    var u={map:{value:black},col:{value:hex3(gen.col)},alpha:{value:0},hl:{value:0},has:{value:0}};
    var m=new THREE.Mesh(new THREE.PlaneGeometry(1.62,1.62),new THREE.ShaderMaterial({vertexShader:C_V,fragmentShader:C_F,uniforms:u,
      transparent:true,depthWrite:false,side:THREE.DoubleSide}));
    var a=k/GEN.length*Math.PI*2;
    m.position.set(Math.sin(a)*RAD,0,Math.cos(a)*RAD);m.rotation.y=a;
    m.userData={id:gen.id,u:u,a:a,key:'genre-'+gen.id,hl:0};
    ring.add(m);cards.push(m);
  });
  var ray=new THREE.Raycaster(),ndc=new THREE.Vector2(),hover=null;
  var label=document.createElement('div');
  label.style.cssText='position:fixed;z-index:20;pointer-events:none;padding:6px 10px;border-radius:10px;background:rgba(8,12,34,.85);border:1px solid #2ef2e0;color:#fff;font:400 15px/1 "Russo One",sans-serif;opacity:0;transition:opacity .15s;white-space:nowrap';
  document.body.appendChild(label);

  function layout(){
    var w=innerWidth,h=innerHeight;
    var pr=Math.min(devicePixelRatio||1,quality==='high'?2:1.5);
    renderer.setPixelRatio(pr);renderer.setSize(w,h,false);
    bgU.res.value.set(w*pr,h*pr);pU.pr.value=pr;
    var m=isMob();
    if(m!==MOB){MOB=m;lastA=lastB=null;}
    bgU.mob.value=MOB?1:0;
    persp.aspect=w/h;persp.updateProjectionMatrix();
    var hh=Math.tan(persp.fov*Math.PI/360)*persp.position.z,hw=hh*persp.aspect,span=RAD*2+1.6;
    if(w/h>1.05){tilt.position.set(hw*.42,hh*.02,0);tilt.scale.setScalar(Math.min(1,hw*1.45/span));}
    else{tilt.position.set(0,-hh*.3,0);tilt.scale.setScalar(Math.min(1,hw*3.3/span));}
    tilt.rotation.x=0.34;
  }
  addEventListener('resize',layout);layout();

  function pickRing(e){
    if(cur.ring<.5)return null;
    ndc.set(e.clientX/innerWidth*2-1,-(e.clientY/innerHeight)*2+1);
    ray.setFromCamera(ndc,persp);
    var hit=ray.intersectObjects(cards,false);
    for(var i=0;i<hit.length;i++){
      var o=hit[i].object;
      var wp=new THREE.Vector3();o.getWorldPosition(wp);
      if(wp.z>tilt.position.z-0.2)return o;            // только передняя половина круга
    }
    return null;
  }
  addEventListener('pointermove',function(e){
    mouse.x=e.clientX/innerWidth*2-1;mouse.y=-(e.clientY/innerHeight*2-1);
    var o=pickRing(e);
    if(o!==hover){hover=o;canvas.style.cursor=o?'pointer':'';}
    if(o){label.textContent=QCat.name(o.userData.id);label.style.left=(e.clientX+14)+'px';label.style.top=(e.clientY+14)+'px';label.style.opacity=1;}
    else label.style.opacity=0;
  },{passive:true});
  canvas.addEventListener('click',function(e){var o=pickRing(e);if(o&&ringCb)ringCb(o.userData.id);});
  addEventListener('deviceorientation',function(e){
    if(e.gamma==null)return;mouse.x=Math.max(-1,Math.min(1,e.gamma/30));mouse.y=Math.max(-1,Math.min(1,(e.beta-45)/30));
  },{passive:true});

  var RM=matchMedia('(prefers-reduced-motion: reduce)').matches;
  var t0=performance.now(),last=t0,ringAngle=0,wp=new THREE.Vector3();
  function clamp01(v){return v<0?0:v>1?1:v;}
  function k(v,to,dt,rate){return v+(to-v)*Math.min(1,dt*rate);}
  function frame(now){
    requestAnimationFrame(frame);
    if(document.hidden)return;
    var dt=Math.min(.05,(now-last)/1000);last=now;
    var t=(now-t0)/1000;
    cur.mx=k(cur.mx,RM?0:mouse.x,dt,3);cur.my=k(cur.my,RM?0:mouse.y,dt,3);
    ['speed','side','dark','blur','rain','conf','dust','ring','zoom'].forEach(function(n){cur[n]=k(cur[n],S[n],dt,n==='speed'?10:5);});
    cur.flash=k(cur.flash,0,dt,4);

    var A=pick(S.a,lastA),B=pick(S.b,lastB||A);
    if(A){lastA=A;}if(B){lastB=B;}
    if(A){
      bgU.tA.value=A.t;bgU.sA.value.set(A.w,A.h);
      bgU.tB.value=(B||A).t;bgU.sB.value.set((B||A).w,(B||A).h);
      bgU.ready.value=Math.min(1,bgU.ready.value+dt*1.5);
    }
    bgU.mixv.value=S.mix;bgU.time.value=t;bgU.mouse.value.set(cur.mx,cur.my);
    bgU.zoom.value=cur.zoom;bgU.speed.value=RM?0:cur.speed;bgU.side.value=cur.side;bgU.dark.value=cur.dark;bgU.blur.value=cur.blur;bgU.flash.value=cur.flash;
    pU.time.value=t;pU.uRain.value=RM?0:cur.rain;pU.uConf.value=RM?0:cur.conf;pU.uDust.value=cur.dust;

    renderer.clear();
    renderer.render(bgScene,ortho);
    if(cur.ring>.01){
      ringAngle=-S.ringRot*Math.PI*1.2-(RM?0:t*.06);
      ring.rotation.y=ringAngle;
      cards.forEach(function(m,i){
        var u=m.userData,r=loadTex(u.key);
        if(r.ready&&u.u.has.value<.5){u.u.map.value=r.t;u.u.has.value=1;}
        u.hl=k(u.hl,m===hover?1:0,dt,8);u.u.hl.value=u.hl;
        m.getWorldPosition(wp);
        var front=clamp01((wp.z-tilt.position.z+RAD*tilt.scale.x*.2)/(RAD*tilt.scale.x*.9));
        u.u.alpha.value=cur.ring*(.08+.92*front);
        m.position.y=Math.sin(t*1.1+i)*.08;
        var s=1+u.hl*.12;m.scale.set(s,s,s);
      });
      tilt.rotation.y=cur.mx*.12;
      renderer.render(ringScene,persp);
    }
  }
  requestAnimationFrame(frame);
  R={renderer:renderer,preload:function(keys){keys.forEach(loadTex);}};
  canvas.classList.add('on');
}

function fallback(){
  gl=false;nogl=true;document.documentElement.classList.add('nogl');
  cssBg(S.mix>.5?S.b:S.a);
  return false;
}
function init(q){
  quality=q||'auto';
  var low=quality==='low';
  if(!low&&window.Three3D&&Three3D.supported()){
    return Three3D.load().then(function(m){
      THREE=m;
      try{build();gl=true;document.documentElement.classList.remove('nogl');return true;}
      catch(e){console.warn('[quiz] WebGL off',e);return fallback();}
    },fallback);
  }
  return Promise.resolve(fallback());
}

function set(o){
  for(var k in o)S[k]=o[k];
  if(nogl)cssBg(S.mix>.5?S.b:S.a);
}

window.QScene={
  init:init,set:set,
  flash:function(v){cur.flash=v||.35;},
  onRing:function(fn){ringCb=fn;},
  preload:function(keys){if(gl&&R)R.preload(keys);else keys.forEach(function(k){var i=new Image();i.src=imgUrl(variant(k));});},
  mobile:function(){return MOB;},
  get gl(){return gl;}
};
})();
