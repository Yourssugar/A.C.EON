/* A.C.EON · ОФИС ИИ: симулятор жизни агентов.
   Сцена рисуется Canvas 2D в родном размере 368x208 и растягивается целым числом без сглаживания.
   Фон img/office.png собран из CC0 набора Pixel Office (2dPig), роботы рисуются здесь же по шаблонам.
   Статусы настоящие: config.json агента -> api_url -> /api/state {busy}. Поведение игровое.
   Флаги в адресе: ?status=free,busy,off (по порядку агентов), ?demo (статусы меняются сами), ?night=1, ?night=0 */
(function(){
'use strict';

const W=368, H=208;
const QS=new URLSearchParams(location.search);
const TR=window.Trace||null;
const AU=window.AceonUniverse||{capMs:15};
const isCoarse=matchMedia('(pointer:coarse)').matches||navigator.maxTouchPoints>0;
const reduceMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;

let PORTAL=false;
try{ PORTAL=(window.self!==window.top); }catch(e){ PORTAL=true; }
if(PORTAL){ try{ parent.postMessage({aceon:'ready'},location.origin); }catch(e){} }

/* вход только через ядро, как и раньше */
let access=false;
try{ access=!!sessionStorage.getItem('aceon_access'); }catch(e){ access=true; }
if(!access&&!QS.has('demo')&&!QS.has('status')){
  if(PORTAL){ try{ parent.postMessage({aceon:'close'},location.origin); }catch(e){} }
  else location.href='../';
  return;
}

/* ---------- язык ---------- */
const LANGS=['en','ru','de','fr','es','it','pl'];
const LANG_NAMES={en:'English',ru:'Русский',de:'Deutsch',fr:'Français',es:'Español',it:'Italiano',pl:'Polski'};
const OL=window.OFFICE_LANG||{en:{}};
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
  const d=OL[lang()]||OL.en;
  let s=d[k]!==undefined?d[k]:(OL.en[k]!==undefined?OL.en[k]:k);
  if(typeof s==='string'&&v)s=s.replace(/\{(\w+)\}/g,(m,n)=>v[n]!==undefined?v[n]:m);
  return s;
}
function L(o){ if(o==null)return ''; if(typeof o==='string')return o; return o[lang()]||o.en||o.ru||''; }
function pick(a){ return a[Math.random()*a.length|0]; }
function sayPool(k,v){ let a=T(k); if(!Array.isArray(a))a=[a]; let s=pick(a); if(v)s=s.replace(/\{(\w+)\}/g,(m,n)=>v[n]!==undefined?v[n]:m); return s; }
function setLang(c){
  if(LANGS.indexOf(c)<0||c===lang())return;
  if(hasI18n)I18n.set(c);
  else{ fbLang=c; const o=readSite(); o.lang=c; if(o.music===undefined)o.music=.6; if(o.sfx===undefined)o.sfx=.8; writeSite(o); }
  document.documentElement.lang=c;
  if(TR)TR.event('lang.change');
  applyTexts();
}
document.documentElement.lang=lang();

/* ---------- раскладка офиса (координаты в пикселях фона) ---------- */
const TY=80, BY=196;                 // верхний и нижний коридоры (линия ног)
const VX=[15,125,235,349];           // вертикальные проходы между блоками
const BLOCKS=[[30,92,0],[140,92,1],[250,92,0],[30,122,1],[140,122,0],[250,122,1],[30,152,0]];
const SEATS=[];
BLOCKS.forEach((b,bi)=>{
  const [x,y,m]=b, col=Math.round((x-30)/110);
  SEATS.push({x:x+(m?18:12), y:y+28, face:'right', lane:col});
  SEATS.push({x:x+(m?67:61), y:y+28, face:'left',  lane:col+1});
});
function seatTarget(i){ const s=SEATS[i]; return {x:s.x,y:s.y,c:'V'+s.lane,cx:VX[s.lane],cy:s.y,face:s.face,sit:true,key:'seat'+i}; }
function topT(x,y,face,key){ return {x,y,c:'T',cx:x,cy:TY,face,key}; }
function botT(x,y,face,key,sit){ return {x,y,c:'B',cx:x,cy:BY,face,key,sit:!!sit}; }
const POI={
  coffee:  topT(49,76,'up','coffee'),
  vending: topT(13,77,'up','vending'),
  cooler:  topT(31,77,'up','cooler'),
  fridge:  topT(355,76,'up','fridge'),
  win0:    topT(46,73,'up','win0'),
  win1:    topT(125,73,'up','win1'),
  win2:    topT(245,73,'up','win2'),
  plant:   topT(98,74,'up','plant'),
  door:    topT(183,72,'up','door'),
  board:   topT(276,74,'up','board'),
  term:    botT(299,183,'up','term'),
  cooler2: botT(244,182,'up','cooler2')
};
const SOFA={
  sofa1:[botT(173,171,'down','s1a',true),botT(189,171,'down','s1b',true)],
  sofa2:[botT(211,171,'down','s2a',true),botT(227,171,'down','s2b',true)],
  sofa3:[topT(306,68,'down','s3a'),topT(321,68,'down','s3b')]
};
SOFA.sofa3.forEach(t=>t.sit=true);
const CLOCK={x:174,y:26};
const GLOW_RECTS=[[1,37,25,34],[343,41,25,30]];   // автомат и холодильник светятся ночью
const TERM_RECT=[284,148,30,32];

/* граф коридоров: перекрёстки + точки старта и цели */
function corridorOf(p){ return p.c; }
function routeCorr(a,b){
  const nodes=[];
  VX.forEach((x,i)=>{ nodes.push({x,y:TY,cs:['V'+i,'T']}); nodes.push({x,y:BY,cs:['V'+i,'B']}); });
  const A={x:a.x,y:a.y,cs:[a.c]}, B={x:b.x,y:b.y,cs:[b.c]};
  nodes.push(A,B);
  const n=nodes.length, adj=nodes.map(()=>[]);
  const corrs=['T','B','V0','V1','V2','V3'];
  corrs.forEach(c=>{
    const on=[];
    nodes.forEach((p,i)=>{ if(p.cs.indexOf(c)>=0)on.push(i); });
    const horiz=(c==='T'||c==='B');
    on.sort((i,j)=>horiz?nodes[i].x-nodes[j].x:nodes[i].y-nodes[j].y);
    for(let k=1;k<on.length;k++){
      const i=on[k-1], j=on[k], d=Math.abs(nodes[i].x-nodes[j].x)+Math.abs(nodes[i].y-nodes[j].y);
      adj[i].push([j,d]); adj[j].push([i,d]);
    }
  });
  const dist=new Array(n).fill(1e9), prev=new Array(n).fill(-1), done=new Array(n).fill(false);
  const s=n-2, t=n-1; dist[s]=0;
  for(;;){
    let u=-1;
    for(let i=0;i<n;i++) if(!done[i]&&(u<0||dist[i]<dist[u])) u=i;
    if(u<0||dist[u]>=1e9||u===t)break;
    done[u]=true;
    adj[u].forEach(([v,d])=>{ if(dist[u]+d<dist[v]){ dist[v]=dist[u]+d; prev[v]=u; } });
  }
  const path=[]; let u=t;
  while(u>=0&&u!==s){ path.unshift({x:nodes[u].x,y:nodes[u].y}); u=prev[u]; }
  return path;
}

/* ---------- пиксельные роботы ---------- */
const HEAD=["....OOOOOOOO....","..OOHHHHHHHHOO..",".OHHBBBBBBBBHHO.",".OBOOOOOOOOOOBO.","AOBOSSSSSSSSOBOA","AOBOSSSSSSSSOBOA","AOBOSSSSSSSSOBOA","AOBOSSSSSSSSOBOA",".OBOSSSSSSSSOBO.",".OBOOOOOOOOOOBO.",".ODBBBBBBBBBBDO.","..OOOOOOOOOOOO.."];
const HEAD_BACK=["....OOOOOOOO....","..OOHHHHHHHHOO..",".OHHBBBBBBBBHHO.",".OBBBBBBBBBBBBO.","AOBBDDDDDDDDBBOA","AOBBBBBBBBBBBBOA","AOBBDDDDDDDDBBOA","AOBBBBBBBBBBBBOA",".OBBDDDDDDDDBBO.",".OBBBBBBBBBBBBO.",".ODBBBBBBBBBBDO.","..OOOOOOOOOOOO.."];
const BODY=["....OOOOOOOO....","...OBBBBBBBBO...","...OBBBAABBBO...","...OBBBAABBBO...","...ODBBBBBBDO...","....ODDDDDDO...."];
const ARM=[".OO","OBO","OBO","OAO",".O."];
const LEGS=[
  ["....ODO..ODO....","....OBO..OBO....","...OOBO..OBOO...","...OBBO..OBBO...","...OOOO..OOOO..."],
  ["....ODO..ODO....","....OBO..OBO....","...OOBO..OBOO...","...OBBO..OOOO...","...OOOO........."],
  ["....ODO..ODO....","....OBO..OBO....","...OOBO..OBOO...","...OOOO..OBBO...",".........OOOO..."]
];
const LEGS_SIT=["...OBBOOOOBBO...","...OOOO..OOOO..."];
const FACES={
  idle: ["........",".ee..ee.",".ee..ee.","..m..m..","...mm..."],
  happy:[".e....e.","e.e..e.e","........","..m..m..","...mm..."],
  work: ["........","ee....ee","........","........",".m.m.m.."],
  busy: ["e......e",".ee..ee.",".ee..ee.","........","..mmmm.."],
  sad:  ["........",".ee..ee.","e......e","...mm...","..m..m.."],
  wow:  ["ee....ee","ew....ew","ee....ee","...mm...","...mm..."],
  blink:["........","........","ee....ee","........","..mmmm.."],
  sleep:["........","........","ee....ee","........","...mm..."],
  off:  ["........","........","........","........","........"],
  q:    ["..mmmm..",".m....m.","....mm..","........","....m..."]
};
const SLOT_PAL={O:'1a1c2c',H:'2a3150',B:'222842',D:'1a1c2c',S:'0d0e17',A:'333c57',e:'566c86',m:'566c86',w:'566c86'};
function rgb(h){ return [parseInt(h.slice(0,2),16),parseInt(h.slice(2,4),16),parseInt(h.slice(4,6),16)]; }
const spriteCache=new Map();
/* glow=true: только светящиеся пиксели лица (для ночи) */
function sprite(pal,face,dir,frame,sit,typing,glow){
  const key=[pal.__id||(pal.__id=Math.random().toString(36).slice(2)),face,dir,frame,sit?1:0,typing?1:0,glow?1:0].join('|');
  let c=spriteCache.get(key); if(c)return c;
  c=document.createElement('canvas'); c.width=16; c.height=24;
  const x=c.getContext('2d'), img=x.createImageData(16,24), D=img.data;
  const col={}; for(const k in pal) if(k.length===1) col[k]=rgb(pal[k]);
  function put(px,py,ch){
    if(px<0||py<0||px>15||py>23)return;
    if(glow&&'emw'.indexOf(ch)<0)return;
    const v=col[ch]; if(!v)return; const i=(py*16+px)*4; D[i]=v[0];D[i+1]=v[1];D[i+2]=v[2];D[i+3]=255;
  }
  function blit(rows,x0,y0,flip){
    for(let yy=0;yy<rows.length;yy++){ let r=rows[yy]; if(flip)r=r.split('').reverse().join('');
      for(let xx=0;xx<r.length;xx++){ const ch=r[xx]; if(ch!=='.')put(x0+xx,y0+yy,ch); } }
  }
  const bob=(!sit&&(frame===1||frame===3))?1:0, y0=bob+(sit?2:0);
  let swL=0, swR=0;
  if(!sit){ const sw=[0,-1,0,1][frame]; swL=sw; swR=-sw; }
  else if(typing){ swL=frame%2?-1:0; swR=frame%2?0:-1; }
  blit(ARM,0,12+y0+swL); blit(ARM,13,12+y0+swR,true);
  blit(BODY,0,12+y0);
  blit(dir==='up'?HEAD_BACK:HEAD,0,y0);
  if(dir!=='up'){
    const f=FACES[face]||FACES.idle, dx=dir==='left'?-1:dir==='right'?1:0;
    for(let yy=0;yy<f.length;yy++) for(let xx=0;xx<8;xx++){ const ch=f[yy][xx]; if(ch!=='.'&&xx+dx>=0&&xx+dx<8)put(4+xx+dx,4+yy+y0,ch); }
  }
  if(sit) blit(LEGS_SIT,0,18+y0); else blit(LEGS[[0,1,0,2][frame]],0,18+y0);
  x.putImageData(img,0,0);
  spriteCache.set(key,c); return c;
}

/* ---------- агенты ---------- */
const DEFS=window.OFFICE_AGENTS||[];
const REAL=DEFS.filter(d=>!d.slot);
/* все 13 ходят по офису; у слотов (стажёров) нет статуса и данных */
const agents=DEFS.map(d=>({
  def:d, id:d.id, extra:!!d.slot, pal:d.pal||SLOT_PAL, x:0, y:0, dir:'down', frame:0, ft:0, sit:false, typing:false,
  face:'idle', path:[], tgt:null, anc:null, act:null, actUntil:0, status:d.slot?'extra':'check', placed:true,
  spd:20+Math.random()*7, bub:null, clicks:[], blinkAt:performance.now()+2000+Math.random()*4000, onArrive:null, chain:0
}));
const realAgents=agents.filter(a=>!a.extra);
const byId={}; agents.forEach(a=>byId[a.id]=a);

function place(a,t){
  a.x=t.x; a.y=t.y; a.path=[]; a.tgt=t; a.anc={x:t.cx,y:t.cy,c:t.c};
  a.sit=!!t.sit; a.dir=t.face||'down'; a.frame=0;
}
function goTo(a,t,cb){
  if(a.tgt&&a.tgt.key===t.key&&!a.path.length&&Math.abs(a.x-t.x)<1&&Math.abs(a.y-t.y)<1){ a.sit=!!t.sit; a.dir=t.face||a.dir; if(cb)cb(); return; }
  const from=a.anc||{x:a.x,y:a.y,c:'T'};
  const pts=[];
  if(Math.abs(a.x-from.x)>0.5||Math.abs(a.y-from.y)>0.5)pts.push({x:from.x,y:from.y});
  routeCorr(from,{x:t.cx,y:t.cy,c:t.c}).forEach(p=>pts.push(p));
  pts.push({x:t.x,y:t.y});
  a.path=pts; a.tgt=t; a.sit=false; a.typing=false; a.onArrive=cb||null;
  a.anc={x:t.cx,y:t.cy,c:t.c};
}
function taken(key,except){ return agents.some(o=>o!==except&&o.tgt&&o.tgt.key===key); }

/* режим: свободен или занят (busy и offline для посетителя одно и то же: ЗАНЯТ, но никто не спит) */
function busyMode(a){ return !a.extra&&(a.status==='busy'||a.status==='off'); }
function setStatus(a,st){
  const prev=a.status;
  if(prev===st)return;
  a.status=st;
  const wasBusy=(prev==='busy'||prev==='off'), nowBusy=busyMode(a);
  if(prev!=='check'){
    if(wasBusy&&!nowBusy) sayChain(a,sayPool(prev==='busy'?'say.done':'say.ask'),true);
    else if(!wasBusy&&nowBusy&&st==='busy'&&Math.random()<.6) sayChain(a,sayPool('say.newtask'),true);
  }
  // сменить занятие поскорее, если стоит на месте
  if(wasBusy!==nowBusy&&!a.path.length)a.actUntil=Math.min(a.actUntil,performance.now()+1200+Math.random()*2000);
  renderDrawer(); updateCount(); refreshCard();
}

/* занятия */
const ACTS_FREE=[['desk',3],['coffee',2],['window',2],['vending',.8],['fridge',.8],['cooler',.8],['sofa',1.2],['watch',1.2],['visit',1.4],['plant',.6],['board',.7],['term',.6],['cooler2',.6],['door',.5],['wander',.8]];
const ACTS_BUSY=[['desk',4.5],['term',1.2],['board',1.2],['visit',1],['coffee',1],['door',.7],['cooler',.5],['cooler2',.5],['window',.5],['wander',1.2],['watch',.3]];
function chooseAct(a){
  const ACTS=busyMode(a)?ACTS_BUSY:ACTS_FREE;
  let sum=0; ACTS.forEach(x=>sum+=x[1]);
  for(let tries=0;tries<10;tries++){
    let r=Math.random()*sum, k='desk';
    for(const x of ACTS){ r-=x[1]; if(r<=0){ k=x[0]; break; } }
    if(k===a.act&&Math.random()<.7)continue;
    const t=actTarget(a,k); if(!t)continue;
    if(t.key&&taken(t.key,a))continue;
    return [k,t];
  }
  return ['desk',seatTarget(a.def.seat)];
}
function actTarget(a,k){
  switch(k){
    case 'desk': return seatTarget(a.def.seat);
    case 'window': return POI[pick(['win0','win1','win2'])];
    case 'sofa': { const s=pick(['sofa1','sofa2','sofa3']); return SOFA[s].find(t=>!taken(t.key,a))||null; }
    case 'watch': { const x=60+Math.round(Math.random()*240); return botT(x,200,'down','watch'+(x>>4)); }
    case 'wander': {
      if(Math.random()<.5){ const x=10+Math.round(Math.random()*348); return topT(x,TY,pick(['down','left','right']),'w'+(x>>3)); }
      const i=Math.random()*4|0, y=88+Math.round(Math.random()*104);
      return {x:VX[i],y,c:'V'+i,cx:VX[i],cy:y,face:pick(['down','left','right']),key:'w'+i+'-'+(y>>3)};
    }
    case 'visit': {
      const others=agents.filter(o=>o!==a&&!o.path.length&&o.anc);
      if(!others.length)return null;
      const o=pick(others), an=o.anc;
      const horiz=(an.c==='T'||an.c==='B');
      let x=an.x, y=an.y;
      if(horiz) x+= (an.x>W/2?-14:14); else y+= (an.y>150?-14:14);
      return {x,y,c:an.c,cx:x,cy:y,face:'down',key:'visit-'+o.id,buddy:o};
    }
    default: return POI[k]||null;
  }
}
function startAct(a){
  const [k,t]=chooseAct(a);
  a.act=k;
  goTo(a,t,()=>{
    const busy=busyMode(a);
    const dur={desk:busy?14000:9000,coffee:6000,window:7000,sofa:9000,watch:5000,visit:6000,wander:2500,term:busy?8000:5000,board:busy?7000:5000}[k]||5000;
    a.actUntil=performance.now()+dur*(.7+Math.random()*.7);
    a.face=busy?pick(['work','busy','idle']):pick(['idle','idle','happy']);
    if(k==='watch'){ a.face='wow'; if(Math.random()<.75)sayChain(a,sayPool('say.watch')); }
    else if(k==='coffee'&&Math.random()<.4) sayChain(a,sayPool('say.coffee'));
    else if(k==='visit'&&t.buddy){
      const o=t.buddy;
      a.dir=o.x<a.x-2?'left':o.x>a.x+2?'right':'down';
      sayChain(a,idleLine(a));
      setTimeout(()=>{ if(!o.path.length&&!o.bub)sayChain(o,replyLine(o)); },1900);
    }
    else if(k==='desk'){ a.typing=busy||Math.random()<.4; if(a.typing)a.face='work'; }
    else if((k==='term'||k==='board')&&busy&&Math.random()<.5) sayChain(a,sayPool('say.duty'));
  });
  a.actUntil=Infinity;
}
function lines(a){ const l=a.def.lines||{}; return l[lang()]||l.en||null; }
/* что говорит сам по себе */
function idleLine(a){
  const L=lines(a), busy=busyMode(a), r=Math.random();
  if(a.extra) return r<.55?sayPool('say.think'):r<.8?sayPool('say.duty'):sayPool('say.extra');
  if(busy) return r<.45&&L?pick(L.work):r<.75?sayPool('say.duty'):sayPool('say.think');
  return r<.45&&L?pick(L.idle):r<.62?sayPool('say.ask'):sayPool('say.think');
}
function walkLine(a){ return (busyMode(a)?Math.random()<.6:Math.random()<.25)?sayPool('say.duty'):sayPool('say.think'); }
function replyLine(a){ const L=lines(a); if(a.extra)return sayPool('say.extra'); if(busyMode(a))return sayPool('say.later'); return L?pick(L.click):sayPool('say.ask'); }

/* ---------- кошка и пёс ---------- */
const imgs={};
function loadImg(k,src){ return new Promise(r=>{ const i=new Image(); i.onload=()=>{ imgs[k]=i; r(); }; i.onerror=()=>r(); i.src=src; }); }
const pets=[
  {kind:'cat', x:181, y:168, w:16, h:13, path:[], anc:{x:181,y:BY,c:'B'}, flip:false, next:performance.now()+15000, spd:16,
   spots:[botT(181,168,'down','c1'),botT(262,190,'down','c2'),topT(66,82,'down','c3'),topT(338,82,'down','c4'),botT(130,200,'down','c5')]},
  {kind:'dog', x:262, y:197, w:24, h:11, path:[], anc:{x:262,y:BY,c:'B'}, flip:false, next:performance.now()+40000, spd:11,
   spots:[botT(262,197,'down','d1'),botT(80,201,'down','d2'),botT(330,201,'down','d3'),topT(140,84,'down','d4')]}
];

/* ---------- реплики ---------- */
const ov=document.getElementById('ov');
const bubs=[];
/* реплика из нескольких частей через | : показываются по очереди */
function sayChain(a,text,force){
  if(!text)return;
  const parts=String(text).split('|');
  if(!force&&(bubs.length>=2||a.bub))return;
  const id=++a.chain;
  say(a,parts[0],true);
  let t=0;
  for(let i=1;i<parts.length;i++){
    t+=1500+parts[i-1].length*55;
    setTimeout(()=>{ if(a.chain===id)say(a,parts[i],true); },t);
  }
}
function say(a,text,force){
  if(!text)return;
  if(a.id==='node')text=text.toUpperCase();
  if(!force&&bubs.length>=2)return;
  if(a.bub)killBub(a.bub,true);
  const el=document.createElement('div');
  el.className='bub'+(a.id==='node'?' robo':'');
  el.textContent=text;
  ov.appendChild(el);
  const b={el,a,until:performance.now()+2200+text.length*55};
  a.bub=b; bubs.push(b); posBub(b);
}
function killBub(b,now){
  const i=bubs.indexOf(b); if(i>=0)bubs.splice(i,1);
  if(b.a&&b.a.bub===b)b.a.bub=null;
  if(now){ b.el.remove(); return; }
  b.el.classList.add('out'); setTimeout(()=>b.el.remove(),220);
}
function headY(a){ return a.y-(a.sit?22:25)-(a.h?a.h-24:0); }
function posBub(b){
  const a=b.a, s=cssScale;
  let x=a.x*s;
  const w=b.el.offsetWidth||120, vw=W*s;
  x=Math.max(w/2+2,Math.min(vw-w/2-2,x));
  b.el.style.left=x+'px';
  b.el.style.top=((a.kind?a.y-a.h-2:headY(a))*s)+'px';
}

/* ---------- отрисовка ---------- */
const cv=document.getElementById('cv'), ctx=cv.getContext('2d');
ctx.imageSmoothingEnabled=false;
let cssScale=3;
const DIG={0:["###","#.#","#.#","###"],1:["##.",".#.",".#.","###"],2:["##.","..#",".#.","###"],3:["###",".##","..#","###"],
  4:["#.#","#.#","###","..#"],5:["###","##.","..#","##."],6:["#..","###","#.#","###"],7:["###","..#",".#.",".#."],
  8:["###","###","#.#","###"],9:["###","#.#","###","..#"]};
function drawClock(d){
  ctx.fillStyle='#1a1c2c'; ctx.fillRect(CLOCK.x,CLOCK.y,17,4);
  ctx.fillStyle='#ef7d57';
  const s=String(d.getHours()).padStart(2,'0')+String(d.getMinutes()).padStart(2,'0');
  const xs=[0,4,10,14];
  for(let i=0;i<4;i++){ const g=DIG[s[i]]; for(let y=0;y<4;y++)for(let x=0;x<3;x++) if(g[y][x]==='#')ctx.fillRect(CLOCK.x+xs[i]+x,CLOCK.y+y,1,1); }
  if(d.getSeconds()%2===0){ ctx.fillRect(CLOCK.x+8,CLOCK.y+1,1,1); ctx.fillRect(CLOCK.x+8,CLOCK.y+3,1,1); }
}
function nightK(d){
  const f=QS.get('night'); if(f==='1')return 1; if(f==='0')return 0;
  const h=d.getHours()+d.getMinutes()/60;
  if(h>=22||h<5)return 1;
  if(h>=20)return (h-20)/2;
  if(h<7)return 1-(h-5)/2;
  return 0;
}
function faceNow(a){ return a.blink&&a.face!=='sleep'&&a.face!=='off'&&a.face!=='work'?'blink':a.face; }
const stars=[[40,37],[52,44],[117,38],[129,46],[238,36],[250,43],[316,39],[331,45],[44,47],[244,47]];
const zs=[];
function draw(now){
  const d=new Date();
  ctx.globalCompositeOperation='source-over'; ctx.globalAlpha=1;
  if(imgs.bg)ctx.drawImage(imgs.bg,0,0); else { ctx.fillStyle='#41a6f6'; ctx.fillRect(0,0,W,H); }
  const k=nightK(d);
  // объекты по глубине
  const list=[];
  agents.forEach(a=>list.push(a));
  pets.forEach(p=>list.push(p));
  list.sort((p,q)=>p.y-q.y);
  list.forEach(e=>{
    if(e.kind){ const im=imgs[e.kind]; if(!im)return;
      const fx=Math.round(e.x-e.w/2), fy=Math.round(e.y-e.h)+(e.path.length&&((now/180|0)%2)?-1:0);
      if(e.flip){ ctx.save(); ctx.translate(fx+e.w,fy); ctx.scale(-1,1); ctx.drawImage(im,0,0); ctx.restore(); }
      else ctx.drawImage(im,fx,fy);
      return; }
    const a=e, face=faceNow(a);
    const sp=sprite(a.pal,face,a.dir,a.frame,a.sit,a.typing,false);
    ctx.drawImage(sp,Math.round(a.x-8),Math.round(a.y-24));
  });
  // ночь
  if(k>0){
    ctx.globalCompositeOperation='multiply';
    ctx.fillStyle='rgba(60,70,140,'+(0.75*k).toFixed(3)+')';
    ctx.fillRect(0,0,W,H);
    ctx.globalCompositeOperation='source-over';
    if(imgs.bg){ ctx.globalAlpha=.55*k; GLOW_RECTS.forEach(r=>ctx.drawImage(imgs.bg,r[0],r[1],r[2],r[3],r[0],r[1],r[2],r[3])); ctx.globalAlpha=1; }
    ctx.fillStyle='rgba(244,244,244,'+(0.8*k).toFixed(2)+')';
    stars.forEach((s,i)=>{ if(((now/700|0)+i*3)%11!==0)ctx.fillRect(s[0],s[1],1,1); });
    list.forEach(e=>{ if(e.kind)return; const a=e, face=a.face;
      if(face==='off')return;
      const sp=sprite(a.pal,faceNow(a),a.dir,a.frame,a.sit,a.typing,true);
      ctx.drawImage(sp,Math.round(a.x-8),Math.round(a.y-24)); });
  }
  drawClock(d);
  // буквы z над спящими
  ctx.fillStyle='#f4f4f4';
  for(let i=zs.length-1;i>=0;i--){
    const z=zs[i], t=(now-z.t)/2200;
    if(t>=1){ zs.splice(i,1); continue; }
    ctx.globalAlpha=t<.2?t*5:1-(t-.2)/.8;
    const x=Math.round(z.x+t*6), y=Math.round(z.y-t*12);
    ctx.fillRect(x,y,3,1); ctx.fillRect(x+1,y+1,1,1); ctx.fillRect(x,y+2,3,1);
  }
  ctx.globalAlpha=1;
  // подсветка выбранного
  if(sel&&sel.placed){ ctx.fillStyle='#73eff7'; const x=Math.round(sel.x), y=Math.round(sel.y);
    if((now/300|0)%2){ ctx.fillRect(x-1,y-30,3,1); ctx.fillRect(x,y-29,1,1); } }
}

/* ---------- шаг симуляции ---------- */
let last=performance.now(), nextAmb=performance.now()+6000+Math.random()*5000, nextFrame=0;
function step(a,dt,now){
  // ходьба
  if(a.path.length){
    const p=a.path[0], dx=p.x-a.x, dy=p.y-a.y, dist=Math.hypot(dx,dy), spd=a.spd*dt;
    if(Math.abs(dx)>Math.abs(dy))a.dir=dx<0?'left':'right'; else a.dir=dy<0?'up':'down';
    if(dist<=spd){ a.x=p.x; a.y=p.y; a.path.shift(); }
    else { a.x+=dx/dist*spd; a.y+=dy/dist*spd; }
    a.ft+=dt; if(a.ft>.14){ a.ft=0; a.frame=(a.frame+1)%4; }
    if(!a.path.length){
      a.frame=0; const t=a.tgt; if(t){ a.sit=!!t.sit; a.dir=t.face||a.dir; }
      const cb=a.onArrive; a.onArrive=null; if(cb)cb();
    }
    return;
  }
  // на месте
  if(a.typing){ a.ft+=dt; if(a.ft>.22){ a.ft=0; a.frame=(a.frame+1)%2; } }
  else a.frame=0;
  if(now>a.blinkAt){ a.blink=true; if(now>a.blinkAt+130){ a.blink=false; a.blinkAt=now+2500+Math.random()*4500; } }
  if(now>a.actUntil){ a.typing=false; startAct(a); }
}
function stepPet(p,dt,now){
  if(p.path.length){
    const q=p.path[0], dx=q.x-p.x, dy=q.y-p.y, dist=Math.hypot(dx,dy), spd=p.spd*dt;
    if(Math.abs(dx)>.3)p.flip=dx>0;
    if(dist<=spd){ p.x=q.x; p.y=q.y; p.path.shift(); } else { p.x+=dx/dist*spd; p.y+=dy/dist*spd; }
    return;
  }
  // кошка уходит, если рядом сел робот
  const crowd=p.kind==='cat'&&agents.some(a=>a.sit&&!a.path.length&&Math.abs(a.x-p.x)<12&&Math.abs(a.y-p.y)<8);
  if(now>p.next||crowd){
    p.next=now+(p.kind==='cat'?25000:60000)*(.6+Math.random());
    const t=pick(p.spots.filter(s=>Math.abs(s.x-p.x)>4||Math.abs(s.y-p.y)>4));
    const pts=[];
    if(Math.abs(p.x-p.anc.x)>.5||Math.abs(p.y-p.anc.y)>.5)pts.push({x:p.anc.x,y:p.anc.y});
    routeCorr(p.anc,{x:t.cx,y:t.cy,c:t.c}).forEach(q=>pts.push(q));
    pts.push({x:t.x,y:t.y});
    p.path=pts; p.anc={x:t.cx,y:t.cy,c:t.c};
  }
}
function ambient(now){
  if(now<nextAmb)return;
  nextAmb=now+4500+Math.random()*7000;
  if(bubs.length>=2)return;
  const cand=agents.filter(a=>!a.bub);
  if(!cand.length)return;
  const a=pick(cand), h=new Date().getHours();
  if(a.path.length>1){ sayChain(a,walkLine(a)); return; }
  if(a.path.length)return;
  if(!busyMode(a)&&Math.random()<.1&&(h<5||h>=23)){ sayChain(a,sayPool('say.night')); return; }
  sayChain(a,idleLine(a));
}
function loop(now){
  requestAnimationFrame(loop);
  if(now<nextFrame)return;
  nextFrame=now+Math.max(14,(AU.capMs||15)-2);
  let dt=Math.min(.06,(now-last)/1000); last=now;
  if(reduceMotion)dt*=.8;
  agents.forEach(a=>step(a,dt,now));
  pets.forEach(p=>stepPet(p,dt,now));
  ambient(now);
  for(let i=bubs.length-1;i>=0;i--){ const b=bubs[i]; if(now>b.until)killBub(b); else posBub(b); }
  draw(now);
  if(tagA)posTag();
}

/* ---------- размер сцены ---------- */
const stage=document.getElementById('stage'), view=document.getElementById('view');
function fit(){
  const dpr=window.devicePixelRatio||1;
  const aw=stage.clientWidth, ah=stage.clientHeight;
  let k=Math.floor(Math.min(aw*dpr/W,ah*dpr/H));
  const tall=ah/aw>1.1;
  if(tall){ k=Math.max(k,Math.floor(ah*.66*dpr/H)); }
  k=Math.max(1,k);
  cssScale=k/dpr;
  view.style.width=(W*cssScale)+'px'; view.style.height=(H*cssScale)+'px';
  ov.style.setProperty('--bf',Math.max(11,Math.min(16,Math.round(cssScale*3.6)))+'px');
  if(tall)stage.scrollLeft=(view.offsetWidth-aw)/2;
  bubs.forEach(posBub);
}
addEventListener('resize',fit);

/* ---------- клики по сцене ---------- */
let sel=null, tagA=null, tagUntil=0;
const tag=document.getElementById('tag');
function toNative(e){ const r=cv.getBoundingClientRect(); return {x:(e.clientX-r.left)/r.width*W, y:(e.clientY-r.top)/r.height*H}; }
function hit(p){
  let best=null;
  agents.forEach(a=>{ if(!a.placed)return; const top=a.y-24; if(p.x>=a.x-8&&p.x<=a.x+8&&p.y>=top&&p.y<=a.y+1){ if(!best||a.y>best.y)best=a; } });
  if(best)return best;
  for(const q of pets){ if(p.x>=q.x-q.w/2&&p.x<=q.x+q.w/2&&p.y>=q.y-q.h&&p.y<=q.y+1)return q; }
  if(p.x>=TERM_RECT[0]&&p.x<=TERM_RECT[0]+TERM_RECT[2]&&p.y>=TERM_RECT[1]&&p.y<=TERM_RECT[1]+TERM_RECT[3])return 'term';
  return null;
}
cv.addEventListener('mousemove',e=>{ const h=hit(toNative(e)); cv.classList.toggle('hov',!!h); if(h&&h.def&&!isCoarse)showTag(h,1800); });
cv.addEventListener('click',e=>{
  const h=hit(toNative(e));
  if(!h){ sel=null; hideTag(); return; }
  if(h==='term'){ openTerm(); return; }
  if(h.kind){ say(h,sayPool(h.kind==='cat'?'say.cat':'say.dog'),true); return; }
  clickAgent(h);
});
function clickAgent(a){
  const now=performance.now();
  a.clicks=a.clicks.filter(t=>now-t<8000); a.clicks.push(now);
  sel=a; showTag(a,5000);
  const L=lines(a);
  let s;
  if(a.clicks.length>=5&&L){ s=pick(L.annoy); if(a.clicks.length===5&&TR)TR.event('office.annoy'); a.face='busy'; }
  else if(a.extra) s=a.clicks.length>=5?sayPool('say.extra'):(Math.random()<.7?sayPool('say.extra'):sayPool('say.think'));
  else if(busyMode(a)) s=(Math.random()<.65||!L)?sayPool('say.later'):pick(L.work);
  else s=pick(L.click);
  sayChain(a,s,true);
  if(!a.path.length&&!a.sit&&a.dir==='up')a.dir='down';
  if(TR)TR.event('office.click');
}
function stLabel(st){ return st==='free'?T('free'):st==='check'?T('check'):st==='extra'?T('slot.empty'):T('busy'); }
function nameOf(def){ return def.slot?(T('slot')+' '+String(def.n).padStart(2,'0')):L(def.name); }
function showTag(a,ms){
  if(tagA===a&&tag.classList.contains('on')&&tag.dataset.st===a.status+lang()){ tagUntil=Math.max(tagUntil,performance.now()+ms); return; }
  tagA=a; tagUntil=performance.now()+ms; tag.dataset.st=a.status+lang();
  tag.innerHTML='';
  const d=document.createElement('span'); d.className='dot '+a.status; tag.appendChild(d);
  const n=document.createElement('span'); n.textContent=nameOf(a.def); tag.appendChild(n);
  const i=document.createElement('i'); i.textContent='i'; i.title=stLabel(a.status);
  i.addEventListener('click',ev=>{ ev.stopPropagation(); openCard(a.def); }); tag.appendChild(i);
  tag.classList.add('on'); posTag();
}
function hideTag(){ tagA=null; tag.classList.remove('on'); }
function posTag(){
  if(performance.now()>tagUntil){ hideTag(); return; }
  tag.style.left=(tagA.x*cssScale)+'px'; tag.style.top=(tagA.y*cssScale)+'px';
}
tag.addEventListener('mouseenter',()=>{ tagUntil=performance.now()+4000; });

/* ---------- статусы ---------- */
function fetchTO(url,ms){ const c=new AbortController(), id=setTimeout(()=>c.abort(),ms); return fetch(url,{signal:c.signal,cache:'no-store'}).finally(()=>clearTimeout(id)); }
const cfgCache={};
async function poll(a){
  if(!a.def.cfg){ setStatus(a,'off'); return; }
  try{
    let c=cfgCache[a.id];
    if(!c||Date.now()-c.t>300000){
      const r=await fetchTO(a.def.cfg+'?t='+Date.now(),6000); if(!r.ok)throw 0;
      const j=await r.json(); if(!j.api_url)throw 0;
      c=cfgCache[a.id]={url:String(j.api_url).replace(/\/+$/,''),t:Date.now()};
    }
    const r2=await fetchTO(c.url+'/api/state',5000); if(!r2.ok)throw 0;
    const st=await r2.json();
    setStatus(a,st&&st.busy?'busy':'free');
  }catch(e){
    if(cfgCache[a.id])cfgCache[a.id].t=Date.now()-240000;   // адрес туннеля мог смениться: перечитать config через минуту
    setStatus(a,'off');
  }
}
const forced=QS.get('status');
const demo=QS.has('demo');
function pollAll(){ if(document.hidden)return; realAgents.forEach(poll); }
if(forced){
  const arr=forced.split(',');
  setTimeout(()=>realAgents.forEach((a,i)=>setStatus(a,['free','busy','off'].indexOf(arr[i])>=0?arr[i]:'off')),400);
} else if(demo){
  const cyc=()=>realAgents.forEach(a=>{ if(a.status==='check'||Math.random()<.5)setStatus(a,pick(['free','free','busy','off'])); });
  setTimeout(cyc,400); setInterval(()=>{ if(!document.hidden)cyc(); },25000);
} else {
  pollAll(); setInterval(pollAll,20000);
  document.addEventListener('visibilitychange',()=>{ if(!document.hidden)pollAll(); });
}
/* старт: все за своими столами, расходятся в разное время */
agents.forEach(a=>{ place(a,seatTarget(a.def.seat)); a.face='idle'; a.actUntil=performance.now()+1500+Math.random()*9000; });

/* ---------- меню агентов ---------- */
const drawer=document.getElementById('drawer'), alist=document.getElementById('alist');
const agentsBtn=document.getElementById('agents-btn');
agentsBtn.addEventListener('click',e=>{ e.stopPropagation(); drawer.classList.toggle('on'); });
document.addEventListener('click',e=>{ if(drawer.classList.contains('on')&&!drawer.contains(e.target)&&e.target!==agentsBtn&&!document.getElementById('card').contains(e.target))drawer.classList.remove('on'); });
function statusOf(def){ if(def.slot)return 'slot'; const a=byId[def.id]; return a?a.status:'off'; }
function miniSprite(def){
  const c=document.createElement('canvas'); c.width=16; c.height=24;
  const x=c.getContext('2d'); x.imageSmoothingEnabled=false;
  if(def.slot){ x.drawImage(sprite(def.pal||SLOT_PAL,'q','down',0,false,false,false),0,0); return c; }
  const st=statusOf(def);
  const face=st==='free'?'happy':st==='check'?'idle':'work';
  x.drawImage(sprite(def.pal,face,'down',0,false,false,false),0,0);
  return c;
}
function renderDrawer(){
  alist.innerHTML='';
  DEFS.forEach(def=>{
    const b=document.createElement('button'); b.type='button'; b.className='ai'+(def.slot?' slot':'');
    b.appendChild(miniSprite(def));
    const tx=document.createElement('div');
    const nm=document.createElement('div'); nm.className='nm';
    nm.textContent=def.slot?(T('slot')+' '+String(def.n).padStart(2,'0')):L(def.name);
    const cl=document.createElement('div'); cl.className='cl';
    cl.textContent=def.slot?T('slot.empty'):L(def.cls);
    tx.appendChild(nm); tx.appendChild(cl); b.appendChild(tx);
    if(!def.slot){
      const st=statusOf(def), s=document.createElement('div'); s.className='stt';
      const d=document.createElement('span'); d.className='dot '+st; s.appendChild(d);
      const t=document.createElement('span'); t.textContent=stLabel(st); s.appendChild(t);
      b.appendChild(s);
    }
    b.addEventListener('click',()=>openCard(def));
    alist.appendChild(b);
  });
  document.getElementById('dr-c').textContent=REAL.length+' / '+DEFS.length;
}
function updateCount(){
  const n=agents.filter(a=>a.status==='free').length;
  agentsBtn.querySelector('.cnt').textContent=n+'/'+DEFS.length;
  agentsBtn.querySelector('.dot').className='dot '+(n?'free':'off');
}

/* ---------- карточка ---------- */
const card=document.getElementById('card');
let cardDef=null;
const FACE_OF={free:'happy',busy:'working',off:'busy',check:'busy'};
function openCard(def){
  cardDef=def; fillCard(); card.classList.add('on');
  if(TR)TR.event('office.card.'+def.id);
  const a=byId[def.id]; if(a){ sel=a; }
}
function closeCard(){ card.classList.remove('on'); cardDef=null; }
function refreshCard(){ if(cardDef)fillCard(); }
function fillCard(){
  const def=cardDef, st=statusOf(def);
  const $=id=>document.getElementById(id);
  $('pt-body').src='img/p-'+(def.slot?'slot':def.p)+'.png';
  const face=FACE_OF[st];
  $('pt-face').style.display=face?'block':'none'; if(face)$('pt-face').src='img/f-'+face+'.png';
  $('pt-q').style.display=def.slot?'flex':'none';
  $('cdot').className='dot '+(def.slot?'':st);
  $('cst').textContent=def.slot?T('slot'):stLabel(st);
  $('csub').textContent=def.slot?T('slot.empty'):T('sub.'+st);
  $('cq').textContent=def.slot?'':L(def.quote);
  $('cname').textContent=def.slot?(T('slot')+' '+String(def.n).padStart(2,'0')):L(def.name);
  $('ccls').textContent=def.slot?'???':L(def.cls);
  $('ccls').style.color=def.color||'';
  const meta=$('cmeta'); meta.innerHTML='';
  const rows=def.slot?[[T('desk'),String(def.seat+1).padStart(2,'0')]]
    :[[T('model'),def.model],[T('host'),L(def.host)],[T('desk'),String(def.seat+1).padStart(2,'0')]];
  rows.forEach(r=>{ const dt=document.createElement('dt'); dt.textContent=r[0]; const dd=document.createElement('dd'); dd.textContent=r[1]; meta.appendChild(dt); meta.appendChild(dd); });
  $('cabout').textContent=def.slot?T('slot.about'):L(def.about);
  const bars=$('cbars'); bars.innerHTML='';
  const stats=def.slot?{logic:0,code:0,empathy:0,speed:0}:def.stats;
  for(const k in stats){
    const l=document.createElement('div'); l.className='bl'; l.textContent=T('st.'+k);
    const seg=document.createElement('div'); seg.className='seg'; seg.style.setProperty('--c',def.color||'#41a6f6');
    for(let i=0;i<10;i++){ const c=document.createElement('i'); if(i<stats[k])c.className='on'; seg.appendChild(c); }
    const v=document.createElement('div'); v.className='bv'; v.textContent=def.slot?'?':stats[k];
    bars.appendChild(l); bars.appendChild(seg); bars.appendChild(v);
  }
  const sk=$('cskills'); sk.innerHTML='';
  if(!def.slot){
    const p1=document.createElement('div'); const b1=document.createElement('b'); b1.textContent=T('skills'); p1.appendChild(b1); p1.appendChild(document.createTextNode(L(def.skills).join(', ')));
    const p2=document.createElement('div'); const b2=document.createElement('b'); b2.textContent=T('weak'); p2.appendChild(b2); p2.appendChild(document.createTextNode(L(def.weak)));
    sk.appendChild(p1); sk.appendChild(p2);
  }
  const talk=$('ctalk'), call=$('ccall'), note=$('cnote');
  talk.textContent=T('talk'); call.textContent=T('call');
  talk.style.display=call.style.display=def.slot?'none':'';
  talk.disabled=call.disabled=(st!=='free');
  note.textContent=def.slot?'':st==='busy'?T('talk.busy'):st==='off'?T('talk.off'):'';
}
document.getElementById('cx').addEventListener('click',closeCard);
card.addEventListener('click',e=>{ if(e.target===card)closeCard(); });
document.getElementById('ctalk').addEventListener('click',()=>{
  const def=cardDef; if(!def||statusOf(def)!=='free')return;
  try{ sessionStorage.setItem('aceon_access','granted'); }catch(e){}
  if(TR)TR.event('office.talk.'+def.id);
  location.href=def.chat;
});
document.getElementById('ccall').addEventListener('click',()=>{
  const def=cardDef, a=def&&byId[def.id]; if(!a||a.status!=='free')return;
  closeCard(); drawer.classList.remove('on');
  a.act='called';
  goTo(a,botT(184,201,'down','called'),()=>{ a.face='happy'; sayChain(a,sayPool('say.ask'),true); a.actUntil=performance.now()+7000; });
  a.actUntil=Infinity;
});
document.getElementById('pt').addEventListener('mouseenter',()=>{ if(cardDef&&statusOf(cardDef)==='free')document.getElementById('pt-face').src='img/f-fascinated.png'; });
document.getElementById('pt').addEventListener('mouseleave',()=>{ if(cardDef)fillCard(); });
document.getElementById('ctalk').addEventListener('mouseenter',()=>{ if(cardDef&&statusOf(cardDef)==='free')document.getElementById('pt-face').src='img/f-fascinated.png'; });
document.getElementById('ctalk').addEventListener('mouseleave',()=>{ if(cardDef)fillCard(); });
addEventListener('keydown',e=>{ if(e.key==='Escape'){ closeCard(); closeTerm(); drawer.classList.remove('on'); } });

/* ---------- терминал фрагментов (логика прежней страницы) ---------- */
let obsId=null;
try{ obsId=localStorage.getItem('aceon_obs'); if(!obsId){ obsId='OBS_'+Math.random().toString(36).substring(2,8).toUpperCase(); localStorage.setItem('aceon_obs',obsId); } }catch(e){ obsId='OBS_GUEST'; }
document.getElementById('obs').textContent='OBS: '+obsId;
const termEl=document.getElementById('term'), tlog=document.getElementById('tlog'), tin=document.getElementById('tin'), tsend=document.getElementById('tsend');
const DB_URL=null;
let termOpened=false;
function tmsg(type,sender,lines,cls){
  const d=document.createElement('div'); d.className='m '+(type==='user'?'user':'bot')+(cls?' '+cls:'');
  const s=document.createElement('div'); s.className='s'; s.textContent=sender+'  '+new Date().toTimeString().slice(0,8);
  const b=document.createElement('div'); b.textContent=lines.join('\n');
  d.appendChild(s); d.appendChild(b); tlog.appendChild(d); tlog.scrollTop=tlog.scrollHeight;
}
function getClaimed(){ try{ return JSON.parse(localStorage.getItem('aceon_claimed')||'{}'); }catch(e){ return {}; } }
function respondInvalid(code){ tmsg('bot','A.C.EON NODE',['> CODE_NOT_RECOGNIZED','> INPUT: '+code,'> DATABASE: NO MATCH FOUND','> STATUS: ACCESS DENIED','> ','> NODE: CONTINUE SEARCHING.'],'invalid'); }
function respondValid(code,entry){
  const c=getClaimed(); c[code]={obsId:obsId,at:new Date().toISOString()};
  try{ localStorage.setItem('aceon_claimed',JSON.stringify(c)); }catch(e){}
  if(TR)TR.code('FRAG:'+code);
  tmsg('bot','A.C.EON NODE',['> CODE_VERIFIED','> INPUT: '+code,'> FRAGMENT: '+entry.fragment,'> OBSERVER: '+obsId,'> REWARD: '+entry.reward+' / PENDING CLAIM','> ','> NODE: YOU WERE FIRST.','>       THIS DISCOVERY IS LOGGED.','>       CLAIM PROTOCOL INCOMING.'],'valid');
}
function respondClaimed(code,entry){
  const c=getClaimed(), who=entry.claimedBy||(c[code]?c[code].obsId:'OBSERVER_UNKNOWN');
  tmsg('bot','A.C.EON NODE',['> CODE_VERIFIED / ALREADY CLAIMED','> INPUT: '+code,'> FRAGMENT: '+entry.fragment,'> CLAIMED BY: '+who,'> ','> NODE: LATE ARRIVAL.','>       THE VOID HAS MEMORY.'],'claimed');
}
function checkCode(raw){
  const code=raw.trim().toUpperCase(); if(!code)return;
  tmsg('user','YOU',[raw]); tsend.disabled=true; tin.value='';
  if(TR)TR.event('office.code');
  setTimeout(()=>{
    if(!DB_URL){ respondInvalid(code); tsend.disabled=false; tin.focus(); return; }
    fetch(DB_URL+'?t='+Date.now()).then(r=>r.json()).then(db=>{
      const e=db[code], c=getClaimed();
      if(!e)respondInvalid(code); else if(e.used||c[code])respondClaimed(code,e); else respondValid(code,e);
    }).catch(()=>tmsg('bot','A.C.EON NODE',['> DATABASE_UNAVAILABLE','> STATUS: CONNECTION ERROR','> NODE: TRY AGAIN LATER.'],'invalid'))
      .finally(()=>{ tsend.disabled=false; tin.focus(); });
  },700+Math.random()*500);
}
function openTerm(){
  termEl.classList.add('on'); drawer.classList.remove('on');
  if(!termOpened){ termOpened=true; tmsg('bot','A.C.EON NODE',['> CHANNEL OPEN','> OBSERVER: '+obsId,'> ','> DATABASE: CONNECTED','> AWAITING INPUT','> ','> NODE: ENTER FRAGMENT CODE TO BEGIN.']); }
  if(TR)TR.event('office.term');
  setTimeout(()=>tin.focus(),60);
}
function closeTerm(){ termEl.classList.remove('on'); }
tsend.addEventListener('click',()=>checkCode(tin.value));
tin.addEventListener('keydown',e=>{ if(e.key==='Enter')checkCode(tin.value); });
document.getElementById('tx').addEventListener('click',closeTerm);
termEl.addEventListener('click',e=>{ if(e.target===termEl)closeTerm(); });
document.getElementById('term-open').addEventListener('click',openTerm);

/* ---------- музыка (общая громкость сайта) ---------- */
const BGM_TRACKS=['../audio/I Am Not Alive, But I Answer  (Awake).mp3','../audio/I Am Not Alive, But I Answer (Echo).mp3'];
const bgm=new Audio(); bgm.volume=0; bgm.loop=true;
const bgmBtn=document.getElementById('bgm-btn');
let bgmStarted=false, bgmFade=null;
function siteMusic(){ const v=(hasI18n?Store.get('site'):readSite()).music; return typeof v==='number'?v:.6; }
function saveMusic(v){ if(hasI18n){ Store.get('site').music=v; Store.save('site'); } else { const o=readSite(); o.music=v; writeSite(o); } }
function bgmTarget(){ return Math.min(1,siteMusic())*.6; }
function fadeBgm(to,done){
  clearInterval(bgmFade);
  bgmFade=setInterval(()=>{ let v=bgm.volume; v=to>v?Math.min(to,v+.02):Math.max(to,v-.05); bgm.volume=v; if(v===to){ clearInterval(bgmFade); if(done)done(); } },120);
}
function bgmUI(){ const on=bgmStarted&&!bgm.paused; bgmBtn.classList.toggle('muted',!on); bgmBtn.textContent=on?'♫':'♪'; }
function startBGM(force){
  if(bgmStarted)return;
  if(!force&&siteMusic()<=0){ bgmUI(); return; }
  bgmStarted=true;
  bgm.src=BGM_TRACKS[Math.random()*BGM_TRACKS.length|0];
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
    saveMusic(0); fadeBgm(0,()=>bgm.pause());
  }
});
['pointerdown','keydown'].forEach(ev=>document.addEventListener(ev,()=>startBGM(false),{once:true,passive:true}));
document.addEventListener('visibilitychange',()=>{ if(!bgmStarted)return; if(document.hidden)bgm.pause(); else if(siteMusic()>0)bgm.play().catch(()=>{}); });

