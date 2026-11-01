/* LAYER_01 / тема 02 "Не волшебство и не калькулятор": подробная страница.
   Разделы въезжают при прокрутке (.rv -> .in), фон меняется по текущему разделу, робот NODE (../../bot.js) комментирует.
   Пособия: pt две ямы, mc калькулятор и модель, so правила или модель, tk фокус за занавесом, ga тон и правда, sh ядро и оболочки, qz три вопроса.
   За проверку даётся наклейка темы, хранится в Store('aicourse').l01.deep. */
(function(){
'use strict';
const $=id=>document.getElementById(id);
const AU=window.AceonUniverse||{id:2,capMs:16,dprCap:1.5};
const TIER=AU.id||2;
const RM=matchMedia('(prefers-reduced-motion: reduce)').matches;
const TR=window.Trace||null;
const TOPIC='not-magic';
if(RM)document.documentElement.classList.add('nomo');

/* ---------- язык ---------- */
const LL=window.W02_LANG||{};
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
  seqBase:{'seq-cheer':'../img/','seq-facepalm':'../img/','seq-blush':'../img/','seq-think':'../img/','seq-trick':'img/'}}):null;
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
/* кадры GPT поверх собранного робота: cheer, facepalm, blush, think (сидя), trick (стоя, фокус со шляпой) */
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
if(bot){ requestAnimationFrame(frame); hit.addEventListener('click',()=>{ if(Math.random()<.5)react('blush'); else { bot.jump(); react('ok'); } }); setTimeout(()=>['seq-cheer','seq-facepalm','seq-think','seq-blush','seq-trick'].forEach(n=>bot.seqImg(n)),1500); }
else { bc.style.display='none'; hit.style.display='none'; }

/* ---------- фон и текущий раздел ---------- */
const BG=['../../img/bg-novice','img/w02-pits','img/w02-rules','img/w02-rules','img/w02-magic','img/w02-confident','img/w02-shell','../../img/bg-choose'];
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
const SEC_ID=['top0','t1','t2','t3','t4','t5','t6','fin'];

/* =========================================================
   Пособия
   ========================================================= */
const TOOLS=[];
function head(n,k,dk){ return '<h3><span class="tag">'+n+'</span><span>'+esc(T(k))+'</span></h3><p class="d">'+esc(T(dk))+'</p>'; }

