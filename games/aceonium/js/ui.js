/* Aceonium: интерфейс (HUD над сценой, панель вкладок, создание героя, окна).
   Панель строится один раз на вкладку, дальше refresh() только обновляет числа,
   чтобы кнопки не пересоздавались под пальцем. */
(function(){
'use strict';

var D=window.AcData;
var g=null,S=null;
var $=function(id){return document.getElementById(id);};
var t=function(k,v){return I18n.t(k,v);};
/* текст с учётом пола героя: сначала ключ.f */
function tg(k,v){
  if(S&&S.profile&&S.profile.gender==='f'){var f=I18n.t(k+'.f',v);if(f!==k+'.f')return f;}
  return I18n.t(k,v);
}
function units(){return {h:t('u.h'),m:t('u.m'),s:t('u.s')};}
function ft(sec){return D.fmtTime(sec,units());}
function esc(s){return String(s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];});}
function setText(el,v){if(el&&el._t!==v){el._t=v;el.textContent=v;}}
function setHTML(el,v){if(el&&el._h!==v){el._h=v;el.innerHTML=v;}}
function el(tag,cls,html){var e=document.createElement(tag);if(cls)e.className=cls;if(html!==undefined)e.innerHTML=html;return e;}
function pct(x){return Math.round(x*100)+'%';}

/* ── пиксельные иконки умений (16x16) ── */
var ICONS={
  overload:'<path d="M9 1L3 9h4l-1 6 6-8H8z"/>',
  focus:'<path fill-rule="evenodd" d="M7 1h2v2h2v1h1v1h1v2h2v2h-2v2h-1v1h-1v1H9v2H7v-2H5v-1H4v-1H3V9H1V7h2V5h1V4h1V3h2zM7 6v1H6v2h1v1h2V9h1V7H9V6z"/>',
  flurry:'<path d="M1 3h5l3 2-3 2H1l3-2zM4 9h5l3 2-3 2H4l3-2zM8 6h5l2 1-2 1H8l2-1z"/>',
  discharge:'<path d="M7 0h2v5l3-3 1 1-3 3h6v2h-6l3 3-1 1-3-3v5H7v-5l-3 3-1-1 3-3H0V6h6L3 3l1-1 3 3z"/>',
  harvest:'<path d="M3 2h2v3h1V2h2v3h1V2h2v4l-1 1v7H6V7L5 6H3z"/>',
  lock:'<path fill-rule="evenodd" d="M5 2h6v1h1v4h1v8H3V7h1V3h1zM6 4v3h4V4z"/>'
};
function icon(n){return '<svg viewBox="0 0 16 16" aria-hidden="true"><g fill="currentColor">'+ICONS[n]+'</g></svg>';}

/* ── иконки ресурсов: цвет из data.js, форма своя у каждого ── */
var DK='fill="#000" opacity=".3"',WH='fill="#fff" opacity=".55"';
var RES_SVG={
  wood:'<rect x="1" y="5" width="11" height="6" fill="C"/><rect x="11" y="4" width="4" height="8" fill="C"/><rect x="12" y="6" width="2" height="4" '+DK+'/><rect x="3" y="7" width="6" height="1" '+DK+'/>',
  iron:'<path d="M3 6l4-3 5 1 2 5-3 4H5L2 10z" fill="C"/><rect x="6" y="6" width="2" height="2" '+WH+'/><rect x="9" y="9" width="2" height="2" '+WH+'/>',
  herb:'<path d="M3 13C3 7 7 3 13 3c0 6-4 10-10 10z" fill="C"/><path d="M4 12L11 5" stroke="#000" stroke-opacity=".35" stroke-width="1.2"/>',
  hide:'<path d="M4 2h8l2 3-1 3 1 5-3 1H5l-3-1 1-5-1-3z" fill="C"/><rect x="7" y="4" width="2" height="8" '+DK+'/>',
  bone:'<path d="M5 3.5l7.5 7.5" stroke="C" stroke-width="3"/><circle cx="4" cy="3" r="2" fill="C"/><circle cx="3" cy="5" r="2" fill="C"/><circle cx="13" cy="11" r="2" fill="C"/><circle cx="11" cy="13" r="2" fill="C"/>',
  silk:'<rect x="4" y="2" width="8" height="2" fill="#a07850"/><rect x="4" y="12" width="8" height="2" fill="#a07850"/><rect x="5" y="4" width="6" height="8" fill="C"/><path d="M5 6h6M5 8h6M5 10h6" stroke="#000" stroke-opacity=".2"/>',
  spore:'<path d="M2 8a6 5 0 0 1 12 0z" fill="C"/><rect x="6" y="8" width="4" height="6" fill="#efe6d8"/><circle cx="6" cy="5.5" r="1" '+WH+'/><circle cx="10" cy="6" r="1" '+WH+'/>',
  ecto:'<path d="M8 1c3 4 5 6 5 9a5 5 0 0 1-10 0c0-3 2-5 5-9z" fill="C"/><circle cx="6.5" cy="10" r="1.5" '+WH+'/>',
  crystal:'<path d="M8 1l4 5-4 9-4-9z" fill="C"/><path d="M8 1v14M4 6h8" stroke="#fff" stroke-opacity=".45"/>',
  silver:'<path d="M2 11l3-5h6l3 5z" fill="C"/><path d="M5 6h6l-1 2H6z" '+WH+'/>',
  ironwood:'<rect x="1" y="5" width="11" height="6" fill="C"/><rect x="11" y="4" width="4" height="8" fill="C"/><rect x="5" y="4" width="2" height="8" fill="#d0d8e4"/><rect x="12" y="6" width="2" height="4" '+DK+'/>',
  amber:'<path d="M8 14L2 8a3.2 3.2 0 0 1 6-4 3.2 3.2 0 0 1 6 4z" fill="C"/><circle cx="5.5" cy="6.5" r="1" fill="#fff" opacity=".8"/>',
  pearl:'<circle cx="8" cy="8" r="5.5" fill="C"/><circle cx="6" cy="6" r="1.6" fill="#fff"/>',
  starice:'<path d="M8 1l2 5h5l-4 3 2 6-5-4-5 4 2-6-4-3h5z" fill="C"/>'
};
function resIcon(id,cls){
  var r=D.RES_BY[id];if(!r)return '';
  return '<svg class="ri'+(r.rare?' rare':'')+(cls?' '+cls:'')+'" viewBox="0 0 16 16" aria-hidden="true">'+RES_SVG[id].replace(/"C"/g,'"'+r.c+'"')+'</svg>';
}
var BAG_SVG='<svg class="bag-ico" viewBox="0 0 16 16" aria-hidden="true"><path d="M6 2h4v2h2l2 3v7H2V7l2-3h2z" fill="#c08452"/><rect x="5" y="7" width="6" height="2" fill="#000" opacity=".3"/><rect x="7" y="2" width="2" height="2" fill="#5a3a22"/></svg>';
/* стоимость: иконки с количеством, нехватка красным */
function costHtml(cost){
  if(!cost)return '';
  var h='';
  for(var k in cost){var ok=g.have(k)>=cost[k];h+='<span class="cst'+(ok?'':' no')+'">'+resIcon(k)+D.fmt(cost[k])+'</span>';}
  return h;
}
function resList(map){
  var h='';for(var k in map)if(map[k])h+='<span class="cst">'+resIcon(k)+D.fmt(map[k])+'</span>';
  return h||'<span class="note">'+t('st.none')+'</span>';
}
function tractName(i){return t('tr.'+D.TRACTS[i].id);}

