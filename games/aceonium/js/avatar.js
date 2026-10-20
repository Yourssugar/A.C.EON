/* Aceonium: 3D-персонаж из моделей Quaternius (CC0): Universal Base Characters,
   Modular Character Outfits Fantasy, Universal Animation Library.

   Всё лежит в assets/char/:
     models/rig_m|rig_f.glb   скелет (общий для всех деталей)
     models/head_*.glb         голова, глаза, брови (вырезаны из полного тела)
     models/hair_*.glb         причёски и борода (привязаны к кости головы)
     models/<пол>_<наряд>_<деталь>.glb   одежда по слотам
     models/anims.glb          анимации
     tex/<набор>_<карта>_1k|2k.webp       текстуры отдельно от моделей: одна текстура на весь наряд
   Модели и текстуры качаются по требованию, с прогрессом, потом лежат в кэше браузера.

   Avatar.init(THREE)                 подготовка (один раз)
   Avatar.CATALOG                     что можно надеть
   Avatar.missing(look,res)           сколько байт ещё не скачано для этого облика
   Avatar.create(look,{res,onProgress}) -> Promise<A>
     A.root, A.setLook(look,onProgress) -> Promise, A.update(dt,mode,fat), A.setTier(n,colors)
     A.core / A.coreMat / A.head / A.kick   для сцены (всплески, Zzz) */
