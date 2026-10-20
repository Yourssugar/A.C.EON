/* Aceonium: режим дизайна таверны (v25), как в Shop Titans.
   Камера над залом, пол в клетку. Нажал на предмет и тащи: зелёные клетки - можно, красные - нельзя.
   Сдвиги копятся в черновике и применяются кнопкой ГОТОВО; НАЗАД их отменяет.
   Покупка, улучшение и уборка сразу меняют игру, поэтому перед ними черновик применяется.
   Design.open(id) */
(function(){
'use strict';
var D=window.AcData,HL=window.AcHall;
var t=function(k,v){return I18n.t(k,v);};
var Z=null;

function g(){return window.acGame;}
function hall(){return g().buildLvl('hall');}
/* мебель с учётом черновика */
function draft(){
  return g().S.furn.map(function(it){var m=Z.moves[it.id];if(!m)return it;var c={};for(var k in it)c[k]=it[k];c.x=m.x;c.z=m.z;c.r=m.r;return c;});
}
function selItem(L){if(Z.sel===null||Z.sel==='counter')return null;L=L||draft();for(var i=0;i<L.length;i++)if(L[i].id===Z.sel&&!L[i].st&&HL.zone(L[i])===Z.zone)return L[i];return null;}
/* v27: две сетки: зал таверны и склад (своя сцена далеко в стороне) */
function off(){return Z.zone==='store'?HL.STO:{x:0,z:0};}
function loc(pt){var o=off();return pt?{x:pt.x-o.x,z:pt.z-o.z}:null;}
function checkNow(L){return Z.zone==='store'?HL.checkStore(L,g().S.storeLvl):HL.check(L,hall());}
function name(tp){return t('fu.'+tp);}

function open(sel){
  if(Z){if(sel!==undefined){Z.sel=sel;render();}return;}
  if(!window.Tavern3D||!Tavern3D.ready||!Tavern3D.built){UI.toast(t('fu.wait'));return;}
  var it0=sel!==undefined&&g().furnById(sel),zone=it0?(HL.zone(it0)==='store'?'store':'hall'):(UI.screenNow&&UI.screenNow()==='store'?'store':'hall');
  var want=zone==='store'?'store':'tavern';
  if(UI.screenNow&&UI.screenNow()!==want&&UI.goScreen)UI.goScreen(want);
  if(UI.closeWin)UI.closeWin();
  if(window.Craft&&Craft.isOpen)Craft.close();
  Z={moves:{},sel:sel===undefined?null:sel,drag:null,shop:false,tab:zone==='store'?'chest':'table',zone:zone};
  var box=document.createElement('div');box.className='dsg';
  box.innerHTML='<div class="dsg-top"><b class="dsg-t">'+t('fu.title')+'</b><span class="dsg-stat"></span>'+
    '<button type="button" class="hlp" data-help="design" aria-label="?">?</button></div>'+
    '<div class="dsg-info"></div><div class="dsg-shop hidden"><nav class="dsg-tabs"></nav><div class="dsg-cards"></div></div>'+
    '<div class="dsg-bar"><button type="button" class="btn ghost" data-act="back"></button>'+
    '<div class="dsg-mid"></div>'+
    '<button type="button" class="btn" data-act="shop"></button>'+
    '<button type="button" class="btn green" data-act="ok"></button></div>';
  document.body.appendChild(box);Z.box=box;
  document.body.classList.add('dsg-open');
  box.addEventListener('click',onClick);
  document.addEventListener('keydown',onKey);
  Tavern3D.setDesign(true,{down:onDown,move:onMove,up:onUp,tap:onTap},Z.zone);
  Z.timer=setInterval(function(){if(!Z.drag)render();},500);
  g().on('furn',onGame);
  render();
}
function onGame(){if(Z)render();}
function onKey(e){if(!Z||window.Help&&Help.isOpen)return;if(e.key==='Escape'){if(Z.shop){Z.shop=false;render();}else close(false);}else if((e.key==='r'||e.key==='R'||e.key==='к'||e.key==='К')&&selItem())rotate();}
function close(apply){
  if(!Z)return;
  if(apply&&Object.keys(Z.moves).length&&!g().furnApply(Z.moves)){UI.toast(t('fu.fixFirst'));return;}
  clearInterval(Z.timer);document.removeEventListener('keydown',onKey);
  if(g().off)g().off('furn',onGame);
  Z.box.remove();Z=null;document.body.classList.remove('dsg-open');
  Tavern3D.designMark(null);Tavern3D.setDesign(false);
}
/* применить черновик перед покупкой, улучшением, уборкой */
function commit(){
  if(!Object.keys(Z.moves).length)return true;
  if(!g().furnApply(Z.moves)){UI.toast(t('fu.fixFirst'));return false;}
  Z.moves={};return true;
}

/* ── ввод с канваса ── */
function hit(pt){
  pt=loc(pt);
  var cx=Math.floor(pt.x),cz=Math.floor(pt.z),L=draft(),best=null,pri={solid:3,ceil:2,floor:1};
  L.forEach(function(it){
    if(it.st||HL.zone(it)!==Z.zone)return;
    var inside=HL.cells(it).some(function(c){return c[0]===cx&&c[1]===cz;});
    if(inside&&(!best||pri[HL.layer(it)]>pri[HL.layer(best)]))best=it;
  });
  if(best)return best;
  if(Z.zone==='hall'&&cx>=4&&cx<=7&&cz>=-4&&cz<=-3)return 'counter';
  return null;
}
function onDown(pt){
  var h=hit(pt);
  if(h==='counter'){Z.sel='counter';render();return false;}
  if(!h)return false;
  Z.sel=h.id;var c=HL.center(h),lp=loc(pt);Z.drag={id:h.id,ox:c.x-lp.x,oz:c.z-lp.z};
  Sound.sfx('select');render();
  return true;
}
function onMove(pt){
  if(!Z.drag)return;
  var it=selItem();if(!it)return;
  pt=loc(pt);
  var f=HL.fp(it),x=Math.round(pt.x+Z.drag.ox-f[0]/2),z=Math.round(pt.z+Z.drag.oz-f[1]/2);
  if(Z.zone==='store'){x=Math.max(-1,Math.min(18-f[0],x));z=Math.max(-1,Math.min(7-f[1],z));}
  else{x=Math.max(-3,Math.min(9-f[0],x));z=Math.max(-6,Math.min(10-f[1],z));}
  if(x===it.x&&z===it.z)return;
  Z.moves[it.id]={x:x,z:z,r:it.r||0};
  renderScene();
}
function onUp(){Z.drag=null;render();}
function onTap(pt){var h=pt&&hit(pt);Z.sel=h==='counter'?'counter':h?h.id:null;render();}
function rotate(){
  var it=selItem();if(!it)return;
  var c=HL.center(it),r=((it.r||0)+1)%4,n={t:it.t,lv:it.lv,r:r,x:0,z:0},f=HL.fp(n);
  Z.moves[it.id]={x:Math.round(c.x-f[0]/2),z:Math.round(c.z-f[1]/2),r:r};
  Sound.sfx('select');render();
}

/* ── кнопки ── */
var WHY={zone:'fu.why.zone',overlap:'fu.why.overlap',block:'fu.why.block',seat:'fu.why.seat',other:'fu.why.other'};
var BLOCK={hall:'fu.bl.hall',seats:'fu.bl.seats',max:'fu.bl.max',busy:'fu.bl.busy',cost:'fu.bl.cost',space:'fu.bl.space',last:'fu.bl.last'};
function onClick(e){
  var b=e.target.closest('[data-act]');if(!b||b.disabled)return;
  e.stopPropagation();
  var a=b.dataset.act,G=g(),res;
  if(a==='back'){if(Z.shop){Z.shop=false;render();}else close(false);Sound.sfx('select');return;}
  if(a==='ok'){close(true);Sound.sfx('capture');return;}
  if(a==='shop'){Z.shop=!Z.shop;Sound.sfx('select');render();return;}
  if(a==='tab'){Z.tab=b.dataset.t;Sound.sfx('select');renderShop(true);return;}
  if(a==='rot'){rotate();return;}
  if(a==='desel'){Z.sel=null;render();return;}
  if(!commit()){render();return;}
  if(a==='buy'){
    res=G.furnBuy(b.dataset.t);
    if(res&&typeof res==='object'){Z.sel=res.id;Z.shop=false;Sound.sfx('capture');UI.toast(t(res.q?'fu.bought.crew':'fu.bought',{n:name(res.t)}));}
    else{UI.toast(t(BLOCK[res]||'fu.bl.cost'));Sound.sfx('select');}
  }else if(a==='place'){
    var it0=G.furnById(+b.dataset.id);res=G.furnPlace(it0);
    if(res===true){Z.sel=it0.id;Z.shop=false;Sound.sfx('capture');}else UI.toast(t(BLOCK[res]||'fu.bl.space'));
  }else if(a==='up'){
    if(Z.sel==='counter'){if(G.counterUp()){Sound.sfx('capture');UI.toast(t('fu.counterUp',{n:G.S.counter}));}}
    else{var it=G.furnById(Z.sel);res=G.furnUp(it);if(res&&typeof res==='object'){Sound.sfx('capture');}else UI.toast(t(BLOCK[res]||'fu.bl.cost'));}
  }else if(a==='store'){
    res=G.furnStore(G.furnById(Z.sel));if(res===true){Z.sel=null;Sound.sfx('select');}else UI.toast(t(BLOCK[res]||'fu.bl.busy'));
  }
  render();
}

/* ── отрисовка ── */
function render(){if(!Z)return;renderScene();renderInfo();renderBar();renderShop();}
function renderScene(){
  var L=draft(),it=selItem(L),chk=checkNow(L);
  Z.chk=chk;
  Tavern3D.furnShow(L);
  Tavern3D.designMark(it,it?!(chk.bad[it.id]||chk.blocked):true);
  renderBar();renderInfo();
}
function costHtml(c){return UI.costHtml(c);}
function bonusText(tp,lv){
  var d=D.FURN[tp];
  if(d.seats)return t('fu.seatsN',{n:d.seats[lv-1]});
  if(d.cat==='chest')return t('fu.chestN',{n:d.slots[lv-1]});
  if(d.shelf)return t('fu.slotsN',{n:d.slots[lv-1],c:t('sh.cat.'+d.shelf)});
  return t('fu.ptsN',{n:d.pts[lv-1]});
}
function renderInfo(){
  if(!Z)return;
  var G=g(),pts=G.decorPts(),st=Z.box.querySelector('.dsg-stat');
  var sh=Z.zone==='store'?t('fu.statStore',{a:G.furnOwn('schest'),b:D.CHEST_MAX,u:G.chestUsed(),c:G.chestCap(),r:D.fmt(G.storeCap())}):
    t('fu.stat',{a:G.seatCount(),b:G.seatMax(),p:pts,pr:Math.round((D.decorPrice(pts)-1)*100),fl:Math.round(D.decorFlow(pts)*100)});
  if(st._h!==sh){st._h=sh;st.innerHTML=sh;}
  var box=Z.box.querySelector('.dsg-info'),h='';
  if(Z.sel==='counter'){
    var cl=G.S.counter||1,cc=G.counterCost();
    h='<div class="dsg-card"><b>'+t('fu.counter')+'</b><span class="dsg-lv">'+t('ms.lvl',{n:cl})+'</span>'+
      '<p>'+t('fu.counterRep',{n:D.counterRep(cl)})+(cc?' · <em>'+t('fu.next')+' '+t('fu.counterRep',{n:D.counterRep(cl+1)})+'</em>':'')+'</p></div>';
  }else{
    var it=selItem();
    if(it){
      var d=D.FURN[it.t],why=Z.chk&&(Z.chk.bad[it.id]||(Z.chk.blocked?'block':''));
      h='<div class="dsg-card'+(why?' bad':'')+'"><b>'+name(it.t)+'</b><span class="dsg-lv">'+t('ms.lvl',{n:it.lv})+'</span>'+
        '<p>'+bonusText(it.t,it.lv)+(it.lv<D.FURN_LV?' · <em>'+t('fu.next')+' '+bonusText(it.t,it.lv+1)+'</em>':'')+'</p>';
      if(d.shelf)h+='<p class="dsg-note">'+t('fu.shelfUsed',{c:t('sh.cat.'+d.shelf),a:G.shelfUsed(d.shelf),b:G.shelfCap(d.shelf)})+'</p>';
      if(it.q)h+='<p class="dsg-note">'+t('fu.waitCrew')+'</p>';
      else if(it.bt)h+='<p class="dsg-note">'+t('fu.building',{t:UI.ft(it.bt.t)})+'</p><div class="bar"><i style="width:'+((1-it.bt.t/it.bt.T)*100).toFixed(1)+'%"></i></div>';
      if(why)h+='<p class="dsg-why">'+t(WHY[why]||WHY.other)+'</p>';
      h+='</div>';
    }else if(Z.chk&&!Z.chk.ok)h='<div class="dsg-card bad"><p class="dsg-why">'+t(Z.chk.blocked?'fu.why.block':'fu.why.any')+'</p></div>';
    else h='<div class="dsg-hint">'+t(Z.zone==='store'?'fu.hintStore':'fu.hint')+'</div>';
  }
  if(box._h!==h){box._h=h;box.innerHTML=h;}
}
function renderBar(){
  if(!Z)return;
  var G=g(),B=Z.box.querySelector('.dsg-bar'),mid=B.querySelector('.dsg-mid'),h='';
  B.querySelector('[data-act=back]').textContent=t(Z.shop?'fu.close':'fu.back');
  B.querySelector('[data-act=shop]').textContent=t('fu.shop');
  B.querySelector('[data-act=shop]').classList.toggle('sel',Z.shop);
  var ok=B.querySelector('[data-act=ok]');ok.textContent=t('fu.ok');ok.disabled=!!(Z.chk&&!Z.chk.ok);
  if(Z.sel==='counter'){
    var cc=G.counterCost();
    h=cc?'<button type="button" class="btn pink" data-act="up"'+(G.canPay(cc)?'':' disabled')+'>'+t('fu.up')+' '+costHtml(cc)+'</button>':'<span class="dsg-max">'+t('fu.bl.max')+'</span>';
  }else{
    var it=selItem();
    if(it){
      var uc=G.furnUpCost(G.furnById(it.id)),ub=G.furnUpBlock(G.furnById(it.id));
      h='<button type="button" class="btn" data-act="rot" title="R">'+t('fu.rot')+'</button>';
      if(uc)h+='<button type="button" class="btn pink" data-act="up"'+(ub&&ub!=='space'?' disabled':'')+' title="'+(ub?t(BLOCK[ub]||''):'')+'">'+t('fu.up')+' '+costHtml(uc)+'</button>';
      else h+='<span class="dsg-max">'+t('fu.bl.max')+'</span>';
      h+='<button type="button" class="btn red" data-act="store"'+(it.bt||it.q?' disabled':'')+'>'+t('fu.store')+'</button>';
    }
  }
  if(mid._h!==h){mid._h=h;mid.innerHTML=h;}
}
function renderShop(force){
  if(!Z)return;
  var sh=Z.box.querySelector('.dsg-shop');sh.classList.toggle('hidden',!Z.shop);
  Z.box.classList.toggle('shop',Z.shop);
  if(!Z.shop)return;
  var G=g(),stored=G.S.furn.filter(function(x){return x.st&&(HL.zone(x)==='store')===(Z.zone==='store');});
  var tabs=Z.zone==='store'?[['chest','fu.tab.chest']]:[['table','fu.tab.table'],['shelf','fu.tab.shelf'],['decor','fu.tab.decor']];if(stored.length||Z.tab==='store')tabs.push(['store','fu.tab.store']);
  var th='';tabs.forEach(function(k){th+='<button type="button" class="dsg-tb'+(Z.tab===k[0]?' sel':'')+'" data-act="tab" data-t="'+k[0]+'">'+t(k[1])+(k[0]==='store'?' ('+stored.length+')':'')+'</button>';});
  var tb=sh.querySelector('.dsg-tabs');if(tb._h!==th){tb._h=th;tb.innerHTML=th;}
  var ch='';
  if(Z.tab==='store'){
    if(!stored.length)ch='<p class="dsg-empty">'+t('fu.storeEmpty')+'</p>';
    stored.forEach(function(it){
      ch+='<div class="crf-c dsg-c can"><button type="button" class="crf-main" data-act="place" data-id="'+it.id+'"><i class="crf-lv">'+it.lv+'</i>'+
        '<span class="crf-ic dsg-ic"><img alt="" src="'+Tavern3D.thumb(it.t,it.lv)+'"></span><b class="crf-n">'+name(it.t)+'</b><em class="crf-eff">'+bonusText(it.t,it.lv)+'</em>'+
        '<span class="dsg-put">'+t('fu.put')+'</span></button></div>';
    });
  }else{
    D.FURN_ORDER.forEach(function(tp){
      var d=D.FURN[tp];if(d.cat!==Z.tab)return;
      var c=G.furnBuyCost(tp),bl=G.furnBuyBlock(tp),need=D.furnHall(tp,1);
      ch+='<div class="crf-c dsg-c'+(bl?' off':' can')+'"><button type="button" class="crf-main" data-act="buy" data-t="'+tp+'">'+
        '<span class="crf-ic dsg-ic"><img alt="" src="'+Tavern3D.thumb(tp,1)+'"></span><b class="crf-n">'+name(tp)+'</b>'+
        '<em class="crf-eff">'+bonusText(tp,1)+(d.layer==='floor'?' · '+t('fu.floor'):d.layer==='ceil'?' · '+t('fu.ceil'):'')+'</em>'+
        (bl==='hall'?'<span class="crf-need">'+t('fu.bl.hallN',{n:need})+'</span>':bl==='seats'?'<span class="crf-need">'+t('fu.bl.seats')+'</span>':tp==='schest'&&bl==='max'?'<span class="crf-need">'+t('fu.bl.chestMax',{n:D.CHEST_MAX})+'</span>':'<span class="crf-cost">'+costHtml(c)+'</span>')+
        '<small class="dsg-own">'+t('fu.own',{n:G.furnOwn(tp)})+(tp==='schest'?' / '+D.CHEST_MAX:'')+'</small></button></div>';
    });
  }
  var cards=sh.querySelector('.dsg-cards');
  if(force)cards._h=null;
  if(cards._h!==ch){var sl=cards.scrollLeft;cards._h=ch;cards.innerHTML=ch;if(!force)cards.scrollLeft=sl;else cards.scrollLeft=0;}
}

window.Design={open:open,close:close,get isOpen(){return !!Z;},get zone(){return Z?Z.zone:null;}};
})();
