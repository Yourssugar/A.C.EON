/* FORGE графика: редактор. Холст, жесты, слои, панели, хранение, сохранение картинки, удаление фона. */
(function(){
"use strict";
var $=function(s,r){ return (r||document).querySelector(s); };
var $$=function(s,r){ return [].slice.call((r||document).querySelectorAll(s)); };
var wide=matchMedia("(min-width:960px)"), touch=matchMedia("(pointer:coarse)").matches;
var SV={ up:"M12 19V5M5 12l7-7 7 7", down:"M12 5v14M5 12l7 7 7-7", dup:"M8 8h12v12H8zM16 8V4H4v12h4", del:"M5 7h14M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3",
  eye:"M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM9 12a3 3 0 106 0 3 3 0 00-6 0", lock:"M6 11h12v9H6zM9 11V8a3 3 0 016 0", unlock:"M6 11h12v9H6zM9 11V8a3 3 0 015.8-1",
  more:"M5 12h.01M12 12h.01M19 12h.01", fx:"M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5L18 18M18 6l-2.5 2.5M8.5 15.5L6 18",
  img:"M4 5h16v14H4zM4 15l5-5 4 4 3-3 4 4", cam:ICONS.camera, plus:"M12 5v14M5 12h14", x:"M6 6l12 12M18 6L6 18", wand:"M4 20L16 8M14 4l1 2 2 1-2 1-1 2-1-2-2-1 2-1zM19 11l.7 1.3 1.3.7-1.3.7L19 15l-.7-1.3L17 13l1.3-.7z",
  text:"M5 6h14M12 6v13", down2:ICONS.down, send:ICONS.send, brush:ICONS.brush };
function sv(n){ return '<svg viewBox="0 0 24 24"><path d="'+(SV[n]||ICONS[n]||"")+'"/></svg>'; }
function el(html, fn){ var d=document.createElement("div"); d.innerHTML=html.trim(); var n=d.firstElementChild; if(fn) fn(n); return n; }
function sec(title){ var s=document.createElement("div"); s.className="sec"; s.innerHTML='<div class="sh">'+esc(title)+'</div>'; return s; }
function choice(label, opts, cur, fn){ return el('<div class="f">'+(label?'<label>'+esc(label)+'</label>':'')+'<div class="chips">'+opts.map(function(o){ return '<button data-v="'+o[0]+'" class="'+(String(o[0])===String(cur)?"on":"")+'">'+esc(o[1])+'</button>'; }).join("")+'</div></div>',function(n){
  $$("button",n).forEach(function(x){ x.onclick=function(){ $$("button",n).forEach(function(y){ y.classList.toggle("on",y===x); }); fn(x.getAttribute("data-v")); }; }); }); }
function range(label,v,min,max,step,unit,fn,done){ return el('<div class="f"><div class="lab"><span>'+esc(label)+'</span><output>'+v+unit+'</output></div><input type="range" min="'+min+'" max="'+max+'" step="'+step+'" value="'+v+'"></div>',function(n){
  var o=$("output",n), i=$("input",n); i.oninput=function(){ o.textContent=i.value+unit; fn(Number(i.value)); }; i.onchange=function(){ if(done) done(); }; }); }
function toggle(label,v,fn){ return el('<label class="tg"><span>'+esc(label)+'</span><input type="checkbox"'+(v?" checked":"")+'></label>',function(n){ $("input",n).onchange=function(){ fn(this.checked); }; }); }

/* ═══════════ хранение (своя база, отдельно от страниц) ═══════════ */
var dbp=null;
function db(){ if(dbp) return dbp; dbp=new Promise(function(res,rej){ try{ var r=indexedDB.open("forge-gfx",1);
  r.onupgradeneeded=function(){ r.result.createObjectStore("works",{keyPath:"id"}); }; r.onsuccess=function(){ res(r.result); }; r.onerror=function(){ rej(r.error); }; }catch(e){ rej(e); } }).catch(function(){ return null; }); return dbp; }
function dbAll(){ return db().then(function(d){ if(!d) return []; return new Promise(function(res){ var q=d.transaction("works").objectStore("works").getAll(); q.onsuccess=function(){ res(q.result||[]); }; q.onerror=function(){ res([]); }; }); }); }
function dbGet(id){ return db().then(function(d){ if(!d) return null; return new Promise(function(res){ var q=d.transaction("works").objectStore("works").get(id); q.onsuccess=function(){ res(q.result||null); }; q.onerror=function(){ res(null); }; }); }); }
function dbPut(w){ return db().then(function(d){ if(!d) throw new Error("nodb"); return new Promise(function(res,rej){ var t=d.transaction("works","readwrite"); t.objectStore("works").put(w); t.oncomplete=res; t.onerror=function(){ rej(t.error); }; }); }); }
function dbDel(id){ return db().then(function(d){ if(!d) return; return new Promise(function(res){ var t=d.transaction("works","readwrite"); t.objectStore("works").delete(id); t.oncomplete=res; t.onerror=res; }); }); }
function newId(){ return "w"+Date.now().toString(36)+Math.random().toString(36).slice(2,6); }

/* ═══════════ состояние ═══════════ */
var W=null, sel=null, view={ z:1, px:0, py:0 }, ui={ tab:null, sheet:false, brush:null, recent:[] };
try{ ui.recent=JSON.parse(localStorage.getItem("forge_recent_colors")||"[]"); }catch(e){}
function L_(id){ if(!W) return null; for(var i=0;i<W.layers.length;i++) if(W.layers[i].id===id) return W.layers[i]; return null; }
function curL(){ return sel?L_(sel):null; }
function usedAssets(){ var u={}; W.layers.forEach(function(L){ if(L.src) u[L.src]=1; if(L.mask) u[L.mask]=1; }); return u; }
var saveT=0;
function save(){ clearTimeout(saveT); saveT=setTimeout(function(){ if(!W) return; W.updated=Date.now();
  var u=usedAssets(), c=JSON.parse(JSON.stringify(W,function(k,v){ return k==="assets"?undefined:v; })); c.assets={}; for(var a in u) if(W.assets[a]) c.assets[a]=W.assets[a];
  c.thumb=thumbOf(W,260);
  dbPut(c).catch(function(){ toast("Не получилось сохранить: память браузера заполнена"); }); },500); }
function thumbOf(w,max){ var k=max/Math.max(w.w,w.h), c=document.createElement("canvas"); c.width=Math.max(1,Math.round(w.w*k)); c.height=Math.max(1,Math.round(w.h*k)); drawWork(c.getContext("2d"),w,{scale:k,clipRound:w.round}); try{ return c.toDataURL("image/jpeg",.75); }catch(e){ return ""; } }

/* отмена и повтор: снимок без картинок (картинки лежат в assets и не меняются) */
var U=[], Rd=[], uKey="", uT=0;
function snap(){ return JSON.stringify({ title:W.title, size:W.size, w:W.w, h:W.h, round:W.round, bg:W.bg, layers:W.layers }); }
function remember(key){ var now=Date.now(); if(key&&key===uKey&&now-uT<900){ uT=now; return; } U.push(snap()); if(U.length>60) U.shift(); Rd=[]; uKey=key||""; uT=now; undoBtns(); }
function undoBtns(){ $("#undo").disabled=!U.length; $("#redo").disabled=!Rd.length; }
function restore(s){ var o=JSON.parse(s); for(var k in o) W[k]=o[k]; if(sel&&!L_(sel)) sel=null; uKey=""; undoBtns(); PROC_reset(); fit(); draw(); refresh(); save(); }
function PROC_reset(){ for(var k in PROC) delete PROC[k]; }
$("#undo").onclick=function(){ if(!U.length) return; Rd.push(snap()); restore(U.pop()); };
$("#redo").onclick=function(){ if(!Rd.length) return; U.push(snap()); restore(Rd.pop()); };

/* ═══════════ холст ═══════════ */
var cv=$("#cv"), g=cv.getContext("2d"), ov=$("#ov"), stage=$("#stage"), dpr=1, SW=0, SH=0, rq=0;
function geom(){ var pad=wide.matches?60:28, f=Math.min((SW-pad)/W.w,(SH-pad)/W.h), s=f*view.z;
  return { s:s, f:f, l:SW/2-W.w*s/2+view.px, t:SH/2-W.h*s/2+view.py }; }
function resize(){ var r=stage.getBoundingClientRect(); SW=r.width; SH=r.height; dpr=Math.min(2,devicePixelRatio||1); cv.width=Math.round(SW*dpr); cv.height=Math.round(SH*dpr); draw(); }
addEventListener("resize",function(){ if(W&&!$("#ed").hidden) resize(); });
if(window.ResizeObserver) new ResizeObserver(function(){ if(W&&!$("#ed").hidden){ var r=stage.getBoundingClientRect(); if(Math.abs(r.width-SW)>1||Math.abs(r.height-SH)>1) resize(); } }).observe(stage);
function draw(){ if(rq) return; rq=requestAnimationFrame(function(){ rq=0; if(!W||!SW) return; paint(); overlay(); }); }
function paint(){
  var G=geom(); g.setTransform(1,0,0,1,0,0); g.clearRect(0,0,cv.width,cv.height);
  g.save(); g.scale(dpr,dpr); g.shadowColor="rgba(0,0,0,.55)"; g.shadowBlur=30; g.shadowOffsetY=12; g.fillStyle="#000";
  if(W.round){ g.beginPath(); g.arc(G.l+W.w*G.s/2,G.t+W.h*G.s/2,W.w*G.s/2,0,Math.PI*2); g.fill(); } else g.fillRect(G.l,G.t,W.w*G.s,W.h*G.s); g.restore();
  drawWork(g,W,{ scale:G.s*dpr, ox:G.l*dpr, oy:G.t*dpr, clipRound:W.round });
  $("#zFit").textContent=Math.round(view.z*100)+"%";
}
onAsset=function(){ draw(); };
function toWork(cx,cy){ var r=stage.getBoundingClientRect(), G=geom(); return { x:(cx-r.left-G.l)/G.s, y:(cy-r.top-G.t)/G.s }; }
function toScreen(x,y){ var G=geom(); return { x:G.l+x*G.s, y:G.t+y*G.s }; }
function fit(){ view.z=1; view.px=view.py=0; }

/* рамка выделения, ручки, плашка */
var guides=[], sizeLbl="";
function overlay(){
  ov.innerHTML=""; var L=curL(), G=geom();
  guides.forEach(function(gd){ var d=document.createElement("div"); d.className="guide "+gd.k; if(gd.k==="v") d.style.left=gd.p+"px"; else d.style.top=gd.p+"px"; ov.appendChild(d); });
  if(!L||ui.brush&&ui.brush.drawing) return;
  var s=layerSize(L), c=toScreen(L.x,L.y), w=s.w*G.s, h=s.h*G.s;
  var box=document.createElement("div"); box.className="sel-box"+(L.locked?" lock":"");
  box.style.cssText+="width:"+w+"px;height:"+h+"px;transform:translate("+(c.x-w/2)+"px,"+(c.y-h/2)+"px) rotate("+(L.rot||0)+"deg)";
  ov.appendChild(box);
  if(!L.locked && !ui.brush){
    var hs=[["nw",0,0],["ne",1,0],["sw",0,1],["se",1,1]];
    if(L.t!=="text"){ hs.push(["e",1,.5,"s"],["w",0,.5,"s"]); if(L.kind!=="line") hs.push(["n",.5,0,"v"],["s",.5,1,"v"]); }
    hs.forEach(function(x){ var d=document.createElement("div"); d.className="hd"+(x[3]?" "+x[3]:""); d.setAttribute("data-h",x[0]); d.style.left=(x[1]*100)+"%"; d.style.top=(x[2]*100)+"%"; box.appendChild(d); });
    var rl=document.createElement("div"); rl.className="rot-line"; rl.style.top="-34px"; rl.style.height="32px"; box.appendChild(rl);
    var rh=document.createElement("div"); rh.className="hd rot"; rh.setAttribute("data-h","rot"); rh.style.left="50%"; rh.style.top="-36px"; box.appendChild(rh);
  }
  if(sizeLbl){ var z=document.createElement("div"); z.className="szl"; z.textContent=sizeLbl; z.style.left=c.x+"px"; z.style.top=(c.y+bboxH(L,G)/2+16)+"px"; ov.appendChild(z); }
  if(drag||ui.brush) return;
  var tb=document.createElement("div"); tb.className="gtb";
  var col=L.t==="text"?L.color:L.t==="shape"?(L.fill||L.stroke||"#888"):L.t==="icon"?L.color:"";
  var h="";
  if(col) h+='<button data-t="color" title="Цвет"><span class="sw" style="background:'+esc(col)+'"></span></button>';
  if(L.t==="text") h+='<button data-t="font" title="Шрифт" style="font-family:'+esc(fontStack(L.font))+'">Aa</button><button data-t="fx" title="Эффекты">'+sv("fx")+'</button>';
  if(L.t==="image") h+='<button data-t="filters" title="Фильтры">'+sv("img")+'</button><button data-t="cut" title="Убрать фон">'+sv("wand")+'</button>';
  h+='<i></i><button data-t="up" title="Слой выше">'+sv("up")+'</button><button data-t="dup" title="Копия">'+sv("dup")+'</button><button data-t="del" title="Удалить">'+sv("del")+'</button><i></i><button data-t="more" title="Все настройки">'+sv("more")+'</button>';
  tb.innerHTML=h; ov.appendChild(tb);
  var bh=bboxH(L,G), tw=tb.offsetWidth, th=tb.offsetHeight, top=c.y-bh/2-th-(L.locked?14:52);
  if(top<6) top=c.y+bh/2+18; if(top+th>SH-6) top=Math.max(6,c.y-th/2);
  tb.style.left=Math.max(6,Math.min(SW-tw-6,c.x-tw/2))+"px"; tb.style.top=top+"px";
}
function bboxH(L,G){ var s=layerSize(L), a=(L.rot||0)*Math.PI/180; return (Math.abs(s.w*Math.sin(a))+Math.abs(s.h*Math.cos(a)))*G.s; }
ov.addEventListener("click",function(e){ var b=e.target.closest(".gtb button"); if(b) tool(b.getAttribute("data-t")); });

/* ═══════════ жесты: выбор, перетаскивание, размер, поворот, щипок ═══════════ */
var P={}, drag=null, pinch=null, lastTap={t:0,id:null};
stage.addEventListener("pointerdown",function(e){
  if(e.target.closest(".gtb")||e.target.closest(".brushbar")||e.target.closest(".busy")) return;
  P[e.pointerId]={x:e.clientX,y:e.clientY}; try{ stage.setPointerCapture(e.pointerId); }catch(x){}
  var ids=Object.keys(P);
  if(ids.length===2){ var a=P[ids[0]], b=P[ids[1]]; drag=null; pinch={ d:Math.hypot(a.x-b.x,a.y-b.y), z:view.z, px:view.px, py:view.py, mx:(a.x+b.x)/2, my:(a.y+b.y)/2 }; return; }
  hideHint();
  var p=toWork(e.clientX,e.clientY), L=curL();
  if(ui.brush){ if(L&&L.t==="image"){ brushStart(L,p,e); } return; }
  var h=e.target.getAttribute&&e.target.getAttribute("data-h");
  if(h&&L){ startDrag(h,L,p,e); return; }
  var G=geom(), hit=null;
  if(L && !L.locked){ var q=toLocal(L,p.x,p.y), s=layerSize(L); if(Math.abs(q.x)<=s.w/2+8/G.s && Math.abs(q.y)<=s.h/2+8/G.s) hit=L; }
  if(!hit){ hit=hitAt(p,G); }
  if(hit){
    var now=Date.now(); if(hit.id===lastTap.id && now-lastTap.t<350 && hit.t==="text"){ select(hit.id); tool("text"); lastTap.t=0; return; }
    lastTap={t:now,id:hit.id};
    if(sel!==hit.id) select(hit.id);
    if(!hit.locked) startDrag("move",hit,p,e);
  } else { if(sel){ sel=null; refreshInsp(); draw(); } drag={ h:"pan", sx:e.clientX, sy:e.clientY, px:view.px, py:view.py, moved:false }; }
});
function hitAt(p,G){ for(var i=W.layers.length-1;i>=0;i--){ var L=W.layers[i]; if(L.hidden||L.locked) continue; var s=layerSize(L), q=toLocal(L,p.x,p.y), e=6/G.s;
  if(Math.abs(q.x)<=s.w/2+e && Math.abs(q.y)<=Math.max(s.h,24/G.s)/2+e) return L; } return null; }
function startDrag(h,L,p,e){ drag={ h:h, id:L.id, p0:p, x0:L.x, y0:L.y, w0:L.w, h0:L.h, size0:L.size, rot0:L.rot||0, moved:false, snap:snap() }; }
stage.addEventListener("pointermove",function(e){
  if(P[e.pointerId]){ P[e.pointerId].x=e.clientX; P[e.pointerId].y=e.clientY; }
  if(ui.brush){ brushMove(e); return; }
  if(pinch){ var ids=Object.keys(P); if(ids.length<2) return; var a=P[ids[0]], b=P[ids[1]], d=Math.hypot(a.x-b.x,a.y-b.y);
    view.z=Math.max(.25,Math.min(8,pinch.z*d/pinch.d)); view.px=pinch.px+((a.x+b.x)/2-pinch.mx); view.py=pinch.py+((a.y+b.y)/2-pinch.my); draw(); return; }
  if(!drag) return;
  if(drag.h==="pan"){ var dx=e.clientX-drag.sx, dy=e.clientY-drag.sy; if(Math.abs(dx)+Math.abs(dy)>3) drag.moved=true; if(view.z>1.01||wide.matches&&drag.moved&&e.buttons===4){ view.px=drag.px+dx; view.py=drag.py+dy; draw(); } return; }
  var L=L_(drag.id); if(!L) return; var p=toWork(e.clientX,e.clientY), G=geom();
  if(!drag.moved && Math.hypot((p.x-drag.p0.x)*G.s,(p.y-drag.p0.y)*G.s)<4) return;
  drag.moved=true; guides=[]; sizeLbl="";
  if(drag.h==="move"){
    var nx=drag.x0+(p.x-drag.p0.x), ny=drag.y0+(p.y-drag.p0.y), th=8/G.s;
    if(Math.abs(nx-W.w/2)<th){ nx=W.w/2; guides.push({k:"v",p:toScreen(W.w/2,0).x}); }
    if(Math.abs(ny-W.h/2)<th){ ny=W.h/2; guides.push({k:"h",p:toScreen(0,W.h/2).y}); }
    var s=layerSize(L);
    if(!L.rot){ [[s.w/2,0],[W.w-s.w/2,W.w]].forEach(function(e2){ if(Math.abs(nx-e2[0])<th){ nx=e2[0]; guides.push({k:"v",p:toScreen(e2[1],0).x}); } });
      [[s.h/2,0],[W.h-s.h/2,W.h]].forEach(function(e2){ if(Math.abs(ny-e2[0])<th){ ny=e2[0]; guides.push({k:"h",p:toScreen(0,e2[1]).y}); } }); }
    L.x=Math.round(nx); L.y=Math.round(ny);
  } else if(drag.h==="rot"){
    var a0=Math.atan2(drag.p0.y-drag.y0,drag.p0.x-drag.x0), a1=Math.atan2(p.y-drag.y0,p.x-drag.x0), r=drag.rot0+(a1-a0)*180/Math.PI;
    r=((r+540)%360)-180; var sn=Math.round(r/45)*45; if(Math.abs(r-sn)<4) r=sn; L.rot=Math.round(r*10)/10; sizeLbl=Math.round(L.rot)+"°";
  } else {
    var q=toLocal({x:drag.x0,y:drag.y0,rot:L.rot},p.x,p.y), q0=toLocal({x:drag.x0,y:drag.y0,rot:L.rot},drag.p0.x,drag.p0.y);
    if(drag.h.length===2){ var f=Math.max(.05, Math.hypot(q.x,q.y)/Math.max(1,Math.hypot(q0.x,q0.y)));
      if(L.t==="text") L.size=Math.max(6,Math.round(drag.size0*f)); else { L.w=Math.max(4,Math.round(drag.w0*f)); L.h=Math.max(2,Math.round(drag.h0*f)); } }
    else if(drag.h==="e"||drag.h==="w") L.w=Math.max(4,Math.round(drag.w0*Math.abs(q.x)/Math.max(1,Math.abs(q0.x))));
    else L.h=Math.max(2,Math.round(drag.h0*Math.abs(q.y)/Math.max(1,Math.abs(q0.y))));
    if(L.t!=="text" && Math.abs(L.w-W.w)<10/G.s){ L.w=W.w; guides.push({k:"v",p:toScreen(0,0).x},{k:"v",p:toScreen(W.w,0).x}); }
    var ss=layerSize(L); sizeLbl=Math.round(ss.w)+" x "+Math.round(ss.h);
  }
  draw();
});
function endPtr(e){
  delete P[e.pointerId];
  if(ui.brush){ brushEnd(); return; }
  if(pinch){ if(Object.keys(P).length<2) pinch=null; return; }
  if(!drag) return; var d=drag; drag=null; guides=[]; sizeLbl="";
  if(d.h!=="pan" && d.moved){ U.push(d.snap); if(U.length>60) U.shift(); Rd=[]; undoBtns(); save(); refreshInsp(); }
  draw();
}
stage.addEventListener("pointerup",endPtr); stage.addEventListener("pointercancel",endPtr);
stage.addEventListener("wheel",function(e){ if(!W) return; e.preventDefault(); var r=stage.getBoundingClientRect(), mx=e.clientX-r.left-SW/2, my=e.clientY-r.top-SH/2;
  var z0=view.z, z=Math.max(.25,Math.min(8,z0*Math.exp(-e.deltaY*.0015))); view.px=mx-(mx-view.px)*z/z0; view.py=my-(my-view.py)*z/z0; view.z=z; draw(); },{passive:false});
$("#zIn").onclick=function(){ view.z=Math.min(8,view.z*1.25); draw(); };
$("#zOut").onclick=function(){ view.z=Math.max(.25,view.z/1.25); draw(); };
$("#zFit").onclick=function(){ fit(); draw(); };

function select(id){ sel=id; refreshInsp(); if(ui.tab==="layers") refreshPane(); draw(); }

/* ═══════════ инструменты с плашки ═══════════ */
function tool(t){
  var L=curL(); if(!L) return;
  if(t==="up"){ var i=W.layers.indexOf(L); if(i<W.layers.length-1){ remember(); W.layers.splice(i,1); W.layers.splice(i+1,0,L); save(); draw(); refresh(); toast("Слой выше"); } else toast("Это уже верхний слой"); }
  else if(t==="dup"){ remember(); var c=JSON.parse(JSON.stringify(L)); c.id=gid(); c.x+=W.w*.03; c.y+=W.w*.03; W.layers.splice(W.layers.indexOf(L)+1,0,c); sel=c.id; save(); draw(); refresh(); }
  else if(t==="del"){ remember(); W.layers.splice(W.layers.indexOf(L),1); sel=null; save(); draw(); refresh(); toast("Удалено. Вернуть: стрелка отмены"); if(!wide.matches&&ui.sheet==="insp") closeSheet(); }
  else openInsp({ color:"color", font:"font", fx:"fx", filters:"filters", cut:"cut", text:"text", more:null }[t]);
}

/* ═══════════ панели ═══════════ */
var pane=$("#pane"), insp=$("#insp"), right=$("#right");
var TT={ add:"Добавить", layers:"Слои", canvas:"Холст", tpl:"Шаблоны", more:"Ещё" };
function tabBox(){ return wide.matches?pane:insp; }
function openTab(t){ ui.tab=t; $$("#tabs button").forEach(function(b){ b.classList.toggle("on",b.getAttribute("data-tab")===t); });
  if(!wide.matches){ ui.sheet="tab"; right.classList.add("open"); right.classList.remove("full","peek"); $("#shTitle").textContent=TT[t]; }
  refreshPane(); tabBox().scrollTop=0; hideHint(); }
function openInsp(secId){
  if(!wide.matches){ ui.sheet="insp"; right.classList.add("open"); right.classList.remove("full","peek"); $$("#tabs button").forEach(function(b){ b.classList.remove("on"); }); ui.tab=null; }
  refreshInsp();
  if(secId){ var s=insp.querySelector('[data-sec="'+secId+'"]'); if(s) insp.scrollTop=s.offsetTop-insp.offsetTop-8; } else insp.scrollTop=0;
  if(secId==="text"){ var ta=insp.querySelector("textarea"); if(ta){ ta.focus(); ta.select(); } }
}
function closeSheet(){ if(wide.matches) return; ui.sheet=false; ui.tab=null; right.classList.remove("open","full","peek"); $$("#tabs button").forEach(function(b){ b.classList.remove("on"); }); }
$("#shClose").onclick=closeSheet;
$$("#tabs button").forEach(function(b){ b.onclick=function(){ var t=b.getAttribute("data-tab"); if(!wide.matches&&ui.sheet==="tab"&&ui.tab===t) closeSheet(); else openTab(t); }; });
(function(){ var h=$(".sh-h"), y0=0, h0=0, on=false;
  h.addEventListener("pointerdown",function(e){ if(wide.matches||e.target.closest("button")) return; on=true; y0=e.clientY; h0=right.getBoundingClientRect().height; right.style.transition="none"; try{ h.setPointerCapture(e.pointerId); }catch(x){} });
  h.addEventListener("pointermove",function(e){ if(on) right.style.height=Math.max(80,h0-(e.clientY-y0))+"px"; });
  h.addEventListener("pointerup",function(e){ if(!on) return; on=false; right.style.transition=""; var nh=h0-(e.clientY-y0), vh=innerHeight; right.style.height=""; right.classList.remove("full","peek");
    if(nh<vh*.2) closeSheet(); else if(nh<vh*.42) right.classList.add("peek"); else if(nh>vh*.65) right.classList.add("full"); });
})();
wide.addEventListener("change",function(){ right.classList.remove("open"); ui.sheet=false; if(wide.matches) openTab(ui.tab||"add"); refreshInsp(); setTimeout(resize,50); });
function refresh(){ refreshPane(); refreshInsp(); }
function refreshPane(){ if(!ui.tab) return; if(!wide.matches&&ui.sheet!=="tab") return; var box=tabBox(), sc=box.scrollTop; box.innerHTML="";
  ({ add:paneAdd, layers:paneLayers, canvas:paneCanvas, tpl:paneTpl, more:paneMore })[ui.tab](box); box.scrollTop=sc; }

/* ── добавить ── */
function addLayer(L){ remember(); W.layers.push(L); sel=L.id; save(); draw(); if(wide.matches){ refresh(); } else closeSheet(); }
function paneAdd(box){
  box.appendChild(el('<div class="sh">Текст</div>'));
  box.appendChild(el('<div class="addt"><button data-k="h" style="font-family:Unbounded,var(--ui);font-size:19px;font-weight:700">Заголовок</button><button data-k="s" style="font-size:15px;font-weight:800">Подзаголовок</button><button data-k="p" style="font-size:13.5px">Обычный текст</button></div>',function(n){
    $$("button",n).forEach(function(b){ b.onclick=function(){ addLayer(textLayer(W,b.getAttribute("data-k"))); }; }); }));
  box.appendChild(el('<div class="sh">Фото</div>'));
  box.appendChild(el('<div class="row">'+(touch?'<button class="btn" data-c>'+sv("cam")+'Снять</button>':'')+'<button class="btn" data-g>'+sv("img")+(touch?'Галерея':'Выбрать фото')+'</button></div>',function(n){
    var c=$("[data-c]",n); if(c) c.onclick=function(){ pickPhoto(true,addPhoto); }; $("[data-g]",n).onclick=function(){ pickPhoto(false,addPhoto); }; }));
  if(!touch) box.appendChild(el('<p class="note" style="margin-top:6px">Фото можно просто перетащить в окно.</p>'));
  box.appendChild(el('<div class="sh">Фигуры</div>'));
  box.appendChild(el('<div class="shapes">'+SHAPES.map(function(s){ return '<button data-s="'+s[0]+'" title="'+esc(s[1])+'">'+shapeIcon(s[0])+'</button>'; }).join("")+'</div>',function(n){
    $$("button",n).forEach(function(b){ b.onclick=function(){ addLayer(shapeLayer(W,b.getAttribute("data-s"))); }; }); }));
  box.appendChild(el('<div class="sh">Иконки</div>'));
  box.appendChild(el('<div class="icg">'+ICON_LIST.map(function(k){ return '<button data-i="'+k+'" title="'+esc(ICON_NAMES[k]||k)+'">'+icon(k,"")+'</button>'; }).join("")+'</div>',function(n){
    $$("button",n).forEach(function(b){ b.onclick=function(){ addLayer(iconLayer(W,b.getAttribute("data-i"))); }; }); }));
}
function shapeIcon(k){ var p={ rect:"M3 5h18v14H3z", round:"M8 7h8a5 5 0 010 10H8A5 5 0 018 7z", circle:"M2 12a10 10 0 1020 0 10 10 0 00-20 0z", tri:"M12 3l10 18H2z",
  star:"M12 2l2.9 6.6 7.1.7-5.4 4.8 1.6 7L12 17.5 5.8 21.1l1.6-7L2 9.3l7.1-.7z", heart:"M12 21C4 15 2 11 2 8a5 5 0 0110-1 5 5 0 0110 1c0 3-2 7-10 13z", line:"M2 11h20v2H2z" }[k];
  return '<svg viewBox="0 0 24 24"><path d="'+p+'"/></svg>'; }
function addPhoto(a){ var L=imageLayer(W,a.id,a.w,a.h); addLayer(L); }

/* ── слои ── */
function layerName(L){ if(L.t==="text") return String(L.text).split("\n")[0].slice(0,30)||"Текст"; if(L.t==="image") return "Фото"; if(L.t==="icon") return "Иконка: "+(ICON_NAMES[L.name]||L.name);
  return (SHAPES.filter(function(s){ return s[0]===L.kind; })[0]||["","фигура"])[1].replace(/^./,function(c){ return c.toUpperCase(); }); }
function paneLayers(box){
  if(!W.layers.length){ box.innerHTML='<p class="note">На холсте пока пусто. Нажмите «Добавить».</p>'; return; }
  W.layers.slice().reverse().forEach(function(L){
    var th=L.t==="text"?'<span style="font-family:'+esc(fontStack(L.font))+'">Аа</span>':L.t==="image"?'':L.t==="icon"?icon(L.name,""):shapeIcon(L.kind);
    var r=el('<div class="lrow'+(L.id===sel?" on":"")+(L.hidden?" off":"")+'"><span class="lt"'+(L.t==="image"&&W.assets[L.src]?' style="background-image:url('+W.assets[L.src]+')"':'')+'>'+th+'</span>'+
      '<button class="nm">'+esc(layerName(L))+'</button><button class="sb" data-a="up" title="Выше">'+sv("up")+'</button><button class="sb" data-a="down" title="Ниже">'+sv("down")+'</button>'+
      '<button class="sb" data-a="hide" title="Скрыть или показать">'+sv("eye")+'</button><button class="sb'+(L.locked?" act":"")+'" data-a="lock" title="Замок: нельзя случайно сдвинуть">'+sv(L.locked?"lock":"unlock")+'</button></div>');
    $(".nm",r).onclick=function(){ select(L.id); if(!wide.matches) openInsp(); };
    $$(".sb",r).forEach(function(b){ b.onclick=function(){ var a=b.getAttribute("data-a"), i=W.layers.indexOf(L); remember();
      if(a==="up"&&i<W.layers.length-1){ W.layers.splice(i,1); W.layers.splice(i+1,0,L); }
      if(a==="down"&&i>0){ W.layers.splice(i,1); W.layers.splice(i-1,0,L); }
      if(a==="hide") L.hidden=!L.hidden; if(a==="lock") L.locked=!L.locked;
      save(); draw(); refresh(); }; });
    box.appendChild(r);
  });
  box.appendChild(el('<p class="note" style="margin-top:10px">Сверху списка то, что лежит сверху на холсте. Замок не даёт случайно сдвинуть слой, например фон.</p>'));
}

/* ── холст ── */
function paneCanvas(box){
  box.appendChild(el('<div class="sh">Размер: '+W.w+' x '+W.h+'</div>'));
  box.appendChild(el('<div class="chips">'+GSIZES.map(function(s){ return '<button data-s="'+s.id+'" class="'+(W.size===s.id?"on":"")+'">'+esc(s.name)+'</button>'; }).join("")+'</div>',function(n){
    $$("button",n).forEach(function(b){ b.onclick=function(){ var s=GSIZES.filter(function(x){ return x.id===b.getAttribute("data-s"); })[0]; resizeWork(s.w,s.h,s.id,!!s.round); }; }); }));
  box.appendChild(el('<div class="two" style="margin-top:10px"><div class="f"><label>Ширина</label><input type="number" id="cW" value="'+W.w+'"></div><div class="f"><label>Высота</label><input type="number" id="cH" value="'+W.h+'"></div></div>',function(n){
    $$("input",n).forEach(function(i){ i.onchange=function(){ var w=Math.max(16,Math.min(8000,+$("#cW").value||W.w)), h=Math.max(16,Math.min(8000,+$("#cH").value||W.h)); resizeWork(w,h,"own",false); }; }); }));
  box.appendChild(el('<p class="note">При смене размера всё на холсте подстраивается пропорционально.</p>'));
  box.appendChild(el('<div class="sh">Фон</div>'));
  box.appendChild(choice("",[["color","цвет"],["grad","градиент"]],W.bg.t,function(v){ remember(); W.bg.t=v; draw(); save(); refreshPane(); }));
  box.appendChild(colorPick(W.bg.t==="grad"?"Первый цвет":"Цвет",W.bg.c1,function(v,live){ if(!live) remember(); W.bg.c1=v; draw(); save(); }));
  if(W.bg.t==="grad"){ box.appendChild(colorPick("Второй цвет",W.bg.c2,function(v,live){ if(!live) remember(); W.bg.c2=v; draw(); save(); }));
    box.appendChild(range("Направление",W.bg.ang,0,360,15,"°",function(v){ remember("ang"); W.bg.ang=v; draw(); save(); })); }
  box.appendChild(el('<div class="row" style="margin-top:6px"><button class="btn">'+sv("img")+'Фото на весь холст</button></div>',function(n){ $("button",n).onclick=function(){ pickPhoto(false,function(a){
    var L=imageLayer(W,a.id,a.w,a.h); L.w=W.w; L.h=W.h; L.locked=true; remember(); W.layers.unshift(L); sel=L.id; save(); draw(); refresh(); toast("Фото легло фоном и закреплено замком"); }); }; }));
}
function resizeWork(w,h,id,round){
  remember(); var kx=w/W.w, ky=h/W.h, k=Math.min(kx,ky);
  W.layers.forEach(function(L){ L.x=Math.round(L.x*kx); L.y=Math.round(L.y*ky);
    if(L.t==="text") L.size=Math.max(6,Math.round(L.size*k)); else if(L.t==="image"&&L.w===W.w&&L.h===W.h){ L.w=w; L.h=h; } else { L.w=Math.round(L.w*k); L.h=Math.round(L.h*k); } });
  W.w=w; W.h=h; W.size=id; W.round=round; fit(); save(); draw(); refresh();
}

/* ── шаблоны ── */
var tplCat="all";
function tplGrid(box, onPick){
  var cats=el('<div class="cats"></div>'); [["all","Все"]].concat(GTPL_GROUPS).forEach(function(gr){ var b=document.createElement("button"); b.textContent=gr[1]; if(gr[0]===tplCat) b.className="on";
    b.onclick=function(){ tplCat=gr[0]; $$("button",cats).forEach(function(x){ x.classList.toggle("on",x===b); }); fill(); }; cats.appendChild(b); });
  var grid=el('<div class="gtpls"></div>'); box.appendChild(cats); box.appendChild(grid);
  function fill(){ grid.innerHTML=""; GTEMPLATES.forEach(function(t){ if(tplCat!=="all"&&t.group!==tplCat) return;
    var s=GSIZES.filter(function(x){ return x.id===t.size; })[0];
    var n=el('<button class="gtpl"><div class="th"></div><div class="tx">'+esc(t.name)+'<small>'+esc(s.name)+'</small></div></button>');
    var w=fromGTemplate(t.id), k=150/Math.max(w.w,w.h), c=document.createElement("canvas"); c.width=Math.round(w.w*k*2); c.height=Math.round(w.h*k*2); c.style.width=Math.round(w.w*k)+"px";
    drawWork(c.getContext("2d"),w,{scale:k*2}); $(".th",n).appendChild(c);
    n.onclick=function(){ onPick(t.id); }; grid.appendChild(n); }); }
  fill(); return fill;
}
function paneTpl(box){ tplGrid(box,function(id){ ask("Заменить то, что сейчас на холсте, шаблоном? Вернуть можно стрелкой отмены.","Заменить").then(function(y){ if(!y) return;
  remember(); var t=fromGTemplate(id); W.w=t.w; W.h=t.h; W.size=t.size; W.round=t.round; W.bg=t.bg; W.layers=t.layers; sel=null; fit(); save(); draw(); refresh(); }); }); }

/* ── ещё ── */
function paneMore(box){
  box.innerHTML='<div class="f"><label>Название работы</label><input type="text" id="mT" maxlength="80"></div>'+
    '<button class="btn w" data-a="save">'+sv("down2")+'Сохранить картинку</button>'+
    '<div class="sh">Проект</div>'+
    '<button class="btn w" data-a="json">Сохранить проект в файл <small>.json</small></button>'+
    '<button class="btn w" data-a="open">Открыть проект из файла</button>'+
    '<button class="btn w" data-a="copy">Сделать копию</button>'+
    '<button class="btn w del" data-a="del">Удалить работу</button>'+
    '<p class="note" style="margin-top:8px">Работа сохраняется в этом браузере сама. Файл проекта нужен, чтобы перенести её на другое устройство: в нём и фото, и все слои.</p>';
  var t=$("#mT",box); t.value=W.title; t.oninput=function(){ remember("title"); W.title=t.value; $("#title").value=t.value; save(); };
  $$("[data-a]",box).forEach(function(b){ b.onclick=function(){ var a=b.getAttribute("data-a");
    if(a==="save") exportDlg(); else if(a==="json"){ var u=usedAssets(), c=JSON.parse(JSON.stringify(W)); c.assets={}; for(var k in u) c.assets[k]=W.assets[k]; delete c.thumb;
      dl(new Blob([JSON.stringify(c)],{type:"application/json"}),fname()+".forge-gfx.json"); toast("Проект сохранён в файл"); }
    else if(a==="open") openJson();
    else if(a==="copy"){ var c2=JSON.parse(JSON.stringify(W)); c2.id=newId(); c2.title=W.title+" (копия)"; dbPut(c2).then(function(){ openWork(c2); toast("Открыта копия"); }); }
    else if(a==="del") ask("Удалить работу «"+W.title+"»? Вернуть её не получится.","Удалить").then(function(y){ if(y) dbDel(W.id).then(function(){ W=null; showHome(); }); });
  }; });
}
function openJson(){ var f=$("#fJson"); f.value=""; f.onchange=function(){ var file=f.files&&f.files[0]; if(!file) return; var r=new FileReader();
  r.onload=function(){ try{ var d=JSON.parse(r.result); if(!d||d.v!==1||!Array.isArray(d.layers)) throw 0; d.id=newId(); dbPut(d).then(function(){ openWork(d); toast("Проект открыт"); }); }catch(e){ toast("Это не файл проекта графической мастерской"); } };
  r.readAsText(file); }; f.click(); }
$("#homeOpen").onclick=openJson;

/* ═══════════ инспектор выбранного слоя ═══════════ */
var PAL=["#ffffff","#111317","#ff8a4c","#ff5fa2","#ffd166","#ffe14d","#4fd6c8","#1f9e7a","#6d8bff","#a970ff","#c8372d","#b98b5e"];
function colorPick(label,cur,fn){
  var rec=ui.recent.filter(function(c){ return PAL.indexOf(c)<0; }).slice(0,6);
  function sw(c){ return '<button style="background:'+esc(c)+'" data-c="'+esc(c)+'" class="'+(c===cur?"on":"")+'"></button>'; }
  return el('<div class="f">'+(label?'<label>'+esc(label)+'</label>':'')+'<div class="sws">'+PAL.concat(rec).map(sw).join("")+'<label class="any" title="Любой цвет"><input type="color" value="'+(/^#[0-9a-f]{6}$/i.test(cur)?cur:"#ff8a4c")+'"></label></div></div>',function(n){
    $$("button[data-c]",n).forEach(function(b){ b.onclick=function(){ $$("button",n).forEach(function(x){ x.classList.toggle("on",x===b); }); fn(b.getAttribute("data-c"),false); }; });
    var i=$("input",n), first=true; i.oninput=function(){ fn(i.value,!first); first=false; }; i.onchange=function(){ addRecent(i.value); first=true; }; }); }
function addRecent(c){ ui.recent=[c].concat(ui.recent.filter(function(x){ return x!==c; })).slice(0,8); try{ localStorage.setItem("forge_recent_colors",JSON.stringify(ui.recent)); }catch(e){} }
function set(L,k,v,key){ remember(key===false?"":(key||L.id+k)); L[k]=v; draw(); save(); }
function refreshInsp(){
  if(!wide.matches && ui.sheet!=="insp") return;
  var sc=insp.scrollTop; insp.innerHTML=""; var L=curL();
  if(!L){ $("#shTitle").textContent="Настройки"; insp.innerHTML='<p class="note" style="margin-top:8px">Нажмите на элемент на холсте: его можно двигать, менять размер за уголки и поворачивать за кружок сверху. Здесь появятся точные настройки.</p><p class="note" style="margin-top:10px">Двойное нажатие на надпись открывает её текст. Колесо мыши или два пальца приближают холст.</p>'; return; }
  $("#shTitle").textContent=layerName(L);
  insp.appendChild(el('<div class="acts4"><button data-a="up">'+sv("up")+'выше</button><button data-a="down">'+sv("down")+'ниже</button><button data-a="dup">'+sv("dup")+'копия</button><button data-a="lock" class="'+(L.locked?"on":"")+'">'+sv("lock")+'замок</button><button data-a="del">'+sv("del")+'удалить</button></div>',function(n){
    $$("button",n).forEach(function(b){ b.onclick=function(){ var a=b.getAttribute("data-a"), i=W.layers.indexOf(L);
      if(a==="down"){ if(i>0){ remember(); W.layers.splice(i,1); W.layers.splice(i-1,0,L); save(); draw(); refresh(); } }
      else if(a==="lock"){ remember(); L.locked=!L.locked; save(); draw(); refresh(); } else tool(a); }; }); }));
  if(L.t==="text") inspText(L); else if(L.t==="image") inspImage(L); else if(L.t==="shape") inspShape(L); else inspIcon(L);
  var c=sec("Общее"); c.setAttribute("data-sec","common"); insp.appendChild(c);
  c.appendChild(range("Прозрачность",Math.round((L.op==null?1:L.op)*100),0,100,5,"%",function(v){ set(L,"op",v/100); }));
  c.appendChild(range("Поворот",Math.round(L.rot||0),-180,180,1,"°",function(v){ set(L,"rot",v); }));
  c.appendChild(el('<div class="f"><label>Наложение</label><select>'+BLENDS.map(function(b){ return '<option value="'+b[0]+'"'+(b[0]===L.blend?" selected":"")+'>'+b[1]+'</option>'; }).join("")+'</select></div>',function(n){ $("select",n).onchange=function(){ set(L,"blend",this.value,false); }; }));
  var s=layerSize(L);
  c.appendChild(el('<div class="nums" style="grid-template-columns:1fr 1fr"><label><em>X</em><input type="number" data-k="x" value="'+Math.round(L.x)+'"></label><label><em>Y</em><input type="number" data-k="y" value="'+Math.round(L.y)+'"></label>'+
    (L.t!=="text"?'<label><em>Ш</em><input type="number" data-k="w" value="'+Math.round(s.w)+'"></label><label><em>В</em><input type="number" data-k="h" value="'+Math.round(s.h)+'"></label>':'')+'</div>',function(n){
    $$("input",n).forEach(function(i){ i.onchange=function(){ var v=Number(i.value); if(!isNaN(v)) set(L,i.getAttribute("data-k"),v,false); }; }); }));
  c.appendChild(el('<div class="row" style="margin-top:8px"><button class="btn" data-c="x">По центру ↔</button><button class="btn" data-c="y">По центру ↕</button></div>',function(n){
    $$("button",n).forEach(function(b){ b.onclick=function(){ remember(); if(b.getAttribute("data-c")==="x") L.x=W.w/2; else L.y=W.h/2; save(); draw(); refreshInsp(); }; }); }));
  insp.scrollTop=sc;
}
function inspText(L){
  var s=sec("Текст"); s.setAttribute("data-sec","text"); insp.appendChild(s);
  s.appendChild(el('<div class="f"><textarea rows="3"></textarea></div>',function(n){ var t=$("textarea",n); t.value=L.text; t.oninput=function(){ remember("tx"+L.id); L.text=t.value; draw(); save(); }; }));
  var fs=sec("Шрифт"); fs.setAttribute("data-sec","font"); insp.appendChild(fs);
  fs.appendChild(el('<div class="fontsel">'+Object.keys(FONTS).filter(function(k){ return FONTS[k].n; }).map(function(k){ return '<button data-f="'+k+'" class="'+(L.font===k?"on":"")+'" style="font-family:'+esc(fontStack(k))+'">'+esc(FONTS[k].n)+'</button>'; }).join("")+'</div>',function(n){
    $$("button",n).forEach(function(b){ b.onclick=function(){ $$("button",n).forEach(function(x){ x.classList.toggle("on",x===b); }); var f=b.getAttribute("data-f"), ws=FONTS[f].w.split(",").map(Number);
      remember(); L.font=f; if(ws.indexOf(L.weight)<0) L.weight=ws[ws.length-1]; draw(); save(); refreshInsp(); }; }); }));
  fs.appendChild(choice("Начертание",FONTS[L.font].w.split(",").map(function(w){ return [w,{400:"обычный",500:"средний",600:"полужирный",700:"жирный",800:"очень жирный"}[w]||w]; }),L.weight,function(v){ set(L,"weight",Number(v),false); }));
  fs.appendChild(range("Размер",L.size,6,Math.round(Math.max(W.w,W.h)*.4),1,"px",function(v){ set(L,"size",v); }));
  fs.appendChild(choice("Выравнивание строк",[["left","слева"],["center","по центру"],["right","справа"]],L.align,function(v){ set(L,"align",v,false); }));
  fs.appendChild(range("Интервал между буквами",L.ls,-10,80,1,"",function(v){ set(L,"ls",v); }));
  fs.appendChild(range("Расстояние между строками",L.lh,.7,2.2,.05,"",function(v){ set(L,"lh",v); }));
  var cs=sec("Цвет"); cs.setAttribute("data-sec","color"); insp.appendChild(cs);
  cs.appendChild(colorPick("",L.color,function(v,live){ set(L,"color",v,live?undefined:false); draw(); }));
  var fx=sec("Эффекты"); fx.setAttribute("data-sec","fx"); insp.appendChild(fx);
  var FX=[["none","нет",'color:#fff'],["stroke","обводка",'color:transparent;-webkit-text-stroke:1.5px #ff8a4c'],["shadow","тень",'color:#fff;text-shadow:3px 3px 0 #ff5fa2'],["glow","свечение",'color:#fff;text-shadow:0 0 8px #ff8a4c,0 0 16px #ff8a4c'],["grad","градиент",'background:linear-gradient(90deg,#ffd166,#ff5fa2);-webkit-background-clip:text;background-clip:text;color:transparent']];
  fx.appendChild(el('<div class="fxs">'+FX.map(function(f){ return '<button data-f="'+f[0]+'" class="'+(L.fx.t===f[0]?"on":"")+'"><b style="'+f[2]+'">Аа</b><small>'+f[1]+'</small></button>'; }).join("")+'</div>',function(n){
    $$("button",n).forEach(function(b){ b.onclick=function(){ remember(); L.fx.t=b.getAttribute("data-f"); if(L.fx.t==="stroke"&&L.fx.c===L.color) L.fx.c="#000000"; draw(); save(); refreshInsp(); }; }); }));
  if(L.fx.t!=="none"){
    fx.appendChild(colorPick(L.fx.t==="grad"?"Первый цвет":"Цвет эффекта",L.fx.c,function(v,live){ remember(live?"fxc"+L.id:""); L.fx.c=v; draw(); save(); }));
    if(L.fx.t==="grad") fx.appendChild(colorPick("Второй цвет",L.fx.c2,function(v,live){ remember(live?"fxc2"+L.id:""); L.fx.c2=v; draw(); save(); }));
    else fx.appendChild(range("Сила",L.fx.a,0,100,1,"%",function(v){ remember("fxa"+L.id); L.fx.a=v; draw(); save(); }));
  }
}
function inspShape(L){
  var s=sec("Заливка"); s.setAttribute("data-sec","color"); insp.appendChild(s);
  s.appendChild(colorPick("",L.fill,function(v,live){ set(L,"fill",v,live?undefined:false); }));
  s.appendChild(toggle("Градиент",!!L.fill2,function(v){ remember(); L.fill2=v?"#ff5fa2":""; draw(); save(); refreshInsp(); }));
  if(L.fill2){ s.appendChild(colorPick("Второй цвет",L.fill2,function(v,live){ set(L,"fill2",v,live?undefined:false); })); s.appendChild(range("Направление",L.ang||0,0,360,15,"°",function(v){ set(L,"ang",v); })); }
  if(L.kind!=="line"){ s.appendChild(toggle("Без заливки, только контур",!L.fill&&!L.fill2,function(v){ remember(); if(v){ L.fill=""; L.fill2=""; if(!L.sw){ L.sw=Math.max(2,Math.round(Math.min(W.w,W.h)*.006)); L.stroke=L.stroke||"#ffffff"; } } else L.fill="#ff8a4c"; draw(); save(); refreshInsp(); }));
    var st=sec("Обводка"); insp.appendChild(st);
    st.appendChild(range("Толщина",L.sw||0,0,Math.round(Math.min(W.w,W.h)*.05),1,"px",function(v){ remember("sw"+L.id); L.sw=v; if(v&&!L.stroke) L.stroke="#ffffff"; draw(); save(); }));
    st.appendChild(colorPick("Цвет обводки",L.stroke||"#ffffff",function(v,live){ set(L,"stroke",v,live?undefined:false); }));
    if(L.kind==="rect") st.appendChild(range("Скругление углов",L.r||0,0,Math.round(Math.min(L.w,L.h)/2),1,"px",function(v){ set(L,"r",v); })); }
}
function inspIcon(L){
  var s=sec("Иконка"); s.setAttribute("data-sec","color"); insp.appendChild(s);
  s.appendChild(colorPick("Цвет",L.color,function(v,live){ set(L,"color",v,live?undefined:false); }));
  s.appendChild(range("Толщина линий",L.sw,.6,4,.1,"",function(v){ set(L,"sw",v); }));
  s.appendChild(el('<div class="icg">'+ICON_LIST.map(function(k){ return '<button data-i="'+k+'" class="'+(L.name===k?"on":"")+'">'+icon(k,"")+'</button>'; }).join("")+'</div>',function(n){
    $$("button",n).forEach(function(b){ b.onclick=function(){ set(L,"name",b.getAttribute("data-i"),false); refreshInsp(); }; }); }));
}
function inspImage(L){
  var src=W.assets[L.src];
  var cut=sec("Убрать фон"); cut.setAttribute("data-sec","cut"); insp.appendChild(cut);
  if(!L.mask) cut.appendChild(el('<div class="ai"><b>Вырезать предмет или человека</b><p class="note" style="margin-bottom:10px">Нейросеть работает прямо в браузере, фото никуда не отправляется. В первый раз она скачивается, это около 16 МБ, дальше работает сразу.</p><button class="btn go" style="width:100%">'+sv("wand")+'Убрать фон</button></div>',function(n){ $("button",n).onclick=function(){ removeBg(L); }; }));
  else { cut.appendChild(el('<div class="ai"><b>Фон убран</b><p class="note" style="margin-bottom:10px">Если нейросеть что-то задела или оставила лишнее, поправьте кистью прямо на холсте.</p><div class="row"><button class="btn" data-b>'+sv("brush")+'Подправить кистью</button><button class="btn" data-r>Вернуть фон</button></div></div>',function(n){
      $("[data-b]",n).onclick=function(){ startBrush(L); }; $("[data-r]",n).onclick=function(){ remember(); L.mask=null; draw(); save(); refreshInsp(); }; }));
    cut.appendChild(range("Мягкость края",L.feather,0,12,1,"px",function(v){ set(L,"feather",v); })); }
  var fs=sec("Фильтры"); fs.setAttribute("data-sec","filters"); insp.appendChild(fs);
  fs.appendChild(el('<div class="flt">'+Object.keys(FILTER_PRESETS).map(function(k){ var p=FILTER_PRESETS[k];
    return '<button data-p="'+k+'" class="'+(L.f.preset===k?"on":"")+'"><i style="background-image:url('+src+');filter:brightness('+(100+p.br)+'%) contrast('+(100+p.ct)+'%) saturate('+(100+p.sat)+'%) grayscale('+p.bw+'%) sepia('+(p.sep+(p.warm>0?p.warm:0))+'%) hue-rotate('+(p.warm<0?-p.warm:0)+'deg)"></i><small>'+p.name+'</small></button>'; }).join("")+'</div>',function(n){
    $$("button",n).forEach(function(b){ b.onclick=function(){ remember(); var p=FILTER_PRESETS[b.getAttribute("data-p")]; ["br","ct","sat","warm","bw","sep"].forEach(function(k){ L.f[k]=p[k]; }); L.f.preset=b.getAttribute("data-p"); draw(); save(); refreshInsp(); }; }); }));
  [["br","Яркость",-50,50],["ct","Контраст",-50,50],["sat","Насыщенность",-100,100],["warm","Тепло",-60,60],["blur","Размытие",0,20]].forEach(function(x){
    fs.appendChild(range(x[1],L.f[x[0]]||0,x[2],x[3],1,"",function(v){ remember("f"+x[0]+L.id); L.f[x[0]]=v; L.f.preset=""; draw(); },function(){ save(); })); });
  var sh=sec("Форма и кадр"); insp.appendChild(sh);
  sh.appendChild(choice("Форма",[["rect","прямоугольник"],["round","скруглённая"],["circle","круг"],["heart","сердце"],["star","звезда"]],L.shape==="rect"&&L.r?"round":L.shape,function(v){ remember(); if(v==="round"){ L.shape="rect"; L.r=Math.round(Math.min(L.w,L.h)*.12); } else { L.shape=v; L.r=0; }
    if(v==="circle"&&Math.abs(L.w-L.h)>2){ var m=Math.min(L.w,L.h); L.w=L.h=m; } draw(); save(); refreshInsp(); }));
  if(L.shape==="rect"&&L.r) sh.appendChild(range("Скругление",L.r,0,Math.round(Math.min(L.w,L.h)/2),1,"px",function(v){ set(L,"r",v); }));
  sh.appendChild(choice("Пропорции рамки",[["orig","как у фото"],["1","1:1"],["0.8","4:5"],["1.778","16:9"],["0.5625","9:16"]],"",function(v){ remember(); var a=v==="orig"?L.iw/L.ih:Number(v); L.h=Math.round(L.w/a); draw(); save(); }));
  sh.appendChild(range("Приблизить фото в рамке",Math.round((L.zoom||1)*100),100,400,5,"%",function(v){ set(L,"zoom",v/100); }));
  sh.appendChild(range("Сдвиг кадра ↔",L.fx,0,100,1,"%",function(v){ set(L,"fx",v); }));
  sh.appendChild(range("Сдвиг кадра ↕",L.fy,0,100,1,"%",function(v){ set(L,"fy",v); }));
  sh.appendChild(el('<div class="row" style="margin-top:6px">'+(touch?'<button class="btn" data-c>'+sv("cam")+'Снять другое</button>':'')+'<button class="btn" data-g>'+sv("img")+'Заменить фото</button></div>',function(n){
    function rep(cam){ pickPhoto(cam,function(a){ remember(); L.src=a.id; L.iw=a.w; L.ih=a.h; L.mask=null; delete PROC[L.id]; draw(); save(); refreshInsp(); }); }
    var c=$("[data-c]",n); if(c) c.onclick=function(){ rep(true); }; $("[data-g]",n).onclick=function(){ rep(false); }; }));
}

/* ═══════════ фото: снять или выбрать, ужать в браузере ═══════════ */
function pickPhoto(cam, done){ var inp=cam?$("#fCam"):$("#fImg"); inp.value=""; inp.onchange=function(){ var f=inp.files&&inp.files[0]; if(f) loadPhoto(f,done); }; inp.click(); }
function loadPhoto(file, done){
  toast("Ужимаю фото...");
  shrinkPhoto(file,2000).then(function(r){ if(!r){ toast("Это фото открыть не получилось"); return; }
    var id="a"+Date.now().toString(36)+Math.random().toString(36).slice(2,5); W.assets[id]=r.url; done({ id:id, w:r.w, h:r.h }); toast("Фото добавлено"); });
}
var webpOk=(function(){ try{ var c=document.createElement("canvas"); c.width=c.height=1; return c.toDataURL("image/webp").indexOf("data:image/webp")===0; }catch(e){ return false; } })();
function shrinkPhoto(file,max){
  function draw2(src,w,h){ var k=Math.min(1,max/Math.max(w,h)), c=document.createElement("canvas"); c.width=Math.round(w*k); c.height=Math.round(h*k);
    var x=c.getContext("2d"); x.imageSmoothingQuality="high"; x.drawImage(src,0,0,c.width,c.height);
    var type=/png|webp|gif/.test(file.type)&&webpOk?"image/webp":webpOk?"image/webp":"image/jpeg", q=.9, url=c.toDataURL(type,q);
    while(url.length*.75>900000&&q>.5){ q-=.08; url=c.toDataURL(type,q); }
    return { url:url, w:c.width, h:c.height }; }
  if(window.createImageBitmap) return createImageBitmap(file,{imageOrientation:"from-image"}).then(function(b){ var r=draw2(b,b.width,b.height); if(b.close) b.close(); return r; }).catch(viaImg);
  return viaImg();
  function viaImg(){ return new Promise(function(res){ var u=URL.createObjectURL(file), im=new Image(); im.onload=function(){ res(draw2(im,im.naturalWidth,im.naturalHeight)); URL.revokeObjectURL(u); }; im.onerror=function(){ res(null); }; im.src=u; }); }
}
/* перетащить фото в окно (компьютер) */
stage.addEventListener("dragover",function(e){ e.preventDefault(); });
stage.addEventListener("drop",function(e){ e.preventDefault(); var f=e.dataTransfer&&e.dataTransfer.files&&e.dataTransfer.files[0]; if(f&&/^image\//.test(f.type)) loadPhoto(f,addPhoto); });

/* ═══════════ убрать фон: нейросеть U2-Net (u2netp) через onnxruntime-web, всё на устройстве ═══════════ */
var AI=null;
function busy(t1,t2){ var b=$(".busy",stage); if(!t1){ if(b) b.remove(); return; } if(!b){ b=document.createElement("div"); b.className="busy"; stage.appendChild(b); } b.innerHTML='<div><b>'+esc(t1)+'</b>'+esc(t2||"")+'<i></i></div>'; }
function loadAI(){
  if(AI) return AI;
  AI=new Promise(function(res,rej){
    var s=document.createElement("script"); s.src="ai/ort.wasm.min.js"; s.onerror=function(){ rej(new Error("script")); };
    s.onload=function(){ try{ ort.env.wasm.wasmPaths=new URL("ai/",location.href).href; ort.env.wasm.numThreads=1;
      ort.InferenceSession.create("ai/u2netp.onnx",{executionProviders:["wasm"]}).then(res,rej); }catch(e){ rej(e); } };
    document.head.appendChild(s);
  });
  AI.catch(function(){ AI=null; });
  return AI;
}
function removeBg(L){
  var im=assetImg(W,L.src); if(!im){ toast("Фото ещё загружается, попробуйте через секунду"); return; }
  busy("Загружаю нейросеть","Один раз, около 16 МБ. Дальше будет работать сразу.");
  loadAI().then(function(sess){
    busy("Убираю фон","Фото обрабатывается прямо на этом устройстве.");
    return new Promise(function(r){ setTimeout(r,30); }).then(function(){
      var S=320, c=document.createElement("canvas"); c.width=c.height=S; var x=c.getContext("2d"); x.drawImage(im,0,0,S,S);
      var d=x.getImageData(0,0,S,S).data, f=new Float32Array(3*S*S), mean=[.485,.456,.406], sd=[.229,.224,.225];
      for(var i=0;i<S*S;i++) for(var k=0;k<3;k++) f[k*S*S+i]=(d[i*4+k]/255-mean[k])/sd[k];
      var inp={}; inp[sess.inputNames[0]]=new ort.Tensor("float32",f,[1,3,S,S]);
      return sess.run(inp).then(function(out){
        var m=out[sess.outputNames[0]].data, mn=Infinity, mx=-Infinity; for(var i=0;i<m.length;i++){ if(m[i]<mn) mn=m[i]; if(m[i]>mx) mx=m[i]; }
        var mc=document.createElement("canvas"); mc.width=mc.height=S; var mg=mc.getContext("2d"), id=mg.createImageData(S,S);
        for(var j=0;j<S*S;j++){ var a=(m[j]-mn)/((mx-mn)||1); a=Math.max(0,Math.min(1,(a-.12)/.76)); id.data[j*4]=id.data[j*4+1]=id.data[j*4+2]=255; id.data[j*4+3]=Math.round(a*255); }
        mg.putImageData(id,0,0);
        var full=document.createElement("canvas"); full.width=im.naturalWidth; full.height=im.naturalHeight; var fg=full.getContext("2d"); fg.imageSmoothingQuality="high"; fg.drawImage(mc,0,0,full.width,full.height);
        var mid="m"+Date.now().toString(36); W.assets[mid]=full.toDataURL("image/png"); IMG[mid]={ ok:true, im:full };
        remember(); L.mask=mid; delete PROC[L.id]; busy(); draw(); save(); refreshInsp(); toast("Фон убран. Подправить края можно кистью");
      });
    });
  }).catch(function(e){ busy(); toast("Не получилось запустить нейросеть: нужен интернет при первом запуске"); console.warn(e); });
}

/* кисть: подправить вырезку (стереть лишнее / вернуть нужное) */
function startBrush(L){
  var mk=assetImg(W,L.mask); if(!mk) return;
  var c=document.createElement("canvas"); c.width=L.iw; c.height=L.ih; var x=c.getContext("2d"); x.drawImage(mk,0,0,c.width,c.height);
  ui.brush={ id:L.id, cv:c, g:x, mode:"erase", r:30, drawing:false, snap:snap() };
  IMG["__live"]={ ok:true, im:c }; L._mask=L.mask; L.mask="__live"; delete PROC[L.id];
  if(!wide.matches) closeSheet();
  var bb=$("#brushbar"); bb.hidden=false;
  bb.innerHTML='<button data-m="erase" class="on">стереть</button><button data-m="keep">вернуть</button><input type="range" min="6" max="120" value="30" title="Размер кисти"><button data-done style="background:#4fd6c8;color:#05201c">Готово</button>';
  $$("[data-m]",bb).forEach(function(b){ b.onclick=function(){ ui.brush.mode=b.getAttribute("data-m"); $$("[data-m]",bb).forEach(function(y){ y.classList.toggle("on",y===b); }); }; });
  $("input",bb).oninput=function(){ ui.brush.r=+this.value; }; $("[data-done]",bb).onclick=endBrush;
  toast("Водите по фото: стереть лишнее или вернуть нужное"); draw();
}
function brushAt(e){ var b=ui.brush, L=L_(b.id); if(!L) return; var p=toWork(e.clientX,e.clientY), q=toLocal(L,p.x,p.y), r=coverRect(L,L.iw,L.ih), G=geom();
  var sx=(q.x-r.x)/r.k, sy=(q.y-r.y)/r.k, rad=b.r/(G.s*r.k);
  b.g.globalCompositeOperation=b.mode==="erase"?"destination-out":"source-over";
  var gr=b.g.createRadialGradient(sx,sy,rad*.5,sx,sy,rad); gr.addColorStop(0,"rgba(255,255,255,1)"); gr.addColorStop(1,"rgba(255,255,255,0)");
  b.g.fillStyle=gr; b.g.beginPath(); b.g.arc(sx,sy,rad,0,Math.PI*2); b.g.fill(); delete PROC[L.id]; draw(); }
function brushStart(L,p,e){ ui.brush.drawing=true; brushAt(e); }
function brushMove(e){ var c=$(".brushc",ov); if(!c){ c=document.createElement("div"); c.className="brushc"; }
  var r=stage.getBoundingClientRect(); c.style.left=(e.clientX-r.left)+"px"; c.style.top=(e.clientY-r.top)+"px"; c.style.width=c.style.height=(ui.brush.r*2)+"px";
  if(ui.brush.drawing) brushAt(e); requestAnimationFrame(function(){ if(ui.brush&&!c.parentNode) ov.appendChild(c); }); }
function brushEnd(){ if(ui.brush) ui.brush.drawing=false; }
function endBrush(){ var b=ui.brush, L=L_(b.id); ui.brush=null; $("#brushbar").hidden=true;
  if(L){ var id="m"+Date.now().toString(36); W.assets[id]=b.cv.toDataURL("image/png"); IMG[id]={ ok:true, im:b.cv }; U.push(b.snap); Rd=[]; undoBtns(); L.mask=id; delete L._mask; delete PROC[L.id]; }
  delete IMG["__live"]; save(); draw(); refreshInsp(); }

/* ═══════════ сохранить картинку ═══════════ */
$("#saveBtn").onclick=exportDlg;
var EX={ type:"png", k:1, transparent:false, round:true };
function exportDlg(){
  modal('<h3>Сохранить картинку</h3><div class="exp-pv" id="exPv"></div><div id="exOpts"></div><p class="note" id="exInfo" style="margin:8px 0 12px"></p>'+
    '<div class="row"><button class="btn go" id="exGo">'+sv("down2")+'Сохранить</button>'+(navigator.canShare?'<button class="btn" id="exSh">'+sv("send")+'Поделиться</button>':'')+'</div><div class="row"><button class="btn" data-close>Закрыть</button></div>');
  var o=$("#exOpts");
  o.appendChild(choice("Формат",[["png","PNG"],["jpg","JPG"],["webp","WebP"]],EX.type,function(v){ EX.type=v; if(v==="jpg") EX.transparent=false; upd(); }));
  o.appendChild(choice("Размер",[["0.5",(W.w/2|0)+" x "+(W.h/2|0)],["1",W.w+" x "+W.h],["2","x2 для печати"]],String(EX.k),function(v){ EX.k=Number(v); upd(); }));
  o.appendChild(toggle("Прозрачный фон (только PNG и WebP)",EX.transparent,function(v){ EX.transparent=v; if(v&&EX.type==="jpg") EX.type="png"; upd(); }));
  if(W.round) o.appendChild(toggle("Обрезать по кругу",EX.round,function(v){ EX.round=v; upd(); }));
  var blob=null, T=0;
  function upd(){ clearTimeout(T); $("#exInfo").textContent="Собираю картинку..."; T=setTimeout(function(){ render().then(function(b){ blob=b; $("#exInfo").textContent=(W.w*EX.k|0)+" x "+(W.h*EX.k|0)+" px, "+(b.size>1048576?(b.size/1048576).toFixed(1)+" МБ":Math.round(b.size/1024)+" КБ"); }); },120); }
  function render(){ var w=Math.round(W.w*EX.k), h=Math.round(W.h*EX.k), c=document.createElement("canvas"); c.width=w; c.height=h;
    var tr=EX.transparent||(W.round&&EX.round&&EX.type!=="jpg");
    if(EX.type==="jpg"){ var x=c.getContext("2d"); x.fillStyle="#fff"; x.fillRect(0,0,w,h); }
    drawWork(c.getContext("2d"),W,{ scale:EX.k, transparent:EX.transparent, clipRound:W.round&&EX.round });
    var pv=$("#exPv"); pv.innerHTML=""; var p=document.createElement("canvas"), k=440/Math.max(w,h); p.width=Math.round(w*k); p.height=Math.round(h*k); p.getContext("2d").drawImage(c,0,0,p.width,p.height); pv.appendChild(p);
    var mime={png:"image/png",jpg:"image/jpeg",webp:"image/webp"}[EX.type];
    return new Promise(function(res){ c.toBlob(function(b){ res(b); },mime,.92); }); }
  function fileOf(){ return new File([blob],fname()+"."+(EX.type==="jpg"?"jpg":EX.type),{type:blob.type}); }
  $("#exGo").onclick=function(){ if(!blob) return; dl(blob,fileOf().name); toast("Картинка сохранена"); };
  if($("#exSh")) $("#exSh").onclick=function(){ if(!blob) return; var f=fileOf(); if(navigator.canShare({files:[f]})) navigator.share({files:[f],title:W.title}).catch(function(){}); else toast("Этот браузер не умеет делиться файлами, сохраните картинку"); };
  upd();
}
function fname(){ return (W.title||"image").trim().toLowerCase().replace(/[^\wа-яё]+/gi,"-").replace(/^-+|-+$/g,"").slice(0,40)||"image"; }
function dl(blob,name){ var a=document.createElement("a"); a.href=URL.createObjectURL(blob); a.download=name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(function(){ URL.revokeObjectURL(a.href); },3000); }

/* ═══════════ окна, подсказки, клавиши ═══════════ */
function modal(h){ $("#mbox").innerHTML=h; $("#modal").classList.add("on"); }
function closeModal(){ $("#modal").classList.remove("on"); }
$("#modal").addEventListener("click",function(e){ if(e.target.id==="modal"||e.target.hasAttribute("data-close")) closeModal(); });
function ask(text,ok){ return new Promise(function(res){ modal('<h3>'+esc(text)+'</h3><div class="row"><button class="btn" data-n>Отмена</button><button class="btn go" data-y>'+esc(ok)+'</button></div>');
  $("#mbox [data-n]").onclick=function(){ closeModal(); res(false); }; $("#mbox [data-y]").onclick=function(){ closeModal(); res(true); }; }); }
var tT=0; function toast(t){ var e=$("#toast"); e.textContent=t; e.classList.add("on"); clearTimeout(tT); tT=setTimeout(function(){ e.classList.remove("on"); },2600); }
var hintOff=false; function hideHint(){ if(hintOff) return; hintOff=true; $("#hint").classList.add("off"); }
addEventListener("keydown",function(e){
  if($("#ed").hidden) return; if($("#modal").classList.contains("on")){ if(e.key==="Escape") closeModal(); return; }
  if(/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) return;
  var k=e.key.toLowerCase(), L=curL();
  if((e.ctrlKey||e.metaKey)&&k==="z"){ e.preventDefault(); $(e.shiftKey?"#redo":"#undo").click(); return; }
  if((e.ctrlKey||e.metaKey)&&k==="y"){ e.preventDefault(); $("#redo").click(); return; }
  if((e.ctrlKey||e.metaKey)&&k==="d"&&L){ e.preventDefault(); tool("dup"); return; }
  if(k==="escape"){ if(ui.brush) endBrush(); else if(sel){ sel=null; refreshInsp(); draw(); } return; }
  if(!L) return;
  if(k==="delete"||k==="backspace"){ e.preventDefault(); tool("del"); return; }
  var st=e.shiftKey?10:1, mv={arrowleft:[-st,0],arrowright:[st,0],arrowup:[0,-st],arrowdown:[0,st]}[k];
  if(mv&&!L.locked){ e.preventDefault(); remember("nudge"); L.x+=mv[0]; L.y+=mv[1]; draw(); save(); }
});
$("#title").addEventListener("input",function(){ remember("title"); W.title=this.value; save(); });

/* ═══════════ мои работы ═══════════ */
function showHome(){
  $("#ed").hidden=true; $("#home").hidden=false; document.title="FORGE · графическая мастерская";
  try{ history.replaceState(null,"",location.pathname); }catch(e){}
  dbAll().then(function(list){ list.sort(function(a,b){ return (b.updated||0)-(a.updated||0); });
    var my=$("#myWorks"); my.innerHTML="";
    if(!list.length) my.appendChild(el('<p class="note">Здесь появятся ваши работы. Начните с размера или шаблона ниже.</p>'));
    list.forEach(function(w){ var d=new Date(w.updated||Date.now()), when=d.toLocaleDateString("ru-RU",{day:"numeric",month:"short"});
      var n=el('<div class="pg"><button class="th wk">'+(w.thumb?'<img src="'+w.thumb+'" alt="">':'')+'</button><b>'+esc(w.title)+'</b><small>'+when+', '+w.w+'x'+w.h+'</small><div class="acts"><button data-a="copy">копия</button><button data-a="del">удалить</button></div></div>');
      $(".th",n).onclick=function(){ openWork(w); };
      $$(".acts button",n).forEach(function(b){ b.onclick=function(){ if(b.getAttribute("data-a")==="copy"){ var c=JSON.parse(JSON.stringify(w)); c.id=newId(); c.title=w.title+" (копия)"; c.updated=Date.now(); dbPut(c).then(showHome); }
        else ask("Удалить работу «"+w.title+"»?","Удалить").then(function(y){ if(y) dbDel(w.id).then(showHome); }); }; });
      my.appendChild(n); }); });
  var sz=$("#sizes"); sz.innerHTML="";
  GSIZES.concat([{id:"own",name:"Свой размер",w:0,h:0,note:"любые стороны"}]).forEach(function(s){
    var k=s.w?38/Math.max(s.w,s.h):0, iw=s.w?Math.round(s.w*k):30, ih=s.h?Math.round(s.h*k):30;
    var n=el('<button class="sz1'+(s.id==="own"?" own":"")+'"><i style="width:'+iw+'px;height:'+ih+'px'+(s.round?';border-radius:50%':'')+'"></i><b>'+esc(s.name)+'</b><small>'+(s.w?s.w+" x "+s.h:"")+(s.note?(s.w?", ":"")+esc(s.note):"")+'</small></button>');
    n.onclick=function(){ if(s.id==="own") ownSize(); else create(newWork(s.id)); }; sz.appendChild(n); });
  var tw=$("#tplWrap"); tw.innerHTML=""; tplGrid(tw,function(id){ create(fromGTemplate(id)); });
}
function ownSize(){ modal('<h3>Свой размер</h3><div class="two"><div class="f"><label>Ширина, px</label><input type="number" id="oW" value="1200"></div><div class="f"><label>Высота, px</label><input type="number" id="oH" value="800"></div></div><div class="row"><button class="btn" data-close>Отмена</button><button class="btn go" id="oGo">Создать</button></div>');
  $("#oGo").onclick=function(){ var w=Math.max(16,Math.min(8000,+$("#oW").value||1200)), h=Math.max(16,Math.min(8000,+$("#oH").value||800)); closeModal(); create(newWork("own",w,h)); }; }
function create(w){ w.id=newId(); w.updated=Date.now(); w.thumb=""; dbPut(w).then(function(){ openWork(w); }).catch(function(){ openWork(w); }); }
function openWork(w){
  W=w; if(!W.assets) W.assets={}; U=[]; Rd=[]; undoBtns(); sel=null; fit(); PROC_reset();
  $("#home").hidden=true; $("#ed").hidden=false; document.title="FORGE · "+W.title; $("#title").value=W.title;
  try{ history.replaceState(null,"",location.pathname+"#"+W.id); }catch(e){}
  requestAnimationFrame(function(){ resize(); });
  if(wide.matches) openTab("add"); else closeSheet(); refreshInsp();
  hintOff=false; $("#hint").classList.remove("off"); setTimeout(hideHint,7000);
  if(document.fonts&&document.fonts.ready) document.fonts.ready.then(draw);
}
$("#toHome").onclick=function(){ if(ui.brush) endBrush(); save(); setTimeout(showHome,520); };

(function boot(){ var h=location.hash.slice(1);
  if(h) dbGet(h).then(function(w){ if(w) openWork(w); else showHome(); }); else showHome(); })();
})();
