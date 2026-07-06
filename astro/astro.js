/* ============================================================================
   ASTRO · A.C.EON
   astronomy-engine (лайт+прогноз+виджеты) · circular-natal (натал, лениво)
   interpret() — тексты натала · dailyForecast() — прогноз на сегодня
   ============================================================================ */
const A = window.Astronomy;
const META = window.ASTRO_META;
const PLANETS = ['sun','moon','mercury','venus','mars','jupiter','saturn','uranus','neptune','pluto'];
const SIGN_ORDER = ['aries','taurus','gemini','cancer','leo','virgo','libra','scorpio','sagittarius','capricorn','aquarius','pisces'];
const bodyName = k => k.charAt(0).toUpperCase() + k.slice(1);
const $ = s => document.querySelector(s);
const el = (t,c,h)=>{const e=document.createElement(t);if(c)e.className=c;if(h!=null)e.innerHTML=h;return e;};

/* ── ГОРОДА (офлайн, ~65) ── */
const CITIES = {
  'Минск':'53.9006,27.5590','Гомель':'52.4345,30.9754','Витебск':'55.1904,30.2049','Могилёв':'53.9007,30.3313','Гродно':'53.6694,23.8131','Брест':'52.0975,23.7341',
  'Москва':'55.7558,37.6173','Санкт-Петербург':'59.9311,30.3609','Новосибирск':'55.0084,82.9357','Екатеринбург':'56.8389,60.6057','Казань':'55.7963,49.1088','Нижний Новгород':'56.2965,43.9361','Челябинск':'55.1644,61.4368','Самара':'53.1959,50.1002','Ростов-на-Дону':'47.2357,39.7015','Уфа':'54.7388,55.9721','Красноярск':'56.0153,92.8932','Воронеж':'51.6720,39.1843','Волгоград':'48.7080,44.5133','Краснодар':'45.0355,38.9753','Сочи':'43.5855,39.7231','Владивосток':'43.1155,131.8855','Калининград':'54.7104,20.4522',
  'Киев':'50.4501,30.5234','Харьков':'49.9935,36.2304','Одесса':'46.4825,30.7233','Днепр':'48.4647,35.0462','Львов':'49.8397,24.0297',
  'Алматы':'43.2220,76.8512','Астана':'51.1694,71.4491','Ташкент':'41.2995,69.2401','Бишкек':'42.8746,74.5698','Тбилиси':'41.7151,44.8271','Ереван':'40.1792,44.4991','Баку':'40.4093,49.8671',
  'Лондон':'51.5074,-0.1278','Париж':'48.8566,2.3522','Берлин':'52.5200,13.4050','Мадрид':'40.4168,-3.7038','Рим':'41.9028,12.4964','Амстердам':'52.3676,4.9041','Прага':'50.0755,14.4378','Варшава':'52.2297,21.0122','Вена':'48.2082,16.3738','Стамбул':'41.0082,28.9784','Дубай':'25.2048,55.2708','Тель-Авив':'32.0853,34.7818','Каир':'30.0444,31.2357',
  'Нью-Йорк':'40.7128,-74.0060','Лос-Анджелес':'34.0522,-118.2437','Чикаго':'41.8781,-87.6298','Торонто':'43.6532,-79.3832','Мехико':'19.4326,-99.1332','Рио-де-Жанейро':'-22.9068,-43.1729',
  'Токио':'35.6762,139.6503','Пекин':'39.9042,116.4074','Шанхай':'31.2304,121.4737','Сеул':'37.5665,126.9780','Бангкок':'13.7563,100.5018','Сингапур':'1.3521,103.8198','Мумбаи':'19.0760,72.8777','Сидней':'-33.8688,151.2093'
};

/* ── АСТРОНОМИЯ ── */
function eclLon(k,date){ const t=A.MakeTime(date); return A.Ecliptic(A.GeoVector(bodyName(k),t,true)).elon; }
const signFromLon = l => SIGN_ORDER[Math.floor((((l%360)+360)%360)/30)];
const degInSign   = l => ((l%30)+30)%30;
function isRetro(k,date){ if(k==='sun'||k==='moon')return false;
  const b=eclLon(k,new Date(date.getTime()-6*36e5)), a=eclLon(k,new Date(date.getTime()+6*36e5));
  let d=a-b; if(d>180)d-=360; if(d<-180)d+=360; return d<0; }
