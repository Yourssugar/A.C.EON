/* A.C.EON BREAKOUT: плоское поле на canvas. Темы, кирпичи, бонусы, эффекты.

   BkTheme.brick(theme, big, b)   цвет кирпича
   BkIcon(g, type, x, y, s)       значок бонуса (общий для 2D, 3D-спрайтов и панели)
   var v = BkView2D(canvas)
   v.resize(scale)       масштаб: пикселей на единицу поля (поле 600 x 800)
   v.draw(st, now, set)  set: {theme, big}
   v.event(ev, st, set)  искры, взрывы, надписи очков, тряска */
(function(){
'use strict';

var R=window.BkRules,W=R.W,H=R.H;

var THEMES={
  neon: {bg:['#070b1c','#0b0420'],grid:'rgba(0,229,255,.05)',hp:['#2ad6c8','#ffb02e','#ff5a6a'],steel:'#8a94a8',X:'#ff2d78',M:'#8c6cff',R:'#2ee87a',K:'#ffd23a',G:'#46557a',D:'#b07a44',gold:'#ffd700',pad:['#9af3ea','#16b3a6'],ball:'#eafcff',glow:'#2ad6c8'},
  retro:{bg:['#000000','#000000'],grid:'rgba(255,255,255,.03)',hp:['#48b848','#d8c838','#d84848'],steel:'#9c9c9c',X:'#e05ad8',M:'#5a78f0',R:'#38d8c8',K:'#f0f0f0',G:'#606060',D:'#a86030',gold:'#f8d838',pad:['#e86048','#a83018'],ball:'#ffffff',glow:'#ffffff'},
  space:{bg:['#05030f','#0c0626'],grid:'rgba(255,255,255,.0)',hp:['#7fd6ff','#c69bff','#ff8ad8'],steel:'#a8b0c8',X:'#ff6a3a',M:'#5ae0ff',R:'#7dffb0',K:'#ffe27a',G:'#5a5f88',D:'#c09060',gold:'#ffe27a',pad:['#e4dcff','#8a6cff'],ball:'#ffffff',glow:'#c69bff'},
  big:  {bg:['#000000','#000000'],grid:'rgba(255,255,255,.06)',hp:['#00e5ff','#ffe600','#ff3030'],steel:'#bbbbbb',X:'#ff40c0',M:'#7a6cff',R:'#2ee84a',K:'#ffffff',G:'#777777',D:'#ff8c00',gold:'#ffd700',pad:['#ffffff','#bbbbbb'],ball:'#ffffff',glow:'#ffffff'}
};
function th(set){return set.big?THEMES.big:(THEMES[set.theme]||THEMES.neon);}
function brickColor(T,b){
  if(b.t==='n')return T.hp[Math.max(0,Math.min(2,b.hp-1))];
  if(b.t==='S')return T.steel;if(b.t==='$')return T.gold;
  if(b.t==='R')return T.R;if(b.t==='M')return T.M;
  return T[b.t]||'#888';
}
var BONUS_COL={laser:'#ff4a4a',sticky:'#5ad1ff',fire:'#ff8a1a',multi:'#b06cff',wide:'#2ee87a',slow:'#4aa8ff',shield:'#00e5ff',magnet:'#ff5ad8',life:'#ff3a7a',
  narrow:'#7a7a7a',fast:'#d85030',fog:'#5a5a78'};
window.BkTheme={get:th,brick:function(theme,big,b){return brickColor(th({theme:theme,big:big}),b);},bonus:BONUS_COL};

/* значок бонуса: капсула с рисунком внутри */
function icon(g,t,x,y,s){
  var c=BONUS_COL[t]||'#888',bad=R.BAD.indexOf(t)>=0;
  g.save();g.translate(x,y);
  g.fillStyle=c;g.strokeStyle=bad?'#000':'#fff';g.lineWidth=s*0.08;
  rr(g,-s*0.75,-s*0.42,s*1.5,s*0.84,s*0.42);g.fill();g.stroke();
  g.fillStyle='#fff';g.strokeStyle='#fff';g.lineWidth=s*0.1;g.lineCap='round';
  var k=s*0.26;
  g.beginPath();
  if(t==='laser'){g.moveTo(-k,-k);g.lineTo(-k,k);g.moveTo(k,-k);g.lineTo(k,k);g.stroke();}
  else if(t==='sticky'){g.arc(0,k*0.2,k*0.7,0,Math.PI*2);g.fill();g.beginPath();g.moveTo(-k*0.4,-k*0.2);g.lineTo(0,-k*1.1);g.lineTo(k*0.4,-k*0.2);g.fill();}
  else if(t==='fire'){g.moveTo(0,-k*1.2);g.quadraticCurveTo(k*1.1,0,0,k*1.1);g.quadraticCurveTo(-k*1.1,0,0,-k*1.2);g.fill();}
  else if(t==='multi'){[-1,0,1].forEach(function(i){g.moveTo(i*k+k*0.35,0);g.arc(i*k,0,k*0.35,0,Math.PI*2);});g.fill();}
  else if(t==='wide'||t==='narrow'){
    /* широкая: стрелки наружу, узкая: внутрь */
    var e=k*1.3;
    g.moveTo(-e,0);g.lineTo(e,0);
    if(t==='wide'){g.moveTo(-e+k*0.6,-k*0.6);g.lineTo(-e,0);g.lineTo(-e+k*0.6,k*0.6);g.moveTo(e-k*0.6,-k*0.6);g.lineTo(e,0);g.lineTo(e-k*0.6,k*0.6);}
    else{g.moveTo(-e,-k*0.6);g.lineTo(-e+k*0.6,0);g.lineTo(-e,k*0.6);g.moveTo(e,-k*0.6);g.lineTo(e-k*0.6,0);g.lineTo(e,k*0.6);}
    g.stroke();}
  else if(t==='slow'){g.arc(0,0,k*0.9,0,Math.PI*2);g.moveTo(0,0);g.lineTo(0,-k*0.6);g.moveTo(0,0);g.lineTo(k*0.5,0);g.stroke();}
  else if(t==='fast'){g.moveTo(-k,-k*0.7);g.lineTo(0,0);g.lineTo(-k,k*0.7);g.moveTo(0,-k*0.7);g.lineTo(k,0);g.lineTo(0,k*0.7);g.stroke();}
  else if(t==='shield'){g.moveTo(-k*1.2,k*0.5);g.lineTo(k*1.2,k*0.5);g.moveTo(-k*1.2,-k*0.2);g.lineTo(k*1.2,-k*0.2);g.stroke();}
  else if(t==='magnet'){g.arc(0,0,k*0.8,Math.PI,0,true);g.moveTo(-k*0.8,0);g.lineTo(-k*0.8,-k*0.8);g.moveTo(k*0.8,0);g.lineTo(k*0.8,-k*0.8);g.stroke();}
  else if(t==='life'){g.moveTo(0,k*0.9);g.bezierCurveTo(-k*1.4,-k*0.1,-k*0.6,-k*1.2,0,-k*0.4);g.bezierCurveTo(k*0.6,-k*1.2,k*1.4,-k*0.1,0,k*0.9);g.fill();}
  else if(t==='fog'){g.arc(-k*0.5,k*0.1,k*0.5,0,Math.PI*2);g.arc(k*0.3,-k*0.1,k*0.65,0,Math.PI*2);g.arc(k*0.8,k*0.25,k*0.4,0,Math.PI*2);g.fill();}
  g.restore();
}
window.BkIcon=icon;
var BOSS_COL=['#ff5a6a','#ffb02e','#b06cff'];
window.BkTheme.boss=BOSS_COL;

function rr(g,x,y,w,h,r){r=Math.min(r,w/2,h/2);g.beginPath();g.moveTo(x+r,y);g.arcTo(x+w,y,x+w,y+h,r);g.arcTo(x+w,y+h,x,y+h,r);g.arcTo(x,y+h,x,y,r);g.arcTo(x,y,x+w,y,r);g.closePath();}
function hex2rgb(h){var n=parseInt(h.slice(1),16);return [(n>>16)&255,(n>>8)&255,n&255];}
function shade(h,q){var c=hex2rgb(h);return 'rgb('+c.map(function(v){return Math.round(q>0?v+(255-v)*q:v*(1+q));}).join(',')+')';}
function rgba(h,a){var c=hex2rgb(h);return 'rgba('+c[0]+','+c[1]+','+c[2]+','+a+')';}

/* звёздное небо для темы «космос»: рисуется один раз */
var starCache=null;
function stars(){
  if(starCache)return starCache;
  var cv=document.createElement('canvas');cv.width=W;cv.height=H;
  var g=cv.getContext('2d');
  var gr=g.createLinearGradient(0,0,0,H);gr.addColorStop(0,'#05030f');gr.addColorStop(1,'#0c0626');
  g.fillStyle=gr;g.fillRect(0,0,W,H);
  [[140,220,260,'rgba(140,60,220,.22)'],[470,520,300,'rgba(40,120,220,.18)'],[320,90,180,'rgba(220,60,140,.14)']].forEach(function(n){
    var rg=g.createRadialGradient(n[0],n[1],0,n[0],n[1],n[2]);rg.addColorStop(0,n[3]);rg.addColorStop(1,'rgba(0,0,0,0)');
    g.fillStyle=rg;g.fillRect(0,0,W,H);
  });
  var r=BkLevels.rng(42);
  for(var i=0;i<260;i++){var s=r()<0.1?1.8:r()*1.1+0.3;g.fillStyle='rgba(255,255,255,'+(0.3+r()*0.7)+')';g.fillRect(r()*W,r()*H,s,s);}
  starCache=cv;return cv;
}

window.BkView2D=function(canvas){
  var g=canvas.getContext('2d'),scale=1,dpr=1;
  var parts=[],rings=[],pops=[],shake=0,flash=0;

  function resize(sc){
    scale=sc;dpr=Math.min(2,window.devicePixelRatio||1);
    canvas.width=Math.round(W*sc*dpr);canvas.height=Math.round(H*sc*dpr);
    canvas.style.width=Math.round(W*sc)+'px';canvas.style.height=Math.round(H*sc)+'px';
  }
  function event(ev,st,set){
    var T=th(set);
    if(ev.type==='break'){
      var col=ev.t==='n'?T.hp[Math.max(0,ev.max-1)]:brickColor(T,{t:ev.t,hp:1});
      for(var i=0;i<10;i++){var a=Math.random()*Math.PI*2,s=60+Math.random()*180;
        parts.push({x:ev.x,y:ev.y,vx:Math.cos(a)*s,vy:Math.sin(a)*s-80,life:1,col:col,s:3+Math.random()*4});}
      if(ev.m>1||ev.pts>=50)pops.push({x:ev.x,y:ev.y,txt:'+'+ev.pts,life:1,col:ev.m>1?'#ffd23a':'#ffffff'});
    }else if(ev.type==='explode'){rings.push({x:ev.x,y:ev.y,life:1,r:90,col:'#ff7a3a'});shake=Math.max(shake,10);}
    else if(ev.type==='portal'){rings.push({x:ev.x,y:ev.y,life:1,r:30,col:'#c69bff'});}
    else if(ev.type==='lost'){flash=1;shake=Math.max(shake,8);}
    else if(ev.type==='ouch'){shake=Math.max(shake,6);rings.push({x:ev.x,y:st.paddle.y,life:1,r:50,col:'#b07a44'});}
    else if(ev.type==='shield'){rings.push({x:W/2,y:H-6,life:1,r:300,col:'#00e5ff'});}
    else if(ev.type==='gates'){shake=Math.max(shake,5);}
    else if(ev.type==='descend'){shake=Math.max(shake,4);}
    else if(ev.type==='bossHit'){
      var bc=BOSS_COL[st.boss?st.boss.kind:0];
      for(var j=0;j<8;j++){var a2=Math.random()*Math.PI*2,s2=80+Math.random()*160;
        parts.push({x:ev.x+(Math.random()-.5)*60,y:ev.y+(Math.random()-.5)*30,vx:Math.cos(a2)*s2,vy:Math.sin(a2)*s2-60,life:1,col:j%2?bc:'#ffffff',s:3+Math.random()*3});}
      shake=Math.max(shake,3);
    }
    else if(ev.type==='bossDown'){
      var bc2=BOSS_COL[st.boss?st.boss.kind:0];
      for(var q=0;q<5;q++)rings.push({x:ev.x+(Math.random()-.5)*80,y:ev.y+(Math.random()-.5)*40,life:1+q*0.15,r:80+q*40,col:q%2?'#ffd23a':bc2});
      for(var m=0;m<40;m++){var a3=Math.random()*Math.PI*2,s3=100+Math.random()*300;
        parts.push({x:ev.x,y:ev.y,vx:Math.cos(a3)*s3,vy:Math.sin(a3)*s3-100,life:1.4,col:m%3?bc2:'#ffffff',s:4+Math.random()*5});}
      shake=Math.max(shake,16);flash=0.6;
    }
    else if(ev.type==='zap'){shake=Math.max(shake,7);rings.push({x:ev.x,y:st.paddle.y,life:1,r:60,col:'#ff3355'});}
    else if(ev.type==='bossShield'&&st.boss){rings.push({x:st.boss.x+st.boss.w/2,y:st.boss.y+st.boss.h/2,life:1,r:120,col:'#00e5ff'});}
    else if(ev.type==='gatesUp'){shake=Math.max(shake,4);}
  }

  function drawBrick(T,b,set,now){
    var col=brickColor(T,b),x=b.x,y=b.y,w=b.w,h=b.h,retro=!set.big&&set.theme==='retro',space=!set.big&&set.theme==='space';
    if(b.t==='P'||b.t==='Q'){
      /* портал: вращающиеся кольца */
      var pc=b.t==='P'?'#00e5ff':'#ff2d78',cx=x+w/2,cy=y+h/2;
      for(var i=0;i<3;i++){
        g.strokeStyle=rgba(pc,0.9-i*0.25);g.lineWidth=2;
        g.beginPath();g.ellipse(cx,cy,w*0.48-i*5,h*0.75-i*2,0,now/300+i*2,now/300+i*2+Math.PI*1.4);g.stroke();
      }
      g.fillStyle=rgba(pc,0.25);g.beginPath();g.ellipse(cx,cy,w*0.3,h*0.4,0,0,Math.PI*2);g.fill();
      return;
    }
    if(retro){g.fillStyle=col;g.fillRect(x,y,w,h);g.fillStyle='rgba(0,0,0,.35)';g.fillRect(x,y+h-3,w,3);}
    else if(set.big){g.fillStyle='#000';g.fillRect(x-1,y-1,w+2,h+2);g.fillStyle=col;g.fillRect(x+2,y+2,w-4,h-4);}
    else{
      var gr=g.createLinearGradient(0,y,0,y+h);
      gr.addColorStop(0,shade(col,space?0.45:0.3));gr.addColorStop(0.5,col);gr.addColorStop(1,shade(col,-0.35));
      rr(g,x,y,w,h,space?7:4);g.fillStyle=gr;g.fill();
      if(space){g.strokeStyle=rgba('#ffffff',0.35);g.lineWidth=1;g.stroke();}
      g.fillStyle='rgba(255,255,255,.25)';g.fillRect(x+4,y+3,w-8,2);
    }
    /* знаки типов */
    var cx2=x+w/2,cy2=y+h/2,ink=set.big?'#000':'rgba(0,0,0,.55)';
    if(b.t==='S'){g.fillStyle='rgba(255,255,255,.5)';[[6,5],[w-8,5],[6,h-7],[w-8,h-7]].forEach(function(p){g.fillRect(x+p[0],y+p[1],2,2);});}
    else if(b.t==='X'){g.fillStyle=ink;g.beginPath();g.arc(cx2,cy2+1,5,0,Math.PI*2);g.fill();g.strokeStyle=ink;g.lineWidth=2;g.beginPath();g.moveTo(cx2+3,cy2-3);g.lineTo(cx2+6,cy2-7);g.stroke();
      g.fillStyle=Math.sin(now/90)>0?'#fff':'#ffd23a';g.fillRect(cx2+5,cy2-9,3,3);}
    else if(b.t==='M'){g.fillStyle=ink;g.beginPath();var d=b.vx>0?1:-1;g.moveTo(cx2+6*d,cy2);g.lineTo(cx2-3*d,cy2-5);g.lineTo(cx2-3*d,cy2+5);g.fill();}
    else if(b.t==='R'){g.strokeStyle=ink;g.lineWidth=2;g.beginPath();g.arc(cx2,cy2,5,0.4,Math.PI*1.7);g.stroke();
      if(b.hp<b.max){g.fillStyle='rgba(255,255,255,'+(0.2+0.25*Math.sin(now/150))+')';g.fillRect(x,y,w*(b.regen/4),h);}}
    else if(b.t==='K'){g.fillStyle=ink;g.beginPath();g.arc(cx2-5,cy2,4,0,Math.PI*2);g.fill();g.fillRect(cx2-2,cy2-1.5,10,3);g.fillRect(cx2+4,cy2,2,4);}
    else if(b.t==='G'){g.fillStyle='rgba(0,0,0,.45)';for(var k=6;k<w-4;k+=8)g.fillRect(x+k,y+2,3,h-4);}
    else if(b.t==='D'){g.strokeStyle=ink;g.lineWidth=1.5;g.beginPath();g.moveTo(x+6,y+4);g.lineTo(x+16,y+12);g.lineTo(x+12,y+h-3);g.moveTo(x+16,y+12);g.lineTo(x+w-8,y+7);g.stroke();}
    else if(b.t==='$'){g.fillStyle='rgba(255,255,255,'+(0.35+0.3*Math.sin(now/200+b.id))+')';g.beginPath();g.moveTo(cx2,cy2-7);g.lineTo(cx2+4,cy2);g.lineTo(cx2,cy2+7);g.lineTo(cx2-4,cy2);g.fill();}
    /* трещины на повреждённом */
    if(b.t==='n'&&b.hp<b.max||b.t==='M'&&b.hp<b.max){g.strokeStyle='rgba(0,0,0,.45)';g.lineWidth=1.2;g.beginPath();g.moveTo(x+w*0.3,y+2);g.lineTo(x+w*0.5,y+h-3);g.lineTo(x+w*0.68,y+4);g.stroke();}
  }

  /* босс: корпус по виду, глаза смотрят на мяч, вспышка от удара, щит, злость */
  function drawBoss(st,now,set){
    var b=st.boss;if(!b)return;
    var x=b.x,y=b.y,w=b.w,h=b.h,cx=x+w/2,cy=y+h/2,col=BOSS_COL[b.kind],angry=b.hp<=b.max/2,big=set.big;
    if(b.dead){
      /* распад: мигает и сжимается */
      if(Math.floor(now/60)%2)return;
      var q=Math.max(0.1,b.deadT/1.3);
      g.save();g.translate(cx,cy);g.scale(q,q);g.translate(-cx,-cy);
    }else g.save();
    if(angry)col=Math.sin(now/120)>0?col:'#ff3355';
    if(!big&&set.theme!=='retro'){g.shadowColor=col;g.shadowBlur=angry?26:16;}
    var gr=g.createLinearGradient(0,y,0,y+h);gr.addColorStop(0,shade(col,0.35));gr.addColorStop(0.55,col);gr.addColorStop(1,shade(col,-0.45));
    g.fillStyle=big?col:gr;
    if(b.kind===0){
      /* «Страж»: бронированный щит с пушкой снизу */
      g.beginPath();g.moveTo(x+14,y);g.lineTo(x+w-14,y);g.lineTo(x+w,y+h*0.45);g.lineTo(x+w-26,y+h);g.lineTo(x+26,y+h);g.lineTo(x,y+h*0.45);g.closePath();g.fill();
      g.shadowBlur=0;
      g.fillStyle='rgba(0,0,0,.4)';g.fillRect(cx-9,y+h-4,18,10);
      g.fillStyle='rgba(255,255,255,.25)';g.fillRect(x+20,y+5,w-40,3);
      g.fillStyle='rgba(0,0,0,.3)';for(var r=0;r<5;r++)g.fillRect(x+22+r*(w-44)/4-2,y+h*0.62,4,4);
    }else if(b.kind===1){
      /* «Механик»: шестерня с зубцами, крутится */
      var R0=h*0.52,rot=now/(angry?260:420);
      g.save();g.translate(cx,cy);g.rotate(rot);
      g.beginPath();for(var i=0;i<12;i++){var a=i/12*Math.PI*2;g.rect(Math.cos(a)*R0-7,Math.sin(a)*R0-7,14,14);}
      g.fill();g.restore();
      rr(g,x+10,y+6,w-20,h-12,14);g.fillStyle=big?col:gr;g.fill();
      g.shadowBlur=0;
      g.fillStyle='rgba(0,0,0,.35)';g.fillRect(x+18,y+h-14,w-36,4);
      g.fillStyle='rgba(255,255,255,.25)';g.fillRect(x+22,y+10,w-44,3);
    }else{
      /* «Ядро бури»: светящийся шар в кольцах с молниями */
      var R1=Math.min(w,h)*0.46;
      var rg=g.createRadialGradient(cx-R1*0.3,cy-R1*0.3,2,cx,cy,R1);rg.addColorStop(0,'#ffffff');rg.addColorStop(0.35,col);rg.addColorStop(1,shade(col,-0.5));
      g.fillStyle=big?col:rg;g.beginPath();g.arc(cx,cy,R1,0,Math.PI*2);g.fill();
      g.shadowBlur=0;
      g.strokeStyle=rgba('#ffffff',0.7);g.lineWidth=2;
      for(var k=0;k<2;k++){g.beginPath();g.ellipse(cx,cy,w*0.5,h*0.18,(k?1:-1)*0.35+now/900,0,Math.PI*2);g.stroke();}
      if(Math.random()<0.25){g.strokeStyle='#ffffff';g.lineWidth=1.5;g.beginPath();var lx=cx,ly=cy;g.moveTo(lx,ly);
        var la=Math.random()*Math.PI*2;for(var n=0;n<4;n++){lx+=Math.cos(la)*14+(Math.random()-.5)*12;ly+=Math.sin(la)*14+(Math.random()-.5)*12;g.lineTo(lx,ly);}g.stroke();}
    }
    /* глаза */
    var ball=st.balls[0],tx=ball?ball.x:st.paddle.x,ty=ball?ball.y:st.paddle.y;
    var eyes=b.kind===1?[[cx,cy]]:b.kind===0?[[cx-w*0.17,y+h*0.42],[cx+w*0.17,y+h*0.42]]:[[cx-10,cy],[cx+10,cy]];
    var er=b.kind===1?13:b.kind===0?9:6;
    eyes.forEach(function(e){
      g.fillStyle=big?'#ffffff':'#f4f6ff';g.beginPath();g.arc(e[0],e[1],er,0,Math.PI*2);g.fill();
      if(big){g.strokeStyle='#000';g.lineWidth=2;g.stroke();}
      var dx=tx-e[0],dy=ty-e[1],l=Math.sqrt(dx*dx+dy*dy)||1;
      g.fillStyle=angry?'#d0002a':'#10131f';g.beginPath();g.arc(e[0]+dx/l*er*0.45,e[1]+dy/l*er*0.45,er*0.5,0,Math.PI*2);g.fill();
      if(angry){g.strokeStyle='#10131f';g.lineWidth=3;g.beginPath();var sd=e[0]<cx?1:-1;g.moveTo(e[0]-er*sd,e[1]-er-4);g.lineTo(e[0]+er*sd*0.8,e[1]-er+2);g.stroke();}
    });
    if(big){g.strokeStyle='#000';g.lineWidth=3;g.strokeRect(x,y,w,h);}
    /* вспышка от удара */
    if(b.flash>0){g.globalAlpha=Math.min(1,b.flash*6);g.fillStyle='#ffffff';rr(g,x,y,w,h,12);g.fill();g.globalAlpha=1;}
    /* щит */
    if(b.inv>0){
      g.strokeStyle=rgba('#00e5ff',0.6+0.3*Math.sin(now/70));g.lineWidth=4;g.setLineDash([10,6]);g.lineDashOffset=-now/30;
      g.beginPath();g.ellipse(cx,cy,w*0.62,h*0.85,0,0,Math.PI*2);g.stroke();g.setLineDash([]);
      g.fillStyle=rgba('#00e5ff',0.12);g.fill();
    }
    g.restore();
  }
  function drawShots(st,set){
    if(!st.shots||!st.shots.length)return;
    g.save();
    st.shots.forEach(function(s){
      if(!set.big){g.shadowColor='#ff3355';g.shadowBlur=14;}
      g.fillStyle='#ff3355';g.beginPath();g.arc(s.x,s.y,set.big?9:7,0,Math.PI*2);g.fill();
      g.shadowBlur=0;g.fillStyle='#ffd0d8';g.beginPath();g.arc(s.x,s.y,3,0,Math.PI*2);g.fill();
      if(set.big){g.strokeStyle='#fff';g.lineWidth=2;g.beginPath();g.arc(s.x,s.y,9,0,Math.PI*2);g.stroke();}
    });
    g.restore();
  }

  function draw(st,now,set){
    var T=th(set),p=st.paddle;
    g.setTransform(1,0,0,1,0,0);
    var k=scale*dpr,ox=0,oy=0;
    if(shake>0.3){ox=(Math.random()-.5)*shake*k;oy=(Math.random()-.5)*shake*k;shake*=0.88;}else shake=0;
    g.setTransform(k,0,0,k,ox,oy);
    /* фон */
    if(!set.big&&set.theme==='space')g.drawImage(stars(),0,0);
    else{var gr=g.createLinearGradient(0,0,0,H);gr.addColorStop(0,T.bg[0]);gr.addColorStop(1,T.bg[1]);g.fillStyle=gr;g.fillRect(-20,-20,W+40,H+40);}
    if(T.grid!=='rgba(255,255,255,.0)'){g.strokeStyle=T.grid;g.lineWidth=1;g.beginPath();for(var x=0;x<=W;x+=50){g.moveTo(x,0);g.lineTo(x,H);}for(var y=0;y<=H;y+=50){g.moveTo(0,y);g.lineTo(W,y);}g.stroke();}
    /* линия опасности в режиме «На время» */
    if(st.mode==='time'){g.strokeStyle='rgba(255,51,68,.35)';g.setLineDash([8,8]);g.beginPath();g.moveTo(0,p.y-40);g.lineTo(W,p.y-40);g.stroke();g.setLineDash([]);}
    /* кирпичи */
    st.bricks.forEach(function(b){if(b.alive)drawBrick(T,b,set,now);});
    /* обломки */
    st.debris.forEach(function(e){
      g.save();g.translate(e.x+e.w/2,e.y+e.h/2);g.rotate(e.rot);
      g.fillStyle=T.D;g.fillRect(-e.w/2,-e.h/2,e.w,e.h);
      g.strokeStyle='rgba(0,0,0,.5)';g.lineWidth=2;g.strokeRect(-e.w/2,-e.h/2,e.w,e.h);
      g.restore();
    });
    drawBoss(st,now,set);
    drawShots(st,set);
    /* бонусы */
    st.drops.forEach(function(d){icon(g,d.t,d.x,d.y,set.big?30:22);});
    /* лазеры */
    g.fillStyle='#ff4a4a';
    st.lasers.forEach(function(L){g.fillRect(L.x-1.5,L.y-14,3,14);});
    /* щит */
    if(st.shield){g.fillStyle=rgba('#00e5ff',0.5+0.3*Math.sin(now/180));g.fillRect(0,H-8,W,4);}
    /* ракетка */
    var pw=p.w,px=p.x-pw/2;
    g.save();
    if(st.stun>0&&Math.floor(now/50)%2)g.globalAlpha=0.4;
    if(!set.big&&set.theme!=='retro'){g.shadowColor=T.glow;g.shadowBlur=14;}
    var pg=g.createLinearGradient(0,p.y,0,p.y+p.h);pg.addColorStop(0,T.pad[0]);pg.addColorStop(1,T.pad[1]);
    if(set.theme==='retro'&&!set.big){g.fillStyle=T.pad[0];g.fillRect(px,p.y,pw,p.h);}
    else{rr(g,px,p.y,pw,p.h,7);g.fillStyle=pg;g.fill();}
    g.restore();
    if(set.big){g.strokeStyle='#000';g.lineWidth=2;g.strokeRect(px,p.y,pw,p.h);}
    if(st.fx.laser>0){g.fillStyle='#ff4a4a';g.fillRect(px+4,p.y-6,6,6);g.fillRect(px+pw-10,p.y-6,6,6);}
    if(st.fx.sticky>0){g.fillStyle='rgba(90,209,255,.7)';g.fillRect(px+6,p.y-2,pw-12,3);}
    /* мячи со следом */
    var fire=st.fx.fire>0;
    st.balls.forEach(function(b){
      if(!b.trail)b.trail=[];
      b.trail.push(b.x,b.y);if(b.trail.length>16)b.trail.splice(0,2);
      for(var i=0;i<b.trail.length;i+=2){
        var a=i/b.trail.length;
        g.fillStyle=fire?'rgba(255,140,30,'+a*0.6+')':rgba(T.ball,a*0.35);
        g.beginPath();g.arc(b.trail[i],b.trail[i+1],b.r*(0.4+a*0.5),0,Math.PI*2);g.fill();
      }
      g.save();
      if(!set.big){g.shadowColor=fire?'#ff8a1a':T.glow;g.shadowBlur=fire?20:12;}
      g.fillStyle=fire?'#ffd08a':T.ball;
      g.beginPath();g.arc(b.x,b.y,b.r*(set.big?1.35:1),0,Math.PI*2);g.fill();
      g.restore();
      if(set.big){g.strokeStyle='#000';g.lineWidth=2;g.stroke();}
    });
    /* частицы, кольца, очки */
    var dt=1/60;
    for(var i=parts.length-1;i>=0;i--){var q=parts[i];q.x+=q.vx*dt;q.y+=q.vy*dt;q.vy+=500*dt;q.life-=dt*1.6;
      if(q.life<=0){parts.splice(i,1);continue;}g.globalAlpha=q.life;g.fillStyle=q.col;g.fillRect(q.x-q.s/2,q.y-q.s/2,q.s,q.s);}
    g.globalAlpha=1;
    for(i=rings.length-1;i>=0;i--){var o=rings[i];o.life-=dt*2.2;if(o.life<=0){rings.splice(i,1);continue;}
      g.strokeStyle=rgba(o.col,Math.min(1,o.life));g.lineWidth=4*o.life+1;g.beginPath();g.arc(o.x,o.y,Math.max(1,o.r*(1-Math.min(1,o.life)*0.7)),0,Math.PI*2);g.stroke();}
    g.textAlign='center';g.font=(set.big?20:14)+'px "Press Start 2P",monospace';
    for(i=pops.length-1;i>=0;i--){var pp=pops[i];pp.life-=dt*1.1;pp.y-=dt*40;if(pp.life<=0){pops.splice(i,1);continue;}
      g.globalAlpha=Math.min(1,pp.life*1.5);g.fillStyle='#000';g.fillText(pp.txt,pp.x+2,pp.y+2);g.fillStyle=pp.col;g.fillText(pp.txt,pp.x,pp.y);}
    g.globalAlpha=1;
    /* туман: темно везде, кроме кругов вокруг мячей и ракетки */
    if(st.fx.fog>0){
      g.save();
      g.fillStyle='rgba(0,0,0,'+Math.min(0.93,st.fx.fog*2)+')';
      g.beginPath();g.rect(-20,-20,W+40,H+40);
      st.balls.forEach(function(b){g.moveTo(b.x+90,b.y);g.arc(b.x,b.y,90,0,Math.PI*2,true);});
      g.moveTo(p.x+130,p.y);g.arc(p.x,p.y,130,0,Math.PI*2,true);
      g.fill('evenodd');
      g.restore();
    }
    if(flash>0){g.fillStyle='rgba(255,40,60,'+flash*0.35+')';g.fillRect(-20,-20,W+40,H+40);flash=Math.max(0,flash-0.05);}
    g.setTransform(1,0,0,1,0,0);
  }
  /* координаты поля в пиксели холста (CSS) */
  function project(x,y){return [x*scale,y*scale];}
  return {resize:resize,draw:draw,event:event,project:project};
};

/* образец темы для меню */
BkView2D.swatch=function(cv,theme){
  var g=cv.getContext('2d'),T=THEMES[theme],w=cv.width,h=cv.height;
  if(theme==='space'){g.drawImage(stars(),0,0,W,H,0,0,w,h);}else{g.fillStyle=T.bg[0];g.fillRect(0,0,w,h);}
  var bw=12,bh=6;
  for(var r=0;r<3;r++)for(var c=0;c<4;c++){
    g.fillStyle=T.hp[2-r];
    if(theme==='retro')g.fillRect(4+c*(bw+3),5+r*(bh+3),bw,bh);
    else{rr(g,4+c*(bw+3),5+r*(bh+3),bw,bh,2);g.fill();}
  }
  g.fillStyle=T.pad[0];g.fillRect(w/2-10,h-8,20,4);
  g.fillStyle=T.ball;g.beginPath();g.arc(w/2+8,h-18,3,0,Math.PI*2);g.fill();
};
})();
