/* FORGE: графическая мастерская, движок.
   Работа = холст нужного размера + слои (текст, фото, фигура, иконка). Рисуется на canvas,
   поэтому то, что видно на экране, точь-в-точь совпадает со скачанным файлом.
   Координаты слоёв в пикселях готовой картинки, x и y = центр слоя. */

var GSIZES = [
  { id:"cover",  name:"Обложка трека",  w:3000, h:3000, note:"Spotify, Яндекс Музыка" },
  { id:"yt",     name:"Превью YouTube", w:1280, h:720 },
  { id:"story",  name:"Сторис, Shorts", w:1080, h:1920 },
  { id:"post",   name:"Пост",           w:1080, h:1350 },
  { id:"square", name:"Квадрат",        w:1080, h:1080 },
  { id:"avatar", name:"Аватар",         w:1000, h:1000, round:true },
  { id:"card",   name:"Открытка",       w:1800, h:1200, note:"10x15 см для печати" },
  { id:"a4",     name:"Афиша A4",       w:2480, h:3508, note:"для печати" },
  { id:"bcard",  name:"Визитка",        w:1063, h:591,  note:"90x50 мм для печати" },
  { id:"banner", name:"Баннер YouTube", w:2560, h:1440 }
];
var BLENDS = [["source-over","обычное"],["multiply","умножение"],["screen","экран"],["overlay","перекрытие"],["soft-light","мягкий свет"],["color-dodge","осветление"]];
var SHAPES = [["rect","прямоугольник"],["round","плашка"],["circle","круг"],["tri","треугольник"],["star","звезда"],["heart","сердце"],["line","линия"]];
var FILTER_PRESETS = {
  none:   { name:"оригинал", br:0, ct:0, sat:0, warm:0, bw:0, sep:0 },
  warm:   { name:"тёплый",   br:3, ct:8, sat:25, warm:22, bw:0, sep:0 },
  cold:   { name:"холодный", br:0, ct:6, sat:5, warm:-28, bw:0, sep:0 },
  bw:     { name:"ч/б",      br:0, ct:18, sat:0, warm:0, bw:100, sep:0 },
  vintage:{ name:"винтаж",   br:5, ct:-8, sat:-15, warm:10, bw:0, sep:45 },
  vivid:  { name:"сочный",   br:2, ct:14, sat:45, warm:0, bw:0, sep:0 },
  fade:   { name:"пастель",  br:10, ct:-20, sat:-20, warm:4, bw:0, sep:0 }
};

/* ─────────── создание слоёв ─────────── */
var _gid=0;
function gid(){ return "L"+Date.now().toString(36)+(++_gid); }
function newWork(sizeId, w, h){
  var s=GSIZES.filter(function(x){ return x.id===sizeId; })[0]||{ id:"own", name:"Свой размер", w:w||1080, h:h||1080 };
  return { v:1, title:s.name, size:s.id, w:s.w, h:s.h, round:!!s.round, bg:{ t:"color", c1:"#15121f", c2:"#3a1d3a", ang:160 }, layers:[], assets:{} };
}
function textLayer(W, kind){
  var k=Math.min(W.w,W.h);
  var base={ id:gid(), t:"text", x:W.w/2, y:W.h/2, rot:0, op:1, blend:"source-over", text:"Текст", font:"manrope", weight:700, size:Math.round(k*.06),
    color:"#ffffff", align:"center", ls:0, lh:1.15, fx:{ t:"none", c:"#ff8a4c", c2:"#ff5fa2", a:50 } };
  if(kind==="h"){ base.text="ЗАГОЛОВОК"; base.font="unbounded"; base.weight=700; base.size=Math.round(k*.12); base.ls=2; }
  if(kind==="s"){ base.text="Подзаголовок"; base.size=Math.round(k*.055); base.weight=800; }
  if(kind==="p"){ base.text="Обычный текст\nв две строки"; base.size=Math.round(k*.04); base.weight=400; base.lh=1.35; }
  return base;
}
function imageLayer(W, asset, iw, ih){
  var k=Math.min(W.w*.7/iw, W.h*.7/ih);
  return { id:gid(), t:"image", x:W.w/2, y:W.h/2, w:Math.round(iw*k), h:Math.round(ih*k), rot:0, op:1, blend:"source-over",
    src:asset, iw:iw, ih:ih, mask:null, feather:2, zoom:1, fx:50, fy:50, shape:"rect", r:0, f:{ preset:"none", br:0, ct:0, sat:0, warm:0, bw:0, sep:0, blur:0 } };
}
function shapeLayer(W, kind){
  var k=Math.min(W.w,W.h)*.3;
  var L={ id:gid(), t:"shape", kind:kind, x:W.w/2, y:W.h/2, w:k, h:k, rot:0, op:1, blend:"source-over", fill:"#ff8a4c", fill2:"", ang:90, stroke:"", sw:0, r:0 };
  if(kind==="round"){ L.w=k*2; L.h=k*.5; L.r=L.h/2; }
  if(kind==="line"){ L.w=k*2; L.h=Math.max(4,k*.04); }
  return L;
}
function iconLayer(W, name){ var k=Math.min(W.w,W.h)*.18; return { id:gid(), t:"icon", name:name, x:W.w/2, y:W.h/2, w:k, h:k, rot:0, op:1, blend:"source-over", color:"#ffffff", sw:1.8 }; }

