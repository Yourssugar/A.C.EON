/* A.C.EON // CIPHER: фон ЭЛТ и шифромашина на WebGL.
   Один холст на весь экран за страницей. Сначала фон: сканлайны, зерно, полоса помехи; в окне #mscreen
   экран осциллографа с сеткой и сигналом. Потом в том же окне роторы: каждая операция конвейера это ротор
   на общей оси, по ободу символы этой операции. При шифровании роторы по очереди проворачиваются и светятся,
   сигнал слева чистый, справа уходит в шум; при расшифровке наоборот и красным.
   API: CipherGL.ok, setRotors(steps, mode, nameFn, added), spin(i, dir), anim(dir, ms), animEnd(), hover(i), onHover(fn).
   U-1 и меньше движения: кадр рисуется только по событиям, без зерна и тиканья роторов. */
(function(){
'use strict';
const AU=window.AceonUniverse||{id:2,capMs:16};
const TIER=AU.id||2;
const RM=matchMedia('(prefers-reduced-motion: reduce)').matches;
const LIVE=TIER>=2&&!RM;
/* тема: ac цвет свечения, scr фон экрана машины, img есть фон-картинка (тогда вне окна прозрачно) */
/* machine: rotors | stars; paper: экран-миллиметровка; pixel: машина в низком разрешении; rain: url фона для капель; gauges: стрелочные приборы */
let TH={ac:[.91,.69,.29],scr:[.022,.024,.032],img:false,machine:'rotors',paper:false,pixel:false,rain:null,gauges:false};
let running=false, last=performance.now(), lastF=0, tickT=0, decK=0, realK=0, REAL=false;
const cv=document.getElementById('gl'), scr=document.getElementById('mscreen'), view=document.getElementById('mview')||scr, labels=document.getElementById('rlabels');
let gl=null;
try{ gl=cv.getContext('webgl',{antialias:TIER>=3,alpha:true,depth:true,premultipliedAlpha:true,powerPreference:'low-power'}); }catch(e){}
if(!gl||!scr){ window.CipherGL={ok:false}; return; }
document.documentElement.classList.add('gl');

/* ---------- шейдеры ---------- */
function sh(t,src){ const s=gl.createShader(t); gl.shaderSource(s,src); gl.compileShader(s); if(!gl.getShaderParameter(s,gl.COMPILE_STATUS)){ console.warn('[cipher-gl]',gl.getShaderInfoLog(s)); return null; } return s; }
function prog(vs,fs){ const a=sh(gl.VERTEX_SHADER,vs), b=sh(gl.FRAGMENT_SHADER,fs); if(!a||!b)return null; const p=gl.createProgram(); gl.attachShader(p,a); gl.attachShader(p,b); gl.linkProgram(p); return gl.getProgramParameter(p,gl.LINK_STATUS)?p:null; }

const BG=prog('attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}',`precision mediump float;
uniform vec2 R,BTS;uniform float t,nz,dec,wa,sl,rl,th,mk,ps,rn,NN,px;uniform vec4 P,CM;uniform sampler2D W,BT;uniform vec3 ac,scr;
uniform vec4 ND[11];
float h(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}
float n2(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y);}
float segD(vec2 p,vec2 a,vec2 b,out float u){vec2 pa=p-a,ba=b-a;u=clamp(dot(pa,ba)/max(dot(ba,ba),1e-4),0.,1.);return length(pa-ba*u);}
/* дождь на стекле поверх фона-картинки: капли работают как линзы (картинка в них перевёрнута) */
vec3 rainBg(vec2 f){
  float s=max(R.x/BTS.x,R.y/BTS.y);
  vec2 off=vec2(0.); float rim=0., hi=0.;
  for(int L=0;L<2;L++){
    float cs=(L==0?52.:27.)*sl;
    vec2 g=f/cs, id=floor(g), fp=(fract(g)-.5)*cs;
    float rnd=h(id+float(L)*17.3);
    if(rnd>.5){
      vec2 cp=(vec2(h(id+3.1),h(id+7.7))-.5)*cs*.55;
      float life=fract(t*.035+rnd*7.);
      float rad=cs*(.1+.14*h(id+9.2))*smoothstep(0.,.08,life)*smoothstep(1.,.85,life);
      vec2 dv=(fp-cp)*vec2(1.,1.15); float dd=length(dv);
      if(dd<rad){ float k=dd/rad; off-=dv*(1.8+k); rim+=smoothstep(.65,1.,k)*.5; hi+=smoothstep(.35,0.,length(dv/rad+vec2(.35,-.35))); }
    }
  }
  float cw=74.*sl, col=floor(f.x/cw);
  float sp=.035+.05*h(vec2(col,2.)), ph=h(vec2(col,1.));
  float yy=(1.15-fract(t*sp+ph)*1.35)*R.y;
  vec2 c0=vec2((col+.25+.5*h(vec2(col,3.)))*cw+sin(f.y*.015+col*3.)*5.*sl,yy);
  float rad=(6.+5.*h(vec2(col,4.)))*sl;
  vec2 dv=(f-c0)*vec2(1.,.8); float dd=length(dv);
  if(h(vec2(col,5.))>.35&&dd<rad){ float k=dd/rad; off-=dv*(2.2+k); rim+=smoothstep(.6,1.,k)*.6; hi+=smoothstep(.35,0.,length(dv/rad+vec2(.35,-.4))); }
  float tr=step(c0.y,f.y)*smoothstep(1.6*sl,0.,abs(f.x-c0.x-sin(f.y*.015+col*3.)*0.))*exp(-(f.y-c0.y)/(140.*sl))*step(.35,h(vec2(col,5.)));
  off+=vec2(0.,-tr*3.*sl);
  vec2 tuv=((f+off-R*.5)/s+BTS*.5)/BTS;
  vec3 c=texture2D(BT,clamp(tuv,vec2(.001),vec2(.999))).rgb;
  c=c*(1.-rim*.45)+vec3(.9,.95,1.)*hi*.35+tr*.04;
  return c;
}
vec3 scopeC(vec2 f,vec2 q,vec3 tint){
  vec2 g=mod(f-P.xy,24.*sl);
  float grid=min(step(g.x,sl)+step(g.y,sl),1.);
  float axis=step(abs(q.y-.5)*P.w,sl*.6);
  float w=texture2D(W,vec2(q.x,.5)).r*2.-1.;
  float w2=texture2D(W,vec2(q.x+1./P.z,.5)).r*2.-1.;
  float amp=.36*P.w;
  float d=abs((q.y-.5)*P.w-w*amp); float dy=(w2-w)*amp; d/=sqrt(1.+dy*dy); d/=sl;
  vec2 e=min(q,1.-q)*P.zw;
  vec3 c;
  if(ps>.5){
    /* досье: миллиметровка и чернила */
    c=vec3(.9,.85,.75)*(.93+.07*n2(f*.03))-.035*h(f);
    c=mix(c,vec3(.55,.66,.82),.22*grid); c=mix(c,vec3(.72,.24,.24),.4*axis);
    vec3 ink=mix(mix(vec3(.24,.16,.11),vec3(.6,.1,.15),dec),vec3(.12,.4,.26),rl);
    c=mix(c,ink,clamp(exp(-d*d*.35)*.95+exp(-d*.45)*.08,0.,1.)*wa);
    c*=smoothstep(0.,48.*sl,min(e.x,e.y))*.22+.78;
    return c;
  }
  c=scr+tint*(.03*grid+.05*axis);
  if(px<.5)c*=.9+.1*sin(f.y*2.0944/sl);
  c+=tint*(exp(-d*d*.45)*.95+exp(-d*.3)*.13)*wa;
  c*=smoothstep(0.,26.*sl,min(e.x,e.y))*.6+.4;
  if(px<.5)c+=(h(f*.7+t)-.5)*nz*.1;
  return c;
}
void segAdd(vec2 lp,vec2 a,vec2 b,inout float acc,inout vec3 c,vec3 tint){
  float u; float d=segD(lp,a,b,u); float L=length(b-a); float sa=acc+u*L;
  float spc=11.*sl, al=(fract(sa/spc)-.5)*spc; float dd=sqrt(d*d+al*al);
  c+=tint*(exp(-dd*dd/(1.6*sl*sl))*.8+exp(-d*d/(sl*sl*.8))*.12);
  float ad=CM.z>0.?CM.x-sa:sa-CM.x;
  if(CM.y>0.&&ad>-8.*sl&&ad<240.*sl){ c+=mix(tint,vec3(1.),.35)*exp(-d*d/(5.*sl*sl))*exp(-max(ad,0.)/(70.*sl))*CM.y*1.4; c+=vec3(1.,.95,.85)*exp(-(d*d+ad*ad)/(36.*sl*sl))*CM.y*1.6; }
  acc+=L;
}
/* звёздный архив: карта передач, станции-звёзды на маршруте, комета идёт по маршруту */
vec3 starC(vec2 f,vec2 q,vec3 tint){
  vec2 lp=f-P.xy;
  vec3 c=scr+vec3(.03,.04,.09)*n2(lp*.006+vec2(t*.01,0.))*.8;
  vec2 cell=floor(lp/(10.*sl)); float r=h(cell);
  if(r>.9){ vec2 cp=(cell+vec2(h(cell+3.),h(cell+7.)))*10.*sl; float dd=length(lp-cp)/sl; c+=vec3(.95,.9,.78)*exp(-dd*dd*1.2)*(.55+.45*sin(t*1.7+r*60.))*(r-.9)*9.; }
  float rr=length(lp-vec2(P.z*.5,-P.w*1.6))/sl; float ring=abs(fract(rr/80.)-.5)*80.; c+=tint*.07*exp(-ring*ring*.6);
  vec2 np=(q-vec2(.8,.68))*vec2(P.z/P.w,1.); float nr=length(np); float an=atan(np.y,np.x);
  c+=vec3(.3,.4,.85)*exp(-nr*11.)*(.55+.45*sin(an*2.-nr*38.+t*.15))*.55;
  vec2 prev=vec2(0.,P.w*.5); float acc=0.;
  for(int i=0;i<11;i++){
    if(float(i)>=NN)break;
    vec2 b=ND[i].xy*P.zw; segAdd(lp,prev,b,acc,c,tint); prev=b;
  }
  segAdd(lp,prev,vec2(P.z,P.w*.5),acc,c,tint);
  for(int i=0;i<11;i++){
    if(float(i)>=NN)break;
    vec4 nd=ND[i]; vec2 dv=(lp-nd.xy*P.zw)/sl; float rr2=length(dv); float gl2=1.+nd.z*2.5;
    c+=mix(tint,vec3(1.),.6)*exp(-rr2*rr2*.12)*1.3*gl2;
    c+=tint*exp(-pow(rr2-14.,2.)*.5)*(.45+nd.w*.6+nd.z*.6);
    c+=tint*(exp(-abs(dv.x)*.55)*exp(-abs(dv.y)*.07)+exp(-abs(dv.y)*.55)*exp(-abs(dv.x)*.07))*.22*gl2;
  }
  vec2 e=min(q,1.-q)*P.zw; c*=smoothstep(0.,30.*sl,min(e.x,e.y))*.5+.5;
  return c;
}
void main(){
  vec2 f=gl_FragCoord.xy, uv=f/R;
  vec3 tint=mix(mix(ac,vec3(.86,.3,.25),dec),vec3(.36,.8,.58),rl);
  vec2 q=(f-P.xy)/P.zw;
  bool inP=q.x>0.&&q.x<1.&&q.y>0.&&q.y<1.;
  if(!inP){
    if(rn>.5){ gl_FragColor=vec4(rainBg(f),1.); return; }
    /* у тем с картинкой холст вне окна машины прозрачный */
    if(th>.5){ gl_FragColor=vec4(0.); return; }
    vec3 c=mix(vec3(.039,.043,.055),vec3(.08,.088,.115),smoothstep(1.1,0.,length((uv-vec2(.5,1.05))*vec2(1.,1.7))));
    c*=.93+.07*sin(f.y*2.0944/sl);
    float roll=fract(uv.y*.6-t*.035); c*=1.-.035*smoothstep(.0,.02,roll)*smoothstep(.06,.02,roll);
    c+=(h(floor(f/(1.5*sl))+fract(t*7.13)*91.)-.5)*(.022+nz*.08);
    vec2 v=uv-.5; c*=1.-dot(v,v)*.55;
    gl_FragColor=vec4(c,1.); return;
  }
  gl_FragColor=vec4(mk>.5?starC(f,q,tint):scopeC(f,q,tint),1.);
}`);
const RT=prog(`attribute vec3 p;attribute vec3 n;attribute vec2 uv;attribute float k;
uniform mat4 VP;uniform float X,A;uniform vec2 SC;
varying vec3 vN,vW;varying vec2 vUV;varying float vK;
void main(){
  vec3 q=p*vec3(SC.x,SC.y,SC.y); vec3 nn=n;
  float c=cos(A),s=sin(A);
  q=vec3(q.x,c*q.y-s*q.z,s*q.y+c*q.z); nn=vec3(nn.x,c*nn.y-s*nn.z,s*nn.y+c*nn.z);
  q.x+=X; vW=q; vN=nn; vUV=uv; vK=k;
  gl_Position=VP*vec4(q,1.);
}`,`precision mediump float;
uniform sampler2D TX;uniform float row,rows,glow,hl,dec,axle,rl;uniform vec3 eye,ac;
varying vec3 vN,vW;varying vec2 vUV;varying float vK;
void main(){
  vec3 N=normalize(vN), L=normalize(vec3(.35,.85,.55)), V=normalize(eye-vW);
  vec3 tint=mix(mix(ac,vec3(.9,.32,.26),dec),vec3(.38,.82,.6),rl);
  float face=max(0.,dot(N,V));
  vec3 col; float spec=.45;
  if(axle>.5){ col=vec3(.36,.34,.31); }
  else if(vK<.5){
    float v=vUV.y;
    float ridge=step(v,.13)+step(.87,v);
    float kn=.5+.5*sin(vUV.x*6.2832*104.);
    vec3 metal=mix(vec3(.17,.18,.2),vec3(.33,.31,.28),kn);
    float g=texture2D(TX,vec2(vUV.x,(row+clamp((v-.13)/.74,0.,1.))/rows)).r;
    float cell=fract(vUV.x*26.); float sep=1.-.55*smoothstep(.035,0.,min(cell,1.-cell));
    vec3 band=vec3(.065,.07,.085)*sep;
    vec3 ink=mix(vec3(.78,.77,.72),tint,.45+.55*glow);
    band=mix(band,ink*(.35+.9*pow(face,1.5))+tint*glow*.7*face,g);
    col=ridge>.5?metal:band; spec=ridge>.5?.5:.15;
  } else {
    float r=length(vUV);
    vec3 m=vec3(.17,.18,.21)*(.86+.14*sin(r*70.));
    m=mix(m,vec3(.3,.29,.27),step(r,.28));
    float an=atan(vUV.y,vUV.x);
    m*=1.-.45*step(.9,r)*step(.55,fract(an/6.2832*26.));
    m+=tint*.12*step(abs(r-.62),.015);
    col=m;
  }
  float dif=max(0.,dot(N,L)); vec3 H=normalize(L+V);
  vec3 c=col*(.3+.85*dif)+vec3(.95,.9,.8)*pow(max(0.,dot(N,H)),36.)*spec;
  c+=tint*(pow(1.-face,3.)*(.12+glow*.55)+hl*.12+glow*.06);
  gl_FragColor=vec4(c,1.);
}`);
const BL=prog('attribute vec2 p;varying vec2 v;void main(){v=p*.5+.5;gl_Position=vec4(p,0.,1.);}',`precision mediump float;
uniform sampler2D T;varying vec2 v;
void main(){ vec3 c=texture2D(T,v).rgb; c=floor(c*7.+.5)/7.; gl_FragColor=vec4(c,1.); }`);
if(!BG||!RT){ document.documentElement.classList.remove('gl'); window.CipherGL={ok:false}; return; }

/* ---------- геометрия ---------- */
const W=.34, SEG=78;
const geo=(function(){
  const P=[],Nn=[],U=[],K=[],I=[];
  const v=(x,y,z,nx,ny,nz,u,w,k)=>{ P.push(x,y,z); Nn.push(nx,ny,nz); U.push(u,w); K.push(k); return K.length-1; };
  for(let i=0;i<=SEG;i++){ const a=i/SEG*Math.PI*2, s=Math.sin(a), c=Math.cos(a); v(-W,s,c,0,s,c,i/SEG,0,0); v(W,s,c,0,s,c,i/SEG,1,0); }
  for(let i=0;i<SEG;i++){ const a=i*2; I.push(a,a+2,a+1,a+1,a+2,a+3); }
  [-1,1].forEach(sd=>{ const c0=v(sd*W,0,0,sd,0,0,0,0,1); const b=K.length;
    for(let i=0;i<=SEG;i++){ const a=i/SEG*Math.PI*2, s=Math.sin(a), c=Math.cos(a); v(sd*W,s,c,sd,0,0,s,c,1); }
    for(let i=0;i<SEG;i++)sd<0?I.push(c0,b+i+1,b+i):I.push(c0,b+i,b+i+1); });
  const mk=(arr,T)=>{ const b=gl.createBuffer(); gl.bindBuffer(T,b); gl.bufferData(T,arr,gl.STATIC_DRAW); return b; };
  return {p:mk(new Float32Array(P),gl.ARRAY_BUFFER),n:mk(new Float32Array(Nn),gl.ARRAY_BUFFER),uv:mk(new Float32Array(U),gl.ARRAY_BUFFER),k:mk(new Float32Array(K),gl.ARRAY_BUFFER),
    i:mk(new Uint16Array(I),gl.ELEMENT_ARRAY_BUFFER),count:I.length};
})();
const quad=gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER,quad); gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),gl.STATIC_DRAW);
const UB={}, UR={};
['R','t','nz','dec','wa','sl','P','W','rl','th','ac','scr','mk','ps','rn','NN','CM','BT','BTS','ND','px'].forEach(n=>UB[n]=gl.getUniformLocation(BG,n));
['VP','X','A','SC','TX','row','rows','glow','hl','dec','axle','eye','rl','ac'].forEach(n=>UR[n]=gl.getUniformLocation(RT,n));
const AB={p:gl.getAttribLocation(BG,'p')};
const UBL=BL?{T:gl.getUniformLocation(BL,'T'),p:gl.getAttribLocation(BL,'p')}:null;
const quad2=gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER,quad2); gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),gl.STATIC_DRAW);
/* текстура фона для дождя */
let bgTex=null, bgSize=[1,1], bgUrl='';
function loadBg(url){
  if(!url){ bgUrl=''; return; } if(url===bgUrl)return; bgUrl=url;
  const im=new Image(); im.onload=()=>{ if(bgUrl!==url)return;
    if(!bgTex)bgTex=gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D,bgTex);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true); gl.texImage2D(gl.TEXTURE_2D,0,gl.RGB,gl.RGB,gl.UNSIGNED_BYTE,im); gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);
    [gl.TEXTURE_MIN_FILTER,gl.TEXTURE_MAG_FILTER].forEach(k=>gl.texParameteri(gl.TEXTURE_2D,k,gl.LINEAR));
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
    bgSize=[im.naturalWidth,im.naturalHeight]; document.documentElement.classList.add('gl-rain'); kick(); };
  im.src=url;
}
/* кадровый буфер для пиксельной темы */
let fbo=null, fbTex=null, fbDep=null, fbW=0, fbH=0;
function ensureFbo(w,h){
  if(fbo&&fbW===w&&fbH===h)return;
  if(!fbo){ fbo=gl.createFramebuffer(); fbTex=gl.createTexture(); fbDep=gl.createRenderbuffer(); }
  fbW=w; fbH=h;
  gl.bindTexture(gl.TEXTURE_2D,fbTex); gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,w,h,0,gl.RGBA,gl.UNSIGNED_BYTE,null);
  [gl.TEXTURE_MIN_FILTER,gl.TEXTURE_MAG_FILTER].forEach(k=>gl.texParameteri(gl.TEXTURE_2D,k,gl.NEAREST));
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
  gl.bindRenderbuffer(gl.RENDERBUFFER,fbDep); gl.renderbufferStorage(gl.RENDERBUFFER,gl.DEPTH_COMPONENT16,w,h);
  gl.bindFramebuffer(gl.FRAMEBUFFER,fbo);
  gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,fbTex,0);
  gl.framebufferRenderbuffer(gl.FRAMEBUFFER,gl.DEPTH_ATTACHMENT,gl.RENDERBUFFER,fbDep);
  gl.bindFramebuffer(gl.FRAMEBUFFER,null);
}
/* приборы радиорубки и надписи дождя */
const gIn=document.querySelector('#gIn .needle'), gOut=document.querySelector('#gOut .needle'), hudS=document.getElementById('hudS'), anom=document.getElementById('mAnom');
let lvIn=0, lvOut=0, angIn=-34, angOut=-34, hudT=0;
const AR={p:gl.getAttribLocation(RT,'p'),n:gl.getAttribLocation(RT,'n'),uv:gl.getAttribLocation(RT,'uv'),k:gl.getAttribLocation(RT,'k')};