/* ════════ HUD ════════ */
var H={};
function initHud(){
  ['h-level','h-wave','h-dots','h-bag','h-bag-bar','h-rate','h-fat-state','h-fat-pct','h-fat-bar','h-fat-note','h-place','h-rested',
   'enemy','en-name','en-hp','en-hp-txt','mhp','mhp-l','mhp-bar','mhp-rage',
   'rest','rest-txt','rest-time','rest-craft','rest-road','rest-tav','skills','fx','stage'].forEach(function(id){H[id]=$(id);});
  var dots='';for(var i=0;i<10;i++)dots+='<i'+(i===9?' class="b"':'')+'></i>';H['h-dots'].innerHTML=dots;
  H.dots=[].slice.call(H['h-dots'].children);
  $('h-bag-i').innerHTML=BAG_SVG;
  H['h-place'].addEventListener('click',function(){if(S.place==='road')g.goHome();else g.goTrip();});
  H['rest-road'].addEventListener('click',function(){g.goTrip();});
  H['rest-tav'].addEventListener('click',function(){g.sleepNow();});
  /* умения */
  H.sk=[];
  D.SKILLS.forEach(function(s){
    var b=el('button','sk-btn','<span class="sk-ico">'+icon(s.id)+'</span><span class="sk-cd"></span><span class="sk-key">'+s.key+'</span><span class="sk-t"></span>');
    b.type='button';
    b.addEventListener('click',function(e){e.stopPropagation();g.useSkill(s.id);});
    H.skills.appendChild(b);
    H.sk.push({s:s,b:b,ico:b.querySelector('.sk-ico'),t:b.querySelector('.sk-t')});
  });
}
function refreshHud(){
  var R=g.R,tr=S.trip,road=S.place==='road';
  setText(H['h-level'],road&&tr?tractName(tr.t):S.place==='sleep'?t('hud.sleep'):t('hud.home'));
  if(road&&tr)setText(H['h-wave'],tr.boss?t('hud.bossWave',{w:tr.w}):t('hud.wave',{w:tr.w,m:Math.min(tr.m+1,D.MOBS),n:D.MOBS}));
  else setText(H['h-wave'],t('hud.mlvl',{n:S.mlvl}));
  var w=road&&tr?tr.w:0,dec=Math.floor((Math.max(1,w)-1)/10)*10,cur=w?w-dec-1:-1;
  H.dots.forEach(function(d,i){
    var cls=(i===9?'b':'')+(i<cur?' done':'')+(i===cur?' cur':'');
    if(d._c!==cls){d._c=cls;d.className=cls;}
  });
  H['h-dots'].classList.toggle('hidden',!road);
  var rb=S.rested>0&&road;
  H['h-rested'].classList.toggle('hidden',!rb);
  if(rb)setText(H['h-rested'],t('hud.rested',{m:D.REST_BUFF_MULT,t:ft(S.rested)}));
  /* сумка */
  var n=tr?tr.n:0,cap=g.bagCap();
  setText(H['h-bag'],n+' / '+cap);
  H['h-bag-bar'].style.width=Math.min(100,n/cap*100).toFixed(1)+'%';
  H['h-bag'].parentNode.classList.toggle('full',n>=cap);
  setText(H['h-rate'],t('hud.dps')+' '+D.fmt(g.dps())+'  '+t('hud.click')+' '+D.fmt(g.clickDmg()));
  /* усталость */
  var f=S.fatigue,st=D.fatigueState(f);
  var label=S.place==='sleep'?t('fat.sleep'):S.place==='home'?t('fat.home'):tg('fat.'+st);
  setText(H['h-fat-state'],label);
  setText(H['h-fat-pct'],Math.floor(f*100)+'%');
  H['h-fat-bar'].style.width=(f*100).toFixed(1)+'%';
  var fc='fat-'+(S.place==='sleep'?'rest':st);
  if(H['h-fat-bar']._c!==fc){H['h-fat-bar']._c=fc;H['h-fat-bar'].className=fc;}
  var restLeft=f*g.restH()*3600/g.fatigueScale;
  if(S.place==='sleep')setText(H['h-fat-note'],t('fat.up',{t:ft(restLeft)}));
  else setText(H['h-fat-note'],t('fat.dmg',{p:Math.round(D.fatigueMult(f)*100)}));
  setText(H['h-place'],road?t('btn.home'):t('btn.trip'));
  H['h-place'].disabled=road&&g.inBoss();
  /* дом и сон */
  H.rest.classList.toggle('hidden',road);
  if(!road){
    if(S.place==='sleep'){
      setText(H['rest-txt'],tg('rest.sleep'));
      setText(H['rest-time'],tg('rest.up',{t:ft(restLeft)})+'. '+t('rest.early'));
      setHTML(H['rest-craft'],t('rest.charge',{t:ft(g.restBuffFor(S.charge)),m:D.REST_BUFF_MULT}));
    }else{
      setText(H['rest-txt'],tg('rest.home'));
      var nx=S.sleepAfter||f>=0.999?t('rest.toSleep'):S.auto?t('rest.next',{t:tractName(nextTractPeek()),s:Math.ceil(Math.max(0,R.homeT))}):t('rest.wait');
      setText(H['rest-time'],nx);
      setHTML(H['rest-craft'],'');
    }
    H['rest-craft'].classList.toggle('hidden',S.place!=='sleep');
    setText(H['rest-road'],t('btn.trip'));
    setText(H['rest-tav'],t('btn.sleep'));
    H['rest-tav'].classList.toggle('hidden',S.place!=='home');
    H['rest-tav'].disabled=f<0.02;
  }
  /* враг */
  var e=R.enemy,showE=!!(road&&e&&(R.phase==='fight'||(R.phase==='walk'&&e.boss)));
  H.enemy.classList.toggle('hidden',!showE);
  if(showE){
    setHTML(H['en-name'],(e.boss?t('en.boss')+' · ':'')+esc(t(e.name))+' '+resIcon(e.res)+' · '+t('hud.waveShort')+' '+e.L);
    H['en-hp'].style.width=(e.hp/e.max*100).toFixed(1)+'%';
    setText(H['en-hp-txt'],D.fmt(e.hp)+' / '+D.fmt(e.max));
    H.enemy.classList.toggle('boss',!!e.boss);
    var bt=e.boss&&R.phase==='fight';
    H.mhp.classList.toggle('hidden',!bt);
    if(bt){
      var mx=g.maxHp();
      H['mhp-bar'].style.width=(Math.max(0,R.mhp)/mx*100).toFixed(1)+'%';
      setText(H['mhp-l'],(S.profile?S.profile.name:'')+' '+D.fmt(R.mhp)+' / '+D.fmt(mx));
      H['mhp-rage'].classList.toggle('hidden',R.bossT<=D.RAGE_T);
      setText(H['mhp-rage'],t('boss.rage'));
    }
  }
  /* умения */
  H.sk.forEach(function(x){
    var st=S.skills[x.s.id],un=g.skillUnlocked(x.s);
    var state=!un?'locked':st.act>0?'act':st.cd>0?'cd':'ready';
    if(x.b._st!==state){x.b._st=state;x.b.className='sk-btn '+state;x.ico.innerHTML=icon(un?x.s.id:'lock');}
    var full=g.skillCd(x.s);
    x.b.style.setProperty('--cd',state==='cd'?(st.cd/full).toFixed(3):state==='act'&&x.s.dur?(st.act/x.s.dur).toFixed(3):'0');
    setText(x.t,!un?t('sk.lockedShort',{n:x.s.unlock}):state==='cd'?ft(st.cd):state==='act'?Math.ceil(st.act)+t('u.s'):'');
    x.b.title=t('sk.'+x.s.id)+': '+t('sk.'+x.s.id+'.d',skillVars(x.s));
  });
}
/* какой тракт будет следующим (без изменения плана) */
function nextTractPeek(){
  if(S.forceNext!==null&&S.forceNext!==undefined)return S.forceNext;
  var p=S.plan,i=p.i,done=p.done;
  while(i<D.TRACTS.length){if(p.c[i]>done&&g.tractOpen(i))return i;i++;done=0;}
  return g.tractOpen(S.lastTract)?S.lastTract:0;
}
function skillVars(s){
  var p=g.skillPow(s.id);
  return {p:s.id==='focus'?Math.round(p*100):(Math.round(p*100)/100),d:s.dur};
}

