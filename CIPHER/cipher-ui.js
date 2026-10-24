/* A.C.EON // CIPHER: интерфейс станции.
   Движок: window.ACEON (cipher-engine.js). Шифромашина: window.CipherGL (cipher-gl.js, может отсутствовать).
   Конвейер: палитра операций, готовые рецепты, свои рецепты (Store 'cipher'), перетаскивание шагов за номер.
   Этапы: после шифровки и расшифровки можно посмотреть текст после каждой операции. */
(function(){
'use strict';
const $=id=>document.getElementById(id);
const A=window.ACEON, OPS=A.OPS;
const GL=window.CipherGL&&window.CipherGL.ok?window.CipherGL:null;
const AU=window.CipherAudio&&window.CipherAudio.ok?window.CipherAudio:null;
const TR=window.Trace||null;
const RM=matchMedia('(prefers-reduced-motion: reduce)').matches;
let PORTAL=false; try{ PORTAL=window.self!==window.top; }catch(e){ PORTAL=true; }
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

/* ---------- язык ---------- */
const CL=window.CIPHER_LANG||{ru:{}};
const CODES=['en','ru','de','fr','es','it','pl'];
const NAMES={en:'English',ru:'Русский',de:'Deutsch',fr:'Français',es:'Español',it:'Italiano',pl:'Polski'};
const hasI18n=!!(window.I18n&&window.Store);
function readSite(){ try{ return JSON.parse(localStorage.getItem('aceon:site')||'null')||{}; }catch(e){ return {}; } }
let fbLang=(function(){ const s=readSite().lang; if(CODES.indexOf(s)>=0)return s; for(const c of (navigator.languages||[navigator.language||'en'])){ const k=String(c).slice(0,2).toLowerCase(); if(CODES.indexOf(k)>=0)return k; } return 'en'; })();
const lang=()=>hasI18n?I18n.lang:fbLang;
function T(k,v){
  const d=CL[lang()]||{}; let s=d[k]!==undefined?d[k]:((CL.en||{})[k]!==undefined?CL.en[k]:((CL.ru||{})[k]!==undefined?CL.ru[k]:k));
  if(v)s=String(s).replace(/\{(\w+)\}/g,(m,n)=>v[n]!==undefined?v[n]:m); return s;
}
const GRP={'Кодировки':'enc','Визуальное':'vis','Перестановки':'perm','Классика':'cls','Защита':'sec'};
const opName=id=>{ const k='o.'+id, s=T(k); return s!==k?s:OPS[id].name; };
const opDesc=id=>{ const k='d.'+id, s=T(k); return s!==k?s:(OPS[id].desc||''); };
const grpName=id=>T('g.'+(GRP[OPS[id].grp]||'cls'));
const plabel=id=>{ const k='pl.'+id, s=T(k); return s!==k?s:(OPS[id].param==='num'?T('pNum'):T('pKey')); };
const secret=id=>!!(OPS[id]&&OPS[id].secret);

/* ---------- память ---------- */
let mem={recipes:[],last:null,stE:false,stD:false};
const hasStore=!!window.Store;
if(hasStore){ try{ Store.define('cipher',{version:1,defaults:{recipes:[],last:null,stE:false,stD:false,real:false,realOk:false,mis:{}}}); mem=Store.get('cipher'); }catch(e){} }
function save(){ if(hasStore)try{ Store.save('cipher'); }catch(e){} }

/* ---------- конвейер ---------- */
const clone=st=>st.p===undefined?{id:st.id}:{id:st.id,p:st.p};
/* в память пароли не пишем */
const keep=st=>secret(st.id)?{id:st.id}:clone(st);
function createPipeline(cfg){
  const steps=[];
  let hot=-1;
  function buildPalette(){
    const grps={};
    for(const id in OPS){ if(cfg.exclude&&cfg.exclude.indexOf(id)>=0)continue; if(secret(id)&&!A.hasCrypto)continue; const g=GRP[OPS[id].grp]||'cls'; (grps[g]=grps[g]||[]).push(id); }
    const el=$(cfg.paletteId); el.innerHTML='';
    for(const g in grps){
      const lab=document.createElement('div'); lab.className='grp-label'; lab.textContent=T('g.'+g); el.appendChild(lab);
      const row=document.createElement('div'); row.className='palette';
      grps[g].forEach(id=>{
        const b=document.createElement('button'); b.type='button'; b.className='op'; b.textContent=opName(id);
        b.addEventListener('click',()=>{ addStep(id); showDesc(id); });
        b.addEventListener('mouseenter',()=>showDesc(id)); b.addEventListener('focus',()=>showDesc(id));
        row.appendChild(b);
      });
      el.appendChild(row);
    }
    showDesc(null);
  }
  function showDesc(id){
    const d=$(cfg.descId); if(!d)return;
    if(!id){ d.innerHTML='<span class="muted">'+esc(T('descHint'))+'</span>'; return; }
    d.innerHTML='<b>'+esc(opName(id))+'</b> · '+esc(opDesc(id));
  }
  function addStep(id){ const op=OPS[id]; const st={id}; if(op.param)st.p=op.pdefault; steps.push(st); render(); changed(true); }
  function setSteps(arr){ steps.length=0; arr.forEach(s=>{ if(OPS[s.id])steps.push(clone(s)); }); render(); changed(); }
  function move(i,d){ const j=i+d; if(j<0||j>=steps.length)return; [steps[i],steps[j]]=[steps[j],steps[i]]; render(); changed(); }
  function remove(i){ steps.splice(i,1); render(); changed(); }
  function setParam(i,val){ const op=OPS[steps[i].id]; steps[i].p=op.param==='num'?(parseInt(val,10)||0):val; changed(); }
  function changed(added){ if(cfg.onChange)cfg.onChange(added); }
  function render(){
    const pipe=$(cfg.pipeId); pipe.innerHTML='';
    if(!steps.length){ pipe.innerHTML='<div class="pipe-empty">'+esc(T(cfg.emptyKey))+'</div>'; return; }
    steps.forEach((st,i)=>{
      const op=OPS[st.id];
      const row=document.createElement('div'); row.className='step'; row.dataset.i=i;
      let ph='';
      if(op.param)ph='<input class="param" value="'+esc(st.p===undefined?'':st.p)+'" placeholder="'+esc(plabel(st.id))+'" title="'+esc(plabel(st.id))+'"'+(op.param==='num'?' inputmode="numeric"':'')+(op.param==='pass'?' type="password" autocomplete="new-password"':'')+'>';
      row.innerHTML='<div class="idx" title="'+esc(T('drag'))+'">'+String(i+1).padStart(2,'0')+'</div>'
        +'<div class="nm">'+esc(opName(st.id))+'<small>'+esc(grpName(st.id))+'</small></div>'+ph
        +'<div class="ctrl"><button class="up" type="button" title="'+esc(T('up'))+'">&#8593;</button><button class="dn" type="button" title="'+esc(T('down'))+'">&#8595;</button><button class="x" type="button" title="'+esc(T('remove'))+'">&#10005;</button></div>';
      row.querySelector('.up').onclick=()=>move(i,-1);
      row.querySelector('.dn').onclick=()=>move(i,1);
      row.querySelector('.x').onclick=()=>remove(i);
      const inp=row.querySelector('input.param'); if(inp)inp.addEventListener('input',e=>setParam(i,e.target.value));
      row.addEventListener('mouseenter',()=>{ if(GL&&cfg.isShown())GL.hover(i); });
      row.addEventListener('mouseleave',()=>{ if(GL&&cfg.isShown())GL.hover(-1); });
      dragify(row,i);
      pipe.appendChild(row);
      if(i<steps.length-1){ const f=document.createElement('div'); f.className='flow'; f.textContent='↓'; pipe.appendChild(f); }
    });
    highlight(hot);
  }
  function highlight(i){ hot=i; const rows=$(cfg.pipeId).querySelectorAll('.step'); rows.forEach((r,k)=>r.classList.toggle('hl',k===i)); }
  /* перетаскивание за номер шага (мышь и палец) */
  function dragify(row,i){
    const h=row.querySelector('.idx');
    h.addEventListener('pointerdown',e=>{
      if(steps.length<2||e.button>0)return;
      e.preventDefault(); h.setPointerCapture(e.pointerId);
      const rows=[...$(cfg.pipeId).querySelectorAll('.step')];
      const pitch=rows.length>1?rows[1].offsetTop-rows[0].offsetTop:row.offsetHeight;
      const y0=e.clientY; let to=i;
      row.classList.add('drag'); rows.forEach(r=>{ if(r!==row)r.classList.add('shift'); });
      const mv=ev=>{
        const dy=ev.clientY-y0; row.style.transform='translateY('+dy+'px)';
        to=Math.max(0,Math.min(steps.length-1,i+Math.round(dy/pitch)));
        rows.forEach((r,k)=>{ if(r===row)return; let s=0; if(i<to&&k>i&&k<=to)s=-pitch; if(i>to&&k<i&&k>=to)s=pitch; r.style.transform=s?'translateY('+s+'px)':''; });
      };
      const up=()=>{
        h.removeEventListener('pointermove',mv); h.removeEventListener('pointerup',up); h.removeEventListener('pointercancel',up);
        if(to!==i){ const [st]=steps.splice(i,1); steps.splice(to,0,st); render(); changed(); }
        else { row.classList.remove('drag'); row.style.transform=''; rows.forEach(r=>{ r.classList.remove('shift'); r.style.transform=''; }); }
      };
      h.addEventListener('pointermove',mv); h.addEventListener('pointerup',up); h.addEventListener('pointercancel',up);
    });
  }
  return {steps,buildPalette,addStep,setSteps,render,highlight,showDesc};
}

/* ---------- режимы и шифромашина ---------- */
let mode='enc', decMode='auto', lastRecipe=[], REAL=false;
const REAL_STEPS=[{id:'aes'}];
function machineSteps(){ if(REAL)return REAL_STEPS; if(mode==='int')return curM>=0?intPipe.steps:[]; return mode==='enc'?encPipe.steps:(decMode==='man'?decPipe.steps:lastRecipe); }
function syncMachine(added){
  $('machine').classList.toggle('dec',mode!=='enc');
  $('mMode').textContent=(REAL?T('modeR')+' · ':'')+(mode==='enc'?T('tabEnc'):T('tabDec'));
  const st=machineSteps();
  $('rempty').textContent=st.length?'':T('noRotors');
  if(GL)GL.setRotors(st,mode==='enc'?'enc':'dec',id=>opName(id),added);
}
const encPipe=createPipeline({paletteId:'palette',pipeId:'pipe',descId:'opdesc',exclude:['aes'],emptyKey:'empty',isShown:()=>!REAL&&mode==='enc',
  onChange:added=>{ mem.last=encPipe.steps.map(keep); save(); if(mode==='enc'&&!REAL)syncMachine(added); }});
const decPipe=createPipeline({paletteId:'paletteMan',pipeId:'pipeMan',descId:'opdescMan',exclude:['vernam','aes'],emptyKey:'emptyMan',isShown:()=>!REAL&&mode==='dec'&&decMode==='man',
  onChange:added=>{ if(mode==='dec'&&decMode==='man'&&!REAL)syncMachine(added); }});
if(GL)GL.onHover(i=>{ if(REAL)return; const p=mode==='enc'?encPipe:(decMode==='man'?decPipe:null); if(p)p.highlight(i); });

/* ---------- готовые рецепты ---------- */
const KEYS=['eon','kai','anton','nebula','signal','ash','ghost','raven','orbit','echo'];
const PRESETS={
  pCourier:[{id:'b64'},{id:'caesar',p:3}],
  pDouble:[{id:'vigenere',p:'nebula'},{id:'revword'},{id:'rail',p:3},{id:'base32'}],
  pPara:[{id:'xor',p:'raven'},{id:'hill',p:'orbit'},{id:'rail',p:5},{id:'base85'},{id:'braille'}],
  pTele:[{id:'caesar',p:5},{id:'swapfl'},{id:'morse'}]
};
function randomRecipe(){
  const ids=Object.keys(OPS), n=3+(Math.random()*3|0), out=[];
  for(let i=0;i<n;i++){
    let id; do{ id=ids[Math.random()*ids.length|0]; }while(secret(id)||(out.length&&out[out.length-1].id===id));
    const op=OPS[id], st={id};
    if(op.param==='num')st.p=id==='rail'?2+(Math.random()*5|0):1+(Math.random()*25|0);
    else if(op.param==='key')st.p=KEYS[Math.random()*KEYS.length|0];
    out.push(st);
  }
  return out;
}
function buildPresets(){
  const box=$('presets'); box.innerHTML='';
  Object.keys(PRESETS).forEach(k=>{ const b=document.createElement('button'); b.type='button'; b.className='preset'; b.textContent=T(k);
    b.title=PRESETS[k].map(s=>opName(s.id)).join(' > ');
    b.onclick=()=>{ encPipe.setSteps(PRESETS[k]); if(TR)TR.event('cipher.preset'); }; box.appendChild(b); });
  const r=document.createElement('button'); r.type='button'; r.className='preset'; r.textContent=T('pRandom'); r.onclick=()=>{ encPipe.setSteps(randomRecipe()); }; box.appendChild(r);
  const c=document.createElement('button'); c.type='button'; c.className='preset ghost'; c.textContent=T('clear'); c.onclick=()=>encPipe.setSteps([]); box.appendChild(c);
}
function buildMine(){
  const box=$('mine'); box.innerHTML='';
  if(!mem.recipes.length){ box.innerHTML='<span class="muted">'+esc(T('noMine'))+'</span>'; return; }
  mem.recipes.forEach((r,i)=>{
    const w=document.createElement('span'); w.className='mine';
    w.innerHTML='<button type="button" class="ld"></button><button type="button" class="x">&#10005;</button>';
    w.querySelector('.ld').textContent=r.name; w.querySelector('.ld').title=r.steps.map(s=>opName(s.id)).join(' > ');
    w.querySelector('.x').title=T('del');
    w.querySelector('.ld').onclick=()=>encPipe.setSteps(r.steps);
    w.querySelector('.x').onclick=()=>{ mem.recipes.splice(i,1); save(); buildMine(); };
    box.appendChild(w);
  });
}
$('rsave').addEventListener('click',()=>{
  if(!encPipe.steps.length){ flashBtn($('rsave'),T('eEmpty').split(',')[0]); return; }
  const name=($('rname').value.trim()||('#'+(mem.recipes.length+1))).slice(0,32);
  const i=mem.recipes.findIndex(r=>r.name===name);
  const rec={name,steps:encPipe.steps.map(keep)};
  if(i>=0)mem.recipes[i]=rec; else { mem.recipes.push(rec); if(mem.recipes.length>12)mem.recipes.shift(); }
  save(); $('rname').value=''; buildMine(); flashBtn($('rsave'),T('saved'));
});
$('rname').addEventListener('keydown',e=>{ if(e.key==='Enter')$('rsave').click(); });
function flashBtn(b,txt){ const o=b.textContent; b.textContent=txt; b.disabled=true; setTimeout(()=>{ b.textContent=o; b.disabled=false; },1300); }

/* ---------- анимация оседания из шума в текст ---------- */
const GLYPHS='0123456789ABCDEF#%&$/\\<>*+=?~абвгдежзиклмнптфцшАБВГДЕЖЗ⟨⟩▓▒░⠿⠾⠷';
let animRAF=null;
const rndGlyph=()=>GLYPHS[(Math.random()*GLYPHS.length)|0];
const easeInOut=x=>x<.5?4*x*x*x:1-Math.pow(-2*x+2,3)/2;
const ZONE=44;
function clearActive(){ document.querySelectorAll('.step.active').forEach(s=>s.classList.remove('active')); }
function playScramble(target,cfg){
  const out=cfg.out,con=cfg.con,btn=cfg.btn,steps=cfg.steps;
  const chars=Array.from(target),N=chars.length;
  /* очень длинный текст: анимируем первые 1500 знаков, остальное дописываем в конце */
  const VIS=Math.min(N,1500), noise=Array.from({length:VIS},rndGlyph);
  out.className='transmission '+cfg.outClass; out.textContent='';
  con.className='console on'+(cfg.conClass?' '+cfg.conClass:''); con.innerHTML='';
  btn.disabled=true; btn.dataset.lbl=btn.textContent; btn.textContent=cfg.busy+'...';
  let fired=0; const t0=performance.now();
  if(GL)GL.anim(cfg.dir,cfg.dur);
  if(AU)AU.staticOn();
  let lastHead=0;
  function frame(now){
    const p=Math.min(1,(now-t0)/cfg.dur), head=Math.floor(easeInOut(p)*VIS);
    while(fired<cfg.events.length&&(now-t0)>=cfg.events[fired].t){
      const ev=cfg.events[fired++];
      const d=document.createElement('div'); d.textContent='> '+ev.line; con.appendChild(d);
      con.querySelectorAll('div').forEach(x=>x.classList.remove('hot')); d.classList.add('hot');
      if(steps){ clearActive(); if(ev.step>=0&&steps[ev.step])steps[ev.step].classList.add('active'); }
      if(GL&&ev.rotor>=0)GL.spin(ev.rotor,cfg.dir==='enc'?1:-1);
      if(AU&&ev.rotor>=0)AU.tick();
    }
    if(AU&&head>lastHead){ AU.type(); lastHead=head; }
    let buf=''; for(let i=0;i<VIS;i++)buf+=i<head?chars[i]:i<head+ZONE?rndGlyph():noise[i];
    out.textContent=buf;
    if(p<1)animRAF=requestAnimationFrame(frame);
    else { animRAF=null; if(steps)clearActive(); con.querySelectorAll('div').forEach(x=>x.classList.remove('hot')); btn.disabled=false; btn.textContent=btn.dataset.lbl; if(GL)GL.animEnd(); if(AU){ AU.staticOff(); AU.seal(cfg.dir!=='enc'); } cfg.onDone(); }
  }
  animRAF=requestAnimationFrame(frame);
}

/* ---------- этапы ---------- */
function renderStages(box,list,dir,input){
  const cut=s=>{ const a=Array.from(s); return a.length>600?a.slice(0,600).join('')+' ...':s; };
  let h='<div class="stage"><span class="k">00</span><span class="lbl">'+esc(T('stIn'))+'<span class="len">'+Array.from(input).length+'</span></span><div class="val">'+esc(cut(input))+'</div></div>';
  list.forEach((st,k)=>{
    const n=dir==='enc'?k+1:st.i+1;
    h+='<div class="stage"><span class="k">'+String(n).padStart(2,'0')+'</span><span class="lbl">'+esc(opName(st.id))+(st.p!==undefined&&OPS[st.id].param&&!secret(st.id)?' ['+esc(st.p)+']':'')
      +'<span class="len">'+Array.from(st.out).length+'</span></span><div class="val">'+esc(cut(st.out))+'</div></div>';
  });
  box.innerHTML=h;
  box.querySelectorAll('.val').forEach(v=>v.addEventListener('click',()=>v.classList.toggle('open')));
}

/* ---------- шифрование ---------- */
let encLast=null, busy=false;
async function doEncode(){
  if(animRAF||busy)return;
  if(REAL)return doEncodeReal();
  const text=$('plain').value, out=$('transOut'), con=$('encConsole');
  $('encOutWrap').hidden=false; clearActive(); $('encStages').classList.remove('on'); linkRow(false);
  if(!encPipe.steps.length){ con.className='console'; con.innerHTML=''; out.className='transmission err'; out.textContent=T('eEmpty'); return; }
  encPipe.steps.forEach(st=>{ if(OPS[st.id].gen)st.p=undefined; });
  const coll=[]; let transmission;
  busy=true; $('encBtn').disabled=true;
  try{ transmission=await A.encodeA(text,encPipe.steps,coll); }
  catch(e){ con.className='console'; con.innerHTML=''; out.className='transmission err'; out.textContent='\u2715 '+(e.code==='needpass'?T('ePassEmpty'):e.code==='nocrypto'?T('noCrypto'):T('eMan')); return; }
  finally{ busy=false; $('encBtn').disabled=false; }
  encLast={text,stages:coll,tr:transmission};
  if(TR)TR.event('cipher.encode');
  if(RM){ con.className='console'; con.innerHTML=''; finishEncode(transmission); return; }
  const n=encPipe.steps.length, DUR=Math.max(3000,Math.min(5000,2400+n*300)), win=DUR*.6;
  const events=[{t:0,line:T('lKey'),step:-1,rotor:-1}];
  encPipe.steps.forEach((st,i)=>events.push({t:160+win*((i+1)/(n+1)),line:T('lStep',{n:String(i+1).padStart(2,'0'),op:opName(st.id).toUpperCase()}),step:i,rotor:i}));
  events.push({t:DUR*.82,line:T('lMark'),step:-1,rotor:-1});
  events.push({t:DUR*.97,line:T('lSeal'),step:-1,rotor:-1});
  playScramble(transmission,{out,con,btn:$('encBtn'),steps:document.querySelectorAll('#pipe .step'),dir:'enc',
    dur:DUR,busy:T('busyEnc'),outClass:'live',conClass:'',events,onDone:()=>finishEncode(transmission)});
}
/* ---------- реальный канал ---------- */
function strength(pw){
  if(!pw)return 0;
  if(/^[a-hj-np-z2-9]{5}(-[a-hj-np-z2-9]{5}){3}$/.test(pw))return 99;
  if(/^(.)\1*$/.test(pw)||/^(?:123456|12345678|password|qwerty|пароль|йцукен|111111|000000)/i.test(pw))return 8;
  let pool=0; if(/[a-z]/.test(pw))pool+=26; if(/[A-Z]/.test(pw))pool+=26; if(/[0-9]/.test(pw))pool+=10; if(/[^a-zA-Z0-9\u0400-\u04FF]/.test(pw))pool+=33; if(/[\u0400-\u04FF]/.test(pw))pool+=66;
  const uniq=new Set(Array.from(pw)).size, len=Array.from(pw).length;
  return Math.round(Math.min(len,uniq*1.5)*Math.log2(Math.max(pool,2)));
}
function meter(){
  const b=strength($('rPass').value), bar=$('rBar'), m=$('rMeter');
  const lv=b<40?['sWeak','#c8433a']:b<64?['sFair','#e8b04b']:b<90?['sGood','#8fc46b']:['sStrong','#5aa17f'];
  bar.style.width=Math.min(100,b/1.2)+'%'; bar.style.background=lv[1];
  m.textContent=$('rPass').value?T(lv[0])+' · '+T('sBits',{n:b}):''; m.style.color=lv[1];
}
function genPass(){
  const al='abcdefghjkmnpqrstuvwxyz23456789', b=new Uint8Array(20); crypto.getRandomValues(b);
  let s=''; for(let i=0;i<20;i++){ s+=al[b[i]%al.length]; if(i%5===4&&i<19)s+='-'; }
  $('rPass').value=s; $('rPass2').value=s; showPass(true); meter();
}
function showPass(on){ ['rPass','rPass2'].forEach(id=>$(id).type=on?'text':'password'); $('rEye').textContent=on?T('rHide'):T('rShow'); $('rEye').dataset.on=on?'1':''; }
async function doEncodeReal(){
  const text=$('plain').value, out=$('transOut'), con=$('encConsole'), pw=$('rPass').value;
  $('encOutWrap').hidden=false; linkRow(false); $('encStages').classList.remove('on');
  const fail=msg=>{ con.className='console'; con.innerHTML=''; out.className='transmission err'; out.textContent='\u2715 '+msg; };
  if(!A.hasCrypto)return fail(T('noCrypto'));
  if(Array.from(pw).length<8)return fail(T('eShort'));
  if(pw!==$('rPass2').value)return fail(T('eMismatch'));
  let tr; busy=true; $('encBtn').disabled=true;
  try{ tr=await A.realEnc(text,pw); }catch(e){ return fail(e.code==='nocrypto'?T('noCrypto'):T('eMan')); }
  finally{ busy=false; $('encBtn').disabled=false; }
  encLast={text,stages:null,tr};
  if(TR)TR.event('cipher.real.encode');
  if(RM){ con.className='console'; con.innerHTML=''; finishEncode(tr); return; }
  const DUR=3400, events=[{t:0,line:T('rL1'),step:-1,rotor:-1},{t:900,line:T('rL2',{n:String(A.R_ITER).replace(/\B(?=(\d{3})+(?!\d))/g,' ')}),step:-1,rotor:0},{t:1900,line:T('rL3'),step:-1,rotor:0},{t:DUR*.82,line:T('rL4'),step:-1,rotor:-1},{t:DUR*.97,line:T('lSeal'),step:-1,rotor:-1}];
  playScramble(tr,{out,con,btn:$('encBtn'),steps:null,dir:'enc',dur:DUR,busy:T('busyEnc'),outClass:'live',conClass:'',events,onDone:()=>finishEncode(tr)});
}
async function doDecodeReal(t){
  lastRecipe=REAL_STEPS; syncMachine();
  const pw=$('passIn').value;
  if(!pw){ askPass(false); return; }
  let plain; busy=true; $('decBtn').disabled=true;
  try{ plain=await A.realDec(t,pw); }
  catch(e){ if(e.code==='pass'||e.code==='needpass'){ askPass(e.code==='pass'); return; } decError(e.code==='version'?T('eVersion'):e.code==='nocrypto'?T('noCrypto'):T('eBroken')); return; }
  finally{ busy=false; $('decBtn').disabled=false; }
  $('decOutWrap').hidden=false; $('passMsg').textContent=T('needPass'); $('passMsg').classList.remove('bad');
  if(TR)TR.event('cipher.real.decode');
  const out=$('plainOut'), con=$('decConsole');
  $('decWarn').classList.remove('on');
  const done=()=>finishDecode({plain,ok:true,sum:true},'',null);
  if(RM){ con.className='console'; con.innerHTML=''; done(); return; }
  const DUR=3400, events=[{t:0,line:T('lIn'),step:-1,rotor:-1},{t:900,line:T('rL2',{n:String(A.R_ITER).replace(/\B(?=(\d{3})+(?!\d))/g,' ')}),step:-1,rotor:0},{t:1900,line:T('rL5'),step:-1,rotor:0},{t:DUR*.97,line:T('lDone'),step:-1,rotor:-1}];
  playScramble(plain!==''?plain:T('emptyMsg'),{out,con,btn:$('decBtn'),steps:null,dir:'dec',dur:DUR,busy:T('busyDec'),outClass:'plain live-dec',conClass:'dec',events,onDone:done});
}
['rPass','rPass2'].forEach(id=>$(id).addEventListener('input',meter));
$('rEye').addEventListener('click',()=>showPass(!$('rEye').dataset.on));
$('rGen').addEventListener('click',genPass);

/* переключение учебный / реальный */
let warnNext=null;
function setReal(on,then){
  if(on&&!mem.realOk){ warnNext=then||null; $('rwOk').checked=false; $('rwYes').disabled=true; $('rwarn').hidden=false; return; }
  REAL=!!on; mem.real=REAL; save();
  document.body.classList.toggle('real',REAL);
  $('modeT').classList.toggle('on',!REAL); $('modeR').classList.toggle('on',REAL);
  if(GL&&GL.setReal)GL.setReal(REAL);
  if(REAL&&mode==='dec')setDecMode('auto');
  if(REAL&&mode==='int')setMode('enc');
  $('passBox').hidden=REAL?mode!=='dec':true;
  if(REAL){ $('passMsg').textContent=T('needPass'); $('passMsg').classList.remove('bad'); }
  $('encOutWrap').hidden=true; $('decOutWrap').hidden=true;
  texts();
  if(then)then();
}
$('modeT').addEventListener('click',()=>{ if(REAL)setReal(false); });
$('modeR').addEventListener('click',()=>{ if(!REAL)setReal(true); });
$('rwOk').addEventListener('change',e=>{ $('rwYes').disabled=!e.target.checked; });
$('rwYes').addEventListener('click',()=>{ mem.realOk=true; save(); $('rwarn').hidden=true; const n=warnNext; warnNext=null; setReal(true,n); if(TR)TR.event('cipher.real.ok'); });
$('rwNo').addEventListener('click',()=>{ $('rwarn').hidden=true; warnNext=null; });
addEventListener('keydown',e=>{ if(e.key==='Escape'&&!$('rwarn').hidden)$('rwNo').click(); });

/* ---------- эфир: морзе и номерная станция ---------- */
function bodyOf(tr){ const i=tr.indexOf('\u27e9'); return i>=0?tr.slice(i+1):tr; }
function morseText(tr){ const b=bodyOf(tr).toUpperCase().replace(/[^A-Z0-9]/g,''); return 'VVV DE ACEON '+b.slice(0,36).replace(/(.{6})/g,'$1 ')+' AR'; }
function numberGroups(tr){
  let h=2166136261>>>0; const out=[]; const s=bodyOf(tr);
  for(let g=0;g<5;g++){ let grp=[]; for(let k=0;k<5;k++){ for(let i=(g*5+k)%Math.max(1,s.length);i<s.length;i+=7){ h^=s.charCodeAt(i); h=Math.imul(h,16777619)>>>0; } grp.push(h%10); } out.push(grp.join(', ')); }
  return out;
}
let airBtn=null;
function airStop(){ if(AU){ AU.stopMorse(); AU.stopVoice(); } }
function airReset(){ if(airBtn){ airBtn.textContent=airBtn.dataset.lbl; airBtn.classList.remove('live'); airBtn=null; } }
function air(btn,kind){
  if(!AU||!encLast)return;
  if(airBtn===btn){ airStop(); airReset(); return; }
  airStop(); airReset();
  if(!AU.on()){ AU.set(true); sndLabel(); }
  airBtn=btn; btn.dataset.lbl=btn.textContent; btn.textContent=T('stop'); btn.classList.add('live');
  if(kind==='morse')AU.morse(morseText(encLast.tr),airReset);
  else AU.voice([T('vIntro')].concat(numberGroups(encLast.tr)).concat([T('vEnd')]),lang(),airReset);
  if(TR)TR.event('cipher.air.'+kind);
}
$('encMorse').addEventListener('click',e=>air(e.currentTarget,'morse'));
$('encVoice').addEventListener('click',e=>air(e.currentTarget,'voice'));
function sndLabel(){ const b=$('sndBtn'); if(!AU){ b.hidden=true; return; } b.textContent=(AU.on()?'\u266A ':'\u2715 ')+T('snd'); b.classList.toggle('off',!AU.on()); }
$('sndBtn').addEventListener('click',()=>{ if(!AU)return; AU.set(!AU.on()); sndLabel(); if(!AU.on())airReset(); });

function finishEncode(tr){
  const out=$('transOut'), end=tr.indexOf(A.SEP);
  out.className='transmission'; out.dataset.full=tr;
  out.innerHTML='<span class="marker">'+esc(tr.slice(0,end+1))+'</span>'+esc(tr.slice(end+1));
  if(encLast&&encLast.stages){ renderStages($('encStages'),encLast.stages,'enc',encLast.text); $('encStages').classList.toggle('on',$('encSt').checked); }
  linkRow(true);
}

/* ---------- ссылка-передача: передача после # в адресе (на сервер не уходит) ---------- */
function b64url(str){ const b=new TextEncoder().encode(str); let s=''; b.forEach(x=>s+=String.fromCharCode(x)); return btoa(s).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,''); }
function unb64url(s){ s=s.replace(/-/g,'+').replace(/_/g,'/'); while(s.length%4)s+='='; const bin=atob(s); return new TextDecoder().decode(Uint8Array.from(bin,c=>c.charCodeAt(0))); }
function linkFor(tr){ return location.origin+location.pathname+'#t='+b64url(tr); }
function fromLink(t){ const m=String(t).match(/#t=([A-Za-z0-9_-]+)/); if(!m)return t; try{ return unb64url(m[1]); }catch(e){ return t; } }
function linkRow(on){ $('encLink').hidden=!on; $('encShare').hidden=!on||!navigator.share; $('encMorse').hidden=!on||!AU; $('encVoice').hidden=!on||!AU||!AU.hasVoice; if(!on){ airStop(); airReset(); } }
$('encLink').addEventListener('click',e=>{ if(!encLast)return; copyText(linkFor(encLast.tr),e.currentTarget,T('linkCopied')); if(TR)TR.event('cipher.link'); });
$('encShare').addEventListener('click',()=>{ if(!encLast||!navigator.share)return; navigator.share({title:'A.C.EON // CIPHER',text:T('shareText'),url:linkFor(encLast.tr)}).catch(()=>{}); if(TR)TR.event('cipher.share'); });

/* ---------- расшифровка ---------- */
function decodeAnimate(res,recipe,btnId,input,coll){
  const out=$('plainOut'), con=$('decConsole');
  $('decWarn').classList.remove('on'); $('decStages').classList.remove('on');
  const done=()=>finishDecode(res,input,coll);
  if(RM){ con.className='console'; con.innerHTML=''; done(); return; }
  const target=res.plain!==''?res.plain:T('emptyMsg');
  const n=recipe.length, DUR=Math.max(3000,Math.min(5000,2400+n*300)), win=DUR*.6;
  const events=[{t:0,line:T('lIn'),step:-1,rotor:-1}];
  for(let k=0;k<n;k++){ const i=n-1-k; events.push({t:160+win*((k+1)/(n+1)),line:T('lLayer',{n:String(i+1).padStart(2,'0'),op:opName(recipe[i].id).toUpperCase()}),step:decMode==='man'?i:-1,rotor:i}); }
  events.push({t:DUR*.82,line:T('lKey2'),step:-1,rotor:-1});
  events.push({t:DUR*.97,line:T('lDone'),step:-1,rotor:-1});
  playScramble(target,{out,con,btn:$(btnId),steps:decMode==='man'?document.querySelectorAll('#pipeMan .step'):null,dir:'dec',
    dur:DUR,busy:T('busyDec'),outClass:'plain live-dec',conClass:'dec',events,onDone:done});
}
function finishDecode(res,input,coll){
  const out=$('plainOut');
  out.className='transmission plain'; out.textContent=res.plain!==''?res.plain:T('emptyMsg'); out.dataset.full=res.plain;
  const w=$('decWarn');
  if(!res.ok){ w.textContent=res.sum?T('wTamper'):T('wGarbage'); w.classList.add('on'); }
  if(coll){ renderStages($('decStages'),coll,'dec',input); $('decStages').classList.toggle('on',$('decSt').checked); }
}
function decError(msg){
  const con=$('decConsole'); con.className='console'; con.innerHTML='';
  const out=$('plainOut'); out.className='transmission err'; out.textContent='\u2715 '+msg; out.dataset.full='';
  $('decWarn').classList.remove('on'); $('decStages').classList.remove('on');
  $('decOutWrap').hidden=false;
}
function errText(e,recipe){
  const c=e&&e.code;
  if(c==='nomark')return T('eNomark'); if(c==='broken')return T('eBroken'); if(c==='recipe')return T('eRecipe'); if(c==='unknown')return T('eUnknown');
  if(c==='nocrypto')return T('noCrypto'); if(c==='pass')return T('ePass'); if(c==='needpass')return T('ePassEmpty');
  if(c==='fail'){ const r=recipe||e.recipe, i=e.layer|0; return T('eFail',{n:String(i+1).padStart(2,'0'),op:r&&r[i]?opName(r[i].id):'?'}); }
  return T('eRecipe');
}
/* пароль для слоя AES при расшифровке по маркеру */
function askPass(wrong){
  $('passBox').hidden=false; $('decOutWrap').hidden=true;
  $('passMsg').textContent=wrong?(REAL?T('ePassR'):T('ePass')):T('needPass'); $('passMsg').classList.toggle('bad',!!wrong);
  if(wrong)$('passIn').select(); try{ $('passIn').focus({preventScroll:false}); }catch(e){}
}
function hidePass(){ if(REAL&&mode==='dec'){ $('passMsg').textContent=T('needPass'); $('passMsg').classList.remove('bad'); return; } $('passBox').hidden=true; }
async function doDecode(){
  if(animRAF||busy)return;
  const t=fromLink($('cipher').value);
  if(A.isReal(t)){ if(!REAL){ setReal(true,()=>doDecode()); return; } return doDecodeReal(t); }
  let pre; try{ pre=A.readMark(t); }catch(e){ hidePass(); decError(errText(e)); lastRecipe=[]; syncMachine(); return; }
  lastRecipe=pre.recipe.map(clone); syncMachine(true);
  const coll=[]; let res;
  busy=true; $('decBtn').disabled=true;
  try{ res=await A.decodePartsA(t,$('passIn').value,coll); }
  catch(e){ if(e.code==='needpass'||e.code==='pass'){ askPass(e.code==='pass'); return; } hidePass(); decError(errText(e,pre.recipe)); return; }
  finally{ busy=false; $('decBtn').disabled=false; }
  hidePass(); $('decOutWrap').hidden=false;
  if(TR)TR.event('cipher.decode');
  decodeAnimate(res,res.recipe,'decBtn',res.body,coll);
}
async function doDecodeManual(){
  if(animRAF||busy)return;
  let c=$('cipherMan').value;
  const s0=fromLink(c).replace(/^\s+/,''); if(s0.startsWith(A.PREFIX)){ const e=s0.indexOf(A.SEP); if(e>=0)c=s0.slice(e+1); }
  const recipe=decPipe.steps.map(clone);
  if(!recipe.length){ decError(T('eManAdd')); return; }
  const tries=[c,c.replace(/\s+$/,'')].filter((x,i,a)=>a.indexOf(x)===i);
  let res=null, lastE=null;
  busy=true; $('decBtnMan').disabled=true;
  try{
    for(const x of tries){ const coll=[]; try{ const plain=await A.unwrapA(x,recipe,'',coll); if(!res||!A.looksBroken(plain))res={plain,coll,x}; if(!A.looksBroken(plain))break; }catch(e){ lastE=e; } }
  } finally{ busy=false; $('decBtnMan').disabled=false; }
  if(!res){ decError(lastE&&(lastE.code==='pass'||lastE.code==='needpass'||lastE.code==='nocrypto')?errText(lastE):T('eMan')); return; }
  $('decOutWrap').hidden=false;
  if(TR)TR.event('cipher.manual');
  decodeAnimate({plain:res.plain,ok:!A.looksBroken(res.plain),sum:false},recipe,'decBtnMan',res.x,res.coll);
}
$('passGo').addEventListener('click',doDecode);
$('passIn').addEventListener('keydown',e=>{ if(e.key==='Enter')doDecode(); });
$('cipher').addEventListener('input',()=>{ hidePass(); $('passIn').value=''; });

/* ---------- ПЕРЕХВАТ: миссии ----------
   Игроку дают перехваченную передачу без маркера. Нужно собрать рецепт, которым её зашифровали.
   Станция снимает слои с конца сразу при каждом изменении, совпало с открытым текстом: перехват разобран.
   Звёзды: 3 без подсказок, каждая подсказка минус одна (минимум 1), показанное решение 0.
   Тексты миссий в lang.js: m<N>.t заголовок, .b сводка, .p открытый текст, .h первая подсказка.
   Вторая и третья подсказки собираются из рецепта сами. */
const MISSIONS=[
  {r:[{id:'b64'}],from:'NET-0'},
  {r:[{id:'revall'}],from:'NET-0'},
  {r:[{id:'caesar',p:3}],from:'COURIER'},
  {r:[{id:'morse'}],from:'COAST-3'},
  {r:[{id:'bin'}],from:'M2M'},
  {r:[{id:'revword'},{id:'b64'}],from:'NET-0'},
  {r:[{id:'vigenere',p:'kai'}],from:'AI-OFFICE'},
  {r:[{id:'rail',p:4},{id:'hex'}],from:'NET-0'},
  {r:[{id:'atbash'},{id:'caesar',p:7},{id:'base32'}],from:'NET-0'},
  {r:[{id:'swapfl'},{id:'xor',p:'echo'},{id:'rail',p:3},{id:'braille'}],from:'SHADOW'}
];
let curM=-1, curPlain='', curCipher='', curShown=false;
if(!mem.mis||typeof mem.mis!=='object')mem.mis={};
const mrec=i=>mem.mis[i]||(mem.mis[i]={h:0,done:false,stars:0,gave:false});
const unlocked=i=>i===0||!!(mem.mis[i-1]&&mem.mis[i-1].done);
const starStr=n=>'\u2605'.repeat(n)+'\u2606'.repeat(3-n);
const intPipe=createPipeline({paletteId:'paletteInt',pipeId:'pipeInt',descId:'opdescInt',exclude:['vernam','aes'],emptyKey:'intEmpty',isShown:()=>mode==='int'&&curM>=0,
  onChange:added=>{ if(mode==='int')syncMachine(added); evalInt(); }});
function buildMissionList(){
  const g=$('mgrid'); g.innerHTML=''; let done=0;
  MISSIONS.forEach((m,i)=>{
    const st=mem.mis[i], lock=!unlocked(i); if(st&&st.done)done++;
    const b=document.createElement('button'); b.type='button'; b.className='mcard'+(lock?' locked':'')+(st&&st.done?' done':'');
    b.innerHTML='<span class="mn">'+String(i+1).padStart(2,'0')+'</span><span class="mt"></span><span class="ms"></span>';
    b.querySelector('.mt').textContent=lock?T('intLocked'):T('m'+(i+1)+'.t');
    b.querySelector('.ms').textContent=st&&st.done?starStr(st.stars):'';
    if(!lock)b.addEventListener('click',()=>openMission(i)); else b.disabled=true;
    g.appendChild(b);
  });
  $('intProg').textContent=T('intProg',{n:done,m:MISSIONS.length});
}
function sigOf(t){
  const a=Array.from(t), out=[];
  out.push([T('sLen'),a.length]);
  if(/^[.\- ]+$/.test(t)){ out.push([T('sMorse'),'.-']); return out; }
  if(/[A-Za-z]/.test(t))out.push([T('sLat'),'Aa']);
  if(/[\u0400-\u04FF]/.test(t))out.push([T('sCyr'),'Яя']);
  if(/[0-9]/.test(t))out.push([T('sDig'),'0-9']);
  if(/[\u2800-\u28FF]/.test(t))out.push([T('sBr'),'\u28FF']);
  const sym=(t.match(/[!-\/:-@\[-`{-~]/g)||[]); if(sym.length)out.push([T('sSym'),Array.from(new Set(sym)).slice(0,6).join('')]);
  if(/ /.test(t))out.push([T('sSpace'),(t.match(/ /g)||[]).length]);
  out.push([T('sEnd'),a.slice(-2).join('')]);
  return out;
}
function openMission(i,keep){
  curM=i; curShown=false;
  const m=MISSIONS[i];
  curPlain=T('m'+(i+1)+'.p');
  let c=curPlain; m.r.forEach(st=>{ c=OPS[st.id].fwd(c,st.p); }); curCipher=c;
  $('intList').hidden=true; $('intMission').hidden=false;
  $('mNum').textContent=String(i+1).padStart(2,'0'); $('mTitle').textContent=T('m'+(i+1)+'.t'); $('mFrom').textContent=m.from;
  $('mBrief').textContent=T('m'+(i+1)+'.b'); $('mCipher').textContent=curCipher;
  $('mSig').innerHTML=sigOf(curCipher).map(x=>'<span>'+esc(x[0])+': <b>'+esc(x[1])+'</b></span>').join('');
  const st=mrec(i); $('mStars').textContent=st.done?starStr(st.stars):'';
  renderHints();
  if(!keep)intPipe.setSteps([]); else { intPipe.render(); evalInt(); }
  syncMachine();
  if(!keep){ try{ $('intMission').scrollIntoView({behavior:RM?'auto':'smooth',block:'start'}); }catch(e){} }
}
function closeMission(){ curM=-1; $('intMission').hidden=true; $('intList').hidden=false; buildMissionList(); syncMachine(); }
function hintText(i,k){
  const r=MISSIONS[i].r;
  if(k===0)return T('m'+(i+1)+'.h');
  if(k===1)return T('intOps')+' '+r.map(st=>opName(st.id)).join(', ');
  return T('intRecipe')+' '+r.map((st,j)=>(j+1)+') '+opName(st.id)+(st.p!==undefined?' ['+st.p+']':'')).join('  ');
}
function renderHints(){
  if(curM<0)return; const st=mrec(curM);
  $('mHints').innerHTML=''; for(let k=0;k<st.h;k++){ const d=document.createElement('div'); d.innerHTML='<b>'+esc(T('intHint'))+' '+(k+1)+'.</b> '; d.appendChild(document.createTextNode(hintText(curM,k))); $('mHints').appendChild(d); }
  $('mHintBtn').textContent=T('intHint')+' '+Math.min(3,st.h+1)+'/3'; $('mHintBtn').disabled=st.h>=3;
  $('mGive').textContent=T('intGive');
}
$('mHintBtn').addEventListener('click',()=>{ if(curM<0)return; const st=mrec(curM); if(st.h<3){ st.h++; save(); renderHints(); if(TR)TR.event('cipher.int.hint'); } });
$('mGive').addEventListener('click',()=>{ if(curM<0)return; const st=mrec(curM); st.gave=true; st.h=3; save(); renderHints(); intPipe.setSteps(MISSIONS[curM].r); });
$('intBack').addEventListener('click',closeMission);
$('mNext').addEventListener('click',()=>{ if(curM>=0&&curM<MISSIONS.length-1)openMission(curM+1); else closeMission(); });
function evalInt(){
  if(curM<0)return;
  const out=$('mOut'), steps=intPipe.steps;
  if(!steps.length){ out.className='transmission plain'; out.innerHTML='<span class="muted">'+esc(T('intEmpty'))+'</span>'; $('mOk').hidden=true; return; }
  let s=curCipher, failAt=-1;
  for(let i=steps.length-1;i>=0;i--){ try{ s=OPS[steps[i].id].inv(s,steps[i].p); }catch(e){ failAt=i; break; } }
  if(failAt>=0){ out.className='transmission plain err'; out.textContent='\u2715 '+T('intFail',{n:String(failAt+1).padStart(2,'0')}); $('mOk').hidden=true; return; }
  const a=Array.from(s); out.className='transmission plain'; out.textContent=a.length>1200?a.slice(0,1200).join('')+' ...':s;
  const ok=s===curPlain||s.trim().toLowerCase()===curPlain.trim().toLowerCase();
  $('mOk').hidden=!ok;
  if(ok&&!curShown)solved();
  if(!ok)curShown=false;
}
function solved(){
  curShown=true;
  const st=mrec(curM), stars=st.gave?0:Math.max(1,3-st.h);
  const first=!st.done; st.done=true; st.stars=Math.max(st.stars||0,stars); save();
  $('mOkStars').textContent=starStr(stars); $('mStars').textContent=starStr(st.stars);
  $('mOkNote').textContent=st.gave?T('intGiven'):'';
  const last=curM===MISSIONS.length-1;
  const all=MISSIONS.every((m,i)=>mem.mis[i]&&mem.mis[i].done);
  $('mNext').textContent=last?T('intBack'):T('intNext');
  if(all&&last)$('mOkNote').textContent=(st.gave?T('intGiven')+' ':'')+T('intAll');
  if(GL)intPipe.steps.forEach((x,i)=>setTimeout(()=>{ GL.spin(i,-1); if(AU)AU.tick(); },120+i*180));
  if(AU)setTimeout(()=>AU.seal(true),200+intPipe.steps.length*180);
  if(TR){ TR.event('cipher.int.solved'); if(first&&all)TR.event('cipher.int.all'); }
}

/* ---------- прочее ---------- */
function copyText(txt,btn,msg){
  const ok=()=>{ const o=btn.textContent; btn.textContent=msg||T('copied'); setTimeout(()=>btn.textContent=o,1400); };
  const fb=()=>{ const ta=document.createElement('textarea'); ta.value=txt; ta.style.position='fixed'; ta.style.opacity='0'; document.body.appendChild(ta); ta.select(); try{ document.execCommand('copy'); ok(); }catch(e){} ta.remove(); };
  if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(txt).then(ok,fb); else fb();
}
$('encCopy').addEventListener('click',e=>copyText($('transOut').dataset.full||$('transOut').textContent,e.currentTarget));
$('decCopy').addEventListener('click',e=>copyText($('plainOut').dataset.full!==undefined?$('plainOut').dataset.full:$('plainOut').textContent,e.currentTarget));
$('encSt').addEventListener('change',e=>{ mem.stE=e.target.checked; save(); $('encStages').classList.toggle('on',e.target.checked&&!!$('encStages').innerHTML); });
$('decSt').addEventListener('change',e=>{ mem.stD=e.target.checked; save(); $('decStages').classList.toggle('on',e.target.checked&&!!$('decStages').innerHTML); });
$('encSt').checked=!!mem.stE; $('decSt').checked=!!mem.stD;

function setMode(m){
  mode=m;
  $('view-enc').classList.toggle('on',m==='enc'); $('view-dec').classList.toggle('on',m==='dec'); $('view-int').classList.toggle('on',m==='int');
  $('tab-enc').classList.toggle('on',m==='enc'); $('tab-dec').classList.toggle('on',m==='dec'); $('tab-int').classList.toggle('on',m==='int');
  if(REAL)$('passBox').hidden=m!=='dec';
  airStop(); airReset();
  syncMachine();
}
function setDecMode(m){
  decMode=m;
  $('decAuto').hidden=m!=='auto'; $('decMan').hidden=m!=='man';
  $('sub-auto').classList.toggle('on',m==='auto'); $('sub-man').classList.toggle('on',m==='man');
  syncMachine();
}
$('tab-enc').addEventListener('click',()=>setMode('enc'));
$('tab-dec').addEventListener('click',()=>setMode('dec'));
$('tab-int').addEventListener('click',()=>{ setMode('int'); if(TR)TR.event('cipher.int.open'); });
$('sub-auto').addEventListener('click',()=>setDecMode('auto'));
$('sub-man').addEventListener('click',()=>setDecMode('man'));
$('encBtn').addEventListener('click',doEncode);
$('decBtn').addEventListener('click',doDecode);
$('decBtnMan').addEventListener('click',doDecodeManual);
$('back').addEventListener('click',()=>{ if(PORTAL){ try{ parent.postMessage({aceon:'close'},location.origin); return; }catch(e){} } location.href='../'; });

/* язык */
const langBtn=$('langbtn'), langMenu=$('langmenu');
CODES.forEach(c=>{ const b=document.createElement('button'); b.type='button'; b.dataset.l=c; b.innerHTML='<b>'+c.toUpperCase()+'</b><span></span>'; b.lastChild.textContent=NAMES[c];
  b.addEventListener('click',()=>{ langMenu.classList.remove('on'); setLang(c); }); langMenu.appendChild(b); });
langBtn.addEventListener('click',e=>{ e.stopPropagation(); langMenu.classList.toggle('on'); });
document.addEventListener('click',()=>langMenu.classList.remove('on'));
function setLang(c){
  if(CODES.indexOf(c)<0||c===lang())return;
  const wasSample=$('plain').value===T('sample');
  if(hasI18n)I18n.set(c); else { fbLang=c; const o=readSite(); o.lang=c; if(!o.v)o.v=1; try{ localStorage.setItem('aceon:site',JSON.stringify(o)); }catch(e){} }
  if(TR)TR.event('lang.change');
  if(wasSample)$('plain').value=T('sample');
  texts();
}
function texts(){
  document.documentElement.lang=lang();
  const set=(id,k)=>{ $(id).textContent=T(k); };
  set('back','back'); langBtn.textContent=lang().toUpperCase(); langBtn.title=T('lang');
  langMenu.querySelectorAll('button').forEach(b=>b.classList.toggle('sel',b.dataset.l===lang()));
  set('tSub','sub'); $('tGrif').innerHTML=REAL?T('grifR'):T('grif');
  set('tModeT','modeT'); set('tModeR','modeR'); set('rnote','rNote'); set('tRPass','rPassT'); $('rPass').placeholder=T('passPh'); $('rPass2').placeholder=T('rPass2');
  set('rGen','rGen'); $('rEye').textContent=$('rEye').dataset.on?T('rHide'):T('rShow'); set('tRHint','rHint'); meter();
  set('tRwT','rWarnT'); $('rwList').innerHTML=[1,2,3,4,5,6].map(i=>'<li>'+esc(T('rWarn'+i))+'</li>').join(''); set('tRwAgree','rAgree'); set('rwYes','rEnter'); set('rwNo','rCancel');
  set('tab-int','tabInt'); set('tIntList','intList'); set('tIntStars','intStarsT'); set('intBack','intBack'); set('tIntFrom','intFrom'); set('tIntCipher','intCipher'); set('tIntBuild','intBuild'); set('tIntOut','intOut'); set('tIntOk','intOk');
  intPipe.buildPalette(); buildMissionList(); if(curM>=0)openMission(curM,true);
  set('tFR','fR'); set('encMorse','morse'); set('encVoice','voice'); sndLabel(); airReset();
  set('tmCh','mCh'); set('tmChV',REAL?'mChVR':'mChV'); set('tmKey','mKey'); set('tmKeyV',REAL?'mKeyVR':'mKeyV'); set('tmParse','mParse'); set('tmParseV',REAL?'mParseVR':'mParseV');
  set('tMachine','machine'); set('tab-enc','tabEnc'); set('tab-dec','tabDec'); set('sub-auto','subAuto'); set('sub-man','subMan');
  set('tC1','c1'); $('plain').placeholder=T('plainPh'); set('tC2','c2'); set('tPresets','presets'); set('tMine','mine');
  $('rname').placeholder=T('namePh'); set('rsave','save'); set('tC3','c3'); $('encBtn').textContent=REAL?T('rRun'):T('run'); set('tC4','c4');
  set('encCopy','copy'); set('decCopy','copy'); document.querySelectorAll('.tStages').forEach(e=>e.textContent=T('stages'));
  set('tDecPaste','decPaste'); $('decBtn').textContent=REAL?T('rDecRun'):T('decRun'); set('tManPhrase','manPhrase'); $('cipherMan').placeholder=T('manPh'); set('tManHint','manHint');
  set('tManOps','manOps'); set('tManSeq','manSeq'); set('decBtnMan','manRun'); set('tRestored','restored');
  set('tF1','f1'); set('tF2','f2'); set('tF3','f3'); set('tF4','f4'); set('tF5','f5'); set('tF6','f6');
  set('encLink','link'); set('encShare','share'); $('passIn').placeholder=T('passPh'); set('passGo','passGo'); set('tIncoming','incoming');
  if(!$('passBox').hidden)$('passMsg').textContent=$('passMsg').classList.contains('bad')?T('ePass'):T('needPass');
  encPipe.buildPalette(); encPipe.render(); decPipe.buildPalette(); decPipe.render();
  buildPresets(); buildMine(); syncMachine();
  if(encLast&&encLast.stages&&$('encStages').innerHTML)renderStages($('encStages'),encLast.stages,'enc',encLast.text);
}

/* ---------- старт ---------- */
$('plain').value=T('sample');
const start=Array.isArray(mem.last)&&mem.last.length?mem.last:[{id:'b64'},{id:'swap23'},{id:'revword'},{id:'swapfl'},{id:'caesar',p:3}];
start.forEach(s=>{ if(OPS[s.id]&&!secret(s.id))encPipe.steps.push(clone(s)); });
if(mem.real&&mem.realOk){ REAL=true; document.body.classList.add('real'); $('modeT').classList.remove('on'); $('modeR').classList.add('on'); if(GL&&GL.setReal)GL.setReal(true); }
texts();
/* открыли ссылку-передачу: сразу во вкладку расшифровки и перехват */
(function(){
  const m=location.hash.match(/^#t=([A-Za-z0-9_-]+)/); if(!m)return;
  let tr=''; try{ tr=unb64url(m[1]); }catch(e){ return; }
  try{ history.replaceState(null,'',location.pathname+location.search); }catch(e){}
  $('cipher').value=tr; setMode('dec'); if(!REAL)setDecMode('auto'); $('incoming').hidden=false;
  if(TR)TR.event('cipher.link.open');
  const go=()=>setTimeout(()=>{ $('machine').scrollIntoView({behavior:RM?'auto':'smooth',block:'start'}); doDecode(); },700);
  if(A.isReal(tr)&&!REAL)setReal(true,go); else go();
})();
})();
