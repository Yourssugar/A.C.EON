/* FORGE звуковая мастерская.
   Проект = куски (clips) по очереди. Кусок ссылается на исходный файл (хранится как есть в IndexedDB «forge-zvuk», blobs)
   и список отрезков segs [[начало, конец], ...] в секундах исходника: обрезка и вырезание меняют только этот список,
   поэтому отмена дешёвая (снимок JSON), а исходник не портится.
   У отрезка может быть третий элемент с правками этого места: { g: громкость в дБ, mute, rev: задом наперёд, fx: эффект }.
   Громкость, скорость, эффект и эквалайзер общие для проекта. После каждой правки весь проект пересобирается в OfflineAudioContext
   в буфер PRE, затем (в dsp.js, в отдельном потоке) замеряется громкость и, если включён мастеринг, считается MIX.
   По MIX рисуется волна и играет превью, то есть видно и слышно ровно то, что сохранится.
   Подложка (P.bg) это вторая дорожка: её файлы играют под основной, собираются отдельным проходом и складываются с ней в dsp.js,
   там же основная дорожка чистится от шума, а подложка приглушается, когда звучит основная.
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
  var o=$("output",n), i=$("input",n), first=true; i.oninput=function(){ if(first){ first=false; remember(); } o.textContent=fmt(Number(i.value)); fn(Number(i.value)); }; i.onchange=function(){ first=true; if(done) done(Number(i.value)); }; }); }
function toggle(label,v,fn){ return el('<label class="tg"><span>'+esc(label)+'</span><input type="checkbox"'+(v?" checked":"")+'></label>',function(n){ $("input",n).onchange=function(){ fn(this.checked); }; }); }
function tm(s,dec){ s=Math.max(0,s||0); var m=Math.floor(s/60), r=s-m*60, t=dec===0?String(Math.floor(r)).padStart(2,"0"):r.toFixed(1).padStart(4,"0"); return m+":"+t; }
function sec(s){ return (Math.round(s*10)/10).toFixed(1)+" "+TR("с"); }
var SV={ keep:"M6 4v16M18 4v16M6 12h12", cut:"M6 9a3 3 0 100-6 3 3 0 000 6zM6 21a3 3 0 100-6 3 3 0 000 6zM20 4L8.1 15.9M14.5 14.5L20 20M8.1 8.1L12 12", fade:"M3 20L12 4l9 16",
  sil:"M4 12h3l3-7 4 14 3-7h3", vol:"M4 9h4l5-4v14l-5-4H4zM16 9a4 4 0 010 6", spd:"M12 12l4-3M5 19a9 9 0 1114 0", fx:"M3 12h4M17 12h4M7 8v8M11 5v14M13 7v10M17 9v6",
  mic:"M12 3a3 3 0 00-3 3v5a3 3 0 006 0V6a3 3 0 00-3-3zM5 11a7 7 0 0014 0M12 18v3", add:"M12 5v14M5 12h14", file:"M14 3H6v18h12V7zM14 3v4h4", ring:"M6 8a6 6 0 0112 0c0 7 3 9 3 9H3s3-2 3-9M10 21a2 2 0 004 0",
  l:"M15 5l-7 7 7 7", r:"M9 5l7 7-7 7", x:"M6 6l12 12M18 6L6 18", play:"M7 4l13 8-13 8z" };
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
  var used={}; all.forEach(function(q){ (q.clips||[]).concat(q.bg||[]).forEach(function(c){ used[c.aid]=1; }); });
  return tx("blobs","readwrite",function(s){ (p.clips||[]).concat(p.bg||[]).forEach(function(c){ if(!used[c.aid]&&c.aid!=="sil") s.delete(c.aid); }); }); }); }
function bPut(aid,blob){ return tx("blobs","readwrite",function(s){ s.put(blob,aid); }); }
function bGet(aid){ return tx("blobs","readonly",function(s){ return s.get(aid); }); }
function newId(p){ return (p||"z")+Date.now().toString(36)+Math.random().toString(36).slice(2,6); }

/* ═══════════ звук ═══════════ */
var AC=null; function ac(){ if(!AC){ AC=new (window.AudioContext||window.webkitAudioContext)(); } if(AC.state==="suspended") AC.resume(); return AC; }
var SR=44100, BUF={};
function decode(aid){ if(BUF[aid]) return BUF[aid];
  /* пауза: кусок тишины, файла за ним нет */
  if(aid==="sil"){ var sb; try{ sb=new AudioBuffer({ length:SR*30, numberOfChannels:1, sampleRate:SR }); }catch(e){ sb=ac().createBuffer(1,SR*30,SR); } BUF[aid]=Promise.resolve(sb); return BUF[aid]; }
  BUF[aid]=bGet(aid).then(function(b){ if(!b) throw new Error("nofile"); return b.arrayBuffer(); })
  .then(function(ab){ return new Promise(function(res,rej){ var p=ac().decodeAudioData(ab,res,rej); if(p&&p.then) p.then(res,rej); }); }).catch(function(e){ delete BUF[aid]; throw e; }); return BUF[aid]; }

/* ═══════════ проект и отрезки ═══════════ */
var P=null;
function newProject(title){ return { v:1, id:newId(), title:title||TR("Новый звук"), clips:[], gain:0, speed:1, fx:"none", fxAmt:100, eq:[0,0,0,0,0], xf:0, master:{ on:false, preset:"clean", amt:100, target:null }, nr:{ on:false, amt:50 }, bg:[], duck:{ on:true, depth:12 }, bgFade:true, mono:false, fadeIn:0, fadeOut:0, scope:"all", sel:null, ring:0, fmt:"mp3192", updated:Date.now() }; }
function segLen(c){ return c.segs.reduce(function(a,s){ return a+(s[1]-s[0]); },0); }
function clipLen(c){ return segLen(c)/P.speed; }
function total(){ return P?P.clips.reduce(function(a,c){ return a+clipLen(c); },0):0; }
function clipStart(i){ var t=0; for(var k=0;k<i;k++) t+=clipLen(P.clips[k]); return t; }
/* отрезок с правками: [начало, конец, {правки}]. У развёрнутого отрезка звук идёт от конца к началу */
function sp(s){ return s[2]||{}; }
function mk(a,b,o){ return o&&Object.keys(o).length?[a,b,JSON.parse(JSON.stringify(o))]:[a,b]; }
/* часть отрезка s от u до v секунд в порядке звучания */
function part(s,u,v){ return sp(s).rev?mk(s[1]-v,s[1]-u,s[2]):mk(s[0]+u,s[0]+v,s[2]); }
/* убрать из отрезков кусок [x,y) в «сплошном» времени исходника */
function removeSeq(segs,x,y){ var out=[], pos=0;
  segs.forEach(function(s){ var L=s[1]-s[0], a=pos, b=pos+L;
    if(b<=x||a>=y) out.push(s.slice());
    else { if(x>a) out.push(part(s,0,x-a)); if(y<b) out.push(part(s,y-a,L)); }
    pos=b; });
  return out.filter(function(s){ return s[1]-s[0]>0.0005; }); }
/* разрезать отрезки в точке x «сплошного» времени: дальше правку можно дать только одной стороне */
function splitSeq(segs,x){ var out=[], pos=0; segs.forEach(function(s){ var L=s[1]-s[0]; if(x>pos+.0005&&x<pos+L-.0005){ out.push(part(s,0,x-pos)); out.push(part(s,x-pos,L)); } else out.push(s); pos+=L; }); return out; }
/* соседние отрезки, которые в исходнике идут подряд и правлены одинаково, склеиваем обратно */
function mergeSegs(segs){ var out=[]; segs.forEach(function(s){ var p=out[out.length-1], o=sp(s); if(!Object.keys(o).length&&s.length>2) s=[s[0],s[1]];
    if(p&&JSON.stringify(sp(p))===JSON.stringify(o)&&Math.abs(o.rev?p[0]-s[1]:p[1]-s[0])<.0005){ if(o.rev) p[0]=s[0]; else p[1]=s[1]; } else out.push(s); }); return out; }
/* правка на выделенном: режем отрезки по краям выделения и даём fn поменять правки тех, что внутри */
function applyRange(a,b,fn){ var t=0; P.clips.forEach(function(c){ var L=clipLen(c), la=Math.max(0,a-t)*P.speed, lb=Math.min(L,b-t)*P.speed; t+=L; if(lb-la<.001) return;
    var segs=splitSeq(splitSeq(c.segs,la),lb), pos=0; segs.forEach(function(s){ var sl=s[1]-s[0]; if(pos>=la-.0006&&pos+sl<=lb+.0006){ var o=JSON.parse(JSON.stringify(sp(s))); fn(o); s[2]=o; s.length=3; } pos+=sl; });
    c.segs=mergeSegs(segs); }); }
/* правки первого отрезка внутри [a,b): по ним панель показывает, что сейчас стоит на выделенном */
function rangeProps(a,b){ var t=0, out=null; P.clips.forEach(function(c){ var pos=t; c.segs.forEach(function(s){ var sl=(s[1]-s[0])/P.speed; if(!out&&pos+sl>a+.01&&pos<b-.01) out=sp(s); pos+=sl; }); t=pos; }); return out||{}; }
function cutRange(a,b){ var t=0; P.clips.forEach(function(c){ var L=clipLen(c), la=Math.max(0,a-t), lb=Math.min(L,b-t); if(lb>la) c.segs=removeSeq(c.segs,la*P.speed,lb*P.speed); t+=L; });
  P.clips=P.clips.filter(function(c){ return c.segs.length; }); }
function keepRange(a,b){ var T=total(); cutRange(b,T+1); cutRange(0,a); }

