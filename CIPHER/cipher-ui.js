/* A.C.EON // CIPHER: интерфейс станции.
   Движок: window.ACEON (cipher-engine.js). Шифромашина: window.CipherGL (cipher-gl.js, может отсутствовать).
   Конвейер: палитра операций, готовые рецепты, свои рецепты (Store 'cipher'), перетаскивание шагов за номер.
   Этапы: после шифровки и расшифровки можно посмотреть текст после каждой операции. */
(function(){
'use strict';
const $=id=>document.getElementById(id);
const A=window.ACEON, OPS=A.OPS;
const GL=window.CipherGL&&window.CipherGL.ok?window.CipherGL:null;
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
const GRP={'Кодировки':'enc','Визуальное':'vis','Перестановки':'perm','Классика':'cls'};
const opName=id=>{ const k='o.'+id, s=T(k); return s!==k?s:OPS[id].name; };
const opDesc=id=>{ const k='d.'+id, s=T(k); return s!==k?s:(OPS[id].desc||''); };
const grpName=id=>T('g.'+(GRP[OPS[id].grp]||'cls'));
const plabel=id=>{ const k='pl.'+id, s=T(k); return s!==k?s:(OPS[id].param==='num'?T('pNum'):T('pKey')); };

/* ---------- память ---------- */
let mem={recipes:[],last:null,stE:false,stD:false};
const hasStore=!!window.Store;
if(hasStore){ try{ Store.define('cipher',{version:1,defaults:{recipes:[],last:null,stE:false,stD:false}}); mem=Store.get('cipher'); }catch(e){} }
function save(){ if(hasStore)try{ Store.save('cipher'); }catch(e){} }

/* ---------- конвейер ---------- */
const clone=st=>st.p===undefined?{id:st.id}:{id:st.id,p:st.p};
function createPipeline(cfg){
  const steps=[];
  let hot=-1;
  function buildPalette(){
    const grps={};
    for(const id in OPS){ if(cfg.exclude&&cfg.exclude.indexOf(id)>=0)continue; const g=GRP[OPS[id].grp]||'cls'; (grps[g]=grps[g]||[]).push(id); }
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
      if(op.param)ph='<input class="param" value="'+esc(st.p)+'" placeholder="'+esc(plabel(st.id))+'" title="'+esc(plabel(st.id))+'"'+(op.param==='num'?' inputmode="numeric"':'')+'>';
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
let mode='enc', decMode='auto', lastRecipe=[];
function machineSteps(){ return mode==='enc'?encPipe.steps:(decMode==='man'?decPipe.steps:lastRecipe); }
function syncMachine(added){
  $('machine').classList.toggle('dec',mode!=='enc');
  $('mMode').textContent=mode==='enc'?T('tabEnc'):T('tabDec');
  const st=machineSteps();
  $('rempty').textContent=st.length?'':T('noRotors');
  if(GL)GL.setRotors(st,mode==='enc'?'enc':'dec',id=>opName(id),added);
}
const encPipe=createPipeline({paletteId:'palette',pipeId:'pipe',descId:'opdesc',emptyKey:'empty',isShown:()=>mode==='enc',
  onChange:added=>{ mem.last=encPipe.steps.map(clone); save(); if(mode==='enc')syncMachine(added); }});
const decPipe=createPipeline({paletteId:'paletteMan',pipeId:'pipeMan',descId:'opdescMan',exclude:['vernam'],emptyKey:'emptyMan',isShown:()=>mode==='dec'&&decMode==='man',
  onChange:added=>{ if(mode==='dec'&&decMode==='man')syncMachine(added); }});
if(GL)GL.onHover(i=>{ const p=mode==='enc'?encPipe:(decMode==='man'?decPipe:null); if(p)p.highlight(i); });

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
    let id; do{ id=ids[Math.random()*ids.length|0]; }while(out.length&&out[out.length-1].id===id);
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
  const rec={name,steps:encPipe.steps.map(clone)};
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
  function frame(now){
    const p=Math.min(1,(now-t0)/cfg.dur), head=Math.floor(easeInOut(p)*VIS);
    while(fired<cfg.events.length&&(now-t0)>=cfg.events[fired].t){
      const ev=cfg.events[fired++];
      const d=document.createElement('div'); d.textContent='> '+ev.line; con.appendChild(d);
      con.querySelectorAll('div').forEach(x=>x.classList.remove('hot')); d.classList.add('hot');
      if(steps){ clearActive(); if(ev.step>=0&&steps[ev.step])steps[ev.step].classList.add('active'); }
      if(GL&&ev.rotor>=0)GL.spin(ev.rotor,cfg.dir==='enc'?1:-1);
    }
    let buf=''; for(let i=0;i<VIS;i++)buf+=i<head?chars[i]:i<head+ZONE?rndGlyph():noise[i];
    out.textContent=buf;
    if(p<1)animRAF=requestAnimationFrame(frame);
    else { animRAF=null; if(steps)clearActive(); con.querySelectorAll('div').forEach(x=>x.classList.remove('hot')); btn.disabled=false; btn.textContent=btn.dataset.lbl; if(GL)GL.animEnd(); cfg.onDone(); }
  }
  animRAF=requestAnimationFrame(frame);
}

/* ---------- этапы ---------- */
function renderStages(box,list,dir,input){
  const cut=s=>{ const a=Array.from(s); return a.length>600?a.slice(0,600).join('')+' ...':s; };
  let h='<div class="stage"><span class="k">00</span><span class="lbl">'+esc(T('stIn'))+'<span class="len">'+Array.from(input).length+'</span></span><div class="val">'+esc(cut(input))+'</div></div>';
  list.forEach((st,k)=>{
    const n=dir==='enc'?k+1:st.i+1;
    h+='<div class="stage"><span class="k">'+String(n).padStart(2,'0')+'</span><span class="lbl">'+esc(opName(st.id))+(st.p!==undefined&&OPS[st.id].param?' ['+esc(st.p)+']':'')
      +'<span class="len">'+Array.from(st.out).length+'</span></span><div class="val">'+esc(cut(st.out))+'</div></div>';
  });
  box.innerHTML=h;
  box.querySelectorAll('.val').forEach(v=>v.addEventListener('click',()=>v.classList.toggle('open')));
}

/* ---------- шифрование ---------- */
let encLast=null;
function doEncode(){
  if(animRAF)return;
  const text=$('plain').value, out=$('transOut'), con=$('encConsole');
  $('encOutWrap').hidden=false; clearActive(); $('encStages').classList.remove('on');
  if(!encPipe.steps.length){ con.className='console'; con.innerHTML=''; out.className='transmission err'; out.textContent=T('eEmpty'); return; }
  encPipe.steps.forEach(st=>{ if(OPS[st.id].gen)st.p=undefined; });
  const transmission=A.encode(text,encPipe.steps);
  encLast={text,recipe:encPipe.steps.map(clone)};
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
function finishEncode(tr){
  const out=$('transOut'), end=tr.indexOf(A.SEP);
  out.className='transmission'; out.dataset.full=tr;
  out.innerHTML='<span class="marker">'+esc(tr.slice(0,end+1))+'</span>'+esc(tr.slice(end+1));
  if(encLast){ renderStages($('encStages'),A.stages(encLast.text,encLast.recipe),'enc',encLast.text); $('encStages').classList.toggle('on',$('encSt').checked); }
}

/* ---------- расшифровка ---------- */
function decodeAnimate(res,recipe,btnId,input){
  const out=$('plainOut'), con=$('decConsole');
  $('decWarn').classList.remove('on'); $('decStages').classList.remove('on');
  const done=()=>finishDecode(res,recipe,input);
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
function finishDecode(res,recipe,input){
  const out=$('plainOut');
  out.className='transmission plain'; out.textContent=res.plain!==''?res.plain:T('emptyMsg'); out.dataset.full=res.plain;
  const w=$('decWarn');
  if(!res.ok){ w.textContent=res.sum?T('wTamper'):T('wGarbage'); w.classList.add('on'); }
  try{ renderStages($('decStages'),A.unstages(input,recipe),'dec',input); $('decStages').classList.toggle('on',$('decSt').checked); }catch(e){}
}
function decError(msg){
  const con=$('decConsole'); con.className='console'; con.innerHTML='';
  const out=$('plainOut'); out.className='transmission err'; out.textContent='✕ '+msg; out.dataset.full='';
  $('decWarn').classList.remove('on'); $('decStages').classList.remove('on');
  $('decOutWrap').hidden=false;
}
function errText(e,recipe){
  const c=e&&e.code;
  if(c==='nomark')return T('eNomark'); if(c==='broken')return T('eBroken'); if(c==='recipe')return T('eRecipe'); if(c==='unknown')return T('eUnknown');
  if(c==='fail'){ const i=e.layer|0; return T('eFail',{n:String(i+1).padStart(2,'0'),op:recipe&&recipe[i]?opName(recipe[i].id):'?'}); }
  return T('eRecipe');
}
function doDecode(){
  if(animRAF)return;
  const t=$('cipher').value;
  $('decOutWrap').hidden=false;
  let res; try{ res=A.decodeParts(t); }catch(e){ let rec=null; try{ const s=t.replace(/^\s+/,''); rec=A.unpackRecipe(s.slice(A.PREFIX.length,s.indexOf(A.SEP))); rec=Array.isArray(rec)?rec:rec.r; }catch(er){} decError(errText(e,rec)); lastRecipe=[]; syncMachine(); return; }
  lastRecipe=res.recipe.map(clone); syncMachine(true);
  const s=t.replace(/^\s+/,''), body=s.slice(s.indexOf(A.SEP)+1);
  if(TR)TR.event('cipher.decode');
  decodeAnimate(res,res.recipe,'decBtn',body);
}
function doDecodeManual(){
  if(animRAF)return;
  let c=$('cipherMan').value;
  const s=c.replace(/^\s+/,''); if(s.startsWith(A.PREFIX)){ const e=s.indexOf(A.SEP); if(e>=0)c=s.slice(e+1); }
  const recipe=decPipe.steps.map(clone);
  $('decOutWrap').hidden=false;
  if(!recipe.length){ decError(T('eManAdd')); return; }
  let plain=null;
  const tries=[c,c.replace(/\s+$/,'')].filter((x,i,a)=>a.indexOf(x)===i);
  for(const x of tries){ try{ let s2=x; for(let i=recipe.length-1;i>=0;i--)s2=OPS[recipe[i].id].inv(s2,recipe[i].p); if(plain===null||!A.looksBroken(s2)){ plain=s2; c=x; } if(!A.looksBroken(s2))break; }catch(e){} }
  if(plain===null){ decError(T('eMan')); return; }
  if(TR)TR.event('cipher.manual');
  decodeAnimate({plain,ok:!A.looksBroken(plain),sum:false},recipe,'decBtnMan',c);
}

/* ---------- прочее ---------- */
function copyText(txt,btn){
  const ok=()=>{ const o=btn.textContent; btn.textContent=T('copied'); setTimeout(()=>btn.textContent=o,1400); };
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
  $('view-enc').classList.toggle('on',m==='enc'); $('view-dec').classList.toggle('on',m==='dec');
  $('tab-enc').classList.toggle('on',m==='enc'); $('tab-dec').classList.toggle('on',m==='dec');
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
  set('tSub','sub'); $('tGrif').innerHTML=T('grif');
  set('tmCh','mCh'); set('tmChV','mChV'); set('tmKey','mKey'); set('tmKeyV','mKeyV'); set('tmParse','mParse'); set('tmParseV','mParseV');
  set('tMachine','machine'); set('tab-enc','tabEnc'); set('tab-dec','tabDec'); set('sub-auto','subAuto'); set('sub-man','subMan');
  set('tC1','c1'); $('plain').placeholder=T('plainPh'); set('tC2','c2'); set('tPresets','presets'); set('tMine','mine');
  $('rname').placeholder=T('namePh'); set('rsave','save'); set('tC3','c3'); set('encBtn','run'); set('tC4','c4');
  set('encCopy','copy'); set('decCopy','copy'); document.querySelectorAll('.tStages').forEach(e=>e.textContent=T('stages'));
  set('tDecPaste','decPaste'); set('decBtn','decRun'); set('tManPhrase','manPhrase'); $('cipherMan').placeholder=T('manPh'); set('tManHint','manHint');
  set('tManOps','manOps'); set('tManSeq','manSeq'); set('decBtnMan','manRun'); set('tRestored','restored');
  set('tF1','f1'); set('tF2','f2'); set('tF3','f3'); set('tF4','f4'); set('tF5','f5');
  encPipe.buildPalette(); encPipe.render(); decPipe.buildPalette(); decPipe.render();
  buildPresets(); buildMine(); syncMachine();
  if(encLast&&$('encStages').innerHTML)renderStages($('encStages'),A.stages(encLast.text,encLast.recipe),'enc',encLast.text);
}

/* ---------- старт ---------- */
$('plain').value=T('sample');
const start=Array.isArray(mem.last)&&mem.last.length?mem.last:[{id:'b64'},{id:'swap23'},{id:'revword'},{id:'swapfl'},{id:'caesar',p:3}];
start.forEach(s=>{ if(OPS[s.id])encPipe.steps.push(clone(s)); });
texts();
})();
