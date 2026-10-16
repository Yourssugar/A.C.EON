/* Aceonium: персонаж. Главная деталь игры, поэтому отдельный файл.

   MageKit.build(THREE, look, quality) -> M
     M.root           группа (смотрит в +z, сцена поворачивает её спиной к камере)
     M.update(dt, mode, fatigue)   mode: walk | fight | sit | idle
     M.setLook({gender, robe, trim})  M.setTier(n, colors)  M.setQuality(q)
     M.core / M.coreMat / M.head / M.kick   для сцены (всплески, Zzz)

   Что внутри:
   - Плащ и короткая накидка на плечах: настоящая ткань (сетка частиц, Верле),
     висят на плечах, огибают тело, развеваются от ходьбы и ветра, ложатся на землю, когда маг сидит.
   - Ткань: рисованная текстура (переплетение, потёртости, грязь к низу, заплатка со стежками),
     карта нормалей из той же фактуры, рваный край и дырки через альфа-карту.
   - Капюшон с острым загнутым назад верхом, тёмный изнутри, из темноты светятся глаза.
   - Рукава-колокола с рваными манжетами, пальцы обхватывают посох.
   - Посох: узловатое дерево с корой, корни-когти держат стеклянную сферу с вращающейся галактикой. */
(function(){
'use strict';

var T=null;
var cache={};

/* ── детерминированный случайный ряд, чтобы ткань выглядела одинаково при каждом запуске ── */
function prng(seed){return function(){seed=(seed*16807)%2147483647;return (seed-1)/2147483646;};}

function cnv(w,h){var c=document.createElement('canvas');c.width=w;c.height=h;return c;}
function texFrom(c,srgb,repeat){
  var t=new T.CanvasTexture(c);
  if(srgb)t.colorSpace=T.SRGBColorSpace;
  if(repeat){t.wrapS=t.wrapT=T.RepeatWrapping;}
  t.anisotropy=8;
  return t;
}
/* карта нормалей из карты высот (оператор Собеля) */
function normalFromHeight(hc,strength){
  var w=hc.width,h=hc.height,src=hc.getContext('2d').getImageData(0,0,w,h).data;
  var out=cnv(w,h),og=out.getContext('2d'),img=og.createImageData(w,h),d=img.data;
  function H(x,y){x=(x+w)%w;y=(y+h)%h;return src[(y*w+x)*4]/255;}
  for(var y=0;y<h;y++)for(var x=0;x<w;x++){
    var dx=(H(x+1,y-1)+2*H(x+1,y)+H(x+1,y+1))-(H(x-1,y-1)+2*H(x-1,y)+H(x-1,y+1));
    var dy=(H(x-1,y+1)+2*H(x,y+1)+H(x+1,y+1))-(H(x-1,y-1)+2*H(x,y-1)+H(x+1,y-1));
    var nx=-dx*strength,ny=-dy*strength,nz=1,l=Math.sqrt(nx*nx+ny*ny+nz*nz);
    var i=(y*w+x)*4;d[i]=(nx/l*0.5+0.5)*255;d[i+1]=(ny/l*0.5+0.5)*255;d[i+2]=(nz/l*0.5+0.5)*255;d[i+3]=255;
  }
  og.putImageData(img,0,0);
  return out;
}

/* ════════ ФАКТУРА ТКАНИ ════════ */
function fabric(kind){
  if(cache['fab'+kind])return cache['fab'+kind];
  var R=prng(kind==='cloak'?11:kind==='cape'?23:kind==='hood'?37:51);
  /* цвет (серый, умножается на цвет мантии): пятна, складки, грязь к низу, заплатка */
  var c=cnv(512,512),g=c.getContext('2d');
  g.fillStyle='#d6d2c8';g.fillRect(0,0,512,512);
  for(var i=0;i<70;i++){
    var x=R()*512,y=R()*512,r=20+R()*90,gr=g.createRadialGradient(x,y,0,x,y,r),a=0.05+R()*0.09;
    var dark=R()<0.6;gr.addColorStop(0,dark?'rgba(60,50,40,'+a+')':'rgba(255,250,235,'+a+')');gr.addColorStop(1,'rgba(0,0,0,0)');
    g.fillStyle=gr;g.fillRect(0,0,512,512);
  }
  /* вертикальные складки: мягкие тёмные и светлые полосы */
  for(var f=0;f<34;f++){
    var fx=R()*512,fw=6+R()*22,grad=g.createLinearGradient(fx-fw,0,fx+fw,0);
    grad.addColorStop(0,'rgba(0,0,0,0)');grad.addColorStop(0.5,R()<0.55?'rgba(40,30,20,.13)':'rgba(255,255,240,.10)');grad.addColorStop(1,'rgba(0,0,0,0)');
    g.fillStyle=grad;g.fillRect(fx-fw,R()*80,fw*2,512);
  }
  /* грязь и пыль к низу */
  var mud=g.createLinearGradient(0,300,0,512);mud.addColorStop(0,'rgba(70,50,30,0)');mud.addColorStop(0.6,'rgba(70,50,30,.28)');mud.addColorStop(1,'rgba(50,35,20,.55)');
  g.fillStyle=mud;g.fillRect(0,300,512,212);
  for(var m=0;m<160;m++){g.fillStyle='rgba(60,42,25,'+(0.08+R()*0.2)+')';var my=380+R()*132;g.beginPath();g.ellipse(R()*512,my,2+R()*10,1+R()*4,R()*3,0,Math.PI*2);g.fill();}
  /* потёртости: светлые выцветшие мазки */
  g.lineCap='round';
  for(var s=0;s<120;s++){g.strokeStyle='rgba(255,250,235,'+(0.04+R()*0.08)+')';g.lineWidth=1+R()*3;var sx=R()*512,sy=R()*512;g.beginPath();g.moveTo(sx,sy);g.lineTo(sx+(R()-0.5)*30,sy+R()*40);g.stroke();}
  /* швы и заплатка */
  function stitches(x0,y0,x1,y1,step){
    var len=Math.hypot(x1-x0,y1-y0),n=Math.floor(len/step);
    g.strokeStyle='rgba(30,22,14,.55)';g.lineWidth=1.6;
    for(var k=0;k<n;k+=1){var t0=k/n,t1=(k+0.55)/n;g.beginPath();g.moveTo(x0+(x1-x0)*t0,y0+(y1-y0)*t0);g.lineTo(x0+(x1-x0)*t1,y0+(y1-y0)*t1);g.stroke();}
  }
  if(kind==='cloak'||kind==='robe'){
    var px=120+R()*240,py=180+R()*120,pw=50+R()*30,ph=44+R()*30,ang=(R()-0.5)*0.3;
    g.save();g.translate(px,py);g.rotate(ang);
    g.fillStyle='rgba(120,100,80,.35)';g.fillRect(-pw/2,-ph/2,pw,ph);
    g.strokeStyle='rgba(30,20,10,.35)';g.lineWidth=2;g.strokeRect(-pw/2,-ph/2,pw,ph);
    g.translate(-px,-py);g.restore();
    g.save();g.translate(px,py);g.rotate(ang);
    stitches(-pw/2+4,-ph/2+4,pw/2-4,-ph/2+4,7);stitches(pw/2-4,-ph/2+4,pw/2-4,ph/2-4,7);
    stitches(pw/2-4,ph/2-4,-pw/2+4,ph/2-4,7);stitches(-pw/2+4,ph/2-4,-pw/2+4,-ph/2+4,7);
    g.restore();
  }
  stitches(4,10,508,10,9);
  stitches(10,14,10,500,9);stitches(502,14,502,500,9);
  var map=texFrom(c,true,false);

  /* высоты: переплетение нитей, мелкие ворсинки, повторяется */
  var hc=cnv(256,256),hg=hc.getContext('2d');
  hg.fillStyle='#808080';hg.fillRect(0,0,256,256);
  for(var yy=0;yy<256;yy+=4)for(var xx=0;xx<256;xx+=4){
    var up=((xx+yy)>>2)%2;
    var gr2=hg.createLinearGradient(xx,yy,up?xx+4:xx,up?yy:yy+4);
    gr2.addColorStop(0,'#5a5a5a');gr2.addColorStop(0.5,up?'#c8c8c8':'#a0a0a0');gr2.addColorStop(1,'#5a5a5a');
    hg.fillStyle=gr2;hg.fillRect(xx,yy,4,4);
  }
  for(var fb=0;fb<500;fb++){hg.strokeStyle='rgba('+(R()<0.5?'255,255,255':'0,0,0')+','+(0.1+R()*0.25)+')';hg.lineWidth=0.7;var fx2=R()*256,fy2=R()*256;hg.beginPath();hg.moveTo(fx2,fy2);hg.lineTo(fx2+(R()-0.5)*8,fy2+(R()-0.5)*8);hg.stroke();}
  var nm=texFrom(normalFromHeight(hc,2.2),false,true);
  nm.repeat.set(kind==='hood'?3:6,kind==='hood'?3:6);

  /* альфа: рваный низ полосами, пара дыр */
  var ac=cnv(256,512),ag=ac.getContext('2d');
  ag.fillStyle='#fff';ag.fillRect(0,0,256,512);
  ag.fillStyle='#000';
  var depth=kind==='robe'?40:kind==='hood'?0:70;
  if(depth){
    ag.beginPath();ag.moveTo(0,512);
    var x=0;
    while(x<=256){
      var wid=4+R()*14,deep=R()<0.25?depth*(0.6+R()*0.6):depth*(0.08+R()*0.3);
      ag.lineTo(x,512-depth*0.1-R()*6);
      ag.lineTo(x+wid*0.35,512-deep);ag.lineTo(x+wid*0.6,512-deep*0.85);
      ag.lineTo(x+wid,512-depth*0.1-R()*8);
      x+=wid;
    }
    ag.lineTo(256,512);ag.closePath();ag.fill();
    for(var hh=0;hh<(kind==='cloak'?4:2);hh++){
      var hx=20+R()*216,hy=512-depth*1.4-R()*120,hr=3+R()*6;
      ag.beginPath();ag.ellipse(hx,hy,hr*0.7,hr,R()*3,0,Math.PI*2);ag.fill();
    }
  }
  var am=texFrom(ac,false,false);
  cache['fab'+kind]={map:map,normalMap:nm,alphaMap:am};
  return cache['fab'+kind];
}
function barkMaps(){
  if(cache.bark)return cache.bark;
  var R=prng(77);
  var c=cnv(128,256),g=c.getContext('2d');
  g.fillStyle='#6a4a30';g.fillRect(0,0,128,256);
  for(var i=0;i<140;i++){
    var x=R()*128,w=1+R()*4;
    g.strokeStyle=R()<0.5?'rgba(30,18,10,'+(0.3+R()*0.4)+')':'rgba(150,110,70,'+(0.15+R()*0.25)+')';
    g.lineWidth=w;g.beginPath();g.moveTo(x,0);
    for(var y=0;y<=256;y+=16)g.lineTo(x+Math.sin(y*0.05+i)*3+(R()-0.5)*2,y);
    g.stroke();
  }
  for(var k=0;k<6;k++){var kx=R()*128,ky=R()*256;var gr=g.createRadialGradient(kx,ky,0,kx,ky,10);gr.addColorStop(0,'rgba(20,10,5,.8)');gr.addColorStop(1,'rgba(20,10,5,0)');g.fillStyle=gr;g.fillRect(kx-10,ky-10,20,20);}
  var map=texFrom(c,true,true);
  var hc=cnv(128,256),hg=hc.getContext('2d');hg.drawImage(c,0,0);
  var nm=texFrom(normalFromHeight(hc,3),false,true);
  cache.bark={map:map,normalMap:nm};
  return cache.bark;
}
function galaxyTex(){
  if(cache.gal)return cache.gal;
  var R=prng(5),c=cnv(256,256),g=c.getContext('2d');
  g.fillStyle='#000';g.fillRect(0,0,256,256);
  g.globalCompositeOperation='lighter';
  function dot(x,y,r,col,a){var gr=g.createRadialGradient(x,y,0,x,y,r);gr.addColorStop(0,'rgba('+col+','+a+')');gr.addColorStop(1,'rgba('+col+',0)');g.fillStyle=gr;g.fillRect(x-r,y-r,r*2,r*2);}
  dot(128,128,120,'60,90,200',0.35);
  for(var arm=0;arm<2;arm++){
    for(var i=0;i<900;i++){
      var t=R(),ang=t*7.5+arm*Math.PI+(R()-0.5)*0.5,rad=6+t*100+(R()-0.5)*10;
      var x=128+Math.cos(ang)*rad,y=128+Math.sin(ang)*rad*0.62;
      var col=R()<0.25?'255,180,240':R()<0.5?'150,200,255':'230,240,255';
      dot(x,y,2+R()*5*(1-t),col,0.12+R()*0.25);
    }
  }
  dot(128,128,26,'255,245,220',0.95);dot(128,128,60,'255,210,160',0.35);
  for(var s=0;s<120;s++)dot(R()*256,R()*256,1.2+R()*1.5,'255,255,255',0.5+R()*0.5);
  cache.gal=texFrom(c,true,false);
  return cache.gal;
}
function glowTex(){
  if(cache.glow)return cache.glow;
  var c=cnv(64,64),g=c.getContext('2d'),r=g.createRadialGradient(32,32,0,32,32,32);
  r.addColorStop(0,'rgba(255,255,255,1)');r.addColorStop(0.25,'rgba(255,255,255,.7)');r.addColorStop(0.6,'rgba(255,255,255,.15)');r.addColorStop(1,'rgba(255,255,255,0)');
  g.fillStyle=r;g.fillRect(0,0,64,64);
  cache.glow=texFrom(c,true,false);return cache.glow;
}

/* ════════ ГЕОМЕТРИЯ-ПОМОЩНИКИ ════════ */
/* трубка с утончением r0 -> r1 по кривой (ветви, корни, посох) */
function taperTube(points,segs,r0,r1,radial,noise){
  var curve=new T.CatmullRomCurve3(points),frames=curve.computeFrenetFrames(segs,false);
  var pos=[],uv=[],idx=[],R=prng(points.length*31+segs);
  for(var i=0;i<=segs;i++){
    var u=i/segs,p=curve.getPointAt(u),N=frames.normals[i],B=frames.binormals[i];
    var r=r0+(r1-r0)*u;
    for(var j=0;j<=radial;j++){
      var a=j/radial*Math.PI*2,rr=r*(1+(noise||0)*(Math.sin(a*3+i*1.3)*0.5+(R()-0.5)*0.6));
      var cx=Math.cos(a),sx=Math.sin(a);
      pos.push(p.x+rr*(cx*N.x+sx*B.x),p.y+rr*(cx*N.y+sx*B.y),p.z+rr*(cx*N.z+sx*B.z));
      uv.push(j/radial,u*4);
    }
  }
  for(var i2=0;i2<segs;i2++)for(var j2=0;j2<radial;j2++){
    var a0=i2*(radial+1)+j2,b0=a0+radial+1;
    idx.push(a0,b0,a0+1,b0,b0+1,a0+1);
  }
  var geo=new T.BufferGeometry();
  geo.setAttribute('position',new T.Float32BufferAttribute(pos,3));
  geo.setAttribute('uv',new T.Float32BufferAttribute(uv,2));
  geo.setIndex(idx);geo.computeVertexNormals();
  return geo;
}
/* тело вращения со складками: r += amp(y) * волна по углу */
function foldedLathe(prof,seg,folds,amp,phiStart,phiLen){
  var geo=new T.LatheGeometry(prof.map(function(q){return new T.Vector2(q[0],q[1]);}),seg,phiStart||0,phiLen||Math.PI*2);
  var p=geo.attributes.position,uvs=geo.attributes.uv,R=prng(seg*7+folds);
  var ph=[];for(var k=0;k<4;k++)ph.push(R()*6);
  var y0=Infinity,y1=-Infinity;prof.forEach(function(q){y0=Math.min(y0,q[1]);y1=Math.max(y1,q[1]);});
  for(var i=0;i<p.count;i++){
    var x=p.getX(i),z=p.getZ(i),y=p.getY(i),r=Math.hypot(x,z);
    uvs.setY(i,(y-y0)/(y1-y0));      /* v по высоте: рваный край и грязь всегда внизу */
    if(r<1e-4)continue;
    var a=Math.atan2(z,x),k2=amp((y-y0)/(y1-y0));
    var w=Math.sin(a*folds+ph[0])*0.6+Math.sin(a*folds*1.7+ph[1]+y*3)*0.3+Math.sin(a*folds*0.5+ph[2])*0.4;
    var nr=r+w*k2;p.setX(i,x/r*nr);p.setZ(i,z/r*nr);
  }
  geo.computeVertexNormals();
  return geo;
}

/* ════════ ТКАНЬ (частицы Верле) ════════ */
function Cloth(o){
  var C=this;
  C.cols=o.cols;C.rows=o.rows;C.iter=o.iter;C.margin=o.margin;C.bodyR=o.bodyR;
  var n=C.cols*C.rows;
  C.p=new Float32Array(n*3);C.q=new Float32Array(n*3);C.pin=new Uint8Array(n);
  /* исходная форма: дуга вокруг спины (спина: -z), сверху у шеи, вниз до подола */
  /* сзади длиннее, к бокам короче; волна по кругу даёт продольные складки, связи их запоминают */
  for(var r=0;r<C.rows;r++){
    var t=r/(C.rows-1);
    for(var c=0;c<C.cols;c++){
      var a=-o.arc+2*o.arc*c/(C.cols-1),i=(r*C.cols+c)*3;
      var len=o.len*(1-(o.side||0)*(1-Math.cos(a))*0.5);
      var y=o.top-t*len;
      var rad=Math.max(o.neck,C.bodyR(y)+C.margin)+(o.flare||0)*t;
      if(r===0)rad=o.neck;
      else rad+=(o.folds||0)*Math.min(1,t*2.5)*(Math.sin(a*o.foldN+0.7)*0.7+Math.sin(a*o.foldN*1.9+2.1)*0.3);
      C.p[i]=Math.sin(a)*rad;C.p[i+1]=y;C.p[i+2]=-Math.cos(a)*rad;
    }
  }
  C.q.set(C.p);
  for(var c2=0;c2<C.cols;c2++)C.pin[c2]=1;
  C.rest=new Float32Array(C.p);
  /* связи: соседи, диагонали, через одну (жёсткость на изгиб) */
  var L=[];
  function link(a,b,k){var ia=a*3,ib=b*3;L.push(a,b,Math.hypot(C.p[ia]-C.p[ib],C.p[ia+1]-C.p[ib+1],C.p[ia+2]-C.p[ib+2]),k);}
  for(var rr=0;rr<C.rows;rr++)for(var cc=0;cc<C.cols;cc++){
    var id=rr*C.cols+cc;
    if(cc<C.cols-1)link(id,id+1,1);
    if(rr<C.rows-1)link(id,id+C.cols,1);
    if(cc<C.cols-1&&rr<C.rows-1){link(id,id+C.cols+1,0.7);link(id+1,id+C.cols,0.7);}
    if(cc<C.cols-2)link(id,id+2,0.35);
    if(rr<C.rows-2)link(id,id+C.cols*2,0.35);
  }
  C.links=new Float32Array(L);
  /* сетка */
  var pos=new Float32Array(n*3),uv=[],idx=[];
  for(var r3=0;r3<C.rows;r3++)for(var c3=0;c3<C.cols;c3++)uv.push(c3/(C.cols-1),1-r3/(C.rows-1));
  for(var r4=0;r4<C.rows-1;r4++)for(var c4=0;c4<C.cols-1;c4++){
    var a0=r4*C.cols+c4,b0=a0+C.cols;idx.push(a0,b0,a0+1,b0,b0+1,a0+1);
  }
  C.geo=new T.BufferGeometry();
  C.geo.setAttribute('position',new T.BufferAttribute(pos,3));
  C.geo.setAttribute('uv',new T.Float32BufferAttribute(uv,2));
  C.geo.setIndex(idx);
  C.acc=0;
  C.sync();
}
Cloth.prototype.sync=function(){
  var a=this.geo.attributes.position;a.array.set(this.p);a.needsUpdate=true;
  this.geo.computeVertexNormals();
  this.geo.computeBoundingSphere();
};
/* один шаг: f = {gx,gy,gz, wind:[x,y,z], gust, floor, time} в координатах тела */
Cloth.prototype.step=function(h,f){
  var C=this,p=C.p,q=C.q,n=C.cols*C.rows,damp=0.985,h2=h*h;
  for(var i=0;i<n;i++){
    if(C.pin[i])continue;
    var k=i*3,x=p[k],y=p[k+1],z=p[k+2];
    var r=Math.floor(i/C.cols),t=r/(C.rows-1);
    /* ветер сильнее к низу, с рябью по ткани */
    var ripple=1+0.6*Math.sin(f.time*5.3+i*0.71)+0.4*Math.sin(f.time*2.1+r*0.9);
    var wk=t*t*ripple*f.gust;
    var ax=f.gx+f.wind[0]*wk,ay=f.gy+f.wind[1]*wk,az=f.gz+f.wind[2]*wk;
    p[k]=x+(x-q[k])*damp+ax*h2;p[k+1]=y+(y-q[k+1])*damp+ay*h2;p[k+2]=z+(z-q[k+2])*damp+az*h2;
    q[k]=x;q[k+1]=y;q[k+2]=z;
  }
  var L=C.links,nl=L.length;
  for(var it=0;it<C.iter;it++){
    for(var j=0;j<nl;j+=4){
      var A=L[j]*3,B=L[j+1]*3,rest=L[j+2],st=L[j+3];
      var dx=p[B]-p[A],dy=p[B+1]-p[A+1],dz=p[B+2]-p[A+2],d=Math.sqrt(dx*dx+dy*dy+dz*dz)||1e-6;
      var diff=(d-rest)/d*st;
      var pa=C.pin[L[j]],pb=C.pin[L[j+1]];
      if(pa&&pb)continue;
      var wa=pa?0:pb?1:0.5,wb=pb?0:pa?1:0.5;
      p[A]+=dx*diff*wa;p[A+1]+=dy*diff*wa;p[A+2]+=dz*diff*wa;
      p[B]-=dx*diff*wb;p[B+1]-=dy*diff*wb;p[B+2]-=dz*diff*wb;
    }
    /* тело: ткань не проходит внутрь; пол */
    for(var m=0;m<n;m++){
      if(C.pin[m])continue;
      var km=m*3,yy=p[km+1];
      if(yy<f.floor){p[km+1]=f.floor;yy=f.floor;q[km]=p[km]*0.3+q[km]*0.7;q[km+2]=p[km+2]*0.3+q[km+2]*0.7;}
      var R=C.bodyR(yy)+C.margin,xx=p[km],zz=p[km+2],rr=Math.sqrt(xx*xx+zz*zz);
      if(rr<R&&rr>1e-5){var s=R/rr;p[km]=xx*s;p[km+2]=zz*s;}
    }
  }
};
Cloth.prototype.update=function(dt,f){
  this.acc=Math.min(this.acc+dt,1/20);
  var h=1/60,steps=0;
  while(this.acc>=h&&steps<3){this.step(h,f);this.acc-=h;steps++;}
  if(steps)this.sync();
};
/* сдвинуть всю ткань (после смены позы без рывка) */
Cloth.prototype.reset=function(){this.p.set(this.rest);this.q.set(this.rest);this.sync();};

/* ════════ МАГ ════════ */
var PROFILE={
  m:[[0,0.02],[0.40,0.02],[0.41,0.08],[0.37,0.42],[0.31,0.78],[0.28,0.98],[0.32,1.1],[0.31,1.17],[0.17,1.27],[0.09,1.3],[0,1.3]],
  f:[[0,0.02],[0.45,0.02],[0.46,0.08],[0.35,0.40],[0.24,0.72],[0.215,0.82],[0.25,0.98],[0.265,1.08],[0.235,1.16],[0.13,1.26],[0.07,1.29],[0,1.29]]
};
function profileR(prof){
  return function(y){
    if(y<=prof[1][1])return prof[1][0];
    for(var i=2;i<prof.length;i++){
      var a=prof[i-1],b=prof[i];
      if(y<=b[1])return a[0]+(b[0]-a[0])*(y-a[1])/((b[1]-a[1])||1);
    }
    return 0.1;
  };
}
var Q={low:{cloak:[11,12],cape:[11,5],iter:3,phys:false},medium:{cloak:[15,16],cape:[15,6],iter:5,phys:false},
       high:{cloak:[19,22],cape:[19,7],iter:7,phys:true},ultra:{cloak:[23,26],cape:[23,8],iter:9,phys:true}};

function build(THREE,look,quality){
  T=THREE;
  var M={root:new T.Group(),pose:{lean:0.06,dy:0,armR:-0.45,armL:0,tilt:0.12,feet:0,glow:0.6,cw:0},t:0,kick:0,ring:0,tier:-1,gender:null,q:quality||'high',bodyHist:[0,0,0]};
  var body=new T.Group();M.root.add(body);M.body=body;
  var bark=barkMaps();
  M.mats={
    skin:new T.MeshStandardMaterial({color:0xd8a888,roughness:0.75}),
    dark:new T.MeshBasicMaterial({color:0x040304}),
    eye:new T.MeshBasicMaterial({color:0x9ff4ff}),
    wood:new T.MeshStandardMaterial({color:0xb08a68,map:bark.map,normalMap:bark.normalMap,roughness:0.9}),
    boot:new T.MeshStandardMaterial({color:0x2a1e16,roughness:0.8}),
    rope:new T.MeshStandardMaterial({color:0xb09a6a,roughness:0.95}),
    leather:new T.MeshStandardMaterial({color:0x5a3a22,roughness:0.7})
  };
  M.mats.wood.normalScale=new T.Vector2(1.2,1.2);
  M.parts=new T.Group();body.add(M.parts);

  /* ── посох ── */
  var staff=new T.Group();M.staff=staff;
  var sp=[],R=prng(3);
  for(var i=0;i<=10;i++)sp.push(new T.Vector3((R()-0.5)*0.05+Math.sin(i*1.3)*0.015,-0.85+i*0.19,(R()-0.5)*0.05));
  staff.add(new T.Mesh(taperTube(sp,40,0.036,0.03,8,0.18),M.mats.wood));
  for(var kn=2;kn<10;kn+=2){var knot=new T.Mesh(new T.SphereGeometry(0.045,8,6),M.mats.wood);knot.position.copy(sp[kn]);knot.scale.set(1,1.5,0.9);staff.add(knot);}
  /* корни-когти вокруг сферы */
  for(var c=0;c<5;c++){
    var a=c/5*Math.PI*2+0.3,cp=[];
    for(var j=0;j<=5;j++){
      var t=j/5,rad=0.025+Math.sin(t*Math.PI*0.92)*0.15;
      cp.push(new T.Vector3(Math.cos(a+t*0.9)*rad,1.0+t*0.33,Math.sin(a+t*0.9)*rad));
    }
    staff.add(new T.Mesh(taperTube(cp,14,0.03,0.01,6,0.15),M.mats.wood));
  }
  /* сфера: стекло + галактика внутри + блик */
  M.core=new T.Group();M.core.position.set(0,1.17,0);staff.add(M.core);
  M.coreMat=new T.MeshBasicMaterial({color:0x00e5ff,transparent:true,opacity:0.2,depthWrite:false});
  M.inner=new T.Mesh(new T.SphereGeometry(0.118,28,20),M.coreMat);M.core.add(M.inner);
  M.shellMat=new T.ShaderMaterial({
    uniforms:{col:{value:new T.Color(0x80f0ff)},k:{value:1}},
    vertexShader:'varying vec3 vN;varying vec3 vV;void main(){vec4 mv=modelViewMatrix*vec4(position,1.0);vN=normalize(normalMatrix*normal);vV=normalize(-mv.xyz);gl_Position=projectionMatrix*mv;}',
    fragmentShader:'uniform vec3 col;uniform float k;varying vec3 vN;varying vec3 vV;void main(){float f=pow(1.0-abs(dot(vN,vV)),2.2);gl_FragColor=vec4(col*(0.08+f*1.6)*k,1.0);}',
    transparent:true,blending:T.AdditiveBlending,depthWrite:false
  });
  M.shell=new T.Mesh(new T.SphereGeometry(0.13,32,24),M.shellMat);M.core.add(M.shell);
  M.galMat=new T.SpriteMaterial({map:galaxyTex(),color:0xffffff,transparent:true,blending:T.AdditiveBlending,depthWrite:false});
  M.gal=new T.Sprite(M.galMat);M.gal.scale.set(0.24,0.24,1);M.core.add(M.gal);
  M.spark=new T.Sprite(new T.SpriteMaterial({map:glowTex(),color:0xffffff,transparent:true,opacity:0.9,blending:T.AdditiveBlending,depthWrite:false}));
  M.spark.scale.set(0.05,0.05,1);M.spark.position.set(-0.05,0.06,0.09);M.core.add(M.spark);
  M.coreGlow=new T.Sprite(new T.SpriteMaterial({map:glowTex(),color:0x00e5ff,transparent:true,opacity:0.8,blending:T.AdditiveBlending,depthWrite:false}));
  M.coreGlow.scale.set(0.7,0.7,1);M.core.add(M.coreGlow);
  M.coreLight=new T.PointLight(0x00e5ff,1.2,5,1.6);M.core.add(M.coreLight);
  /* искры, кружащие вокруг сферы */
  M.motes=[];
  for(var mo=0;mo<6;mo++){var s=new T.Sprite(new T.SpriteMaterial({map:glowTex(),color:0x9ff4ff,transparent:true,blending:T.AdditiveBlending,depthWrite:false}));s.scale.set(0.035,0.035,1);s.userData={a:R()*6,r:0.17+R()*0.06,y:(R()-0.5)*0.15,s:0.8+R()*1.2};M.core.add(s);M.motes.push(s);}
  M.rings=[];
  for(var rg=0;rg<3;rg++){
    var ring=new T.Mesh(new T.TorusGeometry(0.2+rg*0.05,0.006,6,48),new T.MeshBasicMaterial({color:0x00e5ff,transparent:true,opacity:0.8,blending:T.AdditiveBlending,depthWrite:false}));
    ring.visible=false;M.core.add(ring);M.rings.push(ring);
  }
  M.fightRing=new T.Mesh(new T.TorusGeometry(0.3,0.01,6,48),new T.MeshBasicMaterial({color:0x00e5ff,transparent:true,opacity:0,blending:T.AdditiveBlending,depthWrite:false}));
  M.core.add(M.fightRing);

  M.setLook=function(l){setLook(M,l);};
  M.setTier=function(tier,colors){
    if(tier===M.tier)return;M.tier=tier;
    var col=new T.Color(colors[tier%colors.length]);
    M.coreMat.color.copy(col);M.shellMat.uniforms.col.value.copy(col).lerp(new T.Color(1,1,1),0.35);
    M.galMat.color.copy(col).lerp(new T.Color(1,1,1),0.55).multiplyScalar(1.6);
    M.coreGlow.material.color.copy(col);M.coreLight.color.copy(col);M.fightRing.material.color.copy(col);
    M.motes.forEach(function(s){s.material.color.copy(col).lerp(new T.Color(1,1,1),0.4);});
    M.core.scale.setScalar(1+Math.min(tier,6)*0.06);
    M.rings.forEach(function(r,i){r.visible=i<Math.min(tier,3);r.material.color.copy(col);});
  };
  M.setQuality=function(q){if(!Q[q]||q===M.q)return;M.q=q;var l=M.look;M.gender=null;if(l)setLook(M,l);};
  M.update=function(dt,mode,fat){update(M,dt,mode,fat);};
  M.setLook(look);
  M.setTier(0,['#00e5ff']);
  return M;
}

function clothMat(kind,color,phys){
  var f=fabric(kind);
  var o={color:color,map:f.map,normalMap:f.normalMap,normalScale:new T.Vector2(0.7,0.7),alphaMap:f.alphaMap,alphaTest:0.5,side:T.DoubleSide,roughness:0.95,metalness:0};
  var m;
  if(phys){o.sheen=0.5;o.sheenRoughness=0.7;o.sheenColor=new T.Color(0xfff2dc);m=new T.MeshPhysicalMaterial(o);}
  else m=new T.MeshStandardMaterial(o);
  return m;
}

function setLook(M,look){
  M.look={gender:look.gender,robe:look.robe,trim:look.trim};
  var robeC=new T.Color(look.robe),trimC=new T.Color(look.trim);
  if(M.gender===look.gender&&M.cm){
    M.cm.cloak.color.copy(robeC);M.cm.cape.color.copy(robeC).multiplyScalar(0.92);M.cm.hood.color.copy(robeC).multiplyScalar(0.95);
    M.cm.robe.color.copy(robeC).multiplyScalar(0.62);M.cm.sleeve.color.copy(robeC).multiplyScalar(0.8);M.mats.rope.color.copy(trimC);
    return;
  }
  M.gender=look.gender;
  var p=M.parts,QQ=Q[M.q]||Q.high;
  while(p.children.length){var ch=p.children.pop();ch.traverse(function(o){if(o.geometry)o.geometry.dispose();});}
  if(M.cloth){M.cloth=null;M.capeCloth=null;}
  var f=look.gender==='f',prof=PROFILE[f?'f':'m'],bodyR=profileR(prof);
  M.bodyR=bodyR;
  M.cm={cloak:clothMat('cloak',robeC.clone(),QQ.phys),cape:clothMat('cape',robeC.clone().multiplyScalar(0.92),QQ.phys),
        hood:clothMat('hood',robeC.clone().multiplyScalar(0.95),QQ.phys),robe:clothMat('robe',robeC.clone().multiplyScalar(0.62),QQ.phys),
        sleeve:clothMat('cape',robeC.clone().multiplyScalar(0.8),QQ.phys)};
  M.mats.rope.color.copy(trimC);
  function add(o){o.castShadow=true;o.receiveShadow=true;p.add(o);return o;}

  /* нижняя мантия со складками и рваным подолом */
  var rg=foldedLathe(prof,28,9,function(t){return (1-t)*0.03+0.004;});
  add(new T.Mesh(rg,M.cm.robe));
  /* верёвочный пояс с узлом и концами, кожаный кошель */
  var waistY=0.8,waistR=f?0.225:0.3;
  var belt=new T.Mesh(new T.TorusGeometry(waistR,0.022,6,28),M.mats.rope);belt.rotation.x=Math.PI/2;belt.position.y=waistY;add(belt);
  var knot=new T.Mesh(new T.SphereGeometry(0.035,8,6),M.mats.rope);knot.position.set(waistR*0.5,waistY,waistR*0.85);add(knot);
  [0,1].forEach(function(k){
    var ep=[new T.Vector3(waistR*0.5,waistY,waistR*0.88),new T.Vector3(waistR*0.5+0.02+k*0.03,waistY-0.15,waistR*0.95),new T.Vector3(waistR*0.5+0.01+k*0.05,waistY-0.32-k*0.06,waistR*0.9)];
    add(new T.Mesh(taperTube(ep,10,0.016,0.012,5,0.1),M.mats.rope));
  });
  var pouch=new T.Mesh(new T.SphereGeometry(0.07,10,8),M.mats.leather);pouch.scale.set(1,1.2,0.6);pouch.position.set(-waistR*0.85,waistY-0.1,waistR*0.4);add(pouch);
  /* сапоги */
  M.feet=[];
  [-1,1].forEach(function(sd){
    var bt=new T.Mesh(new T.SphereGeometry(0.075,10,8),M.mats.boot);bt.scale.set(0.9,0.6,1.7);bt.position.set(sd*0.11,0.045,0.06);add(bt);M.feet.push(bt);
  });

  /* ── голова и капюшон ── */
  var head=new T.Group();head.position.set(0,1.43,0);p.add(head);M.head=head;
  var face=new T.Mesh(new T.SphereGeometry(0.13,16,12),M.mats.skin);face.scale.set(0.95,1.05,1);head.add(face);
  /* тень капюшона на лице: тёмная полусфера изнутри */
  var shade=new T.Mesh(new T.SphereGeometry(0.19,18,12,0,Math.PI*2,0,Math.PI*0.6),M.mats.dark);shade.material.side=T.BackSide;shade.position.set(0,0.0,-0.01);head.add(shade);
  [-1,1].forEach(function(sd){var e=new T.Mesh(new T.SphereGeometry(0.016,6,5),M.mats.eye);e.position.set(sd*0.045,0.015,0.12);head.add(e);});
  if(f){
    /* коса: из-под капюшона на плечо */
    var hairM=new T.MeshStandardMaterial({color:0x6a3a20,roughness:0.6});
    for(var b=0;b<9;b++){var seg=new T.Mesh(new T.SphereGeometry(0.035-b*0.0018,8,6),hairM);seg.scale.set(1,1.4,1);seg.position.set(0.12+b*0.008,-0.12-b*0.06,0.07+Math.sin(b)*0.01);head.add(seg);}
    var fringe=new T.Mesh(new T.SphereGeometry(0.1,10,6,0,Math.PI*2,0,Math.PI*0.4),hairM);fringe.position.set(0,0.04,0.035);head.add(fringe);
  }else{
    var beardM=new T.MeshStandardMaterial({color:0x8a7a6a,roughness:0.9});
    var beard=new T.Mesh(new T.ConeGeometry(0.085,0.26,10),beardM);beard.rotation.x=Math.PI+0.3;beard.position.set(0,-0.15,0.08);head.add(beard);
  }
  /* капюшон: острый верх, загнут назад, складки, вырез для лица */
  var hp=[[0.0,0.46],[0.025,0.42],[0.07,0.34],[0.13,0.24],[0.19,0.11],[0.215,-0.02],[0.215,-0.13],[0.25,-0.22],[0.33,-0.28]];
  var hg=foldedLathe(hp,26,7,function(t){return (1-t)*0.012+0.004;},0.62,Math.PI*2-1.24);
  var hpos=hg.attributes.position;
  for(var hi=0;hi<hpos.count;hi++){
    var hy=hpos.getY(hi);
    if(hy>0.12){var k=(hy-0.12);hpos.setZ(hi,hpos.getZ(hi)-k*k*2.4);hpos.setX(hi,hpos.getX(hi)+k*k*0.25);}
  }
  hg.computeVertexNormals();
  var hood=new T.Mesh(hg,M.cm.hood);hood.position.set(0,0,-0.025);hood.scale.set(1,f?0.92:1,1.1);hood.castShadow=true;head.add(hood);M.hood=hood;

  /* ── руки: рукава-колокола, ладони, пальцы ── */
  var sh=f?0.22:0.27;
  function arm(sd){
    var g=new T.Group();g.position.set(sd*sh,1.17,0);
    var sl=foldedLathe([[0.055,0],[0.07,-0.15],[0.1,-0.35],[0.14,-0.5],[0.15,-0.53]],16,5,function(t){return (1-t)*0.012;});
    var slm=new T.Mesh(sl,M.cm.sleeve);slm.castShadow=true;g.add(slm);
    var hand=new T.Group();hand.position.set(0,-0.55,0);g.add(hand);
    var palm=new T.Mesh(new T.SphereGeometry(0.045,10,8),M.mats.skin);palm.scale.set(0.9,1.1,0.7);hand.add(palm);
    p.add(g);
    return {g:g,hand:hand};
  }
  var ar=arm(-1),al=arm(1);
  M.armR=ar.g;M.armL=al.g;
  /* правая кисть обхватывает посох: пальцы дугами вокруг древка */
  ar.hand.add(M.staff);M.staff.position.set(0,-0.01,0.035);
  for(var fg=0;fg<4;fg++){
    var finger=new T.Mesh(new T.TorusGeometry(0.043,0.013,6,10,Math.PI*1.3),M.mats.skin);
    finger.rotation.set(Math.PI/2,0,-0.5);finger.position.set(0,0.03-fg*0.024,0.035);ar.hand.add(finger);
  }
  var thumb=new T.Mesh(new T.CylinderGeometry(0.012,0.014,0.05,6),M.mats.skin);thumb.position.set(0.03,0.04,0.05);thumb.rotation.z=-0.6;ar.hand.add(thumb);
  for(var lf=0;lf<4;lf++){var lfin=new T.Mesh(new T.CylinderGeometry(0.01,0.012,0.06,6),M.mats.skin);lfin.position.set(-0.025+lf*0.017,-0.06,0.01);lfin.rotation.x=0.4;al.hand.add(lfin);}

  /* ── ткань: длинный плащ и короткая накидка ── */
  var cl=new Cloth({cols:QQ.cloak[0],rows:QQ.cloak[1],iter:QQ.iter,margin:0.05,bodyR:bodyR,top:1.3,len:f?1.08:1.24,neck:0.15,arc:1.72,flare:0.07,side:0.18,folds:0.035,foldN:7});
  var clm=new T.Mesh(cl.geo,M.cm.cloak);clm.castShadow=true;clm.receiveShadow=true;clm.frustumCulled=false;p.add(clm);
  var cp2=new Cloth({cols:QQ.cape[0],rows:QQ.cape[1],iter:QQ.iter,margin:0.1,bodyR:bodyR,top:1.33,len:f?0.44:0.52,neck:0.16,arc:2.35,flare:0.05,side:0.45,folds:0.025,foldN:6});
  var cpm=new T.Mesh(cp2.geo,M.cm.cape);cpm.castShadow=true;cpm.frustumCulled=false;p.add(cpm);
  M.cloth=cl;M.capeCloth=cp2;
  /* прогнать ткань, чтобы с первого кадра висела, а не стояла колоколом */
  var f0={gx:0,gy:-9.8,gz:0,wind:[0,0,0],gust:0,floor:0.02,time:0};
  for(var w=0;w<90;w++){cl.step(1/60,f0);cp2.step(1/60,f0);}
  cl.sync();cp2.sync();
}

function lerp(a,b,k){return a+(b-a)*k;}
function update(M,dt,mode,fat){
  M.t+=dt;
  var P=M.pose,k=1-Math.exp(-dt*7),tgt;
  fat=fat||0;
  if(mode==='walk')tgt={lean:0.06+0.22*fat,dy:0,armR:-0.42+0.12*fat,armL:0,tilt:0.12,feet:0,glow:0.6-0.3*fat};
  else if(mode==='fight')tgt={lean:0.02+0.1*fat,dy:0,armR:-0.95+0.25*fat,armL:-0.55,tilt:0.55,feet:0,glow:1-0.35*fat};
  else if(mode==='sit')tgt={lean:0.28,dy:-0.42,armR:-0.25,armL:-0.3,tilt:-0.35,feet:0.28,glow:0.25};
  else tgt={lean:0.02,dy:0,armR:-0.3,armL:0,tilt:0.0,feet:0,glow:0.7};
  for(var key in tgt)P[key]=lerp(P[key],tgt[key],k);
  M.kick=Math.max(0,M.kick-dt*6);
  var walkW=mode==='walk'?1:0,step=M.t*7*(1-0.35*fat);
  var bob=walkW*Math.abs(Math.sin(step))*0.05+(mode!=='walk'?Math.sin(M.t*(mode==='sit'?1.2:2.2))*0.012:0);
  M.body.position.y=bob;
  M.root.position.y=P.dy;
  M.body.rotation.x=P.lean;
  M.body.rotation.z=walkW*Math.sin(step)*0.03;
  if(M.feet){
    M.feet[0].position.z=0.06+walkW*Math.sin(step)*0.13+P.feet;
    M.feet[1].position.z=0.06-walkW*Math.sin(step)*0.13+P.feet;
    M.feet[0].position.y=0.045+walkW*Math.max(0,Math.cos(step))*0.045;
    M.feet[1].position.y=0.045+walkW*Math.max(0,-Math.cos(step))*0.045;
  }
  M.armR.rotation.x=P.armR+walkW*Math.sin(step)*0.08-M.kick*0.35;
  M.armL.rotation.x=P.armL-walkW*Math.sin(step)*0.3;
  M.armL.rotation.z=mode==='fight'?0.25:0.08;
  M.armR.rotation.z=-0.08;
  M.staff.rotation.x=-M.armR.rotation.x+P.tilt+M.kick*0.25+walkW*Math.sin(step)*0.06;
  if(M.head)M.head.rotation.x=mode==='sit'?0.25+Math.sin(M.t*0.8)*0.06:-P.lean*0.6;
  if(M.head)M.head.rotation.y=Math.sin(M.t*0.37)*0.06;
  /* сфера */
  var g=P.glow+M.kick*0.8;
  M.coreGlow.scale.setScalar(0.4+g*0.5+Math.sin(M.t*5)*0.03);
  M.coreGlow.material.opacity=Math.min(1,0.3+g*0.55);
  M.coreLight.intensity=0.4+g*1.6;
  M.shellMat.uniforms.k.value=0.7+g*0.6;
  M.galMat.rotation=M.t*0.35;
  M.gal.scale.setScalar(0.24*(0.95+Math.sin(M.t*2)*0.03+M.kick*0.08));
  M.motes.forEach(function(s){var u=s.userData,a=u.a+M.t*u.s;s.position.set(Math.cos(a)*u.r,u.y+Math.sin(a*1.7)*0.05,Math.sin(a)*u.r);s.material.opacity=0.4+0.5*Math.abs(Math.sin(a*2));});
  M.ring=lerp(M.ring,mode==='fight'?1:0,k);
  M.fightRing.material.opacity=M.ring*0.7;
  M.fightRing.scale.setScalar(1+Math.sin(M.t*4)*0.08);
  M.fightRing.rotation.x=M.t*1.3;M.fightRing.rotation.y=M.t*0.9;
  M.rings.forEach(function(r,i){r.rotation.x=M.t*(0.8+i*0.5);r.rotation.y=M.t*(1.1-i*0.3);});
  /* ткань: гравитация в координатах тела, ветер от ходьбы, инерция покачивания */
  if(M.cloth){
    var h=M.bodyHist,cur=M.body.position.y+M.root.position.y;
    var acc=dt>0?((cur-2*h[0]+h[1])/(dt*dt)):0;acc=Math.max(-30,Math.min(30,acc));
    h[1]=h[0];h[0]=cur;
    var lean=M.body.rotation.x,cl=Math.cos(lean),sl=Math.sin(lean);
    var gy=-9.8-acc;
    var wind=mode==='walk'?6*(1-0.3*fat):mode==='fight'?2.2:mode==='idle'?1.2:0.25;
    var gust=0.7+0.3*Math.sin(M.t*0.9)+0.25*Math.sin(M.t*2.7)+M.kick*0.6;
    var F={gx:0,gy:gy*cl,gz:-gy*sl,wind:[Math.sin(M.t*0.6)*0.25*wind,0.15*wind,-wind],gust:gust,floor:0.02-(M.root.position.y+M.body.position.y),time:M.t};
    M.cloth.update(dt,F);M.capeCloth.update(dt,F);
  }
}

window.MageKit={build:build,qualities:Q,
  setThree:function(THREE){T=THREE;},
  util:{prng:prng,cnv:cnv,texFrom:texFrom,normalFromHeight:normalFromHeight,taperTube:taperTube,barkMaps:barkMaps,
        galaxyTex:galaxyTex,glowTex:glowTex,fabric:fabric,foldedLathe:foldedLathe,Cloth:Cloth,profileR:profileR,PROFILE:PROFILE}};
})();