/* ═══════════ сборка проекта в один буфер ═══════════ */
var MIX=null, PRE=null, STAT=null, ENV=null, NRDB=0, PK=null, rendT=0, rendN=0, AB=null;
var FX={ none:"без эффекта", echo:"эхо", bass:"больше баса", phone:"телефон", radio:"рация", hall:"зал" };
function chain(ctx,input,out,fx,amt){
  var k=amt==null?1:amt, wetG=ctx.createGain(), dry=ctx.createGain(); if(fx==="none"||!fx||k<=0){ input.connect(out); return; }
  if(fx==="echo"||fx==="hall"){ var d=ctx.createDelay(2), fb=ctx.createGain(), wet=ctx.createGain(), lp2=ctx.createBiquadFilter();
    d.delayTime.value=fx==="echo"?.32:.09; fb.gain.value=fx==="echo"?.38:.62; wet.gain.value=(fx==="echo"?.45:.35)*k; lp2.type="lowpass"; lp2.frequency.value=fx==="echo"?5000:3200;
    input.connect(out); input.connect(d); d.connect(lp2); lp2.connect(fb); fb.connect(d); lp2.connect(wet); wet.connect(out); return; }
  if(fx==="bass"){ var f=ctx.createBiquadFilter(); f.type="lowshelf"; f.frequency.value=160; f.gain.value=9*k; input.connect(f); f.connect(out); return; }
  dry.gain.value=1-k; wetG.gain.value=k; input.connect(dry); dry.connect(out); wetG.connect(out);
  var hp=ctx.createBiquadFilter(), lp=ctx.createBiquadFilter(), ws=ctx.createWaveShaper(), kk=fx==="radio"?18:5, cv=new Float32Array(1024);
  for(var i=0;i<1024;i++){ var x=i/512-1; cv[i]=(1+kk)*x/(1+kk*Math.abs(x)); } ws.curve=cv;
  hp.type="highpass"; hp.frequency.value=fx==="radio"?550:380; lp.type="lowpass"; lp.frequency.value=fx==="radio"?2600:3300;
  var g=ctx.createGain(); g.gain.value=fx==="radio"?.55:.8; input.connect(hp); hp.connect(lp); lp.connect(ws); ws.connect(g); g.connect(wetG);
}
/* эквалайзер на 5 полос: полка низа, три колокола, полка верха */
var EQF=[["lowshelf",80,"бас"],["peaking",250,"низ"],["peaking",1000,"середина"],["peaking",4000,"голос"],["highshelf",10000,"верх"]];
function eqChain(ctx,input,out){ var n=input, any=false; (P.eq||[]).forEach(function(g,i){ if(!g) return; any=true; var f=ctx.createBiquadFilter(); f.type=EQF[i][0]; f.frequency.value=EQF[i][1]; f.Q.value=.9; f.gain.value=g; n.connect(f); n=f; }); n.connect(out); }
/* мастеринг: пресеты. Цифры эквалайзера в дБ при силе 100%, порог компрессора считается от трека, приведённого к -18 LUFS */
var MAST={ clean:{ n:"Громко и чисто", d:"ровно и плотно, тон почти не меняется", hp:30, eq:[["ls",90,1],["pk",300,-1,.8],["pk",3500,1,.8],["hs",10000,1.5]], comp:[-16,2,.02,.2], width:1.05, sat:.1, target:-14 },
  warm:{ n:"Тёплый", d:"больше низа и тела, мягкий верх", hp:30, eq:[["ls",120,2.5],["pk",250,.5,.8],["pk",3000,-1,.8],["hs",9000,-1.5]], comp:[-16,2,.03,.25], width:1, sat:.25, target:-14 },
  bright:{ n:"Яркий", d:"воздух и чёткость, меньше гула", hp:35, eq:[["ls",100,-.5],["pk",400,-1.5,.8],["pk",4500,2,.8],["hs",11000,3]], comp:[-16,2,.02,.2], width:1.1, sat:.05, target:-14 },
  bass:{ n:"Больше баса", d:"плотный низ для наушников и колонок", hp:28, eq:[["ls",80,4.5],["pk",55,1.5,1],["pk",300,-1.5,.8],["hs",9000,1]], comp:[-16,2.5,.03,.25], width:1, sat:.15, target:-14 },
  voice:{ n:"Голос и подкаст", d:"срез гула, разборчивость, ровная громкость", hp:85, eq:[["ls",150,1],["pk",250,-2.5,.9],["pk",3200,3,.8],["hs",9000,1.5]], comp:[-20,3.5,.008,.15], width:1, sat:.05, target:-16 },
  phone:{ n:"Телефон и рингтон", d:"без низа, который динамик не играет, громко", hp:160, eq:[["pk",400,-1,.8],["pk",2500,4,.7],["hs",7000,2]], comp:[-20,4,.01,.15], width:.85, sat:.2, target:-9 },
  club:{ n:"Клуб", d:"удар, ширина и максимум громкости", hp:28, eq:[["ls",70,3],["pk",200,-1,.8],["pk",5000,1.5,.8],["hs",12000,2.5]], comp:[-17,3,.015,.18], width:1.15, sat:.3, target:-9 },
  tape:{ n:"Старая плёнка", d:"приглушённый верх, тёплое насыщение", hp:60, eq:[["ls",150,2],["pk",1000,1.5,.7],["hs",7000,-8]], comp:[-18,3,.02,.25], width:.9, sat:.6, target:-14 } };
var LOUD=[[-16,"-16","подкаст, речь"],[-14,"-14","YouTube, Spotify"],[-11,"-11","громко"],[-9,"-9","очень громко"]];
function mastParams(){ var M=P.master; if(!M||!M.on) return null; var S=MAST[M.preset]||MAST.clean; return { hp:S.hp, eq:S.eq, comp:S.comp, width:S.width, sat:S.sat, target:M.target==null?S.target:M.target, ceil:-1, amt:(M.amt==null?100:M.amt)/100 }; }
/* обработка в отдельном потоке; если поток не завёлся, считаем прямо на странице */
var WK=null, wkN=0, wkCb={};
function dsp(j){ return new Promise(function(res){ var id=++wkN; j.id=id; j.sr=SR;
  if(WK===null){ try{ WK=new Worker("dsp.js?v=2"); WK.onmessage=function(e){ var f=wkCb[e.data.id]; delete wkCb[e.data.id]; if(f) f(e.data); }; WK.onerror=function(){ WK=false; Object.keys(wkCb).forEach(function(k){ var f=wkCb[k]; delete wkCb[k]; f(null); }); }; }catch(e){ WK=false; } }
  if(!WK){ setTimeout(function(){ res(window.ZDSP.job(j)); },20); return; }
  /* если поток упал, массивы уже ушли в него: отвечаем null, сборка соберёт их заново и посчитает на странице */
  wkCb[id]=res; var tr=[j.A[0].buffer,j.A[1].buffer]; if(j.B) tr.push(j.B[0].buffer,j.B[1].buffer); WK.postMessage(j,tr); }); }
function mkBuf(L,R){ var b; try{ b=new AudioBuffer({ length:L.length, numberOfChannels:2, sampleRate:SR }); }catch(e){ b=ac().createBuffer(2,L.length,SR); } b.copyToChannel(L,0); b.copyToChannel(R,1); return b; }
function revBuf(ctx,b,s0,s1){ var a=Math.max(0,Math.floor(s0*b.sampleRate)), n=Math.max(1,Math.min(b.length,Math.ceil(s1*b.sampleRate))-a), o=ctx.createBuffer(b.numberOfChannels,n,b.sampleRate);
  for(var c=0;c<b.numberOfChannels;c++){ var x=b.getChannelData(c), y=o.getChannelData(c); for(var i=0;i<n;i++) y[i]=x[a+n-1-i]; } return o; }
function render(){ clearTimeout(rendT); rendT=setTimeout(doRender,120); }
/* подложка: отдельный проход, каждая дорожка со своей громкостью и плавными краями. Всё, что правее конца основной дорожки, не звучит */
function renderBg(n){ var list=(P.bg||[]).filter(function(k){ return k.len>0; }); if(!list.length) return Promise.resolve(null); var Tt=total();
  return Promise.all(list.map(function(k){ return decode(k.aid).catch(function(){ return null; }); })).then(function(bufs){
    var ctx=new (window.OfflineAudioContext||window.webkitOfflineAudioContext)(2,n,SR), out=ctx.createGain(), any=false; out.connect(ctx.destination);
    if(P.bgFade!==false&&Tt>4){ out.gain.setValueAtTime(1,Tt-2); out.gain.linearRampToValueAtTime(0,Tt); }
    list.forEach(function(k,i){ var b=bufs[i], len=Math.min(k.len,Tt-k.at); if(!b||len<.02) return; any=true; var src=ctx.createBufferSource(), g=ctx.createGain(), vol=Math.pow(10,(k.vol==null?-8:k.vol)/20), fi=Math.min(k.fi||0,len/2), fo=Math.min(k.fo||0,len/2);
      src.buffer=b; src.loop=!!k.loop; src.connect(g); g.connect(out); g.gain.setValueAtTime(fi>0?0:vol,k.at); if(fi>0) g.gain.linearRampToValueAtTime(vol,k.at+fi); if(fo>0){ g.gain.setValueAtTime(vol,k.at+len-fo); g.gain.linearRampToValueAtTime(0,k.at+len); }
      src.start(k.at,Math.min(k.in||0,Math.max(0,b.duration-.05)),len); });
    if(!any) return null;
    return new Promise(function(res,rej){ ctx.oncomplete=function(e){ res(e.renderedBuffer); }; var pr=ctx.startRendering(); if(pr&&pr.then) pr.then(res,rej); }); }); }
