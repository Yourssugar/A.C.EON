/* FORGE открытка с музыкой: редактор.
   Открытка: повод, как открывается, цвет, шрифт, фон из мастерской фонов (FONY), что летает, текст, музыка, фото.
   Показ у получателя целиком в view.js (CARDVIEW): он же рисует превью здесь и вставляется в скачанный .html.
   Отправка: ссылкой (всё в адресе, кроме фото и своей музыки) или файлом .html (всё внутри). Хранение: IndexedDB «forge-otkrytka». */
(function(){
"use strict";
var $=function(s,r){ return (r||document).querySelector(s); };
var $$=function(s,r){ return [].slice.call((r||document).querySelectorAll(s)); };
var wide=matchMedia("(min-width:960px)");
function el(html, fn){ var d=document.createElement("div"); d.innerHTML=html.trim(); var n=d.firstElementChild; if(fn) fn(n); return n; }
function sh(t){ return el('<div class="sh">'+esc(t)+'</div>'); }
function choice(label, opts, cur, fn){ return el('<div class="f">'+(label?'<label>'+esc(label)+'</label>':'')+'<div class="chips">'+opts.map(function(o){ return '<button data-v="'+o[0]+'" class="'+(String(o[0])===String(cur)?"on":"")+'"'+(o[2]?' style="'+o[2]+'"':'')+'>'+esc(o[1])+'</button>'; }).join("")+'</div></div>',function(n){
  $$("button",n).forEach(function(x){ x.onclick=function(){ $$("button",n).forEach(function(y){ y.classList.toggle("on",y===x); }); fn(x.getAttribute("data-v")); }; }); }); }
function range(label,v,min,max,step,fmt,fn){ return el('<div class="f"><div class="lab"><span>'+esc(label)+'</span><output>'+fmt(v)+'</output></div><input type="range" min="'+min+'" max="'+max+'" step="'+step+'" value="'+v+'"></div>',function(n){
  var o=$("output",n), i=$("input",n), first=true; i.oninput=function(){ if(first){ first=false; remember(); } o.textContent=fmt(Number(i.value)); fn(Number(i.value)); }; i.onchange=function(){ first=true; changed(); }; }); }
function toggle(label,v,fn){ return el('<label class="tg"><span>'+esc(label)+'</span><input type="checkbox"'+(v?" checked":"")+'></label>',function(n){ $("input",n).onchange=function(){ fn(this.checked); }; }); }
var SV={ play:"M7 4l13 8-13 8z", mic:"M12 3a3 3 0 00-3 3v5a3 3 0 006 0V6a3 3 0 00-3-3zM5 11a7 7 0 0014 0M12 18v3", file:"M14 3H6v18h12V7zM14 3v4h4", x:"M6 6l12 12M18 6L6 18",
  img:"M4 5h16v14H4zM4 15l4-4 5 5 3-3 4 4M15 9.5a1.5 1.5 0 100-.01", dl:"M12 4v11M7 10l5 5 5-5M5 20h14", link:"M10 14a4 4 0 005.7 0l3-3a4 4 0 00-5.7-5.7l-1 1M14 10a4 4 0 00-5.7 0l-3 3a4 4 0 005.7 5.7l1-1",
  eye:"M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM12 15a3 3 0 100-6 3 3 0 000 6z", shuf:"M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5", add:"M12 5v14M5 12h14", share:"M12 3v12M7 8l5-5 5 5M5 14v6h14v-6" };
function sv(n){ return '<svg viewBox="0 0 24 24"><path d="'+SV[n]+'"/></svg>'; }
var CV=window.CARDVIEW, F=window.FONY;

/* ═══════════ хранение ═══════════ */
var dbp=null;
function db(){ if(dbp) return dbp; dbp=new Promise(function(res,rej){ try{ var r=indexedDB.open("forge-otkrytka",1);
  r.onupgradeneeded=function(){ r.result.createObjectStore("cards",{keyPath:"id"}); r.result.createObjectStore("blobs"); };
  r.onsuccess=function(){ res(r.result); }; r.onerror=function(){ rej(r.error); }; }catch(e){ rej(e); } }).catch(function(){ return null; }); return dbp; }
function tx(store,mode,fn,dbf){ return (dbf||db)().then(function(d){ if(!d) throw new Error("nodb"); return new Promise(function(res,rej){ var t=d.transaction(store,mode), s=t.objectStore(store), out=fn(s);
  t.oncomplete=function(){ res(out&&out.result!==undefined?out.result:undefined); }; t.onerror=function(){ rej(t.error); }; t.onabort=function(){ rej(t.error); }; }); }); }
function cAll(){ return tx("cards","readonly",function(s){ return s.getAll(); }).catch(function(){ return []; }); }
function cGet(id){ return tx("cards","readonly",function(s){ return s.get(id); }).catch(function(){ return null; }); }
function cPut(c){ return tx("cards","readwrite",function(s){ s.put(c); }); }
function used(c){ var a=[]; if(c.photo) a.push(c.photo); if(c.mus&&c.mus.aid) a.push(c.mus.aid); return a; }
function cDel(c){ return tx("cards","readwrite",function(s){ s.delete(c.id); }).then(cAll).then(function(all){ var u={}; all.forEach(function(q){ used(q).forEach(function(a){ u[a]=1; }); });
  return tx("blobs","readwrite",function(s){ used(c).forEach(function(a){ if(!u[a]) s.delete(a); }); }); }); }
function bPut(aid,blob){ return tx("blobs","readwrite",function(s){ s.put(blob,aid); }); }
function bGet(aid){ return tx("blobs","readonly",function(s){ return s.get(aid); }).catch(function(){ return null; }); }
function newId(p){ return (p||"o")+Date.now().toString(36)+Math.random().toString(36).slice(2,6); }
var URLS={}; function blobUrl(aid){ if(!aid) return Promise.resolve(""); if(URLS[aid]) return Promise.resolve(URLS[aid]); return bGet(aid).then(function(b){ if(!b) return ""; URLS[aid]=URL.createObjectURL(b); return URLS[aid]; }); }
var BGU={}; function bgUrl(bg){ if(!bg||!F) return ""; var k=JSON.stringify(bg); if(BGU[k]) return BGU[k]; var s=F.svg(JSON.parse(k),800,1600); BGU[k]=URL.createObjectURL(new Blob([s],{type:"image/svg+xml"})); return BGU[k]; }

/* ═══════════ поводы ═══════════ */
function fb(id,seed){ if(!F) return null; var b=F.fromTpl(id); if(seed!=null) b.seed=seed; return slim(b); }
function slim(b){ return { kind:b.kind, pal:b.pal.slice(), seed:b.seed, p:JSON.parse(JSON.stringify(b.p)), pts:b.pts.map(function(x){ return [Math.round(x[0]*1000)/1000,Math.round(x[1]*1000)/1000]; }), grain:b.grain }; }
var OCC=[
 { id:"bday", n:"День рождения", open:"env", bg:["party",3], theme:"light", font:"fest", fly:"confetti", mel:"hb", inst:"box", h:"С днём рождения!", p:"Пусть этот год будет тёплым, спокойным и полным хороших новостей." },
 { id:"ny", n:"Новый год", open:"gift", bg:["night_topo"], theme:"navy", font:"fest", fly:"snow", mel:"jb", inst:"bells", h:"С Новым годом!", p:"Пусть в новом году сбудется то, что давно задумано. Тепла, здоровья и немного чудес." },
 { id:"wed", n:"Свадьба", open:"book", bg:["soft_blobs"], theme:"cream", font:"strict", fly:"hearts", mel:"wm", inst:"piano", h:"Поздравляем с днём свадьбы!", p:"Любви, терпения и долгой счастливой дороги вдвоём." },
 { id:"thanks", n:"Спасибо", open:"scroll", bg:["sea"], theme:"mint", font:"hand", fly:"stars", mel:"od", inst:"box", h:"Спасибо!", p:"Ваша помощь очень много для меня значит." },
 { id:"invite", n:"Приглашение", open:"curtain", bg:["retro"], theme:"dark", font:"modern", fly:"stars", mel:"od", inst:"piano", h:"Приглашаю!", p:"Суббота, 18:00.\nАдрес и подробности напишу отдельно. Очень жду!" },
 { id:"love", n:"С любовью", open:"env", bg:["sunset"], theme:"red", font:"hand", fly:"hearts", mel:"fe", inst:"piano", h:"Спасибо, что ты есть", p:"С тобой даже обычный день похож на праздник." },
 { id:"march8", n:"8 Марта", open:"book", bg:["soft_blobs",21], theme:"lilac", font:"fest", fly:"hearts", mel:"br", inst:"bells", h:"С 8 Марта!", p:"Весеннего настроения, тепла и поводов улыбаться каждый день." },
 { id:"grad", n:"Выпускной", open:"pop", bg:["rays"], theme:"dark", font:"modern", fly:"confetti", mel:"od", inst:"chip", h:"Поздравляем с выпуском!", p:"Впереди новая жизнь. Смело, с интересом и без страха ошибиться." },
 { id:"baby", n:"Малыш", open:"gift", bg:["party",8], theme:"light", font:"hand", fly:"balloons", mel:"br", inst:"box", h:"С рождением малыша!", p:"Здоровья маленькому человеку и крепкого сна родителям." },
 { id:"just", n:"Просто так", open:"pop", bg:["neon_aurora"], theme:"dark", font:"hand", fly:"stars", mel:"fe", inst:"bells", h:"Привет!", p:"Вспомнил о тебе и улыбнулся. Хорошего дня!" }
];
var OPENS=[["env","конверт","M4 7h16v12H4zM4 7l8 6 8-6"],["book","книжка","M12 6v14M12 6C9 4.5 6 4.5 3 5.5v14c3-1 6-1 9 .5 3-1.5 6-1.5 9-.5v-14c-3-1-6-1-9 .5"],["gift","подарок","M4 10h16v4H4zM5.5 14h13v7h-13zM12 10v11M12 10c-2-5-7-3-4.5 0M12 10c2-5 7-3 4.5 0"],
  ["curtain","занавес","M3 4h18M5 4c0 6 1.5 12 6 16M19 4c0 6-1.5 12-6 16"],["pop","хлопушка","M4 20l5-11 6 6zM13 6l1-2M17 9l2-1M16 5l2-2M18 12l2 1"],["scroll","свиток","M7 4h11v16H7zM7 4c-1.5 0-2.5.8-2.5 2.2S5.5 8.4 7 8.4M18 20c1.5 0 2.5-.8 2.5-2.2S19.5 15.6 18 15.6"]];
var THN={ light:"светлая", cream:"кремовая", dark:"тёмная", navy:"ночная", mint:"мятная", red:"красная", kraft:"крафт", lilac:"сиреневая" };
var FNN={ fest:"Праздник", hand:"От руки", strict:"Строгий", modern:"Модный" };
var FLY={ confetti:"конфетти", snow:"снег", hearts:"сердечки", stars:"звёзды", balloons:"шарики", none:"ничего" };
var MELN={ hb:["Happy Birthday","народная, без авторских прав"], jb:["Jingle Bells","Пирпонт, 1857"], el:["В лесу родилась ёлочка","Бекман, 1905"], od:["Ода к радости","Бетховен"], wm:["Свадебный хор","Вагнер"], fe:["К Элизе","Бетховен"], br:["Колыбельная","Брамс"] };
var INST={ box:"шкатулка", piano:"пианино", bells:"колокольчики", chip:"8-бит" };
function lang(){ return window.FLANG||"ru"; }
function fromOcc(o,keepText){ var c={ v:1, id:newId(), title:TR(o.n), occ:o.id, open:o.open, bg:fb(o.bg[0],o.bg[1]), theme:o.theme, font:o.font, fly:o.fly, h:TR(o.h), p:TR(o.p), s:"", photo:null, mus:{k:"mel",id:o.mel,inst:o.inst,tempo:1,loop:true}, lang:lang(), updated:Date.now() };
  return c; }
function occ(id){ return OCC.filter(function(o){ return o.id===id; })[0]||OCC[0]; }

/* ═══════════ превью ═══════════ */
var C=null, ctl=null, pvOpen=false;
function data(c,opts){ opts=opts||{}; return Promise.all([blobUrl(c.photo),c.mus&&c.mus.k==="audio"?blobUrl(c.mus.aid):Promise.resolve("")]).then(function(u){
  return { open:c.open, theme:c.theme, font:c.font, fly:opts.nofly?"none":c.fly, h:c.h, p:c.p, s:c.s, lang:c.lang||lang(), mus:opts.nomus?{k:"none"}:c.mus, bgUrl:bgUrl(c.bg), photoUrl:u[0], audioUrl:u[1] }; }); }
var pvT=0, pvN=0;
function preview(){ clearTimeout(pvT); pvT=setTimeout(doPreview,120); }
function doPreview(){ if(!C) return; var my=++pvN; data(C).then(function(D){ if(my!==pvN) return; if(ctl) ctl.destroy();
  ctl=CV.mount($("#cpv"),D,{ opened:pvOpen, onopen:function(){ pvOpen=true; btnUi(); } }); btnUi(); }); }
function btnUi(){ $("#openBtn").textContent=pvOpen?TR("Закрыть и показать снова"):TR("Открыть открытку"); }
$("#openBtn").onclick=function(){ if(!ctl) return; if(pvOpen){ pvOpen=false; doPreview(); } else ctl.open(); };
if(window.ResizeObserver){ var rw=0, rh=0; new ResizeObserver(function(e){ var r=e[0].contentRect; if(Math.abs(r.width-rw)>4||Math.abs(r.height-rh)>4){ rw=r.width; rh=r.height; if(C&&ctl&&ctl.state()!=="opening") doPreview(); } }).observe($("#cpv")); }

/* ═══════════ отмена и сохранение ═══════════ */
var U=[], Rd=[];
function snap(){ var o=JSON.parse(JSON.stringify(C)); delete o.updated; return JSON.stringify(o); }
function remember(){ if(!C) return; U.push(snap()); if(U.length>80) U.shift(); Rd=[]; undoBtns(); }
function undoBtns(){ $("#undo").disabled=!U.length; $("#redo").disabled=!Rd.length; }
function restoreS(s){ var o=JSON.parse(s); for(var k in o) C[k]=o[k]; $("#title").value=C.title||""; undoBtns(); changed(true); }
$("#undo").onclick=function(){ if(!U.length) return; Rd.push(snap()); restoreS(U.pop()); };
$("#redo").onclick=function(){ if(!Rd.length) return; U.push(snap()); restoreS(Rd.pop()); };
var saveT=0; function save(){ clearTimeout(saveT); saveT=setTimeout(function(){ if(!C) return; C.updated=Date.now(); cPut(JSON.parse(JSON.stringify(C))).catch(function(){ toast(TR("Не получилось сохранить: память браузера заполнена")); }); },350); }
function changed(all){ save(); preview(); if(all) refresh(); else refreshInsp(); }

/* ═══════════ панели ═══════════ */
var pane=$("#pane"), insp=$("#insp"), right=$("#right"), ui={ tab:null, sheet:false };
var TTL={ occ:"Повод", look:"Вид", text:"Текст", mus:"Музыка", more:"Ещё" };
function tabBox(){ return wide.matches?pane:insp; }
function openTab(t){ if(t==="send"){ openInsp(); return; }
  ui.tab=t; $$("#tabs button").forEach(function(b){ b.classList.toggle("on",b.getAttribute("data-tab")===t); });
  if(!wide.matches){ ui.sheet="tab"; right.classList.add("open"); right.classList.remove("full","peek"); $("#shTitle").textContent=TR(TTL[t]); }
  refreshPane(); tabBox().scrollTop=0; }
function openInsp(){ if(!wide.matches){ ui.sheet="insp"; right.classList.add("open"); right.classList.remove("full","peek"); $$("#tabs button").forEach(function(b){ b.classList.toggle("on",b.getAttribute("data-tab")==="send"); }); ui.tab=null; }
  refreshInsp(); insp.scrollTop=0; }
function closeSheet(){ if(wide.matches) return; ui.sheet=false; ui.tab=null; right.classList.remove("open","full","peek"); $$("#tabs button").forEach(function(b){ b.classList.remove("on"); }); }
$("#shClose").onclick=closeSheet;
$$("#tabs button").forEach(function(b){ b.onclick=function(){ var t=b.getAttribute("data-tab"); if(!wide.matches&&((ui.sheet==="tab"&&ui.tab===t)||(t==="send"&&ui.sheet==="insp"))) closeSheet(); else openTab(t); }; });
(function(){ var h=$(".sh-h"), y0=0, h0=0, on=false;
  h.addEventListener("pointerdown",function(e){ if(wide.matches||e.target.closest("button")) return; on=true; y0=e.clientY; h0=right.getBoundingClientRect().height; right.style.transition="none"; try{ h.setPointerCapture(e.pointerId); }catch(x){} });
  h.addEventListener("pointermove",function(e){ if(on) right.style.height=Math.max(80,h0-(e.clientY-y0))+"px"; });
  h.addEventListener("pointerup",function(e){ if(!on) return; on=false; right.style.transition=""; var nh=h0-(e.clientY-y0), vh=innerHeight; right.style.height=""; right.classList.remove("full","peek");
    if(nh<vh*.2) closeSheet(); else if(nh<vh*.42) right.classList.add("peek"); else if(nh>vh*.65) right.classList.add("full"); });
})();
new MutationObserver(function(){ var e=$("#ed"); e.classList.toggle("so",right.classList.contains("open")&&!right.classList.contains("full")); e.classList.toggle("pk",right.classList.contains("peek")); }).observe(right,{attributes:true,attributeFilter:["class"]});
wide.addEventListener("change",function(){ right.classList.remove("open"); ui.sheet=false; if(wide.matches) openTab(ui.tab||"occ"); refreshInsp(); });
function refresh(){ refreshPane(); refreshInsp(); }
function refreshPane(){ if(!ui.tab||!C) return; if(!wide.matches&&ui.sheet!=="tab") return; var box=tabBox(), sc=box.scrollTop; box.innerHTML="";
  ({ occ:paneOcc, look:paneLook, text:paneText, mus:paneMus, more:paneMore })[ui.tab](box); box.scrollTop=sc; }
function mini(box,c,o){ data(c,{nofly:true,nomus:true}).then(function(D){ CV.mount(box,D,{opened:true}); }); }
function paneOcc(box){
  box.appendChild(sh("Повод"));
  box.appendChild(el('<p class="note" style="margin:-2px 0 10px">Повод сразу ставит вид, фон, музыку и текст. Потом всё можно поменять, а кнопкой назад вернуть как было.</p>'));
  var g=el('<div class="oocc"></div>'); OCC.forEach(function(o){ g.appendChild(el('<button class="'+(C.occ===o.id?"on":"")+'"><div class="mv" data-nt></div><b>'+esc(TR(o.n))+'</b></button>',function(n){
    n.onclick=function(){ remember(); var keep={ id:C.id, title:C.title, photo:C.photo, s:C.s }, nc=fromOcc(o); for(var k in nc) C[k]=nc[k]; C.id=keep.id; C.photo=keep.photo; C.s=keep.s; if(!C.title||OCC.some(function(x){ return TR(x.n)===keep.title; })) C.title=TR(o.n); else C.title=keep.title; $("#title").value=C.title; pvOpen=false; changed(true); };
    requestAnimationFrame(function(){ mini($(".mv",n),fromOcc(o)); }); })); }); box.appendChild(g);
}
function paneLook(box){
  box.appendChild(sh("Как открывается"));
  var g=el('<div class="oopen"></div>'); OPENS.forEach(function(o){ g.appendChild(el('<button class="'+(C.open===o[0]?"on":"")+'"><svg viewBox="0 0 24 24"><path d="'+o[2]+'"/></svg><span>'+esc(TR(o[1]))+'</span></button>',function(n){ n.onclick=function(){ remember(); C.open=o[0]; pvOpen=false; changed(); refreshPane(); }; })); }); box.appendChild(g);
  box.appendChild(sh("Цвет открытки"));
  var t=el('<div class="othm"></div>'); Object.keys(CV.THEMES).forEach(function(k){ var T=CV.THEMES[k]; t.appendChild(el('<button class="'+(C.theme===k?"on":"")+'" title="'+esc(TR(THN[k]))+'" style="background:'+T.paper+';color:'+T.acc+'"><i style="background:'+T.env+'"></i>Аа</button>',function(n){ n.onclick=function(){ remember(); C.theme=k; changed(); refreshPane(); }; })); }); box.appendChild(t);
  box.appendChild(choice(TR("Шрифт"),Object.keys(FNN).map(function(k){ var f=CV.FONTS[k]; return [k,TR(FNN[k]),"font-family:"+f.h.replace(/"/g,"'")+";font-weight:"+f.w]; }),C.font,function(v){ remember(); C.font=v; changed(); }));
  box.appendChild(sh("Фон"));
  if(F){ var bg=el('<div class="obg"></div>'); F.TPLS.forEach(function(tp){ var b=fb(tp.id); bg.appendChild(el('<button title="'+esc(TR(tp.name))+'" style="background-image:url(\''+bgUrl(b)+'\')"></button>',function(n){ n.onclick=function(){ remember(); C.bg=b; changed(); refreshPane(); }; })); }); box.appendChild(bg);
    box.appendChild(el('<div class="row" style="margin:8px 0 6px"><button class="btn">'+sv("shuf")+'<span>Перемешать</span></button></div>',function(n){ $("button",n).onclick=function(){ remember(); C.bg=C.bg||fb("party"); C.bg.seed=Math.floor(Math.random()*1e6); changed(); }; }));
    var pl=el('<div class="opal"></div>'); F.PALS.forEach(function(p){ pl.appendChild(el('<button title="'+esc(TR(p[0]))+'" style="background:linear-gradient(90deg,'+p[1].join(",")+')"></button>',function(n){ n.onclick=function(){ remember(); C.bg=C.bg||fb("party"); C.bg.pal=p[1].slice(); changed(); }; })); }); box.appendChild(pl);
    myFony(box); }
  box.appendChild(choice(TR("Что летает"),Object.keys(FLY).map(function(k){ return [k,TR(FLY[k])]; }),C.fly,function(v){ remember(); C.fly=v; pvOpen=true; changed(); }));
  box.appendChild(sh("Фото"));
  if(C.photo) box.appendChild(el('<div class="ophoto"><img alt=""><button class="btn del">'+sv("x")+'<span>Убрать фото</span></button></div>',function(n){ blobUrl(C.photo).then(function(u){ $("img",n).src=u; }); $("button",n).onclick=function(){ remember(); C.photo=null; changed(true); }; }));
  else box.appendChild(el('<button class="btn w">'+sv("img")+'<span>Добавить фото</span><small>в файле .html</small></button>',function(n){ n.onclick=pickPhoto; }));
  box.appendChild(el('<p class="note" style="margin-top:6px">Своё фото поместится только в открытку-файл: в ссылку картинка не влезает.</p>'));
}
/* фоны, которые человек уже сделал в мастерской фонов */
function myFony(box){ var w=el('<div></div>'); box.appendChild(w);
  var zdb=function(){ return new Promise(function(res,rej){ var r=indexedDB.open("forge-fony"); r.onupgradeneeded=function(){ try{ r.transaction.abort(); }catch(e){} rej(); }; r.onsuccess=function(){ res(r.result); }; r.onerror=function(){ rej(); }; }); };
  zdb().then(function(d){ if(!d.objectStoreNames.contains("bgs")) return []; return new Promise(function(res){ var q=d.transaction("bgs").objectStore("bgs").getAll(); q.onsuccess=function(){ res(q.result||[]); }; q.onerror=function(){ res([]); }; }); }).then(function(list){
    if(!list.length) return; w.appendChild(el('<label class="olab">Мои фоны</label>')); var g=el('<div class="obg"></div>'); list.slice(0,16).forEach(function(b){ var s; try{ s=slim(F.fixBg(b)); }catch(e){ return; } g.appendChild(el('<button title="'+esc(b.title||"")+'" style="background-image:url(\''+bgUrl(s)+'\')"></button>',function(n){ n.onclick=function(){ remember(); C.bg=s; changed(); }; })); }); w.appendChild(g); }).catch(function(){}); }
function paneText(box){
  box.appendChild(sh("Текст"));
  [["h","Заголовок",80,0],["p","Пожелание",600,1],["s","Подпись",80,0]].forEach(function(x){ box.appendChild(el('<div class="f"><label>'+esc(TR(x[1]))+'</label>'+(x[3]?'<textarea maxlength="'+x[2]+'"></textarea>':'<input type="text" maxlength="'+x[2]+'">')+'</div>',function(n){ var i=$("input,textarea",n), first=true; i.value=C[x[0]]||"";
    i.oninput=function(){ if(first){ first=false; remember(); } C[x[0]]=i.value; pvOpen=true; save(); preview(); }; i.onblur=function(){ first=true; }; })); });
  box.appendChild(el('<p class="note">Пустое поле на открытке не показывается. Перенос строки в пожелании сохраняется.</p>'));
}
function paneMus(box){
  var m=C.mus||{k:"none"};
  box.appendChild(sh("Мелодия"));
  Object.keys(MELN).forEach(function(k){ box.appendChild(el('<div class="omel'+(m.k==="mel"&&m.id===k?" on":"")+'"><button class="pb" title="'+esc(TR("Послушать"))+'">'+sv("play")+'</button><div><b>'+esc(TR(MELN[k][0]))+'</b><small>'+esc(TR(MELN[k][1]))+'</small></div></div>',function(n){
    $(".pb",n).onclick=function(e){ e.stopPropagation(); hear(k,m.k==="mel"?m.inst:"box",m.tempo||1); }; n.onclick=function(){ remember(); C.mus={k:"mel",id:k,inst:m.inst||"box",tempo:m.tempo||1,loop:m.loop!==false}; changed(); refreshPane(); }; })); });
  if(m.k==="mel"){ box.appendChild(choice(TR("Звучит как"),Object.keys(INST).map(function(k){ return [k,TR(INST[k])]; }),m.inst||"box",function(v){ remember(); m.inst=v; hear(m.id,v,m.tempo||1); changed(); }));
    box.appendChild(range(TR("Темп"),m.tempo||1,.7,1.3,.05,function(v){ return Math.round(v*100)+"%"; },function(v){ m.tempo=v; })); }
  box.appendChild(sh("Своя музыка"));
  box.appendChild(el('<button class="btn w'+(m.k==="audio"&&!m.voice?" on":"")+'">'+sv("file")+'<span>'+esc(m.k==="audio"&&!m.voice?m.name:TR("Музыка из файла"))+'</span><small>MP3, до 8 МБ</small></button>',function(n){ n.onclick=pickAudio; }));
  box.appendChild(el('<button class="btn w'+(m.voice?" on":"")+'">'+sv("mic")+'<span>'+esc(m.voice?TR("Голос записан, записать заново"):TR("Сказать голосом"))+'</span><small>до 60 с</small></button>',function(n){ n.onclick=record; }));
  box.appendChild(el('<p class="note" style="margin:-2px 0 10px">Бит из битмейкера: там в окне «Сохранить» есть кнопка «В открытку». Своя музыка и голос поместятся только в открытку-файл.</p>'));
  if(m.k!=="none") box.appendChild(toggle(TR("Играть по кругу"),m.loop!==false,function(v){ remember(); m.loop=v; changed(); }));
  box.appendChild(el('<button class="btn w'+(m.k==="none"?" on":"")+'">'+sv("x")+'<span>Без музыки</span></button>',function(n){ n.onclick=function(){ remember(); C.mus={k:"none"}; changed(); refreshPane(); }; }));
}
var hearA=null; function hear(id,inst,tempo){ try{ if(hearA) hearA.close(); }catch(e){} var a=hearA=new (window.AudioContext||window.webkitAudioContext)(), M=CV.MEL[id], b=60/M.bpm/(tempo||1), t=a.currentTime+.05, n=0;
  M.n.split(" ").forEach(function(x){ if(n++>9) return; var p=x.split(":"), d=+p[1]*b; CV.tone(a,a.destination,CV.hz(CV.midiOf(p[0])),t,d,inst); t+=d; }); setTimeout(function(){ try{ a.close(); }catch(e){} },(t-a.currentTime+2)*1000); }
function paneMore(box){
  box.appendChild(el('<div class="f"><label>Название (только для вас)</label><input type="text" maxlength="80"></div>',function(n){ var i=$("input",n); i.value=C.title||""; i.oninput=function(){ C.title=i.value; $("#title").value=i.value; save(); }; }));
  box.appendChild(el('<button class="btn w">Сделать копию</button>',function(n){ n.onclick=function(){ var c=JSON.parse(JSON.stringify(C)); c.id=newId(); c.title=TR("{0} (копия)",C.title||""); c.updated=Date.now(); cPut(c).then(function(){ openC(c); toast(TR("Открыта копия")); }); }; }));
  box.appendChild(el('<button class="btn w del">Удалить открытку</button>',function(n){ n.onclick=function(){ ask(TR("Удалить «{0}»? Вернуть не получится.",C.title||""),TR("Удалить")).then(function(y){ if(y){ var c=C; cDel(c).then(function(){ C=null; showHome(); }); } }); }; }));
  box.appendChild(el('<p class="note" style="margin-top:8px">Открытка хранится в этом браузере. Получателю уходит копия: ссылкой или файлом.</p>'));
}

/* ═══════════ отправка ═══════════ */
function heavy(){ return !!(C.photo||(C.mus&&C.mus.k==="audio")); }
function refreshInsp(){
  if(!C) return; if(!wide.matches&&ui.sheet!=="insp") return; var sc0=insp.scrollTop; insp.innerHTML=""; $("#shTitle").textContent=TR("Отправить");
  var hv=heavy();
  insp.appendChild(sh("Ссылкой"));
  insp.appendChild(el('<p class="note" style="margin-bottom:10px">'+esc(hv?TR("В ссылку уйдёт всё, кроме фото и своей музыки: их в адрес не уложить. Чтобы отправить всё, скачайте файл ниже."):TR("Вся открытка помещается в ссылку. Ничего не хранится на сервере, получатель просто откроет её в браузере."))+'</p>'));
  insp.appendChild(el('<button class="btn w'+(hv?"":" go")+'">'+sv("link")+'<span>'+esc(TR("Скопировать ссылку"))+'</span></button>',function(n){ n.onclick=function(){ copyLink(); }; }));
  if(navigator.share) insp.appendChild(el('<button class="btn w">'+sv("share")+'<span>'+esc(TR("Отправить в мессенджер"))+'</span></button>',function(n){ n.onclick=function(){ navigator.share({ title:C.h||C.title, url:link() }).catch(function(){}); }; }));
  insp.appendChild(el('<button class="btn w">'+sv("eye")+'<span>'+esc(TR("Посмотреть как получатель"))+'</span></button>',function(n){ n.onclick=function(){ window.open(link(),"_blank"); }; }));
  insp.appendChild(sh("Файлом"));
  insp.appendChild(el('<p class="note" style="margin-bottom:10px">'+esc(TR("Один файл .html, внутри всё: фото, голос, музыка. Его можно переслать в мессенджере или по почте, он откроется в любом браузере даже без интернета (только шрифты будут попроще)."))+'</p>'));
  insp.appendChild(el('<button class="btn w'+(hv?" go":"")+'">'+sv("dl")+'<span>'+esc(TR("Скачать открытку"))+'</span><small>.html</small></button>',function(n){ n.onclick=exportHtml; }));
  insp.scrollTop=sc0;
}
function b64(s){ return btoa(unescape(encodeURIComponent(s))).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,""); }
function unb64(s){ s=s.replace(/-/g,"+").replace(/_/g,"/"); while(s.length%4) s+="="; return decodeURIComponent(escape(atob(s))); }
function link(){ var m=C.mus&&C.mus.k==="mel"?[C.mus.id,C.mus.inst,C.mus.tempo||1,C.mus.loop===false?0:1]:0;
  var o={ o:C.open, t:C.theme, f:C.font, y:C.fly, h:C.h, p:C.p, s:C.s, l:C.lang||lang(), m:m, b:C.bg?[C.bg.kind,C.bg.pal,C.bg.seed,C.bg.p,C.bg.pts,C.bg.grain]:0 };
  return location.origin+location.pathname+"#s="+b64(JSON.stringify(o)); }
function fromLink(s){ var o=JSON.parse(unb64(s)), m=o.m;
  return { open:o.o, theme:o.t, font:o.f, fly:o.y, h:o.h||"", p:o.p||"", s:o.s||"", lang:o.l||"ru", mus:m?{k:"mel",id:m[0],inst:m[1],tempo:+m[2]||1,loop:!!m[3]}:{k:"none"},
    bg:o.b?{ kind:o.b[0], pal:o.b[1], seed:o.b[2], p:o.b[3], pts:o.b[4], grain:o.b[5] }:null }; }
function copyLink(){ var u=link(); (navigator.clipboard?navigator.clipboard.writeText(u):Promise.reject()).then(function(){ toast(TR("Ссылка скопирована")); },function(){
  modal('<h3>Ссылка</h3><div class="link" data-nt></div><div class="row"><button class="btn" data-close>Закрыть</button></div>'); $("#mbox .link").textContent=u; }); }
function toData(blob){ return new Promise(function(res){ if(!blob){ res(""); return; } var r=new FileReader(); r.onload=function(){ res(r.result); }; r.onerror=function(){ res(""); }; r.readAsDataURL(blob); }); }
function latin(s){ var m={а:"a",б:"b",в:"v",г:"g",д:"d",е:"e",ё:"e",ж:"zh",з:"z",и:"i",й:"y",к:"k",л:"l",м:"m",н:"n",о:"o",п:"p",р:"r",с:"s",т:"t",у:"u",ф:"f",х:"h",ц:"ts",ч:"ch",ш:"sh",щ:"sch",ъ:"",ы:"y",ь:"",э:"e",ю:"yu",я:"ya",ł:"l",ß:"ss"};
  return String(s||"").toLowerCase().split("").map(function(c){ return m[c]!=null?m[c]:c; }).join("").normalize("NFD").replace(/[̀-ͯ]/g,"").replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"").slice(0,40); }
var VIEWJS=null;
function exportHtml(){ toast(TR("Собираю файл...")); var vj=VIEWJS?Promise.resolve(VIEWJS):fetch("view.js?v=1").then(function(r){ return r.text(); }).then(function(t){ VIEWJS=t; return t; });
  Promise.all([vj,bGet(C.photo),C.mus&&C.mus.k==="audio"?bGet(C.mus.aid):null]).then(function(r){ return Promise.all([r[0],toData(r[1]),toData(r[2])]); }).then(function(r){
    var svg=C.bg&&F?F.svg(JSON.parse(JSON.stringify(C.bg)),800,1600):"", D={ open:C.open, theme:C.theme, font:C.font, fly:C.fly, h:C.h, p:C.p, s:C.s, lang:C.lang||lang(), mus:C.mus,
      bgUrl:svg?"data:image/svg+xml;charset=utf-8,"+encodeURIComponent(svg):"", photoUrl:r[1], audioUrl:r[2] };
    var foot={ text:TR("Сделать свою открытку"), href:location.origin+location.pathname };
    var J=function(x){ return JSON.stringify(x).replace(/</g,"\\u003c"); };
    var html='<!DOCTYPE html>\n<html lang="'+esc(D.lang)+'">\n<head>\n<meta charset="UTF-8">\n<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">\n<title>'+esc(C.h||C.title||"")+'</title>\n<link rel="stylesheet" href="'+CV.FONTS_URL+'">\n<style>html,body{margin:0;height:100%;background:#111}#c{position:fixed;inset:0}</style>\n</head>\n<body>\n<div id="c"></div>\n<script>\n'+r[0].replace(/<\/script/gi,"<\\/script")+'\n</script>\n<script>CARDVIEW.mount(document.getElementById("c"),'+J(D)+',{foot:'+J(foot)+'});</script>\n</body>\n</html>\n';
    var b=new Blob([html],{type:"text/html"}), a=document.createElement("a"); a.href=URL.createObjectURL(b); a.download=(latin(C.title||C.h)||"otkrytka")+".html"; document.body.appendChild(a); a.click();
    setTimeout(function(){ URL.revokeObjectURL(a.href); a.remove(); },3000); toast(TR("Файл сохранён: {0}",b.size>1048576?(b.size/1048576).toFixed(1)+" "+TR("МБ"):Math.round(b.size/1024)+" "+TR("КБ"))); })
  .catch(function(){ toast(TR("Не получилось сохранить файл")); }); }
$("#saveBtn").onclick=function(){ if(wide.matches){ $("#right").scrollTop=0; insp.animate([{background:"rgba(79,214,200,.12)"},{background:"transparent"}],{duration:900}); } else openInsp(); };
$("#linkBtn").onclick=copyLink;

/* ═══════════ фото, музыка, голос ═══════════ */
function pickFile(accept,fn){ var f=$("#fIn"); f.value=""; f.accept=accept; f.onchange=function(){ if(f.files[0]) fn(f.files[0]); }; f.click(); }
function pickPhoto(){ pickFile("image/*",function(file){ var img=new Image(), u=URL.createObjectURL(file); img.onload=function(){ var k=Math.min(1,1000/Math.max(img.width,img.height)), cv=document.createElement("canvas"); cv.width=Math.round(img.width*k); cv.height=Math.round(img.height*k);
    cv.getContext("2d").drawImage(img,0,0,cv.width,cv.height); URL.revokeObjectURL(u); cv.toBlob(function(b){ var aid=newId("p"); bPut(aid,b).then(function(){ remember(); C.photo=aid; pvOpen=true; changed(true); toast(TR("Фото добавлено")); }); },"image/jpeg",.84); };
  img.onerror=function(){ toast(TR("Эту картинку браузер открыть не смог")); }; img.src=u; }); }
function setAudio(blob,name,voice){ var aid=newId("a"); return bPut(aid,blob).then(function(){ remember(); C.mus={k:"audio",aid:aid,name:name,loop:!voice,voice:!!voice}; changed(true); toast(TR("Добавлено: {0}",name)); }); }
function pickAudio(){ pickFile("audio/*,.mp3,.m4a,.ogg,.wav",function(file){ if(file.size>8*1024*1024){ toast(TR("Файл больше 8 МБ: открытка выйдет слишком тяжёлой. Обрежьте его в звуковой мастерской.")); return; } setAudio(file,file.name.replace(/\.[^.]+$/,"").slice(0,40),false); }); }
function record(){
  if(!navigator.mediaDevices||!window.MediaRecorder){ toast(TR("Этот браузер не умеет записывать звук")); return; }
  navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true}}).then(function(stream){
    var rec=new MediaRecorder(stream), parts=[], t0=Date.now(), a=new (window.AudioContext||window.webkitAudioContext)(), an=a.createAnalyser(), sn=a.createMediaStreamSource(stream), d=new Uint8Array(512), raf=0, cancel=false, auto=0; an.fftSize=1024; sn.connect(an);
    modal('<div class="recbox"><h3><span class="recdot"></span>'+esc(TR("Идёт запись"))+'</h3><div class="rt" id="rT">0:00</div><div class="lv"><i id="rL"></i></div><div class="row"><button class="btn" id="rX">Отмена</button><button class="btn go" id="rS">Готово</button></div><p class="note" style="margin-top:10px">Скажите поздравление своими словами. До 60 секунд, голос заиграет, когда открытку откроют.</p></div>');
    (function loop(){ an.getByteTimeDomainData(d); var m=0; for(var i=0;i<d.length;i++){ var v=Math.abs(d[i]-128); if(v>m) m=v; } var rl=$("#rL"); if(rl) rl.style.width=Math.min(100,m/128*140)+"%"; var s=Math.floor((Date.now()-t0)/1000), rt=$("#rT"); if(rt) rt.textContent=Math.floor(s/60)+":"+String(s%60).padStart(2,"0"); raf=requestAnimationFrame(loop); })();
    rec.ondataavailable=function(e){ if(e.data&&e.data.size) parts.push(e.data); };
    rec.onstop=function(){ clearTimeout(auto); cancelAnimationFrame(raf); stream.getTracks().forEach(function(t){ t.stop(); }); try{ a.close(); }catch(e){} closeModal();
      if(!cancel&&parts.length) setAudio(new Blob(parts,{type:rec.mimeType||"audio/webm"}),TR("Мой голос"),true); };
    $("#rS").onclick=function(){ if(rec.state!=="inactive") rec.stop(); }; $("#rX").onclick=function(){ cancel=true; if(rec.state!=="inactive") rec.stop(); };
    rec.start(200); auto=setTimeout(function(){ if(rec.state!=="inactive") rec.stop(); },60000);
  }).catch(function(){ toast(TR("Нет доступа к микрофону. Разрешите его в настройках браузера")); });
}

/* ═══════════ окна ═══════════ */
function modal(h){ $("#mbox").innerHTML=h; $("#modal").classList.add("on"); }
function closeModal(){ $("#modal").classList.remove("on"); }
$("#modal").addEventListener("click",function(e){ if(e.target.closest("[data-close]")||e.target===e.currentTarget) closeModal(); });
function ask(text,ok){ return new Promise(function(res){ modal('<h3>'+esc(text)+'</h3><div class="row"><button class="btn" data-n>Отмена</button><button class="btn go" data-y>'+esc(ok)+'</button></div>');
  $("#mbox [data-n]").onclick=function(){ closeModal(); res(false); }; $("#mbox [data-y]").onclick=function(){ closeModal(); res(true); }; }); }
var tT=0; function toast(t){ var e=$("#toast"); e.textContent=t; e.classList.add("on"); clearTimeout(tT); tT=setTimeout(function(){ e.classList.remove("on"); },2800); }
addEventListener("keydown",function(e){ if($("#ed").hidden||$("#modal").classList.contains("on")) return; if(/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) return; var k=e.key.toLowerCase();
  if((e.ctrlKey||e.metaKey)&&k==="z"){ e.preventDefault(); $(e.shiftKey?"#redo":"#undo").click(); } else if((e.ctrlKey||e.metaKey)&&k==="y"){ e.preventDefault(); $("#redo").click(); } });
$("#title").addEventListener("input",function(){ if(C){ C.title=this.value; save(); } });

/* ═══════════ мои открытки ═══════════ */
function showHome(){
  if(ctl){ ctl.destroy(); ctl=null; } $("#view").hidden=true; $("#ed").hidden=true; $("#home").hidden=false; document.title=TR("FORGE · открытка с музыкой");
  try{ history.replaceState(null,"",location.pathname); }catch(e){}
  cAll().then(function(list){ list.sort(function(a,b){ return (b.updated||0)-(a.updated||0); }); var my=$("#myO"); my.innerHTML="";
    if(!list.length) my.appendChild(el('<p class="note">Здесь появятся ваши открытки.</p>'));
    list.forEach(function(c){ var d=new Date(c.updated||Date.now()), when=d.toLocaleDateString(window.FLANG||"ru",{day:"numeric",month:"short"});
      var n=el('<div class="oc"><button class="th"><div class="mv" data-nt></div></button><b data-nt></b><small>'+when+'</small><div class="acts"><button data-a="copy">копия</button><button data-a="del">удалить</button></div></div>');
      $("b",n).textContent=c.title||""; $(".th",n).onclick=function(){ openC(c); };
      $$(".acts button",n).forEach(function(x){ x.onclick=function(){ if(x.getAttribute("data-a")==="copy"){ var k=JSON.parse(JSON.stringify(c)); k.id=newId(); k.title=TR("{0} (копия)",c.title||""); k.updated=Date.now(); cPut(k).then(showHome); }
        else ask(TR("Удалить «{0}»? Вернуть не получится.",c.title||""),TR("Удалить")).then(function(y){ if(y) cDel(c).then(showHome); }); }; });
      my.appendChild(n); requestAnimationFrame(function(){ mini($(".mv",n),c); }); }); });
  var g=$("#occO"); g.innerHTML="";
  OCC.forEach(function(o){ g.appendChild(el('<button class="ot"><div class="mv" data-nt></div><b>'+esc(TR(o.n))+'</b></button>',function(n){ n.onclick=function(){ create(fromOcc(o)); }; requestAnimationFrame(function(){ mini($(".mv",n),fromOcc(o)); }); })); });
}
function create(c){ return cPut(c).catch(function(){}).then(function(){ openC(c); }); }
function openC(c){ if(ctl){ ctl.destroy(); ctl=null; } C=c;
  /* черновик из битмейкера: там есть только музыка, вид и текст берём из повода «Просто так» */
  if(C.fromBit){ var base=fromOcc(occ("just")); for(var k in base) if(C[k]==null) C[k]=base[k]; C.open="pop"; C.fly="confetti"; delete C.fromBit; cPut(JSON.parse(JSON.stringify(C))).catch(function(){}); }
  if(!C.bg&&F) C.bg=fb(occ(C.occ).bg[0],occ(C.occ).bg[1]); C.mus=C.mus||{k:"none"}; U=[]; Rd=[]; undoBtns(); pvOpen=false;
  $("#home").hidden=true; $("#view").hidden=true; $("#ed").hidden=false; document.title="FORGE · "+(C.title||""); $("#title").value=C.title||"";
  try{ history.replaceState(null,"",location.pathname+"#"+C.id); }catch(e){}
  if(wide.matches){ openTab("occ"); refreshInsp(); } else closeSheet(); doPreview(); }
$("#toHome").onclick=function(){ save(); setTimeout(showHome,380); };
/* открытка по ссылке: только показ, без редактора */
function showView(D){ $("#home").hidden=true; $("#ed").hidden=true; $("#view").hidden=false; document.title=D.h||"FORGE";
  D.bgUrl=bgUrl(D.bg); CV.mount($("#view"),D,{ foot:{ text:TR("Сделать свою открытку"), href:location.pathname } }); }
(function boot(){ var h=location.hash.slice(1);
  if(/^s=/.test(h)){ try{ showView(fromLink(h.slice(2))); return; }catch(e){ toast(TR("Ссылка повреждена")); } }
  if(/^tpl=/.test(h)){ var o=OCC.filter(function(x){ return x.id===h.slice(4); })[0]; if(o){ create(fromOcc(o)); return; } }
  if(h&&!/=/.test(h)) cGet(h).then(function(c){ if(c) openC(c); else showHome(); }); else showHome(); })();
addEventListener("hashchange",function(){ var h=location.hash.slice(1); if(/^s=/.test(h)){ try{ showView(fromLink(h.slice(2))); }catch(e){} } });
})();
