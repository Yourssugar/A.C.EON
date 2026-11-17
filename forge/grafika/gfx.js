/* FORGE графика: редактор. Холст, жесты, слои, панели, хранение, сохранение картинки и PDF, удаление фона, рисование от руки, коллаж. */
(function(){
"use strict";
var $=function(s,r){ return (r||document).querySelector(s); };
var $$=function(s,r){ return [].slice.call((r||document).querySelectorAll(s)); };
var wide=matchMedia("(min-width:960px)"), touch=matchMedia("(pointer:coarse)").matches;
var SV={ up:"M12 19V5M5 12l7-7 7 7", down:"M12 5v14M5 12l7 7 7-7", dup:"M8 8h12v12H8zM16 8V4H4v12h4", del:"M5 7h14M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3",
  eye:"M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM9 12a3 3 0 106 0 3 3 0 00-6 0", lock:"M6 11h12v9H6zM9 11V8a3 3 0 016 0", unlock:"M6 11h12v9H6zM9 11V8a3 3 0 015.8-1",
  more:"M5 12h.01M12 12h.01M19 12h.01", fx:"M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5L18 18M18 6l-2.5 2.5M8.5 15.5L6 18",
  img:"M4 5h16v14H4zM4 15l5-5 4 4 3-3 4 4", cam:ICONS.camera, plus:"M12 5v14M5 12h14", x:"M6 6l12 12M18 6L6 18", wand:"M4 20L16 8M14 4l1 2 2 1-2 1-1 2-1-2-2-1 2-1zM19 11l.7 1.3 1.3.7-1.3.7L19 15l-.7-1.3L17 13l1.3-.7z",
  text:"M5 6h14M12 6v13", pen:"M4 20l4-1L19 8l-3-3L5 16zM14 7l3 3", marker:"M9 20H4l1-5L15 5l4 4L9 19zM13 7l4 4", eraser:"M8 20h12M4 15l9-9 6 6-8 8H9z", undo2:"M9 14L4 9l5-5M4 9h10a6 6 0 010 12h-3", smooth:"M3 14c3-8 6-8 9 0s6 8 9 0", pip:"M14 5l5 5M4 20l2-6 9-9 4 4-9 9zM12 7l5 5", flipx:"M12 3v18M8 7l-5 5 5 5zM16 7l5 5-5 5z", flipy:"M3 12h18M7 8l5-5 5 5zM7 16l5 5 5-5z", grid:"M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z", qr:"M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h2v2h-2zM18 14h2v2h-2zM14 18h2v2h-2zM18 18h2v2h-2zM6.5 6.5h1v1h-1zM16.5 6.5h1v1h-1zM6.5 16.5h1v1h-1z", down2:ICONS.down, send:ICONS.send, brush:ICONS.brush };
SV.crop="M6 2v14a2 2 0 002 2h14M2 6h14a2 2 0 012 2v14"; SV.group="M3 3h7v7H3zM14 14h7v7h-7zM10 7h4v3M7 10v4h3"; SV.ungroup="M3 3h7v7H3zM14 14h7v7h-7z";
SV.all="M4 3v18M8 6h12v4H8zM8 14h7v4H8z"; SV.alc="M12 3v18M6 6h12v4H6zM8 14h8v4H8z"; SV.alr="M20 3v18M4 6h12v4H4zM9 14h7v4H9z";
SV.alt="M3 4h18M6 8h4v12H6zM14 8h4v7h-4z"; SV.alm="M3 12h18M6 6h4v12H6zM14 8h4v8h-4z"; SV.alb="M3 20h18M6 4h4v12H6zM14 9h4v7h-4z";
SV.dsh="M3 4v16M21 4v16M9 8h6v8H9z"; SV.dsv="M4 3h16M4 21h16M8 9h8v6H8z"; SV.paste="M9 4h6v3H9zM7 5H5v16h14V5h-2";
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
function usedAssets(){ var u={}; W.layers.forEach(function(L){ if(L.src) u[L.src]=1; if(L.mask) u[L.mask]=1; if(L.fg) u[L.fg]=1; if(L.tf&&L.tf.src) u[L.tf.src]=1; }); return u; }
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
function restore(s){ if(ui.crop){ ui.crop=null; $("#brushbar").hidden=true; $("#brushbar").classList.remove("crop"); } var o=JSON.parse(s), ow=W.w, oh=W.h; for(var k in o) W[k]=o[k]; if(sel&&!L_(sel)) sel=null; MS=MS.filter(function(id){ return !!L_(id); }); uKey=""; undoBtns(); PROC_reset(); if(W.w!==ow||W.h!==oh) fit(); draw(); refresh(); save(); }
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
  if(W.bg.t==="none"){ /* прозрачный фон: шахматка, как в редакторах картинок */
    g.save(); g.scale(dpr,dpr); g.beginPath(); if(W.round) g.arc(G.l+W.w*G.s/2,G.t+W.h*G.s/2,W.w*G.s/2,0,Math.PI*2); else g.rect(G.l,G.t,W.w*G.s,W.h*G.s); g.clip();
    g.fillStyle="#d9dde2"; g.fillRect(G.l,G.t,W.w*G.s,W.h*G.s); g.fillStyle="#ffffff"; var q=10;
    for(var yy=0;yy<W.h*G.s;yy+=q) for(var xx=((yy/q)%2)*q;xx<W.w*G.s;xx+=q*2) g.fillRect(G.l+xx,G.t+yy,q,q); g.restore(); }
  drawWork(g,W,{ scale:G.s*dpr, ox:G.l*dpr, oy:G.t*dpr, clipRound:W.round });
  if(ui.crop) cropGhost(G);
  $("#zFit").textContent=Math.round(view.z*100)+"%";
}
onAsset=function(){ draw(); };
function toWork(cx,cy){ var r=stage.getBoundingClientRect(), G=geom(); return { x:(cx-r.left-G.l)/G.s, y:(cy-r.top-G.t)/G.s }; }
function toScreen(x,y){ var G=geom(); return { x:G.l+x*G.s, y:G.t+y*G.s }; }
function fit(){ view.z=1; view.px=view.py=0; }

/* рамка выделения, ручки, плашка, направляющие, расстояния, рамка выбора мышкой */
var guides=[], sizeLbl="";
function ovEl(cls,css,parent){ var d=document.createElement("div"); d.className=cls; if(css) d.style.cssText+=css; (parent||ov).appendChild(d); return d; }
function rotBox(L,G,cls){ var s=layerSize(L), c=toScreen(L.x,L.y), w=s.w*G.s, h=s.h*G.s; return ovEl(cls,"width:"+w+"px;height:"+h+"px;transform:translate("+(c.x-w/2)+"px,"+(c.y-h/2)+"px) rotate("+(L.rot||0)+"deg)"); }
function handles(box,corners,sides){ corners.forEach(function(x){ var d=ovEl("hd","",box); d.setAttribute("data-h",x[0]); d.style.left=(x[1]*100)+"%"; d.style.top=(x[2]*100)+"%"; });
  (sides||[]).forEach(function(x){ var d=ovEl("hd "+x[3],"",box); d.setAttribute("data-h",x[0]); d.style.left=(x[1]*100)+"%"; d.style.top=(x[2]*100)+"%"; }); }
var CORN=[["nw",0,0],["ne",1,0],["sw",0,1],["se",1,1]];
function overlay(){
  ov.innerHTML=""; var G=geom();
  guides.forEach(function(gd){ var d=ovEl("guide "+gd.k); if(gd.k==="v"){ d.style.left=gd.p+"px"; if(gd.a!=null){ d.style.top=Math.min(gd.a,gd.b)+"px"; d.style.bottom="auto"; d.style.height=Math.abs(gd.b-gd.a)+"px"; } }
    else { d.style.top=gd.p+"px"; if(gd.a!=null){ d.style.left=Math.min(gd.a,gd.b)+"px"; d.style.right="auto"; d.style.width=Math.abs(gd.b-gd.a)+"px"; } } });
  meas.forEach(function(m){ var d=ovEl("meas "+m.k), t=ovEl("mlbl"); t.textContent=m.t;
    if(m.k==="h"){ d.style.left=m.a.x+"px"; d.style.top=m.a.y+"px"; d.style.width=(m.b.x-m.a.x)+"px"; t.style.left=(m.a.x+m.b.x)/2+"px"; t.style.top=(m.a.y-10)+"px"; }
    else { d.style.left=m.a.x+"px"; d.style.top=m.a.y+"px"; d.style.height=(m.b.y-m.a.y)+"px"; t.style.left=(m.a.x+16)+"px"; t.style.top=(m.a.y+m.b.y)/2+"px"; } });
  if(marq){ var a=toScreen(Math.min(marq.x0,marq.x1),Math.min(marq.y0,marq.y1)), b=toScreen(Math.max(marq.x0,marq.x1),Math.max(marq.y0,marq.y1));
    ovEl("marq","left:"+a.x+"px;top:"+a.y+"px;width:"+(b.x-a.x)+"px;height:"+(b.y-a.y)+"px"); marq.hits.forEach(function(id){ var L=L_(id); if(L) rotBox(L,G,"sel-sub"); }); return; }
  if(ui.crop){ cropOverlay(G); return; }
  if(ui.pen||ui.brush&&ui.brush.drawing) return;
  if(isMulti()){ multiOverlay(G); return; }
  var L=curL(); if(!L) return;
  var s=layerSize(L), c=toScreen(L.x,L.y);
  var box=rotBox(L,G,"sel-box"+(L.locked?" lock":"")+(L.g?" ing":""));
  if(!L.locked && !ui.brush){
    var sides=[]; if(L.t!=="text"&&L.t!=="qr"){ sides.push(["e",1,.5,"s"],["w",0,.5,"s"]); if(!isLine(L.kind)) sides.push(["n",.5,0,"v"],["s",.5,1,"v"]); }
    handles(box,CORN,sides);
    ovEl("rot-line","top:-34px;height:32px",box); var rh=ovEl("hd rot","left:50%;top:-36px",box); rh.setAttribute("data-h","rot");
  }
  if(sizeLbl){ var z=ovEl("szl"); z.textContent=sizeLbl; z.style.left=c.x+"px"; z.style.top=(c.y+bboxH(L,G)/2+16)+"px"; }
  if(drag||ui.brush) return;
  var tb=ovEl("gtb");
  var col=L.t==="text"?(L.tf&&L.tf.t==="grad"?L.tf.c1:L.color):L.t==="shape"?(L.fill||L.stroke||"#888"):L.t==="icon"?L.color:L.t==="qr"?L.fg:L.t==="draw"?inkColor(L):"";
  var h="";
  if(col) h+='<button data-t="color" title="'+esc(TR("Цвет"))+'"><span class="sw" style="background:'+esc(col)+'"></span></button>';
  if(L.t==="text") h+='<button data-t="font" title="'+esc(TR("Шрифт"))+'" style="font-family:'+esc(fontStack(L.font))+'">Aa</button><button data-t="fx" title="'+esc(TR("Эффекты"))+'">'+sv("fx")+'</button>';
  if(L.t==="image") h+='<button data-t="crop" title="'+esc(TR("Обрезать"))+'">'+sv("crop")+'</button><button data-t="filters" title="'+esc(TR("Фильтры"))+'">'+sv("img")+'</button><button data-t="cut" title="'+esc(TR("Убрать фон"))+'">'+sv("wand")+'</button>';
  if(L.t==="qr") h+='<button data-t="qr" title="'+esc(TR("Что внутри кода"))+'">'+sv("qr")+'</button>';
  if(L.t==="draw") h+='<button data-t="pen" title="'+esc(TR("Дорисовать"))+'">'+sv("pen")+'</button>';
  h+='<i></i><button data-t="up" title="'+esc(TR("Слой выше"))+'">'+sv("up")+'</button><button data-t="dup" title="'+esc(TR("Копия"))+'">'+sv("dup")+'</button><button data-t="del" title="'+esc(TR("Удалить"))+'">'+sv("del")+'</button><i></i><button data-t="more" title="'+esc(TR("Все настройки"))+'">'+sv("more")+'</button>';
  tb.innerHTML=h; placeTb(tb,c.x,c.y,bboxH(L,G),L.locked);
}
function placeTb(tb,cx,cy,bh,lock){ var tw=tb.offsetWidth, th=tb.offsetHeight, top=cy-bh/2-th-(lock?14:52);
  if(top<6) top=cy+bh/2+18; if(top+th>SH-6) top=Math.max(6,cy-th/2);
  tb.style.left=Math.max(6,Math.min(SW-tw-6,cx-tw/2))+"px"; tb.style.top=top+"px"; }
function multiOverlay(G){ var Ls=selLs(), b=selBox(Ls), grp=allGrouped(Ls), lock=Ls.every(function(L){ return L.locked; });
  Ls.forEach(function(L){ rotBox(L,G,"sel-sub"); });
  var a=toScreen(b.x0,b.y0), w=b.w*G.s, h=b.h*G.s, box=ovEl("sel-box multi"+(grp?" grp":""),"width:"+w+"px;height:"+h+"px;transform:translate("+a.x+"px,"+a.y+"px)");
  if(!lock){ handles(box,CORN); ovEl("rot-line","top:-34px;height:32px",box); var rh=ovEl("hd rot","left:50%;top:-36px",box); rh.setAttribute("data-h","rot"); }
  if(sizeLbl){ var z=ovEl("szl"); z.textContent=sizeLbl; z.style.left=(a.x+w/2)+"px"; z.style.top=(a.y+h+16)+"px"; }
  if(drag) return;
  var tb=ovEl("gtb"), n=Ls.length;
  tb.innerHTML='<span class="cnt">'+esc(grp?TR("Группа"):TR("Выбрано: {0}",n))+'</span><i></i><button data-t="align" title="'+esc(TR("Выровнять"))+'">'+sv("alc")+'</button>'+
    (grp?'<button data-t="ungroup" title="'+esc(TR("Разгруппировать"))+'">'+sv("ungroup")+'</button>':'<button data-t="group" title="'+esc(TR("Сгруппировать"))+'">'+sv("group")+'</button>')+
    '<i></i><button data-t="dup" title="'+esc(TR("Копия"))+'">'+sv("dup")+'</button><button data-t="del" title="'+esc(TR("Удалить"))+'">'+sv("del")+'</button><i></i><button data-t="more" title="'+esc(TR("Все настройки"))+'">'+sv("more")+'</button>';
  placeTb(tb,a.x+w/2,a.y+h/2,h,lock); }
function bboxH(L,G){ var s=layerSize(L), a=(L.rot||0)*Math.PI/180; return (Math.abs(s.w*Math.sin(a))+Math.abs(s.h*Math.cos(a)))*G.s; }
ov.addEventListener("click",function(e){ var b=e.target.closest(".gtb button"); if(b) tool(b.getAttribute("data-t")); });

/* ═══════════ обрезка фото прямо на холсте ═══════════
   Во время обрезки фото стоит на месте, а рамка двигается по нему. Считаем в осях слоя (с учётом поворота и отражения):
   ph = где лежит всё фото, fr = рамка, C0 = центр слоя в момент начала. В конце из них получаются размер рамки, приближение и сдвиг кадра. */
function startCrop(L){ if(!L||L.t!=="image"||L.locked){ if(L&&L.locked) toast("Слой под замком"); return; } if(ui.pen) endPen(); if(ui.brush) endBrush(); setSel([L.id]);
  var r=coverRect(L,L.iw,L.ih); ui.crop={ id:L.id, C0:{ x:L.x, y:L.y }, rot:(L.rot||0)*Math.PI/180, fx:L.flipX?-1:1, fy:L.flipY?-1:1, ph:{ x:r.x, y:r.y, w:r.w, h:r.h }, fr:{ x0:-L.w/2, y0:-L.h/2, x1:L.w/2, y1:L.h/2 }, ar:0, snap:snap(), changed:false };
  if(!wide.matches) closeSheet(); cropBar(); draw(); }
function cropL(){ return ui.crop&&L_(ui.crop.id); }
/* точка холста -> оси рамки (учтены поворот и отражение) */
function cropPt(p){ var C=ui.crop, dx=p.x-C.C0.x, dy=p.y-C.C0.y, c=Math.cos(-C.rot), s=Math.sin(-C.rot); return { x:(dx*c-dy*s)*C.fx, y:(dx*s+dy*c)*C.fy }; }
function cropApply(){ var C=ui.crop, L=cropL(); if(!L) return; var f=C.fr, w=f.x1-f.x0, h=f.y1-f.y0, cx=(f.x0+f.x1)/2*C.fx, cy=(f.y0+f.y1)/2*C.fy, c=Math.cos(C.rot), s=Math.sin(C.rot);
  L.x=Math.round((C.C0.x+cx*c-cy*s)*10)/10; L.y=Math.round((C.C0.y+cx*s+cy*c)*10)/10; L.w=Math.max(4,Math.round(w)); L.h=Math.max(4,Math.round(h));
  var k=C.ph.w/L.iw, base=Math.max(L.w/L.iw,L.h/L.ih); L.zoom=Math.max(1,Math.round(k/base*1000)/1000);
  L.fx=C.ph.w-w>.5?Math.max(0,Math.min(100,(f.x0-C.ph.x)/(C.ph.w-w)*100)):50; L.fy=C.ph.h-h>.5?Math.max(0,Math.min(100,(f.y0-C.ph.y)/(C.ph.h-h)*100)):50;
  if(L.r) L.r=Math.min(L.r,Math.round(Math.min(L.w,L.h)/2)); C.changed=true; draw(); }
/* рамка не выходит за фото и не меньше 16 px */
function cropClamp(){ var C=ui.crop, f=C.fr, P0=C.ph, m=16;
  f.x0=Math.max(P0.x,f.x0); f.y0=Math.max(P0.y,f.y0); f.x1=Math.min(P0.x+P0.w,f.x1); f.y1=Math.min(P0.y+P0.h,f.y1);
  if(f.x1-f.x0<m){ if(f.x0+m<=P0.x+P0.w) f.x1=f.x0+m; else f.x0=f.x1-m; } if(f.y1-f.y0<m){ if(f.y0+m<=P0.y+P0.h) f.y1=f.y0+m; else f.y0=f.y1-m; } }
/* фото накрывает рамку целиком: сдвигаем его, если рамка вылезла */
function photoClamp(){ var C=ui.crop, f=C.fr, P0=C.ph; if(P0.w<f.x1-f.x0||P0.h<f.y1-f.y0){ var k=Math.max((f.x1-f.x0)/P0.w,(f.y1-f.y0)/P0.h), cx=P0.x+P0.w/2, cy=P0.y+P0.h/2; P0.w*=k; P0.h*=k; P0.x=cx-P0.w/2; P0.y=cy-P0.h/2; }
  P0.x=Math.min(f.x0,Math.max(f.x1-P0.w,P0.x)); P0.y=Math.min(f.y0,Math.max(f.y1-P0.h,P0.y)); }
function cropDown(h,p,e){ var C=ui.crop; if(!C) return; var q=cropPt(p);
  if(h&&h.indexOf("c-")===0){ drag={ crop:true, h:h.slice(2), q0:q, fr0:JSON.parse(JSON.stringify(C.fr)), moved:false }; return; }
  var P0=C.ph; if(q.x>=P0.x&&q.x<=P0.x+P0.w&&q.y>=P0.y&&q.y<=P0.y+P0.h){ drag={ crop:true, h:"photo", q0:q, ph0:JSON.parse(JSON.stringify(P0)), moved:false }; return; }
  endCrop(); }
function cropMove(e){ var C=ui.crop, d=drag, q=cropPt(toWork(e.clientX,e.clientY)), dx=q.x-d.q0.x, dy=q.y-d.q0.y; d.moved=true;
  if(d.h==="photo"){ C.ph.x=d.ph0.x+dx; C.ph.y=d.ph0.y+dy; photoClamp(); cropApply(); return; }
  /* ручка: в осях экрана «справа» может оказаться левым краем, если фото отражено */
  var f=C.fr, f0=d.fr0, h=d.h, ex=h.indexOf("e")>=0?C.fx:h.indexOf("w")>=0?-C.fx:0, ey=h.indexOf("s")>=0?C.fy:h.indexOf("n")>=0?-C.fy:0;
  if(ex>0) f.x1=f0.x1+dx; if(ex<0) f.x0=f0.x0+dx; if(ey>0) f.y1=f0.y1+dy; if(ey<0) f.y0=f0.y0+dy;
  if(C.ar&&ex&&ey){ var w=f.x1-f.x0, hh=f.y1-f.y0; if(w/hh>C.ar) w=hh*C.ar; else hh=w/C.ar; if(ex>0) f.x1=f.x0+w; else f.x0=f.x1-w; if(ey>0) f.y1=f.y0+hh; else f.y0=f.y1-hh; }
  cropClamp(); if(C.ar&&ex&&ey){ var w2=f.x1-f.x0, h2=f.y1-f.y0; if(Math.abs(w2/h2-C.ar)>.01){ if(w2/h2>C.ar){ w2=h2*C.ar; if(ex>0) f.x1=f.x0+w2; else f.x0=f.x1-w2; } else { h2=w2/C.ar; if(ey>0) f.y1=f.y0+h2; else f.y0=f.y1-h2; } } }
  var L=cropL(); sizeLbl=Math.round(f.x1-f.x0)+" x "+Math.round(f.y1-f.y0); cropApply(); }
function cropUp(d){ sizeLbl=""; draw(); }
function cropWheel(e){ var C=ui.crop; if(!C) return; cropZoom(Math.exp(-e.deltaY*.0015)); }
/* приближение фото вокруг середины рамки */
function cropZoom(k){ var C=ui.crop, f=C.fr, P0=C.ph, cx=(f.x0+f.x1)/2, cy=(f.y0+f.y1)/2, nw=P0.w*k, nh=P0.h*k, min=Math.max((f.x1-f.x0)/P0.w,(f.y1-f.y0)/P0.h);
  if(k<1&&k<min){ k=min; nw=P0.w*k; nh=P0.h*k; } P0.x=cx-(cx-P0.x)*k; P0.y=cy-(cy-P0.y)*k; P0.w=nw; P0.h=nh; photoClamp(); cropApply(); }
/* пропорции: самая большая рамка нужной формы вокруг середины нынешней, в пределах фото */
function cropRatio(ar){ var C=ui.crop; C.ar=ar; if(!ar){ cropBar(); return; } var f=C.fr, P0=C.ph, cx=(f.x0+f.x1)/2, cy=(f.y0+f.y1)/2, w=Math.min(P0.w,P0.h*ar), h=w/ar;
  cx=Math.max(P0.x+w/2,Math.min(P0.x+P0.w-w/2,cx)); cy=Math.max(P0.y+h/2,Math.min(P0.y+P0.h-h/2,cy)); C.fr={ x0:cx-w/2, y0:cy-h/2, x1:cx+w/2, y1:cy+h/2 }; cropApply(); cropBar(); }
function cropReset(){ var C=ui.crop, P0=C.ph; C.ar=0; C.fr={ x0:P0.x, y0:P0.y, x1:P0.x+P0.w, y1:P0.y+P0.h }; cropApply(); cropBar(); }
function cropBar(){ var C=ui.crop, L=cropL(), bb=$("#brushbar"); bb.hidden=false; bb.classList.add("crop"); var ia=L?L.iw/L.ih:1;
  var rs=[[0,"любая форма"],[ia,"как у фото"],[1,"1:1"],[.8,"4:5"],[16/9,"16:9"],[9/16,"9:16"]];
  bb.innerHTML='<div class="pr">'+rs.map(function(r){ return '<button data-ar="'+r[0]+'" class="'+(Math.abs((C.ar||0)-r[0])<.001&&(r[0]||!C.ar)?"on":"")+'">'+esc(TR(r[1]))+'</button>'; }).join("")+'</div>'+
    '<div class="pr"><button data-zm="-">&minus;</button><button data-zm="+">+</button><button data-rs>'+esc(TR("Всё фото"))+'</button><button data-done class="go">'+esc(TR("Готово"))+'</button></div>';
  $$("[data-ar]",bb).forEach(function(b){ b.onclick=function(){ cropRatio(+b.getAttribute("data-ar")); }; });
  $$("[data-zm]",bb).forEach(function(b){ b.onclick=function(){ cropZoom(b.getAttribute("data-zm")==="+"?1.15:1/1.15); }; });
  $("[data-rs]",bb).onclick=cropReset; $("[data-done]",bb).onclick=endCrop; }
function endCrop(){ var C=ui.crop; if(!C) return; ui.crop=null; var bb=$("#brushbar"); bb.hidden=true; bb.classList.remove("crop"); bb.innerHTML=""; sizeLbl="";
  if(C.changed){ U.push(C.snap); if(U.length>60) U.shift(); Rd=[]; undoBtns(); save(); } draw(); refreshInsp(); }
/* призрак всего фото за рамкой: видно, что обрезано и куда можно подвинуть */
function cropGhost(G){ var C=ui.crop, L=cropL(); if(!L) return; var cvp=processed(W,L); if(!cvp) return; var P0=C.ph, f=C.fr;
  g.save(); g.setTransform(dpr*G.s,0,0,dpr*G.s,dpr*G.l,dpr*G.t); g.translate(C.C0.x,C.C0.y); g.rotate(C.rot); g.scale(C.fx,C.fy);
  g.beginPath(); g.rect(P0.x,P0.y,P0.w,P0.h); g.rect(f.x0,f.y0,f.x1-f.x0,f.y1-f.y0); g.clip("evenodd"); g.globalAlpha=.38; g.drawImage(cvp,P0.x,P0.y,P0.w,P0.h);
  g.globalAlpha=1; g.fillStyle="rgba(8,10,14,.35)"; g.fillRect(P0.x,P0.y,P0.w,P0.h); g.restore(); }
function cropOverlay(G){ var C=ui.crop, f=C.fr, L=cropL(); if(!L) return; var w=(f.x1-f.x0)*G.s, h=(f.y1-f.y0)*G.s, cx=(f.x0+f.x1)/2*C.fx, cy=(f.y0+f.y1)/2*C.fy, c=Math.cos(C.rot), s=Math.sin(C.rot);
  var sc=toScreen(C.C0.x+cx*c-cy*s,C.C0.y+cx*s+cy*c), box=ovEl("crop-box","width:"+w+"px;height:"+h+"px;transform:translate("+(sc.x-w/2)+"px,"+(sc.y-h/2)+"px) rotate("+(C.rot*180/Math.PI)+"deg)");
  for(var i=1;i<3;i++){ ovEl("cg v","left:"+(i*33.333)+"%",box); ovEl("cg h","top:"+(i*33.333)+"%",box); }
  [["nw",0,0],["ne",1,0],["sw",0,1],["se",1,1],["n",.5,0,"v"],["s",.5,1,"v"],["e",1,.5,"s"],["w",0,.5,"s"]].forEach(function(x){ var d=ovEl("hd"+(x[3]?" "+x[3]:""),"left:"+(x[1]*100)+"%;top:"+(x[2]*100)+"%",box); d.setAttribute("data-h","c-"+x[0]); });
  if(sizeLbl){ var z=ovEl("szl"); z.textContent=sizeLbl; z.style.left=sc.x+"px"; z.style.top=(sc.y+h/2+16)+"px"; } }

/* ═══════════ жесты: выбор, перетаскивание, размер, поворот, щипок, рамка выделения ═══════════ */
/* Выделение: sel = главный слой (его настройки справа), MS = все выделенные, если их больше одного.
   Нажатие на слой группы выделяет всю группу, двойное нажатие выделяет только этот слой. Shift добавляет и убирает слой. */
var P={}, drag=null, pinch=null, lastTap={t:0,id:null}, MS=[], marq=null, meas=[];
function selIds(){ if(MS.length>1&&MS.indexOf(sel)>=0){ var a=MS.filter(function(id){ return !!L_(id); }); if(a.length>1) return a; } return sel&&L_(sel)?[sel]:[]; }
function selLs(){ var ids=selIds(); return W.layers.filter(function(L){ return ids.indexOf(L.id)>=0; }); }
function isMulti(){ return selIds().length>1; }
function groupIds(L){ return L&&L.g?W.layers.filter(function(x){ return x.g===L.g; }).map(function(x){ return x.id; }):(L?[L.id]:[]); }
function setSel(ids,primary){ var seen={}; ids=ids.filter(function(id){ if(seen[id]||!L_(id)) return false; seen[id]=1; return true; });
  if(ids.length>1){ MS=ids; sel=primary&&ids.indexOf(primary)>=0?primary:ids[ids.length-1]; } else { MS=[]; sel=ids[0]||null; }
  refreshInsp(); if(ui.tab==="layers") refreshPane(); draw(); }
function selBox(Ls){ var b={ x0:Infinity, y0:Infinity, x1:-Infinity, y1:-Infinity }; Ls.forEach(function(L){ var a=aabb(L); if(a.x0<b.x0) b.x0=a.x0; if(a.y0<b.y0) b.y0=a.y0; if(a.x1>b.x1) b.x1=a.x1; if(a.y1>b.y1) b.y1=a.y1; });
  b.w=b.x1-b.x0; b.h=b.y1-b.y0; b.cx=(b.x0+b.x1)/2; b.cy=(b.y0+b.y1)/2; return b; }
var spaceDown=false;
addEventListener("keydown",function(e){ if(e.code==="Space"&&!/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)){ if(!spaceDown){ spaceDown=true; stage.classList.add("panning"); } if(W&&!$("#ed").hidden) e.preventDefault(); } });
addEventListener("keyup",function(e){ if(e.code==="Space"){ spaceDown=false; stage.classList.remove("panning"); } });
stage.addEventListener("pointerdown",function(e){
  if(e.target.closest(".gtb")||e.target.closest(".brushbar")||e.target.closest(".busy")) return;
  P[e.pointerId]={x:e.clientX,y:e.clientY}; try{ stage.setPointerCapture(e.pointerId); }catch(x){}
  var ids=Object.keys(P);
  if(ids.length===2){ var a=P[ids[0]], b=P[ids[1]]; drag=null; marq=null; if(ui.pen) penCancel(); pinch={ d:Math.hypot(a.x-b.x,a.y-b.y), z:view.z, px:view.px, py:view.py, mx:(a.x+b.x)/2, my:(a.y+b.y)/2 }; return; }
  hideHint();
  var p=toWork(e.clientX,e.clientY), L=curL(), mouse=e.pointerType==="mouse";
  if(ui.pick){ var pf=ui.pick, pc=colorAt(p.x,p.y); ui.pick=null; stage.classList.remove("picking"); delete P[e.pointerId]; if(pc) pf(pc); else toast("Здесь пусто: цвета нет"); return; }
  if(ui.pen){ penStart(p,e); return; }
  if(ui.brush){ if(L&&L.t==="image"){ brushStart(L,p,e); } return; }
  var h=e.target.getAttribute&&e.target.getAttribute("data-h");
  if(ui.crop){ cropDown(h,p,e); return; }
  if(spaceDown||e.button===1){ drag={ h:"pan", sx:e.clientX, sy:e.clientY, px:view.px, py:view.py, moved:false, force:true }; return; }
  var G=geom(), multi=isMulti();
  if(h&&multi){ startMulti(h,p); return; }
  if(h&&L){ startDrag(h,L,p,e); return; }
  var hit=null;
  var addKey=e.shiftKey||(ui.lmulti&&!mouse);
  if(multi&&!addKey){ var sb=selBox(selLs()), pd=8/G.s; if(p.x>=sb.x0-pd&&p.x<=sb.x1+pd&&p.y>=sb.y0-pd&&p.y<=sb.y1+pd){ var top=hitAt(p,G);
      if(top&&selIds().indexOf(top.id)<0){ hit=top; } else { var now0=Date.now(); if(top&&top.id===lastTap.id&&now0-lastTap.t<350){ setSel([top.id]); lastTap.t=0; if(top.t==="text") tool("text"); else if(top.t==="image") startCrop(top); return; }
        lastTap={ t:now0, id:top?top.id:null }; startMulti("move",p); return; } } }
  if(!hit&&L&&!L.locked&&!multi){ var q=toLocal(L,p.x,p.y), s=layerSize(L); if(Math.abs(q.x)<=s.w/2+8/G.s && Math.abs(q.y)<=s.h/2+8/G.s) hit=L; }
  if(!hit){ hit=hitAt(p,G); }
  if(hit){
    if(addKey){ var cur=selIds(), gi=groupIds(hit), has=cur.indexOf(hit.id)>=0; setSel(has?cur.filter(function(id){ return gi.indexOf(id)<0; }):cur.concat(gi),has?null:hit.id); return; }
    var now=Date.now(), dbl=hit.id===lastTap.id&&now-lastTap.t<350;
    if(dbl){ lastTap.t=0; if(hit.g&&isMulti()){ setSel([hit.id]); toast("Выбран один слой из группы"); return; } if(hit.t==="text"){ select(hit.id); tool("text"); return; } if(hit.t==="image"&&!hit.locked){ select(hit.id); startCrop(hit); return; } }
    lastTap={t:now,id:hit.id};
    if(hit.g&&!(sel===hit.id&&!isMulti())){ if(selIds().indexOf(hit.id)<0||!isMulti()) setSel(groupIds(hit),hit.id); if(isMulti()){ startMulti("move",p); return; } }
    else if(sel!==hit.id||isMulti()) select(hit.id);
    if(!hit.locked) startDrag("move",hit,p,e);
  } else {
    if(mouse&&e.button===0){ marq={ x0:p.x, y0:p.y, x1:p.x, y1:p.y, add:e.shiftKey, base:e.shiftKey?selIds():[], hits:[] }; if(!e.shiftKey&&sel){ MS=[]; sel=null; refreshInsp(); if(ui.tab==="layers") refreshPane(); } draw(); return; }
    if(sel){ MS=[]; sel=null; refreshInsp(); if(ui.tab==="layers") refreshPane(); draw(); } drag={ h:"pan", sx:e.clientX, sy:e.clientY, px:view.px, py:view.py, moved:false }; }
});
function hitAt(p,G){ for(var i=W.layers.length-1;i>=0;i--){ var L=W.layers[i]; if(L.hidden||L.locked) continue; var s=layerSize(L), q=toLocal(L,p.x,p.y), e=6/G.s;
  if(Math.abs(q.x)<=s.w/2+e && Math.abs(q.y)<=Math.max(s.h,24/G.s)/2+e) return L; } return null; }
