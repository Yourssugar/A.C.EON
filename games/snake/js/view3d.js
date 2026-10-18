/* A.C.EON SNAKE: объёмное поле (three.js).
   Рисует тот же кадр scene, что и 2D (snake.js sceneOf), логика игры не меняется.

   var v = SnakeView3D(THREE, wrapEl)   null, если WebGL не создался
   v.draw(scene)    нарисовать кадр
   v.resize(px)     размер квадратного поля в пикселях
   v.show(on)       показать или спрятать холст

   Координаты: клетка 1x1, пол на y=0, клетка (x,y) поля в точке (x-9.5, 0, y-9.5).
   Камера смотрит сверху под углом с нижней стороны поля, поэтому «вверх» на экране
   остаётся «вверх» и управление то же, что в 2D. */
(function(){
'use strict';

window.SnakeView3D=function(THREE,wrap){
  var renderer;
  try{renderer=new THREE.WebGLRenderer({antialias:true,alpha:true});}catch(e){return null;}
  var GRID=20,H=GRID/2-0.5;
  renderer.setPixelRatio(Math.min(2,window.devicePixelRatio||1));
  renderer.shadowMap.enabled=true;
  renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;
  renderer.setClearColor(0x000000,0);
  var canvas=renderer.domElement;
  canvas.className='b3-canvas';
  wrap.appendChild(canvas);

  var scene=new THREE.Scene();
  var camera=new THREE.PerspectiveCamera(38,1,0.5,200);

  /* свет */
  var hemi=new THREE.HemisphereLight(0xbfe9ff,0x0a0a20,0.9);scene.add(hemi);
  var sun=new THREE.DirectionalLight(0xffffff,1.8);
  sun.position.set(-6,16,10);sun.castShadow=true;
  sun.shadow.mapSize.set(1024,1024);
  var sc=sun.shadow.camera;sc.left=-12;sc.right=12;sc.top=12;sc.bottom=-12;sc.near=1;sc.far=40;
  sun.shadow.bias=-0.0005;sun.shadow.normalBias=0.03;
  scene.add(sun);
  var rim=new THREE.DirectionalLight(0xff2d78,0.5);rim.position.set(8,6,-12);scene.add(rim);

  /* ── пол: клетки текстурой, под ним плита ── */
  function floorTexture(){
    var n=GRID*32,cv=document.createElement('canvas');cv.width=cv.height=n;
    var g=cv.getContext('2d');
    g.fillStyle='#060b1c';g.fillRect(0,0,n,n);
    for(var y=0;y<GRID;y++)for(var x=0;x<GRID;x++){
      if((x+y)%2){g.fillStyle='#08112a';g.fillRect(x*32,y*32,32,32);}
    }
    g.strokeStyle='rgba(0,229,255,.16)';g.lineWidth=2;
    for(var i=0;i<=GRID;i++){g.beginPath();g.moveTo(i*32,0);g.lineTo(i*32,n);g.stroke();g.beginPath();g.moveTo(0,i*32);g.lineTo(n,i*32);g.stroke();}
    var t=new THREE.CanvasTexture(cv);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=8;
    return t;
  }
  var floor=new THREE.Mesh(new THREE.PlaneGeometry(GRID,GRID),new THREE.MeshStandardMaterial({map:floorTexture(),roughness:.85,metalness:0}));
  floor.rotation.x=-Math.PI/2;floor.receiveShadow=true;scene.add(floor);
  var slab=new THREE.Mesh(new THREE.BoxGeometry(GRID+1.2,1,GRID+1.2),new THREE.MeshStandardMaterial({color:0x030714,roughness:.6,metalness:.3,emissive:0x00e5ff,emissiveIntensity:.04}));
  slab.position.y=-0.51;scene.add(slab);

  /* ── стены: сплошные или пунктир (через край можно пройти) ── */
  var wallMat=new THREE.MeshStandardMaterial({color:0x006a80,emissive:0x00b8d4,emissiveIntensity:.45,roughness:.35,metalness:.3});
  var wallGroup=new THREE.Group(),dashGroup=new THREE.Group();
  [[0,-H-0.65,GRID+1.3,0.3],[0,H+0.65,GRID+1.3,0.3],[-H-0.65,0,0.3,GRID+1.3],[H+0.65,0,0.3,GRID+1.3]].forEach(function(w){
    var m=new THREE.Mesh(new THREE.BoxGeometry(w[2],.5,w[3]),wallMat);m.position.set(w[0],.25,w[1]);m.castShadow=true;wallGroup.add(m);
  });
  var dashMat=new THREE.MeshStandardMaterial({color:0x00a8c0,emissive:0x00e5ff,emissiveIntensity:.5,transparent:true,opacity:.45});
  var dashGeo=new THREE.BoxGeometry(.5,.12,.5);
  for(var i=0;i<GRID;i+=2){
    [[i-H,-H-0.65],[i-H,H+0.65],[-H-0.65,i-H],[H+0.65,i-H]].forEach(function(p){
      var m=new THREE.Mesh(dashGeo,dashMat);m.position.set(p[0],.06,p[1]);dashGroup.add(m);
    });
  }
  scene.add(wallGroup);scene.add(dashGroup);

  /* ── препятствия: блоки со светящейся крышкой ── */
  var OBS_MAX=200;
  var obsMesh=new THREE.InstancedMesh(new THREE.BoxGeometry(.92,.6,.92),new THREE.MeshStandardMaterial({color:0x0a1e33,roughness:.55,metalness:.35}),OBS_MAX);
  var capMesh=new THREE.InstancedMesh(new THREE.BoxGeometry(.94,.05,.94),new THREE.MeshStandardMaterial({color:0x004a5c,emissive:0x00b8d4,emissiveIntensity:.35}),OBS_MAX);
  obsMesh.castShadow=true;obsMesh.receiveShadow=true;obsMesh.count=0;capMesh.count=0;
  scene.add(obsMesh);scene.add(capMesh);
  var obsRef=null,M4=new THREE.Matrix4();
  function setObstacles(list){
    if(list===obsRef)return;
    obsRef=list;
    var n=Math.min(OBS_MAX,list.length);
    for(var i=0;i<n;i++){
      var o=list[i];
      M4.makeTranslation(o.x-H,.3,o.y-H);obsMesh.setMatrixAt(i,M4);
      M4.makeTranslation(o.x-H,.62,o.y-H);capMesh.setMatrixAt(i,M4);
    }
    obsMesh.count=n;capMesh.count=n;
    obsMesh.instanceMatrix.needsUpdate=true;capMesh.instanceMatrix.needsUpdate=true;
  }

  /* ── змейка: цепочка шаров (по 3 на клетку), чтобы тело было сплошным ── */
  var SEG_MAX=GRID*GRID*3+8;
  var bodyMat=new THREE.MeshStandardMaterial({roughness:.3,metalness:.1,emissive:0x00606e,emissiveIntensity:.7});
  var body=new THREE.InstancedMesh(new THREE.SphereGeometry(1,18,12),bodyMat,SEG_MAX);
  body.castShadow=true;body.count=0;
  body.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  scene.add(body);
  var headMat=new THREE.MeshStandardMaterial({color:0x80f0ff,roughness:.3,emissive:0x00e5ff,emissiveIntensity:.35});
  var head=new THREE.Mesh(new THREE.SphereGeometry(.5,24,16),headMat);head.castShadow=true;scene.add(head);
  var eyeW=new THREE.MeshBasicMaterial({color:0xffffff}),eyeB=new THREE.MeshBasicMaterial({color:0x050510});
  var eyes=[0,1].map(function(){
    var g=new THREE.Group();
    var w=new THREE.Mesh(new THREE.SphereGeometry(.12,12,10),eyeW);
    var p=new THREE.Mesh(new THREE.SphereGeometry(.065,10,8),eyeB);p.position.z=.08;
    g.add(w);g.add(p);head.add(g);return g;
  });
  var C1=new THREE.Color(0x00d8f0),C2=new THREE.Color(0x00566e),CD=new THREE.Color(0xff3344),CC=new THREE.Color(0x00ff88),CT=new THREE.Color();
  var Q=new THREE.Quaternion(),V=new THREE.Vector3(),SV=new THREE.Vector3();

  /* ── еда и бонусы ── */
  var food=new THREE.Mesh(new THREE.IcosahedronGeometry(.36,0),new THREE.MeshStandardMaterial({color:0xff2d78,emissive:0xff2d78,emissiveIntensity:.9,roughness:.3,flatShading:true}));
  food.castShadow=true;scene.add(food);
  var foodLight=new THREE.PointLight(0xff2d78,2.2,5,1.6);scene.add(foodLight);
  var BCOL={gold:0xffd23a,slow:0x4fb8ff,cut:0xff8800,ghost:0xd6c4ff};
  var bonusGeo={gold:new THREE.OctahedronGeometry(.34,0),slow:new THREE.TorusGeometry(.24,.09,10,20),cut:new THREE.TetrahedronGeometry(.36,0),ghost:new THREE.SphereGeometry(.3,16,12)};
  var bonusMat=new THREE.MeshStandardMaterial({color:0xffffff,emissive:0xffd23a,emissiveIntensity:1.1,roughness:.25,flatShading:true,transparent:true});
  var bonus=new THREE.Mesh(bonusGeo.gold,bonusMat);bonus.castShadow=true;scene.add(bonus);
  var ringGeo=new THREE.RingGeometry(.42,.5,32);ringGeo.rotateX(-Math.PI/2);
  var bonusRing=new THREE.Mesh(ringGeo,new THREE.MeshBasicMaterial({color:0xffd23a,transparent:true,opacity:.6,depthWrite:false}));
  scene.add(bonusRing);

  /* ── вспышки: кольцо на полу и надпись над клеткой ── */
  var fxPool=[];
  for(i=0;i<6;i++){
    var ring=new THREE.Mesh(ringGeo,new THREE.MeshBasicMaterial({color:0xff2d78,transparent:true,depthWrite:false}));
    ring.visible=false;scene.add(ring);
    var spr=new THREE.Sprite(new THREE.SpriteMaterial({transparent:true,depthWrite:false}));
    spr.visible=false;scene.add(spr);
    fxPool.push({ring:ring,spr:spr});
  }
  var texCache={};
  function textTex(txt,col){
    var k=txt+col;if(texCache[k])return texCache[k];
    var cv=document.createElement('canvas');cv.width=256;cv.height=64;
    var g=cv.getContext('2d');
    g.font='32px "Press Start 2P",monospace';g.textAlign='center';g.textBaseline='middle';
    g.shadowColor=col;g.shadowBlur=12;g.fillStyle='#ffffff';g.fillText(txt,128,34);
    var t=new THREE.CanvasTexture(cv);t.colorSpace=THREE.SRGBColorSpace;
    return (texCache[k]=t);
  }

  /* ── камера: вид сверху под углом, поле с бортами целиком в кадре ── */
  var TILT=0.5,fit={R:30,shift:0};
  var PTS=[];
  [-1,1].forEach(function(a){[-1,1].forEach(function(b){PTS.push([a*(H+1.1),0,b*(H+1.1)],[a*(H+1.1),.6,b*(H+1.1)],[a*(H+1.1),-1,b*(H+1.1)]);});});
  function place(R){
    camera.position.set(0,R*Math.cos(TILT),R*Math.sin(TILT));
    camera.lookAt(0,0,0);camera.updateMatrixWorld();
  }
  function computeFit(){
    camera.aspect=1;camera.updateProjectionMatrix();
    var lo=8,hi=120,b;
    function box(R){
      place(R);var v=new THREE.Vector3(),o={y0:9,y1:-9,x0:9,x1:-9};
      PTS.forEach(function(p){v.set(p[0],p[1],p[2]).project(camera);o.x0=Math.min(o.x0,v.x);o.x1=Math.max(o.x1,v.x);o.y0=Math.min(o.y0,v.y);o.y1=Math.max(o.y1,v.y);});
      return o;
    }
    for(var i=0;i<26;i++){var mid=(lo+hi)/2;b=box(mid);if(b.x1-b.x0<=1.94&&b.y1-b.y0<=1.94)hi=mid;else lo=mid;}
    b=box(hi);fit.R=hi;fit.shift=(b.y0+b.y1)/2;
  }
  function placeCamera(shake){
    place(fit.R);
    if(shake){camera.position.x+=(Math.random()-.5)*shake;camera.position.y+=(Math.random()-.5)*shake;}
    camera.updateProjectionMatrix();
    camera.projectionMatrix.elements[9]+=fit.shift;   // сдвиг кадра, чтобы поле было по центру
    camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();
  }
  computeFit();

  /* ════════ кадр ════════ */
  function draw(s){
    var now=s.now;
    wallGroup.visible=!!s.walls;dashGroup.visible=!s.walls;
    setObstacles(s.obs||[]);
    hemi.color.setHex(s.slow>0?0x9fc8ff:0xbfe9ff);

    /* тело: между соседними точками три шара, на краю поля (переход насквозь) без перемычки */
    var pts=s.pts,n=pts.length,k=0,dead=s.dead,ghost=s.ghost>0;
    bodyMat.transparent=ghost;bodyMat.opacity=ghost?.45+.15*Math.sin(now/90):1;
    headMat.transparent=ghost;headMat.opacity=bodyMat.opacity;
    for(var j=n-1;j>=1;j--){
      var a=pts[j],b=pts[j-1];
      var jump=Math.abs(a.x-b.x)>1.5||Math.abs(a.y-b.y)>1.5;
      for(var u=0;u<3;u++){
        if(jump&&u>0)break;
        var f=u/3,x=a.x+(b.x-a.x)*f,y=a.y+(b.y-a.y)*f;
        var q=(j-f)/Math.max(1,n-1),r=.42-.13*q;
        V.set(x-H,r,y-H);SV.set(r,r,r);
        M4.compose(V,Q,SV);
        if(k<SEG_MAX){
          body.setMatrixAt(k,M4);
          if(dead)CT.copy(CD);else if(s.clear)CT.copy(CC);else CT.copy(C1).lerp(C2,q);
          body.setColorAt(k,CT);k++;
        }
      }
    }
    body.count=k;body.instanceMatrix.needsUpdate=true;if(body.instanceColor)body.instanceColor.needsUpdate=true;
    if(n){
      var hp=pts[0];
      head.visible=true;
      head.position.set(hp.x-H,.5,hp.y-H);
      head.rotation.set(0,Math.atan2(s.dir.x,s.dir.y),0);   // смотрит по направлению движения
      headMat.color.setHex(dead?0xff3344:s.clear?0x00ff88:0x80f0ff);
      headMat.emissive.setHex(dead?0x661018:s.clear?0x00aa55:0x00e5ff);
      eyes[0].position.set(.19,.16,.36);eyes[1].position.set(-.19,.16,.36);
      eyes.forEach(function(e){e.scale.setScalar(dead?.6:1);});
    }else head.visible=false;

    /* еда парит и вращается */
    if(s.food){
      food.visible=true;foodLight.visible=true;
      var fs=Math.max(.01,s.foodAge);
      food.scale.setScalar(fs);
      food.position.set(s.food.x-H,.45+.08*Math.sin(now/260),s.food.y-H);
      food.rotation.set(now/900,now/700,0);
      foodLight.position.set(s.food.x-H,.9,s.food.y-H);
    }else{food.visible=false;foodLight.visible=false;}

    /* бонус: своя фигура и цвет, кольцо на полу сжимается по оставшемуся времени */
    if(s.bonus){
      var bt=s.bonus.type,blink=s.bonus.life<.3&&Math.sin(now/60)>0;
      bonus.visible=!blink;bonusRing.visible=true;
      bonus.geometry=bonusGeo[bt];
      bonusMat.emissive.setHex(BCOL[bt]);bonusMat.color.setHex(BCOL[bt]);
      bonusMat.opacity=bt==='ghost'?.6:1;
      bonus.position.set(s.bonus.x-H,.55+.1*Math.sin(now/200),s.bonus.y-H);bonus.scale.setScalar(1.35);
      bonus.rotation.set(bt==='slow'?Math.PI/2*0:0,now/500,bt==='slow'?0:now/800);
      bonusRing.material.color.setHex(BCOL[bt]);
      bonusRing.position.set(s.bonus.x-H,.02,s.bonus.y-H);
      bonusRing.scale.setScalar(.4+.9*s.bonus.life);
    }else{bonus.visible=false;bonusRing.visible=false;}

    /* вспышки */
    fxPool.forEach(function(p,i){
      var fx=s.eatFx[i];
      if(!fx){p.ring.visible=false;p.spr.visible=false;return;}
      p.ring.visible=true;p.spr.visible=true;
      p.ring.position.set(fx.x-H,.03,fx.y-H);p.ring.scale.setScalar(1+fx.e*2.2);
      p.ring.material.color.set(fx.c);p.ring.material.opacity=1-fx.e;
      p.spr.material.map=textTex(fx.txt,fx.c);p.spr.material.opacity=1-fx.e;p.spr.material.needsUpdate=true;
      p.spr.position.set(fx.x-H,1+fx.e*1.2,fx.y-H);p.spr.scale.set(3,.75,1);
    });

    placeCamera(s.shake>0?s.shake*.35:0);
    renderer.render(scene,camera);
  }

  function resize(px){
    renderer.setSize(px,px,false);
    canvas.style.width=px+'px';canvas.style.height=px+'px';
    computeFit();
  }
  function show(on){canvas.style.display=on?'block':'none';}

  return {draw:draw,resize:resize,show:show};
};
})();
