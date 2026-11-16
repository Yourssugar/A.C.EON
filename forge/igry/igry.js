/* FORGE игры по шаблонам: редактор.
   Четыре вида: викторина, мемо (найди пары), квест (сцены с выбором и предметами), пазл.
   Играет play.js (GAMEVIEW): в превью, по ссылке и в скачанном .html. Хранение: IndexedDB «forge-igry» (games, blobs). */
(function(){
"use strict";
var $=function(s,r){ return (r||document).querySelector(s); };
var $$=function(s,r){ return [].slice.call((r||document).querySelectorAll(s)); };
var wide=matchMedia("(min-width:960px)");
function el(html, fn){ var d=document.createElement("div"); d.innerHTML=html.trim(); var n=d.firstElementChild; if(fn) fn(n); return n; }
function sh(t){ return el('<div class="sh">'+esc(t)+'</div>'); }
function choice(label, opts, cur, fn){ return el('<div class="f">'+(label?'<label>'+esc(label)+'</label>':'')+'<div class="chips">'+opts.map(function(o){ return '<button data-v="'+o[0]+'" class="'+(String(o[0])===String(cur)?"on":"")+'">'+esc(o[1])+'</button>'; }).join("")+'</div></div>',function(n){
  $$("button",n).forEach(function(x){ x.onclick=function(){ $$("button",n).forEach(function(y){ y.classList.toggle("on",y===x); }); fn(x.getAttribute("data-v")); }; }); }); }
function toggle(label,v,fn){ return el('<label class="tg"><span>'+esc(label)+'</span><input type="checkbox"'+(v?" checked":"")+'></label>',function(n){ $("input",n).onchange=function(){ fn(this.checked); }; }); }
/* поле ввода, которое пишет прямо в объект; запоминание для отмены один раз на каждое редактирование */
function bindText(i,obj,key,after){ var first=true; i.value=obj[key]==null?"":obj[key]; i.oninput=function(){ if(first){ first=false; remember(); } obj[key]=i.value; save(); preview(); if(after) after(i.value); }; i.addEventListener("blur",function(){ first=true; }); return i; }
var SV={ play:"M7 4l13 8-13 8z", x:"M6 6l12 12M18 6L6 18", up:"M12 19V5M6 11l6-6 6 6", dn:"M12 5v14M6 13l6 6 6-6", dup:"M8 8h12v12H8zM4 16V4h12", img:"M4 5h16v14H4zM4 15l4-4 5 5 3-3 4 4",
  dl:"M12 4v11M7 10l5 5 5-5M5 20h14", link:"M10 14a4 4 0 005.7 0l3-3a4 4 0 00-5.7-5.7l-1 1M14 10a4 4 0 00-5.7 0l-3 3a4 4 0 005.7 5.7l1-1", eye:"M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM12 15a3 3 0 100-6 3 3 0 000 6z",
  shuf:"M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5", share:"M12 3v12M7 8l5-5 5 5M5 14v6h14v-6", file:"M14 3H6v18h12V7zM14 3v4h4", re:"M4 12a8 8 0 0114-5.3M20 4v5h-5M20 12a8 8 0 01-14 5.3M4 20v-5h5" };
function sv(n){ return '<svg viewBox="0 0 24 24"><path d="'+SV[n]+'"/></svg>'; }
var GV=window.GAMEVIEW, F=window.FONY;

/* ═══════════ хранение ═══════════ */
var dbp=null;
function db(){ if(dbp) return dbp; dbp=new Promise(function(res,rej){ try{ var r=indexedDB.open("forge-igry",1);
  r.onupgradeneeded=function(){ r.result.createObjectStore("games",{keyPath:"id"}); r.result.createObjectStore("blobs"); };
  r.onsuccess=function(){ res(r.result); }; r.onerror=function(){ rej(r.error); }; }catch(e){ rej(e); } }).catch(function(){ return null; }); return dbp; }
function tx(store,mode,fn){ return db().then(function(d){ if(!d) throw new Error("nodb"); return new Promise(function(res,rej){ var t=d.transaction(store,mode), s=t.objectStore(store), out=fn(s);
  t.oncomplete=function(){ res(out&&out.result!==undefined?out.result:undefined); }; t.onerror=function(){ rej(t.error); }; t.onabort=function(){ rej(t.error); }; }); }); }
function gAll(){ return tx("games","readonly",function(s){ return s.getAll(); }).catch(function(){ return []; }); }
function gGet(id){ return tx("games","readonly",function(s){ return s.get(id); }).catch(function(){ return null; }); }
function gPut(g){ return tx("games","readwrite",function(s){ s.put(g); }); }
function aids(g){ var a=[]; JSON.stringify(g,function(k,v){ if((k==="img"||k==="aid")&&v) a.push(v); return v; }); return a; }
function gDel(g){ return tx("games","readwrite",function(s){ s.delete(g.id); }).then(gAll).then(function(all){ var u={}; all.forEach(function(q){ aids(q).forEach(function(a){ u[a]=1; }); });
  return tx("blobs","readwrite",function(s){ aids(g).forEach(function(a){ if(!u[a]) s.delete(a); }); }); }); }
function bPut(aid,b){ return tx("blobs","readwrite",function(s){ s.put(b,aid); }); }
function bGet(aid){ return tx("blobs","readonly",function(s){ return s.get(aid); }).catch(function(){ return null; }); }
function newId(p){ return (p||"g")+Date.now().toString(36)+Math.random().toString(36).slice(2,6); }
var URLS={}; function blobUrl(aid){ if(!aid) return Promise.resolve(""); if(URLS[aid]) return Promise.resolve(URLS[aid]); return bGet(aid).then(function(b){ if(!b) return ""; URLS[aid]=URL.createObjectURL(b); return URLS[aid]; }); }
var BGU={}; function bgUrl(bg){ if(!bg||!F) return ""; var k=JSON.stringify(bg); if(BGU[k]) return BGU[k]; BGU[k]=URL.createObjectURL(new Blob([F.svg(JSON.parse(k),900,1600)],{type:"image/svg+xml"})); return BGU[k]; }
function bgSq(bg){ if(!bg||!F) return ""; var k="sq"+JSON.stringify(bg); if(BGU[k]) return BGU[k]; var b=JSON.parse(JSON.stringify(bg)); BGU[k]=URL.createObjectURL(new Blob([F.svg(b,1000,1000)],{type:"image/svg+xml"})); return BGU[k]; }
function slim(b){ return { kind:b.kind, pal:b.pal.slice(), seed:b.seed, p:JSON.parse(JSON.stringify(b.p)), pts:b.pts.map(function(x){ return [Math.round(x[0]*1000)/1000,Math.round(x[1]*1000)/1000]; }), grain:b.grain }; }
function fb(id){ return F?slim(F.fromTpl(id)):null; }

/* ═══════════ шаблоны ═══════════ */
function lang(){ return window.FLANG||"ru"; }
function base(kind,title){ return { v:1, id:newId(), kind:kind, title:TR(title), intro:"", theme:"violet", bg:null, sound:true, music:null, win:"", lang:lang(), updated:Date.now() }; }
function q4(q,a,ok){ return { id:newId("q"), type:"4", q:TR(q), a:a.map(function(x){ return TR(x); }), ok:ok, img:null }; }
var KINDS=[["quiz","Викторина","вопросы с ответами, таймер и счёт"],["memo","Мемо","найди пары: картинки или слово и перевод"],["quest","Квест","история с выбором, предметы и концовки"],["puzzle","Пазл","собери картинку из кусочков"]];
var TPL=[
 { id:"quiz", kind:"quiz", n:"Обо всём понемногу", make:function(){ var g=base("quiz","Обо всём понемногу"); g.theme="violet"; g.intro=TR("Пять вопросов на разминку. На каждый 15 секунд."); g.win=TR("Отлично! Вы много знаете.");
   g.quiz={ timer:15, shuffle:false, show:true, qs:[ q4("Какая планета ближе всех к Солнцу?",["Меркурий","Венера","Марс","Земля"],0), q4("Сколько ног у паука?",["6","8","10","12"],1),
     { id:newId("q"), type:"tf", q:TR("Правда или нет: у осьминога три сердца"), a:[], ok:0, img:null }, { id:newId("q"), type:"input", q:TR("Столица Японии?"), a:[TR("Токио"),"Tokyo"], ok:0, img:null },
     q4("Какой океан самый большой?",["Атлантический","Индийский","Тихий","Северный Ледовитый"],2) ] }; return g; } },
 { id:"memo_ic", kind:"memo", n:"Найди одинаковые", make:function(){ var g=base("memo","Найди одинаковые"); g.theme="sea"; g.intro=TR("Переворачивайте по две карточки и ищите одинаковые.");
   g.memo={ kind:"same", mode:"moves", items:["heart","star","sun","moon","tree","fish","house","note"].map(function(ic){ return { a:{ t:"", ic:ic, img:null }, b:{ t:"", ic:"", img:null } }; }) }; return g; } },
 { id:"memo_cap", kind:"memo", n:"Страны и столицы", make:function(){ var g=base("memo","Страны и столицы"); g.theme="sky"; g.intro=TR("Найдите страну и её столицу: это одна пара.");
   g.memo={ kind:"pair", mode:"moves", items:[["Франция","Париж"],["Италия","Рим"],["Япония","Токио"],["Египет","Каир"],["Канада","Оттава"],["Испания","Мадрид"]].map(function(p){ return { a:{ t:TR(p[0]), ic:"", img:null }, b:{ t:TR(p[1]), ic:"", img:null } }; }) }; return g; } },
 { id:"quest", kind:"quest", n:"Тайна старой кузни", make:function(){ var g=base("quest","Тайна старой кузни"); g.theme="night"; g.intro=TR("Короткая история с выбором. Найдите то, что спрятано в кузне.");
   function sc(id,t,x,bg,ch,end){ return { id:id, title:TR(t), text:TR(x), img:null, bg:bg, end:end||"", choices:(ch||[]).map(function(c){ return { t:TR(c[0]), to:c[1], give:c[2]?TR(c[2]):"", need:c[3]?TR(c[3]):"" }; }) }; }
   g.quest={ scenes:[ sc(1,"Старая кузня","Дверь кузни приоткрыта, внутри горит огонь. Сзади слышен стук.","fire",[["Войти внутрь",2],["Обойти кругом",3]]),
     sc(2,"У наковальни","На наковальне лежит старый ключ, рядом молот, ещё тёплый.","fire",[["Взять ключ",4,"ключ"],["Выйти на задний двор",3]]),
     sc(3,"Задний двор","Тяжёлая дверь в подвал, на ней висит замок. Из-за угла рычит пёс.","night",[["Открыть дверь",5,"","ключ"],["Подойти к псу",6],["Вернуться в кузню",2]]),
     sc(4,"Ключ у тебя","Ключ холодный и тяжёлый. Где-то должна быть дверь.","gold",[["На задний двор",3]]),
     sc(5,"Подвал","Внизу сундук, а в нём слиток, который светится сам.","gold",[],"win"),
     sc(6,"Пёс","Пёс оказался не таким добрым. Придётся бежать домой.","red",[],"lose") ] }; return g; } },
 { id:"puzzle", kind:"puzzle", n:"Пазл", make:function(){ var g=base("puzzle","Пазл"); g.theme="sunset"; g.intro=TR("Соберите картинку: нажимайте два кусочка, чтобы поменять их местами.");
   g.puzzle={ src:"bg", img:null, bg:fb("retro"), n:3, mode:"swap", hint:false }; return g; } }
];
function blankOf(kind){ var t=TPL.filter(function(x){ return x.kind===kind; })[0]; return t.make(); }

/* ═══════════ превью ═══════════ */
var G=null, ctl=null, jump=null;
function data(g,opts){ opts=opts||{}; var ids=aids(g); if(g.music&&g.music.aid) ids.push(g.music.aid);
  return Promise.all(ids.map(function(a){ return blobUrl(a); })).then(function(us){ var imgs={}; ids.forEach(function(a,i){ imgs[a]=us[i]; });
    var d=JSON.parse(JSON.stringify(g)); d.imgs=imgs; d.bgUrl=bgUrl(g.bg); d.puzzleUrl=g.puzzle&&g.puzzle.bg?bgSq(g.puzzle.bg):""; d.musicUrl=opts.nomus||!g.music?"":imgs[g.music.aid]; d.sound=opts.mute?false:g.sound; d.lang=g.lang||lang(); return d; }); }
var pvT=0, pvN=0;
function preview(){ clearTimeout(pvT); pvT=setTimeout(doPreview,200); }
function doPreview(){ if(!G) return; var my=++pvN; data(G).then(function(D){ if(my!==pvN) return; if(ctl) ctl.destroy(); ctl=GV.mount($("#gpv"),D,{ preview:true, jump:jump }); }); }
$("#restartBtn").onclick=function(){ jump=null; doPreview(); };

/* ═══════════ отмена и сохранение ═══════════ */
var U=[], Rd=[];
function snap(){ var o=JSON.parse(JSON.stringify(G)); delete o.updated; return JSON.stringify(o); }
function remember(){ if(!G) return; U.push(snap()); if(U.length>80) U.shift(); Rd=[]; undoBtns(); }
function undoBtns(){ $("#undo").disabled=!U.length; $("#redo").disabled=!Rd.length; }
function restoreS(s){ var o=JSON.parse(s); for(var k in o) G[k]=o[k]; $("#title").value=G.title||""; undoBtns(); changed(true); }
$("#undo").onclick=function(){ if(!U.length) return; Rd.push(snap()); restoreS(U.pop()); };
$("#redo").onclick=function(){ if(!Rd.length) return; U.push(snap()); restoreS(Rd.pop()); };
var saveT=0; function save(){ clearTimeout(saveT); saveT=setTimeout(function(){ if(!G) return; G.updated=Date.now(); gPut(JSON.parse(JSON.stringify(G))).catch(function(){ toast(TR("Не получилось сохранить: память браузера заполнена")); }); },350); }
function changed(all){ save(); preview(); if(all) refresh(); else refreshInsp(); }

/* ═══════════ панели ═══════════ */
var pane=$("#pane"), insp=$("#insp"), right=$("#right"), ui={ tab:null, sheet:false };
var TTL={ game:"Игра", look:"Вид", more:"Ещё" };
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
wide.addEventListener("change",function(){ right.classList.remove("open"); ui.sheet=false; if(wide.matches) openTab(ui.tab||"game"); refreshInsp(); });
function refresh(){ refreshPane(); refreshInsp(); }
function refreshPane(){ if(!ui.tab||!G) return; if(!wide.matches&&ui.sheet!=="tab") return; var box=tabBox(), sc=box.scrollTop; box.innerHTML="";
  ({ game:paneGame, look:paneLook, more:paneMore })[ui.tab](box); box.scrollTop=sc; }
function rebuild(){ var box=tabBox(), sc=box.scrollTop; refreshPane(); box.scrollTop=sc; }
function iconBtn(n,title,fn,cls){ return el('<button class="ib2'+(cls?" "+cls:"")+'" title="'+esc(TR(title))+'">'+sv(n)+'</button>',function(b){ b.onclick=function(e){ e.stopPropagation(); fn(); }; }); }
function moveIn(arr,i,d){ var j=i+d; if(j<0||j>=arr.length) return false; remember(); var t=arr[i]; arr[i]=arr[j]; arr[j]=t; return true; }
function paneGame(box){ ({ quiz:edQuiz, memo:edMemo, quest:edQuest, puzzle:edPuzzle })[G.kind](box); }

/* ── редактор викторины ── */
var openQ=0;
function edQuiz(box){ var Q=G.quiz;
  box.appendChild(sh("Правила"));
  box.appendChild(choice(TR("Время на вопрос"),[[0,TR("без таймера")],[10,"10 "+TR("с")],[15,"15 "+TR("с")],[30,"30 "+TR("с")]],Q.timer||0,function(v){ remember(); Q.timer=+v; changed(); }));
  box.appendChild(toggle(TR("Перемешивать вопросы и ответы"),!!Q.shuffle,function(v){ remember(); Q.shuffle=v; changed(); }));
  box.appendChild(toggle(TR("Показывать правильный ответ"),Q.show!==false,function(v){ remember(); Q.show=v; changed(); }));
  box.appendChild(sh(TR("Вопросы · {0}",Q.qs.length)));
  Q.qs.forEach(function(q,i){ var on=i===openQ, n=el('<div class="li gq'+(on?" sel":"")+'"><div class="lh"><b data-nt></b></div></div>'), lh=$(".lh",n);
    $("b",n).textContent=(i+1)+". "+(q.q||TR("Новый вопрос"));
    lh.appendChild(iconBtn("up","Выше",function(){ if(moveIn(Q.qs,i,-1)){ openQ=i-1; jump=openQ; changed(); rebuild(); } }));
    lh.appendChild(iconBtn("dn","Ниже",function(){ if(moveIn(Q.qs,i,1)){ openQ=i+1; jump=openQ; changed(); rebuild(); } }));
    lh.appendChild(iconBtn("dup","Копия",function(){ remember(); var c=JSON.parse(JSON.stringify(q)); c.id=newId("q"); Q.qs.splice(i+1,0,c); openQ=i+1; jump=openQ; changed(); rebuild(); }));
    lh.appendChild(iconBtn("x","Удалить",function(){ if(Q.qs.length<2) return; remember(); Q.qs.splice(i,1); openQ=Math.min(openQ,Q.qs.length-1); jump=openQ; changed(); rebuild(); }));
    n.onclick=function(e){ if(openQ!==i){ openQ=i; jump=i; doPreview(); rebuild(); } };
    if(on){ var w=el('<div></div>'); n.appendChild(w);
      w.appendChild(choice("",[["4",TR("4 ответа")],["tf",TR("правда или нет")],["input",TR("ввести ответ")]],q.type||"4",function(v){ remember(); q.type=v; if(v==="4"){ while(q.a.length<4) q.a.push(""); } if(v==="tf") q.ok=Math.min(q.ok||0,1); changed(); rebuild(); }));
      w.appendChild(el('<div class="f"><textarea rows="2" maxlength="300" placeholder="'+esc(TR("Текст вопроса"))+'"></textarea></div>',function(f){ bindText($("textarea",f),q,"q",function(v){ $("b",n).textContent=(i+1)+". "+(v||TR("Новый вопрос")); }); }));
      if((q.type||"4")==="4"){ for(var k=0;k<4;k++) (function(k){ w.appendChild(el('<div class="ans"><button class="rad'+(q.ok===k?" on":"")+'" title="'+esc(TR("Правильный"))+'"></button><input type="text" maxlength="120" placeholder="'+esc(TR("Ответ {0}",k+1))+'"></div>',function(r){
          var inp=$("input",r); q.a[k]=q.a[k]||""; bindText(inp,q.a,k); $(".rad",r).onclick=function(){ remember(); q.ok=k; changed(); rebuild(); }; })); })(k);
        w.appendChild(el('<p class="note">'+esc(TR("Кружок отмечает правильный ответ. Пустые ответы не показываются."))+'</p>')); }
      else if(q.type==="tf"){ [TR("Правда"),TR("Неправда")].forEach(function(t,k){ w.appendChild(el('<div class="ans"><button class="rad'+(q.ok===k?" on":"")+'"></button><span>'+esc(t)+'</span></div>',function(r){ r.onclick=function(){ remember(); q.ok=k; changed(); rebuild(); }; })); }); }
      else { w.appendChild(el('<div class="f"><label>'+esc(TR("Правильный ответ"))+'</label><input type="text" maxlength="80"></div>',function(f){ q.a[0]=q.a[0]||""; bindText($("input",f),q.a,0); }));
        w.appendChild(el('<div class="f"><label>'+esc(TR("Тоже засчитать (через запятую)"))+'</label><input type="text" maxlength="200"></div>',function(f){ var i2=$("input",f), first=true; i2.value=q.a.slice(1).join(", ");
          i2.oninput=function(){ if(first){ first=false; remember(); } q.a=[q.a[0]].concat(i2.value.split(",").map(function(s){ return s.trim(); }).filter(Boolean)); save(); preview(); }; }));
        w.appendChild(el('<p class="note">'+esc(TR("Регистр, буква ё и знаки препинания не важны."))+'</p>')); }
      w.appendChild(imgRow(q,"img")); }
    box.appendChild(n); });
  if(Q.qs.length<60) box.appendChild(el('<button class="add">+ '+esc(TR("Вопрос"))+'</button>',function(b){ b.onclick=function(){ remember(); Q.qs.push({ id:newId("q"), type:"4", q:"", a:["","","",""], ok:0, img:null }); openQ=Q.qs.length-1; jump=openQ; changed(); rebuild(); }; }));
}
function imgRow(obj,key,label){ return el('<div class="imgrow"></div>',function(w){
  if(obj[key]){ w.appendChild(el('<img alt="">',function(im){ blobUrl(obj[key]).then(function(u){ im.src=u; }); })); w.appendChild(el('<button class="btn">'+sv("x")+'<span>'+esc(TR("Убрать картинку"))+'</span></button>',function(b){ b.onclick=function(){ remember(); obj[key]=null; changed(); rebuild(); }; })); }
  else w.appendChild(el('<button class="btn">'+sv("img")+'<span>'+esc(TR(label||"Картинка"))+'</span></button>',function(b){ b.onclick=function(){ pickImage(function(aid){ remember(); obj[key]=aid; changed(); rebuild(); }); }; })); }); }

/* ── редактор мемо ── */
function edMemo(box){ var M=G.memo;
  box.appendChild(choice(TR("Что ищем"),[["same",TR("одинаковые картинки")],["pair",TR("пары: слово и ответ")]],M.kind,function(v){ remember(); M.kind=v; changed(); rebuild(); }));
  box.appendChild(choice(TR("Режим"),[["moves",TR("на ходы")],["time",TR("на время")],["two",TR("вдвоём по очереди")]],M.mode,function(v){ remember(); M.mode=v; changed(); }));
  box.appendChild(sh(TR("Пары · {0}",M.items.length)));
  box.appendChild(el('<p class="note" style="margin:-2px 0 10px">'+esc(M.kind==="pair"?TR("Пара: слово и перевод, страна и столица, вопрос и ответ. На карточке может быть текст, значок или своя картинка."):TR("Каждая картинка будет на двух карточках. Нажмите на квадрат, чтобы выбрать значок или свою картинку."))+'</p>'));
  M.items.forEach(function(p,i){ var row=el('<div class="mrow"></div>'); row.appendChild(cell(p.a)); if(M.kind==="pair"){ row.appendChild(el('<em>=</em>')); row.appendChild(cell(p.b)); }
    row.appendChild(iconBtn("x","Удалить",function(){ if(M.items.length<3) return; remember(); M.items.splice(i,1); changed(); rebuild(); })); box.appendChild(row); });
  if(M.items.length<18) box.appendChild(el('<button class="add">+ '+esc(TR("Пара"))+'</button>',function(b){ b.onclick=function(){ remember(); M.items.push({ a:{t:"",ic:"",img:null}, b:{t:"",ic:"",img:null} }); changed(); rebuild(); }; }));
  box.appendChild(el('<p class="note" style="margin-top:8px">'+esc(TR("Карточек будет {0}. Удобно от 6 до 10 пар.",M.items.length*2))+'</p>'));
}
function cell(x){ return el('<div class="mcell"><button class="mface"></button><input type="text" maxlength="40"></div>',function(c){ var f=$(".mface",c);
  function face(){ f.innerHTML=""; f.style.backgroundImage=""; if(x.img) blobUrl(x.img).then(function(u){ f.style.backgroundImage="url('"+u+"')"; }); else if(x.ic) f.innerHTML=GV.icon(x.ic); else f.textContent="Aa"; }
  face(); bindText($("input",c),x,"t"); $("input",c).placeholder=TR("текст");
  f.onclick=function(){ var h='<h3>'+esc(TR("Что на карточке"))+'</h3><div class="icg2">'+Object.keys(GV.IC).map(function(k){ return '<button data-k="'+k+'">'+GV.icon(k)+'</button>'; }).join("")+'</div><div class="row"><button class="btn" data-a="img">'+sv("img")+'<span>'+esc(TR("Своя картинка"))+'</span></button><button class="btn" data-a="txt">'+esc(TR("Только текст"))+'</button></div>';
    modal(h); $$("#mbox .icg2 button").forEach(function(b){ b.onclick=function(){ remember(); x.ic=b.dataset.k; x.img=null; closeModal(); face(); changed(); }; });
    $('#mbox [data-a=img]').onclick=function(){ closeModal(); pickImage(function(aid){ remember(); x.img=aid; x.ic=""; face(); changed(); }); };
    $('#mbox [data-a=txt]').onclick=function(){ remember(); x.ic=""; x.img=null; closeModal(); face(); changed(); }; }; }); }

/* ── редактор квеста ── */
var openS=null;
function edQuest(box){ var Qs=G.quest, sc=Qs.scenes; if(openS==null&&sc[0]) openS=sc[0].id;
  box.appendChild(el('<p class="note" style="margin-bottom:10px">'+esc(TR("Игра начинается с первой сцены. Выбор ведёт в другую сцену, может дать предмет или требовать его."))+'</p>'));
  box.appendChild(sh(TR("Сцены · {0}",sc.length)));
  sc.forEach(function(s,i){ var on=s.id===openS, n=el('<div class="li gq'+(on?" sel":"")+(s.end?" end":"")+'"><div class="lh"><b data-nt></b></div></div>'), lh=$(".lh",n);
    $("b",n).textContent=(i+1)+". "+(s.title||TR("Сцена"))+(s.end==="win"?" · "+TR("победа"):s.end==="lose"?" · "+TR("поражение"):"");
    lh.appendChild(iconBtn("up","Выше",function(){ if(moveIn(sc,i,-1)){ changed(); rebuild(); } }));
    lh.appendChild(iconBtn("x","Удалить",function(){ if(sc.length<2) return; remember(); sc.splice(i,1); sc.forEach(function(o){ (o.choices||[]).forEach(function(c){ if(c.to===s.id) c.to=sc[0].id; }); }); openS=sc[0].id; jump=openS; changed(); rebuild(); }));
    n.onclick=function(){ if(openS!==s.id){ openS=s.id; jump=s.id; doPreview(); rebuild(); } };
    if(!on){ var ch=(s.choices||[]).filter(function(c){ return c.t; }).map(function(c){ var t=sc.filter(function(o){ return o.id===c.to; })[0]; return "→ "+(t?sc.indexOf(t)+1:"?")+" «"+c.t+"»"; }).join("  ");
      if(ch) n.appendChild(el('<small class="qch" data-nt></small>',function(e){ e.textContent=ch; })); }
    else { var w=el('<div></div>'); n.appendChild(w);
      w.appendChild(el('<div class="f"><input type="text" maxlength="60" placeholder="'+esc(TR("Название сцены"))+'"></div>',function(f){ bindText($("input",f),s,"title",function(v){ $("b",n).textContent=(i+1)+". "+(v||TR("Сцена")); }); }));
      w.appendChild(el('<div class="f"><textarea rows="3" maxlength="600" placeholder="'+esc(TR("Что происходит"))+'"></textarea></div>',function(f){ bindText($("textarea",f),s,"text"); }));
      w.appendChild(el('<div class="scn"></div>',function(g){ Object.keys(GV.SCN).forEach(function(k){ g.appendChild(el('<button class="'+(!s.img&&s.bg===k?"on":"")+'" style="background:'+GV.SCN[k]+'"></button>',function(b){ b.onclick=function(){ remember(); s.bg=k; s.img=null; changed(); rebuild(); }; })); }); }));
      w.appendChild(imgRow(s,"img","Своя картинка"));
      w.appendChild(choice(TR("Конец игры"),[["",TR("нет")],["win",TR("победа")],["lose",TR("поражение")]],s.end||"",function(v){ remember(); s.end=v; changed(); rebuild(); }));
      if(!s.end){ w.appendChild(el('<label class="olab">'+esc(TR("Выборы"))+'</label>'));
        s.choices=s.choices||[]; s.choices.forEach(function(c,k){ w.appendChild(el('<div class="qc"><div class="r1"><input type="text" maxlength="60" placeholder="'+esc(TR("Текст кнопки"))+'"></div><select></select><div class="r2"><input type="text" maxlength="24" placeholder="'+esc(TR("даёт предмет"))+'"><input type="text" maxlength="24" placeholder="'+esc(TR("нужен предмет"))+'"></div></div>',function(r){
          var ins=$$("input",r); bindText(ins[0],c,"t"); bindText(ins[1],c,"give"); bindText(ins[2],c,"need");
          var sel=$("select",r); sc.forEach(function(o,j){ sel.appendChild(el('<option value="'+o.id+'"'+(o.id===c.to?" selected":"")+'>→ '+(j+1)+". "+esc(o.title||TR("Сцена"))+'</option>')); });
          sel.onchange=function(){ remember(); c.to=+sel.value; changed(); };
          $(".r1",r).appendChild(iconBtn("x","Удалить",function(){ remember(); s.choices.splice(k,1); changed(); rebuild(); })); })); });
        if(s.choices.length<4) w.appendChild(el('<button class="add sm">+ '+esc(TR("Выбор"))+'</button>',function(b){ b.onclick=function(e){ e.stopPropagation(); remember(); s.choices.push({ t:"", to:s.id, give:"", need:"" }); changed(); rebuild(); }; })); } }
    box.appendChild(n); });
  if(sc.length<40) box.appendChild(el('<button class="add">+ '+esc(TR("Сцена"))+'</button>',function(b){ b.onclick=function(){ remember(); var id=sc.reduce(function(m,o){ return Math.max(m,o.id); },0)+1; sc.push({ id:id, title:"", text:"", img:null, bg:"night", end:"", choices:[] }); openS=id; jump=id; changed(); rebuild(); }; }));
}

/* ── редактор пазла ── */
function edPuzzle(box){ var P=G.puzzle;
  box.appendChild(choice(TR("Картинка"),[["bg",TR("из фона")],["photo",TR("своё фото")]],P.src,function(v){ remember(); P.src=v; changed(); rebuild(); }));
  if(P.src==="photo"){ box.appendChild(imgRow(P,"img","Выбрать фото")); box.appendChild(el('<p class="note" style="margin-bottom:10px">'+esc(TR("Фото обрежется до квадрата по центру. В ссылку оно не попадёт, только в файл."))+'</p>')); }
  else if(F){ var g=el('<div class="obg sq"></div>'); F.TPLS.forEach(function(tp){ var b=fb(tp.id); g.appendChild(el('<button title="'+esc(TR(tp.name))+'" style="background-image:url(\''+bgSq(b)+'\')"></button>',function(n){ n.onclick=function(){ remember(); P.bg=b; changed(); }; })); }); box.appendChild(g);
    box.appendChild(el('<div class="row" style="margin:8px 0 12px"><button class="btn">'+sv("shuf")+'<span>'+esc(TR("Перемешать"))+'</span></button></div>',function(n){ $("button",n).onclick=function(){ remember(); P.bg=P.bg||fb("retro"); P.bg.seed=Math.floor(Math.random()*1e6); changed(); }; })); }
  box.appendChild(choice(TR("Сложность"),[[3,"3×3"],[4,"4×4"],[5,"5×5"],[6,"6×6"]],P.n,function(v){ remember(); P.n=+v; changed(); }));
  box.appendChild(choice(TR("Как собирать"),[["swap",TR("менять местами")],["slide",TR("пятнашки")],["rotate",TR("повёрнутые кусочки")]],P.mode,function(v){ remember(); P.mode=v; changed(); }));
  box.appendChild(toggle(TR("Показывать картинку-подсказку"),!!P.hint,function(v){ remember(); P.hint=v; changed(); }));
}

/* ── вид, звук, финал ── */
function paneLook(box){
  box.appendChild(sh("Название и вступление"));
  box.appendChild(el('<div class="f"><input type="text" maxlength="60"></div>',function(f){ bindText($("input",f),G,"title",function(v){ $("#title").value=v; }); }));
  box.appendChild(el('<div class="f"><textarea rows="2" maxlength="300" placeholder="'+esc(TR("Пара слов на стартовом экране"))+'"></textarea></div>',function(f){ bindText($("textarea",f),G,"intro"); }));
  box.appendChild(sh("Фон игры"));
  box.appendChild(el('<div class="sws2"></div>',function(w){ Object.keys(GV.THEMES).forEach(function(k){ w.appendChild(el('<button class="'+(!G.bg&&G.theme===k?"on":"")+'" style="background:'+GV.THEMES[k]+'"></button>',function(b){ b.onclick=function(){ remember(); G.theme=k; G.bg=null; changed(); rebuild(); }; })); }); }));
  if(F){ var g=el('<div class="obg"></div>'); F.TPLS.forEach(function(tp){ var b=fb(tp.id); g.appendChild(el('<button title="'+esc(TR(tp.name))+'" style="background-image:url(\''+bgUrl(b)+'\')"></button>',function(n){ n.onclick=function(){ remember(); G.bg=b; changed(); rebuild(); }; })); }); box.appendChild(g);
    box.appendChild(el('<p class="note" style="margin:6px 0 10px">'+esc(TR("Верхний ряд: простые цвета. Ниже: фоны из мастерской фонов, их можно сделать и свои."))+'</p>')); }
  box.appendChild(sh("Звук"));
  box.appendChild(toggle(TR("Звуки при ответе и победе"),G.sound!==false,function(v){ remember(); G.sound=v; changed(); }));
  if(G.music) box.appendChild(el('<div class="row" style="margin:6px 0"><span class="mus" data-nt></span><button class="btn">'+sv("x")+'<span>'+esc(TR("Убрать"))+'</span></button></div>',function(r){ $(".mus",r).textContent=G.music.name; $("button",r).onclick=function(){ remember(); G.music=null; changed(); rebuild(); }; }));
  else box.appendChild(el('<button class="btn w">'+sv("file")+'<span>'+esc(TR("Музыка фоном"))+'</span><small>MP3, '+esc(TR("до 8 МБ"))+'</small></button>',function(b){ b.onclick=pickMusic; }));
  box.appendChild(el('<p class="note" style="margin:4px 0 6px">'+esc(TR("Бит можно сделать в битмейкере и сохранить в MP3. Музыка попадёт только в игру-файл."))+'</p>'));
  box.appendChild(sh("Финал"));
  box.appendChild(el('<div class="f"><input type="text" maxlength="120" placeholder="'+esc(TR("Текст победы"))+'"></div>',function(f){ bindText($("input",f),G,"win"); }));
  box.appendChild(el('<p class="note">'+esc(TR("Лучший результат запоминается у игрока в его браузере."))+'</p>'));
}
function paneMore(box){
  box.appendChild(el('<button class="btn w">'+esc(TR("Сделать копию"))+'</button>',function(n){ n.onclick=function(){ var c=JSON.parse(JSON.stringify(G)); c.id=newId(); c.title=TR("{0} (копия)",G.title||""); c.updated=Date.now(); gPut(c).then(function(){ openG(c); toast(TR("Открыта копия")); }); }; }));
  box.appendChild(el('<button class="btn w del">'+esc(TR("Удалить игру"))+'</button>',function(n){ n.onclick=function(){ ask(TR("Удалить «{0}»? Вернуть не получится.",G.title||""),TR("Удалить")).then(function(y){ if(y){ var g=G; gDel(g).then(function(){ G=null; showHome(); }); } }); }; }));
  box.appendChild(el('<p class="note" style="margin-top:8px">'+esc(TR("Игра хранится в этом браузере. Игрокам уходит копия: ссылкой или файлом."))+'</p>'));
}

/* ═══════════ отправка ═══════════ */
function heavy(){ return !!(G.music||aids(G).length); }
function b64(s){ return btoa(unescape(encodeURIComponent(s))).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,""); }
function unb64(s){ s=s.replace(/-/g,"+").replace(/_/g,"/"); while(s.length%4) s+="="; return decodeURIComponent(escape(atob(s))); }
function link(){ var o=JSON.parse(JSON.stringify(G)); delete o.id; delete o.updated; o.music=null; JSON.stringify(o,function(k,v){ return v; });
  (function strip(x){ if(x&&typeof x==="object") for(var k in x){ if(k==="img") x[k]=null; else strip(x[k]); } })(o);
  return location.origin+location.pathname+"#s="+b64(JSON.stringify(o)); }
function refreshInsp(){
  if(!G) return; if(!wide.matches&&ui.sheet!=="insp") return; var sc0=insp.scrollTop; insp.innerHTML=""; $("#shTitle").textContent=TR("Отправить");
  var hv=heavy(), L=link().length;
  insp.appendChild(sh("Ссылкой"));
  insp.appendChild(el('<p class="note" style="margin-bottom:10px">'+esc(hv?TR("В ссылку уйдёт всё, кроме своих картинок и музыки: их в адрес не уложить. Чтобы отправить всё, скачайте файл ниже."):TR("Вся игра помещается в ссылку. Ничего не хранится на сервере, игрок просто откроет её в браузере."))+(L>6000?' '+esc(TR("Ссылка вышла длинной, некоторые мессенджеры её обрежут. Надёжнее отправить файлом.")):'')+'</p>'));
  insp.appendChild(el('<button class="btn w'+(hv||L>6000?"":" go")+'">'+sv("link")+'<span>'+esc(TR("Скопировать ссылку"))+'</span></button>',function(n){ n.onclick=copyLink; }));
  if(navigator.share) insp.appendChild(el('<button class="btn w">'+sv("share")+'<span>'+esc(TR("Отправить в мессенджер"))+'</span></button>',function(n){ n.onclick=function(){ navigator.share({ title:G.title, url:link() }).catch(function(){}); }; }));
  insp.appendChild(el('<button class="btn w">'+sv("eye")+'<span>'+esc(TR("Сыграть как игрок"))+'</span></button>',function(n){ n.onclick=function(){ window.open(link(),"_blank"); }; }));
  insp.appendChild(sh("Файлом"));
  insp.appendChild(el('<p class="note" style="margin-bottom:10px">'+esc(TR("Один файл .html, внутри вся игра с картинками и музыкой. Его можно переслать, открыть без интернета или положить на свой сайт."))+'</p>'));
  insp.appendChild(el('<button class="btn w'+(hv||L>6000?" go":"")+'">'+sv("dl")+'<span>'+esc(TR("Скачать игру"))+'</span><small>.html</small></button>',function(n){ n.onclick=exportHtml; }));
  insp.scrollTop=sc0;
}
function copyLink(){ var u=link(); (navigator.clipboard?navigator.clipboard.writeText(u):Promise.reject()).then(function(){ toast(TR("Ссылка скопирована")); },function(){
  modal('<h3>'+esc(TR("Ссылка"))+'</h3><div class="link" data-nt></div><div class="row"><button class="btn" data-close>'+esc(TR("Закрыть"))+'</button></div>'); $("#mbox .link").textContent=u; }); }
function toData(blob){ return new Promise(function(res){ if(!blob){ res(""); return; } var r=new FileReader(); r.onload=function(){ res(r.result); }; r.onerror=function(){ res(""); }; r.readAsDataURL(blob); }); }
function latin(s){ var m={а:"a",б:"b",в:"v",г:"g",д:"d",е:"e",ё:"e",ж:"zh",з:"z",и:"i",й:"y",к:"k",л:"l",м:"m",н:"n",о:"o",п:"p",р:"r",с:"s",т:"t",у:"u",ф:"f",х:"h",ц:"ts",ч:"ch",ш:"sh",щ:"sch",ъ:"",ы:"y",ь:"",э:"e",ю:"yu",я:"ya",ł:"l",ß:"ss"};
  return String(s||"").toLowerCase().split("").map(function(c){ return m[c]!=null?m[c]:c; }).join("").normalize("NFD").replace(/[̀-ͯ]/g,"").replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"").slice(0,40); }
