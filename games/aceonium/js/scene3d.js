/* Aceonium: 3D-сцена (three.js r160 из games/shared/three).
   Всё собирается из примитивов в коде, файлов моделей нет. Вид из-за спины мага,
   лесная дорога едет на него, текстуры рисуются мазками на canvas.

   Scene3D.supported()            есть ли WebGL и динамический import
   Scene3D.load()                 подключить three.js (Promise)
   Scene3D.init(host)             создать сцену в элементе host
   Scene3D.setLook({gender,robe,trim})  внешность мага
   Scene3D.setTier(n)             ступень посоха (цвет и кольца сферы)
   Scene3D.setMode(m)             walk | fight | sit | tavern
   Scene3D.setFatigue(f)          0..1, походка и свечение
   Scene3D.spawn(enemy,walkT)     враг собирается из тени вдали за walkT секунд
   Scene3D.bolt(kind,crit)        всплеск из сферы: staff | click | discharge
   Scene3D.kill() / retreat()     смерть врага / враг исчезает (босс ушёл)
   Scene3D.enemyScreen()          {x,y} головы врага в пикселях хоста
   Scene3D.portal(cb)             вспышка портала, cb в середине
   Scene3D.frame(dt)              шаг анимации и отрисовка
   Scene3D.preview(canvas)        отдельное превью мага: {set(look), dispose()} */
