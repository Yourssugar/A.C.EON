/* LAYER_01 / тема 03 "Чем он поможет тебе уже сегодня": подробная страница.
   Разделы въезжают при прокрутке (.rv -> .in), фон меняется по текущему разделу, робот NODE (../../bot.js) комментирует.
   Пособия: tr переводчик с заумного, ms из каши в план, du сдуй канцелярит, ho найди дыры, gb автомат идей, pp пустой лист, tl светофор задач, me примерь на себя, qz три вопроса.
   За проверку даётся наклейка темы, хранится в Store('aicourse').l01.deep. */
(function(){
'use strict';
const $=id=>document.getElementById(id);
const AU=window.AceonUniverse||{id:2,capMs:16,dprCap:1.5};
const TIER=AU.id||2;
const RM=matchMedia('(prefers-reduced-motion: reduce)').matches;
const TR=window.Trace||null;
const TOPIC='human-use';
if(RM)document.documentElement.classList.add('nomo');

/* ---------- язык ---------- */
const LL=window.W03_LANG||{};
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
  seqBase:{'seq-cheer':'../img/','seq-facepalm':'../img/','seq-blush':'../img/','seq-think':'../img/','seq-broom':'img/'}}):null;
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
/* кадры GPT поверх собранного робота: cheer, facepalm, blush, think (сидя), broom (стоя, подметает) */
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
if(bot){ requestAnimationFrame(frame); hit.addEventListener('click',()=>{ if(Math.random()<.5)react('blush'); else { bot.jump(); react('ok'); } }); setTimeout(()=>['seq-cheer','seq-facepalm','seq-think','seq-blush','seq-broom'].forEach(n=>bot.seqImg(n)),1500); }
else { bc.style.display='none'; hit.style.display='none'; }

/* ---------- фон и текущий раздел ---------- */
const BG=['../../img/bg-novice','img/w03-today','img/w03-understand','img/w03-rewrite','img/w03-start','img/w03-filter','img/w03-me','../../img/bg-choose'];
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

const MODES=['understand','organize','rewrite','check','invent','start'];
const MODE_TOOL={understand:'tr',organize:'ms',rewrite:'du',check:'ho',invent:'gb',start:'pp'};
const STAR='<svg viewBox="0 0 24 24"><path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/></svg>';

/* 1. Переводчик с заумного: ручка на 4 уровня */
TOOLS.push((function(){
  const box=$('tr'), ANG=[-52,52,124,-124]; let ti=0, lv=-1, ln=null; const seen=new Set(); let doneSaid=false;
  function render(){
    if(ln!==lang()){ ln=lang(); ti=0; lv=-1; seen.clear(); }
    const S=D().simple, s=S[ti];
    box.innerHTML=head('02','tr_t','tr_d')
      +'<div class="chips">'+S.map((x,k)=>'<button type="button" data-k="'+k+'" class="'+(k===ti?'sel':'')+'">'+esc(x[0])+'</button>').join('')+'</div>'
      +'<div class="trw"><div><div class="trm" id="trM"><img class="b" src="img/tr-body.webp" alt="" width="380" height="409"><img src="img/tr-dial.webp" alt=""><img class="kn" id="trK" src="img/tr-knob.webp" alt=""><button class="hit" type="button" id="trHit" aria-label="'+esc(T('tr_turn'))+'"></button></div>'
      +'<div class="trLv">'+T('tr_lv').map((x,k)=>'<button type="button" data-l="'+k+'" class="'+(k===lv?'sel ':'')+(seen.has(k)?'seen':'')+'">'+esc(x)+'</button>').join('')+'</div></div>'
      +'<div><p class="lbl2">'+esc(T('tr_src'))+'</p><div class="trSrc">'+esc(s[1])+'</div><p class="lbl2" id="trLbl">'+esc(T('tr_out'))+(lv>=0?': '+esc(T('tr_lv')[lv]):'')+'</p><div class="paperbox trOut" id="trOut">'+(lv>=0?esc(s[2][lv]):'<span style="color:#8a9396">'+esc(T('tr_turn'))+'</span>')+'</div><p class="msg ok" id="trMsg"></p></div></div>';
    $('trK').style.transform='rotate('+(lv>=0?ANG[lv]:0)+'deg)';
    box.querySelectorAll('.chips button').forEach(b=>b.addEventListener('click',()=>{ ti=+b.dataset.k; lv=-1; seen.clear(); doneSaid=false; render(); }));
    box.querySelectorAll('.trLv button').forEach(b=>b.addEventListener('click',()=>set(+b.dataset.l)));
    $('trHit').addEventListener('click',()=>set((lv+1)%4));
    if(seen.size>=4)$('trMsg').textContent=T('tr_done');
  }
  function set(l){
    lv=l; seen.add(l);
    const s=D().simple[ti], o=$('trOut');
    $('trK').style.transform='rotate('+ANG[l]+'deg)';
    const m=$('trM'); m.classList.remove('shk'); void m.offsetWidth; m.classList.add('shk');
    $('trLbl').textContent=T('tr_out')+': '+T('tr_lv')[l];
    o.textContent=s[2][l]; o.classList.remove('new'); void o.offsetWidth; o.classList.add('new');
    box.querySelectorAll('.trLv button').forEach(b=>{ const k=+b.dataset.l; b.classList.toggle('sel',k===l); b.classList.toggle('seen',seen.has(k)); });
    if(seen.size>=4&&!doneSaid){ doneSaid=true; $('trMsg').textContent=T('tr_done'); react('ok',T('tr_done')); if(TR)TR.event('course.w03.simple'); }
    else if(l===3)react('blush',false);
    else { botMode='think'; modeUntil=botT+.8; }
  }
  return {render};
})());

