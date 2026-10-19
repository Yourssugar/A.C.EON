/* Aceonium: книга коллекций (v18).
   Разворот: слева главы (мастера и маг), справа страница главы. Собранные вещи в цвете,
   несобранные тёмным силуэтом. v20: у каждой вещи 4 ячейки по качеству, точки показывают собранные.
   Book.open(mid,rid) */
(function(){
'use strict';
var D=window.AcData;
var t=function(k,v){return I18n.t(k,v);};
var B=null;
function chapters(){return D.MASTERS.map(function(d){return d.id;}).concat(['mage']);}
function mName(id){return id==='mage'?t('ms.mage'):t('ms.'+id);}

function open(mid,rid){
  if(B)close();
  var g=window.acGame;
  B={id:mid&&chapters().indexOf(mid)>=0?mid:chapters()[0],sel:rid&&D.GOOD_BY[rid]?rid:null};
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
    if(a==='coll'||a==='lock')UI.bookAct(a,b.dataset);
    if(a==='free'){g.setBookFree(b.dataset.r,+b.dataset.q,true);Sound.sfx('select');}
    if(a==='keep'){g.setBookFree(b.dataset.r,+b.dataset.q,false);Sound.sfx('select');}
    if(a==='master'&&window.Masters){close();Masters.open(b.dataset.m);return;}
    render();
  });
  render();
  B.timer=setInterval(render,600);
}
function dots(g,m,r){var h='<span class="bq-dots">';for(var q=0;q<4;q++)h+='<i class="q'+q+(g.collQ(m,r,q)?' on':'')+'"></i>';return h+'</span>';}
function render(){
  if(!B)return;
  var g=window.acGame,S=g.S,id=B.id,all=0,got=0;
  var ch='';
  chapters().forEach(function(m){
    var l=g.collList(m),n=g.collSlots(m);all+=l.length*4;got+=n;
    ch+='<button type="button" class="bk-c'+(m===id?' sel':'')+(g.collGold(m)?' gold':g.collDone(m)?' done':'')+'" data-act="ch" data-m="'+m+'"><span>'+mName(m)+'</span><b>'+n+' / '+l.length*4+'</b></button>';
  });
  set(B.box.querySelector('.bk-ch'),ch);
  set(B.box.querySelector('.bk-total'),t('bk.total',{n:got,m:all}));
  /* страница главы */
  var list=g.collList(id),pages=g.collCount(id),slots=g.collSlots(id),done=g.collDone(id),gold=g.collGold(id);
  var h='<div class="bk-h"><b>'+mName(id)+UI.hb('book')+'</b><span>'+t('bk.pages',{n:pages,m:list.length})+' · '+t('bk.slots',{n:slots,m:list.length*4})+'</span></div>'+
    '<div class="bk-bar"><i style="width:'+(slots/(list.length*4)*100).toFixed(1)+'%"></i></div>'+
    '<p class="bk-rw'+(done?' ok':'')+'">'+t('bk.rwPages')+'</p><p class="bk-rw'+(gold?' ok':'')+'">'+t('bk.rwGold')+'</p><div class="bk-grid">';
  list.forEach(function(r){
    var has=g.collHas(id,r),inv=g.invCount(r),can=false;
    for(var q=0;q<4;q++)if(!g.collQ(id,r,q)&&S.inv[r+':'+q]>0)can=true;
    var known=g.master(id).known.indexOf(r)>=0;
    h+='<button type="button" class="bk-it'+(has?' has':'')+(can?' can':'')+(B.sel===r?' sel':'')+'" data-act="sel" data-r="'+r+'">'+dots(g,id,r)+
      UI.itemIcon(r,0,true,has?'':'sil')+'<span>'+(has||known||inv?UI.itemName(r):'???')+'</span>'+(can?'<i class="bk-plus">+</i>':'')+'</button>';
  });
  h+='</div>';
  /* выбранная вещь */
  var r=B.sel||list[0],gd=D.GOOD_BY[r];
  if(gd){
    var has2=g.collHas(id,r),inv2=g.invCount(r),known2=g.master(id).known.indexOf(r)>=0;
    h+='<div class="bk-sel"><div class="bk-sel-h">'+UI.itemIcon(r,0,true,has2?'':'sil')+'<div><b>'+(has2||known2||inv2?UI.itemName(r):'???')+'</b>'+
      (gd.eff?'<small>'+UI.effText(r,0)+'</small>':'')+
      (inv2||has2?'':'<p>'+(known2?t('bk.makeIt',{m:mName(id)}):id==='mage'?t('bk.mageLvl',{n:gd.lvl}):t('bk.learnIt',{m:mName(id),n:gd.lvl}))+'</p>')+'</div></div>'+
      UI.bookRow(r)+'<ul class="bk-bon">';
    ['bk.b1','bk.b2','bk.b3'].forEach(function(k,i){var q=i+1;h+='<li class="q'+q+(g.collQ(id,r,q)?' on':'')+'">'+t(k)+'</li>';});
    h+='</ul>';
    /* копии, которые держатся для книги */
    for(var q=1;q<4;q++){
      var n=S.inv[r+':'+q]||0;if(!n||g.collQ(id,r,q))continue;
      var freed=S.bookFree&&S.bookFree[r+':'+q];
      h+='<div class="bk-keep q'+q+'"><span>'+t(freed?'bk.freed':'bk.kept',{q:t('q.'+q)})+'</span><button type="button" class="btn sm ghost" data-act="'+(freed?'keep':'free')+'" data-r="'+r+'" data-q="'+q+'">'+t(freed?'bk.keepB':'bk.freeB')+'</button></div>';
    }
    h+='<div class="btn-row left">'+UI.lockBtn(r)+'<button type="button" class="btn sm" data-act="master" data-m="'+id+'">'+t('cr3.openMaster',{m:mName(id)})+'</button></div></div>';
  }
  set(B.box.querySelector('.bk-page'),h);
}
function set(el,h){if(el&&el._h!==h){el._h=h;el.innerHTML=h;}}
function close(){if(!B)return;clearInterval(B.timer);B.box.remove();B=null;if(window.UI)UI.panel();}
window.Book={open:open,close:close,get isOpen(){return !!B;}};
})();
