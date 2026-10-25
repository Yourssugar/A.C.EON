/* A.C.EON · Архив звука: сцена за плеером (WebGL).
   У каждой серии свой мир: сетка с закатом (по умолчанию), дождь, дюны, ночной город, пустота, сигнал, тени.
   Сцена выбирается так: поле scene у трека, иначе по альбому, иначе по названию. При смене трека мир плавно перетекает.
   Под музыку: бас толкает яркость и скорость, удар даёт вспышку. Цвет подмешивается от обложки трека.
   U-1: выключено. U-2: картинка в 0.35 разрешения. U-3: 0.5. Без WebGL просто ничего не рисуем. */
(function(){
'use strict';
const MP=window.MusicPlayer; if(!MP)return;
const AU=window.AceonUniverse||{id:2};
const cv=document.getElementById('scene');
if(!cv||(AU.id||2)<2||MP.reduce)return;
let gl=null;
try{ gl=cv.getContext('webgl',{alpha:true,antialias:false,premultipliedAlpha:false,powerPreference:'low-power'}); }catch(e){}
if(!gl)return;

const SCENES=['grid','rain','dunes','city','void','signal','shadows'];
const ALB_SCENE={dunes:'dunes',void:'void',signal:'signal',alive:'signal',silver:'signal'};
function sceneFor(t){
  if(!t)return 'grid';
  if(t.scene&&SCENES.indexOf(t.scene)>=0)return t.scene;
  const al=(MP.ALBUMS||[]).find(a=>a.tracks.indexOf(t.id)>=0);
  if(al&&ALB_SCENE[al.id])return ALB_SCENE[al.id];
  const s=t.title||'';
  if(/Pluie|дожд|rain/i.test(s))return 'rain';
  if(/город|Midnight|City|Night/i.test(s))return 'city';
  if(/Shadow|тен[иьей]|Тень/i.test(s))return 'shadows';
  if(/Signal|сигнал/i.test(s))return 'signal';
  return 'grid';
}

const VS='attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';
const FS=`precision mediump float;
uniform vec2 R;uniform float tm,bass,en,flash,mixk,sA,sB;uniform vec3 tint;
float h1(float n){return fract(sin(n)*43758.5453);}
float h2(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float ns(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
  return mix(mix(h2(i),h2(i+vec2(1,0)),f.x),mix(h2(i+vec2(0,1)),h2(i+vec2(1,1)),f.x),f.y);}
float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<4;i++){v+=a*ns(p);p*=2.03;a*=.5;}return v;}
vec3 grid(vec2 uv){
  vec3 c=mix(vec3(.05,.02,.12),vec3(.35,.08,.35),smoothstep(-.1,.5,uv.y)*(1.-smoothstep(.5,1.,uv.y)));
  vec2 sp=uv-vec2(.5*R.x/R.y,.58);float r=length(sp);
  float sun=smoothstep(.2+bass*.02,.19,r);
  float bands=step(.5,fract((sp.y+tm*.02)*18.))+step(.06,sp.y);
  c+=sun*mix(vec3(1.,.35,.5),vec3(1.,.8,.4),sp.y*3.+.5)*min(1.,bands);
  c+=exp(-r*5.)*.25*vec3(1.,.4,.7)*(1.+bass);
  if(uv.y<.42){float d=.42-uv.y;float z=.12/d;float x=(uv.x-.5*R.x/R.y)*z;float px=1.6/R.y;
    float gz=fract(z*2.5-tm*(.8+en*2.4));float gx=fract(x*9.);
    float hl=1.-smoothstep(0.,2.5*.12/(d*d)*px,min(gz,1.-gz));
    float vl=1.-smoothstep(0.,9.*z*px,min(gx,1.-gx));
    float ln=max(hl,vl)*smoothstep(0.,.06,d);
    c=vec3(.04,.01,.09)+exp(-d*9.)*vec3(.5,.12,.4)+ln*vec3(.75,.3,1.)*(.35+.65*smoothstep(0.,.3,d))*(1.+bass*.8);}
  return c;}
vec3 rain(vec2 uv){
  vec3 c=vec3(.03,.05,.09)+vec3(.05,.08,.14)*uv.y;
  for(int i=0;i<8;i++){float fi=float(i);vec2 q=vec2(fract(h1(fi*3.1)*1.7+sin(tm*.05+fi)*.02),h1(fi*7.7)*.55);
    float d=length((uv-vec2(q.x*R.x/R.y,q.y))*vec2(1.,1.4));c+=exp(-d*d*90.)*mix(vec3(.9,.6,.3),vec3(.4,.6,1.),h1(fi))*.35*(1.+bass*.6);}
  vec2 g=uv*vec2(70.,6.);g.y+=tm*(6.+en*6.);vec2 id=floor(g);float rnd=h2(vec2(id.x,0.));
  g.y+=rnd*10.;float f=fract(g.y+rnd*7.);float drop=smoothstep(.0,.03,f)*smoothstep(.25,.0,f)*step(.55,h2(vec2(id.x,floor(g.y))));
  float lane=smoothstep(.12,0.,abs(fract(g.x)-.5));c+=drop*lane*vec3(.5,.6,.8)*.5;
  return c;}
vec3 dunes(vec2 uv){
  vec3 c=mix(vec3(.9,.5,.25),vec3(.25,.12,.3),smoothstep(.2,1.,uv.y));
  vec2 sp=uv-vec2(.72*R.x/R.y,.62);c+=exp(-length(sp)*7.)*vec3(1.,.8,.5)*(1.+bass*.5);
  for(int i=0;i<4;i++){float fi=float(i);float k=1.+fi*.7;
    float y=.45-fi*.09+sin(uv.x*2.2*k+fi*1.7+tm*.02*k)*.04+fbm(vec2(uv.x*1.5*k+fi+tm*.01*k,fi))*.05;
    float m=smoothstep(.004,-.004,uv.y-y);vec3 dc=mix(vec3(.55,.3,.18),vec3(.15,.06,.08),fi/3.);
    dc+=.12*smoothstep(.02,0.,abs(uv.y-y+.005))*vec3(1.,.7,.4);c=mix(c,dc,m);}
  float sand=step(.996,h2(floor(uv*vec2(260.,140.)+vec2(tm*30.*(1.+en),0.))));c+=sand*.25*vec3(1.,.8,.6);
  return c;}
vec3 city(vec2 uv){
  vec3 c=mix(vec3(.12,.04,.18),vec3(.02,.02,.06),uv.y);
  for(int l=0;l<3;l++){float fl=float(l);float sc=16.-fl*5.;float x=uv.x*sc+tm*.03*(fl+1.)+fl*13.;
    float id=floor(x);float hgt=.16+h1(id+fl*50.)*(.4-fl*.1);
    float m=step(uv.y,hgt);vec3 bc=vec3(.035,.025,.08)*(1.5-fl*.45);
    vec2 w=vec2(fract(x)*4.,uv.y*sc*2.4);float win=step(.4,fract(w.x))*step(.45,fract(w.y))*step(.72,h2(floor(w)+id+fl));
    win*=step(.08,fract(x))*step(fract(x),.92);
    float blink=.6+.4*sin(tm*.7+h2(floor(w)+id)*20.);
    bc+=win*mix(vec3(1.,.75,.4),tint,.35)*.55*blink*(1.+bass*.5)*(.55+fl*.25);
    c=mix(c,bc,m);}
  c+=exp(-abs(uv.y-.05)*14.)*vec3(.5,.15,.6)*.25;
  return c;}
vec3 voidS(vec2 uv){
  vec2 p=uv-vec2(.5*R.x/R.y,.5);float r=length(p),a=atan(p.y,p.x);
  vec3 c=vec3(.01,.01,.03);
  float ring=exp(-abs(r-.28-bass*.03)*60.)*(.5+.5*sin(a*3.+tm*.3));
  c+=ring*mix(vec3(.5,.4,1.),tint,.4)*.8;
  c+=exp(-r*3.)*.08*vec3(.4,.3,.9);
  vec2 g=uv*55.;vec2 id=floor(g);float s=step(.985,h2(id));c+=s*smoothstep(.3,0.,length(fract(g)-.5))*(.4+.6*sin(tm*1.3+h2(id)*30.));
  c*=1.-smoothstep(.12,0.,r)*.9;
  return c;}
vec3 signal(vec2 uv){
  vec3 c=vec3(.01,.04,.04);
  for(int i=0;i<5;i++){float fi=float(i);float y=.2+fi*.15;
    float w=sin(uv.x*(9.+fi*4.)+tm*(1.2+fi*.4))*.03*(1.+bass*2.5*(1.-fi*.15))+sin(uv.x*41.+tm*3.)*.006*en;
    float d=abs(uv.y-y-w);c+=exp(-d*d*9000.)*mix(vec3(.3,1.,.8),tint,.3)*(.25+.2*fi/4.)+exp(-d*90.)*.03;}
  c*=.85+.15*step(.5,fract(uv.y*R.y*.25));
  return c;}
vec3 shadows(vec2 uv){
  vec3 c=vec3(.03,.01,.01);
  float f=fbm(vec2(uv.x*3.,uv.y*2.-tm*.6))*smoothstep(.75,0.,uv.y);
  c+=f*f*vec3(1.,.38,.1)*(1.1+bass*1.4);
  float sm=fbm(vec2(uv.x*1.6+tm*.05,uv.y*1.2-tm*.12));c*=.55+.6*sm;
  for(int i=0;i<14;i++){float fi=float(i);float sp=.08+h1(fi*1.7)*.12;float life=fract(tm*sp+h1(fi*9.1));
    vec2 q=vec2(h1(fi*4.3)*R.x/R.y+sin(tm*.8+fi)*.03*life,life*.9);
    float e=exp(-dot(uv-q,uv-q)*9000.)*(1.-life)*(1.2+bass*1.5);c+=e*vec3(1.,.55,.15);}
  return c;}
vec3 pick(float s,vec2 uv){
  if(s<.5)return grid(uv);if(s<1.5)return rain(uv);if(s<2.5)return dunes(uv);if(s<3.5)return city(uv);
  if(s<4.5)return voidS(uv);if(s<5.5)return signal(uv);return shadows(uv);}
void main(){
  vec2 uv=gl_FragCoord.xy/R.y;
  vec3 a=pick(sA,uv);vec3 c=a;
  if(mixk<.999){vec3 b=pick(sB,uv);c=mix(b,a,mixk);}
  c+=flash*.08*tint;
  c=mix(c,c*tint*1.6,.18);
  vec2 q=gl_FragCoord.xy/R-.5;c*=1.-dot(q,q)*1.1;
  gl_FragColor=vec4(c,1.);
}`;
function sh(t,s){ const o=gl.createShader(t); gl.shaderSource(o,s); gl.compileShader(o); if(!gl.getShaderParameter(o,gl.COMPILE_STATUS)){ console.warn('[scene]',gl.getShaderInfoLog(o)); return null; } return o; }
const vs=sh(gl.VERTEX_SHADER,VS), fs=sh(gl.FRAGMENT_SHADER,FS); if(!vs||!fs)return;
const pr=gl.createProgram(); gl.attachShader(pr,vs); gl.attachShader(pr,fs); gl.linkProgram(pr);
if(!gl.getProgramParameter(pr,gl.LINK_STATUS))return;
gl.useProgram(pr);
const buf=gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER,buf);
gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),gl.STATIC_DRAW);
const ap=gl.getAttribLocation(pr,'p'); gl.enableVertexAttribArray(ap); gl.vertexAttribPointer(ap,2,gl.FLOAT,false,0,0);
const U={}; ['R','tm','bass','en','flash','mixk','sA','sB','tint'].forEach(n=>U[n]=gl.getUniformLocation(pr,n));