/* 2. Из каши в план: стикеры разлетаются по шагам (FLIP) */
TOOLS.push((function(){
  const box=$('ms'); let gi=0, planned=false, ln=null, pos=null;
  function scatter(n){ const w=box.clientWidth||600, narrow=w<520, nw=narrow?128:150, cols=narrow?2:3, rows=Math.ceil(n/cols), cw=(w-60)/cols;
    const order=shuffle([...Array(n).keys()]);
    return order.map((k,j)=>({k,x:Math.round(10+(j%cols)*cw+Math.random()*Math.max(4,cw-nw-10)),y:Math.round(8+Math.floor(j/cols)*(narrow?95:100)+Math.random()*24),r:(Math.random()*14-7).toFixed(1)})); }
  function render(){
    if(ln!==lang()){ ln=lang(); gi=0; planned=false; pos=null; }
    const M=D().mess, g=M[gi];
    if(!pos)pos=scatter(g[1].length);
    box.innerHTML=head('02','ms_t','ms_d')+'<p class="msGoal"><b>'+esc(T('ms_goal'))+'</b>'+esc(g[0])+'</p><div class="msb" id="msB"></div>'
      +'<div class="row"><button class="btn" type="button" id="msGo">'+esc(planned?T('ms_mix'):T('ms_go'))+'</button>'+(M.length>1?'<button class="btn ghost" type="button" id="msNext">'+esc(T('ms_next'))+'</button>':'')+'</div><p class="msg ok" id="msMsg">'+(planned?esc(T('ms_done')):'')+'</p>';
    layout(false);
    $('msGo').addEventListener('click',toggle);
    if($('msNext'))$('msNext').addEventListener('click',()=>{ gi=(gi+1)%M.length; planned=false; pos=null; render(); });
  }
  function noteEl(g,k){ const d=document.createElement('div'); d.className='nt'; d.dataset.k=k; d.textContent=g[1][k]; return d; }
  function layout(animate){
    const B=$('msB'), g=D().mess[gi];
    const first=new Map(); if(animate)B.querySelectorAll('.nt').forEach(n=>first.set(n.dataset.k,n.getBoundingClientRect()));
    B.innerHTML=''; B.classList.toggle('plan',planned);
    if(planned){
      g[2].forEach((st,si)=>{ const c=document.createElement('div'); c.className='step'; c.innerHTML='<b><i>'+(si+1)+'</i>'+esc(st[0])+'</b>'; st[1].forEach(k=>c.appendChild(noteEl(g,k))); B.appendChild(c); });
    } else {
      let maxY=0;
      pos.forEach(p=>{ const n=noteEl(g,p.k); n.style.left=p.x+'px'; n.style.top=p.y+'px'; n.style.setProperty('--r',p.r+'deg'); B.appendChild(n); maxY=Math.max(maxY,p.y); });
      B.style.minHeight=(maxY+110)+'px';
    }
    if(planned)B.style.minHeight='';
    if(animate&&!RM){
      B.querySelectorAll('.nt').forEach(n=>{ const f=first.get(n.dataset.k); if(!f)return; const l=n.getBoundingClientRect();
        const dx=f.left-l.left, dy=f.top-l.top;
        n.animate([{transform:'translate('+dx+'px,'+dy+'px) rotate('+(planned?(Math.random()*10-5):0)+'deg)'},{transform:planned?'none':'rotate('+(n.style.getPropertyValue('--r')||'0deg')+')'}],{duration:650+Math.random()*250,easing:'cubic-bezier(.2,.8,.2,1)'}); });
    }
  }
  function toggle(){
    planned=!planned; if(!planned)pos=scatter(D().mess[gi][1].length);
    layout(true);
    $('msGo').textContent=planned?T('ms_mix'):T('ms_go');
    $('msMsg').textContent=planned?T('ms_done'):'';
    if(planned){ react('ok',false); talk(T('ms_done'),3200); if(TR)TR.event('course.w03.mess'); }
  }
  let rt=null; addEventListener('resize',()=>{ clearTimeout(rt); rt=setTimeout(()=>{ if(!planned){ pos=scatter(D().mess[gi][1].length); layout(false); } },200); });
  return {render};
})());

