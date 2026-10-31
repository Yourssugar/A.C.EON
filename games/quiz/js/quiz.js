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
var ARC={en:['LANGUAGE','SOUND'],ru:['ЯЗЫК','ЗВУКИ'],de:['SPRACHE','SOUND'],fr:['LANGUE','SONS'],
  es:['IDIOMA','SONIDOS'],it:['LINGUA','SUONI'],pl:['JĘZYK','DŹWIĘKI']};
Object.keys(ARC).forEach(function(c){I18n.add(c,{'nav.core':'A.C.EON CORE','arc.lang':ARC[c][0],'arc.sfx':ARC[c][1]});});

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