function hasTail(){ if(P.fx==="echo"||P.fx==="hall") return true; return P.clips.some(function(c){ return c.segs.some(function(s){ var f=sp(s).fx; return f==="echo"||f==="hall"; }); }); }
function doRender(){
  var my=++rendN;
  if(!P||!P.clips.length){ MIX=null; PRE=null; STAT=null; ENV=null; PK=null; draw(); clipsUi(); timeUi(); return Promise.resolve(); }
  $("#busy").hidden=false;
  return Promise.all(P.clips.map(function(c){ return decode(c.aid); })).then(function(bufs){
    if(my!==rendN) return;
    var T=total(), tail=hasTail()?1.5:0, n=Math.max(1,Math.ceil((T+tail)*SR));
    var ctx=new (window.OfflineAudioContext||window.webkitOfflineAudioContext)(2,n,SR), g=ctx.createGain(), mid=ctx.createGain(); g.gain.value=Math.pow(10,P.gain/20);
    chain(ctx,g,mid,P.fx,(P.fxAmt==null?100:P.fxAmt)/100); eqChain(ctx,mid,ctx.destination);
    var when=0, R=.005, xf=P.xf||0;
    P.clips.forEach(function(c,i){ var b=bufs[i];
      c.segs.forEach(function(s,j){ var o=sp(s), L=(s[1]-s[0])/P.speed, pv=c.segs[j-1], nx=c.segs[j+1], vol=o.mute?0:Math.pow(10,(o.g||0)/20);
        /* сосед в исходнике идёт подряд: стык делаем внахлёст на 5 мс, его не слышно. Настоящий разрез: короткий спад и подъём, чтобы не щёлкало */
        var joinA=pv&&!o.rev&&!sp(pv).rev&&Math.abs(pv[1]-s[0])<.0005&&s[0]>=R*P.speed, joinB=nx&&!o.rev&&!sp(nx).rev&&Math.abs(nx[0]-s[1])<.0005;
        var rin=j===0&&i>0&&xf>0?Math.min(xf,L/2):Math.min(R,L/3), rout=j===c.segs.length-1&&i<P.clips.length-1&&xf>0?Math.min(xf,L/2):Math.min(R,L/3), pre=joinA?Math.min(R,L/3,(pv[1]-pv[0])/P.speed/3):0, post=joinB?Math.min(R,L/3,(nx[1]-nx[0])/P.speed/3):0;
        if(vol>0){ var src=ctx.createBufferSource(), sg=ctx.createGain(), t0=when-pre, dst=g; src.playbackRate.value=P.speed; src.connect(sg);
          if(o.fx&&o.fx!=="none"){ dst=ctx.createGain(); chain(ctx,dst,g,o.fx,1); } sg.connect(dst);
          sg.gain.setValueAtTime(0,Math.max(0,t0)); sg.gain.linearRampToValueAtTime(vol,Math.max(0,t0)+(joinA?pre:rin));
          sg.gain.setValueAtTime(vol,when+L-(joinB?post:rout)); sg.gain.linearRampToValueAtTime(0,when+L);
          if(o.rev){ src.buffer=revBuf(ctx,b,s[0],s[1]); src.start(when,0,s[1]-s[0]); } else { src.buffer=b; src.start(Math.max(0,t0),s[0]-pre*P.speed,s[1]-s[0]+pre*P.speed); } }
        when+=L; }); });
    return new Promise(function(res,rej){ ctx.oncomplete=function(e){ res(e.renderedBuffer); }; var pr=ctx.startRendering(); if(pr&&pr.then) pr.then(res,rej); }); })
  .then(function(buf){ if(!buf||my!==rendN) return; return renderBg(buf.length).then(function(bg){ if(my!==rendN) return;
    var m=mastParams(), nr=P.nr&&P.nr.on?(P.nr.amt==null?50:P.nr.amt)/100:null, plain=!bg&&nr==null;
    function ch(x,c){ return new Float32Array(x.getChannelData(x.numberOfChannels>1?c:0)); }
    function job(){ return { A:[ch(buf,0),ch(buf,1)], B:bg?[ch(bg,0),ch(bg,1)]:null, nr:nr, duck:bg&&P.duck&&P.duck.on!==false?(P.duck.depth||12):0, m:m }; }
    return dsp(job()).then(function(d){ return d||dsp(job()); }).then(function(d){ if(my!==rendN) return;
      STAT=d.st; ENV=d.env; NRDB=d.nr||0; PRE=plain?buf:mkBuf(d.L,d.R); MIX=m?mkBuf(d.ML,d.MR):PRE; if(!m){ AB=null; }
      peaks(); $("#busy").hidden=true; fixSel(); draw(); timeUi(); clipsUi(); if(ui.tab==="snd"||ui.tab==="mast"||ui.tab==="trk") refreshPane(); thumbSave(); if(play.on) restartPlay(); }); }); })
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
  if(!P||!P.clips.length||!MIX){ bgUi(); return; }
  clampView();
  var Tt=T(), sc=scope();
  /* шкала времени */
  g.fillStyle="#0d1116"; g.fillRect(0,0,W,RH); g.fillStyle="#232a33"; g.fillRect(0,RH-1,W,1);
  var steps=[.5,1,2,5,10,15,30,60,120,300], st=steps.filter(function(s){ return s/V.len*W>70; })[0]||600;
  g.font="10px ui-monospace,Menlo,monospace"; g.fillStyle="#59636e";
  for(var t=Math.ceil(V.t0/st)*st;t<V.t0+V.len;t+=st){ var x=xOf(t); g.fillRect(x,RH-7,1,6); g.fillText(tm(t,st<1?1:0),x+4,14); }
  /* варианты лучшего куска: цветные полоски с номерами на шкале */
  if(bestValid()) BEST.c.forEach(function(c,i){ var x1=xOf(c.a), x2=xOf(c.b), col=["#ff9a4d","#ff5fa2","#a78bfa"][i]; g.fillStyle=col; g.globalAlpha=.85; g.fillRect(x1,RH-4,x2-x1,3); g.globalAlpha=1;
    g.beginPath(); g.arc(x1+7,RH-11,6.5,0,Math.PI*2); g.fill(); g.fillStyle="#0d1116"; g.font="bold 9px ui-monospace,Menlo,monospace"; g.fillText(String(i+1),x1+4.5,RH-8); g.font="10px ui-monospace,Menlo,monospace"; });
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
  bgUi();
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
  fixSel(); draw(); timeUi(); save(); if(!wide.matches&&ui.sheet==="insp"||wide.matches) refreshInsp(); if(ui.tab==="edit") refreshPane(); });
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
  var src=a.createBufferSource(), g=a.createGain(), now=a.currentTime+.03; var ab=abGain(), og=a.createGain(); src.buffer=AB==="pre"&&PRE?PRE:MIX; og.gain.value=ab; src.connect(g); g.connect(og); og.connect(a.destination);
  /* плавные края при игре: те же, что попадут в файл */
  var at=function(t){ return now+(t-from); };
  g.gain.setValueAtTime(fadeK(from,sc),now);
  if(P.fadeIn>0&&from<sc[0]+P.fadeIn&&from>=sc[0]) g.gain.linearRampToValueAtTime(1,at(sc[0]+P.fadeIn));
  if(P.fadeOut>0&&to>sc[1]-P.fadeOut&&from<=sc[1]){ var fs=Math.max(from,sc[1]-P.fadeOut); g.gain.setValueAtTime(fadeK(fs,sc),at(fs)); g.gain.linearRampToValueAtTime(0,at(sc[1])); if(to>sc[1]) g.gain.setValueAtTime(1,at(sc[1])+.001); }
  src.start(now,from,Math.max(.01,to-from));
  play={ on:true, src:src, from:from, to:to, t0:now, loop:loop };
  src.onended=function(){ if(play.src!==src) return; if(play.loop&&$("#loopBtn").classList.contains("on")&&P.sel){ startPlay(P.sel[0]); } else { cur=play.on?play.to:cur; if(cur>=T()-.05) cur=P.sel?P.sel[0]:0; play.on=false; playUi(); draw(); timeUi(); } };
  playUi(); tick(); }
/* сравнение: обе версии играют на одной громкости на слух. Тихую версию поднимаем, пока её пики не упрутся в потолок, остальное снимаем с громкой */
function abGain(){ if(!AB||!STAT||!PRE||STAT.inL<-70) return 1; var d=STAT.outL-STAT.inL, up=Math.max(0,Math.min(d,-.3-STAT.inPk)); if(d<=0) return AB==="pre"?Math.pow(10,d/20):1; return Math.pow(10,(AB==="pre"?up:up-d)/20); }
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
    if(ringNext){ ringNext=false; return doRender().then(function(){ if(MIX){ ringAt(30); if(!wide.matches) setTimeout(openInsp,50); } }).then(function(){ save(); refresh(); }); }
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
function doSilence(){ if(!MIX||!ENV) return; var win=Math.round(SR*.02), thr=Math.pow(10,-42/20), quiet=[], start=-1, Tt=T();
  for(var i=0;i<ENV.length&&i*win<Tt*SR;i++){ var rms=ENV[i], t=i*win/SR;
    if(rms<thr){ if(start<0) start=t; } else if(start>=0){ quiet.push([start,t]); start=-1; } }
  if(start>=0) quiet.push([start,Tt]);
  var keep=.18, rm=quiet.filter(function(q){ return q[1]-q[0]>.6; }).map(function(q){ return [q[0]===0?0:q[0]+keep,q[1]>=Tt-.01?Tt:q[1]-keep]; }).filter(function(q){ return q[1]-q[0]>.05; });
  if(!rm.length){ toast(TR("Длинных пауз не нашлось")); return; }
  remember(); var cutT=0; for(var k=rm.length-1;k>=0;k--){ cutRange(rm[k][0],rm[k][1]); cutT+=rm[k][1]-rm[k][0]; }
  P.sel=null; P.scope="all"; cur=0; render(); save(); refresh(); toast(TR("Убрано пауз: {0}, это {1}",rm.length,sec(cutT))); }
function addPause(){ remember(); P.clips.push({ id:newId("c"), aid:"sil", name:TR("Пауза"), dur:2, segs:[[0,2]] }); selClip=P.clips.length-1; render(); save(); refresh(); toast(TR("Пауза 2 секунды добавлена в конец")); }
/* одна кнопка для записи голоса: шум и гул вниз, тон и громкость как у подкаста */
function voiceFix(){ if(!MIX) return; remember(); P.nr={ on:true, amt:P.nr&&P.nr.amt||50 }; P.master=P.master||{}; P.master.on=true; P.master.preset="voice"; P.master.target=null; if(P.master.amt==null) P.master.amt=100; render(); save(); refresh(); toast(TR("Голос улучшен: шум приглушён, громкость выровнена")); }
function selOp(fn,msg){ if(!needSel()) return; remember(); applyRange(P.sel[0],P.sel[1],fn); render(); save(); refresh(); if(msg) toast(msg); }
function selClear(){ selOp(function(o){ delete o.g; delete o.mute; delete o.rev; delete o.fx; },TR("Правки куска сброшены")); }
function normalize(){ if(!PK||PK.peak<=0) return; remember(); P.gain=Math.max(-30,Math.min(30,Math.round((P.gain+(-1-peakDb()))*10)/10)); render(); save(); toast(TR("Громкость выровнена: пик -1 дБ")); setTimeout(refresh,400); }
/* ═══════════ лучший кусок ═══════════
   Без нейросети, классическим анализом музыки. Трек режется на кадры по 0.1 с, для каждого считаются:
   «отпечаток» нот (хрома: сила каждой из 12 нот), громкость, плотность ударов (рост спектра между кадрами) и яркость.
   Потом кадры собираются в блоки по 0.5 с и каждый кусок в 4 секунды сравнивается со всеми остальными:
   то, что в песне повторяется почти один в один 2-3 раза, обычно и есть припев. Итоговая оценка окна:
   повторяемость 45 %, громкость 30 %, плотность 15 %, яркость 10 %. Начало подтягивается к ближайшему сильному удару.
   Алгоритм может ошибаться, поэтому выдаёт три варианта на выбор. */
var FEAT=null, BEST=null;
function fftR(re,im){ var n=re.length, i, j=0, t;
  for(i=1;i<n;i++){ var bit=n>>1; for(;j&bit;bit>>=1) j^=bit; j^=bit; if(i<j){ t=re[i]; re[i]=re[j]; re[j]=t; t=im[i]; im[i]=im[j]; im[j]=t; } }
  for(var len=2;len<=n;len<<=1){ var h=len>>1, ang=-2*Math.PI/len, wr=Math.cos(ang), wi=Math.sin(ang);
    for(i=0;i<n;i+=len){ var cr=1, ci=0; for(var k=0;k<h;k++){ var a=i+k, b=a+h, xr=re[b]*cr-im[b]*ci, xi=re[b]*ci+im[b]*cr; re[b]=re[a]-xr; im[b]=im[a]-xi; re[a]+=xr; im[a]+=xi; t=cr*wr-ci*wi; ci=cr*wi+ci*wr; cr=t; } } } }
