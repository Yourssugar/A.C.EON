/* AI COURSE · главная курса NODE AI.
   Прокрутка: #scroller (липкая #stage) даёт сцены 0..4, дальше обычный блок #choose (сцена 5).
   s = номер сцены с дробной частью. Текст сцены виден около целого s, сеть перестраивается между ними.
   0 вход: облако узлов вокруг ядра
   1 как устроен курс: кольцо со спицами
   2 новичок: маленькая сеть 3-4-2, зелёная
   3 продвинутый: глубокая сеть 4-6-6-6-3, синяя
   4 профессионал: пять агентов-узлов, у каждого спутники, янтарь
   5 выбор уровня: три кластера в цветах уровней
   Сеть рисуется WebGL (точки и линии, позиции считает процессор, их мало). U-1 и без WebGL: неподвижные узлы CSS.
   Прогресс общий со слоями: localStorage aceon.nodeai.progress (номера слоёв 1..5). Выбранный уровень: Store('aicourse').level. */
(function(){
'use strict';
const $=id=>document.getElementById(id);
const AU=window.AceonUniverse||{id:2,capMs:16,dprCap:1.5};
const TIER=AU.id||2;
const RM=matchMedia('(prefers-reduced-motion: reduce)').matches;
const TR=window.Trace||null;
let PORTAL=false; try{ PORTAL=window.self!==window.top; }catch(e){ PORTAL=true; }

/* ---------- язык ---------- */
const HL=window.HUB_LANG||{en:{}};
const CODES=['en','ru','de','fr','es','it','pl'];
const hasI18n=!!(window.I18n&&window.Store);
function readSite(){ try{ return JSON.parse(localStorage.getItem('aceon:site')||'null')||{}; }catch(e){ return {}; } }
let fbLang=(function(){ const s=readSite().lang; if(CODES.indexOf(s)>=0)return s; const n=(navigator.languages||[navigator.language||'en']); for(const c of n){ const k=String(c).slice(0,2).toLowerCase(); if(CODES.indexOf(k)>=0)return k; } return 'en'; })();
const lang=()=>hasI18n?I18n.lang:fbLang;
function T(k,v){ const d=HL[lang()]||HL.en; let s=d[k]!==undefined?d[k]:(HL.en[k]!==undefined?HL.en[k]:k); if(v)s=s.replace(/\{(\w+)\}/g,(m,n)=>v[n]!==undefined?v[n]:m); return s; }
function setLang(c){
  if(CODES.indexOf(c)<0||c===lang())return;
  if(hasI18n)I18n.set(c); else { fbLang=c; const o=readSite(); o.lang=c; if(!o.v)o.v=1; try{ localStorage.setItem('aceon:site',JSON.stringify(o)); }catch(e){} }
  if(TR)TR.event('lang.change');
  texts();
}
const esc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

/* ---------- уровни и слои ---------- */
const LEVELS=[
  {id:'novice',n:1,name:'lv_novice',who:'nov_who',learn:['nov_l1','nov_l2','nov_l3'],layers:[1,2],soon:[],col:'#18e28c',rgb:[.09,.89,.55]},
  {id:'adv',n:2,name:'lv_adv',who:'adv_who',learn:['adv_l1','adv_l2','adv_l3'],layers:[3,4],soon:[],col:'#45aaff',rgb:[.27,.67,1]},
  {id:'pro',n:3,name:'lv_pro',who:'pro_who',learn:['pro_l1','pro_l2','pro_l3'],layers:[5],soon:['soon1'],col:'#f3cf62',rgb:[.95,.78,.36]}
];
const lvById=id=>LEVELS.find(l=>l.id===id)||null;
const href=n=>'layer_0'+n+'/';
const code=n=>'LAYER_0'+n;
const PKEY='aceon.nodeai.progress';
function done(){ try{ const a=JSON.parse(localStorage.getItem(PKEY)||'[]'); return Array.isArray(a)?a.filter(n=>n>=1&&n<=5):[]; }catch(e){ return []; } }
/* следующий непройденный слой: внутри уровня или по всему курсу */
function nextLayer(lv){
  const d=done(), list=lv?lv.layers:[1,2,3,4,5];
  return list.find(n=>d.indexOf(n)<0)||null;
}

/* выбранный уровень */
let mem={level:null};
if(window.Store){ try{ Store.define('aicourse',{version:1,defaults:{level:null}}); mem=Store.get('aicourse'); }catch(e){} }
else { try{ mem=JSON.parse(localStorage.getItem('aceon:aicourse')||'null')||mem; }catch(e){} }
function saveMem(){ if(window.Store){ try{ Store.save('aicourse'); return; }catch(e){} } try{ localStorage.setItem('aceon:aicourse',JSON.stringify(mem)); }catch(e){} }
function setLevel(id){
  mem.level=id; saveMem(); if(TR)TR.event('course.level');
  renderDynamic();
}

/* ---------- разметка сцен уровней ---------- */
const stage=$('stage'), hint=$('hint');
LEVELS.forEach((l,i)=>{
  const s=document.createElement('section'); s.className='scn lvl'; s.dataset.s=String(i+2); s.style.setProperty('--lc',l.col);
  s.innerHTML='<div class="lvtag"><i class="ico" style="'+icoS(l.n+8,42)+'"></i><span class="t"></span></div>'
    +'<h2></h2><p class="who"></p><p class="cap c1"></p><ul class="learn"></ul><p class="cap c2"></p><div class="lays"></div><a class="cta go" href="#"></a>';
  stage.insertBefore(s,hint);
  l.el=s;
});
const scenes=[...stage.querySelectorAll('.scn')].sort((a,b)=>a.dataset.s-b.dataset.s);

/* ---------- прокрутка ---------- */
const scroller=$('scroller'), choose=$('choose');
let sT=0, sD=0;
function range(){ return Math.max(1,scroller.offsetHeight-innerHeight); }
function readScroll(){
  const y=scrollY||document.documentElement.scrollTop||0, r=range();
  if(y<=r)sT=4*y/r; else sT=4+Math.min(1,(y-r)/(innerHeight*.8));
}
function jump(i){
  const y=i<=4?range()*i/4:choose.offsetTop;
  scrollTo({top:y,behavior:RM?'auto':'smooth'});
}
const ss=(a,b,x)=>{ const t=Math.min(1,Math.max(0,(x-a)/(b-a))); return t*t*(3-2*t); };
function placeText(){
  const mob=matchMedia('(max-width:760px), (max-aspect-ratio:4/5)').matches;
  scenes.forEach(el=>{
    const i=+el.dataset.s, d=sD-i, ad=Math.abs(d);
    let o=1-ss(.22,.46,ad);
    if(i===0&&d<0)o=1; if(i===4&&d>0)o=1-ss(.2,.6,d);
    el.style.opacity=o.toFixed(3);
    el.classList.toggle('vis',o>.01);
    const off=(d*-46).toFixed(1)+'px';
    if(i===0)el.style.transform=mob?'translateY(calc(-50% + '+off+'))':'translate(-50%,calc(-50% + '+off+'))';
    else el.style.transform=mob?'translateY('+off+')':'translateY(calc(-50% + '+off+'))';
  });
  hint.style.opacity=(1-ss(.05,.3,sD)).toFixed(3);
  const cur=Math.round(Math.min(5,sD));
  rail.querySelectorAll('button').forEach((b,i)=>b.classList.toggle('on',i===cur));
  const lv=LEVELS[cur-2]; rail.style.setProperty('--rc',lv?lv.col:'#45aaff');
}

/* ---------- шкала справа ---------- */
const rail=$('rail');
for(let i=0;i<6;i++){ const b=document.createElement('button'); b.type='button'; b.addEventListener('click',()=>jump(i)); rail.appendChild(b); }
const sceneName=i=>i===0?T('sc0'):i===1?T('sc1'):i===5?T('sc5'):T(LEVELS[i-2].name);

/* =========================================================
   Сеть: узлы и связи для каждой сцены
   ========================================================= */
const N=72;
let rnd=(function(seed){ return ()=>{ seed=(seed*16807)%2147483647; return (seed-1)/2147483646; }; })(7);
const BLUE=[.27,.67,1], DIM=[.25,.5,.75], PURP=[.62,.55,1], RED=[1,.33,.42];
/* дальний фон для узлов, не занятых в сцене */
const FAR=[]; for(let i=0;i<N;i++){ const u=rnd()*2-1, a=rnd()*6.283, r=2.1+rnd()*.8, q=Math.sqrt(1-u*u); FAR.push([Math.cos(a)*q*r,u*r*.7,Math.sin(a)*q*r]); }
function base(){ const P=[]; for(let i=0;i<N;i++)P.push({p:FAR[i].slice(),a:.1,s:2.4,c:DIM}); return P; }
function fullLayers(sizes,x0,x1,h){
  const ids=[], P=[]; let k=0;
  sizes.forEach((n,li)=>{ const x=x0+(x1-x0)*li/(sizes.length-1), col=[]; for(let j=0;j<n;j++){ const y=(n===1?0:(j/(n-1)-.5))*h*(n/Math.max(...sizes)); col.push(k); P.push([x,y,(li%2?.08:-.08)]); k++; } ids.push(col); });
  const E=[]; for(let li=0;li<ids.length-1;li++)for(const a of ids[li])for(const b of ids[li+1])E.push([a,b]);
  return {P,E,ids};
}
/* облако: точки на сфере, связи с двумя ближайшими */
const CLOUD=(function(){
  const P=[[0,0,0]], n=N-1;
  for(let i=0;i<n;i++){ const y=1-2*(i+.5)/n, r=Math.sqrt(1-y*y), a=i*2.39996; const R=1.05+rnd()*.25; P.push([Math.cos(a)*r*R,y*R*.85,Math.sin(a)*r*R]); }
  const E=[];
  for(let i=1;i<N;i++){ const d=[]; for(let j=1;j<N;j++)if(j!==i){ const dx=P[i][0]-P[j][0],dy=P[i][1]-P[j][1],dz=P[i][2]-P[j][2]; d.push([dx*dx+dy*dy+dz*dz,j]); } d.sort((a,b)=>a[0]-b[0]); for(let k=0;k<2;k++){ const j=d[k][1]; if(i<j)E.push([i,j]); else if(!E.some(e=>e[0]===j&&e[1]===i))E.push([j,i]); } }
  for(let k=0;k<10;k++)E.push([0,1+Math.floor(k*7.1)%(N-1)]);
  return {P,E};
})();
const NOV=fullLayers([3,4,2],-.8,.8,1.1), ADV=fullLayers([4,6,6,6,3],-1.05,1.05,1.5);

/* сцены: fn(t) -> {nodes, edges:[[a,b,alpha]], dir:true если импульсы идут от a к b} */
const SC=[
  /* 0 облако */
  t=>{ const P=base(); CLOUD.P.forEach((p,i)=>{ P[i]={p,a:i?.7:.45,s:i?5:12,c:i?BLUE:PURP}; }); return {P,E:CLOUD.E.map(e=>[e[0],e[1],e[0]===0?.1:.2]),dir:false,spin:1,rate:5,col:BLUE}; },
  /* 1 кольцо со спицами */
  t=>{ const P=base(); P[0]={p:[0,0,0],a:1,s:22,c:PURP}; const R=24, E=[];
    for(let i=0;i<R;i++){ const a=i/R*6.283; P[1+i]={p:[Math.cos(a)*.95,Math.sin(a)*.95,Math.sin(a*3+t*.6)*.08],a:.85,s:i%3?5:9,c:i%3?BLUE:[.5,.85,1]}; E.push([1+i,1+(i+1)%R,.32]); if(i%3===0)E.push([0,1+i,.4]); }
    return {P,E,dir:true,spin:.6,rate:6,col:BLUE}; },
  /* 2 новичок */
  t=>{ const P=base(), c=LEVELS[0].rgb; NOV.P.forEach((p,i)=>{ P[i]={p,a:1,s:15,c}; }); return {P,E:NOV.E.map(e=>[e[0],e[1],.4]),dir:true,spin:0,rate:5,col:c}; },
  /* 3 продвинутый */
  t=>{ const P=base(), c=LEVELS[1].rgb; ADV.P.forEach((p,i)=>{ P[i]={p,a:1,s:9,c}; }); return {P,E:ADV.E.map(e=>[e[0],e[1],.32]),dir:true,spin:0,rate:16,col:c}; },
  /* 4 профессионал: агенты с орбитами */
  t=>{ const P=base(), c=LEVELS[2].rgb, E=[];
    for(let h=0;h<5;h++){ const a=h/5*6.283-1.57, hx=Math.cos(a)*.78, hy=Math.sin(a)*.62, hz=Math.sin(a)*.25;
      P[h]={p:[hx,hy,hz],a:1,s:17,c};
      for(let k=0;k<7;k++){ const id=5+h*7+k, b=k/7*6.283+t*(.5+h*.07)*(h%2?1:-1), r=.24;
        P[id]={p:[hx+Math.cos(b)*r,hy+Math.sin(b)*r*.6,hz+Math.sin(b)*r*.8],a:.9,s:5,c:k===6?RED:[.95,.62,.3]}; E.push([h,id,.22]); }
      for(let g=h+1;g<5;g++)E.push([h,g,.3]); }
    return {P,E,dir:false,spin:.35,rate:9,col:c}; },
  /* 5 три кластера */
  t=>{ const P=base(), E=[]; let k=0;
    LEVELS.forEach((l,li)=>{ const cx=(li-1)*1.15, ctr=k; P[k++]={p:[cx,0,0],a:.8,s:14,c:l.rgb};
      const m=6+li*2; for(let j=0;j<m;j++){ const a=j/m*6.283+t*.25*(li%2?1:-1); P[k]={p:[cx+Math.cos(a)*.32,Math.sin(a)*.32,Math.sin(a*2)*.1],a:.6,s:5,c:l.rgb}; E.push([ctr,k,.18]); k++; }
      if(li)E.push([ctr-(6+(li-1)*2)-1,ctr,.3]); });
    return {P,E,dir:true,spin:0,rate:4,col:BLUE}; }
];
/* где сеть на экране: смещение и масштаб для широкого экрана и телефона */
const VIEW_W=[{ox:0,oy:0,k:1.25,d:.75},{ox:.42,oy:0,k:1,d:1},{ox:.42,oy:0,k:1,d:1},{ox:.42,oy:0,k:1,d:1},{ox:.42,oy:0,k:1,d:1},{ox:0,oy:.05,k:1.05,d:.45}];
const VIEW_M=[{ox:0,oy:0,k:1.7,d:.6},{ox:.2,oy:.46,k:.85,d:1},{ox:.2,oy:.46,k:.9,d:1},{ox:.2,oy:.46,k:.9,d:1},{ox:.2,oy:.46,k:.9,d:1},{ox:0,oy:0,k:1,d:.35}];

/* ---------- WebGL ---------- */
const cv=$('net');
let gl=null, prP=null, prL=null, bufP=null, bufL=null;
const GLON=TIER>=2;
if(GLON){
  try{ gl=cv.getContext('webgl',{alpha:true,premultipliedAlpha:false,antialias:true}); }catch(e){}
  if(gl){
    const mk=(vs,fs)=>{ const sh=(t,s)=>{ const o=gl.createShader(t); gl.shaderSource(o,s); gl.compileShader(o); if(!gl.getShaderParameter(o,gl.COMPILE_STATUS)){ console.warn('[hub]',gl.getShaderInfoLog(o)); return null; } return o; };
      const v=sh(gl.VERTEX_SHADER,vs), f=sh(gl.FRAGMENT_SHADER,fs); if(!v||!f)return null;
      const p=gl.createProgram(); gl.attachShader(p,v); gl.attachShader(p,f); gl.linkProgram(p); return gl.getProgramParameter(p,gl.LINK_STATUS)?p:null; };
    prP=mk('attribute vec2 p;attribute float s;attribute vec4 c;varying vec4 vc;void main(){gl_Position=vec4(p,0.,1.);gl_PointSize=s;vc=c;}',
      'precision mediump float;varying vec4 vc;void main(){vec2 d=gl_PointCoord-.5;float r=length(d)*2.;if(r>1.)discard;float core=smoothstep(.5,.3,r);float glow=exp(-r*r*3.5)*.6;gl_FragColor=vec4(mix(vc.rgb,vec3(1.),core*.55),vc.a*(core+glow));}');
    prL=mk('attribute vec2 p;attribute vec4 c;varying vec4 vc;void main(){gl_Position=vec4(p,0.,1.);vc=c;}',
      'precision mediump float;varying vec4 vc;void main(){gl_FragColor=vc;}');
    if(prP&&prL){ bufP=gl.createBuffer(); bufL=gl.createBuffer(); }
    else gl=null;
  }
}
if(!gl){ document.documentElement.classList.add('nogl'); stillNodes(); }
function stillNodes(){
  const box=$('still'); let r=(function(s){ return ()=>{ s=(s*16807)%2147483647; return (s-1)/2147483646; }; })(3);
  for(let i=0;i<34;i++){ const e=document.createElement('i'); e.style.left=(r()*100).toFixed(1)+'%'; e.style.top=(r()*100).toFixed(1)+'%'; const k=.4+r()*1.2; e.style.transform='scale('+k.toFixed(2)+')'; e.style.opacity=(.15+r()*.4).toFixed(2); box.appendChild(e); }
}

let W=0,H=0,DPR=1;
function fit(){
  DPR=Math.min(AU.dprCap||1.5,window.devicePixelRatio||1);
  W=innerWidth; H=innerHeight;
  if(gl){ cv.width=Math.round(W*DPR); cv.height=Math.round(H*DPR); }
}
const mobileView=()=>W<=760||W/H<.8;

/* импульсы: бегут по связям текущей сцены */
let pulses=[];
let mx=0,my=0,tmx=0,tmy=0, px=-999,py=-999;
addEventListener('pointermove',e=>{ tmx=e.clientX/W*2-1; tmy=e.clientY/H*2-1; px=e.clientX; py=e.clientY; },{passive:true});

const PTS=new Float32Array(N*7+400*7), LNS=new Float32Array(1400*12);
let tm=0, last=performance.now(), lastDraw=0, spawnAcc=0;
const lerp=(a,b,t)=>a+(b-a)*t;
function project(p,yaw,pitch,view){
  const cy=Math.cos(yaw), sy=Math.sin(yaw), cp=Math.cos(pitch), sp=Math.sin(pitch);
  let x=p[0]*cy+p[2]*sy, z=-p[0]*sy+p[2]*cy, y=p[1];
  const y2=y*cp-z*sp; z=y*sp+z*cp; y=y2;
  const zc=z+3.2, f=2.2/zc;
  const asp=W/H, fitK=mobileView()?Math.min(.95,1.05*asp/.9):Math.min(.9,.95*asp/.83);
  const k=fitK*view.k;
  return [x*f*k/asp+view.ox, y*f*k+view.oy, f, zc];
}
function frame(now){
  requestAnimationFrame(frame);
  readScroll();
  const dtR=Math.min(.1,(now-last)/1000); last=now;
  sD+=(sT-sD)*(RM?1:Math.min(1,dtR*7)); if(Math.abs(sT-sD)<.0005)sD=sT;
  placeText(); bgFrame();
  if(document.hidden)return;
  if(now-lastDraw<(AU.capMs||16)-1)return;
  const dt=Math.min(.1,(now-lastDraw)/1000); lastDraw=now;
  if(!RM)tm+=dt;
  mx+=(tmx-mx)*Math.min(1,dt*3); my+=(tmy-my)*Math.min(1,dt*3);
  if(gl){ draw(dt); cv.classList.add('on'); }
  botFrame(dt);
}
function draw(dt){
  const s=Math.max(0,Math.min(5,sD)), a=Math.min(4,Math.floor(s)), fr=s-a, t=ss(.22,.78,fr), b=Math.min(5,a+1);
  const A=SC[a](tm), B=SC[b](tm);
  const VW=mobileView()?VIEW_M:VIEW_W, va=VW[a], vb=VW[b];
  const view={ox:lerp(va.ox,vb.ox,t),oy:lerp(va.oy,vb.oy,t),k:lerp(va.k,vb.k,t)}, dim=lerp(va.d,vb.d,t)*.62;
  const spin=lerp(A.spin,B.spin,t);
  const yaw=tm*.07*spin+Math.sin(tm*.23)*.2*(1-spin)+mx*.22, pitch=(.16*spin)+my*.1;
  /* узлы */
  const pos=[], scr=[];
  const sizeK=Math.min(W,H)/820*DPR*1.7;
  let np=0;
  for(let i=0;i<N;i++){
    const na=A.P[i], nb=B.P[i];
    const p=[lerp(na.p[0],nb.p[0],t),lerp(na.p[1],nb.p[1],t),lerp(na.p[2],nb.p[2],t)];
    const q=project(p,yaw,pitch,view); pos.push(q);
    const al=lerp(na.a,nb.a,t)*dim, sz=lerp(na.s,nb.s,t), c=[lerp(na.c[0],nb.c[0],t),lerp(na.c[1],nb.c[1],t),lerp(na.c[2],nb.c[2],t)];
    const sx=(q[0]+1)/2*W, sy=(1-q[1])/2*H, hov=Math.max(0,1-Math.hypot(sx-px,sy-py)/90);
    const depth=Math.max(.35,Math.min(1.3,q[2]/.69));
    const o=np*7; PTS[o]=q[0]; PTS[o+1]=q[1]; PTS[o+2]=Math.max(1.5,sz*depth*sizeK*(1+hov*.6)); PTS[o+3]=c[0]; PTS[o+4]=c[1]; PTS[o+5]=c[2]; PTS[o+6]=Math.min(1,al*(.55+.45*depth)+hov*.35); np++;
  }
  /* связи двух сцен с весами */
  let nl=0;
  const addEdges=(E,w)=>{ if(w<.01)return; for(const e of E){ if(nl>=1400)break; const p1=pos[e[0]], p2=pos[e[1]], o=nl*12, c1=PTS.subarray(e[0]*7+3,e[0]*7+6), c2=PTS.subarray(e[1]*7+3,e[1]*7+6), al=Math.min(1,e[2]*w*dim*1.9);
    LNS[o]=p1[0]; LNS[o+1]=p1[1]; LNS[o+2]=c1[0]; LNS[o+3]=c1[1]; LNS[o+4]=c1[2]; LNS[o+5]=al;
    LNS[o+6]=p2[0]; LNS[o+7]=p2[1]; LNS[o+8]=c2[0]; LNS[o+9]=c2[1]; LNS[o+10]=c2[2]; LNS[o+11]=al; nl++; } };
  addEdges(A.E,1-t); addEdges(B.E,t);
  /* импульсы */
  if(!RM&&TIER>=2){
    const dom=t<.5?a:b, D=t<.5?A:B;
    spawnAcc+=dt*D.rate*(TIER>=3?1.4:1);
    while(spawnAcc>=1&&pulses.length<120){ spawnAcc-=1; const e=Math.floor(Math.random()*D.E.length), rev=!D.dir&&Math.random()<.5; pulses.push({sc:dom,e,u:0,sp:.5+Math.random()*.7,rev}); }
    if(spawnAcc>=1)spawnAcc=0;
    for(let i=pulses.length-1;i>=0;i--){
      const pu=pulses[i]; pu.u+=dt*pu.sp;
      const w=pu.sc===a?1-t:pu.sc===b?t:0;
      const E=(pu.sc===a?A:pu.sc===b?B:null);
      if(pu.u>=1||w<.02||!E||!E.E[pu.e]){ pulses.splice(i,1); continue; }
      const e=E.E[pu.e], from=pos[pu.rev?e[1]:e[0]], to=pos[pu.rev?e[0]:e[1]];
      const o=np*7, ci=(pu.rev?e[1]:e[0])*7+3;
      PTS[o]=lerp(from[0],to[0],pu.u); PTS[o+1]=lerp(from[1],to[1],pu.u); PTS[o+2]=5*sizeK;
      PTS[o+3]=Math.min(1,PTS[ci]*.6+.45); PTS[o+4]=Math.min(1,PTS[ci+1]*.6+.45); PTS[o+5]=Math.min(1,PTS[ci+2]*.6+.45);
      PTS[o+6]=w*dim*Math.sin(pu.u*Math.PI)*.95; np++;
    }
  }
  gl.viewport(0,0,cv.width,cv.height); gl.clearColor(0,0,0,0); gl.clear(gl.COLOR_BUFFER_BIT);
  gl.enable(gl.BLEND); gl.blendFuncSeparate(gl.SRC_ALPHA,gl.ONE,gl.ONE,gl.ONE);
  /* линии */
  gl.useProgram(prL); gl.bindBuffer(gl.ARRAY_BUFFER,bufL); gl.bufferData(gl.ARRAY_BUFFER,LNS.subarray(0,nl*12),gl.DYNAMIC_DRAW);
  let lp=gl.getAttribLocation(prL,'p'), lc=gl.getAttribLocation(prL,'c');
  gl.enableVertexAttribArray(lp); gl.vertexAttribPointer(lp,2,gl.FLOAT,false,24,0);
  gl.enableVertexAttribArray(lc); gl.vertexAttribPointer(lc,4,gl.FLOAT,false,24,8);
  gl.drawArrays(gl.LINES,0,nl*2);
  gl.disableVertexAttribArray(lp); gl.disableVertexAttribArray(lc);
  /* точки */
  gl.useProgram(prP); gl.bindBuffer(gl.ARRAY_BUFFER,bufP); gl.bufferData(gl.ARRAY_BUFFER,PTS.subarray(0,np*7),gl.DYNAMIC_DRAW);
  const pp=gl.getAttribLocation(prP,'p'), ps=gl.getAttribLocation(prP,'s'), pc=gl.getAttribLocation(prP,'c');
  gl.enableVertexAttribArray(pp); gl.vertexAttribPointer(pp,2,gl.FLOAT,false,28,0);
  gl.enableVertexAttribArray(ps); gl.vertexAttribPointer(ps,1,gl.FLOAT,false,28,8);
  gl.enableVertexAttribArray(pc); gl.vertexAttribPointer(pc,4,gl.FLOAT,false,28,12);
  gl.drawArrays(gl.POINTS,0,np);
  gl.disableVertexAttribArray(pp); gl.disableVertexAttribArray(ps); gl.disableVertexAttribArray(pc);
}
if(gl)cv.addEventListener('webglcontextlost',e=>{ e.preventDefault(); gl=null; cv.classList.remove('on'); document.documentElement.classList.add('nogl'); if(!$('still').children.length)stillNodes(); });

/* ---------- текст, карточки, меню ---------- */
/* значок из img/icons.webp (сетка 4x3) */
function icoS(i,sz){ const c=i%4, r=Math.floor(i/4); return 'width:'+sz+'px;height:'+sz+'px;background-size:'+(sz*4)+'px '+(sz*3)+'px;background-position:'+(-c*sz)+'px '+(-r*sz)+'px'; }
document.querySelectorAll('.how .ico').forEach(e=>e.setAttribute('style',icoS(+e.dataset.i,38)));
function layerRow(n,lv,tag){
  const d=done().indexOf(n)>=0;
  return '<a class="lay'+(d?' dn':'')+'" href="'+href(n)+'"><i class="ico" style="'+icoS(n+2,30)+'"></i><span class="code">'+code(n)+'</span><span class="nm">'+esc(T('L'+n))+'</span><span class="st">'+(d?esc(T('done')):'')+'</span></a>';
}
function ctaFor(lv){
  const nx=nextLayer(lv), d=done(), any=lv.layers.some(n=>d.indexOf(n)>=0);
  if(!nx)return {href:href(lv.layers[0]),text:T('again')};
  return {href:href(nx),text:(any?T('cont'):T('start'))+': '+code(nx)};
}
function renderDynamic(){
  const d=done();
  LEVELS.forEach(l=>{
    const s=l.el;
    s.querySelector('.lays').innerHTML=l.layers.map(n=>layerRow(n,l)).join('')+l.soon.map(k=>'<div class="lay soon"><i class="ico" style="'+icoS(8,30)+'"></i><span class="code">LAYER_06</span><span class="nm">'+esc(T(k))+'</span><span class="st">'+esc(T('soon'))+'</span></div>').join('');
    const c=ctaFor(l), a=s.querySelector('.go'); a.href=c.href; a.textContent=c.text+' >';
  });
  /* карточки выбора */
  const box=$('cards'); box.innerHTML='';
  LEVELS.forEach(l=>{
    const n=l.layers.length, k=l.layers.filter(x=>d.indexOf(x)>=0).length, c=ctaFor(l);
    const el=document.createElement('div'); el.className='card'+(mem.level===l.id?' sel':''); el.style.setProperty('--lc',l.col);
    el.innerHTML='<span class="selmark"></span><div class="lvtag"><i class="ico" style="'+icoS(l.n+8,42)+'"></i><span></span></div><h3></h3><p class="who"></p>'
      +'<div class="bar"><i style="width:'+(k/n*100).toFixed(0)+'%"></i></div><p class="pg"></p><div class="row"><button class="cta ghost pk" type="button"></button><a class="cta" href="'+c.href+'"></a></div>';
    el.querySelector('.selmark').textContent=T('picked');
    el.querySelector('.lvtag span').textContent=T('lvtag',{n:l.n});
    el.querySelector('h3').textContent=T(l.name);
    el.querySelector('.who').textContent=T(l.who);
    el.querySelector('.pg').textContent=T('prog',{d:k,n:n});
    const pk=el.querySelector('.pk'); pk.textContent=mem.level===l.id?T('picked'):T('pick'); pk.addEventListener('click',()=>setLevel(l.id));
    el.querySelector('a.cta').textContent=c.text+' >';
    box.appendChild(el);
  });
  /* шапка */
  const lv=lvById(mem.level), chip=$('chip');
  chip.querySelector('.lbl').textContent=lv?T('chip',{lv:T(lv.name)}):T('noLevel');
  chip.style.setProperty('--lc',lv?lv.col:'');
  if(!lv)chip.style.removeProperty('--lc');
  /* продолжить */
  const r=$('resume'), nx=nextLayer(lv);
  if(d.length&&nx){ r.href=href(nx); r.textContent=T('resume',{l:code(nx)+' · '+T('L'+nx)})+' >'; r.classList.add('on'); r.style.setProperty('--lc',lv?lv.col:'#45aaff'); }
  else r.classList.remove('on');
  buildMenu();
}

/* проверка уровня */
const quiz=$('quiz'); let qi=-1, qs=0;
function quizRender(){
  if(qi<0){
    quiz.innerHTML='<h4></h4><p></p><div class="row"><button class="cta" type="button"></button></div>';
    quiz.querySelector('h4').textContent=T('quiz_t'); quiz.querySelector('p').textContent=T('quiz_d');
    const b=quiz.querySelector('button'); b.textContent=T('quizGo'); b.addEventListener('click',()=>{ qi=0; qs=0; quizRender(); });
    return;
  }
  if(qi<3){
    const k='q'+(qi+1);
    quiz.innerHTML='<div class="qn"></div><h4></h4><div class="ans"></div>';
    quiz.querySelector('.qn').textContent=T('qn',{i:qi+1}); quiz.querySelector('h4').textContent=T(k);
    const ans=quiz.querySelector('.ans');
    ['a','b','c'].forEach((x,v)=>{ const b=document.createElement('button'); b.type='button'; b.textContent=T(k+x); b.addEventListener('click',()=>{ qs+=v; qi++; quizRender(); }); ans.appendChild(b); });
    return;
  }
  const lv=qs<=2?LEVELS[0]:qs<=4?LEVELS[1]:LEVELS[2];
  quiz.innerHTML='<h4></h4><div class="row"><button class="cta ap" type="button"></button><button class="cta ghost rt" type="button"></button></div>';
  quiz.style.setProperty('--lc',lv.col);
  const h=quiz.querySelector('h4'); h.textContent=T('res',{lv:T(lv.name)}); h.style.color=lv.col;
  const ap=quiz.querySelector('.ap'); ap.style.setProperty('--lc',lv.col); ap.textContent=T('apply'); ap.addEventListener('click',()=>{ setLevel(lv.id); qi=-1; quizRender(); if(TR)TR.event('course.quiz'); });
  const rt=quiz.querySelector('.rt'); rt.style.setProperty('--lc',lv.col); rt.textContent=T('retry'); rt.addEventListener('click',()=>{ qi=0; qs=0; quizRender(); });
}

/* меню */
const drawer=$('drawer'), menuBtn=$('menuBtn'); let menuPushed=false;
function buildMenu(){
  const d=done(), box=$('drLevels'); box.innerHTML='';
  LEVELS.forEach(l=>{
    const el=document.createElement('div'); el.className='dlv'+(mem.level===l.id?' sel':''); el.style.setProperty('--lc',l.col);
    el.innerHTML='<div class="dlvh"><span class="t"></span><span class="n"></span><button type="button"></button></div>'
      +l.layers.map(n=>'<a href="'+href(n)+'"><span class="c">'+code(n)+'</span><span class="nm">'+esc(T('L'+n))+'</span>'+(d.indexOf(n)>=0?'<span class="ok">'+esc(T('done'))+'</span>':'')+'</a>').join('')
      +l.soon.map(k=>'<div class="soonrow"><span class="c">LAYER_06</span><span>'+esc(T(k))+' · '+esc(T('soon'))+'</span></div>').join('');
    el.querySelector('.t').textContent=T('lvtag',{n:l.n}); el.querySelector('.n').textContent=T(l.name);
    const b=el.querySelector('button'); b.textContent=mem.level===l.id?T('picked'):T('pick'); b.addEventListener('click',()=>setLevel(l.id));
    box.appendChild(el);
  });
  const sc=$('drScenes'); sc.innerHTML='';
  for(let i=0;i<6;i++){ const b=document.createElement('button'); b.type='button'; b.className='dbtn'; b.innerHTML='<span class="n">0'+i+'</span><span></span>'; b.lastChild.textContent=sceneName(i); b.addEventListener('click',()=>{ closeMenu(); setTimeout(()=>jump(i),RM?0:220); }); sc.appendChild(b); }
  const lg=$('langs'); lg.innerHTML='';
  CODES.forEach(c=>{ const b=document.createElement('button'); b.type='button'; b.textContent=c.toUpperCase(); b.classList.toggle('sel',c===lang()); b.addEventListener('click',()=>setLang(c)); lg.appendChild(b); });
  rail.querySelectorAll('button').forEach((b,i)=>{ b.title=sceneName(i); b.setAttribute('aria-label',sceneName(i)); });
}
function openMenu(){
  if(document.body.classList.contains('menu'))return;
  document.body.classList.add('menu'); drawer.setAttribute('aria-hidden','false'); menuBtn.setAttribute('aria-expanded','true');
  try{ history.pushState({hubMenu:1},''); menuPushed=true; }catch(e){ menuPushed=false; }
  setTimeout(()=>{ try{ $('drClose').focus({preventScroll:true}); }catch(e){} },RM?0:260);
  if(TR)TR.event('course.menu');
}
function closeMenu(fromPop){
  if(!document.body.classList.contains('menu'))return;
  document.body.classList.remove('menu'); drawer.setAttribute('aria-hidden','true'); menuBtn.setAttribute('aria-expanded','false');
  if(menuPushed&&!fromPop){ menuPushed=false; try{ history.back(); }catch(e){} }
  menuPushed=false;
}
menuBtn.addEventListener('click',()=>document.body.classList.contains('menu')?closeMenu():openMenu());
$('drClose').addEventListener('click',()=>closeMenu());
$('veil').addEventListener('click',()=>closeMenu());
addEventListener('keydown',e=>{ if(e.key==='Escape')closeMenu(); });
addEventListener('popstate',()=>closeMenu(true));
$('chip').addEventListener('click',()=>jump(5));
$('drQuiz').addEventListener('click',()=>{ closeMenu(); qi=0; qs=0; quizRender(); setTimeout(()=>quiz.scrollIntoView({behavior:RM?'auto':'smooth',block:'center'}),RM?0:240); });
function goBack(){
  if(PORTAL){ try{ parent.postMessage({aceon:'close'},location.origin); return; }catch(e){} }
  location.href='../';
}
$('back').addEventListener('click',goBack); $('drBack').addEventListener('click',goBack);
$('toTop').addEventListener('click',()=>jump(0));

/* строка над заголовком печатается */
let typeT=null;
function typeEyebrow(){
  const eb=$('eyebrow'), line=T('eyebrow'); clearTimeout(typeT);
  if(RM||TIER<2){ eb.innerHTML=esc(line)+'<span class="blink">_</span>'; return; }
  let i=0; (function step(){ eb.innerHTML=esc(line.slice(0,i))+'<span class="blink">_</span>'; if(i++<line.length)typeT=setTimeout(step,24); })();
}

function texts(){
  document.documentElement.lang=lang();
  $('back').textContent=T('back'); $('drBack').textContent=T('back');
  menuBtn.querySelector('.lbl').textContent=T('menu'); menuBtn.setAttribute('aria-label',T('menu'));
  $('drTitle').textContent=T('menu'); $('drClose').setAttribute('aria-label',T('close')); $('drClose').title=T('close');
  $('drLv').textContent=T('drLevels'); $('drPg').textContent=T('drPage'); $('drLg').textContent=T('drLang'); $('drQuiz').textContent=T('drQuiz');
  $('sub').textContent=T('sub'); $('lead').textContent=T('lead'); $('hintT').textContent=T('scroll');
  $('howT').textContent=T('how_t'); ['how1t','how1d','how2t','how2d','how3t','how3d'].forEach(k=>$(k).textContent=T(k));
  LEVELS.forEach(l=>{
    const s=l.el; s.querySelector('.lvtag .t').textContent=T('lvtag',{n:l.n}); s.querySelector('h2').textContent=T(l.name);
    s.querySelector('.who').textContent=T(l.who); s.querySelector('.c1').textContent=T('learn'); s.querySelector('.c2').textContent=T('layers');
    s.querySelector('.learn').innerHTML=l.learn.map(k=>'<li>'+esc(T(k))+'</li>').join('');
  });
  $('chooseT').textContent=T('choose_t'); $('chooseD').textContent=T('choose_d');
  $('ruOnly').textContent=T('ruOnly'); $('foot').textContent=T('foot'); $('toTop').textContent=T('top')+' ^';
  typeEyebrow(); renderDynamic(); quizRender();
}

/* слой пройден в другой вкладке: обновить отметки */
addEventListener('storage',e=>{ if(e.key===PKEY)renderDynamic(); });
addEventListener('pageshow',e=>{ if(e.persisted)renderDynamic(); });

/* =========================================================
   Фоны сцен и робот NODE
   ========================================================= */
const BGN=['entry','how','novice','adv','pro','choose'];
const bgs=$('bgs'), bgEl=[];
let bgVar='', bgReady=false;
BGN.forEach(n=>{ const d=document.createElement('div'); d.className='bgi'; bgs.appendChild(d); bgEl.push(d); });
function bgLoad(all){
  const v=mobileView()?'m':'w'; if(v===bgVar&&!all)return; bgVar=v;
  BGN.forEach((n,i)=>{ if(i===0||all||bgReady){ bgEl[i].style.backgroundImage='url("img/bg-'+n+'-'+v+'.webp")'; } });
}
function bgFrame(){
  const s=Math.max(0,Math.min(5,sD));
  bgEl.forEach((d,i)=>{ const w=Math.max(0,1-Math.abs(s-i)); d.style.opacity=w.toFixed(3); d.style.visibility=w>0?'visible':'hidden'; });
}

const bot=window.NodeBot?NodeBot.create({reduce:RM}):null;
const bc=$('bot'), bx=bc.getContext('2d'), say=$('say'), hit=$('botHit');
let botOn=!!bot&&TIER>=1;
if(!botOn){ bc.style.display='none'; hit.style.display='none'; }
/* где стоит робот: x середина, y земля (доли экрана), h высота (доля высоты экрана) */
function botPlace(i){
  const mob=mobileView();
  if(i===0)return mob?{x:.5,y:.955,h:.25}:{x:.82,y:.93,h:.42};
  if(mob)return {x:.24,y:.45,h:.24};
  const left=Math.min(96,Math.max(18,W*.06)), right=left+Math.min(540,W*.46), h=.45, bw=h*H*.62;
  return {x:Math.max(.56,(right+bw/2+16)/W),y:.93,h};
}
const PROPS=[[0,0,111,110],[115,0,82,127],[201,0,74,119],[279,0,100,129],[383,0,56,140],[443,0,102,111],[549,0,87,88],[640,0,74,133],[718,0,83,96],[805,0,75,68],[884,0,82,77],[970,0,77,74],[1051,0,31,64],[1086,0,41,59],[1131,0,50,74]];
const PSET=[null,null,[0,1,2,3],[4,5,6,7,8],[9,10,11,12,13,14]];
const propImg=new Image(); propImg.src='img/props.webp';
let wake={t:0,on:botOn&&!RM&&TIER>=2&&sT<.6,done:false}, waveUntil=0, botT=0;
let sayScene=-1, sayStable=0, sayShown=-1, sayTyping=null;
function sayHide(){ say.classList.remove('on'); sayShown=-1; clearTimeout(sayTyping); }
function sayShow(txt,ms){
  clearTimeout(sayTyping); say.classList.add('on'); say.textContent='';
  let i=0; const step=()=>{ say.textContent=txt.slice(0,i); if(i++<txt.length)sayTyping=setTimeout(step,RM?0:22); };
  if(RM)say.textContent=txt; else step();
  if(bot)bot.talk(Math.min(2600,txt.length*45));
}
function botFrame(dt){
  if(!botOn)return;
  botT+=dt;
  const s=Math.max(0,Math.min(5,sD)), a=Math.min(4,Math.floor(s)), fr=s-a, t=ss(.22,.78,fr), b=Math.min(5,a+1);
  const pa=botPlace(a), pb=botPlace(Math.min(4,b));
  const x=lerp(pa.x,pb.x,t)*W, y=lerp(pa.y,pb.y,t)*H, h=lerp(pa.h,pb.h,t)*H;
  const alpha=1-ss(4.4,4.7,s);
  const dw=Math.round(W*DPR), dh=Math.round(H*DPR);
  if(bc.width!==dw||bc.height!==dh){ bc.width=dw; bc.height=dh; }
  bx.setTransform(DPR,0,0,DPR,0,0); bx.clearRect(0,0,W,H);
  hit.style.display=alpha>.3?'block':'none';
  if(alpha<=.01){ sayHide(); return; }
  const cur=Math.round(s);
  /* форма и поведение по сцене */
  const form=s<2.5?'novice':s<3.5?'adv':'pro';
  const mob=mobileView();
  let mode='idle', face='happy';
  if(cur===1){ mode=mob?'idle':'point'; face='neutral'; }
  else if(cur===3){ mode='think'; face='think'; }
  else if(cur===4){ face='proud'; mode=(Math.floor(botT/5)%3===0)?'cheer':'idle'; }
  if(botT<waveUntil){ mode='wave'; face='happy'; }
  bot.set({form,mode,face,look:[mx*.6,my*.3]});
  /* предметы вокруг робота: позади */
  const props=[];
  if(propImg.complete&&propImg.naturalWidth&&!RM){
    for(let i=2;i<=4;i++){ const w=Math.max(0,1-Math.abs(s-i)*2.6); if(w<.02)continue;
      PSET[i].forEach((k,j)=>{ const n=PSET[i].length, ang=botT*.45+j/n*6.283, z=Math.sin(ang);
        props.push({k,z,w,x:x+Math.cos(ang)*h*.5,y:y-h*.52+z*h*.08+Math.sin(botT*1.7+j)*h*.03,sz:h*(.12+z*.025)}); }); }
  }
  const drawProp=p=>{ const r=PROPS[p.k], sc=p.sz/Math.max(r[2],r[3]); bx.globalAlpha=alpha*p.w*(p.z<0?.55:1); bx.drawImage(propImg,r[0],r[1],r[2],r[3],p.x-r[2]*sc/2,p.y-r[3]*sc/2,r[2]*sc,r[3]*sc); bx.globalAlpha=1; };
  props.filter(p=>p.z<0).forEach(drawProp);
  /* пробуждение при входе: кадры по времени */
  let drew=false;
  if(wake.on&&!wake.done){
    const im=bot.seqImg('seq-wake');
    if(im.complete&&im.naturalWidth){ wake.t+=dt; const f=wake.t/3.2*16;
      if(f>=15.5){ wake.done=true; waveUntil=botT+2.2; }
      else { bot.drawSeq(bx,'seq-wake',f,x,y,h,alpha); drew=true; } }
    else if(botT>2.5){ wake.done=true; }
    else drew=true;
  }
  if(!drew){
    /* превращения по прокрутке */
    const win=[['seq-up1',2.18,2.82],['seq-up2',3.18,3.82]].find(w=>s>w[1]&&s<w[2]);
    let sa=0;
    if(win&&!RM){ const im=bot.seqImg(win[0]); if(im.complete&&im.naturalWidth){ sa=ss(win[1],win[1]+.07,s)*(1-ss(win[2]-.07,win[2],s)); bot.drawSeq(bx,win[0],(s-win[1])/(win[2]-win[1])*15,x,y,h,alpha*sa); } }
    if(sa<.99)bot.draw(bx,x,y,h,dt,alpha*(1-sa)); else bot.draw(bx,-9999,-9999,1,dt,0);
  }
  props.filter(p=>p.z>=0).forEach(drawProp);
  /* место для клика и облачко */
  const bw=h*.62; hit.style.transform='translate('+(x-bw/2).toFixed(0)+'px,'+(y-h).toFixed(0)+'px)'; hit.style.width=bw.toFixed(0)+'px'; hit.style.height=h.toFixed(0)+'px';
  const settled=Math.abs(s-cur)<.18&&(wake.done||!wake.on);
  if(cur!==sayScene){ sayScene=cur; sayStable=0; if(sayShown!==cur)sayHide(); }
  sayStable+=dt;
  if(settled&&sayShown!==cur&&sayStable>.45){ sayShown=cur; if(T('say'+cur))sayShow(T('say'+cur)); }
  if(!settled&&sayShown>=0)sayHide();
  const sx=mob&&cur===0?x+bw*.3:x+bw*.42, sy=y-h*1.02;
  say.style.transform='translate('+Math.round(Math.min(W-say.offsetWidth-10,sx))+'px,'+Math.round(Math.max(56,sy-say.offsetHeight))+'px)';
}
hit.addEventListener('click',()=>{
  if(!bot)return; bot.jump();
  const k=1+Math.floor(Math.random()*4); sayShown=-2; sayShow(T('poke'+k));
  if(TR)TR.event('course.poke');
});
if(bot)setTimeout(()=>bot.preload(),1200);
addEventListener('load',()=>{ bgReady=true; bgLoad(true); });

/* ---------- старт ---------- */
fit(); bgLoad(); addEventListener('resize',()=>{ fit(); bgLoad(); });
texts();
readScroll(); sD=sT; placeText();
requestAnimationFrame(frame);
})();