(function(){
'use strict';

var THREE=null,loading=null;
var dynImport=null;
try{dynImport=new Function('u','return import(u)');}catch(e){dynImport=null;}

function supported(){
  if(!dynImport||!window.Promise||!window.fetch)return false;
  try{var c=document.createElement('canvas');return !!(window.WebGLRenderingContext&&(c.getContext('webgl2')||c.getContext('webgl')));}
  catch(e){return false;}
}
function load(){
  if(THREE)return Promise.resolve(THREE);
  if(loading)return loading;
  /* основной путь games/shared/three; если его ещё не выложили, берём копию из шахмат */
  loading=dynImport(Boot.url('../shared/three/three.module.min.js')).catch(function(e){
    console.warn('[aceonium] shared/three not found, trying chess/three',e);
    return dynImport(Boot.url('../chess/three/three.module.min.js'));
  }).then(function(m){THREE=m;window.ACE_THREE=m;return m;},function(e){loading=null;throw e;});
  return loading;
}

/* ── текстуры из canvas ── */
var texCache={};
function canvasTex(key,w,h,draw){
  if(texCache[key])return texCache[key];
  var c=document.createElement('canvas');c.width=w;c.height=h;
  draw(c.getContext('2d'),w,h);
  var t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;
  texCache[key]=t;return t;
}
function glowTex(){
  return canvasTex('glow',64,64,function(g,w){
    var r=g.createRadialGradient(32,32,0,32,32,32);
    r.addColorStop(0,'rgba(255,255,255,1)');r.addColorStop(0.25,'rgba(255,255,255,.7)');
    r.addColorStop(0.6,'rgba(255,255,255,.15)');r.addColorStop(1,'rgba(255,255,255,0)');
    g.fillStyle=r;g.fillRect(0,0,w,w);
  });
}
function zTex(){
  return canvasTex('z',64,64,function(g){
    g.fillStyle='#fff';g.font='bold 44px monospace';g.textAlign='center';g.textBaseline='middle';g.fillText('Z',32,34);
  });
}
/* ── биомы: лесная дорога в разное время суток ── */
var BIOMES=[
  {id:0,name:'dawn', skyTop:'#7d93ab',skyMid:'#c9c4b4',skyBot:'#f4d9a2',sun:'#ffe2a0',sunY:0.78,fog:'#a7b2b8',fogNear:10,fogFar:80,
   grass:'#4d6630',grass2:'#7a8a3a',road:'#b49a74',road2:'#8a7456',pine:'#3f6046',oak:'#8a9a3c',rock:'#8a8c8c',moss:'#5a7a30',
   hemiSky:'#d8e0e8',hemiGround:'#4a5a30',sunCol:'#ffe0b0',sunI:1.6,fill:0.75,hemiI:1.5,mote:'#fff0c0',moteOp:0.55,night:false,accent:'#ffd88a'},
  {id:1,name:'autumn',skyTop:'#6c6a8e',skyMid:'#c99a86',skyBot:'#f6b26a',sun:'#ffc070',sunY:0.82,fog:'#b89a84',fogNear:9,fogFar:72,
   grass:'#6a6428',grass2:'#9a7a30',road:'#a8865e',road2:'#7a5e42',pine:'#4a5a3a',oak:'#d0802e',rock:'#8a8278',moss:'#7a7a2a',
   hemiSky:'#ecd4bc',hemiGround:'#5a4826',sunCol:'#ffc890',sunI:1.7,fill:0.7,hemiI:1.4,mote:'#ffd090',moteOp:0.6,night:false,accent:'#ffb060'},
  {id:2,name:'night',skyTop:'#03061a',skyMid:'#0c1a38',skyBot:'#1e3a5c',sun:'#cfe8ff',sunY:0.7,fog:'#142236',fogNear:6,fogFar:55,
   grass:'#1a3020',grass2:'#24402a',road:'#4a4c56',road2:'#33353e',pine:'#0f2220',oak:'#1e3a2c',rock:'#3a4048',moss:'#1e3a28',
   hemiSky:'#5070b0',hemiGround:'#142018',sunCol:'#9fc4ff',sunI:1.15,fill:0.75,hemiI:1.35,mote:'#7ff0ff',moteOp:0.95,night:true,accent:'#00e5ff'},
  {id:3,name:'dusk', skyTop:'#2a1232',skyMid:'#8a3a4a',skyBot:'#f0703c',sun:'#ff9a50',sunY:0.86,fog:'#6e3e44',fogNear:8,fogFar:66,
   grass:'#3c3a20',grass2:'#5a4a24',road:'#806050',road2:'#5a4034',pine:'#3a2a2e',oak:'#7a3430',rock:'#5a4a4a',moss:'#4a4a22',
   hemiSky:'#d09090',hemiGround:'#3a2418',sunCol:'#ffa070',sunI:1.5,fill:0.65,hemiI:1.25,mote:'#ffa070',moteOp:0.6,night:false,accent:'#ff7040'}
];

/* случайные мазки: основа "рисованных" текстур */
function rnd(a,b){return a+Math.random()*(b-a);}
function shade(hex,k){var c=new THREE.Color(hex);c.multiplyScalar(k);return '#'+c.getHexString();}
function strokes(g,w,h,cols,n,len,wid,alpha){
  g.lineCap='round';
  for(var i=0;i<n;i++){
    g.strokeStyle=cols[i%cols.length];g.globalAlpha=alpha*rnd(0.4,1);g.lineWidth=rnd(wid*0.5,wid);
    var x=rnd(0,w),y=rnd(0,h),a=rnd(-0.6,0.6)-Math.PI/2,l=rnd(len*0.4,len);
    for(var ox=-w;ox<=w;ox+=w)for(var oy=-h;oy<=h;oy+=h){   // бесшовно по краям
      if(x+ox<-l||x+ox>w+l||y+oy<-l||y+oy>h+l)continue;
      g.beginPath();g.moveTo(x+ox,y+oy);g.lineTo(x+ox+Math.cos(a)*l,y+oy+Math.sin(a)*l);g.stroke();
    }
  }
  g.globalAlpha=1;
}
function grassTex(b){
  var t=canvasTex('grass'+b.id,256,256,function(g,w,h){
    g.fillStyle=b.grass;g.fillRect(0,0,w,h);
    strokes(g,w,h,[shade(b.grass,0.7),shade(b.grass,1.25),b.grass2,shade(b.grass2,0.8)],900,14,3,0.55);
    strokes(g,w,h,[shade(b.grass2,1.3),'#000'],160,8,2,0.25);
  });
  t.wrapS=t.wrapT=THREE.RepeatWrapping;t.anisotropy=4;return t;
}
function roadTex(b){
  var t=canvasTex('road'+b.id,256,256,function(g,w,h){
    var L=56,Rr=200;
    for(var y=0;y<h;y++){                                  // неровные края дороги
      var e1=L+Math.sin(y/h*Math.PI*4)*6+Math.sin(y/h*Math.PI*10)*3,e2=Rr+Math.sin(y/h*Math.PI*6+1)*6+Math.sin(y/h*Math.PI*14)*3;
      var grd=g.createLinearGradient(e1-18,0,e2+18,0);
      grd.addColorStop(0,'rgba(0,0,0,0)');
      grd.addColorStop(18/(e2-e1+36),b.road);
      grd.addColorStop(1-18/(e2-e1+36),b.road);
      grd.addColorStop(1,'rgba(0,0,0,0)');
      g.fillStyle=grd;g.fillRect(e1-18,y,e2-e1+36,1);
    }
    g.save();g.beginPath();g.rect(L-6,0,Rr-L+12,h);g.clip();
    strokes(g,w,h,[b.road2,shade(b.road,1.15),shade(b.road,0.85)],500,10,4,0.45);
    for(var i=0;i<70;i++){                                 // камешки
      var x=rnd(L,Rr),y=rnd(0,h),r=rnd(1.5,4.5);
      g.fillStyle=shade(b.rock,rnd(0.7,1.2));g.globalAlpha=0.85;
      g.beginPath();g.ellipse(x,y,r*1.3,r,rnd(0,3),0,Math.PI*2);g.fill();
      g.fillStyle='rgba(255,255,255,.25)';g.beginPath();g.ellipse(x-r*0.3,y-r*0.3,r*0.5,r*0.35,0,0,Math.PI*2);g.fill();
    }
    g.restore();g.globalAlpha=1;
    /* колеи */
    g.globalAlpha=0.18;g.fillStyle=shade(b.road2,0.7);g.fillRect(96,0,10,h);g.fillRect(152,0,10,h);g.globalAlpha=1;
  });
  t.wrapS=THREE.ClampToEdgeWrapping;t.wrapT=THREE.RepeatWrapping;t.anisotropy=8;return t;
}
function skyTex(b){
  return canvasTex('sky'+b.id,512,256,function(g,w,h){
    var r=g.createLinearGradient(0,0,0,h);r.addColorStop(0,b.skyTop);r.addColorStop(0.55,b.skyMid);r.addColorStop(0.9,b.skyBot);r.addColorStop(1,b.fog);
    g.fillStyle=r;g.fillRect(0,0,w,h);
    var sx=w*0.52,sy=h*b.sunY;
    var s=g.createRadialGradient(sx,sy,0,sx,sy,h*0.7);
    s.addColorStop(0,b.sun);s.addColorStop(0.15,b.night?'rgba(160,200,255,.35)':'rgba(255,230,170,.55)');s.addColorStop(1,'rgba(0,0,0,0)');
    g.fillStyle=s;g.fillRect(0,0,w,h);
    /* облака мазками */
    for(var i=0;i<26;i++){
      var cx=rnd(0,w),cy=rnd(h*0.08,h*0.62),cw=rnd(40,140),ch=rnd(8,22);
      var lit=Math.abs(cx-sx)<160&&!b.night;
      g.fillStyle=lit?'rgba(255,236,190,.35)':b.night?'rgba(120,150,200,.10)':'rgba(255,255,255,.18)';
      for(var k=0;k<5;k++){g.beginPath();g.ellipse(cx+rnd(-cw/2,cw/2),cy+rnd(-ch/2,ch/2),cw*rnd(0.3,0.6),ch*rnd(0.5,1),0,0,Math.PI*2);g.fill();}
    }
    if(b.night){g.fillStyle='#fff';for(var j=0;j<140;j++){g.globalAlpha=rnd(0.3,1);g.fillRect(rnd(0,w),rnd(0,h*0.6),1,1);}g.globalAlpha=1;
      g.fillStyle='#eaf4ff';g.beginPath();g.arc(sx,sy-30,10,0,Math.PI*2);g.fill();}
  });
}
/* дальняя кромка леса: силуэты елей */
function treelineTex(b,k){
  var col=new THREE.Color(b.pine).lerp(new THREE.Color(b.fog),k);
  return canvasTex('tl'+b.id+'_'+k,1024,256,function(g,w,h){
    g.fillStyle='#'+col.getHexString();
    var x=0;
    while(x<w){
      var tw=rnd(14,34),th=rnd(80,200)*(1-k*0.3);
      g.beginPath();g.moveTo(x-tw,h);
      for(var s=0;s<5;s++){var yy=h-th*(s/5);g.lineTo(x-tw*(1-s/5),yy);g.lineTo(x-tw*(1-s/5)*0.55,yy-th*0.08);}
      g.lineTo(x,h-th);
      for(var s2=4;s2>=0;s2--){var y2=h-th*(s2/5);g.lineTo(x+tw*(1-s2/5)*0.55,y2-th*0.08);g.lineTo(x+tw*(1-s2/5),y2);}
      g.lineTo(x+tw,h);g.fill();
      x+=rnd(10,26);
    }
    g.fillRect(0,h-40,w,40);
  });
}
function bladeTex(){
  return canvasTex('blade',64,64,function(g,w,h){
    g.lineCap='round';
    for(var i=0;i<16;i++){
      var x=rnd(10,54),bend=rnd(-10,10),ht=rnd(28,60);
      var gr=g.createLinearGradient(0,h,0,h-ht);gr.addColorStop(0,'#5a6a5a');gr.addColorStop(1,'#ffffff');
      g.strokeStyle=gr;g.lineWidth=rnd(1.5,3);
      g.beginPath();g.moveTo(x,h);g.quadraticCurveTo(x+bend*0.3,h-ht*0.6,x+bend,h-ht);g.stroke();
    }
  });
}
function smokeTex(){
  return canvasTex('smoke',64,64,function(g,w){
    for(var i=0;i<14;i++){
      var x=rnd(18,46),y=rnd(18,46),r=rnd(8,18);
      var gr=g.createRadialGradient(x,y,0,x,y,r);gr.addColorStop(0,'rgba(255,255,255,.35)');gr.addColorStop(1,'rgba(255,255,255,0)');
      g.fillStyle=gr;g.fillRect(0,0,w,w);
    }
  });
}

function plankTex(){
  var t=canvasTex('plank',128,128,function(g,w,h){
    g.fillStyle='#3a2414';g.fillRect(0,0,w,h);
    for(var i=0;i<8;i++){g.fillStyle=i%2?'#422a17':'#36210f';g.fillRect(0,i*16,w,15);g.fillStyle='#1c1008';g.fillRect((i*37)%w,i*16,2,16);}
  });
  t.wrapS=t.wrapT=THREE.RepeatWrapping;return t;
}
function stoneTex(){
  var t=canvasTex('stone',128,128,function(g,w,h){
    g.fillStyle='#1d1a22';g.fillRect(0,0,w,h);
    g.strokeStyle='#0c0a10';g.lineWidth=3;
    for(var y=0;y<5;y++){var off=y%2?20:0;for(var x=-1;x<4;x++)g.strokeRect(x*40+off,y*26,40,26);}
  });
  t.wrapS=t.wrapT=THREE.RepeatWrapping;return t;
}
/* ── общие помощники ── */
function std(color,o){
  o=o||{};
  return new THREE.MeshStandardMaterial({color:color,roughness:o.r!==undefined?o.r:0.8,metalness:o.m||0,flatShading:o.flat!==false,
    emissive:o.e||0x000000,emissiveIntensity:o.ei!==undefined?o.ei:1,transparent:!!o.op,opacity:o.op||1,side:o.side||THREE.FrontSide});
}
function mesh(geo,mat,x,y,z){var m=new THREE.Mesh(geo,mat);m.position.set(x||0,y||0,z||0);return m;}
function glowSprite(color,size,op){
  var m=new THREE.SpriteMaterial({map:glowTex(),color:color,transparent:true,opacity:op===undefined?1:op,blending:THREE.AdditiveBlending,depthWrite:false});
  var s=new THREE.Sprite(m);s.scale.set(size,size,1);return s;
}
function lerp(a,b,k){return a+(b-a)*k;}
/* рваный низ ткани: вершины ниже порога поднимаются на случайную высоту зубцами */
function ragged(geo,below,amp){
  var pos=geo.attributes.position,seed=7;
  function r(){seed=(seed*16807)%2147483647;return seed/2147483647;}
  var minY=Infinity;for(var i=0;i<pos.count;i++)minY=Math.min(minY,pos.getY(i));
  var lim=below>0?below:minY+0.01;
  for(var j=0;j<pos.count;j++){
    var y=pos.getY(j);
    if(y<=lim&&Math.hypot(pos.getX(j),pos.getZ(j))>0.05){var a=Math.atan2(pos.getZ(j),pos.getX(j));pos.setY(j,y+amp*(0.5+0.5*Math.sin(a*9))*r()+amp*0.2*r());}
  }
  geo.computeVertexNormals();
}
function galaxyTex(){
  return canvasTex('galaxy',256,128,function(g,w,h){
    g.fillStyle='#4a62b0';g.fillRect(0,0,w,h);
    for(var k=0;k<2;k++){
      var cx=w*(0.25+k*0.5),cy=h/2;
      var gr=g.createRadialGradient(cx,cy,0,cx,cy,h*0.45);gr.addColorStop(0,'rgba(255,255,255,.95)');gr.addColorStop(0.3,'rgba(160,190,255,.45)');gr.addColorStop(1,'rgba(0,0,0,0)');
      g.fillStyle=gr;g.fillRect(0,0,w,h);
      for(var i=0;i<260;i++){
        var arm=i%2,t=Math.random(),ang=t*5+arm*Math.PI,rad=t*h*0.42;
        var x=cx+Math.cos(ang)*rad*1.4+(Math.random()-0.5)*6,y=cy+Math.sin(ang)*rad*0.7+(Math.random()-0.5)*4;
        g.fillStyle='rgba(255,255,255,'+(0.3+Math.random()*0.7)+')';g.fillRect(x,y,Math.random()<0.15?2:1,1);
      }
    }
    for(var j=0;j<80;j++){g.fillStyle='rgba(255,255,255,'+Math.random()+')';g.fillRect(Math.random()*w,Math.random()*h,1,1);}
  });
}
/* ════════ МАГ ════════ */
var PROFILE={
  m:[[0,0.02],[0.40,0.02],[0.41,0.08],[0.36,0.45],[0.30,0.80],[0.27,1.00],[0.31,1.12],[0.30,1.18],[0.16,1.27],[0.08,1.30],[0,1.30]],
  f:[[0,0.02],[0.47,0.02],[0.48,0.08],[0.36,0.40],[0.24,0.72],[0.21,0.82],[0.25,1.00],[0.26,1.10],[0.23,1.17],[0.13,1.26],[0.07,1.29],[0,1.29]]
};
/* персонаж собирается в mage.js (MageKit), здесь только обёртки */
function buildMage(look){return MageKit.build(THREE,look,(R&&R.qName)||'high');}
function updateMage(M,dt,mode,fat){M.update(dt,mode,fat);}

/* ════════ МОНСТРЫ ════════ */
var MON_COLORS={slime:['#39d353','#c8ffd0'],eye:['#e8e0ff','#ff2d78'],golem:['#4a4a5a','#00e5ff'],ghost:['#b8c8ff','#6080ff'],spider:['#2a2f3a','#ff3344']};
function buildMonster(type,boss,biome,cols){
  var col=cols||MON_COLORS[type]||MON_COLORS.slime;
  var main=new THREE.Color(col[0]),acc=new THREE.Color(col[1]);
  if(biome){var tint=new THREE.Color(BIOMES[biome].accent);main.lerp(tint,0.08);acc.lerp(tint,0.2);}
  var E={root:new THREE.Group(),body:new THREE.Group(),type:type,mats:[],t:Math.random()*10,flash:0,shake:0,lunge:0,lungeT:1+Math.random()*2,h:1,die:-1,gone:-1};
  E.root.add(E.body);
  function M(c,o){var m=std(c,o);E.mats.push(m);return m;}
  var b=E.body,eyeW=new THREE.MeshBasicMaterial({color:0xffffff}),eyeB=new THREE.MeshBasicMaterial({color:0x05050a});
  if(type==='slime'){
    var sm=M(main,{op:0.88,r:0.3,flat:false,e:main,ei:0.15});
    E.blob=mesh(new THREE.SphereGeometry(0.55,16,12),sm,0,0.42,0);E.blob.scale.y=0.78;b.add(E.blob);
    [-1,1].forEach(function(s){b.add(mesh(new THREE.SphereGeometry(0.09,8,6),eyeW,s*0.17,0.55,0.42));b.add(mesh(new THREE.SphereGeometry(0.045,6,5),eyeB,s*0.17,0.55,0.5));});
    for(var i=0;i<4;i++)b.add(mesh(new THREE.SphereGeometry(0.08+Math.random()*0.05,8,6),sm,Math.cos(i*1.7)*0.45,0.08,Math.sin(i*1.7)*0.4));
    E.h=0.95;
  }else if(type==='eye'){
    E.float=1.15;
    var ball=mesh(new THREE.SphereGeometry(0.42,18,14),M(main,{r:0.35,flat:false}),0,0,0);b.add(ball);
    var iris=mesh(new THREE.SphereGeometry(0.2,14,10),M(acc,{e:acc,ei:0.6,flat:false}),0,0,0.29);iris.scale.z=0.5;b.add(iris);
    b.add(mesh(new THREE.SphereGeometry(0.09,10,8),eyeB,0,0,0.39));
    var spk=M(acc,{e:acc,ei:0.3});
    for(var j=0;j<8;j++){var a=j/8*Math.PI*2,c=mesh(new THREE.ConeGeometry(0.06,0.28,5),spk,Math.cos(a)*0.46,Math.sin(a)*0.46,-0.1);c.rotation.z=a-Math.PI/2;b.add(c);}
    E.tent=[];
    for(var k=0;k<3;k++){var tg=new THREE.CylinderGeometry(0.03,0.01,0.6,5);tg.translate(0,-0.3,0);var tn=mesh(tg,M(main),(k-1)*0.18,-0.35,-0.05);b.add(tn);E.tent.push(tn);}
    E.body.position.y=E.float;E.h=E.float+0.5;
  }else if(type==='golem'){
    var rock=M(main,{r:0.95}),cry=M(acc,{e:acc,ei:0.8,r:0.2});
    b.add(mesh(new THREE.BoxGeometry(0.75,0.85,0.5),rock,0,0.95,0));
    b.add(mesh(new THREE.BoxGeometry(0.4,0.34,0.36),rock,0,1.55,0.04));
    [-1,1].forEach(function(s){b.add(mesh(new THREE.BoxGeometry(0.1,0.06,0.02),cry,s*0.09,1.57,0.23));});
    E.arms=[];
    [-1,1].forEach(function(s){
      var g=new THREE.Group();g.position.set(s*0.5,1.25,0);
      var ag=new THREE.BoxGeometry(0.26,0.8,0.28);ag.translate(0,-0.38,0);g.add(mesh(ag,rock));
      var cr=mesh(new THREE.OctahedronGeometry(0.16),cry,0,0.12,0);g.add(cr);b.add(g);E.arms.push(g);
    });
    [-1,1].forEach(function(s){b.add(mesh(new THREE.BoxGeometry(0.28,0.55,0.32),rock,s*0.2,0.28,0));});
    E.h=1.8;
  }else if(type==='ghost'){
    var gm=M(main,{op:0.72,e:acc,ei:0.35,flat:false,side:THREE.DoubleSide});
    var pts=[];for(var q=0;q<=12;q++){var y=q/12;pts.push(new THREE.Vector2(Math.max(0.001,Math.sin(y*Math.PI*0.62+0.2)*0.42*(0.45+y*0.55)),y*1.1));}
    pts.push(new THREE.Vector2(0.001,1.12));
    E.float=0.35;
    var gb=mesh(new THREE.LatheGeometry(pts,16),gm);b.add(gb);
    [-1,1].forEach(function(s){var e=mesh(new THREE.SphereGeometry(0.07,8,6),eyeB,s*0.13,0.85,0.33);e.scale.y=1.5;b.add(e);});
    b.add(mesh(new THREE.SphereGeometry(0.05,8,6),eyeB,0,0.65,0.36));
    [-1,1].forEach(function(s){var ar=mesh(new THREE.ConeGeometry(0.08,0.4,6),gm,s*0.42,0.6,0.05);ar.rotation.z=s*1.9;b.add(ar);});
    E.body.position.y=E.float;E.h=1.5;
  }else{
    var mt=M(main,{m:0.7,r:0.35}),red=M(acc,{e:acc,ei:1});
    b.add(mesh(new THREE.SphereGeometry(0.34,12,10),mt,0,0.6,-0.1));
    b.add(mesh(new THREE.SphereGeometry(0.2,10,8),mt,0,0.62,0.28));
    b.add(mesh(new THREE.SphereGeometry(0.07,8,6),red,0,0.66,0.46));
    [-1,1].forEach(function(s){b.add(mesh(new THREE.SphereGeometry(0.035,6,5),red,s*0.1,0.72,0.42));});
    E.legs=[];
    for(var l=0;l<6;l++){
      var side=l<3?-1:1,idx=l%3,lg=new THREE.Group();
      lg.position.set(side*0.25,0.6,-0.25+idx*0.22);lg.rotation.y=side>0?-(idx-1)*0.5:Math.PI+(idx-1)*0.5;
      var up=new THREE.CylinderGeometry(0.03,0.03,0.45,5);up.translate(0,0.22,0);var u=mesh(up,mt);u.rotation.z=-1.0;lg.add(u);
      var lo=new THREE.CylinderGeometry(0.025,0.012,0.62,5);lo.translate(0,-0.31,0);var lw=mesh(lo,mt,0.39,0.25,0);lw.rotation.z=0.25;lg.add(lw);
      b.add(lg);E.legs.push(lg);
    }
    E.h=1.0;
  }
  if(boss){
    var gold=std('#ffcc33',{m:0.6,r:0.3,e:'#ffaa00',ei:0.5});
    var crown=new THREE.Group();crown.position.y=E.h+0.05-(E.float||0);
    for(var cn=0;cn<5;cn++){var ang=cn/5*Math.PI*2,sp=mesh(new THREE.ConeGeometry(0.05,0.2,5),gold,Math.cos(ang)*0.14,0.1,Math.sin(ang)*0.14);crown.add(sp);}
    var band=mesh(new THREE.TorusGeometry(0.15,0.03,5,14),gold);band.rotation.x=Math.PI/2;crown.add(band);
    b.add(crown);
    E.aura=mesh(new THREE.RingGeometry(0.7,0.85,40),new THREE.MeshBasicMaterial({color:0xff2d4a,transparent:true,opacity:0.6,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide}),0,0.03,0);
    E.aura.rotation.x=-Math.PI/2;E.root.add(E.aura);
    var ag2=glowSprite(0xff2d4a,2.4,0.25);ag2.position.y=E.h*0.5;E.root.add(ag2);
  }
  E.shadow=mesh(new THREE.CircleGeometry(0.55,20),new THREE.MeshBasicMaterial({color:0x000000,transparent:true,opacity:0.4,depthWrite:false}),0,0.012,0);
  E.shadow.rotation.x=-Math.PI/2;E.root.add(E.shadow);
  E.root.rotation.y=-0.85;
  E.scale=(boss?2.0:1.35)*ROAD_SIZE;
  return E;
}
function updateMonster(E,dt,fighting){
  E.t+=dt;
  var t=E.t;
  if(E.mixer){
    /* модель: идёт к магу, в бою стоит; обычный монстр сам замахивается и бьёт по щиту мага, босс бьёт по сигналу логики (bossWind) */
    var atk=E.acts.Attack?'Attack':E.acts.Punch?'Punch':null;
    if(E.die<0&&E.gone<0){
      if(!E.form&&E.cur!==idleAct(E)&&!(E.curOnce&&E.acts[E.cur].isRunning()))playAct(E,idleAct(E),0.25);
      if(fighting&&!E.boss&&atk){
        E.lungeT-=dt;
        if(E.lungeT<=0&&E.wind<=0){E.lungeT=2.2+Math.random()*1.6;E.wind=0.32;}
      }
      if(E.wind>0){
        E.wind-=dt;
        if(E.wind<=0){E.wind=0;if(atk)playAct(E,atk,0.08);E.hitAt=0.3;}
      }
      if(E.hitAt>0){E.hitAt-=dt;if(E.hitAt<=0){E.hitAt=0;if(!E.boss)shieldFx();}}
    }
    E.mixer.update(dt);
    /* замах: монстр отклоняется назад и чуть приседает */
    var wk=E.wind>0?Math.sin((1-E.wind/0.32)*Math.PI*0.5):0;
    E.body.position.z=-wk*0.28;E.body.scale.y=(1/E.scale)*(1-wk*0.08);
    if(E.float!==undefined)E.body.position.y=Math.sin(t*2)*0.06;
    if(E.aura){E.aura.rotation.z=t*0.6;E.aura.material.opacity=0.45+Math.sin(t*3)*0.15;}
    E.lunge=Math.max(0,E.lunge-dt*2.5);
    E.kb=Math.max(0,E.kb-dt*3.2);
    E.body.position.x=E.shake>0?(Math.random()-0.5)*0.08*E.shake:0;
    E.shake=Math.max(0,E.shake-dt*6);
    E.flash=Math.max(0,E.flash-dt*8);
    var rp=E.rage?0.25+0.2*Math.sin(t*9):0;
    for(var mi=0;mi<E.mats.length;mi++){var mm=E.mats[mi];if(!mm.emissive)continue;if(mm.userData.e===undefined){mm.userData.e=mm.emissive.clone();mm.userData.ei=mm.emissiveIntensity;}
      if(E.flash>0){if(mm.emissiveMap)mm.emissive.setRGB(1,1,1);else mm.emissive.copy(mm.color);mm.emissiveIntensity=E.flash*0.45;}
      else if(rp>0){mm.emissive.setRGB(1,0.1,0.05);mm.emissiveIntensity=rp;}
      else{mm.emissive.copy(mm.userData.e);mm.emissiveIntensity=mm.userData.ei;}}
    return;
  }
  if(E.blob){E.blob.scale.y=0.78+Math.sin(t*4)*0.06;E.blob.scale.x=E.blob.scale.z=1-Math.sin(t*4)*0.04;}
  if(E.float!==undefined)E.body.position.y=E.float+Math.sin(t*2)*0.08;
  if(E.tent)E.tent.forEach(function(tn,i){tn.rotation.x=Math.sin(t*3+i)*0.3;tn.rotation.z=Math.sin(t*2.3+i*2)*0.2;});
  if(E.arms)E.arms.forEach(function(a,i){a.rotation.x=Math.sin(t*1.5+i*Math.PI)*0.15-E.lunge*1.2;});
  if(E.legs)E.legs.forEach(function(l,i){l.rotation.x=Math.sin(t*6+i*1.3)*(fighting?0.08:0.18);});
  if(E.aura){E.aura.rotation.z=t*0.6;E.aura.material.opacity=0.45+Math.sin(t*3)*0.15;}
  /* выпад: только для вида, урона нет */
  if(fighting){E.lungeT-=dt;if(E.lungeT<=0){E.lungeT=1.6+Math.random()*1.8;E.lunge=1;}}
  E.lunge=Math.max(0,E.lunge-dt*2.5);
  var lp=Math.sin(E.lunge*Math.PI)*0.35;
  E.body.position.z=lp*0.9;E.body.position.x=E.shake>0?(Math.random()-0.5)*0.08*E.shake:0;
  E.shake=Math.max(0,E.shake-dt*6);
  E.flash=Math.max(0,E.flash-dt*5);
  for(var i=0;i<E.mats.length;i++){var m=E.mats[i];if(m.userData.e===undefined){m.userData.e=m.emissive.clone();m.userData.ei=m.emissiveIntensity;}
    if(E.flash>0){m.emissive.setRGB(1,1,1);m.emissiveIntensity=E.flash*0.9;}else{m.emissive.copy(m.userData.e);m.emissiveIntensity=m.userData.ei;}}
}
function disposeTree(o){o.traverse(function(ch){if(ch.geometry&&!ch.userData.shared)ch.geometry.dispose();if(ch.material&&ch.material.userData&&ch.material.userData.own)ch.material.dispose();if(ch.material&&!ch.material.map&&ch.material.dispose&&!ch.userData.keep)ch.material.dispose();});}
/* ════════ СЦЕНА: лесная дорога, вид из-за спины мага ════════
   Маг стоит на месте, мир едет на него (+z). Враги собираются из тени вдали. */
var R=null;
var MAGE_POS={x:-0.55,z:0},ENEMY_POS={x:0.35,z:-5.0};
var WALK_SPEED=3.2,Z_FAR=-100,Z_NEAR=9,ROAD_HALF=1.5;

/* ── лес из InstancedMesh: один вызов отрисовки на деталь, деревья переставляются матрицами ── */
var KINDS=null;
function makeKinds(){
  var trunk=std('#4a3424',{r:1}),foliage=std('#ffffff',{r:0.95}),stone=std('#ffffff',{r:1}),moss=std('#ffffff',{r:1});
  var blades=new THREE.MeshLambertMaterial({map:bladeTex(),transparent:true,alphaTest:0.35,side:THREE.DoubleSide,depthWrite:true});
  function part(geo,mat,x,y,z,sx,sy,sz,ry,tint){
    var m=new THREE.Matrix4().compose(new THREE.Vector3(x,y,z),new THREE.Quaternion().setFromEuler(new THREE.Euler(0,ry||0,0)),new THREE.Vector3(sx||1,sy||1,sz||1));
    return {geo:geo,mat:mat,m:m,tint:tint};
  }
  var cone=new THREE.ConeGeometry(1,1,7),cyl=new THREE.CylinderGeometry(0.5,0.6,1,6),ico=new THREE.IcosahedronGeometry(1,0),dod=new THREE.DodecahedronGeometry(1,0);
  var plane=new THREE.PlaneGeometry(1,1);plane.translate(0,0.5,0);
  return {
    pine:{count:90,xr:[3.2,30],sr:[0.8,1.6],parts:[
      part(cyl,trunk,0,0.6,0,0.35,1.2,0.35),
      part(cone,foliage,0,2.0,0,1.5,2.6,1.5,0,'pine'),
      part(cone,foliage,0,3.3,0,1.15,2.2,1.15,0.4,'pine'),
      part(cone,foliage,0,4.4,0,0.8,1.8,0.8,0.8,'pine'),
      part(cone,foliage,0,5.3,0,0.45,1.2,0.45,1.2,'pine')]},
    oak:{count:28,xr:[3.6,22],sr:[0.8,1.4],parts:[
      part(cyl,trunk,0,1.1,0,0.45,2.2,0.45),
      part(ico,foliage,0,3.0,0,1.5,1.2,1.5,0,'oak'),
      part(ico,foliage,0.9,2.6,0.3,1.0,0.9,1.0,1,'oak'),
      part(ico,foliage,-0.8,2.7,-0.3,1.1,0.9,1.1,2,'oak'),
      part(ico,foliage,0.1,3.8,0.1,0.9,0.8,0.9,3,'oak')]},
    rock:{count:36,xr:[2.0,10],sr:[0.35,1.0],parts:[
      part(dod,stone,0,0.35,0,1,0.62,0.85,0,'rock'),
      part(dod,moss,0.05,0.62,0,0.82,0.28,0.7,0.5,'moss')]},
    bush:{count:40,xr:[2.1,12],sr:[0.5,1.1],parts:[
      part(ico,foliage,0,0.45,0,0.8,0.6,0.8,0,'bush'),
      part(ico,foliage,0.55,0.35,0.2,0.55,0.45,0.55,1,'bush')]},
    grass:{count:200,xr:[1.45,8],sr:[0.6,1.2],parts:[
      part(plane,blades,0,0,0,0.9,0.7,1,0,'grass'),
      part(plane,blades,0,0,0,0.9,0.7,1,Math.PI/2,'grass')]}
  };
}
function buildForest(kinds){
  var K0=kinds||(KINDS=makeKinds());
  var F={kinds:[],m:new THREE.Matrix4(),t:new THREE.Matrix4(),q:new THREE.Quaternion(),v:new THREE.Vector3(),s:new THREE.Vector3(),e:new THREE.Euler(),c:new THREE.Color(),models:!!kinds};
  Object.keys(K0).forEach(function(name){
    var K=K0[name],inst=[],meshes=[];
    for(var i=0;i<K.count;i++)inst.push(placeInst(K,{},Z_FAR+Math.random()*(Z_NEAR-Z_FAR)));
    K.parts.forEach(function(p){
      var im=new THREE.InstancedMesh(p.geo,p.mat,K.count);
      im.frustumCulled=false;
      if(p.tint)im.instanceColor=new THREE.InstancedBufferAttribute(new Float32Array(K.count*3),3);
      R.world.add(im);meshes.push(im);
    });
    F.kinds.push({name:name,K:K,inst:inst,meshes:meshes,grass:name==='grass'||!!K.grass});
  });
  return F;
}
/* лес из моделей приключения (adventure.js) вместо простых фигур: пересобираем при смене тракта */
function swapForest(kinds){
  var old=R.forest;
  old.kinds.forEach(function(k){k.meshes.forEach(function(m){R.world.remove(m);m.dispose();});});
  R.forest=buildForest(kinds);
  R.forest.kinds.forEach(function(k){var big=!k.grass&&!k.K.road;k.meshes.forEach(function(m){m.castShadow=big;m.receiveShadow=false;});});
  applyDensity();
  R.forest.kinds.forEach(forestTintKind);
  forestUpdate(0);
}
function applyDensity(){
  var q=R.q||QUALITY.medium;
  R.forest.kinds.forEach(function(k){
    var dens=k.grass?q.grass:q.density;
    var n=Math.floor(k.K.count*dens);
    k.meshes.forEach(function(m){m.count=n;m.visible=n>0;});
  });
}
function placeInst(K,o,z){
  var side=Math.random()<0.5?-1:1;
  o.x=side*rnd(K.xr[0],K.xr[1]);o.z=z;o.s=rnd(K.sr[0],K.sr[1]);o.ry=rnd(0,Math.PI*2);o.v=K.parts&&K.leafPal!==undefined?rnd(0.85,1.1):rnd(0.75,1.2);o.pi=Math.floor(Math.random()*8);
  return o;
}
function forestTint(b){
  R.forest.kinds.forEach(forestTintKind);return;
  var F=R.forest,c=F.c;
  var base={pine:b.pine,oak:b.oak,rock:b.rock,moss:b.moss,bush:b.oak,grass:b.grass2};
  F.kinds.forEach(function(k){
    k.K.parts.forEach(function(p,pi){
      if(!p.tint)return;
      var im=k.meshes[pi],col=new THREE.Color(base[p.tint]);
      if(p.tint==='bush')col.lerp(new THREE.Color(b.pine),0.4);
      for(var i=0;i<k.inst.length;i++){c.copy(col).multiplyScalar(k.inst[i].v*(0.9+pi*0.06));im.setColorAt(i,c);}
      im.instanceColor.needsUpdate=true;
    });
  });
}
function forestUpdate(dz){
  var F=R.forest;
  F.kinds.forEach(function(k){
    var recolor=false;
    for(var i=0;i<k.inst.length;i++){
      var o=k.inst[i];o.z+=dz;
      if(o.z>Z_NEAR){placeInst(k.K,o,o.z-(Z_NEAR-Z_FAR));recolor=true;}
      F.t.compose(F.v.set(o.x,0,o.z),F.q.setFromEuler(F.e.set(0,o.ry,0)),F.s.set(o.s,o.s,o.s));
      for(var p=0;p<k.meshes.length;p++){F.m.multiplyMatrices(F.t,k.K.parts[p].m);k.meshes[p].setMatrixAt(i,F.m);}
    }
    k.meshes.forEach(function(m){m.instanceMatrix.needsUpdate=true;});
    if(recolor&&R.biomeObj)k.dirty=true;
  });
}

/* ════════ КАЧЕСТВО ГРАФИКИ И ПОСТОБРАБОТКА ════════
   low     быстрый: меньше леса, без травы и тумана, пониженное разрешение
   medium  весь лес вполовину плотнее, туман, пылинки
   high    полный лес, тени от солнца, свечение (bloom), цветокоррекция
   ultra   "холст": тени чётче, фильтр Кувахары (мазки как у масляной живописи), зерно холста */
var QUALITY={
  low:   {pr:0.75,density:0.45,grass:0,  mist:false,motes:false,shadow:0,   post:null},
  medium:{pr:1,   density:0.7, grass:0.5,mist:true, motes:true, shadow:0,   post:null},
  high:  {pr:1.5, density:1,   grass:1,  mist:true, motes:true, shadow:1024,post:'bloom'},
  ultra: {pr:2,   density:1,   grass:1,  mist:true, motes:true, shadow:2048,post:'paint'}
};
var QUAD_VS='varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.0,1.0);}';
var FS={
  bright:'uniform sampler2D t;uniform float th;varying vec2 vUv;void main(){vec3 c=texture2D(t,vUv).rgb;float l=max(c.r,max(c.g,c.b));gl_FragColor=vec4(c*smoothstep(th,th+0.6,l),1.0);}',
  blur:'uniform sampler2D t;uniform vec2 dir;varying vec2 vUv;void main(){vec3 c=texture2D(t,vUv).rgb*0.227;'+
    'c+=texture2D(t,vUv+dir*1.384).rgb*0.316;c+=texture2D(t,vUv-dir*1.384).rgb*0.316;'+
    'c+=texture2D(t,vUv+dir*3.230).rgb*0.070;c+=texture2D(t,vUv-dir*3.230).rgb*0.070;gl_FragColor=vec4(c,1.0);}',
  /* обобщённый фильтр Кувахары по 4 секторам: плоские мазки, края сохраняются */
  paint:'uniform sampler2D t;uniform vec2 px;varying vec2 vUv;'+
    'void main(){vec3 m[4];vec3 s[4];for(int k=0;k<4;k++){m[k]=vec3(0.0);s[k]=vec3(0.0);}'+
    'const int R=3;float n=float((R+1)*(R+1));'+
    'for(int j=-R;j<=0;j++)for(int i=-R;i<=0;i++){vec3 c;'+
      'c=texture2D(t,vUv+vec2(i,j)*px).rgb;m[0]+=c;s[0]+=c*c;'+
      'c=texture2D(t,vUv+vec2(-i,j)*px).rgb;m[1]+=c;s[1]+=c*c;'+
      'c=texture2D(t,vUv+vec2(i,-j)*px).rgb;m[2]+=c;s[2]+=c*c;'+
      'c=texture2D(t,vUv+vec2(-i,-j)*px).rgb;m[3]+=c;s[3]+=c*c;}'+
    'float best=1e9;vec3 res=vec3(0.0);'+
    'for(int k=0;k<4;k++){vec3 mu=m[k]/n;vec3 v=abs(s[k]/n-mu*mu);float sig=v.r+v.g+v.b;if(sig<best){best=sig;res=mu;}}'+
    'gl_FragColor=vec4(res,1.0);}',
  final:'uniform sampler2D tC;uniform sampler2D tB1;uniform sampler2D tB2;uniform float bloom;uniform float exposure;uniform float grain;uniform float time;uniform float sat;uniform vec2 res;varying vec2 vUv;'+
    'vec3 aces(vec3 x){x*=0.6;return clamp((x*(2.51*x+0.03))/(x*(2.43*x+0.59)+0.14),0.0,1.0);}'+
    'vec3 toSRGB(vec3 c){return mix(c*12.92,1.055*pow(c,vec3(1.0/2.4))-0.055,step(0.0031308,c));}'+
    'float hash(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}'+
    'void main(){vec3 c=texture2D(tC,vUv).rgb;c+=(texture2D(tB1,vUv).rgb*0.6+texture2D(tB2,vUv).rgb*0.8)*bloom;'+
    'c=aces(c*exposure);float l=dot(c,vec3(0.299,0.587,0.114));c=mix(vec3(l),c,sat);'+
    'c=mix(c,c*vec3(1.04,1.0,0.94),0.5);'+
    'vec2 d=vUv-0.5;c*=1.0-dot(d,d)*0.55;'+
    'vec3 o=toSRGB(c);'+
    'float g=hash(floor(vUv*res/1.5)+floor(time*12.0))-0.5;float canvas=sin(vUv.x*res.x*0.9)*sin(vUv.y*res.y*0.9)*0.5;'+
    'o+=(g*0.6+canvas*0.25)*grain;gl_FragColor=vec4(o,1.0);}'
};
function createPost(renderer){
  var P={scene:new THREE.Scene(),cam:new THREE.OrthographicCamera(-1,1,1,-1,0,1),mats:{},rts:{},w:0,h:0};
  P.quad=new THREE.Mesh(new THREE.PlaneGeometry(2,2),null);P.quad.frustumCulled=false;P.scene.add(P.quad);
  function mat(name,uni){return new THREE.ShaderMaterial({vertexShader:QUAD_VS,fragmentShader:FS[name],uniforms:uni,depthTest:false,depthWrite:false});}
  P.mats.bright=mat('bright',{t:{value:null},th:{value:0.9}});
  P.mats.blur=mat('blur',{t:{value:null},dir:{value:new THREE.Vector2()}});
  P.mats.paint=mat('paint',{t:{value:null},px:{value:new THREE.Vector2()}});
  P.mats.final=mat('final',{tC:{value:null},tB1:{value:null},tB2:{value:null},bloom:{value:0.9},exposure:{value:1.2},grain:{value:0.02},time:{value:0},sat:{value:1.08},res:{value:new THREE.Vector2()}});
  function rt(w,h,ms){
    var o={type:THREE.HalfFloatType,depthBuffer:!!ms,minFilter:THREE.LinearFilter,magFilter:THREE.LinearFilter};
    if(ms)o.samples=4;
    return new THREE.WebGLRenderTarget(Math.max(1,w),Math.max(1,h),o);
  }
  P.resize=function(w,h){
    if(w===P.w&&h===P.h)return;P.w=w;P.h=h;
    for(var k in P.rts)P.rts[k].dispose();
    P.rts={scene:rt(w,h,true),paint:rt(w,h),b1:rt(w>>1,h>>1),b2:rt(w>>1,h>>1),c1:rt(w>>2,h>>2),c2:rt(w>>2,h>>2)};
  };
  function pass(m,target){P.quad.material=m;renderer.setRenderTarget(target);renderer.render(P.scene,P.cam);}
  P.render=function(scene,camera,mode,time){
    renderer.setRenderTarget(P.rts.scene);renderer.render(scene,camera);
    var src=P.rts.scene;
    if(mode==='paint'){P.mats.paint.uniforms.t.value=src.texture;P.mats.paint.uniforms.px.value.set(1/P.w,1/P.h);pass(P.mats.paint,P.rts.paint);src=P.rts.paint;}
    P.mats.bright.uniforms.t.value=src.texture;pass(P.mats.bright,P.rts.b1);
    var b=P.mats.blur.uniforms;
    b.t.value=P.rts.b1.texture;b.dir.value.set(1/(P.w>>1),0);pass(P.mats.blur,P.rts.b2);
    b.t.value=P.rts.b2.texture;b.dir.value.set(0,1/(P.h>>1));pass(P.mats.blur,P.rts.b1);
    b.t.value=P.rts.b1.texture;b.dir.value.set(2/(P.w>>2),0);pass(P.mats.blur,P.rts.c1);
    b.t.value=P.rts.c1.texture;b.dir.value.set(0,2/(P.h>>2));pass(P.mats.blur,P.rts.c2);
    var f=P.mats.final.uniforms;
    f.tC.value=src.texture;f.tB1.value=P.rts.b1.texture;f.tB2.value=P.rts.c2.texture;
    f.time.value=time;f.res.value.set(P.w,P.h);
    f.grain.value=mode==='paint'?0.035:0.015;f.sat.value=mode==='paint'?1.14:1.06;f.bloom.value=mode==='paint'?1.0:0.85;
    pass(P.mats.final,null);
  };
  P.dispose=function(){for(var k in P.rts)P.rts[k].dispose();P.rts={};P.w=P.h=0;};
  return P;
}
function detectQuality(){
  var mobile=/Android|iPhone|iPad|Mobile/i.test(navigator.userAgent)||(navigator.maxTouchPoints>1&&Math.min(screen.width,screen.height)<820);
  var mem=navigator.deviceMemory||8,cores=navigator.hardwareConcurrency||4;
  if(mobile)return mem>=6&&cores>=8?'medium':'low';
  return cores>=4?'high':'medium';
}
function setQuality(name){
  if(!R)return;
  if(!QUALITY[name])name='medium';
  var q=QUALITY[name],prev=R.qName;
  R.qName=name;R.q=q;
  if(R.avatar)R.avatar.setResolution(avRes());
  else if(R.mage&&R.mage.setQuality)R.mage.setQuality(name);
  if(q.post&&!R.renderer.capabilities.isWebGL2)q=Object.assign({},q,{post:null});
  var dpr=window.devicePixelRatio||1;
  R.pr=name==='low'?Math.min(dpr,1)*q.pr:Math.min(dpr,q.pr);
  /* плотность леса: рисуем только часть экземпляров */
  applyDensity();
  applyGround();
  R.mist.forEach(function(m){m.visible=q.mist;});
  R.motes.visible=q.motes;
  /* тени */
  var sh=!!q.shadow;
  R.renderer.shadowMap.enabled=sh;
  R.renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  R.sun.castShadow=sh;
  if(sh){
    R.sun.shadow.mapSize.set(q.shadow,q.shadow);
    if(R.sun.shadow.map){R.sun.shadow.map.dispose();R.sun.shadow.map=null;}
  }
  R.mageShadow.visible=!sh;
  R.shadowOn=sh;
  if(prev!==undefined)R.scene.traverse(function(o){if(o.material){var ms=Array.isArray(o.material)?o.material:[o.material];ms.forEach(function(m){m.needsUpdate=true;});}});
  if(q.post&&!R.post)R.post=createPost(R.renderer);
  if(!q.post&&R.post){R.post.dispose();}
  R.postMode=q.post;
  resize();
}
function castShadows(obj,cast,receive){
  obj.traverse(function(o){if(o.isMesh&&!(o.material&&o.material.blending===THREE.AdditiveBlending)){o.castShadow=cast;if(receive)o.receiveShadow=true;}});
}

function init(host,quality){
  var renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.75));
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;
  host.appendChild(renderer.domElement);
  var scene=new THREE.Scene();
  var camera=new THREE.PerspectiveCamera(50,1,0.1,400);
  R={host:host,renderer:renderer,scene:scene,camera:camera,mode:'walk',fat:0,biome:-1,enemy:null,dead:[],bolts:[],parts:[],pool:[],rings:[],fire:[],stopT:0,slowT:0,
     shakeT:0,t:0,zz:[],zzT:0,camBase:new THREE.Vector3(),camTarget:new THREE.Vector3(),mist:[],smokePool:[]};

  R.hemi=new THREE.HemisphereLight(0xc8d4e0,0x3a4a28,1.0);scene.add(R.hemi);
  R.sun=new THREE.DirectionalLight(0xffe0b0,1.5);R.sun.position.set(-3,9,-20);scene.add(R.sun);
  R.fill=new THREE.DirectionalLight(0xfff4e8,0.45);R.fill.position.set(2,4,8);scene.add(R.fill);
  R.sun.target.position.set(0,0,-7);scene.add(R.sun.target);
  var sc=R.sun.shadow.camera;sc.left=-13;sc.right=13;sc.top=13;sc.bottom=-13;sc.near=1;sc.far=70;
  R.sun.shadow.bias=-0.0006;R.sun.shadow.normalBias=0.03;

  var world=new THREE.Group();scene.add(world);R.world=world;
  /* небо и солнце */
  R.sky=mesh(new THREE.PlaneGeometry(520,200),new THREE.MeshBasicMaterial({fog:false,depthWrite:false}),0,60,-190);world.add(R.sky);
  R.sunGlow=glowSprite(0xffe2a0,90,0.55);R.sunGlow.material.fog=false;R.sunGlow.position.set(10,30,-185);world.add(R.sunGlow);
  R.rays=[];
  for(var i=0;i<4;i++){
    var ray=mesh(new THREE.PlaneGeometry(10,120),new THREE.MeshBasicMaterial({map:glowTex(),color:0xfff0c0,transparent:true,opacity:0.07,blending:THREE.AdditiveBlending,depthWrite:false,fog:false}),
      -20+i*14,10,-60-i*8);
    ray.rotation.z=-0.35+i*0.18;world.add(ray);R.rays.push(ray);
  }
  /* дальние кромки леса */
  R.treelines=[];
  [[-110,0.45,26],[-135,0.65,34],[-160,0.82,44]].forEach(function(q,i){
    var tl=mesh(new THREE.PlaneGeometry(420,q[2]),new THREE.MeshBasicMaterial({transparent:true,fog:false,depthWrite:false}),0,q[2]/2-2,q[0]);
    tl.userData.k=q[1];tl.renderOrder=-1-i;world.add(tl);R.treelines.push(tl);
  });
  /* земля и дорога */
  R.ground=mesh(new THREE.PlaneGeometry(240,200),new THREE.MeshLambertMaterial(),0,0,-80);R.ground.rotation.x=-Math.PI/2;world.add(R.ground);
  R.road=mesh(new THREE.PlaneGeometry(5.4,200),new THREE.MeshLambertMaterial({transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2}),0.1,0.01,-80);
  R.road.rotation.x=-Math.PI/2;world.add(R.road);
  R.forest=buildForest();
  /* туман клочьями */
  for(var m=0;m<12;m++){
    var ms=new THREE.Sprite(new THREE.SpriteMaterial({map:smokeTex(),color:0xffffff,transparent:true,opacity:0.35,depthWrite:false}));
    ms.scale.set(rnd(14,26),rnd(4,7),1);ms.position.set(rnd(-14,14),rnd(1,3.5),rnd(Z_FAR*0.8,-12));world.add(ms);R.mist.push(ms);
  }
  /* пылинки в лучах / светлячки ночью */
  var mg=new THREE.BufferGeometry(),mp=[];
  for(var j=0;j<160;j++)mp.push(rnd(-8,8),rnd(0.2,4.5),rnd(-22,4));
  mg.setAttribute('position',new THREE.Float32BufferAttribute(mp,3));
  R.motes=new THREE.Points(mg,new THREE.PointsMaterial({map:glowTex(),color:0xfff0c0,size:0.09,transparent:true,opacity:0.6,depthWrite:false,blending:THREE.AdditiveBlending}));
  world.add(R.motes);

  /* маг: спиной к камере */
  R.mage=buildMage({gender:'m',robe:'#6a5a3a',trim:'#a08a5a'});
  R.mage.root.position.set(MAGE_POS.x,0,MAGE_POS.z);R.mage.root.rotation.y=Math.PI;
  scene.add(R.mage.root);
  R.mageShadow=mesh(new THREE.CircleGeometry(0.55,20),new THREE.MeshBasicMaterial({color:0x000000,transparent:true,opacity:0.35,depthWrite:false}),MAGE_POS.x,0.02,MAGE_POS.z);
  R.mageShadow.rotation.x=-Math.PI/2;scene.add(R.mageShadow);

  /* бревно, на которое маг садится у дороги */
  R.seat=new THREE.Group();
  var logM=std('#5a3c24',{r:1});var lg=mesh(new THREE.CylinderGeometry(0.2,0.22,1.3,10),logM,0,0.2,0);lg.rotation.z=Math.PI/2;R.seat.add(lg);
  [-1,1].forEach(function(sd){var cap=mesh(new THREE.CircleGeometry(0.2,10),std('#b08a5a',{r:1}),sd*0.651,0.2,0);cap.rotation.y=sd*Math.PI/2;R.seat.add(cap);});
  R.seat.position.set(MAGE_POS.x,0,MAGE_POS.z+0.33);R.seat.rotation.y=Math.PI/2;R.seat.visible=false;scene.add(R.seat);
  R.camp=buildFire(0.5);R.camp.group.position.set(MAGE_POS.x+1.1,0,MAGE_POS.z-1.3);R.camp.group.visible=false;scene.add(R.camp.group);
  R.tavern=buildTavern();R.tavern.group.visible=false;scene.add(R.tavern.group);

  R.ground.receiveShadow=true;R.road.receiveShadow=true;
  R.forest.kinds.forEach(function(k){k.meshes.forEach(function(m){m.castShadow=k.name!=='grass';m.receiveShadow=k.name!=='grass';});});
  castShadows(R.mage.root,true);
  setBiome(0);
  forestUpdate(0);
  setQuality(quality&&QUALITY[quality]?quality:detectQuality());
  setTimeout(loadAdventure,1500);
  if(window.ResizeObserver)new ResizeObserver(resize).observe(host);
  else window.addEventListener('resize',resize);
  return R;
}

