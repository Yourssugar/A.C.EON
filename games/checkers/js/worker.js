/* A.C.EON CHECKERS: бот в отдельном потоке, чтобы страница не замирала, пока он думает.
   Получает {st, level}, отвечает {move, score}. */
var window=self;
var v=(self.location.search.match(/v=([^&]+)/)||[])[1]||'';
importScripts('rules.js'+(v?'?v='+v:''),'ai.js'+(v?'?v='+v:''));
self.onmessage=function(e){
  var r=CkAI.best(e.data.st,e.data.level);
  self.postMessage({id:e.data.id,move:r?r.move:null,score:r?r.score:0});
};
