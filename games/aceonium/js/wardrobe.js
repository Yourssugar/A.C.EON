/* Aceonium: гардероб и создание героя.
   Полноэкранное окно: слева 3D-превью персонажа (вращение, приближение к лицу, капюшон вкл/выкл),
   справа выбор облика, одежды и посоха. Примерка сразу, недостающие файлы качаются с прогрессом.

   Wardrobe.open({mode:'create'|'edit', look, name, onDone:function(look,name){}, onCancel}) */
(function(){
'use strict';

var D=window.AcData;
var t=function(k,v){return I18n.t(k,v);};
function el(tag,cls,html){var e=document.createElement(tag);if(cls)e.className=cls;if(html!==undefined)e.innerHTML=html;return e;}
function esc(s){return String(s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];});}
var COIN='<i class="coin"></i>';

/* платные вещи: id, уровень открытия; цена считается как у старых цветов мантии */
var PAID={
  'part:shoulders:ranger':20,'color:ranger:1':30,'color:peasant:1':10,
  'staff:crystal':15,'staff:bone':35,'staff:iron':55,'staff:branch':75,
  /* v28: головные уборы (цвета одежды бесплатно) */
  'hat:wizard':10,'hat:bard':20,'hat:catears':25,'hat:goggles':30,'hat:crown':60
};
/* вещи открываются уровнем мага (старый уровень похода / 5), цена в золоте таверны */
function needLvl(id){return Math.max(1,Math.ceil(PAID[id]/5));}
function priceOf(id){return PAID[id]&&!D.WARDROBE_FREE?D.wardrobePrice(needLvl(id)):0;}

var W=null;   // текущее окно

function open(opts){
  if(W)close();
  var g=window.acGame,S=g.S;
  var look=JSON.parse(JSON.stringify(opts.look||Avatar.defaults('m')));
  var start=JSON.parse(JSON.stringify(look));
  W={opts:opts,look:look,start:start,tab:'look',cam:'body',hoodShow:opts.mode!=='create',name:opts.name||'',alive:true,busy:0};
  var box=el('div','wd2');
  box.innerHTML=
    '<div class="wd2-stage"><canvas class="wd2-canvas"></canvas>'+
      '<div class="wd2-load hidden"><div class="bar"><i></i></div><span></span></div>'+
      '<div class="wd2-cam"><button type="button" data-cam="body">'+t('wd2.body')+'</button><button type="button" data-cam="face">'+t('wd2.face')+'</button>'+
      '<button type="button" data-hood>'+t('wd2.hood')+'</button></div>'+
      '<div class="wd2-hint">'+t('cr.drag')+'</div></div>'+
    '<div class="wd2-side">'+
      '<div class="wd2-head"><h2>'+(opts.mode==='create'?t('wd2.create'):t('tab.wardrobe'))+'</h2>'+(opts.mode==='create'?'':'<span class="wd2-coins">'+COIN+'<b></b></span>')+'</div>'+
      (opts.mode==='create'?'<div class="wd2-name"><div class="lbl">'+t('cr.name')+'</div><input maxlength="16" autocomplete="off" spellcheck="false" placeholder="'+esc(t('cr.namePh'))+'"><div class="err hidden">'+t('cr.nameErr')+'</div></div>':'')+
      '<nav class="wd2-tabs"><button type="button" data-tab="look">'+t('wd2.tLook')+'</button><button type="button" data-tab="gear">'+t('wd2.tGear')+'</button><button type="button" data-tab="color">'+t('wd2.tColor')+'</button><button type="button" data-tab="staff">'+t('wd2.tStaff')+'</button></nav>'+
      '<div class="wd2-body"></div>'+
      '<div class="wd2-foot"><div class="wd2-note"></div><div class="btn-row">'+
        (opts.mode==='create'?'':'<button type="button" class="btn" data-act="cancel">'+t('cancel')+'</button>')+
        '<button type="button" class="btn pink" data-act="save"></button></div></div>'+
    '</div>';
  document.body.appendChild(box);W.box=box;
  W.q=function(s){return box.querySelector(s);};
  if(opts.mode==='create'){
    var inp=W.q('.wd2-name input');inp.value=W.name;
    inp.addEventListener('input',function(){W.name=inp.value;foot();});
    setTimeout(function(){inp.focus();},300);
  }
  box.querySelector('.wd2-tabs').addEventListener('click',function(e){var b=e.target.closest('button');if(!b)return;W.tab=b.dataset.tab;render();Sound.sfx('select');});
  box.querySelector('.wd2-cam').addEventListener('click',function(e){
    var b=e.target.closest('button');if(!b)return;
    if(b.dataset.cam){W.cam=b.dataset.cam;}
    if(b.hasAttribute('data-hood')){W.hoodShow=!W.hoodShow;W.look.hoodUp=W.hoodShow;apply();}
    paintCam();Sound.sfx('select');
  });
  box.querySelector('[data-act="save"]').addEventListener('click',save);
  var cb=box.querySelector('[data-act="cancel"]');if(cb)cb.addEventListener('click',function(){close();if(opts.onCancel)opts.onCancel();});
  W.look.hoodUp=W.hoodShow;
  initStage();
  render();paintCam();
}

