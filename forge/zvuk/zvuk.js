/* FORGE звуковая мастерская.
   Проект = куски (clips) по очереди. Кусок ссылается на исходный файл (хранится как есть в IndexedDB «forge-zvuk», blobs)
   и список отрезков segs [[начало, конец], ...] в секундах исходника: обрезка и вырезание меняют только этот список,
   поэтому отмена дешёвая (снимок JSON), а исходник не портится.
   Громкость, скорость и эффект общие для проекта. После каждой правки весь проект пересобирается в OfflineAudioContext
   в один буфер MIX: по нему рисуется волна и играет превью, то есть видно и слышно ровно то, что сохранится.
   Плавное начало и конец считаются на границах того, что сохраняем (весь трек или выделенное) и накладываются при игре и сохранении. */
(function(){
"use strict";
var $=function(s,r){ return (r||document).querySelector(s); };
var $$=function(s,r){ return [].slice.call((r||document).querySelectorAll(s)); };
var wide=matchMedia("(min-width:960px)");
function el(html, fn){ var d=document.createElement("div"); d.innerHTML=html.trim(); var n=d.firstElementChild; if(fn) fn(n); return n; }
function sh(t){ return el('<div class="sh">'+esc(t)+'</div>'); }
function choice(label, opts, cur, fn){ return el('<div class="f">'+(label?'<label>'+esc(label)+'</label>':'')+'<div class="chips">'+opts.map(function(o){ return '<button data-v="'+o[0]+'" class="'+(String(o[0])===String(cur)?"on":"")+'"'+(o[2]?' disabled style="opacity:.4"':'')+'>'+esc(o[1])+'</button>'; }).join("")+'</div></div>',function(n){
  $$("button",n).forEach(function(x){ x.onclick=function(){ if(x.disabled) return; $$("button",n).forEach(function(y){ y.classList.toggle("on",y===x); }); fn(x.getAttribute("data-v")); }; }); }); }
function range(label,v,min,max,step,fmt,fn,done){ return el('<div class="f"><div class="lab"><span>'+esc(label)+'</span><output>'+fmt(v)+'</output></div><input type="range" min="'+min+'" max="'+max+'" step="'+step+'" value="'+v+'"></div>',function(n){
  var o=$("output",n), i=$("input",n); i.oninput=function(){ o.textContent=fmt(Number(i.value)); fn(Number(i.value)); }; i.onchange=function(){ if(done) done(Number(i.value)); }; }); }
function toggle(label,v,fn){ return el('<label class="tg"><span>'+esc(label)+'</span><input type="checkbox"'+(v?" checked":"")+'></label>',function(n){ $("input",n).onchange=function(){ fn(this.checked); }; }); }
function tm(s,dec){ s=Math.max(0,s||0); var m=Math.floor(s/60), r=s-m*60, t=dec===0?String(Math.floor(r)).padStart(2,"0"):r.toFixed(1).padStart(4,"0"); return m+":"+t; }
function sec(s){ return (Math.round(s*10)/10).toFixed(1)+" "+TR("с"); }
var SV={ keep:"M6 4v16M18 4v16M6 12h12", cut:"M6 9a3 3 0 100-6 3 3 0 000 6zM6 21a3 3 0 100-6 3 3 0 000 6zM20 4L8.1 15.9M14.5 14.5L20 20M8.1 8.1L12 12", fade:"M3 20L12 4l9 16",
  sil:"M4 12h3l3-7 4 14 3-7h3", vol:"M4 9h4l5-4v14l-5-4H4zM16 9a4 4 0 010 6", spd:"M12 12l4-3M5 19a9 9 0 1114 0", fx:"M3 12h4M17 12h4M7 8v8M11 5v14M13 7v10M17 9v6",
  mic:"M12 3a3 3 0 00-3 3v5a3 3 0 006 0V6a3 3 0 00-3-3zM5 11a7 7 0 0014 0M12 18v3", add:"M12 5v14M5 12h14", file:"M14 3H6v18h12V7zM14 3v4h4", ring:"M6 8a6 6 0 0112 0c0 7 3 9 3 9H3s3-2 3-9M10 21a2 2 0 004 0",
  l:"M15 5l-7 7 7 7", r:"M9 5l7 7-7 7", x:"M6 6l12 12M18 6L6 18" };
function sv(n){ return '<svg viewBox="0 0 24 24"><path d="'+SV[n]+'"/></svg>'; }

/* ═══════════ хранение ═══════════ */
var dbp=null;
function db(){ if(dbp) return dbp; dbp=new Promise(function(res,rej){ try{ var r=indexedDB.open("forge-zvuk",1);
  r.onupgradeneeded=function(){ r.result.createObjectStore("projects",{keyPath:"id"}); r.result.createObjectStore("blobs"); };
  r.onsuccess=function(){ res(r.result); }; r.onerror=function(){ rej(r.error); }; }catch(e){ rej(e); } }).catch(function(){ return null; }); return dbp; }
function tx(store,mode,fn){ return db().then(function(d){ if(!d) throw new Error("nodb"); return new Promise(function(res,rej){ var t=d.transaction(store,mode), s=t.objectStore(store), out=fn(s);
  t.oncomplete=function(){ res(out&&out.result!==undefined?out.result:undefined); }; t.onerror=function(){ rej(t.error); }; t.onabort=function(){ rej(t.error); }; }); }); }
function pAll(){ return tx("projects","readonly",function(s){ return s.getAll(); }).catch(function(){ return []; }); }
function pGet(id){ return tx("projects","readonly",function(s){ return s.get(id); }).catch(function(){ return null; }); }
function pPut(p){ return tx("projects","readwrite",function(s){ s.put(p); }); }
function pDel(p){ return tx("projects","readwrite",function(s){ s.delete(p.id); }).then(function(){ return pAll(); }).then(function(all){
  /* исходник удаляем, только если он больше нигде не нужен */
  var used={}; all.forEach(function(q){ (q.clips||[]).forEach(function(c){ used[c.aid]=1; }); });
  return tx("blobs","readwrite",function(s){ (p.clips||[]).forEach(function(c){ if(!used[c.aid]) s.delete(c.aid); }); }); }); }
function bPut(aid,blob){ return tx("blobs","readwrite",function(s){ s.put(blob,aid); }); }
function bGet(aid){ return tx("blobs","readonly",function(s){ return s.get(aid); }); }
function newId(p){ return (p||"z")+Date.now().toString(36)+Math.random().toString(36).slice(2,6); }

/* ═══════════ звук ═══════════ */
var AC=null; function ac(){ if(!AC){ AC=new (window.AudioContext||window.webkitAudioContext)(); } if(AC.state==="suspended") AC.resume(); return AC; }
var SR=44100, BUF={};
function decode(aid){ if(BUF[aid]) return BUF[aid]; BUF[aid]=bGet(aid).then(function(b){ if(!b) throw new Error("nofile"); return b.arrayBuffer(); })
  .then(function(ab){ return new Promise(function(res,rej){ var p=ac().decodeAudioData(ab,res,rej); if(p&&p.then) p.then(res,rej); }); }).catch(function(e){ delete BUF[aid]; throw e; }); return BUF[aid]; }

/* ═══════════ проект и отрезки ═══════════ */
var P=null;
function newProject(title){ return { v:1, id:newId(), title:title||TR("Новый звук"), clips:[], gain:0, speed:1, fx:"none", mono:false, fadeIn:0, fadeOut:0, scope:"all", sel:null, ring:0, fmt:"mp3192", updated:Date.now() }; }
function segLen(c){ return c.segs.reduce(function(a,s){ return a+(s[1]-s[0]); },0); }
function clipLen(c){ return segLen(c)/P.speed; }
function total(){ return P?P.clips.reduce(function(a,c){ return a+clipLen(c); },0):0; }
function clipStart(i){ var t=0; for(var k=0;k<i;k++) t+=clipLen(P.clips[k]); return t; }
/* убрать из отрезков кусок [x,y) в «сплошном» времени исходника */
function removeSeq(segs,x,y){ var out=[], pos=0;
  segs.forEach(function(s){ var L=s[1]-s[0], a=pos, b=pos+L;
    if(b<=x||a>=y) out.push(s.slice());
    else { if(x>a) out.push([s[0],s[0]+(x-a)]); if(y<b) out.push([s[0]+(y-a),s[1]]); }
    pos=b; });
  return out.filter(function(s){ return s[1]-s[0]>0.0005; }); }
function cutRange(a,b){ var t=0; P.clips.forEach(function(c){ var L=clipLen(c), la=Math.max(0,a-t), lb=Math.min(L,b-t); if(lb>la) c.segs=removeSeq(c.segs,la*P.speed,lb*P.speed); t+=L; });
  P.clips=P.clips.filter(function(c){ return c.segs.length; }); }
function keepRange(a,b){ var T=total(); cutRange(b,T+1); cutRange(0,a); }

/* ═══════════ сборка проекта в один буфер ═══════════ */
var MIX=null, PK=null, rendT=0, rendN=0;
var FX={ none:"без эффекта", echo:"эхо", bass:"больше баса", phone:"телефон", radio:"рация", hall:"зал" };
function chain(ctx,input,out){
  var fx=P.fx;
  if(fx==="bass"){ var f=ctx.createBiquadFilter(); f.type="lowshelf"; f.frequency.value=160; f.gain.value=9; input.connect(f); f.connect(out); return; }
  if(fx==="phone"||fx==="radio"){ var hp=ctx.createBiquadFilter(), lp=ctx.createBiquadFilter(), ws=ctx.createWaveShaper(), k=fx==="radio"?18:5, cv=new Float32Array(1024);
    for(var i=0;i<1024;i++){ var x=i/512-1; cv[i]=(1+k)*x/(1+k*Math.abs(x)); } ws.curve=cv;
    hp.type="highpass"; hp.frequency.value=fx==="radio"?550:380; lp.type="lowpass"; lp.frequency.value=fx==="radio"?2600:3300;
    var g=ctx.createGain(); g.gain.value=fx==="radio"?.55:.8; input.connect(hp); hp.connect(lp); lp.connect(ws); ws.connect(g); g.connect(out); return; }
  if(fx==="echo"||fx==="hall"){ var d=ctx.createDelay(2), fb=ctx.createGain(), wet=ctx.createGain(), lp2=ctx.createBiquadFilter();
    d.delayTime.value=fx==="echo"?.32:.09; fb.gain.value=fx==="echo"?.38:.62; wet.gain.value=fx==="echo"?.45:.35; lp2.type="lowpass"; lp2.frequency.value=fx==="echo"?5000:3200;
    input.connect(out); input.connect(d); d.connect(lp2); lp2.connect(fb); fb.connect(d); lp2.connect(wet); wet.connect(out); return; }
  input.connect(out);
}
function render(){ clearTimeout(rendT); rendT=setTimeout(doRender,120); }
function doRender(){
  var my=++rendN;
  if(!P||!P.clips.length){ MIX=null; PK=null; draw(); clipsUi(); timeUi(); return Promise.resolve(); }
  $("#busy").hidden=false;
  return Promise.all(P.clips.map(function(c){ return decode(c.aid); })).then(function(bufs){
    if(my!==rendN) return;
    var T=total(), tail=(P.fx==="echo"||P.fx==="hall")?1.5:0, n=Math.max(1,Math.ceil((T+tail)*SR));
    var ctx=new (window.OfflineAudioContext||window.webkitOfflineAudioContext)(2,n,SR), g=ctx.createGain(); g.gain.value=Math.pow(10,P.gain/20);
    chain(ctx,g,ctx.destination);
    var when=0;
    P.clips.forEach(function(c,i){ var b=bufs[i];
      c.segs.forEach(function(s){ var L=(s[1]-s[0])/P.speed, src=ctx.createBufferSource(), sg=ctx.createGain(), r=Math.min(.004,L/3);
        src.buffer=b; src.playbackRate.value=P.speed; src.connect(sg); sg.connect(g);
        /* короткие подъёмы на стыках, чтобы не щёлкало */
        sg.gain.setValueAtTime(0,when); sg.gain.linearRampToValueAtTime(1,when+r); sg.gain.setValueAtTime(1,when+L-r); sg.gain.linearRampToValueAtTime(0,when+L);
        src.start(when,s[0],s[1]-s[0]); when+=L; }); });
    return new Promise(function(res,rej){ ctx.oncomplete=function(e){ res(e.renderedBuffer); }; var pr=ctx.startRendering(); if(pr&&pr.then) pr.then(res,rej); }); })
  .then(function(buf){ if(!buf||my!==rendN) return; MIX=buf; peaks(); $("#busy").hidden=true; fixSel(); draw(); timeUi(); clipsUi(); if(ui.tab==="snd") refreshPane(); thumbSave(); })
  .catch(function(e){ $("#busy").hidden=true; toast(e&&e.message==="nofile"?TR("Исходный файл пропал из браузера"):TR("Этот файл браузер прочитать не смог")); });
}
/* пики для быстрой волны: мин и макс по корзинкам по 256 отсчётов */
var BK=256;
function peaks(){ var a=MIX.getChannelData(0), b=MIX.numberOfChannels>1?MIX.getChannelData(1):a, n=Math.ceil(a.length/BK), mn=new Float32Array(n), mx=new Float32Array(n), top=0;
  for(var i=0;i<n;i++){ var lo=1, hi=-1, e=Math.min(a.length,(i+1)*BK); for(var j=i*BK;j<e;j++){ var v=a[j]; if(v<lo) lo=v; if(v>hi) hi=v; v=b[j]; if(v<lo) lo=v; if(v>hi) hi=v; } mn[i]=lo; mx[i]=hi; if(hi>top) top=hi; if(-lo>top) top=-lo; }
  PK={ mn:mn, mx:mx, peak:top }; }
function peakDb(){ return PK&&PK.peak>0?20*Math.log10(PK.peak):-99; }

/* ═══════════ волна ═══════════ */
var wave=$("#wave"), wc=$("#wc"), wg=wc.getContext("2d"), V={ t0:0, len:0 }, RH=22, play={ on:false };
function T(){ return MIX?Math.min(total(),MIX.duration):total(); }
function viewLen(){ var Tt=T()||1, z=+$("#zoom").value/100; return Math.max(Math.min(Tt,1.5),Tt*Math.pow(1-z,2.2)); }
function clampView(){ var Tt=T(); V.len=viewLen(); V.t0=Math.max(0,Math.min(V.t0,Math.max(0,Tt-V.len))); var sc=$("#scroll"); sc.hidden=V.len>=Tt-.01; if(!sc.hidden) sc.value=Math.round(V.t0/Math.max(.001,Tt-V.len)*1000); }
function xOf(t){ return (t-V.t0)/V.len*wc.clientWidth; }
function tOf(x){ return V.t0+x/wc.clientWidth*V.len; }
function scope(){ var Tt=T(); if(P.scope==="sel"&&P.sel) return P.sel.slice(); return [0,Tt]; }
function draw(){
  var W=wc.clientWidth, H=wc.clientHeight, d=Math.min(2,devicePixelRatio||1);
  if(wc.width!==Math.round(W*d)||wc.height!==Math.round(H*d)){ wc.width=Math.round(W*d); wc.height=Math.round(H*d); }
  var g=wg; g.setTransform(d,0,0,d,0,0); g.clearRect(0,0,W,H);
  $("#empty").hidden=!!(P&&P.clips.length);
  if(!P||!P.clips.length||!MIX){ return; }
  clampView();
  var Tt=T(), sc=scope();
  /* шкала времени */
  g.fillStyle="#0d1116"; g.fillRect(0,0,W,RH); g.fillStyle="#232a33"; g.fillRect(0,RH-1,W,1);
  var steps=[.5,1,2,5,10,15,30,60,120,300], st=steps.filter(function(s){ return s/V.len*W>70; })[0]||600;
  g.font="10px ui-monospace,Menlo,monospace"; g.fillStyle="#59636e";
  for(var t=Math.ceil(V.t0/st)*st;t<V.t0+V.len;t+=st){ var x=xOf(t); g.fillRect(x,RH-7,1,6); g.fillText(tm(t,st<1?1:0),x+4,14); }
  /* волна */
  var mid=(H+RH)/2, amp=(H-RH)/2-8, spp=V.len*SR/W, a=MIX.getChannelData(0), b=MIX.numberOfChannels>1?MIX.getChannelData(1):a;
  for(var px=0;px<W;px++){ var t0=V.t0+px/W*V.len, s0=Math.floor(t0*SR), s1=Math.max(s0+1,Math.floor((t0+V.len/W)*SR)), lo=0, hi=0;
    if(spp>BK*2){ for(var k=Math.floor(s0/BK);k<Math.min(PK.mn.length,Math.ceil(s1/BK));k++){ if(PK.mn[k]<lo) lo=PK.mn[k]; if(PK.mx[k]>hi) hi=PK.mx[k]; } }
    else for(var j=s0;j<Math.min(a.length,s1);j++){ var v=a[j]; if(v<lo) lo=v; if(v>hi) hi=v; v=b[j]; if(v<lo) lo=v; if(v>hi) hi=v; }
    var inS=t0>=sc[0]&&t0<=sc[1], inSel=P.sel&&t0>=P.sel[0]&&t0<=P.sel[1];
    var f=fadeK(t0,sc); lo*=f; hi*=f;
    g.fillStyle=inSel?"#7ef0e4":(P.scope==="sel"&&!inS?"#262f39":(hi>.999||lo<-.999?"#ff5d73":"#3f5163"));
    g.fillRect(px,mid-Math.max(.5,hi*amp),1,Math.max(1,(hi-lo)*amp)); }
  g.fillStyle="#1b232c"; g.fillRect(0,mid,W,1);
  /* выделение */
  if(P.sel){ var x1=xOf(P.sel[0]), x2=xOf(P.sel[1]);
    g.fillStyle="rgba(79,214,200,.12)"; g.fillRect(x1,RH,x2-x1,H-RH); g.fillStyle="#4fd6c8"; g.fillRect(x1-1,RH,2,H-RH); g.fillRect(x2-1,RH,2,H-RH);
    [x1,x2].forEach(function(x){ rr(g,x-9,mid-22,18,44,9); g.fillStyle="#4fd6c8"; g.fill(); g.fillStyle="#06231f"; g.fillRect(x-2,mid-8,1,16); g.fillRect(x+1,mid-8,1,16); }); }
  /* плавные края: розовая линия огибающей и две ручки */
  var fx1=xOf(sc[0]), fx2=xOf(sc[1]), fi=xOf(sc[0]+P.fadeIn), fo=xOf(sc[1]-P.fadeOut), top=RH+10, bot=H-4;
  g.strokeStyle="#ff5fa2"; g.lineWidth=1.6; g.beginPath(); g.moveTo(fx1,bot); g.lineTo(fi,top); g.lineTo(fo,top); g.lineTo(fx2,bot); g.stroke();
  [fi,fo].forEach(function(x){ g.beginPath(); g.arc(x,top,7,0,Math.PI*2); g.fillStyle="#fff"; g.fill(); g.lineWidth=3; g.strokeStyle="#ff5fa2"; g.stroke(); });
  /* где сейчас звук */
  var ph=xOf(posNow()); if(ph>=0&&ph<=W){ g.fillStyle="#fff"; g.fillRect(ph-1,RH,2,H-RH); g.beginPath(); g.moveTo(ph-6,RH); g.lineTo(ph+6,RH); g.lineTo(ph,RH+8); g.fill(); }
}
function rr(g,x,y,w,h,r){ g.beginPath(); g.moveTo(x+r,y); g.arcTo(x+w,y,x+w,y+h,r); g.arcTo(x+w,y+h,x,y+h,r); g.arcTo(x,y+h,x,y,r); g.arcTo(x,y,x+w,y,r); g.closePath(); }
function fadeK(t,sc){ var k=1; if(P.fadeIn>0&&t<sc[0]+P.fadeIn) k=Math.max(0,(t-sc[0])/P.fadeIn); if(P.fadeOut>0&&t>sc[1]-P.fadeOut) k=Math.min(k,Math.max(0,(sc[1]-t)/P.fadeOut)); return t<sc[0]||t>sc[1]?1:k; }
function fixSel(){ var Tt=T(); if(P.sel){ P.sel=[Math.max(0,Math.min(P.sel[0],Tt)),Math.max(0,Math.min(P.sel[1],Tt))]; if(P.sel[1]-P.sel[0]<.05){ P.sel=null; if(P.scope==="sel") P.scope="all"; } }
  var sc=scope(), L=sc[1]-sc[0]; P.fadeIn=Math.min(P.fadeIn,L/2); P.fadeOut=Math.min(P.fadeOut,L/2); if(cur>Tt) cur=0; }
function timeUi(){ $("#tNow").textContent=tm(posNow()); $("#tAll").textContent="/ "+tm(T());
  $("#tSel").textContent=P&&P.sel?TR("выделено {0} - {1}, {2}",tm(P.sel[0]),tm(P.sel[1]),sec(P.sel[1]-P.sel[0])):""; }

/* мышь и палец на волне */
var drag=null;
wave.addEventListener("pointerdown",function(e){
  if(!MIX||e.button>0) return; var r=wc.getBoundingClientRect(), x=e.clientX-r.left, y=e.clientY-r.top, t=tOf(x), sc=scope(), top=RH+10;
  try{ wave.setPointerCapture(e.pointerId); }catch(er){}
  var near=function(px){ return Math.abs(x-px)<(e.pointerType==="touch"?18:11); };
  if(Math.abs(y-top)<16&&near(xOf(sc[0]+P.fadeIn))) drag={k:"fi"}; else if(Math.abs(y-top)<16&&near(xOf(sc[1]-P.fadeOut))) drag={k:"fo"};
  else if(P.sel&&near(xOf(P.sel[0]))) drag={k:"s0"}; else if(P.sel&&near(xOf(P.sel[1]))) drag={k:"s1"};
  else if(P.sel&&t>P.sel[0]&&t<P.sel[1]&&y>RH) drag={k:"mv",d:t-P.sel[0],len:P.sel[1]-P.sel[0]};
  else drag={k:"new",t0:t};
  drag.x0=x; drag.moved=false; drag.saved=false; });
wave.addEventListener("pointermove",function(e){ if(!drag) return; var r=wc.getBoundingClientRect(), x=e.clientX-r.left, t=Math.max(0,Math.min(T(),tOf(x))), sc=scope();
  if(!drag.moved&&Math.abs(x-drag.x0)<4) return; if(!drag.moved){ drag.moved=true; if(drag.k!=="new"||true){ remember(); } }
  if(drag.k==="fi") P.fadeIn=Math.max(0,Math.min(t-sc[0],(sc[1]-sc[0])-P.fadeOut));
  else if(drag.k==="fo") P.fadeOut=Math.max(0,Math.min(sc[1]-t,(sc[1]-sc[0])-P.fadeIn));
  else if(drag.k==="s0"){ P.sel[0]=Math.min(t,P.sel[1]-.05); P.ring=0; }
  else if(drag.k==="s1"){ P.sel[1]=Math.max(t,P.sel[0]+.05); P.ring=0; }
  else if(drag.k==="mv"){ var a=Math.max(0,Math.min(T()-drag.len,t-drag.d)); P.sel=[a,a+drag.len]; }
  else { var a2=Math.min(drag.t0,t), b2=Math.max(drag.t0,t); if(P.ring){ a2=Math.min(drag.t0,T()-P.ring); b2=a2+P.ring; } P.sel=[a2,b2]; }
  fixSel(); draw(); timeUi(); if(play.on&&play.loop&&drag.k==="mv") {} });
wave.addEventListener("pointerup",function(e){ if(!drag) return; var k=drag.k, moved=drag.moved; drag=null;
  if(!moved){ var r=wc.getBoundingClientRect(), t=Math.max(0,Math.min(T(),tOf(e.clientX-r.left)));
    if(k==="new"&&P.ring){ remember(); var a=Math.min(t,Math.max(0,T()-P.ring)); P.sel=[a,a+P.ring]; P.scope="sel"; }
    else if(k==="new"&&P.sel){ remember(); P.sel=null; if(P.scope==="sel") P.scope="all"; }
    seek(t); }
  else if(play.on) restartPlay();
  fixSel(); draw(); timeUi(); save(); if(!wide.matches&&ui.sheet==="insp"||wide.matches) refreshInsp(); });
wave.addEventListener("wheel",function(e){ if(!MIX) return; e.preventDefault(); var z=$("#zoom");
  if(e.ctrlKey||Math.abs(e.deltaY)>Math.abs(e.deltaX)&&!e.shiftKey){ var r=wc.getBoundingClientRect(), t=tOf(e.clientX-r.left), x=e.clientX-r.left; z.value=Math.max(0,Math.min(100,+z.value-(e.deltaY>0?5:-5))); V.len=viewLen(); V.t0=t-x/wc.clientWidth*V.len; }
  else V.t0+=(e.deltaX||e.deltaY)/wc.clientWidth*V.len;
  draw(); },{passive:false});
$("#zoom").oninput=function(){ var c=P&&P.sel?(P.sel[0]+P.sel[1])/2:posNow(); V.len=viewLen(); V.t0=c-V.len/2; draw(); };
$("#scroll").oninput=function(){ V.t0=(+this.value/1000)*Math.max(0,T()-V.len); draw(); };
if(window.ResizeObserver) new ResizeObserver(function(){ if(P) draw(); }).observe(wave);

/* ═══════════ игра ═══════════ */
var cur=0;
function posNow(){ if(!play.on) return cur; return Math.min(play.to,play.from+(AC.currentTime-play.t0)); }
function seek(t){ cur=t; if(play.on) restartPlay(); draw(); timeUi(); }
function startPlay(from){
  if(!MIX) return; var a=ac(), sc=scope(), loop=$("#loopBtn").classList.contains("on")&&P.sel, to=loop?P.sel[1]:T();
  if(loop&&(from<P.sel[0]||from>=P.sel[1]-.02)) from=P.sel[0]; if(!loop&&from>=T()-.02) from=0;
  var src=a.createBufferSource(), g=a.createGain(), now=a.currentTime+.03; src.buffer=MIX; src.connect(g); g.connect(a.destination);
  /* плавные края при игре: те же, что попадут в файл */
  var at=function(t){ return now+(t-from); };
  g.gain.setValueAtTime(fadeK(from,sc),now);
  if(P.fadeIn>0&&from<sc[0]+P.fadeIn&&from>=sc[0]) g.gain.linearRampToValueAtTime(1,at(sc[0]+P.fadeIn));
  if(P.fadeOut>0&&to>sc[1]-P.fadeOut&&from<=sc[1]){ var fs=Math.max(from,sc[1]-P.fadeOut); g.gain.setValueAtTime(fadeK(fs,sc),at(fs)); g.gain.linearRampToValueAtTime(0,at(sc[1])); if(to>sc[1]) g.gain.setValueAtTime(1,at(sc[1])+.001); }
  src.start(now,from,Math.max(.01,to-from));
  play={ on:true, src:src, from:from, to:to, t0:now, loop:loop };
  src.onended=function(){ if(play.src!==src) return; if(play.loop&&$("#loopBtn").classList.contains("on")&&P.sel){ startPlay(P.sel[0]); } else { cur=play.on?play.to:cur; if(cur>=T()-.05) cur=P.sel?P.sel[0]:0; play.on=false; playUi(); draw(); timeUi(); } };
  playUi(); tick(); }
function stopPlay(){ if(play.on){ cur=posNow(); var s=play.src; play.on=false; play.src=null; try{ s.stop(); }catch(e){} } playUi(); draw(); timeUi(); }
function restartPlay(){ var t=posNow(); stopPlay(); startPlay(t); }
function playUi(){ $("#playBtn").classList.toggle("on",!!play.on); }
var tickR=0; function tick(){ cancelAnimationFrame(tickR); if(!play.on) return; var p=posNow();
  if(p>V.t0+V.len||p<V.t0){ V.t0=p-V.len*.1; } draw(); timeUi(); tickR=requestAnimationFrame(tick); }
$("#playBtn").onclick=function(){ if(play.on) stopPlay(); else startPlay(cur); };
$("#loopBtn").onclick=function(){ this.classList.toggle("on"); try{ localStorage.setItem("forge_zvuk_loop",this.classList.contains("on")?"1":"0"); }catch(e){} if(play.on) restartPlay(); };
try{ if(localStorage.getItem("forge_zvuk_loop")!=="0") $("#loopBtn").classList.add("on"); }catch(e){}
$("#backBtn").onclick=function(){ seek(P&&P.sel?P.sel[0]:0); };
$("#fwdBtn").onclick=function(){ seek(P&&P.sel?Math.max(P.sel[0],P.sel[1]-3):Math.max(0,T()-3)); };

/* ═══════════ куски ═══════════ */
var selClip=-1;
function clipsUi(){ var box=$("#clips"); box.innerHTML=""; if(!P) return;
  P.clips.forEach(function(c,i){ var L=clipLen(c), n=el('<button class="clip'+(i===selClip?" on":"")+'" style="width:'+Math.round(Math.max(84,Math.min(260,60+L*1.2)))+'px"><canvas></canvas><b data-nt></b><small>'+tm(L)+'</small></button>');
    $("b",n).textContent=c.name; box.appendChild(n);
    n.onclick=function(){ selClip=i; var a=clipStart(i); P.sel=[a,a+L]; P.ring=0; fixSel(); draw(); timeUi(); clipsUi(); refresh(); };
    decode(c.aid).then(function(b){ mini($("canvas",n),b,c,["#4fd6c8","#ff9a4d","#a78bfa","#ff5fa2","#7ee8d1"][i%5]); }).catch(function(){}); });
  box.appendChild(el('<button class="clip add" title="'+esc(TR("Добавить файл"))+'">+</button>',function(n){ n.onclick=pickFile; })); }
function mini(cv,b,c,col){ var w=cv.clientWidth, h=cv.clientHeight, d=Math.min(2,devicePixelRatio||1); cv.width=w*d; cv.height=h*d; var g=cv.getContext("2d"); g.scale(d,d); g.fillStyle=col;
  var a=b.getChannelData(0), L=segLen(c), n=Math.max(1,Math.floor(w/2));
  for(var i=0;i<n;i++){ var q=i/n*L, pos=0, st=0; for(var k=0;k<c.segs.length;k++){ var s=c.segs[k], sl=s[1]-s[0]; if(q<pos+sl){ st=s[0]+(q-pos); break; } pos+=sl; }
    var s0=Math.floor(st*b.sampleRate), m=0; for(var j=s0;j<Math.min(a.length,s0+Math.floor(b.sampleRate*L/n));j+=64){ var v=Math.abs(a[j]); if(v>m) m=v; } g.fillRect(i*2,h/2-m*h/2,1.4,Math.max(1,m*h)); } }
function moveClip(i,d){ var j=i+d; if(j<0||j>=P.clips.length) return; remember(); var t=P.clips[i]; P.clips[i]=P.clips[j]; P.clips[j]=t; selClip=j; P.sel=null; P.scope="all"; render(); save(); refresh(); }
function delClip(i){ remember(); P.clips.splice(i,1); selClip=-1; P.sel=null; P.scope="all"; render(); save(); refresh(); }

/* ═══════════ файлы и запись ═══════════ */
function pickFile(){ var f=$("#fIn"); f.value=""; f.onchange=function(){ addFiles([].slice.call(f.files)); }; f.click(); }
function addFiles(files){ if(!files.length) return;
  var go=function(){ var chain2=Promise.resolve(); files.forEach(function(file){ chain2=chain2.then(function(){ return addBlob(file,file.name.replace(/\.[^.]+$/,"")); }); }); return chain2.then(function(){
    if(ringNext){ ringNext=false; return doRender().then(function(){ if(MIX){ ringAt(30); if(!wide.matches) openInsp(); } }).then(function(){ save(); refresh(); }); }
    render(); save(); refresh(); }); };
  if(!P){ var p=newProject(files[0].name.replace(/\.[^.]+$/,"")); create(p).then(go); } else go(); }
function addBlob(blob,name){
  if(blob.size>120*1024*1024){ toast(TR("Файл больше 120 МБ, браузер может не справиться")); }
  var aid=newId("a"); toast(TR("Открываю файл..."));
  return bPut(aid,blob).then(function(){ return decode(aid); }).then(function(b){ remember(); P.clips.push({ id:newId("c"), aid:aid, name:name||TR("Кусок"), dur:b.duration, segs:[[0,b.duration]] });
    if(P.clips.length===1&&(!P.title||P.title===TR("Новый звук"))){ P.title=name; $("#title").value=name; } toast(TR("Добавлено: {0}",name)); })
  .catch(function(){ tx("blobs","readwrite",function(s){ s.delete(aid); }).catch(function(){}); toast(TR("Этот файл браузер прочитать не смог")); }); }
/* перетаскивание файла в окно */
var dropN=0;
addEventListener("dragenter",function(e){ if(e.dataTransfer&&[].indexOf.call(e.dataTransfer.types||[],"Files")>=0){ dropN++; $("#drop").classList.add("on"); } });
addEventListener("dragleave",function(){ if(--dropN<=0){ dropN=0; $("#drop").classList.remove("on"); } });
addEventListener("dragover",function(e){ e.preventDefault(); });
addEventListener("drop",function(e){ e.preventDefault(); dropN=0; $("#drop").classList.remove("on"); var f=[].slice.call(e.dataTransfer.files||[]).filter(function(x){ return /^(audio|video)\//.test(x.type)||/\.(mp3|wav|ogg|m4a|flac|aac|webm|opus)$/i.test(x.name); });
  if(!f.length) return; if($("#ed").hidden) addFiles(f); else addFiles(f); });

function record(){
  if(!navigator.mediaDevices||!window.MediaRecorder){ toast(TR("Этот браузер не умеет записывать звук")); return; }
  stopPlay();
  navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true}}).then(function(stream){
    var rec=new MediaRecorder(stream), parts=[], t0=Date.now(), a=ac(), an=a.createAnalyser(), srcN=a.createMediaStreamSource(stream), data=new Uint8Array(512), raf=0, cancel=false; an.fftSize=1024; srcN.connect(an);
    modal('<div class="recbox"><h3><span class="recdot"></span>'+esc(TR("Идёт запись"))+'</h3><div class="rt" id="rT">0:00</div><div class="lv"><i id="rL"></i></div><div class="row"><button class="btn" id="rX">Отмена</button><button class="btn go" id="rS">Остановить</button></div><p class="note" style="margin-top:10px">Запись добавится новым куском в конец.</p></div>');
    (function loop(){ an.getByteTimeDomainData(data); var m=0; for(var i=0;i<data.length;i++){ var v=Math.abs(data[i]-128); if(v>m) m=v; } var rl=$("#rL"); if(rl) rl.style.width=Math.min(100,m/128*140)+"%"; var rt=$("#rT"); if(rt) rt.textContent=tm((Date.now()-t0)/1000,0); raf=requestAnimationFrame(loop); })();
    rec.ondataavailable=function(e){ if(e.data&&e.data.size) parts.push(e.data); };
    rec.onstop=function(){ cancelAnimationFrame(raf); stream.getTracks().forEach(function(t){ t.stop(); }); try{ srcN.disconnect(); }catch(e){} closeModal();
      if(cancel||!parts.length) return; var blob=new Blob(parts,{type:rec.mimeType||"audio/webm"}), nm=TR("Запись {0}",new Date().toLocaleTimeString(window.FLANG||"ru",{hour:"2-digit",minute:"2-digit"}));
      var go=function(){ return addBlob(blob,nm).then(function(){ render(); save(); refresh(); }); };
      if(!P){ create(newProject(nm)).then(go); } else go(); };
    $("#rS").onclick=function(){ rec.stop(); }; $("#rX").onclick=function(){ cancel=true; rec.stop(); };
    rec.start(250);
  }).catch(function(){ toast(TR("Нет доступа к микрофону. Разрешите его в настройках браузера")); });
}
$("#recBtn").onclick=record;

/* ═══════════ правки ═══════════ */
function needSel(){ if(!P.sel){ toast(TR("Сначала выделите кусок на волне: проведите по ней пальцем или мышкой")); return false; } return true; }
function doKeep(){ if(!needSel()) return; remember(); keepRange(P.sel[0],P.sel[1]); P.sel=null; P.scope="all"; P.ring=0; cur=0; V.t0=0; render(); save(); refresh(); toast(TR("Осталось только выделенное")); }
function doCut(){ if(!needSel()) return; remember(); var a=P.sel[0]; cutRange(P.sel[0],P.sel[1]); P.sel=null; P.scope="all"; cur=a; render(); save(); refresh(); toast(TR("Кусок вырезан")); }
/* убрать тишину: ищем по готовому звуку места тише порога дольше 0.6 с и вырезаем их, оставляя короткие паузы */
function doSilence(){ if(!MIX) return; var a=MIX.getChannelData(0), b=MIX.numberOfChannels>1?MIX.getChannelData(1):a, win=Math.floor(SR*.02), thr=Math.pow(10,-42/20), quiet=[], start=-1, Tt=T();
  for(var i=0;i*win<Math.min(a.length,Tt*SR);i++){ var s=0, e=Math.min(a.length,(i+1)*win); for(var j=i*win;j<e;j+=2){ s+=a[j]*a[j]+b[j]*b[j]; } var rms=Math.sqrt(s/((e-i*win)/2*2)), t=i*win/SR;
    if(rms<thr){ if(start<0) start=t; } else if(start>=0){ quiet.push([start,t]); start=-1; } }
  if(start>=0) quiet.push([start,Tt]);
  var keep=.18, rm=quiet.filter(function(q){ return q[1]-q[0]>.6; }).map(function(q){ return [q[0]===0?0:q[0]+keep,q[1]>=Tt-.01?Tt:q[1]-keep]; }).filter(function(q){ return q[1]-q[0]>.05; });
  if(!rm.length){ toast(TR("Длинных пауз не нашлось")); return; }
  remember(); var cutT=0; for(var k=rm.length-1;k>=0;k--){ cutRange(rm[k][0],rm[k][1]); cutT+=rm[k][1]-rm[k][0]; }
  P.sel=null; P.scope="all"; cur=0; render(); save(); refresh(); toast(TR("Убрано пауз: {0}, это {1}",rm.length,sec(cutT))); }
function normalize(){ if(!PK||PK.peak<=0) return; remember(); P.gain=Math.max(-30,Math.min(30,Math.round((P.gain+(-1-peakDb()))*10)/10)); render(); save(); toast(TR("Громкость выровнена: пик -1 дБ")); setTimeout(refresh,400); }
/* рингтон: выделение заданной длины на самом громком месте (обычно это припев) */
function ringAt(len){ if(!MIX) return; remember(); P.ring=len; P.scope="sel";
  var Tt=T(); if(Tt<=len){ P.sel=[0,Tt]; } else if(P.sel&&P.sel[0]+len<=Tt){ P.sel=[P.sel[0],P.sel[0]+len]; }
  else { var best=0, bt=0, step=1, n=Math.floor(Tt); var e=[]; for(var s=0;s<n;s++){ var a0=Math.floor(s*SR/BK), a1=Math.floor((s+1)*SR/BK), m=0; for(var k=a0;k<Math.min(PK.mx.length,a1);k++){ m+=PK.mx[k]-PK.mn[k]; } e.push(m); }
    var sums=[]; for(var t=0;t+len<=Tt;t+=step){ var sum=0; for(var q=Math.floor(t);q<Math.min(e.length,Math.floor(t+len));q++) sum+=e[q]; sums.push([t,sum]); if(sum>best) best=sum; }
    /* из почти равных окон берём то, где громко уже в первые секунды: рингтон начнётся с припева, а не с тишины перед ним */
    var hd=-1; sums.forEach(function(w){ if(w[1]<best*.98) return; var h=0; for(var q=Math.floor(w[0]);q<Math.min(e.length,Math.floor(w[0])+4);q++) h+=e[q]; if(h>hd){ hd=h; bt=w[0]; } });
    P.sel=[bt,bt+len]; }
  if(!P.fadeIn) P.fadeIn=1; if(!P.fadeOut) P.fadeOut=2; fixSel(); cur=P.sel[0]; V.len=viewLen(); V.t0=Math.max(0,P.sel[0]-V.len*.1); draw(); timeUi(); save(); refresh(); }

/* ═══════════ сохранение файла ═══════════ */
/* iPhone понимает рингтон только в AAC. Просто audio/mp4 в некоторых браузерах даёт opus внутри, такой файл телефон не возьмёт, поэтому спрашиваем кодек явно */
var M4R=(function(){ if(!window.MediaRecorder||!MediaRecorder.isTypeSupported) return ""; var l=['audio/mp4;codecs=mp4a.40.2','audio/mp4;codecs="mp4a.40.2"','audio/mp4;codecs=aac'];
  for(var i=0;i<l.length;i++) if(MediaRecorder.isTypeSupported(l[i])) return l[i]; return ""; })();
function slice(){ var sc=scope(), a=Math.floor(sc[0]*SR), b=Math.min(MIX.length,Math.floor(sc[1]*SR)+(sc[1]>=T()-.01?MIX.length:0)), n=Math.max(1,Math.min(MIX.length,b)-a), ch=P.mono?1:2, out=[];
  if(sc[1]>=T()-.01) n=MIX.length-a;
  for(var c=0;c<ch;c++) out.push(new Float32Array(n));
  var L=MIX.getChannelData(0), R=MIX.numberOfChannels>1?MIX.getChannelData(1):L, fi=P.fadeIn*SR, fo=P.fadeOut*SR, endS=Math.floor((sc[1]-sc[0])*SR);
  for(var i=0;i<n;i++){ var k=1; if(fi>0&&i<fi) k=i/fi; if(fo>0&&i>endS-fo) k=Math.min(k,Math.max(0,(endS-i)/fo)); if(i>endS) k=0;
    var l=L[a+i]*k, r=R[a+i]*k; if(ch===1) out[0][i]=(l+r)/2; else { out[0][i]=l; out[1][i]=r; } }
  if(sc[1]<T()-.01||P.fadeOut>0){ var cut=Math.min(n,endS+1); out=out.map(function(x){ return x.subarray(0,cut); }); }
  return out; }
function wav(chs){ var n=chs[0].length, ch=chs.length, buf=new ArrayBuffer(44+n*ch*2), v=new DataView(buf), p=0;
  function s(t){ for(var i=0;i<t.length;i++) v.setUint8(p++,t.charCodeAt(i)); } function u32(x){ v.setUint32(p,x,true); p+=4; } function u16(x){ v.setUint16(p,x,true); p+=2; }
  s("RIFF"); u32(36+n*ch*2); s("WAVE"); s("fmt "); u32(16); u16(1); u16(ch); u32(SR); u32(SR*ch*2); u16(ch*2); u16(16); s("data"); u32(n*ch*2);
  for(var i=0;i<n;i++) for(var c=0;c<ch;c++){ var x=Math.max(-1,Math.min(1,chs[c][i])); v.setInt16(p,x<0?x*32768:x*32767,true); p+=2; }
  return new Blob([buf],{type:"audio/wav"}); }
var lameP=null; function lame(){ if(lameP) return lameP; lameP=new Promise(function(res,rej){ var s=document.createElement("script"); s.src="lib/lame.min.js"; s.onload=res; s.onerror=function(){ lameP=null; rej(); }; document.head.appendChild(s); }); return lameP; }
function mp3(chs,kbps,prog){ return lame().then(function(){ return new Promise(function(res){
  var ch=chs.length, enc=new lamejs.Mp3Encoder(ch,SR,kbps), n=chs[0].length, I=chs.map(function(c){ var o=new Int16Array(c.length); for(var i=0;i<c.length;i++){ var x=Math.max(-1,Math.min(1,c[i])); o[i]=x<0?x*32768:x*32767; } return o; }), out=[], i=0, B=1152*40;
  (function step(){ var end=Math.min(n,i+B); for(;i<end;i+=1152){ var l=I[0].subarray(i,Math.min(n,i+1152)), r=ch>1?I[1].subarray(i,Math.min(n,i+1152)):null, m=ch>1?enc.encodeBuffer(l,r):enc.encodeBuffer(l); if(m.length) out.push(new Uint8Array(m)); }
    prog(i/n); if(i<n) setTimeout(step,0); else { var f=enc.flush(); if(f.length) out.push(new Uint8Array(f)); res(new Blob(out,{type:"audio/mpeg"})); } })(); }); }); }
/* рингтон для iPhone: браузер сам кодирует AAC, это идёт в реальном времени */
function m4r(chs,prog){ return new Promise(function(res,rej){ var a=new (window.AudioContext||window.webkitAudioContext)({sampleRate:SR}), b=a.createBuffer(chs.length,chs[0].length,SR);
  chs.forEach(function(c,i){ b.copyToChannel(c,i); }); var s=a.createBufferSource(), d=a.createMediaStreamDestination(); s.buffer=b; s.connect(d);
  var rec=new MediaRecorder(d.stream,{mimeType:M4R}), parts=[], t0=0, iv=0; rec.ondataavailable=function(e){ if(e.data.size) parts.push(e.data); };
  rec.onstop=function(){ clearInterval(iv); a.close(); res(new Blob(parts,{type:"audio/mp4"})); };
  rec.start(); s.start(); t0=a.currentTime; s.onended=function(){ setTimeout(function(){ rec.stop(); },150); }; iv=setInterval(function(){ prog((a.currentTime-t0)/b.duration); },200); }); }
/* имя файла латиницей: некоторые браузеры не принимают кириллицу в имени скачиваемого файла и называют его «download» */
function latin(s){ var m={а:"a",б:"b",в:"v",г:"g",д:"d",е:"e",ё:"e",ж:"zh",з:"z",и:"i",й:"y",к:"k",л:"l",м:"m",н:"n",о:"o",п:"p",р:"r",с:"s",т:"t",у:"u",ф:"f",х:"h",ц:"ts",ч:"ch",ш:"sh",щ:"sch",ъ:"",ы:"y",ь:"",э:"e",ю:"yu",я:"ya",і:"i",ї:"yi",є:"ye",ł:"l",ß:"ss"};
  return String(s||"").toLowerCase().split("").map(function(c){ return m[c]!=null?m[c]:c; }).join("").normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"").slice(0,40); }
