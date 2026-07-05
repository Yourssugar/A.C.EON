/* ============================================================================
   ASTRO · A.C.EON — орбитальный движок страницы
   astronomy-engine (лайт + виджеты) · circular-natal (натал, лениво) · interpret()
   ============================================================================ */
const A = window.Astronomy;
const META = window.ASTRO_META;
const PLANETS = ['sun','moon','mercury','venus','mars','jupiter','saturn','uranus','neptune','pluto'];
const SIGN_ORDER = ['aries','taurus','gemini','cancer','leo','virgo','libra','scorpio','sagittarius','capricorn','aquarius','pisces'];
const bodyName = k => k.charAt(0).toUpperCase() + k.slice(1);
const $ = s => document.querySelector(s);

/* ── АСТРОНОМИЯ ── */
function eclLon(k, date){ const t=A.MakeTime(date); return A.Ecliptic(A.GeoVector(bodyName(k),t,true)).elon; }
const signFromLon = l => SIGN_ORDER[Math.floor((((l%360)+360)%360)/30)];
const degInSign   = l => ((l%30)+30)%30;
function isRetro(k, date){
  if(k==='sun'||k==='moon') return false;
  const b=eclLon(k,new Date(date.getTime()-6*36e5)), a=eclLon(k,new Date(date.getTime()+6*36e5));
  let d=a-b; if(d>180)d-=360; if(d<-180)d+=360; return d<0;
}

/* ── ЛАЙТ ── */
function lightChart(y,m,d){
  const date=new Date(Date.UTC(y,m-1,d,12));
  const planets={};
  PLANETS.forEach(k=>{ const lon=eclLon(k,date);
    planets[k]={sign:signFromLon(lon),deg:degInSign(lon),lon,retro:isRetro(k,date),approx:(k==='moon')}; });
  const chart={mode:'light',planets};
  chart.aspects=findAspects(planets,planets,true);
  return chart;
}

/* ── НАТАЛ ── */
function fullChart(y,m,d,hh,mm,lat,lon){
  const CNH=window.CNH; if(!CNH) throw new Error('natal.bundle.js ещё не загружен');
  const origin=new CNH.Origin({year:y,month:m-1,date:d,hour:hh,minute:mm,latitude:lat,longitude:lon});
  const h=new CNH.Horoscope({origin,houseSystem:'placidus',zodiac:'tropical',
    aspectPoints:['bodies'],aspectWithPoints:['bodies'],aspectTypes:['major'],language:'en'});
  const planets={};
  PLANETS.forEach(k=>{ const b=h.CelestialBodies[k]; const raw=b.ChartPosition.Ecliptic.DecimalDegrees;
    planets[k]={sign:(b.Sign.key||b.Sign.label).toLowerCase(),deg:degInSign(raw),lon:raw,
      house:b.House?b.House.id:null,retro:!!b.isRetrograde,approx:false}; });
  const chart={mode:'full',planets,
    asc:{sign:(h.Ascendant.Sign.key||h.Ascendant.Sign.label).toLowerCase(),lon:h.Ascendant.ChartPosition.Ecliptic.DecimalDegrees},
    mc:{sign:(h.Midheaven.Sign.key||h.Midheaven.Sign.label).toLowerCase()}};
  chart.aspects=findAspects(planets,planets,true);
  return chart;
}

/* ── АСПЕКТЫ ── */
const ORBS={conjunction:8,opposition:8,trine:8,square:7,sextile:6};
const angularSep=(a,b)=>{let d=Math.abs(a-b)%360;return d>180?360-d:d;};
function findAspects(pa,pb,same){
  const out=[];
  PLANETS.forEach((ka,i)=>PLANETS.forEach((kb,j)=>{
    if(same&&j<=i) return;
    const sep=angularSep(pa[ka].lon,pb[kb].lon);
    for(const t in ORBS){ const orb=Math.abs(sep-META.aspects[t].angle);
      if(orb<=ORBS[t]){ out.push({a:ka,b:kb,type:t,orb:+orb.toFixed(1)}); break; } }
  }));
  return out.sort((x,y)=>x.orb-y.orb);
}

/* ── ВИДЖЕТЫ ── */
function moonNow(date=new Date()){
  const phase=A.MoonPhase(date), illum=A.Illumination('Moon',A.MakeTime(date)).phase_fraction;
  const names=['Новолуние','Растущий серп','Первая четверть','Растущая луна','Полнолуние','Убывающая луна','Последняя четверть','Убывающий серп'];
  return {name:names[Math.floor(((phase+22.5)%360)/45)],illum:Math.round(illum*100)};
}

