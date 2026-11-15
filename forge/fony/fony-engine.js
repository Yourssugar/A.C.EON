/* FORGE: мастерская фонов и узоров, движок.
   Фон = { kind, pal (5 цветов: [0] основа, [1..4] краски), seed, p (настройки вида), pts (точки, которые двигаются на превью, в долях 0..1),
           grain (зерно 0..60), anim (плавное движение), fmt (wide / phone / sq / tile) }.
   Каждый вид рисует SVG нужного размера. Размеры внутри считаются от u = min(w,h)/1000, поэтому фон выглядит одинаково
   и в превью, и в картинке 4K. Из SVG получаются картинка PNG, файл SVG и код CSS. */
(function(){
"use strict";
function rnd(seed){ var a=seed>>>0; return function(){ a=(a+0x6D2B79F5)>>>0; var t=a; t=Math.imul(t^(t>>>15),t|1); t^=t+Math.imul(t^(t>>>7),t|61); return((t^(t>>>14))>>>0)/4294967296; }; }
function cl(v){ return v<0?0:v>1?1:v; }
function f1(v){ return (Math.round(v*10)/10).toString(); }
function hexRgb(h){ var n=parseInt(String(h).replace("#",""),16); return [(n>>16)&255,(n>>8)&255,n&255]; }
function rgbHex(r){ return "#"+r.map(function(v){ v=Math.max(0,Math.min(255,Math.round(v))); return (v<16?"0":"")+v.toString(16); }).join(""); }
function mix(a,b,t){ var A=hexRgb(a), B=hexRgb(b); return rgbHex([A[0]+(B[0]-A[0])*t,A[1]+(B[1]-A[1])*t,A[2]+(B[2]-A[2])*t]); }
function grad3(c1,c2,c3,t){ return t<.5?mix(c1,c2,t*2):mix(c2,c3,(t-.5)*2); }
function anim(o,s){ return o.anim?s:""; }
var SPL=' calcMode="spline" keyTimes="0;.5;1" keySplines=".45 0 .55 1;.45 0 .55 1"';

/* ─── палитры: [0] основа, [1..4] краски ─── */
var PALS=[
  ["Закат",  ["#1b1033","#ff6a3d","#ff3d7f","#ffc15e","#7b5cff"]],
  ["Океан",  ["#041e2b","#0fb5ae","#2d7ff9","#7ee8d1","#123c69"]],
  ["Неон",   ["#07070f","#ff2bd6","#00f0ff","#7c3aed","#22ff88"]],
  ["Пастель",["#fbf3ea","#f9c6c9","#a9d3f0","#c7ecbd","#f8e3a1"]],
  ["Лес",    ["#0d1a14","#2f6b3f","#9cc76b","#e8d38a","#1f4d3a"]],
  ["Кузня",  ["#120c08","#ff8a3c","#ffcf6e","#4fd6c8","#5a1f0a"]],
  ["Песок",  ["#2a1a12","#c9773b","#e3a25c","#f2c98a","#8c4a2b"]],
  ["Ночь",   ["#070b14","#3b82f6","#a78bfa","#f0abfc","#1e293b"]]
];
/* случайная палитра, которая не режет глаз: оттенки рядом или напротив по кругу */
function randomPal(r){
  r=r||Math.random; var h=r()*360, sch=Math.floor(r()*3), dark=r()<.7, out=[];
  function hsl(H,S,L){ H=((H%360)+360)%360/360; var q=L<.5?L*(1+S):L+S-L*S, p=2*L-q;
    function f(t){ t=(t+1)%1; return t<1/6?p+(q-p)*6*t:t<.5?q:t<2/3?p+(q-p)*(2/3-t)*6:p; } return rgbHex([f(H+1/3)*255,f(H)*255,f(H-1/3)*255]); }
  var hs=sch===0?[0,25,-25,50]:sch===1?[0,180,20,200]:[0,120,240,60];
  out.push(dark?hsl(h+200,.45,.07):hsl(h,.4,.95));
  hs.forEach(function(d,i){ out.push(hsl(h+d,.62+r()*.3,dark?.5+r()*.15:.66+r()*.12)); });
  return out;
}

/* ─── форматы: размер превью (логический) и размеры для сохранения ─── */
var FMTS={
  wide: { w:1600, h:900,  name:"экран 16:9", ex:[[1920,1080],[2560,1440],[3840,2160]] },
  phone:{ w:800,  h:1732, name:"телефон",    ex:[[1080,1920],[1170,2532],[1440,3200]] },
  sq:   { w:1200, h:1200, name:"квадрат",    ex:[[1080,1080],[2048,2048]] },
  tile: { w:400,  h:400,  name:"плитка",     ex:[[256,256],[512,512],[1024,1024]] }
};

/* ─── виды ─── */
var K={};
K.aurora={ name:"Аврора", hint:"Пятна цвета двигаются пальцем или мышкой прямо на превью.",
  params:[{id:"size",label:"Размер пятен",min:20,max:100,def:62},{id:"soft",label:"Мягкость",min:10,max:100,def:80}],
  pts:function(){ return [[.22,.3],[.78,.24],[.62,.8],[.12,.82],[.45,.52]]; }, ptc:function(b,i){ return b.pal[1+i%4]; },
  gen:function(w,h,c,r,p,pts,o){ var u=Math.min(w,h)/1000, M=Math.max(w,h), q=o.id;
    var d='<defs><filter id="'+q+'b" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="'+f1(u*(25+p.soft*1.15))+'"/></filter></defs>';
    d+='<rect width="'+w+'" height="'+h+'" fill="'+c[0]+'"/><g filter="url(#'+q+'b)">';
    pts.forEach(function(pt,i){ var rx=M*(.1+p.size/100*.24)*(.85+.3*r()), ry=rx*(.7+.3*r()), dx=f1((r()-.5)*M*.12), dy=f1((r()-.5)*M*.1);
      d+='<ellipse cx="'+f1(pt[0]*w)+'" cy="'+f1(pt[1]*h)+'" rx="'+f1(rx)+'" ry="'+f1(ry)+'" fill="'+c[1+i%4]+'" opacity=".9">'+
        anim(o,'<animateTransform attributeName="transform" type="translate" values="0 0;'+dx+' '+dy+';0 0" dur="'+(14+i*3)+'s" repeatCount="indefinite"'+SPL+'/>')+'</ellipse>'; });
    return d+'</g>'; } };

K.waves={ name:"Волны", hint:"Ручка на волне: вверх и вниз меняет высоту, вбок сдвигает гребни.",
  params:[{id:"count",label:"Сколько волн",min:2,max:7,def:5},{id:"amp",label:"Высота гребней",min:0,max:100,def:50},{id:"freq",label:"Частота",min:1,max:5,def:2}],
  pts:function(p){ var n=p.count, a=[]; for(var i=0;i<n;i++) a.push([.2+.6*(i/(Math.max(1,n-1))),.32+.52*(i/Math.max(1,n-1))]); return a; },
  ptc:function(b,i){ return b.pal[1+i%4]; },
  gen:function(w,h,c,r,p,pts,o){ var d='<rect width="'+w+'" height="'+h+'" fill="'+c[0]+'"/>', n=pts.length, f=Math.round(p.freq), W2=o.anim?w*2:w;
    pts.forEach(function(pt,i){ var A=h*.06*(p.amp/50)*(.7+.6*r()), ph=pt[0], ph2=r(), y0=pt[1]*h, s='M0 '+h;
      for(var x=0;x<=W2+.1;x+=w/80){ var y=y0+A*Math.sin(2*Math.PI*(f*x/w+ph))+A*.35*Math.sin(2*Math.PI*((2*f+1)*x/w+ph2)); s+=' L'+f1(x)+' '+f1(y); }
      s+=' L'+W2+' '+h+'Z'; var dir=i%2?1:-1;
      d+='<path d="'+s+'" fill="'+c[1+i%4]+'" opacity="'+f1(.55+.45*i/Math.max(1,n-1))+'">'+
        anim(o,'<animateTransform attributeName="transform" type="translate" from="'+(dir<0?0:-w)+' 0" to="'+(dir<0?-w:0)+' 0" dur="'+(22+i*7)+'s" repeatCount="indefinite"/>')+'</path>'; });
    return d; } };

K.topo={ name:"Топография", hint:"Центры линий двигаются на превью.",
  params:[{id:"density",label:"Густота линий",min:10,max:100,def:55},{id:"width",label:"Толщина",min:4,max:40,def:14},{id:"wobble",label:"Извилистость",min:0,max:100,def:50}],
  pts:function(){ return [[.2,.3],[.75,.35],[.5,.85]]; }, ptc:function(b,i){ return b.pal[1+i%3]; },
  gen:function(w,h,c,r,p,pts,o){ var u=Math.min(w,h)/1000, d='<rect width="'+w+'" height="'+h+'" fill="'+c[0]+'"/>', st=u*(92-p.density*.72), wb=p.wobble/100*.28;
    pts.forEach(function(pt,k){ var cx=pt[0]*w, cy=pt[1]*h, p1=r()*6, p2=r()*6, g='';
      for(var R=st*.8;R<Math.max(w,h)*1.05;R+=st){ var s='';
        for(var t=0;t<40;t++){ var th=t/40*Math.PI*2, rr=R*(1+wb*Math.sin(3*th+p1+R*.004/u)+wb*.55*Math.sin(5*th+p2-R*.003/u));
          s+=(t?'L':'M')+f1(cx+Math.cos(th)*rr)+' '+f1(cy+Math.sin(th)*rr); }
        g+='<path d="'+s+'Z"/>'; }
      d+='<g fill="none" stroke="'+c[1+k%3]+'" stroke-width="'+f1(u*p.width/8)+'" stroke-linejoin="round" opacity=".6">'+
        anim(o,'<animateTransform attributeName="transform" type="rotate" from="0 '+f1(cx)+' '+f1(cy)+'" to="'+(k%2?-360:360)+' '+f1(cx)+' '+f1(cy)+'" dur="'+(180+k*40)+'s" repeatCount="indefinite"/>')+g+'</g>'; });
    return d; } };

K.lowpoly={ name:"Треугольники", hint:"Две ручки задают, откуда и куда идёт переход цвета.",
  params:[{id:"cells",label:"Сколько треугольников",min:4,max:20,def:9,inv:1},{id:"jitter",label:"Неровность",min:0,max:100,def:70},{id:"light",label:"Игра света",min:0,max:100,def:35}],
  pts:function(){ return [[.1,.15],[.9,.85]]; }, ptc:function(b,i){ return b.pal[i?3:1]; },
  gen:function(w,h,c,r,p,pts){ var cols=Math.round(p.cells), rows=Math.max(3,Math.round(cols*h/w)), P=[], d='', jt=p.jitter/100*.8;
    for(var j=0;j<=rows;j++){ P[j]=[]; for(var i=0;i<=cols;i++){ var jx=(i>0&&i<cols)?(r()-.5)*jt:0, jy=(j>0&&j<rows)?(r()-.5)*jt:0; P[j][i]=[(i+jx)*w/cols,(j+jy)*h/rows]; } }
    var ax=pts[0][0]*w, ay=pts[0][1]*h, bx=pts[1][0]*w, by=pts[1][1]*h, vx=bx-ax, vy=by-ay, vv=vx*vx+vy*vy||1;
    for(var j2=0;j2<rows;j2++) for(var i2=0;i2<cols;i2++){ var a=P[j2][i2], b=P[j2][i2+1], e=P[j2+1][i2], g=P[j2+1][i2+1];
      [[a,b,g],[a,g,e]].forEach(function(T){ var mx=(T[0][0]+T[1][0]+T[2][0])/3, my=(T[0][1]+T[1][1]+T[2][1])/3, t=cl(((mx-ax)*vx+(my-ay)*vy)/vv);
        var col=grad3(c[1],c[2],c[3],t), l=(r()-.5)*p.light/100*.5; col=l>0?mix(col,"#ffffff",l):mix(col,"#000000",-l);
        d+='<path d="M'+T.map(function(q){ return f1(q[0])+' '+f1(q[1]); }).join('L')+'Z" fill="'+col+'" stroke="'+col+'" stroke-width="1"/>'; }); }
    return d; } };

K.dots={ name:"Точки", tile:true, hint:"Ручка задаёт, где точки видны ярче всего.",
  params:[{id:"step",label:"Шаг",min:8,max:80,def:30},{id:"size",label:"Размер точек",min:5,max:70,def:26},{id:"fade",label:"Затухание к краям",min:0,max:100,def:60}],
  pts:function(){ return [[.5,.45]]; }, ptc:function(b){ return b.pal[1]; },
  gen:function(w,h,c,r,p,pts,o){ var u=Math.min(w,h)/1000, st=u*(p.step*1.4+10), q=o.id;
    if(o.tile){ st=w/Math.max(1,Math.round(w/st)); }
    var rr=st*p.size/100*.5, d='<defs><pattern id="'+q+'p" width="'+f1(st)+'" height="'+f1(st)+'" patternUnits="userSpaceOnUse">'+
      '<circle cx="'+f1(st/2)+'" cy="'+f1(st/2)+'" r="'+f1(rr)+'" fill="'+c[1]+'"/>'+anim(o,'<animateTransform attributeName="patternTransform" type="translate" from="0 0" to="'+f1(st)+' '+f1(st)+'" dur="8s" repeatCount="indefinite"/>')+'</pattern>';
    if(!o.tile&&p.fade>0){ var fr=1.25-p.fade/100*.85;
      d+='<radialGradient id="'+q+'g" cx="'+f1(pts[0][0]*100)+'%" cy="'+f1(pts[0][1]*100)+'%" r="'+f1(fr*100)+'%"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>'+
        '<mask id="'+q+'m"><rect width="'+w+'" height="'+h+'" fill="url(#'+q+'g)"/></mask>'; }
    d+='</defs><rect width="'+w+'" height="'+h+'" fill="'+c[0]+'"/><rect width="'+w+'" height="'+h+'" fill="url(#'+q+'p)"'+(!o.tile&&p.fade>0?' mask="url(#'+q+'m)"':'')+'/>';
    return d; } };

K.grid={ name:"Сетка и солнце", tile:true, hint:"Солнце двигается на превью.",
  params:[{id:"cell",label:"Размер клетки",min:10,max:100,def:45},{id:"line",label:"Толщина линий",min:1,max:8,def:2},{id:"sun",label:"Солнце",min:0,max:70,def:32}],
  pts:function(){ return [[.68,.52]]; }, ptc:function(b){ return b.pal[1]; },
  gen:function(w,h,c,r,p,pts,o){ var u=Math.min(w,h)/1000, cs=u*(p.cell*1.7+20), q=o.id, lw=u*p.line*1.1;
    if(o.tile){ cs=w/Math.max(1,Math.round(w/cs)); }
    var d='<defs><pattern id="'+q+'p" width="'+f1(cs)+'" height="'+f1(cs)+'" patternUnits="userSpaceOnUse"><path d="M'+f1(cs)+' 0V'+f1(cs)+'H0" fill="none" stroke="'+c[4]+'" stroke-width="'+f1(lw)+'"/>'+
      anim(o,'<animateTransform attributeName="patternTransform" type="translate" from="0 0" to="0 '+f1(cs)+'" dur="4s" repeatCount="indefinite"/>')+'</pattern>'+
      '<linearGradient id="'+q+'l" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="'+c[0]+'"/><stop offset="1" stop-color="'+mix(c[0],c[3],.45)+'"/></linearGradient>';
    if(o.tile) return d+'</defs><rect width="'+w+'" height="'+h+'" fill="'+c[0]+'"/><rect width="'+w+'" height="'+h+'" fill="url(#'+q+'p)"/>';
    var sr=Math.min(w,h)*p.sun/100*.62, sx=pts[0][0]*w, sy=pts[0][1]*h;
    d+='<linearGradient id="'+q+'s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="'+c[2]+'"/><stop offset="1" stop-color="'+c[1]+'"/></linearGradient>'+
      '<linearGradient id="'+q+'f" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".08"/><stop offset="1" stop-color="#fff"/></linearGradient><mask id="'+q+'m"><rect width="'+w+'" height="'+h+'" fill="url(#'+q+'f)"/></mask>'+
      '<mask id="'+q+'k"><rect width="'+w+'" height="'+h+'" fill="#fff"/>';
    for(var i=0;i<7;i++){ var yy=sy+sr*(.12+i*.13), hh=sr*(.02+i*.012); d+='<rect x="0" y="'+f1(yy)+'" width="'+w+'" height="'+f1(hh)+'" fill="#000"/>'; }
    d+='</mask><radialGradient id="'+q+'h"><stop offset="0" stop-color="'+c[1]+'" stop-opacity=".45"/><stop offset="1" stop-color="'+c[1]+'" stop-opacity="0"/></radialGradient></defs>'+
      '<rect width="'+w+'" height="'+h+'" fill="url(#'+q+'l)"/>';
    if(sr>0) d+='<circle cx="'+f1(sx)+'" cy="'+f1(sy)+'" r="'+f1(sr*2)+'" fill="url(#'+q+'h)"/><circle cx="'+f1(sx)+'" cy="'+f1(sy)+'" r="'+f1(sr)+'" fill="url(#'+q+'s)" mask="url(#'+q+'k)"/>';
    return d+'<rect width="'+w+'" height="'+h+'" fill="url(#'+q+'p)" mask="url(#'+q+'m)"/>'; } };

K.confetti={ name:"Конфетти", tile:true, hint:"«Перемешать» раскидывает конфетти заново.",
  params:[{id:"count",label:"Сколько",min:10,max:160,def:42},{id:"size",label:"Размер",min:10,max:100,def:45}],
  pts:function(){ return []; },
  gen:function(w,h,c,r,p,pts,o){ var u=Math.min(w,h)/1000, d='<rect width="'+w+'" height="'+h+'" fill="'+c[0]+'"/>', n=Math.max(4,Math.round(p.count*(o.tile?.35:1)));
    for(var i=0;i<n;i++){ var x=r()*w, y=r()*h, z=u*(p.size*.9+12)*(.6+.8*r()), col=c[1+Math.floor(r()*4)], k=Math.floor(r()*4), rot=Math.floor(r()*360), sp=(r()<.5?-1:1)*(20+Math.floor(r()*30));
      var sh=k===0?'<circle r="'+f1(z/2)+'" fill="'+col+'"/>':k===1?'<path d="M0 '+f1(-z/1.6)+'L'+f1(z/1.6)+' '+f1(z/2.4)+'L'+f1(-z/1.6)+' '+f1(z/2.4)+'Z" fill="'+col+'"/>':
        k===2?'<rect x="'+f1(-z/2)+'" y="'+f1(-z/6)+'" width="'+f1(z)+'" height="'+f1(z/3)+'" rx="'+f1(z/6)+'" fill="'+col+'"/>':
        '<path d="M'+f1(-z)+' 0q'+f1(z/2)+' '+f1(-z/2)+' '+f1(z)+' 0t'+f1(z)+' 0" fill="none" stroke="'+col+'" stroke-width="'+f1(z/5)+'" stroke-linecap="round"/>';
      var g='<g transform="rotate('+rot+')">'+anim(o&&n<=90?o:{},'<animateTransform attributeName="transform" type="rotate" from="'+rot+'" to="'+(rot+360*Math.sign(sp))+'" dur="'+Math.abs(sp)+'s" repeatCount="indefinite"/>')+sh+'</g>';
      var xs=[x], ys=[y];
      if(o.tile){ if(x<z*1.2) xs.push(x+w); if(x>w-z*1.2) xs.push(x-w); if(y<z*1.2) ys.push(y+h); if(y>h-z*1.2) ys.push(y-h); }
      xs.forEach(function(X){ ys.forEach(function(Y){ d+='<g transform="translate('+f1(X)+' '+f1(Y)+')">'+g+'</g>'; }); }); }
    return d; } };

K.blobs={ name:"Пятна", hint:"Пятна двигаются на превью.",
  params:[{id:"count",label:"Сколько пятен",min:2,max:6,def:4},{id:"size",label:"Размер",min:20,max:100,def:55},{id:"wobble",label:"Неровность",min:0,max:100,def:50},{id:"soft",label:"Размытие",min:0,max:100,def:0}],
  pts:function(p){ var a=[[.2,.25],[.75,.3],[.6,.75],[.22,.78],[.45,.5],[.88,.8]]; return a.slice(0,p.count); }, ptc:function(b,i){ return b.pal[1+i%4]; },
  gen:function(w,h,c,r,p,pts,o){ var u=Math.min(w,h)/1000, q=o.id, d='<rect width="'+w+'" height="'+h+'" fill="'+c[0]+'"/>';
    if(p.soft>0) d+='<defs><filter id="'+q+'b" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="'+f1(u*p.soft*.8)+'"/></filter></defs>';
    d+='<g'+(p.soft>0?' filter="url(#'+q+'b)"':'')+'>';
    pts.forEach(function(pt,b){ var cx=pt[0]*w, cy=pt[1]*h, R=Math.min(w,h)*(.08+p.size/100*.3)*(.8+.4*r()), n=8, P=[], wb=p.wobble/100*.6;
      for(var i=0;i<n;i++){ var th=i/n*Math.PI*2, rr=R*(1-wb/2+wb*r()); P.push([cx+Math.cos(th)*rr,cy+Math.sin(th)*rr]); }
      var s='M'+f1((P[0][0]+P[n-1][0])/2)+' '+f1((P[0][1]+P[n-1][1])/2);
      for(var j=0;j<n;j++){ var A=P[j], B=P[(j+1)%n]; s+='Q'+f1(A[0])+' '+f1(A[1])+' '+f1((A[0]+B[0])/2)+' '+f1((A[1]+B[1])/2); }
      d+='<path d="'+s+'Z" fill="'+c[1+b%4]+'" opacity=".92">'+anim(o,'<animateTransform attributeName="transform" type="rotate" from="0 '+f1(cx)+' '+f1(cy)+'" to="'+(b%2?-360:360)+' '+f1(cx)+' '+f1(cy)+'" dur="'+(40+b*9)+'s" repeatCount="indefinite"/>')+'</path>'; });
    return d+'</g>'; } };

K.rays={ name:"Лучи", hint:"Центр лучей двигается на превью.",
  params:[{id:"count",label:"Сколько лучей",min:8,max:48,step:2,def:24},{id:"contrast",label:"Яркость лучей",min:5,max:100,def:55},{id:"glow",label:"Свечение",min:0,max:100,def:60}],
  pts:function(){ return [[.5,.62]]; }, ptc:function(b){ return b.pal[3]; },
  gen:function(w,h,c,r,p,pts,o){ var q=o.id, cx=pts[0][0]*w, cy=pts[0][1]*h, R=Math.hypot(w,h)*1.2, n=Math.round(p.count/2)*2, g='';
    for(var i=0;i<n;i+=2){ var a1=i/n*Math.PI*2, a2=(i+1)/n*Math.PI*2; g+='<path d="M'+f1(cx)+' '+f1(cy)+'L'+f1(cx+Math.cos(a1)*R)+' '+f1(cy+Math.sin(a1)*R)+'L'+f1(cx+Math.cos(a2)*R)+' '+f1(cy+Math.sin(a2)*R)+'Z"/>'; }
    var gr=Math.min(w,h)*(.12+p.glow/100*.55);
    return '<defs><radialGradient id="'+q+'g"><stop offset="0" stop-color="'+c[3]+'"/><stop offset="1" stop-color="'+c[3]+'" stop-opacity="0"/></radialGradient></defs>'+
      '<rect width="'+w+'" height="'+h+'" fill="'+c[1]+'"/><g fill="'+c[3]+'" opacity="'+f1(p.contrast/100*.75)+'">'+
      anim(o,'<animateTransform attributeName="transform" type="rotate" from="0 '+f1(cx)+' '+f1(cy)+'" to="360 '+f1(cx)+' '+f1(cy)+'" dur="90s" repeatCount="indefinite"/>')+g+'</g>'+
      (p.glow>0?'<circle cx="'+f1(cx)+'" cy="'+f1(cy)+'" r="'+f1(gr)+'" fill="url(#'+q+'g)"/>':''); } };

var ORDER=["aurora","waves","topo","lowpoly","dots","grid","confetti","blobs","rays"];

/* ─── фон целиком ─── */
function defP(kind){ var o={}; K[kind].params.forEach(function(x){ o[x.id]=x.def; }); return o; }
function newBg(kind,pal,seed){ var b={ v:1, kind:kind, pal:(pal||PALS[0][1]).slice(), seed:seed==null?Math.floor(Math.random()*1e6):seed, p:defP(kind), grain:14, anim:false, fmt:"wide" };
  b.pts=K[kind].pts(b.p); return b; }
/* точек столько, сколько нужно виду (у волн и пятен число меняется ползунком) */
function fixBg(b){ var k=K[b.kind]; if(!k){ b.kind="aurora"; k=K.aurora; }
  var d=defP(b.kind); b.p=b.p||{}; for(var x in d) if(b.p[x]==null) b.p[x]=d[x];
  var want=k.pts(b.p); if(!b.pts||b.pts.length!==want.length){ var old=b.pts||[]; b.pts=want.map(function(p,i){ return old[i]||p; }); }
  if(!FMTS[b.fmt]||(b.fmt==="tile"&&!k.tile)) b.fmt="wide"; if(b.grain==null) b.grain=14; return b; }
var _id=0;
/* SVG целиком. o: { anim, id (приставка для id внутри), tile } */
function svg(b,w,h,o){ o=o||{}; fixBg(b); var id=o.id||("f"+(++_id)+"_"), oo={ anim:!!(o.anim&&b.anim), id:id, tile:b.fmt==="tile" };
  var r=rnd(b.seed), inner=K[b.kind].gen(w,h,b.pal,r,b.p,b.pts,oo);
  if(b.grain>0) inner+='<filter id="'+id+'n" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".8" numOctaves="2" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/></filter>'+
    '<rect width="'+w+'" height="'+h+'" filter="url(#'+id+'n)" opacity="'+f1(b.grain/100*1.3)+'" style="mix-blend-mode:soft-light"/>';
  return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 '+w+' '+h+'" width="'+w+'" height="'+h+'" preserveAspectRatio="xMidYMid slice">'+inner+'</svg>'; }

/* CSS: для авроры, точек, сетки и лучей настоящие градиенты, для остальных SVG внутри адреса */
function svgUrl(s){ return 'url("data:image/svg+xml,'+s.replace(/"/g,"'").replace(/[\r\n%#{}<>]/g,function(m){ return encodeURIComponent(m); })+'")'; }
function css(b,w,h){ fixBg(b); var c=b.pal, p=b.p, pts=b.pts, sel=".fon", lines=[], kf="";
  var k=w/(FMTS[b.fmt]||FMTS.wide).w;
  if(b.kind==="aurora"){ var r=rnd(b.seed), M=Math.max(w,h), stop=Math.round(55+p.soft*.3);
    var L=pts.map(function(pt,i){ var rx=M*(.1+p.size/100*.24)*(.85+.3*r()), ry=rx*(.7+.3*r()); r(); r();
      return "radial-gradient("+Math.round(rx/w*140)+"% "+Math.round(ry/h*140)+"% at "+Math.round(pt[0]*100)+"% "+Math.round(pt[1]*100)+"%, "+c[1+i%4]+" 0, transparent "+stop+"%)"; });
    lines.push("background:\n    "+L.join(",\n    ")+",\n    "+c[0]+";");
    if(b.anim){ lines.push("background-size:140% 140%;"); lines.push("animation:fon-drift 24s ease-in-out infinite alternate;"); kf="@keyframes fon-drift{ from{ background-position:0% 0%; } to{ background-position:100% 100%; } }"; }
  }else if(b.kind==="dots"&&b.fmt!=="tile"){ var u=Math.min(w,h)/1000, st=Math.round(u*(p.step*1.4+10)), rr=Math.max(1,Math.round(st*p.size/100*.5)), fr=Math.round((1.25-p.fade/100*.85)*70);
    lines.push("background:\n    "+(p.fade>0?"radial-gradient(circle at "+Math.round(pts[0][0]*100)+"% "+Math.round(pts[0][1]*100)+"%, transparent 0, "+c[0]+" "+fr+"%),\n    ":"")+
      "radial-gradient(circle, "+c[1]+" "+rr+"px, transparent "+(rr+1)+"px) 0 0 / "+st+"px "+st+"px,\n    "+c[0]+";");
  }else if(b.kind==="grid"&&b.fmt!=="tile"){ var u2=Math.min(w,h)/1000, cs=Math.round(u2*(p.cell*1.7+20)), lw=Math.max(1,Math.round(u2*p.line*1.1)), sr=Math.round(Math.min(w,h)*p.sun/100*.62);
    lines.push("background:\n    "+(sr>0?"radial-gradient(circle "+sr+"px at "+Math.round(pts[0][0]*100)+"% "+Math.round(pts[0][1]*100)+"%, "+c[2]+" 0, "+c[1]+" "+(sr-1)+"px, transparent "+sr+"px),\n    ":"")+
      "linear-gradient("+c[4]+" "+lw+"px, transparent "+lw+"px) 0 0 / "+cs+"px "+cs+"px,\n    linear-gradient(90deg, "+c[4]+" "+lw+"px, transparent "+lw+"px) 0 0 / "+cs+"px "+cs+"px,\n    linear-gradient("+c[0]+", "+mix(c[0],c[3],.45)+");");
    if(b.anim){ lines.push("animation:fon-grid 4s linear infinite;"); kf="@keyframes fon-grid{ to{ background-position:0 0, 0 "+cs+"px, 0 "+cs+"px, 0 0; } }"; }
  }else if(b.kind==="rays"){ var n=Math.round(p.count/2)*2, a=360/n, al=Math.round(p.contrast/100*.75*255).toString(16); if(al.length<2) al="0"+al;
    var gr=Math.round(Math.min(w,h)*(.12+p.glow/100*.55)), at=Math.round(pts[0][0]*100)+"% "+Math.round(pts[0][1]*100)+"%";
    lines.push("background:\n    "+(p.glow>0?"radial-gradient(circle "+gr+"px at "+at+", "+c[3]+", transparent),\n    ":"")+"repeating-conic-gradient(from var(--fon-a, 0deg) at "+at+", "+c[3]+al+" 0 "+f1(a)+"deg, transparent "+f1(a)+"deg "+f1(a*2)+"deg),\n    "+c[1]+";");
    if(b.anim){ lines.push("animation:fon-rays 90s linear infinite;"); kf="@property --fon-a{ syntax:'<angle>'; inherits:false; initial-value:0deg; }\n@keyframes fon-rays{ to{ --fon-a:360deg; } }"; }
  }else{
    var tile=b.fmt==="tile", s=svg(b,tile?400:w,tile?400:h,{anim:true,id:"c"});
    lines.push("background:"+c[0]+" "+svgUrl(s)+(tile?" 0 0 / "+Math.round(400*k*2)/2+"px repeat":" center / cover no-repeat")+";");
  }
  if(b.grain>0&&["aurora","dots","grid","rays"].indexOf(b.kind)>=0&&b.fmt!=="tile"){
    lines.push("/* "+(window.TR?TR("зерно: отдельный слой поверх, чтобы не трогать сам фон"):"зерно: отдельный слой поверх, чтобы не трогать сам фон")+" */");
    var g='<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><filter id="n"><feTurbulence type="fractalNoise" baseFrequency=".8" numOctaves="2" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/></filter><rect width="200" height="200" filter="url(#n)" opacity="'+f1(b.grain/100*1.3)+'"/></svg>';
    return { css:sel+"{\n  position:relative;\n  "+lines.join("\n  ")+"\n}\n"+sel+"::after{\n  content:\"\";\n  position:absolute; inset:0; pointer-events:none;\n  background:"+svgUrl(g)+";\n  mix-blend-mode:soft-light;\n}"+(kf?"\n"+kf:""), sel:sel };
  }
  return { css:sel+"{\n  "+lines.join("\n  ")+"\n}"+(kf?"\n"+kf:""), sel:sel };
}

/* ─── шаблоны ─── */
function P(name){ for(var i=0;i<PALS.length;i++) if(PALS[i][0]===name) return PALS[i][1].slice(); return PALS[0][1].slice(); }
var TPLS=[
  { id:"neon_aurora", name:"Неоновая аврора", kind:"aurora", pal:P("Неон"), seed:5, grain:18 },
  { id:"sunset", name:"Закат", kind:"aurora", pal:P("Закат"), seed:11, grain:14, pts:[[.15,.2],[.85,.2],[.55,.85],[.2,.9],[.5,.45]] },
  { id:"sea", name:"Морские волны", kind:"waves", pal:P("Океан"), seed:2, grain:8 },
  { id:"dunes", name:"Песчаные дюны", kind:"waves", pal:P("Песок"), seed:7, grain:20, p:{count:6,amp:30,freq:1} },
  { id:"map", name:"Карта высот", kind:"topo", pal:P("Кузня"), seed:4, grain:10 },
  { id:"night_topo", name:"Ночная топография", kind:"topo", pal:P("Ночь"), seed:9, grain:6, p:{density:70,width:10,wobble:65} },
  { id:"crystal", name:"Кристаллы", kind:"lowpoly", pal:P("Океан"), seed:1, grain:0 },
  { id:"retro", name:"Ретро-солнце", kind:"grid", pal:P("Неон"), seed:3, grain:12 },
  { id:"dark_dots", name:"Точки в темноте", kind:"dots", pal:["#0b0f1a","#4fd6c8","#2d7ff9","#7c3aed","#1e293b"], seed:2, grain:10 },
  { id:"party", name:"Праздник", kind:"confetti", pal:P("Пастель"), seed:9, grain:0 },
  { id:"soft_blobs", name:"Мягкие пятна", kind:"blobs", pal:P("Пастель"), seed:6, grain:16, p:{soft:35} },
  { id:"rays", name:"Лучи", kind:"rays", pal:P("Закат"), seed:8, grain:10 }
];
function fromTpl(id){ var t=TPLS.filter(function(x){ return x.id===id; })[0]||TPLS[0]; var b=newBg(t.kind,t.pal,t.seed);
  if(t.p) for(var k in t.p) b.p[k]=t.p[k]; b.grain=t.grain; b.pts=t.pts?t.pts.map(function(x){ return x.slice(); }):K[t.kind].pts(b.p); b.title=t.name; return fixBg(b); }

window.FONY={ KINDS:K, ORDER:ORDER, PALS:PALS, FMTS:FMTS, TPLS:TPLS, newBg:newBg, fixBg:fixBg, fromTpl:fromTpl, svg:svg, css:css, randomPal:randomPal, mix:mix };
})();
