/* LAYER_01 "Здравствуй, машина": общая страница вводного урока.
   Темы идут блоками в обычном потоке, въезжают при прокрутке (.rv -> .in), фон меняется по текущей теме.
   Робот NODE (../bot.js) стоит справа, говорит реплику темы и реагирует на ответы в пособиях.
   Пособия: nw угадай слово, so кому отдать задачу, li детектор выдумки, sl машина дел, pz собери запрос, to тон-метр, qz проверка.
   За пособия даются наклейки (6), хранятся в Store('aicourse').l01.st. Проверка от 3 из 5: слой пройден (aceon.nodeai.progress).
   Настоящий NODE: ../tutor.js (POST /api/tutor), без сервера работают заготовки. */
(function(){
'use strict';
const $=id=>document.getElementById(id);
const AU=window.AceonUniverse||{id:2,capMs:16,dprCap:1.5};
const TIER=AU.id||2;
const RM=matchMedia('(prefers-reduced-motion: reduce)').matches;
const TR=window.Trace||null;
if(RM)document.documentElement.classList.add('nomo');

/* ---------- язык ---------- */
const LL=window.L01_LANG||{};
const CODES=['en','ru','de','fr','es','it','pl'];
const hasI18n=!!(window.I18n&&window.Store);
function readSite(){ try{ return JSON.parse(localStorage.getItem('aceon:site')||'null')||{}; }catch(e){ return {}; } }
let fbLang=(function(){ const s=readSite().lang; if(CODES.indexOf(s)>=0)return s; const n=(navigator.languages||[navigator.language||'en']); for(const c of n){ const k=String(c).slice(0,2).toLowerCase(); if(CODES.indexOf(k)>=0)return k; } return 'en'; })();
const lang=()=>hasI18n?I18n.lang:fbLang;
const D=()=>LL[lang()]||LL.en;
function T(k,v){ const d=D(); let s=d[k]!==undefined?d[k]:(LL.en[k]!==undefined?LL.en[k]:k); if(typeof s==='string'&&v)s=s.replace(/\{(\w+)\}/g,(m,n)=>v[n]!==undefined?v[n]:m); return s; }
function setLang(c){
  if(CODES.indexOf(c)<0||c===lang())return;
  if(hasI18n)I18n.set(c); else { fbLang=c; const o=readSite(); o.lang=c; if(!o.v)o.v=1; try{ localStorage.setItem('aceon:site',JSON.stringify(o)); }catch(e){} }
  if(TR)TR.event('lang.change');
  texts(); TOOLS.forEach(t=>t.render());
}
const esc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
const pick=a=>a[Math.floor(Math.random()*a.length)];
const shuffle=a=>{ a=a.slice(); for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } return a; };
const wait=ms=>new Promise(r=>setTimeout(r,RM?0:ms));
/* значок из ../img/icons.webp (сетка 4x3) */
function icoS(i,sz){ const c=i%4, r=Math.floor(i/4); return 'width:'+sz+'px;height:'+sz+'px;background-size:'+(sz*4)+'px '+(sz*3)+'px;background-position:'+(-c*sz)+'px '+(-r*sz)+'px'; }
const ico=(i,sz)=>'<i class="ico" style="'+icoS(i,sz)+'"></i>';

/* ---------- память и наклейки ---------- */
let mem={level:null,l01:{st:[]}};
if(window.Store){ try{ Store.define('aicourse',{version:1,defaults:{level:null,l01:{st:[]}}}); mem=Store.get('aicourse'); if(!mem.l01)mem.l01={st:[]}; if(!Array.isArray(mem.l01.st))mem.l01.st=[]; }catch(e){} }
else { try{ const o=JSON.parse(localStorage.getItem('aceon:aicourse')||'null'); if(o){ mem=o; if(!mem.l01)mem.l01={st:[]}; } }catch(e){} }
function save(){ if(window.Store){ try{ Store.save('aicourse'); return; }catch(e){} } try{ localStorage.setItem('aceon:aicourse',JSON.stringify(mem)); }catch(e){} }
const ST_ICO=[3,5,6,4,1,9];
const has=n=>mem.l01.st.indexOf(n)>=0;
let toastT=null;
function sticker(n){
  if(has(n))return;
  mem.l01.st.push(n); mem.l01.st.sort(); save(); if(TR)TR.event('course.sticker');
  const t=$('toast'); t.querySelector('.ico').setAttribute('style',icoS(ST_ICO[n-1],30)); t.querySelector('span').textContent=T('st_got',{n:T('st'+n)});
  t.classList.remove('on'); void t.offsetWidth; t.classList.add('on'); clearTimeout(toastT); toastT=setTimeout(()=>t.classList.remove('on'),2600);
  const b=$('stk'); b.classList.remove('pop'); void b.offsetWidth; b.classList.add('pop');
  stickersUI();
}
function stickersUI(){
  $('stk').querySelector('span').textContent=mem.l01.st.length+'/6';
  const html=[1,2,3,4,5,6].map(n=>'<div class="stk'+(has(n)?' got':'')+'"><div class="disc">'+ico(ST_ICO[n-1],34)+'</div>'+esc(T('st'+n))+'</div>').join('');
  $('finSt').innerHTML=html; $('drSt').innerHTML=html;
  document.querySelectorAll('#map a').forEach((a,i)=>a.classList.toggle('got',has(i+1)));
  document.querySelectorAll('#drTopics .dbtn').forEach((a,i)=>{ const o=a.querySelector('.ok'); if(o)o.textContent=has(i+1)?'+':''; });
  const passed=layerDone(); $('finLock').style.display=passed?'none':'';
}
const PKEY='aceon.nodeai.progress';
function layerDone(){ try{ const a=JSON.parse(localStorage.getItem(PKEY)||'[]'); return Array.isArray(a)&&a.indexOf(1)>=0; }catch(e){ return false; } }
function completeLayer(){ try{ const a=JSON.parse(localStorage.getItem(PKEY)||'[]'); const b=Array.isArray(a)?a:[]; if(b.indexOf(1)<0)b.push(1); localStorage.setItem(PKEY,JSON.stringify(b.sort())); }catch(e){} if(window.NODEAI&&NODEAI.complete)try{ NODEAI.complete(1); }catch(e){} }

/* ---------- робот ---------- */
const bot=window.NodeBot?NodeBot.create({base:'../img/',reduce:RM}):null;
const bc=$('bot'), bx=bc.getContext('2d'), say=$('say'), hit=$('botHit');
let W=innerWidth,H=innerHeight,DPR=Math.min(AU.dprCap||1.5,devicePixelRatio||1);
addEventListener('resize',()=>{ W=innerWidth; H=innerHeight; DPR=Math.min(AU.dprCap||1.5,devicePixelRatio||1); });
let botMode='idle', botFace='happy', modeUntil=0, botT=0, mx=0, my=0, tmx=0, tmy=0;
addEventListener('pointermove',e=>{ tmx=e.clientX/W*2-1; tmy=e.clientY/H*2-1; },{passive:true});
function botPlace(){
  const narrow=W<=760, free=W-(Math.max(16,Math.min(96,W*.06))+Math.min(760,W-32))-24;
  if(narrow||free<200){ const h=Math.min(104,H*.13); return {x:W-h*.36-4,y:H-4,h,small:true}; }
  const h=Math.min(H*.44,free*1.25,380); return {x:W-free/2-8,y:H-14,h,small:false};
}
let sayT=null, typing=null;
function talk(txt,ms){
  if(!txt)return;
  clearTimeout(sayT); clearTimeout(typing); say.classList.add('on'); say.textContent='';
  let i=0; const step=()=>{ say.textContent=txt.slice(0,i); if(i++<txt.length)typing=setTimeout(step,RM?0:20); };
  if(RM)say.textContent=txt; else step();
  if(bot)bot.talk(Math.min(2400,txt.length*45));
  sayT=setTimeout(()=>say.classList.remove('on'),ms||Math.max(3200,txt.length*70));
}
function react(kind,line){
  if(!bot)return;
  if(kind==='ok'){ botMode='cheer'; bot.emote('happy',1400); }
  else if(kind==='bad'){ botMode='no'; bot.emote('wow',1200); }
  else if(kind==='think'){ botMode='think'; bot.emote('think',1500); }
  else if(kind==='wave'){ botMode='wave'; }
  modeUntil=botT+(kind==='wave'?2:1.3);
  if(line!==false)talk(line||pick(T(kind==='bad'?'bad':'ok')),2600);
}
let last=performance.now(), lastDraw=0;
function frame(now){
  requestAnimationFrame(frame);
  if(document.hidden||!bot)return;
  if(now-lastDraw<(AU.capMs||16)-1)return;
  const dt=Math.min(.1,(now-last)/1000); last=now; lastDraw=now; botT+=dt;
  mx+=(tmx-mx)*Math.min(1,dt*3); my+=(tmy-my)*Math.min(1,dt*3);
  const dw=Math.round(W*DPR), dh=Math.round(H*DPR);
  if(bc.width!==dw||bc.height!==dh){ bc.width=dw; bc.height=dh; }
  bx.setTransform(DPR,0,0,DPR,0,0); bx.clearRect(0,0,W,H);
  const p=botPlace();
  if(botT>modeUntil)botMode='idle';
  bot.set({form:'novice',mode:botMode,face:botFace,look:[mx*.6,my*.3]});
  bot.draw(bx,p.x,p.y,p.h,dt);
  const bw=p.h*.62, hh=p.small?p.h*.5:p.h; hit.style.transform='translate('+(p.x-bw/2).toFixed(0)+'px,'+(p.y-p.h).toFixed(0)+'px)'; hit.style.width=bw.toFixed(0)+'px'; hit.style.height=hh.toFixed(0)+'px';
  const sw=say.offsetWidth, sh=say.offsetHeight;
  say.style.transform='translate('+Math.round(Math.max(8,Math.min(W-sw-8,p.x-sw+bw*.3)))+'px,'+Math.round(Math.max(56,p.y-p.h*1.02-sh))+'px)';
}
if(bot){ requestAnimationFrame(frame); hit.addEventListener('click',()=>{ bot.jump(); react('ok',pick(T('ok'))); }); }
else { bc.style.display='none'; hit.style.display='none'; }

/* ---------- фон и текущая тема ---------- */
const BG=['bg-novice','bg-entry','bg-adv','bg-how','bg-novice','bg-how','bg-pro','bg-choose'];   /* потом заменить на img/l01-* */
const bgs=$('bgs'), bgEl=[]; let bgCur=-1;
const mob=()=>W/H<.8||W<=760;
BG.forEach(()=>{ const d=document.createElement('div'); d.className='bgi'; bgs.appendChild(d); bgEl.push(d); });
function setBg(i){
  if(i===bgCur)return; bgCur=i;
  bgEl.forEach((d,k)=>{ if(k===i&&!d.dataset.v){ d.style.backgroundImage='url("../img/'+BG[k]+'-'+(mob()?'m':'w')+'.webp")'; d.dataset.v=1; } d.classList.toggle('on',k===i); });
}
let curSec=-1;
const secs=[...document.querySelectorAll('main section')];
const vis=new Map();
const io=new IntersectionObserver(es=>{
  es.forEach(e=>vis.set(e.target,e.intersectionRatio));
  let best=null, br=0; vis.forEach((r,el)=>{ if(r>br){ br=r; best=el; } });
  if(best){ const i=+best.dataset.sec; if(i!==curSec){ curSec=i; setBg(i); botFace=i===6?'neutral':'happy'; if(i<7||layerDone())talk(T('say'+i)); else talk(T('fin_lock')); } }
},{threshold:[0,.2,.4,.6]});
secs.forEach(s=>io.observe(s));
const rio=new IntersectionObserver(es=>es.forEach(e=>{ if(e.isIntersecting){ e.target.classList.add('in'); rio.unobserve(e.target); } }),{threshold:.12,rootMargin:'0px 0px -6% 0px'});
document.querySelectorAll('.rv').forEach((el,i)=>{ el.style.transitionDelay=((i%4)*.06).toFixed(2)+'s'; rio.observe(el); });
addEventListener('scroll',()=>{ const h=document.documentElement.scrollHeight-innerHeight; $('prog').style.width=(h>0?scrollY/h*100:0).toFixed(1)+'%'; },{passive:true});

/* =========================================================
   Пособия
   ========================================================= */
const TOOLS=[];
function head(el,k,dk){ return '<h3><span class="tag">'+String(el).toUpperCase()+'</span><span>'+esc(T(k))+'</span></h3><p class="d">'+esc(T(dk))+'</p>'; }

/* 1. Угадай следующее слово */
TOOLS.push((function(){
  const box=$('nw'); let qi=Math.floor(Math.random()*6), you=null, heat=.35, rounds=0, busy=false;
  function probs(q){
    const T0=.3+heat*1.9, all=q.w.map(w=>[w[0],w[1],0]).concat(q.f.map(w=>[w[0],w[1],1]));
    const ws=all.map(a=>Math.pow(a[1]/100,1/T0)), s=ws.reduce((a,b)=>a+b,0);
    return all.map((a,i)=>({w:a[0],p:ws[i]/s,f:!!a[2]}));
  }
  function render(){
    const q=D().next[qi%D().next.length];
    box.innerHTML=head('01','nw_t','nw_d')
      +'<div class="nw-phrase"><span>'+esc(q.s)+'</span> <span class="blank" id="nwBlank">___</span></div>'
      +'<div class="row" id="nwOpts">'+shuffle(q.w).map(w=>'<button class="chip" type="button" data-w="'+esc(w[0])+'">'+esc(w[0])+'</button>').join('')
      +'<span id="nwFun" class="row" style="display:none">'+q.f.map(w=>'<button class="chip funny" type="button" data-w="'+esc(w[0])+'">'+esc(w[0])+'</button>').join('')+'</span></div>'
      +'<div class="nw-heat"><b>'+esc(T('nw_heat'))+'</b><span>'+esc(T('nw_lo'))+'</span><input type="range" min="0" max="100" value="'+Math.round(heat*100)+'" id="nwHeat"><span>'+esc(T('nw_hi'))+'</span></div>'
      +'<div class="row"><button class="btn" type="button" id="nwBot">'+esc(T('nw_bot'))+'</button><button class="btn ghost" type="button" id="nwNext">'+esc(T('nw_next'))+'</button><button class="btn ghost" type="button" id="nwReal" style="--lc:var(--blue)">'+esc(T('nw_real'))+'</button></div>'
      +'<div class="bars" id="nwBars"></div><p class="msg" id="nwMsg"></p><p class="note">'+esc(T('nw_note'))+'</p>';
    you=null; bars(false);
    box.querySelectorAll('#nwOpts .chip').forEach(b=>b.addEventListener('click',()=>{ if(busy)return; you=b.dataset.w; box.querySelectorAll('.chip').forEach(c=>c.classList.toggle('you',c===b)); $('nwBlank').textContent=you; nodePick(); }));
    $('nwHeat').addEventListener('input',e=>{ heat=e.target.value/100; $('nwFun').style.display=heat>.55?'inline-flex':'none'; bars(true); });
    $('nwFun').style.display=heat>.55?'inline-flex':'none';
    $('nwBot').addEventListener('click',()=>{ if(!busy)nodePick(); });
    $('nwNext').addEventListener('click',()=>{ if(busy)return; qi++; render(); });
    $('nwReal').addEventListener('click',askReal);
  }
  function bars(show){
    const q=D().next[qi%D().next.length], ps=probs(q).filter(x=>!x.f||heat>.55).sort((a,b)=>b.p-a.p);
    $('nwBars').innerHTML=ps.map(x=>'<div class="bar'+(x.f?' f':'')+'"><span>'+esc(x.w)+'</span><i style="width:'+(show?(x.p*100).toFixed(1):0)+'%"></i><em>'+(show?(x.p*100<1?(x.p*100).toFixed(1):Math.round(x.p*100))+'%':'')+'</em></div>').join('');
  }
  async function nodePick(){
    busy=true; const q=D().next[qi%D().next.length], ps=probs(q);
    let r=Math.random(), ch=ps[ps.length-1]; for(const x of ps){ if((r-=x.p)<=0){ ch=x; break; } }
    if(ch.f)$('nwFun').style.display='inline-flex';
    const chips=[...box.querySelectorAll('#nwOpts .chip')].filter(c=>c.offsetParent);
    bars(true);
    if(!RM){ let d=50; for(let k=0;k<12+Math.floor(Math.random()*4);k++){ chips.forEach(c=>c.classList.remove('hot')); pick(chips).classList.add('hot'); await wait(d); d*=1.16; } }
    chips.forEach(c=>c.classList.toggle('hot',c.dataset.w===ch.w));
    $('nwBlank').textContent=ch.w;
    const m=$('nwMsg'); let txt=(you?T('nw_you',{w:you})+'   ':'')+T('nw_he',{w:ch.w})+'. ';
    if(ch.f){ txt+=T('nw_funny'); react('think',false); talk(T('nw_funny')); }
    else if(you){ txt+=you===ch.w?T('nw_same'):T('nw_diff'); react(you===ch.w?'ok':'think',you===ch.w?undefined:false); }
    m.textContent=txt; m.className='msg'+(you&&you===ch.w?' ok':'');
    rounds++; if(rounds>=3)sticker(1);
    busy=false;
  }
  function askReal(){
    const q=D().next[qi%D().next.length], top=q.w[0][0], m=$('nwMsg');
    m.textContent=T('pz_wait')+'...'; react('think',false);
    NodeTutor.ask({layer:1,task:'continue',input:q.s,lang:lang()},()=>top).then(r=>{
      m.className='msg'; m.textContent=(r.real?T('pz_real'):(r.why==='limit'?T('pz_lim'):T('pz_off')))+' '+q.s+' '+r.text;
    });
  }
  return {render};
})());

/* 2a. Кому отдать задачу */
TOOLS.push((function(){
  const box=$('so'); let deck=[], idx=0, score=0, drag=null;
  const BINS=['calc','ai','human'], BICO={calc:1,ai:8,human:3};
  function render(){
    box.innerHTML=head('02','so_t','so_d')+'<div class="so-stage"><div class="so-card" id="soCard"></div><div class="bins">'
      +BINS.map(b=>'<button class="bin" type="button" data-b="'+b+'">'+ico(BICO[b],34)+esc(T('bin_'+b))+'</button>').join('')
      +'</div><p class="so-count" id="soCount"></p><p class="msg" id="soMsg"></p><div class="row" id="soEnd" style="display:none"><button class="btn" type="button" id="soAgain">'+esc(T('so_again'))+'</button></div></div>';
    box.querySelectorAll('.bin').forEach(b=>b.addEventListener('click',()=>answer(b.dataset.b,b)));
    $('soAgain').addEventListener('click',start);
    dragInit();
    if(!deck.length)start(); else show();
  }
  function start(){ deck=shuffle(D().sort).slice(0,8); idx=0; score=0; $('soEnd').style.display='none'; $('soMsg').textContent=''; show(); }
  function show(){
    const c=$('soCard'), it=deck[idx];
    $('soCount').textContent=(idx+1)+' / '+deck.length;
    if(!it){ c.style.display='none'; return; }
    c.style.display=''; c.textContent=it[0]; c.style.transform=''; c.classList.remove('gone'); c.classList.add('enter'); requestAnimationFrame(()=>requestAnimationFrame(()=>c.classList.remove('enter')));
  }
  async function answer(b,binEl){
    const it=deck[idx]; if(!it)return; binEl=binEl||box.querySelector('.bin[data-b="'+b+'"]');
    const c=$('soCard'), m=$('soMsg'), ok=it[1]===b;
    const cr=c.getBoundingClientRect(), br=binEl.getBoundingClientRect();
    c.style.transform='translate('+((br.left+br.width/2)-(cr.left+cr.width/2))+'px,'+((br.top+br.height/2)-(cr.top+cr.height/2))+'px) scale(.25) rotate('+(ok?8:-12)+'deg)';
    c.classList.add('gone');
    binEl.classList.remove('ok','bad'); void binEl.offsetWidth; binEl.classList.add(ok?'ok':'bad');
    if(ok){ score++; m.className='msg ok'; m.textContent=T('so_ok')+' '+it[2]; react('ok'); }
    else { m.className='msg bad'; m.textContent=T('so_bad',{b:T('bin_'+it[1])})+' '+it[2]; react('bad'); }
    idx++; await wait(500);
    if(idx>=deck.length){ $('soCard').style.display='none'; $('soCount').textContent=T('so_score',{n:score,t:deck.length}); $('soEnd').style.display=''; sticker(2); }
    else show();
  }
  function dragInit(){
    const c=$('soCard');
    c.addEventListener('pointerdown',e=>{ if(!deck[idx])return; drag={x:e.clientX,y:e.clientY}; c.classList.add('drag'); c.setPointerCapture(e.pointerId); });
    c.addEventListener('pointermove',e=>{ if(!drag)return; c.style.transform='translate('+(e.clientX-drag.x)+'px,'+(e.clientY-drag.y)+'px) rotate('+((e.clientX-drag.x)/20)+'deg)';
      const el=document.elementsFromPoint(e.clientX,e.clientY).find(x=>x.classList&&x.classList.contains('bin')); box.querySelectorAll('.bin').forEach(b=>b.classList.toggle('over',b===el)); });
    const up=e=>{ if(!drag)return; c.classList.remove('drag'); const el=document.elementsFromPoint(e.clientX,e.clientY).find(x=>x.classList&&x.classList.contains('bin'));
      box.querySelectorAll('.bin').forEach(b=>b.classList.remove('over')); drag=null; if(el)answer(el.dataset.b,el); else c.style.transform=''; };
    c.addEventListener('pointerup',up); c.addEventListener('pointercancel',up);
  }
  return {render};
})());

/* 2b. Детектор выдумки */
TOOLS.push((function(){
  const box=$('li'); let order=shuffle([0,1,2,3,4,5,6,7]), k=0, caught=0, done=false;
  function render(){
    const set=D().lie[order[k%order.length]], o=shuffle([0,1,2]);
    box.innerHTML=head('02','li_t','li_d')+'<div class="li"><div><p class="li-says">'+esc(T('li_says'))+'</p>'
      +o.map(i=>'<button class="li-f" type="button" data-i="'+i+'">'+esc(set.f[i])+'</button>').join('')
      +'<p class="msg" id="liMsg"></p><div class="row"><button class="btn ghost" type="button" id="liNext">'+esc(T('li_next'))+'</button></div></div>'
      +'<div class="meter"><svg viewBox="0 0 150 96"><path d="M15 82 A60 60 0 0 1 135 82" fill="none" stroke="rgba(101,188,255,.25)" stroke-width="10"/>'
      +'<path d="M101 28 A60 60 0 0 1 135 82" fill="none" stroke="rgba(255,77,103,.6)" stroke-width="10"/><path d="M15 82 A60 60 0 0 1 49 28" fill="none" stroke="rgba(24,226,140,.5)" stroke-width="10"/>'
      +'<g class="needle" id="liNdl"><line x1="75" y1="82" x2="75" y2="30" stroke="#eefcf5" stroke-width="3" stroke-linecap="round"/></g><circle cx="75" cy="82" r="7" fill="#2a3a44"/>'
      +'<circle class="lamp" id="liLamp" cx="128" cy="14" r="7" fill="#3a1a20"/></svg></div></div>';
    done=false;
    const nd=$('liNdl'); nd.style.transform='rotate(0deg)';
    if(!RM){ let a=0; const wob=setInterval(()=>{ if(done||!document.body.contains(nd)){ clearInterval(wob); return; } a=Math.sin(Date.now()/300)*14; nd.style.transform='rotate('+a+'deg)'; },120); }
    box.querySelectorAll('.li-f').forEach(b=>b.addEventListener('click',()=>{
      if(done)return; done=true; const i=+b.dataset.i, ok=i===set.x;
      box.querySelectorAll('.li-f').forEach(x=>x.classList.add(+x.dataset.i===set.x?'fake':'true'));
      $('liNdl').style.transform='rotate('+(ok?62:-62)+'deg)'; $('liLamp').setAttribute('fill',ok?'#ff4d67':'#3a1a20');
      const m=$('liMsg'); m.className='msg '+(ok?'ok':'bad'); m.textContent=(ok?T('li_ok'):T('li_bad'))+' '+set.w;
      react(ok?'ok':'bad'); if(ok){ caught++; if(caught>=3)sticker(2); }
    }));
    $('liNext').addEventListener('click',()=>{ k++; render(); });
  }
  return {render};
})());

/* 3. Машина дел */
TOOLS.push((function(){
  const box=$('sl'), CARDS=['understand','build','rewrite','check','invent','start']; let cur=null, spinning=false, right=0, answered=false;
  function render(){
    box.innerHTML=head('03','sl_t','sl_d')+'<div class="slot"><div class="reelwin"><div class="reel" id="slReel"><div>?</div></div></div>'
      +'<button class="lever" type="button" id="slLever" aria-label="lever"><span class="stick"></span><span class="ball"></span><span class="base"></span><span class="lbl">'+esc(T('sl_pull'))+'</span></button></div>'
      +'<p class="cap" style="margin-top:22px" id="slPick">'+esc(T('sl_pick'))+'</p><div class="sl-cards" id="slCards">'+CARDS.map(c=>'<button type="button" data-c="'+c+'" disabled>'+esc(T('c_'+c))+'</button>').join('')+'</div>'
      +'<p class="msg" id="slMsg"></p><div id="slEx"></div>';
    $('slLever').addEventListener('click',spin);
    box.querySelectorAll('#slCards button').forEach(b=>b.addEventListener('click',()=>choose(b)));
    if(cur!==null)showCur(false);
  }
  function showCur(){ const s=D().slot[cur]; $('slReel').innerHTML='<div>'+esc(s[0])+'</div>'; $('slReel').style.transition='none'; $('slReel').style.transform=''; enable(!answered); }
  function enable(on){ box.querySelectorAll('#slCards button').forEach(b=>{ b.disabled=!on; b.classList.remove('ok','no'); }); }
  async function spin(){
    if(spinning)return; spinning=true; answered=false; enable(false); $('slMsg').textContent=''; $('slEx').innerHTML='';
    const lv=$('slLever'); lv.classList.add('pull'); setTimeout(()=>lv.classList.remove('pull'),350);
    const S=D().slot; let n; do{ n=Math.floor(Math.random()*S.length); }while(n===cur&&S.length>1); cur=n;
    const strip=[]; for(let i=0;i<14;i++)strip.push(S[Math.floor(Math.random()*S.length)][0]); strip.push(S[cur][0]);
    const r=$('slReel'); r.style.transition='none'; r.style.transform='translateY(0)';
    r.innerHTML=strip.map(t=>'<div>'+esc(t)+'</div>').join('');
    void r.offsetWidth;
    r.style.transition=RM?'none':'transform 1.7s cubic-bezier(.15,.7,.2,1)'; r.style.transform='translateY(-'+(84*(strip.length-1))+'px)';
    react('think',false);
    await wait(1750); spinning=false; enable(true);
  }
  function choose(b){
    if(cur===null||answered)return; const s=D().slot[cur], ok=b.dataset.c===s[1];
    const m=$('slMsg');
    if(ok){ answered=true; b.classList.add('ok'); m.className='msg ok'; m.textContent=T('sl_ok'); react('ok'); right++; if(right>=3)sticker(3);
      box.querySelectorAll('#slCards button').forEach(x=>x.disabled=true); }
    else { b.classList.remove('no'); void b.offsetWidth; b.classList.add('no'); m.className='msg bad'; m.textContent=T('sl_bad',{c:T('c_'+s[1])}); react('bad'); answered=true;
      box.querySelectorAll('#slCards button').forEach(x=>{ x.disabled=true; if(x.dataset.c===s[1])x.classList.add('ok'); }); }
    $('slEx').innerHTML='<div class="ex"><b>'+esc(T('sl_ex'))+'</b>'+esc(s[2])+'</div>';
  }
  return {render};
})());

/* 4. Собери запрос */
TOOLS.push((function(){
  const box=$('pz'), KINDS=['goal','ctx','fmt']; let placed={goal:null,ctx:null,fmt:null}, sent=false;
  function render(){
    const P=D().pz;
    const pieces=[];
    KINDS.forEach(k=>P[k].forEach((t,i)=>pieces.push({k,i,t})));
    P.bad.forEach((t,i)=>pieces.push({k:'bad',i,t}));
    box.innerHTML=head('04','pz_t','pz_d')
      +'<div class="pz-row">'+KINDS.map(k=>'<div class="slotp" data-slot="'+k+'"><span>'+esc(T('k_'+k))+'</span></div>').join('')+'</div>'
      +'<div class="tray" id="pzTray">'+shuffle(pieces).map(p=>'<button type="button" class="pc '+(p.k==='bad'?'badp':p.k)+'" data-k="'+p.k+'" data-i="'+p.i+'">'+esc(p.t)+'</button>').join('')+'</div>'
      +'<p class="msg" id="pzMsg"></p><div id="pzOut"></div>';
    box.querySelectorAll('.pc').forEach(b=>b.addEventListener('click',()=>tap(b)));
    KINDS.forEach(k=>{ if(placed[k]!==null){ const b=box.querySelector('.pc[data-k="'+k+'"][data-i="'+placed[k]+'"]'); if(b)box.querySelector('[data-slot="'+k+'"]').appendChild(b); } });
    update();
  }
  function fly(b,target){
    const r0=b.getBoundingClientRect(); target.appendChild(b); const r1=b.getBoundingClientRect();
    if(RM)return; b.animate([{transform:'translate('+(r0.left-r1.left)+'px,'+(r0.top-r1.top)+'px)'},{transform:'none'}],{duration:380,easing:'cubic-bezier(.2,.8,.2,1)'});
  }
  function tap(b){
    const k=b.dataset.k, i=+b.dataset.i, m=$('pzMsg');
    if(k==='bad'){ b.classList.remove('no'); void b.offsetWidth; b.classList.add('no'); m.className='msg bad'; m.textContent=D().pz.badR[i]; react('bad',D().pz.badR[i]); return; }
    const slot=box.querySelector('[data-slot="'+k+'"]');
    if(b.parentNode===slot){ fly(b,$('pzTray')); placed[k]=null; }
    else { const old=slot.querySelector('.pc'); if(old)fly(old,$('pzTray')); fly(b,slot); placed[k]=i; }
    m.textContent=''; update();
  }
  function prompt(){ const P=D().pz; const s=P.goal[placed.goal]; return s.charAt(0).toUpperCase()+s.slice(1)+'. '+P.ctx[placed.ctx].charAt(0).toUpperCase()+P.ctx[placed.ctx].slice(1)+'. '+P.fmt[placed.fmt].charAt(0).toUpperCase()+P.fmt[placed.fmt].slice(1)+'.'; }
  function update(){
    const out=$('pzOut'), miss=KINDS.filter(k=>placed[k]===null);
    if(miss.length){ out.innerHTML=miss.length<3?'<p class="note">'+esc(T('pz_need',{p:miss.map(k=>T('k_'+k)).join(', ')}))+'</p>':''; return; }
    out.innerHTML='<p class="cap" style="margin-top:12px">'+esc(T('pz_ready'))+'</p><div class="assembled">'+esc(prompt())+'</div>'
      +'<div class="row" style="margin-top:12px"><button class="btn" type="button" id="pzSend">'+esc(T('pz_send'))+'</button><button class="btn ghost" type="button" id="pzBare" style="--lc:var(--red)">'+esc(T('pz_bare'))+'</button></div><div id="pzAns"></div>';
    if(!sent)react('ok',false);
    $('pzSend').addEventListener('click',send);
    $('pzBare').addEventListener('click',()=>{ $('pzAns').insertAdjacentHTML('beforeend','<div class="answer bare"><b>'+esc(T('pz_bare'))+'</b>'+esc(D().pz.bare)+'</div>'); react('bad',false); });
  }
  function send(){
    const a=$('pzAns'), btn=$('pzSend'); btn.disabled=true; a.insertAdjacentHTML('beforeend','<div class="answer" id="pzWait"><b>'+esc(T('pz_wait'))+'</b>...</div>'); react('think',false);
    const g=placed.goal;
    NodeTutor.ask({layer:1,task:'prompt',input:prompt(),lang:lang()},()=>D().pz.ans[g]).then(r=>{
      const w=$('pzWait'); if(w)w.remove();
      a.insertAdjacentHTML('beforeend','<div class="answer"><b>'+esc(r.real?T('pz_real'):(r.why==='limit'?T('pz_lim'):T('pz_off')))+'</b>'+esc(r.text)+'</div>');
      btn.disabled=false; sent=true; sticker(4); react('ok',false);
    });
  }
  return {render};
})());

/* 5. Тон-метр */
TOOLS.push((function(){
  const box=$('to'); let pos=1; const seen=new Set();
  const FACE=['wow','neutral','happy','think','wink'], MODE=['no','idle','cheer','think','wave'];
  function render(){
    box.innerHTML=head('05','to_t','to_d')+'<div class="tone"><div class="dial"><svg viewBox="0 0 220 124">'
      +'<path d="M20 112 A90 90 0 0 1 65 34" fill="none" stroke="rgba(255,77,103,.7)" stroke-width="14"/>'
      +'<path d="M65 34 A90 90 0 0 1 155 34" fill="none" stroke="rgba(24,226,140,.7)" stroke-width="14"/>'
      +'<path d="M155 34 A90 90 0 0 1 200 112" fill="none" stroke="rgba(255,143,208,.7)" stroke-width="14"/>'
      +'<g class="ndl" id="toNdl"><line x1="110" y1="112" x2="110" y2="36" stroke="#eefcf5" stroke-width="4" stroke-linecap="round"/></g><circle cx="110" cy="112" r="9" fill="#2a3a44"/></svg>'
      +'<input type="range" min="0" max="4" step="1" value="'+pos+'" id="toR" aria-label="tone"><div class="lbls"><span>'+esc(T('to_lo'))+'</span><span>'+esc(T('to_mid'))+'</span><span>'+esc(T('to_hi'))+'</span></div></div>'
      +'<div><div class="tone-req" id="toReq"></div><p class="tone-re" id="toRe"></p><p class="tone-v" id="toV"></p></div></div>';
    $('toR').addEventListener('input',e=>{ pos=+e.target.value; show(true); });
    show(false);
  }
  function show(user){
    const t=D().tone[pos]; $('toNdl').style.transform='rotate('+((pos-2)*36)+'deg)';
    $('toReq').textContent=t[0]; $('toRe').textContent='NODE: '+t[1]; $('toV').textContent=t[2];
    if(user){ seen.add(pos); botFace=FACE[pos]; bot&&bot.emote(FACE[pos],2500); botMode=MODE[pos]; modeUntil=botT+1.6; talk(t[1],2600); if(seen.size>=3&&seen.has(2))sticker(5); }
  }
  return {render};
})());

/* 6. Проверка */
TOOLS.push((function(){
  const box=$('qz'); let set=null, qi=0, score=0, res=[];
  function render(){
    if(!set){ box.innerHTML='<div class="parts">'+'<i></i>'.repeat(5)+'</div><button class="btn" type="button" id="qGo">'+esc(T('q_go'))+'</button>'; $('qGo').addEventListener('click',start); return; }
    if(qi>=set.length)return finish();
    const q=D().quiz[set[qi]];
    box.innerHTML='<div class="parts">'+[0,1,2,3,4].map(i=>'<i class="'+(res[i]===true?'on':res[i]===false?'off':'')+'"></i>').join('')+'</div>'
      +'<p class="qn">'+esc(T('q_n',{i:qi+1,t:set.length}))+'</p><p class="qq">'+esc(q[0])+'</p><div class="qa">'
      +q[1].map((a,i)=>'<button type="button" data-i="'+i+'">'+esc(a)+'</button>').join('')+'</div><p class="qx" id="qX"></p><div class="row" style="margin-top:12px"><button class="btn" type="button" id="qNext" style="display:none">'+esc(T('q_next'))+'</button></div>';
    box.querySelectorAll('.qa button').forEach(b=>b.addEventListener('click',()=>{
      const i=+b.dataset.i, ok=i===q[2];
      box.querySelectorAll('.qa button').forEach(x=>{ x.disabled=true; if(+x.dataset.i===q[2])x.classList.add('ok'); });
      if(!ok)b.classList.add('no');
      res[qi]=ok; if(ok)score++;
      const parts=box.querySelectorAll('.parts i'); parts[qi].className=ok?'on':'off';
      $('qX').textContent=(ok?T('q_ok'):T('q_bad'))+' '+q[3];
      react(ok?'ok':'bad');
      $('qNext').style.display='';
    }));
    $('qNext').addEventListener('click',()=>{ qi++; render(); });
  }
  function start(){ set=shuffle([...Array(D().quiz.length).keys()]).slice(0,5); qi=0; score=0; res=[]; render(); if(TR)TR.event('course.quiz1'); }
  function finish(){
    const pass=score>=3;
    box.innerHTML='<div class="parts">'+res.map(r=>'<i class="'+(r?'on':'off')+'"></i>').join('')+'</div><p class="qq">'+esc(T('q_res',{s:score,t:set.length}))+'</p><p class="qx">'+esc(pass?T('q_pass'):T('q_fail'))+'</p>'
      +'<div class="row" style="margin-top:12px"><button class="btn ghost" type="button" id="qAgain">'+esc(T('q_again'))+'</button>'+(pass?'<a class="btn" href="#fin">'+esc(T('fin_t'))+' &gt;</a>':'')+'</div>';
    $('qAgain').addEventListener('click',start);
    if(pass){ completeLayer(); sticker(6); botMode='cheer'; modeUntil=botT+2.5; talk(T('say7')); stickersUI(); }
    else react('bad',T('q_fail'));
  }
  return {render};
})());

/* ---------- меню ---------- */
const drawer=$('drawer'), menuBtn=$('menuBtn'); let menuPushed=false;
function buildMenu(){
  $('drTopics').innerHTML=[1,2,3,4,5,6].map(i=>'<button class="dbtn" type="button" data-t="'+i+'"><span class="n">0'+i+'</span><span>'+esc(T('t'+i))+'</span><span class="ok"></span></button>').join('');
  $('drTopics').querySelectorAll('.dbtn').forEach(b=>b.addEventListener('click',()=>{ closeMenu(); setTimeout(()=>$('t'+b.dataset.t).scrollIntoView({behavior:RM?'auto':'smooth'}),RM?0:220); }));
  const MORE=['what-is-ai','not-magic','human-use','first-request','human-mode'];
  $('drMore').innerHTML=MORE.map((m,i)=>'<a class="dbtn" href="'+m+'/"><span class="n">0'+(i+1)+'</span><span>'+esc(T('t'+(i+1)))+(T('moreRu')?' '+esc(T('moreRu')):'')+'</span></a>').join('');
  const lg=$('langs'); lg.innerHTML='';
  CODES.forEach(c=>{ const b=document.createElement('button'); b.type='button'; b.textContent=c.toUpperCase(); b.classList.toggle('sel',c===lang()); b.addEventListener('click',()=>setLang(c)); lg.appendChild(b); });
}
function openMenu(){
  if(document.body.classList.contains('menu'))return;
  document.body.classList.add('menu'); drawer.setAttribute('aria-hidden','false'); menuBtn.setAttribute('aria-expanded','true');
  try{ history.pushState({l01Menu:1},''); menuPushed=true; }catch(e){ menuPushed=false; }
}
function closeMenu(fromPop){
  if(!document.body.classList.contains('menu'))return;
  document.body.classList.remove('menu'); drawer.setAttribute('aria-hidden','true'); menuBtn.setAttribute('aria-expanded','false');
  if(menuPushed&&!fromPop){ menuPushed=false; try{ history.back(); }catch(e){} }
  menuPushed=false;
}
menuBtn.addEventListener('click',()=>document.body.classList.contains('menu')?closeMenu():openMenu());
$('stk').addEventListener('click',openMenu);
$('drClose').addEventListener('click',()=>closeMenu());
$('veil').addEventListener('click',()=>closeMenu());
addEventListener('keydown',e=>{ if(e.key==='Escape')closeMenu(); });
addEventListener('popstate',()=>closeMenu(true));

/* ---------- тексты ---------- */
function texts(){
  document.documentElement.lang=lang();
  document.querySelectorAll('[data-k]').forEach(el=>{ el.textContent=T(el.dataset.k); });
  $('back').textContent=T('back'); $('core').querySelector('.lbl').textContent=T('core');
  menuBtn.querySelector('.lbl').textContent=T('menu'); menuBtn.setAttribute('aria-label',T('menu'));
  $('drTitle').textContent=T('menu'); $('drClose').setAttribute('aria-label',T('close'));
  $('eyebrow').textContent=T('eyebrow'); $('title').textContent=T('title'); $('lead').textContent=T('lead'); $('mapT').textContent=T('mapT'); $('go').textContent=T('go')+' >';
  $('map').innerHTML=[1,2,3,4,5,6].map(i=>'<a href="#t'+i+'"><span class="n">0'+i+'</span><span>'+esc(T('s'+i))+'</span></a>').join('');
  document.querySelectorAll('[data-more]').forEach(a=>a.textContent=T('more')+(T('moreRu')?' '+T('moreRu'):'')+' >');
  $('useCards').innerHTML=['understand','build','rewrite','check','invent','start'].map(c=>'<div class="card"><b>'+esc(T('c_'+c))+'</b><span>'+esc(T('d_'+c))+'</span></div>').join('');
  $('stk').querySelector('.ico').setAttribute('style',icoS(9,16));
  $('footR').textContent=T('title');
  buildMenu(); stickersUI();
}
addEventListener('storage',e=>{ if(e.key===PKEY)stickersUI(); });

/* ---------- старт ---------- */
texts(); TOOLS.forEach(t=>t.render());
setBg(0);
if(TR)TR.event('course.l01');
})();