/* ============================================================================
   РЕНДЕР ОРБИТАЛЬНОГО КОЛЕСА
   ============================================================================ */
const NS='http://www.w3.org/2000/svg';
const CX=400,CY=400,R_ZOD=350,R_TICK=316,R_PLANET=250,R_CORE=54;
const pos=(lon,r)=>{const a=(lon-90)*Math.PI/180;return[CX+r*Math.cos(a),CY+r*Math.sin(a)];};
const mk=(t,at)=>{const e=document.createElementNS(NS,t);for(const k in at)e.setAttribute(k,at[k]);return e;};

// развод слипшихся планет по радиусу
function spread(planets,keys,baseR,step,maxLvl){
  const rad={}, sorted=[...keys].sort((a,b)=>planets[a].lon-planets[b].lon);
  let lvl=0;
  sorted.forEach((k,i)=>{
    if(i>0){ const d=planets[k].lon-planets[sorted[i-1]].lon; lvl=d<8?Math.min(lvl+1,maxLvl):0; }
    rad[k]=baseR-lvl*step;
  });
  return rad;
}

function baseSvg(){
  const svg=$('#chart'); svg.innerHTML='';
  const defs=mk('defs',{});
  defs.innerHTML='<radialGradient id="coreGrad"><stop offset="0%" stop-color="#c9a24b" stop-opacity=".9"/><stop offset="55%" stop-color="#8a6d2a" stop-opacity=".25"/><stop offset="100%" stop-color="#8a6d2a" stop-opacity="0"/></radialGradient>';
  svg.appendChild(defs);
  svg.appendChild(mk('circle',{class:'ring',cx:CX,cy:CY,r:R_ZOD}));
  svg.appendChild(mk('circle',{class:'ring-mid',cx:CX,cy:CY,r:R_TICK}));
  for(let i=0;i<12;i++){
    const[x1,y1]=pos(i*30,R_TICK),[x2,y2]=pos(i*30,R_ZOD);
    svg.appendChild(mk('line',{class:'tick',x1,y1,x2,y2}));
    const[gx,gy]=pos(i*30+15,R_ZOD-17);
    const g=mk('text',{class:'zglyph',x:gx,y:gy}); g.textContent=META.signs[SIGN_ORDER[i]].glyph; svg.appendChild(g);
  }
  svg.appendChild(mk('circle',{class:'core-ring',cx:CX,cy:CY,r:R_CORE+14}));
  svg.appendChild(mk('circle',{class:'core',cx:CX,cy:CY,r:R_CORE}));
  return svg;
}

function drawAspects(svg,pa,pb,list,radA,radB){
  const g=mk('g',{}); svg.appendChild(g);
  list.forEach(as=>{
    const[x1,y1]=pos(pa[as.a].lon,(radA[as.a]||R_PLANET)-0);
    const[x2,y2]=pos(pb[as.b].lon,(radB[as.b]||R_PLANET)-0);
    const l=mk('line',{class:'asp '+as.type,x1,y1,x2,y2});
    l.dataset.a=as.a; l.dataset.b=as.b; g.appendChild(l);
  });
  return g;
}

function drawPlanets(svg,planets,rad,cls){
  const nodes={};
  PLANETS.forEach(k=>{
    const r=rad[k], [x,y]=pos(planets[k].lon,r);
    const[sx,sy]=pos(planets[k].lon,R_TICK), [bx,by]=pos(planets[k].lon,r+16);
    svg.appendChild(mk('line',{class:'spoke',x1:bx,y1:by,x2:sx,y2:sy}));
    const g=mk('g',{class:'pnode'+(cls?' '+cls:'')}); g.dataset.k=k; g.dataset.set=cls||'a';
    g.appendChild(mk('circle',{class:'halo',cx:x,cy:y,r:26}));
    g.appendChild(mk('circle',{class:'dot',cx:x,cy:y,r:18}));
    const t=mk('text',{x,y}); t.textContent=META.planets[k].glyph; g.appendChild(t);
    if(planets[k].retro){const[rx,ry]=pos(planets[k].lon,r+22);g.appendChild(mk('circle',{class:'retro-dot',cx:rx,cy:ry,r:3}));}
    svg.appendChild(g); nodes[k]=g;
  });
  return nodes;
}