/* 3. Сдуй канцелярит: [[казённо|просто]] */
TOOLS.push((function(){
  const box=$('du'); let ti=0, ln=null, clean=new Set(), broomed=false;
  const parts=t=>{ const out=[]; let re=/\[\[([^|\]]+)\|([^\]]+)\]\]/g, last=0, m, k=0; while((m=re.exec(t))){ if(m.index>last)out.push([0,t.slice(last,m.index)]); out.push([1,m[1],m[2],k++]); last=re.lastIndex; } if(last<t.length)out.push([0,t.slice(last)]); return out; };
  function render(){
    if(ln!==lang()){ ln=lang(); ti=0; clean=new Set(); }
    const X=D().dust, P=parts(X[ti]), total=P.filter(p=>p[0]).length;
    box.innerHTML=head('03','du_t','du_d')
      +'<div class="dub"><img src="img/brush.webp" alt=""><p class="qn2" id="duLeft" style="margin:0">'+esc(T('du_left',{n:total-clean.size}))+'</p></div>'
      +'<div class="paperbox dut" id="duT">'+P.map(p=>p[0]?'<span class="dz'+(clean.has(p[3])?' clean':'')+'" data-k="'+p[3]+'">'+esc(clean.has(p[3])?p[2]:p[1])+'<img class="cl" src="img/dust-'+(p[3]%3+1)+'.webp" alt=""></span>':esc(p[1])).join('')+'</div>'
      +'<p class="msg ok" id="duMsg">'+(clean.size>=total?esc(T('du_done')):'')+'</p>'+(X.length>1?'<div class="row"><button class="btn ghost" type="button" id="duNext">'+esc(T('du_next'))+'</button></div>':'');
    box.querySelectorAll('.dz').forEach(s=>s.addEventListener('click',()=>blow(s,P,total)));
    if($('duNext'))$('duNext').addEventListener('click',()=>{ ti=(ti+1)%X.length; clean=new Set(); broomed=false; render(); });
  }
  function blow(s,P,total){
    const k=+s.dataset.k; if(clean.has(k))return; clean.add(k);
    const cl=s.querySelector('.cl');
    if(cl&&!RM){ const r=cl.getBoundingClientRect(), p=cl.cloneNode(); p.className='puff'; p.style.left=r.left+'px'; p.style.top=r.top+'px'; p.style.width=r.width+'px'; p.style.setProperty('--dx',(Math.random()*80-40)+'px'); document.body.appendChild(p); setTimeout(()=>p.remove(),850); }
    const it=P.find(p=>p[0]&&p[3]===k); s.classList.add('clean'); s.firstChild.textContent=it[2];
    $('duLeft').textContent=T('du_left',{n:total-clean.size});
    if(!broomed){ broomed=true; if(!playSeq('seq-broom',3)){ botMode='cheer'; modeUntil=botT+1; } }
    if(clean.size>=total){ $('duMsg').textContent=T('du_done'); setTimeout(()=>react('ok',T('du_done')),RM?0:1400); if(TR)TR.event('course.w03.dust'); }
  }
  return {render};
})());

