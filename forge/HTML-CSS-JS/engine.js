/* FORGE: движок конструктора страниц.
   Блоки (RECIPES) превращают настройки в кусочки CSS, HTML и JS, buildPage склеивает из них страницу.
   Этим же файлом пользуются редактор (HTML-CSS-JS/index.html) и просмотр по ссылке (forge/p/). */
var FONTS = {
  sans:"system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
  mono:"ui-monospace, Menlo, Consolas, monospace",
  serif:"Georgia, 'Times New Roman', serif"
};
function wrapAlign(id, inner){ return '<div class="fwrap-'+id+'">'+inner+'</div>'; }

/* общие настройки положения - у каждого блока (движок, не рецепт) */
var LAYOUT_OPTS = [
  { id:"posX", type:"range", label:"Сдвиг: влево \u2194 вправо", def:0, min:-140, max:140, unit:"px" },
  { id:"posY", type:"range", label:"Сдвиг: вверх \u2195 вниз",   def:0, min:-90,  max:90,  unit:"px" },
];

/* эффекты - тоже общие для любого блока (навешиваются отдельным слоем) */
var EFFECT_OPTS = [
  { id:"fx", type:"select", label:"Анимация блока", def:"none", choices:[
      ["none","нет"],["float","парение"],["pulse","пульс"],["glow","свечение"],
      ["blink","моргание"],["shimmer","перелив текста"],["glitch","глитч"],
      ["shake","дрожь"],["tilt","наклон"]] },
  { id:"fxTrigger", type:"select", label:"Когда", def:"loop", choices:[["loop","постоянно"],["hover","при наведении"]] },
  { id:"fxSpeed", type:"range", label:"Скорость эффекта", def:5, min:1, max:10, unit:"" },
];
/* строит CSS эффекта, привязанный к обёртке .ffx-<id> */
function fxCss(id, fx, trig, dur){
  var hov = trig==="hover";
  if(fx==="shimmer"){
    var pre = ".ffx-"+id+(hov?":hover":"");
    var list = ["h1","h2","h3","h4","p","a","span","li"].map(function(t){return pre+" "+t;}).join(",");
    return "/* эффект: перелив текста */\n@keyframes ffx-"+id+"{ to{ background-position:200% center; } }\n"+
      list+"{ background:linear-gradient(90deg,var(--accent),#ffffff,var(--accent)); background-size:200% auto;"+
      " -webkit-background-clip:text; background-clip:text; color:transparent; animation:ffx-"+id+" "+dur+" linear infinite; }";
  }
  var K={
    float:"0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}",
    pulse:"0%,100%{transform:scale(1)}50%{transform:scale(1.05)}",
    glow:"0%,100%{filter:drop-shadow(0 0 0 rgba(0,0,0,0))}50%{filter:drop-shadow(0 0 12px var(--accent))}",
    blink:"0%,100%{opacity:1}50%{opacity:.25}",
    shake:"0%,100%{transform:translateX(0)}25%{transform:translateX(-3px)}75%{transform:translateX(3px)}",
    tilt:"0%,100%{transform:rotate(0)}50%{transform:rotate(2.5deg)}",
    glitch:"0%,100%{transform:translate(0);clip-path:inset(0)}20%{transform:translate(-2px,1px);clip-path:inset(10% 0 60% 0)}40%{transform:translate(2px,-1px);clip-path:inset(50% 0 20% 0)}60%{transform:translate(-1px,0);clip-path:inset(20% 0 45% 0)}80%{transform:translate(1px,1px);clip-path:inset(70% 0 5% 0)}"
  };
  var sel = ".ffx-"+id+(hov?":hover":"");
  return "/* эффект блока */\n@keyframes ffx-"+id+"{ "+K[fx]+" }\n"+sel+"{ animation: ffx-"+id+" "+dur+" ease-in-out infinite; }";
}
function fxDur(speed){ return ((11-(Number(speed)||5))*0.25).toFixed(2)+"s"; }

/* готовые темы */
var PRESETS = {
  neon:    { name:"Неон",     bg:"#0b0d10", bg2:"#141a22", surface:"#12151a", fg:"#e6e9ee", accent:"#4fd6c8", font:"sans" },
  minimal: { name:"Минимал",  bg:"#ffffff", bg2:"#eef1f5", surface:"#f6f7f9", fg:"#1a1d21", accent:"#3b82f6", font:"sans" },
  paper:   { name:"Бумага",   bg:"#f5f1e8", bg2:"#ece5d6", surface:"#efe9dc", fg:"#2a2620", accent:"#b4632f", font:"serif" },
  violet:  { name:"Фиолет",   bg:"#0f0b1a", bg2:"#1a1030", surface:"#191333", fg:"#e8e3f5", accent:"#a970ff", font:"sans" },
  terminal:{ name:"Терминал", bg:"#05080a", bg2:"#0a1410", surface:"#0a1712", fg:"#b8f5c0", accent:"#35e08a", font:"mono" },
};

/* ─────────────── НАСТРОЙКИ СТРАНИЦЫ / ТЕМА ─────────────── */
var PAGE = {
  options:[
    { id:"preset", type:"presets", label:"Готовая тема" },
    { id:"bgMode", type:"select", label:"Фон", def:"gradient", choices:[["solid","сплошной"],["gradient","градиент"]] },
    { id:"bg",     type:"color",  label:"Цвет фона",        def:"#0b0d10" },
    { id:"bg2",    type:"color",  label:"Второй цвет (градиент)", def:"#141a22" },
    { id:"fg",     type:"color",  label:"Цвет текста (тема)", def:"#e6e9ee" },
    { id:"accent", type:"color",  label:"Акцент (тема)",     def:"#4fd6c8" },
    { id:"surface",type:"color",  label:"Фон блоков (тема)", def:"#12151a" },
    { id:"font",   type:"select", label:"Шрифт",            def:"sans", choices:[["sans","обычный"],["mono","моно"],["serif","с засечками"]] },
    { id:"width",  type:"range",  label:"Ширина контента",  def:760, min:480, max:1100, unit:"px" },
    { id:"gap",    type:"range",  label:"Отступ между блоками", def:28, min:8, max:72, unit:"px" },
    { id:"align",  type:"select", label:"Выравнивание",     def:"center", choices:[["left","слева"],["center","по центру"]] },
    { id:"anim",   type:"select", label:"Анимация появления", def:"up", choices:[["none","нет"],["fade","проявление"],["up","снизу вверх"],["left","слева"],["zoom","масштаб"]] },
    { id:"stagger",type:"toggle", label:"Появляться по очереди", def:true },
    { id:"cursor", type:"select", label:"Курсор-эффект",    def:"none", choices:[["none","нет"],["dot","точка"],["ring","кольцо"],["trail","шлейф"]] },
  ],
  gen:function(p){
    var bg = p.bgMode==="gradient" ? "linear-gradient(160deg, "+p.bg+", "+p.bg2+")" : p.bg;
    var css =
"/* ═══ тема: меняешь переменные - перекрашивается весь сайт ═══ */\n"+
":root{\n  --accent: "+p.accent+";\n  --surface: "+p.surface+";\n  --fg: "+p.fg+";\n}\n"+
"*{ box-sizing:border-box; }\n"+
"body{\n  margin:0;\n  min-height:100vh;\n  background: "+bg+";\n  color: var(--fg);\n"+
"  font-family: "+FONTS[p.font]+";\n}\n"+
".page{\n  max-width: "+p.width+"px;\n  margin:0 auto;\n  padding:48px 20px;\n"+
"  display:flex; flex-direction:column;\n  gap: "+p.gap+"px;\n  text-align: "+p.align+";\n}";

    if(p.anim!=="none"){
      var base="translate(var(--x), var(--y))";
      var fromF={ fade:"opacity:0; transform:"+base+";",
        up:"opacity:0; transform: translate(var(--x), calc(var(--y) + 22px));",
        left:"opacity:0; transform: translate(calc(var(--x) - 28px), var(--y));",
        zoom:"opacity:0; transform:"+base+" scale(.94);" }[p.anim];
      var toF={ fade:"opacity:1; transform:"+base+";", up:"opacity:1; transform:"+base+";",
        left:"opacity:1; transform:"+base+";", zoom:"opacity:1; transform:"+base+" scale(1);" }[p.anim];
      css += "\n/* эффект: появление блоков */\n@keyframes fEnter{ from{ "+fromF+" } to{ "+toF+" } }\n.page > *{ animation: fEnter .6s ease both; }";
    }
    if(p.cursor!=="none"){
      var isRing = p.cursor==="ring";
      var sz = isRing ? 22 : 12;
      css += "\n/* эффект: курсор */\n"+
        (p.cursor==="dot" ? "body{ cursor:none; }\n" : "")+
        ".f-cursor{ position:fixed; top:0; left:0; z-index:9999; pointer-events:none;"+
        " width:"+sz+"px; height:"+sz+"px; border-radius:50%; transform:translate(-100px,-100px);"+
        (isRing ? " border:2px solid var(--accent);" : " background:var(--accent);")+" }";
    }

    var js = "";
    if(p.anim!=="none" && p.stagger){
      js += "// появление по очереди: своя задержка у каждого блока\n"+
        "document.querySelectorAll('.page > *').forEach(function(el,i){ el.style.animationDelay=(i*0.09)+'s'; });\n";
    }
    if(p.cursor!=="none"){
      var off = (p.cursor==="ring"?11:6);
      if(p.cursor==="trail"){
        js += "// курсор: шлейф - точка мягко догоняет мышь\n"+
          "(function(){ var c=document.createElement('div'); c.className='f-cursor'; document.body.appendChild(c);\n"+
          "  var x=innerWidth/2,y=innerHeight/2,tx=x,ty=y;\n"+
          "  addEventListener('mousemove',function(e){ tx=e.clientX; ty=e.clientY; });\n"+
          "  (function loop(){ x+=(tx-x)*0.2; y+=(ty-y)*0.2; c.style.transform='translate('+(x-"+off+")+'px,'+(y-"+off+")+'px)'; requestAnimationFrame(loop); })();\n})();\n";
      } else {
        js += "// курсор: следует мгновенно, без задержки\n"+
          "(function(){ var c=document.createElement('div'); c.className='f-cursor'; document.body.appendChild(c);\n"+
          "  addEventListener('mousemove',function(e){ c.style.transform='translate('+(e.clientX-"+off+")+'px,'+(e.clientY-"+off+")+'px)'; });\n})();\n";
      }
    }
    return { css:css, js:js };
  }
};

