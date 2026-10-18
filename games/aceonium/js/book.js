/* Aceonium: книга коллекций (v18).
   Разворот: слева главы (мастера и маг), справа страница главы. Собранные вещи в цвете,
   несобранные тёмным силуэтом; если вещь есть на складе, её можно вложить в книгу.
   Book.open(mid) */
(function(){
'use strict';
var D=window.AcData;
var t=function(k,v){return I18n.t(k,v);};
var B=null;
function chapters(){return D.MASTERS.map(function(d){return d.id;}).concat(['mage']);}
function mName(id){return id==='mage'?t('ms.mage'):t('ms.'+id);}

function open(mid){
  if(B)close();
  var g=window.acGame;
  B={id:mid&&chapters().indexOf(mid)>=0?mid:chapters()[0],sel:null};
  var box=document.createElement('div');box.className='bk-wrap';
  box.innerHTML='<div class="bk"><div class="bk-l"><div class="bk-cover">'+UI.spr('o_book','bk-ico')+'<b>'+t('bk.title')+'</b><span class="bk-total"></span></div><nav class="bk-ch"></nav></div>'+
    '<div class="bk-r"><div class="bk-page"></div></div><button type="button" class="bk-x" data-act="close" aria-label="close"></button></div>';
  document.body.appendChild(box);B.box=box;
  box.addEventListener('click',function(e){
    if(e.target===box){close();return;}
    var b=e.target.closest('[data-act]');if(!b||b.disabled)return;
    var a=b.dataset.act;
    if(a==='close'){close();return;}
    if(a==='ch'){B.id=b.dataset.m;B.sel=null;Sound.sfx('select');}
    if(a==='sel'){B.sel=b.dataset.r;}
    if(a==='add'&&g.collAdd(b.dataset.r))Sound.sfx('capture');
    if(a==='master'&&window.Masters){close();Masters.open(b.dataset.m);return;}
    render();
  });
  render();
  B.timer=setInterval(render,600);
}
function render(){
  if(!B)return;
  var g=window.acGame,id=B.id,all=0,got=0;
  var ch='';
  chapters().forEach(function(m){
    var l=g.collList(m),n=g.collCount(m);all+=l.length;got+=n;
    ch+='<button type="button" class="bk-c'+(m===id?' sel':'')+(n===l.length?' done':'')+'" data-act="ch" data-m="'+m+'"><span>'+mName(m)+'</span><b>'+n+' / '+l.length+'</b></button>';
  });
  set(B.box.querySelector('.bk-ch'),ch);
  set(B.box.querySelector('.bk-total'),t('bk.total',{n:got,m:all}));
  /* страница главы */
  var list=g.collList(id),done=g.collDone(id),n=g.collCount(id);
  var h='<div class="bk-h"><b>'+mName(id)+'</b><span>'+n+' / '+list.length+'</span></div>'+
    '<div class="bk-bar"><i style="width:'+(n/list.length*100).toFixed(1)+'%"></i></div>'+
    '<p class="bk-rw'+(done?' ok':'')+'">'+t(done?'bk.rewardOn':'bk.reward')+'</p><div class="bk-grid">';
  list.forEach(function(r){
    var has=g.collHas(id,r),inv=g.invCount(r),can=!has&&inv>0,gd=D.GOOD_BY[r];
    var known=g.master(id).known.indexOf(r)>=0;
    h+='<button type="button" class="bk-it'+(has?' has':'')+(can?' can':'')+(B.sel===r?' sel':'')+'" data-act="sel" data-r="'+r+'">'+
      UI.itemIcon(r,0,true,has?'':'sil')+'<span>'+(has||known||inv?UI.itemName(r):'???')+'</span>'+(can?'<i class="bk-plus">+</i>':'')+'</button>';
  });
  h+='</div>';
  /* выбранная вещь */
  var r=B.sel||list[0],gd=D.GOOD_BY[r];
  if(gd){
    var has2=g.collHas(id,r),inv2=g.invCount(r),known2=g.master(id).known.indexOf(r)>=0;
    h+='<div class="bk-sel">'+UI.itemIcon(r,0,true,has2?'':'sil')+'<div><b>'+(has2||known2||inv2?UI.itemName(r):'???')+'</b>'+
      (gd.eff?'<small>'+UI.effText(r,0)+'</small>':'')+
      '<p>'+(has2?t('bk.inBook'):inv2?t('bk.canAdd',{n:inv2}):known2?t('bk.makeIt',{m:mName(id)}):id==='mage'?t('bk.mageLvl',{n:gd.lvl}):t('bk.learnIt',{m:mName(id),n:gd.lvl}))+'</p>'+
      '<div class="btn-row left">'+(!has2&&inv2?'<button type="button" class="btn sm pink" data-act="add" data-r="'+r+'">'+t('bk.add')+'</button>':'')+
      '<button type="button" class="btn sm" data-act="master" data-m="'+id+'">'+t('cr3.openMaster',{m:mName(id)})+'</button></div></div></div>';
  }
  set(B.box.querySelector('.bk-page'),h);
}
function set(el,h){if(el&&el._h!==h){el._h=h;el.innerHTML=h;}}
function close(){if(!B)return;clearInterval(B.timer);B.box.remove();B=null;if(window.UI)UI.panel();}
window.Book={open:open,close:close,get isOpen(){return !!B;}};
})();