/* ── всплывающие цифры и добыча ── */
var fxCount=0;
function pop(cls,text,x,y,html){
  if(fxCount>45&&cls.indexOf('crit')<0&&cls.indexOf('loot')<0)return;
  var d=el('div','pop '+cls);if(html)d.innerHTML=text;else d.textContent=text;
  d.style.left=x+'px';d.style.top=y+'px';
  H.fx.appendChild(d);fxCount++;
  setTimeout(function(){d.remove();fxCount--;},1200);
}
function enemyPos(){
  var p=window.Scene3D&&Scene3D.ready?Scene3D.enemyScreen():null;
  if(!p){var r=H.stage.getBoundingClientRect();p={x:r.width*0.68,y:r.height*0.42};}
  return p;
}
function onHit(h){
  var p=enemyPos();
  pop(h.big?'big':h.crit?'crit':h.click?'clk':'stf',D.fmt(h.dmg)+(h.crit?'!':''),p.x+(Math.random()-0.5)*70,p.y+(Math.random()-0.5)*20);
}
var lootQ=0;
function onLoot(l){
  var p=enemyPos(),k=lootQ++;
  setTimeout(function(){lootQ=Math.max(0,lootQ-1);pop('loot','+'+l.n+' '+resIcon(l.res),p.x+(Math.random()-0.5)*40,p.y-10,true);},Math.min(k,8)*90);
  var b=H['h-bag'].parentNode;b.classList.remove('bump');void b.offsetWidth;b.classList.add('bump');
}
function onKill(){}
function onMageHit(h){
  var p=window.Scene3D&&Scene3D.mageScreen?Scene3D.mageScreen():null;
  if(!p){var r=H.stage.getBoundingClientRect();p={x:r.width*0.3,y:r.height*0.6};}
  pop('hurt','-'+D.fmt(h.dmg),p.x+(Math.random()-0.5)*30,p.y);
  H.stage.classList.remove('hurt');void H.stage.offsetWidth;H.stage.classList.add('hurt');
}
function onHome(r){
  if(r.why==='defeat'){banner(t('boss.fail'),t('home.lostBag',{n:r.lost}),'red');return;}
  var txt=t('home.back',{n:r.n})+' · '+t('why.'+r.why);
  if(r.over)txt+=' · '+t('home.over',{n:r.over});
  toast(txt);
}
function banner(text,sub,cls){
  var b=el('div','banner '+(cls||''),'<b>'+esc(text)+'</b>'+(sub?'<small>'+esc(sub)+'</small>':''));
  H.stage.appendChild(b);
  setTimeout(function(){b.remove();},2200);
}
function ripple(x,y){
  var r=el('i','ripple');r.style.left=x+'px';r.style.top=y+'px';H.fx.appendChild(r);
  setTimeout(function(){r.remove();},450);
}
var toastT=null;
function toast(text){
  var tEl=$('toast');tEl.textContent=text;tEl.classList.add('show');
  clearTimeout(toastT);toastT=setTimeout(function(){tEl.classList.remove('show');},3000);
}