/* ─────────────── РЕЦЕПТЫ БЛОКОВ ─────────────── */
var RECIPES = {

  hero:{ glyph:"★", name:"Обложка",
    options:[
      { id:"title",   type:"text",     label:"Заголовок", def:"Большой заголовок" },
      { id:"subtitle",type:"textarea", label:"Подзаголовок", def:"Короткое описание под заголовком - суть страницы в одной строке." },
      { id:"btnLabel",type:"text",     label:"Текст кнопки", def:"Начать" },
      { id:"btnLink", type:"text",     label:"Ссылка кнопки", def:"#" },
      { id:"accent",  type:"tcolor",   token:"accent",  label:"Цвет кнопки", def:"var(--accent)" },
      { id:"tint",    type:"tcolor",   token:"surface", label:"Фон обложки", def:"var(--surface)" },
      { id:"fg",      type:"tcolor",   token:"fg",      label:"Цвет текста", def:"var(--fg)" },
      { id:"minH",    type:"range",    label:"Высота", def:320, min:180, max:600, unit:"px" },
    ],
    gen:function(c,id){ return {
      css:".fhero-"+id+"{ display:flex; flex-direction:column; align-items:center; justify-content:center; gap:16px;\n"+
          "  min-height:"+c.minH+"px; padding:40px 24px; text-align:center;\n"+
          "  background:"+c.tint+"; color:"+c.fg+"; border-radius:14px; }\n"+
          ".fhero-"+id+" h1{ margin:0; font-size:clamp(28px,6vw,52px); line-height:1.1; }\n"+
          ".fhero-"+id+" p{ margin:0; max-width:46ch; opacity:.82; font-size:16px; line-height:1.6; }\n"+
          ".fhero-"+id+" a{ display:inline-block; margin-top:8px; text-decoration:none;\n"+
          "  background:"+c.accent+"; color:#0b0d10; padding:14px 30px; border-radius:10px; font-weight:600; transition:transform .15s; }\n"+
          ".fhero-"+id+" a:hover{ transform:translateY(-3px); }",
      html:"<!-- \u270e обложка: заголовок + текст + кнопка -->\n"+
           '<section class="fhero-'+id+'">\n  <h1>'+c.title+"</h1>\n  <p>"+c.subtitle+"</p>\n"+
           '  <a href="'+c.btnLink+'">'+c.btnLabel+"</a>\n</section>",
      js:"" }; }
  },

  navbar:{ glyph:"≡", name:"Меню",
    options:[
      { id:"brand", type:"text",  label:"Название / логотип", def:"Мой сайт" },
      { id:"links", type:"text",  label:"Пункты (через запятую)", def:"Главная, О нас, Контакты" },
      { id:"bg",    type:"tcolor",token:"surface", label:"Фон", def:"var(--surface)" },
      { id:"fg",    type:"tcolor",token:"fg",      label:"Цвет текста", def:"var(--fg)" },
      { id:"accent",type:"tcolor",token:"accent",  label:"Акцент при наведении", def:"var(--accent)" },
    ],
    gen:function(c,id){
      var items = c.links.split(",").map(function(s){return s.trim();}).filter(Boolean)
        .map(function(s){return '<a href="#">'+s+"</a>";}).join("");
      return {
        css:".fnav-"+id+"{ display:flex; align-items:center; gap:22px; padding:14px 20px; background:"+c.bg+"; border-radius:10px; flex-wrap:wrap; }\n"+
            ".fnav-"+id+" .brand{ font-weight:700; color:"+c.fg+"; margin-right:auto; }\n"+
            ".fnav-"+id+" a{ color:"+c.fg+"; text-decoration:none; opacity:.8; }\n"+
            ".fnav-"+id+" a:hover{ opacity:1; color:"+c.accent+"; }",
        html:"<!-- \u270e меню: пункты меняются в настройках -->\n"+
             '<nav class="fnav-'+id+'"><span class="brand">'+c.brand+"</span>"+items+"</nav>",
        js:"" };
    }
  },

  heading:{ glyph:"H", name:"Заголовок",
    options:[
      { id:"text",  type:"text",   label:"Текст",   def:"Заголовок страницы" },
      { id:"level", type:"select", label:"Уровень", def:"h1", choices:[["h1","H1 (главный)"],["h2","H2"],["h3","H3"]] },
      { id:"size",  type:"range",  label:"Размер",  def:40, min:18, max:72, unit:"px" },
      { id:"color", type:"tcolor", token:"fg", label:"Цвет", def:"var(--fg)" },
      { id:"align", type:"select", label:"Выравнивание", def:"center", choices:[["left","слева"],["center","центр"],["right","справа"]] },
      { id:"weight",type:"select", label:"Жирность", def:"800", choices:[["400","обычный"],["600","средний"],["800","жирный"]] },
    ],
    gen:function(c,id){ return {
      css:".fh-"+id+"{ margin:0; font-size:"+c.size+"px; color:"+c.color+"; text-align:"+c.align+"; font-weight:"+c.weight+"; line-height:1.15; }",
      html:"<!-- \u270e заголовок -->\n<"+c.level+' class="fh-'+id+'">'+c.text+"</"+c.level+">",
      js:"" }; }
  },

  paragraph:{ glyph:"¶", name:"Текст",
    options:[
      { id:"text",  type:"textarea", label:"Текст", def:"Здесь короткий абзац текста. Расскажи, о чём страница, или добавь описание." },
      { id:"size",  type:"range",  label:"Размер", def:16, min:12, max:24, unit:"px" },
      { id:"color", type:"tcolor", token:"fg", label:"Цвет", def:"var(--fg)" },
      { id:"align", type:"select", label:"Выравнивание", def:"left", choices:[["left","слева"],["center","центр"],["right","справа"]] },
    ],
    gen:function(c,id){ return {
      css:".fp-"+id+"{ margin:0; font-size:"+c.size+"px; color:"+c.color+"; text-align:"+c.align+"; line-height:1.7; opacity:.92; }",
      html:"<!-- \u270e текст абзаца -->\n<p class=\"fp-"+id+"\">"+c.text+"</p>",
      js:"" }; }
  },

  list:{ glyph:"•", name:"Список",
    options:[
      { id:"items", type:"textarea", label:"Пункты (каждый с новой строки)", def:"Первый пункт\nВторой пункт\nТретий пункт" },
      { id:"kind",  type:"select", label:"Маркер", def:"ul", choices:[["ul","точки"],["ol","цифры"],["none","без маркера"]] },
      { id:"color", type:"tcolor", token:"fg", label:"Цвет", def:"var(--fg)" },
      { id:"size",  type:"range",  label:"Размер", def:16, min:12, max:22, unit:"px" },
    ],
    gen:function(c,id){
      var tag = c.kind==="ol" ? "ol" : "ul";
      var li = c.items.split("\n").map(function(s){return s.trim();}).filter(Boolean)
        .map(function(s){return "  <li>"+s+"</li>";}).join("\n");
      return {
        css:".flist-"+id+"{ margin:0; color:"+c.color+"; font-size:"+c.size+"px; line-height:1.9; text-align:left; "+
            (c.kind==="none"?"list-style:none; padding-left:0;":"padding-left:22px;")+" }",
        html:"<!-- \u270e список: один пункт = одна строка -->\n<"+tag+' class="flist-'+id+'">\n'+li+"\n</"+tag+">",
        js:"" };
    }
  },

  columns:{ glyph:"⊞", name:"Колонки",
    options:[
      { id:"count", type:"select", label:"Сколько колонок", def:"3", choices:[["2","две"],["3","три"]] },
      { id:"gap",   type:"range",  label:"Промежуток", def:20, min:8, max:48, unit:"px" },
      { id:"i1", type:"text", label:"Колонка 1 · значок", def:"◆" },
      { id:"t1", type:"text", label:"Колонка 1 · заголовок", def:"Быстро" },
      { id:"x1", type:"textarea", label:"Колонка 1 · текст", def:"Короткое описание преимущества." },
      { id:"i2", type:"text", label:"Колонка 2 · значок", def:"●" },
      { id:"t2", type:"text", label:"Колонка 2 · заголовок", def:"Просто" },
      { id:"x2", type:"textarea", label:"Колонка 2 · текст", def:"Короткое описание преимущества." },
      { id:"i3", type:"text", label:"Колонка 3 · значок", def:"▲" },
      { id:"t3", type:"text", label:"Колонка 3 · заголовок", def:"Надёжно" },
      { id:"x3", type:"textarea", label:"Колонка 3 · текст", def:"Короткое описание преимущества." },
    ],
    gen:function(c,id){
      var n = c.count==="2" ? 2 : 3;
      var data = [[c.i1,c.t1,c.x1],[c.i2,c.t2,c.x2],[c.i3,c.t3,c.x3]].slice(0,n);
      var cols = data.map(function(d){
        return '  <div class="col">\n    <div class="ic">'+d[0]+"</div>\n    <h4>"+d[1]+"</h4>\n    <p>"+d[2]+"</p>\n  </div>";
      }).join("\n");
      return {
        css:".fcol-"+id+"{ display:grid; grid-template-columns:repeat("+n+",minmax(0,1fr)); gap:"+c.gap+"px; text-align:center; }\n"+
            ".fcol-"+id+" .ic{ font-size:30px; color:var(--accent); margin-bottom:8px; }\n"+
            ".fcol-"+id+" h4{ margin:0 0 6px; color:var(--fg); font-size:17px; }\n"+
            ".fcol-"+id+" p{ margin:0; opacity:.78; font-size:14px; line-height:1.6; }\n"+
            "@media(max-width:600px){ .fcol-"+id+"{ grid-template-columns:1fr; } }",
        html:"<!-- \u270e колонки: значок + заголовок + текст -->\n<div class=\"fcol-"+id+'">\n'+cols+"\n</div>",
        js:"" };
    }
  },

  mediatext:{ glyph:"◨", name:"Картинка + текст",
    options:[
      { id:"url",   type:"text",     label:"Ссылка на картинку", def:"", img:1 },
      { id:"title", type:"text",     label:"Заголовок", def:"Заголовок раздела" },
      { id:"text",  type:"textarea", label:"Текст", def:"Описание рядом с картинкой. Хорошо для разделов «о нас», «как работает» и подобного." },
      { id:"side",  type:"select",   label:"Картинка", def:"left", choices:[["left","слева"],["right","справа"]] },
      { id:"radius",type:"range",    label:"Скругление фото", def:12, min:0, max:30, unit:"px" },
    ],
    gen:function(c,id){
      var media = c.url
        ? '<img class="m" src="'+c.url+'" alt="">'
        : '<div class="m ph">картинка</div>';
      var txt = '<div class="t">\n    <h3>'+c.title+"</h3>\n    <p>"+c.text+"</p>\n  </div>";
      var order = c.side==="left" ? (media+"\n  "+txt) : (txt+"\n  "+media);
      var phCss = c.url ? "" :
        "\n.fmt-"+id+" .ph{ display:flex; align-items:center; justify-content:center; min-height:180px;\n  background:#2a2f36; color:#8a94a0; font-size:13px; }";
      return {
        css:".fmt-"+id+"{ display:grid; grid-template-columns:1fr 1fr; gap:24px; align-items:center; text-align:left; }\n"+
            ".fmt-"+id+" .m{ width:100%; border-radius:"+c.radius+"px; display:block; }\n"+
            ".fmt-"+id+" .t h3{ margin:0 0 10px; color:var(--fg); }\n"+
            ".fmt-"+id+" .t p{ margin:0; opacity:.82; line-height:1.7; }\n"+
            "@media(max-width:600px){ .fmt-"+id+"{ grid-template-columns:1fr; } }"+phCss,
        html:"<!-- \u270e картинка и текст рядом -->\n<div class=\"fmt-"+id+'">\n  '+order+"\n</div>",
        js:"" };
    }
  },

  image:{ glyph:"▧", name:"Картинка",
    options:[
      { id:"url",   type:"text",  label:"Ссылка на картинку", def:"", img:1 },
      { id:"alt",   type:"text",  label:"Подпись (alt)", def:"картинка" },
      { id:"width", type:"range", label:"Ширина", def:60, min:20, max:100, unit:"%" },
      { id:"radius",type:"range", label:"Скругление", def:10, min:0, max:40, unit:"px" },
      { id:"align", type:"select",label:"Выравнивание", def:"center", choices:[["left","слева"],["center","центр"],["right","справа"]] },
    ],
    gen:function(c,id){
      var inner = c.url
        ? '<img class="fimg-'+id+'" src="'+c.url+'" alt="'+c.alt+'">'
        : '<div class="fimg-'+id+' fimg-ph-'+id+'">картинка</div>';
      var phCss = c.url ? "" :
        "\n.fimg-ph-"+id+"{ display:inline-flex; align-items:center; justify-content:center;\n  height:180px; background:#2a2f36; color:#8a94a0; font-size:13px; }";
      return {
        css:".fwrap-"+id+"{ text-align:"+c.align+"; }\n"+
            ".fimg-"+id+"{ display:inline-block; width:"+c.width+"%; max-width:100%; border-radius:"+c.radius+"px; }"+phCss,
        html:"<!-- \u270e вставь ссылку на картинку в настройках -->\n"+wrapAlign(id, inner),
        js:"" };
    }
  },

  gallery:{ glyph:"▦", name:"Галерея",
    options:[
      { id:"urls",  type:"textarea", label:"Ссылки на фото (каждая с новой строки)", def:"", img:2 },
      { id:"cols",  type:"range", label:"Колонок", def:3, min:2, max:4, unit:"" },
      { id:"gap",   type:"range", label:"Промежуток", def:10, min:0, max:30, unit:"px" },
      { id:"radius",type:"range", label:"Скругление", def:8, min:0, max:30, unit:"px" },
    ],
    gen:function(c,id){
      var items = c.urls.split("\n").map(function(s){return s.trim();}).filter(Boolean);
      var cells = items.length
        ? items.map(function(u){return '  <img src="'+u+'" alt="">';}).join("\n")
        : '  <div class="ph">фото</div>\n  <div class="ph">фото</div>\n  <div class="ph">фото</div>';
      return {
        css:".fgal-"+id+"{ display:grid; grid-template-columns:repeat("+c.cols+",1fr); gap:"+c.gap+"px; }\n"+
            ".fgal-"+id+" img{ width:100%; aspect-ratio:1/1; object-fit:cover; border-radius:"+c.radius+"px; display:block; }\n"+
            ".fgal-"+id+" .ph{ display:flex; align-items:center; justify-content:center; aspect-ratio:1/1;\n"+
            "  background:#2a2f36; color:#8a94a0; font-size:12px; border-radius:"+c.radius+"px; }",
        html:"<!-- \u270e галерея: по одной ссылке на фото на строку -->\n<div class=\"fgal-"+id+'">\n'+cells+"\n</div>",
        js:"" };
    }
  },

  video:{ glyph:"▷", name:"Видео (YouTube)",
    options:[
      { id:"url",   type:"text",  label:"Ссылка на YouTube", def:"" },
      { id:"radius",type:"range", label:"Скругление", def:12, min:0, max:30, unit:"px" },
    ],
    gen:function(c,id){
      var vid="", m;
      if((m=c.url.match(/[?&]v=([\w-]{11})/))) vid=m[1];
      else if((m=c.url.match(/youtu\.be\/([\w-]{11})/))) vid=m[1];
      else if((m=c.url.match(/embed\/([\w-]{11})/))) vid=m[1];
      var inner = vid
        ? '<iframe src="https://www.youtube.com/embed/'+vid+'" allowfullscreen loading="lazy"></iframe>'
        : '<div class="ph">вставь ссылку на YouTube в настройках</div>';
      var phCss = vid ? "" :
        "\n.fvid-"+id+" .ph{ display:flex; align-items:center; justify-content:center; width:100%; height:100%;\n  background:#2a2f36; color:#8a94a0; font-size:13px; text-align:center; padding:0 16px; }";
      return {
        css:".fvid-"+id+"{ position:relative; width:100%; aspect-ratio:16/9; border-radius:"+c.radius+"px; overflow:hidden; background:#000; }\n"+
            ".fvid-"+id+" iframe{ position:absolute; inset:0; width:100%; height:100%; border:0; }"+phCss,
        html:"<!-- \u270e видео с YouTube -->\n<div class=\"fvid-"+id+'">'+inner+"</div>",
        js:"" };
    }
  },

  card:{ glyph:"▤", name:"Карточка",
    options:[
      { id:"title", type:"text",     label:"Заголовок", def:"Заголовок карточки" },
      { id:"body",  type:"textarea", label:"Текст",     def:"Короткое описание. Из таких карточек собираются ленты и списки." },
      { id:"accent",type:"tcolor",   token:"accent",  label:"Акцент",    def:"var(--accent)" },
      { id:"bg",    type:"tcolor",   token:"surface", label:"Фон",       def:"var(--surface)" },
      { id:"fg",    type:"tcolor",   token:"fg",      label:"Цвет текста", def:"var(--fg)" },
      { id:"radius",type:"range",    label:"Скругление",def:12, min:0, max:28, unit:"px" },
      { id:"align", type:"select",   label:"Выравнивание", def:"left", choices:[["left","слева"],["center","центр"]] },
    ],
    gen:function(c,id){ return {
      css:".fwrap-"+id+"{ text-align:"+c.align+"; }\n"+
          ".fcard-"+id+"{ display:inline-block; text-align:left; max-width:340px;\n"+
          "  background:"+c.bg+"; color:"+c.fg+"; border-left:3px solid "+c.accent+";\n"+
          "  border-radius:"+c.radius+"px; padding:18px 20px; }\n"+
          ".fcard-"+id+" h3{ margin:0 0 8px; font-size:17px; }\n"+
          ".fcard-"+id+" p{ margin:0; font-size:13px; opacity:.82; line-height:1.6; }",
      html:"<!-- \u270e карточка -->\n"+wrapAlign(id,
            '<article class="fcard-'+id+'"><h3>'+c.title+"</h3><p>"+c.body+"</p></article>"),
      js:"" }; }
  },

  button:{ glyph:"⬢", name:"Кнопка",
    options:[
      { id:"label", type:"text",  label:"Текст",  def:"Нажми меня" },
      { id:"link",  type:"text",  label:"Ссылка (href)", def:"#" },
      { id:"bg",    type:"tcolor",token:"accent", label:"Цвет фона", def:"var(--accent)" },
      { id:"fg",    type:"color", label:"Цвет текста", def:"#0b0d10" },
      { id:"radius",type:"range", label:"Скругление",  def:10, min:0, max:40, unit:"px" },
      { id:"pad",   type:"range", label:"Размер",      def:14, min:8, max:24, unit:"px" },
      { id:"align", type:"select",label:"Выравнивание",def:"center", choices:[["left","слева"],["center","центр"],["right","справа"]] },
      { id:"anim",  type:"select",label:"Анимация наведения", def:"rise", choices:[["none","нет"],["rise","подъём"],["glow","свечение"],["pulse","пульс"]] },
    ],
    gen:function(c,id){
      var anim = {
        none:"",
        rise:".fbtn-"+id+"{ transition:transform .15s; } .fbtn-"+id+":hover{ transform:translateY(-3px); }",
        glow:".fbtn-"+id+"{ transition:box-shadow .2s; } .fbtn-"+id+":hover{ box-shadow:0 0 18px "+c.bg+"; }",
        pulse:"@keyframes fpulse-"+id+"{ 0%,100%{transform:scale(1);} 50%{transform:scale(1.06);} } .fbtn-"+id+":hover{ animation:fpulse-"+id+" .8s ease infinite; }"
      }[c.anim];
      return {
        css:".fwrap-"+id+"{ text-align:"+c.align+"; }\n"+
            ".fbtn-"+id+"{ display:inline-block; text-decoration:none;\n"+
            "  background:"+c.bg+"; color:"+c.fg+"; border:none; border-radius:"+c.radius+"px;\n"+
            "  padding:"+c.pad+"px "+(c.pad*2)+"px; font-size:15px; font-weight:600; cursor:pointer; }"+
            (anim ? "\n"+anim : ""),
        html:"<!-- \u270e кнопка-ссылка -->\n"+wrapAlign(id, '<a class="fbtn-'+id+'" href="'+c.link+'">'+c.label+"</a>"),
        js:"" };
    }
  },

  form:{ glyph:"✉", name:"Форма",
    options:[
      { id:"title",   type:"text",  label:"Заголовок", def:"Напишите нам" },
      { id:"email",   type:"text",  label:"Куда присылать письма (ваш email)", def:"" },
      { id:"btnLabel",type:"text",  label:"Текст кнопки", def:"Отправить" },
      { id:"accent",  type:"tcolor",token:"accent",  label:"Акцент", def:"var(--accent)" },
      { id:"bg",      type:"tcolor",token:"surface", label:"Фон полей", def:"var(--surface)" },
      { id:"fg",      type:"tcolor",token:"fg",      label:"Цвет текста", def:"var(--fg)" },
      { id:"msgField",type:"toggle",label:"Поле «Сообщение»", def:true },
    ],
    gen:function(c,id){
      var msg = c.msgField ? '\n  <textarea name="fmsg" placeholder="Сообщение" rows="3"></textarea>' : "";
      var mail = String(c.email||"").trim();
      return {
        css:".fform-"+id+"{ display:flex; flex-direction:column; gap:10px; width:100%; max-width:420px; margin:0 auto; text-align:left; }\n"+
            ".fform-"+id+" h3{ margin:0 0 4px; color:"+c.fg+"; }\n"+
            ".fform-"+id+" input,.fform-"+id+" textarea{ background:"+c.bg+"; color:"+c.fg+"; border:1px solid rgba(127,127,127,.35);\n"+
            "  border-radius:8px; padding:11px 13px; font:inherit; font-size:15px; }\n"+
            ".fform-"+id+" button{ border:none; border-radius:8px; background:"+c.accent+"; color:#0b0d10;\n"+
            "  padding:13px; font-size:15px; font-weight:600; cursor:pointer; }\n"+
            ".fform-"+id+" .done-"+id+"{ font-size:13px; color:"+c.accent+"; }",
        html:"<!-- \u270e форма: письмо собирается в почтовой программе посетителя, сервер не нужен -->\n"+
             '<form class="fform-'+id+'" id="form-'+id+'">\n  <h3>'+c.title+"</h3>\n"+
             '  <input name="fname" type="text" placeholder="Имя">\n  <input name="fmail" type="email" placeholder="Email">'+msg+"\n"+
             '  <button type="submit">'+c.btnLabel+'</button>\n  <div class="done-'+id+'" id="done-'+id+'"></div>\n</form>',
        js:"// \u270e форма "+id+": открывает почту посетителя с уже заполненным письмом на ваш адрес\n"+
           "document.getElementById('form-"+id+"').addEventListener('submit', function(e){\n"+
           "  e.preventDefault();\n"+
           "  var f=e.target.elements, to="+JSON.stringify(mail)+";\n"+
           "  var body='Имя: '+f.fname.value+'\\nEmail: '+f.fmail.value+(f.fmsg?'\\n\\n'+f.fmsg.value:'');\n"+
           "  if(!to){ document.getElementById('done-"+id+"').textContent='Укажите email в настройках формы, чтобы письма приходили вам.'; return; }\n"+
           "  location.href='mailto:'+to+'?subject='+encodeURIComponent("+JSON.stringify(c.title)+")+'&body='+encodeURIComponent(body);\n"+
           "  document.getElementById('done-"+id+"').textContent='Открылась почта: письмо уже заполнено, осталось отправить.';\n"+
           "});" };
    }
  },


  accordion:{ glyph:"▸", name:"Спойлер",
    options:[
      { id:"question", type:"text",     label:"Вопрос / заголовок", def:"Как это работает?" },
      { id:"answer",   type:"textarea", label:"Ответ / текст", def:"Скрытый текст, который раскрывается по клику. Удобно для FAQ." },
      { id:"accent",   type:"tcolor",   token:"accent",  label:"Акцент", def:"var(--accent)" },
      { id:"bg",       type:"tcolor",   token:"surface", label:"Фон", def:"var(--surface)" },
      { id:"open",     type:"toggle",   label:"Открыт сразу", def:false },
    ],
    gen:function(c,id){ return {
      css:".facc-"+id+"{ background:"+c.bg+"; border-radius:10px; padding:6px 18px; text-align:left; }\n"+
          ".facc-"+id+" summary{ cursor:pointer; padding:12px 0; font-weight:600; color:"+c.accent+"; list-style:none; }\n"+
          ".facc-"+id+" summary::-webkit-details-marker{ display:none; }\n"+
          ".facc-"+id+" p{ margin:0 0 14px; opacity:.85; line-height:1.6; }",
      html:"<!-- \u270e спойлер: клик по заголовку раскрывает текст (тег details) -->\n"+
           '<details class="facc-'+id+'"'+(c.open?" open":"")+">\n  <summary>"+c.question+"</summary>\n  <p>"+c.answer+"</p>\n</details>",
      js:"" }; }
  },

  progress:{ glyph:"▬", name:"Полоса прогресса",
    options:[
      { id:"value",   type:"range",  label:"Заполнено", def:70, min:0, max:100, unit:"%" },
      { id:"color",   type:"tcolor", token:"accent", label:"Цвет полосы", def:"var(--accent)" },
      { id:"track",   type:"color",  label:"Цвет дорожки", def:"#232a32" },
      { id:"height",  type:"range",  label:"Толщина", def:12, min:4, max:40, unit:"px" },
      { id:"animate", type:"toggle", label:"Анимировать заполнение", def:true },
    ],
    gen:function(c,id){
      var fill = c.animate
        ? "@keyframes fprog-"+id+"{ from{width:0;} to{width:"+c.value+"%;} }\n.fprog-"+id+" .fill{ width:"+c.value+"%; animation:fprog-"+id+" 1s ease both; }"
        : ".fprog-"+id+" .fill{ width:"+c.value+"%; }";
      return {
        css:".fprog-"+id+"{ width:100%; height:"+c.height+"px; background:"+c.track+"; border-radius:999px; overflow:hidden; }\n"+
            ".fprog-"+id+" .fill{ height:100%; background:"+c.color+"; border-radius:999px; }\n"+fill,
        html:"<!-- \u270e полоса прогресса -->\n<div class=\"fprog-"+id+'"><div class="fill"></div></div>',
        js:"" };
    }
  },

  clock:{ glyph:"◷", name:"Часы",
    options:[
      { id:"size",    type:"range",  label:"Размер", def:34, min:16, max:64, unit:"px" },
      { id:"color",   type:"tcolor", token:"fg", label:"Цвет", def:"var(--fg)" },
      { id:"seconds", type:"toggle", label:"Показывать секунды", def:true },
      { id:"align",   type:"select", label:"Выравнивание", def:"center", choices:[["left","слева"],["center","центр"],["right","справа"]] },
    ],
    gen:function(c,id){
      var opt = c.seconds ? "{hour:'2-digit',minute:'2-digit',second:'2-digit'}" : "{hour:'2-digit',minute:'2-digit'}";
      return {
        css:".fwrap-"+id+"{ text-align:"+c.align+"; }\n"+
            ".fclock-"+id+"{ display:inline-block; font-size:"+c.size+"px; color:"+c.color+"; font-weight:700; font-variant-numeric:tabular-nums; }",
        html:"<!-- \u270e часы: время приходит из JS -->\n"+wrapAlign(id, '<div class="fclock-'+id+'" id="clock-'+id+'">--:--</div>'),
        js:"// \u270e часы "+id+": обновляются каждую секунду\n"+
           "(function(){ var el=document.getElementById('clock-"+id+"');\n"+
           "  function tick(){ el.textContent=new Date().toLocaleTimeString('ru-RU', "+opt+"); }\n"+
           "  tick(); setInterval(tick, 1000);\n})();" };
    }
  },

  timer:{ glyph:"⧗", name:"Таймер",
    options:[
      { id:"seconds", type:"number", label:"Секунд", def:60, step:5 },
      { id:"accent",  type:"tcolor", token:"accent", label:"Цвет кнопок", def:"var(--accent)" },
      { id:"size",    type:"range",  label:"Размер", def:32, min:18, max:56, unit:"px" },
      { id:"align",   type:"select", label:"Выравнивание", def:"center", choices:[["left","слева"],["center","центр"],["right","справа"]] },
    ],
    gen:function(c,id){ return {
      css:".fwrap-"+id+"{ text-align:"+c.align+"; }\n"+
          ".ftimer-"+id+"{ display:inline-flex; align-items:center; gap:14px; }\n"+
          ".ftimer-"+id+" .disp{ font-size:"+c.size+"px; font-weight:700; font-variant-numeric:tabular-nums; min-width:96px; text-align:center; }\n"+
          ".ftimer-"+id+" button{ border:none; border-radius:8px; background:"+c.accent+"; color:#0b0d10; padding:9px 15px; font-size:13px; cursor:pointer; }",
      html:"<!-- \u270e таймер обратного отсчёта -->\n"+wrapAlign(id,
           '<div class="ftimer-'+id+'"><span class="disp" id="disp-'+id+'">--:--</span>'+
           '<button id="start-'+id+'">старт</button><button id="reset-'+id+'">сброс</button></div>'),
      js:"// \u270e таймер "+id+": старт на "+c.seconds+" секунд\n"+
         "(function(){ var total="+c.seconds+", left=total, t=null;\n"+
         "  var disp=document.getElementById('disp-"+id+"');\n"+
         "  function show(){ var m=Math.floor(left/60), s=left%60; disp.textContent=(m<10?'0':'')+m+':'+(s<10?'0':'')+s; }\n"+
         "  function tick(){ if(left>0){ left--; show(); } else { clearInterval(t); t=null; } }\n"+
         "  document.getElementById('start-"+id+"').onclick=function(){ if(!t) t=setInterval(tick,1000); };\n"+
         "  document.getElementById('reset-"+id+"').onclick=function(){ clearInterval(t); t=null; left=total; show(); };\n"+
         "  show();\n})();" }; }
  },

  stopwatch:{ glyph:"⏱", name:"Секундомер",
    options:[
      { id:"accent", type:"tcolor", token:"accent", label:"Цвет кнопок", def:"var(--accent)" },
      { id:"size",   type:"range",  label:"Размер", def:32, min:18, max:56, unit:"px" },
      { id:"align",  type:"select", label:"Выравнивание", def:"center", choices:[["left","слева"],["center","центр"],["right","справа"]] },
    ],
    gen:function(c,id){ return {
      css:".fwrap-"+id+"{ text-align:"+c.align+"; }\n"+
          ".fsw-"+id+"{ display:inline-flex; align-items:center; gap:14px; }\n"+
          ".fsw-"+id+" .disp{ font-size:"+c.size+"px; font-weight:700; font-variant-numeric:tabular-nums; min-width:96px; text-align:center; }\n"+
          ".fsw-"+id+" button{ border:none; border-radius:8px; background:"+c.accent+"; color:#0b0d10; padding:9px 15px; font-size:13px; cursor:pointer; }",
      html:"<!-- \u270e секундомер: считает вверх -->\n"+wrapAlign(id,
           '<div class="fsw-'+id+'"><span class="disp" id="swd-'+id+'">00:00</span>'+
           '<button id="swb-'+id+'">старт</button><button id="swr-'+id+'">сброс</button></div>'),
      js:"// \u270e секундомер "+id+"\n"+
         "(function(){ var sec=0, t=null;\n"+
         "  var disp=document.getElementById('swd-"+id+"'), btn=document.getElementById('swb-"+id+"');\n"+
         "  function show(){ var m=Math.floor(sec/60), s=sec%60; disp.textContent=(m<10?'0':'')+m+':'+(s<10?'0':'')+s; }\n"+
         "  btn.onclick=function(){ if(t){ clearInterval(t); t=null; btn.textContent='старт'; }\n"+
         "    else { t=setInterval(function(){ sec++; show(); },1000); btn.textContent='стоп'; } };\n"+
         "  document.getElementById('swr-"+id+"').onclick=function(){ clearInterval(t); t=null; sec=0; show(); btn.textContent='старт'; };\n"+
         "})();" }; }
  },

  counter:{ glyph:"±", name:"Счётчик",
    options:[
      { id:"start",  type:"number", label:"Начальное число", def:0, step:1 },
      { id:"step",   type:"number", label:"Шаг", def:1, step:1 },
      { id:"accent", type:"tcolor", token:"accent", label:"Цвет кнопок", def:"var(--accent)" },
      { id:"size",   type:"range",  label:"Размер числа", def:30, min:18, max:54, unit:"px" },
      { id:"align",  type:"select", label:"Выравнивание", def:"center", choices:[["left","слева"],["center","центр"],["right","справа"]] },
    ],
    gen:function(c,id){ return {
      css:".fwrap-"+id+"{ text-align:"+c.align+"; }\n"+
          ".fcount-"+id+"{ display:inline-flex; align-items:center; gap:16px; }\n"+
          ".fcount-"+id+" button{ width:46px; height:46px; border:none; border-radius:10px;\n"+
          "  background:"+c.accent+"; color:#0b0d10; font-size:24px; cursor:pointer; }\n"+
          ".fcount-"+id+" span{ min-width:60px; text-align:center; font-weight:700; font-size:"+c.size+"px; }",
      html:"<!-- \u270e счётчик (логика - в JS ниже) -->\n"+wrapAlign(id,
           '<div class="fcount-'+id+'"><button id="dec-'+id+'">\u2212</button>'+
           '<span id="count-'+id+'">'+c.start+'</span><button id="inc-'+id+'">+</button></div>'),
      js:"// \u270e счётчик "+id+": начальное число и шаг\n"+
         "(function(){ var n="+c.start+", s="+c.step+", v=document.getElementById('count-"+id+"');\n"+
         "  document.getElementById('inc-"+id+"').onclick=function(){ n+=s; v.textContent=n; };\n"+
         "  document.getElementById('dec-"+id+"').onclick=function(){ n-=s; v.textContent=n; };\n})();" }; }
  },

  divider:{ glyph:"-", name:"Разделитель",
    options:[
      { id:"height", type:"range",  label:"Высота (пустота)", def:24, min:0, max:120, unit:"px" },
      { id:"line",   type:"toggle", label:"Показать линию", def:true },
      { id:"color",  type:"color",  label:"Цвет линии", def:"#2f3a44" },
    ],
    gen:function(c,id){ return {
      css:".fdiv-"+id+"{ height:"+c.height+"px; "+(c.line?("border-top:1px solid "+c.color+"; margin-top:"+(c.height/2)+"px;"):"")+" }",
      html:"<!-- \u270e разделитель -->\n<div class=\"fdiv-"+id+'"></div>',
      js:"" }; }
  },

  footer:{ glyph:"⊥", name:"Футер",
    options:[
      { id:"text",  type:"text",  label:"Копирайт / текст", def:"© 2026 Мой сайт" },
      { id:"links", type:"text",  label:"Ссылки (через запятую)", def:"Политика, Контакты" },
      { id:"bg",    type:"tcolor",token:"surface", label:"Фон", def:"var(--surface)" },
      { id:"fg",    type:"tcolor",token:"fg",      label:"Цвет текста", def:"var(--fg)" },
      { id:"accent",type:"tcolor",token:"accent",  label:"Акцент при наведении", def:"var(--accent)" },
    ],
    gen:function(c,id){
      var links=c.links.split(",").map(function(s){return s.trim();}).filter(Boolean).map(function(s){return '<a href="#">'+s+"</a>";}).join("");
      return {
        css:".ffoot-"+id+"{ display:flex; align-items:center; gap:16px; flex-wrap:wrap; padding:22px 20px; background:"+c.bg+"; color:"+c.fg+"; border-radius:10px; font-size:14px; }\n"+
            ".ffoot-"+id+" .cp{ opacity:.7; margin-right:auto; }\n"+
            ".ffoot-"+id+" a{ color:"+c.fg+"; text-decoration:none; opacity:.8; }\n"+
            ".ffoot-"+id+" a:hover{ color:"+c.accent+"; opacity:1; }",
        html:"<!-- \u270e подвал сайта -->\n"+'<footer class="ffoot-'+id+'"><span class="cp">'+c.text+"</span>"+links+"</footer>",
        js:"" };
    }
  },

  social:{ glyph:"@", name:"Соцссылки",
    options:[
      { id:"items", type:"textarea", label:"Строка: Название | ссылка", def:"Telegram | https://t.me/\nInstagram | https://instagram.com/\nYouTube | https://youtube.com/" },
      { id:"accent",type:"tcolor", token:"accent", label:"Цвет", def:"var(--accent)" },
      { id:"align", type:"select", label:"Выравнивание", def:"center", choices:[["flex-start","слева"],["center","центр"],["flex-end","справа"]] },
    ],
    gen:function(c,id){
      var pills=c.items.split("\n").map(function(s){return s.trim();}).filter(Boolean).map(function(line){
        var p=line.split("|"); return '<a href="'+((p[1]||"#").trim())+'">'+((p[0]||"").trim())+"</a>";
      }).join("");
      return {
        css:".fsoc-"+id+"{ display:flex; gap:10px; flex-wrap:wrap; justify-content:"+c.align+"; }\n"+
            ".fsoc-"+id+" a{ text-decoration:none; padding:9px 16px; border-radius:999px; border:1px solid "+c.accent+"; color:"+c.accent+"; font-size:13px; transition:background .15s,color .15s; }\n"+
            ".fsoc-"+id+" a:hover{ background:"+c.accent+"; color:#0b0d10; }",
        html:"<!-- \u270e соцссылки: строка = Название | ссылка -->\n"+'<div class="fsoc-'+id+'">'+pills+"</div>",
        js:"" };
    }
  },

  quote:{ glyph:"❝", name:"Цитата",
    options:[
      { id:"text",  type:"textarea", label:"Текст цитаты", def:"Отличный инструмент - собрал сайт за вечер." },
      { id:"author",type:"text",     label:"Автор", def:"Довольный пользователь" },
      { id:"accent",type:"tcolor",   token:"accent", label:"Цвет полоски", def:"var(--accent)" },
      { id:"size",  type:"range",    label:"Размер текста", def:20, min:14, max:34, unit:"px" },
    ],
    gen:function(c,id){ return {
      css:".fq-"+id+"{ border-left:3px solid "+c.accent+"; padding:6px 0 6px 20px; text-align:left; }\n"+
          ".fq-"+id+" p{ margin:0 0 8px; font-size:"+c.size+"px; font-style:italic; line-height:1.5; }\n"+
          ".fq-"+id+" .by{ opacity:.7; font-size:13px; }",
      html:"<!-- \u270e цитата / отзыв -->\n"+'<blockquote class="fq-'+id+'"><p>\u00ab'+c.text+'\u00bb</p><div class="by">\u2014 '+c.author+"</div></blockquote>",
      js:"" }; }
  },

  pricing:{ glyph:"₽", name:"Тариф",
    options:[
      { id:"title",   type:"text",     label:"Название", def:"Базовый" },
      { id:"price",   type:"text",     label:"Цена", def:"990 ₽" },
      { id:"period",  type:"text",     label:"Период", def:"в месяц" },
      { id:"features",type:"textarea", label:"Что входит (строка на пункт)", def:"Пункт первый\nПункт второй\nПункт третий" },
      { id:"btnLabel",type:"text",     label:"Текст кнопки", def:"Выбрать" },
      { id:"btnLink", type:"text",     label:"Ссылка кнопки", def:"#" },
      { id:"align",   type:"select",   label:"Выравнивание", def:"center", choices:[["left","слева"],["center","центр"]] },
      { id:"accent",  type:"tcolor",   token:"accent",  label:"Акцент", def:"var(--accent)" },
      { id:"bg",      type:"tcolor",   token:"surface", label:"Фон", def:"var(--surface)" },
      { id:"fg",      type:"tcolor",   token:"fg",      label:"Цвет текста", def:"var(--fg)" },
    ],
    gen:function(c,id){
      var feats=c.features.split("\n").map(function(s){return s.trim();}).filter(Boolean).map(function(s){return "    <li>"+s+"</li>";}).join("\n");
      return {
        css:".fwrap-"+id+"{ text-align:"+c.align+"; }\n"+
            ".fprice-"+id+"{ display:inline-block; text-align:center; min-width:240px; max-width:320px;\n"+
            "  background:"+c.bg+"; color:"+c.fg+"; border:1px solid "+c.accent+"; border-radius:14px; padding:26px 24px; }\n"+
            ".fprice-"+id+" h3{ margin:0 0 10px; font-size:18px; }\n"+
            ".fprice-"+id+" .price{ font-size:38px; font-weight:800; color:"+c.accent+"; }\n"+
            ".fprice-"+id+" .per{ opacity:.6; font-size:13px; margin-bottom:16px; }\n"+
            ".fprice-"+id+" ul{ list-style:none; padding:0; margin:0 0 18px; text-align:left; }\n"+
            ".fprice-"+id+" li{ padding:6px 0; opacity:.85; font-size:14px; border-bottom:1px solid rgba(127,127,127,.15); }\n"+
            ".fprice-"+id+" a{ display:inline-block; text-decoration:none; background:"+c.accent+"; color:#0b0d10; padding:12px 26px; border-radius:10px; font-weight:600; }",
        html:"<!-- \u270e тариф / прайс -->\n"+wrapAlign(id,
             '<div class="fprice-'+id+'">\n    <h3>'+c.title+'</h3>\n    <div class="price">'+c.price+'</div>\n    <div class="per">'+c.period+'</div>\n    <ul>\n'+feats+'\n    </ul>\n    <a href="'+c.btnLink+'">'+c.btnLabel+"</a>\n  </div>"),
        js:"" };
    }
  },

  stats:{ glyph:"№", name:"Показатели",
    options:[
      { id:"count", type:"select", label:"Сколько", def:"3", choices:[["2","два"],["3","три"]] },
      { id:"n1", type:"text", label:"Число 1", def:"100+" },
      { id:"l1", type:"text", label:"Подпись 1", def:"клиентов" },
      { id:"n2", type:"text", label:"Число 2", def:"5" },
      { id:"l2", type:"text", label:"Подпись 2", def:"лет на рынке" },
      { id:"n3", type:"text", label:"Число 3", def:"24/7" },
      { id:"l3", type:"text", label:"Подпись 3", def:"поддержка" },
      { id:"accent",type:"tcolor", token:"accent", label:"Цвет чисел", def:"var(--accent)" },
    ],
    gen:function(c,id){
      var n=c.count==="2"?2:3;
      var data=[[c.n1,c.l1],[c.n2,c.l2],[c.n3,c.l3]].slice(0,n);
      var cols=data.map(function(d){return '  <div><div class="num">'+d[0]+'</div><div class="lbl">'+d[1]+"</div></div>";}).join("\n");
      return {
        css:".fstat-"+id+"{ display:grid; grid-template-columns:repeat("+n+",1fr); gap:20px; text-align:center; }\n"+
            ".fstat-"+id+" .num{ font-size:40px; font-weight:800; color:"+c.accent+"; }\n"+
            ".fstat-"+id+" .lbl{ opacity:.7; font-size:14px; margin-top:4px; }\n"+
            "@media(max-width:600px){ .fstat-"+id+"{ grid-template-columns:1fr; } }",
        html:"<!-- \u270e показатели: число + подпись -->\n<div class=\"fstat-"+id+'">\n'+cols+"\n</div>",
        js:"" };
    }
  },

  map:{ glyph:"◉", name:"Карта",
    options:[
      { id:"query", type:"text",  label:"Адрес или место", def:"" },
      { id:"zoom",  type:"range", label:"Приближение", def:14, min:1, max:20, unit:"" },
      { id:"radius",type:"range", label:"Скругление", def:12, min:0, max:30, unit:"px" },
      { id:"height",type:"range", label:"Высота", def:300, min:180, max:520, unit:"px" },
    ],
    gen:function(c,id){
      var q=(c.query||"").trim();
      var inner = q
        ? '<iframe src="https://maps.google.com/maps?q='+encodeURIComponent(q)+"&z="+c.zoom+'&output=embed" loading="lazy"></iframe>'
        : '<div class="ph">укажи адрес в настройках</div>';
      var phCss = q ? "" : "\n.fmap-"+id+" .ph{ display:flex; align-items:center; justify-content:center; width:100%; height:100%;\n  background:#2a2f36; color:#8a94a0; font-size:13px; }";
      return {
        css:".fmap-"+id+"{ position:relative; width:100%; height:"+c.height+"px; border-radius:"+c.radius+"px; overflow:hidden; }\n"+
            ".fmap-"+id+" iframe{ position:absolute; inset:0; width:100%; height:100%; border:0; }"+phCss,
        html:"<!-- \u270e карта: адрес меняется в настройках -->\n<div class=\"fmap-"+id+'">'+inner+"</div>",
        js:"" };
    }
  }

};

