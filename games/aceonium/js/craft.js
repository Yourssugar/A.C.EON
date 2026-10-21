/* Aceonium: лента СОЗДАТЬ (v24), как в Shop Titans.
   Снизу экрана карточки вещей выбранного мастера, внизу вкладки: закреплённые и недавние, потом мастера.
   Тап по карточке ставит вещь в очередь. Сверху ресурсы на складе и очередь (тап по слоту отменяет заказ).
   Craft.open(mid) */
(function(){
'use strict';
var D=window.AcData;
var t=function(k,v){return I18n.t(k,v);};
var TABS=['fav','herbalist','carpenter','smith','tanner','jeweler','mage'];
var TAB_ICON={fav:'u_star',herbalist:'p_heal',carpenter:'c_bow',smith:'s_sword',tanner:'t_cloak',jeweler:'j_ring',mage:'sc_spark'};
var MAIN_RES=['wood','iron','herb','hide','coal','steel','silver','gems','ironwood','meteor','stonehide','ecto'];
var C=null;

function mName(m){return m==='mage'?t('ms.mage'):t('ms.'+m);}
function master(r){var gd=D.GOOD_BY[r];return gd?gd.m:D.ORDERS[r]?D.ORDERS[r].m:null;}

function open(tab){
  var g=window.acGame;
  if(C){if(tab&&TABS.indexOf(tab)>=0){C.tab=tab;render(true);}return;}
  if(!tab||TABS.indexOf(tab)<0)tab=(g.S.pinned&&g.S.pinned.length)||(g.S.recent&&g.S.recent.length)?'fav':'herbalist';
  C={tab:tab,flash:null};
  var box=document.createElement('div');box.className='crf';
  box.innerHTML='<div class="crf-top"><div class="crf-h"><b class="crf-t"></b><span class="crf-q"></span></div><div class="crf-res"></div>'+
    '<button type="button" class="win-x crf-x" data-act="close" aria-label="close"></button></div>'+
    '<div class="crf-cards"></div><nav class="crf-tabs"></nav>';
  document.body.appendChild(box);C.box=box;
  document.body.classList.add('crf-open');
  box.addEventListener('click',function(e){
    var b=e.target.closest('[data-act]');if(!b||b.disabled)return;
    var a=b.dataset.act,g2=window.acGame,r=b.dataset.r;
    e.stopPropagation();
    if(a==='close'){close();Sound.sfx('select');return;}
    if(a==='tab'){C.tab=b.dataset.t;Sound.sfx('select');render(true);return;}
    if(a==='master'&&window.Masters){Masters.open(b.dataset.m);return;}
    if(a==='pin'){g2.togglePin(r);}
    else if(a==='lock'){g2.toggleLock(r);}
    else if(a==='cancel'){g2.cancel(+b.dataset.i);}
    else if(a==='hire'){if(g2.hire(b.dataset.m))UI.toast(t('ms.hired',{m:t('ms.'+b.dataset.m)}));}
    else if(a==='learn'){if(g2.learn(r))UI.toast(t('cr4.learning',{r:UI.itemName(r)}));}
    else if(a==='order'){
      var mid=master(r);
      if(g2.order(mid,r)){C.flash=r;C.flashT=Date.now();Sound.sfx('capture');}
      else{var bl=g2.orderBlock(mid,r);if(bl)UI.toast(t('cr2.block.'+bl));Sound.sfx('select');}
    }
    render();
  });
  document.addEventListener('keydown',onKey);
  render(true);
  C.timer=setInterval(function(){render();},500);
}
function onKey(e){if(e.key==='Escape'&&C&&!document.querySelector('.ms2,.bk-wrap,.hp-wrap'))close();}
function close(){
  if(!C)return;clearInterval(C.timer);document.removeEventListener('keydown',onKey);
  C.box.remove();C=null;document.body.classList.remove('crf-open');
}
function set(el,h,keepScroll){if(el._h===h)return;var sl=el.scrollLeft;el._h=h;el.innerHTML=h;if(keepScroll)el.scrollLeft=sl;}

/* карточка вещи */
function card(r){
  var g=window.acGame,S=g.S,gd=D.GOOD_BY[r];if(!gd)return '';
  var mid=gd.m,m=g.master(mid),known=m.known.indexOf(r)>=0,bl=g.orderBlock(mid,r),inv=g.invCount(r);
  var cls='crf-c'+(known&&m.hired?'':' off')+(C.flash===r&&Date.now()-C.flashT<500?' flash':'')+(known&&!bl?' can':'');
  var h='<div class="'+cls+'"><button type="button" class="crf-main" data-act="'+(known&&m.hired?'order':'none')+'" data-r="'+r+'">'+
    '<i class="crf-lv" title="'+t('tier.title')+'">'+gd.tier+'</i>'+(inv?'<i class="crf-inv">x'+inv+'</i>':'')+
    '<span class="crf-ic">'+UI.itemIcon(r,0,true)+'</span>'+
    '<b class="crf-n">'+UI.itemName(r)+'</b>';
  var cost='';for(var k in gd.cost){var have=g.have(k),need=gd.cost[k];cost+='<span class="'+(have<need?'bad':'')+'">'+UI.resIcon(k)+need+'</span>';}
  h+='<span class="crf-cost">'+cost+'</span>';
  if(gd.eff)h+='<em class="crf-eff">'+UI.effText(r,0)+'</em>';
  h+='</button><div class="crf-foot">';
  if(!m.hired){
    var hc=D.MASTER_BY[mid].hire;
    h+='<button type="button" class="btn sm pink" data-act="hire" data-m="'+mid+'"'+(S.gold<hc?' disabled':'')+'>'+t('ms.hire')+' '+UI.costHtml({gold:hc})+'</button>';
  }else if(known){
    var n=Math.min(g.mastery(mid,r),D.MASTERY_CAP);
    h+='<div class="crf-ms"><small>'+UI.ft(g.craftTime(mid,r)/g.mSpeed(mid))+' · '+UI.costHtml({gold:Math.round(gd.price*g.itemPriceMult(r))})+'</small>'+
      '<div class="bar"><i style="width:'+(n/D.MASTERY_CAP*100).toFixed(1)+'%"></i></div><small>'+n+'/'+D.MASTERY_CAP+'</small></div>';
  }else if(mid==='mage'){
    h+='<small class="crf-need">'+t('cr2.needMage',{n:gd.lvl})+'</small>';
  }else if(m.lvl>=gd.lvl){
    var ok=g.canLearn(r)&&S.gold>=gd.teach;
    h+='<button type="button" class="btn sm" data-act="learn" data-r="'+r+'"'+(ok?'':' disabled')+'>'+t('ms.learn')+' '+UI.costHtml({gold:gd.teach})+'</button>';
  }else h+='<small class="crf-need">'+t('ms.needLvl',{n:gd.lvl})+'</small>';
  h+='</div>';
  /* закрепить, замок, точки книги */
  h+='<button type="button" class="crf-pin'+(g.isPinned(r)?' on':'')+'" data-act="pin" data-r="'+r+'" title="'+t(g.isPinned(r)?'cr3.unpin':'cr3.pin')+'"></button>'+
    '<button type="button" class="crf-lock'+(g.isLocked(r)?' on':'')+'" data-act="lock" data-r="'+r+'" title="'+t('lk.title')+'">'+UI.LOCK_SVG+'</button>';
  var dots='<span class="bq-dots crf-dots">';for(var q=0;q<4;q++)dots+='<i class="q'+q+(g.collQ(mid,r,q)?' on':'')+'"></i>';
  return h+dots+'</span></div>';
}
function render(force){
  if(!C)return;
  var g=window.acGame,S=g.S,tab=C.tab;
  /* шапка: мастер или избранное, очередь */
  var title=tab==='fav'?t('cr4.fav'):mName(tab);
  var m=tab!=='fav'?g.master(tab):null;
  var th='<b>'+title+'</b>'+(m&&m.hired?'<span class="crf-ml">'+t('ms.lvl',{n:m.lvl})+'</span>':'')+
    (tab!=='fav'?'<button type="button" class="btn sm" data-act="master" data-m="'+tab+'">'+t('cr4.toMaster')+'</button>':'');
  set(C.box.querySelector('.crf-t'),th);
  var act=g.activeSet(),qh='';
  for(var i=0;i<S.qSlots;i++){
    var o=S.queue[i];
    qh+=o?'<button type="button" class="crf-qs'+(act[i]?' on':'')+(o.hold?' hold':'')+'" data-act="cancel" data-i="'+i+'" title="'+(o.hold?t('stu.holdT'):t('q2.cancel'))+'">'+UI.orderIcon(o.r)+(act[i]&&o.T?'<i style="height:'+((1-o.t/o.T)*100).toFixed(0)+'%"></i>':'')+'</button>':'<span class="crf-qs"></span>';
  }
  set(C.box.querySelector('.crf-q'),qh);
  /* ресурсы: что нужно рецептам на экране, плюс то, что есть на складе */
  var list;
  if(tab==='fav'){var P=S.pinned||[];list=P.concat((S.recent||[]).filter(function(r){return P.indexOf(r)<0&&D.GOOD_BY[r];}));}
  else list=D.GOODS.filter(function(x){return x.m===tab;}).map(function(x){return x.id;});
  var need={};list.forEach(function(r){var gd=D.GOOD_BY[r];if(gd)for(var k in gd.cost)need[k]=1;});
  var rh='';MAIN_RES.forEach(function(k){if(!need[k])return;rh+='<span class="crf-r">'+UI.resIcon(k)+'<b>'+D.fmt(g.have(k))+'</b></span>';});
  set(C.box.querySelector('.crf-res'),rh);
  /* карточки */
  var ch=list.length?list.map(card).join(''):'<p class="crf-empty">'+t('cr4.favEmpty')+'</p>';
  if(tab!=='fav'&&m&&m.teach)ch='<div class="crf-teach">'+t('ms2.teaching',{r:UI.itemName(m.teach.r),t:UI.ft(m.teach.t)})+'</div>'+ch;
  var cards=C.box.querySelector('.crf-cards');
  if(force){cards._h=null;}
  set(cards,ch,!force);
  if(force)cards.scrollLeft=0;
  /* вкладки */
  var tb='';
  TABS.forEach(function(k){
    var mm=k!=='fav'?g.master(k):null,busy=k!=='fav'&&g.queueOf(k).length;
    tb+='<button type="button" class="crf-tb'+(k===tab?' sel':'')+(mm&&!mm.hired?' off':'')+'" data-act="tab" data-t="'+k+'" title="'+(k==='fav'?t('cr4.fav'):mName(k))+'">'+UI.spr(TAB_ICON[k],'crf-ti')+(busy?'<i class="crf-busy"></i>':'')+'</button>';
  });
  set(C.box.querySelector('.crf-tabs'),tb);
}

window.Craft={open:open,close:close,get isOpen(){return !!C;}};
})();