function buildFire(size){
  var g=new THREE.Group(),F={group:g,flames:[],t:0};
  var log=std('#3a2414');
  [0.6,-0.6].forEach(function(a){var l=mesh(new THREE.CylinderGeometry(0.05*size*2,0.05*size*2,0.7*size*2,6),log,0,0.05,0);l.rotation.z=Math.PI/2;l.rotation.y=a;g.add(l);});
  for(var s=0;s<6;s++){var st=mesh(new THREE.DodecahedronGeometry(0.09*size*2,0),std('#5a5a5a'),Math.cos(s)*size*0.75,0.04,Math.sin(s)*size*0.75);g.add(st);}
  for(var i=0;i<3;i++){var f=glowSprite(i?0xff7a1a:0xffd060,size*(1.2-i*0.25),0.9);f.position.y=size*0.4+i*0.1;g.add(f);F.flames.push(f);}
  F.light=new THREE.PointLight(0xff8a30,2.4,7,1.5);F.light.position.y=0.5;g.add(F.light);
  F.update=function(dt){F.t+=dt;F.flames.forEach(function(f,i){var s=(1.2-i*0.25)*size*(0.85+Math.sin(F.t*(9+i*3)+i)*0.12+Math.random()*0.06);f.scale.set(s,s*1.3,1);f.position.y=size*0.45+i*0.12+Math.sin(F.t*7+i)*0.03;});
    F.light.intensity=2+Math.sin(F.t*11)*0.3+Math.random()*0.3;};
  return F;
}
/* таверна: маг в кресле спиной к камере, перед ним камин */
function buildTavern(){
  var g=new THREE.Group(),T={group:g};
  var floor=mesh(new THREE.PlaneGeometry(12,12),new THREE.MeshStandardMaterial({map:plankTex(),roughness:0.9}),0,0,-2);
  floor.material.map.repeat.set(5,5);floor.rotation.x=-Math.PI/2;g.add(floor);
  var wallM=new THREE.MeshStandardMaterial({map:stoneTex(),roughness:1});wallM.map.repeat.set(5,2);
  g.add(mesh(new THREE.PlaneGeometry(12,6),wallM,0,3,-7));
  var sideM=wallM.clone();sideM.map=stoneTex();
  var wl=mesh(new THREE.PlaneGeometry(12,6),sideM,-5,3,-2);wl.rotation.y=Math.PI/2;g.add(wl);
  var wr=mesh(new THREE.PlaneGeometry(12,6),sideM,5,3,-2);wr.rotation.y=-Math.PI/2;g.add(wr);
  var beam=std('#2a1a0e');
  for(var b=0;b<4;b++)g.add(mesh(new THREE.BoxGeometry(10,0.25,0.3),beam,0,4.6,-6+b*2.4));
  /* камин */
  var st=std('#3a3640',{r:1});
  g.add(mesh(new THREE.BoxGeometry(2.6,1.9,0.9),st,0.15,0.95,-6.5));
  g.add(mesh(new THREE.BoxGeometry(1.5,1.15,0.4),new THREE.MeshBasicMaterial({color:0x080402}),0.15,0.65,-6.05));
  g.add(mesh(new THREE.BoxGeometry(2.9,0.18,1.1),std('#4a3020'),0.15,1.95,-6.45));
  g.add(mesh(new THREE.BoxGeometry(1.4,2.8,0.6),st,0.15,3.3,-6.7));
  T.fire=buildFire(0.45);T.fire.group.position.set(0.15,0.08,-5.9);g.add(T.fire.group);
  /* окно с луной */
  g.add(mesh(new THREE.BoxGeometry(1.2,1.4,0.05),new THREE.MeshBasicMaterial({color:0x0a1830}),2.9,2.6,-6.95));
  var moon=glowSprite(0x9fd8ff,1.3,0.8);moon.position.set(3.1,2.85,-6.9);g.add(moon);
  g.add(mesh(new THREE.BoxGeometry(1.3,0.07,0.08),std('#3a2414'),2.9,2.6,-6.9));
  g.add(mesh(new THREE.BoxGeometry(0.07,1.5,0.08),std('#3a2414'),2.9,2.6,-6.9));
  /* стол, кружка, свеча */
  var wood=std('#4a2e18');
  g.add(mesh(new THREE.BoxGeometry(1.3,0.08,0.9),wood,-2.6,0.78,-3.2));
  [[-0.55,-0.35],[0.55,-0.35],[-0.55,0.35],[0.55,0.35]].forEach(function(q){g.add(mesh(new THREE.BoxGeometry(0.08,0.78,0.08),wood,-2.6+q[0],0.39,-3.2+q[1]));});
  g.add(mesh(new THREE.CylinderGeometry(0.08,0.07,0.18,8),std('#8a8a90',{m:0.6}),-2.4,0.91,-3.1));
  g.add(mesh(new THREE.CylinderGeometry(0.035,0.035,0.2,6),std('#e8e0c0'),-2.9,0.92,-3.3));
  var flame=glowSprite(0xffc060,0.3,1);flame.position.set(-2.9,1.08,-3.3);g.add(flame);
  /* кресло под магом */
  var red=std('#5a1e1e');
  /* кресло чуть позади: при посадке таз уходит назад на ~0.33 */
  var cz=MAGE_POS.z+0.32;
  g.add(mesh(new THREE.BoxGeometry(0.85,0.42,0.75),red,MAGE_POS.x,0.21,cz));
  g.add(mesh(new THREE.BoxGeometry(0.85,0.8,0.14),red,MAGE_POS.x,0.62,cz+0.4));
  [-1,1].forEach(function(sd){g.add(mesh(new THREE.BoxGeometry(0.14,0.62,0.75),red,MAGE_POS.x+sd*0.45,0.42,cz));});
  var lamp=new THREE.PointLight(0xffb060,1.0,10,1.4);lamp.position.set(-2.6,2.4,-3);g.add(lamp);
  /* ночное ремесло: флаконы на столе (по уровню алхимического стола) */
  T.potions=[];
  var potCols=['#ff5a8a','#40e0ff','#9cff6a','#ffb830','#b080ff'];
  for(var pi=0;pi<5;pi++){
    var pg=new THREE.Group(),pc=new THREE.Color(potCols[pi]);
    var pm=new THREE.MeshStandardMaterial({color:pc,emissive:pc,emissiveIntensity:0.9,roughness:0.15,transparent:true,opacity:0.85});
    pg.add(mesh(new THREE.SphereGeometry(0.065,12,10),pm,0,0.065,0));
    pg.add(mesh(new THREE.CylinderGeometry(0.018,0.022,0.07,8),std('#cfe8f0',{r:0.2}),0,0.15,0));
    pg.add(mesh(new THREE.CylinderGeometry(0.022,0.022,0.025,8),std('#6a4a2a'),0,0.195,0));
    pg.position.set(-3.05+pi*0.16,0.82,-3.5+(pi%2)*0.08);
    pg.visible=false;g.add(pg);T.potions.push({g:pg,m:pm,ph:pi*1.3});
  }
  /* ступка и стопка амулетов: появляются вместе с первым флаконом */
  T.mortar=mesh(new THREE.CylinderGeometry(0.09,0.07,0.1,10),std('#7a7068',{r:0.9}),-2.15,0.87,-3.35);T.mortar.visible=false;g.add(T.mortar);
  /* доска заказов на левой стене */
  T.board=new THREE.Group();T.board.position.set(-4.93,1.9,-3.4);T.board.rotation.y=Math.PI/2;
  T.board.add(mesh(new THREE.BoxGeometry(1.5,1.0,0.05),std('#5a3a1e'),0,0,0));
  T.board.add(mesh(new THREE.BoxGeometry(1.6,0.08,0.08),std('#2a1a0e'),0,0.53,0.02));
  T.notes=[];
  var noteM=std('#e8dcb8',{r:1});
  [[-0.45,0.18,0.08],[0.05,0.22,-0.1],[0.48,0.12,0.12],[-0.3,-0.25,-0.06],[0.2,-0.22,0.1],[0.52,-0.28,-0.12]].forEach(function(q){
    var n=mesh(new THREE.PlaneGeometry(0.32,0.38),noteM,q[0],q[1],0.03);n.rotation.z=q[2];T.board.add(n);
    n.add(mesh(new THREE.SphereGeometry(0.02,6,4),std('#a02020'),0,0.15,0.01));
    n.visible=false;T.notes.push(n);
  });
  T.board.visible=false;g.add(T.board);
  T.set=function(tav){
    var a=tav.alch||0,bd=tav.board||0;
    T.potions.forEach(function(p,i){p.g.visible=i<a;});
    T.mortar.visible=a>0;
    T.board.visible=bd>0;
    T.notes.forEach(function(n,i){n.visible=i<bd*2;});
  };
  T.time=0;
  T.update=function(dt){
    T.fire.update(dt);flame.scale.setScalar(0.26+Math.random()*0.05);
    T.time+=dt;
    for(var i=0;i<T.potions.length;i++){var p=T.potions[i];if(p.g.visible)p.m.emissiveIntensity=0.6+0.4*Math.sin(T.time*2+p.ph);}
  };
  return T;
}