function fname(){ return latin(P.title)||"zvuk"; }
function dl(blob,name){ var a=document.createElement("a"); a.href=URL.createObjectURL(blob); a.download=name; document.body.appendChild(a); a.click(); setTimeout(function(){ URL.revokeObjectURL(a.href); a.remove(); },3000); }
function estSize(){ var sc=scope(), L=sc[1]-sc[0], ch=P.mono?1:2; if(P.fmt==="wav") return L*SR*ch*2; if(P.fmt==="m4r") return L*16000; return L*(P.fmt==="mp3128"?128:192)*125; }
function kb(b){ return b>1048576?(b/1048576).toFixed(1)+" "+TR("МБ"):Math.round(b/1024)+" "+TR("КБ"); }
function exportFile(){
  if(!MIX){ toast(TR("Сначала добавьте звук")); return; } stopPlay();
  modal('<h3>Сохраняю файл</h3><div class="prog"><i id="pg"></i></div><p class="note" id="pgT"></p>');
  var chs=slice(), f=P.fmt, prog=function(p){ var g=$("#pg"); if(g) g.style.width=Math.round(Math.min(1,p)*100)+"%"; };
  $("#pgT").textContent=f==="m4r"?TR("Для iPhone файл собирается в реальном времени, это займёт {0}.",sec(chs[0].length/SR)):TR("Пара секунд...");
  var job=f==="wav"?Promise.resolve(wav(chs)):f==="m4r"?m4r(chs,prog):mp3(chs,f==="mp3128"?128:192,prog);
  setTimeout(function(){ job.then(function(blob){ closeModal(); var ext=f==="wav"?"wav":f==="m4r"?"m4r":"mp3"; dl(blob,fname()+(P.scope==="sel"?"-"+Math.round(chs[0].length/SR)+"s":"")+"."+ext); toast(TR("Файл сохранён: {0}",kb(blob.size))); })
    .catch(function(){ closeModal(); toast(TR("Не получилось сохранить файл")); }); },50); }
