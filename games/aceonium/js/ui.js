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
  starice:'<path d="M8 1l2 5h5l-4 3 2 6-5-4-5 4 2-6-4-3h5z" fill="C"/>',
  coal:'<path d="M2 11l3-6 4-2 5 3 1 6-4 3H5z" fill="C"/><path d="M6 6l3-1 2 3" stroke="#9aa0aa" stroke-opacity=".6" fill="none"/>'
};
/* v18: картинки из 3D, один атлас assets/icons/icons.webp (сетка 8 x 7 по 128 px) */
var SPR_IDS=["r_wood", "r_iron", "r_herb", "r_hide", "r_bone", "r_silk", "r_spore", "r_ecto", "r_crystal", "r_silver", "r_coal", "r_ironwood", "r_amber", "r_pearl", "r_starice", "p_heal", "p_str", "p_luck", "p_vigor", "p_spore", "p_ward", "c_bow", "c_shield", "c_wand", "s_sword", "s_axe", "s_helm", "s_mail", "s_blade", "t_cloak", "t_belt", "t_boots", "t_hood", "t_silk", "j_ring", "j_bone", "j_crys", "j_amber", "j_star", "sc_spark", "sc_guard", "sc_wind", "sc_seek", "sc_fire", "sc_storm", "sc_star", "o_staff", "o_bag", "o_store", "o_coin", "o_book"],SPR_COLS=8,SPR_ROWS=7,SPR={};SPR_IDS.forEach(function(id,i){SPR[id]=i;});
function spr(id,cls){
  var i=SPR[id];if(i===undefined)return '';
  var c=i%SPR_COLS,r=Math.floor(i/SPR_COLS);
  return '<span class="spr'+(cls?' '+cls:'')+'" style="background-position:'+(c/(SPR_COLS-1)*100).toFixed(3)+'% '+(r/(SPR_ROWS-1)*100).toFixed(3)+'%"></span>';
}
function resIcon(id,cls){
  var r=D.RES_BY[id];if(!r)return '';
  if(SPR['r_'+id]!==undefined)return spr('r_'+id,'ri'+(r.rare?' rare':'')+(cls?' '+cls:''));
  return '<svg class="ri'+(r.rare?' rare':'')+(cls?' '+cls:'')+'" viewBox="0 0 16 16" aria-hidden="true">'+RES_SVG[id].replace(/"C"/g,'"'+r.c+'"')+'</svg>';
}
var BAG_SVG='<svg class="bag-ico" viewBox="0 0 16 16" aria-hidden="true"><path d="M6 2h4v2h2l2 3v7H2V7l2-3h2z" fill="#c08452"/><rect x="5" y="7" width="6" height="2" fill="#000" opacity=".3"/><rect x="7" y="2" width="2" height="2" fill="#5a3a22"/></svg>';
/* стоимость: иконки с количеством, нехватка красным */
function costHtml(cost){
  if(!cost)return '';
  var h='';
  for(var k in cost){var ok=g.have(k)>=cost[k];h+='<span class="cst'+(ok?'':' no')+'">'+(k==='gold'?COIN:resIcon(k))+D.fmt(cost[k])+'</span>';}
  return h;
}
var COIN='<i class="coin"></i>';

/* ── пиксельные картинки изделий 16x16: строки, буква = цвет; M и m - основной цвет вещи и его тень ── */
var PIX={
  sword:{rows:[
    '................',
    '.............ww.',
    '............wMw.',
    '...........wMm..',
    '..........wMm...',
    '.........wMm....',
    '........wMm.....',
    '...g...wMm......',
    '...gg.wMm.......',
    '....ggMm........',
    '....bgg.........',
    '...bbggg........',
    '..bb...g........',
    '.pb.............',
    'pp..............',
    '................'],pal:{w:'#f4f8ff',g:'#e0b040',b:'#6a4428',p:'#c09030'}},
  axe:{rows:[
    '..........mm....',
    '........mmMMm...',
    '.......mMMMMMw..',
    '.......mMMMMMw..',
    '........mMMMw...',
    '.......bbmm.....',
    '......bb........',
    '.....bb.........',
    '....bb..........',
    '...bb...........',
    '..bb............',
    '.bb.............',
    'bb..............',
    '................',
    '................',
    '................'],pal:{w:'#f4f8ff',b:'#7a5030'}},
  bow:{rows:[
    '.......MM.......',
    '......M..l......',
    '.....M...l......',
    '.....M...l......',
    '....Mm...l......',
    '....Mm...l......',
    '....hh...l......',
    '....hh...l......',
    '....hh...l......',
    '....Mm...l......',
    '....Mm...l......',
    '.....M...l......',
    '.....M...l......',
    '......M..l......',
    '.......MM.......',
    '................'],pal:{l:'#efe6d0',h:'#4a2c18'}},
  shield:{rows:[
    '................',
    '..oooooooooooo..',
    '..oMMMMggMMMMo..',
    '..oMMMMggMMMMo..',
    '..oMMMMggMMMMo..',
    '..oggggggggggo..',
    '..omMMMggMMMmo..',
    '...omMMggMMmo...',
    '...omMMggMMmo...',
    '....omMggMmo....',
    '.....omggmo.....',
    '......omgo......',
    '.......oo.......',
    '................',
    '................',
    '................'],pal:{o:'#3a2414',g:'#c0c8d4'}},
  cloak:{rows:[
    '......MMMM......',
    '.....MmmmmM.....',
    '....MmkkkkmM....',
    '....MmkkkkmM....',
    '....MMmkkmMM....',
    '...MMMyMMyMMM...',
    '...MMMMMMMMMM...',
    '..MMmMMMMMMmMM..',
    '..MMmMMMMMMmMM..',
    '.MMMmMMMMMMMmMM.',
    '.MMmMMMMMMMMMmM.',
    '.MMmMMMMMMMMmMM.',
    'MMmMMMMMMMMMMMmM',
    'MmmMMMMMMMMMMMmm',
    'MMMMMMMMMMMMMMMM',
    '................'],pal:{k:'#120c08',y:'#e0b040'}},
  helm:{rows:[
    '................',
    '.......ww.......',
    '.....MMMMMM.....',
    '....MwMMMMMM....',
    '...MwMMMMMMMm...',
    '...MMMMMMMMMm...',
    '...mmmmmmmmmm...',
    '...MM.kkkk.Mm...',
    '...MM.kkkk.Mm...',
    '...MMM....MMm...',
    '...MMM....MMm...',
    '....mm....mm....',
    '................',
    '................',
    '................',
    '................'],pal:{w:'#f4f8ff',k:'#0c0c10'}},
  ring:{rows:[
    '................',
    '.......ee.......',
    '......eEEe......',
    '......eeee......',
    '.....MMMMMM.....',
    '....MM....mM....',
    '...MM......mM...',
    '...M........m...',
    '..MM........mm..',
    '..MM........mm..',
    '...M........m...',
    '...MM......mm...',
    '....MM....mm....',
    '.....mmmmmm.....',
    '................',
    '................'],pal:{e:'#2a70ff',E:'#9fd0ff'}},
  belt:{rows:[
    '................',
    '................',
    '................',
    '................',
    '................',
    'mmmmmmyyyymmmmmm',
    'MMMMMMy..yMMMMMM',
    'MMMMMMy.yyMMMMMM',
    'MMMMMMy..yMMMMMM',
    'mmmmmmyyyymmmmmm',
    '..........M.M...',
    '................',
    '................',
    '................',
    '................',
    '................'],pal:{y:'#e0b040'}},
  boots:{rows:[
    '................',
    '....mmmmm.......',
    '....MMMMm.......',
    '....MMMMm.......',
    '....MMMMm.......',
    '....yyyym.......',
    '....MMMMm.......',
    '....MMMMmm......',
    '....MMMMMMm.....',
    '....MMMMMMMmm...',
    '...MMMMMMMMMMm..',
    '...MMMMMMMMMMm..',
    '...dddddddddddd.',
    '................',
    '................',
    '................'],pal:{y:'#c09030',d:'#2a1a10'}},
  potion:{rows:[
    '......cccc......',
    '......cccc......',
    '.......gg.......',
    '.......gg.......',
    '......gggg......',
    '.....gMMMMg.....',
    '....gMMMMMMg....',
    '...gMMwMMMMMg...',
    '...gMMwMMMMMg...',
    '...gMMMMMMMmg...',
    '...gMMMMMMmmg...',
    '....gMMMMmmg....',
    '.....gggggg.....',
    '................',
    '................',
    '................'],pal:{c:'#8a5a32',g:'#cfe8f0',w:'#ffffff'}},
  charm:{rows:[
    '.......y........',
    '......y.y.......',
    '.....y...y......',
    '......MMM.......',
    '.....MMMMM......',
    '....MMwMMMM.....',
    '...MMMwMMMMM....',
    '...MMMMMMMMm....',
    '....MMMMMMm.....',
    '.....MMMMm......',
    '......Mmm.......',
    '.......m........',
    '................',
    '................',
    '................',
    '................'],pal:{y:'#e0b040',w:'#ffffff'}},
  /* свиток: пергамент, руна цвета свитка, печать */
  scroll:{rows:[
    '................',
    '..oppppppppppo..',
    '.opPPPPPPPPPPpo.',
    '..oppppppppppo..',
    '...pPPPPPPPPp...',
    '...pPMMPPPPPp...',
    '...pPPMMPPPPp...',
    '...pPPPMMPPPp...',
    '...pPPMMPPPPp...',
    '...pPMMPPPPPp...',
    '...pPPPPPPrrp...',
    '...pPPPPPrRRr...',
    '..opppppprRRro..',
    '.opPPPPPPPrrPpo.',
    '..oppppppppppo..',
    '................'],pal:{o:'#6a4428',p:'#c8a870',P:'#f0dcae',r:'#8a1a1a',R:'#d03030'}}
};
var ITEM_TPL={s_sword:'sword',s_blade:'sword',s_axe:'axe',c_bow:'bow',c_wand:'bow',c_shield:'shield',
  t_cloak:'cloak',t_silk:'cloak',s_mail:'cloak',t_hood:'helm',s_helm:'helm',t_belt:'belt',t_boots:'boots',p_ward:'charm'};