/* ── окно ── */
function modal(title,body,buttons){
  var m=$('modal');
  m.querySelector('h3').textContent=title;
  m.querySelector('.m-body').innerHTML=body;
  var bx=m.querySelector('.m-btns');bx.innerHTML='';
  (buttons||[{text:t('ok')}]).forEach(function(b){
    var e=el('button','btn'+(b.cls?' '+b.cls:''));e.type='button';e.textContent=b.text;
    e.addEventListener('click',function(){m.classList.add('hidden');if(b.fn)b.fn();});
    bx.appendChild(e);
  });
  m.classList.remove('hidden');
}

/* ════════ ПАНЕЛЬ ════════ */
var TABS=['path','store','work','skills','wardrobe','stats'];
var curTab='path',rows=[],tabCleanup=null;

/* строка улучшения: o.cost() даёт ресурсы {wood:3} или {points:n} */
function row(o){
  var r=el('div','row'+(o.cls?' '+o.cls:''));
  r.innerHTML='<div class="row-main"><div class="row-t"><b></b><span class="row-l"></span></div><div class="row-i"></div><div class="row-s"></div></div>'+
    '<button type="button" class="buy"><span class="b-t"></span><span class="b-c"></span></button>';
  var q={t:r.querySelector('.row-t b'),l:r.querySelector('.row-l'),i:r.querySelector('.row-i'),s:r.querySelector('.row-s'),b:r.querySelector('.buy'),bt:r.querySelector('.b-t'),bc:r.querySelector('.b-c')};
  q.b.addEventListener('click',function(){if(o.buy()){Sound.sfx('select');refresh();}});
  var api={el:r,update:function(){
    setText(q.t,o.title());
    setText(q.l,o.lvl?o.lvl():'');
    setHTML(q.i,o.info?o.info():'');
    setHTML(q.s,o.sub?o.sub():'');
    q.s.classList.toggle('hidden',!o.sub);
    var done=o.done&&o.done(),locked=o.locked&&o.locked();
    setText(q.bt,done?t('buy.done'):locked?t('locked'):o.btn?o.btn():t('buy.up'));
    var cost=done||locked?null:o.cost(),can=false;
    if(cost&&cost.points!==undefined){setHTML(q.bc,t('sk.pts',{n:cost.points}));can=g.skillPoints()>=cost.points;}
    else{setHTML(q.bc,costHtml(cost));can=!!cost&&g.canPay(cost);}
    q.b.disabled=done||locked||!can;
    r.classList.toggle('dim',!!(done||locked));
  }};
  return api;
}
function block(html,cls){var b=el('div','blk'+(cls?' '+cls:''),html);return {el:b,update:function(){}};}
function liveBlock(fn,cls){var b=el('div','blk'+(cls?' '+cls:''));return {el:b,update:function(){setHTML(b,fn());}};}

function buildTab(){
  if(tabCleanup){tabCleanup();tabCleanup=null;}
  var body=$('tab-body');body.innerHTML='';rows=[];
  ({path:tabPath,store:tabStore,work:tabWork,skills:tabSkills,wardrobe:tabWardrobe,stats:tabStats})[curTab](body);
  rows.forEach(function(r){body.appendChild(r.el);});
  refresh();
}
function add(r){rows.push(r);return r;}