function startDrag(h,L,p,e){ drag={ h:h, id:L.id, p0:p, x0:L.x, y0:L.y, w0:L.w, h0:L.h, size0:L.size, rot0:L.rot||0, moved:false, snap:snap(), bb0:aabb(L) }; }
/* несколько слоёв: запоминаем, где каждый стоял, всё считается от этого */
function startMulti(h,p){ var Ls=selLs().filter(function(L){ return !L.locked; }); if(!Ls.length) return;
  drag={ h:h, multi:true, p0:p, moved:false, snap:snap(), bb0:selBox(Ls), items:Ls.map(function(L){ return { id:L.id, x:L.x, y:L.y, w:L.w, h:L.h, size:L.size, rot:L.rot||0, sw:L.sw, sh:L.sh?JSON.parse(JSON.stringify(L.sh)):null, out:L.out?L.out.w:0 }; }) }; }
/* прилипание: края и середины рамки двигаемого к краям и серединам холста и других слоёв; рядом показываем расстояния до соседей */
function snapMove(skip,bb,dx,dy,G){ var th=7/G.s, X=[[0,null],[W.w/2,null],[W.w,null]], Y=[[0,null],[W.h/2,null],[W.h,null]], others=[];
  W.layers.forEach(function(L){ if(L.hidden||skip.indexOf(L.id)>=0) return; var a=aabb(L); if(a.w>W.w*1.5&&a.h>W.h*1.5) return; others.push(a); X.push([a.x0,a],[(a.x0+a.x1)/2,a],[a.x1,a]); Y.push([a.y0,a],[(a.y0+a.y1)/2,a],[a.y1,a]); });
  function best(vals,lines){ var out=null; lines.forEach(function(v){ vals.forEach(function(c){ var d=c[0]-v; if(Math.abs(d)<=th&&(!out||Math.abs(d)<Math.abs(out.d))) out={ d:d, at:c[0], o:c[1] }; }); }); return out; }
  var mx=[bb.x0+dx,(bb.x0+bb.x1)/2+dx,bb.x1+dx], my=[bb.y0+dy,(bb.y0+bb.y1)/2+dy,bb.y1+dy], sx=best(X,mx), sy=best(Y,my), gs=[];
  if(sx) dx+=sx.d; if(sy) dy+=sy.d;
  var n={ x0:bb.x0+dx, y0:bb.y0+dy, x1:bb.x1+dx, y1:bb.y1+dy };
  if(sx){ var ya=sx.o?Math.min(sx.o.y0,n.y0):0, yb=sx.o?Math.max(sx.o.y1,n.y1):W.h; gs.push({ k:"v", p:toScreen(sx.at,0).x, a:toScreen(0,ya).y, b:toScreen(0,yb).y }); }
  if(sy){ var xa=sy.o?Math.min(sy.o.x0,n.x0):0, xb=sy.o?Math.max(sy.o.x1,n.x1):W.w; gs.push({ k:"h", p:toScreen(0,sy.at).y, a:toScreen(xa,0).x, b:toScreen(xb,0).x }); }
  /* ближайший сосед с каждой стороны, если рамки перекрываются по другой оси */
  var ms=[], L0=null, R0=null, T0=null, B0=null;
  others.forEach(function(a){ var ov=Math.min(a.y1,n.y1)-Math.max(a.y0,n.y0), oh=Math.min(a.x1,n.x1)-Math.max(a.x0,n.x0);
    if(ov>0){ if(a.x1<=n.x0+.5&&(!L0||a.x1>L0.x1)) L0=a; if(a.x0>=n.x1-.5&&(!R0||a.x0<R0.x0)) R0=a; }
    if(oh>0){ if(a.y1<=n.y0+.5&&(!T0||a.y1>T0.y1)) T0=a; if(a.y0>=n.y1-.5&&(!B0||a.y0<B0.y0)) B0=a; } });
  function hm(a,b,o){ var y=(Math.max(o.y0,n.y0)+Math.min(o.y1,n.y1))/2; if(b-a>=1) ms.push({ k:"h", a:toScreen(a,y), b:toScreen(b,y), t:Math.round(b-a) }); }
  function vm(a,b,o){ var x=(Math.max(o.x0,n.x0)+Math.min(o.x1,n.x1))/2; if(b-a>=1) ms.push({ k:"v", a:toScreen(x,a), b:toScreen(x,b), t:Math.round(b-a) }); }
  if(L0) hm(L0.x1,n.x0,L0); if(R0) hm(n.x1,R0.x0,R0); if(T0) vm(T0.y1,n.y0,T0); if(B0) vm(n.y1,B0.y0,B0);
  return { dx:dx, dy:dy, g:gs, m:ms }; }
