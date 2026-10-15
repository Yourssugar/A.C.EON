/* A.C.EON CHESS: доска в 3D (three.js, грузится только при включении 3D).

   Интерфейс тот же, что у Board2D (draw, squareAt, cellSize, lift, over, el), плюс:
   Board3D.load(onProgress)       скачать three.js один раз, Promise
   Board3D.supported()            есть ли WebGL
   view.dragStart(r,c)            фигуру взяли пальцем
   view.dragMove(x,y)             фигура едет за пальцем над доской
   view.dragEnd()
   view.orbitStart(e) / orbitMove(e) / orbitEnd()   поворот и наклон камеры пальцем или мышью
   view.resetCamera()             камера обратно на сторону игрока
   view.show(on)                  показать или спрятать (рендер на паузе)
   view.gesturing()               идёт жест двумя пальцами

   Координаты: клетка 1x1, верх доски на y=0, клетка (r,c) в точке x=c-3.5, z=r-3.5.
   Белые (r=7) ближе к камере при азимуте 0. Камера не опускается ниже доски:
   наклон ограничен, поэтому доска всегда видна сверху и фигуры не уходят под неё. */
(function(){
'use strict';

var THREE=null,loading=null;
var THREE_KB=655;   // размер three.module.min.js для прогресса, если сервер не прислал длину

function supported(){
  try{var c=document.createElement('canvas');return !!(window.WebGLRenderingContext&&(c.getContext('webgl2')||c.getContext('webgl')));}
  catch(e){return false;}
}

/* скачать three.js с прогрессом, потом подключить как модуль */
function load(onProgress){
  if(THREE)return Promise.resolve(THREE);
  if(loading)return loading;
  var url=Boot.url('three/three.module.min.js');
  function progress(p){if(onProgress)try{onProgress(Math.max(0,Math.min(1,p)));}catch(e){}}
  loading=fetch(url).then(function(res){
    if(!res.ok)throw new Error('HTTP '+res.status);
    var total=parseInt(res.headers.get('content-length'),10);
    if(!total||total<THREE_KB*1024*0.8)total=THREE_KB*1024;   // при gzip длина сжатая, считаем по известному размеру
    if(!res.body||!res.body.getReader)return res.text();
    var reader=res.body.getReader(),got=0,chunks=[];
    function pump(){
      return reader.read().then(function(x){
        if(x.done)return new Blob(chunks).text();
        chunks.push(x.value);got+=x.value.length;progress(got/total);
        return pump();
      });
    }
    return pump();
  }).then(function(src){
    var blob=URL.createObjectURL(new Blob([src],{type:'text/javascript'}));
    return import(blob).then(function(m){URL.revokeObjectURL(blob);return m;});
  }).catch(function(){
    return import(url);      // запасной путь: обычный импорт без прогресса
  }).then(function(m){THREE=m;progress(1);return m;},function(err){loading=null;throw err;});
  return loading;
}

/* ════════ фигуры ════════ */
var GEO=null;

function v2(p){return new THREE.Vector2(p[0],p[1]);}
/* дуга эллипса для головок: углы в градусах от -90 (низ) до 90 (верх) */
function arc(cy,rx,ry,a0,a1,n){
  var out=[];
  for(var i=0;i<=n;i++){
    var a=(a0+(a1-a0)*i/n)*Math.PI/180;
    out.push([Math.max(0,rx*Math.cos(a)),cy+ry*Math.sin(a)]);
  }
  out[out.length-1][0]=0;
  return out;
}
function lathe(pts){return new THREE.LatheGeometry(pts.map(v2),40);}

/* склеить несколько геометрий в одну: одна сетка на фигуру */
function merge(parts){
  var pos=[],nor=[];
  parts.forEach(function(g){
    var ng=g.index?g.toNonIndexed():g;
    if(!ng.attributes.normal)ng.computeVertexNormals();
    var p=ng.attributes.position.array,n=ng.attributes.normal.array;
    for(var i=0;i<p.length;i++){pos.push(p[i]);nor.push(n[i]);}
  });
  var out=new THREE.BufferGeometry();
  out.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));
  out.setAttribute('normal',new THREE.Float32BufferAttribute(nor,3));
  out.computeBoundingSphere();
  return out;
}
function at(g,x,y,z,ry){
  if(ry)g.rotateY(ry);
  g.translate(x,y,z);
  return g;
}
/* общая подставка всех фигур */
function base(r,top){
  return [[0,0],[r,0],[r,.05],[r-.03,.08],[r-.04,.11],[r-.10,.15],[top,.20]];
}

