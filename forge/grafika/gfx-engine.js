/* FORGE: графическая мастерская, движок.
   Работа = холст нужного размера + слои (текст, фото, фигура, иконка, QR-код, рисунок от руки). Рисуется на canvas,
   поэтому то, что видно на экране, точь-в-точь совпадает со скачанным файлом.
   Координаты слоёв в пикселях готовой картинки, x и y = центр слоя.
   Фон W.bg: { t: color | grad | fony | none, c1, c2, c3 (третий цвет, может быть пустым), gt: lin | rad, ang, fb (фон из мастерской фонов) }.
   Группа: у слоёв одной группы одинаковое поле g. Заливка текста L.tf: { t: grad, c1, c2, c3, ang } или { t: img, src, z, px, py }. */

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
var SHAPES = [["rect","прямоугольник"],["round","плашка"],["circle","круг"],["tri","треугольник"],["star","звезда"],["heart","сердце"],["line","линия"],
  ["larrow","линия со стрелкой"],["arrow","стрелка"],["arrow2","стрелка в обе стороны"],["bubble","облачко речи"],["bubbleo","овальное облачко"],["cloud","облако"],
  ["diamond","ромб"],["hex","шестиугольник"],["burst","вспышка"],["bolt","молния"],["cross","плюс"]];
function isLine(k){ return k==="line"||k==="larrow"; }
var FILTER_PRESETS = {
  none:   { name:"оригинал" },
  warm:   { name:"тёплый",   br:3, ct:8, sat:25, warm:22 },
  cold:   { name:"холодный", ct:6, sat:5, warm:-28 },
  vivid:  { name:"сочный",   br:2, ct:14, sat:45 },
  golden: { name:"золотой час", br:4, sat:15, tc:"#ffb000", ta:24 },
  sunset: { name:"закат",    ct:5, sat:25, tc:"#ff4a2a", ta:26 },
  cinema: { name:"кино",     br:-4, ct:15, sat:-8, tc:"#0e6a78", ta:24, vig:35 },
  drama:  { name:"драма",    br:-5, ct:30, sat:-15, vig:45 },
  fade:   { name:"пастель",  br:10, ct:-20, sat:-20, warm:4 },
  matte:  { name:"выцветший", br:6, ct:-12, sat:-40, tc:"#222a32", ta:100, tm:"lighten" },
  polaroid:{ name:"полароид", br:6, ct:-5, sat:20, sep:12, tc:"#1c1622", ta:100, tm:"lighten", vig:20 },
  film:   { name:"плёнка",   ct:6, sat:-5, tc:"#ff9a3c", ta:10, vig:30, gr:22 },
  vintage:{ name:"винтаж",   br:5, ct:-8, sat:-15, warm:10, sep:45 },
  sepia:  { name:"сепия",    ct:5, sep:85 },
  bw:     { name:"ч/б",      ct:18, bw:100 },
  noir:   { name:"нуар",     br:-8, ct:40, bw:100, vig:60, gr:14 },
  forest: { name:"лес",      ct:5, sat:15, tc:"#1f8a3c", ta:20 },
  frost:  { name:"мороз",    br:6, ct:5, sat:-20, tc:"#9fd0ff", ta:28 },
  rose:   { name:"розовый",  sat:10, tc:"#ff5fa2", ta:22 },
  neon:   { name:"неон",     ct:15, sat:70, tc:"#b400ff", ta:18 }
};
var F_KEYS=["br","ct","sat","warm","bw","sep","tc","ta","tm","vig","gr"];
function applyPreset(f,id){ var p=FILTER_PRESETS[id]||FILTER_PRESETS.none; F_KEYS.forEach(function(k){ f[k]=p[k]!=null?p[k]:(k==="tc"||k==="tm"?"":0); }); f.preset=id; }

