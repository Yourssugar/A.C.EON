/* KOTAE!: запуск. Раздел хранилища 'quiz' v1:
   settings{gfx: auto|high|low}, last{g,s} последняя открытая подтема,
   prog{"жанр-подтема":{done,stars[10]}}, seen{"жанр-подтема-уровень":[id]},
   cards["жанр-подтема-уровень"], badges[], stats{runs,correct,wrong,hints,sureAsked,sureChanged} */
(function(){
'use strict';

Store.define('quiz',{
  version:1,
  defaults:{settings:{gfx:'auto'},last:null,prog:{},seen:{},cards:[],badges:[],
    stats:{runs:0,correct:0,wrong:0,hints:0,sureAsked:0,sureChanged:0}}
});

/* общие строки (arcade.js на этой странице не подключён: игра самостоятельная, открывается из A.C.EON_Core) */
var ARC={en:['LANGUAGE','SOUND','MUSIC'],ru:['ЯЗЫК','ЗВУКИ','МУЗЫКА'],de:['SPRACHE','SOUND','MUSIK'],fr:['LANGUE','SONS','MUSIQUE'],
  es:['IDIOMA','SONIDOS','MÚSICA'],it:['LINGUA','SUONI','MUSICA'],pl:['JĘZYK','DŹWIĘKI','MUZYKA']};
Object.keys(ARC).forEach(function(c){I18n.add(c,{'nav.core':'A.C.EON CORE','arc.lang':ARC[c][0],'arc.sfx':ARC[c][1],'arc.music':ARC[c][2]});});

/* музыка: меню (вступление, жанры, уровни) и шоу (экран игры). Пустой список = тишина */
/* шоу: два трека Ticking Koto идут по кругу, наплывом друг в друга (sound.js) */
var MUSIC={menu:['assets/koto-showdown.mp3'],show:['assets/ticking-koto-1.mp3','assets/ticking-koto-2.mp3']},SET={};
window.QMusic=function(where){
  if(!window.Sound)return;
  var list=MUSIC[where]||[];
  if(!list.length){if(Sound.stop)Sound.stop(1.5);return;}
  if(!SET[where]){var map={};map[where]=list.map(function(u){return window.Boot?Boot.url(u):u;});Sound.playlists(map);SET[where]=1;}
  Sound.music(where);
};
/* конец уровня: победа плавно глушит шоу, проигрыш "останавливает плёнку" */
window.QMusic.end=function(won){
  if(!window.Sound)return;
  if(!won&&Sound.tapeStop)Sound.tapeStop(2.4);else if(Sound.stop)Sound.stop(1.5);
};
if(window.Sound&&Sound.define){
  Sound.define('whoosh',function(t,tone,noise){noise(t,.32,.22,1400);tone(t,260,.3,'sine',.035,820);});
}

function go(){
  I18n.apply();
  var gfx=Store.get('quiz').settings.gfx||'auto';
  if(gfx==='auto'&&(navigator.hardwareConcurrency||4)<=2)gfx='low';
  QScene.init(gfx);
  QUI.start();
}
if(window.Boot&&Boot.ready)Boot.ready.then(go);else go();
})();