$("#saveBtn").onclick=function(){ if(wide.matches) exportFile(); else openTab("save"); };

/* ═══════════ отмена ═══════════ */
var U=[], Rd=[];
function snap(){ return JSON.stringify({ clips:P.clips, gain:P.gain, speed:P.speed, fx:P.fx, mono:P.mono, fadeIn:P.fadeIn, fadeOut:P.fadeOut, scope:P.scope, sel:P.sel, ring:P.ring }); }
function remember(){ U.push(snap()); if(U.length>80) U.shift(); Rd=[]; undoBtns(); }
function undoBtns(){ $("#undo").disabled=!U.length; $("#redo").disabled=!Rd.length; }
function restoreS(s){ var o=JSON.parse(s); for(var k in o) P[k]=o[k]; undoBtns(); selClip=-1; render(); save(); refresh(); }
$("#undo").onclick=function(){ if(!U.length) return; Rd.push(snap()); restoreS(U.pop()); };
$("#redo").onclick=function(){ if(!Rd.length) return; U.push(snap()); restoreS(Rd.pop()); };
var saveT=0; function save(){ clearTimeout(saveT); saveT=setTimeout(function(){ if(!P) return; P.updated=Date.now(); pPut(JSON.parse(JSON.stringify(P))).catch(function(){ toast(TR("Не получилось сохранить: память браузера заполнена")); }); },400); }
/* маленькая волна для списка «Мои звуки» */
function thumbSave(){ if(!PK) return; var n=60, th=[], per=Math.max(1,Math.floor(PK.mx.length/n)); for(var i=0;i<n;i++){ var m=0; for(var k=i*per;k<Math.min(PK.mx.length,(i+1)*per);k++){ var v=Math.max(PK.mx[k],-PK.mn[k]); if(v>m) m=v; } th.push(Math.round(m*100)/100); } P.th=th; P.len=Math.round(T()*10)/10; save(); }

