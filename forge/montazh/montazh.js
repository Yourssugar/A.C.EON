/* FORGE монтаж коротких роликов.
   Ролик = клипы по очереди (фото или видео) + текст на клипе + переходы + музыкальные дорожки.
   Всё рисуется на canvas: превью и сборка видео идут одним и тем же кодом (draw), поэтому файл выходит таким же, как превью.
   Сборка в реальном времени: canvas.captureStream + звук через Web Audio в MediaRecorder (ролик 1 мин = 1 мин сборки).
   Музыка играет через <audio>, а не через раскодированный буфер: так WAV на 100 МБ не занимает 200 МБ памяти.
   Исходные файлы лежат в IndexedDB «forge-montazh» (blobs), проект в projects. */
(function(){
"use strict";
var $=function(s,r){ return (r||document).querySelector(s); };
var $$=function(s,r){ return [].slice.call((r||document).querySelectorAll(s)); };
var wide=matchMedia("(min-width:960px)");
function el(html, fn){ var d=document.createElement("div"); d.innerHTML=html.trim(); var n=d.firstElementChild; if(fn) fn(n); return n; }
function sh(t){ return el('<div class="sh">'+esc(TR(t))+'</div>'); }
function note(t){ return el('<p class="note" style="margin:-2px 0 10px">'+esc(t)+'</p>'); }
function choice(label, opts, cur, fn){ return el('<div class="f">'+(label?'<label>'+esc(label)+'</label>':'')+'<div class="chips">'+opts.map(function(o){ return '<button data-v="'+o[0]+'" class="'+(String(o[0])===String(cur)?"on":"")+'">'+esc(o[1])+'</button>'; }).join("")+'</div></div>',function(n){
  $$("button",n).forEach(function(x){ x.onclick=function(){ $$("button",n).forEach(function(y){ y.classList.toggle("on",y===x); }); fn(x.getAttribute("data-v")); }; }); }); }
function range(label,v,min,max,step,fmt,fn,done){ return el('<div class="f"><div class="lab"><span>'+esc(label)+'</span><output>'+fmt(v)+'</output></div><input type="range" min="'+min+'" max="'+max+'" step="'+step+'" value="'+v+'"></div>',function(n){
  var o=$("output",n), i=$("input",n), first=true; i.oninput=function(){ if(first){ first=false; remember(); } o.textContent=fmt(Number(i.value)); fn(Number(i.value)); }; i.onchange=function(){ first=true; save(); if(done) done(Number(i.value)); }; }); }
function toggle(label,v,fn){ return el('<label class="tg"><span>'+esc(label)+'</span><input type="checkbox"'+(v?" checked":"")+'></label>',function(n){ $("input",n).onchange=function(){ fn(this.checked); }; }); }
function pick1(label,opts,cur,fn){ return el('<div class="f"><label>'+esc(label)+'</label><select>'+opts.map(function(o){ return '<option value="'+o[0]+'"'+(String(o[0])===String(cur)?" selected":"")+'>'+esc(o[1])+'</option>'; }).join("")+'</select></div>',function(n){ $("select",n).onchange=function(){ fn(this.value); }; }); }
var SV={ img:"M4 5h16v14H4zM4 15l4-4 5 5 3-3 4 4", vid:"M3 6h13v12H3zM16 10l5-3v10l-5-3", add:"M12 5v14M5 12h14", x:"M6 6l12 12M18 6L6 18", l:"M15 5l-7 7 7 7", r:"M9 5l7 7-7 7", dup:"M8 8h12v12H8zM4 16V4h12",
  file:"M14 3H6v18h12V7zM14 3v4h4", mus:"M9 18V5l11-2v13M9 18a3 3 0 11-6 0 3 3 0 016 0zM20 16a3 3 0 11-6 0 3 3 0 016 0z", txt:"M5 6h14M12 6v13M9 19h6", wand:"M15 4l5 5L9 20l-5-5zM13 6l5 5", key:"M12 4l8 8-8 8-8-8z", cut:"M6 9a3 3 0 100-6 3 3 0 000 6zM6 21a3 3 0 100-6 3 3 0 000 6zM20 4L8.1 15.9M14.5 14.5L20 20M8.1 8.1L12 12",
  snd:"M4 9h4l5-4v14l-5-4H4zM16 9a4 4 0 010 6M18.5 6.5a8 8 0 010 11", mute:"M4 9h4l5-4v14l-5-4H4zM16 9l5 6M21 9l-5 6" };
function sv(n){ return '<svg viewBox="0 0 24 24"><path d="'+SV[n]+'"/></svg>'; }
function tm(s){ s=Math.max(0,s||0); var m=Math.floor(s/60), r=s-m*60; return m+":"+r.toFixed(1).padStart(4,"0"); }
function tms(s){ s=Math.max(0,Math.round(s||0)); return Math.floor(s/60)+":"+String(s%60).padStart(2,"0"); }
function clamp(x,a,b){ return x<a?a:x>b?b:x; }
function rnd(n){ var x=Math.sin(n*127.1+311.7)*43758.5453; return x-Math.floor(x); }
function sec(v){ return v.toFixed(1)+" "+TR("с"); }
function pct(v){ return v+"%"; }
var F=window.FONY;

/* ═══════════ хранение ═══════════ */
var dbp=null;
function db(){ if(dbp) return dbp; dbp=new Promise(function(res,rej){ try{ var r=indexedDB.open("forge-montazh",1);
  r.onupgradeneeded=function(){ r.result.createObjectStore("projects",{keyPath:"id"}); r.result.createObjectStore("blobs"); };
  r.onsuccess=function(){ res(r.result); }; r.onerror=function(){ rej(r.error); }; }catch(e){ rej(e); } }).catch(function(){ return null; }); return dbp; }
function tx(store,mode,fn){ return db().then(function(d){ if(!d) throw new Error("nodb"); return new Promise(function(res,rej){ var t=d.transaction(store,mode), s=t.objectStore(store), out=fn(s);
  t.oncomplete=function(){ res(out&&out.result!==undefined?out.result:undefined); }; t.onerror=function(){ rej(t.error); }; t.onabort=function(){ rej(t.error); }; }); }); }
function pAll(){ return tx("projects","readonly",function(s){ return s.getAll(); }).catch(function(){ return []; }); }
function pGet(id){ return tx("projects","readonly",function(s){ return s.get(id); }).catch(function(){ return null; }); }
function pPut(p){ return tx("projects","readwrite",function(s){ s.put(p); }); }
function aids(p){ var a=(p.clips||[]).map(function(c){ return c.aid; }); (p.tracks||[]).forEach(function(k){ a.push(k.aid); }); if(p.music) a.push(p.music.aid); return a; }
function pDel(p){ return tx("projects","readwrite",function(s){ s.delete(p.id); }).then(pAll).then(function(all){ var u={}; all.forEach(function(q){ aids(q).forEach(function(a){ u[a]=1; }); });
  return tx("blobs","readwrite",function(s){ aids(p).forEach(function(a){ if(!u[a]){ s.delete(a); s.delete(a+":pk"); } }); }); }); }
function bPut(aid,b){ return tx("blobs","readwrite",function(s){ s.put(b,aid); }); }
function bGet(aid){ return tx("blobs","readonly",function(s){ return s.get(aid); }).catch(function(){ return null; }); }
function bDel(aid){ return tx("blobs","readwrite",function(s){ s.delete(aid); }).catch(function(){}); }
function newId(p){ return (p||"m")+Date.now().toString(36)+Math.random().toString(36).slice(2,6); }
var URLS={}; function blobUrl(aid){ if(!aid) return Promise.resolve(""); if(URLS[aid]) return Promise.resolve(URLS[aid]); return bGet(aid).then(function(b){ if(!b) return ""; URLS[aid]=URL.createObjectURL(b); return URLS[aid]; }); }

/* ═══════════ формат, стиль, цвет, переходы ═══════════ */
var FMT={ "9x16":{ pv:[540,960], ex:{ 720:[720,1280], 1080:[1080,1920] }, n:"вертикальный 9:16", d:"сторис, шортс, рилс" },
  "1x1":{ pv:[720,720], ex:{ 720:[720,720], 1080:[1080,1080] }, n:"квадрат 1:1", d:"лента соцсетей" },
  "16x9":{ pv:[960,540], ex:{ 720:[1280,720], 1080:[1920,1080] }, n:"горизонтальный 16:9", d:"YouTube, экран" } };
var STYLES={ smooth:{ n:"Плавно", tr:"fade", trd:.8, kb:"auto", filter:"warm", anim:"fade", dur:3.5 },
  dyn:{ n:"Динамично", tr:"slide", trd:.4, kb:"in", filter:"vivid", anim:"pop", dur:2.2 },
  retro:{ n:"Ретро", tr:"black", trd:.7, kb:"out", filter:"vintage", anim:"type", dur:3 },
  clean:{ n:"Чисто", tr:"none", trd:.5, kb:"none", filter:"none", anim:"up", dur:3 },
  cinema:{ n:"Кино", tr:"blur", trd:.9, kb:"in", filter:"cinema", anim:"fade", dur:4 },
  drive:{ n:"Драйв", tr:"glitch", trd:.35, kb:"in", filter:"neon", anim:"pop", dur:1.8 } };
/* цвет: [название, фильтр canvas, [цвет, сила, режим наложения], виньетка, зерно] */
var LOOKS={ none:["без фильтра",""], warm:["тёплый","saturate(1.1)",["#ff9a3c",.2,"soft-light"]], cold:["холодный","saturate(.95)",["#3c8cff",.2,"soft-light"]], vivid:["ярче","saturate(1.4) contrast(1.08)"],
  golden:["золотой час","saturate(1.15) brightness(1.04)",["#ffb000",.24,"soft-light"]], sunset:["закат","saturate(1.25) contrast(1.05)",["#ff4a2a",.26,"soft-light"]],
  cinema:["кино","contrast(1.15) saturate(.92) brightness(.96)",["#0e6a78",.24,"soft-light"],.35], drama:["драма","contrast(1.3) saturate(.85) brightness(.95)",null,.45],
  pastel:["пастель","saturate(.75) contrast(.9) brightness(1.1)",["#ffd9e6",.2,"soft-light"]], faded:["выцветший","saturate(.6) contrast(.88) brightness(1.06)",["#222a32",1,"lighten"]],
  polaroid:["полароид","contrast(.95) saturate(1.2) brightness(1.06) sepia(.12)",["#1c1622",1,"lighten"],.2], film:["плёнка","contrast(1.06) saturate(.95)",["#ff9a3c",.1,"soft-light"],.3,.22],
  vintage:["винтаж","sepia(.4) contrast(1.08) saturate(.85) brightness(.97)",null,.55,.12], sepia:["сепия","sepia(.85) contrast(1.05)"],
  bw:["чёрно-белый","grayscale(1) contrast(1.12)"], noir:["нуар","grayscale(1) contrast(1.4) brightness(.92)",null,.6,.14],
  forest:["лес","saturate(1.15) contrast(1.05)",["#1f8a3c",.2,"soft-light"]], frost:["мороз","saturate(.8) brightness(1.06) contrast(1.05)",["#9fd0ff",.28,"soft-light"]],
  rose:["розовый","saturate(1.1)",["#ff5fa2",.22,"soft-light"]], neon:["неон","saturate(1.7) contrast(1.15)",["#b400ff",.18,"soft-light"]] };
var TRS={ none:"без перехода", fade:"растворение", black:"через чёрный", white:"вспышка", blur:"размытие", slide:"сдвиг", slideup:"сдвиг вверх", cover:"наезд", zoom:"наплыв", spin:"вращение",
  wipe:"шторка", wipedown:"шторка вниз", iris:"круг", clock:"часы", blinds:"жалюзи", split:"створки", glitch:"глитч" };
var KBS={ none:"стоит", in:"приближение", out:"отдаление", left:"влево", right:"вправо", kf:"по точкам" };
var TSTY={ title:"заголовок", sub:"субтитр", label:"плашка" }, TPOS={ top:"сверху", mid:"по центру", bot:"снизу" }, TANI={ fade:"проявление", pop:"выскок", up:"снизу вверх", type:"печатная машинка" };
function newProject(fmt,style){ var S=STYLES[style||"smooth"]; return { v:3, id:newId(), title:TR("Новый ролик"), fmt:fmt||"9x16", style:style||"smooth", fit:"cover", filter:S.filter, adj:{}, tr:"none", trd:S.trd, anim:S.anim, clips:[], tracks:[], mfade:true, vvol:1, q:720, updated:Date.now() }; }
/* ролики первой версии: одна музыка превращается в дорожку, длину узнаем, когда файл откроется */
function migrate(p){ p.clips=p.clips||[]; p.tracks=p.tracks||[]; p.adj=p.adj||{};
  if(p.music){ p.tracks.push({ id:newId("t"), aid:p.music.aid, name:p.music.name||"", at:0, in:p.music.start||0, len:0, dur:0, vol:p.music.vol==null?.8:p.music.vol, fi:0, fo:0 }); p.mfade=p.music.fade!==false; delete p.music; }
  if(p.mfade==null) p.mfade=true; if(!LOOKS[p.filter]) p.filter="none";
  /* раньше был один переход на все стыки: переносим его на каждый стык, чтобы старый ролик выглядел как прежде */
  if((p.v||1)<3){ var g=TRS[p.tr]?p.tr:"fade"; p.clips.forEach(function(c,i){ if(i<p.clips.length-1&&!c.tr&&g!=="none") c.tr=g; }); }
  p.tr="none"; p.v=3; return p; }

/* ═══════════ проект и время ═══════════ */
var P=null;
function clen(c){ return c.type==="vid"?Math.max(.2,(c.out||0)-(c.in||0)):(c.dur||3); }
/* начала клипов с учётом переходов: следующий клип начинается раньше на длину перехода */
function TL(){ var s=[], d=[], t=0, cl=P?P.clips:[]; for(var i=0;i<cl.length;i++){ s.push(t); var tr=cl[i].tr||"none", dd=0;
    if(i<cl.length-1&&tr!=="none") dd=Math.min(cl[i].trd||P.trd||.6,clen(cl[i])/2,clen(cl[i+1])/2); d.push(dd); t+=clen(cl[i])-dd; }
  var total=cl.length?s[cl.length-1]+clen(cl[cl.length-1]):0; return { s:s, d:d, total:total }; }
function clipAt(t){ var L=TL(), k=0; for(var i=0;i<P.clips.length;i++) if(t>=L.s[i]-1e-6) k=i; return k; }
function musEnd(){ var e=0; (P.tracks||[]).forEach(function(k){ e=Math.max(e,k.at+(k.len||0)); }); return e; }

/* ═══════════ движение кадра ═══════════ */
/* z приближение, x и y сдвиг в долях от запаса картинки (-1..1), ox старый сдвиг в долях ширины кадра */
function motion(c,lt){ var L=clen(c), k=clamp(lt/L,0,1), kb=c.kb||"none";
  if(kb==="kf"){ var K=c.keys||[]; if(!K.length) return { z:1, x:0, y:0 }; if(lt<=K[0].t) return K[0];
    for(var i=1;i<K.length;i++) if(lt<=K[i].t){ var a=K[i-1], b=K[i], u=(lt-a.t)/Math.max(.001,b.t-a.t); u=u*u*(3-2*u); return { z:a.z+(b.z-a.z)*u, x:(a.x||0)+((b.x||0)-(a.x||0))*u, y:(a.y||0)+((b.y||0)-(a.y||0))*u }; }
    return K[K.length-1]; }
  if(kb==="in") return { z:1+.12*k, x:0, y:0 }; if(kb==="out") return { z:1.12-.12*k, x:0, y:0 };
  if(kb==="left") return { z:1.12, x:0, y:0, ox:(.5-k)*.09 }; if(kb==="right") return { z:1.12, x:0, y:0, ox:(k-.5)*.09 };
  return { z:1, x:0, y:0 }; }
function keyAt(c,lt,create){ c.keys=c.keys||[]; lt=Math.round(lt*20)/20; for(var i=0;i<c.keys.length;i++) if(Math.abs(c.keys[i].t-lt)<.08) return c.keys[i]; if(!create) return null;
  var m=motion(c,lt), k={ t:lt, z:m.z, x:m.x||0, y:m.y||0 }; c.keys.push(k); c.keys.sort(function(a,b){ return a.t-b.t; }); return k; }
/* готовые движения: приблизить за d секунд, приблизить и вернуть, отдалить, проезд */
function genKeys(c){ var L=Math.round(clen(c)*20)/20, k=c.mvk, Z=c.mvz||1.3, d=c.mvd?Math.min(c.mvd,k==="inout"?L/2:L):(k==="inout"?L/2:L); d=Math.round(d*20)/20;
  if(k==="in") c.keys=[{ t:0, z:1, x:0, y:0 },{ t:d, z:Z, x:0, y:0 }];
  else if(k==="out") c.keys=[{ t:0, z:Z, x:0, y:0 },{ t:d, z:1, x:0, y:0 }];
  else if(k==="pan"){ var z=Math.max(Z,1.15); c.keys=[{ t:0, z:z, x:1, y:0 },{ t:d, z:z, x:-1, y:0 }]; }
  else { c.keys=[{ t:0, z:1, x:0, y:0 },{ t:d, z:Z, x:0, y:0 }]; if(L-d>d+.05) c.keys.push({ t:L-d, z:Z, x:0, y:0 }); c.keys.push({ t:L, z:1, x:0, y:0 }); } }
function fixKeys(c){ if(c.kb!=="kf") return; if(c.mvk) genKeys(c); else { var L=clen(c); (c.keys||[]).forEach(function(k){ k.t=Math.min(k.t,L); }); } }
function dims(c){ var m=MEDIA[c.id], e=m&&m.el; return [ (e&&(e.videoWidth||e.naturalWidth))||c.w||CV.width, (e&&(e.videoHeight||e.naturalHeight))||c.h||CV.height ]; }
function fitScale(w,h,W,H){ return P.fit==="blur"&&Math.abs(w/h-W/H)>.05?Math.min(W/w,H/h):Math.max(W/w,H/h); }
function shiftMax(c,z){ var d=dims(c), W=CV.width, H=CV.height, s=fitScale(d[0],d[1],W,H)*z; return [Math.abs(d[0]*s-W)/2/W, Math.abs(d[1]*s-H)/2/H]; }

/* ═══════════ медиа ═══════════ */
var MEDIA={}, THUMB={};
function media(c){ var m=MEDIA[c.id]; if(m&&m.aid===c.aid) return m;
  m=MEDIA[c.id]={ aid:c.aid, el:null, ok:false };
  blobUrl(c.aid).then(function(u){ if(!u) return; if(c.type==="vid"){ var v=document.createElement("video"); v.playsInline=true; v.preload="auto"; v.muted=false; v.src=u;
      v.addEventListener("loadeddata",function(){ m.ok=true; if(!PL.on) draw(cur); }); v.addEventListener("seeked",function(){ if(!PL.on) draw(cur); }); m.el=v; if(AC) hookAudio(m); try{ v.currentTime=c.in||0; }catch(e){} }
    else { var im=new Image(); im.onload=function(){ m.ok=true; if(!PL.on) draw(cur); }; im.src=u; m.el=im; } });
  return m; }
function hookAudio(m){ if(m.node||!m.el||m.el.tagName!=="VIDEO") return; try{ m.node=AC.createMediaElementSource(m.el); m.g=AC.createGain(); m.node.connect(m.g); m.g.connect(MASTER); }catch(e){} }
function waitOk(m){ return new Promise(function(res){ var n=0; (function w(){ if(m.ok||n++>100) res(); else setTimeout(w,100); })(); }); }
function allReady(){ return Promise.all(P.clips.map(function(c){ return waitOk(media(c)); }).concat(P.tracks.map(function(k){ return waitOk(audioOf(k)); }))); }
/* музыка: у каждой дорожки свой <audio>, громкость и затухания через gain */
var AUD={};
function audioOf(k){ var a=AUD[k.id]; if(a&&a.aid===k.aid) return a; a=AUD[k.id]={ aid:k.aid, el:null, ok:false };
  blobUrl(k.aid).then(function(u){ if(!u) return; var e=new Audio(); e.preload="auto"; e.src=u;
    e.addEventListener("loadedmetadata",function(){ a.ok=true; var d=e.duration; if(isFinite(d)&&d>0&&(!k.dur||!k.len)){ if(!k.dur) k.dur=d; if(!k.len) k.len=Math.max(.5,k.dur-(k.in||0)); save(); timeline(); refresh(); } });
    e.addEventListener("error",function(){ a.ok=true; }); a.el=e; if(AC) hookMus(a); });
  return a; }
function hookMus(a){ if(a.node||!a.el) return; try{ a.node=AC.createMediaElementSource(a.el); a.g=AC.createGain(); a.g.gain.value=0; a.node.connect(a.g); a.g.connect(MUS); }catch(e){} }

/* ═══════════ рисование кадра ═══════════ */
/* Каждый клип рисуется целиком (картинка, цвет, текст) на свой холст, переход складывает два готовых кадра. */
var CV=$("#cv"), CX=CV.getContext("2d"), HASF=("filter" in CX)&&!/[?&]nof=1/.test(location.search);
var OA=document.createElement("canvas"), OB=document.createElement("canvas"), XA=OA.getContext("2d"), XB=OB.getContext("2d");
var TB=null; /* рамка надписи текущего клипа в долях кадра, пока ролик стоит */
function reset(X){ X.setTransform(1,0,0,1,0,0); X.globalAlpha=1; X.globalCompositeOperation="source-over"; if(HASF) X.filter="none"; X.shadowBlur=0; X.shadowOffsetY=0; X.shadowColor="transparent"; }
function draw(t){ var W=CV.width, H=CV.height; reset(CX); CX.fillStyle="#000"; CX.fillRect(0,0,W,H); TB=null;
  if(!P||!P.clips.length){ tselUi(); return; } var L=TL(), act=[], ed=PL.on?-1:clipAt(t);
  for(var i=0;i<P.clips.length;i++){ var s=L.s[i], e=s+clen(P.clips[i]); if(t>=s&&t<e) act.push(i); }
  if(!act.length) act=[t>=L.total?P.clips.length-1:0];
  if(act.length===1) renderClip(CX,act[0],t-L.s[act[0]],act[0]===ed);
  else { var a=act[0], b=act[1], d=L.d[a]||.001, p=clamp((t-L.s[b])/d,0,1);
    if(OA.width!==W||OA.height!==H){ OA.width=OB.width=W; OA.height=OB.height=H; }
    renderClip(XA,a,t-L.s[a],false); renderClip(XB,b,t-L.s[b],b===ed); reset(CX); trans(P.clips[a].tr||"none",p,t,W,H); reset(CX); }
  tselUi(); }
function renderClip(X,i,lt,ed){ var c=P.clips[i], W=X.canvas.width, H=X.canvas.height; reset(X); X.fillStyle="#000"; X.fillRect(0,0,W,H); if(!c) return;
  var id=c.look||P.filter; drawMedia(X,c,lt,id); grade(X,id,lt); reset(X); drawText(X,c,lt,ed); reset(X); }
function fstr(id){ var s=(LOOKS[id]||LOOKS.none)[1]||"", A=P.adj||{}; if(A.br) s+=" brightness("+(1+A.br*.5).toFixed(3)+")"; if(A.ct) s+=" contrast("+(1+A.ct*.5).toFixed(3)+")"; if(A.sa) s+=" saturate("+(1+A.sa).toFixed(3)+")"; return s.trim(); }
/* где у холста нет filter (старый Safari), цвет приближаем наложениями */
function fbFilter(X,s){ var W=X.canvas.width, H=X.canvas.height; s.replace(/([a-z-]+)\(([\d.]+)/g,function(_,n,v){ v=+v; X.save();
  if(n==="grayscale"||n==="sepia"||(n==="saturate"&&v<1)){ X.globalCompositeOperation="saturation"; X.globalAlpha=clamp(n==="saturate"?1-v:v,0,1); X.fillStyle="#808080"; X.fillRect(0,0,W,H);
    if(n==="sepia"){ X.globalCompositeOperation="soft-light"; X.globalAlpha=clamp(v*.6,0,1); X.fillStyle="#c08a3c"; X.fillRect(0,0,W,H); } }
  else if(n==="brightness"){ if(v<1){ X.globalAlpha=clamp(1-v,0,1); X.fillStyle="#000"; } else { X.globalCompositeOperation="soft-light"; X.globalAlpha=clamp((v-1)*2.5,0,1); X.fillStyle="#fff"; } X.fillRect(0,0,W,H); }
  else if(n==="contrast"&&v>1){ X.globalCompositeOperation="overlay"; X.globalAlpha=clamp((v-1)*1.3,0,1); X.drawImage(X.canvas,0,0); }
  X.restore(); }); }
function drawMedia(X,c,lt,id){ var W=X.canvas.width, H=X.canvas.height, m=media(c), e=m.el; if(!m.ok||!e){ X.fillStyle="#15181d"; X.fillRect(0,0,W,H); return; }
  var w=e.videoWidth||e.naturalWidth||W, h=e.videoHeight||e.naturalHeight||H, mo=motion(c,lt), flt=fstr(id), s, sx, sy;
  if(P.fit==="blur"&&Math.abs(w/h-W/H)>.05){ var s0=Math.max(W/w,H/h)*1.1; if(HASF) X.filter="blur("+Math.round(W/28)+"px) brightness(.6) "+flt; else X.globalAlpha=.5;
    X.drawImage(e,(W-w*s0)/2,(H-h*s0)/2,w*s0,h*s0); X.globalAlpha=1; s=Math.min(W/w,H/h)*mo.z; }
  else s=Math.max(W/w,H/h)*mo.z;
  sx=(mo.x||0)*Math.abs(w*s-W)/2+(mo.ox||0)*W; sy=(mo.y||0)*Math.abs(h*s-H)/2;
  if(HASF) X.filter=flt||"none"; X.drawImage(e,(W-w*s)/2+sx,(H-h*s)/2+sy,w*s,h*s); if(HASF) X.filter="none"; else if(flt) fbFilter(X,flt); }
var NOISE=null;
function noise(){ if(NOISE) return NOISE; NOISE=document.createElement("canvas"); NOISE.width=NOISE.height=192; var x=NOISE.getContext("2d"), d=x.createImageData(192,192); for(var i=0;i<d.data.length;i+=4){ var v=Math.random()*255|0; d.data[i]=d.data[i+1]=d.data[i+2]=v; d.data[i+3]=255; } x.putImageData(d,0,0); return NOISE; }
function grade(X,id,lt,gk){ var W=X.canvas.width, H=X.canvas.height, k=LOOKS[id]||LOOKS.none, A=P.adj||{}; X.save(); if(HASF) X.filter="none";
  if(k[2]){ X.globalCompositeOperation=k[2][2]; X.globalAlpha=k[2][1]; X.fillStyle=k[2][0]; X.fillRect(0,0,W,H); }
  if(A.tp){ X.globalCompositeOperation="soft-light"; X.globalAlpha=Math.abs(A.tp)*.45; X.fillStyle=A.tp>0?"#ff8a1e":"#1e7bff"; X.fillRect(0,0,W,H); }
  var vg=Math.max(k[3]||0,A.vg||0); if(vg>0){ var g=X.createRadialGradient(W/2,H/2,Math.min(W,H)*.35,W/2,H/2,Math.max(W,H)*.75); g.addColorStop(0,"rgba(0,0,0,0)"); g.addColorStop(1,"rgba(12,6,0,"+vg+")"); X.globalCompositeOperation="source-over"; X.globalAlpha=1; X.fillStyle=g; X.fillRect(0,0,W,H); }
  var gr=Math.max(k[4]||0,A.gr||0)*(gk||1); if(gr>0){ var f=Math.floor(lt*24), ox=Math.floor(rnd(f)*192), oy=Math.floor(rnd(f+50)*192), sc=Math.max(1,Math.round(W/540)); X.globalCompositeOperation="overlay"; X.globalAlpha=gr; X.fillStyle=X.createPattern(noise(),"repeat"); X.scale(sc,sc); X.translate(-ox,-oy); X.fillRect(0,0,W/sc+192,H/sc+192); }
  X.restore(); }
/* переходы: OA уходящий кадр, OB приходящий, p от 0 до 1 */
function zoomAt(X,s,W,H){ X.translate(W/2,H/2); X.scale(s,s); X.translate(-W/2,-H/2); }
function trans(tr,p,t,W,H){ var X=CX, e=p<.5?2*p*p:1-Math.pow(-2*p+2,2)/2, tri=1-Math.abs(2*p-1), k3=1-Math.pow(1-p,3), i, R=Math.sqrt(W*W+H*H)/2+2;
  function A(a){ X.globalAlpha=a==null?1:a; X.drawImage(OA,0,0); X.globalAlpha=1; } function B(a){ X.globalAlpha=a==null?1:a; X.drawImage(OB,0,0); X.globalAlpha=1; }
  if(tr==="blur"&&!HASF) tr="fade";
  switch(tr){
  case "fade": A(); B(p); break;
  case "black": if(p<.5) A(1-p*2); else B((p-.5)*2); break;
  case "white": if(p<.5) A(); else B(); X.globalAlpha=tri; X.fillStyle="#fff"; X.fillRect(0,0,W,H); break;
  case "blur": X.save(); zoomAt(X,1+tri*.1,W,H); X.filter="blur("+(tri*W/24).toFixed(1)+"px)"; A(); B(e); X.restore(); break;
  case "slide": X.drawImage(OA,-k3*W,0); X.drawImage(OB,(1-k3)*W,0); break;
  case "slideup": X.drawImage(OA,0,-k3*H); X.drawImage(OB,0,(1-k3)*H); break;
  case "cover": A(); X.fillStyle="rgba(0,0,0,"+(.45*k3).toFixed(3)+")"; X.fillRect(0,0,W,H); X.shadowColor="rgba(0,0,0,.6)"; X.shadowBlur=W*.05; X.drawImage(OB,(1-k3)*W,0); break;
  case "zoom": X.save(); zoomAt(X,1+e*.3,W,H); A(); X.restore(); X.save(); zoomAt(X,1.15-.15*e,W,H); B(e); X.restore(); break;
  case "spin": B(); X.save(); X.translate(W/2,H/2); X.rotate(e*.9); X.scale(1+e*1.6,1+e*1.6); X.translate(-W/2,-H/2); A(1-e); X.restore(); break;
  case "wipe": A(); X.save(); X.beginPath(); X.rect(0,0,W*e,H); X.clip(); B(); X.restore(); X.fillStyle="rgba(255,255,255,.85)"; X.fillRect(W*e-2,0,4,H); break;
  case "wipedown": A(); X.save(); X.beginPath(); X.rect(0,0,W,H*e); X.clip(); B(); X.restore(); X.fillStyle="rgba(255,255,255,.85)"; X.fillRect(0,H*e-2,W,4); break;
  case "iris": A(); X.save(); X.beginPath(); X.arc(W/2,H/2,e*R,0,7); X.clip(); B(); X.restore(); break;
  case "clock": A(); X.save(); X.beginPath(); X.moveTo(W/2,H/2); X.arc(W/2,H/2,R,-Math.PI/2,-Math.PI/2+p*Math.PI*2); X.closePath(); X.clip(); B(); X.restore(); break;
  case "blinds": A(); X.save(); X.beginPath(); for(i=0;i<8;i++) X.rect(0,i*H/8,W,H/8*e+.5); X.clip(); B(); X.restore(); break;
  case "split": B(); X.drawImage(OA,0,0,W/2,H,-e*W/2,0,W/2,H); X.drawImage(OA,W/2,0,W/2,H,W/2+e*W/2,0,W/2,H); break;
  case "glitch": if(p<.5) A(); else B(); var fr=Math.floor(t*24);
    for(i=0;i<9;i++){ var y=Math.floor(rnd(fr*13+i)*H*.92), hh=Math.max(2,Math.floor((.02+rnd(fr*7+i*3)*.1)*H)), dx=(rnd(fr*5+i*11)-.5)*W*.5*tri; hh=Math.min(hh,H-y); X.drawImage(rnd(fr+i*17)<p?OB:OA,0,y,W,hh,dx,y,W,hh); }
    X.globalCompositeOperation="screen"; X.globalAlpha=.35*tri; X.fillStyle=fr%2?"#ff0050":"#00e0ff"; X.fillRect(0,rnd(fr*3)*H*.88,W,H*.12); break;
  default: B(); } }
/* текст на клипе: стиль, место, появление; переносы по ширине кадра. ed: ролик стоит, надпись показываем целиком и запоминаем её рамку */
function wrap(X,text,maxW){ var out=[]; String(text).split("\n").forEach(function(par){ var words=par.split(/\s+/), line="";
  words.forEach(function(w){ var tt=line?line+" "+w:w; if(X.measureText(tt).width>maxW&&line){ out.push(line); line=w; } else line=tt; }); out.push(line); }); return out; }
function drawText(X,c,lt,ed){ var T=c.text; if(!T||!String(T.t||"").trim()) return; var W=X.canvas.width, H=X.canvas.height, M=Math.min(W,H), L=clen(c), st=T.style||"title", anim=T.anim||P.anim||"fade";
  var inK=ed||T.noIn?1:clamp((lt-.15)/.55,0,1), outK=ed||T.noOut?1:clamp((L-lt)/.35,0,1), a=Math.min(inK,outK); if(a<=0) return;
  var str=String(T.t); if(anim==="type"&&!ed&&!T.noIn){ var n=Math.floor(clamp((lt-.1)/Math.max(.6,str.length*.045),0,1)*str.length); str=str.slice(0,n); a=outK; if(!str) return; }
  var fs=(st==="title"?M*.085:st==="sub"?M*.05:M*.042)*(T.size||1);
  X.font=(st==="title"?"700 ":"800 ")+Math.round(fs)+"px "+(st==="title"?"Unbounded,Manrope,sans-serif":"Manrope,sans-serif");
  var txt=st==="label"?str.toUpperCase():str, lines=wrap(X,txt,W*.84), lh=fs*1.22, bh=lines.length*lh, mw=0; lines.forEach(function(ln){ mw=Math.max(mw,X.measureText(ln).width); });
  var cx=T.x!=null?T.x*W:W/2, y0=T.y!=null?T.y*H-bh/2:(T.pos==="top"?H*.13:T.pos==="mid"?H*.5-bh/2:H*.86-bh);
  if(ed){ var px=fs*.6, py=fs*.32; TB={ id:c.id, x:(cx-mw/2-px)/W, y:(y0-py)/H, w:(mw+px*2)/W, h:(bh+py*2)/H, cx:cx/W, cy:(y0+bh/2)/H }; }
  X.save(); X.globalAlpha*=a; X.textAlign="center"; X.textBaseline="top";
  if(anim==="pop"&&!ed){ var pk=inK<1?1+Math.sin(inK*Math.PI)*.18-(1-inK)*.4:1; X.translate(cx,y0+bh/2); X.scale(pk,pk); X.translate(-cx,-(y0+bh/2)); }
  if(anim==="up") X.translate(0,(1-inK)*M*.05);
  var col=T.color||"#ffffff";
  lines.forEach(function(ln,i){ var y=y0+i*lh, tw=X.measureText(ln).width;
    if(st!=="title"){ var bx=fs*.5, by=fs*.18; X.fillStyle=st==="label"?col:"rgba(0,0,0,.6)"; rr(X,cx-tw/2-bx,y-by,tw+bx*2,lh+by*.6-fs*.1,fs*.3); X.fill(); X.fillStyle=st==="label"?(isLight(col)?"#111":"#fff"):col; X.shadowBlur=0; }
    else { X.shadowColor="rgba(0,0,0,.55)"; X.shadowBlur=fs*.35; X.shadowOffsetY=fs*.05; X.fillStyle=col; }
    X.fillText(ln,cx,y); });
  X.restore(); }
function rr(X,x,y,w,h,r){ X.beginPath(); X.moveTo(x+r,y); X.arcTo(x+w,y,x+w,y+h,r); X.arcTo(x+w,y+h,x,y+h,r); X.arcTo(x,y+h,x,y,r); X.arcTo(x,y,x+w,y,r); X.closePath(); }
function isLight(hex){ var n=parseInt(String(hex).slice(1),16); return ((n>>16)*.3+((n>>8)&255)*.59+(n&255)*.11)>150; }

/* ═══════════ надпись и кадр мышкой ═══════════ */
var tsel=$("#tsel"), cvw=$("#cvw"), gx=$("#gx"), gy=$("#gy");
function tselUi(){ if(!TB||PL.on){ tsel.hidden=true; return; } tsel.hidden=false; tsel.style.left=(TB.x*100)+"%"; tsel.style.top=(TB.y*100)+"%"; tsel.style.width=(TB.w*100)+"%"; tsel.style.height=(TB.h*100)+"%"; }
function pick(i){ if(selC!==i||selM||selJ!=null){ selC=i; selM=null; selJ=null; timeline(); refreshInsp(); } }
function grab(e,mv,up){ var x0=e.clientX, y0=e.clientY, moved=false;
  function m(ev){ if(!moved){ if(Math.hypot(ev.clientX-x0,ev.clientY-y0)<3) return; moved=true; remember(); } mv(ev.clientX-x0,ev.clientY-y0,ev); }
  function u(){ removeEventListener("pointermove",m); removeEventListener("pointerup",u); removeEventListener("pointercancel",u); up(moved); }
  addEventListener("pointermove",m); addEventListener("pointerup",u); addEventListener("pointercancel",u); }
/* надпись: тянем за неё саму, уголок меняет размер; у середины кадра прилипает */
tsel.addEventListener("pointerdown",function(e){ if(!P||PL.on||!TB) return; var i=clipAt(cur), c=P.clips[i]; if(!c||!c.text) return; e.preventDefault(); e.stopPropagation(); pick(i); tsel.classList.add("on");
  var T=c.text, r=CV.getBoundingClientRect(), size=e.target.classList.contains("tsh"), sx=TB.cx, sy=TB.cy, s0=T.size||1, ccx=r.left+sx*r.width, ccy=r.top+sy*r.height, d0=Math.max(10,Math.hypot(e.clientX-ccx,e.clientY-ccy));
  grab(e,function(dx,dy,ev){ if(size) T.size=clamp(s0*Math.hypot(ev.clientX-ccx,ev.clientY-ccy)/d0,.4,3);
    else { var nx=clamp(sx+dx/r.width,.03,.97), ny=clamp(sy+dy/r.height,.03,.97), ax=Math.abs(nx-.5)<.02, ay=Math.abs(ny-.5)<.02; T.x=ax?.5:nx; T.y=ay?.5:ny; gx.hidden=!ax; gy.hidden=!ay; }
    draw(cur); },function(moved){ gx.hidden=gy.hidden=true; if(moved){ save(); refreshInsp(); } }); });
/* кадр в движении «по точкам»: тянем картинку, колесо приближает; точка на этом моменте ставится сама */
cvw.addEventListener("pointerdown",function(e){ if(e.target.closest("#tsel,.vempty")) return; tsel.classList.remove("on"); if(!P||PL.on||!P.clips.length) return; var i=clipAt(cur), c=P.clips[i]; if(!c||c.kb!=="kf") return; e.preventDefault(); pick(i);
  var lt=clamp(cur-TL().s[i],0,clen(c)), r=CV.getBoundingClientRect(), K=null, kx=0, ky=0;
  grab(e,function(dx,dy){ if(!K){ K=keyAt(c,lt,true); delete c.mvk; kx=K.x||0; ky=K.y||0; } var m=shiftMax(c,K.z); if(m[0]>.002) K.x=clamp(kx+dx/r.width/m[0],-1,1); if(m[1]>.002) K.y=clamp(ky+dy/r.height/m[1],-1,1); draw(cur); },
    function(moved){ if(moved){ changed(); refreshInsp(); } }); });
var wheelT=0;
cvw.addEventListener("wheel",function(e){ if(!P||PL.on||!P.clips.length) return; var i=clipAt(cur), c=P.clips[i]; if(!c||c.kb!=="kf") return; e.preventDefault(); if(!wheelT) remember(); clearTimeout(wheelT); wheelT=setTimeout(function(){ wheelT=0; changed(); refreshInsp(); },450);
  if(selC!==i||selM){ selC=i; selM=null; } var K=keyAt(c,clamp(cur-TL().s[i],0,clen(c)),true); delete c.mvk; K.z=clamp(K.z*(1-e.deltaY*.0015),1,4); draw(cur); },{passive:false});

/* ═══════════ проигрывание ═══════════ */
var AC=null, MASTER=null, MUS=null, RD=null, PL={ on:false, t0:0, raf:0, exp:null }, cur=0;
function ensureAC(){ if(!AC){ AC=new (window.AudioContext||window.webkitAudioContext)(); MASTER=AC.createGain(); MASTER.connect(AC.destination); MUS=AC.createGain(); MUS.connect(AC.destination);
    Object.keys(MEDIA).forEach(function(k){ hookAudio(MEDIA[k]); }); Object.keys(AUD).forEach(function(k){ hookMus(AUD[k]); }); }
  if(AC.state==="suspended") AC.resume(); }
function play(from){ if(!P||!P.clips.length) return; ensureAC(); var L=TL(); if(from>=L.total-.05) from=0; tsel.classList.remove("on");
  PL.on=true; PL.t0=AC.currentTime+.05-from; MASTER.gain.value=P.vvol==null?1:P.vvol; playUi(); loop(); }
function stopPlay(){ PL.on=false; cancelAnimationFrame(PL.raf); if(P){ P.clips.forEach(function(c){ var m=MEDIA[c.id]; if(m&&m.el&&m.el.tagName==="VIDEO"&&!m.el.paused) m.el.pause(); });
    P.tracks.forEach(function(k){ var a=AUD[k.id]; if(a&&a.el&&!a.el.paused) a.el.pause(); if(a&&a.g) a.g.gain.value=0; }); } playUi(); }
function loop(){ if(!PL.on) return; var L=TL(), t=AC.currentTime-PL.t0; if(t<0) t=0;
  if(t>=L.total){ cur=L.total; draw(L.total-.001); stopPlay(); if(PL.exp) PL.exp(); else { cur=0; sync(0,false); draw(0); } timeUi(); return; }
  cur=t; sync(t,true); draw(t); timeUi(); PL.raf=requestAnimationFrame(loop); }
/* видео и музыка идут сами, мы только запускаем их вовремя и подправляем, если ушли больше чем на 0.3 с */
function sync(t,playing){ var L=TL(); P.clips.forEach(function(c,i){ if(c.type!=="vid") return; var m=media(c), v=m.el; if(!v) return; var s=L.s[i], e=s+clen(c), on=t>=s-.02&&t<e, target=(c.in||0)+(t-s);
  if(m.g) m.g.gain.value=c.mute?0:(c.vol==null?1:c.vol);
  if(on&&playing){ if(v.paused){ try{ v.currentTime=Math.max(c.in||0,target); }catch(x){} v.play().catch(function(){}); } else if(Math.abs(v.currentTime-target)>.3){ try{ v.currentTime=target; }catch(x){} } }
  else if(on){ if(Math.abs(v.currentTime-target)>.04){ try{ v.currentTime=Math.max(0,target); }catch(x){} } }
  else { if(!v.paused) v.pause(); if(playing&&t<s&&s-t<1.2&&Math.abs(v.currentTime-(c.in||0))>.1){ try{ v.currentTime=c.in||0; }catch(x){} } } });
  P.tracks.forEach(function(k){ var a=audioOf(k), e=a.el; if(!e||!k.len) return; var s=k.at, end=s+k.len, on=playing&&t>=s-.02&&t<Math.min(end,L.total), target=(k.in||0)+(t-s);
    if(a.g){ var v=0; if(on){ v=k.vol==null?.8:k.vol; if(k.fi>0) v*=clamp((t-s)/k.fi,0,1); if(k.fo>0) v*=clamp((end-t)/k.fo,0,1); if(P.mfade&&L.total>2.5) v*=clamp((L.total-t)/2,0,1); } a.g.gain.setTargetAtTime(v,AC.currentTime,.015); }
    if(on){ if(e.paused){ try{ e.currentTime=Math.max(0,target); }catch(x){} e.play().catch(function(){}); } else if(Math.abs(e.currentTime-target)>.25){ try{ e.currentTime=target; }catch(x){} } }
    else { if(!e.paused) e.pause(); if(playing&&t<s&&s-t<1.5&&Math.abs(e.currentTime-(k.in||0))>.05){ try{ e.currentTime=k.in||0; }catch(x){} } } }); }
function seek(t){ var L=TL(); cur=clamp(t,0,L.total); if(PL.on){ stopPlay(); play(cur); } else { sync(cur,false); draw(cur); timeUi(); } }
function playUi(){ $("#playBtn").classList.toggle("on",PL.on); }
$("#playBtn").onclick=function(){ if(PL.on) stopPlay(); else play(cur); };
function timeUi(){ var L=TL(); muteUi(); $("#tNow").textContent=tm(cur); $("#tAll").textContent="/ "+tm(L.total); var ph=$("#ph"); if(ph) ph.style.transform="translateX("+(cur*PPS)+"px)";
  if(PL.on){ var x=cur*PPS; if(x<tlEl.scrollLeft+10||x>tlEl.scrollLeft+tlEl.clientWidth-50) tlEl.scrollLeft=Math.max(0,x-50); } }

/* ═══════════ лента: линейка, клипы, музыка ═══════════ */
/* Лента в настоящем масштабе времени: PPS пикселей на секунду, поэтому песни видны по длине рядом с клипами. */
var PPS=40, selC=0, selM=null, selJ=null, tlEl=$("#tl"), JUST=0;
/* стык: переход между клипом i и следующим настраивается отдельно */
function selectJ(i){ selJ=i; selM=null; timeline(); if(wide.matches) refreshInsp(); else openInsp(); }
function trackOf(id){ for(var i=0;i<P.tracks.length;i++) if(P.tracks[i].id===id) return P.tracks[i]; return null; }
/* песни, которые пересекаются по времени, расходятся по строкам */
function rowsOf(){ var tr=P.tracks.slice().sort(function(a,b){ return a.at-b.at; }), ends=[], row={}; tr.forEach(function(k){ var r=0; while(r<ends.length&&ends[r]>k.at+.01) r++; ends[r]=k.at+(k.len||0); row[k.id]=r; }); return { row:row, n:Math.max(1,ends.length) }; }
function fitPps(){ var L=TL(), tot=L.total||Math.min(musEnd(),60), w=tlEl.clientWidth||600; PPS=tot>0?clamp((w-150)/tot,10,60):40; }
function zoom(k){ var x=cur*PPS-tlEl.scrollLeft; PPS=clamp(PPS*k,3,260); timeline(); tlEl.scrollLeft=Math.max(0,cur*PPS-x); }
$("#zmM").onclick=function(){ zoom(1/1.5); }; $("#zmP").onclick=function(){ zoom(1.5); };
function timeline(){ var sl=tlEl.scrollLeft; tlEl.innerHTML=""; if(!P) return; var L=TL(), R=rowsOf(), mEnd=musEnd(), tot=Math.max(L.total,mEnd);
  Object.keys(AUD).forEach(function(id){ if(!trackOf(id)){ var a=AUD[id]; if(a.el) a.el.pause(); delete AUD[id]; } }); if(selM&&!trackOf(selM)) selM=null;
  var tin=el('<div class="tin" style="width:'+Math.round(tot*PPS+150)+'px"></div>');
  /* линейка: щелчок и протяжка ставят курсор */
  var steps=[.5,1,2,5,10,30,60,120,300], st=300, i; for(i=0;i<steps.length;i++) if(steps[i]*PPS>=56){ st=steps[i]; break; }
  var rl=el('<div class="trl"></div>'); for(var x=0;x<=tot+st;x+=st) rl.appendChild(el('<i style="left:'+(x*PPS).toFixed(1)+'px">'+(st<1?tm(x):tms(x))+'</i>'));
  rl.onpointerdown=function(e){ if(PL.on) stopPlay(); var r0=tin.getBoundingClientRect().left; seek((e.clientX-r0)/PPS); function m(ev){ seek((ev.clientX-tin.getBoundingClientRect().left)/PPS); }
    function u(){ removeEventListener("pointermove",m); removeEventListener("pointerup",u); removeEventListener("pointercancel",u); } addEventListener("pointermove",m); addEventListener("pointerup",u); addEventListener("pointercancel",u); };
  tin.appendChild(rl);
  /* клипы */
  var row=el('<div class="trow"></div>');
  P.clips.forEach(function(c,i){ var s=L.s[i], e=i<P.clips.length-1?L.s[i+1]:s+clen(c), w=Math.max(8,(e-s)*PPS-2), on=i===selC&&!selM&&selJ==null;
    var t=el('<div class="tc'+(on?" on":"")+'" style="left:'+(s*PPS).toFixed(1)+'px;width:'+w.toFixed(1)+'px"><i class="tb"></i>'+(w>30?'<span class="ty">'+sv(c.type==="vid"?"vid":"img")+'</span>':'')+(w>64?'<small>'+clen(c).toFixed(1)+' '+esc(TR("с"))+'</small>':'')+(c.text&&c.text.t&&w>56?'<em>'+sv("txt")+'</em>':'')+'</div>');
    if(c.type==="vid"&&w>44) t.appendChild(el('<button class="snd'+(c.mute?" off":"")+'" title="'+esc(TR(c.mute?"Включить звук этого видео":"Выключить звук этого видео"))+'">'+sv(c.mute?"mute":"snd")+'</button>',function(bt){ bt.onclick=function(ev){ ev.stopPropagation(); toggleMute(c); }; }));
    if(i>0&&P.clips[i-1].aid===c.aid&&c.type==="vid"&&Math.abs((P.clips[i-1].out||0)-(c.in||0))<.02) t.classList.add("cont");
    thumb(c).then(function(u){ if(u) $(".tb",t).style.backgroundImage="url('"+u+"')"; });
    if(c.kb==="kf") (c.keys||[]).forEach(function(k){ if(k.t*PPS<w+2) t.appendChild(el('<i class="kd" style="left:'+(k.t*PPS).toFixed(1)+'px"></i>')); });
    t.onclick=function(ev){ if(Date.now()-JUST<350) return; var tt=(ev.clientX-tin.getBoundingClientRect().left)/PPS, lt=clamp(tt-s,0,clen(c)-.02);
      if(c.kb==="kf") (c.keys||[]).forEach(function(k){ if(Math.abs(k.t-lt)*PPS<7) lt=Math.min(k.t,clen(c)-.02); });
      if(selC!==i||selM||selJ!=null){ selC=i; selM=null; selJ=null; timeline(); refreshInsp(); } seek(s+lt); };
    if(i<P.clips.length-1){ var tr0=c.tr&&c.tr!=="none"; row.appendChild(el('<button class="jn'+(tr0?" on":"")+(selJ===i?" sel":"")+'" style="left:'+((L.s[i+1]+(L.d[i]||0)/2)*PPS).toFixed(1)+'px" title="'+esc(tr0?TR("Переход: {0}",TR(TRS[c.tr])):TR("Поставить переход"))+'"><i></i></button>',function(jb){
      jb.onclick=function(ev){ ev.stopPropagation(); selectJ(i); }; })); }
    if(on) t.appendChild(el('<i class="hd" title="'+esc(TR("Потяните, чтобы изменить длину"))+'"></i>',function(h){ h.onpointerdown=function(ev){ trimClip(ev,c); }; }));
    row.appendChild(t); });
  row.appendChild(el('<button class="tc add" style="left:'+(L.total*PPS+(P.clips.length?6:0)).toFixed(1)+'px" title="'+esc(TR("Добавить фото или видео"))+'">'+sv("add")+'</button>',function(b){ b.onclick=pickMedia; }));
  tin.appendChild(row);
  /* музыка */
  var mz=el('<div class="tmz" style="height:'+(R.n*30)+'px"></div>');
  P.tracks.forEach(function(k){ audioOf(k); var b=el('<div class="mb'+(selM===k.id?" on":"")+'" style="left:'+(k.at*PPS).toFixed(1)+'px;top:'+(R.row[k.id]*30)+'px;width:'+Math.max(10,(k.len||0)*PPS-1).toFixed(1)+'px"><i class="ml"></i><span data-nt></span><i class="mr"></i></div>');
    $("span",b).textContent=k.name; pkUrl(k.aid).then(function(u){ if(u&&k.dur){ b.style.backgroundImage="url('"+u+"')"; b.style.backgroundSize=(k.dur*PPS).toFixed(1)+"px 100%"; b.style.backgroundPosition=(-(k.in||0)*PPS).toFixed(1)+"px 0"; } });
    b.onpointerdown=function(ev){ if(ev.pointerType!=="mouse"&&selM!==k.id) return; ev.preventDefault(); dragTrack(ev,k,ev.target.classList.contains("ml")?"l":ev.target.classList.contains("mr")?"r":"m"); };
    b.onclick=function(){ if(Date.now()-JUST<350) return; if(selM!==k.id) selectM(k.id); };
    mz.appendChild(b); });
  if(!P.tracks.length) mz.appendChild(el('<button class="tm">'+sv("mus")+'<span>'+esc(TR("Добавить музыку"))+'</span></button>',function(b){ b.onclick=pickMusic; }));
  else mz.appendChild(el('<button class="tm tmp" style="left:'+(mEnd*PPS+6).toFixed(1)+'px" title="'+esc(TR("Добавить музыку"))+'">'+sv("mus")+'+</button>',function(b){ b.onclick=pickMusic; }));
  if(L.total>0&&mEnd>L.total+.05) mz.appendChild(el('<i class="mdim" style="left:'+(L.total*PPS).toFixed(1)+'px"></i>'));
  tin.appendChild(mz); tin.appendChild(el('<i class="ph" id="ph"></i>')); tlEl.appendChild(tin); tlEl.scrollLeft=sl;
  $("#empty").hidden=!!P.clips.length; timeUi(); }
function selectM(id){ selM=id; selJ=null; timeline(); if(wide.matches) refreshInsp(); else { openInsp(); right.classList.add("peek"); } }
/* правый край выбранного клипа: фото меняет длину, видео конец куска */
function trimClip(e,c){ e.stopPropagation(); e.preventDefault(); var d0=c.type==="vid"?c.out:(c.dur||3);
  grab(e,function(dx){ var v=Math.round((d0+dx/PPS)*10)/10; if(c.type==="vid") c.out=clamp(v,(c.in||0)+.3,c.len||d0); else c.dur=clamp(v,.5,60); fixKeys(c); timeline(); redraw(); },function(moved){ if(moved){ JUST=Date.now(); changed(true); } }); }
/* песня: середина двигает, левый край срезает начало, правый конец; края липнут к стыкам клипов, курсору и другим песням */
function dragTrack(e,k,mode){ var a0=k.at, i0=k.in||0, l0=k.len, L=TL(), sn=[0,L.total,cur].concat(L.s); P.tracks.forEach(function(o){ if(o!==k){ sn.push(o.at); sn.push(o.at+o.len); } });
  function snap(v){ var best=v, bd=7/PPS; sn.forEach(function(s){ var d=Math.abs(s-v); if(d<bd){ bd=d; best=s; } }); return best; }
  grab(e,function(dx){ var d=dx/PPS;
    if(mode==="l"){ var na=snap(a0+d), dd=clamp(na-a0,Math.max(-i0,-a0),l0-.5); k.in=i0+dd; k.at=a0+dd; k.len=l0-dd; }
    else if(mode==="r"){ k.len=clamp(snap(a0+l0+d)-a0,.5,Math.max(.5,k.dur-i0)); }
    else { var n=Math.max(0,a0+d), s1=snap(n), s2=snap(n+l0); k.at=Math.max(0,s1!==n?s1:s2!==n+l0?s2-l0:n); }
    timeline(); },function(moved){ if(moved){ JUST=Date.now(); selM=k.id; changed(true); } else if(selM!==k.id) selectM(k.id); }); }
function thumb(c){ var k=c.aid+":"+(c.in||0); if(THUMB[k]) return Promise.resolve(THUMB[k]);
  return blobUrl(c.aid).then(function(u){ if(!u) return ""; if(c.type!=="vid") return (THUMB[k]=u);
    return new Promise(function(res){ var v=document.createElement("video"); v.muted=true; v.playsInline=true; v.preload="auto"; v.src=u;
      v.onloadeddata=function(){ try{ v.currentTime=Math.min((c.in||0)+.1,(v.duration||1)-.05); }catch(e){ res(""); } };
      v.onseeked=function(){ var cv=document.createElement("canvas"), s=160/Math.max(v.videoWidth,v.videoHeight); cv.width=Math.round(v.videoWidth*s); cv.height=Math.round(v.videoHeight*s); cv.getContext("2d").drawImage(v,0,0,cv.width,cv.height); THUMB[k]=cv.toDataURL("image/jpeg",.7); res(THUMB[k]); v.src=""; };
      v.onerror=function(){ res(""); }; }); }); }
tlEl.addEventListener("wheel",function(e){ if(e.ctrlKey||e.metaKey){ e.preventDefault(); zoom(e.deltaY<0?1.25:.8); } else if(Math.abs(e.deltaY)>Math.abs(e.deltaX)){ tlEl.scrollLeft+=e.deltaY; e.preventDefault(); } },{passive:false});

/* ═══════════ волна песни ═══════════ */
/* Пики считаем один раз при добавлении и кладём рядом с файлом. WAV читаем кусками прямо из файла, остальное раскодирует браузер. */
var PK={}, PKU={};
function pkUrl(aid){ if(PKU[aid]!==undefined) return Promise.resolve(PKU[aid]);
  return (PK[aid]?Promise.resolve(PK[aid]):bGet(aid+":pk")).then(function(pk){ if(!pk||!pk.length){ PKU[aid]=""; return ""; } var n=pk.length, cv=document.createElement("canvas"); cv.width=n; cv.height=40; var x=cv.getContext("2d"); x.fillStyle="rgba(207,194,255,.5)";
    for(var i=0;i<n;i++){ var h=Math.max(1,pk[i]/255*38); x.fillRect(i,20-h/2,1,h); } PKU[aid]=cv.toDataURL(); return PKU[aid]; }).catch(function(){ return ""; }); }
function peaksOf(data,n){ var out=new Array(n), bl=data.length/n, st=Math.max(1,Math.floor(bl/300)); for(var i=0;i<n;i++){ var a=Math.floor(i*bl), b=Math.min(data.length,Math.floor((i+1)*bl)), m=0; for(var j=a;j<b;j+=st){ var v=data[j]<0?-data[j]:data[j]; if(v>m) m=v; } out[i]=Math.min(255,Math.round(Math.sqrt(m)*255)); } return out; }
function pkCount(dur){ return clamp(Math.ceil(dur*5),200,2400); }
function wavPeaks(f){ return f.slice(0,Math.min(f.size,1<<20)).arrayBuffer().then(function(ab){ var dv=new DataView(ab); function tag(o){ return String.fromCharCode(dv.getUint8(o),dv.getUint8(o+1),dv.getUint8(o+2),dv.getUint8(o+3)); }
    if(ab.byteLength<44||tag(0)!=="RIFF"||tag(8)!=="WAVE") return null; var o=12, fmt=null, off=0, size=0;
    while(o+8<=ab.byteLength){ var id=tag(o), sz=dv.getUint32(o+4,true); if(id==="fmt "){ fmt={ tag:dv.getUint16(o+8,true), ch:dv.getUint16(o+10,true), sr:dv.getUint32(o+12,true), ba:dv.getUint16(o+20,true), bits:dv.getUint16(o+22,true) }; if(fmt.tag===0xFFFE&&sz>=26) fmt.tag=dv.getUint16(o+32,true); }
      else if(id==="data"){ off=o+8; size=sz; break; } o+=8+sz+(sz&1); }
    if(!fmt||!off||!fmt.ba||!fmt.sr||(fmt.tag!==1&&fmt.tag!==3)) return null; if(!size||off+size>f.size) size=f.size-off;
    var frames=Math.floor(size/fmt.ba), dur=frames/fmt.sr, n=pkCount(dur), pk=new Array(n), per=frames/n, st=Math.max(1,Math.floor(per/300)), B=fmt.bits/8, CH=4<<20, chunk=Math.floor(CH/fmt.ba)*fmt.ba, pos=0; for(var q=0;q<n;q++) pk[q]=0;
    function rd(d,p){ return fmt.tag===3?(B===8?d.getFloat64(p,true):d.getFloat32(p,true)):B===2?d.getInt16(p,true)/32768:B===3?((d.getInt8(p+2)<<16)|(d.getUint8(p+1)<<8)|d.getUint8(p))/8388608:B===4?d.getInt32(p,true)/2147483648:(d.getUint8(p)-128)/128; }
    function next(){ if(pos>=frames*fmt.ba) return null; return f.slice(off+pos,off+Math.min(frames*fmt.ba,pos+chunk)).arrayBuffer().then(function(b){ var d=new DataView(b), f0=pos/fmt.ba, cnt=Math.floor(b.byteLength/fmt.ba);
        for(var j=(st-(f0%st))%st;j<cnt;j+=st){ var v=rd(d,j*fmt.ba); if(v<0) v=-v; var bi=Math.min(n-1,Math.floor((f0+j)/per)); if(v>pk[bi]) pk[bi]=v; } pos+=b.byteLength; return next(); }); }
    return Promise.resolve(next()).then(function(){ return { dur:dur, pk:pk.map(function(v){ return Math.min(255,Math.round(Math.sqrt(v)*255)); }) }; }); }); }
function decPeaks(f){ var OC=window.OfflineAudioContext||window.webkitOfflineAudioContext; if(!OC) return Promise.resolve(null); return f.arrayBuffer().then(function(ab){ var oc=new OC(1,1,44100);
    return new Promise(function(res){ var p=oc.decodeAudioData(ab,res,function(){ res(null); }); if(p&&p.then) p.then(res,function(){ res(null); }); }); }).then(function(b){ return b?{ dur:b.duration, pk:peaksOf(b.getChannelData(0),pkCount(b.duration)) }:null; }); }
function metaDur(f){ return new Promise(function(res){ var u=URL.createObjectURL(f), a=new Audio(); a.preload="metadata"; a.onloadedmetadata=function(){ var d=a.duration; URL.revokeObjectURL(u); res(isFinite(d)?d:0); }; a.onerror=function(){ URL.revokeObjectURL(u); res(0); }; a.src=u; }); }
function analyze(f){ var wav=/\.wav$/i.test(f.name)||/wav/.test(f.type);
  return (wav?wavPeaks(f).catch(function(){ return null; }):Promise.resolve(null)).then(function(r){ if(r) return r; if(f.size>48*1048576) return null; return decPeaks(f).catch(function(){ return null; }); })
    .then(function(r){ if(r&&r.dur) return r; return metaDur(f).then(function(d){ return { dur:d, pk:null }; }); }); }

/* ═══════════ добавление файлов ═══════════ */
function pickFile(accept,multi,fn){ var f=$("#fIn"); f.value=""; f.accept=accept; f.multiple=!!multi; f.onchange=function(){ fn([].slice.call(f.files)); }; f.click(); }
function pickMedia(){ pickFile("image/*,video/*",true,addFiles); }
function addFiles(files){ files=files.filter(function(f){ return /^(image|video)\//.test(f.type); }); if(!files.length) return; toast(TR("Добавляю: {0}",files.length));
  var chain=Promise.resolve(), added=0; remember();
  files.forEach(function(f){ chain=chain.then(function(){ return f.type.indexOf("video")===0?addVideo(f):addImage(f); }).then(function(c){ if(c){ P.clips.push(c); added++; } }); });
  chain.then(function(){ selC=Math.max(0,P.clips.length-added); selM=null; changed(true); toast(TR("Добавлено: {0}",added)); }); }
function kbFor(i){ var S=STYLES[P.style]||STYLES.smooth; return S.kb==="auto"?["in","out","left","right"][i%4]:S.kb; }
/* фото уменьшаем до 2160 px: больше ролику не нужно, а база браузера не раздувается */
function addImage(f){ return new Promise(function(res){ var u=URL.createObjectURL(f), im=new Image(); im.onload=function(){ var k=Math.min(1,2160/Math.max(im.width,im.height)), cv=document.createElement("canvas"); cv.width=Math.round(im.width*k); cv.height=Math.round(im.height*k);
    cv.getContext("2d").drawImage(im,0,0,cv.width,cv.height); URL.revokeObjectURL(u); cv.toBlob(function(b){ var aid=newId("i"); bPut(aid,b).then(function(){ res({ id:newId("c"), type:"img", aid:aid, name:f.name, dur:(STYLES[P.style]||STYLES.smooth).dur, kb:kbFor(P.clips.length), text:null, w:cv.width, h:cv.height }); }).catch(function(){ res(null); }); },"image/jpeg",.9); };
  im.onerror=function(){ toast(TR("Эту картинку браузер открыть не смог")); res(null); }; im.src=u; }); }
function addVideo(f){ if(f.size>400*1024*1024){ toast(TR("Видео больше 400 МБ: браузер может не справиться")); }
  return new Promise(function(res){ var u=URL.createObjectURL(f), v=document.createElement("video"); v.preload="metadata"; v.muted=true; v.src=u;
    v.onloadedmetadata=function(){ var d=v.duration||0, w=v.videoWidth, h=v.videoHeight; URL.revokeObjectURL(u); if(!d||!isFinite(d)){ toast(TR("Это видео браузер прочитать не смог")); res(null); return; }
      var aid=newId("v"); bPut(aid,f).then(function(){ res({ id:newId("c"), type:"vid", aid:aid, name:f.name, in:0, out:Math.min(d,60), len:d, kb:"none", vol:1, text:null, w:w, h:h }); }).catch(function(){ toast(TR("Не хватило места в памяти браузера")); res(null); }); };
    v.onerror=function(){ toast(TR("Это видео браузер прочитать не смог")); res(null); }; }); }
/* музыка: можно несколько файлов сразу, каждая песня встаёт после предыдущей */
var AUDIO_RE=/\.(mp3|m4a|ogg|oga|wav|flac|aac|opus)$/i;
function pickMusic(){ pickFile("audio/*,.mp3,.m4a,.ogg,.wav,.flac,.aac,.opus",true,addMusic); }
function addMusic(files){ files=files.filter(function(f){ return /^audio\//.test(f.type)||AUDIO_RE.test(f.name); }); if(!files.length) return; var chain=Promise.resolve(), n=0;
  files.forEach(function(f){ chain=chain.then(function(){ if(f.size>150*1048576){ toast(TR("Файл больше 150 МБ: {0}",f.name)); return; } toast(TR("Читаю: {0}",f.name)); var aid=newId("a");
    return bPut(aid,f).then(function(){ return analyze(f); },function(){ toast(TR("Не хватило места в памяти браузера")); return null; }).then(function(r){ if(r===null) return; if(!r.dur){ toast(TR("Этот звук браузер прочитать не смог")); return bDel(aid); }
      if(r.pk){ PK[aid]=r.pk; bPut(aid+":pk",r.pk).catch(function(){}); } if(!n) remember(); var L=TL(), end=musEnd(), at=!P.tracks.length?0:end<L.total-.5?end:(cur>.05&&cur<L.total-.5?cur:end);
      var k={ id:newId("t"), aid:aid, name:f.name.replace(/\.[^.]+$/,"").slice(0,60), at:Math.round(at*100)/100, in:0, len:r.dur, dur:r.dur, vol:.8, fi:0, fo:0 }; P.tracks.push(k); selM=k.id; n++; }); }); });
  chain.then(function(){ if(!n) return; changed(true); toast(TR("Добавлено: {0}",n)); if(wide.matches&&ui.tab!=="mus") openTab("mus"); }); }
/* ═══════════ разрезать клип и звук видео ═══════════
   Файл не режется: у видео меняются только метки «начало» и «конец» в исходнике (in и out), у фото длина.
   Разрез по курсору делает из одного клипа два, дальше любой кусок можно удалить, переставить или обрезать. */
function cutInfo(){ if(!P||!P.clips.length) return null; var L=TL(), i=clipAt(cur), c=P.clips[i], lt=cur-L.s[i];
  /* курсор на нахлёсте перехода: режем следующий клип, он уже идёт */
  if(i>0&&lt<(L.d[i-1]||0)) return { i:i, c:c, lt:lt, bad:true };
  return { i:i, c:c, lt:lt, bad:lt<.1||lt>clen(c)-.1 }; }
function motionKeysAt(c,a,b){ var out=[{ t:0, z:0, x:0, y:0 }], m0=motion(c,a); out[0]={ t:0, z:m0.z, x:m0.x||0, y:m0.y||0 };
  (c.keys||[]).forEach(function(k){ if(k.t>a+.01&&k.t<b-.01) out.push({ t:Math.round((k.t-a)*100)/100, z:k.z, x:k.x||0, y:k.y||0 }); });
  var m1=motion(c,b); out.push({ t:Math.round((b-a)*100)/100, z:m1.z, x:m1.x||0, y:m1.y||0 }); return out; }
function splitClip(){ var ci=cutInfo(); if(!ci){ toast(TR("Сначала добавьте фото или видео")); return; } if(PL.on) stopPlay();
  if(ci.bad){ toast(TR("Поставьте курсор внутрь клипа, не у самого края")); return; }
  remember(); var c=ci.c, lt=Math.round(ci.lt*100)/100, L0=clen(c), a=JSON.parse(JSON.stringify(c)), b=JSON.parse(JSON.stringify(c)); b.id=newId("c");
  if(c.type==="vid"){ a.out=Math.round(((c.in||0)+lt)*100)/100; b.in=a.out; } else { a.dur=lt; b.dur=Math.round((L0-lt)*100)/100; }
  /* движение кадра продолжается во втором куске с того же места */
  if(c.kb==="in"||c.kb==="out"||c.kb==="kf"){ a.kb=b.kb="kf"; a.keys=motionKeysAt(c,0,lt); b.keys=motionKeysAt(c,lt,L0); delete a.mvk; delete b.mvk; }
  /* между кусками нет перехода, надпись тянется через разрез без повторного появления */
  a.tr="none"; if(a.text&&a.text.t){ a.text.noOut=true; b.text.noIn=true; }
  P.clips.splice(ci.i,1,a,b); selC=ci.i+1; selM=null; changed(true); toast(TR("Разрезано на {0}. Лишний кусок выберите и удалите",tm(cur)));
}
/* убрать часть клипа до курсора или после: тот же разрез, только ненужный кусок сразу пропадает */
function trimAt(side){ var ci=cutInfo(); if(!ci) return; if(ci.bad){ toast(TR("Поставьте курсор внутрь клипа, не у самого края")); return; } if(PL.on) stopPlay();
  remember(); var c=ci.c, lt=Math.round(ci.lt*100)/100, L0=clen(c), start=TL().s[ci.i];
  if(c.kb==="in"||c.kb==="out"||c.kb==="kf"){ c.keys=side==="l"?motionKeysAt(c,lt,L0):motionKeysAt(c,0,lt); c.kb="kf"; delete c.mvk; }
  if(c.type==="vid"){ if(side==="l") c.in=Math.round(((c.in||0)+lt)*100)/100; else c.out=Math.round(((c.in||0)+lt)*100)/100; } else c.dur=side==="l"?Math.round((L0-lt)*100)/100:lt;
  if(c.text){ if(side==="l") delete c.text.noIn; else delete c.text.noOut; }
  changed(true); seek(side==="l"?start:start+clen(c)-.05); toast(TR(side==="l"?"Начало клипа убрано":"Конец клипа убран")); }
function delClip(i){ if(i<0||i>=P.clips.length) return; remember(); var c=P.clips[i], pv=P.clips[i-1], nx=P.clips[i+1];
  /* соседи бывшего разреза: надпись у них снова появляется и исчезает как обычно */
  if(pv&&pv.text) delete pv.text.noOut; if(nx&&nx.text) delete nx.text.noIn;
  P.clips.splice(i,1); selC=Math.max(0,Math.min(i,P.clips.length-1)); changed(true); }
function toggleMute(c){ remember(); c.mute=!c.mute; save(); timeline(); refreshInsp(); muteUi(); toast(TR(c.mute?"Звук этого видео выключен":"Звук этого видео включён")); }
/* кнопка звука прямо на видео: видна, когда под курсором видео */
var muteK="";
function muteUi(){ var b=$("#vmute"), c=P&&P.clips.length?P.clips[clipAt(cur)]:null, k=c&&c.type==="vid"?c.id+(c.mute?"1":"0"):""; if(k===muteK) return; muteK=k; if(!k){ b.hidden=true; return; } b.hidden=false; b.classList.toggle("off",!!c.mute); b.innerHTML=sv(c.mute?"mute":"snd"); b.title=TR(c.mute?"Включить звук этого видео":"Выключить звук этого видео"); }
$("#vmute").onclick=function(e){ e.stopPropagation(); var c=P.clips[clipAt(cur)]; if(c&&c.type==="vid") toggleMute(c); };
$("#vmute").addEventListener("pointerdown",function(e){ e.stopPropagation(); });
$("#cutBtn").onclick=splitClip;
var dropN=0;
addEventListener("dragenter",function(e){ if($("#ed").hidden) return; if(e.dataTransfer&&[].indexOf.call(e.dataTransfer.types||[],"Files")>=0){ dropN++; $("#drop").classList.add("on"); } });
addEventListener("dragleave",function(){ if(--dropN<=0){ dropN=0; $("#drop").classList.remove("on"); } });
addEventListener("dragover",function(e){ e.preventDefault(); });
addEventListener("drop",function(e){ e.preventDefault(); dropN=0; $("#drop").classList.remove("on"); if(!P||$("#ed").hidden) return; var fs=[].slice.call(e.dataTransfer.files||[]); addMusic(fs); addFiles(fs); });
/* пример без своих файлов: четыре кадра из мастерской фонов с подписями */
function demo(){ if(!F){ toast(TR("Нет мастерской фонов")); return; } var dm=FMT[P.fmt].ex[1080], tpl=["sunset","sea","party","retro"], txt=["Наше лето","Море","Друзья","До встречи!"];
  toast(TR("Готовлю пример...")); remember(); var chain=Promise.resolve();
  tpl.forEach(function(id,i){ chain=chain.then(function(){ return new Promise(function(res){ var b=F.fromTpl(id), s=F.svg(b,dm[0],dm[1]), u=URL.createObjectURL(new Blob([s],{type:"image/svg+xml"})), im=new Image();
    im.onload=function(){ var cv=document.createElement("canvas"); cv.width=dm[0]; cv.height=dm[1]; cv.getContext("2d").drawImage(im,0,0,dm[0],dm[1]); URL.revokeObjectURL(u);
      cv.toBlob(function(bl){ var aid=newId("i"); bPut(aid,bl).then(function(){ P.clips.push({ id:newId("c"), type:"img", aid:aid, name:"demo"+i, dur:(STYLES[P.style]||STYLES.smooth).dur, kb:kbFor(i), w:dm[0], h:dm[1],
        text:{ t:TR(txt[i]), style:i===0?"title":i===3?"title":"label", pos:i===0?"mid":i===3?"mid":"bot", anim:P.anim, color:"#ffffff" } }); res(); }); },"image/jpeg",.9); };
    im.onerror=function(){ res(); }; im.src=u; }); }); });
  chain.then(function(){ var n0=P.clips.length-4; if(n0>0&&!P.clips[n0-1].tr) P.clips[n0-1].tr="fade"; if(P.clips[n0]) P.clips[n0].tr="fade"; if(P.clips[n0+2]) P.clips[n0+2].tr="black"; selC=0; selM=null; selJ=null; fitPps(); changed(true); seek(0); }); }

/* ═══════════ сборка видео ═══════════ */
function mimes(){ var L=[["mp4",'video/mp4;codecs="avc1.42E01E,mp4a.40.2"'],["mp4","video/mp4;codecs=avc1,mp4a.40.2"],["mp4","video/mp4;codecs=avc1"],["webm","video/webm;codecs=vp9,opus"],["webm","video/webm;codecs=vp8,opus"],["webm","video/webm"]];
  return L.filter(function(m){ return window.MediaRecorder&&MediaRecorder.isTypeSupported&&MediaRecorder.isTypeSupported(m[1]); }); }
function exportBox(){ if(!P.clips.length){ toast(TR("Сначала добавьте фото или видео")); return; } stopPlay(); var ms=mimes(), L=TL();
  if(!ms.length){ modal('<h3>'+esc(TR("Собрать видео"))+'</h3><p class="note">'+esc(TR("Этот браузер не умеет записывать видео. Откройте мастерскую в свежем Chrome, Edge, Firefox или Safari."))+'</p><div class="row"><button class="btn" data-close>'+esc(TR("Закрыть"))+'</button></div>'); return; }
  var mp4=ms.some(function(m){ return m[0]==="mp4"; });
  modal('<button class="ib mx" data-close>'+sv("x")+'</button><h3>'+esc(TR("Собрать видео"))+'</h3><div id="exO"></div><p class="note" id="exN"></p><div class="row"><button class="btn go" id="exGo">'+esc(TR("Собрать"))+'</button></div>');
  var box=$("#exO"); box.appendChild(choice(TR("Качество"),[[720,"720p"],[1080,"1080p"]],P.q||720,function(v){ P.q=+v; save(); }));
  $("#exN").textContent=TR("Длина {0}. Видео собирается в реальном времени, это займёт столько же. Не переключайтесь на другую вкладку, иначе браузер притормозит запись.",tm(L.total))+(mp4?"":" "+TR("Этот браузер пишет только WebM: в Telegram и на компьютере он играет, а для iPhone лучше собрать в Safari."));
  $("#exGo").onclick=function(){ doExport(ms[0]); }; }
function doExport(mm){ var ex=FMT[P.fmt].ex[P.q||720], L=TL(), parts=[], cancel=false;
  modal('<h3>'+esc(TR("Собираю видео"))+'</h3><div class="prog"><i id="pg"></i></div><p class="note" id="pgT"></p><div class="row"><button class="btn" id="pgX">'+esc(TR("Отмена"))+'</button></div>');
  allReady().then(function(){ ensureAC(); RD=AC.createMediaStreamDestination(); MASTER.connect(RD); MUS.connect(RD);
    CV.width=ex[0]; CV.height=ex[1]; sync(0,false); draw(0);
    var vs=CV.captureStream(30), stream=new MediaStream(vs.getVideoTracks().concat(RD.stream.getAudioTracks())), rec;
    try{ rec=new MediaRecorder(stream,{ mimeType:mm[1], videoBitsPerSecond:P.q===1080?9e6:5e6, audioBitsPerSecond:160000 }); }catch(e){ rec=new MediaRecorder(stream); }
    rec.ondataavailable=function(e){ if(e.data&&e.data.size) parts.push(e.data); };
    var iv=setInterval(function(){ var pg=$("#pg"), t=PL.on?AC.currentTime-PL.t0:0; if(pg) pg.style.width=Math.round(clamp(t/L.total,0,1)*100)+"%"; var pt=$("#pgT"); if(pt) pt.textContent=tm(t)+" / "+tm(L.total); },250);
    function finish(){ clearInterval(iv); try{ MASTER.disconnect(RD); MUS.disconnect(RD); }catch(e){} RD=null; PL.exp=null; var pv=FMT[P.fmt].pv; CV.width=pv[0]; CV.height=pv[1]; cur=0; sync(0,false); draw(0); timeUi(); }
    rec.onstop=function(){ finish(); closeModal(); if(cancel){ toast(TR("Сборка отменена")); return; } var b=new Blob(parts,{type:mm[1].split(";")[0]}), a=document.createElement("a");
      a.href=URL.createObjectURL(b); a.download=(latin(P.title)||"rolik")+"."+mm[0]; document.body.appendChild(a); a.click(); setTimeout(function(){ URL.revokeObjectURL(a.href); a.remove(); },4000);
      toast(TR("Видео сохранено: {0}",b.size>1048576?(b.size/1048576).toFixed(1)+" "+TR("МБ"):Math.round(b.size/1024)+" "+TR("КБ"))); };
    $("#pgX").onclick=function(){ cancel=true; stopPlay(); if(rec.state!=="inactive") rec.stop(); };
    PL.exp=function(){ setTimeout(function(){ if(rec.state!=="inactive") rec.stop(); },300); };
    rec.start(500); play(0); }); }
$("#saveBtn").onclick=exportBox;
function latin(s){ var m={а:"a",б:"b",в:"v",г:"g",д:"d",е:"e",ё:"e",ж:"zh",з:"z",и:"i",й:"y",к:"k",л:"l",м:"m",н:"n",о:"o",п:"p",р:"r",с:"s",т:"t",у:"u",ф:"f",х:"h",ц:"ts",ч:"ch",ш:"sh",щ:"sch",ъ:"",ы:"y",ь:"",э:"e",ю:"yu",я:"ya",ł:"l",ß:"ss"};
  return String(s||"").toLowerCase().split("").map(function(c){ return m[c]!=null?m[c]:c; }).join("").normalize("NFD").replace(/[̀-ͯ]/g,"").replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"").slice(0,40); }

/* ═══════════ отмена и сохранение ═══════════ */
var U=[], Rd=[];
function snap(){ var o=JSON.parse(JSON.stringify(P)); delete o.updated; return JSON.stringify(o); }
function remember(){ if(!P) return; U.push(snap()); if(U.length>80) U.shift(); Rd=[]; undoBtns(); }
function undoBtns(){ $("#undo").disabled=!U.length; $("#redo").disabled=!Rd.length; }
function restoreS(s){ var o=JSON.parse(s); for(var k in o) P[k]=o[k]; $("#title").value=P.title||""; selC=Math.min(selC,Math.max(0,P.clips.length-1)); undoBtns(); setCanvas(); changed(true); }
$("#undo").onclick=function(){ if(!U.length) return; Rd.push(snap()); restoreS(U.pop()); };
$("#redo").onclick=function(){ if(!Rd.length) return; U.push(snap()); restoreS(Rd.pop()); };
var saveT=0; function save(){ clearTimeout(saveT); saveT=setTimeout(function(){ if(!P) return; P.updated=Date.now(); pPut(JSON.parse(JSON.stringify(P))).catch(function(){ toast(TR("Не получилось сохранить: память браузера заполнена")); }); },350); }
var rT=0; function redraw(){ clearTimeout(rT); rT=setTimeout(function(){ if(!PL.on){ sync(cur,false); draw(cur); } timeUi(); },30); }
function changed(all){ save(); timeline(); redraw(); if(all) refresh(); }

/* ═══════════ панели ═══════════ */
var pane=$("#pane"), insp=$("#insp"), right=$("#right"), ui={ tab:null, sheet:false };
var TTL={ vid:"Ролик", col:"Цвет", mus:"Музыка", more:"Ещё" };
function tabBox(){ return wide.matches?pane:insp; }
function openTab(t){ if(t==="clip"){ openInsp(); return; }
  ui.tab=t; $$("#tabs button").forEach(function(b){ b.classList.toggle("on",b.getAttribute("data-tab")===t); });
  if(!wide.matches){ ui.sheet="tab"; right.classList.add("open"); right.classList.remove("full","peek"); $("#shTitle").textContent=TR(TTL[t]); }
  refreshPane(); tabBox().scrollTop=0; }
function openInsp(){ if(!wide.matches){ ui.sheet="insp"; right.classList.add("open"); right.classList.remove("full","peek"); $$("#tabs button").forEach(function(b){ b.classList.toggle("on",b.getAttribute("data-tab")==="clip"&&!selM&&selJ==null); }); ui.tab=null; }
  refreshInsp(); insp.scrollTop=0; }
function closeSheet(){ if(wide.matches) return; ui.sheet=false; ui.tab=null; right.classList.remove("open","full","peek"); $$("#tabs button").forEach(function(b){ b.classList.remove("on"); }); }
$("#shClose").onclick=closeSheet;
$$("#tabs button").forEach(function(b){ b.onclick=function(){ var t=b.getAttribute("data-tab"); if(!wide.matches&&((ui.sheet==="tab"&&ui.tab===t)||(t==="clip"&&ui.sheet==="insp"&&!selM))) closeSheet(); else { if(t==="clip"&&selM){ selM=null; timeline(); } openTab(t); } }; });
(function(){ var h=$(".sh-h"), y0=0, h0=0, on=false;
  h.addEventListener("pointerdown",function(e){ if(wide.matches||e.target.closest("button")) return; on=true; y0=e.clientY; h0=right.getBoundingClientRect().height; right.style.transition="none"; try{ h.setPointerCapture(e.pointerId); }catch(x){} });
  h.addEventListener("pointermove",function(e){ if(on) right.style.height=Math.max(80,h0-(e.clientY-y0))+"px"; });
  h.addEventListener("pointerup",function(e){ if(!on) return; on=false; right.style.transition=""; var nh=h0-(e.clientY-y0), vh=innerHeight; right.style.height=""; right.classList.remove("full","peek");
    if(nh<vh*.2) closeSheet(); else if(nh<vh*.42) right.classList.add("peek"); else if(nh>vh*.65) right.classList.add("full"); });
})();
new MutationObserver(function(){ var e=$("#ed"); e.classList.toggle("so",right.classList.contains("open")&&!right.classList.contains("full")); e.classList.toggle("pk",right.classList.contains("peek")); }).observe(right,{attributes:true,attributeFilter:["class"]});
wide.addEventListener("change",function(){ right.classList.remove("open"); ui.sheet=false; if(wide.matches) openTab(ui.tab||"vid"); refreshInsp(); });
function refresh(){ refreshPane(); refreshInsp(); }
function refreshPane(){ if(!ui.tab||!P) return; if(!wide.matches&&ui.sheet!=="tab") return; var box=tabBox(), sc=box.scrollTop; box.innerHTML="";
  ({ vid:paneVid, col:paneCol, mus:paneMus, more:paneMore })[ui.tab](box); box.scrollTop=sc; }
function trChoice(label,cur,fn){ return choice(label,Object.keys(TRS).map(function(k){ return [k,TR(TRS[k])]; }),cur,fn); }
function trSelect(label,cur,fn,inherit){ return pick1(label,(inherit?[["",TR("как у всех: {0}",TR(TRS[P.tr]))]]:[]).concat(Object.keys(TRS).map(function(k){ return [k,TR(TRS[k])]; })),cur,fn); }
function paneVid(box){
  box.appendChild(sh("Стиль"));
  box.appendChild(el('<div class="mst"></div>',function(g){ Object.keys(STYLES).forEach(function(k){ var S=STYLES[k]; g.appendChild(el('<button class="'+(P.style===k?"on":"")+'"><b>'+esc(TR(S.n))+'</b><small>'+esc(TR(LOOKS[S.filter][0]))+', '+esc(TR(TANI[S.anim]))+'</small></button>',function(b){ b.onclick=function(){ applyStyle(k); }; })); }); }));
  box.appendChild(note(TR("Стиль сразу ставит фильтр, движение фото и появление текста у всех клипов. Переходы он не трогает: они ставятся на каждый стык отдельно.")));
  box.appendChild(sh("Формат"));
  box.appendChild(choice("",Object.keys(FMT).map(function(k){ return [k,TR(FMT[k].n)]; }),P.fmt,function(v){ remember(); P.fmt=v; setCanvas(); changed(); }));
  box.appendChild(choice(TR("Если кадр не той формы"),[["cover",TR("заполнить и обрезать")],["blur",TR("целиком на размытом фоне")]],P.fit,function(v){ remember(); P.fit=v; changed(); }));
  box.appendChild(sh("Переходы"));
  var n=trCount();
  box.appendChild(note(n.all?TR("Переходов в ролике: {0} из {1} стыков.",n.all,Math.max(0,P.clips.length-1))+(n.kinds>2?" "+TR("Разных уже {0}: ролик смотрится цельнее, когда их один-два.",n.kinds):""):TR("Сейчас между клипами простые склейки, без переходов.")));
  box.appendChild(note(TR("Переход ставится на конкретный стык: нажмите на ромбик между клипами в ленте. Где-то он нужен, а где-то лучше простая склейка.")));
  if(P.clips.length>1){ var allTr=(STYLES[P.style]||STYLES.smooth).tr; if(allTr==="none") allTr="fade";
    box.appendChild(el('<div class="f"><label>'+esc(TR("Один переход на все стыки"))+'</label><div class="trall"><select></select><button class="btn">'+esc(TR("Поставить"))+'</button></div></div>',function(f){ var se=$("select",f);
      se.innerHTML=Object.keys(TRS).filter(function(k){ return k!=="none"; }).map(function(k){ return '<option value="'+k+'"'+(k===allTr?" selected":"")+'>'+esc(TR(TRS[k]))+'</option>'; }).join("");
      $("button",f).onclick=function(){ remember(); P.clips.forEach(function(c,i){ if(i<P.clips.length-1) c.tr=se.value; }); changed(true); toast(TR("Переход «{0}» стоит на всех стыках",TR(TRS[se.value]))); previewCut(); }; }));
    if(n.all) box.appendChild(el('<button class="btn w">'+esc(TR("Убрать все переходы"))+'</button>',function(b){ b.onclick=function(){ remember(); P.clips.forEach(function(c){ delete c.tr; delete c.trd; }); changed(true); toast(TR("Все переходы убраны")); }; })); }
  box.appendChild(range(TR("Длина перехода по умолчанию"),P.trd,.2,1.5,.1,sec,function(v){ P.trd=v; timeline(); redraw(); }));
  if(P.clips.some(function(c){ return c.type==="img"; })) box.appendChild(sh("Клипы"));
  if(P.clips.some(function(c){ return c.type==="img"; })) box.appendChild(range(TR("Длина каждого фото"),avgPhoto(),1,10,.5,sec,function(v){ P.clips.forEach(function(c){ if(c.type==="img"){ c.dur=v; fixKeys(c); } }); timeline(); redraw(); }));
}
function trCount(){ var all=0, kinds={}; P.clips.forEach(function(c,i){ if(i<P.clips.length-1&&c.tr&&c.tr!=="none"){ all++; kinds[c.tr]=1; } }); return { all:all, kinds:Object.keys(kinds).length }; }
/* настройки стыка: какой переход, сколько длится, посмотреть */
function inspJn(i){ var c=P.clips[i], pv=i>0?P.clips[i-1]:null, cur0=c.tr||"none";
  $("#shTitle").textContent=TR("Стык клипов {0} и {1}",i+1,i+2);
  insp.appendChild(el('<div class="jhead"><button class="btn" data-a="p">'+sv("l")+'</button><span>'+esc(TR("Стык {0} из {1}",i+1,P.clips.length-1))+'</span><button class="btn" data-a="n">'+sv("r")+'</button></div>',function(r){
    var b=$$("button",r); b[0].disabled=i<=0; b[1].disabled=i>=P.clips.length-2; b[0].onclick=function(){ selectJ(i-1); }; b[1].onclick=function(){ selectJ(i+1); }; }));
  insp.appendChild(trChoice(TR("Переход"),cur0,function(v){ remember(); if(v==="none"){ delete c.tr; delete c.trd; } else c.tr=v; changed(true); if(v!=="none") previewCut(i); }));
  if(cur0!=="none"){ insp.appendChild(range(TR("Длина этого перехода"),c.trd||P.trd||.6,.2,1.5,.1,sec,function(v){ c.trd=v; timeline(); redraw(); }));
    insp.appendChild(el('<div class="row" style="margin-bottom:10px"><button class="btn go">'+esc(TR("Посмотреть стык"))+'</button></div>',function(r){ $("button",r).onclick=function(){ previewCut(i); }; })); }
  if(pv&&pv.tr&&pv.tr!=="none"&&pv.tr!==cur0) insp.appendChild(el('<button class="btn w">'+esc(TR("Как на прошлом стыке: {0}",TR(TRS[pv.tr])))+'</button>',function(b){ b.onclick=function(){ remember(); c.tr=pv.tr; if(pv.trd) c.trd=pv.trd; changed(true); previewCut(i); }; }));
  var n=trCount();
  insp.appendChild(note(TR("Переход хорошо ставить там, где меняется место, время или настроение. Между похожими кусками одной сцены простая склейка смотрится чище.")+(n.kinds>2?" "+TR("Разных переходов в ролике уже {0}: ролик смотрится цельнее, когда их один-два.",n.kinds):""))); }
/* после выбора перехода сразу проигрываем ближайший стык, чтобы было видно, что выбрано */
function previewCut(i){ if(P.clips.length<2) return; var L=TL(); if(i==null) i=Math.min(clipAt(cur),P.clips.length-2); if(i<0||i>P.clips.length-2) return; var t0=Math.max(0,L.s[i+1]-.7), t1=L.s[i+1]+(L.d[i]||0)+.6; stopPlay(); play(t0);
  (function w(){ if(!PL.on) return; if(cur>=t1){ stopPlay(); return; } setTimeout(w,60); })(); }
function avgPhoto(){ var ph=P.clips.filter(function(c){ return c.type==="img"; }); return ph.length?Math.round(ph.reduce(function(a,c){ return a+(c.dur||3); },0)/ph.length*2)/2:3; }
function applyStyle(k){ var S=STYLES[k]; remember(); P.style=k; P.trd=S.trd; P.filter=S.filter; P.anim=S.anim;
  P.clips.forEach(function(c,i){ delete c.look; if(c.type==="img"&&c.kb!=="kf") c.kb=kbFor(i); if(c.text) delete c.text.anim; }); changed(true); toast(TR("Стиль: {0}",TR(S.n))); }
/* цвет: готовые виды с живой миниатюрой текущего кадра и ручная подстройка */
function frameSrc(){ if(!P.clips.length) return null; var m=media(P.clips[clipAt(cur)]); return m.ok?m.el:null; }
function lookThumb(cv,id,src){ var X=cv.getContext("2d"), W=cv.width, H=cv.height; reset(X);
  if(src){ var w=src.videoWidth||src.naturalWidth||W, h=src.videoHeight||src.naturalHeight||H, s=Math.max(W/w,H/h), f=fstr(id); if(HASF) X.filter=f||"none"; try{ X.drawImage(src,(W-w*s)/2,(H-h*s)/2,w*s,h*s); }catch(e){} if(HASF) X.filter="none"; else if(f) fbFilter(X,f); }
  else { var g=X.createLinearGradient(0,0,W,H); g.addColorStop(0,"#ff9a4d"); g.addColorStop(.5,"#4fd6c8"); g.addColorStop(1,"#6a5cff"); if(HASF) X.filter=fstr(id)||"none"; X.fillStyle=g; X.fillRect(0,0,W,H); if(HASF) X.filter="none"; }
  grade(X,id,0,.45); }
function lookGrid(curId,fn){ var src=frameSrc(); return el('<div class="lks"></div>',function(g){ Object.keys(LOOKS).forEach(function(id){ g.appendChild(el('<button class="'+(curId===id?"on":"")+'"><canvas width="96" height="96"></canvas><span>'+esc(TR(LOOKS[id][0]))+'</span></button>',function(b){ lookThumb($("canvas",b),id,src); b.onclick=function(){ fn(id); }; })); }); }); }
function paneCol(box){ var A=P.adj=P.adj||{};
  box.appendChild(sh("Цвет всего ролика"));
  box.appendChild(lookGrid(P.filter,function(id){ remember(); P.filter=id; changed(); refreshPane(); }));
  if(!HASF) box.appendChild(note(TR("В этом браузере цвет получается приближённо: точные фильтры есть в Chrome, Edge и Firefox.")));
  box.appendChild(sh("Подстройка"));
  [["br","Яркость"],["ct","Контраст"],["sa","Насыщенность"],["tp","Тепло"]].forEach(function(o){ box.appendChild(range(TR(o[1]),Math.round((A[o[0]]||0)*100),-100,100,5,function(v){ return (v>0?"+":"")+v; },function(v){ A[o[0]]=v/100; redraw(); },function(){ refreshPane(); })); });
  [["vg","Виньетка"],["gr","Зерно"]].forEach(function(o){ box.appendChild(range(TR(o[1]),Math.round((A[o[0]]||0)*100),0,o[0]==="gr"?50:90,5,pct,function(v){ A[o[0]]=v/100; redraw(); },function(){ refreshPane(); })); });
  box.appendChild(el('<button class="btn w">'+esc(TR("Сбросить подстройку"))+'</button>',function(b){ b.onclick=function(){ remember(); P.adj={}; changed(); refreshPane(); }; }));
  box.appendChild(note(TR("Отдельному клипу можно дать свой цвет: выберите клип и откройте его настройки.")));
}
function paneMus(box){
  var L=TL();
  P.tracks.slice().sort(function(a,b){ return a.at-b.at; }).forEach(function(k){ box.appendChild(el('<button class="mrow2'+(selM===k.id?" on":"")+'"><span class="ic">'+sv("mus")+'</span><b data-nt></b><small>'+tms(k.at)+' · '+tms(k.len||0)+'</small></button>',function(r){ $("b",r).textContent=k.name; r.onclick=function(){ selectM(k.id); refreshPane(); }; })); });
  box.appendChild(el('<button class="btn w">'+sv("file")+'<span>'+esc(TR("Добавить песни"))+'</span><small>MP3, WAV</small></button>',function(b){ b.onclick=pickMusic; }));
  if(P.tracks.length){ box.appendChild(note(TR("Песни лежат на ленте под клипами: двигайте их мышкой, края обрезают начало и конец. Настройки песни открываются по нажатию на неё.")));
    if(musEnd()>L.total+.05&&L.total>0) box.appendChild(note(TR("Музыка длиннее ролика: всё, что правее последнего клипа, в видео не попадёт.")));
    box.appendChild(toggle(TR("Плавно убрать музыку в конце"),P.mfade!==false,function(v){ remember(); P.mfade=v; save(); })); }
  else box.appendChild(note(TR("Можно добавить несколько песен сразу, в том числе целые WAV до 150 МБ. Кусок песни удобно выбрать прямо на ленте, а бит сделать в битмейкере.")));
  if(P.clips.some(function(c){ return c.type==="vid"; })){ box.appendChild(sh("Звук из видео")); box.appendChild(range(TR("Громкость звука из видео"),Math.round((P.vvol==null?1:P.vvol)*100),0,100,1,pct,function(v){ P.vvol=v/100; if(MASTER) MASTER.gain.value=P.vvol; })); }
}
function paneMore(box){
  box.appendChild(el('<button class="btn w">'+sv("wand")+'<span>'+esc(TR("Пример из фонов"))+'</span><small>'+esc(TR("4 кадра с подписями"))+'</small></button>',function(n){ n.onclick=demo; }));
  box.appendChild(el('<button class="btn w">'+esc(TR("Сделать копию"))+'</button>',function(n){ n.onclick=function(){ var c=JSON.parse(JSON.stringify(P)); c.id=newId(); c.title=TR("{0} (копия)",P.title||""); c.updated=Date.now(); pPut(c).then(function(){ openP(c); toast(TR("Открыта копия")); }); }; }));
  box.appendChild(el('<button class="btn w del">'+esc(TR("Удалить ролик"))+'</button>',function(n){ n.onclick=function(){ ask(TR("Удалить «{0}»? Вернуть не получится.",P.title||""),TR("Удалить")).then(function(y){ if(y){ var p=P; stopPlay(); pDel(p).then(function(){ P=null; showHome(); }); } }); }; }));
  box.appendChild(el('<p class="note" style="margin-top:8px">'+esc(TR("Ролик и исходные файлы хранятся в этом браузере. Пробел: играть и стоп. Стрелки: шаг по времени. S: разрезать клип по курсору. M: звук видео. Delete: удалить клип. Ctrl+Z: отменить. Ctrl и колесо над лентой: масштаб."))+'</p>'));
}
/* настройки выбранной песни */
function inspMus(k){ var L=TL();
  $("#shTitle").textContent=k.name;
  insp.appendChild(el('<div class="mrow2 st"><span class="ic">'+sv("mus")+'</span><b data-nt></b><button class="btn del" title="'+esc(TR("Убрать песню"))+'">'+sv("x")+'</button></div>',function(r){ $("b",r).textContent=k.name; $("button",r).onclick=function(){ remember(); P.tracks=P.tracks.filter(function(o){ return o!==k; }); selM=null; changed(true); }; }));
  insp.appendChild(range(TR("Громкость"),Math.round((k.vol==null?.8:k.vol)*100),0,100,1,pct,function(v){ k.vol=v/100; }));
  insp.appendChild(range(TR("Место в ролике"),Math.round(k.at*10)/10,0,Math.max(1,Math.ceil(Math.max(L.total,k.at+1))),.1,tm,function(v){ k.at=v; timeline(); }));
  insp.appendChild(range(TR("Начать песню с"),Math.round((k.in||0)*10)/10,0,Math.max(.1,Math.floor(((k.dur||1)-.5)*10)/10),.1,tm,function(v){ k.in=v; k.len=Math.min(k.len,Math.max(.5,k.dur-v)); timeline(); },function(){ refreshInsp(); }));
  insp.appendChild(range(TR("Сколько играть"),Math.round((k.len||0)*10)/10,.5,Math.max(.6,Math.floor(((k.dur||1)-(k.in||0))*10)/10),.1,tm,function(v){ k.len=v; timeline(); }));
  insp.appendChild(el('<div class="row" style="margin-bottom:12px"><button class="btn">'+esc(TR("На курсор"))+'</button><button class="btn">'+esc(TR("До конца ролика"))+'</button></div>',function(r){ var b=$$("button",r);
    b[0].onclick=function(){ remember(); k.at=Math.round(cur*100)/100; changed(true); }; b[1].onclick=function(){ if(L.total-k.at<.5){ toast(TR("Песня стоит правее конца ролика")); return; } remember(); k.len=clamp(L.total-k.at,.5,Math.max(.5,k.dur-(k.in||0))); changed(true); }; }));
  insp.appendChild(range(TR("Плавное начало"),k.fi||0,0,6,.5,sec,function(v){ k.fi=v; }));
  insp.appendChild(range(TR("Плавный конец"),k.fo||0,0,6,.5,sec,function(v){ k.fo=v; }));
  insp.appendChild(note(TR("Две песни можно свести внахлёст: поставьте вторую чуть раньше конца первой и дайте первой плавный конец, а второй плавное начало.")));
}
/* движение кадра: готовые ходы и свои точки */
function ltOf(c){ var i=P.clips.indexOf(c), L=TL(), s=L.s[i]; if(cur<s-.001||cur>s+clen(c)+.001){ cur=s; sync(cur,false); timeUi(); } return clamp(cur-s,0,clen(c)); }
function motionUi(c){
  insp.appendChild(choice(TR("Движение"),Object.keys(KBS).map(function(k){ return [k,TR(KBS[k])]; }),c.kb||"none",function(v){ remember(); c.kb=v; if(v==="kf"&&!(c.keys&&c.keys.length)){ c.mvk="inout"; c.mvd=2; c.mvz=1.3; genKeys(c); } changed(); refreshInsp(); }));
  if(c.kb!=="kf") return;
  insp.appendChild(choice(TR("Готовое движение"),[["in",TR("приблизить")],["inout",TR("приблизить и вернуть")],["out",TR("отдалить")],["pan",TR("проезд")]],c.mvk||"",function(v){ remember(); c.mvk=v; if(c.mvd==null) c.mvd=2; c.mvz=c.mvz||1.3; genKeys(c); changed(); refreshInsp(); }));
  if(c.mvk){ insp.appendChild(choice(TR("За сколько"),[[1,"1 "+TR("с")],[2,"2 "+TR("с")],[3,"3 "+TR("с")],[5,"5 "+TR("с")],[0,TR("весь клип")]],c.mvd||0,function(v){ remember(); c.mvd=+v; genKeys(c); changed(); refreshInsp(); }));
    insp.appendChild(range(TR("Сила"),Math.round((c.mvz||1.3)*100),105,300,5,pct,function(v){ c.mvz=v/100; genKeys(c); draw(cur); },function(){ timeline(); refreshInsp(); })); }
  insp.appendChild(sh("Точки движения"));
  insp.appendChild(note(TR("Точка запоминает, как стоит кадр в этот момент. Между точками кадр едет плавно. Встаньте на нужное время в ленте и подвиньте кадр мышкой, колесо приближает: точка поставится сама.")));
  var lt=ltOf(c), K=keyAt(c,lt,false), m=motion(c,lt);
  function edit(fn){ return function(v){ var k=keyAt(c,ltOf(c),true); delete c.mvk; fn(k,v); draw(cur); }; }
  function done(){ timeline(); refreshInsp(); }
  insp.appendChild(range(TR("Приближение"),Math.round(m.z*100),100,400,5,pct,edit(function(k,v){ k.z=v/100; }),done));
  insp.appendChild(range(TR("Сдвиг вбок"),Math.round((m.x||0)*100),-100,100,5,function(v){ return String(v); },edit(function(k,v){ k.x=v/100; }),done));
  insp.appendChild(range(TR("Сдвиг вверх и вниз"),Math.round((m.y||0)*100),-100,100,5,function(v){ return String(v); },edit(function(k,v){ k.y=v/100; }),done));
  insp.appendChild(el('<div class="kls"></div>',function(g){ (c.keys||[]).forEach(function(k){ g.appendChild(el('<div class="kl'+(k===K?" on":"")+'"><button class="go">'+sv("key")+'<b>'+tm(k.t)+'</b><span>'+Math.round(k.z*100)+'%</span></button><button class="rm" title="'+esc(TR("Убрать точку"))+'">'+sv("x")+'</button></div>',function(r){
      $(".go",r).onclick=function(){ seek(TL().s[P.clips.indexOf(c)]+Math.min(k.t,clen(c)-.02)); refreshInsp(); }; $(".rm",r).onclick=function(){ remember(); delete c.mvk; c.keys=c.keys.filter(function(o){ return o!==k; }); changed(); refreshInsp(); }; })); }); }));
  insp.appendChild(el('<div class="row" style="margin-bottom:12px"><button class="btn">'+esc(TR(K?"Точка стоит здесь":"Поставить точку здесь"))+'</button><button class="btn del">'+esc(TR("Убрать все точки"))+'</button></div>',function(r){ var b=$$("button",r); b[0].disabled=!!K;
    b[0].onclick=function(){ remember(); keyAt(c,ltOf(c),true); delete c.mvk; changed(); refreshInsp(); }; b[1].onclick=function(){ remember(); c.keys=[]; delete c.mvk; changed(); refreshInsp(); }; }));
}
/* настройки выбранного клипа */
function refreshInsp(){
  if(!P) return; if(!wide.matches&&ui.sheet!=="insp") return; var sc0=insp.scrollTop; insp.innerHTML=""; var k=selM&&trackOf(selM); if(k){ inspMus(k); insp.scrollTop=sc0; return; }
  if(selJ!=null&&selJ<P.clips.length-1){ inspJn(selJ); insp.scrollTop=sc0; return; } selJ=null;
  var c=P.clips[selC];
  $("#shTitle").textContent=c?TR("Клип {0}",selC+1):TR("Клип");
  if(!c){ insp.appendChild(el('<p class="note">'+esc(TR("Добавьте фото и видео: кнопка «+» в ленте внизу или перетащите файлы в окно."))+'</p>')); return; }
  insp.appendChild(el('<div class="row cbar"></div>',function(r){
    [["l","Раньше",function(){ if(selC>0){ remember(); var t=P.clips[selC]; P.clips[selC]=P.clips[selC-1]; P.clips[selC-1]=t; selC--; changed(true); } }],
     ["r","Позже",function(){ if(selC<P.clips.length-1){ remember(); var t=P.clips[selC]; P.clips[selC]=P.clips[selC+1]; P.clips[selC+1]=t; selC++; changed(true); } }],
     ["dup","Копия клипа",function(){ remember(); var q=JSON.parse(JSON.stringify(c)); q.id=newId("c"); P.clips.splice(selC+1,0,q); selC++; changed(true); }],
     ["x","Удалить клип",function(){ delClip(selC); }]].forEach(function(o){
      r.appendChild(el('<button class="btn" title="'+esc(TR(o[1]))+'">'+sv(o[0])+'</button>',function(b){ b.onclick=o[2]; })); }); }));
  if(c.type==="img") insp.appendChild(range(TR("Длительность"),c.dur||3,.5,15,.5,sec,function(v){ c.dur=v; fixKeys(c); timeline(); redraw(); },function(){ refreshInsp(); }));
  else { var len=c.len||c.out||10;
    insp.appendChild(range(TR("Начало"),Math.round((c.in||0)*10)/10,0,Math.max(.1,Math.floor(len*10)/10),.1,tm,function(v){ c.in=Math.min(v,(c.out||len)-.3); fixKeys(c); timeline(); seek(TL().s[selC]); }));
    insp.appendChild(range(TR("Конец"),Math.round((c.out||len)*10)/10,.3,Math.floor(len*10)/10,.1,tm,function(v){ c.out=Math.max(v,(c.in||0)+.3); fixKeys(c); timeline(); seek(TL().s[selC]+Math.max(0,clen(c)-1)); }));
    insp.appendChild(el('<p class="note" style="margin:-4px 0 10px">'+esc(TR("Кусок: {0}",sec(clen(c))))+'</p>'));
    insp.appendChild(toggle(TR("Звук этого видео"),!c.mute,function(v){ if(!!c.mute===!v) return; toggleMute(c); }));
    if(!c.mute) insp.appendChild(range(TR("Громкость"),Math.round((c.vol==null?1:c.vol)*100),0,100,1,pct,function(v){ c.vol=v/100; })); }
  insp.appendChild(sh("Разрезать"));
  insp.appendChild(el('<div class="row cutr"><button class="btn" data-a="s">'+sv("cut")+'<span>'+esc(TR("По курсору"))+'</span></button><button class="btn" data-a="l">'+esc(TR("Убрать до курсора"))+'</button><button class="btn" data-a="r">'+esc(TR("Убрать после"))+'</button></div>',function(r){
    $$("button",r).forEach(function(b){ b.onclick=function(){ var a=b.getAttribute("data-a"); if(a==="s") splitClip(); else trimAt(a); }; }); }));
  insp.appendChild(note(TR("Разрез проходит по курсору, это белая линия в ленте. Ножницы под плеером и клавиша S тоже режут. Файл не меняется: у куска просто сдвигаются начало и конец.")));
  insp.appendChild(sh("Текст на клипе"));
  c.text=c.text||{ t:"", style:"title", pos:"bot", color:"#ffffff" }; var T=c.text;
  insp.appendChild(el('<div class="f"><textarea rows="2" maxlength="140" placeholder="'+esc(TR("Надпись поверх кадра"))+'"></textarea></div>',function(f){ var i=$("textarea",f), first=true; i.value=T.t||"";
    i.oninput=function(){ if(first){ first=false; remember(); } T.t=i.value; save(); redraw(); }; i.onblur=function(){ first=true; timeline(); }; }));
  insp.appendChild(choice(TR("Вид"),Object.keys(TSTY).map(function(q){ return [q,TR(TSTY[q])]; }),T.style||"title",function(v){ remember(); T.style=v; changed(); }));
  insp.appendChild(choice(TR("Где"),Object.keys(TPOS).map(function(q){ return [q,TR(TPOS[q])]; }).concat(T.x!=null?[["own",TR("своё место")]]:[]),T.x!=null?"own":(T.pos||"bot"),function(v){ if(v==="own") return; remember(); T.pos=v; delete T.x; delete T.y; changed(); refreshInsp(); }));
  insp.appendChild(note(TR("Надпись можно двигать прямо по кадру мышкой или пальцем, уголок рамки меняет размер.")));
  insp.appendChild(range(TR("Размер"),Math.round((T.size||1)*100),40,300,5,pct,function(v){ T.size=v/100; redraw(); }));
  insp.appendChild(choice(TR("Появление"),Object.keys(TANI).map(function(q){ return [q,TR(TANI[q])]; }),T.anim||P.anim,function(v){ remember(); T.anim=v; changed(); }));
  insp.appendChild(el('<div class="sws"></div>',function(w){ ["#ffffff","#ffd166","#4fd6c8","#ff5fa2","#ff9a4d","#111111"].forEach(function(col){ w.appendChild(el('<button class="'+((T.color||"#ffffff")===col?"on":"")+'" style="background:'+col+'"></button>',function(b){ b.onclick=function(){ remember(); T.color=col; changed(); refreshInsp(); }; })); }); }));
  insp.appendChild(sh("Кадр"));
  motionUi(c);
  if(selC<P.clips.length-1) insp.appendChild(trSelect(TR("Переход к следующему"),c.tr||"none",function(v){ remember(); if(v==="none"){ delete c.tr; delete c.trd; } else c.tr=v; changed(); if(v!=="none") previewCut(selC); }));
  insp.appendChild(pick1(TR("Цвет этого клипа"),[["",TR("как у всего ролика")]].concat(Object.keys(LOOKS).map(function(id){ return [id,TR(LOOKS[id][0])]; })),c.look||"",function(v){ remember(); if(v) c.look=v; else delete c.look; changed(); }));
  insp.scrollTop=sc0;
}

/* ═══════════ окна, клавиши ═══════════ */
function modal(h){ $("#mbox").innerHTML=h; $("#modal").classList.add("on"); }
function closeModal(){ $("#modal").classList.remove("on"); }
$("#modal").addEventListener("click",function(e){ if(e.target.closest("[data-close]")) closeModal(); });
function ask(text,ok){ return new Promise(function(res){ modal('<h3>'+esc(text)+'</h3><div class="row"><button class="btn" data-n>'+esc(TR("Отмена"))+'</button><button class="btn go" data-y>'+esc(ok)+'</button></div>');
  $("#mbox [data-n]").onclick=function(){ closeModal(); res(false); }; $("#mbox [data-y]").onclick=function(){ closeModal(); res(true); }; }); }
var tT=0; function toast(t){ var e=$("#toast"); e.textContent=t; e.classList.add("on"); clearTimeout(tT); tT=setTimeout(function(){ e.classList.remove("on"); },2800); }
addEventListener("keydown",function(e){ if($("#ed").hidden||$("#modal").classList.contains("on")) return; if(/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) return; var k=e.key.toLowerCase();
  if((e.ctrlKey||e.metaKey)&&k==="z"){ e.preventDefault(); $(e.shiftKey?"#redo":"#undo").click(); } else if((e.ctrlKey||e.metaKey)&&k==="y"){ e.preventDefault(); $("#redo").click(); }
  else if(k===" "){ e.preventDefault(); $("#playBtn").click(); }
  else if(k==="arrowleft"||k==="arrowright"){ e.preventDefault(); if(PL.on) stopPlay(); seek(Math.round((cur+(k==="arrowleft"?-1:1)*(e.shiftKey?1:.1))*20)/20); if(P.clips.length){ var i=clipAt(cur); if(!selM&&i!==selC){ selC=i; timeline(); } refreshInsp(); } }
  else if((k==="delete"||k==="backspace")&&selM&&trackOf(selM)){ e.preventDefault(); remember(); P.tracks=P.tracks.filter(function(o){ return o.id!==selM; }); selM=null; changed(true); }
  else if((k==="delete"||k==="backspace")&&selJ!=null&&P.clips[selJ]){ e.preventDefault(); remember(); delete P.clips[selJ].tr; delete P.clips[selJ].trd; changed(true); }
  else if((k==="delete"||k==="backspace")&&!selM&&P.clips[selC]){ e.preventDefault(); delClip(selC); }
  else if(k==="s"&&!e.ctrlKey&&!e.metaKey){ e.preventDefault(); splitClip(); }
  else if(k==="m"&&!e.ctrlKey&&!e.metaKey){ var mc=P.clips[clipAt(cur)]; if(mc&&mc.type==="vid") toggleMute(mc); } });
$("#title").addEventListener("input",function(){ if(P){ P.title=this.value; save(); } });
$("#emptyAdd").onclick=pickMedia; $("#emptyDemo").onclick=function(){ demo(); };

/* ═══════════ мои ролики ═══════════ */
function setCanvas(){ var pv=FMT[P.fmt].pv; if(CV.width!==pv[0]||CV.height!==pv[1]){ CV.width=pv[0]; CV.height=pv[1]; } cvw.style.setProperty("--ar",pv[0]+"/"+pv[1]); cvw.className="cvw f"+P.fmt; }
function showHome(){ stopPlay(); $("#ed").hidden=true; $("#home").hidden=false; document.title=TR("FORGE · монтаж роликов");
  try{ history.replaceState(null,"",location.pathname+location.search); }catch(e){}
  pAll().then(function(list){ list.sort(function(a,b){ return (b.updated||0)-(a.updated||0); }); var my=$("#myV"); my.innerHTML="";
    if(!list.length) my.appendChild(el('<p class="note">'+esc(TR("Здесь появятся ваши ролики."))+'</p>'));
    list.forEach(function(p){ var d=new Date(p.updated||Date.now()), when=d.toLocaleDateString(window.FLANG||"ru",{day:"numeric",month:"short"});
      var n=el('<div class="vc"><button class="th f'+p.fmt+'"></button><b data-nt></b><small>'+when+', '+(p.clips||[]).length+' '+esc(TR("клипов"))+'</small><div class="acts"><button data-a="copy">'+esc(TR("копия"))+'</button><button data-a="del">'+esc(TR("удалить"))+'</button></div></div>');
      $("b",n).textContent=p.title||""; $(".th",n).onclick=function(){ openP(p); }; if(p.clips&&p.clips[0]) thumb(p.clips[0]).then(function(u){ if(u) $(".th",n).style.backgroundImage="url('"+u+"')"; });
      $$(".acts button",n).forEach(function(x){ x.onclick=function(){ if(x.getAttribute("data-a")==="copy"){ var k=JSON.parse(JSON.stringify(p)); k.id=newId(); k.title=TR("{0} (копия)",p.title||""); k.updated=Date.now(); pPut(k).then(showHome); }
        else ask(TR("Удалить «{0}»? Вернуть не получится.",p.title||""),TR("Удалить")).then(function(y){ if(y) pDel(p).then(showHome); }); }; });
      my.appendChild(n); }); });
  var g=$("#fmtV"); g.innerHTML="";
  Object.keys(FMT).forEach(function(k){ g.appendChild(el('<button class="vf"><i class="f'+k+'"></i><b>'+esc(TR(FMT[k].n))+'</b><small>'+esc(TR(FMT[k].d))+'</small></button>',function(b){ b.onclick=function(){ create(newProject(k,"smooth")); }; })); });
}
function create(p){ return pPut(p).catch(function(){}).then(function(){ openP(p); }); }
function openP(p){ stopPlay(); Object.keys(AUD).forEach(function(id){ if(AUD[id].el) AUD[id].el.pause(); }); P=migrate(p); U=[]; Rd=[]; undoBtns(); selC=0; selM=null; cur=0; MEDIA={}; AUD={};
  $("#home").hidden=true; $("#ed").hidden=false; document.title="FORGE · "+(P.title||""); $("#title").value=P.title||""; setCanvas();
  try{ history.replaceState(null,"",location.pathname+location.search+"#"+P.id); }catch(e){}
  if(wide.matches){ openTab("vid"); refreshInsp(); } else closeSheet(); fitPps(); timeline(); P.clips.forEach(media); draw(0); }
$("#toHome").onclick=function(){ save(); stopPlay(); setTimeout(showHome,380); };
if(document.fonts) document.fonts.ready.then(function(){ if(P) redraw(); });
(function boot(){ var h=location.hash.slice(1); if(h&&!/=/.test(h)) pGet(h).then(function(p){ if(p) openP(p); else showHome(); }); else showHome(); })();
})();
