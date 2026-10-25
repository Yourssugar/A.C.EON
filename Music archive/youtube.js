/* A.C.EON · Архив звука: видео с YouTube.
   Если у трека в TRACKS есть yt (любая ссылка на видео), рядом с названием мигает кнопка YouTube.
   По нажатию: робот разводит руки, наша музыка плавно затихает, из экрана робота бьёт луч
   и разворачивается окно с видео. Рядом стоит робот и реагирует на видео
   (смотрит и пританцовывает, на паузе ждёт, в конце радуется). Закрыть: X, Esc, клик мимо окна, "назад".
   Видео грузится через IFrame API YouTube (youtube-nocookie). Если автор запретил встраивание,
   вместо видео ссылка на YouTube. Если API не загрузился, обычный iframe без реакций робота. */
(function(){
'use strict';
const MP=window.MusicPlayer; if(!MP)return;
const T=MP.T, $=id=>document.getElementById(id);
const AU=window.AceonUniverse||{id:2};
const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;

function ytId(u){
  if(!u)return null;
  const m=String(u).match(/(?:youtu\.be\/|[?&]v=|\/embed\/|\/shorts\/|\/live\/)([A-Za-z0-9_-]{11})/);
  if(m)return m[1];
  return /^[A-Za-z0-9_-]{11}$/.test(u)?u:null;
}

/* кнопка у трека */
const btn=$('ytBtn');
document.addEventListener('mp:track',e=>{ const t=e.detail, id=t&&ytId(t.yt); btn.hidden=!id; btn.dataset.vid=id||''; });
function texts(){
  btn.title=T('yt'); btn.setAttribute('aria-label',T('yt'));
  const ch=$('ytChannel'); if(ch){ ch.title=T('channel'); ch.setAttribute('aria-label',T('channel')); }
  if($('yt-full')){ $('yt-full').title=T('ytFull'); $('yt-x').title=T('ytClose'); $('yt-ext').title=T('ytExt'); $('yt-blocked').firstChild.textContent=T('ytBlocked'); $('yt-blocked').lastChild.textContent=T('ytExt'); }
}

/* окно */
const ov=document.createElement('div'); ov.id='yt';
ov.innerHTML='<div id="yt-back"></div><div id="yt-beam"></div>'
  +'<div id="yt-row"><div id="yt-robot-wrap"><canvas id="yt-robot" aria-hidden="true"></canvas></div>'
  +'<div id="yt-panel"><div class="yt-frame" id="yt-frame"></div><div id="yt-scan"></div>'
  +'<div id="yt-blocked"><span></span><a target="_blank" rel="noopener"></a></div>'
  +'<div id="yt-tools"><button id="yt-full" type="button"><i class="ti ti-maximize"></i></button>'
  +'<a id="yt-ext" target="_blank" rel="noopener"><i class="ti ti-external-link"></i></a>'
  +'<button id="yt-x" type="button"><i class="ti ti-x"></i></button></div></div></div>';
document.body.appendChild(ov);
texts();
document.addEventListener('click',e=>{ if(e.target.closest('#langmenu button'))setTimeout(texts,0); });

/* уровни для робота у видео: звука YouTube нам не слышно, поэтому ровный ритм, пока видео играет */
const VL={on:false,bass:0,mid:0,high:0,energy:.3,beat:false,strength:1.3};
let vlPhase=0, vlLast=performance.now(), vlBeat=0;
function vlTick(){
  const now=performance.now(), dt=Math.min(.1,(now-vlLast)/1000); vlLast=now;
  VL.beat=false;
  if(VL.on){ vlPhase+=dt*100/60; if(vlPhase>=1){ vlPhase-=1; VL.beat=true; vlBeat=now; VL.strength=1.2+Math.random()*.4; } }
  const env=Math.exp(-((now-vlBeat)/1000)*6);
  VL.bass=VL.on?.2+env*.4:0; VL.mid=VL.on?.3:0; VL.energy=VL.on?.3:0;
  return VL;
}

let player=null, side=null, open=false, wasPlaying=false, pushed=false, apiState='none', vid=null, beamT=null;
function loadApi(cb){
  if(window.YT&&window.YT.Player){ apiState='ready'; cb(true); return; }
  if(apiState==='loading'){ const w=setInterval(()=>{ if(apiState!=='loading'){ clearInterval(w); cb(apiState==='ready'); } },100); return; }
  apiState='loading';
  const prev=window.onYouTubeIframeAPIReady;
  window.onYouTubeIframeAPIReady=function(){ apiState='ready'; if(prev)try{ prev(); }catch(e){} cb(true); };
  const s=document.createElement('script'); s.src='https://www.youtube.com/iframe_api'; s.async=true;
  s.onerror=()=>{ apiState='fail'; cb(false); };
  document.head.appendChild(s);
  setTimeout(()=>{ if(apiState==='loading'){ apiState='fail'; cb(false); } },5000);
}
function mountVideo(id){
  const box=$('yt-frame'); box.innerHTML='<div id="yt-slot"></div>';
  $('yt-blocked').classList.remove('on');
  const watch='https://www.youtube.com/watch?v='+id;
  $('yt-ext').href=watch; $('yt-blocked').lastChild.href=watch;
  loadApi(ok=>{
    if(!open||vid!==id)return;
    if(ok){
      player=new YT.Player('yt-slot',{host:'https://www.youtube-nocookie.com',videoId:id,
        playerVars:{autoplay:1,rel:0,modestbranding:1,playsinline:1,origin:location.origin},
        events:{
          onReady:e=>{ try{ e.target.playVideo(); }catch(er){} },
          onStateChange:e=>{
            const st=e.data;
            VL.on=(st===1);
            if(st===0&&side)side.emote('like');
            if(st===2&&side)side.wake();
          },
          onError:e=>{ if([2,5,100,101,150].indexOf(e.data)>=0){ $('yt-blocked').classList.add('on'); if(side)side.emote('hide'); } }
        }});
    } else {
      /* без API: обычный iframe */
      box.innerHTML='<iframe src="https://www.youtube-nocookie.com/embed/'+id+'?autoplay=1&rel=0&modestbranding=1&playsinline=1" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe>';
      VL.on=true;
    }
  });
}

/* луч проектора: от экрана робота к ближайшему краю окна */
function placeBeam(){
  const beam=$('yt-beam'), rc=$('yt-robot').getBoundingClientRect(), pr=$('yt-panel').getBoundingClientRect();
  const hx=rc.left+rc.width/2, hy=rc.top+rc.height*.3;
  let pts;
  if(pr.left>=rc.right-10) pts=[[hx,hy],[pr.left,pr.top+8],[pr.left,pr.bottom-8]];
  else pts=[[hx,hy],[pr.left+8,pr.top],[pr.right-8,pr.top]];
  const xs=pts.map(p=>p[0]), ys=pts.map(p=>p[1]);
  const x0=Math.min(...xs), y0=Math.min(...ys), w=Math.max(4,Math.max(...xs)-x0), h=Math.max(4,Math.max(...ys)-y0);
  beam.style.left=x0+'px'; beam.style.top=y0+'px'; beam.style.width=w+'px'; beam.style.height=h+'px';
  beam.style.clipPath='polygon('+pts.map(p=>((p[0]-x0)/w*100).toFixed(1)+'% '+((p[1]-y0)/h*100).toFixed(1)+'%').join(',')+')';
  beam.style.background=pr.left>=rc.right-10?'linear-gradient(to right, rgba(196,181,253,.42), rgba(124,58,237,.05))':'linear-gradient(to bottom, rgba(196,181,253,.42), rgba(124,58,237,.05))';
  /* окно растёт из головы робота */
  const panel=$('yt-panel');
  panel.style.transformOrigin=(hx-pr.left)+'px '+(hy-pr.top)+'px';
}

function openVideo(id){
  if(open||!id)return;
  open=true; vid=id;
  if(MP.robot)MP.robot.emote('present');
  MP.pauseFade(was=>{ wasPlaying=was; });
  try{ history.pushState({ytv:1},''); pushed=true; }catch(e){ pushed=false; }
  setTimeout(()=>{
    if(!open)return;
    ov.classList.add('on'); ov.classList.remove('closing');
    if(window.AceonRobot&&!side) side=AceonRobot.create($('yt-robot'),{base:'img/',levels:vlTick,tier:AU.id||2,reduce});
    if(side)side.emote('present');
    requestAnimationFrame(()=>{ placeBeam(); requestAnimationFrame(()=>ov.classList.add('show')); });
    clearTimeout(beamT); beamT=setTimeout(()=>$('yt-beam').style.opacity='.18',1600);
    mountVideo(id);
  },reduce?0:380);
}
function closeVideo(fromPop){
  if(!open)return;
  open=false;
  if(side)side.emote('bye');
  $('yt-beam').style.opacity='';
  ov.classList.remove('show'); ov.classList.add('closing');
  if(document.fullscreenElement)try{ document.exitFullscreen(); }catch(e){}
  setTimeout(()=>{
    try{ if(player&&player.destroy)player.destroy(); }catch(e){}
    player=null; $('yt-frame').innerHTML=''; VL.on=false;
    ov.classList.remove('on','closing');
    if(side){ side.destroy(); side=null; }
    if(MP.robot)MP.robot.emote('bye');
    if(wasPlaying)MP.resumeFade();
  },reduce?50:750);
  if(pushed&&!fromPop){ pushed=false; try{ history.back(); }catch(e){} }
  pushed=false;
}

btn.addEventListener('click',()=>openVideo(btn.dataset.vid));
/* кнопка YouTube в строке трека: видео открывается сразу, без выбора трека и прокрутки к плееру */
window.MusicYT={open(trackId){ const t=MP.TRACKS.find(x=>x.id===trackId); const v=t&&ytId(t.yt); if(v)openVideo(v); }};
$('yt-x').addEventListener('click',()=>closeVideo(false));
$('yt-back').addEventListener('click',()=>closeVideo(false));
$('yt-full').addEventListener('click',()=>{
  const p=$('yt-panel');
  if(document.fullscreenElement){ try{ document.exitFullscreen(); }catch(e){} return; }
  const fn=p.requestFullscreen||p.webkitRequestFullscreen; if(fn)try{ fn.call(p); }catch(e){}
});
addEventListener('keydown',e=>{ if(e.key==='Escape'&&open&&!document.fullscreenElement)closeVideo(false); });
addEventListener('popstate',()=>{ if(open)closeVideo(true); });
addEventListener('resize',()=>{ if(open)placeBeam(); });
})();