function moonNow(date=new Date()){
  const phase=A.MoonPhase(date), illum=A.Illumination('Moon',A.MakeTime(date)).phase_fraction;
  const names=['Новолуние','Растущий серп','Первая четверть','Растущая луна','Полнолуние','Убывающая луна','Последняя четверть','Убывающий серп'];
  return {name:names[Math.floor(((phase+22.5)%360)/45)],illum:Math.round(illum*100)};
}
function skyAt(date){ const m=moonNow(date);
  return { moonSign:signFromLon(eclLon('moon',date)), moonPhaseName:m.name, moonIllum:m.illum, mercuryRetro:isRetro('mercury',date) }; }
const skyNow=()=>skyAt(new Date());
// реальные события ближайших 7 дней (для недельного прогноза)
function weekHighlights(start){
  const bits=[]; let retro=false, phaseEvent='';
  for(let i=0;i<7;i++){ const day=new Date(start.getTime()+i*864e5);
    if(isRetro('mercury',day)) retro=true;
    const ph=A.MoonPhase(day);
    if(Math.min(ph,360-ph)<7 && !phaseEvent.includes('Новолуние')) phaseEvent='Новолуние на неделе';
    if(Math.abs(ph-180)<7 && !phaseEvent.includes('Полнолуние')) phaseEvent='Полнолуние на неделе';
  }
  if(phaseEvent) bits.push(phaseEvent);
  if(retro) bits.push('Меркурий ретроградный — осторожнее со связью и техникой');
  return bits.length?bits.join(' · '):'Спокойная неделя без резких астрособытий';
}

/* ── ЧАРТЫ ── */
function lightChart(y,m,d){
  const date=new Date(Date.UTC(y,m-1,d,12)), planets={};
  PLANETS.forEach(k=>{const lon=eclLon(k,date);planets[k]={sign:signFromLon(lon),deg:degInSign(lon),lon,retro:isRetro(k,date),approx:(k==='moon')};});
  const chart={mode:'light',planets}; chart.aspects=findAspects(planets,planets,true); return chart;
}
function fullChart(y,m,d,hh,mm,lat,lon){
  const CNH=window.CNH; if(!CNH) throw new Error('natal.bundle.js ещё не загружен');
  const origin=new CNH.Origin({year:y,month:m-1,date:d,hour:hh,minute:mm,latitude:lat,longitude:lon});
  const h=new CNH.Horoscope({origin,houseSystem:'placidus',zodiac:'tropical',aspectPoints:['bodies'],aspectWithPoints:['bodies'],aspectTypes:['major'],language:'en'});
  const planets={};
  PLANETS.forEach(k=>{const b=h.CelestialBodies[k];const raw=b.ChartPosition.Ecliptic.DecimalDegrees;
    planets[k]={sign:(b.Sign.key||b.Sign.label).toLowerCase(),deg:degInSign(raw),lon:raw,house:b.House?b.House.id:null,retro:!!b.isRetrograde,approx:false};});
  const chart={mode:'full',planets,
    asc:{sign:(h.Ascendant.Sign.key||h.Ascendant.Sign.label).toLowerCase(),lon:h.Ascendant.ChartPosition.Ecliptic.DecimalDegrees},
    mc:{sign:(h.Midheaven.Sign.key||h.Midheaven.Sign.label).toLowerCase()}};
  chart.aspects=findAspects(planets,planets,true); return chart;
}
const ORBS={conjunction:8,opposition:8,trine:8,square:7,sextile:6};
const angularSep=(a,b)=>{let d=Math.abs(a-b)%360;return d>180?360-d:d;};
function findAspects(pa,pb,same){ const out=[];
  PLANETS.forEach((ka,i)=>PLANETS.forEach((kb,j)=>{ if(same&&j<=i)return;
    const sep=angularSep(pa[ka].lon,pb[kb].lon);
    for(const t in ORBS){const orb=Math.abs(sep-META.aspects[t].angle); if(orb<=ORBS[t]){out.push({a:ka,b:kb,type:t,orb:+orb.toFixed(1)});break;}}}));
  return out.sort((x,y)=>x.orb-y.orb);
}

