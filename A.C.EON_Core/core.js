/* A.C.EON · NETWORK: ядро сайта, карта всех разделов.
   Данные: nodes.js (сектора и страницы), lang.js (тексты). Рисует WebGL, подписи обычным HTML.
   Если WebGL нет, остаётся карта списком. */
(function(){
'use strict';

const AU=window.AceonUniverse||{id:2,tag:'U-2',fx:2,capMs:15};
const UID=Math.max(1,Math.min(3,AU.id||2));
const isCoarse=matchMedia('(pointer:coarse)').matches||navigator.maxTouchPoints>0;
const reduceMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;
const forceGL=/[?&]gl=force/.test(location.search), noGL=/[?&]gl=off/.test(location.search);
const TR=window.Trace||null;

let PORTAL=false;
try{ PORTAL=(window.self!==window.top); }catch(e){ PORTAL=true; }
if(PORTAL){ try{ parent.postMessage({aceon:'ready'},location.origin); }catch(e){} }
function requestPortalClose(){ try{ parent.postMessage({aceon:'close'},location.origin); }catch(e){} }
function goMain(){ if(PORTAL)requestPortalClose(); else location.href='../'; }
/* страница из ядра открывается во всей вкладке, а не внутри портала главной:
   иначе адрес в строке остаётся от ядра, а кнопка "назад" листает историю iframe */
function openPage(url){
  const abs=new URL(url,location.href).href;
  if(PORTAL){ try{ window.top.location.href=abs; return; }catch(e){} }
  location.href=abs;
}

/* язык: общий с главной и аркадой */
const LANGS=['en','ru','de','fr','es','it','pl'];
const LANG_NAMES={en:'English',ru:'Русский',de:'Deutsch',fr:'Français',es:'Español',it:'Italiano',pl:'Polski'};
const CL=window.CORE_LANG||{en:{}};
const hasI18n=!!(window.I18n&&window.Store);
function readSite(){ try{ return JSON.parse(localStorage.getItem('aceon:site')||'null')||{}; }catch(e){ return {}; } }
function writeSite(o){ if(!o.v)o.v=1; try{ localStorage.setItem('aceon:site',JSON.stringify(o)); }catch(e){} }
let fbLang=(function(){
  const s=readSite().lang; if(LANGS.indexOf(s)>=0)return s;
  const nav=navigator.languages||[navigator.language||'en'];
  for(let i=0;i<nav.length;i++){ const c=String(nav[i]).slice(0,2).toLowerCase(); if(LANGS.indexOf(c)>=0)return c; }
  return 'en';
})();
function lang(){ return hasI18n?I18n.lang:fbLang; }
function T(k,v){
  const d=CL[lang()]||CL.en;
  let s=d[k]!==undefined?d[k]:(CL.en[k]!==undefined?CL.en[k]:k);
  if(v)s=s.replace(/\{(\w+)\}/g,(m,n)=>v[n]!==undefined?v[n]:m);
  return s;
}
function L(o){ if(o==null)return ''; if(typeof o==='string')return o; return o[lang()]||o.en||o.ru||''; }
function setLang(c){
  if(LANGS.indexOf(c)<0||c===lang())return;
  if(hasI18n)I18n.set(c);
  else{ fbLang=c; const o=readSite(); o.lang=c; if(o.music===undefined)o.music=.6; if(o.sfx===undefined)o.sfx=.8; writeSite(o); }
  document.documentElement.lang=c;
  if(TR)TR.event('lang.change');
  applyTexts();
}
document.documentElement.lang=lang();

/* дерево из nodes.js */
const SECTORS=window.CORE_SECTORS||[];
const PAGES=window.CORE_NODES||[];
const TREE={children:SECTORS.map(s=>({
  id:'sector:'+s.id, sid:s.id, kind:'sector', color:s.color, icon:s.icon, w:2.5,
  children:PAGES.filter(p=>p.sector===s.id).map(p=>Object.assign({},p,{kind:'page',color:s.color,sid:s.id}))
}))};
const CORE_DEF={id:'core', kind:'core', color:'#CFE9FF', w:3.0};

function nodeName(d){
  if(d.kind==='core')return T('core.name');
  if(d.kind==='sector')return T('s.'+d.sid);
  return L(d.name)||T('soon');
}
const DAY=864e5;
function traceId(d){
  if(!TR||!d.url||d.external)return null;
  try{ return TR.idFromUrl(new URL(d.url,location.href).href); }catch(e){ return null; }
}
function visitOf(d){
  if(!TR||d.kind!=='page')return null;
  if(d.external){ const n=TR.data().ev['ext.'+d.id]||0; return {n:n,t:0,last:0,ext:true}; }
  const id=traceId(d); if(!id)return null;
  return TR.data().sec[id]||{n:0,t:0,last:0};
}
function visited(d){ const v=visitOf(d); return !!(v&&v.n>0); }
function isNew(d){
  if(d.kind==='sector')return d.children.some(isNew);
  if(!d.added||d.status==='soon')return false;
  const t=Date.parse(d.added); if(!t)return false;
  return Date.now()-t<21*DAY&&!visited(d);
}
function liveKids(d){ return (d.children||[]).filter(k=>k.status!=='soon'); }
function sectorOpened(d){ return liveKids(d).filter(visited).length; }
function isOff(d){ return d.status==='soon'; }

const ICONS={
  games:'<path d="M6 9h12a4 4 0 0 1 3.6 5.7l-.9 1.9a2.5 2.5 0 0 1-4.1.5L14.8 15H9.2l-1.8 2.1a2.5 2.5 0 0 1-4.1-.5l-.9-1.9A4 4 0 0 1 6 9z"/><path d="M8 11v3M6.5 12.5h3M15.5 12h.01M17.5 13.5h.01"/>',
  music:'<path d="M3 12h2l2-5 3 10 3-13 3 11 2-3h3"/>',
  studio:'<circle cx="12" cy="12" r="8.5"/><path d="M12 5.5l2.2 6.5L12 18.5 9.8 12z"/>',
  tools:'<rect x="3" y="5" width="18" height="14" rx="1.5"/><path d="M7 10l3 2-3 2M12 15h5"/>',
  learn:'<path d="M3 6c3-1.5 6-1.5 9 0 3-1.5 6-1.5 9 0v12c-3-1.5-6-1.5-9 0-3-1.5-6-1.5-9 0z"/><path d="M12 6v12"/>',
  people:'<circle cx="9" cy="9" r="3"/><circle cx="16.5" cy="10" r="2.4"/><path d="M3.5 19c.8-3.2 3-5 5.5-5s4.7 1.8 5.5 5M14 15.2c.8-.7 1.6-1 2.5-1 2 0 3.5 1.5 4 4"/>'
};

/* --- WebGL --- */
const cv=document.getElementById('c');
let gl=null, GLOK=false;
const TIER=[null,
  {dpr:1,   stars:60,  vortex:240, cap:31},
  {dpr:1.5, stars:110, vortex:560, cap:15},
  {dpr:2,   stars:170, vortex:900, cap:15}][UID];
if(isCoarse)TIER.dpr=Math.min(TIER.dpr,UID>=3?1.75:1.25);
let W=innerWidth, H=innerHeight, DPR=1, SC=1;

const FP='#ifdef GL_FRAGMENT_PRECISION_HIGH\nprecision highp float;\n#else\nprecision mediump float;\n#endif\n';
const VH='precision highp float;uniform vec2 uRes;uniform float uZ;'+
  'vec4 clip(vec2 p,float z){vec2 c=uRes*.5;vec2 q=(p-c)*z+c;return vec4(q.x/uRes.x*2.-1.,1.-q.y/uRes.y*2.,0.,1.);}';
const OVER='vec4 P=vec4(0.);void over(vec3 c,float a){a=clamp(a,0.,1.);P.rgb=c*a+P.rgb*(1.-a);P.a=a+P.a*(1.-a);}';

const SH={
bgV:'attribute vec2 aQ;void main(){gl_Position=vec4(aQ,0.,1.);}',
bgF:FP+[
 'uniform vec2 uRes;uniform float uDpr,uZ;uniform vec2 uPm;uniform sampler2D uNeb;uniform float uGridPar;',
 'void main(){',
 ' vec2 p=vec2(gl_FragCoord.x,uRes.y*uDpr-gl_FragCoord.y)/uDpr;',
 ' vec3 col=vec3(2.,5.,9.)/255.;',
 ' vec2 uv=(p+40.+uPm*10.)/(uRes+80.);',
 ' col+=texture2D(uNeb,vec2(uv.x,1.-uv.y)).rgb;',
 ' vec2 c=uRes*.5; vec2 g=(p-c)/uZ+c+64.+uPm*uGridPar;',
 ' vec2 q=g-38.*floor(g/38.+.5);',
 ' float cov=clamp((.75-length(q))*uZ*uDpr+.5,0.,1.);',
 ' col+=vec3(77.,175.,255.)/255.*.055*cov;',
 ' gl_FragColor=vec4(col,1.);',
 '}'].join('\n'),

starV:[
 'attribute vec4 aS;uniform vec2 uRes;uniform float uT,uDpr,uLow;uniform vec2 uPm;varying float vA;',
 'void main(){',
 ' float z=aS.z, t=uT*.02;',
 ' float px=fract(aS.x+t*z)*uRes.x-uPm.x*46.*z;',
 ' float py=aS.y*uRes.y-uPm.y*46.*z+(uLow>.5?0.:sin(t*40.+aS.w)*7.*z);',
 ' vA=uLow>.5?z*z*.16:z*z*.18*(sin(uT+aS.w)*.35+.65);',
 ' gl_PointSize=max(1.,z*3.*uDpr+1.);',
 ' gl_Position=vec4(px/uRes.x*2.-1.,1.-py/uRes.y*2.,0.,1.);',
 '}'].join('\n'),
starF:FP+'varying float vA;void main(){float d=length(gl_PointCoord-.5)*2.;float a=vA*clamp((1.-d)*2.,0.,1.);gl_FragColor=vec4(vec3(77.,175.,255.)/255.*a,a);}',

/* центральный вихрь: частицы падают в ядро, положение считается из времени */
vortV:[
 'attribute vec4 aV;uniform vec2 uRes,uC;uniform float uVT,uDpr,uAlpha,uAgit,uZ;varying float vA;',
 'void main(){',
 ' float z=aV.z, Rm=min(uRes.x,uRes.y)*.5*(.85+aV.w*.4);',
 ' float p=fract(aV.y+uVT*.03*z*(.7+aV.w));',
 ' float r=24.+(Rm-24.)*pow(1.-p,1.6);',
 ' float a=aV.x+uVT*.05*z+p*p*8.*z;',
 ' vec2 c=uRes*.5; vec2 pos=uC+vec2(cos(a)*r,sin(a)*r*.85); pos=(pos-c)*uZ+c;',
 ' float heat=clamp(1.-r/Rm,0.,1.);',
 ' vA=uAlpha*z*(.07+heat*.2)*(1.+uAgit*.9)*smoothstep(0.,.06,p);',
 ' gl_PointSize=max(1.,(1.6+heat*1.8)*uDpr*uZ);',
 ' gl_Position=vec4(pos.x/uRes.x*2.-1.,1.-pos.y/uRes.y*2.,0.,1.);',
 '}'].join('\n'),
vortF:FP+'varying float vA;void main(){gl_FragColor=vec4(vec3(120.,200.,255.)/255.*vA,vA);}',

edgeV:VH+[
 'attribute vec2 aP;attribute vec3 aD;attribute vec4 aC;varying vec3 vD;varying vec4 vC;',
 'void main(){vD=aD;vC=aC;gl_Position=clip(aP,uZ);}'].join('\n'),
edgeF:FP+[
 'uniform float uPx,uDashOff,uDashed;varying vec3 vD;varying vec4 vC;',
 'void main(){',
 ' float cov=clamp((vD.z-abs(vD.x))/uPx+.5,0.,1.);',
 ' float m=mod(vD.y+uDashOff,16.);',
 ' float dash=uDashed>.5?clamp((6.-m)/uPx+.5,0.,1.)*clamp(m/uPx+.5,0.,1.):1.;',
 ' float a=vC.a*cov*dash; gl_FragColor=vec4(vC.rgb*a,a);',
 '}'].join('\n'),

nodeV:VH+[
 'attribute vec2 aQ;attribute vec4 aN0,aN1,aN2,aN3,aN4;',
 'varying vec2 vL;varying vec4 vA,vB,vC;varying vec3 vCol;',
 'void main(){vL=aQ*aN0.z;vA=aN1;vB=aN2;vC=aN3;vCol=aN4.rgb;gl_Position=clip(aN0.xy+vL,uZ);}'].join('\n'),
nodeF:FP+OVER+[
 'uniform float uT,uPx;varying vec2 vL;varying vec4 vA,vB,vC;varying vec3 vCol;',
 'const float TAU=6.2831853;',
 'float ring(float d,float R,float w){return clamp((w*.5-abs(d-R))/uPx+.5,0.,1.);}',
 'float arcm(float a,float a0,float len){return step(mod(a-a0,TAU),len);}',
 'float dotc(vec2 p,float rad){return clamp((rad-length(p))/uPx+.5,0.,1.);}',
 'void main(){',
 ' float d=length(vL), ang=atan(vL.y,vL.x);',
 ' float r=vA.x, rr=vA.y, kind=vA.z, off=vA.w;',
 ' float hot=vB.x, sp=vB.y, rip=vB.z, gj=vB.w;',
 ' float seed=vC.x, sats=vC.y, beacon=vC.z, dir=vC.w;',
 ' vec3 col=vCol; float T=uT;',
 ' float gt=d/(r*2.6);',
 ' float glw=gt<.45?mix(.33,.13,gt/.45):mix(.13,0.,clamp((gt-.45)/.55,0.,1.));',
 ' over(col,glw*((off>.5?.22:.5)+hot*.45+(kind>2.5?.25:0.)));',
 ' if(sp<1.&&sp>0.)over(col,ring(d,rr*(2.5-sp*1.6),2.)*(1.-sp)*.47);',
 ' if(rip>0.)over(col,ring(d,r+(1.-rip)*42.,1.5)*rip*.55);',
 ' float rb=r*(1.+.025*sin(T*1.3+seed));',
 ' float gt2=clamp(length(vL+vec2(rb*.25))/(rb*1.25),0.,1.);',
 ' float a0=off>.5?.17:mix(.37,.59,hot), a1=off>.5?.016:.04;',
 ' if(kind>2.5){a0=.30+hot*.2;a1=.07;}',
 ' over(col,mix(a0,a1,gt2)*clamp((rb-d)/uPx+.5,0.,1.));',
 ' if(off<.5){',
 '  over(col,ring(d,rb*.52,1.)*mix(.28,.55,hot));',
 '  float ia=T*1.4*(mod(seed,2.)>.5?-1.:1.)+seed;',
 '  over(col,ring(d,rb*.52,1.6)*arcm(ang,ia,.7)*mix(.69,1.,hot));',
 ' }',
 ' over(col,ring(d,rb,mix(1.,1.6,hot))*(off>.5?.16:mix(.38,.82,hot)));',
 ' if(off>.5){',
 '  float dsh=step(mod((ang-seed)*(r+8.),10.),3.);',
 '  over(col,ring(d,r+8.,1.)*arcm(ang,seed,5.6)*dsh*.19);',
 ' } else if(kind<1.5){',
 '  float spd=1.+hot*1.6;',
 '  float q1=T*.8*spd*dir+seed;',
 '  float m1=max(arcm(ang,q1,1.5),max(arcm(ang,q1+2.094,1.5),arcm(ang,q1+4.189,1.5)));',
 '  over(col,ring(d,r+6.,1.2)*m1*mix(.35,.69,hot));',
 '  float q2=-T*.6*spd*dir+seed*2.;',
 '  float m2=max(arcm(ang,q2,2.1),arcm(ang,q2+3.1416,2.1));',
 '  over(col,ring(d,r+11.,1.2)*m2*mix(.2,.44,hot));',
 ' }',
 ' if(sats>.5&&sp>.6){',
 '  float dd=r+17.;',
 '  for(int i=0;i<3;i++){',
 '   if(float(i)>=sats)break;',
 '   float a=T*1.1*dir+float(i)*TAU/sats;',
 '   over(col,dotc(vL-vec2(cos(a)*dd,sin(a)*dd*.92),2.)*.75);',
 '   over(col,ring(d,dd,1.)*arcm(ang,a-.55,.37)*.21);',
 '  }',
 ' }',
 ' if(hot>.03&&kind<1.5){',
 '  float b=r*1.55+(1.-hot)*12., Lb=b*.38; vec2 q=abs(vL);',
 '  float h1=clamp((.65-abs(q.y-b))/uPx+.5,0.,1.)*step(b-Lb,q.x)*step(q.x,b+.65);',
 '  float v1=clamp((.65-abs(q.x-b))/uPx+.5,0.,1.)*step(b-Lb,q.y)*step(q.y,b+.65);',
 '  over(col,max(h1,v1)*hot*.78);',
 ' }',
 ' if(kind>1.5){',
 '  float a2=ang-T*.4; float dsh=step(mod(a2*(r+13.),11.),4.);',
 '  over(col,ring(d,r+13.,1.)*dsh*.4);',
 '  if(kind>2.5){',
 '   float a3=ang+T*.25; float d3=step(mod(a3*(r+25.),16.),2.);',
 '   over(col,ring(d,r+25.,1.)*d3*.28);',
 '   over(vec3(1.),dotc(vL,r*.16)*.55*(.75+.25*sin(T*2.)));',
 '  }',
 ' }',
 ' if(beacon>.5&&off<.5&&kind<1.5&&sp>.9){',
 '  vec2 bp=vec2(0.,-(r+22.)); float ph=fract(T*.7);',
 '  over(col,dotc(vL-bp,2.3)*(.45+.35*sin(T*3.)));',
 '  over(col,ring(length(vL-bp),2.5+ph*9.,1.)*(1.-ph)*.5);',
 ' }',
 ' if(gj!=0.){',
 '  over(vec3(.3,.69,1.),ring(length(vL-vec2(gj,0.)),r,1.)*.5);',
 '  over(vec3(1.,.25,.38),ring(length(vL+vec2(gj,0.)),r,1.)*.5);',
 ' }',
 ' gl_FragColor=P;',
 '}'].join('\n'),

spV:VH+[
 'attribute vec2 aP;attribute vec2 aS;attribute vec4 aC;uniform float uDpr;varying vec2 vS;varying vec4 vC;',
 'void main(){vS=aS;vC=aC;gl_PointSize=max(1.,aS.x*uZ*uDpr);gl_Position=clip(aP,uZ);}'].join('\n'),
spF:FP+[
 'varying vec2 vS;varying vec4 vC;',
 'void main(){vec2 q=gl_PointCoord-.5;float d=length(q)*2.;float a;',
 ' if(vS.y<.5)a=clamp((1.-d)*vS.x*.5+.5,0.,1.);',
 ' else if(vS.y<1.5)a=exp(-d*d*4.)*step(d,1.);',
 ' else a=1.;',
 ' a*=vC.a;gl_FragColor=vec4(vC.rgb*a,a);}'].join('\n'),

portV:'precision highp float;attribute vec2 aQ;uniform vec2 uRes,uC;varying vec2 vL;void main(){vL=aQ*70.;vec2 p=uC+vL;gl_Position=vec4(p.x/uRes.x*2.-1.,1.-p.y/uRes.y*2.,0.,1.);}',
portF:FP+OVER+[
 'uniform float uT,uDz,uPx,uDots;varying vec2 vL;',
 'float ring(float d,float R,float w){return clamp((w*.5-abs(d-R))/uPx+.5,0.,1.);}',
 'void main(){',
 ' float d=length(vL), ang=atan(vL.y,vL.x), t=d/54.;',
 ' vec4 c0=vec4(vec3(0.,2.,6.)/255.,.96), c1=vec4(vec3(2.,8.,18.)/255.,.85), c2=vec4(vec3(77.,175.,255.)/255.,.15);',
 ' vec4 g=t<.55?mix(c0,c1,t/.55):(t<.8?mix(c1,c2,(t-.55)/.25):mix(c2,vec4(c2.rgb,0.),clamp((t-.8)/.2,0.,1.)));',
 ' over(g.rgb,g.a);',
 ' float r1=40.*uDz, r2=48.*uDz;',
 ' float a1=ang-uT*1.2; over(vec3(120.,205.,255.)/255.,ring(d,r1,1.2)*step(mod(a1*r1,13.),5.)*.75);',
 ' float a2=ang+uT*.9; over(vec3(77.,175.,255.)/255.,ring(d,r2,1.2)*step(mod(a2*r2,13.),3.)*.45);',
 ' if(uDots>.5){',
 '  for(int i=0;i<10;i++){',
 '   float fi=float(i); float a=uT*1.6+fi*.628; float rr=r1+4.+sin(uT*3.+fi)*4.;',
 '   vec2 q=abs(vL-vec2(cos(a)*rr,sin(a)*rr*.9));',
 '   float s=step(q.x,.9)*step(q.y,.9);',
 '   over(vec3(154.,214.,255.)/255.,s*(.35+.3*sin(uT*4.+fi*2.)));',
 '  }',
 ' }',
 ' gl_FragColor=P*uDz;',
 '}'].join('\n'),

ovF:FP+OVER+[
 'uniform vec2 uRes;uniform float uDpr,uT,uHold,uEm,uFlash,uN;',
 'float h(float n){return fract(sin(n*127.1)*43758.5453);}',
 'void main(){',
 ' vec2 p=vec2(gl_FragCoord.x,uRes.y*uDpr-gl_FragCoord.y)/uDpr; vec2 c=uRes*.5; vec2 v=p-c; float d=length(v);',
 ' vec3 bg=vec3(2.,5.,9.)/255.;',
 ' if(uHold>.5){',
 '  over(bg,1.);',
 '  over(vec3(120.,205.,255.)/255.,clamp(1.-d/60.,0.,1.)*(.22+.18*sin(uT*4.)));',
 ' } else if(uEm>=0.){',
 '  float e=uEm, inv=1.-e;',
 '  over(bg,inv*.85);',
 '  float R=max(uRes.x,uRes.y)*(.15+e*.9); float t=d/R;',
 '  vec4 g0=vec4(vec3(210.,240.,255.)/255.,inv*.55), g1=vec4(vec3(77.,175.,255.)/255.,inv*.28);',
 '  vec4 g=t<.4?mix(g0,g1,t/.4):mix(g1,vec4(g1.rgb,0.),clamp((t-.4)/.6,0.,1.));',
 '  over(g.rgb,g.a);',
 '  float an=atan(v.y,v.x)+3.14159; float id=floor(an/6.28318*uN);',
 '  float ca=(id+.5)/uN*6.28318-3.14159+(h(id+3.)-.5)*(6.28318/uN)*.6;',
 '  float sp=.7+h(id)*.6, l=.15+h(id+1.)*.5, w=.5+h(id+2.)*1.4;',
 '  float maxL=length(uRes)*.5, r0=maxL*e*sp, r1=r0+maxL*l*inv;',
 '  float perp=d*abs(sin(atan(v.y,v.x)-ca));',
 '  float cov=clamp((w*inv+.2)*.5-perp+.5,0.,1.)*step(r0,d)*step(d,r1);',
 '  over(vec3(160.,220.,255.)/255.,cov*inv*.5);',
 ' }',
 ' if(uFlash>0.)over(vec3(77.,175.,255.)/255.,uFlash);',
 ' gl_FragColor=P;',
 '}'].join('\n')
};
/* кольца-вспышки «сверхновой» */
SH.fxF=FP+'uniform float uPx;varying vec2 vL;varying vec4 vF;varying vec3 vCol;void main(){float a=clamp((vF.y*.5-abs(length(vL)-vF.x))/uPx+.5,0.,1.)*vF.z;gl_FragColor=vec4(vCol*a,a);}';
SH.fxV=VH+'attribute vec2 aQ;attribute vec4 aF0;attribute vec4 aF1;attribute vec4 aF2;varying vec2 vL;varying vec4 vF;varying vec3 vCol;void main(){vL=aQ*aF0.z;vF=vec4(aF0.w,aF1.x,aF1.y,0.);vCol=aF2.rgb;gl_Position=clip(aF0.xy+vL,uZ);}';

let PG={}, BUF={}, nebTex=null;
function compile(vs,fs,attrs){
  function sh(type,src){
    const s=gl.createShader(type); gl.shaderSource(s,src); gl.compileShader(s);
    if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(s));
    return s;
  }
  const p=gl.createProgram();
  gl.attachShader(p,sh(gl.VERTEX_SHADER,vs)); gl.attachShader(p,sh(gl.FRAGMENT_SHADER,fs));
  attrs.forEach((a,i)=>gl.bindAttribLocation(p,i,a));
  gl.linkProgram(p);
  if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(p));
  const u={}, n=gl.getProgramParameter(p,gl.ACTIVE_UNIFORMS);
  for(let i=0;i<n;i++){ const inf=gl.getActiveUniform(p,i); u[inf.name]=gl.getUniformLocation(p,inf.name); }
  return {p:p,u:u,n:attrs.length};
}
function U(pg,name){ return pg.u[name]||null; }
function glInit(){
  if(noGL)return false;
  const opts={alpha:false,antialias:false,depth:false,stencil:false,premultipliedAlpha:true,preserveDrawingBuffer:false,
    failIfMajorPerformanceCaveat:!forceGL};
  try{ gl=cv.getContext('webgl',opts)||cv.getContext('experimental-webgl',opts); }catch(e){ gl=null; }
  if(!gl)return false;
  try{
    PG.bg=compile(SH.bgV,SH.bgF,['aQ']);
    PG.star=compile(SH.starV,SH.starF,['aS']);
    PG.vort=compile(SH.vortV,SH.vortF,['aV']);
    PG.edge=compile(SH.edgeV,SH.edgeF,['aP','aD','aC']);
    PG.node=compile(SH.nodeV,SH.nodeF,['aQ','aN0','aN1','aN2','aN3','aN4']);
    PG.sp=compile(SH.spV,SH.spF,['aP','aS','aC']);
    PG.fx=compile(SH.fxV,SH.fxF,['aQ','aF0','aF1','aF2']);
    PG.port=compile(SH.portV,SH.portF,['aQ']);
    PG.ov=compile(SH.bgV,SH.ovF,['aQ']);
    BUF.tri=mkBuf(new Float32Array([-1,-1,3,-1,-1,3]),gl.STATIC_DRAW);
    BUF.quad=mkBuf(new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);
    const st=new Float32Array(TIER.stars*4);
    for(let i=0;i<TIER.stars;i++){ st[i*4]=Math.random(); st[i*4+1]=Math.random(); st[i*4+2]=Math.random()*.75+.25; st[i*4+3]=Math.random()*6.283; }
    BUF.star=mkBuf(st,gl.STATIC_DRAW);
    const vt=new Float32Array(TIER.vortex*4);
    for(let i=0;i<TIER.vortex;i++){ vt[i*4]=Math.random()*6.283; vt[i*4+1]=Math.random(); vt[i*4+2]=.3+Math.random()*.7; vt[i*4+3]=Math.random(); }
    BUF.vort=mkBuf(vt,gl.STATIC_DRAW);
    BUF.edge=gl.createBuffer(); BUF.node=gl.createBuffer(); BUF.sp=gl.createBuffer(); BUF.fx=gl.createBuffer();
    nebTex=gl.createTexture();
  }catch(e){
    if(window.console)console.warn('A.C.EON core: WebGL off,',e&&e.message);
    gl=null; return false;
  }
  return true;
}
function mkBuf(data,usage){ const b=gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER,b); gl.bufferData(gl.ARRAY_BUFFER,data,usage); return b; }
let maxAttr=0;
function attribs(buf,layout){
  gl.bindBuffer(gl.ARRAY_BUFFER,buf);
  let stride=0; layout.forEach(n=>stride+=n);
  let off=0;
  for(let i=0;i<layout.length;i++){
    gl.enableVertexAttribArray(i);
    gl.vertexAttribPointer(i,layout[i],gl.FLOAT,false,stride*4,off*4);
    off+=layout[i];
  }
  for(let i=layout.length;i<maxAttr;i++)gl.disableVertexAttribArray(i);
  maxAttr=layout.length;
}
function buildNeb(){
  const c=document.createElement('canvas');
  c.width=Math.max(64,((W+80)/2)|0); c.height=Math.max(64,((H+80)/2)|0);
  const g=c.getContext('2d');
  g.fillStyle='#000'; g.fillRect(0,0,c.width,c.height);
  const n=UID>=2?7:4;
  for(let i=0;i<n;i++){
    const bx=Math.random()*c.width, by=Math.random()*c.height;
    const br=Math.min(c.width,c.height)*(.25+Math.random()*.35);
    const hue=Math.random()<.75?'77,175,255':'61,255,180';
    const gr=g.createRadialGradient(bx,by,0,bx,by,br);
    gr.addColorStop(0,'rgba('+hue+','+(.045+Math.random()*.03).toFixed(3)+')');
    gr.addColorStop(1,'rgba('+hue+',0)');
    g.fillStyle=gr; g.beginPath(); g.arc(bx,by,br,0,Math.PI*2); g.fill();
  }
  gl.bindTexture(gl.TEXTURE_2D,nebTex);
  gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,c);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
}
function resizeGL(){
  DPR=Math.min(window.devicePixelRatio||1,TIER.dpr);
  cv.width=Math.max(2,(W*DPR)|0); cv.height=Math.max(2,(H*DPR)|0);
  buildNeb();
}

