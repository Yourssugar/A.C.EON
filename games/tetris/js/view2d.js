/* A.C.EON TETRIS: плоское поле на canvas, цвета тем и маленькие окна запаса и очереди.

   TetTheme.color(theme, big, type)   цвет фигуры (#rrggbb)
   var v = TetView2D(canvas)
   v.resize(cell)            размер клетки в CSS-пикселях
   v.draw(st, now, set)      кадр; set: {theme, big, ghost}
   v.event(ev, st, set)      эффекты: искры при очистке, след сброса, вспышка фиксации, тряска
   TetView2D.mini(cv, types, cell, set, dim, horiz)   фигуры столбиком или в ряд (запас, очередь)
   TetView2D.swatch(cv, theme)                 образец темы для меню */
(function(){
'use strict';

var R=window.TetRules,W=R.W,H=R.H,HID=R.HIDDEN,VIS=H-HID;

var PAL={
  neon:{I:'#26c6da',O:'#ffee58',T:'#ab47bc',S:'#66bb6a',Z:'#ef5350',J:'#42a5f5',L:'#ffa726',G:'#59647d'},
  gb:{I:'#0f380f',O:'#306230',T:'#0f380f',S:'#306230',Z:'#0f380f',J:'#306230',L:'#0f380f',G:'#4d6b1a'},
  glass:{I:'#4fe3ff',O:'#ffe96a',T:'#d17bff',S:'#7dffa0',Z:'#ff6f86',J:'#6ea8ff',L:'#ffb35c',G:'#8a93b8'},
  big:{I:'#00e5ff',O:'#ffe600',T:'#c04dff',S:'#2ee84a',Z:'#ff3030',J:'#3b7bff',L:'#ff8c00',G:'#a0a0a0'}
};
var BG={
  neon:{a:'#0b1124',b:'#070b18',grid:'rgba(0,229,255,.07)'},
  gb:{a:'#9bbc0f',b:'#8bac0f',grid:'rgba(15,56,15,.12)'},
  glass:{a:'#0d1430',b:'#160a2a',grid:'rgba(255,255,255,.05)'},
  big:{a:'#000000',b:'#000000',grid:'rgba(255,255,255,.1)'}
};
/* узор блоков карманной темы: у каждой фигуры свой, чтобы различать их без цвета */
var GB_PAT={I:0,O:1,T:2,S:3,Z:4,J:5,L:6,G:7};

function pal(theme,big){return big?PAL.big:(PAL[theme]||PAL.neon);}
function bg(theme,big){return big?BG.big:(BG[theme]||BG.neon);}
window.TetTheme={color:function(theme,big,type){return pal(theme,big)[type]||'#888';},pal:pal,bg:bg};

function hex2rgb(h){var n=parseInt(h.slice(1),16);return [(n>>16)&255,(n>>8)&255,n&255];}
function rgba(h,a){var c=hex2rgb(h);return 'rgba('+c[0]+','+c[1]+','+c[2]+','+a+')';}
function lighten(h,q){var c=hex2rgb(h);return 'rgb('+c.map(function(v){return Math.round(v+(255-v)*q);}).join(',')+')';}
function darken(h,q){var c=hex2rgb(h);return 'rgb('+c.map(function(v){return Math.round(v*(1-q));}).join(',')+')';}

/* один блок; x, y, s в пикселях холста */
function block(g,x,y,s,type,set,alpha){
  var theme=set.big?'big':set.theme,col=pal(set.theme,set.big)[type]||'#888';
  g.globalAlpha=alpha==null?1:alpha;
  if(theme==='gb'){
    g.fillStyle='#0f380f';g.fillRect(x,y,s,s);
    var inner=Math.max(1,Math.round(s*0.12));
    g.fillStyle=type==='G'?'#8bac0f':(GB_PAT[type]%2?'#8bac0f':'#9bbc0f');
    g.fillRect(x+inner,y+inner,s-inner*2,s-inner*2);
    g.fillStyle='#306230';
    var p=GB_PAT[type],c=s/2,d=Math.max(1,Math.round(s*0.16));
    if(p===0)g.fillRect(x+inner*2,y+inner*2,s-inner*4,s-inner*4);
    else if(p===1){g.fillStyle='#0f380f';g.fillRect(x+c-d,y+c-d,d*2,d*2);}
    else if(p===2){g.fillRect(x+c-d/2,y+inner*2,d,s-inner*4);g.fillRect(x+inner*2,y+c-d/2,s-inner*4,d);}
    else if(p===3){g.fillStyle='#0f380f';g.fillRect(x+inner*2,y+inner*2,d,d);g.fillRect(x+s-inner*2-d,y+s-inner*2-d,d,d);}
    else if(p===4){g.fillStyle='#0f380f';g.fillRect(x+s-inner*2-d,y+inner*2,d,d);g.fillRect(x+inner*2,y+s-inner*2-d,d,d);}
    else if(p===5){g.fillRect(x+inner*2,y+inner*2,s-inner*4,d);}
    else if(p===6){g.fillRect(x+inner*2,y+s-inner*2-d,s-inner*4,d);}
    else{g.fillStyle='#306230';g.fillRect(x+inner,y+inner,s-inner*2,s-inner*2);}
  }else if(theme==='big'){
    g.fillStyle='#000';g.fillRect(x,y,s,s);
    var b=Math.max(2,Math.round(s*0.09));
    g.fillStyle=col;g.fillRect(x+b,y+b,s-b*2,s-b*2);
    g.fillStyle='rgba(255,255,255,.55)';g.fillRect(x+b,y+b,s-b*2,Math.max(2,Math.round(s*0.1)));
  }else if(theme==='glass'){
    var gr=g.createLinearGradient(x,y,x+s,y+s);
    gr.addColorStop(0,rgba(col,.75));gr.addColorStop(1,rgba(col,.28));
    g.fillStyle=gr;g.fillRect(x+1,y+1,s-2,s-2);
    g.strokeStyle=lighten(col,.45);g.lineWidth=Math.max(1,s*0.06);
    g.strokeRect(x+1.5,y+1.5,s-3,s-3);
    g.fillStyle='rgba(255,255,255,.35)';
    g.beginPath();g.moveTo(x+2,y+2);g.lineTo(x+s*0.62,y+2);g.lineTo(x+2,y+s*0.62);g.closePath();g.fill();
  }else{
    /* неон: объёмный блок со скосами */
    var e=Math.max(2,Math.round(s*0.16));
    g.fillStyle=col;g.fillRect(x,y,s,s);
    g.fillStyle=lighten(col,.4);
    g.beginPath();g.moveTo(x,y);g.lineTo(x+s,y);g.lineTo(x+s-e,y+e);g.lineTo(x+e,y+e);g.lineTo(x+e,y+s-e);g.lineTo(x,y+s);g.closePath();g.fill();
    g.fillStyle=darken(col,.38);
    g.beginPath();g.moveTo(x+s,y);g.lineTo(x+s,y+s);g.lineTo(x,y+s);g.lineTo(x+e,y+s-e);g.lineTo(x+s-e,y+s-e);g.lineTo(x+s-e,y+e);g.closePath();g.fill();
    g.fillStyle=col;g.fillRect(x+e,y+e,s-e*2,s-e*2);
    g.fillStyle='rgba(255,255,255,.18)';g.fillRect(x+e,y+e,s-e*2,Math.max(1,(s-e*2)*0.35));
  }
  g.globalAlpha=1;
}
/* тень падения: контур */
function ghost(g,x,y,s,type,set){
  var col=pal(set.theme,set.big)[type];
  if(set.big){
    g.strokeStyle='#fff';g.lineWidth=Math.max(2,s*0.1);g.setLineDash([s*0.25,s*0.15]);
    g.strokeRect(x+g.lineWidth/2+1,y+g.lineWidth/2+1,s-g.lineWidth-2,s-g.lineWidth-2);g.setLineDash([]);return;
  }
  if(set.theme==='gb'){g.fillStyle='rgba(15,56,15,.22)';g.fillRect(x+2,y+2,s-4,s-4);return;}
  g.fillStyle=rgba(col,.14);g.fillRect(x+1,y+1,s-2,s-2);
  g.strokeStyle=rgba(col,.6);g.lineWidth=Math.max(1,s*0.06);g.strokeRect(x+1.5,y+1.5,s-3,s-3);
}

window.TetView2D=function(canvas){
  var g=canvas.getContext('2d'),cell=24,dpr=1;
  var parts=[],trails=[],flashes=[],shake=0,wipe=0,riseFx=0;

  function resize(c){
    cell=c;dpr=Math.min(2,window.devicePixelRatio||1);
    canvas.width=Math.round(W*c*dpr);canvas.height=Math.round(VIS*c*dpr);
    canvas.style.width=W*c+'px';canvas.style.height=VIS*c+'px';
  }

  function event(ev,st,set){
    var now=performance.now();
    if(ev.type==='clear'){
      ev.rows.forEach(function(r){
        for(var x=0;x<W;x++){
          var t=st.board[r][x],col=pal(set.theme,set.big)[t]||'#fff';
          for(var k=0;k<2;k++)parts.push({x:(x+0.5)*cell,y:(r-HID+0.5)*cell,vx:(Math.random()-.5)*cell*0.5+(x-4.5)*cell*0.04,vy:-Math.random()*cell*0.35-cell*0.05,
            life:1,col:col,s:cell*(0.18+Math.random()*0.2)});
        }
      });
      if(ev.rows.length>=4)shake=Math.max(shake,cell*0.4);
      else shake=Math.max(shake,cell*0.08*ev.rows.length);
    }else if(ev.type==='drop'&&ev.rows>1){
      var xs={};ev.cells.forEach(function(c){var top=xs[c[0]];if(top==null||c[1]<top)xs[c[0]]=c[1];});
      for(var x in xs)trails.push({x:+x,y1:xs[x],y0:xs[x]-ev.rows,t:now,col:pal(set.theme,set.big)[ev.t]});
      shake=Math.max(shake,cell*0.06);
    }else if(ev.type==='lock'){
      flashes.push({cells:ev.cells,t:now});
    }else if(ev.type==='wipe'){wipe=1;shake=cell*0.5;}
    else if(ev.type==='rise'){riseFx=1;}
  }

  function draw(st,now,set){
    var s=cell*dpr,b=bg(set.theme,set.big);
    g.setTransform(1,0,0,1,0,0);
    /* фон: лёгкий градиент и сетка */
    var gr=g.createLinearGradient(0,0,0,canvas.height);
    gr.addColorStop(0,b.a);gr.addColorStop(1,b.b);
    g.fillStyle=gr;g.fillRect(0,0,canvas.width,canvas.height);
    var ox=0,oy=0;
    if(shake>0.3){ox=(Math.random()-.5)*shake*dpr;oy=(Math.random()-.5)*shake*dpr;shake*=0.86;}else shake=0;
    if(riseFx>0){oy+=riseFx*s*0.25;riseFx=Math.max(0,riseFx-0.08);}
    g.setTransform(1,0,0,1,ox,oy);
    g.strokeStyle=b.grid;g.lineWidth=1;
    g.beginPath();
    for(var i=1;i<W;i++){g.moveTo(Math.round(i*s)+.5,0);g.lineTo(Math.round(i*s)+.5,canvas.height);}
    for(var j=1;j<VIS;j++){g.moveTo(0,Math.round(j*s)+.5);g.lineTo(canvas.width,Math.round(j*s)+.5);}
    g.stroke();

    /* стопка; строки, которые сейчас очищаются, вспыхивают и сжимаются к центру */
    var clearing={},cp=0;
    if(st.clearRows){st.clearRows.forEach(function(r){clearing[r]=1;});cp=1-Math.max(0,st.clearT)/260;}
    for(var r=HID;r<H;r++){
      var row=st.board[r];
      for(var x=0;x<W;x++){
        var t=row[x];if(!t)continue;
        var px=x*s,py=(r-HID)*s;
        if(clearing[r]){
          var k=Math.max(0,1-cp*1.3),d=Math.abs(x-4.5)/5;
          if(cp>d*0.6){var sc=Math.max(0,k);var cx=px+s/2,cy=py+s/2;block(g,cx-s*sc/2,cy-s*sc/2,s*sc,t,set,1);}
          else block(g,px,py,s,t,set,1);
          g.fillStyle='rgba(255,255,255,'+(0.75*(1-cp))+')';g.fillRect(px,py,s,s);
        }else block(g,px,py,s,t,set,1);
      }
    }

    /* фигура и её тень */
    var p=st.cur;
    if(p&&!st.over){
      var cs=R.cells(st,p);
      if(set.ghost){
        var gy=R.ghostY(st)-p.y;
        if(gy>0)cs.forEach(function(c){var yy=c[1]+gy-HID;if(yy>=0)ghost(g,c[0]*s,yy*s,s,p.t,set);});
      }
      /* у фигуры на дне подсветка тускнеет, пока идёт задержка фиксации */
      var lockK=st.lockT>0?Math.min(1,st.lockT/500):0;
      cs.forEach(function(c){
        var yy=c[1]-HID;
        if(yy>=0)block(g,c[0]*s,yy*s,s,p.t,set,1-lockK*0.35);
      });
    }

    /* след сброса */
    for(i=trails.length-1;i>=0;i--){
      var tr=trails[i],a=1-(now-tr.t)/220;
      if(a<=0){trails.splice(i,1);continue;}
      var y0=Math.max(0,tr.y0-HID)*s,y1=(tr.y1-HID)*s;
      var lg=g.createLinearGradient(0,y0,0,y1);
      lg.addColorStop(0,'rgba(255,255,255,0)');lg.addColorStop(1,set.theme==='gb'&&!set.big?'rgba(15,56,15,'+(a*0.5)+')':rgba(tr.col||'#ffffff',a*0.55));
      g.fillStyle=lg;g.fillRect(tr.x*s+s*0.1,y0,s*0.8,Math.max(0,y1-y0));
    }
    /* вспышка фиксации */
    for(i=flashes.length-1;i>=0;i--){
      var f=flashes[i],fa=1-(now-f.t)/160;
      if(fa<=0){flashes.splice(i,1);continue;}
      g.fillStyle='rgba(255,255,255,'+(fa*0.45)+')';
      f.cells.forEach(function(c){var yy=c[1]-HID;if(yy>=0)g.fillRect(c[0]*s,yy*s,s,s);});
    }
    /* искры */
    for(i=parts.length-1;i>=0;i--){
      var q=parts[i];
      q.x+=q.vx*0.06;q.y+=q.vy*0.06;q.vy+=cell*0.02;q.life-=0.022;
      if(q.life<=0||q.y>VIS*cell+20){parts.splice(i,1);continue;}
      g.globalAlpha=Math.max(0,q.life);
      g.fillStyle=q.col;g.fillRect(q.x*dpr-q.s*dpr/2,q.y*dpr-q.s*dpr/2,q.s*dpr,q.s*dpr);
    }
    g.globalAlpha=1;
    if(wipe>0){g.fillStyle='rgba(255,255,255,'+wipe*0.7+')';g.fillRect(-20,-20,canvas.width+40,canvas.height+40);wipe=Math.max(0,wipe-0.04);}
    g.setTransform(1,0,0,1,0,0);
  }
  function busy(){return parts.length||trails.length||flashes.length||shake>0||wipe>0;}
  return {resize:resize,draw:draw,event:event,busy:busy};
};

/* фигуры столбиком: запас и очередь */
TetView2D.mini=function(cv,types,cell,set,dim,horiz){
  var dpr=Math.min(2,window.devicePixelRatio||1),n=Math.max(1,types.length);
  var bw=4.4*cell,bh=3*cell;
  var w=Math.round(horiz?bw*n:bw),h=Math.round(horiz?bh:bh*n);
  if(cv.width!==Math.round(w*dpr)||cv.height!==Math.round(h*dpr)){cv.width=Math.round(w*dpr);cv.height=Math.round(h*dpr);}
  cv.style.width=w+'px';cv.style.height=h+'px';
  var g=cv.getContext('2d');
  g.setTransform(dpr,0,0,dpr,0,0);g.clearRect(0,0,w,h);
  types.forEach(function(t,k){
    if(!t)return;
    var sh=R.SHAPES[t][0],x0=9,x1=-9,y0=9,y1=-9;
    sh.forEach(function(c){x0=Math.min(x0,c[0]);x1=Math.max(x1,c[0]);y0=Math.min(y0,c[1]);y1=Math.max(y1,c[1]);});
    var s=k===0?cell:cell*0.86;
    var bx=horiz?k*bw:0,by=horiz?0:k*bh;
    var ox=bx+(bw-(x1-x0+1)*s)/2-x0*s,oy=by+(bh-(y1-y0+1)*s)/2-y0*s;
    sh.forEach(function(c){block(g,ox+c[0]*s,oy+c[1]*s,s,t,set,dim?0.35:1);});
  });
};
/* образец темы для меню */
TetView2D.swatch=function(cv,theme){
  var g=cv.getContext('2d'),b=BG[theme],s=12,set={theme:theme,big:false};
  g.fillStyle=b.a;g.fillRect(0,0,cv.width,cv.height);
  [[0,3,'J'],[1,3,'J'],[2,3,'J'],[2,2,'J'],[3,3,'S'],[4,3,'S'],[4,2,'S'],[5,2,'S'],[1,1,'T'],[2,1,'T'],[3,1,'T'],[2,0,'T'],[4,1,'I'],[4,0,'I']].forEach(function(c){
    block(g,c[0]*s-4+2,c[1]*s,s,c[2],set,1);
  });
};
})();
