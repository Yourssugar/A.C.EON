/* Aceonium: посохи. Твёрдые предметы, собираются кодом с рисованными текстурами.
   Staffs.make(THREE, kind) -> S
     S.group      посох вертикально по +y, хват руки в y=0, навершие около y=1.15
     S.core       группа навершия (отсюда летят всплески)
     S.coreMat    материал с цветом магии (для цвета всплесков)
     S.setTier(n, colors), S.update(dt, glow, kick)
   Виды: gnarled (узловатый), crystal (кристалл), bone (костяной), iron (рунный), branch (живая ветвь). */
(function(){
'use strict';

var T=null,U=null,cache={};

function std(o){return new T.MeshStandardMaterial(o);}
function metalMaps(){
  if(cache.metal)return cache.metal;
  var R=U.prng(91),c=U.cnv(128,256),g=c.getContext('2d');
  g.fillStyle='#8a8f9a';g.fillRect(0,0,128,256);
  for(var i=0;i<400;i++){g.fillStyle='rgba('+(R()<0.5?'255,255,255':'0,0,0')+','+(R()*0.12)+')';g.fillRect(R()*128,R()*256,1+R()*30,1);}
  for(var k=0;k<5;k++){var y=30+k*48;g.fillStyle='rgba(20,20,26,.55)';g.fillRect(0,y,128,3);}
  var map=U.texFrom(c,true,true);
  var nm=U.texFrom(U.normalFromHeight(c,1.5),false,true);
  cache.metal={map:map,normalMap:nm};return cache.metal;
}
function boneMaps(){
  if(cache.bone)return cache.bone;
  var R=U.prng(13),c=U.cnv(128,256),g=c.getContext('2d');
  g.fillStyle='#e6dcc6';g.fillRect(0,0,128,256);
  for(var i=0;i<120;i++){g.strokeStyle='rgba(120,100,70,'+(0.05+R()*0.15)+')';g.lineWidth=0.6+R()*1.5;var x=R()*128;g.beginPath();g.moveTo(x,R()*256);g.lineTo(x+(R()-0.5)*6,R()*256);g.stroke();}
  for(var p=0;p<60;p++){g.fillStyle='rgba(90,70,40,'+(0.1+R()*0.2)+')';g.beginPath();g.arc(R()*128,R()*256,0.6+R()*1.5,0,6.3);g.fill();}
  var map=U.texFrom(c,true,true);var nm=U.texFrom(U.normalFromHeight(c,2),false,true);
  cache.bone={map:map,normalMap:nm};return cache.bone;
}
function runeTex(){
  if(cache.rune)return cache.rune;
  var R=U.prng(7),c=U.cnv(256,32),g=c.getContext('2d');
  g.fillStyle='#000';g.fillRect(0,0,256,32);
  g.strokeStyle='#fff';g.lineWidth=2;g.lineCap='round';
  for(var i=0;i<12;i++){
    var x=10+i*21;g.beginPath();
    for(var s=0;s<3;s++){var a=x+R()*12,b=4+R()*24,c2=x+R()*12,d=4+R()*24;g.moveTo(a,b);g.lineTo(c2,d);}
    g.stroke();
  }
  cache.rune=U.texFrom(c,true,true);return cache.rune;
}

/* навершие: стеклянная сфера с галактикой, блик, искры, свечение, свет, кольца ступеней */
function makeOrb(S,y,r){
  var core=new T.Group();core.position.set(0,y,0);S.group.add(core);S.core=core;
  S.coreMat=new T.MeshBasicMaterial({color:0x00e5ff,transparent:true,opacity:0.22,depthWrite:false});
  core.add(new T.Mesh(new T.SphereGeometry(r*0.92,28,20),S.coreMat));
  S.shellMat=new T.ShaderMaterial({
    uniforms:{col:{value:new T.Color(0x80f0ff)},k:{value:1}},
    vertexShader:'varying vec3 vN;varying vec3 vV;void main(){vec4 mv=modelViewMatrix*vec4(position,1.0);vN=normalize(normalMatrix*normal);vV=normalize(-mv.xyz);gl_Position=projectionMatrix*mv;}',
    fragmentShader:'uniform vec3 col;uniform float k;varying vec3 vN;varying vec3 vV;void main(){float f=pow(1.0-abs(dot(vN,vV)),2.2);gl_FragColor=vec4(col*(0.08+f*1.6)*k,1.0);}',
    transparent:true,blending:T.AdditiveBlending,depthWrite:false
  });
  core.add(new T.Mesh(new T.SphereGeometry(r,32,24),S.shellMat));
  S.galMat=new T.SpriteMaterial({map:U.galaxyTex(),color:0xffffff,transparent:true,blending:T.AdditiveBlending,depthWrite:false});
  S.gal=new T.Sprite(S.galMat);S.gal.scale.set(r*1.85,r*1.85,1);core.add(S.gal);
  addGlow(S,core,r);
}
function addGlow(S,core,r){
  var spark=new T.Sprite(new T.SpriteMaterial({map:U.glowTex(),color:0xffffff,transparent:true,opacity:0.9,blending:T.AdditiveBlending,depthWrite:false}));
  spark.scale.set(r*0.4,r*0.4,1);spark.position.set(-r*0.4,r*0.45,r*0.7);core.add(spark);
  S.coreGlow=new T.Sprite(new T.SpriteMaterial({map:U.glowTex(),color:0x00e5ff,transparent:true,opacity:0.8,blending:T.AdditiveBlending,depthWrite:false}));
  S.coreGlow.scale.set(r*5.5,r*5.5,1);core.add(S.coreGlow);
  S.coreLight=new T.PointLight(0x00e5ff,1.2,5,1.6);core.add(S.coreLight);
  S.motes=[];var R=U.prng(17);
  for(var i=0;i<6;i++){var s=new T.Sprite(new T.SpriteMaterial({map:U.glowTex(),color:0x9ff4ff,transparent:true,blending:T.AdditiveBlending,depthWrite:false}));s.scale.set(0.035,0.035,1);s.userData={a:R()*6,r:r*1.35+R()*0.06,y:(R()-0.5)*0.15,s:0.8+R()*1.2};core.add(s);S.motes.push(s);}
  S.rings=[];
  for(var k=0;k<3;k++){var ring=new T.Mesh(new T.TorusGeometry(r*1.55+k*0.05,0.006,6,48),new T.MeshBasicMaterial({color:0x00e5ff,transparent:true,opacity:0.8,blending:T.AdditiveBlending,depthWrite:false}));ring.visible=false;core.add(ring);S.rings.push(ring);}
  S.fightRing=new T.Mesh(new T.TorusGeometry(r*2.3,0.01,6,48),new T.MeshBasicMaterial({color:0x00e5ff,transparent:true,opacity:0,blending:T.AdditiveBlending,depthWrite:false}));
  core.add(S.fightRing);
}

function gnarled(S){
  var bark=U.barkMaps(),wood=std({color:0xb08a68,map:bark.map,normalMap:bark.normalMap,roughness:0.9});
  var sp=[],R=U.prng(3);
  for(var i=0;i<=10;i++)sp.push(new T.Vector3((R()-0.5)*0.05+Math.sin(i*1.3)*0.015,-0.85+i*0.19,(R()-0.5)*0.05));
  S.group.add(new T.Mesh(U.taperTube(sp,40,0.034,0.028,8,0.18),wood));
  for(var kn=2;kn<10;kn+=2){var k=new T.Mesh(new T.SphereGeometry(0.043,8,6),wood);k.position.copy(sp[kn]);k.scale.set(1,1.5,0.9);S.group.add(k);}
  for(var c=0;c<5;c++){
    var a=c/5*Math.PI*2+0.3,cp=[];
    for(var j=0;j<=5;j++){var t=j/5,rad=0.025+Math.sin(t*Math.PI*0.92)*0.15;cp.push(new T.Vector3(Math.cos(a+t*0.9)*rad,1.0+t*0.33,Math.sin(a+t*0.9)*rad));}
    S.group.add(new T.Mesh(U.taperTube(cp,14,0.03,0.01,6,0.15),wood));
  }
  makeOrb(S,1.17,0.13);
}
function crystal(S){
  var bark=U.barkMaps(),wood=std({color:0x4a3428,map:bark.map,normalMap:bark.normalMap,roughness:0.75});
  var silver=std({color:0xd0d6e0,metalness:0.9,roughness:0.25});
  S.group.add(new T.Mesh(U.taperTube([new T.Vector3(0,-0.85,0),new T.Vector3(0.005,0.1,0),new T.Vector3(0,1.0,0)],20,0.026,0.03,8,0.03),wood));
  [-0.6,-0.05,0.55,0.95].forEach(function(y){var b=new T.Mesh(new T.CylinderGeometry(0.036,0.036,0.04,12),silver);b.position.y=y;S.group.add(b);});
  var cup=new T.Mesh(new T.CylinderGeometry(0.08,0.035,0.12,10,1,true),silver);cup.position.y=1.06;cup.material.side=T.DoubleSide;S.group.add(cup);
  S.core=new T.Group();S.core.position.set(0,1.22,0);S.group.add(S.core);
  S.coreMat=new T.MeshStandardMaterial({color:0x00e5ff,emissive:0x00e5ff,emissiveIntensity:1.4,roughness:0.15,metalness:0.1,transparent:true,opacity:0.92,flatShading:true});
  var R=U.prng(41);
  var mainC=new T.Mesh(new T.OctahedronGeometry(0.075,0),S.coreMat);mainC.scale.set(1,2.6,1);S.core.add(mainC);
  for(var i=0;i<5;i++){var cr=new T.Mesh(new T.OctahedronGeometry(0.04+R()*0.02,0),S.coreMat);var a=i/5*6.28;cr.position.set(Math.cos(a)*0.06,-0.08+R()*0.06,Math.sin(a)*0.06);cr.scale.set(1,2+R(),1);cr.rotation.set((R()-0.5)*0.8,0,Math.cos(a)*0.5);S.core.add(cr);}
  S.shellMat=null;S.galMat=null;
  addGlow(S,S.core,0.1);
}
function bone(S){
  var bm=boneMaps(),mat=std({color:0xffffff,map:bm.map,normalMap:bm.normalMap,roughness:0.6});
  for(var i=0;i<7;i++){
    var y0=-0.85+i*0.27,seg=new T.Mesh(new T.CylinderGeometry(0.028,0.026,0.24,8),mat);seg.position.y=y0+0.12;S.group.add(seg);
    var j=new T.Mesh(new T.SphereGeometry(0.038,10,8),mat);j.position.y=y0+0.25;j.scale.set(1,0.7,1);S.group.add(j);
  }
  for(var c=0;c<4;c++){
    var a=c/4*Math.PI*2+0.4,cp=[];
    for(var k=0;k<=5;k++){var t=k/5,rad=0.03+Math.sin(t*Math.PI*0.95)*0.16;cp.push(new T.Vector3(Math.cos(a)*rad,1.02+t*0.32,Math.sin(a)*rad));}
    S.group.add(new T.Mesh(U.taperTube(cp,12,0.022,0.006,6,0.05),mat));
  }
  makeOrb(S,1.19,0.12);
}
function iron(S){
  var mm=metalMaps(),metal=std({color:0xb8bcc8,map:mm.map,normalMap:mm.normalMap,metalness:0.85,roughness:0.35});
  var shaft=new T.Mesh(new T.CylinderGeometry(0.024,0.03,1.9,10),metal);shaft.position.y=0.1;S.group.add(shaft);
  var runeM=new T.MeshBasicMaterial({map:runeTex(),color:0x00e5ff,transparent:true,blending:T.AdditiveBlending,depthWrite:false});
  S.runeMat=runeM;
  [-0.4,0.25,0.75].forEach(function(y){var r=new T.Mesh(new T.CylinderGeometry(0.0315,0.0315,0.09,24,1,true),runeM);r.position.y=y;S.group.add(r);});
  var grip=new T.Mesh(new T.CylinderGeometry(0.032,0.032,0.3,10),std({color:0x3a2418,roughness:0.9}));grip.position.y=0.02;S.group.add(grip);
  /* полумесяц */
  var cres=new T.Mesh(new T.TorusGeometry(0.16,0.022,8,32,Math.PI*1.35),metal);cres.position.y=1.22;cres.rotation.z=-Math.PI*0.175-Math.PI/2;S.group.add(cres);
  var tip=new T.Mesh(new T.ConeGeometry(0.03,0.12,8),metal);tip.position.y=1.05;tip.rotation.x=Math.PI;S.group.add(tip);
  makeOrb(S,1.22,0.1);
}
function branch(S){
  var bark=U.barkMaps(),wood=std({color:0x8a7050,map:bark.map,normalMap:bark.normalMap,roughness:0.9});
  var leafM=std({color:0x6a9a3a,roughness:0.7,side:T.DoubleSide,flatShading:true});
  var sp=[],R=U.prng(29);
  for(var i=0;i<=9;i++)sp.push(new T.Vector3(Math.sin(i*0.8)*0.03,-0.85+i*0.21,Math.cos(i*0.6)*0.02));
  S.group.add(new T.Mesh(U.taperTube(sp,36,0.036,0.024,8,0.12),wood));
  /* лоза вокруг древка */
  var vp=[];for(var v=0;v<=40;v++){var t=v/40,a=t*14;vp.push(new T.Vector3(Math.cos(a)*0.042,-0.5+t*1.5,Math.sin(a)*0.042));}
  S.group.add(new T.Mesh(U.taperTube(vp,120,0.009,0.006,5,0),std({color:0x4a6a2a,roughness:0.8})));
  var leafG=new T.PlaneGeometry(0.06,0.11);leafG.translate(0,0.055,0);
  for(var l=0;l<16;l++){var lf=new T.Mesh(leafG,leafM);var t2=0.25+R()*0.75,ang=R()*6.28;lf.position.set(Math.cos(ang)*0.045,-0.5+t2*1.5,Math.sin(ang)*0.045);lf.rotation.set((R()-0.5)*1.2,ang,0.8+R()*0.6);S.group.add(lf);}
  for(var c=0;c<3;c++){
    var a2=c/3*Math.PI*2,cp=[];
    for(var k=0;k<=5;k++){var tt=k/5,rad=0.025+Math.sin(tt*Math.PI*0.9)*0.15;cp.push(new T.Vector3(Math.cos(a2+tt*1.4)*rad,1.0+tt*0.34,Math.sin(a2+tt*1.4)*rad));}
    S.group.add(new T.Mesh(U.taperTube(cp,14,0.026,0.008,6,0.1),wood));
  }
  makeOrb(S,1.17,0.12);
}
var KINDS={gnarled:gnarled,crystal:crystal,bone:bone,iron:iron,branch:branch};

function make(THREE,kind){
  T=THREE;MageKit.setThree(THREE);U=MageKit.util;
  var S={group:new T.Group(),kind:KINDS[kind]?kind:'gnarled',tier:-1,t:0,ring:0};
  KINDS[S.kind](S);
  S.group.traverse(function(o){if(o.isMesh&&!(o.material&&o.material.blending===T.AdditiveBlending)){o.castShadow=true;}});
  S.setTier=function(tier,colors){
    if(tier===S.tier)return;S.tier=tier;
    var col=new T.Color(colors[tier%colors.length]);
    if(S.coreMat.emissive){S.coreMat.color.copy(col);S.coreMat.emissive.copy(col);}else S.coreMat.color.copy(col);
    if(S.shellMat)S.shellMat.uniforms.col.value.copy(col).lerp(new T.Color(1,1,1),0.35);
    if(S.galMat)S.galMat.color.copy(col).lerp(new T.Color(1,1,1),0.55).multiplyScalar(1.6);
    if(S.runeMat)S.runeMat.color.copy(col);
    S.coreGlow.material.color.copy(col);S.coreLight.color.copy(col);S.fightRing.material.color.copy(col);
    S.motes.forEach(function(s){s.material.color.copy(col).lerp(new T.Color(1,1,1),0.4);});
    S.core.scale.setScalar(1+Math.min(tier,6)*0.06);
    S.rings.forEach(function(r,i){r.visible=i<Math.min(tier,3);r.material.color.copy(col);});
  };
  S.update=function(dt,glow,kick,fight){
    S.t+=dt;var g=glow+kick*0.8,t=S.t;
    S.coreGlow.scale.setScalar(0.4+g*0.5+Math.sin(t*5)*0.03);
    S.coreGlow.material.opacity=Math.min(1,0.3+g*0.55);
    S.coreLight.intensity=0.4+g*1.6;
    if(S.shellMat)S.shellMat.uniforms.k.value=0.7+g*0.6;
    if(S.galMat){S.galMat.rotation=t*0.35;}
    if(S.coreMat.emissive)S.coreMat.emissiveIntensity=1+g*1.2;
    if(S.runeMat)S.runeMat.opacity=0.5+g*0.5;
    if(S.kind==='crystal')S.core.rotation.y=t*0.5;
    S.motes.forEach(function(s){var u=s.userData,a=u.a+t*u.s;s.position.set(Math.cos(a)*u.r,u.y+Math.sin(a*1.7)*0.05,Math.sin(a)*u.r);s.material.opacity=0.4+0.5*Math.abs(Math.sin(a*2));});
    S.ring+=((fight?1:0)-S.ring)*Math.min(1,dt*6);
    S.fightRing.material.opacity=S.ring*0.7;
    S.fightRing.scale.setScalar(1+Math.sin(t*4)*0.08);
    S.fightRing.rotation.x=t*1.3;S.fightRing.rotation.y=t*0.9;
    S.rings.forEach(function(r,i){r.rotation.x=t*(0.8+i*0.5);r.rotation.y=t*(1.1-i*0.3);});
  };
  S.setTier(0,['#00e5ff']);
  return S;
}

window.Staffs={make:make,kinds:Object.keys(KINDS)};
})();