var PLAYJS=null;
function svgData(bg,w,h){ return bg&&F?"data:image/svg+xml;charset=utf-8,"+encodeURIComponent(F.svg(JSON.parse(JSON.stringify(bg)),w,h)):""; }
function exportHtml(){ toast(TR("Собираю файл...")); var ids=aids(G); if(G.music) ids.push(G.music.aid);
  var pj=PLAYJS?Promise.resolve(PLAYJS):fetch("play.js?v=1").then(function(r){ return r.text(); }).then(function(t){ PLAYJS=t; return t; });
  Promise.all([pj,Promise.all(ids.map(function(a){ return bGet(a).then(toData); }))]).then(function(r){
    var D=JSON.parse(JSON.stringify(G)); delete D.id; D.imgs={}; ids.forEach(function(a,i){ D.imgs[a]=r[1][i]; }); D.bgUrl=svgData(G.bg,900,1600); D.puzzleUrl=G.puzzle&&G.puzzle.bg?svgData(G.puzzle.bg,1000,1000):"";
    D.musicUrl=G.music?D.imgs[G.music.aid]:""; D.lang=G.lang||lang();
    var J=function(x){ return JSON.stringify(x).replace(/</g,"\\u003c"); }, foot={ text:TR("Сделать свою игру"), href:location.origin+location.pathname };
    var html='<!DOCTYPE html>\n<html lang="'+esc(D.lang)+'">\n<head>\n<meta charset="UTF-8">\n<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">\n<title>'+esc(G.title||"")+'</title>\n<link rel="stylesheet" href="https://fonts.bunny.net/css?family=manrope:400,600,700,800|unbounded:500,700&display=swap">\n<style>html,body{margin:0;height:100%;background:#111}#g{position:fixed;inset:0}</style>\n</head>\n<body>\n<div id="g"></div>\n<script>\n'+r[0].replace(/<\/script/gi,"<\\/script")+'\n</script>\n<script>GAMEVIEW.mount(document.getElementById("g"),'+J(D)+',{foot:'+J(foot)+'});</script>\n</body>\n</html>\n';
    var b=new Blob([html],{type:"text/html"}), a=document.createElement("a"); a.href=URL.createObjectURL(b); a.download=(latin(G.title)||"igra")+".html"; document.body.appendChild(a); a.click();
    setTimeout(function(){ URL.revokeObjectURL(a.href); a.remove(); },3000); toast(TR("Файл сохранён: {0}",b.size>1048576?(b.size/1048576).toFixed(1)+" "+TR("МБ"):Math.round(b.size/1024)+" "+TR("КБ"))); })
  .catch(function(){ toast(TR("Не получилось сохранить файл")); }); }
