/* Aceonium v31: карта мира и поход на карте района. 2D canvas, без three.js.
   AdvMap.init(game)        подписка на события боя
   AdvMap.openWorld(t)      окно карты мира (t - какой район выбран)
   AdvMap.setOn(on)         показывать поход картой (вместо 3D-дороги)
   AdvMap.frame(dt)         кадр, пока карта на экране
   AdvMap.ready(t)          картинка района скачана
   Маг и монстр - два значка (assets/map/mage.webp, mon.webp), движение и удары делаются кодом. */
(function(){
'use strict';
var D=window.AcData,M=window.AcMaps,g=null,S=null;
var ART='assets/map/';
function url(f){return window.Boot&&Boot.url?Boot.url(ART+f):ART+f;}
function t(k,v){return UI.t(k,v);}
function esc(s){return String(s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];});}
function clamp(v,a,b){return v<a?a:v>b?b:v;}

/* ── картинки ── */
var IMG={};
function img(name){
  var o=IMG[name];
  if(!o){
    o=IMG[name]={el:new Image(),ok:false,bad:false};
    o.el.decoding='async';
    o.el.onload=function(){o.ok=true;};
    o.el.onerror=function(){o.bad=true;};
    o.el.src=url(name+'.webp');
  }
  return o;
}
/* значок, залитый одним цветом (вспышка удара) */
function tinted(o,col){
  o.tint=o.tint||{};
  if(o.tint[col])return o.tint[col];
  var c=document.createElement('canvas');c.width=o.el.naturalWidth;c.height=o.el.naturalHeight;
  var x=c.getContext('2d');x.drawImage(o.el,0,0);x.globalCompositeOperation='source-atop';x.fillStyle=col;x.fillRect(0,0,c.width,c.height);
  o.tint[col]=c;return c;
}

/* ── дороги районов: длина пути и стоянки боссов (10, 20 ... 100-я волна) ── */
var ROAD=[];
M.reg.forEach(function(r){
  var P=r.path,cum=[0];
  for(var j=1;j<P.length;j++)cum.push(cum[j-1]+Math.hypot(P[j][0]-P[j-1][0],P[j][1]-P[j-1][1]));
  var L=cum[cum.length-1],N=r.dots.length,F=[];
  for(var k=0;k<=10;k++)F.push(N>=11?r.dots[Math.round(k*(N-1)/10)]*L:k/10*L);
  ROAD.push({P:P,cum:cum,L:L,F:F});
});
function at(rd,s){
  s=clamp(s,0,rd.L);
  var c=rd.cum,lo=0,hi=c.length-1;
  while(hi-lo>1){var mid=(lo+hi)>>1;if(c[mid]<=s)lo=mid;else hi=mid;}
  var a=rd.P[lo],b=rd.P[hi],f=(s-c[lo])/((c[hi]-c[lo])||1);
  return {x:a[0]+(b[0]-a[0])*f,y:a[1]+(b[1]-a[1])*f,dx:b[0]-a[0],dy:b[1]-a[1]};
}
/* где на дороге идёт бой: волны между стоянками боссов делятся поровну, внутри волны по монстрам */
function arcFor(rd,w,m,boss){
  var k=clamp(Math.ceil(w/10),1,10),loc=boss?1:Math.min(1,(w-1-(k-1)*10+m/D.MOBS)/10);
  return rd.F[k-1]+(rd.F[k]-rd.F[k-1])*loc;
}

/* ════════ ПОХОД НА КАРТЕ ════════ */
var V={on:false,cv:null,cx:null,W:0,H:0,dpr:1,t:-1,s:0,from:0,meet:0,walkT:1,cam:null,face:1,sc:1,icon:60,
  mon:null,fx:[],time:0,lunge:0,flash:0,shake:0,hop:0,mpos:null,epos:null};

