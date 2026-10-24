/* A.C.EON · Гостевая книга: логика страницы.
   Сервер прежний: адрес берётся из Guestbook/config.json на GitHub, GET /entries?count=N, POST /entry {name, phrase}.
   Следы плывут справа налево за 20 минут, высота следа зависит от его id (как раньше).
   Память в localStorage 'aceon:gb': свои записи (id), последний увиденный id, имя для формы. */
(function(){
'use strict';

const CONFIG_URL='https://raw.githubusercontent.com/yourssugar/A.C.EON/main/Guestbook/config.json';
const CROSS_MS=20*60*1000, REFRESH=60*1000, MAX_FETCH=300, PL=35, CONFIG_TTL=5*60*1000;
const AU=window.AceonUniverse||{id:2};
const isCoarse=matchMedia('(pointer:coarse)').matches||navigator.maxTouchPoints>0;
const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
const TR=window.Trace||null;
const TIER=Math.max(1,Math.min(3,AU.id||2));

/* ---------- язык (общий с сайтом) ---------- */
const LANGS=['en','ru','de','fr','es','it','pl'];
const LANG_NAMES={en:'English',ru:'Русский',de:'Deutsch',fr:'Français',es:'Español',it:'Italiano',pl:'Polski'};
const GL=window.GB_LANG||{en:{}};
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
  const d=GL[lang()]||GL.en;
  let s=d[k]!==undefined?d[k]:(GL.en[k]!==undefined?GL.en[k]:k);
  if(s&&typeof s==='object'){ let f='other'; try{ f=new Intl.PluralRules(lang()).select(v&&v.n!==undefined?v.n:0); }catch(e){} s=s[f]||s.other; }
  if(typeof s==='string'&&v) s=s.replace(/\{(\w+)\}/g,(m,n)=>v[n]!==undefined?(n==='n'?fmtNum(v[n]):v[n]):m);
  return s;
}
function fmtNum(n){ try{ return Number(n).toLocaleString(lang()); }catch(e){ return String(n); } }
function setLang(c){
  if(LANGS.indexOf(c)<0||c===lang())return;
  if(hasI18n)I18n.set(c);
  else{ fbLang=c; const o=readSite(); o.lang=c; if(o.music===undefined)o.music=.6; if(o.sfx===undefined)o.sfx=.8; writeSite(o); }
  document.documentElement.lang=c;
  if(TR)TR.event('lang.change');
  applyTexts();
}
document.documentElement.lang=lang();
function relTime(ts){
  const s=Math.max(0,Math.floor(Date.now()/1000-ts));
  let rtf=null; try{ rtf=new Intl.RelativeTimeFormat(lang(),{numeric:'auto'}); }catch(e){}
  if(!rtf){ return s<60?'<1m':s<3600?Math.floor(s/60)+'m':s<86400?Math.floor(s/3600)+'h':Math.floor(s/86400)+'d'; }
  if(s<60)return rtf.format(0,'second');
  if(s<3600)return rtf.format(-Math.floor(s/60),'minute');
  if(s<86400)return rtf.format(-Math.floor(s/3600),'hour');
  if(s<86400*30)return rtf.format(-Math.floor(s/86400),'day');
  if(s<86400*365)return rtf.format(-Math.floor(s/86400/30),'month');
  return rtf.format(-Math.floor(s/86400/365),'year');
}

/* ---------- память гостевой ---------- */
const GKEY='aceon:gb';
let mem=(function(){ try{ return JSON.parse(localStorage.getItem(GKEY)||'null')||{}; }catch(e){ return {}; } })();
mem.v=1; mem.mine=Array.isArray(mem.mine)?mem.mine:[]; mem.lastId=mem.lastId||0; mem.name=mem.name||'';
function saveMem(){ try{ localStorage.setItem(GKEY,JSON.stringify(mem)); }catch(e){} }
const isMine=id=>mem.mine.indexOf(id)>=0;

/* ---------- сервер ---------- */
let currentApi='', configFetchedAt=0;
async function fetchConfig(){
  try{ const r=await fetch(CONFIG_URL+'?t='+Date.now(),{cache:'no-store'}); const d=await r.json();
    if(d.api){ currentApi=String(d.api).replace(/\/+$/,''); configFetchedAt=Date.now(); } }
  catch(e){ console.warn('[gb] config:',e.message); }
}
async function getApi(){ if(!currentApi||Date.now()-configFetchedAt>CONFIG_TTL)await fetchConfig(); return currentApi; }
async function apiFetch(path,opts){
  const url=await getApi(); if(!url)throw new Error('no server url');
  try{ return await fetch(url+path,opts); }
  catch(e){ configFetchedAt=0; const u2=await getApi(); if(!u2)throw e; return await fetch(u2+path,opts); }
}

/* ---------- мат: та же проверка, что была ---------- */
const BAN=['хуй','залуп','пизд','пидор','педик','ёбан','ебан','ебат','нахуй','бляд','блять','мудак','уёб','уеб','мразь','шлюх',
  'х*й','п*зд','е*ать','б*ять','х у й',' сука ',' суку ',' суки ','fuck','shit','bitch','cunt',' ass ','dick','cock',
  'pussy','nigger','nigga','fag','bastard','whore','slut','asshole'];
const hasBan=t=>BAN.some(w=>(' '+t.toLowerCase().replace(/ё/g,'е')+' ').includes(w));

/* ---------- следы ---------- */
const srand=s=>{ const x=Math.sin(s*1.7+3)*10000; return x-Math.floor(x); };
const seedY=id=>srand(id*37+7)*80+10;
function hashStr(s){ let h=2166136261; for(let i=0;i<s.length;i++){ h^=s.charCodeAt(i); h=Math.imul(h,16777619); } return h>>>0; }
/* цвет звезды из имени: один и тот же ник всегда одного цвета */
const TINTS=[[1,1,1],[1,1,1],[.84,.9,1],[.78,.86,1],[1,.92,.8],[1,.86,.72],[1,.97,.88],[.9,.86,1]];
function tintOf(name){ return TINTS[hashStr(String(name||'').trim().toLowerCase())%TINTS.length]; }

const orbs=new Map();           // id -> {entry, birth, x, y, hov, tint, size, fresh}
let hoverId=null, pinned=false, mouse=null, fldRect=null;
const fld=document.getElementById('fld'), tip=document.getElementById('tip');
function rect(){ if(!fldRect)fldRect=fld.getBoundingClientRect(); return fldRect; }

function addEntry(e,birth,fresh){
  if(orbs.has(e.id))return orbs.get(e.id);
  const o={entry:e,birth,x:innerWidth+80,y:0,hov:0,tint:tintOf(e.name),
    size:.85+Math.min(1,String(e.phrase||'').length/PL)*.3, fresh:fresh?1:0,
    pd:2+srand(e.id)*3, dly:srand(e.id*13)*4};
  orbs.set(e.id,o); return o;
}
function setCount(n){ document.getElementById('cnt').textContent=n?T('count',{n}):''; lastTotal=n||lastTotal; }
let lastTotal=0, loaded=false;
async function loadEntries(initial){
  try{
    const res=await apiFetch('/entries?count='+MAX_FETCH);
    const data=await res.json();
    setCount(data.total);
    const list=data.entries||[], N=Math.max(1,list.length), now=Date.now();
    const prevLast=mem.lastId;
    let maxId=prevLast, fresh=0;
    list.forEach((e,i)=>{
      const isNew=initial&&prevLast>0&&e.id>prevLast&&!isMine(e.id);
      if(isNew)fresh++;
      addEntry(e,initial?now-(i/N)*CROSS_MS*.96:now+Math.random()*12000,isNew);
      if(e.id>maxId)maxId=e.id;
    });
    lastList=list;
    if(maxId>mem.lastId){ mem.lastId=maxId; saveMem(); }
    if(initial&&fresh>0)showMsg(T('new.since',{n:fresh}),'gold',7000);
    loaded=true; updateFind();
  }catch(err){
    console.warn('[gb] entries:',err.message);
    if(initial)showMsg(T('err.server'),'err',7000);
  }
}
let lastList=[];

/* положение и вид следов на кадр */
function scene(now){
  const sw=innerWidth, r=rect(), t=now/1000, nowMs=Date.now(), out=[];
  for(const [id,o] of orbs){
    if(o.hov<.01&&hoverId!==id){
      const x=sw-((nowMs-o.birth)/CROSS_MS)*(sw+100);
      if(x<-80){ orbs.delete(id); continue; }
      o.x=x;
    }
    o.y=r.top+seedY(id)/100*r.height;
    const target=(hoverId===id)?1:0;
    o.hov+=(target-o.hov)*Math.min(1,.18*(60/60));
    if(o.fresh>0&&o.freshT===undefined)o.freshT=nowMs;
    const fr=o.fresh>0?Math.max(0,1-(nowMs-o.freshT)/180000):0;
    let a=.38+.52*(.5-.5*Math.cos((t+o.dly)/o.pd*6.2832));
    a=a*(1-o.hov)+1*o.hov;
    if(TIER>=2&&mouse&&!isCoarse){ const d=Math.hypot(mouse.x-o.x,mouse.y-o.y); if(d<130)a*=1+(1-d/130)*1.4; }
    a=Math.min(1.5,a*(o.size)*(1+fr*.5));
    if(o.x<-60||o.x>sw+60)continue;
    out.push({id,name:o.entry.name,x:o.x,y:o.y,r:o.tint[0],g:o.tint[1],b:o.tint[2],a,own:isMine(id),fresh:fr,hov:o.hov});
  }
  return out;
}

/* ---------- подсказка и наведение ---------- */
function esc(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
function showTip(o){
  const e=o.entry, r=rect();
  tip.className='';
  tip.innerHTML='<div class="tn">'+esc(e.name)+'</div><div class="tp">'+esc(e.phrase)+'</div><div class="tt"><span class="rt">'+relTime(e.created_at)+'</span>'+(isMine(e.id)?'<b>'+esc(T('mine'))+'</b>':'')+'</div>';
  const down=(o.y-r.top)<r.height*.2;
  tip.classList.toggle('dn',down); tip.classList.toggle('own',isMine(e.id));
  placeTip(o);
  requestAnimationFrame(()=>tip.classList.add('on'));
}
function placeTip(o){
  const r=rect(), w=tip.offsetWidth||180;
  const x=Math.max(w/2+8,Math.min(innerWidth-w/2-8,o.x));
  tip.style.left=x+'px'; tip.style.top=(o.y-r.top)+'px';
}
function hideTip(){ tip.classList.remove('on'); }
function setHover(id,pin){
  if(hoverId===id){ pinned=pin||pinned; return; }
  if(hoverId!=null)release(hoverId);
  hoverId=id; pinned=!!pin;
  if(id!=null){ const o=orbs.get(id); if(o)showTip(o); fld.classList.add('hov'); }
  else { hideTip(); fld.classList.remove('hov'); }
}
/* отпущенный след продолжает путь с того места, где стоял */
function release(id){
  const o=orbs.get(id); if(!o)return;
  const sw=innerWidth;
  o.birth=Date.now()-Math.max(0,((sw-o.x)/(sw+100))*CROSS_MS);
}
function nearest(px,py){
  let best=null, bd=isCoarse?24:14;
  for(const [id,o] of orbs){ const d=Math.hypot(o.x-px,o.y-py); if(d<bd){ bd=d; best=id; } }
  return best;
}
fld.addEventListener('mousemove',e=>{
  mouse={x:e.clientX,y:e.clientY};
  if(isCoarse)return;
  const id=nearest(e.clientX,e.clientY);
  if(id!=null)setHover(id,false);
  else if(hoverId!=null&&!pinned){ const o=orbs.get(hoverId); if(!o||Math.hypot(o.x-e.clientX,o.y-e.clientY)>22)setHover(null); }
},{passive:true});
fld.addEventListener('mouseleave',()=>{ mouse=null; if(!pinned)setHover(null); });
document.addEventListener('mousemove',e=>{ if(!fld.contains(e.target))mouse={x:e.clientX,y:e.clientY}; },{passive:true});
fld.addEventListener('click',e=>{
  if(e.target.closest('#tip'))return;
  const id=nearest(e.clientX,e.clientY);
  if(id==null){ setHover(null); return; }
  if(hoverId===id&&pinned){ setHover(null); return; }
  setHover(id,true);
});
setInterval(()=>{ if(hoverId!=null){ const o=orbs.get(hoverId), rt=tip.querySelector('.rt'); if(o&&rt)rt.textContent=relTime(o.entry.created_at); } },30000);

/* ---------- своя звезда ---------- */
const findBtn=document.getElementById('find');
function updateFind(){ findBtn.classList.toggle('on',mem.mine.length>0); }
findBtn.addEventListener('click',e=>{
  e.stopPropagation();
  if(TR)TR.event('gb.find');
  const sw=innerWidth;
  const on=mem.mine.map(id=>orbs.get(id)).filter(o=>o&&o.x>-20&&o.x<sw+20).sort((a,b)=>b.entry.id-a.entry.id)[0];
  if(on){ setHover(on.entry.id,true); sky.burst(on.x,on.y); showMsg(T('find.here'),'gold',3000); return; }
  const e2=lastList.filter(x=>isMine(x.id)).sort((a,b)=>b.id-a.id)[0];
  if(e2){
    orbs.delete(e2.id);
    const o=addEntry(e2,Date.now()-CROSS_MS*.06,true);
    o.x=sw-CROSS_MS*.06/CROSS_MS*(sw+100); o.y=rect().top+seedY(e2.id)/100*rect().height;
    sky.burst(o.x,o.y); setHover(e2.id,true);
    showMsg(T('find.back'),'gold',3500); return;
  }
  showMsg(T('find.none'),'err',4500);
});

/* ---------- форма ---------- */
const ni=document.getElementById('ni'), pi=document.getElementById('pi'), cc=document.getElementById('cc'),
      ms=document.getElementById('ms'), sb=document.getElementById('sb');
ni.value=mem.name||'';
pi.addEventListener('input',()=>{ const l=pi.value.length; cc.textContent=l+'/'+PL; cc.classList.toggle('lim',l>=PL); });
ni.addEventListener('keydown',e=>{ if(e.key==='Enter')pi.focus(); });
pi.addEventListener('keydown',e=>{ if(e.key==='Enter')doSubmit(); });
let msgT;
function showMsg(t,c,d){ ms.textContent=t; ms.className=c||''; clearTimeout(msgT); if(d)msgT=setTimeout(()=>{ ms.textContent=''; ms.className=''; },d); }

/* сервер на POST отвечает {ok,total}; чтобы показать свою звезду сразу, ищем её среди последних записей */
async function findPosted(name,phrase,d){
  if(d&&(d.id||(d.entry&&d.entry.id))){ const id=d.id||d.entry.id; return d.entry||{id,name,phrase,created_at:Math.floor(Date.now()/1000)}; }
  try{
    const r=await apiFetch('/entries?count=12'); const data=await r.json();
    const list=(data.entries||[]).filter(e=>String(e.name).trim()===name&&String(e.phrase).trim()===phrase);
    list.sort((a,b)=>b.id-a.id);
    return list[0]||null;
  }catch(e){ return null; }
}
async function doSubmit(){
  const name=ni.value.trim(), phrase=pi.value.trim();
  if(!name){ showMsg(T('err.name'),'err'); ni.focus(); return; }
  if(!phrase){ showMsg(T('err.phrase'),'err'); pi.focus(); return; }
  if(hasBan(name)||hasBan(phrase)){ showMsg(T('err.ban'),'err',3000); return; }
  sb.disabled=true; sb.textContent='...';
  try{
    const res=await apiFetch('/entry',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name,phrase})});
    const d=await res.json();
    if(d.ok){
      pi.value=''; cc.textContent='0/'+PL; cc.classList.remove('lim');
      mem.name=name; saveMem();
      showMsg(T('ok.sent'),'ok',3500);
      if(TR)TR.event('gb.post');
      sky.wave();
      if(d.total)setCount(d.total);
      const e=await findPosted(name,phrase,d);
      if(e&&e.id){
        if(!isMine(e.id)){ mem.mine.push(e.id); if(mem.mine.length>50)mem.mine.shift(); }
        if(e.id>mem.lastId)mem.lastId=e.id;
        saveMem(); updateFind();
        orbs.delete(e.id);
        const o=addEntry(e,Date.now()-CROSS_MS*.02,true);
        const sw=innerWidth; o.x=sw-.02*(sw+100); o.y=rect().top+seedY(e.id)/100*rect().height;
        setTimeout(()=>sky.burst(o.x,o.y),60);
      }
    } else showMsg(d.error||T('err.generic'),'err',4000);
  }catch(e){ showMsg(T('err.net'),'err',4000); }
  finally{ sb.disabled=false; sb.textContent='✦'; }
}
sb.addEventListener('click',doSubmit);

