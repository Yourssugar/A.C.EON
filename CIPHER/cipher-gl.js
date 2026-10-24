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
let running=false, last=performance.now(), lastF=0, tickT=0, decK=0, realK=0, REAL=false;
const cv=document.getElementById('gl'), scr=document.getElementById('mscreen'), labels=document.getElementById('rlabels');
let gl=null;
try{ gl=cv.getContext('webgl',{antialias:TIER>=3,alpha:false,depth:true,premultipliedAlpha:false,powerPreference:'low-power'}); }catch(e){}
if(!gl||!scr){ window.CipherGL={ok:false}; return; }
document.documentElement.classList.add('gl');

/* ---------- шейдеры ---------- */
function sh(t,src){ const s=gl.createShader(t); gl.shaderSource(s,src); gl.compileShader(s); if(!gl.getShaderParameter(s,gl.COMPILE_STATUS)){ console.warn('[cipher-gl]',gl.getShaderInfoLog(s)); return null; } return s; }
function prog(vs,fs){ const a=sh(gl.VERTEX_SHADER,vs), b=sh(gl.FRAGMENT_SHADER,fs); if(!a||!b)return null; const p=gl.createProgram(); gl.attachShader(p,a); gl.attachShader(p,b); gl.linkProgram(p); return gl.getProgramParameter(p,gl.LINK_STATUS)?p:null; }

