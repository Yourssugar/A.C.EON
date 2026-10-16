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
var COIN='<i class="coin"></i>';
var SHARD='<i class="shard"></i>';

/* ── пиксельные иконки умений (16x16) ── */
var ICONS={
  overload:'<path d="M9 1L3 9h4l-1 6 6-8H8z"/>',
  focus:'<path fill-rule="evenodd" d="M7 1h2v2h2v1h1v1h1v2h2v2h-2v2h-1v1h-1v1H9v2H7v-2H5v-1H4v-1H3V9H1V7h2V5h1V4h1V3h2zM7 6v1H6v2h1v1h2V9h1V7H9V6z"/>',
  flurry:'<path d="M1 3h5l3 2-3 2H1l3-2zM4 9h5l3 2-3 2H4l3-2zM8 6h5l2 1-2 1H8l2-1z"/>',
  discharge:'<path d="M7 0h2v5l3-3 1 1-3 3h6v2h-6l3 3-1 1-3-3v5H7v-5l-3 3-1-1 3-3H0V6h6L3 3l1-1 3 3z"/>',
  harvest:'<path fill-rule="evenodd" d="M5 2h6v1h2v2h1v6h-1v2h-2v1H5v-1H3v-2H2V5h1V3h2zM7 5v1H6v1h1v1h2v1H6v2h1v1h2v-1h1v-1H9V9H7V8h3V6H9V5z"/>',
  lock:'<path fill-rule="evenodd" d="M5 2h6v1h1v4h1v8H3V7h1V3h1zM6 4v3h4V4z"/>'
};
function icon(n){return '<svg viewBox="0 0 16 16" aria-hidden="true"><g fill="currentColor">'+ICONS[n]+'</g></svg>';}