/* ─────────── картинки и шрифты ─────────── */
var IMG={}, PROC={}, onAsset=null;
function assetImg(W, id){
  var c=IMG[id]; if(c) return c.ok?c.im:null;
  var src=W.assets[id]; if(!src) return null;
  c=IMG[id]={ ok:false, im:new Image() };
  c.im.onload=function(){ c.ok=true; if(onAsset) onAsset(); }; c.im.src=src;
  return null;
}
var FONT_OK={};
function fontStr(L){ return L.weight+" "+L.size+"px "+fontStack(L.font); }
function ensureFont(L){
  var key=L.font+L.weight; if(FONT_OK[key]||!FONTS[L.font]||!FONTS[L.font].n||!document.fonts) return;
  FONT_OK[key]=1; document.fonts.load(L.weight+" 40px '"+FONTS[L.font].n+"'","АаBb").then(function(){ if(onAsset) onAsset(); }).catch(function(){});
}

/* фильтры: встроенные в canvas, где они работают, иначе считаем пиксели сами */
var NATIVE_FILTER=(function(){ try{ var c=document.createElement("canvas"); c.width=c.height=2; var g=c.getContext("2d"); if(!("filter" in g)) return false;
  g.filter="grayscale(1)"; g.fillStyle="#f00"; g.fillRect(0,0,2,2); var d=g.getImageData(0,0,1,1).data; return Math.abs(d[0]-d[1])<20; }catch(e){ return false; } })();
