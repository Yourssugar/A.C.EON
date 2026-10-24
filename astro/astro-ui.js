/* A.C.EON // ASTRO: интерфейс.
   Три режима: прогноз (знак или человек, шар), моя карта (колесо и портрет), пара (синастрия).
   Люди хранятся профилями в Store('astro'): один раз ввёл, дальше выбираешь из списка.
   Темы: obs (только шейдер) и пять с картинками из themes/, пока картинки нет, фон рисует шейдер. */
(function(){
'use strict';
const $=id=>document.getElementById(id);
const C=window.AstroCore, GL=window.AstroGL||{ok:false,ballOk:false,setTheme(){},ballPulse(){},setBallVisible(){}};
const TR=window.Trace||null;
const RM=matchMedia('(prefers-reduced-motion: reduce)').matches;
let PORTAL=false; try{ PORTAL=window.self!==window.top; }catch(e){ PORTAL=true; }
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const NS='http://www.w3.org/2000/svg';

if(!window.Astronomy||!C){ document.body.insertAdjacentHTML('afterbegin','<p class="fatal">astronomy.browser.min.js</p>'); return; }

/* ---------- язык ---------- */
const CL=window.ASTRO_LANG||{ru:{}};
const CODES=['en','ru','de','fr','es','it','pl'];
const NAMES={en:'English',ru:'Русский',de:'Deutsch',fr:'Français',es:'Español',it:'Italiano',pl:'Polski'};
const hasI18n=!!(window.I18n&&window.Store);
function readSite(){ try{ return JSON.parse(localStorage.getItem('aceon:site')||'null')||{}; }catch(e){ return {}; } }
let fbLang=(function(){ const s=readSite().lang; if(CODES.indexOf(s)>=0)return s; for(const c of (navigator.languages||[navigator.language||'en'])){ const k=String(c).slice(0,2).toLowerCase(); if(CODES.indexOf(k)>=0)return k; } return 'en'; })();
const lang=()=>hasI18n?I18n.lang:fbLang;
function T(k,v){
  const d=CL[lang()]||{}; let s=d[k]!==undefined?d[k]:((CL.en||{})[k]!==undefined?CL.en[k]:((CL.ru||{})[k]!==undefined?CL.ru[k]:k));
  if(v&&typeof s==='string')s=s.replace(/\{(\w+)\}/g,(m,n)=>v[n]!==undefined?v[n]:m); return s;
}
const TX=()=>(window.ASTRO_TEXT||{})[lang()]||null;
const pN=k=>T('p.'+k), sN=k=>T('s.'+k);
const low=s=>lang()==='de'?s:s.toLowerCase();

/* ---------- память ---------- */
const DEF={people:[],mode:'fc',fcWho:null,fcSign:null,period:'today',mapId:null,synA:null,synB:null,theme:'obs',themeAsked:false};
function legacy(raw,json){
  const o=json('aceon_astro_v3'); if(!o)return null;
  const r={people:[]}, pad=n=>String(n).padStart(2,'0');
  const w=o.whoami, t=o.today;
  if(w&&w.y&&w.m&&w.d){
    const p={id:'me',name:'',d:w.y+'-'+pad(w.m)+'-'+pad(w.d),t:'',city:'',lat:null,lon:null};
    if(w.hh!==undefined&&w.hh!==''&&w.mm!==undefined&&w.mm!==''){ p.t=pad(+w.hh)+':'+pad(+w.mm); }
    if(isFinite(w.lat)&&isFinite(w.lon)&&w.lat!==null){ p.lat=+w.lat; p.lon=+w.lon; }
    r.people.push(p); r.fcWho='me'; r.mapId='me';
  } else if(t&&t.y&&t.m&&t.d){
    r.people.push({id:'me',name:'',d:t.y+'-'+pad(t.m)+'-'+pad(t.d),t:'',city:'',lat:null,lon:null}); r.fcWho='me'; r.mapId='me';
  } else if(t&&t.m&&t.d){ r.fcSign=C.signOf(C.eclLon('sun',new Date(Date.UTC(2000,t.m-1,t.d,12)))); }
  r.mode={today:'fc',whoami:'map',syn:'syn'}[o.tab]||'fc';
  return r;
}
let mem;
const hasStore=!!window.Store;
if(hasStore){ try{ Store.define('astro',{version:1,defaults:DEF,legacy}); mem=Store.get('astro'); }catch(e){ mem=null; } }
if(!mem){ mem=JSON.parse(JSON.stringify(DEF)); try{ const o=JSON.parse(localStorage.getItem('aceon:astro')||'null'); if(o)Object.assign(mem,o); }catch(e){} }
function save(){ if(hasStore)try{ Store.save('astro'); return; }catch(e){} try{ localStorage.setItem('aceon:astro',JSON.stringify(mem)); }catch(e){} }
const person=id=>mem.people.find(p=>p.id===id)||null;
const pname=p=>p.name||(mem.people.indexOf(p)===0?T('meDefault'):T('personN',{n:mem.people.indexOf(p)+1}));
function fmtDate(p){ const d=C.parseDate(p.d); if(!d)return ''; const pad=n=>String(n).padStart(2,'0'); return pad(d.d)+'.'+pad(d.m)+'.'+d.y; }

/* ---------- небо сейчас ---------- */
function moonSvg(angle,size){
  const r=7, a=angle*Math.PI/180, rx=Math.abs(Math.cos(a))*r;
  let path;
  if(angle<180){ const s2=angle<90?0:1; path=`M0 ${-r} A${r} ${r} 0 0 1 0 ${r} A${rx} ${r} 0 0 ${s2} 0 ${-r}Z`; }
  else { const s2=angle>270?1:0; path=`M0 ${-r} A${r} ${r} 0 0 0 0 ${r} A${rx} ${r} 0 0 ${s2} 0 ${-r}Z`; }
  return `<svg class="moon" viewBox="-8 -8 16 16" width="${size||14}" height="${size||14}" aria-hidden="true"><circle r="${r}" class="md"/><path d="${path}" class="ml"/></svg>`;
}
let SKY=null;
function renderSky(){
  SKY=C.skyAt(new Date());
  const st=SKY.merc?T('retro'):T('direct');
  $('sky').innerHTML=
    `<span class="chip">${moonSvg(SKY.angle)}${esc(T('skyMoon',{ph:T('ph.'+SKY.ph),ill:SKY.ill}))}</span>`+
    `<span class="chip">${C.SG[SKY.moonSign]} ${esc(T('skyMoonIn',{s:sN(SKY.moonSign)}))}</span>`+
    `<span class="chip${SKY.merc?' warn':''}">${C.PG.mercury} ${esc(T('skyMerc',{st}))}${SKY.merc?' ℞':''}</span>`+
    `<span class="chip">${C.SG[SKY.sunSign]} ${esc(T('skySun',{s:sN(SKY.sunSign)}))}</span>`;
}

/* ---------- режимы ---------- */
let mode=['fc','map','syn'].indexOf(mem.mode)>=0?mem.mode:'fc';
function setMode(m,quiet){
  mode=m; mem.mode=m; save();
  document.querySelectorAll('#modes button').forEach(b=>{ const on=b.dataset.m===m; b.classList.toggle('on',on); b.setAttribute('aria-pressed',on); });
  document.querySelectorAll('.pane').forEach(p=>p.classList.toggle('on',p.dataset.pane===m));
  document.querySelectorAll('.view').forEach(v=>v.classList.toggle('on',v.dataset.view===m));
  closePanel();
  GL.setBallVisible(m==='fc');
  if(m==='fc')renderFc(); else if(m==='map')renderMap(); else renderSyn();
  if(!quiet){ if(TR)TR.event('astro.'+m); if(m!=='fc')charSay(m); }
}
document.querySelectorAll('#modes button').forEach(b=>b.addEventListener('click',()=>{ if(b.dataset.m!==mode){ setMode(b.dataset.m); scrollTo({top:0,behavior:RM?'auto':'smooth'}); } }));

/* ---------- список людей (общий для всех режимов) ---------- */
function chips(box,sel,onPick,opt){
  opt=opt||{};
  box.innerHTML='';
  mem.people.forEach(p=>{
    const b=document.createElement('button'); b.type='button'; b.className='pchip'+(p.id===sel?' on':'')+(opt.cls?' '+opt.cls:'');
    const ss=C.sunSignOf(p);
    b.innerHTML=`<b>${esc(pname(p))}</b><small>${ss?C.SG[ss.sign]+' ':''}${esc(fmtDate(p))}${p.t?' '+esc(p.t):''}</small>`;
    b.addEventListener('click',()=>{ if(p.id===sel&&opt.edit){ openEditor(p.id); return; } onPick(p.id); });
    if(p.id===sel&&opt.edit){ const e=document.createElement('span'); e.className='ed'; e.textContent='✎'; e.title=T('edit'); b.appendChild(e); }
    box.appendChild(b);
  });
  if(opt.add!==false){
    const a=document.createElement('button'); a.type='button'; a.className='pchip add'; a.textContent=T('add');
    a.addEventListener('click',()=>openEditor(null,id=>{ onPick(id); }));
    box.appendChild(a);
  }
}

/* ---------- прогноз ---------- */
const ICON={
  love:'<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/>',
  work:'<rect x="4" y="8" width="16" height="11" rx="2"/><path d="M9 8V6a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M4 13h16"/>',
  money:'<circle cx="12" cy="12" r="7.5"/><path d="M12 7.5v9M14.5 9.5c-.4-.9-1.3-1.3-2.5-1.3-1.5 0-2.4.8-2.4 1.8 0 2.6 5 1.4 5 4 0 1.1-1 1.8-2.6 1.8-1.3 0-2.3-.5-2.7-1.4"/>',
  health:'<path d="M5 19c8 0 14-5 14-14-9 0-14 6-14 14zM5 19l8-8"/>',
  advice:'<path d="M12 3l2.3 5.6 6 .5-4.6 3.9 1.4 5.9L12 15.8 6.9 18.9l1.4-5.9L3.7 9.1l6-.5z"/>'
};
const SWATCH=['#1f3b8a','#d4a24a','#2f9a6b','#7a1f35','#c9ced6','#c0623f','#a58fd6','#4a4d55','#2fb5b0','#d8c08f'];
let fcOnce=false;
function fcSign(){
  if(mem.fcWho){ const p=person(mem.fcWho); if(p){ const s=C.sunSignOf(p); if(s)return {sign:s.sign,cusp:s.cusp,p}; } }
  if(mem.fcSign&&C.SIGNS.indexOf(mem.fcSign)>=0)return {sign:mem.fcSign};
  return null;
}
function renderFcSide(){
  chips($('fcPeople'),mem.fcWho,id=>{ mem.fcWho=id; mem.fcSign=null; save(); renderFc(true); },{});
  const box=$('fcSigns'); box.innerHTML=''; const cur=fcSign();
  C.SIGNS.forEach(s=>{
    const b=document.createElement('button'); b.type='button'; b.className='sg'+(!mem.fcWho&&cur&&cur.sign===s?' on':'')+(mem.fcWho&&cur&&cur.sign===s?' soft':'');
    b.innerHTML=`<i>${C.SG[s]}</i><span>${esc(sN(s))}</span>`; b.title=sN(s);
    b.addEventListener('click',()=>{ mem.fcSign=s; mem.fcWho=null; save(); renderFc(true); });
    box.appendChild(b);
  });
  document.querySelectorAll('#period button').forEach(b=>{ b.textContent=T('pr.'+b.dataset.p); b.classList.toggle('on',b.dataset.p===mem.period); });
}
function renderFc(fresh){
  renderFcSide();
  const cur=fcSign();
  $('ballBtn').textContent=cur?T('ballAsk'):T('ballPick');
  $('ballwrap').classList.toggle('idle',!cur);
  if(!cur){ $('fcCard').hidden=true; return; }
  if(fresh){ GL.ballPulse(); if(TR&&!fcOnce)TR.event('astro.fc.first'); fcOnce=true; }
  const now=new Date(); let sky, seed=now;
  if(mem.period==='tomorrow'){ seed=new Date(now.getTime()+864e5); sky=C.skyAt(seed); }
  else if(mem.period==='week'){ sky=C.skyAt(new Date(now.getTime()+3*864e5)); }
  else sky=C.skyAt(now);
  const f=C.forecast(cur.sign,sky,seed,mem.period);
  const pool=k=>{ const a=T('F.'+k); return Array.isArray(a)?a:[String(a)]; };
  const pk=(k,salt)=>{ const a=pool(k); return a[f.pick(a.length,salt)]; };
  const st=f.state;
  $('fcTitle').innerHTML=esc(T('fcT.'+mem.period))+' <span class="tsg">'+C.SG[cur.sign]+' '+esc(sN(cur.sign))+'</span>';
  $('fcIntro').textContent=pk((mem.period==='week'?'week.':'mood.')+st,'mood');
  const blocks=[['love',T('bLove'),pk('love.'+st,'love')],['work',T('bWork'),pk('work.'+st,'work')+(sky.merc?' '+T('F.mercRetro'):'')],
    ['money',T('bMoney'),pk('money.'+st,'money')],['health',T('bHealth'),pk('health.'+st,'health')],['advice',T('bAdvice'),pk('advice','advice')]];
  $('fcBlocks').innerHTML=blocks.map(b=>`<div class="blk"><svg class="bi" viewBox="0 0 24 24" aria-hidden="true">${ICON[b[0]]}</svg><div><b>${esc(b[1])}</b><p>${esc(b[2])}</p></div></div>`).join('');
  let moonTxt;
  if(mem.period==='week'){ const w=C.week(now), bits=[]; if(w.newM)bits.push(T('wNew')); if(w.fullM)bits.push(T('wFull')); if(w.retro)bits.push(T('wRetro')); moonTxt=bits.length?bits.join(' · '):T('wCalm'); }
  else moonTxt=T('xMoon',{ph:T('ph.'+sky.ph),s:sN(sky.moonSign),ill:sky.ill});
  const cols=T('col'), ci=f.pick(cols.length,'color');
  $('fcExtras').innerHTML=
    `<span>${moonSvg(sky.angle,13)} ${esc(moonTxt)}</span>`+
    `<span>${C.PG.mercury} ${esc(T('xMerc',{st:sky.merc?T('retro')+' ℞':T('direct')}))}</span>`+
    `<span>${C.SG[f.compat]} ${esc(T('xCompat',{s:sN(f.compat)}))}</span>`+
    `<span># ${esc(T('xNum',{n:f.num}))}</span>`+
    `<span><i class="sw" style="background:${SWATCH[ci%SWATCH.length]}"></i>${esc(T('xColor',{c:cols[ci]}))}</span>`;
  $('fcNote').textContent=(cur.cusp?T('cusp')+' ':'')+T('fcNote');
  const card=$('fcCard'), wasHidden=card.hidden; card.hidden=false;
  if(fresh&&!RM){ card.classList.remove('reveal'); void card.offsetWidth; card.classList.add('reveal'); }
  else if(wasHidden)card.classList.add('reveal');
}
document.querySelectorAll('#period button').forEach(b=>b.addEventListener('click',()=>{ mem.period=b.dataset.p; save(); renderFc(true); }));
function gaze(){
  const cur=fcSign();
  GL.ballPulse();
  const css=$('ballCss'); css.classList.remove('pulse'); void css.offsetWidth; css.classList.add('pulse');
  if(!cur){ $('fcSigns').classList.remove('blink'); void $('fcSigns').offsetWidth; $('fcSigns').classList.add('blink'); return; }
  if(TR)TR.event('astro.ball');
  charSay('ball','happy');
  $('ballBtn').textContent=T('ballBusy');
  setTimeout(()=>{ renderFc(true); },RM?0:900);
}
$('ballBtn').addEventListener('click',gaze);
$('ball').addEventListener('click',gaze);
$('ballCss').addEventListener('click',gaze);

/* ---------- тексты прочтений ---------- */
function tSign(k,s){ const x=TX(); const v=x&&x.pis&&x.pis[k+'.'+s]; return v||T('tplSign',{p:pN(k),s:sN(s),sph:T('ps.'+k),el:T('el.'+C.EL[s]),mod:T('mo.'+C.MOD[s])}); }
function tHouse(k,h){ const x=TX(); const v=x&&x.pih&&x.pih[k+'.'+h]; return v||T('tplHouse',{p:pN(k),sph:T('ps.'+k),n:h,h:low(T('h.'+h))}); }
function tAsp(kind,a,type,b){
  const x=TX(), tb=x&&x[kind]; const v=tb&&(tb[a+'.'+type+'.'+b]||tb[b+'.'+type+'.'+a]);
  return v||T(kind==='syn'?'tplSyn':'tplAsp',{a:pN(a),b:pN(b),tone:T('tone.'+type),asp:low(T('a.'+type))});
}

/* ---------- колесо ---------- */
const CX=400,CY=400,R_ZOD=352,R_IN=314,R_PL=252,R_CORE=56;
const mk=(t,at)=>{ const e=document.createElementNS(NS,t); for(const k in at)e.setAttribute(k,at[k]); return e; };
function wheel(svg,rot){
  const pos=(lon,r)=>{ const a=(180-(lon-rot))*Math.PI/180; return [CX+r*Math.cos(a),CY-r*Math.sin(a)]; };
  svg.innerHTML=''; svg.removeAttribute('hidden');
  const defs=mk('defs',{}); defs.innerHTML='<radialGradient id="cg'+svg.id+'"><stop offset="0%" style="stop-color:var(--ac);stop-opacity:.85"/><stop offset="60%" style="stop-color:var(--ac);stop-opacity:.18"/><stop offset="100%" style="stop-color:var(--ac);stop-opacity:0"/></radialGradient>';
  svg.appendChild(defs);
  svg.appendChild(mk('circle',{class:'wbg',cx:CX,cy:CY,r:R_ZOD}));
  const arc=(r1,r2,a1,a2)=>{ const [x1,y1]=pos(a1,r2),[x2,y2]=pos(a2,r2),[x3,y3]=pos(a2,r1),[x4,y4]=pos(a1,r1);
    return `M${x1} ${y1}A${r2} ${r2} 0 0 1 ${x2} ${y2}L${x3} ${y3}A${r1} ${r1} 0 0 0 ${x4} ${y4}Z`; };
  C.SIGNS.forEach((s,i)=>{
    svg.appendChild(mk('path',{class:'zs el-'+C.EL[s],d:arc(R_IN,R_ZOD,i*30,i*30+30)}));
    const [x1,y1]=pos(i*30,R_IN),[x2,y2]=pos(i*30,R_ZOD); svg.appendChild(mk('line',{class:'tick',x1,y1,x2,y2}));
    for(let d=5;d<30;d+=5){ const [a,b]=pos(i*30+d,R_IN),[c,e]=pos(i*30+d,R_IN+(d===15?9:5)); svg.appendChild(mk('line',{class:'tick sm',x1:a,y1:b,x2:c,y2:e})); }
    const [gx,gy]=pos(i*30+15,(R_ZOD+R_IN)/2+1); const g=mk('text',{class:'zg',x:gx,y:gy}); g.textContent=C.SG[s];
    const tt=mk('title',{}); tt.textContent=sN(s); g.appendChild(tt); svg.appendChild(g);
  });
  svg.appendChild(mk('circle',{class:'ring',cx:CX,cy:CY,r:R_ZOD}));
  svg.appendChild(mk('circle',{class:'ring',cx:CX,cy:CY,r:R_IN}));
  svg.appendChild(mk('circle',{class:'core-ring',cx:CX,cy:CY,r:R_CORE+14}));
  svg.appendChild(mk('circle',{class:'core',cx:CX,cy:CY,r:R_CORE,fill:'url(#cg'+svg.id+')'}));
  return pos;
}
function spread(planets,base,step,maxL){
  const rad={}, sorted=[...C.PLANETS].sort((a,b)=>planets[a].lon-planets[b].lon); let lvl=0;
  sorted.forEach((k,i)=>{ if(i>0){ const dd=planets[k].lon-planets[sorted[i-1]].lon; lvl=dd<8?Math.min(lvl+1,maxL):0; } rad[k]=base-lvl*step; });
  return rad;
}
function drawAsp(svg,pos,pa,pb,list,ra,rb){
  const g=mk('g',{class:'asps'}); svg.appendChild(g);
  list.forEach(x=>{ const [x1,y1]=pos(pa[x.a].lon,ra[x.a]-24),[x2,y2]=pos(pb[x.b].lon,rb[x.b]-24);
    const l=mk('line',{class:'asp '+x.type,x1,y1,x2,y2}); l.dataset.a=x.a; l.dataset.b=x.b; g.appendChild(l); });
  return g;
}
function drawPl(svg,pos,planets,rad,cls,onPick){
  const nodes={};
  C.PLANETS.forEach(k=>{
    const p=planets[k], r=rad[k], [x,y]=pos(p.lon,r), [sx,sy]=pos(p.lon,R_IN), [bx,by]=pos(p.lon,r+17);
    svg.appendChild(mk('line',{class:'spoke'+(cls?' '+cls:''),x1:bx,y1:by,x2:sx,y2:sy}));
    const g=mk('g',{class:'pn'+(cls?' '+cls:''),tabindex:0,role:'button'}); g.dataset.k=k;
    g.appendChild(mk('circle',{class:'halo',cx:x,cy:y,r:27}));
    g.appendChild(mk('circle',{class:'dot',cx:x,cy:y,r:19}));
    const t=mk('text',{x,y}); t.textContent=C.PG[k]; g.appendChild(t);
    if(p.retro){ const [rx,ry]=pos(p.lon,r+23); g.appendChild(mk('circle',{class:'rdot',cx:rx,cy:ry,r:3.2})); }
    const tt=mk('title',{}); tt.textContent=T('inSign',{p:pN(k),s:sN(p.sign)})+' '+Math.floor(p.deg)+'°'+(p.retro?' ℞':''); g.appendChild(tt);
    g.addEventListener('click',()=>onPick(k));
    g.addEventListener('keydown',e=>{ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); onPick(k); } });
    svg.appendChild(g); nodes[k]=g;
  });
  return nodes;
}
function angles(svg,pos,ch){
  if(ch.mode!=='full')return;
  ch.cusps.forEach((c,i)=>{
    const [x1,y1]=pos(c,R_CORE+14),[x2,y2]=pos(c,R_IN); svg.appendChild(mk('line',{class:'cusp'+(i%3===0?' ang':''),x1,y1,x2,y2}));
    const nx=ch.cusps[(i+1)%12]; let mid=c+(((nx-c)+360)%360)/2; const [tx,ty]=pos(mid,R_CORE+28);
    const t=mk('text',{class:'hn',x:tx,y:ty}); t.textContent=i+1; svg.appendChild(t);
  });
  [['ASC',ch.asc.lon],['MC',ch.mc.lon]].forEach(([n,l])=>{
    const [x1,y1]=pos(l,R_ZOD),[x2,y2]=pos(l,R_ZOD+16),[lx,ly]=pos(l,R_ZOD+32);
    svg.appendChild(mk('line',{class:'angm',x1,y1,x2,y2})); const t=mk('text',{class:'angl',x:lx,y:ly}); t.textContent=n; svg.appendChild(t);
  });
}
function enter(svg){ if(RM)return; svg.classList.remove('enter'); void svg.getBoundingClientRect(); svg.classList.add('enter'); }