(function(){
'use strict';

var T=null,GLTF=null,SKU=null,loader=null;
var BASE='assets/char/';
var SIZES={};          // путь -> байт (из sizes.json)
var fetched={};        // путь -> true, если уже скачано в этой сессии или раньше (localStorage)
var gltfCache={},texCache={},clipCache=null;

try{fetched=JSON.parse(localStorage.getItem('aceon:assets')||'{}')||{};}catch(e){fetched={};}
function markFetched(p){fetched[p]=1;try{localStorage.setItem('aceon:assets',JSON.stringify(fetched));}catch(e){}}

/* ════════ КАТАЛОГ ════════
   Детали одежды одного пола делят скелет, поэтому смешиваются: верх рейнджера + штаны крестьянина и т.д. */
var CATALOG={
  slots:['hood','shoulders','body','arms','legs','feet'],
  parts:{
    body:[{id:'ranger',set:'ranger',m:'male_ranger_body',f:'female_ranger_body'},
          {id:'peasant',set:'peasant',m:'male_peasant_body',f:'female_peasant_body'}],
    arms:[{id:'ranger',set:'ranger',m:'male_ranger_arms',f:'female_ranger_arms'},
          {id:'peasant',set:'peasant',m:'male_peasant_arms',f:'female_peasant_arms'}],
    legs:[{id:'ranger',set:'ranger',m:'male_ranger_legs',f:'female_ranger_legs'},
          {id:'peasant',set:'peasant',m:'male_peasant_legs',f:'female_peasant_legs'}],
    feet:[{id:'ranger',set:'ranger',m:'male_ranger_feet_boots',f:'female_ranger_feet'},
          {id:'peasant',set:'peasant',m:'male_peasant_feet',f:'female_peasant_feet'}],
    shoulders:[{id:'none'},{id:'ranger',set:'ranger',m:'male_ranger_acc_pauldron',f:'female_ranger_acc_pauldrons'}],
    hood:[{id:'none'},{id:'ranger',set:'ranger',m:'male_ranger_head_hood',f:'female_ranger_head_hood'}]
  },
  hair:[{id:'none'},{id:'parted',model:'hair_simpleparted'},{id:'long',model:'hair_long'},{id:'buns',model:'hair_buns'},
        {id:'buzzed',model:'hair_buzzed'},{id:'buzzedf',model:'hair_buzzedfemale'}],
  beard:[{id:'none'},{id:'beard',model:'hair_beard'}],
  sets:{
    /* v28: mask - зоны перекраски (R, G, B, A), L - средняя яркость зоны в исходной текстуре (линейная) */
    ranger:{color:['ranger_color','ranger_color3'],normal:'ranger_normal',orm:'ranger_orm',mask:'ranger_mask',L:[0.0518,0.0104,0.0539,0.3289],zones:['top','legs','leather','metal']},
    peasant:{color:['peasant_color','peasant_color2'],normal:'peasant_normal',orm:'peasant_orm',mask:'peasant_mask',L:[0.2531,0.0111,0.0412,0.0302],zones:['shirt','legs','boots','vest']},
    regm:{color:['regm_color'],normal:'regm_normal',rough:'regm_rough',skin:true},
    regf:{color:['regf_color'],normal:'regf_normal',rough:'regf_rough',skin:true},
    shm:{color:['shm_color'],normal:'shm_normal',rough:'shm_rough',skin:true},
    shf:{color:['shf_color'],normal:'shf_normal',rough:'shf_rough',skin:true},
    hair1:{color:['hair1_color'],normal:'hair1_normal',hair:true},
    hair2:{color:['hair2_color'],normal:'hair2_normal',hair:true},
    eye:{color:['eye_color'],normal:'eye_normal',eye:true}
  },
  matSet:{MI_Ranger:'ranger',MI_Peasant:'peasant',MI_Regular_Male:'regm',MI_Regular_Female:'regf',
          MI_Superhero_Male:'shm',MI_Superhero_Female:'shf',MI_Hair_1:'hair1',MI_Hair_2:'hair2',MI_Eyes:'eye'},
  skins:['#ffffff','#e8c8b0','#c09070','#8a6048','#5a3a2a'],
  hairColors:['#2a1c14','#5a3820','#8a5a2a','#c8a060','#e8d8b0','#9a9a9a','#e8e8e8','#7a2a1a','#2a3a5a'],
  eyeColors:['#ffffff','#7ab0ff','#7ad08a','#c89a5a','#ff7a7a'],
  /* v28: палитра перекраски одежды и головных уборов */
  palette:['#b8312f','#e07a2e','#e8c547','#7fae45','#2f7d4f','#3aa3b8','#2e5aa8','#23306b','#6a3fb0','#c2569a','#f0e6d2','#9a9a9a','#2a2a30','#6e4428','#d4af37','#b8c4d0'],
  hats:['none','wizard','straw','beret','bard','cap','headband','wreath','crown','goggles','catears','glasses']
};
function defaults(gender){
  return {gender:gender||'m',skin:1,hair:gender==='f'?'long':'parted',hairColor:gender==='f'?2:1,beard:gender==='f'?'none':'beard',eye:0,
    hood:'ranger',shoulders:'none',body:'ranger',arms:'ranger',legs:'ranger',feet:'ranger',
    colors:{ranger:0,peasant:0},staff:'gnarled',hoodUp:true,
    tint:{ranger:[null,null,null,null],peasant:[null,null,null,null]},hat:'none',hatC:[8,14]};
}
function partDef(slot,id){var l=CATALOG.parts[slot];for(var i=0;i<l.length;i++)if(l[i].id===id)return l[i];return l[0];}
function listDef(list,id){for(var i=0;i<list.length;i++)if(list[i].id===id)return list[i];return list[0];}

/* какие модели и текстуры нужны для облика */
function needs(look,res,forGame){
  var g=look.gender==='f'?'f':'m',models=['rig_'+g,'head_'+g],sets={};
  sets[g==='m'?'shm':'shf']=0;sets.eye=0;sets.hair1=0;
  CATALOG.slots.forEach(function(s){
    var d=partDef(s,look[s]);if(!d[g])return;
    if(s==='hood'&&forGame===false&&!look.hoodUp)return;
    models.push(d[g]);sets[d.set]=look.colors&&look.colors[d.set]||0;
    if(s==='arms')sets[g==='m'?'regm':'regf']=0;
  });
  var hd=listDef(CATALOG.hair,look.hair);if(hd.model){models.push(hd.model);sets[/long|buns/.test(hd.id)?'hair2':'hair1']=0;}
  var bd=listDef(CATALOG.beard,look.beard);if(bd.model&&g==='m')models.push(bd.model);
  var files=models.map(function(m){return 'models/'+m+'.glb';});
  files.push('models/anims.glb','models/anims2.glb');
  Object.keys(sets).forEach(function(k){
    var S=CATALOG.sets[k];
    files.push('tex/'+S.color[Math.min(sets[k],S.color.length-1)]+'_'+res+'.webp');
    files.push('tex/'+S.normal+'_'+res+'.webp');
    if(S.mask&&hasTint(look,k))files.push('tex/'+S.mask+'.webp');
    if(S.orm)files.push('tex/'+S.orm+'_'+res+'.webp');
    if(S.rough)files.push('tex/'+S.rough+'_'+res+'.webp');
  });
  return files;
}
function hasTint(look,set){var a=look.tint&&look.tint[set];return !!(a&&a.some(function(x){return x!==null&&x!==undefined;}));}
function missing(look,res,forGame){
  var bytes=0;
  needs(look,res||'1k',forGame).forEach(function(f){if(!fetched[f])bytes+=SIZES[f]||0;});
  return bytes;
}

/* ════════ ЗАГРУЗКА С ПРОГРЕССОМ ════════ */
function url(p){return window.Boot?Boot.url(BASE+p):BASE+p;}
function fetchBuf(p,onBytes){
  return fetch(url(p)).then(function(res){
    if(!res.ok)throw new Error(res.status+' '+p);
    if(!res.body||!res.body.getReader)return res.arrayBuffer().then(function(b){onBytes(b.byteLength);return b;});
    var reader=res.body.getReader(),chunks=[],got=0;
    function pump(){return reader.read().then(function(r){
      if(r.done){var out=new Uint8Array(got),o=0;chunks.forEach(function(c){out.set(c,o);o+=c.length;});return out.buffer;}
      chunks.push(r.value);got+=r.value.length;onBytes(r.value.length);return pump();
    });}
    return pump();
  }).then(function(b){markFetched(p);return b;});
}
function loadGLB(p,onBytes){
  if(gltfCache[p])return gltfCache[p];
  gltfCache[p]=fetchBuf(p,onBytes).then(function(buf){
    return new Promise(function(ok,bad){loader.parse(buf,'',ok,bad);});
  });
  gltfCache[p].catch(function(){delete gltfCache[p];});
  return gltfCache[p];
}
function loadTex(p,srgb,onBytes){
  if(texCache[p])return texCache[p];
  texCache[p]=fetchBuf(p,onBytes).then(function(buf){
    var blob=new Blob([buf],{type:'image/webp'});
    /* маска зон: альфа - отдельная зона, браузер не должен её домножать */
    var bo=/_mask/.test(p)?{imageOrientation:'none',premultiplyAlpha:'none',colorSpaceConversion:'none'}:{imageOrientation:'none'};
    var make=window.createImageBitmap?createImageBitmap(blob,bo):new Promise(function(ok,bad){var im=new Image();im.onload=function(){ok(im);};im.onerror=bad;im.src=URL.createObjectURL(blob);});
    return make.then(function(img){
      var t=new T.Texture(img);t.flipY=false;           /* UV glTF: без переворота */
      if(srgb)t.colorSpace=T.SRGBColorSpace;
      t.anisotropy=8;t.generateMipmaps=true;t.minFilter=T.LinearMipmapLinearFilter;
      if(/_mask/.test(p)){t.generateMipmaps=false;t.minFilter=T.LinearFilter;t.anisotropy=1;}
      t.needsUpdate=true;
      return t;
    });
  });
  texCache[p].catch(function(){delete texCache[p];});
  return texCache[p];
}
/* скачать всё нужное, прогресс 0..1 по байтам */
function preload(files,onProgress){
  var total=0,got=0;
  files.forEach(function(f){if(!(gltfCache[f]||texCache[f]))total+=SIZES[f]||50000;});
  function tick(n){got+=n;if(onProgress&&total)onProgress(Math.min(1,got/total),total);}
  return Promise.all(files.map(function(f){
    if(/\.glb$/.test(f))return loadGLB(f,tick);
    return loadTex(f,/_color/.test(f),tick);
  }));
}

/* ════════ МАТЕРИАЛЫ ════════ */
function texFile(setKey,map,variant,res){
  var S=CATALOG.sets[setKey];
  var name=map==='color'?S.color[Math.min(variant||0,S.color.length-1)]:S[map];
  return 'tex/'+name+'_'+res+'.webp';
}
/* v28: мультяшный свет (только маг из другого мира): три ступени */
var GRAD=null;
function gradTex(){if(!GRAD){GRAD=new T.DataTexture(new Uint8Array([105,185,255]),3,1,T.RedFormat);GRAD.minFilter=GRAD.magFilter=T.NearestFilter;GRAD.generateMipmaps=false;GRAD.needsUpdate=true;}return GRAD;}
/* перекраска по зонам: цвет зоны умножается на яркость исходной ткани, складки и тени остаются */
function tintPatch(m,mask,L,tint){
  var on=new T.Vector4(),c=[0,1,2,3].map(function(i){var v=tint&&tint[i];if(v!==null&&v!==undefined){on.setComponent(i,1);return new T.Color(typeof v==='number'?CATALOG.palette[v]:v);}return new T.Color(1,1,1);});
  var U={tMask:{value:mask},tOn:{value:on},tL:{value:new T.Vector4(L[0],L[1],L[2],L[3])},tC0:{value:c[0]},tC1:{value:c[1]},tC2:{value:c[2]},tC3:{value:c[3]}};
  m.onBeforeCompile=function(sh){
    for(var k in U)sh.uniforms[k]=U[k];
    sh.fragmentShader=sh.fragmentShader.replace('#include <common>','#include <common>\nuniform sampler2D tMask;uniform vec4 tOn;uniform vec4 tL;uniform vec3 tC0;uniform vec3 tC1;uniform vec3 tC2;uniform vec3 tC3;')
      .replace('#include <map_fragment>','#include <map_fragment>\n{vec4 zm=texture2D(tMask,vMapUv)*tOn;float gy=dot(diffuseColor.rgb,vec3(0.2126,0.7152,0.0722));vec3 cc=diffuseColor.rgb;'+
        'cc=mix(cc,min(tC0*gy/tL.x,vec3(1.0)),zm.r);cc=mix(cc,min(tC1*gy/tL.y,vec3(1.0)),zm.g);cc=mix(cc,min(tC2*gy/tL.z,vec3(1.0)),zm.b);cc=mix(cc,min(tC3*gy/tL.w,vec3(1.0)),zm.a);diffuseColor.rgb=cc;}');
  };
  m.customProgramCacheKey=function(){return 'acTint1';};
}
/* контур для мультяшного мага: та же модель изнутри, раздута по нормалям в экранных координатах */
var OUTLINE=null;
function outlineMat(){
  if(OUTLINE)return OUTLINE;
  OUTLINE=new T.MeshBasicMaterial({color:0x1a1222,side:T.BackSide});
  OUTLINE.onBeforeCompile=function(sh){
    sh.vertexShader=sh.vertexShader.replace('#include <project_vertex>','#include <project_vertex>\n{\n#ifdef USE_SKINNING\nvec3 oN=objectNormal;\n#else\nvec3 oN=normal;\n#endif\nvec4 cn=projectionMatrix*modelViewMatrix*vec4(oN,0.0);gl_Position.xy+=normalize(cn.xy+1e-6)*0.0055*gl_Position.w;}');
  };
  OUTLINE.customProgramCacheKey=function(){return 'acOutline1';};
  return OUTLINE;
}
function makeMaterial(setKey,look,res,toon){
  var S=CATALOG.sets[setKey],variant=look.colors&&look.colors[setKey]||0;
  var m=toon?new T.MeshToonMaterial({side:T.DoubleSide,gradientMap:gradTex()}):new T.MeshStandardMaterial({roughness:1,metalness:0,side:T.DoubleSide});
  var jobs=[loadTex(texFile(setKey,'color',variant,res),true,function(){}).then(function(t){m.map=t;}),
            loadTex(texFile(setKey,'normal',0,res),false,function(){}).then(function(t){m.normalMap=t;})];
  if(S.mask&&hasTint(look,setKey))jobs.push(loadTex('tex/'+S.mask+'.webp',false,function(){}).then(function(t){tintPatch(m,t,S.L,look.tint[setKey]);}));
  if(toon){}
  else if(S.orm)jobs.push(loadTex(texFile(setKey,'orm',0,res),false,function(){}).then(function(t){m.roughnessMap=t;m.metalnessMap=t;m.aoMap=t;m.metalness=1;m.aoMapIntensity=0.8;}));
  if(S.rough&&!toon)jobs.push(loadTex(texFile(setKey,'rough',0,res),false,function(){}).then(function(t){m.roughnessMap=t;}));
  if(S.skin)m.color.set(CATALOG.skins[look.skin||0]);
  if(S.hair){m.color.set(CATALOG.hairColors[look.hairColor||0]);m.roughness=0.75;}
  if(S.eye){m.color.set(CATALOG.eyeColors[look.eye||0]);m.roughness=0.25;if(toon)m.emissive=new T.Color(0x202028);}
  return Promise.all(jobs).then(function(){m.needsUpdate=true;return m;});
}

/* ════════ АНИМАЦИИ ════════ */
/* посох в левой руке: в библиотеке анимаций факел и заклинание делаются левой */
var L_ARM=/^(clavicle_l|upperarm_l|lowerarm_l|hand_l|(index|middle|pinky|ring|thumb)_0\d(_leaf)?_l)$/;
function boneOf(track){return track.name.split('.')[0];}
function clips(){
  if(clipCache)return clipCache;
  /* v21: anims2.glb - вторая библиотека (тот же скелет): отброс, бросок, блок, сон, питьё */
  clipCache=Promise.all([loadGLB('models/anims.glb',function(){}),loadGLB('models/anims2.glb',function(){}).catch(function(){return {animations:[]};})]).then(function(r){
    var by={};r[0].animations.concat(r[1].animations).forEach(function(c){by[c.name]=c;});
    /* ходьба с посохом: ноги и тело от ходьбы, правая рука держит посох как факел */
    function merged(name,baseName,armName){
      var base=by[baseName],arm=by[armName];if(!base||!arm)return base;
      var tr=base.tracks.filter(function(t){return !L_ARM.test(boneOf(t));}).concat(arm.tracks.filter(function(t){return L_ARM.test(boneOf(t));}));
      return new T.AnimationClip(name,base.duration,tr);
    }
    by.walk=merged('walk','Walk_Loop','Idle_Torch_Loop');
    by.idle=merged('idle','Idle_Loop','Idle_Torch_Loop');
    by.fight=by.Spell_Simple_Idle_Loop;
    by.cast=by.Spell_Simple_Shoot;
    by.hurt=by.Hit_Chest;                 /* босс попал: маг вздрагивает */
    by.victory=by.Spell_Simple_Enter;     /* босс повержен: маг поднимает посох */
    by.wardrobe=by.Idle_Loop;   /* в гардеробе рука свободна, посох стоит рядом на земле */
    /* v21: больше движений в бою и в таверне */
    by.hurt2=by.Hit_Head||by.Hit_Chest;
    by.knock=by.Hit_Knockback;by.getup=by.LayToIdle;
    by.throw=by.OverhandThrow;by.block=by.Sword_Block;by.yes=by.Yes;
    if(by.LayToIdle){by.sleep=T.AnimationUtils.subclip(by.LayToIdle,'sleep',0,2,30);by.wake=by.LayToIdle;}
    /* сидя пьёт: ноги и спина от сидения, руки и голова от питья */
    if(by.Consume&&by.Sitting_Idle_Loop){
      var UP=/^(clavicle|upperarm|lowerarm|hand|index|middle|pinky|ring|thumb|neck|head)/;
      var sit=by.Sitting_Idle_Loop,dr=by.Consume;
      by.sitDrink=new T.AnimationClip('sitDrink',dr.duration,sit.tracks.filter(function(t){return !UP.test(boneOf(t));}).concat(dr.tracks.filter(function(t){return UP.test(boneOf(t));})));
    }
    return by;
  });
  return clipCache;
}

/* анимации таверны (работа мастеров, разговоры, сон): отдельный файл, качается при первом входе в таверну */
var extraClips=null;
function loadExtraClips(){
  if(extraClips)return extraClips;
  extraClips=Promise.all([clips(),loadGLB('models/anims_tavern.glb',function(){}),loadGLB('models/anims_tavern2.glb',function(){}).catch(function(){return {animations:[]};})]).then(function(r){
    r[1].animations.concat(r[2].animations).forEach(function(c){r[0][c.name]=c;});
    return r[0];
  });
  extraClips.catch(function(){extraClips=null;});
  return extraClips;
}

/* ════════ ПЕРСОНАЖ ════════ */
function Avatar(){
  this.root=new T.Group();this.slots={};this.look=null;this.res='1k';this.kick=0;this.mode='';this.t=0;this.castT=0;
  this.forGame=true;this.staff=null;this.tierArgs=[0,['#00e5ff']];
}
var P=Avatar.prototype;

P.buildRig=function(g){
  var self=this;
  if(this.rig&&this.rigG===g)return;
  if(this.rig){this.root.remove(this.rig);}
  this.rigG=g;
  this.rig=g.scene.clone(true);
  this.root.add(this.rig);
  this.bones={};
  this.rig.traverse(function(o){self.bones[o.name]=o;});
  this.armature=this.bones.Armature||this.rig;
  this.head=this.bones.Head;
  this.hand=this.bones.hand_l;
  this.mixer=new T.AnimationMixer(this.rig);
  this.actions={};this.cur=null;this.mode='';
  this.slots={};
};
/* вставить детали из glb: перепривязать к нашему скелету, оставив их собственные обратные матрицы привязки */
P.attach=function(key,gltf,materials){
  var self=this,meshes=[];
  var scene=SKU.clone(gltf.scene);
  var found=[];scene.traverse(function(o){if(o.isSkinnedMesh)found.push(o);});
  found.forEach(function(m){
    var bones=m.skeleton.bones.map(function(b){return self.bones[b.name]||self.bones.root;});
    var sk=new T.Skeleton(bones,m.skeleton.boneInverses.map(function(x){return x.clone();}));
    m.parent.remove(m);
    self.armature.add(m);
    m.bind(sk,m.bindMatrix);
    m.frustumCulled=false;m.castShadow=true;m.receiveShadow=true;
    var mats=Array.isArray(m.material)?m.material:[m.material];
    var nm=mats.map(function(om){var set=CATALOG.matSet[om.name];return set&&materials[set]||om;});
    m.material=Array.isArray(m.material)?nm:nm[0];
    meshes.push(m);
    if(self.toon&&!mats.some(function(om){return CATALOG.matSet[om.name]==='eye';})){
      var o=new T.SkinnedMesh(m.geometry,outlineMat());o.bind(m.skeleton,m.bindMatrix);o.frustumCulled=false;o.castShadow=false;o.receiveShadow=false;o.userData.outline=true;
      self.armature.add(o);meshes.push(o);
    }
  });
  this.slots[key]=meshes;
};
P.detach=function(key){
  var self=this;(this.slots[key]||[]).forEach(function(m){self.armature.remove(m);});
  delete this.slots[key];
};

P.setLook=function(look,onProgress){
  var self=this,g=look.gender==='f'?'f':'m',res=this.res,tok=this.lookTok=(this.lookTok||0)+1;
  look=JSON.parse(JSON.stringify(look));
  var files=needs(look,res,this.forGame);
  return preload(files,onProgress).then(function(){
    return Promise.all([loadGLB('models/rig_'+g+'.glb',function(){}),clips()]);
  }).then(function(r){
    var rigG=r[0];
    var changedGender=!self.look||self.look.gender!==look.gender;
    if(changedGender)self.buildRig(rigG);
    /* материалы по наборам */
    var setKeys={};Object.keys(CATALOG.matSet).forEach(function(k){setKeys[CATALOG.matSet[k]]=1;});
    var mats={},jobs=[];
    Object.keys(setKeys).forEach(function(k){
      var need=files.some(function(f){return f.indexOf('tex/'+CATALOG.sets[k].normal+'_')===0;});
      if(need)jobs.push(makeMaterial(k,look,res,self.toon).then(function(m){mats[k]=m;}));
    });
    return Promise.all(jobs).then(function(){return mats;});
  }).then(function(mats){
    /* пересобрать все детали (быстро: модели уже в памяти) */
    var list=[['head','models/head_'+g+'.glb']];
    CATALOG.slots.forEach(function(s){
      var d=partDef(s,look[s]);if(!d[g])return;
      if(s==='hood'&&!self.hoodVisible(look))return;
      list.push([s,'models/'+d[g]+'.glb']);
    });
    var hd=listDef(CATALOG.hair,look.hair);
    if(hd.model&&!self.hoodVisible(look))list.push(['hair','models/'+hd.model+'.glb']);
    var bd=listDef(CATALOG.beard,look.beard);if(bd.model&&g==='m')list.push(['beard','models/'+bd.model+'.glb']);
    return Promise.all(list.map(function(x){return loadGLB(x[1],function(){});})).then(function(gs){
      /* v28: пока грузилось, мог прийти новый облик: старый не накладываем поверх (иначе детали двух обликов смешиваются) */
      if(tok!==self.lookTok)return self;
      Object.keys(self.slots).forEach(function(k){self.detach(k);});
      gs.forEach(function(gl,i){self.attach(list[i][0],gl,mats);});
      self.look=look;
      self.setHat(look);
      self.setStaff(look.staff);
      self.play(self.mode||'idle',0);
      return self;
    });
  });
};
P.hoodVisible=function(look){return look.hood!=='none'&&(this.forGame||look.hoodUp);};
/* v28: головной убор на кости головы. Положение считается один раз на пол: макушка и ширина головы в позе привязки */
var HAT_M={};
P.headAnchor=function(){
  var key=this.look&&this.look.gender==='f'?'f':'m';
  if(HAT_M[key])return HAT_M[key];
  var meshes=(this.slots.head||[]).filter(function(m){return m.isSkinnedMesh&&!m.userData.outline;});if(!meshes.length||!this.head)return null;
  /* вершины головы в системе кости головы; оси "вверх" и "вперёд" берём от корня персонажа (он стоит прямо) */
  this.root.updateMatrixWorld(true);
  var hinv=new T.Matrix4().copy(this.head.matrixWorld).invert(),v=new T.Vector3(),pts=[];
  meshes.forEach(function(m){var n=m.geometry.attributes.position.count,st=Math.max(1,Math.floor(n/1500));for(var i=0;i<n;i+=st){m.getVertexPosition(i,v);v.applyMatrix4(m.matrixWorld).applyMatrix4(hinv);pts.push(v.clone());}});
  var rq=new T.Quaternion();this.root.getWorldQuaternion(rq);
  var hq=new T.Quaternion();this.head.getWorldQuaternion(hq);var hqi=hq.clone().invert();
  var up=new T.Vector3(0,1,0).applyQuaternion(rq).applyQuaternion(hqi).normalize();
  var fw=new T.Vector3(0,0,1).applyQuaternion(rq).applyQuaternion(hqi);fw.sub(up.clone().multiplyScalar(fw.dot(up))).normalize();
  var rt=new T.Vector3().crossVectors(up,fw).normalize();
  var mn=[1e9,1e9,1e9],mx=[-1e9,-1e9,-1e9];
  pts.forEach(function(p){var a=[p.dot(rt),p.dot(up),p.dot(fw)];for(var k=0;k<3;k++){if(a[k]<mn[k])mn[k]=a[k];if(a[k]>mx[k])mx[k]=a[k];}});
  var W=Math.min(mx[0]-mn[0],(mx[2]-mn[2])*1.1);
  var pos=new T.Vector3().addScaledVector(rt,(mn[0]+mx[0])/2).addScaledVector(up,mx[1]).addScaledVector(fw,(mn[2]+mx[2])/2);
  var basis=new T.Matrix4().makeBasis(rt,up,fw),q=new T.Quaternion().setFromRotationMatrix(basis);
  var M=new T.Matrix4().compose(pos,q,new T.Vector3(W,W,W));
  HAT_M[key]=M;
  return M;
};
P.setHat=function(look){
  if(this.hat){if(this.hat.parent)this.hat.parent.remove(this.hat);this.hat=null;}
  var id=look.hat;if(!id||id==='none'||!window.Hats||this.hoodVisible(look))return;
  var M=this.headAnchor();if(!M)return;
  var pal=CATALOG.palette,hc=look.hatC||[8,14];
  var h=Hats.make(T,id,[pal[hc[0]]||pal[8],pal[hc[1]]||pal[14]],{toon:this.toon,grad:this.toon?gradTex():null});if(!h)return;
  if(this.toon){var ol=[];h.traverse(function(o){if(o.isMesh&&!o.userData.outline)ol.push(o);});ol.forEach(function(o){var c=new T.Mesh(o.geometry,outlineMat());c.position.copy(o.position);c.rotation.copy(o.rotation);c.scale.copy(o.scale);c.userData.outline=true;o.parent.add(c);});}
  h.matrixAutoUpdate=false;h.matrix.copy(M);this.head.add(h);this.hat=h;
};
P.setStaff=function(kind){
  /* жители таверны ходят без посоха */
  if(!kind||kind==='none'){if(this.staff&&this.staff.group.parent)this.staff.group.parent.remove(this.staff.group);this.staff=null;return;}
  if(this.staff&&this.staff.kind===kind)return;
  if(this.staff&&this.staff.group.parent)this.staff.group.parent.remove(this.staff.group);
  this.staff=Staffs.make(T,kind);
  this.staff.setTier.apply(null,this.tierArgs);
  /* хват в левой ладони: навершие вверх */
  /* посох не дочерний к кости: в покое стоит вертикально у ладони, в бою смотрит туда же, куда рука */
  if(!this.staffHolder){this.staffHolder=new T.Group();this.root.add(this.staffHolder);}
  this.staffHolder.add(this.staff.group);
  this.staff.group.position.y=-Avatar.STAFF_OFFSET.grip;
  this.core=this.staff.core;this.coreMat=this.staff.coreMat;
};
P.placeStaff=function(dt,mode){
  _v=_v||new T.Vector3();_q=_q||new T.Quaternion();_q2=_q2||new T.Quaternion();_q3=_q3||new T.Quaternion();_e=_e||new T.Euler();
  this.root.updateMatrixWorld(true);
  var h=this.staffHolder;
  this.hand.getWorldPosition(_v);this.root.worldToLocal(_v);
  if(mode==='wardrobe'){_v.y=0;_v.x+=0.06;_v.z+=0.04;this.staff.group.position.y=0.87;}
  else this.staff.group.position.y=-Avatar.STAFF_OFFSET.grip;
  h.position.copy(_v);
  /* вертикально, слегка вперёд; в бою наклон к врагу, при выстреле толчок вперёд */
  var fw=mode==='fight'?0.55+this.kick*0.25:0.12;
  this.tilt=(this.tilt===undefined?fw:this.tilt)+(fw-(this.tilt||0))*Math.min(1,dt*8);
  _q.setFromEuler(_e.set(mode==='wardrobe'?0.02:this.tilt,0,mode==='wardrobe'?-0.05:-0.06));
  /* по руке: ось посоха вдоль локальной Y кисти */
  this.hand.getWorldQuaternion(_q2);this.root.getWorldQuaternion(_q3);_q2.premultiply(_q3.invert());
  var w=0;
  this.staffW=(this.staffW||0)+(w-(this.staffW||0))*Math.min(1,dt*8);
  h.quaternion.copy(_q).slerp(_q2,this.staffW);
};
P.setTier=function(t,colors){this.tierArgs=[t,colors];if(this.staff)this.staff.setTier(t,colors);};
P.setQuality=function(){};
P.setResolution=function(res){
  if(res===this.res||!this.look)return Promise.resolve();
  this.res=res;return this.setLook(this.look);
};

/* смена анимации с плавным переходом */
P.play=function(name,fade){
  var self=this;
  return clips().then(function(by){
    var clip=by[name]||by.idle;if(!clip||!self.mixer)return;
    var a=self.actions[name];
    if(!a){a=self.mixer.clipAction(clip);self.actions[name]=a;}
    if(self.cur===a)return;
    a.reset();a.enabled=true;a.setEffectiveWeight(1);
    if(ONCE[name]){a.setLoop(T.LoopOnce,1);a.clampWhenFinished=true;}
    else a.setLoop(T.LoopRepeat,Infinity);
    a.play();
    if(self.cur&&fade!==0)self.cur.crossFadeTo(a,fade||0.35,false);
    else if(self.cur)self.cur.stop();
    self.cur=a;self.curName=name;
  });
};
var ONCE={Sitting_Enter:1,cast:1,Sitting_Exit:1,Death01:1,hurt:1,hurt2:1,victory:1,knock:1,getup:1,throw:1,block:1,yes:1,wake:1,sleep:1};
var MODE_CLIP={walk:'walk',fight:'fight',idle:'idle',wardrobe:'wardrobe'};
/* короткая реакция в бою (удар, победа), потом обратно к анимации режима.
   Пока идёт цепочка (отброс и подъём), другие реакции не перебивают её. */
P.react=function(name,ms){
  var self=this;if(this.mode!=='fight'&&/^hurt|block|knock/.test(name))return;
  if(this.seqUntil&&performance.now()<this.seqUntil)return;
  this.castT=Math.max(this.castT||0,ms/1000);this.play(name,0.08);
  clearTimeout(this.castBack);this.castBack=setTimeout(function(){self.play(MODE_CLIP[self.mode]||'idle',0.3);},ms);
};
/* цепочка реакций: [[клип, мс], ...] */
P.reactSeq=function(list){
  var self=this;if(this.mode!=='fight')return;
  if(this.seqUntil&&performance.now()<this.seqUntil)return;
  var total=list.reduce(function(a,x){return a+x[1];},0);
  this.seqUntil=performance.now()+total;this.castT=Math.max(this.castT||0,total/1000);
  clearTimeout(this.castBack);
  var i=0;(function step(){
    if(i>=list.length){self.seqUntil=0;self.play(MODE_CLIP[self.mode]||'idle',0.3);return;}
    var x=list[i++];self.play(x[0],i===1?0.08:0.15);self.castBack=setTimeout(step,x[1]);
  })();
};
P.busyReact=function(){return this.castT>0.05||(this.seqUntil&&performance.now()<this.seqUntil);};
P.update=function(dt,mode,fat){
  if(!this.mixer)return;
  /* жители таверны: анимацию выбирает tavern3d через play(), здесь только шаг микшера */
  if(mode==='npc'){this.mixer.update(dt);return;}
  this.t+=dt;fat=fat||0;
  var self=this;
  if(mode!==this.mode){
    var prev=this.mode;this.mode=mode;
    if(mode==='sit'){
      this.play('Sitting_Enter',0.3);
      this.sitT=1.2;
    }else{
      if(prev==='sit')this.play('Sitting_Exit',0.2);
      this.play(MODE_CLIP[mode]||'idle',prev==='sit'?0.6:0.35);
    }
  }
  if(mode==='sit'&&this.sitT>0){this.sitT-=dt;if(this.sitT<=0)this.play('Sitting_Idle_Loop',0.4);}
  /* выстрел: короткий взмах, не чаще раза в 0.45 с */
  this.castT-=dt;
  if(this.kick>0.6&&mode==='fight'&&this.castT<=0){
    this.castT=0.45;this.play('cast',0.08);
    clearTimeout(this.castBack);this.castBack=setTimeout(function(){if(self.mode==='fight')self.play('fight',0.25);},420);
  }
  if(this.cur){
    var ts=1;
    if(mode==='walk')ts=1-0.35*fat;
    this.cur.timeScale=ts;
  }
  this.mixer.update(dt);
  this.kick=Math.max(0,this.kick-dt*6);
  if(this.staff&&this.hand)this.placeStaff(dt,mode);
  if(this.staff){
    var glow=mode==='fight'?1-0.35*fat:mode==='sit'?0.25:0.6-0.3*fat;
    this.staff.update(dt,glow,this.kick,mode==='fight');
  }
};

/* смещение посоха в ладони (подбирается под скелет; меняется из консоли для настройки) */
Avatar.STAFF_OFFSET={grip:0.22,fightW:0.85};
var _v=null,_q=null,_q2=null,_q3=null,_e=null;

function init(THREE){
  if(T)return Promise.resolve();
  T=THREE;GLTF=window.AcGLTF(THREE);SKU=window.AcSkel(THREE);loader=new GLTF();
  return fetch(window.Boot?Boot.url(BASE+'sizes.json'):BASE+'sizes.json').then(function(r){return r.json();}).then(function(j){SIZES=j;},function(){SIZES={};});
}
function create(look,opts){
  opts=opts||{};
  var A=new Avatar();A.res=opts.res||'1k';A.forGame=opts.forGame!==false;A.toon=!!opts.toon;
  return A.setLook(look,opts.onProgress);
}

window.Avatar={init:init,create:create,loadExtraClips:loadExtraClips,defaults:defaults,CATALOG:CATALOG,missing:missing,needs:needs,
  get STAFF_OFFSET(){return Avatar.STAFF_OFFSET;},set STAFF_OFFSET(v){Avatar.STAFF_OFFSET=v;},
  fmtBytes:function(b){return b>=1048576?(b/1048576).toFixed(1)+' МБ':Math.max(1,Math.round(b/1024))+' КБ';}};
})();
