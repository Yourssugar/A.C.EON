/* FORGE · КУЗНЯ: главная страница.
   На весь экран идёт закольцованный фильм: слиток греется в горне, крюк на рельсе несёт его к наковальне,
   молот плющит в плиту, плита остывает в корыте и встаёт на витрину, где на ней появляется готовый проект
   (случайный шаблон из конструктора страниц или графической мастерской). Камера едет вдоль кузни по кругу.

   Мир: панорама 6144 x 1536 (film/pano-bg), все координаты ниже в её пикселях. Панорама бесшовная,
   поэтому предмет с координатой x виден и на x+6144: рисуем ближайшую к камере копию (near()).
   Время: цикл CYC секунд, всё движение считается от t (0..CYC) по таблицам ключей, кривые ease-in-out.
   Слои: #cv (фон, станции, крюк, частицы), #proj (проект на плите, DOM), #fg (передний план, затемнение).
   «Меньше движения» в системе: неподвижный кадр у витрины. U-1: меньше частиц, 30 кадров в секунду. */
(function(){
'use strict';
const $=id=>document.getElementById(id);
const AU=window.AceonUniverse||{id:2,capMs:15,particleScale:.7,dprCap:1.5};
const FREEZE=/[?&]freeze/.test(location.search);
const RM=FREEZE||matchMedia('(prefers-reduced-motion: reduce)').matches;
const PS=Math.max(.3,AU.particleScale||.7);
const CAP=AU.capMs||15;
let PORTAL=false; try{ PORTAL=window.self!==window.top; }catch(e){ PORTAL=true; }

/* ---------- язык ---------- */
const FL=window.FORGE_LANG||{ru:{}};
const CODES=['ru','en','de','fr','es','it','pl'];
const hasI18n=!!(window.I18n&&window.Store);
function readSite(){ try{ return JSON.parse(localStorage.getItem('aceon:site')||'null')||{}; }catch(e){ return {}; } }
let fbLang=(function(){ const s=readSite().lang; if(CODES.indexOf(s)>=0) return s; const n=navigator.languages||[navigator.language||'en']; for(const c of n){ const k=String(c).slice(0,2).toLowerCase(); if(CODES.indexOf(k)>=0) return k; } return 'en'; })();
const lang=()=>{ const l=hasI18n?I18n.lang:fbLang; return CODES.indexOf(l)>=0?l:'en'; };
function T(k){ const d=FL[lang()]||FL.en; return d[k]!==undefined?d[k]:(FL.en[k]!==undefined?FL.en[k]:k); }
function setLang(c){
  if(CODES.indexOf(c)<0||c===lang()) return;
  if(hasI18n) I18n.set(c); else { fbLang=c; const o=readSite(); o.lang=c; if(!o.v) o.v=1; try{ localStorage.setItem('aceon:site',JSON.stringify(o)); }catch(e){} }
  document.documentElement.lang=c;
  if(window.FORGE_I18N) FORGE_I18N.use(c);
  texts(); if(cur) fillProj(cur); fillCap();
}
function texts(){
  document.title=T('title');
  const map={tKick:'kick',tSub:'sub',tTag:'tagline',tStart:'start',tNow:'now',same:'same',tMenu:'menuT',tCont:'cont',
    tPages:'pages',tPagesD:'pagesD',tGfx:'gfx',tGfxD:'gfxD',tGames:'games',tGamesD:'gamesD',
    tLearn:'learn',tLearnD:'learnD',tO1:'open',tO2:'open',tO3:'open',tFony:'fony',tFonyD:'fonyD',tO4:'open',tKoleso:'koleso',tKolesoD:'kolesoD',tO5:'open',tZvuk:'zvuk',tZvukD:'zvukD',tO6:'open',tBit:'bit',tBitD:'bitD',tO7:'open',tOtk:'otk',tOtkD:'otkD',tS1:'soon',still:'still'};
  for(const id in map){ const e=$(id); if(e) e.textContent=T(map[id]); }
  $('mClose').title=T('close'); $('loading').textContent=T('loading');
  const lg=$('langs'); lg.innerHTML=''; lg.title=T('lang');
  CODES.forEach(c=>{ const b=document.createElement('button'); b.type='button'; b.textContent=c.toUpperCase(); b.classList.toggle('sel',c===lang()); b.onclick=()=>setLang(c); lg.appendChild(b); });
}

/* ---------- мир ---------- */
const PW=6144, PH=1536, CYC=30;
const FUR={x:68,y:40,w:1400,h:1300}, HOLE={x0:488,x1:1045,y0:690,y1:1085}, MOUTH=766, CHIM={x:792,y:150};
const BEL={r:300,y:880,w:700,h:420};
const ANV={x:1754,y:630,w:1100,h:700}, AX=2480, REST=690;
const PIV={x:AX-1010,y:360}, ARM_REST=-32*Math.PI/180;
const TRO={x:3190,y:740,w:1300,h:620}, WATER=885;
const SHW={x:4976,y:440,w:800,h:960}, SHX=5376, SHTOP=540;
const RAILY=20, CHAINY=100, HK={w:240,h:420,g:352}, R=120;
const IW=336, IH=180, PLW=612, PLH=460;
const STRIKES=[9.0,9.9,10.8,11.7], HS=[180,150,120,95,72], WS=[336,358,380,400,418];

/* ---------- кривые ---------- */
const cl=v=>v<0?0:v>1?1:v;
const ease=p=>p<.5?2*p*p:1-Math.pow(-2*p+2,2)/2;
const lerp=(a,b,p)=>a+(b-a)*p;
const seg=(t,a,b)=>ease(cl((t-a)/(b-a)));
function K(keys,t){ if(t<=keys[0][0]) return keys[0][1];
  for(let i=1;i<keys.length;i++){ if(t<=keys[i][0]){ const a=keys[i-1], b=keys[i]; return lerp(a[1],b[1],ease((t-a[0])/(b[0]-a[0]||1))); } }
  return keys[keys.length-1][1]; }
const HX=[[0,768],[4.8,768],[7.0,AX],[7.9,AX],[8.6,AX+480],[12.2,AX+480],[12.8,AX],[14.2,AX],[16.4,3840],[18.8,3840],[21.0,SHX],[22.0,SHX],[23.0,SHX+650],[27.2,SHX+650],[30,768+PW]];
const HY=[[0,R],[2.6,R],[3.5,618],[3.9,618],[4.7,R],[7.0,R],[7.5,REST-IH-HK.g],[7.8,REST-IH-HK.g],[8.2,R],[12.2,R],[12.8,R],[13.2,REST-72-HK.g],[13.45,REST-72-HK.g],[14.2,R],
  [16.4,R],[17.2,1280-PLH-HK.g],[18.0,1280-PLH-HK.g],[18.8,R],[21.0,R],[21.7,SHTOP-HK.g],[22.0,SHTOP-HK.g],[22.6,R],[30,R]];
const CX=[[0,820],[4.6,820],[7.2,AX],[13.6,AX],[16.4,3840],[18.6,3840],[21.0,SHX],[27.0,SHX],[30,820+PW]];
const closed=t=>(t>=3.75&&t<7.6)||(t>=13.35&&t<21.9);

/* молот: угол рычага и высота заготовки на наковальне */
function strikeAngle(h){ return Math.asin(cl((REST-h-PIV.y-150)/1010)); }
function armAngle(t){
  for(let i=0;i<STRIKES.length;i++){ const s=STRIKES[i], a=strikeAngle(HS[i+1]);
    if(t>=s-.16&&t<s) return lerp(ARM_REST,a,Math.pow((t-(s-.16))/.16,2));
    if(t>=s&&t<s+.65) return lerp(a,ARM_REST,ease((t-s)/.65)); }
  return ARM_REST; }
function slab(t){ let i=0; while(i<STRIKES.length&&t>=STRIKES[i]) i++;
  if(i>0&&t<STRIKES[i-1]+.05){ const p=(t-STRIKES[i-1])/.05; return {h:lerp(HS[i-1],HS[i],p),w:lerp(WS[i-1],WS[i],p),n:i}; }
  return {h:HS[i],w:WS[i],n:i}; }
function whiteHeat(t){
  if(t<3.3) return .45+.15*Math.sin(t*3.1);
  if(t<9) return lerp(.45,.12,cl((t-3.3)/4.5));
  let w=.12, f=0; for(const s of STRIKES) if(t>=s){ w+=.17; f=Math.max(f,.45*Math.exp(-(t-s)*4)); }
  return cl(w+f); }

/* заготовка в момент t: что это, где и какого цвета */
function piece(t){
  const hx=K(HX,t), ht=K(HY,t);
  if(t<2.4) return {k:'i',x:MOUTH,b:1080,w:IW*.85,h:IH*.85,wh:whiteHeat(t),inside:1};
  if(t<3.75){ const p=seg(t,2.4,3.3); return {k:'i',x:MOUTH,b:lerp(1080,1150,p),w:IW*lerp(.85,1,p),h:IH*lerp(.85,1,p),wh:whiteHeat(t)}; }
  if(t<7.6) return {k:'i',x:hx,b:ht+HK.g+IH,w:IW,h:IH,wh:whiteHeat(t),drip:1};
  if(t<13.35){ const s=slab(t); return {k:'i',x:AX,b:REST,w:s.w,h:s.h,wh:whiteHeat(t),flat:s.n}; }
  if(t<14.2){ const m=seg(t,13.35,14.1), top=ht+HK.g; return {k:'m',x:hx,top:top,m:m,sw:WS[4],sh:72,wh:whiteHeat(12)}; }
  if(t<21.9) return {k:'p',x:hx,top:ht+HK.g,cool:seg(t,16.9,18.0),drip:t<16.8?1:0,dip:t>=16.4&&t<18.8};
  return {k:'p',x:SHX,top:SHTOP,cool:1,shown:1};
}

/* ---------- картинки ---------- */
const NAMES=['pano-bg','pano-front','pano-rail','st-furnace','st-bellows','st-anvil','st-hammer-frame','st-hammer-arm','st-hook-open','st-hook-closed',
  'st-trough-back','st-trough-front','st-showcase','st-spot','piece-ingot-hot','piece-ingot-white','piece-plate-hot','piece-plate-cool',
  'fx-spark','fx-ember','fx-glow','fx-steam-1','fx-steam-2','fx-steam-3','fx-smoke-1','fx-smoke-2','fx-splash-1','fx-splash-2'];
const IMG={}; let SMALL=false, ready=false;
function load(n){ return new Promise(res=>{ const im=new Image(); im.decoding='async'; im.onload=()=>{ IMG[n]=im; res(); }; im.onerror=()=>res(); im.src='film/'+(SMALL?'s/':'')+n+'.webp'; }); }
/* белые спрайты, перекрашенные один раз */
const TINT={};
function tint(n,col,key){ const im=IMG[n]; if(!im) return; const c=document.createElement('canvas'); c.width=im.naturalWidth; c.height=im.naturalHeight;
  const g=c.getContext('2d'); g.drawImage(im,0,0); g.globalCompositeOperation='source-in'; g.fillStyle=col; g.fillRect(0,0,c.width,c.height); TINT[key]=c; }

/* ---------- холсты и камера ---------- */
const cv=$('cv'), fg=$('fg'), g=cv.getContext('2d'), f=fg.getContext('2d');
let W=0, H=0, DPR=1, k0=1, k=1, ox=0, oy=0, camX=0, portrait=false, y0=0;
function resize(){
  W=innerWidth; H=innerHeight; DPR=Math.min(window.devicePixelRatio||1, AU.dprCap||1.5, AU.id<=1?1.25:2);
  portrait=H>W;
  for(const c of [cv,fg]){ c.width=Math.round(W*DPR); c.height=Math.round(H*DPR); }
  k0=Math.min(H/PH, W/1150);
  y0=(H-PH*k0)*(portrait?.56:.5);
  if(RM||!running) draw(tNow());
}
/* камера: положение по времени, сдвиг станции правее центра на широком экране, приближение у витрины */
let shake=0;
function camera(t){
  camX=K(CX,t);
  const shift=portrait?0:.1*W/k0;
  const ZH=portrait?1.55:1.28, z=lerp(1,ZH,seg(t,21.4,23.0)*(1-seg(t,26.8,28.0)));
  const ox0=W/2-(camX-shift)*k0, oy0=y0;
  const Fx=near(SHX), Fy=770;
  const fx=Fx*k0+ox0, fy=Fy*k0+oy0;
  k=k0*z; ox=fx-Fx*k; oy=fy-Fy*k;
  if(shake>0){ ox+=(Math.random()-.5)*shake*k; oy+=(Math.random()-.5)*shake*k; }
}
/* ближайшая к камере копия точки x на кольце панорамы */
const near=x=>x+PW*Math.round((camX-x)/PW);
const vis=(x,w)=>{ const sx=x*k+ox; return sx+w*k>-50&&sx<W+50; };
function img(n,x,y,w,h,ctx){ const im=IMG[n]; if(!im) return; (ctx||g).drawImage(im,x,y,w,h); }

/* ---------- частицы ---------- */
let P=[];
const MAXP=Math.round(260*PS);
function add(o){ if(P.length<MAXP) P.push(o); }
function emit(dt,t){
  const rate=r=>Math.random()<r*dt*PS;
  /* огонь в горне (рисуется за кладкой) */
  const pump=bellows(t);
  for(let i=0;i<3;i++) if(rate(7+9*pump)) add({k:'fire',x:lerp(HOLE.x0+60,HOLE.x1-60,Math.random()),y:HOLE.y1-20,vx:(Math.random()-.5)*30,vy:-(140+Math.random()*120)*(1+pump*.6),
    life:0,max:.7+Math.random()*.6,s:110+Math.random()*90,c:Math.random()<.5?'gy':'go'});
  if(rate(5)) add({k:'ember',x:lerp(HOLE.x0+80,HOLE.x1-80,Math.random()),y:HOLE.y1-40,vx:(Math.random()-.4)*90,vy:-(160+Math.random()*160),g:-30,life:0,max:2+Math.random()*1.5,s:14+Math.random()*10});
  if(rate(1.6)) add({k:'smoke',x:CHIM.x+(Math.random()-.5)*30,y:CHIM.y,vx:20+Math.random()*25,vy:-(50+Math.random()*30),life:0,max:5+Math.random()*2,s:200,n:Math.random()<.5?1:2,r:Math.random()*6});
  /* угли сыплются с горячей заготовки, пока её несут */
  const pc=piece(t);
  if(pc.drip&&(pc.k==='i'||pc.cool<.5)&&rate(5)){ const w=pc.k==='i'?pc.w:PLW*.8; const yb=pc.k==='i'?pc.b:pc.top+PLH;
    add({k:'ember',x:pc.x+(Math.random()-.5)*w,y:yb-10,vx:(Math.random()-.5)*60,vy:40+Math.random()*60,g:900,life:0,max:.9+Math.random()*.5,s:12+Math.random()*8}); }
  /* пар над корытом */
  if(t>16.75&&t<19.6&&rate(t<18?16:7)) add({k:'steam',x:3840+(Math.random()-.5)*PLW*1.1,y:WATER-10,vx:(Math.random()-.5)*40,vy:-(70+Math.random()*80),life:0,max:2.4+Math.random()*1.4,s:260+Math.random()*160,n:1+Math.floor(Math.random()*3),r:Math.random()*6});
}
function strikeFX(t,i){
  const s=slab(STRIKES[i]+.06), y=REST-s.h, n=Math.round(14+36*PS);
  for(let j=0;j<n;j++){ const a=-Math.PI*(.06+.88*Math.random()), v=500+Math.random()*900;
    add({k:'spark',x:AX+(Math.random()-.5)*s.w*.8,y:y,vx:Math.cos(a)*v,vy:Math.sin(a)*v,g:1700,life:0,max:.45+Math.random()*.6,s:2+Math.random()*1.6}); }
  flashes.push({x:AX,y:y,t0:STRIKES[i]});
  if(!RM&&AU.id>1) shake=12;
}
function step(dt){
  for(const p of P){ p.life+=dt; p.vy+=(p.g||0)*dt; p.x+=p.vx*dt; p.y+=p.vy*dt;
    if(p.k==='spark'&&p.y>REST+40&&p.vy>0){ p.vy*=-.3; p.vx*=.5; p.y=REST+40; } }
  P=P.filter(p=>p.life<p.max);
  shake*=Math.exp(-dt*14); if(shake<.3) shake=0;
}
let flashes=[];

/* ---------- рисование ---------- */
const bellows=t=>t<3.3?.5-.5*Math.cos(t/1.6*Math.PI*2):.12*(.5-.5*Math.cos(t/2.8*Math.PI*2));
function tiled(n,fac,scale,ctx,phase){
  const im=IMG[n]; if(!im) return;
  const tw=PW*scale*k, th=PH*scale*k, baseY=oy+PH*k-th;
  const off=ox+camX*k*(1-fac)+(phase||0)*k;
  let x0=off%tw; if(x0>0) x0-=tw;
  const sw=im.naturalWidth;
  for(let x=x0;x<W;x+=tw){
    const a=Math.max(0,-x), b=Math.min(tw,W-x); if(b<=a) continue;
    ctx.drawImage(im,a/tw*sw,0,(b-a)/tw*sw,im.naturalHeight,x+a,baseY,b-a,th);
  }
}
function drawRail(){
  const im=IMG['pano-rail']; if(!im) return;
  const a=Math.floor((camX-W/2/k-2000)/1536), b=Math.ceil((camX+W/2/k+2000)/1536);
  for(let i=a;i<=b;i++){ const x=i*1536; if(vis(x,1536)) g.drawImage(im,x,RAILY,1536,160); }
}
function drawChain(x,y1){
  g.save(); g.lineCap='round';
  for(let y=CHAINY,i=0;y<y1;y+=24,i++){
    g.strokeStyle='#2b211a'; g.lineWidth=7;
    if(i%2){ g.beginPath(); g.moveTo(x,y); g.lineTo(x,Math.min(y+24,y1)); g.stroke(); }
    else{ g.beginPath(); g.ellipse(x,y+12,7,13,0,0,Math.PI*2); g.stroke(); g.strokeStyle='rgba(255,150,90,.35)'; g.lineWidth=2; g.beginPath(); g.ellipse(x-2,y+12,5,11,0,Math.PI*.9,Math.PI*1.5); g.stroke(); }
  }
  g.restore();
}
function glow(key,x,y,rx,ry,a,ctx){ const c=TINT[key]; if(!c||a<=0) return; ctx=ctx||g; ctx.globalAlpha=Math.min(1,a); ctx.drawImage(c,x-rx,y-ry,rx*2,ry*2); ctx.globalAlpha=1; }

function drawIngot(p){
  const x=p.x-p.w/2, y=p.b-p.h;
  g.globalCompositeOperation='lighter'; glow('go',p.x,y+p.h/2,p.w*1.25,p.h*1.6,.35+.35*p.wh); g.globalCompositeOperation='source-over';
  img('piece-ingot-hot',x,y,p.w,p.h);
  if(p.wh>0){ g.globalAlpha=p.wh; img('piece-ingot-white',x,y,p.w,p.h); g.globalAlpha=1; }
}
function drawPlate(p,clipBottom){
  const x=p.x-PLW/2, y=p.top;
  g.save();
  if(clipBottom){ g.beginPath(); g.rect(x-200,y-400,PLW+400,clipBottom-(y-400)); g.clip(); }
  if(p.cool<1){ g.globalCompositeOperation='lighter'; glow('go',p.x,y+PLH/2,PLW*.95,PLH*1.05,.45*(1-p.cool)); g.globalCompositeOperation='source-over'; }
  img('piece-plate-cool',x,y,PLW,PLH);
  if(p.cool<1){ g.globalAlpha=1-p.cool; img('piece-plate-hot',x,y,PLW,PLH); g.globalAlpha=1; }
  g.restore();
}
function drawMorph(p){
  const sh=lerp(p.sh,PLH,p.m), x=p.x;
  if(p.m<1){ g.globalAlpha=1-cl(p.m*1.6); drawIngot({x:x,b:p.top+p.sh,w:p.sw,h:p.sh,wh:p.wh}); g.globalAlpha=1; }
  g.globalAlpha=cl(p.m*1.4); img('piece-plate-hot',x-PLW/2,p.top,PLW,sh); g.globalAlpha=1;
}
function drawHook(t){
  const hx=near(K(HX,t)), ht=K(HY,t);
  if(!vis(hx-HK.w,HK.w*2)) return;
  drawChain(hx,ht+6);
  img(closed(t)?'st-hook-closed':'st-hook-open',hx-HK.w/2,ht,HK.w,HK.h);
}
function particles(kind){
  for(const p of P){ if(kind.indexOf(p.k)<0) continue;
    const x=near(p.x), a=1-p.life/p.max;
    if(p.k==='fire'){ const s=p.s*(1-p.life/p.max*.6); glow(p.c,x,p.y,s*.5,s*.8,a*.9); }
    else if(p.k==='ember'){ glow('eo',x,p.y,p.s,p.s,Math.min(1,a*1.6)); }
    else if(p.k==='spark'){ const c=TINT.sy; if(!c) continue; g.save(); g.translate(x,p.y); g.rotate(Math.atan2(p.vy,p.vx)+Math.PI); g.globalAlpha=Math.min(1,a*1.8); g.drawImage(c,-32*p.s,-32*p.s,64*p.s,64*p.s); g.restore(); }
    else if(p.k==='smoke'){ const s=p.s*(.6+p.life/p.max*1.4); g.globalAlpha=.16*a*Math.min(1,p.life*2); img('fx-smoke-'+p.n,x-s/2,p.y-s/2,s,s); g.globalAlpha=1; }
    else if(p.k==='steam'){ const s=p.s*(.45+p.life/p.max*1.1); g.globalAlpha=.42*a*Math.min(1,p.life*3); img('fx-steam-'+p.n,x-s/2,p.y-s/2,s,s); g.globalAlpha=1; }
  }
}

function draw(t){
  if(!ready) return;
  camera(t);
  g.setTransform(DPR,0,0,DPR,0,0);
  g.fillStyle='#0b0907'; g.fillRect(0,0,W,H);
  /* фон: панорама с параллаксом */
  tiled('pano-bg',.86,1,g);
  g.setTransform(k*DPR,0,0,k*DPR,ox*DPR,oy*DPR);
  const fl=.85+.15*Math.sin(t*7.3)*Math.sin(t*3.1)+.2*bellows(t);
  /* тёплое пятно горна на стене */
  const fx=near(MOUTH);
  g.globalCompositeOperation='lighter'; glow('go',fx,880,1250,820,.22*fl); g.globalCompositeOperation='source-over';

  /* горн: жар внутри, мехи, кладка */
  if(vis(FUR.x-500+near(MOUTH)-MOUTH,FUR.w+600)){
    const d=near(MOUTH)-MOUTH;
    g.save(); g.translate(d,0);
    const gr=g.createLinearGradient(0,HOLE.y0,0,HOLE.y1); gr.addColorStop(0,'#1a0703'); gr.addColorStop(.6,'#5a1606'); gr.addColorStop(1,'#c2410c');
    g.fillStyle=gr; g.fillRect(HOLE.x0,HOLE.y0,HOLE.x1-HOLE.x0,HOLE.y1-HOLE.y0);
    g.globalCompositeOperation='lighter';
    for(let i=0;i<7;i++){ const x=lerp(HOLE.x0+50,HOLE.x1-50,i/6); glow(i%2?'gr':'go',x,HOLE.y1-30,95,60,.55+.25*Math.sin(t*5+i*1.7)*fl); }
    g.restore();
    const pc0=piece(t);
    if(pc0.inside) drawIngot(Object.assign({},pc0,{x:near(pc0.x)}));
    g.globalCompositeOperation='lighter'; particles(['fire']); g.globalCompositeOperation='source-over';
    g.save(); g.translate(d,0);
    img('st-furnace',FUR.x,FUR.y,FUR.w,FUR.h);
    const pump=bellows(t), bh=BEL.h*(1-.16*pump);
    g.save(); g.translate(BEL.r,BEL.y+BEL.h); g.scale(-1,1); img('st-bellows',0,-bh,BEL.w,bh); g.restore();
    g.restore();
  }
  /* наковальня и молот */
  const da=near(AX)-AX;
  if(vis(PIV.x-300+da,1600)){
    g.save(); g.translate(da,0);
    img('st-hammer-frame',PIV.x-300,PIV.y-260,900,1300);
    img('st-anvil',ANV.x,ANV.y,ANV.w,ANV.h);
    g.restore();
  }
  /* корыто: задняя стенка, вода */
  const dt3=near(3840)-3840;
  if(vis(TRO.x+dt3,TRO.w)) img('st-trough-back',TRO.x+dt3,TRO.y,TRO.w,TRO.h);
  /* витрина и свет на неё */
  const ds=near(SHX)-SHX;
  if(vis(SHW.x+ds-200,SHW.w+400)){
    img('st-showcase',SHW.x+ds,SHW.y,SHW.w,SHW.h);
  }
  const pc=piece(t);
  /* плита на витрине: новая после 21.9 с, прошлая видна в начале цикла, пока камера не уехала */
  const showPlate=pc.shown||(t<8&&cycleN>0);
  if(showPlate) drawPlate({x:near(SHX),top:SHTOP,cool:1});
  /* заготовка в работе */
  if(!pc.inside&&!pc.shown){
    const p2=Object.assign({},pc,{x:near(pc.x)});
    if(pc.k==='i') drawIngot(p2);
    else if(pc.k==='m') drawMorph(p2);
    else if(pc.k==='p') drawPlate(p2,pc.dip?TRO.y+TRO.h-30:0);
  }
  if(vis(TRO.x+dt3,TRO.w)) img('st-trough-front',TRO.x+dt3,TRO.y,TRO.w,TRO.h);
  /* рычаг молота поверх заготовки */
  if(vis(PIV.x-300+da,1600)){
    g.save(); g.translate(PIV.x+da,PIV.y); g.rotate(armAngle(t)); img('st-hammer-arm',-140,-150,1200,300); g.restore();
  }
  /* всплеск при входе плиты в воду */
  if(t>16.7&&t<17.7){ const p=(t-16.7)/1, x=near(3840);
    g.globalAlpha=1-p; img('fx-splash-1',x-420*(.7+p*.6),WATER-210*(.7+p*.6),600*(.7+p*.6),300*(.7+p*.6)); img('fx-splash-2',x-40,WATER-260*(.6+p*.7),560*(.6+p*.7),280*(.6+p*.7)); g.globalAlpha=1; }
  particles(['smoke','steam']);
  /* рельс, цепь, крюк */
  drawRail(); drawHook(t);
  /* свет: отблеск горна на полу, вспышки ударов, искры, угли, прожектор витрины */
  g.globalCompositeOperation='lighter';
  glow('go',fx,1180,900,260,.32*fl);
  for(const fl2 of flashes){ const a=1-(t-fl2.t0)/.3; if(a>0&&t>=fl2.t0) glow('gy',near(fl2.x),fl2.y,420,300,a); }
  particles(['spark','ember']);
  g.globalCompositeOperation='screen';
  const sa=seg(t,21.8,22.6)*(1-seg(t,28.4,29.4));
  if(sa>0){ g.globalAlpha=sa*.9; img('st-spot',near(SHX)-500,-90,1000,1500); g.globalAlpha=1; }
  g.globalCompositeOperation='source-over';
  /* края кадра, если панорама не закрывает экран по высоте */
  g.setTransform(DPR,0,0,DPR,0,0);
  const top=oy, bot=oy+PH*k;
  if(top>0){ const gr=g.createLinearGradient(0,top-1,0,top+60); gr.addColorStop(0,'#0b0907'); gr.addColorStop(1,'rgba(11,9,7,0)'); g.fillStyle='#0b0907'; g.fillRect(0,0,W,top); g.fillStyle=gr; g.fillRect(0,top-1,W,61); }
  if(bot<H){ const gr=g.createLinearGradient(0,bot-90,0,bot+1); gr.addColorStop(0,'rgba(11,9,7,0)'); gr.addColorStop(1,'#0b0907'); g.fillStyle=gr; g.fillRect(0,bot-90,W,91); g.fillStyle='#0b0907'; g.fillRect(0,bot,W,H-bot); }

  /* передний план */
  f.setTransform(DPR,0,0,DPR,0,0); f.clearRect(0,0,W,H);
  if(AU.id>1||!portrait) tiled('pano-front',1.3,1.2,f,SHX*1.3+PW*.6); /* фаза: столбы переднего плана не закрывают витрину */
  const vg=f.createRadialGradient(W/2,H/2,Math.min(W,H)*.35,W/2,H/2,Math.max(W,H)*.75);
  vg.addColorStop(0,'rgba(0,0,0,0)'); vg.addColorStop(1,'rgba(0,0,0,.55)'); f.fillStyle=vg; f.fillRect(0,0,W,H);

  placeProj(t);
}

/* ---------- проект на плите ---------- */
const proj=$('proj'); let cur=null, cycleN=0, lastIds=[], depsP=null;
function loadScript(src){ return new Promise((res,rej)=>{ const s=document.createElement('script'); s.src=src; s.onload=res; s.onerror=rej; document.head.appendChild(s); }); }
function deps(){
  if(depsP) return depsP;
  const lk=document.createElement('link'); lk.rel='stylesheet';
  lk.href='https://fonts.bunny.net/css?family=manrope:400,600,700,800|unbounded:500,700|inter:400,600,700,800|montserrat:400,600,700,800|rubik:400,500,700|nunito:400,600,800|comfortaa:500,700|oswald:500,700|lora:500,600,700|playfair-display:600,700,800|cormorant-garamond:500,600,700|pt-serif:400,700|jetbrains-mono:400,700&display=swap';
  document.head.appendChild(lk);
  depsP=loadScript('i18n-forge.js?v=8').then(()=>loadScript('HTML-CSS-JS/engine.js?v=3')).then(()=>loadScript('grafika/lib/qrcode.js'))
    .then(()=>loadScript('grafika/gfx-engine.js?v=5')).then(()=>loadScript('fony/fony-engine.js?v=1')).then(()=>{ if(window.FORGE_I18N) FORGE_I18N.use(lang()); });
  return depsP;
}
function pool(){
  const a=[];
  (window.TEMPLATES||[]).forEach(t=>{ if(t.blocks&&t.blocks.length) a.push({k:'page',id:t.id,name:t.name}); });
  (window.GTEMPLATES||[]).forEach(t=>a.push({k:'gfx',id:t.id,name:t.name}));
  if(window.FONY) FONY.TPLS.forEach(t=>a.push({k:'fony',id:t.id,name:t.name}));
  return a;
}
function pick(){
  const a=pool().filter(p=>lastIds.indexOf(p.id)<0); if(!a.length) return null;
  const p=a[Math.floor(Math.random()*a.length)]; lastIds.push(p.id); if(lastIds.length>4) lastIds.shift(); return p;
}
const OW=720, OH=Math.round(720*(PLH*.78)/(PLW*.82));
function fillProj(p){
  proj.innerHTML=''; proj.style.width=OW+'px'; proj.style.height=OH+'px';
  try{
    if(p.k==='page'){
      const st=fromTemplate(p.id); const fr=document.createElement('iframe'); fr.setAttribute('sandbox',''); fr.setAttribute('aria-hidden','true'); fr.tabIndex=-1;
      fr.style.width=OW+'px'; fr.style.height=OH+'px'; fr.srcdoc=buildPage(st,'file').replace(/<script>[\s\S]*?<\/script>/g,''); proj.appendChild(fr);
    }else if(p.k==='fony'){
      const b=FONY.fromTpl(p.id); b.anim=true; proj.innerHTML=FONY.svg(b,OW,OH,{anim:true,id:'pj'}); proj.firstElementChild.style.display='block';
    }else{
      const w=fromGTemplate(p.id), c=document.createElement('canvas'), s=Math.min(OW/w.w,OH/w.h), dpr=1.5;
      c.width=Math.round(w.w*s*dpr); c.height=Math.round(w.h*s*dpr); c.style.width=Math.round(w.w*s)+'px'; c.style.height=Math.round(w.h*s)+'px'; c.style.marginTop=Math.round((OH-w.h*s)/2)+'px';
      proj.appendChild(c); proj.style.background='#141110';
      const paint=()=>{ const x=c.getContext('2d'); x.setTransform(1,0,0,1,0,0); x.clearRect(0,0,c.width,c.height); drawWork(x,w,{scale:s*dpr,clipRound:true}); };
      window.onAsset=paint; paint(); setTimeout(paint,600); setTimeout(paint,1800);
    }
    if(p.k==='page') proj.style.background='#fff';
  }catch(e){ proj.innerHTML=''; }
}
let pendingFor=-1;
function manageProj(t){
  /* каждый цикл после 8 с готовим следующий проект: прошлая плита уже за кадром */
  if(t>=8&&pendingFor!==cycleN&&depsP){ pendingFor=cycleN; depsP.then(()=>{ const p=pick(); if(p){ nextP=p; } }); }
  if(t>=22.2&&nextP&&shownFor!==cycleN){ shownFor=cycleN; cur=nextP; nextP=null; fillProj(cur); fillCap(); }
}
let nextP=null, shownFor=-1;
function projAlpha(t){ if(t>=8&&t<22.2) return 0; if(t>=22.2) return seg(t,22.2,23.0); return cycleN>0?1-seg(t,.5,2.5):0; }
function placeProj(t){
  const a=cur?projAlpha(t):0;
  if(a<=0){ proj.style.opacity=0; proj.style.visibility='hidden'; return; }
  const x=near(SHX)-PLW*.41, y=SHTOP+PLH*.11, w=PLW*.82, s=w*k/OW;
  const sx=x*k+ox, sy=y*k+oy;
  if(sx>W||sx+w*k<0){ proj.style.visibility='hidden'; return; }
  proj.style.visibility='visible'; proj.style.opacity=a.toFixed(3);
  proj.style.transform='translate('+sx.toFixed(1)+'px,'+sy.toFixed(1)+'px) scale('+s.toFixed(4)+')';
}
function fillCap(){
  if(!cur) return;
  const nm=window.TR?TR(cur.name):cur.name;
  $('capName').innerHTML=''; $('capName').append(nm); const i=document.createElement('i'); i.textContent=T(cur.k==='page'?'kpage':cur.k==='fony'?'kfony':'kgfx'); $('capName').appendChild(i);
  $('same').href=(cur.k==='page'?'HTML-CSS-JS/':cur.k==='fony'?'fony/':'grafika/')+'#tpl='+encodeURIComponent(cur.id);
}
function capOn(t){ $('cap').classList.toggle('on',!!cur&&(RM||(t>=22.8&&t<28.6))); }

/* ---------- цикл ---------- */
/* ?t=секунды: начать фильм с нужного места (для проверки сцен) */
const T_START=(location.search.match(/[?&]t=([\d.]+)/)||[])[1];
let T0=performance.now(), Tacc=T_START?parseFloat(T_START):0, last=0, lastDraw=0, running=false, raf=0, menuOpen=false, prevT=0;
const tNow=()=>RM?(FREEZE&&T_START?parseFloat(T_START):24.6):(Tacc%CYC);
function loop(now){
  raf=requestAnimationFrame(loop);
  if(now-lastDraw<CAP-2) return;
  const dt=Math.min(.05,(now-(last||now))/1000); last=now; lastDraw=now;
  Tacc+=dt; const t=Tacc%CYC, n=Math.floor(Tacc/CYC);
  if(n!==cycleN){ cycleN=n; flashes=[]; }
  for(let i=0;i<STRIKES.length;i++) if(prevT<STRIKES[i]&&t>=STRIKES[i]) strikeFX(t,i);
  prevT=t;
  emit(dt,t); step(dt); manageProj(t);
  draw(t); capOn(t);
}
function play(){ if(running||RM||!ready||menuOpen||document.hidden) return; running=true; last=0; raf=requestAnimationFrame(loop); }
function stop(){ running=false; cancelAnimationFrame(raf); }
document.addEventListener('visibilitychange',()=>{ document.hidden?stop():play(); });

/* ---------- меню ---------- */
function openMenu(){ menuOpen=true; stop(); $('menu').classList.add('on'); $('menu').setAttribute('aria-hidden','false'); history.pushState({fm:1},''); fillCont(); setTimeout(()=>{ const a=$('menu').querySelector('a.tool'); if(a) a.focus(); },50); }
function closeMenu(fromPop){ if(!menuOpen) return; menuOpen=false; $('menu').classList.remove('on'); $('menu').setAttribute('aria-hidden','true'); if(!fromPop) try{ history.back(); }catch(e){} play(); }
$('start').onclick=openMenu; $('mClose').onclick=()=>closeMenu();
$('menu').addEventListener('click',e=>{ if(e.target===$('menu')) closeMenu(); });
addEventListener('popstate',()=>closeMenu(true));
addEventListener('keydown',e=>{ if(e.key==='Escape') closeMenu(); });
/* «Продолжить»: последняя работа из баз конструктора и графики (те же базы и версии, что у инструментов) */
function lastOf(name,store){ return new Promise(res=>{ try{ const r=indexedDB.open(name,1);
  r.onupgradeneeded=()=>r.result.createObjectStore(store,{keyPath:'id'});
  r.onsuccess=()=>{ try{ const q=r.result.transaction(store).objectStore(store).getAll(); q.onsuccess=()=>{ const a=q.result||[]; a.sort((x,y)=>(y.updated||0)-(x.updated||0)); res(a[0]||null); r.result.close(); }; q.onerror=()=>res(null); }catch(e){ res(null); } };
  r.onerror=()=>res(null); }catch(e){ res(null); } }); }
function fillCont(){
  Promise.all([lastOf('forge','pages'),lastOf('forge-gfx','works')]).then(([p,w])=>{
    const c=$('cont'); let it=null, kind='';
    if(p&&(!w||(p.updated||0)>=(w.updated||0))){ it=p; kind='page'; } else if(w){ it=w; kind='gfx'; }
    if(!it){ c.hidden=true; return; }
    c.hidden=false; $('contName').textContent=it.title||'...'; $('contKind').textContent=T(kind==='page'?'contPage':'contGfx');
    c.href=(kind==='page'?'HTML-CSS-JS/':'grafika/')+'#'+encodeURIComponent(it.id);
  });
}

/* ---------- назад ---------- */
$('back').onclick=()=>{ if(PORTAL){ try{ parent.postMessage({aceon:'close'},location.origin); return; }catch(e){} } location.href='../'; };

/* ---------- запуск ---------- */
texts();
if(RM&&!FREEZE){ $('still').hidden=false; }
addEventListener('resize',resize);
resize();
(function boot(){
  const kk=Math.min(innerHeight/PH,innerWidth/1150)*Math.min(window.devicePixelRatio||1,2);
  SMALL=kk<.6||AU.id<=1&&kk<.85;
  const first=['pano-bg','st-furnace','st-bellows','pano-rail','st-hook-open','piece-ingot-hot','piece-ingot-white','fx-glow','fx-ember'];
  Promise.all(first.map(load)).then(()=>{
    tint('fx-glow','#ff7a1f','go'); tint('fx-glow','#ffcf6e','gy'); tint('fx-glow','#ff3d0a','gr'); tint('fx-ember','#ff9a3c','eo');
    return Promise.all(NAMES.filter(n=>first.indexOf(n)<0).map(load));
  }).then(()=>{
    tint('fx-spark','#ffd58a','sy');
    ready=true; $('loading').style.opacity=0;
    deps().then(()=>{ if(RM){ cur=pick(); if(cur){ fillProj(cur); fillCap(); } cycleN=1; draw(tNow()); capOn(tNow()); } else { nextP=pick(); } });
    if(RM){ cycleN=1; draw(tNow()); } else play();
  });
})();
})();