/* признаки по кадрам 0.1 с; считается кусками, чтобы страница не замирала */
function features(){ if(FEAT&&FEAT.n===rendN) return Promise.resolve(FEAT);
  var my=rendN, sr=MIX.sampleRate, A=MIX.getChannelData(0), B=MIX.numberOfChannels>1?MIX.getChannelData(1):A, Tt=T(), fs=sr/2, N=2048, hop=Math.round(fs*.1);
  var n=Math.floor(Math.min(A.length,Tt*sr)/2), x=new Float32Array(n); for(var i=0;i<n;i++) x[i]=(A[2*i]+A[2*i+1]+B[2*i]+B[2*i+1])*.25;
  var F=Math.max(0,Math.floor((n-N)/hop)+1), win=new Float32Array(N), pc=new Int8Array(N/2), fr=new Float32Array(N/2);
  for(i=0;i<N;i++) win[i]=.5-.5*Math.cos(2*Math.PI*i/(N-1));
  for(i=1;i<N/2;i++){ var f=i*fs/N; fr[i]=f; pc[i]=f<55||f>5000?-1:((Math.round(12*Math.log2(f/440))+69)%12+12)%12; }
  var chroma=new Float32Array(F*12), en=new Float32Array(F), flux=new Float32Array(F), cen=new Float32Array(F), prev=new Float32Array(N/2), re=new Float32Array(N), im=new Float32Array(N), fi=0;
  return new Promise(function(res,rej){ (function step(){ if(my!==rendN){ rej("stale"); return; } var end=Math.min(F,fi+120);
    for(;fi<end;fi++){ var o=fi*hop, e=0; for(var k=0;k<N;k++){ var v=x[o+k]; e+=v*v; re[k]=v*win[k]; im[k]=0; } en[fi]=Math.sqrt(e/N); fftR(re,im);
      var fl=0, cs=0, ms=0; for(k=1;k<N/2;k++){ var m=Math.sqrt(re[k]*re[k]+im[k]*im[k]), lm=Math.log(1+m*10); if(pc[k]>=0) chroma[fi*12+pc[k]]+=m; var dd=lm-prev[k]; if(dd>0) fl+=dd; prev[k]=lm; cs+=fr[k]*m; ms+=m; }
      flux[fi]=fl; cen[fi]=ms>0?cs/ms:0; }
    if(fi<F) setTimeout(step,0); else { FEAT={ n:my, F:F, dt:hop/fs, chroma:chroma, en:en, flux:flux, cen:cen }; res(FEAT); } })(); }); }
function rank(a){ var idx=[].map.call(a,function(v,i){ return i; }).sort(function(p,q){ return a[p]-a[q]; }), out=new Float32Array(a.length); idx.forEach(function(i,k){ out[i]=a.length>1?k/(a.length-1):1; }); return out; }
function bestPieces(len){ return features().then(function(Fe){
  var per=5, nb=Math.floor(Fe.F/per), dt=Fe.dt*per, L=Math.round(len/dt), Tt=T();
  if(nb<L+4) return [{ a:0, b:Math.min(len,Tt), why:"весь трек" }];
  var c=new Float32Array(nb*12), e=new Float32Array(nb), fl=new Float32Array(nb), ce=new Float32Array(nb), mean=new Float32Array(12), i, j, k;
  for(i=0;i<nb;i++){ for(var f=i*per;f<(i+1)*per;f++){ for(k=0;k<12;k++) c[i*12+k]+=Fe.chroma[f*12+k]; e[i]+=Fe.en[f]; fl[i]+=Fe.flux[f]; ce[i]+=Fe.cen[f]; } }
  /* хрому сравниваем без «общего фона тональности»: вычитаем среднее по треку, иначе в песне одной тональности всё похоже на всё */
  for(i=0;i<nb;i++){ var s0=0; for(k=0;k<12;k++) s0+=c[i*12+k]; for(k=0;k<12;k++){ c[i*12+k]=s0>0?c[i*12+k]/s0:0; mean[k]+=c[i*12+k]/nb; } }
  for(i=0;i<nb;i++){ var nr=0; for(k=0;k<12;k++){ c[i*12+k]-=mean[k]; nr+=c[i*12+k]*c[i*12+k]; } nr=Math.sqrt(nr)||1; for(k=0;k<12;k++) c[i*12+k]/=nr; }
  var S=new Float32Array(nb*nb); for(i=0;i<nb;i++) for(j=i;j<nb;j++){ var d=0; for(k=0;k<12;k++) d+=c[i*12+k]*c[j*12+k]; S[i*nb+j]=S[j*nb+i]=d; }
  /* повтор кусков по 4 с: среднее по диагонали; тихие блоки не считаются повтором */
  var K=8, gap=16, rep=new Float32Array(nb), er=rank(e);
  for(i=0;i+K<=nb;i++){ var m1=-1, j1=-99, m2=-1;
    for(j=0;j+K<=nb;j++){ if(Math.abs(i-j)<gap) continue; var sm=0; for(k=0;k<K;k++) sm+=S[(i+k)*nb+j+k]; sm/=K; if(sm>m1){ m1=sm; j1=j; } }
    for(j=0;j+K<=nb;j++){ if(Math.abs(i-j)<gap||Math.abs(j-j1)<gap) continue; var sm2=0; for(k=0;k<K;k++) sm2+=S[(i+k)*nb+j+k]; sm2/=K; if(sm2>m2) m2=sm2; }
    rep[i]=(.6*m1+.4*Math.max(0,m2))*Math.min(1,er[i]*2.5); }
  for(i=nb-K+1;i<nb;i++) rep[i]=rep[nb-K];
  var rr=rank(rep), fr2=rank(fl), cr=rank(ce), sc=[];
  for(var st=0;st+L<=nb;st++){ var a=0,b=0,f2=0,g=0; for(k=st;k<st+L;k++){ a+=rr[k]; b+=er[k]; f2+=fr2[k]; g+=cr[k]; } sc.push({ s:st, v:(.45*a+.3*b+.15*f2+.1*g)/L, r:a/L, e:b/L }); }
  sc.sort(function(p,q){ return q.v-p.v; });
  var pick=[]; sc.forEach(function(w){ if(pick.length>=3) return; if(pick.every(function(q){ return Math.abs(q.s-w.s)>=Math.max(L*.6,20); })) pick.push(w); });
  /* граница части песни: где «отпечаток» нот и громкость за 2 с до и 2 с после отличаются сильнее всего */
  function nov(i){ if(i<4||i+4>nb) return 0; var d=0, eb=0, ea=0; for(var k=0;k<12;k++){ var p=0, q=0; for(var u=1;u<=4;u++){ p+=c[(i-u)*12+k]; q+=c[(i+u-1)*12+k]; } d+=(p-q)*(p-q); }
    for(var u=1;u<=4;u++){ eb+=e[i-u]; ea+=e[i+u-1]; } return Math.sqrt(d)/4+Math.max(0,(ea-eb)/(eb+ea+1e-9)); }
  return pick.map(function(w){ var bs=w.s, bn=-1;
    for(var i2=Math.max(0,w.s-5);i2<=Math.min(nb-L,w.s+5);i2++){ var v0=nov(i2)*(1-Math.abs(i2-w.s)*.06); if(v0>bn){ bn=v0; bs=i2; } }
    var t=bs*dt, best=t, bv=-1;
    /* начало на сильном ударе: самый резкий всплеск рядом с границей */
    for(var f=Math.max(0,Math.round((t-.4)/Fe.dt));f<Math.min(Fe.F,Math.round((t+.4)/Fe.dt));f++){ var tt=f*Fe.dt, v=Fe.flux[f]*(1-Math.abs(tt-t)*.8); if(v>bv){ bv=v; best=tt; } }
    var a=Math.max(0,Math.min(Tt-len,best-.03));
    return { a:a, b:a+len, why:w.r>.62?"похоже на припев":(w.e>.7?"самое громкое":"самое насыщенное") }; }); }); }
function findBest(len,pickI){ if(!MIX) return Promise.resolve();
  var bz=$("#busy span"), old=bz.textContent; $("#busy").hidden=false; bz.textContent=TR("Слушаю трек, ищу лучший кусок...");
  return bestPieces(len).then(function(list){ $("#busy").hidden=true; bz.textContent=old; BEST={ n:rendN, len:len, c:list }; useBest(pickI||0,true); })
    .catch(function(e){ $("#busy").hidden=true; bz.textContent=old; if(e!=="stale") toast(TR("Не получилось разобрать трек")); }); }
function useBest(i,quiet){ var c=BEST&&BEST.c[i]; if(!c) return; remember(); P.ring=BEST.len; P.scope="sel"; P.sel=[c.a,c.b]; if(!P.fadeIn) P.fadeIn=1; if(!P.fadeOut) P.fadeOut=2;
  fixSel(); cur=P.sel[0]; V.len=viewLen(); if(P.sel[0]<V.t0||P.sel[1]>V.t0+V.len) V.t0=Math.max(0,P.sel[0]-V.len*.1); draw(); timeUi(); save(); refresh();
  if(!quiet||play.on){ $("#loopBtn").classList.add("on"); stopPlay(); startPlay(P.sel[0]); } }
function bestValid(){ return BEST&&BEST.n===rendN; }
/* рингтон нужной длины: если кусок уже выделен, меняем только длину, иначе ищем лучший */
function ringAt(len){ if(!MIX) return; var Tt=T();
  if(Tt<=len){ remember(); P.ring=len; P.scope="sel"; P.sel=[0,Tt]; fixSel(); draw(); timeUi(); save(); refresh(); return; }
  if(P.sel&&P.sel[0]+len<=Tt){ remember(); P.ring=len; P.scope="sel"; P.sel=[P.sel[0],P.sel[0]+len]; if(!P.fadeIn) P.fadeIn=1; if(!P.fadeOut) P.fadeOut=2; fixSel(); draw(); timeUi(); save(); refresh(); return; }
  findBest(len); }

/* ═══════════ темп (BPM) ═══════════ */
/* Огибающая ударов: рост спектра между кадрами по 12 мс. Темп: самое сильное повторение огибающей в пределах 60-200 ударов в минуту,
   с небольшим предпочтением середине (около 120), чтобы не путать с половиной и удвоением. */