/* ---------- панель прочтения ---------- */
let CUR=null;
function openPanel(){ $('panel').classList.add('open'); $('panel').setAttribute('aria-hidden','false'); $('scrim').classList.add('on'); }
function closePanel(){
  $('panel').classList.remove('open'); $('panel').setAttribute('aria-hidden','true'); $('scrim').classList.remove('on');
  if(!CUR)return;
  CUR.svg.querySelectorAll('.pn').forEach(g=>g.classList.remove('dim','sel'));
  CUR.svg.querySelectorAll('.asp').forEach(l=>l.classList.remove('hot','dim'));
}
$('pClose').addEventListener('click',closePanel);
$('scrim').addEventListener('click',closePanel);
function focusNodes(test,hot){
  CUR.svg.querySelectorAll('.pn').forEach(g=>{ const on=test(g); g.classList.toggle('sel',on); g.classList.toggle('dim',!on); });
  CUR.svg.querySelectorAll('.asp').forEach(l=>{ const h=hot(l); l.classList.toggle('hot',h); l.classList.toggle('dim',!h); });
}
function fillPanel(k,p,sub,body,house,title,list){
  $('pGlyph').textContent=C.PG[k];
  $('pTitle').textContent=T('inSign',{p:pN(k),s:sN(p.sign)});
  $('pSub').textContent=sub;
  $('pBody').textContent=body;
  $('pHouse').innerHTML=house;
  $('pAspT').textContent=title; $('pAspT').hidden=!list.length;
  $('pAsp').innerHTML=list.join('');
  openPanel();
}
function selPlanet(k){
  const ch=CUR.chart, p=ch.planets[k];
  focusNodes(g=>g.dataset.k===k,l=>l.dataset.a===k||l.dataset.b===k);
  const bits=[C.SG[p.sign]+' '+Math.floor(p.deg)+'°',T('ps.'+k)]; if(p.house)bits.push(T('houseN',{n:p.house})); if(p.retro)bits.push(T('retroW')+' ℞'); if(p.approx)bits.push(T('approx'));
  const house=(ch.mode==='full'&&p.house)?'<b>'+esc(T('h.'+p.house))+'.</b> '+esc(tHouse(k,p.house)):'';
  const list=ch.aspects.filter(x=>x.a===k||x.b===k).map(x=>{ const o=x.a===k?x.b:x.a;
    return `<div class="ai"><span class="h"><i class="at ${x.type}">${C.ASP[x.type].g}</i> ${esc(T('a.'+x.type))}: ${C.PG[o]} ${esc(pN(o))} <em>${esc(T('orb',{o:x.orb}))}</em></span><span class="t">${esc(tAsp('asp',x.a,x.type,x.b))}</span></div>`; });
  fillPanel(k,p,bits.join(' · '),tSign(k,p.sign),house,T('pAsp'),list);
}
function selBi(set,k){
  const src=set==='a'?CUR.a:CUR.b, p=src.planets[k];
  focusNodes(g=>g.dataset.k===k&&g.classList.contains('b')===(set==='b'),l=>(set==='a'&&l.dataset.a===k)||(set==='b'&&l.dataset.b===k));
  const who=set==='a'?CUR.na:CUR.nb;
  const bits=[who,C.SG[p.sign]+' '+Math.floor(p.deg)+'°']; if(p.retro)bits.push('℞'); if(p.approx)bits.push(T('approx'));
  const list=CUR.cross.filter(x=>(set==='a'&&x.a===k)||(set==='b'&&x.b===k)).map(x=>{ const o=set==='a'?x.b:x.a;
    return `<div class="ai"><span class="h"><i class="at ${x.type}">${C.ASP[x.type].g}</i> ${esc(T('a.'+x.type))}: ${C.PG[o]} ${esc(pN(o))} (${esc(set==='a'?CUR.nb:CUR.na)}) <em>${esc(T('orb',{o:x.orb}))}</em></span><span class="t">${esc(tAsp('syn',x.a,x.type,x.b))}</span></div>`; });
  fillPanel(k,p,bits.join(' · '),tSign(k,p.sign),'',T('pSyn'),list);
}