/* 1. Две ямы: фраза летит в яму оракула, на мостик или в яму болталки */
TOOLS.push((function(){
  const box=$('pt'), Z=['oracle','middle','noise'], ZC={oracle:'o',middle:'m',noise:'n'}, IMG={oracle:'pit-oracle',middle:'pit-platform',noise:'pit-noise'};
  let order=null, i=0, cnt={}, msg=null, ln=null, busy=false;
  function start(){ order=shuffle([...Array(D().pits.length).keys()]); i=0; cnt={oracle:0,middle:0,noise:0}; msg=null; ln=lang(); }
  function render(){
    if(!order||ln!==lang())start();
    const P=D().pits, fin=i>=order.length;
    box.innerHTML=head('01','pt_t','pt_d')
      +'<p class="qn2">'+(fin?'':esc(T('pt_left',{n:order.length-i})))+'</p><div class="qcard" id="ptCard">'+esc(fin?T('pt_done'):P[order[i]][0])+'</div>'
      +'<div class="pits">'+Z.map(z=>'<button class="pz '+ZC[z]+'" type="button" data-z="'+z+'"><b>'+cnt[z]+'</b><img src="img/'+IMG[z]+'.webp" alt="" width="260" height="'+(z==='middle'?173:z==='oracle'?237:228)+'"><span>'+esc(T(z==='middle'?'pt_mid':'pt_'+z))+'</span></button>').join('')+'</div>'
      +'<p class="msg" id="ptMsg"></p>'+(fin?'<div class="row"><button class="btn ghost" type="button" id="ptAgain">'+esc(T('so_again'))+'</button></div>':'');
    if(msg){ const m=$('ptMsg'); m.className='msg '+msg[0]; m.textContent=msg[1]; }
    box.querySelectorAll('.pz').forEach(b=>b.addEventListener('click',()=>put(b.dataset.z,b)));
    if(fin)$('ptAgain').addEventListener('click',()=>{ start(); render(); });
  }
  async function put(z,btn){
    if(busy||i>=order.length)return;
    const it=D().pits[order[i]], c=$('ptCard');
    if(it[1]===z){
      busy=true; cnt[z]++; msg=['ok',it[2]];
      const br=btn.getBoundingClientRect(), cr=c.getBoundingClientRect();
      c.classList.add('drop'); c.style.transform='translate('+Math.round(br.left+br.width/2-cr.left-cr.width/2)+'px,'+Math.round(br.top+br.height*.45-cr.top-cr.height/2)+'px) scale(.2) rotate('+(z==='noise'?18:z==='oracle'?-18:0)+'deg)';
      btn.classList.remove('ok'); void btn.offsetWidth; btn.classList.add('ok');
      await wait(480); i++; busy=false; render();
      if(i>=order.length){ react('ok',T('pt_done')); if(TR)TR.event('course.w02.pits'); }
      else talk(it[2],3200);
    } else {
      msg=['bad',T('pt_bad')+' '+it[2]];
      const m=$('ptMsg'); m.className='msg bad'; m.textContent=msg[1];
      c.classList.remove('bad'); void c.offsetWidth; c.classList.add('bad');
      btn.classList.remove('bad'); void btn.offsetWidth; btn.classList.add('bad');
      react('bad',false);
    }
  }
  return {render};
})());

/* 2. Две машины: калькулятор и модель на один и тот же запрос */
TOOLS.push((function(){
  const box=$('mc'); let sel=0, runs=0, ln=null, busy=false, noted=false;
  function render(){
    if(ln!==lang()){ ln=lang(); sel=0; runs=0; }
    const M=D().mach, m=M[sel];
    box.innerHTML=head('02','mc_t','mc_d')
      +'<div class="mcIn">'+M.map((x,k)=>'<button type="button" data-k="'+k+'" class="'+(k===sel?'sel':'')+'">'+esc(x[0])+'</button>').join('')+'</div>'
      +'<div class="mc">'+['calc','model'].map(n=>'<div class="mach" id="mc_'+n+'"><div class="mw"><img src="img/mach-'+n+'.webp" alt="" width="330" height="429"><div class="out" id="mcOut_'+n+'"></div></div><p class="nm">'+esc(T('mc_'+n))+'</p><p class="rn" id="mcRn_'+n+'"></p></div>').join('')+'</div>'
      +'<div class="row" style="justify-content:center;margin-top:12px"><button class="btn" type="button" id="mcRun">'+esc(T('mc_run'))+'</button></div><p class="msg" id="mcMsg"></p>';
    box.querySelectorAll('.mcIn button').forEach(b=>b.addEventListener('click',()=>{ if(busy)return; sel=+b.dataset.k; runs=0; render(); }));
    $('mcRun').addEventListener('click',run);
    if(runs)show(false);
  }
  function show(anim){
    const m=D().mach[sel], oc=$('mcOut_calc'), om=$('mcOut_model');
    oc.textContent=m[1]; om.textContent=m[2][(runs-1)%m[2].length];
    oc.classList.toggle('err',!/^[\d\s.,:+x%()-]+$/.test(m[1]));
    if(anim){ [oc,om].forEach(o=>{ o.classList.remove('new'); void o.offsetWidth; o.classList.add('new'); }); }
    $('mcRn_calc').textContent=$('mcRn_model').textContent=T('mc_runN',{n:runs});
    if(runs>=3){ const g=$('mcMsg'); g.className='msg ok'; g.textContent=T('mc_note'); }
  }
  async function run(){
    if(busy)return; busy=true;
    const c=$('mc_calc'), m=$('mc_model');
    $('mcOut_calc').textContent=''; $('mcOut_model').textContent='';
    [c,m].forEach(x=>x.classList.remove('shk','glow')); void c.offsetWidth;
    c.classList.add('shk'); m.classList.add('glow');
    await wait(480);
    runs++; show(true); busy=false;
    if(runs===3&&!noted){ noted=true; react('think',T('mc_note')); if(TR)TR.event('course.w02.mach'); }
    else if(runs===1){ botMode='point'; modeUntil=botT+1; }
  }
  return {render};
})());