function filterKey(L){ var f=L.f; return [L.src,L.mask,L.feather,f.br,f.ct,f.sat,f.warm,f.bw,f.sep,f.blur].join("|"); }
function processed(W, L){
  var im=assetImg(W,L.src); if(!im) return null;
  var mk=L.mask?assetImg(W,L.mask):null; if(L.mask&&!mk) return null;
  var key=filterKey(L), c=PROC[L.id]; if(c&&c.key===key) return c.cv;
  var cv=document.createElement("canvas"); cv.width=im.naturalWidth; cv.height=im.naturalHeight; var g=cv.getContext("2d"), f=L.f;
  var plain=!f.br&&!f.ct&&!f.sat&&!f.warm&&!f.bw&&!f.sep&&!f.blur;
  if(plain||!NATIVE_FILTER){ g.drawImage(im,0,0); if(!plain) pixelFilter(g,cv.width,cv.height,f); }
  else { g.filter="brightness("+(100+f.br)+"%) contrast("+(100+f.ct)+"%) saturate("+(100+f.sat)+"%) grayscale("+f.bw+"%) sepia("+f.sep+"%)"+(f.blur?" blur("+f.blur+"px)":""); g.drawImage(im,0,0); g.filter="none"; if(f.warm) warmth(g,cv.width,cv.height,f.warm); }
  if(mk){ g.globalCompositeOperation="destination-in"; if(L.feather&&NATIVE_FILTER) g.filter="blur("+L.feather+"px)"; g.drawImage(mk,0,0,cv.width,cv.height); g.filter="none"; g.globalCompositeOperation="source-over"; }
  PROC[L.id]={ key:key, cv:cv }; return cv;
}
function warmth(g,w,h,a){ g.globalCompositeOperation="soft-light"; g.fillStyle=a>0?"rgba(255,140,40,"+(a/100)+")":"rgba(40,120,255,"+(-a/100)+")"; g.fillRect(0,0,w,h); g.globalCompositeOperation="source-over"; }
function pixelFilter(g,w,h,f){
  var id=g.getImageData(0,0,w,h), d=id.data, br=f.br*2.55, ct=(100+f.ct)/100, sat=(100+f.sat)/100, bw=f.bw/100, sp=f.sep/100, wm=f.warm/100;
  for(var i=0;i<d.length;i+=4){
    var r=d[i],gg=d[i+1],b=d[i+2];
    r=(r-128)*ct+128+br; gg=(gg-128)*ct+128+br; b=(b-128)*ct+128+br;
    var l=.299*r+.587*gg+.114*b; r=l+(r-l)*sat; gg=l+(gg-l)*sat; b=l+(b-l)*sat;
    if(bw){ r+=(l-r)*bw; gg+=(l-gg)*bw; b+=(l-b)*bw; }
    if(sp){ var sr=.393*r+.769*gg+.189*b, sg=.349*r+.686*gg+.168*b, sb=.272*r+.534*gg+.131*b; r+=(sr-r)*sp; gg+=(sg-gg)*sp; b+=(sb-b)*sp; }
    if(wm){ r+=wm*30; b-=wm*30; }
    d[i]=r<0?0:r>255?255:r; d[i+1]=gg<0?0:gg>255?255:gg; d[i+2]=b<0?0:b>255?255:b;
  }
  g.putImageData(id,0,0);
}

/* ─────────── размеры текста ─────────── */
var MCTX=document.createElement("canvas").getContext("2d");
function textMetrics(L){
  ensureFont(L); MCTX.font=fontStr(L);
  var lines=String(L.text||" ").split("\n"), ls=L.ls*L.size/100;
  var ws=lines.map(function(t){ return lineWidth(MCTX,t,ls); });
  var w=Math.max.apply(null,ws.concat([L.size*.3])), lh=L.size*L.lh;
  return { lines:lines, ws:ws, w:w, h:lh*lines.length, lh:lh, ls:ls };
}
function lineWidth(g,t,ls){ if(!ls) return g.measureText(t).width; var s=0; for(var i=0;i<t.length;i++) s+=g.measureText(t[i]).width+(i<t.length-1?ls:0); return s; }
function layerSize(L){ if(L.t==="text"){ var m=textMetrics(L), p=fxPad(L); return { w:m.w+p, h:m.h+p }; } return { w:L.w, h:L.h }; }
function fxPad(L){ var f=L.fx||{}; if(f.t==="glow") return L.size*f.a/100*.6; if(f.t==="stroke") return L.size*f.a/100*.25; if(f.t==="shadow") return L.size*f.a/100*.16; return 0; }

/* ─────────── контуры фигур ─────────── */
function shapePath(g,kind,w,h,r){
  var x=-w/2, y=-h/2; g.beginPath();
  if(kind==="circle"){ g.ellipse(0,0,w/2,h/2,0,0,Math.PI*2); }
  else if(kind==="tri"){ g.moveTo(0,y); g.lineTo(-x,-y); g.lineTo(x,-y); g.closePath(); }
  else if(kind==="star"){ for(var i=0;i<10;i++){ var a=-Math.PI/2+i*Math.PI/5, rr=i%2?.42:1; g.lineTo(Math.cos(a)*w/2*rr, Math.sin(a)*h/2*rr+h*.05); } g.closePath(); }
  else if(kind==="heart"){ g.moveTo(0,h*.42); g.bezierCurveTo(-w*.6,h*.02,-w*.5,-h*.52,0,-h*.18); g.bezierCurveTo(w*.5,-h*.52,w*.6,h*.02,0,h*.42); g.closePath(); }
  else { var rad=Math.max(0,Math.min(kind==="round"?Math.min(w,h)/2:(r||0),Math.min(w,h)/2)); if(g.roundRect) g.roundRect(x,y,w,h,rad); else { g.moveTo(x+rad,y); g.arcTo(-x,y,-x,-y,rad); g.arcTo(-x,-y,x,-y,rad); g.arcTo(x,-y,x,y,rad); g.arcTo(x,y,-x,y,rad); g.closePath(); } }
}
function fillOf(g,L,w,h){
  if(!L.fill2) return L.fill;
  var a=(L.ang||0)*Math.PI/180, dx=Math.cos(a)*w/2, dy=Math.sin(a)*h/2, gr=g.createLinearGradient(-dx,-dy,dx,dy); gr.addColorStop(0,L.fill); gr.addColorStop(1,L.fill2); return gr;
}

