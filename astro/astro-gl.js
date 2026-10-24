/* A.C.EON // ASTRO: WebGL фон темы и хрустальный шар.
   Фон: один шейдер на весь экран, у каждой темы своя ветка. Если у темы загружена картинка (themes/<id>-w.webp),
   шейдер рисует поверх неё только живые детали (мерцание звёзд, пыль, падающие звёзды) с прозрачностью.
   Шар: отдельный канвас, дым внутри крутится, по ballPulse() разгоняется.
   Частота кадров и разрешение по AceonUniverse; при reduced motion кадр рисуется только при смене темы и размера. */
(function(){
'use strict';
const U=window.AceonUniverse||{gl:true,capMs:31,dprCap:1.5};
const RM=matchMedia('(prefers-reduced-motion: reduce)').matches;
const api={ok:false,ballOk:false,setTheme(){},ballPulse(){},setBallVisible(){}};
window.AstroGL=api;
if(U.gl===false)return;

const COMMON=`
precision highp float;
float h21(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
float n2(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
  return mix(mix(h21(i),h21(i+vec2(1.,0.)),f.x),mix(h21(i+vec2(0.,1.)),h21(i+1.),f.x),f.y);}
float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<5;i++){v+=a*n2(p);p=p*2.03+vec2(1.7,9.2);a*=.5;}return v;}
float star(vec2 p,float dens,float t){
  vec2 g=floor(p),f=fract(p);float r=h21(g);if(r>dens)return 0.;
  vec2 c=vec2(h21(g+3.1),h21(g+7.7))*.8+.1;float s=h21(g+1.3);
  float tw=.55+.45*sin(t*(.7+r*3.)+r*40.);
  float d=length(f-c);return (smoothstep(.07*(.35+s),0.,d)+smoothstep(.22,0.,d)*.12*s)*tw*(.35+s);}
`;
const VS='attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}';

/* ---------------- фон ---------------- */
const BG=COMMON+`
uniform vec2 R;uniform float T,TH,IMG;uniform vec2 M;
vec3 sky(vec2 uv,float sc,float dens,float t,vec3 tint){
  vec2 p=uv*sc+M*sc*.01;return tint*(star(p,dens,t)+star(p*1.9+11.,dens*.8,t*1.3)*.6);}
void main(){
  vec2 q=gl_FragCoord.xy/R;vec2 uv=gl_FragCoord.xy/R.y;float t=T;
  vec3 c=vec3(0.);float al=1.;
  float vig=smoothstep(1.25,.25,length((q-.5)*vec2(1.25,1.)));
  if(TH<.5){ /* обсерватория */
    c=mix(vec3(.027,.027,.05),vec3(.04,.045,.09),q.y);
    c+=vec3(.42,.48,.85)*.10*exp(-3.5*length((q-vec2(.62,.5))*vec2(1.6,1.)));
    float band=exp(-pow((q.y-q.x*.55-.2)*5.,2.))*fbm(uv*3.+t*.003);
    c+=vec3(.25,.27,.4)*band*.18;
    c+=sky(uv,70.,.22,t,vec3(1.,.97,.9))*.9;
    c+=sky(uv+.37,40.,.06,t*.8,vec3(.79,.64,.3))*.8;
    c*=.65+.35*vig;
    if(IMG>.5){al=0.;c=vec3(0.);}
  } else if(TH<1.5){ /* шатёр */
    if(IMG<.5){
      float fold=sin(q.x*R.x/R.y*26.+fbm(vec2(q.x*6.,q.y*1.5))*4.)*.5+.5;
      c=mix(vec3(.07,.012,.03),vec3(.16,.03,.07),fold*.6+q.y*.25);
      c*=.55+.45*smoothstep(0.,.7,q.y);
      c*=.6+.4*vig;
    }
    float fl=.85+.15*sin(t*9.)*sin(t*5.3+1.);
    vec2 cp1=vec2(.07,.1),cp2=vec2(.93,.12);
    float g1=exp(-14.*length((q-cp1)*vec2(R.x/R.y,1.))),g2=exp(-14.*length((q-cp2)*vec2(R.x/R.y,1.)));
    vec3 warm=vec3(1.,.62,.25);
    vec3 glow=warm*(g1+g2)*.55*fl;
    vec2 dp=uv*28.+vec2(0.,-t*.25);vec2 dg=floor(dp);
    float mote=star(dp+vec2(sin(t*.3+dg.y)*.3,0.),.1,t*2.)*.5;
    vec3 dust=warm*mote*smoothstep(1.,.2,q.y);
    if(IMG>.5){c=glow+dust;al=clamp(max(max(c.r,c.g),c.b),0.,1.);}
    else c+=glow+dust;
  } else if(TH<2.5){ /* атлас */
    if(IMG<.5){
      float f=fbm(uv*3.),f2=fbm(uv*14.+3.);
      c=mix(vec3(.93,.87,.74),vec3(.82,.72,.53),f*.7+f2*.15);
      c=mix(c,vec3(.55,.4,.25),smoothstep(.55,1.,1.-vig)*.6);
      vec2 cp=(q-.5)*vec2(R.x/R.y,1.);float r=length(cp),an=atan(cp.y,cp.x);
      float ring=smoothstep(.0035,0.,abs(fract(r*8.)-.5)/8.);
      float spoke=smoothstep(.004,0.,abs(fract(an/.2618+.5)-.5)*.2618*r)*step(.12,r);
      c=mix(c,vec3(.36,.27,.18),(ring+spoke)*.1);
      float ink=star(uv*34.,.12,0.);c=mix(c,vec3(.25,.18,.12),clamp(ink*1.6,0.,.8));
    } else {
      vec2 dp=uv*22.+vec2(t*.05,-t*.08);
      c=vec3(1.,.95,.8)*star(dp,.05,t)*.35;al=clamp(c.r,0.,1.);
    }
  } else if(TH<3.5){ /* туманность */
    if(IMG<.5){
      vec2 p=uv*1.6+vec2(t*.004,0.);
      float n=fbm(p+fbm(p*1.7+t*.006)*1.6);float m=fbm(p*2.3-4.);
      vec3 neb=mix(vec3(.42,.16,.66),vec3(.1,.55,.56),m);neb=mix(neb,vec3(.78,.3,.52),smoothstep(.55,.85,n*m*1.6));
      float mask=smoothstep(.35,.85,n)*(.35+.65*smoothstep(.12,.6,length((q-.5)*vec2(1.4,1.))));
      c=vec3(.02,.016,.045)+neb*mask*.75;
      c+=sky(uv,80.,.25,t,vec3(1.));c+=sky(uv+.5,30.,.05,t,vec3(.8,.9,1.));
      c*=.7+.3*vig;
    } else {c=sky(uv,80.,.12,t*1.5,vec3(1.))*.8;al=clamp(max(c.r,c.b),0.,1.);}
  } else if(TH<4.5){ /* неон */
    if(IMG<.5){
      float hz=.3;
      c=mix(vec3(.17,.03,.2),vec3(.03,.01,.09),smoothstep(hz,1.,q.y));
      c+=sky(uv,60.,.15,t,vec3(.9,.85,1.))*smoothstep(hz,hz+.25,q.y);
      vec2 sp=(q-vec2(.5,hz+.1))*vec2(R.x/R.y,1.);float sd=length(sp);
      float stripes=step(.5,fract((q.y-hz)*40.))+step(.18,q.y-hz);
      float sun=smoothstep(.16,.155,sd)*clamp(stripes,0.,1.)*step(hz,q.y);
      c+=mix(vec3(1.,.25,.6),vec3(1.,.8,.3),clamp((q.y-hz)*7.,0.,1.))*sun*.24;
      c+=vec3(1.,.2,.6)*exp(-abs(q.y-hz)*40.)*.35;
      if(q.y<hz){
        float z=(hz-q.y);vec2 g=vec2((q.x-.5)*R.x/R.y/z*.25,.25/z+t*.6);
        vec2 gd=abs(fract(g)-.5);
        float line=smoothstep(.04,0.,min(gd.x,gd.y))*smoothstep(0.,.1,z);
        c=mix(vec3(.05,.0,.08),vec3(.1,.02,.12),z*2.)+vec3(1.,.15,.7)*line*.8;
      }
    } else {c=sky(uv,60.,.1,t*1.4,vec3(1.,.6,.95))*.7;al=clamp(max(c.r,c.b),0.,1.);}
  } else { /* крыша */
    vec3 s=vec3(0.);
    float ts=mod(t,9.);vec2 a0=vec2(.15+.5*h21(vec2(floor(t/9.),1.)),.9);
    vec2 dir=normalize(vec2(1.,-.45));vec2 hd=a0+dir*ts*.35;
    vec2 rel=q-hd;float along=dot(rel,-dir),across=dot(rel,vec2(-dir.y,dir.x));
    float trail=smoothstep(.003,0.,abs(across))*smoothstep(.18,0.,along)*step(0.,along)*step(ts,1.2);
    s+=vec3(.85,.9,1.)*trail;
    if(IMG<.5){
      c=mix(vec3(.02,.04,.09),vec3(.05,.09,.18),q.y);
      float band=exp(-pow((q.y-.95+q.x*.6)*3.5,2.))*fbm(uv*4.);
      c+=vec3(.35,.38,.55)*band*.25;
      c+=sky(uv,90.,.3,t,vec3(1.));
      float x=q.x*R.x/R.y*7.;float id=floor(x);
      float hgt=.08+.08*h21(vec2(id,2.));float chim=step(.7,h21(vec2(id,5.)))*step(.3,fract(x))*step(fract(x),.42)*.035;
      float roof=hgt+chim;
      if(q.y<roof){c=vec3(.012,.016,.03);
        vec2 wc=vec2(x*5.,gl_FragCoord.y/(R.y*.018));vec2 wg=floor(wc),wf=fract(wc);
        float win=step(.8,h21(wg))*step(q.y,hgt-.02)*step(.3,wf.x)*step(wf.x,.7)*step(.25,wf.y)*step(wf.y,.75);
        c+=vec3(1.,.72,.35)*win*.5*(.8+.2*sin(t*.5+h21(wg)*20.));}
      c+=s;
    } else {c=s+sky(uv,90.,.08,t*1.6,vec3(1.))*.6;al=clamp(max(c.r,c.b),0.,1.);}
  }
  gl_FragColor=vec4(c*al,al);
}`;

/* ---------------- шар ---------------- */
const BALL=COMMON+`
uniform vec2 R;uniform float T,ACT;uniform vec3 C1,C2,C3;
mat2 rot(float a){float s=sin(a),c=cos(a);return mat2(c,-s,s,c);}
void main(){
  vec2 p=(gl_FragCoord.xy-.5*R)/R.y;p.y-=.07;
  float r=.34,d=length(p);vec3 c=vec3(0.);float al=0.;
  /* подставка */
  float sy=p.y+r*.86;
  if(sy<0.&&sy>-.14){float w=mix(.2,.27,-sy/.14);
    if(abs(p.x)<w){float sh=.55+.45*cos(p.x/w*1.57);float rim=smoothstep(.012,0.,abs(sy+.035))*.5;
      c=C3*(sh*.8+rim)+vec3(.02);al=1.;}}
  float ell=length(vec2(p.x/.22,(p.y+r*.86)/.035));
  if(ell<1.){c=C3*.55+vec3(.03);al=1.;}
  /* сфера */
  if(d<r+.004){
    float z=sqrt(max(0.,1.-d*d/(r*r)));vec3 n=vec3(p/r,z);
    vec2 s=p/r*(1.+.45*(1.-z));
    float sp=T*(.12+ACT*1.6);
    s=rot(sp+length(s)*2.2)*s;
    float f=fbm(s*2.3+vec2(T*.04,-T*.03));
    float f2=fbm(s*3.4+f*2.2-vec2(0.,T*.07+ACT*2.));
    float smoke=smoothstep(.35,.95,f*.7+f2*.7);
    vec3 col=vec3(.015,.012,.04)+mix(C1,C2,f2)*smoke*(.65+ACT*1.1);
    col+=C2*pow(1.-z,2.4)*.7;
    col+=vec3(1.)*pow(max(dot(n,normalize(vec3(-.45,.55,.75))),0.),38.)*.9;
    col+=vec3(1.)*pow(max(dot(n,normalize(vec3(.5,-.3,.8))),0.),90.)*.25;
    col*=.85+.15*z;
    float edge=smoothstep(r+.004,r-.002,d);
    c=mix(c,col,edge);al=max(al,edge);
  }
  float halo=exp(-max(d-r,0.)*16.)*(.12+ACT*.55)*step(r-.002,d);
  c+=C2*halo;al=max(al,clamp(halo,0.,1.));
  gl_FragColor=vec4(c*al,al);
}`;

function makeGL(cv,fsSrc,names){
  const gl=cv.getContext('webgl',{premultipliedAlpha:true,alpha:true,antialias:false,depth:false});
  if(!gl)return null;
  const sh=(t,s)=>{ const o=gl.createShader(t); gl.shaderSource(o,s); gl.compileShader(o); if(!gl.getShaderParameter(o,gl.COMPILE_STATUS)){ console.warn(gl.getShaderInfoLog(o)); return null; } return o; };
  const v=sh(gl.VERTEX_SHADER,VS), f=sh(gl.FRAGMENT_SHADER,fsSrc); if(!v||!f)return null;
  const pr=gl.createProgram(); gl.attachShader(pr,v); gl.attachShader(pr,f); gl.linkProgram(pr);
  if(!gl.getProgramParameter(pr,gl.LINK_STATUS))return null;
  gl.useProgram(pr);
  const b=gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER,b); gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),gl.STATIC_DRAW);
  const al=gl.getAttribLocation(pr,'a'); gl.enableVertexAttribArray(al); gl.vertexAttribPointer(al,2,gl.FLOAT,false,0,0);
  const u={}; names.forEach(n=>u[n]=gl.getUniformLocation(pr,n));
  return {gl,u};
}