function setBiome(id){
  if(id===R.biome)return;R.biome=id;
  var b=BIOMES[id];R.biomeObj=b;
  R.scene.fog=new THREE.Fog(b.fog,b.fogNear,b.fogFar);
  R.scene.background=new THREE.Color(b.fog);
  R.sky.material.map=skyTex(b);R.sky.material.needsUpdate=true;
  R.sunGlow.material.color.set(b.sun);R.sunGlow.material.opacity=b.night?0.3:0.55;
  R.sunGlow.position.y=60-(b.sunY-0.5)*200*0.9;
  R.rays.forEach(function(r){r.visible=!b.night;r.material.color.set(b.sun);});
  R.treelines.forEach(function(tl){tl.material.map=treelineTex(b,tl.userData.k);tl.material.needsUpdate=true;});
  R.groundBiome=-1;applyGround();
  if(window.Adventure&&Adventure.ready){
    swapForest(Adventure.kinds(id));
    Adventure.loadBiome(id).then(function(){if(R.biome===id){R.groundBiome=-1;applyGround();}},function(){});
  }
  R.hemi.color.set(b.hemiSky);R.hemi.groundColor.set(b.hemiGround);R.hemi.intensity=b.hemiI||1;
  R.sun.color.set(b.sunCol);R.sun.intensity=b.sunI;R.fill.intensity=b.fill;
  /* с настоящим лесом туман реже, иначе он прячет деревья */
  var mk=R.forest&&R.forest.models?0.5:1;
  R.mist.forEach(function(m){m.material.color.set(b.night?'#8aa0c0':'#ffffff');m.material.opacity=(b.night?0.18:0.32)*mk;});
  R.motes.material.color.set(b.mote);R.motes.material.opacity=b.moteOp;R.motes.material.size=b.night?0.14:0.09;
  forestTint(b);
}
/* земля и дорога: текстуры Poly Haven, если уже скачаны, иначе нарисованные */
var roadMask=null;
function maskTex(){
  if(roadMask)return roadMask;
  roadMask=canvasTex('roadmask',256,256,function(g,w,h){
    g.fillStyle='#000';g.fillRect(0,0,w,h);
    var L=56,Rr=200;
    for(var y=0;y<h;y++){
      var e1=L+Math.sin(y/h*Math.PI*4)*6+Math.sin(y/h*Math.PI*10)*3,e2=Rr+Math.sin(y/h*Math.PI*6+1)*6+Math.sin(y/h*Math.PI*14)*3;
      var grd=g.createLinearGradient(e1-18,0,e2+18,0);
      grd.addColorStop(0,'#000');grd.addColorStop(18/(e2-e1+36),'#fff');grd.addColorStop(1-18/(e2-e1+36),'#fff');grd.addColorStop(1,'#000');
      g.fillStyle=grd;g.fillRect(e1-18,y,e2-e1+36,1);
    }
  });
  roadMask.wrapS=THREE.ClampToEdgeWrapping;roadMask.wrapT=THREE.RepeatWrapping;roadMask.repeat.set(1,50);
  return roadMask;
}
function rep2(t,x,y){if(!t)return null;t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(x,y);t.needsUpdate=true;return t;}
function applyGround(){
  if(!R||R.biome<0)return;
  var b=R.biomeObj,id=R.biome,set=window.Adventure&&Adventure.groundSet?Adventure.groundSet(id):null;
  var key=id+(set?'a':'c')+(R.qName||'');
  if(R.groundBiome===key)return;R.groundBiome=key;
  var gm=R.ground.material,rm=R.road.material,nrm=R.qName&&R.qName!=='low';
  if(set){
    gm.map=rep2(set.g,48,40);gm.normalMap=nrm?rep2(set.gn,48,40):null;gm.color.set(set.gc);
    rm.map=rep2(set.r,1.3,46);rm.normalMap=nrm?rep2(set.rn,1.3,46):null;rm.alphaMap=maskTex();rm.color.set(set.rc);
    if(gm.normalMap)gm.normalScale.set(0.8,0.8);if(rm.normalMap)rm.normalScale.set(1,1);
  }else{
    var gt=grassTex(b);gt.repeat.set(60,50);gm.map=gt;gm.normalMap=null;gm.color.set('#ffffff');
    var rt=roadTex(b);rt.repeat.set(1,50);rm.map=rt;rm.normalMap=null;rm.alphaMap=null;rm.color.set('#ffffff');
  }
  gm.needsUpdate=true;rm.needsUpdate=true;
}
/* ассеты приключения: качаются в фоне после старта; когда готовы, лес и земля переключаются сами */
function loadAdventure(){
  if(!window.Adventure||R.advLoading)return;
  R.advLoading=true;
  var res=(R.qName==='high'||R.qName==='ultra')?'2k':'1k';
  Adventure.init(THREE).then(function(){R.advInit=true;applyPet();return Adventure.loadBase(res);}).then(function(){
    var id=R.biome;R.biome=-1;setBiome(id<0?0:id);
    /* монстры других трактов: только открытых, остальные докачаются, когда маг туда пойдёт */
    var g=window.acGame;for(var t=0;t<4;t++)if(t!==id&&g&&g.tractOpen&&g.tractOpen(t))Adventure.loadTract(t);
  },function(e){console.warn('[scene3d] adventure',e);R.advLoading=false;});
}