/* ---------- моя карта ---------- */
let mapTok=0;
async function renderMap(){
  chips($('mapPeople'),mem.mapId,id=>{ mem.mapId=id; save(); renderMap(); },{edit:true});
  const p=person(mem.mapId);
  $('mapEmpty').hidden=!!p; $('mapEmpty').textContent=mem.people.length?T('mapEmpty'):T('noPeople');
  if(!p){ $('wheelMap').setAttribute('hidden',''); $('mapList').innerHTML=''; $('mapSum').textContent=''; if(!mem.people.length)emptyAdd($('mapEmpty')); return; }
  const tok=++mapTok;
  $('mapSum').textContent=T('mapLoading');
  let ch; try{ ch=await C.chartFor(p); }catch(e){ if(tok===mapTok){ $('mapSum').textContent=String(e.message==='natal'?'natal.bundle.js':e.message); } return; }
  if(tok!==mapTok)return;
  const svg=$('wheelMap'), pos=wheel(svg,ch.mode==='full'?ch.asc.lon:0);
  angles(svg,pos,ch);
  const rad=spread(ch.planets,R_PL,32,3);
  drawAsp(svg,pos,ch.planets,ch.planets,ch.aspects,rad,rad);
  drawPl(svg,pos,ch.planets,rad,null,selPlanet);
  CUR={svg,chart:ch}; enter(svg);
  $('mapSum').textContent=ch.mode==='full'?T('sumFull',{asc:sN(ch.asc.sign),mc:sN(ch.mc.sign)}):T('sumLight');
  mapList(ch,p);
}
function emptyAdd(el){
  const b=document.createElement('button'); b.type='button'; b.className='go small'; b.textContent=T('add');
  b.addEventListener('click',()=>openEditor(null,id=>{ if(mode==='map'){ mem.mapId=id; save(); renderMap(); } else renderSyn(); }));
  el.appendChild(document.createElement('br')); el.appendChild(b);
}
function mapList(ch,p){
  const box=$('mapList'); box.innerHTML='';
  const sun=ch.planets.sun, moon=ch.planets.moon, ven=ch.planets.venus, x=TX();
  if(x&&x.ess&&T('ess'))box.insertAdjacentHTML('beforeend',`<div class="synth">${esc(T('ess',{sun:x.ess.sun[sun.sign],moon:x.ess.moon[moon.sign],venus:x.ess.venus[ven.sign]}))}</div>`);
  let lead=T('lead',{sun:sN(sun.sign),moon:sN(moon.sign)}); if(ch.mode==='full')lead+=T('leadAsc',{asc:sN(ch.asc.sign)}); lead+=T('leadEnd');
  box.insertAdjacentHTML('beforeend',`<p class="lead">${esc(lead)}</p>`);
  if(ch.mode!=='full')box.insertAdjacentHTML('beforeend',`<p class="pnote">${esc(T('noteLight'))}${sun.approx?' '+esc(T('cusp')):''}</p>`);
  C.PLANETS.forEach(k=>{
    const q=ch.planets[k];
    let h=`<div class="ph"><span class="pg">${C.PG[k]}</span>${esc(T('pl.'+k))} <span class="tag">${esc(T('inSign',{p:pN(k),s:sN(q.sign)}))}${q.retro?' ℞':''}${q.approx?' ≈':''}</span></div>`;
    h+=`<div class="about">${esc(T('pa.'+k))}</div><p class="tx">${esc(tSign(k,q.sign))}</p>`;
    if(ch.mode==='full'&&q.house)h+=`<p class="sub"><b>${esc(T('h.'+q.house))}.</b> ${esc(tHouse(k,q.house))}</p>`;
    const tight=ch.aspects.filter(a=>a.a===k||a.b===k)[0];
    if(tight){ const o=tight.a===k?tight.b:tight.a; h+=`<p class="sub"><b>${esc(T('linkWith'))}: ${esc(low(T('pl.'+o)))}.</b> ${esc(tAsp('asp',tight.a,tight.type,tight.b))}</p>`; }
    const sec=document.createElement('section'); sec.className='sec'; sec.innerHTML=h;
    sec.querySelector('.pg').addEventListener('click',()=>selPlanet(k));
    box.appendChild(sec);
  });
}