stage.addEventListener("pointermove",function(e){
  if(P[e.pointerId]){ P[e.pointerId].x=e.clientX; P[e.pointerId].y=e.clientY; }
  if(ui.pen&&!pinch){ penMove(e); return; }
  if(ui.brush){ brushMove(e); return; }
  if(pinch){ var ids=Object.keys(P); if(ids.length<2) return; var a=P[ids[0]], b=P[ids[1]], d=Math.hypot(a.x-b.x,a.y-b.y);
    view.z=Math.max(.25,Math.min(8,pinch.z*d/pinch.d)); view.px=pinch.px+((a.x+b.x)/2-pinch.mx); view.py=pinch.py+((a.y+b.y)/2-pinch.my); draw(); return; }
  if(ui.crop&&drag&&drag.crop){ cropMove(e); return; }
  if(marq){ var mp=toWork(e.clientX,e.clientY); marq.x1=mp.x; marq.y1=mp.y; var x0=Math.min(marq.x0,marq.x1), x1=Math.max(marq.x0,marq.x1), y0=Math.min(marq.y0,marq.y1), y1=Math.max(marq.y0,marq.y1);
    marq.hits=[]; W.layers.forEach(function(L){ if(L.hidden||L.locked) return; var q=aabb(L); if(q.x1>=x0&&q.x0<=x1&&q.y1>=y0&&q.y0<=y1) marq.hits=marq.hits.concat(groupIds(L)); }); draw(); return; }
  if(!drag) return;
  if(drag.h==="pan"){ var dx=e.clientX-drag.sx, dy=e.clientY-drag.sy; if(Math.abs(dx)+Math.abs(dy)>3) drag.moved=true; if(drag.force||view.z>1.01){ view.px=drag.px+dx; view.py=drag.py+dy; draw(); } return; }
  var p=toWork(e.clientX,e.clientY), G=geom();
  if(!drag.moved && Math.hypot((p.x-drag.p0.x)*G.s,(p.y-drag.p0.y)*G.s)<4) return;
  drag.moved=true; guides=[]; meas=[]; sizeLbl="";
  if(drag.multi){ multiMove(p,G,e); draw(); return; }
  var L=L_(drag.id); if(!L) return;
  if(drag.h==="move"){
    var r=e.altKey?{ dx:p.x-drag.p0.x, dy:p.y-drag.p0.y, g:[], m:[] }:snapMove([L.id],drag.bb0,p.x-drag.p0.x,p.y-drag.p0.y,G);
    L.x=Math.round(drag.x0+r.dx); L.y=Math.round(drag.y0+r.dy); guides=r.g; meas=r.m;
  } else if(drag.h==="rot"){
    var a0=Math.atan2(drag.p0.y-drag.y0,drag.p0.x-drag.x0), a1=Math.atan2(p.y-drag.y0,p.x-drag.x0), rr=drag.rot0+(a1-a0)*180/Math.PI;
    rr=((rr+540)%360)-180; var sn=Math.round(rr/45)*45; if(Math.abs(rr-sn)<4||e.shiftKey&&Math.abs(rr-Math.round(rr/15)*15)<8) rr=e.shiftKey?Math.round(rr/15)*15:sn; L.rot=Math.round(rr*10)/10; sizeLbl=Math.round(L.rot)+"°";
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
/* несколько слоёв: двигаются, растягиваются от противоположного угла рамки и поворачиваются вокруг её середины */
function multiMove(p,G,e){ var b=drag.bb0;
  if(drag.h==="move"){ var r=e.altKey?{ dx:p.x-drag.p0.x, dy:p.y-drag.p0.y, g:[], m:[] }:snapMove(drag.items.map(function(i){ return i.id; }),b,p.x-drag.p0.x,p.y-drag.p0.y,G); guides=r.g; meas=r.m;
    drag.items.forEach(function(it){ var L=L_(it.id); if(L){ L.x=Math.round(it.x+r.dx); L.y=Math.round(it.y+r.dy); } }); return; }
  if(drag.h==="rot"){ var a0=Math.atan2(drag.p0.y-b.cy,drag.p0.x-b.cx), a1=Math.atan2(p.y-b.cy,p.x-b.cx), d=(a1-a0)*180/Math.PI, sn=Math.round(d/45)*45; if(Math.abs(d-sn)<4) d=sn; if(e.shiftKey) d=Math.round(d/15)*15;
    var rad=d*Math.PI/180, c=Math.cos(rad), s=Math.sin(rad); sizeLbl=Math.round(d)+"°";
    drag.items.forEach(function(it){ var L=L_(it.id); if(!L) return; var vx=it.x-b.cx, vy=it.y-b.cy; L.x=Math.round(b.cx+vx*c-vy*s); L.y=Math.round(b.cy+vx*s+vy*c); L.rot=Math.round((((it.rot+d)+540)%360-180)*10)/10; }); return; }
  var ax=drag.h.indexOf("w")>=0?b.x1:b.x0, ay=drag.h.indexOf("n")>=0?b.y1:b.y0, cx0=drag.h.indexOf("w")>=0?b.x0:b.x1, cy0=drag.h.indexOf("n")>=0?b.y0:b.y1;
  var f=Math.max(.05,((p.x-ax)*(cx0-ax)+(p.y-ay)*(cy0-ay))/Math.max(1,(cx0-ax)*(cx0-ax)+(cy0-ay)*(cy0-ay)));
  drag.items.forEach(function(it){ var L=L_(it.id); if(!L) return; L.x=Math.round(ax+(it.x-ax)*f); L.y=Math.round(ay+(it.y-ay)*f);
    if(L.t==="text") L.size=Math.max(6,Math.round(it.size*f)); else { L.w=Math.max(4,Math.round(it.w*f)); L.h=Math.max(2,Math.round(it.h*f)); }
    if(L.t==="shape"&&it.sw) L.sw=Math.max(1,Math.round(it.sw*f)); if(L.out&&it.out) L.out.w=Math.max(1,Math.round(it.out*f));
    if(L.sh&&it.sh){ ["b","x","y"].forEach(function(k){ if(it.sh[k]) L.sh[k]=Math.round(it.sh[k]*f); }); } });
  sizeLbl=Math.round(b.w*f)+" x "+Math.round(b.h*f); }
function endPtr(e){
  delete P[e.pointerId];
  if(ui.pen&&ui.pen.cur){ penEnd(); return; }
  if(ui.brush){ brushEnd(); return; }
  if(pinch){ if(Object.keys(P).length<2) pinch=null; return; }
  if(marq){ var m=marq; marq=null; if(Math.abs(m.x1-m.x0)+Math.abs(m.y1-m.y0)>2) setSel(m.base.concat(m.hits),null); else draw(); return; }
  if(!drag) return; var d=drag; drag=null; guides=[]; meas=[]; sizeLbl="";
  if(d.crop){ cropUp(d); return; }
  if(d.h!=="pan" && d.moved){ U.push(d.snap); if(U.length>60) U.shift(); Rd=[]; undoBtns(); save(); refreshInsp(); }
  draw();
}
stage.addEventListener("pointerup",endPtr); stage.addEventListener("pointercancel",endPtr);
stage.addEventListener("wheel",function(e){ if(!W) return; e.preventDefault(); if(ui.crop&&!e.ctrlKey){ cropWheel(e); return; } var r=stage.getBoundingClientRect(), mx=e.clientX-r.left-SW/2, my=e.clientY-r.top-SH/2;
  var z0=view.z, z=Math.max(.25,Math.min(8,z0*Math.exp(-e.deltaY*.0015))); view.px=mx-(mx-view.px)*z/z0; view.py=my-(my-view.py)*z/z0; view.z=z; draw(); },{passive:false});
$("#zIn").onclick=function(){ view.z=Math.min(8,view.z*1.25); draw(); };
$("#zOut").onclick=function(){ view.z=Math.max(.25,view.z/1.25); draw(); };
$("#zFit").onclick=function(){ fit(); draw(); };

function select(id){ var L=L_(id); setSel([id]); }

/* ═══════════ группы, выравнивание, буфер обмена ═══════════ */
function newGid(){ return "G"+Date.now().toString(36)+Math.random().toString(36).slice(2,5); }
/* в группе слои лежат подряд: собираем их туда, где был верхний */
function doGroup(){ var Ls=selLs(); if(Ls.length<2) return; remember(); var g=newGid(), top=W.layers.indexOf(Ls[Ls.length-1]);
  var rest=W.layers.filter(function(L){ return Ls.indexOf(L)<0; }), before=W.layers.slice(0,top+1).filter(function(L){ return Ls.indexOf(L)<0; }).length;
  Ls.forEach(function(L){ L.g=g; }); W.layers=rest.slice(0,before).concat(Ls).concat(rest.slice(before)); save(); draw(); refresh(); toast("Слои сгруппированы"); }
function doUngroup(){ var Ls=selLs(), any=false; Ls.forEach(function(L){ if(L.g) any=true; }); if(!any) return; remember(); Ls.forEach(function(L){ delete L.g; }); save(); draw(); refresh(); toast("Группа разобрана"); }
function allGrouped(Ls){ return Ls.length>1&&Ls[0].g&&Ls.every(function(L){ return L.g===Ls[0].g; })&&W.layers.filter(function(x){ return x.g===Ls[0].g; }).length===Ls.length; }
/* выравнивание: несколько слоёв по общей рамке, один слой по холсту */
function doAlign(k){ var Ls=selLs().filter(function(L){ return !L.locked; }); if(!Ls.length) return; remember(); var multi=Ls.length>1, b=multi?selBox(Ls):{ x0:0, y0:0, x1:W.w, y1:W.h, cx:W.w/2, cy:W.h/2 };
  /* группа выравнивается целиком, как один предмет */
  var units={}; Ls.forEach(function(L){ var key=multi&&L.g&&!allGrouped(Ls)?L.g:L.id; (units[key]=units[key]||[]).push(L); });
  if(multi&&allGrouped(Ls)) { b={ x0:0, y0:0, x1:W.w, y1:W.h, cx:W.w/2, cy:W.h/2 }; units={ one:Ls }; }
  Object.keys(units).forEach(function(key){ var u=units[key], a=selBox(u), dx=0, dy=0;
    if(k==="l") dx=b.x0-a.x0; if(k==="c") dx=b.cx-a.cx; if(k==="r") dx=b.x1-a.x1; if(k==="t") dy=b.y0-a.y0; if(k==="m") dy=b.cy-a.cy; if(k==="b") dy=b.y1-a.y1;
    u.forEach(function(L){ L.x=Math.round(L.x+dx); L.y=Math.round(L.y+dy); }); });
  save(); draw(); refreshInsp(); }
/* распределить: одинаковые промежутки между соседями по горизонтали или вертикали */
function doDistribute(axis){ var Ls=selLs().filter(function(L){ return !L.locked; }), units={}; Ls.forEach(function(L){ var key=L.g&&!allGrouped(Ls)?L.g:L.id; (units[key]=units[key]||[]).push(L); });
  var us=Object.keys(units).map(function(k){ return { Ls:units[k], b:selBox(units[k]) }; }); if(us.length<3){ toast("Чтобы распределить, нужно выбрать хотя бы три слоя"); return; } remember();
  var A=axis==="h"?["x0","x1","w"]:["y0","y1","h"]; us.sort(function(p,q){ return p.b[A[0]]-q.b[A[0]]; });
  var span=us[us.length-1].b[A[1]]-us[0].b[A[0]], sum=us.reduce(function(s,u){ return s+u.b[A[2]]; },0), gap=(span-sum)/(us.length-1), pos=us[0].b[A[0]];
  us.forEach(function(u){ var d=pos-u.b[A[0]]; u.Ls.forEach(function(L){ if(axis==="h") L.x=Math.round(L.x+d); else L.y=Math.round(L.y+d); }); pos+=u.b[A[2]]+gap; });
  save(); draw(); refreshInsp(); toast(TR("Промежутки: {0} px",Math.round(gap))); }
/* копия нескольких слоёв: группы получают новые имена, чтобы копия была отдельной группой */
function cloneLayers(Ls,off){ var gm={}; return Ls.map(function(L){ var c=JSON.parse(JSON.stringify(L)); c.id=gid(); if(c.g){ gm[c.g]=gm[c.g]||newGid(); c.g=gm[c.g]; } c.x+=off; c.y+=off; return c; }); }
function dupSel(){ var Ls=selLs(); if(!Ls.length) return; remember(); var cs=cloneLayers(Ls,Math.round(W.w*.03)), at=W.layers.indexOf(Ls[Ls.length-1])+1;
  W.layers.splice.apply(W.layers,[at,0].concat(cs)); setSel(cs.map(function(c){ return c.id; })); save(); refresh(); }
function delSel(){ var ids=selIds(); if(!ids.length) return; remember(); W.layers=W.layers.filter(function(L){ return ids.indexOf(L.id)<0; }); MS=[]; sel=null; save(); draw(); refresh();
  toast(ids.length>1?TR("Удалено слоёв: {0}. Вернуть: стрелка отмены",ids.length):TR("Удалено. Вернуть: стрелка отмены")); if(!wide.matches&&ui.sheet==="insp") closeSheet(); }
/* буфер: слои лежат в памяти страницы, поэтому их можно вставить и в другую работу. В системный буфер кладём только метку,
   чтобы при вставке отличить свои слои от картинки, скопированной в другой программе */
var CLIP=null, CLIP_MARK="";
function layerAssets(L,out){ ["src","mask","fg"].forEach(function(k){ if(L[k]&&W.assets[L[k]]) out[L[k]]=W.assets[L[k]]; }); if(L.tf&&L.tf.src&&W.assets[L.tf.src]) out[L.tf.src]=W.assets[L.tf.src]; return out; }
function copySel(cut){ var Ls=selLs(); if(!Ls.length) return false; var as={}; Ls.forEach(function(L){ layerAssets(L,as); });
  CLIP={ layers:JSON.parse(JSON.stringify(Ls)), assets:as, from:W.id, n:0 }; CLIP_MARK="forge-gfx:"+Date.now().toString(36);
  if(cut) delSel(); toast(cut?TR("Вырезано: {0}",Ls.length):TR("Скопировано: {0}",Ls.length)); return true; }
function pasteClip(){ if(!CLIP||!W) return; remember(); CLIP.n++; for(var a in CLIP.assets) if(!W.assets[a]){ W.assets[a]=CLIP.assets[a]; }
  var off=CLIP.from===W.id?Math.round(W.w*.03)*CLIP.n:0, cs=cloneLayers(CLIP.layers,off); cs.forEach(function(c){ W.layers.push(c); }); setSel(cs.map(function(c){ return c.id; })); save(); refresh(); toast(TR("Вставлено: {0}",cs.length)); }
function edFocus(){ return W&&!$("#ed").hidden&&!$("#modal").classList.contains("on")&&!/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName); }
document.addEventListener("copy",function(e){ if(!edFocus()||!selIds().length) return; if(copySel(false)&&e.clipboardData){ e.clipboardData.setData("text/plain",CLIP_MARK); e.preventDefault(); } });
document.addEventListener("cut",function(e){ if(!edFocus()||!selIds().length) return; if(copySel(true)&&e.clipboardData){ e.clipboardData.setData("text/plain",CLIP_MARK); e.preventDefault(); } });
document.addEventListener("paste",function(e){ if(!edFocus()) return; var cd=e.clipboardData, txt=cd?cd.getData("text/plain"):"", img=null;
  if(cd&&cd.items) [].forEach.call(cd.items,function(it){ if(!img&&it.kind==="file"&&/^image\//.test(it.type)) img=it.getAsFile(); });
  if(CLIP&&txt&&txt===CLIP_MARK){ e.preventDefault(); pasteClip(); return; }
  if(img){ e.preventDefault(); loadPhoto(img,addPhoto); return; }
  if(CLIP){ e.preventDefault(); pasteClip(); } });

/* ═══════════ инструменты с плашки ═══════════ */
function tool(t){
  if(isMulti()){ if(t==="dup") dupSel(); else if(t==="del") delSel(); else if(t==="group") doGroup(); else if(t==="ungroup") doUngroup(); else if(t==="align"||t==="more") openInsp(t==="align"?"align":null); return; }
  var L=curL(); if(!L) return;
  if(t==="up"){ var i=W.layers.indexOf(L); if(i<W.layers.length-1){ remember(); W.layers.splice(i,1); W.layers.splice(i+1,0,L); save(); draw(); refresh(); toast("Слой выше"); } else toast("Это уже верхний слой"); }
  else if(t==="dup") dupSel();
  else if(t==="del") delSel();
  else if(t==="pen"){ if(L.t==="draw"&&!L.locked) startPen(L); }
  else if(t==="crop"){ if(L.t==="image") startCrop(L); }
  else openInsp({ color:"color", font:"font", fx:"fx", filters:"filters", cut:"cut", text:"text", qr:"qr", more:null }[t]);
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
  if(!wide.matches) setTimeout(focusSel,260);
}
function closeSheet(){ if(wide.matches) return; ui.sheet=false; ui.tab=null; right.classList.remove("open","full","peek"); $$("#tabs button").forEach(function(b){ b.classList.remove("on"); });
  if(view.z===1&&view.py){ view.py=0; draw(); } }
/* на телефоне шторка закрывает низ холста: сдвигаем холст так, чтобы выбранный элемент был виден над ней */
function focusSel(){ var L=curL(); if(!L||wide.matches||!right.classList.contains("open")) return;
  var sh=right.getBoundingClientRect(), st=stage.getBoundingClientRect(), visH=sh.top-st.top; if(visH<120) return;
  var c=toScreen(L.x,L.y); if(c.y>40&&c.y<visH-40) return; view.py+=visH/2-c.y; draw(); }
$("#shClose").onclick=closeSheet;
$$("#tabs button").forEach(function(b){ b.onclick=function(){ var t=b.getAttribute("data-tab"); if(ui.pen) endPen(); if(!wide.matches&&ui.sheet==="tab"&&ui.tab===t) closeSheet(); else openTab(t); }; });
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
  box.appendChild(el('<div class="row" style="margin-top:6px"><button class="btn">'+sv("grid")+'Коллаж из нескольких фото</button></div>',function(n){ $("button",n).onclick=collagePick; }));
  if(!touch) box.appendChild(el('<p class="note" style="margin-top:6px">Фото можно просто перетащить в окно.</p>'));
  box.appendChild(el('<div class="sh">Рисунок</div>'));
  box.appendChild(el('<div class="row"><button class="btn">'+sv("pen")+'Рисовать от руки</button></div>',function(n){ $("button",n).onclick=function(){ startPen(null); }; }));
  box.appendChild(el('<div class="sh">QR-код</div>'));
  box.appendChild(el('<div class="chips">'+QR_KINDS.map(function(k){ return '<button data-k="'+k[0]+'">'+esc(k[1])+'</button>'; }).join("")+'</div>',function(n){
    $$("button",n).forEach(function(b){ b.onclick=function(){ var L=qrLayer(W,b.getAttribute("data-k")); remember(); W.layers.push(L); sel=L.id; save(); draw(); if(wide.matches) refresh(); openInsp("qr"); }; }); }));
  box.appendChild(el('<div class="sh">Фигуры</div>'));
  box.appendChild(el('<div class="shapes">'+SHAPES.map(function(s){ return '<button data-s="'+s[0]+'" title="'+esc(s[1])+'">'+shapeIcon(s[0])+'</button>'; }).join("")+'</div>',function(n){
    $$("button",n).forEach(function(b){ b.onclick=function(){ addLayer(shapeLayer(W,b.getAttribute("data-s"))); }; }); }));
  box.appendChild(el('<div class="sh">Иконки</div>'));
  box.appendChild(el('<div class="icg">'+ICON_LIST.map(function(k){ return '<button data-i="'+k+'" title="'+esc(ICON_NAMES[k]||k)+'">'+icon(k,"")+'</button>'; }).join("")+'</div>',function(n){
    $$("button",n).forEach(function(b){ b.onclick=function(){ addLayer(iconLayer(W,b.getAttribute("data-i"))); }; }); }));
}
var SHI={};
function shapeIcon(k){ if(!SHI[k]){ var c=document.createElement("canvas"); c.width=c.height=72; var x=c.getContext("2d"), ln=isLine(k), w=ln?58:k==="bolt"?36:56, h=ln?(k==="line"?7:5):k==="arrow"||k==="arrow2"?30:k==="bubble"||k==="bubbleo"||k==="cloud"?44:52;
    x.translate(36,36); shapePath(x,k==="line"?"round":k,w,h,k==="rect"?4:0); if(ln){ x.fillStyle="#c9d2da"; x.fill(); } else { x.lineWidth=4.5; x.lineJoin="round"; x.strokeStyle="#c9d2da"; x.stroke(); } SHI[k]=c.toDataURL(); }
  return '<img src="'+SHI[k]+'" alt="" class="shi">'; }
function addPhoto(a){ var L=imageLayer(W,a.id,a.w,a.h); addLayer(L); }

/* ── слои ── */
function layerName(L){ if(L.t==="draw") return TR("Рисунок"); if(L.t==="qr") return "QR: "+TR((QR_KINDS.filter(function(k){ return k[0]===L.kind; })[0]||["","код"])[1]).toLowerCase(); if(L.t==="text") return String(L.text).split("\n")[0].slice(0,30)||TR("Текст"); if(L.t==="image") return TR("Фото"); if(L.t==="icon") return TR("Иконка: {0}",TR(ICON_NAMES[L.name]||L.name));
  return TR((SHAPES.filter(function(s){ return s[0]===L.kind; })[0]||["","фигура"])[1]).replace(/^./,function(c){ return c.toUpperCase(); }); }
function paneLayers(box){
  if(!W.layers.length){ box.innerHTML='<p class="note">На холсте пока пусто. Нажмите «Добавить».</p>'; return; }
  var ids=selIds(), prevG=null;
  if(touch) box.appendChild(el('<label class="tg" style="margin-bottom:8px"><span>'+esc(TR("Выбирать несколько"))+'</span><input type="checkbox"'+(ui.lmulti?" checked":"")+'></label>',function(n){ $("input",n).onchange=function(){ ui.lmulti=this.checked; }; }));
  W.layers.slice().reverse().forEach(function(L,i,arr){
    var th=L.t==="qr"?sv("qr"):L.t==="draw"?sv("pen"):L.t==="text"?'<span style="font-family:'+esc(fontStack(L.font))+'">Аа</span>':L.t==="image"?'':L.t==="icon"?icon(L.name,""):shapeIcon(L.kind);
    if(L.g&&L.g!==prevG){ var gl=W.layers.filter(function(x){ return x.g===L.g; }), gon=gl.every(function(x){ return ids.indexOf(x.id)>=0; });
      box.appendChild(el('<div class="lgrp'+(gon?" on":"")+'"><button class="nm">'+sv("group")+'<span>'+esc(TR("Группа"))+'</span><small>'+gl.length+'</small></button><button class="sb" title="'+esc(TR("Разгруппировать"))+'">'+sv("ungroup")+'</button></div>',function(n){
        $(".nm",n).onclick=function(){ setSel(gl.map(function(x){ return x.id; })); if(!wide.matches) openInsp(); };
        $(".sb",n).onclick=function(){ remember(); gl.forEach(function(x){ delete x.g; }); save(); draw(); refresh(); }; })); }
    prevG=L.g||null;
    var r=el('<div class="lrow'+(ids.indexOf(L.id)>=0?" on":"")+(L.hidden?" off":"")+(L.g?" ing":"")+'"><span class="lt"'+(L.t==="image"&&W.assets[L.src]?' style="background-image:url('+W.assets[L.src]+')"':'')+'>'+th+'</span>'+
      '<button class="nm" data-nt>'+esc(layerName(L))+'</button><button class="sb" data-a="up" title="Выше">'+sv("up")+'</button><button class="sb" data-a="down" title="Ниже">'+sv("down")+'</button>'+
      '<button class="sb" data-a="hide" title="Скрыть или показать">'+sv("eye")+'</button><button class="sb'+(L.locked?" act":"")+'" data-a="lock" title="Замок: нельзя случайно сдвинуть">'+sv(L.locked?"lock":"unlock")+'</button></div>');
    /* в списке слой выбирается сам по себе, даже если он в группе. Shift или Ctrl добавляют к выделению */
    function pick(e){ var add=e.shiftKey||e.ctrlKey||e.metaKey||ui.lmulti; if(add){ var cur=selIds(); setSel(cur.indexOf(L.id)>=0?cur.filter(function(x){ return x!==L.id; }):cur.concat([L.id]),L.id); } else { setSel([L.id]); if(!wide.matches) openInsp(); } }
    $(".nm",r).onclick=pick; $(".lt",r).onclick=pick;
    $$(".sb",r).forEach(function(b){ b.onclick=function(){ var a=b.getAttribute("data-a"), i2=W.layers.indexOf(L); remember();
      if(a==="up"&&i2<W.layers.length-1){ W.layers.splice(i2,1); W.layers.splice(i2+1,0,L); }
      if(a==="down"&&i2>0){ W.layers.splice(i2,1); W.layers.splice(i2-1,0,L); }
      if(a==="hide") L.hidden=!L.hidden; if(a==="lock") L.locked=!L.locked;
      save(); draw(); refresh(); }; });
    box.appendChild(r);
  });
  box.appendChild(el('<p class="note" style="margin-top:10px">Сверху списка то, что лежит сверху на холсте. Замок не даёт случайно сдвинуть слой, например фон.</p>'));
  box.appendChild(el('<p class="note" style="margin-top:6px">'+esc(TR(touch?"Чтобы выбрать несколько слоёв, включите «Выбирать несколько» и нажимайте на них. Потом их можно сгруппировать и выровнять.":"Несколько слоёв выбираются с Shift или Ctrl. Ctrl+G собирает их в группу, Ctrl+Shift+G разбирает."))+'</p>'));
}
/* ── холст ── */
function paneCanvas(box){
  box.appendChild(el('<div class="sh">'+esc(TR("Размер: {0}",W.w+" x "+W.h))+'</div>'));
  box.appendChild(el('<div class="chips">'+GSIZES.map(function(s){ return '<button data-s="'+s.id+'" class="'+(W.size===s.id?"on":"")+'">'+esc(s.name)+'</button>'; }).join("")+'</div>',function(n){
    $$("button",n).forEach(function(b){ b.onclick=function(){ var s=GSIZES.filter(function(x){ return x.id===b.getAttribute("data-s"); })[0]; resizeWork(s.w,s.h,s.id,!!s.round); }; }); }));
  box.appendChild(el('<div class="two" style="margin-top:10px"><div class="f"><label>Ширина</label><input type="number" id="cW" value="'+W.w+'"></div><div class="f"><label>Высота</label><input type="number" id="cH" value="'+W.h+'"></div></div>',function(n){
    $$("input",n).forEach(function(i){ i.onchange=function(){ var w=Math.max(16,Math.min(8000,+$("#cW").value||W.w)), h=Math.max(16,Math.min(8000,+$("#cH").value||W.h)); resizeWork(w,h,"own",false); }; }); }));
  box.appendChild(el('<p class="note">При смене размера всё на холсте подстраивается пропорционально.</p>'));
  box.appendChild(el('<div class="sh">Фон</div>'));
  var B=W.bg;
  box.appendChild(choice("",[["color","цвет"],["grad","градиент"],["fony","узор"],["none","прозрачный"]],B.t,function(v){ remember();
    if(v==="fony"&&!B.fb){ if(!window.FONY){ toast("Мастерская фонов не загрузилась"); return; } B.fb=FONY.fromTpl("sunset"); }
    B.t=v; draw(); save(); refreshPane(); }));
  if(B.t==="color") box.appendChild(colorPick("Цвет",B.c1,function(v,live){ if(!live) remember(); B.c1=v; draw(); save(); }));
  if(B.t==="grad") bgGrad(box,B);
  if(B.t==="fony") bgFony(box,B);
  box.appendChild(el('<div class="sh">Фото фоном</div>'));
  box.appendChild(el('<div class="row"><button class="btn" data-k="0">'+sv("img")+esc(TR("Фото на весь холст"))+'</button><button class="btn" data-k="1">'+sv("img")+esc(TR("Размытое фото"))+'</button></div>',function(n){ $$("button",n).forEach(function(b){ b.onclick=function(){ var soft=b.getAttribute("data-k")==="1"; pickPhoto(false,function(a){
    var L=imageLayer(W,a.id,a.w,a.h); L.w=W.w; L.h=W.h; L.locked=true; if(soft){ L.f.blur=12; L.f.br=-12; L.zoom=1.08; } remember(); W.layers.unshift(L); setSel([L.id]); save(); draw(); refresh(); toast(soft?"Размытое фото легло фоном и закреплено замком":"Фото легло фоном и закреплено замком"); }); }; }); }));
  box.appendChild(el('<p class="note" style="margin-top:6px">Размытое фото хорошо подходит под текст и под вырезанный предмет: фон не спорит с главным.</p>'));
}
var GPRE=[["#ff6a3d","#ff3d7f",""],["#0fb5ae","#2d7ff9",""],["#7b5cff","#ff5fa2","#ffc15e"],["#141e30","#243b55",""],["#f9c6c9","#a9d3f0",""],["#ff9a4d","#ffd166","#4fd6c8"],["#0b0f1a","#3b82f6","#a78bfa"],["#2f6b3f","#9cc76b","#e8d38a"]];
function bgGrad(box,B){
  box.appendChild(el('<div class="gpre"></div>',function(n){ GPRE.forEach(function(q){ n.appendChild(el('<button style="background:linear-gradient(135deg,'+q[0]+','+(q[2]?q[1]+','+q[2]:q[1])+')"></button>',function(b){ b.onclick=function(){ remember(); B.c1=q[0]; B.c2=q[1]; B.c3=q[2]; draw(); save(); refreshPane(); }; })); }); }));
  box.appendChild(colorPick("Первый цвет",B.c1,function(v,live){ if(!live) remember(); B.c1=v; draw(); save(); }));
  box.appendChild(colorPick(B.c3?"Второй цвет (середина)":"Второй цвет",B.c2,function(v,live){ if(!live) remember(); B.c2=v; draw(); save(); }));
  box.appendChild(toggle("Третий цвет",!!B.c3,function(v){ remember(); B.c3=v?"#ffc15e":""; draw(); save(); refreshPane(); }));
  if(B.c3) box.appendChild(colorPick("Третий цвет",B.c3,function(v,live){ if(!live) remember(); B.c3=v; draw(); save(); }));
  box.appendChild(choice("Вид",[["lin","линейный"],["rad","из центра"]],B.gt||"lin",function(v){ remember(); B.gt=v; draw(); save(); refreshPane(); }));
  if(B.gt!=="rad") box.appendChild(range("Направление",B.ang||0,0,360,15,"°",function(v){ remember("ang"); B.ang=v; draw(); save(); }));
}
/* узоры из мастерской фонов: шаблоны, свои сохранённые фоны, палитры, «перемешать» и настройки вида */
var FTH={};
function fonyThumb(b,w,h){ var key=JSON.stringify(b)+w+"x"+h; if(!FTH[key]){ var c=JSON.parse(JSON.stringify(b)); c.fmt="wide"; c.anim=false; FTH[key]="data:image/svg+xml;charset=utf-8,"+encodeURIComponent(FONY.svg(c,w,h,{ id:"t"+Object.keys(FTH).length+"_" })); } return FTH[key]; }
function fonyDbAll(){ return new Promise(function(res){ try{ var r=indexedDB.open("forge-fony",1); r.onupgradeneeded=function(){ r.result.createObjectStore("bgs",{keyPath:"id"}); };
  r.onsuccess=function(){ try{ var q=r.result.transaction("bgs").objectStore("bgs").getAll(); q.onsuccess=function(){ res(q.result||[]); }; q.onerror=function(){ res([]); }; }catch(e){ res([]); } }; r.onerror=function(){ res([]); }; }catch(e){ res([]); } }); }
function bgFony(box,B){ if(!window.FONY){ box.appendChild(el('<p class="note">Мастерская фонов не загрузилась.</p>')); return; }
  var tw=120, th=Math.max(40,Math.round(120*W.h/W.w)); if(th>150){ th=150; tw=Math.round(150*W.w/W.h); }
  function setFb(nb){ remember(); var keepG=B.fb?B.fb.grain:null; B.fb=nb; draw(); save(); refreshPane(); }
  var my=el('<div class="ftl"></div>'); box.appendChild(el('<label class="olab">'+esc(TR("Мои фоны"))+'</label>')); box.appendChild(my);
  fonyDbAll().then(function(list){ list.sort(function(a,b){ return (b.updated||0)-(a.updated||0); }); if(!list.length){ my.previousSibling.remove(); my.remove(); return; }
    list.slice(0,8).forEach(function(f){ var nb=JSON.parse(JSON.stringify(f)); ["id","title","updated"].forEach(function(k){ delete nb[k]; }); nb=FONY.fixBg(nb);
      my.appendChild(el('<button title="'+esc(f.title||"")+'"><img alt="" src="'+fonyThumb(nb,tw,th)+'"></button>',function(b){ b.onclick=function(){ setFb(nb); }; })); }); });
  box.appendChild(el('<label class="olab">'+esc(TR("Шаблоны"))+'</label>'));
  box.appendChild(el('<div class="ftl"></div>',function(n){ FONY.TPLS.forEach(function(t){ var nb=FONY.fromTpl(t.id); delete nb.title;
    n.appendChild(el('<button title="'+esc(TR(t.name))+'"><img alt="" src="'+fonyThumb(nb,tw,th)+'"></button>',function(b){ b.onclick=function(){ setFb(nb); }; })); }); }));
  var fb=B.fb, K=FONY.KINDS[fb.kind];
  box.appendChild(el('<div class="row" style="margin:8px 0"><button class="btn" data-a="mix">'+sv("wand")+esc(TR("Перемешать"))+'</button><button class="btn" data-a="pal">'+esc(TR("Случайные цвета"))+'</button></div>',function(n){
    $("[data-a=mix]",n).onclick=function(){ remember(); fb.seed=Math.floor(Math.random()*1e6); draw(); save(); };
    $("[data-a=pal]",n).onclick=function(){ remember(); fb.pal=FONY.randomPal(); draw(); save(); refreshPane(); }; }));
  box.appendChild(el('<div class="fpal"></div>',function(n){ FONY.PALS.forEach(function(pp){ n.appendChild(el('<button title="'+esc(TR(pp[0]))+'">'+pp[1].map(function(c){ return '<i style="background:'+c+'"></i>'; }).join("")+'</button>',function(b){ b.onclick=function(){ remember(); fb.pal=pp[1].slice(); draw(); save(); refreshPane(); }; })); }); }));
  box.appendChild(el('<div class="f"><label>'+esc(TR("Свои цвета"))+'</label><div class="fcol"></div></div>',function(n){ fb.pal.forEach(function(c,i){ n.querySelector(".fcol").appendChild(el('<label style="background:'+c+'"><input type="color" value="'+c+'"></label>',function(lb){ var inp=$("input",lb), first=true;
    inp.oninput=function(){ if(first){ remember(); first=false; } fb.pal[i]=inp.value; lb.style.background=inp.value; draw(); }; inp.onchange=function(){ first=true; save(); }; })); }); }));
  (K.params||[]).forEach(function(q){ box.appendChild(range(q.label,fb.p[q.id],q.min,q.max,q.step||1,"",function(v){ remember("fp"+q.id); fb.p[q.id]=v; if(fb.kind==="waves"||fb.kind==="blobs") fb.pts=null; FONY.fixBg(fb); draw(); },function(){ save(); })); });
  box.appendChild(range("Зерно",fb.grain||0,0,60,1,"",function(v){ remember("fgr"); fb.grain=v; draw(); },function(){ save(); }));
  box.appendChild(el('<p class="note">'+esc(TR("Свои фоны с точной настройкой пятен и линий делаются в мастерской фонов и сами появляются здесь, в «Моих фонах»."))+'</p>'));
  box.appendChild(el('<a class="btn w" href="../fony/" style="justify-content:center">'+esc(TR("Открыть мастерскую фонов"))+'</a>'));
}
function resizeWork(w,h,id,round){
  remember(); var kx=w/W.w, ky=h/W.h, k=Math.min(kx,ky);
  W.layers.forEach(function(L){ L.x=Math.round(L.x*kx); L.y=Math.round(L.y*ky);
    if(L.t==="text") L.size=Math.max(6,Math.round(L.size*k)); else if(L.t==="image"&&L.w===W.w&&L.h===W.h){ L.w=w; L.h=h; } else { L.w=Math.round(L.w*k); L.h=Math.round(L.h*k); }
    if(L.sh){ ["b","x","y"].forEach(function(q){ if(L.sh[q]) L.sh[q]=Math.round(L.sh[q]*k); }); } if(L.out&&L.out.w) L.out.w=Math.max(1,Math.round(L.out.w*k)); if(L.t==="shape"&&L.sw) L.sw=Math.max(1,Math.round(L.sw*k)); });
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
    else if(a==="copy"){ var c2=JSON.parse(JSON.stringify(W)); c2.id=newId(); c2.title=TR("{0} (копия)",W.title); dbPut(c2).then(function(){ openWork(c2); toast("Открыта копия"); }); }
    else if(a==="del") ask(TR("Удалить работу «{0}»? Вернуть её не получится.",W.title),TR("Удалить")).then(function(y){ if(y) dbDel(W.id).then(function(){ W=null; showHome(); }); });
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
  return el('<div class="f">'+(label?'<label>'+esc(label)+'</label>':'')+'<div class="sws">'+PAL.concat(rec).map(sw).join("")+'<button class="pip" data-pip title="Пипетка: взять цвет с холста">'+sv("pip")+'</button><label class="any" title="Любой цвет"><input type="color" value="'+(/^#[0-9a-f]{6}$/i.test(cur)?cur:"#ff8a4c")+'"></label></div></div>',function(n){
    $$("button[data-c]",n).forEach(function(b){ b.onclick=function(){ $$("button",n).forEach(function(x){ x.classList.toggle("on",x===b); }); fn(b.getAttribute("data-c"),false); }; });
    $("[data-pip]",n).onclick=function(){ pickColor(function(c){ addRecent(c); fn(c,false); }); };
    var i=$("input",n), first=true; i.oninput=function(){ fn(i.value,!first); first=false; }; i.onchange=function(){ addRecent(i.value); first=true; }; }); }
function addRecent(c){ ui.recent=[c].concat(ui.recent.filter(function(x){ return x!==c; })).slice(0,8); try{ localStorage.setItem("forge_recent_colors",JSON.stringify(ui.recent)); }catch(e){} }
function set(L,k,v,key){ remember(key===false?"":(key||L.id+k)); L[k]=v; draw(); save(); }
function refreshInsp(){
  if(!wide.matches && ui.sheet!=="insp") return;
  var sc=insp.scrollTop; insp.innerHTML=""; var L=curL();
  if(isMulti()){ inspMulti(); insp.scrollTop=sc; return; }
  if(!L){ $("#shTitle").textContent="Настройки"; insp.innerHTML='<p class="note" style="margin-top:8px">Нажмите на элемент на холсте: его можно двигать, менять размер за уголки и поворачивать за кружок сверху. Здесь появятся точные настройки.</p><p class="note" style="margin-top:10px">Двойное нажатие на надпись открывает её текст, на фото включает обрезку. Колесо мыши или два пальца приближают холст.</p>'+
    (touch?'':'<p class="note" style="margin-top:10px">'+esc(TR("Несколько слоёв: обведите их рамкой мышкой или нажимайте с Shift. Ctrl+G собирает их в группу, Ctrl+C и Ctrl+V копируют, в том числе в другую работу."))+'</p>')+
    (CLIP?'<div class="row" style="margin-top:10px"><button class="btn" id="iPaste">'+sv("paste")+esc(TR("Вставить"))+'</button></div>':''); var ip=$("#iPaste",insp); if(ip) ip.onclick=pasteClip; return; }
  $("#shTitle").textContent=layerName(L);
  insp.appendChild(el('<div class="acts4"><button data-a="up">'+sv("up")+'выше</button><button data-a="down">'+sv("down")+'ниже</button><button data-a="dup">'+sv("dup")+'копия</button><button data-a="lock" class="'+(L.locked?"on":"")+'">'+sv("lock")+'замок</button><button data-a="del">'+sv("del")+'удалить</button></div>',function(n){
    $$("button",n).forEach(function(b){ b.onclick=function(){ var a=b.getAttribute("data-a"), i=W.layers.indexOf(L);
      if(a==="down"){ if(i>0){ remember(); W.layers.splice(i,1); W.layers.splice(i-1,0,L); save(); draw(); refresh(); } }
      else if(a==="lock"){ remember(); L.locked=!L.locked; save(); draw(); refresh(); } else tool(a); }; }); }));
  if(L.t==="text") inspText(L); else if(L.t==="image") inspImage(L); else if(L.t==="shape") inspShape(L); else if(L.t==="qr") inspQR(L); else if(L.t==="draw") inspDraw(L); else inspIcon(L);
  inspShadow(L);
  var c=sec("Общее"); c.setAttribute("data-sec","common"); insp.appendChild(c);
  c.appendChild(range("Прозрачность",Math.round((L.op==null?1:L.op)*100),0,100,5,"%",function(v){ set(L,"op",v/100); }));
  c.appendChild(range("Поворот",Math.round(L.rot||0),-180,180,1,"°",function(v){ set(L,"rot",v); }));
  c.appendChild(el('<div class="f"><label>Наложение</label><select>'+BLENDS.map(function(b){ return '<option value="'+b[0]+'"'+(b[0]===L.blend?" selected":"")+'>'+b[1]+'</option>'; }).join("")+'</select></div>',function(n){ $("select",n).onchange=function(){ set(L,"blend",this.value,false); }; }));
  var s=layerSize(L);
  c.appendChild(el('<div class="nums" style="grid-template-columns:1fr 1fr"><label><em>X</em><input type="number" data-k="x" value="'+Math.round(L.x)+'"></label><label><em>Y</em><input type="number" data-k="y" value="'+Math.round(L.y)+'"></label>'+
    (L.t!=="text"?'<label><em>Ш</em><input type="number" data-k="w" value="'+Math.round(s.w)+'"></label><label><em>В</em><input type="number" data-k="h" value="'+Math.round(s.h)+'"></label>':'')+'</div>',function(n){
    $$("input",n).forEach(function(i){ i.onchange=function(){ var v=Number(i.value); if(!isNaN(v)) set(L,i.getAttribute("data-k"),v,false); }; }); }));
  if(L.t!=="text"&&L.t!=="qr") c.appendChild(el('<div class="row" style="margin-top:8px"><button class="btn'+(L.flipX?" on":"")+'" data-f="flipX">'+sv("flipx")+'Отразить ↔</button><button class="btn'+(L.flipY?" on":"")+'" data-f="flipY">'+sv("flipy")+'Отразить ↕</button></div>',function(n){
    $$("button",n).forEach(function(b){ b.onclick=function(){ var q=b.getAttribute("data-f"); remember(); L[q]=!L[q]; draw(); save(); refreshInsp(); }; }); }));
  c.appendChild(alignRow(false));
  c.appendChild(el('<div class="row" style="margin-top:8px"><button class="btn" data-a="c">'+sv("dup")+esc(TR("Копировать"))+'</button><button class="btn" data-a="v"'+(CLIP?'':' disabled')+'>'+sv("paste")+esc(TR("Вставить"))+'</button></div>',function(n){
    $("[data-a=c]",n).onclick=function(){ copySel(false); refreshInsp(); }; $("[data-a=v]",n).onclick=pasteClip; }));
  insp.scrollTop=sc;
}
/* выравнивание: один слой по холсту, несколько по общей рамке */
function alignRow(multi){ var w=el('<div class="f" data-sec="align"><label>'+esc(TR(multi?"Выровнять между собой":"Выровнять по холсту"))+'</label><div class="aln"></div></div>');
  [["l","all","по левому краю"],["c","alc","по центру"],["r","alr","по правому краю"],["t","alt","по верху"],["m","alm","по середине"],["b","alb","по низу"]].forEach(function(a){
    $(".aln",w).appendChild(el('<button title="'+esc(TR(a[2]))+'">'+sv(a[1])+'</button>',function(b){ b.onclick=function(){ doAlign(a[0]); }; })); }); return w; }
function inspMulti(){ var Ls=selLs(), grp=allGrouped(Ls), lock=Ls.every(function(L){ return L.locked; });
  $("#shTitle").textContent=grp?TR("Группа"):TR("Выбрано: {0}",Ls.length);
  insp.appendChild(el('<div class="acts4"><button data-a="grp">'+sv(grp?"ungroup":"group")+esc(TR(grp?"разобрать":"группа"))+'</button><button data-a="dup">'+sv("dup")+esc(TR("копия"))+'</button><button data-a="copy">'+sv("paste")+esc(TR("в буфер"))+'</button><button data-a="lock" class="'+(lock?"on":"")+'">'+sv("lock")+esc(TR("замок"))+'</button><button data-a="del">'+sv("del")+esc(TR("удалить"))+'</button></div>',function(n){
    $$("button",n).forEach(function(b){ b.onclick=function(){ var a=b.getAttribute("data-a");
      if(a==="grp"){ if(grp) doUngroup(); else doGroup(); } else if(a==="dup") dupSel(); else if(a==="copy") copySel(false); else if(a==="del") delSel();
      else if(a==="lock"){ remember(); Ls.forEach(function(L){ L.locked=!lock; }); save(); draw(); refresh(); } }; }); }));
  var s=sec("Расположение"); s.setAttribute("data-sec","align"); insp.appendChild(s);
  s.appendChild(alignRow(!grp));
  if(grp) s.appendChild(el('<p class="note" style="margin:-4px 0 10px">'+esc(TR("Группа выравнивается по холсту целиком. Чтобы выровнять слои внутри неё, выберите их в списке слоёв."))+'</p>'));
  else { s.appendChild(el('<div class="f"><label>'+esc(TR("Одинаковые промежутки"))+'</label><div class="aln"><button data-d="h" title="'+esc(TR("по горизонтали"))+'">'+sv("dsh")+'</button><button data-d="v" title="'+esc(TR("по вертикали"))+'">'+sv("dsv")+'</button></div></div>',function(n){
      $$("button",n).forEach(function(b){ b.onclick=function(){ doDistribute(b.getAttribute("data-d")); }; }); }));
    s.appendChild(el('<div class="row" style="margin-top:4px"><button class="btn">'+esc(TR("Всё вместе по центру холста"))+'</button></div>',function(n){ $("button",n).onclick=function(){ var b=selBox(Ls); remember(); Ls.forEach(function(L){ if(!L.locked){ L.x=Math.round(L.x+W.w/2-b.cx); L.y=Math.round(L.y+W.h/2-b.cy); } }); save(); draw(); }; })); }
  var c=sec("Общее"); insp.appendChild(c); var op=Math.round((Ls[0].op==null?1:Ls[0].op)*100);
  c.appendChild(range("Прозрачность",op,0,100,5,"%",function(v){ remember("mop"); Ls.forEach(function(L){ L.op=v/100; }); draw(); save(); }));
  var b=selBox(Ls); c.appendChild(el('<p class="note">'+esc(TR("Общая рамка: {0} x {1} px. Тяните за уголки, чтобы изменить размер всего сразу, за кружок сверху, чтобы повернуть.",Math.round(b.w),Math.round(b.h)))+'</p>'));
  c.appendChild(el('<div class="lmini"></div>',function(n){ Ls.slice().reverse().forEach(function(L){ n.appendChild(el('<button data-nt></button>',function(x){ x.textContent=layerName(L); x.onclick=function(){ setSel([L.id]); }; })); }); }));
}
/* тень: одна на весь слой, у любого слоя */
function inspShadow(L){ var s=sec("Тень"); s.setAttribute("data-sec","shadow"); insp.appendChild(s); var k=Math.min(W.w,W.h), S=L.sh;
  s.appendChild(toggle("Тень под слоем",!!(S&&S.on),function(v){ remember(); if(v){ L.sh=L.sh||{ c:"#000000", a:50, b:Math.round(k*.03), x:0, y:Math.round(k*.015) }; L.sh.on=true; } else if(L.sh) L.sh.on=false; draw(); save(); refreshInsp(); }));
  if(!S||!S.on) return;
  s.appendChild(colorPick("",S.c,function(v,live){ remember(live?"shc"+L.id:""); S.c=v; draw(); save(); }));
  [["a","Плотность",0,100,"%"],["b","Размытие",0,Math.round(k*.12),"px"],["x","Сдвиг ↔",-Math.round(k*.08),Math.round(k*.08),"px"],["y","Сдвиг ↕",-Math.round(k*.08),Math.round(k*.08),"px"]].forEach(function(q){
    s.appendChild(range(q[1],S[q[0]]||0,q[2],q[3],1,q[4],function(v){ remember("sh"+q[0]+L.id); S[q[0]]=v; draw(); },function(){ save(); })); });
}
/* рисунок от руки */
function inkColor(L){ for(var i=0;i<L.strokes.length;i++) if(L.strokes[i].k!=="erase") return L.strokes[i].c; return "#ffffff"; }
function inspDraw(L){ var s=sec("Рисунок"); s.setAttribute("data-sec","color"); insp.appendChild(s);
  s.appendChild(el('<div class="row"><button class="btn">'+sv("pen")+'Дорисовать</button></div>',function(n){ $("button",n).onclick=function(){ if(L.locked){ toast("Слой под замком"); return; } startPen(L); }; }));
  s.appendChild(colorPick("Цвет всех линий",inkColor(L),function(v,live){ remember(live?"ink"+L.id:""); L.strokes.forEach(function(S){ if(S.k!=="erase") S.c=v; }); draw(); save(); }));
  s.appendChild(el('<div class="row" style="margin-top:4px"><button class="btn" data-k="0.8">Тоньше</button><button class="btn" data-k="1.25">Толще</button></div>',function(n){
    $$("button",n).forEach(function(b){ b.onclick=function(){ var q=+b.getAttribute("data-k"); remember(); L.strokes.forEach(function(S){ S.s=Math.max(.5,Math.round(S.s*q*10)/10); }); draw(); save(); }; }); }));
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
  fs.appendChild(el('<div class="sh" style="margin-top:14px">По дуге</div>'));
  fs.appendChild(choice("",[["0","прямо"],["40","дуга вверх"],["-40","дуга вниз"],["100","по кругу"]],String(L.arc||0),function(v){ remember(); L.arc=Number(v); draw(); save(); refreshInsp(); }));
  fs.appendChild(range("Изгиб",L.arc||0,-100,100,1,"",function(v){ set(L,"arc",v); }));
  if(L.arc) fs.appendChild(el('<p class="note">По дуге текст идёт одной строкой. Для круглого штампа сделайте две надписи: одну дугой вверх, другую дугой вниз.</p>'));
  var cs=sec("Цвет"); cs.setAttribute("data-sec","color"); insp.appendChild(cs); var TF=L.tf||{};
  cs.appendChild(choice("",[["color","цвет"],["grad","градиент"],["img","фото в буквах"]],TF.t||"color",function(v){ remember();
    if(v==="color") delete L.tf; else if(v==="grad") L.tf={ t:"grad", c1:L.color==="#ffffff"?"#ffd166":L.color, c2:"#ff5fa2", c3:"", ang:90 };
    else { if(TF.t==="img"&&TF.src){ L.tf=TF; } else { pickPhoto(false,function(a){ remember(); L.tf={ t:"img", src:a.id, z:1, px:50, py:50 }; if(L.weight<700&&FONTS[L.font].w.indexOf("800")>=0) L.weight=800; draw(); save(); refreshInsp(); }); return; } }
    draw(); save(); refreshInsp(); }));
  if(!TF.t) cs.appendChild(colorPick("",L.color,function(v,live){ set(L,"color",v,live?undefined:false); draw(); }));
  else if(TF.t==="grad"){
    cs.appendChild(el('<div class="gpre"></div>',function(n){ GPRE.forEach(function(q){ n.appendChild(el('<button style="background:linear-gradient(90deg,'+q[0]+','+(q[2]?q[1]+','+q[2]:q[1])+')"></button>',function(b){ b.onclick=function(){ remember(); TF.c1=q[0]; TF.c2=q[1]; TF.c3=q[2]; draw(); save(); refreshInsp(); }; })); }); }));
    cs.appendChild(colorPick("Первый цвет",TF.c1,function(v,live){ remember(live?"tf1"+L.id:""); TF.c1=v; draw(); save(); }));
    cs.appendChild(colorPick("Второй цвет",TF.c2,function(v,live){ remember(live?"tf2"+L.id:""); TF.c2=v; draw(); save(); }));
    cs.appendChild(toggle("Третий цвет",!!TF.c3,function(v){ remember(); TF.c3=v?"#ffc15e":""; draw(); save(); refreshInsp(); }));
    if(TF.c3) cs.appendChild(colorPick("Третий цвет",TF.c3,function(v,live){ remember(live?"tf3"+L.id:""); TF.c3=v; draw(); save(); }));
    if(!L.arc) cs.appendChild(range("Направление",TF.ang==null?90:TF.ang,0,360,15,"°",function(v){ remember("tfa"+L.id); TF.ang=v; draw(); },function(){ save(); }));
    else cs.appendChild(el('<p class="note">По дуге градиент идёт вдоль надписи, от первой буквы к последней.</p>')); }
  else {
    cs.appendChild(el('<div class="row"><button class="btn">'+sv("img")+esc(TR("Другое фото"))+'</button></div>',function(n){ $("button",n).onclick=function(){ pickPhoto(false,function(a){ remember(); TF.src=a.id; draw(); save(); refreshInsp(); }); }; }));
    cs.appendChild(range("Приблизить фото",Math.round((TF.z||1)*100),100,400,5,"%",function(v){ remember("tfz"+L.id); TF.z=v/100; draw(); },function(){ save(); }));
    cs.appendChild(range("Сдвиг фото ↔",TF.px==null?50:TF.px,0,100,1,"%",function(v){ remember("tfx"+L.id); TF.px=v; draw(); },function(){ save(); }));
    cs.appendChild(range("Сдвиг фото ↕",TF.py==null?50:TF.py,0,100,1,"%",function(v){ remember("tfy"+L.id); TF.py=v; draw(); },function(){ save(); }));
    cs.appendChild(el('<p class="note">Фото внутри букв лучше всего видно на крупном жирном шрифте. Если букв не видно на фоне, включите обводку или тень в эффектах.</p>')); }
  var fx=sec("Эффекты"); fx.setAttribute("data-sec","fx"); insp.appendChild(fx);
  var FX=[["none","нет",'color:#fff'],["stroke","обводка",'color:transparent;-webkit-text-stroke:1.5px #ff8a4c'],["shadow","тень",'color:#fff;text-shadow:3px 3px 0 #ff5fa2'],["glow","свечение",'color:#fff;text-shadow:0 0 8px #ff8a4c,0 0 16px #ff8a4c']];
  fx.appendChild(el('<div class="fxs">'+FX.map(function(f){ return '<button data-f="'+f[0]+'" class="'+(L.fx.t===f[0]?"on":"")+'"><b style="'+f[2]+'">Аа</b><small>'+f[1]+'</small></button>'; }).join("")+'</div>',function(n){
    $$("button",n).forEach(function(b){ b.onclick=function(){ remember(); L.fx.t=b.getAttribute("data-f"); if(L.fx.t==="stroke"&&L.fx.c===L.color) L.fx.c="#000000"; draw(); save(); refreshInsp(); }; }); }));
  if(L.fx.t!=="none"){
    fx.appendChild(colorPick("Цвет эффекта",L.fx.c,function(v,live){ remember(live?"fxc"+L.id:""); L.fx.c=v; draw(); save(); }));
    fx.appendChild(range("Сила",L.fx.a,0,100,1,"%",function(v){ remember("fxa"+L.id); L.fx.a=v; draw(); save(); }));
  }
  var pl=sec("Плашка"); insp.appendChild(pl); var PLt=L.plate;
  pl.appendChild(toggle("Плашка под текстом",!!(PLt&&PLt.on),function(v){ remember(); if(v){ L.plate=L.plate||{ c:L.color==="#111317"||L.color==="#000000"?"#ffffff":"#111317", a:100, p:35, r:30 }; L.plate.on=true; } else if(L.plate) L.plate.on=false; draw(); save(); refreshInsp(); }));
  if(PLt&&PLt.on){ if(L.arc) pl.appendChild(el('<p class="note">У текста по дуге плашки нет.</p>'));
    pl.appendChild(colorPick("",PLt.c,function(v,live){ remember(live?"plc"+L.id:""); PLt.c=v; draw(); save(); }));
    [["a","Плотность",10,100,"%"],["p","Поля",0,120,""],["r","Скругление",0,100,"%"]].forEach(function(q){ pl.appendChild(range(q[1],PLt[q[0]]==null?30:PLt[q[0]],q[2],q[3],1,q[4],function(v){ remember("pl"+q[0]+L.id); PLt[q[0]]=v; draw(); },function(){ save(); })); }); }
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
function inspQR(L){
  var s=sec("Что внутри кода"); s.setAttribute("data-sec","qr"); insp.appendChild(s);
  s.appendChild(choice("",QR_KINDS,L.kind,function(v){ remember(); L.kind=v; draw(); save(); refreshInsp(); }));
  function inp(label,key,ph,type){ return el('<div class="f"><label>'+esc(label)+'</label><input type="'+(type||"text")+'" placeholder="'+esc(ph||"")+'"></div>',function(n){ var i=$("input",n); i.value=L.d[key]||""; i.oninput=function(){ remember("qd"+L.id+key); L.d[key]=i.value; draw(); save(); upd(); }; }); }
  if(L.kind==="url") s.appendChild(inp("Адрес","url","https://..."));
  if(L.kind==="wifi"){ s.appendChild(inp("Название сети","ssid","как сеть видна в телефоне")); s.appendChild(choice("Защита",[["WPA","пароль (WPA/WPA2)"],["WEP","WEP"],["nopass","без пароля"]],L.d.enc,function(v){ remember(); L.d.enc=v; draw(); save(); refreshInsp(); }));
    if(L.d.enc!=="nopass") s.appendChild(inp("Пароль","pass","")); s.appendChild(toggle("Сеть скрыта",!!L.d.hid,function(v){ remember(); L.d.hid=v; draw(); save(); })); }
  if(L.kind==="contact"){ s.appendChild(inp("Имя","name","Имя Фамилия")); s.appendChild(inp("Телефон","phone","+48...","tel")); s.appendChild(inp("Почта","email","","email")); s.appendChild(inp("Где работаете","org","")); s.appendChild(inp("Сайт","site","https://...")); }
  if(L.kind==="phone") s.appendChild(inp("Номер телефона","phone","+48...","tel"));
  if(L.kind==="text") s.appendChild(el('<div class="f"><label>Текст</label><textarea rows="3"></textarea></div>',function(n){ var t=$("textarea",n); t.value=L.d.text||""; t.oninput=function(){ remember("qdt"+L.id); L.d.text=t.value; draw(); save(); upd(); }; }));
  var note=el('<div class="note" style="margin:4px 0 6px"></div>'); s.appendChild(note);
  function upd(){ var w=qrCheck(L), q=qrMatrix(L); note.innerHTML=(q&&!q.err?esc(TR("Размер кода: {0} клеток.",q.n+"x"+q.n))+' ':'')+(w.length?'<span style="color:var(--ember)">'+w.map(esc).join(" ")+'</span>':esc(TR('Перед печатью проверьте код камерой телефона.'))); }
  upd();
  var v=sec("Вид"); v.setAttribute("data-sec","color"); insp.appendChild(v);
  v.appendChild(choice("Точки",[["square","квадраты"],["round","скруглённые"],["dots","круглые"]],L.style,function(x){ set(L,"style",x,false); }));
  v.appendChild(choice("Углы",[["square","квадрат"],["round","скруглённые"],["circle","круг"]],L.eye,function(x){ set(L,"eye",x,false); }));
  v.appendChild(colorPick("Цвет кода",L.fg,function(x,live){ set(L,"fg",x,live?undefined:false); upd(); }));
  v.appendChild(toggle("Подложка под кодом",!!L.bg,function(x){ remember(); L.bg=x?"#ffffff":""; draw(); save(); refreshInsp(); }));
  if(L.bg) v.appendChild(colorPick("Цвет подложки",L.bg,function(x,live){ set(L,"bg",x,live?undefined:false); upd(); }));
  v.appendChild(range("Поля вокруг",L.margin==null?2:L.margin,0,4,1,"",function(x){ set(L,"margin",x); }));
  v.appendChild(el('<div class="f"><label>Значок в центре</label><div class="icg"><button data-i="" class="'+(!L.logo?"on":"")+'">нет</button>'+["play","music","heart","star","coffee","phone","send","mail","globe","camera","gift","home","bag","user"].map(function(k){ return '<button data-i="'+k+'" class="'+(L.logo===k?"on":"")+'">'+icon(k,"")+'</button>'; }).join("")+'</div></div>',function(n){
    $$("button",n).forEach(function(b){ b.onclick=function(){ set(L,"logo",b.getAttribute("data-i"),false); refreshInsp(); }; }); }));
  v.appendChild(el('<p class="note">Со значком код строится с самым сильным запасом прочности, поэтому всё равно читается.</p>'));
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
  if(!L.mask) cut.appendChild(el('<div class="ai"><b>Вырезать предмет или человека</b><p class="note" style="margin-bottom:10px">Нейросеть работает прямо в браузере, фото никуда не отправляется. В первый раз она скачивается, это около 55 МБ, дальше работает сразу. Лучше всего получается, когда на фото один крупный предмет или человек.</p><button class="btn go" style="width:100%">'+sv("wand")+'Убрать фон</button></div>',function(n){ $("button",n).onclick=function(){ removeBg(L); }; }));
  else { cut.appendChild(el('<div class="ai"><b>Фон убран</b><p class="note" style="margin-bottom:10px">Если нейросеть что-то задела или оставила лишнее, поправьте кистью прямо на холсте.</p><div class="row"><button class="btn" data-b>'+sv("brush")+'Подправить кистью</button><button class="btn" data-r>Вернуть фон</button></div></div>',function(n){
      $("[data-b]",n).onclick=function(){ startBrush(L); }; $("[data-r]",n).onclick=function(){ remember(); L.mask=null; delete L.fg; draw(); save(); refreshInsp(); }; }));
    cut.appendChild(range("Мягкость края",L.feather,0,12,1,"px",function(v){ set(L,"feather",v); })); }
  var fs=sec("Фильтры"); fs.setAttribute("data-sec","filters"); insp.appendChild(fs);
  fs.appendChild(el('<div class="flt">'+Object.keys(FILTER_PRESETS).map(function(k){ return '<button data-p="'+k+'" class="'+(L.f.preset===k?"on":"")+'"><canvas width="96" height="96"></canvas><small>'+FILTER_PRESETS[k].name+'</small></button>'; }).join("")+'</div>',function(n){
    var im=assetImg(W,L.src), sm=null; if(im){ sm=document.createElement("canvas"); sm.width=sm.height=96; var k0=Math.max(96/im.naturalWidth,96/im.naturalHeight); sm.getContext("2d").drawImage(im,(96-im.naturalWidth*k0)/2,(96-im.naturalHeight*k0)/2,im.naturalWidth*k0,im.naturalHeight*k0); }
    $$("button",n).forEach(function(b){ var id=b.getAttribute("data-p"); if(sm){ var f={}; applyPreset(f,id); f.gr=(f.gr||0)*.4; filterDraw($("canvas",b).getContext("2d"),sm,96,96,f); }
      b.onclick=function(){ remember(); applyPreset(L.f,id); draw(); save(); refreshInsp(); }; }); }));
  [["br","Яркость",-50,50],["ct","Контраст",-50,50],["sat","Насыщенность",-100,100],["warm","Тепло",-60,60],["vig","Виньетка",0,90],["gr","Зерно",0,60],["blur","Размытие",0,20]].forEach(function(x){
    fs.appendChild(range(x[1],L.f[x[0]]||0,x[2],x[3],1,"",function(v){ remember("f"+x[0]+L.id); L.f[x[0]]=v; L.f.preset=""; draw(); },function(){ save(); })); });
  var ot=sec("Обводка"); insp.appendChild(ot); var O=L.out, kk=Math.min(W.w,W.h);
  ot.appendChild(toggle(L.mask?"Обводка по контуру, как у стикера":"Рамка вокруг фото",!!(O&&O.on),function(v){ remember(); if(v){ L.out=L.out||{ c:"#ffffff", w:Math.max(2,Math.round(kk*.012)) }; L.out.on=true; } else if(L.out) L.out.on=false; draw(); save(); refreshInsp(); }));
  if(O&&O.on){ ot.appendChild(colorPick("",O.c,function(v,live){ remember(live?"otc"+L.id:""); O.c=v; draw(); save(); }));
    ot.appendChild(range("Толщина",O.w,1,Math.max(8,Math.round(kk*.05)),1,"px",function(v){ remember("otw"+L.id); O.w=v; draw(); },function(){ save(); }));
    if(!L.mask) ot.appendChild(el('<p class="note">Уберите у фото фон, и обводка пойдёт по контуру предмета.</p>')); }
  var sh=sec("Форма и кадр"); sh.setAttribute("data-sec","frame"); insp.appendChild(sh);
  sh.appendChild(el('<div class="row" style="margin-bottom:10px"><button class="btn go">'+sv("crop")+esc(TR("Обрезать на холсте"))+'</button></div>',function(n){ $("button",n).onclick=function(){ startCrop(L); }; }));
  var cur=L.shape==="rect"&&L.r?"round":L.shape;
  sh.appendChild(el('<div class="f"><label>'+esc(TR("Фото в фигуре"))+'</label><div class="shapes pshp"></div></div>',function(n){ var g2=$(".shapes",n);
    [["rect","прямоугольник"],["round","скруглённый"]].concat(SHAPES.filter(function(q){ return !isLine(q[0])&&q[0]!=="rect"&&q[0]!=="round"; })).forEach(function(q){
      g2.appendChild(el('<button class="'+(cur===q[0]?"on":"")+'" title="'+esc(TR(q[1]))+'">'+shapeIcon(q[0]==="round"?"round":q[0])+'</button>',function(b){ b.onclick=function(){ remember(); var v=q[0];
        if(v==="round"){ L.shape="rect"; L.r=Math.round(Math.min(L.w,L.h)*.12); } else { L.shape=v; L.r=0; }
        if((v==="circle"||v==="star"||v==="heart"||v==="hex"||v==="burst"||v==="cross")&&Math.abs(L.w-L.h)>2){ var m=Math.min(L.w,L.h); L.w=L.h=m; } draw(); save(); refreshInsp(); }; })); }); }));
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
    var type=webpOk?"image/webp":/png|gif|webp/.test(file.type)?"image/png":"image/jpeg", q=.9, url=c.toDataURL(type,q);
    while(url.length*.75>900000&&q>.5){ q-=.08; url=c.toDataURL(type,q); }
    return { url:url, w:c.width, h:c.height }; }
  if(window.createImageBitmap) return createImageBitmap(file,{imageOrientation:"from-image"}).then(function(b){ var r=draw2(b,b.width,b.height); if(b.close) b.close(); return r; }).catch(viaImg);
  return viaImg();
  function viaImg(){ return new Promise(function(res){ var u=URL.createObjectURL(file), im=new Image(); im.onload=function(){ res(draw2(im,im.naturalWidth,im.naturalHeight)); URL.revokeObjectURL(u); }; im.onerror=function(){ res(null); }; im.src=u; }); }
}
/* перетащить фото в окно (компьютер) */
stage.addEventListener("dragover",function(e){ e.preventDefault(); });
stage.addEventListener("drop",function(e){ e.preventDefault(); var f=e.dataTransfer&&e.dataTransfer.files&&e.dataTransfer.files[0]; if(f&&/^image\//.test(f.type)) loadPhoto(f,addPhoto); });

/* ═══════════ убрать фон: нейросеть silueta (облегчённая U2-Net) через onnxruntime-web, всё на устройстве ═══════════
   Нейросеть видит фото 320 x 320 и говорит, где главный предмет. Дальше обычная обработка, без нейросети:
   1) лишние островки (мелкие куски фона, которые она приняла за предмет) убираются, остаются крупные части;
   2) грубая маска 320 x 320 растягивается до размера фото и подгоняется под настоящие края фото (управляемый фильтр по цвету);
   3) на полупрозрачном краю цвет фона заменяется цветом предмета, иначе вокруг остаётся светлый или тёмный ореол. */
var AI=null;
function busy(t1,t2){ var b=$(".busy",stage); if(!t1){ if(b) b.remove(); return; } if(!b){ b=document.createElement("div"); b.className="busy"; stage.appendChild(b); } b.innerHTML='<div><b>'+esc(TR(t1))+'</b>'+esc(TR(t2||""))+'<i></i></div>'; }
function loadAI(){
  if(AI) return AI;
  AI=new Promise(function(res,rej){
    var s=document.createElement("script"); s.src="ai/ort.wasm.min.js"; s.onerror=function(){ rej(new Error("script")); };
    s.onload=function(){ try{ ort.env.wasm.wasmPaths=new URL("ai/",location.href).href; ort.env.wasm.numThreads=1;
      ort.InferenceSession.create("ai/silueta.onnx",{executionProviders:["wasm"]}).then(res,rej); }catch(e){ rej(e); } };
    document.head.appendChild(s);
  });
  AI.catch(function(){ AI=null; });
  return AI;
}
function tick(){ return new Promise(function(r){ setTimeout(r,16); }); }
/* сумма по квадрату (2r+1)^2 через накопленные суммы, края учитываются честно (делим на число попавших точек) */
function boxMean(src,w,h,r,out){ var n=w*h, tmp=new Float32Array(n), x, y, i;
  for(y=0;y<h;y++){ var row=y*w, acc=0; for(x=0;x<=Math.min(r,w-1);x++) acc+=src[row+x];
    for(x=0;x<w;x++){ var cnt=Math.min(w-1,x+r)-Math.max(0,x-r)+1; tmp[row+x]=acc/cnt; var a=x+r+1, b=x-r; if(a<w) acc+=src[row+a]; if(b>=0) acc-=src[row+b]; } }
  out=out||new Float32Array(n);
  for(x=0;x<w;x++){ var acc2=0; for(y=0;y<=Math.min(r,h-1);y++) acc2+=tmp[y*w+x];
    for(y=0;y<h;y++){ var cnt2=Math.min(h-1,y+r)-Math.max(0,y-r)+1; out[y*w+x]=acc2/cnt2; var a2=y+r+1, b2=y-r; if(a2<h) acc2+=tmp[a2*w+x]; if(b2>=0) acc2-=tmp[b2*w+x]; } }
  return out; }
/* управляемый фильтр (He, Sun, Tang) с цветным ориентиром: маска p подстраивается под края картинки R, G, B */
function guidedColor(R,G,B,p,w,h,r,eps){ var n=w*h, M=function(a){ return boxMean(a,w,h,r); }, i;
  var mR=M(R), mG=M(G), mB=M(B), mp=M(p), t=new Float32Array(n);
  function prod(a,b){ var o=new Float32Array(n); for(var k=0;k<n;k++) o[k]=a[k]*b[k]; return o; }
  var cRp=M(prod(R,p)), cGp=M(prod(G,p)), cBp=M(prod(B,p)), vRR=M(prod(R,R)), vRG=M(prod(R,G)), vRB=M(prod(R,B)), vGG=M(prod(G,G)), vGB=M(prod(G,B)), vBB=M(prod(B,B));
  var aR=new Float32Array(n), aG=new Float32Array(n), aB=new Float32Array(n), bb=new Float32Array(n);
  for(i=0;i<n;i++){ var rr=vRR[i]-mR[i]*mR[i]+eps, rg=vRG[i]-mR[i]*mG[i], rb=vRB[i]-mR[i]*mB[i], gg=vGG[i]-mG[i]*mG[i]+eps, gb=vGB[i]-mG[i]*mB[i], b2=vBB[i]-mB[i]*mB[i]+eps;
    var xR=cRp[i]-mR[i]*mp[i], xG=cGp[i]-mG[i]*mp[i], xB=cBp[i]-mB[i]*mp[i];
    /* обратная матрица 3 x 3 (она симметричная) */
    var i00=gg*b2-gb*gb, i01=gb*rb-rg*b2, i02=rg*gb-gg*rb, i11=rr*b2-rb*rb, i12=rb*rg-rr*gb, i22=rr*gg-rg*rg, det=rr*i00+rg*i01+rb*i02;
    if(Math.abs(det)<1e-12){ aR[i]=aG[i]=aB[i]=0; bb[i]=mp[i]; continue; }
    var ar=(i00*xR+i01*xG+i02*xB)/det, ag=(i01*xR+i11*xG+i12*xB)/det, ab=(i02*xR+i12*xG+i22*xB)/det;
    aR[i]=ar; aG[i]=ag; aB[i]=ab; bb[i]=mp[i]-ar*mR[i]-ag*mG[i]-ab*mB[i]; }
  var maR=M(aR), maG=M(aG), maB=M(aB), mb=M(bb), q=new Float32Array(n);
  for(i=0;i<n;i++) q[i]=maR[i]*R[i]+maG[i]*G[i]+maB[i]*B[i]+mb[i];
  return q; }
/* островки на сетке 320 x 320: оставляем крупные связные куски, остальное гасим */
function keepIslands(p,S){ var n=S*S, lab=new Int32Array(n), sizes=[0], st=new Int32Array(n), i, k;
  for(i=0;i<n;i++){ if(p[i]<=.5||lab[i]) continue; var id=sizes.length, sp=0, cnt=0; st[sp++]=i; lab[i]=id;
    while(sp){ var c=st[--sp], cx=c%S, cy=(c-cx)/S; cnt++;
      for(var dy=-1;dy<=1;dy++) for(var dx=-1;dx<=1;dx++){ var nx=cx+dx, ny=cy+dy; if(nx<0||ny<0||nx>=S||ny>=S) continue; k=ny*S+nx; if(!lab[k]&&p[k]>.5){ lab[k]=id; st[sp++]=k; } } }
    sizes.push(cnt); }
  var big=0; for(i=1;i<sizes.length;i++) if(sizes[i]>big) big=sizes[i]; if(!big) return { big:0, keep:null };
  var min=Math.max(big*.04,n*.0015), keep=new Uint8Array(n); for(i=0;i<n;i++) if(lab[i]&&sizes[lab[i]]>=min) keep[i]=1;
  /* оставленное раздвигаем на 4 клетки: мягкий край вокруг предмета не должен пропасть */
  var kd=new Uint8Array(n); for(var y=0;y<S;y++) for(var x=0;x<S;x++){ if(!keep[y*S+x]) continue; for(var yy=Math.max(0,y-4);yy<=Math.min(S-1,y+4);yy++) for(var xx=Math.max(0,x-4);xx<=Math.min(S-1,x+4);xx++) kd[yy*S+xx]=1; }
  for(i=0;i<n;i++) if(!kd[i]) p[i]=0;
  var kept=0; for(i=1;i<sizes.length;i++) if(sizes[i]>=min) kept++;
  return { big:big/n, parts:kept }; }
/* растянуть сетку S x S до w x h плавно */
function upsample(p,S,w,h){ var o=new Float32Array(w*h), sx=S/w, sy=S/h;
  for(var y=0;y<h;y++){ var fy=Math.max(0,Math.min(S-1.001,(y+.5)*sy-.5)), y0=Math.floor(fy), ty=fy-y0, r0=y0*S, r1=Math.min(S-1,y0+1)*S;
    for(var x=0;x<w;x++){ var fx=Math.max(0,Math.min(S-1.001,(x+.5)*sx-.5)), x0=Math.floor(fx), tx=fx-x0, x1=Math.min(S-1,x0+1);
      o[y*w+x]=(p[r0+x0]*(1-tx)+p[r0+x1]*tx)*(1-ty)+(p[r1+x0]*(1-tx)+p[r1+x1]*tx)*ty; } }
  return o; }
function removeBg(L){
  var im=assetImg(W,L.src); if(!im){ toast("Фото ещё загружается, попробуйте через секунду"); return; }
  busy("Загружаю нейросеть","Один раз, около 55 МБ. Дальше будет работать сразу.");
  var sess=null, S=320, prob=null, info=null, WW=0, HH=0, alpha=null, fgc=null;
  loadAI().then(function(s){ sess=s; busy("Ищу главный предмет","Фото обрабатывается прямо на этом устройстве."); return tick(); })
  .then(function(){
    var c=document.createElement("canvas"); c.width=c.height=S; var x=c.getContext("2d"); x.imageSmoothingQuality="high"; x.drawImage(im,0,0,S,S);
    var d=x.getImageData(0,0,S,S).data, f=new Float32Array(3*S*S), mean=[.485,.456,.406], sd=[.229,.224,.225];
    for(var i=0;i<S*S;i++) for(var k=0;k<3;k++) f[k*S*S+i]=(d[i*4+k]/255-mean[k])/sd[k];
    var inp={}; inp[sess.inputNames[0]]=new ort.Tensor("float32",f,[1,3,S,S]); return sess.run(inp); })
  .then(function(out){
    var m=out[sess.outputNames[0]].data, mn=Infinity, mx=-Infinity, i; for(i=0;i<m.length;i++){ if(m[i]<mn) mn=m[i]; if(m[i]>mx) mx=m[i]; }
    prob=new Float32Array(S*S); for(i=0;i<S*S;i++) prob[i]=(m[i]-mn)/((mx-mn)||1);
    info=keepIslands(prob,S); info.raw=mx;
    busy("Дорабатываю края","Подгоняю вырезку под края фото."); return tick(); })
  .then(function(){
    /* рабочий размер: сторона до 1280 px, этого хватает для краёв и быстро считается */
    var iw=im.naturalWidth, ih=im.naturalHeight, k=Math.min(1,1280/Math.max(iw,ih)); WW=Math.max(8,Math.round(iw*k)); HH=Math.max(8,Math.round(ih*k));
    var c=document.createElement("canvas"); c.width=WW; c.height=HH; var x=c.getContext("2d"); x.imageSmoothingQuality="high"; x.drawImage(im,0,0,WW,HH);
    var d=x.getImageData(0,0,WW,HH).data, n=WW*HH, R=new Float32Array(n), G=new Float32Array(n), B=new Float32Array(n), i;
    for(i=0;i<n;i++){ R[i]=d[i*4]/255; G[i]=d[i*4+1]/255; B[i]=d[i*4+2]/255; }
    var p=upsample(prob,S,WW,HH), r=Math.max(2,Math.round(Math.max(WW,HH)/160)), q=guidedColor(R,G,B,p,WW,HH,r,.002);
    alpha=new Float32Array(n); for(i=0;i<n;i++){ var a=(q[i]-.3)/.4; alpha[i]=a<0?0:a>1?1:a; }
    /* цвет предмета на краю: среднее по уверенным точкам предмета рядом */
    var wv=new Float32Array(n), wr=new Float32Array(n), wg=new Float32Array(n), wb=new Float32Array(n);
    for(i=0;i<n;i++){ var w=alpha[i]>.9?1:0; wv[i]=w; wr[i]=R[i]*w; wg[i]=G[i]*w; wb[i]=B[i]*w; }
    var rr=r*2, mw=boxMean(wv,WW,HH,rr), mr=boxMean(wr,WW,HH,rr), mg=boxMean(wg,WW,HH,rr), mb=boxMean(wb,WW,HH,rr);
    var mc=document.createElement("canvas"); mc.width=WW; mc.height=HH; var mgx=mc.getContext("2d"), mid=mgx.createImageData(WW,HH);
    var fc=document.createElement("canvas"); fc.width=WW; fc.height=HH; var fgx=fc.getContext("2d"), fid=fgx.createImageData(WW,HH), edge=0;
    for(i=0;i<n;i++){ var A=alpha[i]; mid.data[i*4]=mid.data[i*4+1]=mid.data[i*4+2]=255; mid.data[i*4+3]=Math.round(A*255);
      var e=A>.02&&A<.97&&mw[i]>.01?Math.min(1,(.97-A)/.25):0;
      if(e>0){ fid.data[i*4]=Math.round(mr[i]/mw[i]*255); fid.data[i*4+1]=Math.round(mg[i]/mw[i]*255); fid.data[i*4+2]=Math.round(mb[i]/mw[i]*255); fid.data[i*4+3]=Math.round(e*255); edge++; } }
    mgx.putImageData(mid,0,0); fgx.putImageData(fid,0,0);
    var cov=0; for(i=0;i<n;i++) cov+=alpha[i]; cov/=n;
    var mk="m"+Date.now().toString(36), fk="e"+Date.now().toString(36);
    W.assets[mk]=mc.toDataURL("image/png"); IMG[mk]={ ok:true, im:mc };
    remember(); L.mask=mk; if(edge){ W.assets[fk]=fc.toDataURL("image/png"); IMG[fk]={ ok:true, im:fc }; L.fg=fk; } else delete L.fg;
    delete PROC[L.id]; busy(); draw(); save(); refreshInsp();
    if(cov<.004||info.raw<.4) toast("Главный предмет не нашёлся. Лучше всего получается, когда на фото один крупный предмет или человек");
    else if(cov>.92) toast("Нейросеть решила, что почти всё фото и есть предмет. Подправьте кистью");
    else if(info.parts>3) toast("Нашлось несколько отдельных предметов. Лишние можно стереть кистью");
    else toast("Фон убран. Подправить края можно кистью");
  }).catch(function(e){ busy(); toast(AI?"Не получилось убрать фон на этом фото":"Не получилось запустить нейросеть: нужен интернет при первом запуске"); console.warn(e); });
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

/* ═══════════ рисование от руки ═══════════ */
/* В режиме рисования палец или мышь ведут линию, двумя пальцами холст двигается и приближается.
   Штрихи пишутся в координатах слоя, поэтому готовый рисунок двигается, растягивается и поворачивается как любой другой слой. */
var PEN={ tool:"pen", c:"#ff5fa2", s:0, smooth:true };
try{ var ps=JSON.parse(localStorage.getItem("forge_gfx_pen")||"null"); if(ps){ PEN.c=ps.c||PEN.c; PEN.smooth=ps.smooth!==false; } }catch(e){}
function startPen(L){ if(ui.brush||ui.pen) return; sel=L?L.id:null; ui.pen={ id:L?L.id:null, cur:null }; if(!PEN.s) PEN.s=Math.max(2,Math.round(Math.min(W.w,W.h)*.012));
  if(!wide.matches) closeSheet(); penBar(); refreshInsp(); toast(touch?"Рисуйте пальцем. Двумя пальцами холст двигается и приближается":"Рисуйте мышкой по холсту. Колесо приближает"); draw(); }
function penBar(){ var bb=$("#brushbar"), mx=Math.max(20,Math.round(Math.min(W.w,W.h)*.08)); bb.hidden=false; bb.classList.add("pen");
  bb.innerHTML='<div class="pr"><button data-t="pen" title="Кисть">'+sv("pen")+'</button><button data-t="mark" title="Маркер">'+sv("marker")+'</button><button data-t="erase" title="Ластик">'+sv("eraser")+'</button>'+
    '<input type="range" min="1" max="'+mx+'" value="'+Math.min(mx,PEN.s)+'" title="Толщина"><button data-sm title="Сглаживание линии" class="'+(PEN.smooth?"on":"")+'">'+sv("smooth")+'</button><button data-u title="Убрать последний штрих">'+sv("undo2")+'</button><button data-done class="go">'+esc(TR("Готово"))+'</button></div>'+
    '<div class="pr pcs">'+PAL.slice(0,10).map(function(c){ return '<button data-c="'+c+'" style="background:'+c+'"></button>'; }).join("")+'<label class="any" title="Любой цвет"><input type="color" value="'+PEN.c+'"></label></div>';
  function upd(){ $$("[data-t]",bb).forEach(function(b){ b.classList.toggle("on",b.getAttribute("data-t")===PEN.tool); }); $$("[data-c]",bb).forEach(function(b){ b.classList.toggle("on",b.getAttribute("data-c")===PEN.c); }); $("[data-sm]",bb).classList.toggle("on",PEN.smooth);
    try{ localStorage.setItem("forge_gfx_pen",JSON.stringify({ c:PEN.c, smooth:PEN.smooth })); }catch(e){} }
  $$("[data-t]",bb).forEach(function(b){ b.onclick=function(){ PEN.tool=b.getAttribute("data-t"); upd(); }; });
  $$("[data-c]",bb).forEach(function(b){ b.onclick=function(){ PEN.c=b.getAttribute("data-c"); if(PEN.tool==="erase") PEN.tool="pen"; upd(); }; });
  $("input[type=color]",bb).oninput=function(){ PEN.c=this.value; if(PEN.tool==="erase") PEN.tool="pen"; upd(); };
  $("input[type=range]",bb).oninput=function(){ PEN.s=+this.value; };
  $("[data-sm]",bb).onclick=function(){ PEN.smooth=!PEN.smooth; upd(); };
  $("[data-u]",bb).onclick=function(){ if(U.length) $("#undo").click(); };
  $("[data-done]",bb).onclick=endPen; upd(); }
/* точка холста в координатах рисунка */
function penPt(L,p){ var q=toLocal(L,p.x,p.y); return { x:q.x*L.bw/L.w*(L.flipX?-1:1), y:q.y*L.bh/L.h*(L.flipY?-1:1) }; }
function penStart(p,e){ var L=ui.pen.id&&L_(ui.pen.id); remember(); if(!L){ L=drawLayerNew(W); W.layers.push(L); ui.pen.id=L.id; sel=L.id; }
  var q=penPt(L,p), k=(L.bw/L.w+L.bh/L.h)/2, S={ k:PEN.tool, c:PEN.c, s:Math.round(PEN.s*(PEN.tool==="mark"?2.6:PEN.tool==="erase"?2:1)*k*10)/10, p:[Math.round(q.x*10)/10,Math.round(q.y*10)/10] };
  L.strokes.push(S); ui.pen.cur={ S:S, L:L, x:q.x, y:q.y, lx:q.x, ly:q.y }; draw(); }
function penMove(e){ var c=ui.pen.cur; if(!c) return; var evs=e.getCoalescedEvents?e.getCoalescedEvents():null; if(!evs||!evs.length) evs=[e]; var G=geom(), md=1.4/G.s*(c.L.bw/c.L.w);
  evs.forEach(function(ev){ var q=penPt(c.L,toWork(ev.clientX,ev.clientY)); c.rx=q.x; c.ry=q.y; if(PEN.smooth){ c.x+=(q.x-c.x)*.4; c.y+=(q.y-c.y)*.4; } else { c.x=q.x; c.y=q.y; }
    if(Math.hypot(c.x-c.lx,c.y-c.ly)>=md){ c.S.p.push(Math.round(c.x*10)/10,Math.round(c.y*10)/10); c.lx=c.x; c.ly=c.y; } }); draw(); }
function penEnd(){ var c=ui.pen.cur; ui.pen.cur=null; /* сглаживание отстаёт от пальца: дотягиваем линию до точки, где он оторвался */
  if(c&&PEN.smooth&&c.rx!=null&&Math.hypot(c.rx-c.lx,c.ry-c.ly)>.5) c.S.p.push(Math.round(c.rx*10)/10,Math.round(c.ry*10)/10); save(); draw(); }
/* второй палец лёг на холст: это щипок, начатый штрих убираем */
function penCancel(){ var c=ui.pen.cur; if(!c) return; ui.pen.cur=null; c.L.strokes.pop(); if(U.length) U.pop(); undoBtns(); if(!c.L.strokes.length&&ui.pen.id===c.L.id&&c.L.bw===W.w&&c.L.x===W.w/2&&c.L.w===W.w){ W.layers.splice(W.layers.indexOf(c.L),1); ui.pen.id=null; sel=null; } draw(); }
/* рамка рисунка сжимается до самих линий: центр слоя переезжает, точки пересчитываются от нового центра */
function penFit(L){ var a=Infinity, b=Infinity, c=-Infinity, d=-Infinity; L.strokes.forEach(function(S){ if(S.k==="erase") return; var h=S.s/2; for(var i=0;i<S.p.length;i+=2){ if(S.p[i]-h<a) a=S.p[i]-h; if(S.p[i]+h>c) c=S.p[i]+h; if(S.p[i+1]-h<b) b=S.p[i+1]-h; if(S.p[i+1]+h>d) d=S.p[i+1]+h; } });
  if(a===Infinity) return false; var cx=(a+c)/2, cy=(b+d)/2, nw=Math.max(4,c-a), nh=Math.max(4,d-b), sx=L.w/L.bw, sy=L.h/L.bh, dx=cx*sx*(L.flipX?-1:1), dy=cy*sy*(L.flipY?-1:1), r=(L.rot||0)*Math.PI/180;
  L.strokes.forEach(function(S){ for(var i=0;i<S.p.length;i+=2){ S.p[i]=Math.round((S.p[i]-cx)*10)/10; S.p[i+1]=Math.round((S.p[i+1]-cy)*10)/10; } });
  L.x=Math.round(L.x+dx*Math.cos(r)-dy*Math.sin(r)); L.y=Math.round(L.y+dx*Math.sin(r)+dy*Math.cos(r)); L.bw=Math.round(nw*10)/10; L.bh=Math.round(nh*10)/10; L.w=Math.round(nw*sx); L.h=Math.round(nh*sy); return true; }
function endPen(){ var pn=ui.pen; if(!pn) return; ui.pen=null; var bb=$("#brushbar"); bb.hidden=true; bb.classList.remove("pen"); bb.innerHTML=""; var L=pn.id&&L_(pn.id);
  if(L){ if(!penFit(L)){ W.layers.splice(W.layers.indexOf(L),1); sel=null; } else sel=L.id; }
  delete LCV[pn.id]; save(); draw(); refresh(); }

/* ═══════════ пипетка ═══════════ */
/* на компьютере берём системную пипетку (цвет с любого места экрана), иначе цвет точки на холсте, куда нажали */
function colorAt(x,y){ var c=document.createElement("canvas"); c.width=c.height=1; var g2=c.getContext("2d"); drawWork(g2,W,{ scale:1, ox:-Math.floor(x), oy:-Math.floor(y) }); var d=g2.getImageData(0,0,1,1).data;
  if(x<0||y<0||x>=W.w||y>=W.h||d[3]<8) return ""; return "#"+[d[0],d[1],d[2]].map(function(v){ return ("0"+v.toString(16)).slice(-2); }).join(""); }
function pickColor(done){
  if(window.EyeDropper&&!touch){ try{ new EyeDropper().open().then(function(r){ if(r&&r.sRGBHex) done(String(r.sRGBHex).toLowerCase()); }).catch(function(){}); return; }catch(e){} }
  var back=!wide.matches?(ui.sheet==="tab"?ui.tab:"insp"):null; if(back) closeSheet();
  ui.pick=function(c){ done(c); if(back){ if(back==="insp") openInsp(); else openTab(back); } else refresh(); }; stage.classList.add("picking"); toast("Нажмите на холст в том месте, откуда взять цвет"); }

/* ═══════════ коллаж ═══════════ */
/* раскладки: r = строки с числом фото в каждой, c = столбцы, big = одно большое фото и остальные сеткой рядом */
var COLL={ 2:[["c",[1,1]],["r",[1,1]]], 3:[["big"],["c",[1,1,1]],["r",[1,2]],["r",[2,1]]], 4:[["r",[2,2]],["big"],["r",[1,3]],["c",[1,1,1,1]]], 5:[["r",[2,3]],["r",[3,2]],["big"]],
  6:[["r",[3,3]],["r",[2,2,2]],["r",[1,2,3]]], 7:[["r",[2,3,2]],["r",[3,4]],["big"]], 8:[["r",[3,2,3]],["r",[4,4]]], 9:[["r",[3,3,3]],["big"]] };
function collRects(def,n){ var out=[], i, j;
  if(def[0]==="r"){ var R=def[1]; for(i=0;i<R.length;i++) for(j=0;j<R[i];j++) out.push([j/R[i],i/R.length,1/R[i],1/R.length]); }
  else if(def[0]==="c"){ var C=def[1]; for(i=0;i<C.length;i++) for(j=0;j<C[i];j++) out.push([i/C.length,j/C[i],1/C.length,1/C[i]]); }
  else { var m=n-1, cols=m<=3?1:2, rows=Math.ceil(m/cols), wide2=W.w>=W.h; out.push(wide2?[0,0,.5,1]:[0,0,1,.5]);
    for(i=0;i<m;i++){ var rr=Math.floor(i/cols), cc=i%cols, inRow=rr===rows-1?m-rr*cols:cols, x=cc/inRow, y=rr/rows, w=1/inRow, h=1/rows; out.push(wide2?[.5+x*.5,y,w*.5,h]:[x,.5+y*.5,w,h*.5]); } }
  return out; }
function collagePick(){ var inp=$("#fImgs"); inp.value=""; inp.onchange=function(){ var files=[].slice.call(inp.files||[]).slice(0,9); if(!files.length) return;
    if(files.length===1){ loadPhoto(files[0],addPhoto); return; } toast("Ужимаю фото..."); var as=[], chain=Promise.resolve();
    files.forEach(function(f){ chain=chain.then(function(){ return shrinkPhoto(f,2000); }).then(function(r){ if(r){ var id="a"+Date.now().toString(36)+Math.random().toString(36).slice(2,5); W.assets[id]=r.url; as.push({ id:id, w:r.w, h:r.h }); } }); });
    chain.then(function(){ if(as.length<2){ toast("Для коллажа нужно хотя бы два фото"); if(as.length) addPhoto(as[0]); return; } collageDlg(as); }); }; inp.click(); }
function collageDlg(as){ var n=as.length, defs=COLL[n]||COLL[9], st={ i:0, gap:2, edge:true };
  modal('<h3>'+esc(TR("Коллаж: {0} фото",n))+'</h3><div class="clls" id="cL"></div><div id="cO"></div><div class="row"><button class="btn" data-close>'+esc(TR("Отмена"))+'</button><button class="btn go" id="cGo">'+esc(TR("Собрать"))+'</button></div>');
  var box=$("#cL"); defs.forEach(function(d,i){ var b=document.createElement("button"); b.className=i===0?"on":""; var c=document.createElement("canvas"), k=64/Math.max(W.w,W.h); c.width=Math.round(W.w*k*2); c.height=Math.round(W.h*k*2); c.style.width=Math.round(W.w*k)+"px";
    var x=c.getContext("2d"); x.fillStyle="#232a33"; x.fillRect(0,0,c.width,c.height); x.fillStyle="#4fd6c8"; collRects(d,n).forEach(function(r){ x.fillRect(r[0]*c.width+2,r[1]*c.height+2,r[2]*c.width-4,r[3]*c.height-4); });
    b.appendChild(c); b.onclick=function(){ st.i=i; $$("button",box).forEach(function(y){ y.classList.toggle("on",y===b); }); }; box.appendChild(b); });
  var o=$("#cO"); o.appendChild(range("Промежуток между фото",st.gap,0,8,.5,"%",function(v){ st.gap=v; })); o.appendChild(toggle("Поля по краям холста",st.edge,function(v){ st.edge=v; }));
  o.appendChild(el('<p class="note" style="margin:6px 0 12px">'+esc(TR("Фото встанут по ячейкам и обрежутся под них. Потом каждое можно двигать, менять и сдвигать кадр внутри рамки."))+'</p>'));
  $("#cGo").onclick=function(){ closeModal(); remember(); var g2=Math.round(Math.min(W.w,W.h)*st.gap/100), M=st.edge?g2/2:-g2/2, IW=W.w-M*2, IH=W.h-M*2, last=null;
    collRects(defs[st.i],n).forEach(function(r,i){ var a=as[i], L=imageLayer(W,a.id,a.w,a.h); L.w=Math.max(8,Math.round(r[2]*IW-g2)); L.h=Math.max(8,Math.round(r[3]*IH-g2)); L.x=Math.round(M+r[0]*IW+r[2]*IW/2); L.y=Math.round(M+r[1]*IH+r[3]*IH/2); W.layers.push(L); last=L; });
    sel=last?last.id:null; save(); draw(); if(wide.matches) refresh(); else closeSheet(); toast("Коллаж собран"); }; }

/* ═══════════ сохранить картинку ═══════════ */
$("#saveBtn").onclick=exportDlg;
var EX={ type:"png", k:1, transparent:false, round:true };
function exportDlg(){
  if(ui.pen) endPen();
  modal('<h3>Сохранить картинку</h3><div class="exp-pv" id="exPv"></div><div id="exOpts"></div><p class="note" id="exInfo" style="margin:8px 0 12px"></p>'+
    '<div class="row"><button class="btn go" id="exGo">'+sv("down2")+'Сохранить</button>'+(navigator.canShare?'<button class="btn" id="exSh">'+sv("send")+'Поделиться</button>':'')+'</div>'+
    '<div class="row"><button class="btn" id="exPg">В конструктор страниц</button><button class="btn" data-close>Закрыть</button></div>');
  $("#exPg").onclick=function(){ closeModal(); sendToPages(); };
  var o=$("#exOpts");
  o.appendChild(choice("Формат",[["png","PNG"],["jpg","JPG"],["webp","WebP"],["pdf","PDF"]],EX.type,function(v){ EX.type=v; if(v==="jpg"||v==="pdf") EX.transparent=false; upd(); }));
  o.appendChild(choice("Размер",[["0.5",(W.w/2|0)+" x "+(W.h/2|0)],["1",W.w+" x "+W.h],["2","x2 для печати"]],String(EX.k),function(v){ EX.k=Number(v); upd(); }));
  o.appendChild(toggle("Прозрачный фон (только PNG и WebP)",EX.transparent,function(v){ EX.transparent=v; if(v&&(EX.type==="jpg"||EX.type==="pdf")){ EX.type="png"; closeModal(); exportDlg(); return; } upd(); }));
  if(W.round) o.appendChild(toggle("Обрезать по кругу",EX.round,function(v){ EX.round=v; upd(); }));
  var blob=null, T=0;
  var PRINT={ card:1, a4:1, bcard:1 }, dpi=PRINT[W.size]?300:96;
  function kb(b){ return b.size>1048576?(b.size/1048576).toFixed(1)+" "+TR("МБ"):Math.round(b.size/1024)+" "+TR("КБ"); }
  function upd(){ clearTimeout(T); $("#exInfo").textContent=TR("Собираю картинку..."); T=setTimeout(function(){ render().then(function(b){ blob=b; var px=(W.w*EX.k|0)+" x "+(W.h*EX.k|0)+" px";
      if(!b){ $("#exInfo").textContent=TR("Такой большой размер этот браузер собрать не может. Выберите размер меньше."); return; }
      $("#exInfo").textContent=px+", "+kb(b)+(EX.type==="pdf"?". "+TR("Лист {0} x {1} мм.",Math.round(W.w/dpi*25.4),Math.round(W.h/dpi*25.4)):"")+(W.w*EX.k*W.h*EX.k>16777216?" "+TR("На iPhone и iPad такой размер может не собраться: если картинка вышла пустой, выберите размер меньше."):""); })
    .catch(function(){ blob=null; $("#exInfo").textContent=TR("Такой большой размер этот браузер собрать не может. Выберите размер меньше."); }); },120); }
  function render(){ var w=Math.round(W.w*EX.k), h=Math.round(W.h*EX.k), c=document.createElement("canvas"), flat=EX.type==="jpg"||EX.type==="pdf"; c.width=w; c.height=h; var x=c.getContext("2d");
    if(!x||c.width!==w) return Promise.resolve(null);
    if(flat){ x.fillStyle="#fff"; x.fillRect(0,0,w,h); }
    drawWork(x,W,{ scale:EX.k, transparent:EX.transparent, clipRound:W.round&&EX.round });
    var pv=$("#exPv"); pv.innerHTML=""; var p=document.createElement("canvas"), k=440/Math.max(w,h); p.width=Math.round(w*k); p.height=Math.round(h*k); p.getContext("2d").drawImage(c,0,0,p.width,p.height); pv.appendChild(p);
    var mime={png:"image/png",jpg:"image/jpeg",webp:"image/webp",pdf:"image/jpeg"}[EX.type];
    return new Promise(function(res){ c.toBlob(function(b){ if(!b||EX.type!=="pdf"){ res(b); return; } b.arrayBuffer().then(function(ab){ res(pdfOf(new Uint8Array(ab),W.w/dpi*72,W.h/dpi*72,w,h)); }); },mime,EX.type==="pdf"?.95:.92); }); }
  function fileOf(){ return new File([blob],fname()+"."+(EX.type==="jpg"?"jpg":EX.type),{type:blob.type}); }
  $("#exGo").onclick=function(){ if(!blob) return; dl(blob,fileOf().name); toast(EX.type==="pdf"?"Файл PDF сохранён":"Картинка сохранена"); };
  if($("#exSh")) $("#exSh").onclick=function(){ if(!blob) return; var f=fileOf(); if(navigator.canShare({files:[f]})) navigator.share({files:[f],title:W.title}).catch(function(){}); else toast("Этот браузер не умеет делиться файлами, сохраните картинку"); };
  upd();
}
/* имя файла латиницей: некоторые браузеры не принимают кириллицу в имени скачиваемого файла и называют его «download» */
function latin(t){ var m={а:"a",б:"b",в:"v",г:"g",д:"d",е:"e",ё:"e",ж:"zh",з:"z",и:"i",й:"y",к:"k",л:"l",м:"m",н:"n",о:"o",п:"p",р:"r",с:"s",т:"t",у:"u",ф:"f",х:"h",ц:"ts",ч:"ch",ш:"sh",щ:"sch",ъ:"",ы:"y",ь:"",э:"e",ю:"yu",я:"ya",і:"i",ї:"yi",є:"ye",ł:"l",ß:"ss"};
  return String(t||"").toLowerCase().split("").map(function(c){ return m[c]!=null?m[c]:c; }).join("").normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"").slice(0,40); }
function fname(){ return latin(W.title)||"image"; }
/* PDF в одну страницу: картинка JPEG во весь лист. Размер листа в пунктах (1/72 дюйма) */
function pdfOf(jpeg,pw,ph,iw,ih){ var enc=new TextEncoder(), parts=[], off=[], len=0; pw=Math.round(pw*100)/100; ph=Math.round(ph*100)/100;
  function add(x){ var b=typeof x==="string"?enc.encode(x):x; parts.push(b); len+=b.length; }
  function obj(n,body){ off[n]=len; add(n+" 0 obj\n"+body+"\nendobj\n"); }
  add("%PDF-1.4\n%FORGE\n");
  obj(1,"<< /Type /Catalog /Pages 2 0 R >>"); obj(2,"<< /Type /Pages /Kids [3 0 R] /Count 1 >>");
  obj(3,"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 "+pw+" "+ph+"] /Resources << /XObject << /Im0 5 0 R >> >> /Contents 4 0 R >>");
  var cs="q "+pw+" 0 0 "+ph+" 0 0 cm /Im0 Do Q"; obj(4,"<< /Length "+cs.length+" >>\nstream\n"+cs+"\nendstream");
  off[5]=len; add("5 0 obj\n<< /Type /XObject /Subtype /Image /Width "+iw+" /Height "+ih+" /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length "+jpeg.length+" >>\nstream\n"); add(jpeg); add("\nendstream\nendobj\n");
  var xr=len, t="xref\n0 6\n0000000000 65535 f \n"; for(var i=1;i<=5;i++) t+=("0000000000"+off[i]).slice(-10)+" 00000 n \n";
  add(t+"trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n"+xr+"\n%%EOF\n"); return new Blob(parts,{type:"application/pdf"}); }
function dl(blob,name){ var a=document.createElement("a"); a.href=URL.createObjectURL(blob); a.download=name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(function(){ URL.revokeObjectURL(a.href); },3000); }

/* ═══════════ связь с конструктором страниц (общая база страниц «forge», тот же сайт) ═══════════ */
function pagesDb(){ return new Promise(function(res,rej){ try{ var r=indexedDB.open("forge",1); r.onupgradeneeded=function(){ r.result.createObjectStore("pages",{keyPath:"id"}); };
  r.onsuccess=function(){ res(r.result); }; r.onerror=function(){ rej(r.error); }; }catch(e){ rej(e); } }); }
function pagesAll(){ return pagesDb().then(function(d){ return new Promise(function(res){ var q=d.transaction("pages").objectStore("pages").getAll(); q.onsuccess=function(){ res(q.result||[]); }; q.onerror=function(){ res([]); }; }); }); }
function pagePut(p){ return pagesDb().then(function(d){ return new Promise(function(res,rej){ var t=d.transaction("pages","readwrite"); t.objectStore("pages").put(p); t.oncomplete=res; t.onerror=function(){ rej(t.error); }; }); }); }
/* картинка для страницы: поменьше и полегче, как фото в конструкторе */
function imageFor(max, target){
  var k=Math.min(1,max/Math.max(W.w,W.h)), c=document.createElement("canvas"); c.width=Math.round(W.w*k); c.height=Math.round(W.h*k);
  drawWork(c.getContext("2d"),W,{ scale:k, clipRound:W.round });
  var type=webpOk?"image/webp":(W.round||W.bg.t==="none"?"image/png":"image/jpeg"), q=.9, url=c.toDataURL(type,q);
  while(type!=="image/png" && url.length*.75>target && q>.45){ q-=.08; url=c.toDataURL(type,q); }
  return url;
}
function sendToPages(){
  if(ui.brush) endBrush();
  pagesAll().then(function(list){
    list.sort(function(a,b){ return (b.updated||0)-(a.updated||0); });
    var pick=null, where=null;
    modal('<h3>Отправить в конструктор страниц</h3><p class="note">Выберите страницу. Картинка сожмётся до размера, который нужен странице.</p>'+
      '<div class="plist" id="pl"><button data-p=""><b>+ Новая страница</b><small>пустая</small></button>'+list.map(function(p){ return '<button data-p="'+esc(p.id)+'"><b>'+esc(p.title||"Страница")+'</b><small>'+(p.blocks||[]).length+' блоков</small></button>'; }).join("")+'</div>'+
      '<div id="wh"></div><div class="row"><button class="btn" data-close>Отмена</button><button class="btn go" id="pgGo" disabled>Отправить</button></div>');
    $$("#pl button").forEach(function(b){ b.onclick=function(){ $$("#pl button").forEach(function(x){ x.classList.toggle("on",x===b); });
      var id=b.getAttribute("data-p"); pick=id?list.filter(function(p){ return p.id===id; })[0]:"new";
      var hasProf=pick!=="new" && (pick.blocks||[]).some(function(x){ return x.type==="profile"; });
      var opts=[["block","новым блоком «Фото»"],["bg","фоном страницы"]].concat(hasProf?[["avatar","фото в профиль"]]:[]);
      where="block"; var w=$("#wh"); w.innerHTML=""; w.appendChild(choice("Куда",opts,where,function(v){ where=v; })); $("#pgGo").disabled=false; }; });
    $("#pgGo").onclick=function(){
      var p=pick==="new" ? fromTemplate("blank") : fixPage(JSON.parse(JSON.stringify(pick)));
      if(pick==="new"){ p.id="p"+Date.now().toString(36)+Math.random().toString(36).slice(2,6); p.title=W.title; }
      if(where==="bg"){ p.bg.mode="photo"; p.bg.img=imageFor(1600,330000); p.bg.fit="cover"; }
      else if(where==="avatar"){ var pr=p.blocks.filter(function(x){ return x.type==="profile"; })[0]; pr.c.img=imageFor(520,90000); }
      else { var b=newBlock("image",nextUid(p)); b.c.img=imageFor(1400,330000); p.blocks.push(b); }
      p.updated=Date.now(); save();
      pagePut(p).then(function(){ closeModal(); toast("Отправлено, открываю страницу"); setTimeout(function(){ location.href="../HTML-CSS-JS/#"+p.id; },500); })
        .catch(function(){ toast("Не получилось записать страницу"); });
    };
  }).catch(function(){ toast("Конструктор страниц недоступен в этом браузере"); });
}
/* картинка пришла из конструктора страниц: кнопка «На страницу» возвращает её обратно на то же место */
$("#retBtn").onclick=function(){
  var r=W.ret; if(!r) return; if(ui.brush) endBrush();
  pagesAll().then(function(list){
    var p=list.filter(function(x){ return x.id===r.pid; })[0]; if(!p){ toast("Эта страница уже удалена"); return; }
    fixPage(p); var url=imageFor(r.max||1200, r.kind==="bg"?330000:(r.max<=600?90000:330000));
    if(r.kind==="bg"){ p.bg.mode="photo"; p.bg.img=url; }
    else { var b=null; p.blocks.forEach(function(x){ if(x.uid===r.uid) b=x; });
      if(!b){ toast("Блок с этим фото на странице уже удалён"); return; }
      if(r.kind==="item"){ if(b.c.L&&b.c.L[r.i]) b.c.L[r.i][r.key]=url; } else b.c[r.key]=url; }
    p.updated=Date.now(); save();
    return pagePut(p).then(function(){ toast("Готово, возвращаюсь на страницу"); setTimeout(function(){ location.href="../HTML-CSS-JS/#"+p.id; },500); });
  }).catch(function(){ toast("Не получилось вернуть картинку"); });
};

/* ═══════════ окна, подсказки, клавиши ═══════════ */
function modal(h){ $("#mbox").innerHTML=h; $("#modal").classList.add("on"); }
function closeModal(){ $("#modal").classList.remove("on"); }
$("#modal").addEventListener("click",function(e){ if(e.target.id==="modal"||e.target.closest("[data-close]")) closeModal(); });
function ask(text,ok){ return new Promise(function(res){ modal('<h3>'+esc(text)+'</h3><div class="row"><button class="btn" data-n>Отмена</button><button class="btn go" data-y>'+esc(ok)+'</button></div>');
  $("#mbox [data-n]").onclick=function(){ closeModal(); res(false); }; $("#mbox [data-y]").onclick=function(){ closeModal(); res(true); }; }); }
var tT=0; function toast(t){ var e=$("#toast"); e.textContent=t; e.classList.add("on"); clearTimeout(tT); tT=setTimeout(function(){ e.classList.remove("on"); },2600); }
var hintOff=false; function hideHint(){ if(hintOff) return; hintOff=true; $("#hint").classList.add("off"); }
addEventListener("keydown",function(e){
  if($("#ed").hidden) return; if($("#modal").classList.contains("on")){ if(e.key==="Escape") closeModal(); return; }
  if(/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) return;
  var k=e.key.toLowerCase(), L=curL(), mod=e.ctrlKey||e.metaKey;
  if(mod&&k==="z"){ e.preventDefault(); $(e.shiftKey?"#redo":"#undo").click(); return; }
  if(mod&&k==="y"){ e.preventDefault(); $("#redo").click(); return; }
  if(ui.crop){ if(k==="escape"||k==="enter"){ e.preventDefault(); endCrop(); } return; }
  if(mod&&k==="a"){ e.preventDefault(); setSel(W.layers.filter(function(x){ return !x.hidden&&!x.locked; }).map(function(x){ return x.id; })); return; }
  if(mod&&k==="d"&&L){ e.preventDefault(); dupSel(); return; }
  if(mod&&k==="g"){ e.preventDefault(); if(e.shiftKey) doUngroup(); else doGroup(); return; }
  if(k==="escape"){ if(ui.pick){ ui.pick=null; stage.classList.remove("picking"); } else if(ui.pen) endPen(); else if(ui.brush) endBrush(); else if(sel){ MS=[]; sel=null; refreshInsp(); if(ui.tab==="layers") refreshPane(); draw(); } return; }
  if(!L) return;
  if(k==="delete"||k==="backspace"){ e.preventDefault(); delSel(); return; }
  var st=e.shiftKey?10:1, mv={arrowleft:[-st,0],arrowright:[st,0],arrowup:[0,-st],arrowdown:[0,st]}[k];
  if(mv){ var Ls=selLs().filter(function(x){ return !x.locked; }); if(!Ls.length) return; e.preventDefault(); remember("nudge"); Ls.forEach(function(x){ x.x+=mv[0]; x.y+=mv[1]; }); draw(); save(); }
});
$("#title").addEventListener("input",function(){ remember("title"); W.title=this.value; save(); });

/* ═══════════ мои работы ═══════════ */
function showHome(){
  $("#ed").hidden=true; $("#home").hidden=false; document.title=TR("FORGE · графическая мастерская");
  try{ history.replaceState(null,"",location.pathname); }catch(e){}
  dbAll().then(function(list){ list.sort(function(a,b){ return (b.updated||0)-(a.updated||0); });
    var my=$("#myWorks"); my.innerHTML="";
    if(!list.length) my.appendChild(el('<p class="note">Здесь появятся ваши работы. Начните с размера или шаблона ниже.</p>'));
    list.forEach(function(w){ var d=new Date(w.updated||Date.now()), when=d.toLocaleDateString(window.FLANG||"ru",{day:"numeric",month:"short"});
      var n=el('<div class="pg"><button class="th wk">'+(w.thumb?'<img src="'+w.thumb+'" alt="">':'')+'</button><b>'+esc(w.title)+'</b><small>'+when+', '+w.w+'x'+w.h+'</small><div class="acts"><button data-a="copy">копия</button><button data-a="del">удалить</button></div></div>');
      $(".th",n).onclick=function(){ openWork(w); };
      $$(".acts button",n).forEach(function(b){ b.onclick=function(){ if(b.getAttribute("data-a")==="copy"){ var c=JSON.parse(JSON.stringify(w)); c.id=newId(); c.title=TR("{0} (копия)",w.title); c.updated=Date.now(); dbPut(c).then(showHome); }
        else ask(TR("Удалить работу «{0}»? Вернуть её не получится.",w.title),TR("Удалить")).then(function(y){ if(y) dbDel(w.id).then(showHome); }); }; });
      my.appendChild(n); }); });
  var sz=$("#sizes"); sz.innerHTML="";
  GSIZES.concat([{id:"own",name:"Свой размер",w:0,h:0,note:"любые стороны"}]).forEach(function(s){
    var k=s.w?38/Math.max(s.w,s.h):0, iw=s.w?Math.round(s.w*k):30, ih=s.h?Math.round(s.h*k):30;
    var n=el('<button class="sz1'+(s.id==="own"?" own":"")+'"><i style="width:'+iw+'px;height:'+ih+'px'+(s.round?';border-radius:50%':'')+'"></i><b>'+esc(s.name)+'</b><small>'+(s.w?s.w+" x "+s.h:"")+(s.note?(s.w?", ":"")+esc(TR(s.note)):"")+'</small></button>');
    n.onclick=function(){ if(s.id==="own") ownSize(); else create(newWork(s.id)); }; sz.appendChild(n); });
  var tw=$("#tplWrap"); tw.innerHTML=""; tplGrid(tw,function(id){ create(fromGTemplate(id)); });
}
function ownSize(){ modal('<h3>Свой размер</h3><div class="two"><div class="f"><label>Ширина, px</label><input type="number" id="oW" value="1200"></div><div class="f"><label>Высота, px</label><input type="number" id="oH" value="800"></div></div><div class="row"><button class="btn" data-close>Отмена</button><button class="btn go" id="oGo">Создать</button></div>');
  $("#oGo").onclick=function(){ var w=Math.max(16,Math.min(8000,+$("#oW").value||1200)), h=Math.max(16,Math.min(8000,+$("#oH").value||800)); closeModal(); create(newWork("own",w,h)); }; }
function create(w){ w.id=newId(); w.updated=Date.now(); w.thumb=""; dbPut(w).then(function(){ openWork(w); }).catch(function(){ openWork(w); }); }
function openWork(w){
  if(ui.crop) endCrop(); W=fixWork(w); if(!W.assets) W.assets={}; U=[]; Rd=[]; undoBtns(); sel=null; MS=[]; fit(); PROC_reset();
  $("#retBtn").hidden=!W.ret; if(W.ret) $("#retBtn").title=TR("Вернуть картинку на страницу «{0}»",W.ret.title||"");
  $("#home").hidden=true; $("#ed").hidden=false; document.title="FORGE · "+W.title; $("#title").value=W.title;
  try{ history.replaceState(null,"",location.pathname+"#"+W.id); }catch(e){}
  requestAnimationFrame(function(){ resize(); });
  if(wide.matches) openTab("add"); else closeSheet(); refreshInsp();
  hintOff=false; $("#hint").classList.remove("off"); setTimeout(hideHint,7000);
  if(document.fonts&&document.fonts.ready) document.fonts.ready.then(draw);
}
$("#toHome").onclick=function(){ if(ui.pen) endPen(); if(ui.brush) endBrush(); save(); setTimeout(showHome,520); };

(function boot(){ var h=location.hash.slice(1);
  /* #tpl=<id>: «Сделать такую же» с главной кузни */
  if(/^tpl=/.test(h)){ var tid=decodeURIComponent(h.slice(4)); if(GTEMPLATES.some(function(t){ return t.id===tid; })){ try{ history.replaceState(null,"",location.pathname); }catch(e){} create(fromGTemplate(tid)); return; } }
  if(h) dbGet(h).then(function(w){ if(w) openWork(w); else showHome(); }); else showHome(); })();
})();