/* ═══════════ панели ═══════════ */
var pane=$("#pane"), insp=$("#insp"), right=$("#right"), ui={ tab:null, sheet:false };
var TTL={ edit:"Правка", snd:"Звук", save:"Сохранить", more:"Ещё" };
function tabBox(){ return wide.matches?pane:insp; }
function openTab(t){ if(t==="save"){ openInsp(); return; }
  ui.tab=t; $$("#tabs button").forEach(function(b){ b.classList.toggle("on",b.getAttribute("data-tab")===t); });
  if(!wide.matches){ ui.sheet="tab"; right.classList.add("open"); right.classList.remove("full","peek"); $("#shTitle").textContent=TR(TTL[t]); }
  refreshPane(); tabBox().scrollTop=0; }
function openInsp(){ if(!wide.matches){ ui.sheet="insp"; right.classList.add("open"); right.classList.remove("full","peek"); $$("#tabs button").forEach(function(b){ b.classList.toggle("on",b.getAttribute("data-tab")==="save"); }); ui.tab=null; $("#shTitle").textContent=TR("Сохранить"); }
  refreshInsp(); insp.scrollTop=0; }
function closeSheet(){ if(wide.matches) return; ui.sheet=false; ui.tab=null; right.classList.remove("open","full","peek"); $$("#tabs button").forEach(function(b){ b.classList.remove("on"); }); }
$("#shClose").onclick=closeSheet;
$$("#tabs button").forEach(function(b){ b.onclick=function(){ var t=b.getAttribute("data-tab"); if(!wide.matches&&((ui.sheet==="tab"&&ui.tab===t)||(t==="save"&&ui.sheet==="insp"))) closeSheet(); else openTab(t); }; });
(function(){ var h=$(".sh-h"), y0=0, h0=0, on=false;
  h.addEventListener("pointerdown",function(e){ if(wide.matches||e.target.closest("button")) return; on=true; y0=e.clientY; h0=right.getBoundingClientRect().height; right.style.transition="none"; try{ h.setPointerCapture(e.pointerId); }catch(x){} });
  h.addEventListener("pointermove",function(e){ if(on) right.style.height=Math.max(80,h0-(e.clientY-y0))+"px"; });
  h.addEventListener("pointerup",function(e){ if(!on) return; on=false; right.style.transition=""; var nh=h0-(e.clientY-y0), vh=innerHeight; right.style.height=""; right.classList.remove("full","peek");
    if(nh<vh*.2) closeSheet(); else if(nh<vh*.42) right.classList.add("peek"); else if(nh>vh*.65) right.classList.add("full"); });
})();
/* класс на редакторе повторяет состояние шторки, по нему css поднимает волну над ней */
new MutationObserver(function(){ var e=$("#ed"); e.classList.toggle("so",right.classList.contains("open")&&!right.classList.contains("full")); e.classList.toggle("pk",right.classList.contains("peek")); setTimeout(draw,240); }).observe(right,{attributes:true,attributeFilter:["class"]});
wide.addEventListener("change",function(){ right.classList.remove("open"); ui.sheet=false; if(wide.matches) openTab(ui.tab||"edit"); refreshInsp(); draw(); });
function refresh(){ refreshPane(); refreshInsp(); }
function refreshPane(){ if(!ui.tab||!P) return; if(!wide.matches&&ui.sheet!=="tab") return; var box=tabBox(), sc=box.scrollTop; box.innerHTML="";
  ({ edit:paneEdit, snd:paneSnd, more:paneMore })[ui.tab](box); box.scrollTop=sc; }