/* ============================================================================
   ПРОГНОЗ НА СЕГОДНЯ (вкладка «Сегодня»)
   ============================================================================ */
let curPeriod='today';
function buildToday(period){
  if(period) curPeriod=period;
  document.querySelectorAll('.period-btn').forEach(b=>b.classList.toggle('active',b.dataset.period===curPeriod));
  const y=+$('#t-year').value, m=+$('#t-month').value, d=+$('#t-day').value;
  if(!m||!d){alert('Введи хотя бы день и месяц рождения');return;}
  const sunSign=signFromLon(eclLon('sun',new Date(Date.UTC(y||2000,m-1,d,12))));
  const now=new Date();
  let seedDate, sky;
  if(curPeriod==='tomorrow'){ const t=new Date(now.getTime()+864e5); seedDate=t; sky=skyAt(t); }
  else if(curPeriod==='week'){ seedDate=now; sky=skyAt(new Date(now.getTime()+3*864e5)); sky.highlights=weekHighlights(now); }
  else { seedDate=now; sky=skyNow(); }
  renderForecast(dailyForecast(sunSign, sky, seedDate, curPeriod));
  save({tab:'today',today:{y,m,d}});
}
function renderForecast(c){
  $('#chart').classList.add('hidden'); $('#full-list').classList.add('hidden'); $('#hint').style.display='none';
  const card=$('#forecast-card'); card.classList.remove('hidden');
  $('#fc-title').textContent=c.title;
  $('#fc-intro').textContent=c.intro;
  const box=$('#fc-blocks'); box.innerHTML='';
  c.blocks.forEach(b=>box.appendChild(el('div','fc-block',
    `<span class="fc-ic">${b.icon}</span><div><b>${b.label}</b><p>${b.text}</p></div>`)));
  $('#fc-extras').innerHTML=
    `<span>☽ ${c.extras.moon}</span><span>☿ Меркурий ${c.extras.mercury}</span>`+
    `<span>💞 День с ${c.extras.compat}</span><span>🔢 Число: ${c.extras.luckyNumber}</span>`+
    `<span>🎨 Цвет: ${c.extras.luckyColor}</span>`;
  $('#summary').textContent='Прогноз меняется каждый день — небо на сегодня.';
}

/* ============================================================================
   КОЛЕСО (вкладки «Кто я» / «Мы двое»)
   ============================================================================ */