/* ─────────── рисование ─────────── */
/* тени и свечение в canvas не масштабируются вместе с холстом: умножаем на масштаб сами */
var SHADOW_K=1;
function drawWork(g, W, opt){
  opt=opt||{}; var s=opt.scale||1; SHADOW_K=s;
  g.save(); g.setTransform(s,0,0,s,opt.ox||0,opt.oy||0);
  if(W.round && opt.clipRound){ g.beginPath(); g.arc(W.w/2,W.h/2,W.w/2,0,Math.PI*2); g.clip(); }
  if(!opt.transparent){
    if(W.bg.t==="grad"){ var a=W.bg.ang*Math.PI/180, cx=W.w/2, cy=W.h/2, r=Math.hypot(W.w,W.h)/2, gr=g.createLinearGradient(cx-Math.sin(a)*r,cy+Math.cos(a)*r,cx+Math.sin(a)*r,cy-Math.cos(a)*r);
      gr.addColorStop(0,W.bg.c1); gr.addColorStop(1,W.bg.c2); g.fillStyle=gr; }
    else g.fillStyle=W.bg.c1;
    g.fillRect(0,0,W.w,W.h);
  }
  W.layers.forEach(function(L){ if(!L.hidden && L.id!==opt.skip) drawLayer(g,W,L); });
  g.restore();
}
function drawLayer(g,W,L){
  g.save(); g.translate(L.x,L.y); g.rotate((L.rot||0)*Math.PI/180); g.globalAlpha=L.op==null?1:L.op; g.globalCompositeOperation=L.blend||"source-over";
  if(L.t==="text") drawText(g,L);
  else if(L.t==="shape"){ if(L.kind==="line"){ g.fillStyle=fillOf(g,L,L.w,L.h); shapePath(g,"round",L.w,L.h,0); g.fill(); }
    else { shapePath(g,L.kind,L.w,L.h,L.r); g.fillStyle=fillOf(g,L,L.w,L.h); if(L.fill||L.fill2) g.fill(); if(L.stroke&&L.sw){ g.lineWidth=L.sw; g.strokeStyle=L.stroke; g.stroke(); } } }
  else if(L.t==="icon"){ var d=ICONS[L.name]; if(d){ var k=L.w/24; g.scale(k,L.h/24); g.translate(-12,-12); g.lineWidth=L.sw; g.lineCap="round"; g.lineJoin="round"; g.strokeStyle=L.color; g.stroke(new Path2D(d)); } }
  else if(L.t==="image"){
    var cv=processed(W,L);
    shapePath(g,L.shape,L.w,L.h,L.r); g.clip();
    if(cv){ var r=coverRect(L,cv.width,cv.height); g.drawImage(cv,r.x,r.y,r.w,r.h); }
    else { g.fillStyle="rgba(127,127,127,.25)"; g.fillRect(-L.w/2,-L.h/2,L.w,L.h); }
  }
  g.restore();
}
/* фото заполняет рамку целиком, лишнее обрезается; zoom и fx/fy сдвигают кадр */
function coverRect(L,iw,ih){
  var k=Math.max(L.w/iw,L.h/ih)*(L.zoom||1), w=iw*k, h=ih*k;
  return { x:-L.w/2-(w-L.w)*(L.fx/100), y:-L.h/2-(h-L.h)*(L.fy/100), w:w, h:h, k:k };
}
function drawText(g,L){
  var m=textMetrics(L), f=L.fx||{t:"none"}, a=(f.a||0)/100;
  g.font=fontStr(L); g.textBaseline="middle"; g.textAlign="left"; g.lineJoin="round";
  var y0=-m.h/2+m.lh/2;
  function each(fn){ m.lines.forEach(function(t,i){ var w=m.ws[i], x=L.align==="left"?-m.w/2:L.align==="right"?m.w/2-w:-w/2; fn(t,x,y0+i*m.lh); }); }
  function put(t,x,y,stroke){ if(!m.ls){ stroke?g.strokeText(t,x,y):g.fillText(t,x,y); return; }
    for(var i=0;i<t.length;i++){ stroke?g.strokeText(t[i],x,y):g.fillText(t[i],x,y); x+=g.measureText(t[i]).width+m.ls; } }
  var fill=L.color;
  if(f.t==="grad"){ var gr=g.createLinearGradient(-m.w/2,0,m.w/2,0); gr.addColorStop(0,f.c); gr.addColorStop(1,f.c2||L.color); fill=gr; }
  if(f.t==="shadow"){ g.shadowColor=f.c; g.shadowOffsetX=g.shadowOffsetY=L.size*a*.12*SHADOW_K; g.shadowBlur=L.size*a*.04*SHADOW_K; }
  if(f.t==="glow"){ g.shadowColor=f.c; g.shadowBlur=L.size*a*.6*SHADOW_K; g.fillStyle=fill; each(function(t,x,y){ put(t,x,y); }); }
  if(f.t==="stroke"){ g.lineWidth=L.size*a*.25; g.strokeStyle=f.c; each(function(t,x,y){ put(t,x,y,true); }); }
  g.fillStyle=fill; each(function(t,x,y){ put(t,x,y); });
}