/* --- состояние --- */
const cam={z:1,t:1};
let pmx=0,pmy=0;
addEventListener('mousemove',e=>{ pmx=e.clientX/W-.5; pmy=e.clientY/H-.5; },{passive:true});
let path=[], nodes=[], edges=[], hub=null;
let graphOn=false, flashA=0, spike=0, agit=0, vT=0, vortA=0, NOW=0, dzT=0;
let sparks=[], novas=[], bursts=[], swallowing=[];
const BURST_MAX=12;
let wave={t:2,amp:0};

function levelChildren(){ return path.length?path[path.length-1].children:TREE.children; }
function curSector(){ return path.length?path[path.length-1]:null; }

function runtimeNode(def,x,y,role){
  const base=def.kind==='core'?3.0:(def.kind==='sector'?2.5:(def.w||2));
  return Object.assign({},{def:def,
    id:def.id, kind:def.kind, color:def.color, off:isOff(def),
    x:x,y:y,vx:0,vy:0,
    radius:(20+base*10)*SC*(role==='hub'?1.08:1),
    container:def.kind==='sector', isHub:role==='hub'||role==='core', role:role||'node',
    hovered:false,dragging:false,hidden:false,pinned:role==='hub'||role==='core',
    trail:[],spawnT:0,spawned:false,spawning:false,glitchUntil:0,ripple:0,
    seed:(def.id||'x').split('').reduce((s,ch)=>s+ch.charCodeAt(0),0),
    hotT:0,tx:x,ty:y,sx:x,sy:y,arcK:0,swScale:null,el:null
  });
}
function mkEdge(a,b,faint){
  return {a:a,b:b,faint:!!faint,sag:(Math.random()<.5?-1:1)*(.05+Math.random()*.05),grow:0,ex:null,ey:null,
    ps:[{t:Math.random()},{t:Math.random()},{t:Math.random()}]};
}
/* длина связи: на вытянутом экране телефона берём среднее сторон, чтобы узлы заняли и высоту */
function restLen(){ return Math.max(110,Math.min(210,Math.sqrt(W*H)*.28)); }

