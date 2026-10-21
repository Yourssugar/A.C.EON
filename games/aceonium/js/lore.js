/* Aceonium: лор (v29). Экран загрузки сцен, пролог-слайды и разговор с хозяйкой.
   LoadScreen.show(kind) / .progress(p) / .hide() / .isOn
     kind: boot | tavern | city | store | road0..road3. Фон assets/lore/load_<kind>.webp, если нет, градиент.
   Lore.prologue(done)   слайды пролога, можно пропустить
   Lore.dialog(done)     разговор хозяйки и мага в таверне (первые подсказки)
   Lore.busy             пока идёт пролог или разговор, экран загрузки не показывается
   Картинки необязательные: если файла нет, остаётся градиент и анимация. */
(function(){
'use strict';
var t=function(k,v){return I18n.t(k,v);};
var ART='assets/lore/';
/* с версией в адресе (?v=), чтобы после обновления картинок браузер не показывал старые из кэша */
function art(f){return window.Boot&&Boot.url?Boot.url(ART+f):ART+f;}
function esc(s){return String(s).replace(/[&<>]/g,function(c){return c==='&'?'&amp;':c==='<'?'&lt;':'&gt;';});}

/* ════════ ТЕКСТЫ ════════ */
I18n.add('ru',{
  'ls.boot':'ACEONIUM','ls.tavern':'Таверна','ls.city':'Город','ls.store':'Склад','ls.loading':'Загрузка {p}%','ls.tip':'Нажми, чтобы прочитать ещё',
  'ls.who.debt':'Долговая книга мага','ls.who.mage':'Заметки мага','ls.who.host':'Хозяйка','ls.who.city':'Слухи','ls.who.store':'Склад','ls.who.road':'Дорога',
  'lore.debt.0':'Запись 1. Пекарю Тиму: 37 монет. За пирожки "до пятницы". Пятница была три года назад.',
  'lore.debt.1':'Запись 2. Гильдии прорицателей: 120 монет. Предсказали, что я разбогатею. Деньги возвращать отказываются.',
  'lore.debt.2':'Запись 7. Прокат летающего ковра: 900 монет. Ковёр улетел без меня.',
  'lore.debt.3':'Запись 12. Банку "Вечный процент": сумма не влезла на страницу. Продолжение на обороте. И на следующей странице.',
  'lore.debt.4':'Запись 33. Соседу по башне: одна лампа-артефакт. Разбил. Сказал, что так и было.',
  'lore.debt.5':'Запись 58. Подписка на "Вестник чародея". Отписаться можно только лично, в главной башне, в полнолуние.',
  'lore.debt.6':'Последняя страница долговой книги пустая. Маг каждый раз проверяет, не появилось ли там слово "оплачено".',
  'lore.debt.7':'Запись 104. Дракону Ульфу: одна корона. Взял поносить на вечер. Вечер затянулся.',
  'lore.mage.0':'В моём мире посох заряжали от сети. Здесь сети нет. Здесь даже слова такого нет.',
  'lore.mage.1':'Местные зовут мои руны ведьминым огнём. Я не спорю. Спорить дороже.',
  'lore.mage.2':'Искры хватает на пару молний. На портал домой не хватит. Да и дома меня ждут. С бумагами.',
  'lore.mage.3':'Если вещь выглядит странно и слегка светится, скорее всего, её сделали из того, что упало с твари.',
  'lore.mage.4':'Каждая монета, отданная по долгу, возвращает капельку магии. Договор честный. Это меня и пугает.',
  'lore.host.0':'Полки пустые: путник уходит ни с чем. Полки полные: уходит с покупкой.',
  'lore.host.1':'Мастера не любят, когда их торопят. Зато любят, когда им платят.',
  'lore.host.2':'Двадцать лет держу эту таверну. Твари не повод закрываться.',
  'lore.host.3':'Ночью таверна закрыта. Даже маги должны спать. Особенно маги.',
  'lore.host.4':'Опять что-то поджёг? Нет? А почему тогда пахнет грозой?',
  'lore.city.0':'В городе снова стучат молотки. Кто-то вернулся.',
  'lore.city.1':'Говорят, мастер, который уехал первым, вернётся последним. Гордый.',
  'lore.city.2':'Окна пустых домов заколочены изнутри. Значит, хозяева собирались вернуться.',
  'lore.store.0':'На складе пахнет железом, смолой и чем-то, что светится в темноте. Лучше не нюхать.',
  'lore.store.1':'Строители уверяют, что подвал был тут всегда. Просто его никто не искал.',
  'lore.store.2':'Сундук закрывается на три замка. Два от воров, один от мага.',
  'lore.road.0':'Лягушки на болоте раньше были размером с ладонь. Потом пришёл маг.',
  'lore.road.1':'Не все твари злые. Одни голодные, другие просто любопытные.',
  'lore.road.2':'На дороге следы, которых нет ни у одного зверя этого мира.',
  'lore.road.3':'Чем дальше от города, тем сильнее пахнет магией. И тем больше вокруг зубов.',
  'lore.road.4':'Звери тянутся к следу портала, как мотыльки к лампе.',
  'pro.skip':'Пропустить','pro.next':'Дальше','pro.go':'Войти в таверну','pro.again':'Смотреть пролог',
  'pro.h.0':'Другой мир','pro.t.0':'Там, откуда пришёл маг, магия и техника одно и то же. Посохи заряжают, как лампы, а заклинания продают в рассрочку.',
  'pro.h.1':'Мелкий шрифт','pro.t.1':'Маг жил широко. Брал в долг у всех подряд и подписывал не читая. Мелкий шрифт он считал украшением.',
  'pro.h.2':'Расплата','pro.t.2':'Кредиторы пришли все разом. По договору у должника забирают магию, пока он не расплатится. Магу оставили одну искру.',
  'pro.h.3':'Кривой портал','pro.t.3':'Платить он не стал. На последней искре открыл портал наугад. Портал вышел кривым, и вслед за магом в него пролезли твари.',
  'pro.h.4':'Новый мир','pro.t.4':'Здесь на дорогах завелись чудища, звери начали меняться. Торговцы обходят эти края стороной, город на холме почти опустел.',
  'pro.h.5':'Таверна','pro.t.5':'Осталась таверна. Полуразрушенная, но с огнём в очаге. И хозяйка, которая не собирается её бросать.',
  'dlg.host':'Хозяйка','dlg.mage':'Маг','dlg.aside':'Маг, про себя','dlg.skip':'Пропустить','dlg.tap':'Нажми, чтобы продолжить',
  'dlg.0':'Ещё один промокший путник? Сразу говорю: в долг не наливаем.',
  'dlg.1':'Я не путник. Я маг. Временно почти без магии.',
  'dlg.2':'Маг, значит. Тогда скажи, маг, откуда на дорогах взялись твари? Торговцы обходят город, мастера разъехались, полгорода стоит пустое.',
  'dlg.3':'Знаю откуда. Ей лучше не знать.',
  'dlg.4':'Понятия не имею. Но разогнать их могу.',
  'dlg.5':'Тогда договоримся. Комната твоя. Травница ещё не уехала: закажи у неё зелья кнопкой СОЗДАТЬ, я выставлю их на полки и продам путникам.',
  'dlg.6':'А ты выходи на дорогу, кнопка В ПОХОД. Меньше тварей, больше путников. И неси всё, что с них упадёт: мастерам пригодится.',
  'dlg.7':'А золото? Мне его нужно немного. Ну, много. Очень много.',
  'dlg.8':'Сначала поднимем таверну, потом будешь считать монеты.',
  'dlg.9':'Мне бы досчитать хотя бы первую страницу.',
  'bk.story':'История','bk.storyH':'Как маг оказался в таверне'
});
I18n.add('en',{
  'ls.boot':'ACEONIUM','ls.tavern':'Tavern','ls.city':'Town','ls.store':'Storehouse','ls.loading':'Loading {p}%','ls.tip':'Tap to read more',
  'ls.who.debt':'The mage\'s debt book','ls.who.mage':'Mage\'s notes','ls.who.host':'Hostess','ls.who.city':'Rumours','ls.who.store':'Storehouse','ls.who.road':'The road',
  'lore.debt.0':'Entry 1. Tim the baker: 37 coins. For pies "until Friday". Friday was three years ago.',
  'lore.debt.1':'Entry 2. The Seers\' Guild: 120 coins. They predicted I would get rich. They refuse to refund.',
  'lore.debt.2':'Entry 7. Flying carpet rental: 900 coins. The carpet flew off without me.',
  'lore.debt.3':'Entry 12. The Eternal Interest Bank: the sum did not fit on the page. Continued overleaf. And on the next page.',
  'lore.debt.4':'Entry 33. My tower neighbour: one artifact lamp. Broke it. Said it was like that already.',
  'lore.debt.5':'Entry 58. Subscription to the Sorcerer\'s Herald. Unsubscribe in person only, at the main tower, on a full moon.',
  'lore.debt.6':'The last page of the debt book is empty. The mage keeps checking whether the word "paid" has appeared there.',
  'lore.debt.7':'Entry 104. Ulf the dragon: one crown. Borrowed it for an evening. The evening went on.',
  'lore.mage.0':'In my world staffs charged from the grid. There is no grid here. There is not even a word for it.',
  'lore.mage.1':'The locals call my runes witch fire. I do not argue. Arguing costs more.',
  'lore.mage.2':'My spark is enough for a couple of bolts. Not enough for a portal home. And they are waiting for me at home. With papers.',
  'lore.mage.3':'If a thing looks odd and glows a little, it was most likely made from something that fell off a monster.',
  'lore.mage.4':'Every coin paid on a debt brings back a drop of magic. The contract is fair. That is what scares me.',
  'lore.host.0':'Empty shelves: the traveler leaves with nothing. Full shelves: he leaves with a purchase.',
  'lore.host.1':'Craftsmen hate being rushed. They love being paid, though.',
  'lore.host.2':'Twenty years I have kept this tavern. Monsters are no reason to close.',
  'lore.host.3':'At night the tavern is closed. Even mages need sleep. Mages especially.',
  'lore.host.4':'Set something on fire again? No? Then why does it smell like a thunderstorm?',
  'lore.city.0':'Hammers are knocking in town again. Someone came back.',
  'lore.city.1':'They say the craftsman who left first will be the last to return. Proud.',
  'lore.city.2':'The windows of empty houses are boarded up from the inside. So the owners meant to come back.',
  'lore.store.0':'The storehouse smells of iron, resin and something that glows in the dark. Better not sniff it.',
  'lore.store.1':'The builders swear the cellar was always here. Nobody had looked for it.',
  'lore.store.2':'The chest has three locks. Two against thieves, one against the mage.',
  'lore.road.0':'The swamp frogs used to be the size of a palm. Then the mage came.',
  'lore.road.1':'Not all monsters are evil. Some are hungry, some are just curious.',
  'lore.road.2':'There are tracks on the road that no beast of this world leaves.',
  'lore.road.3':'The farther from town, the stronger it smells of magic. And the more teeth around.',
  'lore.road.4':'Beasts are drawn to the portal\'s trail like moths to a lamp.',
  'pro.skip':'Skip','pro.next':'Next','pro.go':'Enter the tavern','pro.again':'Watch the prologue',
  'pro.h.0':'Another world','pro.t.0':'Where the mage comes from, magic and technology are the same thing. Staffs are charged like lamps, and spells are sold on credit.',
  'pro.h.1':'Fine print','pro.t.1':'The mage lived large. He borrowed from everyone and signed without reading. He thought fine print was decoration.',
  'pro.h.2':'Reckoning','pro.t.2':'The creditors came all at once. By contract, a debtor\'s magic is taken until he pays. The mage was left a single spark.',
  'pro.h.3':'A crooked portal','pro.t.3':'He did not pay. With the last spark he opened a portal at random. It came out crooked, and monsters crawled through after him.',
  'pro.h.4':'A new world','pro.t.4':'Here, beasts now roam the roads and animals have started to change. Traders avoid these lands, and the town on the hill is almost empty.',
  'pro.h.5':'The tavern','pro.t.5':'Only the tavern is left. Half ruined, but with a fire in the hearth. And a hostess who has no intention of leaving it.',
  'dlg.host':'Hostess','dlg.mage':'Mage','dlg.aside':'Mage, to himself','dlg.skip':'Skip','dlg.tap':'Tap to continue',
  'dlg.0':'Another soaked traveler? Let me say it right away: we do not pour on credit.',
  'dlg.1':'I am not a traveler. I am a mage. Temporarily almost without magic.',
  'dlg.2':'A mage, then. So tell me, mage, where did the monsters on the roads come from? Traders avoid the town, craftsmen left, half the town stands empty.',
  'dlg.3':'I know where from. Better she does not.',
  'dlg.4':'No idea. But I can chase them off.',
  'dlg.5':'Then we have a deal. The room is yours. The herbalist has not left yet: order potions from her with the CREATE button, I will put them on the shelves and sell them to travelers.',
  'dlg.6':'And you go out on the road, the ON A TRIP button. Fewer monsters, more travelers. Bring back everything they drop: the craftsmen will use it.',
  'dlg.7':'And the gold? I need a little. Well, a lot. Very much a lot.',
  'dlg.8':'First we raise the tavern, then you can count coins.',
  'dlg.9':'If only I could finish counting the first page.',
  'bk.story':'Story','bk.storyH':'How the mage ended up in the tavern'
});
var POOL={debt:8,mage:5,host:5,city:3,store:3,road:5};
var MIX={boot:['debt','mage','host','road'],tavern:['host','debt','mage'],city:['city','host','debt'],store:['store','mage','debt'],road:['road','mage','debt']};
var SLIDES=6;
var DLG=[['host',0],['mage',1],['host',2],['aside',3],['mage',4],['host',5],['host',6],['mage',7],['host',8],['aside',9]];

/* ════════ ЭКРАН ЗАГРУЗКИ ════════ */
var L={el:null,on:false,kind:'',shownAt:0,p:0,shownP:0,hideT:0,lineT:0,last:'',raf:0};
/* руны печати: штрихи из простых линий, без шрифта (в Rubik рунического алфавита нет) */
var GLYPH=['M0 0V8M0 2L4 0M0 5L4 3','M0 8L2 0L4 8M1 5H3','M0 0V8M4 0V8M0 4L4 4','M2 0V8M0 2L2 4L4 2','M0 0L4 8M4 0L0 8','M0 8V0L4 3L0 6','M2 0V8M0 3H4M0 6L4 6','M0 0L2 3L4 0M2 3V8','M0 8L4 0M1 2L4 5','M0 0V8L4 5V0'];
function sealSvg(){
  var s='<svg class="ls-seal" viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="45" class="r1"/><circle cx="50" cy="50" r="32" class="r2"/><g class="rn">';
  for(var i=0;i<12;i++){var a=i*30;s+='<path d="'+GLYPH[i%GLYPH.length]+'" transform="rotate('+a+' 50 50) translate(48 7.5)"/>';}
  return s+'</g><path class="st" d="M50 22 L57 45 L80 50 L57 55 L50 78 L43 55 L20 50 L43 45 Z"/></svg>';
}
function build(){
  if(L.el)return;
  var el=document.createElement('div');el.className='ls';el.id='ls';
  var motes='';for(var i=0;i<14;i++)motes+='<i style="left:'+(5+Math.random()*90).toFixed(1)+'%;animation-delay:'+(-Math.random()*9).toFixed(2)+'s;animation-duration:'+(7+Math.random()*6).toFixed(1)+'s"></i>';
  el.innerHTML='<div class="ls-bg"><img alt="" decoding="async"></div><div class="ls-shade"></div><div class="ls-motes">'+motes+'</div>'+
    '<div class="ls-box"><div class="ls-title"></div><div class="ls-line"><small></small><p></p></div>'+
    '<div class="ls-foot">'+sealSvg()+'<div class="ls-bar"><i></i></div><b class="ls-pct"></b></div></div>';
  document.body.appendChild(el);L.el=el;
  var img=el.querySelector('.ls-bg img');
  img.addEventListener('load',function(){el.classList.add('has-img');});
  img.addEventListener('error',function(){el.classList.remove('has-img');});
  el.querySelector('.ls-line').addEventListener('click',function(){nextLine();L.lineT=0;});
}
function pickLine(kind){
  var base=kind.indexOf('road')===0?'road':kind;
  var mix=MIX[base]||MIX.boot,cat=mix[Math.floor(Math.random()*mix.length)];
  var n=POOL[cat],k='lore.'+cat+'.'+Math.floor(Math.random()*n);
  if(k===L.last){k='lore.'+cat+'.'+((+k.split('.')[2]+1)%n);}
  L.last=k;return {who:t('ls.who.'+cat),text:t(k),cat:cat};
}
function nextLine(){
  if(!L.el)return;
  var ln=pickLine(L.kind),box=L.el.querySelector('.ls-line');
  box.classList.remove('in');void box.offsetWidth;
  box.querySelector('small').textContent=ln.who;box.querySelector('p').textContent=ln.cat==='host'?'"'+ln.text+'"':ln.text;
  box.className='ls-line in c-'+ln.cat;
}
function titleOf(kind){
  if(kind.indexOf('road')===0){var n=+kind.slice(4)||0;return window.UI&&UI.tractName?UI.tractName(n):'';}
  return t('ls.'+kind);
}
function tick(now){
  if(!L.on){L.raf=0;return;}
  var dt=Math.min(0.1,(now-(L.tPrev||now))/1000);L.tPrev=now;
  /* полоса догоняет реальный прогресс, а без новостей медленно ползёт к 92% */
  var goal=Math.max(L.p,Math.min(0.92,L.shownP+dt*0.012));
  L.shownP+=(goal-L.shownP)*Math.min(1,dt*4);
  L.el.style.setProperty('--p',L.shownP.toFixed(3));
  L.el.querySelector('.ls-pct').textContent=Math.round(L.shownP*100)+'%';
  L.lineT+=dt;if(L.lineT>7){L.lineT=0;nextLine();}
  L.raf=requestAnimationFrame(tick);
}
function show(kind){
  build();clearTimeout(L.hideT);
  if(L.on&&L.kind===kind)return;
  var img=L.el.querySelector('.ls-bg img'),src=art('load_'+kind+'.webp');
  if(!L.on||L.kind!==kind){L.el.classList.remove('has-img');img.removeAttribute('src');img.src=src;}
  L.el.querySelector('.ls-title').textContent=titleOf(kind);
  L.el.className='ls on k-'+kind.replace(/\d+$/,'')+' k-'+kind+(img.complete&&img.naturalWidth?' has-img':'');
  if(!L.on){L.p=0;L.shownP=0;L.shownAt=performance.now();L.lineT=0;nextLine();}
  L.kind=kind;L.on=true;
  if(!L.raf){L.tPrev=0;L.raf=requestAnimationFrame(tick);}
}
function progress(p){if(p>=0)L.p=Math.max(L.p,Math.min(1,p));}
function hide(now){
  if(!L.on)return;
  var wait=now?0:Math.max(0,900-(performance.now()-L.shownAt));
  clearTimeout(L.hideT);
  L.hideT=setTimeout(function(){
    L.p=1;L.shownP=1;if(L.el){L.el.style.setProperty('--p','1');L.el.querySelector('.ls-pct').textContent='100%';}
    setTimeout(function(){L.on=false;L.kind='';if(L.el)L.el.classList.remove('on');},180);
  },wait);
}

/* ════════ ПРОЛОГ ════════ */
var P=null;
function prologue(done){
  if(P)return;
  var box=document.createElement('div');box.className='pro';
  var dots='';for(var i=0;i<SLIDES;i++)dots+='<i></i>';
  box.innerHTML='<div class="pro-art"><img alt=""><div class="pro-ph"></div></div>'+
    '<div class="pro-txt"><div class="pro-dots">'+dots+'</div><h3></h3><p></p>'+
    '<div class="pro-btns"><button type="button" class="btn ghost" data-a="skip">'+t('pro.skip')+'</button><button type="button" class="btn" data-a="next"></button></div></div>';
  document.body.appendChild(box);
  P={box:box,i:-1,done:done};
  for(var k=0;k<SLIDES;k++){var im=new Image();im.src=art('pro'+(k+1)+'.webp');}
  box.addEventListener('click',function(e){
    var b=e.target.closest('[data-a]');
    if(b&&b.dataset.a==='skip'){endPrologue();return;}
    if(b&&b.dataset.a==='next'||e.target.closest('.pro-art')){if(P.i>=SLIDES-1)endPrologue();else slide(P.i+1);}
  });
  slide(0);
  requestAnimationFrame(function(){box.classList.add('on');});
}
function slide(i){
  P.i=i;var b=P.box,img=b.querySelector('.pro-art img');
  b.classList.remove('has-img');
  img.onload=function(){b.classList.add('has-img');};img.onerror=function(){b.classList.remove('has-img');};
  img.src=art('pro'+(i+1)+'.webp');
  b.querySelector('.pro-art').className='pro-art s'+i;
  var tx=b.querySelector('.pro-txt');tx.classList.remove('in');void tx.offsetWidth;tx.classList.add('in');
  b.querySelector('h3').textContent=t('pro.h.'+i);b.querySelector('p').textContent=t('pro.t.'+i);
  b.querySelector('[data-a="next"]').textContent=i>=SLIDES-1?t('pro.go'):t('pro.next');
  [].forEach.call(b.querySelectorAll('.pro-dots i'),function(d,k){d.classList.toggle('on',k<=i);});
  if(window.Sound)Sound.sfx('select');
}
function endPrologue(){
  if(!P)return;var p=P;P=null;
  p.box.classList.remove('on');setTimeout(function(){p.box.remove();},350);
  if(p.done)p.done();
}

/* ════════ РАЗГОВОР С ХОЗЯЙКОЙ ════════ */
var G=null;
function dialog(done,opt){
  if(G)return;
  opt=opt||{};
  var box=document.createElement('div');box.className='dlg';
  box.innerHTML='<div class="dlg-box"><div class="dlg-face"><img alt=""></div><div class="dlg-main"><b class="dlg-who"></b><p class="dlg-txt"></p><small class="dlg-tap">'+t('dlg.tap')+'</small></div>'+
    '<button type="button" class="dlg-skip" data-a="skip">'+t('dlg.skip')+'</button></div>';
  document.body.appendChild(box);
  G={box:box,i:-1,done:done,opt:opt,typing:0,full:''};
  box.addEventListener('click',function(e){
    if(e.target.closest('[data-a="skip"]')){endDialog();return;}
    if(G.typing){finishType();return;}
    if(G.i>=DLG.length-1)endDialog();else line(G.i+1);
  });
  line(0);
  requestAnimationFrame(function(){box.classList.add('on');});
}
function line(i){
  G.i=i;var d=DLG[i],b=G.box,who=d[0];
  b.className='dlg on w-'+who;
  var face=b.querySelector('.dlg-face img'),file=who==='host'?'hostess':'mage';
  if(face.dataset.f!==file){face.dataset.f=file;b.classList.remove('has-face');face.onload=function(){if(G)G.box.classList.add('has-face');};face.onerror=function(){};face.src=art(file+'.webp');}
  else if(face.naturalWidth)b.classList.add('has-face');
  b.querySelector('.dlg-who').textContent=t('dlg.'+who);
  G.full=t('dlg.'+d[1]);G.n=0;
  var p=b.querySelector('.dlg-txt');p.textContent='';
  clearInterval(G.typing);
  G.typing=setInterval(function(){
    G.n+=2;p.textContent=G.full.slice(0,G.n);
    if(G.n>=G.full.length)finishType();
  },22);
  if(G.opt.onLine)G.opt.onLine(who,i);
}
function finishType(){if(!G)return;clearInterval(G.typing);G.typing=0;G.box.querySelector('.dlg-txt').textContent=G.full;}
function endDialog(){
  if(!G)return;var g=G;G=null;clearInterval(g.typing);
  g.box.classList.remove('on');setTimeout(function(){g.box.remove();},300);
  if(g.done)g.done();
}

/* текст пролога для книги */
function storyHtml(){
  var h='';for(var i=0;i<SLIDES;i++)h+='<h4>'+esc(t('pro.h.'+i))+'</h4><p>'+esc(t('pro.t.'+i))+'</p>';
  return h;
}

window.LoadScreen={show:show,hide:hide,progress:progress,get isOn(){return L.on;},get kind(){return L.kind;}};
window.Lore={prologue:prologue,dialog:dialog,storyHtml:storyHtml,get busy(){return !!(P||G);},get inPrologue(){return !!P;},get inDialog(){return !!G;}};
})();