/* 4. Найди дыры: три слабых места в плане */
TOOLS.push((function(){
  const box=$('ho'); let pi=0, ln=null, found=new Set();
  function render(){
    if(ln!==lang()){ ln=lang(); pi=0; found=new Set(); }
    const H=D().holes, h=H[pi]; let k=0;
    const txt=esc(h[0]).replace(/\[\[([^\]]+)\]\]/g,(m,a)=>{ const i=k++; return '<span class="hl'+(found.has(i)?' found':'')+'" data-k="'+i+'">'+a+'</span>'; });
    box.innerHTML=head('03','ho_t','ho_d')+'<p class="qn2" id="hoN">'+esc(T('ho_found',{n:found.size,t:h[1].length}))+'</p><div class="paperbox hot">'+txt+'</div>'
      +'<div class="hq" id="hoQ">'+[...found].sort().map(i=>'<div><b>'+esc(T('ho_q'))+'</b>'+esc(h[1][i])+'</div>').join('')+'</div>'
      +'<p class="msg ok" id="hoMsg">'+(found.size>=h[1].length?esc(T('ho_done')):'')+'</p>'
      +'<div class="row"><button class="btn ghost" type="button" id="hoHint" style="--lc:var(--amber)">'+esc(T('ho_hint'))+'</button>'+(H.length>1?'<button class="btn ghost" type="button" id="hoNext">'+esc(T('ho_next'))+'</button>':'')+'</div>';
    box.querySelectorAll('.hl').forEach(s=>s.addEventListener('click',()=>hit(+s.dataset.k,s)));
    $('hoHint').addEventListener('click',()=>{ const s=[...box.querySelectorAll('.hl:not(.found)')][0]; if(s){ s.classList.remove('hint'); void s.offsetWidth; s.classList.add('hint'); } });
    if($('hoNext'))$('hoNext').addEventListener('click',()=>{ pi=(pi+1)%H.length; found=new Set(); render(); });
  }
  function hit(i,s){
    if(found.has(i))return; found.add(i);
    const h=D().holes[pi]; s.classList.add('found');
    const d=document.createElement('div'); d.innerHTML='<b>'+esc(T('ho_q'))+'</b>'+esc(h[1][i]); $('hoQ').appendChild(d);
    $('hoN').textContent=T('ho_found',{n:found.size,t:h[1].length});
    if(found.size>=h[1].length){ $('hoMsg').textContent=T('ho_done'); react('ok',T('ho_done')); if(TR)TR.event('course.w03.holes'); }
    else { botMode='point'; modeUntil=botT+1.2; bot&&bot.emote('think',1500); talk(h[1][i],3600); }
  }
  return {render};
})());

