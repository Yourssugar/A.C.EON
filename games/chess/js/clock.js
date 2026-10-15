/* A.C.EON CHESS: шахматные часы.
   var clock = ChessClock({w:300000, b:300000}, onTick, onFlag)
   clock.start('w')   пошли часы белых (часы чёрных стоят)
   clock.stop()       пауза (меню, конец партии)
   clock.left('w')    сколько осталось, мс
   clock.running()    чьи часы идут или null
   onTick(clock) каждые ~100 мс, onFlag(color) когда время вышло. */
(function(){
'use strict';

window.ChessClock=function(times,onTick,onFlag){
  var left={w:times.w,b:times.b},side=null,since=0,timer=null;

  function sync(){
    if(!side)return;
    var now=performance.now();
    left[side]=Math.max(0,left[side]-(now-since));
    since=now;
  }
  function tick(){
    sync();
    if(onTick)onTick(api);
    if(side&&left[side]<=0){var f=side;stop();if(onFlag)onFlag(f);}
  }
  function start(color){
    sync();
    side=color;since=performance.now();
    if(!timer)timer=setInterval(tick,100);
    if(onTick)onTick(api);
  }
  function stop(){
    sync();side=null;
    if(timer){clearInterval(timer);timer=null;}
    if(onTick)onTick(api);
  }
  var api={
    start:start,stop:stop,
    left:function(c){sync();return left[c];},
    running:function(){return side;},
    snapshot:function(){sync();return {w:Math.round(left.w),b:Math.round(left.b)};}
  };
  return api;
};

/* 4:05, а в последние 10 секунд 0:09.4 */
window.ChessClock.format=function(ms){
  ms=Math.max(0,ms);
  var s=ms/1000;
  if(s<10)return '0:0'+s.toFixed(1);
  var m=Math.floor(s/60),r=Math.floor(s%60);
  return m+':'+(r<10?'0':'')+r;
};
})();