const NS='http://www.w3.org/2000/svg';
const CX=400,CY=400,R_ZOD=350,R_TICK=316,R_PLANET=250,R_CORE=54;
const pos=(lon,r)=>{const a=(lon-90)*Math.PI/180;return[CX+r*Math.cos(a),CY+r*Math.sin(a)];};
const mk=(t,at)=>{const e=document.createElementNS(NS,t);for(const k in at)e.setAttribute(k,at[k]);return e;};
function spread(planets,keys,baseR,step,maxLvl){
  const rad={},sorted=[...keys].sort((a,b)=>planets[a].lon-planets[b].lon);let lvl=0;
  sorted.forEach((k,i)=>{if(i>0){const dd=planets[k].lon-planets[sorted[i-1]].lon;lvl=dd<8?Math.min(lvl+1,maxLvl):0;}rad[k]=baseR-lvl*step;});
  return rad;
}
function baseSvg(){
  const svg=$('#chart'); svg.classList.remove('hidden'); $('#forecast-card').classList.add('hidden'); $('#hint').style.display='none';
  svg.innerHTML='';
  const defs=mk('defs',{});
  defs.innerHTML='<radialGradient id="coreGrad"><stop offset="0%" stop-color="#c9a24b" stop-opacity=".9"/><stop offset="55%" stop-color="#8a6d2a" stop-opacity=".25"/><stop offset="100%" stop-color="#8a6d2a" stop-opacity="0"/></radialGradient>';
  svg.appendChild(defs);
  svg.appendChild(mk('circle',{class:'ring',cx:CX,cy:CY,r:R_ZOD}));
  svg.appendChild(mk('circle',{class:'ring-mid',cx:CX,cy:CY,r:R_TICK}));
  for(let i=0;i<12;i++){ const[x1,y1]=pos(i*30,R_TICK),[x2,y2]=pos(i*30,R_ZOD);
    svg.appendChild(mk('line',{class:'tick',x1,y1,x2,y2}));
    const[gx,gy]=pos(i*30+15,R_ZOD-17); const g=mk('text',{class:'zglyph',x:gx,y:gy}); g.textContent=META.signs[SIGN_ORDER[i]].glyph; svg.appendChild(g); }
  svg.appendChild(mk('circle',{class:'core-ring',cx:CX,cy:CY,r:R_CORE+14}));
  svg.appendChild(mk('circle',{class:'core',cx:CX,cy:CY,r:R_CORE}));
  return svg;
}
function drawAspects(svg,pa,pb,list,radA,radB){ const g=mk('g',{});svg.appendChild(g);
  list.forEach(as=>{const[x1,y1]=pos(pa[as.a].lon,radA[as.a]||R_PLANET),[x2,y2]=pos(pb[as.b].lon,radB[as.b]||R_PLANET);
    const l=mk('line',{class:'asp '+as.type,x1,y1,x2,y2});l.dataset.a=as.a;l.dataset.b=as.b;g.appendChild(l);});
  return g;
}
function drawPlanets(svg,planets,rad,cls){ const nodes={};
  PLANETS.forEach(k=>{ const r=rad[k],[x,y]=pos(planets[k].lon,r);
    const[sx,sy]=pos(planets[k].lon,R_TICK),[bx,by]=pos(planets[k].lon,r+16);
    svg.appendChild(mk('line',{class:'spoke',x1:bx,y1:by,x2:sx,y2:sy}));
    const g=mk('g',{class:'pnode'+(cls?' '+cls:'')});g.dataset.k=k;
    g.appendChild(mk('circle',{class:'halo',cx:x,cy:y,r:26}));
    g.appendChild(mk('circle',{class:'dot',cx:x,cy:y,r:18}));
    const t=mk('text',{x,y});t.textContent=META.planets[k].glyph;g.appendChild(t);
    if(planets[k].retro){const[rx,ry]=pos(planets[k].lon,r+22);g.appendChild(mk('circle',{class:'retro-dot',cx:rx,cy:ry,r:3}));}
    svg.appendChild(g);nodes[k]=g; });
  return nodes;
}
let CUR=null;
function renderChart(chart){
  const svg=baseSvg(), rad=spread(chart.planets,PLANETS,R_PLANET,32,3);
  const aspLayer=drawAspects(svg,chart.planets,chart.planets,chart.aspects,rad,rad);
  const nodes=drawPlanets(svg,chart.planets,rad,null);
  if(chart.mode==='full'&&chart.asc){
    const[x1,y1]=pos(chart.asc.lon,R_TICK),[x2,y2]=pos(chart.asc.lon,R_ZOD+14);
    svg.appendChild(mk('line',{class:'asc-mark',x1,y1,x2,y2}));
    const[lx,ly]=pos(chart.asc.lon,R_ZOD+28);const t=mk('text',{class:'asc-label',x:lx,y:ly});t.textContent='ASC';svg.appendChild(t);
  }
  Object.entries(nodes).forEach(([k,g])=>g.onclick=()=>selectPlanet(k));
  CUR={chart,nodes,aspLayer,mode:'single'};
  renderNatalList(chart);
}
function renderBiWheel(chA,chB,cross){
  const svg=baseSvg();
  const radA=spread(chA.planets,PLANETS,R_PLANET,26,2), radB=spread(chB.planets,PLANETS,R_PLANET-70,24,2);
  const aspLayer=drawAspects(svg,chA.planets,chB.planets,cross,radA,radB);
  const nodesA=drawPlanets(svg,chA.planets,radA,null), nodesB=drawPlanets(svg,chB.planets,radB,'b');
  CUR={chA,chB,cross,nodesA,nodesB,aspLayer,mode:'bi'};
  renderSynList(chA,chB,cross);
}