function ensureCanvas(){
  if(V.cv)return;
  var host=document.getElementById('stage');
  var cv=document.createElement('canvas');cv.className='map2d';cv.id='map2d';
  host.insertBefore(cv,document.getElementById('fx'));
  V.cv=cv;V.cx=cv.getContext('2d');
}
function resize(){
  var r=V.cv.getBoundingClientRect(),dpr=Math.min(2,window.devicePixelRatio||1);
  var w=Math.max(1,Math.round(r.width)),h=Math.max(1,Math.round(r.height));
  if(w!==V.W||h!==V.H||dpr!==V.dpr){V.W=w;V.H=h;V.dpr=dpr;V.cv.width=Math.round(w*dpr);V.cv.height=Math.round(h*dpr);}
}
function setOn(on){
  ensureCanvas();
  V.on=!!on;
  document.body.classList.toggle('view-map',V.on);
  if(V.on){V.cam=null;resize();}
}
function ready(t){var o=img('r'+t);img('mage');img('mon');return o.ok||o.bad;}
function preload(t){img('r'+t);img('mage');img('mon');}

/* новый враг: откуда идёт маг и где встреча */
function syncEnemy(){
  var tr=S.trip,R=g.R,e=R.enemy;if(!tr)return;
  var rd=ROAD[tr.t];
  if(V.t!==tr.t){V.t=tr.t;V.s=Math.max(0,arcFor(rd,tr.w,tr.m,tr.boss)-40);V.cam=null;V.mon=null;}
  if(!e||(V.mon&&V.mon.e===e))return;
  var meet=arcFor(rd,tr.w,tr.m,tr.boss);
  /* новый поход с первой волны или возвращение после долгого перерыва: маг сразу рядом */
  if(V.s>meet||meet-V.s>420)V.s=Math.max(0,meet-50);
  V.from=V.s;V.meet=meet;V.walkT=R.phase==='walk'?Math.max(0.3,R.t):0.3;
  V.mon={e:e,boss:!!e.boss,elite:!!e.elite,a:0,die:-1,flash:0,kb:0,lunge:0,jump:0,wind:0,hopT:1+Math.random()*2};
}

function onBolt(b){if(!V.on||!V.mon)return;V.fx.push({k:'bolt',t:0,T:b.kind==='click'?0.2:0.32,crit:b.crit,click:b.kind==='click'});V.lunge=1;}
function onHit(h){var m=V.mon;if(!V.on||!m)return;m.flash=0.14;m.kb=1;if(h.crit||h.big)m.jump=1;
  if(h.crit||h.big){var p=V.epos;if(p)for(var i=0;i<8;i++)V.fx.push({k:'spark',t:0,T:0.45,x:p.x,y:p.y+V.icon*0.35,vx:(Math.random()-0.5)*160,vy:-60-Math.random()*120,c:h.big?'#ffd040':'#9fe8ff'});}}
function onMageHit(h){if(!V.on)return;V.flash=0.25;if(V.mon)V.mon.lunge=1;if(h.boss)V.shake=0.25;}
function onWind(){if(V.mon)V.mon.wind=0.55;}

/* одна картинка значка с покачиванием, наклоном и вспышкой */
function drawIcon(o,x,y,h,face,rot,opt){
  if(!o.ok)return;
  var c=V.cx,iw=o.el.naturalWidth,ih=o.el.naturalHeight,w=h*iw/ih;
  c.save();c.translate(x,y);c.rotate(rot||0);c.scale(face,1);
  if(opt&&opt.glow){c.shadowColor=opt.glow;c.shadowBlur=opt.blur||16;}
  c.globalAlpha=opt&&opt.a!==undefined?opt.a:1;
  c.drawImage(o.el,-w/2,-h,w,h);
  c.shadowBlur=0;
  if(opt&&opt.flash>0){c.globalAlpha*=Math.min(1,opt.flash);c.drawImage(tinted(o,opt.fcol||'#ffffff'),-w/2,-h,w,h);}
  c.restore();
}

