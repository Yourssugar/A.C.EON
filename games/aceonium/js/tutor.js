/* Aceonium v34: обучение после пролога и разговора с хозяйкой.
   Шаги по очереди: подсветка нужной кнопки и подсказка рядом. Каждые 0.3 с проверяется, выполнен ли шаг.
   S.tut.step: номер шага, 99 - обучение пройдено или пропущено. Старым сохранениям сразу 99. */
(function(){
'use strict';
var g=null,S=null,ring=null,tip=null,timer=null,lastKey='';
function t(k,v){return UI.t(k,v);}
function vis(el){if(!el)return false;var r=el.getBoundingClientRect();return r.width>0&&r.height>0&&r.bottom>0&&r.top<innerHeight;}
function q(sel){var list=document.querySelectorAll(sel);for(var i=0;i<list.length;i++)if(vis(list[i]))return list[i];return null;}
function first(sels){for(var i=0;i<sels.length;i++){var e=q(sels[i]);if(e)return e;}return null;}
function buildOpen(){return !!q('#tab-body .mu-row');}

/* шаги: key - текст, target - что подсветить (первое видимое), done - шаг выполнен, ok - кнопка ПОНЯТНО вместо действия */
var STEPS=[
  {key:'adv',target:function(){var b=document.querySelector('.wm-go[data-a=go]');if(b){if(!vis(b)||b.getBoundingClientRect().bottom>innerHeight)b.scrollIntoView({block:'nearest'});return b;}return q('#view-btn');},done:function(){return S.started;}},
  {key:'craft',target:function(){return window.Craft&&Craft.isOpen?first(['.crf-main[data-r=p_heal]','.crf-tb[data-t=herbalist]']):q('.bb-create');},
    done:function(){return S.queue.some(function(o){return o.r==='p_heal';})||S.stats.crafted>0;},key2:function(){return window.Craft&&Craft.isOpen?'potion':'craft';}},
  {key:'wait',target:function(){return q('.qbar');},done:function(){return S.stats.crafted>0;}},
  {key:'first',ok:true},
  {key:'hire',enter:function(){S.tut.freeHire='tanner';},target:function(){return buildOpen()?q('[data-act=hire][data-m=tanner]'):first(['.bb-b[data-g=build]']);},done:function(){return g.master('tanner').hired;}},
  {key:'bag',enter:function(){S.tut.freeBag=true;},target:function(){return buildOpen()?q('[data-act=order][data-r=bag]'):q('.bb-b[data-g=build]');},done:function(){return S.bagLvl>1||g.pending('bag');}},
  {key:'hall',target:function(){return buildOpen()?q('.bd-hall .buy'):q('.bb-b[data-g=build]');},done:function(){return g.buildLvl('hall')>=1;},
    key2:function(){return S.gold<(g.buildCost('hall')||{gold:0}).gold?'hallGold':'hall';}},
  {key:'staff',ok:true,target:function(){return q('.bb-b[data-g=hall]');}}
];

function ready(){
  if(!S||!S.profile||!S.tut||S.tut.step>=STEPS.length)return false;
  if(!S.lore||!S.lore.pro||!S.lore.dlg)return false;
  if(window.Lore&&Lore.busy)return false;
  if(window.LoadScreen&&LoadScreen.isOn)return false;
  var m=document.getElementById('modal');if(m&&!m.classList.contains('hidden'))return false;
  return true;
}
function step(){return STEPS[S.tut.step];}
function next(){
  S.tut.step++;S.tut.entered=false;
  if(S.tut.step>=STEPS.length){S.tut.step=99;hide();g.emit('tutDone');}
  else if(window.Sound)Sound.sfx('check');
}
function tick(){
  if(!ready()){hide();return;}
  var st=step();if(!st){hide();return;}
  if(!S.tut.entered){S.tut.entered=true;if(st.enter)st.enter();}
  if(st.done&&st.done()){next();return tick();}
  show(st);
}
function hide(){if(ring)ring.style.display='none';if(tip)tip.style.display='none';lastKey='';}
function show(st){
  if(!tip){
    ring=document.createElement('div');ring.className='tut-ring';document.body.appendChild(ring);
    tip=document.createElement('div');tip.className='tut';document.body.appendChild(tip);
    tip.addEventListener('click',function(e){
      var a=e.target.closest('[data-a]');if(!a)return;
      e.stopPropagation();
      if(a.dataset.a==='ok')next();
      if(a.dataset.a==='skip'){S.tut.step=99;delete S.tut.freeHire;delete S.tut.freeBag;hide();}
      tick();
    });
  }
  var key=st.key2?st.key2():st.key,el=st.target?st.target():null;
  var cost=g.buildCost('hall');
  var html='<p>'+t('tut.'+key,{g:cost?cost.gold:0})+'</p><div class="tut-b">'+(st.ok?'<button type="button" class="btn sm" data-a="ok">'+t('tut.ok')+'</button>':'')+
    '<button type="button" class="tut-skip" data-a="skip">'+t('tut.skip')+'</button></div>';
  if(html!==lastKey){tip.innerHTML=html;lastKey=html;}
  tip.style.display='block';
  var tw=tip.offsetWidth,th=tip.offsetHeight,x,y;
  if(el){
    var r=el.getBoundingClientRect();
    ring.style.display='block';
    ring.style.left=(r.left-5)+'px';ring.style.top=(r.top-5)+'px';ring.style.width=(r.width+10)+'px';ring.style.height=(r.height+10)+'px';
    x=r.left+r.width/2-tw/2;
    y=r.top>innerHeight*0.5?r.top-th-16:r.bottom+16;
    tip.classList.toggle('up',r.top<=innerHeight*0.5);tip.classList.toggle('down',r.top>innerHeight*0.5);
    tip.style.setProperty('--ax',Math.max(14,Math.min(tw-14,r.left+r.width/2-Math.max(8,Math.min(innerWidth-tw-8,x))))+'px');
  }else{
    ring.style.display='none';tip.classList.remove('up','down');
    x=innerWidth/2-tw/2;y=innerHeight*0.32;
  }
  tip.style.left=Math.max(8,Math.min(innerWidth-tw-8,x))+'px';
  tip.style.top=Math.max(8,Math.min(innerHeight-th-8,y))+'px';
}
function init(game){
  g=game;S=game.S;
  if(!S.tut)S.tut={step:99};
  timer=setInterval(tick,300);
}
window.Tutor={init:init,get active(){return !!(S&&S.tut&&S.tut.step<STEPS.length);}};
})();