/* ── ПОРТРЕТ по темам жизни (выводим сразу, без клика, по-человечески) ── */
function renderNatalList(chart){
  const box=$('#full-list'); box.classList.remove('hidden'); box.innerHTML='';
  const sun=chart.planets.sun, moon=chart.planets.moon, venus=chart.planets.venus;
  // сводный абзац «если коротко о тебе» (Солнце+Луна+Венера в один текст)
  const E=window.ESSENCE;
  box.appendChild(el('div','pf-synth',
    `Если коротко — ты ${E.sun[sun.sign]}. Внутри тебе ${E.moon[moon.sign]}, а в отношениях ${E.venus[venus.sign]}.`));
  // дружеский вводный абзац
  let lead=`Ты — ${META.signs[sun.sign].ru} по солнцу, Луна в знаке ${META.signs[moon.sign].ru}`;
  if(chart.mode==='full'&&chart.asc) lead+=`, восходящий знак ${META.signs[chart.asc.sign].ru}`;
  lead+='. Ниже — по каждой стороне жизни подробнее.';
  box.appendChild(el('p','pf-lead',lead));
  if(chart.mode!=='full') box.appendChild(el('p','pf-note','Добавь время и город рождения — портрет станет точнее (появятся дома и восходящий знак).'));

  PLANETS.forEach(k=>{
    const p=chart.planets[k], pm=META.planets[k], sm=META.signs[p.sign];
    let html=`<div class="pf-head">${pm.glyph} ${pm.life} <span class="pf-tag">${pm.ru} в знаке ${sm.ru}${p.retro?', ℞':''}${p.approx?' ≈':''}</span></div>`;
    html+=`<div class="pf-about">${pm.about}</div>`;
    html+=`<p class="pf-text">${interpret('planetInSign',{planet:k,sign:p.sign})}</p>`;
    if(chart.mode==='full'&&p.house)
      html+=`<p class="pf-sub"><b>В сфере «${META.houses[p.house].toLowerCase()}»:</b> ${interpret('planetInHouse',{planet:k,house:p.house})}</p>`;
    const tight=chart.aspects.filter(x=>x.a===k||x.b===k)[0]; // aspects уже по орбу
    if(tight){const other=tight.a===k?tight.b:tight.a;
      html+=`<p class="pf-sub"><b>Связь с «${META.planets[other].life.toLowerCase()}»:</b> ${interpret('aspect',{a:tight.a,type:tight.type,b:tight.b})}</p>`;}
    box.appendChild(el('div','pf-sec',html));
  });
}

/* ── СОВМЕСТИМОСТЬ по-человечески ── */
function pairTheme(a,b){ const s=new Set([a,b]);
  if(s.has('venus')&&s.has('mars')) return 'Притяжение и страсть';
  if(s.has('venus')) return 'Симпатия и вкусы';
  if(s.has('moon')&&s.has('saturn')) return 'Тепло и холод';
  if(s.has('moon')) return 'Эмоциональная близость';
  if(s.has('mercury')) return 'Взаимопонимание';
  if(s.has('mars')&&s.has('sun')) return 'Энергия и характеры';
  if(s.has('mars')) return 'Драйв и трения';
  if(s.has('saturn')) return 'Серьёзность и обязательства';
  if(s.has('sun')) return 'Характеры и роли';
  return 'Общая связь';
}
function renderSynList(chA,chB,cross){
  const box=$('#full-list'); box.classList.remove('hidden'); box.innerHTML='';
  const soft=cross.filter(x=>x.type==='trine'||x.type==='sextile').length;
  const hard=cross.filter(x=>x.type==='square'||x.type==='opposition').length;
  let verdict;
  if(soft>hard+2) verdict='Карты хорошо ладят — между вами много лёгкости и тепла.';
  else if(hard>soft+2) verdict='Непростая пара — много искр и вызовов; вместе ярко, но потребует работы.';
  else verdict='И притяжение, и трения — живая, неоднозначная, но интересная связь.';
  box.appendChild(el('p','pf-lead',verdict));
  box.appendChild(el('p','pf-note',`Найдено ${cross.length} связей между картами. Ниже — что каждая значит простыми словами.`));
  if(!cross.length) box.appendChild(el('p','pf-text','Ярких связей в пределах орбов не найдено — спокойное, нейтральное сочетание.'));
  cross.forEach(x=>{
    box.appendChild(el('div','pf-sec',
      `<div class="pf-head">${pairTheme(x.a,x.b)} <span class="pf-tag"><span style="color:var(--gold)">${META.planets[x.a].ru}</span> и <span style="color:var(--blue)">${META.planets[x.b].ru}</span></span></div>`+
      `<p class="pf-text">${interpret('synastry',{a:x.a,type:x.type,b:x.b})}</p>`));});
}