/* 3. Сортировка: правила или модель */
TOOLS.push((function(){
  const box=$('so'); let order=null, i=0, msg=null, ln=null;
  function start(){ order=shuffle([...Array(D().sort.length).keys()]); i=0; msg=null; ln=lang(); }
  function render(){
    if(!order||ln!==lang())start();
    const S=D().sort, fin=i>=order.length;
    box.innerHTML=head('03','so_t','so_d')
      +'<p class="qn2">'+(fin?'':esc(T('so_n',{i:i+1,t:order.length})))+'</p><div class="qcard" id="soCard">'+esc(fin?T('so_done'):S[order[i]][0])+'</div>'
      +(fin?'<div class="row" style="justify-content:center"><button class="btn ghost" type="button" id="soAgain">'+esc(T('so_again'))+'</button></div>'
           :'<div class="bx">'+[['rules','r'],['model','m']].map(([k,c])=>'<button class="bxb '+c+'" type="button" data-to="'+k+'"><span class="bi"><img class="cl" src="img/box-'+k+'-closed.webp" alt="" width="260" height="246"><img class="op" src="img/box-'+k+'-open.webp" alt="" width="260" height="246"></span>'+esc(T('so_'+k))+'</button>').join('')+'</div>')
      +'<p class="msg" id="soMsg"></p>';
    if(msg){ const m=$('soMsg'); m.className='msg '+msg[0]; m.textContent=msg[1]; }
    box.querySelectorAll('.bxb').forEach(b=>b.addEventListener('click',()=>put(b.dataset.to,b)));
    if(fin)$('soAgain').addEventListener('click',()=>{ start(); render(); });
  }
  function put(to,btn){
    if(i>=order.length)return;
    const it=D().sort[order[i]];
    if(it[1]===to){
      i++; msg=['ok',it[2]]; render();
      const nb=box.querySelector('.bxb[data-to="'+to+'"]'); if(nb){ nb.classList.add('open','ok'); setTimeout(()=>nb.classList.remove('open'),500); }
      const c=$('soCard'); c.classList.add('in');
      if(i>=order.length){ react('ok',T('so_done')); if(TR)TR.event('course.w02.sort'); }
      else if(i%4===0)react('ok',false);
    } else {
      msg=['bad',T('so_bad')+' '+it[2]];
      const m=$('soMsg'); m.className='msg bad'; m.textContent=msg[1];
      const c=$('soCard'); c.classList.remove('bad'); void c.offsetWidth; c.classList.add('bad');
      btn.classList.remove('bad'); void btn.offsetWidth; btn.classList.add('bad');
      react('bad',false);
    }
  }
  return {render};
})());

