/* A.C.EON PONG: физика, бот и бонусы. Без DOM, всё в единицах поля 800 x 500.

   Игроки: 0 слева (вы против бота), 1 справа (бот или второй игрок).
   PongRules.create({mode, level, target, bonus, opp})
   mode: bot | duo | tour (турнир, opp: номер соперника 0..7) | squash (один игрок против стены, 3 жизни)
   PongRules.update(st, dt)      шаг; события складываются в st.ev
   st.pad[i].target              куда тянуть ракетку (мышь, палец), null: управление клавишами
   st.pad[i].dir                 -1, 0, 1 с клавиатуры
   Подкрутка: если ракетка в момент удара движется, мяч получает боковое ускорение и летит по дуге. */
(function(){
'use strict';

var W=800,H=500,PAD_W=14,PAD_H=92,PAD_X=34,BALL_R=8,WALL=14;
var SERVE_SPEED=420,SPEED_UP=1.08,MAX_SPEED=2000,MAX_ANGLE=1.05;  /* ~60 градусов */
var KEY_SPEED=720;

/* бот: реакция (с), ошибка в расчёте (px), скорость ракетки, умеет ли целиться и крутить */
var BOT={
  easy:  {react:0.30,err:46,speed:330,aim:0.1,spin:0},
  normal:{react:0.20,err:26,speed:460,aim:0.45,spin:0.2},
  hard:  {react:0.13,err:13,speed:600,aim:0.8,spin:0.5},
  master:{react:0.08,err:5, speed:760,aim:1,  spin:0.8}
};
/* соперники турнира: свой характер поверх обычных настроек бота
   padK: длина ракетки; speedUp: во сколько раз разгоняет мяч его удар; spinK: сила подкрутки;
   feint: как часто делает обманное движение; twins: две ракетки; pulse: ракетка меняет длину */
var OPP=[
  {id:'rookie',   color:'#2ee87a',react:0.32,err:50,speed:300,aim:0,  spin:0,  target:5},
  {id:'wall',     color:'#9fc4dc',react:0.20,err:20,speed:330,aim:0,  spin:0,  target:5,padK:1.5,speedUp:1.0},
  {id:'spinner',  color:'#8c6cff',react:0.20,err:24,speed:450,aim:0.3,spin:1,  target:5,spinK:1.8},
  {id:'sniper',   color:'#ff3b4d',react:0.15,err:14,speed:500,aim:1,  spin:0.2,target:5},
  {id:'trickster',color:'#ff2d78',react:0.12,err:10,speed:620,aim:0.7,spin:0.5,target:7,feint:0.3,bonus:true,bonusEvery:5},
  {id:'rocket',   color:'#ff8a1a',react:0.14,err:18,speed:600,aim:0.5,spin:0.3,target:5,speedUp:1.11},
  {id:'twins',    color:'#00e5ff',react:0.11,err:10,speed:560,aim:0.7,spin:0.4,target:7,twins:true},
  {id:'core',     color:'#ffd23a',react:0.09,err:9, speed:680,aim:1,  spin:0.8,target:7,pulse:true,speedUp:1.1}
];
var BONUS=['long','short','multi','slow','shield','ghost'];
var SQUASH_BONUS=['long','multi','slow','shield'];
var BONUS_TIME={long:10,short:10,ghost:6};

function create(o){
  var mode=o.mode||'bot',opp=mode==='tour'?Math.max(0,Math.min(OPP.length-1,o.opp|0)):-1,P=opp>=0?OPP[opp]:null;
  var st={mode:mode,level:o.level||'normal',target:P?P.target:(o.target||7),bonus:P?!!P.bonus:!!o.bonus,opp:opp,lives:mode==='squash'?3:0,
    score:[0,0],pad:[mkPad(0),mkPad(1)],balls:[],bonuses:[],shield:[0,0],fx:[{},{}],
    state:'serve',serveT:1.1,server:Math.random()<0.5?0:1,winner:-1,
    rally:0,bestRally:0,hits:[0,0],topSpeed:0,time:0,bonusT:6+Math.random()*6,
    ai:{t:0,goal:H/2,seen:0,feintT:0,feintGoal:0},ev:[]};
  if(P&&P.twins){st.pad[1].h=54;st.pad2=mkPad(1);st.pad2.h=54;st.pad[1].y=H*0.27;st.pad2.y=H*0.73;}
  if(mode==='squash'){st.server=1;st.serveT=1.4;}
  if(P)st.serveT=2.6;   /* перед матчем турнира показывается соперник */
  return st;
}
function mkPad(side){return {x:side?W-PAD_X-PAD_W:PAD_X,y:H/2,h:PAD_H,vy:0,target:null,dir:0};}

function serve(st){
  /* подаёт выигравший прошлое очко, мяч летит к сопернику */
  var dir=st.server===0?1:-1;
  var a=(Math.random()*0.7-0.35);
  st.balls=[{x:W/2,y:H/2+(Math.random()-0.5)*120,vx:Math.cos(a)*SERVE_SPEED*dir,vy:Math.sin(a)*SERVE_SPEED,spin:0,owner:st.server,trail:[]}];
  st.state='play';st.rally=0;
  st.ev.push({type:'serve'});
}

function speedOf(b){return Math.sqrt(b.vx*b.vx+b.vy*b.vy);}
function prof(st){return st.mode==='tour'?OPP[st.opp]:(BOT[st.level]||BOT.normal);}
function padH(st,i){
  var f=st.fx[i],k=(f.long>0?1.5:1)*(f.short>0?0.65:1);
  if(i===1&&st.mode==='tour'){var P=OPP[st.opp];if(P.twins)return 54*k;if(P.padK)k*=P.padK;if(P.pulse)k*=1+0.28*Math.sin(st.time*1.3);}
  return PAD_H*k;
}

/* ── бот: считает, куда придёт мяч (с отскоками от стен), с запозданием и ошибкой ── */
function predict(b,xLine){
  var x=b.x,y=b.y,vx=b.vx,vy=b.vy,spin=b.spin,t=0;
  if((xLine-x)*vx<=0)return null;
  for(var i=0;i<400;i++){
    var dt=0.01;
    vy+=spin*dt;spin*=Math.exp(-dt*1.4);
    x+=vx*dt;y+=vy*dt;t+=dt;
    if(y<BALL_R){y=2*BALL_R-y;vy=-vy;spin=-spin*0.5;}
    if(y>H-BALL_R){y=2*(H-BALL_R)-y;vy=-vy;spin=-spin*0.5;}
    if((vx>0&&x>=xLine)||(vx<0&&x<=xLine))return {y:y,t:t};
  }
  return null;
}
function bot(st,dt){
  var P=prof(st),p=st.pad[1],ai=st.ai,h=padH(st,1);
  var xLine=p.x-BALL_R;
  /* ближайший мяч, который летит к боту */
  var b=null,bt=1e9;
  st.balls.forEach(function(o){if(o.vx>0){var t=(xLine-o.x)/o.vx;if(t<bt){bt=t;b=o;}}});
  ai.t-=dt;
  if(!b){
    /* мяч летит к игроку: спокойно к центру */
    ai.seen=0;ai.goal=H/2+(st.balls[0]?(st.balls[0].y-H/2)*0.3:0);
  }else{
    if(!ai.seen){ai.seen=1;ai.t=P.react*(0.8+Math.random()*0.4);}
    if(ai.t<=0){
      ai.t=0.12+Math.random()*0.1;   /* пересчитывает не каждый кадр, как человек */
      var pr=predict(b,xLine);
      if(pr){
        var err=P.err*(0.5+Math.random())*(Math.random()<0.5?-1:1);
        if(st.fx[0].ghost>0)err*=2.2;
        err*=Math.min(1.6,0.6+pr.t*0.6);   /* чем дальше мяч, тем больше ошибка */
        /* прицел: бьёт краем ракетки, чтобы мяч ушёл туда, где нет игрока */
        var aim=0;
        if(Math.random()<P.aim){var away=st.pad[0].y<H/2?1:-1;aim=-away*h*0.34;}
        var goal=pr.y+err+aim;
        /* обманное движение: сначала дёргается не туда */
        if(P.feint&&Math.abs(goal-ai.goal)>60&&Math.random()<P.feint){ai.feintT=0.2;ai.feintGoal=p.y-(goal-p.y)*0.5;}
        ai.goal=goal;
      }
    }
  }
  if(ai.feintT>0)ai.feintT-=dt;
  var d=(ai.feintT>0?ai.feintGoal:ai.goal)-p.y,max=P.speed*dt;
  var mv=Math.abs(d)<3?0:Math.max(-max,Math.min(max,d));
  /* подкрутка: перед ударом дёргает ракеткой */
  if(b&&bt<0.08&&Math.random()<P.spin*dt*20)mv+=(Math.random()<0.5?-1:1)*max*1.5;
  return mv;
}

/* ── шаг ── */
function update(st,dt){
  if(st.state==='over')return;
  st.time+=dt;
  /* ракетки */
  for(var i=0;i<2;i++){
    if(i===1&&st.mode==='squash')break;
    var p=st.pad[i],h=padH(st,i),old=p.y;
    p.h+=(h-p.h)*Math.min(1,dt*10);
    if(i===1&&(st.mode==='bot'||st.mode==='tour')){
      var mv=bot(st,dt);
      if(st.pad2){
        /* близнецы: каждый держит свою половину поля, к мячу идёт тот, в чьей половине цель */
        var q=st.pad2,qo=q.y,P2=OPP[st.opp],sp=P2.speed*dt,g=st.ai.feintT>0?st.ai.feintGoal:st.ai.goal;
        q.h+=(h-q.h)*Math.min(1,dt*10);
        var gp=g<H/2?g:H*0.27,gq=g>=H/2?g:H*0.73;
        p.y+=Math.max(-sp,Math.min(sp,gp-p.y));q.y+=Math.max(-sp,Math.min(sp,gq-q.y));
        p.y=Math.max(p.h/2,Math.min(H/2-4,p.y));q.y=Math.max(H/2+4,Math.min(H-q.h/2,q.y));
        q.vy+=((q.y-qo)/Math.max(dt,0.001)-q.vy)*Math.min(1,dt*25);
      }else p.y+=mv;
    }
    else if(p.target!=null){var d=p.target-p.y,mx=2600*dt;p.y+=Math.max(-mx,Math.min(mx,d));}
    else if(p.dir)p.y+=p.dir*KEY_SPEED*dt;
    p.y=Math.max(p.h/2,Math.min(H-p.h/2,p.y));
    var v=(p.y-old)/Math.max(dt,0.001);
    p.vy+=(v-p.vy)*Math.min(1,dt*25);
    for(var k in st.fx[i])if(st.fx[i][k]>0)st.fx[i][k]-=dt;
  }
  if(st.state==='serve'){
    st.serveT-=dt;
    if(st.serveT<=0)serve(st);
    return;
  }
  /* мячи: мелкими шагами, чтобы быстрый мяч не проскочил ракетку */
  var steps=Math.max(1,Math.ceil(dt/0.004)),sd=dt/steps;
  for(var s=0;s<steps;s++){
    for(var j=st.balls.length-1;j>=0;j--){
      if(moveBall(st,st.balls[j],sd)){st.balls.splice(j,1);}
    }
    if(st.state!=='play')return;
  }
  st.balls.forEach(function(b){b.trail.push(b.x,b.y);if(b.trail.length>24)b.trail.splice(0,2);});
  /* бонусы */
  if(st.bonus){
    st.bonusT-=dt;
    if(st.bonusT<=0&&st.bonuses.length<2){
      var every=st.mode==='tour'&&OPP[st.opp].bonusEvery;
      st.bonusT=every?every+Math.random()*3:8+Math.random()*7;
      var pool=st.mode==='squash'?SQUASH_BONUS:BONUS;
      st.bonuses.push({t:pool[Math.floor(Math.random()*pool.length)],x:W*0.32+Math.random()*W*0.36,y:60+Math.random()*(H-120),r:20,life:12});
      st.ev.push({type:'bonusUp'});
    }
    for(var q=st.bonuses.length-1;q>=0;q--){st.bonuses[q].life-=dt;if(st.bonuses[q].life<=0)st.bonuses.splice(q,1);}
  }
}

/* возвращает true, если мяч ушёл за край */
function moveBall(st,b,dt){
  b.vy+=b.spin*dt;b.spin*=Math.exp(-dt*1.4);
  b.x+=b.vx*dt;b.y+=b.vy*dt;
  if(b.y<BALL_R){b.y=BALL_R;b.vy=Math.abs(b.vy);b.spin=-b.spin*0.5;st.ev.push({type:'wall',x:b.x,y:b.y});}
  if(b.y>H-BALL_R){b.y=H-BALL_R;b.vy=-Math.abs(b.vy);b.spin=-b.spin*0.5;st.ev.push({type:'wall',x:b.x,y:b.y});}
  /* ракетки */
  var pads=st.mode==='squash'?[st.pad[0]]:st.pad2?[st.pad[0],st.pad[1],st.pad2]:st.pad;
  for(var n=0;n<pads.length;n++){
    var p=pads[n],i=n===0?0:1,toward=i===0?b.vx<0:b.vx>0;
    if(!toward)continue;
    var px=i===0?p.x+PAD_W:p.x,inX=i===0?(b.x-BALL_R<=px&&b.x>p.x-4):(b.x+BALL_R>=px&&b.x<p.x+PAD_W+4);
    if(inX&&b.y>p.y-p.h/2-BALL_R&&b.y<p.y+p.h/2+BALL_R){hit(st,b,i,p);return false;}
  }
  /* сквош: справа стена, мяч отскакивает с небольшим случайным углом */
  if(st.mode==='squash'&&b.x>W-WALL-BALL_R&&b.vx>0){
    b.x=W-WALL-BALL_R;
    var sp=speedOf(b),a=Math.atan2(b.vy,b.vx)+(Math.random()-0.5)*0.35;
    a=Math.max(-MAX_ANGLE,Math.min(MAX_ANGLE,a));
    b.vx=-Math.abs(Math.cos(a)*sp);b.vy=Math.sin(a)*sp;
    st.ev.push({type:'bounce',x:b.x,y:b.y});
  }
  /* щит за спиной */
  if(b.x<BALL_R+4&&st.shield[0]){st.shield[0]=0;b.x=BALL_R+4;b.vx=Math.abs(b.vx);st.ev.push({type:'shieldHit',side:0,y:b.y});}
  if(b.x>W-BALL_R-4&&st.shield[1]){st.shield[1]=0;b.x=W-BALL_R-4;b.vx=-Math.abs(b.vx);st.ev.push({type:'shieldHit',side:1,y:b.y});}
  /* бонусы на поле */
  for(var q=st.bonuses.length-1;q>=0;q--){
    var o=st.bonuses[q],dx=o.x-b.x,dy=o.y-b.y;
    if(dx*dx+dy*dy<(o.r+BALL_R)*(o.r+BALL_R)){st.bonuses.splice(q,1);takeBonus(st,o,b);}
  }
  /* гол */
  if(b.x<-BALL_R*2||b.x>W+BALL_R*2){point(st,b.x<0?1:0,b);return true;}
  return false;
}

function hit(st,b,i,p){
  p=p||st.pad[i];
  var off=Math.max(-1,Math.min(1,(b.y-p.y)/(p.h/2)));
  var P=i===1&&st.mode==='tour'?OPP[st.opp]:null,up=P&&P.speedUp!=null?P.speedUp:st.mode==='squash'?1.05:SPEED_UP;
  var sp=Math.min(st.mode==='squash'?2300:MAX_SPEED,speedOf(b)*up),a=off*MAX_ANGLE;
  var dir=i===0?1:-1;
  b.vx=Math.cos(a)*sp*dir;b.vy=Math.sin(a)*sp;
  b.x=i===0?p.x+PAD_W+BALL_R:p.x-BALL_R;
  /* подкрутка от движения ракетки */
  b.spin=Math.max(-900,Math.min(900,-p.vy*0.9));
  if(Math.abs(p.vy)<60)b.spin=0;
  if(P&&P.spinK)b.spin=Math.max(-1500,Math.min(1500,b.spin*P.spinK));
  b.owner=i;
  st.rally++;st.hits[i]++;
  if(st.rally>st.bestRally)st.bestRally=st.rally;
  if(sp>st.topSpeed)st.topSpeed=sp;
  st.ai.seen=0;
  st.ev.push({type:'hit',side:i,x:b.x,y:b.y,speed:sp,spin:Math.abs(b.spin)>200,edge:Math.abs(off)>0.75});
}

function takeBonus(st,o,b){
  var me=b.owner,op=1-me;
  if(o.t==='long')st.fx[me].long=BONUS_TIME.long;
  else if(o.t==='short')st.fx[op].short=BONUS_TIME.short;
  else if(o.t==='slow'){st.balls.forEach(function(x){x.vx*=0.7;x.vy*=0.7;});}
  else if(o.t==='shield')st.shield[me]=1;
  else if(o.t==='ghost')st.fx[op].ghost=BONUS_TIME.ghost;   /* мяч плохо виден на половине соперника */
  else if(o.t==='multi'&&st.balls.length<3){
    var sp=speedOf(b),a=Math.atan2(b.vy,Math.abs(b.vx))+(Math.random()<0.5?0.5:-0.5),dir=b.vx>0?1:-1;
    st.balls.push({x:b.x,y:b.y,vx:Math.cos(a)*sp*dir,vy:Math.sin(a)*sp,spin:0,owner:me,trail:[]});
  }
  st.ev.push({type:'bonus',bonus:o.t,side:me,x:o.x,y:o.y});
}

function point(st,who,b){
  if(st.mode==='squash'){
    st.ev.push({type:'miss',y:b.y,rally:st.rally});
    if(st.balls.length>1)return;
    st.lives--;
    if(st.lives<=0){st.state='over';st.winner=-1;st.balls=[];st.ev.push({type:'over',winner:-1});return;}
    st.state='serve';st.serveT=1.2;st.server=1;st.bonuses=[];
    return;
  }
  st.score[who]++;
  st.ev.push({type:'point',side:who,y:b.y,rally:st.rally});
  if(st.balls.length>1)return;     /* ещё есть мячи в игре: продолжаем */
  var top=st.score[0]>st.score[1]?0:1;
  if(st.score[top]>=st.target&&st.score[0]!==st.score[1]){
    st.state='over';st.winner=top;st.balls=[];
    st.ev.push({type:'over',winner:top});
    return;
  }
  st.state='serve';st.serveT=1.1;st.server=who;
  st.bonuses=[];
}

window.PongRules={W:W,H:H,PAD_W:PAD_W,PAD_H:PAD_H,BALL_R:BALL_R,WALL:WALL,BONUS:BONUS,SQUASH_BONUS:SQUASH_BONUS,BONUS_TIME:BONUS_TIME,LEVELS:Object.keys(BOT),OPP:OPP,
  create:create,update:update,speedOf:speedOf,predict:predict};
})();
