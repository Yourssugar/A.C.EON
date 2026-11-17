/* KOTAE!: карточки коллекции.
   Картинка уровня img/cards/<жанр-подтема>-lNN.webp (если GPT её нарисовал, см. QCat.art),
   иначе пустой чёрный фон. Рамка: 1-2 бронза, 3-4 серебро, 5-6 золото, 7-8 платина, 9-10 легенда;
   чётный уровень пары светлее (класс alt). Номер и название кладёт код.
   QCard.html(key, level, {stars, title, back, w}) */
(function(){
'use strict';

function img(n){var u='img/'+n+'.webp';return window.Boot?Boot.url(u):u;}
function esc(s){return String(s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];});}
function pad(n){return (n<10?'0':'')+n;}

function art(key,level){
  if(QCat.art(key,level))return '<div class="art" style="background-image:url('+img('cards/'+key+'-l'+pad(level))+')"></div>';
  return '<div class="art art-none"></div>';
}
function title(key,level){
  var d=window.QEngine&&QEngine.cached?QEngine.cached(key):null;
  return (d&&QEngine.title(d,level))||I18n.t('ranks')[level-1];
}
function html(key,level,o){
  o=o||{};
  var w=o.w?' style="--w:'+o.w+'"':'';
  if(o.back)return '<div class="card back"'+w+'><div class="cb"></div></div>';
  var st='';for(var z=0;z<(o.stars||0);z++)st+='<i class="ico ico-star"></i>';
  return '<div class="card'+(level%2===0?' alt':'')+'"'+w+'>'+art(key,level)+
    '<div class="frm" style="background-image:url('+img('card-frame-'+QCat.frame(level))+')"></div>'+
    '<div class="num">'+level+'</div><div class="ttl">'+esc(o.title||title(key,level))+'</div>'+
    (st?'<div class="stars">'+st+'</div>':'')+'<div class="gloss"></div></div>';
}
window.QCard={html:html,title:title};
})();