$("#saveBtn").onclick=function(){ if(wide.matches) insp.animate([{background:"rgba(79,214,200,.12)"},{background:"transparent"}],{duration:900}); else openInsp(); };
$("#linkBtn").onclick=copyLink;

/* ═══════════ картинки и музыка ═══════════ */
function pickFile(accept,fn){ var f=$("#fIn"); f.value=""; f.accept=accept; f.onchange=function(){ if(f.files[0]) fn(f.files[0]); }; f.click(); }
function pickImage(done){ pickFile("image/*",function(file){ var img=new Image(), u=URL.createObjectURL(file); img.onload=function(){ var k=Math.min(1,900/Math.max(img.width,img.height)), cv=document.createElement("canvas"); cv.width=Math.round(img.width*k); cv.height=Math.round(img.height*k);
    cv.getContext("2d").drawImage(img,0,0,cv.width,cv.height); URL.revokeObjectURL(u); cv.toBlob(function(b){ var aid=newId("i"); bPut(aid,b).then(function(){ done(aid); }); },"image/jpeg",.84); };
  img.onerror=function(){ toast(TR("Эту картинку браузер открыть не смог")); }; img.src=u; }); }
function pickMusic(){ pickFile("audio/*,.mp3,.m4a,.ogg,.wav",function(file){ if(file.size>8*1024*1024){ toast(TR("Файл больше 8 МБ: игра выйдет слишком тяжёлой. Обрежьте его в звуковой мастерской.")); return; }
  var aid=newId("m"); bPut(aid,file).then(function(){ remember(); G.music={ aid:aid, name:file.name.replace(/\.[^.]+$/,"").slice(0,40) }; changed(true); toast(TR("Добавлено: {0}",G.music.name)); }); }); }

