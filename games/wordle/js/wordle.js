/* A.C.EON WORDLE: меню, режимы, поле, клавиатура, статистика.
   Правила в rules.js, словари в words-ru.js и words-en.js (грузятся по выбору языка слов), тексты в lang.js. */
(function(){
'use strict';

var t=I18n.t,A=window.Arcade,R=window.WlRules;
var $=function(id){return document.getElementById(id);};
function show(id){$(id).classList.remove('hidden');}
function hide(id){$(id).classList.add('hidden');}

var MODES=['daily','free','timed'],THEMES=['neon','flat','contrast'],WLANGS=['ru','en'],LENS=[4,5,6];
var ART=new URL('../art/wordle/',location.href).href;
/* картинки от Codex: пока не выложены, false; тогда значки и фон рисуются кодом */
var ART_READY=true;
var TIMED=180,SKIP=10;

function newDaily(){return {played:0,wins:0,streak:0,best:0,last:-9,dist:[0,0,0,0,0,0]};}
Store.define('wordle',{
  version:1,
  defaults:{settings:{mode:'daily',wlang:'',len:5,hard:false,theme:'neon'},
    stats:{wins:0,daily:{ru:newDaily(),en:newDaily()},free:{games:0,wins:0,streak:0,best:0,dist:[0,0,0,0,0,0,0]},
      timed:{ru:{best:0,games:0,words:0},en:{best:0,games:0,words:0}}},
    day:{ru:null,en:null}},
  legacy:function(raw){var w=parseInt(raw('aceon_wl_wins'),10)||0;return w?{stats:{wins:w}}:null;}
});
var DB=Store.get('wordle'),S=DB.settings,ST=DB.stats;
if(MODES.indexOf(S.mode)<0)S.mode='daily';
if(THEMES.indexOf(S.theme)<0)S.theme='neon';
if(WLANGS.indexOf(S.wlang)<0)S.wlang=I18n.lang==='ru'?'ru':'en';
if(LENS.indexOf(S.len|0)<0)S.len=5;
WLANGS.forEach(function(l){if(!ST.daily[l])ST.daily[l]=newDaily();if(!ST.timed[l])ST.timed[l]={best:0,games:0,words:0};if(!DB.day)DB.day={};});
function save(){Store.save('wordle');}

/* ── звуки ── */
Sound.define('wKey',function(tm,tone){tone(tm,700,0.03,'square',0.025);});
Sound.define('wDel',function(tm,tone){tone(tm,420,0.04,'square',0.025,300);});
Sound.define('wBad',function(tm,tone){tone(tm,180,0.08,'square',0.05);tone(tm+0.09,140,0.12,'square',0.05);});
Sound.define('w0',function(tm,tone){tone(tm,260,0.08,'triangle',0.04);});
Sound.define('w1',function(tm,tone){tone(tm,520,0.1,'triangle',0.05);});
Sound.define('w2',function(tm,tone){tone(tm,784,0.12,'sine',0.06);tone(tm,1176,0.08,'sine',0.025);});
Sound.define('wSkip',function(tm,tone,noise){noise(tm,0.15,0.18,700);});

/* ── словари: подгружаются по требованию ── */
var DICT={},VER=(function(){var s=document.querySelector('script[data-v]');return s?s.getAttribute('data-v'):'';})();
function loadDict(l,cb){
  if(DICT[l]){cb();return;}
  if(window.WlDict&&window.WlDict[l]){DICT[l]=R.dict(window.WlDict[l]);cb();return;}
  var s=document.createElement('script');s.src='js/words-'+l+'.js'+(VER?'?v='+VER:'');
  s.onload=function(){if(window.WlDict&&window.WlDict[l]){DICT[l]=R.dict(window.WlDict[l]);cb();}else cb(true);};
  s.onerror=function(){cb(true);};
  document.head.appendChild(s);
}

/* ── клавиатуры и ввод с физической клавиатуры ── */
var KB={en:['qwertyuiop','asdfghjkl','+zxcvbnm-'],ru:['йцукенгшщзхъ','фывапролджэ','+ячсмитьбю-']};
var RUCODE={KeyQ:'й',KeyW:'ц',KeyE:'у',KeyR:'к',KeyT:'е',KeyY:'н',KeyU:'г',KeyI:'ш',KeyO:'щ',KeyP:'з',BracketLeft:'х',BracketRight:'ъ',
  KeyA:'ф',KeyS:'ы',KeyD:'в',KeyF:'а',KeyG:'п',KeyH:'р',KeyJ:'о',KeyK:'л',KeyL:'д',Semicolon:'ж',Quote:'э',
  KeyZ:'я',KeyX:'ч',KeyC:'с',KeyV:'м',KeyB:'и',KeyN:'т',KeyM:'ь',Comma:'б',Period:'ю',Backquote:'е'};
function letterFrom(e,l){
  var k=(e.key||'').toLowerCase().replace(/ё/g,'е');
  if(l==='ru'){if(/^[а-я]$/.test(k))return k;return RUCODE[e.code]||null;}
  if(/^[a-z]$/.test(k))return k;
  var m=/^Key([A-Z])$/.exec(e.code||'');return m?m[1].toLowerCase():null;
}

/* ════════ МЕНЮ ════════ */
var ICO={daily:'<span class="m-ico w-ico"><i class="g">1</i></span>',free:'<span class="m-ico w-ico"><i class="y"></i><i class="g"></i><i></i></span>',timed:'<span class="m-ico w-ico w-clock"><b></b></span>'};
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
function today(){return R.dayIndex();}
function dailyStreak(d){return d.last>=today()-1?d.streak:0;}
function distHtml(dist,hl){
  var mx=1;dist.forEach(function(v){mx=Math.max(mx,v);});
  return '<div class="dist">'+dist.map(function(v,i){return '<div class="d-row"><span>'+(i+1)+'</span><i class="'+(hl===i?'hl':'')+'" style="width:'+Math.max(8,Math.round(v/mx*100))+'%">'+v+'</i></div>';}).join('')+'</div>';
}
function buildStats(){
  var h='';
  if(S.mode==='daily'){var d=ST.daily[S.wlang];
    h=row('st.played',d.played)+row('st.winp',(d.played?Math.round(d.wins/d.played*100):0)+'%')+row('st.streak',dailyStreak(d))+row('st.bestStreak',d.best)+
      '<div class="st-h" data-i18n="st.dist"></div>'+distHtml(d.dist,-1);}
  else if(S.mode==='free'){var f=ST.free;
    h=row('st.games',f.games)+row('st.wins',f.wins)+row('st.streak',f.streak)+row('st.bestStreak',f.best)+'<div class="st-h" data-i18n="st.dist"></div>'+distHtml(f.dist,-1);}
  else{var tt=ST.timed[S.wlang];h=row('st.bestWords',tt.best)+row('st.games',tt.games)+row('st.words',tt.words);}
  h+=row('st.total',ST.wins);
  $('stats').innerHTML=h;I18n.apply($('stats'));
}
function segSel(id,v){var l=document.querySelectorAll('#'+id+' .seg-btn');for(var i=0;i<l.length;i++)l[i].classList.toggle('sel',l[i].getAttribute('data-v')===String(v));}
function dailyNote(){
  var st=DB.day[S.wlang];
  if(st&&st.day===today()&&st.done)return t(st.win?'note.dailyWon':'note.dailyLost')+' '+t('note.next',{t:untilTomorrow()});
  return t('note.dailyNo',{n:today()+1});
}
function untilTomorrow(){var n=new Date(),m=new Date(n.getFullYear(),n.getMonth(),n.getDate()+1),s=Math.max(0,Math.floor((m-n)/1000));
  var hh=Math.floor(s/3600),mm=Math.floor(s%3600/60);return hh+':'+(mm<10?'0':'')+mm;}
function paintMenu(){
  buildModes();buildStats();
  segSel('seg-wlang',S.wlang);segSel('seg-len',S.len);segSel('seg-hard',S.hard?'1':'0');segSel('seg-theme',S.theme);
  $('row-len').classList.toggle('hidden',S.mode!=='free');
  $('mode-note').textContent=S.mode==='daily'?dailyNote():S.mode==='timed'?t('note.timed',{s:TIMED/60,k:SKIP}):t('note.free',{n:R.tries(S.len)});
  applyTheme();
}
function applyTheme(){THEMES.forEach(function(x){document.body.classList.toggle('th-'+x,S.theme===x);});document.body.classList.toggle('art',ART_READY&&S.theme!=='flat');}
function showScreen(name){
  document.body.classList.toggle('screen-menu',name==='menu');
  document.body.classList.toggle('screen-game',name==='game');
  if(name==='menu'){paintMenu();hide('over-modal');stopTimer();}
  Sound.music(name==='menu'?'menu':'game');
  window.scrollTo(0,0);
  if(name==='game'){layout();requestAnimationFrame(layout);}
}

/* ════════ ИГРА ════════ */
/* G: mode, l (язык слов), len, tries, ans (загаданное), rows [{w,s}], cur (набор), busy (идёт переворот), over,
   в режиме на время: left (секунды), solved, words (история) */
var G=null;
function newGame(){
  var l=S.wlang;
  $('msg').textContent=t('msg.load');
  loadDict(l,function(err){
    if(err){$('msg').textContent=t('msg.loadErr');return;}
    start(l);
  });
  showScreen('game');
}
function start(l){
  var mode=S.mode,len=mode==='free'?S.len:5,D=DICT[l][len];
  G={mode:mode,l:l,len:len,tries:R.tries(len),hard:!!S.hard,rows:[],cur:'',busy:false,over:false,ans:'',D:D,solved:0,words:[],left:TIMED,used:[]};
  if(mode==='daily'){
    var day=today();G.day=day;G.ans=R.daily(D.ans,l,day);
    var sv=DB.day[l];
    if(sv&&sv.day===day){G.hard=!!sv.hard;sv.rows.forEach(function(w){G.rows.push({w:w,s:R.score(w,G.ans)});});if(sv.done)G.over=true;}
    else DB.day[l]={day:day,rows:[],done:false,win:false,hard:G.hard};
  }else{G.ans=R.pick(D.ans);G.used.push(G.ans);}
  if(mode==='timed'){ST.timed[l].games++;startTimer();}
  if(mode==='free')ST.free.games++;
  save();A.trackPlay();
  hide('over-modal');hide('pause-ov');
  $('btn-skip').classList.toggle('hidden',mode!=='timed');
  buildBoard();buildKeys();paintHud();layout();
  $('msg').textContent=G.over?'':t(G.hard?'msg.startHard':'msg.start',{n:G.len,k:G.tries});
  if(G.over){var sv2=DB.day[l];setTimeout(function(){endRound(sv2.win,true);},300);}
}

/* ── поле ── */
function buildBoard(){
  var h='';
  for(var r=0;r<G.tries;r++){h+='<div class="b-row">';for(var c=0;c<G.len;c++)h+='<div class="tile"><span class="tf"></span><span class="tb"></span></div>';h+='</div>';}
  $('board').innerHTML=h;
  $('board').style.setProperty('--cols',G.len);
  for(r=0;r<G.rows.length;r++)paintRow(r,false);
  paintCur();
}
function tileAt(r,c){var row=$('board').children[r];return row?row.children[c]:null;}
var SCLS=['ab','pr','ok'];
function paintRow(r,anim){
  var row=G.rows[r];
  for(var c=0;c<G.len;c++){var el=tileAt(r,c);if(!el)continue;
    var ch=row.w.charAt(c).toUpperCase();el.children[0].textContent=ch;el.children[1].textContent=ch;
    el.className='tile filled';
    (function(el,s,c){
      function done(){el.className='tile filled shown '+SCLS[s];}
      if(anim){setTimeout(function(){el.className='tile filled flip '+SCLS[s];Sound.sfx('w'+s);},c*260);setTimeout(done,c*260+520);}
      else done();
    })(el,row.s[c],c);
  }
}
function paintCur(){
  if(!G||G.over)return;
  var r=G.rows.length;if(r>=G.tries)return;
  for(var c=0;c<G.len;c++){var el=tileAt(r,c),ch=G.cur.charAt(c).toUpperCase();
    el.children[0].textContent=ch;el.children[1].textContent='';
    el.className='tile'+(ch?' filled':'')+(c===G.cur.length-1&&ch?' pop':'')+(c===G.cur.length?' caret':'');}
}
function shakeRow(){var row=$('board').children[G.rows.length];if(!row)return;row.classList.remove('shake');void row.offsetWidth;row.classList.add('shake');}

/* ── клавиатура ── */
function buildKeys(){
  var h='';
  KB[G.l].forEach(function(line){
    h+='<div class="k-row">';
    for(var i=0;i<line.length;i++){var c=line.charAt(i);
      if(c==='+')h+='<button type="button" class="key wide" data-k="enter">'+t('key.enter')+'</button>';
      else if(c==='-')h+='<button type="button" class="key wide" data-k="del" aria-label="del"><svg viewBox="0 0 20 14" aria-hidden="true"><path d="M6 1h13v12H6L1 7z" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M9 4l6 6M15 4l-6 6" stroke="currentColor" stroke-width="1.6"/></svg></button>';
      else h+='<button type="button" class="key" data-k="'+c+'">'+c.toUpperCase()+'</button>';}
    h+='</div>';
  });
  $('kb').innerHTML=h;$('kb').className='kb kb-'+G.l;
  paintKeys();
}
function paintKeys(){
  var ks=R.keyStates(G.rows),l=$('kb').querySelectorAll('.key');
  for(var i=0;i<l.length;i++){var k=l[i].getAttribute('data-k'),v=ks[k];
    l[i].className='key'+(k.length>1?' wide':'')+(v===undefined?'':' '+SCLS[v]);}
}

function press(k){
  if(!G||G.busy)return;
  if(G.over)return;
  if(k==='enter'){submit();return;}
  if(k==='del'){if(G.cur){G.cur=G.cur.slice(0,-1);Sound.sfx('wDel');paintCur();}return;}
  if(G.cur.length<G.len){G.cur+=k;Sound.sfx('wKey');paintCur();}
}
function bad(msg){$('msg').textContent=msg;$('msg').className='msg bad';shakeRow();Sound.sfx('wBad');}
function submit(){
  var w=G.cur;
  if(w.length<G.len){bad(t('msg.short',{n:G.len}));return;}
  if(!G.D.ok[w]){bad(t(G.l==='ru'?'msg.unknownRu':'msg.unknown'));return;}
  if(G.hard){var e=R.hardCheck(G.rows,w);if(e){bad(e.type==='pos'?t('msg.hardPos',{n:e.i+1,c:e.ch.toUpperCase()}):t('msg.hardHas',{c:e.ch.toUpperCase()}));return;}}
  var s=R.score(w,G.ans);G.rows.push({w:w,s:s});G.cur='';
  if(G.mode==='daily'){DB.day[G.l].rows.push(w);save();}
  var r=G.rows.length-1;G.busy=true;$('msg').textContent='';$('msg').className='msg';
  paintRow(r,true);
  setTimeout(function(){
    G.busy=false;paintKeys();
    var win=R.solved(s);
    if(win)winRow(r);
    if(G.mode==='timed'){
      if(win){G.solved++;ST.wins++;G.words.push({w:G.ans,ok:true});save();setTimeout(nextTimed,700);}
      else if(G.rows.length>=G.tries){G.words.push({w:G.ans,ok:false});$('msg').textContent=t('msg.was',{w:G.ans.toUpperCase()});setTimeout(nextTimed,1300);}
      else paintCur();
      paintHud();return;
    }
    if(win)endRound(true);
    else if(G.rows.length>=G.tries)endRound(false);
    else{paintCur();$('msg').textContent=t('msg.left',{n:G.tries-G.rows.length});}
  },G.len*260+560);
}
function winRow(r){var row=$('board').children[r];if(!row)return;for(var c=0;c<row.children.length;c++)(function(el,c){setTimeout(function(){el.classList.add('jump');},c*90);})(row.children[c],c);}

/* ── на время ── */
var tmr=null,tLast=0;
function startTimer(){stopTimer();tLast=Date.now();tmr=setInterval(tick,200);}
function stopTimer(){if(tmr){clearInterval(tmr);tmr=null;}}
function tick(){
  var n=Date.now(),dt=(n-tLast)/1000;tLast=n;
  if(!G||G.mode!=='timed'||G.over||G.paused)return;
  G.left-=dt;
  if(G.left<=0){G.left=0;stopTimer();G.over=true;G.busy=true;$('msg').textContent=t('msg.was',{w:G.ans.toUpperCase()});G.words.push({w:G.ans,ok:false,cut:true});setTimeout(function(){endTimed();},600);}
  paintHud();
}
function nextTimed(){
  if(!G||G.over)return;
  var a;for(var i=0;i<20;i++){a=R.pick(G.D.ans);if(G.used.indexOf(a)<0)break;}
  G.ans=a;G.used.push(a);G.rows=[];G.cur='';
  buildBoard();paintKeys();$('msg').textContent=t('msg.nextWord');$('msg').className='msg';
}
function skip(){
  if(!G||G.mode!=='timed'||G.over||G.busy)return;
  G.left=Math.max(0,G.left-SKIP);G.words.push({w:G.ans,ok:false});Sound.sfx('wSkip');
  $('msg').textContent=t('msg.was',{w:G.ans.toUpperCase()});
  if(G.left<=0){tick();return;}
  nextTimed();$('msg').textContent=t('msg.was',{w:G.words[G.words.length-1].w.toUpperCase()});paintHud();
}
function endTimed(){
  var tt=ST.timed[G.l],rec=G.solved>tt.best&&G.solved>0;
  if(G.solved>tt.best)tt.best=G.solved;tt.words+=G.solved;save();
  $('over-title').textContent=t('over.time');$('over-title').className='over-title win';
  $('over-word').innerHTML='';
  $('over-rows').innerHTML=row('over.solved',G.solved)+row('st.bestWords',tt.best)+
    '<div class="w-list">'+G.words.map(function(x){return '<span class="'+(x.ok?'ok':'no')+'">'+x.w.toUpperCase()+'</span>';}).join('')+'</div>';
  $('over-rec').classList.toggle('hidden',!rec);
  finishModal(G.solved>0,false);
}

/* ── конец слова (день и свободная) ── */
function endRound(win,restored){
  G.over=true;
  var n=G.rows.length,hl=-1,dist=null;
  if(!restored){
    if(G.mode==='daily'){
      var d=ST.daily[G.l],sv=DB.day[G.l];sv.done=true;sv.win=win;d.played++;
      if(win){d.wins++;d.streak=d.last===G.day-1?d.streak+1:1;d.best=Math.max(d.best,d.streak);d.last=G.day;d.dist[n-1]++;ST.wins++;}
      else{d.streak=0;d.last=G.day;}
    }else{
      var f=ST.free;
      if(win){f.wins++;f.streak++;f.best=Math.max(f.best,f.streak);f.dist[n-1]=(f.dist[n-1]||0)+1;ST.wins++;}
      else f.streak=0;
    }
    save();
  }
  if(win)hl=n-1;
  $('over-title').textContent=t(win?'over.win':'over.lose');$('over-title').className='over-title '+(win?'win':'lose');
  $('over-word').innerHTML='<span>'+t('over.word')+'</span><b>'+G.ans.toUpperCase()+'</b>';
  var rows='';
  if(win)rows+=row('over.tries',n+' / '+G.tries);
  if(G.mode==='daily'){var dd=ST.daily[G.l];
    rows+=row('st.streak',dailyStreak(dd))+row('st.bestStreak',dd.best)+distHtml(dd.dist,hl)+'<div class="opt-note">'+t('note.next',{t:untilTomorrow()})+'</div>';}
  else rows+=row('st.streak',ST.free.streak)+row('st.wins',ST.free.wins);
  $('over-rows').innerHTML=rows;
  $('over-rec').classList.add('hidden');
  finishModal(win,G.mode==='daily');
}
function finishModal(win,share){
  var im=$('over-img');if(ART_READY&&S.theme!=='flat'){im.src=ART+(win?'result_win':'result_lose')+'.webp';im.classList.remove('hidden');}else im.classList.add('hidden');
  $('over-share').classList.toggle('hidden',!share);
  $('over-next').classList.toggle('hidden',G.mode==='daily');
  $('over-next').querySelector('span').textContent=t(G.mode==='timed'?'over.again':'over.next');
  Sound.sfx(win?'win':'lose');Sound.duck(0.3,2000);
  paintHud();
  setTimeout(function(){if(G&&G.over)show('over-modal');},G.mode==='timed'?400:win?1100:700);
}
function shareText(){
  var sq=S.theme==='contrast'?['⬛','🟦','🟧']:['⬛','🟨','🟩'];
  var win=G.rows.length&&R.solved(G.rows[G.rows.length-1].s);
  var head='A.C.EON WORDLE '+G.l.toUpperCase()+' #'+(G.day+1)+' '+(win?G.rows.length:'X')+'/'+G.tries+(G.hard?'*':'');
  return head+'\n'+G.rows.map(function(r){return r.s.map(function(v){return sq[v];}).join('');}).join('\n');
}
function share(){
  var txt=shareText();
  function ok(){$('over-share').querySelector('span').textContent=t('over.copied');setTimeout(function(){$('over-share').querySelector('span').textContent=t('over.share');},1600);}
  function fallback(){var ta=document.createElement('textarea');ta.value=txt;ta.style.position='fixed';ta.style.opacity='0';document.body.appendChild(ta);ta.select();try{document.execCommand('copy');ok();}catch(e){}document.body.removeChild(ta);}
  if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(txt).then(ok,fallback);else fallback();
}

/* ── пауза: только на время ── */
function setPause(on){
  if(!G||G.over||G.mode!=='timed')return;
  G.paused=on;$('pause-ov').classList.toggle('hidden',!on);
  if(!on)tLast=Date.now();
  Sound.sfx('select');
}

var hudCache='';
function paintHud(){
  if(!G)return;
  var c=[];
  if(G.mode==='daily')c=[['hud.day','#'+(G.day+1)],['hud.lang',G.l.toUpperCase()],['hud.streak',dailyStreak(ST.daily[G.l])]];
  else if(G.mode==='free')c=[['hud.len',G.len],['hud.lang',G.l.toUpperCase()],['hud.streak',ST.free.streak]];
  else{var s=Math.ceil(G.left);c=[['hud.time',Math.floor(s/60)+':'+(s%60<10?'0':'')+s%60],['hud.solved',G.solved],['hud.best',Math.max(ST.timed[G.l].best,G.solved)]];}
  var key=c.map(function(x){return x[1];}).join('|')+I18n.lang+G.mode;
  if(key===hudCache)return;hudCache=key;
  $('hud-cells').innerHTML=c.map(function(x){return '<div class="hc"><span>'+t(x[0])+'</span><b>'+x[1]+'</b></div>';}).join('');
  $('hud-cells').classList.toggle('low',G.mode==='timed'&&G.left<=20);
  $('hud-mode').textContent=t('mode.'+G.mode)+(G.hard?' / '+t('opt.hardOn'):'');
}

/* ── размеры: поле и клавиатура влезают в экран без прокрутки ── */
function layout(){
  if(!G||!document.body.classList.contains('screen-game'))return;
  var arena=$('arena'),aw=Math.min(arena.clientWidth-16,560),top=arena.getBoundingClientRect().top;
  var vh=window.innerHeight||document.documentElement.clientHeight;
  var kbH=$('kb').offsetHeight||170,msgH=34,avail=vh-top-kbH-msgH-30;
  var gap=6,cs=Math.floor(Math.min((aw-gap*(G.len-1))/G.len,(avail-gap*(G.tries-1))/G.tries,66));
  cs=Math.max(28,cs);
  $('board').style.setProperty('--cs',cs+'px');
  $('board').style.fontSize=Math.round(cs*0.52)+'px';
}
var rzT;
window.addEventListener('resize',function(){clearTimeout(rzT);rzT=setTimeout(layout,80);});
document.addEventListener('visibilitychange',function(){if(document.hidden&&G&&G.mode==='timed'&&!G.over)setPause(true);});
document.addEventListener('keydown',function(e){
  if(!G||!document.body.classList.contains('screen-game'))return;
  if(e.ctrlKey||e.metaKey||e.altKey)return;
  if(e.code==='Escape'){e.preventDefault();if(G.mode==='timed')setPause(!G.paused);return;}
  if(!$('over-modal').classList.contains('hidden')){if(e.key==='Enter'){e.preventDefault();var nx=$('over-next');if(!nx.classList.contains('hidden'))nx.click();}return;}
  if(G.paused)return;
  if(e.key==='Enter'){e.preventDefault();press('enter');return;}
  if(e.key==='Backspace'){e.preventDefault();press('del');return;}
  var c=letterFrom(e,G.l);if(c){e.preventDefault();press(c);}
});

function onLang(){paintMenu();hudCache='';if(G&&document.body.classList.contains('screen-game')){buildKeys();paintHud();}}
function boot(){
  A.topbar('t.title');
  I18n.apply();I18n.onChange(onLang);
  function seg(id,fn){var l=document.querySelectorAll('#'+id+' .seg-btn');for(var i=0;i<l.length;i++)(function(b){b.addEventListener('click',function(){fn(b.getAttribute('data-v'));save();paintMenu();Sound.sfx('select');});})(l[i]);}
  seg('seg-wlang',function(v){S.wlang=v;});
  seg('seg-len',function(v){S.len=+v;});
  seg('seg-hard',function(v){S.hard=v==='1';});
  seg('seg-theme',function(v){S.theme=v;});
  $('kb').addEventListener('click',function(e){var n=e.target;while(n&&n!==this&&!(n.getAttribute&&n.getAttribute('data-k')))n=n.parentNode;if(!n||n===this)return;press(n.getAttribute('data-k'));});
  $('btn-play').addEventListener('click',newGame);
  $('btn-menu').addEventListener('click',function(){showScreen('menu');});
  $('btn-skip').addEventListener('click',skip);
  $('po-go').addEventListener('click',function(){setPause(false);});
  $('po-menu').addEventListener('click',function(){showScreen('menu');});
  $('over-next').addEventListener('click',newGame);
  $('over-menu').addEventListener('click',function(){showScreen('menu');});
  $('over-share').addEventListener('click',share);
  $('over-close').addEventListener('click',function(){hide('over-modal');});
  paintMenu();
  showScreen('menu');
}

window.AceonWordle={g:function(){return G;},settings:S,db:DB,press:press,newGame:newGame,dict:DICT};
boot();
})();
