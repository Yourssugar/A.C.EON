/* A.C.EON BUBBLES: рисование поля на canvas.
   Пока нет картинок Codex, шары и пушка рисуются кодом (стекло с бликом).
   Темы: neon (картинки или стеклянные шары), flat (плоские яркие круги).
   Символы для дальтоников: у каждого цвета своя фигура поверх шара.

   BubArt.load(base, done)        картинки из art/bubbles/
   BubView(canvas)                -> {resize(w,h), draw(st, now, ui), event(ev, st), reset()} */
(function(){
'use strict';
var B=window.BubRules,R=B.R,W=B.W,H=B.H,RH=B.RH;
var COL=['#ff2d55','#2f7bff','#2ee87a','#ffd23a','#a35cff','#00e5ff'];
var NAMES_C=['red','blue','green','yellow','purple','cyan'];
var WORLDS=['reef','sky','nebula'];
var BG={reef:['#021a24','#03303c'],sky:['#1a0a2a','#3a1438'],nebula:['#07041a','#1a0a3a'],classic:['#050510','#0b0b2a']};

var IMG={};
var NAMES=NAMES_C.map(function(c){return 'ball_'+c;}).concat(['ball_rainbow','ball_bomb','ball_bolt','ball_stone','ice_overlay',
  'cannon_base','cannon_barrel','helper_idle','helper_cheer','pop','ceiling']);
WORLDS.forEach(function(w){NAMES.push(w+'_field');});
window.BubArt={
  load:function(base,done){var left=NAMES.length;NAMES.forEach(function(n){var im=new Image();
    im.onload=function(){IMG[n]=im;if(--left===0&&done)done();};im.onerror=function(){if(--left===0&&done)done();};im.src=base+n+'.webp';});},
  COL:COL,WORLDS:WORLDS
};

/* стеклянный шар кодом: заранее в маленький canvas, чтобы не считать градиенты каждый кадр */
var cache={};
function ballCanvas(key,draw){
  if(cache[key])return cache[key];
  var s=96,cv=document.createElement('canvas');cv.width=cv.height=s;var g=cv.getContext('2d');
  g.translate(s/2,s/2);draw(g,s/2-4);cache[key]=cv;return cv;
}
function glass(g,r,col){
  var gr=g.createRadialGradient(-r*0.35,-r*0.4,r*0.08,0,0,r);
  gr.addColorStop(0,'#ffffff');gr.addColorStop(0.18,col);gr.addColorStop(0.75,col);gr.addColorStop(1,'rgba(0,0,0,.55)');
  g.fillStyle=gr;g.beginPath();g.arc(0,0,r,0,Math.PI*2);g.fill();
  g.strokeStyle='rgba(255,255,255,.35)';g.lineWidth=2;g.beginPath();g.arc(0,0,r-1.5,Math.PI*1.1,Math.PI*1.6);g.stroke();
}
function procBall(type,c,flat){
  return ballCanvas(type+c+(flat?'f':''),function(g,r){
    if(type==='n'){
      if(flat){g.fillStyle=COL[c];g.beginPath();g.arc(0,0,r,0,Math.PI*2);g.fill();g.fillStyle='rgba(255,255,255,.35)';g.beginPath();g.arc(-r*0.35,-r*0.35,r*0.22,0,Math.PI*2);g.fill();}
      else glass(g,r,COL[c]);
    }else if(type==='stone'){
      var gr=g.createRadialGradient(-r*0.3,-r*0.3,r*0.1,0,0,r);gr.addColorStop(0,'#9aa2b4');gr.addColorStop(1,'#2a2e3c');
      g.fillStyle=gr;g.beginPath();g.arc(0,0,r,0,Math.PI*2);g.fill();
      g.strokeStyle='rgba(0,0,0,.5)';g.lineWidth=2;g.beginPath();g.moveTo(-r*0.5,-r*0.2);g.lineTo(-r*0.1,r*0.1);g.lineTo(r*0.4,-r*0.1);g.moveTo(-r*0.1,r*0.1);g.lineTo(0,r*0.6);g.stroke();
      g.strokeStyle='rgba(140,108,255,.6)';g.lineWidth=1.5;g.beginPath();g.arc(0,0,r-2,0,Math.PI*2);g.stroke();
    }else if(type==='bomb'){
      var gb=g.createRadialGradient(-r*0.3,-r*0.3,r*0.1,0,0,r);gb.addColorStop(0,'#5a5a6a');gb.addColorStop(1,'#0a0a12');
      g.fillStyle=gb;g.beginPath();g.arc(0,0,r,0,Math.PI*2);g.fill();
      g.strokeStyle='#ff3355';g.lineWidth=3;g.beginPath();g.arc(0,0,r*0.55,0,Math.PI*2);g.stroke();
      g.fillStyle='#ff3355';g.beginPath();g.arc(0,0,r*0.2,0,Math.PI*2);g.fill();
      g.strokeStyle='#ffd23a';g.lineWidth=3;g.beginPath();g.moveTo(r*0.4,-r*0.75);g.quadraticCurveTo(r*0.8,-r*1.1,r*0.95,-r*0.8);g.stroke();
    }else if(type==='rain'){
      for(var i=0;i<6;i++){g.fillStyle=COL[i];g.beginPath();g.moveTo(0,0);g.arc(0,0,r,i*Math.PI/3-Math.PI/2,(i+1)*Math.PI/3-Math.PI/2);g.fill();}
      var gw=g.createRadialGradient(-r*0.3,-r*0.35,r*0.05,0,0,r);gw.addColorStop(0,'rgba(255,255,255,.9)');gw.addColorStop(0.4,'rgba(255,255,255,.15)');gw.addColorStop(1,'rgba(0,0,0,.35)');
      g.fillStyle=gw;g.beginPath();g.arc(0,0,r,0,Math.PI*2);g.fill();
    }else if(type==='bolt'){
      glass(g,r,'#1a3a8a');
      g.fillStyle='#e8fbff';g.shadowColor='#00e5ff';g.shadowBlur=10;
      g.beginPath();g.moveTo(r*0.15,-r*0.75);g.lineTo(-r*0.35,r*0.1);g.lineTo(-r*0.02,r*0.1);g.lineTo(-r*0.2,r*0.75);g.lineTo(r*0.38,-r*0.15);g.lineTo(r*0.05,-r*0.15);g.closePath();g.fill();
    }else if(type==='ice'){
      g.fillStyle='rgba(200,240,255,.35)';g.beginPath();g.arc(0,0,r,0,Math.PI*2);g.fill();
      g.strokeStyle='rgba(235,250,255,.9)';g.lineWidth=2.5;g.beginPath();g.arc(0,0,r-1.5,0,Math.PI*2);g.stroke();
      g.lineWidth=1.5;g.beginPath();g.moveTo(-r*0.6,-r*0.1);g.lineTo(-r*0.15,r*0.15);g.lineTo(r*0.2,-r*0.4);g.moveTo(-r*0.15,r*0.15);g.lineTo(r*0.3,r*0.5);g.stroke();
    }
  });
}
/* символы для дальтоников */
function symbol(g,c,x,y,r){
  g.save();g.translate(x,y);g.fillStyle='rgba(0,0,0,.55)';g.strokeStyle='rgba(255,255,255,.95)';g.lineWidth=2;var s=r*0.42;
  g.beginPath();
  if(c===0){g.moveTo(-s,0);g.lineTo(0,-s);g.lineTo(s,0);g.lineTo(0,s);g.closePath();}
  else if(c===1){g.rect(-s*0.8,-s*0.8,s*1.6,s*1.6);}
  else if(c===2){g.moveTo(0,-s);g.lineTo(s,s*0.8);g.lineTo(-s,s*0.8);g.closePath();}
  else if(c===3){for(var i=0;i<10;i++){var a=i*Math.PI/5-Math.PI/2,rr=i%2?s*0.45:s;g.lineTo(Math.cos(a)*rr,Math.sin(a)*rr);}g.closePath();}
  else if(c===4){g.arc(0,0,s*0.8,0,Math.PI*2);}
  else{g.moveTo(-s,-s*0.3);g.lineTo(s,-s*0.3);g.moveTo(-s,s*0.3);g.lineTo(s,s*0.3);}
  g.fill();g.stroke();g.restore();
}

window.BubView=function(canvas){
  var g=canvas.getContext('2d'),k=1,dpr=1,parts=[],pops=[],falls=[],slide=0,press=0,flash=0,cheer=0,shake=0;

  function resize(w,h){dpr=Math.min(2,window.devicePixelRatio||1);canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);canvas.style.width=w+'px';canvas.style.height=h+'px';k=w/W;}

  function drawBall(b,x,y,r,ui){
    var flat=ui.theme==='flat',img=null;
    if(!flat){
      if(b.t==='n')img=IMG['ball_'+NAMES_C[b.c]];
      else img=IMG['ball_'+({stone:'stone',bomb:'bomb',rain:'rainbow',bolt:'bolt'})[b.t]];
    }
    /* у картинок шар занимает 224 из 256 пикселей: растягиваем, чтобы радиус совпал с сеткой */
    if(img){var q=r*1.143;g.drawImage(img,x-q,y-q,q*2,q*2);}
    else{var cv=procBall(b.t==='n'?'n':b.t,b.t==='n'?b.c:0,flat);g.drawImage(cv,x-r*1.09,y-r*1.09,r*2.18,r*2.18);}
    if(b.ice){var ic=!flat&&IMG.ice_overlay;if(ic){var q2=r*1.143;g.drawImage(ic,x-q2,y-q2,q2*2,q2*2);}else{var c2=procBall('ice',0);g.drawImage(c2,x-r*1.09,y-r*1.09,r*2.18,r*2.18);}}
    if(ui.symbols&&b.t==='n'&&b.c>=0)symbol(g,b.c,x,y,r);
  }

  function event(ev,st){
    if(ev.type==='land'){
      var all=ev.pop.concat(ev.boom);
      all.forEach(function(q){
        var d=Math.sqrt((q[3]-ev.x)*(q[3]-ev.x)+(q[4]-ev.y)*(q[4]-ev.y));
        pops.push({b:q[2],x:q[3],y:q[4],t:-d/900,boom:ev.boom.indexOf(q)>=0});
      });
      ev.drop.forEach(function(q){falls.push({b:q[2],x:q[3],y:q[4],vx:(Math.random()-0.5)*160,vy:-120-Math.random()*160,t:0});});
      ev.thaw.forEach(function(q){burst(q[3],q[4],8,'#dff6ff',140);});
      if(ev.boom.length){shake=8;flash=0.35;}
      if(ev.bolt>=0)flash=0.25;
      if(ev.drop.length>=6)cheer=1.6;
      if(!all.length)burst(ev.x,ev.y,4,'#ffffff',60);
    }else if(ev.type==='row'){slide=1;}
    else if(ev.type==='press'){press=1;shake=4;}
    else if(ev.type==='rest'){ev.drop.forEach(function(q){falls.push({b:q[2],x:q[3],y:q[4],vx:(Math.random()-0.5)*120,vy:-80,t:0});});}
    else if(ev.type==='win'){cheer=3;}
  }
  function burst(x,y,n,col,spd){for(var i=0;i<n;i++){var a=Math.random()*Math.PI*2,s=(spd||150)*(0.4+Math.random());parts.push({x:x,y:y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life:1,col:col,s:2+Math.random()*3});}}

  function bg(st,ui){
    var key=st.mode==='levels'?WORLDS[ui.world||0]:'nebula',fi=IMG[key+'_field'];
    if(fi&&ui.theme!=='flat'){var sw=W,sh=W*fi.height/fi.width;g.drawImage(fi,0,H-sh,sw,sh);g.fillStyle='rgba(0,0,0,.25)';g.fillRect(0,0,W,H);}
    else{var c=BG[key]||BG.classic,gr=g.createLinearGradient(0,0,0,H);gr.addColorStop(0,c[0]);gr.addColorStop(1,c[1]);g.fillStyle=gr;g.fillRect(0,0,W,H);
      g.strokeStyle='rgba(255,255,255,.03)';g.lineWidth=1;for(var x=R;x<W;x+=R*2){g.beginPath();g.moveTo(x,0);g.lineTo(x,H);g.stroke();}}
  }
  function ceiling(top){
    var ci=IMG.ceiling;
    if(top<=0&&!ci){g.fillStyle='rgba(0,229,255,.5)';g.fillRect(0,0,W,2);return;}
    if(ci){g.fillStyle='#0c0c22';g.fillRect(0,0,W,top);var ch=26,cw=ch*ci.width/ci.height;for(var x=0;x<W;x+=cw)g.drawImage(ci,x,top-ch+8,cw+1,ch);}
    else{
      g.fillStyle='#14143a';g.fillRect(0,0,W,top+4);
      g.fillStyle='#2a2a5a';for(var y=top-RH;y>-RH;y-=RH)g.fillRect(0,y+RH-3,W,2);
      g.save();g.shadowColor='#ff2d78';g.shadowBlur=10;g.fillStyle='#ff2d78';g.fillRect(0,top+2,W,3);g.restore();
    }
  }

  function draw(st,now,ui,dt){
    dt=dt||1/60;
    g.setTransform(1,0,0,1,0,0);g.fillStyle='#050510';g.fillRect(0,0,canvas.width,canvas.height);
    var s=k*dpr,ox=0,oy=0;if(shake>0.3){ox=(Math.random()-0.5)*shake*s;oy=(Math.random()-0.5)*shake*s;shake*=0.86;}else shake=0;
    g.setTransform(s,0,0,s,ox,oy);
    bg(st,ui);
    /* сдвиг поля при новом ряде и при опускании потолка */
    if(slide>0)slide=Math.max(0,slide-dt*5);
    if(press>0)press=Math.max(0,press-dt*5);
    var off=-(slide+press)*RH;
    /* черта */
    var dy=R+B.DANGER*RH-R*0.2,danger=B.depth(st)>=B.DANGER-1;
    g.save();g.setLineDash([8,8]);g.strokeStyle=danger?'rgba(255,51,85,'+(0.6+0.4*Math.sin(now/120))+')':'rgba(255,51,85,.45)';g.lineWidth=2;
    g.beginPath();g.moveTo(0,dy);g.lineTo(W,dy);g.stroke();g.restore();
    ceiling(st.top+off*(press>0?1:0));
    g.save();g.translate(0,off);
    B.each(st,function(b,r,c){drawBall(b,B.cx(st,r,c),B.cy(st,r,c),R-0.5,ui);});
    g.restore();
    /* лопнувшие: вспышка и исчезание */
    for(var i=pops.length-1;i>=0;i--){var p=pops[i];p.t+=dt;if(p.t<0){drawBall(p.b,p.x,p.y,R-0.5,ui);continue;}
      if(!p.bu){p.bu=1;burst(p.x,p.y,p.boom?10:6,p.b.c>=0?COL[p.b.c]:'#ffaa44',p.boom?260:170);}
      var a=1-p.t/0.18;if(a<=0){pops.splice(i,1);continue;}
      g.globalAlpha=a;var sc=1+p.t*2.5;drawBall(p.b,p.x,p.y,R*sc*0.9,ui);
      var pi=IMG.pop;if(pi){g.drawImage(pi,p.x-R*2*sc,p.y-R*2*sc,R*4*sc,R*4*sc);}
      g.globalAlpha=1;}
    /* падающие */
    for(i=falls.length-1;i>=0;i--){var f=falls[i];f.t+=dt;f.vy+=1800*dt;f.x+=f.vx*dt;f.y+=f.vy*dt;
      if(f.x<R||f.x>W-R)f.vx=-f.vx;
      if(f.y>H+R*2){falls.splice(i,1);continue;}
      drawBall(f.b,f.x,f.y,R-0.5,ui);}
    /* прицел */
    if(ui.aim&&!st.over&&!ui.fly){
      var tr=ui.aim;
      g.save();g.strokeStyle='rgba(255,255,255,.55)';g.lineWidth=2.5;g.setLineDash([2,9]);g.lineCap='round';
      g.lineDashOffset=-now/40;
      g.beginPath();g.moveTo(tr.pts[0][0],tr.pts[0][1]);for(var q=1;q<tr.pts.length;q++)g.lineTo(tr.pts[q][0],tr.pts[q][1]);g.stroke();g.restore();
      if(tr.cell&&ui.ghost){g.globalAlpha=0.35;drawBall(st.cur,B.cx(st,tr.cell[0],tr.cell[1]),B.cy(st,tr.cell[0],tr.cell[1]),R-1,ui);g.globalAlpha=1;
        g.strokeStyle='rgba(255,255,255,.7)';g.lineWidth=1.5;g.beginPath();g.arc(B.cx(st,tr.cell[0],tr.cell[1]),B.cy(st,tr.cell[0],tr.cell[1]),R-1,0,Math.PI*2);g.stroke();}
    }
    cannon(st,now,ui);
    /* летящий шар */
    if(ui.fly)drawBall(ui.fly.ball,ui.fly.x,ui.fly.y,R-0.5,ui);
    /* искры */
    for(i=parts.length-1;i>=0;i--){var pt=parts[i];pt.x+=pt.vx*dt;pt.y+=pt.vy*dt;pt.vy+=400*dt;pt.life-=dt*2;if(pt.life<=0){parts.splice(i,1);continue;}
      g.globalAlpha=pt.life;g.fillStyle=pt.col;g.fillRect(pt.x-pt.s/2,pt.y-pt.s/2,pt.s,pt.s);}
    g.globalAlpha=1;
    if(flash>0){g.fillStyle='rgba(255,255,255,'+flash*0.4+')';g.fillRect(0,0,W,H);flash=Math.max(0,flash-dt*2);}
    if(cheer>0)cheer-=dt;
  }

  /* пушка, следующий шар, помощник, шкала особого шара */
  function cannon(st,now,ui){
    var sx=B.SX,sy=B.SY,ang=ui.ang;
    var base=IMG.cannon_base,bar=IMG.cannon_barrel;
    g.save();g.translate(sx,sy);g.rotate(Math.PI/2-ang);
    if(bar){var bh=R*4.2,bw=bh*bar.width/bar.height;g.drawImage(bar,-bw/2,-bh*0.9,bw,bh);}
    else{g.fillStyle='#14204a';g.strokeStyle='#00e5ff';g.lineWidth=2;g.beginPath();g.rect(-R*0.55,-R*2.6,R*1.1,R*2.4);g.fill();g.stroke();
      g.fillStyle='#ff2d78';g.fillRect(-R*0.55,-R*2.2,R*1.1,4);}
    g.restore();
    if(base){var w2=R*7,h2=w2*base.height/base.width;g.drawImage(base,sx-w2/2,sy-h2*0.38,w2,h2);}
    else{g.fillStyle='#0c0c26';g.strokeStyle='#00e5ff';g.lineWidth=2;g.beginPath();g.arc(sx,sy+R*0.4,R*1.6,Math.PI,0);g.closePath();g.fill();g.stroke();}
    if(!ui.fly&&!st.over)drawBall(st.cur,sx,sy,R-0.5,ui);
    /* следующий: справа, по нему можно нажать, чтобы поменять */
    var nx=sx+R*4.4,ny=sy+R*0.4;
    g.fillStyle='rgba(0,0,0,.4)';g.strokeStyle='rgba(0,229,255,.5)';g.lineWidth=1.5;g.beginPath();g.arc(nx,ny,R*0.95,0,Math.PI*2);g.fill();g.stroke();
    if(st.next)drawBall(st.next,nx,ny,R*0.75,ui);
    g.fillStyle='#8fb6c9';g.font='9px "Press Start 2P",monospace';g.textAlign='center';g.fillText('⇄',nx,ny+R*1.65);
    /* шкала особого шара */
    var mx=sx-R*6.4,my=sy+R*1.55,mw=R*3.6,f=Math.min(1,st.meter/B.METER);
    g.fillStyle='rgba(0,0,0,.5)';g.fillRect(mx,my,mw,7);
    var gr=g.createLinearGradient(mx,0,mx+mw,0);gr.addColorStop(0,'#00e5ff');gr.addColorStop(1,'#ff2d78');g.fillStyle=gr;g.fillRect(mx,my,mw*f,7);
    g.strokeStyle='rgba(255,255,255,.4)';g.lineWidth=1;g.strokeRect(mx,my,mw,7);
    /* помощник */
    var hi=IMG[cheer>0?'helper_cheer':'helper_idle'];
    if(hi){var hh=R*3.4,hw=hh*hi.width/hi.height;g.drawImage(hi,mx+mw/2-hw/2,my-hh-1+Math.sin(now/300)*1.5,hw,hh);}
    /* очередь до нового ряда (классика): точки */
    if(ui.dots){g.textAlign='left';for(var d=0;d<ui.dots[1];d++){g.fillStyle=d<ui.dots[0]?'#ff2d78':'rgba(255,255,255,.18)';g.beginPath();g.arc(R*0.9+d*11,R+B.DANGER*RH+R*0.6,3.5,0,Math.PI*2);g.fill();}}
  }

  /* попадание пальцем в «следующий шар» */
  function hitNext(x,y){var nx=B.SX+R*4.4,ny=B.SY+R*0.4;return (x-nx)*(x-nx)+(y-ny)*(y-ny)<(R*1.5)*(R*1.5);}
  return {resize:resize,draw:draw,event:event,hitNext:hitNext,scale:function(){return k;},
    reset:function(){parts=[];pops=[];falls=[];slide=0;press=0;flash=0;cheer=0;shake=0;}};
};
})();