/* 5. Автомат идей */
TOOLS.push((function(){
  const box=$('gb'); let pi=0, ln=null, n=0, fav=new Set(), balls=null, busy=false, said=false;
  function fill(){ const N=D().ideas[pi][1].length; balls=[]; for(let k=0;k<N;k++){ let x,y; do{ x=Math.random(); y=Math.random(); }while(((x-.5)**2)/.25+((y-.62)**2)/.2>1); balls.push({c:Math.floor(Math.random()*8),x:10.7+x*(89.67-10.7-13),y:21.46+y*(53.23-21.46-7)}); } balls.sort((a,b)=>a.y-b.y); }
  function render(){
    if(ln!==lang()){ ln=lang(); pi=0; n=0; fav=new Set(); balls=null; }
    const I=D().ideas, it=I[pi]; if(!balls)fill();
    box.innerHTML=head('04','gb_t','gb_d')
      +'<div class="chips">'+I.map((x,k)=>'<button type="button" data-k="'+k+'" class="'+(k===pi?'sel':'')+'">'+esc(x[0])+'</button>').join('')+'</div>'
      +'<div class="gbw"><div><div class="gbm" id="gbM"><img class="b" src="img/gb-body.webp" alt="" width="320" height="567">'
      +balls.map((b,k)=>'<img class="bl" data-k="'+k+'" src="img/ball-'+b.c+'.webp" alt="" style="left:'+b.x.toFixed(1)+'%;top:'+b.y.toFixed(1)+'%;'+(k<n?'opacity:0':'')+'">').join('')
      +'<img class="ck" id="gbC" src="img/gb-crank.webp" alt=""><img class="fl" id="gbF" src="img/gb-flap.webp" alt=""><button class="hit" type="button" id="gbHit" aria-label="'+esc(T('gb_turn'))+'"></button></div>'
      +'<div class="row" style="justify-content:center;margin-top:10px"><button class="btn" type="button" id="gbTurn">'+esc(T('gb_turn'))+'</button></div></div>'
      +'<div><p class="lbl2">'+esc(T('gb_got'))+'</p><div class="gbl" id="gbL"></div><p class="note" id="gbFav"></p><p class="msg ok" id="gbMsg"></p></div></div>';
    list();
    box.querySelectorAll('.chips button').forEach(b=>b.addEventListener('click',()=>{ if(busy)return; pi=+b.dataset.k; n=0; fav=new Set(); balls=null; said=false; render(); }));
    $('gbTurn').addEventListener('click',turn); $('gbHit').addEventListener('click',turn);
  }
  function list(){
    const it=D().ideas[pi], L=$('gbL');
    L.innerHTML=it[1].slice(0,n).map((x,k)=>'<div><img src="img/ball-'+balls[balls.length-1-k].c+'.webp" alt=""><span>'+esc(x)+'</span><button type="button" data-k="'+k+'" class="'+(fav.has(k)?'on':'')+'" aria-label="star">'+STAR+'</button></div>').join('');
    L.querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{ const k=+b.dataset.k; if(fav.has(k))fav.delete(k); else { fav.add(k); bot&&bot.emote('happy',900); } b.classList.toggle('on',fav.has(k)); favN(); }));
    favN();
    $('gbTurn').disabled=n>=it[1].length;
    if(n>=it[1].length)$('gbMsg').textContent=T('gb_empty')+' '+T('gb_done');
    else if(n>=5)$('gbMsg').textContent=T('gb_done');
  }
  function favN(){ $('gbFav').textContent=fav.size?T('gb_fav',{n:fav.size}):''; }
  async function turn(){
    const it=D().ideas[pi]; if(busy||n>=it[1].length)return; busy=true;
    const C=$('gbC'), F=$('gbF'), M=$('gbM');
    C.classList.remove('spin'); void C.offsetWidth; C.classList.add('spin');
    const bl=M.querySelectorAll('.bl'), top=bl[bl.length-1-n]; if(top)top.style.opacity=0;
    await wait(450); F.classList.add('open');
    const o=document.createElement('img'); o.className='out'; o.src='img/ball-'+balls[balls.length-1-n].c+'.webp'; M.appendChild(o);
    await wait(500); F.classList.remove('open'); o.remove();
    n++; list(); busy=false;
    if(n===5&&!said){ said=true; react('think',T('gb_done')); if(TR)TR.event('course.w03.ideas'); }
    else if(n===it[1].length)react('blush',false);
  }
  return {render};
})());

