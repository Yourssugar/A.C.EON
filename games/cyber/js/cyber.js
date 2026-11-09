/* A.C.EON BREACH: запуск. Верхняя панель аркады, фон, пролог.
   Экрана дел пока нет: кнопка в конце пролога ставит #case-1, сюда же потом подключится карта дел. */
(function(){
'use strict';

Arcade.topbar('cy.title');
I18n.apply();

var cv=document.getElementById('cy-gl');
if(CyberGL.init(cv)){
  CyberGL.load(CyberPrologue.textures).then(CyberGL.start);
}

CyberPrologue.start(function(){
  setTimeout(function(){location.hash='#case-1';},700);
});
})();
