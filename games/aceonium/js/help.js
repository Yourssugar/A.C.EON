/* Aceonium: справка (v20).
   Пояснения к механикам живут здесь, а не во вкладках. Открывается из меню настроек (шестерёнка)
   и кнопками "?" у блоков: любой элемент с data-help="тема".
   Help.open(topic) */
(function(){
'use strict';
var t=function(k,v){return I18n.t(k,v);};
var TOPICS=['trip','bag','tavern','hall','craft','tools','book','city','mage','pets','save'];
var H=null;

function open(topic){
  if(H)close();
  H={id:TOPICS.indexOf(topic)>=0?topic:TOPICS[0]};
  var box=document.createElement('div');box.className='hp-wrap';
  box.innerHTML='<div class="hp"><div class="hp-head"><b>'+t('hp.title')+'</b><button type="button" class="hp-x" data-act="close" aria-label="close"></button></div>'+
    '<div class="hp-in"><nav class="hp-nav"></nav><div class="hp-body"></div></div></div>';
  document.body.appendChild(box);H.box=box;
  box.addEventListener('click',function(e){
    if(e.target===box){close();return;}
    var b=e.target.closest('[data-act]');if(!b)return;
    if(b.dataset.act==='close'){close();return;}
    if(b.dataset.act==='topic'){H.id=b.dataset.t;Sound.sfx('select');render();}
  });
  document.addEventListener('keydown',onKey);
  render();
}
function onKey(e){if(e.key==='Escape')close();}
function render(){
  if(!H)return;
  var nav='';
  TOPICS.forEach(function(k){nav+='<button type="button" data-act="topic" data-t="'+k+'" class="'+(k===H.id?'sel':'')+'">'+t('hp.'+k+'.t')+'</button>';});
  H.box.querySelector('.hp-nav').innerHTML=nav;
  var body=H.box.querySelector('.hp-body');
  body.innerHTML='<h3>'+t('hp.'+H.id+'.t')+'</h3>'+t('hp.'+H.id);
  body.scrollTop=0;
  var sel=H.box.querySelector('.hp-nav .sel');if(sel&&sel.scrollIntoView)sel.scrollIntoView({block:'nearest',inline:'nearest'});
}
function close(){if(!H)return;document.removeEventListener('keydown',onKey);H.box.remove();H=null;}

/* кнопка "?" рядом с заголовком блока */
function btn(topic){return '<button type="button" class="hlp" data-help="'+topic+'" aria-label="?">?</button>';}
document.addEventListener('click',function(e){
  var b=e.target.closest&&e.target.closest('[data-help]');if(!b)return;
  e.preventDefault();e.stopPropagation();
  var sp=document.querySelector('.arc-set-panel');if(sp)sp.classList.add('hidden');
  open(b.dataset.help);
},true);

/* пункт в меню настроек аркады */
function addToSettings(){
  var panel=document.querySelector('.arc-set-panel');if(!panel||panel.querySelector('.hp-open'))return;
  var b=document.createElement('button');b.type='button';b.className='hp-open';b.dataset.help='trip';
  b.textContent=t('hp.menu');
  panel.appendChild(b);
  I18n.onChange(function(){b.textContent=t('hp.menu');});
}

window.Help={open:open,close:close,btn:btn,addToSettings:addToSettings,get isOpen(){return !!H;}};
})();
