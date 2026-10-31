/* A.C.EON TETRIS: объёмный стакан (three.js). Рисует то же состояние, что и 2D, логика не меняется.

   var v = TetView3D(THREE, wrapEl)   null, если WebGL не создался
   v.resize(w, h)       размер холста в CSS-пикселях
   v.draw(st, now, set) кадр
   v.event(ev, st, set) эффекты: осколки при очистке, вспышка фиксации, тряска
   v.show(on)

   Координаты: клетка 1x1x1, столбец x в точке x-4.5, видимая строка r в высоте (H-1-r)+0.5,
   задняя стенка стакана на z=-0.5. Камера спереди, чуть сверху и слева, чтобы были видны бока кубиков. */
(function(){
'use strict';

window.TetView3D=function(THREE,wrap){
  var R=window.TetRules,W=R.W,H=R.H,HID=R.HIDDEN,VIS=H-HID;
  var renderer;
  try{renderer=new THREE.WebGLRenderer({antialias:true,alpha:true});}catch(e){return null;}
  renderer.setPixelRatio(Math.min(2,window.devicePixelRatio||1));
  renderer.shadowMap.enabled=true;
  renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  renderer.toneMapping=THREE.NoToneMapping;
  renderer.setClearColor(0x000000,0);
  var canvas=renderer.domElement;
  canvas.className='b3-canvas';
  wrap.insertBefore(canvas,wrap.querySelector('.fx'));

  var scene=new THREE.Scene();
  var camera=new THREE.PerspectiveCamera(20,0.5,1,400);

  var hemi=new THREE.HemisphereLight(0xcfe8ff,0x283050,1.25);scene.add(hemi);
  var sun=new THREE.DirectionalLight(0xffffff,1.6);
  sun.position.set(-6,26,14);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);
  var sc=sun.shadow.camera;sc.left=-8;sc.right=8;sc.top=24;sc.bottom=-4;sc.near=1;sc.far=60;
  sun.shadow.bias=-0.0006;sun.shadow.normalBias=0.03;
  sun.target.position.set(0,10,0);scene.add(sun.target);
  scene.add(sun);
  var rim=new THREE.DirectionalLight(0xff2d78,0.45);rim.position.set(10,8,-6);scene.add(rim);

  /* ── стакан: задняя стенка с сеткой, бортики, пол ── */
  function wallTexture(theme){
    var cs=32,cv=document.createElement('canvas');cv.width=W*cs;cv.height=VIS*cs;
    var g=cv.getContext('2d'),b=TetTheme.bg(theme.t,theme.big);
    var gr=g.createLinearGradient(0,0,0,cv.height);gr.addColorStop(0,b.a);gr.addColorStop(1,b.b);
    g.fillStyle=gr;g.fillRect(0,0,cv.width,cv.height);
    g.strokeStyle=b.grid.replace(/[\d.]+\)$/,function(m){return Math.min(1,parseFloat(m)*2.2)+')';});g.lineWidth=2;
    for(var i=0;i<=W;i++){g.beginPath();g.moveTo(i*cs,0);g.lineTo(i*cs,cv.height);g.stroke();}
    for(var j=0;j<=VIS;j++){g.beginPath();g.moveTo(0,j*cs);g.lineTo(cv.width,j*cs);g.stroke();}
    var t=new THREE.CanvasTexture(cv);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=4;
    return t;
  }
  var backMat=new THREE.MeshStandardMaterial({roughness:.9,metalness:0});
  var back=new THREE.Mesh(new THREE.PlaneGeometry(W,VIS),backMat);
  back.position.set(0,VIS/2,-0.5);back.receiveShadow=true;scene.add(back);
  var frameMat=new THREE.MeshStandardMaterial({color:0x0a2a40,emissive:0x00b8d4,emissiveIntensity:.18,roughness:.4,metalness:.4});
  var frame=new THREE.Group();
  [[-W/2-0.2,VIS/2,0.4,VIS+0.4],[W/2+0.2,VIS/2,0.4,VIS+0.4],[0,-0.2,W+0.8,0.4]].forEach(function(f){
    var m=new THREE.Mesh(new THREE.BoxGeometry(f[2],f[3],1.0),frameMat);m.position.set(f[0],f[1],0);m.castShadow=true;m.receiveShadow=true;frame.add(m);
  });
  scene.add(frame);

  /* ── блоки ── */
  var MAX=W*H+8;
  var boxGeo=new THREE.BoxGeometry(.94,.94,.94);
  var blockMat=new THREE.MeshStandardMaterial({roughness:.4,metalness:.05,emissive:0x262626});
  var blocks=new THREE.InstancedMesh(boxGeo,blockMat,MAX);
  blocks.castShadow=true;blocks.receiveShadow=true;blocks.count=0;
  blocks.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  scene.add(blocks);
  var ghostMat=new THREE.MeshBasicMaterial({transparent:true,opacity:.22,depthWrite:false});
  var ghosts=new THREE.InstancedMesh(boxGeo,ghostMat,4);ghosts.count=0;scene.add(ghosts);
  var ghostEdgeMat=new THREE.LineBasicMaterial({transparent:true,opacity:.7});
  var edgeGeo=new THREE.EdgesGeometry(boxGeo);
  var ghostEdges=[0,1,2,3].map(function(){var l=new THREE.LineSegments(edgeGeo,ghostEdgeMat);l.visible=false;scene.add(l);return l;});

  /* осколки при очистке линий */
  var DEB=240;
  var debris=new THREE.InstancedMesh(new THREE.BoxGeometry(.3,.3,.3),new THREE.MeshStandardMaterial({roughness:.4,emissive:0x222222}),DEB);
  debris.count=0;debris.instanceMatrix.setUsage(THREE.DynamicDrawUsage);scene.add(debris);
  var deb=[];

  var M=new THREE.Matrix4(),Q=new THREE.Quaternion(),V=new THREE.Vector3(),S=new THREE.Vector3(),C=new THREE.Color(),WHITE=new THREE.Color(0xffffff),E=new THREE.Euler();
  function pos(x,r){return V.set(x-4.5,(H-1-r)+0.5,0);}

  var themeKey='',flashes=[],shake=0,wipe=0;
  function applyTheme(set){
    var k=set.theme+(set.big?'b':'');
    if(k===themeKey)return;
    themeKey=k;
    backMat.map&&backMat.map.dispose();
    backMat.map=wallTexture({t:set.theme,big:set.big});backMat.needsUpdate=true;
    var glass=!set.big&&set.theme==='glass',gb=!set.big&&set.theme==='gb';
    blockMat.transparent=glass;blockMat.opacity=glass?.72:1;
    blockMat.roughness=gb?.9:glass?.1:.35;blockMat.metalness=glass?.3:.15;
    blockMat.needsUpdate=true;
    frameMat.color.setHex(gb?0x306230:0x0a2a40);frameMat.emissive.setHex(gb?0x0f380f:set.big?0x666666:0x00b8d4);
    hemi.intensity=gb?1.4:1.25;
  }

  function event(ev,st,set){
    var now=performance.now();
    if(ev.type==='clear'){
      ev.rows.forEach(function(r){
        for(var x=0;x<W;x++){
          var t=st.board[r][x];if(!t)continue;
          for(var k=0;k<2&&deb.length<DEB;k++)deb.push({p:new THREE.Vector3(x-4.5,(H-1-r)+0.5,0),
            v:new THREE.Vector3((Math.random()-.5)*6+(x-4.5)*.5,Math.random()*5+2,Math.random()*6+2),
            r:new THREE.Vector3(Math.random()*6,Math.random()*6,0),life:1,col:new THREE.Color(TetTheme.color(set.theme,set.big,t))});
        }
      });
      shake=Math.max(shake,ev.rows.length>=4?.5:.08*ev.rows.length);
    }else if(ev.type==='lock')flashes.push({cells:ev.cells,t:now});
    else if(ev.type==='drop'&&ev.rows>1)shake=Math.max(shake,.06);
    else if(ev.type==='wipe'){wipe=1;shake=.6;}
  }

  var last=0;
  function draw(st,now,set){
    applyTheme(set);
    var dt=last?Math.min(0.05,(now-last)/1000):0.016;last=now;
    var pal=TetTheme.pal(set.theme,set.big),n=0;
    var clearing={},cp=0;
    if(st.clearRows){st.clearRows.forEach(function(r){clearing[r]=1;});cp=1-Math.max(0,st.clearT)/260;}
    var flashSet={};
    flashes=flashes.filter(function(f){var a=1-(now-f.t)/180;if(a<=0)return false;f.cells.forEach(function(c){flashSet[c[0]+','+c[1]]=a;});return true;});
    function put(x,r,t,scale,glow){
      if(n>=MAX)return;
      pos(x,r);S.set(scale,scale,scale);Q.identity();
      M.compose(V,Q,S);blocks.setMatrixAt(n,M);
      C.set(pal[t]||'#888');
      if(glow>0)C.lerp(WHITE,glow);
      blocks.setColorAt(n,C);n++;
    }
    for(var r=HID;r<H;r++)for(var x=0;x<W;x++){
      var t=st.board[r][x];if(!t)continue;
      if(clearing[r])put(x,r,t,Math.max(0.01,1-cp),0.8*(1-cp)+.2);
      else put(x,r,t,1,(flashSet[x+','+r]||0)*0.5);
    }
    var p=st.cur;ghosts.count=0;ghostEdges.forEach(function(l){l.visible=false;});
    if(p&&!st.over){
      var cs=R.cells(st,p),lockK=st.lockT>0?Math.min(1,st.lockT/500):0;
      if(set.ghost){
        var gy=R.ghostY(st)-p.y,gi=0;
        ghostMat.color.set(pal[p.t]);ghostEdgeMat.color.set(set.big?'#ffffff':pal[p.t]);
        if(gy>0)cs.forEach(function(c){
          var rr=c[1]+gy;if(rr<HID)return;
          pos(c[0],rr);M.compose(V,Q.identity(),S.set(1,1,1));ghosts.setMatrixAt(gi,M);
          ghostEdges[gi].position.copy(V);ghostEdges[gi].visible=true;gi++;
        });
        ghosts.count=gi;ghosts.instanceMatrix.needsUpdate=true;
      }
      cs.forEach(function(c){if(c[1]>=HID)put(c[0],c[1],p.t,1,-0);});
      if(lockK>0){for(var q=n-cs.length;q<n;q++){blocks.getColorAt(q,C);C.multiplyScalar(1-lockK*0.3);blocks.setColorAt(q,C);}}
    }
    blocks.count=n;blocks.instanceMatrix.needsUpdate=true;if(blocks.instanceColor)blocks.instanceColor.needsUpdate=true;

    /* осколки летят к зрителю и падают */
    var dn=0;
    deb=deb.filter(function(d){
      d.life-=dt*0.9;if(d.life<=0)return false;
      d.v.y-=14*dt;d.p.addScaledVector(d.v,dt);
      E.set(d.r.x*d.life*3,d.r.y*d.life*3,0);Q.setFromEuler(E);
      var sc=Math.max(.05,d.life);S.set(sc,sc,sc);
      M.compose(d.p,Q,S);debris.setMatrixAt(dn,M);debris.setColorAt(dn,d.col);dn++;
      return true;
    });
    debris.count=dn;debris.instanceMatrix.needsUpdate=true;if(debris.instanceColor)debris.instanceColor.needsUpdate=true;

    if(wipe>0){hemi.intensity=1.25+wipe*2;wipe=Math.max(0,wipe-dt*1.5);}
    placeCamera(shake);shake=shake>.01?shake*.86:0;
    renderer.render(scene,camera);
  }

  /* ── камера: стакан целиком в кадре, взгляд чуть сверху ── */
  var fit={R:50,shift:0},TILT=0.2,YAW=0.2,AIM=VIS/2;
  var PTS=[];
  [-W/2-0.4,W/2+0.4].forEach(function(x){[-0.4,VIS+0.1].forEach(function(y){[-0.5,0.5].forEach(function(z){PTS.push([x,y,z]);});});});
  function place(Rd){
    camera.position.set(Rd*Math.cos(TILT)*Math.sin(YAW),AIM+Rd*Math.sin(TILT),Rd*Math.cos(TILT)*Math.cos(YAW));
    camera.lookAt(0,AIM,0);camera.updateMatrixWorld();
  }
  function computeFit(){
    camera.updateProjectionMatrix();
    var lo=10,hi=400,b;
    function box(Rd){
      place(Rd);var v=new THREE.Vector3(),o={y0:9,y1:-9,x0:9,x1:-9};
      PTS.forEach(function(q){v.set(q[0],q[1],q[2]).project(camera);o.x0=Math.min(o.x0,v.x);o.x1=Math.max(o.x1,v.x);o.y0=Math.min(o.y0,v.y);o.y1=Math.max(o.y1,v.y);});
      return o;
    }
    for(var i=0;i<28;i++){var mid=(lo+hi)/2;b=box(mid);if(b.x1-b.x0<=1.96&&b.y1-b.y0<=1.96)hi=mid;else lo=mid;}
    b=box(hi);fit.R=hi;fit.shift=(b.y0+b.y1)/2;fit.shiftX=(b.x0+b.x1)/2;
  }
  function placeCamera(sh){
    place(fit.R);
    if(sh){camera.position.x+=(Math.random()-.5)*sh;camera.position.y+=(Math.random()-.5)*sh;}
    camera.updateProjectionMatrix();
    camera.projectionMatrix.elements[9]+=fit.shift;
    camera.projectionMatrix.elements[8]+=fit.shiftX;
    camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();
  }
  function resize(w,h){
    renderer.setSize(w,h,false);
    canvas.style.width=w+'px';canvas.style.height=h+'px';
    camera.aspect=w/h;computeFit();
  }
  function show(on){canvas.style.display=on?'block':'none';}
  function busy(){return deb.length>0||flashes.length>0||shake>0||wipe>0;}
  return {draw:draw,resize:resize,show:show,event:event,busy:busy};
};
})();
