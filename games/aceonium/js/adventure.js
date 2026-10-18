/* Aceonium: ассеты приключения (v12). Деревья, кусты, камни и трава: Quaternius Stylized Nature MegaKit.
   Враги: Quaternius Ultimate Monsters (Big) и Easy Enemy Pack. Земля и дорога: Poly Haven. Всё CC0, лежит в assets/adventure.
   Сцена дороги (scene3d.js) спрашивает отсюда: набор леса для тракта, текстуры земли и копию монстра.
   Пока ничего не скачано, scene3d рисует старый лес из простых фигур. */
(function(){
'use strict';

var T=null,GLTF=null,SKU=null,loader=null,BASE='assets/adventure/',SIZES={},res='1k';
var NAT={},TEX={},TEXP={},MON={},MONP={},MATS={};
var baseP=null,baseReady=false;

function url(p){return window.Boot?Boot.url(BASE+p):BASE+p;}
function fetchBuf(p){return fetch(url(p)).then(function(r){if(!r.ok)throw new Error(r.status+' '+p);return r.arrayBuffer();});}
function parse(buf){return new Promise(function(ok,bad){loader.parse(buf,'',ok,bad);});}
function loadTex(name,srgb){
  var f='tex/'+name+'_'+res+'.webp';
  if(TEXP[f])return TEXP[f];
  TEXP[f]=fetchBuf(f).then(function(buf){
    var blob=new Blob([buf],{type:'image/webp'});
    return (window.createImageBitmap?createImageBitmap(blob,{imageOrientation:'none'}):new Promise(function(ok,bad){var im=new Image();im.onload=function(){ok(im);};im.onerror=bad;im.src=URL.createObjectURL(blob);}));
  }).then(function(img){
    var t=new T.Texture(img);t.flipY=false;t.anisotropy=8;if(srgb)t.colorSpace=T.SRGBColorSpace;t.needsUpdate=true;TEX[name]=t;return t;
  });
  return TEXP[f];
}

/* ════════ ПРИРОДА ════════ */
/* материал модели -> текстура; alpha: листья и трава с вырезом */
var NMAT={
  Bark_NormalTree:{t:'bark'},Bark_DeadTree:{t:'bark_dead'},Bark_TwistedTree:{t:'bark_twisted'},
  Leaves_NormalTree:{t:'leaves_tree',a:1,leaf:1},Leaves_Pine:{t:'leaves_pine',a:1,leaf:1},Leaves_TwistedTree:{t:'leaves_twisted',a:1,leaf:1},
  Leaves:{t:'leaves',a:1,leaf:1},Flowers:{t:'flowers',a:1},Grass:{t:'grass',a:1,leaf:1},
  Rocks:{t:'rocks'},PathRocks:{t:'pathrocks'},Mushrooms:{t:'mushrooms'}
};
function natTexNames(){var s={};for(var k in NMAT)s[NMAT[k].t]=1;return Object.keys(s);}
function natMat(name,vc){
  var id=name+(vc?':vc':'');if(MATS[id])return MATS[id];
  var d=NMAT[name]||{},m=new T.MeshLambertMaterial({color:0xffffff});
  if(d.t&&TEX[d.t])m.map=TEX[d.t];
  if(d.a){m.alphaTest=0.45;m.side=T.DoubleSide;}
  if(vc)m.vertexColors=true;
  m.userData.leaf=!!d.leaf;
  MATS[id]=m;return m;
}
/* части модели: геометрия, материал и матрица относительно корня модели */
function parts(name){
  var src=NAT[name];if(!src)return null;
  if(src.userData.parts)return src.userData.parts;
  var out=[];src.updateMatrixWorld(true);
  var inv=new T.Matrix4().copy(src.matrixWorld).invert();
  src.traverse(function(o){
    if(!o.isMesh)return;
    var mats=Array.isArray(o.material)?o.material:[o.material];
    var m=new T.Matrix4().multiplyMatrices(inv,o.matrixWorld);
    var vc=!!o.geometry.attributes.color;
    if(mats.length===1)out.push({geo:o.geometry,mat:natMat(mats[0].name,vc),m:m,leaf:NMAT[mats[0].name]&&NMAT[mats[0].name].leaf});
    else o.geometry.groups.forEach(function(g){
      var geo=o.geometry.clone();geo.clearGroups();geo.setIndex(Array.prototype.slice.call(o.geometry.index.array,g.start,g.start+g.count));
      var mm=mats[g.materialIndex];out.push({geo:geo,mat:natMat(mm.name,vc),m:m,leaf:NMAT[mm.name]&&NMAT[mm.name].leaf});
    });
  });
  src.userData.parts=out;return out;
}

/* наборы леса по трактам. n - сколько штук при полной плотности, xr - отступ от дороги, sr - масштаб,
   g - трава (плотность травы из настроек графики), leaf - палитра листвы (цвет на экземпляр), lit - яркость коры */
var SETS=[
  /* 0 Летний тракт */
  [{m:'CommonTree_1',n:9,xr:[4.5,28],sr:[0.8,1.15],leaf:['#6a9a2a','#7aa834','#5c8c26','#86b03e']},{m:'CommonTree_2',n:9,xr:[4.5,28],sr:[0.8,1.15],leaf:['#6a9a2a','#7aa834','#5c8c26','#86b03e']},{m:'CommonTree_3',n:8,xr:[5,30],sr:[0.8,1.1],leaf:['#6a9a2a','#7aa834','#5c8c26','#86b03e']},{m:'CommonTree_5',n:8,xr:[4.5,28],sr:[0.8,1.2],leaf:['#6a9a2a','#7aa834','#5c8c26','#86b03e']},
   {m:'Pine_1',n:7,xr:[9,32],sr:[0.9,1.2]},{m:'Pine_2',n:6,xr:[9,32],sr:[0.9,1.2]},
   {m:'Bush_Common',n:14,xr:[2.7,13],sr:[0.55,0.95],leaf:['#5a8a34','#6a9a3c','#4c7a30']},{m:'Bush_Common_Flowers',n:10,xr:[2.7,12],sr:[0.55,0.9],leaf:['#6a9a2a','#5c8c26']},
   {m:'Rock_Medium_1',n:6,xr:[3,16],sr:[0.25,0.6]},{m:'Rock_Medium_2',n:5,xr:[3,16],sr:[0.25,0.6]},
   {m:'Fern_1',n:12,xr:[2.4,10],sr:[0.5,0.8]},{m:'Flower_3_Group',n:14,xr:[2,9],sr:[0.35,0.55]},{m:'Flower_4_Group',n:10,xr:[2,9],sr:[0.35,0.55]},
   {m:'Grass_Common_Short',n:70,xr:[1.7,9],sr:[0.45,0.8],g:1},{m:'Grass_Common_Tall',n:36,xr:[1.9,10],sr:[0.4,0.7],g:1},{m:'Clover_1',n:18,xr:[1.8,8],sr:[0.4,0.7],g:1},
   {m:'Pebble_Round_1',n:16,xr:[0.4,1.9],sr:[0.4,0.8],road:1},{m:'Pebble_Square_2',n:12,xr:[0.4,1.9],sr:[0.4,0.8],road:1}],
  /* 1 Осенний лес: та же листва, но рыжая и красная */
  [{m:'CommonTree_1',n:10,xr:[4.5,28],sr:[0.8,1.15],leaf:['#ff8a2a','#e85a20','#ffc040','#c43a1a']},{m:'CommonTree_2',n:10,xr:[4.5,28],sr:[0.8,1.15],leaf:['#ff8a2a','#e85a20','#ffc040','#c43a1a']},
   {m:'CommonTree_3',n:8,xr:[5,30],sr:[0.8,1.1],leaf:['#ffb030','#e07020','#d04020']},{m:'DeadTree_1',n:4,xr:[6,26],sr:[0.5,0.7]},{m:'DeadTree_2',n:3,xr:[6,26],sr:[0.45,0.65]},
   {m:'Pine_4',n:6,xr:[10,32],sr:[0.8,1.1]},
   {m:'Bush_Common',n:16,xr:[2.7,13],sr:[0.55,0.95],leaf:['#e07a28','#c85020','#e0a030']},
   {m:'Mushroom_Common',n:16,xr:[2,9],sr:[0.6,1.1]},{m:'Mushroom_Laetiporus',n:6,xr:[2.5,10],sr:[0.6,1.0]},
   {m:'Rock_Medium_3',n:6,xr:[3,16],sr:[0.25,0.6]},{m:'Fern_1',n:10,xr:[2.4,10],sr:[0.5,0.8],leaf:['#c08030','#a06028']},
   {m:'Grass_Wispy_Tall',n:50,xr:[1.8,10],sr:[0.35,0.6],g:1,leaf:['#d8b050','#c09040','#e0c060']},
   {m:'Pebble_Round_1',n:14,xr:[0.4,1.9],sr:[0.4,0.8],road:1}],
  /* 2 Ночные топи: мёртвые и кривые деревья, грибы, папоротник */
  [{m:'DeadTree_1',n:8,xr:[5,28],sr:[0.55,0.8]},{m:'DeadTree_2',n:7,xr:[5,28],sr:[0.5,0.75]},{m:'DeadTree_3',n:6,xr:[6,30],sr:[0.45,0.7]},
   {m:'TwistedTree_1',n:4,xr:[9,30],sr:[0.5,0.7],leaf:['#3a6a50','#2a5a48']},{m:'TwistedTree_3',n:4,xr:[9,30],sr:[0.5,0.7],leaf:['#3a6a50','#2a5a48']},
   {m:'Mushroom_Laetiporus',n:10,xr:[2.3,10],sr:[0.6,1.1]},{m:'Mushroom_Common',n:14,xr:[2,9],sr:[0.6,1.2],leaf:null,glow:1},
   {m:'Plant_1_Big',n:14,xr:[2.4,12],sr:[0.5,0.9],leaf:['#3a7a50','#2e6a48']},{m:'Fern_1',n:20,xr:[2.2,11],sr:[0.5,0.9],leaf:['#3a7a50','#4a8a58']},
   {m:'Rock_Medium_2',n:6,xr:[3,16],sr:[0.25,0.6]},
   {m:'Grass_Wispy_Tall',n:60,xr:[1.8,10],sr:[0.35,0.65],g:1,leaf:['#4a7a50','#3a6a48']}],
  /* 3 Сумеречный перевал: сосны и камни */
  [{m:'Pine_1',n:8,xr:[5,30],sr:[0.8,1.15]},{m:'Pine_2',n:8,xr:[5,30],sr:[0.8,1.15]},{m:'Pine_4',n:7,xr:[6,32],sr:[0.8,1.1]},{m:'Pine_5',n:7,xr:[6,32],sr:[0.8,1.1]},
   {m:'DeadTree_3',n:3,xr:[8,28],sr:[0.4,0.6]},
   {m:'Rock_Medium_1',n:10,xr:[2.8,20],sr:[0.3,1.0]},{m:'Rock_Medium_2',n:10,xr:[2.8,20],sr:[0.3,1.0]},{m:'Rock_Medium_3',n:10,xr:[2.8,20],sr:[0.3,1.0]},
   {m:'Bush_Common',n:6,xr:[3,12],sr:[0.5,0.8],leaf:['#7a8a50','#8a7a48']},
   {m:'Grass_Wispy_Tall',n:30,xr:[1.8,10],sr:[0.35,0.6],g:1,leaf:['#b0a060','#9a9058']},
   {m:'Pebble_Round_1',n:20,xr:[0.4,1.9],sr:[0.5,0.9],road:1},{m:'Pebble_Square_2',n:16,xr:[0.4,1.9],sr:[0.5,0.9],road:1}]
];
/* набор леса в формате scene3d: {имя:{count,xr,sr,parts:[{geo,mat,m,tint}],grass,leaf}} */
function kinds(biome){
  var set=SETS[biome]||SETS[0],out={};
  set.forEach(function(d,i){
    var ps=parts(d.m);if(!ps)return;
    var mats={};
    out[d.m+'#'+i]={count:d.n,xr:d.xr,sr:d.sr,grass:!!d.g,road:!!d.road,leafPal:d.leaf||null,glow:!!d.glow,
      parts:ps.map(function(p){
        /* у ночных грибов свой светящийся материал, остальное общее */
        var mat=p.mat;
        if(d.glow){mat=mats[p.mat.uuid]||(mats[p.mat.uuid]=p.mat.clone());mat.emissive=new T.Color('#3fd0c0');mat.emissiveIntensity=0.35;mat.emissiveMap=mat.map;}
        return {geo:p.geo,mat:mat,m:p.m,tint:p.leaf?'leaf':'base'};
      })};
  });
  return out;
}

/* ════════ ЗЕМЛЯ И ДОРОГА ════════ */
var GROUND=[
  {g:'grass_ground',gc:'#bcd890',r:'stony_dirt_path',rc:'#ffffff'},
  {g:'forest_leaves_04',gc:'#ffffff',r:'stony_dirt_path',rc:'#f0d8b8'},
  {g:'brown_mud_leaves_01',gc:'#b8c8d0',r:'rock_path',rc:'#c0ccd8'},
  {g:'aerial_ground_rock',gc:'#e8c8b8',r:'rock_path',rc:'#d0b0a0'}
];
function groundSet(b){
  var d=GROUND[b]||GROUND[0];
  if(!TEX[d.g+'_diff']||!TEX[d.r+'_diff'])return null;
  return {g:TEX[d.g+'_diff'],gn:TEX[d.g+'_nor'],r:TEX[d.r+'_diff'],rn:TEX[d.r+'_nor'],gc:d.gc,rc:d.rc};
}
function loadGround(b){
  var d=GROUND[b]||GROUND[0];
  return Promise.all([loadTex(d.g+'_diff',true),loadTex(d.g+'_nor',false),loadTex(d.r+'_diff',true),loadTex(d.r+'_nor',false)]);
}

/* ════════ МОНСТРЫ ════════ */
/* ресурс или босс тракта -> модель. h - рост в метрах, fly - висит над землёй, tint - перекрас главного материала */
var MAP={
  wood:{id:'snake',h:0.9},iron:{id:'orc',h:1.55},herb:{id:'frog',h:0.7},hide:{id:'bunny',h:1.5},
  bone:{id:'dino',h:1.5},silk:{id:'spider',h:0.8,tint:{Material:'#e8e8f0'}},spore:{id:'wasp',h:0.8,fly:0.8},
  crystal:{id:'bluedemon',h:1.6},silver:{id:'yeti',h:1.7},
  'boss.summer':{id:'orc_skull',h:2.5},'boss.autumn':{id:'monkroose',h:2.4},'boss.swamp':{id:'bigfrog',h:2.3},'boss.pass':{id:'demon',h:2.6}
};
var TRACT_MON=[['wood','iron','herb','hide','boss.summer'],['bone','silk','hide','boss.autumn'],['spore','herb','boss.swamp'],['crystal','silver','iron','boss.pass']];
function loadMonster(id){
  if(MONP[id])return MONP[id];
  MONP[id]=fetchBuf('models/mon_'+id+'.glb').then(parse).then(function(g){
    var root=g.scene;root.updateMatrixWorld(true);
    /* точная рамка с учётом скелета (для скиннинга геометрия лежит в своей системе) */
    var box=new T.Box3().setFromObject(root,true);
    MON[id]={scene:root,clips:g.animations,h:Math.max(0.01,box.max.y-box.min.y),minY:box.min.y};
    return MON[id];
  });
  MONP[id].catch(function(e){console.warn('[adventure] monster',id,e);delete MONP[id];});
  return MONP[id];
}
function loadTract(t){return Promise.all((TRACT_MON[t]||[]).map(function(k){return loadMonster(MAP[k].id);}));}
/* копия монстра: свой скелет, свои материалы (для вспышки), микшер с клипами */
function monster(key){
  var d=MAP[key];if(!d)return null;
  var src=MON[d.id];if(!src)return null;
  var o=SKU.clone(src.scene),mats=[];
  o.traverse(function(m){
    if(!m.isMesh)return;
    m.frustumCulled=false;
    var arr=Array.isArray(m.material)?m.material:[m.material];
    arr=arr.map(function(mm){var c=mm.clone();c.fog=false;if(c.userData.fromFBX||c.metalness>0.2){c.metalness=0;c.roughness=0.75;}if(c.map)c.emissiveMap=c.map;if(d.tint&&d.tint[mm.name])c.color.set(d.tint[mm.name]);c.userData.own=true;mats.push(c);return c;});
    m.material=arr.length===1?arr[0]:arr;
    m.castShadow=true;
  });
  var k=d.h/src.h;o.scale.setScalar(k);o.position.y=-src.minY*k+(d.fly||0);
  var mixer=new T.AnimationMixer(o),acts={};
  src.clips.forEach(function(c){acts[c.name]=mixer.clipAction(c);});
  return {root:o,mixer:mixer,acts:acts,mats:mats,h:d.h+(d.fly||0),fly:d.fly||0};
}

/* ════════ ЗАГРУЗКА ════════ */
function init(THREE){
  if(T)return Promise.resolve();
  T=THREE;GLTF=window.AcGLTF(THREE);SKU=window.AcSkel(THREE);loader=new GLTF();
  return fetch(url('sizes.json')).then(function(r){return r.json();}).then(function(j){SIZES=j;},function(){SIZES={};});
}
/* лес и его текстуры; земля и монстры тракта качаются отдельно (loadBiome) */
function loadBase(resolution){
  if(baseP)return baseP;
  res=resolution||'1k';
  baseP=Promise.all([fetchBuf('models/nature.glb').then(parse).then(function(g){g.scene.children.forEach(function(n){NAT[n.name]=n;});})]
    .concat(natTexNames().map(function(n){return loadTex(n,true);}))).then(function(){baseReady=true;});
  baseP.catch(function(e){console.warn('[adventure] base',e);baseP=null;});
  return baseP;
}
function loadBiome(b,t){return Promise.all([loadGround(b),loadTract(t===undefined?b:t)]);}

window.Adventure={init:init,loadBase:loadBase,parts:parts,loadBiome:loadBiome,loadGround:loadGround,loadTract:loadTract,kinds:kinds,groundSet:groundSet,monster:monster,
  hasMonster:function(key){var d=MAP[key];return !!(d&&MON[d.id]);},MAP:MAP,
  get ready(){return baseReady;},get res(){return res;}};
})();
