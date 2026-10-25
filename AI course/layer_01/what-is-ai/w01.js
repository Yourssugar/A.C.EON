/* LAYER_01 / тема 01 "Что такое ИИ": подробная страница.
   Разделы въезжают при прокрутке (.rv -> .in), фон меняется по текущему разделу, робот NODE (../../bot.js) комментирует.
   Пособия: rm где тут ИИ (комната), ac подсказки на телефоне, tr обучи NODE (карточки котов), sc весы ИИ и человека, qz три вопроса.
   За проверку даётся наклейка темы, хранится в Store('aicourse').l01.deep. */
(function(){
'use strict';
const $=id=>document.getElementById(id);
const AU=window.AceonUniverse||{id:2,capMs:16,dprCap:1.5};
const TIER=AU.id||2;
const RM=matchMedia('(prefers-reduced-motion: reduce)').matches;
const TR=window.Trace||null;
const TOPIC='what-is-ai';
if(RM)document.documentElement.classList.add('nomo');

/* ---------- язык ---------- */
const LL=window.W01_LANG||{};
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

/* ---------- память и наклейка ---------- */
let mem={level:null,l01:{st:[],deep:[]}};
if(window.Store){ try{ Store.define('aicourse',{version:1,defaults:{level:null,l01:{st:[],deep:[]}}}); mem=Store.get('aicourse'); }catch(e){} }
else { try{ const o=JSON.parse(localStorage.getItem('aceon:aicourse')||'null'); if(o)mem=o; }catch(e){} }
if(!mem.l01)mem.l01={st:[]};
if(!Array.isArray(mem.l01.deep))mem.l01.deep=[];
function save(){ if(window.Store){ try{ Store.save('aicourse'); return; }catch(e){} } try{ localStorage.setItem('aceon:aicourse',JSON.stringify(mem)); }catch(e){} }
const done=()=>mem.l01.deep.indexOf(TOPIC)>=0;
function award(){
  if(done())return;
  mem.l01.deep.push(TOPIC); save(); if(TR)TR.event('course.sticker');
  const t=$('toast'); t.querySelector('span').textContent=T('st_got',{n:T('st')});
  t.classList.remove('on'); void t.offsetWidth; t.classList.add('on'); setTimeout(()=>t.classList.remove('on'),2800);
  const b=$('stk'); b.classList.remove('pop'); void b.offsetWidth; b.classList.add('pop');
  stickerUI();
}
function stickerUI(){
  const g=done();
  $('stk').classList.toggle('got',g); $('stk').querySelector('span').textContent=(g?1:0)+'/1';
  $('finBig').classList.toggle('got',g);
}

/* ---------- робот ---------- */
const bot=window.NodeBot?NodeBot.create({base:'../../img/',reduce:RM,
  seqBase:{'seq-cheer':'../img/','seq-facepalm':'../img/','seq-blush':'../img/','seq-think':'../img/','seq-read':'img/'}}):null;
const bc=$('bot'), bx=bc.getContext('2d'), say=$('say'), hit=$('botHit');
let W=innerWidth,H=innerHeight,DPR=Math.min(AU.dprCap||1.5,devicePixelRatio||1);
let botMode='idle', botFace='happy', modeUntil=0, botT=0, mx=0, my=0, tmx=0, tmy=0;
addEventListener('pointermove',e=>{ tmx=e.clientX/W*2-1; tmy=e.clientY/H*2-1; },{passive:true});
function botPlace(){
  const free=W-(Math.max(16,Math.min(96,W*.06))+Math.min(760,W-32))-24;
  if(W<=760||free<200){ const h=Math.min(104,H*.13); return {x:W-h*.36-4,y:H-4,h,small:true}; }
  const h=Math.min(H*.44,free*1.25,380); return {x:W-free/2-8,y:H-14,h,small:false};
}
let sayT=null, typing=null;
function talk(txt,ms){
  if(!txt)return;
  clearTimeout(sayT); clearTimeout(typing); say.classList.add('on'); say.textContent='';
  let i=0; const step=()=>{ say.textContent=txt.slice(0,i); if(i++<txt.length)typing=setTimeout(step,RM?0:20); };
  if(RM)say.textContent=txt; else step();
  if(bot)bot.talk(Math.min(2400,txt.length*45));
  sayT=setTimeout(()=>say.classList.remove('on'),W<=760?Math.min(ms||9e9,Math.max(2200,txt.length*45)):(ms||Math.max(3200,txt.length*70)));
}
/* кадры GPT поверх собранного робота: cheer, facepalm, blush, think (сидя), read (стоя с книгой) */
let sq=null, sqN=0;
function playSeq(name,dur){ if(!bot||RM||TIER<2)return false; const im=bot.seqImg(name); if(!im.complete||!im.naturalWidth)return false; sq={name,t:0,dur:dur||1.7}; return true; }
function react(kind,line){
  if(!bot)return;
  sqN++;
  if(kind==='ok'&&sqN%2===0)playSeq('seq-cheer',1.6);
  else if(kind==='bad'&&sqN%2===1)playSeq('seq-facepalm',1.9);
  else if(kind==='think')playSeq('seq-think',2.2);
  else if(kind==='blush')playSeq('seq-blush',2);
  if(kind==='ok'){ botMode='cheer'; bot.emote('happy',1400); }
  else if(kind==='bad'){ botMode='no'; bot.emote('wow',1200); }
  else if(kind==='think'){ botMode='think'; bot.emote('think',1500); }
  else if(kind==='blush'){ botMode='idle'; bot.emote('wink',1500); }
  modeUntil=botT+1.3;
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
  let sa=0;
  if(sq){ sq.t+=dt; if(sq.t>=sq.dur)sq=null; else { const e=.14; sa=Math.min(1,sq.t/e,(sq.dur-sq.t)/e); bot.drawSeq(bx,sq.name,Math.min(15,sq.t/sq.dur*16),p.x,p.y,p.h,sa); } }
  if(sa<.99)bot.draw(bx,p.x,p.y,p.h,dt,1-sa); else bot.draw(bx,-9999,-9999,1,dt,0);
  const bw=p.h*.62, hh=p.small?p.h*.5:p.h; hit.style.transform='translate('+(p.x-bw/2).toFixed(0)+'px,'+(p.y-p.h).toFixed(0)+'px)'; hit.style.width=bw.toFixed(0)+'px'; hit.style.height=hh.toFixed(0)+'px';
  const sw=say.offsetWidth, sh=say.offsetHeight;
  say.style.transform='translate('+Math.round(Math.max(8,Math.min(W-sw-8,p.x-sw+bw*.3)))+'px,'+Math.round(Math.max(56,p.y-p.h*1.02-sh))+'px)';
}
if(bot){ requestAnimationFrame(frame); hit.addEventListener('click',()=>{ if(Math.random()<.5)react('blush'); else { bot.jump(); react('ok'); } }); setTimeout(()=>['seq-cheer','seq-facepalm','seq-think','seq-blush','seq-read'].forEach(n=>bot.seqImg(n)),1500); }
else { bc.style.display='none'; hit.style.display='none'; }

/* ---------- фон и текущий раздел ---------- */
const BG=['../../img/bg-novice','img/w01-word','img/w01-idea','img/w01-learn','img/w01-partner','img/w01-history','../../img/bg-choose'];
const bgs=$('bgs'), bgEl=[]; let bgCur=-1;
const mob=()=>W/H<.8||W<=760;
BG.forEach(()=>{ const d=document.createElement('div'); d.className='bgi'; bgs.appendChild(d); bgEl.push(d); });
function setBg(i){
  if(i===bgCur)return; bgCur=i;
  bgEl.forEach((d,k)=>{ if(k===i&&!d.dataset.v){ d.style.backgroundImage='url("'+BG[k]+'-'+(mob()?'m':'w')+'.webp")'; d.dataset.v=1; } d.classList.toggle('on',k===i); });
}
let curSec=-1;
const vis=new Map();
const io=new IntersectionObserver(es=>{
  es.forEach(e=>vis.set(e.target,e.intersectionRatio));
  let best=null, br=0; vis.forEach((r,el)=>{ if(r>br){ br=r; best=el; } });
  if(best){ const i=+best.dataset.sec; if(i!==curSec){ curSec=i; setBg(i); botFace=i===5?'neutral':'happy'; talk(T('say'+i)); markMenu(); } }
},{threshold:[0,.2,.4,.6]});
document.querySelectorAll('main section').forEach(s=>io.observe(s));
const rio=new IntersectionObserver(es=>es.forEach(e=>{ if(e.isIntersecting){ e.target.classList.add('in'); rio.unobserve(e.target); } }),{threshold:.12,rootMargin:'0px 0px -6% 0px'});
function reveal(root){ (root||document).querySelectorAll('.rv:not(.in)').forEach((el,i)=>{ el.style.transitionDelay=((i%4)*.06).toFixed(2)+'s'; rio.observe(el); }); }
reveal();
addEventListener('scroll',()=>{ const h=document.documentElement.scrollHeight-innerHeight; $('prog').style.width=(h>0?scrollY/h*100:0).toFixed(1)+'%'; },{passive:true});
const SEC_ID=['top0','t1','t2','t3','t4','t5','fin'];

/* =========================================================
   Пособия
   ========================================================= */
const TOOLS=[];
function head(n,k,dk){ return '<h3><span class="tag">'+n+'</span><span>'+esc(T(k))+'</span></h3><p class="d">'+esc(T(dk))+'</p>'; }

/* 0. Половинки слова */
TOOLS.push((function(){
  const box=$('halves'), open=new Set();
  function render(){
    box.innerHTML=[1,2].map(n=>'<button class="half'+(open.has(n)?' on':'')+'" type="button" data-n="'+n+'"><span class="in"><span class="f">'+esc(T('half'+n))+'<small>'+(n===1?'01':'02')+'</small></span><span class="b"><b>'+esc(T('half'+n))+'</b>'+esc(T('half'+n+'d'))+'</span></span></button>').join('');
    box.querySelectorAll('.half').forEach(b=>b.addEventListener('click',()=>{
      const n=+b.dataset.n; b.classList.toggle('on');
      if(b.classList.contains('on')){ open.add(n); if(open.size===2)react('ok',false); else talk(T('half'+n+'d'),3000); } else open.delete(n);
    }));
  }
  return {render};
})());

/* 1. Где тут ИИ: комната с точками */
const ROOM={smartphone:[46.5,79.2,56.9,74.5,'part'],smart_speaker:[47.4,22.0,44.0,20.9,'yes'],laptop:[60.2,37.5,57.7,33.0,'part'],tv:[94.0,48.8,91.8,39.2,'part'],
  robot_vacuum:[78.5,73.3,82.7,60.4,'part'],camera:[90.4,18.9,89.2,19.7,'part'],calculator:[29.4,39.1,30.6,35.8,'no'],light_switch:[86.1,35.7,86.6,28.4,'no'],
  wall_clock:[7.7,9.2,11.5,8.3,'no'],toaster:[21.2,37.3,19.4,33.9,'no'],fridge:[9.2,30.0,10.6,22.9,'no'],desk_lamp:[66.0,34.6,66.8,29.9,'no']};
TOOLS.push((function(){
  const box=$('rm'), found=new Set(), keys=Object.keys(ROOM); let wide=null, sel=null, allSaid=false;
  const isWide=()=>(box.clientWidth||W)>=520;
  function render(){
    wide=isWide();
    box.innerHTML=head('01','rm_t','rm_d')+'<div class="room"><img src="img/room-'+(wide?'w':'m')+'.webp" alt="" width="'+(wide?1672:941)+'" height="'+(wide?941:1672)+'">'
      +keys.map(k=>{ const r=ROOM[k], x=wide?r[0]:r[2], y=wide?r[1]:r[3];
        return '<button class="hs'+(found.has(k)?' v-'+r[4]:'')+(sel===k?' sel':'')+'" type="button" style="left:'+x+'%;top:'+y+'%" data-k="'+k+'" aria-label="'+esc(D().room[k][0])+'"><i></i></button>'; }).join('')
      +'</div><div class="legend"><span class="v-yes">'+esc(T('rm_yes'))+'</span><span class="v-part">'+esc(T('rm_part'))+'</span><span class="v-no">'+esc(T('rm_no'))+'</span></div>'
      +'<div class="rmInfo" id="rmInfo"></div><p class="msg" id="rmMsg"></p>';
    box.querySelectorAll('.hs').forEach(b=>b.addEventListener('click',()=>choose(b.dataset.k)));
    info(); count();
  }
  function info(){
    const el=$('rmInfo'); if(!sel){ el.innerHTML='<p style="margin:0">'+esc(T('rm_hint'))+'</p>'; return; }
    const r=D().room[sel], v=ROOM[sel][4];
    el.innerHTML='<span class="nm">'+esc(r[0])+'</span><span class="vchip v-'+v+'">'+esc(T('rm_'+v))+'</span><p>'+esc(r[1])+'</p>';
  }
  function count(){
    const m=$('rmMsg');
    if(found.size>=keys.length){ m.className='msg ok'; m.textContent=T('rm_all'); }
    else { m.className='msg'; m.textContent=T('rm_found',{n:found.size,t:keys.length}); }
  }
  function choose(k){
    const fresh=!found.has(k); found.add(k); sel=k;
    box.querySelectorAll('.hs').forEach(b=>{ const kk=b.dataset.k; b.className='hs'+(found.has(kk)?' v-'+ROOM[kk][4]:'')+(kk===sel?' sel':''); });
    info(); count();
    const v=ROOM[k][4];
    if(found.size>=keys.length&&fresh&&!allSaid){ allSaid=true; react('ok',T('rm_all')); if(TR)TR.event('course.w01.room'); return; }
    if(v==='yes')react('ok',D().room[k][1]);
    else if(v==='part')react('think',D().room[k][1]);
    else { botMode='no'; modeUntil=botT+1.2; bot&&bot.emote('wink',1300); talk(D().room[k][1],2800); }
  }
  let rt=null; addEventListener('resize',()=>{ clearTimeout(rt); rt=setTimeout(()=>{ if(isWide()!==wide)render(); },150); });
  return {render};
})());

/* 2. Жми на подсказку: телефон и три варианта следующего слова */
TOOLS.push((function(){
  const box=$('ac'); let ci=-1, step=0, words=[], picks=[], busy=false, chainLang=null;
  const chain=()=>{ const a=D().ac; return a[ci%a.length]; };
  function next(){ const n=D().ac.length; let k=Math.floor(Math.random()*n); if(n>1&&k===ci%n)k=(k+1)%n; ci=k; step=0; words=[]; picks=[]; chainLang=lang(); }
  function render(){
    if(ci<0||chainLang!==lang())next();
    const kb=['<div>'+'<i></i>'.repeat(10)+'</div>','<div>'+'<i></i>'.repeat(9)+'</div>','<div>'+'<i></i>'.repeat(7)+'</div>','<div><i></i><i class="sp"></i><i></i></div>'].join('');
    box.innerHTML=head('02','ac_t','ac_d')+'<div class="ac"><div class="phone"><img src="img/phone.webp" alt="" width="320" height="558"><div class="scr"><div class="bub" id="acBub"></div><div class="sug" id="acSug"></div><div class="kb">'+kb+'</div></div></div>'
      +'<div class="acSide"><div class="acKey"><span class="k0">'+esc(T('ac_k0'))+'</span><span class="k1">'+esc(T('ac_k1'))+'</span><span class="k2">'+esc(T('ac_k2'))+'</span></div>'
      +'<p class="lbl">'+esc(T('ac_you'))+'</p><div class="acPath" id="acPath"></div><p class="msg" id="acMsg"></p>'
      +'<div class="row" style="margin-top:12px"><button class="btn" type="button" id="acBot">'+esc(T('ac_bot'))+'</button><button class="btn ghost" type="button" id="acAgain">'+esc(T('ac_again'))+'</button></div>'
      +'<p class="note">'+esc(T('ac_real'))+'</p></div></div>';
    $('acAgain').addEventListener('click',()=>{ if(busy)return; next(); render(); });
    $('acBot').addEventListener('click',auto);
    draw(false); if(step>=chain().st.length)result(false);
  }
  function draw(anim){
    const c=chain(), ws=words.map((w,i)=>'<span'+(anim&&i===words.length-1?' class="nw"':'')+'>'+esc(w)+'</span>').join(' ');
    $('acBub').innerHTML=esc(c.s)+(ws?' '+ws:'')+'<span class="car"></span>';
    const sg=$('acSug');
    if(step<c.st.length){ sg.innerHTML=c.st[step].map((w,i)=>'<button type="button" data-i="'+i+'">'+esc(w)+'</button>').join(''); sg.querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{ if(!busy)choose(+b.dataset.i); })); }
    else sg.innerHTML='<button type="button" disabled style="grid-column:1/4;color:var(--faint)">. . .</button>';
    $('acPath').innerHTML=c.st.map((x,i)=>'<i class="'+(i<picks.length?'p'+picks[i]:'')+'"></i>').join('');
    $('acBot').disabled=step>=c.st.length||busy;
  }
  function choose(i){
    const c=chain(); if(step>=c.st.length)return;
    words.push(c.st[step][i]); picks.push(i); step++;
    draw(true);
    if(step>=c.st.length)result(true);
    else if(i===2&&Math.random()<.5){ botMode='think'; modeUntil=botT+1; bot&&bot.emote('wow',900); }
  }
  function result(say){
    const m=$('acMsg'), n=picks.length, odd=picks.filter(i=>i===2).length, top=picks.filter(i=>i===0).length;
    let k='ac_mix'; if(top===n)k='ac_boring'; else if(odd*2>=n)k='ac_funny';
    m.className='msg'+(k==='ac_mix'?' ok':''); m.textContent=T(k);
    if(say){ if(k==='ac_funny')react('blush',pick(T('ok'))); else if(k==='ac_boring')react('think',pick(T('ok'))); else react('ok'); if(TR)TR.event('course.w01.ac'); }
  }
  async function auto(){
    if(busy)return; busy=true;
    if(step>=chain().st.length){ step=0; words=[]; picks=[]; $('acMsg').textContent=''; }
    $('acBot').disabled=true;
    while(step<chain().st.length){
      const r=Math.random(), i=r<.7?0:r<.93?1:2;
      const bs=[...$('acSug').querySelectorAll('button')];
      if(!RM){ for(let k=0;k<5;k++){ bs.forEach(b=>b.classList.remove('hot')); bs[k%3].classList.add('hot'); await wait(70); } bs.forEach(b=>b.classList.remove('hot')); bs[i].classList.add('hot'); await wait(260); }
      choose(i); await wait(200);
    }
    busy=false; draw(false);
  }
  return {render};
})());