/* ---------- текстура сигнала (256 точек) ---------- */
const WN=256, wave=new Uint8Array(WN);
const wtex=gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D,wtex);
gl.texImage2D(gl.TEXTURE_2D,0,gl.LUMINANCE,WN,1,0,gl.LUMINANCE,gl.UNSIGNED_BYTE,wave);
[gl.TEXTURE_MIN_FILTER,gl.TEXTURE_MAG_FILTER].forEach(k=>gl.texParameteri(gl.TEXTURE_2D,k,gl.LINEAR));
gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);

/* ---------- атлас символов на ободах ---------- */
const CW=40, RH=80, CELLS=26;
const atlas=document.createElement('canvas'); atlas.width=CW*CELLS; atlas.height=RH;
const actx=atlas.getContext('2d');
const atex=gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D,atex);
[gl.TEXTURE_MIN_FILTER,gl.TEXTURE_MAG_FILTER].forEach(k=>gl.texParameteri(gl.TEXTURE_2D,k,gl.LINEAR));
gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
const rng=seed=>()=>{ seed=(seed*1103515245+12345)>>>0; return seed/4294967296; };
const range=(a,b)=>{ let s=''; for(let c=a;c<=b;c++)s+=String.fromCharCode(c); return s; };
const LAT=range(65,90), CYR='АБВГДЕЖЗИКЛМНОПРСТУФХЦЧШЩЭЮЯ', HEX='0123456789abcdef';
function glyphSet(id,seed){
  const r=rng(seed*7919+id.length*131+id.charCodeAt(0));
  const pick=(src,n)=>{ const a=Array.from(src), o=[]; for(let i=0;i<n;i++)o.push(a[(r()*a.length)|0]); return o; };
  const hx=n=>{ let s=''; for(let i=0;i<n;i++)s+=HEX[(r()*16)|0]; return s; };
  const many=f=>{ const o=[]; for(let i=0;i<CELLS;i++)o.push(f(i)); return o; };
  switch(id){
    case 'b64': return pick(LAT+LAT.toLowerCase()+'0123456789+/=',CELLS);
    case 'base32': return pick(LAT+'234567',CELLS);
    case 'base58': return pick('123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz',CELLS);
    case 'base85': return pick(range(33,117),CELLS);
    case 'hex': case 'playfair': return many(i=>HEX[i%16]);
    case 'bin': return many(i=>i%2?'1':'0');
    case 'url': return many(()=>'%'+hx(2).toUpperCase());
    case 'braille': return many(()=>String.fromCharCode(0x2800+((r()*255)|0)+1));
    case 'morse': { const m=['.-','-...','-.-.','-..','.','..-.','--.','....','..','.---','-.-','.-..','--','-.','---','.--.','--.-','.-.','...','-','..-','...-','.--','-..-','-.--','--..']; return many(i=>m[i]); }
    case 'revall': return Array.from(LAT).reverse();
    case 'revword': case 'wordorder': return many(i=>LAT[(i*7)%26]);
    case 'swap23': case 'swapfl': case 'atbash': return many(i=>CYR[i%CYR.length]);
    case 'rail': return pick('ZNVWMX/\\',CELLS);
    case 'xor': case 'vernam': case 'aes': return many(()=>hx(2).toUpperCase());
    case 'hill': return many(()=>String((r()*256)|0));
    case 'rsa': return many(()=>hx(3).toUpperCase());
    case 'rot47': return pick(range(33,126),CELLS);
    case 'caseswap': return many(i=>i%2?LAT[i]:LAT[i].toLowerCase());
    default: return many(i=>LAT[i]);
  }
}
let atlasKey='';
function buildAtlas(list){
  const key=list.map(r=>r.id).join(',');
  if(key===atlasKey)return; atlasKey=key;
  const rows=Math.max(1,list.length); atlas.height=RH*rows;
  actx.fillStyle='#000'; actx.fillRect(0,0,atlas.width,atlas.height);
  actx.fillStyle='#fff'; actx.textAlign='center'; actx.textBaseline='middle';
  list.forEach((rt,ri)=>{
    const gs=glyphSet(rt.id,ri+1);
    for(let c=0;c<CELLS;c++){
      const g=gs[c], fs=g.length>=3?17:g.length===2?22:30;
      actx.font='700 '+fs+'px ui-monospace,"Cascadia Mono",Consolas,"Segoe UI Symbol","Noto Sans Symbols 2",monospace';
      actx.save(); actx.translate(c*CW+CW/2,ri*RH+RH/2); actx.rotate(Math.PI/2); actx.fillText(g,0,1); actx.restore();
    }
  });
  gl.bindTexture(gl.TEXTURE_2D,atex);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);
  gl.texImage2D(gl.TEXTURE_2D,0,gl.LUMINANCE,gl.LUMINANCE,gl.UNSIGNED_BYTE,atlas);
}

