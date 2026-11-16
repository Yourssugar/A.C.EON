/* FORGE монтаж коротких роликов.
   Ролик = клипы по очереди (фото или видео) + текст на клипе + переходы + одна музыка.
   Всё рисуется на canvas: превью и сборка видео идут одним и тем же кодом (draw), поэтому файл выходит таким же, как превью.
   Сборка в реальном времени: canvas.captureStream + звук через Web Audio в MediaRecorder (ролик 1 мин = 1 мин сборки).
   Исходные файлы лежат в IndexedDB «forge-montazh» (blobs), проект в projects. */
(function(){
"use strict";
var $=function(s,r){ return (r||document).querySelector(s); };
var $$=function(s,r){ return [].slice.call((r||document).querySelectorAll(s)); };
var wide=matchMedia("(min-width:960px)");
function el(html, fn){ var d=document.createElement("div"); d.innerHTML=html.trim(); var n=d.firstElementChild; if(fn) fn(n); return n; }
function sh(t){ return el('<div class="sh">'+esc(t)+'</div>'); }
function choice(label, opts, cur, fn){ return el('<div class="f">'+(label?'<label>'+esc(label)+'</label>':'')+'<div class="chips">'+opts.map(function(o){ return '<button data-v="'+o[0]+'" class="'+(String(o[0])===String(cur)?"on":"")+'">'+esc(o[1])+'</button>'; }).join("")+'</div></div>',function(n){
  $$("button",n).forEach(function(x){ x.onclick=function(){ $$("button",n).forEach(function(y){ y.classList.toggle("on",y===x); }); fn(x.getAttribute("data-v")); }; }); }); }
function range(label,v,min,max,step,fmt,fn,done){ return el('<div class="f"><div class="lab"><span>'+esc(label)+'</span><output>'+fmt(v)+'</output></div><input type="range" min="'+min+'" max="'+max+'" step="'+step+'" value="'+v+'"></div>',function(n){
  var o=$("output",n), i=$("input",n), first=true; i.oninput=function(){ if(first){ first=false; remember(); } o.textContent=fmt(Number(i.value)); fn(Number(i.value)); }; i.onchange=function(){ first=true; save(); if(done) done(Number(i.value)); }; }); }
function toggle(label,v,fn){ return el('<label class="tg"><span>'+esc(label)+'</span><input type="checkbox"'+(v?" checked":"")+'></label>',function(n){ $("input",n).onchange=function(){ fn(this.checked); }; }); }
var SV={ img:"M4 5h16v14H4zM4 15l4-4 5 5 3-3 4 4", vid:"M3 6h13v12H3zM16 10l5-3v10l-5-3", add:"M12 5v14M5 12h14", x:"M6 6l12 12M18 6L6 18", l:"M15 5l-7 7 7 7", r:"M9 5l7 7-7 7", dup:"M8 8h12v12H8zM4 16V4h12",
  file:"M14 3H6v18h12V7zM14 3v4h4", mus:"M9 18V5l11-2v13M9 18a3 3 0 11-6 0 3 3 0 016 0zM20 16a3 3 0 11-6 0 3 3 0 016 0z", txt:"M5 6h14M12 6v13M9 19h6", wand:"M15 4l5 5L9 20l-5-5zM13 6l5 5" };
function sv(n){ return '<svg viewBox="0 0 24 24"><path d="'+SV[n]+'"/></svg>'; }
function tm(s){ s=Math.max(0,s||0); var m=Math.floor(s/60), r=s-m*60; return m+":"+r.toFixed(1).padStart(4,"0"); }
function clamp(x,a,b){ return x<a?a:x>b?b:x; }
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
function aids(p){ var a=(p.clips||[]).map(function(c){ return c.aid; }); if(p.music) a.push(p.music.aid); return a; }
function pDel(p){ return tx("projects","readwrite",function(s){ s.delete(p.id); }).then(pAll).then(function(all){ var u={}; all.forEach(function(q){ aids(q).forEach(function(a){ u[a]=1; }); });
  return tx("blobs","readwrite",function(s){ aids(p).forEach(function(a){ if(!u[a]) s.delete(a); }); }); }); }
function bPut(aid,b){ return tx("blobs","readwrite",function(s){ s.put(b,aid); }); }
function bGet(aid){ return tx("blobs","readonly",function(s){ return s.get(aid); }).catch(function(){ return null; }); }
function newId(p){ return (p||"m")+Date.now().toString(36)+Math.random().toString(36).slice(2,6); }
var URLS={}; function blobUrl(aid){ if(!aid) return Promise.resolve(""); if(URLS[aid]) return Promise.resolve(URLS[aid]); return bGet(aid).then(function(b){ if(!b) return ""; URLS[aid]=URL.createObjectURL(b); return URLS[aid]; }); }

/* ═══════════ формат, стиль ═══════════ */
var FMT={ "9x16":{ pv:[540,960], ex:{ 720:[720,1280], 1080:[1080,1920] }, n:"вертикальный 9:16", d:"сторис, шортс, рилс" },
  "1x1":{ pv:[720,720], ex:{ 720:[720,720], 1080:[1080,1080] }, n:"квадрат 1:1", d:"лента соцсетей" },
  "16x9":{ pv:[960,540], ex:{ 720:[1280,720], 1080:[1920,1080] }, n:"горизонтальный 16:9", d:"YouTube, экран" } };
var STYLES={ smooth:{ n:"Плавно", tr:"fade", trd:.8, kb:"auto", filter:"warm", anim:"fade", dur:3.5 },
  dyn:{ n:"Динамично", tr:"slide", trd:.4, kb:"in", filter:"vivid", anim:"pop", dur:2.2 },
  retro:{ n:"Ретро", tr:"black", trd:.7, kb:"out", filter:"vintage", anim:"type", dur:3 },
  clean:{ n:"Чисто", tr:"none", trd:.5, kb:"none", filter:"none", anim:"up", dur:3 } };
var FILTERS={ none:["без фильтра",""], warm:["тёплый","sepia(.18) saturate(1.15) hue-rotate(-6deg)"], cold:["холодный","saturate(.9) hue-rotate(14deg) brightness(1.03)"], vivid:["ярче","saturate(1.4) contrast(1.08)"],
  bw:["чёрно-белый","grayscale(1) contrast(1.12)"], vintage:["винтаж","sepia(.4) contrast(1.08) saturate(.85) brightness(.97)"] };
var TRS={ none:"без перехода", fade:"растворение", black:"через чёрный", slide:"сдвиг", zoom:"наплыв", wipe:"шторка" };
var KBS={ none:"стоит", in:"приближение", out:"отдаление", left:"влево", right:"вправо" };
var TSTY={ title:"заголовок", sub:"субтитр", label:"плашка" }, TPOS={ top:"сверху", mid:"по центру", bot:"снизу" }, TANI={ fade:"проявление", pop:"выскок", up:"снизу вверх", type:"печатная машинка" };
function newProject(fmt,style){ var S=STYLES[style||"smooth"]; return { v:1, id:newId(), title:TR("Новый ролик"), fmt:fmt||"9x16", style:style||"smooth", fit:"cover", filter:S.filter, tr:S.tr, trd:S.trd, anim:S.anim, clips:[], music:null, vvol:1, q:720, updated:Date.now() }; }

/* ═══════════ проект и время ═══════════ */
var P=null;
function clen(c){ return c.type==="vid"?Math.max(.2,(c.out||0)-(c.in||0)):(c.dur||3); }
/* начала клипов с учётом переходов: следующий клип начинается раньше на длину перехода */
function TL(){ var s=[], d=[], t=0, cl=P?P.clips:[]; for(var i=0;i<cl.length;i++){ s.push(t); var tr=cl[i].tr||P.tr, dd=0;
    if(i<cl.length-1&&tr!=="none") dd=Math.min(P.trd||.6,clen(cl[i])/2,clen(cl[i+1])/2); d.push(dd); t+=clen(cl[i])-dd; }
  var total=cl.length?s[cl.length-1]+clen(cl[cl.length-1]):0; return { s:s, d:d, total:total }; }

/* ═══════════ медиа ═══════════ */
var MEDIA={}, THUMB={};
function media(c){ var m=MEDIA[c.id]; if(m&&m.aid===c.aid) return m;
  m=MEDIA[c.id]={ aid:c.aid, el:null, ok:false };
  blobUrl(c.aid).then(function(u){ if(!u) return; if(c.type==="vid"){ var v=document.createElement("video"); v.playsInline=true; v.preload="auto"; v.muted=false; v.src=u;
      v.addEventListener("loadeddata",function(){ m.ok=true; if(!PL.on) draw(cur); }); v.addEventListener("seeked",function(){ if(!PL.on) draw(cur); }); m.el=v; if(AC) hookAudio(m); try{ v.currentTime=c.in||0; }catch(e){} }
    else { var im=new Image(); im.onload=function(){ m.ok=true; if(!PL.on) draw(cur); }; im.src=u; m.el=im; } });
  return m; }
function hookAudio(m){ if(m.node||!m.el||m.el.tagName!=="VIDEO") return; try{ m.node=AC.createMediaElementSource(m.el); m.g=AC.createGain(); m.node.connect(m.g); m.g.connect(MASTER); }catch(e){} }
function allReady(){ return Promise.all(P.clips.map(function(c){ var m=media(c); return new Promise(function(res){ var n=0; (function w(){ if(m.ok||n++>100) res(); else setTimeout(w,100); })(); }); })); }

/* ═══════════ рисование кадра ═══════════ */
var CV=$("#cv"), CX=CV.getContext("2d"), HASF="filter" in CX;
function draw(t){ var W=CV.width, H=CV.height; CX.setTransform(1,0,0,1,0,0); CX.globalAlpha=1; if(HASF) CX.filter="none"; CX.fillStyle="#000"; CX.fillRect(0,0,W,H);
  if(!P||!P.clips.length) return; var L=TL(), act=[];
  for(var i=0;i<P.clips.length;i++){ var s=L.s[i], e=s+clen(P.clips[i]); if(t>=s&&t<e) act.push(i); }
  if(!act.length) act=[t>=L.total?P.clips.length-1:0];
  if(act.length===1) layer(act[0],t-L.s[act[0]],1);
  else { var a=act[0], b=act[1], d=L.d[a]||.001, p=clamp((t-L.s[b])/d,0,1), tr=P.clips[a].tr||P.tr, la=t-L.s[a], lb=t-L.s[b];
    if(tr==="fade"){ layer(a,la,1); layer(b,lb,p); }
    else if(tr==="black"){ if(p<.5) layer(a,la,1-p*2); else layer(b,lb,(p-.5)*2); }
    else if(tr==="slide"){ var k=1-Math.pow(1-p,3); CX.save(); CX.translate(-k*W,0); layer(a,la,1); CX.restore(); CX.save(); CX.translate((1-k)*W,0); layer(b,lb,1); CX.restore(); }
    else if(tr==="zoom"){ CX.save(); zoomAt(1+p*.35); layer(a,la,1-p); CX.restore(); CX.save(); zoomAt(.85+.15*p); layer(b,lb,p); CX.restore(); }
    else if(tr==="wipe"){ layer(a,la,1); CX.save(); CX.beginPath(); CX.rect(0,0,W*p,H); CX.clip(); layer(b,lb,1); CX.restore(); CX.fillStyle="rgba(255,255,255,.85)"; CX.fillRect(W*p-2,0,4,H); }
    else layer(b,lb,1); }
  if(P.filter==="vintage"){ var g=CX.createRadialGradient(W/2,H/2,Math.min(W,H)*.35,W/2,H/2,Math.max(W,H)*.75); g.addColorStop(0,"rgba(0,0,0,0)"); g.addColorStop(1,"rgba(30,15,0,.55)"); CX.globalAlpha=1; CX.fillStyle=g; CX.fillRect(0,0,W,H); } }
function zoomAt(s){ var W=CV.width, H=CV.height; CX.translate(W/2,H/2); CX.scale(s,s); CX.translate(-W/2,-H/2); }
function layer(i,lt,alpha){ var c=P.clips[i]; if(!c||alpha<=0) return; CX.save(); CX.globalAlpha=alpha; drawMedia(c,lt); if(HASF) CX.filter="none"; drawText(c,lt); CX.restore(); }
function drawMedia(c,lt){ var W=CV.width, H=CV.height, m=media(c), e=m.el; if(!m.ok||!e) { CX.fillStyle="#15181d"; CX.fillRect(0,0,W,H); return; }
  var w=e.videoWidth||e.naturalWidth||W, h=e.videoHeight||e.naturalHeight||H, L=clen(c), k=clamp(lt/L,0,1), kb=c.kb||"none", sc=1, ox=0, oy=0;
  if(kb==="in") sc=1+.12*k; else if(kb==="out") sc=1.12-.12*k; else if(kb==="left"){ sc=1.12; ox=(.5-k)*.09; } else if(kb==="right"){ sc=1.12; ox=(k-.5)*.09; }
  var flt=FILTERS[P.filter]?FILTERS[P.filter][1]:"";
  if(P.fit==="blur"&&Math.abs(w/h-W/H)>.05){ var s0=Math.max(W/w,H/h)*1.1; if(HASF) CX.filter="blur("+Math.round(W/28)+"px) brightness(.6) "+flt; else { CX.globalAlpha*=.5; }
    CX.drawImage(e,(W-w*s0)/2,(H-h*s0)/2,w*s0,h*s0); if(!HASF) CX.globalAlpha*=2; var s1=Math.min(W/w,H/h)*sc; if(HASF) CX.filter=flt||"none"; CX.drawImage(e,(W-w*s1)/2+ox*W,(H-h*s1)/2+oy*H,w*s1,h*s1); return; }
  var s=Math.max(W/w,H/h)*sc; if(HASF) CX.filter=flt||"none"; CX.drawImage(e,(W-w*s)/2+ox*W,(H-h*s)/2+oy*H,w*s,h*s); }
/* текст на клипе: стиль, место, появление; переносы по ширине кадра */
function wrap(text,maxW){ var out=[]; String(text).split("\n").forEach(function(par){ var words=par.split(/\s+/), line="";
  words.forEach(function(w){ var tt=line?line+" "+w:w; if(CX.measureText(tt).width>maxW&&line){ out.push(line); line=w; } else line=tt; }); out.push(line); }); return out; }
function drawText(c,lt){ var T=c.text; if(!T||!String(T.t||"").trim()) return; var W=CV.width, H=CV.height, M=Math.min(W,H), L=clen(c), st=T.style||"title", anim=T.anim||P.anim||"fade";
  var inK=clamp((lt-.15)/.55,0,1), outK=clamp((L-lt)/.35,0,1), a=Math.min(inK,outK); if(a<=0) return;
  var str=String(T.t); if(anim==="type"){ var n=Math.floor(clamp((lt-.1)/Math.max(.6,str.length*.045),0,1)*str.length); str=str.slice(0,n); a=outK; if(!str) return; }
  var fs=st==="title"?M*.085:st==="sub"?M*.05:M*.042;
  CX.font=(st==="title"?"700 ":"800 ")+Math.round(fs)+"px "+(st==="title"?"Unbounded,Manrope,sans-serif":"Manrope,sans-serif");
  var txt=st==="label"?str.toUpperCase():str, lines=wrap(txt,W*.84), lh=fs*1.22, bh=lines.length*lh, y0=(T.pos==="top"?H*.13:T.pos==="mid"?H*.5-bh/2:H*.86-bh);
  CX.save(); CX.globalAlpha*=a; CX.textAlign="center"; CX.textBaseline="top";
  if(anim==="pop"){ var pk=inK<1?1+Math.sin(inK*Math.PI)*.18-(1-inK)*.4:1; CX.translate(W/2,y0+bh/2); CX.scale(pk,pk); CX.translate(-W/2,-(y0+bh/2)); }
  if(anim==="up") CX.translate(0,(1-inK)*M*.05);
  var col=T.color||"#ffffff";
  lines.forEach(function(ln,i){ var y=y0+i*lh, tw=CX.measureText(ln).width;
    if(st!=="title"){ var px=fs*.5, py=fs*.18; CX.fillStyle=st==="label"?col:"rgba(0,0,0,.6)"; rr(W/2-tw/2-px,y-py,tw+px*2,lh+py*.6-fs*.1,fs*.3); CX.fill(); CX.fillStyle=st==="label"?(isLight(col)?"#111":"#fff"):col; CX.shadowBlur=0; }
    else { CX.shadowColor="rgba(0,0,0,.55)"; CX.shadowBlur=fs*.35; CX.shadowOffsetY=fs*.05; CX.fillStyle=col; }
    CX.fillText(ln,W/2,y); });
  CX.restore(); }
function rr(x,y,w,h,r){ CX.beginPath(); CX.moveTo(x+r,y); CX.arcTo(x+w,y,x+w,y+h,r); CX.arcTo(x+w,y+h,x,y+h,r); CX.arcTo(x,y+h,x,y,r); CX.arcTo(x,y,x+w,y,r); CX.closePath(); }
function isLight(hex){ var n=parseInt(String(hex).slice(1),16); return ((n>>16)*.3+((n>>8)&255)*.59+(n&255)*.11)>150; }

/* ═══════════ проигрывание ═══════════ */
var AC=null, MASTER=null, MUS=null, RD=null, PL={ on:false, t0:0, raf:0, src:null, exp:null }, cur=0;
function ensureAC(){ if(!AC){ AC=new (window.AudioContext||window.webkitAudioContext)(); MASTER=AC.createGain(); MASTER.connect(AC.destination); MUS=AC.createGain(); MUS.connect(AC.destination); Object.keys(MEDIA).forEach(function(k){ hookAudio(MEDIA[k]); }); }
  if(AC.state==="suspended") AC.resume(); }
var MBUF={ aid:null, b:null };
function musicBuf(){ if(!P.music) return Promise.resolve(null); if(MBUF.aid===P.music.aid) return Promise.resolve(MBUF.b);
  return bGet(P.music.aid).then(function(b){ return b?b.arrayBuffer():null; }).then(function(ab){ if(!ab) return null; return new Promise(function(res){ var p=AC.decodeAudioData(ab,res,function(){ res(null); }); if(p&&p.then) p.then(res,function(){ res(null); }); }); })
    .then(function(b){ MBUF={ aid:P.music.aid, b:b }; return b; }); }
function play(from){ if(!P||!P.clips.length) return Promise.resolve(); ensureAC(); var L=TL(); if(from>=L.total-.05) from=0;
  return musicBuf().then(function(buf){ PL.on=true; PL.t0=AC.currentTime+.05-from; MASTER.gain.value=P.vvol;
    if(buf&&P.music){ var s=AC.createBufferSource(), g=AC.createGain(), now=AC.currentTime+.05, vol=P.music.vol==null?.8:P.music.vol, endAt=now+(L.total-from);
      s.buffer=buf; s.loop=true; s.connect(g); g.connect(MUS); if(RD) g.connect(RD);
      g.gain.setValueAtTime(vol,now); if(P.music.fade!==false&&L.total-from>2.5){ g.gain.setValueAtTime(vol,endAt-2); g.gain.linearRampToValueAtTime(0,endAt); }
      s.start(now,((P.music.start||0)+from)%buf.duration); PL.src=s; }
    playUi(); loop(); }); }
function stopPlay(){ PL.on=false; cancelAnimationFrame(PL.raf); if(PL.src){ try{ PL.src.stop(); }catch(e){} PL.src=null; } P&&P.clips.forEach(function(c){ var m=MEDIA[c.id]; if(m&&m.el&&m.el.tagName==="VIDEO"&&!m.el.paused) m.el.pause(); }); playUi(); }
function loop(){ if(!PL.on) return; var L=TL(), t=AC.currentTime-PL.t0; if(t<0) t=0;
  if(t>=L.total){ cur=L.total; draw(L.total-.001); stopPlay(); if(PL.exp) PL.exp(); else { cur=0; } timeUi(); return; }
  cur=t; sync(t,true); draw(t); timeUi(); PL.raf=requestAnimationFrame(loop); }
/* видео идут сами, мы только запускаем их вовремя и подправляем, если ушли больше чем на 0.3 с */
function sync(t,playing){ var L=TL(); P.clips.forEach(function(c,i){ if(c.type!=="vid") return; var m=media(c), v=m.el; if(!v) return; var s=L.s[i], e=s+clen(c), on=t>=s-.02&&t<e, target=(c.in||0)+(t-s);
  if(m.g) m.g.gain.value=c.vol==null?1:c.vol;
  if(on&&playing){ if(v.paused){ try{ v.currentTime=Math.max(c.in||0,target); }catch(x){} v.play().catch(function(){}); } else if(Math.abs(v.currentTime-target)>.3){ try{ v.currentTime=target; }catch(x){} } }
  else if(on){ if(Math.abs(v.currentTime-target)>.04){ try{ v.currentTime=Math.max(0,target); }catch(x){} } }
  else { if(!v.paused) v.pause(); if(playing&&t<s&&s-t<1.2&&Math.abs(v.currentTime-(c.in||0))>.1){ try{ v.currentTime=c.in||0; }catch(x){} } } }); }
function seek(t){ var L=TL(); cur=clamp(t,0,L.total); if(PL.on){ stopPlay(); play(cur); } else { sync(cur,false); draw(cur); timeUi(); } }
function playUi(){ $("#playBtn").classList.toggle("on",PL.on); }
$("#playBtn").onclick=function(){ if(PL.on) stopPlay(); else play(cur); };
function timeUi(){ var L=TL(); $("#tNow").textContent=tm(cur); $("#tAll").textContent="/ "+tm(L.total); var ph=$("#ph"); if(ph&&L.total>0){ var x=tlX(cur); ph.style.transform="translateX("+x+"px)"; } }

/* ═══════════ лента клипов ═══════════ */
var PPS=34, selC=0, tlEl=$("#tl");
function tlX(t){ var L=TL(), x=0; for(var i=0;i<P.clips.length;i++){ var s=L.s[i], len=clen(P.clips[i]), w=tileW(P.clips[i]); if(t<s+len-(L.d[i]||0)||i===P.clips.length-1){ return x+clamp((t-s)/len,0,1)*w; } x+=w+6; } return x; }
function tileW(c){ return Math.max(58,Math.min(280,clen(c)*PPS)); }
function timeline(){ tlEl.innerHTML=""; if(!P) return;
  var row=el('<div class="trow"></div>');
  P.clips.forEach(function(c,i){ var t=el('<button class="tc'+(i===selC?" on":"")+'" style="width:'+tileW(c)+'px"><i class="tb"></i><span class="ty">'+sv(c.type==="vid"?"vid":"img")+'</span><small>'+clen(c).toFixed(1)+' '+esc(TR("с"))+'</small>'+(c.text&&c.text.t?'<em>'+sv("txt")+'</em>':'')+'</button>');
    thumb(c).then(function(u){ if(u) $(".tb",t).style.backgroundImage="url('"+u+"')"; });
    t.onclick=function(e){ var r=t.getBoundingClientRect(), L=TL(); if(selC!==i){ selC=i; timeline(); refreshInsp(); if(!wide.matches&&ui.sheet==="insp") {} } seek(L.s[i]+clamp((e.clientX-r.left)/r.width,0,.98)*clen(c)); };
    if(i<P.clips.length-1&&(c.tr||P.tr)!=="none") t.classList.add("trn"); row.appendChild(t); });
  row.appendChild(el('<button class="tc add" title="'+esc(TR("Добавить фото или видео"))+'">'+sv("add")+'</button>',function(b){ b.onclick=pickMedia; }));
  tlEl.appendChild(row);
  tlEl.appendChild(el('<button class="tm'+(P.music?" on":"")+'">'+sv("mus")+'<span data-nt></span></button>',function(b){ $("span",b).textContent=P.music?P.music.name:TR("Добавить музыку"); b.onclick=function(){ if(P.music) openTab("mus"); else pickMusic(); }; }));
  row.appendChild(el('<i class="ph" id="ph"></i>'));
  $("#empty").hidden=!!P.clips.length; timeUi(); }
function thumb(c){ var k=c.aid+":"+(c.in||0); if(THUMB[k]) return Promise.resolve(THUMB[k]);
  return blobUrl(c.aid).then(function(u){ if(!u) return ""; if(c.type!=="vid") return (THUMB[k]=u);
    return new Promise(function(res){ var v=document.createElement("video"); v.muted=true; v.playsInline=true; v.preload="auto"; v.src=u;
      v.onloadeddata=function(){ try{ v.currentTime=Math.min((c.in||0)+.1,(v.duration||1)-.05); }catch(e){ res(""); } };
      v.onseeked=function(){ var cv=document.createElement("canvas"), s=160/Math.max(v.videoWidth,v.videoHeight); cv.width=Math.round(v.videoWidth*s); cv.height=Math.round(v.videoHeight*s); cv.getContext("2d").drawImage(v,0,0,cv.width,cv.height); THUMB[k]=cv.toDataURL("image/jpeg",.7); res(THUMB[k]); v.src=""; };
      v.onerror=function(){ res(""); }; }); }); }
tlEl.addEventListener("wheel",function(e){ if(Math.abs(e.deltaY)>Math.abs(e.deltaX)){ tlEl.scrollLeft+=e.deltaY; e.preventDefault(); } },{passive:false});

/* ═══════════ добавление файлов ═══════════ */
function pickFile(accept,multi,fn){ var f=$("#fIn"); f.value=""; f.accept=accept; f.multiple=!!multi; f.onchange=function(){ fn([].slice.call(f.files)); }; f.click(); }
function pickMedia(){ pickFile("image/*,video/*",true,addFiles); }
function addFiles(files){ files=files.filter(function(f){ return /^(image|video)\//.test(f.type); }); if(!files.length) return; toast(TR("Добавляю: {0}",files.length));
  var chain=Promise.resolve(), added=0; remember();
  files.forEach(function(f){ chain=chain.then(function(){ return f.type.indexOf("video")===0?addVideo(f):addImage(f); }).then(function(c){ if(c){ P.clips.push(c); added++; } }); });
  chain.then(function(){ selC=Math.max(0,P.clips.length-added); changed(true); toast(TR("Добавлено: {0}",added)); }); }
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
function pickMusic(){ pickFile("audio/*,.mp3,.m4a,.ogg,.wav",false,function(fs){ var f=fs[0]; if(!f) return; if(f.size>30*1024*1024){ toast(TR("Файл музыки больше 30 МБ")); return; }
  var aid=newId("a"); bPut(aid,f).then(function(){ remember(); P.music={ aid:aid, name:f.name.replace(/\.[^.]+$/,"").slice(0,40), vol:.8, start:0, fade:true }; changed(true); toast(TR("Добавлено: {0}",P.music.name)); }); }); }
var dropN=0;
addEventListener("dragenter",function(e){ if($("#ed").hidden) return; if(e.dataTransfer&&[].indexOf.call(e.dataTransfer.types||[],"Files")>=0){ dropN++; $("#drop").classList.add("on"); } });
addEventListener("dragleave",function(){ if(--dropN<=0){ dropN=0; $("#drop").classList.remove("on"); } });
addEventListener("dragover",function(e){ e.preventDefault(); });
addEventListener("drop",function(e){ e.preventDefault(); dropN=0; $("#drop").classList.remove("on"); if(!P||$("#ed").hidden) return; var fs=[].slice.call(e.dataTransfer.files||[]);
  var au=fs.filter(function(f){ return /^audio\//.test(f.type); }); if(au.length&&!P.music){ var aid=newId("a"); bPut(aid,au[0]).then(function(){ remember(); P.music={ aid:aid, name:au[0].name.replace(/\.[^.]+$/,""), vol:.8, start:0, fade:true }; changed(true); }); }
  addFiles(fs); });
/* пример без своих файлов: четыре кадра из мастерской фонов с подписями */
function demo(){ if(!F){ toast(TR("Нет мастерской фонов")); return; } var dims=FMT[P.fmt].ex[1080], tpl=["sunset","sea","party","retro"], txt=["Наше лето","Море","Друзья","До встречи!"];
  toast(TR("Готовлю пример...")); remember(); var chain=Promise.resolve();
  tpl.forEach(function(id,i){ chain=chain.then(function(){ return new Promise(function(res){ var b=F.fromTpl(id), s=F.svg(b,dims[0],dims[1]), u=URL.createObjectURL(new Blob([s],{type:"image/svg+xml"})), im=new Image();
    im.onload=function(){ var cv=document.createElement("canvas"); cv.width=dims[0]; cv.height=dims[1]; cv.getContext("2d").drawImage(im,0,0,dims[0],dims[1]); URL.revokeObjectURL(u);
      cv.toBlob(function(bl){ var aid=newId("i"); bPut(aid,bl).then(function(){ P.clips.push({ id:newId("c"), type:"img", aid:aid, name:"demo"+i, dur:(STYLES[P.style]||STYLES.smooth).dur, kb:kbFor(i), w:dims[0], h:dims[1],
        text:{ t:TR(txt[i]), style:i===0?"title":i===3?"title":"label", pos:i===0?"mid":i===3?"mid":"bot", anim:P.anim, color:"#ffffff" } }); res(); }); },"image/jpeg",.9); };
    im.onerror=function(){ res(); }; im.src=u; }); }); });
  chain.then(function(){ selC=0; changed(true); seek(0); }); }

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
  allReady().then(function(){ ensureAC(); RD=AC.createMediaStreamDestination(); MASTER.connect(RD);
    CV.width=ex[0]; CV.height=ex[1]; draw(0);
    var vs=CV.captureStream(30), stream=new MediaStream(vs.getVideoTracks().concat(RD.stream.getAudioTracks())), rec;
    try{ rec=new MediaRecorder(stream,{ mimeType:mm[1], videoBitsPerSecond:P.q===1080?9e6:5e6, audioBitsPerSecond:160000 }); }catch(e){ rec=new MediaRecorder(stream); }
    rec.ondataavailable=function(e){ if(e.data&&e.data.size) parts.push(e.data); };
    var iv=setInterval(function(){ var pg=$("#pg"), t=PL.on?AC.currentTime-PL.t0:0; if(pg) pg.style.width=Math.round(clamp(t/L.total,0,1)*100)+"%"; var pt=$("#pgT"); if(pt) pt.textContent=tm(t)+" / "+tm(L.total); },250);
    function finish(){ clearInterval(iv); try{ MASTER.disconnect(RD); }catch(e){} RD=null; PL.exp=null; var pv=FMT[P.fmt].pv; CV.width=pv[0]; CV.height=pv[1]; cur=0; draw(0); timeUi(); }
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
function restoreS(s){ var o=JSON.parse(s); for(var k in o) P[k]=o[k]; $("#title").value=P.title||""; selC=Math.min(selC,Math.max(0,P.clips.length-1)); undoBtns(); changed(true); }
$("#undo").onclick=function(){ if(!U.length) return; Rd.push(snap()); restoreS(U.pop()); };
$("#redo").onclick=function(){ if(!Rd.length) return; U.push(snap()); restoreS(Rd.pop()); };
var saveT=0; function save(){ clearTimeout(saveT); saveT=setTimeout(function(){ if(!P) return; P.updated=Date.now(); pPut(JSON.parse(JSON.stringify(P))).catch(function(){ toast(TR("Не получилось сохранить: память браузера заполнена")); }); },350); }
var rT=0; function redraw(){ clearTimeout(rT); rT=setTimeout(function(){ if(!PL.on){ sync(cur,false); draw(cur); } timeUi(); },30); }
function changed(all){ save(); timeline(); redraw(); if(all) refresh(); }

/* ═══════════ панели ═══════════ */
var pane=$("#pane"), insp=$("#insp"), right=$("#right"), ui={ tab:null, sheet:false };
var TTL={ vid:"Ролик", mus:"Музыка", more:"Ещё" };
function tabBox(){ return wide.matches?pane:insp; }
function openTab(t){ if(t==="clip"){ openInsp(); return; }
  ui.tab=t; $$("#tabs button").forEach(function(b){ b.classList.toggle("on",b.getAttribute("data-tab")===t); });
  if(!wide.matches){ ui.sheet="tab"; right.classList.add("open"); right.classList.remove("full","peek"); $("#shTitle").textContent=TR(TTL[t]); }
  refreshPane(); tabBox().scrollTop=0; }
function openInsp(){ if(!wide.matches){ ui.sheet="insp"; right.classList.add("open"); right.classList.remove("full","peek"); $$("#tabs button").forEach(function(b){ b.classList.toggle("on",b.getAttribute("data-tab")==="clip"); }); ui.tab=null; }
  refreshInsp(); insp.scrollTop=0; }
function closeSheet(){ if(wide.matches) return; ui.sheet=false; ui.tab=null; right.classList.remove("open","full","peek"); $$("#tabs button").forEach(function(b){ b.classList.remove("on"); }); }
$("#shClose").onclick=closeSheet;
$$("#tabs button").forEach(function(b){ b.onclick=function(){ var t=b.getAttribute("data-tab"); if(!wide.matches&&((ui.sheet==="tab"&&ui.tab===t)||(t==="clip"&&ui.sheet==="insp"))) closeSheet(); else openTab(t); }; });
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
  ({ vid:paneVid, mus:paneMus, more:paneMore })[ui.tab](box); box.scrollTop=sc; }
function paneVid(box){
  box.appendChild(sh("Стиль"));
  box.appendChild(el('<div class="mst"></div>',function(g){ Object.keys(STYLES).forEach(function(k){ var S=STYLES[k]; g.appendChild(el('<button class="'+(P.style===k?"on":"")+'"><b>'+esc(TR(S.n))+'</b><small>'+esc(TR(TRS[S.tr]))+', '+esc(TR(FILTERS[S.filter][0]))+'</small></button>',function(b){ b.onclick=function(){ applyStyle(k); }; })); }); }));
  box.appendChild(el('<p class="note" style="margin:-2px 0 10px">'+esc(TR("Стиль сразу ставит переходы, фильтр, движение фото и появление текста у всех клипов."))+'</p>'));
  box.appendChild(sh("Формат"));
  box.appendChild(choice("",Object.keys(FMT).map(function(k){ return [k,TR(FMT[k].n)]; }),P.fmt,function(v){ remember(); P.fmt=v; setCanvas(); changed(); }));
  box.appendChild(choice(TR("Если кадр не той формы"),[["cover",TR("заполнить и обрезать")],["blur",TR("целиком на размытом фоне")]],P.fit,function(v){ remember(); P.fit=v; changed(); }));
  box.appendChild(sh("Цвет"));
  box.appendChild(choice("",Object.keys(FILTERS).map(function(k){ return [k,TR(FILTERS[k][0])]; }),P.filter,function(v){ remember(); P.filter=v; changed(); }));
  if(!HASF) box.appendChild(el('<p class="note">'+esc(TR("Этот браузер не умеет фильтры на холсте, видео соберётся без них."))+'</p>'));
  box.appendChild(sh("Переходы"));
  box.appendChild(choice(TR("Для всех клипов"),Object.keys(TRS).map(function(k){ return [k,TR(TRS[k])]; }),P.tr,function(v){ remember(); P.tr=v; P.clips.forEach(function(c){ delete c.tr; }); changed(true); }));
  box.appendChild(range(TR("Длина перехода"),P.trd,.2,1.5,.1,function(v){ return v.toFixed(1)+" "+TR("с"); },function(v){ P.trd=v; timeline(); redraw(); }));
  box.appendChild(sh("Клипы"));
  box.appendChild(el('<div class="row"><button class="btn">'+sv("add")+'<span>'+esc(TR("Фото и видео"))+'</span></button></div>',function(r){ $("button",r).onclick=pickMedia; }));
  if(P.clips.some(function(c){ return c.type==="img"; })) box.appendChild(range(TR("Длина каждого фото"),avgPhoto(),1,10,.5,function(v){ return v.toFixed(1)+" "+TR("с"); },function(v){ P.clips.forEach(function(c){ if(c.type==="img") c.dur=v; }); timeline(); redraw(); }));
}
function avgPhoto(){ var ph=P.clips.filter(function(c){ return c.type==="img"; }); return ph.length?Math.round(ph.reduce(function(a,c){ return a+(c.dur||3); },0)/ph.length*2)/2:3; }
function applyStyle(k){ var S=STYLES[k]; remember(); P.style=k; P.tr=S.tr; P.trd=S.trd; P.filter=S.filter; P.anim=S.anim;
  P.clips.forEach(function(c,i){ delete c.tr; if(c.type==="img") c.kb=kbFor(i); if(c.text) delete c.text.anim; }); changed(true); toast(TR("Стиль: {0}",TR(S.n))); }
function paneMus(box){
  box.appendChild(sh("Музыка"));
  if(P.music){ box.appendChild(el('<div class="mrow2"><span class="ic">'+sv("mus")+'</span><b data-nt></b><button class="btn">'+esc(TR("Заменить"))+'</button><button class="btn del">'+sv("x")+'</button></div>',function(r){ $("b",r).textContent=P.music.name; var bs=$$("button",r); bs[0].onclick=pickMusic; bs[1].onclick=function(){ remember(); P.music=null; MBUF={aid:null,b:null}; changed(true); }; }));
    box.appendChild(range(TR("Громкость музыки"),Math.round((P.music.vol==null?.8:P.music.vol)*100),0,100,1,function(v){ return v+"%"; },function(v){ P.music.vol=v/100; }));
    box.appendChild(range(TR("Начать песню с"),P.music.start||0,0,Math.max(10,Math.floor(MBUF.b&&MBUF.aid===P.music.aid?MBUF.b.duration-5:240)),1,function(v){ return tm(v).replace(/\.\d$/,""); },function(v){ P.music.start=v; }));
    box.appendChild(toggle(TR("Плавно убрать музыку в конце"),P.music.fade!==false,function(v){ remember(); P.music.fade=v; save(); })); }
  else { box.appendChild(el('<button class="btn w">'+sv("file")+'<span>'+esc(TR("Музыка из файла"))+'</span><small>MP3, WAV, M4A</small></button>',function(b){ b.onclick=pickMusic; }));
    box.appendChild(el('<p class="note">'+esc(TR("Кусок песни удобно вырезать в звуковой мастерской («Лучший кусок»), а бит сделать в битмейкере и сохранить в MP3."))+'</p>')); }
  if(P.clips.some(function(c){ return c.type==="vid"; })){ box.appendChild(sh("Звук из видео")); box.appendChild(range(TR("Громкость звука из видео"),Math.round((P.vvol==null?1:P.vvol)*100),0,100,1,function(v){ return v+"%"; },function(v){ P.vvol=v/100; if(MASTER) MASTER.gain.value=P.vvol; })); }
}
function paneMore(box){
  box.appendChild(el('<div class="f"><label>'+esc(TR("Название"))+'</label><input type="text" maxlength="80"></div>',function(n){ var i=$("input",n); i.value=P.title||""; i.oninput=function(){ P.title=i.value; $("#title").value=i.value; save(); }; }));
  box.appendChild(el('<button class="btn w">'+sv("wand")+'<span>'+esc(TR("Пример из фонов"))+'</span><small>'+esc(TR("4 кадра с подписями"))+'</small></button>',function(n){ n.onclick=demo; }));
  box.appendChild(el('<button class="btn w">'+esc(TR("Сделать копию"))+'</button>',function(n){ n.onclick=function(){ var c=JSON.parse(JSON.stringify(P)); c.id=newId(); c.title=TR("{0} (копия)",P.title||""); c.updated=Date.now(); pPut(c).then(function(){ openP(c); toast(TR("Открыта копия")); }); }; }));
  box.appendChild(el('<button class="btn w del">'+esc(TR("Удалить ролик"))+'</button>',function(n){ n.onclick=function(){ ask(TR("Удалить «{0}»? Вернуть не получится.",P.title||""),TR("Удалить")).then(function(y){ if(y){ var p=P; stopPlay(); pDel(p).then(function(){ P=null; showHome(); }); } }); }; }));
  box.appendChild(el('<p class="note" style="margin-top:8px">'+esc(TR("Ролик и исходные файлы хранятся в этом браузере. Пробел: играть и стоп. Ctrl+Z: отменить."))+'</p>'));
}
/* настройки выбранного клипа */
function refreshInsp(){
  if(!P) return; if(!wide.matches&&ui.sheet!=="insp") return; var sc0=insp.scrollTop; insp.innerHTML=""; var c=P.clips[selC];
  $("#shTitle").textContent=c?TR("Клип {0}",selC+1):TR("Клип");
  if(!c){ insp.appendChild(el('<p class="note">'+esc(TR("Добавьте фото и видео: кнопка «+» в ленте внизу или перетащите файлы в окно."))+'</p>')); return; }
  insp.appendChild(el('<div class="row cbar"></div>',function(r){
    [["l","Раньше",function(){ if(selC>0){ remember(); var t=P.clips[selC]; P.clips[selC]=P.clips[selC-1]; P.clips[selC-1]=t; selC--; changed(true); } }],
     ["r","Позже",function(){ if(selC<P.clips.length-1){ remember(); var t=P.clips[selC]; P.clips[selC]=P.clips[selC+1]; P.clips[selC+1]=t; selC++; changed(true); } }],
     ["dup","Копия клипа",function(){ remember(); var k=JSON.parse(JSON.stringify(c)); k.id=newId("c"); P.clips.splice(selC+1,0,k); selC++; changed(true); }],
     ["x","Удалить клип",function(){ remember(); P.clips.splice(selC,1); selC=Math.max(0,Math.min(selC,P.clips.length-1)); changed(true); }]].forEach(function(o){
      r.appendChild(el('<button class="btn" title="'+esc(TR(o[1]))+'">'+sv(o[0])+'</button>',function(b){ b.onclick=o[2]; })); }); }));
  if(c.type==="img"){ insp.appendChild(range(TR("Длительность"),c.dur||3,.5,15,.5,function(v){ return v.toFixed(1)+" "+TR("с"); },function(v){ c.dur=v; timeline(); redraw(); }));
    insp.appendChild(choice(TR("Движение"),Object.keys(KBS).map(function(k){ return [k,TR(KBS[k])]; }),c.kb||"none",function(v){ remember(); c.kb=v; changed(); })); }
  else { var len=c.len||c.out||10;
    insp.appendChild(range(TR("Начало"),Math.round((c.in||0)*10)/10,0,Math.max(.1,Math.floor(len*10)/10),.1,function(v){ return tm(v); },function(v){ c.in=Math.min(v,(c.out||len)-.3); timeline(); seek(TL().s[selC]); }));
    insp.appendChild(range(TR("Конец"),Math.round((c.out||len)*10)/10,.3,Math.floor(len*10)/10,.1,function(v){ return tm(v); },function(v){ c.out=Math.max(v,(c.in||0)+.3); timeline(); seek(TL().s[selC]+Math.max(0,clen(c)-1)); }));
    insp.appendChild(el('<p class="note" style="margin:-4px 0 10px">'+esc(TR("Кусок: {0}",clen(c).toFixed(1)+" "+TR("с")))+'</p>'));
    insp.appendChild(range(TR("Звук этого видео"),Math.round((c.vol==null?1:c.vol)*100),0,100,1,function(v){ return v+"%"; },function(v){ c.vol=v/100; }));
    insp.appendChild(choice(TR("Движение"),Object.keys(KBS).map(function(k){ return [k,TR(KBS[k])]; }),c.kb||"none",function(v){ remember(); c.kb=v; changed(); })); }
  if(selC<P.clips.length-1) insp.appendChild(choice(TR("Переход к следующему"),Object.keys(TRS).map(function(k){ return [k,TR(TRS[k])]; }),c.tr||P.tr,function(v){ remember(); c.tr=v; changed(); }));
  insp.appendChild(sh("Текст на клипе"));
  c.text=c.text||{ t:"", style:"title", pos:"bot", color:"#ffffff" }; var T=c.text;
  insp.appendChild(el('<div class="f"><textarea rows="2" maxlength="140" placeholder="'+esc(TR("Надпись поверх кадра"))+'"></textarea></div>',function(f){ var i=$("textarea",f), first=true; i.value=T.t||"";
    i.oninput=function(){ if(first){ first=false; remember(); } T.t=i.value; save(); redraw(); }; i.onblur=function(){ first=true; timeline(); }; }));
  insp.appendChild(choice(TR("Вид"),Object.keys(TSTY).map(function(k){ return [k,TR(TSTY[k])]; }),T.style||"title",function(v){ remember(); T.style=v; changed(); }));
  insp.appendChild(choice(TR("Где"),Object.keys(TPOS).map(function(k){ return [k,TR(TPOS[k])]; }),T.pos||"bot",function(v){ remember(); T.pos=v; changed(); }));
  insp.appendChild(choice(TR("Появление"),Object.keys(TANI).map(function(k){ return [k,TR(TANI[k])]; }),T.anim||P.anim,function(v){ remember(); T.anim=v; changed(); }));
  insp.appendChild(el('<div class="sws"></div>',function(w){ ["#ffffff","#ffd166","#4fd6c8","#ff5fa2","#ff9a4d","#111111"].forEach(function(col){ w.appendChild(el('<button class="'+((T.color||"#ffffff")===col?"on":"")+'" style="background:'+col+'"></button>',function(b){ b.onclick=function(){ remember(); T.color=col; changed(); refreshInsp(); }; })); }); }));
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
  else if(k===" "){ e.preventDefault(); $("#playBtn").click(); } });
$("#title").addEventListener("input",function(){ if(P){ P.title=this.value; save(); } });
$("#emptyAdd").onclick=pickMedia; $("#emptyDemo").onclick=function(){ demo(); };

/* ═══════════ мои ролики ═══════════ */
function setCanvas(){ var pv=FMT[P.fmt].pv; CV.width=pv[0]; CV.height=pv[1]; $("#cvw").style.setProperty("--ar",pv[0]+"/"+pv[1]); $("#cvw").className="cvw f"+P.fmt; }
function showHome(){ stopPlay(); $("#ed").hidden=true; $("#home").hidden=false; document.title=TR("FORGE · монтаж роликов");
  try{ history.replaceState(null,"",location.pathname); }catch(e){}
  pAll().then(function(list){ list.sort(function(a,b){ return (b.updated||0)-(a.updated||0); }); var my=$("#myV"); my.innerHTML="";
    if(!list.length) my.appendChild(el('<p class="note">'+esc(TR("Здесь появятся ваши ролики."))+'</p>'));
    list.forEach(function(p){ var d=new Date(p.updated||Date.now()), when=d.toLocaleDateString(window.FLANG||"ru",{day:"numeric",month:"short"}), L=0; (p.clips||[]).forEach(function(c){ L+=clen(c); });
      var n=el('<div class="vc"><button class="th f'+p.fmt+'"></button><b data-nt></b><small>'+when+', '+(p.clips||[]).length+' '+esc(TR("клипов"))+'</small><div class="acts"><button data-a="copy">'+esc(TR("копия"))+'</button><button data-a="del">'+esc(TR("удалить"))+'</button></div></div>');
      $("b",n).textContent=p.title||""; $(".th",n).onclick=function(){ openP(p); }; if(p.clips&&p.clips[0]) thumb(p.clips[0]).then(function(u){ if(u) $(".th",n).style.backgroundImage="url('"+u+"')"; });
      $$(".acts button",n).forEach(function(x){ x.onclick=function(){ if(x.getAttribute("data-a")==="copy"){ var k=JSON.parse(JSON.stringify(p)); k.id=newId(); k.title=TR("{0} (копия)",p.title||""); k.updated=Date.now(); pPut(k).then(showHome); }
        else ask(TR("Удалить «{0}»? Вернуть не получится.",p.title||""),TR("Удалить")).then(function(y){ if(y) pDel(p).then(showHome); }); }; });
      my.appendChild(n); }); });
  var g=$("#fmtV"); g.innerHTML="";
  Object.keys(FMT).forEach(function(k){ g.appendChild(el('<button class="vf"><i class="f'+k+'"></i><b>'+esc(TR(FMT[k].n))+'</b><small>'+esc(TR(FMT[k].d))+'</small></button>',function(b){ b.onclick=function(){ create(newProject(k,"smooth")); }; })); });
}
function create(p){ return pPut(p).catch(function(){}).then(function(){ openP(p); }); }
function openP(p){ stopPlay(); P=p; P.clips=P.clips||[]; U=[]; Rd=[]; undoBtns(); selC=0; cur=0; MEDIA={}; MBUF={aid:null,b:null};
  $("#home").hidden=true; $("#ed").hidden=false; document.title="FORGE · "+(P.title||""); $("#title").value=P.title||""; setCanvas();
  try{ history.replaceState(null,"",location.pathname+"#"+P.id); }catch(e){}
  if(wide.matches){ openTab("vid"); refreshInsp(); } else closeSheet(); timeline(); P.clips.forEach(media); draw(0); }
$("#toHome").onclick=function(){ save(); stopPlay(); setTimeout(showHome,380); };
if(document.fonts) document.fonts.ready.then(function(){ if(P) redraw(); });
(function boot(){ var h=location.hash.slice(1); if(h&&!/=/.test(h)) pGet(h).then(function(p){ if(p) openP(p); else showHome(); }); else showHome(); })();
})();