/* 3. Обучи NODE: 6 карточек подписывает человек, 6 угадывает NODE */
TOOLS.push((function(){
  const box=$('tr'); const CAT=n=>n<=5, TRICKY=[7,9,10,11,12];
  let train=null, test=null, lab={}, phase='label', guess=null, uok=0;
  function start(){
    let o; do{ o=shuffle([1,2,3,4,5,6,7,8,9,10,11,12]); const c=o.slice(0,6).filter(CAT).length; if(c>=2&&c<=4)break; }while(true);
    train=o.slice(0,6); test=o.slice(6); lab={}; phase='label'; guess=null;
  }
  function render(){
    if(!train)start();
    const C=D().cards;
    let h=head('03','tr_t','tr_d');
    if(phase==='label'){
      const left=train.filter(n=>lab[n]===undefined).length;
      h+='<div class="tgrid">'+train.map(n=>'<div class="tc" data-n="'+n+'"><img src="img/card-'+n+'.webp" alt="" width="200" height="193"><div class="tb">'
        +'<button type="button" data-v="1" class="'+(lab[n]===1?'sel':'')+'">'+esc(T('tr_cat'))+'</button><button type="button" data-v="0" class="'+(lab[n]===0?'sel n0':'')+'">'+esc(T('tr_not'))+'</button></div></div>').join('')+'</div>'
        +'<div class="row"><button class="btn" type="button" id="trGo"'+(left?' disabled':'')+'>'+esc(T('tr_go'))+'</button><span class="note" style="margin:0" id="trLeft">'+(left?esc(T('tr_left',{n:left})):'')+'</span></div>';
      box.innerHTML=h;
      box.querySelectorAll('.tc').forEach(c=>c.querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{
        const n=+c.dataset.n; lab[n]=+b.dataset.v;
        c.querySelectorAll('button').forEach(x=>x.className=x===b?('sel'+(lab[n]===0?' n0':'')):'');
        const left=train.filter(k=>lab[k]===undefined).length;
        $('trGo').disabled=left>0; $('trLeft').textContent=left?T('tr_left',{n:left}):'';
      })));
      $('trGo').addEventListener('click',learn);
    } else if(phase==='learn'){
      h+='<p class="msg">'+esc(T('tr_learn'))+'</p><div class="trBar"><i id="trBar"></i></div>';
      box.innerHTML=h;
      requestAnimationFrame(()=>requestAnimationFrame(()=>{ const b=$('trBar'); if(b)b.style.width='100%'; }));
    } else {
      const nOk=test.filter(n=>guess[n]===CAT(n)).length;
      h+='<p class="cap" style="margin-top:4px">'+esc(T('tr_test'))+'</p><div class="tgrid">'+test.map((n,i)=>{ const ok=guess[n]===CAT(n);
        return '<div class="tc flip '+(ok?'ok':'no')+'" style="animation-delay:'+(RM?0:i*.18).toFixed(2)+'s"><span class="mk">'+(ok?'+':'x')+'</span><img src="img/card-'+n+'.webp" alt="" width="200" height="193"><div class="gs">NODE: '+esc(guess[n]?T('tr_cat'):T('tr_not'))+'</div><div class="nm">'+esc(C[n-1][0])+'</div></div>'; }).join('')+'</div>'
        +'<p class="msg '+(uok>=5?'ok':'bad')+'">'+esc(T('tr_res',{u:uok,n:nOk}))+' '+esc(uok>=5?T('tr_good'):T('tr_bad'))+'</p>';
      const wr=train.filter(n=>lab[n]!==(CAT(n)?1:0));
      if(wr.length)h+='<p class="cap" style="margin-top:14px">'+esc(T('tr_wrong'))+'</p><div class="wrong">'+wr.map(n=>'<div><img src="img/card-'+n+'.webp" alt=""><span><b>'+esc(C[n-1][0])+'.</b> '+esc(C[n-1][1])+'</span></div>').join('')+'</div>';
      h+='<div class="row" style="margin-top:14px"><button class="btn ghost" type="button" id="trAgain">'+esc(T('tr_again'))+'</button></div>';
      box.innerHTML=h;
      $('trAgain').addEventListener('click',()=>{ start(); render(); });
    }
  }
  async function learn(){
    phase='learn'; render();
    if(!playSeq('seq-read',2.6)){ botMode='think'; modeUntil=botT+2.6; bot&&bot.emote('think',2600); }
    talk(T('tr_learn'),2600);
    await wait(2600);
    uok=train.filter(n=>lab[n]===(CAT(n)?1:0)).length;
    const p=.45+.5*uok/6; guess={};
    test.forEach(n=>{ const pc=Math.max(.15,Math.min(.97,p-(TRICKY.indexOf(n)>=0?.2:0))); guess[n]=Math.random()<pc?CAT(n):!CAT(n); });
    phase='test'; render();
    react(uok>=5?'ok':'bad',uok>=5?T('tr_good'):pick(T('bad')));
    if(TR)TR.event('course.w01.train');
  }
  return {render};
})());