const BG=prog('attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}',`precision mediump float;
uniform vec2 R;uniform float t,nz,dec,wa,sl,rl;uniform vec4 P;uniform sampler2D W;
float h(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}
void main(){
  vec2 f=gl_FragCoord.xy, uv=f/R;
  vec3 c=mix(vec3(.039,.043,.055),vec3(.08,.088,.115),smoothstep(1.1,0.,length((uv-vec2(.5,1.05))*vec2(1.,1.7))));
  c*=.93+.07*sin(f.y*2.0944/sl);
  float roll=fract(uv.y*.6-t*.035); c*=1.-.035*smoothstep(.0,.02,roll)*smoothstep(.06,.02,roll);
  c+=(h(floor(f/(1.5*sl))+fract(t*7.13)*91.)-.5)*(.022+nz*.08);
  vec3 tint=mix(mix(vec3(.91,.69,.29),vec3(.86,.3,.25),dec),vec3(.36,.8,.58),rl);
  vec2 q=(f-P.xy)/P.zw;
  if(q.x>0.&&q.x<1.&&q.y>0.&&q.y<1.){
    vec2 g=mod(f-P.xy,24.*sl);
    float grid=step(g.x,sl)+step(g.y,sl);
    float axis=step(abs(q.y-.5)*P.w,sl*.6);
    c=vec3(.022,.024,.032)+tint*(.03*min(grid,1.)+.05*axis);
    c*=.9+.1*sin(f.y*2.0944/sl);
    float w=texture2D(W,vec2(q.x,.5)).r*2.-1.;
    float w2=texture2D(W,vec2(q.x+1./P.z,.5)).r*2.-1.;
    float amp=.36*P.w;
    float d=abs((q.y-.5)*P.w-w*amp);
    float dy=(w2-w)*amp; d/=sqrt(1.+dy*dy);
    d/=sl;
    c+=tint*(exp(-d*d*.45)*.95+exp(-d*.3)*.13)*wa;
    vec2 e=min(q,1.-q)*P.zw;
    c*=smoothstep(0.,26.*sl,min(e.x,e.y))*.6+.4;
    c+=(h(f*.7+t)-.5)*nz*.1;
  }
  vec2 v=uv-.5; c*=1.-dot(v,v)*.55;
  gl_FragColor=vec4(c,1.);
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
uniform sampler2D TX;uniform float row,rows,glow,hl,dec,axle,rl;uniform vec3 eye;
varying vec3 vN,vW;varying vec2 vUV;varying float vK;
void main(){
  vec3 N=normalize(vN), L=normalize(vec3(.35,.85,.55)), V=normalize(eye-vW);
  vec3 tint=mix(mix(vec3(.93,.7,.3),vec3(.9,.32,.26),dec),vec3(.38,.82,.6),rl);
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
['R','t','nz','dec','wa','sl','P','W','rl'].forEach(n=>UB[n]=gl.getUniformLocation(BG,n));
['VP','X','A','SC','TX','row','rows','glow','hl','dec','axle','eye','rl'].forEach(n=>UR[n]=gl.getUniformLocation(RT,n));
const AB={p:gl.getAttribLocation(BG,'p')};
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
  }
  gl.bindTexture(gl.TEXTURE_2D,wtex);
  gl.texSubImage2D(gl.TEXTURE_2D,0,0,0,WN,1,gl.LUMINANCE,gl.UNSIGNED_BYTE,wave);
  return P>=0||pk>0;
}

/* ---------- кадр ---------- */
function kick(){ if(!running){ running=true; last=performance.now(); requestAnimationFrame(frame); } }
function frame(now){
  const busyAnim=!!animS||burst>.01;
  const cap=busyAnim?Math.max(14,AU.capMs||16):(LIVE?50:0);
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
  if(LIVE&&!animS){ tickT-=dt; if(tickT<=0){ tickT=2+Math.random()*4; const r=rotors[(Math.random()*rotors.length)|0]; if(r){ r.tang+=(Math.random()<.5?1:-1)*STEP; } } }

  /* окно экрана в пикселях холста (y снизу) */
  const rc=scr.getBoundingClientRect();
  const P=[rc.left*dpr,(innerHeight-rc.bottom)*dpr,rc.width*dpr,rc.height*dpr];
  const vis=rc.bottom>0&&rc.top<innerHeight&&rc.width>0;

  /* камера и границы роторов для сигнала */
  const N=Math.max(1,rotors.length), aspect=Math.max(.5,rc.width/Math.max(1,rc.height)), fov=.62, th=Math.tan(fov/2);
  const hx=(N-1)*D/2+.55+1.7, hv=1.45;
  const dist=Math.max(hx/(th*aspect),hv/th);
  const eye=[0,dist*.3,dist];
  const VP=mul(persp(fov,aspect,.1,100),look(eye,[0,-.08,0]));
  let xr0=.5, xr1=.5;
  const all=[...rotors,...dying].filter(r=>r.s>.05);
  if(all.length){ let a=1e9,b=-1e9; all.forEach(r=>{ const l=project(VP,r.x-W*r.s,0,1,rc.width,rc.height)[0], q=project(VP,r.x+W*r.s,0,1,rc.width,rc.height)[0]; a=Math.min(a,l); b=Math.max(b,q); }); xr0=Math.max(0,a/rc.width-.01); xr1=Math.min(1,b/rc.width+.01); }
  const wActive=fillWave(now,xr0,xr1);

  /* фон */
  gl.viewport(0,0,CWpx,CHpx); gl.disable(gl.DEPTH_TEST);
  gl.useProgram(BG);
  gl.bindBuffer(gl.ARRAY_BUFFER,quad); gl.enableVertexAttribArray(AB.p); gl.vertexAttribPointer(AB.p,2,gl.FLOAT,false,0,0);
  gl.uniform2f(UB.R,CWpx,CHpx); gl.uniform1f(UB.t,LIVE?now/1000:0); gl.uniform1f(UB.nz,Math.min(1,burst+(animS?.35:0)));
  gl.uniform1f(UB.dec,decK); gl.uniform1f(UB.rl,realK); gl.uniform1f(UB.wa,vis?1:0); gl.uniform1f(UB.sl,dpr); gl.uniform4f(UB.P,P[0],P[1],P[2],P[3]);
  gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D,wtex); gl.uniform1i(UB.W,0);
  gl.drawArrays(gl.TRIANGLES,0,3);
  gl.disableVertexAttribArray(AB.p);

  /* роторы в окне экрана */
  if(vis&&all.length){
    gl.enable(gl.SCISSOR_TEST); gl.scissor(P[0],P[1],P[2],P[3]); gl.viewport(P[0],P[1],P[2],P[3]);
    gl.clear(gl.DEPTH_BUFFER_BIT); gl.enable(gl.DEPTH_TEST);
    gl.useProgram(RT);
    const bind=(loc,buf,n)=>{ gl.bindBuffer(gl.ARRAY_BUFFER,buf); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc,n,gl.FLOAT,false,0,0); };
    bind(AR.p,geo.p,3); bind(AR.n,geo.n,3); bind(AR.uv,geo.uv,2); bind(AR.k,geo.k,1);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,geo.i);
    gl.uniformMatrix4fv(UR.VP,false,new Float32Array(VP)); gl.uniform3f(UR.eye,eye[0],eye[1],eye[2]);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D,atex); gl.uniform1i(UR.TX,0);
    gl.uniform1f(UR.rows,Math.max(1,rotors.length)); gl.uniform1f(UR.dec,decK); gl.uniform1f(UR.rl,realK);
    /* ось */
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
    gl.disable(gl.SCISSOR_TEST); gl.disable(gl.DEPTH_TEST);
    /* подписи */
    const kids=labels.children;
    rotors.forEach((r,i)=>{ const s=kids[i]; if(!s)return; const p=project(VP,r.x,-1.25,0,rc.width,rc.height); s.style.left=p[0].toFixed(1)+'px'; s.style.opacity=r.s.toFixed(2); });
    if(rotors.length>1){ const a=project(VP,rotors[0].tx,0,0,rc.width,rc.height)[0], b=project(VP,rotors[1].tx,0,0,rc.width,rc.height)[0]; const pitch=b-a; if((pitch>78)!==(lastPitch>78)){ lastPitch=pitch; nameLabels(); } lastPitch=pitch; }
    else if(lastPitch<=78){ lastPitch=999; nameLabels(); }
  }
  const keep=LIVE||moving||busyAnim||wActive||Math.abs(decK-(mode==='dec'&&!REAL?1:0))>.01||Math.abs(realK-(REAL?1:0))>.01;
  if(keep)requestAnimationFrame(frame); else running=false;
}

/* наведение на ротор: подсветить шаг конвейера */
scr.addEventListener('pointermove',e=>{
  if(!hoverCb||!rotors.length)return;
  const rc=scr.getBoundingClientRect(), x=e.clientX-rc.left; let best=-1, bd=1e9;
  [...labels.children].forEach((s,i)=>{ const d=Math.abs(parseFloat(s.style.left)-x); if(d<bd){ bd=d; best=i; } });
  const lim=Math.max(24,lastPitch/2);
  const i=bd<lim?best:-1; if(i!==hlIdx){ hlIdx=i; hoverCb(i); kick(); }
});
scr.addEventListener('pointerleave',()=>{ if(hlIdx>=0){ hlIdx=-1; if(hoverCb)hoverCb(-1); kick(); } });
document.addEventListener('visibilitychange',()=>{ if(!document.hidden)kick(); });

window.CipherGL={ok:true,setRotors,spin,anim,animEnd,hover,onHover:fn=>{ hoverCb=fn; },setReal:on=>{ REAL=!!on; kick(); }};
kick();
})();
