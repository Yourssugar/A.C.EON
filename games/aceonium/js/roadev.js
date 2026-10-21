/* Aceonium v33: события на дороге. Пока игрок смотрит поход, в начале волны иногда случается встреча:
   сцена переходит на 3D-дорогу (без боя), снизу окно с выбором. Не выбрал за D.EV_TIME с - маг идёт мимо. */
(function(){
'use strict';
var D=window.AcData,g=null,box=null,timer=null;
function t(k,v){return UI.t(k,v);}

function build(ev){
  close();
  box=document.createElement('div');box.className='rev';
  document.getElementById('stage').appendChild(box);
  box.addEventListener('click',function(e){
    e.stopPropagation();
    var b=e.target.closest('[data-o]');if(!b||b.disabled)return;
    Sound.sfx('select');
    if(b.dataset.o==='next')g.eventClose();else g.chooseEvent(b.dataset.o);
  });
  box.addEventListener('pointerdown',function(e){e.stopPropagation();});
  paint();
  timer=setInterval(tick,200);
}
function paint(){
  var ev=g.R.ev;if(!box||!ev)return;
  var h='<div class="rev-t">'+t('ev.'+ev.id+'.t')+'</div>';
  if(!ev.res){
    h+='<p>'+t('ev.'+ev.id+'.d')+'</p><div class="rev-b">';
    ev.opts.forEach(function(o){h+='<button type="button" class="btn'+(o==='skip'?' ghost':'')+'" data-o="'+o+'">'+t('ev.'+ev.id+'.'+o)+'</button>';});
    h+='</div>';
  }else{
    var v={};for(var k in ev.res.v)v[k]=ev.res.v[k];
    if(v.r)v.r=t('res.'+v.r);if(v.g!==undefined)v.g=D.fmt(v.g);if(v.i)v.i=UI.itemName(v.i);
    h+='<p class="rev-res">'+t(ev.res.k,v)+'</p><div class="rev-b"><button type="button" class="btn" data-o="next">'+t('ev.next')+'</button></div>';
  }
  h+='<div class="rev-bar"><i></i></div>';
  box.innerHTML=h;
  tick();
}
function tick(){
  var ev=g.R.ev;
  if(!box)return;
  if(!ev||g.R.phase!=='event'){close();return;}
  if(!!ev.res!==box._res){box._res=!!ev.res;paint();return;}
  var i=box.querySelector('.rev-bar i');if(i)i.style.width=(Math.max(0,ev.t)/(ev.res?D.EV_SHOW:ev.T)*100).toFixed(1)+'%';
}
function close(){if(timer){clearInterval(timer);timer=null;}if(box){box.remove();box=null;}}

function init(game){
  g=game;
  g.on('event',function(ev){build(ev);});
  g.on('eventRes',function(){if(box){box._res=true;paint();}});
  g.on('eventEnd',close);
  g.on('home',close);
}
window.RoadEv={init:init,close:close};
})();