/* ── питомец на дороге (v14): бежит рядом с магом, в бою иногда бросается, на привале лежит ── */
function setPet(id){if(!R)return;R.petWant=id||null;applyPet();}
function applyPet(){
  var id=R.petWant;if(R.pet&&R.pet.id===id)return;
  if(R.pet){R.scene.remove(R.pet.root);R.pet.dispose();R.pet=null;}
  if(!id||!R.advInit||!window.Adventure)return;
  Adventure.loadPet(id).then(function(){
    if(R.petWant!==id||R.pet)return;
    var P=Adventure.pet(id);if(!P)return;
    R.pet=P;R.petAtk=2;P.root.position.set(MAGE_POS.x-1.0,0,MAGE_POS.z-0.6);P.root.rotation.y=Math.PI;
    R.scene.add(P.root);P.play('idle',0);
  },function(){});
}
var PET_HOME=null;
function updatePet(dt){
  var P=R.pet;if(!P)return;
  PET_HOME=PET_HOME||new THREE.Vector3(MAGE_POS.x-1.0,0,MAGE_POS.z-0.6);
  P.root.visible=R.mode!=='tavern'&&R.view!=='tavern';
  var J=R.petJob;
  if(J&&(R.mode!=='fight'||!R.enemy)){R.petJob=J=null;P.root.position.x=PET_HOME.x;P.root.position.z=PET_HOME.z;}
  if(R.mode==='walk'){if(!P.busy())P.play('run',0.2);P.root.rotation.y=Math.PI;P.root.position.x=PET_HOME.x;P.root.position.z=PET_HOME.z;}
  else if(R.mode==='fight'){
    if(J){
      J.t+=dt;
      var eh=R.enemy?R.enemy.h*R.enemy.root.scale.x:1;
      var tgt=new THREE.Vector3(ENEMY_POS.x-0.35,0,ENEMY_POS.z+0.75+Math.min(1.2,eh*0.22));
      if(P.fly){
        /* дракончик: на месте, пламя летит к врагу */
        if(J.t<0.05)P.play('attack',0.1);
        if(J.t>0.15&&J.t<0.45){J.ft=(J.ft||0)-dt;if(J.ft<=0){J.ft=0.03;var from=P.root.position.clone();from.y+=0.5;from.z-=0.3;
          var to=enemyCenter(new THREE.Vector3());to.x+=(Math.random()-0.5)*0.4;to.y+=(Math.random()-0.5)*0.4;
          var fs=getSprite(Math.random()<0.5?0xff7a20:0xffc040,0.25,1);fs.position.copy(from);R.fire.push({s:fs,a:from,b:to,t:0,dur:0.3,size:0.28});}}
        if(J.t>=0.45&&!J.hit){J.hit=true;onPetHit(J.crit);}
        if(J.t>0.9){var nx2=J.next;R.petJob=nx2?{t:0,crit:nx2.crit,hit:false}:null;}
        P.root.rotation.y=Math.PI-0.25;
      }else{
        var go=Math.min(1,J.t/0.3),back=Math.max(0,Math.min(1,(J.t-0.6)/0.4));
        var k=go*(1-back);
        P.root.position.x=PET_HOME.x+(tgt.x-PET_HOME.x)*k;P.root.position.z=PET_HOME.z+(tgt.z-PET_HOME.z)*k;
        if(J.t<0.3){if(P.role!=='run')P.play('run',0.08);P.root.rotation.y=Math.atan2(tgt.x-PET_HOME.x,tgt.z-PET_HOME.z);}
        else if(J.t<0.6){if(P.role!=='attack')P.play('attack',0.06);P.root.rotation.y=Math.PI;}
        else if(J.t<1.0){if(P.role!=='run')P.play('run',0.08);P.root.rotation.y=Math.atan2(PET_HOME.x-tgt.x,PET_HOME.z-tgt.z);}
        else{var nx=J.next;R.petJob=nx?{t:0,crit:nx.crit,hit:false}:null;if(!nx)P.play('idle',0.2);}
        if(J.t>=0.45&&!J.hit){J.hit=true;onPetHit(J.crit);}
      }
    }else{if(!P.busy())P.play('idle',0.25);P.root.rotation.y=Math.PI-0.25;}
  }else if(!P.busy())P.play('low',0.4);
  P.mixer.update(dt);
  P.root.position.y=P.fly?P.fly+Math.sin(R.t*2.2)*0.08:0;
}
function onPetHit(crit){
  var E=R.enemy;if(!E||E.form)return;
  var c=enemyCenter(new THREE.Vector3());c.y-=0.2;
  burst(c,R.pet&&R.pet.fly?0xff8a30:0xffe0b0,crit?12:6,2.6,0.12);
  E.flash=Math.max(E.flash,0.6);E.shake=Math.max(E.shake,0.8);
  if(E.acts&&E.acts.HitReact&&!E.curOnce&&!E.wind&&Math.random()<0.35)playAct(E,'HitReact',0.06);
}
/* таверна на слабой графике: без постобработки и с пиксельным коэффициентом не выше 1 (телефоны) */
function tavLite(){return R.qName!=='high'&&R.qName!=='ultra';}
function curPr(){return R.view==='tavern'&&tavLite()?Math.min(R.pr||1,1):(R.pr||1);}
function resize(){
  if(!R)return;
  var w=R.host.clientWidth||1,h=R.host.clientHeight||1;
  R.renderer.setPixelRatio(curPr());
  R.renderer.setSize(w,h,false);
  if(R.post&&R.postMode)R.post.resize(Math.round(w*R.pr),Math.round(h*R.pr));
  R.renderer.domElement.style.width=w+'px';R.renderer.domElement.style.height=h+'px';
  var a=w/h;R.camera.aspect=a;
  /* по горизонтали видно не меньше ~64 градусов: на телефоне камера шире */
  var vf=2*Math.atan(Math.tan(THREE.MathUtils.degToRad(32))/a)*180/Math.PI;
  R.camera.fov=Math.max(46,Math.min(78,vf));
  var portrait=a<0.9;
  /* широкий экран: камера дальше и выше, чтобы маг был виден целиком */
  var wide=Math.max(0,Math.min(1,(a-1.25)/0.6));
  R.camBase.set(0.45,portrait?2.75:2.55+wide*0.25,portrait?5.3:4.7+wide*1.1);
  R.camTarget.set(0.2,portrait?1.45:1.7-wide*0.25,-6);
  R.camera.position.copy(R.camBase);R.camera.lookAt(R.camTarget);
  R.camera.updateProjectionMatrix();
  if(window.Tavern3D&&Tavern3D.built)Tavern3D.resize(w,h);
}