function buildLevel(anim){
  const kids=levelChildren();
  const cxp=W/2, cyp=H/2;
  const Rx=Math.min(W*.34,Math.max(150,Math.min(W,H)*.32)), Ry=Math.min(H*.32,Math.max(130,Math.min(W,H)*.3));
  const arr=[];
  if(path.length){ hub=runtimeNode(curSector(),cxp,cyp,'hub'); arr.push(hub); }
  else { hub=runtimeNode(CORE_DEF,cxp,cyp,'core'); arr.push(hub); }
  kids.forEach((d,i)=>{
    const a=(i/kids.length)*Math.PI*2-Math.PI/2;
    arr.push(runtimeNode(d,cxp+Math.cos(a)*Rx*(.9+Math.random()*.2),cyp+Math.sin(a)*Ry*(.9+Math.random()*.2),'node'));
  });
  nodes=arr;
  const flyR=Math.hypot(W,H)*.62;
  arr.forEach(n=>{
    n.tx=n.x; n.ty=n.y;
    if(!n.isHub&&anim&&UID>=2){
      const ang=Math.atan2(n.y-cyp,n.x-cxp)+(Math.random()-.5)*.5;
      n.sx=cxp+Math.cos(ang)*flyR; n.sy=cyp+Math.sin(ang)*flyR;
      n.arcK=(Math.random()<.5?-1:1)*(60+Math.random()*90);
      n.x=n.sx; n.y=n.sy;
    } else { n.sx=n.x; n.sy=n.y; n.arcK=0; }
  });
  edges=[];
  for(let i=1;i<nodes.length;i++)edges.push(mkEdge(0,i,false));
  if(!path.length&&nodes.length>3)for(let i=1;i<nodes.length;i++)edges.push(mkEdge(i,i%(nodes.length-1)+1,true));
  nodes.forEach((n,i)=>{
    n.spawnT=0; n.spawned=false; n.spawning=false;
    if(anim)setTimeout(()=>{ n.spawning=true; },(n.isHub?0:i*90)+50);
    else { n.spawnT=1; n.spawned=true; n.spawning=true; }
  });
  bursts.length=0;
  buildLabels();
  buildMap();
  updateHeader();
  hideHUD();
  selected=null;
}

function descend(n){
  const def=n.def;
  nova(n.x,n.y,n.color); flashA=.5; tick(560,.07); spike=1;
  if(UID>=2){
    cam.t=1.3; chromPulse();
    setTimeout(()=>{ path.push(def); buildLevel(true); cam.z=.87; cam.t=1; },190);
  } else { path.push(def); buildLevel(true); }
}
function goBack(){
  if(!path.length){ goMain(); return; }
  flashA=.5; tick(330,.06); spike=.7;
  if(UID>=2){
    cam.t=.82;
    setTimeout(()=>{ path.pop(); buildLevel(true); cam.z=1.14; cam.t=1; },190);
  } else { path.pop(); buildLevel(true); }
}
function chromPulse(){
  if(UID<3)return;
  cv.style.filter='drop-shadow(2px 0 rgba(255,64,96,.4)) drop-shadow(-2px 0 rgba(77,175,255,.4))';
  setTimeout(()=>{ cv.style.filter=''; },240);
}

