/* A.C.EON MASTERMIND: меню, режимы, доска, палитра, роботы, статистика.
   Правила и роботы-взломщики в rules.js, тексты в lang.js. */
(function(){
'use strict';

var t=I18n.t,A=window.Arcade,R=window.MmRules;
var $=function(id){return document.getElementById(id);};
function show(id){$(id).classList.remove('hidden');}
function hide(id){$(id).classList.add('hidden');}

var MODES=['classic','daily','duel'],THEMES=['neon','wood','flat'],PRESETS=['easy','normal','hard','expert'],OPPS=['easy','normal','hard'];
var ART=new URL('../art/mastermind/',location.href).href;
/* картинки от Codex: пока не выложены, false; тогда значки и фон рисуются кодом */
var ART_READY=true;

Store.define('mastermind',{
  version:1,
  defaults:{settings:{mode:'classic',preset:'normal',opp:'normal',fb:'classic',check:false,theme:'neon',symbols:false},
    stats:{wins:0,by:{}},
    daily:{history:{},streak:0,lastDate:0,bestStreak:0},
    day:null,
    duel:{easy:{w:0,l:0,d:0},normal:{w:0,l:0,d:0},hard:{w:0,l:0,d:0}}},
  legacy:function(raw){var w=parseInt(raw('aceon_mm_wins'),10)||0;return w?{stats:{wins:w,by:{}}}:null;}
});
var DB=Store.get('mastermind'),S=DB.settings,ST=DB.stats;
if(MODES.indexOf(S.mode)<0)S.mode='classic';
if(THEMES.indexOf(S.theme)<0)S.theme='neon';
if(PRESETS.indexOf(S.preset)<0)S.preset='normal';
if(OPPS.indexOf(S.opp)<0)S.opp='normal';
if(S.fb!=='pos')S.fb='classic';
if(!ST.by)ST.by={};
function save(){Store.save('mastermind');}

/* ── звуки ── */
Sound.define('mPeg',function(tm,tone){tone(tm,620,0.04,'square',0.025);});
Sound.define('mDel',function(tm,tone){tone(tm,380,0.05,'square',0.025,260);});
Sound.define('mBad',function(tm,tone){tone(tm,170,0.09,'square',0.05);tone(tm+0.1,130,0.12,'square',0.05);});
Sound.define('mPinB',function(tm,tone){tone(tm,880,0.07,'sine',0.05);});
Sound.define('mPinW',function(tm,tone){tone(tm,560,0.07,'sine',0.04);});
Sound.define('mNone',function(tm,tone){tone(tm,240,0.08,'triangle',0.04);});
Sound.define('mBot',function(tm,tone){tone(tm,300,0.05,'triangle',0.03,420);});

function dateNum(d){d=d||new Date();return d.getUTCFullYear()*10000+(d.getUTCMonth()+1)*100+d.getUTCDate();}
function prevDate(n){var y=Math.floor(n/10000),m=Math.floor(n/100)%100,d=n%100;return dateNum(new Date(Date.UTC(y,m-1,d-1)));}
function dayNo(n){var y=Math.floor(n/10000),m=Math.floor(n/100)%100,d=n%100;return Math.floor((Date.UTC(y,m-1,d)-Date.UTC(2026,0,1))/86400000)+1;}

/* ════════ МЕНЮ ════════ */
function pegHtml(c,cls){return '<i class="peg'+(c===null||c===undefined?' empty':' c'+c)+(cls?' '+cls:'')+'"></i>';}
var ICO={
  classic:'<span class="m-ico m-pegs">'+pegHtml(0)+pegHtml(2)+pegHtml(3)+pegHtml(1)+'</span>',
  daily:'<span class="m-ico m-cal"><b></b>'+pegHtml(2)+'</span>',
  duel:'<span class="m-ico m-pegs">'+pegHtml(0)+pegHtml(0)+pegHtml(1)+pegHtml(1)+'</span>'};
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
function bkey(){return S.preset+'-'+S.fb;}
function dailyStreak(){var d=DB.daily;return d.lastDate>=prevDate(dateNum())?d.streak:0;}
function distHtml(dist,hl){
  var mx=1;dist.forEach(function(v){mx=Math.max(mx,v||0);});
  return '<div class="dist">'+dist.map(function(v,i){return '<div class="d-row"><span>'+(i+1)+'</span><i class="'+(hl===i?'hl':'')+'" style="width:'+Math.max(8,Math.round((v||0)/mx*100))+'%">'+(v||0)+'</i></div>';}).join('')+'</div>';
}
function presetText(name){var p=R.PRESETS[name];return t('pr.note',{n:p.len,k:p.k,t:p.tries})+' '+t(p.rep?'pr.rep':'pr.norep');}
function buildStats(){
  var h='';
  if(S.mode==='classic'){var b=ST.by[bkey()]||{played:0,won:0,best:0,dist:[]};
    h=row('st.played',b.played)+row('st.won',b.won)+row('st.best',b.best||'-');
    if(b.won){var d=[];for(var i=0;i<R.PRESETS[S.preset].tries;i++)d.push(b.dist[i]||0);h+='<div class="st-h">'+t('st.dist')+'</div>'+distHtml(d,-1);}}
  else if(S.mode==='daily'){var dd=DB.daily,today=dd.history[dateNum()];
    h=row('st.today',today?(today.won?t('st.inTries',{n:today.tries}):t('st.failed')):t('st.notYet'))+row('st.streak',dailyStreak())+row('st.bestStreak',dd.bestStreak||0);}
  else{var o=DB.duel[S.opp];h=row('st.wins',o.w)+row('st.losses',o.l)+row('st.draws',o.d);}
  h+=row('st.total',ST.wins);
  $('stats').innerHTML=h;
}
function segSel(id,v){var l=document.querySelectorAll('#'+id+' .seg-btn');for(var i=0;i<l.length;i++)l[i].classList.toggle('sel',l[i].getAttribute('data-v')===String(v));}
function paintMenu(){
  buildModes();buildStats();
  segSel('seg-preset',S.preset);segSel('seg-opp',S.opp);segSel('seg-fb',S.fb);segSel('seg-check',S.check?'1':'0');
  segSel('seg-theme',S.theme);segSel('seg-sym',S.symbols?'1':'0');
  $('box-classic').classList.toggle('hidden',S.mode!=='classic');
  $('box-duel').classList.toggle('hidden',S.mode!=='duel');
  $('preset-note').textContent=presetText(S.preset);
  $('opp-note').textContent=t('oppd.'+S.opp);
  var note='';
  if(S.mode==='daily'){var h=DB.daily.history[dateNum()];note=h&&h.done?t('note.dailyDone'):t('note.daily',{n:dayNo(dateNum())});note+=' '+presetText('normal');}
  else if(S.mode==='duel')note=t('note.duel')+' '+presetText('normal');
  $('mode-note').textContent=note;
  applyTheme();
}
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
   G: mode, p (набор), fb, secret, rows [{g,r}], cur (набор цветов, null пусто), cursor, over, used, cache,
   в дуэли: bot (уровень), phase setup|play, mine (код игрока), botRows, botRnd */
var G=null;
function newGame(){
  var mode=S.mode,pn=mode==='classic'?S.preset:'normal',p=R.PRESETS[pn];
  G={mode:mode,pn:pn,p:p,fb:S.fb,rows:[],cur:blank(p),cursor:0,over:false,used:{hint:0},cache:{},phase:'play',busy:false};
  if(mode==='daily'){
    var dn=dateNum();G.day=dn;G.secret=R.secret(p,R.rng(dn*13+5));
    var sv=DB.day;
    if(sv&&sv.date===dn){sv.rows.forEach(function(g){G.rows.push({g:g,r:R.score(g,G.secret)});});G.fb=sv.fb||G.fb;if(sv.done)G.over=true;}
    else DB.day={date:dn,rows:[],done:false,won:false,fb:G.fb};
  }else G.secret=R.secret(p);
  if(mode==='duel'){G.bot=S.opp;G.phase='setup';G.botRows=[];G.mine=null;G.fb=S.fb;}
  if(mode!=='daily'||!G.over){A.trackPlay();}
  save();
  hide('over-modal');
  $('col-bot').classList.toggle('hidden',mode!=='duel');
  $('btn-hint').classList.toggle('hidden',mode!=='classic'||R.remaining(p,[],G.cache)<0);
  $('btn-rand').classList.toggle('hidden',G.phase!=='setup');
  var bi=$('bot-img');if(mode==='duel'&&ART_READY){bi.src=ART+'bot_'+G.bot+'.webp';bi.classList.remove('hidden');}else bi.classList.add('hidden');
  buildBoards();buildPalette();paintHud();
  if(G.phase==='setup'){msg(t('msg.setup'));setGo('ctl.ready');}
  else{msg(G.over?'':t('msg.start',{n:p.tries}));setGo('ctl.check');}
  showScreen('game');
  if(G.over&&mode==='daily')setTimeout(function(){endRound(DB.day.won,true);},300);
}
function blank(p){var a=[];for(var i=0;i<p.len;i++)a.push(null);return a;}
function msg(s,cls){$('msg').textContent=s;$('msg').className='msg'+(cls?' '+cls:'');}
function setGo(k){$('btn-go').querySelector('span').textContent=t(k);$('btn-go').setAttribute('data-k',k);}

/* ── доски ── */
function pinsHtml(r,pos,len){
  var a=[],i;
  if(pos){for(i=0;i<len;i++)a.push(pos[i]===2?'b':pos[i]===1?'w':'');}
  else{for(i=0;i<r.b;i++)a.push('b');for(i=0;i<r.w;i++)a.push('w');while(a.length<len)a.push('');}
  return '<span class="pins'+(pos?' pos':'')+'" style="--pc:'+(pos?len:Math.ceil(len/2))+'">'+a.map(function(c){return '<i class="'+c+'"></i>';}).join('')+'</span>';
}
function rowHtml(n,code,res,cls,cursor){
  var h='<div class="row '+(cls||'')+'"><span class="rn">'+(n||'')+'</span><span class="pegs">';
  for(var i=0;i<code.length;i++)h+=pegHtml(code[i],cursor===i?'cur':'');
  h+='</span>'+(res||'<span class="pins empty"></span>')+'</div>';
  return h;
}
function buildBoards(){
  var p=G.p,h='',i;
  /* загаданный код сверху: закрыт до конца */
  h+='<div class="row secret'+(G.over?' open':'')+'"><span class="rn"></span><span class="pegs">';
  for(i=0;i<p.len;i++)h+=G.over?pegHtml(G.secret[i]):'<i class="peg lock"></i>';
  h+='</span><span class="pins empty"></span></div>';
  for(i=0;i<p.tries;i++){
    var r=G.rows[i];
    if(r)h+=rowHtml(i+1,r.g,pinsHtml(r.r,G.fb==='pos'?R.posHint(r.g,G.secret):null,p.len),'done'+(r.bad?' bad':''));
    else if(i===G.rows.length&&!G.over&&G.phase==='play')h+=rowHtml(i+1,G.cur,null,'now',G.cursor);
    else h+=rowHtml(i+1,blank(p),null,'');
  }
  $('board-me').innerHTML=h;
  $('head-me').textContent=G.mode==='duel'?t('head.me'):'';
  $('head-me').classList.toggle('hidden',G.mode!=='duel');
  if(G.mode==='duel')buildBot();
  scrollNow();
}
function buildBot(){
  var p=G.p,h='',i;
  var code=G.phase==='setup'?G.cur:G.mine;
  h+=rowHtml('',code,null,'secret mine'+(G.phase==='setup'?' now':''),G.phase==='setup'?G.cursor:-1);
  for(i=0;i<p.tries;i++){var r=G.botRows[i];
    h+=r?rowHtml(i+1,r.g,pinsHtml(r.r,null,p.len),'done'+(i===G.botRows.length-1?' fresh':'')):rowHtml(i+1,blank(p),null,'');}
  $('board-bot').innerHTML=h;
  $('head-bot').textContent=G.phase==='setup'?t('head.setup'):t('head.bot',{n:t('opp.'+G.bot)});
}
function scrollNow(){var el=$('board-me').querySelector('.row.now');if(el&&el.scrollIntoView){var b=$('board-me');var top=el.offsetTop-b.clientHeight/2;b.scrollTop=Math.max(0,top);}}
function buildPalette(){
  var h='';for(var c=0;c<G.p.k;c++)h+='<button type="button" class="sw" data-c="'+c+'">'+pegHtml(c)+'<span class="k">'+(c+1)+'</span></button>';
  $('palette').innerHTML=h;$('palette').style.setProperty('--n',G.p.k);
}
function repaintCur(){
  if(G.phase==='setup'){buildBot();return;}
  var rows=$('board-me').querySelectorAll('.row'),el=rows[G.rows.length+1];if(!el)return;
  var pegs=el.querySelectorAll('.peg');
  for(var i=0;i<pegs.length;i++)pegs[i].className='peg'+(G.cur[i]===null?' empty':' c'+G.cur[i])+(G.cursor===i?' cur':'');
}

/* ── ввод ── */
function canInput(){return G&&!G.over&&!G.busy;}
function putColor(c){
  if(!canInput())return;
  if(!G.p.rep){var at=G.cur.indexOf(c);if(at>=0&&at!==G.cursor){msg(t('msg.noRep'),'bad');Sound.sfx('mBad');return;}}
  G.cur[G.cursor]=c;Sound.sfx('mPeg');
  /* курсор на следующую пустую ячейку */
  var n=G.p.len,i;for(i=1;i<=n;i++){var j=(G.cursor+i)%n;if(G.cur[j]===null){G.cursor=j;break;}}
  if(i>n)G.cursor=Math.min(n-1,G.cursor+1);
  repaintCur();checkLive();
}
function del(){
  if(!canInput())return;
  if(G.cur[G.cursor]===null&&G.cursor>0)G.cursor--;
  else if(G.cur[G.cursor]===null){var last=-1;for(var i=0;i<G.cur.length;i++)if(G.cur[i]!==null)last=i;if(last<0)return;G.cursor=last;}
  G.cur[G.cursor]=null;Sound.sfx('mDel');repaintCur();msg('');
}
function moveCursor(d){if(!canInput())return;G.cursor=(G.cursor+d+G.p.len)%G.p.len;repaintCur();}
function tapSlot(i){if(!canInput())return;if(G.cursor===i&&G.cur[i]!==null){G.cur[i]=null;Sound.sfx('mDel');}G.cursor=i;repaintCur();}
/* проверка противоречий: подсказка, а не запрет */
function checkLive(){
  if(!S.check||G.phase!=='play'||G.cur.indexOf(null)>=0){if(G.phase==='play')msg('');return;}
  var k=R.contradicts(G.cur,G.rows);
  if(k>=0)msg(t('msg.contra',{n:k+1}),'warn');else msg(t('msg.fits'));
}
function go(){
  if(!canInput())return;
  if(G.cur.indexOf(null)>=0){msg(t('msg.fill',{n:G.p.len}),'bad');Sound.sfx('mBad');shake();return;}
  if(G.phase==='setup'){
    G.mine=G.cur.slice();G.phase='play';G.cur=blank(G.p);G.cursor=0;
    hide('btn-rand');setGo('ctl.check');buildBoards();msg(t('msg.duelGo'));Sound.sfx('select');return;}
  var g=G.cur.slice(),r=R.score(g,G.secret);
  var bad=S.check&&R.contradicts(g,G.rows)>=0;
  G.rows.push({g:g,r:r,bad:bad});G.cur=blank(G.p);G.cursor=0;
  if(G.mode==='daily'){DB.day.rows.push(g);save();}
  buildBoards();revealPins();
  var won=r.b===G.p.len;
  if(G.mode==='duel'){G.busy=true;setTimeout(function(){botTurn(won);},650);return;}
  if(won)endRound(true);
  else if(G.rows.length>=G.p.tries)endRound(false);
  else msg(t('msg.left',{n:G.p.tries-G.rows.length}));
  paintHud();
}
function shake(){var el=G.phase==='setup'?$('board-bot').querySelector('.row.now'):$('board-me').querySelector('.row.now');if(!el)return;el.classList.remove('shake');void el.offsetWidth;el.classList.add('shake');}
function revealPins(){
  var rows=$('board-me').querySelectorAll('.row.done'),el=rows[rows.length-1];if(!el)return;
  var pins=el.querySelectorAll('.pins i'),r=G.rows[G.rows.length-1].r;
  for(var i=0;i<pins.length;i++)(function(pin,i){pin.style.animationDelay=(i*90)+'ms';pin.classList.add('in');})(pins[i],i);
  Sound.sfx(r.b?'mPinB':r.w?'mPinW':'mNone');
}
function randomMine(){if(!G||G.phase!=='setup')return;G.cur=R.secret(G.p);G.cursor=0;Sound.sfx('mPeg');buildBot();}

/* ── дуэль: ход робота сразу после хода игрока ── */
function botTurn(meWon){
  if(!G||G.over)return;
  var g=R.botGuess(G.p,G.botRows,G.bot,null,G.cache),r=R.score(g,G.mine);
  G.botRows.push({g:g,r:r});Sound.sfx('mBot');
  buildBot();G.busy=false;
  var botWon=r.b===G.p.len,n=G.rows.length;
  if(meWon||botWon){endDuel(meWon&&botWon?0:meWon?1:2);return;}
  if(n>=G.p.tries){endDuel(0);return;}
  msg(t('msg.left',{n:G.p.tries-n}));paintHud();
}

/* ── конец ── */
function endRound(win,restored){
  G.over=true;var n=G.rows.length,rec=false,rows='',p=G.p;
  if(!restored){
    if(G.mode==='classic'){
      var k=bkey(),b=ST.by[k]||(ST.by[k]={played:0,won:0,best:0,dist:[]});b.played++;
      if(win){b.won++;ST.wins++;b.dist[n-1]=(b.dist[n-1]||0)+1;if(!G.used.hint&&(!b.best||n<b.best)){b.best=n;rec=true;}}
      A.setHi('mind',ST.wins);
    }else{
      var dn=G.day,d=DB.daily;DB.day.done=true;DB.day.won=win;
      d.history[dn]={tries:n,won:win,done:true};trimDaily();
      if(win){ST.wins++;d.streak=d.lastDate===prevDate(dn)?d.streak+1:1;d.lastDate=dn;d.bestStreak=Math.max(d.bestStreak||0,d.streak);}
      else{d.streak=0;d.lastDate=dn;}
    }
    save();
  }
  buildBoards();
  title(win?'over.win':'over.lose',win);
  codeShow(G.secret);
  if(win)rows+=row('over.tries',n+' / '+p.tries);
  if(G.mode==='classic'){var bb=ST.by[bkey()];rows+=row('st.best',bb.best||'-')+(G.used.hint?row('over.helped',t('over.noRecord')):'');}
  else rows+=row('st.streak',dailyStreak())+row('st.bestStreak',DB.daily.bestStreak||0);
  $('over-rows').innerHTML=rows;
  $('over-rec').classList.toggle('hidden',!rec);
  finish(win,G.mode==='daily');
}
function trimDaily(){var h=DB.daily.history,ks=Object.keys(h).sort();while(ks.length>40)delete h[ks.shift()];}
function endDuel(res){
  G.over=true;var o=DB.duel[G.bot];
  if(res===1){o.w++;ST.wins++;}else if(res===2)o.l++;else o.d++;
  if(res===1)ST.duelWins=(ST.duelWins||0)+1;
  save();buildBoards();
  title(res===1?'over.youWin':res===2?'over.botWin':'over.draw',res===1);
  codeShow(G.secret);
  $('over-rows').innerHTML=row('over.you',G.rows[G.rows.length-1].r.b===G.p.len?t('over.crackedIn',{n:G.rows.length}):t('over.notCracked'))+
    row('over.bot',G.botRows.length&&G.botRows[G.botRows.length-1].r.b===G.p.len?t('over.crackedIn',{n:G.botRows.length}):t('over.notCracked'));
  $('over-rec').classList.add('hidden');
  finish(res===1,false);
}
function title(k,win){$('over-title').textContent=t(k);$('over-title').className='over-title '+(win?'win':'lose');}
function codeShow(code){$('over-code').innerHTML='<span>'+t('over.code')+'</span><span class="pegs">'+code.map(function(c){return pegHtml(c);}).join('')+'</span>';}
function finish(win,share){
  var im=$('over-img');if(ART_READY&&S.theme==='neon'){im.src=ART+(win?'result_win':'result_lose')+'.webp';im.classList.remove('hidden');}else im.classList.add('hidden');
  $('over-share').classList.toggle('hidden',!share);
  $('over-again').classList.toggle('hidden',G.mode==='daily');
  msg('');paintHud();
  Sound.sfx(win?'win':'lose');Sound.duck(0.3,2000);
  setTimeout(function(){if(G&&G.over)show('over-modal');},win?900:700);
}
function shareText(){
  var win=G.rows.length&&G.rows[G.rows.length-1].r.b===G.p.len;
  var out='A.C.EON MASTERMIND #'+dayNo(G.day)+' '+(win?G.rows.length:'X')+'/'+G.p.tries+'\n';
  out+=G.rows.map(function(r){var s='',i;for(i=0;i<r.r.b;i++)s+='●';for(i=0;i<r.r.w;i++)s+='○';while(s.length<G.p.len)s+='·';return s;}).join('\n');
  return out;
}
function share(){
  var txt=shareText(),btn=$('over-share').querySelector('span');
  function ok(){btn.textContent=t('over.copied');setTimeout(function(){btn.textContent=t('over.share');},1600);}
  function fallback(){var ta=document.createElement('textarea');ta.value=txt;ta.style.position='fixed';ta.style.opacity='0';document.body.appendChild(ta);ta.select();try{document.execCommand('copy');ok();}catch(e){}document.body.removeChild(ta);}
  if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(txt).then(ok,fallback);else fallback();
}
/* подсказка: сколько кодов ещё подходит под все ответы */
function hint(){
  if(!G||G.over||G.mode!=='classic')return;
  var n=R.remaining(G.p,G.rows,G.cache);if(n<0)return;
  G.used.hint++;msg(t('msg.remain',{n:n}));Sound.sfx('select');
}

var hudCache='';
function paintHud(){
  if(!G)return;
  var c,p=G.p;
  if(G.mode==='duel')c=[['hud.round',Math.min(p.tries,G.rows.length+(G.over?0:1))+' / '+p.tries],['hud.you',bestOf(G.rows)],['hud.bot',bestOf(G.botRows||[])]];
  else c=[['hud.try',Math.min(p.tries,G.rows.length+(G.over?0:1))+' / '+p.tries],['hud.code',p.len+' / '+p.k],[G.mode==='daily'?'hud.day':'hud.best',G.mode==='daily'?'#'+dayNo(G.day):((ST.by[bkey()]||{}).best||'-')]];
  var k=c.map(function(x){return x[1];}).join('|')+I18n.lang+G.mode;
  if(k===hudCache)return;hudCache=k;
  $('hud-cells').innerHTML=c.map(function(x){return '<div class="hc"><span>'+t(x[0])+'</span><b>'+x[1]+'</b></div>';}).join('');
  var md=t('mode.'+G.mode);if(G.mode==='classic')md+=' / '+t('pr.'+G.pn);if(G.bot)md+=' / '+t('opp.'+G.bot);
  $('hud-mode').textContent=md;
}
/* лучший ответ в строках: сколько на месте */
function bestOf(rows){var b=0;rows.forEach(function(r){if(r.r.b>b)b=r.r.b;});return b+' / '+G.p.len;}

/* ── размеры ── */
function layout(){
  if(!G||!document.body.classList.contains('screen-game'))return;
  var p=G.p,arena=$('arena'),duel=G.mode==='duel';
  var aw=Math.min(arena.clientWidth-16,760),top=$('boards').getBoundingClientRect().top;
  var vh=window.innerHeight||document.documentElement.clientHeight;
  var ctlH=document.querySelector('.controls').offsetHeight||120;
  var avail=vh-top-ctlH-24;
  /* строка: номер (0.7) + ячейки + фишки ответа (~0.9 ячейки); в дуэли вторая доска 0.62 от первой */
  var units=0.7+p.len*1.18+(G.fb==='pos'?p.len*0.46:Math.ceil(p.len/2)*0.5)+1.2;
  var wUnits=duel?units*1.62+0.6:units;
  var ps=Math.floor(Math.min(aw/wUnits,avail/((p.tries+1)*1.42+1),46));
  ps=Math.max(16,ps);
  $('boards').style.setProperty('--ps',ps+'px');
  $('col-bot').style.setProperty('--ps',Math.max(12,Math.round(ps*0.62))+'px');
}
var rzT;
window.addEventListener('resize',function(){clearTimeout(rzT);rzT=setTimeout(layout,80);});
document.addEventListener('keydown',function(e){
  if(!G||!document.body.classList.contains('screen-game'))return;
  if(e.ctrlKey||e.metaKey||e.altKey)return;
  if(!$('over-modal').classList.contains('hidden')){if(e.key==='Enter'){e.preventDefault();if(G.mode!=='daily')newGame();}return;}
  if(e.key==='Enter'){e.preventDefault();go();return;}
  if(e.key==='Backspace'||e.key==='Delete'){e.preventDefault();del();return;}
  if(e.key==='ArrowLeft'){e.preventDefault();moveCursor(-1);return;}
  if(e.key==='ArrowRight'){e.preventDefault();moveCursor(1);return;}
  if(e.key==='h'||e.key==='H'){hint();return;}
  var n=parseInt(e.key,10);if(n>=1&&n<=G.p.k){e.preventDefault();putColor(n-1);}
});

function onLang(){paintMenu();hudCache='';if(G&&document.body.classList.contains('screen-game')){buildBoards();paintHud();setGo($('btn-go').getAttribute('data-k')||'ctl.check');}}
function boot(){
  A.topbar('t.title');
  I18n.apply();I18n.onChange(onLang);
  function seg(id,fn){var l=document.querySelectorAll('#'+id+' .seg-btn');for(var i=0;i<l.length;i++)(function(b){b.addEventListener('click',function(){fn(b.getAttribute('data-v'));save();paintMenu();Sound.sfx('select');});})(l[i]);}
  seg('seg-preset',function(v){S.preset=v;});seg('seg-opp',function(v){S.opp=v;});seg('seg-fb',function(v){S.fb=v;});
  seg('seg-check',function(v){S.check=v==='1';});seg('seg-theme',function(v){S.theme=v;});seg('seg-sym',function(v){S.symbols=v==='1';});
  $('palette').addEventListener('click',function(e){var n=e.target;while(n&&n.getAttribute&&!n.getAttribute('data-c'))n=n.parentNode;if(!n||!n.getAttribute)return;putColor(+n.getAttribute('data-c'));});
  function slotClick(board){return function(e){var n=e.target;if(!n.classList||!n.classList.contains('peg'))return;var row=n.parentNode&&n.parentNode.parentNode;if(!row||!row.classList.contains('now'))return;
    var pegs=row.querySelectorAll('.peg');tapSlot(Array.prototype.indexOf.call(pegs,n));};}
  $('board-me').addEventListener('click',slotClick('me'));$('board-bot').addEventListener('click',slotClick('bot'));
  $('btn-play').addEventListener('click',newGame);
  $('btn-del').addEventListener('click',del);
  $('btn-go').addEventListener('click',go);
  $('btn-rand').addEventListener('click',randomMine);
  $('btn-hint').addEventListener('click',hint);
  $('btn-menu').addEventListener('click',function(){showScreen('menu');});
  $('over-again').addEventListener('click',newGame);
  $('over-share').addEventListener('click',share);
  $('over-board').addEventListener('click',function(){hide('over-modal');});
  $('over-menu').addEventListener('click',function(){showScreen('menu');});
  paintMenu();
  showScreen('menu');
}

window.AceonMind={g:function(){return G;},settings:S,db:DB,put:putColor,go:go,newGame:newGame};
boot();
})();