/* ── спрайты-частицы из пула ── */
function getSprite(color,size,op,normal){
  var s=R.pool.pop();
  if(!s){s=glowSprite(color,size,op);}
  else{s.material.color.set(color);s.material.opacity=op;s.scale.set(size,size,1);s.visible=true;}
  s.material.blending=normal?THREE.NormalBlending:THREE.AdditiveBlending;
  R.scene.add(s);return s;
}
function putSprite(s){R.scene.remove(s);if(R.pool.length<260)R.pool.push(s);else s.material.dispose();}
function burst(pos,color,n,spd,size,normal,grav){
  for(var i=0;i<n;i++){
    if(R.parts.length>300)break;
    var s=getSprite(color,size||0.12+Math.random()*0.1,1,normal);s.position.copy(pos);
    var v=new THREE.Vector3((Math.random()-0.5)*2,Math.random()*1.6,(Math.random()-0.5)*2).normalize().multiplyScalar((spd||3)*(0.4+Math.random()*0.8));
    R.parts.push({s:s,v:v,life:0.5+Math.random()*0.4,max:0.9,g:grav===undefined?4:grav,grow:normal?1.2:0});
  }
}
/* тень, из которой собирается враг */
function makeShadow(scale){
  var S={g:new THREE.Group(),puffs:[],eyes:[]};
  for(var i=0;i<16;i++){
    var p=new THREE.Sprite(new THREE.SpriteMaterial({map:smokeTex(),color:0x05030a,transparent:true,opacity:0,depthWrite:false}));
    p.userData={a:rnd(0,6.28),r:rnd(0.1,0.5),y:rnd(0.2,1.3),s:rnd(0.8,1.6),sp:rnd(0.6,1.6)};
    S.g.add(p);S.puffs.push(p);
  }
  [-1,1].forEach(function(sd){var e=glowSprite(0xff2a3a,0.18,0);e.position.set(sd*0.12,0.95,0.3);e.material.fog=false;S.g.add(e);S.eyes.push(e);});
  S.g.scale.setScalar(scale);
  return S;
}
function updateShadow(S,t,p){
  S.puffs.forEach(function(q){
    var u=q.userData,a=u.a+t*u.sp;
    q.position.set(Math.cos(a)*u.r*(1.3-p*0.4),u.y+Math.sin(t*2+u.a)*0.08,Math.sin(a)*u.r*0.6);
    var s=u.s*(0.6+p*0.7);q.scale.set(s,s*1.2,1);
    q.material.opacity=Math.min(0.85,p*2.2)*(p>0.85?Math.max(0,1-(p-0.85)/0.15):1);
  });
  S.eyes.forEach(function(e){e.material.opacity=p>0.35?Math.min(1,(p-0.35)*3)*(p>0.9?Math.max(0,1-(p-0.9)/0.1):1):0;});
}

function enemyCenter(out){
  var E=R.enemy;if(!E)return out.set(ENEMY_POS.x,1,ENEMY_POS.z);
  out.copy(E.root.position);out.y+=(E.h*0.55)*E.scale*Math.max(0.3,E.root.scale.x/E.scale);return out;
}
function bolt(kind,crit){
  if(!R||!R.enemy)return;
  var from=new THREE.Vector3();R.mage.core.getWorldPosition(from);
  var to=enemyCenter(new THREE.Vector3());
  to.x+=(Math.random()-0.5)*0.3;to.y+=(Math.random()-0.5)*0.3;
  var col=kind==='discharge'?0xffcc33:kind==='click'?0xc8fbff:R.mage.coreMat.color.getHex();
  if(crit)col=0xff2d78;
  var size=kind==='discharge'?1.0:kind==='click'?0.32:0.42;if(crit)size*=1.35;
  var ctrl=from.clone().lerp(to,0.45);ctrl.y+=kind==='click'?0.5:1.0+Math.random()*0.6;ctrl.x+=(Math.random()-0.5)*1.6;
  var head=getSprite(col,size,1),trail=[];
  for(var i=0;i<7;i++)trail.push(getSprite(col,size*(0.85-i*0.1),0.6-i*0.08));
  R.bolts.push({head:head,trail:trail,from:from,to:to,ctrl:ctrl,t:0,dur:kind==='discharge'?0.45:kind==='click'?0.2:0.32,col:col,kind:kind,crit:crit});
  R.mage.kick=Math.min(1.4,R.mage.kick+(kind==='click'?0.5:0.8));
  /* v21: иногда маг бросает искру свободной рукой (клик), разряд всегда бросок */
  var M=R.mage;
  if(M.react&&M.busyReact&&!M.busyReact()){
    var now=performance.now();
    if(kind==='discharge'){M.react('throw',1100);R.throwAt=now;}
    else if(kind==='click'&&now-(R.throwAt||0)>2500&&Math.random()<0.3){M.react('throw',1000);R.throwAt=now;}
  }
}
function bez(o,a,c,b,t){var u=1-t;o.set(u*u*a.x+2*u*t*c.x+t*t*b.x,u*u*a.y+2*u*t*c.y+t*t*b.y,u*u*a.z+2*u*t*c.z+t*t*b.z);return o;}

