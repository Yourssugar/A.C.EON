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
  +'<div class="cass-grid"><canvas id="cassCv" width="1200" height="860"></canvas>'
  +'<div class="cass-stage" id="cassStage"><canvas id="cassRobot" aria-hidden="true"></canvas><div class="cass-floor"></div><div class="cass-move" id="cassMove"></div></div>'
  +'<div class="cass-actions"><button id="cassSave" type="button"><i class="ti ti-download"></i> <span></span></button></div>'
  +'<div class="cass-sub" id="cassTapesT"></div>'
  +'<div class="cass-tapes" id="cassTapes"></div>'
  +'<div class="cass-secret" id="cassSecret"></div></div></div>';
document.body.appendChild(modal);
function rr(g,x,y,w,h,r){ g.beginPath(); g.moveTo(x+r,y); g.arcTo(x+w,y,x+w,y+h,r); g.arcTo(x+w,y+h,x,y+h,r); g.arcTo(x,y+h,x,y,r); g.arcTo(x,y,x+w,y,r); g.closePath(); }
function clip(g,s,w){ if(g.measureText(s).width<=w)return s; while(s.length>1&&g.measureText(s+'...').width>w)s=s.slice(0,-1); return s+'...'; }
/* кассета: картинка корпуса (img/cass-body.webp), за её прозрачными окнами крутятся катушки с плёнкой.
   Статика (корпус, наклейка, цифры) рисуется один раз в два слоя, каждый кадр докладываются только катушки. */