/* ═══════════ окна ═══════════ */
function modal(h){ $("#mbox").innerHTML=h; $("#modal").classList.add("on"); }
function closeModal(){ $("#modal").classList.remove("on"); }
$("#modal").addEventListener("click",function(e){ if(e.target.closest("[data-close]")||e.target===e.currentTarget) closeModal(); });
function ask(text,ok){ return new Promise(function(res){ modal('<h3>'+esc(text)+'</h3><div class="row"><button class="btn" data-n>'+esc(TR("Отмена"))+'</button><button class="btn go" data-y>'+esc(ok)+'</button></div>');
  $("#mbox [data-n]").onclick=function(){ closeModal(); res(false); }; $("#mbox [data-y]").onclick=function(){ closeModal(); res(true); }; }); }
var tT=0; function toast(t){ var e=$("#toast"); e.textContent=t; e.classList.add("on"); clearTimeout(tT); tT=setTimeout(function(){ e.classList.remove("on"); },2800); }
addEventListener("keydown",function(e){ if($("#ed").hidden||$("#modal").classList.contains("on")) return; if(/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) return; var k=e.key.toLowerCase();
  if((e.ctrlKey||e.metaKey)&&k==="z"){ e.preventDefault(); $(e.shiftKey?"#redo":"#undo").click(); } else if((e.ctrlKey||e.metaKey)&&k==="y"){ e.preventDefault(); $("#redo").click(); } });
