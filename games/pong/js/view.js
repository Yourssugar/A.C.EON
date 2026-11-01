/* A.C.EON PONG: рисование поля на canvas. Три темы, след мяча, искры, тряска.
   На телефоне в портретной ориентации поле повёрнуто: вы снизу, соперник сверху.

   var v = PongView(canvas)
   v.resize(cssW, cssH, rotated)   размер холста; rotated: поле повёрнуто на 90 градусов
   v.draw(st, now, theme)
   v.event(ev, st, theme)
   v.toField(clientX, clientY)     координаты пальца/мыши в координаты поля
   v.project(x, y)                 точка поля в пиксели внутри холста (для надписей) */
(function(){
'use strict';

var R=window.PongRules,W=R.W,H=R.H;
var THEMES={
  neon: {bg:'#050510',grid:'rgba(0,229,255,.05)',line:'rgba(0,229,255,.35)',wall:'#00e5ff',p:['#00e5ff','#ff2d78'],ball:'#ffffff',glow:true,trail:true,round:true},
  retro:{bg:'#000000',grid:null,line:'#ffffff',wall:'#ffffff',p:['#ffffff','#ffffff'],ball:'#ffffff',glow:false,trail:false,round:false,square:true},
  table:{bg:'#0d5c3c',grid:null,line:'rgba(255,255,255,.85)',wall:'#ffffff',p:['#e8413c','#2b6fd6'],ball:'#ff9a2e',glow:false,trail:true,round:true,table:true}
};
var BONUS_COL={long:'#2ee87a',short:'#ff5a6a',multi:'#b06cff',slow:'#4aa8ff',shield:'#00e5ff',ghost:'#c9c9e8'};

/* значок бонуса: круг с рисунком (общий для поля и меню) */
function bonusIcon(g,t,x,y,r,now){
  var c=BONUS_COL[t]||'#fff';
  g.save();g.translate(x,y);
  g.fillStyle='rgba(0,0,0,.55)';g.beginPath();g.arc(0,0,r,0,Math.PI*2);g.fill();
  g.strokeStyle=c;g.lineWidth=r*0.14;g.beginPath();g.arc(0,0,r*0.88,0,Math.PI*2);g.stroke();
  if(now!=null){g.globalAlpha=0.35+0.25*Math.sin(now/180);g.beginPath();g.arc(0,0,r*1.15,0,Math.PI*2);g.stroke();g.globalAlpha=1;}
  g.fillStyle=c;g.strokeStyle=c;g.lineWidth=r*0.13;g.lineCap='round';
  var k=r*0.42;
  g.beginPath();
  if(t==='long'){g.fillRect(-k*0.25,-k*1.1,k*0.5,k*2.2);g.moveTo(-k*0.6,-k*0.6);g.lineTo(0,-k*1.3);g.lineTo(k*0.6,-k*0.6);g.moveTo(-k*0.6,k*0.6);g.lineTo(0,k*1.3);g.lineTo(k*0.6,k*0.6);g.stroke();}
  else if(t==='short'){g.fillRect(-k*0.25,-k*0.45,k*0.5,k*0.9);g.moveTo(-k*0.6,-k*1.3);g.lineTo(0,-k*0.7);g.lineTo(k*0.6,-k*1.3);g.moveTo(-k*0.6,k*1.3);g.lineTo(0,k*0.7);g.lineTo(k*0.6,k*1.3);g.stroke();}
  else if(t==='multi'){[-1,0,1].forEach(function(i){g.moveTo(i*k*0.8+k*0.32,0);g.arc(i*k*0.8,0,k*0.32,0,Math.PI*2);});g.fill();}
  else if(t==='slow'){g.arc(0,0,k,0,Math.PI*2);g.moveTo(0,0);g.lineTo(0,-k*0.7);g.moveTo(0,0);g.lineTo(k*0.5,k*0.2);g.stroke();}
  else if(t==='shield'){g.moveTo(-k,-k*0.8);g.lineTo(k,-k*0.8);g.lineTo(k*0.8,k*0.3);g.lineTo(0,k*1.1);g.lineTo(-k*0.8,k*0.3);g.closePath();g.stroke();}
  else if(t==='ghost'){g.arc(0,-k*0.1,k*0.8,Math.PI,0);g.lineTo(k*0.8,k*0.9);g.lineTo(k*0.4,k*0.6);g.lineTo(0,k*0.9);g.lineTo(-k*0.4,k*0.6);g.lineTo(-k*0.8,k*0.9);g.closePath();g.fill();
    g.fillStyle='#000';g.beginPath();g.arc(-k*0.3,-k*0.1,k*0.16,0,Math.PI*2);g.arc(k*0.3,-k*0.1,k*0.16,0,Math.PI*2);g.fill();}
  g.restore();
}
function rgba(h,a){var n=parseInt(h.slice(1),16);return 'rgba('+((n>>16)&255)+','+((n>>8)&255)+','+(n&255)+','+a+')';}

window.PongView=function(canvas){
  var g=canvas.getContext('2d'),cw=0,ch=0,k=1,dpr=1,rot=false;
  var parts=[],rings=[],shake=0,flash=0,flashCol='#fff';

  function resize(w,h,rotated){
    rot=!!rotated;cw=w;ch=h;
    dpr=Math.min(2,window.devicePixelRatio||1);
    canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);
    canvas.style.width=w+'px';canvas.style.height=h+'px';
    k=rot?w/H:w/W;
  }
  function project(x,y){return rot?[y*k,(W-x)*k]:[x*k,y*k];}
  function toField(cx,cy){
    var r=canvas.getBoundingClientRect(),px=cx-r.left,py=cy-r.top;
    return rot?{x:W-py/k,y:px/k}:{x:px/k,y:py/k};
  }

  function event(ev,st,theme){
    var T=THEMES[theme]||THEMES.neon;
    if(ev.type==='hit'){
      var col=T.p[ev.side],n=ev.edge?14:8;
      for(var i=0;i<n;i++){var a=(ev.side===0?0:Math.PI)+(Math.random()-0.5)*2.2,s=80+Math.random()*260;
        parts.push({x:ev.x,y:ev.y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life:1,col:col,s:2+Math.random()*3});}
      if(ev.speed>1300)shake=Math.max(shake,4);
    }else if(ev.type==='wall'){
      for(var j=0;j<4;j++)parts.push({x:ev.x,y:ev.y,vx:(Math.random()-0.5)*160,vy:(ev.y<H/2?1:-1)*Math.random()*140,life:0.7,col:T.wall,s:2});
    }else if(ev.type==='point'){
      shake=Math.max(shake,10);flash=1;flashCol=T.p[ev.side];
      rings.push({x:ev.side===0?W:0,y:ev.y,r:140,life:1,col:T.p[ev.side]});
    }else if(ev.type==='bonus'){
      rings.push({x:ev.x,y:ev.y,r:70,life:1,col:BONUS_COL[ev.bonus]||'#fff'});
    }else if(ev.type==='bounce'){
      for(var m=0;m<6;m++)parts.push({x:ev.x,y:ev.y,vx:-Math.random()*220,vy:(Math.random()-0.5)*200,life:0.8,col:T.glow?'#ff2d78':T.wall,s:2+Math.random()*2});
    }else if(ev.type==='miss'){
      shake=Math.max(shake,10);flash=1;flashCol='#ff3355';
    }else if(ev.type==='shieldHit'){
      rings.push({x:ev.side===0?0:W,y:ev.y,r:60,life:1,col:'#00e5ff'});shake=Math.max(shake,5);
    }
  }

  function rr(x,y,w,h,r){r=Math.min(r,w/2,h/2);g.beginPath();g.moveTo(x+r,y);g.arcTo(x+w,y,x+w,y+h,r);g.arcTo(x+w,y+h,x,y+h,r);g.arcTo(x,y+h,x,y,r);g.arcTo(x,y,x+w,y,r);g.closePath();}

  function draw(st,now,theme){
    var T=THEMES[theme]||THEMES.neon,i;
    g.setTransform(1,0,0,1,0,0);
    g.fillStyle=T.bg;g.fillRect(0,0,canvas.width,canvas.height);
    var s=k*dpr,ox=0,oy=0;
    if(shake>0.3){ox=(Math.random()-0.5)*shake*s;oy=(Math.random()-0.5)*shake*s;shake*=0.86;}else shake=0;
    if(rot)g.setTransform(0,-s,s,0,ox,W*s+oy);else g.setTransform(s,0,0,s,ox,oy);
    /* поле */
    if(T.grid){g.strokeStyle=T.grid;g.lineWidth=1;g.beginPath();for(var x=0;x<=W;x+=50){g.moveTo(x,0);g.lineTo(x,H);}for(var y=0;y<=H;y+=50){g.moveTo(0,y);g.lineTo(W,y);}g.stroke();}
    if(T.table){
      g.strokeStyle=T.line;g.lineWidth=4;g.strokeRect(6,6,W-12,H-12);
      g.lineWidth=2;g.beginPath();g.moveTo(6,H/2);g.lineTo(W-6,H/2);g.stroke();
      g.fillStyle='rgba(255,255,255,.9)';g.fillRect(W/2-3,0,6,H);
      g.fillStyle='rgba(0,0,0,.25)';g.fillRect(W/2+3,0,6,H);
    }else if(T.square){
      g.fillStyle=T.line;for(var yy=6;yy<H;yy+=28)g.fillRect(W/2-4,yy,8,16);
    }else{
      g.strokeStyle=T.line;g.lineWidth=3;g.setLineDash([14,14]);g.beginPath();g.moveTo(W/2,0);g.lineTo(W/2,H);g.stroke();g.setLineDash([]);
      g.strokeStyle=rgba('#00e5ff',0.12);g.lineWidth=2;g.beginPath();g.arc(W/2,H/2,70,0,Math.PI*2);g.stroke();
      /* стены сверху и снизу */
      g.fillStyle=T.wall;g.globalAlpha=0.6;g.fillRect(0,0,W,2);g.fillRect(0,H-2,W,2);g.globalAlpha=1;
    }
    /* щиты */
    for(i=0;i<2;i++)if(st.shield[i]){
      var sx=i===0?2:W-6;
      g.fillStyle=rgba('#00e5ff',0.5+0.3*Math.sin(now/150));g.fillRect(sx,0,4,H);
    }
    /* бонусы на поле */
    st.bonuses.forEach(function(o){var a=Math.min(1,o.life*2);g.globalAlpha=a;bonusIcon(g,o.t,o.x,o.y,o.r,now);g.globalAlpha=1;});
    /* сквош: справа стена */
    if(st.mode==='squash'){
      var wx=W-R.WALL;
      if(T.square){g.fillStyle='#fff';g.fillRect(wx,0,R.WALL,H);}
      else{
        g.fillStyle=T.table?'#8a5a3a':'#1a1240';g.fillRect(wx,0,R.WALL,H);
        g.fillStyle=T.table?'rgba(0,0,0,.25)':'rgba(255,45,120,.35)';
        for(var by=0;by<H;by+=24){g.fillRect(wx,by,R.WALL,2);g.fillRect(wx+((by/24)%2?R.WALL/2:0),by,2,24);}
        g.save();if(T.glow){g.shadowColor='#ff2d78';g.shadowBlur=16;}g.fillStyle=T.glow?'#ff2d78':T.wall;g.fillRect(wx-2,0,3,H);g.restore();
      }
    }
    /* ракетки (у близнецов вторая ракетка pad2) */
    var pads=st.mode==='squash'?[st.pad[0]]:st.pad2?[st.pad[0],st.pad[1],st.pad2]:st.pad;
    for(i=0;i<pads.length;i++){
      var p=pads[i],side=i===0?0:1,px=p.x,py=p.y-p.h/2,col=side===1&&st.mode==='tour'&&!T.square&&R.OPP[st.opp]?R.OPP[st.opp].color:T.p[side];
      g.save();
      if(T.glow){g.shadowColor=col;g.shadowBlur=18;}
      g.fillStyle=col;
      if(T.round)rr(px,py,R.PAD_W,p.h,6),g.fill();else g.fillRect(px,py,R.PAD_W,p.h);
      g.restore();
      if(T.glow){g.fillStyle='rgba(255,255,255,.5)';g.fillRect(px+4,py+6,3,p.h-12);}
      if(T.table){g.fillStyle='rgba(0,0,0,.25)';g.fillRect(px+R.PAD_W-4,py+4,3,p.h-8);}
    }
    /* мячи */
    st.balls.forEach(function(b){
      var ghost=false;
      for(var side=0;side<2;side++)if(st.fx[side].ghost>0&&(side===0?b.x<W/2:b.x>W/2))ghost=true;
      var alpha=ghost?0.08+0.1*(Math.sin(now/60)>0.7?1:0):1;
      var col=T.ball,oc=T.p[b.owner]||T.ball;
      if(T.trail&&b.trail&&!ghost){
        for(var q=0;q<b.trail.length;q+=2){var a=q/b.trail.length;g.fillStyle=rgba(T.glow?oc:'#ffffff',a*0.35);
          g.beginPath();g.arc(b.trail[q],b.trail[q+1],R.BALL_R*(0.3+a*0.6),0,Math.PI*2);g.fill();}
      }
      g.globalAlpha=alpha;
      g.save();
      if(T.glow){g.shadowColor=oc;g.shadowBlur=20;}
      g.fillStyle=col;
      if(T.square)g.fillRect(b.x-R.BALL_R,b.y-R.BALL_R,R.BALL_R*2,R.BALL_R*2);
      else{g.beginPath();g.arc(b.x,b.y,R.BALL_R,0,Math.PI*2);g.fill();}
      g.restore();
      /* подкрутка: полоска вращения */
      if(Math.abs(b.spin)>200&&!ghost&&!T.square){g.strokeStyle=rgba('#ffd23a',Math.min(1,Math.abs(b.spin)/900));g.lineWidth=2;
        g.beginPath();g.arc(b.x,b.y,R.BALL_R+4,now/(b.spin>0?60:-60),now/(b.spin>0?60:-60)+Math.PI*1.2);g.stroke();}
      g.globalAlpha=1;
    });
    /* частицы и кольца */
    var dt=1/60;
    for(i=parts.length-1;i>=0;i--){var pt=parts[i];pt.x+=pt.vx*dt;pt.y+=pt.vy*dt;pt.vx*=0.96;pt.vy*=0.96;pt.life-=dt*2;
      if(pt.life<=0){parts.splice(i,1);continue;}g.globalAlpha=pt.life;g.fillStyle=pt.col;g.fillRect(pt.x-pt.s/2,pt.y-pt.s/2,pt.s,pt.s);}
    g.globalAlpha=1;
    for(i=rings.length-1;i>=0;i--){var o=rings[i];o.life-=dt*2;if(o.life<=0){rings.splice(i,1);continue;}
      g.strokeStyle=rgba(o.col,o.life);g.lineWidth=3*o.life+1;g.beginPath();g.arc(o.x,o.y,o.r*(1-o.life*0.7),0,Math.PI*2);g.stroke();}
    if(flash>0){g.setTransform(1,0,0,1,0,0);g.fillStyle=rgba(flashCol,flash*0.18);g.fillRect(0,0,canvas.width,canvas.height);flash=Math.max(0,flash-0.05);}
    g.setTransform(1,0,0,1,0,0);
  }

  return {resize:resize,draw:draw,event:event,toField:toField,project:project};
};
window.PongView.icon=bonusIcon;
window.PongView.THEMES=THEMES;
window.PongView.BONUS_COL=BONUS_COL;
})();