/* 4. Весы: кому отдать дело */
TOOLS.push((function(){
  const box=$('sc'); let order=null, i=0, cnt={ai:0,you:0}, msg=null;
  function start(){ order=shuffle([...Array(D().scale.length).keys()]); i=0; cnt={ai:0,you:0}; msg=null; }
  function render(){
    if(!order)start();
    const S=D().scale, fin=i>=order.length;
    box.innerHTML=head('04','sc_t','sc_d')+'<div class="scl"><div class="stage" id="scStage"><img class="st" src="img/scale-stand.webp" alt=""><img class="bm" src="img/scale-beam.webp" alt="">'
      +'<button class="pan you" type="button" data-p="you" aria-label="'+esc(T('sc_you'))+'"><img src="img/scale-panL.webp" alt=""><span class="tk">'+'<i></i>'.repeat(cnt.you)+'</span><span class="pl">'+esc(T('sc_you'))+'</span></button>'
      +'<button class="pan ai" type="button" data-p="ai" aria-label="'+esc(T('sc_ai'))+'"><img src="img/scale-panR.webp" alt=""><span class="tk">'+'<i></i>'.repeat(cnt.ai)+'</span><span class="pl">'+esc(T('sc_ai'))+'</span></button></div>'
      +'<div><p class="scN">'+(fin?'':esc(T('sc_n',{i:i+1,t:order.length})))+'</p><div class="scCard" id="scCard">'+(fin?esc(T('sc_done')):esc(S[order[i]][0]))+'</div>'
      +(fin?'<div class="row"><button class="btn ghost" type="button" id="scAgain">'+esc(T('sc_again'))+'</button></div>'
           :'<div class="row"><button class="btn ghost" type="button" data-p="you" style="--lc:var(--amber)">&lt; '+esc(T('sc_you'))+'</button><button class="btn ghost" type="button" data-p="ai">'+esc(T('sc_ai'))+' &gt;</button></div>')
      +'<p class="msg" id="scMsg"></p></div></div>';
    if(msg){ const m=$('scMsg'); m.className='msg '+msg[0]; m.textContent=msg[1]; }
    box.querySelectorAll('[data-p]').forEach(b=>b.addEventListener('click',()=>put(b.dataset.p)));
    if(fin)$('scAgain').addEventListener('click',()=>{ start(); render(); });
    layout();
  }
  function layout(){
    const st=$('scStage'); if(!st)return;
    const w=st.clientWidth||300, s=w/580, cx=w/2, py=70*s+12;
    const a=Math.max(-15,Math.min(15,(cnt.ai-cnt.you)*6))*Math.PI/180, L=190*s;
    st.style.height=(py+270*s+28)+'px';
    const sd=st.querySelector('.st'); sd.style.width=182*s+'px'; sd.style.left=(cx-91*s)+'px'; sd.style.top=(py-8*s)+'px';
    const bm=st.querySelector('.bm'); bm.style.width=420*s+'px'; bm.style.left=(cx-210*s)+'px'; bm.style.top=(py-43*s)+'px'; bm.style.transform='rotate('+(a*180/Math.PI).toFixed(2)+'deg)';
    const ends={you:[cx-L*Math.cos(a),py-L*Math.sin(a)],ai:[cx+L*Math.cos(a),py+L*Math.sin(a)]};
    st.querySelectorAll('.pan').forEach(p=>{ const e=ends[p.dataset.p]; p.style.width=180*s+'px'; p.style.left=(e[0]-90*s)+'px'; p.style.top=(e[1]-12*s)+'px'; });
  }
  function put(p){
    if(i>=order.length)return;
    const it=D().scale[order[i]];
    if(it[1]===p){
      cnt[p]++; i++; msg=['ok',it[2]];
      render();
      if(i>=order.length){ react('ok',T('sc_done')); if(TR)TR.event('course.w01.scale'); }
      else react('ok',false);
    } else {
      msg=['bad',T('sc_bad')+' '+it[2]];
      const m=$('scMsg'); m.className='msg bad'; m.textContent=msg[1];
      const c=$('scCard'); c.classList.remove('bad'); void c.offsetWidth; c.classList.add('bad');
      react('bad');
    }
  }
  let rt=null; addEventListener('resize',()=>{ clearTimeout(rt); rt=setTimeout(layout,100); });
  return {render};
})());