/* ─────────── попадание пальцем ─────────── */
function toLocal(L,px,py){ var a=-(L.rot||0)*Math.PI/180, dx=px-L.x, dy=py-L.y; return { x:dx*Math.cos(a)-dy*Math.sin(a), y:dx*Math.sin(a)+dy*Math.cos(a) }; }
function hitLayer(W,px,py,pad){
  for(var i=W.layers.length-1;i>=0;i--){ var L=W.layers[i]; if(L.hidden) continue; var s=layerSize(L), p=toLocal(L,px,py), e=pad||0;
    if(Math.abs(p.x)<=s.w/2+e && Math.abs(p.y)<=Math.max(s.h,e*2)/2+e) return L; }
  return null;
}

/* ─────────── шаблоны ─────────── */
function T_text(W,o){ var L=textLayer(W,o.k||"s"); for(var k in o) if(k!=="k") L[k]=o[k]; if(o.fx) L.fx=Object.assign({t:"none",c:"#000",c2:"#fff",a:50},o.fx); return L; }
function T_shape(W,kind,o){ var L=shapeLayer(W,kind); for(var k in o) L[k]=o[k]; return L; }
function T_icon(W,name,o){ var L=iconLayer(W,name); for(var k in o) L[k]=o[k]; return L; }
var GTEMPLATES = [
  { id:"yt_loud", group:"yt", name:"Превью: громкое", size:"yt", make:function(W){ W.bg={t:"grad",c1:"#0d0f1a",c2:"#28104a",ang:120};
    W.layers=[ T_shape(W,"circle",{x:1010,y:360,w:560,h:560,fill:"#ff2e63",fill2:"#ffb547",ang:45}),
      T_text(W,{text:"Я ЗАПИСАЛ\nАЛЬБОМ\nЗА 7 ДНЕЙ",font:"unbounded",weight:700,size:96,x:430,y:350,align:"left",color:"#ffe14d",lh:1.05,fx:{t:"stroke",c:"#000",a:22}}),
      T_icon(W,"arrow",{x:860,y:560,w:170,h:170,color:"#ffffff",sw:2.6,rot:-20}) ]; } },
  { id:"yt_clean", group:"yt", name:"Превью: спокойное", size:"yt", make:function(W){ W.bg={t:"color",c1:"#f4f1ea",c2:"#f4f1ea",ang:0};
    W.layers=[ T_shape(W,"rect",{x:960,y:360,w:640,h:720,fill:"#1f9e7a"}),
      T_text(W,{text:"Как начать\nписать музыку",font:"montserrat",weight:800,size:78,x:330,y:320,align:"left",color:"#16332b",lh:1.1}),
      T_text(W,{text:"5 шагов без лишних денег",font:"montserrat",weight:600,size:34,x:330,y:470,align:"left",color:"#5c7f74"}),
      T_icon(W,"music",{x:960,y:360,w:300,h:300,color:"#ffffff",sw:1.6}) ]; } },
  { id:"cover_glow", group:"music", name:"Обложка: свечение", size:"cover", make:function(W){ W.bg={t:"grad",c1:"#1a1030",c2:"#ff7a45",ang:180};
    W.layers=[ T_shape(W,"circle",{x:1500,y:1750,w:1700,h:1700,fill:"#ffd166",fill2:"#ff5fa2",ang:90,op:.55,blend:"screen"}),
      T_shape(W,"line",{x:1500,y:2350,w:1500,h:10,fill:"#ff8a4c"}),
      T_text(W,{text:"СЕВЕР",font:"unbounded",weight:700,size:520,y:1500,rot:-4,ls:6,fx:{t:"glow",c:"#ff8a4c",a:60}}),
      T_text(W,{text:"ЛИЗА МОРОЗ",font:"manrope",weight:800,size:140,y:2520,ls:35}) ]; } },
  { id:"cover_mono", group:"music", name:"Обложка: строгая", size:"cover", make:function(W){ W.bg={t:"color",c1:"#0b0b0c",c2:"#0b0b0c",ang:0};
    W.layers=[ T_shape(W,"rect",{w:2600,h:2600,fill:"",stroke:"#e9e4da",sw:8}),
      T_text(W,{text:"тихие\nкомнаты",font:"playfair",weight:700,size:380,color:"#e9e4da",lh:1}),
      T_text(W,{text:"EP · 2026",font:"jbmono",weight:400,size:110,y:2550,color:"#e9e4da",ls:20}) ]; } },
  { id:"poster", group:"music", name:"Афиша концерта", size:"a4", make:function(W){ W.bg={t:"grad",c1:"#07090c",c2:"#21103a",ang:180};
    W.layers=[ T_shape(W,"circle",{x:1240,y:1250,w:1900,h:1900,fill:"#4fd6c8",fill2:"#a970ff",ang:120,op:.9}),
      T_text(W,{text:"ЖИВОЙ\nЗВУК",font:"unbounded",weight:700,size:330,y:1250,lh:1,fx:{t:"shadow",c:"#0b0d10",a:40}}),
      T_text(W,{text:"12 ДЕКАБРЯ · 20:00",font:"montserrat",weight:800,size:150,y:2600,color:"#4fd6c8"}),
      T_text(W,{text:"Лодзь, клуб «Пятый этаж»",font:"montserrat",weight:600,size:110,y:2820,color:"#ffffff"}),
      T_icon(W,"music",{x:1240,y:3180,w:220,h:220,color:"#a970ff",sw:1.6}) ]; } },
  { id:"story_quote", group:"fest", name:"Сторис с цитатой", size:"story", make:function(W){ W.bg={t:"grad",c1:"#0b1024",c2:"#6d8bff",ang:200};
    W.layers=[ T_shape(W,"round",{x:540,y:960,w:900,h:900,r:60,kind:"rect",fill:"rgba(255,255,255,.1)",stroke:"rgba(255,255,255,.35)",sw:3}),
      T_text(W,{text:"«",font:"playfair",weight:800,size:300,y:640,color:"#a970ff"}),
      T_text(W,{text:"Делай то,\nчто любишь,\nи не спрашивай\nразрешения",font:"montserrat",weight:700,size:72,y:960,lh:1.25}),
      T_text(W,{text:"твоё имя",font:"montserrat",weight:600,size:44,y:1290,color:"#c9d4ff"}) ]; } },
  { id:"bday", group:"fest", name:"Открытка: день рождения", size:"card", make:function(W){ W.bg={t:"grad",c1:"#fff0f5",c2:"#ffd6e4",ang:160};
    W.layers=[ T_shape(W,"star",{x:300,y:260,w:220,h:220,fill:"#ffb547",rot:-12}), T_shape(W,"heart",{x:1520,y:930,w:260,h:240,fill:"#ff5c8a",rot:10}),
      T_shape(W,"circle",{x:1560,y:250,w:130,h:130,fill:"#7bd3b4"}), T_shape(W,"circle",{x:230,y:950,w:90,h:90,fill:"#a970ff"}),
      T_text(W,{text:"С днём\nрождения!",font:"comfortaa",weight:700,size:230,color:"#ff5c8a",lh:1.05,fx:{t:"shadow",c:"#ffd1df",a:45}}),
      T_text(W,{text:"Маше 7 лет",font:"nunito",weight:800,size:90,y:930,color:"#3d2433"}) ]; } },
  { id:"wedding", group:"fest", name:"Приглашение на свадьбу", size:"post", make:function(W){ W.bg={t:"color",c1:"#fbf7f0",c2:"#fbf7f0",ang:0};
    W.layers=[ T_shape(W,"rect",{w:940,h:1210,fill:"",stroke:"#b98b5e",sw:3}),
      T_text(W,{text:"приглашаем на свадьбу",font:"cormorant",weight:600,size:46,y:330,color:"#8a6a4c",ls:10}),
      T_text(W,{text:"Ирина\n&\nМарек",font:"playfair",weight:700,size:150,y:640,color:"#2b2420",lh:1.05}),
      T_shape(W,"line",{y:930,w:300,h:3,fill:"#b98b5e"}),
      T_text(W,{text:"14 июня 2027 · 14:00",font:"cormorant",weight:700,size:58,y:1010,color:"#2b2420"}),
      T_text(W,{text:"Усадьба «Над рекой»",font:"cormorant",weight:600,size:46,y:1080,color:"#8a6a4c"}) ]; } },
  { id:"sale", group:"biz", name:"Пост: скидка", size:"square", make:function(W){ W.bg={t:"color",c1:"#111317",c2:"#111317",ang:0};
    W.layers=[ T_shape(W,"circle",{x:540,y:500,w:720,h:720,fill:"#ffe14d"}),
      T_text(W,{text:"-20%",font:"unbounded",weight:700,size:230,y:470,color:"#111317"}),
      T_text(W,{text:"на всё до воскресенья",font:"montserrat",weight:800,size:56,y:640,color:"#111317"}),
      T_text(W,{text:"Кофейня «Зерно» · Пётрковская 100",font:"montserrat",weight:600,size:40,y:960,color:"#ffffff"}) ]; } },
  { id:"wifi", group:"biz", name:"Табличка для кафе", size:"a4", make:function(W){ W.bg={t:"color",c1:"#132219",c2:"#132219",ang:0};
    W.layers=[ T_text(W,{text:"Добро пожаловать",font:"cormorant",weight:700,size:230,y:700,color:"#f1ead6"}),
      T_shape(W,"line",{y:900,w:900,h:6,fill:"#d9b36c"}),
      T_icon(W,"coffee",{y:1500,w:700,h:700,color:"#d9b36c",sw:1.2}),
      T_text(W,{text:"Wi-Fi: Zerno_Guest\nпароль: kofe2026",font:"montserrat",weight:600,size:110,y:2450,color:"#f1ead6",lh:1.4}),
      T_text(W,{text:"Каждый день 8:00-20:00",font:"montserrat",weight:600,size:90,y:3100,color:"#9fc58b"}) ]; } },
  { id:"bcard", group:"biz", name:"Визитка", size:"bcard", make:function(W){ W.bg={t:"color",c1:"#ffffff",c2:"#ffffff",ang:0};
    W.layers=[ T_shape(W,"rect",{x:60,y:295,w:120,h:591,fill:"#3b82f6"}),
      T_text(W,{text:"Иван Петров",font:"inter",weight:800,size:70,x:560,y:200,color:"#111317"}),
      T_text(W,{text:"фотограф",font:"inter",weight:600,size:40,x:560,y:270,color:"#6b7280"}),
      T_text(W,{text:"+48 600 000 000\nivan@mail.com",font:"inter",weight:600,size:36,x:560,y:420,color:"#111317",lh:1.5}) ]; } }
];
var GTPL_GROUPS=[["yt","YouTube"],["music","Музыка"],["fest","Праздник"],["biz","Дело"]];
function fromGTemplate(id){
  var t=GTEMPLATES.filter(function(x){ return x.id===id; })[0]; var W=newWork(t.size); W.title=t.name; t.make(W);
  W.layers.forEach(function(L){ if(L.t==="text"&&L.x===undefined) L.x=W.w/2; }); return W;
}
