/* AI COURSE · робот-гид NODE.
   Собран из деталей (img/bot-<форма>.webp, лист деталей x0.6), три формы: novice, adv, pro (детали лежат на одних местах).
   Лица: img/faces-<форма>.webp, 8 штук сеткой 4x2, только свечение, рисуются поверх тёмного экрана головы.
   Последовательности кадров: img/seq-*.webp, сетка 4x4 по 256, ступни внизу по центру клетки.
   Единицы модели: пиксели исходного листа деталей (1254), начало координат: земля под роботом, y вниз.
   NodeBot.create({base,reduce}) -> {draw(ctx,x,y,h,dt), drawSeq(ctx,name,f,x,y,h,a), set(...), emote, talk, jump}
   Режимы: idle, wave, point, pointDown, think, proud, cheer, no (мотает головой). */
(function(){
'use strict';
const BASE='img/';
/* прямоугольники деталей в исходном листе: x, y, w, h */
const PR={head:[37,23,579,388],torso:[650,91,368,356],ant:[1080,93,106,277],uaL:[78,452,195,259],faL:[377,485,260,352],faR:[697,486,181,351],uaR:[979,452,195,259],legL:[257,843,284,385],legR:[709,843,285,385]};
const PS=.6;
/* точки сборки в координатах детали */
const RIG={
  legL:{piv:[176,43]}, legR:{piv:[111,43]},
  torso:{hipL:[118,262],hipR:[250,262],shL:[37,147],shR:[331,147],neck:[184,44]},
  uaL:{piv:[160,62],elb:[62,212]}, uaR:{piv:[35,62],elb:[133,212]},
  faL:{piv:[51,43]}, faR:{piv:[129,43]},
  head:{neck:[290,362],ant:[430,26],scr:[100,59,377,260]},
  ant:{piv:[53,268]}
};
const LEG=385-43;              /* от бедра до земли */
const HIPY=-(LEG);             /* бедро над землёй */
const TORSO_Y=HIPY-262;        /* верх торса */
const NECK_Y=TORSO_Y+44;
const HEAD_TOP=NECK_Y-362+30;  /* голова садится на шею с нахлёстом */
const MH=-HEAD_TOP;            /* высота модели без антенны */
const FACES=['neutral','happy','talk','think','wow','wink','proud','sleep'];
const FC={w:256,h:191};
/* масштаб кадров последовательностей: клетка атласа в единицах модели */
const SEQ={'seq-wake':{k:1/(.8*.343)},'seq-up1':{k:1/(.8*.36)},'seq-up2':{k:1/(.8*.39)},
  /* реакции слоя 1 (layer_01/img): сидячие кадры, масштаб по ширине головы */
  'seq-cheer':{k:1/(.8*.39)},'seq-facepalm':{k:1/(.8*.39)},'seq-blush':{k:1/(.8*.39)},'seq-think':{k:1/(.8*.38)},'seq-read':{k:1/(.8*.335)},'seq-trick':{k:1/(.8*.26)},'seq-broom':{k:1/(.8*.30)}};

function create(o){
  o=o||{};
  const base=o.base||BASE;
  function load(src){ const i=new Image(); i.decoding='async'; i.src=base+src; return i; }
  const reduce=!!o.reduce;
  const img={novice:load('bot-novice.webp'),adv:load('bot-adv.webp'),pro:load('bot-pro.webp')};
  const face={novice:load('faces-novice.webp'),adv:load('faces-adv.webp'),pro:load('faces-pro.webp')};
  const seq={};
  /* seqBase: строка (папка для реакций cheer/facepalm/blush/think) или словарь {имя: папка} */
  function seqSrc(n){ const sb=o.seqBase; if(sb&&typeof sb==='object'&&sb[n])return sb[n]+n+'.webp'; if(typeof sb==='string'&&/^seq-(cheer|facepalm|blush|think)$/.test(n))return sb+n+'.webp'; return base+n+'.webp'; }
  function seqImg(n){ if(!seq[n]){ const i=new Image(); i.decoding='async'; i.src=seqSrc(n); seq[n]=i; } return seq[n]; }
  const ok=i=>i&&i.complete&&i.naturalWidth>0;

  /* состояние */
  const W={novice:1,adv:0,pro:0};         /* веса форм (плавная смена) */
  let form='novice', mode='idle', modeT=0, faceName='happy', faceUntil=0, faceOver=null;
  let t=0, blinkAt=2.5, blink=0, hop=0, hopV=0, talkUntil=0, lookX=0, lookY=0;
  const P={body:0,lean:0,head:0,uaL:.08,faL:0,uaR:-.08,faR:0,legL:0,legR:0,ant:0};

  function set(k){
    if(k.form&&k.form!==form){ form=k.form; }
    if(k.mode&&k.mode!==mode){ mode=k.mode; modeT=0; }
    if(k.face){ faceName=k.face; }
    if(k.look){ lookX=k.look[0]; lookY=k.look[1]; }
  }
  function emote(f,ms){ faceOver=f; faceUntil=t+(ms||1200)/1000; }
  function talk(ms){ talkUntil=t+ms/1000; }
  function jump(){ if(hop===0&&!reduce){ hopV=-620; } emote('happy',900); }

  function pose(dt){
    t+=dt; modeT+=dt;
    for(const f in W){ const tg=f===form?1:0; W[f]+=(tg-W[f])*Math.min(1,dt*6); }
    const g={body:0,lean:0,head:0,uaL:.08,faL:0,uaR:-.08,faR:0,legL:0,legR:0,ant:0};
    const br=reduce?0:Math.sin(t*2.1);
    g.body=br*5; g.uaL+=br*.03; g.uaR-=br*.03; g.head=(reduce?0:Math.sin(t*1.3)*.035)+lookX*.08; g.ant=reduce?0:Math.sin(t*2.7)*.06;
    if(mode==='wave'){ const w=reduce?0:Math.sin(modeT*9), C=[2.0,.5]; g.uaR=-C[0]+w*.1; g.faR=C[1]+w*.4; g.head+=.05; g.lean=.03; }
    else if(mode==='point'){ g.uaL=1.2+(reduce?0:Math.sin(t*2)*.05); g.faL=.45; g.head-=.06; g.lean=-.02; }
    else if(mode==='pointDown'){ g.uaL=.75; g.faL=.25; g.head-=.04; }
    else if(mode==='think'){ g.uaR=-1.15; g.faR=-1.6; g.head+=.08; }
    else if(mode==='proud'){ g.uaL=.35; g.faL=-1.9; g.uaR=-.35; g.faR=1.9; g.body-=4; }
    else if(mode==='no'){ g.head+=reduce?0:Math.sin(modeT*16)*.14; g.uaL=.3; g.uaR=-.3; g.faL=-.5; g.faR=.5; }
    else if(mode==='cheer'){ const w=reduce?0:Math.sin(modeT*7); const C=[2.0,-.6]; g.uaL=C[0]+w*.15; g.uaR=-C[0]-w*.15; g.faL=C[1]; g.faR=-C[1]; }
    const k=Math.min(1,dt*(reduce?60:9));
    for(const key in P)P[key]+=(g[key]-P[key])*k;
    if(hopV!==0||hop<0){ hopV+=2200*dt; hop+=hopV*dt; if(hop>=0){ hop=0; hopV=0; } }
    if(t>blinkAt){ blink=.12; blinkAt=t+2.6+Math.random()*3.2; }
    if(blink>0)blink-=dt;
  }

  /* деталь: рисуем её прямоугольник так, чтобы точка piv оказалась в начале координат */
  function part(ctx,name,piv,f){
    const r=PR[name], im=img[f];
    ctx.drawImage(im,r[0]*PS,r[1]*PS,r[2]*PS,r[3]*PS,-piv[0],-piv[1],r[2],r[3]);
  }
  /* руки: сначала предплечье, сверху плечо.
     Поднятая рука (плечо выше горизонтали) рисуется зеркально: изгиб детали смотрит наружу, а не внутрь,
     угол доворачивается так, что локоть остаётся на месте;  */
  const UP=1.5;
  function armDir(u){ const e=RIG[u].elb, p=RIG[u].piv; return Math.atan2(e[1]-p[1],e[0]-p[0]); }
  const MIRD={uaL:armDir('uaL')-(Math.PI-armDir('uaL')),uaR:armDir('uaR')-(Math.PI-armDir('uaR'))};
  function arm(ctx,f,u,fa,sh,a1,a2,mir){
    const R=RIG, e=R[u].elb, pv=R[u].piv;
    ctx.save(); ctx.translate(sh[0],sh[1]);
    if(mir){ ctx.rotate(a1+MIRD[u]); ctx.scale(-1,1); a2=-a2; } else ctx.rotate(a1);
    ctx.save(); ctx.translate(e[0]-pv[0],e[1]-pv[1]); ctx.rotate(a2); part(ctx,fa,R[fa].piv,f); ctx.restore();
    part(ctx,u,pv,f);
    ctx.restore();
  }
  function arms(ctx,f){
    const R=RIG;
    [['uaL','faL',R.torso.shL,P.uaL,P.faL],['uaR','faR',R.torso.shR,P.uaR,P.faR]].forEach(([u,fa,sh,a1,a2])=>{
      arm(ctx,f,u,fa,sh,a1,a2,Math.abs(a1)>UP);
    });
  }
  function drawForm(ctx,f,a){
    if(a<.01||!ok(img[f]))return;
    ctx.save(); ctx.globalAlpha*=a;
    const R=RIG;
    /* ноги (за торсом) */
    const hy=HIPY+P.body*.3+hop;
    [['legL',R.torso.hipL,P.legL],['legR',R.torso.hipR,P.legR]].forEach(([n,hp,ang])=>{
      ctx.save(); ctx.translate(hp[0]-184,hy-(R.torso.hipL[1]-262)); ctx.rotate(ang); part(ctx,n,R[n].piv,f); ctx.restore();
    });
    /* торс */
    const ty=TORSO_Y+P.body+hop;
    ctx.save(); ctx.translate(0,ty); ctx.rotate(P.lean); ctx.translate(-184,0);
    part(ctx,'torso',[0,0],f);
    /* голова с антенной */
    ctx.save(); ctx.translate(R.torso.neck[0],R.torso.neck[1]+30); ctx.rotate(P.head);
    ctx.save(); ctx.translate(R.head.ant[0]-R.head.neck[0],R.head.ant[1]-R.head.neck[1]); ctx.rotate(P.ant); part(ctx,'ant',R.ant.piv,f); ctx.restore();
    part(ctx,'head',R.head.neck,f);
    /* лицо */
    const fi=face[f];
    if(ok(fi)){
      let fn=(faceOver&&t<faceUntil)?faceOver:faceName;
      if(t<talkUntil&&(fn==='neutral'||fn==='happy'||fn==='talk'))fn=(Math.floor(t*7)%2)?'talk':'neutral';
      if(blink>0&&fn!=='sleep'&&fn!=='wink')fn='sleep';
      const i=FACES.indexOf(fn), s=R.head.scr, ox=s[0]-R.head.neck[0], oy=s[1]-R.head.neck[1];
      const fw=s[2]+30, fh=s[3]+24;
      ctx.drawImage(fi,(i%4)*FC.w,Math.floor(i/4)*FC.h,FC.w,FC.h,ox-15+lookX*10,oy-12+lookY*6,fw,fh);
    }
    ctx.restore();
    arms(ctx,f);
    ctx.restore();
    ctx.restore();
  }
  /* x, y: точка на земле в пикселях холста, h: высота робота (без антенны) в пикселях */
  function draw(ctx,x,y,h,dt,alpha){
    pose(dt||0);
    const s=h/MH;
    ctx.save(); ctx.translate(x,y); ctx.scale(s,s);
    if(alpha!==undefined)ctx.globalAlpha=alpha;
    /* тень */
    ctx.fillStyle='rgba(0,0,0,.35)'; ctx.beginPath(); ctx.ellipse(0,-6,250*(1+hop/900),34,0,0,6.283); ctx.fill();
    for(const f of ['novice','adv','pro'])drawForm(ctx,f,W[f]);
    ctx.restore();
  }
  function drawSeq(ctx,name,fr,x,y,h,alpha){
    const im=seqImg(name); if(!ok(im))return false;
    const i=Math.max(0,Math.min(15,Math.round(fr))), c=256, s=h/MH*SEQ[name].k;
    ctx.save(); ctx.globalAlpha=alpha===undefined?1:alpha;
    ctx.drawImage(im,(i%4)*c,Math.floor(i/4)*c,c,c,x-c/2*s,y-(c-6)*s,c*s,c*s);
    ctx.restore(); return true;
  }
  /* где голова: для облачка реплики (в долях h от земли) */
  const headTop=1.0, headMid=(-(NECK_Y-362/2))/MH;
  return {draw,drawSeq,set,emote,talk,jump,seqImg,get ready(){ return ok(img.novice)&&ok(face.novice); },headTop,headMid,
    get form(){ return form; }, preload(){ ['seq-wake','seq-up1','seq-up2'].forEach(seqImg); }};
}
window.NodeBot={create};
})();