let CUR=null;                 // {chart, nodes, aspLayer}
function renderChart(chart){
  const svg=baseSvg();
  const rad=spread(chart.planets,PLANETS,R_PLANET,32,3);
  const aspLayer=drawAspects(svg,chart.planets,chart.planets,chart.aspects,rad,rad);
  const nodes=drawPlanets(svg,chart.planets,rad,null);
  // асцендент (натал)
  if(chart.mode==='full'&&chart.asc){
    const[x1,y1]=pos(chart.asc.lon,R_TICK),[x2,y2]=pos(chart.asc.lon,R_ZOD+14);
    svg.appendChild(mk('line',{class:'asc-mark',x1,y1,x2,y2}));
    const[lx,ly]=pos(chart.asc.lon,R_ZOD+28);
    const t=mk('text',{class:'asc-label',x:lx,y:ly}); t.textContent='ASC'; svg.appendChild(t);
  }
  Object.entries(nodes).forEach(([k,g])=>g.onclick=()=>selectPlanet(k));
  CUR={chart,nodes,aspLayer,mode:'single'};
  $('#hint').style.display='none';
}

function renderBiWheel(chA,chB,cross){
  const svg=baseSvg();
  const radA=spread(chA.planets,PLANETS,R_PLANET,26,2);
  const radB=spread(chB.planets,PLANETS,R_PLANET-70,24,2);
  const aspLayer=drawAspects(svg,chA.planets,chB.planets,cross,radA,radB);
  const nodesA=drawPlanets(svg,chA.planets,radA,null);
  const nodesB=drawPlanets(svg,chB.planets,radB,'b');
  CUR={chA,chB,cross,nodesA,nodesB,aspLayer,mode:'bi'};
  $('#hint').style.display='none';
}

/* ============================================================================
   ПАНЕЛЬ ПРОЧТЕНИЯ
   ============================================================================ */
const el=(tag,cls,html)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(html!=null)e.innerHTML=html;return e;};

function selectPlanet(k){
  const chart=CUR.chart, p=chart.planets[k], pm=META.planets[k], sm=META.signs[p.sign];
  // подсветка
  Object.entries(CUR.nodes).forEach(([kk,g])=>{g.classList.toggle('dim',kk!==k);g.classList.toggle('sel',kk===k);});
  CUR.aspLayer.querySelectorAll('.asp').forEach(l=>{
    const hot=l.dataset.a===k||l.dataset.b===k; l.classList.toggle('hot',hot); l.classList.toggle('dim',!hot);});
  // текст
  $('#p-glyph').textContent=pm.glyph;
  $('#p-title').textContent=`${pm.ru} в знаке ${sm.ru}`;
  $('#p-sub').textContent=`${sm.glyph} ${Math.floor(p.deg)}° · ${pm.sphere}${p.house?` · ${p.house} дом`:''}${p.retro?' · ретроград ℞':''}${p.approx?' · знак ≈':''}`;
  $('#p-body').textContent=interpret('planetInSign',{planet:k,sign:p.sign});
  $('#p-house').innerHTML = (chart.mode==='full'&&p.house)
    ? '<b>В '+p.house+' доме:</b> '+interpret('planetInHouse',{planet:k,house:p.house}) : '';
  // аспекты этой планеты
  const mine=chart.aspects.filter(x=>x.a===k||x.b===k);
  const box=$('#p-aspects'); box.innerHTML='';
  $('#p-asp-title').style.display = mine.length?'block':'none';
  mine.forEach(x=>{const other=x.a===k?x.b:x.a; const am=META.aspects[x.type];
    box.appendChild(el('div','asp-item',
      `<span class="h">${am.glyph} ${am.ru} с ${META.planets[other].ru} <em style="color:var(--muted)">(орб ${x.orb}°)</em></span>`+
      `<span class="t">${interpret('aspect',{a:x.a,type:x.type,b:x.b})}</span>`));
  });
  $('#panel').classList.add('open');
}