const THEME_ID={obs:0,tent:1,atlas:2,nebula:3,neon:4,roof:5};
const BALLC={ /* дым 1, дым 2, металл подставки */
  obs:[[.35,.42,.9],[.85,.68,.32],[.62,.48,.2]],
  tent:[[.55,.18,.62],[1.,.55,.35],[.7,.5,.2]],
  atlas:[[.35,.5,.75],[.9,.75,.45],[.5,.35,.2]],
  nebula:[[.25,.75,.8],[.85,.35,.75],[.45,.48,.6]],
  neon:[[.2,.85,1.],[1.,.2,.7],[.55,.3,.7]],
  roof:[[.3,.45,.95],[.95,.8,.5],[.55,.45,.35]]
};
let theme='obs', img=false, mx=0, my=0;
const dpr=()=>Math.min(window.devicePixelRatio||1,U.dprCap||1.5);

/* фон */
const cv=document.getElementById('gl');
const B=cv?makeGL(cv,BG,['R','T','TH','IMG','M']):null;
/* шар */
const bc=document.getElementById('ball');
const S=bc?makeGL(bc,BALL,['R','T','ACT','C1','C2','C3']):null;
api.ok=!!B; api.ballOk=!!S;
if(B)document.documentElement.classList.add('gl');
if(S)document.documentElement.classList.add('glball');
if(!B&&!S)return;