/* ── вкладка ПУТЬ: маг, статус, план походов ── */
function mageHead(){
  var p=S.profile||{name:'',gender:'m'},need=D.xpNeed(S.mlvl);
  return '<div class="hero-head"><b>'+esc(p.name)+'</b><span>'+t('hud.mlvl',{n:S.mlvl})+'</span></div>'+
    '<div class="bar xp"><i style="width:'+Math.min(100,S.xp/need*100).toFixed(1)+'%"></i></div>'+
    '<p class="note">'+t('mage.stats',{d:D.fmt(g.dps()),h:D.fmt(g.maxHp()),x:D.fmt(S.xp),n:D.fmt(need)})+'</p>';
}
function statusLine(){
  var tr=S.trip;
  if(S.place==='road'&&tr)return tg('st.road',{t:tractName(tr.t),w:tr.w,n:tr.n,c:g.bagCap()});
  if(S.place==='sleep')return tg('st.sleep',{t:ft(S.fatigue*g.restH()*3600/g.fatigueScale)});
  return tg('st.home');
}
function planLine(){
  var left=g.planLeft();
  return left>0?t('plan.left',{n:left}):t('plan.empty',{t:tractName(nextTractPeek())});
}
function tabPath(){
  add(liveBlock(mageHead,'hero-blk'));
  add(liveBlock(function(){return '<p class="status">'+statusLine()+'</p><p class="note">'+planLine()+'</p>';}));
  /* переключатели */
  var sw=el('div','blk toggles');
  sw.innerHTML='<label class="chk"><input type="checkbox" id="p-caut"><span>'+t('opt.cautious')+'</span></label><p class="note">'+t('opt.cautiousD')+'</p>'+
    '<label class="chk"><input type="checkbox" id="p-auto"><span>'+t('opt.auto')+'</span></label><p class="note">'+t('opt.autoD')+'</p>';
  sw.querySelector('#p-caut').addEventListener('change',function(){g.setCautious(this.checked);});
  sw.querySelector('#p-auto').addEventListener('change',function(){g.setAuto(this.checked);});
  add({el:sw,update:function(){sw.querySelector('#p-caut').checked=!!S.cautious;sw.querySelector('#p-auto').checked=!!S.auto;}});
  add(block('<div class="lbl full">'+t('plan.title')+'</div><p class="note">'+t('plan.hint')+'</p>'));
  D.TRACTS.forEach(function(T,i){add(tractCard(T,i));});
}
function tractCard(T,i){
  var c=el('div','tract');
  c.innerHTML='<div class="tr-head"><b></b><span class="tr-st"></span></div><div class="tr-res"></div><div class="tr-info"></div>'+
    '<div class="tr-ctl"><div class="stepper"><button type="button" data-d="-1">-</button><span class="tr-n"></span><button type="button" data-d="1">+</button></div>'+
    '<button type="button" class="btn sm tr-go"></button></div>';
  var q={b:c.querySelector('.tr-head b'),st:c.querySelector('.tr-st'),res:c.querySelector('.tr-res'),info:c.querySelector('.tr-info'),n:c.querySelector('.tr-n'),go:c.querySelector('.tr-go'),ctl:c.querySelector('.tr-ctl')};
  c.querySelector('.stepper').addEventListener('click',function(e){var b=e.target.closest('button');if(!b)return;g.setPlan(i,S.plan.c[i]+(+b.dataset.d));Sound.sfx('select');refresh();});
  q.go.addEventListener('click',function(){if(g.goTo(i)){Sound.sfx('select');toast(t('plan.goNow',{t:tractName(i)}));}refresh();});
  setHTML(q.res,T.res.map(function(r){return '<span class="cst">'+resIcon(r)+t('res.'+r)+'</span>';}).join('')+'<span class="cst rare">'+resIcon(T.rare)+t('res.'+T.rare)+'</span>');
  return {el:c,update:function(){
    var open=g.tractOpen(i),st=S.tracts[i],cl=st.clears>0,here=S.place==='road'&&S.trip&&S.trip.t===i;
    setText(q.b,tractName(i));
    setText(q.st,!open?t('tr.locked'):here?t('tr.here'):cl?t('tr.cleared',{n:st.clears}):st.best?t('tr.best',{w:st.best}):t('tr.new'));
    c.classList.toggle('lock',!open);c.classList.toggle('here',!!here);
    var c0=D.chance(1,cl),c1=D.chance(100,cl);
    setHTML(q.info,open?
      t('tr.rec',{a:D.fmt(D.recDps(i,1)),b:D.fmt(D.recDps(i,100)),la:D.recLevel(i,1),lb:D.recLevel(i,100)})+'<br>'+
      t('tr.chance',{a:pct(c0),b:pct(c1)})+(cl?'':' <small>'+t('tr.chanceUp')+'</small>'):
      t('tr.need',{t:tractName(i-1)}));
    q.ctl.classList.toggle('hidden',!open);
    setText(q.n,t('plan.times',{n:S.plan.c[i]}));
    setText(q.go,here?t('tr.going'):t('tr.go'));
    q.go.disabled=!!here||(S.place==='road'&&g.inBoss());
  }};
}