/* ─────────── создание слоёв ─────────── */
var _gid=0;
function gid(){ return "L"+Date.now().toString(36)+(++_gid); }
function newWork(sizeId, w, h){
  var s=GSIZES.filter(function(x){ return x.id===sizeId; })[0]||{ id:"own", name:"Свой размер", w:w||1080, h:h||1080 };
  return { v:1, title:TR(s.name), size:s.id, w:s.w, h:s.h, round:!!s.round, bg:{ t:"color", c1:"#15121f", c2:"#3a1d3a", ang:160 }, layers:[], assets:{} };
}
function textLayer(W, kind){
  var k=Math.min(W.w,W.h);
  var base={ id:gid(), t:"text", x:W.w/2, y:W.h/2, rot:0, op:1, blend:"source-over", text:TR("Текст"), font:"manrope", weight:700, size:Math.round(k*.06),
    color:"#ffffff", align:"center", ls:0, lh:1.15, fx:{ t:"none", c:"#ff8a4c", c2:"#ff5fa2", a:50 } };
  if(kind==="h"){ base.text=TR("ЗАГОЛОВОК"); base.font="unbounded"; base.weight=700; base.size=Math.round(k*.12); base.ls=2; }
  if(kind==="s"){ base.text=TR("Подзаголовок"); base.size=Math.round(k*.055); base.weight=800; }
  if(kind==="p"){ base.text=TR("Обычный текст\nв две строки"); base.size=Math.round(k*.04); base.weight=400; base.lh=1.35; }
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
  if(isLine(kind)){ L.w=k*2; L.h=Math.max(4,k*.04); }
  if(kind==="arrow"||kind==="arrow2"){ L.w=k*1.7; L.h=k*.8; }
  if(kind==="bubble"||kind==="bubbleo"||kind==="cloud"){ L.w=k*1.7; L.h=k*1.1; L.fill="#ffffff"; }
  if(kind==="bolt"){ L.w=k*.7; L.h=k*1.15; L.fill="#ffd166"; }
  return L;
}
/* рисунок от руки: штрихи в своих координатах от центра слоя; bw и bh размер рисунка в момент рисования, w и h нынешний */
function drawLayerNew(W){ return { id:gid(), t:"draw", x:W.w/2, y:W.h/2, w:W.w, h:W.h, bw:W.w, bh:W.h, rot:0, op:1, blend:"source-over", strokes:[] }; }
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
function filterKey(L){ var f=L.f; return [L.src,L.mask,L.fg,L.feather,f.br,f.ct,f.sat,f.warm,f.bw,f.sep,f.blur,f.tc,f.ta,f.tm,f.vig,f.gr].join("|"); }
var GNOISE=null;
function gnoise(){ if(GNOISE) return GNOISE; GNOISE=document.createElement("canvas"); GNOISE.width=GNOISE.height=192; var x=GNOISE.getContext("2d"), d=x.createImageData(192,192); for(var i=0;i<d.data.length;i+=4){ var v=Math.random()*255|0; d.data[i]=d.data[i+1]=d.data[i+2]=v; d.data[i+3]=255; } x.putImageData(d,0,0); return GNOISE; }
/* фото с фильтром на холст g размером w x h: цвет, тепло, оттенок, виньетка, зерно */
function filterDraw(g,im,w,h,f){
  var br=f.br||0, ct=f.ct||0, sat=f.sat||0, bw=f.bw||0, sep=f.sep||0, plain=!br&&!ct&&!sat&&!f.warm&&!bw&&!sep&&!f.blur;
  if(plain||!NATIVE_FILTER){ g.drawImage(im,0,0,w,h); if(!plain) pixelFilter(g,w,h,f); }
  else { g.filter="brightness("+(100+br)+"%) contrast("+(100+ct)+"%) saturate("+(100+sat)+"%) grayscale("+bw+"%) sepia("+sep+"%)"+(f.blur?" blur("+f.blur*w/(im.naturalWidth||im.width||w)+"px)":""); g.drawImage(im,0,0,w,h); g.filter="none"; if(f.warm) warmth(g,w,h,f.warm); }
  if(f.tc&&f.ta){ g.globalCompositeOperation=f.tm||"soft-light"; g.globalAlpha=f.ta/100; g.fillStyle=f.tc; g.fillRect(0,0,w,h); g.globalAlpha=1; g.globalCompositeOperation="source-over"; }
  if(f.vig){ var gr=g.createRadialGradient(w/2,h/2,Math.min(w,h)*.35,w/2,h/2,Math.max(w,h)*.75); gr.addColorStop(0,"rgba(0,0,0,0)"); gr.addColorStop(1,"rgba(10,6,0,"+(f.vig/100)+")"); g.fillStyle=gr; g.fillRect(0,0,w,h); }
  if(f.gr){ var k=Math.max(1,Math.round(Math.max(w,h)/900)); g.save(); g.globalCompositeOperation="overlay"; g.globalAlpha=f.gr/100; g.scale(k,k); g.fillStyle=g.createPattern(gnoise(),"repeat"); g.fillRect(0,0,w/k+1,h/k+1); g.restore(); }
}
function processed(W, L){
  var im=assetImg(W,L.src); if(!im) return null;
  var mk=L.mask?assetImg(W,L.mask):null; if(L.mask&&!mk) return null;
  var fg=L.mask&&L.fg?assetImg(W,L.fg):null; if(L.mask&&L.fg&&!fg) return null;
  var key=filterKey(L), c=PROC[L.id]; if(c&&c.key===key) return c.cv;
  var cv=document.createElement("canvas"); cv.width=im.naturalWidth; cv.height=im.naturalHeight; var g=cv.getContext("2d"), src=im;
  /* у вырезанного фото край перекрашен в цвет предмета (см. «убрать фон»): так не остаётся ореола от старого фона */
  if(fg){ src=document.createElement("canvas"); src.width=cv.width; src.height=cv.height; var sx=src.getContext("2d"); sx.drawImage(im,0,0); sx.imageSmoothingQuality="high"; sx.drawImage(fg,0,0,cv.width,cv.height); }
  filterDraw(g,src,cv.width,cv.height,L.f);
  if(mk){ g.globalCompositeOperation="destination-in"; if(L.feather&&NATIVE_FILTER) g.filter="blur("+L.feather+"px)"; g.drawImage(mk,0,0,cv.width,cv.height); g.filter="none"; g.globalCompositeOperation="source-over"; }
  PROC[L.id]={ key:key, cv:cv }; return cv;
}
/* обводка вырезанного фото «как у стикера»: силуэт раздвигается на p пикселей фото и заливается цветом, фото ложится сверху */
var OUTC={};
function outlined(L,cv,p,col){ var key=filterKey(L)+"|"+p.toFixed(1)+col, c=OUTC[L.id]; if(c&&c.key===key&&c.src===cv) return c;
  var P=Math.ceil(p)+2, o=document.createElement("canvas"); o.width=cv.width+P*2; o.height=cv.height+P*2; var g=o.getContext("2d"), n=Math.max(16,Math.min(48,Math.round(p*1.2)));
  for(var i=0;i<n;i++){ var a=i/n*Math.PI*2; g.drawImage(cv,P+Math.cos(a)*p,P+Math.sin(a)*p); } if(p>6) for(i=0;i<n;i++){ a=i/n*Math.PI*2; g.drawImage(cv,P+Math.cos(a)*p*.5,P+Math.sin(a)*p*.5); }
  g.globalCompositeOperation="source-in"; g.fillStyle=col; g.fillRect(0,0,o.width,o.height); g.globalCompositeOperation="source-over"; g.drawImage(cv,P,P);
  c=OUTC[L.id]={ key:key, src:cv, cv:o, p:P }; return c; }