const SCALE=(AU.id||2)>=3?.5:.35;
function resize(){ const w=Math.max(2,Math.round(innerWidth*SCALE)), h=Math.max(2,Math.round(innerHeight*SCALE)); if(cv.width!==w||cv.height!==h){ cv.width=w; cv.height=h; } }
addEventListener('resize',resize); resize();
document.documentElement.classList.add('has-scene');

function hex(h){ const n=parseInt(String(h).replace('#',''),16); return [(n>>16&255)/255,(n>>8&255)/255,(n&255)/255]; }
let sA=0, sB=0, mixk=1, tint=[.65,.55,.98], tintT=tint.slice(), flash=0, bass=0, en=0;
document.addEventListener('mp:track',e=>{
  const t=e.detail, s=SCENES.indexOf(sceneFor(t));
  if(t){ try{ tintT=hex(MP.trackColor(t.id).fg); }catch(er){} }
  if(s!==sA){ sB=sA; sA=s; mixk=0; }
});
if(MP.current)document.dispatchEvent(new CustomEvent('mp:track',{detail:MP.current}));
window.MusicScene={sceneFor,get current(){ return SCENES[sA]; }};

let last=performance.now(), tm=0, lastDraw=0;
const FRAME=(AU.id||2)>=3?16:33;
function loop(now){
  requestAnimationFrame(loop);
  if(document.hidden)return;
  if(document.documentElement.classList.contains('th-img')){ cv.classList.remove('on'); return; }   /* тема с картинкой: сцена спит */
  if(now-lastDraw<FRAME-1)return; lastDraw=now;
  const dt=Math.min(.1,(now-last)/1000); last=now;
  const L=MP.levels||{}, on=MP.playing;
  bass+=(((on&&L.bass)||0)-bass)*Math.min(1,dt*8);
  en+=(((on&&L.energy)||0)-en)*Math.min(1,dt*3);
  if(on&&L.beat)flash=Math.min(1,(L.strength||1.3)-.6);
  flash*=Math.exp(-dt*5);
  tm+=dt*(on?1:.35);
  if(mixk<1)mixk=Math.min(1,mixk+dt/1.8);
  for(let i=0;i<3;i++)tint[i]+=(tintT[i]-tint[i])*Math.min(1,dt*1.5);
  gl.viewport(0,0,cv.width,cv.height);
  gl.uniform2f(U.R,cv.width,cv.height); gl.uniform1f(U.tm,tm); gl.uniform1f(U.bass,bass); gl.uniform1f(U.en,en);
  gl.uniform1f(U.flash,flash); gl.uniform1f(U.mixk,mixk); gl.uniform1f(U.sA,sA); gl.uniform1f(U.sB,sB);
  gl.uniform3f(U.tint,tint[0],tint[1],tint[2]);
  gl.drawArrays(gl.TRIANGLE_STRIP,0,4);
  cv.classList.add('on');
}
requestAnimationFrame(loop);
})();