/* ---------- состояние роторов ---------- */
const STEP=Math.PI*2/CELLS, D=.95;
let rotors=[], dying=[], mode='enc', hlIdx=-1, nameFn=id=>id, hoverCb=null;
const byStep=new WeakMap();
function setRotors(steps,m,nf,added){
  mode=m; if(nf)nameFn=nf;
  const next=[];
  steps.forEach((st,i)=>{
    let r=byStep.get(st);
    if(!r){ r={id:st.id,ang:(Math.random()*CELLS|0)*STEP,glow:0,x:null,s:0}; r.tang=r.ang; byStep.set(st,r); }
    r.id=st.id; next.push(r);
  });
  rotors.forEach(r=>{ if(next.indexOf(r)<0){ r.dead=true; dying.push(r); } });
  rotors=next;
  rotors.forEach((r,i)=>{ r.tx=(i-(rotors.length-1)/2)*D; r.dead=false; if(r.x===null){ r.x=r.tx+(added?3:0); r.s=added?0:.01; if(!LIVE){ r.x=r.tx; r.s=1; } } });
  buildAtlas(rotors);
  buildLabels();
  kick();
}
function spin(i,dir){
  const r=rotors[i]; if(!r)return;
  r.tang+=dir*(3+(Math.random()*6|0))*STEP; r.glow=1; burst=Math.min(1,burst+.45);
  const l=labels.children[i]; if(l){ l.classList.add('hot'); setTimeout(()=>l.classList.remove('hot'),700); }
  if(!LIVE){ r.ang=r.tang; }
  kick();
}
let animS=null, post=null, burst=0;
function anim(dir,ms){ animS={dir,t0:performance.now(),dur:ms}; post=null; kick(); }
function animEnd(){ if(animS){ post={dir:animS.dir,t0:performance.now()}; animS=null; } kick(); }
function hover(i){ hlIdx=i; kick(); }