/* 4. Фокус за занавесом */
TOOLS.push((function(){
  const box=$('tk'); let sel=0, open=false; const seen=new Set(); let allSaid=false;
  function render(){
    const K=D().tricks;
    box.innerHTML=head('04','tk_t','tk_d')
      +'<div class="stg'+(open?' open':'')+'" id="tkStg"><img class="bk" src="img/stage-back.webp" alt="" width="1200" height="675"><img class="cu l" src="img/curtain-l.webp" alt=""><img class="cu r" src="img/curtain-r.webp" alt="">'
      +'<img class="hat" src="img/hat.webp" alt=""><div class="ban" id="tkBan">'+esc(K[sel][0])+'</div></div>'
      +'<div class="tkb">'+K.map((k,n)=>'<button type="button" data-n="'+n+'" class="'+(n===sel?'sel ':'')+(seen.has(n)?'seen':'')+'">'+esc(k[0])+'</button>').join('')+'</div>'
      +'<div class="row"><button class="btn" type="button" id="tkOpen">'+esc(open?T('tk_close'):T('tk_open'))+'</button></div>'
      +'<div id="tkBeh"></div><p class="msg ok" id="tkMsg"></p>';
    box.querySelectorAll('.tkb button').forEach(b=>b.addEventListener('click',()=>{ sel=+b.dataset.n; open=false; render(); }));
    $('tkOpen').addEventListener('click',toggle);
    if(open)behind(false);
    if(seen.size>=K.length)$('tkMsg').textContent=T('tk_all');
  }
  function behind(anim){
    const k=D().tricks[sel];
    $('tkBeh').innerHTML='<div class="behind'+(anim?' in':'')+'"><b>'+esc(T('tk_behind'))+'</b><ul>'+k[1].map(s=>'<li>'+esc(s)+'</li>').join('')+'</ul></div>';
  }
  function toggle(){
    open=!open;
    const st=$('tkStg'); st.classList.toggle('open',open);
    $('tkOpen').textContent=open?T('tk_close'):T('tk_open');
    if(open){
      const first=seen.size===0; seen.add(sel);
      box.querySelectorAll('.tkb button').forEach(b=>b.classList.toggle('seen',seen.has(+b.dataset.n)));
      setTimeout(()=>{ if(open)behind(true); },RM?0:700);
      if(!playSeq('seq-trick',3)){ react('think',false); }
      if(seen.size>=D().tricks.length&&!allSaid){ allSaid=true; $('tkMsg').textContent=T('tk_all'); setTimeout(()=>react('ok',T('tk_all')),RM?0:3000); if(TR)TR.event('course.w02.trick'); }
      else if(first)talk(T('say4'),3000);
    } else $('tkBeh').innerHTML='';
  }
  return {render};
})());

/* 5. Тон и правда: две стрелки */
TOOLS.push((function(){
  const box=$('ga'); let order=null, i=0, score=0, ans=null, ln=null;
  function start(){ order=shuffle([...Array(D().gauge.length).keys()]); i=0; score=0; ans=null; ln=lang(); }
  const ang=t=>-90+1.8*t;
  function render(){
    if(!order||ln!==lang())start();
    const G=D().gauge, fin=i>=order.length, g=fin?null:G[order[i]];
    box.innerHTML=head('05','ga_t','ga_d')
      +'<div class="gg"><img src="img/gauge.webp" alt="" width="900" height="600"><img class="ndl a" id="gaA" src="img/needle.webp" alt=""><img class="ndl b'+(ans===null&&!fin?' wait':'')+'" id="gaB" src="img/needle.webp" alt="">'
      +'<span class="gl a">'+esc(T('ga_tone'))+'</span><span class="gl b">'+esc(T('ga_truth'))+'</span></div>'
      +(fin?'<p class="qq" style="text-align:center;margin-top:10px">'+esc(T('ga_res',{s:score,t:order.length}))+'</p><p class="msg ok" style="text-align:center">'+esc(T('ga_end'))+'</p><div class="row" style="justify-content:center"><button class="btn ghost" type="button" id="gaAgain">'+esc(T('ga_again'))+'</button></div>'
           :'<p class="qn2" style="margin-top:10px">'+esc(T('ga_n',{i:i+1,t:order.length}))+'</p><div class="qcard" id="gaCard">'+esc(g[0])+'</div>'
            +(ans===null?'<div class="ga-row"><button class="btn" type="button" data-v="1">'+esc(T('ga_true'))+'</button><button class="btn ghost" type="button" data-v="0" style="--lc:var(--red)">'+esc(T('ga_false'))+'</button></div>'
                        :'<p class="msg '+(ans===g[2]?'ok':'bad')+'" style="text-align:center">'+esc((ans===g[2]?T('q_ok'):T('q_bad'))+' '+g[3])+'</p><div class="row" style="justify-content:center"><button class="btn" type="button" id="gaNext">'+esc(T('ga_next'))+'</button></div>'));
    const A=$('gaA'), B=$('gaB'), toA='rotate('+(fin?-90:ang(g[1]))+'deg)';
    const snap=(el,tr)=>{ el.style.transition='none'; el.style.transform=tr; void el.offsetWidth; el.style.transition=''; };
    if(ans===null){ snap(A,'rotate(-90deg)'); snap(B,'rotate(0deg)'); requestAnimationFrame(()=>requestAnimationFrame(()=>{ A.style.transform=toA; })); }
    else { snap(A,toA); snap(B,'rotate(0deg)'); requestAnimationFrame(()=>requestAnimationFrame(()=>{ B.style.transform='rotate('+(g[2]?75:-75)+'deg)'; })); }
    box.querySelectorAll('.ga-row .btn').forEach(b=>b.addEventListener('click',()=>{
      ans=b.dataset.v==='1'; const ok=ans===g[2]; if(ok)score++;
      render(); react(ok?'ok':'bad',false); talk(g[3],3200);
    }));
    if(fin)$('gaAgain').addEventListener('click',()=>{ start(); render(); });
    else if(ans!==null)$('gaNext').addEventListener('click',()=>{ i++; ans=null; render(); if(i>=order.length){ react('think',T('ga_end')); if(TR)TR.event('course.w02.gauge'); } });
  }
  return {render};
})());