/* ════════ HUD ════════ */
var H={};
function initHud(){
  ['h-level','h-dots','h-farm','h-coins','h-rate','h-fat-state','h-fat-pct','h-fat-bar','h-fat-note','h-place',
   'enemy','en-name','en-hp','en-hp-txt','boss-timer','boss-bar','boss-sec','farm','btn-boss','auto-boss','auto-boss-l',
   'rest','rest-txt','rest-time','rest-road','rest-tav','skills','fx','stage'].forEach(function(id){H[id]=$(id);});
  var dots='';for(var i=0;i<10;i++)dots+='<i'+(i===9?' class="b"':'')+'></i>';H['h-dots'].innerHTML=dots;
  H.dots=[].slice.call(H['h-dots'].children);
  H['h-place'].addEventListener('click',function(){if(S.place==='road')g.goTavern();else g.goRoad();});
  H['rest-road'].addEventListener('click',function(){g.goRoad();});
  H['rest-tav'].addEventListener('click',function(){g.goTavern();});
  H['btn-boss'].addEventListener('click',function(){g.startBoss();});
  H['auto-boss'].addEventListener('change',function(){g.setAutoBoss(H['auto-boss'].checked);});
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
  var R=g.R,L=S.level;
  setText(H['h-level'],t('hud.lvl')+' '+L);
  var dec=Math.floor((L-1)/10)*10,cur=L-dec-1;
  H.dots.forEach(function(d,i){
    var cls=(i===9?'b':'')+(i<cur?' done':'')+(i===cur?' cur':'');
    if(d._c!==cls){d._c=cls;d.className=cls;}
  });
  H['h-farm'].classList.toggle('hidden',!S.farm);
  setText(H['h-farm'],t('hud.farm'));
  setText(H['h-coins'],D.fmt(S.coins));
  setText(H['h-rate'],t('hud.dps')+' '+D.fmt(g.dps())+'  '+t('hud.click')+' '+D.fmt(g.clickDmg()));
  /* усталость */
  var f=S.fatigue,st=D.fatigueState(f);
  var label=S.place==='sit'?t('fat.sit'):S.place==='tavern'?t('fat.tavern'):tg('fat.'+st);
  setText(H['h-fat-state'],label);
  setText(H['h-fat-pct'],Math.floor(f*100)+'%');
  H['h-fat-bar'].style.width=(f*100).toFixed(1)+'%';
  var fc='fat-'+(S.place==='road'?st:'rest');
  if(H['h-fat-bar']._c!==fc){H['h-fat-bar']._c=fc;H['h-fat-bar'].className=fc;}
  var restLeft=0;
  if(S.place==='road')setText(H['h-fat-note'],t('fat.dmg',{p:Math.round(D.fatigueMult(f)*100)}));
  else{
    restLeft=f*g.restH()*3600/(S.place==='sit'?D.ROAD_REST_EFF:1)/g.fatigueScale;
    setText(H['h-fat-note'],t('fat.up',{t:ft(restLeft)}));
  }
  var showPlace=S.place!=='road'||S.tavern;
  H['h-place'].classList.toggle('hidden',!showPlace);
  setText(H['h-place'],S.place==='road'?t('btn.tavern'):t('btn.road'));
  /* отдых */
  H.rest.classList.toggle('hidden',S.place==='road');
  if(S.place!=='road'){
    setText(H['rest-txt'],tg(S.place==='sit'?'rest.sit':'rest.tavern'));
    setText(H['rest-time'],tg('rest.up',{t:ft(restLeft)})+'. '+t('rest.early'));
    setText(H['rest-road'],t('btn.road'));
    setText(H['rest-tav'],t('btn.tavern'));
    H['rest-tav'].classList.toggle('hidden',!(S.place==='sit'&&S.tavern));
  }
  /* враг */
  var e=R.enemy,showE=!!(S.place==='road'&&e&&(R.phase==='fight'||(R.phase==='walk'&&e.boss)));
  H.enemy.classList.toggle('hidden',!showE);
  if(showE){
    setText(H['en-name'],(e.boss?t('en.boss')+' · ':'')+t('mon.'+e.type)+' · '+t('hud.lvl')+' '+e.L);
    H['en-hp'].style.width=(e.hp/e.max*100).toFixed(1)+'%';
    setText(H['en-hp-txt'],D.fmt(e.hp)+' / '+D.fmt(e.max));
    H.enemy.classList.toggle('boss',!!e.boss);
    var bt=e.boss&&R.phase==='fight';
    H['boss-timer'].classList.toggle('hidden',!bt);
    if(bt){H['boss-bar'].style.width=(Math.max(0,R.bossT)/D.BOSS_TIME*100).toFixed(1)+'%';setText(H['boss-sec'],Math.max(0,R.bossT).toFixed(1));}
  }
  /* фарм */
  var showFarm=S.farm&&S.place==='road'&&!(e&&e.boss);
  H.farm.classList.toggle('hidden',!showFarm);
  if(showFarm){setText(H['btn-boss'],t('boss.fight'));setText(H['auto-boss-l'],t('boss.auto'));H['auto-boss'].checked=!!S.autoBoss;}
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
function skillVars(s){
  var p=g.skillPow(s.id);
  return {p:s.id==='focus'?Math.round(p*100):(Math.round(p*10)/10),d:s.dur};
}

/* ── всплывающие цифры и монеты ── */
var fxCount=0;
function pop(cls,text,x,y){
  if(fxCount>45&&cls.indexOf('crit')<0)return;
  var d=el('div','pop '+cls);d.textContent=text;
  d.style.left=x+'px';d.style.top=y+'px';
  H.fx.appendChild(d);fxCount++;
  setTimeout(function(){d.remove();fxCount--;},1000);
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
function onKill(k){
  var p=enemyPos();
  pop('gold','+'+D.fmt(k.coins),p.x,p.y-24);
  var target=$('h-coins').getBoundingClientRect(),st=H.stage.getBoundingClientRect();
  var tx=target.left-st.left+10,ty=target.top-st.top+8;
  for(var i=0;i<(k.boss?10:4);i++){
    (function(i){
      var c=el('i','fly');c.style.left=(p.x+(Math.random()-0.5)*40)+'px';c.style.top=(p.y+30+(Math.random()-0.5)*30)+'px';
      H.fx.appendChild(c);
      setTimeout(function(){c.style.transform='translate('+(tx-parseFloat(c.style.left))+'px,'+(ty-parseFloat(c.style.top))+'px) scale(.6)';c.style.opacity='0.2';},40+i*50);
      setTimeout(function(){c.remove();$('h-coins').parentNode.classList.remove('bump');void $('h-coins').offsetWidth;$('h-coins').parentNode.classList.add('bump');},700+i*50);
    })(i);
  }
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
  clearTimeout(toastT);toastT=setTimeout(function(){tEl.classList.remove('show');},2600);
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
var TABS=['hero','staff','skills','tavern','wardrobe','prestige','stats'];
var curTab='hero',rows=[],tabCleanup=null;

/* строка покупки: всё через функции, refresh() перечитывает */
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
    setText(q.s,o.sub?o.sub():'');
    q.s.classList.toggle('hidden',!o.sub);
    var done=o.done&&o.done(),locked=o.locked&&o.locked();
    setText(q.bt,done?t('buy.done'):locked?t('locked'):o.btn?o.btn():t('buy.up'));
    var cost=done||locked?'':o.cost();
    setHTML(q.bc,cost===''?'':(o.shard?SHARD:COIN)+D.fmt(cost));
    var can=!done&&!locked&&(o.shard?S.prestige.shards:S.coins)>=cost;
    q.b.disabled=!can;
    r.classList.toggle('dim',!!(done||locked));
  }};
  return api;
}
function block(html,cls){var b=el('div','blk'+(cls?' '+cls:''),html);return {el:b,update:function(){}};}
function liveBlock(fn,cls){var b=el('div','blk'+(cls?' '+cls:''));return {el:b,update:function(){setHTML(b,fn());}};}