/* ════════ 3D-ПРЕВЬЮ ════════ */
/* v28: один рендерер на всю сессию. Новый WebGL-контекст при каждом открытии терял текстуры
   (второе открытие показывало персонажа белым) и тратил лимит контекстов браузера */
var KEEP=null;
function initStage(){
  var THREE=window.ACE_THREE;
  var canvas=W.q('.wd2-canvas');
  if(!THREE||!window.Avatar){W.q('.wd2-stage').classList.add('no3d');return;}
  if(KEEP){canvas.parentNode.replaceChild(KEEP.canvas,canvas);canvas=KEEP.canvas;}
  var r=KEEP?KEEP.r:new THREE.WebGLRenderer({canvas:canvas,antialias:true,alpha:false});
  if(!KEEP)KEEP={r:r,canvas:canvas};
  r.setPixelRatio(Math.min(window.devicePixelRatio||1,2));
  r.outputColorSpace=THREE.SRGBColorSpace;r.toneMapping=THREE.ACESFilmicToneMapping;r.toneMappingExposure=1.1;
  r.shadowMap.enabled=true;r.shadowMap.type=THREE.PCFSoftShadowMap;
  var scene=new THREE.Scene();
  /* фон: тёмная студия с мягким пятном света */
  var bg=document.createElement('canvas');bg.width=4;bg.height=256;var bgc=bg.getContext('2d');
  var gr=bgc.createLinearGradient(0,0,0,256);gr.addColorStop(0,'#05060c');gr.addColorStop(0.55,'#141a2a');gr.addColorStop(1,'#07080e');bgc.fillStyle=gr;bgc.fillRect(0,0,4,256);
  var bgt=new THREE.CanvasTexture(bg);bgt.colorSpace=THREE.SRGBColorSpace;scene.background=bgt;
  /* карта окружения считается один раз: повторный PMREM на том же контексте иногда оставлял в кадре серо-голубую пелену */
  if(!KEEP.env){var pm=new THREE.PMREMGenerator(r),es=new THREE.Scene();es.background=new THREE.Color(0x707890);es.add(new THREE.HemisphereLight(0xffffff,0x403830,3));
    KEEP.env=pm.fromScene(es,0.04).texture;pm.dispose();r.setRenderTarget(null);}
  scene.environment=KEEP.env;
  scene.add(new THREE.HemisphereLight(0xc8d4ff,0x302820,0.6));
  var key=new THREE.DirectionalLight(0xfff0dc,2.0);key.position.set(2.5,4,3);key.castShadow=true;key.shadow.mapSize.set(1024,1024);
  var sc=key.shadow.camera;sc.left=-1.5;sc.right=1.5;sc.top=2.5;sc.bottom=-0.5;sc.near=0.5;sc.far=12;key.shadow.bias=-0.0005;scene.add(key);
  var rim=new THREE.DirectionalLight(0x80c8ff,0.9);rim.position.set(-3,2.5,-3);scene.add(rim);
  var fill=new THREE.DirectionalLight(0xffc8a0,0.5);fill.position.set(-3,1,2);scene.add(fill);
  /* подиум */
  var plat=new THREE.Mesh(new THREE.CylinderGeometry(0.85,0.95,0.1,48),new THREE.MeshStandardMaterial({color:0x1a1e2c,metalness:0.5,roughness:0.45}));
  plat.position.y=-0.05;plat.receiveShadow=true;scene.add(plat);
  var ring=new THREE.Mesh(new THREE.TorusGeometry(0.9,0.012,8,96),new THREE.MeshBasicMaterial({color:0x00e5ff}));ring.rotation.x=Math.PI/2;ring.position.y=0.002;scene.add(ring);
  var cam=new THREE.PerspectiveCamera(28,1,0.05,50);
  W.st={THREE:THREE,r:r,scene:scene,cam:cam,rot:0.35,vel:0,zoom:0,camT:new THREE.Vector3(0,1.0,0),camD:4.6,last:performance.now()};
  /* вращение и приближение */
  var drag=null,pinch=null;
  if(!KEEP.bound){KEEP.bound=true;
    canvas.addEventListener('pointerdown',function(e){KEEP.drag={x:e.clientX};canvas.setPointerCapture&&canvas.setPointerCapture(e.pointerId);});
    canvas.addEventListener('pointermove',function(e){if(!KEEP.drag||!W||!W.st)return;var dx=e.clientX-KEEP.drag.x;KEEP.drag.x=e.clientX;W.st.rot+=dx*0.01;W.st.vel=dx*0.01;});
    canvas.addEventListener('pointerup',function(){KEEP.drag=null;});canvas.addEventListener('pointercancel',function(){KEEP.drag=null;});
    canvas.addEventListener('wheel',function(e){if(!W||!W.st)return;e.preventDefault();W.st.zoom=Math.max(0,Math.min(1,W.st.zoom+(e.deltaY<0?0.12:-0.12)));W.cam=W.st.zoom>0.6?'face':'body';paintCam();},{passive:false});
  }
  function size(){var w=canvas.clientWidth||300,h=canvas.clientHeight||400;r.setSize(w,h,false);cam.aspect=w/h;cam.updateProjectionMatrix();}
  W.st.size=size;size();
  window.addEventListener('resize',size);
  apply(true);
  function loop(now){
    if(!W||!W.alive)return;
    var st=W.st,dt=Math.min(0.05,(now-st.last)/1000);st.last=now;
    if(!KEEP.drag){st.vel*=0.92;st.rot+=st.vel;}
    var face=W.cam==='face';
    st.zoom+=((face?1:0)-st.zoom)*Math.min(1,dt*5);
    var A=st.av;
    var ty=1.0,hy=1.62;
    if(A&&A.head){var hp=new THREE.Vector3();A.head.getWorldPosition(hp);hy=hp.y+0.06;}
    st.camT.set(0,ty+(hy-ty)*st.zoom,0);
    var d=4.6-3.75*st.zoom;
    cam.position.set(Math.sin(st.rot)*d,st.camT.y+0.25*(1-st.zoom)+0.02,Math.cos(st.rot)*d);
    cam.lookAt(st.camT);
    if(A){A.update(dt,'wardrobe',0);if(A.staffHolder)A.staffHolder.visible=st.zoom<0.5;}
    if(canvas.clientWidth&&Math.abs(canvas.width-Math.round(canvas.clientWidth*r.getPixelRatio()))>2)size();
    r.render(scene,cam);
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
}
function showLoad(p,total){
  if(!W)return;var L=W.q('.wd2-load');if(!L)return;
  if(p>=1||!total){L.classList.add('hidden');return;}
  L.classList.remove('hidden');
  L.querySelector('i').style.width=Math.round(p*100)+'%';
  L.querySelector('span').textContent=t('wd2.loading',{s:Avatar.fmtBytes(total)})+' '+Math.round(p*100)+'%';
}
/* применить черновик к превью */
function apply(first){
  if(!W||!W.st)return;
  var st=W.st,look=W.look,res=(Scene3D.quality==='high'||Scene3D.quality==='ultra')?'2k':'1k';
  W.busy++;
  var job=st.av?st.av.setLook(look,showLoad):Avatar.init(st.THREE).then(function(){return Avatar.create(look,{res:res,forGame:false,toon:true,onProgress:showLoad});}).then(function(A){
    if(!W||!W.alive)return A;
    st.av=A;st.scene.add(A.root);
    A.root.traverse(function(o){if(o.isMesh)o.castShadow=true;});
    A.setTier(D.staffTier(window.acGame.S.staff),D.TIER_COLORS);
    return A;
  });
  job.then(function(A){
    W&&W.busy--;showLoad(1,0);
    if(A)A.root.traverse(function(o){if(o.isMesh)o.castShadow=true;});
    render();
  },function(e){console.error(e);W&&W.busy--;showLoad(1,0);UI.toast(t('wd2.loadErr'));});
}

/* ════════ ПАНЕЛЬ ВЫБОРА ════════ */
function owned(id){var S=window.acGame.S;return !PAID[id]||S.wardrobe.owned.indexOf(id)>=0;}
function opened(id){var S=window.acGame.S;return !PAID[id]||S.mlvl>=needLvl(id);}
function tile(o){
  /* o: {label, swatch, sel, id, size} */
  var cls='wd2-tile'+(o.sel?' sel':'')+(o.swatch?' sw':'');
  var sub='';
  if(o.id&&!owned(o.id))sub=opened(o.id)?(priceOf(o.id)?COIN+D.fmt(priceOf(o.id)):t('wd.free')):t('wd.open',{n:needLvl(o.id)});
  if(o.size)sub+=(sub?' · ':'')+'+'+Avatar.fmtBytes(o.size);
  return '<button type="button" class="'+cls+(o.id&&!opened(o.id)?' lock':'')+'" data-k="'+o.k+'" data-v="'+esc(o.v)+'">'+
    (o.swatch?'<span class="wd2-sw" style="--c:'+o.swatch+'"></span>':'')+
    (o.label?'<span class="wd2-l">'+esc(o.label)+'</span>':'')+
    (sub?'<span class="wd2-s">'+sub+'</span>':'')+'</button>';
}
function sizeFor(change){
  var L=JSON.parse(JSON.stringify(W.look));change(L);
  var res=(Scene3D.quality==='high'||Scene3D.quality==='ultra')?'2k':'1k';
  return Avatar.missing(L,res,false);
}
function group(title,html){return '<div class="wd2-grp"><div class="lbl">'+title+'</div><div class="wd2-tiles">'+html+'</div></div>';}
function render(){
  if(!W)return;
  var C=Avatar.CATALOG,L=W.look,f=L.gender==='f',h='';
  [].forEach.call(W.q('.wd2-tabs').children,function(b){b.classList.toggle('sel',b.dataset.tab===W.tab);});
  if(W.tab==='look'){
    h+=group(t('wd.look'),['m','f'].map(function(gd){return tile({k:'gender',v:gd,label:t(gd==='m'?'wd2.male':'wd2.female'),sel:L.gender===gd,size:sizeFor(function(x){x.gender=gd;})});}).join(''));
    h+=group(t('wd2.skin'),C.skins.map(function(c,i){return tile({k:'skin',v:i,swatch:skinShow(c),sel:L.skin===i});}).join(''));
    h+=group(t('wd2.hair'),C.hair.map(function(o){return tile({k:'hair',v:o.id,label:t('hair.'+o.id),sel:L.hair===o.id,size:sizeFor(function(x){x.hair=o.id;x.hoodUp=false;})});}).join(''));
    h+=group(t('wd2.hairColor'),C.hairColors.map(function(c,i){return tile({k:'hairColor',v:i,swatch:c,sel:L.hairColor===i});}).join(''));
    if(!f)h+=group(t('wd2.beard'),C.beard.map(function(o){return tile({k:'beard',v:o.id,label:t('beard.'+o.id),sel:L.beard===o.id,size:sizeFor(function(x){x.beard=o.id;})});}).join(''));
    h+=group(t('wd2.eyes'),C.eyeColors.map(function(c,i){return tile({k:'eye',v:i,swatch:i?c:'#7a5030',sel:L.eye===i});}).join(''));
  }else if(W.tab==='gear'){
    C.slots.forEach(function(s){
      h+=group(t('slot.'+s),C.parts[s].map(function(o){
        var id='part:'+s+':'+o.id;
        return tile({k:s,v:o.id,label:t('outfit.'+o.id),sel:L[s]===o.id,id:PAID[id]?id:null,size:sizeFor(function(x){x[s]=o.id;x.hoodUp=true;})});
      }).join(''));
    });
    /* v28: головной убор и его цвета */
    h+=group(t('wd2.hat'),C.hats.map(function(id){var pid='hat:'+id;return tile({k:'hat',v:id,label:t('hat.'+id),sel:(L.hat||'none')===id,id:PAID[pid]?pid:null});}).join(''));
    if(L.hat&&L.hat!=='none'){
      var hc=L.hatC||[8,14];
      h+=group(t('wd2.hatC1'),C.palette.map(function(c,i){return tile({k:'hatC0',v:i,swatch:c,sel:hc[0]===i});}).join(''));
      h+=group(t('wd2.hatC2'),C.palette.map(function(c,i){return tile({k:'hatC1',v:i,swatch:c,sel:hc[1]===i});}).join(''));
    }
    ['ranger','peasant'].forEach(function(set){
      h+=group(t('wd2.color',{o:t('outfit.'+set)}),C.sets[set].color.map(function(c,i){
        var id='color:'+set+':'+i;
        return tile({k:'color:'+set,v:i,label:t('wd2.variant',{n:i+1}),sel:(L.colors[set]||0)===i,id:PAID[id]?id:null,size:sizeFor(function(x){x.colors[set]=i;})});
      }).join(''));
    });
  }else if(W.tab==='color'){
    /* v28: перекраска по зонам у нарядов, которые сейчас надеты */
    var used={};C.slots.forEach(function(sl){var d=C.parts[sl].filter(function(o){return o.id===L[sl];})[0];if(d&&d.set)used[d.set]=1;});
    if(!L.tint)L.tint={};
    Object.keys(used).forEach(function(set){
      var T0=L.tint[set]||[null,null,null,null],Z=C.sets[set].zones||[];
      h+='<div class="lbl wd2-sub">'+t('outfit.'+set)+'</div>';
      Z.forEach(function(z,zi){
        h+=group(t('zone.'+z),tile({k:'tint:'+set+':'+zi,v:'x',label:t('wd2.asIs'),sel:T0[zi]===null||T0[zi]===undefined})+
          C.palette.map(function(c,i){return tile({k:'tint:'+set+':'+zi,v:i,swatch:c,sel:T0[zi]===i});}).join(''));
      });
    });
    h+='<div class="stg-b"><button type="button" class="btn sm" data-act="tintReset">'+t('wd2.tintReset')+'</button><button type="button" class="btn sm" data-act="tintRnd">'+t('wd2.tintRnd')+'</button></div>';
  }else{
    h+=group(t('wd2.tStaff'),Staffs.kinds.map(function(k){var id='staff:'+k;return tile({k:'staff',v:k,label:t('staff.'+k),sel:L.staff===k,id:PAID[id]?id:null});}).join(''));
    h+='<p class="note">'+t('wd2.staffNote')+'</p>';
  }
  var body=W.q('.wd2-body');body.innerHTML=h;
  body.onclick=function(e){
    var ab=e.target.closest('[data-act]');
    if(ab&&(ab.dataset.act==='tintReset'||ab.dataset.act==='tintRnd')){
      var rnd=ab.dataset.act==='tintRnd',n=C.palette.length;
      W.look.tint={};['ranger','peasant'].forEach(function(set){W.look.tint[set]=[0,1,2,3].map(function(i){return rnd&&(i<2||Math.random()<0.5)?Math.floor(Math.random()*n):null;});});
      Sound.sfx('select');render();apply();return;
    }
    var b=e.target.closest('.wd2-tile');if(!b)return;
    var k=b.dataset.k,v=b.dataset.v;
    if(k.indexOf('tint:')===0){var pp=k.split(':');if(!W.look.tint)W.look.tint={};var arr=(W.look.tint[pp[1]]||[null,null,null,null]).slice();arr[+pp[2]]=v==='x'?null:+v;W.look.tint[pp[1]]=arr;Sound.sfx('select');render();apply();return;}
    if(k==='hatC0'||k==='hatC1'){var hc2=(W.look.hatC||[8,14]).slice();hc2[k==='hatC0'?0:1]=+v;W.look.hatC=hc2;Sound.sfx('select');render();apply();return;}
    if(k==='hat'){W.look.hat=v;if(v!=='none'){W.look.hood='none';W.hoodShow=false;W.look.hoodUp=false;paintCam();}Sound.sfx('select');render();apply();return;}
    if(k==='skin'||k==='hairColor'||k==='eye')v=+v;
    if(k.indexOf('color:')===0){W.look.colors[k.split(':')[1]]=+v;}
    else if(k==='gender'){var keep=W.look;W.look=Avatar.defaults(v);W.look.staff=keep.staff;W.look.skin=keep.skin;W.look.hoodUp=W.hoodShow;}
    else W.look[k]=v;
    if(k==='hair'||k==='hairColor'){W.hoodShow=false;W.look.hoodUp=false;paintCam();}
    if(C.slots.indexOf(k)>=0&&k==='hood'){W.hoodShow=v!=='none';W.look.hoodUp=W.hoodShow;if(v!=='none')W.look.hat='none';paintCam();}
    Sound.sfx('select');
    render();apply();
  };
  foot();
  var cs=W.q('.wd2-coins b');if(cs)cs.textContent=D.fmt(window.acGame.S.gold);
}
function skinShow(c){var THREE=window.ACE_THREE;if(!THREE)return c;var x=new THREE.Color(c).multiply(new THREE.Color('#e8b898'));return '#'+x.getHexString();}
function paintCam(){
  if(!W)return;
  [].forEach.call(W.q('.wd2-cam').children,function(b){
    if(b.dataset.cam)b.classList.toggle('sel',b.dataset.cam===W.cam);
    if(b.hasAttribute('data-hood')){b.classList.toggle('sel',W.hoodShow);b.classList.toggle('hidden',W.look.hood==='none');}
  });
}
/* что из черновика ещё не куплено */
function unpaid(){
  var L=W.look,ids=[];
  Avatar.CATALOG.slots.forEach(function(s){var id='part:'+s+':'+L[s];if(PAID[id])ids.push(id);});
  ['ranger','peasant'].forEach(function(set){
    var used=Avatar.CATALOG.slots.some(function(s){var d=Avatar.CATALOG.parts[s].filter(function(o){return o.id===L[s];})[0];return d&&d.set===set;});
    var id='color:'+set+':'+(L.colors[set]||0);if(used&&PAID[id])ids.push(id);
  });
  var sid='staff:'+L.staff;if(PAID[sid])ids.push(sid);
  var hid='hat:'+(L.hat||'none');if(PAID[hid])ids.push(hid);
  return ids.filter(function(id){return !owned(id);});
}
function foot(){
  if(!W)return;
  var btn=W.q('[data-act="save"]'),note=W.q('.wd2-note'),S=window.acGame.S;
  var need=unpaid(),locked=need.filter(function(id){return !opened(id);}),cost=need.reduce(function(s,id){return s+priceOf(id);},0);
  var nameOk=W.opts.mode!=='create'||UI.validName((W.name||'').trim());
  if(W.opts.mode==='create'){
    btn.textContent=t('cr.go');
    btn.disabled=!nameOk||need.length>0;
    note.innerHTML=need.length?t('wd2.notFree'):'';
    var err=W.q('.wd2-name .err');if(err)err.classList.toggle('hidden',nameOk||(W.name||'').trim().length<2);
    return;
  }
  if(!need.length){btn.textContent=t('wd.save');btn.disabled=false;note.innerHTML='';}
  else if(locked.length){btn.textContent=t('wd.save');btn.disabled=true;note.innerHTML=t('wd2.locked');}
  else if(!cost){btn.textContent=t('wd.save');btn.disabled=false;note.innerHTML='';}
  else{var coins=S.gold||0;btn.innerHTML=t('wd2.buy')+' '+COIN+D.fmt(cost);btn.disabled=coins<cost;note.innerHTML=coins<cost?t('wd2.noCoins'):'';}
}
function save(){
  if(!W)return;
  var S=window.acGame.S,need=unpaid(),cost=need.reduce(function(s,id){return s+priceOf(id);},0);
  if(W.opts.mode==='create'){
    var n=(W.name||'').trim();if(!UI.validName(n)||need.length)return;
    var look=W.look;look.hoodUp=true;var cb=W.opts.onDone;close();cb(look,n);return;
  }
  if(need.length){
    if(need.some(function(id){return !opened(id);})||(S.gold||0)<cost)return;
    if(cost)S.gold-=cost;need.forEach(function(id){S.wardrobe.owned.push(id);});
  }
  var look2=W.look;look2.hoodUp=true;var cb2=W.opts.onDone;close();Sound.sfx('win');cb2(look2);
}
function close(){
  if(!W)return;
  W.alive=false;
  if(W.st){window.removeEventListener('resize',W.st.size);if(W.st.av&&W.st.av.root.parent)W.st.av.root.parent.remove(W.st.av.root);W.st.r.renderLists.dispose();}
  W.box.remove();W=null;
}

window.Wardrobe={open:open,close:close,priceOf:priceOf,PAID:PAID,needLvl:needLvl,get isOpen(){return !!W;},get _st(){return W&&W.st;}};
})();