function tool(icon,name,sub,fn,cls){ return el('<button class="ztool'+(cls?" "+cls:"")+'"><span class="ic">'+sv(icon)+'</span><span>'+esc(name)+'<small>'+esc(sub)+'</small></span></button>',function(n){ n.onclick=fn; }); }
function paneEdit(box){
  box.appendChild(sh("Правка"));
  box.appendChild(tool("keep","Оставить выделенное","обрезать всё, что вокруг",doKeep));
  box.appendChild(tool("cut","Вырезать кусок","убрать выделенное из середины",doCut));
  box.appendChild(tool("fade","Плавное начало и конец","тяните розовые точки на волне",function(){ remember(); if(!P.fadeIn) P.fadeIn=1; if(!P.fadeOut) P.fadeOut=2; fixSel(); draw(); save(); refreshInsp(); if(!wide.matches) openInsp(); }));
  box.appendChild(tool("sil","Убрать тишину","паузы в начале, конце и между фразами",doSilence));
  box.appendChild(tool("ring","Рингтон","30 секунд с самого громкого места",function(){ ringAt(30); if(!wide.matches) openInsp(); }));
  box.appendChild(sh("Куски"));
  if(selClip>=0&&P.clips[selClip]){ var c=P.clips[selClip];
    box.appendChild(el('<div class="li"><div class="lh"><b data-nt></b><button data-a="l" title="'+esc(TR("Раньше"))+'">'+sv("l")+'</button><button data-a="r" title="'+esc(TR("Позже"))+'">'+sv("r")+'</button><button data-a="x" title="'+esc(TR("Удалить кусок"))+'">'+sv("x")+'</button></div></div>',function(n){
      $("b",n).textContent=c.name; $("[data-a=l]",n).onclick=function(){ moveClip(selClip,-1); }; $("[data-a=r]",n).onclick=function(){ moveClip(selClip,1); }; $("[data-a=x]",n).onclick=function(){ delClip(selClip); }; })); }
  else box.appendChild(el('<p class="note" style="margin-bottom:8px">Нажмите на кусок под волной, чтобы выделить его, поменять местами или убрать.</p>'));
  box.appendChild(tool("mic","Записать с микрофона","новый кусок в конец",record,"red"));
  box.appendChild(tool("add","Ещё файл","склеить треки по очереди",pickFile));
}
function paneSnd(box){
  box.appendChild(sh("Громкость"));
  var pk=peakDb();
  box.appendChild(range(TR("Громкость"),P.gain,-20,20,.5,function(v){ return (v>0?"+":"")+v+" "+TR("дБ"); },function(v){ P.gain=v; },function(){ remember(); render(); save(); }));
  box.appendChild(el('<div><div class="meter"><i style="left:'+Math.max(0,Math.min(100,(pk+30)/30*100))+'%"></i></div><div class="mnote'+(pk>-.1?" bad":"")+'">'+esc(pk>-.1?TR("пик {0} дБ: громче нельзя, звук будет хрипеть",pk.toFixed(1)):TR("пик {0} дБ",pk>-90?pk.toFixed(1):"-"))+'</div></div>'));
  box.appendChild(el('<button class="btn w">Выровнять громкость<small>до -1 дБ</small></button>',function(n){ n.onclick=normalize; }));
  box.appendChild(sh("Скорость"));
  box.appendChild(choice("",[["0.5","0.5x"],["0.75","0.75x"],["1","1x"],["1.25","1.25x"],["1.5","1.5x"],["2","2x"]],String(P.speed),function(v){ remember(); var k=P.speed/ +v; P.speed=+v; if(P.sel) P.sel=[P.sel[0]*k,P.sel[1]*k]; cur*=k; render(); save(); }));
  box.appendChild(el('<p class="note" style="margin:-4px 0 10px">Быстрее звучит выше, медленнее ниже, как на пластинке.</p>'));
  box.appendChild(sh("Эффект"));
  box.appendChild(choice("",Object.keys(FX).map(function(k){ return [k,TR(FX[k])]; }),P.fx,function(v){ remember(); P.fx=v; render(); save(); }));
}
function paneMore(box){
  box.appendChild(el('<div class="f"><label>Название</label><input type="text" maxlength="80"></div>',function(n){ var i=$("input",n); i.value=P.title||""; i.oninput=function(){ P.title=i.value; $("#title").value=i.value; save(); }; }));
  box.appendChild(el('<button class="btn w">Сделать копию</button>',function(n){ n.onclick=function(){ var c=JSON.parse(JSON.stringify(P)); c.id=newId(); c.title=TR("{0} (копия)",P.title||""); c.updated=Date.now(); pPut(c).then(function(){ openP(c); toast(TR("Открыта копия")); }); }; }));
  box.appendChild(el('<button class="btn w del">Удалить звук</button>',function(n){ n.onclick=function(){ ask(TR("Удалить «{0}»? Вернуть не получится.",P.title||""),TR("Удалить")).then(function(y){ if(y){ var p=P; stopPlay(); pDel(p).then(function(){ P=null; showHome(); }); } }); }; }));
  box.appendChild(el('<p class="note" style="margin-top:8px">Звук и все правки сохраняются в этом браузере сами. Исходный файл не меняется: любую правку можно отменить.</p>'));
}
function refreshInsp(){
  if(!P) return; if(!wide.matches&&ui.sheet!=="insp") return; var sc0=insp.scrollTop; insp.innerHTML="";
  if(wide.matches) $("#shTitle").textContent=TR("Сохранить");
  insp.appendChild(choice(TR("Что сохраняем"),[["all",TR("весь трек")],["sel",TR("выделенное"),!P.sel]],P.sel?P.scope:"all",function(v){ remember(); P.scope=v; fixSel(); draw(); save(); refreshInsp(); }));
  insp.appendChild(choice(TR("Рингтон"),[["15","15 "+TR("с")],["30","30 "+TR("с")],["40","40 "+TR("с")],["0",TR("своя длина")]],String(P.ring||0),function(v){ if(+v) ringAt(+v); else { P.ring=0; save(); } }));
  if(P.ring) insp.appendChild(el('<p class="note" style="margin:-4px 0 12px">Двигайте выделение по волне: оно играет по кругу. Длина держится, пока сами не потянете край.</p>'));
  var sc=scope(), half=Math.max(.5,(sc[1]-sc[0])/2);
  insp.appendChild(range(TR("Плавное начало"),Math.round(Math.min(P.fadeIn,half)*10)/10,0,Math.min(10,Math.floor(half*10)/10),.1,function(v){ return sec(v); },function(v){ P.fadeIn=v; draw(); },function(){ remember(); save(); if(play.on) restartPlay(); }));
  insp.appendChild(range(TR("Плавный конец"),Math.round(Math.min(P.fadeOut,half)*10)/10,0,Math.min(10,Math.floor(half*10)/10),.1,function(v){ return sec(v); },function(v){ P.fadeOut=v; draw(); },function(){ remember(); save(); if(play.on) restartPlay(); }));
  insp.appendChild(toggle(TR("Моно (файл меньше)"),!!P.mono,function(v){ P.mono=v; save(); refreshInsp(); }));
  insp.appendChild(sh("Формат"));
  insp.appendChild(choice("",[["mp3192","MP3 192"],["mp3128","MP3 128"],["wav","WAV"],["m4r",TR("для iPhone"),!M4R]],P.fmt,function(v){ P.fmt=v; save(); refreshInsp(); }));
  if(!M4R) insp.appendChild(el('<p class="note" style="margin:-4px 0 10px">Рингтон для iPhone (m4r) этот браузер собрать не умеет. Обычно это получается в Safari на iPhone или Mac.</p>'));
  var L=sc[1]-sc[0];
  insp.appendChild(el('<button class="btn go w" style="justify-content:center">'+esc(P.ring?TR("Скачать рингтон"):TR("Скачать файл"))+'<small style="margin-left:8px;color:#06231f">'+tm(L)+' · ~'+kb(estSize())+'</small></button>',function(n){ n.onclick=exportFile; n.disabled=!MIX; }));
  insp.appendChild(el('<p class="note">Звук обрабатывается на этом устройстве, файл никуда не отправляется.</p>'));
  insp.scrollTop=sc0;
}

