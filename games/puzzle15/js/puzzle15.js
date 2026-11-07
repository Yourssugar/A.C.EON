/* A.C.EON 15: меню, режимы, поле, картинки, ввод, статистика.
   Правила и решатель в rules.js, тексты в lang.js. */
(function(){
'use strict';

var t=I18n.t,A=window.Arcade,R=window.P15Rules;
var $=function(id){return document.getElementById(id);};
function show(id){$(id).classList.remove('hidden');}
function hide(id){$(id).classList.add('hidden');}

var MODES=['classic','daily','ladder'],THEMES=['neon','wood','flat'],SIZES=[3,4,5,6],LADDER=[3,4,5];
var ART=new URL('../art/puzzle15/',location.href).href;
/* картинки от Codex: пока не выложены, false; тогда картинки для плиток рисуются кодом */
var ART_READY=true;
var PICS=(ART_READY?['pic_1','pic_2','pic_3','pic_4','pic_5','pic_6']:[]).concat(['gen_sun','gen_city','gen_space']);

Store.define('puzzle15',{
  version:1,
  defaults:{settings:{mode:'classic',size:4,look:'num',pic:0,nums:true,theme:'neon',inv:false},
    stats:{solved:0,by:{}},
    daily:{history:{},streak:0,lastDate:0,bestStreak:0},
    ladder:{runs:0,done:0,best:0},
    save:null},
  legacy:function(raw){
    var by={},n=0;[3,4,5].forEach(function(s){var v=parseInt(raw('aceon_hi_pz'+s),10)||0;if(v){by[s]={played:1,solved:1,bestTime:0,bestMoves:v};n++;}});
    return n?{stats:{solved:n,by:by}}:null;}
});
var DB=Store.get('puzzle15'),S=DB.settings,ST=DB.stats;
if(MODES.indexOf(S.mode)<0)S.mode='classic';
if(THEMES.indexOf(S.theme)<0)S.theme='neon';
if(SIZES.indexOf(+S.size)<0)S.size=4;
if(S.look!=='pic')S.look='num';
S.pic=Math.max(0,Math.min(PICS.length-1,S.pic|0));
if(!ST.by)ST.by={};
function save(){Store.save('puzzle15');}

/* ── звуки ── */
Sound.define('pSlide',function(tm,tone,noise){noise(tm,0.04,0.08,1800);tone(tm,260,0.04,'triangle',0.03,200);});
Sound.define('pNo',function(tm,tone){tone(tm,150,0.06,'square',0.03);});
Sound.define('pRow',function(tm,tone){tone(tm,660,0.08,'sine',0.04);tone(tm+0.06,880,0.08,'sine',0.03);});

function dateNum(d){d=d||new Date();return d.getUTCFullYear()*10000+(d.getUTCMonth()+1)*100+d.getUTCDate();}
function prevDate(n){var y=Math.floor(n/10000),m=Math.floor(n/100)%100,d=n%100;return dateNum(new Date(Date.UTC(y,m-1,d-1)));}
function fmtT(ms){if(!ms&&ms!==0)return '-';var s=Math.floor(ms/1000),m=Math.floor(s/60);s%=60;var d=Math.floor(ms%1000/100);return m+':'+(s<10?'0':'')+s+'.'+d;}

/* ── картинки для плиток: свои или нарисованные кодом ── */
var PIC_URL={};
function genPic(name){
  if(PIC_URL[name])return PIC_URL[name];
  var c=document.createElement('canvas');c.width=c.height=512;var g=c.getContext('2d'),i;
  if(!g)return '';
  if(name==='gen_sun'){
    var gr=g.createLinearGradient(0,0,0,512);gr.addColorStop(0,'#12042e');gr.addColorStop(0.55,'#6a1660');gr.addColorStop(0.56,'#0b0420');gr.addColorStop(1,'#050510');g.fillStyle=gr;g.fillRect(0,0,512,512);
    var sg=g.createLinearGradient(0,120,0,290);sg.addColorStop(0,'#ffd23a');sg.addColorStop(1,'#ff2d78');g.fillStyle=sg;g.beginPath();g.arc(256,280,130,Math.PI,0);g.fill();
    g.fillStyle='#6a1660';for(i=0;i<6;i++)g.fillRect(120,200+i*15,272,3+i);
    g.fillStyle='#1a0838';g.beginPath();g.moveTo(0,286);g.lineTo(90,200);g.lineTo(170,286);g.moveTo(300,286);g.lineTo(410,180);g.lineTo(512,286);g.fill();
    g.strokeStyle='#00e5ff';g.lineWidth=2;for(i=0;i<12;i++){var y=290+Math.pow(i/11,2)*222;g.globalAlpha=0.3+i/16;g.beginPath();g.moveTo(0,y);g.lineTo(512,y);g.stroke();}
    for(i=-10;i<=10;i++){g.globalAlpha=0.6;g.beginPath();g.moveTo(256+i*12,290);g.lineTo(256+i*80,512);g.stroke();}
  }else if(name==='gen_city'){
    var gr2=g.createLinearGradient(0,0,0,512);gr2.addColorStop(0,'#050520');gr2.addColorStop(1,'#2a0c44');g.fillStyle=gr2;g.fillRect(0,0,512,512);
    g.fillStyle='#fff';for(i=0;i<80;i++){g.globalAlpha=Math.random()*0.8;g.fillRect(Math.random()*512,Math.random()*260,2,2);}g.globalAlpha=1;
    g.fillStyle='#ff2d78';g.beginPath();g.arc(390,110,46,0,Math.PI*2);g.fill();
    var cols=['#0c0c30','#14143e','#1c1050'];
    for(var L=0;L<3;L++){for(i=0;i<9;i++){var w=40+((i*37+L*11)%5)*12,h=120+((i*53+L*29)%7)*40-L*40,x=i*62-20+L*20;g.fillStyle=cols[L];g.fillRect(x,512-h,w,h);
      g.fillStyle=L===2?'#ffd23a':'#00e5ff';for(var wy=512-h+10;wy<500;wy+=16)for(var wx=x+6;wx<x+w-6;wx+=10)if(((wx*7+wy*3+L)|0)%5===0)g.fillRect(wx,wy,4,6);}}
  }else{
    g.fillStyle='#03030c';g.fillRect(0,0,512,512);
    var neb=[['#8c6cff',180,200,220],['#ff2d78',340,320,180],['#00e5ff',260,260,120]];
    neb.forEach(function(n){var rg=g.createRadialGradient(n[1],n[2],0,n[1],n[2],n[3]);rg.addColorStop(0,n[0]);rg.addColorStop(1,'rgba(0,0,0,0)');g.globalAlpha=0.55;g.fillStyle=rg;g.fillRect(0,0,512,512);});
    g.globalAlpha=1;g.fillStyle='#fff';for(i=0;i<160;i++){var s=Math.random()<0.1?3:1.5;g.globalAlpha=0.4+Math.random()*0.6;g.fillRect(Math.random()*512,Math.random()*512,s,s);}
    g.globalAlpha=1;var pg=g.createRadialGradient(150,380,10,170,400,90);pg.addColorStop(0,'#ffd23a');pg.addColorStop(1,'#a04a10');g.fillStyle=pg;g.beginPath();g.arc(170,400,80,0,Math.PI*2);g.fill();
    g.strokeStyle='rgba(255,210,58,.7)';g.lineWidth=5;g.beginPath();g.ellipse(170,400,140,30,-0.3,0,Math.PI*2);g.stroke();
  }
  PIC_URL[name]=c.toDataURL('image/png');return PIC_URL[name];
}
function picUrl(i){var n=PICS[i];return n.indexOf('gen_')===0?genPic(n):ART+n+'.webp';}

/* ════════ МЕНЮ ════════ */
function miniTiles(a){return '<span class="m-ico p-ico">'+a.map(function(x){return x?'<i>'+x+'</i>':'<i class="e"></i>';}).join('')+'</span>';}
var ICO={classic:miniTiles([1,2,3,4,5,6,7,8,0]),daily:'<span class="m-ico p-cal"><b>15</b></span>',ladder:'<span class="m-ico p-lad"><i></i><i></i><i></i></span>'};
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
function buildPics(){
  var h='';for(var i=0;i<PICS.length;i++)h+='<button type="button" class="pic'+(S.pic===i?' sel':'')+'" data-i="'+i+'" style="background-image:url('+picUrl(i)+')"></button>';
  $('pics').innerHTML=h;
}
function row(k,v){return '<div class="ov-row"><span>'+t(k)+'</span><b>'+v+'</b></div>';}
function dailyStreak(){var d=DB.daily;return d.lastDate>=prevDate(dateNum())?d.streak:0;}
function buildStats(){
  var h='';
  if(S.mode==='classic'){var b=ST.by[S.size]||{};
    h=row('st.played',b.played||0)+row('st.solved',b.solved||0)+row('st.bestTime',b.bestTime?fmtT(b.bestTime):'-')+row('st.bestMoves',b.bestMoves||'-');}
  else if(S.mode==='daily'){var d=DB.daily.history[dateNum()];
    h=row('st.today',d&&d.best?t('st.todayRes',{m:d.best,p:d.par}):t('st.notYet'))+row('st.streak',dailyStreak())+row('st.bestStreak',DB.daily.bestStreak||0);}
  else{var l=DB.ladder;h=row('st.runs',l.runs)+row('st.done',l.done)+row('st.bestTime',l.best?fmtT(l.best):'-');}
  h+=row('st.total',ST.solved);
  $('stats').innerHTML=h;
}
function segSel(id,v){var l=document.querySelectorAll('#'+id+' .seg-btn');for(var i=0;i<l.length;i++)l[i].classList.toggle('sel',l[i].getAttribute('data-v')===String(v));}
function paintMenu(){
  buildModes();buildStats();
  segSel('seg-size',S.size);segSel('seg-look',S.look);segSel('seg-nums',S.nums?'1':'0');segSel('seg-theme',S.theme);segSel('seg-inv',S.inv?'1':'0');
  $('box-classic').classList.toggle('hidden',S.mode!=='classic');
  $('pics').classList.toggle('hidden',S.look!=='pic');$('row-nums').classList.toggle('hidden',S.look!=='pic');
  if(S.look==='pic')buildPics();
  $('mode-note').textContent=S.mode==='daily'?t('note.daily'):S.mode==='ladder'?t('note.ladder'):t('note.size'+S.size);
  var sv=DB.save;$('btn-cont').classList.toggle('hidden',!(sv&&S.mode==='classic'&&sv.n===+S.size));
  applyTheme();
}
function applyTheme(){THEMES.forEach(function(x){document.body.classList.toggle('th-'+x,S.theme===x);});document.body.classList.toggle('art',ART_READY&&S.theme==='neon');}
function showScreen(name){
  document.body.classList.toggle('screen-menu',name==='menu');
  document.body.classList.toggle('screen-game',name==='game');
  if(name==='menu'){saveGame();paintMenu();hide('over-modal');}
  Sound.music(name==='menu'?'menu':'game');
  window.scrollTo(0,0);
  if(name==='game'){layout();requestAnimationFrame(layout);}
}

/* ════════ ИГРА ════════
   G: mode, n, st, ms (время), t0 (начало отрезка), started, over, used{hint}, par, stage (лестница), total */
var G=null;
function newGame(resume){
  var mode=S.mode,n=mode==='classic'?+S.size:mode==='daily'?4:LADDER[0],tl;
  G={mode:mode,n:n,ms:0,t0:0,started:false,over:false,used:{hint:0,peek:0},par:0,stage:0,total:0,totalMoves:0};
  if(resume&&DB.save){var sv=DB.save;G.n=n=sv.n;tl=sv.t.slice();G.ms=sv.ms||0;G.st=R.make(n,tl);G.st.moves=sv.moves||0;G.used=sv.used||G.used;G.started=G.st.moves>0;}
  else{
    if(mode==='daily'){var dn=dateNum();G.day=dn;tl=R.walk(4,50,R.rng(dn*17+9));
      var h=DB.daily.history[dn];if(!h){DB.daily.history[dn]={par:0,best:0,bestTime:0,tries:0};trimDaily();}DB.daily.history[dn].tries++;G.par=DB.daily.history[dn].par;}
    else tl=R.shuffle(n);
    G.st=R.make(n,tl);
    if(mode==='classic'){var b=ST.by[n]||(ST.by[n]={played:0,solved:0,bestTime:0,bestMoves:0});b.played++;DB.save=null;}
    if(mode==='ladder')DB.ladder.runs++;
  }
  save();A.trackPlay();
  hide('over-modal');
  $('btn-hint').classList.toggle('hidden',G.n>4||mode==='ladder');
  buildBoard();paintHud();
  msg(t(mode==='ladder'?'msg.stage':'msg.start',{n:G.n+'x'+G.n,i:1,k:LADDER.length}));
  showScreen('game');
  /* задача дня: робот считает лучший путь один раз в день */
  if(mode==='daily'&&!G.par)setTimeout(function(){var p=R.solve(G.st.t,4,6000000);if(p&&G&&G.mode==='daily'){G.par=p.length;DB.daily.history[G.day].par=G.par;save();paintHud();}},120);
}
function trimDaily(){var h=DB.daily.history,ks=Object.keys(h).sort();while(ks.length>40)delete h[ks.shift()];}
function msg(s,cls){$('msg').textContent=s;$('msg').className='msg'+(cls?' '+cls:'');}
function saveGame(){
  if(!G||G.over||G.mode!=='classic'||!G.started){return;}
  pauseClock();
  DB.save={n:G.n,t:G.st.t.slice(),moves:G.st.moves,ms:G.ms,used:G.used};save();
}

/* ── поле ── */
var tiles={},cs=60,gap=4;
function buildBoard(){
  var n=G.n,b=$('board'),pic=S.look==='pic',url=pic?picUrl(S.pic):'';
  b.innerHTML='<div class="peek hidden" id="peek"></div>';tiles={};
  b.classList.toggle('pic',pic);b.classList.toggle('nonum',pic&&!S.nums);
  for(var v=1;v<n*n;v++){var el=document.createElement('div');el.className='tile';el.setAttribute('data-v',v);
    el.innerHTML='<span>'+v+'</span>';if(pic)el.style.backgroundImage='url('+url+')';
    b.appendChild(el);tiles[v]=el;}
  if(pic)$('peek').style.backgroundImage='url('+url+')';
  layout();place(false);
}
function place(anim){
  var st=G.st,n=G.n,pic=S.look==='pic';
  for(var i=0;i<st.t.length;i++){var v=st.t[i];if(!v)continue;var el=tiles[v],r=Math.floor(i/n),c=i%n;
    if(!anim)el.style.transition='none';
    el.style.transform='translate('+(gap+c*(cs+gap))+'px,'+(gap+r*(cs+gap))+'px)';
    var home=(v-1),hr=Math.floor(home/n),hc=home%n;
    el.classList.toggle('home',home===i);
    if(pic){el.style.backgroundSize=(n*cs)+'px '+(n*cs)+'px';el.style.backgroundPosition=(-hc*cs)+'px '+(-hr*cs)+'px';}
    if(!anim){void el.offsetWidth;el.style.transition='';}
  }
}
function layout(){
  if(!G||!document.body.classList.contains('screen-game'))return;
  var n=G.n,arena=$('arena'),aw=Math.min(arena.clientWidth-20,640),top=$('board').getBoundingClientRect().top;
  var vh=window.innerHeight||document.documentElement.clientHeight;
  var side=Math.max(150,Math.min(aw,vh-top-16));
  gap=n>=6?3:4;cs=Math.floor((side-gap*(n+1))/n);
  var full=cs*n+gap*(n+1);
  var b=$('board');b.style.width=full+'px';b.style.height=full+'px';b.style.fontSize=Math.round(cs*(n>=5?0.36:0.4))+'px';
  b.style.setProperty('--cs',cs+'px');
  var pk=$('peek');if(pk){pk.style.left=gap+'px';pk.style.top=gap+'px';pk.style.width=(n*cs+(n-1)*gap)+'px';pk.style.height=(n*cs+(n-1)*gap)+'px';}
  place(false);
}

/* ── ход ── */
function startClock(){if(!G.t0)G.t0=Date.now();}
function pauseClock(){if(G&&G.t0){G.ms+=Date.now()-G.t0;G.t0=0;}}
function now(){return G.ms+(G.t0?Date.now()-G.t0:0);}
function doMove(res){
  if(!res||!res.length){Sound.sfx('pNo');return;}
  if(!G.started){G.started=true;}
  startClock();
  Sound.sfx('pSlide');G.hint=-1;clearHint();
  place(true);
  /* звук за собранный ряд сверху */
  if(R.isSolved(G.st.t)){finishBoard();return;}
  paintHud();
}
function tapIndex(i){if(!G||G.over)return;doMove(R.tap(G.st,i));}
function key(dir){if(!G||G.over)return;
  if(S.inv)dir={l:'r',r:'l',u:'d',d:'u'}[dir];
  doMove(R.slide(G.st,dir));}
function clearHint(){for(var v in tiles)tiles[v].classList.remove('hint');}
function hint(){
  if(!G||G.over||G.n>4)return;
  msg(t('msg.thinking'));
  setTimeout(function(){
    var p=R.solve(G.st.t,G.n,G.n===3?2000000:900000);
    if(!p){msg(t('msg.far'),'warn');return;}
    if(!p.length)return;
    G.used.hint++;clearHint();var el=tiles[G.st.t[p[0]]];if(el)el.classList.add('hint');
    msg(t('msg.hint',{n:p.length}));Sound.sfx('select');
  },30);
}
function peek(on){var pk=$('peek');if(!pk)return;if(on&&S.look!=='pic'){pk.innerHTML=numGrid();}pk.classList.toggle('hidden',!on);if(on)G.used.peek++;}
function numGrid(){var n=G.n,h='<div class="pk-grid" style="grid-template-columns:repeat('+n+',1fr)">';for(var i=1;i<n*n;i++)h+='<i>'+i+'</i>';return h+'<i></i></div>';}

/* ── поле собрано ── */
function finishBoard(){
  var st=G.st;
  for(var v in tiles)tiles[v].classList.add('done');
  if(G.mode==='ladder'){
    G.totalMoves+=st.moves;
    if(G.stage<LADDER.length-1){
      G.stage++;Sound.sfx('pRow');msg(t('msg.next',{n:LADDER[G.stage]+'x'+LADDER[G.stage]}),'good');
      setTimeout(function(){if(!G||G.over)return;G.n=LADDER[G.stage];G.st=R.make(G.n,R.shuffle(G.n));buildBoard();paintHud();msg(t('msg.stage',{n:G.n+'x'+G.n,i:G.stage+1,k:LADDER.length}));},900);
      return;}
  }
  pauseClock();G.over=true;end();
}
function end(){
  var st=G.st,ms=G.ms,rec=false,rows='',clean=!G.used.hint;
  ST.solved++;
  if(G.mode==='classic'){
    var b=ST.by[G.n];b.solved++;
    if(clean){if(!b.bestTime||ms<b.bestTime){b.bestTime=ms;rec=true;}if(!b.bestMoves||st.moves<b.bestMoves){b.bestMoves=st.moves;rec=true;}}
    DB.save=null;
    rows=row('over.time',fmtT(ms))+row('over.moves',st.moves)+row('st.bestTime',fmtT(b.bestTime))+row('st.bestMoves',b.bestMoves||'-')+(clean?'':row('over.helped',t('over.noRecord')));
    $('over-medal').className='medal hidden';
  }else if(G.mode==='daily'){
    var d=DB.daily,h=d.history[G.day];
    if(clean){if(!h.best||st.moves<h.best)h.best=st.moves,rec=true;if(!h.bestTime||ms<h.bestTime)h.bestTime=ms;}
    if(d.lastDate!==G.day){d.streak=d.lastDate===prevDate(G.day)?d.streak+1:1;d.lastDate=G.day;d.bestStreak=Math.max(d.bestStreak||0,d.streak);}
    var par=G.par||h.par,md=clean&&par?(st.moves<=par*2?'g':st.moves<=par*3?'s':'b'):'';
    rows=row('over.time',fmtT(ms))+row('over.moves',st.moves)+row('over.robot',par||'-')+row('st.streak',dailyStreak())+(clean?'':row('over.helped',t('over.noRecord')));
    $('over-medal').className='medal '+(md||'hidden');$('over-medal').textContent=md?t('medal.'+md):'';
  }else{
    var l=DB.ladder;l.done++;if(!l.best||ms<l.best){l.best=ms;rec=true;}
    rows=row('over.time',fmtT(ms))+row('over.moves',G.totalMoves)+row('st.bestTime',fmtT(l.best));
    $('over-medal').className='medal hidden';
  }
  save();
  $('over-title').textContent=t('over.win');$('over-title').className='over-title win';
  $('over-rows').innerHTML=rows;$('over-rec').classList.toggle('hidden',!rec);
  var im=$('over-img');if(ART_READY&&S.theme==='neon'){im.src=ART+'result_win.webp';im.classList.remove('hidden');}else im.classList.add('hidden');
  paintHud();msg('');
  Sound.sfx('win');Sound.duck(0.3,2000);
  setTimeout(function(){if(G&&G.over)show('over-modal');},900);
}

var hudCache='';
function paintHud(){
  if(!G)return;
  var c=[['hud.time',fmtT(now()).replace(/\.\d$/,'')],['hud.moves',G.mode==='ladder'?G.totalMoves+G.st.moves:G.st.moves]];
  if(G.mode==='daily')c.push(['hud.robot',G.par||'...']);
  else if(G.mode==='ladder')c.push(['hud.stage',(G.stage+1)+' / '+LADDER.length]);
  else c.push(['hud.best',(ST.by[G.n]||{}).bestMoves||'-']);
  var k=c.map(function(x){return x[1];}).join('|')+I18n.lang;
  if(k===hudCache)return;hudCache=k;
  $('hud-cells').innerHTML=c.map(function(x){return '<div class="hc"><span>'+t(x[0])+'</span><b>'+x[1]+'</b></div>';}).join('');
  $('hud-mode').textContent=t('mode.'+G.mode)+' '+G.n+'x'+G.n;
}
function tick(){requestAnimationFrame(tick);if(G&&!G.over&&G.t0&&document.body.classList.contains('screen-game'))paintHud();}

/* ── ввод: нажатие по плитке, свайп по полю, клавиши ── */
function bindBoard(){
  var b=$('board'),sx=0,sy=0,down=false;
  function idxAt(x,y){var r=b.getBoundingClientRect(),c=Math.floor((x-r.left-gap/2)/(cs+gap)),rr=Math.floor((y-r.top-gap/2)/(cs+gap));if(c<0||rr<0||c>=G.n||rr>=G.n)return -1;return rr*G.n+c;}
  function start(x,y){down=true;sx=x;sy=y;}
  function end(x,y){if(!down||!G)return;down=false;var dx=x-sx,dy=y-sy;
    if(Math.max(Math.abs(dx),Math.abs(dy))>Math.max(18,cs*0.25)){
      /* свайп: плитка рядом с пустой едет по направлению пальца; если начали на плитке в ряду с пустой, едет весь отрезок */
      var i0=idxAt(sx,sy),dir=Math.abs(dx)>Math.abs(dy)?(dx>0?'r':'l'):(dy>0?'d':'u');
      if(i0>=0&&G.st.t[i0]){var bI=G.st.t.indexOf(0),n=G.n,okDir=(dir==='r'&&Math.floor(bI/n)===Math.floor(i0/n)&&bI>i0)||(dir==='l'&&Math.floor(bI/n)===Math.floor(i0/n)&&bI<i0)||(dir==='d'&&bI%n===i0%n&&bI>i0)||(dir==='u'&&bI%n===i0%n&&bI<i0);
        if(okDir){tapIndex(i0);return;}}
      if(!G.over)doMove(R.slide(G.st,dir));
    }else{var i=idxAt(x,y);if(i>=0)tapIndex(i);}
  }
  if(window.PointerEvent){
    b.addEventListener('pointerdown',function(e){if(e.pointerType==='mouse'&&e.button!==0)return;e.preventDefault();start(e.clientX,e.clientY);});
    window.addEventListener('pointerup',function(e){end(e.clientX,e.clientY);});
  }else{
    b.addEventListener('touchstart',function(e){var p=e.changedTouches[0];e.preventDefault();start(p.clientX,p.clientY);},{passive:false});
    b.addEventListener('touchend',function(e){var p=e.changedTouches[0];end(p.clientX,p.clientY);});
    b.addEventListener('mousedown',function(e){start(e.clientX,e.clientY);});window.addEventListener('mouseup',function(e){end(e.clientX,e.clientY);});
  }
}
var rzT;
window.addEventListener('resize',function(){clearTimeout(rzT);rzT=setTimeout(layout,80);});
document.addEventListener('visibilitychange',function(){if(!G||G.over)return;if(document.hidden){pauseClock();saveGame();}else if(G.started&&document.body.classList.contains('screen-game'))startClock();});
window.addEventListener('pagehide',saveGame);
document.addEventListener('keydown',function(e){
  if(!G||!document.body.classList.contains('screen-game'))return;
  if(e.ctrlKey||e.metaKey||e.altKey)return;
  if(!$('over-modal').classList.contains('hidden')){if(e.key==='Enter'){e.preventDefault();newGame();}return;}
  var k=e.key,map={ArrowLeft:'l',ArrowRight:'r',ArrowUp:'u',ArrowDown:'d',a:'l',d:'r',w:'u',s:'d',A:'l',D:'r',W:'u',S:'d'};
  if(map[k]){e.preventDefault();key(map[k]);return;}
  if(k==='h'||k==='H'){hint();return;}
  if(k===' '&&!e.repeat){e.preventDefault();peek(true);}
});
document.addEventListener('keyup',function(e){if(e.key===' '&&G)peek(false);});

function onLang(){paintMenu();hudCache='';if(G&&document.body.classList.contains('screen-game'))paintHud();}
function boot(){
  A.topbar('t.title');
  I18n.apply();I18n.onChange(onLang);
  function seg(id,fn){var l=document.querySelectorAll('#'+id+' .seg-btn');for(var i=0;i<l.length;i++)(function(b){b.addEventListener('click',function(){fn(b.getAttribute('data-v'));save();paintMenu();Sound.sfx('select');});})(l[i]);}
  seg('seg-size',function(v){S.size=+v;});seg('seg-look',function(v){S.look=v;});seg('seg-nums',function(v){S.nums=v==='1';});
  seg('seg-theme',function(v){S.theme=v;});seg('seg-inv',function(v){S.inv=v==='1';});
  $('pics').addEventListener('click',function(e){var n=e.target;if(!n.getAttribute||n.getAttribute('data-i')===null)return;S.pic=+n.getAttribute('data-i');save();paintMenu();Sound.sfx('select');});
  bindBoard();
  /* подсмотреть: пока держишь кнопку */
  var pb=$('btn-peek');
  pb.addEventListener('mousedown',function(){peek(true);});pb.addEventListener('mouseup',function(){peek(false);});pb.addEventListener('mouseleave',function(){peek(false);});
  pb.addEventListener('touchstart',function(e){e.preventDefault();peek(true);},{passive:false});pb.addEventListener('touchend',function(){peek(false);});
  $('btn-play').addEventListener('click',function(){newGame(false);});
  $('btn-cont').addEventListener('click',function(){newGame(true);});
  $('btn-hint').addEventListener('click',hint);
  $('btn-menu').addEventListener('click',function(){showScreen('menu');});
  $('over-again').addEventListener('click',function(){newGame(false);});
  $('over-board').addEventListener('click',function(){hide('over-modal');});
  $('over-menu').addEventListener('click',function(){showScreen('menu');});
  paintMenu();
  showScreen('menu');
  requestAnimationFrame(tick);
}

window.AceonP15={g:function(){return G;},settings:S,db:DB,tap:tapIndex,key:key,newGame:newGame};
boot();
})();
