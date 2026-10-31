/* A.C.EON BREAKOUT: объёмное поле (three.js). Рисует то же состояние, что и 2D, логика не меняется.

   var v = BkView3D(THREE, wrapEl)   null, если WebGL не создался
   v.resize(w, h) / v.draw(st, now, set) / v.event(ev, st, set) / v.show(on) / v.project(x, y)

   Поле лежит на полу: x поля -> x сцены, y поля -> z сцены (1 единица = 40 единиц поля).
   Камера за ракеткой, сверху и сзади, верх поля дальше от игрока. */
(function(){
'use strict';

window.BkView3D=function(THREE,wrap){
  var R=window.BkRules,FW=R.W,FH=R.H,K=1/40,SW=FW*K,SH=FH*K;
  var renderer;
  try{renderer=new THREE.WebGLRenderer({antialias:true,alpha:true});}catch(e){return null;}
  renderer.setPixelRatio(Math.min(2,window.devicePixelRatio||1));
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  renderer.setClearColor(0x000000,0);
  var canvas=renderer.domElement;canvas.className='b3-canvas';
  wrap.insertBefore(canvas,wrap.querySelector('.fx'));

  var scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(36,0.75,1,200);
  var hemi=new THREE.HemisphereLight(0xdde8ff,0x202040,1.2);scene.add(hemi);
  var sun=new THREE.DirectionalLight(0xffffff,1.4);sun.position.set(-5,18,8);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);
  var sc=sun.shadow.camera;sc.left=-10;sc.right=10;sc.top=12;sc.bottom=-12;sc.near=1;sc.far=50;sun.shadow.bias=-0.0006;
  scene.add(sun);
  var ballLight=new THREE.PointLight(0xffffff,0,8,1.5);scene.add(ballLight);

  function X(x){return x*K-SW/2;}
  function Z(y){return y*K-SH/2;}

  /* пол с фоном темы */
  var floorMat=new THREE.MeshStandardMaterial({roughness:.9});
  var floor=new THREE.Mesh(new THREE.PlaneGeometry(SW,SH),floorMat);floor.rotation.x=-Math.PI/2;floor.receiveShadow=true;scene.add(floor);
  var wallMat=new THREE.MeshStandardMaterial({color:0x0a2a40,emissive:0x00b8d4,emissiveIntensity:.3,roughness:.4,metalness:.4});
  [[-SW/2-0.2,0,0.4,SH+0.4],[SW/2+0.2,0,0.4,SH+0.4],[0,-SH/2-0.2,SW+0.8,0.4]].forEach(function(w){
    var m=new THREE.Mesh(new THREE.BoxGeometry(w[2],0.6,w[3]),wallMat);m.position.set(w[0],0.3,w[1]);m.castShadow=true;scene.add(m);
  });
  function floorTex(set){
    var cv=document.createElement('canvas');cv.width=300;cv.height=400;
    var g=cv.getContext('2d'),T=BkTheme.get(set);
    if(!set.big&&set.theme==='space'){var tmp=document.createElement('canvas');tmp.width=FW;tmp.height=FH;var v=BkView2D(tmp);v.resize(1);v.draw({paddle:{x:-999,y:0,w:0,h:0},bricks:[],debris:[],drops:[],lasers:[],balls:[],fx:{},mode:''},0,set);g.drawImage(tmp,0,0,300,400);}
    else{var gr=g.createLinearGradient(0,0,0,400);gr.addColorStop(0,T.bg[0]);gr.addColorStop(1,T.bg[1]);g.fillStyle=gr;g.fillRect(0,0,300,400);
      g.strokeStyle='rgba(255,255,255,.06)';for(var i=0;i<=300;i+=25){g.beginPath();g.moveTo(i,0);g.lineTo(i,400);g.stroke();}for(i=0;i<=400;i+=25){g.beginPath();g.moveTo(0,i);g.lineTo(300,i);g.stroke();}}
    var t=new THREE.CanvasTexture(cv);t.colorSpace=THREE.SRGBColorSpace;return t;
  }

  /* кирпичи */
  var MAXB=200,bw=R.BW*K,bh=R.BH*K;
  var brickMat=new THREE.MeshStandardMaterial({roughness:.35,metalness:.2,emissive:0x111111});
  var bricks=new THREE.InstancedMesh(new THREE.BoxGeometry(bw*0.96,0.5,bh*0.9),brickMat,MAXB);
  bricks.castShadow=true;bricks.receiveShadow=true;bricks.count=0;bricks.instanceMatrix.setUsage(THREE.DynamicDrawUsage);scene.add(bricks);
  var portals=[0,1].map(function(i){var m=new THREE.Mesh(new THREE.TorusGeometry(bh*0.75,0.07,10,32),new THREE.MeshBasicMaterial({color:i?0xff2d78:0x00e5ff}));m.rotation.x=-Math.PI/2;m.visible=false;scene.add(m);return m;});

  /* ракетка, мячи, обломки, лазеры, щит */
  var padMat=new THREE.MeshStandardMaterial({color:0x9af3ea,emissive:0x16b3a6,emissiveIntensity:.5,roughness:.3,metalness:.3});
  var paddle=new THREE.Mesh(new THREE.BoxGeometry(1,0.45,R.BH*0.7*K),padMat);paddle.castShadow=true;scene.add(paddle);
  var ballMat=new THREE.MeshStandardMaterial({color:0xffffff,emissive:0xaaccff,emissiveIntensity:.6,roughness:.2});
  var balls=new THREE.InstancedMesh(new THREE.SphereGeometry(12*K,18,12),ballMat,8);balls.castShadow=true;balls.count=0;scene.add(balls);
  var debris=new THREE.InstancedMesh(new THREE.BoxGeometry(bw,0.45,bh),new THREE.MeshStandardMaterial({color:0xb07a44,roughness:.8}),20);debris.count=0;debris.castShadow=true;scene.add(debris);
  var lasers=new THREE.InstancedMesh(new THREE.BoxGeometry(0.08,0.12,0.4),new THREE.MeshBasicMaterial({color:0xff4a4a}),40);lasers.count=0;scene.add(lasers);
  var shield=new THREE.Mesh(new THREE.BoxGeometry(SW,0.12,0.1),new THREE.MeshBasicMaterial({color:0x00e5ff,transparent:true,opacity:.7}));shield.position.set(0,0.1,Z(FH-6));scene.add(shield);
  /* бонусы: спрайты со значком */
  var iconTex={},sprites=[];
  function tex(t){
    if(iconTex[t])return iconTex[t];
    var cv=document.createElement('canvas');cv.width=96;cv.height=64;var g=cv.getContext('2d');BkIcon(g,t,48,32,52);
    var x=new THREE.CanvasTexture(cv);x.colorSpace=THREE.SRGBColorSpace;return (iconTex[t]=x);
  }
  for(var i=0;i<14;i++){var sp=new THREE.Sprite(new THREE.SpriteMaterial({transparent:true}));sp.visible=false;sp.scale.set(1.2,0.8,1);scene.add(sp);sprites.push(sp);}
  /* частицы */
  var PMAX=300,parts=[];
  var pmesh=new THREE.InstancedMesh(new THREE.BoxGeometry(0.14,0.14,0.14),new THREE.MeshBasicMaterial(),PMAX);pmesh.count=0;pmesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);scene.add(pmesh);

  var M=new THREE.Matrix4(),Q=new THREE.Quaternion(),V=new THREE.Vector3(),S=new THREE.Vector3(),C=new THREE.Color(),E=new THREE.Euler();
  var themeKey='',shake=0,flash=0,last=0;

  function applyTheme(set){
    var k=set.theme+(set.big?'b':'');if(k===themeKey)return;themeKey=k;
    floorMat.map&&floorMat.map.dispose();floorMat.map=floorTex(set);floorMat.needsUpdate=true;
    var T=BkTheme.get(set);
    padMat.color.set(T.pad[0]);padMat.emissive.set(T.pad[1]);
    ballMat.color.set(T.ball);
    wallMat.emissive.set(set.big?'#666666':T.glow);
  }
  function event(ev,st,set){
    var T=BkTheme.get(set);
    if(ev.type==='break'){
      var col=ev.t==='n'?T.hp[Math.max(0,ev.max-1)]:BkTheme.brick(set.theme,set.big,{t:ev.t,hp:1});
      for(var i=0;i<12&&parts.length<PMAX;i++)parts.push({p:new THREE.Vector3(X(ev.x),0.3,Z(ev.y)),v:new THREE.Vector3((Math.random()-.5)*6,Math.random()*5+2,(Math.random()-.5)*6),life:1,c:new THREE.Color(col)});
    }else if(ev.type==='explode'){shake=Math.max(shake,.35);}
    else if(ev.type==='lost'){flash=1;shake=Math.max(shake,.25);}
    else if(ev.type==='ouch'||ev.type==='descend'||ev.type==='gates')shake=Math.max(shake,.15);
  }

  function draw(st,now,set){
    applyTheme(set);
    var dt=last?Math.min(0.05,(now-last)/1000):0.016;last=now;
    var T=BkTheme.get(set),n=0,pi=0;
    portals.forEach(function(p){p.visible=false;});
    st.bricks.forEach(function(b){
      if(!b.alive)return;
      if(b.t==='P'||b.t==='Q'){var pm=portals[pi++];if(pm){pm.visible=true;pm.position.set(X(b.x+b.w/2),0.15,Z(b.y+b.h/2));pm.rotation.z=now/300;}return;}
      if(n>=MAXB)return;
      var hgt=b.t==='S'||b.t==='G'?1.2:b.t==='n'?0.6+0.25*(b.hp-1):0.8;
      V.set(X(b.x+b.w/2),0.25*hgt,Z(b.y+b.h/2));S.set(1,hgt,1);Q.identity();
      M.compose(V,Q,S);bricks.setMatrixAt(n,M);
      C.set(BkTheme.brick(set.theme,set.big,b));
      if(b.t==='$')C.lerp(new THREE.Color(0xffffff),0.2+0.2*Math.sin(now/200+b.id));
      if(b.t==='R'&&b.hp<b.max)C.multiplyScalar(0.6+0.4*(b.regen/4));
      bricks.setColorAt(n,C);n++;
    });
    bricks.count=n;bricks.instanceMatrix.needsUpdate=true;if(bricks.instanceColor)bricks.instanceColor.needsUpdate=true;

    var p=st.paddle;
    paddle.scale.x=p.w*K;paddle.position.set(X(p.x),0.25,Z(p.y+p.h/2));
    var bn=0,fire=st.fx.fire>0;
    ballMat.emissive.set(fire?'#ff7a1a':'#aaccff');
    st.balls.forEach(function(b){if(bn>=8)return;V.set(X(b.x),12*K+0.02,Z(b.y));M.compose(V,Q.identity(),S.set(1,1,1));balls.setMatrixAt(bn++,M);});
    balls.count=bn;balls.instanceMatrix.needsUpdate=true;
    if(st.balls[0]){ballLight.position.set(X(st.balls[0].x),1.2,Z(st.balls[0].y));ballLight.color.set(fire?'#ff8a1a':T.glow);}
    var dn=0;
    st.debris.forEach(function(e){if(dn>=20)return;V.set(X(e.x+e.w/2),0.3,Z(e.y+e.h/2));E.set(0,e.rot,0);Q.setFromEuler(E);M.compose(V,Q,S.set(1,1,1));debris.setMatrixAt(dn++,M);});
    debris.count=dn;debris.instanceMatrix.needsUpdate=true;
    var ln=0;
    st.lasers.forEach(function(L){if(ln>=40)return;V.set(X(L.x),0.3,Z(L.y-7));M.compose(V,Q.identity(),S.set(1,1,1));lasers.setMatrixAt(ln++,M);});
    lasers.count=ln;lasers.instanceMatrix.needsUpdate=true;
    shield.visible=!!st.shield;
    sprites.forEach(function(sp,i){
      var d=st.drops[i];
      if(!d){sp.visible=false;return;}
      sp.visible=true;sp.material.map=tex(d.t);sp.material.needsUpdate=true;
      sp.position.set(X(d.x),0.6+0.1*Math.sin(now/150+i),Z(d.y));
    });
    /* частицы */
    var k2=0;
    parts=parts.filter(function(q){
      q.life-=dt*1.4;if(q.life<=0)return false;
      q.v.y-=14*dt;q.p.addScaledVector(q.v,dt);if(q.p.y<0.07){q.p.y=0.07;q.v.y*=-0.4;}
      M.compose(q.p,Q.identity(),S.setScalar(Math.max(.1,q.life)));pmesh.setMatrixAt(k2,M);pmesh.setColorAt(k2,q.c);k2++;
      return true;
    });
    pmesh.count=k2;pmesh.instanceMatrix.needsUpdate=true;if(pmesh.instanceColor)pmesh.instanceColor.needsUpdate=true;

    /* туман: свет почти гаснет, остаётся свет от мяча */
    var fog=st.fx.fog>0;
    hemi.intensity=fog?0.08:1.2+flash*1.5;sun.intensity=fog?0.05:1.4;
    ballLight.intensity=fog?6:1.2;
    flash=Math.max(0,flash-dt*3);
    placeCamera(shake);shake=shake>.01?shake*.88:0;
    renderer.render(scene,camera);
  }

  /* камера: за ракеткой, поле целиком в кадре */
  var fit={R:30,sx:0,sy:0},TILT=0.95;
  var PTS=[];[-SW/2-0.4,SW/2+0.4].forEach(function(x){[-SH/2-0.4,SH/2+0.2].forEach(function(z){[0,0.8].forEach(function(y){PTS.push([x,y,z]);});});});
  function place(d){camera.position.set(0,d*Math.sin(TILT),d*Math.cos(TILT));camera.lookAt(0,0,0);camera.updateMatrixWorld();}
  function computeFit(){
    camera.updateProjectionMatrix();
    var lo=5,hi=200,b;
    function box(d){place(d);var v=new THREE.Vector3(),o={x0:9,x1:-9,y0:9,y1:-9};PTS.forEach(function(q){v.set(q[0],q[1],q[2]).project(camera);o.x0=Math.min(o.x0,v.x);o.x1=Math.max(o.x1,v.x);o.y0=Math.min(o.y0,v.y);o.y1=Math.max(o.y1,v.y);});return o;}
    for(var i=0;i<28;i++){var mid=(lo+hi)/2;b=box(mid);if(b.x1-b.x0<=1.96&&b.y1-b.y0<=1.96)hi=mid;else lo=mid;}
    b=box(hi);fit.R=hi;fit.sy=(b.y0+b.y1)/2;fit.sx=(b.x0+b.x1)/2;
  }
  function placeCamera(sh){
    place(fit.R);
    if(sh){camera.position.x+=(Math.random()-.5)*sh;camera.position.y+=(Math.random()-.5)*sh;}
    camera.updateProjectionMatrix();
    camera.projectionMatrix.elements[9]+=fit.sy;camera.projectionMatrix.elements[8]+=fit.sx;
    camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();
  }
  var size=[300,400];
  function resize(w,h){size=[w,h];renderer.setSize(w,h,false);canvas.style.width=w+'px';canvas.style.height=h+'px';camera.aspect=w/h;computeFit();}
  function show(on){canvas.style.display=on?'block':'none';}
  function project(x,y){V.set(X(x),0.5,Z(y)).project(camera);return [(V.x+1)/2*size[0],(1-V.y)/2*size[1]];}
  return {draw:draw,resize:resize,show:show,event:event,project:project};
};
})();