function buildTab(){
  if(tabCleanup){tabCleanup();tabCleanup=null;}
  var body=$('tab-body');body.innerHTML='';rows=[];
  $('buy-amt').classList.toggle('hidden',!(curTab==='hero'||curTab==='staff'));
  ({hero:tabHero,staff:tabStaff,skills:tabSkills,tavern:tabTavern,wardrobe:tabWardrobe,prestige:tabPrestige,stats:tabStats})[curTab](body);
  rows.forEach(function(r){body.appendChild(r.el);});
  refresh();
}
function add(r){rows.push(r);return r;}

function tabHero(){
  add(liveBlock(function(){
    var p=S.profile||{name:'',gender:'m'};
    return '<div class="hero-head"><b>'+esc(p.name)+'</b><span>'+t('hud.lvl')+' '+S.hero+(S.prestige.count?' · '+t('hero.rebirth',{n:S.prestige.count}):'')+'</span></div>';
  },'hero-blk'));
  add(row({title:function(){return t('hero.power');},lvl:function(){return t('row.lvl',{n:S.hero});},
    info:function(){return t('hero.info',{v:D.fmt(g.clickDmg())});},sub:function(){return t('hero.sub');},
    btn:function(){return t('buy.lvl',{n:g.buyN('hero')});},cost:function(){return g.levelCost('hero',g.buyN('hero'));},
    buy:function(){return g.buyLevels('hero');}}));
  add(row({title:function(){return t('hero.critCh');},lvl:function(){return t('row.lvlMax',{n:S.critCh,m:D.CRIT_CH_MAX});},
    info:function(){return t('hero.critChInfo',{v:Math.round(g.critChance()*100)});},
    done:function(){return S.critCh>=D.CRIT_CH_MAX;},cost:function(){return g.critCost('ch');},buy:function(){return g.buyCrit('ch');}}));
  add(row({title:function(){return t('hero.critMu');},lvl:function(){return t('row.lvlMax',{n:S.critMu,m:D.CRIT_MU_MAX});},
    info:function(){return t('hero.critMuInfo',{v:g.critMult()});},
    done:function(){return S.critMu>=D.CRIT_MU_MAX;},cost:function(){return g.critCost('mu');},buy:function(){return g.buyCrit('mu');}}));
}
function tabStaff(){
  add(row({title:function(){return t('staff.title');},lvl:function(){return t('row.lvl',{n:S.staff});},
    info:function(){
      var tier=D.staffTier(S.staff),col=D.TIER_COLORS[tier%D.TIER_COLORS.length];
      return t('staff.info',{v:D.fmt(g.dps())})+'<br><span class="tier" style="--tc:'+col+'"></span>'+t('staff.tier',{n:tier+1})+'<br><small>'+t('staff.next',{n:(tier+1)*25})+'</small>';
    },
    sub:function(){return t('staff.sub');},
    btn:function(){return t('buy.lvl',{n:g.buyN('staff')});},cost:function(){return g.levelCost('staff',g.buyN('staff'));},
    buy:function(){return g.buyLevels('staff');}}));
}
function tabSkills(){
  add(block('<p class="note">'+t('sk.hint')+'</p>'));
  D.SKILLS.forEach(function(s){
    add(row({cls:'sk-row',title:function(){return t('sk.'+s.id);},
      lvl:function(){return g.skillUnlocked(s)?t('row.lvlMax',{n:S.skills[s.id].l,m:D.SKILL_MAX}):'';},
      info:function(){
        if(!g.skillUnlocked(s))return t('sk.locked',{n:s.unlock});
        return t('sk.'+s.id+'.d',skillVars(s))+'<br><small>'+t('sk.cd',{t:ft(g.skillCd(s))})+'</small>';
      },
      locked:function(){return !g.skillUnlocked(s);},done:function(){return g.skillUnlocked(s)&&S.skills[s.id].l>=D.SKILL_MAX;},
      cost:function(){return g.skillUpCost(s.id);},buy:function(){return g.buySkill(s.id);}}));
  });
}
function tabTavern(){
  add(liveBlock(function(){
    return '<p>'+t('tav.info',{a:g.awakeH(),r:g.restH(),r2:g.restH()/D.ROAD_REST_EFF})+'</p><p class="note">'+t('tav.curve')+'</p>';
  }));
  add(row({title:function(){return t('tav.title');},
    info:function(){return S.tavern?t('tav.owned'):t('tav.desc',{h:g.restH(),h2:g.restH()/D.ROAD_REST_EFF})+(S.maxLevel<=D.TAVERN_LEVEL?'<br><small>'+t('tav.locked',{n:D.TAVERN_LEVEL})+'</small>':'');},
    btn:function(){return t('tav.buy');},
    done:function(){return S.tavern;},locked:function(){return !S.tavern&&S.maxLevel<=D.TAVERN_LEVEL;},
    cost:function(){return D.tavernCost();},buy:function(){var ok=g.buyTavern();if(ok){toast(t('toast.tavern'));buildTab();}return ok;}}));
  if(!S.tavern)return;
  var vals={bed:function(){return g.restH();},amulet:function(){return g.awakeH();},lantern:function(){return Math.round(g.offlineEff()*100);}};
  D.TAVERN_UP.forEach(function(u){
    add(row({title:function(){return t('tav.'+u.id);},lvl:function(){return t('row.lvlMax',{n:S.tav[u.id],m:u.max});},
      info:function(){return t('tav.'+u.id+'.i',{v:vals[u.id]()});},
      done:function(){return S.tav[u.id]>=u.max;},cost:function(){return u.cost(S.tav[u.id]);},buy:function(){return g.buyTavUp(u.id);}}));
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
    '<p class="note full">'+t('wd2.about')+'</p>';
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

function tabPrestige(){
  add(liveBlock(function(){
    var p=S.prestige,n=g.shardsNow();
    return '<div class="pr-head">'+SHARD+'<b>'+t('pr.shards',{n:p.shards})+'</b><span>'+t('pr.bonus',{p:Math.round(p.shards*D.SHARD_BONUS*100)})+'</span></div>'+
      '<p>'+t('pr.desc')+'</p><p class="note">'+t('pr.keep')+'</p>'+
      '<p class="pr-gain">'+(n>0?t('pr.gain',{n:n}):t('pr.need',{n:D.PRESTIGE_LEVEL}))+'</p>';
  }));
  var btn=el('button','btn big pr-btn');btn.type='button';
  btn.addEventListener('click',function(){
    var n=g.shardsNow();if(n<=0)return;
    modal(t('pr.title'),'<p>'+t('pr.confirm',{n:n})+'</p>',[{text:t('cancel')},{text:t('yes'),cls:'pink',fn:function(){
      if(window.Scene3D&&Scene3D.ready)Scene3D.portal();
      g.prestige();toast(t('pr.done',{n:n}));buildTab();
    }}]);
  });
  add({el:btn,update:function(){setText(btn,t('pr.btn'));btn.disabled=!g.canPrestige();}});
  add(block('<div class="lbl full">'+t('pr.relics')+'</div><p class="note">'+t('pr.relicNote')+'</p>'));
  var RV={start:function(l){return 1+5*l;},eye:function(l){return l;},edge:function(l){return l*0.5;},flow:function(l){return l*4;},
    stamina:function(l){return l;},dream:function(l){return l*0.5;},shadow:function(l){return l*10;},trophy:function(l){return l*50;},autoportal:function(){return '';}};
  D.RELICS.forEach(function(r){
    add(row({shard:true,title:function(){return t('rl.'+r.id);},lvl:function(){return t('row.lvlMax',{n:g.relic(r.id),m:r.max});},
      info:function(){var l=g.relic(r.id),n=Math.min(r.max,l+1);return t('rl.'+r.id+'.d',{v:RV[r.id](l||1)})+(l>0&&l<r.max&&r.max>1?'<br><small>&gt; '+t('rl.'+r.id+'.d',{v:RV[r.id](n)})+'</small>':'');},
      done:function(){return g.relic(r.id)>=r.max;},cost:function(){return D.relicCost(r,g.relic(r.id));},buy:function(){return g.buyRelic(r.id);}}));
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
      ['st.kills',D.fmt(s.kills)],['st.bosses',s.bosses],['st.bossFails',s.bossFails],['st.clicks',D.fmt(s.clicks)],
      ['st.play',ft(s.play)],['st.rest',ft(s.rest)],['st.earned',D.fmt(s.earned)],['st.earnedAll',D.fmt(s.earnedAll)],
      ['st.max',S.prestige.best],['st.rebirths',S.prestige.count]];
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
    '<button class="btn sm" data-d="coins">COINS x100</button><button class="btn sm" data-d="lvl">LVL +10</button>'+
    '<button class="btn sm" data-d="lvl100">LVL 101</button><button class="btn sm" data-d="fat">FATIGUE 95%</button>'+
    '<button class="btn sm" data-d="scale">FATIGUE SPEED</button><button class="btn sm" data-d="shards">SHARDS +10</button>'+
    '<button class="btn sm" data-d="hero">HERO +50</button><button class="btn sm" data-d="off">OFFLINE 3H</button></div><p class="note" id="dbg-s"></p>';
  b.addEventListener('click',function(e){
    var k=e.target.dataset&&e.target.dataset.d;if(!k)return;
    if(k==='coins')S.coins=Math.max(1000,S.coins*100);
    if(k==='lvl'){S.level+=10;S.maxLevel=Math.max(S.maxLevel,S.level);S.farm=false;g.spawn();}
    if(k==='lvl100'){S.level=101;S.maxLevel=Math.max(S.maxLevel,101);S.farm=false;g.spawn();}
    if(k==='fat')S.fatigue=0.95;
    if(k==='scale'){g.fatigueScale=g.fatigueScale===1?120:g.fatigueScale===120?3600:1;}
    if(k==='shards')S.prestige.shards+=10;
    if(k==='hero'){var b4=S.hero;S.hero+=50;g.checkUnlocks(b4);}
    if(k==='off'){S.lastSeen=Date.now()-3*3600*1000;UI.catchUp(3*3600);}
    refresh();
  });
  return {el:b,update:function(){setText($('dbg-s'),'fatigueScale x'+g.fatigueScale);}};
}

function refresh(){
  if(!g)return;
  rows.forEach(function(r){r.update();});
  [].forEach.call($('buy-amt').children,function(b){b.classList.toggle('sel',String(S.settings.buy)===b.dataset.n);});
}

function initPanel(){
  /* кнопка: спрятать / показать панель, чтобы сцена заняла весь экран */
  var tg=el('button','panel-toggle');tg.type='button';tg.id='panel-toggle';
  tg.innerHTML='<svg viewBox="0 0 8 12" aria-hidden="true"><path d="M2 0h2v2h2v2h2v4H6v2H4v2H2v-2h2V8h2V4H4V2H2z" fill="currentColor"/></svg>';
  function applyPanel(){document.body.classList.toggle('panel-off',!!S.settings.panel);}
  tg.addEventListener('click',function(e){e.stopPropagation();S.settings.panel=!S.settings.panel;applyPanel();Sound.sfx('select');
    setTimeout(function(){window.dispatchEvent(new Event('resize'));},50);});
  H.stage.appendChild(tg);applyPanel();
  var tabs=$('tabs');
  TABS.forEach(function(id){
    var b=el('button','tab');b.type='button';b.dataset.tab=id;b.dataset.i18n='tab.'+id;b.textContent=t('tab.'+id);
    b.addEventListener('click',function(){curTab=id;paintTabs();buildTab();Sound.sfx('select');});
    tabs.appendChild(b);
  });
  var ba=$('buy-amt');
  [['1','x1'],['10','x10'],['100','x100'],['max','buy.max']].forEach(function(q){
    var b=el('button','amt');b.type='button';b.dataset.n=q[0];b.textContent=q[1].indexOf('.')>0?t(q[1]):q[1];
    if(q[1].indexOf('.')>0)b.dataset.i18n=q[1];
    b.addEventListener('click',function(){S.settings.buy=q[0]==='max'?'max':+q[0];refresh();});
    ba.appendChild(b);
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
  var box=$('create');box.classList.remove('hidden');
  var gender='m',robe='wander',prev=null;
  box.innerHTML='<div class="cr-box">'+
    '<div class="cr-brand">A.C.EON</div><h1 class="cr-title">ACEONIUM</h1><div class="cr-sub">'+t('cr.sub')+'</div>'+
    '<div class="cr-cols"><div class="cr-view"><canvas id="cr-canvas"></canvas><small>'+t('cr.drag')+'</small></div>'+
    '<div class="cr-form">'+
      '<div class="lbl">'+t('cr.look')+'</div><div class="seg" id="cr-gender"><button type="button" data-g="m" class="sel">'+t('cr.m')+'</button><button type="button" data-g="f">'+t('cr.f')+'</button></div>'+
      '<div class="lbl">'+t('cr.name')+'</div><input id="cr-name" maxlength="16" autocomplete="off" spellcheck="false" placeholder="'+esc(t('cr.namePh'))+'">'+
      '<div class="err hidden" id="cr-err">'+t('cr.nameErr')+'</div>'+
      '<div class="lbl">'+t('cr.robe')+'</div><div class="swatches small" id="cr-sw"></div>'+
      '<button type="button" class="btn big" id="cr-go" disabled>'+t('cr.go')+'</button>'+
    '</div></div></div>';
  if(window.Scene3D&&Scene3D.ready){try{prev=Scene3D.preview($('cr-canvas'));}catch(e){prev=null;}}
  if(!prev)box.querySelector('.cr-view').classList.add('hidden');
  var sw=$('cr-sw');
  D.ROBES.filter(function(r){return r.free;}).forEach(function(r,i){
    var b=el('button','sw'+(i===0?' wear':''));b.type='button';b.dataset.id=r.id;
    b.innerHTML='<span class="sw-c" style="--c:'+r.c+';--t:'+r.t+'"></span><span class="sw-n">'+t('robe.'+r.id)+'</span>';
    sw.appendChild(b);
  });
  function apply(){if(prev)prev.set(look(gender,robe));}
  sw.addEventListener('click',function(e){var b=e.target.closest('.sw');if(!b)return;robe=b.dataset.id;
    [].forEach.call(sw.children,function(x){x.classList.toggle('wear',x===b);});apply();Sound.sfx('select');});
  $('cr-gender').addEventListener('click',function(e){var b=e.target.closest('button');if(!b)return;gender=b.dataset.g;
    [].forEach.call(this.children,function(x){x.classList.toggle('sel',x===b);});apply();Sound.sfx('select');});
  var inp=$('cr-name');
  inp.addEventListener('input',function(){var ok=validName(inp.value.trim());$('cr-go').disabled=!ok;$('cr-err').classList.toggle('hidden',ok||inp.value.trim().length<2);});
  inp.addEventListener('keydown',function(e){if(e.key==='Enter'&&!$('cr-go').disabled)$('cr-go').click();});
  $('cr-go').addEventListener('click',function(){
    var n=inp.value.trim();if(!validName(n))return;
    if(prev)prev.dispose();
    box.classList.add('hidden');box.innerHTML='';
    g.setProfile(n,gender);g.equipRobe(robe);
    Sound.sfx('win');
    onDone();
  });
  apply();
  setTimeout(function(){inp.focus();},300);
}

function offlineReport(rep){
  var rows=['<p>'+t('off.away',{t:ft(rep.sec)})+'</p>'];
  if(rep.fight>30)rows.push('<p>'+tg('off.fight',{t:ft(rep.fight)})+'</p>');
  if(rep.rest>30)rows.push('<p>'+tg('off.rest',{t:ft(rep.rest)})+'</p>');
  rows.push('<p class="gold">'+COIN+t('off.coins',{c:D.fmt(rep.coins)})+'</p>');
  if(rep.kills)rows.push('<p>'+t('off.kills',{n:D.fmt(rep.kills)})+'</p>');
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
  onHit:onHit,onKill:onKill,banner:banner,toast:toast,modal:modal,ripple:ripple,showCreate:showCreate,offlineReport:offlineReport,
  look:look,t:t,tg:tg,get tab(){return curTab;},
  exportSave:null,importSave:null,resetSave:null,catchUp:null};
})();