/* 6. Пустой лист: черновик, который можно править */
TOOLS.push((function(){
  const box=$('pp'); let ti=0, ln=null, has=false, edited=false, typing=null;
  function render(){
    if(ln!==lang()){ ln=lang(); ti=0; has=false; }
    const S=D().start, s=S[ti];
    box.innerHTML=head('04','pp_t','pp_d')
      +'<div class="ppw"><div class="ppi'+(has?' ok':'')+'" id="ppI"><img class="s" src="img/paper-scared.webp" alt="" width="260" height="294"><img class="h" src="img/paper-happy.webp" alt="" width="260" height="294"></div>'
      +'<div><p class="lbl2">'+esc(T('pp_task'))+'</p><p style="margin-bottom:10px;color:#eefcf5">'+esc(s[0])+'</p>'
      +'<div class="paperbox ped" id="ppE" contenteditable="'+(has?'true':'false')+'" data-ph="..." spellcheck="false">'+(has?esc(s[1]):'')+'</div>'
      +'<p class="note" id="ppN">'+(has?esc(T('pp_edit')):'')+'</p><p class="msg ok" id="ppMsg"></p>'
      +'<div class="row" style="margin-top:8px"><button class="btn" type="button" id="ppGo"'+(has?' style="display:none"':'')+'>'+esc(T('pp_go'))+'</button><button class="btn ghost" type="button" id="ppNext">'+esc(T('pp_next'))+'</button></div></div></div>';
    $('ppGo').addEventListener('click',draft);
    $('ppNext').addEventListener('click',()=>{ clearTimeout(typing); ti=(ti+1)%S.length; has=false; edited=false; render(); });
    $('ppE').addEventListener('input',()=>{ if(has&&!edited){ edited=true; $('ppMsg').textContent=T('pp_edited'); react('ok',T('pp_edited')); if(TR)TR.event('course.w03.start'); } });
  }
  function draft(){
    const s=D().start[ti], E=$('ppE'); has=true;
    $('ppGo').style.display='none'; $('ppI').classList.add('ok');
    let i=0; const step=()=>{ i+=3; E.textContent=s[1].slice(0,i); if(i<s[1].length)typing=setTimeout(step,16); else { E.setAttribute('contenteditable','true'); $('ppN').textContent=T('pp_edit'); } };
    if(RM){ E.textContent=s[1]; E.setAttribute('contenteditable','true'); $('ppN').textContent=T('pp_edit'); } else step();
    react('ok',false); talk(T('pp_edit'),3000);
  }
  return {render};
})());

/* 7. Светофор задач */
TOOLS.push((function(){
  const box=$('tl'), C=['green','yellow','red'], TOP={red:24.42,yellow:46.8,green:69.48}; let order=null, i=0, ln=null, msg=null, lit=null;
  function start(){ order=shuffle([...Array(D().light.length).keys()]); i=0; msg=null; lit=null; ln=lang(); }
  function render(){
    if(!order||ln!==lang())start();
    const L=D().light, fin=i>=order.length;
    box.innerHTML=head('05','tl_t','tl_d')
      +'<div class="tlw"><div class="tli"><img class="b" src="img/tl-off.webp" alt="" width="200" height="550">'+C.map(c=>'<img class="'+(lit===c?'on':'')+'" data-c="'+c+'" src="img/tl-'+c+'.webp" alt="">').join('')
      +(fin?'':C.map(c=>'<button class="hit" type="button" data-c="'+c+'" style="top:'+TOP[c]+'%" aria-label="'+esc(T('tl_'+c))+'"></button>').join(''))+'</div>'
      +'<div>'+(fin?'<div class="qcard">'+esc(T('tl_done'))+'</div><div class="row"><button class="btn ghost" type="button" id="tlAgain">'+esc(T('tl_again'))+'</button></div>'
           :'<p class="qn2">'+esc(T('tl_n',{i:i+1,t:order.length}))+'</p><div class="qcard" id="tlCard">'+esc(L[order[i]][0])+'</div>'
            +'<div class="tlb">'+C.map(c=>'<button type="button" class="'+c+'" data-c="'+c+'"><i></i><span><b>'+esc(T('tl_'+c))+'</b><span>'+esc(T('tl_'+c+'_d'))+'</span></span></button>').join('')+'</div>')
      +'<p class="msg" id="tlMsg"></p></div></div>';
    if(msg){ const m=$('tlMsg'); m.className='msg '+msg[0]; m.textContent=msg[1]; }
    box.querySelectorAll('[data-c]').forEach(b=>{ if(b.tagName==='BUTTON')b.addEventListener('click',()=>put(b.dataset.c,b)); });
    if(fin)$('tlAgain').addEventListener('click',()=>{ start(); render(); });
  }
  function light(c){ lit=c; box.querySelectorAll('.tli img[data-c]').forEach(im=>im.classList.toggle('on',im.dataset.c===c)); }
  function put(c,btn){
    if(i>=order.length)return;
    const it=D().light[order[i]];
    if(it[1]===c){
      light(c); i++; msg=['ok',it[2]];
      setTimeout(()=>{ render(); const k=$('tlCard'); if(k)k.classList.add('in'); if(i>=order.length){ react('ok',T('tl_done')); if(TR)TR.event('course.w03.light'); } },RM?0:350);
      if(c==='red')react('think',false); else if(i%3===0)react('ok',false);
    } else {
      msg=['bad',T('tl_bad')+' '+T('tl_'+it[1])+': '+it[2]];
      const m=$('tlMsg'); m.className='msg bad'; m.textContent=msg[1];
      const k=$('tlCard'); k.classList.remove('bad'); void k.offsetWidth; k.classList.add('bad');
      if(btn.closest('.tlb')){ btn.classList.remove('bad'); void btn.offsetWidth; btn.classList.add('bad'); }
      react('bad',false);
    }
  }
  return {render};
})());

