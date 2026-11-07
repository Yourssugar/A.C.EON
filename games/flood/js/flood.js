/* A.C.EON FLOOD: меню, режимы, поле, палитра, бот, статистика.
   Правила и робот в rules.js, тексты в lang.js. */
(function(){
'use strict';

var t=I18n.t,A=window.Arcade,R=window.FlRules;
var $=function(id){return document.getElementById(id);};
function show(id){$(id).classList.remove('hidden');}
function hide(id){$(id).classList.add('hidden');}

var MODES=['classic','daily','duel'],THEMES=['neon','paint','retro'],SIZES=[10,14,18,22],COLORS=[4,5,6,7];
var DIFFS=['easy','normal','hard'],OPPS=['easy','normal','hard','friend'];
var SLACK={easy:5,normal:2,hard:0};
var DSIZE={s:[11,8],m:[15,11],l:[21,15]};
var DAILY={w:14,h:14,k:6,slack:4};
var ART=new URL('../art/flood/',location.href).href;
/* картинки от Codex: пока не выложены, false; тогда значки и фон рисуются кодом */
var ART_READY=true;

Store.define('flood',{
  version:1,
  defaults:{settings:{mode:'classic',size:14,colors:6,diff:'normal',opp:'normal',dsize:'m',theme:'neon',symbols:false},
    stats:{solved:0,games:0,by:{}},
    daily:{history:{},streak:0,lastDate:0,bestStreak:0},
    duel:{easy:{w:0,l:0,d:0},normal:{w:0,l:0,d:0},hard:{w:0,l:0,d:0},friend:{p1:0,p2:0,d:0}},
    ach:{mid:0,top:0}},
  legacy:function(raw){var b=parseInt(raw('aceon_hi_flood'),10)||0;return b?{stats:{solved:1,games:1,by:{}}}:null;}
});
var DB=Store.get('flood'),S=DB.settings,ST=DB.stats;
if(MODES.indexOf(S.mode)<0)S.mode='classic';
if(THEMES.indexOf(S.theme)<0)S.theme='neon';
if(SIZES.indexOf(+S.size)<0)S.size=14;
if(COLORS.indexOf(+S.colors)<0)S.colors=6;
if(DIFFS.indexOf(S.diff)<0)S.diff='normal';
if(OPPS.indexOf(S.opp)<0)S.opp='normal';
if(!DSIZE[S.dsize])S.dsize='m';
if(!ST.by)ST.by={};
function save(){Store.save('flood');}

/* ── звуки: каждая клетка булькает чуть выше ── */
Sound.define('fPick',function(tm,tone){tone(tm,330,0.08,'triangle',0.05,520);});
Sound.define('fBig',function(tm,tone){[392,523,659].forEach(function(f,i){tone(tm+i*0.05,f,0.12,'sine',0.05);});});
Sound.define('fNo',function(tm,tone){tone(tm,150,0.1,'square',0.04);});
Sound.define('fBot',function(tm,tone){tone(tm,220,0.08,'triangle',0.04,180);});

function dateNum(d){d=d||new Date();return d.getUTCFullYear()*10000+(d.getUTCMonth()+1)*100+d.getUTCDate();}
function prevDate(n){var y=Math.floor(n/10000),m=Math.floor(n/100)%100,d=n%100;var x=new Date(Date.UTC(y,m-1,d-1));return dateNum(x);}

/* ════════ МЕНЮ ════════ */
var ICO={
  classic:'<span class="m-ico f-ico"><i style="background:var(--c1)"></i><i style="background:var(--c1)"></i><i style="background:var(--c3)"></i><i style="background:var(--c1)"></i><i style="background:var(--c0)"></i><i style="background:var(--c4)"></i><i style="background:var(--c2)"></i><i style="background:var(--c5)"></i><i style="background:var(--c0)"></i></span>',
  daily:'<span class="m-ico f-ico f-cal"><b></b></span>',
  duel:'<span class="m-ico f-ico"><i style="background:var(--c0)"></i><i style="background:var(--c0)"></i><i style="background:var(--c3)"></i><i style="background:var(--c0)"></i><i style="background:var(--c4)"></i><i style="background:var(--c1)"></i><i style="background:var(--c2)"></i><i style="background:var(--c1)"></i><i style="background:var(--c1)"></i></span>'};
function buildModes(){
  var list=$('mode-list');list.innerHTML='';
  MODES.forEach(function(m){
    var b=document.createElement('button');b.type='button';b.className='m-card-btn'+(S.mode===m?' sel':'');
    var ico=ART_READY?'<img class="m-img" alt="" src="'+ART+'mode_'+m+'.webp">':ICO[m];
    b.innerHTML=ico+'<span class="m-txt"><span class="m-name" data-i18n="mode.'+m+'"></span><span class="m-desc" data-i18n="desc.'+m+'"></span></span>';
    b.addEventListener('click',function(){S.mode=m;save();paintMenu();Sound.sfx('select');});
    list.appendChild(b);
  });
  I18n.apply(list);
}
function row(k,v){return '<div class="ov-row"><span>'+t(k)+'</span><b>'+v+'</b></div>';}
function key(){return S.size+'-'+S.colors+'-'+S.diff;}
function dailyStreak(){var d=DB.daily,n=dateNum();return d.lastDate>=prevDate(n)?d.streak:0;}
function buildStats(){
  var h='';
  if(S.mode==='classic'){var b=ST.by[key()]||{played:0,won:0,best:0};
    h=row('st.played',b.played)+row('st.won',b.won)+row('st.best',b.best||'-')+row('st.solved',ST.solved);}
  else if(S.mode==='daily'){var d=DB.daily,today=d.history[dateNum()];
    h=row('st.today',today?(today.best?today.best+' / '+today.par:t('st.notYet')):t('st.notYet'))+row('st.streak',dailyStreak())+row('st.bestStreak',d.bestStreak||0)+lastDays();}
  else{var o=DB.duel[S.opp];
    if(S.opp==='friend')h=row('st.p1',o.p1)+row('st.p2',o.p2)+row('st.draws',o.d);
    else h=row('st.wins',o.w)+row('st.losses',o.l)+row('st.draws',o.d);}
  $('stats').innerHTML=h;
}
function lastDays(){
  var n=dateNum(),out='<div class="days">';
  for(var i=6;i>=0;i--){var d=n;for(var j=0;j<i;j++)d=prevDate(d);var r=DB.daily.history[d];
    var cls=!r?'':!r.best?'tr':r.best<=r.par?'g':r.best<=r.par+2?'s':'b';
    out+='<i class="'+cls+'" title="'+d+'"></i>';}
  return out+'</div>';
}
function segSel(id,v){var l=document.querySelectorAll('#'+id+' .seg-btn');for(var i=0;i<l.length;i++)l[i].classList.toggle('sel',l[i].getAttribute('data-v')===String(v));}
function paintMenu(){
  buildModes();buildStats();
  segSel('seg-size',S.size);segSel('seg-colors',S.colors);segSel('seg-diff',S.diff);segSel('seg-opp',S.opp);segSel('seg-dsize',S.dsize);
  segSel('seg-theme',S.theme);segSel('seg-sym',S.symbols?'1':'0');
  $('box-classic').classList.toggle('hidden',S.mode!=='classic');
  $('box-duel').classList.toggle('hidden',S.mode!=='duel');
  var note='';
  if(S.mode==='classic')note=t('note.'+S.diff);
  else if(S.mode==='daily')note=t('note.daily',{d:fmtDate(dateNum())});
  else note=t(S.opp==='friend'?'note.friend':'note.bot');
  $('mode-note').textContent=note;
  $('how').textContent=t(S.mode==='duel'?'how.duel':'how.flood');
  applyTheme();
}
function fmtDate(n){var d=n%100,m=Math.floor(n/100)%100;return (d<10?'0':'')+d+'.'+(m<10?'0':'')+m+'.'+Math.floor(n/10000);}
function applyTheme(){THEMES.forEach(function(x){document.body.classList.toggle('th-'+x,S.theme===x);});
  document.body.classList.toggle('sym',!!S.symbols);document.body.classList.toggle('art',ART_READY&&S.theme==='neon');}
function showScreen(name){
  document.body.classList.toggle('screen-menu',name==='menu');
  document.body.classList.toggle('screen-game',name==='game');
  if(name==='menu'){paintMenu();hide('over-modal');}
  Sound.music(name==='menu'?'menu':'game');
  window.scrollTo(0,0);
  if(name==='game'){layout();requestAnimationFrame(layout);}
}

/* ════════ ИГРА ════════
   G: mode, st (правила), limit, par, used {undo,hint}, over, bot (уровень или null), think */
var G=null;
function newGame(){
  var mode=S.mode,st,par=0,limit=0,seed=Math.floor(Math.random()*1e9);
  if(mode==='classic'){st=R.make({w:+S.size,h:+S.size,k:+S.colors,seed:seed});par=R.solve(st).length;limit=par+SLACK[S.diff];}
  else if(mode==='daily'){var dn=dateNum();st=R.make({w:DAILY.w,h:DAILY.h,k:DAILY.k,seed:dn*7+3});par=R.solve(st).length;limit=par+DAILY.slack;
    var hd=DB.daily.history[dn];if(!hd){DB.daily.history[dn]={best:0,par:par,tries:0};trimDaily();}DB.daily.history[dn].tries++;}
  else{var z=DSIZE[S.dsize];st=R.make({w:z[0],h:z[1],k:6,seed:seed,duel:true});}
  G={mode:mode,st:st,par:par,limit:limit,used:{undo:0,hint:0},over:false,bot:mode==='duel'&&S.opp!=='friend'?S.opp:null,think:false,hintC:-1};
  ST.games++;save();A.trackPlay();
  hide('over-modal');
  $('btn-undo').classList.toggle('hidden',mode!=='classic');
  $('btn-hint').classList.toggle('hidden',mode==='duel');
  $('duel-bar').classList.toggle('hidden',mode!=='duel');
  $('palette2').classList.toggle('hidden',!(mode==='duel'&&!G.bot));
  $('side-bot').classList.toggle('hidden',!G.bot);
  if(G.bot){$('bot-name').textContent=t('opp.'+G.bot);var bi=$('bot-img');if(ART_READY){bi.src=ART+'bot_'+G.bot+'.webp';bi.classList.remove('hidden');}else bi.classList.add('hidden');}
  buildBoard();paintAll(null);
  msg(mode==='duel'?t(G.bot?'msg.duelBot':'msg.turn',{n:1}):t('msg.start',{n:limit}));
  showScreen('game');
}
function trimDaily(){var h=DB.daily.history,ks=Object.keys(h).sort();while(ks.length>40)delete h[ks.shift()];}
function msg(s,cls){$('msg').textContent=s;$('msg').className='msg'+(cls?' '+cls:'');}

/* ── поле ── */
var cells=[];
function buildBoard(){
  var st=G.st,b=$('board'),h='';
  for(var i=0;i<st.n;i++)h+='<i></i>';
  b.innerHTML=h;b.style.setProperty('--w',st.w);b.style.setProperty('--h',st.h);
  cells=b.children;
  b.classList.toggle('duel',st.duel);
}
/* fresh: клетки, захваченные этим ходом, wave от угла игрока p */
function paintAll(fresh,p){
  var st=G.st,i,dl=null;
  if(fresh){dl={};var ox=p===2?st.w-1:0,oy=p===2?st.h-1:0;
    for(i=0;i<st.n;i++)if(st.own[i]===p){var x=i%st.w,y=(i/st.w)|0;dl[i]=Math.min(520,(Math.abs(x-ox)+Math.abs(y-oy))*14);}}
  for(i=0;i<st.n;i++){var el=cells[i],cls='c'+st.col[i]+(st.own[i]?' o'+st.own[i]:'');
    if(dl&&dl[i]!==undefined)el.style.transitionDelay=dl[i]+'ms';else if(dl)el.style.transitionDelay='0ms';
    if(el.className!==cls)el.className=cls;}
  if(fresh&&fresh.length){for(i=0;i<fresh.length;i++){(function(el,d){setTimeout(function(){el.classList.add('pop');setTimeout(function(){el.classList.remove('pop');},260);},d);})(cells[fresh[i]],(dl[fresh[i]]||0)+120);}}
  paintPalette();paintHud();
}
function paintPalette(){
  var st=G.st;
  [1,2].forEach(function(p){
    var el=p===1?$('palette'):$('palette2');if(p===2&&!(st.duel&&!G.bot))return;
    var h='';
    for(var c=0;c<st.k;c++){var ok=!G.over&&(!st.duel||st.turn===p)&&R.canPick(st,p,c)&&!G.think;
      h+='<button type="button" class="sw c'+c+(R.colorOf(st,p)===c?' cur':'')+(ok?'':' off')+(G.hintC===c&&p===1?' hint':'')+'" data-c="'+c+'" data-p="'+p+'"><span class="k">'+(c+1)+'</span></button>';}
    el.innerHTML=h;
    el.classList.toggle('active',st.duel&&st.turn===p&&!G.over);
  });
}
function move(p,c){
  if(!G||G.over||G.think)return;
  var st=G.st;
  if(st.duel&&st.turn!==p)return;
  if(st.duel&&G.bot&&p!==1)return;
  if(!R.canPick(st,p,c)){Sound.sfx('fNo');return;}
  var fresh=R.pick(st,p,c);
  G.hintC=-1;
  Sound.sfx(fresh.length>=8?'fBig':'fPick');
  paintAll(fresh,p);
  after(p,fresh.length);
}
function after(p,got){
  var st=G.st;
  if(!st.duel){
    if(R.done(st)){endClassic(true);return;}
    if(st.moves>=G.limit){endClassic(false);return;}
    var left=G.limit-st.moves;msg(t('msg.left',{n:left}),left<=2?'bad':'');return;
  }
  if(R.done(st)){endDuel();return;}
  /* у следующего может не быть хода, тогда ход переходит обратно */
  if(!anyMove(st,st.turn)){st.turn=3-st.turn;if(!anyMove(st,st.turn)){endDuel();return;}}
  paintPalette();paintHud();
  if(G.bot&&st.turn===2){G.think=true;paintPalette();msg(t('msg.botThinks'));setTimeout(botTurn,420);}
  else msg(G.bot?t('msg.yourTurn'):t('msg.turn',{n:st.turn}));
}
function anyMove(st,p){for(var c=0;c<st.k;c++)if(R.canPick(st,p,c))return true;return false;}
function botTurn(){
  if(!G||G.over)return;
  var st=G.st,c=R.botMove(st,2,G.bot);
  G.think=false;
  if(c<0){st.turn=1;paintPalette();return;}
  var fresh=R.pick(st,2,c);Sound.sfx('fBot');paintAll(fresh,2);after(2,fresh.length);
}

/* ── отмена и подсказка (только заливка) ── */
function undo(){if(!G||G.over||G.mode!=='classic')return;if(R.undo(G.st)){G.used.undo++;G.hintC=-1;paintAll(null);msg(t('msg.undone'));Sound.sfx('select');}}
function hint(){
  if(!G||G.over||G.st.duel)return;
  var c=R.hint(G.st);if(c<0)return;
  G.used.hint++;G.hintC=c;paintPalette();msg(t('msg.hint'));Sound.sfx('select');
}

/* ── конец ── */
function endClassic(win){
  var st=G.st;G.over=true;
  var clean=!G.used.undo&&!G.used.hint,rec=false,rows='';
  if(G.mode==='classic'){
    var k=key(),b=ST.by[k]||(ST.by[k]={played:0,won:0,best:0});b.played++;
    if(win){b.won++;ST.solved++;if(clean&&(!b.best||st.moves<b.best)){b.best=st.moves;rec=true;}
      if(st.w>=14&&S.diff!=='easy')DB.ach.mid++;if(st.w>=14&&S.diff==='hard')DB.ach.top++;
      A.setHi('flood',st.moves);}
    rows=row('over.moves',st.moves+' / '+G.limit)+row('over.robot',G.par)+(clean?'':row('over.helped',t('over.noRecord')))+row('st.best',b.best||'-');
  }else{
    var dn=dateNum(),h=DB.daily.history[dn];
    if(win){ST.solved++;if(clean&&(!h.best||st.moves<h.best)){h.best=st.moves;rec=true;}
      var d=DB.daily;if(d.lastDate!==dn){d.streak=d.lastDate===prevDate(dn)?d.streak+1:1;d.lastDate=dn;d.bestStreak=Math.max(d.bestStreak||0,d.streak);}}
    rows=row('over.moves',st.moves+' / '+G.limit)+row('over.robot',G.par)+(clean?'':row('over.helped',t('over.noRecord')))+row('st.today',h.best?h.best:'-')+row('st.streak',dailyStreak());
    var md=win&&clean?(st.moves<=G.par?'g':st.moves<=G.par+2?'s':'b'):'';
    $('over-medal').className='medal '+(md?md:'hidden');$('over-medal').textContent=md?t('medal.'+md):'';
  }
  if(G.mode==='classic')$('over-medal').className='medal hidden';
  save();
  title(win?(st.moves<G.par?'over.beatRobot':'over.win'):'over.lose',win);
  $('over-rows').innerHTML=rows;
  $('over-rec').classList.toggle('hidden',!rec);
  finish(win);
}
function endDuel(){
  var st=G.st;G.over=true;
  var a=st.cnt[1],b=st.cnt[2],res=a>b?1:b>a?2:0,o=DB.duel[S.opp];
  if(G.bot){if(res===1)o.w++;else if(res===2)o.l++;else o.d++;}
  else{if(res===1)o.p1++;else if(res===2)o.p2++;else o.d++;}
  if(res===1&&G.bot==='hard')DB.ach.top++;
  save();
  var key2=res===0?'over.draw':G.bot?(res===1?'over.youWin':'over.botWin'):'over.pWin';
  title(key2,res===1||(!G.bot&&res!==0),{n:res});
  $('over-medal').className='medal hidden';
  $('over-rows').innerHTML=row(G.bot?'over.you':'over.p1',a+' ('+Math.round(a/st.n*100)+'%)')+row(G.bot?'over.bot':'over.p2',b+' ('+Math.round(b/st.n*100)+'%)')+row('over.turns',Math.ceil(st.moves/2));
  $('over-rec').classList.add('hidden');
  finish(res===1||(!G.bot&&res!==0));
}
function title(k,win,v){$('over-title').textContent=t(k,v);$('over-title').className='over-title '+(win?'win':'lose');}
function finish(win){
  var im=$('over-img');if(ART_READY&&S.theme==='neon'){im.src=ART+(win?'result_win':'result_lose')+'.webp';im.classList.remove('hidden');}else im.classList.add('hidden');
  paintPalette();paintHud();msg('');
  Sound.sfx(win?'win':'lose');Sound.duck(0.3,2000);
  setTimeout(function(){if(G&&G.over)show('over-modal');},900);
}

var hudCache='';
function paintHud(){
  if(!G)return;
  var st=G.st,c;
  if(!st.duel)c=[['hud.moves',st.moves+' / '+G.limit],['hud.filled',Math.round(st.cnt[1]/st.n*100)+'%'],['hud.robot',G.par]];
  else{c=[[G.bot?'hud.you':'hud.p1',st.cnt[1]],[G.bot?'hud.bot':'hud.p2',st.cnt[2]],['hud.goal',Math.floor(st.n/2)+1]];
    $('bar1').style.width=(st.cnt[1]/st.n*100)+'%';$('bar2').style.width=(st.cnt[2]/st.n*100)+'%';}
  var k=c.map(function(x){return x[1];}).join('|')+I18n.lang+G.mode+(G.bot||'');
  if(k===hudCache)return;hudCache=k;
  $('hud-cells').innerHTML=c.map(function(x){return '<div class="hc"><span>'+t(x[0])+'</span><b>'+x[1]+'</b></div>';}).join('');
  var md=t('mode.'+G.mode);if(G.mode==='classic')md+=' '+st.w+'x'+st.h+' / '+t('diff.'+S.diff);if(G.bot)md+=' / '+t('opp.'+G.bot);
  $('hud-mode').textContent=md;
}

/* ── размеры: поле и палитра в экран без прокрутки ── */
function layout(){
  if(!G||!document.body.classList.contains('screen-game'))return;
  var st=G.st,arena=$('arena'),side=$('side-bot').classList.contains('hidden')?0:($('side-bot').offsetWidth+12);
  var aw=Math.min(arena.clientWidth-16-side,900),top=arena.getBoundingClientRect().top;
  var vh=window.innerHeight||document.documentElement.clientHeight;
  var palH=$('palette').offsetHeight+($('palette2').classList.contains('hidden')?0:$('palette2').offsetHeight+8)+($('duel-bar').classList.contains('hidden')?0:20);
  var avail=vh-top-palH-60;
  var gap=S.theme==='paint'?2:1,cs=Math.floor(Math.min((aw-4-(st.w+1)*gap)/st.w,(avail-4-(st.h+1)*gap)/st.h,44));cs=Math.max(10,cs);
  $('board').style.setProperty('--cs',cs+'px');
}
var rzT;
window.addEventListener('resize',function(){clearTimeout(rzT);rzT=setTimeout(layout,80);});
document.addEventListener('keydown',function(e){
  if(!G||!document.body.classList.contains('screen-game'))return;
  if(e.ctrlKey&&(e.key==='z'||e.key==='Z')){e.preventDefault();undo();return;}
  if(!$('over-modal').classList.contains('hidden')){if(e.key==='Enter'){e.preventDefault();newGame();}return;}
  if(e.key==='h'||e.key==='H'){hint();return;}
  if(e.key==='u'||e.key==='U'||e.key==='Backspace'){e.preventDefault();undo();return;}
  var n=parseInt(e.key,10);
  if(n>=1&&n<=G.st.k){e.preventDefault();var p=G.st.duel?G.st.turn:1;move(p,n-1);}
});

function onLang(){paintMenu();hudCache='';if(G&&document.body.classList.contains('screen-game'))paintAll(null);}
function boot(){
  A.topbar('t.title');
  I18n.apply();I18n.onChange(onLang);
  function seg(id,fn){var l=document.querySelectorAll('#'+id+' .seg-btn');for(var i=0;i<l.length;i++)(function(b){b.addEventListener('click',function(){fn(b.getAttribute('data-v'));save();paintMenu();Sound.sfx('select');});})(l[i]);}
  seg('seg-size',function(v){S.size=+v;});seg('seg-colors',function(v){S.colors=+v;});seg('seg-diff',function(v){S.diff=v;});
  seg('seg-opp',function(v){S.opp=v;});seg('seg-dsize',function(v){S.dsize=v;});
  seg('seg-theme',function(v){S.theme=v;});seg('seg-sym',function(v){S.symbols=v==='1';});
  function pal(e){var n=e.target;while(n&&n.getAttribute&&!n.getAttribute('data-c'))n=n.parentNode;if(!n||!n.getAttribute)return;move(+n.getAttribute('data-p'),+n.getAttribute('data-c'));}
  $('palette').addEventListener('click',pal);$('palette2').addEventListener('click',pal);
  /* нажатие по клетке поля: взять её цвет */
  $('board').addEventListener('click',function(e){
    if(!G||G.over)return;var i=Array.prototype.indexOf.call(cells,e.target);if(i<0)return;
    var p=G.st.duel?G.st.turn:1;if(G.st.own[i]===p)return;move(p,G.st.col[i]);});
  $('btn-play').addEventListener('click',newGame);
  $('btn-menu').addEventListener('click',function(){showScreen('menu');});
  $('btn-undo').addEventListener('click',undo);
  $('btn-hint').addEventListener('click',hint);
  $('over-again').addEventListener('click',newGame);
  $('over-board').addEventListener('click',function(){hide('over-modal');});
  $('over-menu').addEventListener('click',function(){showScreen('menu');});
  paintMenu();
  showScreen('menu');
}

window.AceonFlood={g:function(){return G;},settings:S,db:DB,move:move,newGame:newGame};
boot();
})();