/* ---------- пара ---------- */
function pairTheme(a,b){ const s=new Set([a,b]);
  if(s.has('venus')&&s.has('mars'))return 'passion'; if(s.has('venus'))return 'taste'; if(s.has('moon')&&s.has('saturn'))return 'warmcold';
  if(s.has('moon'))return 'emo'; if(s.has('mercury'))return 'mind'; if(s.has('mars')&&s.has('sun'))return 'energy'; if(s.has('mars'))return 'drive';
  if(s.has('saturn'))return 'serious'; if(s.has('sun'))return 'roles'; return 'common'; }
let synTok=0;
async function renderSyn(){
  if(!person(mem.synA))mem.synA=mem.people[0]?mem.people[0].id:null;
  if(!person(mem.synB)||mem.synB===mem.synA){ const o=mem.people.find(p=>p.id!==mem.synA); mem.synB=o?o.id:null; }
  save();
  chips($('synA'),mem.synA,id=>{ if(id===mem.synB)mem.synB=mem.synA; mem.synA=id; save(); renderSyn(); },{add:false,cls:'a'});
  chips($('synB'),mem.synB,id=>{ if(id===mem.synA)mem.synA=mem.synB; mem.synB=id; save(); renderSyn(); },{cls:'b'});
  const a=person(mem.synA), b=person(mem.synB);
  const ok=a&&b&&a!==b;
  $('synEmpty').hidden=ok; $('synEmpty').textContent=mem.people.length<2?T('synNeed'):T('synSame');
  if(!ok){ $('wheelSyn').setAttribute('hidden',''); $('synList').innerHTML=''; $('synSum').textContent=''; if(mem.people.length<2)emptyAdd($('synEmpty')); return; }
  const tok=++synTok; $('synSum').textContent=T('mapLoading');
  let A,B; try{ A=await C.chartFor(a); B=await C.chartFor(b); }catch(e){ if(tok===synTok)$('synSum').textContent=e.message; return; }
  if(tok!==synTok)return;
  const cross=C.aspects(A.planets,B.planets,false);
  const svg=$('wheelSyn'), pos=wheel(svg,A.mode==='full'?A.asc.lon:0);
  const ra=spread(A.planets,R_PL,26,2), rb=spread(B.planets,R_PL-78,24,2);
  drawAsp(svg,pos,A.planets,B.planets,cross,ra,rb);
  const na=pname(a), nb=pname(b);
  drawPl(svg,pos,A.planets,ra,null,k=>selBi('a',k)); drawPl(svg,pos,B.planets,rb,'b',k=>selBi('b',k));
  CUR={svg,a:A,b:B,cross,na,nb}; enter(svg);
  $('synSum').innerHTML=`<span class="ca">${esc(na)}</span> + <span class="cb">${esc(nb)}</span> · ${cross.length}`;
  const box=$('synList'); box.innerHTML='';
  const soft=cross.filter(x=>x.type==='trine'||x.type==='sextile').length, hard=cross.filter(x=>x.type==='square'||x.type==='opposition').length;
  box.insertAdjacentHTML('beforeend',`<p class="lead">${esc(soft>hard+2?T('synSoft'):hard>soft+2?T('synHard'):T('synMix'))}</p>`);
  box.insertAdjacentHTML('beforeend',`<p class="pnote">${esc(cross.length?T('synFound',{n:cross.length}):T('synNone'))}</p>`);
  [a,b].forEach(p=>{ if(!C.canFull(p))box.insertAdjacentHTML('beforeend',`<p class="pnote">${esc(T('synNoon',{name:pname(p)}))}</p>`); });
  const item=x=>`<section class="sec"><div class="ph"><i class="at ${x.type}">${C.ASP[x.type].g}</i>${esc(T('pt.'+pairTheme(x.a,x.b)))} <span class="tag"><span class="ca">${C.PG[x.a]} ${esc(pN(x.a))}</span> + <span class="cb">${C.PG[x.b]} ${esc(pN(x.b))}</span></span></div><p class="tx">${esc(tAsp('syn',x.a,x.type,x.b))}</p></section>`;
  const FIRST=10;
  box.insertAdjacentHTML('beforeend',cross.slice(0,FIRST).map(item).join(''));
  if(cross.length>FIRST){
    const m=document.createElement('button'); m.type='button'; m.className='more'; m.textContent=T('more',{n:cross.length-FIRST});
    m.addEventListener('click',()=>{ m.insertAdjacentHTML('beforebegin',cross.slice(FIRST).map(item).join('')); m.remove(); });
    box.appendChild(m);
  }
}