function bpmDetect(){ if(!MIX) return Promise.resolve(0); var A=MIX.getChannelData(0), B=MIX.numberOfChannels>1?MIX.getChannelData(1):A, Tt=Math.min(T(),150), fs=SR/4, n=Math.floor(Math.min(A.length,Tt*SR)/4), x=new Float32Array(n), i;
  for(i=0;i<n;i++){ var q=i*4; x[i]=(A[q]+A[q+1]+A[q+2]+A[q+3]+B[q]+B[q+1]+B[q+2]+B[q+3])*.125; }
  var N=512, hop=128, F=Math.max(0,Math.floor((n-N)/hop)+1), win=new Float32Array(N), prev=new Float32Array(N/2), re=new Float32Array(N), im=new Float32Array(N), on=new Float32Array(F), fi=0, fps=fs/hop; for(i=0;i<N;i++) win[i]=.5-.5*Math.cos(2*Math.PI*i/(N-1));
  if(F<fps*4) return Promise.resolve(0);
  return new Promise(function(res){ (function step(){ var end=Math.min(F,fi+600);
    for(;fi<end;fi++){ var o=fi*hop, k; for(k=0;k<N;k++){ re[k]=x[o+k]*win[k]; im[k]=0; } fftR(re,im); var fl=0; for(k=1;k<N/2;k++){ var m=Math.log(1+Math.sqrt(re[k]*re[k]+im[k]*im[k])*20), d=m-prev[k]; if(d>0) fl+=d; prev[k]=m; } on[fi]=fl; }
    if(fi<F){ setTimeout(step,0); return; }
    var mean=0; for(i=0;i<F;i++) mean+=on[i]; mean/=F; for(i=0;i<F;i++) on[i]=Math.max(0,on[i]-mean);
    var lo=Math.floor(fps*60/200), hi=Math.min(F-2,Math.ceil(fps*60/60)), ac=new Float32Array(hi+2), best=0, bl=0, lag;
    for(lag=lo-1;lag<=hi+1;lag++){ var s2=0; for(i=0;i+lag<F;i++) s2+=on[i]*on[i+lag]; ac[lag]=s2/(F-lag); }
    for(lag=lo;lag<=hi;lag++){ var bpm=fps*60/lag, w=Math.exp(-.5*Math.pow(Math.log2(bpm/120)/.9,2)), v=ac[lag]*w; if(2*lag<=hi) v+=.5*ac[2*lag]*w; if(v>best){ best=v; bl=lag; } }
    if(!bl||ac[bl]<=0){ res(0); return; }
    /* точнее: тот же пик ищем на 2, 4 и 8 периодах, там шаг по времени мельче относительно периода */
    function acAt(l){ var s3=0; for(var q=0;q+l<F;q++) s3+=on[q]*on[q+l]; return s3/(F-l); }
    function top(c){ var b2=c, bv=-1, v3; for(var l=Math.max(2,c-2);l<=c+2;l++){ v3=acAt(l); if(v3>bv){ bv=v3; b2=l; } } var y0=acAt(b2-1), y2=acAt(b2+1), dd=y0-2*bv+y2; return bv>0?b2+(dd<0?Math.max(-.5,Math.min(.5,.5*(y0-y2)/dd)):0):0; }
    var per=top(bl)||bl; [2,4,8].forEach(function(m){ var c=Math.round(per*m); if(c+3<F*.6){ var t2=top(c); if(t2) per=t2/m; } });
    res(Math.round(fps*60/per*2)/2); })(); }); }
function bpmGo(){ if(!MIX) return; toast(TR("Слушаю ритм...")); bpmDetect().then(function(v){ P.bpm=v||0; P.bpmN=rendN; save(); refresh(); if(!v) toast(TR("Ровного ритма не нашлось")); }); }

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
function wav(chs,bits){ var B=bits===24?3:2, n=chs[0].length, ch=chs.length, buf=new ArrayBuffer(44+n*ch*B), v=new DataView(buf), p=0;
  function s(t){ for(var i=0;i<t.length;i++) v.setUint8(p++,t.charCodeAt(i)); } function u32(x){ v.setUint32(p,x,true); p+=4; } function u16(x){ v.setUint16(p,x,true); p+=2; }
  s("RIFF"); u32(36+n*ch*B); s("WAVE"); s("fmt "); u32(16); u16(1); u16(ch); u32(SR); u32(SR*ch*B); u16(ch*B); u16(B*8); s("data"); u32(n*ch*B);
  for(var i=0;i<n;i++) for(var c=0;c<ch;c++){ var x=Math.max(-1,Math.min(1,chs[c][i])); if(B===2){ v.setInt16(p,x<0?x*32768:x*32767,true); p+=2; } else { var q=Math.round(x<0?x*8388608:x*8388607); v.setUint8(p++,q&255); v.setUint8(p++,(q>>8)&255); v.setUint8(p++,(q>>16)&255); } }
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
function estSize(){ var sc=scope(), L=sc[1]-sc[0], ch=P.mono?1:2; if(P.fmt==="wav") return L*SR*ch*2; if(P.fmt==="wav24") return L*SR*ch*3; if(P.fmt==="m4r") return L*16000; return L*mp3k(P.fmt)*125; }
function mp3k(f){ return f==="mp3128"?128:f==="mp3320"?320:192; }
function kb(b){ return b>1048576?(b/1048576).toFixed(1)+" "+TR("МБ"):Math.round(b/1024)+" "+TR("КБ"); }
function exportFile(){
  if(!MIX){ toast(TR("Сначала добавьте звук")); return; } stopPlay();
  modal('<h3>Сохраняю файл</h3><div class="prog"><i id="pg"></i></div><p class="note" id="pgT"></p>');
  var chs=slice(), f=P.fmt, prog=function(p){ var g=$("#pg"); if(g) g.style.width=Math.round(Math.min(1,p)*100)+"%"; };
  $("#pgT").textContent=f==="m4r"?TR("Для iPhone файл собирается в реальном времени, это займёт {0}.",sec(chs[0].length/SR)):TR("Пара секунд...");
  var job=f==="wav"||f==="wav24"?Promise.resolve(wav(chs,f==="wav24"?24:16)):f==="m4r"?m4r(chs,prog):mp3(chs,mp3k(f),prog);
  setTimeout(function(){ job.then(function(blob){ closeModal(); var ext=f==="wav"||f==="wav24"?"wav":f==="m4r"?"m4r":"mp3"; dl(blob,fname()+(P.scope==="sel"?"-"+Math.round(chs[0].length/SR)+"s":"")+"."+ext); toast(TR("Файл сохранён: {0}",kb(blob.size))); })
    .catch(function(){ closeModal(); toast(TR("Не получилось сохранить файл")); }); },50); }
/* в монтаж: MP3 выделенного или всего трека ложится в базу мастерской монтажа дорожкой нового или уже начатого ролика */
function mzDb(){ return new Promise(function(res,rej){ var r=indexedDB.open("forge-montazh",1); r.onupgradeneeded=function(){ r.result.createObjectStore("projects",{keyPath:"id"}); r.result.createObjectStore("blobs"); }; r.onsuccess=function(){ res(r.result); }; r.onerror=function(){ rej(r.error); }; }); }
function mzTx(d,st,mode,fn){ return new Promise(function(res,rej){ var t=d.transaction(st,mode), out=fn.apply(null,st.map(function(n){ return t.objectStore(n); })); t.oncomplete=function(){ res(out&&out.result); }; t.onerror=t.onabort=function(){ rej(t.error); }; }); }
function toMontage(){ if(!MIX){ toast(TR("Сначала добавьте звук")); return; } stopPlay();
  mzDb().then(function(d){ return mzTx(d,["projects"],"readonly",function(s){ return s.getAll(); }).then(function(list){ list=(list||[]).sort(function(a,b){ return (b.updated||0)-(a.updated||0); }).slice(0,6);
    modal('<button class="ib mx" data-close>'+sv("x")+'</button><h3>'+esc(TR("В монтаж"))+'</h3><p class="note" style="margin-bottom:10px">'+esc(TR("Звук ляжет музыкальной дорожкой в ролик. Уходит то же, что сохранилось бы в файл."))+'</p><div id="mzL"></div>');
    var box=$("#mzL"), go=function(p){ box.innerHTML='<div class="prog"><i id="pg"></i></div>'; var chs=slice(), dur=chs[0].length/SR;
      mp3(chs,192,function(q){ var g=$("#pg"); if(g) g.style.width=Math.round(Math.min(1,q)*100)+"%"; }).then(function(blob){ var aid=newId("a"), n=Math.max(200,Math.min(2400,Math.ceil(dur*5))), pk=new Array(n), per=chs[0].length/n;
        for(var i=0;i<n;i++){ var m=0, e=Math.min(chs[0].length,Math.floor((i+1)*per)); for(var j=Math.floor(i*per);j<e;j+=8){ var v=Math.abs(chs[0][j]); if(v>m) m=v; } pk[i]=Math.min(255,Math.round(Math.sqrt(m)*255)); }
        if(!p) p={ v:2, id:newId("m"), title:P.title||TR("Новый ролик"), fmt:"9x16", style:"smooth", fit:"cover", filter:"warm", adj:{}, tr:"fade", trd:.8, anim:"fade", clips:[], tracks:[], mfade:true, vvol:1, q:720 };
        p.tracks=p.tracks||[]; var end=0; p.tracks.forEach(function(k){ end=Math.max(end,k.at+(k.len||0)); });
        p.tracks.push({ id:newId("t"), aid:aid, name:(P.title||"").slice(0,60), at:Math.round(end*100)/100, in:0, len:dur, dur:dur, vol:.8, fi:0, fo:0 }); p.updated=Date.now();
        return mzTx(d,["projects","blobs"],"readwrite",function(ps,bs){ bs.put(blob,aid); bs.put(pk,aid+":pk"); ps.put(p); }).then(function(){ location.href="../montazh/#"+p.id; }); })
      .catch(function(){ closeModal(); toast(TR("Не получилось передать звук в монтаж")); }); };
    box.appendChild(el('<button class="btn go w" style="justify-content:center">'+esc(TR("В новый ролик"))+'</button>',function(b){ b.onclick=function(){ go(null); }; }));
    list.forEach(function(p){ box.appendChild(el('<button class="btn w"><span data-nt></span><small>'+(p.clips||[]).length+' '+esc(TR("клипов"))+'</small></button>',function(b){ $("span",b).textContent=p.title||""; b.onclick=function(){ go(p); }; })); }); }); })
  .catch(function(){ toast(TR("Не получилось передать звук в монтаж")); }); }
$("#saveBtn").onclick=function(){ if(wide.matches) exportFile(); else openTab("save"); };

/* ═══════════ отмена ═══════════ */
var U=[], Rd=[];
function snap(){ return JSON.stringify({ clips:P.clips, gain:P.gain, speed:P.speed, fx:P.fx, fxAmt:P.fxAmt, eq:P.eq, xf:P.xf, master:P.master, nr:P.nr, bg:P.bg, duck:P.duck, bgFade:P.bgFade, mono:P.mono, fadeIn:P.fadeIn, fadeOut:P.fadeOut, scope:P.scope, sel:P.sel, ring:P.ring }); }
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
var TTL={ edit:"Правка", trk:"Дорожки", snd:"Звук", mast:"Мастеринг", save:"Сохранить", more:"Ещё" };
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
  ({ edit:paneEdit, trk:paneTrk, snd:paneSnd, mast:paneMast, more:paneMore })[ui.tab](box); box.scrollTop=sc; }
