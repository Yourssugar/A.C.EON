/* A.C.EON CHESS: доска в 2D (клетки DOM + фигуры SVG).

   Это сменный модуль отрисовки. 3D-доска должна дать тот же интерфейс,
   тогда игре (chess.js) всё равно, какая доска подключена:

   var view = Board2D(element)
   view.el                    элемент, на который вешаются pointer-события
   view.draw(scene, anim)     нарисовать позицию
   view.squareAt(x, y)        клетка под точкой экрана: {r,c} или null
   view.cellSize()            размер клетки в px (для фигуры под пальцем)
   view.lift(r, c, on)        фигура поднята (её тащат)
   view.over(r, c)            подсветить клетку под пальцем (null снимает)

   scene: {board, flip, sel:{r,c}|null, hints:{r*8+c:'go'|'cap'}, lastH, lastA, check:r*8+c|null}
   anim:  {slides:[[r,c,tr,tc],...], burst:[r,c]}  ход и вспышка взятия */
(function(){
'use strict';

function reducedMotion(){return window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;}
function pieceSvg(p){return ChessPieces.svg(p[1],p[0]);}

window.Board2D=function(el){
  var flip=false,overEl=null;

  function cell(r,c){return el.querySelector('.ch-cell[data-r="'+r+'"][data-c="'+c+'"]');}

  function draw(s,anim){
    flip=!!s.flip;
    var html='';
    function on(last,r,c){return last&&((last.r===r&&last.c===c)||(last.tr===r&&last.tc===c));}
    for(var vr=0;vr<8;vr++)for(var vc=0;vc<8;vc++){
      var r=flip?7-vr:vr,c=flip?7-vc:vc,i=r*8+c,p=s.board[r][c];
      var cls='ch-cell '+((r+c)%2===0?'ch-light':'ch-dark');
      if(s.sel&&s.sel.r===r&&s.sel.c===c)cls+=' ch-sel';
      if(s.hints&&s.hints[i])cls+=' ch-hint'+(s.hints[i]==='cap'?' ch-cap':'');
      if(on(s.lastH,r,c))cls+=' ch-last-h';
      if(on(s.lastA,r,c))cls+=' ch-last-a';
      if(i===s.check)cls+=' ch-check';
      html+='<div class="'+cls+'" data-r="'+r+'" data-c="'+c+'">';
      if(p)html+='<div class="ch-pw">'+pieceSvg(p)+'</div>';
      if(vc===0)html+='<span class="ch-lbl ch-lbl-r">'+(8-r)+'</span>';
      if(vr===7)html+='<span class="ch-lbl ch-lbl-c">'+'abcdefgh'[c]+'</span>';
      html+='</div>';
    }
    el.innerHTML=html;
    overEl=null;
    if(anim&&!reducedMotion()){
      (anim.slides||[]).forEach(function(m){slide(m[0],m[1],m[2],m[3]);});
      if(anim.burst)burst(anim.burst[0],anim.burst[1]);
    }
  }

  /* фигура стартует со старой клетки и доезжает до новой */
  function slide(r,c,tr,tc){
    var dst=cell(tr,tc),pw=dst&&dst.querySelector('.ch-pw');if(!pw)return;
    var k=flip?-1:1;
    pw.style.transform='translate('+((c-tc)*k*100)+'%,'+((r-tr)*k*100)+'%)';
    pw.getBoundingClientRect();
    pw.classList.add('moving');
    pw.style.transform='';
    pw.addEventListener('transitionend',function(){pw.classList.remove('moving');},{once:true});
  }

  /* вспышка на клетке взятия */
  function burst(r,c){
    var dst=cell(r,c);if(!dst)return;
    var wrap=document.createElement('div');wrap.className='ch-burst';
    var html='<span class="ch-ring"></span>';
    for(var i=0;i<12;i++){
      var a=i/12*Math.PI*2+Math.random()*0.4,d=6+Math.random()*5;   // в cqw, клетка = 12.5cqw
      html+='<i style="--dx:'+(Math.cos(a)*d).toFixed(1)+'cqw;--dy:'+(Math.sin(a)*d).toFixed(1)+'cqw"></i>';
    }
    wrap.innerHTML=html;
    setTimeout(function(){dst.appendChild(wrap);},180);
    setTimeout(function(){wrap.remove();},900);
  }

  function squareAt(x,y){
    var b=el.getBoundingClientRect();
    if(x<b.left||y<b.top||x>=b.right||y>=b.bottom)return null;
    var cs=getComputedStyle(el),bw=parseFloat(cs.borderLeftWidth)||0;
    var size=(b.width-2*bw)/8;
    var vc=Math.floor((x-b.left-bw)/size),vr=Math.floor((y-b.top-bw)/size);
    if(vc<0||vc>7||vr<0||vr>7)return null;
    return flip?{r:7-vr,c:7-vc}:{r:vr,c:vc};
  }
  function cellSize(){var e=el.querySelector('.ch-cell');return e?e.getBoundingClientRect().width:40;}
  function lift(r,c,on){var e=cell(r,c),pw=e&&e.querySelector('.ch-pw');if(pw)pw.classList.toggle('lifted',!!on);}
  function over(r,c){
    var e=r==null?null:cell(r,c);
    if(e&&!e.classList.contains('ch-hint'))e=null;
    if(e===overEl)return;
    if(overEl)overEl.classList.remove('ch-over');
    if(e)e.classList.add('ch-over');
    overEl=e;
  }

  return {el:el,draw:draw,squareAt:squareAt,cellSize:cellSize,lift:lift,over:over};
};
})();
