/* FORGE: движок конструктора страниц, версия 2.
   Страница = блоки сверху вниз. Блок (BLOCKS) из своих настроек собирает HTML, CSS и при необходимости JS.
   Внутри блока у элементов есть метки data-e: по ним редактор выделяет элемент, а правки
   (сдвиг, ширина, размер текста, цвета, скругление) хранятся в block.e и превращаются в CSS.
   Сдвиг и ширина хранятся в долях ширины блока (cqw), поэтому страница держится на любом экране.
   Файлом пользуются редактор (HTML-CSS-JS/index.html) и просмотр по ссылке (forge/p/). */

/* ─────────── шрифты (Bunny Fonts: тот же каталог, что у Google Fonts) ─────────── */
var FONTS = {
  manrope:   { n:"Manrope",            w:"400,600,700,800", fb:"system-ui,sans-serif" },
  inter:     { n:"Inter",              w:"400,600,700,800", fb:"system-ui,sans-serif" },
  unbounded: { n:"Unbounded",          w:"500,700",         fb:"system-ui,sans-serif" },
  montserrat:{ n:"Montserrat",         w:"400,600,700,800", fb:"system-ui,sans-serif" },
  rubik:     { n:"Rubik",              w:"400,500,700",     fb:"system-ui,sans-serif" },
  nunito:    { n:"Nunito",             w:"400,600,800",     fb:"system-ui,sans-serif" },
  comfortaa: { n:"Comfortaa",          w:"500,700",         fb:"system-ui,sans-serif" },
  oswald:    { n:"Oswald",             w:"500,700",         fb:"system-ui,sans-serif" },
  lora:      { n:"Lora",               w:"500,600,700",     fb:"Georgia,serif" },
  playfair:  { n:"Playfair Display",   w:"600,700,800",     fb:"Georgia,serif" },
  cormorant: { n:"Cormorant Garamond", w:"500,600,700",     fb:"Georgia,serif" },
  ptserif:   { n:"PT Serif",           w:"400,700",         fb:"Georgia,serif" },
  jbmono:    { n:"JetBrains Mono",     w:"400,700",         fb:"ui-monospace,monospace" },
  system:    { n:"",                   w:"",                fb:"system-ui,-apple-system,'Segoe UI',Roboto,sans-serif" }
};
function fontStack(id){ var f=FONTS[id]||FONTS.system; return f.n ? "'"+f.n+"',"+f.fb : f.fb; }
function fontLink(ids){
  var seen={}, parts=[];
  ids.forEach(function(id){ var f=FONTS[id]; if(!f||!f.n||seen[id]) return; seen[id]=1;
    parts.push(f.n.toLowerCase().replace(/ /g,"-")+":"+f.w); });
  return parts.length ? "https://fonts.bunny.net/css?family="+parts.join("|")+"&display=swap" : "";
}

/* ─────────── темы ─────────── */
/* btn: fill (заливка), glass (стекло), outline (контур), soft (мягкая) */
var THEMES = {
  sunset:  { name:"Закат",    fh:"unbounded", fb:"manrope",  bg:"#1a1030", bg2:"#46203f", sf:"rgba(255,255,255,.08)", tx:"#ffffff", mu:"rgba(255,255,255,.72)", ac:"#ff8a4c", ac2:"#ff5fa2", on:"#25110a", btn:"glass", r:16 },
  paper:   { name:"Бумага",   fh:"lora",      fb:"manrope",  bg:"#f6f0e6", bg2:"#efe5d4", sf:"#fffaf2", tx:"#2b2420", mu:"#7a6a5c", ac:"#b4632f", ac2:"#e0a96d", on:"#ffffff", btn:"fill", r:10 },
  minimal: { name:"Минимал",  fh:"inter",     fb:"inter",    bg:"#ffffff", bg2:"#ffffff", sf:"#f4f5f7", tx:"#111317", mu:"#6b7280", ac:"#111317", ac2:"#3b82f6", on:"#ffffff", btn:"fill", r:12 },
  neon:    { name:"Неон",     fh:"oswald",    fb:"inter",    bg:"#07090c", bg2:"#0d1a1c", sf:"rgba(79,214,200,.07)", tx:"#e8fffb", mu:"rgba(232,255,251,.65)", ac:"#4fd6c8", ac2:"#ff4fa3", on:"#04201c", btn:"outline", r:6 },
  forest:  { name:"Лес",      fh:"cormorant", fb:"manrope",  bg:"#132219", bg2:"#1d3324", sf:"rgba(240,230,200,.07)", tx:"#f1ead6", mu:"rgba(241,234,214,.7)", ac:"#d9b36c", ac2:"#9fc58b", on:"#1b1508", btn:"fill", r:4 },
  night:   { name:"Ночь",     fh:"montserrat",fb:"inter",    bg:"#0b1024", bg2:"#16204a", sf:"rgba(140,170,255,.08)", tx:"#eef2ff", mu:"rgba(238,242,255,.68)", ac:"#6d8bff", ac2:"#a970ff", on:"#ffffff", btn:"soft", r:14 },
  candy:   { name:"Конфета",  fh:"comfortaa", fb:"nunito",   bg:"#fff0f5", bg2:"#ffe3ec", sf:"#ffffff", tx:"#3d2433", mu:"#8c6478", ac:"#ff5c8a", ac2:"#ffb547", on:"#ffffff", btn:"fill", r:22 },
  mint:    { name:"Мята",     fh:"rubik",     fb:"rubik",    bg:"#effaf6", bg2:"#e0f4ec", sf:"#ffffff", tx:"#16332b", mu:"#5c7f74", ac:"#1f9e7a", ac2:"#7bd3b4", on:"#ffffff", btn:"fill", r:14 },
  magazine:{ name:"Журнал",   fh:"playfair",  fb:"inter",    bg:"#fbfaf8", bg2:"#fbfaf8", sf:"#f1eee9", tx:"#161412", mu:"#6d6760", ac:"#c8372d", ac2:"#161412", on:"#ffffff", btn:"outline", r:0 },
  terminal:{ name:"Терминал", fh:"jbmono",    fb:"jbmono",   bg:"#05080a", bg2:"#0a1410", sf:"rgba(53,224,138,.06)", tx:"#b8f5c0", mu:"rgba(184,245,192,.65)", ac:"#35e08a", ac2:"#e0d035", on:"#02130a", btn:"outline", r:2 }
};
var BTN_STYLES = [["fill","заливка"],["glass","стекло"],["outline","контур"],["soft","мягкая"]];
var PAGE_W = { narrow:520, normal:760, wide:1080 };
var GAPS = { s:14, m:26, l:44 };

/* ─────────── иконки (свои, простые линии) ─────────── */
var ICONS = {
  phone:"M5 4h4l2 5-2.5 1.5a11 11 0 005 5L15 13l5 2v4a2 2 0 01-2 2A16 16 0 013 6a2 2 0 012-2",
  chat:"M4 5h16v11H9l-5 4z",
  send:"M21 4L3 11l6 2 2 6 3-4 5 4zM9 13l12-9",
  mail:"M3 6h18v12H3zM3 7l9 6 9-6",
  globe:"M3 12a9 9 0 1018 0 9 9 0 00-18 0zM3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18",
  camera:"M4 8h3l2-3h6l2 3h3v11H4zM8 13a4 4 0 108 0 4 4 0 00-8 0",
  play:"M3 5h18v14H3zM10 9l5 3-5 3z",
  music:"M9 18V6l11-2v12M3 18a3 3 0 106 0 3 3 0 00-6 0M14 16a3 3 0 106 0 3 3 0 00-6 0",
  pin:"M12 21s-7-6-7-12a7 7 0 0114 0c0 6-7 12-7 12zM10 9a2 2 0 104 0 2 2 0 00-4 0",
  cal:"M4 6h16v14H4zM4 10h16M8 3v4M16 3v4",
  clock:"M3 12a9 9 0 1018 0 9 9 0 00-18 0zM12 7v5l3 2",
  star:"M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z",
  heart:"M12 20s-8-5-8-11a4.5 4.5 0 018-2.8A4.5 4.5 0 0120 9c0 6-8 11-8 11z",
  gift:"M4 10h16v10H4zM3 7h18v3H3zM12 7v13M12 7c-2-4-6-3-5 0M12 7c2-4 6-3 5 0",
  check:"M5 12l5 5 9-10",
  spark:"M12 3v6M12 15v6M3 12h6M15 12h6M6 6l3 3M15 15l3 3M18 6l-3 3M9 15l-3 3",
  coffee:"M4 9h12v6a5 5 0 01-5 5H9a5 5 0 01-5-5zM16 11h2a2 2 0 010 4h-2M8 3v3M12 3v3",
  user:"M8 8a4 4 0 108 0 4 4 0 00-8 0M4 21a8 8 0 0116 0",
  link:"M10 14a4 4 0 006 0l3-3a4 4 0 00-6-6l-1 1M14 10a4 4 0 00-6 0l-3 3a4 4 0 006 6l1-1",
  down:"M12 4v12M7 11l5 5 5-5M5 20h14",
  arrow:"M5 12h14M13 6l6 6-6 6",
  brush:"M4 20c3 0 5-2 5-5l9-11 2 2-11 9c-3 0-5 2-5 5z",
  book:"M4 4h7a3 3 0 013 3v13a2 2 0 00-2-2H4zM20 4h-5a3 3 0 00-3 3",
  bag:"M5 8h14l-1 12H6zM9 8V6a3 3 0 016 0v2",
  home:"M4 11l8-7 8 7v9H4zM10 20v-6h4v6"
};
var ICON_LIST = Object.keys(ICONS);
var ICON_NAMES = { phone:"телефон", chat:"сообщение", send:"самолётик", mail:"почта", globe:"сайт", camera:"камера", play:"видео",
  music:"музыка", pin:"место", cal:"календарь", clock:"время", star:"звезда", heart:"сердце", gift:"подарок", check:"галочка",
  spark:"искра", coffee:"кофе", user:"человек", link:"ссылка", down:"скачать", arrow:"стрелка", brush:"кисть", book:"книга", bag:"покупки", home:"дом" };
function icon(id, cls){ var d=ICONS[id]; if(!d) return ""; return '<svg class="'+(cls||"ic")+'" viewBox="0 0 24 24" aria-hidden="true"><path d="'+d+'"/></svg>'; }