function frame(dt){
  if(!V.on||!g)return;
  ensureCanvas();resize();
  var c=V.cx,W=V.W,H=V.H,tr=S.trip,R=g.R;
  V.time+=dt;
  c.setTransform(V.dpr,0,0,V.dpr,0,0);
  c.fillStyle='#0b0814';c.fillRect(0,0,W,H);
  var tt=tr?tr.t:(V.t>=0?V.t:S.lastTract||0),bg=img('r'+tt);
  if(!bg.ok)return;
  if(tr)syncEnemy();
  var rd=ROAD[tt],iw=M.w,ih=M.h;
  var sc=Math.max(W/iw,H/ih);V.sc=sc;
  V.icon=clamp(H*0.09,48,78);
  /* расстояние между магом и монстром по ширине значков (у скелета меч торчит вперёд) */
  var mi=img('mage'),oi=img('mon'),mw=mi.ok?mi.el.naturalWidth/mi.el.naturalHeight:0.55,ow=oi.ok?oi.el.naturalWidth/oi.el.naturalHeight:0.96;
  var mscale=V.mon&&V.mon.boss?1.45:V.mon&&V.mon.elite?1.15:1;
  var gap=(mw*0.5+ow*mscale*0.5)*V.icon*0.9/sc;
  var meet=clamp(V.meet,gap/2+6,rd.L-gap/2-6);
  /* маг: идёт к месту встречи, в бою стоит */
  var walking=R.phase==='walk',target=meet-gap/2;
  if(walking){var p=clamp(1-R.t/V.walkT,0,1);V.s=V.from+(target-V.from)*p;}
  else if(R.phase==='fight'||R.phase==='dying')V.s+=(target-V.s)*Math.min(1,dt*6);
  var mp=at(rd,V.s);
  /* куда смотрит: по направлению дороги (на вертикальных участках не меняем) */
  var ah=at(rd,V.s+gap);
  if(Math.abs(ah.x-mp.x)>gap*0.3)V.face=ah.x>=mp.x?1:-1;
  /* камера за магом */
  var vw=W/sc,vh=H/sc,tx=clamp(mp.x,vw/2,iw-vw/2),ty=clamp(mp.y,vh/2,ih-vh/2);
  if(!V.cam)V.cam={x:tx,y:ty};
  var k=Math.min(1,dt*2.5);V.cam.x+=(tx-V.cam.x)*k;V.cam.y+=(ty-V.cam.y)*k;
  var sx=0,sy=0;if(V.shake>0){V.shake-=dt;sx=(Math.random()-0.5)*8;sy=(Math.random()-0.5)*6;}
  var ox=W/2-V.cam.x*sc+sx,oy=H/2-V.cam.y*sc+sy;
  function scr(x,y){return {x:ox+x*sc,y:oy+y*sc};}
  c.imageSmoothingEnabled=sc<1;
  c.drawImage(bg.el,ox,oy,iw*sc,ih*sc);
  c.imageSmoothingEnabled=true;
  /* пройденная часть дороги */
  c.save();c.lineJoin='round';c.lineCap='round';
  c.beginPath();var first=true;
  for(var i=0;i<rd.P.length&&rd.cum[i]<=V.s;i++){var q=scr(rd.P[i][0],rd.P[i][1]);if(first){c.moveTo(q.x,q.y);first=false;}else c.lineTo(q.x,q.y);}
  var qm=scr(mp.x,mp.y);if(!first)c.lineTo(qm.x,qm.y);
  c.strokeStyle='rgba(40,10,0,.55)';c.lineWidth=7;c.stroke();
  c.strokeStyle='#ffe08a';c.lineWidth=3.5;c.shadowColor='#ffb030';c.shadowBlur=10;c.stroke();
  c.restore();
  /* стоянки боссов */
  var wNow=tr?tr.w:0;
  for(var b=1;b<=10;b++){
    var bp=at(rd,rd.F[b]),q2=scr(bp.x,bp.y),big=b===5||b===10,r=big?11:8;
    var done=tr&&(wNow>b*10||tr.done),next=tr&&!done&&Math.ceil(Math.max(1,wNow)/10)===b;
    c.save();
    if(next){var pu=0.5+0.5*Math.sin(V.time*5);c.beginPath();c.arc(q2.x,q2.y,r+4+pu*4,0,7);c.strokeStyle='rgba(255,60,80,'+(0.4+pu*0.4)+')';c.lineWidth=2;c.stroke();}
    c.beginPath();c.arc(q2.x,q2.y,r,0,7);
    c.fillStyle=done?'#ffcf4a':next?'#5a0c1c':'rgba(20,10,30,.85)';c.fill();
    c.lineWidth=2;c.strokeStyle=done?'#7a4a00':big?'#ff5a6a':'#c8b8e8';c.stroke();
    c.fillStyle=done?'#3a2000':'#fff';c.font='700 '+(big?10:9)+'px sans-serif';c.textAlign='center';c.textBaseline='middle';
    c.fillText(done?'✓':String(b*10),q2.x,q2.y+0.5);
    c.restore();
  }
  /* монстр */
  var m=V.mon,mage=img('mage'),mon=img('mon'),ih2=V.icon;
  V.epos=null;
  if(m){
    var dyingNow=R.phase==='dying'&&R.enemy===m.e;
    if(m.e!==R.enemy&&!dyingNow&&m.die<0)m.die=0;
    if(R.phase==='dying'&&m.die<0&&(R.enemy===m.e||!R.enemy))m.die=0;
    var mh=ih2*(m.boss?1.45:m.elite?1.15:1),ms=meet+gap/2;
    if(walking&&R.enemy===m.e){var p2=clamp(1-R.t/V.walkT,0,1);m.a=Math.min(1,p2/0.3);ms+=(1-clamp((p2-0.3)/0.7,0,1))*90/sc;}
    else m.a=Math.min(1,m.a+dt*4);
    m.flash=Math.max(0,m.flash-dt);
    m.kb=Math.max(0,m.kb-dt*6);m.lunge=Math.max(0,m.lunge-dt*3.5);m.wind=Math.max(0,m.wind-dt);
    if(m.jump>0)m.jump=Math.max(0,m.jump-dt*2.6);
    if(!walking&&R.phase==='fight'){m.hopT-=dt;if(m.hopT<=0){m.hopT=1.2+Math.random()*2.2;if(m.jump<=0)m.jump=0.7;}}
    var mpos=at(rd,ms),q3=scr(mpos.x,mpos.y);
    /* монстр смотрит на мага; бросок к магу и отскок от удара по линии между ними */
    var lx=Math.sin(Math.min(1,m.lunge)*Math.PI)*ih2*0.35;
    var kbx=m.kb*6*V.face;
    var jy=m.jump>0?-Math.sin((1-m.jump)*Math.PI)*ih2*0.22:0;
    var wy=m.wind>0?-Math.sin((0.55-m.wind)/0.55*Math.PI)*6:0;
    var sway=walking?Math.sin(V.time*9+1)*0.12:Math.sin(V.time*3+1)*0.05;
    var a=m.a,rot=sway;
    if(m.die>=0){m.die+=dt;a*=Math.max(0,1-m.die/0.6);rot=Math.min(1,m.die/0.35)*1.4*V.face;}
    var mx=q3.x+kbx-lx*V.face,my=q3.y+jy+wy+ih2*0.08;
    if(a>0.01){
      /* тень */
      c.save();c.globalAlpha=0.35*a;c.fillStyle='#000';c.beginPath();c.ellipse(q3.x,q3.y+ih2*0.08,mh*0.28,mh*0.07,0,0,7);c.fill();c.restore();
      drawIcon(mon,mx,my,mh,V.face,rot,{a:a,glow:m.boss?'rgba(255,40,70,.95)':m.elite?'rgba(255,200,60,.9)':null,blur:m.boss?22:14,flash:m.flash/0.14,fcol:'#ffffff'});
      V.epos={x:mx,y:my-mh};
      /* полоска здоровья над монстром */
      if(m.e&&m.die<0&&R.phase==='fight'){var bw=mh*0.7,f=clamp(m.e.hp/m.e.max,0,1);
        c.fillStyle='rgba(0,0,0,.6)';c.fillRect(mx-bw/2-1,my-mh-9,bw+2,6);
        c.fillStyle=m.boss?'#ff3355':'#ff6a8a';c.fillRect(mx-bw/2,my-mh-8,bw*f,4);}
    }
    if(m.die>0.6)V.mon=null;
  }
  /* маг */
  V.flash=Math.max(0,V.flash-dt);V.lunge=Math.max(0,V.lunge-dt*5);
  var bob=walking?Math.abs(Math.sin(V.time*9))*3.5:0;
  var mrot=walking?Math.sin(V.time*9)*0.13:Math.sin(V.time*2.2)*0.04;
  var lun=Math.sin(V.lunge*Math.PI)*ih2*0.08*V.face;
  var mgx=qm.x+lun,mgy=qm.y-bob+ih2*0.08;
  c.save();c.globalAlpha=0.35;c.fillStyle='#000';c.beginPath();c.ellipse(qm.x,qm.y+ih2*0.08,ih2*0.26,ih2*0.065,0,0,7);c.fill();c.restore();
  drawIcon(mage,mgx,mgy,ih2,V.face,mrot,{glow:'rgba(0,229,255,.55)',blur:10,flash:V.flash/0.25,fcol:'#ff3050'});
  V.mpos={x:mgx,y:mgy-ih2};
  /* заряды посоха и искры */
  for(var j=V.fx.length-1;j>=0;j--){
    var e=V.fx[j];e.t+=dt;
    if(e.t>=e.T){V.fx.splice(j,1);continue;}
    if(e.k==='bolt'){
      if(!V.epos){V.fx.splice(j,1);continue;}
      var f2=e.t/e.T,x0=mgx+ih2*0.28*V.face,y0=mgy-ih2*0.78,x1=V.epos.x,y1=V.epos.y+ih2*0.45;
      var bx=x0+(x1-x0)*f2,by=y0+(y1-y0)*f2-Math.sin(f2*Math.PI)*ih2*0.25;
      c.save();c.shadowColor=e.crit?'#ffd040':'#00e5ff';c.shadowBlur=14;c.fillStyle=e.crit?'#fff3b0':e.click?'#ff9fd0':'#c8faff';
      c.beginPath();c.arc(bx,by,e.crit?5:3.5,0,7);c.fill();c.restore();
    }else{
      var f3=e.t/e.T;c.save();c.globalAlpha=1-f3;c.fillStyle=e.c;
      c.fillRect(e.x+e.vx*e.t-1.5,e.y+e.vy*e.t+200*e.t*e.t-1.5,3,3);c.restore();
    }
  }
}
function enemyScreen(){return V.epos?{x:V.epos.x,y:V.epos.y}:null;}
function mageScreen(){return V.mpos?{x:V.mpos.x,y:V.mpos.y+V.icon*0.3}:null;}