/* монстр из моделей приключения: та же структура E, что у нарисованного, плюс микшер анимаций */
var ROAD_SIZE=1.5;   /* v21: монстры на дороге в 1.5 раза крупнее (и нарисованные, и модели) */
function buildModelMonster(e){
  var role=e.boss?(e.role||'main'):e.elite?'elite':'mob',boss=!!e.boss;
  var A=Adventure.monster(e.v,role);if(!A)return null;
  var E={root:new THREE.Group(),body:new THREE.Group(),type:'model',model:A,mixer:A.mixer,acts:A.acts,mats:A.mats,t:Math.random()*10,flash:0,shake:0,lunge:0,lungeT:1.4+Math.random()*1.5,die:-1,gone:-1,cur:null,
    boss:boss,role:role,fx:A.fx,kb:0,wind:0,rage:false};
  E.scale=boss?2.0:1.35;
  /* рост модели задан в метрах: внутри делим на масштаб, который растит монстра при появлении */
  E.body.scale.setScalar(1/E.scale);E.body.add(A.root);E.root.add(E.body);
  E.h=A.h/E.scale;E.float=A.fly?A.fly/E.scale:undefined;
  A.root.traverse(function(o){if(o.isMesh)o.userData.shared=true;});
  if(boss||role==='elite'){
    var col=role==='elite'?0xffc840:0xff2d4a,rr=role==='elite'?0.55:0.7;
    E.aura=mesh(new THREE.RingGeometry(rr,rr+0.15,40),new THREE.MeshBasicMaterial({color:col,transparent:true,opacity:0.6,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide}),0,0.03,0);
    E.aura.rotation.x=-Math.PI/2;E.root.add(E.aura);
    var ag2=glowSprite(col,role==='elite'?1.5:2.4,role==='elite'?0.2:0.25);ag2.position.y=E.h*0.5;E.root.add(ag2);
  }
  E.shadow=mesh(new THREE.CircleGeometry(0.55,20),new THREE.MeshBasicMaterial({color:0x000000,transparent:true,opacity:0.4,depthWrite:false}),0,0.012,0);
  E.shadow.rotation.x=-Math.PI/2;E.root.add(E.shadow);
  playAct(E,E.acts.Walk?'Walk':E.acts.Flying?'Flying':E.acts.Jump?'Jump':'Idle',0);
  return E;
}
/* клип монстра: idle/walk по кругу, удар и смерть один раз */
function playAct(E,name,fade){
  var a=E.acts[name];if(!a||E.cur===name&&a.isRunning())return;
  var once=/Attack|Punch|Death|HitReact/.test(name);
  a.reset();a.setLoop(once?THREE.LoopOnce:THREE.LoopRepeat,Infinity);a.clampWhenFinished=once;a.enabled=true;
  var prev=E.cur&&E.acts[E.cur];
  if(prev&&prev!==a&&fade>0)a.crossFadeFrom(prev,fade,false);else if(prev&&prev!==a)prev.stop();
  a.play();E.cur=name;E.curOnce=once;
}
function idleAct(E){return E.acts.Idle?'Idle':E.acts.Flying?'Flying':'Walk';}
function spawn(e,walkT){
  if(!R)return;
  if(R.enemy)dropEnemy(R.enemy,'gone');
  setBiome(e.biome||0);
  var E=null;
  if(window.Adventure&&Adventure.hasMonster&&Adventure.hasMonster(e.v))E=buildModelMonster(e);
  else if(window.Adventure&&Adventure.ready&&e.t!==undefined)Adventure.loadTract(e.t);
  if(!E)E=buildMonster(e.type,e.boss,e.biome,e.cols);
  E.root.rotation.y=0;
  castShadows(E.root,true);E.shadow.visible=!R.shadowOn;
  E.root.scale.setScalar(0.001);
  E.form={t:0,dur:walkT||2.2,shadow:makeShadow(E.scale*(E.h>1.4?1.3:1))};
  E.root.position.set(ENEMY_POS.x,0,Z_FAR*0.7);
  E.form.shadow.g.position.copy(E.root.position);
  R.scene.add(E.form.shadow.g);
  R.scene.add(E.root);
  R.enemy=E;
}
function endForm(E){
  if(!E.form)return;
  R.scene.remove(E.form.shadow.g);
  E.form.shadow.puffs.forEach(function(p){p.material.dispose();});E.form.shadow.eyes.forEach(function(p){p.material.dispose();});
  E.form=null;
}
function dropEnemy(E,how){
  var c=enemyCenter(new THREE.Vector3());
  if(how==='die'){E.die=0;burst(c,0x120818,E.scale>1.5?22:12,2.2,0.32,true,-0.6);burst(c,R.biomeObj.accent,E.scale>1?40:18,4,0.14);}
  else{E.gone=0;if(!E.form)burst(c,0x120818,10,1.6,0.4,true,-0.4);}
  endForm(E);
  R.dead.push(E);
  if(R.enemy===E)R.enemy=null;
}
/* босс попал по магу: красные искры у мага и лёгкая тряска */
function hurt(h){
  if(!R||!R.mage)return;
  var p=new THREE.Vector3();R.mage.root.getWorldPosition(p);p.y+=1.2;
  burst(p,0xff2d4a,18,2.6,0.13);
  R.shakeT=Math.max(R.shakeT||0,0.35);R.stopT=0.07;
  ring(MAGE_POS.x,MAGE_POS.z,'wave',0xff6040,0.5,0.3,3.2,0.9);
  /* v21: в ярости босс иногда сбивает мага с ног, тот встаёт; обычные удары чередуют попадание в грудь и в голову */
  var M=R.mage,now=performance.now();
  if(M.reactSeq&&h&&h.rage&&now-(R.knockAt||0)>9000&&Math.random()<0.35){R.knockAt=now;M.reactSeq([['knock',800],['getup',1500]]);}
  else if(M.react)M.react((R.hurtN=(R.hurtN||0)+1)%2?'hurt':'hurt2',650);
  else M.kick=1.4;
}
/* кольцо на земле: warn - мигает перед ударом, wave - расходится */
function ring(x,z,kind,color,dur,s0,s1,op){
  var m=mesh(new THREE.RingGeometry(0.75,1.0,48),new THREE.MeshBasicMaterial({color:color,transparent:true,opacity:op||0.8,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide}),x,0.04,z);
  m.rotation.x=-Math.PI/2;m.material.fog=false;R.scene.add(m);
  R.rings.push({m:m,t:0,dur:dur,kind:kind,s0:s0||0.4,s1:s1||2,op:op||0.8});
}
/* босс замахнулся: удар придёт через D.BOSS_WIND с */
function bossWind(rage){
  if(!R||!R.enemy||R.enemy.form)return;
  var E=R.enemy;E.rage=!!rage;
  var atk=E.acts&&(E.acts.Attack?'Attack':E.acts.Punch?'Punch':null);
  if(atk)playAct(E,atk,0.08);else E.lunge=1;
  var d=(window.AcData&&AcData.BOSS_WIND)||0.55;
  ring(MAGE_POS.x,MAGE_POS.z,'warn',rage?0xff2020:0xff6a30,d,0.4,0.8,0.7);
  /* v21: маг иногда закрывается от замаха */
  if(R.mage&&R.mage.react&&R.mage.busyReact&&!R.mage.busyReact()&&Math.random()<0.35)R.mage.react('block',d*1000+150);
}
/* удар обычного монстра гасит щит мага: голубая вспышка перед ним */
function shieldFx(){
  if(!R||!R.mage)return;
  var p=new THREE.Vector3(MAGE_POS.x+0.15,1.15,MAGE_POS.z-0.7);
  var col=R.mage.coreMat?R.mage.coreMat.color.getHex():0x7fd8ff;
  var sh=getSprite(col,0.3,0.9);sh.position.copy(p);
  R.parts.push({s:sh,v:new THREE.Vector3(0,0,0),life:0.35,max:0.35,g:0,grow:6});
  burst(p,col,6,1.6,0.08);
  if(R.mage.react&&Math.random()<0.5)R.mage.kick=Math.max(R.mage.kick||0,0.4);
}
/* попадание: частицы по виду монстра, реакция, отброс; на крите стоп-кадр */
var FX={chips:[0x8a5a2a,true,5],slime:[0x6fd84a,true,3],spark:[0xffd060,false,8],wisp:[0x8ff0ff,false,-1.5],fur:[0xe8d8b8,true,4]};
function onHit(h){
  if(!R||!R.enemy||R.enemy.form)return;
  var E=R.enemy,f=FX[E.fx]||FX.spark,c=enemyCenter(new THREE.Vector3());
  burst(c,f[0],h.crit?12:5,h.crit?3.6:2.4,f[1]?0.16:0.1,f[1],f[2]);
  if(h.crit||h.big){E.kb=Math.min(1,(E.kb||0)+(E.boss?0.35:0.8));R.stopT=Math.max(R.stopT,0.05);}
  if(E.acts&&E.acts.HitReact&&!E.curOnce&&!E.wind&&(h.crit||Math.random()<(E.boss?0.12:0.3)))playAct(E,'HitReact',0.06);
}
/* укус питомца: бежит к врагу, кусает, возвращается; дракончик плюётся огнём */
function petBite(crit){
  if(!R||!R.pet||!R.enemy||R.enemy.form||R.mode!=='fight')return;
  if(R.petJob&&R.petJob.t<1){R.petJob.next={crit:!!crit};return;}
  R.petJob={t:0,crit:!!crit,hit:false};
}
/* победа над боссом: замедление, золотые искры, маг поднимает посох */
function victory(){
  if(!R||!R.mage)return;
  R.slowT=0.9;
  var p=new THREE.Vector3(MAGE_POS.x,1.6,MAGE_POS.z);burst(p,0xffd56a,30,3.2,0.14,false,1.2);
  /* v21: разная радость: посох вверх, большой палец или танец */
  var vv=[['victory',1500],['yes',2400],['Dance_Loop',2600]][Math.floor(Math.random()*3)];
  if(R.mage.react)setTimeout(function(){if(R&&R.mage.react){R.mage.seqUntil=0;R.mage.react(vv[0],vv[1]);}},250);
}
function setRage(on){if(R&&R.enemy)R.enemy.rage=!!on;}
function kill(){if(R&&R.enemy){var E=R.enemy;dropEnemy(E,'die');if(E.scale>1.5){R.shakeT=0.5;R.slowT=Math.max(R.slowT,0.6);}}}
function retreat(){if(R&&R.enemy)dropEnemy(R.enemy,'gone');}

var _v=null;
function enemyScreen(){
  if(!R)return null;
  _v=_v||new THREE.Vector3();
  if(R.enemy){_v.copy(R.enemy.root.position);_v.y+=R.enemy.h*R.enemy.scale+0.2;}
  else _v.set(ENEMY_POS.x,1.8,ENEMY_POS.z);
  _v.project(R.camera);
  return {x:(_v.x+1)/2*R.host.clientWidth,y:(1-_v.y)/2*R.host.clientHeight};
}
/* ремесло в таверне: оснащение стола и доски, искры над столом при продаже */
function setTavern(tav){if(R&&R.tavern&&R.tavern.set)R.tavern.set(tav||{});}
function craft(){
  if(!R||R.mode!=='tavern')return;
  var p=new THREE.Vector3(-2.6,1.05,-3.3);
  burst(p,0xffd56a,10,1.6,0.08,false,1.5);
}
function mageScreen(){
  if(!R)return null;
  _v=_v||new THREE.Vector3();R.mage.core.getWorldPosition(_v);_v.project(R.camera);
  return {x:(_v.x+1)/2*R.host.clientWidth,y:(1-_v.y)/2*R.host.clientHeight};
}

function setMode(m){
  if(!R||R.mode===m)return;
  var wasTavern=R.mode==='tavern';
  R.mode=m;
  var tav=m==='tavern';
  R.world.visible=!tav;R.tavern.group.visible=tav;
  R.camp.group.visible=m==='sit';
  if((m==='sit'||tav)&&R.enemy)dropEnemy(R.enemy,'gone');
  if(tav){R.scene.fog=new THREE.Fog(0x120a06,9,30);R.scene.background=new THREE.Color(0x120a06);}
  else if(wasTavern){var b=R.biome;R.biome=-1;setBiome(b);}
}
function endPortal(){
  var pf=R.portalFx;if(!pf)return;
  if(!pf.fired&&pf.cb)pf.cb();
  R.scene.remove(pf.ring);R.scene.remove(pf.disc);pf.ring.geometry.dispose();pf.ring.material.dispose();pf.disc.material.dispose();R.portalFx=null;
}
function portal(cb){
  if(!R){if(cb)cb();return;}
  endPortal();
  var pos=new THREE.Vector3(MAGE_POS.x,1.0,MAGE_POS.z-1.2);
  var col=R.mage.coreMat.color.getHex();
  burst(pos,col,40,3.5,0.2);
  var ring=mesh(new THREE.TorusGeometry(0.7,0.05,8,48),new THREE.MeshBasicMaterial({color:col,transparent:true,opacity:1,blending:THREE.AdditiveBlending,depthWrite:false}));
  ring.position.copy(pos);R.scene.add(ring);
  var disc=glowSprite(col,0.5,1);disc.position.copy(pos);R.scene.add(disc);
  R.portalFx={ring:ring,disc:disc,t:0,cb:cb,fired:false};
  var fl=document.createElement('div');fl.className='ac-flash';R.host.appendChild(fl);
  setTimeout(function(){fl.remove();},900);
}