/* ── панель прочтения ── */
function selectPlanet(k){
  const chart=CUR.chart,p=chart.planets[k],pm=META.planets[k],sm=META.signs[p.sign];
  Object.entries(CUR.nodes).forEach(([kk,g])=>{g.classList.toggle('dim',kk!==k);g.classList.toggle('sel',kk===k);});
  CUR.aspLayer.querySelectorAll('.asp').forEach(l=>{const hot=l.dataset.a===k||l.dataset.b===k;l.classList.toggle('hot',hot);l.classList.toggle('dim',!hot);});
  $('#p-glyph').textContent=pm.glyph;
  $('#p-title').textContent=`${pm.ru} в знаке ${sm.ru}`;
  $('#p-sub').textContent=`${sm.glyph} ${Math.floor(p.deg)}° · ${pm.sphere}${p.house?` · ${p.house} дом`:''}${p.retro?' · ретроград ℞':''}${p.approx?' · знак ≈':''}`;
  $('#p-body').textContent=interpret('planetInSign',{planet:k,sign:p.sign});
  $('#p-house').innerHTML=(chart.mode==='full'&&p.house)?'<b>В '+p.house+' доме:</b> '+interpret('planetInHouse',{planet:k,house:p.house}):'';
  const mine=chart.aspects.filter(x=>x.a===k||x.b===k), box=$('#p-aspects'); box.innerHTML='';
  $('#p-asp-title').style.display=mine.length?'block':'none'; $('#p-asp-title').textContent='Аспекты';
  mine.forEach(x=>{const other=x.a===k?x.b:x.a,am=META.aspects[x.type];
    box.appendChild(el('div','asp-item',`<span class="h">${am.glyph} ${am.ru} с ${META.planets[other].ru} <em style="color:var(--muted)">(орб ${x.orb}°)</em></span><span class="t">${interpret('aspect',{a:x.a,type:x.type,b:x.b})}</span>`));});
  $('#panel').classList.add('open');
}
function selectBiPlanet(set,k){
  const src=set==='a'?CUR.chA:CUR.chB,p=src.planets[k],pm=META.planets[k],sm=META.signs[p.sign];
  Object.entries(CUR.nodesA).forEach(([kk,g])=>{g.classList.toggle('dim',!(set==='a'&&kk===k));g.classList.toggle('sel',set==='a'&&kk===k);});
  Object.entries(CUR.nodesB).forEach(([kk,g])=>{g.classList.toggle('dim',!(set==='b'&&kk===k));g.classList.toggle('sel',set==='b'&&kk===k);});
  CUR.aspLayer.querySelectorAll('.asp').forEach(l=>{const hot=(set==='a'&&l.dataset.a===k)||(set==='b'&&l.dataset.b===k);l.classList.toggle('hot',hot);l.classList.toggle('dim',!hot);});
  $('#p-glyph').textContent=pm.glyph;
  $('#p-title').textContent=`${pm.ru} в знаке ${sm.ru}`;
  $('#p-sub').textContent=`${set==='a'?'Первый':'Второй'} · ${sm.glyph} ${Math.floor(p.deg)}°${p.house?` · ${p.house} дом`:''}${p.retro?' · ℞':''}`;
  $('#p-body').textContent=interpret('planetInSign',{planet:k,sign:p.sign});
  $('#p-house').innerHTML='';
  const mine=CUR.cross.filter(x=>(set==='a'&&x.a===k)||(set==='b'&&x.b===k)),box=$('#p-aspects');box.innerHTML='';
  $('#p-asp-title').style.display=mine.length?'block':'none'; $('#p-asp-title').textContent='Связи с партнёром';
  mine.forEach(x=>{const other=set==='a'?x.b:x.a,am=META.aspects[x.type];
    box.appendChild(el('div','asp-item',`<span class="h">${am.glyph} ${am.ru} → ${META.planets[other].ru} <em style="color:var(--muted)">(${x.orb}°)</em></span><span class="t">${interpret('synastry',{a:x.a,type:x.type,b:x.b})}</span>`));});
  $('#panel').classList.add('open');
}
function closePanel(){ $('#panel').classList.remove('open'); if(!CUR)return;
  const clr=g=>g.classList.remove('dim','sel');
  if(CUR.nodes)Object.values(CUR.nodes).forEach(clr);
  if(CUR.nodesA)Object.values(CUR.nodesA).forEach(clr); if(CUR.nodesB)Object.values(CUR.nodesB).forEach(clr);
  if(CUR.aspLayer)CUR.aspLayer.querySelectorAll('.asp').forEach(l=>l.classList.remove('hot','dim'));
}
window.closePanel=closePanel;

