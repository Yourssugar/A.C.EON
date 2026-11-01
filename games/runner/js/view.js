/* A.C.EON RUNNER: рисование. Картинки из games/art/runner/ (если выложены), иначе всё рисуется кодом.
   Экран 960 x 540 в логических пикселях, холст масштабируется под окно.

   RunArt.load(base, onDone)       подгрузить картинки (недостающие просто не используются)
   var v = RunView(canvas)
   v.resize(cssW, cssH)
   v.draw(st, now)                 st из RunEndless или RunAdv
   v.event(ev, st) */
(function(){
'use strict';

var VW=960,VH=540,T=48;
var WORLDS=['city','desert','space'];
var PAL={
  city:  {sky:['#050510','#1a0838','#3a0a48'],sun:['#ff2d78','#ffd23a'],far:'#160c34',near:'#0c0a20',win:['#00e5ff','#ff2d78','#ffd23a'],
          ground:'#121230',edge:'#00e5ff',block:'#1c1c44',accent:'#ff2d78'},
  desert:{sky:['#1a0628','#6a1a48','#ff7a3d'],sun:['#ff8a1a','#ffe27a'],far:'#3a1238',near:'#24102a',win:['#ffb02e','#ff5a6a','#ffd23a'],
          ground:'#3a1828',edge:'#ff8a1a',block:'#4a2234',accent:'#ffd23a'},
  space: {sky:['#02020a','#0c0628','#1a0a3a'],sun:['#8c6cff','#00e5ff'],far:'#120e30',near:'#0a0a22',win:['#8c6cff','#00e5ff','#ff2d78'],
          ground:'#16123a',edge:'#8c6cff',block:'#201a4a',accent:'#00e5ff'}
};

/* ── картинки ── */
var IMG={},ready=false;
var NAMES=['hero_idle','hero_run1','hero_run2','hero_jump','hero_duck','hero_hurt','coin','gem','star','heart','shield','magnet','boost',
  'spring','spikes','checkpoint','checkpoint_on','portal','key','door'];
WORLDS.forEach(function(w){['sky','far','near','ground','platform','block','low','tall','flyer','walker'].forEach(function(k){NAMES.push(w+'_'+k);});});
window.RunArt={
  load:function(base,done){
    var left=NAMES.length;
    NAMES.forEach(function(n){
      var im=new Image();
      im.onload=function(){IMG[n]=im;if(--left===0){ready=true;if(done)done();}};
      im.onerror=function(){if(--left===0){ready=true;if(done)done();}};
      im.src=base+n+'.webp';
    });
  },
  has:function(n){return !!IMG[n];},
  img:function(n){return IMG[n]||null;},
  PAL:PAL,WORLDS:WORLDS
};

/* ellipse есть не во всех старых браузерах */
function ell(g,x,y,rx,ry,rot,a0,a1){if(g.ellipse){g.ellipse(x,y,rx,ry,rot,a0,a1);return;}
  g.save();g.translate(x,y);g.rotate(rot);g.scale(rx,ry);g.arc(0,0,1,a0,a1);g.restore();}
function rng(seed){var a=seed|0;return function(){a=(a+0x6D2B79F5)|0;var t=Math.imul(a^(a>>>15),1|a);t=(t+Math.imul(t^(t>>>7),61|t))^t;return ((t^(t>>>14))>>>0)/4294967296;};}

/* рисованные слои фона (заглушки): силуэты, бесшовные по ширине 960 */
var procCache={};
function procLayer(world,kind){
  var key=world+kind;if(procCache[key])return procCache[key];
  var P=PAL[world],cv=document.createElement('canvas'),w=960,h=kind==='far'?300:200;
  cv.width=w;cv.height=h;var g=cv.getContext('2d'),r=rng(kind==='far'?11:29);
  var x=0;
  while(x<w){
    var bw=kind==='far'?40+r()*60:60+r()*90,bh=kind==='far'?60+r()*200:40+r()*140;
    if(bw+x>w)bw=w-x;
    g.fillStyle=kind==='far'?P.far:P.near;
    if(world==='desert'){
      g.beginPath();g.moveTo(x,h);g.lineTo(x+bw*0.5,h-bh);g.lineTo(x+bw,h);g.fill();
      if(kind==='far'){g.strokeStyle=P.edge;g.globalAlpha=0.35;g.lineWidth=1.5;g.beginPath();g.moveTo(x,h);g.lineTo(x+bw*0.5,h-bh);g.lineTo(x+bw,h);g.stroke();g.globalAlpha=1;}
    }else if(world==='space'){
      /* станция: модули с куполами, мачты с огоньками */
      var mh=bh*0.6;g.fillRect(x,h-mh,bw,mh);
      g.beginPath();g.arc(x+bw/2,h-mh,bw/2,Math.PI,0);g.fill();
      if(r()<0.6){g.fillRect(x+bw/2-1,h-mh-bw/2-40,2,40);g.fillStyle=P.win[Math.floor(r()*3)];g.fillRect(x+bw/2-2,h-mh-bw/2-44,4,4);}
      g.fillStyle=P.edge;g.globalAlpha=kind==='far'?0.3:0.6;g.fillRect(x+4,h-mh*0.5,bw-8,2);g.globalAlpha=1;
      for(var px=x+8;px<x+bw-8;px+=14)if(r()<0.4){g.fillStyle=P.win[Math.floor(r()*3)];g.globalAlpha=0.7;g.fillRect(px,h-mh*0.3,5,3);g.globalAlpha=1;}
    }else{
      g.fillRect(x,h-bh,bw,bh);
      for(var wy=h-bh+8;wy<h-6;wy+=10)for(var wx=x+5;wx<x+bw-5;wx+=9)
        if(r()<(kind==='far'?0.12:0.18)){g.fillStyle=P.win[Math.floor(r()*3)];g.globalAlpha=kind==='far'?0.5:0.8;g.fillRect(wx,wy,3,4);g.globalAlpha=1;}
      if(kind==='near'&&r()<0.5){g.fillStyle=P.edge;g.fillRect(x+4,h-bh,bw-8,3);}
    }
    x+=bw+(r()<0.3?r()*30:0);
  }
  procCache[key]=cv;return cv;
}

/* рисованный герой, пока нет картинок: робот с головой-экраном */
function drawHeroProc(g,h,pose,t){
  var cx=h.x+h.w/2,foot=h.y+h.h,duck=pose==='duck',s=duck?0.62:1;
  g.save();g.translate(cx,foot);
  if(pose==='hurt')g.rotate(-0.3);
  g.shadowColor='#00e5ff';g.shadowBlur=10;
  /* ноги */
  g.strokeStyle='#cfe9ff';g.lineWidth=5;g.lineCap='round';
  var a=pose==='run'?Math.sin(t)*9:pose==='jump'?6:3;
  g.beginPath();g.moveTo(-5,-20*s);g.lineTo(-5+a,0);g.moveTo(5,-20*s);g.lineTo(5-a,0);g.stroke();
  /* тело */
  g.fillStyle='#1c2a4a';g.strokeStyle='#00e5ff';g.lineWidth=2;
  g.beginPath();g.rect(-14,-46*s,28,26*s);g.fill();g.stroke();
  g.fillStyle='#ff2d78';g.fillRect(-14,-36*s,28,4);
  /* голова */
  g.fillStyle='#0c1426';g.beginPath();g.arc(0,-60*s,14,0,Math.PI*2);g.fill();g.stroke();
  g.fillStyle=pose==='hurt'?'#ff3355':'#00e5ff';
  g.fillRect(-2,-63*s,4,6);g.fillRect(6,-63*s,4,6);
  g.strokeStyle='#ffd23a';g.beginPath();g.moveTo(0,-74*s);g.lineTo(0,-82*s);g.stroke();
  g.fillStyle='#ffd23a';g.beginPath();g.arc(0,-84*s,3,0,Math.PI*2);g.fill();
  if(pose==='jump'){g.fillStyle='rgba(255,138,26,.8)';g.beginPath();g.moveTo(-16,-28);g.lineTo(-12,-10);g.lineTo(-20,-14);g.fill();}
  g.restore();
}

window.RunView=function(canvas){
  var g=canvas.getContext('2d'),k=1,dpr=1,cw=VW,ch=VH;
  var parts=[],pops=[],shake=0,flash=0,trans=null;

  function resize(w,h){
    dpr=Math.min(2,window.devicePixelRatio||1);cw=w;ch=h;
    canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);
    canvas.style.width=w+'px';canvas.style.height=h+'px';
    k=w/VW;
  }
  function burst(x,y,n,col,spd){for(var i=0;i<n;i++){var a=Math.random()*Math.PI*2,s=(spd||200)*(0.4+Math.random());parts.push({x:x,y:y,vx:Math.cos(a)*s,vy:Math.sin(a)*s-80,life:1,col:col,s:2+Math.random()*3});}}
  function event(ev,st){
    var cam=st.cam||{x:0,y:0},P=PAL[WORLDS[st.mode==='adv'?st.world:st.biome]];
    var x=ev.x!=null?ev.x-(st.mode==='adv'?0:0):0,y=ev.y;
    switch(ev.type){
      case 'coin':burst(x,y,6,'#ffd23a',160);break;
      case 'gem':burst(x,y,14,'#7ae8ff',240);pops.push({x:x,y:y,txt:'+10',life:1,col:'#7ae8ff'});break;
      case 'star':burst(x,y,22,'#ffd23a',300);flash=0.5;break;
      case 'power':burst(x,y,16,P.accent,260);break;
      case 'stomp':burst(x,y,12,'#ffffff',220);shake=Math.max(shake,4);break;
      case 'hurt':shake=Math.max(shake,8);flash=0.6;break;
      case 'over':case 'die':case 'fall':shake=Math.max(shake,12);flash=1;break;
      case 'shieldHit':burst(x,y,18,'#00e5ff',300);shake=Math.max(shake,6);break;
      case 'land':var h=st.hero;burst(h.x+h.w/2,h.y+h.h,5,'#cfe9ff',90);break;
      case 'spring':burst(x,y,8,P.accent,200);break;
      case 'check':burst(x,y-60,16,'#2ee87a',220);break;
      case 'biome':trans={from:(ev.b+2)%3,t:1.5};break;
    }
  }

  /* слой фона: картинка повторяется по ширине, сдвиг от камеры */
  function layer(img,off,yBottom,hgt){
    var iw=img.width*hgt/img.height,x=-((off%iw)+iw)%iw;
    for(;x<VW;x+=iw)g.drawImage(img,x,yBottom-hgt,iw+1,hgt);
  }
  function drawBG(world,camX,horizon,alpha){
    var P=PAL[world];g.globalAlpha=alpha;
    var sky=IMG[world+'_sky'];
    if(sky){var sw=VH*sky.width/sky.height;g.drawImage(sky,-((camX*0.03)%(sw-VW>0?sw-VW:1)),0,sw,VH);}
    else{
      var gr=g.createLinearGradient(0,0,0,horizon);gr.addColorStop(0,P.sky[0]);gr.addColorStop(0.6,P.sky[1]);gr.addColorStop(1,P.sky[2]);
      g.fillStyle=gr;g.fillRect(0,0,VW,VH);
      var r=rng(5);g.fillStyle='rgba(255,255,255,.7)';for(var i=0;i<70;i++){var sx=((r()*VW-camX*0.02)%VW+VW)%VW;g.fillRect(sx,r()*horizon*0.7,r()<0.1?2:1,r()<0.1?2:1);}
      var sg=g.createLinearGradient(0,horizon-170,0,horizon);sg.addColorStop(0,P.sun[1]);sg.addColorStop(1,P.sun[0]);
      if(world==='space'){
        /* планета с кольцом вместо солнца */
        var px0=VW*0.72,py0=horizon-230;
        sg=g.createLinearGradient(px0-80,py0-80,px0+80,py0+80);sg.addColorStop(0,P.sun[1]);sg.addColorStop(1,P.sun[0]);
        g.fillStyle=sg;g.beginPath();g.arc(px0,py0,80,0,Math.PI*2);g.fill();
        g.fillStyle='rgba(2,2,10,.45)';g.beginPath();g.arc(px0+28,py0+18,80,0,Math.PI*2);g.fill();
        g.strokeStyle='rgba(200,190,255,.55)';g.lineWidth=4;g.beginPath();ell(g,px0,py0,140,26,-0.25,0,Math.PI*2);g.stroke();
      }else{
        g.fillStyle=sg;g.beginPath();g.arc(VW*0.7,horizon-40,110,Math.PI,0);g.fill();
        g.fillStyle=P.sky[2];for(var b=0;b<6;b++)g.fillRect(VW*0.7-112,horizon-60+b*9,224,3+b*0.6);
      }
    }
    var far=IMG[world+'_far']||procLayer(world,'far'),near=IMG[world+'_near']||procLayer(world,'near');
    layer(far,camX*0.15,horizon+10,IMG[world+'_far']?300:300);
    layer(near,camX*0.4,horizon+14,IMG[world+'_near']?210:200);
    g.globalAlpha=1;
  }

  /* ── бесконечный бег ── */
  function drawEndless(st,now){
    var GY=RunEndless.GY,world=WORLDS[st.biome],P=PAL[world],d=st.dist;
    if(trans&&trans.t>0){drawBG(WORLDS[trans.from],d,GY,1);drawBG(world,d,GY,1-trans.t/1.5);trans.t-=1/60;}
    else drawBG(world,d,GY,1);
    /* земля */
    var gi=IMG[world+'_ground'];
    if(gi){var gh=VH-GY+40,gw=gi.width*gh/gi.height,x=-((d%gw)+gw)%gw;for(;x<VW;x+=gw)g.drawImage(gi,x,GY-12,gw+1,gh);}
    else{
      g.fillStyle=P.ground;g.fillRect(0,GY,VW,VH-GY);
      g.save();g.shadowColor=P.edge;g.shadowBlur=12;g.fillStyle=P.edge;g.fillRect(0,GY-2,VW,3);g.restore();
      g.fillStyle='rgba(255,255,255,.08)';for(var lx=-(d%60);lx<VW;lx+=60)g.fillRect(lx,GY+14,30,2);
      g.fillStyle='rgba(255,255,255,.05)';for(var lx2=-((d*0.7)%90);lx2<VW;lx2+=90)g.fillRect(lx2,GY+40,44,2);
    }
    /* препятствия */
    st.obs.forEach(function(o){
      var fly=o.k==='duck'||o.k==='high',bob=fly?Math.sin(o.t*4)*4:0;
      var img=IMG[world+'_'+(fly?'flyer':o.k)];
      if(img){
        var dw=fly?o.w*1.5:o.w*1.9,dh=dw*img.height/img.width;
        g.drawImage(img,o.x+o.w/2-dw/2,o.y+bob+o.h-dh+(fly?dh*0.25:dh*0.04),dw,dh);
      }else drawObsProc(o,bob,P,now);
    });
    drawItems(st.items,now,P);
    var h=st.hero,pose=st.over?'hurt':!st.started?'idle':!h.ground?'jump':h.duck?'duck':'run';
    if(st.fx.shield>0){g.save();g.strokeStyle='rgba(0,229,255,'+(0.5+0.3*Math.sin(now/120))+')';g.lineWidth=3;g.beginPath();ell(g,h.x+h.w/2,h.y+h.h/2,h.w,h.h*0.75,0,0,Math.PI*2);g.stroke();g.restore();}
    if(st.fx.magnet>0){g.save();g.strokeStyle='rgba(255,90,216,.25)';g.setLineDash([6,6]);g.beginPath();g.arc(h.x+h.w/2,h.y+h.h/2,90+Math.sin(now/200)*6,0,Math.PI*2);g.stroke();g.restore();}
    drawHero(h,pose,now,false);
  }
  function drawObsProc(o,bob,P,now){
    g.save();
    if(o.k==='low'||o.k==='tall'){
      g.shadowColor=P.accent;g.shadowBlur=10;g.fillStyle=P.block;g.strokeStyle=P.accent;g.lineWidth=2;
      g.fillRect(o.x,o.y,o.w,o.h);g.strokeRect(o.x+1,o.y+1,o.w-2,o.h-2);
      g.shadowBlur=0;g.fillStyle=P.accent;for(var y=o.y+10;y<o.y+o.h-6;y+=16)g.fillRect(o.x+6,y,o.w-12,3);
    }else{
      var cx=o.x+o.w/2,cy=o.y+o.h/2+bob;
      g.shadowColor='#ff3355';g.shadowBlur=12;g.fillStyle='#2a1838';g.strokeStyle='#ff3355';g.lineWidth=2;
      g.beginPath();ell(g,cx,cy,o.w*0.36,o.h*0.42,0,0,Math.PI*2);g.fill();g.stroke();
      var fl=Math.sin(now/40)*6;g.fillStyle='rgba(255,51,85,.6)';
      g.fillRect(o.x-2,cy-8+fl*0.3,18,4);g.fillRect(o.x+o.w-16,cy-8-fl*0.3,18,4);
      g.fillStyle=Math.sin(now/100)>0?'#ff3355':'#00e5ff';g.beginPath();g.arc(cx,cy,5,0,Math.PI*2);g.fill();
    }
    g.restore();
  }
  function drawItems(items,now,P){
    items.forEach(function(it){
      var img=IMG[it.k];
      if(it.k==='coin'){
        var sx=Math.abs(Math.cos(now/260+it.x*0.01));
        if(img){var s=it.r*2.4;g.drawImage(img,it.x-s*sx/2,it.y-s/2,s*sx,s);}
        else{g.save();g.translate(it.x,it.y);g.scale(Math.max(0.15,sx),1);g.shadowColor='#ffd23a';g.shadowBlur=10;g.fillStyle='#ffd23a';g.beginPath();g.arc(0,0,it.r,0,Math.PI*2);g.fill();
          g.fillStyle='#fff3a8';g.beginPath();g.arc(-3,-3,it.r*0.4,0,Math.PI*2);g.fill();g.restore();}
        return;
      }
      var bob=Math.sin(now/300+it.x)*4,sz=it.r*(it.k==='star'?3:2.8);
      if(img){g.drawImage(img,it.x-sz/2,it.y-sz/2+bob,sz,sz);return;}
      g.save();g.translate(it.x,it.y+bob);
      var col={gem:'#7ae8ff',star:'#ffd23a',heart:'#ff3a7a',key:'#ffd23a',shield:'#00e5ff',magnet:'#ff5ad8',boost:'#ff8a1a'}[it.k]||'#fff';
      g.shadowColor=col;g.shadowBlur=14;g.fillStyle=col;g.strokeStyle=col;g.lineWidth=3;
      if(it.k==='star'){g.rotate(now/900);g.beginPath();for(var i=0;i<10;i++){var a=i*Math.PI/5-Math.PI/2,rr=i%2?it.r*0.45:it.r;g.lineTo(Math.cos(a)*rr,Math.sin(a)*rr);}g.fill();}
      else if(it.k==='gem'){g.beginPath();g.moveTo(0,-it.r);g.lineTo(it.r*0.8,-it.r*0.2);g.lineTo(0,it.r);g.lineTo(-it.r*0.8,-it.r*0.2);g.closePath();g.fill();}
      else if(it.k==='heart'){var r=it.r;g.beginPath();g.moveTo(0,r*0.8);g.bezierCurveTo(-r*1.4,-r*0.2,-r*0.5,-r*1.2,0,-r*0.4);g.bezierCurveTo(r*0.5,-r*1.2,r*1.4,-r*0.2,0,r*0.8);g.fill();}
      else if(it.k==='key'){g.beginPath();g.arc(-6,0,7,0,Math.PI*2);g.stroke();g.fillRect(0,-2,16,4);g.fillRect(10,2,3,6);}
      else{g.globalAlpha=0.35;g.beginPath();g.arc(0,0,it.r,0,Math.PI*2);g.fill();g.globalAlpha=1;g.beginPath();g.arc(0,0,it.r,0,Math.PI*2);g.stroke();
        g.font='bold 16px Tahoma';g.textAlign='center';g.textBaseline='middle';g.fillStyle='#fff';g.fillText(it.k==='shield'?'S':it.k==='magnet'?'M':'x2',0,1);}
      g.restore();
    });
  }
  function drawHero(h,pose,now,blink){
    if(blink&&Math.floor(now/80)%2)return;
    var name=pose==='run'?(Math.floor(h.run)%2?'hero_run1':'hero_run2'):'hero_'+pose;
    var img=IMG[name]||(pose==='run'?IMG.hero_idle:null);
    if(img&&IMG.hero_idle){
      var dh=96,dw=dh*img.width/img.height,sq=h.squash>0?1-h.squash*1.2:1;
      g.save();g.translate(h.x+h.w/2,h.y+h.h+4);
      if(h.face<0)g.scale(-1,1);
      g.scale(2-sq,sq);
      g.drawImage(img,-dw/2,-dh,dw,dh);
      g.restore();
    }else drawHeroProc(g,h,pose,h.run*1.4);
  }

  /* ── приключение ── */
  function drawAdv(st,now){
    var world=WORLDS[st.world],P=PAL[world],cx=Math.round(st.cam.x),cy=Math.round(st.cam.y);
    drawBG(world,cx,VH-60,1);
    g.save();g.translate(-cx,-cy);
    var c0=Math.max(0,Math.floor(cx/T)),c1=Math.min(st.cols-1,Math.ceil((cx+VW)/T));
    var gi=IMG[world+'_ground'],bi=IMG[world+'_block'],pi=IMG[world+'_platform'];
    for(var r=0;r<12;r++)for(var c=c0;c<=c1;c++){
      var ch=st.grid[r][c],x=c*T,y=r*T;
      if(ch==='#'){
        var top=r===0||st.grid[r-1][c]!=='#';
        if(gi){if(top)g.drawImage(gi,(c%4)*gi.width/4,0,gi.width/4,gi.height*0.38,x,y-4,T+1,T*0.38*2+4);else{g.fillStyle=P.ground;g.fillRect(x,y,T+1,T+1);}}
        else{g.fillStyle=P.ground;g.fillRect(x,y,T+1,T+1);if(top){g.fillStyle=P.edge;g.fillRect(x,y,T+1,3);g.fillStyle='rgba(255,255,255,.06)';g.fillRect(x,y+3,T,6);}}
      }else if(ch==='B'){
        if(bi)g.drawImage(bi,x,y,T,T);
        else{g.fillStyle=P.block;g.fillRect(x,y,T,T);g.strokeStyle=P.accent;g.globalAlpha=0.6;g.lineWidth=2;g.strokeRect(x+2,y+2,T-4,T-4);g.globalAlpha=1;}
      }else if(ch==='='){
        var left=st.grid[r][c-1]!=='=',right=st.grid[r][c+1]!=='=';
        if(pi){g.drawImage(pi,left?0:right?pi.width*2/3:pi.width/3,0,pi.width/3,pi.height,x,y,T+1,T*0.4);}
        else{g.save();g.shadowColor=P.edge;g.shadowBlur=10;g.fillStyle=P.block;g.fillRect(x,y,T+1,14);g.fillStyle=P.edge;g.fillRect(x,y,T+1,3);g.restore();}
      }else if(ch==='^'){
        var si=IMG.spikes;
        if(si)g.drawImage(si,(c%2)*si.width/2,0,si.width/2,si.height,x,y+T*0.4,T+1,T*0.6);
        else{g.fillStyle='#c8d0e0';g.beginPath();for(var s=0;s<3;s++){g.moveTo(x+s*16,y+T);g.lineTo(x+s*16+8,y+T*0.5);g.lineTo(x+s*16+16,y+T);}g.fill();
          g.fillStyle='#ff3355';for(var s2=0;s2<3;s2++)g.fillRect(x+s2*16+7,y+T*0.5,2,4);}
      }else if(ch==='D'&&!st.key){
        var di=IMG.door;
        if(di&&(r===0||st.grid[r-1][c]!=='D')){var n=1;while(r+n<12&&st.grid[r+n][c]==='D')n++;g.drawImage(di,x-T*0.25,y,T*1.5,n*T);}
        else if(!di){g.fillStyle='rgba(255,45,120,.25)';g.fillRect(x+8,y,T-16,T);g.fillStyle='#ff2d78';for(var b=0;b<3;b++)g.fillRect(x+12+b*10,y,3,T);}
      }
    }
    /* едущие платформы */
    st.movers.forEach(function(m){
      if(pi)g.drawImage(pi,m.x,m.y,m.w,m.w*pi.height/pi.width);
      else{g.save();g.shadowColor=P.accent;g.shadowBlur=12;g.fillStyle=P.block;g.fillRect(m.x,m.y,m.w,m.h);g.fillStyle=P.accent;g.fillRect(m.x,m.y,m.w,3);g.restore();}
    });
    /* пружины, контрольные точки, выход */
    st.springs.forEach(function(s){
      var img=IMG.spring,sq=s.t>0?0.6:1;
      if(img){var dw=s.w*1.6,dh=dw*sq;g.drawImage(img,s.x+s.w/2-dw/2,s.y+s.h-dh,dw,dh);}
      else{g.fillStyle=P.accent;g.fillRect(s.x,s.y+s.h-6,s.w,6);g.strokeStyle='#cfe9ff';g.lineWidth=3;g.beginPath();for(var i=0;i<4;i++){g.lineTo(s.x+(i%2?s.w-6:6),s.y+s.h-6-i*(s.h-8)*sq/3);}g.stroke();g.fillRect(s.x,s.y+s.h-s.h*sq,s.w,5);}
    });
    st.checks.forEach(function(c){
      var img=IMG[c.on?'checkpoint_on':'checkpoint'];
      if(img){var dh=128,dw=dh*img.width/img.height;g.drawImage(img,c.x-dw/2,c.y-dh,dw,dh);}
      else{g.fillStyle='#888';g.fillRect(c.x-2,c.y-110,4,110);g.save();if(c.on){g.shadowColor='#2ee87a';g.shadowBlur=16;}g.fillStyle=c.on?'#2ee87a':'#445';g.beginPath();g.arc(c.x,c.y-114,10,0,Math.PI*2);g.fill();g.restore();}
    });
    if(st.exit){
      var e=st.exit,img=IMG.portal;
      g.save();g.translate(e.x,e.y);g.rotate(now/600);
      if(img)g.drawImage(img,-80,-80,160,160);
      else{for(var q=0;q<3;q++){g.strokeStyle=['#00e5ff','#ff2d78','#8c6cff'][q];g.lineWidth=4;g.beginPath();g.arc(0,0,40+q*10,q,q+Math.PI*1.4);g.stroke();}}
      g.restore();
    }
    drawItems(st.items,now,P);
    /* враги */
    st.enemies.forEach(function(en){
      if(!en.alive&&en.t>0.5)return;
      var img=IMG[world+'_'+en.k];
      g.save();
      if(!en.alive){g.globalAlpha=1-en.t*2;g.translate(en.x+en.w/2,en.y+en.h);g.scale(1.3,0.3);g.translate(-(en.x+en.w/2),-(en.y+en.h));}
      if(img){var dw=en.k==='walker'?en.w*1.7:en.w*1.6,dh=dw*img.height/img.width;
        g.translate(en.x+en.w/2,en.y+en.h);if(en.k==='walker'&&en.vx>0)g.scale(-1,1);
        g.drawImage(img,-dw/2,-dh+(en.k==='walker'?dh*0.06:dh*0.2),dw,dh);}
      else{
        g.shadowColor='#ff3355';g.shadowBlur=10;g.fillStyle='#2a1838';g.strokeStyle='#ff3355';g.lineWidth=2;
        if(en.k==='walker'){g.fillRect(en.x,en.y+6,en.w,en.h-6);g.strokeRect(en.x,en.y+6,en.w,en.h-6);g.fillStyle='#ff3355';g.fillRect(en.x+(en.vx<0?6:en.w-14),en.y+14,8,6);}
        else{g.beginPath();ell(g,en.x+en.w/2,en.y+en.h/2,en.w/2,en.h/2,0,0,Math.PI*2);g.fill();g.stroke();g.fillStyle='#ff3355';g.beginPath();g.arc(en.x+en.w/2,en.y+en.h/2,5,0,Math.PI*2);g.fill();}
      }
      g.restore();
    });
    var h=st.hero,pose=st.inv>1.1?'hurt':!h.ground?'jump':h.duck?'duck':Math.abs(h.vx)>20?'run':'idle';
    drawHero(h,pose,now,st.inv>0&&st.inv<=1.1);
    g.restore();
    /* край автопрокрутки */
    if(st.auto){g.fillStyle='rgba(255,51,85,.18)';g.fillRect(0,0,10,VH);}
  }

  function draw(st,now){
    g.setTransform(1,0,0,1,0,0);
    g.fillStyle='#050510';g.fillRect(0,0,canvas.width,canvas.height);
    var s=k*dpr,ox=0,oy=0;
    if(shake>0.3){ox=(Math.random()-0.5)*shake*s;oy=(Math.random()-0.5)*shake*s;shake*=0.86;}else shake=0;
    g.setTransform(s,0,0,s,ox,oy);
    if(st.mode==='adv')drawAdv(st,now);else drawEndless(st,now);
    /* частицы и надписи: в координатах мира */
    var camx=st.mode==='adv'?st.cam.x:0,camy=st.mode==='adv'?st.cam.y:0,dt=1/60,i;
    g.save();g.translate(-camx,-camy);
    for(i=parts.length-1;i>=0;i--){var p=parts[i];p.x+=p.vx*dt-(st.mode!=='adv'&&st.started&&!st.over?st.speed*dt:0);p.y+=p.vy*dt;p.vy+=500*dt;p.life-=dt*1.8;
      if(p.life<=0){parts.splice(i,1);continue;}g.globalAlpha=p.life;g.fillStyle=p.col;g.fillRect(p.x-p.s/2,p.y-p.s/2,p.s,p.s);}
    g.globalAlpha=1;g.textAlign='center';g.font='16px "Press Start 2P",monospace';
    for(i=pops.length-1;i>=0;i--){var q=pops[i];q.life-=dt;q.y-=40*dt;if(q.life<=0){pops.splice(i,1);continue;}g.globalAlpha=q.life;g.fillStyle=q.col;g.fillText(q.txt,q.x,q.y);}
    g.globalAlpha=1;g.restore();
    if(flash>0){g.fillStyle='rgba(255,40,60,'+flash*0.25+')';g.fillRect(0,0,VW,VH);flash=Math.max(0,flash-0.04);}
    g.setTransform(1,0,0,1,0,0);
  }
  return {resize:resize,draw:draw,event:event,reset:function(){parts=[];pops=[];trans=null;}};
};
window.RunView.VW=VW;window.RunView.VH=VH;
})();