/* ═══════════ окна, клавиши ═══════════ */
function modal(h){ $("#mbox").innerHTML=h; $("#modal").classList.add("on"); }
function closeModal(){ $("#modal").classList.remove("on"); }
$("#modal").addEventListener("click",function(e){ if(e.target.hasAttribute("data-close")) closeModal(); });
function ask(text,ok){ return new Promise(function(res){ modal('<h3>'+esc(text)+'</h3><div class="row"><button class="btn" data-n>Отмена</button><button class="btn go" data-y>'+esc(ok)+'</button></div>');
  $("#mbox [data-n]").onclick=function(){ closeModal(); res(false); }; $("#mbox [data-y]").onclick=function(){ closeModal(); res(true); }; }); }
var tT=0; function toast(t){ var e=$("#toast"); e.textContent=t; e.classList.add("on"); clearTimeout(tT); tT=setTimeout(function(){ e.classList.remove("on"); },2800); }
addEventListener("keydown",function(e){
  if($("#ed").hidden||$("#modal").classList.contains("on")) return;
  if(/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) return;
  var k=e.key.toLowerCase();
  if((e.ctrlKey||e.metaKey)&&k==="z"){ e.preventDefault(); $(e.shiftKey?"#redo":"#undo").click(); return; }
  if((e.ctrlKey||e.metaKey)&&k==="y"){ e.preventDefault(); $("#redo").click(); return; }
  if(k===" "){ e.preventDefault(); $("#playBtn").click(); return; }
  if(k==="delete"||k==="backspace"){ if(P&&P.sel){ e.preventDefault(); doCut(); } return; }
  if(k==="escape"&&P&&P.sel){ P.sel=null; if(P.scope==="sel") P.scope="all"; draw(); timeUi(); refreshInsp(); }
});
$("#title").addEventListener("input",function(){ if(P){ P.title=this.value; save(); } });

