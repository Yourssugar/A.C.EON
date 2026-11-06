/* A.C.EON TOWER: меню, режимы, рисование, ввод, статистика.
   Правила и задания в rules.js, тексты в lang.js. */
(function(){
'use strict';

var t=I18n.t,A=window.Arcade,T=window.TwRules;
var $=function(id){return document.getElementById(id);};
function show(id){$(id).classList.remove('hidden');}
function hide(id){$(id).classList.add('hidden');}

var MODES=['classic','levels'],THEMES=['neon','flat'];
var ART=new URL('../art/tower/',location.href).href;
/* картинки от Codex: пока не выложены, false; тогда всё рисуется кодом и лишних запросов нет */
var ART_READY=true;
var W=T.W,BH=T.BH,VH=700;   /* поле 400 x 700 */
var WORLDS=['city','sky','space'];

Store.define('stacker',{
  version:1,
  defaults:{settings:{mode:'classic',level:0,theme:'neon'},
    stats:{games:0,best:0,perfects:0,bestStreak:0,floors:0},
    lv:{unlocked:0,stars:{}}},
  legacy:function(raw){var hi=parseInt(raw('aceon_hi_ts'),10)||0;return hi?{stats:{games:0,best:hi,perfects:0,bestStreak:0,floors:0}}:null;}
});
var DB=Store.get('stacker'),S=DB.settings,ST=DB.stats,LV=DB.lv;
if(MODES.indexOf(S.mode)<0)S.mode='classic';
if(THEMES.indexOf(S.theme)<0)S.theme='neon';
LV.unlocked=Math.max(0,Math.min(T.LEVELS.length-1,LV.unlocked|0));
S.level=Math.max(0,Math.min(LV.unlocked,S.level|0));
function save(){Store.save('stacker');}

/* ── звуки: этажи звучат всё выше, точное попадание звонкое ── */
Sound.define('tDrop',function(tm,tone){tone(tm,240,0.06,'triangle',0.04,180);});
Sound.define('tCut',function(tm,tone,noise){noise(tm,0.12,0.22,900);tone(tm,160,0.12,'square',0.04,90);});
Sound.define('tGrow',function(tm,tone){[660,880,1100,1320].forEach(function(f,i){tone(tm+i*0.05,f,0.1,'triangle',0.05);});});
var PERF=[523,587,659,698,784,880,988,1047,1175,1319];
PERF.forEach(function(f,i){Sound.define('tP'+i,function(tm,tone){tone(tm,f,0.18,'sine',0.07);tone(tm,f*1.5,0.12,'sine',0.03);});});

/* ── картинки ── */
var IMG={};
function loadArt(){
  ['bg_city','bg_sky','bg_space','floor_city','floor_sky','floor_space','base','hook','deco_city','deco_sky','deco_space'].forEach(function(n){
    var im=new Image();im.onload=function(){IMG[n]=im;};im.src=ART+n+'.webp';});
}

/* ════════ МЕНЮ ════════ */
function starSvg(n,max){var h='';for(var i=0;i<(max||3);i++)h+='<svg class="star'+(i<n?' on':'')+'" viewBox="0 0 10 10"><path d="M5 .5l1.4 2.9 3.1.4-2.3 2.2.6 3.1L5 7.6 2.2 9.1l.6-3.1L.5 3.8l3.1-.4z"/></svg>';return h;}
function starsOf(i){return LV.stars[i]|0;}
function totalStars(){var s=0;for(var i=0;i<T.LEVELS.length;i++)s+=starsOf(i);return s;}
function buildModes(){
  var list=$('mode-list');list.innerHTML='';
  MODES.forEach(function(m){
    var b=document.createElement('button');b.type='button';b.className='m-card-btn'+(S.mode===m?' sel':'');
    var ico=ART_READY?'<img class="m-img" alt="" src="'+ART+'mode_'+m+'.webp">':'<span class="m-ico t-ico"><i></i><i></i><i></i></span>';
    b.innerHTML=ico+'<span class="m-txt"><span class="m-name" data-i18n="mode.'+m+'"></span><span class="m-desc" data-i18n="desc.'+m+'"></span></span>';
    b.addEventListener('click',function(){S.mode=m;save();paintMenu();Sound.sfx('select');});
    list.appendChild(b);
  });
  I18n.apply(list);
}
function modsText(L){
  var m=L.mods,out=[];
  if(L.base<T.BASEW)out.push(t('mod.narrow'));
  if(m.fast)out.push(t('mod.fast'));if(m.swing)out.push(t('mod.swing'));if(m.reverse)out.push(t('mod.reverse'));if(m.wind)out.push(t('mod.wind'));if(m.fog)out.push(t('mod.fog'));
  return out.join(' / ');
}
function buildLevels(){
  var h='';
  T.LEVELS.forEach(function(L,i){var locked=i>LV.unlocked;
    h+='<button type="button" class="lv'+(locked?' locked':'')+(i===S.level?' sel':'')+'" data-i="'+i+'"'+(locked?' disabled':'')+'><b>'+(i+1)+'</b><span class="lv-st">'+(locked?'':starSvg(starsOf(i)))+'</span></button>';});
  $('levels').innerHTML=h;
  $('lv-stars').textContent=t('lv.stars',{n:totalStars(),m:T.LEVELS.length*3});
  var L=T.LEVELS[S.level],mt=modsText(L);
  $('lv-note').innerHTML=t('lv.goal',{n:L.goal})+'<br>'+t('lv.starsRule',{a:L.p2,b:L.p3})+(mt?'<br>'+mt:'');
}
function row(k,v){return '<div class="ov-row"><span>'+t(k)+'</span><b>'+v+'</b></div>';}
function buildStats(){
  var done=0;for(var i=0;i<T.LEVELS.length;i++)if(starsOf(i))done++;
  $('stats').innerHTML=row('st.best',ST.best)+row('st.games',ST.games)+row('st.floors',ST.floors)+row('st.perfects',ST.perfects)+row('st.streak',ST.bestStreak)+
    row('st.levels',done+' / '+T.LEVELS.length)+row('st.stars',totalStars()+' / '+T.LEVELS.length*3);
}
function segSel(id,v){var l=document.querySelectorAll('#'+id+' .seg-btn');for(var i=0;i<l.length;i++)l[i].classList.toggle('sel',l[i].getAttribute('data-v')===String(v));}
function paintMenu(){
  buildModes();buildStats();
  $('lv-box').classList.toggle('hidden',S.mode!=='levels');
  if(S.mode==='levels')buildLevels();
  segSel('seg-theme',S.theme);
}
function showScreen(name){
  document.body.classList.toggle('screen-menu',name==='menu');
  document.body.classList.toggle('screen-game',name==='game');
  if(name==='menu'){paintMenu();hide('over-modal');}
  Sound.music(name==='menu'?'menu':'game');
  window.scrollTo(0,0);
  if(name==='game'){layout();requestAnimationFrame(layout);}
}

/* ════════ ИГРА ════════ */
var G=null;
function newGame(){
  var st=T.create({mode:S.mode,level:S.level});
  G={st:st,paused:false,over:false,cam:0,parts:[],cuts:[],pops:[],flash:0,shake:0,deco:null,decoT:3,started:false};
  if(st.mode==='classic')ST.games++;
  save();A.trackPlay();
  hide('over-modal');hide('pause-ov');$('fx').innerHTML='';
  show('hint');hudCache='';
  showScreen('game');
}
function setPause(on){
  if(!G||G.over)return;
  G.paused=on;$('pause-ov').classList.toggle('hidden',!on);
  if(on)Sound.duck(0.4,600);Sound.sfx('select');
}
function playing(){return G&&!G.over&&!G.paused&&document.body.classList.contains('screen-game');}
function tap(){
  if(!G)return;
  if(G.paused){setPause(false);return;}
  if(G.over)return;
  if(!G.started){G.started=true;hide('hint');}
  if(T.drop(G.st))Sound.sfx('tDrop');
}
function onEvent(ev){
  var st=G.st;
  if(ev.type==='land'){
    var y=floorY(st.floors.length-1);
    if(ev.cut&&ev.cut.w>0){G.cuts.push({x:ev.cut.x,w:ev.cut.w,y:ev.miss?floorY(st.floors.length):y,vx:(ev.cut.x+ev.cut.w/2<ev.x+ev.w/2?-1:1)*(40+Math.random()*60),vy:-40,rot:0,vr:(Math.random()-0.5)*3,n:st.floors.length});Sound.sfx('tCut');}
    if(ev.perfect){
      Sound.sfx('tP'+Math.min(9,st.streak-1));G.flash=0.5;
      G.pops.push({x:ev.x,w:ev.w,y:y,t:0});
      for(var i=0;i<14;i++)G.parts.push({x:ev.x+Math.random()*ev.w,y:y+BH/2,vx:(Math.random()-0.5)*160,vy:-60-Math.random()*120,life:1,col:'#ffd23a'});
      if(st.streak>=2)popTxt(t('pop.perfect',{n:st.streak}),'big');
      if(ev.grow){Sound.sfx('tGrow');popTxt(t('pop.grow'),'good');}
    }
    var wNow=T.world(st.n),wPrev=T.world(st.n-1);
    if(st.n>0&&wNow!==wPrev)popTxt(t('world.'+WORLDS[wNow]),'big');
    if(st.mode==='levels'&&st.lv&&st.n===st.lv.goal-3)popTxt(t('pop.left',{n:3}),'good');
  }
  else if(ev.type==='rev'){}
  else if(ev.type==='over'){G.shake=10;endGame(false);}
  else if(ev.type==='win'){endGame(true);}
}
var popN=0;
function popTxt(txt,cls){var e=document.createElement('div');e.className='pop '+(cls||'');e.textContent=txt;e.style.top=(16+(popN++%3)*7)+'%';$('fx').appendChild(e);setTimeout(function(){if(e.parentNode)e.parentNode.removeChild(e);},1500);}
function endGame(win){
  var st=G.st;G.over=true;
  ST.floors+=st.n;ST.perfects+=st.perfects;ST.bestStreak=Math.max(ST.bestStreak,st.bestStreak);
  var rec=false,rows;
  if(st.mode==='classic'){
    if(st.n>ST.best){ST.best=st.n;rec=true;}
    A.setHi('ts',st.n);
    $('over-title').textContent=t('over.title');$('over-title').className='over-title lose';
    rows=row('over.floors',st.n)+row('over.score',st.score)+row('over.perfects',st.perfects)+row('over.streak',st.bestStreak)+row('st.best',ST.best);
    $('over-stars').innerHTML='';
  }else{
    var n=st.level,stars=win?T.stars(st):0;
    if(win){LV.stars[n]=Math.max(starsOf(n),stars);if(n+1<T.LEVELS.length)LV.unlocked=Math.max(LV.unlocked,n+1);}
    $('over-title').textContent=t(win?'over.win':'over.fail');$('over-title').className='over-title '+(win?'win':'lose');
    $('over-stars').innerHTML=win?starSvg(stars):'';
    rows=row('over.level',n+1)+row('over.floors',st.n+' / '+st.lv.goal)+row('over.perfects',st.perfects)+row('over.need',st.lv.p2+' / '+st.lv.p3);
    if(win&&n+1<T.LEVELS.length)S.level=n+1;
  }
  save();
  Sound.sfx(win?'win':'lose');Sound.duck(0.3,2000);
  $('over-rows').innerHTML=rows;
  $('over-rec').classList.toggle('hidden',!rec);
  $('over-next').classList.toggle('hidden',!(win&&st.mode==='levels'&&st.level+1<T.LEVELS.length));
  setTimeout(function(){if(G&&G.over)show('over-modal');},900);
}

/* ════════ РИСОВАНИЕ ════════ */
var cv,g,k=1,dpr=1;
/* экранная y этажа i (0 основание): снизу вверх, камера G.cam в этажах */
function floorY(i){return VH-150-(i-G.cam)*BH;}
var PAL={
  city:{sky:['#05051a','#120a34','#2a0c44'],hue:190,edge:'#00e5ff'},
  sky:{sky:['#2a1048','#7a2a6a','#ff8a6a'],hue:320,edge:'#ffd23a'},
  space:{sky:['#000006','#05051a','#100a30'],hue:260,edge:'#8c6cff'}
};
function lerp(a,b,u){return a+(b-a)*u;}
function bg(now){
  /* мир и переход: по высоте верха башни */
  var n=G.st.n,h=n+G.cam*0,w=T.world(n),ws=WORLDS[w];
  var bi=IMG['bg_'+ws];
  if(bi&&S.theme!=='flat'){
    /* картинка тянется по ширине, медленно уезжает вниз по мере роста */
    var ih=W*bi.height/bi.width,off=((G.cam%25)/25)*(ih-VH);
    g.drawImage(bi,0,-ih+VH+off,W,ih);
  }else{
    var P=PAL[ws],gr=g.createLinearGradient(0,0,0,VH);gr.addColorStop(0,P.sky[0]);gr.addColorStop(0.6,P.sky[1]);gr.addColorStop(1,P.sky[2]);
    g.fillStyle=gr;g.fillRect(0,0,W,VH);
    /* звёзды или огни, едут вниз за камерой */
    var r=7;g.fillStyle=w===1?'rgba(255,255,255,.12)':'rgba(255,255,255,.6)';
    for(var i=0;i<60;i++){r=(r*9301+49297)%233280;var sx=r/233280*W;r=(r*9301+49297)%233280;var sy=((r/233280*VH*2+G.cam*BH*0.3)%(VH));g.fillRect(sx,sy,w===1?24:1.5,w===1?6:1.5);}
    if(w===0){/* силуэты домов у земли */
      var base=floorY(0)+BH;g.fillStyle='#0a0820';
      for(var b=0;b<10;b++){var bx=b*44-6,bh=60+((b*37)%5)*28;g.fillRect(bx,base-bh,38,bh+200);}
    }
  }
}
function floorColor(i,flat){
  var w=T.world(i),P=PAL[WORLDS[w]],hue=(P.hue+(i%8)*9)%360;
  return flat?'hsl('+hue+',65%,'+(50+(i%2)*8)+'%)':'hsl('+hue+',75%,'+(42+(i%3)*6)+'%)';
}
function drawFloor(x,y,w,i,glow){
  if(w<=0)return;
  var flat=S.theme==='flat',ws=WORLDS[T.world(i)],img=!flat&&IMG['floor_'+ws];
  g.save();
  if(glow){g.shadowColor=PAL[ws].edge;g.shadowBlur=14;}
  if(img){
    /* текстура этажа: кусок по ширине, сдвиг по номеру, чтобы этажи не были одинаковыми */
    var sw=Math.min(img.width,w*img.height/BH),sx=((i*97)%Math.max(1,img.width-sw));
    g.drawImage(img,sx,0,sw,img.height,x,y,w,BH);
    if(glow){g.fillStyle='rgba(255,255,255,.06)';g.fillRect(x,y,w,BH);}
  }else{
    g.fillStyle=floorColor(i,flat);g.fillRect(x,y,w,BH);
    if(!flat){
      g.fillStyle='rgba(255,255,255,.18)';g.fillRect(x,y,w,3);
      g.fillStyle='rgba(0,0,0,.25)';g.fillRect(x,y+BH-3,w,3);
      /* окна */
      g.fillStyle='rgba(255,240,180,.55)';for(var wx=x+6;wx<x+w-8;wx+=14)if(((wx*7+i*13)|0)%3)g.fillRect(wx,y+9,6,BH-18);
    }
  }
  g.restore();
}
function draw(now,dt){
  var st=G.st,s=k*dpr,ox=0,oy=0;
  g.setTransform(1,0,0,1,0,0);g.fillStyle='#050510';g.fillRect(0,0,cv.width,cv.height);
  if(G.shake>0.3){ox=(Math.random()-0.5)*G.shake*s;oy=(Math.random()-0.5)*G.shake*s;G.shake*=0.88;}
  g.setTransform(s,0,0,s,ox,oy);
  /* камера: верх башни держим примерно на трети снизу */
  var want=Math.max(0,st.floors.length-1-9);G.cam+=(want-G.cam)*Math.min(1,dt*5);
  bg(now);
  /* украшение пролетает изредка */
  G.decoT-=dt;
  if(!G.deco&&G.decoT<=0){var dir=Math.random()<0.5?1:-1;G.deco={x:dir>0?-60:W+60,y:80+Math.random()*250,dir:dir,w:T.world(st.n)};G.decoT=8+Math.random()*8;}
  if(G.deco){var d=G.deco;d.x+=d.dir*40*dt;var di=IMG['deco_'+WORLDS[d.w]];
    if(di&&S.theme!=='flat'){g.save();g.globalAlpha=0.85;g.translate(d.x,d.y);if(d.dir<0)g.scale(-1,1);g.drawImage(di,-32,-32,64,64);g.restore();}
    if(d.x<-80||d.x>W+80)G.deco=null;}
  /* основание */
  var by=floorY(0);
  var bimg=S.theme!=='flat'&&IMG.base;
  if(bimg){var bw=W*1.12,bh=bw*bimg.height/bimg.width;g.fillStyle='#07061a';g.fillRect(0,by+BH+bh*0.6,W,VH);g.drawImage(bimg,W/2-bw/2,by+BH-2,bw,bh);}
  else{g.fillStyle='#14143a';g.fillRect(0,by+BH,W,VH);g.fillStyle=PAL.city.edge;g.fillRect(0,by+BH,W,2);}
  /* этажи */
  for(var i=0;i<st.floors.length;i++){var f=st.floors[i],y=floorY(i);if(y>VH+BH||y<-BH)continue;drawFloor(f.x,y,f.w,i,false);}
  /* вспышка точного */
  for(i=G.pops.length-1;i>=0;i--){var p=G.pops[i];p.t+=dt;if(p.t>0.4){G.pops.splice(i,1);continue;}
    g.save();g.globalAlpha=1-p.t/0.4;g.strokeStyle='#fff';g.lineWidth=3;var gw=p.t*60;g.strokeRect(p.x-gw,p.y-gw*0.4,p.w+gw*2,BH+gw*0.8);g.restore();}
  /* отрезанные куски */
  for(i=G.cuts.length-1;i>=0;i--){var c=G.cuts[i];c.vy+=900*dt;c.x+=c.vx*dt;c.y+=c.vy*dt;c.rot+=c.vr*dt;
    if(c.y>VH+100){G.cuts.splice(i,1);continue;}
    g.save();g.translate(c.x+c.w/2,c.y+BH/2);g.rotate(c.rot);drawFloor(-c.w/2,-BH/2,c.w,c.n,false);g.restore();}
  /* ездящий или падающий этаж и крюк */
  if(!st.over||st.win){
    var top=floorY(st.floors.length-1),cx,cy,cw;
    if(st.fall){var u=st.fall.t/T.FALL;cx=st.fall.x;cw=st.fall.w;cy=lerp(top-BH*3.2,top-BH,u*u);}
    else if(st.cur){cx=st.cur.x;cw=st.cur.w;cy=top-BH*3.2;}
    if(cw){
      var hx=st.fall?st.cur.x+st.cur.w/2:cx+cw/2,hy=top-BH*3.2;
      hook(hx,hy);
      var vis=T.visible(st);
      if(vis)drawFloor(cx,cy,cw,st.floors.length,true);
      else{g.save();g.setLineDash([6,6]);g.strokeStyle='rgba(255,255,255,.25)';g.strokeRect(cx,cy,cw,BH);g.restore();}
      /* ветер: стрелка над этажом */
      if(st.mods.wind&&st.wind){g.save();g.fillStyle='rgba(207,233,255,.8)';g.font='12px "Press Start 2P",monospace';g.textAlign='center';
        var arr=st.wind>0?'→':'←',n2=Math.max(1,Math.round(Math.abs(st.wind)/40));var s2='';for(var a=0;a<n2;a++)s2+=arr;g.fillText(s2,W/2,hy-BH*1.1);g.restore();}
    }
  }
  /* искры */
  for(i=G.parts.length-1;i>=0;i--){var q=G.parts[i];q.vy+=400*dt;q.x+=q.vx*dt;q.y+=q.vy*dt;q.life-=dt*1.6;if(q.life<=0){G.parts.splice(i,1);continue;}
    g.globalAlpha=q.life;g.fillStyle=q.col;g.fillRect(q.x-2,q.y-2,4,4);}
  g.globalAlpha=1;
  if(G.flash>0){g.fillStyle='rgba(255,255,255,'+G.flash*0.15+')';g.fillRect(0,0,W,VH);G.flash=Math.max(0,G.flash-dt*2);}
  /* цель в заданиях: линия на нужной высоте */
  if(st.lv){var gy=floorY(st.lv.goal);if(gy>-10&&gy<VH){g.save();g.setLineDash([10,8]);g.strokeStyle='rgba(255,210,58,.7)';g.lineWidth=2;g.beginPath();g.moveTo(0,gy+BH);g.lineTo(W,gy+BH);g.stroke();g.restore();}}
}
function hook(x,y){
  var hi=S.theme!=='flat'&&IMG.hook;
  if(hi){var hh=BH*3.6,hw=hh*hi.width/hi.height;g.drawImage(hi,x-hw/2,y-hh+4,hw,hh);
    g.fillStyle='#8a94a8';g.fillRect(x-1.5,-10,3,Math.max(0,y-hh+14));}
  else{g.strokeStyle='#8a94a8';g.lineWidth=3;g.beginPath();g.moveTo(x,-10);g.lineTo(x,y-14);g.stroke();
    g.fillStyle='#ffd23a';g.fillRect(x-12,y-16,24,8);g.fillStyle='#8a94a8';g.fillRect(x-2,y-10,4,10);}
}

var lastT=0;
function frame(now){
  requestAnimationFrame(frame);
  var dt=lastT?Math.min(0.034,(now-lastT)/1000):0.016;lastT=now;
  if(!G||!document.body.classList.contains('screen-game'))return;
  if(playing()&&G.started){
    T.update(G.st,dt);
    var ev=G.st.ev;G.st.ev=[];ev.forEach(onEvent);
  }
  draw(now,dt);
  paintHud();
}
var hudCache='';
function paintHud(){
  var st=G.st,cells=[['hud.floors',st.lv?st.n+' / '+st.lv.goal:st.n],['hud.perfects',st.perfects],['hud.streak',st.streak>1?'x'+st.streak:'-']];
  if(st.lv)cells.unshift(['hud.level',st.level+1]);else cells.push(['hud.best',Math.max(ST.best,st.n)]);
  var key=cells.map(function(c){return c[1];}).join('|')+I18n.lang;
  if(key===hudCache)return;hudCache=key;
  $('hud-cells').innerHTML=cells.map(function(c){return '<div class="hc"><span>'+t(c[0])+'</span><b>'+c[1]+'</b></div>';}).join('');
  $('hud-mode').textContent=t('mode.'+st.mode);
}
function layout(){
  if(!G||!document.body.classList.contains('screen-game'))return;
  var arena=$('arena'),aw=arena.clientWidth-8,top=arena.getBoundingClientRect().top;
  var vh=window.innerHeight||document.documentElement.clientHeight;
  var sc=Math.max(0.3,Math.min(aw/W,(vh-top-14)/VH,1.6));
  var w=Math.round(W*sc),h=Math.round(VH*sc);
  $('well').style.width=w+'px';$('well').style.height=h+'px';
  dpr=Math.min(2,window.devicePixelRatio||1);cv.width=Math.round(w*dpr);cv.height=Math.round(h*dpr);cv.style.width=w+'px';cv.style.height=h+'px';k=w/W;
}
var rzT;
window.addEventListener('resize',function(){clearTimeout(rzT);rzT=setTimeout(layout,80);});
document.addEventListener('visibilitychange',function(){if(document.hidden&&playing())setPause(true);});
document.addEventListener('keydown',function(e){
  if(!G||!document.body.classList.contains('screen-game'))return;
  if(e.code==='Escape'||e.code==='KeyP'){e.preventDefault();setPause(!G.paused);return;}
  if((e.code==='Space'||e.code==='Enter'||e.code==='ArrowDown'||e.code==='ArrowUp')&&!e.repeat){e.preventDefault();if(G.over)return;tap();}
});
function bindTap(){
  var a=$('arena');
  function skip(e){var n=e.target;while(n&&n!==a){if(n.tagName==='BUTTON')return true;n=n.parentNode;}return false;}
  if(window.PointerEvent)a.addEventListener('pointerdown',function(e){if(skip(e))return;if(e.pointerType==='mouse'&&e.button!==0)return;e.preventDefault();tap();});
  else{a.addEventListener('touchstart',function(e){if(skip(e))return;e.preventDefault();tap();},{passive:false});a.addEventListener('mousedown',function(e){if(!skip(e))tap();});}
}

function onLang(){paintMenu();hudCache='';}
function boot(){
  A.topbar('t.title');
  I18n.apply();I18n.onChange(onLang);
  cv=$('cv');g=cv.getContext('2d');
  if(ART_READY)loadArt();
  bindTap();
  var l=document.querySelectorAll('#seg-theme .seg-btn');for(var i=0;i<l.length;i++)(function(b){b.addEventListener('click',function(){S.theme=b.getAttribute('data-v');save();paintMenu();Sound.sfx('select');});})(l[i]);
  $('levels').addEventListener('click',function(e){var n=e.target;while(n&&n!==this&&!(n.getAttribute&&n.getAttribute('data-i')))n=n.parentNode;if(!n||n===this||n.disabled)return;S.level=+n.getAttribute('data-i');save();paintMenu();Sound.sfx('select');});
  $('btn-play').addEventListener('click',newGame);
  $('btn-menu').addEventListener('click',function(){if(G&&!G.over)G.paused=true;showScreen('menu');});
  $('btn-pause').addEventListener('click',function(){if(G)setPause(!G.paused);});
  $('po-go').addEventListener('click',function(){setPause(false);});
  $('po-restart').addEventListener('click',newGame);
  $('po-menu').addEventListener('click',function(){showScreen('menu');});
  $('over-retry').addEventListener('click',function(){if(G&&G.st.mode==='levels'&&G.st.win)S.level=G.st.level;newGame();});
  $('over-next').addEventListener('click',newGame);
  $('over-menu').addEventListener('click',function(){showScreen('menu');});
  paintMenu();
  showScreen('menu');
  requestAnimationFrame(frame);
}

window.AceonTower={g:function(){return G;},settings:S,db:DB,tap:tap,newGame:newGame};
boot();
})();