const CB={body:new Image(),reel:new Image()}; let cbOk=0;
CB.body.onload=CB.reel.onload=()=>{ cbOk++; if(modal.classList.contains('on'))drawCard(); };
CB.body.src='img/cass-body.webp'; CB.reel.src='img/cass-reel.webp';
const CW=1200, CH=860, BX=40, BY=20, BW=1120, BK=BW/1416, BH=835*BK;
const HOLES=[[BX+397*BK,BY+442*BK],[BX+1019*BK,BY+442*BK]], HR=95*BK;
let layLo=null, layHi=null, reelA=0, cassRaf=0, cassLast=0;
function topTracks(n){ return Object.keys(mem.stats).map(id=>({t:MP.byId(+id),s:mem.stats[id]})).filter(x=>x.t&&x.s.s>=10&&!MP.hidden.has(x.t.id)).sort((a,b)=>b.s.s-a.s.s).slice(0,n); }
function layers(){
  layLo=document.createElement('canvas'); layLo.width=CW; layLo.height=CH;
  layHi=document.createElement('canvas'); layHi.width=CW; layHi.height=CH;
  let g=layLo.getContext('2d');
  const gr=g.createLinearGradient(0,0,0,CH); gr.addColorStop(0,'#160f2b'); gr.addColorStop(1,'#0b0816');
  rr(g,0,0,CW,CH,34); g.fillStyle=gr; g.fill();
  for(const [x,y] of HOLES){ g.beginPath(); g.arc(x,y,HR+6,0,6.283); g.fillStyle='#07050d'; g.fill(); }
  /* полоска с цифрами */
  const sy=BY+BH+18, sh=CH-sy-20;
  rr(g,BX,sy,BW,sh,22); g.fillStyle='rgba(124,58,237,.12)'; g.fill(); g.strokeStyle='rgba(196,181,253,.22)'; g.lineWidth=2; g.stroke();
  const nums=[[Math.round(totalSec()/60),T('statMin')],[streak(),T('statStreak')],[heardCount()+'/'+MP.TRACKS.length,T('statHeard')],[unlocked().length+'/'+TAPES.length,T('statMoves')]];
  const colW=(BW-200)/4;
  nums.forEach((n,i)=>{
    const x=BX+28+i*colW;
    g.fillStyle='#ede8ff'; g.font='600 58px Inter, system-ui, sans-serif'; g.textBaseline='alphabetic'; g.fillText(String(n[0]),x,sy+70);
    g.fillStyle='#a99ad6'; g.font='400 24px Inter, system-ui, sans-serif'; wrap(g,n[1],x,sy+106,colW-20,27);
  });
  const gold=skin()==='gold';
  g.textAlign='center'; g.font='600 22px JetBrains Mono, monospace'; g.fillStyle=gold?'#ffd27a':'#c4b5fd';
  g.fillText(gold?'GOLD':'SIDE A',BX+BW-96,sy+sh/2+8); g.textAlign='left';
  /* корпус и наклейка */
  g=layHi.getContext('2d');
  g.drawImage(CB.body,BX,BY,BW,BH);
  const lx=BX+87*BK, ly=BY+80*BK, lw=(1328-87)*BK, lh=(297-80)*BK;
  g.fillStyle='#17112a'; g.font='600 34px Inter, system-ui, sans-serif';
  g.fillText(clip(g,'A.C.EON  ·  '+T('cassetteTitle'),lw-240),lx+30,ly+44);
  g.font='500 19px JetBrains Mono, monospace'; g.fillStyle='#6d5aa8'; g.textAlign='right'; g.fillText(MP.dayKey(new Date()),lx+lw-30,ly+42); g.textAlign='left';
  g.fillStyle='rgba(124,58,237,.55)'; g.fillRect(lx+30,ly+58,lw-60,3);
  const top=topTracks(3);
  if(!top.length){ g.font='400 26px Inter, system-ui, sans-serif'; g.fillStyle='#4a4065'; g.fillText(clip(g,T('noStats'),lw-60),lx+30,ly+104); }
  top.forEach((x,i)=>{
    const y=ly+96+i*34;
    g.fillStyle='#7c3aed'; g.font='600 18px JetBrains Mono, monospace'; g.fillText((i+1)+'.',lx+30,y);
    g.fillStyle='#17112a'; g.font='500 25px Inter, system-ui, sans-serif'; g.fillText(clip(g,x.t.title,lw-260),lx+62,y);
    g.fillStyle='#6d5aa8'; g.font='400 17px JetBrains Mono, monospace'; g.textAlign='right'; g.fillText(Math.round(x.s.s/60)+'m · '+(x.s.n||0)+'x',lx+lw-30,y); g.textAlign='left';
  });
}
function frameCard(){
  const cv=$('cassCv'), g=cv.getContext('2d');
  g.clearRect(0,0,CW,CH); g.drawImage(layLo,0,0);
  const k=Math.min(1,totalSec()/(3*3600)), rs=HR*.5;
  [[HOLES[0],1-k*.6],[HOLES[1],.4+k*.6]].forEach(([[x,y],f])=>{
    g.beginPath(); g.arc(x,y,rs*.62+f*(HR-rs*.62+4),0,6.283); g.fillStyle='#3a2914'; g.fill();
    g.strokeStyle='rgba(255,210,150,.08)'; g.lineWidth=1; for(let r=rs*.7;r<rs*.62+f*(HR-rs*.62);r+=5){ g.beginPath(); g.arc(x,y,r,0,6.283); g.stroke(); }
    g.save(); g.translate(x,y); g.rotate(reelA); g.drawImage(CB.reel,-rs,-rs,rs*2,rs*2); g.restore();
  });
  g.drawImage(layHi,0,0);
}
function cassTick(now){
  cassRaf=0; if(!modal.classList.contains('on'))return;
  cassRaf=requestAnimationFrame(cassTick);
  if(now-cassLast<32)return;
  const dt=Math.min(.1,(now-(cassLast||now))/1000); cassLast=now;
  reelA-=dt*(MP.playing?2.6:.45); frameCard();
}
function drawCard(){
  const cv=$('cassCv');
  if(cbOk<2||!CB.body.naturalWidth||!CB.reel.naturalWidth){ drawOld(); return; }
  if(cv.height!==CH)cv.height=CH;
  layers(); frameCard();
  if(!MP.reduce&&!cassRaf&&modal.classList.contains('on')){ cassLast=0; cassRaf=requestAnimationFrame(cassTick); }
}
function drawOld(){
  const cv=$('cassCv'), g=cv.getContext('2d'), W=1200, H=680;
  cv.height=680;
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
    el.innerHTML='<span class="tape-pic" style="background-image:url(img/tape-'+i+'.webp)"></span><span class="tape-name"></span><span class="tape-sub"></span>';
    el.querySelector('.tape-name').textContent=t.name;
    el.querySelector('.tape-sub').textContent=ok?T('learned'):fill(T('lockedAt'),{m:Math.ceil(t.min-m)});
    el.addEventListener('click',()=>{
      if(!ok){ if(mini)mini.emote('hide'); showMove(fill(T('lockedAt'),{m:Math.ceil(t.min-totalSec()/60)})); return; }
      const mv=t.special||(t.poses?t.poses[Math.random()*t.poses.length|0]:undefined);
      if(mini)mini.emote('learn',mv); else MP.robot.emote('learn',mv);
      showMove(t.name);
      box.querySelectorAll('.tape').forEach(x=>x.classList.toggle('sel',x===el));
    });
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
/* робот прямо у кассеты: играет музыка, танцует под неё; тишина, танцует под ровный счёт, чтобы движения было видно */
let mini=null, moveT=null;
const DL={on:true,bass:0,mid:.3,high:.2,energy:.45,beat:false,strength:1.3};
let dPhase=0, dLast=performance.now(), dBeat=0;
function demo(){
  if(MP.playing)return MP.levels;
  const now=performance.now(), dt=Math.min(.1,(now-dLast)/1000); dLast=now;
  DL.beat=false; dPhase+=dt*112/60;
  if(dPhase>=1){ dPhase-=1; DL.beat=true; dBeat=now; DL.strength=1.25+Math.random()*.45; }
  const env=Math.exp(-((now-dBeat)/1000)*6); DL.bass=.25+env*.5; DL.energy=.42+env*.2;
  return DL;
}
function showMove(txt){ const m=$('cassMove'); m.textContent=txt; m.classList.add('on'); clearTimeout(moveT); moveT=setTimeout(()=>m.classList.remove('on'),2200); }
function openCass(){
  texts(); modal.classList.add('on'); drawCard(); renderTapes(); if(TR)TR.event('music.cassette');
  if(window.AceonRobot&&!mini){
    mini=AceonRobot.create($('cassRobot'),{base:'img/',levels:demo,tier:MP.TIER,reduce:MP.reduce,moves:()=>moves(),skin:()=>skin()});
    setTimeout(()=>{ if(mini)mini.emote('present'); },120);
  }
}
function closeCass(){ modal.classList.remove('on'); if(mini){ try{ mini.destroy(); }catch(e){} mini=null; } }
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