/* --- физика (как раньше, шаг рассчитан на 60 Гц) --- */
function physics(){
  const REP=22000*SC*SC, KS=.01, REST=restLen(), KC=.003, DMP=.93;
  const cxp=hub?hub.x:W/2, cyp=hub?hub.y:H/2;
  for(let i=0;i<nodes.length;i++){
    const a=nodes[i]; if(!a.spawned||a.hidden)continue;
    for(let j=i+1;j<nodes.length;j++){
      const b=nodes[j]; if(!b.spawned||b.hidden)continue;
      const dx=b.x-a.x, dy=b.y-a.y, d2=dx*dx+dy*dy+1, d=Math.sqrt(d2);
      const f=REP/d2, fx=dx/d*f, fy=dy/d*f;
      if(!a.pinned){a.vx-=fx;a.vy-=fy;}
      if(!b.pinned){b.vx+=fx;b.vy+=fy;}
    }
  }
  edges.forEach(e=>{
    const a=nodes[e.a], b=nodes[e.b];
    if(!a||!b||!a.spawned||!b.spawned||a.hidden||b.hidden)return;
    const dx=b.x-a.x, dy=b.y-a.y, d=Math.sqrt(dx*dx+dy*dy)+.01;
    const rest=e.faint?REST*1.05:REST;
    const f=(e.faint?KS*.35:KS)*(d-rest), fx=dx/d*f, fy=dy/d*f;
    if(!a.pinned){a.vx+=fx;a.vy+=fy;}
    if(!b.pinned){b.vx-=fx;b.vy-=fy;}
  });
  const top=70, bottom=H-(isCoarse?70:60);
  nodes.forEach(n=>{
    if(!n.spawned||n.hidden||n.pinned)return;
    if(n.dragging){n.vx=0;n.vy=0;return;}
    n.vx+=(cxp-n.x)*KC; n.vy+=(cyp-n.y)*KC;
    n.vx*=DMP; n.vy*=DMP; n.x+=n.vx; n.y+=n.vy;
    const p=n.radius+40*SC;
    if(n.x<p)n.vx+=(p-n.x)*.18;
    if(n.x>W-p)n.vx-=(n.x-(W-p))*.18;
    if(n.y<top+n.radius)n.vy+=(top+n.radius-n.y)*.18;
    if(n.y>bottom-n.radius-14)n.vy-=(n.y-(bottom-n.radius-14))*.18;
  });
  edges.forEach(e=>e.ps.forEach(p=>{ p.t+=.0025; if(p.t>1)p.t=0; }));
}

/* --- эффекты --- */
function nova(x,y,col){
  if(UID<2)return;
  novas.push({x:x,y:y,t:0,col:hex(col)});
  if(UID>=3)novas.push({x:x,y:y,t:-.15,col:[.92,.96,1]});
}
function burstSparks(x,y,col,k){ const c=hex(col); for(let i=0;i<k;i++){ const a=Math.random()*6.283, v=1.5+Math.random()*3.5; sparks.push({x:x,y:y,vx:Math.cos(a)*v,vy:Math.sin(a)*v,life:1,c:c}); } }
function fireWave(a){ wave.t=0; wave.amp=a; }
function waveBoost(x,y){
  if(wave.t>1)return 0;
  const cxp=hub?hub.x:W/2, cyp=hub?hub.y:H/2;
  const wr=wave.t*Math.hypot(W,H)*.5, d=Math.hypot(x-cxp,y-cyp);
  return Math.exp(-Math.pow((d-wr)/70,2))*wave.amp;
}
const _hexC={};
function hex(c){
  if(Array.isArray(c))return c;
  if(_hexC[c])return _hexC[c];
  const v=parseInt(c.slice(1),16);
  return (_hexC[c]=[(v>>16&255)/255,(v>>8&255)/255,(v&255)/255]);
}
function qpt(ax,ay,cpx,cpy,bx,by,t){ const u=1-t; return {x:u*u*ax+2*u*t*cpx+t*t*bx, y:u*u*ay+2*u*t*cpy+t*t*by}; }

/* --- портал --- */
const dzEl=document.getElementById('dz'), dztxt=document.getElementById('dztxt');
function dzCenter(){
  const r=dzEl.getBoundingClientRect();
  if(r.width>4)return {x:r.left+r.width/2,y:r.top+r.height/2};
  return {x:W/2,y:H-78};
}
function inDZ(x,y){
  const r=dzEl.getBoundingClientRect(), c={x:r.left+r.width/2,y:r.top+r.height/2};
  return (x-c.x)*(x-c.x)+(y-c.y)*(y-c.y)<(r.width/2)*(r.width/2);
}
function showDZ(){ dzEl.classList.add('on'); dztxt.innerHTML='◎<br>'+T('dz.portal'); }
function hideDZ(){ dzEl.classList.remove('on'); dzEl.style.background=''; dztxt.innerHTML='◎<br>'+T('dz.portal'); }
function s2w(x,y){ return {x:(x-W/2)/cam.z+W/2, y:(y-H/2)/cam.z+H/2}; }
function swallowThen(n,cb){
  const c=s2w(dzCenter().x,dzCenter().y);
  n.pinned=true;
  swallowing.push({n:n,cb:cb,t:0,ang:Math.atan2(n.y-c.y,n.x-c.x),r:Math.hypot(n.x-c.x,n.y-c.y),cx:c.x,cy:c.y,done:false});
  spike=1;
}
function updateSwallow(k){
  for(let i=swallowing.length-1;i>=0;i--){
    const sw=swallowing[i];
    sw.t=Math.min(1,sw.t+.05*k);
    const e=sw.t*sw.t, ang=sw.ang+e*4.2, rr=sw.r*(1-e);
    sw.n.x=sw.cx+Math.cos(ang)*rr; sw.n.y=sw.cy+Math.sin(ang)*rr; sw.n.swScale=1-e*.96;
    if(sw.t>=1&&!sw.done){
      sw.done=true; sw.n.hidden=true;
      nova(sw.cx,sw.cy,sw.n.color);
      if(UID>=2)burstSparks(sw.cx,sw.cy,sw.n.color,12);
      flashA=Math.max(flashA,.3);
      hideDZ();
      swallowing.splice(i,1);
      sw.cb();
    }
  }
}

/* --- открыть узел --- */
function openNode(n){
  if(!n||swallowing.length)return;
  if(n.role==='core'){ goMain(); return; }
  if(n.role==='hub'){ goBack(); return; }
  if(n.off){ showDZ(); portalReject(n); return; }
  hideHUD();
  showDZ();
  setTimeout(()=>swallowThen(n,()=>{
    if(n.container){ descend(n); return; }
    const d=n.def;
    if(!d.url)return;
    try{ sessionStorage.setItem('aceon_access','granted'); }catch(e){}
    if(d.external){ if(TR)TR.event('ext.'+d.id); window.open(d.url,'_blank','noopener'); setTimeout(()=>{ n.hidden=false; n.swScale=null; n.pinned=false; n.x=n.tx; n.y=n.ty; },600); return; }
    setTimeout(()=>openPage(d.url),380);
  }),n.dragging?0:120);
}
function portalReject(n){
  tick(120,.06);
  dzEl.style.background='rgba(255,64,96,.15)';
  dztxt.innerHTML='✕<br>'+T('dz.reject');
  dzEl.classList.add('rej');
  if(n){ n.vx=(Math.random()-.5)*6; n.vy=-6.5; n.glitchUntil=Date.now()+420; if(UID>=2)burstSparks(n.x,n.y,'#FF4060',14); }
  setTimeout(()=>{ dzEl.classList.remove('rej'); hideDZ(); },520);
}

/* --- пакеты по связям --- */
function scheduleBurst(){
  setTimeout(()=>{
    if(graphOn&&edges.length&&!document.hidden&&bursts.length<BURST_MAX){
      const vis=edges.filter(e=>{ const a=nodes[e.a],b=nodes[e.b]; return a&&b&&a.spawned&&b.spawned&&!a.hidden&&!b.hidden&&!e.faint; });
      if(vis.length)bursts.push({e:vis[(Math.random()*vis.length)|0],t:0,dir:Math.random()<.5,speed:.011+Math.random()*.009});
    }
    scheduleBurst();
  },(UID<2?3200:1200)+Math.random()*(UID<2?5200:2400));
}
function updateBursts(k){
  for(let i=bursts.length-1;i>=0;i--){
    const bz=bursts[i]; bz.t+=bz.speed*k;
    if(bz.t>=1){ const dest=bz.dir?nodes[bz.e.b]:nodes[bz.e.a]; if(dest&&!dest.hidden)dest.ripple=1; bursts.splice(i,1); }
  }
}
function scheduleGlitch(){
  setTimeout(()=>{
    if(graphOn&&!document.hidden){
      const cand=nodes.filter(n=>n.spawned&&!n.hidden&&!n.isHub);
      if(cand.length)cand[(Math.random()*cand.length)|0].glitchUntil=Date.now()+110+Math.random()*150;
    }
    scheduleGlitch();
  },(UID<2?2600:1300)+Math.random()*1900);
}
(function schWave(){ setTimeout(()=>{ if(graphOn&&UID>=2&&!document.hidden)fireWave(.5); schWave(); },16000+Math.random()*14000); })();
(function schStorm(){
  setTimeout(()=>{
    if(graphOn&&UID>=3&&!document.hidden){
      fireWave(1); setTimeout(()=>fireWave(.8),450); setTimeout(()=>fireWave(.6),900);
      for(let k=0;k<4;k++)setTimeout(()=>{
        if(edges.length&&bursts.length<BURST_MAX)bursts.push({e:edges[(Math.random()*edges.length)|0],t:0,dir:Math.random()<.5,speed:.02});
      },k*180);
    }
    schStorm();
  },38000+Math.random()*34000);
})();
document.addEventListener('visibilitychange',()=>{
  if(document.hidden)return;
  bursts.length=0; novas.length=0; sparks.length=0; wave.t=2; flashA=0; _lastF=0;
});