/* 5. Три вопроса и наклейка */
TOOLS.push((function(){
  const box=$('qz'); let qi=0, score=0, res=[], started=false;
  function render(){
    const Q=D().quiz;
    if(!started){ box.innerHTML='<h3><span class="tag">05</span><span>'+esc(T('q_t'))+'</span></h3><div class="parts" style="margin-top:12px">'+'<i></i>'.repeat(Q.length)+'</div><button class="btn" type="button" id="qGo">'+esc(T('go'))+'</button>'; $('qGo').addEventListener('click',begin); return; }
    if(qi>=Q.length)return finish();
    const q=Q[qi];
    box.innerHTML='<div class="parts">'+Q.map((x,k)=>'<i class="'+(res[k]===true?'on':res[k]===false?'off':'')+'"></i>').join('')+'</div>'
      +'<p class="qn">'+esc(T('q_n',{i:qi+1,t:Q.length}))+'</p><p class="qq">'+esc(q[0])+'</p><div class="qa">'
      +q[1].map((a,k)=>'<button type="button" data-i="'+k+'">'+esc(a)+'</button>').join('')+'</div><p class="qx" id="qX"></p><div class="row" style="margin-top:12px"><button class="btn" type="button" id="qNext" style="display:none">'+esc(T('q_next'))+'</button></div>';
    box.querySelectorAll('.qa button').forEach(b=>b.addEventListener('click',()=>{
      const k=+b.dataset.i, ok=k===q[2];
      box.querySelectorAll('.qa button').forEach(x=>{ x.disabled=true; if(+x.dataset.i===q[2])x.classList.add('ok'); });
      if(!ok)b.classList.add('no');
      res[qi]=ok; if(ok)score++;
      box.querySelectorAll('.parts i')[qi].className=ok?'on':'off';
      $('qX').textContent=(ok?T('q_ok'):T('q_bad'))+' '+q[3];
      react(ok?'ok':'bad');
      $('qNext').style.display='';
    }));
    $('qNext').addEventListener('click',()=>{ qi++; render(); });
  }
  function begin(){ started=true; qi=0; score=0; res=[]; render(); }
  function finish(){
    const Q=D().quiz, pass=score>=Q.length-1;
    box.innerHTML='<div class="parts">'+res.map(r=>'<i class="'+(r?'on':'off')+'"></i>').join('')+'</div><p class="qq">'+esc(T('q_res',{s:score,t:Q.length}))+'</p><p class="qx">'+esc(pass?T('q_pass'):T('q_fail'))+'</p>'
      +'<div class="row" style="margin-top:12px"><button class="btn ghost" type="button" id="qAgain">'+esc(T('q_again'))+'</button></div>';
    $('qAgain').addEventListener('click',begin);
    if(pass){ award(); botMode='cheer'; modeUntil=botT+2.5; react('ok',T('q_pass')); if(TR)TR.event('course.w01.done'); }
    else react('bad',T('q_fail'));
  }
  return {render};
})());