let act=0, ballVis=true, dirty=true;
function resize(){
  if(B){ const w=Math.round(innerWidth*dpr()), h=Math.round(innerHeight*dpr()); if(cv.width!==w||cv.height!==h){ cv.width=w; cv.height=h; } }
  if(S){ const r=bc.getBoundingClientRect(), s=Math.round(Math.max(1,r.width)*Math.min(2,window.devicePixelRatio||1)); if(bc.width!==s){ bc.width=s; bc.height=s; } }
  dirty=true;
}
addEventListener('resize',resize);
if(!RM)addEventListener('pointermove',e=>{ mx=(e.clientX/innerWidth-.5)*2; my=(e.clientY/innerHeight-.5)*-2; },{passive:true});

const t0=performance.now(); let last=0;
function frame(now){
  requestAnimationFrame(frame);
  if(document.hidden)return;
  if(RM&&!dirty&&act<=0)return;
  if(now-last<(U.capMs||31))return;
  const dt=Math.min(.1,(now-last)/1000); last=now; dirty=false;
  const t=RM?7.:(now-t0)/1000;
  if(B){ const g=B.gl; g.viewport(0,0,cv.width,cv.height); g.uniform2f(B.u.R,cv.width,cv.height); g.uniform1f(B.u.T,t); g.uniform1f(B.u.TH,THEME_ID[theme]||0); g.uniform1f(B.u.IMG,img?1:0); g.uniform2f(B.u.M,mx,my); g.drawArrays(g.TRIANGLES,0,3); }
  if(S&&ballVis){
    act=Math.max(0,act-dt*.6);
    const g=S.gl, c=BALLC[theme]||BALLC.obs;
    g.viewport(0,0,bc.width,bc.height); g.clearColor(0,0,0,0); g.clear(g.COLOR_BUFFER_BIT);
    g.uniform2f(S.u.R,bc.width,bc.height); g.uniform1f(S.u.T,RM?3.:t); g.uniform1f(S.u.ACT,act);
    g.uniform3fv(S.u.C1,c[0]); g.uniform3fv(S.u.C2,c[1]); g.uniform3fv(S.u.C3,c[2]); g.drawArrays(g.TRIANGLES,0,3);
  }
}
api.setTheme=(id,hasImg)=>{ theme=id; img=!!hasImg; dirty=true; };
api.ballPulse=()=>{ act=1; dirty=true; };
api.setBallVisible=v=>{ ballVis=!!v; if(v){ resize(); } };
api.resize=resize;
resize(); requestAnimationFrame(frame);
})();
