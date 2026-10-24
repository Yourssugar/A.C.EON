/* A.C.EON · Гостевая книга: ночное небо.
   WebGL1, один холст на всё окно. Без WebGL рисует простой Canvas 2D (статичный фон + следы).
   Координаты везде в CSS-пикселях, перевод в пиксели экрана внутри.

   const sky=AceonSky.create(canvas,{tier:1..3, reduce:bool, coarse:bool})
   sky.resize()                       после изменения размера окна
   sky.frame(now, scene)              нарисовать кадр; scene = {guests:[...], mouse:{x,y}|null, hover:id|null}
       guest: {id, name, x, y, size, r,g,b, a, own, fresh, hov}   (a: яркость 0..1, hov: 0..1)
   sky.wave()                         волна рождения следа
   sky.burst(x,y)                     вспышка в точке (новая звезда, "найти мою")
   sky.gl                             true, если WebGL
   sky.st                             состояние для архива памяти, меняется снаружи:
       die 0..1 (распад неба), dieT (секунд с начала распада), dur (длина распада, с),
       ink 0..1 (белое небо, звёзды чернилами), starA 0..1 (видимость фоновых звёзд и светлячков)
   sky.breakConsts(guests)            созвездия вспыхивают красным и рвутся (начало распада)

   Уровни (вселенные сайта):
   1  фон и фоновые звёзды рисуются один раз, кадр = готовая картинка + следы, 30 fps
   2  живое небо: туманности дышат, звёзды плывут и мерцают, параллакс, фонарик у курсора
   3  + Млечный Путь, аврора, вспышки звёзд, светлячки, созвездия памяти, падающие звёзды, пыль у следа */