function selectBiPlanet(set,k){
  const src=set==='a'?CUR.chA:CUR.chB, p=src.planets[k], pm=META.planets[k], sm=META.signs[p.sign];
  Object.entries(CUR.nodesA).forEach(([kk,g])=>{g.classList.toggle('dim',!(set==='a'&&kk===k));g.classList.toggle('sel',set==='a'&&kk===k);});
  Object.entries(CUR.nodesB).forEach(([kk,g])=>{g.classList.toggle('dim',!(set==='b'&&kk===k));g.classList.toggle('sel',set==='b'&&kk===k);});
  CUR.aspLayer.querySelectorAll('.asp').forEach(l=>{
    const hot=(set==='a'&&l.dataset.a===k)||(set==='b'&&l.dataset.b===k);
    l.classList.toggle('hot',hot);l.classList.toggle('dim',!hot);});
  $('#p-glyph').textContent=pm.glyph;
  $('#p-title').textContent=`${pm.ru} в знаке ${sm.ru}`;
  $('#p-sub').textContent=`Карта ${set==='a'?'1':'2'} · ${sm.glyph} ${Math.floor(p.deg)}°${p.house?` · ${p.house} дом`:''}${p.retro?' · ℞':''}`;
  $('#p-body').textContent=interpret('planetInSign',{planet:k,sign:p.sign});
  $('#p-house').innerHTML='';
  // связи этой планеты с картой партнёра
  const mine=CUR.cross.filter(x=>(set==='a'&&x.a===k)||(set==='b'&&x.b===k));
  const box=$('#p-aspects'); box.innerHTML=''; $('#p-asp-title').style.display=mine.length?'block':'none';
  $('#p-asp-title').textContent='Связи с картой партнёра';
  mine.forEach(x=>{const other=set==='a'?x.b:x.a; const am=META.aspects[x.type];
    box.appendChild(el('div','asp-item',
      `<span class="h">${am.glyph} ${am.ru} → ${META.planets[other].ru} <em style="color:var(--muted)">(${x.orb}°)</em></span>`+
      `<span class="t">${interpret('synastry',{a:x.a,type:x.type,b:x.b})}</span>`));});
  $('#panel').classList.add('open');
}

function closePanel(){
  $('#panel').classList.remove('open');
  if(!CUR) return;
  const clear=g=>g.classList.remove('dim','sel');
  if(CUR.nodes) Object.values(CUR.nodes).forEach(clear);
  if(CUR.nodesA) Object.values(CUR.nodesA).forEach(clear);
  if(CUR.nodesB) Object.values(CUR.nodesB).forEach(clear);
  if(CUR.aspLayer) CUR.aspLayer.querySelectorAll('.asp').forEach(l=>l.classList.remove('hot','dim'));
}
window.closePanel=closePanel;

/* ============================================================================
   РЕЖИМЫ / СБОРКА
   ============================================================================ */
const STORE='aceon_astro_v2';
const save=s=>{try{localStorage.setItem(STORE,JSON.stringify(s));}catch(e){}};
const load=()=>{try{return JSON.parse(localStorage.getItem(STORE))||{};}catch(e){return{};}};

let _cnh=null;
function ensureNatal(){
  if(window.CNH) return Promise.resolve();
  return _cnh||(_cnh=new Promise((res,rej)=>{const s=document.createElement('script');
    s.src='natal.bundle.js';s.onload=res;s.onerror=()=>rej(new Error('не удалось загрузить natal.bundle.js'));
    document.head.appendChild(s);}));
}

function buildLight(){
  const y=+$('#l-year').value,m=+$('#l-month').value,d=+$('#l-day').value;
  if(!y||!m||!d){alert('Заполни дату');return;}
  renderChart(lightChart(y,m,d));
  $('#summary').textContent='Лайт · только знаки (домов и асцендента нет)';
  save({tab:'light',light:{y,m,d}});
}

async function buildFull(){
  const g=id=>+$(id).value, y=g('#f-year'),m=g('#f-month'),d=g('#f-day'),hh=g('#f-hour'),mm=g('#f-min');
  const lat=parseFloat($('#f-lat').value),lon=parseFloat($('#f-lon').value);
  if(!y||!m||!d||isNaN(lat)||isNaN(lon)){alert('Заполни дату, время и координаты');return;}
  const btn=$('#f-build');btn.disabled=true;btn.textContent='Загружаю движок…';
  try{ await ensureNatal();
    const chart=fullChart(y,m,d,hh,mm,lat,lon); renderChart(chart);
    $('#summary').textContent=`Натал · Асц ${META.signs[chart.asc.sign].ru} · MC ${META.signs[chart.mc.sign].ru} · дома Placidus`;
    save({tab:'full',full:{y,m,d,hh,mm,lat,lon}});
  }catch(e){alert('Ошибка: '+e.message);}
  finally{btn.disabled=false;btn.textContent='Построить карту';}
}