function tool(icon,name,sub,fn,cls){ return el('<button class="ztool'+(cls?" "+cls:"")+'"><span class="ic">'+sv(icon)+'</span><span>'+esc(name)+'<small>'+esc(sub)+'</small></span></button>',function(n){ n.onclick=fn; }); }
function paneEdit(box){
  box.appendChild(sh("Правка"));
  box.appendChild(tool("keep","Оставить выделенное","обрезать всё, что вокруг",doKeep));
  box.appendChild(tool("cut","Вырезать кусок","убрать выделенное из середины",doCut));
  box.appendChild(tool("fade","Плавное начало и конец","тяните розовые точки на волне",function(){ remember(); if(!P.fadeIn) P.fadeIn=1; if(!P.fadeOut) P.fadeOut=2; fixSel(); draw(); save(); refreshInsp(); if(!wide.matches) openInsp(); }));
  box.appendChild(tool("sil","Убрать тишину","паузы в начале, конце и между фразами",doSilence));
  box.appendChild(tool("ring","Лучший кусок","ищет припев: три варианта на выбор",function(){ findBest(P.ring||30); if(!wide.matches) openInsp(); }));
  box.appendChild(tool("mic","Улучшить голос","шум, гул и ровная громкость одной кнопкой",voiceFix));
  box.appendChild(sh("Выделенный кусок"));
  if(P.sel){ var o=rangeProps(P.sel[0],P.sel[1]);
    box.appendChild(range(TR("Громкость куска"),o.mute?-24:(o.g||0),-24,12,.5,function(v){ return (v>0?"+":"")+v+" "+TR("дБ"); },function(){},function(v){ if(!P.sel) return; applyRange(P.sel[0],P.sel[1],function(q){ delete q.mute; if(v) q.g=v; else delete q.g; }); render(); save(); refresh(); }));
    box.appendChild(el('<div class="row zrow"><button class="btn'+(o.mute?" on":"")+'">'+esc(TR("Заглушить"))+'</button><button class="btn'+(o.rev?" on":"")+'">'+esc(TR("Задом наперёд"))+'</button></div>',function(r){ var b=$$("button",r);
      b[0].onclick=function(){ selOp(function(q){ if(o.mute) delete q.mute; else q.mute=1; }); }; b[1].onclick=function(){ selOp(function(q){ if(o.rev) delete q.rev; else q.rev=1; }); }; }));
    box.appendChild(choice(TR("Эффект только здесь"),Object.keys(FX).map(function(k){ return [k,TR(FX[k])]; }),o.fx||"none",function(v){ selOp(function(q){ if(v==="none") delete q.fx; else q.fx=v; }); }));
    if(o.g||o.mute||o.rev||o.fx) box.appendChild(el('<button class="btn w">'+esc(TR("Сбросить правки куска"))+'</button>',function(n){ n.onclick=selClear; })); }
  else box.appendChild(el('<p class="note" style="margin-bottom:8px">'+esc(TR("Выделите место на волне, и его можно будет сделать тише или громче, заглушить, развернуть задом наперёд или дать эффект только ему."))+'</p>'));
  box.appendChild(sh("Куски"));
  if(selClip>=0&&P.clips[selClip]){ var c=P.clips[selClip];
    box.appendChild(el('<div class="li"><div class="lh"><b data-nt></b><button data-a="l" title="'+esc(TR("Раньше"))+'">'+sv("l")+'</button><button data-a="r" title="'+esc(TR("Позже"))+'">'+sv("r")+'</button><button data-a="x" title="'+esc(TR("Удалить кусок"))+'">'+sv("x")+'</button></div></div>',function(n){
      $("b",n).textContent=c.name; $("[data-a=l]",n).onclick=function(){ moveClip(selClip,-1); }; $("[data-a=r]",n).onclick=function(){ moveClip(selClip,1); }; $("[data-a=x]",n).onclick=function(){ delClip(selClip); }; })); }
  else box.appendChild(el('<p class="note" style="margin-bottom:8px">Нажмите на кусок под волной, чтобы выделить его, поменять местами или убрать.</p>'));
  box.appendChild(tool("mic","Записать с микрофона","новый кусок в конец",record,"red"));
  box.appendChild(tool("add","Ещё файл","склеить треки по очереди",pickFile));
  box.appendChild(tool("sil","Пауза","2 секунды тишины в конец, кусок можно передвинуть",addPause));
  if(P.clips.length>1) box.appendChild(range(TR("Плавные стыки между кусками"),P.xf||0,0,3,.1,function(v){ return sec(v); },function(v){ P.xf=v; },function(){ render(); save(); }));
}
function paneSnd(box){
  box.appendChild(sh("Громкость"));
  var pk=peakDb();
  box.appendChild(range(TR("Громкость"),P.gain,-20,20,.5,function(v){ return (v>0?"+":"")+v+" "+TR("дБ"); },function(v){ P.gain=v; },function(){ render(); save(); }));
  box.appendChild(el('<div><div class="meter"><i style="left:'+Math.max(0,Math.min(100,(pk+30)/30*100))+'%"></i></div><div class="mnote'+(pk>-.1?" bad":"")+'">'+esc(pk>-.1?TR("пик {0} дБ: громче нельзя, звук будет хрипеть",pk.toFixed(1)):TR("пик {0} дБ",pk>-90?pk.toFixed(1):"-"))+'</div></div>'));
  box.appendChild(el('<button class="btn w">Выровнять громкость<small>до -1 дБ</small></button>',function(n){ n.onclick=normalize; }));
  box.appendChild(sh("Скорость"));
  box.appendChild(choice("",[["0.5","0.5x"],["0.75","0.75x"],["1","1x"],["1.25","1.25x"],["1.5","1.5x"],["2","2x"]],String(P.speed),function(v){ remember(); var k=P.speed/ +v; P.speed=+v; if(P.sel) P.sel=[P.sel[0]*k,P.sel[1]*k]; cur*=k; render(); save(); }));
  box.appendChild(el('<p class="note" style="margin:-4px 0 10px">Быстрее звучит выше, медленнее ниже, как на пластинке.</p>'));
  box.appendChild(sh("Эффект"));
  box.appendChild(choice("",Object.keys(FX).map(function(k){ return [k,TR(FX[k])]; }),P.fx,function(v){ remember(); P.fx=v; render(); save(); refreshPane(); }));
  if(P.fx!=="none") box.appendChild(range(TR("Сила эффекта"),P.fxAmt==null?100:P.fxAmt,10,100,5,function(v){ return v+"%"; },function(v){ P.fxAmt=v; },function(){ render(); save(); }));
  box.appendChild(sh("Чистка голоса"));
  P.nr=P.nr||{ on:false, amt:50 };
  box.appendChild(toggle(TR("Убрать шум и гул"),!!P.nr.on,function(v){ remember(); P.nr.on=v; render(); save(); refreshPane(); }));
  if(P.nr.on){ box.appendChild(range(TR("Сила чистки"),P.nr.amt==null?50:P.nr.amt,10,100,5,function(v){ return v+"%"; },function(v){ P.nr.amt=v; },function(){ render(); save(); }));
    box.appendChild(el('<p class="note" style="margin:-4px 0 10px">'+esc(NRDB<-1?TR("Шум в паузах стал тише на {0} дБ.",Math.round(-NRDB)):TR("Шума в паузах не нашлось: чистить нечего."))+' '+esc(TR("Шум редактор узнаёт сам по паузам между фразами. Ровное шипение и гул уходят хорошо, шум улицы и музыка на фоне нет. Чем сильнее чистка, тем заметнее она на самом голосе."))+'</p>')); }
  box.appendChild(sh("Эквалайзер"));
  P.eq=P.eq||[0,0,0,0,0];
  EQF.forEach(function(b,i){ box.appendChild(range((b[1]>=1000?b[1]/1000+" "+TR("кГц"):b[1]+" "+TR("Гц"))+" · "+TR(b[2]),P.eq[i]||0,-12,12,.5,function(v){ return (v>0?"+":"")+v+" "+TR("дБ"); },function(v){ P.eq[i]=v; },function(){ render(); save(); })); });
  if(P.eq.some(function(v){ return v; })) box.appendChild(el('<button class="btn w">'+esc(TR("Сбросить эквалайзер"))+'</button>',function(n){ n.onclick=function(){ remember(); P.eq=[0,0,0,0,0]; render(); save(); refreshPane(); }; }));
}
/* ═══════════ подложка: вторая дорожка под основной ═══════════ */
var selB=null, bgSig="", BGP={}, JUSTB=0;
function bgOf(id){ var l=P.bg||[]; for(var i=0;i<l.length;i++) if(l[i].id===id) return l[i]; return null; }
function bgRows(){ var tr=(P.bg||[]).slice().sort(function(a,b){ return a.at-b.at; }), ends=[], row={}; tr.forEach(function(k){ var r=0; while(r<ends.length&&ends[r]>k.at+.01) r++; ends[r]=k.at+k.len; row[k.id]=r; }); return { row:row, n:Math.max(1,ends.length) }; }
function bgPk(aid){ if(BGP[aid]!==undefined) return Promise.resolve(BGP[aid]); return decode(aid).then(function(b){ var n=Math.max(200,Math.min(2400,Math.ceil(b.duration*5))), a=b.getChannelData(0), per=a.length/n, cv=document.createElement("canvas"); cv.width=n; cv.height=40; var g=cv.getContext("2d"); g.fillStyle="rgba(207,194,255,.5)";
    for(var i=0;i<n;i++){ var m=0, e=Math.min(a.length,Math.floor((i+1)*per)), st=Math.max(1,Math.floor(per/200)); for(var j=Math.floor(i*per);j<e;j+=st){ var v=a[j]<0?-a[j]:a[j]; if(v>m) m=v; } var h=Math.max(1,Math.sqrt(m)*38); g.fillRect(i,20-h/2,1,h); } BGP[aid]=cv.toDataURL(); return BGP[aid]; }).catch(function(){ BGP[aid]=""; return ""; }); }