/* ════════ КАРТА МИРА ════════ */
var WM=null;
var LOCK='<svg viewBox="0 0 16 16" class="wm-lock"><rect x="3" y="7" width="10" height="8" rx="1" fill="currentColor"/><path d="M5 7V5a3 3 0 0 1 6 0v2" stroke="currentColor" stroke-width="2" fill="none"/></svg>';
function pct(v){return Math.round(v*100)+'%';}
function regionInfo(ti){
  var T=D.TRACTS[ti],open=g.tractOpen(ti),st=S.tracts[ti],h='';
  var name=UI.tractName(ti);
  var status=!open?t('wm.locked',{t:UI.tractName(ti-1)}):st.clears?t('wm.clears',{n:st.clears,w:st.best}):st.best?t('wm.best',{w:st.best}):t('wm.new');
  h+='<div class="wm-it"><b>'+esc(name)+'</b><span class="wm-st'+(open?'':' lk')+'">'+(open?'':LOCK)+esc(status)+'</span></div>';
  /* что падает: доля монстров по ресурсу */
  var cnt={};T.res.forEach(function(r){cnt[r]=(cnt[r]||0)+1;});
  var rs='';Object.keys(cnt).sort(function(a,b){return cnt[b]-cnt[a];}).forEach(function(r){rs+='<span class="wm-r">'+UI.resIcon(r)+esc(t('res.'+r))+' <b>'+pct(cnt[r]/T.res.length)+'</b></span>';});
  h+='<div class="wm-row"><span class="wm-k">'+t('wm.res')+'</span><div class="wm-v">'+rs+'</div></div>';
  var q=D.TRACT_QTY[ti]||1;
  h+='<div class="wm-row"><span class="wm-k">'+t('wm.chance')+'</span><div class="wm-v"><b>'+pct(g.dropChance(ti,1))+'</b> '+t('wm.w1')+' &middot; <b>'+pct(g.dropChance(ti,50))+'</b> '+t('wm.w50')+' &middot; <b>'+pct(g.dropChance(ti,100))+'</b> '+t('wm.w100')+'<small>'+t('wm.qty',{n:q})+(st.clears?'':' '+t('wm.clearUp'))+'</small></div></div>';
  if(D.eliteChance(100)>0)h+='<div class="wm-row"><span class="wm-k">'+t('wm.elite')+'</span><div class="wm-v">'+t('wm.eliteV',{w:D.ELITE_FROM,a:pct(D.eliteChance(D.ELITE_FROM)),b:pct(D.eliteChance(100))})+'</div></div>';
  h+='<div class="wm-row"><span class="wm-k">'+t('wm.boss')+'</span><div class="wm-v"><span class="wm-r">'+UI.resIcon(T.rare)+esc(t('res.'+T.rare))+'</span> '+t('wm.bossV')+'</div></div>';
  /* сила: рекомендуемый урон и уровень, твой урон */
  var my=g.effDps(),r1=D.recDps(ti,1),r100=D.recDps(ti,100);
  var cls=my>=r100?'ok':my>=r1?'mid':'bad';
  h+='<div class="wm-row"><span class="wm-k">'+t('wm.power')+'</span><div class="wm-v">'+t('wm.powerV',{a:D.fmt(r1),b:D.fmt(r100),l1:D.recLevel(ti,1),l2:D.recLevel(ti,100)})+'<small class="wm-my '+cls+'">'+t('wm.my',{d:D.fmt(my),l:S.mlvl})+'</small></div></div>';
  var RO=D.ROSTER[ti],names=[],seen={};
  if(RO){for(var k in RO.mobs)RO.mobs[k].forEach(function(id){if(!seen[id]){seen[id]=1;names.push(t('mv.'+id));}});}
  if(names.length)h+='<div class="wm-row"><span class="wm-k">'+t('wm.mobs')+'</span><div class="wm-v wm-mobs">'+esc(names.join(', '))+'<small>'+t('wm.mainBoss')+' '+esc(t('boss.'+T.id))+'</small></div></div>';
  /* кнопка */
  var tr=S.trip,here=S.place==='road'&&tr&&tr.t===ti,btn='',note='';
  if(!open)btn='<button type="button" class="btn wm-go" disabled>'+t('wm.closed')+'</button>';
  else if(here)btn='<button type="button" class="btn wm-go" data-a="look">'+t('wm.look')+'</button>';
  else if(g.inBoss())btn='<button type="button" class="btn wm-go" disabled>'+t('wm.inBoss')+'</button>';
  else{
    btn='<button type="button" class="btn wm-go" data-a="go">'+t(S.place==='road'?'wm.switch':'wm.go')+'</button>';
    var hp=g.hp(),mx=g.maxHp();
    if(hp<mx*0.999)note='<small class="wm-note">'+t('wm.hurt',{p:Math.floor(hp/mx*100),t:UI.ft(g.healLeft())})+'</small>';
    if(S.place==='road'&&tr)note+='<small class="wm-note">'+t('wm.switchN',{t:UI.tractName(tr.t)})+'</small>';
  }
  h+='<div class="wm-btns">'+note+btn+'</div>';
  return h;
}
function paintWorld(){
  if(!WM)return;
  var svg='',lb='';
  M.world.forEach(function(r,i){
    var open=g.tractOpen(i),sel=i===WM.sel,cur=S.place==='road'&&S.trip&&S.trip.t===i;
    svg+='<polygon data-t="'+i+'" class="'+(open?'op':'lk')+(sel?' sel':'')+'" points="'+r.poly.map(function(p){return p[0]+','+p[1];}).join(' ')+'"/>';
    var st=S.tracts[i];
    lb+='<div class="wm-lbl'+(open?'':' lk')+(sel?' sel':'')+'" data-t="'+i+'" style="left:'+(r.c[0]/M.w*100).toFixed(2)+'%;top:'+(r.c[1]/M.h*100).toFixed(2)+'%">'+
      (cur?'<img class="wm-me" alt="" src="'+url('mage.webp')+'">':'')+(open?'':LOCK)+'<b>'+esc(UI.tractName(i))+'</b>'+(open&&st.clears?'<i>'+st.clears+'</i>':'')+'</div>';
  });
  WM.svg.innerHTML='<defs><pattern id="wm-hatch" width="16" height="16" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="16" height="16" fill="rgba(10,6,22,.62)"/><rect width="6" height="16" fill="rgba(0,0,0,.55)"/></pattern></defs>'+svg;
  WM.lbl.innerHTML=lb;
  WM.info.innerHTML=regionInfo(WM.sel);
}
function openWorld(sel){
  if(!g)return;
  closeWorld(true);
  if(sel===undefined)sel=S.place==='road'&&S.trip?S.trip.t:Math.min(S.lastTract||0,D.TRACTS.length-1);
  var o=document.createElement('div');o.className='wm';
  o.innerHTML='<div class="wm-box"><div class="wm-h"><b>'+t('wm.title')+'</b><button type="button" class="win-x" aria-label="close"></button></div>'+
    '<div class="wm-body"><div class="wm-map"><img alt="" src="'+url('world.webp')+'"><svg viewBox="0 0 '+M.w+' '+M.h+'" preserveAspectRatio="none"></svg><div class="wm-lbls"></div></div><div class="wm-info"></div></div></div>';
  document.body.appendChild(o);
  WM={el:o,sel:sel,svg:o.querySelector('svg'),lbl:o.querySelector('.wm-lbls'),info:o.querySelector('.wm-info')};
  o.addEventListener('click',function(e){
    if(e.target===o||e.target.closest('.win-x')){closeWorld();Sound.sfx('select');return;}
    var r=e.target.closest('[data-t]');
    if(r){WM.sel=+r.dataset.t;paintWorld();Sound.sfx('select');return;}
    var a=e.target.closest('[data-a]');if(!a||a.disabled)return;
    Sound.sfx('select');
    if(a.dataset.a==='look'){closeWorld();if(UI.goScreen)UI.goScreen('road');return;}
    if(a.dataset.a==='go'){var ti=WM.sel;closeWorld();if(g.goTo(ti)){preload(ti);if(UI.goScreen)UI.goScreen('road');UI.toast(t('plan.goNow',{t:UI.tractName(ti)}));}}
  });
  paintWorld();
  WM.timer=setInterval(function(){if(WM&&WM.info&&!WM.info.matches(':hover'))WM.info.innerHTML=regionInfo(WM.sel);},1000);
  for(var i=0;i<D.TRACTS.length;i++)if(g.tractOpen(i))preload(i);
}
function closeWorld(quiet){
  if(!WM)return;
  clearInterval(WM.timer);WM.el.remove();WM=null;
}

function init(game){
  g=game;S=game.S;
  ensureCanvas();
  g.on('bolt',onBolt);g.on('hit',onHit);g.on('mageHit',onMageHit);g.on('bossWind',onWind);
  g.on('tripStart',function(){V.mon=null;V.t=-1;});
  document.addEventListener('keydown',function(e){if(e.key==='Escape'&&WM)closeWorld();});
}

window.AdvMap={init:init,openWorld:openWorld,closeWorld:closeWorld,get worldOpen(){return !!WM;},setOn:setOn,get active(){return V.on;},frame:frame,ready:ready,preload:preload,
  enemyScreen:enemyScreen,mageScreen:mageScreen,_v:V,ROAD:ROAD};
})();