/* ---------- редактор человека ---------- */
const CITIES=window.ASTRO_CITIES||[];
const nrm=s=>String(s||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/ё/g,'е').replace(/ł/g,'l').replace(/[-']/g,' ').trim();
const cityName=c=>lang()==='ru'?c[0]:c[1];
function cityFind(q){
  q=nrm(q); if(!q)return [];
  const res=[];
  CITIES.forEach(c=>{
    const names=[c[0],c[1]].concat(c[4]?c[4].split(' '):[]).map(nrm);
    let sc=-1; names.forEach(n=>{ if(n===q)sc=Math.max(sc,3); else if(n.startsWith(q))sc=Math.max(sc,2); else if(n.split(' ').some(w=>w.startsWith(q)))sc=Math.max(sc,1); });
    if(sc>=0)res.push([sc,c]);
  });
  return res.sort((a,b)=>b[0]-a[0]).slice(0,8).map(x=>x[1]);
}
let edId=null, edAfter=null, edCity=null, delArm=false;
function openEditor(id,after){
  edId=id; edAfter=after||null; delArm=false;
  const p=id?person(id):null, d=p?C.parseDate(p.d):null;
  $('edTitle').textContent=p?T('pEdit'):T('pNew');
  $('edName').value=p?p.name:''; $('edName').placeholder=mem.people.length&&(!p||mem.people.indexOf(p)>0)?T('personN',{n:p?mem.people.indexOf(p)+1:mem.people.length+1}):T('meDefault');
  $('edD').value=d?d.d:''; $('edM').value=d?d.m:''; $('edY').value=d?d.y:'';
  $('edT').value=p&&p.t?p.t:''; $('edNoT').checked=!!(p&&!p.t); $('edT').disabled=$('edNoT').checked;
  $('edCity').value=p&&p.city?p.city:''; edCity=p&&p.city&&isFinite(p.lat)&&p.lat!==null?{name:p.city,lat:p.lat,lon:p.lon}:null;
  $('edLat').value=p&&p.lat!==null&&p.lat!==undefined?p.lat:''; $('edLon').value=p&&p.lon!==null&&p.lon!==undefined?p.lon:'';
  $('edMan').open=!!(p&&!p.city&&p.lat!==null&&p.lat!==undefined);
  $('edErr').textContent=''; $('edSug').hidden=true;
  $('edDel').hidden=!p; $('edDel').textContent=T('pDel'); $('edDel').classList.remove('arm');
  edTexts();
  $('editor').hidden=false; document.body.classList.add('modal-on');
  setTimeout(()=>{ (p?$('edD'):$('edName')).focus(); },30);
}
function edTexts(){
  $('tEdName').textContent=T('pName'); $('tEdDate').textContent=T('pDate'); $('edD').placeholder=T('pDay'); $('edM').placeholder=T('pMonth'); $('edY').placeholder=T('pYear');
  $('tEdTime').textContent=T('pTime'); $('tEdNoT').textContent=T('pNoTime'); $('tEdCity').textContent=T('pCity'); $('edCity').placeholder=T('pCityPh');
  $('tEdCoords').textContent=T('pCoords'); $('tEdLat').textContent=T('pLat'); $('tEdLon').textContent=T('pLon'); $('tEdHint').textContent=T('pHint');
  $('edSave').textContent=T('pSave'); if(!delArm)$('edDel').textContent=T('pDel');
}
function closeEditor(){ $('editor').hidden=true; document.body.classList.remove('modal-on'); }
$('edClose').addEventListener('click',closeEditor);
$('editor').addEventListener('click',e=>{ if(e.target===$('editor'))closeEditor(); });
$('edNoT').addEventListener('change',()=>{ $('edT').disabled=$('edNoT').checked; if($('edNoT').checked)$('edT').value=''; });
['edD','edM','edY'].forEach((id,i,arr)=>$(id).addEventListener('input',e=>{ const el=e.target; el.value=el.value.replace(/\D/g,''); if(i<2&&el.value.length===2)$(arr[i+1]).focus(); }));
let sugIdx=-1;
function showSug(){
  const list=cityFind($('edCity').value), ul=$('edSug'); ul.innerHTML=''; sugIdx=-1;
  if(!list.length){ ul.hidden=true; return; }
  list.forEach(c=>{ const li=document.createElement('li'); li.textContent=lang()==='ru'?c[0]+' ('+c[1]+')':c[1]; li.addEventListener('mousedown',e=>{ e.preventDefault(); pickCity(c); }); ul.appendChild(li); });
  ul.hidden=false;
}
function pickCity(c){ edCity={name:cityName(c),lat:c[2],lon:c[3]}; $('edCity').value=edCity.name; $('edLat').value=c[2]; $('edLon').value=c[3]; $('edSug').hidden=true; $('edErr').textContent=''; }
$('edCity').addEventListener('input',()=>{ edCity=null; showSug(); });
$('edCity').addEventListener('focus',showSug);
$('edCity').addEventListener('blur',()=>setTimeout(()=>{ $('edSug').hidden=true; },120));
$('edCity').addEventListener('keydown',e=>{
  const items=[...$('edSug').children]; if($('edSug').hidden||!items.length)return;
  if(e.key==='ArrowDown'||e.key==='ArrowUp'){ e.preventDefault(); sugIdx=(sugIdx+(e.key==='ArrowDown'?1:-1)+items.length)%items.length; items.forEach((li,i)=>li.classList.toggle('on',i===sugIdx)); }
  else if(e.key==='Enter'&&sugIdx>=0){ e.preventDefault(); items[sugIdx].dispatchEvent(new Event('mousedown')); }
});
['edLat','edLon'].forEach(id=>$(id).addEventListener('input',()=>{ edCity=null; }));
const num=s=>{ s=String(s||'').trim().replace(',','.'); if(!s)return null; const v=Number(s); return isFinite(v)?v:NaN; };
$('edForm').addEventListener('submit',e=>{
  e.preventDefault();
  const err=m=>{ $('edErr').textContent=m; };
  const d=+$('edD').value, m=+$('edM').value, y=+$('edY').value;
  const dt=new Date(Date.UTC(y,m-1,d));
  if(!d||!m||!y||y<1900||y>2100||dt.getUTCDate()!==d||dt.getUTCMonth()!==m-1)return err(T('errDate'));
  let t='';
  if(!$('edNoT').checked&&$('edT').value){ if(!/^\d{1,2}:\d{2}/.test($('edT').value))return err(T('errTime')); const [hh,mm]=$('edT').value.split(':').map(Number); if(hh>23||mm>59)return err(T('errTime')); t=String(hh).padStart(2,'0')+':'+String(mm).padStart(2,'0'); }
  let city=$('edCity').value.trim(), lat=num($('edLat').value), lon=num($('edLon').value);
  if(city&&!edCity){ const f=cityFind(city); if(f.length&&nrm(cityName(f[0]))===nrm(city)||f.length===1){ pickCity(f[0]); city=edCity.name; lat=edCity.lat; lon=edCity.lon; } else if(lat===null||lon===null)return err(T('errCity')); }
  if((lat===null)!==(lon===null)||Number.isNaN(lat)||Number.isNaN(lon)||(lat!==null&&(Math.abs(lat)>90||Math.abs(lon)>180))){ $('edMan').open=true; return err(T('errCoords')); }
  const pad=n=>String(n).padStart(2,'0');
  const data={name:$('edName').value.trim().slice(0,24),d:y+'-'+pad(m)+'-'+pad(d),t,city:edCity?edCity.name:(lat!==null?'':city),lat,lon};
  let id=edId;
  if(id){ Object.assign(person(id),data); }
  else { id=Date.now().toString(36)+Math.random().toString(36).slice(2,6); mem.people.push(Object.assign({id},data)); if(!mem.fcWho&&!mem.fcSign)mem.fcWho=id; if(!mem.mapId)mem.mapId=id; if(TR)TR.event('astro.person'); }
  save(); closeEditor();
  if(edAfter)edAfter(id); else refresh();
});
$('edDel').addEventListener('click',()=>{
  if(!delArm){ delArm=true; $('edDel').textContent=T('pDelQ'); $('edDel').classList.add('arm'); return; }
  mem.people=mem.people.filter(p=>p.id!==edId);
  ['fcWho','mapId','synA','synB'].forEach(k=>{ if(mem[k]===edId)mem[k]=null; });
  save(); closeEditor(); refresh();
});
function refresh(){ setMode(mode,true); }

/* ---------- темы ---------- */
const THEMES={
  obs:{img:false},
  tent:{img:true,fonts:['Cormorant+Garamond:wght@500;600;700','Lora:wght@400;600'],char:'seer'},
  atlas:{img:true,fonts:['Cormorant+Garamond:wght@500;600;700','Lora:wght@400;600']},
  nebula:{img:true,fonts:['Manrope:wght@400;600;700']},
  neon:{img:true,fonts:['Russo+One','Manrope:wght@400;600;700']},
  roof:{img:true,fonts:['Nunito:wght@400;700;800'],char:'cat'}
};
const TORDER=['obs','tent','atlas','nebula','neon','roof'];
let THEME='obs';
const loadedFonts={}, imgOk={}, charOk={};
function loadFonts(list){ (list||[]).forEach(f=>{ if(loadedFonts[f])return; loadedFonts[f]=1; const l=document.createElement('link'); l.rel='stylesheet'; l.href='https://fonts.googleapis.com/css2?family='+f+'&display=swap'; document.head.appendChild(l); }); }
const narrow=()=>innerWidth<760&&innerHeight>innerWidth;
function probe(src){ return new Promise(res=>{ const i=new Image(); i.onload=()=>res(true); i.onerror=()=>res(false); i.src=src; }); }
async function applyTheme(name){
  if(!THEMES[name])name='obs';
  THEME=name; const t=THEMES[name];
  const root=document.documentElement; root.dataset.theme=name; root.classList.remove('th-img');
  $('themebg').style.backgroundImage='';
  loadFonts(t.fonts);
  GL.setTheme(name,false);
  document.querySelectorAll('.th-card').forEach(c=>c.classList.toggle('on',c.dataset.t===name));
  setChar(null);
  if(t.img){
    const src='themes/'+name+(narrow()?'-m':'-w')+'.webp';
    if(imgOk[src]===undefined)imgOk[src]=await probe(src);
    if(THEME!==name)return;
    if(imgOk[src]){ $('themebg').style.backgroundImage='url("'+src+'")'; root.classList.add('th-img'); GL.setTheme(name,true); }
  }
  if(t.char){
    const k=t.char; if(charOk[k]===undefined)charOk[k]=await probe('themes/'+k+'-idle.webp');
    if(THEME===name&&charOk[k]){ setChar(k); charSay('hello'); }
  }
}
let bgW=narrow();
addEventListener('resize',()=>{ if(narrow()!==bgW){ bgW=narrow(); applyTheme(THEME); } });

/* персонаж темы: три позы, реплики из lang (seer.*, cat.*) */
let CHAR=null, sayT=0;
function setChar(k){ CHAR=k; $('char').hidden=!k; if(k){ $('char').dataset.c=k; $('charImg').src='themes/'+k+'-idle.webp'; } $('charSay').classList.remove('on'); }
function charSay(key,pose){
  if(!CHAR)return;
  const a=T(CHAR+'.'+key); if(!Array.isArray(a))return;
  $('charSay').textContent=a[Math.floor(Math.random()*a.length)]; $('charSay').classList.add('on');
  $('charImg').src='themes/'+CHAR+'-'+(pose||'speaking')+'.webp';
  clearTimeout(sayT); sayT=setTimeout(()=>{ $('charSay').classList.remove('on'); if(CHAR)$('charImg').src='themes/'+CHAR+'-idle.webp'; },4200);
}
$('charImg').addEventListener('click',()=>charSay('hello','happy'));

function buildThemeGrid(){
  const g=$('thGrid'); g.innerHTML='';
  TORDER.forEach(n=>{
    const b=document.createElement('button'); b.type='button'; b.className='th-card'+(n===THEME?' on':''); b.dataset.t=n;
    b.innerHTML=`<span class="pv pv-${n}"></span><span class="nm"></span>`; b.querySelector('.nm').textContent=T('th.'+n);
    if(THEMES[n].img){ const src='themes/'+n+'-thumb.webp'; probe(src).then(ok=>{ if(ok)b.querySelector('.pv').style.background='url("'+src+'") center/cover no-repeat'; }); }
    b.addEventListener('click',()=>{ mem.theme=n; mem.themeAsked=true; save(); applyTheme(n); if(TR)TR.event('astro.theme'); });
    g.appendChild(b);
  });
}
let clearArm=false;
function openSettings(first){
  buildThemeGrid(); clearArm=false;
  $('setTitle').textContent=first?T('thTitle'):T('setTitle'); $('thNote').textContent=T('thNote');
  $('setData').hidden=!!first; $('tSetData').textContent=T('setData'); $('setClear').textContent=T('setClear'); $('setClear').classList.remove('arm');
  $('settings').hidden=false; document.body.classList.add('modal-on');
}
function closeSettings(){ $('settings').hidden=true; document.body.classList.remove('modal-on'); if(!mem.themeAsked){ mem.themeAsked=true; save(); } }
$('setBtn').addEventListener('click',()=>openSettings(false));
$('setClose').addEventListener('click',closeSettings);
$('settings').addEventListener('click',e=>{ if(e.target===$('settings'))closeSettings(); });
$('setClear').addEventListener('click',()=>{
  if(!clearArm){ clearArm=true; $('setClear').textContent=T('setClearQ'); $('setClear').classList.add('arm'); return; }
  mem.people=[]; mem.fcWho=null; mem.mapId=null; mem.synA=null; mem.synB=null; save();
  $('setClear').textContent=T('setCleared'); $('setClear').classList.remove('arm'); clearArm=false; refresh();
});
addEventListener('keydown',e=>{
  if(e.key!=='Escape')return;
  if(!$('editor').hidden)closeEditor(); else if(!$('settings').hidden)closeSettings(); else closePanel();
});

/* ---------- верхняя строка, язык ---------- */
$('back').addEventListener('click',()=>{ if(PORTAL){ try{ parent.postMessage({aceon:'close'},location.origin); return; }catch(e){} } location.href='../'; });
const langBtn=$('langbtn'), langMenu=$('langmenu');
CODES.forEach(c=>{ const b=document.createElement('button'); b.type='button'; b.dataset.l=c; b.innerHTML='<b>'+c.toUpperCase()+'</b><span></span>'; b.lastChild.textContent=NAMES[c];
  b.addEventListener('click',()=>{ langMenu.classList.remove('on'); setLang(c); }); langMenu.appendChild(b); });
langBtn.addEventListener('click',e=>{ e.stopPropagation(); langMenu.classList.toggle('on'); });
document.addEventListener('click',()=>langMenu.classList.remove('on'));
function setLang(c){
  if(CODES.indexOf(c)<0||c===lang())return;
  if(hasI18n)I18n.set(c); else { fbLang=c; const o=readSite(); o.lang=c; if(!o.v)o.v=1; try{ localStorage.setItem('aceon:site',JSON.stringify(o)); }catch(e){} }
  if(TR)TR.event('lang.change');
  texts(); refresh();
}
function texts(){
  document.documentElement.lang=lang();
  const set=(id,k)=>{ $(id).textContent=T(k); };
  set('back','back'); set('tSub','sub'); langBtn.textContent=lang().toUpperCase(); langBtn.title=T('lang');
  langMenu.querySelectorAll('button').forEach(b=>b.classList.toggle('sel',b.dataset.l===lang()));
  $('setBtn').title=T('set'); $('setBtn').setAttribute('aria-label',T('set'));
  set('tTabFc','tabFc'); set('tTabMap','tabMap'); set('tTabSyn','tabSyn');
  set('tFcWho','fcWho'); set('tFcSign','fcSign'); set('tPeople','people'); set('tPHint','pHint'); set('tSynA','synA'); set('tSynB','synB');
  renderSky(); edTexts();
  if(!$('settings').hidden)openSettings(!mem.themeAsked);
}

/* ---------- старт ---------- */
texts();
applyTheme(mem.theme);
setMode(mode,true);
setInterval(()=>{ renderSky(); },10*60*1000);
if(!mem.themeAsked)setTimeout(()=>openSettings(true),500);
})();
