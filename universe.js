/* ═══════════════════════════════════════════════════════════
   A.C.EON UNIVERSE BRIDGE
   Подключение на любой странице сайта (до основного скрипта):
     <script src="/A.C.EON/universe.js"></script>
   Читает вселенную, выбранную на главной (localStorage),
   вешает класс ufx0..ufx3 на <html> и даёт API:

     AceonUniverse.id        0..3
     AceonUniverse.tag       'U-2'
     AceonUniverse.fx        уровень эффектов 0..3
     AceonUniverse.gl        разрешён ли WebGL-пост
     AceonUniverse.capMs     целевой интервал кадра (95/31/31|15/15)
     AceonUniverse.particleScale   множитель числа частиц (0.12/0.35/0.7/1)
     AceonUniverse.dprCap    потолок devicePixelRatio для канвасов
     AceonUniverse.is(n)     true если тир >= n
     AceonUniverse.onChange(fn)    вселенную сменили в другой вкладке

   Переопределение для теста: ?fx=0..3 в URL.
   ═══════════════════════════════════════════════════════════ */
(function(){
  'use strict';
  var isCoarse = window.matchMedia('(pointer:coarse)').matches || navigator.maxTouchPoints>0;
  var UNIVERSES=[
    {id:1,tag:'U-1',name:'DRIFT',      fx:1,gl:false,capMs:31},
    {id:2,tag:'U-2',name:'FLUX',       fx:2,gl:true, capMs:isCoarse?31:15},
    {id:3,tag:'U-3',name:'SINGULARITY',fx:3,gl:true, capMs:15}
  ];
  var u=1;
  try{
    var s=localStorage.getItem('aceon_universe');
    if(s!==null)u=Math.max(1,Math.min(3,parseInt(s,10)||1));
  }catch(e){}
  var m=location.search.match(/[?&]fx=([1-3])/);
  if(m)u=parseInt(m[1],10);
  var P=UNIVERSES[u-1];

  document.documentElement.classList.add('ufx'+P.fx);

  window.AceonUniverse={
    id:P.id, tag:P.tag, name:P.name, fx:P.fx, gl:P.gl, capMs:P.capMs,
    particleScale:[0.35,0.7,1][P.id-1],
    dprCap:[1,isCoarse?0.9:1.25,isCoarse?1.25:1.75][P.id-1],
    is:function(n){ return P.id>=n; },
    onChange:function(fn){
      window.addEventListener('storage',function(e){
        if(e.key==='aceon_universe'&&e.newValue!==null){
          fn(Math.max(1,Math.min(3,parseInt(e.newValue,10)||1)));
        }
      });
    }
  };
})();