/* ---------- шапка, язык, часы ---------- */
const langBtn=document.getElementById('langbtn'), langMenu=document.getElementById('langmenu');
LANGS.forEach(c=>{
  const b=document.createElement('button'); b.type='button'; b.setAttribute('data-l',c);
  b.innerHTML='<b>'+c.toUpperCase()+'</b><span></span>'; b.lastChild.textContent=LANG_NAMES[c];
  b.addEventListener('click',()=>{ langMenu.classList.remove('on'); setLang(c); });
  langMenu.appendChild(b);
});
langBtn.addEventListener('click',e=>{ e.stopPropagation(); langMenu.classList.toggle('on'); });
document.addEventListener('click',()=>langMenu.classList.remove('on'));
document.getElementById('back').addEventListener('click',()=>{ location.href='../A.C.EON_Core/'; });
function applyTexts(){
  langBtn.textContent=lang().toUpperCase(); langBtn.title=T('lang.title');
  langMenu.querySelectorAll('button').forEach(b=>b.classList.toggle('sel',b.getAttribute('data-l')===lang()));
  bgmBtn.title=T('music.toggle');
  document.getElementById('back').textContent=T('back');
  document.getElementById('ttl-b').textContent=T('title');
  document.title='A.C.EON · '+T('title');
  agentsBtn.querySelector('.lbl').textContent=T('agents');
  document.getElementById('dr-t').textContent=T('agents');
  document.getElementById('term-open').textContent=T('term.open');
  document.getElementById('term-t').textContent=T('term');
  document.getElementById('thint').textContent=T('term.hint');
  tin.placeholder=T('term.ph'); tsend.textContent=T('term.send');
  document.getElementById('foot').textContent=isCoarse?T('hint.touch'):T('hint');
  renderDrawer(); updateCount(); refreshCard();
  if(tagA)showTag(tagA,Math.max(0,tagUntil-performance.now()));
}
function tickClock(){ const d=new Date(); document.getElementById('clock').textContent=String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0'); }
tickClock(); setInterval(tickClock,10000);

/* ---------- память посетителя ---------- */
function visitorLine(){
  if(!TR)return;
  const D=TR.data(), s=TR.session||{};
  const a=agents.filter(x=>x.placed&&x.status!=='off'&&!x.path.length)[0]||agents.filter(x=>x.placed)[0];
  if(!a)return;
  const h=new Date().getHours();
  if(h<5&&TR.seen('office.night')<Date.now()-6*3600e3){ TR.mark('office.night'); say(a,sayPool('say.night'),true); return; }
  if(s.fresh&&D.sessions>1&&TR.seen('office.visit')<Date.now()-12*3600e3){ TR.mark('office.visit'); say(a,sayPool('say.visit',{n:D.sessions}),true); return; }
  const fav=TR.top&&TR.top(['chat','home','A.C.EON_Core','info']);
  if(typeof fav==='string'&&Math.random()<.6&&TR.seen('office.place')<Date.now()-3600e3){ TR.mark('office.place'); say(a,sayPool('say.place',{place:TR.name(fav)}),true); }
}

/* ---------- загрузка ---------- */
const bootEl=document.getElementById('boot'), bootL=document.getElementById('bootl');
const BOOT=['<b>A.C.EON // AI OFFICE</b>','','> STAFF REGISTRY..... '+REAL.length+'/'+DEFS.length,'> DESKS.............. '+SEATS.length,'> OBSERVER........... '+obsId,'> OPENING DOOR'];
BOOT.forEach((l,i)=>setTimeout(()=>{ bootL.innerHTML+=(i?'\n':'')+l; },reduceMotion?0:i*150));
function hideBoot(){ bootEl.classList.add('gone'); setTimeout(()=>bootEl.remove(),450); }

Promise.all([loadImg('bg','img/office.png'),loadImg('cat','img/cat.png'),loadImg('dog','img/dog.png')]).then(()=>{
  fit(); applyTexts();
  setTimeout(hideBoot,reduceMotion?200:1100);
  requestAnimationFrame(t=>{ last=t; loop(t); });
  setTimeout(visitorLine,7000+Math.random()*4000);
  ['img/p-anton.png','img/p-kai.png','img/p-node.png','img/f-happy.png','img/f-working.png'].forEach(s=>{ const i=new Image(); i.src=s; });
});
fit();
})();
