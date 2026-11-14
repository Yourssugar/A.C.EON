/* FORGE: редактор страниц. Состояние страницы, панели, связь с превью, хранение в браузере. */
(function(){
"use strict";
var $=function(s,r){ return (r||document).querySelector(s); };
var $$=function(s,r){ return [].slice.call((r||document).querySelectorAll(s)); };
var wide=matchMedia("(min-width:960px)"), touch=matchMedia("(pointer:coarse)").matches;
var SV={ up:"M12 19V5M5 12l7-7 7 7", down:"M12 5v14M5 12l7 7 7-7", dup:"M8 8h12v12H8zM16 8V4H4v12h4", del:"M5 7h14M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3",
  eye:"M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM9 12a3 3 0 106 0 3 3 0 00-6 0", plus:"M12 5v14M5 12h14", cam:ICONS.camera, img:"M4 5h16v14H4zM4 15l5-5 4 4 3-3 4 4",
  x:"M6 6l12 12M18 6L6 18", reset:"M4 12a8 8 0 108-8M4 4v5h5" };
function sv(n){ return '<svg viewBox="0 0 24 24"><path d="'+(SV[n]||ICONS[n]||"")+'"/></svg>'; }

/* ═══════════ хранение: IndexedDB, если нет, то localStorage ═══════════ */
var LS_KEY="forge_pages_v3", useLS=false, dbp=null;
function db(){
  if(dbp) return dbp;
  dbp=new Promise(function(res,rej){
    try{ var r=indexedDB.open("forge",1);
      r.onupgradeneeded=function(){ r.result.createObjectStore("pages",{keyPath:"id"}); };
      r.onsuccess=function(){ res(r.result); }; r.onerror=function(){ rej(r.error); };
    }catch(e){ rej(e); }
  }).catch(function(){ useLS=true; return null; });
  return dbp;
}
function lsAll(){ try{ return JSON.parse(localStorage.getItem(LS_KEY)||"[]"); }catch(e){ return []; } }
function dbAll(){ return db().then(function(d){ if(!d) return lsAll();
  return new Promise(function(res){ var q=d.transaction("pages").objectStore("pages").getAll(); q.onsuccess=function(){ res(q.result||[]); }; q.onerror=function(){ res([]); }; }); }); }
function dbPut(p){ return db().then(function(d){
  if(!d){ var a=lsAll().filter(function(x){ return x.id!==p.id; }); a.push(p); localStorage.setItem(LS_KEY,JSON.stringify(a)); return; }
  return new Promise(function(res,rej){ var t=d.transaction("pages","readwrite"); t.objectStore("pages").put(p); t.oncomplete=res; t.onerror=function(){ rej(t.error); }; }); }); }
function dbDel(id){ return db().then(function(d){
  if(!d){ localStorage.setItem(LS_KEY,JSON.stringify(lsAll().filter(function(x){ return x.id!==id; }))); return; }
  return new Promise(function(res){ var t=d.transaction("pages","readwrite"); t.objectStore("pages").delete(id); t.oncomplete=res; t.onerror=res; }); }); }
function newId(){ return "p"+Date.now().toString(36)+Math.random().toString(36).slice(2,6); }

/* ═══════════ состояние ═══════════ */
var st=null, ui={ sel:null, mode:"edit", tab:null, sheet:false, pos:"all", dev:"pc", y:0, recent:[] };
var saveT=0;
function save(){ clearTimeout(saveT); saveT=setTimeout(function(){ st.updated=Date.now();
  dbPut(clone(st)).catch(function(){ toast("Не получилось сохранить: память браузера заполнена. Уберите часть фото."); }); },400); }
try{ ui.recent=JSON.parse(localStorage.getItem("forge_recent_colors")||"[]"); }catch(e){}

/* отмена и повтор */
var U=[], Rd=[], uKey="", uT=0;
function snap(){ return JSON.stringify(st); }
function remember(key){
  var now=Date.now(); if(key && key===uKey && now-uT<900){ uT=now; return; }
  U.push(snap()); if(U.length>40) U.shift(); Rd=[]; uKey=key||""; uT=now; undoBtns();
}
function undoBtns(){ $("#undo").disabled=!U.length; $("#redo").disabled=!Rd.length; }
function restore(s){ var id=st.id; st=fixPage(JSON.parse(s)); st.id=id; if(ui.sel && !blk(ui.sel.b)) ui.sel=null; uKey=""; undoBtns(); refreshAll(); render(true); save(); }
$("#undo").onclick=function(){ if(!U.length) return; Rd.push(snap()); restore(U.pop()); };
$("#redo").onclick=function(){ if(!Rd.length) return; U.push(snap()); restore(Rd.pop()); };

function blk(uid){ for(var i=0;i<st.blocks.length;i++) if(st.blocks[i].uid===uid) return st.blocks[i]; return null; }
function bIdx(uid){ for(var i=0;i<st.blocks.length;i++) if(st.blocks[i].uid===uid) return i; return -1; }
function els(b){ return (BLOCKS[b.type].gen(b.c,b,{}).els)||{}; }
function kindOf(b,key){ var e=els(b); return e[key]||e[key.replace(/^i\d+$/,"i*")]||"text"; }
var EL_NAMES={ av:"Фото", name:"Имя", bio:"О себе", kicker:"Надпись сверху", title:"Заголовок", text:"Текст", btn:"Кнопка", img:"Фото", h:"Заголовок",
  p:"Текст", cap:"Подпись", v:"Видео", nums:"Цифры", when:"Дата", place:"Место", cal:"Кнопка календаря", gcal:"Кнопка Google", m:"Карта", q:"Цитата", who:"Подпись", t:"Текст" };
function elName(b,key){ if(/^i\d+$/.test(key)){ var L=BLOCKS[b.type].list; return ((L&&L.one)||"Пункт")+" "+(+key.slice(1)+1); } return EL_NAMES[key]||key; }

/* ═══════════ превью ═══════════ */
var pv=$("#pv"), rT=0, goSel=false;
function render(now){
  clearTimeout(rT);
  rT=setTimeout(function(){
    if(ui.mode==="edit"){ var rt=rtInfo(st, ui.pos==="pc"); rt.sel=ui.sel; rt.y=ui.y; rt.go=goSel; pv.srcdoc=buildPage(st,"edit",{rt:rt}); }
    else pv.srcdoc=buildPage(st,"file");
    goSel=false;
  }, now?0:260);
}
function pushCss(){ if(ui.mode!=="edit") return; send({t:"css", css:overridesCss(st), vals:rtInfo(st, ui.pos==="pc").vals}); }
function send(m){ m.forge=1; try{ pv.contentWindow.postMessage(m,"*"); }catch(e){} }
function changed(full, key){ save(); if(full) render(); else pushCss(); if(ui.tab==="blocks"||ui.tab==="code") refreshPane(); }

addEventListener("message",function(e){
  if(e.source!==pv.contentWindow) return; var m=e.data; if(!m||!m.forge) return;
  if(m.t==="y") ui.y=m.y|0;
  else if(m.t==="sel"){ hideHint(); ui.sel=m.sel; refreshInsp(); refreshPane(); if(!wide.matches && ui.sheet==="insp" && !m.sel) closeSheet(); }
  else if(m.t==="tool") tool(m.tool, m.sel);
  else if(m.t==="key") onKey(m.k, m.s, m.c);
  else if(m.t==="patch"){ var b=blk(m.sel.b); if(!b) return; remember(); var o=b.e[m.sel.e]||(b.e[m.sel.e]={});
    for(var k in m.patch){ var key= ui.pos==="pc" && (k==="x"||k==="y"||k==="w") ? "d"+k : k; o[key]=m.patch[k]; }
    changed(false); refreshInsp(); }
  else if(m.t==="text"){ setPath(m.b, m.f, m.v, true); }
  else if(m.t==="textdone"){ setPath(m.b, m.f, m.v, true); render(); refreshInsp(); }
});
function setPath(uid, path, v, silent){
  var b=blk(uid); if(!b) return; remember("t:"+uid+path);
  var p=path.split(".");
  if(p[0]==="L"){ var it=b.c.L[+p[1]]; if(it) it[p[2]]=v; } else b.c[p[0]]=v;
  save(); if(!silent) render();
}

/* ═══════════ панели ═══════════ */
var pane=$("#pane"), insp=$("#insp"), right=$("#right");
var TAB_TITLES={ add:"Добавить", blocks:"Блоки страницы", look:"Оформление", code:"Код страницы", more:"Ещё" };
function tabBox(){ return wide.matches ? pane : insp; }
function openTab(t){
  ui.tab=t; $$("#tabs button").forEach(function(b){ b.classList.toggle("on", b.getAttribute("data-tab")===t); });
  if(!wide.matches){ ui.sheet="tab"; right.classList.add("open"); right.classList.remove("full","peek"); $("#shTitle").textContent=TAB_TITLES[t]; }
  refreshPane(); tabBox().scrollTop=0; hideHint();
}
function openInsp(section){
  if(!wide.matches){ ui.sheet="insp"; right.classList.add("open"); right.classList.remove("full","peek");
    $$("#tabs button").forEach(function(b){ b.classList.remove("on"); }); if(ui.tab) ui.tab=null; }
  refreshInsp();
  if(section){ var s=insp.querySelector('[data-sec="'+section+'"]'); if(s){ var d=s.closest("details"); if(d) d.open=true; insp.scrollTop=s.offsetTop-insp.offsetTop-50; } }
  else insp.scrollTop=0;
}
function closeSheet(){ if(wide.matches) return; ui.sheet=false; right.classList.remove("open","full","peek"); $$("#tabs button").forEach(function(b){ b.classList.remove("on"); }); ui.tab=null; }
$("#shClose").onclick=closeSheet;
$$("#tabs button").forEach(function(b){ b.onclick=function(){ var t=b.getAttribute("data-tab"); if(!wide.matches && ui.sheet==="tab" && ui.tab===t) closeSheet(); else openTab(t); }; });
/* шторку можно тянуть за верх */
(function(){ var h=$(".sh-h"), y0=0, h0=0, on=false;
  h.addEventListener("pointerdown",function(e){ if(wide.matches||e.target.closest("button")) return; on=true; y0=e.clientY; h0=right.getBoundingClientRect().height; right.style.transition="none"; try{ h.setPointerCapture(e.pointerId); }catch(x){} });
  h.addEventListener("pointermove",function(e){ if(!on) return; var nh=Math.max(80,h0-(e.clientY-y0)); right.style.height=nh+"px"; });
  h.addEventListener("pointerup",function(e){ if(!on) return; on=false; right.style.transition=""; var nh=h0-(e.clientY-y0), vh=innerHeight; right.style.height="";
    right.classList.remove("full","peek"); if(nh<vh*.2) closeSheet(); else if(nh<vh*.42) right.classList.add("peek"); else if(nh>vh*.65) right.classList.add("full"); });
})();
wide.addEventListener("change",function(){ right.classList.remove("open"); ui.sheet=false; if(wide.matches){ openTab(ui.tab||"add"); } refreshInsp(); });

function refreshPane(){ if(!ui.tab) return; if(!wide.matches && ui.sheet!=="tab") return;
  var box=tabBox(), sc=box.scrollTop; box.innerHTML="";
  ({ add:paneAdd, blocks:paneBlocks, look:paneLook, code:paneCode, more:paneMore })[ui.tab](box); box.scrollTop=sc; }
function refreshAll(){ refreshPane(); refreshInsp(); $("#title").value=st.title; }

/* ── добавить ── */
var addCat="all", addQ="";
function paneAdd(box){
  var after=ui.sel&&blk(ui.sel.b);
  box.insertAdjacentHTML("beforeend",'<input class="srch" placeholder="Найти: кнопка, карта, отсчёт..." value="'+esc(addQ)+'"><div class="chips" style="margin-bottom:12px"></div><div class="tiles"></div>'+
    '<p class="note" style="margin-top:12px">'+(after?'Блок встанет после «'+esc(BLOCKS[after.type].name)+'».':'Блок встанет в конец страницы.')+'</p>');
  var ch=$(".chips",box), tl=$(".tiles",box);
  [["all","Всё"]].concat(GROUPS).forEach(function(g){ var b=document.createElement("button"); b.textContent=g[1]; if(g[0]===addCat) b.className="on";
    b.onclick=function(){ addCat=g[0]; refreshPane(); }; ch.appendChild(b); });
  var q=addQ.toLowerCase();
  Object.keys(BLOCKS).forEach(function(t){ var B=BLOCKS[t];
    if(addCat!=="all" && B.group!==addCat) return;
    if(q && (B.name+" "+B.desc).toLowerCase().indexOf(q)<0) return;
    var b=document.createElement("button"); b.className="tile"; b.innerHTML=icon(B.glyph,"")+'<b>'+esc(B.name)+'</b><small>'+esc(B.desc)+'</small>';
    b.onclick=function(){ addBlock(t); }; tl.appendChild(b); });
  var s=$(".srch",box); s.oninput=function(){ addQ=s.value; var p=s.selectionStart; refreshPane(); var n=$(".srch",tabBox()); n.focus(); n.setSelectionRange(p,p); };
}
function addBlock(type){
  remember(); var b=newBlock(type,nextUid(st)), at=ui.sel?bIdx(ui.sel.b):-1;
  if(at<0) st.blocks.push(b); else st.blocks.splice(at+1,0,b);
  ui.sel={b:b.uid,e:null}; goSel=true; render(true); save();
  if(wide.matches){ refreshPane(); refreshInsp(); } else { closeSheet(); }
  toast("Добавлен блок «"+BLOCKS[type].name+"»");
}

/* ── блоки ── */
function snippet(b){ var c=b.c, t=c.title||c.name||c.text||c.btn||(c.L&&c.L[0]&&(c.L[0].t||c.L[0].q))||""; return String(t).split("\n")[0].slice(0,40); }
function paneBlocks(box){
  if(!st.blocks.length){ box.innerHTML='<p class="note">Блоков пока нет. Нажмите «Добавить».</p>'; return; }
  st.blocks.forEach(function(b,i){ var B=BLOCKS[b.type], on=ui.sel&&ui.sel.b===b.uid;
    var r=document.createElement("div"); r.className="lay"+(on?" on":"")+(b.o.hidden?" off":"");
    r.innerHTML='<button class="nm">'+icon(B.glyph,"")+'<span>'+esc(B.name)+'</span><small>'+esc(snippet(b))+'</small></button>'+
      '<button class="sb" data-a="up" title="Выше">'+sv("up")+'</button><button class="sb" data-a="down" title="Ниже">'+sv("down")+'</button>'+
      '<button class="sb" data-a="hide" title="'+(b.o.hidden?"Показать":"Скрыть до нажатия кнопки")+'">'+sv("eye")+'</button><button class="sb" data-a="del" title="Удалить">'+sv("del")+'</button>';
    $(".nm",r).onclick=function(){ selectSel({b:b.uid,e:null}, true); if(!wide.matches) openInsp(); };
    $$(".sb",r).forEach(function(x){ x.onclick=function(){ blockAct(x.getAttribute("data-a"), b.uid); }; });
    box.appendChild(r);
    if(on && wide.matches){ var k=document.createElement("div"); k.className="kids";
      var keys=Object.keys(els(b)).filter(function(x){ return x!=="i*"; });
      if(b.c.L) b.c.L.forEach(function(_,j){ keys.push("i"+j); });
      keys.forEach(function(key){ var e=document.createElement("button"); e.textContent=elName(b,key)+((b.e[key]||{}).hide?" (скрыт)":"");
        if(ui.sel.e===key) e.className="on"; e.onclick=function(){ selectSel({b:b.uid,e:key}, true); }; k.appendChild(e); });
      if(keys.length) box.appendChild(k); }
  });
  box.insertAdjacentHTML("beforeend",'<p class="note" style="margin-top:12px">Скрытый блок не виден посетителю, пока кнопка с действием «Показать или скрыть блок» его не откроет.</p>');
}
function selectSel(s, scroll){ ui.sel=s; send({t:"select", sel:s, scroll:!!scroll}); refreshInsp(); refreshPane(); }
function blockAct(a, uid){
  var i=bIdx(uid); if(i<0) return; var b=st.blocks[i];
  if(a==="up"||a==="down"){ var j=i+(a==="up"?-1:1); if(j<0||j>=st.blocks.length) return; remember(); st.blocks[i]=st.blocks[j]; st.blocks[j]=b; goSel=true; ui.sel={b:uid,e:null}; }
  else if(a==="dup"){ remember(); var c=clone(b); c.uid=nextUid(st); st.blocks.splice(i+1,0,c); ui.sel={b:c.uid,e:null}; goSel=true; toast("Копия блока ниже"); }
  else if(a==="del"){ remember(); st.blocks.splice(i,1); if(ui.sel&&ui.sel.b===uid) ui.sel=null; toast("Блок удалён. Вернуть: стрелка отмены"); if(!wide.matches && ui.sheet==="insp") closeSheet(); }
  else if(a==="hide"){ remember(); b.o.hidden=!b.o.hidden; toast(b.o.hidden?"Блок скрыт от посетителей":"Блок снова виден"); }
  render(true); save(); refreshPane(); refreshInsp();
}

/* ── инструменты с плашки над элементом ── */
function tool(t, s){
  if(s) ui.sel=s; var b=s&&blk(s.b); if(!b) return;
  if(t==="color") openInsp("color"); else if(t==="font") openInsp("text"); else if(t==="radius") openInsp("radius");
  else if(t==="more"||t==="tap2") openInsp(s.e&&t==="more"?"content":null);
  else if(t==="variant") openInsp("variant");
  else if(t==="photo"){ var f=photoField(b,s.e); if(f) pickPhoto(false, f.max, function(u){ remember(); f.set(u); changed(true); refreshInsp(); }); else openInsp("content"); }
  else if(t==="parent") selectSel({b:s.b,e:null}, false);
  else if(t==="up"||t==="down") blockAct(t, s.b);
  else if(t==="dup"){ if(s.e&&/^i\d+$/.test(s.e)){ remember(); var k=+s.e.slice(1); b.c.L.splice(k+1,0,clone(b.c.L[k])); ui.sel={b:b.uid,e:"i"+(k+1)}; render(true); save(); refreshInsp(); } else blockAct("dup", s.b); }
  else if(t==="del"){
    if(!s.e) return blockAct("del", s.b);
    remember();
    if(/^i\d+$/.test(s.e)){ var n=+s.e.slice(1); b.c.L.splice(n,1); shiftItemStyles(b,n); ui.sel={b:b.uid,e:null}; toast("Пункт удалён"); render(true); }
    else { (b.e[s.e]||(b.e[s.e]={})).hide=true; ui.sel={b:b.uid,e:null}; toast("Элемент скрыт. Вернуть: настройки блока"); pushCss(); send({t:"select",sel:ui.sel}); }
    save(); refreshInsp();
  }
}
function shiftItemStyles(b,n){ var e={}; for(var k in b.e){ var m=k.match(/^i(\d+)$/); if(!m){ e[k]=b.e[k]; continue; } var j=+m[1]; if(j<n) e[k]=b.e[k]; else if(j>n) e["i"+(j-1)]=b.e[k]; } b.e=e; }
function photoField(b,key){
  if(!key) return null;
  if(/^i\d+$/.test(key) && BLOCKS[b.type].list && BLOCKS[b.type].list.photos){ var it=b.c.L[+key.slice(1)]; return { max:1200, set:function(u){ it.src=u; } }; }
  var f=(BLOCKS[b.type].fields||[]).filter(function(x){ return x.type==="img"; })[0];
  return f ? { max:f.max||1200, set:function(u){ b.c[f.id]=u; } } : null;
}

/* ═══════════ инспектор: настройки выбранного ═══════════ */
function refreshInsp(){
  if(!wide.matches && ui.sheet!=="insp") return;
  var sc=insp.scrollTop; insp.innerHTML="";
  var b=ui.sel&&blk(ui.sel.b);
  if(!b){ $("#shTitle").textContent="Настройки";
    insp.innerHTML='<p class="note" style="margin-top:8px">Нажмите на любой элемент страницы: кнопку, текст, фото. Его можно двигать, менять размер за уголки и цвет прямо на странице. Здесь появятся точные настройки.</p>'+
      '<p class="note" style="margin-top:10px">Второе нажатие на текст включает правку прямо на странице.</p>'; return; }
  var B=BLOCKS[b.type], key=ui.sel.e;
  $("#shTitle").textContent= key ? elName(b,key) : B.name;
  if(key){
    var kind=kindOf(b,key), isItem=/^i\d+$/.test(key);
    var jump=document.createElement("div"); jump.className="chips jump";
    [["color","Цвет"]].concat(kind!=="img"&&kind!=="round"?[["text","Текст"]]:[]).concat([["size","Размер"],["content","Содержимое"]]).forEach(function(j){
      var x=document.createElement("button"); x.textContent=j[1]; x.onclick=function(){ var s=insp.querySelector('[data-sec="'+j[0]+'"]'); if(s) insp.scrollTop=s.offsetTop-insp.offsetTop-50; }; jump.appendChild(x); });
    insp.appendChild(jump);
    if(isItem) insp.appendChild(el('<div class="chips" style="margin:2px 0 6px"><button data-sc="one" class="'+(ui.scope!=="all"?"on":"")+'">только этот пункт</button><button data-sc="all" class="'+(ui.scope==="all"?"on":"")+'">все пункты</button></div>',function(n){
      $$("button",n).forEach(function(x){ x.onclick=function(){ ui.scope=x.getAttribute("data-sc"); refreshInsp(); }; }); }));
    var tk=isItem&&ui.scope==="all"?"i*":key;
    colorSec(b,tk,kind);
    if(kind!=="img"&&kind!=="round") textSec(b,tk);
    sizeSec(b,key,kind,tk);
    var cs=sec("content","Содержимое блока «"+B.name+"»"); insp.appendChild(cs);
    if(isItem && B.list) listItemFields(cs,b,+key.slice(1)); else contentFields(cs,b);
    insp.appendChild(el('<div class="row" style="margin-top:14px"><button class="btn">Выбрать весь блок</button></div>',function(n){ $("button",n).onclick=function(){ selectSel({b:b.uid,e:null},false); }; }));
  } else {
    var vs=sec("variant","Вид блока"); insp.appendChild(vs);
    vs.appendChild(el('<div class="vars">'+B.variants.map(function(v){ return '<button data-v="'+v[0]+'" class="'+(b.v===v[0]?"on":"")+'">'+esc(v[1])+'</button>'; }).join("")+'</div>',function(n){
      $$("button",n).forEach(function(x){ x.onclick=function(){ remember(); b.v=x.getAttribute("data-v"); changed(true); refreshInsp(); }; }); }));
    var cs2=sec("content","Содержимое"); insp.appendChild(cs2); contentFields(cs2,b);
    if(B.list) listEditor(cs2,b);
    var hidden=Object.keys(b.e).filter(function(k){ return b.e[k]&&b.e[k].hide; });
    if(hidden.length) cs2.appendChild(el('<div class="f"><label>Скрытые элементы</label><div class="chips">'+hidden.map(function(k){ return '<button data-k="'+k+'">вернуть: '+esc(elName(b,k))+'</button>'; }).join("")+'</div></div>',function(n){
      $$("button",n).forEach(function(x){ x.onclick=function(){ remember(); delete b.e[x.getAttribute("data-k")].hide; changed(false); refreshInsp(); }; }); }));
    var ls=sec("block","Блок на странице"); insp.appendChild(ls);
    ls.appendChild(choice("Выравнивание",[["center","по центру"],["left","слева"]],b.o.align,function(v){ remember(); b.o.align=v; changed(true); }));
    ls.appendChild(choice("Отступы",[["s","мало"],["m","средне"],["l","много"]],b.o.pad,function(v){ remember(); b.o.pad=v; changed(true); }));
    ls.appendChild(toggle("Подложка-карточка под блоком",b.o.card,function(v){ remember(); b.o.card=v; changed(true); }));
    ls.appendChild(toggle("Скрыт, пока не нажмут кнопку",b.o.hidden,function(v){ remember(); b.o.hidden=v; changed(true); }));
    ls.appendChild(el('<div class="row" style="margin-top:8px"><button class="btn" data-a="up">'+sv("up")+'Выше</button><button class="btn" data-a="down">'+sv("down")+'Ниже</button><button class="btn" data-a="dup">'+sv("dup")+'Копия</button><button class="btn del" data-a="del">'+sv("del")+'Удалить</button></div>',function(n){
      $$("button",n).forEach(function(x){ x.onclick=function(){ blockAct(x.getAttribute("data-a"),b.uid); }; }); }));
  }
  insp.scrollTop=sc;
}
function el(html, fn){ var d=document.createElement("div"); d.innerHTML=html; var n=d.firstElementChild; if(fn) fn(n); return n; }
function sec(id,title){ var s=document.createElement("div"); s.className="sec"; s.setAttribute("data-sec",id); s.innerHTML='<div class="sh">'+esc(title)+'</div>'; return s; }
function choice(label, opts, cur, fn){
  return el('<div class="f"><label>'+esc(label)+'</label><div class="chips">'+opts.map(function(o){ return '<button data-v="'+o[0]+'" class="'+(o[0]===cur?"on":"")+'">'+esc(o[1])+'</button>'; }).join("")+'</div></div>',function(n){
    $$("button",n).forEach(function(x){ x.onclick=function(){ $$("button",n).forEach(function(y){ y.classList.toggle("on",y===x); }); fn(x.getAttribute("data-v")); }; }); });
}
function toggle(label, v, fn){ return el('<label class="tg"><span>'+esc(label)+'</span><input type="checkbox"'+(v?" checked":"")+'></label>',function(n){ $("input",n).onchange=function(){ fn(this.checked); }; }); }
function range(label, v, min, max, step, unit, fn){
  return el('<div class="f"><div class="lab"><span>'+esc(label)+'</span><output>'+v+unit+'</output></div><input type="range" min="'+min+'" max="'+max+'" step="'+step+'" value="'+v+'"></div>',function(n){
    var o=$("output",n); $("input",n).oninput=function(){ o.textContent=this.value+unit; fn(Number(this.value)); }; }); }

/* цвет элемента */
function colorSec(b,key,kind){
  var s=sec("color","Цвет"); insp.appendChild(s); var o=b.e[key]||{};
  var props=kind==="text"?[["fg","Текст"]]:kind==="img"||kind==="round"?[["bd","Рамка"]]:[["bg","Фон"],["fg","Текст"],["bd","Обводка"]];
  if(!ui.cprop || !props.some(function(p){ return p[0]===ui.cprop; })) ui.cprop=props[0][0];
  if(props.length>1) s.appendChild(el('<div class="chips" style="margin-bottom:10px">'+props.map(function(p){ return '<button data-p="'+p[0]+'" class="'+(ui.cprop===p[0]?"on":"")+'">'+p[1]+'</button>'; }).join("")+'</div>',function(n){
    $$("button",n).forEach(function(x){ x.onclick=function(){ ui.cprop=x.getAttribute("data-p"); refreshInsp(); }; }); }));
  var T=themeOf(st), cur=o[ui.cprop]||"";
  var pal=[T.ac,T.ac2,T.tx,T.bg,T.bg2,"#ffffff","#111111"].filter(function(c,i,a){ return a.indexOf(c)===i; });
  var rec=ui.recent.filter(function(c){ return pal.indexOf(c)<0; }).slice(0,6);
  function sw(c){ return '<button style="background:'+esc(c)+'" data-c="'+esc(c)+'" class="'+(c===cur?"on":"")+'" title="'+esc(c)+'"></button>'; }
  s.appendChild(el('<div><div class="lab"><span>Цвета темы</span></div><div class="sws">'+pal.map(sw).join("")+
    '<label class="any" title="Любой цвет"><input type="color" value="'+(/^#[0-9a-f]{6}$/i.test(cur)?cur:"#ff8a4c")+'"></label>'+
    '<button class="none" data-c="" title="Как было (по теме)"></button></div>'+
    (rec.length?'<div class="lab" style="margin-top:10px"><span>Недавние</span></div><div class="sws">'+rec.map(sw).join("")+'</div>':'')+'</div>',function(n){
    $$("button[data-c]",n).forEach(function(x){ x.onclick=function(){ setStyle(b,key,ui.cprop,x.getAttribute("data-c")||null,true); refreshInsp(); }; });
    var ci=$("input[type=color]",n); ci.oninput=function(){ setStyle(b,key,ui.cprop,ci.value,false); }; ci.onchange=function(){ addRecent(ci.value); refreshInsp(); };
  }));
  if(ui.cprop==="bg") s.appendChild(range("Прозрачность фона", o.op!=null?o.op:100, 0,100,5,"%",function(v){ var c=(b.e[key]||{}).bg; remember("op"+key);
    var e=b.e[key]||(b.e[key]={}); e.op=v; if(c){ e.bg=withAlpha(e.bgRaw||c, v); e.bgRaw=e.bgRaw||c; } changed(false); }));
}
function withAlpha(c,a){ var m=String(c).match(/^#([0-9a-f]{6})$/i); if(!m) return c; var n=parseInt(m[1],16); return "rgba("+(n>>16)+","+((n>>8)&255)+","+(n&255)+","+(a/100)+")"; }
function addRecent(c){ ui.recent=[c].concat(ui.recent.filter(function(x){ return x!==c; })).slice(0,8); try{ localStorage.setItem("forge_recent_colors",JSON.stringify(ui.recent)); }catch(e){} }
function setStyle(b,key,prop,val,fromSwatch){
  remember("st"+key+prop); var o=b.e[key]||(b.e[key]={});
  if(val==null||val===""){ delete o[prop]; if(prop==="bg"){ delete o.bgRaw; delete o.op; } }
  else { if(prop==="bg"){ o.bgRaw=val; o[prop]=o.op!=null&&o.op<100?withAlpha(val,o.op):val; } else o[prop]=val; if(fromSwatch) addRecent(val); }
  if(key==="i*"){ /* «все пункты»: убираем такие же правки у отдельных пунктов */ for(var k in b.e) if(/^i\d+$/.test(k) && b.e[k]) delete b.e[k][prop]; }
  changed(false);
}
function textSec(b,key){
  var s=sec("text","Текст"); insp.appendChild(s); var o=b.e[key]||{};
  s.appendChild(range("Размер текста", Math.round((o.fs||1)*100), 40,300,5,"%",function(v){ remember("fs"+key); (b.e[key]||(b.e[key]={})).fs=v/100; changed(false); }));
  s.appendChild(choice("Выравнивание",[["","как в блоке"],["left","слева"],["center","по центру"],["right","справа"]],o.al||"",function(v){ remember(); var e=b.e[key]||(b.e[key]={}); if(v) e.al=v; else delete e.al; changed(false); }));
  s.appendChild(el('<button class="btn" style="width:100%">Править текст прямо на странице</button>',function(n){ n.onclick=function(){ if(!wide.matches) right.classList.add("peek"); send({t:"edittext"}); }; }));
}
function sizeSec(b,key,kind,tk){
  var s=sec("size","Размер и положение"); insp.appendChild(s); var o=b.e[key]||{}, pc=ui.pos==="pc";
  var X=pc&&o.dx!=null?o.dx:(o.x||0), Y=pc&&o.dy!=null?o.dy:(o.y||0), W=pc&&o.dw?o.dw:(o.w||"");
  s.appendChild(el('<div class="nums"><label><em>X</em><input type="number" step="1" data-k="x" value="'+X+'"></label><label><em>Y</em><input type="number" step="1" data-k="y" value="'+Y+'"></label><label><em>Ш</em><input type="number" step="1" data-k="w" placeholder="авто" value="'+W+'"></label></div>',function(n){
    $$("input",n).forEach(function(i){ i.onchange=function(){ remember(); var e=b.e[key]||(b.e[key]={}), k=i.getAttribute("data-k"), v=i.value===""?null:Number(i.value);
      var kk=pc?"d"+k:k; if(v==null||(k!=="w"&&v===0&&!pc)) delete e[kk]; else e[kk]=v; changed(false); }; }); }));
  s.appendChild(el('<p class="note" style="margin:6px 0 10px">Числа в процентах ширины блока: так элемент стоит на месте и на телефоне, и на компьютере.'+(pc?' Сейчас правится положение <b>только для компьютера</b>.':'')+'</p>'));
  if(kind!=="text") s.appendChild(range("Скругление углов", o.r!=null?o.r:(kind==="round"?50:themeOf(st).r), 0, kind==="round"?100:60, 1, "px", function(v){ remember("r"+tk); (b.e[tk]||(b.e[tk]={})).r=v; changed(false); }));
  s.firstChild.setAttribute("data-sec","radius");
  s.appendChild(el('<button class="btn" style="width:100%;margin-top:4px">'+sv("reset")+'Вернуть на место и в исходный размер</button>',function(n){ n.onclick=function(){ remember(); var e=b.e[key]; if(e){ ["x","y","w","fs","dx","dy","dw"].forEach(function(k){ delete e[k]; }); } changed(false); refreshInsp(); }; }));
}

/* поля содержимого */
function contentFields(box,b){
  (BLOCKS[b.type].fields||[]).forEach(function(f){ box.appendChild(field(f, b.c[f.id], function(v,full){ remember("c"+b.uid+f.id); b.c[f.id]=v; changed(full!==false); }, b)); });
}
function listItemFields(box,b,i){
  var L=BLOCKS[b.type].list, it=b.c.L[i]; if(!it) return;
  L.fields.forEach(function(f){ box.appendChild(field(f, it[f.id], function(v,full){ remember("l"+b.uid+i+f.id); it[f.id]=v; changed(full!==false); }, b)); });
  box.appendChild(el('<p class="note">Весь список пунктов: выберите блок целиком.</p>'));
}
function listEditor(box,b){
  var L=BLOCKS[b.type].list;
  box.appendChild(el('<div class="sh">'+esc(L.label)+' <span>'+b.c.L.length+'</span></div>'));
  if(L.photos){
    var th=el('<div class="thumbs">'+b.c.L.map(function(it,i){ return '<div style="'+(it.src?'background-image:url('+esc(it.src)+')':'')+'">'+(it.src?'':'нет фото')+'<button data-i="'+i+'" title="Убрать">&times;</button></div>'; }).join("")+'</div>');
    $$("button",th).forEach(function(x){ x.onclick=function(){ remember(); var n=+x.getAttribute("data-i"); b.c.L.splice(n,1); shiftItemStyles(b,n); changed(true); refreshInsp(); }; });
    box.appendChild(th);
    box.appendChild(el('<div class="row">'+(touch?'<button class="btn" data-cam>'+sv("cam")+'Снять</button>':'')+'<button class="btn" data-gal>'+sv("img")+'Добавить фото</button></div>',function(n){
      function add(cam){ pickPhoto(cam,1200,function(u){ remember(); var empty=b.c.L.filter(function(x){ return !x.src; })[0]; if(empty) empty.src=u; else b.c.L.push({src:u}); changed(true); refreshInsp(); }, !cam); }
      var c=$("[data-cam]",n); if(c) c.onclick=function(){ add(true); }; $("[data-gal]",n).onclick=function(){ add(false); }; }));
    return;
  }
  b.c.L.forEach(function(it,i){
    var card=el('<div class="li'+(ui.sel&&ui.sel.e==="i"+i?" sel":"")+'"><div class="lh"><b>'+(i+1)+'. '+esc(it.t||it.q||it.tm||it.n||"")+'</b>'+
      '<button data-a="up" title="Выше">'+sv("up")+'</button><button data-a="down" title="Ниже">'+sv("down")+'</button><button data-a="del" title="Удалить">'+sv("x")+'</button></div></div>');
    L.fields.forEach(function(f){ card.appendChild(field(f, it[f.id], function(v,full){ remember("l"+b.uid+i+f.id); it[f.id]=v; changed(full!==false); }, b)); });
    $$(".lh button",card).forEach(function(x){ x.onclick=function(){ var a=x.getAttribute("data-a"); remember();
      if(a==="del"){ b.c.L.splice(i,1); shiftItemStyles(b,i); }
      else { var j=i+(a==="up"?-1:1); if(j<0||j>=b.c.L.length) return; var t=b.c.L[i]; b.c.L[i]=b.c.L[j]; b.c.L[j]=t; var ei=b.e["i"+i], ej=b.e["i"+j]; if(ej) b.e["i"+i]=ej; else delete b.e["i"+i]; if(ei) b.e["i"+j]=ei; else delete b.e["i"+j]; }
      changed(true); refreshInsp(); }; });
    box.appendChild(card);
  });
  box.appendChild(el('<button class="btn" style="width:100%">'+sv("plus")+esc(L.add)+'</button>',function(n){ n.onclick=function(){ remember(); b.c.L.push(clone(L.item)); changed(true); refreshInsp(); }; }));
}
function field(f, v, set, b){
  var L='<label>'+esc(f.label)+'</label>';
  if(f.type==="text") return el('<div class="f">'+L+'<input type="text" value="'+esc(v)+'"></div>',function(n){ $("input",n).oninput=function(){ set(this.value); }; });
  if(f.type==="area"||f.type==="code") return el('<div class="f">'+L+'<textarea'+(f.type==="code"?' class="code" spellcheck="false"':'')+'>'+esc(v)+'</textarea></div>',function(n){ $("textarea",n).oninput=function(){ set(this.value); }; });
  if(f.type==="num") return el('<div class="f">'+L+'<input type="number" inputmode="numeric" value="'+esc(v)+'"></div>',function(n){ $("input",n).oninput=function(){ if(this.value!=="") set(Number(this.value)); }; });
  if(f.type==="date"||f.type==="time") return el('<div class="f">'+L+'<input type="'+f.type+'" value="'+esc(v)+'"></div>',function(n){ $("input",n).onchange=function(){ set(this.value); }; });
  if(f.type==="icon") return el('<div class="f">'+L+'<div class="icg"><button data-i="" class="'+(!v?"on":"")+'">нет</button>'+ICON_LIST.map(function(k){ return '<button data-i="'+k+'" class="'+(v===k?"on":"")+'" title="'+esc(ICON_NAMES[k]||k)+'">'+icon(k,"")+'</button>'; }).join("")+'</div></div>',function(n){
    $$("button",n).forEach(function(x){ x.onclick=function(){ $$("button",n).forEach(function(y){ y.classList.toggle("on",y===x); }); set(x.getAttribute("data-i")); }; }); });
  if(f.type==="action"){ var a=v||{t:"link",v:""};
    return el('<div class="f">'+L+'<select>'+ACTIONS.map(function(x){ return '<option value="'+x[0]+'"'+(x[0]===a.t?" selected":"")+'>'+esc(x[1])+'</option>'; }).join("")+'</select><div class="av" style="margin-top:6px"></div></div>',function(n){
      var sl=$("select",n), box=$(".av",n);
      function val(){ box.innerHTML=""; var t=sl.value, def=ACTIONS.filter(function(x){ return x[0]===t; })[0];
        if(t==="block"||t==="toggle"){ var s=document.createElement("select"); s.innerHTML='<option value="">выберите блок</option>'+st.blocks.map(function(bb,i){ return '<option value="'+bb.uid+'"'+(bb.uid===a.v?" selected":"")+'>'+(i+1)+'. '+esc(BLOCKS[bb.type].name)+' '+esc(snippet(bb))+'</option>'; }).join("");
          s.onchange=function(){ a={t:t,v:s.value}; set(clone(a)); }; box.appendChild(s); }
        else { var i=document.createElement("input"); i.type="text"; i.placeholder=def[2]; i.value=a.v||""; i.oninput=function(){ a={t:t,v:i.value}; set(clone(a)); }; box.appendChild(i); } }
      sl.onchange=function(){ a={t:sl.value,v:(sl.value==="block"||sl.value==="toggle")?"":a.v}; set(clone(a)); val(); }; val(); }); }
  if(f.type==="img") return el('<div class="f">'+L+'<div class="ph"><div class="pv" style="'+(v?'background-image:url('+esc(v)+')':'')+'">'+(v?'':sv("img"))+'</div><div class="bt">'+
      '<div class="row">'+(touch?'<button class="btn" data-cam>'+sv("cam")+'Снять</button>':'')+'<button class="btn" data-gal>'+sv("img")+(touch?'Галерея':'Выбрать фото')+'</button></div>'+
      '<input type="text" placeholder="или ссылка https://..." value="'+(v&&v.indexOf("data:")!==0?esc(v):"")+'">'+(v?'<button class="btn del" data-rm>Убрать фото</button>':'')+'</div></div></div>',function(n){
    var c=$("[data-cam]",n); if(c) c.onclick=function(){ pickPhoto(true,f.max||1200,function(u){ set(u); refreshInsp(); }); };
    $("[data-gal]",n).onclick=function(){ pickPhoto(false,f.max||1200,function(u){ set(u); refreshInsp(); }); };
    $("input",n).onchange=function(){ set(this.value.trim()); refreshInsp(); };
    var r=$("[data-rm]",n); if(r) r.onclick=function(){ set(""); refreshInsp(); }; });
  return el('<div></div>');
}

/* ═══════════ фото: снять или выбрать, ужать прямо в браузере ═══════════ */
function pickPhoto(cam, max, done, multi){
  var inp=cam?$("#fCam"):$("#fImg"); inp.value=""; inp.multiple=!!multi;
  inp.onchange=function(){ var files=[].slice.call(inp.files||[]); if(!files.length) return; toast("Ужимаю фото...");
    files.reduce(function(p,f){ return p.then(function(){ return shrink(f,max).then(function(u){ if(u) done(u); else toast("Это фото открыть не получилось"); }); }); }, Promise.resolve())
      .then(function(){ toast(files.length>1?"Фото добавлены":"Фото добавлено"); }); };
  inp.click();
}
/* холст рисует фото в нужном размере, потом подбираем качество, пока файл не станет лёгким */
var webpOk=(function(){ try{ var c=document.createElement("canvas"); c.width=c.height=1; return c.toDataURL("image/webp").indexOf("data:image/webp")===0; }catch(e){ return false; } })();
function shrink(file, max){
  var target=max>=1400?330000:max>=1000?220000:90000;
  function draw(src,w,h){
    var k=Math.min(1,max/Math.max(w,h)), c=document.createElement("canvas"); c.width=Math.max(1,Math.round(w*k)); c.height=Math.max(1,Math.round(h*k));
    var g=c.getContext("2d"); g.imageSmoothingQuality="high"; g.drawImage(src,0,0,c.width,c.height);
    var type=webpOk?"image/webp":"image/jpeg", q=.86, url=c.toDataURL(type,q);
    while(url.length*.75>target && q>.45){ q-=.08; url=c.toDataURL(type,q); }
    return url;
  }
  if(window.createImageBitmap) return createImageBitmap(file,{imageOrientation:"from-image"}).then(function(bm){ var u=draw(bm,bm.width,bm.height); bm.close&&bm.close(); return u; }).catch(viaImg);
  return viaImg();
  function viaImg(){ return new Promise(function(res){ var u=URL.createObjectURL(file), im=new Image(); im.onload=function(){ res(draw(im,im.naturalWidth,im.naturalHeight)); URL.revokeObjectURL(u); }; im.onerror=function(){ res(null); }; im.src=u; }); }
}

/* ── оформление ── */
var lookTab="theme";
function paneLook(box){
  box.appendChild(el('<div class="chips" style="margin-bottom:14px">'+[["theme","Тема"],["bg","Фон"],["fonts","Шрифты"],["page","Страница"]].map(function(t){ return '<button data-t="'+t[0]+'" class="'+(lookTab===t[0]?"on":"")+'">'+t[1]+'</button>'; }).join("")+'</div>',function(n){
    $$("button",n).forEach(function(x){ x.onclick=function(){ lookTab=x.getAttribute("data-t"); refreshPane(); }; }); }));
  var T=themeOf(st);
  if(lookTab==="theme"){
    var g=el('<div class="themes"></div>');
    Object.keys(THEMES).forEach(function(k){ var t=THEMES[k];
      g.appendChild(el('<button class="th1'+(st.theme===k?" on":"")+'"><div class="s" style="background:linear-gradient(160deg,'+t.bg+','+t.bg2+');color:'+t.tx+'"><b style="font-family:'+esc(fontStack(t.fh))+'">Аа</b><i style="background:'+t.ac+'"></i></div><span>'+esc(t.name)+'</span></button>',function(n){
        n.onclick=function(){ remember(); st.theme=k; st.t={}; changed(true); refreshPane(); refreshInsp(); }; })); });
    box.appendChild(g);
    box.appendChild(el('<div class="sh">Свои цвета темы</div>'));
    [["ac","Главный цвет (кнопки)"],["ac2","Второй цвет"],["tx","Текст"],["bg","Фон, верх"],["bg2","Фон, низ"]].forEach(function(p){
      box.appendChild(el('<div class="f"><label>'+p[1]+'</label><div class="sws"><label class="any" style="background:'+esc(T[p[0]])+'"><input type="color" value="'+(/^#[0-9a-f]{6}$/i.test(T[p[0]])?T[p[0]]:"#888888")+'"></label>'+
        (st.t[p[0]]?'<button class="btn" style="padding:6px 10px">как в теме</button>':'')+'</div></div>',function(n){
        var i=$("input",n); i.oninput=function(){ remember("t"+p[0]); st.t[p[0]]=i.value; $(".any",n).style.background=i.value; changed(true); };
        var r=$(".btn",n); if(r) r.onclick=function(){ remember(); delete st.t[p[0]]; changed(true); refreshPane(); }; })); });
    box.appendChild(choice("Вид кнопок",BTN_STYLES,T.btn,function(v){ remember(); st.t.btn=v; changed(true); }));
    box.appendChild(range("Скругление углов",T.r,0,32,1,"px",function(v){ remember("tr"); st.t.r=v; changed(true); }));
  }
  if(lookTab==="fonts"){
    var opts=Object.keys(FONTS).map(function(k){ return [k, FONTS[k].n||"системный"]; });
    [["fh","Заголовки"],["fb","Основной текст"]].forEach(function(p){
      box.appendChild(el('<div class="f"><label>'+p[1]+'</label><select>'+opts.map(function(o){ return '<option value="'+o[0]+'"'+(T[p[0]]===o[0]?" selected":"")+'>'+esc(o[1])+'</option>'; }).join("")+'</select></div>',function(n){
        $("select",n).onchange=function(){ remember(); st.t[p[0]]=this.value; changed(true); }; })); });
    box.appendChild(el('<p class="note">Шрифты подключаются с Bunny Fonts: только те два, что выбраны. Все поддерживают кириллицу.</p>'));
  }
  if(lookTab==="bg") paneBg(box);
  if(lookTab==="page"){
    box.appendChild(choice("Ширина страницы",[["narrow","узкая"],["normal","обычная"],["wide","широкая"]],st.page.w,function(v){ remember(); st.page.w=v; changed(true); }));
    box.appendChild(choice("Расстояние между блоками",[["s","мало"],["m","средне"],["l","много"]],st.page.gap,function(v){ remember(); st.page.gap=v; changed(true); }));
    box.appendChild(el('<div class="f"><label>Описание для поисковиков и превью ссылки</label><textarea>'+esc(st.desc||"")+'</textarea></div>',function(n){ $("textarea",n).oninput=function(){ remember("desc"); st.desc=this.value; save(); }; }));
  }
}
function paneBg(box){
  var bg=st.bg;
  box.appendChild(choice("Фон страницы",[["theme","как в теме"],["color","цвет"],["grad","градиент"],["photo","своё фото"]],bg.mode,function(v){ remember(); bg.mode=v; changed(true); refreshPane(); }));
  if(bg.mode==="color") box.appendChild(colorRow("Цвет",bg.color,function(v){ remember("bgc"); bg.color=v; changed(true); }));
  if(bg.mode==="grad"){ box.appendChild(el('<div class="two"></div>',function(n){ n.appendChild(colorRow("Первый",bg.c1,function(v){ remember("g1"); bg.c1=v; changed(true); })); n.appendChild(colorRow("Второй",bg.c2,function(v){ remember("g2"); bg.c2=v; changed(true); })); }));
    box.appendChild(range("Направление",bg.ang,0,360,15,"°",function(v){ remember("ga"); bg.ang=v; changed(true); })); }
  if(bg.mode==="photo"){
    var kb=bg.img&&bg.img.indexOf("data:")===0?Math.round(bg.img.length*.75/1024):0;
    box.appendChild(el('<div class="bgpv" style="'+(bg.img?'background-image:url('+esc(bg.img)+');background-position:'+bg.fx+'% '+bg.fy+'%':'')+'"><i style="left:'+bg.fx+'%;top:'+bg.fy+'%"></i></div>',function(n){
      if(!bg.img){ n.innerHTML='<div class="note" style="padding:58px 0;text-align:center">фото ещё не выбрано</div>'; return; }
      function at(e){ var r=n.getBoundingClientRect(); bg.fx=Math.round(Math.max(0,Math.min(100,(e.clientX-r.left)/r.width*100))); bg.fy=Math.round(Math.max(0,Math.min(100,(e.clientY-r.top)/r.height*100)));
        $("i",n).style.left=bg.fx+"%"; $("i",n).style.top=bg.fy+"%"; n.style.backgroundPosition=bg.fx+"% "+bg.fy+"%"; }
      var on=false; n.onpointerdown=function(e){ remember(); on=true; n.setPointerCapture(e.pointerId); at(e); }; n.onpointermove=function(e){ if(on) at(e); }; n.onpointerup=function(){ on=false; changed(true); }; }));
    box.appendChild(el('<div class="row">'+(touch?'<button class="btn" data-cam>'+sv("cam")+'Снять</button>':'')+'<button class="btn" data-gal>'+sv("img")+(bg.img?'Заменить':'Выбрать фото')+'</button>'+(bg.img?'<button class="btn del" data-rm>Убрать</button>':'')+'</div>',function(n){
      function pick(cam){ pickPhoto(cam,1600,function(u){ remember(); bg.img=u; changed(true); refreshPane(); }); }
      var c=$("[data-cam]",n); if(c) c.onclick=function(){ pick(true); }; $("[data-gal]",n).onclick=function(){ pick(false); };
      var r=$("[data-rm]",n); if(r) r.onclick=function(){ remember(); bg.img=""; changed(true); refreshPane(); }; }));
    if(kb) box.appendChild(el('<p class="note" style="margin:6px 0 10px">Сжато до '+kb+' КБ, хранится в этом браузере. Точку, вокруг которой фото обрезается, двигайте пальцем по превью.</p>'));
    box.appendChild(choice("Как разместить",[["cover","растянуть на экран"],["contain","вписать целиком"],["repeat","плиткой"],["auto","как есть"]],bg.fit,function(v){ remember(); bg.fit=v; changed(true); }));
    box.appendChild(toggle("Фон стоит на месте при прокрутке",bg.fixed,function(v){ remember(); bg.fixed=v; changed(true); }));
    box.appendChild(range("Затемнение (текст читается лучше)",bg.dark,0,85,5,"%",function(v){ remember("dk"); bg.dark=v; changed(true); }));
    box.appendChild(range("Размытие",bg.blur,0,20,1,"px",function(v){ remember("bl"); bg.blur=v; changed(true); }));
  }
}
function colorRow(label,v,fn){ return el('<div class="f"><label>'+esc(label)+'</label><div class="sws"><label class="any" style="background:'+esc(v)+'"><input type="color" value="'+esc(v)+'"></label><span class="note">'+esc(v)+'</span></div></div>',function(n){
  var i=$("input",n); i.oninput=function(){ $(".any",n).style.background=i.value; $(".note",n).textContent=i.value; fn(i.value); }; }); }

/* ── код ── */
function paneCode(box){
  box.appendChild(el('<div><p class="note">Готовый код вашей страницы. Комментарии подсказывают, какая часть за что отвечает. Выбранный блок подсвечен.</p>'+
    '<div class="row" style="margin-top:10px"><button class="btn" data-a="copy">Скопировать</button><button class="btn" data-a="html">Скачать HTML</button><button class="btn" data-a="zip">Скачать папкой</button></div></div>',function(n){
    $$("button",n).forEach(function(x){ x.onclick=function(){ ({copy:copyCode,html:dlHtml,zip:dlZip})[x.getAttribute("data-a")](); }; }); }));
  var pre=document.createElement("pre"); pre.className="code"; box.appendChild(pre);
  var doc=buildPage(st,"code").replace(/url\(data:image[^)]{60,}\)/g,function(m){ return "url(data:image... фото "+Math.round(m.length*.75/1024)+" КБ)"; })
    .replace(/(src|href)="data:image[^"]{60,}"/g,function(m,a){ return a+'="data:image... фото"'; });
  var s=esc(doc).replace(/(\/\*[\s\S]*?\*\/|&lt;!--[\s\S]*?--&gt;)/g,'<span class="cm">$1</span>');
  s=s.replace(new RegExp(MB+"(.*?)"+MM,"g"),function(m,uid){ return '<span data-u="'+uid+'">'; }).replace(new RegExp(ME,"g"),"</span>");
  pre.innerHTML=s;
  if(ui.sel){ var hot=null; $$('[data-u="'+ui.sel.b+'"]',pre).forEach(function(x){ x.classList.add("hot"); if(!hot) hot=x; });
    var bt=blk(ui.sel.b); if(bt) $$('[data-u="t-'+bt.type+'"]',pre).forEach(function(x){ x.classList.add("hot"); });
    if(hot) setTimeout(function(){ box.scrollTop=hot.offsetTop-box.offsetTop-40; },30); }
}
function fileName(){ return (st.title||"page").trim().toLowerCase().replace(/[^\wа-яё]+/gi,"-").replace(/^-+|-+$/g,"").slice(0,40)||"page"; }
function dl(blob,name){ var a=document.createElement("a"); a.href=URL.createObjectURL(blob); a.download=name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(function(){ URL.revokeObjectURL(a.href); },2000); }
function dlHtml(){ dl(new Blob([buildPage(st,"file")],{type:"text/html"}), fileName()+".html"); toast("Файл скачан: всё в одном HTML"); }
function dlZip(){ dl(buildFolder(st), fileName()+".zip"); toast("Скачан архив: index.html, css, js и фото"); }
function copyCode(){ copyText(buildPage(st,"file"),"Код скопирован"); }
function copyText(t,msg){
  function fb(){ var x=document.createElement("textarea"); x.value=t; x.style.cssText="position:fixed;opacity:0"; document.body.appendChild(x); x.select(); try{ document.execCommand("copy"); toast(msg); }catch(e){ toast("Не получилось скопировать"); } x.remove(); }
  if(navigator.clipboard&&navigator.clipboard.writeText) navigator.clipboard.writeText(t).then(function(){ toast(msg); },fb); else fb();
}

/* ── ещё ── */
function paneMore(box){
  box.innerHTML='<div class="f"><label>Название страницы (видно на вкладке браузера)</label><input type="text" id="mT" maxlength="80"></div>'+
    '<div class="sh">Скачать</div>'+
    '<button class="btn w" data-a="html">Одним файлом <small>.html</small></button>'+
    '<button class="btn w" data-a="zip">Папкой: HTML, CSS, JS и фото <small>.zip</small></button>'+
    '<button class="btn w" data-a="host">Как выложить страницу в интернет</button>'+
    '<div class="note" id="hostT" hidden style="margin:2px 2px 14px">'+
      '<p style="margin-bottom:8px">Скачанный файл или папка работают сами по себе. Чтобы у страницы был свой адрес, подойдёт бесплатный хостинг:</p>'+
      '<p style="margin-bottom:8px"><b>Netlify Drop.</b> Распакуйте папку и перетащите её на app.netlify.com/drop.</p>'+
      '<p style="margin-bottom:8px"><b>GitHub Pages.</b> Создайте репозиторий, загрузите файлы и включите Pages в настройках.</p>'+
      '<p><b>Neocities.</b> Зарегистрируйтесь и загрузите файлы в менеджере файлов.</p></div>'+
    '<div class="sh">Проект</div>'+
    '<button class="btn w" data-a="save">Сохранить проект в файл <small>.json</small></button>'+
    '<button class="btn w" data-a="open">Открыть проект из файла</button>'+
    '<button class="btn w" data-a="copy">Сделать копию страницы</button>'+
    '<button class="btn w del" data-a="del">Удалить страницу</button>'+
    '<p class="note" style="margin-top:8px">Страница сохраняется в этом браузере сама после каждого изменения. Файл проекта нужен, чтобы перенести её на другое устройство.</p>';
  var t=$("#mT",box); t.value=st.title; t.oninput=function(){ remember("title"); st.title=t.value; $("#title").value=t.value; save(); };
  $$("[data-a]",box).forEach(function(x){ x.onclick=function(){ var a=x.getAttribute("data-a");
    if(a==="html") dlHtml(); else if(a==="zip") dlZip(); else if(a==="host") $("#hostT").hidden=!$("#hostT").hidden;
    else if(a==="save"){ dl(new Blob([JSON.stringify(st)],{type:"application/json"}), fileName()+".forge.json"); toast("Проект сохранён в файл"); }
    else if(a==="open") openJson();
    else if(a==="copy"){ var c=clone(st); c.id=newId(); c.title=st.title+" (копия)"; dbPut(c).then(function(){ openPage(c); toast("Открыта копия"); }); }
    else if(a==="del") ask("Удалить страницу «"+st.title+"»? Вернуть её не получится.","Удалить").then(function(y){ if(!y) return; dbDel(st.id).then(function(){ st=null; showHome(); }); });
  }; });
}
function openJson(){ var f=$("#fJson"); f.value=""; f.onchange=function(){ var file=f.files&&f.files[0]; if(!file) return; var r=new FileReader();
  r.onload=function(){ try{ var d=JSON.parse(r.result); if(!d||d.v!==2||!Array.isArray(d.blocks)) throw 0; d.id=newId(); fixPage(d); dbPut(d).then(function(){ openPage(d); toast("Проект открыт"); }); }
    catch(e){ toast("Это не файл проекта FORGE"); } }; r.readAsText(file); }; f.click(); }
$("#homeOpen").onclick=openJson;

/* ── поделиться ── */
$("#shareBtn").onclick=function(){
  var s=stripPhotos(st); delete s.st.id;
  encodeShare(s.st).then(function(code){
    var url=new URL("../p/",location.href).href+"#"+code, long=url.length>6000;
    modal('<h3>Ссылка на вашу страницу</h3><p class="note">Страница записана прямо в ссылке, на сервере ничего не хранится. У получателя будет кнопка «Сделать свою копию».</p>'+
      '<div class="link" id="lnk"></div>'+
      (s.cut?'<p class="warn">Фото с устройства ('+s.cut+' шт.) в ссылку не помещаются, в ней их не будет. Чтобы показать страницу с фото, скачайте её файлом или папкой.</p>':'')+
      (long?'<p class="warn">Ссылка длинная ('+url.length+' символов), некоторые мессенджеры такие обрезают.</p>':'')+
      '<div class="row"><button class="btn go" id="sC">Скопировать ссылку</button><a class="btn" id="sO" target="_blank" rel="noopener">Открыть</a></div>'+
      (navigator.share?'<div class="row"><button class="btn" id="sN">Отправить через...</button></div>':'')+
      '<div class="row"><button class="btn" id="sH">Скачать HTML</button><button class="btn" id="sZ">Скачать папкой</button></div><div class="row"><button class="btn" data-close>Закрыть</button></div>');
    $("#lnk").textContent=url; $("#sO").href=url; $("#sC").onclick=function(){ copyText(url,"Ссылка скопирована"); };
    $("#sH").onclick=dlHtml; $("#sZ").onclick=dlZip;
    if($("#sN")) $("#sN").onclick=function(){ navigator.share({title:st.title,url:url}).catch(function(){}); };
  }).catch(function(){ toast("Не получилось собрать ссылку"); });
};
$("#dlTop").onclick=function(){ modal('<h3>Скачать страницу</h3><button class="btn w" id="d1">Одним файлом <small>.html</small></button><button class="btn w" id="d2">Папкой: HTML, CSS, JS и фото <small>.zip</small></button><div class="row"><button class="btn" data-close>Закрыть</button></div>');
  $("#d1").onclick=function(){ closeModal(); dlHtml(); }; $("#d2").onclick=function(){ closeModal(); dlZip(); }; };

/* ═══════════ окна, подсказки, клавиши ═══════════ */
function modal(h){ $("#mbox").innerHTML=h; $("#modal").classList.add("on"); }
function closeModal(){ $("#modal").classList.remove("on"); }
$("#modal").addEventListener("click",function(e){ if(e.target.id==="modal"||e.target.hasAttribute("data-close")) closeModal(); });
function ask(text,ok){ return new Promise(function(res){ modal('<h3>'+esc(text)+'</h3><div class="row"><button class="btn" data-n>Отмена</button><button class="btn go" data-y>'+esc(ok)+'</button></div>');
  $("#mbox [data-n]").onclick=function(){ closeModal(); res(false); }; $("#mbox [data-y]").onclick=function(){ closeModal(); res(true); }; }); }
var tT=0; function toast(t){ var e=$("#toast"); e.textContent=t; e.classList.add("on"); clearTimeout(tT); tT=setTimeout(function(){ e.classList.remove("on"); },2600); }
var hintOff=false; function hideHint(){ if(hintOff) return; hintOff=true; $("#hint").classList.add("off"); }
addEventListener("keydown",function(e){
  if($("#ed").hidden) return; var typing=/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName);
  if(e.key==="Escape"&&$("#modal").classList.contains("on")){ closeModal(); return; }
  if(typing) return;
  if(onKey(e.key,e.shiftKey,e.ctrlKey||e.metaKey)) e.preventDefault();
});
function onKey(key,shift,ctrl){
  var k=key.toLowerCase(), e={shiftKey:shift,ctrlKey:ctrl,metaKey:false,preventDefault:function(){}};
  if(k==="escape"){ if(ui.sel){ ui.sel=null; send({t:"select",sel:null}); refreshInsp(); } return true; }
  if((e.ctrlKey||e.metaKey)&&k==="z"){ e.preventDefault(); $(e.shiftKey?"#redo":"#undo").click(); }
  if((e.ctrlKey||e.metaKey)&&k==="y"){ e.preventDefault(); $("#redo").click(); }
  if(ui.sel&&ui.sel.e&&/^arrow/.test(k)){ e.preventDefault(); var b=blk(ui.sel.b); if(!b) return; remember("nudge"); var o=b.e[ui.sel.e]||(b.e[ui.sel.e]={}), st1=e.shiftKey?2:.25, pc=ui.pos==="pc";
    var kx=pc?"dx":"x", ky=pc?"dy":"y"; if(pc){ if(o.dx==null) o.dx=o.x||0; if(o.dy==null) o.dy=o.y||0; }
    if(k==="arrowleft") o[kx]=Math.round(((o[kx]||0)-st1)*100)/100; if(k==="arrowright") o[kx]=Math.round(((o[kx]||0)+st1)*100)/100;
    if(k==="arrowup") o[ky]=Math.round(((o[ky]||0)-st1)*100)/100; if(k==="arrowdown") o[ky]=Math.round(((o[ky]||0)+st1)*100)/100; changed(false); refreshInsp(); }
  if(ui.sel&&(k==="delete"||k==="backspace")){ e.preventDefault(); tool("del",ui.sel); }
  return /^arrow|^delete$|^backspace$/.test(k)||(ctrl&&/^[zy]$/.test(k));
}
$("#title").addEventListener("input",function(){ remember("title"); st.title=this.value; save(); });

/* режим и устройство */
$$("#modeSeg button").forEach(function(b){ b.onclick=function(){ ui.mode=b.getAttribute("data-mode"); $$("#modeSeg button").forEach(function(x){ x.classList.toggle("on",x===b); });
  if(ui.mode==="view"){ ui.y=0; closeSheet(); } render(true); }; });
$$("#devSeg button").forEach(function(b){ b.onclick=function(){ ui.dev=b.getAttribute("data-dev"); $$("#devSeg button").forEach(function(x){ x.classList.toggle("on",x===b); }); $("#fw").className="fw "+ui.dev;
  $("#posSeg").style.visibility=ui.dev==="pc"?"visible":"hidden"; if(ui.dev!=="pc"&&ui.pos==="pc"){ ui.pos="all"; posBtns(); pushCss(); } }; });
function posBtns(){ $$("#posSeg button").forEach(function(x){ x.classList.toggle("on",x.getAttribute("data-pos")===ui.pos); }); }
$$("#posSeg button").forEach(function(b){ b.onclick=function(){ ui.pos=b.getAttribute("data-pos"); posBtns(); pushCss(); refreshInsp();
  if(ui.pos==="pc") toast("Сдвиги и ширина теперь только для компьютера. На телефоне останется как было"); }; });

/* ═══════════ мои страницы ═══════════ */
var tplCat="all";
function thumb(box, page, w){
  var f=document.createElement("iframe"); f.className="shot"; f.setAttribute("sandbox",""); f.setAttribute("aria-hidden","true"); f.tabIndex=-1;
  var W=400, sc=w/W; f.style.width=W+"px"; f.style.height=(box.clientHeight/sc||700)+"px"; f.style.transform="scale("+sc+")";
  f.srcdoc=buildPage(page,"file").replace(/<script>[\s\S]*?<\/script>/g,"");
  box.appendChild(f);
}
function showHome(){
  $("#ed").hidden=true; $("#home").hidden=false; document.title="FORGE · мои страницы";
  if(location.hash) try{ history.replaceState(null,"",location.pathname); }catch(e){}
  dbAll().then(function(list){
    list.sort(function(a,b){ return (b.updated||0)-(a.updated||0); });
    var my=$("#myPages"); my.innerHTML="";
    my.appendChild(el('<div class="pg"><button class="th new">'+sv("plus")+'</button><b>Новая</b><small>с чистого листа</small></div>',function(n){ $("button",n).onclick=function(){ createFrom("blank"); }; }));
    list.forEach(function(p){
      var d=new Date(p.updated||Date.now()), when=d.toLocaleDateString("ru-RU",{day:"numeric",month:"short"});
      var n=el('<div class="pg"><button class="th"></button><b>'+esc(p.title)+'</b><small>'+when+'</small><div class="acts"><button data-a="copy">копия</button><button data-a="del">удалить</button></div></div>');
      $(".th",n).onclick=function(){ openPage(fixPage(p)); };
      $$(".acts button",n).forEach(function(x){ x.onclick=function(){ if(x.getAttribute("data-a")==="copy"){ var c=clone(p); c.id=newId(); c.title=p.title+" (копия)"; c.updated=Date.now(); dbPut(c).then(showHome); }
        else ask("Удалить страницу «"+p.title+"»?","Удалить").then(function(y){ if(y) dbDel(p.id).then(showHome); }); }; });
      my.appendChild(n); requestAnimationFrame(function(){ try{ thumb($(".th",n), fixPage(clone(p)), 138); }catch(e){} });
    });
  });
  var cats=$("#tplCats"); cats.innerHTML="";
  [["all","Все"]].concat(TPL_GROUPS).forEach(function(g){ var b=document.createElement("button"); b.textContent=g[1]; if(g[0]===tplCat) b.className="on"; b.onclick=function(){ tplCat=g[0]; showTpls(); $$("#tplCats button").forEach(function(x){ x.classList.toggle("on",x===b); }); }; cats.appendChild(b); });
  showTpls();
}
var tplShots={};
function showTpls(){
  var box=$("#tpls"); box.innerHTML="";
  TEMPLATES.forEach(function(t){ if(tplCat!=="all" && t.group!==tplCat && t.id!=="blank") return;
    var n=el('<button class="tpl"><div class="th'+(t.blocks.length?"":" blank")+'">'+(t.blocks.length?"":sv("plus"))+'</div><div class="tx"><b>'+esc(t.name)+'</b><span>'+esc(t.desc)+'</span></div></button>');
    n.onclick=function(){ createFrom(t.id); }; box.appendChild(n);
    if(t.blocks.length) requestAnimationFrame(function(){ var th=$(".th",n); thumb(th, fromTemplate(t.id), th.clientWidth||170); });
  });
}
function createFrom(tid){ var p=fromTemplate(tid); p.id=newId(); p.updated=Date.now(); dbPut(p).then(function(){ openPage(p); }); }
function openPage(p){
  st=p; U=[]; Rd=[]; undoBtns(); ui.sel=null; ui.y=0; ui.mode="edit";
  $$("#modeSeg button").forEach(function(x){ x.classList.toggle("on",x.getAttribute("data-mode")==="edit"); });
  $("#home").hidden=true; $("#ed").hidden=false; document.title="FORGE · "+st.title;
  try{ history.replaceState(null,"",location.pathname+"#"+st.id); }catch(e){}
  $("#title").value=st.title; render(true);
  if(wide.matches) openTab(st.blocks.length?"blocks":"add"); else { closeSheet(); if(!st.blocks.length) openTab("add"); }
  refreshInsp(); hintOff=false; $("#hint").classList.remove("off"); setTimeout(hideHint,8000);
}
$("#toHome").onclick=showHome;

/* запуск: ссылка «сделать копию», открытая страница или список страниц */
(function boot(){
  var h=location.hash.slice(1);
  if(/^p=/.test(h)){
    decodeShare(h.slice(2)).then(function(p){ p.id=newId(); p.updated=Date.now(); p.title=p.title||"Страница по ссылке"; return dbPut(p).then(function(){ openPage(p); toast("Это ваша копия страницы, меняйте как хотите"); }); })
      .catch(function(e){ showHome(); toast(e&&e.message==="old"?"Ссылка от старой версии конструктора, открыть её здесь не получится":"Ссылка повреждена"); });
    return;
  }
  if(h){ dbAll().then(function(list){ var p=list.filter(function(x){ return x.id===h; })[0]; if(p) openPage(fixPage(p)); else showHome(); }); return; }
  showHome();
})();
})();