async function buildSyn(){
  const g=id=>+$(id).value, rd=p=>({y:g(p+'-year'),m:g(p+'-month'),d:g(p+'-day'),hh:g(p+'-hour'),mm:g(p+'-min'),
    lat:parseFloat($(p+'-lat').value),lon:parseFloat($(p+'-lon').value)});
  const a=rd('#s1'),b=rd('#s2');
  for(const o of[a,b]) if(!o.y||!o.m||!o.d||isNaN(o.lat)||isNaN(o.lon)){alert('Заполни обе карты полностью');return;}
  const btn=$('#s-build');btn.disabled=true;btn.textContent='Считаю…';
  try{ await ensureNatal();
    const chA=fullChart(a.y,a.m,a.d,a.hh,a.mm,a.lat,a.lon), chB=fullChart(b.y,b.m,b.d,b.hh,b.mm,b.lat,b.lon);
    const cross=findAspects(chA.planets,chB.planets,false);
    renderBiWheel(chA,chB,cross);
    Object.entries(CUR.nodesA).forEach(([k,gg])=>gg.onclick=()=>selectBiPlanet('a',k));
    Object.entries(CUR.nodesB).forEach(([k,gg])=>gg.onclick=()=>selectBiPlanet('b',k));
    $('#summary').innerHTML=`Синастрия · <span style="color:var(--gold)">карта 1</span> и <span style="color:var(--blue)">карта 2</span> · связей: ${cross.length}`;
    save({tab:'syn',syn:{a,b}});
  }catch(e){alert('Ошибка: '+e.message);}
  finally{btn.disabled=false;btn.textContent='Сравнить';}
}

/* ── UI ── */
function initWidgets(){
  const m=moonNow(); $('#w-moon').innerHTML=`☽ Луна: ${m.name} · ${m.illum}%`;
  const retro=isRetro('mercury',new Date());
  $('#w-mercury').innerHTML=retro?'☿ Меркурий ретроградный ℞':'☿ Меркурий директный';
  $('#w-mercury').classList.toggle('retro-on',retro);
}
function showTab(name){
  document.querySelectorAll('.tab').forEach(t=>t.classList.toggle('active',t.dataset.tab===name));
  ['light','full','syn'].forEach(n=>$('#form-'+n).classList.toggle('hidden',n!==name));
}
function initTabs(){ document.querySelectorAll('.tab').forEach(t=>t.onclick=()=>showTab(t.dataset.tab)); }
function restore(){
  const s=load();
  if(s.light){$('#l-year').value=s.light.y;$('#l-month').value=s.light.m;$('#l-day').value=s.light.d;}
  if(s.full){const f=s.full;['year','month','day','hour','min'].forEach((k,i)=>$('#f-'+k).value=[f.y,f.m,f.d,f.hh,f.mm][i]);$('#f-lat').value=f.lat;$('#f-lon').value=f.lon;}
  if(s.tab) showTab(s.tab);
}

/* ── частицы (заглушка под твой вихрь) ── */
function particles(){
  const cv=$('#stars'),cx=cv.getContext('2d');let W,H,dots;
  const resize=()=>{W=cv.width=innerWidth;H=cv.height=innerHeight;
    dots=Array.from({length:80},()=>({x:Math.random()*W,y:Math.random()*H,r:Math.random()*1.3+.2,s:Math.random()*.14+.02,a:Math.random()*.5+.2}));};
  resize();addEventListener('resize',resize);
  (function loop(){cx.clearRect(0,0,W,H);
    dots.forEach(d=>{d.y-=d.s;if(d.y<0){d.y=H;d.x=Math.random()*W;}
      cx.beginPath();cx.arc(d.x,d.y,d.r,0,7);cx.fillStyle=`rgba(201,162,75,${d.a})`;cx.fill();});
    requestAnimationFrame(loop);})();
}

window.addEventListener('DOMContentLoaded',()=>{
  if(!window.Astronomy){alert('Движок astronomy не загрузился. Проверь, что astronomy.browser.min.js лежит рядом с index.html.');return;}
  initTabs(); initWidgets(); particles(); restore();
  $('#l-build').onclick=buildLight; $('#f-build').onclick=buildFull; $('#s-build').onclick=buildSyn;
  document.querySelectorAll('.city-preset').forEach(sel=>sel.onchange=e=>{
    const[lat,lon]=e.target.value.split(','); const pre=e.target.dataset.target;
    if(lat){$(pre+'-lat').value=lat;$(pre+'-lon').value=lon;}});
});