/* блоки подложки под волной, в том же масштабе и прокрутке, что и волна */
function bgUi(force){ var box=$("#bgl"); if(!P||!P.bg||!P.bg.length||!MIX){ if(!box.hidden){ box.hidden=true; box.innerHTML=""; } bgSig=""; return; }
  var W=wc.clientWidth, Tt=T(), sig=[V.t0,V.len,W,selB,Tt,JSON.stringify(P.bg)].join("|"); if(sig===bgSig&&!force) return; bgSig=sig; box.hidden=false; box.innerHTML=""; var R=bgRows(); box.style.height=(R.n*28)+"px";
  P.bg.forEach(function(k){ var x=xOf(k.at), w=k.len/V.len*W; if(x+w<-2||x>W+2) return;
    var b=el('<div class="bgb'+(selB===k.id?" on":"")+(k.loop?" lp":"")+'" style="left:'+x.toFixed(1)+'px;top:'+(R.row[k.id]*28)+'px;width:'+Math.max(10,w-1).toFixed(1)+'px"><i class="l"></i><span data-nt></span><i class="r"></i></div>');
    $("span",b).textContent=k.name; bgPk(k.aid).then(function(u){ if(u){ b.style.backgroundImage="url('"+u+"')"; b.style.backgroundSize=(k.dur/V.len*W).toFixed(1)+"px 100%"; b.style.backgroundPosition=(-(k.in||0)/V.len*W).toFixed(1)+"px 0"; } });
    b.onpointerdown=function(e){ if(e.pointerType!=="mouse"&&selB!==k.id) return; e.preventDefault(); bgDrag(e,k,e.target.classList.contains("l")?"l":e.target.classList.contains("r")?"r":"m"); };
    b.onclick=function(){ if(Date.now()-JUSTB<350) return; if(selB!==k.id) selectB(k.id); };
    box.appendChild(b); });
  var xe=xOf(Tt); if(xe<W-1) box.appendChild(el('<i class="dim" style="left:'+Math.max(0,xe).toFixed(1)+'px"></i>')); }
function selectB(id){ selB=id; bgUi(true); if(wide.matches&&ui.tab!=="trk") openTab("trk"); else refreshPane(); }
/* блок: середина двигает, левый край срезает начало, правый конец; края липнут к началу, концу, курсору, выделению и другим блокам */
function bgDrag(e,k,mode){ var x0=e.clientX, moved=false, a0=k.at, i0=k.in||0, l0=k.len, pps=wc.clientWidth/V.len, Tt=T(), sn=[0,Tt,cur]; if(P.sel) sn=sn.concat(P.sel); P.bg.forEach(function(o){ if(o!==k){ sn.push(o.at); sn.push(o.at+o.len); } });
  function snap(v){ var best=v, bd=7/pps; sn.forEach(function(q){ var d=Math.abs(q-v); if(d<bd){ bd=d; best=q; } }); return best; }
  function mv(ev){ var d=(ev.clientX-x0)/pps; if(!moved){ if(Math.abs(ev.clientX-x0)<4) return; moved=true; remember(); }
    if(mode==="l"){ var na=snap(a0+d), dd=Math.max(Math.max(-i0,-a0),Math.min(na-a0,l0-.3)); if(k.loop) dd=Math.max(-a0,Math.min(na-a0,l0-.3)); k.at=a0+dd; k.len=l0-dd; if(!k.loop) k.in=i0+dd; }
    else if(mode==="r"){ var nl=snap(a0+l0+d)-a0; k.len=Math.max(.3,k.loop?nl:Math.min(nl,k.dur-i0)); }
    else { var n=Math.max(0,a0+d), s1=snap(n), s2=snap(n+l0); k.at=Math.max(0,s1!==n?s1:s2!==n+l0?s2-l0:n); }
    bgUi(true); }
  function up(){ removeEventListener("pointermove",mv); removeEventListener("pointerup",up); removeEventListener("pointercancel",up); if(moved){ JUSTB=Date.now(); selB=k.id; render(); save(); refresh(); bgUi(true); } else if(selB!==k.id) selectB(k.id); }
  addEventListener("pointermove",mv); addEventListener("pointerup",up); addEventListener("pointercancel",up); }
function pickBg(){ var f=$("#fIn"); f.value=""; f.onchange=function(){ addBg([].slice.call(f.files)); }; f.click(); }
function addBg(files){ if(!files.length||!P) return; var chain2=Promise.resolve(), n=0;
  files.forEach(function(file){ chain2=chain2.then(function(){ var aid=newId("a"); toast(TR("Открываю файл...")); return bPut(aid,file).then(function(){ return decode(aid); }).then(function(b){ if(!n) remember(); n++; P.bg=P.bg||[]; var Tt=total();
      var k={ id:newId("b"), aid:aid, name:file.name.replace(/\.[^.]+$/,"").slice(0,60), at:0, in:0, len:Tt>0?Math.min(b.duration,Tt):b.duration, dur:b.duration, vol:-8, fi:0, fo:0, loop:false }; P.bg.push(k); selB=k.id; })
    .catch(function(){ tx("blobs","readwrite",function(s){ s.delete(aid); }).catch(function(){}); toast(TR("Этот файл браузер прочитать не смог")); }); }); });
  chain2.then(function(){ if(!n) return; render(); save(); refresh(); toast(TR("Подложка добавлена: {0}",n)); }); }