/* ---------- меню ---------- */
const drawer=$('drawer'), menuBtn=$('menuBtn'); let menuPushed=false;
function buildMenu(){
  $('drParts').innerHTML=[1,2,3,4,5,6].map(i=>'<button class="dbtn" type="button" data-s="'+i+'"><span class="n">0'+i+'</span><span>'+esc(T('t'+i))+'</span></button>').join('');
  $('drParts').querySelectorAll('.dbtn').forEach(b=>b.addEventListener('click',()=>{ closeMenu(); setTimeout(()=>$(SEC_ID[+b.dataset.s]).scrollIntoView({behavior:RM?'auto':'smooth'}),RM?0:220); }));
  const lg=$('langs'); lg.innerHTML='';
  CODES.forEach(c=>{ const b=document.createElement('button'); b.type='button'; b.textContent=c.toUpperCase(); b.classList.toggle('sel',c===lang()); b.addEventListener('click',()=>setLang(c)); lg.appendChild(b); });
  markMenu();
}
function markMenu(){ document.querySelectorAll('#drParts .dbtn').forEach(b=>b.classList.toggle('cur',+b.dataset.s===curSec)); }
function openMenu(){
  if(document.body.classList.contains('menu'))return;
  document.body.classList.add('menu'); drawer.setAttribute('aria-hidden','false'); menuBtn.setAttribute('aria-expanded','true');
  try{ history.pushState({w01Menu:1},''); menuPushed=true; }catch(e){ menuPushed=false; }
}
function closeMenu(fromPop){
  if(!document.body.classList.contains('menu'))return;
  document.body.classList.remove('menu'); drawer.setAttribute('aria-hidden','true'); menuBtn.setAttribute('aria-expanded','false');
  if(menuPushed&&!fromPop){ menuPushed=false; try{ history.back(); }catch(e){} }
  menuPushed=false;
}
menuBtn.addEventListener('click',()=>document.body.classList.contains('menu')?closeMenu():openMenu());
$('drClose').addEventListener('click',()=>closeMenu());
$('veil').addEventListener('click',()=>closeMenu());
addEventListener('keydown',e=>{ if(e.key==='Escape')closeMenu(); });
addEventListener('popstate',()=>closeMenu(true));

