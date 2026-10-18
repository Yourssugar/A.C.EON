/* Aceonium: окно мастера в стиле гардероба (v10).
   Мастер стоит на подиуме в 3D, рядом список того, что он умеет, улучшения и учитель.
   Внешность мастеров не меняется: они живут в своих мастерских, сюда мы только заглядываем.
   Masters.open(id) */
(function(){
'use strict';
var D=window.AcData;
var t=function(k,v){return I18n.t(k,v);};
function el(tag,cls,html){var e=document.createElement(tag);if(cls)e.className=cls;if(html!==undefined)e.innerHTML=html;return e;}
var COIN='<i class="coin"></i>';
var M=null;

function open(id){
  if(M)close();
  var g=window.acGame;
  M={id:id||'herbalist',alive:true};
  var box=el('div','wd2 ms2');
  box.innerHTML=
    '<div class="wd2-stage"><canvas class="wd2-canvas"></canvas><div class="ms2-status"></div><div class="wd2-hint">'+t('cr.drag')+'</div></div>'+
    '<div class="wd2-side">'+
      '<div class="wd2-head"><h2>'+t('ms2.title')+'</h2><span class="wd2-coins">'+COIN+'<b></b></span></div>'+
      '<nav class="wd2-tabs ms2-tabs"></nav>'+
      '<div class="wd2-body ms2-body"></div>'+
      '<div class="wd2-foot"><div class="btn-row"><button type="button" class="btn" data-act="close">'+t('ms2.close')+'</button></div></div>'+
    '</div>';
  document.body.appendChild(box);M.box=box;
  M.q=function(s){return box.querySelector(s);};
  var tabs=M.q('.ms2-tabs');
  D.MASTERS.forEach(function(d){var b=el('button');b.type='button';b.dataset.m=d.id;tabs.appendChild(b);});
  tabs.addEventListener('click',function(e){var b=e.target.closest('button');if(!b)return;M.id=b.dataset.m;Sound.sfx('select');showMaster();render(true);});
  M.q('[data-act="close"]').addEventListener('click',close);
  M.q('.ms2-body').addEventListener('click',function(e){
    var b=e.target.closest('[data-act]');if(!b||b.disabled)return;
    var a=b.dataset.act,ok=false;
    if(a==='hire')ok=g.hire(M.id);
    if(a==='order')ok=g.order(M.id,b.dataset.r);
    if(a==='learn')ok=g.learn(b.dataset.r);
    if(a==='tools')ok=g.buyTools(M.id);
    if(a==='slot')ok=g.buyQSlot();
    if(a==='coll')ok=g.collAdd(b.dataset.r);
    if(a==='cancel')ok=g.cancel(+b.dataset.i);
    if(ok){Sound.sfx('select');if(a==='hire')showMaster();}
    render(true);
  });
  initStage();
  render(true);
  M.timer=setInterval(function(){render(false);},500);
}

/* ════════ 3D ════════ */
function initStage(){
  var THREE=window.ACE_THREE,canvas=M.q('.wd2-canvas');
  if(!THREE||!window.Avatar){M.q('.wd2-stage').classList.add('no3d');return;}
  var r=new THREE.WebGLRenderer({canvas:canvas,antialias:true});
  r.setPixelRatio(Math.min(window.devicePixelRatio||1,1.75));
  r.outputColorSpace=THREE.SRGBColorSpace;r.toneMapping=THREE.ACESFilmicToneMapping;r.toneMappingExposure=1.1;
  r.shadowMap.enabled=true;
  var scene=new THREE.Scene();
  var bg=document.createElement('canvas');bg.width=4;bg.height=256;var c=bg.getContext('2d');
  var gr=c.createLinearGradient(0,0,0,256);gr.addColorStop(0,'#0c0806');gr.addColorStop(0.55,'#2a1c12');gr.addColorStop(1,'#0a0705');c.fillStyle=gr;c.fillRect(0,0,4,256);
  var bt=new THREE.CanvasTexture(bg);bt.colorSpace=THREE.SRGBColorSpace;scene.background=bt;
  scene.add(new THREE.HemisphereLight(0xffe8d0,0x302018,0.9));
  var key=new THREE.DirectionalLight(0xffd8a8,2.4);key.position.set(2.5,4,3);key.castShadow=true;key.shadow.mapSize.set(1024,1024);
  var sc=key.shadow.camera;sc.left=-1.5;sc.right=1.5;sc.top=2.5;sc.bottom=-0.5;sc.near=0.5;sc.far=12;key.shadow.bias=-0.0005;scene.add(key);
  var rim=new THREE.DirectionalLight(0xff9a50,1.4);rim.position.set(-3,2.5,-3);scene.add(rim);
  var plat=new THREE.Mesh(new THREE.CylinderGeometry(0.85,0.95,0.1,48),new THREE.MeshStandardMaterial({color:0x3a2616,metalness:0.1,roughness:0.7}));
  plat.position.y=-0.05;plat.receiveShadow=true;scene.add(plat);
  var ring=new THREE.Mesh(new THREE.TorusGeometry(0.9,0.012,8,96),new THREE.MeshBasicMaterial({color:0xffb040}));ring.rotation.x=Math.PI/2;ring.position.y=0.002;scene.add(ring);
  var cam=new THREE.PerspectiveCamera(28,1,0.05,50);
  M.st={THREE:THREE,r:r,scene:scene,cam:cam,rot:0.4,vel:0,last:performance.now(),avs:{}};
  var drag=null;
  canvas.addEventListener('pointerdown',function(e){drag={x:e.clientX};});
  canvas.addEventListener('pointermove',function(e){if(!drag)return;var dx=e.clientX-drag.x;drag.x=e.clientX;M.st.rot+=dx*0.01;M.st.vel=dx*0.01;});
  canvas.addEventListener('pointerup',function(){drag=null;});canvas.addEventListener('pointercancel',function(){drag=null;});
  function size(){var w=canvas.clientWidth||300,h=canvas.clientHeight||400;r.setSize(w,h,false);cam.aspect=w/h;cam.updateProjectionMatrix();}
  M.st.size=size;size();window.addEventListener('resize',size);
  Avatar.init(THREE).then(function(){return Avatar.loadExtraClips();}).then(function(){if(M&&M.alive)showMaster();},function(){if(M&&M.alive)showMaster();});
  function loop(now){
    if(!M||!M.alive)return;
    var st=M.st,dt=Math.min(0.05,(now-st.last)/1000);st.last=now;
    if(!drag){st.vel*=0.92;st.rot+=st.vel+dt*0.08;}
    cam.position.set(Math.sin(st.rot)*5.2,1.3,Math.cos(st.rot)*5.2);cam.lookAt(0,0.9,0);
    var A=st.cur;if(A)A.update(dt,'npc');
    if(canvas.clientWidth&&Math.abs(canvas.width-Math.round(canvas.clientWidth*r.getPixelRatio()))>2)size();
    r.render(scene,cam);
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
}
var WORK={herbalist:'Interact',carpenter:'PickUp_Table',smith:'Fixing_Kneeling',tanner:'Interact',jeweler:'Interact'};
function showMaster(){
  var st=M&&M.st;if(!st||!window.Tavern3D)return;
  var id=M.id,look=Tavern3D.masterLook(id);if(!look)return;
  for(var k in st.avs)if(st.avs[k].root)st.avs[k].root.visible=k===id;
  var A=st.avs[id];
  if(A&&A.root){st.cur=A;anim();return;}
  if(A&&A.loading)return;
  st.avs[id]={loading:true};
  Avatar.create(look,{res:'1k',forGame:false}).then(function(av){
    if(!M||!M.alive)return;
    st.avs[id]=av;st.scene.add(av.root);av.root.traverse(function(o){if(o.isMesh)o.castShadow=true;});
    av.root.visible=M.id===id;if(M.id===id){st.cur=av;anim();}
  },function(e){console.warn('[masters]',e);delete st.avs[id];});
}
function anim(){
  var A=M.st&&M.st.cur;if(!A)return;
  var m=window.acGame.master(M.id);
  var g=window.acGame,mine=g.queueOf(M.id).length;
  var a=!m.hired?'Idle_Loop':m.teach?'Idle_Talking_Loop':mine?WORK[M.id]:'Idle_Loop';
  if(A.curName!==a)A.play(a,0.3);
}

/* ════════ СПИСОК ════════ */
function render(full){
  if(!M)return;
  var g=window.acGame,S=g.S,id=M.id,d=D.MASTER_BY[id],m=g.master(id);
  M.q('.wd2-coins b').textContent=D.fmt(S.gold);
  [].forEach.call(M.q('.ms2-tabs').children,function(b){
    var mm=g.master(b.dataset.m);
    b.innerHTML=t('ms.'+b.dataset.m)+'<small>'+(mm.hired?t('ms.lvl',{n:mm.lvl}):t('ms.notHired'))+'</small>';
    b.classList.toggle('sel',b.dataset.m===id);b.classList.toggle('off',!mm.hired);
  });
  /* статус над подиумом */
  var stEl=M.q('.ms2-status'),stTxt='';
  if(m.hired){
    stTxt='<b>'+t('ms.'+id)+'</b> '+t('ms.lvl',{n:m.lvl})+'<div class="bar xp"><i style="width:'+Math.min(100,m.xp/D.mXpNeed(m.lvl)*100).toFixed(1)+'%"></i></div>';
    if(m.teach)stTxt+='<span class="tch">'+t('ms2.teaching',{r:UI.itemName(m.teach.r),t:UI.ft(m.teach.t)})+'</span>';
    else{var my=g.queueOf(id);if(my.length)stTxt+='<span>'+t('ms2.busy',{r:UI.orderName(my[0].r),t:UI.ft(my[0].t/g.mSpeed(id))})+'</span>';else stTxt+='<span>'+t('ms.idle')+'</span>';}
  }
  if(stEl._h!==stTxt){stEl._h=stTxt;stEl.innerHTML=stTxt;}
  anim();
  var body=M.q('.ms2-body'),h='';
  h+='<p class="note">'+t('ms.'+id+'.d')+'</p>';
  if(!m.hired){
    h+='<button type="button" class="btn pink big" data-act="hire"'+(S.gold<d.hire?' disabled':'')+'>'+t('ms.hire')+' '+COIN+D.fmt(d.hire)+'</button>';
    h+='<div class="lbl full">'+t('ms2.canMake')+'</div><div class="ms2-grid">'+D.GOODS.filter(function(x){return x.m===id;}).map(function(x){return card(x.id,'view');}).join('')+'</div>';
    return setBody(body,h);
  }
  /* общая очередь: вещи этого мастера ярко, чужие тускло */
  var act=g.activeSet();
  h+='<div class="lbl full">'+t('q2.title',{n:S.queue.length,m:S.qSlots})+'</div><div class="ms2-q">';
  for(var i=0;i<S.qSlots;i++){
    var o=S.queue[i];
    if(o)h+='<button type="button" class="ms2-slot full'+(o.m===id?'':' other')+'" data-act="cancel" data-i="'+i+'" title="'+t('q2.cancel')+'">'+UI.orderIcon(o.r,true)+(act[i]?'<i class="pr" style="height:'+((1-o.t/o.T)*100).toFixed(0)+'%"></i>':'')+'</button>';
    else h+='<span class="ms2-slot"></span>';
  }
  h+='</div>';
  if(m.teach)h+='<p class="tch">'+t('ms2.teachNote')+'</p>';
  /* что умеет */
  var specials=Object.keys(D.ORDERS).filter(function(r){return D.ORDERS[r].m===id;});
  h+='<div class="lbl full">'+t('ms2.make')+'</div><div class="ms2-grid">'+specials.map(function(r){return card(r,'special');}).join('')+
     m.known.map(function(r){return card(r,'make');}).join('')+'</div>';
  /* учитель */
  var rest=D.GOODS.filter(function(x){return x.m===id&&m.known.indexOf(x.id)<0;});
  if(rest.length){
    h+='<div class="lbl full">'+t('ms.teacher')+'</div><p class="note">'+t('ms2.teacherD')+'</p><div class="ms2-grid">'+rest.map(function(x){return card(x.id,'learn');}).join('')+'</div>';
  }
  /* коллекция: по одной вещи каждого рецепта мастера */
  var cl=g.collList(id),cn=g.collCount(id),cd=g.collDone(id);
  h+='<div class="lbl full">'+t('coll.title',{n:cn,m:cl.length})+'</div><p class="note">'+t(cd?'coll.doneI':'coll.info')+'</p><div class="coll">'+
    cl.map(function(r){var has=g.collHas(id,r),can=!has&&g.invCount(r)>0;
      return '<button type="button" class="coll-it'+(has?' has':'')+(can?' can':'')+'" data-act="coll" data-r="'+r+'"'+(can?'':' disabled')+' title="'+UI.itemName(r)+'">'+UI.orderIcon(r,true)+(can?'<i>+</i>':'')+'</button>';}).join('')+'</div>';
  /* улучшения мастера */
  var tc=g.toolsCost(id),sc=g.qSlotCost();
  h+='<div class="lbl full">'+t('ms2.upgrades')+'</div>'+
    '<div class="ms2-up"><div><b>'+t('ms.tools')+'</b> '+t('row.lvlMax',{n:m.tools,m:D.TOOLS_MAX})+'<small>'+t('ms.toolsI')+'</small></div>'+
      (tc?'<button type="button" class="btn sm" data-act="tools"'+(g.canPay(tc)?'':' disabled')+'>'+UI.costHtml(tc)+'</button>':'<span class="note">'+t('buy.done')+'</span>')+'</div>'+
    '<div class="ms2-up"><div><b>'+t('q2.slots')+'</b> '+t('row.lvlMax',{n:S.qSlots,m:D.QSLOTS_MAX})+'<small>'+t('q2.slotsI')+'</small></div>'+
      (sc?'<button type="button" class="btn sm" data-act="slot"'+(g.canPay(sc)?'':' disabled')+'>'+UI.costHtml(sc)+'</button>':'<span class="note">'+t('buy.done')+'</span>')+'</div>';
  setBody(body,h);
}
function setBody(body,h){if(body._h!==h){var sc=body.scrollTop;body._h=h;body.innerHTML=h;body.scrollTop=sc;}}
/* карточка изделия: картинка, имя, время, цена, ресурсы и кнопка */
function card(r,mode){
  var g=window.acGame,id=M.id,m=g.master(id),gd=D.GOOD_BY[r],sp=!!D.ORDERS[r];
  var name=UI.orderName(r),btn='',sub='',cls='ms2-card';
  if(mode==='special'){
    var c=g.orderCost(r);
    if(!c)return '<div class="'+cls+' dim">'+UI.orderIcon(r,true)+'<b>'+t('ord.'+r+'Max')+'</b></div>';
    var bl=g.orderBlock(id,r);
    sub=UI.ft(g.craftTime(id,r)/g.mSpeed(id));
    btn='<div class="cost">'+UI.costHtml(c)+'</div><button type="button" class="btn sm" data-act="order" data-r="'+r+'"'+(bl?' disabled':'')+'>'+(bl==='pending'?t('ms.pending'):t('ms2.do'))+'</button>';
  }else if(mode==='make'){
    var bl2=g.orderBlock(id,r);
    sub=UI.ft(g.craftTime(id,r)/g.mSpeed(id))+' · '+COIN+D.fmt(gd.price)+'<br>'+t('cr2.mastery',{n:Math.min(g.mastery(id,r),D.MASTERY_CAP),m:D.MASTERY_CAP});
    btn='<div class="cost">'+UI.costHtml(gd.cost)+'</div><button type="button" class="btn sm" data-act="order" data-r="'+r+'"'+(bl2?' disabled':'')+'>'+(bl2==='teaching'?t('ms2.studying'):bl2==='full'?t('ms.full'):t('ms2.do'))+'</button>';
  }else if(mode==='learn'){
    var ok=g.canLearn(r);cls+=ok?'':' dim';
    sub=m.lvl>=gd.lvl?COIN+D.fmt(gd.price):t('ms.needLvl',{n:gd.lvl});
    btn='<button type="button" class="btn sm pink" data-act="learn" data-r="'+r+'"'+(ok&&g.S.gold>=gd.teach?'':' disabled')+'>'+t('ms.learn')+' '+COIN+D.fmt(gd.teach)+'</button><small>'+UI.ft(D.teachTime(gd.lvl))+'</small>';
  }else{sub=gd.lvl>1?t('ms.needLvl',{n:gd.lvl}):COIN+D.fmt(gd.price);}
  var eff=gd&&gd.eff?UI.effText(r,0):'';
  return '<div class="'+cls+'">'+UI.orderIcon(r,true)+'<b>'+name+'</b><small>'+sub+'</small>'+(eff?'<em>'+eff+'</em>':'')+btn+'</div>';
}
function close(){
  if(!M)return;
  M.alive=false;clearInterval(M.timer);
  if(M.st){window.removeEventListener('resize',M.st.size);M.st.r.dispose();}
  M.box.remove();M=null;
  if(window.UI)UI.panel();
}
window.Masters={open:open,close:close,get isOpen(){return !!M;}};
})();