/* подписи под роторами */
function buildLabels(){
  labels.innerHTML='';
  rotors.forEach((r,i)=>{ const s=document.createElement('span'); s.innerHTML='<b>'+String(i+1).padStart(2,'0')+'</b><i></i>'; labels.appendChild(s); });
  nameLabels();
}
function nameLabels(){
  const wide=lastPitch>78;
  [...labels.children].forEach((s,i)=>{ const r=rotors[i]; if(!r)return; let n=nameFn(r.id); if(n.length>11)n=n.slice(0,10)+'.'; s.lastChild.textContent=wide?n:''; s.title=nameFn(r.id); });
}
let lastPitch=0;

/* ---------- камера ---------- */
function persp(f,a,n,fr){ const t=1/Math.tan(f/2); return [t/a,0,0,0, 0,t,0,0, 0,0,(fr+n)/(n-fr),-1, 0,0,2*fr*n/(n-fr),0]; }
function look(e,c){ const z=norm(sub(e,c)), x=norm(cross([0,1,0],z)), y=cross(z,x); return [x[0],y[0],z[0],0, x[1],y[1],z[1],0, x[2],y[2],z[2],0, -dot(x,e),-dot(y,e),-dot(z,e),1]; }
function mul(a,b){ const o=new Array(16); for(let i=0;i<4;i++)for(let j=0;j<4;j++){ let s=0; for(let k=0;k<4;k++)s+=a[k*4+j]*b[i*4+k]; o[i*4+j]=s; } return o; }
const sub=(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]], dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const norm=a=>{ const l=Math.hypot(a[0],a[1],a[2])||1; return [a[0]/l,a[1]/l,a[2]/l]; };
function project(VP,x,y,z,w,h){ const v=[x,y,z,1], o=[0,0,0,0]; for(let j=0;j<4;j++)for(let k=0;k<4;k++)o[j]+=VP[k*4+j]*v[k]; return [(o[0]/o[3]*.5+.5)*w,(1-(o[1]/o[3]*.5+.5))*h]; }

