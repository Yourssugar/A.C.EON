/* Aceonium: мастер питомцев (v14). Окно в стиле гардероба: питомец на подиуме, рядом уровень, бонусы и тренировка.
   Лису мастер даёт при найме, остальных маг находит в главах. Pets.open(id) */
(function(){
'use strict';
var D=window.AcData;
var t=function(k,v){return I18n.t(k,v);};
function el(tag,cls,html){var e=document.createElement(tag);if(cls)e.className=cls;if(html!==undefined)e.innerHTML=html;return e;}
var COIN='<i class="coin"></i>';
var M=null;

function petName(id){return t('pet.'+id);}
/* бонус питомца на уровне: "урон +6%, шанс ресурса +1.5%" */
function effText(id,lvl){
  var d=D.PET_BY[id],out=[];
  for(var k in d.eff)out.push(t('eff.'+k,{v:Math.round(d.eff[k]*lvl*1000)/10}));
  return out.join(', ');
}

function open(id){
  if(M)close();
  var g=window.acGame,P2=g.pets();
  M={id:id||P2.active||D.PETS[0].id,alive:true};
  var box=el('div','wd2 ms2 pt2');
  box.innerHTML=
    '<div class="wd2-stage"><canvas class="wd2-canvas"></canvas><div class="ms2-status"></div><div class="wd2-hint">'+t('cr.drag')+'</div></div>'+
    '<div class="wd2-side">'+
      '<div class="wd2-head"><h2>'+t('pt.title')+'</h2><span class="wd2-coins">'+COIN+'<b></b></span></div>'+
      '<nav class="wd2-tabs ms2-tabs"></nav>'+
      '<div class="wd2-body ms2-body"></div>'+
      '<div class="wd2-foot"><div class="btn-row"><button type="button" class="btn" data-act="close">'+t('ms2.close')+'</button></div></div>'+
    '</div>';
  document.body.appendChild(box);M.box=box;
  M.q=function(s){return box.querySelector(s);};
  var tabs=M.q('.ms2-tabs');
  D.PETS.forEach(function(d){var b=el('button');b.type='button';b.dataset.p=d.id;tabs.appendChild(b);});
  tabs.addEventListener('click',function(e){var b=e.target.closest('button');if(!b)return;M.id=b.dataset.p;Sound.sfx('select');showPet();render(true);});
  M.q('[data-act="close"]').addEventListener('click',close);
  M.q('.ms2-body').addEventListener('click',function(e){
    var b=e.target.closest('[data-act]');if(!b||b.disabled)return;
    var a=b.dataset.act,ok=false;
    if(a==='hire')ok=g.petHire();
    if(a==='use')ok=g.petSet(M.id);
    if(a==='train')ok=g.petTrain(M.id);
    if(ok){Sound.sfx('select');showPet();}
    render(true);
  });
  initStage();
  render(true);
  M.timer=setInterval(function(){render(false);},500);
}

/* ════════ 3D ════════ */
function initStage(){
  var THREE=window.ACE_THREE,canvas=M.q('.wd2-canvas');
  if(!THREE||!window.Adventure){M.q('.wd2-stage').classList.add('no3d');return;}
  var r=new THREE.WebGLRenderer({canvas:canvas,antialias:true});
  r.setPixelRatio(Math.min(window.devicePixelRatio||1,1.75));
  r.outputColorSpace=THREE.SRGBColorSpace;r.toneMapping=THREE.ACESFilmicToneMapping;r.toneMappingExposure=1.1;
  r.shadowMap.enabled=true;
  var scene=new THREE.Scene();
  var bg=document.createElement('canvas');bg.width=4;bg.height=256;var c=bg.getContext('2d');
  var gr=c.createLinearGradient(0,0,0,256);gr.addColorStop(0,'#0a0c08');gr.addColorStop(0.55,'#1e2a16');gr.addColorStop(1,'#080a06');c.fillStyle=gr;c.fillRect(0,0,4,256);
  var bt=new THREE.CanvasTexture(bg);bt.colorSpace=THREE.SRGBColorSpace;scene.background=bt;
  scene.add(new THREE.HemisphereLight(0xfff0dc,0x283018,1.1));
  var key=new THREE.DirectionalLight(0xffe0b8,2.4);key.position.set(2,4,3);key.castShadow=true;key.shadow.mapSize.set(1024,1024);
  var sc=key.shadow.camera;sc.left=-1.2;sc.right=1.2;sc.top=1.6;sc.bottom=-0.4;sc.near=0.5;sc.far=12;key.shadow.bias=-0.0005;scene.add(key);
  var rim=new THREE.DirectionalLight(0xa0d070,1.2);rim.position.set(-3,2,-3);scene.add(rim);
  var plat=new THREE.Mesh(new THREE.CylinderGeometry(0.7,0.78,0.08,48),new THREE.MeshStandardMaterial({color:0x2e3a1e,metalness:0.1,roughness:0.75}));
  plat.position.y=-0.04;plat.receiveShadow=true;scene.add(plat);
  var ring=new THREE.Mesh(new THREE.TorusGeometry(0.74,0.01,8,96),new THREE.MeshBasicMaterial({color:0x9fe060}));ring.rotation.x=Math.PI/2;ring.position.y=0.002;scene.add(ring);
  var cam=new THREE.PerspectiveCamera(30,1,0.05,50);
  M.st={THREE:THREE,r:r,scene:scene,cam:cam,rot:0.6,vel:0,last:performance.now(),pets:{}};
  var drag=null;
  canvas.addEventListener('pointerdown',function(e){drag={x:e.clientX};});
  canvas.addEventListener('pointermove',function(e){if(!drag)return;var dx=e.clientX-drag.x;drag.x=e.clientX;M.st.rot+=dx*0.01;M.st.vel=dx*0.01;});
  canvas.addEventListener('pointerup',function(){drag=null;});canvas.addEventListener('pointercancel',function(){drag=null;});
  function size(){var w=canvas.clientWidth||300,h=canvas.clientHeight||400;r.setSize(w,h,false);cam.aspect=w/h;cam.updateProjectionMatrix();}
  M.st.size=size;size();window.addEventListener('resize',size);
  Adventure.init(THREE).then(function(){if(M&&M.alive)showPet();},function(){});
  function loop(now){
    if(!M||!M.alive)return;
    var st=M.st,dt=Math.min(0.05,(now-st.last)/1000);st.last=now;
    if(!drag){st.vel*=0.92;st.rot+=st.vel+dt*0.15;}
    cam.position.set(Math.sin(st.rot)*3.3,1.15,Math.cos(st.rot)*3.3);cam.lookAt(0,0.38,0);
    var P=st.cur;
    if(P){
      if(!P.busy()){st.idleT=(st.idleT||3)-dt;if(st.idleT<=0){st.idleT=4+Math.random()*3;P.play(Math.random()<0.5?'attack':'low',0.25);}else if(P.role!=='idle'&&P.role!=='low')P.play('idle',0.3);}
      P.mixer.update(dt);if(P.fly)P.root.position.y=0.45+Math.sin(now/450)*0.05;
    }
    if(canvas.clientWidth&&Math.abs(canvas.width-Math.round(canvas.clientWidth*r.getPixelRatio()))>2)size();
    r.render(scene,cam);
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
}
function showPet(){
  var st=M&&M.st;if(!st||!window.Adventure)return;
  var id=M.id;
  for(var k in st.pets)if(st.pets[k].root)st.pets[k].root.visible=k===id;
  var P=st.pets[id],lit=!!window.acGame.pet(id)||!!D.PET_BY[id].start;
  /* питомец стал своим (нашли или наняли мастера): силуэт заменяем цветной копией */
  if(P&&P.root&&P.dark&&lit){st.scene.remove(P.root);P.dispose();delete st.pets[id];P=null;}
  if(P&&P.root){st.cur=P;P.play('idle',0.2);return;}
  if(P&&P.loading)return;
  st.pets[id]={loading:true};
  Adventure.loadPet(id).then(function(){
    if(!M||!M.alive)return;
    var A=Adventure.pet(id);if(!A){delete st.pets[id];return;}
    st.pets[id]=A;st.scene.add(A.root);A.root.visible=M.id===id;
    /* ещё не найденный питомец: тёмный силуэт */
    var own=window.acGame.pet(id)||D.PET_BY[id].start;
    if(!own)A.dark=true;
    if(!own)A.model.traverse(function(m){if(m.isMesh)(Array.isArray(m.material)?m.material:[m.material]).forEach(function(x){x.color.set('#101418');if(x.emissive)x.emissive.set('#000000');});});
    if(M.id===id){st.cur=A;A.play('idle',0);}
  },function(e){console.warn('[pets]',e);delete st.pets[id];});
}

/* ════════ ПАНЕЛЬ ════════ */
function render(full){
  if(!M)return;
  var g=window.acGame,S=g.S,P2=g.pets(),id=M.id,d=D.PET_BY[id],own=P2.own[id];
  M.q('.wd2-coins b').textContent=D.fmt(S.gold);
  [].forEach.call(M.q('.ms2-tabs').children,function(b){
    var o=P2.own[b.dataset.p];
    b.innerHTML=(o?petName(b.dataset.p):'?')+'<small>'+(o?t('ms.lvl',{n:o.lvl})+(P2.active===b.dataset.p?' · '+t('pt.activeS'):''):t('pt.locked'))+'</small>';
    b.classList.toggle('sel',b.dataset.p===id);b.classList.toggle('off',!o);
  });
  var stEl=M.q('.ms2-status'),stTxt='<b>'+(own?petName(id):'?')+'</b>'+(own?' '+t('ms.lvl',{n:own.lvl}):'');
  if(P2.train)stTxt+='<br><span class="tch">'+t('pt.training',{p:petName(P2.train.id),t:UI.ft(P2.train.t)})+'</span>';
  if(stEl._h!==stTxt){stEl._h=stTxt;stEl.innerHTML=stTxt;}
  var body=M.q('.ms2-body'),h='';
  if(!P2.hired){
    h+='<p class="note">'+t('pt.desc')+'</p>';
    h+='<button type="button" class="btn pink big" data-act="hire"'+(S.gold<D.PETMASTER_HIRE?' disabled':'')+'>'+t('pt.hire')+' '+COIN+D.fmt(D.PETMASTER_HIRE)+'</button>';
    h+='<p class="note">'+t('pt.hireI')+'</p>';
  }
  if(!own){
    var tr=d.tract!==undefined?UI.tractName(d.tract):'';
    h+='<div class="lbl full">'+t('pt.where')+'</div><p class="note">'+(d.start?t('pt.whereStart'):t('pt.whereTract',{t:tr,p:Math.round(D.PET_FIND*100)}))+'</p>';
    h+='<div class="lbl full">'+t('pt.bonus')+'</div><p>'+effText(id,1)+' '+t('pt.perLvl')+'</p>';
    return setBody(body,h);
  }
  h+='<div class="lbl full">'+t('pt.level',{n:own.lvl,m:D.PET_MAX})+'</div><div class="bar mastb"><i style="width:'+(own.lvl/D.PET_MAX*100).toFixed(1)+'%"></i></div>';
  h+='<div class="lbl full">'+t('pt.bonus')+'</div><p class="ok">'+effText(id,own.lvl)+'</p>';
  if(own.lvl<D.PET_MAX)h+='<p class="note">'+t('pt.next',{e:effText(id,own.lvl+1)})+'</p>';
  if(P2.active===id)h+='<p class="note">'+t('pt.isActive')+'</p>';
  else h+='<button type="button" class="btn pink" data-act="use">'+t('pt.use')+'</button>';
  /* тренировка у мастера питомцев */
  h+='<div class="lbl full">'+t('pt.train')+'</div>';
  if(P2.train&&P2.train.id===id){
    h+='<p class="tch">'+t('pt.training',{p:petName(id),t:UI.ft(P2.train.t)})+'</p><div class="bar mastb"><i style="width:'+((1-P2.train.t/P2.train.T)*100).toFixed(1)+'%"></i></div>';
  }else{
    var bl=g.petBlock(id),c=g.petCost(id);
    if(c)h+='<div class="ms2-up"><div><b>'+t('pt.trainTo',{n:own.lvl+1})+'</b><small>'+UI.ft(D.petTime(own.lvl))+'</small></div>'+
      '<button type="button" class="btn sm" data-act="train"'+(bl?' disabled':'')+'>'+UI.costHtml(c)+'</button></div>';
    if(bl&&bl!=='cost')h+='<p class="note">'+t('pt.block.'+bl)+'</p>';
  }
  setBody(body,h);
}
function setBody(body,h){if(body._h!==h){var sc=body.scrollTop;body._h=h;body.innerHTML=h;body.scrollTop=sc;}}
function close(){
  if(!M)return;
  M.alive=false;clearInterval(M.timer);
  if(M.st){window.removeEventListener('resize',M.st.size);for(var k in M.st.pets)if(M.st.pets[k].dispose)M.st.pets[k].dispose();M.st.r.dispose();}
  M.box.remove();M=null;
  if(window.UI)UI.panel();
}
window.Pets={open:open,close:close,get isOpen(){return !!M;},effText:effText,name:petName};
})();
