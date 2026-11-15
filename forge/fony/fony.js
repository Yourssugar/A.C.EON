/* FORGE фоны: редактор. Превью с ручками, панели, хранение, сохранение картинкой, SVG, CSS, ссылкой, отправка в страницы и графику. */
(function(){
"use strict";
var $=function(s,r){ return (r||document).querySelector(s); };
var $$=function(s,r){ return [].slice.call((r||document).querySelectorAll(s)); };
var wide=matchMedia("(min-width:960px)");
var K=FONY.KINDS;
function el(html, fn){ var d=document.createElement("div"); d.innerHTML=html.trim(); var n=d.firstElementChild; if(fn) fn(n); return n; }
function sh(t){ return el('<div class="sh">'+esc(t)+'</div>'); }
function range(label,v,min,max,step,unit,fn,done){ return el('<div class="f"><div class="lab"><span>'+esc(label)+'</span><output>'+v+unit+'</output></div><input type="range" min="'+min+'" max="'+max+'" step="'+step+'" value="'+v+'"></div>',function(n){
  var o=$("output",n), i=$("input",n); i.oninput=function(){ o.textContent=i.value+unit; fn(Number(i.value)); }; i.onchange=function(){ if(done) done(); }; }); }
function toggle(label,v,fn){ return el('<label class="tg"><span>'+esc(label)+'</span><input type="checkbox"'+(v?" checked":"")+'></label>',function(n){ $("input",n).onchange=function(){ fn(this.checked); }; }); }
var uid=0; function thumb(b,w,h){ return FONY.svg(JSON.parse(JSON.stringify(b)),w,h,{id:"t"+(++uid)+"_"}); }
function fmtWH(fmt){ var f=FONY.FMTS[fmt]||FONY.FMTS.wide; return [f.w,f.h]; }
function thumbWH(b,max){ var s=fmtWH(b.fmt==="tile"?"sq":b.fmt), k=max/Math.max(s[0],s[1]); return [Math.round(s[0]*k*2),Math.round(s[1]*k*2)]; }

/* ═══════════ хранение ═══════════ */
var dbp=null;
function db(){ if(dbp) return dbp; dbp=new Promise(function(res,rej){ try{ var r=indexedDB.open("forge-fony",1);
  r.onupgradeneeded=function(){ r.result.createObjectStore("bgs",{keyPath:"id"}); }; r.onsuccess=function(){ res(r.result); }; r.onerror=function(){ rej(r.error); }; }catch(e){ rej(e); } }).catch(function(){ return null; }); return dbp; }
function dbAll(){ return db().then(function(d){ if(!d) return []; return new Promise(function(res){ var q=d.transaction("bgs").objectStore("bgs").getAll(); q.onsuccess=function(){ res(q.result||[]); }; q.onerror=function(){ res([]); }; }); }); }
function dbGet(id){ return db().then(function(d){ if(!d) return null; return new Promise(function(res){ var q=d.transaction("bgs").objectStore("bgs").get(id); q.onsuccess=function(){ res(q.result||null); }; q.onerror=function(){ res(null); }; }); }); }
function dbPut(b){ return db().then(function(d){ if(!d) throw new Error("nodb"); return new Promise(function(res,rej){ var t=d.transaction("bgs","readwrite"); t.objectStore("bgs").put(b); t.oncomplete=res; t.onerror=function(){ rej(t.error); }; }); }); }
function dbDel(id){ return db().then(function(d){ if(!d) return; return new Promise(function(res){ var t=d.transaction("bgs","readwrite"); t.objectStore("bgs").delete(id); t.oncomplete=res; t.onerror=res; }); }); }
function newId(){ return "f"+Date.now().toString(36)+Math.random().toString(36).slice(2,6); }

/* ═══════════ состояние, отмена ═══════════ */
var B=null, ui={ tab:null, sheet:false, txt:true };
var saveT=0;
function save(){ clearTimeout(saveT); saveT=setTimeout(function(){ if(!B) return; B.updated=Date.now(); dbPut(JSON.parse(JSON.stringify(B))).catch(function(){ toast("Не получилось сохранить: память браузера заполнена"); }); },400); }
var U=[], Rd=[], uKey="", uT=0;
function snap(){ var c=JSON.parse(JSON.stringify(B)); delete c.updated; return JSON.stringify(c); }
function remember(key){ var now=Date.now(); if(key&&key===uKey&&now-uT<900){ uT=now; return; } U.push(snap()); if(U.length>80) U.shift(); Rd=[]; uKey=key||""; uT=now; undoBtns(); }
function undoBtns(){ $("#undo").disabled=!U.length; $("#redo").disabled=!Rd.length; }
function restore(s){ var o=JSON.parse(s), id=B.id; B=o; B.id=id; uKey=""; undoBtns(); $("#title").value=B.title||""; render(); refresh(); save(); }
$("#undo").onclick=function(){ if(!U.length) return; Rd.push(snap()); restore(U.pop()); };
$("#redo").onclick=function(){ if(!Rd.length) return; U.push(snap()); restore(Rd.pop()); };
function changed(full){ FONY.fixBg(B); render(); save(); if(full) refresh(); }

/* ═══════════ превью ═══════════ */
var stage=$("#stage"), frame=$("#frame"), bgv=$("#bgv"), rq=0, tileUrl="";
function light(c){ var n=parseInt(c.slice(1),16); return (((n>>16)&255)*.299+((n>>8)&255)*.587+(n&255)*.114)>165; }
function layout(){
  var tile=B.fmt==="tile", s=tile?[16,9]:fmtWH(B.fmt), wr=$("#fwrap").getBoundingClientRect();
  var mw=Math.max(120,wr.width-(wide.matches?36:12)), mh=Math.max(120,wr.height-(wide.matches?8:0));
  if(!wide.matches&&ui.sheet){ var rt=right.getBoundingClientRect().top; mh=Math.min(mh,Math.max(120,rt-wr.top-10)); }
  var ar=s[0]/s[1], w=Math.min(mw,mh*ar), h=w/ar;
  frame.style.width=Math.round(w)+"px"; frame.style.height=Math.round(h)+"px";
  return [w,h];
}
function render(){ cancelAnimationFrame(rq); rq=requestAnimationFrame(draw); }
function draw(){
  if(!B) return; FONY.fixBg(B);
  var fs=layout(), tile=B.fmt==="tile";
  frame.classList.toggle("ph",B.fmt==="phone"); frame.classList.toggle("light",light(B.pal[B.kind==="rays"?1:0]));
  $("#sample").hidden=!ui.txt;
  if(tile){
    var s=FONY.svg(B,400,400,{anim:true,id:"p_"}); if(tileUrl) URL.revokeObjectURL(tileUrl);
    tileUrl=URL.createObjectURL(new Blob([s],{type:"image/svg+xml"}));
    bgv.innerHTML=""; bgv.className="bgv tile"; var px=Math.max(40,fs[0]*400/1600); bgv.style.backgroundImage='url("'+tileUrl+'")'; bgv.style.backgroundSize=px+"px "+px+"px";
  }else{
    var wh=fmtWH(B.fmt); bgv.className="bgv"; bgv.style.backgroundImage=""; bgv.innerHTML=FONY.svg(B,wh[0],wh[1],{anim:true,id:"p_"});
    var sv=bgv.firstElementChild; sv.removeAttribute("width"); sv.removeAttribute("height"); sv.setAttribute("preserveAspectRatio","none");
  }
  handles();
  $$("#fmtSeg button").forEach(function(b){ var f=b.getAttribute("data-f"); b.classList.toggle("on",f===B.fmt); b.disabled=f==="tile"&&!K[B.kind].tile; b.style.opacity=b.disabled?.35:""; });
  $$("#txtSeg button").forEach(function(b){ b.classList.toggle("on",(b.getAttribute("data-t")==="1")===ui.txt); });
  $("#hint").textContent=B.fmt==="tile"?TR("Плитка повторяется без швов: так её можно класть фоном на всю страницу."):TR(K[B.kind].hint);
}
/* ручки: точки фона, двигаются пальцем и мышкой, простое нажатие открывает выбор цвета этой точки */
function handles(){
  $$(".fhd",frame).forEach(function(n){ n.remove(); });
  if(B.fmt==="tile") return;
  B.pts.forEach(function(p,i){
    var col=K[B.kind].ptc?K[B.kind].ptc(B,i):"#fff";
    var h=el('<button class="fhd" title="'+esc(TR("Тяните, чтобы двигать. Нажмите, чтобы сменить цвет"))+'"><i style="background:'+col+'"></i></button>');
    h.style.left=p[0]*100+"%"; h.style.top=p[1]*100+"%";
    h.onpointerdown=function(e){ drag(e,i,h); };
    frame.appendChild(h);
  });
}
function drag(e,i,h){
  e.preventDefault(); var r=frame.getBoundingClientRect(), x0=e.clientX, y0=e.clientY, moved=false, p0=B.pts[i].slice();
  try{ h.setPointerCapture(e.pointerId); }catch(x){}
  function mv(ev){ var dx=ev.clientX-x0, dy=ev.clientY-y0; if(!moved&&Math.hypot(dx,dy)<5) return;
    if(!moved){ moved=true; remember(); }
    var nx=Math.max(-.1,Math.min(1.1,p0[0]+dx/r.width)), ny=Math.max(-.1,Math.min(1.1,p0[1]+dy/r.height));
    B.pts[i]=[Math.round(nx*1000)/1000,Math.round(ny*1000)/1000]; h.style.left=nx*100+"%"; h.style.top=ny*100+"%"; liveDraw(); }
  function up(){ h.removeEventListener("pointermove",mv); h.removeEventListener("pointerup",up); h.removeEventListener("pointercancel",up);
    if(moved){ save(); render(); } else pickColor(colorIndexOf(i)); }
  h.addEventListener("pointermove",mv); h.addEventListener("pointerup",up); h.addEventListener("pointercancel",up);
}
var lq=0; function liveDraw(){ cancelAnimationFrame(lq); lq=requestAnimationFrame(function(){ var wh=fmtWH(B.fmt); bgv.innerHTML=FONY.svg(B,wh[0],wh[1],{anim:false,id:"p_"}); var sv=bgv.firstElementChild; sv.removeAttribute("width"); sv.removeAttribute("height"); sv.setAttribute("preserveAspectRatio","none"); }); }
function colorIndexOf(i){ var k=B.kind; if(k==="topo") return 1+i%3; if(k==="lowpoly") return i?3:1; if(k==="rays") return 3; if(k==="dots"||k==="grid") return 1; return 1+i%4; }
function pickColor(ci){ var p=$("#pick"); p.value=B.pal[ci]; p.oninput=function(){ remember("c"+ci); B.pal[ci]=p.value; render(); save(); if(wide.matches||ui.sheet==="insp") refreshInsp(); }; p.click(); }
$$("#fmtSeg button").forEach(function(b){ b.onclick=function(){ var f=b.getAttribute("data-f"); if(f===B.fmt||b.disabled) return; remember(); B.fmt=f; changed(true); }; });
$$("#txtSeg button").forEach(function(b){ b.onclick=function(){ ui.txt=b.getAttribute("data-t")==="1"; render(); }; });
addEventListener("resize",function(){ if(B&&!$("#ed").hidden) render(); });
if(window.ResizeObserver) new ResizeObserver(function(){ if(B&&!$("#ed").hidden) render(); }).observe($("#fwrap"));

/* ═══════════ панели ═══════════ */
var pane=$("#pane"), insp=$("#insp"), right=$("#right");
var TT={ kind:"Вид", tpl:"Шаблоны", set:"Настройки", more:"Ещё" };
function tabBox(){ return wide.matches?pane:insp; }
function openTab(t){
  if(t==="set"){ openInsp(); return; }
  ui.tab=t; $$("#tabs button").forEach(function(b){ b.classList.toggle("on",b.getAttribute("data-tab")===t); });
  if(!wide.matches){ ui.sheet="tab"; right.classList.add("open"); right.classList.remove("full","peek"); $("#shTitle").textContent=TR(TT[t]); }
  refreshPane(); tabBox().scrollTop=0; render(); setTimeout(render,260); }
function openInsp(){
  if(!wide.matches){ ui.sheet="insp"; right.classList.add("open"); right.classList.remove("full","peek"); $$("#tabs button").forEach(function(b){ b.classList.toggle("on",b.getAttribute("data-tab")==="set"); }); ui.tab=null; $("#shTitle").textContent=TR(K[B.kind].name); }
  refreshInsp(); insp.scrollTop=0; render(); setTimeout(render,260); }
function closeSheet(){ if(wide.matches) return; ui.sheet=false; ui.tab=null; right.classList.remove("open","full","peek"); $$("#tabs button").forEach(function(b){ b.classList.remove("on"); }); render(); }
$("#shClose").onclick=closeSheet;
$$("#tabs button").forEach(function(b){ b.onclick=function(){ var t=b.getAttribute("data-tab");
  if(!wide.matches&&((ui.sheet==="tab"&&ui.tab===t)||(t==="set"&&ui.sheet==="insp"))) closeSheet(); else openTab(t); }; });
(function(){ var h=$(".sh-h"), y0=0, h0=0, on=false;
  h.addEventListener("pointerdown",function(e){ if(wide.matches||e.target.closest("button")) return; on=true; y0=e.clientY; h0=right.getBoundingClientRect().height; right.style.transition="none"; try{ h.setPointerCapture(e.pointerId); }catch(x){} });
  h.addEventListener("pointermove",function(e){ if(on) right.style.height=Math.max(80,h0-(e.clientY-y0))+"px"; });
  h.addEventListener("pointerup",function(e){ if(!on) return; on=false; right.style.transition=""; var nh=h0-(e.clientY-y0), vh=innerHeight; right.style.height=""; right.classList.remove("full","peek");
    if(nh<vh*.2) closeSheet(); else if(nh<vh*.42) right.classList.add("peek"); else if(nh>vh*.65) right.classList.add("full"); render(); });
})();
wide.addEventListener("change",function(){ right.classList.remove("open"); ui.sheet=false; if(wide.matches) openTab(ui.tab&&ui.tab!=="set"?ui.tab:"kind"); refreshInsp(); render(); });
function refresh(){ refreshPane(); refreshInsp(); }
function refreshPane(){ if(!ui.tab) return; if(!wide.matches&&ui.sheet!=="tab") return; var box=tabBox(), sc=box.scrollTop; box.innerHTML="";
  ({ kind:paneKind, tpl:paneTpl, more:paneMore })[ui.tab](box); box.scrollTop=sc; }

/* ── вид: смена вида сохраняет цвета ── */
function kindGrid(box, onPick, cur){
  var g=el('<div class="kinds"></div>');
  FONY.ORDER.forEach(function(k){ var b=FONY.newBg(k,cur?B.pal:FONY.PALS[FONY.ORDER.indexOf(k)%FONY.PALS.length][1],cur?B.seed:FONY.ORDER.indexOf(k)*7+3); b.grain=0;
    var n=el('<button class="kind'+(cur&&B.kind===k?" on":"")+'"><div class="th">'+thumb(b,320,180)+'</div><b>'+esc(K[k].name)+'</b></button>');
    n.onclick=function(){ onPick(k); }; g.appendChild(n); });
  box.appendChild(g); }
function paneKind(box){
  box.appendChild(sh("Что рисуем"));
  kindGrid(box,function(k){ if(k===B.kind) return; remember(); var nb=FONY.newBg(k,B.pal,B.seed); nb.grain=B.grain; nb.anim=B.anim; nb.fmt=(B.fmt==="tile"&&!K[k].tile)?"wide":B.fmt;
    nb.id=B.id; nb.title=B.title; nb.updated=B.updated; B=nb; changed(true); if(!wide.matches) openInsp(); },true);
  box.appendChild(el('<p class="note" style="margin-top:12px">Цвета переходят в новый вид. Вернуть прошлый: стрелка отмены.</p>'));
}
function tplGrid(box,onPick){
  var g=el('<div class="kinds'+(box.id==="tplHome"?" big":"")+'"></div>');
  FONY.TPLS.forEach(function(t){ var b=FONY.fromTpl(t.id); b.fmt="wide";
    var n=el('<button class="kind"><div class="th">'+thumb(b,320,180)+'</div><b>'+esc(t.name)+'</b></button>'); n.onclick=function(){ onPick(t.id); }; g.appendChild(n); });
  box.appendChild(g); }
function paneTpl(box){
  box.appendChild(sh("Шаблоны"));
  tplGrid(box,function(id){ remember(); var nb=FONY.fromTpl(id); nb.fmt=K[nb.kind].tile||B.fmt!=="tile"?B.fmt:"wide"; nb.id=B.id; nb.title=TR(nb.title); nb.updated=B.updated; B=nb; $("#title").value=B.title; changed(true); toast(TR("Шаблон открыт. Вернуть прошлое: стрелка отмены")); });
}
function paneMore(box){
  box.appendChild(el('<div class="f"><label>Название</label><input type="text" id="mT" maxlength="80"></div>',function(n){ var i=$("input",n); i.value=B.title||""; i.oninput=function(){ remember("title"); B.title=i.value; $("#title").value=i.value; save(); }; }));
  box.appendChild(sh("Сохранить"));
  [["png","Картинкой","PNG"],["svg","Вектором","SVG"],["css","Кодом для сайта","CSS"],["link","Поделиться ссылкой",""],["pages","В конструктор страниц",TR("фоном страницы")],["gfx","В графическую мастерскую",TR("фоном холста")]].forEach(function(a){
    box.appendChild(el('<button class="btn w">'+esc(a[1])+(a[2]?'<small>'+esc(a[2])+'</small>':'')+'</button>',function(n){ n.onclick=function(){ doAct(a[0]); }; })); });
  box.appendChild(sh("Фон"));
  box.appendChild(el('<button class="btn w">Сделать копию</button>',function(n){ n.onclick=function(){ var c=JSON.parse(JSON.stringify(B)); c.id=newId(); c.title=TR("{0} (копия)",B.title||""); c.updated=Date.now(); dbPut(c).then(function(){ openBg(c); toast(TR("Открыта копия")); }); }; }));
  box.appendChild(el('<button class="btn w del">Удалить фон</button>',function(n){ n.onclick=function(){ ask(TR("Удалить фон «{0}»? Вернуть его не получится.",B.title||""),TR("Удалить")).then(function(y){ if(y) dbDel(B.id).then(function(){ B=null; showHome(); }); }); }; }));
  box.appendChild(el('<p class="note" style="margin-top:8px">Фон сохраняется в этом браузере сам после каждого изменения. Перенести его на другое устройство проще всего ссылкой.</p>'));
}

/* ── настройки выбранного вида ── */
function refreshInsp(){
  if(!B) return; if(!wide.matches&&ui.sheet!=="insp") return;
  var k=K[B.kind], sc=insp.scrollTop; insp.innerHTML="";
  if(wide.matches) $("#shTitle").textContent=TR(k.name);
  insp.appendChild(sh("Цвета"));
  var names=["основа","1","2","3","4"];
  insp.appendChild(el('<div class="f fsw">'+B.pal.map(function(c,i){ return '<label><span style="background:'+c+'"><input type="color" value="'+c+'" data-i="'+i+'"></span>'+esc(names[i])+'</label>'; }).join("")+'</div>',function(n){
    $$("input",n).forEach(function(inp){ inp.oninput=function(){ var i=+inp.getAttribute("data-i"); remember("c"+i); B.pal[i]=inp.value; inp.parentNode.style.background=inp.value; render(); save(); }; }); }));
  insp.appendChild(el('<div class="f pals">'+FONY.PALS.map(function(p,i){ var on=p[1].join()===B.pal.join(); return '<button data-i="'+i+'" class="'+(on?"on":"")+'"><i>'+p[1].map(function(c){ return '<u style="background:'+c+'"></u>'; }).join("")+'</i>'+esc(p[0])+'</button>'; }).join("")+'</div>',function(n){
    $$("button",n).forEach(function(b){ b.onclick=function(){ remember(); B.pal=FONY.PALS[+b.getAttribute("data-i")][1].slice(); changed(true); }; }); }));
  insp.appendChild(el('<div class="row" style="margin-bottom:6px"><button class="btn" data-a="seed">Перемешать</button><button class="btn" data-a="pal">Новые цвета</button></div>',function(n){
    $("[data-a=seed]",n).onclick=function(){ remember(); B.seed=Math.floor(Math.random()*1e6); if(B.kind==="aurora"||B.kind==="blobs"||B.kind==="topo") B.pts=B.pts.map(function(){ return [Math.round((.1+Math.random()*.8)*1000)/1000,Math.round((.1+Math.random()*.8)*1000)/1000]; }); changed(false); };
    $("[data-a=pal]",n).onclick=function(){ remember(); B.pal=FONY.randomPal(); changed(true); }; }));
  insp.appendChild(sh("Настройки"));
  k.params.forEach(function(p){ insp.appendChild(range(p.label,B.p[p.id],p.min,p.max,p.step||1,"",function(v){ remember("p"+p.id); B.p[p.id]=v; FONY.fixBg(B); render(); save(); })); });
  insp.appendChild(range(TR("Зерно"),B.grain,0,60,1,"",function(v){ remember("grain"); B.grain=v; render(); save(); }));
  insp.appendChild(toggle(TR("Плавно двигается"),!!B.anim,function(v){ remember(); B.anim=v; render(); save(); }));
  insp.appendChild(el('<p class="note">Движение сохраняется в SVG и CSS. Картинка PNG всегда неподвижная.</p>'));
  if(wide.matches){
    insp.appendChild(sh("Сохранить"));
    insp.appendChild(el('<div class="row"><button class="btn" data-a="png">PNG</button><button class="btn" data-a="svg">SVG</button><button class="btn" data-a="css">CSS</button></div>',function(n){ $$("button",n).forEach(function(b){ b.onclick=function(){ doAct(b.getAttribute("data-a")); }; }); }));
    insp.appendChild(el('<button class="btn w" style="margin-top:8px">В конструктор страниц<small>фоном страницы</small></button>',function(n){ n.onclick=function(){ doAct("pages"); }; }));
    insp.appendChild(el('<button class="btn w">В графическую мастерскую<small>фоном холста</small></button>',function(n){ n.onclick=function(){ doAct("gfx"); }; }));
  }
  insp.scrollTop=sc;
}

/* ═══════════ сохранение ═══════════ */
function svgBlob(w,h,anim){ return new Blob([FONY.svg(JSON.parse(JSON.stringify(B)),w,h,{anim:anim,id:"x"})],{type:"image/svg+xml"}); }
function rasterize(w,h){ return new Promise(function(res,rej){
  var tile=B.fmt==="tile", u=URL.createObjectURL(svgBlob(tile?Math.min(w,h):w,tile?Math.min(w,h):h,false)), im=new Image();
  im.onload=function(){ var c=document.createElement("canvas"); c.width=w; c.height=h; c.getContext("2d").drawImage(im,0,0,w,h); URL.revokeObjectURL(u); res(c); };
  im.onerror=function(){ URL.revokeObjectURL(u); rej(new Error("img")); }; im.src=u; }); }
/* фон плиткой на большой холст (для графики) */
function rasterTiled(w,h,ts){ return rasterize(ts,ts).then(function(t){ var c=document.createElement("canvas"); c.width=w; c.height=h; var g=c.getContext("2d"); g.fillStyle=g.createPattern(t,"repeat"); g.fillRect(0,0,w,h); return c; }); }
function fname(){ return (B.title||"fon").trim().toLowerCase().replace(/[^\p{L}\p{N}]+/gu,"-").replace(/^-+|-+$/g,"").slice(0,40)||"fon"; }
function dl(blob,name){ var a=document.createElement("a"); a.href=URL.createObjectURL(blob); a.download=name; document.body.appendChild(a); a.click(); setTimeout(function(){ URL.revokeObjectURL(a.href); a.remove(); },1500); }
var webpOk=(function(){ try{ var c=document.createElement("canvas"); c.width=c.height=1; return c.toDataURL("image/webp").indexOf("data:image/webp")===0; }catch(e){ return false; } })();
function compact(c,target){ var type=webpOk?"image/webp":"image/jpeg", q=.9, url=c.toDataURL(type,q); while(url.length*.75>target&&q>.45){ q-=.08; url=c.toDataURL(type,q); } return url; }

function doAct(a){
  if(a==="png") return pngDlg();
  if(a==="svg"){ var wh=B.fmt==="tile"?[400,400]:fmtWH(B.fmt); dl(svgBlob(wh[0],wh[1],true),fname()+".svg"); toast(TR("Файл SVG сохранён")); return; }
  if(a==="css") return cssDlg();
  if(a==="link") return linkDlg();
  if(a==="pages") return toPages();
  if(a==="gfx") return toGfx();
}
$("#saveBtn").onclick=function(){ if(wide.matches) pngDlg(); else openTab("more"); };

function pngDlg(){
  var f=FONY.FMTS[B.fmt], sel=f.ex[0];
  modal('<h3>Сохранить картинкой</h3><div class="sizes2 chips" id="exS">'+f.ex.map(function(s,i){ return '<button data-i="'+i+'" class="'+(i?"":"on")+'">'+s[0]+' x '+s[1]+'</button>'; }).join("")+'<button data-i="own">свой</button></div>'+
    '<div class="two" id="exOwn" hidden><div class="f"><label>Ширина, px</label><input type="number" id="eW" value="'+sel[0]+'"></div><div class="f"><label>Высота, px</label><input type="number" id="eH" value="'+sel[1]+'"></div></div>'+
    '<div class="row"><button class="btn" data-close>Отмена</button><button class="btn go" id="exGo">Сохранить PNG</button></div>');
  $$("#exS button").forEach(function(b){ b.onclick=function(){ $$("#exS button").forEach(function(x){ x.classList.toggle("on",x===b); }); var i=b.getAttribute("data-i");
    $("#exOwn").hidden=i!=="own"; if(i!=="own") sel=f.ex[+i]; }; });
  $("#exGo").onclick=function(){ var w=sel[0], h=sel[1];
    if(!$("#exOwn").hidden){ w=Math.max(16,Math.min(8000,+$("#eW").value||1920)); h=Math.max(16,Math.min(8000,+$("#eH").value||1080)); }
    $("#exGo").disabled=true; $("#exGo").textContent=TR("Собираю картинку...");
    (B.fmt==="tile"&&(w!==h)?rasterTiled(w,h,512):rasterize(w,h)).then(function(c){ c.toBlob(function(bl){ dl(bl,fname()+"-"+w+"x"+h+".png"); closeModal(); toast(TR("Картинка сохранена")); },"image/png"); })
      .catch(function(){ closeModal(); toast(TR("Не получилось собрать картинку")); }); };
}
function cssDlg(){
  var wh=fmtWH(B.fmt==="tile"?"wide":B.fmt), r=FONY.css(JSON.parse(JSON.stringify(B)),wh[0]*1.2,wh[1]*1.2);
  var html='<div class="fon">\n  <!-- содержимое блока -->\n</div>';
  modal('<h3>Код для сайта</h3><p class="note">Класс .fon можно повесить на любой блок или на body. '+(B.anim?'Движение уже внутри кода.':'')+'</p><pre class="css" id="cssT"></pre>'+
    '<div class="row"><button class="btn" data-close>Закрыть</button><button class="btn go" id="cssC">Скопировать CSS</button></div>');
  $("#cssT").textContent=r.css+"\n\n/* "+TR("пример")+": */\n/* "+html.replace(/\n/g," ")+" */";
  $("#cssC").onclick=function(){ copyText(r.css).then(function(){ toast(TR("Скопировано")); }); };
}
function copyText(t){ if(navigator.clipboard) return navigator.clipboard.writeText(t).catch(function(){ return fallback(); }); return Promise.resolve(fallback());
  function fallback(){ var x=document.createElement("textarea"); x.value=t; document.body.appendChild(x); x.select(); try{ document.execCommand("copy"); }catch(e){} x.remove(); } }
/* ссылка: весь фон помещается в адрес после #, на сервер он не уходит */
function b64e(s){ return btoa(unescape(encodeURIComponent(s))).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,""); }
function b64d(s){ s=s.replace(/-/g,"+").replace(/_/g,"/"); while(s.length%4) s+="="; return decodeURIComponent(escape(atob(s))); }
function shareCode(){ var c={ k:B.kind, c:B.pal, s:B.seed, p:B.p, t:B.pts, g:B.grain, a:B.anim?1:0, f:B.fmt, n:B.title||"" }; return b64e(JSON.stringify(c)); }
function fromShare(code){ var o=JSON.parse(b64d(code)); if(!o||!K[o.k]) throw new Error("bad"); var b=FONY.newBg(o.k,o.c,o.s); b.p=o.p||b.p; b.pts=o.t||b.pts; b.grain=o.g||0; b.anim=!!o.a; b.fmt=o.f||"wide"; b.title=o.n||TR(K[o.k].name); return FONY.fixBg(b); }
function linkDlg(){
  var url=location.origin+location.pathname+"#s="+shareCode();
  modal('<h3>Ссылка на фон</h3><p class="note">Фон целиком лежит в самой ссылке, на сервер ничего не уходит. Кто откроет, получит свою копию.</p><div class="link">'+esc(url)+'</div>'+
    '<div class="row"><button class="btn" data-close>Закрыть</button>'+(navigator.share?'<button class="btn" id="lnS">Поделиться</button>':'')+'<button class="btn go" id="lnC">Скопировать</button></div>');
  $("#lnC").onclick=function(){ copyText(url).then(function(){ toast(TR("Ссылка скопирована")); }); };
  if($("#lnS")) $("#lnS").onclick=function(){ navigator.share({title:B.title,url:url}).catch(function(){}); };
}

/* ── в конструктор страниц: фоном страницы (плитка кладётся плиткой) ── */
function pagesDb(){ return new Promise(function(res,rej){ try{ var r=indexedDB.open("forge",1); r.onupgradeneeded=function(){ r.result.createObjectStore("pages",{keyPath:"id"}); };
  r.onsuccess=function(){ res(r.result); }; r.onerror=function(){ rej(r.error); }; }catch(e){ rej(e); } }); }
function pagesAll(){ return pagesDb().then(function(d){ return new Promise(function(res){ var q=d.transaction("pages").objectStore("pages").getAll(); q.onsuccess=function(){ res(q.result||[]); }; q.onerror=function(){ res([]); }; }); }); }
function pagePut(p){ return pagesDb().then(function(d){ return new Promise(function(res,rej){ var t=d.transaction("pages","readwrite"); t.objectStore("pages").put(p); t.oncomplete=res; t.onerror=function(){ rej(t.error); }; }); }); }
function toPages(){
  pagesAll().then(function(list){
    list.sort(function(a,b){ return (b.updated||0)-(a.updated||0); }); var pick="";
    modal('<h3>Фоном страницы</h3><p class="note">Выберите страницу. Картинка сожмётся до размера, который нужен странице.</p>'+
      '<div class="plist" id="pl"><button data-p="" class="on"><b>+ '+esc(TR("Новая страница"))+'</b><small>'+esc(TR("пустая"))+'</small></button>'+list.map(function(p){ return '<button data-p="'+esc(p.id)+'"><b>'+esc(p.title||TR("Страница"))+'</b><small>'+TR("{0} блоков",(p.blocks||[]).length)+'</small></button>'; }).join("")+'</div>'+
      '<div class="row"><button class="btn" data-close>Отмена</button><button class="btn go" id="pgGo">Отправить</button></div>');
    $$("#pl button").forEach(function(b){ b.onclick=function(){ $$("#pl button").forEach(function(x){ x.classList.toggle("on",x===b); }); pick=b.getAttribute("data-p"); }; });
    $("#pgGo").onclick=function(){ $("#pgGo").disabled=true; var tile=B.fmt==="tile";
      var wh=tile?[512,512]:(B.fmt==="phone"?[900,1950]:B.fmt==="sq"?[1400,1400]:[1600,900]);
      rasterize(wh[0],wh[1]).then(function(c){ var url=tile?c.toDataURL("image/png"):compact(c,330000); if(tile&&url.length*.75>250000) url=compact(c,200000);
        var p=pick?list.filter(function(x){ return x.id===pick; })[0]:null;
        if(!p){ p=fromTemplate("blank"); p.id="p"+Date.now().toString(36)+Math.random().toString(36).slice(2,5); p.title=B.title||p.title; }
        p=fixPage(p); p.bg.mode="photo"; p.bg.img=url; p.bg.fit=tile?"repeat":"cover"; p.bg.dark=0; p.bg.blur=0; p.bg.fx=50; p.bg.fy=50; p.updated=Date.now();
        return pagePut(p).then(function(){ toast(TR("Отправлено, открываю страницу")); setTimeout(function(){ location.href="../HTML-CSS-JS/#"+p.id; },500); });
      }).catch(function(){ closeModal(); toast(TR("Не получилось записать страницу")); }); };
  }).catch(function(){ toast(TR("Конструктор страниц недоступен в этом браузере")); });
}
/* ── в графику: новая работа того же формата, фон лежит слоем-фото с замком ── */
function gfxPut(w){ return new Promise(function(res,rej){ try{ var r=indexedDB.open("forge-gfx",1); r.onupgradeneeded=function(){ r.result.createObjectStore("works",{keyPath:"id"}); };
  r.onsuccess=function(){ var t=r.result.transaction("works","readwrite"); t.objectStore("works").put(w); t.oncomplete=res; t.onerror=function(){ rej(t.error); }; }; r.onerror=function(){ rej(r.error); }; }catch(e){ rej(e); } }); }
function toGfx(){
  var wh=B.fmt==="phone"?[1080,1920]:B.fmt==="sq"||B.fmt==="tile"?[1080,1080]:[1920,1080];
  toast(TR("Собираю картинку..."));
  (B.fmt==="tile"?rasterTiled(wh[0],wh[1],400):rasterize(wh[0],wh[1])).then(function(c){
    var url=compact(c,900000), aid="a"+Date.now().toString(36), id="w"+Date.now().toString(36)+Math.random().toString(36).slice(2,6);
    var w={ v:1, id:id, title:B.title||TR("Фон"), size:"own", w:wh[0], h:wh[1], round:false, bg:{ t:"color", c1:B.pal[0], c2:B.pal[1], ang:160 }, assets:{}, updated:Date.now(), thumb:"",
      layers:[{ id:"L"+Date.now().toString(36), t:"image", x:wh[0]/2, y:wh[1]/2, w:wh[0], h:wh[1], rot:0, op:1, blend:"source-over", src:aid, iw:wh[0], ih:wh[1], mask:null, feather:2, zoom:1, fx:50, fy:50,
        shape:"rect", r:0, f:{ preset:"none", br:0, ct:0, sat:0, warm:0, bw:0, sep:0, blur:0 }, locked:true }] };
    w.assets[aid]=url;
    return gfxPut(w).then(function(){ toast(TR("Отправлено, открываю графику")); setTimeout(function(){ location.href="../grafika/#"+id; },500); });
  }).catch(function(){ toast(TR("Не получилось отправить в графику")); });
}

/* ═══════════ окна ═══════════ */
function modal(h){ $("#mbox").innerHTML=h; $("#modal").classList.add("on"); }
function closeModal(){ $("#modal").classList.remove("on"); }
$("#modal").addEventListener("click",function(e){ if(e.target.id==="modal"||e.target.hasAttribute("data-close")) closeModal(); });
function ask(text,ok){ return new Promise(function(res){ modal('<h3>'+esc(text)+'</h3><div class="row"><button class="btn" data-n>Отмена</button><button class="btn go" data-y>'+esc(ok)+'</button></div>');
  $("#mbox [data-n]").onclick=function(){ closeModal(); res(false); }; $("#mbox [data-y]").onclick=function(){ closeModal(); res(true); }; }); }
var tT=0; function toast(t){ var e=$("#toast"); e.textContent=t; e.classList.add("on"); clearTimeout(tT); tT=setTimeout(function(){ e.classList.remove("on"); },2600); }
addEventListener("keydown",function(e){
  if($("#ed").hidden) return; if($("#modal").classList.contains("on")){ if(e.key==="Escape") closeModal(); return; }
  if(/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) return;
  var k=e.key.toLowerCase();
  if((e.ctrlKey||e.metaKey)&&k==="z"){ e.preventDefault(); $(e.shiftKey?"#redo":"#undo").click(); return; }
  if((e.ctrlKey||e.metaKey)&&k==="y"){ e.preventDefault(); $("#redo").click(); return; }
  if(k===" "&&!e.ctrlKey){ e.preventDefault(); remember(); B.seed=Math.floor(Math.random()*1e6); changed(false); }
});
$("#title").addEventListener("input",function(){ remember("title"); B.title=this.value; save(); });

/* ═══════════ мои фоны ═══════════ */
function showHome(){
  $("#ed").hidden=true; $("#home").hidden=false; document.title=TR("FORGE · фоны и узоры");
  try{ history.replaceState(null,"",location.pathname); }catch(e){}
  dbAll().then(function(list){ list.sort(function(a,b){ return (b.updated||0)-(a.updated||0); });
    var my=$("#myBgs"); my.innerHTML="";
    my.appendChild(el('<div class="fb"><button class="th new"><svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg></button><b>Новый</b><small>аврора</small></div>',function(n){ $("button",n).onclick=function(){ create(FONY.newBg("aurora",FONY.PALS[0][1])); }; }));
    list.forEach(function(b){ FONY.fixBg(b); var d=new Date(b.updated||Date.now()), when=d.toLocaleDateString(window.FLANG||"ru",{day:"numeric",month:"short"}), tw=thumbWH(b,176);
      var n=el('<div class="fb"><button class="th">'+thumb(b,tw[0],tw[1])+'</button><b>'+esc(b.title||"")+'</b><small>'+when+', '+esc(TR(K[b.kind].name).toLowerCase())+'</small><div class="acts"><button data-a="copy">копия</button><button data-a="del">удалить</button></div></div>');
      $("b",n).setAttribute("data-nt","");
      $(".th",n).onclick=function(){ openBg(b); };
      $$(".acts button",n).forEach(function(x){ x.onclick=function(){ if(x.getAttribute("data-a")==="copy"){ var c=JSON.parse(JSON.stringify(b)); c.id=newId(); c.title=TR("{0} (копия)",b.title||""); c.updated=Date.now(); dbPut(c).then(showHome); }
        else ask(TR("Удалить фон «{0}»?",b.title||""),TR("Удалить")).then(function(y){ if(y) dbDel(b.id).then(showHome); }); }; });
      my.appendChild(n); }); });
  var kh=$("#kindsHome"); kh.innerHTML=""; kindGrid(kh,function(k){ var i=FONY.ORDER.indexOf(k); create(FONY.newBg(k,FONY.PALS[i%FONY.PALS.length][1],i*7+3)); },false);
  kh.firstElementChild.className="kinds big";
  var th=$("#tplHome"); th.innerHTML=""; tplGrid(th,function(id){ var b=FONY.fromTpl(id); b.title=TR(b.title); create(b); });
}
function create(b){ b.id=newId(); b.updated=Date.now(); if(!b.title) b.title=TR(K[b.kind].name); dbPut(b).then(function(){ openBg(b); }).catch(function(){ openBg(b); }); }
function openBg(b){
  B=FONY.fixBg(b); U=[]; Rd=[]; undoBtns();
  $("#home").hidden=true; $("#ed").hidden=false; document.title="FORGE · "+(B.title||""); $("#title").value=B.title||"";
  try{ history.replaceState(null,"",location.pathname+"#"+B.id); }catch(e){}
  if(wide.matches){ openTab("kind"); refreshInsp(); } else closeSheet();
  render();
}
$("#toHome").onclick=function(){ save(); setTimeout(showHome,450); };

(function boot(){ var h=location.hash.slice(1);
  if(/^s=/.test(h)){ try{ var b=fromShare(h.slice(2)); create(b); setTimeout(function(){ toast(TR("Это ваша копия фона, меняйте как хотите")); },400); }catch(e){ showHome(); toast(TR("Ссылка повреждена")); } return; }
  if(/^tpl=/.test(h)){ var tid=decodeURIComponent(h.slice(4)); if(FONY.TPLS.some(function(t){ return t.id===tid; })){ var tb=FONY.fromTpl(tid); tb.title=TR(tb.title); create(tb); return; } }
  if(h) dbGet(h).then(function(b){ if(b) openBg(b); else showHome(); }); else showHome(); })();
})();