/* ---------- тексты ---------- */
function texts(){
  document.documentElement.lang=lang();
  document.title=T('title')+' / LAYER_01 / NODE AI / A.C.EON';
  document.querySelectorAll('[data-k]').forEach(el=>{ el.textContent=T(el.dataset.k); });
  $('back').textContent=T('back'); $('core').querySelector('.lbl').textContent=T('core');
  menuBtn.querySelector('.lbl').textContent=T('menu'); menuBtn.setAttribute('aria-label',T('menu'));
  $('drTitle').textContent=T('menu'); $('drClose').setAttribute('aria-label',T('close'));
  $('eyebrow').textContent=T('eyebrow'); $('title').textContent=T('title'); $('lead').textContent=T('lead'); $('mapT').textContent=T('mapT'); $('go').textContent=T('go')+' >';
  $('map').innerHTML=[1,2,3,4,5,6].map(i=>'<a href="#'+SEC_ID[i]+'"><span class="n">0'+i+'</span><span>'+esc(T('s'+i))+'</span></a>').join('');
  $('fNext').textContent=T('f_next')+' >';
  const tl=$('tline'), seen=tl.children.length>0;
  tl.innerHTML=D().hist.map((h,k)=>'<li class="rv'+(seen?' in':'')+'"><img src="img/t-'+(k+1)+'.webp" alt="" width="220" height="217"><div class="tx"><span class="yr">'+esc(h[0])+'</span><b>'+esc(h[1])+'</b><p>'+esc(h[2])+'</p></div></li>').join('');
  if(!seen)reveal(tl);
  $('footR').textContent=T('title');
  buildMenu(); stickerUI();
}

/* ---------- старт ---------- */
texts(); TOOLS.forEach(t=>t.render());
setBg(0);
if(TR)TR.event('course.w01');
})();