/* 6. Одно ядро, разные оболочки */
TOOLS.push((function(){
  const box=$('sh'), IDS=['chat','voice','paint','camera','car']; let sel=-1; const seen=new Set(); let allSaid=false;
  function render(){
    const S=D().shells;
    box.innerHTML=head('06','sh_t','sh_d')
      +'<div class="shbs">'+IDS.map((k,n)=>'<button type="button" data-n="'+n+'" class="'+(n===sel?'sel ':'')+(seen.has(n)?'seen':'')+'">'+esc(S[k][0])+'</button>').join('')+'</div>'
      +'<div class="shw"><div class="shs"><img class="core" src="img/core.webp" alt="" width="420" height="420">'+IDS.map((k,n)=>'<img class="shell'+(n===sel?' on':'')+'" data-n="'+n+'" src="img/shell-'+k+'.webp" alt="" width="420" height="420">').join('')+'<span class="cc">'+esc(T('sh_core'))+'</span></div>'
      +'<div class="shInfo" id="shInfo"></div></div><p class="msg ok" id="shMsg"></p>';
    box.querySelectorAll('.shbs button').forEach(b=>b.addEventListener('click',()=>pick(+b.dataset.n)));
    info();
    if(seen.size>=IDS.length)$('shMsg').textContent=T('sh_all');
  }
  function info(){
    const el=$('shInfo');
    if(sel<0){ el.innerHTML='<p>'+esc(T('sh_d'))+'</p>'; return; }
    const s=D().shells[IDS[sel]]; el.innerHTML='<b>'+esc(s[0])+'</b><p>'+esc(s[1])+'</p>';
  }
  function pick(n){
    sel=n; seen.add(n);
    box.querySelectorAll('.shbs button').forEach(b=>{ const k=+b.dataset.n; b.classList.toggle('sel',k===n); b.classList.toggle('seen',seen.has(k)); });
    box.querySelectorAll('.shs .shell').forEach(im=>im.classList.toggle('on',+im.dataset.n===n));
    info();
    const s=D().shells[IDS[n]];
    if(seen.size>=IDS.length&&!allSaid){ allSaid=true; $('shMsg').textContent=T('sh_all'); react('ok',s[2]); if(TR)TR.event('course.w02.shell'); }
    else { botMode='wave'; modeUntil=botT+1.2; bot&&bot.emote('happy',1200); talk(s[2],3400); }
  }
  return {render};
})());