/* --- сборка геометрии кадра --- */
let edgeData=new Float32Array(4096), nodeData=new Float32Array(4096), spData=new Float32Array(2048), fxData=new Float32Array(1024);
function grow(arr,need){ if(arr.length>=need)return arr; let n=arr.length; while(n<need)n*=2; return new Float32Array(n); }
let eN=0;
function pushEdge(pts,ca,cb,hw,alpha){
  const need=(eN+(pts.length-1)*6)*9; edgeData=grow(edgeData,need);
  const nrm=[]; let along=[0];
  for(let i=0;i<pts.length;i++){
    const p0=pts[Math.max(0,i-1)], p1=pts[Math.min(pts.length-1,i+1)];
    let dx=p1.x-p0.x, dy=p1.y-p0.y; const l=Math.hypot(dx,dy)||1; nrm.push({x:-dy/l,y:dx/l});
    if(i>0)along.push(along[i-1]+Math.hypot(pts[i].x-pts[i-1].x,pts[i].y-pts[i-1].y));
  }
  const ext=hw+1.5;
  const tot=pts.length-1;
  for(let i=0;i<tot;i++){
    const A=pts[i], B=pts[i+1], nA=nrm[i], nB=nrm[i+1];
    const tA=i/tot, tB=(i+1)/tot;
    const cA=[ca[0]+(cb[0]-ca[0])*tA,ca[1]+(cb[1]-ca[1])*tA,ca[2]+(cb[2]-ca[2])*tA];
    const cB=[ca[0]+(cb[0]-ca[0])*tB,ca[1]+(cb[1]-ca[1])*tB,ca[2]+(cb[2]-ca[2])*tB];
    const v=[[A,nA,-1,along[i],cA],[A,nA,1,along[i],cA],[B,nB,-1,along[i+1],cB],[B,nB,-1,along[i+1],cB],[A,nA,1,along[i],cA],[B,nB,1,along[i+1],cB]];
    for(let j=0;j<6;j++){
      const q=v[j], o=eN*9;
      edgeData[o]=q[0].x+q[1].x*q[2]*ext; edgeData[o+1]=q[0].y+q[1].y*q[2]*ext;
      edgeData[o+2]=q[2]*ext; edgeData[o+3]=q[3]; edgeData[o+4]=hw;
      edgeData[o+5]=q[4][0]; edgeData[o+6]=q[4][1]; edgeData[o+7]=q[4][2]; edgeData[o+8]=alpha;
      eN++;
    }
  }
}
let sN=0;
function pushSp(x,y,size,shape,c,a){
  spData=grow(spData,(sN+1)*8);
  const o=sN*8; spData[o]=x; spData[o+1]=y; spData[o+2]=size; spData[o+3]=shape;
  spData[o+4]=c[0]; spData[o+5]=c[1]; spData[o+6]=c[2]; spData[o+7]=a; sN++;
}
const QUAD=[[-1,-1],[1,-1],[-1,1],[-1,1],[1,-1],[1,1]];
let nN=0;
function pushNode(n){
  const sp=easeOut(n.spawnT), scl=n.swScale==null?1:n.swScale;
  const r=n.radius*sp*scl*(1+.07*n.hotT);
  if(r<1)return;
  const quadR=Math.max(r*2.6,n.radius*2.6*(n.spawnT<1?1:0),r*1.55+20,r+34)+4;
  const glitch=n.glitchUntil>Date.now()&&!n.isHub;
  const kind=n.role==='core'?3:(n.role==='hub'?2:(n.container?1:0));
  const sats=n.container&&!n.isHub?Math.min(3,n.def.children.length):0;
  const beacon=(n.kind==='page'&&!n.off&&!visited(n.def))||(n.kind==='sector'&&sectorOpened(n.def)===0)?1:0;
  const c=hex(n.color);
  nodeData=grow(nodeData,(nN+6)*22);
  for(let j=0;j<6;j++){
    const o=nN*22, q=QUAD[j];
    nodeData[o]=q[0]; nodeData[o+1]=q[1];
    nodeData[o+2]=n.x; nodeData[o+3]=n.y; nodeData[o+4]=quadR; nodeData[o+5]=0;
    nodeData[o+6]=r; nodeData[o+7]=n.radius; nodeData[o+8]=kind; nodeData[o+9]=n.off?1:0;
    nodeData[o+10]=n.hotT; nodeData[o+11]=n.spawnT; nodeData[o+12]=n.ripple; nodeData[o+13]=glitch?(Math.random()-.5)*7:0;
    nodeData[o+14]=n.seed%1000; nodeData[o+15]=sats; nodeData[o+16]=beacon; nodeData[o+17]=n.seed%2?1:-1;
    nodeData[o+18]=c[0]; nodeData[o+19]=c[1]; nodeData[o+20]=c[2]; nodeData[o+21]=1;
    nN++;
  }
}
let fN=0;
function pushRing(x,y,R,w,a,c){
  fxData=grow(fxData,(fN+6)*14);
  const qr=R+w+3;
  for(let j=0;j<6;j++){
    const o=fN*14, q=QUAD[j];
    fxData[o]=q[0]; fxData[o+1]=q[1];
    fxData[o+2]=x; fxData[o+3]=y; fxData[o+4]=qr; fxData[o+5]=R;
    fxData[o+6]=w; fxData[o+7]=a; fxData[o+8]=0; fxData[o+9]=0;
    fxData[o+10]=c[0]; fxData[o+11]=c[1]; fxData[o+12]=c[2]; fxData[o+13]=1;
    fN++;
  }
}
function easeOut(t){ return 1-(1-t)*(1-t); }

function buildEdges(){
  eN=0;
  const dashOff=-(NOW*22)%16;
  edges.forEach(e=>{
    const a=nodes[e.a], b=nodes[e.b];
    if(!a||!b||!a.spawned||!b.spawned||a.hidden||b.hidden){ e._c=null; return; }
    const hot=a.hovered||b.hovered||a.dragging||b.dragging;
    const wb=waveBoost((a.x+b.x)/2,(a.y+b.y)/2);
    let al=Math.min(.95,(hot?.55:.2)+wb*.45);
    if(e.faint)al*=.45;
    const g=e.grow==null?1:e.grow;
    const ca=hex(a.color), cb=hex(b.color);
    const hw=((hot?1.7:.85)+wb*1.4)*.5;
    if(UID<2){
      pushEdge([{x:a.x,y:a.y},{x:a.x+(b.x-a.x)*g,y:a.y+(b.y-a.y)*g}],ca,cb,hw,al);
      e._c=false;
    } else {
      if(e.ex==null){ e.ex=(a.x+b.x)/2; e.ey=(a.y+b.y)/2; }
      const mx=(a.x+b.x)/2, my=(a.y+b.y)/2, dx=b.x-a.x, dy=b.y-a.y;
      e.ex+=(mx-dy*e.sag-e.ex)*.1; e.ey+=(my+dx*e.sag-e.ey)*.1;
      const N=14, M=Math.max(2,Math.round(N*g)), pts=[];
      for(let i=0;i<=M;i++)pts.push(qpt(a.x,a.y,e.ex,e.ey,b.x,b.y,i/N));
      pushEdge(pts,ca,cb,hw,al);
      if(g<1){ const p=pts[pts.length-1]; pushSp(p.x,p.y,5.2,0,[.81,.92,1],1); }
      e._c=true;
    }
    if(!e.faint)e.ps.forEach(p=>{
      const pt=e._c?qpt(a.x,a.y,e.ex,e.ey,b.x,b.y,p.t):{x:a.x+(b.x-a.x)*p.t,y:a.y+(b.y-a.y)*p.t};
      pushSp(pt.x,pt.y,hot?4.8:2.8,0,[.59,.86,1],hot?.85:.35);
    });
  });
  bursts.forEach(bz=>{
    const a=nodes[bz.e.a], b=nodes[bz.e.b];
    if(!a||!b||!a.spawned||!b.spawned||a.hidden||b.hidden)return;
    const e=bz.e;
    const P=t=>e._c?qpt(a.x,a.y,e.ex,e.ey,b.x,b.y,t):{x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t};
    const dt=bz.dir?bz.t:1-bz.t, TL=UID>=2?9:5;
    for(let k=1;k<=TL;k++){
      const tt=Math.max(0,Math.min(1,dt+(bz.dir?-1:1)*k*.03)), p=P(tt);
      pushSp(p.x,p.y,((1-k/TL)*2.4+.4)*2,0,[.59,.86,1],(1-k/TL)*.5);
    }
    const h=P(dt);
    pushSp(h.x,h.y,22,1,[.82,.95,1],.9);
    pushSp(h.x,h.y,5.2,0,[.92,.96,1],1);
  });
  return dashOff;
}

/* --- кадр --- */
let _lastF=0, _lastT=0;
const capMs=TIER.cap;
function frame(now){
  requestAnimationFrame(frame);
  if(document.hidden)return;
  if(capMs>17&&_lastF&&now-_lastF<capMs-1)return;
  const dt=_lastF?Math.min(.05,(now-_lastF)/1000):1/60;
  _lastF=now; NOW=now/1000;
  const k=dt*60;
  cam.z+=(cam.t-cam.z)*(1-Math.pow(.87,k));
  spike*=Math.pow(.965,k);
  agit+=(Math.max(drag?.6:.12,spike)-agit)*.05*k;
  vT+=dt*(1+agit*2.2);
  vortA+=((path.length===0&&graphOn?1:0)-vortA)*Math.min(1,dt*2.5);
  if(graphOn){
    const steps=Math.max(1,Math.min(3,Math.round(k)));
    for(let s=0;s<steps;s++)physics();
    updateBursts(k); updateSwallow(k);
  }
  if(wave.t<=1)wave.t+=.012*k;
  nodes.forEach(n=>{
    n.hotT+=(((n.hovered||n.dragging||n===selected||n.mapHl)?1:0)-n.hotT)*Math.min(1,.16*k);
    if(n.ripple>0)n.ripple=Math.max(0,n.ripple-.035*k);
    if(n.spawning&&n.spawnT<1){
      n.spawnT=Math.min(1,n.spawnT+.03*k);
      const tt=1-Math.pow(1-n.spawnT,3);
      if(n.arcK){
        const mx=(n.sx+n.tx)/2, my=(n.sy+n.ty)/2, dx=n.tx-n.sx, dy=n.ty-n.sy, L=Math.hypot(dx,dy)+.01;
        const cpx=mx-dy/L*n.arcK, cpy=my+dx/L*n.arcK, u=1-tt;
        n.x=u*u*n.sx+2*u*tt*cpx+tt*tt*n.tx; n.y=u*u*n.sy+2*u*tt*cpy+tt*tt*n.ty;
      }
      if(n.spawnT>=1){ n.spawned=true; n.x=n.tx; n.y=n.ty; }
    }
  });
  edges.forEach(e=>{ const a=nodes[e.a], b=nodes[e.b]; if(a&&b&&a.spawned&&b.spawned&&e.grow<1)e.grow=Math.min(1,e.grow+.03*k); });
  if(UID>=3&&drag){
    const c=s2w(dzCenter().x,dzCenter().y), d=Math.hypot(drag.x-c.x,drag.y-c.y);
    if(d<170){ drag.x+=(c.x-drag.x)*.05*(1-d/170); drag.y+=(c.y-drag.y)*.05*(1-d/170); }
  }
  dzT+=((dzEl.classList.contains('on')?1:0)-dzT)*Math.min(1,.14*k);
  if(flashA>0)flashA=Math.max(0,flashA-.022*k);
  if(emergeT>=0&&emergeT<=1)emergeT=Math.min(1.01,emergeT+.02*k);

  if(GLOK)render(k);
  updateLabels();
  if(scopeActive)scopeDraw();
}