function buildGeometry(){
  var G={};
  /* пешка */
  G.P=merge([lathe(base(.33,.19).concat([[.15,.30],[.12,.37],[.19,.40],[.19,.43],[.11,.46]]).concat(arc(.57,.14,.14,-50,90,14)))]);

  /* ладья: башня и четыре зубца */
  var rook=[lathe(base(.35,.22).concat([[.20,.40],[.20,.57],[.26,.61],[.27,.64],[.27,.73],[.19,.73],[.19,.68],[0,.68]]))];
  for(var i=0;i<4;i++){
    var a=i*Math.PI/2+Math.PI/4;
    rook.push(at(new THREE.BoxGeometry(.13,.11,.08),Math.cos(a)*.23,.785,Math.sin(a)*.23,-a+Math.PI/2));
  }
  G.R=merge(rook);

  /* конь: подставка и голова (профиль, смотрит по +x, вытянут по z) */
  var s=new THREE.Shape();
  s.moveTo(-.20,.24);
  s.lineTo(.19,.24);
  s.quadraticCurveTo(.09,.40,.15,.50);
  s.lineTo(.29,.58);
  s.quadraticCurveTo(.36,.62,.33,.69);
  s.lineTo(.27,.74);
  s.quadraticCurveTo(.15,.75,.08,.83);
  s.lineTo(.07,.96);
  s.lineTo(-.03,.87);
  s.quadraticCurveTo(-.22,.84,-.26,.62);
  s.quadraticCurveTo(-.28,.40,-.20,.24);
  var head=new THREE.ExtrudeGeometry(s,{depth:.16,bevelEnabled:true,bevelThickness:.05,bevelSize:.035,bevelSegments:3,curveSegments:8});
  head.translate(0,0,-.08);
  G.N=merge([lathe(base(.34,.22).concat([[.23,.24],[.26,.26],[.26,.29],[0,.29]])),head]);

  /* слон */
  G.B=merge([
    lathe(base(.33,.19).concat([[.15,.40],[.12,.52],[.20,.56],[.20,.59],[.11,.62]]).concat(arc(.77,.15,.17,-62,90,16))),
    at(new THREE.SphereGeometry(.055,16,12),0,.99,0)
  ]);

  /* ферзь: корона из шариков */
  var queen=[lathe(base(.36,.22).concat([[.17,.45],[.13,.70],[.21,.74],[.21,.77],[.14,.80],[.17,.86],[.23,.97],[.18,.985],[.10,.95],[0,.97]])),
             at(new THREE.SphereGeometry(.075,16,12),0,1.04,0)];
  for(var q=0;q<8;q++){var b=q*Math.PI/4;queen.push(at(new THREE.SphereGeometry(.042,10,8),Math.cos(b)*.205,.99,Math.sin(b)*.205));}
  G.Q=merge(queen);

  /* король: крест сверху */
  G.K=merge([
    lathe(base(.36,.22).concat([[.17,.47],[.14,.74],[.22,.78],[.22,.81],[.15,.84],[.20,.98],[.20,1.02],[.12,1.04],[0,1.04]])),
    at(new THREE.BoxGeometry(.075,.28,.075),0,1.17,0),
    at(new THREE.BoxGeometry(.22,.075,.075),0,1.20,0)
  ]);
  return G;
}

/* ════════ текстура доски: клетки, рамка, буквы и цифры ════════ */
var SIZE=9.2,MARGIN=(SIZE-8)/2;

function rnd(seed){return function(){seed=(seed*16807)%2147483647;return (seed-1)/2147483646;};}