function paneTrk(box){ P.bg=P.bg||[]; P.duck=P.duck||{ on:true, depth:12 }; var Tt=total();
  box.appendChild(sh("Подложка"));
  box.appendChild(el('<p class="note" style="margin-bottom:10px">'+esc(TR("Вторая дорожка играет под основной: музыка под голос, бит под запись. Основная дорожка это та, что на волне, её вы режете и правите."))+'</p>'));
  P.bg.forEach(function(k){ box.appendChild(el('<button class="zbg'+(selB===k.id?" on":"")+'"><span class="ic">'+sv("ring")+'</span><b data-nt></b><small>'+tm(k.at,0)+' · '+tm(k.len,0)+'</small></button>',function(r){ $("b",r).textContent=k.name; r.onclick=function(){ selectB(k.id); }; })); });
  box.appendChild(el('<button class="btn w">'+sv("file")+'<span>'+esc(TR("Добавить подложку"))+'</span><small>MP3, WAV</small></button>',function(n){ n.onclick=pickBg; }));
  if(!P.clips.length&&P.bg.length) box.appendChild(el('<p class="note" style="margin-bottom:10px">'+esc(TR("Подложка зазвучит, когда появится основная дорожка: откройте файл или запишите голос."))+'</p>'));
  var k=selB&&bgOf(selB);
  if(k){ box.appendChild(el('<div class="sh"><span data-nt></span></div>',function(h){ $("span",h).textContent=k.name; }));
    function go(){ render(); save(); bgUi(true); }
    box.appendChild(range(TR("Громкость"),k.vol==null?-8:k.vol,-30,6,.5,function(v){ return (v>0?"+":"")+v+" "+TR("дБ"); },function(v){ k.vol=v; },go));
    box.appendChild(range(TR("Место на дорожке"),Math.round(k.at*10)/10,0,Math.max(1,Math.ceil(Math.max(Tt,k.at+1))),.1,function(v){ return tm(v); },function(v){ k.at=v; bgUi(true); },go));
    if(!k.loop) box.appendChild(range(TR("Начать файл с"),Math.round((k.in||0)*10)/10,0,Math.max(.1,Math.floor((k.dur-.3)*10)/10),.1,function(v){ return tm(v); },function(v){ k.in=v; k.len=Math.min(k.len,Math.max(.3,k.dur-v)); bgUi(true); },function(){ go(); refreshPane(); }));
    box.appendChild(el('<div class="row zrow"><button class="btn">'+esc(TR("В начало"))+'</button><button class="btn">'+esc(TR("До конца"))+'</button><button class="btn del" title="'+esc(TR("Убрать подложку"))+'">'+sv("x")+'</button></div>',function(r){ var b=$$("button",r);
      b[0].onclick=function(){ remember(); k.at=0; go(); refreshPane(); };
      b[1].onclick=function(){ if(Tt-k.at<.3){ toast(TR("Подложка стоит правее конца дорожки")); return; } remember(); k.len=k.loop?Tt-k.at:Math.max(.3,Math.min(Tt-k.at,k.dur-(k.in||0))); go(); refreshPane(); if(!k.loop&&k.len<Tt-k.at-.1) toast(TR("Файл короче дорожки: включите повтор по кругу")); };
      b[2].onclick=function(){ remember(); P.bg=P.bg.filter(function(o){ return o!==k; }); selB=null; go(); refreshPane(); }; }));
    box.appendChild(toggle(TR("Повторять по кругу"),!!k.loop,function(v){ remember(); k.loop=v; if(v) k.in=0; else k.len=Math.min(k.len,k.dur); go(); refreshPane(); }));
    box.appendChild(range(TR("Плавное начало"),k.fi||0,0,6,.5,function(v){ return sec(v); },function(v){ k.fi=v; },go));
    box.appendChild(range(TR("Плавный конец"),k.fo||0,0,6,.5,function(v){ return sec(v); },function(v){ k.fo=v; },go)); }
  if(P.bg.length){ box.appendChild(sh("Под основной дорожкой"));
    box.appendChild(toggle(TR("Приглушать подложку под голосом"),P.duck.on!==false,function(v){ remember(); P.duck.on=v; render(); save(); refreshPane(); }));
    if(P.duck.on!==false) box.appendChild(range(TR("Насколько приглушать"),P.duck.depth||12,3,24,1,function(v){ return "-"+v+" "+TR("дБ"); },function(v){ P.duck.depth=v; },function(){ render(); save(); }));
    box.appendChild(toggle(TR("Плавно убрать подложку в конце"),P.bgFade!==false,function(v){ remember(); P.bgFade=v; render(); save(); }));
    box.appendChild(el('<p class="note" style="margin-top:6px">'+esc(TR("Блок подложки под волной можно двигать мышкой, края обрезают начало и конец. Эффект, эквалайзер и чистка действуют на основную дорожку, мастеринг на всё вместе. Чтобы музыка играла до голоса или после него, добавьте паузу в основную дорожку."))+'</p>')); }
}
/* мастеринг: пресет, сила, громкость файла, цифры до и после, честное сравнение */
function lu(v){ return v>-70?v.toFixed(1)+" LUFS":"-"; }
function paneMast(box){ var M=P.master=P.master||{ on:false, preset:"clean", amt:100, target:null }, S=MAST[M.preset]||MAST.clean, tg=M.target==null?S.target:M.target;
  function set(fn){ remember(); fn(); if(!M.on) AB=null; render(); save(); refreshPane(); }
  box.appendChild(sh("Мастеринг"));
  box.appendChild(toggle(TR("Обработать трек"),!!M.on,function(v){ set(function(){ M.on=v; }); }));
  box.appendChild(el('<div class="zmp'+(M.on?"":" off")+'"></div>',function(g){ Object.keys(MAST).forEach(function(k){ var q=MAST[k]; g.appendChild(el('<button class="'+(M.preset===k?"on":"")+'"><b>'+esc(TR(q.n))+'</b><small>'+esc(TR(q.d))+'</small></button>',function(b){ b.onclick=function(){ set(function(){ M.on=true; M.preset=k; M.target=null; }); }; })); }); }));
  if(M.on){
    box.appendChild(range(TR("Сила обработки"),M.amt==null?100:M.amt,0,150,5,function(v){ return v+"%"; },function(v){ M.amt=v; },function(){ render(); save(); }));
    box.appendChild(el('<div class="f"><label>'+esc(TR("Громкость файла"))+'</label><div class="zld"></div></div>',function(f){ var g=$(".zld",f); LOUD.forEach(function(l){ g.appendChild(el('<button class="'+(tg===l[0]?"on":"")+'"><b>'+l[1]+'</b><small>'+esc(TR(l[2]))+'</small></button>',function(b){ b.onclick=function(){ set(function(){ M.target=l[0]; }); }; })); }); })); }
  if(STAT&&MIX){ var miss=M.on&&STAT.outL<tg-.7;
    box.appendChild(el('<div class="zlu"><div><small>'+esc(TR(M.on?"было":"сейчас"))+'</small><b>'+lu(STAT.inL)+'</b><span>'+esc(TR("пик {0} дБ",STAT.inPk>-90?STAT.inPk.toFixed(1):"-"))+'</span></div>'+(M.on?'<div class="on"><small>'+esc(TR("стало"))+'</small><b>'+lu(STAT.outL)+'</b><span>'+esc(TR("пик {0} дБ",STAT.outPk.toFixed(1)))+'</span></div>':'')+'</div>'));
    if(miss) box.appendChild(el('<p class="note" style="margin:-2px 0 10px">'+esc(TR("До выбранной громкости трек не дотянулся: дальше пришлось бы ломать звук. Так бывает с очень неровными записями."))+'</p>')); }
  if(M.on&&MIX){
    box.appendChild(el('<div class="f"><label>'+esc(TR("Сравнить"))+'</label><div class="chips"><button data-v="">'+esc(TR("как в файле"))+'</button><button data-v="post">'+esc(TR("после"))+'</button><button data-v="pre">'+esc(TR("до"))+'</button></div></div>',function(f){ $$("button",f).forEach(function(b){ var v=b.getAttribute("data-v")||null; b.classList.toggle("on",AB===v);
      b.onclick=function(){ AB=v; $$("button",f).forEach(function(y){ y.classList.toggle("on",y===b); }); if(play.on) restartPlay(); else startPlay(cur); }; }); }));
    box.appendChild(el('<p class="note" style="margin:-4px 0 10px">'+esc(TR("«До» и «после» играют на одинаковой громкости, иначе громкий вариант всегда кажется лучше. В файл пойдёт полная громкость."))+'</p>')); }
  box.appendChild(el('<p class="note">'+esc(TR("Мастеринг делает готовый трек ровнее, плотнее и нужной громкости. Плохую запись или сведение он не исправит. LUFS это громкость на слух: площадки сами приглушают всё, что громче -14."))+'</p>'));
}
function paneMore(box){
  box.appendChild(el('<div class="f"><label>Название</label><input type="text" maxlength="80"></div>',function(n){ var i=$("input",n); i.value=P.title||""; i.oninput=function(){ P.title=i.value; $("#title").value=i.value; save(); }; }));
  box.appendChild(el('<button class="btn w">'+esc(TR("Узнать темп"))+'<small>'+(P.bpm&&P.bpmN===rendN?"≈ "+P.bpm+" BPM":"BPM")+'</small></button>',function(n){ n.onclick=bpmGo; }));
  box.appendChild(el('<button class="btn w">Сделать копию</button>',function(n){ n.onclick=function(){ var c=JSON.parse(JSON.stringify(P)); c.id=newId(); c.title=TR("{0} (копия)",P.title||""); c.updated=Date.now(); pPut(c).then(function(){ openP(c); toast(TR("Открыта копия")); }); }; }));
  box.appendChild(el('<button class="btn w del">Удалить звук</button>',function(n){ n.onclick=function(){ ask(TR("Удалить «{0}»? Вернуть не получится.",P.title||""),TR("Удалить")).then(function(y){ if(y){ var p=P; stopPlay(); pDel(p).then(function(){ P=null; showHome(); }); } }); }; }));
  box.appendChild(el('<p class="note" style="margin-top:8px">Звук и все правки сохраняются в этом браузере сами. Исходный файл не меняется: любую правку можно отменить.</p>'));
}
function refreshInsp(){
  if(!P) return; if(!wide.matches&&ui.sheet!=="insp") return; var sc0=insp.scrollTop; insp.innerHTML="";
  if(wide.matches) $("#shTitle").textContent=TR("Сохранить");
  insp.appendChild(choice(TR("Что сохраняем"),[["all",TR("весь трек")],["sel",TR("выделенное"),!P.sel]],P.sel?P.scope:"all",function(v){ remember(); P.scope=v; fixSel(); draw(); save(); refreshInsp(); }));
  insp.appendChild(choice(TR("Рингтон"),[["15","15 "+TR("с")],["30","30 "+TR("с")],["40","40 "+TR("с")],["0",TR("своя длина")]],String(P.ring||0),function(v){ if(+v) ringAt(+v); else { P.ring=0; save(); } }));
  if(bestValid()){ insp.appendChild(el('<label class="olab2">'+esc(TR("Лучший кусок"))+'</label>'));
    BEST.c.forEach(function(c,i){ var on=P.sel&&Math.abs(P.sel[0]-c.a)<.05&&Math.abs(P.sel[1]-c.b)<.05;
      insp.appendChild(el('<button class="zbest'+(on?" on":"")+'"><i style="background:'+["#ff9a4d","#ff5fa2","#a78bfa"][i]+'">'+(i+1)+'</i><span>'+tm(c.a,0)+' - '+tm(c.b,0)+'<small>'+esc(TR(c.why))+'</small></span><b>'+sv("play")+'</b></button>',function(n){ n.onclick=function(){ useBest(i); }; })); });
    insp.appendChild(el('<p class="note" style="margin:2px 0 12px">Нажмите вариант, он заиграет по кругу. Выделение можно сдвинуть по волне, длина сохранится.</p>')); }
  else if(MIX&&T()>40) insp.appendChild(el('<button class="btn w">'+sv("ring")+'<span>'+esc(TR("Найти лучший кусок"))+'</span><small>'+esc(TR("3 варианта"))+'</small></button>',function(n){ n.onclick=function(){ findBest(P.ring||30); }; }));
  if(P.ring&&!bestValid()) insp.appendChild(el('<p class="note" style="margin:-4px 0 12px">Двигайте выделение по волне: оно играет по кругу. Длина держится, пока сами не потянете край.</p>'));
  var sc=scope(), half=Math.max(.5,(sc[1]-sc[0])/2);
  insp.appendChild(range(TR("Плавное начало"),Math.round(Math.min(P.fadeIn,half)*10)/10,0,Math.min(10,Math.floor(half*10)/10),.1,function(v){ return sec(v); },function(v){ P.fadeIn=v; draw(); },function(){ save(); if(play.on) restartPlay(); }));
  insp.appendChild(range(TR("Плавный конец"),Math.round(Math.min(P.fadeOut,half)*10)/10,0,Math.min(10,Math.floor(half*10)/10),.1,function(v){ return sec(v); },function(v){ P.fadeOut=v; draw(); },function(){ save(); if(play.on) restartPlay(); }));
  insp.appendChild(toggle(TR("Моно (файл меньше)"),!!P.mono,function(v){ P.mono=v; save(); refreshInsp(); }));
  insp.appendChild(sh("Формат"));
  insp.appendChild(choice("",[["mp3320","MP3 320"],["mp3192","MP3 192"],["mp3128","MP3 128"],["wav","WAV"],["wav24",TR("WAV 24 бит")],["m4r",TR("для iPhone"),!M4R]],P.fmt,function(v){ P.fmt=v; save(); refreshInsp(); }));
  if(!M4R) insp.appendChild(el('<p class="note" style="margin:-4px 0 10px">Рингтон для iPhone (m4r) этот браузер собрать не умеет. Обычно это получается в Safari на iPhone или Mac.</p>'));
  var L=sc[1]-sc[0];
  insp.appendChild(el('<button class="btn go w" style="justify-content:center">'+esc(P.ring?TR("Скачать рингтон"):TR("Скачать файл"))+'<small style="margin-left:8px;color:#06231f">'+tm(L)+' · ~'+kb(estSize())+'</small></button>',function(n){ n.onclick=exportFile; n.disabled=!MIX; }));
  insp.appendChild(el('<button class="btn w" style="margin-top:8px">'+sv("add")+'<span>'+esc(TR("В монтаж"))+'</span><small>'+esc(TR("музыкой в ролик"))+'</small></button>',function(n){ n.onclick=toMontage; n.disabled=!MIX; }));
  insp.appendChild(el('<p class="note">Звук обрабатывается на этом устройстве, файл никуда не отправляется.</p>'));
  insp.scrollTop=sc0;
}

/* ═══════════ окна, клавиши ═══════════ */
function modal(h){ $("#mbox").innerHTML=h; $("#modal").classList.add("on"); }
function closeModal(){ $("#modal").classList.remove("on"); }
$("#modal").addEventListener("click",function(e){ if(e.target.closest("[data-close]")) closeModal(); });
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
  if(k==="escape"&&P&&P.sel){ P.sel=null; if(P.scope==="sel") P.scope="all"; draw(); timeUi(); refresh(); }
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
   ["ring","Рингтон из песни","Найдёт припев и предложит три куска по 30 секунд, края будут плавными.",function(){ ringNext=true; pickFile(); }],
   ["mic","Записать голос","Поздравление, заметка, кусок для подкаста. Паузы потом можно убрать одной кнопкой.",function(){ record(); },"red"]].forEach(function(s){
    st.appendChild(el('<button class="zs'+(s[4]?" "+s[4]:"")+'">'+sv(s[0])+'<b>'+esc(s[1])+'</b><small>'+esc(s[2])+'</small></button>',function(n){ n.onclick=s[3]; })); });
}
var ringNext=false;
function create(p){ return pPut(p).catch(function(){}).then(function(){ openP(p); }); }
function openP(p){
  stopPlay(); P=p; P.clips=P.clips||[]; P.eq=P.eq||[0,0,0,0,0]; if(P.fxAmt==null) P.fxAmt=100; P.xf=P.xf||0; P.master=P.master||{ on:false, preset:"clean", amt:100, target:null }; P.nr=P.nr||{ on:false, amt:50 }; P.bg=P.bg||[]; P.duck=P.duck||{ on:true, depth:12 }; if(P.bgFade==null) P.bgFade=true; selB=null; bgSig=""; AB=null; PRE=null; STAT=null; ENV=null; U=[]; Rd=[]; undoBtns(); selClip=-1; cur=0; V={ t0:0, len:0 }; MIX=null; PK=null; $("#zoom").value=0;
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