/* ── вкладка СКЛАД ── */
function tabStore(){
  add(liveBlock(function(){
    var cap=g.storeCap(),h='<div class="lbl full">'+t('store.title')+'</div><p class="note">'+t('store.cap',{n:D.fmt(cap)})+'</p><div class="res-grid">';
    D.RES.forEach(function(r){
      var n=g.have(r.id);
      h+='<div class="res-tile'+(n>=cap?' full':'')+(n?'':' zero')+'">'+resIcon(r.id)+'<span>'+t('res.'+r.id)+'</span><b>'+D.fmt(n)+'</b></div>';
    });
    return h+'</div>';
  }));
  add(liveBlock(function(){
    if(!S.trip)return '';
    return '<div class="lbl full">'+t('store.bag',{n:S.trip.n,c:g.bagCap()})+'</div><div class="res-line">'+resList(S.trip.bag)+'</div>';
  }));
  add(liveBlock(function(){
    var h='<div class="lbl full">'+t('jr.title')+'</div>';
    if(!S.journal.length)return h+'<p class="note">'+t('jr.empty')+'</p>';
    S.journal.slice(0,15).forEach(function(j){
      h+='<div class="jr'+(j.why==='defeat'?' bad':'')+'"><div class="jr-top"><b>'+tractName(j.t)+'</b><span>'+t('jr.wave',{w:j.w})+' · '+ft(j.dur||0)+'</span></div>'+
        '<div class="jr-why">'+t('why.'+j.why)+(j.why==='defeat'?' · '+t('jr.lost',{n:j.lost}):' · +'+j.n+(j.over?' · '+t('home.over',{n:j.over}):''))+'</div>'+
        (j.why==='defeat'?'':'<div class="res-line">'+resList(j.got)+'</div>')+'</div>';
    });
    return h;
  }));
}

/* ── вкладка МАСТЕРСКАЯ (до мастеров таверны маг улучшает вещи сам) ── */
function tabWork(){
  add(block('<p class="note">'+t('work.hint')+'</p>'));
  add(row({title:function(){return t('work.staff');},lvl:function(){return t('row.lvl',{n:S.staff});},
    info:function(){
      var tier=D.staffTier(S.staff),col=D.TIER_COLORS[tier%D.TIER_COLORS.length];
      return '<span class="tier" style="--tc:'+col+'"></span>'+t('work.staffI',{v:D.fmt(g.rawDps()),n:D.fmt(D.staffDps(S.staff+1,S.mlvl))})+'<br><small>'+t('work.tier',{n:tier+1,l:(tier+1)*10})+'</small>';
    },
    cost:function(){return g.staffCost();},buy:function(){return g.buyStaff();}}));
  add(row({title:function(){return t('work.bag');},lvl:function(){return t('row.lvlMax',{n:S.bagLvl,m:D.BAG.length});},
    info:function(){var b=g.bag(),n=D.BAG[S.bagLvl];return t('work.bagI',{c:b.cap,p:pct(b.pick)})+(n?'<br><small>'+t('work.next',{s:t('work.bagI',{c:n.cap,p:pct(n.pick)})})+'</small>':'');},
    sub:function(){return t('work.bagS');},
    done:function(){return S.bagLvl>=D.BAG.length;},cost:function(){return g.bagCost();},buy:function(){return g.buyBag();}}));
  add(row({title:function(){return t('work.store');},lvl:function(){return t('row.lvlMax',{n:S.storeLvl,m:D.STORE.length});},
    info:function(){var n=D.STORE[S.storeLvl];return t('work.storeI',{c:D.fmt(g.storeCap())})+(n?'<br><small>'+t('work.next',{s:t('work.storeI',{c:D.fmt(n.cap)})})+'</small>':'');},
    done:function(){return S.storeLvl>=D.STORE.length;},cost:function(){return g.storeCost();},buy:function(){return g.buyStore();}}));
}

function tabSkills(){
  add(liveBlock(function(){return '<p>'+t('sk.points',{n:g.skillPoints()})+'</p><p class="note">'+t('sk.hint')+'</p>';}));
  D.SKILLS.forEach(function(s){
    add(row({cls:'sk-row',title:function(){return t('sk.'+s.id);},
      lvl:function(){return g.skillUnlocked(s)?t('row.lvlMax',{n:S.skills[s.id].l,m:D.SKILL_MAX}):'';},
      info:function(){
        if(!g.skillUnlocked(s))return t('sk.locked',{n:s.unlock});
        return t('sk.'+s.id+'.d',skillVars(s))+'<br><small>'+t('sk.cd',{t:ft(g.skillCd(s))})+'</small>';
      },
      locked:function(){return !g.skillUnlocked(s);},done:function(){return g.skillUnlocked(s)&&S.skills[s.id].l>=D.SKILL_MAX;},
      cost:function(){return {points:g.skillUpCost(s.id)};},buy:function(){return g.buySkill(s.id);}}));
  });
}