/* ─────────── мелочи ─────────── */
function esc(s){ return String(s==null?"":s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"); }
function tx(s){ return esc(s).replace(/\n/g,"<br>"); }
function clone(o){ return JSON.parse(JSON.stringify(o)); }
function digits(s){ return String(s||"").replace(/[^\d+]/g,""); }

/* действия кнопок: что происходит при нажатии */
var ACTIONS = [
  ["link","Открыть ссылку","Адрес страницы, например https://..."],
  ["block","Прокрутить к блоку",""],
  ["tel","Позвонить","Номер телефона"],
  ["wa","Написать в WhatsApp","Номер телефона с кодом страны"],
  ["tg","Написать в Telegram","Имя пользователя, например @name"],
  ["mail","Написать на почту","Адрес почты"],
  ["copy","Скопировать текст","Что скопировать (адрес, промокод...)"],
  ["toggle","Показать или скрыть блок",""],
  ["file","Скачать файл","Ссылка на файл"]
];
function actAttrs(a){
  a=a||{}; var v=String(a.v||"").trim(), t=a.t||"link";
  if(t==="link"){ if(v && !/^(https?:|mailto:|tel:|#|\/|\.)/i.test(v)) v="https://"+v; return 'href="'+esc(v||"#")+'"'+(a.nw!==false&&/^https?:/i.test(v)?' target="_blank" rel="noopener"':""); }
  if(t==="block") return 'href="#b-'+esc(v)+'"';
  if(t==="tel") return 'href="tel:'+esc(digits(v))+'"';
  if(t==="wa") return 'href="https://wa.me/'+esc(digits(v).replace("+",""))+'" target="_blank" rel="noopener"';
  if(t==="tg") return 'href="https://t.me/'+esc(v.replace(/^@/,"").replace(/^https?:\/\/t\.me\//,""))+'" target="_blank" rel="noopener"';
  if(t==="mail") return 'href="mailto:'+esc(v)+'"';
  if(t==="copy") return 'href="#" data-copy="'+esc(v)+'"';
  if(t==="toggle") return 'href="#" data-toggle="b-'+esc(v)+'"';
  if(t==="file") return 'href="'+esc(v||"#")+'" download';
  return 'href="#"';
}
function needsJs(a){ return a && (a.t==="copy"||a.t==="toggle"); }

/* ─────────── БЛОКИ ───────────
   fields: настройки содержимого. Типы: text, area, select, date, time, img, icon, action, toggle, num, blockref.
   list: список однотипных строк (ссылки, пункты меню, вопросы...), у каждой строки свои поля.
   gen(c, b, ctx) -> { html, css, js, els:{ ключ: вид } }. Вид элемента: text, box, img, round, wrap.
   Классы с префиксом блока, чтобы блоки не мешали друг другу. */
var BLOCKS = {};

BLOCKS.profile = { name:"Профиль", glyph:"user", group:"text", desc:"фото, имя, пара строк",
  variants:[["center","по центру"],["left","фото слева"],["cover","большое фото"]],
  fields:[ {id:"img",type:"img",label:"Фото",max:520}, {id:"name",type:"text",label:"Имя",def:"Ваше имя"},
    {id:"bio",type:"area",label:"О себе",def:"Пара слов о том, чем вы занимаетесь."} ],
  gen:function(c,b){
    var ini=String(c.name||"?").trim().split(/\s+/).map(function(w){return w.charAt(0);}).join("").slice(0,2).toUpperCase();
    var av=c.img?'<img src="'+esc(c.img)+'" alt="">':'<span>'+esc(ini)+'</span>';
    return { els:{av:"round",name:"text",bio:"text"},
      css:".b-profile{display:flex;flex-direction:column;align-items:center;gap:12px;text-align:center}\n"+
        ".b-profile .av{width:112px;height:112px;border-radius:50%;padding:3px;background:linear-gradient(140deg,var(--ac),var(--ac2));flex:none}\n"+
        ".b-profile .av>*{width:100%;height:100%;border-radius:50%;object-fit:cover;display:grid;place-items:center;background:var(--bg2);font-family:var(--fh);font-weight:700;font-size:36px;color:var(--tx)}\n"+
        ".b-profile h1{font-family:var(--fh);font-size:calc(30px * var(--fs,1));line-height:1.15;margin:4px 0 0}\n"+
        ".b-profile p{color:var(--mu);font-size:calc(16px * var(--fs,1));line-height:1.55;max-width:38ch;margin:0}\n"+
        ".b-profile.v-left{flex-direction:row;text-align:left;align-items:center;gap:18px}\n.b-profile.v-left .av{width:88px;height:88px}\n.b-profile.v-left .tx{display:flex;flex-direction:column;gap:6px}\n"+
        ".b-profile.v-cover .av{width:100%;height:auto;aspect-ratio:4/3;border-radius:calc(var(--r)*1.4);padding:0;background:var(--sf)}\n.b-profile.v-cover .av>*{border-radius:inherit;font-size:64px}",
      html:'<div class="av" data-e="av">'+av+'</div>'+(b.v==="left"?'<div class="tx">':'')+
        '<h1 data-e="name" data-f="name">'+tx(c.name)+'</h1><p data-e="bio" data-f="bio">'+tx(c.bio)+'</p>'+(b.v==="left"?'</div>':'') };
  }
};

BLOCKS.hero = { name:"Обложка", glyph:"star", group:"text", desc:"большой заголовок и кнопка",
  variants:[["center","по центру"],["photo","на фоне фото"],["split","фото рядом"]],
  fields:[ {id:"kicker",type:"text",label:"Надпись сверху",def:""}, {id:"title",type:"area",label:"Заголовок",def:"Большой заголовок о главном"},
    {id:"text",type:"area",label:"Текст",def:"Одна-две строки: что здесь и зачем сюда заглянуть."},
    {id:"btn",type:"text",label:"Кнопка (пусто: без кнопки)",def:"Узнать больше"}, {id:"act",type:"action",label:"Что делает кнопка"},
    {id:"img",type:"img",label:"Фото",max:1400} ],
  gen:function(c,b){
    var photo=b.v!=="center", bgimg=b.v==="photo"&&c.img;
    var inner=(c.kicker?'<div class="k" data-e="kicker" data-f="kicker">'+tx(c.kicker)+'</div>':'')+
      '<h1 data-e="title" data-f="title">'+tx(c.title)+'</h1><p data-e="text" data-f="text">'+tx(c.text)+'</p>'+
      (c.btn?'<a class="btn main" data-e="btn" data-f="btn" '+actAttrs(c.act)+'>'+tx(c.btn)+'</a>':'');
    var html = b.v==="split"
      ? '<div class="sp"><div class="tx">'+inner+'</div><div class="im" data-e="img">'+(c.img?'<img src="'+esc(c.img)+'" alt="">':'<span>фото</span>')+'</div></div>'
      : (b.v==="photo"?'<div class="ph"'+(bgimg?' style="background-image:url('+esc(c.img)+')"':'')+'></div>':'')+'<div class="tx">'+inner+'</div>';
    return { els:{kicker:"text",title:"text",text:"text",btn:"box",img:"img"}, js:needsJs(c.act)?"@act":"",
      css:".b-hero{position:relative;text-align:center}\n.b-hero .tx{position:relative;display:flex;flex-direction:column;align-items:center;gap:14px}\n"+
        ".b-hero .k{font-size:calc(13px * var(--fs,1));letter-spacing:.14em;text-transform:uppercase;color:var(--ac);font-weight:700}\n"+
        ".b-hero h1{font-family:var(--fh);font-size:calc(clamp(32px,7vw,58px) * var(--fs,1));line-height:1.08;margin:0;letter-spacing:-.01em}\n"+
        ".b-hero p{color:var(--mu);font-size:calc(18px * var(--fs,1));line-height:1.55;max-width:44ch;margin:0}\n.b-hero .btn{margin-top:8px}\n"+
        ".b-hero.v-photo{padding:72px 22px;border-radius:calc(var(--r)*1.4);overflow:hidden;color:#fff}\n"+
        ".b-hero .ph{position:absolute;inset:0;background:linear-gradient(140deg,var(--ac2),var(--ac)) center/cover}\n.b-hero .ph::after{content:'';position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,0,0,.25),rgba(0,0,0,.55))}\n"+
        ".b-hero.v-photo p{color:rgba(255,255,255,.85)}\n"+
        ".b-hero .sp{display:grid;grid-template-columns:1fr;gap:24px;align-items:center;text-align:left}\n.b-hero .sp .tx{align-items:flex-start}\n"+
        "@container page (min-width:640px){ .b-hero .sp{grid-template-columns:1.1fr 1fr} }\n"+
        ".b-hero .im{aspect-ratio:4/5;border-radius:calc(var(--r)*1.4);overflow:hidden;background:var(--sf);display:grid;place-items:center;color:var(--mu)}\n.b-hero .im img{width:100%;height:100%;object-fit:cover;display:block}",
      html:html };
  }
};

BLOCKS.heading = { name:"Заголовок", glyph:"star", group:"text", desc:"крупная строка",
  variants:[["h2","обычный"],["h1","большой"],["line","с линией"]],
  fields:[ {id:"text",type:"text",label:"Текст",def:"Заголовок раздела"} ],
  gen:function(c,b){
    return { els:{h:"text"},
      css:".b-heading h2{font-family:var(--fh);font-size:calc(28px * var(--fs,1));line-height:1.2;margin:0}\n.b-heading.v-h1 h2{font-size:calc(clamp(34px,7vw,52px) * var(--fs,1))}\n"+
        ".b-heading.v-line h2{display:flex;align-items:center;gap:16px}\n.b-heading.v-line h2::before,.b-heading.v-line h2::after{content:'';flex:1;height:1px;background:var(--mu);opacity:.5}",
      html:'<h2 data-e="h" data-f="text">'+tx(c.text)+'</h2>' };
  }
};

BLOCKS.text = { name:"Текст", glyph:"book", group:"text", desc:"абзац",
  variants:[["normal","обычный"],["lead","крупный"],["card","на карточке"]],
  fields:[ {id:"text",type:"area",label:"Текст",def:"Здесь любой текст. Пустая строка делает новый абзац."} ],
  gen:function(c,b){
    var ps=String(c.text||"").split(/\n\s*\n/);
    return { els:{p:"text"},
      css:".b-text .t{font-size:calc(17px * var(--fs,1));line-height:1.7;margin:0}\n.b-text .t p{margin:0 0 .8em}\n.b-text .t p:last-child{margin:0}\n"+
        ".b-text.v-lead .t{font-size:calc(21px * var(--fs,1));line-height:1.55}\n.b-text.v-card .t{background:var(--sf);border-radius:var(--r);padding:22px}",
      html:'<div class="t" data-e="p" data-f="text">'+ps.map(function(p){return '<p>'+tx(p.trim())+'</p>';}).join("")+'</div>' };
  }
};

BLOCKS.button = { name:"Кнопка", glyph:"arrow", group:"btn", desc:"ссылка, звонок, действие",
  variants:[["main","главная"],["second","обычная"],["wide","во всю ширину"]],
  fields:[ {id:"text",type:"text",label:"Надпись",def:"Нажмите сюда"}, {id:"sub",type:"text",label:"Подпись мелким",def:""},
    {id:"icon",type:"icon",label:"Иконка",def:""}, {id:"act",type:"action",label:"Что делает кнопка"} ],
  gen:function(c,b){
    return { els:{btn:"box"}, js:needsJs(c.act)?"@act":"",
      css:".b-button{display:flex;justify-content:center}\n.b-button.v-wide .btn{width:100%}",
      html:'<a class="btn'+(b.v==="second"?"":" main")+'" data-e="btn" '+actAttrs(c.act)+'>'+(c.icon?icon(c.icon):"")+
        '<span><span data-f="text">'+tx(c.text)+'</span>'+(c.sub?'<small data-f="sub">'+tx(c.sub)+'</small>':'')+'</span></a>' };
  }
};

BLOCKS.links = { name:"Список ссылок", glyph:"link", group:"btn", desc:"кнопки столбиком, как Linktree",
  variants:[["stack","столбиком"],["grid","плиткой"],["line","строками"]],
  fields:[],
  list:{ label:"Ссылки", one:"Ссылка", add:"Добавить ссылку", item:{t:"Новая ссылка",s:"",i:"",a:{t:"link",v:""}},
    fields:[ {id:"t",type:"text",label:"Надпись"}, {id:"s",type:"text",label:"Подпись мелким"}, {id:"i",type:"icon",label:"Иконка"}, {id:"a",type:"action",label:"Что делает"} ],
    def:[ {t:"Мой канал",s:"новые видео каждую неделю",i:"play",a:{t:"link",v:"https://youtube.com/"}},
          {t:"Написать в Telegram",s:"",i:"send",a:{t:"tg",v:"@username"}},
          {t:"Почта",s:"",i:"mail",a:{t:"mail",v:"you@mail.com"}} ] },
  gen:function(c,b){
    var js=c.L.some(needsJsItem)?"@act":"";
    return { els:{"i*":"box"}, js:js,
      css:".b-links .ls{display:flex;flex-direction:column;gap:12px;width:100%}\n.b-links .btn{width:100%}\n"+
        ".b-links.v-grid .ls{display:grid;grid-template-columns:1fr 1fr}\n.b-links.v-grid .btn{flex-direction:column;padding:20px 12px;text-align:center}\n"+
        ".b-links.v-line .btn{justify-content:space-between;background:transparent;border:0;border-bottom:1px solid var(--mu);border-radius:0;padding:16px 4px;color:var(--tx);box-shadow:none;backdrop-filter:none}\n"+
        ".b-links.v-line .btn::after{content:'';width:9px;height:9px;border-right:2px solid currentColor;border-top:2px solid currentColor;transform:rotate(45deg);flex:none}",
      html:'<div class="ls">'+c.L.map(function(it,i){
        return '<a class="btn'+(i===0&&b.v!=="line"?" main":"")+'" data-e="i'+i+'" data-k="i" '+actAttrs(it.a)+'>'+(it.i?icon(it.i):"")+
          '<span><span data-f="L.'+i+'.t">'+tx(it.t)+'</span>'+(it.s?'<small data-f="L.'+i+'.s">'+tx(it.s)+'</small>':'')+'</span></a>';
      }).join("")+'</div>' };
  }
};
function needsJsItem(it){ return needsJs(it.a); }

BLOCKS.contact = { name:"Связаться", glyph:"phone", group:"btn", desc:"звонок, мессенджеры, почта",
  variants:[["icons","круглые иконки"],["buttons","кнопки"]],
  fields:[],
  list:{ label:"Способы связи", one:"Способ связи", add:"Добавить способ", item:{i:"phone",t:"Позвонить",a:{t:"tel",v:""}},
    fields:[ {id:"i",type:"icon",label:"Иконка"}, {id:"t",type:"text",label:"Подпись"}, {id:"a",type:"action",label:"Что делает"} ],
    def:[ {i:"phone",t:"Позвонить",a:{t:"tel",v:"+48 600 000 000"}}, {i:"chat",t:"WhatsApp",a:{t:"wa",v:"+48 600 000 000"}},
          {i:"send",t:"Telegram",a:{t:"tg",v:"@username"}}, {i:"mail",t:"Почта",a:{t:"mail",v:"you@mail.com"}} ] },
  gen:function(c,b){
    var ic=b.v!=="buttons";
    return { els:{"i*":"box"}, js:c.L.some(needsJsItem)?"@act":"",
      css:".b-contact .cs{display:flex;flex-wrap:wrap;justify-content:center;gap:12px}\n"+
        ".b-contact .ci{width:54px;height:54px;border-radius:50%;display:grid;place-items:center;background:var(--sf);color:var(--tx);border:1px solid color-mix(in srgb,var(--tx) 22%,transparent);text-decoration:none}\n"+
        ".b-contact .ci .ic{width:22px;height:22px}\n.b-contact.v-buttons .cs{display:grid;grid-template-columns:1fr 1fr;gap:10px}",
      html:'<div class="cs">'+c.L.map(function(it,i){
        return ic ? '<a class="ci" title="'+esc(it.t)+'" aria-label="'+esc(it.t)+'" data-e="i'+i+'" data-k="i" '+actAttrs(it.a)+'>'+icon(it.i||"link")+'</a>'
                  : '<a class="btn" data-e="i'+i+'" data-k="i" '+actAttrs(it.a)+'>'+icon(it.i||"link")+'<span data-f="L.'+i+'.t">'+tx(it.t)+'</span></a>';
      }).join("")+'</div>' };
  }
};

BLOCKS.image = { name:"Фото", glyph:"camera", group:"media", desc:"одна картинка с подписью",
  variants:[["normal","обычное"],["round","скруглённое"],["full","во всю ширину"]],
  fields:[ {id:"img",type:"img",label:"Фото",max:1400}, {id:"cap",type:"text",label:"Подпись",def:""} ],
  gen:function(c,b){
    return { els:{img:"img",cap:"text"},
      css:".b-image figure{margin:0;display:flex;flex-direction:column;align-items:center;gap:10px}\n"+
        ".b-image .im{width:100%;border-radius:var(--r);overflow:hidden;background:var(--sf)}\n.b-image .im img{width:100%;display:block}\n"+
        ".b-image .im .ph{aspect-ratio:16/10;display:grid;place-items:center;color:var(--mu)}\n.b-image.v-round .im{border-radius:calc(var(--r)*2.2)}\n"+
        ".b-image.v-full{margin-inline:calc(50% - 50vw)}\n.b-image.v-full .im{border-radius:0}\n.b-image figcaption{color:var(--mu);font-size:calc(14px * var(--fs,1))}",
      html:'<figure><div class="im" data-e="img">'+(c.img?'<img src="'+esc(c.img)+'" alt="'+esc(c.cap)+'">':'<div class="ph">нажмите, чтобы выбрать фото</div>')+'</div>'+
        (c.cap?'<figcaption data-e="cap" data-f="cap">'+tx(c.cap)+'</figcaption>':'')+'</figure>' };
  }
};

BLOCKS.gallery = { name:"Галерея", glyph:"camera", group:"media", desc:"сетка фото",
  variants:[["g2","2 в ряд"],["g3","3 в ряд"],["wide","первое большое"]],
  fields:[],
  list:{ label:"Фото", one:"Фото", add:"Добавить фото", item:{src:""}, photos:true, fields:[ {id:"src",type:"img",label:"Фото",max:1200} ],
    def:[{src:""},{src:""},{src:""},{src:""}] },
  gen:function(c,b){
    var n=b.v==="g3"?3:2;
    return { els:{"i*":"img"},
      css:".b-gallery .gg{display:grid;grid-template-columns:repeat("+n+",1fr);gap:10px}\n.b-gallery .gi{aspect-ratio:1;border-radius:calc(var(--r)*.7);overflow:hidden;background:var(--sf);display:grid;place-items:center;color:var(--mu);font-size:13px}\n"+
        ".b-gallery .gi img{width:100%;height:100%;object-fit:cover;display:block}\n.b-gallery.v-wide .gi:first-child{grid-column:1/-1;aspect-ratio:16/10}",
      html:'<div class="gg">'+c.L.map(function(it,i){ return '<div class="gi" data-e="i'+i+'" data-k="i">'+(it.src?'<img src="'+esc(it.src)+'" alt="" loading="lazy">':'фото')+'</div>'; }).join("")+'</div>' };
  }
};

BLOCKS.video = { name:"Видео", glyph:"play", group:"media", desc:"ролик с YouTube",
  variants:[["normal","обычное"]],
  fields:[ {id:"url",type:"text",label:"Ссылка на видео YouTube",def:""} ],
  gen:function(c){
    var m=String(c.url||"").match(/(?:youtu\.be\/|v=|embed\/|shorts\/)([\w-]{11})/);
    return { els:{v:"img"},
      css:".b-video .vv{aspect-ratio:16/9;border-radius:var(--r);overflow:hidden;background:var(--sf);display:grid;place-items:center;color:var(--mu)}\n.b-video iframe{width:100%;height:100%;border:0;display:block}",
      html:'<div class="vv" data-e="v">'+(m?'<iframe src="https://www.youtube-nocookie.com/embed/'+m[1]+'" title="Видео" allow="accelerometer; encrypted-media; picture-in-picture" allowfullscreen loading="lazy"></iframe>':'вставьте ссылку на видео в настройках')+'</div>' };
  }
};

BLOCKS.countdown = { name:"Отсчёт до даты", glyph:"clock", group:"event", desc:"дни и часы до события",
  variants:[["cells","ячейки"],["line","одной строкой"]],
  fields:[ {id:"title",type:"text",label:"Подпись",def:"До события осталось"}, {id:"date",type:"date",label:"Дата",def:"2026-12-31"},
    {id:"time",type:"time",label:"Время",def:"18:00"}, {id:"done",type:"text",label:"Когда время пришло",def:"Уже началось!"} ],
  gen:function(c,b){
    var id="cd-"+b.uid, when=(c.date||"2026-12-31")+"T"+(c.time||"00:00")+":00";
    return { els:{title:"text",nums:"wrap"},
      css:".b-countdown{text-align:center}\n.b-countdown .t{color:var(--mu);margin-bottom:12px;font-size:calc(15px * var(--fs,1))}\n"+
        ".b-countdown .g{display:flex;justify-content:center;gap:10px;flex-wrap:wrap}\n.b-countdown .c{min-width:74px;padding:14px 8px;border-radius:var(--r);background:var(--sf)}\n"+
        ".b-countdown b{display:block;font-family:var(--fh);font-size:calc(34px * var(--fs,1));color:var(--ac);font-variant-numeric:tabular-nums;line-height:1.1}\n.b-countdown small{color:var(--mu);font-size:12px}\n"+
        ".b-countdown.v-line .c{background:none;min-width:0;padding:0 6px}",
      html:'<div class="t" data-e="title" data-f="title">'+tx(c.title)+'</div><div class="g" id="'+id+'" data-e="nums">'+
        ['дней','часов','минут','секунд'].map(function(l){ return '<div class="c"><b>0</b><small>'+l+'</small></div>'; }).join("")+'</div>',
      js:"/* отсчёт: каждую секунду пересчитывает, сколько осталось до "+when+" по времени посетителя */\n"+
        "(function(){ var box=document.getElementById('"+id+"'); if(!box) return; var end=new Date('"+when+"').getTime(), b=box.querySelectorAll('b');\n"+
        "  function tick(){ var s=Math.max(0,Math.floor((end-Date.now())/1000));\n"+
        "    if(!s){ box.textContent="+JSON.stringify(String(c.done||"")).replace(/</g,"\\u003c")+"; return; }\n"+
        "    [Math.floor(s/86400),Math.floor(s%86400/3600),Math.floor(s%3600/60),s%60].forEach(function(v,i){ b[i].textContent=v; });\n"+
        "    setTimeout(tick,1000); }\n  tick(); })();" };
  }
};

/* событие: дата, место и две кнопки календаря. Работает без JavaScript: файл .ics собирается прямо в ссылке */
function icsDate(d,t,addH){ var x=new Date((d||"2026-12-31")+"T"+(t||"00:00")+":00"); x.setHours(x.getHours()+(addH||0));
  function p(n){return (n<10?"0":"")+n;} return x.getFullYear()+p(x.getMonth()+1)+p(x.getDate())+"T"+p(x.getHours())+p(x.getMinutes())+"00"; }
BLOCKS.event = { name:"Событие", glyph:"cal", group:"event", desc:"дата, место, «в календарь»",
  variants:[["card","карточка"],["plain","без фона"]],
  fields:[ {id:"title",type:"text",label:"Название",def:"День рождения"}, {id:"date",type:"date",label:"Дата",def:"2026-12-31"},
    {id:"time",type:"time",label:"Начало",def:"18:00"}, {id:"dur",type:"num",label:"Сколько часов",def:4},
    {id:"place",type:"text",label:"Место",def:"ул. Пётрковская 100, Лодзь"} ],
  gen:function(c,b){
    var s=icsDate(c.date,c.time,0), e=icsDate(c.date,c.time,Number(c.dur)||2);
    var ics="BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//FORGE//RU\r\nBEGIN:VEVENT\r\nUID:"+b.uid+"-"+s+"@forge\r\nDTSTAMP:"+s+"\r\nDTSTART:"+s+"\r\nDTEND:"+e+"\r\nSUMMARY:"+String(c.title||"").replace(/[\r\n]/g," ")+"\r\nLOCATION:"+String(c.place||"").replace(/[\r\n]/g," ")+"\r\nEND:VEVENT\r\nEND:VCALENDAR";
    var g="https://calendar.google.com/calendar/render?action=TEMPLATE&text="+encodeURIComponent(c.title||"")+"&dates="+s+"/"+e+"&location="+encodeURIComponent(c.place||"");
    var d=new Date((c.date||"2026-12-31")+"T00:00:00"), mon=["января","февраля","марта","апреля","мая","июня","июля","августа","сентября","октября","ноября","декабря"][d.getMonth()];
    var wd=["воскресенье","понедельник","вторник","среда","четверг","пятница","суббота"][d.getDay()];
    return { els:{title:"text",when:"text",place:"text",cal:"box",gcal:"box"},
      css:".b-event .ev{display:flex;flex-direction:column;align-items:center;gap:8px;text-align:center}\n.b-event.v-card .ev{background:var(--sf);border-radius:calc(var(--r)*1.2);padding:26px 20px}\n"+
        ".b-event h3{font-family:var(--fh);font-size:calc(24px * var(--fs,1));margin:0}\n.b-event .w{font-size:calc(19px * var(--fs,1));font-weight:700;color:var(--ac)}\n"+
        ".b-event .pl{color:var(--mu);display:flex;gap:6px;align-items:center}\n.b-event .pl .ic{width:16px;height:16px}\n.b-event .bb{display:flex;gap:10px;flex-wrap:wrap;justify-content:center;margin-top:10px}",
      html:'<div class="ev"><h3 data-e="title" data-f="title">'+tx(c.title)+'</h3><div class="w" data-e="when">'+d.getDate()+' '+mon+', '+wd+', '+esc(c.time)+'</div>'+
        (c.place?'<div class="pl" data-e="place">'+icon("pin")+'<span data-f="place">'+tx(c.place)+'</span></div>':'')+
        '<div class="bb"><a class="btn main" data-e="cal" href="data:text/calendar;charset=utf-8,'+encodeURIComponent(ics)+'" download="event.ics">'+icon("cal")+'<span>В календарь</span></a>'+
        '<a class="btn" data-e="gcal" href="'+esc(g)+'" target="_blank" rel="noopener"><span>Google Календарь</span></a></div></div>' };
  }
};

BLOCKS.map = { name:"Карта", glyph:"pin", group:"event", desc:"место на карте по адресу",
  variants:[["normal","обычная"],["tall","высокая"]],
  fields:[ {id:"q",type:"text",label:"Адрес или название места",def:"Piotrkowska 100, Łódź"} ],
  gen:function(c,b){
    return { els:{m:"img"},
      css:".b-map .mm{border-radius:var(--r);overflow:hidden;aspect-ratio:16/10;background:var(--sf)}\n.b-map.v-tall .mm{aspect-ratio:4/5}\n.b-map iframe{width:100%;height:100%;border:0;display:block}",
      html:'<div class="mm" data-e="m"><iframe title="Карта" loading="lazy" src="https://maps.google.com/maps?q='+encodeURIComponent(c.q||"")+'&z=15&output=embed"></iframe></div>' };
  }
};

BLOCKS.schedule = { name:"Расписание", glyph:"clock", group:"event", desc:"программа по времени",
  variants:[["line","линией"],["cards","карточками"]],
  fields:[ {id:"title",type:"text",label:"Заголовок",def:"Программа"} ],
  list:{ label:"Пункты", one:"Пункт", add:"Добавить пункт", item:{tm:"20:00",t:"Новый пункт",s:""},
    fields:[ {id:"tm",type:"text",label:"Время"}, {id:"t",type:"text",label:"Что происходит"}, {id:"s",type:"text",label:"Подробнее"} ],
    def:[ {tm:"17:30",t:"Сбор гостей",s:"встречаем у входа"}, {tm:"18:00",t:"Начало",s:""}, {tm:"20:00",t:"Торт и подарки",s:""}, {tm:"22:00",t:"Танцы",s:"до последнего гостя"} ] },
  gen:function(c,b){
    return { els:{title:"text","i*":"wrap"},
      css:".b-schedule h3{font-family:var(--fh);font-size:calc(24px * var(--fs,1));margin:0 0 14px;text-align:center}\n"+
        ".b-schedule .r{display:grid;grid-template-columns:70px 1fr;gap:14px;padding:12px 0;border-bottom:1px solid color-mix(in srgb,var(--tx) 14%,transparent);text-align:left}\n"+
        ".b-schedule .r b{color:var(--ac);font-variant-numeric:tabular-nums}\n.b-schedule .r small{display:block;color:var(--mu);margin-top:2px}\n"+
        ".b-schedule.v-cards .r{background:var(--sf);border:0;border-radius:var(--r);padding:14px 16px;margin-bottom:8px}",
      html:'<h3 data-e="title" data-f="title">'+tx(c.title)+'</h3>'+c.L.map(function(it,i){
        return '<div class="r" data-e="i'+i+'" data-k="i"><b data-f="L.'+i+'.tm">'+tx(it.tm)+'</b><div><span data-f="L.'+i+'.t">'+tx(it.t)+'</span>'+(it.s?'<small data-f="L.'+i+'.s">'+tx(it.s)+'</small>':'')+'</div></div>'; }).join("") };
  }
};

BLOCKS.menu = { name:"Меню и цены", glyph:"coffee", group:"biz", desc:"кафе, услуги, прайс",
  variants:[["dots","с точками"],["cards","карточками"]],
  fields:[ {id:"title",type:"text",label:"Заголовок",def:"Меню"}, {id:"cur",type:"text",label:"Валюта",def:"zł"} ],
  list:{ label:"Позиции", one:"Позиция", add:"Добавить позицию", item:{t:"Новая позиция",s:"",p:"10"},
    fields:[ {id:"t",type:"text",label:"Название"}, {id:"s",type:"text",label:"Описание"}, {id:"p",type:"text",label:"Цена"} ],
    def:[ {t:"Капучино",s:"250 мл",p:"12"}, {t:"Флэт уайт",s:"двойной эспрессо",p:"14"}, {t:"Сырники",s:"со сметаной и ягодами",p:"22"}, {t:"Лимонад",s:"мята, лайм",p:"13"} ] },
  gen:function(c,b){
    return { els:{title:"text","i*":"wrap"},
      css:".b-menu h3{font-family:var(--fh);font-size:calc(26px * var(--fs,1));margin:0 0 12px;text-align:center}\n"+
        ".b-menu .r{display:flex;align-items:baseline;gap:8px;padding:10px 0;text-align:left}\n.b-menu .r .n{font-weight:700}\n"+
        ".b-menu .r .d{flex:1;border-bottom:2px dotted color-mix(in srgb,var(--tx) 30%,transparent);transform:translateY(-4px);min-width:20px}\n.b-menu .r .p{font-weight:800;color:var(--ac);white-space:nowrap}\n"+
        ".b-menu .r small{display:block;color:var(--mu);font-weight:400;font-size:13px}\n.b-menu.v-cards .r{background:var(--sf);border-radius:var(--r);padding:14px 16px;margin-bottom:8px}\n.b-menu.v-cards .r .d{border:0}",
      html:'<h3 data-e="title" data-f="title">'+tx(c.title)+'</h3>'+c.L.map(function(it,i){
        return '<div class="r" data-e="i'+i+'" data-k="i"><div class="n"><span data-f="L.'+i+'.t">'+tx(it.t)+'</span>'+(it.s?'<small data-f="L.'+i+'.s">'+tx(it.s)+'</small>':'')+'</div><span class="d"></span><span class="p"><span data-f="L.'+i+'.p">'+tx(it.p)+'</span> '+esc(c.cur)+'</span></div>'; }).join("") };
  }
};

BLOCKS.features = { name:"Преимущества", glyph:"check", group:"biz", desc:"пункты с иконками",
  variants:[["cols","колонками"],["list","списком"]],
  fields:[],
  list:{ label:"Пункты", one:"Пункт", add:"Добавить пункт", item:{i:"check",t:"Ещё один плюс",s:"Короткое пояснение."},
    fields:[ {id:"i",type:"icon",label:"Иконка"}, {id:"t",type:"text",label:"Заголовок"}, {id:"s",type:"area",label:"Текст"} ],
    def:[ {i:"clock",t:"Быстро",s:"Отвечаю в течение часа и делаю в срок."}, {i:"heart",t:"С душой",s:"Каждый заказ как для себя."}, {i:"star",t:"Опыт",s:"Больше 200 довольных клиентов."} ] },
  gen:function(c,b){
    return { els:{"i*":"wrap"},
      css:".b-features .fs{display:grid;grid-template-columns:1fr;gap:14px}\n@container page (min-width:640px){ .b-features.v-cols .fs{grid-template-columns:repeat(auto-fit,minmax(180px,1fr))} }\n"+
        ".b-features .f{background:var(--sf);border-radius:var(--r);padding:20px;text-align:left}\n.b-features .f .ic{width:26px;height:26px;color:var(--ac);margin-bottom:10px}\n"+
        ".b-features .f b{display:block;font-family:var(--fh);font-size:18px;margin-bottom:6px}\n.b-features .f p{margin:0;color:var(--mu);line-height:1.55;font-size:15px}\n"+
        ".b-features.v-list .f{display:grid;grid-template-columns:30px 1fr;gap:4px 12px}\n.b-features.v-list .f .ic{grid-row:span 2;margin:0}",
      html:'<div class="fs">'+c.L.map(function(it,i){
        return '<div class="f" data-e="i'+i+'" data-k="i">'+icon(it.i||"check")+'<b data-f="L.'+i+'.t">'+tx(it.t)+'</b><p data-f="L.'+i+'.s">'+tx(it.s)+'</p></div>'; }).join("")+'</div>' };
  }
};

BLOCKS.stats = { name:"Цифры", glyph:"spark", group:"biz", desc:"крупные числа",
  variants:[["row","в ряд"]],
  fields:[],
  list:{ label:"Числа", one:"Число", add:"Добавить число", item:{n:"100",l:"подпись"},
    fields:[ {id:"n",type:"text",label:"Число"}, {id:"l",type:"text",label:"Подпись"} ],
    def:[ {n:"8 лет",l:"в профессии"}, {n:"200+",l:"клиентов"}, {n:"4,9",l:"средняя оценка"} ] },
  gen:function(c){
    return { els:{"i*":"wrap"},
      css:".b-stats .ss{display:flex;justify-content:center;gap:12px;flex-wrap:wrap}\n.b-stats .s{flex:1;min-width:120px;text-align:center;padding:16px 8px}\n"+
        ".b-stats .s b{display:block;font-family:var(--fh);font-size:calc(34px * var(--fs,1));color:var(--ac);line-height:1.1}\n.b-stats .s span{color:var(--mu);font-size:14px}",
      html:'<div class="ss">'+c.L.map(function(it,i){ return '<div class="s" data-e="i'+i+'" data-k="i"><b data-f="L.'+i+'.n">'+tx(it.n)+'</b><span data-f="L.'+i+'.l">'+tx(it.l)+'</span></div>'; }).join("")+'</div>' };
  }
};

BLOCKS.faq = { name:"Вопросы и ответы", glyph:"chat", group:"biz", desc:"раскрываются по нажатию",
  variants:[["normal","обычные"]],
  fields:[ {id:"title",type:"text",label:"Заголовок",def:"Частые вопросы"} ],
  list:{ label:"Вопросы", one:"Вопрос", add:"Добавить вопрос", item:{q:"Новый вопрос?",a:"Ответ."},
    fields:[ {id:"q",type:"text",label:"Вопрос"}, {id:"a",type:"area",label:"Ответ"} ],
    def:[ {q:"Сколько это стоит?",a:"Цены выше, в меню. Если нужно что-то особенное, напишите."}, {q:"Как записаться?",a:"Нажмите «Написать» и предложите удобное время."} ] },
  gen:function(c){
    return { els:{title:"text","i*":"wrap"},
      css:".b-faq h3{font-family:var(--fh);font-size:calc(26px * var(--fs,1));margin:0 0 12px;text-align:center}\n"+
        ".b-faq details{background:var(--sf);border-radius:var(--r);padding:4px 16px;margin-bottom:8px;text-align:left}\n"+
        ".b-faq summary{cursor:pointer;padding:12px 0;font-weight:700;list-style:none;display:flex;justify-content:space-between;gap:10px}\n.b-faq summary::after{content:'+';color:var(--ac);font-weight:800}\n"+
        ".b-faq details[open] summary::after{content:'-'}\n.b-faq summary::-webkit-details-marker{display:none}\n.b-faq details p{margin:0 0 14px;color:var(--mu);line-height:1.6}",
      html:'<h3 data-e="title" data-f="title">'+tx(c.title)+'</h3>'+c.L.map(function(it,i){
        return '<details data-e="i'+i+'" data-k="i"><summary data-f="L.'+i+'.q">'+tx(it.q)+'</summary><p data-f="L.'+i+'.a">'+tx(it.a)+'</p></details>'; }).join("") };
  }
};

BLOCKS.quote = { name:"Цитата или отзыв", glyph:"heart", group:"text", desc:"слова в кавычках",
  variants:[["big","крупно"],["card","карточкой"]],
  fields:[ {id:"text",type:"area",label:"Текст",def:"Всё прошло идеально, гости до сих пор вспоминают."}, {id:"who",type:"text",label:"Кто сказал",def:"Анна, клиентка"} ],
  gen:function(c,b){
    return { els:{q:"text",who:"text"},
      css:".b-quote figure{margin:0;text-align:center}\n.b-quote blockquote{margin:0;font-family:var(--fh);font-size:calc(24px * var(--fs,1));line-height:1.4}\n"+
        ".b-quote blockquote::before{content:'«';color:var(--ac)}\n.b-quote blockquote::after{content:'»';color:var(--ac)}\n.b-quote figcaption{margin-top:12px;color:var(--mu)}\n"+
        ".b-quote.v-card figure{background:var(--sf);border-radius:var(--r);padding:24px}\n.b-quote.v-card blockquote{font-size:calc(19px * var(--fs,1))}",
      html:'<figure><blockquote data-e="q" data-f="text">'+tx(c.text)+'</blockquote>'+(c.who?'<figcaption data-e="who" data-f="who">'+tx(c.who)+'</figcaption>':'')+'</figure>' };
  }
};

BLOCKS.vcard = { name:"Сохранить контакт", glyph:"user", group:"btn", desc:"контакт в телефонную книгу",
  variants:[["main","главная кнопка"],["second","обычная"]],
  fields:[ {id:"btn",type:"text",label:"Надпись",def:"Сохранить контакт"}, {id:"name",type:"text",label:"Имя",def:"Ваше имя"},
    {id:"phone",type:"text",label:"Телефон",def:""}, {id:"mail",type:"text",label:"Почта",def:""}, {id:"org",type:"text",label:"Где работаете",def:""}, {id:"url",type:"text",label:"Сайт",def:""} ],
  gen:function(c,b){
    var v="BEGIN:VCARD\r\nVERSION:3.0\r\nFN:"+(c.name||"")+"\r\nN:"+(c.name||"")+";;;;\r\n"+(c.phone?"TEL;TYPE=CELL:"+digits(c.phone)+"\r\n":"")+
      (c.mail?"EMAIL:"+c.mail+"\r\n":"")+(c.org?"ORG:"+c.org+"\r\n":"")+(c.url?"URL:"+c.url+"\r\n":"")+"END:VCARD";
    return { els:{btn:"box"}, css:".b-vcard{display:flex;justify-content:center}",
      html:'<a class="btn'+(b.v==="second"?"":" main")+'" data-e="btn" href="data:text/vcard;charset=utf-8,'+encodeURIComponent(v)+'" download="contact.vcf">'+icon("user")+'<span data-f="btn">'+tx(c.btn)+'</span></a>' };
  }
};

BLOCKS.form = { name:"Форма письма", glyph:"mail", group:"btn", desc:"письмо вам на почту",
  variants:[["card","карточка"],["plain","без фона"]],
  fields:[ {id:"title",type:"text",label:"Заголовок",def:"Напишите мне"}, {id:"to",type:"text",label:"Куда приходят письма (ваша почта)",def:""},
    {id:"btn",type:"text",label:"Кнопка",def:"Отправить"} ],
  gen:function(c,b){
    var id="fm-"+b.uid;
    return { els:{title:"text",btn:"box"},
      css:".b-form form{display:flex;flex-direction:column;gap:10px;text-align:left}\n.b-form.v-card form{background:var(--sf);border-radius:calc(var(--r)*1.2);padding:22px}\n"+
        ".b-form h3{font-family:var(--fh);font-size:calc(22px * var(--fs,1));margin:0 0 4px;text-align:center}\n"+
        ".b-form input,.b-form textarea{font:inherit;color:var(--tx);background:color-mix(in srgb,var(--bg) 70%,transparent);border:1px solid color-mix(in srgb,var(--tx) 22%,transparent);border-radius:calc(var(--r)*.7);padding:12px 14px}\n"+
        ".b-form textarea{min-height:110px;resize:vertical}\n.b-form .btn{width:100%}\n.b-form .ok{color:var(--mu);font-size:14px;text-align:center;min-height:1em}",
      html:'<form id="'+id+'"><h3 data-e="title" data-f="title">'+tx(c.title)+'</h3><input name="fname" placeholder="Ваше имя" required>'+
        '<input name="fmail" type="email" placeholder="Ваша почта"><textarea name="fmsg" placeholder="Сообщение" required></textarea>'+
        '<button class="btn main" data-e="btn" data-f="btn" type="submit">'+tx(c.btn)+'</button><div class="ok"></div></form>',
      js:"/* форма: собирает письмо и открывает почту посетителя, сервер не нужен */\n"+
        "(function(){ var f=document.getElementById('"+id+"'); if(!f) return; var to="+JSON.stringify(String(c.to||"")).replace(/</g,"\\u003c")+";\n"+
        "  f.addEventListener('submit',function(e){ e.preventDefault(); var el=f.elements;\n"+
        "    if(!to){ f.querySelector('.ok').textContent='Адрес почты для писем ещё не указан.'; return; }\n"+
        "    var body='Имя: '+el.fname.value+'\\nПочта: '+el.fmail.value+'\\n\\n'+el.fmsg.value;\n"+
        "    location.href='mailto:'+to+'?subject='+encodeURIComponent('Письмо со страницы')+'&body='+encodeURIComponent(body);\n"+
        "    f.querySelector('.ok').textContent='Открылась почта: письмо заполнено, осталось отправить.'; }); })();" };
  }
};

BLOCKS.spacer = { name:"Отступ или линия", glyph:"arrow", group:"text", desc:"пустое место между блоками",
  variants:[["space","пустое место"],["line","линия"],["dots","точки"]],
  fields:[ {id:"h",type:"num",label:"Высота, px",def:32} ],
  gen:function(c,b){
    return { els:{},
      css:".b-spacer .sp{display:flex;align-items:center;justify-content:center}\n.b-spacer.v-line .sp::before{content:'';width:60%;height:1px;background:var(--mu);opacity:.5}\n"+
        ".b-spacer.v-dots .sp::before{content:'· · ·';color:var(--ac);letter-spacing:.4em;font-size:22px}",
      html:'<div class="sp" style="height:'+(Number(c.h)||0)+'px"></div>' };
  }
};

BLOCKS.footer = { name:"Подвал", glyph:"home", group:"text", desc:"строка в самом низу",
  variants:[["normal","обычный"]],
  fields:[ {id:"text",type:"text",label:"Текст",def:"© 2026"} ],
  gen:function(c){ return { els:{t:"text"}, css:".b-footer{text-align:center;color:var(--mu);font-size:14px;padding-top:12px}",
    html:'<div data-e="t" data-f="text">'+tx(c.text)+'</div>' }; }
};

BLOCKS.code = { name:"Свой код", glyph:"brush", group:"code", desc:"HTML, CSS и JS руками",
  variants:[["normal","обычный"]],
  fields:[ {id:"html",type:"code",label:"HTML",def:"<p class=\"hello\">Привет! Этот блок написан руками.</p>"},
    {id:"css",type:"code",label:"CSS",def:".hello{ text-align:center; font-size:20px; }"},
    {id:"js",type:"code",label:"JavaScript",def:"// код выполнится после загрузки страницы\n"} ],
  gen:function(c,b){ var js=String(c.js||"").trim();
    return { els:{}, css:String(c.css||""), html:String(c.html||""),
      js: js && !/^\/\/[^\n]*$/.test(js) ? "/* свой код блока "+b.uid+" */\n(function(){\n"+js.replace(/<\/script/gi,"<\\/script")+"\n})();" : "" }; }
};

/* группы для каталога «Добавить» */
var GROUPS = [ ["text","Текст"], ["btn","Кнопки и связь"], ["media","Фото и видео"], ["event","События"], ["biz","Дело"], ["code","Код"] ];

/* ─────────── проект ─────────── */
function newBlock(type, uid){
  var B=BLOCKS[type], c={};
  (B.fields||[]).forEach(function(f){ c[f.id]= f.def!==undefined ? f.def : (f.type==="action"?{t:"link",v:""}:""); });
  if(B.list) c.L=clone(B.list.def);
  return { uid:uid, type:type, v:B.variants[0][0], c:c, e:{}, o:{ pad:"m", align:"center", card:false } };
}
function blankPage(){
  return { v:2, title:"Моя страница", theme:"sunset", t:{}, bg:{ mode:"theme", color:"#101318", c1:"#1a1030", c2:"#46203f", ang:160, img:"", fit:"cover", fixed:true, dark:30, blur:0, fx:50, fy:50 },
    page:{ w:"narrow", gap:"m" }, blocks:[], seq:0 };
}
function themeOf(st){ var T=clone(THEMES[st.theme]||THEMES.sunset); var o=st.t||{}; for(var k in o) if(o[k]!=null && o[k]!=="") T[k]=o[k]; return T; }
function nextUid(st){ return "b"+(++st.seq); }
function fixPage(st){
  var d=blankPage(); for(var k in d) if(st[k]==null) st[k]=d[k];
  for(var k2 in d.bg) if(st.bg[k2]==null) st.bg[k2]=d.bg[k2];
  st.blocks=(st.blocks||[]).filter(function(b){ return BLOCKS[b.type]; });
  st.blocks.forEach(function(b){ var n=newBlock(b.type,b.uid); for(var k in n) if(b[k]==null) b[k]=n[k];
    for(var f in n.c) if(b.c[f]===undefined) b.c[f]=n.c[f];
    var m=+String(b.uid).slice(1); if(m>st.seq) st.seq=m; });
  return st;
}

/* ─────────── сборка CSS для правок элементов ─────────── */
function elRule(sel, o, kind){
  var r=[];
  if(o.hide) r.push("display:none");
  if(o.x||o.y) r.push("translate:calc("+(o.x||0)+" * 1cqw) calc("+(o.y||0)+" * 1cqw)","position:relative","z-index:2");
  if(o.w){ if(kind==="round") r.push("width:"+o.w+"cqw","height:"+o.w+"cqw","flex:none");
           else r.push("width:"+o.w+"cqw","max-width:none","flex:none","align-self:center","margin-inline:auto"); }
  if(o.fs) r.push("--fs:"+o.fs);
  if(o.bg) r.push("background:"+o.bg, kind==="box"?"border-color:"+o.bg:"");
  if(o.fg) r.push("color:"+o.fg);
  if(o.bd) r.push("border:2px solid "+o.bd);
  if(o.r!=null && o.r!=="") r.push("border-radius:"+o.r+"px", kind==="round"||kind==="img"?"overflow:hidden":"");
  if(o.al) r.push("text-align:"+o.al);
  r=r.filter(Boolean);
  var css=r.length ? sel+"{ "+r.join("; ")+" }" : "";
  if(o.dx!=null||o.dy!=null||o.dw){
    var d=[]; var dx=o.dx!=null?o.dx:(o.x||0), dy=o.dy!=null?o.dy:(o.y||0);
    d.push("translate:calc("+dx+" * 1cqw) calc("+dy+" * 1cqw)","position:relative","z-index:2");
    if(o.dw){ if(kind==="round") d.push("width:"+o.dw+"cqw","height:"+o.dw+"cqw"); else d.push("width:"+o.dw+"cqw","max-width:none","margin-inline:auto"); }
    css+=(css?"\n":"")+"@media (min-width:900px){ "+sel+"{ "+d.join("; ")+" } }";
  }
  return css;
}
function blockElCss(b, els){
  var out=[], E=b.e||{};
  Object.keys(E).forEach(function(k){
    var o=E[k]; if(!o) return;
    var base = /^i\d+$/.test(k) ? "i*" : k, kind=els[base]||els[k]||"text";
    var sel = k==="i*" ? "#b-"+b.uid+" [data-k=\"i\"]" : "#b-"+b.uid+" [data-e=\""+k+"\"]";
    var css=elRule(sel,o,kind); if(css) out.push(css);
  });
  return out.join("\n");
}
function overridesCss(st){
  return st.blocks.map(function(b){ var g=BLOCKS[b.type].gen(b.c,b,{}); return blockElCss(b,g.els||{}); }).filter(Boolean).join("\n");
}

/* ─────────── сборка страницы ───────────
   mode: "file" (готовый файл), "edit" (превью редактора), "code" (с метками блоков для вкладки «Код»)
   opt.parts: вернуть { html, css, js, fonts } по отдельности (для «Скачать папкой») */
var MB="\uE010", MM="\uE011", ME="\uE012";
function mark(uid,s){ return MB+uid+MM+s+ME; }
function stripMarks(s){ return s.replace(new RegExp(MB+".*?"+MM,"g"),"").replace(new RegExp(ME,"g"),""); }

function baseCss(st,T){
  var b=st.bg, bgCss;
  if(b.mode==="color") bgCss=b.color;
  else if(b.mode==="grad") bgCss="linear-gradient("+b.ang+"deg, "+b.c1+", "+b.c2+")";
  else bgCss="linear-gradient(165deg, "+T.bg+", "+T.bg2+")";
  var fit={ cover:"center/cover no-repeat", contain:"center/contain no-repeat", repeat:"0 0/auto repeat", auto:"center/auto no-repeat" }[b.fit]||"center/cover no-repeat";
  if(b.fit==="cover"||b.fit==="contain") fit=b.fx+"% "+b.fy+"%/"+b.fit+" no-repeat";
  var btn={
    fill:".btn{ background:var(--sf); color:var(--tx); border:1px solid color-mix(in srgb,var(--tx) 14%,transparent); }\n.btn.main{ background:var(--ac); color:var(--on); border-color:var(--ac); box-shadow:0 10px 28px -12px var(--ac); }",
    glass:".btn{ background:rgba(255,255,255,.13); color:var(--tx); border:1px solid rgba(255,255,255,.28); backdrop-filter:blur(8px); -webkit-backdrop-filter:blur(8px); }\n.btn.main{ background:var(--ac); color:var(--on); border-color:var(--ac); box-shadow:0 10px 30px -10px var(--ac); }",
    outline:".btn{ background:transparent; color:var(--tx); border:2px solid color-mix(in srgb,var(--tx) 40%,transparent); }\n.btn.main{ border-color:var(--ac); color:var(--ac); box-shadow:0 0 22px -8px var(--ac), inset 0 0 18px -10px var(--ac); }",
    soft:".btn{ background:var(--sf); color:var(--tx); border:1px solid transparent; }\n.btn.main{ background:color-mix(in srgb,var(--ac) 22%,transparent); color:var(--tx); border-color:color-mix(in srgb,var(--ac) 55%,transparent); }"
  }[T.btn]||"";
  var css=
"/* ═══ тема «"+T.name+"»: поменяйте переменные, и перекрасится вся страница ═══ */\n"+
":root{\n  --bg:"+T.bg+"; --bg2:"+T.bg2+"; --sf:"+T.sf+"; --tx:"+T.tx+"; --mu:"+T.mu+";\n  --ac:"+T.ac+"; --ac2:"+T.ac2+"; --on:"+T.on+"; --r:"+T.r+"px;\n"+
"  --fh:"+fontStack(T.fh)+";\n  --fb:"+fontStack(T.fb)+";\n}\n"+
"*{ box-sizing:border-box; }\nhtml{ -webkit-text-size-adjust:100%; }\n"+
"body{ margin:0; min-height:100vh; color:var(--tx); font-family:var(--fb); line-height:1.5; background:"+bgCss+"; background-attachment:fixed; position:relative; }\n"+
(b.mode==="photo"&&b.img ?
"/* фон: своё фото. Отдельным слоем, чтобы на телефонах он тоже стоял на месте */\n"+
".pbg{ position:"+(b.fixed?"fixed":"absolute")+"; inset:0; z-index:-1; background:url("+(b.img.indexOf("data:")===0?"\uE020":b.img)+") "+fit+"; background-color:var(--bg);"+(b.blur?" filter:blur("+b.blur+"px); inset:-"+(b.blur*2)+"px;":"")+" }\n"+
".pbg::after{ content:''; position:absolute; inset:0; background:rgba(0,0,0,"+(b.dark/100)+"); }\n" : "")+
".page{ container:page / inline-size; max-width:"+(PAGE_W[st.page.w]||760)+"px; margin:0 auto; padding:48px 20px 64px; display:flex; flex-direction:column; gap:"+(GAPS[st.page.gap]||26)+"px; }\n"+
".blk{ container-type:inline-size; position:relative; }\n.blk.al-left{ text-align:left; }\n.blk.al-left .b-profile,.blk.al-left .b-hero .tx,.blk.al-left .b-countdown .g{ align-items:flex-start; justify-content:flex-start; }\n"+
".blk.pad-s{ padding-block:0; }\n.blk.pad-l{ padding-block:28px; }\n.blk.card{ background:var(--sf); border-radius:calc(var(--r)*1.3); padding:26px 20px; }\n"+
"h1,h2,h3{ font-family:var(--fh); }\n"+
"a{ color:var(--ac); }\n.ic{ width:20px; height:20px; fill:none; stroke:currentColor; stroke-width:1.8; stroke-linecap:round; stroke-linejoin:round; flex:none; }\n"+
"/* кнопки: общий вид для всех кнопок страницы */\n"+
".btn{ display:inline-flex; align-items:center; justify-content:center; gap:10px; padding:15px 22px; border-radius:var(--r); font:inherit; font-weight:700; font-size:calc(16px * var(--fs,1)); text-decoration:none; cursor:pointer; transition:transform .15s, filter .15s; text-align:center; line-height:1.25; }\n"+
".btn:hover{ transform:translateY(-2px); filter:brightness(1.07); }\n.btn small{ display:block; font-weight:500; font-size:12.5px; opacity:.75; margin-top:2px; }\n"+btn;
  return css;
}

function buildPage(st, mode, opt){
  opt=opt||{}; var T=themeOf(st), edit=mode==="edit", marks=mode==="code";
  var cssParts=[baseCss(st,T)], htmlParts=[], jsParts=[], blockCss={}, needAct=false;
  st.blocks.forEach(function(b){
    var B=BLOCKS[b.type], g=B.gen(b.c,b,{edit:edit});
    var cls="blk b-"+b.type+" v-"+b.v+(b.o.align==="left"?" al-left":"")+(b.o.pad&&b.o.pad!=="m"?" pad-"+b.o.pad:"")+(b.o.card?" card":"")+(b.o.hidden?" hid":"");
    if(!blockCss[b.type]){ blockCss[b.type]=1; var c0="/* ── блок «"+B.name+"» ── */\n"+g.css; cssParts.push(marks?mark("t-"+b.type,c0):c0); }
    var ec=blockElCss(b,g.els||{}); if(ec){ ec="/* правки элементов: "+B.name+" ["+b.uid+"] */\n"+ec; if(!edit) cssParts.push(marks?mark(b.uid,ec):ec); }
    var h='<section class="'+cls+'" id="b-'+b.uid+'"'+(edit?' data-b="'+b.uid+'"':'')+(b.o.hidden&&!edit?' hidden':'')+'>'+g.html+'</section>';
    if(!edit) h="\n\n  <!-- ▼ "+B.name+" -->"+pretty(h.replace(/ data-f="[^"]*"/g,""),"  ");
    htmlParts.push(marks?mark(b.uid,h):h);
    if(g.js==="@act") needAct=true; else if(g.js) jsParts.push(marks?mark(b.uid,g.js):g.js);
  });
  if(needAct) jsParts.unshift(ACT_JS);
  if(edit) cssParts.push(".blk.hid{ opacity:.35; }");
  var fonts=fontLink([T.fh,T.fb]);
  var css=cssParts.join("\n\n"), body=htmlParts.join(""), js=jsParts.join("\n\n");
  var bgDiv=(st.bg.mode==="photo"&&st.bg.img)?'<div class="pbg" aria-hidden="true"></div>':'';
  var imgUrl=st.bg.img||"";
  if(opt.parts) return { css:css, html:body, js:js, fonts:fonts, bgDiv:bgDiv, bgImg:imgUrl, title:st.title };
  css=css.replace("\uE020", imgUrl);
  var head="<!DOCTYPE html>\n<html lang=\"ru\">\n<head>\n<meta charset=\"UTF-8\">\n<meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\n"+
    "<title>"+esc(st.title||"Моя страница")+"</title>\n"+(st.desc?"<meta name=\"description\" content=\""+esc(st.desc)+"\">\n":"")+
    (fonts?"<link rel=\"stylesheet\" href=\""+fonts+"\">\n":"");
  if(edit) return head+"<style>\n"+css+"\n</style>\n<style id=\"ov\">"+overridesCss(st)+"</style>\n</head>\n<body>"+bgDiv+"<main class=\"page\">"+body+"</main>\n"+
    (js?"<script>\n"+js+"\n<\/script>\n":"")+"<script>("+editRuntime.toString()+")("+JSON.stringify(opt.rt||{})+");<\/script>\n</body>\n</html>";
  return head+"<style>\n"+css+"\n</style>\n</head>\n<body>\n"+(bgDiv?"  "+bgDiv+"\n":"")+"<main class=\"page\">"+body+"\n</main>\n"+
    (js?"<script>\n"+js+"\n<\/script>\n":"")+"</body>\n</html>\n";
}

/* аккуратные отступы в HTML, чтобы код было удобно читать */
function pretty(h, pad){
  var BLK=/^(section|div|h1|h2|h3|p|figure|figcaption|details|summary|form|blockquote|a|button|textarea|iframe|input|nav)$/, VOID=/^(input|img|br)$/;
  var out="", d=0, prevClose=false, aStack=[];
  h.replace(/<(\/?)([a-zA-Z0-9]+)[^>]*>|[^<]+/g, function(m, sl, nm){
    if(!nm){ out+=m; prevClose=false; return m; }
    var n=nm.toLowerCase(), isB=BLK.test(n);
    if(n==="a"){ if(sl) isB=aStack.pop(); else { isB=/class="(btn|ci)/.test(m); aStack.push(isB); } }
    if(!isB){ out+=m; prevClose=false; return m; }
    if(sl){ d--; if(prevClose) out+="\n"+pad+new Array(d+1).join("  "); out+=m; prevClose=true; }
    else { out+="\n"+pad+new Array(d+1).join("  ")+m; if(!VOID.test(n)) d++; prevClose=VOID.test(n); }
    return m;
  });
  return out;
}

/* общий скрипт для кнопок «скопировать» и «показать / скрыть» */
var ACT_JS="/* действия кнопок: скопировать текст и показать или скрыть блок */\n"+
"document.addEventListener('click',function(e){\n"+
"  var a=e.target.closest('[data-copy],[data-toggle]'); if(!a) return; e.preventDefault();\n"+
"  if(a.hasAttribute('data-copy')){ var t=a.getAttribute('data-copy'), old=a.innerHTML;\n"+
"    (navigator.clipboard?navigator.clipboard.writeText(t):Promise.reject()).catch(function(){ var x=document.createElement('textarea'); x.value=t; document.body.appendChild(x); x.select(); document.execCommand('copy'); x.remove(); });\n"+
"    a.textContent='Скопировано'; setTimeout(function(){ a.innerHTML=old; },1500); }\n"+
"  else { var b=document.getElementById(a.getAttribute('data-toggle')); if(b){ b.hidden=!b.hidden; if(!b.hidden) b.scrollIntoView({behavior:'smooth',block:'center'}); } }\n"+
"});";

/* ─────────── то, что работает внутри превью в режиме правки ───────────
   Выделение, перетаскивание, ручки размера, плашка, правка текста на месте.
   Общается с редактором через postMessage. Функция вставляется в превью как текст. */
function editRuntime(R){
  var doc=document, sel=null, box=null, tb=null, guides=[], drag=null, editing=null;
  var st=doc.createElement("style");
  st.textContent=
   ".fx-box{position:absolute;z-index:9998;pointer-events:none;outline:2px solid #4fd6c8;outline-offset:3px;border-radius:4px}"+
   ".fx-box.bsel{outline-style:dashed;outline-color:rgba(79,214,200,.8)}"+
   ".fx-h{position:absolute;width:16px;height:16px;margin:-8px 0 0 -8px;border-radius:50%;background:#fff;border:2px solid #4fd6c8;pointer-events:auto;touch-action:none;box-shadow:0 1px 4px rgba(0,0,0,.4)}"+
   ".fx-h.s{width:10px;height:22px;margin:-11px 0 0 -5px;border-radius:4px}"+
   ".fx-mv{position:absolute;inset:-3px;pointer-events:auto;touch-action:none;cursor:move}"+
   ".fx-tb{position:absolute;z-index:9999;display:flex;gap:2px;background:#0c0f13;border:1px solid #313b46;border-radius:999px;padding:4px 6px;box-shadow:0 12px 30px -8px rgba(0,0,0,.7);font:600 13px system-ui,sans-serif;color:#c9d2da;white-space:nowrap}"+
   ".fx-tb button{all:unset;cursor:pointer;height:34px;min-width:34px;padding:0 7px;display:flex;align-items:center;justify-content:center;gap:5px;border-radius:999px;box-sizing:border-box}"+
   ".fx-tb button:hover{background:#232a33}.fx-tb i{width:1px;height:20px;background:#313b46;align-self:center;margin:0 2px}"+
   ".fx-tb .sw{width:20px;height:20px;border-radius:50%;box-shadow:0 0 0 2px #0c0f13,0 0 0 3px #59606a}"+
   ".fx-tb svg{width:17px;height:17px;fill:none;stroke:currentColor;stroke-width:1.9;stroke-linecap:round;stroke-linejoin:round}"+
   ".fx-g{position:absolute;z-index:9997;pointer-events:none;border:0 dashed #ff4fa3}.fx-g.v{border-left-width:1.5px;width:0}.fx-g.h{border-top-width:1.5px;height:0}"+
   ".fx-sz{position:absolute;z-index:9999;background:#4fd6c8;color:#05201c;font:700 11px ui-monospace,monospace;padding:3px 7px;border-radius:6px;pointer-events:none;white-space:nowrap}"+
   ".fx-gl{position:absolute;z-index:9999;background:#ff4fa3;color:#fff;font:600 10.5px ui-monospace,monospace;padding:2px 6px;border-radius:5px;pointer-events:none}"+
   "[contenteditable]{outline:2px dashed #ff9a4d!important;outline-offset:4px;cursor:text}"+
   "[data-e]{cursor:pointer}a,button,summary{cursor:pointer}";
  doc.head.appendChild(st);
  var layer=doc.createElement("div"); layer.style.cssText="position:absolute;left:0;top:0;width:0;height:0;z-index:9990";
  doc.body.appendChild(layer);
  function post(m){ parent.postMessage(Object.assign({forge:1},m),"*"); }
  function $b(uid){ return doc.getElementById("b-"+uid); }
  function elOf(s){ if(!s) return null; var b=$b(s.b); if(!b) return null; return s.e ? b.querySelector('[data-e="'+s.e+'"]') : b; }
  var SVG={ up:"M12 19V5M5 12l7-7 7 7", down:"M12 5v14M5 12l7 7 7-7", dup:"M8 8h12v12H8zM16 8V4H4v12h4", del:"M5 7h14M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3",
    more:"M5 12h.01M12 12h.01M19 12h.01", rad:"M4 20V10a6 6 0 016-6h10", par:"M4 4h16v16H4z", img:"M4 5h16v14H4zM4 15l5-5 4 4 3-3 4 4", txt:"M5 6h14M12 6v13" };
  function ic(n){ return '<svg viewBox="0 0 24 24"><path d="'+SVG[n]+'"/></svg>'; }

  function clear(){ layer.innerHTML=""; box=null; tb=null; }
  function draw(){
    clear(); if(editing) return; var el=elOf(sel); if(!el) return;
    var r=el.getBoundingClientRect(), sx=scrollX, sy=scrollY;
    box=doc.createElement("div"); box.className="fx-box"+(sel.e?"":" bsel");
    box.style.cssText+="left:"+(r.left+sx)+"px;top:"+(r.top+sy)+"px;width:"+r.width+"px;height:"+r.height+"px";
    layer.appendChild(box);
    if(sel.e && !editing){
      var mv=doc.createElement("div"); mv.className="fx-mv"; mv.setAttribute("data-h","move"); box.appendChild(mv);
      [["nw",0,0],["ne",1,0],["sw",0,1],["se",1,1],["e",1,.5,1],["w",0,.5,1]].forEach(function(h){
        var d=doc.createElement("div"); d.className="fx-h"+(h[3]?" s":""); d.setAttribute("data-h",h[0]);
        d.style.left=(h[1]*100)+"%"; d.style.top=(h[2]*100)+"%"; box.appendChild(d); });
    }
    if(drag) return;
    var info=R.info&&R.info[sel.b]||{}, kind=sel.e?((info.els||{})[sel.e]||(info.els||{})[sel.e.replace(/^i\d+$/,"i*")]||"text"):"block";
    tb=doc.createElement("div"); tb.className="fx-tb";
    var cs=sel.e?getComputedStyle(el):null, swc=cs?(kind==="text"||kind==="wrap"?cs.color:(cs.backgroundColor!=="rgba(0, 0, 0, 0)"?cs.backgroundColor:cs.color)):"";
    var h="";
    if(sel.e){
      h+='<button data-t="color" title="Цвет"><span class="sw" style="background:'+swc+'"></span></button>';
      if(kind!=="img"&&kind!=="round") h+='<button data-t="font" title="Текст">Aa</button>';
      if(kind==="box"||kind==="img"||kind==="round"||kind==="wrap") h+='<button data-t="radius" title="Скругление">'+ic("rad")+'</button>';
      if(kind==="img"||kind==="round") h+='<button data-t="photo" title="Фото">'+ic("img")+'</button>';
      h+='<i></i><button data-t="parent" title="Выбрать весь блок">'+ic("par")+'</button>';
      if(/^i\d+$/.test(sel.e)) h+='<button data-t="dup" title="Копия">'+ic("dup")+'</button>';
      h+='<button data-t="del" title="'+(/^i\d+$/.test(sel.e)?"Удалить":"Скрыть")+'">'+ic("del")+'</button>';
    } else {
      h+='<button data-t="variant" title="Вид блока">Вид</button><i></i><button data-t="up" title="Выше">'+ic("up")+'</button><button data-t="down" title="Ниже">'+ic("down")+'</button>'+
         '<button data-t="dup" title="Копия">'+ic("dup")+'</button><button data-t="del" title="Удалить">'+ic("del")+'</button>';
    }
    h+='<i></i><button data-t="more" title="Все настройки">'+ic("more")+'</button>';
    tb.innerHTML=h; layer.appendChild(tb);
    var tw=tb.offsetWidth, th=tb.offsetHeight, vw=doc.documentElement.clientWidth;
    var left=Math.max(6+sx, Math.min(r.left+sx+r.width/2-tw/2, sx+vw-tw-6)), top=r.top+sy-th-14;
    if(r.top-th-14<4) top=r.bottom+sy+14;
    tb.style.left=left+"px"; tb.style.top=top+"px";
  }
  function select(s, scroll){
    if(editing) stopEdit();
    sel=s; draw();
    if(scroll){ var el=elOf(sel); if(el){ var r=el.getBoundingClientRect(); if(r.top<60||r.bottom>innerHeight-40) el.scrollIntoView({block:"center"}); draw(); } }
  }

  /* правка текста прямо на странице */
  function startEdit(el){
    var f=el.hasAttribute("data-f")?el:el.querySelector("[data-f]"); if(!f) return false;
    editing={el:f, b:sel.b, f:f.getAttribute("data-f")};
    try{ f.contentEditable="plaintext-only"; }catch(e){ f.contentEditable="true"; }
    if(f.contentEditable!=="plaintext-only") f.contentEditable="true";
    f.focus(); var rg=doc.createRange(); rg.selectNodeContents(f); rg.collapse(false); var s=getSelection(); s.removeAllRanges(); s.addRange(rg);
    f.addEventListener("input",onInput); f.addEventListener("blur",stopEdit);
    clear(); var r=f.getBoundingClientRect(); return true;
  }
  function onInput(){ if(editing) post({t:"text", b:editing.b, f:editing.f, v:editing.el.innerText.replace(/\n$/,"")}); }
  function stopEdit(){ if(!editing) return; var e=editing; editing=null;
    e.el.removeEventListener("input",onInput); e.el.removeEventListener("blur",stopEdit); e.el.removeAttribute("contenteditable");
    post({t:"textdone", b:e.b, f:e.f, v:e.el.innerText.replace(/\n$/,"")}); draw(); }

  /* касания и мышь */
  function pick(target){
    var b=target.closest("[data-b]"); if(!b) return null;
    var e=target.closest("[data-e]"); if(e && !b.contains(e)) e=null;
    return { b:b.getAttribute("data-b"), e:e?e.getAttribute("data-e"):null };
  }
  doc.addEventListener("click",function(ev){
    if(ev.target.closest(".fx-tb")){ ev.preventDefault(); var t=ev.target.closest("button"); if(t) post({t:"tool", tool:t.getAttribute("data-t"), sel:sel}); return; }
    if(editing && editing.el.contains(ev.target)) return;
    ev.preventDefault(); ev.stopPropagation();
    if(drag&&drag.moved) return;
    if(ev.target.closest(".fx-box")){
      if(ev.target.getAttribute("data-h")==="move" && sel && sel.e){ if(!startEdit(elOf(sel))) post({t:"tool", tool:"tap2", sel:sel}); }
      return; }
    var p=pick(ev.target);
    if(!p){ sel=null; clear(); post({t:"sel", sel:null}); return; }
    if(sel && p.b===sel.b && p.e && p.e===sel.e){ if(startEdit(elOf(sel))) return; }
    select(p); post({t:"sel", sel:p});
  },true);
  doc.addEventListener("submit",function(e){ e.preventDefault(); },true);
  doc.addEventListener("toggle",function(){ if(sel) draw(); },true);

  function num(v){ return Math.round(v*100)/100; }
  doc.addEventListener("pointerdown",function(ev){
    var h=ev.target.closest&&ev.target.closest("[data-h]"); if(!h||!sel||!sel.e) return;
    ev.preventDefault(); var el=elOf(sel), blk=$b(sel.b); if(!el) return;
    var kind=((R.info[sel.b]||{}).els||{})[sel.e]||((R.info[sel.b]||{}).els||{})[sel.e.replace(/^i\d+$/,"i*")]||"text";
    var cur=(R.vals&&R.vals[sel.b+"/"+sel.e])||{};
    var r=el.getBoundingClientRect(), br=blk.getBoundingClientRect();
    var pr=el.parentElement.getBoundingClientRect(), centered=Math.abs((r.left+r.width/2)-(pr.left+pr.width/2))<3;
    drag={ centered:centered, h:h.getAttribute("data-h"), x0:ev.clientX, y0:ev.clientY, el:el, kind:kind, bw:br.width, br:br, r:r,
      x:cur.x||0, y:cur.y||0, w:cur.w||num(r.width/br.width*100), fs:cur.fs||1, moved:false, nx:cur.x||0, ny:cur.y||0, nw:null, nfs:null };
    try{ h.setPointerCapture(ev.pointerId); }catch(e){}
  },true);
  doc.addEventListener("pointermove",function(ev){
    if(!drag) return; var dx=ev.clientX-drag.x0, dy=ev.clientY-drag.y0;
    if(!drag.moved && Math.abs(dx)+Math.abs(dy)<4) return;
    drag.moved=true; ev.preventDefault();
    layer.querySelectorAll(".fx-g,.fx-gl,.fx-sz").forEach(function(n){ n.remove(); });
    var el=drag.el, bw=drag.bw, br=drag.br, r=drag.r, sx=scrollX, sy=scrollY;
    if(drag.h==="move"){
      var vw=doc.documentElement.clientWidth; if(r.left+dx<0) dx=-r.left; if(r.right+dx>vw) dx=vw-r.right;
      var cx=r.left+r.width/2+dx, bc=br.left+br.width/2, snapX=false, snapY=false;
      if(Math.abs(cx-bc)<7){ dx+=bc-cx; snapX=true; }
      var nx=drag.x+dx/bw*100, ny=drag.y+dy/bw*100;
      if(Math.abs(nx)<1.2 && Math.abs(dx)<7){ nx=0; }
      if(Math.abs(ny - 0)<1.2){ ny=0; snapY=true; }
      drag.nx=num(nx); drag.ny=num(ny);
      el.style.translate="calc("+drag.nx+" * 1cqw) calc("+drag.ny+" * 1cqw)"; el.style.position="relative"; el.style.zIndex="2";
      if(snapX) guide("v", bc+sx, br.top+sy-30, br.height+60, "центр");
    } else {
      var side=drag.h, sign=/w/.test(side)?-1:1, prop=side.length===2;
      var nwpx=Math.max(24, r.width+sign*dx*(drag.centered?2:1));
      var nw=num(Math.min(100,nwpx/bw*100)); drag.nw=nw;
      if(drag.kind==="round"){ el.style.width=nw+"cqw"; el.style.height=nw+"cqw"; el.style.flex="none"; }
      else { el.style.width=nw+"cqw"; el.style.maxWidth="none"; el.style.flex="none"; el.style.marginInline="auto"; }
      if(prop && drag.kind!=="img" && drag.kind!=="round"){ drag.nfs=num(Math.max(.4,Math.min(4,drag.fs*nwpx/r.width))); el.style.setProperty("--fs",drag.nfs); }
      if(Math.abs(nw-100)<1.5 || Math.abs(nwpx-br.width)<8){ guide("v",br.left+sx,br.top+sy,br.height,""); guide("v",br.right+sx,br.top+sy,br.height,"во всю ширину"); }
    }
    var rr=el.getBoundingClientRect();
    var sz=doc.createElement("div"); sz.className="fx-sz"; sz.textContent=Math.round(rr.width)+" x "+Math.round(rr.height);
    sz.style.left=(rr.left+sx+rr.width/2)+"px"; sz.style.top=(rr.bottom+sy+12)+"px"; sz.style.transform="translateX(-50%)"; layer.appendChild(sz);
    if(box){ box.style.left=(rr.left+sx)+"px"; box.style.top=(rr.top+sy)+"px"; box.style.width=rr.width+"px"; box.style.height=rr.height+"px"; }
    if(tb){ tb.remove(); tb=null; }
  },true);
  function guide(k,x,y,len,label){
    var g=doc.createElement("div"); g.className="fx-g "+k;
    if(k==="v"){ g.style.left=x+"px"; g.style.top=y+"px"; g.style.height=len+"px"; } else { g.style.left=x+"px"; g.style.top=y+"px"; g.style.width=len+"px"; }
    layer.appendChild(g);
    if(label){ var l=doc.createElement("div"); l.className="fx-gl"; l.textContent=label; l.style.left=(x+6)+"px"; l.style.top=(y+4)+"px"; layer.appendChild(l); }
  }
  doc.addEventListener("pointerup",function(){
    if(!drag) return; var d=drag;
    setTimeout(function(){ drag=null; if(!editing) draw(); },0);
    if(!d.moved) return;
    var patch={};
    if(d.h==="move"){ patch.x=d.nx; patch.y=d.ny; } else { if(d.nw!=null) patch.w=d.nw; if(d.nfs!=null) patch.fs=d.nfs; }
    post({t:"patch", sel:sel, patch:patch});
  },true);

  /* сообщения от редактора */
  addEventListener("message",function(e){
    var m=e.data; if(!m||!m.forge) return;
    if(m.t==="css"){ doc.getElementById("ov").textContent=m.css; if(m.vals) R.vals=m.vals;
      ["translate","width","height","maxWidth","flex","marginInline","position","zIndex"].forEach(function(p){ doc.querySelectorAll("[data-e]").forEach(function(n){ n.style[p]=""; }); });
      doc.querySelectorAll("[data-e]").forEach(function(n){ n.style.removeProperty("--fs"); });
      requestAnimationFrame(draw); }
    if(m.t==="select"){ select(m.sel, m.scroll); }
    if(m.t==="edittext" && sel && sel.e){ startEdit(elOf(sel)); }
  });
  /* клавиши из превью передаём редактору: стрелки двигают, Delete удаляет, Ctrl+Z отменяет */
  doc.addEventListener("keydown",function(e){ if(editing||/INPUT|TEXTAREA|SELECT/.test((doc.activeElement||{}).tagName||"")) return;
    var k=e.key; if(/^Arrow|^Delete$|^Backspace$|^Escape$/.test(k) || ((e.ctrlKey||e.metaKey) && /^[zy]$/i.test(k))){ e.preventDefault(); post({t:"key", k:k, s:e.shiftKey, c:e.ctrlKey||e.metaKey}); } });
  addEventListener("resize",function(){ if(sel) draw(); });
  var stT=0; addEventListener("scroll",function(){ clearTimeout(stT); stT=setTimeout(function(){ post({t:"y", y:scrollY}); },150); });
  scrollTo(0,R.y||0);
  addEventListener("load",function(){ scrollTo(0,R.y||0); if(R.sel) select(R.sel, R.go); });
  if(R.sel) select(R.sel, false);
}

/* данные для превью: какие элементы у блоков и где они сейчас стоят */
function rtInfo(st, desk){
  var info={}, vals={};
  st.blocks.forEach(function(b){ var g=BLOCKS[b.type].gen(b.c,b,{}); info[b.uid]={els:g.els||{}};
    for(var k in (b.e||{})){ var o=b.e[k]||{};
      vals[b.uid+"/"+k]= desk ? { x:o.dx!=null?o.dx:o.x, y:o.dy!=null?o.dy:o.y, w:o.dw||o.w, fs:o.fs } : { x:o.x, y:o.y, w:o.w, fs:o.fs }; } });
  return { info:info, vals:vals };
}

/* ─────────── ссылка без сервера ───────────
   Страница уходит в адрес после # целиком: JSON, сжатый deflate, в base64url.
   Часть адреса после # браузер на сервер не отправляет. */
function b64u(bytes){ var s=""; for(var i=0;i<bytes.length;i+=8192) s+=String.fromCharCode.apply(null, bytes.subarray(i,i+8192)); return btoa(s).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,""); }
function unb64u(str){ var s=atob(str.replace(/-/g,"+").replace(/_/g,"/")); var a=new Uint8Array(s.length); for(var i=0;i<s.length;i++) a[i]=s.charCodeAt(i); return a; }
function encodeShare(st){
  var bytes=new TextEncoder().encode(JSON.stringify(st));
  if(typeof CompressionStream==="undefined") return Promise.resolve("J"+b64u(bytes));
  var cs=new Blob([bytes]).stream().pipeThrough(new CompressionStream("deflate-raw"));
  return new Response(cs).arrayBuffer().then(function(buf){ return "Z"+b64u(new Uint8Array(buf)); });
}
function decodeShare(code){
  var kind=code.charAt(0), bytes=unb64u(code.slice(1));
  var done=function(b){ var o=JSON.parse(new TextDecoder().decode(b)); if(!o||o.v!==2) throw new Error("old"); return fixPage(o); };
  if(kind==="J") return Promise.resolve(done(bytes));
  if(kind!=="Z") return Promise.reject(new Error("old"));
  var ds=new Blob([bytes]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
  return new Response(ds).arrayBuffer().then(function(buf){ return done(new Uint8Array(buf)); });
}
/* фото с устройства в ссылку не помещаются: убираем их и считаем, сколько убрали */
function stripPhotos(st){
  var c=clone(st), n=0;
  function cut(v){ if(typeof v==="string" && v.indexOf("data:image")===0){ n++; return ""; } return v; }
  c.bg.img=cut(c.bg.img); if(!c.bg.img && c.bg.mode==="photo") c.bg.mode="theme";
  c.blocks.forEach(function(b){ for(var k in b.c){ b.c[k]=cut(b.c[k]); } (b.c.L||[]).forEach(function(it){ for(var k in it) it[k]=cut(it[k]); }); });
  return { st:c, cut:n };
}

/* ─────────── zip без сжатия: для «Скачать папкой» ─────────── */
var CRC_T=(function(){ var t=new Uint32Array(256); for(var n=0;n<256;n++){ var c=n; for(var k=0;k<8;k++) c=c&1?0xEDB88320^(c>>>1):c>>>1; t[n]=c>>>0; } return t; })();
function crc32(u8){ var c=0xFFFFFFFF; for(var i=0;i<u8.length;i++) c=CRC_T[(c^u8[i])&255]^(c>>>8); return (c^0xFFFFFFFF)>>>0; }
function makeZip(files){ /* files: [{name, data:Uint8Array}] */
  var enc=new TextEncoder(), parts=[], central=[], off=0;
  function u16(v){ return [v&255,(v>>8)&255]; } function u32(v){ return [v&255,(v>>8)&255,(v>>16)&255,(v>>>24)&255]; }
  files.forEach(function(f){
    var nm=enc.encode(f.name), crc=crc32(f.data), sz=f.data.length;
    var lh=new Uint8Array([].concat([0x50,0x4b,3,4],u16(20),u16(0x0800),u16(0),u16(0),u16(0x21),u32(crc),u32(sz),u32(sz),u16(nm.length),u16(0)));
    parts.push(lh,nm,f.data);
    central.push(new Uint8Array([].concat([0x50,0x4b,1,2],u16(20),u16(20),u16(0x0800),u16(0),u16(0),u16(0x21),u32(crc),u32(sz),u32(sz),u16(nm.length),u16(0),u16(0),u16(0),u16(0),u32(0),u32(off))),nm);
    off+=lh.length+nm.length+sz;
  });
  var csz=central.reduce(function(a,b){return a+b.length;},0);
  var end=new Uint8Array([].concat([0x50,0x4b,5,6],u16(0),u16(0),u16(files.length),u16(files.length),u32(csz),u32(off),u16(0)));
  return new Blob(parts.concat(central,[end]),{type:"application/zip"});
}
function dataUrlBytes(u){ var m=String(u).match(/^data:([^;,]+)(;base64)?,(.*)$/); if(!m) return null;
  var ext=(m[1].split("/")[1]||"bin").replace("jpeg","jpg").replace("svg+xml","svg");
  var bytes=m[2]?unb64u(m[3].replace(/\+/g,"-").replace(/\//g,"_")):new TextEncoder().encode(decodeURIComponent(m[3]));
  return { ext:ext, bytes:bytes }; }
/* папка сайта: index.html + style.css + script.js + img/ */
function buildFolder(st){
  var enc=new TextEncoder(), imgs=[], map={}, n=0;
  function take(u){ if(typeof u!=="string"||u.indexOf("data:image")!==0) return u; if(map[u]) return map[u];
    var d=dataUrlBytes(u); if(!d) return u; var name="img/photo-"+(++n)+"."+d.ext; imgs.push({name:name,data:d.bytes}); map[u]=name; return name; }
  var c=clone(st);
  c.bg.img=take(c.bg.img);
  c.blocks.forEach(function(b){ for(var k in b.c) b.c[k]=take(b.c[k]); (b.c.L||[]).forEach(function(it){ for(var k in it) it[k]=take(it[k]); }); });
  var p=buildPage(c,"file",{parts:true});
  var css=p.css.replace("\uE020", p.bgImg ? "../"+p.bgImg : "").replace(/url\(img\//g,"url(../img/");
  /* в style.css пути к картинкам считаются от папки css/ */
  var html="<!DOCTYPE html>\n<html lang=\"ru\">\n<head>\n<meta charset=\"UTF-8\">\n<meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\n"+
    "<title>"+esc(st.title||"Моя страница")+"</title>\n"+(p.fonts?"<link rel=\"stylesheet\" href=\""+p.fonts+"\">\n":"")+
    "<link rel=\"stylesheet\" href=\"css/style.css\">\n</head>\n<body>\n"+(p.bgDiv?"  "+p.bgDiv+"\n":"")+"<main class=\"page\">"+p.html+"\n</main>\n"+
    (p.js?"<script src=\"js/script.js\"></script>\n":"")+"</body>\n</html>\n";
  var files=[{name:"index.html",data:enc.encode(html)},{name:"css/style.css",data:enc.encode(css+"\n")}];
  if(p.js) files.push({name:"js/script.js",data:enc.encode(p.js+"\n")});
  files.push({name:"README.txt",data:enc.encode("Страница собрана в FORGE (A.C.EON).\r\n\r\nindex.html - разметка страницы\r\ncss/style.css - оформление\r\n"+(p.js?"js/script.js - JavaScript (таймеры, кнопки, форма)\r\n":"")+(imgs.length?"img/ - ваши фото\r\n":"")+"\r\nОткройте index.html в браузере. Чтобы выложить в интернет, загрузите всю папку на любой хостинг (GitHub Pages, Netlify, Neocities).\r\n")});
  return makeZip(files.concat(imgs));
}

/* ─────────── ШАБЛОНЫ ─────────── */
/* блок шаблона: [тип, вариант, содержимое, настройки блока] */
var TEMPLATES = [
  { id:"links", group:"me", name:"Все ссылки", desc:"Фото, пара слов и кнопки на все ваши страницы", theme:"sunset", w:"narrow", blocks:[
    ["profile","center",{name:"Лиза Мороз",bio:"Пою, пишу песни, по пятницам играю в «Пятом этаже»"}],
    ["links","stack",{L:[{t:"Новый альбом «Север»",s:"слушать везде",i:"music",a:{t:"link",v:"https://band.link/"}},{t:"Билеты на концерт 12 декабря",s:"",i:"cal",a:{t:"link",v:"https://"}},{t:"Написать мне",s:"",i:"send",a:{t:"tg",v:"@username"}}]}],
    ["contact","icons",{}], ["footer","normal",{text:"© 2026 Лиза Мороз"}] ] },
  { id:"card", group:"me", name:"Визитка", desc:"Кто вы, чем занимаетесь, кнопка «сохранить контакт»", theme:"minimal", w:"narrow", blocks:[
    ["profile","left",{name:"Иван Петров",bio:"Фотограф в Лодзи. Свадьбы, портреты, семейные съёмки."}],
    ["contact","buttons",{}],
    ["vcard","main",{name:"Иван Петров",phone:"+48 600 000 000",mail:"ivan@mail.com",org:"Фотограф"}],
    ["features","list",{L:[{i:"camera",t:"Портреты",s:"Студия или улица, 1 час, 30 обработанных снимков."},{i:"heart",t:"Свадьбы",s:"Весь день, от сборов до первого танца."},{i:"home",t:"Семья",s:"Спокойная съёмка дома или в парке."}]}],
    ["footer","normal",{text:"© 2026 Иван Петров"}] ] },
  { id:"resume", group:"me", name:"Резюме", desc:"Опыт, навыки и цифры на одной странице", theme:"night", w:"normal", blocks:[
    ["profile","center",{name:"Мария Ковальская",bio:"Дизайнер интерфейсов. Ищу работу в продуктовой команде."}],
    ["stats","row",{L:[{n:"6 лет",l:"в дизайне"},{n:"40+",l:"проектов"},{n:"3",l:"языка"}]}],
    ["features","cols",{L:[{i:"brush",t:"Интерфейсы",s:"Сайты и приложения от схем до готовых макетов."},{i:"user",t:"Исследования",s:"Интервью с пользователями и тесты."},{i:"spark",t:"Дизайн-системы",s:"Компоненты, которые удобно поддерживать."}]}],
    ["schedule","line",{title:"Опыт",L:[{tm:"2023",t:"Ведущий дизайнер, студия «Пиксель»",s:"до сих пор"},{tm:"2020",t:"Дизайнер, интернет-магазин",s:"3 года"},{tm:"2019",t:"Стажировка",s:"полгода"}]}],
    ["links","line",{L:[{t:"Портфолио",s:"",i:"",a:{t:"link",v:"https://"}},{t:"Скачать резюме PDF",s:"",i:"",a:{t:"file",v:"https://"}}]}],
    ["vcard","second",{name:"Мария Ковальская",mail:"maria@mail.com"}] ] },
  { id:"birthday", group:"event", name:"День рождения", desc:"Отсчёт, программа, место и «в календарь»", theme:"candy", w:"narrow", blocks:[
    ["hero","center",{kicker:"Приглашение",title:"Маше 7 лет!",text:"Ждём тебя на празднике: аниматор, торт и сюрпризы.",btn:"Я приду",act:{t:"wa",v:"+48 600 000 000"}}],
    ["countdown","cells",{title:"До праздника осталось",date:"2026-12-12",time:"15:00"}],
    ["event","card",{title:"День рождения Маши",date:"2026-12-12",time:"15:00",dur:4,place:"Кафе «Карусель», ул. Пётрковская 100"}],
    ["schedule","cards",{title:"Что будет",L:[{tm:"15:00",t:"Встречаем гостей",s:""},{tm:"15:30",t:"Аниматор и игры",s:""},{tm:"17:00",t:"Торт и подарки",s:""}]}],
    ["map","normal",{q:"Piotrkowska 100, Łódź"}], ["footer","normal",{text:"Ждём тебя!"}] ] },
  { id:"wedding", group:"event", name:"Свадьба", desc:"Красивое приглашение с программой и ответами", theme:"magazine", w:"narrow", blocks:[
    ["hero","center",{kicker:"14 июня 2027",title:"Ирина и Марек",text:"Будем счастливы разделить этот день с вами.",btn:"",act:{t:"link",v:""}}],
    ["countdown","line",{title:"До свадьбы",date:"2027-06-14",time:"14:00"}],
    ["event","plain",{title:"Венчание и банкет",date:"2027-06-14",time:"14:00",dur:9,place:"Усадьба «Над рекой»"}],
    ["schedule","line",{title:"Программа дня",L:[{tm:"14:00",t:"Венчание",s:""},{tm:"16:00",t:"Фотосессия и фуршет",s:""},{tm:"18:00",t:"Банкет",s:""},{tm:"23:00",t:"Фейерверк",s:""}]}],
    ["faq","normal",{title:"Вопросы",L:[{q:"Есть ли дресс-код?",a:"Светлые и пастельные тона. Белый, пожалуйста, оставьте невесте."},{q:"Можно с детьми?",a:"Конечно, для детей будет отдельный стол и аниматор."}]}],
    ["form","card",{title:"Подтвердите, что придёте",btn:"Ответить"}], ["footer","normal",{text:"Ирина и Марек"}] ] },
  { id:"party", group:"event", name:"Вечеринка", desc:"Тёмная тема, отсчёт и плейлист", theme:"neon", w:"narrow", blocks:[
    ["hero","center",{kicker:"пятница, 22:00",title:"ВЕЧЕРИНКА НА КРЫШЕ",text:"Музыка, огни города и лучшие люди.",btn:"Буду!",act:{t:"tg",v:"@username"}}],
    ["countdown","line",{title:"До начала",date:"2026-12-18",time:"22:00"}],
    ["event","plain",{title:"Вечеринка на крыше",date:"2026-12-18",time:"22:00",dur:6,place:"Крыша, ул. Пётрковская 100"}],
    ["links","stack",{L:[{t:"Плейлист вечера",s:"добавляйте свои треки",i:"music",a:{t:"link",v:"https://"}}]}],
    ["map","normal",{q:"Piotrkowska 100, Łódź"}] ] },
  { id:"cafe", group:"biz", name:"Кафе и меню", desc:"Меню с ценами, адрес и связь", theme:"forest", w:"narrow", blocks:[
    ["hero","center",{kicker:"кофейня",title:"Зерно",text:"Кофе, завтраки весь день и свежая выпечка.",btn:"Как добраться",act:{t:"block",v:"b5"}}],
    ["menu","dots",{title:"Кофе",cur:"zł"}],
    ["menu","dots",{title:"Завтраки",cur:"zł",L:[{t:"Сырники",s:"сметана, ягоды",p:"22"},{t:"Шакшука",s:"с хлебом на закваске",p:"26"},{t:"Гранола",s:"йогурт, мёд",p:"18"}]}],
    ["contact","icons",{}],
    ["map","normal",{q:"Piotrkowska 100, Łódź"}], ["footer","normal",{text:"Каждый день 8:00-20:00"}] ] },
  { id:"master", group:"biz", name:"Мастер и запись", desc:"Прайс, отзывы и кнопка «записаться»", theme:"mint", w:"narrow", blocks:[
    ["profile","center",{name:"Ногти от Оли",bio:"Маникюр и педикюр в уютной студии у парка."}],
    ["button","wide",{text:"Записаться",sub:"отвечу в WhatsApp",icon:"chat",act:{t:"wa",v:"+48 600 000 000"}}],
    ["menu","cards",{title:"Цены",cur:"zł",L:[{t:"Маникюр с покрытием",s:"1,5 часа",p:"120"},{t:"Наращивание",s:"2,5 часа",p:"180"},{t:"Педикюр",s:"1,5 часа",p:"140"}]}],
    ["quote","card",{text:"Хожу к Оле второй год, покрытие держится три недели.",who:"Катя"}],
    ["contact","icons",{}], ["map","normal",{q:"Łódź"}] ] },
  { id:"service", group:"biz", name:"Услуги", desc:"Лендинг: плюсы, цифры, цены, заявка", theme:"minimal", w:"normal", blocks:[
    ["hero","split",{kicker:"ремонт под ключ",title:"Ремонт квартир без нервов",text:"Делаем в срок, показываем каждый этап, убираем за собой.",btn:"Оставить заявку",act:{t:"block",v:"b6"}}],
    ["features","cols",{}], ["stats","row",{}],
    ["menu","cards",{title:"Цены",cur:"zł",L:[{t:"Косметический ремонт",s:"за м²",p:"от 250"},{t:"Капитальный ремонт",s:"за м²",p:"от 700"},{t:"Дизайн-проект",s:"за м²",p:"от 90"}]}],
    ["faq","normal",{}], ["form","card",{title:"Оставьте заявку"}] ] },
  { id:"music", group:"art", name:"Музыкант", desc:"Обложка, клип, концерты и ссылки", theme:"sunset", w:"normal", blocks:[
    ["hero","photo",{kicker:"новый альбом",title:"Север",text:"Девять песен о зиме, дороге и доме.",btn:"Слушать",act:{t:"link",v:"https://"}}],
    ["video","normal",{url:""}],
    ["schedule","cards",{title:"Концерты",L:[{tm:"12.12",t:"Лодзь, «Пятый этаж»",s:"билеты на месте"},{tm:"19.12",t:"Варшава, клуб «Нора»",s:""},{tm:"27.12",t:"Краков, «Подвал»",s:""}]}],
    ["links","grid",{L:[{t:"Музыка",s:"",i:"music",a:{t:"link",v:"https://"}},{t:"Видео",s:"",i:"play",a:{t:"link",v:"https://"}},{t:"Фото",s:"",i:"camera",a:{t:"link",v:"https://"}},{t:"Написать",s:"",i:"send",a:{t:"tg",v:"@username"}}]}] ] },
  { id:"portfolio", group:"art", name:"Портфолио", desc:"Галерея работ, отзыв и контакты", theme:"night", w:"normal", blocks:[
    ["profile","left",{name:"Анна Лис",bio:"Иллюстрации, обложки, афиши. Беру заказы на 2027 год."}],
    ["gallery","wide",{}],
    ["quote","big",{text:"Обложка получилась лучше, чем мы мечтали.",who:"издательство «Ветер»"}],
    ["links","line",{L:[{t:"Заказать иллюстрацию",s:"",i:"",a:{t:"mail",v:"anna@mail.com"}},{t:"Больше работ",s:"",i:"",a:{t:"link",v:"https://"}}]}],
    ["contact","icons",{}] ] },
  { id:"book", group:"art", name:"Книга", desc:"Страница книги: отрывок, отзывы, где купить", theme:"paper", w:"normal", blocks:[
    ["hero","split",{kicker:"новый роман",title:"Тихий город",text:"История о маленьком городе, где все друг друга знают, а один секрет хранится сорок лет.",btn:"Читать отрывок",act:{t:"toggle",v:"b2"}}],
    ["text","card",{text:"Первая глава. Утром в Тихом городе всегда пахнет хлебом..."}],
    ["quote","big",{text:"Прочитала за один вечер.",who:"читательница"}],
    ["button","main",{text:"Где купить",icon:"bag",act:{t:"link",v:"https://"}}], ["footer","normal",{text:"© 2026"}] ] },
  { id:"blank", group:"", name:"С чистого листа", desc:"Пустая страница", theme:"sunset", w:"narrow", blocks:[] }
];
var TPL_GROUPS=[["me","Для себя"],["event","События"],["biz","Дело"],["art","Творчество"]];
function fromTemplate(id){
  var t=TEMPLATES.filter(function(x){return x.id===id;})[0]||TEMPLATES[TEMPLATES.length-1];
  var st=blankPage(); st.theme=t.theme; st.page.w=t.w||"narrow"; st.title=t.id==="blank"?"Моя страница":t.name;
  t.blocks.forEach(function(e){ var b=newBlock(e[0],nextUid(st)); b.v=e[1]; for(var k in (e[2]||{})) b.c[k]=clone(e[2][k]); if(e[3]) for(var o in e[3]) b.o[o]=e[3][o]; st.blocks.push(b); });
  /* в книге отрывок спрятан, пока не нажмут кнопку */
  if(id==="book") st.blocks[1].o.hidden=true;
  return st;
}