function boardTexture(theme){
  var px=1024,k=px/SIZE,cv=document.createElement('canvas');cv.width=cv.height=px;
  var g=cv.getContext('2d'),R=rnd(7);
  var wood=theme==='wood';
  /* рамка */
  g.fillStyle=wood?'#4a2e1b':'#040a14';g.fillRect(0,0,px,px);
  if(wood){
    for(var i=0;i<260;i++){
      g.strokeStyle='rgba('+(R()<.5?'20,10,4':'120,80,46')+','+(.08+R()*.12)+')';
      g.lineWidth=1+R()*2;g.beginPath();
      var y=R()*px;g.moveTo(0,y);g.bezierCurveTo(px*.3,y+R()*10-5,px*.7,y+R()*10-5,px,y+R()*8-4);g.stroke();
    }
  }
  /* клетки */
  var x0=MARGIN*k,sq=k;
  for(var r=0;r<8;r++)for(var c=0;c<8;c++){
    var light=(r+c)%2===0,x=x0+c*sq,yy=x0+r*sq;
    if(wood){
      g.fillStyle=light?'#e6cf9d':'#9b6a40';g.fillRect(x,yy,sq,sq);
      /* волокна: в соседних клетках поперёк, как в наборной доске */
      g.save();g.beginPath();g.rect(x,yy,sq,sq);g.clip();
      var across=(r+c)%2===0;
      for(var j=0;j<18;j++){
        g.strokeStyle=light?'rgba(150,105,55,'+(.10+R()*.18)+')':'rgba(60,32,12,'+(.12+R()*.2)+')';
        g.lineWidth=.6+R()*1.6;g.beginPath();
        var o=R()*sq,w=R()*6-3;
        if(across){g.moveTo(x,yy+o);g.quadraticCurveTo(x+sq/2,yy+o+w,x+sq,yy+o);}
        else{g.moveTo(x+o,yy);g.quadraticCurveTo(x+o+w,yy+sq/2,x+o,yy+sq);}
        g.stroke();
      }
      g.restore();
    }else{
      g.fillStyle=light?'#122640':'#060d1c';g.fillRect(x,yy,sq,sq);
      g.strokeStyle='rgba(0,229,255,.22)';g.lineWidth=2;g.strokeRect(x+1,yy+1,sq-2,sq-2);
    }
  }
  /* кромка вокруг клеток */
  g.lineWidth=wood?5:4;
  g.strokeStyle=wood?'#2a180c':'#00e5ff';
  if(!wood){g.shadowColor='#00e5ff';g.shadowBlur=16;}
  g.strokeRect(x0-3,x0-3,8*sq+6,8*sq+6);
  g.shadowBlur=0;
  /* подписи: снизу и слева для белых, сверху и справа перевёрнутые для чёрных */
  var font=Math.round(k*.24)+'px "Press Start 2P",monospace';
  g.font=font;g.textAlign='center';g.textBaseline='middle';
  g.fillStyle=wood?'#e9cf9a':'#00e5ff';
  var m=MARGIN*k/2+2;
  for(var f=0;f<8;f++){
    var cx=x0+f*sq+sq/2,cy=x0+(7-f)*sq+sq/2,L='abcdefgh'[f],N=String(8-f);
    g.fillText(L,cx,px-m);
    g.fillText(String(f+1),m,cy);
    g.save();g.translate(cx,m);g.rotate(Math.PI);g.fillText(L,0,0);g.restore();
    g.save();g.translate(px-m,x0+f*sq+sq/2);g.rotate(Math.PI);g.fillText(N,0,0);g.restore();
  }
  var tex=new THREE.CanvasTexture(cv);
  tex.colorSpace=THREE.SRGBColorSpace;tex.anisotropy=8;
  return tex;
}

/* ════════ материалы по темам ════════ */
function themeMaterials(theme){
  var wood=theme==='wood';
  return {
    w:new THREE.MeshStandardMaterial(wood?{color:0xf1e3c2,roughness:.42,metalness:0}
      :{color:0xcff8ff,emissive:0x00b8d4,emissiveIntensity:.35,roughness:.25,metalness:.35}),
    b:new THREE.MeshStandardMaterial(wood?{color:0x2b201a,roughness:.32,metalness:.05}
      :{color:0x1c0718,emissive:0xff2d78,emissiveIntensity:.55,roughness:.3,metalness:.45}),
    side:new THREE.MeshStandardMaterial(wood?{color:0x3e2616,roughness:.55}:{color:0x030812,emissive:0x00e5ff,emissiveIntensity:.08,roughness:.4,metalness:.3}),
    spark:wood?0xffc861:0xff2d78
  };
}

/* цвета подсветки клеток */
var COL={sel:0x00e5ff,lastH:0x00e5ff,lastA:0xff2d78,check:0xff3344,coach:0xb18cff,hint:0x00e5ff,over:0x00ff88};

function ease(k){return k<.5?4*k*k*k:1-Math.pow(-2*k+2,3)/2;}