/* ---------- размеры ---------- */
let dpr=1, CWpx=0, CHpx=0;
function resize(){
  dpr=Math.min(window.devicePixelRatio||1,TIER>=3?2:1.25);
  CWpx=Math.round(innerWidth*dpr); CHpx=Math.round(innerHeight*dpr);
  if(cv.width!==CWpx||cv.height!==CHpx){ cv.width=CWpx; cv.height=CHpx; }
  kick();
}
addEventListener('resize',resize); resize();
addEventListener('scroll',kick,{passive:true});

/* ---------- сигнал ---------- */
function hash(i,t){ const x=Math.sin(i*127.1+t*311.7)*43758.5453; return x-Math.floor(x); }
function fillWave(now,xr0,xr1){
  const t=now/1000;
  let P=-1, dir=mode, pk=0;
  if(animS){ P=Math.min(1,(now-animS.t0)/animS.dur); dir=animS.dir; }
  else if(post){ pk=Math.max(0,1-(now-post.t0)/7000); dir=post.dir; if(pk<=0)post=null; }
  const nt=Math.floor(t*24);
  let si=0,ni=0,so=0,no=0;
  for(let i=0;i<WN;i++){
    const x=i/(WN-1);
    const clean=Math.sin(x*34-t*3.2)*.7+Math.sin(x*11-t*1.4)*.3;
    const noise=(hash(i,nt)*2-1)*.85+Math.sin(x*90+t*9)*.15;
    let v;
    const inSide=x<xr0, outSide=x>xr1;
    if(P>=0){
      const front=(x-xr1)/Math.max(.05,1-xr1);
      if(dir==='enc') v=inSide?clean*.62:outSide?(front<P*1.25?noise*.8:0):0;
      else v=inSide?noise*.75:outSide?(front<P*1.25?clean*.62:0):0;
    } else if(pk>0){
      const a=.25+.35*pk;
      if(dir==='enc') v=inSide?clean*a:outSide?noise*a:0;
      else v=inSide?noise*a*.8:outSide?clean*a:0;
    } else v=(inSide||outSide)?clean*.2:0;
    wave[i]=Math.max(0,Math.min(255,Math.round(128+v*127)));
    if(inSide){ si+=Math.abs(v); ni++; } else if(outSide){ so+=Math.abs(v); no++; }
  }
  lvIn=ni?si/ni:0; lvOut=no?so/no:0;
  gl.bindTexture(gl.TEXTURE_2D,wtex);
  gl.texSubImage2D(gl.TEXTURE_2D,0,0,0,WN,1,gl.LUMINANCE,gl.UNSIGNED_BYTE,wave);
  return P>=0||pk>0;
}