$("#title").addEventListener("input",function(){ if(G){ G.title=this.value; save(); preview(); } });

/* ═══════════ мои игры ═══════════ */
/* миниатюра: игра рисуется в окне размера телефона и уменьшается целиком, как скриншот */
var miniRO=window.ResizeObserver?new ResizeObserver(function(es){ es.forEach(function(e){ fitMini(e.target); }); }):null;
function fitMini(box){ var inner=box.firstChild; if(!inner) return; var w=box.clientWidth||150, h=box.clientHeight||260, W=360; inner.style.height=Math.round(h/w*W)+"px"; inner.style.transform="scale("+(w/W)+")"; }
function mini(box,g){ data(g,{nomus:true,mute:true}).then(function(D){ var inner=document.createElement("div");
  inner.style.cssText="position:absolute;left:0;top:0;width:360px;transform-origin:0 0"; box.innerHTML=""; box.style.position="relative"; box.appendChild(inner); fitMini(box); GV.mount(inner,D,{preview:true}); if(miniRO) miniRO.observe(box); }); }
function showHome(){
  if(ctl){ ctl.destroy(); ctl=null; } $("#view").hidden=true; $("#ed").hidden=true; $("#home").hidden=false; document.title=TR("FORGE · игры по шаблонам");
  try{ history.replaceState(null,"",location.pathname); }catch(e){}
  gAll().then(function(list){ list.sort(function(a,b){ return (b.updated||0)-(a.updated||0); }); var my=$("#myG"); my.innerHTML="";
    if(!list.length) my.appendChild(el('<p class="note">'+esc(TR("Здесь появятся ваши игры."))+'</p>'));
    list.forEach(function(g){ var d=new Date(g.updated||Date.now()), when=d.toLocaleDateString(window.FLANG||"ru",{day:"numeric",month:"short"}), K=KINDS.filter(function(k){ return k[0]===g.kind; })[0];
      var n=el('<div class="gc"><button class="th"><div class="mv" data-nt></div></button><b data-nt></b><small>'+esc(TR(K?K[1]:""))+', '+when+'</small><div class="acts"><button data-a="copy">'+esc(TR("копия"))+'</button><button data-a="del">'+esc(TR("удалить"))+'</button></div></div>');
      $("b",n).textContent=g.title||""; $(".th",n).onclick=function(){ openG(g); };
      $$(".acts button",n).forEach(function(x){ x.onclick=function(){ if(x.getAttribute("data-a")==="copy"){ var k=JSON.parse(JSON.stringify(g)); k.id=newId(); k.title=TR("{0} (копия)",g.title||""); k.updated=Date.now(); gPut(k).then(showHome); }
        else ask(TR("Удалить «{0}»? Вернуть не получится.",g.title||""),TR("Удалить")).then(function(y){ if(y) gDel(g).then(showHome); }); }; });
      my.appendChild(n); requestAnimationFrame(function(){ mini($(".mv",n),g); }); }); });
  var t=$("#tplG"); t.innerHTML="";
  TPL.forEach(function(tp){ var K=KINDS.filter(function(k){ return k[0]===tp.kind; })[0]; t.appendChild(el('<button class="gt"><div class="mv" data-nt></div><b>'+esc(TR(K[1]))+'</b><small>'+esc(TR(K[2]))+'</small></button>',function(n){ n.onclick=function(){ create(tp.make()); }; requestAnimationFrame(function(){ mini($(".mv",n),tp.make()); }); })); });
}
function create(g){ return gPut(g).catch(function(){}).then(function(){ openG(g); }); }
function openG(g){ if(ctl){ ctl.destroy(); ctl=null; } G=g; U=[]; Rd=[]; undoBtns(); jump=null; openQ=0; openS=null;
  $("#home").hidden=true; $("#view").hidden=true; $("#ed").hidden=false; document.title="FORGE · "+(G.title||""); $("#title").value=G.title||"";
  try{ history.replaceState(null,"",location.pathname+"#"+G.id); }catch(e){}
  if(wide.matches){ openTab("game"); refreshInsp(); } else closeSheet(); doPreview(); }
$("#toHome").onclick=function(){ save(); setTimeout(showHome,380); };
if(window.ResizeObserver) new ResizeObserver(function(){}).observe($("#gpv"));
/* игра по ссылке: только сама игра */
function showView(g){ $("#home").hidden=true; $("#ed").hidden=true; $("#view").hidden=false; document.title=g.title||"FORGE"; g.imgs={}; g.bgUrl=bgUrl(g.bg); g.puzzleUrl=g.puzzle&&g.puzzle.bg?bgSq(g.puzzle.bg):""; g.lang=g.lang||lang();
  GV.mount($("#view"),g,{ foot:{ text:TR("Сделать свою игру"), href:location.pathname } }); }
(function boot(){ var h=location.hash.slice(1);
  if(/^s=/.test(h)){ try{ showView(JSON.parse(unb64(h.slice(2)))); return; }catch(e){ toast(TR("Ссылка повреждена")); } }
  if(/^tpl=/.test(h)){ var t=TPL.filter(function(x){ return x.id===h.slice(4); })[0]; if(t){ create(t.make()); return; } }
  if(h&&!/=/.test(h)) gGet(h).then(function(g){ if(g) openG(g); else showHome(); }); else showHome(); })();
})();