function shade(hex,k){var n=parseInt(hex.slice(1),16),r=n>>16,g2=n>>8&255,b=n&255;function c(v){return Math.max(0,Math.min(255,Math.round(v*k)));}return '#'+((1<<24)+(c(r)<<16)+(c(g2)<<8)+c(b)).toString(16).slice(1);}
var pixCache={};
function pixSvg(tpl,color,cls){
  var key=tpl+color+cls;if(pixCache[key])return pixCache[key];
  var P=PIX[tpl],pal={};for(var k in P.pal)pal[k]=P.pal[k];
  pal.M=color;pal.m=shade(color,0.62);
  var out='';
  P.rows.forEach(function(row,y){
    var x=0;
    while(x<16){
      var ch=row[x];if(ch==='.'||ch===' '||!pal[ch]){x++;continue;}
      var x2=x;while(x2<16&&row[x2]===ch)x2++;
      out+='<rect x="'+x+'" y="'+y+'" width="'+(x2-x)+'" height="1" fill="'+pal[ch]+'"/>';
      x=x2;
    }
  });
  return (pixCache[key]='<svg class="'+cls+'" viewBox="0 0 16 16" shape-rendering="crispEdges" aria-hidden="true">'+out+'</svg>');
}
function itemIcon(id,q,big,extra){
  var gd=D.GOOD_BY[id];if(!gd)return '';
  if(SPR[id]!==undefined)return spr(id,'ri it q'+(q||0)+(big?' big':'')+(extra?' '+extra:''));
  var tpl=ITEM_TPL[id]||(gd.kind==='potion'?'potion':gd.kind==='ring'?'ring':gd.kind==='scroll'?'scroll':'sword');
  var color=tpl==='ring'?'#c8d0dc':gd.c;
  var svg=pixSvg(tpl,color,'ri it q'+(q||0)+(big?' big':''));
  if(tpl==='ring'&&gd.id!=='j_ring')svg=svg.replace(/#2a70ff/g,gd.c).replace(/#9fd0ff/g,shade(gd.c,1.3));
  return svg;
}
function itemName(id){return t('it.'+id);}
function qualTag(q){return q>0?' <span class="qt q'+q+'">'+t('q.'+q)+'</span>':'';}
function effText(id,q){
  var gd=D.GOOD_BY[id];if(!gd||!gd.eff)return '';
  var m=D.QUAL[q||0],out=[];
  for(var k in gd.eff)out.push(t('eff.'+k,{v:Math.round(gd.eff[k]*m*100)}));
  if(gd.kind==='ward')out.push(t('eff.ward'));
  return out.join(', ');
}
function orderName(rid){
  if(rid==='staff')return t('ord.staff',{n:S.staff+1});
  if(rid==='bag')return t('ord.bag',{n:S.bagLvl+1});
  if(rid==='store')return t('ord.store',{n:S.storeLvl+1});
  return itemName(rid);
}
function orderIcon(rid,big,extra){
  var c=big?' big':'';
  if(rid==='staff'||rid==='bag'||rid==='store')return spr('o_'+rid,'ri it'+c+(extra?' '+extra:''));
  if(D.GOOD_BY[rid])return itemIcon(rid,0,big,extra);
  if(rid==='staff')return '<svg class="ri it'+c+'" viewBox="0 0 16 16" shape-rendering="crispEdges"><rect x="7" y="4" width="2" height="12" fill="#7a5030"/><rect x="5" y="0" width="6" height="5" fill="'+D.TIER_COLORS[D.staffTier(S.staff)%D.TIER_COLORS.length]+'"/><rect x="6" y="1" width="2" height="2" fill="#fff"/></svg>';
  if(rid==='bag')return BAG_SVG.replace('class="bag-ico"','class="ri it'+c+'"');
  if(rid==='store')return '<svg class="ri it'+c+'" viewBox="0 0 16 16" shape-rendering="crispEdges"><rect x="1" y="3" width="14" height="2" fill="#8a5a32"/><rect x="1" y="8" width="14" height="2" fill="#8a5a32"/><rect x="1" y="13" width="14" height="2" fill="#8a5a32"/><rect x="1" y="3" width="2" height="12" fill="#5a3a22"/><rect x="13" y="3" width="2" height="12" fill="#5a3a22"/><rect x="4" y="5" width="3" height="3" fill="#c08452"/><rect x="9" y="10" width="3" height="3" fill="#9aa6b4"/></svg>';
  return itemIcon(rid,0,big);
}
/* блок, который перерисовывается целиком, а кнопки внутри ловятся через data-act */
function actBlock(fn,onAct,cls){
  var b=el('div','blk'+(cls?' '+cls:''));
  b.addEventListener('click',function(e){var x=e.target.closest('[data-act]');if(!x||x.disabled)return;onAct(x.dataset.act,x.dataset,e);Sound.sfx('select');refresh();});
  b.addEventListener('change',function(e){var x=e.target.closest('[data-act]');if(!x)return;onAct(x.dataset.act,x.dataset,e);refresh();});
  return {el:b,update:function(){setHTML(b,fn());}};
}
function resList(map){
  var h='';for(var k in map)if(map[k])h+='<span class="cst">'+resIcon(k)+D.fmt(map[k])+'</span>';
  return h||'<span class="note">'+t('st.none')+'</span>';
}
function tractName(i){return t('tr.'+D.TRACTS[i].id);}

/* ════════ HUD ════════ */
var H={};
function initHud(){
  ['h-level','h-wave','h-dots','h-bag','h-bag-bar','h-rate','h-gold','h-fat-state','h-fat-pct','h-fat-bar','h-fat-note','h-place','h-rested',
   'enemy','en-name','en-hp','en-hp-txt','mhp','mhp-l','mhp-bar','mhp-rage',
   'rest','rest-txt','rest-time','rest-craft','rest-road','rest-tav','skills','fx','stage'].forEach(function(id){H[id]=$(id);});
  var dots='';for(var i=0;i<10;i++)dots+='<i'+(i===9?' class="b"':'')+'></i>';H['h-dots'].innerHTML=dots;
  H.dots=[].slice.call(H['h-dots'].children);
  $('h-bag-i').innerHTML=BAG_SVG;
  H['h-place'].addEventListener('click',function(){if(S.place==='road')g.goHome();else g.goTrip();});
  /* переключатель вида: дорога / таверна сверху */
  var vbox=el('div','view-box');
  var vb=el('button','view-btn');vb.type='button';vb.id='view-btn';
  vb.addEventListener('click',function(e){e.stopPropagation();if(S.place==='road')g.goHome();else g.goTrip();Sound.sfx('select');refreshHud();});
  var sb=el('button','view-btn sleep-btn');sb.type='button';sb.id='sleep-btn';
  sb.addEventListener('click',function(e){e.stopPropagation();g.sleepNow();Sound.sfx('select');refreshHud();});
  vbox.appendChild(vb);vbox.appendChild(sb);H.stage.appendChild(vbox);H.view=vb;H.sleep=sb;
  /* очередь крафта внизу экрана таверны */
  var qb=el('div','qbar hidden');qb.id='qbar';
  qb.addEventListener('click',function(e){e.stopPropagation();openTab('craft','make');Sound.sfx('select');});
  H.stage.appendChild(qb);H.qbar=qb;
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
  setText(H['h-gold'],D.fmt(S.gold));
  var tb=$('tabs').querySelector('[data-tab="tavern"]');
  if(tb){var n=S.cust.length,lbl=t('tab.tavern')+(n?' ('+n+')':'');setText(tb,lbl);tb.classList.toggle('alert',n>0);}
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
  H['h-place'].classList.add('hidden');
  paintView();checkTabSet();
  /* сон: маленькая плашка, днём в таверне её нет */
  var sleeping=S.place==='sleep';
  H.rest.classList.toggle('hidden',!sleeping);
  if(sleeping){
    setText(H['rest-txt'],tg('rest.sleep'));
    setText(H['rest-time'],tg('rest.up',{t:ft(restLeft)}));
    setHTML(H['rest-craft'],'');H['rest-craft'].classList.add('hidden');
    setText(H['rest-road'],t('rest.wake'));
    H['rest-tav'].classList.add('hidden');
  }
  paintQbar(road);
  /* враг */
  var e=R.enemy,showE=!!(road&&e&&(R.phase==='fight'||(R.phase==='walk'&&e.boss)));
  H.enemy.classList.toggle('hidden',!showE);
  if(showE){
    setHTML(H['en-name'],(e.boss?t('en.boss')+' · ':e.elite?'<span class="elite">'+t('en.elite')+'</span> · ':'')+esc(t(e.name))+' '+resIcon(e.res)+' · '+t('hud.waveShort')+' '+e.L);
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
/* нижняя полоса: что сейчас делают мастера */
function paintQbar(road){
  var q=H.qbar,h='';
  if(!road){
    D.MASTERS.forEach(function(d){
      var m=g.master(d.id);if(!m.hired||!m.teach)return;
      h+='<div class="qb-it teach" title="'+esc(t('ms.'+d.id))+'">'+orderIcon(m.teach.r)+'<i style="width:'+((1-m.teach.t/m.teach.T)*100).toFixed(1)+'%"></i><small>'+t('qb.teach')+'</small></div>';
    });
    var act=g.activeSet();
    S.queue.forEach(function(o,k){
      var on=!!act[k],p=on&&o.T?(1-o.t/o.T):0;
      h+='<div class="qb-it'+(on?'':' wait')+(o.m==='mage'?' mage':'')+'" title="'+esc(orderName(o.r)+' · '+mName(o.m))+'">'+orderIcon(o.r)+'<i style="width:'+(p*100).toFixed(1)+'%"></i><small>'+(on?ft(o.t/g.mSpeed(o.m)):'')+'</small></div>';
    });
    h=h?h+'<span class="qb-n">'+S.queue.length+'/'+S.qSlots+'</span>':'<span class="qb-empty">'+t('qb.empty')+'</span>';
  }
  q.classList.toggle('hidden',road);
  setHTML(q,h);
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
  if(h.pet){pop('pet'+(h.crit?' crit':''),D.fmt(h.dmg)+(h.crit?'!':''),p.x-40+(Math.random()-0.5)*30,p.y+20+(Math.random()-0.5)*16);return;}
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
/* дорога и таверна: у каждой свой набор вкладок */
var TABSETS={road:['path','bag','skills','wardrobe','stats'],tavern:['tavern','craft','city','store','gear','stats']};
var TABS=['path','bag','skills','wardrobe','tavern','craft','city','store','gear','stats'];
var curTab='path',rows=[],tabCleanup=null,tabSet='road',lastTab={road:'path',tavern:'tavern'};
function placeSet(){return S.place==='road'?'road':'tavern';}

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
  ({path:tabPath,bag:tabBag,tavern:tabTavern,craft:tabCraft,city:tabCity,store:tabStore,gear:tabGear,skills:tabSkills,wardrobe:tabWardrobe,stats:tabStats})[curTab](body);
  rows.forEach(function(r){body.appendChild(r.el);});
  refresh();
}
function add(r){rows.push(r);return r;}

/* ══════════ ДОРОГА ══════════ */

/* ── ПУТЬ: плитки трактов, выбранный тракт подробно, план и переключатели ── */
var curTract=null;
function mageHead(){
  var p=S.profile||{name:'',gender:'m'},need=D.xpNeed(S.mlvl);
  return '<div class="hero-head"><b>'+esc(p.name)+'</b><span>'+t('hud.mlvl',{n:S.mlvl})+'</span></div>'+
    '<div class="bar xp"><i style="width:'+Math.min(100,S.xp/need*100).toFixed(1)+'%"></i></div>'+
    '<div class="stat-row"><span>'+icon('overload')+D.fmt(g.dps())+'</span><span class="hp">'+D.fmt(g.maxHp())+'</span><span>'+t('mage.xp',{x:D.fmt(S.xp),n:D.fmt(need)})+'</span></div>'+petLine();
}
function petLine(){
  var P2=g.pets(),id=P2.active,p=id&&P2.own[id];if(!p||!window.Pets)return '';
  return '<div class="pet-line">'+t('pt.with',{p:Pets.name(id),n:p.lvl})+' <span class="ok">'+Pets.effText(id,p.lvl)+'</span></div>';
}
function statusLine(){
  var tr=S.trip;
  if(S.place==='road'&&tr)return tg('st.road',{t:tractName(tr.t),w:tr.w,n:tr.n,c:g.bagCap()});
  if(S.place==='sleep')return tg('st.sleep',{t:ft(S.fatigue*g.restH()*3600/g.fatigueScale)});
  if(tr&&tr.paused)return tg('st.paused',{t:tractName(tr.t),w:tr.w});
  return tg('st.home');
}
function tabPath(){
  if(curTract===null)curTract=S.trip?S.trip.t:S.lastTract||0;
  add(liveBlock(mageHead,'hero-blk'));
  /* плитки трактов */
  add(actBlock(function(){
    var h='<div class="tr-tiles">';
    D.TRACTS.forEach(function(T,i){
      var open=g.tractOpen(i),st=S.tracts[i],here=S.trip&&S.trip.t===i;
      h+='<button type="button" class="tr-tile b'+T.biome+(i===curTract?' sel':'')+(open?'':' lock')+(here?' here':'')+'" data-act="pick" data-i="'+i+'">'+
        '<b>'+tractName(i)+'</b><small>'+(!open?t('tr.locked'):here?t('tr.here'):st.clears?t('tr.cleared',{n:st.clears}):st.best?t('tr.best',{w:st.best}):t('tr.new'))+'</small>'+
        '<span class="tr-ico">'+T.res.map(function(r){return resIcon(r);}).join('')+resIcon(T.rare)+'</span>'+
        (S.plan.c[i]?'<i class="tr-plan">x'+S.plan.c[i]+'</i>':'')+'</button>';
    });
    return h+'</div>';
  },function(act,ds){if(act==='pick')curTract=+ds.i;}));
  /* выбранный тракт */
  add(actBlock(function(){
    var i=curTract,T=D.TRACTS[i],open=g.tractOpen(i),st=S.tracts[i],cl=st.clears>0,here=S.trip&&S.trip.t===i;
    var h='<div class="tr-detail b'+T.biome+'"><div class="tr-head"><b>'+tractName(i)+'</b><span>'+(cl?t('tr.cleared',{n:st.clears}):'')+'</span></div>';
    if(!open)return h+'<p class="note">'+t('tr.need',{t:tractName(i-1)})+'</p></div>';
    h+='<div class="tr-res">'+T.res.map(function(r){return '<span class="cst">'+resIcon(r)+t('res.'+r)+'</span>';}).join('')+'<span class="cst rare">'+resIcon(T.rare)+t('res.'+T.rare)+'</span></div>';
    h+='<div class="tr-facts"><div><small>'+t('trd.dmg')+'</small><b>'+D.fmt(D.recDps(i,1))+' - '+D.fmt(D.recDps(i,100))+'</b></div>'+
       '<div><small>'+t('trd.lvl')+'</small><b>'+D.recLevel(i,1)+' - '+D.recLevel(i,100)+'</b></div>'+
       '<div><small>'+t('trd.chance')+'</small><b>'+pct(D.chance(1,cl))+' - '+pct(D.chance(100,cl))+'</b></div>'+
       '<div><small>'+t('trd.best')+'</small><b>'+(st.best||0)+' / 100</b></div></div>';
    h+='<div class="tr-ctl"><div class="stepper"><button type="button" data-act="plan" data-d="-1">-</button><span class="tr-n">'+t('plan.times',{n:S.plan.c[i]})+'</span><button type="button" data-act="plan" data-d="1">+</button></div>'+
       '<button type="button" class="btn sm" data-act="go"'+(here||(S.place==='road'&&g.inBoss())?' disabled':'')+'>'+(here?t('tr.going'):t('tr.go'))+'</button></div></div>';
    return h;
  },function(act,ds){
    if(act==='plan')g.setPlan(curTract,S.plan.c[curTract]+(+ds.d));
    if(act==='go'&&g.goTo(curTract))toast(t('plan.goNow',{t:tractName(curTract)}));
  }));
  add(liveBlock(function(){var left=g.planLeft();return '<p class="note">'+(left>0?t('plan.left',{n:left}):t('plan.empty',{t:tractName(nextTractPeek())}))+hb('trip')+'</p>';}));
  /* переключатели */
  var sw=el('div','blk toggles');
  sw.innerHTML='<label class="chk" title="'+esc(t('opt.autoD'))+'"><input type="checkbox" id="p-auto"><span>'+t('opt.auto')+'</span></label>';
  sw.querySelector('#p-auto').addEventListener('change',function(){g.setAuto(this.checked);});
  add({el:sw,update:function(){sw.querySelector('#p-auto').checked=!!S.auto;}});
}

/* ── СУМКА: что сейчас несёт маг и журнал походов ── */
function tabBag(){
  add(liveBlock(function(){
    var tr=S.trip,n=tr?tr.n:0,cap=g.bagCap(),h='<div class="lbl full">'+t('bag.title',{n:n,c:cap})+hb('bag')+'</div>';
    h+='<div class="bar bagbar"><i style="width:'+Math.min(100,n/cap*100).toFixed(1)+'%"></i></div>';
    var bag=tr?tr.bag:{},any=false,grid='<div class="res-grid">';
    for(var k in bag)if(bag[k]){any=true;grid+='<div class="res-tile">'+resIcon(k)+'<span>'+t('res.'+k)+'</span><b>'+bag[k]+'</b></div>';}
    h+=any?grid+'</div>':'<p class="note">'+t('bag.empty')+'</p>';
    h+='<p class="note">'+t('bag.info',{p:pct(g.bag().pick)})+'</p>';
    return h;
  }));
  add(liveBlock(function(){
    var h='<div class="lbl full">'+t('jr.title')+'</div>';
    if(!S.journal.length)return h+'<p class="note">'+t('jr.empty')+'</p>';
    S.journal.slice(0,12).forEach(function(j){
      h+='<div class="jr'+(j.why==='defeat'?' bad':'')+'"><div class="jr-top"><b>'+tractName(j.t)+'</b><span>'+t('jr.wave',{w:j.w})+' · '+ft(j.dur||0)+'</span></div>'+
        '<div class="jr-why">'+t('why.'+j.why)+(j.why==='defeat'?' · '+t('jr.lost',{n:j.lost}):' · +'+j.n)+'</div>'+
        (j.why==='defeat'?'':'<div class="res-line">'+resList(j.got)+'</div>')+'</div>';
    });
    return h;
  }));
}

/* ══════════ ТАВЕРНА ══════════ */

/* ── ТАВЕРНА: продажи ── */
function tabTavern(){
  add(liveBlock(function(){
    var open=g.isOpen(),hall=g.buildLvl('hall');
    return '<div class="tv-head"><b>'+COIN+D.fmt(S.gold)+'</b><span class="'+(open?'ok':'bad')+'">'+t(open?'tv.open':'tv.closed')+hb('tavern')+'</span></div>'+
      '<div class="stat-row"><span>'+t('tv.rate',{r:(Math.round(D.custRate(hall,S.rep)*10)/10)})+'</span><span>'+t('tv.rep',{n:Math.floor(S.rep)})+'</span><span>'+t('tv.soldN',{n:D.fmt(S.stats.sold||0)})+'</span></div>';
  }));
  add(actBlock(function(){
    var h='';
    if(!S.cust.length)return '<p class="note">'+t(g.isOpen()?'tv.noCust':'tv.night')+'</p>';
    S.cust.forEach(function(c){
      var q=g.custQual(c),has=q>=0,price=g.custPrice(c),left=Math.max(0,D.HOSTESS_AFTER-c.wait);
      h+='<div class="cust"><div class="cu-item">'+itemIcon(c.item,0,true)+'</div><div class="cu-main"><div class="cu-top"><b>'+t('trav.'+c.who)+'</b><span>'+(has?t('tv.hostessIn',{s:Math.ceil(left)}):t('tv.leaveIn',{t:ft(Math.max(0,D.CUST_PATIENCE-c.wait))}))+'</span></div>'+
        '<div class="cu-want">'+itemName(c.item)+' · '+t('tv.stock',{n:g.invCount(c.item)})+'</div>'+
        '<div class="cu-btns">'+
          '<button type="button" class="btn sm" data-act="sell" data-id="'+c.id+'"'+(has?'':' disabled')+'>'+COIN+D.fmt(price)+'</button>'+
          '<button type="button" class="btn sm" data-act="up" data-id="'+c.id+'"'+(has?'':' disabled')+' title="'+esc(t('tv.upT',{p:Math.round(D.HAGGLE_FAIL*100)}))+'">'+t('tv.up')+'</button>'+
          '<button type="button" class="btn sm" data-act="down" data-id="'+c.id+'"'+(has?'':' disabled')+' title="'+esc(t('tv.downT'))+'">'+t('tv.down')+'</button>'+
          '<button type="button" class="btn sm red" data-act="no" data-id="'+c.id+'">'+t('tv.no')+'</button></div></div></div>';
    });
    return h;
  },function(act,ds){
    var c=g.custById(+ds.id);if(!c)return;
    if(act==='sell')g.sellTo(c);else if(act==='up')g.sellTo(c,'up');else if(act==='down')g.sellTo(c,'down');else g.refuse(c);
  }));
  add(hallBlock());
  D.WORKER_ORDER.forEach(function(w){add(workerBlock(w));});
}

/* ── зал: места и гости, повар и пивовар (v16) ── */
function savingsHtml(w){
  var o=g.worker(w);
  if(o.lvl>=D.WORKER_MAX)return '<div class="stg"><div class="stg-t"><span>'+t('st2.max')+'</span></div></div>';
  if(o.bt){var k=1-o.bt.t/o.bt.T;return '<div class="stg"><div class="stg-t"><span>'+t('wk.expanding',{n:o.lvl+1})+'</span><b>'+ft(o.bt.t)+'</b></div><div class="bar stgb"><i style="width:'+(k*100).toFixed(1)+'%"></i></div></div>';}
  var need=D.workerUp(o.lvl),k2=Math.min(1,o.save/need),n=Math.floor(k2*D.STAGES),segs='';
  for(var i=0;i<D.STAGES;i++)segs+='<i'+(i<n?' class="on"':'')+'></i>';
  return '<div class="stg"><div class="stg-t"><span>'+t('wk.savings',{n:o.lvl+1})+'</span><b>'+D.fmt(Math.floor(o.save))+' / '+D.fmt(need)+'</b></div><div class="stg-s">'+segs+'</div></div>';
}
function workerBlock(w){
  return actBlock(function(){
    var o=g.worker(w),d=D.WORKERS[w];
    var h='<div class="pd-head"><b>'+t('wk.'+w)+hb('hall')+'</b><span>'+(o.hired?t('ms.lvl',{n:o.lvl}):'')+'</span></div>';
    if(!o.hired){
      var blk=g.workerBlock(w);
      h+='<p class="note">'+t('wk.'+w+'.d')+'</p>';
      if(blk==='hall')return h+'<p class="bad">'+t('wk.needHall',{n:d.hall})+'</p>';
      return h+'<div class="stg-b"><button type="button" class="btn sm" data-act="hire"'+(blk?' disabled':'')+'>'+t('pt.hire')+' '+costHtml({gold:d.hire})+'</button></div>';
    }
    var cap=g.stockCap(w),need=g.needH(w),capH=g.capacityH(w),bs=g.batchSize(w);
    h+='<div class="wk-row"><span>'+t('wk.'+w+'.unit')+'</span><b>'+Math.floor(o.stock)+' / '+cap+'</b><small>'+t('wk.batch',{n:bs,t:ft(d.time)})+'</small></div>'+
      '<div class="bar pdb"><i style="width:'+Math.min(100,o.stock/cap*100).toFixed(1)+'%"></i></div>'+
      '<div class="bar stgb thin"><i style="width:'+(o.stock>=cap?100:Math.min(100,o.t/d.time*100)).toFixed(1)+'%"></i></div>'+
      '<p>'+t('wk.price',{p:rate2(g.portionPrice(w)),m:rate2(g.portionPrice(w)*(1-D.WORKER_SHARE))})+'</p>'+
      '<p class="note">'+t('wk.flow',{a:rate2(need),b:rate2(capH)})+'</p>';
    if(need>capH*1.02)h+='<p class="bad">'+t('wk.short')+'</p>';
    var hc=g.helpCost(w),slots=D.helpSlots(o.lvl);
    h+='<div class="stg-b"><span>'+t('wk.helpers',{a:o.help,b:slots})+'</span>'+(hc?'<button type="button" class="btn sm" data-act="help"'+(g.canPay(hc)?'':' disabled')+'>'+t('wk.hireHelp')+' '+costHtml(hc)+'</button>':
      '')+'</div>';
    return h+savingsHtml(w);
  },function(act){
    if(act==='hire')g.workerHire(w);
    else if(act==='help')g.hireHelp(w);
  },'pd wk-'+w);
}
function hallBlock(){
  return actBlock(function(){
    var T=g.tav(),max=D.seatMax(g.buildLvl('hall')),sc=g.seatCost();
    var h='<div class="pd-head"><b>'+t('wk.hall')+hb('hall')+'</b><span>'+t('wk.seats',{a:T.seats,b:max})+'</span></div>'+
      '<p>'+t('wk.guestsNow',{n:T.guests.length})+' · '+t('wk.incH',{g:D.fmt(Math.round(g.tavIncomeH()))})+'</p>'+
      '<p class="note">'+t('wk.hallI',{h:rate2(g.guestsH())})+'</p>';
    h+='<div class="stg-b">'+(sc?'<button type="button" class="btn sm" data-act="seat"'+(g.canPay(sc)?'':' disabled')+'>'+t('wk.buySeat')+' '+costHtml(sc)+'</button>':
      '<span class="note">'+t(T.seats>=D.SEATS_MAX?'wk.seatsMax':'wk.seatsHall')+'</span>')+'</div>';
    if(T.inc)h+='<p class="note">'+t('wk.incTotal',{g:D.fmt(T.inc)})+'</p>';
    return h;
  },function(act){if(act==='seat')g.buySeat();},'pd wk-hall');
}
/* ── КРАФТ: две вкладки, изделия с картинками и мастера ── */
var craftSub='make',curItem=null;
function allRecipes(){
  var out=[];
  D.MASTERS.forEach(function(d){
    Object.keys(D.ORDERS).forEach(function(r){if(D.ORDERS[r].m===d.id)out.push({r:r,m:d.id});});
    D.GOODS.forEach(function(x){if(x.m===d.id)out.push({r:x.id,m:d.id});});
  });
  D.GOODS.forEach(function(x){if(x.m==='mage')out.push({r:x.id,m:'mage'});});
  return out;
}
function recipeMaster(r){var gd=D.GOOD_BY[r];return gd?gd.m:D.ORDERS[r].m;}
function mName(mid){return mid==='mage'?t('ms.mage'):t('ms.'+mid);}
/* общая очередь: значки, у кого сейчас в работе полоска; нажатие отменяет заказ */
function queueHtml(withBuy){
  var Q=S.queue,act=g.activeSet(),h='<div class="lbl full">'+t('q2.title',{n:Q.length,m:S.qSlots})+hb('craft')+'</div><div class="q2">';
  for(var i=0;i<S.qSlots;i++){
    var o=Q[i];
    if(!o){h+='<span class="q2-slot"></span>';continue;}
    var p=act[i]&&o.T?(1-o.t/o.T):0;
    h+='<button type="button" class="q2-slot full'+(act[i]?' on':'')+(o.m==='mage'?' mage':'')+'" data-act="cancel" data-i="'+i+'" title="'+esc(orderName(o.r)+' · '+mName(o.m)+' · '+t('q2.cancel'))+'">'+
      orderIcon(o.r,true)+'<i style="height:'+(p*100).toFixed(0)+'%"></i></button>';
  }
  h+='</div>';
  if(withBuy){
    var qc=g.qSlotCost();
    h+='<div class="q2-buy">'+(qc?'<button type="button" class="btn sm" data-act="qslot"'+(g.canPay(qc)?'':' disabled')+'>'+t('q2.more')+' '+costHtml(qc)+'</button>':'<span class="note">'+t('q2.max')+'</span>')+
      '</div>';
  }
  return h;
}
function queueAct(act,ds){
  if(act==='cancel'&&g.cancel(+ds.i))toast(t('q2.canceled'));
  if(act==='qslot')g.buyQSlot();
}
/* освоение вещи и шансы качества: полоска n/60, сколько уже быстрее работа руками */
function masteryHtml(mid,r){
  var n=g.mastery(mid,r),cap=D.MASTERY_CAP,k=Math.min(1,n/cap),cut=Math.round((1-D.masteryMult(n))*100);
  var ch=g.qualChance(mid,r),pc=function(x){return Math.round(x*1000)/10+'%';};
  return '<div class="mast"><div class="mast-t"><span>'+t('cr2.mastery',{n:Math.min(n,cap),m:cap})+'</span><span>'+(cut?t('cr2.faster',{p:cut}):'')+'</span></div>'+
    '<div class="bar mastb"><i style="width:'+(k*100).toFixed(1)+'%"></i></div>'+
    '<div class="qrow"><span class="q0">'+pc(1-ch[1]-ch[2]-ch[3])+'</span><span class="q1">'+pc(ch[1])+'</span><span class="q2">'+pc(ch[2])+'</span><span class="q3">'+pc(ch[3])+'</span></div></div>';
}
/* v20: ячейки книги по качеству (тап вкладывает копию) и замок "не продавать" */
var LOCK_SVG='<svg class="lk-i" viewBox="0 0 12 12" aria-hidden="true"><path fill="currentColor" d="M3 5V3.5a3 3 0 0 1 6 0V5h1v6H2V5zm1.5 0h3V3.5a1.5 1.5 0 0 0-3 0z"/></svg>';
function hb(k){return window.Help?Help.btn(k):'';}
function bookRow(r){
  var gd=D.GOOD_BY[r];if(!gd)return '';
  var mid=gd.m,h='<div class="bq">';
  for(var q=0;q<4;q++){
    var has=g.collQ(mid,r,q),n=S.inv[r+':'+q]||0,need=n>0&&g.bookNeed(r,q);
    h+='<button type="button" class="bq-c q'+q+(has?' has':n?' can':'')+(need?' need':'')+'" data-act="coll" data-r="'+r+'" data-q="'+q+'"'+(has||!n?' disabled':'')+'>'+
      '<b>'+t('q.'+q)+'</b><small>'+(has?t('bq.in'):n?t('bq.add',{n:n}):'')+'</small></button>';
  }
  return h+'</div>';
}
function lockBtn(r,small){
  var on=g.isLocked(r);
  return '<button type="button" class="btn sm lk'+(on?' on':'')+'" data-act="lock" data-r="'+r+'" title="'+t('lk.title')+'">'+LOCK_SVG+(small?'':' '+t(on?'lk.on':'lk.off'))+'</button>';
}
function bookAct(act,ds){
  if(act==='coll'&&g.collAdd(ds.r,ds.q===undefined?undefined:+ds.q)){Sound.sfx('capture');return true;}
  if(act==='lock'){g.toggleLock(ds.r);Sound.sfx('select');return true;}
  return false;
}
function tabCraft(){
  var seg=el('div','seg csub');
  seg.innerHTML='<button type="button" data-s="make">'+t('cr2.make')+'</button><button type="button" data-s="masters">'+t('cr2.masters')+'</button>';
  seg.addEventListener('click',function(e){var b=e.target.closest('button');if(!b)return;craftSub=b.dataset.s;Sound.sfx('select');buildTab();});
  add({el:seg,update:function(){[].forEach.call(seg.children,function(b){b.classList.toggle('sel',b.dataset.s===craftSub);});}});
  if(craftSub==='masters')return tabCraftMasters();
  /* v18: здесь только недавние (10 последних разных) и закреплённые; заказывать новое - в окне мастера */
  var lst=craftList();
  if(!curItem||!D.GOOD_BY[curItem]||lst.indexOf(curItem)<0)curItem=lst[0]||null;
  add(actBlock(function(){
    return '<div class="cr-top"><button type="button" class="btn sm" data-act="book">'+spr('o_book','ri')+' '+t('bk.open')+'</button>'+hb('craft')+'</div>';
  },function(act){if(act==='book'&&window.Book)Book.open();}));
  if(!curItem){
    add(actBlock(function(){return queueHtml(true);},queueAct));
    add(block('<p class="note">'+t('cr3.empty')+'</p>'));
    return;
  }
  /* закреплённые и недавние */
  add(actBlock(function(){
    function cardOf(r){
      var mid=recipeMaster(r),m=g.master(mid),bl=g.orderBlock(mid,r),pin=g.isPinned(r);
      var cls='it-card'+(curItem===r?' sel':'')+(m.hired&&!bl?' ok':'')+(pin?' pin':'');
      var n=g.invCount(r);
      return '<button type="button" class="'+cls+'" data-act="pick" data-r="'+r+'">'+(pin?'<i class="pin-i"></i>':'')+(g.isLocked(r)?'<i class="lk-c">'+LOCK_SVG+'</i>':'')+orderIcon(r,true)+'<span>'+orderName(r)+'</span><small>'+(n?'x'+n:'')+'</small></button>';
    }
    var P=S.pinned||[],Rc=(S.recent||[]).filter(function(r){return P.indexOf(r)<0;});
    var h='';
    if(P.length)h+='<div class="lbl full">'+t('cr3.pinned')+'</div><div class="it-grid">'+P.map(cardOf).join('')+'</div>';
    if(Rc.length)h+='<div class="lbl full">'+t('cr3.recent')+'</div><div class="it-grid">'+Rc.map(cardOf).join('')+'</div>';
    return h;
  },function(act,ds){
    if(act!=='pick')return;
    /* второе нажатие на уже выбранную вещь сразу ставит её в очередь */
    if(curItem===ds.r){quickOrder(ds.r);return;}
    curItem=ds.r;
  }));
  /* выбранная вещь */
  add(actBlock(function(){
    var r=curItem,gd=D.GOOD_BY[r],mid=recipeMaster(r),m=g.master(mid),sp=!gd,mage=mid==='mage',known=sp||m.known.indexOf(r)>=0,c=g.orderCost(r);
    var h='<div class="it-detail"><div class="it-big">'+orderIcon(r,true)+'</div><div class="it-info"><b>'+orderName(r)+'</b>'+
      '<small>'+mName(mid)+(m.hired?' '+t('ms.lvl',{n:m.lvl}):' · '+t('ms.notHired'))+'</small>';
    if(gd&&gd.eff)h+='<em>'+effText(r,0)+'</em>';
    h+='<p class="note">'+t('desc.'+r)+'</p></div></div>';
    if(!c){h+='<p class="note">'+t('ord.'+r+'Max')+'</p>';return h;}
    h+='<div class="it-facts"><span>'+t('cr2.time')+' <b>'+ft(g.craftTime(mid,r)/g.mSpeed(mid))+'</b></span>'+(gd?'<span>'+t('cr2.price')+' <b>'+COIN+D.fmt(Math.round(gd.price*g.itemPriceMult(r)))+'</b></span>':'')+
      (mage?'<span>'+t('cr2.xp')+' <b>+'+D.fmt(g.scrollXp(r))+'</b></span>':'')+'</div>';
    h+='<div class="it-cost">'+(Object.keys(c).length?costHtml(c):'<span class="note">'+t('cr2.free')+'</span>')+'</div>';
    if(gd&&known&&m.hired)h+=masteryHtml(mid,r);
    if(!m.hired){var hc=D.MASTER_BY[mid].hire;h+='<button type="button" class="btn pink" data-act="hire" data-m="'+mid+'"'+(S.gold<hc?' disabled':'')+'>'+t('cr2.hireFirst',{m:t('ms.'+mid)})+' '+COIN+D.fmt(hc)+'</button>';}
    else if(!known&&mage)h+='<button type="button" class="btn" disabled>'+t('cr2.needMage',{n:gd.lvl})+'</button>';
    else if(!known)h+='<button type="button" class="btn" data-act="masters" data-m="'+mid+'">'+(m.lvl>=gd.lvl?t('cr2.teach',{g:D.fmt(gd.teach)}):t('cr2.needLvl',{m:t('ms.'+mid),n:gd.lvl}))+'</button>';
    else{
      var bl=g.orderBlock(mid,r);
      h+='<div class="btn-row left"><button type="button" class="btn pink" data-act="order" data-r="'+r+'"'+(bl?' disabled':'')+'>'+(bl?t('cr2.block.'+bl):t('cr2.do'))+'</button>'+
        '<span class="note">'+t('q2.short',{n:S.queue.length,m:S.qSlots})+'</span></div>';
    }
    if(mage)h+='<p class="note'+(S.place==='home'?'':' bad')+'">'+t(S.place==='home'?'cr2.mageHome':'cr2.mageAway')+'</p>';
    if(gd)h+='<div class="lbl full">'+t('bk.title')+'</div>'+bookRow(r);
    if(gd)h+='<div class="btn-row left"><button type="button" class="btn sm'+(g.isPinned(r)?' pink':'')+'" data-act="pin" data-r="'+r+'">'+t(g.isPinned(r)?'cr3.unpin':'cr3.pin')+'</button>'+lockBtn(r)+
      '<button type="button" class="btn sm" data-act="masters" data-m="'+mid+'">'+t('cr3.openMaster',{m:mName(mid)})+'</button></div>';
    return h;
  },function(act,ds){
    if(act==='order'&&g.order(recipeMaster(ds.r),ds.r))Sound.sfx('select');
    if(act==='hire'&&g.hire(ds.m))toast(t('ms.hired',{m:t('ms.'+ds.m)}));
    if(act==='masters'&&window.Masters)Masters.open(ds.m);
    bookAct(act,ds);
    if(act==='pin'){g.togglePin(ds.r);buildTab();}
  }));
  /* общая очередь */
  add(actBlock(function(){return queueHtml(true);},queueAct));
  /* закреплённая снизу полоса: выбранная вещь и кнопка, видна при любой прокрутке списка */
  add(actBlock(function(){
    var r=curItem,mid=recipeMaster(r),m=g.master(mid),c=g.orderCost(r),bl=c?g.orderBlock(mid,r):'max';
    var btn=bl?t('cr2.block.'+bl):t('cr2.do');
    return '<div class="cbar-it">'+orderIcon(r,true)+'<div><b>'+orderName(r)+'</b><small>'+(c&&Object.keys(c).length?costHtml(c):t('cr2.free'))+'</small></div></div>'+
      '<span class="cbar-q">'+S.queue.length+'/'+S.qSlots+'</span>'+
      '<button type="button" class="btn pink" data-act="order" data-r="'+r+'"'+(bl?' disabled':'')+'>'+btn+'</button>';
  },function(act,ds){if(act==='order')quickOrder(ds.r);},'cbar'));
}
function craftList(){var P=S.pinned||[];return P.concat((S.recent||[]).filter(function(r){return P.indexOf(r)<0;}));}
function quickOrder(r){
  var mid=recipeMaster(r);
  if(g.order(mid,r)){toast(t('cr2.ordered',{r:orderName(r)}));return true;}
  var bl=g.orderBlock(mid,r);if(bl)toast(t('cr2.block.'+bl));
  return false;
}
function tabCraftMasters(){
  add(actBlock(function(){
    var h='<div class="ms-list">';
    D.MASTERS.forEach(function(d){
      var m=g.master(d.id),n=g.queueOf(d.id).length,state=!m.hired?t('ms.notHired'):m.teach?t('ms3.teach'):n?t('ms3.busy2',{n:n}):t('ms.idle');
      h+='<button type="button" class="ms-card'+(m.hired?'':' off')+'" data-act="open" data-m="'+d.id+'">'+
        '<span class="ms-face f-'+d.id+'"></span><span class="ms-txt"><b>'+t('ms.'+d.id)+'</b><small>'+(m.hired?t('ms.lvl',{n:m.lvl})+' · ':'')+state+'</small></span>'+
        '<span class="ms-items">'+m.known.slice(0,4).map(function(r){return itemIcon(r,0);}).join('')+'</span></button>';
    });
    /* маг пишет свитки сам, когда он в таверне */
    var mq=g.queueOf('mage').length;
    h+='<button type="button" class="ms-card" data-act="open" data-m="mage"><span class="ms-face f-mage"></span><span class="ms-txt"><b>'+t('ms.mage')+'</b><small>'+t('ms.lvl',{n:S.mlvl})+' · '+(mq?t('ms3.busy2',{n:mq}):S.place==='home'?t('ms.idle'):t('ms3.mageAwayS'))+'</small></span>'+
      '<span class="ms-items">'+g.master('mage').known.slice(-4).map(function(r){return itemIcon(r,0);}).join('')+'</span></button>';
    /* мастер питомцев: своё окно */
    var P2=g.pets(),ap=P2.active&&P2.own[P2.active];
    h+='<button type="button" class="ms-card'+(P2.hired?'':' off')+'" data-act="pets"><span class="ms-face f-pets"></span><span class="ms-txt"><b>'+t('pt.title')+'</b><small>'+
      (P2.hired?(ap?(window.Pets?Pets.name(P2.active):'')+' '+t('ms.lvl',{n:ap.lvl}):'')+(P2.train?' · '+t('pt.trainS'):''):t('ms.notHired')+' · '+t('pt.cardI'))+'</small></span></button>';
    return h+'</div>';
  },function(act,ds){if(act==='open'&&window.Masters)Masters.open(ds.m);if(act==='pets'&&window.Pets)Pets.open();}));
}

/* ── ГОРОД: постройки таверны и шахта ── */
/* ── ГОРОД: промыслы, бригады, конюшня и постройки таверны ── */
/* полоска 20 вкладов: o={st,bt,lvl,max,cost,now,next,wait,act,id,extra} */
function stageHtml(o){
  var segs='';for(var i=0;i<D.STAGES;i++)segs+='<i'+(i<o.st?' class="on"':'')+'></i>';
  var h='<div class="stg">';
  if(o.lvl>=o.max&&!o.bt)return h+'<div class="stg-t"><span>'+t('st2.max')+'</span></div></div>';
  if(o.bt){
    var k=1-o.bt.t/o.bt.T;
    return h+'<div class="stg-t"><span>'+t(o.kind==='tools'?'st2.making':'st2.building',{n:o.lvl+1})+'</span><b>'+ft(o.bt.t)+'</b></div>'+
      '<div class="bar stgb"><i style="width:'+(k*100).toFixed(1)+'%"></i></div>'+(o.next?'<p class="note">'+t('st2.after',{v:o.next})+'</p>':'')+'</div>';
  }
  if(o.wait)return h+'<div class="stg-t"><span>'+t(o.waitKey||'st2.wait')+'</span></div>'+(o.save?saveHtml(o.save):'')+'</div>';
  h+='<div class="stg-t"><span>'+t('st2.toNext',{n:o.lvl+1})+'</span><b>'+o.st+' / '+D.STAGES+'</b></div><div class="stg-s">'+segs+'</div>';
  if(o.now)h+='<p class="note">'+t('st2.now',{a:o.now,b:o.next})+'</p>';
  if(o.cost)h+='<div class="stg-b"><button type="button" class="btn sm" data-act="'+o.act+'" data-id="'+o.id+'"'+(g.canPay(o.cost)?'':' disabled')+'>'+t('st2.invest')+' '+costHtml(o.cost)+'</button>'+
    '<button type="button" class="btn sm ghost" data-act="'+o.act+'" data-id="'+o.id+'" data-max="1"'+(g.canPay(o.cost)?'':' disabled')+'>'+t('st2.max5')+'</button></div>';
  if(o.save)h+=saveHtml(o.save);
  if(o.extra)h+='<p class="note">'+o.extra+'</p>';
  return h+'</div>';
}
/* v20: часть мастера на новый инструмент (копится с продаж его вещей) */
function saveHtml(sv){
  var k=sv.need>0?Math.min(1,sv.have/sv.need):1;
  return '<div class="stg-t sv"><span>'+t('ms4.part')+'</span><b>'+D.fmt(Math.floor(Math.min(sv.have,sv.need)))+' / '+D.fmt(sv.need)+'</b></div><div class="bar svb'+(k>=1?' ok':'')+'"><i style="width:'+(k*100).toFixed(1)+'%"></i></div>';
}
function rate2(v){return v>=10?Math.round(v*10)/10:Math.round(v*100)/100;}
function prodName(id){return t('pd.'+id);}
function prodBlock(id){
  return actBlock(function(){
    var d=g.prodDef(id),o=g.prod(id),built=o.lvl>0,q=g.crewQueued(id);
    var h='<div class="pd-head"><b>'+prodName(id)+'</b><span>'+(built?t('ms.lvl',{n:o.lvl}):'')+'</span></div>';
    if(!built){
      h+='<p class="note">'+t('pd.'+id+'.d')+'</p>';
      if(o.bt)return h+stageHtml({kind:'prod',lvl:0,max:1,st:0,bt:o.bt});
      if(q)return h+'<p class="note">'+t('st2.wait')+'</p>';
      var blk=g.prodBuildBlock(id);
      if(blk==='tract')return h+'<p class="bad">'+t('pd.needTract',{t:tractName(d.tract)})+'</p>';
      return h+'<div class="stg-b"><button type="button" class="btn sm" data-act="build" data-id="'+id+'"'+(blk?' disabled':'')+'>'+t('buy.build')+' '+costHtml(d.build)+'</button></div>';
    }
    if(id==='stable'){
      var ev=g.cartEvery(),nx=D.STABLE.every[Math.min(o.lvl,D.STABLE.max-1)];
      h+='<p>'+t('pd.cartNow',{m:Math.round(ev)})+'</p><p class="note">'+t('pd.cartNext',{m:Math.round(ev*60-(o.cart||0))>0?ft(ev*60-(o.cart||0)):'0'})+'</p>';
      return h+stageHtml({kind:'prod',id:id,act:'inv',lvl:o.lvl,max:D.STABLE.max,st:o.st,bt:o.bt,cost:g.prodCost(id),wait:q,
        now:o.lvl<D.STABLE.max?t('pd.every',{m:Math.round(ev)}):'',next:t('pd.every',{m:nx})});
    }
    var any=false;
    d.lines.forEach(function(r){
      var open=g.lineOpen(r),n=Math.floor(o.acc[r]||0),cap=g.lineCap(id,r),rt=g.lineRate(id,r);
      if(n>=1)any=true;
      h+='<div class="pd-line'+(open?'':' off')+'">'+resIcon(r)+'<span>'+t('res.'+r)+'</span>'+
        (open?'<b>'+D.fmt(n)+' / '+D.fmt(cap)+'</b><small>'+t('pd.perH',{n:rate2(rt)})+'</small>':'<small>'+t('pd.lineTract',{t:tractName(D.resTract(r))})+'</small>')+'</div>'+
        (open?'<div class="bar pdb'+(n>=cap?' full':'')+'"><i style="width:'+Math.min(100,n/cap*100).toFixed(1)+'%"></i></div>':'');
    });
    h+='<div class="stg-b"><button type="button" class="btn sm" data-act="collect" data-id="'+id+'"'+(any?'':' disabled')+'>'+t('mine.collect')+'</button>'+(g.prodFull(id)?'<span class="bad">'+t('pd.full')+'</span>':'')+'</div>';
    var ln=d.lines.filter(function(r){return g.lineOpen(r);})[0]||d.lines[0];
    var nowV=rate2(g.lineRate(id,ln)),nextV=rate2(D.PROD_BASE[ln]*(o.lvl+1));
    return h+stageHtml({kind:'prod',id:id,act:'inv',lvl:o.lvl,max:D.PROD_MAX,st:o.st,bt:o.bt,cost:g.prodCost(id),wait:q,
      now:resIcon(ln)+t('pd.perH',{n:nowV}),next:resIcon(ln)+t('pd.perH',{n:nextV}),
      extra:o.st<D.STAGES&&!o.bt&&o.lvl<D.PROD_MAX?t('st2.left',{g:D.fmt(g.prodCostLeft(id))}):''});
  },function(act,ds){
    var id2=ds.id;
    if(act==='build'){if(g.prodBuild(id2))toast(t('pd.started',{b:prodName(id2)}));}
    else if(act==='inv'){var n=0;do{if(!g.prodInvest(id2))break;n++;}while(ds.max&&n<D.STAGES);}
    else if(act==='collect'){var r=g.prodCollect(id2);if(!Object.keys(r).length)toast(t('pd.storeFull'));}
  },'pd pd-'+id);
}
/* v18: улучшения мага заказываются здесь (посох и склад у столяра, сумка у кожевника) */
function mageUpBlock(){
  return actBlock(function(){
    var h='<div class="pd-head"><b>'+t('cr2.ups')+'</b><span>'+t('q2.short',{n:S.queue.length,m:S.qSlots})+'</span></div>';
    ['staff','bag','store'].forEach(function(r){
      var mid=D.ORDERS[r].m,m=g.master(mid),c=g.orderCost(r);
      h+='<div class="mu-row">'+orderIcon(r,true)+'<div class="mu-t"><b>'+orderName(r)+'</b><small>'+t('ms.lvl',{n:r==='staff'?S.staff:r==='bag'?S.bagLvl:S.storeLvl})+' · '+mName(mid)+(c?' · '+ft(g.craftTime(mid,r)/g.mSpeed(mid)):'')+'</small>'+(c?'<span class="mu-c">'+costHtml(c)+'</span>':'')+'</div>';
      if(!c){h+='<span class="note">'+t('buy.done')+'</span></div>';return;}
      var bl=g.orderBlock(mid,r);
      if(bl==='hire')h+='<button type="button" class="btn sm pink" data-act="hire" data-m="'+mid+'">'+t('cr2.hireFirst',{m:t('ms.'+mid)})+'</button></div>';
      else h+='<button type="button" class="btn sm" data-act="order" data-r="'+r+'"'+(bl?' disabled':'')+'>'+(bl?t('cr2.block.'+bl):t('cr2.do'))+'</button></div>';
    });
    return h;
  },function(act,ds){
    if(act==='order'){var mid=D.ORDERS[ds.r].m;if(g.order(mid,ds.r))toast(t('cr2.ordered',{r:orderName(ds.r)}));}
    if(act==='hire'&&g.hire(ds.m))toast(t('ms.hired',{m:t('ms.'+ds.m)}));
  },'pd');
}
function tabCity(){
  add(mageUpBlock());
  add(actBlock(function(){
    var busy=g.crewsBusy(),n=S.crews||1,q=g.crewQ(),cc=g.crewCost();
    var h='<div class="lbl full">'+t('pd.crews')+hb('city')+'</div><p>'+t('pd.crewsNow',{a:busy,b:n})+'</p>';
    var list=[];for(var id in S.prod){var o=S.prod[id];if(o.bt)list.push(prodName(id)+' · '+ft(o.bt.t));}
    if(list.length)h+='<p class="note">'+list.join('<br>')+'</p>';
    if(q.length)h+='<p class="note">'+t('pd.queue',{l:q.map(prodName).join(', ')})+'</p>';
    h+='<div class="stg-b">'+(cc?'<button type="button" class="btn sm" data-act="crew"'+(g.canPay(cc)?'':' disabled')+'>'+t('pd.crewBuy')+' '+costHtml(cc)+'</button>':'')+
      '<button type="button" class="btn sm" data-act="all">'+t('pd.collectAll')+'</button></div>';
    return h;
  },function(act){
    if(act==='crew')g.buyCrew();
    else if(act==='all'){var r=g.prodCollectAll();if(!r.n)toast(t('pd.nothing'));}
  }));
  D.PROD.forEach(function(d){add(prodBlock(d.id));});
  add(prodBlock('stable'));
  D.BUILD_ORDER.forEach(function(id){
    var b=D.BUILD[id];
    add(row({title:function(){return t('bd.'+id);},lvl:function(){return t('row.lvlMax',{n:g.buildLvl(id),m:b.max});},
      info:function(){return t('bd.'+id+'.d',{v:buildVal(id)});},
      btn:function(){return t('buy.up');},
      done:function(){return !g.buildCost(id);},cost:function(){return g.buildCost(id);},buy:function(){return g.buildUp(id);}}));
  });
}
function buildVal(id){
  var l=g.buildLvl(id);
  if(id==='hall')return (Math.round(D.custRate(l,0)*10)/10)+' / '+D.custMax(l);
  if(id==='bedroom')return g.restH();
  if(id==='decor')return Math.round((D.decorMult(l)-1)*100);
  return '';
}

/* ── СКЛАД: ресурсы и изделия ── */
function tabStore(){
  add(liveBlock(function(){
    var cap=g.storeCap(),h='<div class="lbl full">'+t('store.title')+' · '+t('store.capS',{n:D.fmt(cap)})+'</div><div class="res-grid">';
    D.RES.forEach(function(r){
      var n=g.have(r.id);if(!n&&r.rare)return;
      h+='<div class="res-tile'+(n>=cap?' full':'')+(n?'':' zero')+'">'+resIcon(r.id)+'<span>'+t('res.'+r.id)+'</span><b>'+D.fmt(n)+'</b></div>';
    });
    return h+'</div>';
  }));
  add(actBlock(function(){
    var h='<div class="lbl full">'+t('store.items')+hb('book')+'</div><div class="it-grid">',any=false;
    D.GOODS.forEach(function(gd){
      var n=g.invCount(gd.id);if(!n)return;any=true;
      var best=0,qs='',need=false;
      for(var q=D.QUAL.length-1;q>0;q--)if(S.inv[gd.id+':'+q]){best=q;break;}
      for(q=0;q<4;q++){var k=S.inv[gd.id+':'+q]||0;if(k)qs+='<i class="q'+q+'">'+k+'</i>';if(k&&g.bookNeed(gd.id,q))need=true;}
      h+='<button type="button" class="it-card st-it" data-act="bk" data-r="'+gd.id+'">'+(g.isLocked(gd.id)?'<i class="lk-c">'+LOCK_SVG+'</i>':'')+(need?'<i class="bk-n" title="'+t('bq.needT')+'"></i>':'')+
        itemIcon(gd.id,best,true)+'<span>'+itemName(gd.id)+'</span><small class="st-q">'+qs+'</small></button>';
    });
    return h+'</div>'+(any?'':'<p class="note">'+t('store.noItems')+'</p>');
  },function(act,ds){if(act==='bk'&&window.Book){var gd=D.GOOD_BY[ds.r];Book.open(gd.m,ds.r);}}));
}

/* ── СНАРЯЖЕНИЕ: надетое и зелья в поход ── */
function tabGear(){
  add(liveBlock(function(){
    return '<div class="stat-row big"><span>'+icon('overload')+D.fmt(g.dps())+'</span><span class="hp">'+D.fmt(g.maxHp())+'</span><span>'+t('gear.crit',{c:Math.round(g.critChance()*100)})+'</span><span>'+t('gear.pick',{p:Math.round(g.pickMult()*100)})+'</span></div>';
  }));
  add(actBlock(function(){
    var h='<div class="eq-grid">';
    D.SLOTS.forEach(function(sl){
      var it=S.equip[sl];
      h+='<div class="eq-slot'+(it?' on':'')+'"><small>'+t('slot8.'+sl)+'</small>'+(it?itemIcon(it.id,it.q,true)+'<b>'+itemName(it.id)+'</b><em>'+effText(it.id,it.q)+'</em><button type="button" class="x" data-act="off" data-s="'+sl+'">x</button>':'<span class="eq-empty"></span>')+'</div>';
    });
    h+='</div>';
    var alt='';
    D.GOODS.forEach(function(gd){
      if(!gd.slot)return;var n=g.invCount(gd.id);if(!n)return;
      var bestQ=0;for(var q=D.QUAL.length-1;q>=0;q--)if(S.inv[gd.id+':'+q]){bestQ=q;break;}
      alt+='<button type="button" class="it-card ok" data-act="on" data-id="'+gd.id+'">'+itemIcon(gd.id,bestQ,true)+'<span>'+itemName(gd.id)+'</span><small>'+t('gear.on')+' · x'+n+'</small></button>';
    });
    if(alt)h+='<div class="lbl full">'+t('gear.can')+'</div><div class="it-grid">'+alt+'</div>';
    return h;
  },function(act,ds){if(act==='off')g.unequip(ds.s);if(act==='on')g.equipItem(ds.id);}));
  add(actBlock(function(){
    var h='<div class="lbl full">'+t('gear.potions')+hb('mage')+'</div><div class="it-grid">';
    D.GOODS.forEach(function(gd){
      if(gd.kind!=='potion'&&gd.kind!=='ward'&&gd.kind!=='scroll')return;
      var known=g.master(gd.m).known.indexOf(gd.id)>=0||g.invCount(gd.id)>0;if(!known)return;
      h+='<label class="it-card pot'+(S.use[gd.id]?' ok':'')+'"><input type="checkbox" data-act="use" data-id="'+gd.id+'"'+(S.use[gd.id]?' checked':'')+'>'+itemIcon(gd.id,0,true)+'<span>'+itemName(gd.id)+'</span><small>x'+g.invCount(gd.id)+'</small></label>';
    });
    return h+'</div>';
  },function(act,ds,e){if(act==='use'&&e.type==='change')g.setUse(ds.id,e.target.checked);}));
}

function tabSkills(){
  add(liveBlock(function(){return '<p>'+t('sk.points',{n:g.skillPoints()})+hb('mage')+'</p>';}));
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
    '';
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
      ['st.crafted',D.fmt(s.crafted||0)],['st.sold',D.fmt(s.sold||0)],['st.goldEarned',D.fmt(s.goldEarned||0)],['st.play',ft(s.play)],['st.rest',ft(s.rest)],['st.clears',S.tracts.reduce(function(a,x){return a+x.clears;},0)]];
    return '<div class="lbl full">'+t('st.title')+'</div><table class="stats">'+L.map(function(x){return '<tr><td>'+t(x[0])+'</td><td>'+x[1]+'</td></tr>';}).join('')+'</table>';
  }));
  var sv=el('div','blk');
  sv.innerHTML='<div class="lbl full">'+t('st.save')+hb('save')+'</div>'+
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
    '<button class="btn sm" data-d="gold">GOLD +1000</button><button class="btn sm" data-d="open">OPEN TRACTS</button><button class="btn sm" data-d="off">OFFLINE 3H</button></div><p class="note" id="dbg-s"></p>';
  b.addEventListener('click',function(e){
    var k=e.target.dataset&&e.target.dataset.d;if(!k)return;
    if(k==='res')D.RES.forEach(function(r){S.store[r.id]=Math.min(g.storeCap(),g.have(r.id)+200);});
    if(k==='lvl')for(var i=0;i<5;i++)g.addXp(D.xpNeed(S.mlvl));
    if(k==='staff')S.staff+=10;
    if(k==='gold')S.gold+=1000;
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
    b.addEventListener('click',function(){curTab=id;lastTab[tabSet]=id;paintTabs();buildTab();Sound.sfx('select');});
    tabs.appendChild(b);
  });
  tabSet=placeSet();curTab=lastTab[tabSet];
  paintTabs();
}
var viewNow='road',viewLoad=-1;
function setViewBtn(v){viewNow=v;paintView();}
function paintView(){
  if(!H.view)return;
  if(viewLoad>=0&&viewLoad<1){setText(H.view,t('view.loading',{p:Math.round(viewLoad*100)}));H.view.disabled=true;return;}
  var road=S.place==='road';
  setText(H.view,road?t('go.tavern'):t('go.trip'));setText(H.sleep,t('btn.sleep'));
  H.view.disabled=road&&g.inBoss();
  H.view.classList.toggle('on',!road);
  H.sleep.classList.toggle('hidden',S.place!=='home');
  H.sleep.disabled=S.fatigue<0.02;
}
function viewProgress(p){viewLoad=p;paintView();}
/* открыть вкладку (например, по клику на мастера в 3D-таверне) */
function openTab(tab,sub){
  if(tab==='craft'&&sub)craftSub=sub;
  if(TABSETS[tabSet].indexOf(tab)<0)return;
  curTab=tab;lastTab[tabSet]=tab;paintTabs();buildTab();
  /* тап по зданию в 3D: прокрутить к его карточке и подсветить */
  if(tab==='city'&&sub){var bx=document.querySelector('#tab-body .pd-'+sub);if(bx){bx.scrollIntoView({block:'start',behavior:'smooth'});bx.classList.add('flash');setTimeout(function(){bx.classList.remove('flash');},1200);}}
  if(S.settings.panel){S.settings.panel=false;document.body.classList.remove('panel-off');setTimeout(function(){window.dispatchEvent(new Event('resize'));},50);}
}
/* подписи над жителями таверны */
function tavernLabel(kind,id){
  if(kind==='hostess')return '<b>'+t('lbl.hostess')+'</b>'+(S.cust.length?' · '+t('lbl.cust',{n:S.cust.length}):'');
  if(kind==='store')return '<b>'+t('store.title')+'</b>';
  if(kind==='worker'){
    var ow=g.worker(id);if(!ow||!ow.hired)return '';
    var wt=ow.bt?'<i>'+t('lbl.build')+' '+ft(ow.bt.t)+'</i>':ow.lvl>=D.WORKER_MAX?'':'<i>'+Math.floor(Math.min(1,ow.save/D.workerUp(ow.lvl))*100)+'%</i>';
    var wk=ow.bt?1-ow.bt.t/ow.bt.T:Math.min(1,ow.save/D.workerUp(ow.lvl));
    return '<b class="pl-l">'+ow.lvl+'</b> '+t('wk.'+id)+' '+wt+'<span class="pl-bar"><s style="width:'+Math.round(wk*100)+'%"'+(ow.bt?' class="b"':'')+'></s></span>';
  }
  if(kind==='house'){
    if(id==='pets'){var P2=g.pets();return P2.hired?'<b>'+t('pt.title')+'</b>':'<span class="pl-n">'+t('pt.title')+'</span>';}
    var m=g.master(id);if(!m)return '';
    if(!m.hired)return '<span class="pl-n">'+t('ms.'+id)+'</span>';
    var tt=m.tbt?'<i>'+t('lbl.tools')+' '+ft(m.tbt.t)+'</i>':m.tools>=D.TOOLS_MAX?'':'<i>'+Math.round((m.tst||0)/D.STAGES*100)+'%</i>';
    var tk=m.tbt?1-m.tbt.t/m.tbt.T:(m.tst||0)/D.STAGES;
    return '<b class="pl-l">'+m.tools+'</b> '+t('ms.'+id)+' '+tt+'<span class="pl-bar"><s style="width:'+Math.round(tk*100)+'%"'+(m.tbt?' class="b"':'')+'></s></span>';
  }
  if(kind==='prod'){
    var o=g.prod(id);if(!o)return '';
    if(!o.lvl&&!o.bt)return '<span class="pl-n">'+prodName(id)+'</span>';
    var L=g.prodLabel(id),txt;
    if(L.build)txt='<i>'+t('lbl.build')+' '+ft(L.left)+'</i>';
    else if(L.max)txt='';
    else if(L.wait)txt='<i>'+t('lbl.wait')+'</i>';
    else txt='<i>'+Math.round(L.k*100)+'%</i>';
    var full=o.lvl&&id!=='stable'&&g.prodFull(id)?' <em class="pl-full">!</em>':'';
    return '<b class="pl-l">'+o.lvl+'</b> '+prodName(id)+' '+txt+full+'<span class="pl-bar"><s style="width:'+Math.round((L.build?L.k:L.k)*100)+'%"'+(L.build?' class="b"':'')+'></s></span>';
  }
  return '';
}
function paintTabs(){
  var set=TABSETS[tabSet];
  [].forEach.call($('tabs').children,function(b){b.classList.toggle('sel',b.dataset.tab===curTab);b.classList.toggle('hidden',set.indexOf(b.dataset.tab)<0);});
}
/* маг ушёл в таверну или вернулся в поход: меняем набор вкладок */
function checkTabSet(){
  var s2=placeSet();if(s2===tabSet)return;
  tabSet=s2;
  if(TABSETS[s2].indexOf(curTab)<0)curTab=lastTab[s2];
  document.body.classList.toggle('at-home',s2==='tavern');
  paintTabs();buildTab();
}

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
  if(rep.tav)rows.push('<p>'+t('off.tav',{g:D.fmt(rep.tav)})+'</p>');
  if(rep.prod)rows.push('<p class="lbl">'+t('off.prod')+'</p><div class="res-line">'+resList(rep.prod)+'</div>');
  if(rep.crafted)rows.push('<p>'+t('off.crafted',{n:rep.crafted})+'</p>');
  if(rep.legend)rows.push('<p class="gold">'+t('off.legend',{n:rep.legend})+'</p>');
  if(rep.pet)rows.push('<p class="ok">'+t('pt.found',{p:t('pet.'+rep.pet)})+'</p>');
  if(rep.sold)rows.push('<p class="gold">'+COIN+t('off.sold',{n:rep.sold,g:D.fmt(rep.gold)})+'</p>');
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
  showCreate:showCreate,hb:hb,bookRow:bookRow,lockBtn:lockBtn,bookAct:bookAct,LOCK_SVG:LOCK_SVG,offlineReport:offlineReport,setView:setViewBtn,viewProgress:viewProgress,openTab:openTab,tavernLabel:tavernLabel,resIcon:resIcon,tractName:tractName,itemName:itemName,itemIcon:itemIcon,orderName:orderName,orderIcon:orderIcon,costHtml:costHtml,effText:effText,ft:ft,spr:spr,stageHtml:stageHtml,prodName:prodName,
  look:look,t:t,tg:tg,get tab(){return curTab;},
  exportSave:null,importSave:null,resetSave:null,catchUp:null};
})();
