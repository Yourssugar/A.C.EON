/* Aceonium: таверна в 3D, вид сверху с вращением и зумом (v9).
   Модели: Quaternius Medieval Village + Fantasy Props, KayKit Furniture/Resource Bits (CC0).
   Текстуры пола, стен и двора: Poly Haven (CC0). Всё лежит в assets/tavern, качается при первом входе.
   Рендерер общий со сценой дороги (scene3d.js): она вызывает update() и рисует scene/camera отсюда.
   Жители (мастера, хозяйка, путники) собираются из того же набора персонажей, что и маг (avatar.js). */
(function(){
'use strict';

var T=null,GLTF=null,loader=null,BASE='assets/tavern/',SIZES={};
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
  MI_Trim_Cloth:{c:'tcloth_color',n:'tcloth_normal',orm:'tcloth_orm',alpha:true},
  furniture_texture:{c:'kfurn_color'},
  resource:{c:'kres_color'},
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
  var b=0;['models/tv_build.glb','models/tv_props.glb','models/tv_misc.glb'].concat(texList()).forEach(function(f){if(!TEXC[f]&&!KIT[f])b+=SIZES[f]||0;});
  return b;
}
function load(resolution,onProgress){
  if(loading)return loading;
  res=resolution||'1k';
  var files=['models/tv_build.glb','models/tv_props.glb','models/tv_misc.glb'],texs=texList();
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
  var o=src.clone(true);
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
   Сетка 2 м. X вправо, Z к зрителю. Главный дом X[-6,6] Z[-4,4]: комната мага слева, зал справа.
   Пристройки появляются после покупки: кузня (восток, север), дубильня (восток, юг), ювелирная (север).
   Двор на юге: дорога, столярный навес, шахта, склад под навесом слева от дома. */
var DOOR={x:1,z:4};
var PATH_IN=[[1,15],[1,5.2],[1,2.8]];
function place(o,x,z,rot,y){o.position.set(x,y||0,z);o.rotation.y=rot||0;return o;}

function build(renderer){
  if(V)return V;
  V={renderer:renderer,scene:new T.Scene(),camera:new T.PerspectiveCamera(40,1,0.1,240),walls:[],npcs:{},cust:{},pool:[],sig:'',
     az:0.5,pol:0.9,dist:30,target:new T.Vector3(0.5,0,1.5),goal:{az:0.5,pol:0.9,dist:30,target:new T.Vector3(0.5,0,1.5)},
     t:0,night:false,labels:{},active:false,fires:[]};
  var s=V.scene;
  s.background=new T.Color(0x8fb4cc);s.fog=new T.Fog(0x8fb4cc,40,95);
  V.hemi=new T.HemisphereLight(0xe0ecff,0x4a5a30,1.1);s.add(V.hemi);
  V.sun=new T.DirectionalLight(0xfff0d8,1.7);V.sun.position.set(14,26,18);V.sun.target.position.set(1,0,0);s.add(V.sun);s.add(V.sun.target);
  V.sun.castShadow=true;var sc=V.sun.shadow.camera;sc.left=-20;sc.right=20;sc.top=20;sc.bottom=-20;sc.near=1;sc.far=70;
  V.sun.shadow.mapSize.set(2048,2048);V.sun.shadow.bias=-0.0005;V.sun.shadow.normalBias=0.04;
  V.inner=new T.PointLight(0xffb060,0,16,1.6);V.inner.position.set(1,2.6,-2.5);s.add(V.inner);
  /* земля и двор */
  var gm=mat('grass');gm.color.set('#b4c890');
  var grass=plane(80,80,gm,16);grass.position.y=-0.03;s.add(grass);
  var path=plane(3,11,mat('yard'),1.5,5.5);place(path,1,9.6,0,-0.01);s.add(path);
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

/* полная пересборка по состоянию игры */
function layout(S){
  var G=V.layout;
  G.traverse(function(o){if(o.userData&&o.userData.merged)o.geometry.dispose();});
  while(G.children.length)G.remove(G.children[0]);
  V.walls.length=0;V.fires.length=0;
  var B=S.build,mk=function(id){return S.masters[id]&&S.masters[id].hired;};
  var forge=B.forge>0,tannery=B.tannery>0,jewelry=B.jewelry>0,hall=B.hall||0,bed=B.bedroom||0,decor=B.decor||0;
  var st=V.st={};
  /* главный дом */
  room(G,-6,6,-4,4,'plaster',{
    N:{win:[-3,3],door:jewelry?[-1]:[]},
    S:{win:[-5,-1,3,5],door:[1]},
    W:{win:[-1,1]},
    E:{door:[forge?-3:99,tannery?1:99].filter(function(v){return v!==99;}),win:[forge?99:-1,tannery?99:3]}
  });
  /* стена между комнатой мага и залом: низкая, с проходом */
  for(var zz=-3;zz<4;zz+=2)if(zz!==1)wall(G,'plaster',-2,zz,Math.PI/2,{inner:true});
  /* камин в зале у северной стены */
  var hearth=box(2.2,1.2,0.8,mat('stone'),1);place(hearth,1,-3.45,0,0.6);G.add(hearth);
  var mouth=box(1.1,0.75,0.3,new T.MeshBasicMaterial({color:0x140804}));place(mouth,1,-3.1,0,0.42);G.add(mouth);
  var mantel=box(2.5,0.14,0.95,mat('dwood'),1);place(mantel,1,-3.4,0,1.27);G.add(mantel);
  var chim=box(1.2,1.9,0.6,mat('stone'),1);place(chim,1,-3.65,0,2.15);G.add(chim);
  fire(G,1,0.18,-3.0,1.0);
  /* стойка и хозяйка */
  var cnt=box(2.8,1.0,0.6,mat('fwood'),1.2);place(cnt,4.3,-1.75,0,0.5);G.add(cnt);
  var top=box(3.0,0.08,0.75,mat('dwood'),1.2);place(top,4.3,-1.75,0,1.04);G.add(top);
  prop(G,'Mug',3.6,-1.7,0,1.08);prop(G,'Mug',4.9,-1.8,0.6,1.08);
  prop(G,'Shelf_Simple',4.4,-3.75,0,1.4);prop(G,'Barrel_Holder',5.3,-3.3,0);prop(G,'Bottle_1',4.0,-3.7,0,1.45);
  st.hostess={x:4.3,z:-2.75,rot:0};
  /* травница: котёл и полка у стены комнаты мага */
  prop(G,'Cauldron',-0.9,-2.7,0);prop(G,'Shelf_Small_Bottles',-1.6,-1.4,Math.PI/2,0.9);prop(G,'Potion_2',-0.2,-3.5,0,0);
  st.herbalist={x:-0.85,z:-1.75,rot:Math.PI};
  /* столы зала: больше с уровнем зала */
  var tables=[[0.4,1.9],[0.4,-0.3],[4.6,2.3]].slice(0,1+Math.min(2,hall));
  tables.forEach(function(p,i){
    prop(G,'Table_Large',p[0],p[1],0);prop(G,'Bench',p[0],p[1]-0.85,0);prop(G,'Bench',p[0],p[1]+0.85,Math.PI);
    prop(G,'Mug',p[0]-0.6,p[1],0,0.82);prop(G,'Table_Plate',p[0]+0.5,p[1]+0.1,0,0.82);
    if(decor>=1)prop(G,'CandleStick_Triple',p[0],p[1]-0.1,0,0.82);
  });
  if(hall>=2){prop(G,'Stool',2.6,0.8,0);prop(G,'Stool',3.2,3.2,0);}
  if(hall>=3)prop(G,'Chandelier',1.5,0.6,0,3.05);
  if(hall>=4)prop(G,'Barrel',5.4,0.4,0);
  if(hall>=5)prop(G,'rug_rectangle_stripes_A',1.6,0.6,Math.PI/2,0.02,1.6);
  /* комната мага: кровать, сундук, кресло; спальня добавляет уют */
  var bedName=bed>=3?'Bed_Twin2':'Bed_Twin1';
  prop(G,bedName,-4.6,-2.6,Math.PI/2);
  prop(G,'Nightstand_Shelf',-5.55,-0.95,Math.PI/2);prop(G,'Candle_1',-5.55,-0.95,0,0.6);
  prop(G,'Chest_Wood',-2.8,-3.4,0);
  prop(G,'Chair_1',-3.4,2.4,Math.PI*0.8);prop(G,'Table_Plate',-3.0,3.3,0,0);
  st.mageSit={x:-3.4,z:2.4,rot:Math.PI*0.8};
  st.mageBed={x:-4.6,z:-2.6,rot:Math.PI/2};
  if(bed>=1)prop(G,'rug_oval_A',-4,0.8,0,0.02,1.4);
  if(bed>=2)prop(G,'Bookcase_2',-5.6,2.2,Math.PI/2);
  if(bed>=4)prop(G,'CandleStick',-3.2,-3.5,0,0.69);
  /* убранство */
  if(decor>=1){prop(G,'Banner_1',3,-3.82,0,1.2);}
  if(decor>=2){prop(G,'Lantern_Wall',-1.8,3.75,Math.PI,1.9);prop(G,'Lantern_Wall',5.8,0,-Math.PI/2,1.9);}
  if(decor>=3){prop(G,'Banner_2',-3,-3.82,0,1.2);prop(G,'Prop_Vine2',-6.1,4.1,0);}
  if(decor>=4){prop(G,'rug_rectangle_A',-4.2,-0.6,0,0.02,1.3);prop(G,'Vase_2',5.5,3.5,0);}
  if(decor>=5){prop(G,'Prop_Vine5',6.1,4.1,0);prop(G,'Chalice',4.6,-1.75,0,1.08);}
  /* кузня */
  if(forge){
    room(G,6,10,-4,0,'brick',{W:{skip:true},S:{inner:tannery,win:tannery?[]:[9]},floor:'cobble',E:{win:[-1]}});
    prop(G,'Anvil_Log',8,-1.9,0);prop(G,'Anvil',8,-1.9,0,0.55);
    prop(G,'Whetstone',9.3,-3.2,0);prop(G,'WeaponStand',9.2,-0.9,-Math.PI/2);prop(G,'Barrel',6.7,-0.6,0);
    var fh=box(1.4,1.0,1.0,mat('stone'),1);place(fh,6.9,-3.4,0,0.5);G.add(fh);fire(G,6.9,1.02,-3.4,0.8);
    st.smith={x:8,z:-1.05,rot:Math.PI};
  }else st.smith=null;
  /* дубильня */
  if(tannery){
    room(G,6,10,0,4,'grid',{W:{skip:true},N:{skip:forge},S:{win:[9]},E:{win:[3]}});
    prop(G,'Workbench_Drawers',8.4,3.3,Math.PI);prop(G,'Textiles_Stack_Small',9.3,1.1,0);prop(G,'Peg_Rack',9.85,2.2,-Math.PI/2,1.6);
    prop(G,'Dummy',7.0,0.9,Math.PI*0.75);prop(G,'Rope_1',9.6,3.4,0,0);
    st.tanner={x:8.4,z:2.4,rot:0};
  }else st.tanner=null;
  /* ювелирная */
  if(jewelry){
    room(G,-2,2,-8,-4,'plaster',{S:{skip:true},N:{win:[1]},W:{win:[-7]}});
    prop(G,'BookStand',-0.5,-6.8,0);prop(G,'Chest_Wood',1.2,-7.3,0);prop(G,'Coin_Pile',1.2,-7.3,0,0.7);
    prop(G,'Bookcase_2',-1.65,-5.2,Math.PI/2);prop(G,'CandleStick_Triple',0.4,-6.9,0,0);
    st.jeweler={x:-0.5,z:-6.0,rot:Math.PI};
  }else st.jeweler=null;
  /* столярный навес во дворе */
  var cx=6.5,cz=7.5;
  prop(G,'Prop_Support',cx-1.6,cz-1.2,Math.PI);prop(G,'Prop_Support',cx+1.6,cz-1.2,Math.PI);
  var roof=box(4.4,0.12,2.6,mat('thatch'),1.2);place(roof,cx,cz-0.2,0,2.75);roof.rotation.x=-0.18;G.add(roof);
  prop(G,'Workbench',cx,cz-0.6,0);prop(G,'Wood_Planks_Stack_Medium',cx+1.6,cz+0.4,0.3);prop(G,'Axe_Bronze',cx-0.6,cz-0.6,0,0.9);
  st.carpenter={x:cx,z:cz+0.2,rot:Math.PI};
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
  /* шахта: вагонетка, кирка, куча угля */
  if(S.mine.lvl>0){
    prop(G,'Prop_Wagon',-7,8.6,Math.PI*0.6,0,0.8);prop(G,'Pickaxe_Bronze',-5.4,9.4,0.4);
    V.coal=prop(G,'Stone_Chunks_Large',-5.8,7.6,0,0,1.2);
    V.coal.traverse(function(m){if(m.isMesh){m.material=m.material.clone();m.material.color.set('#3a3a42');}});
    st.mine={x:-6.6,z:8.4};
  }else{st.mine=null;V.coal=null;}
  /* забор вдоль дороги, проход к двери */
  for(var fx=-9;fx<=9;fx+=2)if(Math.abs(fx-1)>1)prop(G,'Prop_WoodenFence_Single',fx,12.4,0);
  prop(G,'Barrel_Apples',2.6,5.0,0);prop(G,'Crate_Wooden',-0.6,5.0,0.3);
  if(decor>=2)prop(G,'Stall_Cart_Empty',-2.8,9.8,Math.PI*0.35,0,0.9);
  /* очередь путников перед стойкой */
  st.queue=[[4.3,-0.9],[4.3,0.2],[3.4,1.0],[2.6,1.8],[2.0,2.9],[2.8,3.4],[3.8,3.3],[5.0,3.2]];
  /* неподвижное склеиваем по материалам: сотни мешей превращаются в пару десятков вызовов отрисовки */
  mergeStatic(G);
  var n=!!V.night;V.night=null;setNight(n);
}

function mergeStatic(G){
  G.updateMatrixWorld(true);
  var keep=new Set();
  V.walls.forEach(function(w){w.o.traverse(function(o){keep.add(o);});});
  if(V.coal)V.coal.traverse(function(o){keep.add(o);});
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
  V.walls.forEach(function(w){w.o.traverse(function(o){if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});});
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
  V.hemi.intensity=on?0.6:1.25;V.hemi.color.set(on?0x7088c0:0xe0ecff);
  V.sun.intensity=on?0.45:1.8;V.sun.color.set(on?0x9ab0e8:0xfff0d8);
  V.scene.background.set(on?0x0b1426:0x8fb4cc);V.scene.fog.color.set(on?0x0b1426:0x8fb4cc);
  V.inner.intensity=on?2.2:0.8;
  if(V.glass){V.glass.emissiveIntensity=on?1.2:0;}
}

/* ════════ ЖИТЕЛИ ════════ */
var MASTER_LOOK={
  herbalist:{gender:'f',skin:2,hair:'long',hairColor:5,beard:'none',body:'peasant',arms:'peasant',legs:'peasant',feet:'peasant',colors:{peasant:1}},
  carpenter:{gender:'m',skin:1,hair:'buzzed',hairColor:1,beard:'beard',body:'peasant',arms:'peasant',legs:'ranger',feet:'peasant',colors:{peasant:0,ranger:0}},
  smith:    {gender:'m',skin:3,hair:'none',hairColor:0,beard:'beard',body:'ranger',arms:'peasant',legs:'ranger',feet:'ranger',colors:{ranger:1,peasant:0}},
  tanner:   {gender:'f',skin:1,hair:'buns',hairColor:3,beard:'none',body:'ranger',arms:'ranger',legs:'peasant',feet:'ranger',colors:{ranger:0,peasant:1}},
  jeweler:  {gender:'m',skin:0,hair:'parted',hairColor:6,beard:'none',body:'peasant',arms:'peasant',legs:'peasant',feet:'peasant',colors:{peasant:1}},
  hostess:  {gender:'f',skin:1,hair:'buns',hairColor:2,beard:'none',body:'peasant',arms:'peasant',legs:'peasant',feet:'peasant',colors:{peasant:0}}
};
var WORK={herbalist:'Interact',carpenter:'PickUp_Table',smith:'Sword_Attack',tanner:'Fixing_Kneeling',jeweler:'Interact'};
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
  N.alive=false;
  if(N.av){V.scene.remove(N.av.root);}
  delete V.npcs[N.key];
}
function setAnim(N,a){if(N.anim===a)return;N.anim=a;if(N.av)N.av.play(a,0.3);}
function goTo(N,pts){N.path=pts.map(function(p){return {x:p[0],z:p[1]};});}

/* ════════ СИНХРОНИЗАЦИЯ С ИГРОЙ ════════ */
function signature(S){
  var hired=Object.keys(S.masters).filter(function(k){return S.masters[k].hired;}).join(',');
  return JSON.stringify([S.build,S.storeLvl,S.mine.lvl,hired]);
}
function sync(S){
  if(!V||!readyFlag)return;
  var sig=signature(S);
  if(sig!==V.sig){V.sig=sig;layout(S);placeMasters(S,true);}
  setNight(S.place==='sleep');
  placeMasters(S,false);
  syncCustomers(S);
  if(V.coal&&S.mine.lvl){var k=S.mine.acc/Math.max(1,D().MINE.cap(S.mine.lvl));V.coal.scale.setScalar(0.4+k*1.1);}
  V.S=S;
}
function D(){return window.AcData;}
function placeMasters(S,moved){
  var st=V.st;
  ['herbalist','carpenter','smith','tanner','jeweler'].forEach(function(id){
    var m=S.masters[id],p=st[id],key='m:'+id,N=V.npcs[key];
    if(!m||!m.hired||!p){if(N)removeNpc(N);return;}
    if(!N)N=spawnNpc(key,fullLook(MASTER_LOOK[id]),p.x,p.z,p.rot);
    if(moved){N.x=p.x;N.z=p.z;N.rot=p.rot;N.path=[];}
    setAnim(N,m.q.length?WORK[id]:'Idle_Loop');
  });
  var h=V.npcs.hostess;
  if(!h)h=spawnNpc('hostess',fullLook(MASTER_LOOK.hostess),st.hostess.x,st.hostess.z,st.hostess.rot);
  setAnim(h,S.cust.length&&S.place!=='sleep'?'Idle_Talking_Loop':'Idle_Loop');
}
/* сколько путников рисовать: каждый это полноценный персонаж, на слабой графике меньше */
var CUST_MAX={low:3,medium:5,high:8,ultra:8};
function syncCustomers(S){
  var seen={},lim=CUST_MAX[window.Scene3D&&Scene3D.quality]||5;
  S.cust.forEach(function(c,i){
    if(i>=lim)return;
    seen[c.id]=1;
    var key='c:'+c.id,N=V.npcs[key],slot=V.st.queue[Math.min(i,V.st.queue.length-1)];
    if(!N){
      N=spawnNpc(key,travelerLook(c),PATH_IN[0][0],PATH_IN[0][1],Math.PI);
      goTo(N,PATH_IN.slice(1).concat([slot]));N.slot=i;N.cust=true;N.speed=1.6;
    }else if(N.slot!==i&&!N.leaving){N.slot=i;goTo(N,[slot]);}
  });
  for(var key in V.npcs){
    var N=V.npcs[key];
    if(!N.cust||N.leaving)continue;
    var id=+key.slice(2);
    if(!seen[id]){N.leaving=true;goTo(N,[[2.4,2.8],PATH_IN[1],PATH_IN[0]]);}
  }
}

/* ════════ МАГ В ТАВЕРНЕ ════════ */
var mageRef=null,mageMode='';
function setMage(av,mode){
  if(!V)return;
  if(mageRef&&mageRef!==av)releaseMage();
  mageRef=av;mageMode=mode;
  if(!av)return;
  if(!av._saved)av._saved={p:av.root.position.clone(),r:av.root.rotation.clone(),parent:av.root.parent};
  V.scene.add(av.root);
  var p=mode==='sleep'?V.st.mageBed:V.st.mageSit;
  av.root.position.set(p.x,mode==='sleep'?0.55:0.05,p.z);av.root.rotation.set(0,p.rot,0);
  if(av.staffHolder)av.staffHolder.visible=false;
  if(mode==='sleep')av.play('Death01',0.3);else av.play('Sitting_Idle_Loop',0.4);
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
var ptr={},dragD=0,pinch=0,lastPick=null,onPickCb=null;
function bindInput(el){
  if(V.bound)return;V.bound=el;
  el.addEventListener('pointerdown',function(e){if(!V.active)return;ptr[e.pointerId]={x:e.clientX,y:e.clientY,b:e.button};dragD=0;el.setPointerCapture&&el.setPointerCapture(e.pointerId);});
  el.addEventListener('pointermove',function(e){
    if(!V.active||!ptr[e.pointerId])return;
    var p=ptr[e.pointerId],dx=e.clientX-p.x,dy=e.clientY-p.y;p.x=e.clientX;p.y=e.clientY;dragD+=Math.abs(dx)+Math.abs(dy);
    var ids=Object.keys(ptr);
    if(ids.length===2){
      var a=ptr[ids[0]],b=ptr[ids[1]],d=Math.hypot(a.x-b.x,a.y-b.y);
      if(pinch)V.goal.dist=clamp(V.goal.dist*pinch/d,7,40);
      pinch=d;return;
    }
    if(p.b===2||e.shiftKey){pan(dx,dy);return;}
    V.goal.az-=dx*0.006;V.goal.pol=clamp(V.goal.pol-dy*0.004,0.42,1.3);
  });
  function up(e){
    if(!ptr[e.pointerId])return;
    var was=ptr[e.pointerId];delete ptr[e.pointerId];pinch=0;
    if(V.active&&dragD<6&&was.b!==2)pick(e);
  }
  el.addEventListener('pointerup',up);el.addEventListener('pointercancel',up);
  el.addEventListener('contextmenu',function(e){if(V.active)e.preventDefault();});
  el.addEventListener('wheel',function(e){if(!V.active)return;e.preventDefault();V.goal.dist=clamp(V.goal.dist*(e.deltaY>0?1.12:0.89),7,40);},{passive:false});
}
function clamp(v,a,b){return Math.max(a,Math.min(b,v));}
function pan(dx,dy){
  var k=V.dist*0.0018,ca=Math.cos(V.az),sa=Math.sin(V.az);
  V.goal.target.x=clamp(V.goal.target.x-(dx*ca-dy*sa)*k,-10,11);
  V.goal.target.z=clamp(V.goal.target.z-(-dx*sa-dy*ca)*k,-9,12);
}
function updateCamera(dt){
  var k=Math.min(1,dt*8),g=V.goal;
  V.az+=(g.az-V.az)*k;V.pol+=(g.pol-V.pol)*k;V.dist+=(g.dist-V.dist)*k;V.target.lerp(g.target,k);
  var c=V.camera,sp=Math.sin(V.pol);
  c.position.set(V.target.x+V.dist*sp*Math.sin(V.az),V.dist*Math.cos(V.pol)+0.5,V.target.z+V.dist*sp*Math.cos(V.az));
  c.lookAt(V.target.x,0.8,V.target.z);
}
/* стены со стороны камеры опускаются до низкого бортика, как в The Sims */
var _d=null;
function updateWalls(dt){
  _d=_d||new T.Vector3();
  _d.set(Math.sin(V.az),0,Math.cos(V.az));
  for(var i=0;i<V.walls.length;i++){
    var w=V.walls[i];
    var front=w.inner?false:w.n.dot(_d)>0.25;
    var goal=w.inner?0.42:front?0.1:1;
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
  ['herbalist','carpenter','smith','tanner','jeweler'].forEach(function(id){var N=V.npcs['m:'+id];if(N)out.push({kind:'master',id:id,x:N.x,y:2.25,z:N.z});});
  if(V.npcs.hostess)out.push({kind:'hostess',id:'hostess',x:st.hostess.x,y:2.25,z:st.hostess.z});
  if(st.mine)out.push({kind:'mine',id:'mine',x:st.mine.x,y:1.9,z:st.mine.z});
  if(st.store)out.push({kind:'store',id:'store',x:st.store.x,y:2.9,z:st.store.z});
  for(var k in V.npcs){var N=V.npcs[k];if(N.cust&&!N.leaving)out.push({kind:'customer',id:k,x:N.x,y:2.0,z:N.z,silent:true});}
  return out;
}
function pick(e){
  var r=V.renderer.domElement.getBoundingClientRect(),mx=e.clientX-r.left,my=e.clientY-r.top,best=null,bd=48;
  anchors().forEach(function(a){
    var s=screenOf(a.x,a.y-0.9,a.z);if(!s)return;
    var d=Math.hypot(s.x-mx,s.y-my);if(d<bd){bd=d;best=a;}
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
  V.fires.forEach(function(f,i){var fl=0.8+Math.sin(V.t*13+i)*0.12+Math.random()*0.12;f.l.intensity=f.base*fl*(V.night?1.4:1);f.s.scale.set(f.size*fl,f.size*0.8*fl,1);});
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
        N.rot=N.cust?Math.PI:N.rot;
        if(N.av)N.av.play(N.cust?(N.slot===0?'Idle_Talking_Loop':'Idle_Loop'):N.anim,0.3);
      }
    }else if(N.cust&&N.av){var a=N.slot===0?'Idle_Talking_Loop':'Idle_Loop';if(N.av.curName!==a)N.av.play(a,0.3);var dr2=((Math.PI-N.rot+Math.PI*3)%(Math.PI*2))-Math.PI;N.rot+=dr2*Math.min(1,dt*6);}
    if(N.av){N.av.root.position.set(N.x,0,N.z);N.av.root.rotation.y=N.rot;N.av.update(dt,'npc');}
  }
  if(mageRef){mageRef.update(dt,'npc');
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
function resetView(){if(!V)return;V.goal.az=0.5;V.goal.pol=0.9;V.goal.dist=30;V.goal.target.set(0.5,0,1.5);}

window.Tavern3D={init:init,load:load,build:build,sync:sync,update:update,resize:resize,setActive:setActive,setMage:setMage,releaseMage:releaseMage,
  resetView:resetView,bytesNeeded:bytesNeeded,stats:function(){if(!V)return null;var n=0,tri=0;V.scene.traverse(function(o){if(o.isMesh&&o.visible){n++;var g=o.geometry;tri+=g.index?g.index.count/3:g.attributes.position.count/3;}});return {meshes:n,tri:Math.round(tri),calls:V.renderer.info.render.calls,rtri:V.renderer.info.render.triangles};},advanceMage:function(sec){if(mageRef)mageRef.update(sec,'npc');},focus:function(x,z,d){if(V){V.goal.target.set(x,0,z);if(d)V.goal.dist=d;}},
  onPick:function(fn){onPickCb=fn;},setLabeler:function(fn){labeler=fn;},
  get ready(){return readyFlag;},get loading(){return !!loading&&!readyFlag;},get scene(){return V&&V.scene;},get camera(){return V&&V.camera;},
  get active(){return !!(V&&V.active);},get built(){return !!V;}};
})();
