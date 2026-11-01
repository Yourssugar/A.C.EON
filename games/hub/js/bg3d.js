/* A.C.EON ARCADE: фон новой страницы игр на WebGL (three.js).
   Небо с неоновым солнцем, два слоя города, бегущая сетка пола, пыль в воздухе.
   Камера чуть качается за курсором и сдвигается вместе с каруселью: слои двигаются с разной скоростью.

   var bg = HubBG(THREE, container, artBase)   null, если WebGL не создался; artBase null: картинок ещё нет
   bg.accent('#ff2d78')   цвет выбранной игры (плавно)
   bg.pan(x)              сдвиг карусели, -1..1
   bg.look(x, y)          курсор, -1..1
   bg.pause(on)

   Картинки из art/bg/ (sky, city_far, city_near, floor) подхватываются, если они есть;
   пока их нет, всё рисуется кодом. */
(function(){
'use strict';

window.HubBG=function(THREE,wrap,ART){
  var renderer;
  try{renderer=new THREE.WebGLRenderer({antialias:false,alpha:false,powerPreference:'low-power'});}catch(e){return null;}
  var lowEnd=(navigator.hardwareConcurrency||4)<=4||Math.min(screen.width,screen.height)<500;
  renderer.setPixelRatio(Math.min(lowEnd?1:1.5,window.devicePixelRatio||1));
  renderer.setClearColor(0x050510,1);
  var cv=renderer.domElement;cv.className='bg3d';
  wrap.appendChild(cv);

  var scene=new THREE.Scene();
  scene.fog=new THREE.Fog(0x0b0420,40,150);
  var cam=new THREE.PerspectiveCamera(55,1,0.5,400);
  cam.position.set(0,6,30);

  var accent=new THREE.Color('#00e5ff'),accentTo=new THREE.Color('#00e5ff');
  var loader=new THREE.TextureLoader();
  function tryTex(name,cb){
    if(!ART)return;
    loader.load(ART+'bg/'+name+'.webp',function(t){t.colorSpace=THREE.SRGBColorSpace;cb(t);},undefined,function(){});
  }

  /* ── небо: градиент, звёзды и полосатое солнце в шейдере ── */
  var skyU={uAccent:{value:accent},uTime:{value:0},uMap:{value:null},uHasMap:{value:0}};
  var sky=new THREE.Mesh(new THREE.PlaneGeometry(480,270),new THREE.ShaderMaterial({
    uniforms:skyU,depthWrite:false,fog:false,
    vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
    fragmentShader:[
      'uniform vec3 uAccent;uniform float uTime;uniform sampler2D uMap;uniform float uHasMap;varying vec2 vUv;',
      'float h(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}',
      'void main(){',
      '  vec2 uv=vUv;',
      '  if(uHasMap>0.5){gl_FragColor=texture2D(uMap,uv);return;}',
      '  vec3 top=vec3(0.02,0.02,0.06),hor=vec3(0.18,0.04,0.22);',
      '  vec3 c=mix(hor,top,smoothstep(0.38,0.95,uv.y));',
      /* звёзды */
      '  vec2 g=floor(uv*vec2(260.0,130.0));float s=h(g);',
      '  float tw=0.6+0.4*sin(uTime*2.0+s*40.0);',
      '  c+=vec3(step(0.996,s)*tw*smoothstep(0.45,0.8,uv.y));',
      /* солнце: круг с горизонтальными прорезями внизу */
      '  vec2 sp=(uv-vec2(0.5,0.42))*vec2(2.0,1.0);float d=length(sp);',
      '  float sun=smoothstep(0.155,0.15,d);',
      '  float band=step(0.0,sin((uv.y-uTime*0.01)*260.0))+step(0.47,uv.y);',
      '  sun*=clamp(band,0.0,1.0);',
      '  vec3 sc=mix(vec3(1.0,0.18,0.47),vec3(1.0,0.82,0.23),smoothstep(0.30,0.55,uv.y));',
      '  c=mix(c,sc,sun);',
      '  c+=uAccent*0.35*exp(-d*7.0)+vec3(1.0,0.18,0.47)*0.25*exp(-abs(uv.y-0.4)*18.0);',
      '  gl_FragColor=vec4(c,1.0);',
      '}'].join('\n')
  }));
  sky.position.set(0,58,-160);scene.add(sky);
  tryTex('sky',function(t){skyU.uMap.value=t;skyU.uHasMap.value=1;});

  /* ── город: силуэты зданий с окнами на canvas ── */
  function cityTex(seed,far){
    var c=document.createElement('canvas');c.width=1024;c.height=256;
    var g=c.getContext('2d'),r=seed;
    function rnd(){r=(r*16807)%2147483647;return r/2147483647;}
    var x=0;
    while(x<1024){
      var w=30+rnd()*70,h=(far?60:90)+rnd()*(far?150:160);
      g.fillStyle=far?'#1a0d33':'#0c0a1e';g.fillRect(x,256-h,w,h);
      /* окна */
      for(var wy=256-h+8;wy<250;wy+=9)for(var wx=x+5;wx<x+w-5;wx+=8)
        if(rnd()<(far?0.12:0.18)){g.fillStyle=rnd()<0.5?'rgba(0,229,255,.7)':rnd()<0.5?'rgba(255,45,120,.7)':'rgba(255,210,58,.6)';g.fillRect(wx,wy,3,4);}
      /* неоновая полоса на крыше */
      if(!far&&rnd()<0.4){g.fillStyle=rnd()<0.5?'#00e5ff':'#ff2d78';g.fillRect(x+4,256-h,w-8,3);}
      if(rnd()<0.3){g.fillStyle=far?'#1a0d33':'#0c0a1e';g.fillRect(x+w/2-1,256-h-20,2,20);}
      x+=w+(rnd()<0.3?rnd()*20:0);
    }
    var t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.wrapS=THREE.RepeatWrapping;return t;
  }
  /* слой: пока нет картинки, рисованный город (повторяется дважды); картинка встаёт со своими пропорциями */
  function layer(tex,w,h,z,y,name,artW,artY){
    var m=new THREE.Mesh(new THREE.PlaneGeometry(1,1),new THREE.MeshBasicMaterial({map:tex,transparent:true,depthWrite:false,fog:true}));
    m.scale.set(w,h,1);m.position.set(0,y,z);scene.add(m);
    tex.repeat.set(2,1);
    tryTex(name,function(t){
      var a=t.image.width/t.image.height;
      m.material.map=t;m.material.needsUpdate=true;
      m.scale.set(artW,artW/a,1);m.position.y=artY+artW/a/2;
    });
    return m;
  }
  /* нижний край слоя чуть ниже пола, его закрывает сетка */
  var far=layer(cityTex(7,true),340,85,-120,30,'city_far',300,-6);
  var near=layer(cityTex(91,false),220,55,-70,17,'city_near',190,-4);
  /* ── пол: сетка бежит к камере ── */
  var floorU={uAccent:{value:accent},uTime:{value:0},fogColor:{value:new THREE.Color(0x0b0420)},fogNear:{value:40},fogFar:{value:150}};
  var floor=new THREE.Mesh(new THREE.PlaneGeometry(400,300,1,1),new THREE.ShaderMaterial({
    uniforms:floorU,
    vertexShader:'varying vec2 vW;varying float vD;void main(){vec4 w=modelMatrix*vec4(position,1.0);vW=w.xz;vec4 mv=viewMatrix*w;vD=-mv.z;gl_Position=projectionMatrix*mv;}',
    fragmentShader:[
      'uniform vec3 uAccent;uniform float uTime;uniform vec3 fogColor;uniform float fogNear;uniform float fogFar;varying vec2 vW;varying float vD;',
      'void main(){',
      '  vec2 p=vW/vec2(6.0,6.0);p.y+=uTime*0.6;',
      '  vec2 gr=abs(fract(p-0.5)-0.5)/fwidth(p);',
      '  float line=1.0-min(min(gr.x,gr.y),1.0);',
      '  vec3 base=vec3(0.02,0.01,0.05);',
      '  vec3 c=base+uAccent*line*0.9+vec3(1.0,0.18,0.47)*0.05;',
      '  float f=smoothstep(fogNear,fogFar,vD);',
      '  gl_FragColor=vec4(mix(c,fogColor,f),1.0);',
      '}'].join('\n'),
    extensions:{derivatives:true}
  }));
  floor.rotation.x=-Math.PI/2;floor.position.set(0,0,-100);scene.add(floor);

  /* ── пыль ── */
  var N=lowEnd?120:260,pos=new Float32Array(N*3),spd=new Float32Array(N);
  for(var i=0;i<N;i++){pos[i*3]=(Math.random()-0.5)*120;pos[i*3+1]=Math.random()*40;pos[i*3+2]=-Math.random()*90+20;spd[i]=0.3+Math.random()*0.8;}
  var pg=new THREE.BufferGeometry();pg.setAttribute('position',new THREE.BufferAttribute(pos,3));
  var dot=document.createElement('canvas');dot.width=dot.height=32;
  var dg=dot.getContext('2d'),rg=dg.createRadialGradient(16,16,0,16,16,16);rg.addColorStop(0,'rgba(255,255,255,1)');rg.addColorStop(1,'rgba(255,255,255,0)');
  dg.fillStyle=rg;dg.fillRect(0,0,32,32);
  var pmat=new THREE.PointsMaterial({size:0.6,map:new THREE.CanvasTexture(dot),transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,color:accent.clone()});
  var points=new THREE.Points(pg,pmat);scene.add(points);

  /* ── управление камерой ── */
  var lookX=0,lookY=0,panX=0,camX=0,camY=0,camP=0,paused=false,t0=performance.now(),last=t0;
  function size(){
    var w=wrap.clientWidth||window.innerWidth,h=wrap.clientHeight||window.innerHeight;
    renderer.setSize(w,h,false);cv.style.width=w+'px';cv.style.height=h+'px';
    cam.aspect=w/h;cam.fov=w<h?70:55;cam.updateProjectionMatrix();
  }
  size();
  var reduce=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function frame(now){
    requestAnimationFrame(frame);
    if(paused||document.hidden)return;
    var dt=Math.min(0.05,(now-last)/1000);last=now;
    var tm=(now-t0)/1000;
    accent.lerp(accentTo,Math.min(1,dt*3));
    pmat.color.copy(accent);
    skyU.uTime.value=tm;floorU.uTime.value=reduce?0:tm;
    camX+=(lookX*3-camX)*Math.min(1,dt*2);camY+=(lookY*1.5-camY)*Math.min(1,dt*2);
    camP+=(panX*6-camP)*Math.min(1,dt*3);
    cam.position.set(camX+camP,6+camY,30);
    cam.lookAt(camX*0.3+camP*0.6,8,-60);
    if(!reduce){
      var a=pg.attributes.position.array;
      for(var i=0;i<N;i++){a[i*3+1]+=spd[i]*dt;a[i*3+2]+=spd[i]*dt*2;if(a[i*3+1]>40||a[i*3+2]>25){a[i*3+1]=0;a[i*3+2]=-70;}}
      pg.attributes.position.needsUpdate=true;
    }
    renderer.render(scene,cam);
  }
  requestAnimationFrame(frame);
  window.addEventListener('resize',size);

  return {
    accent:function(hex){accentTo.set(hex);},
    pan:function(x){panX=Math.max(-1,Math.min(1,x));},
    look:function(x,y){lookX=x;lookY=y;},
    pause:function(on){paused=on;},
    canvas:cv
  };
};
})();