(function(){
'use strict';

const TIERS={
  1:{dpr:1,   bg:.5,  stars:120, live:0, milky:0, aur:0, fx:0},
  2:{dpr:1.5, bg:.4,  stars:120, live:1, milky:0, aur:0, fx:0},
  3:{dpr:2,   bg:.55, stars:170, live:1, milky:1, aur:1, fx:1}
};

/* ---------- шейдеры ---------- */
const V_QUAD=`attribute vec2 aP;varying vec2 vUv;void main(){vUv=aP*.5+.5;gl_Position=vec4(aP,0.,1.);}`;

const F_BG=`
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
varying vec2 vUv;
uniform vec2 uRes;uniform vec2 uPar;uniform float uT,uMilky,uAur,uDie,uInk;
float hash(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
  return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.,1.)),f.x),f.y);}
float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<4;i++){v+=a*noise(p);p=p*2.03+vec2(1.7,9.2);a*=.5;}return v;}
vec3 blob(vec2 p,vec2 c,float R,vec3 col,float a){float d=length(p-c)/R;float g=1.-smoothstep(0.,1.,d);return col*a*g;}
void main(){
  vec2 p=vec2(vUv.x,1.-vUv.y)*uRes;
  float m=min(uRes.x,uRes.y), T=uT;
  vec3 col=vec3(7.,5.,15.)/255.;
  /* туманности: три облака дышат, внутри шум */
  float n=fbm(p/m*2.4+vec2(T*.004,-T*.003));
  float mod1=.5+n;
  vec2 par=uPar*vec2(26.,20.);
  col+=blob(p,vec2(.28+sin(T*.07)*.05,.28+cos(T*.05)*.04)*uRes-par,.48*m,vec3(55.,18.,110.)/255.,.13)*mod1;
  col+=blob(p,vec2(.72+sin(T*.05)*.06,.62+cos(T*.08)*.05)*uRes-par,.48*m,vec3(18.,38.,100.)/255.,.10)*mod1;
  col+=blob(p,vec2(.52+sin(T*.06)*.04,.10+cos(T*.04)*.03)*uRes-par,.48*m,vec3(95.,28.,55.)/255.,.085)*(.6+n*.8);
  /* Млечный Путь: лента по диагонали, тёмная прожилка пыли */
  if(uMilky>.5){
    vec2 q=p+uPar*vec2(15.,11.);
    vec2 A=vec2(-40.,uRes.y*.72), B=vec2(uRes.x+40.,uRes.y*.22);
    vec2 dir=normalize(B-A), nrm=vec2(-dir.y,dir.x);
    float d=dot(q-A,nrm)/(uRes.y*.14);
    float along=dot(q-A,dir)/m;
    float f2=fbm(vec2(along*3.,d*1.5)+vec2(3.1,T*.002));
    float band=exp(-d*d*1.6)*(.35+.9*f2);
    float lane=exp(-pow((d+.12-(f2-.5)*.5)*5.,2.))*smoothstep(.35,.7,f2);
    col+=vec3(.74,.78,.92)*.05*band*(1.-.7*lane)*(1.-uDie*.8);
  }
  /* аврора у верхнего края */
  if(uAur>.5){
    float x=p.x, base=uRes.y*.14, amp=uRes.y*.035;
    float yb=base+sin(x*.004+T*.12)*amp+sin(x*.011+T*.07)*amp*.4;
    float k=smoothstep(yb-16.,yb+8.,p.y)*(1.-smoothstep(yb,yb+uRes.y*.09,p.y));
    float streak=.3+.7*fbm(vec2(x*.018+T*.05,p.y*.006+T*.02));
    col+=vec3(120.,220.,190.)/255.*.055*k*streak*(1.-uDie)*(1.-uInk);
  }
  /* распад: свет уходит из туманностей */
  col=mix(col,vec3(8.,8.,12.)/255.,uDie*.5);
  /* белое небо архива: те же облака, только светлые на белом */
  if(uInk>0.){
    float v=dot(max(col-vec3(7.,5.,15.)/255.,0.),vec3(.4,.35,.25))*3.;
    vec3 ink=vec3(1.)-v*vec3(1.,1.,.92);
    col=mix(col,ink,uInk);
  }
  gl_FragColor=vec4(col,1.);
}`;

const F_BLIT=`precision mediump float;varying vec2 vUv;uniform sampler2D uTex;
float h(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}
void main(){vec3 c=texture2D(uTex,vUv).rgb;c+=(h(gl_FragCoord.xy)-.5)/255.;gl_FragColor=vec4(c,1.);}`;

/* фоновые звёзды и пыль Млечного Пути: положение, мерцание и вспышки считаются здесь */
const V_STAR=`
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
attribute vec4 aA;attribute vec4 aB;
uniform vec2 uRes,uPar,uMouse;uniform float uT,uDpr,uLive,uFlare,uLamp,uPMax,uDie,uDieT,uDur,uStarA,uWeak;
varying vec3 vCol;varying float vA,vF,vR,vS;
float h(float n){return fract(sin(n)*43758.5453);}
void main(){
  bool dust=aB.y>2.5;
  float z=dust?1.:aA.w;
  float W=uRes.x;
  float x=aA.x-uT*(2.+z*6.)*aB.z*uLive;
  x=mod(x+4.,W+8.)-4.;
  vec2 p=vec2(x-uPar.x*14.*z*aB.w,aA.y-uPar.y*10.*z*aB.w);
  float tw=.5+.5*sin(uT+aB.x);
  float a=dust?aA.w:z*(.2+.4*mix(.5,tw,uLive));
  float f=0.;
  if(uFlare>.5&&!dust){
    float cyc=uT/9.+aB.x*3.7, k=floor(cyc);
    if(h(k*12.9898+aB.x*78.233)>.985){float lt=fract(cyc)*9.;f=max(0.,1.-lt*.55);}
  }
  if(uDie>0.){
    float g=mix(24.,90.,h(aB.x*91.7+aA.x))*mix(1.,.25,uWeak);
    p.y+=g*uDieT*uDieT*uDieT/(6.*uDur);
    a*=(.6+.4*sin(uT*20.+aB.x*7.))*(1.-uDie*.35);
  }
  a*=uStarA;
  float md=length(p-uMouse);
  a*=1.+uLamp*.9*max(0.,1.-md/130.);
  a=min(1.,a+f*.65);
  float r=aA.z*(1.+f*1.6);
  vCol=aB.y<.5?vec3(1.):(aB.y<1.5?vec3(1.,.84,.67):(aB.y<2.5?vec3(.67,.78,1.):vec3(.92,.94,1.)));
  vA=a;vF=f;vR=r;
  float sz=f>0.?(2.*(6.+f*8.)+3.):(2.*r+3.);
  vS=sz;
  gl_PointSize=min(sz*uDpr,uPMax);
  vec2 c=p/uRes*2.-1.;
  gl_Position=vec4(c.x,-c.y,0.,1.);
}`;
const F_STAR=`precision mediump float;
varying vec3 vCol;varying float vA,vF,vR,vS;
void main(){
  vec2 q=(gl_PointCoord-.5)*vS;
  float d=length(q);
  float rr=max(vR,.45);
  float a=vA*clamp(vR*1.3,.3,1.)*exp(-d*d/(rr*rr*1.4+.35));
  if(vF>0.){
    float L=6.+vF*8.;
    float sx=smoothstep(.9,0.,abs(q.y))*(1.-smoothstep(0.,L,abs(q.x)));
    float sy=smoothstep(.9,0.,abs(q.x))*(1.-smoothstep(0.,L,abs(q.y)));
    a+=vF*.45*(sx+sy);
  }
  gl_FragColor=vec4(vCol*a,1.);
}`;

/* следы гостей, светлячки, пыль: позиции готовит JS */
const V_PT=`precision mediump float;
attribute vec2 aP;attribute vec4 aC;attribute vec4 aK;
uniform vec2 uRes;uniform float uDpr,uPMax;
varying vec3 vCol;varying float vA,vS,vRing,vHov,vKind,vFresh;
void main(){
  vCol=aC.rgb;vA=aC.a;vRing=aK.x;vHov=aK.y;vKind=aK.z;vFresh=aK.w;
  float s;
  if(aK.z>.5){s=3.;}
  else{
    float g=mix(5.,14.,aK.y)*(1.+aK.w*.5);
    float R=aK.x>.5?mix(9.,16.,aK.y)+4.:0.;
    s=2.*max(g*2.6,R)+2.;
  }
  vS=s;
  gl_PointSize=min(s*uDpr,uPMax);
  vec2 c=aP/uRes*2.-1.;
  gl_Position=vec4(c.x,-c.y,0.,1.);
}`;
const F_PT=`precision mediump float;
uniform float uT,uInk;
varying vec3 vCol;varying float vA,vS,vRing,vHov,vKind,vFresh;
void main(){
  vec2 q=(gl_PointCoord-.5)*vS;
  float d=length(q);
  if(vKind>.5){float a=vA*exp(-d*d/.9);gl_FragColor=vec4(mix(vCol,vec3(.8),uInk)*a,1.);return;}
  float c=mix(1.6,5.,vHov)*(1.+vFresh*.35);
  float g=mix(5.,14.,vHov)*(1.+vFresh*.5);
  float core=smoothstep(c+.8,c-.6,d);
  float glow=exp(-d*d/(g*g))*mix(.38,.85,vHov);
  vec3 col=mix(vCol,vec3(.92),uInk)*(core+glow*.65)*vA;
  if(vRing>.5){
    float R=mix(9.,16.,vHov);
    float ring=smoothstep(1.3,0.,abs(d-R));
    float ang=atan(q.y,q.x);
    float dash=smoothstep(-.2,.2,sin(ang*4.+uT*.8));
    col+=mix(vec3(1.,.82,.48),vec3(.4,.55,.85),uInk)*ring*(.35+.5*dash)*(.75+.25*sin(uT*2.));
  }
  gl_FragColor=vec4(col,1.);
}`;

const V_LINE=`precision mediump float;attribute vec2 aP;attribute vec4 aC;uniform vec2 uRes;varying vec4 vC;
void main(){vC=aC;vec2 c=aP/uRes*2.-1.;gl_Position=vec4(c.x,-c.y,0.,1.);}`;
const F_LINE=`precision mediump float;varying vec4 vC;void main(){gl_FragColor=vec4(vC.rgb*vC.a,1.);}`;

const F_WAVE=`precision mediump float;varying vec2 vUv;uniform vec2 uRes,uC;uniform float uR,uA,uDpr;
void main(){vec2 p=vec2(vUv.x,1.-vUv.y)*uRes;float d=length(p-uC);
  float a=uA*(smoothstep(1.6,0.,abs(d-uR))+.5*smoothstep(1.2,0.,abs(d-uR*.86)));
  a+=uA*.25*exp(-pow((d-uR)/18.,2.));
  gl_FragColor=vec4(vec3(.745,.863,1.)*a,1.);}`;

/* ---------- общее ---------- */
function rnd(a,b){ return a+Math.random()*(b-a); }

function create(canvas,o){
  const tier=TIERS[o.tier]||TIERS[2];
  const live=tier.live&&!o.reduce;
  const cap=o.coarse?Math.min(tier.dpr,1.5):tier.dpr;
  if(/[?&]gl=off/.test(location.search)) return create2D(canvas,o,tier);
  let gl=null;
  try{ gl=canvas.getContext('webgl',{alpha:false,antialias:false,depth:false,stencil:false,premultipliedAlpha:false,preserveDrawingBuffer:false}); }catch(e){}
  if(!gl) return create2D(canvas,o,tier);

  function sh(type,src){ const s=gl.createShader(type); gl.shaderSource(s,src); gl.compileShader(s);
    if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(s)); return s; }
  function prog(vs,fs){ const p=gl.createProgram(); gl.attachShader(p,sh(gl.VERTEX_SHADER,vs)); gl.attachShader(p,sh(gl.FRAGMENT_SHADER,fs));
    gl.linkProgram(p); if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(p));
    const u={}, n=gl.getProgramParameter(p,gl.ACTIVE_UNIFORMS);
    for(let i=0;i<n;i++){ const a=gl.getActiveUniform(p,i); u[a.name]=gl.getUniformLocation(p,a.name); }
    const at={}, m=gl.getProgramParameter(p,gl.ACTIVE_ATTRIBUTES);
    for(let i=0;i<m;i++){ const a=gl.getActiveAttrib(p,i); at[a.name]=gl.getAttribLocation(p,a.name); }
    return {p,u,a:at}; }
  let P;
  try{
    P={bg:prog(V_QUAD,F_BG), blit:prog(V_QUAD,F_BLIT), star:prog(V_STAR,F_STAR), pt:prog(V_PT,F_PT), line:prog(V_LINE,F_LINE), wave:prog(V_QUAD,F_WAVE)};
  }catch(e){ console.warn('[sky] webgl:',e.message); return create2D(canvas,o,tier); }
  const PMAX=(gl.getParameter(gl.ALIASED_POINT_SIZE_RANGE)||[1,64])[1];

  const quad=gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER,quad); gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),gl.STATIC_DRAW);
  const starBuf=gl.createBuffer(), ptBuf=gl.createBuffer(), lineBuf=gl.createBuffer();
  let ptData=new Float32Array(10*400), lineData=new Float32Array(6*200);
  let nStars=0;
  let W=1,H=1,dpr=1;
  let fbo=null, fboTex=null, fbW=0, fbH=0, bgScale=tier.bg, staticReady=false;

  function makeFbo(w,h){
    if(fbo){ gl.deleteFramebuffer(fbo); gl.deleteTexture(fboTex); }
    fboTex=gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D,fboTex);
    gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,w,h,0,gl.RGBA,gl.UNSIGNED_BYTE,null);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
    fbo=gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER,fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,fboTex,0);
    gl.bindFramebuffer(gl.FRAMEBUFFER,null); fbW=w; fbH=h;
  }
  /* фоновые звёзды + пыль Млечного Пути (как в старом buildMilky) */
  function buildStars(){
    const arr=[];
    for(let i=0;i<tier.stars;i++){
      const r=Math.random(), tint=r<.78?0:(r<.9?1:2);
      arr.push(Math.random()*W,Math.random()*H,Math.random()*.9+.15,.3+Math.random()*.7, Math.random()*6.283,tint,1,1);
    }
    if(tier.milky){
      const x0=-40,y0=H*.72,x1=W+40,y1=H*.22,dx=x1-x0,dy=y1-y0,L=Math.hypot(dx,dy),nx=-dy/L,ny=dx/L;
      for(let i=0;i<720;i++){
        const t=Math.random(), sp=(Math.random()+Math.random()+Math.random()-1.5)/1.5;
        const a=(.03+Math.random()*.10)*(1-Math.abs(sp)*.7); if(a<=0)continue;
        arr.push(x0+dx*t+nx*sp*H*.14, y0+dy*t+ny*sp*H*.14, Math.random()<.85?.5:.8, a, 0,3,0,1.07);
      }
    }
    nStars=arr.length/8;
    gl.bindBuffer(gl.ARRAY_BUFFER,starBuf); gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(arr),gl.STATIC_DRAW);
  }
  /* светлячки (уровень 3) */
  let flies=[];
  function buildFlies(){ flies=tier.fx&&live?Array.from({length:o.coarse?28:50},()=>({x:Math.random()*W,y:Math.random()*H,vx:0,vy:0,ph:Math.random()*6.283})):[]; }

  function resize(){
    dpr=Math.min(window.devicePixelRatio||1,cap);
    W=Math.max(1,window.innerWidth); H=Math.max(1,window.innerHeight);
    canvas.width=Math.round(W*dpr); canvas.height=Math.round(H*dpr);
    canvas.style.width=W+'px'; canvas.style.height=H+'px';
    const s=bgScale;
    makeFbo(Math.max(1,Math.round(canvas.width*s)),Math.max(1,Math.round(canvas.height*s)));
    buildStars(); buildFlies(); staticReady=false; consts.length=0;
  }

  function off(pr){ for(const k in pr.a)gl.disableVertexAttribArray(pr.a[k]); }
  function bindQuad(pr){ gl.bindBuffer(gl.ARRAY_BUFFER,quad); gl.enableVertexAttribArray(pr.a.aP); gl.vertexAttribPointer(pr.a.aP,2,gl.FLOAT,false,0,0); }
  function drawBG(T,par){
    gl.useProgram(P.bg.p); bindQuad(P.bg);
    gl.uniform2f(P.bg.u.uRes,W,H); gl.uniform2f(P.bg.u.uPar,par.x,par.y);
    gl.uniform1f(P.bg.u.uT,T); gl.uniform1f(P.bg.u.uMilky,tier.milky); gl.uniform1f(P.bg.u.uAur,tier.aur&&live?1:0);
    gl.uniform1f(P.bg.u.uDie,st.die); gl.uniform1f(P.bg.u.uInk,st.ink);
    gl.drawArrays(gl.TRIANGLE_STRIP,0,4); off(P.bg);
  }
  function drawStars(T,par,mouse){
    const pr=P.star; gl.useProgram(pr.p);
    gl.bindBuffer(gl.ARRAY_BUFFER,starBuf);
    gl.enableVertexAttribArray(pr.a.aA); gl.vertexAttribPointer(pr.a.aA,4,gl.FLOAT,false,32,0);
    gl.enableVertexAttribArray(pr.a.aB); gl.vertexAttribPointer(pr.a.aB,4,gl.FLOAT,false,32,16);
    gl.uniform2f(pr.u.uRes,W,H); gl.uniform2f(pr.u.uPar,par.x,par.y);
    gl.uniform2f(pr.u.uMouse,mouse?mouse.x:-9999,mouse?mouse.y:-9999);
    gl.uniform1f(pr.u.uT,T); gl.uniform1f(pr.u.uDpr,dpr); gl.uniform1f(pr.u.uLive,live?1:0);
    gl.uniform1f(pr.u.uFlare,tier.fx&&live&&!st.die?1:0); gl.uniform1f(pr.u.uLamp,live&&mouse&&!st.die?1:0); gl.uniform1f(pr.u.uPMax,PMAX);
    gl.uniform1f(pr.u.uDie,st.die); gl.uniform1f(pr.u.uDieT,st.dieT); gl.uniform1f(pr.u.uDur,Math.max(1,st.dur));
    gl.uniform1f(pr.u.uStarA,st.starA); gl.uniform1f(pr.u.uWeak,tier.live?0:1);
    gl.drawArrays(gl.POINTS,0,nStars); off(pr);
  }
  function blit(){
    gl.useProgram(P.blit.p); bindQuad(P.blit);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D,fboTex); gl.uniform1i(P.blit.u.uTex,0);
    gl.drawArrays(gl.TRIANGLE_STRIP,0,4); off(P.blit);
  }

  /* эффекты */
  const st={die:0,dieT:0,dur:12,ink:0,starA:1};
  let lastInk=-1;
  const waves=[], bursts=[], dust=[], consts=[];
  let shoot=null, constTimer=14+Math.random()*18, lastT=0, par={x:0,y:0}, parT={x:0,y:0};
  let slowAcc=0, slowN=0;

  function pickConst(byId,guests){
    const on=guests.filter(g=>g.x>50&&g.x<W-50&&!g.hov);
    if(on.length<4)return null;
    const seed=on[Math.random()*on.length|0];
    const same=on.filter(g=>g.name&&g.name.toLowerCase()===seed.name.toLowerCase());
    if(same.length>=2&&Math.random()<.7) return {ids:same.slice(0,6).map(g=>g.id),t:0,warm:1};
    on.sort((a,b)=>((a.x-seed.x)**2+(a.y-seed.y)**2)-((b.x-seed.x)**2+(b.y-seed.y)**2));
    return {ids:on.slice(0,3+(Math.random()*2|0)+1).map(g=>g.id),t:0,warm:0};
  }

  function frame(now,scene){
    const T=now/1000, dt=Math.min(.05,lastT?T-lastT:.016); lastT=T;
    const mouse=scene.mouse||null, guests=scene.guests||[];
    if(live&&mouse&&!o.coarse){ parT.x=mouse.x/W-.5; parT.y=mouse.y/H-.5; }
    par.x+=(parT.x-par.x)*.03; par.y+=(parT.y-par.y)*.03;
    gl.disable(gl.BLEND);

    /* фон в уменьшенный буфер: живое небо каждый кадр, на уровне 1 один раз (и каждый кадр, пока идёт распад) */
    if(st.ink!==lastInk){ lastInk=st.ink; staticReady=false; }
    gl.bindFramebuffer(gl.FRAMEBUFFER,fbo); gl.viewport(0,0,fbW,fbH);
    if(live||st.die>0){ drawBG(live?T:17.3,par); staticReady=false; }
    else if(!staticReady){ drawBG(17.3,{x:0,y:0}); staticReady=true; }
    gl.bindFramebuffer(gl.FRAMEBUFFER,null); gl.viewport(0,0,canvas.width,canvas.height);
    blit();
    gl.enable(gl.BLEND);
    /* на белом звёзды не прибавляют свет, а вычитают: получаются чернила */
    if(st.ink>.5)gl.blendFunc(gl.ZERO,gl.ONE_MINUS_SRC_COLOR); else gl.blendFunc(gl.ONE,gl.ONE);
    if(st.starA>0)drawStars(live?T:0,par,st.die?null:mouse);

    /* волна рождения */
    for(let i=waves.length-1;i>=0;i--){
      if(st.ink>.5){ waves.length=0; break; }
      const w=waves[i]; w.t+=dt*.55; if(w.t>=1){ waves.splice(i,1); continue; }
      const pr=P.wave; gl.useProgram(pr.p); bindQuad(pr);
      gl.uniform2f(pr.u.uRes,W,H); gl.uniform2f(pr.u.uC,W/2,H+20);
      gl.uniform1f(pr.u.uR,w.t*Math.hypot(W,H)*.8); gl.uniform1f(pr.u.uA,(1-w.t)*.13);
      gl.drawArrays(gl.TRIANGLE_STRIP,0,4); off(pr);
    }

    /* линии: созвездия, падающая звезда */
    let nl=0;
    function line(x1,y1,a1,x2,y2,a2,c){ if(nl+2>lineData.length/6){ const n=new Float32Array(lineData.length*2); n.set(lineData); lineData=n; }
      c=c||[1,1,1]; lineData.set([x1,y1,c[0],c[1],c[2],a1,x2,y2,c[0],c[1],c[2],a2],nl*6); nl+=2; }
    const byId=new Map(); guests.forEach(g=>byId.set(g.id,g));
    if(tier.fx&&live){
      constTimer-=dt;
      if(constTimer<=0&&!st.die){ const c=pickConst(byId,guests); if(c)consts.push(c); constTimer=32+Math.random()*22; }
      for(let i=consts.length-1;i>=0;i--){
        const c=consts[i]; c.t+=dt; const life=c.broken?2.6:(c.warm?4.6:3.6);
        if(c.t>=life){ consts.splice(i,1); continue; }
        const a=c.broken?(c.t<.5?c.t/.5:(c.t>life-1.1?(life-c.t)/1.1:1)):(c.t<.8?c.t/.8:(c.t>life-1.2?(life-c.t)/1.2:1));
        const pts=c.ids.map(id=>byId.get(id));
        if(pts.some(p=>!p)){ consts.splice(i,1); continue; }
        c.a=a*(c.broken?.4:.2);
        const col=c.broken?[1,.32,.43]:null, j=c.broken?10*Math.max(.2,st.die):0;
        const jx=()=>(Math.random()-.5)*j;
        for(let k=1;k<pts.length;k++) line(pts[k-1].x+jx(),pts[k-1].y+jx(),c.a,pts[k].x+jx(),pts[k].y+jx(),c.a,col);
      }
      if(!shoot&&st.ink<.5&&Math.random()<dt*(.07+st.die*.7)) shoot={x:Math.random()*W*.7+W*.2,y:Math.random()*H*.3,t:0};
      if(shoot){ shoot.t+=dt*1.8; if(shoot.t>=1)shoot=null; else { const L=60+st.die*70, dx=shoot.x-shoot.t*220, dy=shoot.y+shoot.t*120; line(dx,dy,(1-shoot.t)*.75,dx+L,dy-L*.55,0); } }
    }
    if(nl){
      const pr=P.line; gl.useProgram(pr.p);
      gl.bindBuffer(gl.ARRAY_BUFFER,lineBuf); gl.bufferData(gl.ARRAY_BUFFER,lineData.subarray(0,nl*6),gl.DYNAMIC_DRAW);
      gl.enableVertexAttribArray(pr.a.aP); gl.vertexAttribPointer(pr.a.aP,2,gl.FLOAT,false,24,0);
      gl.enableVertexAttribArray(pr.a.aC); gl.vertexAttribPointer(pr.a.aC,4,gl.FLOAT,false,24,8);
      gl.uniform2f(pr.u.uRes,W,H);
      gl.drawArrays(gl.LINES,0,nl); off(pr);
    }

    /* точки: следы гостей, вспышки, светлячки, пыль */
    let np=0;
    function pt(x,y,r,g,b,a,ring,hov,kind,fresh){
      if((np+1)*10>ptData.length){ const n=new Float32Array(ptData.length*2); n.set(ptData); ptData=n; }
      ptData.set([x,y,r,g,b,a,ring,hov,kind,fresh],np*10); np++;
    }
    if(flies.length){
      flies.forEach(f=>{
        f.vx+=(Math.random()-.5)*3*dt; f.vy+=(Math.random()-.5)*3*dt+st.die*30*dt; f.vx*=.985; f.vy*=.985;
        f.x+=f.vx; f.y+=f.vy;
        if(f.x<0)f.x=W; if(f.x>W)f.x=0; if(f.y<0)f.y=H; if(f.y>H)f.y=st.die>0?H:0;
        pt(f.x,f.y,.86,.9,1,(.1+.16*(.5+.5*Math.sin(T*1.6+f.ph)))*(1-st.die*.6)*st.starA,0,0,1,0);
      });
    }
    if(tier.fx&&live&&!st.die){
      const hg=scene.hover!=null?byId.get(scene.hover):null;
      if(hg&&Math.random()<.14&&dust.length<12) dust.push({x:hg.x+(Math.random()-.5)*8,y:hg.y,vy:-(6+Math.random()*9),vx:(Math.random()-.5)*5,life:1});
      for(let i=dust.length-1;i>=0;i--){ const d=dust[i]; d.x+=d.vx*dt; d.y+=d.vy*dt; d.life-=dt*.5;
        if(d.life<=0){ dust.splice(i,1); continue; } pt(d.x,d.y,1,1,1,d.life*.6,0,0,1,0); }
    }
    guests.forEach(g=>pt(g.x,g.y,g.r,g.g,g.b,g.a,g.own?1:0,g.hov||0,0,g.fresh||0));
    for(let i=bursts.length-1;i>=0;i--){
      const b=bursts[i]; b.t+=dt; if(b.t>=1.4){ bursts.splice(i,1); continue; }
      const k=b.t/1.4;
      for(let j=0;j<10;j++){ const ang=j/10*6.283+b.s, r=6+k*34; pt(b.x+Math.cos(ang)*r,b.y+Math.sin(ang)*r,1,.92,.78,(1-k)*.8,0,0,1,0); }
    }
    if(np){
      const pr=P.pt; gl.useProgram(pr.p);
      gl.bindBuffer(gl.ARRAY_BUFFER,ptBuf); gl.bufferData(gl.ARRAY_BUFFER,ptData.subarray(0,np*10),gl.DYNAMIC_DRAW);
      gl.enableVertexAttribArray(pr.a.aP); gl.vertexAttribPointer(pr.a.aP,2,gl.FLOAT,false,40,0);
      gl.enableVertexAttribArray(pr.a.aC); gl.vertexAttribPointer(pr.a.aC,4,gl.FLOAT,false,40,8);
      gl.enableVertexAttribArray(pr.a.aK); gl.vertexAttribPointer(pr.a.aK,4,gl.FLOAT,false,40,24);
      gl.uniform2f(pr.u.uRes,W,H); gl.uniform1f(pr.u.uDpr,dpr); gl.uniform1f(pr.u.uPMax,PMAX); gl.uniform1f(pr.u.uT,T); gl.uniform1f(pr.u.uInk,st.ink);
      gl.drawArrays(gl.POINTS,0,np); off(pr);
    }

    /* если не тянет: уменьшаем буфер фона */
    if(live&&scene.frameMs&&!st.die){
      slowAcc+=scene.frameMs; slowN++;
      if(slowN>=90){ const avg=slowAcc/slowN; slowAcc=0; slowN=0;
        if(avg>26&&bgScale>.26){ bgScale=Math.max(.25,bgScale*.75);
          makeFbo(Math.max(1,Math.round(canvas.width*bgScale)),Math.max(1,Math.round(canvas.height*bgScale))); } }
    }
  }
  canvas.addEventListener('webglcontextlost',e=>{ e.preventDefault(); },false);
  canvas.addEventListener('webglcontextrestored',()=>location.reload(),false);
  resize();
  function breakConsts(guests){
    if(!(tier.fx&&live))return;
    for(let k=0;k<3;k++){ const c=pickConst(null,guests); if(c){ c.broken=1; c.warm=0; consts.push(c); } }
  }
  return {gl:true, resize, frame, wave(){ if(waves.length<3)waves.push({t:0}); }, burst(x,y){ bursts.push({x,y,t:0,s:Math.random()*6}); }, live, st, breakConsts, canvas};
}