/* ════════ доска ════════ */
function Board3D(el,opts){
  opts=opts||{};
  var renderer;
  try{renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:'high-performance'});}
  catch(e){return null;}
  if(!GEO)GEO=buildGeometry();
  renderer.setPixelRatio(Math.min(2,window.devicePixelRatio||1));
  renderer.shadowMap.enabled=true;
  renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;
  renderer.setClearColor(0x000000,0);
  var canvas=renderer.domElement;
  canvas.className='b3-canvas';
  el.appendChild(canvas);

  var scene=new THREE.Scene();
  var camera=new THREE.PerspectiveCamera(36,1,0.1,200);

  /* свет: небо и пол, основной с тенями, контровой */
  var hemi=new THREE.HemisphereLight(0xdfefff,0x2a1a0e,1.1);scene.add(hemi);
  var sun=new THREE.DirectionalLight(0xffffff,2.4);
  sun.position.set(4,11,7);sun.castShadow=true;
  sun.shadow.mapSize.set(1024,1024);
  var sc=sun.shadow.camera;sc.left=-6;sc.right=6;sc.top=6;sc.bottom=-6;sc.near=1;sc.far=30;
  sun.shadow.bias=-0.0004;sun.shadow.normalBias=0.02;
  scene.add(sun);
  var rim=new THREE.DirectionalLight(0x9fe8ff,0.8);rim.position.set(-6,5,-8);scene.add(rim);

  /* доска: один брусок, сверху текстура с клетками и рамкой */
  var theme=null,M=null,tex=null;
  var topMat=new THREE.MeshStandardMaterial({roughness:.55,metalness:0});
  var boardMesh=new THREE.Mesh(new THREE.BoxGeometry(SIZE,.5,SIZE),[null,null,topMat,null,null,null]);
  boardMesh.position.y=-.25;boardMesh.receiveShadow=true;
  scene.add(boardMesh);

  /* подсветка клеток: 64 плоскости и метки ходов */
  var planeGeo=new THREE.PlaneGeometry(1,1);planeGeo.rotateX(-Math.PI/2);
  var discGeo=new THREE.CircleGeometry(.15,28);discGeo.rotateX(-Math.PI/2);
  var ringGeo=new THREE.RingGeometry(.37,.46,40);ringGeo.rotateX(-Math.PI/2);
  var marks=[],dots=[];
  for(var i=0;i<64;i++){
    var r=i>>3,c=i&7;
    var mm=new THREE.Mesh(planeGeo,new THREE.MeshBasicMaterial({transparent:true,opacity:.4,depthWrite:false,color:0xffffff}));
    mm.position.set(c-3.5,.004,r-3.5);mm.visible=false;mm.renderOrder=1;scene.add(mm);marks.push(mm);
    var dm=new THREE.Mesh(discGeo,new THREE.MeshBasicMaterial({transparent:true,opacity:.8,depthWrite:false,color:COL.hint}));
    dm.position.set(c-3.5,.008,r-3.5);dm.visible=false;dm.renderOrder=2;scene.add(dm);dots.push(dm);
  }

  function setTheme(th){
    if(th===theme)return;
    theme=th;
    var old=M;M=themeMaterials(th);
    if(tex)tex.dispose();
    tex=boardTexture(th);topMat.map=tex;topMat.roughness=th==='wood'?.5:.7;topMat.needsUpdate=true;
    boardMesh.material=[M.side,M.side,topMat,M.side,M.side,M.side];
    hemi.intensity=th==='wood'?1.1:.7;
    rim.color.set(th==='wood'?0xfff1d6:0x00e5ff);rim.intensity=th==='wood'?.6:1.4;
    pieces.forEach(function(e){if(e)e.mesh.material=M[e.code[0]];});
    if(old){old.w.dispose();old.b.dispose();old.side.dispose();}
    kick();
  }

  /* ── фигуры ── */
  var pieces=new Array(64);   // клетка -> {code, mesh, sq, rest}
  var dying=[];               // взятые фигуры и искры, пока доигрывают анимацию
  function makePiece(code){
    var m=new THREE.Mesh(GEO[code[1]],M[code[0]]);
    m.castShadow=true;m.receiveShadow=true;
    m.rotation.y=knightTurn(code);   // конь смотрит вперёд и вбок, чтобы с места игрока был виден профиль
    scene.add(m);
    var e={code:code,mesh:m,sq:-1,rest:0,tween:null};
    m.userData.e=e;
    return e;
  }
  function setType(e,code){
    e.code=code;e.mesh.geometry=GEO[code[1]];e.mesh.material=M[code[0]];
    e.mesh.rotation.y=knightTurn(code);
  }
  function knightTurn(code){return code[1]!=='N'?0:code[0]==='w'?Math.PI*.3:Math.PI*1.3;}
  function sqPos(sq){return {x:(sq&7)-3.5,z:(sq>>3)-3.5};}

  /* ── анимации ── */
  var tweens=[],raf=0,visible=true,needs=true,pulse=false;
  function tween(dur,fn,done){var t={t0:performance.now(),dur:dur,fn:fn,done:done};tweens.push(t);kick();return t;}
  function kick(){needs=true;if(!raf&&visible)raf=requestAnimationFrame(frame);}
  function frame(now){
    raf=0;
    for(var i=tweens.length-1;i>=0;i--){
      var t=tweens[i],k=Math.min(1,(now-t.t0)/t.dur);
      if(!t.dead)t.fn(k);
      if(k>=1||t.dead){tweens.splice(i,1);if(!t.dead&&t.done)t.done();}
    }
    stepDying(now);
    if(cam.anim)stepCam(now);
    if(pulse){var a=.35+.25*Math.sin(now/180);marks[checkSq].material.opacity=a;}
    if(needs||tweens.length||dying.length||cam.anim||pulse){
      renderer.render(scene,camera);needs=false;
    }
    if(visible&&(tweens.length||dying.length||cam.anim||pulse))raf=requestAnimationFrame(frame);
  }

  /* перенести фигуру: дугой (конь прыгает выше), за время по расстоянию */
  function moveTo(e,sq,opt){
    opt=opt||{};
    var m=e.mesh,p=sqPos(sq);
    var x0=m.position.x,y0=m.position.y,z0=m.position.z;
    var y1=e.rest,dist=Math.hypot(p.x-x0,p.z-z0);
    e.sq=sq;
    if(e.tween)e.tween.dead=true;
    if(opt.snap||dist<1e-3&&Math.abs(y0-y1)<1e-3){m.position.set(p.x,y1,p.z);e.tween=null;if(opt.done)opt.done();kick();return;}
    var h=dist<.01?0:(e.code[1]==='N'&&opt.arc?.85:Math.min(.5,.12+.06*dist));
    var dur=dist<.01?140:Math.min(560,240+50*dist);
    e.tween=tween(dur,function(k){
      var q=ease(k);
      m.position.set(x0+(p.x-x0)*q,y0+(y1-y0)*q+h*4*q*(1-q),z0+(p.z-z0)*q);
    },function(){e.tween=null;if(opt.done)opt.done();});
  }

  /* взятая фигура подпрыгивает, крутится и тает; искры падают на доску и гаснут */
  function capture(e){
    var m=e.mesh;
    var mat=m.material.clone();mat.transparent=true;m.material=mat;
    var x=m.position.x,z=m.position.z,t0=performance.now();
    dying.push({t0:t0,dur:520,fn:function(k){
      m.position.y=.9*k*(1-k)*2+.05;m.rotation.y+=.25;m.rotation.z=k*1.2;
      var s=1-k*.9;m.scale.set(s,s,s);mat.opacity=1-k;
    },end:function(){scene.remove(m);mat.dispose();}});
    var n=reduced()?0:22;
    var geo=new THREE.BoxGeometry(.06,.06,.06);
    var smat=new THREE.MeshBasicMaterial({color:M.spark,transparent:true});
    var parts=[];
    for(var i=0;i<n;i++){
      var p=new THREE.Mesh(geo,smat);
      var a=Math.random()*Math.PI*2,sp=1.2+Math.random()*2.2;
      p.position.set(x,.35,z);
      p.userData.v=[Math.cos(a)*sp,2.5+Math.random()*3,Math.sin(a)*sp];
      scene.add(p);parts.push(p);
    }
    var last=t0;
    if(n)dying.push({t0:t0,dur:1000,fn:function(k,now){
      var dt=Math.min(.05,(now-last)/1000);last=now;
      parts.forEach(function(p){
        var v=p.userData.v;v[1]-=9.8*dt;
        p.position.x+=v[0]*dt;p.position.y+=v[1]*dt;p.position.z+=v[2]*dt;
        if(p.position.y<.03){p.position.y=.03;v[1]*=-.35;v[0]*=.6;v[2]*=.6;}   // искры отскакивают от доски, не проваливаются
        p.rotation.x+=.2;p.rotation.y+=.15;
      });
      smat.opacity=1-k*k;
    },end:function(){parts.forEach(function(p){scene.remove(p);});geo.dispose();smat.dispose();}});
    kick();
  }
  function fadeOut(e){
    var m=e.mesh,mat=m.material.clone();mat.transparent=true;m.material=mat;
    dying.push({t0:performance.now(),dur:200,fn:function(k){mat.opacity=1-k;},end:function(){scene.remove(m);mat.dispose();}});
    kick();
  }
  function fadeIn(e){
    var m=e.mesh;m.scale.set(.01,.01,.01);
    tween(260,function(k){var s=Math.max(.01,ease(k));m.scale.set(s,s,s);});
  }
  function stepDying(now){
    for(var i=dying.length-1;i>=0;i--){
      var d=dying[i],k=Math.min(1,(now-d.t0)/d.dur);
      d.fn(k,now);
      if(k>=1){dying.splice(i,1);d.end();}
    }
  }
  function reduced(){return window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;}

  /* ── камера: азимут, наклон от вертикали, расстояние ── */
  var PHI_MIN=.12,PHI_MAX=1.2,PHI_DEF=.78;
  function phiDef(){return (el.clientWidth||800)<600?.62:.78;}   // на телефоне доска круче к экрану: так она крупнее
  var cam={theta:0,phi:PHI_DEF,zoom:1,anim:null,side:null,touched:false};
  /* расстояние камеры и сдвиг кадра подбираются под размер окна при обычном наклоне:
     доска с фигурами целиком в кадре и по центру. Дальше расстояние меняет только щипок или колесо. */
  var fit={R:16,shift:0};
  var FIT_PTS=[];
  [-1,1].forEach(function(a){[-1,1].forEach(function(b){
    FIT_PTS.push([a*SIZE/2,0,b*SIZE/2],[a*SIZE/2,-.5,b*SIZE/2],[a*3.5,1.3,b*3.5]);
  });});
  function project(R,theta,phi){
    var s=Math.sin(phi);
    camera.position.set(R*s*Math.sin(theta),R*Math.cos(phi),R*s*Math.cos(theta));
    camera.lookAt(0,0,0);camera.updateMatrixWorld();
    var v=new THREE.Vector3(),b={x0:9,x1:-9,y0:9,y1:-9};
    FIT_PTS.forEach(function(p){
      v.set(p[0],p[1],p[2]).project(camera);
      b.x0=Math.min(b.x0,v.x);b.x1=Math.max(b.x1,v.x);b.y0=Math.min(b.y0,v.y);b.y1=Math.max(b.y1,v.y);
    });
    return b;
  }
  function computeFit(){
    camera.clearViewOffset();camera.updateProjectionMatrix();
    var lo=4,hi=60;PHI_DEF=phiDef();
    for(var i=0;i<24;i++){
      var mid=(lo+hi)/2,b=project(mid,0,PHI_DEF);
      if(b.x1-b.x0<=1.9&&b.y1-b.y0<=1.86)hi=mid;else lo=mid;
    }
    var bb=project(hi,0,PHI_DEF);
    fit.R=hi;fit.shift=(bb.y0+bb.y1)/2;   // доска в кадре ниже центра: сдвигаем кадр
  }
  function placeCamera(){
    var R=fit.R*cam.zoom,s=Math.sin(cam.phi);
    camera.position.set(R*s*Math.sin(cam.theta),R*Math.cos(cam.phi),R*s*Math.cos(cam.theta));
    camera.lookAt(0,0,0);
    camera.updateProjectionMatrix();
    camera.projectionMatrix.elements[9]+=fit.shift;   // сдвиг кадра по вертикали без поворота камеры
    camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();
    needs=true;
  }
  function animCam(theta,phi,zoom){
    var d=theta-cam.theta;d=Math.atan2(Math.sin(d),Math.cos(d));   // короткий путь
    cam.anim={t0:performance.now(),dur:reduced()?1:750,from:[cam.theta,cam.phi,cam.zoom],to:[cam.theta+d,phi,zoom]};
    kick();
  }
  function stepCam(now){
    var a=cam.anim,k=Math.min(1,(now-a.t0)/a.dur),q=ease(k);
    cam.theta=a.from[0]+(a.to[0]-a.from[0])*q;
    cam.phi=a.from[1]+(a.to[1]-a.from[1])*q;
    cam.zoom=a.from[2]+(a.to[2]-a.from[2])*q;
    placeCamera();
    if(k>=1)cam.anim=null;
  }
  function sideTheta(flip){return flip?Math.PI:0;}
  function resetCamera(){cam.touched=false;animCam(sideTheta(cam.side),PHI_DEF,1);}

  /* поворот пальцем: влево-вправо азимут, вверх-вниз наклон */
  var orbit=null;
  function orbitStart(e){
    if(pinch)return;
    cam.anim=null;cam.touched=true;
    orbit={x:e.clientX,y:e.clientY,id:e.pointerId};
    try{canvas.setPointerCapture(e.pointerId);}catch(err){}
    el.classList.add('orbiting');
  }
  function orbitMove(e){
    if(!orbit||pinch||e.pointerId!==orbit.id)return;
    var dx=e.clientX-orbit.x,dy=e.clientY-orbit.y;orbit.x=e.clientX;orbit.y=e.clientY;
    var h=el.clientHeight||400;
    cam.theta-=dx/h*Math.PI;
    cam.phi=Math.max(PHI_MIN,Math.min(PHI_MAX,cam.phi-dy/h*2));
    placeCamera();kick();
  }
  function orbitEnd(){orbit=null;el.classList.remove('orbiting');}

  /* два пальца: щипок меняет расстояние, сдвиг поворачивает */
  var touches={},pinch=null;
  function tCount(){return Object.keys(touches).length;}
  canvas.addEventListener('pointerdown',function(e){
    touches[e.pointerId]={x:e.clientX,y:e.clientY};
    if(tCount()===2){
      orbit=null;
      var p=Object.keys(touches).map(function(k){return touches[k];});
      pinch={d:Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y),mx:(p[0].x+p[1].x)/2,my:(p[0].y+p[1].y)/2,zoom:cam.zoom};
      cam.anim=null;cam.touched=true;
      if(opts.onGesture)opts.onGesture();
    }
  });
  canvas.addEventListener('pointermove',function(e){
    if(!touches[e.pointerId])return;
    touches[e.pointerId]={x:e.clientX,y:e.clientY};
    if(!pinch||tCount()<2)return;
    var p=Object.keys(touches).map(function(k){return touches[k];});
    var d=Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y),mx=(p[0].x+p[1].x)/2,my=(p[0].y+p[1].y)/2;
    var h=el.clientHeight||400;
    cam.zoom=Math.max(.55,Math.min(1.6,pinch.zoom*pinch.d/Math.max(20,d)));
    cam.theta-=(mx-pinch.mx)/h*Math.PI;
    cam.phi=Math.max(PHI_MIN,Math.min(PHI_MAX,cam.phi-(my-pinch.my)/h*2));
    pinch.mx=mx;pinch.my=my;
    placeCamera();kick();
  });
  function lift(e){delete touches[e.pointerId];if(tCount()<2)pinch=null;}
  canvas.addEventListener('pointerup',lift);
  canvas.addEventListener('pointercancel',lift);
  canvas.addEventListener('wheel',function(e){
    e.preventDefault();cam.anim=null;cam.touched=true;
    cam.zoom=Math.max(.55,Math.min(1.6,cam.zoom*Math.exp(e.deltaY*.0012)));
    placeCamera();kick();
  },{passive:false});

  /* ── экран -> клетка ── */
  var ray=new THREE.Raycaster(),ndc=new THREE.Vector2(),hitP=new THREE.Vector3();
  var plane=new THREE.Plane(new THREE.Vector3(0,1,0),0);
  function aim(x,y){
    var b=canvas.getBoundingClientRect();
    ndc.set((x-b.left)/b.width*2-1,-(y-b.top)/b.height*2+1);
    ray.setFromCamera(ndc,camera);
  }
  function planePoint(x,y,height){
    aim(x,y);plane.constant=-(height||0);
    return ray.ray.intersectPlane(plane,hitP)?hitP:null;
  }
  /* сначала фигура под пальцем (по высокой фигуре легко промахнуться мимо её клетки), потом доска */
  function squareAt(x,y,planeOnly){
    if(!planeOnly){
      aim(x,y);
      var list=[];pieces.forEach(function(e){if(e)list.push(e.mesh);});
      var hit=ray.intersectObjects(list,false)[0];
      if(hit&&hit.object.userData.e&&hit.object.userData.e.sq>=0){var s=hit.object.userData.e.sq;return {r:s>>3,c:s&7};}
    }
    var p=planePoint(x,y,0);if(!p)return null;
    var c=Math.floor(p.x+4),r=Math.floor(p.z+4);
    if(c<0||c>7||r<0||r>7)return null;
    return {r:r,c:c};
  }

  /* все клетки под пальцем, ближние первыми: фигуры по лучу, потом клетка доски.
     Игра выбирает первую подходящую, поэтому можно попасть и по фигуре, частично закрытой соседней. */
  function squaresAt(x,y){
    aim(x,y);
    var list=[],out=[],seen={};
    pieces.forEach(function(e){if(e)list.push(e.mesh);});
    ray.intersectObjects(list,false).forEach(function(h){
      var e=h.object.userData.e;if(!e||e.sq<0||seen[e.sq])return;
      seen[e.sq]=1;out.push({r:e.sq>>3,c:e.sq&7});
    });
    var q=squareAt(x,y,true);
    if(q&&!seen[q.r*8+q.c])out.push(q);
    return out;
  }

  /* ── перетаскивание фигуры ── */
  var dragging=null;
  function dragStart(r,c){
    var e=pieces[r*8+c];if(!e)return;
    if(e.tween){e.tween.dead=true;e.tween=null;}
    dragging=e;
    el.classList.add('dragging');
  }
  function dragMove(x,y){
    if(!dragging)return;
    var p=planePoint(x,y,0);if(!p)return;
    var lim=4.3;
    dragging.mesh.position.set(Math.max(-lim,Math.min(lim,p.x)),.45,Math.max(-lim,Math.min(lim,p.z)));
    kick();
  }
  function dragEnd(){dragging=null;el.classList.remove('dragging');}

  /* ── отрисовка позиции ── */
  var lastScene=null,checkSq=-1,overSq=-1;
  function draw(s,anim){
    setTheme(s.theme||'wood');
    if(cam.side===null){cam.side=!!s.flip;cam.theta=sideTheta(cam.side);placeCamera();}
    else if(cam.side!==!!s.flip){cam.side=!!s.flip;animCam(sideTheta(cam.side),cam.phi,cam.zoom);}
    lastScene=s;
    var slides=(anim&&anim.slides)||[],board=s.board;
    var next=new Array(64),used=[];
    function code(sq){return board[sq>>3][sq&7];}
    function restOf(sq){return s.sel&&s.sel.r*8+s.sel.c===sq?.14:0;}
    var moves=[];

    /* 1. ходы из анимации */
    slides.forEach(function(sl){
      var from=sl[0]*8+sl[1],to=sl[2]*8+sl[3],e=pieces[from];
      if(!e||used.indexOf(e)>=0||!code(to)||next[to])return;
      used.push(e);next[to]=e;moves.push([e,to,true]);
    });
    /* 2. фигура осталась на своей клетке */
    for(var sq=0;sq<64;sq++){
      var p=code(sq),e=pieces[sq];
      if(!p||next[sq]||!e||used.indexOf(e)>=0||e.code!==p)continue;
      used.push(e);next[sq]=e;moves.push([e,sq,false]);
    }
    /* 3. ближайшая свободная фигура того же вида (отмена хода, бросок рукой) */
    var spare=[];pieces.forEach(function(e){if(e&&used.indexOf(e)<0)spare.push(e);});
    for(sq=0;sq<64;sq++){
      p=code(sq);if(!p||next[sq])continue;
      var t=sqPos(sq),best=null,bd=1e9;
      spare.forEach(function(e){
        if(e.code!==p||used.indexOf(e)>=0)return;
        var d=Math.hypot(e.mesh.position.x-t.x,e.mesh.position.z-t.z);
        if(d<bd){bd=d;best=e;}
      });
      if(best){used.push(best);next[sq]=best;moves.push([best,sq,false]);}
      else{var ne=makePiece(p);var tp=sqPos(sq);ne.mesh.position.set(tp.x,0,tp.z);ne.sq=sq;next[sq]=ne;if(anim||lastShown)fadeIn(ne);}
    }
    /* 4. лишние фигуры уходят: при взятии с эффектом */
    pieces.forEach(function(e){
      if(!e||used.indexOf(e)>=0)return;
      if(e===dragging)dragging=null;
      if(anim&&anim.burst)capture(e);else fadeOut(e);
    });
    pieces=next;
    moves.forEach(function(m){
      var e=m[0],to=m[1];
      if(e===dragging)return;
      e.rest=restOf(to);
      var want=code(to);
      moveTo(e,to,{arc:m[2],done:want!==e.code?function(){setType(e,want);pop(e);}:null});
    });
    lastShown=true;
    paintMarks(s);
    kick();
  }
  var lastShown=false;
  function pop(e){var m=e.mesh;tween(300,function(k){var s=1+.25*Math.sin(k*Math.PI);m.scale.set(s,s,s);});}

  function mark(sq,color,op){var m=marks[sq];m.visible=true;m.material.color.setHex(color);m.material.opacity=op;}
  function paintMarks(s){
    marks.forEach(function(m){m.visible=false;});
    dots.forEach(function(d){d.visible=false;});
    function last(l,col){if(!l)return;mark(l.r*8+l.c,col,.22);mark(l.tr*8+l.tc,col,.32);}
    last(s.lastA,COL.lastA);last(s.lastH,COL.lastH);
    if(s.coach){mark(s.coach.r*8+s.coach.c,COL.coach,.45);mark(s.coach.tr*8+s.coach.tc,COL.coach,.6);}
    if(s.sel)mark(s.sel.r*8+s.sel.c,COL.sel,.5);
    checkSq=s.check==null?-1:s.check;pulse=checkSq>=0;
    if(pulse)mark(checkSq,COL.check,.5);
    var h=s.hints||{};
    for(var k in h){
      var i=+k,d=dots[i];
      d.geometry=h[k]==='cap'?ringGeo:discGeo;
      d.material.color.setHex(COL.hint);d.material.opacity=h[k]==='cap'?.85:.75;
      d.visible=true;
    }
    overSq=-1;
  }
  function over(r,c){
    var sq=r==null?-1:r*8+c;
    if(sq===overSq)return;
    if(overSq>=0&&dots[overSq].visible)dots[overSq].material.color.setHex(COL.hint);
    overSq=-1;
    if(sq>=0&&dots[sq].visible){dots[sq].material.color.setHex(COL.over);overSq=sq;}
    kick();
  }
  function liftPiece(r,c,on){
    var e=pieces[r*8+c];if(!e||e===dragging)return;
    e.rest=on?.45:restOf2(r*8+c);moveTo(e,r*8+c);
  }
  function restOf2(sq){var s=lastScene;return s&&s.sel&&s.sel.r*8+s.sel.c===sq?.14:0;}

  /* ── размер ── */
  function resize(){
    var w=el.clientWidth,h=el.clientHeight;if(!w||!h)return;
    renderer.setSize(w,h,false);
    canvas.style.width=w+'px';canvas.style.height=h+'px';
    camera.aspect=w/h;camera.updateProjectionMatrix();
    computeFit();if(!cam.touched&&!cam.anim)cam.phi=PHI_DEF;placeCamera();kick();
  }
  var ro=window.ResizeObserver?new ResizeObserver(resize):null;
  if(ro)ro.observe(el);else window.addEventListener('resize',resize);

  function show(on){
    visible=!!on;
    el.classList.toggle('hidden',!on);
    if(on){resize();kick();}
    else if(raf){cancelAnimationFrame(raf);raf=0;}
  }
  canvas.addEventListener('webglcontextlost',function(e){e.preventDefault();if(opts.onLost)opts.onLost();});

  /* центр клетки на экране (для проверок) */
  function screenOf(r,c,h){
    var v=new THREE.Vector3(c-3.5,h||0,r-3.5).project(camera),b=canvas.getBoundingClientRect();
    return {x:b.left+(v.x+1)/2*b.width,y:b.top+(1-v.y)/2*b.height};
  }

  resize();
  return {screenOf:screenOf,
    el:canvas,draw:draw,squareAt:squareAt,squaresAt:squaresAt,cellSize:function(){return 40;},lift:liftPiece,over:over,
    dragStart:dragStart,dragMove:dragMove,dragEnd:dragEnd,
    orbitStart:orbitStart,orbitMove:orbitMove,orbitEnd:orbitEnd,orbiting:function(){return !!orbit;},
    gesturing:function(){return !!pinch;},
    resetCamera:resetCamera,show:show,is3d:true
  };
}

window.Board3D=Board3D;
Board3D.load=load;
Board3D.supported=supported;
Board3D.ready=function(){return !!THREE;};
})();