/* ── гардероб ── */
var NAME_RE=null;
try{NAME_RE=new RegExp('^[\\p{L}\\p{N}][\\p{L}\\p{N} \\-]{0,14}[\\p{L}\\p{N}]$','u');}catch(e){NAME_RE=/^[^\s<>"&][^<>"&]{0,14}[^\s<>"&]$/;}
function validName(n){return NAME_RE.test(n)&&!/  /.test(n);}
function look(gender,robeId){var r=D.robe(robeId);return {gender:gender,robe:r.c,trim:r.t};}

function tabWardrobe(body){
  var wrap=el('div','wd');
  wrap.innerHTML='<div class="wd-form full"><div class="lbl">'+t('wd.name')+'</div><div class="name-row"><input id="wd-name" maxlength="16" autocomplete="off" spellcheck="false"><button type="button" class="btn sm" id="wd-save">'+t('wd.save')+'</button></div>'+
    '<div class="err hidden" id="wd-err">'+t('cr.nameErr')+'</div></div>'+
    '<button type="button" class="btn big full wd-open" id="wd-open">'+t('wd2.open')+'</button>'+
    '<p class="note full">'+t('wd2.about8')+'</p>';
  body.appendChild(wrap);
  var inp=$('wd-name');inp.value=S.profile.name;
  $('wd-save').addEventListener('click',function(){
    var n=inp.value.trim();
    if(!validName(n)){$('wd-err').classList.remove('hidden');return;}
    $('wd-err').classList.add('hidden');g.setProfile(n,S.profile.gender);toast(t('wd.saved'));refresh();
  });
  $('wd-open').addEventListener('click',function(){
    if(!window.Wardrobe||!window.ACE_THREE){toast(t('no3d'));return;}
    Wardrobe.open({mode:'edit',look:S.look,onDone:function(look){g.setLook(look);refresh();}});
  });
}

function tabStats(body){
  var gb=el('div','blk');
  var opts=['auto','low','medium','high','ultra'];
  gb.innerHTML='<div class="lbl full">'+t('gfx.title')+'</div><div class="seg gfx" id="gfx-seg">'+
    opts.map(function(o){return '<button type="button" data-q="'+o+'">'+t('gfx.'+o)+'</button>';}).join('')+'</div><p class="note" id="gfx-note"></p>';
  gb.addEventListener('click',function(e){var b=e.target.closest('button[data-q]');if(!b)return;UI.setGfx(b.dataset.q);Sound.sfx('select');refresh();});
  add({el:gb,update:function(){
    [].forEach.call(gb.querySelectorAll('button'),function(b){b.classList.toggle('sel',b.dataset.q===S.settings.gfx);});
    var now=UI.gfxNow&&UI.gfxNow();
    setText($('gfx-note'),now?t('gfx.now',{q:t('gfx.'+now)})+(window.acFps?' · '+window.acFps+' FPS':'')+'. '+t('gfx.d.'+now):t('no3d'));
  }});
  add(liveBlock(function(){
    var s=S.stats,L=[
      ['st.trips',s.trips],['st.kills',D.fmt(s.kills)],['st.bosses',s.bosses],['st.bossFails',s.bossFails],
      ['st.gathered',D.fmt(s.gathered)],['st.lostBags',s.lostBags],['st.lostItems',D.fmt(s.lostItems)],['st.clicks',D.fmt(s.clicks)],
      ['st.play',ft(s.play)],['st.rest',ft(s.rest)],['st.clears',S.tracts.reduce(function(a,x){return a+x.clears;},0)]];
    return '<div class="lbl full">'+t('st.title')+'</div><table class="stats">'+L.map(function(x){return '<tr><td>'+t(x[0])+'</td><td>'+x[1]+'</td></tr>';}).join('')+'</table>';
  }));
  var sv=el('div','blk');
  sv.innerHTML='<div class="lbl full">'+t('st.save')+'</div><p class="note">'+t('st.note')+'</p>'+
    '<div class="btn-row"><button type="button" class="btn sm" id="st-exp">'+t('st.export')+'</button><button type="button" class="btn sm" id="st-imp">'+t('st.import')+'</button></div>'+
    '<textarea id="st-txt" rows="3" placeholder="'+esc(t('st.importPh'))+'"></textarea>'+
    '<button type="button" class="btn sm red" id="st-reset">'+t('st.reset')+'</button>';
  add({el:sv,update:function(){}});
  if(window.AC_DEBUG)add(debugBlock());
  setTimeout(function(){
    $('st-exp').addEventListener('click',function(){
      var s=UI.exportSave();$('st-txt').value=s;$('st-txt').select();
      try{navigator.clipboard.writeText(s).then(function(){toast(t('st.copied'));},function(){});}catch(e){}
    });
    $('st-imp').addEventListener('click',function(){
      if(UI.importSave($('st-txt').value.trim()))toast(t('st.importOk'));else toast(t('st.importBad'));
    });
    $('st-reset').addEventListener('click',function(){
      modal(t('st.reset'),'<p>'+t('st.resetConfirm')+'</p>',[{text:t('cancel')},{text:t('yes'),cls:'red',fn:function(){UI.resetSave();}}]);
    });
  },0);
}
function debugBlock(){
  var b=el('div','blk dbg');
  b.innerHTML='<div class="lbl full">'+t('dbg.title')+'</div><div class="btn-row wrap">'+
    '<button class="btn sm" data-d="res">RES +200</button><button class="btn sm" data-d="lvl">MAGE +5</button>'+
    '<button class="btn sm" data-d="staff">STAFF +10</button><button class="btn sm" data-d="wave">WAVE +9</button>'+
    '<button class="btn sm" data-d="fat">FATIGUE 95%</button><button class="btn sm" data-d="scale">TIME SPEED</button>'+
    '<button class="btn sm" data-d="open">OPEN TRACTS</button><button class="btn sm" data-d="off">OFFLINE 3H</button></div><p class="note" id="dbg-s"></p>';
  b.addEventListener('click',function(e){
    var k=e.target.dataset&&e.target.dataset.d;if(!k)return;
    if(k==='res')D.RES.forEach(function(r){S.store[r.id]=Math.min(g.storeCap(),g.have(r.id)+200);});
    if(k==='lvl')for(var i=0;i<5;i++)g.addXp(D.xpNeed(S.mlvl));
    if(k==='staff')S.staff+=10;
    if(k==='wave'&&S.trip&&!S.trip.boss){S.trip.w=Math.min(D.WAVES,S.trip.w+9);S.trip.m=0;}
    if(k==='fat')S.fatigue=0.95;
    if(k==='scale'){g.fatigueScale=g.fatigueScale===1?120:g.fatigueScale===120?3600:1;}
    if(k==='open')S.tracts.forEach(function(x){x.clears=Math.max(1,x.clears);});
    if(k==='off'){S.lastSeen=Date.now()-3*3600*1000;UI.catchUp(3*3600);}
    refresh();
  });
  return {el:b,update:function(){setText($('dbg-s'),'time x'+g.fatigueScale);}};
}

function refresh(){
  if(!g)return;
  rows.forEach(function(r){r.update();});
}

function initPanel(){
  /* кнопка: спрятать / показать панель, чтобы сцена заняла весь экран */
  var tgl=el('button','panel-toggle');tgl.type='button';tgl.id='panel-toggle';
  tgl.innerHTML='<svg viewBox="0 0 8 12" aria-hidden="true"><path d="M2 0h2v2h2v2h2v4H6v2H4v2H2v-2h2V8h2V4H4V2H2z" fill="currentColor"/></svg>';
  function applyPanel(){document.body.classList.toggle('panel-off',!!S.settings.panel);}
  tgl.addEventListener('click',function(e){e.stopPropagation();S.settings.panel=!S.settings.panel;applyPanel();Sound.sfx('select');
    setTimeout(function(){window.dispatchEvent(new Event('resize'));},50);});
  H.stage.appendChild(tgl);applyPanel();
  var tabs=$('tabs');
  TABS.forEach(function(id){
    var b=el('button','tab');b.type='button';b.dataset.tab=id;b.dataset.i18n='tab.'+id;b.textContent=t('tab.'+id);
    b.addEventListener('click',function(){curTab=id;paintTabs();buildTab();Sound.sfx('select');});
    tabs.appendChild(b);
  });
  paintTabs();
}
function paintTabs(){[].forEach.call($('tabs').children,function(b){b.classList.toggle('sel',b.dataset.tab===curTab);});}

/* ════════ СОЗДАНИЕ ГЕРОЯ ════════ */
function showCreate(onDone){
  if(window.Wardrobe&&window.ACE_THREE&&window.Avatar){
    Wardrobe.open({mode:'create',look:Avatar.defaults('m'),onDone:function(look,name){g.setProfile(name,look.gender);g.setLook(look);Sound.sfx('win');onDone();}});
    return;
  }
  /* без 3D: только имя и пол */
  var box=$('create');box.classList.remove('hidden');
  var gender='m';
  box.innerHTML='<div class="cr-box">'+
    '<div class="cr-brand">A.C.EON</div><h1 class="cr-title">ACEONIUM</h1><div class="cr-sub">'+t('cr.sub')+'</div>'+
    '<div class="cr-cols"><div class="cr-form">'+
      '<div class="lbl">'+t('cr.look')+'</div><div class="seg" id="cr-gender"><button type="button" data-g="m" class="sel">'+t('cr.m')+'</button><button type="button" data-g="f">'+t('cr.f')+'</button></div>'+
      '<div class="lbl">'+t('cr.name')+'</div><input id="cr-name" maxlength="16" autocomplete="off" spellcheck="false" placeholder="'+esc(t('cr.namePh'))+'">'+
      '<div class="err hidden" id="cr-err">'+t('cr.nameErr')+'</div>'+
      '<button type="button" class="btn big" id="cr-go" disabled>'+t('cr.go')+'</button>'+
    '</div></div></div>';
  $('cr-gender').addEventListener('click',function(e){var b=e.target.closest('button');if(!b)return;gender=b.dataset.g;
    [].forEach.call(this.children,function(x){x.classList.toggle('sel',x===b);});Sound.sfx('select');});
  var inp=$('cr-name');
  inp.addEventListener('input',function(){var ok=validName(inp.value.trim());$('cr-go').disabled=!ok;$('cr-err').classList.toggle('hidden',ok||inp.value.trim().length<2);});
  inp.addEventListener('keydown',function(e){if(e.key==='Enter'&&!$('cr-go').disabled)$('cr-go').click();});
  $('cr-go').addEventListener('click',function(){
    var n=inp.value.trim();if(!validName(n))return;
    box.classList.add('hidden');box.innerHTML='';
    g.setProfile(n,gender);
    Sound.sfx('win');
    onDone();
  });
  setTimeout(function(){inp.focus();},300);
}

function offlineReport(rep){
  var rows=['<p>'+t('off.away',{t:ft(rep.sec)})+'</p>'];
  if(rep.trips)rows.push('<p>'+tg('off.trips',{n:rep.trips})+'</p>');
  if(rep.sleep>60)rows.push('<p>'+tg('off.sleep',{t:ft(rep.sleep)})+'</p>');
  var any=false;for(var k in rep.got)if(rep.got[k]){any=true;break;}
  rows.push('<p class="lbl">'+t('off.got')+'</p><div class="res-line">'+(any?resList(rep.got):'<span class="note">'+t('st.none')+'</span>')+'</div>');
  if(rep.lostBags)rows.push('<p class="bad">'+t('off.lost',{n:rep.lostBags,i:rep.lost})+'</p>');
  if(rep.over)rows.push('<p class="note">'+t('off.over',{n:rep.over})+'</p>');
  if(S.mlvl>rep.lv0)rows.push('<p>'+t('off.lvl',{a:rep.lv0,b:S.mlvl})+'</p>');
  rows.push('<p class="note">'+statusLine()+'</p>');
  modal(t('off.title'),rows.join(''));
}

function init(game){
  g=game;S=game.S;
  initHud();initPanel();buildTab();
  I18n.onChange(function(){
    [].forEach.call(document.querySelectorAll('[data-i18n]'),function(e){e.textContent=t(e.dataset.i18n);});
    buildTab();
  });
}
function rebuild(){buildTab();}

window.UI={validName:validName,init:init,refresh:function(){refreshHud();refresh();},hud:refreshHud,panel:refresh,rebuild:rebuild,
  onHit:onHit,onKill:onKill,onLoot:onLoot,onMageHit:onMageHit,onHome:onHome,banner:banner,toast:toast,modal:modal,ripple:ripple,
  showCreate:showCreate,offlineReport:offlineReport,resIcon:resIcon,tractName:tractName,
  look:look,t:t,tg:tg,get tab(){return curTab;},
  exportSave:null,importSave:null,resetSave:null,catchUp:null};
})();
