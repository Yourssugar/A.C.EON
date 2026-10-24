/* A.C.EON // ASTRO: расчёты без текста.
   astronomy-engine (window.Astronomy) считает небо на дату, circular-natal (window.CNH, natal.bundle.js) дома и асцендент.
   Тексты и язык живут в astro-ui.js и lang.js, здесь только числа и ключи. */
(function(){
'use strict';
const A=window.Astronomy;
const PLANETS=['sun','moon','mercury','venus','mars','jupiter','saturn','uranus','neptune','pluto'];
const SIGNS=['aries','taurus','gemini','cancer','leo','virgo','libra','scorpio','sagittarius','capricorn','aquarius','pisces'];
const VS='︎'; /* текстовый вариант символа, иначе телефоны рисуют знаки цветными эмодзи */
const PG={sun:'☉',moon:'☽',mercury:'☿',venus:'♀',mars:'♂',jupiter:'♃',saturn:'♄',uranus:'♅',neptune:'♆',pluto:'♇'};
const SG={aries:'♈',taurus:'♉',gemini:'♊',cancer:'♋',leo:'♌',virgo:'♍',libra:'♎',scorpio:'♏',sagittarius:'♐',capricorn:'♑',aquarius:'♒',pisces:'♓'};
for(const k in PG)PG[k]+=VS; for(const k in SG)SG[k]+=VS;
const ASP={conjunction:{angle:0,orb:8,g:'☌'},opposition:{angle:180,orb:8,g:'☍'},trine:{angle:120,orb:8,g:'△'},square:{angle:90,orb:7,g:'□'},sextile:{angle:60,orb:6,g:'⚹'}};
const EL={aries:'fire',leo:'fire',sagittarius:'fire',taurus:'earth',virgo:'earth',capricorn:'earth',gemini:'air',libra:'air',aquarius:'air',cancer:'water',scorpio:'water',pisces:'water'};
const MOD={aries:'card',cancer:'card',libra:'card',capricorn:'card',taurus:'fixed',leo:'fixed',scorpio:'fixed',aquarius:'fixed',gemini:'mut',virgo:'mut',sagittarius:'mut',pisces:'mut'};
const ELSIGNS={fire:['aries','leo','sagittarius'],earth:['taurus','virgo','capricorn'],air:['gemini','libra','aquarius'],water:['cancer','scorpio','pisces']};
const FRIEND={fire:'air',air:'fire',earth:'water',water:'earth'};

const bodyName=k=>k.charAt(0).toUpperCase()+k.slice(1);
const norm=l=>((l%360)+360)%360;
function eclLon(k,date){ return A.Ecliptic(A.GeoVector(bodyName(k),A.MakeTime(date),true)).elon; }
const signOf=l=>SIGNS[Math.floor(norm(l)/30)];
const degIn=l=>norm(l)%30;
function isRetro(k,date){
  if(k==='sun'||k==='moon')return false;
  const b=eclLon(k,new Date(date.getTime()-6*36e5)), a=eclLon(k,new Date(date.getTime()+6*36e5));
  let d=a-b; if(d>180)d-=360; if(d<-180)d+=360; return d<0;
}
function moon(date){
  const ph=A.MoonPhase(date), ill=A.Illumination('Moon',A.MakeTime(date)).phase_fraction;
  return {angle:ph,idx:Math.floor(((ph+22.5)%360)/45),ill:Math.round(ill*100)};
}
function skyAt(date){
  const m=moon(date);
  return {moonSign:signOf(eclLon('moon',date)),sunSign:signOf(eclLon('sun',date)),ph:m.idx,ill:m.ill,angle:m.angle,merc:isRetro('mercury',date)};
}
/* что заметного на ближайшей неделе: новолуние, полнолуние, ретро-Меркурий */
function week(start){
  const r={newM:false,fullM:false,retro:false};
  for(let i=0;i<7;i++){
    const day=new Date(start.getTime()+i*864e5), ph=A.MoonPhase(day);
    if(isRetro('mercury',day))r.retro=true;
    if(Math.min(ph,360-ph)<7)r.newM=true;
    if(Math.abs(ph-180)<7)r.fullM=true;
  }
  return r;
}

/* ---------- карты ---------- */
const angSep=(a,b)=>{ const d=Math.abs(a-b)%360; return d>180?360-d:d; };
function aspects(pa,pb,same){
  const out=[];
  PLANETS.forEach((ka,i)=>PLANETS.forEach((kb,j)=>{
    if(same&&j<=i)return;
    const sep=angSep(pa[ka].lon,pb[kb].lon);
    for(const t in ASP){ const orb=Math.abs(sep-ASP[t].angle); if(orb<=ASP[t].orb){ out.push({a:ka,b:kb,type:t,orb:+orb.toFixed(1)}); break; } }
  }));
  return out.sort((x,y)=>x.orb-y.orb);
}
/* без времени: полдень UTC. Луна за сутки проходит около 13°, поэтому знак Луны примерный, если она у границы */
function light(y,m,d){
  const date=new Date(Date.UTC(y,m-1,d,12)), planets={};
  PLANETS.forEach(k=>{
    const lon=eclLon(k,date), dg=degIn(lon);
    const span=k==='moon'?6.6:(k==='sun'?0.5:0);
    planets[k]={sign:signOf(lon),deg:dg,lon,retro:isRetro(k,date),approx:span>0&&(dg<span||dg>30-span)};
  });
  const c={mode:'light',planets}; c.aspects=aspects(planets,planets,true); return c;
}
function full(y,m,d,hh,mm,lat,lon){
  const CNH=window.CNH; if(!CNH)throw new Error('natal');
  const origin=new CNH.Origin({year:y,month:m-1,date:d,hour:hh,minute:mm,latitude:lat,longitude:lon});
  const h=new CNH.Horoscope({origin,houseSystem:'placidus',zodiac:'tropical',aspectPoints:['bodies'],aspectWithPoints:['bodies'],aspectTypes:['major'],language:'en'});
  const planets={};
  PLANETS.forEach(k=>{
    const b=h.CelestialBodies[k], raw=b.ChartPosition.Ecliptic.DecimalDegrees;
    planets[k]={sign:signOf(raw),deg:degIn(raw),lon:raw,house:b.House?b.House.id:null,retro:!!b.isRetrograde,approx:false};
  });
  const asc=h.Ascendant.ChartPosition.Ecliptic.DecimalDegrees, mc=h.Midheaven.ChartPosition.Ecliptic.DecimalDegrees;
  const c={mode:'full',planets,asc:{lon:asc,sign:signOf(asc)},mc:{lon:mc,sign:signOf(mc)},
    cusps:h.Houses.map(x=>x.ChartPosition.StartPosition.Ecliptic.DecimalDegrees)};
  c.aspects=aspects(planets,planets,true); return c;
}
let natalP=null;
function needNatal(){
  if(window.CNH)return Promise.resolve();
  return natalP||(natalP=new Promise((res,rej)=>{
    const s=document.createElement('script'); s.src='natal.bundle.js';
    s.onload=res; s.onerror=()=>{ natalP=null; rej(new Error('natal')); }; document.head.appendChild(s);
  }));
}
/* человек: {d:'1993-09-15', t:'14:30'|'' , lat, lon} */
function parseDate(s){ const m=/^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(s||''); return m?{y:+m[1],m:+m[2],d:+m[3]}:null; }
function canFull(p){ return !!(p&&p.t&&isFinite(p.lat)&&isFinite(p.lon)&&p.lat!==null&&p.lon!==null); }
async function chartFor(p){
  const dt=parseDate(p.d); if(!dt)throw new Error('date');
  if(canFull(p)){
    const [hh,mm]=p.t.split(':').map(Number);
    await needNatal(); return full(dt.y,dt.m,dt.d,hh,mm,p.lat,p.lon);
  }
  return light(dt.y,dt.m,dt.d);
}
function sunSignOf(p){ const dt=parseDate(p.d); if(!dt)return null; const c=light(dt.y,dt.m,dt.d); return {sign:c.planets.sun.sign,cusp:c.planets.sun.approx&&!canFull(p)}; }

/* ---------- прогноз: только ключи, текст подставляет интерфейс ---------- */
function fnv(s){ let x=2166136261>>>0; for(let i=0;i<s.length;i++){ x^=s.charCodeAt(i); x=Math.imul(x,16777619); } return x>>>0; }
function harmony(e1,e2){ if(e1===e2)return 'amplified'; return FRIEND[e1]===e2?'harmonious':'tense'; }
/* sunSign, sky, дата для зерна, период. pick(n,salt) даёт индекс, стабильный в течение дня */
function forecast(sunSign,sky,date,period){
  const key=date.getFullYear()+'-'+(date.getMonth()+1)+'-'+date.getDate()+(period==='week'?'w':'');
  const seed=fnv(key+'|'+sunSign);
  const pick=(n,salt)=>((fnv(salt)^seed)>>>0)%n;
  const myEl=EL[sunSign], state=harmony(myEl,EL[sky.moonSign]);
  const cs=ELSIGNS[FRIEND[myEl]];
  return {state,pick,compat:cs[pick(cs.length,'compat')],num:pick(99,'num')+1};
}

window.AstroCore={PLANETS,SIGNS,PG,SG,ASP,EL,MOD,eclLon,signOf,degIn,isRetro,moon,skyAt,week,aspects,light,full,needNatal,chartFor,canFull,parseDate,sunSignOf,forecast,fnv};
})();