/* 8. Примерь на себя */
TOOLS.push((function(){
  const box=$('me'), IC=['school','work','home','hobby']; let ci=-1; const seen=new Set();
  function render(){
    const M=D().me;
    box.innerHTML=head('06','me_t','me_d')
      +'<div class="ctx">'+M.map((m,k)=>'<button type="button" data-k="'+k+'" class="'+(k===ci?'sel':'')+'"><img src="img/ic-'+IC[k]+'.webp" alt="" width="128" height="128">'+esc(m[0])+'</button>').join('')+'</div>'
      +'<div class="mec" id="meC"></div><p class="note">'+esc(T('me_note'))+'</p>';
    box.querySelectorAll('.ctx button').forEach(b=>b.addEventListener('click',()=>pick(+b.dataset.k)));
    cards(false);
  }
  function cards(anim){
    const el=$('meC'); if(ci<0){ el.innerHTML=''; return; }
    const m=D().me[ci];
    el.innerHTML=MODES.map((md,k)=>'<div style="animation-delay:'+(anim&&!RM?k*.07:0).toFixed(2)+'s"><b><img src="img/ic-'+md+'.webp" alt="">'+esc(T('m_'+md))+'</b>'+esc(m[1][md]||'')+'</div>').join('');
  }
  function pick(k){
    ci=k; seen.add(k);
    box.querySelectorAll('.ctx button').forEach(b=>b.classList.toggle('sel',+b.dataset.k===k));
    cards(true);
    botMode='wave'; modeUntil=botT+1.2; bot&&bot.emote('happy',1200);
    if(seen.size===D().me.length){ react('ok',false); if(TR)TR.event('course.w03.me'); }
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
    if(pass){ award(); botMode='cheer'; modeUntil=botT+2.5; react('ok',T('q_pass')); if(TR)TR.event('course.w03.done'); }
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
  try{ history.pushState({w03Menu:1},''); menuPushed=true; }catch(e){ menuPushed=false; }
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
  $('modes').innerHTML=MODES.map(m=>'<button class="mode" type="button" data-t="'+MODE_TOOL[m]+'"><img src="img/ic-'+m+'.webp" alt="" width="128" height="128"><span><b>'+esc(T('m_'+m))+'</b>'+esc(T('md_'+m))+'</span></button>').join('');
  $('modes').querySelectorAll('.mode').forEach(b=>b.addEventListener('click',()=>$(b.dataset.t).scrollIntoView({behavior:RM?'auto':'smooth',block:'start'})));
  $('footR').textContent=T('title');
  buildMenu(); stickerUI();
}

/* ---------- старт ---------- */
texts(); TOOLS.forEach(t=>t.render());
setBg(0);
if(TR)TR.event('course.w03');
})();
