/* Aceonium: таверна в 3D, вид сверху с вращением и зумом (v9).
   Модели: Quaternius Medieval Village + Fantasy Props, KayKit Furniture/Resource Bits (CC0).
   Текстуры пола, стен и двора: Poly Haven (CC0). Всё лежит в assets/tavern, качается при первом входе.
   Рендерер общий со сценой дороги (scene3d.js): она вызывает update() и рисует scene/camera отсюда.
   Жители (мастера, хозяйка, путники) собираются из того же набора персонажей, что и маг (avatar.js). */
(function(){
'use strict';

var T=null,GLTF=null,SKU=null,loader=null,BASE='assets/tavern/',SIZES={};
var KIT={},TEXC={},MATS={},res='1k';
var V=null;                 // всё, что относится к построенной сцене
var readyFlag=false,loading=null;

function url(p){return window.Boot?Boot.url(BASE+p):BASE+p;}
function fetchBuf(p,onBytes){
  return fetch(url(p)).then(function(r){
    if(!r.ok)throw new Error(r.status+' '+p);
    if(!r.body||!r.body.getReader)return r.arrayBuffer().then(function(b){onBytes(b.byteLength);return b;});
    var rd=r.body.getReader(),ch=[],got=0;
    function pump(){return rd.read().then(function(x){
      if(x.done){var o=new Uint8Array(got),k=0;ch.forEach(function(c){o.set(c,k);k+=c.length;});return o.buffer;}
      ch.push(x.value);got+=x.value.length;onBytes(x.value.length);return pump();
    });}
    return pump();
  });
}

/* ════════ МАТЕРИАЛЫ ════════ */
/* материал из модели -> набор текстур (имена файлов без _1k.webp) */
var SETS={
  MI_Plaster:{c:'plaster_color',n:'plaster_normal',orm:'plaster_orm'},
  MI_WoodTrim:{c:'woodtrim_color',n:'woodtrim_normal',orm:'woodtrim_orm'},
  MI_WoodTrim_Wear:{c:'woodtrim_color',n:'woodtrim_normal',orm:'woodtrim_orm'},
  MI_RockTrim:{c:'rocktrim_color',n:'rocktrim_normal',orm:'rocktrim_orm'},
  MI_UnevenBrick:{c:'ubrick_color',n:'ubrick_normal',r:'ubrick_rough'},
  MI_Brick:{c:'brick_color',n:'brick_normal'},
  MI_Vine:{c:'vine_color',alpha:true},
  MI_Trim_Metal:{c:'tmetal_color',n:'tmetal_normal',orm:'tmetal_orm',metal:true},
  MI_Trim_Furniture:{c:'tfurn_color',n:'tfurn_normal',orm:'tfurn_orm'},
  MI_Trim_Props:{c:'tprops_color',n:'tprops_normal',orm:'tprops_orm'},
  MI_Trim_Props_Vertex:{c:'tprops_color',n:'tprops_normal',orm:'tprops_orm'},
  MI_RoundTiles:{c:'tiles_color',n:'tiles_normal',r:'tiles_rough'},
  MI_Trim_Cloth:{c:'tcloth_color',n:'tcloth_normal',orm:'tcloth_orm',alpha:true},
  furniture_texture:{c:'kfurn_color'},
  resource:{c:'kres_color'},
  restaurant:{c:'krest_color'},holiday:{c:'kholi_color'},tools:{c:'ktools_color'},weapons:{c:'kweap_color'},
  /* свои поверхности (плоскости и коробки): повторяются */
  floor:{c:'floor_color',n:'floor_normal',r:'floor_rough',rep:true},
  cobble:{c:'cobble_color',n:'cobble_normal',r:'cobble_rough',rep:true},
  yard:{c:'yard_color',n:'yard_normal',r:'yard_rough',rep:true},
  grass:{c:'grass_color',n:'grass_normal',rep:true},
  stone:{c:'stone_color',n:'stone_normal',r:'stone_rough',rep:true},
  fwood:{c:'fwood_color',n:'fwood_normal',rep:true},
  dwood:{c:'dwood_color',n:'dwood_normal',rep:true},
  thatch:{c:'thatch_color',n:'thatch_normal',rep:true}
};
function texList(){
  var s={};for(var k in SETS){var d=SETS[k];['c','n','orm','r'].forEach(function(m){if(d[m])s[d[m]]=1;});}
  return Object.keys(s).map(function(n){return 'tex/'+n+'_'+res+'.webp';});
}
function loadTex(file,onBytes){
  if(TEXC[file])return TEXC[file];
  TEXC[file]=fetchBuf(file,onBytes).then(function(buf){
    var blob=new Blob([buf],{type:'image/webp'});
    return (window.createImageBitmap?createImageBitmap(blob,{imageOrientation:'none'}):new Promise(function(ok,bad){var im=new Image();im.onload=function(){ok(im);};im.onerror=bad;im.src=URL.createObjectURL(blob);}))
      .then(function(img){var t=new T.Texture(img);t.flipY=false;t.anisotropy=8;t.needsUpdate=true;return t;});
  });
  return TEXC[file];
}
function tex(name){return TEXC['tex/'+name+'_'+res+'.webp'];}
/* текстуры уже скачаны к моменту сборки: берём готовые объекты */
var TEXOBJ={};
function mat(key,opt){
  var id=key+(opt&&opt.vc?':vc':'');
  if(MATS[id])return MATS[id];
  var d=SETS[key]||{},m=new T.MeshStandardMaterial({roughness:0.85,metalness:0,side:T.DoubleSide});
  function tx(n,srgb){var t=TEXOBJ[n];if(!t)return null;if(srgb)t.colorSpace=T.SRGBColorSpace;if(d.rep){t.wrapS=t.wrapT=T.RepeatWrapping;}return t;}
  if(d.c)m.map=tx(d.c,true);
  if(d.n)m.normalMap=tx(d.n);
  if(d.orm){var o=tx(d.orm);m.roughnessMap=o;m.aoMap=o;m.aoMapIntensity=0.7;if(d.metal){m.metalnessMap=o;m.metalness=1;}}
  if(d.r)m.roughnessMap=tx(d.r);
  if(d.alpha){m.alphaTest=0.45;m.transparent=false;}
  if(key==='glass'){m=new T.MeshStandardMaterial({color:0xc87a20,roughness:0.15,metalness:0,transparent:true,opacity:0.75});}
  if(key==='MI_WindowGlass'){m=new T.MeshStandardMaterial({color:0x9fc8e8,roughness:0.1,metalness:0,transparent:true,opacity:0.35,emissive:0xffb050,emissiveIntensity:0});V&&(V.glass=m);}
  if(key==='MI_Page_Empty')m.color.set('#e8dcc0');
  if(opt&&opt.vc)m.vertexColors=true;
  MATS[id]=m;return m;
}

/* ════════ ЗАГРУЗКА ════════ */
function init(THREE){
  if(T)return Promise.resolve();
  T=THREE;GLTF=window.AcGLTF(THREE);loader=new GLTF();
  return fetch(url('sizes.json')).then(function(r){return r.json();}).then(function(j){SIZES=j;},function(){SIZES={};});
}
function bytesNeeded(){
  var b=0;['models/tv_build.glb','models/tv_props.glb','models/tv_misc.glb','models/tv_town.glb','models/tv_food.glb'].concat(texList()).forEach(function(f){if(!TEXC[f]&&!KIT[f])b+=SIZES[f]||0;});
  return b;
}
function load(resolution,onProgress){
  if(loading)return loading;
  res=resolution||'1k';
  var files=['models/tv_build.glb','models/tv_props.glb','models/tv_misc.glb','models/tv_town.glb','models/tv_food.glb'],texs=texList();
  var total=0,got=0;files.concat(texs).forEach(function(f){total+=SIZES[f]||200000;});
  function tick(n){got+=n;if(onProgress)onProgress(Math.min(1,got/total),total);}
  var jobs=files.map(function(f){
    return fetchBuf(f,tick).then(function(buf){return new Promise(function(ok,bad){loader.parse(buf,'',ok,bad);});}).then(function(g){
      g.scene.children.forEach(function(n){KIT[n.name]=n;});
    });
  }).concat(texs.map(function(f){return loadTex(f,tick).then(function(t){TEXOBJ[f.replace(/^tex\//,'').replace('_'+res+'.webp','')]=t;});}));
  if(window.Avatar)jobs.push(Avatar.loadExtraClips());
  loading=Promise.all(jobs).then(function(){readyFlag=true;});
  loading.catch(function(e){console.warn('[tavern3d] load failed',e);loading=null;});
  return loading;
}

/* копия модели из набора с нашими материалами */
function model(name){
  var src=KIT[name];if(!src){console.warn('[tavern3d] нет модели',name);return new T.Group();}
  /* модели со скелетом (сундук) копируем вместе с костями, иначе они рисуются в начале координат */
  if(src.userData.skinned===undefined){var sk=false;src.traverse(function(m){if(m.isSkinnedMesh)sk=true;});src.userData.skinned=sk;}
  var o=src.userData.skinned&&window.AcSkel?(SKU||(SKU=window.AcSkel(T))).clone(src):src.clone(true);
  o.traverse(function(m){
    if(!m.isMesh)return;
    var nm=Array.isArray(m.material)?m.material[0].name:m.material.name;
    var vc=!!(m.geometry.attributes.color);
    m.material=mat(nm,{vc:vc});
    m.castShadow=true;m.receiveShadow=true;
  });
  o.position.set(0,0,0);o.rotation.set(0,0,0);o.scale.set(1,1,1);
  return o;
}

/* ════════ ПЛАН ТАВЕРНЫ ════════
   Сетка 2 м. X вправо, Z к зрителю. Главный дом X[-6,8] Z[-5,5]: комната мага слева, зал справа (v16).
   Кухня за северной стеной (зал 1), пивоварня у восточной (после найма пивовара), веранда у входа (зал 2).
   Двор на юге: дорога, склад под навесом слева от дома. Промыслы и дома мастеров вокруг (SITES, HOUSES). */
var DOOR={x:1,z:5};
var PATH_IN=[[1,16.5],[1,6.2]];          // с дороги к двери; дальше по сетке зала (hall.js)
var IN_PT={x:1,z:5.6};                   // точка сразу за дверью снаружи
function HL(){return window.AcHall;}
var ROAD_Z=16.5,ROAD_END=28;   // путники идут по дороге из-за края и сворачивают к двери
function place(o,x,z,rot,y){o.position.set(x,y||0,z);o.rotation.y=rot||0;return o;}

function build(renderer){
  if(V)return V;
  V={renderer:renderer,scene:new T.Scene(),camera:new T.PerspectiveCamera(40,1,0.1,240),walls:[],npcs:{},cust:{},pool:[],sig:'',
     mode:'tavern',az:0.5,pol:0.82,dist:19,target:new T.Vector3(2.2,0,0),goal:{az:0.5,pol:0.82,dist:19,target:new T.Vector3(2.2,0,0)},
     t:0,night:false,labels:{},active:false,fires:[]};
  var s=V.scene;
  s.background=new T.Color(0x8fb4cc);s.fog=new T.Fog(0x8fb4cc,45,125);
  V.hemi=new T.HemisphereLight(0xe0ecff,0x4a5a30,1.3);s.add(V.hemi);
  V.sun=new T.DirectionalLight(0xfff0d8,1.7);V.sun.position.set(14,26,18);V.sun.target.position.set(0,0,6);s.add(V.sun);s.add(V.sun.target);
  V.sun.castShadow=true;var sc=V.sun.shadow.camera;sc.left=-38;sc.right=38;sc.top=38;sc.bottom=-38;sc.near=1;sc.far=90;
  var hq=window.Scene3D&&(Scene3D.quality==='high'||Scene3D.quality==='ultra');V.sun.shadow.mapSize.set(hq?2048:1024,hq?2048:1024);V.sun.shadow.bias=-0.0005;V.sun.shadow.normalBias=0.04;
  V.inner=new T.PointLight(0xffb060,0,18,1.6);V.inner.position.set(2,2.8,-1);s.add(V.inner);
  /* земля и двор */
  var gm=mat('grass');gm.color.set('#c8dc9c');
  var grass=plane(320,320,gm,64);grass.position.y=-0.03;s.add(grass);
  var path=plane(3,11,mat('yard'),1.5,5.5);place(path,1,9.6,0,-0.01);s.add(path);
  /* дорога мимо таверны: по ней приходят и уходят путники */
  var road=plane(200,4,mat('yard'),60,1.2);place(road,0,16.5,0,-0.02);s.add(road);
  var yard=plane(20,4,mat('yard'),6,1.2);place(yard,0,6,0,-0.015);s.add(yard);
  V.layout=new T.Group();s.add(V.layout);
  return V;
}
/* плоскость на земле: повтор текстуры через UV, материал общий */
function plane(w,h,m,ru,rv){
  var g=new T.PlaneGeometry(w,h);g.rotateX(-Math.PI/2);
  var uv=g.attributes.uv;for(var i=0;i<uv.count;i++)uv.setXY(i,uv.getX(i)*(ru||w/2),uv.getY(i)*(rv||ru||h/2));
  var p=new T.Mesh(g,m);p.receiveShadow=true;return p;
}
function box(w,h,d,m,ru){
  var g=new T.BoxGeometry(w,h,d);
  if(ru){var uv=g.attributes.uv;for(var i=0;i<uv.count;i++)uv.setXY(i,uv.getX(i)*ru,uv.getY(i)*ru);}
  var b=new T.Mesh(g,m);b.castShadow=true;b.receiveShadow=true;return b;
}

/* стена из модуля 2 м; out - наружу (для прозрачности со стороны камеры), inner - внутренняя, низкая */
function wall(G,kind,x,z,rot,o){
  o=o||{};
  var names={plaster:['Wall_Plaster_Straight','Wall_Plaster_Window_Wide_Round','Wall_Plaster_Door_Round'],
             grid:['Wall_Plaster_WoodGrid','Wall_Plaster_Window_Wide_Round','Wall_Plaster_Door_Round'],
             brick:['Wall_UnevenBrick_Straight','Wall_UnevenBrick_Window_Wide_Round','Wall_UnevenBrick_Door_Round']}[kind];
  var nm=o.door?names[2]:o.win?names[1]:names[0];
  if(o.gap)return;
  var w=place(model(nm),x,z,rot);
  if(o.win){var win=model('Window_Wide_Round1');w.add(win);}
  G.add(w);
  var rec={o:w,n:new T.Vector3(Math.sin(rot),0,Math.cos(rot)),inner:!!o.inner,k:1};
  if(o.inner){w.scale.y=0.42;}
  V.walls.push(rec);
}
/* комната: стороны N/S/W/E со списками дверей, окон, пропусков и признаком "внутренняя" */
function room(G,x0,x1,z0,z1,kind,o){
  o=o||{};
  function side(key,along,fixed,rot,isX){
    var so=o[key]||{};if(so.skip)return;
    for(var a=along[0]+1;a<along[1];a+=2){
      var opt={door:(so.door||[]).indexOf(a)>=0,win:(so.win||[]).indexOf(a)>=0,gap:(so.gap||[]).indexOf(a)>=0,inner:!!so.inner};
      if(isX)wall(G,so.kind||kind,a,fixed,rot,opt);else wall(G,so.kind||kind,fixed,a,rot,opt);
    }
  }
  side('N',[x0,x1],z0,Math.PI,true);
  side('S',[x0,x1],z1,0,true);
  side('W',[z0,z1],x0,-Math.PI/2,false);
  side('E',[z0,z1],x1,Math.PI/2,false);
  if(o.floor!==false){var f=plane(x1-x0,z1-z0,mat(o.floor||'floor'),(x1-x0)/2.5,(z1-z0)/2.5);place(f,(x0+x1)/2,(z0+z1)/2,0,0.01);G.add(f);}
  if(o.corners!==false)[[x0,z0],[x1,z0],[x0,z1],[x1,z1]].forEach(function(c){G.add(place(model(kind==='brick'?'Corner_Exterior_Brick':'Corner_Exterior_Wood'),c[0],c[1]));});
}
function prop(G,name,x,z,rot,y,sc){var o=place(model(name),x,z,rot,y);if(sc)o.scale.setScalar(sc);G.add(o);return o;}
/* v25: вещь на стене (флаг, фонарь, полка): прячется вместе со стеной, когда та опускается к камере. nx, nz - наружу от стены */
function wprop(G,name,x,z,rot,y,nx,nz,sc){var o=prop(G,name,x,z,rot,y,sc);V.walls.push({o:o,n:new T.Vector3(nx,0,nz),prop:true,k:1});return o;}
/* мелочь KayKit (еда, инструменты, оружие): в паке всё примерно вдвое крупнее нашего масштаба */
function kprop(G,name,x,z,rot,y,sc,rx){var o=prop(G,name,x,z,rot,y,sc||0.35);if(rx)o.rotation.x=rx;return o;}

/* полная пересборка по состоянию игры (v16: дом больше, кухня, пивоварня, веранда).
   v25: столы и декор стоят по S.furn (мебель зала, js/hall.js), рисуются отдельно от неподвижной части (furnSync) */
function decorTier(S){var p=window.acGame?acGame.decorPts():0;return p>=45?3:p>=25?2:p>=10?1:0;}
function layout(S){
  var G=V.layout;
  G.traverse(function(o){if(o.userData&&o.userData.merged)o.geometry.dispose();});
  while(G.children.length)G.remove(G.children[0]);
  V.walls.length=0;V.fires.length=0;
  var B=S.build,TV=S.tav||{seats:2,brewer:{},cook:{}};
  var hall=B.hall||0,bed=B.bedroom||0,decor=decorTier(S),kitchen=hall>=1,brew=!!(TV.brewer&&TV.brewer.hired),veranda=hall>=2,cl=S.counter||1;
  var st=V.st={},keep=[];V.wpiles={brewer:[],cook:[]};V.vroof=null;
  /* главный дом: X[-6,8] Z[-5,5], комната мага слева до X=-2, зал 10 x 10 */
  room(G,-6,8,-5,5,'plaster',{
    N:{skip:true},
    S:{win:[-5,-3,3,5,7],door:[1]},
    W:{win:[-2,2]},
    E:{skip:true}
  });
  /* стены к кухне и пивоварне низкие (как перегородка у мага), чтобы сверху было видно, кто там работает */
  [-5,-3,-1,1,3,5,7].forEach(function(x){
    var shared=kitchen&&x>=-1&&x<=3;
    if(shared&&x===-1)return;
    wall(G,'plaster',x,-5,Math.PI,{win:!shared&&x!==-1&&x!==1&&x!==3,inner:shared});
  });
  [-4,-2,0,2,4].forEach(function(z){
    var shared=brew&&z<=0;
    if(shared&&z===0)return;
    wall(G,'plaster',8,z,Math.PI/2,{win:!shared&&(z===-2||z===2||z===4&&brew),inner:shared});
  });
  /* стена между комнатой мага и залом: низкая, с проходом */
  for(var zz=-4;zz<5;zz+=2)if(zz!==2)wall(G,'plaster',-2,zz,Math.PI/2,{inner:true});
  /* камин у северной стены */
  var hearth=box(2.2,1.2,0.8,mat('stone'),1);place(hearth,3,-4.45,0,0.6);G.add(hearth);
  var mouth=box(1.1,0.75,0.3,new T.MeshBasicMaterial({color:0x140804}));place(mouth,3,-4.1,0,0.42);G.add(mouth);
  var mantel=box(2.5,0.14,0.95,mat('dwood'),1);place(mantel,3,-4.4,0,1.27);G.add(mantel);
  var chim=box(1.2,1.9,0.6,mat('stone'),1);place(chim,3,-4.65,0,2.15);G.add(chim);
  fire(G,3,0.18,-4.0,1.0);
  /* стойка и хозяйка */
  var cnt=box(2.8,1.0,0.6,mat('fwood'),1.2);place(cnt,6.0,-2.6,0,0.5);G.add(cnt);
  var top=box(3.0,0.08,0.75,mat('dwood'),1.2);place(top,6.0,-2.6,0,1.04);G.add(top);
  prop(G,'Mug',5.3,-2.55,0,1.08);prop(G,'Mug',6.6,-2.65,0.6,1.08);
  wprop(G,'Shelf_Simple',6.1,-4.75,0,1.4,0,-1);prop(G,'Barrel_Holder',7.3,-4.2,0);wprop(G,'Bottle_1',5.7,-4.7,0,1.45,0,-1);
  /* стойка по уровню (v25): больше посуды, бочек и блеска */
  if(cl>=2){prop(G,'Mug',5.8,-2.5,1.2,1.08);wprop(G,'Shelf_Simple',4.9,-4.75,0,1.4,0,-1);wprop(G,'Bottle_1',4.7,-4.7,0,1.45,0,-1);wprop(G,'Bottle_1',5.1,-4.7,0.5,1.45,0,-1);}
  if(cl>=3){prop(G,'Barrel_Holder',4.7,-4.2,0);prop(G,'Chalice',7.0,-2.6,0,1.08);}
  if(cl>=4){prop(G,'CandleStick_Triple',4.9,-2.6,0,1.08);wprop(G,'Shelf_Small_Bottles',6.1,-4.82,0,1.9,0,-1);}
  if(cl>=5){prop(G,'Coin_Pile',6.2,-2.6,0,1.08);wprop(G,'Banner_1',3.9,-4.82,0,2.2,0,-1);}
  st.hostess={x:6.0,z:-3.6,rot:0};
  /* уголок мага у камина (v25): стул, ковёр, столик */
  var MG=HL().MAGE;
  prop(G,'Chair_1',MG.x,MG.z,MG.rot);var hr=rugMesh(1,1.7,0.9);place(hr,2.3,-3.5,0.1,0.02);G.add(hr);
  prop(G,'Nightstand_Shelf',0.45,-4.55,0.3);prop(G,'Candle_1',0.45,-4.55,0,1.21);prop(G,'Mug',0.35,-4.5,0,1.21);
  /* хлам в западной части зала до первого улучшения */
  if(!hall){
    prop(G,'Crate_Wooden',-1.4,-3.2,0.3);prop(G,'Crate_Wooden',-1.5,-2.3,1.1);prop(G,'Prop_Crate',-0.7,-0.6,0.4);prop(G,'Barrel',-1.5,0.6,0);
    prop(G,'Wood_Planks_Stack_Small',-1.0,2.2,0.2);prop(G,'Barrel',-0.5,3.2,0.7);prop(G,'Crate_Wooden',-1.5,4.2,0.6);prop(G,'Bucket_Wooden_1',-0.4,-1.8,0);
    var cob=box(1.9,0.03,9.6,new T.MeshStandardMaterial({color:0x5a4a3a,roughness:1,transparent:true,opacity:0.35}));cob.castShadow=false;place(cob,-1,0,0,0.02);G.add(cob);
  }
  /* комната мага */
  prop(G,bed>=3?'Bed_Twin2':'Bed_Twin1',-4.6,-3.6,Math.PI/2);
  prop(G,'Nightstand_Shelf',-5.55,-1.95,Math.PI/2);prop(G,'Candle_1',-5.55,-1.95,0,0.6);
  prop(G,'Chest_Wood',-2.9,-4.4,0);
  prop(G,'Chair_1',-3.4,3.6,Math.PI*0.8);prop(G,'Table_Plate',-3.0,4.4,0,0);
  st.mageSit={x:MG.x,z:MG.z,rot:MG.rot};
  st.mageBed={x:-4.6,z:-3.6,rot:Math.PI/2};
  if(bed>=1){var br=rugMesh(1,2.6,1.7);place(br,-4,1.0,0,0.02);G.add(br);}
  if(bed>=2)prop(G,'Bookcase_2',-5.6,3.0,Math.PI/2);
  if(bed>=4)prop(G,'CandleStick',-3.2,-4.5,0,0.69);
  /* убранство на стенах растёт с очками декора (v25) */
  if(decor>=1){wprop(G,'Banner_1',-1.6,-4.82,0,2.2,0,-1);wprop(G,'Lantern_Wall',7.8,2.6,-Math.PI/2,1.9,1,0);}
  if(decor>=2){wprop(G,'Lantern_Wall',-1.8,4.75,Math.PI,1.9,0,1);prop(G,'Prop_Vine2',-6.1,5.1,0);var mr=rugMesh(2,2.6,1.8);place(mr,-4.2,-0.6,0,0.02);G.add(mr);}
  if(decor>=3){wprop(G,'Banner_2',0.2,-4.82,0,2.2,0,-1);prop(G,'Prop_Vine5',8.1,5.1,0);}
  /* кухня (зал 1): за северной стеной */
  if(kitchen){
    room(G,-2,4,-9,-5,'brick',{S:{skip:true},N:{win:[1]},W:{win:[-7]},E:{win:[-7]},floor:'cobble'});
    var stove=box(1.6,0.9,0.9,mat('stone'),1);place(stove,2.6,-8.4,0,0.45);G.add(stove);
    fireSprite(G,2.6,0.92,-8.3,0.8);
    prop(G,'Cauldron',0.4,-8.3,0);prop(G,'Table_Large',0.8,-6.6,Math.PI/2);prop(G,'Shelf_Simple',3.95,-6.8,-Math.PI/2,1.4);
    prop(G,'Barrel',3.4,-5.6,0);prop(G,'FarmCrate_Apple',-1.3,-8.3,0.2);
    /* запас блюд на столе */
    var FOOD=['food_stew','food_dinner','food_ingredient_ham_cooked','food_ingredient_bun','food_stew','food_ingredient_cheese'];
    [[0.55,-7.25],[0.55,-6.6],[0.55,-5.95],[1.05,-7.0],[1.05,-6.3],[1.05,-5.85]].forEach(function(q,i){var o=place(model(FOOD[i]),q[0],q[1],i*0.7,0.82);o.scale.setScalar(FOOD[i]==='food_dinner'?0.22:0.28);G.add(o);V.wpiles.cook.push(o);keep.push(o);});
    kprop(G,'crate_carrots',-1.3,-6.0,0.3,0,0.36);kprop(G,'crate_ham',3.3,-8.5,0,0.9,0.3);kprop(G,'crate_potatoes',-1.3,-5.3,1.2,0,0.34);
    kprop(G,'pot_A_stew',2.3,-8.4,0,0.9,0.36);kprop(G,'pan_A',3.0,-8.35,0.6,0.9,0.32);kprop(G,'cuttingboard',0.8,-7.6,Math.PI/2,0.82,0.3);
    kprop(G,'jar_A_medium',3.85,-6.4,0,1.42,0.3);kprop(G,'jar_B_small',3.85,-7.1,0,1.42,0.3);
    st.cook={x:2.6,z:-7.6,rot:Math.PI};
    st.cookHelp=[[1.6,-6.6,-Math.PI/2],[0.4,-7.6,Math.PI],[-1.0,-7.6,Math.PI/2],[3.2,-6.4,Math.PI/2],[-0.6,-5.8,0]];
  }else st.cook=null;
  /* пивоварня (после найма пивовара): к восточной стене зала */
  if(brew){
    room(G,8,12,-4,2,'grid',{W:{skip:true},E:{win:[-1]},S:{win:[11]},N:{}});
    var kettle=place(model('Cauldron'),9.4,-3.0,0);kettle.scale.setScalar(1.4);G.add(kettle);fireSprite(G,9.4,0.1,-2.8,0.7);
    prop(G,'Barrel_Holder',11.3,-3.0,-Math.PI/2);prop(G,'Bucket_Wooden_1',10.6,-3.4,0);
    prop(G,'Shelf_Simple',8.2,1.5,Math.PI/2,1.3);[0,1,2].forEach(function(k){kprop(G,'milk',8.25,1.15+k*0.35,0,1.36,0.4);});
    kprop(G,'hot_chocolate',9.8,-3.45,0.4,0.92,0.3);
    [[11.4,-1.4],[11.4,-0.4],[11.4,0.6],[10.5,1.3],[9.5,1.3],[11.4,1.4]].forEach(function(q,i){var o=place(model('Barrel'),q[0],q[1],i,0);G.add(o);V.wpiles.brewer.push(o);keep.push(o);});
    st.brewer={x:9.4,z:-1.9,rot:Math.PI};
    st.brewHelp=[[10.6,-2.2,Math.PI/2],[10.4,0.2,Math.PI/2],[9.0,0.4,-Math.PI/2],[10.2,-0.9,0],[8.8,-0.8,Math.PI]];
  }else st.brewer=null;
  /* веранда (зал 2): настил и навес у входа */
  if(veranda){
    var deck=plane(6.4,4.4,mat('floor'),2.6,1.8);place(deck,5.2,7.2,0,0.04);G.add(deck);
    var roofv=box(6.8,0.08,4.6,mat('fwood'),1);place(roofv,5.2,7.1,0,2.75);roofv.rotation.x=0.12;G.add(roofv);keep.push(roofv);V.vroof=roofv;
    [[2.2,9.2],[8.2,9.2],[2.2,5.3],[8.2,5.3]].forEach(function(c){var po=box(0.14,2.7,0.14,mat('dwood'),1);place(po,c[0],c[1],0,1.35);G.add(po);});
    prop(G,'Prop_WoodenFence_Single',3.2,9.4,0);prop(G,'Prop_WoodenFence_Extension1',7.2,9.4,0);prop(G,'Prop_WoodenFence_Single',8.4,7.2,Math.PI/2);
    if(hall>=5){prop(G,'Lantern_Wall',2.3,9.1,0,2.2);prop(G,'Lantern_Wall',8.1,9.1,0,2.2);}
  }
  if(hall>=5){prop(G,'Banner_2',1,5.12,0,2.2);var fl=natObj('Flower_3_Group',-0.6,5.8,0.6,0,'#7aa834');if(fl)G.add(fl);var fl2=natObj('Flower_4_Group',2.6,5.8,0.55,1,'#86b03e');if(fl2)G.add(fl2);}
  /* склад под навесом слева: по стопке на уровень склада */
  var stacks=['Wood_Log_Stack','Stone_Chunks_Large','Iron_Bars_Stack_Small','Textiles_Stack_Small','Wood_Planks_Stack_Medium','Silver_Bars_Stack_Small','Gold_Bars_Stack_Small'];
  var sx=-8.6;
  var sroof=box(3.4,0.12,6.4,mat('thatch'),1.4);place(sroof,sx,-0.6,0,2.6);sroof.rotation.z=0.16;G.add(sroof);
  prop(G,'Prop_Support',sx+1.5,-3.6,-Math.PI/2);prop(G,'Prop_Support',sx+1.5,2.4,-Math.PI/2);
  for(var i=0;i<Math.min(stacks.length,S.storeLvl+1);i++){
    var px=sx+(i%2)*1.3-0.6,pz=-3+Math.floor(i/2)*1.5;
    prop(G,'Pallet_Wood',px,pz,0);prop(G,stacks[i],px,pz,0.2,0.14);
  }
  st.store={x:sx,z:-0.6};
  /* забор вдоль дороги, проход к двери */
  for(var fx=-9;fx<=9;fx+=2)if(Math.abs(fx-1)>1)prop(G,'Prop_WoodenFence_Single',fx,12.4,0);
  prop(G,'Barrel_Apples',-1.2,5.7,0);prop(G,'Crate_Wooden',-2.2,5.7,0.3);
  if(decor>=2)prop(G,'Stall_Cart_Empty',-2.8,9.8,Math.PI*0.35,0,0.9);
  /* очередь путников перед стойкой: клетки под ней свободны от мебели (hall.js) */
  st.queue=HL().QUEUE;
  /* v22: крыша над домом, кухней и пивоварней; видна только на экране ГОРОД */
  var RG=new T.Group();V.roofG=RG;G.add(RG);keep.push(RG);
  function roofAt(cx,cz,w,d,rot){var H=new T.Group();H.position.set(cx,0,cz);H.rotation.y=rot;RG.add(H);roof(H,w,d,-1,false);}
  roofAt(1,0,10,14,Math.PI/2);
  if(kitchen)roofAt(1,-7,4,6,Math.PI/2);
  if(brew)roofAt(10,-1,4,6,0);
  RG.traverse(function(o){if(o.isMesh){o.castShadow=true;}});
  RG.visible=V.mode==='city';
  mergeStatic(G,null,keep);
  var n=!!V.night;V.night=null;setNight(n);
}
/* огонь без своего света: светящееся пятно (лишние точечные лампы дорого стоят на телефонах) */
function fireSprite(G,x,y,z,size){
  var sp=new T.Sprite(new T.SpriteMaterial({map:glowTex(),color:0xff9040,transparent:true,blending:T.AdditiveBlending,depthWrite:false}));
  sp.position.set(x,y+0.25,z+0.15);sp.scale.set(size,size*0.8,1);G.add(sp);
  V.fires.push({l:null,s:sp,base:1.6,size:size});
}
function mergeStatic(G,keepList,extra){
  G.updateMatrixWorld(true);
  var keep=new Set();
  if(!keepList){V.walls.forEach(function(w){w.o.traverse(function(o){keep.add(o);});});}
  else keepList.forEach(function(k){k.traverse(function(o){keep.add(o);});});
  if(extra)extra.forEach(function(k){k.traverse(function(o){keep.add(o);});});
  var buckets={},victims=[];
  G.traverse(function(o){
    if(!o.isMesh||o.isSkinnedMesh||keep.has(o))return;
    var m=o.material,k=m.uuid;(buckets[k]=buckets[k]||{m:m,list:[]}).list.push(o);victims.push(o);
  });
  var v=new T.Vector3(),nm=new T.Matrix3();
  Object.keys(buckets).forEach(function(k){
    var B=buckets[k],total=0,idx=0,hasUv=true,hasCol=!!B.m.vertexColors;
    B.list.forEach(function(o){var g=o.geometry;total+=g.attributes.position.count;idx+=g.index?g.index.count:g.attributes.position.count;if(!g.attributes.uv)hasUv=false;});
    var P=new Float32Array(total*3),N=new Float32Array(total*3),U=hasUv?new Float32Array(total*2):null,C=hasCol?new Float32Array(total*3):null;
    var I=total>65535?new Uint32Array(idx):new Uint16Array(idx),vo=0,io=0;
    B.list.forEach(function(o){
      var g=o.geometry,pa=g.attributes.position,na=g.attributes.normal,ua=g.attributes.uv,ca=g.attributes.color,n=pa.count;
      nm.getNormalMatrix(o.matrixWorld);
      for(var i=0;i<n;i++){
        v.fromBufferAttribute(pa,i).applyMatrix4(o.matrixWorld);P[(vo+i)*3]=v.x;P[(vo+i)*3+1]=v.y;P[(vo+i)*3+2]=v.z;
        if(na){v.fromBufferAttribute(na,i).applyMatrix3(nm).normalize();N[(vo+i)*3]=v.x;N[(vo+i)*3+1]=v.y;N[(vo+i)*3+2]=v.z;}
        if(U){U[(vo+i)*2]=ua.getX(i);U[(vo+i)*2+1]=ua.getY(i);}
        if(C){if(ca){C[(vo+i)*3]=ca.getX(i);C[(vo+i)*3+1]=ca.getY(i);C[(vo+i)*3+2]=ca.getZ(i);}else{C[(vo+i)*3]=C[(vo+i)*3+1]=C[(vo+i)*3+2]=1;}}
      }
      if(g.index){for(var j=0;j<g.index.count;j++)I[io++]=g.index.getX(j)+vo;}
      else for(var j2=0;j2<n;j2++)I[io++]=j2+vo;
      vo+=n;
    });
    var geo=new T.BufferGeometry();
    geo.setAttribute('position',new T.BufferAttribute(P,3));geo.setAttribute('normal',new T.BufferAttribute(N,3));
    if(U)geo.setAttribute('uv',new T.BufferAttribute(U,2));if(C)geo.setAttribute('color',new T.BufferAttribute(C,3));
    geo.setIndex(new T.BufferAttribute(I,1));geo.computeBoundingSphere();
    var mesh=new T.Mesh(geo,B.m);mesh.castShadow=true;mesh.receiveShadow=true;mesh.userData.merged=true;
    G.add(mesh);
  });
  victims.forEach(function(o){if(o.parent)o.parent.remove(o);});
  if(!keepList)V.walls.forEach(function(w){w.o.traverse(function(o){if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});});
}
/* огонь: свет с мерцанием и пара светящихся пятен */
var glowTexC=null;
function glowTex(){
  if(glowTexC)return glowTexC;
  var c=document.createElement('canvas');c.width=c.height=64;var x=c.getContext('2d');
  var g=x.createRadialGradient(32,32,0,32,32,32);g.addColorStop(0,'rgba(255,255,255,1)');g.addColorStop(0.35,'rgba(255,255,255,0.5)');g.addColorStop(1,'rgba(255,255,255,0)');
  x.fillStyle=g;x.fillRect(0,0,64,64);glowTexC=new T.CanvasTexture(c);return glowTexC;
}
function fire(G,x,y,z,size){
  var l=new T.PointLight(0xff8a30,1.6,9,1.8);l.position.set(x,y+0.5,z+0.3);G.add(l);
  var sp=new T.Sprite(new T.SpriteMaterial({map:glowTex(),color:0xff9040,transparent:true,blending:T.AdditiveBlending,depthWrite:false}));
  sp.position.set(x,y+0.25,z+0.15);sp.scale.set(size,size*0.8,1);G.add(sp);
  V.fires.push({l:l,s:sp,base:1.6,size:size});
}
function setNight(on){
  if(!V||V.night===on)return;
  V.night=on;
  V.hemi.intensity=on?0.6:1.4;V.hemi.color.set(on?0x7088c0:0xe0ecff);
  V.sun.intensity=on?0.45:1.8;V.sun.color.set(on?0x9ab0e8:0xfff0d8);
  V.scene.background.set(on?0x0b1426:0x8fb4cc);V.scene.fog.color.set(on?0x0b1426:0x8fb4cc);
  V.inner.intensity=on?2.2:0.8;
  if(V.glass){V.glass.emissiveIntensity=on?1.2:0;}
}

/* ════════ МЕБЕЛЬ ЗАЛА (v25) ════════
   Каждый предмет - своя группа (не сливается с домом), чтобы в режиме дизайна его можно было двигать.
   Пересобирается только тот предмет, у которого сменился вид (тип, уровень, стройка). */
function furnModel(it,G){
  var t=it.t,lv=it.lv||1;
  function p(n,x,z,r,y,sc){return prop(G,n,x,z,r,y,sc);}
  if(t==='table'){
    if(it.bt||it.q){   /* ещё не поставлен: доски, козлы, молоток */
      p('Wood_Planks_Stack_Small',0,0,0.3);kprop(G,'hammer',0.5,0.4,0.6,0.02,0.35,-Math.PI/2);
      var w=lv===1?1.4:lv===2?2.6:3.6;[-1,1].forEach(function(sd){var b=box(w,0.06,0.08,mat('fwood'),1);place(b,0,sd*0.6,0,0.04);G.add(b);});
      return;
    }
    var sx=lv===1?0.55:lv===3?1.35:1;
    var tb=p('Table_Large',0,0,0);tb.scale.x=sx;
    if(lv===1){p('Stool',0,-0.72,0);p('Stool',0,0.72,0);p('Mug',-0.25,0,0.4,0.82);p('Table_Plate',0.3,0.05,0,0.82);}
    else{
      var b1=p('Bench',0,-0.85,0),b2=p('Bench',0,0.85,Math.PI);b1.scale.x=sx;b2.scale.x=sx;
      p('Mug',-0.6*sx,0.05,0,0.82);p('Table_Plate',0.5*sx,0.1,0,0.82);p('CandleStick_Triple',0,-0.1,0,0.82);
      if(lv===3){p('Mug',1.5,-0.1,1,0.82);p('Table_Plate',-1.4,0.1,0,0.82);p('Bottle_1',0.6,-0.2,0,0.82);}
    }
    return;
  }
  if(t==='rug'){var rg0=rugMesh(lv,2.9,1.9);rg0.position.y=0.015+(it.id%5)*0.002;G.add(rg0);return;}
  if(t==='barrel'){p(lv>=2?'Barrel_Apples':'Barrel',0,0,0);if(lv>=3)p('CandleStick',0,0,0,0.9);return;}
  if(t==='crate'){p('Crate_Wooden',0,0,0);if(lv>=2)p('Mug',0.15,0.1,0,0.88);if(lv>=3){var c2=p('Crate_Wooden',-0.05,-0.05,0.5,0.88);c2.scale.setScalar(0.6);}return;}
  if(t==='vase'){var v=p('Vase_2',0,0,0);if(lv>=3)v.scale.setScalar(1.25);
    if(lv>=2){var fl=natObj('Flower_3_Group',0,0,lv>=3?0.5:0.4,0.3,'#7aa834');if(fl){fl.position.y=lv>=3?0.6:0.45;G.add(fl);}else p('Candle_1',0,0,0,0.5);}
    return;}
  if(t==='chest'){p('Chest_Wood',0,-0.15,0);if(lv>=2)p('Coin_Pile',0.75,0.2,0);if(lv>=3)p('CandleStick',-0.2,-0.1,0,0.44);return;}
  if(t==='dummy'){p('Dummy',0,0,0);if(lv>=2)kprop(G,'shield_B',0.35,0.15,0.5,0.02,0.45);if(lv>=3)kprop(G,'sword_B',-0.35,0.2,-0.4,0.02,0.4);return;}
  if(t==='weapons'){p('WeaponStand',0,0,0);if(lv>=2)kprop(G,'axe_A',0.75,0.1,0.3,0.02,0.42);if(lv>=3)kprop(G,'shield_B',-0.8,0.15,-0.3,0.02,0.45);return;}
  if(t==='bookcase'){p('Bookcase_2',0,-0.25,0);if(lv>=2)p('SmallBottles_1',0.3,-0.25,0,1.02);if(lv>=3)p('Chalice',-0.4,-0.25,0,1.62);return;}
  if(t==='armchair'){var ac=p('armchair',0,0,0,0,0.85);ac.traverse(function(o){if(o.isMesh)o.material=leatherMat();});if(lv>=2)p('pillow_A',0.1,0.05,0.3,0.55);if(lv>=3){var rg=rugMesh(1,1.7,1.2);rg.position.set(0,0.012,0.2);G.add(rg);}return;}
  if(t==='chandelier'){var ch=p('Chandelier',0,0,0,3.05);if(lv>=2)ch.scale.setScalar(lv>=3?1.4:1.2);return;}
}
var LEATHER=null;
function leatherMat(){return LEATHER||(LEATHER=new T.MeshStandardMaterial({color:0x7a3424,roughness:0.75,metalness:0}));}
/* ковры рисуем сами: у KayKit они плоские жёлтые и выбиваются из текстур зала */
var RUGM={};
function rugMat(lv){
  if(RUGM[lv])return RUGM[lv];
  var W=256,H=176,c=document.createElement('canvas');c.width=W;c.height=H;var x=c.getContext('2d');
  var P=[{b:'#6e4228',e:'#4a2a18',f:'#a8734a',g:'#8a5634'},{b:'#7e231d',e:'#3a0f0c',f:'#e0a848',g:'#a83a2a'},{b:'#1d3566',e:'#0e1a36',f:'#f0c060',g:'#3a5aa0'}][lv-1]||{b:'#6e4228',e:'#4a2a18',f:'#a8734a',g:'#8a5634'};
  x.fillStyle=P.b;x.fillRect(0,0,W,H);
  if(lv===1){for(var i=0;i<H;i+=10){x.fillStyle=i%20?P.g:P.e;x.globalAlpha=0.45;x.fillRect(0,i,W,5);}x.globalAlpha=1;
    x.strokeStyle=P.e;x.lineWidth=7;x.beginPath();x.ellipse(W/2,H/2,W/2-14,H/2-14,0,0,Math.PI*2);x.stroke();}
  else{
    x.fillStyle=P.e;x.fillRect(0,0,W,16);x.fillRect(0,H-16,W,16);x.fillRect(0,0,16,H);x.fillRect(W-16,0,16,H);
    x.strokeStyle=P.f;x.lineWidth=4;x.strokeRect(20,20,W-40,H-40);x.lineWidth=2;x.strokeRect(28,28,W-56,H-56);
    x.fillStyle=P.g;for(var k=0;k<W;k+=16){x.beginPath();x.moveTo(k,8);x.lineTo(k+8,2);x.lineTo(k+16,8);x.lineTo(k+8,14);x.fill();x.beginPath();x.moveTo(k,H-8);x.lineTo(k+8,H-14);x.lineTo(k+16,H-8);x.lineTo(k+8,H-2);x.fill();}
    x.fillStyle=P.f;x.beginPath();x.moveTo(W/2,H/2-44);x.lineTo(W/2+70,H/2);x.lineTo(W/2,H/2+44);x.lineTo(W/2-70,H/2);x.closePath();x.fill();
    x.fillStyle=P.b;x.beginPath();x.moveTo(W/2,H/2-30);x.lineTo(W/2+48,H/2);x.lineTo(W/2,H/2+30);x.lineTo(W/2-48,H/2);x.closePath();x.fill();
    if(lv===3){x.fillStyle=P.f;x.beginPath();x.arc(W/2,H/2,14,0,Math.PI*2);x.fill();[[50,48],[W-50,48],[50,H-48],[W-50,H-48]].forEach(function(q){x.beginPath();x.arc(q[0],q[1],9,0,Math.PI*2);x.fill();});}
    else{x.fillStyle=P.g;x.beginPath();x.arc(W/2,H/2,10,0,Math.PI*2);x.fill();}
  }
  /* немного шума, чтобы было похоже на ткань */
  var d=x.getImageData(0,0,W,H),a=d.data;for(var j=0;j<a.length;j+=4){var n=(Math.random()-0.5)*18;a[j]+=n;a[j+1]+=n;a[j+2]+=n;}x.putImageData(d,0,0);
  var t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;t.anisotropy=4;
  return (RUGM[lv]=new T.MeshStandardMaterial({map:t,roughness:1,metalness:0}));
}
function rugMesh(lv,w,d){
  var g=lv===1?new T.CircleGeometry(0.5,40):new T.PlaneGeometry(1,1);
  g.rotateX(-Math.PI/2);var m=new T.Mesh(g,rugMat(lv));m.scale.set(w,1,d);m.receiveShadow=true;return m;
}
function furnSig(it){return it.t+':'+(it.lv||1)+':'+(it.bt||it.q?'b':'');}
/* items - что рисовать (мебель из игры или черновик режима дизайна) */
function furnSync(items){
  if(!V)return;
  if(!V.furnG){V.furnG=new T.Group();V.scene.add(V.furnG);V.furn={};}
  var seen={},changed=false;
  (items||[]).forEach(function(it){
    if(it.st)return;
    seen[it.id]=1;var rec=V.furn[it.id],sg=furnSig(it);
    if(!rec||rec.sig!==sg){
      if(rec)V.furnG.remove(rec.g);
      var g=new T.Group();furnModel(it,g);g.userData.fid=it.id;V.furnG.add(g);rec=V.furn[it.id]={g:g,sig:sg,pos:''};changed=true;
    }
    var c=HL().center(it),ps=c.x+','+c.z+','+c.rot;
    if(rec.pos!==ps){rec.pos=ps;rec.base=c.z>5?0.04:0;rec.g.position.set(c.x,rec.base,c.z);rec.g.rotation.y=c.rot;changed=true;}   /* на веранде настил выше пола */
  });
  for(var id in V.furn)if(!seen[id]){V.furnG.remove(V.furn[id].g);delete V.furn[id];changed=true;}
  if(changed&&V.renderer)V.renderer.shadowMap.needsUpdate=true;
}
/* мебель, по которой сейчас ходят гости: из игры (черновик дизайна на ходьбу не влияет) */
function liveFurn(){return (V&&V.S&&V.S.furn)||[];}
function hallLvl(){return (V&&V.S&&V.S.build&&V.S.build.hall)||0;}
/* путь по залу между точками (обе внутри сетки или у двери) */
function hallPath(from,to){return HL().path(liveFurn(),hallLvl(),from,to);}

/* ── режим дизайна: сетка, подсветка, ввод ── */
var gridTexC=null;
function gridTex(){
  if(gridTexC)return gridTexC;
  var c=document.createElement('canvas');c.width=c.height=64;var x=c.getContext('2d');
  x.fillStyle='rgba(255,255,255,0.10)';x.fillRect(0,0,64,64);x.strokeStyle='rgba(255,255,255,0.75)';x.lineWidth=3;x.strokeRect(1.5,1.5,61,61);
  gridTexC=new T.CanvasTexture(c);return gridTexC;
}
function buildGrid(){
  if(V.gridG){V.scene.remove(V.gridG);V.gridG.traverse(function(o){if(o.geometry)o.geometry.dispose();});}
  var G=new T.Group();V.gridG=G;V.scene.add(G);
  var hall=hallLvl(),cols={free:null,walk:0xffc040,junk:0xff4040};
  var free=[],walk=[],junk=[];
  for(var cz=-5;cz<=9;cz++)for(var cx=-2;cx<=7;cx++){var ty=HL().cell(cx,cz,hall);if(ty==='free')free.push([cx,cz]);else if(ty==='walk')walk.push([cx,cz]);else if(ty==='junk')junk.push([cx,cz]);}
  function quads(list,m,y){
    if(!list.length)return;
    var g=new T.PlaneGeometry(0.96,0.96);g.rotateX(-Math.PI/2);
    var im=new T.InstancedMesh(g,m,list.length),mm=new T.Matrix4();
    list.forEach(function(c,i){mm.makeTranslation(c[0]+0.5,y,c[1]+0.5);im.setMatrixAt(i,mm);});
    im.renderOrder=2;G.add(im);
  }
  quads(free,new T.MeshBasicMaterial({map:gridTex(),transparent:true,depthWrite:false,opacity:0.8}),0.065);
  quads(walk,new T.MeshBasicMaterial({color:cols.walk,transparent:true,opacity:0.3,depthWrite:false}),0.065);
  quads(junk,new T.MeshBasicMaterial({color:cols.junk,transparent:true,opacity:0.42,depthWrite:false}),0.065);
  V.selG=new T.Group();G.add(V.selG);
}
/* подсветка клеток выбранного предмета: зелёная, если можно, красная, если нельзя */
var selMat=null;
function designMark(it,ok){
  if(!V||!V.selG)return;
  while(V.selG.children.length){var o=V.selG.children[0];V.selG.remove(o);o.geometry.dispose();}
  /* предмет приподнят, пока выбран */
  for(var id in V.furn){var r=V.furn[id];r.g.position.y=(r.base||0)+((it&&+id===it.id&&HL().layer(it)!=='floor')?0.12:0);}
  if(!it)return;
  selMat=selMat||{ok:new T.MeshBasicMaterial({color:0x40ff70,transparent:true,opacity:0.45,depthWrite:false}),no:new T.MeshBasicMaterial({color:0xff3030,transparent:true,opacity:0.5,depthWrite:false})};
  HL().cells(it).forEach(function(c){var g=new T.PlaneGeometry(0.98,0.98);g.rotateX(-Math.PI/2);var m=new T.Mesh(g,ok?selMat.ok:selMat.no);m.position.set(c[0]+0.5,0.075,c[1]+0.5);m.renderOrder=3;V.selG.add(m);});
}
var designCb=null;
function setDesign(on,cb){
  if(!V)return;
  V.design=!!on;designCb=on?cb:null;
  if(on){
    V.preDesign={az:V.goal.az,pol:V.goal.pol,dist:V.goal.dist,t:V.goal.target.clone()};
    var hall=hallLvl(),wide=V.camera.aspect<0.9;
    V.goal.az=0;V.goal.pol=0.36;V.goal.dist=wide?(hall>=2?36:28):(hall>=2?23:16.5);V.goal.target.set(hall?2.9:3.9,0,hall>=2?2.8:0);
    buildGrid();
    if(labelHost)labelHost.style.display='none';
  }else{
    if(V.gridG){V.scene.remove(V.gridG);V.gridG=null;V.selG=null;}
    if(V.preDesign){V.goal.az=V.preDesign.az;V.goal.pol=V.preDesign.pol;V.goal.dist=V.preDesign.dist;V.goal.target.copy(V.preDesign.t);}
    if(labelHost&&V.active)labelHost.style.display='';
    furnSync(liveFurn());for(var id in V.furn)V.furn[id].g.position.y=V.furn[id].base||0;
  }
  if(V.renderer)V.renderer.shadowMap.needsUpdate=true;
}
var _ray=null,_ndc=null,_pl=null,_hit=null;
function groundAt(cx,cy){
  if(!V)return null;
  _ray=_ray||new T.Raycaster();_ndc=_ndc||new T.Vector2();_pl=_pl||new T.Plane(new T.Vector3(0,1,0),0);_hit=_hit||new T.Vector3();
  var r=V.renderer.domElement.getBoundingClientRect();
  _ndc.set((cx-r.left)/r.width*2-1,-((cy-r.top)/r.height)*2+1);
  _ray.setFromCamera(_ndc,V.camera);
  return _ray.ray.intersectPlane(_pl,_hit)?{x:_hit.x,z:_hit.z}:null;
}
/* картинка предмета для магазина: рисуем в маленький кадр тем же рендерером */
var THUMB={};
function thumb(t,lv){
  var key=t+':'+lv;if(THUMB[key])return THUMB[key];
  if(!V||!readyFlag)return '';
  var S=128,rt=new T.WebGLRenderTarget(S,S),sc=new T.Scene(),G=new T.Group();
  sc.add(new T.HemisphereLight(0xfff4e0,0x5a4a3a,2.2));var dl=new T.DirectionalLight(0xffffff,1.6);dl.position.set(3,6,4);sc.add(dl);
  furnModel({t:t,lv:lv,id:0},G);sc.add(G);
  var b=new T.Box3().setFromObject(G),sz=b.getSize(new T.Vector3()),c=b.getCenter(new T.Vector3()),R=Math.max(sz.x,sz.y,sz.z)*0.62+0.2;
  var cam=new T.PerspectiveCamera(30,1,0.05,60);cam.position.set(c.x+R*2.2,c.y+R*2.0,c.z+R*2.6);cam.lookAt(c);
  var rr=V.renderer,old=rr.getRenderTarget(),oc=new T.Color();rr.getClearColor(oc);var oa=rr.getClearAlpha();
  rr.setRenderTarget(rt);rr.setClearColor(0x000000,0);rr.clear();rr.render(sc,cam);
  var px=new Uint8Array(S*S*4);rr.readRenderTargetPixels(rt,0,0,S,S,px);
  rr.setRenderTarget(old);rr.setClearColor(oc,oa);rt.dispose();
  var cv=document.createElement('canvas');cv.width=cv.height=S;var x=cv.getContext('2d'),im=x.createImageData(S,S);
  for(var y=0;y<S;y++)im.data.set(px.subarray((S-1-y)*S*4,(S-y)*S*4),y*S*4);
  x.putImageData(im,0,0);
  /* цвета в кадре линейные: переводим в sRGB */
  var d=x.getImageData(0,0,S,S),a=d.data;for(var i=0;i<a.length;i+=4)for(var k=0;k<3;k++){var v=a[i+k]/255;a[i+k]=Math.round(255*(v<=0.0031308?v*12.92:1.055*Math.pow(v,1/2.4)-0.055));}
  x.putImageData(d,0,0);
  return (THUMB[key]=cv.toDataURL('image/png'));
}

/* ════════ ПРОМЫСЛЫ (v15) ════════
   Домики вокруг таверны. Каждый собирается из модулей в своих координатах (дверь на +Z), потом ставится на участок.
   Чем выше уровень, тем опрятнее: сначала дыра в крыше и мусор, потом заплатка, забор, навес, целая крыша,
   труба и ставни, бордюр, лианы и фонарь, цветы, флаги. Пока идёт стройка, вокруг леса. Запас виден штабелями. */
var SITES={
  saw:   {x:-22,z:3,  rot:Math.PI/2, r:7.5,wall:'plaster'},
  hunt:  {x:-17,z:-14,rot:0.35,      r:7.5,wall:'grid'},
  mine:  {x:20, z:-13,rot:-0.4,      r:9,  wall:'brick'},
  farm:  {x:-17,z:28, rot:Math.PI-0.2,r:8.5,wall:'plaster'},
  ghost: {x:22, z:29, rot:Math.PI+0.3,r:7,  wall:'brick'},
  stable:{x:5,  z:27, rot:Math.PI,   r:7.5,wall:'plaster'}
};
/* дома мастеров (v16): рядом со своим сырьём; дверь (открытая сторона) смотрит на таверну */
var HOUSES={
  herbalist:{x:-8, z:27, r:6,wall:'plaster'},
  carpenter:{x:-21,z:-6, r:6,wall:'plaster'},
  smith:    {x:11, z:-16,r:6,wall:'brick'},
  tanner:   {x:-8, z:-17,r:6,wall:'grid'},
  jeweler:  {x:20, z:3,  r:6,wall:'plaster'},
  pets:     {x:2,  z:-18,r:7,wall:'grid'}
};
(function(){for(var id in HOUSES){var h=HOUSES[id];h.rot=Math.atan2(-h.x,-h.z);}})();
var NAT_TINT={};
/* модель из набора природы (adventure.js) как обычный меш; листва красится в свой цвет */
function natObj(name,x,z,sc,ry,tint){
  var ps=window.Adventure&&Adventure.ready&&Adventure.parts&&Adventure.parts(name);if(!ps)return null;
  var g=new T.Group();
  ps.forEach(function(p){
    var m=p.mat;
    if(p.leaf){var k=m.uuid+(tint||'#6a9a2a');if(!NAT_TINT[k]){NAT_TINT[k]=m.clone();NAT_TINT[k].color.set(tint||'#6a9a2a');}m=NAT_TINT[k];}
    var mesh=new T.Mesh(p.geo,m);mesh.matrixAutoUpdate=false;mesh.matrix.copy(p.m);mesh.castShadow=true;mesh.userData.shared=true;g.add(mesh);
  });
  g.position.set(x,0,z);g.rotation.y=ry||0;g.scale.setScalar(sc||1);
  return g;
}
var SOIL=null;
function soilMat(){if(!SOIL){SOIL=mat('yard').clone();SOIL.color.set('#7a5434');}return SOIL;}
/* стены домика w x d (кратно 2), дверь и окно спереди */
function shed(G,kind,w,d,o){
  o=o||{};
  var br=kind==='brick',nm={wall:br?'Wall_UnevenBrick_Straight':kind==='grid'?'Wall_Plaster_WoodGrid':'Wall_Plaster_Straight',
    door:br?'Wall_UnevenBrick_Door_Flat':'Wall_Plaster_Door_Flat',win:br?'Wall_UnevenBrick_Window_Thin_Round':'Wall_Plaster_Window_Thin_Round'};
  var hx=w/2,hz=d/2;
  function put(n,x,z,r,win){var m=place(model(n),x,z,r);G.add(m);if(win){m.add(model('Window_Thin_Round1'));if(o.shutters)m.add(model('WindowShutters_Thin_Round_Open'));}}
  for(var x=-hx+1;x<hx;x+=2){
    if(!o.openFront)put(x===-hx+1?nm.door:nm.win,x,hz,0,x!==-hx+1);
    put(nm.wall,x,-hz,Math.PI);
  }
  for(var z=-hz+1;z<hz;z+=2){put(z===-hz+1||d<4?nm.wall:nm.win,-hx,z,-Math.PI/2,z!==-hz+1&&d>=4);put(nm.wall,hx,z,Math.PI/2);}
  if(!o.openFront)G.add(place(model('Door_1_Flat'),-hx+0.5,hz,0));
  [[-hx,-hz],[hx,-hz],[-hx,hz],[hx,hz]].forEach(function(c){G.add(place(model(br?'Corner_Exterior_Brick':'Corner_Exterior_Wood'),c[0],c[1]));});
  var f=plane(w,d,mat('floor'),w/2.5,d/2.5);place(f,0,0,0,0.02);G.add(f);
}
/* крыша из сегментов по 2 м вдоль конька (ось Z); hole - номер пропущенного сегмента, patch - закрыт досками */
function roof(G,w,d,hole,patch){
  var sx=w/4*1.3,n=d/2;
  for(var k=0;k<n;k++){
    var z=-d/2+0.47+2*k;
    if(k===hole){
      /* стропила видны в дыре (скат от карниза x=2.15,y=2.63 к коньку y=5.55: 53.6 градуса) */
      var zc=z+0.505;
      for(var side=-1;side<=1;side+=2){
        [-0.75,0.75].forEach(function(dz){var r1=box(3.6,0.12,0.12,mat('dwood'),1);r1.position.set(side*1.07,4.09,zc+dz);r1.rotation.z=-side*0.936;G.add(r1);});
        if(patch){var pl=box(3.6,0.07,1.95,mat('fwood'),1);pl.position.set(side*1.07+side*0.065,4.09+0.05,zc);pl.rotation.z=-side*0.936;G.add(pl);}
      }
      continue;
    }
    var t=place(model('Roof_RoundTile_2x1'),0,z,0,3.0);t.scale.set(sx,1.1,1);G.add(t);
  }
  var g1=place(model('Roof_Front_Brick4'),0,d/2,0,3.0);g1.scale.set(w/4,0.87,1);G.add(g1);
  var g2=place(model('Roof_Front_Brick4'),0,-d/2,Math.PI,3.0);g2.scale.set(w/4,0.87,1);G.add(g2);
}
/* леса вокруг стройки */
function scaffold(G,w,d){
  var hx=w/2+0.6,hz=d/2+0.6;
  [[-hx,-hz],[hx,-hz],[-hx,hz],[hx,hz]].forEach(function(c){var p=box(0.14,4.2,0.14,mat('dwood'),1);place(p,c[0],c[1],0,2.1);G.add(p);});
  [1.4,2.9].forEach(function(y){
    var a=box(w+1.3,0.08,0.35,mat('fwood'),1);place(a,0,hz,0,y);G.add(a);
    var b=box(w+1.3,0.08,0.35,mat('fwood'),1);place(b,0,-hz,0,y);G.add(b);
    var c=box(0.35,0.08,d+1.3,mat('fwood'),1);place(c,hx,0,0,y);G.add(c);
  });
  prop(G,'Wood_Planks_Stack_Small',hx+1.2,hz-0.5,0.3);prop(G,'Wood_Planks_Stack_Small',hx+1.4,hz-1.9,1.2);
}
/* пустой участок: колышки, верёвка, табличка */
function plot(G,w,d){
  var hx=w/2+0.5,hz=d/2+0.5;
  [[-hx,-hz],[hx,-hz],[-hx,hz],[hx,hz]].forEach(function(c){var p=box(0.1,0.7,0.1,mat('fwood'),1);place(p,c[0],c[1],0,0.35);G.add(p);});
  var rm=new T.MeshStandardMaterial({color:0xd8c8a0,roughness:1});
  [[0,hz,w+1,0.03],[0,-hz,w+1,0.03],[hx,0,0.03,d+1],[-hx,0,0.03,d+1]].forEach(function(r){var b=box(r[2]||0.03,0.03,r[3]||0.03,rm);b.castShadow=false;place(b,r[0],r[1],0,0.6);G.add(b);});
  var post=box(0.12,1.4,0.12,mat('dwood'),1);place(post,-hx+0.6,hz+0.6,0,0.7);G.add(post);
  var sign=box(1.0,0.6,0.06,mat('fwood'),1);place(sign,-hx+0.6,hz+0.66,0,1.25);G.add(sign);
}
/* общая мелочь по уровню вокруг домика */
function dressing(G,w,d,lvl,o){
  var hx=w/2,hz=d/2;
  if(lvl<=2){
    prop(G,'Prop_Brick1',hx+0.6,hz+0.8,0.6);prop(G,'Prop_Brick3',hx+1.1,hz+0.3,1.9);prop(G,'Prop_Brick1',-hx-0.5,-hz+0.6,2.4);
    prop(G,'Crate_Wooden',-hx-0.9,hz-0.4,0.5);
    var lay=place(model('Prop_WoodenFence_Single'),-hx+1.6,hz+2.6,0.25,0.06);lay.rotation.x=-Math.PI/2+0.08;G.add(lay);
  }
  if(lvl>=3&&!o.noFence){
    var n=lvl>=5?99:lvl===3?2:4,i=0,fz=hz+3;
    for(var fx=-hx+1;fx<hx+3&&i<n;fx+=2,i++)if(fx!==-hx+1||lvl<5)prop(G,i%2?'Prop_WoodenFence_Extension1':'Prop_WoodenFence_Single',fx+(fx===-hx+1?1.6:0),fz,0);
    if(lvl>=5)for(var sz=hz+2;sz>-hz;sz-=2){prop(G,'Prop_WoodenFence_Extension2',-hx-1.4,sz,Math.PI/2);}
  }
  if(lvl>=4&&!o.noAwning){
    var ax=hx+1.1;
    var aw=box(2.4,0.08,d*0.8,mat('fwood'),1);place(aw,ax,0,0,2.45);aw.rotation.z=-0.2;G.add(aw);
    [-d*0.37,d*0.37].forEach(function(pz){var po=box(0.12,2.25,0.12,mat('dwood'),1);place(po,ax+1.05,pz,0,1.12);G.add(po);});
  }
  if(lvl>=6)prop(G,'Prop_Chimney2',hx*0.45,-hz*0.5,0,3.6);
  if(lvl>=7){prop(G,'Prop_ExteriorBorder_Straight1',-hx+1,hz,0);prop(G,'Prop_ExteriorBorder_Straight1',hx-1,hz,0);prop(G,'Barrel',-hx-0.7,hz-1.2,0);}
  if(lvl>=8){prop(G,'Prop_Vine1',hx-0.6,hz+0.12,0,3.0);prop(G,'Lantern_Wall',-hx+1.6,hz+0.1,0,2.2);}
  if(lvl>=9){var fl=natObj('Flower_3_Group',hx-0.9,hz+0.9,0.55,0.4,'#7aa834');if(fl)G.add(fl);var fl2=natObj('Flower_4_Group',-hx+2.3,hz+0.8,0.5,1.4,'#86b03e');if(fl2)G.add(fl2);prop(G,'Banner_2',hx-1,hz+0.12,0,1.6);}
  if(lvl>=10){prop(G,'Torch_Metal',-hx-0.1,hz+0.5,0);prop(G,'Banner_1',-hx+1,-hz-0.12,Math.PI,1.6);}
}
/* штабели запаса: piles[i] показывается, когда запас больше i/n */
function pile(P,G,name,x,z,ry,y,sc){var o=place(model(name),x,z,ry,y||0);if(sc)o.scale.setScalar(sc);G.add(o);P.push(o);return o;}
/* обстановка мастерской: внутри открытого домика 4 x 4 (дверь-проём на +Z) */
function houseProps(H,id,tl,keep){
  if(id==='herbalist'){prop(H,'Cauldron',0.9,-0.9,0);kprop(H,'jar_A_medium',-1.3,-1.4,0,0.95,0.3);kprop(H,'bowl',1.5,-0.3,0,0,0.3);prop(H,'Shelf_Small_Bottles',-1.85,-0.4,Math.PI/2,0.9);prop(H,'Potion_2',1.5,-1.6,0,0);prop(H,'Barrel',-1.3,-1.4,0);
    if(tl>=4)prop(H,'SmallBottles_1',-1.3,-1.4,0,1.0);if(tl>=7)prop(H,'Bookcase_2',1.75,0.6,-Math.PI/2);}
  else if(id==='carpenter'){prop(H,'Workbench',0.6,-1.2,0);prop(H,'Wood_Planks_Stack_Medium',-1.2,-1.2,0.2);prop(H,'Axe_Bronze',0.4,-1.3,0.4,0.95);
    kprop(H,'saw',1.1,-1.1,0.3,0.95,0.32,-Math.PI/2);kprop(H,'handplane',0.1,-1.0,1.2,0.95,0.3);kprop(H,'hammer',1.4,-0.4,0.6,0,0.35,-Math.PI/2);
    if(tl>=4)prop(H,'Wood_Log_Stack',2.9,0.8,0.1);if(tl>=7)prop(H,'Workbench_Drawers',-1.4,0.4,Math.PI/2);}
  else if(id==='smith'){kprop(H,'anvil',0.4,-0.3,0,0,0.45);kprop(H,'tongs',1.0,-0.3,0.4,0,0.32,-Math.PI/2);kprop(H,'grindstone',2.9,-0.4,Math.PI/2,0,0.4);
    kprop(H,'sword_B',-1.85,0.5,Math.PI/2,1.2,0.42);kprop(H,'shield_B',-1.85,-0.4,Math.PI/2,1.5,0.5);kprop(H,'axe_A',1.75,-1.0,-Math.PI/2,1.4,0.45);var fh=box(1.3,0.9,1.0,mat('stone'),1);place(fh,-1.2,-1.3,0,0.45);H.add(fh);fireSprite(H,-1.2,0.92,-1.3,0.7);
    prop(H,'Whetstone',1.4,-1.3,0);if(tl>=4)prop(H,'WeaponStand',1.75,0.6,-Math.PI/2);if(tl>=7)prop(H,'Shield_Wooden',-1.88,0.4,Math.PI/2,1.5);}
  else if(id==='tanner'){prop(H,'Workbench_Drawers',0.5,-1.3,0);kprop(H,'scissors',0.3,-1.25,0.5,0.95,0.3,-Math.PI/2);kprop(H,'rope_bundle_A',1.4,-1.3,0,0.95,0.3);prop(H,'Peg_Rack',-1.85,-0.3,Math.PI/2,1.6);prop(H,'Textiles_Stack_Small',1.4,0.3,0);
    if(tl>=4)prop(H,'Dummy',2.9,1.2,-0.5);if(tl>=7)prop(H,'Textiles_Stack_Large_Colored',-1.2,0.6,0.3);}
  else if(id==='jeweler'){prop(H,'BookStand',0.5,-1.0,0);kprop(H,'magnifying_glass',1.3,-1.3,0.4,0.96,0.3,-Math.PI/2);kprop(H,'drafting_compass',1.6,-1.0,0.2,0.96,0.28,-Math.PI/2);prop(H,'Chest_Wood',-1.2,-1.3,0);prop(H,'Coin_Pile',-1.2,-1.3,0,0.7);prop(H,'CandleStick_Triple',1.4,-1.4,0,0);
    if(tl>=4)prop(H,'Bookcase_2',1.75,0.4,-Math.PI/2);if(tl>=7)prop(H,'Coin_Pile_2',0.9,0.4,0);}
  else if(id==='pets'){
    /* вольер перед псарней */
    for(var a=0;a<10;a++){var ang=a/10*Math.PI*2,fx=Math.cos(ang)*3.4,fz=4.4+Math.sin(ang)*2.4;var fo=place(model('Prop_WoodenFence_Single'),fx,fz,-ang+Math.PI/2);fo.scale.x=0.95;if(a!==7)H.add(fo);}
    prop(H,'Bucket_Wooden_1',-1.0,2.4,0);prop(H,'Barrel_Apples',1.4,-1.2,0);var hay=box(1.4,0.6,1.0,mat('thatch'),1);place(hay,-0.8,-1.2,0.2,0.3);H.add(hay);
    /* питомцы, которые сейчас не с магом, гуляют в вольере */
    var S=V.S||{},P2=S.pets||{},q=(window.Scene3D&&Scene3D.quality)||'medium',lim=q==='low'?0:q==='medium'?1:3,n=0;
    if(window.Adventure&&Adventure.ready)Object.keys(P2.own||{}).forEach(function(pid){
      if(pid===P2.active||n>=lim)return;
      if(!Adventure.hasPet(pid)){Adventure.loadPet(pid).then(function(){if(V)V.prodSig='';},function(){});return;}
      var pp=Adventure.pet(pid);if(!pp)return;
      pp.root.position.set(-1.6+n*1.6,pp.fly||0,4.3+(n%2)*0.8);pp.root.rotation.y=0.8+n;H.add(pp.root);pp.play('idle',0);
      V.penPets.push(pp);keep.push(pp.root);n++;
    });
  }
}
function prodSig(S){
  var g=window.acGame,out=[!!(window.Adventure&&Adventure.ready)];
  for(var id in SITES){var o=S.prod&&S.prod[id];if(!o){out.push(0);continue;}
    var lines=id==='stable'?0:D().PROD_BY[id].lines.filter(function(r){return g&&g.lineOpen(r);}).length;
    out.push(o.lvl+(o.bt?'b':'')+lines);}
  for(var hid in HOUSES){
    if(hid==='pets'){var P2=S.pets||{};out.push((P2.hired?1:0)+':'+Object.keys(P2.own||{}).length+':'+(P2.active||''));continue;}
    var m=S.masters[hid];out.push(m&&m.hired?m.tools:'-');
  }
  return out.join(',');
}
function buildProd(S){
  if(V.prodG){V.prodG.traverse(function(o){if(o.userData&&o.userData.merged)o.geometry.dispose();});V.scene.remove(V.prodG);}
  var G=new T.Group();V.prodG=G;G.visible=V.mode==='city';V.scene.add(G);V.piles={};V.prodFx=[];V.work={};if(!V.penPets)V.penPets=[];
  var keep=[],g=window.acGame;
  for(var id in SITES){
    var si=SITES[id],o=S.prod&&S.prod[id]||{lvl:0},H=new T.Group();
    H.position.set(si.x,0,si.z);H.rotation.y=si.rot;G.add(H);
    var yg=new T.CircleGeometry(si.r*0.85,28);yg.rotateX(-Math.PI/2);var yuv=yg.attributes.uv;for(var yi=0;yi<yuv.count;yi++)yuv.setXY(yi,yuv.getX(yi)*si.r*0.45,yuv.getY(yi)*si.r*0.45);
    var yard=new T.Mesh(yg,mat('yard'));yard.receiveShadow=true;place(yard,0,0.6,0,-0.018);H.add(yard);
    var w=4,d=id==='saw'||id==='stable'?6:4,lvl=o.lvl;
    if(!lvl){
      if(o.bt){var fd=box(w+0.4,0.3,d+0.4,mat('stone'),1);place(fd,0,0,0,0.15);H.add(fd);scaffold(H,w,d);}
      else plot(H,w,d);
      continue;
    }
    var P=V.piles[id]=[];
    if(id==='stable'){
      shed(H,si.wall,w,d,{openFront:true,shutters:lvl>=4});roof(H,w,d,lvl<=2?1:-1,false);
      var wg=place(model('Prop_Wagon'),0.3,d/2+3.4,Math.PI/2+0.2);H.add(wg);
      var hay=box(1.6,0.8,1.2,mat('thatch'),1);place(hay,-0.8,-1.2,0.2,0.4);H.add(hay);
      if(lvl>=2){var hay2=box(1.3,0.7,1.0,mat('thatch'),1);place(hay2,0.9,-1.6,-0.3,0.35);H.add(hay2);}
      prop(H,'Bucket_Wooden_1',1.2,1.4,0);
      dressing(H,w,d,lvl+2,{noAwning:true});
    }else{
      shed(H,si.wall,w,d,{shutters:lvl>=6});
      roof(H,w,d,lvl<=4?Math.floor(d/4):-1,lvl>=3);
      dressing(H,w,d,lvl,{});
    }
    if(o.bt)scaffold(H,w,d);
    else if(WORK_SPOT[id]){var ws=WORK_SPOT[id],wv=new T.Vector3(ws[0],0,ws[1]);H.updateMatrixWorld(true);H.localToWorld(wv);V.work[id]={x:wv.x,z:wv.z,rot:si.rot+ws[2]};}
    var hx=w/2,hz=d/2;
    if(id==='saw'){
      prop(H,'Workbench',hx+2.2,hz-0.6,Math.PI/2);prop(H,'Axe_Bronze',hx+2.1,hz-0.9,0.3,0.95);kprop(H,'saw',hx+2.3,hz-0.1,0.2,0.95,0.32,-Math.PI/2);
      prop(H,'Wood_Log_A',hx+2.6,-0.4,0.2);prop(H,'Wood_Log_A',hx+3.0,-1.0,1.4);
      pile(P,H,'Wood_Log_Stack',-hx-1.5,-1.6,0.1);pile(P,H,'Wood_Log_Stack',-hx-1.5,0.2,0.1);pile(P,H,'Wood_Planks_Stack_Medium',-hx-1.6,2.0,0);pile(P,H,'Wood_Log_Stack',-hx-3.0,-0.7,1.6);
    }else if(id==='mine'){
      /* холм за домиком и вход в штольню */
      var rocks=[['Rock_Medium_1',-0.5,-6.4,1.5,0.3],['Rock_Medium_2',4.2,-6.0,1.7,1.7],['Rock_Medium_3',6.6,-4.4,1.2,2.6],['Rock_Medium_1',-3.6,-5.4,1.1,4.1],['Rock_Medium_3',1.8,-7.4,1.3,0.9]];
      rocks.forEach(function(r){var ro=natObj(r[0],r[1],r[2],r[3],r[4]);if(ro)H.add(ro);});
      var ent=box(1.8,2.2,0.4,new T.MeshBasicMaterial({color:0x0a0806}));place(ent,4.2,-3.6,0,1.1);H.add(ent);
      [3.2,5.2].forEach(function(px){var po=box(0.22,2.4,0.22,mat('dwood'),1);place(po,px,-3.4,0,1.2);H.add(po);});
      var beam=box(2.6,0.22,0.3,mat('dwood'),1);place(beam,4.2,-3.4,0,2.35);H.add(beam);
      prop(H,'Prop_Wagon',4.4,-0.6,0.15,0,0.7);kprop(H,'pickaxe',3.0,-2.6,0.8,0.05,0.4,-Math.PI/2);kprop(H,'shovel',5.6,-2.4,-0.6,0.05,0.4,-Math.PI/2);
      var lines=D().PROD_BY.mine.lines.filter(function(r){return g&&g.lineOpen(r);});
      pile(P,H,'Stone_Chunks_Large',-hx-1.4,1.2,0.4);pile(P,H,'Iron_Nuggets',-hx-1.3,-0.5,0.9);
      if(lines.indexOf('silver')>=0)pile(P,H,'Silver_Nugget_Medium',-hx-2.6,0.3,0.4,0,1.4);
      pile(P,H,'Stone_Chunks_Small',-hx-2.5,-1.4,1.2);pile(P,H,'Iron_Nugget_Large',4.4,0.0,0.3,0.55);
    }else if(id==='hunt'){
      prop(H,'Peg_Rack',-hx-0.05,0.8,-Math.PI/2,1.5);prop(H,'Dummy',hx+2.6,hz+1.2,-0.6);
      var rk1=box(0.1,1.8,0.1,mat('dwood'),1);place(rk1,hx+1.6,-1.4,0,0.9);H.add(rk1);
      var rk2=box(0.1,1.8,0.1,mat('dwood'),1);place(rk2,hx+1.6,0.6,0,0.9);H.add(rk2);
      var rk3=box(0.08,0.08,2.2,mat('dwood'),1);place(rk3,hx+1.6,-0.4,0,1.75);H.add(rk3);
      prop(H,'Textiles_A',hx+1.6,-0.9,Math.PI/2,1.1);
      pile(P,H,'Textiles_Stack_Small',-hx-1.4,-1.2,0.3);pile(P,H,'Textiles_Stack_Large_Colored',-hx-1.5,0.9,0.1);pile(P,H,'Textiles_A',hx+1.6,0.2,Math.PI/2,1.1);pile(P,H,'Bag',-hx-2.4,-0.2,0.8);
    }else if(id==='farm'){
      /* грядки перед домиком; с болотом появляются грибы */
      for(var b=0;b<3;b++){
        var bed=box(1.1,0.25,3.2,soilMat());place(bed,-1.8+b*1.8,hz+3.2,0,0.12);H.add(bed);
        for(var k=0;k<4;k++){var pl=natObj(k%2?'Fern_1':'Plant_1_Big',-1.8+b*1.8,hz+2.0+k*0.8,0.35+0.05*(lvl>5),k*1.7,'#6aa83a');if(pl){pl.position.y=0.24;H.add(pl);}}
      }
      if(g&&g.lineOpen('spore'))for(var m2=0;m2<5;m2++){var mu=natObj(m2%2?'Mushroom_Common':'Mushroom_Laetiporus',hx+1.2+(m2%2)*0.7,-1.6+m2*0.6,0.7,m2);if(mu)H.add(mu);}
      prop(H,'Dummy',-hx-1.8,hz+3.4,0.4);prop(H,'Bucket_Metal',hx+0.8,hz+1.2,0);kprop(H,'shovel',hx+1.3,hz+2.4,1.2,0.05,0.4,-Math.PI/2);
      pile(P,H,'FarmCrate_Carrot',hx+1.2,hz-0.4,0.2);pile(P,H,'FarmCrate_Apple',hx+1.3,hz-1.6,0.6);pile(P,H,'Barrel_Apples',hx+2.4,hz-1.0,0);pile(P,H,'FarmCrate_Carrot',hx+2.5,hz+0.2,1.2);
    }else if(id==='ghost'){
      prop(H,'Cauldron',hx+1.6,hz+1.2,0);prop(H,'Torch_Metal',-hx-0.4,hz+0.8,0);
      for(var e=0;e<3;e++){
        var sp=new T.Sprite(new T.SpriteMaterial({map:glowTex(),color:0x6ff0d0,transparent:true,opacity:0.7,blending:T.AdditiveBlending,depthWrite:false}));
        sp.position.set(hx+1.0+e*0.9,1.6+e*0.4,hz+1.6-e*0.8);sp.scale.set(0.9,0.9,1);H.add(sp);keep.push(sp);V.prodFx.push({s:sp,y:sp.position.y});
      }
      var gl=new T.PointLight(0x6ff0d0,1.2,7,1.8);gl.position.set(hx+1.6,1.8,hz+1.2);H.add(gl);
      pile(P,H,'Potion_1',-hx-0.8,-0.6,0,0,1.4);pile(P,H,'Potion_2',-hx-0.9,0.2,0,0,1.4);pile(P,H,'SmallBottles_1',-hx-1.0,1.0,0,0,1.2);pile(P,H,'Potion_4',-hx-1.6,0.4,0,0,1.4);
    }
    P.forEach(function(x){keep.push(x);});
  }
  /* дома мастеров */
  V.mst={};V.penPets.forEach(function(pp){pp.dispose&&pp.dispose();});V.penPets=[];
  for(var hid in HOUSES){
    var hs=HOUSES[hid],HG=new T.Group();HG.position.set(hs.x,0,hs.z);HG.rotation.y=hs.rot;G.add(HG);
    var yg2=new T.CircleGeometry(hs.r*0.8,24);yg2.rotateX(-Math.PI/2);var yuv2=yg2.attributes.uv;for(var y2=0;y2<yuv2.count;y2++)yuv2.setXY(y2,yuv2.getX(y2)*hs.r*0.45,yuv2.getY(y2)*hs.r*0.45);
    var yard2=new T.Mesh(yg2,mat('yard'));yard2.receiveShadow=true;place(yard2,0,0.5,0,-0.017);HG.add(yard2);
    var hired=hid==='pets'?!!(S.pets&&S.pets.hired):!!(S.masters[hid]&&S.masters[hid].hired);
    if(!hired){plot(HG,4,4);continue;}
    var tl=hid==='pets'?Math.min(10,1+Math.floor(Object.keys(S.pets.own||{}).length*2)):Math.min(10,1+(S.masters[hid].tools||0));
    shed(HG,hs.wall,4,4,{openFront:true,shutters:tl>=6});
    roof(HG,4,4,tl<=4?1:-1,tl>=3);
    dressing(HG,4,4,tl,{noFence:hid==='pets'});
    houseProps(HG,hid,tl,keep);
    var wp=new T.Vector3(0,0,0.55);HG.updateMatrixWorld(true);HG.localToWorld(wp);
    V.mst[hid]={x:wp.x,z:wp.z,rot:hs.rot};
  }
  mergeStatic(G,keep);
  if(V.renderer)V.renderer.shadowMap.needsUpdate=true;
}
/* запас -> сколько штабелей показать */
function prodFill(S,id){
  var g=window.acGame,o=S.prod&&S.prod[id];if(!g||!o||!o.lvl)return 0;
  var d=D().PROD_BY[id];if(!d)return 0;
  var best=0;d.lines.forEach(function(r){if(!g.lineOpen(r))return;var k=(o.acc[r]||0)/Math.max(1,g.lineCap(id,r));if(k>best)best=k;});
  return best;
}
function syncProd(S){
  if(!S.prod)return;
  var sig=prodSig(S);
  if(sig!==V.prodSig){V.prodSig=sig;buildProd(S);}
  var changed=false;
  for(var id in V.piles){
    var P=V.piles[id],k=prodFill(S,id),n=k<0.02?0:Math.max(1,Math.ceil(k*P.length));
    P.forEach(function(o,i){var v=i<n;if(o.visible!==v){o.visible=v;changed=true;}});
  }
  var g=window.acGame;
  if(V.wpiles&&g&&S.tav)['brewer','cook'].forEach(function(w){
    var P=V.wpiles[w]||[],o=S.tav[w],k=o&&o.hired?o.stock/Math.max(1,g.stockCap(w)):0,n=Math.ceil(k*P.length);
    P.forEach(function(x,i){var v=i<n;if(x.visible!==v){x.visible=v;changed=true;}});
  });
  if(changed&&V.renderer)V.renderer.shadowMap.needsUpdate=true;
}

/* ════════ ЖИТЕЛИ ════════ */
var MASTER_LOOK={
  herbalist:{gender:'f',skin:2,hair:'long',hairColor:5,beard:'none',body:'peasant',arms:'peasant',legs:'peasant',feet:'peasant',colors:{peasant:1}},
  carpenter:{gender:'m',skin:1,hair:'buzzed',hairColor:1,beard:'beard',body:'peasant',arms:'peasant',legs:'ranger',feet:'peasant',colors:{peasant:0,ranger:0}},
  smith:    {gender:'m',skin:3,hair:'none',hairColor:0,beard:'beard',body:'ranger',arms:'peasant',legs:'ranger',feet:'ranger',colors:{ranger:1,peasant:0}},
  tanner:   {gender:'f',skin:1,hair:'buns',hairColor:3,beard:'none',body:'ranger',arms:'ranger',legs:'peasant',feet:'ranger',colors:{ranger:0,peasant:1}},
  jeweler:  {gender:'m',skin:0,hair:'parted',hairColor:6,beard:'none',body:'peasant',arms:'peasant',legs:'peasant',feet:'peasant',colors:{peasant:1}},
  hostess:  {gender:'f',skin:1,hair:'buns',hairColor:2,beard:'none',body:'peasant',arms:'peasant',legs:'peasant',feet:'peasant',colors:{peasant:0}},
  cook:     {gender:'m',skin:2,hair:'none',hairColor:0,beard:'beard',body:'peasant',arms:'peasant',legs:'peasant',feet:'peasant',colors:{peasant:1}},
  brewer:   {gender:'m',skin:0,hair:'long',hairColor:4,beard:'beard',body:'ranger',arms:'peasant',legs:'peasant',feet:'ranger',colors:{ranger:0,peasant:0}},
  pets:     {gender:'f',skin:3,hair:'parted',hairColor:7,beard:'none',body:'ranger',arms:'ranger',legs:'ranger',feet:'ranger',colors:{ranger:1}}
};
var WORK={herbalist:'Interact',carpenter:'PickUp_Table',smith:'Sword_Attack',tanner:'Fixing_Kneeling',jeweler:'Interact',pets:'Interact'};
var TRAV_G=['m','f','m','f','m','m','f','m','m','f','m','m'];
function fullLook(l){
  var b=Avatar.defaults(l.gender);
  for(var k in l)b[k]=l[k];
  b.hood='none';b.shoulders='none';b.staff='none';b.hoodUp=false;
  return b;
}
function rnd(seed){var x=Math.sin(seed*999.13)*43758.5453;return x-Math.floor(x);}
function travelerLook(c){
  var g=TRAV_G[c.who%TRAV_G.length],r=function(k){return rnd(c.id*7.3+k);};
  var out=r(1)<0.5?'ranger':'peasant',out2=r(2)<0.5?'ranger':'peasant';
  var hairs=g==='f'?['long','buns','buzzedf','parted']:['parted','buzzed','none','long'];
  return fullLook({gender:g,skin:Math.floor(r(3)*5),hair:hairs[Math.floor(r(4)*hairs.length)],hairColor:Math.floor(r(5)*9),
    beard:g==='m'&&r(6)<0.5?'beard':'none',body:out,arms:out,legs:out2,feet:out2,colors:{ranger:Math.floor(r(7)*2),peasant:Math.floor(r(8)*2)},
    hood:r(9)<0.25?'ranger':'none'});
}
/* житель: аватар, позиция, путь, текущая анимация */
function spawnNpc(key,look,x,z,rot){
  var N={key:key,av:null,x:x,z:z,rot:rot,path:[],anim:'Idle_Loop',speed:1.35,alive:true,ready:false};
  V.npcs[key]=N;
  Avatar.create(look,{res:'1k',forGame:false}).then(function(A){
    if(!N.alive||!V)return;
    N.av=A;A.root.traverse(function(o){if(o.isMesh){o.castShadow=true;}});
    V.scene.add(A.root);N.ready=true;A.play(N.anim,0);
  }).catch(function(e){console.warn('[tavern3d] npc',e);});
  return N;
}
function removeNpc(N){
  if(N.meal){V.scene.remove(N.meal);N.meal=null;}
  N.alive=false;
  if(N.av){V.scene.remove(N.av.root);}
  delete V.npcs[N.key];
}
function setAnim(N,a){
  if(Array.isArray(a)){if(N.cyc===a)return;N.cyc=a;N.cycT=0;return;}   /* набор движений: меняются сами (v21) */
  N.cyc=null;if(N.anim===a)return;N.anim=a;if(N.av)N.av.play(a,0.3);
}
/* v21: жители не стоят одной позой. Набор: [клип, вес, от с, до с]; следующий выбирается случайно, по весу,
   по возможности не тот же самый. Одноразовые клипы (сундук, кивок) длятся ровно свою длину. */
var ACT={
  rest:[['Idle_Loop',3,5,10],['Idle_FoldArms_Loop',2,5,10],['Idle_Talking_Loop',1,3,6]],
  hostIdle:[['Idle_Loop',3,5,10],['Idle_FoldArms_Loop',2,5,9],['Interact',1,2.5,4]],
  hostTalk:[['Idle_Talking_Loop',4,4,8],['Yes',1,2.5,2.5],['Interact',1,2,3]],
  brewer:[['Fixing_Kneeling',3,5,9],['Interact',2,3,6],['Chest_Open',1,1.37,1.37],['PickUp_Table',1,2,4]],
  cook:[['Interact',3,4,8],['PickUp_Table',2,2,4],['Chest_Open',1,1.37,1.37],['Farm_Watering',1,3.8,3.8]],
  helper:[['PickUp_Table',2,3,6],['Interact',2,3,6],['Chest_Open',1,1.37,1.37],['Crouch_Idle_Loop',1,3,5]],
  herbalist:[['Farm_Harvest',2,2.5,5],['Farm_PlantSeed',2,2.77,5.5],['Farm_Watering',2,3.8,7.6],['Interact',1,3,6]],
  carpenter:[['PickUp_Table',2,3,6],['TreeChopping_Loop',2,3,6],['Fixing_Kneeling',1,4,8]],
  smith:[['Sword_Attack',3,3,7],['Fixing_Kneeling',1,4,7],['Interact',1,3,5]],
  tanner:[['Fixing_Kneeling',2,4,8],['Interact',2,3,6],['PickUp_Table',1,3,5]],
  jeweler:[['Interact',3,4,8],['Idle_FoldArms_Loop',1,3,6],['Fixing_Kneeling',1,4,7]],
  pets:[['Interact',2,3,6],['Crouch_Idle_Loop',2,3,6],['Yes',1,2.5,2.5]],
  teach:[['Idle_Talking_Loop',3,4,8],['Yes',1,2.5,2.5],['Idle_FoldArms_Loop',1,3,5]],
  custTalk:[['Idle_Talking_Loop',4,4,8],['Yes',1,2.5,2.5]],
  custWait:[['Idle_Loop',3,4,8],['Idle_FoldArms_Loop',2,4,8],['Idle_No_Loop',0.5,2.5,2.5]],
  sit:[['Sitting_Idle_Loop',3,5,10],['Sitting_Talking_Loop',2,5,10]],
  sitFed:[['Sitting_Idle_Loop',3,5,10],['Sitting_Talking_Loop',2,5,10],['sitDrink',2,1.33,2.66]],
  /* работники на промыслах */
  w_saw:[['TreeChopping_Loop',4,4,9],['PickUp_Table',1,2,4],['Idle_Loop',1,2,4]],
  w_mine:[['TreeChopping_Loop',3,4,8],['Crouch_Idle_Loop',1,3,5],['PickUp_Table',1,2,4]],
  w_hunt:[['Fixing_Kneeling',3,5,9],['PickUp_Table',1,2,4],['Interact',1,3,5]],
  w_farm:[['Farm_Harvest',2,2.5,5],['Farm_PlantSeed',2,2.77,5.5],['Farm_Watering',2,3.8,7.6]],
  w_ghost:[['Idle_Lantern_Loop',4,5,10],['Interact',1,3,5]],
  w_stable:[['Idle_FoldArms_Loop',1,4,8],['Interact',2,3,6],['PickUp_Table',1,2,4]]
};
function pickCyc(N){
  var L=N.cyc,tot=0,i;
  for(i=0;i<L.length;i++)if(L[i][0]!==N.anim||L.length===1)tot+=L[i][1];
  var r=Math.random()*tot,e=L[0];
  for(i=0;i<L.length;i++){if(L[i][0]===N.anim&&L.length>1)continue;r-=L[i][1];if(r<=0){e=L[i];break;}}
  N.anim=e[0];N.cycT=e[2]+Math.random()*(e[3]-e[2]);
  if(N.av)N.av.play(e[0],0.35);
}
function goTo(N,pts){N.path=pts.map(function(p){return {x:p[0],z:p[1]};});}

/* ════════ СИНХРОНИЗАЦИЯ С ИГРОЙ ════════ */
function signature(S){
  var T=S.tav||{};
  return JSON.stringify([S.build.hall,S.build.bedroom,decorTier(S),S.counter||1,S.storeLvl,T.brewer&&T.brewer.hired,T.cook&&T.cook.hired]);
}
function sync(S){
  if(!V||!readyFlag)return;
  V.S=S;
  var sig=signature(S);
  if(sig!==V.sig){V.sig=sig;layout(S);placeMasters(S,true);if(V.pendingMage&&mageRef){V.pendingMage=false;setMage(mageRef,mageMode);}}
  setNight(S.place==='sleep');
  if(!V.design)furnSync(S.furn);
  placeMasters(S,false);
  syncCustomers(S);
  buildNature();
  syncPet(S);
  syncProd(S);
  V.S=S;
}
function D(){return window.AcData;}
function placeMasters(S,moved){
  var st=V.st,q=(window.Scene3D&&Scene3D.quality)||'medium',g=window.acGame;
  var h=V.npcs.hostess;
  if(!h)h=spawnNpc('hostess',fullLook(MASTER_LOOK.hostess),st.hostess.x,st.hostess.z,st.hostess.rot);
  if(moved){h.x=st.hostess.x;h.z=st.hostess.z;h.rot=st.hostess.rot;}
  setAnim(h,S.cust.length&&S.place!=='sleep'?ACT.hostTalk:ACT.hostIdle);
  var want={};
  /* повар, пивовар и их помощники */
  var TV=S.tav;
  if(TV)['brewer','cook'].forEach(function(w){
    var o=TV[w],pos=st[w];if(!o||!o.hired||!pos)return;
    var busy=g&&o.stock<g.stockCap(w)&&S.place!=='sleep';
    var key='w:'+w;want[key]=1;
    var N=V.npcs[key]||spawnNpc(key,fullLook(MASTER_LOOK[w]),pos.x,pos.z,pos.rot);
    if(moved){N.x=pos.x;N.z=pos.z;N.rot=pos.rot;}
    setAnim(N,busy?ACT[w]:ACT.rest);
    var hp=st[w==='cook'?'cookHelp':'brewHelp'],nh=Math.min(o.help,HELP_VIS[q]||0,hp.length);
    for(var i=0;i<nh;i++){
      var hk='h:'+w+':'+i;want[hk]=1;var hpos=hp[i];
      var H=V.npcs[hk]||spawnNpc(hk,helperLook(w,i),hpos[0],hpos[1],hpos[2]);
      if(moved){H.x=hpos[0];H.z=hpos[1];H.rot=hpos[2];}
      setAnim(H,busy?ACT.helper:ACT.rest);
    }
  });
  /* мастера в своих домах (не на слабой графике) */
  if(q!=='low'&&V.mst)for(var mid in V.mst){
    var m=mid==='pets'?(S.pets&&S.pets.hired?{hired:true,teach:null}:null):S.masters[mid],mp=V.mst[mid];if(!m||!m.hired||!MASTER_LOOK[mid])continue;
    var mk='m:'+mid;want[mk]=1;
    var M=V.npcs[mk]||spawnNpc(mk,fullLook(MASTER_LOOK[mid]),mp.x,mp.z,mp.rot);
    if(M.x!==mp.x||M.z!==mp.z){M.x=mp.x;M.z=mp.z;M.rot=mp.rot;}
    var work=mid==='pets'?!!(S.pets.train):g&&g.queueOf(mid).length&&g.canWork(mid);
    setAnim(M,m.teach?ACT.teach:work?ACT[mid]||WORK[mid]:ACT.rest);
  }
  /* работники на промыслах (v21): только на высокой графике, когда здание построено */
  if((q==='high'||q==='ultra')&&V.work)for(var wid in V.work){
    var wp=V.work[wid],wk='p:'+wid;want[wk]=1;
    var Wn=V.npcs[wk]||spawnNpc(wk,workerLook(wid),wp.x,wp.z,wp.rot);
    if(Wn.x!==wp.x||Wn.z!==wp.z){Wn.x=wp.x;Wn.z=wp.z;Wn.rot=wp.rot;}
    setAnim(Wn,ACT['w_'+wid]||ACT.rest);
  }
  for(var k in V.npcs){if((k[0]==='w'||k[0]==='h'||k[0]==='m'||k[0]==='p')&&k[1]===':'&&!want[k])removeNpc(V.npcs[k]);}
}
var HELP_VIS={low:0,medium:1,high:2,ultra:3};
var WORK_LOOK={saw:[0,'m',2,'buzzed'],mine:[1,'m',4,'none'],hunt:[2,'m',1,'parted'],farm:[3,'f',3,'buns'],ghost:[4,'f',0,'long'],stable:[1,'m',3,'parted']};
function workerLook(id){
  var w=WORK_LOOK[id]||[0,'m',0,'buzzed'];
  return fullLook({gender:w[1],skin:w[2],hair:w[3],hairColor:(w[0]*3+1)%9,beard:w[1]==='m'&&w[0]%2?'beard':'none',
    body:'peasant',arms:'peasant',legs:'peasant',feet:'peasant',colors:{peasant:w[0]%2}});
}
/* где стоит работник промысла: в координатах участка (x, z, поворот) */
var WORK_SPOT={saw:[3.9,-0.2,Math.PI/2],mine:[3.1,-1.9,Math.PI],hunt:[4.4,-0.4,-Math.PI/2],farm:[-0.9,5.2,Math.PI/2],ghost:[2.5,3.4,Math.PI/2],stable:[1.7,5.2,-Math.PI/2]};
function helperLook(w,i){
  return fullLook({gender:i%2?'f':'m',skin:(i*2+(w==='cook'?1:3))%5,hair:i%2?'buns':'buzzed',hairColor:(i*3+2)%9,beard:'none',
    body:'peasant',arms:'peasant',legs:'peasant',feet:'peasant',colors:{peasant:(i+(w==='cook'?0:1))%2}});
}
/* сколько путников рисовать: каждый это полноценный персонаж, на слабой графике меньше */
var CUST_MAX={low:2,medium:4,high:6,ultra:8};
var GUEST_MAX={low:2,medium:4,high:8,ultra:12};
/* еда и кружка перед сидящим гостем: на стол, ближе к центру (если повар и пивовар его обслужили) */
var MEALS=['food_stew','food_dinner','food_ingredient_ham_cooked','food_stew','food_ingredient_bun'];
function mealFor(N,id){
  if(N.meal){V.scene.remove(N.meal);N.meal=null;}
  var gs=null;(V.S&&V.S.tav&&V.S.tav.guests||[]).forEach(function(x){if(x.id===id)gs=x;});
  if(!gs||(!gs.beer&&!gs.food)||!KIT.food_stew)return;
  /* перед гостем на стол: вдоль взгляда, кружка чуть сбоку */
  var G=new T.Group(),fx=Math.sin(N.seat.rot),fz=Math.cos(N.seat.rot),sx=fz,sz=-fx;
  if(gs.food){var f=model(MEALS[id%MEALS.length]);f.scale.setScalar(MEALS[id%MEALS.length]==='food_dinner'?0.2:0.26);place(f,N.seat.x+fx*0.42,N.seat.z+fz*0.42,id,0.82);G.add(f);}
  if(gs.beer){var k=gs.food?0.22:0,m=model('Mug');place(m,N.seat.x+fx*0.34+sx*k,N.seat.z+fz*0.34+sz*k,id*1.3,0.82);G.add(m);}
  G.traverse(function(o){if(o.isMesh)o.castShadow=false;});
  V.scene.add(G);N.meal=G;
  return !!gs.beer;
}
/* v25: пути по сетке зала (hall.js). Внутрь: с дороги к двери, дальше A* до места или очереди. Наружу: обратно к двери и на дорогу */
function roadOut(out){return [PATH_IN[1],PATH_IN[0],[out*ROAD_END,ROAD_Z]];}
function seatPath(N,key){
  var r=HL().seatPath(liveFurn(),hallLvl(),{x:N.x,z:N.z},key);
  if(!r)return null;N.seat=r.seat;N.appr=r.appr;return r.path;
}
function leavePath(N,out){
  var from={x:N.x,z:N.z},pts=[];
  if(N.guest&&N.seat){var a=N.appr||HL().apprOf(liveFurn(),hallLvl(),N.seat);pts.push([a.x,a.z]);from=a;}
  if(from.z<5.2)pts=pts.concat(hallPath(from,IN_PT));
  return pts.concat(roadOut(out));
}
function syncCustomers(S){
  var seen={},lim=CUST_MAX[window.Scene3D&&Scene3D.quality]||5,glim=GUEST_MAX[window.Scene3D&&Scene3D.quality]||4,live=0,gl=0;
  var guests={};(S.tav&&S.tav.guests||[]).forEach(function(x){guests[x.id]=x;});
  for(var k0 in V.npcs){var N0=V.npcs[k0];if(N0.cust&&!N0.guest)live++;if(N0.guest&&!N0.leaving)gl++;}
  S.cust.forEach(function(c,i){
    if(i>=lim)return;
    seen[c.id]=1;
    var key='c:'+c.id,N=V.npcs[key],slot=V.st.queue[Math.min(i,V.st.queue.length-1)];
    /* уходящие тоже считаются: на слабой графике не больше lim+1 путников на экране */
    if(!N&&live>=lim+1){delete seen[c.id];return;}
    if(!N){live++;
      var side=rnd(c.id*3.1)<0.5?-1:1;N=spawnNpc(key,travelerLook(c),side*ROAD_END,ROAD_Z+(rnd(c.id)-0.5)*1.4,side>0?-Math.PI/2:Math.PI/2);
      goTo(N,PATH_IN.concat([[IN_PT.x,IN_PT.z]]).concat(hallPath(IN_PT,{x:slot[0],z:slot[1]})));N.slot=i;N.cust=true;N.speed=2.6;N.side=side;
    }else if(N.slot!==i&&!N.leaving){N.slot=i;
      /* ещё идёт к очереди: путь до нового места пересчитывать не нужно, хватит последней точки */
      if(N.path.length>1)N.path[N.path.length-1]={x:slot[0],z:slot[1]};else goTo(N,[slot]);}
  });
  for(var key in V.npcs){
    var N=V.npcs[key];
    if(!N.cust||N.leaving)continue;
    var id=+key.slice(2);
    if(seen[id])continue;
    var gs=guests[id];
    if(gs&&!N.guest&&gl<glim){var sp=seatPath(N,gs.seat);if(sp){N.guest=true;gl++;N.speed=1.8;goTo(N,sp);continue;}}
    if(gs&&N.guest&&N.seatKey!==undefined&&N.seatKey!==gs.seat){/* место переехало (дизайн) */}
    if(gs&&N.guest){N.seatKey=gs.seat;continue;}
    N.leaving=true;N.speed=2.6;N.y=0;if(N.meal){V.scene.remove(N.meal);N.meal=null;}goTo(N,leavePath(N,-(N.side||1)));
  }
  /* гости без фигуры (пришли, пока таверны не было на экране): сразу за столом */
  for(var gid in guests){
    if(gl>=glim)break;
    var gk='c:'+gid;if(V.npcs[gk])continue;
    var gx=guests[gid],st2=HL().seatByKey(liveFurn(),gx.seat);if(!st2)continue;
    var NG=spawnNpc(gk,travelerLook({id:+gid,who:gx.who}),st2.x,st2.z,st2.rot);
    NG.cust=true;NG.guest=true;NG.seat=st2;NG.seatKey=gx.seat;NG.side=rnd(+gid*3.1)<0.5?-1:1;NG.sitNow=true;gl++;
  }
}

/* ── питомец в таверне (v14): лежит у камина ── */
function syncPet(S){
  var id=S.pets&&S.pets.active||null;
  if(V.petId===id)return;
  if(V.pet){V.scene.remove(V.pet.root);V.pet.dispose();V.pet=null;}
  V.petId=id;
  if(!id||!window.Adventure||!Adventure.ready)return;
  if(!Adventure.hasPet(id)){Adventure.loadPet(id).then(function(){if(V&&V.petId===id)V.petId='-';},function(){});return;}
  var P=Adventure.pet(id);if(!P)return;
  var PP=HL().PET;V.pet=P;P.root.position.set(PP.x,0,PP.z);P.root.rotation.y=PP.rot;
  if(P.fly)P.root.position.y=P.fly;
  V.scene.add(P.root);P.play('low',0);
}

/* ════════ ПРИРОДА ВОКРУГ ════════
   Деревья, кусты, цветы и трава из моделей приключения (adventure.js), когда они уже скачаны.
   Всё неподвижное: по одному InstancedMesh на часть модели, расстановка с постоянным зерном. */
var NATURE=[
  /* модель, сколько при высокой графике, кольцо от центра, масштаб, вид */
  ['CommonTree_1',10,[13.5,40],[0.9,1.25],'tree'],['CommonTree_2',10,[13.5,40],[0.9,1.25],'tree'],['CommonTree_3',6,[20,50],[0.9,1.2],'tree'],
  ['CommonTree_5',8,[24,55],[0.9,1.3],'tree'],['Pine_1',6,[26,58],[1,1.3],'tree'],['Pine_5',8,[30,62],[1,1.4],'tree'],
  ['Bush_Common',18,[9,26],[0.6,1.0],'bush'],['Bush_Common_Flowers',12,[8.5,22],[0.6,0.95],'bush'],
  ['Rock_Medium_1',5,[12,34],[0.3,0.7],'rock'],['Rock_Medium_2',5,[12,34],[0.3,0.7],'rock'],
  ['Flower_3_Group',14,[8,20],[0.35,0.6],'small'],['Flower_4_Group',10,[8,20],[0.35,0.6],'small'],['Fern_1',10,[9,24],[0.5,0.8],'small'],
  ['Grass_Common_Short',70,[7.5,30],[0.45,0.8],'grass'],['Grass_Common_Tall',36,[8,30],[0.4,0.7],'grass'],['Clover_1',20,[7.5,22],[0.4,0.7],'grass']
];
var NAT_DENS={low:{tree:0.4,bush:0.5,rock:1,small:0.5,grass:0},medium:{tree:0.65,bush:0.8,rock:1,small:0.8,grass:0.5},high:{tree:1,bush:1,rock:1,small:1,grass:1},ultra:{tree:1,bush:1,rock:1,small:1,grass:1}};
var LEAF_PAL=['#6a9a2a','#7aa834','#5c8c26','#86b03e'];
/* занятые места: дом со складом, двор с забором, дорожка, дорога (деревья и кусты туда не ставим) */
function natFree(x,z,kind){
  if(x>-12&&x<14&&z>-11&&z<14)return false;
  for(var id in SITES){var st=SITES[id],r=st.r+(kind==='grass'?-1.5:kind==='tree'?2.5:0.5);if(Math.hypot(x-st.x,z-st.z)<r)return false;}
  for(var hid in HOUSES){var hs=HOUSES[hid],hr=hs.r+(kind==='grass'?-1.5:kind==='tree'?2.5:0.5);if(Math.hypot(x-hs.x,z-hs.z)<hr)return false;}
  if(kind!=='grass'&&z>13.6&&z<19.4)return false;
  if(kind==='grass'&&z>14.3&&z<18.7)return false;
  return true;
}
function buildNature(){
  if(!V||V.nature||!window.Adventure||!Adventure.ready||!Adventure.parts)return;
  var q=(window.Scene3D&&Scene3D.quality)||'medium',dens=NAT_DENS[q]||NAT_DENS.medium;
  var G=new T.Group();V.nature=G;V.scene.add(G);
  var m4=new T.Matrix4(),tr=new T.Matrix4(),qt=new T.Quaternion(),e=new T.Euler(),v=new T.Vector3(),sc=new T.Vector3(),col=new T.Color();
  var pal=LEAF_PAL.map(function(h){return new T.Color(h);});
  NATURE.forEach(function(d,ki){
    var ps=Adventure.parts(d[0]);if(!ps)return;
    var n=Math.round(d[1]*dens[d[4]]);if(!n)return;
    var pos=[],seed=ki*1000+7,guard=0;
    while(pos.length<n&&guard++<n*60){
      var a=rnd(seed++)*Math.PI*2,r=d[2][0]+Math.sqrt(rnd(seed++))*(d[2][1]-d[2][0]);
      var x=0.5+Math.cos(a)*r,z=3+Math.sin(a)*r;
      if(!natFree(x,z,d[4]))continue;
      pos.push({x:x,z:z,s:d[3][0]+rnd(seed++)*(d[3][1]-d[3][0]),ry:rnd(seed++)*6.283,v:0.85+rnd(seed++)*0.25,pi:Math.floor(rnd(seed++)*8)});
    }
    ps.forEach(function(p){
      var im=new T.InstancedMesh(p.geo,p.mat,pos.length);
      pos.forEach(function(o,i){
        tr.compose(v.set(o.x,0,o.z),qt.setFromEuler(e.set(0,o.ry,0)),sc.set(o.s,o.s,o.s));
        m4.multiplyMatrices(tr,p.m);im.setMatrixAt(i,m4);
        if(p.leaf)col.copy(pal[o.pi%pal.length]).multiplyScalar(o.v);else col.setRGB(o.v,o.v,o.v);
        im.setColorAt(i,col);
      });
      im.instanceMatrix.needsUpdate=true;if(im.instanceColor)im.instanceColor.needsUpdate=true;
      im.castShadow=d[4]==='tree'||d[4]==='bush'||d[4]==='rock';im.receiveShadow=false;
      G.add(im);
    });
  });
  if(V.renderer)V.renderer.shadowMap.needsUpdate=true;
}

/* ════════ МАГ В ТАВЕРНЕ ════════ */
var mageRef=null,mageMode='',mageCycT=0;
function setMage(av,mode){
  if(!V)return;
  if(mageRef&&mageRef!==av)releaseMage();
  mageRef=av;mageMode=mode;
  if(!av)return;
  if(!V.st){V.pendingMage=true;return;}   // таверна ещё не собрана: поставим мага после первой сборки
  if(!av._saved)av._saved={p:av.root.position.clone(),r:av.root.rotation.clone(),parent:av.root.parent};
  V.scene.add(av.root);
  var p=mode==='sleep'?V.st.mageBed:V.st.mageSit;
  av.root.position.set(p.x,mode==='sleep'?0.55:0.05,p.z);av.root.rotation.set(0,p.rot,0);
  if(av.staffHolder)av.staffHolder.visible=false;
  if(mode==='sleep')av.play('sleep',0.3);else av.play('Sitting_Idle_Loop',0.4);
  mageCycT=6+Math.random()*6;
}
function releaseMage(){
  var av=mageRef;mageRef=null;mageMode='';
  if(!av||!av._saved)return;
  var s=av._saved;av._saved=null;
  if(s.parent)s.parent.add(av.root);
  av.root.position.copy(s.p);av.root.rotation.copy(s.r);
  if(av.staffHolder)av.staffHolder.visible=true;
  av.mode='';    // пусть сцена дороги заново выберет анимацию
}

/* ════════ КАМЕРА ════════ */
/* Ввод: мышь (левая крутит, правая или Shift двигает, колесо приближает) и касания
   (один палец крутит, два пальца: щипок приближает, сдвиг двигает, поворот крутит).
   На канвасе touch-action:none, иначе браузер забирает жест себе и шлёт pointercancel. */
var ptr={},dragD=0,multi=false,g2=null,lastPick=null,onPickCb=null;
function bindInput(el){
  if(V.bound)return;V.bound=el;
  el.style.touchAction='none';
  el.addEventListener('pointerdown',function(e){
    if(!V.active)return;
    ptr[e.pointerId]={x:e.clientX,y:e.clientY,b:e.button,touch:e.pointerType!=='mouse'};
    var n=Object.keys(ptr).length;
    if(n===1){dragD=0;multi=false;
      /* дизайн: нажатие на предмет берёт его, иначе палец двигает камеру */
      if(V.design&&designCb){var gp=groundAt(e.clientX,e.clientY);ptr[e.pointerId].cap=!!(gp&&designCb.down(gp));}
    }else{multi=true;g2=null;
      for(var pk in ptr)if(ptr[pk].cap){ptr[pk].cap=false;if(designCb)designCb.up(null,false);}
    }
    try{el.setPointerCapture&&el.setPointerCapture(e.pointerId);}catch(err){}
  });
  el.addEventListener('pointermove',function(e){
    if(!V.active||!ptr[e.pointerId])return;
    var p=ptr[e.pointerId],dx=e.clientX-p.x,dy=e.clientY-p.y;p.x=e.clientX;p.y=e.clientY;
    var ids=Object.keys(ptr);
    if(ids.length>=2){
      var a=ptr[ids[0]],b=ptr[ids[1]],d=Math.max(1,Math.hypot(a.x-b.x,a.y-b.y));
      var mx=(a.x+b.x)/2,my=(a.y+b.y)/2,ang=Math.atan2(b.y-a.y,b.x-a.x);
      if(g2){
        V.goal.dist=clamp(V.goal.dist*g2.d/d,lim().d[0],lim().d[1]);
        pan(mx-g2.mx,my-g2.my);
        var da=ang-g2.a;if(da>Math.PI)da-=2*Math.PI;if(da<-Math.PI)da+=2*Math.PI;
        V.goal.az-=da;
      }
      g2={d:d,mx:mx,my:my,a:ang};return;
    }
    if(multi)return;              /* после щипка остался один палец: ждём, пока отпустят все */
    dragD+=Math.abs(dx)+Math.abs(dy);
    if(V.design){if(p.cap){var gp2=groundAt(e.clientX,e.clientY);if(gp2&&designCb)designCb.move(gp2);}else pan(dx,dy);return;}
    if(p.b===2||e.shiftKey){pan(dx,dy);return;}
    var k=p.touch?0.008:0.006;
    V.goal.az-=dx*k;V.goal.pol=clamp(V.goal.pol-dy*k*0.7,0.42,1.3);
  });
  function up(e,cancel){
    if(!ptr[e.pointerId])return;
    var was=ptr[e.pointerId];delete ptr[e.pointerId];g2=null;
    if(Object.keys(ptr).length)return;
    var tap=!cancel&&!multi&&dragD<(was.touch?10:6)&&was.b!==2;
    if(V.design){if(designCb){if(was.cap)designCb.up(groundAt(e.clientX,e.clientY),tap);else if(tap)designCb.tap(groundAt(e.clientX,e.clientY));}multi=false;return;}
    if(tap&&V.active)pick(e);
    multi=false;
  }
  el.addEventListener('pointerup',function(e){up(e,false);});
  el.addEventListener('pointercancel',function(e){up(e,true);});
  el.addEventListener('contextmenu',function(e){if(V.active)e.preventDefault();});
  el.addEventListener('wheel',function(e){if(!V.active)return;e.preventDefault();V.goal.dist=clamp(V.goal.dist*(e.deltaY>0?1.12:0.89),lim().d[0],lim().d[1]);},{passive:false});
}
function clamp(v,a,b){return Math.max(a,Math.min(b,v));}
/* v22: два экрана одной сцены. ТАВЕРНА: камера в зале, жители зала. ГОРОД: посёлок, дом под крышей, внутри никого. */
var LIM={tavern:{d:[7,26],x:[-7,12],z:[-9,10]},city:{d:[14,62],x:[-28,28],z:[-20,34]}};
var VIEW0={tavern:{az:0.5,pol:0.82,dist:19,t:[2.2,0,0]},city:{az:0.5,pol:0.9,dist:46,t:[1,0,6]}};
function lim(){return LIM[V&&V.mode==='city'?'city':'tavern'];}
function setMode(m){
  if(!V)return;m=m==='city'?'city':'tavern';
  if(V.mode===m)return;
  V.mode=m;var v0=VIEW0[m];
  V.goal.az=v0.az;V.goal.pol=v0.pol;V.goal.dist=v0.dist;V.goal.target.set(v0.t[0],v0.t[1],v0.t[2]);
  V.az=v0.az;V.pol=v0.pol;V.dist=v0.dist;V.target.copy(V.goal.target);
  if(V.roofG)V.roofG.visible=m==='city';
  if(V.prodG)V.prodG.visible=m==='city';
  if(V.renderer)V.renderer.shadowMap.needsUpdate=true;
  if(labelHost)for(var k in labelEls){labelEls[k].remove();delete labelEls[k];}
}
/* кто на каком экране: зал (хозяйка, путники, гости, повар, пивовар, помощники) или город (мастера, работники промыслов) */
function onScreen(key){var inside=key==='hostess'||/^[cwh]:/.test(key);return V.mode==='city'?!inside:inside;}
function pan(dx,dy){
  var k=V.dist*0.0018,ca=Math.cos(V.az),sa=Math.sin(V.az);
  var L=lim();
  V.goal.target.x=clamp(V.goal.target.x-(dx*ca-dy*sa)*k,L.x[0],L.x[1]);
  V.goal.target.z=clamp(V.goal.target.z-(-dx*sa-dy*ca)*k,L.z[0],L.z[1]);
}
function updateCamera(dt){
  var k=Math.min(1,dt*8),g=V.goal;
  V.az+=(g.az-V.az)*k;V.pol+=(g.pol-V.pol)*k;V.dist+=(g.dist-V.dist)*k;V.target.lerp(g.target,k);
  var c=V.camera,sp=Math.sin(V.pol);
  c.position.set(V.target.x+V.dist*sp*Math.sin(V.az),V.dist*Math.cos(V.pol)+0.5,V.target.z+V.dist*sp*Math.cos(V.az));
  c.lookAt(V.target.x,0.8,V.target.z);
  /* туман отодвигается вместе с камерой: на виде всего посёлка дома не тонут в дымке */
  V.scene.fog.near=V.dist+18;V.scene.fog.far=V.dist+100;
}
/* стены со стороны камеры опускаются до низкого бортика, как в The Sims */
var _d=null;
function updateWalls(dt){
  _d=_d||new T.Vector3();
  _d.set(Math.sin(V.az),0,Math.cos(V.az));
  for(var i=0;i<V.walls.length;i++){
    var w=V.walls[i];
    var front=w.inner||V.mode==='city'?false:w.n.dot(_d)>0.25;
    if(w.prop){w.o.visible=!(front||V.design&&V.mode!=='city');continue;}
    var goal=w.inner?0.42:(front||V.design)?0.1:1;
    w.k+=(goal-w.k)*Math.min(1,dt*6);
    w.o.scale.y=w.k;
  }
}

/* ════════ ВЫБОР МЫШЬЮ И ПОДПИСИ ════════ */
var _p=null;
function screenOf(x,y,z){
  _p=_p||new T.Vector3();_p.set(x,y,z).project(V.camera);
  if(_p.z>1)return null;
  var el=V.renderer.domElement;return {x:(_p.x+1)/2*el.clientWidth,y:(1-_p.y)/2*el.clientHeight};
}
function anchors(){
  var out=[],st=V.st||{};
  if(V.mode==='city'){
    out.push({kind:'tavern',id:'tavern',x:1,y:6.6,z:0,pick:5});
    for(var pid in SITES){var si=SITES[pid];out.push({kind:'prod',id:pid,x:si.x,y:si.ly||6.3,z:si.z,pick:si.r*0.6});}
    for(var hid in HOUSES){var hs=HOUSES[hid];out.push({kind:'house',id:hid,x:hs.x,y:6.2,z:hs.z,pick:hs.r*0.6});}
  }else{
    if(V.npcs.hostess)out.push({kind:'hostess',id:'hostess',x:st.hostess.x,y:2.25,z:st.hostess.z});
    if(st.cook&&V.npcs['w:cook'])out.push({kind:'worker',id:'cook',x:st.cook.x,y:2.4,z:st.cook.z});
    if(st.brewer&&V.npcs['w:brewer'])out.push({kind:'worker',id:'brewer',x:st.brewer.x,y:2.4,z:st.brewer.z});
    liveFurn().forEach(function(it){if(it.st||!(it.bt||it.q))return;var c=HL().center(it);out.push({kind:'furn',id:it.id,x:c.x,y:1.5,z:c.z});});
  }
  if(st.store)out.push({kind:'store',id:'store',x:st.store.x,y:2.9,z:st.store.z});
  return out;
}
function pick(e){
  var r=V.renderer.domElement.getBoundingClientRect(),mx=e.clientX-r.left,my=e.clientY-r.top,best=null,bd=48;
  anchors().forEach(function(a){
    var s=screenOf(a.x,a.pick?2:a.y-0.9,a.z);if(!s)return;
    var d=Math.hypot(s.x-mx,s.y-my)*(a.pick?0.6:1);if(d<bd){bd=d;best=a;}
  });
  if(best&&onPickCb)onPickCb(best.kind,best.id);
}
var labeler=null,labelEls={},labelHost=null;
function updateLabels(){
  if(!labelHost||!labeler)return;
  var used={};
  anchors().forEach(function(a){
    if(a.silent)return;
    var key=a.kind+':'+a.id,txt=labeler(a.kind,a.id);if(!txt)return;
    var s=screenOf(a.x,a.y,a.z);if(!s)return;
    var el=labelEls[key];
    if(!el){el=document.createElement('div');el.className='tv-lbl';labelHost.appendChild(el);labelEls[key]=el;}
    if(el._t!==txt){el._t=txt;el.innerHTML=txt;}
    el.style.transform='translate('+Math.round(s.x)+'px,'+Math.round(s.y)+'px) translate(-50%,-100%)';
    el.style.display='';used[key]=1;
  });
  for(var k in labelEls)if(!used[k])labelEls[k].style.display='none';
}

/* ════════ КАДР ════════ */
var zzT=0,zz=[];
function update(dt){
  if(!V)return;
  V.t+=dt;
  updateCamera(dt);updateWalls(dt);
  if(V.vroof)V.vroof.visible=V.mode==='city';   // навес веранды виден только в городе
  V.fires.forEach(function(f,i){var fl=0.8+Math.sin(V.t*13+i)*0.12+Math.random()*0.12;if(f.l)f.l.intensity=f.base*fl*(V.night?1.4:1);f.s.scale.set(f.size*fl,f.size*0.8*fl,1);});
  for(var key in V.npcs){
    var N=V.npcs[key];
    if(N.path.length){
      var tg=N.path[0],dx=tg.x-N.x,dz=tg.z-N.z,d=Math.hypot(dx,dz),step=N.speed*dt;
      if(d<=step){N.x=tg.x;N.z=tg.z;N.path.shift();}
      else{N.x+=dx/d*step;N.z+=dz/d*step;}
      var want=Math.atan2(dx,dz),dr=((want-N.rot+Math.PI*3)%(Math.PI*2))-Math.PI;N.rot+=dr*Math.min(1,dt*10);
      if(N.av&&N.av.curName!=='Walk_Loop')N.av.play('Walk_Loop',0.2);
      if(!N.path.length){
        if(N.leaving){removeNpc(N);continue;}
        if(N.guest)N.sitNow=true;
        else{N.rot=N.cust?Math.PI:N.rot;if(N.cust)setAnim(N,N.slot===0?ACT.custTalk:ACT.custWait);if(N.cyc)N.cycT=0;else if(N.av)N.av.play(N.anim,0.3);}
      }
    }
    if(N.sitNow&&N.av&&!N.path.length){
      N.sitNow=false;N.x=N.seat.x;N.z=N.seat.z;N.rot=N.seat.rot;N.y=0.05;
      var fed=mealFor(N,+key.slice(2));
      N.anim=rnd(+key.slice(2)*1.7)<0.5?'Sitting_Talking_Loop':'Sitting_Idle_Loop';N.av.play(N.anim,0.3);
      N.cyc=fed?ACT.sitFed:ACT.sit;N.cycT=4+Math.random()*6;
    }else if(N.guest&&!N.path.length){/* сидит */}
    else if(N.cust&&N.av&&!N.path.length){setAnim(N,N.slot===0?ACT.custTalk:ACT.custWait);var dr2=((Math.PI-N.rot+Math.PI*3)%(Math.PI*2))-Math.PI;N.rot+=dr2*Math.min(1,dt*6);}
    if(N.cyc&&N.av&&!N.path.length&&!N.sitNow){N.cycT-=dt;if(N.cycT<=0)pickCyc(N);}
    if(N.av){var vis=onScreen(key);N.av.root.visible=vis;if(N.meal)N.meal.visible=vis;
      if(vis){N.av.root.position.set(N.x,N.y||0,N.z);N.av.root.rotation.y=N.rot;N.av.update(dt,'npc');}}
  }
  if(V.prodFx)V.prodFx.forEach(function(f,i){f.s.position.y=f.y+Math.sin(V.t*1.6+i*2.1)*0.35;f.s.material.opacity=0.55+Math.sin(V.t*2.3+i)*0.25;});
  var city=V.mode==='city';
  if(V.penPets)V.penPets.forEach(function(pp){pp.root.visible=city;if(city)pp.mixer.update(dt);});
  if(V.pet){V.pet.root.visible=!city;if(!city){V.pet.mixer.update(dt);if(V.pet.fly)V.pet.root.position.y=V.pet.fly+Math.sin(V.t*2)*0.06;}}
  if(mageRef)mageRef.root.visible=!city;
  if(mageRef&&!city){mageRef.update(dt,'npc');
    /* v21: маг за столом иногда отпивает из кружки */
    if(mageMode==='sit'){mageCycT-=dt;if(mageCycT<=0){var dk=mageRef.curName!=='sitDrink'&&Math.random()<0.5;mageRef.play(dk?'sitDrink':'Sitting_Idle_Loop',0.35);mageCycT=dk?2.66:6+Math.random()*8;}}
    if(mageMode==='sleep'){zzT-=dt;if(zzT<=0&&mageRef.head)zzT=1.2,spawnZ();}
  }
  for(var i=zz.length-1;i>=0;i--){var z=zz[i];z.t+=dt;z.s.position.y+=dt*0.4;z.s.material.opacity=1-z.t/2.2;if(z.t>2.2){V.scene.remove(z.s);z.s.material.dispose();zz.splice(i,1);}}
  updateLabels();
}
var zTexC=null;
function spawnZ(){
  if(!zTexC){var c=document.createElement('canvas');c.width=c.height=64;var x=c.getContext('2d');x.font='bold 48px monospace';x.fillStyle='#e8f4ff';x.textAlign='center';x.fillText('Z',32,48);zTexC=new T.CanvasTexture(c);}
  var s=new T.Sprite(new T.SpriteMaterial({map:zTexC,transparent:true,depthWrite:false}));
  mageRef.head.getWorldPosition(s.position);s.position.y+=0.4;s.scale.set(0.4,0.4,1);V.scene.add(s);zz.push({s:s,t:0});
}
function resize(w,h){if(!V)return;V.camera.aspect=w/Math.max(1,h);V.camera.updateProjectionMatrix();}
function setActive(on,host){
  if(!V)return;V.active=on;
  if(on&&host){bindInput(V.renderer.domElement);
    if(!labelHost){labelHost=document.createElement('div');labelHost.className='tv-labels';host.parentNode.appendChild(labelHost);}
  }
  if(labelHost)labelHost.style.display=on?'':'none';
  V.renderer.shadowMap.needsUpdate=true;
}
function resetView(){if(!V)return;var v0=VIEW0[V.mode==='city'?'city':'tavern'];V.goal.az=v0.az;V.goal.pol=v0.pol;V.goal.dist=v0.dist;V.goal.target.set(v0.t[0],v0.t[1],v0.t[2]);}

window.Tavern3D={masterLook:function(id){return MASTER_LOOK[id]?fullLook(MASTER_LOOK[id]):null;},init:init,load:load,build:build,sync:sync,update:update,resize:resize,setActive:setActive,setMage:setMage,releaseMage:releaseMage,
  resetView:resetView,setMode:setMode,get mode(){return V?V.mode:'tavern';},bytesNeeded:bytesNeeded,stats:function(){if(!V)return null;var n=0,tri=0;V.scene.traverse(function(o){if(o.isMesh&&o.visible){n++;var g=o.geometry;tri+=g.index?g.index.count/3:g.attributes.position.count/3;}});var np=Object.keys(V.npcs),nr=np.filter(function(k){return V.npcs[k].ready;}).length;return {npcs:np.length,npcReady:nr,npcPos:np.map(function(k){var N=V.npcs[k];return k+':'+N.x.toFixed(1)+','+N.z.toFixed(1);}).join(' '),meshes:n,tri:Math.round(tri),calls:V.renderer.info.render.calls,rtri:V.renderer.info.render.triangles};},advanceMage:function(sec){if(mageRef)mageRef.update(sec,'npc');},focus:function(x,z,d){if(V){V.goal.target.set(x,0,z);if(d)V.goal.dist=d;}},
  onPick:function(fn){onPickCb=fn;},setLabeler:function(fn){labeler=fn;},
  get ready(){return readyFlag;},get loading(){return !!loading&&!readyFlag;},get scene(){return V&&V.scene;},get camera(){return V&&V.camera;},
  get active(){return !!(V&&V.active);},get built(){return !!V;},get _v(){return V;},
  furnShow:function(items){furnSync(items);},designMark:designMark,setDesign:setDesign,get design(){return !!(V&&V.design);},groundAt:groundAt,thumb:thumb,_box:function(n){var o=model(n),b=new T.Box3().setFromObject(o);return [b.min.x,b.min.y,b.min.z,b.max.x,b.max.y,b.max.z].map(function(v){return +v.toFixed(2);});},get _kit(){return Object.keys(KIT);}};
})();
