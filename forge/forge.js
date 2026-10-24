/* FORGE · КУЗНЯ: главная страница кузни.
   Сцена прокрутки: высокий блок #scroller, внутри липкая #stage. Положение прокрутки даёт p от 0 до 1,
   по p считается, где стоит каждый предмет (таблица TL ниже). Прокрутка назад отматывает действие.
   0.00 вход: горн разгорается
   0.10 01 выбери язык: слитки вылетают из горна и встают сеткой (кликабельны)
   0.43 02 собери блок: слиток на наковальню, 6 ударов молота, каждый удар пишет строку кода
   0.71 03 забери код: плита в воду, пар, остывает, поднимается к зрителю с готовым кодом
   Координаты предметов в единицах u: 1u = сотая ширины сцены (на телефоне своя раскладка).
   U-1: без канвасов (огонь статичный, без искр и пара). Меньше движения: без тряски, частиц и сглаживания.
   Меню справа: список языков, сцены этой страницы, язык интерфейса. */
(function(){
'use strict';
const $=id=>document.getElementById(id);
const AU=window.AceonUniverse||{id:2,fx:2,capMs:16,particleScale:.7,dprCap:1.5};
const RM=matchMedia('(prefers-reduced-motion: reduce)').matches;
const TIER=AU.id||2;
const FX=TIER>=2&&!RM;
const TR=window.Trace||null;
let PORTAL=false; try{ PORTAL=window.self!==window.top; }catch(e){ PORTAL=true; }

/* ---------- язык ---------- */
const FL=window.FORGE_LANG||{ru:{}};
const CODES=['en','ru','de','fr','es','it','pl'];
const hasI18n=!!(window.I18n&&window.Store);
function readSite(){ try{ return JSON.parse(localStorage.getItem('aceon:site')||'null')||{}; }catch(e){ return {}; } }
let fbLang=(function(){ const s=readSite().lang; if(CODES.indexOf(s)>=0)return s; const n=(navigator.languages||[navigator.language||'en']); for(const c of n){ const k=String(c).slice(0,2).toLowerCase(); if(CODES.indexOf(k)>=0)return k; } return 'en'; })();
const lang=()=>hasI18n?I18n.lang:fbLang;
function T(k,v){ const d=FL[lang()]||FL.en||{}; let s=d[k]!==undefined?d[k]:((FL.en||{})[k]!==undefined?FL.en[k]:k); if(v)s=s.replace(/\{(\w+)\}/g,(m,n)=>v[n]!==undefined?v[n]:m); return s; }
function setLang(c){
  if(CODES.indexOf(c)<0||c===lang())return;
  if(hasI18n)I18n.set(c); else { fbLang=c; const o=readSite(); o.lang=c; if(!o.v)o.v=1; try{ localStorage.setItem('aceon:site',JSON.stringify(o)); }catch(e){} }
  document.documentElement.lang=c; if(TR)TR.event('lang.change');
  texts();
}
const esc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

/* ---------- данные ---------- */
const LANGS=(window.LANGS||[]).filter(l=>l&&l.id);
const SCENE=LANGS.slice(0,6);
const ready=LANGS.filter(l=>l.on).length;
const FIRST=LANGS.find(l=>l.on&&l.mode==='run')||LANGS.find(l=>l.on)||LANGS[0]||{id:'html',glyph:'</>',href:'#'};
const workIdx=Math.max(0,SCENE.indexOf(FIRST));
const desc=l=>{ const k='d.'+l.id, s=T(k); return s!==k?s:(l.desc||''); };

/* ---------- математика ---------- */
const cl=(v,a,b)=>v<a?a:v>b?b:v;
const lerp=(a,b,t)=>a+(b-a)*t;
const sm=(a,b,v)=>{ const t=cl((v-a)/(b-a),0,1); return t*t*(3-2*t); };
const eOut=t=>1-Math.pow(1-t,3), eIn=t=>t*t*t;

/* ---------- раскладки (u, центр сцены = 0,0, y вниз) ---------- */
const AR={furnace:.651,anvil:.6033,ingot:.5464,hammer:2.0267,plate:.2933,trough:.391};
const LAY={
  L:{ u:(W,H)=>Math.min(W/100,H/56),
    furnace:{x:-52,y:-9.95,w:46}, anvil:{x:2,y:.5,w:34},
    slots:[[2,-9],[18,-9],[34,-9],[2,7],[18,7],[34,7]], ingW:12,
    work:{cx:23.1,cy:-1.15,w:13},           /* слиток на наковальне (центр) */
    hammer:{H:24,px:44,py:-9.4,up:-30},
    plateA:{cx:23.1,cy:-.4,w:22},            /* плита на наковальне */
    trough:{x:3,y:9,w:40}, dip:{cx:23,cy:18.5},
    plateF:{cx:0,cy:0,w:74,k:1.1},
    hero:{x:-46,y:-21,w:52}, heroShift:[-22,4], cap:{x:-46,y:-22,w:40}, code:{x:-46,y:-7,w:34},
    final:{x:0,y:15.5},
    fs:{h2:[3.4,24,48],p:[1.25,12.5,16],t:[9,56,130],ing:[1.2,11,15]} },
  P:{ u:(W,H)=>Math.min(W/62,H/120),
    furnace:{x:-29,y:-40,w:46}, anvil:{x:-24,y:13.5,w:44},
    slots:[[-13,-3],[13,-3],[-13,13],[13,13],[-13,29],[13,29]], ingW:17,
    work:{cx:3.3,cy:11.55,w:16},
    hammer:{H:26,px:25.9,py:2,up:-30},
    plateA:{cx:3.3,cy:11.9,w:24},
    trough:{x:-28,y:30,w:56}, dip:{cx:0,cy:42},
    plateF:{cx:0,cy:-6,w:58,k:1.9},
    hero:{x:-28,y:-57,w:56}, heroShift:[0,26], cap:{x:-28,y:-60,w:56}, code:{x:-28,y:43,w:56},
    final:{x:0,y:20},
    fs:{h2:[4.8,24,36],p:[2.2,12.5,15],t:[15,56,110],ing:[2.1,11,14]} }
};
let L=LAY.L, u=10, SW=0, SH=0;

/* ---------- элементы ---------- */
const stage=$('stage'), world=$('world'), scroller=$('scroller');
const E={bg:$('bg'),glow:$('glow'),furnace:$('furnace'),anvil:$('anvil'),plate:$('plate'),hot:$('plate').querySelector('.hot'),code:$('code'),
  tb:$('trough-back'),tf:$('trough-front'),hammer:$('hammer'),flash:$('flash'),dark:$('dark'),hero:$('hero'),hint:$('hint'),
  cap1:$('cap1'),cap2:$('cap2'),cap3:$('cap3'),codebox:$('codebox'),final:$('final')};

/* слитки */
const ingots=SCENE.map((l,i)=>{
  const el=document.createElement(l.on?'a':'div');
  el.className='ob ingot '+(l.on?'on hot ':'soon cold ')+(l.mode==='run'?'run':'gen');
  if(l.on){ el.href=l.href; el.addEventListener('click',()=>{ if(TR)TR.event('forge.pick'); }); } else el.setAttribute('aria-disabled','true');
  el.innerHTML='<div class="lift"><div class="heat"></div><img src="img/'+(l.on?'ingot-hot':'ingot-cold')+'.webp" alt="" decoding="async"><span class="glyph"></span></div>'
    +'<div class="tag"><div class="nm"></div><div class="st"><span class="dot"></span><span class="stt"></span></div></div>';
  el.querySelector('.glyph').textContent=l.glyph;
  el.querySelector('.nm').textContent=l.name;
  $('ingots').appendChild(el);
  return {l,el,glyph:el.querySelector('.glyph')};
});

/* код */
function codeLines(){
  const b=esc(T('btn'));
  return [
    '<span class="tk">&lt;button</span> <span class="at">class</span>=<span class="tk">"btn"</span><span class="tk">&gt;</span><span class="ed">'+b+'</span><span class="tk">&lt;/button&gt;</span>',
    '<span class="tk">&lt;style&gt;</span>',
    '.btn { padding: <span class="ed">12px 24px</span>;',
    '       background: <span class="ed">#4fd6c8</span>;',
    '       border-radius: <span class="ed">6px</span>; }',
    '<span class="tk">&lt;/style&gt;</span>'
  ];
}
const NL=6;
function buildCode(){
  const ls=codeLines();
  $('cbLines').innerHTML=ls.map((s,i)=>'<div class="ln"><span class="n">'+(i+1)+'</span><span>'+s+'</span></div>').join('');
  E.code.innerHTML=ls.map(s=>'<div>'+s+'</div>').join('');
  shownLines=-1;
}
let shownLines=-1;

/* ---------- размеры ---------- */
function px(x){ return SW/2+x*u; } function py(y){ return SH/2+y*u; }
function setBox(el,w,h){ el.style.width=w+'px'; if(h!==undefined)el.style.height=h+'px'; }
function fsz(a){ return cl(a[0]*u,a[1],a[2]); }
let plateBaseW=0, plateBaseH=0, ingBaseW=0;
function layout(){
  SW=stage.clientWidth; SH=stage.clientHeight;
  L=SW/SH>=1.05?LAY.L:LAY.P; u=L.u(SW,SH);
  setBox(E.furnace,L.furnace.w*u); setBox(E.anvil,L.anvil.w*u);
  setBox(E.tb,L.trough.w*u); setBox(E.tf,L.trough.w*u);
  const hw=L.hammer.H/AR.hammer*u; setBox(E.hammer,hw);
  ingBaseW=L.ingW*u;
  ingots.forEach(g=>{ setBox(g.el,ingBaseW); g.glyph.style.fontSize=(ingBaseW*.15)+'px'; });
  plateBaseW=L.plateF.w*u; plateBaseH=plateBaseW*AR.plate*L.plateF.k;
  setBox(E.plate,plateBaseW,plateBaseH);
  E.plate.querySelectorAll('img').forEach(im=>{ im.style.width='100%'; im.style.height='100%'; });
  /* шрифт кода на плите: самая длинная строка ~36 знаков, 6 строк */
  const cw=plateBaseW*.89, ch=plateBaseH*.75;
  E.code.style.setProperty('--cfs',Math.min(cw/(36*.6),ch/(NL*1.55))*.95+'px');
  stage.style.setProperty('--h2',fsz(L.fs.h2)+'px'); stage.style.setProperty('--pfs',fsz(L.fs.p)+'px');
  stage.style.setProperty('--tfs',fsz(L.fs.t)+'px'); stage.style.setProperty('--fs',fsz(L.fs.ing)+'px');
  [E.cap1,E.cap2,E.cap3].forEach(c=>c.style.width=L.cap.w*u+'px');
  E.hero.style.width=L.hero.w*u+'px';
  E.codebox.style.width=cl(L.code.w*u,240,460)+'px';
  E.final.style.width=Math.min(SW-24,L.plateF.w*u)+'px';
  E.glow.style.transform='';
  fxResize(); fireResize();
  render(true);
}

/* ---------- прокрутка ---------- */
let pT=0, pD=0, prevP=0;
function total(){ return Math.max(1,scroller.offsetHeight-SH); }
function readScroll(){ const r=scroller.getBoundingClientRect(); pT=cl(-r.top/total(),0,1); }
function jump(p){ const top=scroller.getBoundingClientRect().top+scrollY+p*total(); scrollTo({top:top,behavior:RM?'auto':'smooth'}); }

/* ---------- удары ---------- */
const S0=.5, SW_=.03, NS=6;
const hitAt=k=>S0+(k+.75)*SW_;
function hits(p){ let n=0; for(let k=0;k<NS;k++)if(p>=hitAt(k))n++; return n; }
function hammerAngle(p){
  const up=L.hammer.up, hit=-90;
  if(p<S0)return up;
  const k=Math.floor((p-S0)/SW_);
  if(k>=NS){ return lerp(hit,up,eOut(sm(S0+NS*SW_,S0+NS*SW_+.02,p))); }
  const t=(p-S0)/SW_-k;
  if(t<.6) return lerp(k===0?up:hit,up-6,eOut(t/.6));
  if(t<.75) return lerp(up-6,hit,eIn((t-.6)/.15));
  return hit;
}

/* ---------- кадр ---------- */
function place(el,cx,cy,w,h,s,rot,op){
  el.style.transform='translate3d('+(px(cx)-w/2).toFixed(1)+'px,'+(py(cy)-h/2).toFixed(1)+'px,0)'+(rot?' rotate('+rot.toFixed(2)+'deg)':'')+(s!==1?' scale('+(typeof s==='number'?s.toFixed(4):s)+')':'');
  el.style.opacity=op===undefined?'':op<=0?'0':op>=1?'1':op.toFixed(3);
  el.style.visibility=op!==undefined&&op<=0?'hidden':'';
}
function placeTL(el,x,y,op,dy){
  el.style.transform='translate3d('+px(x).toFixed(1)+'px,'+(py(y)+(dy||0)).toFixed(1)+'px,0)';
  el.style.opacity=op<=0?'0':op>=1?'1':op.toFixed(3);
  el.style.visibility=op<=0?'hidden':'';
}
let fireLevel=.3, shake=0, scene=0;
function render(force){
  const p=pD;
  /* свет и фон */
  fireLevel=lerp(.28,1,sm(0,.1,p))*(1-.35*sm(.88,.95,p));
  E.bg.style.opacity=(.22+.5*sm(0,.12,p)-.15*sm(.88,.95,p)).toFixed(3);
  E.bg.style.transform='scale('+(1.06-.04*p).toFixed(4)+') translate3d('+(-p*1.5*u).toFixed(1)+'px,0,0)';
  E.dark.style.opacity=(.4*(1-sm(.02,.1,p))+.62*sm(.88,.94,p)).toFixed(3);

  /* горн */
  const F=L.furnace, fh=F.w*AR.furnace, hs=1-eOut(sm(.015,.1,p)), fdim=1-.7*sm(.88,.94,p);
  const fx0=F.x+L.heroShift[0]*hs, fy0=F.y+L.heroShift[1]*hs;
  place(E.furnace,fx0+F.w/2,fy0+fh/2,F.w*u,fh*u,1,0,(1-.55*hs)*fdim);
  const mx=fx0+.48*F.w, my=fy0+.4*fh;
  E.glow.style.left=px(mx)+'px'; E.glow.style.top=py(my)+'px';

  /* первый экран */
  const heroOut=sm(.03,.09,p);
  placeTL(E.hero,L.hero.x,L.hero.y,1-heroOut,-heroOut*40);
  E.hint.style.opacity=(1-sm(.005,.03,p)).toFixed(3);

  /* подписи */
  placeTL(E.cap1,L.cap.x,L.cap.y,sm(.1,.13,p)*(1-sm(.42,.45,p)),(1-sm(.1,.13,p))*20);
  placeTL(E.cap2,L.cap.x,L.cap.y,sm(.45,.48,p)*(1-sm(.71,.74,p)),(1-sm(.45,.48,p))*20);
  placeTL(E.cap3,L.cap.x,L.cap.y,sm(.74,.77,p),(1-sm(.74,.77,p))*20);

  /* слитки */
  const out=sm(.43,.47,p), toAnvil=eOut(sm(.44,.49,p));
  const n=hits(p), morph=n>=3?1:0;
  ingots.forEach((g,i)=>{
    const t=eOut(cl((p-.12-i*.035)/.09,0,1));
    const sl=L.slots[i];
    let x=lerp(mx,sl[0],t), y=lerp(my,sl[1],t)-Math.sin(Math.PI*t)*10, s=lerp(.22,1,t), rot=(1-t)*-35, op=cl(t*5,0,1);
    if(i===workIdx){
      const W=L.work;
      x=lerp(x,W.cx,toAnvil); y=lerp(y,W.cy,toAnvil)-Math.sin(Math.PI*toAnvil)*6; s=lerp(s,W.w/L.ingW,toAnvil);
      if(morph)op=0;
    } else { y+=out*30; op*=1-out; }
    const sq=i===workIdx?Math.min(n,2):0;
    const sx=s*(1+.08*sq), sy=s*(1-.12*sq);
    g.el.style.transform='translate3d('+(px(x)-ingBaseW/2).toFixed(1)+'px,'+(py(y)-ingBaseW*AR.ingot/2).toFixed(1)+'px,0) rotate('+rot.toFixed(1)+'deg) scale('+sx.toFixed(4)+','+sy.toFixed(4)+')';
    g.el.style.opacity=op.toFixed(3); g.el.style.visibility=op<=0?'hidden':'';
    const live=t>.97&&out<.05&&p<.44;
    if(g.el.classList.contains('live')!==live){ g.el.classList.toggle('live',live); if(g.l.on)g.el.tabIndex=live?0:-1; }
  });

  /* наковальня */
  const A=L.anvil, ah=A.w*AR.anvil, ain=eOut(sm(.4,.46,p)), aout=eIn(sm(.72,.77,p));
  place(E.anvil,A.x+A.w/2,A.y+ah/2+(1-ain)*40+aout*45,A.w*u,ah*u,1,0,ain*(1-aout));

  /* молот */
  const Hm=L.hammer, hw=Hm.H/AR.hammer, hin=eOut(sm(.47,.5,p)), hout=sm(.69,.73,p);
  const ang=hammerAngle(p);
  const hx=Hm.px+(1-hin)*30+hout*35, hy=Hm.py-hout*10;
  E.hammer.style.transform='translate3d('+(px(hx)-hw*u/2).toFixed(1)+'px,'+(py(hy)-Hm.H*u*.95).toFixed(1)+'px,0) rotate('+ang.toFixed(2)+'deg)';
  const hop=hin*(1-hout); E.hammer.style.opacity=hop.toFixed(3); E.hammer.style.visibility=hop<=0?'hidden':'';

  /* корыто */
  const Tr=L.trough, th=Tr.w*AR.trough, tin=eOut(sm(.73,.78,p)), tdim=1-.75*sm(.88,.93,p);
  place(E.tb,Tr.x+Tr.w/2,Tr.y+th/2+(1-tin)*40,Tr.w*u,th*u,1,0,tin*tdim);
  place(E.tf,Tr.x+Tr.w/2,Tr.y+th/2+(1-tin)*40,Tr.w*u,th*u,1,0,tin*tdim);

  /* плита */
  const PA=L.plateA, PF=L.plateF, D=L.dip;
  const grow=cl((n-3)/3,0,1);
  let cx=PA.cx, cy=PA.cy, w=PA.w*(.82+.18*grow);
  const lift=eOut(sm(.7,.75,p)), dip=sm(.78,.82,p), rise=eOut(sm(.85,.89,p)), fin=eOut(sm(.88,.94,p));
  const above=D.cy-14;
  if(lift>0){ cx=lerp(cx,D.cx,lift); cy=lerp(cy,above,lift)-Math.sin(Math.PI*lift)*12; }
  if(dip>0){ cy=lerp(cy,D.cy,dip); }
  if(rise>0){ cy=lerp(cy,above,rise); }
  if(fin>0){ cx=lerp(cx,PF.cx,fin); cy=lerp(cy,PF.cy,fin); w=lerp(w,PF.w,fin); }
  const sX=w/PF.w, scaleY=sX*lerp(1/PF.k,1,fin);
  E.plate.style.transform='translate3d('+(px(cx)-plateBaseW/2).toFixed(1)+'px,'+(py(cy)-plateBaseH/2).toFixed(1)+'px,0) scale('+sX.toFixed(4)+','+scaleY.toFixed(4)+')';
  const pop=morph; E.plate.style.opacity=pop; E.plate.style.visibility=pop?'':'hidden';
  E.plate.style.zIndex=fin>.3?'6':'';
  const heat=1-sm(.8,.86,p);
  E.hot.style.opacity=heat.toFixed(3);
  E.code.style.opacity=sm(.92,.95,p).toFixed(3);

  /* окно кода при ковке */
  placeTL(E.codebox,L.code.x,L.code.y,sm(.47,.5,p)*(1-sm(.71,.74,p)),0);
  const want=p<.47?0:n;
  if(want!==shownLines){
    shownLines=want;
    $('cbLines').querySelectorAll('.ln').forEach((el,i)=>el.classList.toggle('on',i<want));
    $('cbCount').textContent=want+'/'+NL;
  }

  /* финал */
  const fo=sm(.93,.96,p);
  E.final.style.transform='translate3d('+(px(L.final.x)-E.final.offsetWidth/2).toFixed(1)+'px,'+py(L.final.y).toFixed(1)+'px,0)';
  E.final.style.opacity=fo.toFixed(3); E.final.style.visibility=fo<=0?'hidden':'';
  E.final.classList.toggle('live',fo>.6);

  /* удар: искры, вспышка, тряска (только вперёд) */
  if(!force){
    for(let k=0;k<NS;k++){ const h=hitAt(k); if(prevP<h&&p>=h)strike(k); }
    if(prevP<.8&&p>=.8)steamBurst(cx,D.cy-6);
  }
  prevP=p;

  /* шкала сцен */
  const sc=p<.1?0:p<.45?1:p<.72?2:3;
  if(sc!==scene){ scene=sc; railMark(); }
}
function strike(k){
  const W=L.work, x=k<3?W.cx:L.plateA.cx, y=(k<3?W.cy-L.work.w*AR.ingot*.35:L.plateA.cy-L.plateA.w*AR.plate*.5);
  if(!RM){ shake=.22; }
  E.flash.style.left=px(x)+'px'; E.flash.style.top=py(y)+'px';
  E.flash.animate?E.flash.animate([{opacity:.9},{opacity:0}],{duration:RM?200:380,easing:'ease-out'}):0;
  if(fxOn)sparks(px(x),py(y),k);
  wake();
}

/* ---------- частицы ---------- */
const fx=$('fx'), fctx=FX?fx.getContext('2d'):null;
const fxOn=!!fctx;
let dpr=1, parts=[];
const PS=AU.particleScale||.7;
function fxResize(){
  if(!fxOn)return;
  dpr=Math.min(window.devicePixelRatio||1,AU.dprCap||1.5,TIER>=3?2:1);
  fx.width=Math.round(SW*dpr); fx.height=Math.round(SH*dpr);
}
function sprite(r,g,b){
  const c=document.createElement('canvas'); c.width=c.height=64; const x=c.getContext('2d');
  const gr=x.createRadialGradient(32,32,0,32,32,32); gr.addColorStop(0,'rgba('+r+','+g+','+b+',1)'); gr.addColorStop(.4,'rgba('+r+','+g+','+b+',.45)'); gr.addColorStop(1,'rgba('+r+','+g+','+b+',0)');
  x.fillStyle=gr; x.fillRect(0,0,64,64); return c;
}
const SPR=fxOn?{y:sprite(255,226,140),o:sprite(255,140,40),r:sprite(200,50,10),s:sprite(220,226,232)}:null;
function sparks(x,y,k){
  const n=Math.round((24+k*4)*PS*1.4);
  for(let i=0;i<n;i++){
    const a=-Math.PI/2+(Math.random()-.5)*2.6, v=u*(18+Math.random()*42);
    parts.push({t:'k',x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v-u*6,l:0,ttl:.35+Math.random()*.55});
  }
}
function steamBurst(cxu,cyu){ if(!fxOn)return; for(let i=0;i<Math.round(30*PS);i++)steam(cxu,cyu,1.4); }
function steam(cxu,cyu,boost){
  const sp=(L.plateA.w*.5);
  parts.push({t:'s',x:px(cxu+(Math.random()-.5)*sp*1.4),y:py(cyu+Math.random()*2),vx:(Math.random()-.5)*u*3,vy:-u*(4+Math.random()*6)*(boost||1),l:0,ttl:1.4+Math.random()*1.2,r:u*(1.2+Math.random()*1.5)});
}
function ember(){
  const F=L.furnace, fh=F.w*AR.furnace;
  parts.push({t:'e',x:px(F.x+F.w*(.3+Math.random()*.4)),y:py(F.y+fh*.35),vx:u*(2+Math.random()*4),vy:-u*(3+Math.random()*5),l:0,ttl:2.5+Math.random()*2,ph:Math.random()*6});
}
function stepFx(dt){
  if(!fxOn)return;
  /* пар, пока горячая плита в воде */
  const p=pD, inW=sm(.8,.82,p)*(1-sm(.85,.87,p)), heat=1-sm(.8,.86,p);
  if(inW*heat>.02){ const rate=40*PS*inW*heat; let k=rate*dt; while(k>0){ if(Math.random()<k)steam(L.dip.cx,L.dip.cy-6); k-=1; } }
  if(TIER>=3&&pD<.9&&Math.random()<dt*3*fireLevel)ember();
  const g=u*90;
  fctx.setTransform(dpr,0,0,dpr,0,0); fctx.clearRect(0,0,SW,SH);
  const keep=[];
  for(const q of parts){
    q.l+=dt/q.ttl; if(q.l>=1)continue;
    if(q.t==='k'){ q.vy+=g*dt; q.x+=q.vx*dt; q.y+=q.vy*dt; }
    else if(q.t==='s'){ q.vx*=.98; q.vy*=.985; q.x+=q.vx*dt; q.y+=q.vy*dt; q.r+=u*2.6*dt; }
    else { q.ph+=dt*2; q.x+=(q.vx+Math.sin(q.ph)*u*2)*dt; q.y+=q.vy*dt; }
    keep.push(q);
  }
  parts=keep;
  fctx.globalCompositeOperation='source-over';
  const sFade=1-sm(.87,.91,pD);
  for(const q of parts)if(q.t==='s'){ fctx.globalAlpha=.32*(1-q.l)*Math.min(1,q.l*6)*sFade; const r=q.r; fctx.drawImage(SPR.s,q.x-r,q.y-r,r*2,r*2); }
  fctx.globalCompositeOperation='lighter';
  fctx.lineCap='round';
  for(const q of parts){
    if(q.t==='k'){
      fctx.globalAlpha=1-q.l; fctx.strokeStyle=q.l<.4?'#fff1c4':'#ffb347'; fctx.lineWidth=Math.max(1,u*.22);
      fctx.beginPath(); fctx.moveTo(q.x,q.y); fctx.lineTo(q.x-q.vx*.025,q.y-q.vy*.025); fctx.stroke();
    } else if(q.t==='e'){
      fctx.globalAlpha=(1-q.l)*.8; const r=u*.5; fctx.drawImage(SPR.o,q.x-r,q.y-r,r*2,r*2);
    }
  }
  fctx.globalAlpha=1;
}

/* ---------- огонь в горне ---------- */
const fire=$('fire'), fireOn=fxOn;
const xc=fireOn?fire.getContext('2d'):null;
let fw=0, fh2=0, fparts=[], fdpr=1;
function fireResize(){
  if(!fireOn)return;
  const r=fire.parentNode; fdpr=TIER>=3?Math.min(1.5,window.devicePixelRatio||1):.75;
  fw=r.clientWidth; fh2=r.clientHeight; fire.width=Math.max(2,Math.round(fw*fdpr)); fire.height=Math.max(2,Math.round(fh2*fdpr));
}
function stepFire(dt,now){
  if(!fireOn||!fw)return;
  const f=fireLevel, rate=(TIER>=3?120:70)*f;
  let k=rate*dt; while(k>0){ if(Math.random()<k)fparts.push({x:fw*(.16+Math.random()*.68),y:fh2*.98,vx:(Math.random()-.5)*fw*.06,vy:-fh2*(.45+Math.random()*.55),l:0,ttl:.55+Math.random()*.55,r:fw*(.06+Math.random()*.07)}); k-=1; }
  const c=xc; c.setTransform(fdpr,0,0,fdpr,0,0); c.clearRect(0,0,fw,fh2);
  c.save(); c.beginPath(); c.moveTo(0,fh2); c.lineTo(0,fh2*.5); c.ellipse(fw/2,fh2*.5,fw/2,fh2*.5,0,Math.PI,0); c.lineTo(fw,fh2); c.closePath(); c.clip();
  const fl=.85+.15*Math.sin(now*.011)+.08*Math.sin(now*.031);
  const gr=c.createRadialGradient(fw/2,fh2,0,fw/2,fh2,fw*.6);
  gr.addColorStop(0,'rgba(255,170,60,'+(.75*f*fl).toFixed(3)+')'); gr.addColorStop(.5,'rgba(200,60,10,'+(.35*f).toFixed(3)+')'); gr.addColorStop(1,'rgba(60,10,0,0)');
  c.fillStyle=gr; c.fillRect(0,0,fw,fh2);
  c.globalCompositeOperation='lighter';
  const keep=[];
  for(const q of fparts){
    q.l+=dt/q.ttl; if(q.l>=1)continue;
    q.x+=q.vx*dt; q.y+=q.vy*dt; q.vx+=(fw/2-q.x)*dt*.8;
    const r=q.r*(1-q.l*.65), sp=q.l<.3?SPR.y:q.l<.65?SPR.o:SPR.r;
    c.globalAlpha=Math.min(1,(1-q.l)*1.6)*.55*f; c.drawImage(sp,q.x-r,q.y-r,r*2,r*2);
    keep.push(q);
  }
  fparts=keep; c.restore(); c.globalAlpha=1;
  E.glow.style.opacity=(f*fl*.95).toFixed(3);
}

/* ---------- цикл ---------- */
let running=false, last=0, visible=true, lastF=0;
const CAP=Math.max(14,AU.capMs||16);
function wake(){ if(!running){ running=true; last=performance.now(); requestAnimationFrame(loop); } }
function loop(now){
  if(document.hidden){ running=false; return; }
  if(now-lastF<CAP-2){ requestAnimationFrame(loop); return; }
  const dt=Math.min(.05,(now-last)/1000); last=now; lastF=now;
  const d=pT-pD;
  pD=RM?pT:(Math.abs(d)<.00015?pT:pD+d*(1-Math.exp(-dt*9)));
  if(shake>0){ shake=Math.max(0,shake-dt); const a=shake/.22*u*.5; world.style.transform='translate3d('+((Math.random()-.5)*a).toFixed(1)+'px,'+((Math.random()-.5)*a).toFixed(1)+'px,0)'; if(!shake)world.style.transform=''; }
  render(false);
  if(visible){ stepFire(dt,now); stepFx(dt); }
  const busy=pD!==pT||shake>0||((fireOn||fxOn)&&visible)||parts.length;
  if(busy)requestAnimationFrame(loop); else running=false;
}
addEventListener('scroll',()=>{ readScroll(); wake(); },{passive:true});
addEventListener('resize',()=>{ layout(); readScroll(); wake(); });
document.addEventListener('visibilitychange',()=>{ if(!document.hidden)wake(); });
if('IntersectionObserver' in window)new IntersectionObserver(es=>{ visible=es[0].isIntersecting; if(visible)wake(); }).observe(stage);
if(!fireOn)E.glow.style.opacity=TIER<2?'.5':'.7';

/* ---------- шкала сцен справа и в меню ---------- */
const SCENES=[{k:'s0',n:'00',p:0},{k:'s1t',n:'01',p:.4},{k:'s2t',n:'02',p:.5},{k:'s3t',n:'03',p:.985}];
const rail=$('rail');
SCENES.forEach((s,i)=>{ const b=document.createElement('button'); b.type='button'; b.innerHTML='<i></i>'; b.addEventListener('click',()=>jump(s.p)); rail.appendChild(b); });
function railMark(){
  rail.querySelectorAll('button').forEach((b,i)=>b.classList.toggle('on',i===scene));
  $('drScenes').querySelectorAll('.scn').forEach((b,i)=>b.classList.toggle('cur',i===scene));
}

/* ---------- меню ---------- */
const drawer=$('drawer'), menuBtn=$('menuBtn');
let menuPushed=false;
function buildMenu(){
  const list=$('drList'); list.innerHTML='';
  LANGS.forEach((l,i)=>{
    const el=document.createElement(l.on?'a':'div');
    el.className='mi '+(l.on?'on ':'soon ')+(l.mode==='run'?'run':'gen');
    if(l.on)el.href=l.href; else el.setAttribute('aria-disabled','true');
    el.style.transitionDelay=(.04+i*.035).toFixed(3)+'s';
    el.innerHTML='<span class="g"></span><span class="nm"><span></span><small></small></span><span class="ds"></span>';
    el.querySelector('.g').textContent=l.glyph;
    el.querySelector('.nm span').textContent=l.name;
    el.querySelector('.nm small').textContent=l.on?(l.mode==='run'?T('run'):T('gen')):T('soon');
    el.querySelector('.ds').textContent=desc(l);
    list.appendChild(el);
  });
  const sc=$('drScenes'); sc.innerHTML='';
  SCENES.forEach((s,i)=>{
    const b=document.createElement('button'); b.type='button'; b.className='scn';
    b.style.transitionDelay=(.08+(LANGS.length+i)*.035).toFixed(3)+'s';
    b.innerHTML='<span class="n">'+s.n+'</span><span></span>'; b.lastChild.textContent=T(s.k);
    b.addEventListener('click',()=>{ closeMenu(); setTimeout(()=>jump(s.p),RM?0:200); });
    sc.appendChild(b);
  });
  const lg=$('langs'); lg.innerHTML='';
  CODES.forEach(c=>{ const b=document.createElement('button'); b.type='button'; b.textContent=c.toUpperCase(); b.classList.toggle('sel',c===lang()); b.addEventListener('click',()=>setLang(c)); lg.appendChild(b); });
  $('modcount').textContent=T('count',{n:LANGS.length,r:ready});
  railMark();
}
function openMenu(){
  if(document.body.classList.contains('menu'))return;
  document.body.classList.add('menu'); drawer.setAttribute('aria-hidden','false'); menuBtn.setAttribute('aria-expanded','true');
  try{ history.pushState({forgeMenu:1},''); menuPushed=true; }catch(e){ menuPushed=false; }
  setTimeout(()=>{ const f=drawer.querySelector('.mi.on')||$('drClose'); try{ f.focus({preventScroll:true}); }catch(e){} },RM?0:260);
  if(TR)TR.event('forge.menu');
}
function closeMenu(fromPop){
  if(!document.body.classList.contains('menu'))return;
  document.body.classList.remove('menu'); drawer.setAttribute('aria-hidden','true'); menuBtn.setAttribute('aria-expanded','false');
  if(menuPushed&&!fromPop){ menuPushed=false; try{ history.back(); }catch(e){} }
  menuPushed=false;
  try{ menuBtn.focus({preventScroll:true}); }catch(e){}
}
menuBtn.addEventListener('click',()=>document.body.classList.contains('menu')?closeMenu():openMenu());
$('drClose').addEventListener('click',()=>closeMenu());
$('veil').addEventListener('click',()=>closeMenu());
$('ctaAll').addEventListener('click',openMenu);
addEventListener('keydown',e=>{ if(e.key==='Escape')closeMenu(); });
addEventListener('popstate',()=>closeMenu(true));

/* назад */
function goBack(){
  if(PORTAL){ try{ parent.postMessage({aceon:'close'},location.origin); return; }catch(e){} }
  location.href='../';
}
$('back').addEventListener('click',goBack); $('drBack').addEventListener('click',goBack);
$('toTop').addEventListener('click',()=>jump(0));

/* кнопка-превью в финале: нажал, полетели искры */
$('pv').addEventListener('click',e=>{
  if(!fxOn)return; const r=e.currentTarget.getBoundingClientRect(), s=stage.getBoundingClientRect();
  const q=parts.length; sparks(r.left-s.left+r.width/2,r.top-s.top,1); for(let i=q;i<parts.length;i++){ parts[i].vx*=.6; parts[i].vy*=.6; } wake();
});

/* ---------- тексты ---------- */
function texts(){
  document.documentElement.lang=lang();
  $('back').textContent=T('back'); $('drBack').textContent=T('back');
  menuBtn.querySelector('.lbl').textContent=T('menu'); menuBtn.setAttribute('aria-label',T('menu'));
  $('drTitle').textContent=T('menu'); $('drMods').textContent=T('menu'); $('drPage').textContent=T('onPage');
  $('drClose').setAttribute('aria-label',T('close')); $('drClose').title=T('close');
  $('subName').textContent=T('sub'); $('subTail').textContent=T('subTail'); $('tagline').textContent=T('tagline');
  $('hintT').textContent=T('scroll');
  ['s1t','s1d','s2t','s2d','s3t','s3d'].forEach(k=>$(k).textContent=T(k));
  $('pv').textContent=T('btn'); $('ctaStart').textContent=T('start')+' >'; $('ctaStart').href=FIRST.href||'#'; $('ctaAll').textContent=T('all');
  $('foot').textContent=T('foot'); $('toTop').textContent=T('top')+' ^';
  rail.querySelectorAll('button').forEach((b,i)=>{ b.title=T(SCENES[i].k); b.setAttribute('aria-label',T(SCENES[i].k)); });
  ingots.forEach(g=>{ g.el.querySelector('.stt').textContent=g.l.on?(g.l.mode==='run'?T('run'):T('gen')):T('soon'); g.el.title=g.l.name+' · '+desc(g.l); });
  buildCode(); buildMenu(); typeEyebrow();
  if(SW)render(true);
}

/* строка в шапке печатается */
let typeT=null;
function typeEyebrow(){
  const eb=$('eyebrow'), line=T('eyebrow'); clearTimeout(typeT);
  const html=s=>esc(s).replace('A.C.EON','<span class="cur">A.C.EON</span>')+'<span class="blink">_</span>';
  if(RM||TIER<2){ eb.innerHTML=html(line); return; }
  let i=0; (function step(){ eb.innerHTML=html(line.slice(0,i)); if(i++<line.length)typeT=setTimeout(step,22); })();
}

/* ---------- старт ---------- */
texts();
layout(); readScroll(); pD=pT; prevP=pT; render(true); wake();
/* картинки догрузились: пересчитать размеры (высоты зависят от ширины) */
addEventListener('load',()=>{ fireResize(); render(true); });
})();