function render(k){
  gl.viewport(0,0,cv.width,cv.height);
  gl.disable(gl.BLEND);
  /* фон */
  let pg=PG.bg; gl.useProgram(pg.p); attribs(BUF.tri,[2]);
  gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D,nebTex);
  gl.uniform1i(U(pg,'uNeb'),0);
  gl.uniform2f(U(pg,'uRes'),W,H); gl.uniform1f(U(pg,'uDpr'),DPR); gl.uniform1f(U(pg,'uZ'),cam.z);
  gl.uniform2f(U(pg,'uPm'),UID>=2?pmx:0,UID>=2?pmy:0); gl.uniform1f(U(pg,'uGridPar'),UID>=2?26:0);
  gl.drawArrays(gl.TRIANGLES,0,3);

  gl.enable(gl.BLEND); gl.blendFunc(gl.ONE,gl.ONE_MINUS_SRC_ALPHA);
  pg=PG.star; gl.useProgram(pg.p); attribs(BUF.star,[4]);
  gl.uniform2f(U(pg,'uRes'),W,H); gl.uniform1f(U(pg,'uT'),NOW); gl.uniform1f(U(pg,'uDpr'),DPR);
  gl.uniform1f(U(pg,'uLow'),UID<2?1:0); gl.uniform2f(U(pg,'uPm'),pmx,pmy);
  gl.drawArrays(gl.POINTS,0,TIER.stars);

  if(vortA>.01&&hub){
    pg=PG.vort; gl.useProgram(pg.p); attribs(BUF.vort,[4]);
    gl.uniform2f(U(pg,'uRes'),W,H); gl.uniform2f(U(pg,'uC'),hub.x-pmx*6,hub.y-pmy*6);
    gl.uniform1f(U(pg,'uVT'),vT); gl.uniform1f(U(pg,'uDpr'),DPR); gl.uniform1f(U(pg,'uAlpha'),vortA);
    gl.uniform1f(U(pg,'uAgit'),agit); gl.uniform1f(U(pg,'uZ'),cam.z);
    gl.drawArrays(gl.POINTS,0,TIER.vortex);
  }

  /* мир: связи, пакеты, узлы */
  sN=0;
  const dashOff=buildEdges();
  const sA=sN;
  const px=1/(DPR*cam.z);
  if(UID>=3)gl.blendFunc(gl.ONE,gl.ONE);
  if(eN){
    pg=PG.edge; gl.useProgram(pg.p);
    gl.bindBuffer(gl.ARRAY_BUFFER,BUF.edge); gl.bufferData(gl.ARRAY_BUFFER,edgeData.subarray(0,eN*9),gl.DYNAMIC_DRAW);
    attribs(BUF.edge,[2,3,4]);
    gl.uniform2f(U(pg,'uRes'),W,H); gl.uniform1f(U(pg,'uZ'),cam.z); gl.uniform1f(U(pg,'uPx'),px);
    gl.uniform1f(U(pg,'uDashOff'),dashOff); gl.uniform1f(U(pg,'uDashed'),1);
    gl.drawArrays(gl.TRIANGLES,0,eN);
  }
  /* искры и всасывание рисуются поверх узлов, пакеты под ними */
  for(let i=sparks.length-1;i>=0;i--){
    const p=sparks[i]; p.x+=p.vx*k; p.y+=p.vy*k; p.vx*=Math.pow(.92,k); p.vy*=Math.pow(.92,k); p.life-=.035*k;
    if(p.life<=0){ sparks.splice(i,1); continue; }
    pushSp(p.x,p.y,1.8,2,p.c,p.life*.8);
  }
  if(UID>=3&&drag){
    const c=s2w(dzCenter().x,dzCenter().y), d=Math.hypot(drag.x-c.x,drag.y-c.y);
    if(d<220)for(let i=0;i<7;i++){
      const t=(NOW*1.4+i/7)%1;
      pushSp(drag.x+(c.x-drag.x)*t,drag.y+(c.y-drag.y)*t,2.4*(1-t)+.6,2,[.74,.9,1],dzT*(1-t)*.55*(1-d/220));
    }
  }
  pg=PG.sp; gl.useProgram(pg.p);
  if(sN){
    gl.bindBuffer(gl.ARRAY_BUFFER,BUF.sp); gl.bufferData(gl.ARRAY_BUFFER,spData.subarray(0,sN*8),gl.DYNAMIC_DRAW);
    attribs(BUF.sp,[2,2,4]);
    gl.uniform2f(U(pg,'uRes'),W,H); gl.uniform1f(U(pg,'uZ'),cam.z); gl.uniform1f(U(pg,'uDpr'),DPR);
    if(sA)gl.drawArrays(gl.POINTS,0,sA);
  }
  gl.blendFunc(gl.ONE,gl.ONE_MINUS_SRC_ALPHA);

  nN=0;
  nodes.forEach(n=>{ if(!n.hidden)pushNode(n); });
  if(nN){
    pg=PG.node; gl.useProgram(pg.p);
    gl.bindBuffer(gl.ARRAY_BUFFER,BUF.node); gl.bufferData(gl.ARRAY_BUFFER,nodeData.subarray(0,nN*22),gl.DYNAMIC_DRAW);
    attribs(BUF.node,[2,4,4,4,4,4]);
    gl.uniform2f(U(pg,'uRes'),W,H); gl.uniform1f(U(pg,'uZ'),cam.z); gl.uniform1f(U(pg,'uPx'),px); gl.uniform1f(U(pg,'uT'),NOW);
    gl.drawArrays(gl.TRIANGLES,0,nN);
  }
  fN=0;
  for(let i=novas.length-1;i>=0;i--){
    const nv=novas[i]; nv.t+=.024*k;
    if(nv.t<=0)continue;
    if(nv.t>=1){ novas.splice(i,1); continue; }
    pushRing(nv.x,nv.y,nv.t*Math.max(W,H)*.55,1.5+(1-nv.t)*2,(1-nv.t)*.43,nv.col);
  }
  if(fN){
    pg=PG.fx; gl.useProgram(pg.p);
    gl.bindBuffer(gl.ARRAY_BUFFER,BUF.fx); gl.bufferData(gl.ARRAY_BUFFER,fxData.subarray(0,fN*14),gl.DYNAMIC_DRAW);
    attribs(BUF.fx,[2,4,4,4]);
    gl.uniform2f(U(pg,'uRes'),W,H); gl.uniform1f(U(pg,'uZ'),cam.z); gl.uniform1f(U(pg,'uPx'),px);
    gl.drawArrays(gl.TRIANGLES,0,fN);
  }
  if(sN>sA){
    pg=PG.sp; gl.useProgram(pg.p); attribs(BUF.sp,[2,2,4]);
    gl.uniform2f(U(pg,'uRes'),W,H); gl.uniform1f(U(pg,'uZ'),cam.z); gl.uniform1f(U(pg,'uDpr'),DPR);
    gl.drawArrays(gl.POINTS,sA,sN-sA);
  }
  /* портал */
  if(dzT>.02){
    const c=dzCenter();
    pg=PG.port; gl.useProgram(pg.p); attribs(BUF.quad,[2]);
    gl.uniform2f(U(pg,'uRes'),W,H); gl.uniform2f(U(pg,'uC'),c.x,c.y);
    gl.uniform1f(U(pg,'uT'),NOW); gl.uniform1f(U(pg,'uDz'),dzT); gl.uniform1f(U(pg,'uPx'),1/DPR); gl.uniform1f(U(pg,'uDots'),UID>=2?1:0);
    gl.drawArrays(gl.TRIANGLES,0,6);
  }
  /* выход из червоточины и вспышка */
  if(holdBlack||(emergeT>=0&&emergeT<=1)||flashA>0){
    pg=PG.ov; gl.useProgram(pg.p); attribs(BUF.tri,[2]);
    gl.uniform2f(U(pg,'uRes'),W,H); gl.uniform1f(U(pg,'uDpr'),DPR); gl.uniform1f(U(pg,'uT'),NOW);
    gl.uniform1f(U(pg,'uHold'),holdBlack?1:0); gl.uniform1f(U(pg,'uEm'),(emergeT>=0&&emergeT<=1)?emergeT:-1);
    gl.uniform1f(U(pg,'uFlash'),flashA); gl.uniform1f(U(pg,'uN'),UID>=2?46:22);
    gl.drawArrays(gl.TRIANGLES,0,3);
  }
}

/* --- подписи --- */
const labelsEl=document.getElementById('labels');
function capText(d){
  if(d.kind==='core')return T('core.tag');
  if(d.kind==='sector'){
    const t=liveKids(d).length;
    if(W<560)return '<i>'+sectorOpened(d)+' / '+t+'</i>';
    return T('sd.'+d.sid).split(/[,.]/)[0]+' <i>· '+t+'</i>';
  }
  if(d.status==='soon')return T('st.soon');
  const st=d.status==='beta'?T('st.beta')+' · ':(d.status==='dev'?T('st.dev')+' · ':'');
  return st+L(d.tag);
}
function buildLabels(){
  labelsEl.innerHTML='';
  nodes.forEach(n=>{
    const d=n.def, el=document.createElement('div');
    el.className='nl'+(n.off?' off':'');
    el.style.setProperty('--c',n.color);
    const r=n.radius;
    let inner='';
    if(n.kind==='sector')inner+='<svg class="nl-ico" viewBox="0 0 24 24" style="width:'+Math.round(r*.42)+'px;height:'+Math.round(r*.42)+'px">'+(ICONS[d.icon]||'')+'</svg>';
    /* размер шрифта: самое длинное слово должно влезть в орб, иначе уменьшаем */
    const maxW=r*1.7, longest=Math.max.apply(null,nodeName(d).split(/\s+/).map(w=>w.length));
    let fs=n.role==='core'?Math.max(11,r*.28):(n.kind==='sector'?Math.max(9,r*.26):Math.max(9,r*.3));
    fs=Math.max(7.5,Math.min(fs,maxW/(longest*.66)));
    inner+='<div class="nl-name" style="font-size:'+fs.toFixed(1)+'px;max-width:'+Math.round(maxW)+'px"></div>';
    if(n.isHub)inner+='<div class="nl-back" style="font-size:'+Math.max(8,r*.16).toFixed(1)+'px"></div>';
    el.innerHTML='<div class="nl-in">'+inner+'</div>'+
      (n.isHub?'':'<div class="nl-cap" style="top:'+Math.round(r+15)+'px"></div>')+
      '<div class="nl-new" style="top:'+Math.round(-r-(n.kind==='page'&&!visited(d)?34:22))+'px"></div>';
    labelsEl.appendChild(el);
    n.el=el;
  });
  fillLabels();
}
function fillLabels(){
  nodes.forEach(n=>{
    if(!n.el)return;
    const d=n.def;
    n.el.querySelector('.nl-name').textContent=nodeName(d);
    const back=n.el.querySelector('.nl-back');
    if(back)back.textContent='◄ '+(n.role==='core'?T('core.back'):T('hub.back'));
    const cap=n.el.querySelector('.nl-cap');
    if(cap)cap.innerHTML=capText(d);
    const nw=n.el.querySelector('.nl-new');
    nw.textContent=T('new'); nw.style.display=(!n.isHub&&isNew(d))?'':'none';
  });
}
function updateLabels(){
  const z=cam.z;
  nodes.forEach(n=>{
    const el=n.el; if(!el)return;
    const sp=easeOut(n.spawnT), scl=n.swScale==null?1:n.swScale;
    const ta=n.hidden?0:Math.max(0,sp*2-1)*Math.max(0,scl*1.4-.4);
    if(ta<=.01){ if(el.style.opacity!=='0')el.style.opacity='0'; return; }
    const gj=(n.glitchUntil>Date.now()&&!n.isHub)?(Math.random()-.5)*5:0;
    const x=(n.x-W/2)*z+W/2+gj, y=(n.y-H/2)*z+H/2;
    const s=z*sp*scl*(1+.07*n.hotT);
    el.style.transform='translate('+x.toFixed(1)+'px,'+y.toFixed(1)+'px) scale('+s.toFixed(3)+')';
    el.style.opacity=ta.toFixed(2);
  });
}

/* --- карта слева --- */
const mapEl=document.getElementById('map'), mapList=document.getElementById('map-list');
function buildMap(){
  mapList.innerHTML='';
  if(path.length){
    const b=document.createElement('div'); b.className='mi back';
    b.innerHTML='<span class="mi-n"></span>'; b.firstChild.textContent=T('map.core');
    b.addEventListener('click',goBack); mapList.appendChild(b);
  }
  nodes.forEach(n=>{
    if(n.isHub)return;
    const d=n.def, it=document.createElement('div');
    it.className='mi'+(n.off?' off':''); it.style.setProperty('--c',n.color);
    let side='';
    if(d.kind==='sector')side=sectorOpened(d)+'/'+liveKids(d).length;
    else if(d.status==='beta')side=T('st.beta');
    else if(d.status==='dev')side=T('st.dev');
    it.innerHTML='<span class="mi-d"></span><span class="mi-n"></span>'+(isNew(d)?'<span class="mi-new"></span>':'')+'<span class="mi-s"></span>';
    it.querySelector('.mi-n').textContent=nodeName(d);
    it.querySelector('.mi-s').textContent=side;
    const nw=it.querySelector('.mi-new'); if(nw)nw.textContent=T('new');
    it.addEventListener('mouseenter',()=>{ n.mapHl=true; });
    it.addEventListener('mouseleave',()=>{ n.mapHl=false; });
    it.addEventListener('click',()=>{ n.mapHl=false; mapEl.classList.remove('open'); if(GLOK)openNode(n); else openDirect(d); });
    mapList.appendChild(it);
  });
  document.getElementById('map-t').textContent=path.length?nodeName(curSector()):T('map.title');
}
function openDirect(d){
  if(d.kind==='sector'){ path.push(d); buildLevel(false); return; }
  if(d.status==='soon'||!d.url)return;
  if(d.external){ if(TR)TR.event('ext.'+d.id); window.open(d.url,'_blank','noopener'); return; }
  openPage(d.url);
}
document.getElementById('map-toggle').addEventListener('click',()=>mapEl.classList.toggle('open'));

