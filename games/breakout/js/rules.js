/* A.C.EON BREAKOUT: физика и правила. Без DOM, всё состояние в одном объекте (сохраняется в JSON).

   Поле 600 x 800 условных единиц, кирпичная сетка 12 столбцов.
   BkRules.create(opts)          opts: {mode:'campaign'|'endless'|'time', diff:'easy'|'normal'|'hard', level}
   BkRules.update(st, sec)       шаг времени; события в st.ev
   BkRules.launch(st)            запуск мяча / отпускание прилипшего
   st.padTarget = x (центр)      куда вести ракетку (мышь, палец); st.padDir = -1|0|1 (клавиши)
   BkRules.nextLevel(st)         бесконечный режим: следующий уровень */
(function(){
'use strict';

var W=600,H=800,COLS=12,SIDE=12,GAP=4,BH=22,TOP=84,PITCH=BH+GAP;
var BW=(W-2*SIDE-(COLS-1)*GAP)/COLS;
var PAD_Y=H-56,PAD_H=14,BALL_R=8,TIME_MS=180;

var DIFF={
  easy:  {speed:330,pad:124,lives:5,drop:0.2,bad:0.15},
  normal:{speed:400,pad:104,lives:3,drop:0.15,bad:0.25},
  hard:  {speed:470,pad:88,lives:3,drop:0.11,bad:0.35}
};
var GOOD=['laser','sticky','fire','multi','wide','slow','shield','magnet','life'];
var BAD=['narrow','fast','fog'];
var DUR={laser:10,sticky:15,fire:8,wide:12,slow:10,magnet:12,narrow:10,fast:8,fog:8};
/* очки за кирпич по типу (умножаются на множитель серии) */
var PTS={n:10,X:30,M:30,N:40,R:40,K:50,D:20,$:50};

function cellX(c){return SIDE+c*(BW+GAP);}
function cellY(r){return TOP+r*PITCH;}

function makeBricks(rows){
  var out=[],id=1;
  rows.forEach(function(row,r){
    for(var c=0;c<COLS;c++){
      var ch=row.charAt(c);if(ch==='.'||!ch)continue;
      var b={id:id++,x:cellX(c),y:cellY(r),w:BW,h:BH,t:ch,hp:1,max:1,alive:true,vx:0,regen:0};
      if(ch==='1'||ch==='2'||ch==='3'){b.t='n';b.hp=b.max=+ch;}
      else if(ch==='N'){b.t='M';b.hp=b.max=2;}
      else if(ch==='R'){b.hp=b.max=2;}
      if(b.t==='M')b.vx=(c<6?1:-1)*(70+r*4);
      out.push(b);
    }
  });
  return out;
}
function breakable(b){return b.t!=='S'&&b.t!=='G'&&b.t!=='P'&&b.t!=='Q';}
function solid(b){return b.alive&&b.t!=='P'&&b.t!=='Q';}

function create(o){
  o=o||{};
  var d=DIFF[o.diff]||DIFF.normal;
  var st={mode:o.mode||'campaign',diff:o.diff||'normal',level:o.level||0,seed:o.seed||Math.floor(Math.random()*1e6),
    score:0,lives:d.lives,time:0,levelTime:0,lost:0,combo:0,maxCombo:0,bricksBroken:0,
    paddle:{x:W/2,w:d.pad,base:d.pad,y:PAD_Y,h:PAD_H},padTarget:null,padDir:0,
    balls:[],drops:[],debris:[],lasers:[],bricks:[],
    fx:{},shield:false,laserT:0,state:'serve',par:60,stars:0,
    timeLeft:o.mode==='time'?TIME_MS:0,descendT:0,rowsAdded:0,ev:[]};
  loadLevel(st);
  return st;
}
function loadLevel(st){
  var rows;
  if(st.mode==='campaign')rows=BkLevels.CAMPAIGN[st.level];
  else if(st.mode==='endless')rows=BkLevels.endless(st.level+1,st.seed);
  else{rows=['............'];for(var k=0;k<6;k++)rows.push(BkLevels.timeRow(k,st.seed));st.rowsAdded=6;}
  st.bricks=makeBricks(rows);
  st.drops=[];st.debris=[];st.lasers=[];st.fx={};st.shield=false;
  st.levelTime=0;st.lost=0;st.combo=0;
  var n=st.bricks.filter(breakable).length;
  st.par=Math.round(20+n*1.4);
  st.paddle.w=st.paddle.base;
  serve(st);
}
function serve(st){
  st.state='serve';
  st.balls=[{x:st.paddle.x,y:st.paddle.y-BALL_R,vx:0,vy:0,r:BALL_R,stuck:0,cd:0}];
  st.combo=0;
}

/* ── скорость мяча: база по сложности, растёт за серию ударов без ракетки и со временем уровня ── */
function speed(st){
  var d=DIFF[st.diff]||DIFF.normal,s=d.speed;
  s*=1+Math.min(0.45,st.combo*0.015);
  s*=1+Math.min(0.15,st.levelTime/600);
  if(st.mode==='endless')s*=1+Math.min(0.4,st.level*0.02);
  if(st.mode==='time')s*=1+Math.min(0.25,(TIME_MS-st.timeLeft)/TIME_MS*0.25);
  if(st.fx.slow>0)s*=0.7;
  if(st.fx.fast>0)s*=1.3;
  return s;
}
function mult(st){return Math.min(8,1+Math.floor(st.combo/5));}

function launch(st){
  var any=false;
  st.balls.forEach(function(b){
    if(b.stuck==null)return;
    var sp=speed(st);
    var off=b.stuck/(st.paddle.w/2),a=Math.max(-0.9,Math.min(0.9,off*1.1))+(st.state==='serve'?(Math.random()-.5)*0.3:0);
    b.vx=Math.sin(a)*sp;b.vy=-Math.cos(a)*sp;b.stuck=null;any=true;
  });
  if(any){if(st.state==='serve')st.state='play';st.ev.push({type:'launch'});}
  return any;
}

/* ── бонусы ── */
function applyBonus(st,t){
  if(t==='life'){st.lives=Math.min(9,st.lives+1);}
  else if(t==='shield'){st.shield=true;}
  else if(t==='multi'){
    var add=[];
    st.balls.forEach(function(b){
      if(st.balls.length+add.length>=8)return;
      var sp=speed(st),a=Math.atan2(b.vy||-1,b.vx||0.01);
      [-0.45,0.45].forEach(function(d){
        if(st.balls.length+add.length>=8)return;
        add.push({x:b.x,y:b.y,vx:Math.cos(a+d)*sp,vy:Math.sin(a+d)*sp,r:BALL_R,stuck:null,cd:0,fire:b.fire});
      });
    });
    add.forEach(function(b){if(b.vy>-30)b.vy=-Math.abs(b.vy)-60;});
    st.balls=st.balls.concat(add);
    if(st.state==='serve'){launch(st);}
  }else{
    /* противоположные эффекты гасят друг друга */
    if(t==='wide')st.fx.narrow=0;if(t==='narrow')st.fx.wide=0;
    if(t==='slow')st.fx.fast=0;if(t==='fast')st.fx.slow=0;
    st.fx[t]=DUR[t];
  }
  st.ev.push({type:'bonus',bonus:t,bad:BAD.indexOf(t)>=0});
}
function maybeDrop(st,b,force){
  var d=DIFF[st.diff]||DIFF.normal;
  if(!force&&Math.random()>d.drop)return;
  var t=(!force&&Math.random()<d.bad)?BAD[Math.floor(Math.random()*BAD.length)]:GOOD[Math.floor(Math.random()*GOOD.length)];
  if(t==='life'&&Math.random()<0.5)t='multi';
  st.drops.push({x:b.x+b.w/2,y:b.y+b.h/2,t:t,vy:150});
}

/* ── удар по кирпичу ── */
function hitBrick(st,b,byBall,fire){
  if(!b.alive)return 'none';
  if(b.t==='S'||b.t==='G'){st.ev.push({type:'clank',x:b.x+b.w/2,y:b.y+b.h/2});return 'solid';}
  if(b.t==='P'||b.t==='Q')return 'none';
  b.hp-=fire?b.hp:1;b.regen=0;
  if(b.hp>0){st.score+=5;st.ev.push({type:'hit',x:b.x+b.w/2,y:b.y+b.h/2,t:b.t});return 'hit';}
  breakBrick(st,b,byBall);
  return 'break';
}
function breakBrick(st,b,byBall){
  if(!b.alive)return;
  b.alive=false;st.bricksBroken++;
  if(byBall){st.combo++;if(st.combo>st.maxCombo)st.maxCombo=st.combo;}
  var base=b.t==='n'?PTS.n*b.max:(PTS[b.t]||10),pts=base*mult(st);
  st.score+=pts;
  st.ev.push({type:'break',x:b.x+b.w/2,y:b.y+b.h/2,t:b.t,max:b.max,pts:pts,m:mult(st)});
  if(b.t==='X'){
    st.ev.push({type:'explode',x:b.x+b.w/2,y:b.y+b.h/2});
    var cx=b.x+b.w/2,cy=b.y+b.h/2;
    st.bricks.forEach(function(o){
      if(!o.alive||o===b)return;
      if(Math.abs(o.x+o.w/2-cx)<=BW*1.6&&Math.abs(o.y+o.h/2-cy)<=PITCH*1.6&&breakable(o))breakBrick(st,o,false);
    });
  }else if(b.t==='K'){
    var any=false;
    st.bricks.forEach(function(o){if(o.alive&&o.t==='G'){o.alive=false;any=true;}});
    if(any)st.ev.push({type:'gates'});
  }else if(b.t==='D'){
    st.debris.push({x:b.x,y:b.y,w:b.w,h:b.h,vy:60,rot:0});
  }
  maybeDrop(st,b,b.t==='$');
}
function bricksLeft(st){var n=0;st.bricks.forEach(function(b){if(b.alive&&breakable(b))n++;});return n;}

/* ── столкновение круга с прямоугольником: нормаль или null ── */
function circleRect(b,r){
  var cx=Math.max(r.x,Math.min(b.x,r.x+r.w)),cy=Math.max(r.y,Math.min(b.y,r.y+r.h));
  var dx=b.x-cx,dy=b.y-cy,d2=dx*dx+dy*dy;
  if(d2>b.r*b.r)return null;
  if(d2===0){
    /* центр внутри: выталкиваем по наименьшему перекрытию */
    var l=b.x-r.x,rr=r.x+r.w-b.x,t=b.y-r.y,bt=r.y+r.h-b.y,m=Math.min(l,rr,t,bt);
    if(m===l)return {nx:-1,ny:0,d:l+b.r};if(m===rr)return {nx:1,ny:0,d:rr+b.r};
    if(m===t)return {nx:0,ny:-1,d:t+b.r};return {nx:0,ny:1,d:bt+b.r};
  }
  var d=Math.sqrt(d2);
  return {nx:dx/d,ny:dy/d,d:b.r-d};
}

function moveBall(st,b,dt){
  var p=st.paddle;
  if(b.stuck!=null){b.x=Math.max(b.r,Math.min(W-b.r,p.x+b.stuck));b.y=p.y-b.r;return true;}
  if(b.cd>0)b.cd-=dt;
  b.x+=b.vx*dt;b.y+=b.vy*dt;
  /* стены */
  if(b.x<b.r){b.x=b.r;b.vx=Math.abs(b.vx);st.ev.push({type:'wall'});}
  if(b.x>W-b.r){b.x=W-b.r;b.vx=-Math.abs(b.vx);st.ev.push({type:'wall'});}
  if(b.y<b.r){b.y=b.r;b.vy=Math.abs(b.vy);st.ev.push({type:'wall'});}
  /* ракетка: угол отскока зависит от места удара */
  if(b.vy>0&&b.y+b.r>=p.y&&b.y-b.r<=p.y+p.h&&b.x>=p.x-p.w/2-b.r&&b.x<=p.x+p.w/2+b.r){
    var off=(b.x-p.x)/(p.w/2);off=Math.max(-1,Math.min(1,off));
    var a=off*1.13,sp;
    st.combo=0;
    sp=speed(st);
    b.y=p.y-b.r;
    if(st.fx.sticky>0){b.stuck=b.x-p.x;b.vx=b.vy=0;b.stickT=2.5;}
    else{b.vx=Math.sin(a)*sp;b.vy=-Math.abs(Math.cos(a)*sp);}
    st.ev.push({type:'paddle',x:b.x});
  }
  /* низ: щит или потеря мяча */
  if(b.y>H-6-b.r&&st.shield&&b.vy>0){b.y=H-6-b.r;b.vy=-Math.abs(b.vy);st.shield=false;st.ev.push({type:'shield'});}
  if(b.y-b.r>H)return false;
  /* порталы */
  if(b.cd<=0){
    for(var i=0;i<st.bricks.length;i++){
      var q=st.bricks[i];
      if(!q.alive||(q.t!=='P'&&q.t!=='Q'))continue;
      if(b.x>q.x&&b.x<q.x+q.w&&b.y>q.y-4&&b.y<q.y+q.h+4){
        var other=st.bricks.filter(function(o){return o.alive&&o!==q&&(o.t===(q.t==='P'?'Q':'P'));})[0];
        if(other){b.x=other.x+other.w/2;b.y=other.y+other.h/2;b.cd=0.35;st.ev.push({type:'portal',x:b.x,y:b.y});}
        break;
      }
    }
  }
  /* кирпичи: одна встреча за подшаг; огненный мяч проходит насквозь разбиваемые */
  for(var k=0;k<st.bricks.length;k++){
    var br=st.bricks[k];
    if(!solid(br))continue;
    var c=circleRect(b,br);if(!c)continue;
    var res=hitBrick(st,br,true,st.fx.fire>0);
    if(st.fx.fire>0&&res==='break')continue;
    b.x+=c.nx*c.d;b.y+=c.ny*c.d;
    var dot=b.vx*c.nx+b.vy*c.ny;
    if(dot<0){b.vx-=2*dot*c.nx;b.vy-=2*dot*c.ny;}
    /* не даём мячу лететь почти горизонтально */
    if(Math.abs(b.vy)<speed(st)*0.22){b.vy=(b.vy<0?-1:1)*speed(st)*0.22;}
    break;
  }
  return true;
}

/* ── шаг времени ── */
function update(st,sec){
  if(st.state==='over'||st.state==='done'||st.state==='clear')return;
  var steps=Math.max(1,Math.ceil(sec/0.004)),dt=sec/steps;
  for(var s=0;s<steps;s++){
    step(st,dt);
    if(st.state==='over'||st.state==='done'||st.state==='clear')break;
  }
}
function step(st,dt){
  var p=st.paddle,i;
  st.time+=dt;
  if(st.state==='play')st.levelTime+=dt;
  /* ракетка: к цели (мышь, палец) или клавишами */
  var w=st.paddle.base*(st.fx.wide>0?1.5:1)*(st.fx.narrow>0?0.65:1);
  p.w+=(w-p.w)*Math.min(1,dt*10);
  if(st.padTarget!=null){var dx=st.padTarget-p.x,mx=2400*dt;p.x+=Math.max(-mx,Math.min(mx,dx));}
  if(st.padDir)p.x+=st.padDir*820*dt;
  p.x=Math.max(p.w/2,Math.min(W-p.w/2,p.x));
  /* эффекты */
  for(var k in st.fx)if(st.fx[k]>0){st.fx[k]-=dt;if(st.fx[k]<=0){st.fx[k]=0;st.ev.push({type:'fxEnd',bonus:k});}}
  if(st.state==='serve'){moveBall(st,st.balls[0],dt);return;}
  /* режим «На время» */
  if(st.mode==='time'){
    st.timeLeft-=dt;
    if(st.timeLeft<=0){st.timeLeft=0;st.state='done';st.ev.push({type:'done'});return;}
    st.descendT+=dt;
    var every=Math.max(5,10-(TIME_MS-st.timeLeft)/30);
    if(st.descendT>=every){st.descendT=0;descend(st);if(st.state==='over')return;}
  }
  /* мячи */
  for(i=st.balls.length-1;i>=0;i--){
    var b=st.balls[i];
    if(b.stuck!=null&&b.stickT!=null){b.stickT-=dt;if(b.stickT<=0){b.stickT=null;var sv=st.state;launch(st);st.state=sv;}}
    if(!moveBall(st,b,dt))st.balls.splice(i,1);
  }
  /* скорость держим на текущем значении (серия, эффекты) */
  var sp=speed(st);
  st.balls.forEach(function(b){
    if(b.stuck!=null)return;
    var v=Math.sqrt(b.vx*b.vx+b.vy*b.vy)||1;
    b.vx*=sp/v;b.vy*=sp/v;
  });
  if(!st.balls.length){ballLost(st);return;}
  /* движущиеся и восстанавливающиеся кирпичи */
  st.bricks.forEach(function(br){
    if(!br.alive)return;
    if(br.t==='M'){
      br.x+=br.vx*dt;
      var hit=br.x<SIDE||br.x+br.w>W-SIDE;
      if(!hit)for(var j=0;j<st.bricks.length;j++){
        var o=st.bricks[j];
        if(o===br||!o.alive||o.y!==br.y)continue;
        if(br.x<o.x+o.w&&br.x+br.w>o.x){hit=true;break;}
      }
      if(hit){br.x-=br.vx*dt;br.vx=-br.vx;}
    }else if(br.t==='R'&&br.hp<br.max){
      /* восстанавливается, если его не трогать 4 секунды */
      br.regen+=dt;
      if(br.regen>=4){br.regen=0;br.hp++;st.ev.push({type:'regen',x:br.x+br.w/2,y:br.y+br.h/2});}
    }
  });
  /* лазер: два луча с краёв ракетки, сам */
  if(st.fx.laser>0){
    st.laserT-=dt;
    if(st.laserT<=0){
      st.laserT=0.38;
      st.lasers.push({x:p.x-p.w/2+8,y:p.y},{x:p.x+p.w/2-8,y:p.y});
      st.ev.push({type:'laser'});
    }
  }
  for(i=st.lasers.length-1;i>=0;i--){
    var L=st.lasers[i];L.y-=760*dt;
    var gone=L.y<0;
    if(!gone)for(var q=0;q<st.bricks.length;q++){
      var br2=st.bricks[q];
      if(!solid(br2))continue;
      if(L.x>br2.x&&L.x<br2.x+br2.w&&L.y>br2.y&&L.y<br2.y+br2.h){hitBrick(st,br2,false,false);gone=true;break;}
    }
    if(gone)st.lasers.splice(i,1);
  }
  /* падающие бонусы (магнит тянет их к ракетке) */
  for(i=st.drops.length-1;i>=0;i--){
    var d=st.drops[i];
    d.y+=d.vy*dt;
    if(st.fx.magnet>0&&d.y>H*0.35){var ddx=p.x-d.x;d.x+=Math.max(-320*dt,Math.min(320*dt,ddx));}
    if(d.y>H+20){st.drops.splice(i,1);continue;}
    if(d.y+10>=p.y&&d.y-10<=p.y+p.h&&d.x+14>=p.x-p.w/2&&d.x-14<=p.x+p.w/2){st.drops.splice(i,1);applyBonus(st,d.t);}
  }
  /* обломки: от них надо уворачиваться, попадание сужает ракетку */
  for(i=st.debris.length-1;i>=0;i--){
    var e=st.debris[i];
    e.vy+=420*dt;e.y+=e.vy*dt;e.rot+=dt*4;
    if(e.y>H+30){st.debris.splice(i,1);continue;}
    if(e.y+e.h>=p.y&&e.y<=p.y+p.h&&e.x+e.w>=p.x-p.w/2&&e.x<=p.x+p.w/2){
      st.debris.splice(i,1);
      st.fx.narrow=6;st.fx.wide=0;st.combo=0;
      st.ev.push({type:'ouch',x:e.x+e.w/2});
    }
  }
  /* уровень пройден */
  if(st.mode!=='time'&&bricksLeft(st)===0)levelClear(st);
  else if(st.mode==='time'&&bricksLeft(st)===0){for(var r=0;r<3;r++)descend(st);}
}
function ballLost(st){
  st.lost++;st.combo=0;
  st.fx={};st.shield=false;st.drops=[];st.lasers=[];
  st.ev.push({type:'lost'});
  if(st.mode==='time'){st.score=Math.max(0,st.score-300);serve(st);return;}
  st.lives--;
  if(st.lives<=0){st.state='over';st.ev.push({type:'over'});return;}
  serve(st);
}
function levelClear(st){
  var timeBonus=Math.max(0,Math.round((st.par-st.levelTime)*10)),clean=st.lost===0?1000:0;
  var bonus=300+timeBonus+clean;
  st.score+=bonus;
  st.stars=1+(st.lost===0?1:0)+(st.levelTime<=st.par?1:0);
  st.state='clear';
  st.ev.push({type:'clear',bonus:bonus,timeBonus:timeBonus,clean:clean,stars:st.stars});
}
/* бесконечный режим: следующий уровень, каждый третий даёт жизнь */
function nextLevel(st){
  st.level++;
  if(st.level%3===0)st.lives=Math.min(9,st.lives+1);
  loadLevel(st);
}
/* «На время»: стена сползает на ряд, сверху новый ряд */
function descend(st){
  st.bricks.forEach(function(b){b.y+=PITCH;});
  var fresh=makeBricks(['............',BkLevels.timeRow(st.rowsAdded++,st.seed)]);
  var maxId=0;st.bricks.forEach(function(b){if(b.id>maxId)maxId=b.id;});
  fresh.forEach(function(b){b.id=++maxId;st.bricks.push(b);});
  st.bricks=st.bricks.filter(function(b){return b.alive;});
  st.ev.push({type:'descend'});
  var low=0;st.bricks.forEach(function(b){if(b.alive&&b.y+b.h>low)low=b.y+b.h;});
  if(low>st.paddle.y-40){st.state='over';st.ev.push({type:'over',crushed:true});}
}

window.BkRules={W:W,H:H,COLS:COLS,BW:BW,BH:BH,PITCH:PITCH,TOP:TOP,SIDE:SIDE,GAP:GAP,PAD_Y:PAD_Y,DIFF:DIFF,GOOD:GOOD,BAD:BAD,DUR:DUR,TIME_MS:TIME_MS,
  create:create,update:update,launch:launch,nextLevel:nextLevel,bricksLeft:bricksLeft,mult:mult,speed:speed,breakable:breakable,loadLevel:loadLevel};
})();