/* ---------- запасной вариант без WebGL ---------- */
function create2D(canvas,o,tier){
  let ctx=canvas.getContext('2d');
  if(!ctx){ /* холст уже занят WebGL, который не взлетел: берём чистый */
    const c2=canvas.cloneNode(false); canvas.parentNode.replaceChild(c2,canvas); canvas=c2; ctx=canvas.getContext('2d'); }
  const bg=document.createElement('canvas'), bctx=bg.getContext('2d');
  let W=1,H=1;
  function resize(){
    W=window.innerWidth; H=window.innerHeight;
    canvas.width=bg.width=W; canvas.height=bg.height=H;
    canvas.style.width=W+'px'; canvas.style.height=H+'px';
    bctx.fillStyle='#07050f'; bctx.fillRect(0,0,W,H);
    [[.28,.28,'rgba(55,18,110,',0.07],[.72,.62,'rgba(18,38,100,',0.05],[.52,.1,'rgba(95,28,55,',0.045]].forEach(([rx,ry,c,a])=>{
      const g=bctx.createRadialGradient(rx*W,ry*H,0,rx*W,ry*H,Math.min(W,H)*.48);
      g.addColorStop(0,c+a+')'); g.addColorStop(1,'transparent'); bctx.fillStyle=g; bctx.fillRect(0,0,W,H);
    });
    for(let i=0;i<180;i++){ bctx.fillStyle='rgba(255,255,255,'+(Math.random()*.5+.15).toFixed(2)+')';
      bctx.beginPath(); bctx.arc(Math.random()*W,Math.random()*H,Math.random()*.9+.15,0,6.283); bctx.fill(); }
  }
  const st={die:0,dieT:0,dur:12,ink:0,starA:1};
  function frame(now,scene){
    const ink=st.ink>.5;
    if(ink){ ctx.fillStyle='#fff'; ctx.fillRect(0,0,W,H); }
    else { ctx.drawImage(bg,0,0); if(st.die>0){ ctx.fillStyle='rgba(8,8,12,'+(st.die*.5).toFixed(3)+')'; ctx.fillRect(0,0,W,H); } }
    (scene.guests||[]).forEach(g=>{
      const r=(g.hov?5:1.8), a=Math.min(1,g.a);
      const col=ink?'0,0,0':`${g.r*255|0},${g.g*255|0},${g.b*255|0}`;
      const gr=ctx.createRadialGradient(g.x,g.y,0,g.x,g.y,r*4);
      gr.addColorStop(0,`rgba(${col},${(a*.9).toFixed(3)})`); gr.addColorStop(1,`rgba(${col},0)`);
      ctx.fillStyle=gr; ctx.fillRect(g.x-r*4,g.y-r*4,r*8,r*8);
      if(g.own){ ctx.strokeStyle=ink?'rgba(150,105,30,.7)':'rgba(255,210,122,.6)'; ctx.lineWidth=1; ctx.beginPath(); ctx.arc(g.x,g.y,g.hov?16:9,0,6.283); ctx.stroke(); }
    });
  }
  resize();
  return {gl:false, resize, frame, wave(){}, burst(){}, live:false, st, breakConsts(){}, get canvas(){ return canvas; }};
}

window.AceonSky={create};
})();
