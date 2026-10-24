/* A.C.EON · Архив звука: то, ради чего возвращаются.
   - Робот учится: за минуты прослушивания открываются кассеты с движениями (BASIC сразу, дальше по времени).
   - Робот помнит любимый трек (больше всего секунд, от 3 прослушиваний) и говорит об этом.
   - Твоя кассета: карточка прослушиваний (топ треков, минуты, дни подряд, услышано, движения), сохраняется картинкой.
   - Секрет: кто услышал все треки, получает золотого робота (переключается в карточке).
   Данные берутся из MusicPlayer.mem (stats, days); своё хранится там же: learned, gold, skin, lastVisit. */
(function(){
'use strict';
const MP=window.MusicPlayer; if(!MP)return;
const T=MP.T, mem=MP.mem, $=id=>document.getElementById(id);
const TR=window.Trace||null;
const esc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
const fill=(s,v)=>s.replace(/\{(\w+)\}/g,(m,n)=>v[n]!==undefined?v[n]:m);

/* кассеты робота: позы (номера в robot.js) и особые движения; min = минуты прослушивания */
const TAPES=[
  {id:'basic',name:'BASIC',min:0,poses:[0,3,8,9]},
  {id:'pl',name:'POINT L',min:8,poses:[1]},
  {id:'pr',name:'POINT R',min:16,poses:[2]},
  {id:'dl',name:'DISCO L',min:24,poses:[4]},
  {id:'dr',name:'DISCO R',min:32,poses:[5]},
  {id:'cross',name:'CROSS',min:44,poses:[6,7]},
  {id:'wave',name:'WAVE',min:60,special:'wave'},
  {id:'slide',name:'SLIDE',min:90,special:'slide'},
  {id:'headbang',name:'HEADBANG',min:120,special:'headbang'},
  {id:'flip',name:'FLIP',min:180,special:'flip'}
];
const COLORS=['#a78bfa','#7dd3fc','#6ee7b7','#fde68a','#fdba74','#f9a8d4','#fca5a5','#5eead4','#c4b5fd','#ffd27a'];

function totalSec(){ let s=0; for(const id in mem.stats)s+=mem.stats[id].s||0; return s; }
function unlocked(){ const m=totalSec()/60; return TAPES.filter(t=>m>=t.min); }
function moves(){ const u=unlocked(), poses=[], specials=[]; u.forEach(t=>{ if(t.poses)poses.push(...t.poses); if(t.special)specials.push(t.special); }); return {poses,specials}; }
function skin(){ return mem.gold&&mem.skin==='gold'?'gold':''; }
function heard(id){ const s=mem.stats[id]; return !!(s&&(s.n>=1||s.s>=30)); }
function heardCount(){ return MP.TRACKS.filter(t=>heard(t.id)).length; }
function favTrack(){
  let best=null, bs=0;
  for(const id in mem.stats){ const s=mem.stats[id]; if(s.n>=3&&s.s>bs){ const t=MP.byId(+id); if(t&&!MP.hidden.has(t.id)){ best=t; bs=s.s; } } }
  return best;
}
function streak(){
  const days=mem.days||{}; let n=0; const d=new Date();
  if(!((days[MP.dayKey(d)]||0)>=60)) d.setDate(d.getDate()-1);   // сегодня ещё не слушал: считаем от вчера
  while((days[MP.dayKey(d)]||0)>=60){ n++; d.setDate(d.getDate()-1); }
  return n;
}

/* ---------- реплика над роботом ---------- */
const bub=$('rbBubble'); let bubT=null;
function say(text,ms){
  if(!bub||!text)return;
  bub.textContent=text; bub.classList.add('on');
  clearTimeout(bubT); bubT=setTimeout(()=>bub.classList.remove('on'),ms||4200);
}

/* ---------- обучение и секрет ---------- */
if(mem.learned===undefined){ mem.learned=unlocked().length; MP.save(); }
function checkProgress(){
  const n=unlocked().length;
  if(n>(mem.learned||0)){
    const tape=TAPES[n-1]; mem.learned=n; MP.save();
    say(fill(T('sayLearn'),{m:tape.name}),4500);
    MP.toast(fill(T('learnToast'),{m:tape.name}),false);
    MP.robot.emote('learn',tape.special||(tape.poses?tape.poses[0]:undefined));
    if(TR)TR.event('music.learn');
  }
  if(!mem.gold&&heardCount()>=MP.TRACKS.length){
    mem.gold=true; mem.skin='gold'; MP.save();
    setTimeout(()=>{ say(T('sayGold'),5500); MP.toast(T('secretDone'),false); MP.robot.emote('learn','flip'); },600);
    if(TR)TR.event('music.all');
  }
}
let tickAcc=0;
document.addEventListener('mp:tick',e=>{ tickAcc+=e.detail||0; if(tickAcc>=5){ tickAcc=0; checkProgress(); } });

/* ---------- любимый трек и возвращение ---------- */
let favSaid=false;
document.addEventListener('mp:play',e=>{
  const t=e.detail, f=favTrack();
  if(t&&f&&t.id===f.id&&!favSaid){ favSaid=true; setTimeout(()=>say(fill(T('sayFav'),{t:t.title})),1200); }
});
(function(){
  const now=Date.now(), last=mem.lastVisit||0, f=favTrack();
  if(last&&now-last>20*3600e3&&f)setTimeout(()=>say(fill(T('sayBack'),{t:f.title}),5000),2500);
  mem.lastVisit=now; MP.save();
})();

/* ---------- твоя кассета ---------- */
const modal=document.createElement('div'); modal.id='cass';
modal.innerHTML='<div class="cass-box"><div class="cass-head"><span id="cassT"></span><button id="cassX" type="button"><i class="ti ti-x"></i></button></div>'
  +'<canvas id="cassCv" width="1200" height="680"></canvas>'
  +'<div class="cass-actions"><button id="cassSave" type="button"><i class="ti ti-download"></i> <span></span></button></div>'
  +'<div class="cass-sub" id="cassTapesT"></div><div class="cass-tapes" id="cassTapes"></div>'
  +'<div class="cass-secret" id="cassSecret"></div></div>';
document.body.appendChild(modal);
function rr(g,x,y,w,h,r){ g.beginPath(); g.moveTo(x+r,y); g.arcTo(x+w,y,x+w,y+h,r); g.arcTo(x+w,y+h,x,y+h,r); g.arcTo(x,y+h,x,y,r); g.arcTo(x,y,x+w,y,r); g.closePath(); }
function clip(g,s,w){ if(g.measureText(s).width<=w)return s; while(s.length>1&&g.measureText(s+'...').width>w)s=s.slice(0,-1); return s+'...'; }
function drawCard(){
  const cv=$('cassCv'), g=cv.getContext('2d'), W=1200, H=680;
  g.clearRect(0,0,W,H);
  /* корпус кассеты */
  const gr=g.createLinearGradient(0,0,W,H); gr.addColorStop(0,'#1d1536'); gr.addColorStop(1,'#0e0a1a');
  rr(g,8,8,W-16,H-16,36); g.fillStyle=gr; g.fill(); g.lineWidth=3; g.strokeStyle='rgba(196,181,253,.35)'; g.stroke();
  for(const [x,y] of [[40,40],[W-40,40],[40,H-40],[W-40,H-40]]){ g.beginPath(); g.arc(x,y,9,0,6.283); g.fillStyle='#2a2045'; g.fill(); }
  /* наклейка */
  rr(g,60,52,W-120,330,22); g.fillStyle='#ede8ff'; g.fill();
  g.fillStyle='#7c3aed'; g.fillRect(60,96,W-120,6);
  g.fillStyle='#17112a'; g.font='600 34px Inter, system-ui, sans-serif'; g.textBaseline='alphabetic';
  g.fillText('A.C.EON  ·  '+T('cassetteTitle'),92,86);
  g.font='500 20px JetBrains Mono, monospace'; g.fillStyle='#6d5aa8';
  const d=new Date(); g.textAlign='right'; g.fillText(MP.dayKey(d),W-92,86); g.textAlign='left';
  /* топ треков */
  const top=Object.keys(mem.stats).map(id=>({t:MP.byId(+id),s:mem.stats[id]})).filter(x=>x.t&&x.s.s>=10).sort((a,b)=>b.s.s-a.s.s).slice(0,5);
  g.font='600 20px Inter, system-ui, sans-serif'; g.fillStyle='#7c3aed'; g.fillText(T('topTracks').toUpperCase(),92,140);
  if(!top.length){ g.font='400 24px Inter, system-ui, sans-serif'; g.fillStyle='#4a4065'; g.fillText(clip(g,T('noStats'),620),92,184); }
  top.forEach((x,i)=>{
    const y=184+i*40, col=MP.trackColor(x.t.id);
    g.fillStyle=col.bg; rr(g,92,y-26,34,34,8); g.fill(); g.fillStyle=col.fg; g.font='600 15px Inter, sans-serif'; g.textAlign='center'; g.fillText(MP.trackInitials(x.t.title),109,y-4); g.textAlign='left';
    g.fillStyle='#17112a'; g.font='500 24px Inter, system-ui, sans-serif'; g.fillText(clip(g,x.t.title,440),140,y);
    g.fillStyle='#6d5aa8'; g.font='400 18px JetBrains Mono, monospace'; g.fillText(Math.round(x.s.s/60)+'m · '+(x.s.n||0)+'x',600,y);
  });
  /* цифры */
  const nums=[[Math.round(totalSec()/60),T('statMin')],[streak(),T('statStreak')],[heardCount()+'/'+MP.TRACKS.length,T('statHeard')],[unlocked().length+'/'+TAPES.length,T('statMoves')]];
  nums.forEach((n,i)=>{
    const x=780+(i%2)*170, y=176+Math.floor(i/2)*120;
    g.fillStyle='#17112a'; g.font='600 48px Inter, system-ui, sans-serif'; g.fillText(String(n[0]),x,y);
    g.fillStyle='#6d5aa8'; g.font='400 17px Inter, system-ui, sans-serif'; wrap(g,n[1],x,y+28,150,20);
  });
  /* окно с катушками */
  rr(g,300,420,600,180,90); g.fillStyle='#0a0714'; g.fill(); g.strokeStyle='rgba(196,181,253,.25)'; g.lineWidth=3; g.stroke();
  const tapeK=Math.min(1,totalSec()/(3*3600));
  [[400,510,1-tapeK*.6],[800,510,.4+tapeK*.6]].forEach(([x,y,k])=>{
    g.beginPath(); g.arc(x,y,40+k*36,0,6.283); g.fillStyle='#3b2a14'; g.fill();
    g.beginPath(); g.arc(x,y,34,0,6.283); g.fillStyle='#ede8ff'; g.fill();
    for(let a=0;a<6;a++){ g.save(); g.translate(x,y); g.rotate(a*Math.PI/3); g.fillStyle='#17112a'; g.fillRect(-4,-30,8,16); g.restore(); }
  });
  g.fillStyle='#4a4065'; g.font='500 18px JetBrains Mono, monospace'; g.textAlign='center'; g.fillText('SIDE A',W/2,650); g.textAlign='left';
  if(skin()==='gold'){ g.fillStyle='#ffd27a'; g.font='600 18px JetBrains Mono, monospace'; g.fillText('GOLD',W-150,650); }
}
function wrap(g,text,x,y,w,lh){ const words=String(text).split(' '); let line=''; for(const wd of words){ const tst=line?line+' '+wd:wd; if(g.measureText(tst).width>w&&line){ g.fillText(line,x,y); y+=lh; line=wd; } else line=tst; } if(line)g.fillText(line,x,y); }
function renderTapes(){
  const box=$('cassTapes'), m=totalSec()/60; box.innerHTML='';
  TAPES.forEach((t,i)=>{
    const ok=m>=t.min, el=document.createElement('button'); el.type='button';
    el.className='tape'+(ok?' ok':''); el.style.setProperty('--tc',COLORS[i]);
    el.innerHTML='<span class="tape-reels"><i></i><i></i></span><span class="tape-name"></span><span class="tape-sub"></span>';
    el.querySelector('.tape-name').textContent=t.name;
    el.querySelector('.tape-sub').textContent=ok?T('learned'):fill(T('lockedAt'),{m:Math.ceil(t.min-m)});
    if(ok)el.addEventListener('click',()=>{ MP.robot.emote('learn',t.special||(t.poses?t.poses[Math.random()*t.poses.length|0]:undefined)); });
    box.appendChild(el);
  });
  const sec=$('cassSecret');
  if(mem.gold){
    sec.innerHTML='<label class="gold-tg"><input type="checkbox" id="goldTg"> <span></span></label>';
    sec.querySelector('span').textContent=T('goldSkin');
    const tg=$('goldTg'); tg.checked=mem.skin==='gold';
    tg.addEventListener('change',()=>{ mem.skin=tg.checked?'gold':''; MP.save(); drawCard(); });
  } else {
    sec.innerHTML='<div class="secret-bar"><i style="width:'+(heardCount()/MP.TRACKS.length*100).toFixed(1)+'%"></i></div><div class="secret-t"></div>';
    sec.querySelector('.secret-t').textContent=T('secretHint')+'  '+heardCount()+'/'+MP.TRACKS.length;
  }
}
function texts(){
  $('cassT').textContent=T('cassette'); $('cassTapesT').textContent=T('robotTapes');
  $('cassSave').querySelector('span').textContent=T('save'); $('cassX').title=T('close');
  const b=$('cassBtn'); if(b){ b.title=T('cassette'); b.setAttribute('aria-label',T('cassette')); }
}
function openCass(){ texts(); drawCard(); renderTapes(); modal.classList.add('on'); if(TR)TR.event('music.cassette'); }
function closeCass(){ modal.classList.remove('on'); }
$('cassBtn').addEventListener('click',openCass);
$('cassX').addEventListener('click',closeCass);
modal.addEventListener('click',e=>{ if(e.target===modal)closeCass(); });
addEventListener('keydown',e=>{ if(e.key==='Escape'&&modal.classList.contains('on'))closeCass(); });
$('cassSave').addEventListener('click',()=>{
  drawCard();
  $('cassCv').toBlob(b=>{ if(!b)return; const a=document.createElement('a'); a.href=URL.createObjectURL(b); a.download='aceon-cassette-'+MP.dayKey()+'.png'; document.body.appendChild(a); a.click(); setTimeout(()=>{ URL.revokeObjectURL(a.href); a.remove(); },500); },'image/png');
});
document.addEventListener('click',e=>{ if(e.target.closest('#langmenu button'))setTimeout(()=>{ texts(); if(modal.classList.contains('on')){ drawCard(); renderTapes(); } },0); });
texts();

/* ---------- робот едет за страницей ----------
   На компьютере это делает position: sticky. На телефоне, когда плеер ушёл за верх экрана, робот спускается в угол
   (класс float), по нажатию возвращает к плееру. */
(function(){
  const col=document.querySelector('.robot-col'), wrap=$('robotWrap'); if(!col||!wrap||!('IntersectionObserver' in window))return;
  const narrow=matchMedia('(max-width: 820px)');
  let out=false;
  function apply(){ wrap.classList.toggle('float',out&&narrow.matches&&!document.getElementById('yt').classList.contains('on')); }
  new IntersectionObserver(es=>{ out=!es[0].isIntersecting&&es[0].boundingClientRect.top<0; apply(); },{threshold:0}).observe(col);
  narrow.addEventListener?narrow.addEventListener('change',apply):narrow.addListener(apply);
  wrap.addEventListener('click',()=>{ if(wrap.classList.contains('float'))scrollTo({top:0,behavior:MP.reduce?'auto':'smooth'}); });
})();

window.MusicExtras={moves,skin,say,TAPES};
})();