/* ---------- кадр ---------- */
function kick(){ if(!running){ running=true; last=performance.now(); requestAnimationFrame(frame); } }
/* узлы карты звёзд: позиции в долях окна (x вправо, y вверх) */
function starNodes(n){
  const out=[];
  for(let i=0;i<n;i++){ const x=n===1?.5:.1+.8*i/(n-1); const y=n===1?.55:.5+.22*Math.sin(i*1.9+.7); out.push([x,y]); }
  return out;
}
const NDbuf=new Float32Array(44);
let cometK=0;
function drawBG(R0,R1,Pv,now,vis,sl,pxm){
  gl.useProgram(BG); gl.uniform1f(UB.px,pxm?1:0);
  gl.bindBuffer(gl.ARRAY_BUFFER,quad); gl.enableVertexAttribArray(AB.p); gl.vertexAttribPointer(AB.p,2,gl.FLOAT,false,0,0);
  gl.uniform2f(UB.R,R0,R1); gl.uniform1f(UB.t,LIVE?now/1000:0); gl.uniform1f(UB.nz,Math.min(1,burst+(animS?.35:0)));
  gl.uniform1f(UB.dec,decK); gl.uniform1f(UB.rl,realK); gl.uniform1f(UB.th,TH.img?1:0);
  gl.uniform3f(UB.ac,TH.ac[0],TH.ac[1],TH.ac[2]); gl.uniform3f(UB.scr,TH.scr[0],TH.scr[1],TH.scr[2]);
  gl.uniform1f(UB.wa,vis?1:0); gl.uniform1f(UB.sl,sl); gl.uniform4f(UB.P,Pv[0],Pv[1],Pv[2],Pv[3]);
  gl.uniform1f(UB.mk,TH.machine==='stars'?1:0); gl.uniform1f(UB.ps,TH.paper?1:0);
  const rainOn=!!(TH.rain&&bgTex&&bgUrl&&LIVE); gl.uniform1f(UB.rn,rainOn?1:0);
  gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D,wtex); gl.uniform1i(UB.W,0);
  gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D,bgTex||wtex); gl.uniform1i(UB.BT,1); gl.uniform2f(UB.BTS,bgSize[0],bgSize[1]);
  gl.activeTexture(gl.TEXTURE0);
  gl.drawArrays(gl.TRIANGLES,0,3);
  gl.disableVertexAttribArray(AB.p);
}
function drawRotors(vx,vy,vw,vh,VP,eye,all,N){
  gl.viewport(vx,vy,vw,vh);
  gl.clear(gl.DEPTH_BUFFER_BIT); gl.enable(gl.DEPTH_TEST);
  gl.useProgram(RT);
  const bind=(loc,buf,n)=>{ gl.bindBuffer(gl.ARRAY_BUFFER,buf); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc,n,gl.FLOAT,false,0,0); };
  bind(AR.p,geo.p,3); bind(AR.n,geo.n,3); bind(AR.uv,geo.uv,2); bind(AR.k,geo.k,1);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,geo.i);
  gl.uniformMatrix4fv(UR.VP,false,new Float32Array(VP)); gl.uniform3f(UR.eye,eye[0],eye[1],eye[2]);
  gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D,atex); gl.uniform1i(UR.TX,0);
  gl.uniform1f(UR.rows,Math.max(1,rotors.length)); gl.uniform1f(UR.dec,decK); gl.uniform1f(UR.rl,realK); gl.uniform3f(UR.ac,TH.ac[0],TH.ac[1],TH.ac[2]);
  const span=(N-1)*D/2+W+.5;
  gl.uniform1f(UR.axle,1); gl.uniform1f(UR.X,0); gl.uniform1f(UR.A,0); gl.uniform2f(UR.SC,span/W,.11); gl.uniform1f(UR.glow,0); gl.uniform1f(UR.hl,0); gl.uniform1f(UR.row,0);
  gl.drawElements(gl.TRIANGLES,geo.count,gl.UNSIGNED_SHORT,0);
  gl.uniform1f(UR.axle,0);
  all.forEach(r=>{
    const ri=rotors.indexOf(r);
    gl.uniform1f(UR.X,r.x); gl.uniform1f(UR.A,r.ang); gl.uniform2f(UR.SC,r.s,r.s);
    gl.uniform1f(UR.row,Math.max(0,ri)); gl.uniform1f(UR.glow,r.glow); gl.uniform1f(UR.hl,ri===hlIdx?1:0);
    gl.drawElements(gl.TRIANGLES,geo.count,gl.UNSIGNED_SHORT,0);
  });
  [AR.p,AR.n,AR.uv,AR.k].forEach(l=>gl.disableVertexAttribArray(l));
  gl.disable(gl.DEPTH_TEST);
}
function frame(now){
  const busyAnim=!!animS||burst>.01;
  const rainLive=!!(TH.rain&&bgTex&&LIVE);
  const cap=busyAnim?Math.max(14,AU.capMs||16):(LIVE?(rainLive?33:50):0);
  if(cap&&now-lastF<cap-2){ requestAnimationFrame(frame); return; }
  const dt=Math.min(.1,(now-last)/1000); last=now; lastF=now;
  if(document.hidden){ running=false; return; }
  let moving=false;
  const k=1-Math.exp(-dt*(RM?60:7));
  [...rotors,...dying].forEach(r=>{
    r.x+=(r.tx-r.x)*k; r.s+=((r.dead?0:1)-r.s)*k; r.ang+=(r.tang-r.ang)*(1-Math.exp(-dt*9)); r.glow*=Math.exp(-dt*1.6);
    if(Math.abs(r.tx-r.x)>.002||Math.abs((r.dead?0:1)-r.s)>.004||Math.abs(r.tang-r.ang)>.002||r.glow>.02)moving=true;
  });
  dying=dying.filter(r=>r.s>.02);
  burst*=Math.exp(-dt*2.5);
  decK+=((mode==='dec'&&!REAL?1:0)-decK)*Math.min(1,dt*6);
  realK+=((REAL?1:0)-realK)*Math.min(1,dt*5);
  if(LIVE&&!animS&&TH.machine!=='stars'){ tickT-=dt; if(tickT<=0){ tickT=2+Math.random()*4; const r=rotors[(Math.random()*rotors.length)|0]; if(r){ r.tang+=(Math.random()<.5?1:-1)*STEP; } } }

  /* окно машины в пикселях холста (y снизу) */
  const rc=view.getBoundingClientRect();
  const P=[rc.left*dpr,(innerHeight-rc.bottom)*dpr,rc.width*dpr,rc.height*dpr];
  const vis=rc.bottom>0&&rc.top<innerHeight&&rc.width>0;
  const stars=TH.machine==='stars';

  /* камера и границы роторов для сигнала */
  const N=Math.max(1,rotors.length), aspect=Math.max(.5,rc.width/Math.max(1,rc.height)), fov=.62, th=Math.tan(fov/2);
  const hx=(N-1)*D/2+.55+1.7, hv=1.45;
  const dist=Math.max(hx/(th*aspect),hv/th);
  const eye=[0,dist*.3,dist];
  const VP=mul(persp(fov,aspect,.1,100),look(eye,[0,-.08,0]));
  let xr0=.5, xr1=.5;
  const all=[...rotors,...dying].filter(r=>r.s>.05);
  if(!stars&&all.length){ let a=1e9,b=-1e9; all.forEach(r=>{ const l=project(VP,r.x-W*r.s,0,1,rc.width,rc.height)[0], q=project(VP,r.x+W*r.s,0,1,rc.width,rc.height)[0]; a=Math.min(a,l); b=Math.max(b,q); }); xr0=Math.max(0,a/rc.width-.01); xr1=Math.min(1,b/rc.width+.01); }
  const wActive=fillWave(now,xr0,xr1);

  /* карта звёзд: узлы и комета */
  if(stars){
    const n=Math.min(11,rotors.length), nd=starNodes(n);
    NDbuf.fill(0);
    for(let i=0;i<n;i++){ const r=rotors[i]; NDbuf[i*4]=nd[i][0]; NDbuf[i*4+1]=nd[i][1]; NDbuf[i*4+2]=Math.min(1,r.glow)*r.s; NDbuf[i*4+3]=i===hlIdx?1:0; }
    const pts=[[0,.5]].concat(nd).concat([[1,.5]]).map(p=>[p[0]*P[2],p[1]*P[3]]);
    let Lt=0; for(let i=1;i<pts.length;i++)Lt+=Math.hypot(pts[i][0]-pts[i-1][0],pts[i][1]-pts[i-1][1]);
    let cs=0, ca=0, cd=1;
    if(animS){ const p=Math.min(1,(now-animS.t0)/animS.dur); cd=animS.dir==='enc'?1:-1; cs=(cd>0?p:1-p)*Lt*1.1; ca=1; cometK=1; }
    else { cometK*=Math.exp(-dt*2); ca=cometK; cs=-1e4; }
    gl.useProgram(BG); gl.uniform4fv(UB.ND,NDbuf); gl.uniform1f(UB.NN,n); gl.uniform4f(UB.CM,cs,ca>.02?ca:0,cd,0);
    if(cometK>.02)moving=true;
    /* подписи над станциями */
    const kids=labels.children;
    for(let i=0;i<kids.length;i++){ const s=kids[i]; if(i>=n){ s.style.opacity='0'; continue; } s.style.left=(nd[i][0]*rc.width).toFixed(1)+'px'; s.style.top=((1-nd[i][1])*rc.height+18).toFixed(1)+'px'; s.style.opacity=rotors[i].s.toFixed(2); }
    const pitch=n>1?(nd[1][0]-nd[0][0])*rc.width:999; if((pitch>78)!==(lastPitch>78)){ lastPitch=pitch; nameLabels(); } lastPitch=pitch;
  } else { gl.useProgram(BG); gl.uniform1f(UB.NN,0); }

  /* фон и окно машины */
  gl.viewport(0,0,CWpx,CHpx); gl.disable(gl.DEPTH_TEST);
  drawBG(CWpx,CHpx,P,now,vis,dpr);

  if(vis&&TH.pixel&&BL){
    /* пиксельная тема: окно машины в низком разрешении, потом растянуть без сглаживания */
    const PX=Math.max(2,Math.round(3*dpr)), w=Math.max(8,Math.round(P[2]/PX)), h=Math.max(8,Math.round(P[3]/PX));
    ensureFbo(w,h);
    gl.bindFramebuffer(gl.FRAMEBUFFER,fbo); gl.viewport(0,0,w,h);
    drawBG(w,h,[0,0,w,h],now,vis,1,true);
    if(!stars&&all.length)drawRotors(0,0,w,h,VP,eye,all,N);
    gl.bindFramebuffer(gl.FRAMEBUFFER,null);
    gl.enable(gl.SCISSOR_TEST); gl.scissor(P[0],P[1],P[2],P[3]); gl.viewport(P[0],P[1],P[2],P[3]);
    gl.useProgram(BL); gl.bindBuffer(gl.ARRAY_BUFFER,quad2); gl.enableVertexAttribArray(UBL.p); gl.vertexAttribPointer(UBL.p,2,gl.FLOAT,false,0,0);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D,fbTex); gl.uniform1i(UBL.T,0);
    gl.drawArrays(gl.TRIANGLE_STRIP,0,4); gl.disableVertexAttribArray(UBL.p);
    gl.disable(gl.SCISSOR_TEST);
  } else if(vis&&!stars&&all.length){
    gl.enable(gl.SCISSOR_TEST); gl.scissor(P[0],P[1],P[2],P[3]);
    drawRotors(P[0],P[1],P[2],P[3],VP,eye,all,N);
    gl.disable(gl.SCISSOR_TEST);
  }
  if(vis&&!stars&&all.length){
    const kids=labels.children;
    rotors.forEach((r,i)=>{ const s=kids[i]; if(!s)return; const p=project(VP,r.x,-1.25,0,rc.width,rc.height); s.style.left=p[0].toFixed(1)+'px'; s.style.top=''; s.style.opacity=r.s.toFixed(2); });
    if(rotors.length>1){ const a=project(VP,rotors[0].tx,0,0,rc.width,rc.height)[0], b=project(VP,rotors[1].tx,0,0,rc.width,rc.height)[0]; const pitch=b-a; if((pitch>78)!==(lastPitch>78)){ lastPitch=pitch; nameLabels(); } lastPitch=pitch; }
    else if(lastPitch<=78){ lastPitch=999; nameLabels(); }
  }

  /* стрелки приборов: вход и выход */
  if(TH.gauges&&gIn&&gOut){
    const tIn=-34+68*Math.min(1,lvIn*1.5), tOut=-34+68*Math.min(1,lvOut*1.5);
    angIn+=(tIn-angIn)*Math.min(1,dt*(RM?60:6)); angOut+=(tOut-angOut)*Math.min(1,dt*(RM?60:6));
    gIn.style.transform='rotate('+angIn.toFixed(2)+'deg)'; gOut.style.transform='rotate('+angOut.toFixed(2)+'deg)';
    if(Math.abs(tIn-angIn)>.2||Math.abs(tOut-angOut)>.2)moving=true;
  }
  /* дождь: уровень сигнал/шум и аномалия на выходе после шифровки */
  if(TH.rain&&hudS){
    hudT-=dt; if(hudT<=0){ hudT=.35; const nzv=animS?.5+Math.random()*.5:(post?.3*Math.random():0); hudS.textContent=((12-nzv*16)>=0?'+':'')+(12-nzv*16).toFixed(0)+' dB'; }
    if(anom){ const show=!!post&&post.dir==='enc'; anom.style.opacity=show?Math.max(0,1-(now-post.t0)/7000).toFixed(2):'0'; if(show&&!anom.dataset.x){ anom.dataset.x=String(xr1+(1-xr1)*(.45+Math.random()*.35)); } if(!show)anom.dataset.x=''; if(anom.dataset.x){ anom.style.left=(+anom.dataset.x*100).toFixed(2)+'%'; anom.classList.toggle('flip',+anom.dataset.x>.7); } }
  }
  const keep=LIVE||moving||busyAnim||wActive||Math.abs(decK-(mode==='dec'&&!REAL?1:0))>.01||Math.abs(realK-(REAL?1:0))>.01;
  if(keep)requestAnimationFrame(frame); else running=false;
}