/* ---------- небо ---------- */
const cv=document.getElementById('cv');
const sky=window.AceonSky.create(cv,{tier:TIER,reduce,coarse:isCoarse});
const capMs=(TIER===1||isCoarse)?31:(AU.capMs||15);
let lastF=0, lastNow=0;
function loop(now){
  requestAnimationFrame(loop);
  if(document.hidden)return;
  if(now-lastF<capMs-1)return;
  const fm=lastNow?now-lastNow:16; lastNow=now; lastF=now;
  const guests=scene(now);
  sky.frame(now,{guests,mouse,hover:hoverId,frameMs:fm});
  if(hoverId!=null){ const o=orbs.get(hoverId); if(o)placeTip(o); else setHover(null); }
}
requestAnimationFrame(loop);
addEventListener('resize',()=>{ fldRect=null; sky.resize(); });

/* ---------- архив: изредка вздрагивает ---------- */
const mb=document.getElementById('mb');
if(TIER>=2&&!reduce){
  (function glitch(){ setTimeout(()=>{ if(!document.hidden){ mb.classList.add('gl'); setTimeout(()=>mb.classList.remove('gl'),90+Math.random()*90); } glitch(); },9000+Math.random()*16000); })();
}
mb.addEventListener('click',()=>{ if(TR)TR.event('gb.memory'); });