/* ============================================================================
   СБОРКА / РЕЖИМЫ
   ============================================================================ */
const STORE='aceon_astro_v3';
const save=s=>{try{localStorage.setItem(STORE,JSON.stringify(s));}catch(e){}};
const load=()=>{try{return JSON.parse(localStorage.getItem(STORE))||{};}catch(e){return{};}};
let _cnh=null;
function ensureNatal(){ if(window.CNH)return Promise.resolve();
  return _cnh||(_cnh=new Promise((res,rej)=>{const s=document.createElement('script');s.src='natal.bundle.js';s.onload=res;s.onerror=()=>rej(new Error('не удалось загрузить natal.bundle.js'));document.head.appendChild(s);})); }

async function buildWhoami(){
  const g=id=>$(id).value, y=+g('#f-year'),m=+g('#f-month'),d=+g('#f-day');
  if(!y||!m||!d){alert('Заполни дату рождения');return;}
  const hh=g('#f-hour'), mm=g('#f-min'), lat=parseFloat($('#f-lat').value), lon=parseFloat($('#f-lon').value);
  const full = hh!=='' && mm!=='' && !isNaN(lat) && !isNaN(lon);
  const btn=$('#f-build');
  if(full){
    btn.disabled=true;btn.textContent='Загружаю…';
    try{ await ensureNatal(); const chart=fullChart(y,m,d,+hh,+mm,lat,lon); renderChart(chart);
      $('#summary').textContent=`Твоя карта · Асц ${META.signs[chart.asc.sign].ru} · MC ${META.signs[chart.mc.sign].ru}`;
      save({tab:'whoami',whoami:{y,m,d,hh,mm,lat,lon}});
    }catch(e){alert('Ошибка: '+e.message);} finally{btn.disabled=false;btn.textContent='Показать карту';}
  } else {
    renderChart(lightChart(y,m,d));
    $('#summary').textContent='Портрет по знакам. Добавь время и город — появятся дома и асцендент.';
    save({tab:'whoami',whoami:{y,m,d}});
  }
}
async function buildSyn(){
  const g=id=>$(id).value, rd=p=>({y:+g(p+'-year'),m:+g(p+'-month'),d:+g(p+'-day'),hh:+g(p+'-hour'),mm:+g(p+'-min'),lat:parseFloat($(p+'-lat').value),lon:parseFloat($(p+'-lon').value)});
  const a=rd('#s1'),b=rd('#s2');
  for(const o of[a,b]) if(!o.y||!o.m||!o.d||isNaN(o.lat)||isNaN(o.lon)){alert('Заполни обе карты: дата, время и город');return;}
  const btn=$('#s-build');btn.disabled=true;btn.textContent='Считаю…';
  try{ await ensureNatal();
    const chA=fullChart(a.y,a.m,a.d,a.hh||12,a.mm||0,a.lat,a.lon), chB=fullChart(b.y,b.m,b.d,b.hh||12,b.mm||0,b.lat,b.lon);
    const cross=findAspects(chA.planets,chB.planets,false); renderBiWheel(chA,chB,cross);
    Object.entries(CUR.nodesA).forEach(([k,gg])=>gg.onclick=()=>selectBiPlanet('a',k));
    Object.entries(CUR.nodesB).forEach(([k,gg])=>gg.onclick=()=>selectBiPlanet('b',k));
    $('#summary').innerHTML=`<span style="color:var(--gold)">Первый</span> и <span style="color:var(--blue)">Второй</span> · связей: ${cross.length}`;
    save({tab:'syn'});
  }catch(e){alert('Ошибка: '+e.message);} finally{btn.disabled=false;btn.textContent='Сравнить';}
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
  ['today','whoami','syn'].forEach(n=>$('#form-'+n).classList.toggle('hidden',n!==name));
  $('#forecast-card').classList.add('hidden'); $('#chart').classList.add('hidden'); $('#full-list').classList.add('hidden');
  $('#hint').style.display=''; closePanel();
}
function initCities(){
  const dl=$('#cities'); Object.keys(CITIES).forEach(c=>dl.appendChild(el('option',null,'')).value=c);
  document.querySelectorAll('.city-in').forEach(inp=>inp.onchange=()=>{
    const c=CITIES[inp.value.trim()]; const pre='#'+inp.dataset.target;
    if(c){const[la,lo]=c.split(',');$(pre+'-lat').value=la;$(pre+'-lon').value=lo;}
  });
}
function restore(){ const s=load();
  if(s.today){$('#t-day').value=s.today.d;$('#t-month').value=s.today.m;if(s.today.y)$('#t-year').value=s.today.y;}
  if(s.whoami){const f=s.whoami;$('#f-day').value=f.d;$('#f-month').value=f.m;$('#f-year').value=f.y;
    if(f.hh!=null){$('#f-hour').value=f.hh;$('#f-min').value=f.mm;$('#f-lat').value=f.lat;$('#f-lon').value=f.lon;}}
  if(s.tab)showTab(s.tab);
}
function particles(){
  const cv=$('#stars'),cx=cv.getContext('2d'); if(!cx) return; let W,H,stars;
  const COL=['255,255,255','255,255,255','201,162,75','170,190,255']; // больше белых
  const rz=()=>{ W=cv.width=innerWidth; H=cv.height=innerHeight;
    const n=Math.min(220,Math.round(W*H/7000));
    stars=Array.from({length:n},()=>({x:Math.random()*W,y:Math.random()*H,r:Math.random()*1.3+.3,
      c:COL[Math.floor(Math.random()*COL.length)],tw:Math.random()*6.28,ts:Math.random()*.04+.006,
      drift:Math.random()*.05+.008,base:Math.random()*.45+.25})); };
  rz(); addEventListener('resize',rz);
  (function loop(){ cx.clearRect(0,0,W,H);
    stars.forEach(s=>{ s.tw+=s.ts; const a=Math.max(0,s.base+Math.sin(s.tw)*.35);
      s.y-=s.drift; if(s.y<-2){s.y=H+2;s.x=Math.random()*W;}
      cx.beginPath(); cx.arc(s.x,s.y,s.r,0,6.283); cx.fillStyle=`rgba(${s.c},${a})`; cx.fill();
      if(s.r>1.1){ cx.beginPath(); cx.arc(s.x,s.y,s.r*2.4,0,6.283); cx.fillStyle=`rgba(${s.c},${a*.12})`; cx.fill(); } // ореол ярким
    });
    requestAnimationFrame(loop);
  })();
}
window.addEventListener('DOMContentLoaded',()=>{
  if(!window.Astronomy){alert('Движок astronomy не загрузился. Проверь, что astronomy.browser.min.js лежит рядом с index.html.');return;}
  document.querySelectorAll('.tab').forEach(t=>t.onclick=()=>showTab(t.dataset.tab));
  initWidgets(); initCities(); particles(); restore();
  $('#t-build').onclick=()=>buildToday(); $('#f-build').onclick=buildWhoami; $('#s-build').onclick=buildSyn;
  document.querySelectorAll('.period-btn').forEach(b=>b.onclick=()=>buildToday(b.dataset.period));
});