function frame(dt,real){
  if(!R)return;
  /* вид таверны: своя сцена и камера из tavern3d.js, дорога в это время стоит */
  if(R.view==='tavern'&&window.Tavern3D&&Tavern3D.built){
    Tavern3D.update(Math.min(dt,0.05));
    if(R.post&&R.postMode&&!tavLite())R.post.render(Tavern3D.scene,Tavern3D.camera,R.postMode,R.t);
    else{R.renderer.setRenderTarget(null);R.renderer.render(Tavern3D.scene,Tavern3D.camera);}
    return;
  }
  real=real===undefined?dt:Math.min(real,1);
  /* стоп-кадр на крите и ударе босса, замедление на смерти босса */
  if(R.stopT>0){R.stopT-=real;dt*=0.06;}
  else if(R.slowT>0){R.slowT-=real;dt*=0.35;}
  R.t+=dt;
  var walking=R.mode==='walk';
  var b=R.biomeObj;
  /* мир едет на мага */
  if(walking&&R.world.visible){
    var d=WALK_SPEED*dt*(1-0.3*R.fat);
    scrollTex(R.road.material,d);scrollTex(R.ground.material,d);
    forestUpdate(d);
    R.forest.kinds.forEach(function(k){if(k.dirty){k.dirty=false;forestTintKind(k);}});
    R.mist.forEach(function(m){m.position.z+=d;if(m.position.z>-6){m.position.z-=rnd(60,80);m.position.x=rnd(-14,14);}});
  }
  /* пылинки / светлячки */
  var mp=R.motes.geometry.attributes.position,arr=mp.array;
  for(var i=0;i<arr.length;i+=3){
    arr[i]+=Math.sin(R.t*0.7+i)*dt*0.12;arr[i+1]+=Math.cos(R.t*0.9+i*0.3)*dt*(b&&b.night?0.25:0.08);
    if(walking)arr[i+2]+=WALK_SPEED*dt;
    if(arr[i+2]>4)arr[i+2]-=26;
  }
  mp.needsUpdate=true;
  R.mist.forEach(function(m,i){m.position.x+=Math.sin(R.t*0.1+i)*dt*0.3;});
  /* маг */
  updateMage(R.mage,dt,R.mode==='tavern'?'sit':R.mode,R.fat);
  updatePet(dt);
  R.mageShadow.visible=R.mode!=='tavern'&&!R.shadowOn;
  if(R.mode==='tavern'){if(!R.avatar)R.mage.root.position.y+=0.42;R.tavern.update(dt);}
  if(R.seat)R.seat.visible=R.mode==='sit'&&!!R.avatar;
  if(R.mode==='sit')R.camp.update(dt);
  /* Zzz */
  if(R.mode==='sit'||R.mode==='tavern'){
    R.zzT-=dt;
    if(R.zzT<=0&&R.mage.head){
      R.zzT=1.1;
      var zm=new THREE.SpriteMaterial({map:zTex(),color:0xe8f4ff,transparent:true,depthWrite:false});
      var z=new THREE.Sprite(zm);z.scale.set(0.25,0.25,1);R.mage.head.getWorldPosition(z.position);z.position.y+=0.3;z.position.x+=0.15;
      R.scene.add(z);R.zz.push({s:z,t:0});
    }
  }
  for(var zi=R.zz.length-1;zi>=0;zi--){
    var zz=R.zz[zi];zz.t+=dt;zz.s.position.y+=dt*0.35;zz.s.position.x+=Math.sin(zz.t*3)*dt*0.15;
    zz.s.material.opacity=1-zz.t/2.2;var sc=0.2+zz.t*0.12;zz.s.scale.set(sc,sc,1);
    if(zz.t>2.2){R.scene.remove(zz.s);zz.s.material.dispose();R.zz.splice(zi,1);}
  }
  /* враг: тень вдали растёт, летит навстречу и обретает форму */
  var E=R.enemy;
  if(E){
    if(E.form){
      var F=E.form;F.t+=real;
      var p=Math.min(1,F.t/F.dur),k2=p*p*(3-2*p);
      var zpos=Z_FAR*0.7+(ENEMY_POS.z-Z_FAR*0.7)*(1-Math.pow(1-k2,2.2));
      E.root.position.set(ENEMY_POS.x,0,zpos);
      F.shadow.g.position.copy(E.root.position);
      updateShadow(F.shadow,R.t,p);
      var form=Math.max(0,(p-0.78)/0.22);
      E.root.scale.setScalar(Math.max(0.001,E.scale*form*form*(3-2*form)));
      if(p>=1){burst(enemyCenter(new THREE.Vector3()),0x120818,14,2.4,0.55,true,-0.5);endForm(E);}
    }else E.root.position.set(ENEMY_POS.x,0,ENEMY_POS.z-(E.kb||0)*0.45);
    updateMonster(E,dt,R.mode==='fight');
  }
  for(var di=R.dead.length-1;di>=0;di--){
    var X=R.dead[di];updateMonster(X,dt,false);
    var base=X.root.scale.x;
    if(X.die>=0&&X.mixer){
      /* модель: клип смерти, потом тает */
      if(X.cur!=='Death'&&X.acts.Death)playAct(X,'Death',0.1);
      X.die+=Math.max(dt,real);
      var hold=X.acts.Death?1.0:0,kk=Math.max(0,(X.die-hold)/0.4);
      if(!X.acts.Death)X.root.rotation.z=Math.min(1.4,X.die*3);
      X.root.scale.setScalar(X.scale*Math.max(0.01,1-kk));
      if(kk>=1){R.scene.remove(X.root);disposeTree(X.root);R.dead.splice(di,1);}
      continue;
    }
    if(X.die>=0){X.die+=Math.max(dt,real);var kd=X.die/0.5;X.root.scale.setScalar(X.scale*Math.max(0.01,1-kd));X.root.position.y=kd*0.5;X.root.rotation.y+=dt*5;if(kd>=1){R.scene.remove(X.root);disposeTree(X.root);R.dead.splice(di,1);}}
    else{if(X.goneBase===undefined)X.goneBase=base;X.gone+=Math.max(dt,real);var gk=X.gone/0.35;X.root.scale.setScalar(Math.max(0.001,X.goneBase*(1-gk)));if(walking)X.root.position.z+=WALK_SPEED*dt;if(gk>=1){R.scene.remove(X.root);disposeTree(X.root);R.dead.splice(di,1);}}
  }
  /* всплески */
  for(var bi=R.bolts.length-1;bi>=0;bi--){
    var B=R.bolts[bi];B.t+=dt;
    if(R.enemy)enemyCenter(B.to);
    var tt=Math.min(1,B.t/B.dur);
    bez(B.head.position,B.from,B.ctrl,B.to,tt);
    for(var ti=0;ti<B.trail.length;ti++)bez(B.trail[ti].position,B.from,B.ctrl,B.to,Math.max(0,tt-(ti+1)*0.055));
    if(tt>=1){
      burst(B.to,B.col,B.kind==='discharge'?40:B.crit?18:9,B.kind==='discharge'?5:3,B.kind==='discharge'?0.25:0.13);
      if(R.enemy){R.enemy.flash=1;R.enemy.shake=B.crit||B.kind==='discharge'?1.5:0.8;}
      if(B.kind==='discharge'||(B.crit&&R.enemy&&R.enemy.scale>1.5))R.shakeT=Math.max(R.shakeT,0.25);
      putSprite(B.head);B.trail.forEach(putSprite);R.bolts.splice(bi,1);
    }
  }
  /* круг-предупреждение под магом перед ударом босса, волна от удара, щит */
  for(var ri=R.rings.length-1;ri>=0;ri--){
    var G=R.rings[ri];G.t+=dt;var gq=G.t/G.dur;
    if(G.kind==='warn'){G.m.scale.setScalar(0.4+gq*0.8);G.m.material.opacity=0.25+0.5*Math.abs(Math.sin(G.t*14));}
    else{G.m.scale.setScalar(G.s0+gq*G.s1);G.m.material.opacity=Math.max(0,1-gq)*G.op;}
    if(gq>=1){R.scene.remove(G.m);G.m.geometry.dispose();G.m.material.dispose();R.rings.splice(ri,1);}
  }
  if(R.fire)for(var fi=R.fire.length-1;fi>=0;fi--){var Fp=R.fire[fi];Fp.t+=dt;var fq=Math.min(1,Fp.t/Fp.dur);Fp.s.position.lerpVectors(Fp.a,Fp.b,fq);Fp.s.position.y+=Math.sin(fq*Math.PI)*0.2;
    var fsz=Fp.size*(0.6+fq*0.9);Fp.s.scale.set(fsz,fsz,1);Fp.s.material.opacity=1-fq*0.7;if(fq>=1){putSprite(Fp.s);R.fire.splice(fi,1);}}
  /* частицы */
  for(var pi=R.parts.length-1;pi>=0;pi--){
    var q=R.parts[pi];q.life-=dt;
    q.v.y-=q.g*dt;q.s.position.addScaledVector(q.v,dt);
    if(q.s.position.y<0.03){q.s.position.y=0.03;q.v.y*=-0.4;q.v.x*=0.7;q.v.z*=0.7;}
    if(q.grow){var gs=q.s.scale.x*(1+q.grow*dt);q.s.scale.set(gs,gs,1);}
    q.s.material.opacity=Math.max(0,q.life/q.max)*(q.grow?0.8:1);
    if(q.life<=0){putSprite(q.s);R.parts.splice(pi,1);}
  }
  /* портал */
  if(R.portalFx){
    var pf=R.portalFx;pf.t+=real;
    var pq=pf.t/0.9;
    pf.ring.scale.setScalar(0.3+pq*2.2);pf.ring.material.opacity=Math.max(0,1-pq);
    pf.disc.scale.setScalar(0.5+Math.sin(Math.min(1,pq)*Math.PI)*3);pf.disc.material.opacity=Math.max(0,1-pq);
    if(!pf.fired&&pq>=0.45){pf.fired=true;if(pf.cb)pf.cb();}
    if(pq>=1)endPortal();
  }
  /* камера: покачивание в такт шагу, тряска */
  R.camera.position.copy(R.camBase);
  var bobK=walking?1:0.3;
  R.camera.position.x+=Math.sin(R.t*0.4)*0.08;R.camera.position.y+=Math.sin(R.t*(walking?4.2:0.5))*0.025*bobK;
  if(R.shakeT>0){R.shakeT-=dt;R.camera.position.x+=(Math.random()-0.5)*0.12;R.camera.position.y+=(Math.random()-0.5)*0.12;}
  R.camera.lookAt(R.camTarget);
  if(R.post&&R.postMode)R.post.render(R.scene,R.camera,R.postMode,R.t);
  else{R.renderer.setRenderTarget(null);R.renderer.render(R.scene,R.camera);}
}
/* земля едет на мага: сдвиг текстуры = путь * повторы / длина плоскости (200 м) */
function scrollTex(m,d){
  var seen=[];
  [m.map,m.normalMap,m.alphaMap].forEach(function(t){if(!t||seen.indexOf(t)>=0)return;seen.push(t);t.offset.y+=d*t.repeat.y/200;});
}
function forestTintKind(k){
  var b=R.biomeObj,c=R.forest.c;
  if(R.forest.models){
    var pal=k.K.leafPal?k.K.leafPal.map(function(h){return new THREE.Color(h);}):null;
    k.K.parts.forEach(function(p,pi){
      var im=k.meshes[pi];if(!im.instanceColor)return;
      for(var i=0;i<k.inst.length;i++){
        var o=k.inst[i];
        if(p.tint==='leaf'&&pal)c.copy(pal[o.pi%pal.length]).multiplyScalar(o.v);else c.setRGB(o.v,o.v,o.v);
        im.setColorAt(i,c);
      }
      im.instanceColor.needsUpdate=true;
    });
    return;
  }
  var base={pine:b.pine,oak:b.oak,rock:b.rock,moss:b.moss,bush:b.oak,grass:b.grass2};
  k.K.parts.forEach(function(p,pi){
    if(!p.tint)return;
    var im=k.meshes[pi],col=new THREE.Color(base[p.tint]);
    if(p.tint==='bush')col.lerp(new THREE.Color(b.pine),0.4);
    for(var i=0;i<k.inst.length;i++){c.copy(col).multiplyScalar(k.inst[i].v*(0.9+pi*0.06));im.setColorAt(i,c);}
    im.instanceColor.needsUpdate=true;
  });
}

/* 3D-персонаж (avatar.js); пока он грузится, на дороге стоит процедурный маг */
function avRes(){return (R&&(R.qName==='high'||R.qName==='ultra'))?'2k':'1k';}
function setLook(look,onProgress){
  if(!R)return Promise.resolve();
  if(!look||!window.Avatar||!look.body){if(look&&!look.body&&R.mage.setLook&&!R.avatar)R.mage.setLook(look);return Promise.resolve();}
  if(R.avatar)return R.avatar.setLook(look,onProgress);
  if(R.avLoading)return R.avLoading.then(function(){return R.avatar.setLook(look,onProgress);});
  R.avLoading=Avatar.init(THREE).then(function(){return Avatar.create(look,{res:avRes(),forGame:true,onProgress:onProgress});}).then(function(A){
    var old=R.mage;
    A.root.position.copy(old.root.position);A.root.rotation.copy(old.root.rotation);
    R.scene.remove(old.root);R.scene.add(A.root);
    A.root.traverse(function(o){if(o.isMesh){o.castShadow=true;}});
    R.avatar=A;R.mage=A;
    if(R.tierArgs)A.setTier(R.tierArgs[0],R.tierArgs[1]);
    return A;
  });
  return R.avLoading;
}
function setTier(t,colors){if(R){R.tierArgs=[t,colors];R.mage.setTier(t,colors);}}
/* вид: дорога или таверна сверху; mage - 'home' | 'sleep' | null (маг в походе, в таверне его нет) */
function setView(v,mage){
  if(!R)return;
  if(v==='tavern'&&!(window.Tavern3D&&Tavern3D.ready))v='road';
  if(v==='tavern'){
    if(!Tavern3D.built){Tavern3D.build(R.renderer);resize();}
    Tavern3D.setActive(true,R.renderer.domElement);
    if(mage&&R.avatar)Tavern3D.setMage(R.avatar,mage);else Tavern3D.releaseMage();
  }else if(window.Tavern3D&&Tavern3D.built){Tavern3D.setActive(false);Tavern3D.releaseMage();}
  var was=R.view;R.view=v;
  if(was!==v)resize();
}
function setFatigue(f){if(R)R.fat=f;}


/* ════════ ПРЕВЬЮ (создание персонажа, гардероб) ════════ */
function preview(canvas){
  var renderer=new THREE.WebGLRenderer({canvas:canvas,antialias:true,alpha:true});
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  var scene=new THREE.Scene();
  var cam=new THREE.PerspectiveCamera(32,1,0.1,50);cam.position.set(0,1.35,5.2);cam.lookAt(0,0.95,0);
  scene.add(new THREE.HemisphereLight(0x6080c0,0x101018,1.1));
  var dl=new THREE.DirectionalLight(0xffffff,0.9);dl.position.set(2,4,4);scene.add(dl);
  var mage=buildMage({gender:'m',robe:'#4a5068',trim:'#a0a8c0'});scene.add(mage.root);
  var base=mesh(new THREE.CylinderGeometry(0.8,0.9,0.12,32),std('#0d0d22',{m:0.4,r:0.5}),0,-0.06,0);scene.add(base);
  var ring=mesh(new THREE.TorusGeometry(0.85,0.015,6,64),new THREE.MeshBasicMaterial({color:0x00e5ff}),0,0.005,0);ring.rotation.x=Math.PI/2;scene.add(ring);
  var rot=0.6,vel=0,drag=null,alive=true,last=performance.now();
  function size(){var w=canvas.clientWidth||200,h=canvas.clientHeight||260;renderer.setSize(w,h,false);cam.aspect=w/h;cam.updateProjectionMatrix();}
  function loop(now){
    if(!alive)return;
    var dt=Math.min(0.05,(now-last)/1000);last=now;
    if(!drag){vel*=0.94;rot+=vel+dt*0.35;}
    mage.root.rotation.y=rot;
    updateMage(mage,dt,'idle',0);
    if(canvas.clientWidth&&(canvas.width!==Math.round(canvas.clientWidth*renderer.getPixelRatio())))size();
    renderer.render(scene,cam);
    requestAnimationFrame(loop);
  }
  function down(e){drag={x:e.clientX};canvas.setPointerCapture&&canvas.setPointerCapture(e.pointerId);}
  function move(e){if(!drag)return;var dx=e.clientX-drag.x;drag.x=e.clientX;rot+=dx*0.012;vel=dx*0.012;}
  function up(){drag=null;}
  canvas.addEventListener('pointerdown',down);canvas.addEventListener('pointermove',move);
  canvas.addEventListener('pointerup',up);canvas.addEventListener('pointercancel',up);
  size();requestAnimationFrame(loop);
  return {
    set:function(look){mage.setLook(look);},
    tier:function(t,c){mage.setTier(t,c);},
    dispose:function(){alive=false;canvas.removeEventListener('pointerdown',down);disposeTree(scene);renderer.dispose();}
  };
}

window.Scene3D={setQuality:function(n){setQuality(n);return R&&R.qName;},detectQuality:detectQuality,get quality(){return R&&R.qName;},supported:supported,load:load,init:init,setLook:setLook,setTier:setTier,setMode:setMode,setFatigue:setFatigue,
  setView:setView,setPet:setPet,get view(){return R?R.view||'road':'road';},spawn:spawn,bolt:bolt,kill:kill,retreat:retreat,bossWind:bossWind,onHit:onHit,petBite:petBite,victory:victory,setRage:setRage,enemyScreen:enemyScreen,mageScreen:mageScreen,hurt:hurt,setTavern:setTavern,craft:craft,portal:portal,frame:frame,preview:preview,
  get ready(){return !!R;},get _r(){return R;}};
})();