/* ═══════════ мои звуки ═══════════ */
function showHome(){
  stopPlay(); ringNext=false; $("#ed").hidden=true; $("#home").hidden=false; document.title=TR("FORGE · звуковая мастерская");
  try{ history.replaceState(null,"",location.pathname); }catch(e){}
  pAll().then(function(list){ list.sort(function(a,b){ return (b.updated||0)-(a.updated||0); });
    var my=$("#myZ"); my.innerHTML="";
    if(!list.length) my.appendChild(el('<p class="note">Здесь появятся ваши звуки.</p>'));
    list.forEach(function(p){ var d=new Date(p.updated||Date.now()), when=d.toLocaleDateString(window.FLANG||"ru",{day:"numeric",month:"short"});
      var n=el('<div class="zc"><button class="th"><canvas></canvas></button><b data-nt></b><small>'+when+(p.len?", "+tm(p.len,0):"")+'</small><div class="acts"><button data-a="copy">копия</button><button data-a="del">удалить</button></div></div>');
      $("b",n).textContent=p.title||""; $(".th",n).onclick=function(){ openP(p); };
      $$(".acts button",n).forEach(function(x){ x.onclick=function(){ if(x.getAttribute("data-a")==="copy"){ var c=JSON.parse(JSON.stringify(p)); c.id=newId(); c.title=TR("{0} (копия)",p.title||""); c.updated=Date.now(); pPut(c).then(showHome); }
        else ask(TR("Удалить «{0}»? Вернуть не получится.",p.title||""),TR("Удалить")).then(function(y){ if(y) pDel(p).then(showHome); }); }; });
      my.appendChild(n);
      requestAnimationFrame(function(){ var cv=$("canvas",n), w=cv.clientWidth, h=cv.clientHeight, dd=Math.min(2,devicePixelRatio||1); cv.width=w*dd; cv.height=h*dd; var g=cv.getContext("2d"); g.scale(dd,dd); g.fillStyle="#4fd6c8";
        (p.th||[]).forEach(function(v,i,a){ var x=i/a.length*w; g.fillRect(x,h/2-v*h/2,Math.max(1,w/a.length-1.5),Math.max(1,v*h)); }); }); }); });
  var st=$("#starts"); st.innerHTML="";
  [["file","Открыть файл","Обрезать песню, убрать лишнее, сделать громче, склеить с другими.",function(){ pickFile(); }],
   ["ring","Рингтон из песни","Сразу выберет 30 секунд с самого громкого места, края будут плавными.",function(){ ringNext=true; pickFile(); }],
   ["mic","Записать голос","Поздравление, заметка, кусок для подкаста. Паузы потом можно убрать одной кнопкой.",function(){ record(); },"red"]].forEach(function(s){
    st.appendChild(el('<button class="zs'+(s[4]?" "+s[4]:"")+'">'+sv(s[0])+'<b>'+esc(s[1])+'</b><small>'+esc(s[2])+'</small></button>',function(n){ n.onclick=s[3]; })); });
}
var ringNext=false;
function create(p){ return pPut(p).catch(function(){}).then(function(){ openP(p); }); }
function openP(p){
  stopPlay(); P=p; P.clips=P.clips||[]; U=[]; Rd=[]; undoBtns(); selClip=-1; cur=0; V={ t0:0, len:0 }; MIX=null; PK=null; $("#zoom").value=0;
  $("#home").hidden=true; $("#ed").hidden=false; document.title="FORGE · "+(P.title||""); $("#title").value=P.title||"";
  $("#empty").innerHTML='<div>'+esc(TR("Добавьте звук: откройте файл, перетащите его сюда или запишите голос."))+'<div class="row"><button class="btn go" data-a="f">'+esc(TR("Открыть файл"))+'</button><button class="btn" data-a="m">'+esc(TR("Записать"))+'</button></div></div>';
  $("#empty [data-a=f]").onclick=pickFile; $("#empty [data-a=m]").onclick=record;
  try{ history.replaceState(null,"",location.pathname+"#"+P.id); }catch(e){}
  if(wide.matches){ openTab("edit"); refreshInsp(); } else closeSheet();
  clipsUi(); timeUi();
  doRender();
  requestAnimationFrame(draw);
}
$("#toHome").onclick=function(){ save(); stopPlay(); setTimeout(showHome,450); };
(function boot(){ var h=location.hash.slice(1); if(h) pGet(h).then(function(p){ if(p) openP(p); else showHome(); }); else showHome(); })();
})();