var PALETTE = ["hero","navbar","heading","paragraph","list","columns","stats","mediatext","image","gallery","video","card","pricing","quote","button","form","map","social","accordion","progress","clock","timer","stopwatch","counter","divider","footer"];

/* ─────────────── СОСТОЯНИЕ ─────────────── */

/* ─────────────── ОБЩЕЕ ─────────────── */
function defaults(opts){ var c={}; opts.forEach(function(o){ if(o.type!=="presets" && o.type!=="section") c[o.id]=o.def; }); return c; }
var MB="\uE010", MM="\uE011", ME="\uE012";
function markBlock(uid, txt){ return MB+uid+MM+txt+ME; }
function stripMarks(s){ return s.replace(new RegExp(MB+".*?"+MM+"([\\s\\S]*?)"+ME,"g"), "$1"); }
function esc(s){ return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;"); }
function highlight(doc){
  var s=esc(doc).replace(/(&lt;!--[\s\S]*?--&gt;|\/\*[\s\S]*?\*\/|\/\/[^\n]*)/g, '<span class="cmt">$1</span>');
  s=s.replace(new RegExp(MB+"(.*?)"+MM+"([\\s\\S]*?)"+ME,"g"), function(m,uid,txt){ return '<span class="cblock" data-uid="'+uid+'">'+txt+"</span>"; });
  return s;
}

/* ─────────────── НОВЫЕ БЛОКИ: профиль, ссылки, отсчёт до даты ─────────────── */
RECIPES.profile = { glyph:"◉", name:"Профиль",
  options:[
    { id:"avatar", type:"text",     label:"Картинка-аватар (ссылка)", def:"", img:1 },
    { id:"name",   type:"text",     label:"Имя", def:"Ваше имя" },
    { id:"bio",    type:"textarea", label:"Пара слов о себе", def:"Чем вы занимаетесь и почему сюда стоит заглянуть." },
    { id:"size",   type:"range",    label:"Размер аватара", def:112, min:64, max:200, unit:"px" },
    { id:"accent", type:"tcolor",   token:"accent", label:"Цвет обводки", def:"var(--accent)" },
    { id:"fg",     type:"tcolor",   token:"fg",     label:"Цвет текста", def:"var(--fg)" },
  ],
  gen:function(c,id){
    var ini=String(c.name||"?").trim().split(/\s+/).map(function(w){return w.charAt(0);}).join("").slice(0,2).toUpperCase();
    var av=c.avatar ? '<img src="'+c.avatar+'" alt="">' : '<span>'+ini+'</span>';
    return {
      css:".fprof-"+id+"{ display:flex; flex-direction:column; align-items:center; gap:12px; text-align:center; color:"+c.fg+"; }\n"+
          ".fprof-"+id+" .av{ width:"+c.size+"px; height:"+c.size+"px; border-radius:50%; overflow:hidden; display:grid; place-items:center;\n"+
          "  border:3px solid "+c.accent+"; box-shadow:0 0 0 6px rgba(127,127,127,.12); font-size:"+Math.round(c.size*.36)+"px; font-weight:700; }\n"+
          ".fprof-"+id+" .av img{ width:100%; height:100%; object-fit:cover; }\n"+
          ".fprof-"+id+" h2{ margin:4px 0 0; font-size:26px; }\n"+
          ".fprof-"+id+" p{ margin:0; max-width:42ch; opacity:.8; line-height:1.6; }",
      html:"<!-- ✎ профиль: аватар, имя, пара строк -->\n"+
           '<section class="fprof-'+id+'">\n  <div class="av">'+av+'</div>\n  <h2>'+c.name+'</h2>\n  <p>'+c.bio+'</p>\n</section>' };
  }
};
RECIPES.links = { glyph:"☰", name:"Ссылки",
  options:[
    { id:"items",  type:"textarea", label:"Ссылки: в каждой строке «Название | адрес»", def:"Мой YouTube | https://youtube.com/\nTelegram-канал | https://t.me/\nНаписать мне | mailto:you@mail.com" },
    { id:"style",  type:"select",   label:"Вид кнопок", def:"fill", choices:[["fill","заливка"],["line","контур"],["soft","мягкий фон"]] },
    { id:"radius", type:"range",    label:"Скругление", def:14, min:0, max:30, unit:"px" },
    { id:"accent", type:"tcolor",   token:"accent",  label:"Цвет кнопок", def:"var(--accent)" },
    { id:"bg",     type:"tcolor",   token:"surface", label:"Мягкий фон", def:"var(--surface)" },
    { id:"fg",     type:"tcolor",   token:"fg",      label:"Цвет текста", def:"var(--fg)" },
  ],
  gen:function(c,id){
    var rows=String(c.items||"").split("\n").map(function(l){ var p=l.split("|"); return {t:(p[0]||"").trim(), u:(p.slice(1).join("|")||"#").trim()}; }).filter(function(r){return r.t;});
    var st={ fill:"background:"+c.accent+"; color:#0b0d10; border:2px solid "+c.accent+";",
             line:"background:transparent; color:"+c.fg+"; border:2px solid "+c.accent+";",
             soft:"background:"+c.bg+"; color:"+c.fg+"; border:2px solid transparent;" }[c.style];
    return {
      css:".flinks-"+id+"{ display:flex; flex-direction:column; gap:12px; width:100%; max-width:480px; margin:0 auto; }\n"+
          ".flinks-"+id+" a{ display:block; padding:16px 20px; border-radius:"+c.radius+"px; text-align:center; text-decoration:none;\n"+
          "  font-weight:600; font-size:16px; "+st+" transition:transform .15s, box-shadow .15s; }\n"+
          ".flinks-"+id+" a:hover{ transform:translateY(-2px); box-shadow:0 8px 24px -12px "+c.accent+"; }",
      html:"<!-- ✎ ссылки: каждая строка списка = кнопка -->\n"+
           '<nav class="flinks-'+id+'">\n'+rows.map(function(r){ return '  <a href="'+r.u+'" target="_blank" rel="noopener">'+r.t+'</a>'; }).join("\n")+'\n</nav>' };
  }
};
RECIPES.countdown = { glyph:"⧗", name:"Отсчёт до даты",
  options:[
    { id:"title",  type:"text",  label:"Подпись", def:"До события осталось" },
    { id:"date",   type:"date",  label:"Дата", def:"2026-12-31" },
    { id:"time",   type:"time",  label:"Время", def:"18:00" },
    { id:"done",   type:"text",  label:"Когда время пришло", def:"Событие уже началось!" },
    { id:"accent", type:"tcolor",token:"accent",  label:"Цвет цифр", def:"var(--accent)" },
    { id:"bg",     type:"tcolor",token:"surface", label:"Фон ячеек", def:"var(--surface)" },
    { id:"fg",     type:"tcolor",token:"fg",      label:"Цвет текста", def:"var(--fg)" },
  ],
  gen:function(c,id){
    var when=(c.date||"2026-12-31")+"T"+(c.time||"00:00")+":00";
    return {
      css:".fcd-"+id+"{ text-align:center; color:"+c.fg+"; }\n"+
          ".fcd-"+id+" .t{ opacity:.8; margin-bottom:12px; }\n"+
          ".fcd-"+id+" .g{ display:flex; justify-content:center; gap:10px; flex-wrap:wrap; }\n"+
          ".fcd-"+id+" .c{ min-width:76px; padding:14px 10px; border-radius:14px; background:"+c.bg+"; }\n"+
          ".fcd-"+id+" b{ display:block; font-size:34px; color:"+c.accent+"; font-variant-numeric:tabular-nums; }\n"+
          ".fcd-"+id+" small{ opacity:.7; font-size:12px; }",
      html:"<!-- ✎ отсчёт до даты: цифры обновляет скрипт внизу страницы -->\n"+
           '<section class="fcd-'+id+'" id="cd-'+id+'">\n  <div class="t">'+c.title+'</div>\n  <div class="g">'+
           '<div class="c"><b>0</b><small>дней</small></div><div class="c"><b>0</b><small>часов</small></div>'+
           '<div class="c"><b>0</b><small>минут</small></div><div class="c"><b>0</b><small>секунд</small></div></div>\n</section>',
      js:"// ✎ отсчёт "+id+": до "+when+" по времени посетителя\n"+
         "(function(){ var box=document.getElementById('cd-"+id+"'), end=new Date('"+when+"').getTime(), b=box.querySelectorAll('b');\n"+
         "  function tick(){ var s=Math.max(0,Math.floor((end-Date.now())/1000));\n"+
         "    if(!s){ box.querySelector('.g').textContent="+JSON.stringify(String(c.done)).replace(/</g,"\\u003c")+"; return; }\n"+
         "    [Math.floor(s/86400), Math.floor(s%86400/3600), Math.floor(s%3600/60), s%60].forEach(function(v,i){ b[i].textContent=v; });\n"+
         "    setTimeout(tick,1000); }\n  tick(); })();" };
  }
};

/* каталог блоков по группам: так их проще найти, чем в одной ленте */
var CATALOG = [
  { name:"Основа",              ids:["hero","profile","heading","paragraph","list","columns","stats","quote","divider","navbar","footer"] },
  { name:"Ссылки и контакты",   ids:["links","button","social","form"] },
  { name:"Картинки и видео",    ids:["image","mediatext","gallery","video","map"] },
  { name:"Интерактив (JavaScript)", ids:["countdown","timer","stopwatch","counter","clock","accordion","progress"] },
  { name:"Продажи",             ids:["card","pricing"] }
];

/* ─────────────── ШАБЛОНЫ: с них начинают, потом правят под себя ─────────────── */
var TEMPLATES = [
  { id:"links", name:"Страница-ссылки", desc:"Аватар, пара слов и кнопки на все ваши страницы. Как Linktree.", preset:"violet",
    page:{ width:520, gap:22 },
    blocks:[
      ["profile",{ name:"Ваше имя", bio:"Музыка, видео и всё, что я делаю. Ссылки ниже." }],
      ["links",{}],
      ["social",{}],
      ["footer",{ text:"© 2026", links:"" }]
    ] },
  { id:"card", name:"Визитка", desc:"Кто вы, чем занимаетесь, как связаться. Одна страница о себе или о деле.", preset:"minimal",
    blocks:[
      ["hero",{ title:"Иван Петров", subtitle:"Фотограф в Лодзи. Свадьбы, портреты, семейные съёмки.", btnLabel:"Написать мне", btnLink:"#contact" }],
      ["columns",{ i1:"◎", t1:"Портреты", x1:"Студия или улица, 1 час, 30 обработанных снимков.", i2:"♡", t2:"Свадьбы", x2:"Весь день от сборов до первого танца.", i3:"☺", t3:"Семья", x3:"Спокойная съёмка дома или в парке." }],
      ["form",{ title:"Записаться на съёмку" }],
      ["social",{}],
      ["footer",{ text:"© 2026 Иван Петров", links:"" }]
    ] },
  { id:"event", name:"Приглашение", desc:"День рождения, свадьба, концерт: дата, отсчёт, место на карте.", preset:"paper",
    blocks:[
      ["hero",{ title:"Приглашаем на праздник", subtitle:"Будем рады видеть вас 31 декабря в 18:00.", btnLabel:"Я приду", btnLink:"#form" }],
      ["countdown",{ title:"До праздника осталось" }],
      ["paragraph",{ text:"Возьмите хорошее настроение. Дресс-код: что-нибудь яркое.", align:"center" }],
      ["map",{ query:"Piotrkowska 100, Łódź" }],
      ["form",{ title:"Подтвердите, что придёте", msgField:true }],
      ["footer",{ text:"Ждём вас!", links:"" }]
    ] },
  { id:"portfolio", name:"Портфолио", desc:"Галерея работ, пара слов о себе и отзывы.", preset:"neon",
    blocks:[
      ["navbar",{ brand:"Моё портфолио", links:"Работы, Обо мне, Контакты" }],
      ["hero",{ title:"Рисую, монтирую, делаю обложки", subtitle:"Собрал здесь лучшие работы за последний год.", btnLabel:"Смотреть работы", btnLink:"#works" }],
      ["gallery",{}],
      ["quote",{ text:"Сделал обложку к нашему альбому за два дня, все в восторге.", author:"Музыкант, заказчик" }],
      ["links",{ items:"Behance | https://behance.net/\nНаписать мне | mailto:you@mail.com", style:"line" }],
      ["footer",{}]
    ] },
  { id:"landing", name:"Лендинг", desc:"Страница для услуги или проекта: преимущества, цифры, тарифы.", preset:"minimal",
    blocks:[
      ["navbar",{}],["hero",{}],["columns",{}],["stats",{}],["pricing",{}],["accordion",{}],["form",{}],["footer",{}]
    ] },
  { id:"blank", name:"С чистого листа", desc:"Пустая страница. Блоки добавляете сами.", preset:"neon", blocks:[] }
];

/* ─────────────── СБОРКА СТРАНИЦЫ ─────────────── */
/* mode: "file" (скачать), "code" (с метками для подсветки), "edit" (превью с выбором блоков касанием) */
function buildPage(st, mode, view){
  var marks=mode==="code", edit=mode==="edit"; view=view||{};
  var page=st.page;
  if(edit || view.still){ page={}; for(var k in st.page) page[k]=st.page[k]; page.anim="none"; if(edit) page.cursor="none"; }
  var pg=PAGE.gen(page), cssParts=[pg.css], bodyParts=[], jsParts=[];
  if(pg.js) jsParts.push(pg.js);
  if(st.blocks.length===0) bodyParts.push("  <!-- добавьте блоки -->");
  var needWrapAll=(page.anim!=="none");
  st.blocks.forEach(function(b){
    var r=RECIPES[b.rid]; if(!r) return;
    var out=r.gen(b.cfg,b.uid);
    var x=b.cfg.posX||0, y=b.cfg.posY||0, wrap=needWrapAll||x!==0||y!==0;
    var css=out.css, html=out.html, fx=b.cfg.fx||"none";
    if(fx!=="none"){
      css = fxCss(b.uid, fx, b.cfg.fxTrigger||"loop", fxDur(b.cfg.fxSpeed))+"\n"+css;
      html = '<div class="ffx-'+b.uid+'">\n'+html.split("\n").map(function(l){return "  "+l;}).join("\n")+"\n</div>";
    }
    if(wrap){
      css=".fpos-"+b.uid+"{ --x:"+x+"px; --y:"+y+"px; transform: translate(var(--x), var(--y)); }\n"+css;
      html='<div class="fpos-'+b.uid+'">\n'+html.split("\n").map(function(l){return "  "+l;}).join("\n")+"\n</div>";
    }
    var cssB="/* ── "+r.name+" ["+b.uid+"] ── */\n"+css;
    var htmlB=(edit?"<!--fb:"+b.uid+"-->\n":"")+"<!-- ▼ "+r.name+" -->\n"+html;
    htmlB=htmlB.split("\n").map(function(l){return "  "+l;}).join("\n");
    cssParts.push(marks?markBlock(b.uid,cssB):cssB);
    bodyParts.push(marks?markBlock(b.uid,htmlB):htmlB);
    if(out.js) jsParts.push(marks?markBlock(b.uid,out.js):out.js);
  });
  if(edit) cssParts.push(EDIT_CSS);
  var css=cssParts.join("\n\n"), body=bodyParts.join("\n\n"), js=jsParts.join("\n\n");
  return "<!DOCTYPE html>\n<html lang=\"ru\">\n<head>\n"+
         "  <meta charset=\"UTF-8\">\n  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\n"+
         "  <title>"+String(st.title||"Моя страница").replace(/</g,"&lt;")+"</title>\n  <style>\n"+css+"\n  </style>\n</head>\n<body>\n"+
         "  <main class=\"page\">\n"+body+"\n  </main>\n"+
         (js ? "  <script>\n"+js+"\n  <\/script>\n" : "")+
         (edit ? "  <script>"+EDIT_JS.replace("__SEL__",JSON.stringify(st.sel||"")).replace("__Y__",String(view.y|0)).replace("__GO__",view.go?"true":"false")+"<\/script>\n" : "")+
         "</body>\n</html>";
}
/* в режиме правки касание блока выбирает его в редакторе, а не жмёт кнопки внутри */
var EDIT_CSS=".fb-hov{ outline:2px dashed rgba(79,214,200,.55); outline-offset:4px; }\n.fb-sel{ outline:2px solid #4fd6c8 !important; outline-offset:4px; }";
var EDIT_JS="(function(){var SEL=__SEL__,Y=__Y__,GO=__GO__;"+
 "function first(n){while(n&&n.nodeType!==1)n=n.nextSibling;return n;}"+
 "function find(u){var w=document.createTreeWalker(document.body,128);while(w.nextNode()){if(w.currentNode.data==='fb:'+u)return first(w.currentNode.nextSibling);}return null;}"+
 "function blk(el){while(el&&el.parentElement&&!el.parentElement.classList.contains('page'))el=el.parentElement;if(!el||!el.parentElement)return null;"+
 "var n=el.previousSibling;while(n){if(n.nodeType===8&&/^fb:/.test(n.data))return{el:el,uid:n.data.slice(3)};n=n.previousSibling;}return null;}"+
 "function mark(u){document.querySelectorAll('.fb-sel').forEach(function(e){e.classList.remove('fb-sel');});var e=u?find(u):null;if(e)e.classList.add('fb-sel');return e;}"+
 "scrollTo(0,Y);var cur=mark(SEL);if(cur&&GO)cur.scrollIntoView({block:'center'});"+
 "addEventListener('load',function(){if(cur&&GO)cur.scrollIntoView({block:'center'});else scrollTo(0,Y);});"+
 "var tm=0;addEventListener('scroll',function(){clearTimeout(tm);tm=setTimeout(function(){parent.postMessage({forge:'y',y:scrollY},'*');},120);});"+
 "document.addEventListener('click',function(e){e.preventDefault();e.stopPropagation();var b=blk(e.target);if(!b)return;mark(b.uid);parent.postMessage({forge:'sel',uid:b.uid},'*');},true);"+
 "document.addEventListener('submit',function(e){e.preventDefault();},true);"+
 "document.addEventListener('mouseover',function(e){var b=blk(e.target);document.querySelectorAll('.fb-hov').forEach(function(x){x.classList.remove('fb-hov');});if(b)b.el.classList.add('fb-hov');});"+
 "addEventListener('message',function(e){if(e.data&&e.data.forge==='mark'){var el=mark(e.data.uid);if(el&&e.data.scroll)el.scrollIntoView({behavior:'smooth',block:'center'});}});"+
 "})();";

/* ─────────────── ПРОЕКТ: умолчания, шаблоны ─────────────── */
function blockOpts(rid){ return LAYOUT_OPTS.concat(EFFECT_OPTS, RECIPES[rid].options); }
function pageDefaults(){ var p={}; PAGE.options.forEach(function(o){ if(o.type!=="presets") p[o.id]=o.def; }); return p; }
function fillDefaults(st){
  if(!st.page) st.page={};
  PAGE.options.forEach(function(o){ if(o.type!=="presets" && !(o.id in st.page)) st.page[o.id]=o.def; });
  st.blocks=(st.blocks||[]).filter(function(b){ return RECIPES[b.rid]; });
  st.blocks.forEach(function(b){ if(!b.cfg) b.cfg={}; blockOpts(b.rid).forEach(function(o){ if(!(o.id in b.cfg)) b.cfg[o.id]=o.def; }); });
  return st;
}
function presetInto(page,name){ var t=PRESETS[name]; if(!t) return; ["bg","bg2","surface","fg","accent","font"].forEach(function(k){ page[k]=t[k]; }); }
function fromTemplate(tid){
  var t=TEMPLATES.filter(function(x){return x.id===tid;})[0]||TEMPLATES[TEMPLATES.length-1];
  var st={ title:t.id==="blank"?"Моя страница":t.name, page:pageDefaults(), blocks:[], seq:0, sel:"page" };
  presetInto(st.page,t.preset);
  if(t.page) for(var k in t.page) st.page[k]=t.page[k];
  t.blocks.forEach(function(e){ var uid="b"+(++st.seq), cfg=defaults(blockOpts(e[0])); for(var k in e[1]) cfg[k]=e[1][k]; st.blocks.push({uid:uid,rid:e[0],cfg:cfg}); });
  return st;
}

/* ─────────────── ССЫЛКА БЕЗ СЕРВЕРА ───────────────
   Страница целиком уезжает в адрес после #: только то, что отличается от умолчаний, сжато deflate и в base64url.
   На сервер ничего не уходит: часть после # браузер никуда не отправляет */
function packState(st){
  var p={}, d=pageDefaults(); for(var k in st.page) if(st.page[k]!==d[k]) p[k]=st.page[k];
  return { v:1, t:st.title||"", p:p, b:st.blocks.map(function(b){ var c={}, dd=defaults(blockOpts(b.rid)); for(var k in b.cfg) if(b.cfg[k]!==dd[k]) c[k]=b.cfg[k]; return [b.rid,c]; }) };
}
function unpackState(o){
  var st={ title:o.t||"", page:pageDefaults(), blocks:[], seq:0, sel:"page" };
  for(var k in (o.p||{})) st.page[k]=o.p[k];
  (o.b||[]).forEach(function(e){ if(!RECIPES[e[0]]) return; var cfg=defaults(blockOpts(e[0])); for(var k in (e[1]||{})) cfg[k]=e[1][k]; st.blocks.push({uid:"b"+(++st.seq),rid:e[0],cfg:cfg}); });
  return st;
}
function b64u(bytes){ var s=""; for(var i=0;i<bytes.length;i++) s+=String.fromCharCode(bytes[i]); return btoa(s).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,""); }
function unb64u(str){ var s=atob(str.replace(/-/g,"+").replace(/_/g,"/")); var a=new Uint8Array(s.length); for(var i=0;i<s.length;i++) a[i]=s.charCodeAt(i); return a; }
function encodeShare(st){
  var bytes=new TextEncoder().encode(JSON.stringify(packState(st)));
  if(typeof CompressionStream==="undefined") return Promise.resolve("j"+b64u(bytes));
  var cs=new Blob([bytes]).stream().pipeThrough(new CompressionStream("deflate-raw"));
  return new Response(cs).arrayBuffer().then(function(buf){ return "z"+b64u(new Uint8Array(buf)); });
}
function decodeShare(code){
  var kind=code.charAt(0), bytes=unb64u(code.slice(1));
  var done=function(b){ return unpackState(JSON.parse(new TextDecoder().decode(b))); };
  if(kind==="j") return Promise.resolve(done(bytes));
  var ds=new Blob([bytes]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
  return new Response(ds).arrayBuffer().then(function(buf){ return done(new Uint8Array(buf)); });
}
