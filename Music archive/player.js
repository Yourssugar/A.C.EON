/* A.C.EON · Архив звука: плеер.
   Список треков TRACKS задаётся в index.html (поле yt на будущее: ссылка на YouTube).
   Что здесь:
   - воспроизведение, случайный порядок, повтор, понравившееся (как было), скрытые треки с возвратом
   - живой анализ звука (Web Audio): визуализатор и танец робота попадают в музыку.
     На iPhone/iPad звук через Web Audio замолкает в фоне, поэтому там анализ имитируется
   - Media Session: название и обложка на заблокированном экране, кнопки наушников, работа в фоне
   - следующий трек подгружается заранее, битый трек пропускается
   - статистика прослушиваний (для будущих альбомов и "твоей кассеты")
   Хранение: Store('music') -> localStorage 'aceon:music' {favs, hidden, stats, shuffle, repeat}.
   Старое избранное из 'sound_archive_favs' переносится само. */
(function(){
'use strict';

const TRACKS=window.TRACKS||[];
const AU=window.AceonUniverse||{id:2};
const TIER=Math.max(1,Math.min(3,AU.id||2));
const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
const TR=window.Trace||null;
const $=id=>document.getElementById(id);

let PORTAL=false;
try{ PORTAL=(window.self!==window.top); }catch(e){ PORTAL=true; }

/* ---------- язык (общий с сайтом) ---------- */
const LANGS=['en','ru','de','fr','es','it','pl'];
const LANG_NAMES={en:'English',ru:'Русский',de:'Deutsch',fr:'Français',es:'Español',it:'Italiano',pl:'Polski'};
const ML=window.MUSIC_LANG||{en:{}};
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
function T(k){ const d=ML[lang()]||ML.en; return d[k]!==undefined?d[k]:(ML.en[k]!==undefined?ML.en[k]:k); }
function setLang(c){
  if(LANGS.indexOf(c)<0||c===lang())return;
  if(hasI18n)I18n.set(c);
  else{ fbLang=c; const o=readSite(); o.lang=c; writeSite(o); }
  document.documentElement.lang=c;
  if(TR)TR.event('lang.change');
  applyTexts(); buildList(); updatePlayer();
/* список TRACKS в index.html не прочитался (обычно пропущена запятая перед yt:): пишем об этом прямо в списке */
if(!Array.isArray(window.TRACKS)){
  $('trackList').innerHTML='<div class="empty" style="color:#fca5a5"><i class="ti ti-alert-triangle" style="color:#fca5a5"></i>TRACKS: syntax error in index.html (F12, Console)</div>';
  console.error('[music] TRACKS не задан: ошибка в списке треков в index.html, проверь запятые между полями (src: "...", yt: "...")');
}
}
document.documentElement.lang=lang();

/* ---------- память ---------- */
let mem;
if(window.Store){
  Store.define('music',{version:1,defaults:{favs:[],hidden:[],stats:{},shuffle:false,repeat:false},
    legacy:function(raw,readJSON){ const f=readJSON('sound_archive_favs'); return Array.isArray(f)?{favs:f}:null; }});
  mem=Store.get('music');
} else {
  try{ mem=JSON.parse(localStorage.getItem('aceon:music')||'null'); }catch(e){}
  if(!mem){ mem={favs:[],hidden:[],stats:{}}; try{ const f=JSON.parse(localStorage.getItem('sound_archive_favs')||'[]'); if(Array.isArray(f))mem.favs=f; }catch(e){} }
}
mem.favs=mem.favs||[]; mem.hidden=mem.hidden||[]; mem.stats=mem.stats||{};
function save(){ if(window.Store)Store.save('music'); else try{ localStorage.setItem('aceon:music',JSON.stringify(mem)); }catch(e){} }
const favs=new Set(mem.favs), hidden=new Set(mem.hidden);
function syncMem(){ mem.favs=[...favs]; mem.hidden=[...hidden]; save(); }

/* ---------- вид трека ---------- */
const PALETTE=[{bg:'#1e1b4b',fg:'#a78bfa'},{bg:'#1a2a1a',fg:'#6ee7b7'},{bg:'#2a1000',fg:'#fdba74'},{bg:'#2a0a1a',fg:'#f9a8d4'},
  {bg:'#0a1a2a',fg:'#7dd3fc'},{bg:'#1a1500',fg:'#fde68a'},{bg:'#1a0a0a',fg:'#fca5a5'},{bg:'#0a1a1a',fg:'#5eead4'}];
const trackColor=id=>PALETTE[(id-1)%PALETTE.length];
function trackInitials(title){
  const parts=title.split(/[\s_.\-]+/).filter(p=>p.length>0); let r='';
  for(let i=0;i<Math.min(2,parts.length);i++)r+=parts[i][0].toUpperCase();
  return r||'?';
}
function fmtTime(sec){ if(!isFinite(sec)||sec<0)return '0:00'; const m=Math.floor(sec/60), s=Math.floor(sec%60); return m+':'+(s<10?'0':'')+s; }
const esc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
const byId=id=>TRACKS.find(t=>t.id===id);

/* ---------- состояние ---------- */
let current=null, playing=false, shuffle=!!mem.shuffle, repeat=!!mem.repeat, activeTab='all', playTab='all', queued=null;
const audio=new Audio(); audio.preload='auto';
const preloader=new Audio(); preloader.preload='auto'; preloader.muted=true;

const ALBUMS=(window.ALBUMS||[]).filter(a=>a&&a.id&&Array.isArray(a.tracks));
const albumById=id=>ALBUMS.find(a=>a.id===id);
function albumTracks(a){ return a?a.tracks.map(byIdRaw).filter(t=>t&&!hidden.has(t.id)):[]; }
function byIdRaw(id){ return TRACKS.find(t=>t.id===id); }
function visible(){ return TRACKS.filter(t=>!hidden.has(t.id)); }
function getList(tab){
  tab=tab||activeTab;
  if(tab==='favs')return TRACKS.filter(t=>favs.has(t.id)&&!hidden.has(t.id));
  if(tab==='hidden')return TRACKS.filter(t=>hidden.has(t.id));
  if(tab==='albums')return [];
  if(tab.indexOf('album:')===0)return albumTracks(albumById(tab.slice(6)));
  return visible();
}
function playList(){ const l=getList(playTab==='hidden'||playTab==='albums'?'all':playTab); return l.length?l:visible(); }
function pickNext(forward){
  const list=playList(); if(!list.length)return null;
  if(forward&&queued&&list.some(t=>t.id===queued.id)&&(!current||queued.id!==current.id))return queued;
  if(shuffle){ const pool=list.length>1?list.filter(t=>!current||t.id!==current.id):list; return pool[Math.random()*pool.length|0]; }
  let i=-1; if(current)i=list.findIndex(t=>t.id===current.id);
  if(i<0&&current){ /* текущий трек скрыт или не из этого списка: продолжаем с ближайшего по номеру */
    const after=list.findIndex(t=>t.id>current.id); i=forward?(after<0?list.length-1:after-1):(after<0?list.length:after); }
  return forward?list[(i+1)%list.length]:list[(i-1+list.length)%list.length];
}
function queueNext(){
  queued=null; if(repeat)return;
  queued=pickNext(true);
  if(queued&&queued.src){ try{ preloader.src=queued.src; preloader.load(); }catch(e){} }
}

/* ---------- анализ звука ---------- */
const IOS=/iP(hone|ad|od)/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
let actx=null, analyser=null, freq=null;
function initGraph(){
  if(actx||IOS)return;
  try{
    const AC=window.AudioContext||window.webkitAudioContext; if(!AC)return;
    actx=new AC();
    const src=actx.createMediaElementSource(audio);
    analyser=actx.createAnalyser(); analyser.fftSize=1024; analyser.smoothingTimeConstant=.72;
    src.connect(analyser); analyser.connect(actx.destination);
    freq=new Uint8Array(analyser.frequencyBinCount);
  }catch(e){ actx=null; analyser=null; }
}
const L={on:false,bass:0,mid:0,high:0,energy:0,beat:false,strength:1};
let bassAvg=.2, lastBeat=0, fakePhase=0;
function avg(a,b){ let s=0; for(let i=a;i<b;i++)s+=freq[i]; return s/((b-a)*255); }
function analyse(now,dt){
  L.beat=false; L.on=playing;
  if(!playing){ L.bass*=.9; L.mid*=.9; L.high*=.9; L.energy*=.9; return; }
  if(analyser&&actx&&actx.state==='running'){
    analyser.getByteFrequencyData(freq);
    L.bass=avg(1,5); L.mid=avg(5,40); L.high=avg(40,180);
    L.energy=L.bass*.55+L.mid*.35+L.high*.1;
    bassAvg+=(L.bass-bassAvg)*Math.min(1,dt*1.6);
    if(L.bass>bassAvg*1.18&&L.bass>.3&&now-lastBeat>260){ lastBeat=now; L.beat=true; L.strength=L.bass/Math.max(.05,bassAvg); }
  } else {
    /* имитация: ровный пульс около 112 ударов в минуту */
    fakePhase+=dt*112/60;
    if(fakePhase>=1){ fakePhase-=1; L.beat=true; L.strength=1.2+Math.random()*.6; lastBeat=now; }
    const env=Math.exp(-((now-lastBeat)/1000)*6);
    L.bass=.25+env*.5; L.mid=.3+Math.sin(now/700)*.1; L.high=.2+Math.random()*.1; L.energy=.32+Math.sin(now/5000)*.08;
  }
}

/* ---------- визуализатор (живой) ---------- */
const VIZ_N=28, vizEls=[], vizCur=[];
(function(){ const c=$('visualizer'); for(let i=0;i<VIZ_N;i++){ const b=document.createElement('div'); b.className='viz-bar'; c.appendChild(b); vizEls.push(b); vizCur.push(3); } })();
const vizBins=[]; for(let i=0;i<=VIZ_N;i++)vizBins.push(Math.round(2*Math.pow(180/2,i/VIZ_N)));
function vizFrame(){
  for(let i=0;i<VIZ_N;i++){
    let tgt=3;
    if(playing){
      if(analyser&&freq&&actx&&actx.state==='running'){ const a=vizBins[i], b=Math.max(a+1,vizBins[i+1]); let s=0; for(let k=a;k<b;k++)s+=freq[k]; const v=s/((b-a)*255); tgt=3+Math.pow(v,1.25)*34; }
      else tgt=3+(Math.random()<.16?Math.random()*34:vizCur[i]-3)*(.6+L.bass*.6);
    }
    vizCur[i]+=(tgt-vizCur[i])*(playing?.35:.17);
    vizEls[i].style.height=vizCur[i].toFixed(1)+'px';
    vizEls[i].style.opacity=(.3+((vizCur[i]-3)/34)*.6).toFixed(2);
  }
}
let lastNow=performance.now();
function loop(now){
  requestAnimationFrame(loop);
  if(document.hidden)return;
  const dt=Math.min(.1,(now-lastNow)/1000); lastNow=now;
  analyse(now,dt); vizFrame();
}
requestAnimationFrame(loop);

/* ---------- робот ---------- */
const robot=window.AceonRobot?AceonRobot.create($('robot'),{base:'img/',levels:()=>L,tier:TIER,reduce,
  moves:()=>window.MusicExtras?MusicExtras.moves():null, skin:()=>window.MusicExtras?MusicExtras.skin():''}):{emote(){},wake(){}};

/* ---------- воспроизведение ---------- */
let playStart=0, countedPlay=false, lastTime=0, statSaveAt=0;
function playTrack(track,autoPlay){
  if(autoPlay===undefined)autoPlay=true;
  current=track; audio.src=track.src; countedPlay=false; lastTime=0;
  if(autoPlay){ initGraph(); if(actx&&actx.state==='suspended')actx.resume(); audio.play().catch(()=>{}); playing=true; }
  updatePlayer(); updateRows(); setMeta(track);
  if(TR)TR.event('music.track');
}
function playById(id){
  const t=byId(id); if(!t)return;
  playTab=activeTab;
  if(current&&current.id===id)togglePlay(); else playTrack(t,true);
}
function togglePlay(){
  initGraph(); if(actx&&actx.state==='suspended')actx.resume();
  if(!current){ const list=playList(); if(list.length)playTrack(list[0]); return; }
  if(playing){ audio.pause(); playing=false; } else { audio.play().catch(()=>{}); playing=true; }
  updatePlayer(); updateRows();
}
function skip(dir,user){ const n=pickNext(dir>0); if(n){ if(user)robot.emote('skip'); playTrack(n,playing||!!user); } }
function toggleShuffle(){ shuffle=!shuffle; mem.shuffle=shuffle; save(); $('btnShuffle').classList.toggle('active',shuffle); updateModes(); queueNext(); }
function toggleRepeat(){ repeat=!repeat; mem.repeat=repeat; save(); $('btnRepeat').classList.toggle('active',repeat); updateModes(); queueNext(); }
function seek(e){ if(!current||!audio.duration)return; const r=e.currentTarget.getBoundingClientRect(); audio.currentTime=((e.clientX-r.left)/r.width)*audio.duration; }
function toggleLike(id){
  if(favs.has(id))favs.delete(id); else { favs.add(id); robot.emote('like'); }
  syncMem(); updatePlayerLike(); renderTabs();
  if(activeTab==='favs')buildList(); else updateRows();
}

/* ---------- скрытые треки ---------- */
let toastT=null, lastHidden=null;
function hideTrack(id){
  if(hidden.has(id))return;
  hidden.add(id); syncMem(); lastHidden=id;
  robot.emote('hide');
  const row=listNodes[id];
  if(row){ row.classList.add('gone'); setTimeout(()=>{ buildList(); renderTabs(); },260); } else { buildList(); renderTabs(); }
  toast(T('hiddenToast'),true);
  queueNext();
  if(TR)TR.event('music.hide');
}
function restoreTrack(id,quiet){
  if(!hidden.has(id))return;
  hidden.delete(id); syncMem();
  buildList(); renderTabs(); queueNext();
  if(!quiet)toast(T('restored'),false);
}
function toast(text,undo){
  const el=$('toast'); clearTimeout(toastT);
  el.innerHTML='<span></span>'+(undo?'<button type="button"></button>':'');
  el.firstChild.textContent=text;
  if(undo){ const b=el.lastChild; b.textContent=T('undo'); b.onclick=()=>{ if(lastHidden!=null)restoreTrack(lastHidden,true); el.classList.remove('on'); }; }
  el.classList.add('on');
  toastT=setTimeout(()=>el.classList.remove('on'),5000);
}

function dayKey(dt){ const x=dt||new Date(); return x.getFullYear()+'-'+String(x.getMonth()+1).padStart(2,'0')+'-'+String(x.getDate()).padStart(2,'0'); }
/* ---------- плеер: вид ---------- */
function updatePlayer(){
  try{ document.dispatchEvent(new CustomEvent('mp:track',{detail:current})); }catch(e){}
  if(!current){ $('playerTitle').textContent=T('pick'); $('playerSub').textContent=T('pickSub'); return; }
  const col=trackColor(current.id), cov=$('playerCover');
  cov.style.background=col.bg; cov.style.color=col.fg; cov.textContent=trackInitials(current.title);
  $('playerTitle').textContent=current.title;
  $('playerSub').textContent=audio.duration?fmtTime(audio.duration):'...';
  $('playIcon').className=playing?'ti ti-player-pause':'ti ti-player-play';
  const pc=$('playerCard'); pc.style.setProperty('--glow',col.fg+'66'); pc.style.setProperty('--glow-bd',col.fg+'40');
  updatePlayerLike();
}
function updatePlayerLike(){
  if(!current)return;
  const liked=favs.has(current.id);
  $('playerLikeIcon').className=liked?'ti ti-heart-filled':'ti ti-heart';
  $('playerLike').classList.toggle('liked',liked);
}
function updateModes(){
  $('modeRow').style.display=(shuffle||repeat)?'flex':'none';
  $('badgeShuf').style.display=shuffle?'inline':'none';
  $('badgeRep').style.display=repeat?'inline':'none';
}
function renderTabs(){
  [['all','tabAll'],['favs','tabFavs'],['hidden','tabHidden']].forEach(([k,id])=>$(id).classList.toggle('active',activeTab===k));
  $('tabAlbums').classList.toggle('active',activeTab==='albums'||activeTab.indexOf('album:')===0);
  $('tabAlbums').textContent=T('albums'); $('tabAlbums').style.display=ALBUMS.length?'':'none';
  const nf=[...favs].filter(id=>!hidden.has(id)).length, nh=hidden.size;
  $('tabAll').textContent=T('all');
  $('tabFavs').innerHTML=esc(T('favs'))+(nf?' <span class="badge">'+nf+'</span>':'');
  $('tabHidden').innerHTML=esc(T('hidden'))+(nh?' <span class="badge dim">'+nh+'</span>':'');
  $('tabHidden').style.display=nh||activeTab==='hidden'?'':'none';
}
function setTab(t){ activeTab=t; renderTabs(); buildList(); }

/* ---------- список ---------- */
let listNodes={};
function albumCover(a){
  const ts=a.tracks.map(byIdRaw).filter(Boolean), c1=trackColor(ts[0]?ts[0].id:1), c2=trackColor(ts[1]?ts[1].id:2);
  return 'background:linear-gradient(135deg,'+c1.bg+','+c2.bg+');color:'+c1.fg;
}
function buildAlbums(el){
  el.innerHTML='';
  const grid=document.createElement('div'); grid.className='album-grid';
  ALBUMS.forEach((a,i)=>{
    const ts=albumTracks(a), card=document.createElement('div');
    card.className='album-card'; card.dataset.album=a.id; card.style.animationDelay=Math.min(i*.05,.4).toFixed(2)+'s';
    const playingHere=current&&a.tracks.indexOf(current.id)>=0;
    card.innerHTML='<div class="album-cover" style="'+albumCover(a)+'">'+esc(trackInitials(a.title))+'<button class="album-play" type="button"><i class="ti ti-player-play"></i></button></div>'
      +'<div class="album-title">'+esc(a.title)+'</div><div class="album-sub">'+ts.length+' '+esc(T('tracksShort'))+(playingHere?' · <b>'+esc(T('nowPlaying'))+'</b>':'')+'</div>';
    card.querySelector('.album-play').title=T('playAlbum');
    grid.appendChild(card);
  });
  el.appendChild(grid);
}
function playAlbum(id){
  const a=albumById(id), ts=albumTracks(a); if(!ts.length)return;
  playTab='album:'+id; playTrack(ts[0],true);
  if(TR)TR.event('music.album');
}
function buildList(){
  const el=$('trackList');
  listNodes={};
  if(activeTab==='albums'){ buildAlbums(el); return; }
  const list=getList();
  let head='';
  if(activeTab.indexOf('album:')===0){
    const a=albumById(activeTab.slice(6));
    head='<div class="album-head"><button class="album-back" type="button">&lt; '+esc(T('albums'))+'</button><div class="album-head-t">'+esc(a?a.title:'')+'</div><button class="album-playall" type="button"><i class="ti ti-player-play"></i> '+esc(T('playAlbum'))+'</button></div>';
  }
  if(!list.length){
    const icon=activeTab==='favs'?'heart':activeTab==='hidden'?'eye-off':'music';
    const txt=activeTab==='favs'?T('emptyFavs'):activeTab==='hidden'?T('emptyHidden'):T('emptyAll');
    el.innerHTML='<div class="empty"><i class="ti ti-'+icon+'"></i></div>'; el.firstChild.appendChild(document.createTextNode(txt));
    return;
  }
  el.innerHTML=head;
  const frag=document.createDocumentFragment(), hid=activeTab==='hidden';
  list.forEach((t,i)=>{
    const col=trackColor(t.id), row=document.createElement('div');
    row.className='track-row'+(hid?' is-hidden':''); row.dataset.id=t.id;
    row.style.animationDelay=Math.min(i*.03,.45).toFixed(2)+'s';
    row.innerHTML='<div class="row-num">'+(i+1)+'</div>'
      +'<div class="row-cover" style="background:'+col.bg+';color:'+col.fg+';">'+esc(trackInitials(t.title))+'</div>'
      +'<div class="row-title">'+esc(t.title)+(t.yt?' <span class="row-yt" aria-hidden="true"></span>':'')+'</div>'
      +(hid?'<button class="row-btn row-restore" type="button"><i class="ti ti-arrow-back-up"></i></button>'
           :'<button class="row-btn row-hide" type="button"><i class="ti ti-eye-off"></i></button><button class="row-heart" type="button"><i class="ti ti-heart"></i></button>');
    row._num=i+1; listNodes[t.id]=row; frag.appendChild(row);
  });
  el.appendChild(frag);
  el.querySelectorAll('.row-hide').forEach(b=>{ b.title=T('hide'); b.setAttribute('aria-label',T('hide')); });
  el.querySelectorAll('.row-restore').forEach(b=>{ b.title=T('restore'); b.setAttribute('aria-label',T('restore')); });
  el.querySelectorAll('.row-heart').forEach(b=>{ b.title=T('like'); b.setAttribute('aria-label',T('like')); });
  updateRows();
}
function updateRows(){
  for(const id in listNodes){
    const row=listNodes[id], isAct=!!(current&&current.id===+id), liked=favs.has(+id);
    if(row.classList.contains('active')!==isAct)row.classList.toggle('active',isAct);
    const num=row.firstChild;
    /* играет: прыгающие полоски (на наведении пауза); на паузе: значок play */
    const want=isAct?(playing?'<span class="eq"><i></i><i></i><i></i></span><i class="ti ti-player-pause eq-p"></i>':'<i class="ti ti-player-play" style="font-size:13px;"></i>'):String(row._num);
    if(num.innerHTML!==want)num.innerHTML=want;
    const hb=row.querySelector('.row-heart');
    if(hb&&hb.classList.contains('liked')!==liked){ hb.classList.toggle('liked',liked); hb.firstElementChild.className='ti ti-'+(liked?'heart-filled':'heart'); }
  }
}
$('trackList').addEventListener('click',e=>{
  const card=e.target.closest('.album-card');
  if(card){ if(e.target.closest('.album-play'))playAlbum(card.dataset.album); else setTab('album:'+card.dataset.album); return; }
  if(e.target.closest('.album-back')){ setTab('albums'); return; }
  if(e.target.closest('.album-playall')){ playAlbum(activeTab.slice(6)); return; }
  const row=e.target.closest('.track-row'); if(!row||row._swiped)return;
  const id=+row.dataset.id;
  if(e.target.closest('.row-heart')){ toggleLike(id); return; }
  if(e.target.closest('.row-hide')){ hideTrack(id); return; }
  if(e.target.closest('.row-restore')){ restoreTrack(id); return; }
  playById(id);
});
/* свайп влево на телефоне скрывает трек */
(function(){
  let row=null, x0=0, y0=0, dx=0, active=false;
  const list=$('trackList');
  list.addEventListener('touchstart',e=>{ if(activeTab==='hidden')return; row=e.target.closest('.track-row'); if(!row)return; x0=e.touches[0].clientX; y0=e.touches[0].clientY; dx=0; active=false; row._swiped=false; },{passive:true});
  list.addEventListener('touchmove',e=>{
    if(!row)return; const x=e.touches[0].clientX, y=e.touches[0].clientY; dx=x-x0;
    if(!active){ if(Math.abs(dx)>12&&Math.abs(dx)>Math.abs(y-y0)*1.4)active=true; else return; }
    if(dx<0){ row.style.transform='translateX('+dx+'px)'; row.style.opacity=String(Math.max(.25,1+dx/220)); }
  },{passive:true});
  list.addEventListener('touchend',()=>{
    if(!row)return;
    if(active){ row._swiped=true; const r=row; setTimeout(()=>{ r._swiped=false; },350);
      if(dx<-90){ hideTrack(+row.dataset.id); }
      else { row.style.transform=''; row.style.opacity=''; } }
    row=null;
  });
})();

/* ---------- события звука ---------- */
audio.addEventListener('timeupdate',()=>{
  if(!audio.duration)return;
  $('progressFill').style.width=(audio.currentTime/audio.duration*100)+'%';
  $('timeCur').textContent=fmtTime(audio.currentTime);
  $('timeTotal').textContent=fmtTime(audio.duration);
  /* статистика */
  if(current&&playing){
    const d=audio.currentTime-lastTime;
    if(d>0&&d<2){ const s=mem.stats[current.id]||(mem.stats[current.id]={n:0,s:0,last:0}); s.s=Math.round((s.s+d)*10)/10; s.last=Date.now();
      const day=dayKey(); mem.days=mem.days||{}; mem.days[day]=Math.round(((mem.days[day]||0)+d)*10)/10;
      try{ document.dispatchEvent(new CustomEvent('mp:tick',{detail:d})); }catch(e){}
      if(!countedPlay&&audio.currentTime>30){ countedPlay=true; s.n++; } }
    if(Date.now()-statSaveAt>10000){ statSaveAt=Date.now(); save(); }
  }
  lastTime=audio.currentTime;
  msPosition();
});
audio.addEventListener('loadedmetadata',()=>{ $('timeTotal').textContent=fmtTime(audio.duration); if(current)$('playerSub').textContent=fmtTime(audio.duration); msPosition(true); });
audio.addEventListener('ended',()=>{
  if(current&&!countedPlay){ const s=mem.stats[current.id]||(mem.stats[current.id]={n:0,s:0,last:0}); s.n++; countedPlay=true; save(); }
  if(repeat){ audio.currentTime=0; audio.play().catch(()=>{}); return; }
  const n=pickNext(true);
  if(n)playTrack(n,true); else { playing=false; $('playIcon').className='ti ti-player-play'; }
});
audio.addEventListener('play',()=>{ try{ document.dispatchEvent(new CustomEvent('mp:play',{detail:current})); }catch(e){}
  playing=true; $('playIcon').className='ti ti-player-pause'; setCoverPlaying(true); setStreamOn(true); updateRows(); robot.wake(); queueNext(); if('mediaSession' in navigator)navigator.mediaSession.playbackState='playing'; });
audio.addEventListener('pause',()=>{ playing=false; $('playIcon').className='ti ti-player-play'; setCoverPlaying(false); setStreamOn(false); updateRows(); save(); if('mediaSession' in navigator)navigator.mediaSession.playbackState='paused'; });
/* битый или пропавший файл: через секунду следующий */
audio.addEventListener('error',()=>{ if(current&&playing){ setTimeout(()=>{ if(playing||audio.paused)skip(1,false); },1200); } });
addEventListener('pagehide',save);

function setCoverPlaying(on){ $('coverWrap').classList.toggle('playing',on); $('playerCard').classList.toggle('playing',on); }
function setStreamOn(on){ $('streamStatus').classList.toggle('on',on); }

/* ---------- Media Session: экран блокировки, наушники ---------- */
let artUrl=null, msPosAt=0;
function makeArt(t){
  return new Promise(res=>{
    try{
      const c=document.createElement('canvas'); c.width=c.height=256; const g=c.getContext('2d'), col=trackColor(t.id);
      g.fillStyle=col.bg; g.fillRect(0,0,256,256);
      const gr=g.createRadialGradient(128,110,10,128,128,180); gr.addColorStop(0,col.fg+'55'); gr.addColorStop(1,'rgba(0,0,0,0)'); g.fillStyle=gr; g.fillRect(0,0,256,256);
      g.fillStyle=col.fg; g.font='600 96px Inter, system-ui, sans-serif'; g.textAlign='center'; g.textBaseline='middle'; g.fillText(trackInitials(t.title),128,118);
      g.font='500 18px JetBrains Mono, monospace'; g.globalAlpha=.7; g.fillText('A.C.EON',128,212);
      c.toBlob(b=>{ if(!b)return res(null); if(artUrl)URL.revokeObjectURL(artUrl); artUrl=URL.createObjectURL(b); res(artUrl); },'image/png');
    }catch(e){ res(null); }
  });
}
function setMeta(t){
  if(!('mediaSession' in navigator)||!window.MediaMetadata)return;
  makeArt(t).then(url=>{
    try{ navigator.mediaSession.metadata=new MediaMetadata({title:t.title,artist:'A.C.EON Studio',album:T('title'),artwork:url?[{src:url,sizes:'256x256',type:'image/png'}]:[]}); }catch(e){}
  });
}
function msPosition(force){
  if(!('mediaSession' in navigator)||!navigator.mediaSession.setPositionState||!audio.duration||!isFinite(audio.duration))return;
  const now=Date.now(); if(!force&&now-msPosAt<1000)return; msPosAt=now;
  try{ navigator.mediaSession.setPositionState({duration:audio.duration,playbackRate:audio.playbackRate||1,position:Math.min(audio.currentTime,audio.duration)}); }catch(e){}
}
if('mediaSession' in navigator){
  const ms=navigator.mediaSession, set=(a,f)=>{ try{ ms.setActionHandler(a,f); }catch(e){} };
  set('play',()=>{ if(!playing)togglePlay(); });
  set('pause',()=>{ if(playing)togglePlay(); });
  set('previoustrack',()=>skip(-1,false));
  set('nexttrack',()=>skip(1,false));
  set('seekto',d=>{ if(audio.duration&&d.seekTime!=null){ audio.currentTime=d.seekTime; msPosition(true); } });
  set('seekbackward',d=>{ audio.currentTime=Math.max(0,audio.currentTime-(d.seekOffset||10)); msPosition(true); });
  set('seekforward',d=>{ audio.currentTime=Math.min(audio.duration||0,audio.currentTime+(d.seekOffset||10)); msPosition(true); });
}

/* ---------- шапка ---------- */
$('btnShuffle').addEventListener('click',toggleShuffle);
$('btnRepeat').addEventListener('click',toggleRepeat);
$('btnPrev').addEventListener('click',()=>skip(-1,true));
$('btnNext').addEventListener('click',()=>skip(1,true));
$('btnPlay').addEventListener('click',togglePlay);
$('playerLike').addEventListener('click',()=>{ if(current)toggleLike(current.id); });
$('progress').addEventListener('click',seek);
$('tabAll').addEventListener('click',()=>setTab('all'));
$('tabAlbums').addEventListener('click',()=>setTab('albums'));
$('tabFavs').addEventListener('click',()=>setTab('favs'));
$('tabHidden').addEventListener('click',()=>setTab('hidden'));
$('back').addEventListener('click',()=>{
  if(PORTAL){ try{ parent.postMessage({aceon:'close'},location.origin); return; }catch(e){} }
  location.href='../';
});
const langBtn=$('langbtn'), langMenu=$('langmenu');
LANGS.forEach(c=>{
  const b=document.createElement('button'); b.type='button'; b.setAttribute('data-l',c);
  b.innerHTML='<b>'+c.toUpperCase()+'</b><span></span>'; b.lastChild.textContent=LANG_NAMES[c];
  b.addEventListener('click',()=>{ langMenu.classList.remove('on'); setLang(c); });
  langMenu.appendChild(b);
});
langBtn.addEventListener('click',e=>{ e.stopPropagation(); langMenu.classList.toggle('on'); });
document.addEventListener('click',()=>langMenu.classList.remove('on'));
/* пробел: пауза; стрелки: соседние треки */
addEventListener('keydown',e=>{
  if(e.target.closest&&e.target.closest('input,textarea'))return;
  const yv=document.getElementById('yt'); if(yv&&yv.classList.contains('on'))return;
  if(e.code==='Space'){ e.preventDefault(); togglePlay(); }
  else if(e.code==='ArrowRight'&&e.shiftKey)skip(1,true);
  else if(e.code==='ArrowLeft'&&e.shiftKey)skip(-1,true);
});

function applyTexts(){
  document.title='A.C.EON · '+T('title');
  $('pageTitle').textContent='◈ '+T('title');
  $('back').textContent=T('back');
  langBtn.textContent=lang().toUpperCase(); langBtn.title=T('lang');
  langMenu.querySelectorAll('button').forEach(b=>b.classList.toggle('sel',b.getAttribute('data-l')===lang()));
  $('badgeShuf').textContent=T('shuffle'); $('badgeRep').textContent=T('repeat');
  [['btnShuffle','shuffleT'],['btnPrev','prev'],['btnPlay','play'],['btnNext','next'],['btnRepeat','repeatT'],['playerLike','like']].forEach(([id,k])=>{ $(id).title=T(k); $(id).setAttribute('aria-label',T(k)); });
  renderTabs();
}

/* ---------- старт ---------- */
$('btnShuffle').classList.toggle('active',shuffle); $('btnRepeat').classList.toggle('active',repeat); updateModes();
applyTexts(); buildList(); updatePlayer();
/* для youtube.js: плавно остановить и вернуть музыку, робот, тексты */
let fadeT=null;
function fadeTo(v,ms,done){ clearInterval(fadeT); const from=audio.volume, t0=performance.now();
  fadeT=setInterval(()=>{ const k=Math.min(1,(performance.now()-t0)/ms); audio.volume=from+(v-from)*k; if(k>=1){ clearInterval(fadeT); if(done)done(); } },30); }
window.MusicPlayer={get playing(){ return playing; }, get current(){ return current; }, levels:L, robot, T, lang, mem, save, TRACKS, ALBUMS,
  trackColor, trackInitials, fmtTime, dayKey, byId:byIdRaw, hidden, favs, TIER, reduce, toast,
  pauseFade(cb){ if(!playing){ if(cb)cb(false); return; } fadeTo(0,500,()=>{ audio.pause(); audio.volume=1; if(cb)cb(true); }); },
  resumeFade(){ initGraph(); if(actx&&actx.state==='suspended')actx.resume(); audio.volume=0; audio.play().then(()=>fadeTo(1,800)).catch(()=>{ audio.volume=1; }); }};
})();