/* ---------- музыка (общая громкость сайта) ---------- */
const bgm=new Audio(); bgm.volume=0; bgm.loop=true;
const bgmBtn=document.getElementById('bgm-btn');
let bgmStarted=false, bgmFade=null;
function siteMusic(){ const v=(hasI18n?Store.get('site'):readSite()).music; return typeof v==='number'?v:.6; }
function saveMusic(v){ if(hasI18n){ Store.get('site').music=v; Store.save('site'); } else { const o=readSite(); o.music=v; writeSite(o); } }
function bgmTarget(){ return Math.min(1,siteMusic())*.65; }
function fadeBgm(to,done){ clearInterval(bgmFade);
  bgmFade=setInterval(()=>{ let v=bgm.volume; v=to>v?Math.min(to,v+.016):Math.max(to,v-.04); bgm.volume=v; if(v===to){ clearInterval(bgmFade); if(done)done(); } },140); }
function bgmUI(){ const on=bgmStarted&&!bgm.paused; bgmBtn.classList.toggle('muted',!on); bgmBtn.textContent=on?'♫':'♪'; }
function startBGM(force){
  if(bgmStarted)return;
  if(!force&&siteMusic()<=0){ bgmUI(); return; }
  bgmStarted=true; bgm.src='../audio/Schlaf, Mein Herz.mp3';
  const p=bgm.play(); if(p&&p.then)p.then(()=>{ fadeBgm(bgmTarget()); bgmUI(); }).catch(()=>{ bgmStarted=false; bgmUI(); });
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
['pointerdown','keydown','touchstart'].forEach(ev=>document.addEventListener(ev,()=>startBGM(false),{once:true,passive:true}));

/* ---------- шапка ---------- */
const langBtn=document.getElementById('langbtn'), langMenu=document.getElementById('langmenu');
LANGS.forEach(c=>{
  const b=document.createElement('button'); b.type='button'; b.setAttribute('data-l',c);
  b.innerHTML='<b>'+c.toUpperCase()+'</b><span></span>'; b.lastChild.textContent=LANG_NAMES[c];
  b.addEventListener('click',()=>{ langMenu.classList.remove('on'); setLang(c); });
  langMenu.appendChild(b);
});
langBtn.addEventListener('click',e=>{ e.stopPropagation(); langMenu.classList.toggle('on'); });
document.addEventListener('click',e=>{ langMenu.classList.remove('on'); });
document.getElementById('back').addEventListener('click',()=>{ location.href='../A.C.EON_Core/'; });
document.getElementById('rb').addEventListener('click',()=>loadEntries(false));
function applyTexts(){
  document.title='A.C.EON · '+T('title');
  document.getElementById('ttl').textContent='✦ '+T('title');
  document.getElementById('back').textContent=T('back');
  langBtn.textContent=lang().toUpperCase(); langBtn.title=T('lang.title');
  langMenu.querySelectorAll('button').forEach(b=>b.classList.toggle('sel',b.getAttribute('data-l')===lang()));
  bgmBtn.title=T('music'); document.getElementById('rb').title=T('refresh'); findBtn.title=T('find');
  ni.placeholder=T('ph.name'); pi.placeholder=T('ph.phrase'); sb.title=T('send');
  document.getElementById('dc').textContent=T('note');
  if(lastTotal)setCount(lastTotal);
  if(hoverId!=null){ const o=orbs.get(hoverId); if(o)showTip(o); }
}
applyTexts(); updateFind();

/* ---------- старт ---------- */
(async function init(){
  await fetchConfig();
  loadEntries(true);
  setInterval(()=>{ if(!document.hidden)loadEntries(false); },REFRESH);
  document.addEventListener('visibilitychange',()=>{ if(!document.hidden&&loaded)loadEntries(false); });
})();
})();
