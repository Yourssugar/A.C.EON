/* A.C.EON · Архив звука: робот-кукла, который танцует под музыку.
   Детали нарисованы GPT (img/rb-*.png): голова, корпус, руки, ноги; лицо на экране отдельными картинками.
   Движения считаются от уровней звука, которые даёт плеер каждый кадр:
     levels() -> {on, bass, mid, high, energy, beat, strength}
   Стили: спокойный трек раскачивается, средний кивает в долю и машет руками по очереди,
   громкий танцует "робота": на каждую сильную долю новая поза, на самых сильных прыгает.
   AceonRobot.create(canvas,{base, levels, tier, reduce}) -> {emote(name), wake(), destroy()}
   emote: 'like' (сердечки), 'hide' (пожимает плечами), 'skip' (недовольно), 'peak' (восторг),
          'present' (руки вперёд, как будто разворачивает экран), 'bye' (машет рукой),
          'learn' + имя (сразу показывает выученное движение)
   opts.moves() -> {poses:[номера поз], specials:['flip','slide','headbang','wave']}: что робот уже выучил
   opts.skin()  -> 'gold' или '': облик (золотой открывается за прослушивание всех треков) */
(function(){
'use strict';

const RIG={torso:{w:308,h:325},screen:[52,61.5,197.5,131.5],shoulderL:[42.5,223],shoulderR:[269.5,223],
  hipL:[113.5,315.5],hipR:[202.5,315.5],neck:[158.5,195.5],
  /* ноги переставлены: носки смотрят наружу */
  armL:{img:'arm-left',w:74,h:142,px:21.2,py:7.1}, armR:{img:'arm-right',w:66,h:133,px:43.8,py:6.7},
  legL:{img:'leg-right',w:76,h:153,px:49.1,py:7.6}, legR:{img:'leg-left',w:68,h:169,px:25,py:8.4}};
const FACES=['happy','fascinated','sad','busy','working'];
const D2R=Math.PI/180;
/* позы для "робота": углы рук (градусы, плюс = наружу/вверх), наклон корпуса */
const POSES=[
  {l:150,r:150,b:0},{l:90,r:-10,b:-4},{l:-10,r:90,b:4},{l:90,r:90,b:0},{l:160,r:20,b:-3},{l:20,r:160,b:3},
  {l:45,r:135,b:0},{l:135,r:45,b:0},{l:-20,r:-20,b:0},{l:110,r:110,b:0}
];

function create(canvas,o){
  const ctx=canvas.getContext('2d');
  const base=o.base||'img/';
  const imgs={}; let loaded=0, total=0;
  function load(k,src){ total++; const i=new Image(); i.onload=()=>{ loaded++; }; i.src=base+src; imgs[k]=i; }
  load('head','rb-head.png'); load('body','rb-body.png');
  ['arm-left','arm-right','leg-left','leg-right'].forEach(n=>load(n,'rb-'+n+'.png'));
  FACES.forEach(f=>load('f-'+f,'rb-face-'+f+'.png'));

  /* состояние позы (текущее и целевое) */
  const P={bodyY:0,bodyRot:0,head:0,armL:-4,armR:-4,legL:0,legR:0,squash:0,spin:0,slide:0};
  const G={bodyY:0,bodyRot:0,head:0,armL:-4,armR:-4,legL:0,legR:0,squash:0};
  let face='busy', faceUntil=0, faceOver=null, blinkAt=0, blink=false;
  let jumpV=0, jumpY=0, lastBeat=0, beatN=0, pose=null, lastPoseAt=0, pausedSince=performance.now(), sleeping=false;
  let special=null, specialAt=0;
  let shrugUntil=0, presentUntil=0, waveUntil=0, hearts=[], zs=[], zAt=0, lastT=performance.now(), peakAt=0;
  let energyAvg=.25;

  function fit(){
    const r=canvas.getBoundingClientRect(), dpr=Math.min(2,window.devicePixelRatio||1);
    canvas.width=Math.max(1,Math.round(r.width*dpr)); canvas.height=Math.max(1,Math.round(r.height*dpr));
  }
  fit();
  if(window.ResizeObserver)new ResizeObserver(fit).observe(canvas); else addEventListener('resize',fit);

  function startSpecial(name,now){ special={name,t0:now,dur:{flip:900,slide:1800,headbang:1600,wave:1800}[name]||1500}; specialAt=now; if(name==='flip'){ jumpV=-260; } }
  function emote(k,arg){
    const now=performance.now();
    wake();
    if(k==='like'){ faceOver='fascinated'; faceUntil=now+1800; for(let i=0;i<5;i++)hearts.push({x:(Math.random()-.5)*60,y:0,vy:-(40+Math.random()*40),t:0,d:i*120}); }
    else if(k==='hide'){ faceOver='sad'; faceUntil=now+1600; shrugUntil=now+1200; }
    else if(k==='skip'){ faceOver='busy'; faceUntil=now+1200; }
    else if(k==='peak'){ faceOver='fascinated'; faceUntil=now+1500; }
    else if(k==='present'){ faceOver='fascinated'; faceUntil=now+1600; presentUntil=now+1300; }
    else if(k==='bye'){ faceOver='happy'; faceUntil=now+1600; waveUntil=now+1500; }
    else if(k==='learn'){ faceOver='fascinated'; faceUntil=now+2200;
      if(arg&&['flip','slide','headbang','wave'].indexOf(arg)>=0)startSpecial(arg,now);
      else if(typeof arg==='number'){ pose=POSES[arg]||pose; lastPoseAt=now; G.armL=pose.l; G.armR=pose.r; } }
  }
  function wake(){ pausedSince=performance.now(); sleeping=false; }

  function ease(cur,tgt,k){ return cur+(tgt-cur)*k; }
  let raf=0;
  function frame(now){
    raf=requestAnimationFrame(frame);
    if(document.hidden)return;
    if(o.tier===1&&now-lastT<30)return;
    const dt=Math.min(.05,(now-lastT)/1000); lastT=now;
    const L=o.levels?o.levels():{on:false};
    const t=now/1000;
    const reduce=o.reduce;

    /* выбор цели позы */
    if(L.on){
      wake();
      energyAvg+=((L.energy||0)-energyAvg)*Math.min(1,dt*.35);
      const style=energyAvg<.22?'sway':energyAvg<.42?'bob':'robot';
      if(L.beat){ beatN++; lastBeat=now;
        const mv=o.moves?o.moves():null;
        if(style==='robot'&&now-lastPoseAt>240){ const pl=mv&&mv.poses&&mv.poses.length?mv.poses:null; pose=POSES[pl?pl[Math.random()*pl.length|0]:(Math.random()*POSES.length|0)]; lastPoseAt=now; }
        if(!reduce&&!special&&mv&&mv.specials&&mv.specials.length&&style!=='sway'&&L.strength>1.55&&now-specialAt>7000&&Math.random()<.35)
          startSpecial(mv.specials[Math.random()*mv.specials.length|0],now);
        if(L.strength>1.9&&style==='robot'&&!reduce&&jumpY===0&&now-peakAt>2200){ jumpV=-210; peakAt=now; emote('peak'); }
      }
      const sinceBeat=(now-lastBeat)/1000, pulse=Math.exp(-sinceBeat*7);
      const amp=reduce?.35:1;
      if(style==='sway'){
        const s=Math.sin(t*1.6);
        G.bodyRot=s*3*amp; G.head=-s*4*amp; G.bodyY=Math.abs(s)*-2*amp+(L.bass||0)*-3;
        G.armL=-4+Math.sin(t*1.6+.6)*10*amp; G.armR=-4-Math.sin(t*1.6+.6)*10*amp;
        G.legL=s*2*amp; G.legR=s*2*amp; G.squash=0;
      } else if(style==='bob'){
        G.bodyY=pulse*7*amp; G.head=pulse*9*amp; G.bodyRot=Math.sin(t*2.1)*2*amp;
        const side=beatN%2?1:-1;
        G.armL=side>0?60*amp+pulse*20:-6; G.armR=side<0?60*amp+pulse*20:-6;
        G.legL=pulse*5*side*amp; G.legR=pulse*5*side*amp; G.squash=pulse*.04*amp;
      } else {
        const p=pose||POSES[0];
        G.armL=p.l*amp; G.armR=p.r*amp; G.bodyRot=p.b*amp+Math.sin(t*9)*(L.high||0)*2;
        G.bodyY=pulse*9*amp; G.head=pulse*10*amp-(p.b*.6);
        G.legL=-pulse*8*amp; G.legR=pulse*8*amp; G.squash=pulse*.06*amp;
      }
      if(!faceOver||now>faceUntil){ faceOver=null; face=style==='sway'?'working':'happy'; }
    } else {
      /* пауза: дышит, ждёт; через минуту засыпает */
      const idle=(now-pausedSince)/1000;
      sleeping=idle>60;
      const br=Math.sin(t*1.3);
      G.bodyY=br*1.5+(sleeping?6:0); G.bodyRot=sleeping?-2:0; G.head=sleeping?14:br*1.5;
      G.armL=sleeping?2:-4+br*2; G.armR=sleeping?2:-4-br*2; G.legL=0; G.legR=0; G.squash=0;
      if(!faceOver||now>faceUntil){ faceOver=null; face=sleeping?null:'busy'; }
      if(sleeping&&now>zAt){ zAt=now+1400; zs.push({t:0}); }
    }
    if(now<shrugUntil){ G.armL=55; G.armR=55; G.head=-6; }
    if(now<presentUntil){ G.armL=105; G.armR=105; G.head=-8; G.bodyRot=0; G.bodyY=-4; }
    if(now<waveUntil){ G.armR=150+Math.sin(t*14)*22; }
    /* особые движения (выученные) */
    let spin=0, slideX=0;
    if(special){
      const k=(now-special.t0)/special.dur;
      if(k>=1)special=null;
      else if(special.name==='flip'){ spin=360*(k<.5?2*k*k:1-Math.pow(-2*k+2,2)/2); G.armL=150; G.armR=150; }
      else if(special.name==='slide'){ slideX=Math.sin(k*Math.PI*2)*46; G.legL=Math.sin(t*18)*14; G.legR=-Math.sin(t*18)*14; G.armL=20+Math.sin(t*9)*25; G.armR=20-Math.sin(t*9)*25; }
      else if(special.name==='headbang'){ G.head=Math.sin(t*17)*20; G.bodyRot=Math.sin(t*17)*3; }
      else if(special.name==='wave'){ G.armL=95+Math.sin(t*10)*45; G.armR=95+Math.sin(t*10+Math.PI)*45; G.bodyRot=Math.sin(t*5)*4; }
    }
    P.spin=spin; P.slide=slideX;

    /* сглаживание: робот двигается рывками, остальные мягко */
    const k=Math.min(1,dt*(L.on&&energyAvg>=.42?22:9));
    for(const key in G)P[key]=ease(P[key],G[key],key==='bodyY'||key==='head'?Math.min(1,dt*14):k);
    /* прыжок */
    if(jumpV!==0||jumpY<0){ jumpV+=600*dt; jumpY+=jumpV*dt; if(jumpY>=0){ jumpY=0; jumpV=0; } }

    /* моргание */
    if(now>blinkAt){ blink=true; if(now>blinkAt+120){ blink=false; blinkAt=now+2600+Math.random()*3500; } }

    draw(now,dt);
  }

  function limb(spec,at,ang){
    const im=imgs[spec.img]; if(!im||!im.complete)return;
    ctx.save(); ctx.translate(at[0],at[1]); ctx.rotate(ang*D2R);
    ctx.drawImage(im,-spec.px,-spec.py,spec.w,spec.h); ctx.restore();
  }
  function draw(now,dt){
    const W=canvas.width,H=canvas.height;
    ctx.clearRect(0,0,W,H);
    if(loaded<total)return;
    /* кукла целиком примерно 340 x 500 в своих единицах */
    const s=Math.min(W/360,H/520);
    ctx.save();
    ctx.translate(W/2,H-6*s); ctx.scale(s,s);
    ctx.translate(P.slide||0,0);
    /* тень */
    ctx.fillStyle='rgba(0,0,0,.35)'; ctx.beginPath(); ctx.ellipse(0,-2,90*(1+jumpY/400),12,0,0,6.283); ctx.fill();
    /* система координат торса: низ ног на земле */
    const legLen=150, tw=RIG.torso.w, th=RIG.torso.h;
    if(P.spin){ const cy0=-(th+legLen)/2+jumpY; ctx.translate(0,cy0); ctx.rotate(P.spin*D2R); ctx.translate(0,-cy0); }
    const gold=o.skin&&o.skin()==='gold';
    if(gold)ctx.filter='sepia(1) saturate(3.2) hue-rotate(-14deg) brightness(1.18)';
    ctx.translate(-tw/2,-(th+legLen-12)+P.bodyY+jumpY);
    /* ноги (от бёдер), при приседании чуть разъезжаются */
    limb(RIG.legL,RIG.hipL,P.legL+(jumpY<0?-14:0)+P.bodyY*.6);
    limb(RIG.legR,RIG.hipR,P.legR+(jumpY<0?14:0)-P.bodyY*.6);
    /* корпус с наклоном вокруг бёдер */
    const cx=tw/2, cy=RIG.hipL[1];
    ctx.translate(cx,cy); ctx.rotate(P.bodyRot*D2R); ctx.scale(1+P.squash,1-P.squash); ctx.translate(-cx,-cy);
    ctx.drawImage(imgs.body,0,0,tw,th);
    /* голова кивает вокруг шеи */
    ctx.save();
    ctx.translate(RIG.neck[0],RIG.neck[1]); ctx.rotate(P.head*D2R*.5); ctx.translate(0,P.head*.4); ctx.translate(-RIG.neck[0],-RIG.neck[1]);
    ctx.drawImage(imgs.head,0,0,tw,th);
    const f=faceOver&&now<faceUntil?faceOver:face;
    if(gold)ctx.filter='none';
    if(f&&!blink){ const sc=RIG.screen; ctx.drawImage(imgs['f-'+f],sc[0],sc[1],sc[2],sc[3]); }
    /* сердечки и сон рисуются над головой */
    const hx=RIG.neck[0], hy=RIG.screen[1]-6;
    for(let i=hearts.length-1;i>=0;i--){
      const h=hearts[i]; h.d-=dt*1000; if(h.d>0)continue;
      h.t+=dt; h.y+=h.vy*dt; if(h.t>1.4){ hearts.splice(i,1); continue; }
      ctx.globalAlpha=1-h.t/1.4; heart(hx+h.x+Math.sin(h.t*6)*6,hy+h.y,9); ctx.globalAlpha=1;
    }
    for(let i=zs.length-1;i>=0;i--){
      const z=zs[i]; z.t+=dt; if(z.t>2.4){ zs.splice(i,1); continue; }
      ctx.globalAlpha=Math.min(1,z.t*2)*(1-z.t/2.4); ctx.fillStyle='#c4b5fd';
      ctx.font='bold '+(18+z.t*8)+'px JetBrains Mono, monospace'; ctx.fillText('z',hx+50+z.t*18,hy-z.t*30); ctx.globalAlpha=1;
    }
    ctx.restore();
    if(gold)ctx.filter='sepia(1) saturate(3.2) hue-rotate(-14deg) brightness(1.18)';
    /* руки поверх корпуса: угол от висящего положения, плюс = в сторону и вверх */
    limb(RIG.armL,RIG.shoulderL,P.armL);
    limb(RIG.armR,RIG.shoulderR,-P.armR);
    ctx.filter='none';
    ctx.restore();
  }
  function heart(x,y,r){
    ctx.fillStyle='#e879a0';
    ctx.beginPath(); ctx.moveTo(x,y+r*.9);
    ctx.bezierCurveTo(x-r*1.4,y,x-r*.9,y-r,x,y-r*.35);
    ctx.bezierCurveTo(x+r*.9,y-r,x+r*1.4,y,x,y+r*.9); ctx.fill();
  }
  raf=requestAnimationFrame(frame);
  return {emote,wake,destroy(){ cancelAnimationFrame(raf); }};
}

window.AceonRobot={create};
})();