function warmth(g,w,h,a){ g.globalCompositeOperation="soft-light"; g.fillStyle=a>0?"rgba(255,140,40,"+(a/100)+")":"rgba(40,120,255,"+(-a/100)+")"; g.fillRect(0,0,w,h); g.globalCompositeOperation="source-over"; }
function pixelFilter(g,w,h,f){
  var id=g.getImageData(0,0,w,h), d=id.data, br=(f.br||0)*2.55, ct=(100+(f.ct||0))/100, sat=(100+(f.sat||0))/100, bw=(f.bw||0)/100, sp=(f.sep||0)/100, wm=(f.warm||0)/100;
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
function platePad(L){ return L.plate&&L.plate.on&&!L.arc?L.size*(L.plate.p==null?35:L.plate.p)/100:0; }
function layerSize(L){ if(L.t==="text"){ var p=fxPad(L); if(L.arc){ var ag=arcGeom(L); return { w:ag.w+p, h:ag.h+p }; } var m=textMetrics(L), pp=platePad(L); return { w:m.w+Math.max(p,pp*2), h:m.h+Math.max(p,pp*1.3) }; } return { w:L.w, h:L.h }; }
/* текст по дуге: буквы встают по окружности. arc от -100 до 100: плюс = дуга вверх, минус = вниз, 100 = почти полный круг */
var AGC={};
function arcGeom(L){
  ensureFont(L); var key=[L.text,L.font,L.weight,L.size,L.ls,L.arc].join("|"), c0=AGC[L.id]; if(c0&&c0.key===key) return c0.g;
  MCTX.font=fontStr(L);
  var t=String(L.text||" ").replace(/\s*\n\s*/g," "), ls=L.ls*L.size/100, ws=[], tot=0, i;
  for(i=0;i<t.length;i++){ var w=MCTX.measureText(t[i]).width; ws.push(w); tot+=w+(i<t.length-1?ls:0); }
  var a=Math.max(-100,Math.min(100,L.arc||0)), th=Math.max(.05,Math.abs(a)/100*Math.PI*2*.96), R=Math.max(1,tot/th), up=a>0;
  var chars=[], pos=-tot/2, mnx=Infinity, mxx=-Infinity, mny=Infinity, mxy=-Infinity, hh=L.size*.6;
  for(i=0;i<t.length;i++){
    var ang=(pos+ws[i]/2)/R, x=R*Math.sin(ang), y=up?-R*Math.cos(ang):R*Math.cos(ang), rot=up?ang:-ang, cs=Math.cos(rot), sn=Math.sin(rot), hw=ws[i]/2;
    [[-hw,-hh],[hw,-hh],[hw,hh],[-hw,hh]].forEach(function(q){ var px=x+q[0]*cs-q[1]*sn, py=y+q[0]*sn+q[1]*cs; if(px<mnx)mnx=px; if(px>mxx)mxx=px; if(py<mny)mny=py; if(py>mxy)mxy=py; });
    chars.push({ c:t[i], x:x, y:y, r:rot, k:t.length>1?i/(t.length-1):0 }); pos+=ws[i]+ls;
  }
  var cx=(mnx+mxx)/2, cy=(mny+mxy)/2; chars.forEach(function(ch){ ch.x-=cx; ch.y-=cy; });
  var g={ chars:chars, w:mxx-mnx, h:mxy-mny }; AGC[L.id]={ key:key, g:g }; return g;
}
function mixHex(a,b,k){ var A=String(a).match(/^#([0-9a-f]{6})$/i), B=String(b).match(/^#([0-9a-f]{6})$/i); if(!A||!B) return a;
  var x=parseInt(A[1],16), y=parseInt(B[1],16), r=[16,8,0].map(function(sh){ var u=(x>>sh)&255, v=(y>>sh)&255; return Math.round(u+(v-u)*k); });
  return "rgb("+r.join(",")+")"; }
function fxPad(L){ var f=L.fx||{}; if(f.t==="glow") return L.size*f.a/100*.6; if(f.t==="stroke") return L.size*f.a/100*.25; if(f.t==="shadow") return L.size*f.a/100*.16; return 0; }

/* ─────────── контуры фигур ─────────── */
function shapePath(g,kind,w,h,r){
  var x=-w/2, y=-h/2; g.beginPath();
  if(kind==="circle"){ g.ellipse(0,0,w/2,h/2,0,0,Math.PI*2); }
  else if(kind==="tri"){ g.moveTo(0,y); g.lineTo(-x,-y); g.lineTo(x,-y); g.closePath(); }
  else if(kind==="star"){ for(var i=0;i<10;i++){ var a=-Math.PI/2+i*Math.PI/5, rr=i%2?.42:1; g.lineTo(Math.cos(a)*w/2*rr, Math.sin(a)*h/2*rr+h*.05); } g.closePath(); }
  else if(kind==="diamond"){ g.moveTo(0,y); g.lineTo(-x,0); g.lineTo(0,-y); g.lineTo(x,0); g.closePath(); }
  else if(kind==="hex"){ for(var j=0;j<6;j++){ var ah=j*Math.PI/3; g.lineTo(Math.cos(ah)*w/2,Math.sin(ah)*h/2); } g.closePath(); }
  else if(kind==="burst"){ for(var q=0;q<28;q++){ var ab=-Math.PI/2+q*Math.PI/14, rb=q%2?.84:1; g.lineTo(Math.cos(ab)*w/2*rb,Math.sin(ab)*h/2*rb); } g.closePath(); }
  else if(kind==="arrow"||kind==="arrow2"){ var hw=kind==="arrow2"?Math.min(w*.28,h*.75):Math.min(w*.45,h*.9), t=h*.22; g.moveTo(-x,0); g.lineTo(-x-hw,y); g.lineTo(-x-hw,-t); if(kind==="arrow2"){ g.lineTo(x+hw,-t); g.lineTo(x+hw,y); g.lineTo(x,0); g.lineTo(x+hw,-y); g.lineTo(x+hw,t); } else { g.lineTo(x,-t); g.lineTo(x,t); } g.lineTo(-x-hw,t); g.lineTo(-x-hw,-y); g.closePath(); }
  else if(kind==="larrow"){ var hl=Math.min(w*.5,h*3.4), hh=h*2.1, r2=h/2; g.moveTo(x+r2,y); g.lineTo(-x-hl,y); g.lineTo(-x-hl,-hh); g.lineTo(-x,0); g.lineTo(-x-hl,hh); g.lineTo(-x-hl,-y); g.lineTo(x+r2,-y); g.arc(x+r2,0,r2,Math.PI/2,Math.PI*1.5); g.closePath(); }
  else if(kind==="bubble"){ var bh=h*.8, br=Math.min(w,bh)*.22; g.moveTo(x+br,y); g.arcTo(-x,y,-x,y+bh,br); g.arcTo(-x,y+bh,x,y+bh,br); g.lineTo(x+w*.36,y+bh); g.lineTo(x+w*.16,-y); g.lineTo(x+w*.2,y+bh); g.arcTo(x,y+bh,x,y,br); g.arcTo(x,y,-x,y,br); g.closePath(); }
  else if(kind==="bubbleo"){ g.ellipse(0,-h*.08,w/2,h*.42,0,Math.PI*.76,Math.PI*2.6); g.lineTo(-w*.3,h/2); g.closePath(); }
  else if(kind==="cloud"){ g.moveTo(-.3*w,.35*h); g.bezierCurveTo(-.55*w,.35*h,-.58*w,.02*h,-.36*w,-.02*h); g.bezierCurveTo(-.4*w,-.32*h,-.1*w,-.5*h,.02*w,-.24*h); g.bezierCurveTo(.12*w,-.56*h,.48*w,-.4*h,.38*w,-.06*h); g.bezierCurveTo(.6*w,-.02*h,.56*w,.35*h,.32*w,.35*h); g.closePath(); }
  else if(kind==="bolt"){ [[.12,-.5],[-.38,.08],[-.04,.08],[-.14,.5],[.38,-.12],[.04,-.12]].forEach(function(pt){ g.lineTo(pt[0]*w,pt[1]*h); }); g.closePath(); }
  else if(kind==="cross"){ var cw=w*.17, chh=h*.17; [[-cw,y],[cw,y],[cw,-chh],[-x,-chh],[-x,chh],[cw,chh],[cw,-y],[-cw,-y],[-cw,chh],[x,chh],[x,-chh],[-cw,-chh]].forEach(function(pt){ g.lineTo(pt[0],pt[1]); }); g.closePath(); }
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
  opt=opt||{}; var s=opt.scale||1; SHADOW_K=s; TFW=W;
  g.save(); g.setTransform(s,0,0,s,opt.ox||0,opt.oy||0);
  if(W.round && opt.clipRound){ g.beginPath(); g.arc(W.w/2,W.h/2,W.w/2,0,Math.PI*2); g.clip(); }
  if(!opt.transparent && W.bg.t!=="none") bgPaint(g,W);
  W.layers.forEach(function(L){ if(!L.hidden && L.id!==opt.skip) drawLayer(g,W,L); });
  g.restore();
}
/* фон холста */
function bgPaint(g,W){ var B=W.bg;
  if(B.t==="fony"){ var fc=fonyRaster(W); if(fc){ g.drawImage(fc,0,0,W.w,W.h); return; } g.fillStyle=B.fb&&B.fb.pal?B.fb.pal[0]:(B.c1||"#111317"); g.fillRect(0,0,W.w,W.h); return; }
  if(B.t==="grad"){ var gr;
    if(B.gt==="rad"){ var r0=Math.hypot(W.w,W.h)/2; gr=g.createRadialGradient(W.w/2,W.h/2,0,W.w/2,W.h/2,r0); }
    else { var a=(B.ang||0)*Math.PI/180, cx=W.w/2, cy=W.h/2, r=Math.abs(W.w/2*Math.sin(a))+Math.abs(W.h/2*Math.cos(a)); gr=g.createLinearGradient(cx-Math.sin(a)*r,cy+Math.cos(a)*r,cx+Math.sin(a)*r,cy-Math.cos(a)*r); }
    gr.addColorStop(0,B.c1); if(B.c3){ gr.addColorStop(.5,B.c2); gr.addColorStop(1,B.c3); } else gr.addColorStop(1,B.c2); g.fillStyle=gr; }
  else g.fillStyle=B.c1;
  g.fillRect(0,0,W.w,W.h); }
/* фон из мастерской фонов: SVG рисуется в картинку один раз на размер холста (не больше 4096 px), дальше берётся готовая */
var FBG={}, FBGK=[];
function fonyRaster(W){ var B=W.bg; if(!window.FONY||!B.fb) return null; var k=Math.min(1,4096/Math.max(W.w,W.h)), w=Math.max(1,Math.round(W.w*k)), h=Math.max(1,Math.round(W.h*k)), key=JSON.stringify(B.fb)+"|"+w+"x"+h, c=FBG[key];
  if(c) return c.ok?c.cv:null;
  c=FBG[key]={ ok:false }; FBGK.push(key); while(FBGK.length>8) delete FBG[FBGK.shift()];
  var b=JSON.parse(JSON.stringify(B.fb)); b.fmt="wide"; b.anim=false; var im=new Image();
  im.onload=function(){ var cv=document.createElement("canvas"); cv.width=w; cv.height=h; cv.getContext("2d").drawImage(im,0,0,w,h); c.cv=cv; c.ok=true; if(onAsset) onAsset(); };
  im.src="data:image/svg+xml;charset=utf-8,"+encodeURIComponent(FONY.svg(b,w,h,{ id:"g"+FBGK.length+"_" }));
  return null; }
function hexA(c,a){ var m=String(c||"").match(/^#([0-9a-f]{6})$/i); if(!m) return c; var n=parseInt(m[1],16); return "rgba("+(n>>16)+","+((n>>8)&255)+","+(n&255)+","+a+")"; }
function hasErase(L){ return L.t==="draw"&&L.strokes.some(function(S){ return S.k==="erase"; }); }
/* слой без поворота на отдельном холсте: нужен для тени (тень должна быть одна на весь слой) и для ластика в рисунке */
var LCV={};
function layerCanvas(W,L,s){
  var sz=layerSize(L), pad=4+(L.t==="shape"?(L.sw||0)+(isLine(L.kind)?L.h*2.4:0):0)+(L.t==="text"?L.size*.5:0)+(L.out&&L.out.on?L.out.w||0:0), w=sz.w+pad*2, h=sz.h+pad*2, k=Math.min(s,4096/Math.max(w,h));
  var ready=(L.t!=="image"||!!processed(W,L))&&(!(L.tf&&L.tf.t==="img")||!!assetImg(W,L.tf.src)), key=(L.t==="draw"?[L.w,L.h,L.strokes.length,L.strokes.length?L.strokes[L.strokes.length-1].p.length:0,L.strokes.length?L.strokes[0].c:""].join("|"):JSON.stringify(L,function(q,v){ return q==="x"||q==="y"||q==="rot"||q==="op"||q==="sh"||q==="blend"||q==="locked"||q==="hidden"?undefined:v; }))+"|"+k.toFixed(4)+ready, c=LCV[L.id];
  if(c&&c.key===key) return c;
  var cv=document.createElement("canvas"); cv.width=Math.max(1,Math.ceil(w*k)); cv.height=Math.max(1,Math.ceil(h*k)); var x=cv.getContext("2d"), sk=SHADOW_K; x.setTransform(k,0,0,k,cv.width/2,cv.height/2); SHADOW_K=k; drawBody(x,W,L); SHADOW_K=sk;
  c=LCV[L.id]={ key:key, cv:cv, w:cv.width/k, h:cv.height/k }; return c;
}
function drawLayer(g,W,L){
  g.save(); g.translate(L.x,L.y); g.rotate((L.rot||0)*Math.PI/180); g.globalAlpha=L.op==null?1:L.op; g.globalCompositeOperation=L.blend||"source-over";
  var sh=L.sh&&L.sh.on?L.sh:null;
  if(sh||hasErase(L)){ var o=layerCanvas(W,L,SHADOW_K);
    if(sh){ g.shadowColor=hexA(sh.c||"#000000",(sh.a==null?50:sh.a)/100); g.shadowBlur=(sh.b==null?20:sh.b)*SHADOW_K; g.shadowOffsetX=(sh.x||0)*SHADOW_K; g.shadowOffsetY=(sh.y==null?10:sh.y)*SHADOW_K; }
    g.drawImage(o.cv,-o.w/2,-o.h/2,o.w,o.h); }
  else drawBody(g,W,L);
  g.restore();
}
function drawBody(g,W,L){
  if(L.flipX||L.flipY) g.scale(L.flipX?-1:1,L.flipY?-1:1);
  if(L.t==="text") drawText(g,L);
  else if(L.t==="shape"){ if(isLine(L.kind)){ g.fillStyle=fillOf(g,L,L.w,L.h); shapePath(g,L.kind==="line"?"round":L.kind,L.w,L.h,0); g.fill(); }
    else { shapePath(g,L.kind,L.w,L.h,L.r); g.fillStyle=fillOf(g,L,L.w,L.h); if(L.fill||L.fill2) g.fill(); if(L.stroke&&L.sw){ g.lineWidth=L.sw; g.lineJoin="round"; g.strokeStyle=L.stroke; g.stroke(); } } }
  else if(L.t==="qr") drawQR(g,L);
  else if(L.t==="icon"){ var d=ICONS[L.name]; if(d){ var k=L.w/24; g.scale(k,L.h/24); g.translate(-12,-12); g.lineWidth=L.sw; g.lineCap="round"; g.lineJoin="round"; g.strokeStyle=L.color; g.stroke(new Path2D(d)); } }
  else if(L.t==="draw") drawStrokes(g,L);
  else if(L.t==="image"){
    var cv=processed(W,L), ow=L.out&&L.out.on?(L.out.w||0):0, oc=L.out&&L.out.c||"#ffffff";
    g.save();
    if(cv&&ow&&L.mask){ var r0=coverRect(L,cv.width,cv.height), oc2=outlined(L,cv,ow/r0.k,oc); shapePath(g,L.shape,L.w+ow*2,L.h+ow*2,L.r?L.r+ow:0); g.clip(); g.drawImage(oc2.cv,r0.x-oc2.p*r0.k,r0.y-oc2.p*r0.k,oc2.cv.width*r0.k,oc2.cv.height*r0.k); }
    else { shapePath(g,L.shape,L.w,L.h,L.r); g.clip();
      if(cv){ var r=coverRect(L,cv.width,cv.height); g.drawImage(cv,r.x,r.y,r.w,r.h); }
      else { g.fillStyle="rgba(127,127,127,.25)"; g.fillRect(-L.w/2,-L.h/2,L.w,L.h); } }
    g.restore();
    /* у невырезанного фото обводка идёт рамкой по форме кадра */
    if(ow&&!L.mask){ shapePath(g,L.shape,L.w,L.h,L.r); g.lineWidth=ow; g.lineJoin="round"; g.strokeStyle=oc; g.stroke(); }
  }
}
/* штрихи рисунка: линия идёт через середины отрезков, поэтому получается плавной */
function drawStrokes(g,L){ var a0=g.globalAlpha, c0=g.globalCompositeOperation; g.save(); g.scale(L.w/L.bw,L.h/L.bh); g.lineJoin="round"; g.lineCap="round";
  L.strokes.forEach(function(S){ var p=S.p, n=p.length>>1; if(!n) return; g.globalCompositeOperation=S.k==="erase"?"destination-out":c0; g.globalAlpha=S.k==="erase"?1:a0*(S.k==="mark"?.45:1);
    if(n===1){ g.fillStyle=S.c; g.beginPath(); g.arc(p[0],p[1],S.s/2,0,Math.PI*2); g.fill(); return; }
    g.strokeStyle=S.c; g.lineWidth=S.s; g.beginPath(); g.moveTo(p[0],p[1]);
    for(var i=1;i<n-1;i++) g.quadraticCurveTo(p[i*2],p[i*2+1],(p[i*2]+p[i*2+2])/2,(p[i*2+1]+p[i*2+3])/2);
    g.lineTo(p[n*2-2],p[n*2-1]); g.stroke(); });
  g.restore(); }
/* фото заполняет рамку целиком, лишнее обрезается; zoom и fx/fy сдвигают кадр */
function coverRect(L,iw,ih){
  var k=Math.max(L.w/iw,L.h/ih)*(L.zoom||1), w=iw*k, h=ih*k;
  return { x:-L.w/2-(w-L.w)*(L.fx/100), y:-L.h/2-(h-L.h)*(L.fy/100), w:w, h:h, k:k };
}
function drawText(g,L){
  if(L.arc) return drawArcText(g,L);
  var m=textMetrics(L), f=L.fx||{t:"none"}, a=(f.a||0)/100;
  g.font=fontStr(L); g.textBaseline="middle"; g.textAlign="left"; g.lineJoin="round";
  var y0=-m.h/2+m.lh/2, pl=L.plate;
  if(pl&&pl.on){ var pp=platePad(L), pw=m.w+pp*2, ph=m.h+pp*1.3; g.save(); g.fillStyle=hexA(pl.c||"#000000",(pl.a==null?100:pl.a)/100); g.beginPath(); rrect(g,-pw/2,-ph/2,pw,ph,Math.min(pw,ph)/2*(pl.r==null?30:pl.r)/100); g.fill(); g.restore(); }
  function each(fn){ m.lines.forEach(function(t,i){ var w=m.ws[i], x=L.align==="left"?-m.w/2:L.align==="right"?m.w/2-w:-w/2; fn(t,x,y0+i*m.lh); }); }
  function put(t,x,y,stroke){ if(!m.ls){ stroke?g.strokeText(t,x,y):g.fillText(t,x,y); return; }
    for(var i=0;i<t.length;i++){ stroke?g.strokeText(t[i],x,y):g.fillText(t[i],x,y); x+=g.measureText(t[i]).width+m.ls; } }
  var fill=textFill(g,L,m.w,m.h);
  if(f.t==="grad"&&!(L.tf&&L.tf.t)){ var gr=g.createLinearGradient(-m.w/2,0,m.w/2,0); gr.addColorStop(0,f.c); gr.addColorStop(1,f.c2||L.color); fill=gr; }
  if(f.t==="shadow"){ g.shadowColor=f.c; g.shadowOffsetX=g.shadowOffsetY=L.size*a*.12*SHADOW_K; g.shadowBlur=L.size*a*.04*SHADOW_K; }
  if(f.t==="glow"){ g.shadowColor=f.c; g.shadowBlur=L.size*a*.6*SHADOW_K; g.fillStyle=fill; each(function(t,x,y){ put(t,x,y); }); }
  if(f.t==="stroke"){ g.lineWidth=L.size*a*.25; g.strokeStyle=f.c; each(function(t,x,y){ put(t,x,y,true); }); }
  g.fillStyle=fill; each(function(t,x,y){ put(t,x,y); });
}


/* ─────────── QR-код ─────────── */
/* генератор: qrcode-generator (Kazuhiko Arase, MIT), файл lib/qrcode.js. Текст кодируется в UTF-8, кириллица работает */
var QR_KINDS=[["url","Ссылка"],["wifi","Wi-Fi"],["contact","Контакт"],["phone","Телефон"],["text","Текст"]];
function qrLayer(W, kind){
  var k=Math.round(Math.min(W.w,W.h)*.4);
  return { id:gid(), t:"qr", x:W.w/2, y:W.h/2, w:k, h:k, rot:0, op:1, blend:"source-over", kind:kind||"url",
    d:{ url:"https://", ssid:"", pass:"", enc:"WPA", hid:false, name:"", phone:"", email:"", org:"", site:"", text:"" },
    fg:"#111317", bg:"#ffffff", style:"square", eye:"square", logo:"", margin:2 };
}
function qrEsc(s){ return String(s||"").replace(/([\\;,:"])/g,"\\$1"); }
function qrData(L){
  var d=L.d||{};
  if(L.kind==="url"){ var u=String(d.url||"").trim(); if(u && !/^[a-z][a-z0-9+.-]*:/i.test(u)) u="https://"+u; return u; }
  if(L.kind==="wifi") return "WIFI:T:"+(d.enc==="nopass"?"nopass":d.enc||"WPA")+";S:"+qrEsc(d.ssid)+";"+(d.enc==="nopass"?"":"P:"+qrEsc(d.pass)+";")+(d.hid?"H:true;":"")+";";
  if(L.kind==="contact"){ var n=String(d.name||"").trim();
    return "BEGIN:VCARD\nVERSION:3.0\nN:"+n+";;;;\nFN:"+n+"\n"+(d.phone?"TEL;TYPE=CELL:"+String(d.phone).replace(/[^\d+]/g,"")+"\n":"")+(d.email?"EMAIL:"+d.email+"\n":"")+(d.org?"ORG:"+d.org+"\n":"")+(d.site?"URL:"+d.site+"\n":"")+"END:VCARD"; }
  if(L.kind==="phone") return "tel:"+String(d.phone||"").replace(/[^\d+]/g,"");
  return String(d.text||"");
}
var QRC={};
function qrMatrix(L){
  var data=qrData(L), ecc=L.logo?"H":"M", key=ecc+"|"+data;
  if(QRC[key]) return QRC[key];
  var r=null;
  try{ if(typeof qrcode==="undefined") return null; qrcode.stringToBytes=qrcode.stringToBytesFuncs["UTF-8"];
    var q=qrcode(0,ecc); q.addData(data||" ","Byte"); q.make(); var n=q.getModuleCount(), m=[];
    for(var y=0;y<n;y++){ var row=[]; for(var x=0;x<n;x++) row.push(q.isDark(y,x)); m.push(row); }
    r={ n:n, m:m, ver:(n-17)/4, len:data.length };
  }catch(e){ r={ err:true }; }
  QRC[key]=r; return r;
}
function lum(c){ var m=String(c||"").match(/^#([0-9a-f]{6})$/i); if(!m) return null; var n=parseInt(m[1],16);
  return [n>>16,(n>>8)&255,n&255].map(function(v){ v/=255; return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4); }).reduce(function(a,v,i){ return a+v*[.2126,.7152,.0722][i]; },0); }
function qrCheck(L){
  var q=qrMatrix(L), out=[];
  if(!q||q.err) return [TR("Слишком много текста для QR-кода, сократите.")];
  if(!qrData(L).trim()||qrData(L)==="https://") out.push("Впишите, что должен открыть код.");
  if(L.bg){ var a=lum(L.fg), b=lum(L.bg); if(a!=null&&b!=null){ if(a>b) out.push("Светлый код на тёмном фоне читают не все телефоны. Надёжнее тёмный код на светлом."); else if((b+.05)/(a+.05)<3) out.push("Код и фон слишком похожи по яркости, телефон может не прочитать."); } }
  else out.push("Без фона код прочитается, только если под ним светлая однотонная подложка.");
  if(q.ver>12) out.push("Код получился плотным (много данных). Делайте его крупнее при печати.");
  return out.map(function(x){ return TR(x); });
}
function drawQR(g,L){
  var q=qrMatrix(L), S=L.w, x0=-S/2, y0=-S/2;
  if(!q||q.err){ g.fillStyle="rgba(255,80,100,.25)"; g.fillRect(x0,y0,S,S); return; }
  var M=Math.max(0,L.margin==null?2:L.margin), N=q.n+M*2, c=S/N, fg=L.fg||"#000";
  if(L.bg){ g.fillStyle=L.bg; if(g.roundRect){ g.beginPath(); g.roundRect(x0,y0,S,S,c*.8); g.fill(); } else g.fillRect(x0,y0,S,S); }
  function finder(r,col){ return (r<7&&col<7)||(r<7&&col>=q.n-7)||(r>=q.n-7&&col<7); }
  /* выравнивающие квадратики рисуем целиком, как углы: так код надёжнее читается в любом стиле точек */
  var ap=alignPos(q.ver), al=[];
  ap.forEach(function(ay){ ap.forEach(function(ax){ if(finder(ay,ax)||finder(ay+2,ax+2)||finder(ay-2,ax-2)||finder(ay-2,ax+2)||finder(ay+2,ax-2)) return; al.push([ax,ay]); }); });
  function inAlign(r,col){ for(var i=0;i<al.length;i++) if(Math.abs(r-al[i][1])<=2&&Math.abs(col-al[i][0])<=2) return true; return false; }
  var lg=L.logo?Math.ceil(q.n*.24/2)*2+1:0, l0=(q.n-lg)/2;
  g.fillStyle=fg; g.beginPath();
  for(var r=0;r<q.n;r++) for(var col=0;col<q.n;col++){
    if(!q.m[r][col]||finder(r,col)||inAlign(r,col)) continue;
    if(lg && r>=l0-.5 && r<l0+lg-.5 && col>=l0-.5 && col<l0+lg-.5) continue;
    var px=x0+(col+M)*c, py=y0+(r+M)*c;
    if(L.style==="dots"){ g.moveTo(px+c*.97,py+c/2); g.arc(px+c/2,py+c/2,c*.47,0,Math.PI*2); }
    else if(L.style==="round"){ if(g.roundRect) g.roundRect(px+c*.04,py+c*.04,c*.92,c*.92,c*.32); else g.rect(px,py,c,c); }
    else g.rect(px-.01*c,py-.01*c,c*1.02,c*1.02);
  }
  g.fill();
  [[0,0],[q.n-7,0],[0,q.n-7]].forEach(function(p){
    var ex=x0+(p[0]+M)*c, ey=y0+(p[1]+M)*c;
    g.fillStyle=fg; g.beginPath();
    if(L.eye==="circle"){ g.arc(ex+3.5*c,ey+3.5*c,3.5*c,0,Math.PI*2); g.arc(ex+3.5*c,ey+3.5*c,2.5*c,0,Math.PI*2,true); g.fill("evenodd"); g.beginPath(); g.arc(ex+3.5*c,ey+3.5*c,1.5*c,0,Math.PI*2); g.fill(); }
    else { var rr=L.eye==="round"?c*1.6:0, ri=L.eye==="round"?c*.8:0;
      rrect(g,ex,ey,7*c,7*c,rr); rrect(g,ex+c,ey+c,5*c,5*c,Math.max(0,rr-c*.6),true); g.fill("evenodd"); g.beginPath(); rrect(g,ex+2*c,ey+2*c,3*c,3*c,ri); g.fill(); }
  });
  al.forEach(function(p){ var ex=x0+(p[0]-2+M)*c, ey=y0+(p[1]-2+M)*c, rr=L.eye==="square"?0:c*1.2;
    g.fillStyle=fg; g.beginPath(); rrect(g,ex,ey,5*c,5*c,rr); rrect(g,ex+c,ey+c,3*c,3*c,Math.max(0,rr-c*.5),true); g.fill("evenodd");
    g.beginPath(); if(L.eye==="square") g.rect(ex+2*c,ey+2*c,c,c); else g.arc(ex+2.5*c,ey+2.5*c,c*.55,0,Math.PI*2); g.fill(); });
  if(lg){ var ps=lg*c, px0=-ps/2, py0=-ps/2; g.fillStyle=L.bg||"#ffffff"; g.beginPath(); rrect(g,px0,py0,ps,ps,c*1.2); g.fill();
    var d=ICONS[L.logo]; if(d){ g.save(); var k=ps*.7/24; g.translate(-12*k,-12*k); g.scale(k,k); g.lineWidth=2; g.lineCap="round"; g.lineJoin="round"; g.strokeStyle=fg; g.stroke(new Path2D(d)); g.restore(); } }
}
function alignPos(ver){ if(ver<2) return []; var n=Math.floor(ver/7)+2, size=ver*4+17, step=ver===32?26:Math.ceil((ver*4+4)/(n*2-2))*2, res=[6];
  for(var i=0,pos=size-7;i<n-1;i++,pos-=step) res.splice(1,0,pos); return res; }
function rrect(g,x,y,w,h,r,rev){
  r=Math.min(r||0,w/2,h/2);
  if(!rev){ g.moveTo(x+r,y); g.arcTo(x+w,y,x+w,y+h,r); g.arcTo(x+w,y+h,x,y+h,r); g.arcTo(x,y+h,x,y,r); g.arcTo(x,y,x+w,y,r); g.closePath(); }
  else { g.moveTo(x+r,y); g.arcTo(x,y,x,y+h,r); g.arcTo(x,y+h,x+w,y+h,r); g.arcTo(x+w,y+h,x+w,y,r); g.arcTo(x+w,y,x,y,r); g.closePath(); }
}

/* заливка текста: цвет, градиент под углом через всю надпись или фото внутри букв (фото накрывает надпись целиком, z приближает, px и py сдвигают) */
function textFill(g,L,bw,bh){ var T=L.tf;
  if(T&&T.t==="grad"){ var a=(T.ang==null?90:T.ang)*Math.PI/180, r=Math.abs(bw/2*Math.sin(a))+Math.abs(bh/2*Math.cos(a)), gr=g.createLinearGradient(-Math.sin(a)*r,Math.cos(a)*r,Math.sin(a)*r,-Math.cos(a)*r);
    gr.addColorStop(0,T.c1||L.color); if(T.c3){ gr.addColorStop(.5,T.c2||L.color); gr.addColorStop(1,T.c3); } else gr.addColorStop(1,T.c2||L.color); return gr; }
  if(T&&T.t==="img"){ var M=tfMatrix(L,bw,bh); if(M){ var p=g.createPattern(M.im,"no-repeat"); if(p&&p.setTransform){ p.setTransform(M.m); return p; } } }
  return L.color; }
function tfMatrix(L,bw,bh){ var T=L.tf, im=T&&T.src&&TFW?assetImg(TFW,T.src):null; if(!im||!window.DOMMatrix) return null; var iw=im.naturalWidth||im.width, ih=im.naturalHeight||im.height, k=Math.max(bw/iw,bh/ih)*(T.z||1);
  var x=-bw/2-(iw*k-bw)*((T.px==null?50:T.px)/100), y=-bh/2-(ih*k-bh)*((T.py==null?50:T.py)/100); return { im:im, m:new DOMMatrix([k,0,0,k,x,y]) }; }
var TFW=null;
function arcCol(L,f,k){ var T=L.tf; if(T&&T.t==="grad"){ if(T.c3) return k<.5?mixHex(T.c1,T.c2,k*2):mixHex(T.c2,T.c3,(k-.5)*2); return mixHex(T.c1,T.c2,k); } return f.t==="grad"?mixHex(f.c,f.c2||L.color,k):L.color; }
function drawArcText(g,L){
  var ag=arcGeom(L), f=L.fx||{t:"none"}, a=(f.a||0)/100;
  g.font=fontStr(L); g.textBaseline="middle"; g.textAlign="center"; g.lineJoin="round";
  function each(fn){ ag.chars.forEach(function(ch){ g.save(); g.translate(ch.x,ch.y); g.rotate(ch.r); fn(ch); g.restore(); }); }
  var M=L.tf&&L.tf.t==="img"?tfMatrix(L,ag.w,ag.h):null, pat=M?g.createPattern(M.im,"no-repeat"):null;
  /* у каждой буквы своё положение, поэтому узор фото пересчитывается под букву: так фото лежит ровно под всей надписью */
  function col(ch){ if(pat&&pat.setTransform){ pat.setTransform(new DOMMatrix().rotateSelf(-ch.r*180/Math.PI).translateSelf(-ch.x,-ch.y).multiplySelf(M.m)); return pat; } return arcCol(L,f,ch.k); }
  if(f.t==="shadow"){ g.shadowColor=f.c; g.shadowOffsetX=g.shadowOffsetY=L.size*a*.12*SHADOW_K; g.shadowBlur=L.size*a*.04*SHADOW_K; }
  if(f.t==="glow"){ g.shadowColor=f.c; g.shadowBlur=L.size*a*.6*SHADOW_K; each(function(ch){ g.fillStyle=col(ch); g.fillText(ch.c,0,0); }); }
  if(f.t==="stroke"){ g.lineWidth=L.size*a*.25; g.strokeStyle=f.c; each(function(ch){ g.strokeText(ch.c,0,0); }); }
  each(function(ch){ g.fillStyle=col(ch); g.fillText(ch.c,0,0); });
}

/* ─────────── попадание пальцем ─────────── */
function toLocal(L,px,py){ var a=-(L.rot||0)*Math.PI/180, dx=px-L.x, dy=py-L.y; return { x:dx*Math.cos(a)-dy*Math.sin(a), y:dx*Math.sin(a)+dy*Math.cos(a) }; }
function hitLayer(W,px,py,pad){
  for(var i=W.layers.length-1;i>=0;i--){ var L=W.layers[i]; if(L.hidden) continue; var s=layerSize(L), p=toLocal(L,px,py), e=pad||0;
    if(Math.abs(p.x)<=s.w/2+e && Math.abs(p.y)<=Math.max(s.h,e*2)/2+e) return L; }
  return null;
}

/* ─────────── шаблоны ─────────── */
/* старые работы: эффект «градиент» у текста стал заливкой, у которой есть угол и третий цвет */
function fixWork(W){ if(!W.bg) W.bg={ t:"color", c1:"#15121f", c2:"#3a1d3a", ang:160 }; W.layers.forEach(function(L){ if(L.t==="text"&&L.fx&&L.fx.t==="grad"){ L.tf={ t:"grad", c1:L.fx.c, c2:L.fx.c2||L.color, c3:"", ang:90 }; L.fx.t="none"; } }); return W; }
/* рамка слоя в осях холста (с учётом поворота) */
function aabb(L){ var s=layerSize(L), a=(L.rot||0)*Math.PI/180, c=Math.abs(Math.cos(a)), sn=Math.abs(Math.sin(a)), w=s.w*c+s.h*sn, h=s.w*sn+s.h*c; return { x0:L.x-w/2, y0:L.y-h/2, x1:L.x+w/2, y1:L.y+h/2, w:w, h:h }; }
function T_text(W,o){ var L=textLayer(W,o.k||"s"); for(var k in o) if(k!=="k") L[k]=k==="text"?TR(o[k]):o[k]; if(o.fx) L.fx=Object.assign({t:"none",c:"#000",c2:"#fff",a:50},o.fx); return L; }
function T_shape(W,kind,o){ var L=shapeLayer(W,kind); for(var k in o) L[k]=o[k]; return L; }
function T_qr(W,kind,o){ var L=qrLayer(W,kind); for(var k in o) if(k!=="d") L[k]=o[k]; if(o.d) for(var j in o.d) L.d[j]=TR(o.d[j]); return L; }
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
      T_icon(W,"coffee",{y:1300,w:500,h:500,color:"#d9b36c",sw:1.2}),
      T_qr(W,"wifi",{y:2250,w:1000,h:1000,fg:"#132219",bg:"#f1ead6",style:"round",eye:"round",logo:"coffee",d:{ssid:"Zerno_Guest",pass:"kofe2026",enc:"WPA"}}),
      T_text(W,{text:"Wi-Fi: наведите камеру на код",font:"montserrat",weight:600,size:90,y:2900,color:"#f1ead6"}),
      T_text(W,{text:"Каждый день 8:00-20:00",font:"montserrat",weight:600,size:90,y:3100,color:"#9fc58b"}) ]; } },
  { id:"bcard", group:"biz", name:"Визитка", size:"bcard", make:function(W){ W.bg={t:"color",c1:"#ffffff",c2:"#ffffff",ang:0};
    W.layers=[ T_shape(W,"rect",{x:60,y:295,w:120,h:591,fill:"#3b82f6"}),
      T_text(W,{text:"Иван Петров",font:"inter",weight:800,size:70,x:560,y:200,color:"#111317"}),
      T_text(W,{text:"фотограф",font:"inter",weight:600,size:40,x:560,y:270,color:"#6b7280"}),
      T_text(W,{text:"+48 600 000 000\nivan@mail.com",font:"inter",weight:600,size:36,x:560,y:420,color:"#111317",lh:1.5}),
      T_qr(W,"contact",{x:900,y:295,w:240,h:240,margin:1,d:{name:"Иван Петров",phone:"+48 600 000 000",email:"ivan@mail.com",org:"фотограф"}}) ]; } },
  { id:"qr_follow", group:"biz", name:"QR на канал", size:"square", make:function(W){ W.bg={t:"grad",c1:"#1a1030",c2:"#46203f",ang:160};
    W.layers=[ T_text(W,{text:"Подпишитесь",font:"unbounded",weight:700,size:86,y:170}),
      T_qr(W,"url",{y:560,w:560,h:560,fg:"#1a1030",bg:"#ffffff",style:"dots",eye:"round",logo:"play",d:{url:"https://youtube.com/"}}),
      T_text(W,{text:"наведите камеру телефона",font:"manrope",weight:600,size:42,y:940,color:"rgba(255,255,255,.75)"}) ]; } }
];
var GTPL_GROUPS=[["yt","YouTube"],["music","Музыка"],["fest","Праздник"],["biz","Дело"]];
function fromGTemplate(id){
  var t=GTEMPLATES.filter(function(x){ return x.id===id; })[0]; var W=newWork(t.size); W.title=TR(t.name); t.make(W);
  W.layers.forEach(function(L){ if(L.t==="text"&&L.x===undefined) L.x=W.w/2; }); return W;
}