/* 7. Три вопроса из набора и наклейка */
TOOLS.push((function(){
  const box=$('qz'); let qi=0, score=0, res=[], started=false, set=[];
  const Qs=()=>set.map(k=>D().quiz[k]);
  function render(){
    if(started&&set.some(k=>k>=D().quiz.length))started=false;
    const Q=started?Qs():[0,1,2];
    if(!started){ box.innerHTML='<h3><span class="tag">07</span><span>'+esc(T('q_t'))+'</span></h3><div class="parts" style="margin-top:12px">'+'<i></i>'.repeat(Q.length)+'</div><button class="btn" type="button" id="qGo">'+esc(T('go'))+'</button>'; $('qGo').addEventListener('click',begin); return; }
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
  function begin(){ started=true; qi=0; score=0; res=[]; set=shuffle([...Array(D().quiz.length).keys()]).slice(0,3); render(); }
  function finish(){
    const Q=Qs(), pass=score>=Q.length-1;
    box.innerHTML='<div class="parts">'+res.map(r=>'<i class="'+(r?'on':'off')+'"></i>').join('')+'</div><p class="qq">'+esc(T('q_res',{s:score,t:Q.length}))+'</p><p class="qx">'+esc(pass?T('q_pass'):T('q_fail'))+'</p>'
      +'<div class="row" style="margin-top:12px"><button class="btn ghost" type="button" id="qAgain">'+esc(T('q_again'))+'</button></div>';
    $('qAgain').addEventListener('click',begin);
    if(pass){ award(); botMode='cheer'; modeUntil=botT+2.5; react('ok',T('q_pass')); if(TR)TR.event('course.w02.done'); }
    else react('bad',T('q_fail'));
  }
  return {render};
})());

/* ---------- меню ---------- */
const drawer=$('drawer'), menuBtn=$('menuBtn'); let menuPushed=false;
function buildMenu(){
  $('drParts').innerHTML=[1,2,3,4,5,6,7].map(i=>'<button class="dbtn" type="button" data-s="'+i+'"><span class="n">0'+i+'</span><span>'+esc(T('t'+i))+'</span></button>').join('');
  $('drParts').querySelectorAll('.dbtn').forEach(b=>b.addEventListener('click',()=>{ closeMenu(); setTimeout(()=>$(SEC_ID[+b.dataset.s]).scrollIntoView({behavior:RM?'auto':'smooth'}),RM?0:220); }));
  const lg=$('langs'); lg.innerHTML='';
  CODES.forEach(c=>{ const b=document.createElement('button'); b.type='button'; b.textContent=c.toUpperCase(); b.classList.toggle('sel',c===lang()); b.addEventListener('click',()=>setLang(c)); lg.appendChild(b); });
  markMenu();
}
function markMenu(){ document.querySelectorAll('#drParts .dbtn').forEach(b=>b.classList.toggle('cur',+b.dataset.s===curSec)); }
function openMenu(){
  if(document.body.classList.contains('menu'))return;
  document.body.classList.add('menu'); drawer.setAttribute('aria-hidden','false'); menuBtn.setAttribute('aria-expanded','true');
  try{ history.pushState({w02Menu:1},''); menuPushed=true; }catch(e){ menuPushed=false; }
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
  $('map').innerHTML=[1,2,3,4,5,6,7].map(i=>'<a href="#'+SEC_ID[i]+'"><span class="n">0'+i+'</span><span>'+esc(T('s'+i))+'</span></a>').join('');
  $('fNext').textContent=T('f_next')+' >';
  $('footR').textContent=T('title');
  buildMenu(); stickerUI();
}

/* ---------- старт ---------- */
texts(); TOOLS.forEach(t=>t.render());
setBg(0);
if(TR)TR.event('course.w02');
})();