/* --- шапка --- */
function updateHeader(){
  const hst=document.getElementById('hst');
  const count=levelChildren().length;
  if(!path.length){
    hst.innerHTML=(PORTAL?'<span class="crumb-back">◄ MAIN</span> / ':'')+'NETWORK · '+T('hdr.sectors',{n:count});
    const b=hst.querySelector('.crumb-back'); if(b)b.onclick=requestPortalClose;
  } else {
    hst.innerHTML='<span class="crumb-back">◄ NETWORK</span> / <span class="crumb-here"></span> · '+T('hdr.nodes',{n:count});
    hst.querySelector('.crumb-here').textContent=nodeName(curSector());
    hst.querySelector('.crumb-back').onclick=()=>{ if(path.length){ path=[]; flashA=.5; tick(300,.06); buildLevel(true); } };
  }
}

/* --- подсказка --- */
const hudEl=document.getElementById('hud');
let scopeActive=false, scopeColor='#4DAFFF', hudNode=null;
function memLine(d){
  if(d.kind==='sector')return T('mem.left',{n:sectorOpened(d),t:liveKids(d).length});
  const v=visitOf(d);
  if(!v)return '';
  if(!v.n)return T('mem.never');
  if(v.ext)return v.n+'x';
  const days=Math.floor((Date.now()-v.last)/DAY);
  let s=days<1?T('mem.today',{n:v.n}):T('mem.days',{d:days,n:v.n});
  if(v.t>=60)s+=' · '+T('mem.time',{m:Math.round(v.t/60)});
  return s;
}
function fillHUD(n,touch){
  const d=n.def;
  hudNode=n;
  hudEl.style.setProperty('--hc',n.color);
  document.getElementById('hname').textContent=nodeName(d);
  document.getElementById('k-type').textContent=T('k.type');
  document.getElementById('k-stat').textContent=T('k.status');
  document.getElementById('k-trace').textContent=T('k.trace');
  let tag,type='',desc='',act='',drg='';
  const st=d.kind==='page'?d.status||'live':'live';
  if(n.role==='core'){ tag=T('tag.core'); desc=T('core.desc'); act=T('act.core'); }
  else if(n.role==='hub'){ tag=T('tag.hub'); desc=T('sd.'+d.sid); act=T('act.hub'); }
  else if(d.kind==='sector'){ tag=T('tag.sector'); type=T('type.sector',{n:liveKids(d).length}); desc=T('sd.'+d.sid); act=T('act.sector'); drg=T('act.drag'); }
  else { tag=T('tag.page'); type=d.external?T('type.ext'):T('type.page'); desc=L(d.desc); act=n.off?T('act.soon'):(d.external?T('act.ext'):T('act.page')); drg=n.off?'':T('act.drag'); }
  if(touch&&!n.off)act=T('act.tap');
  document.getElementById('htag').textContent=tag;
  document.getElementById('htype').textContent=type;
  document.getElementById('r-type').classList.toggle('hide',!type);
  const dot=document.getElementById('hsdot'), stx=document.getElementById('hstxt');
  const sc={live:'#3DFFB4',beta:'#FFD060',dev:'#FF9F43',soon:'#FF6060'}[st];
  dot.style.cssText='background:'+sc+';box-shadow:0 0 5px '+sc;
  stx.textContent=T('st.'+st); stx.style.color=st==='live'?'':sc;
  document.getElementById('r-stat').classList.toggle('hide',n.isHub);
  const mem=n.isHub?'':memLine(d);
  document.getElementById('htrace').textContent=mem;
  document.getElementById('r-trace').classList.toggle('hide',!mem);
  document.getElementById('hdesc').textContent=desc;
  document.getElementById('hact').textContent=act;
  document.getElementById('hdrag').textContent=isCoarse?'':drg;
  scopeColor=n.color;
}
function placeHUD(x,y){
  const w=hudEl.offsetWidth||260, h=hudEl.offsetHeight||180;
  let lx=x+28, ly=y-16;
  if(lx+w>W-8)lx=x-w-28;
  if(ly+h>H-8)ly=H-h-8;
  hudEl.style.left=Math.max(8,lx)+'px'; hudEl.style.top=Math.max(56,ly)+'px';
}
function showHUD(n,x,y,touch){ fillHUD(n,touch); hudEl.classList.add('on'); placeHUD(x,y); scopeActive=true; }
function hideHUD(){ hudEl.classList.remove('on'); scopeActive=false; hudNode=null; }
let _scopeCx=null;
function scopeDraw(){
  const c=document.getElementById('hscope'); if(!_scopeCx)_scopeCx=c.getContext('2d');
  const w=c.width, h=c.height, t=performance.now()*.006, g=_scopeCx;
  g.clearRect(0,0,w,h);
  g.strokeStyle='rgba(77,175,255,.12)'; g.lineWidth=1; g.beginPath(); g.moveTo(0,h/2); g.lineTo(w,h/2); g.stroke();
  g.beginPath();
  for(let x=0;x<=w;x+=2){ const p=x/w, y=h/2+Math.sin(p*15+t)*(h*.3)*Math.sin(t*.6+p*3)+(Math.random()-.5)*2; x===0?g.moveTo(x,y):g.lineTo(x,y); }
  g.strokeStyle=scopeColor; g.lineWidth=1.2; g.stroke();
  const hx=(t*11)%w; g.beginPath(); g.moveTo(hx,0); g.lineTo(hx,h); g.strokeStyle=scopeColor+'55'; g.stroke();
}

/* --- ввод: мышь и касания через pointer events --- */
let drag=null, press=null, selected=null, trailT=0;
function nodeAt(x,y){
  for(let i=nodes.length-1;i>=0;i--){
    const n=nodes[i]; if(!n.spawned||n.hidden)continue;
    const dx=x-n.x, dy=y-n.y, rr=n.radius+(isCoarse?10:0);
    if(dx*dx+dy*dy<rr*rr)return n;
  }
  return null;
}
cv.addEventListener('pointerdown',e=>{
  if(!graphOn||swallowing.length)return;
  const wp=s2w(e.clientX,e.clientY), n=nodeAt(wp.x,wp.y);
  if(!n){ if(selected){ selected=null; hideHUD(); } return; }
  press={n:n,x:e.clientX,y:e.clientY,type:e.pointerType};
  try{ cv.setPointerCapture(e.pointerId); }catch(er){}
});
cv.addEventListener('pointermove',e=>{
  const wp=s2w(e.clientX,e.clientY);
  if(press&&!drag){
    const moved=Math.hypot(e.clientX-press.x,e.clientY-press.y);
    if(moved>(press.type==='mouse'?6:12)&&!press.n.isHub){
      drag=press.n; drag.dragging=true; drag.trail=[]; selected=null;
      cv.classList.add('grab'); hideHUD(); showDZ();
      if(UID>=2)burstSparks(drag.x,drag.y,drag.color,10);
      tick(440,.08);
    }
  }
  if(drag){
    drag.x=wp.x; drag.y=wp.y;
    const over=inDZ(e.clientX,e.clientY);
    dzEl.style.background=over?'rgba(77,175,255,.14)':'';
    dztxt.innerHTML=over?(drag.off?'✕<br>'+T('dz.reject'):(drag.container?'⊞<br>'+T('dz.open'):'◎<br>'+T('dz.open'))):'◎<br>'+T('dz.portal');
    return;
  }
  if(e.pointerType!=='mouse')return;
  nodes.forEach(n=>n.hovered=false);
  const h=nodeAt(wp.x,wp.y);
  if(h){
    h.hovered=true; cv.classList.add('hov');
    if(hudNode!==h)fillHUD(h,false);
    hudEl.classList.add('on'); placeHUD(e.clientX,e.clientY); scopeActive=true;
  } else { cv.classList.remove('hov'); if(!selected)hideHUD(); }
});
function pointerEnd(e){
  const p=press; press=null;
  if(drag){
    const d=drag; d.dragging=false; d.trail=[]; drag=null;
    cv.classList.remove('grab');
    if(inDZ(e.clientX,e.clientY)){
      if(d.off){ portalReject(d); return; }
      openNode(d);
    } else { d.vx=(Math.random()-.5)*3; d.vy=(Math.random()-.5)*3; tick(220,.05); hideDZ(); }
    return;
  }
  if(!p)return;
  const wp=s2w(e.clientX,e.clientY), n=nodeAt(wp.x,wp.y);
  if(n!==p.n)return;
  if(p.type!=='mouse'&&!n.isHub){
    /* касание: первый тап показывает подсказку, второй открывает */
    if(selected!==n){
      selected=n; nodes.forEach(m=>m.hovered=false);
      const sx=(n.x-W/2)*cam.z+W/2, sy=(n.y-H/2)*cam.z+H/2;
      showHUD(n,Math.min(sx+n.radius*.6,W-250),sy-n.radius-40,true);
      tick(520,.04);
      return;
    }
  }
  selected=null; hideHUD();
  openNode(n);
}
cv.addEventListener('pointerup',pointerEnd);
cv.addEventListener('pointercancel',()=>{ press=null; if(drag){ drag.dragging=false; drag=null; cv.classList.remove('grab'); hideDZ(); } });
cv.addEventListener('pointerleave',e=>{ if(e.pointerType==='mouse'&&!drag){ nodes.forEach(n=>n.hovered=false); if(!selected)hideHUD(); } });
document.addEventListener('keydown',e=>{
  if(e.key==='Escape'){ if(langMenu.classList.contains('on')){ langMenu.classList.remove('on'); return; } goBack(); }
});