/* наведение на ротор: подсветить шаг конвейера */
scr.addEventListener('pointermove',e=>{
  if(!hoverCb||!rotors.length)return;
  const rc=view.getBoundingClientRect(), x=e.clientX-rc.left; let best=-1, bd=1e9;
  [...labels.children].forEach((s,i)=>{ const d=Math.abs(parseFloat(s.style.left)-x); if(d<bd){ bd=d; best=i; } });
  const lim=Math.max(24,lastPitch/2);
  const i=bd<lim?best:-1; if(i!==hlIdx){ hlIdx=i; hoverCb(i); kick(); }
});
scr.addEventListener('pointerleave',()=>{ if(hlIdx>=0){ hlIdx=-1; if(hoverCb)hoverCb(-1); kick(); } });
document.addEventListener('visibilitychange',()=>{ if(!document.hidden)kick(); });

window.CipherGL={ok:true,setRotors,spin,anim,animEnd,hover,onHover:fn=>{ hoverCb=fn; },setReal:on=>{ REAL=!!on; kick(); },setTheme:t=>{ TH={ac:t.ac||TH.ac,scr:t.scr||TH.scr,img:!!t.img,machine:t.machine||'rotors',paper:!!t.paper,pixel:!!t.pixel,rain:t.rain||null,gauges:!!t.gauges};
  document.documentElement.classList.remove('gl-rain'); if(TH.rain&&LIVE){ const u=TH.rain[innerWidth/innerHeight<1?1:0]; if(u===bgUrl&&bgTex)document.documentElement.classList.add('gl-rain'); else { bgUrl=''; loadBg(u); } } else bgUrl='';
  lastPitch=0; buildLabels(); kick(); }};
kick();
})();
