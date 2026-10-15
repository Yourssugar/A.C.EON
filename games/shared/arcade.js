/* A.C.EON ARCADE: общие детали страниц игр.
   Нужны раньше: store.js, i18n.js, sound.js.

   Arcade.topbar('ch.title')  верхняя панель: назад, название, настройки
   Arcade.getHi/setHi/trackPlay  рекорды и счётчик игр в старых ключах лаунчера
                                 (лаунчер их читает, пока не переехал на Store) */
(function(){
'use strict';

var BASE=new URL('.',document.currentScript.src);   // .../games/shared/

function lsGet(k,d){try{var v=localStorage.getItem(k);return v===null?d:v;}catch(e){return d;}}
function lsSet(k,v){try{localStorage.setItem(k,v);}catch(e){}}
function getHi(id){return parseInt(lsGet('aceon_hi_'+id,'0'),10)||0;}
function setHi(id,sc){if(sc>getHi(id))lsSet('aceon_hi_'+id,sc);return getHi(id);}
function trackPlay(){var n=(parseInt(lsGet('aceon_plays','0'),10)||0)+1;lsSet('aceon_plays',n);return n;}

I18n.add('en',{'arc.back':'ARCADE','arc.settings':'SETTINGS','arc.lang':'LANGUAGE','arc.music':'MUSIC','arc.sfx':'SOUND'});
I18n.add('ru',{'arc.back':'АРКАДА','arc.settings':'НАСТРОЙКИ','arc.lang':'ЯЗЫК','arc.music':'МУЗЫКА','arc.sfx':'ЗВУКИ'});
I18n.add('de',{'arc.back':'ARCADE','arc.settings':'EINSTELLUNGEN','arc.lang':'SPRACHE','arc.music':'MUSIK','arc.sfx':'SOUND'});
I18n.add('fr',{'arc.back':'ARCADE','arc.settings':'RÉGLAGES','arc.lang':'LANGUE','arc.music':'MUSIQUE','arc.sfx':'SONS'});
I18n.add('es',{'arc.back':'ARCADE','arc.settings':'AJUSTES','arc.lang':'IDIOMA','arc.music':'MÚSICA','arc.sfx':'SONIDOS'});
I18n.add('it',{'arc.back':'ARCADE','arc.settings':'IMPOSTAZIONI','arc.lang':'LINGUA','arc.music':'MUSICA','arc.sfx':'SUONI'});
I18n.add('pl',{'arc.back':'ARCADE','arc.settings':'USTAWIENIA','arc.lang':'JĘZYK','arc.music':'MUZYKA','arc.sfx':'DŹWIĘKI'});

var GEAR='<svg viewBox="0 0 16 16" aria-hidden="true"><g fill="currentColor"><rect x="7" y="1" width="2" height="3"/><rect x="7" y="12" width="2" height="3"/><rect x="1" y="7" width="3" height="2"/><rect x="12" y="7" width="3" height="2"/><rect x="3" y="3" width="2" height="2"/><rect x="11" y="3" width="2" height="2"/><rect x="3" y="11" width="2" height="2"/><rect x="11" y="11" width="2" height="2"/><path fill-rule="evenodd" d="M5 4h6v1h1v6h-1v1H5v-1H4V5h1zM7 6v4h2V6z"/></g></svg>';

function slider(kind){
  var row=document.createElement('label');row.className='arc-vol';
  row.innerHTML='<span data-i18n="arc.'+kind+'"></span><input type="range" min="0" max="100" step="5"><b></b>';
  var inp=row.querySelector('input'),out=row.querySelector('b');
  function paint(){var v=Math.round(Sound.volume(kind)*100);inp.value=v;out.textContent=v;inp.style.setProperty('--fill',v+'%');}
  inp.addEventListener('input',function(){Sound.setVolume(kind,inp.value/100);paint();if(kind==='sfx')Sound.sfx('select');});
  paint();
  return row;
}

function settingsPanel(){
  var wrap=document.createElement('div');wrap.className='arc-set';
  var btn=document.createElement('button');btn.type='button';btn.className='arc-icon-btn';
  btn.dataset.i18nTitle='arc.settings';btn.innerHTML=GEAR;
  var panel=document.createElement('div');panel.className='arc-set-panel hidden';
  panel.innerHTML='<div class="arc-set-h" data-i18n="arc.lang"></div><div class="arc-lang-grid"></div>';
  var grid=panel.querySelector('.arc-lang-grid');
  function paintLangs(){
    grid.innerHTML='';
    I18n.langs.forEach(function(l){
      var o=document.createElement('button');o.type='button';
      o.className='arc-lang-opt'+(l.code===I18n.lang?' sel':'');
      o.title=l.name;o.textContent=l.code.toUpperCase();
      o.addEventListener('click',function(e){e.stopPropagation();I18n.set(l.code);});
      grid.appendChild(o);
    });
  }
  panel.appendChild(slider('music'));
  panel.appendChild(slider('sfx'));
  btn.addEventListener('click',function(e){e.stopPropagation();panel.classList.toggle('hidden');});
  document.addEventListener('click',function(e){if(!wrap.contains(e.target))panel.classList.add('hidden');});
  I18n.onChange(paintLangs);paintLangs();
  wrap.appendChild(btn);wrap.appendChild(panel);
  return wrap;
}

function topbar(titleKey){
  var bar=document.createElement('header');
  bar.className='arc-top';
  bar.innerHTML='<a class="arc-back" href="'+new URL('../',BASE).href+'">&#9664; <span data-i18n="arc.back"></span></a>'+
                '<div class="arc-title" data-i18n="'+titleKey+'"></div>';
  bar.appendChild(settingsPanel());
  document.body.insertBefore(bar,document.body.firstChild);
  I18n.apply(bar);
  return bar;
}

window.Arcade={getHi:getHi,setHi:setHi,trackPlay:trackPlay,topbar:topbar};
})();