/* --- звук: щелчки и фоновая музыка (громкость общая для сайта) --- */
let ac=null;
function tick(freq,vol){
  try{
    if(!ac)ac=new (window.AudioContext||window.webkitAudioContext)();
    const o=ac.createOscillator(), g=ac.createGain();
    o.connect(g); g.connect(ac.destination);
    o.frequency.value=freq; o.type='sine';
    g.gain.setValueAtTime(vol,ac.currentTime);
    g.gain.exponentialRampToValueAtTime(.001,ac.currentTime+.11);
    o.start(); o.stop(ac.currentTime+.11);
  }catch(e){}
}
const BGM_TRACKS=['../audio/Связи.mp3','../audio/Связи (female).mp3'];
const bgm=new Audio(); bgm.volume=0; bgm.loop=true;
const bgmBtn=document.getElementById('bgm-btn');
let bgmStarted=false, bgmFade=null;
function siteMusic(){ const v=(hasI18n?Store.get('site'):readSite()).music; return typeof v==='number'?v:.6; }
function saveMusic(v){ if(hasI18n){ Store.get('site').music=v; Store.save('site'); } else { const o=readSite(); o.music=v; writeSite(o); } }
function bgmTarget(){ return Math.min(1,siteMusic())*.75; }
function fadeBgm(to,done){
  clearInterval(bgmFade);
  bgmFade=setInterval(()=>{
    let v=bgm.volume; v=to>v?Math.min(to,v+.02):Math.max(to,v-.05); bgm.volume=v;
    if(v===to){ clearInterval(bgmFade); if(done)done(); }
  },120);
}
function bgmUI(){ const on=bgmStarted&&!bgm.paused; bgmBtn.classList.toggle('muted',!on); bgmBtn.textContent=on?'♫':'♪'; }
function startBGM(force){
  if(bgmStarted)return;
  if(!force&&siteMusic()<=0){ bgmUI(); return; }
  bgmStarted=true;
  bgm.src=BGM_TRACKS[Math.floor(Math.random()*BGM_TRACKS.length)];
  const p=bgm.play();
  if(p&&p.then)p.then(()=>{ fadeBgm(bgmTarget()); bgmUI(); }).catch(()=>{ bgmStarted=false; bgmUI(); });
}
bgm.addEventListener('play',bgmUI); bgm.addEventListener('pause',bgmUI);
bgmBtn.addEventListener('click',e=>{
  e.stopPropagation();
  if(!bgmStarted||bgm.paused){
    if(siteMusic()<=0){ let pv=.6; try{ pv=parseFloat(localStorage.getItem('aceon_home_mvol'))||.6; }catch(er){} saveMusic(pv); }
    if(TR)TR.event('music.on');
    if(!bgmStarted)startBGM(true); else { bgm.play().catch(()=>{}); fadeBgm(bgmTarget()); }
  } else {
    if(TR)TR.event('music.off');
    try{ localStorage.setItem('aceon_home_mvol',String(siteMusic())); }catch(er){}
    saveMusic(0);
    fadeBgm(0,()=>bgm.pause());
  }
});
['pointerdown','keydown'].forEach(ev=>document.addEventListener(ev,()=>startBGM(false),{once:true,passive:true}));

/* --- язык в шапке --- */
const langBtn=document.getElementById('langbtn'), langMenu=document.getElementById('langmenu');
LANGS.forEach(c=>{
  const b=document.createElement('button'); b.type='button'; b.setAttribute('data-l',c);
  b.innerHTML='<b>'+c.toUpperCase()+'</b><span></span>'; b.lastChild.textContent=LANG_NAMES[c];
  b.addEventListener('click',()=>{ langMenu.classList.remove('on'); setLang(c); });
  langMenu.appendChild(b);
});
langBtn.addEventListener('click',e=>{ e.stopPropagation(); langMenu.classList.toggle('on'); });
document.addEventListener('click',()=>langMenu.classList.remove('on'));

function applyTexts(){
  langBtn.textContent=lang().toUpperCase();
  langBtn.title=T('lang.title');
  langMenu.querySelectorAll('button').forEach(b=>b.classList.toggle('sel',b.getAttribute('data-l')===lang()));
  bgmBtn.title=T('music.toggle');
  document.getElementById('hint').textContent=isCoarse?T('hint.touch'):T('hint');
  document.getElementById('map-toggle').textContent='≡ '+T('map.toggle');
  document.getElementById('nogl-note').textContent=T('nogl');
  if(!dzEl.classList.contains('on'))dztxt.innerHTML='◎<br>'+T('dz.portal');
  if(nodes.length)buildLabels(); buildMap(); updateHeader();
  if(hudNode)fillHUD(hudNode,!!selected);
}

/* --- боковые метки --- */
(function(){
  const L1=['SIG·07','0x1A3F','PKT·042','NODE·9','SCAN··','440HZ·','ERR·0·','LAT·12'];
  const R1=['MEM·74%','CPU·031','0xFF2A','CONN·4','TX··OK','RX··OK','0xA3B1','BUF·88'];
  const n=Math.max(3,Math.floor((H-176)/70));
  ['sideL','sideR'].forEach((id,k)=>{
    const el=document.getElementById(id);
    for(let i=0;i<n;i++){ const s=document.createElement('span'); s.textContent=(k?R1:L1)[i%8]; s.style.animationDelay=(-(i*(k?1.1:.85))%9)+'s'; el.appendChild(s); }
  });
})();

/* --- шёпот: узел замечает, куда человек не заходил --- */
const whisperEl=document.getElementById('whisper');
function whisper(){
  if(!TR||reduceMotion)return;
  const D=TR.data();
  if((D.sessions||0)<2)return;
  try{ if(sessionStorage.getItem('aceon_core_w'))return; }catch(e){}
  const pages=PAGES.filter(p=>p.status!=='soon'&&p.url&&!p.external);
  const fresh=pages.filter(p=>isNew(Object.assign({kind:'page'},p)));
  let key=null, p=null;
  if(fresh.length){ p=fresh[0]; key='whisper.new'; }
  else if(Math.random()<.35){
    const closed=pages.filter(q=>!visited(Object.assign({kind:'page'},q)));
    if(closed.length){ p=closed[(Math.random()*closed.length)|0]; key='whisper.door'; }
  }
  if(!p)return;
  const mk='core.'+key+':'+p.id;
  if(Date.now()-TR.seen(mk)<3*DAY)return;
  TR.mark(mk);
  try{ sessionStorage.setItem('aceon_core_w','1'); }catch(e){}
  const text=T(key,{sec:L(p.name)||p.id});
  const g='!<>_[]{}=+#▓▒░╳~';
  let i=0;
  whisperEl.classList.add('on');
  const iv=setInterval(()=>{
    i++;
    whisperEl.textContent=text.slice(0,i).split('').map(c=>c!==' '&&Math.random()<.3?g[Math.random()*g.length|0]:c).join('');
    if(i>=text.length){
      clearInterval(iv); whisperEl.textContent=text;
      const sec=nodes.find(n=>n.def&&(n.def.sid===p.sector)&&n.kind==='sector');
      if(sec)sec.glitchUntil=Date.now()+900;
      setTimeout(()=>{ whisperEl.classList.remove('on'); },2600+text.length*30);
    }
  },45);
}

/* --- загрузка --- */
const GID=Math.random().toString(36).substr(2,8).toUpperCase();
const LINES=[
  {t:'A.C.EON  NETWORK   v3.0',                 c:'ca', d:0},
  {t:'RE-ENTRY DETECTED: COLD PATH',            c:'cy', d:240},
  {t:'> SIGNAL RE-SYNC.......................', c:'',   d:560,  sx:'OK',    sc:'cg'},
  {t:'> WORMHOLE RESIDUE.....................', c:'',   d:1050, sx:'TRACE', sc:'cy'},
  {t:'> USER_ID  :  GUEST_'+GID,                c:'ca', d:1430},
  {t:'> RESTORING NODE MAP...................', c:'',   d:1770, sx:'OK',    sc:'cg'}
];
function addLine(cfg){
  const wrap=document.getElementById('pg'), div=document.createElement('div');
  div.className='tl '+(cfg.c||'');
  if(cfg.sx){ const l=document.createElement('span'); l.textContent=cfg.t; const r=document.createElement('span'); r.textContent=cfg.sx; r.className=cfg.sc; div.appendChild(l); div.appendChild(r); }
  else div.textContent=cfg.t;
  document.getElementById('term').insertBefore(div,wrap);
  requestAnimationFrame(()=>div.classList.add('on'));
  return div;
}
let curLine=null;
function runLoader(){
  if(TR&&TR.data().sessions>1)LINES.splice(4,0,{t:'> TRACE FOUND: SESSION '+String(TR.data().sessions).padStart(2,'0'),c:'cg',d:1600});
  LINES.forEach((cfg,i)=>setTimeout(()=>{
    if(curLine)curLine.classList.remove('cur');
    curLine=addLine(cfg);
    if(i<LINES.length-1)curLine.classList.add('cur');
  },cfg.d));
  const last=LINES[LINES.length-1].d+200;
  setTimeout(()=>{
    if(curLine)curLine.classList.remove('cur');
    document.getElementById('pg').classList.add('on');
    let pct=0; const fill=document.getElementById('pgf'), pe=document.getElementById('pgp');
    const iv=setInterval(()=>{
      pct=Math.min(100,pct+Math.random()*3.2+.8); fill.style.width=pct+'%'; pe.textContent=Math.floor(pct)+'%';
      if(pct>=100){ clearInterval(iv); pe.textContent='100%'; setTimeout(()=>{ document.getElementById('acc').classList.add('on'); setTimeout(startGraph,480); },300); }
    },22);
  },last);
}
function startGraph(){
  const ld=document.getElementById('loader');
  if(ld)ld.classList.add('fade');
  setTimeout(()=>{
    if(ld)ld.remove();
    ['hdr','map','sideL','sideR'].forEach(id=>document.getElementById(id).classList.add('on'));
    graphOn=true; flashA=.45;
    if(UID>=2){ cam.z=1.16; cam.t=1; }
    buildLevel(!reduceMotion);
    const hd=levelChildren().length*90+900, hint=document.getElementById('hint');
    setTimeout(()=>hint.classList.add('on'),hd);
    setTimeout(()=>hint.classList.remove('on'),hd+7000);
    setTimeout(whisper,hd+1800);
  },ld?560:0);
}

/* выход из червоточины, когда ядро открыто порталом с главной */
let holdBlack=PORTAL, emergeT=2;
function beginEmerge(){
  if(emergeT>=0&&emergeT<=1)return;
  holdBlack=false; emergeT=0;
  if(UID>=2){ cam.z=1.35; cam.t=1; }
  spike=1;
  startGraph();
}
window.addEventListener('message',ev=>{
  if(ev.origin!==location.origin)return;
  if(ev.data&&ev.data.aceon==='reveal')beginEmerge();
});
window.addEventListener('pageshow',e=>{ if(e.persisted&&holdBlack)beginEmerge(); });

/* --- запуск --- */
function onResize(){
  W=innerWidth; H=innerHeight;
  SC=Math.max(.62,Math.min(1,Math.min(W,H)/820));
  if(GLOK)resizeGL();
  nodes.forEach(n=>{ const base=n.kind==='core'?3.0:(n.kind==='sector'?2.5:(n.def.w||2)); n.radius=(20+base*10)*SC*(n.role==='hub'?1.08:1); });
  if(hub){ hub.x=W/2; hub.y=H/2; hub.tx=hub.x; hub.ty=hub.y; }
  if(nodes.length)buildLabels();
}
window.addEventListener('resize',onResize);

GLOK=glInit();
if(!GLOK){ document.body.classList.add('nogl'); holdBlack=false; }
onResize();
(function(){
  cv.addEventListener('webglcontextlost',e=>{ e.preventDefault(); GLOK=false; document.body.classList.add('nogl'); },false);
  cv.addEventListener('webglcontextrestored',()=>{ GLOK=glInit(); if(GLOK){ document.body.classList.remove('nogl'); resizeGL(); } },false);
})();
applyTexts();
scheduleBurst(); scheduleGlitch();
requestAnimationFrame(frame);

if(PORTAL&&GLOK){
  const ld=document.getElementById('loader'); if(ld)ld.remove();
  setTimeout(()=>{ if(holdBlack)beginEmerge(); },4200);
} else {
  holdBlack=false;
  if(PORTAL){ const ld=document.getElementById('loader'); if(ld)ld.remove(); startGraph(); }
  else if(reduceMotion){ const ld=document.getElementById('loader'); if(ld)ld.remove(); startGraph(); }
  else runLoader();
}

setInterval(()=>{
  const n=new Date(), p=v=>String(v).padStart(2,'0');
  document.getElementById('hclock').textContent=p(n.getHours())+':'+p(n.getMinutes())+':'+p(n.getSeconds());
},1000);
document.getElementById('umark').textContent=AU.tag||'';
})();
