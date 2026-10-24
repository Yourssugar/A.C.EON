/* A.C.EON · Архив памяти.
   Сценарий поверх неба гостевой (gb.js + sky.js):
   1 небо как есть (из гостевой: несколько секунд, интерфейс гаснет; при прямом заходе 12-16 с)
   2 распад 12-14 с: звёзды падают и бьются в агонии, свет уходит из туманностей, следы гостей
     сбоят цветом и тонут, полосы, разрывы неба, трещины (U-3), вспышки, тряска; музыка замедляется и гаснет
   3 смерть: всё заливает белым
   4 первый текст набирается неровно (буквы и целые слова), на белом оседает пепел,
     после каждой фразы загорается одна звезда; потом текст исчезает
   5 пустота
   6 второй текст, и на белом загораются звёзды: следы гостей чёрными точками, их можно читать
   Время сценария идёт только пока вкладка открыта (тикает из кадра неба).
   Тем, кто уже видел архив, через пару секунд показывается "пропустить".
   Для проверки: ?arspeed=4 ускоряет сценарий (переходы CSS остаются обычными). */
(function(){
'use strict';

let running=false;

function run(from){
  const GB=window.GB; if(!GB||running)return;
  running=true;
  if(typeof GB.now!=='function')GB.now=()=>Date.now();   // на случай старого gb.js
  const sky=GB.sky, T=GB.T, tier=GB.tier, weak=tier<2||GB.reduce;
  const body=document.body;
  const rnd=(a,b)=>a+Math.random()*(b-a), rndI=(a,b)=>Math.floor(rnd(a,b+1)), pick=a=>a[Math.random()*a.length|0];
  if(GB.TR)GB.TR.event('gb.archive');

  /* слои поверх неба */
  function el(tag,id,cls,parent){ const e=document.createElement(tag); if(id)e.id=id; if(cls)e.className=cls; (parent||body).appendChild(e); return e; }
  const gcv=el('canvas','ar-gl'), g=gcv.getContext('2d');
  const flash=el('div','ar-flash'), white=el('div','ar-white');
  const err=el('div','ar-err'); err.textContent='// MEMORY CORRUPTION DETECTED';
  const t1=el('div','ar-t1','ar-txt'), t2=el('div','ar-t2','ar-txt');
  const skip=el('button','ar-skip'); skip.type='button';
  const back=el('a','ar-back'); back.href=GB.DIR;
  /* Текст набирается неровно, как будто его пишет кто-то живой и не до конца уверенный:
     одни слова печатаются по буквам с плавающей скоростью (в среднем около 440 знаков в минуту),
     другие появляются целиком, иногда пауза перед словом, изредка опечатка, которую стирают.
     Невидимый остаток строки стоит на месте сразу, поэтому строки не прыгают при наборе.
     После каждой законченной фразы на белом загорается одна чёрная звезда. */
  const CHAR_MS=136, LINE_GAP=650;
  const prog=new Map([[t1,[]],[t2,[]]]), wrong=new Map([[t1,[]],[t2,[]]]);
  let typing=null;                  // {box, line, steps, si, acc, done}
  function renderBox(box){
    const p=prog.get(box), w=wrong.get(box);
    [...box.children].forEach((d,i)=>{
      const chars=d._chars, n=Math.min(p[i]||0,chars.length), wc=w[i]||'';
      d._ty.textContent=chars.slice(0,n).join('')+wc; d._rest.textContent=chars.slice(n+(wc?1:0)).join('');
      d._cr.style.display=(typing&&typing.box===box&&typing.line===i)?'':'none';
    });
  }
  /* план набора строки: шаги {wait, n, wrong, sentence} */
  function plan(chars,start){
    const steps=[], jit=()=>CHAR_MS*(.45+Math.random()*1.1);
    const letters=chars.filter(c=>/[^\s.,:;!?]/.test(c));
    let i=start;
    while(i<chars.length){
      let j=i; while(j<chars.length&&chars[j]!==' ')j++; while(j<chars.length&&chars[j]===' ')j++;
      const word=chars.slice(i,j).join('');
      if(Math.random()<.14) steps.push({wait:rnd(250,800),n:i});
      if(Math.random()<.33) steps.push({wait:rnd(90,280),n:j});
      else {
        const typo=(j-i>4&&Math.random()<.07)?i+rndI(1,j-i-3):-1;
        for(let k=i+1;k<=j;k++){
          if(k-1===typo&&letters.length){ steps.push({wait:jit(),n:k-1,wrong:pick(letters)}); steps.push({wait:rnd(220,460),n:k-1}); }
          steps.push({wait:jit(),n:k});
        }
      }
      if(/[.!?:]\s*$/.test(word)) steps[steps.length-1].sentence=true;
      i=j;
    }
    return steps;
  }
  function fillTexts(){
    const a=T('ar.t1'), b=T('ar.t2');
    [[t1,a],[t2,b]].forEach(([box,lines])=>{
      box.innerHTML=''; wrong.set(box,[]);
      lines.forEach((s,i)=>{
        const d=el('div',null,'al'+(i===lines.length-1?' em':'')+(box===t2&&i===0?' main':''),box);
        d._chars=Array.from(s);
        d._ty=el('span',null,'ty',d); d._cr=el('span',null,'cr',d); d._rest=el('span',null,'rest',d);
      });
      if(typing&&typing.box===box){ const d=box.children[typing.line]; if(d){ typing.steps=plan(d._chars,Math.min(prog.get(box)[typing.line]||0,d._chars.length)); typing.si=0; } }
      renderBox(box);
    });
    skip.textContent=T('ar.skip'); back.textContent=T('ar.back');
    document.title='A.C.EON · '+T('ar.title');
  }
  fillTexts(); GB.onLang=fillTexts;
  function size(){ gcv.width=innerWidth; gcv.height=innerHeight; }
  size(); addEventListener('resize',size);

  /* назад из архива, открытого из гостевой: та же страница, просто перезагрузить */
  const arPath=location.pathname;
  addEventListener('popstate',()=>{ if(location.pathname!==arPath)location.reload(); });

  body.classList.add('ar');
  GB.setHover(null);
  if(from==='guestbook')GB.lock=true;
  const SPEED=Math.min(10,Math.max(.1,parseFloat(new URLSearchParams(location.search).get('arspeed'))||1));   // для проверки

  /* часы сценария */
  let clock=0, lastNow=0, phase='calm', phaseT=0;
  const calm=from==='guestbook'?rnd(3000,4200):rnd(12000,16000);
  const D=weak?10000:rnd(12000,14000);
  const events=[];
  function at(ms,fn){ events.push({t:clock+ms,fn}); }
  function go(p){ phase=p; phaseT=0; }

  /* музыка: магнитофон останавливается */
  const mus=GB.music;
  function musicDie(k){ const a=mus.el; if(a.paused)return;
    try{ a.preservesPitch=false; a.mozPreservesPitch=false; a.webkitPreservesPitch=false; }catch(e){}
    a.playbackRate=Math.max(.5,1-k*.5); a.volume=Math.max(0,mus.target()*(1-k)); }
  function musicBack(){ const a=mus.el; a.playbackRate=1; try{ a.preservesPitch=true; }catch(e){}
    if(mus.on()&&a.src){ a.currentTime=0; a.volume=0; a.play().then(()=>mus.fade(mus.target())).catch(()=>{}); } }

  /* следы: сбой цветом, дрожь и падение во время распада; на белом загораются по одному */
  const GCOL=[[1,.13,.33],[0,1,.47],[0,.67,1],[1,.93,0],[.8,0,1],[1,.53,0]];
  const glitched=new Map();
  let die=0, ink=false, ignite=0, igniteDur=9000;
  const early=new Map();             // звёзды, зажжённые фразами текста: id -> время
  function lightOne(){
    const W=innerWidth, list=[...GB.orbs.values()].filter(o=>o.x>40&&o.x<W-40&&!early.has(o.entry.id));
    if(!list.length)return;
    const o=pick(list); early.set(o.entry.id,GB.now());
    setTimeout(()=>sky.burst(o.x,o.y),40);
  }
  GB.mod=function(o,gg,nowMs){
    if(ink){
      const e=early.get(o.entry.id);
      if(!ignite&&e===undefined)return false;
      if(o.appear===undefined)o.appear=e!==undefined?e:ignite+Math.random()*igniteDur;
      const k=Math.min(1,Math.max(0,(nowMs-o.appear)/1600));
      if(k<=0)return false;
      gg.a*=k; gg.fresh=0; return;
    }
    if(die>0){
      const id=o.entry.id, s=(Math.sin(id*12.9898)*43758.5453)%1;
      gg.y+=die*die*(20+40*Math.abs(s));
      gg.x+=(Math.random()-.5)*die*3;
      gg.a*=1-die*.55;
      const gl=glitched.get(id);
      if(gl&&gl.until>nowMs){ gg.r=gl.c[0]; gg.g=gl.c[1]; gg.b=gl.c[2]; gg.a=Math.max(gg.a,.9); }
    }
  };

  /* трещины реальности (U-3) */
  let cracks=[];
  function genCracks(){
    cracks=[]; const W=gcv.width,H=gcv.height;
    for(let t=0;t<(tier>=3&&!GB.reduce?5:0);t++){
      const segs=[];
      (function grow(x,y,ang,len,depth){
        if(depth>7||len<8)return;
        const nx=x+Math.cos(ang)*len, ny=y+Math.sin(ang)*len; segs.push([x,y,nx,ny]);
        grow(nx,ny,ang+rnd(-.5,.5),len*rnd(.7,.95),depth+1);
        if(Math.random()<.55)grow(nx,ny,ang+rnd(.5,1.3)*(Math.random()<.5?1:-1),len*rnd(.5,.8),depth+2);
      })(rnd(W*.1,W*.9),rnd(H*.1,H*.9),rnd(0,6.283),rnd(40,90),0);
      cracks.push(segs);
    }
  }
  let accShake=0, accFlash=0, accChrom=0, accDot=0, invDone=false;
  function glitchFrame(i,dt,guests){
    const W=gcv.width,H=gcv.height;
    g.clearRect(0,0,W,H);
    const strong=!weak;
    const bands=rndI(0,strong?Math.ceil(1+i*9):Math.ceil(1+i*2));
    for(let k=0;k<bands;k++){
      g.fillStyle=`rgba(${rndI(0,255)},${rndI(0,255)},${rndI(0,255)},${(strong?.07+i*.35:.05+i*.14).toFixed(2)})`;
      g.fillRect(0,Math.random()*H,W,rndI(1,Math.ceil(1+i*(strong?20:5))));
    }
    if(strong){
      if(Math.random()<i*.7){ g.fillStyle=`rgba(${rndI(0,255)},${rndI(0,255)},${rndI(0,255)},${(.08+i*.3).toFixed(2)})`;
        g.fillRect(Math.random()*W*.8,Math.random()*H,rndI(20,240),rndI(2,Math.ceil(2+i*60))); }
      /* разрыв неба: полоса только что нарисованного кадра, сдвинутая вбок */
      if(Math.random()<i*.45){ const c=sky.canvas, sy=c.height/H, ty=rndI(0,Math.max(1,H-40)), th=rndI(4,30), tx=Math.round(rnd(-46,46)*i);
        try{ g.drawImage(c,0,ty*sy,c.width,th*sy,tx,ty,W,th); }catch(e){} }
      if(Math.random()<i*.35){ g.fillStyle=`rgba(255,255,255,${(i*.06).toFixed(2)})`; g.fillRect(0,Math.random()*H,W,1); }
    }
    if(cracks.length){
      const frac=Math.max(0,(i-.35)/.65);
      if(frac>0){
        g.lineWidth=1;
        cracks.forEach(segs=>{
          const n=Math.ceil(segs.length*Math.min(1,frac*1.2));
          g.strokeStyle=`rgba(255,255,255,${(.18+i*.3).toFixed(2)})`; g.beginPath();
          for(let k=0;k<n;k++){ const s=segs[k]; g.moveTo(s[0],s[1]); g.lineTo(s[2],s[3]); } g.stroke();
          if(i>.7){ g.strokeStyle=`rgba(255,60,90,${(i*.2).toFixed(2)})`; g.beginPath();
            for(let k=0;k<n;k++){ const s=segs[k]; g.moveTo(s[0]+1.5,s[1]); g.lineTo(s[2]+1.5,s[3]); } g.stroke(); }
        });
      }
    }
    /* тряска */
    accShake+=dt;
    if(accShake>.08){ accShake=0;
      if(!GB.reduce&&Math.random()<i*(strong?.5:.25)){ const a=i*(strong?13:6); sky.canvas.style.transform=gcv.style.transform=`translate(${((Math.random()-.5)*a).toFixed(1)}px,${((Math.random()-.5)*a*.35).toFixed(1)}px)`; }
      else sky.canvas.style.transform=gcv.style.transform=''; }
    /* следы сбоят цветом */
    accDot+=dt;
    if(accDot>.14){ accDot=0; const now=GB.now();
      for(const [id,v] of glitched)if(v.until<=now)glitched.delete(id);
      const budget=Math.min(8-glitched.size,rndI(1,strong?Math.ceil(2+i*5):2));
      for(let k=0;k<budget&&guests.length;k++){ if(Math.random()>i*.6)continue; const gg=pick(guests);
        glitched.set(gg.id,{c:pick(GCOL),until:now+rndI(80,Math.max(90,Math.floor(750*(1-i*.7))))}); } }
    /* вспышки */
    accFlash+=dt;
    if(accFlash>.2){ accFlash=0;
      if(!GB.reduce&&Math.random()<i*(strong?.3:.12)){
        flash.style.background=Math.random()<.6?'#fff':pick(['#ff2244','#00ff88','#4488ff','#ffee00','#ff00aa']);
        flash.style.opacity=(.04+i*(strong?.42:.2)).toFixed(2);
        setTimeout(()=>{ flash.style.opacity='0'; },rndI(20,Math.floor(65+i*140))); } }
    /* хроматика и последний крик (U-3) */
    if(tier>=3&&!GB.reduce){
      accChrom+=dt;
      if(accChrom>.4){ accChrom=0; if(Math.random()<i*.5){ sky.canvas.style.filter=`hue-rotate(${rndI(0,360)}deg) saturate(${rnd(1.4,1+i*3.5).toFixed(1)})`; setTimeout(()=>{ sky.canvas.style.filter=''; },rndI(60,200)); } }
      if(i>.84&&!invDone){ invDone=true; let c=0;
        const b=setInterval(()=>{ c++; sky.canvas.style.filter=c%2?'invert(1) brightness(1.2) saturate(2)':'brightness(1.3)'; if(c>=6){ clearInterval(b); sky.canvas.style.filter=''; } },170); }
    }
    if(i>.62)err.classList.toggle('on',Math.random()<.8);
  }
  function stopGlitch(){
    g.clearRect(0,0,gcv.width,gcv.height); gcv.style.display='none';
    sky.canvas.style.transform=''; sky.canvas.style.filter=''; flash.style.opacity='0';
    glitched.clear(); err.classList.remove('on');
  }

  /* набор текста: тикает из часов сценария */
  function typeBox(box,done){
    box.classList.add('on','tw');
    prog.set(box,[...box.children].map(()=>0)); wrong.set(box,[]);
    typing={box,line:0,steps:plan(box.children[0]._chars,0),si:0,acc:0,done};
    renderBox(box);
  }
  function typeTick(dt){
    if(!typing)return;
    const box=typing.box, lines=[...box.children], p=prog.get(box), w=wrong.get(box);
    typing.acc+=dt;
    let changed=false;
    while(typing){
      const st=typing.steps[typing.si];
      if(!st){
        if(typing.line+1<lines.length){
          typing.line++; typing.steps=[{wait:LINE_GAP,n:0}].concat(plan(lines[typing.line]._chars,0)); typing.si=0; changed=true; continue;
        }
        const done=typing.done; typing=null; renderBox(box); done(); return;
      }
      if(typing.acc<st.wait)break;
      typing.acc-=st.wait; typing.si++;
      p[typing.line]=st.n; w[typing.line]=st.wrong||''; changed=true;
      if(st.sentence)lightOne();
    }
    if(changed)renderBox(box);
  }

  /* пепел умершего неба: медленно оседает на белом, пока идут тексты */
  const ash=[]; let ashA=0, ashTarget=0;
  const ASH_N=GB.reduce?0:(tier>=3?46:tier>=2?32:16);
  function ashSpawn(top){ return {x:Math.random()*innerWidth,y:top?-10:Math.random()*innerHeight,vy:rnd(6,15),ph:Math.random()*6.28,
    s:rnd(.6,1.8),rot:Math.random()*3,spin:rnd(-.8,.8),a:rnd(.12,.38),flake:Math.random()<.45}; }
  function ashFrame(dt){
    ashA+=(ashTarget-ashA)*Math.min(1,dt*.6);
    if(ashA<.005&&ashTarget===0){ if(ash.length){ ash.length=0; g.clearRect(0,0,gcv.width,gcv.height); gcv.style.display='none'; } return; }
    gcv.style.display='block';
    while(ash.length<ASH_N)ash.push(ashSpawn(false));
    g.clearRect(0,0,gcv.width,gcv.height);
    const T=clock/1000;
    ash.forEach((p,i)=>{
      p.y+=p.vy*dt; p.x+=Math.sin(T*.6+p.ph)*8*dt; p.rot+=p.spin*dt;
      if(p.y>gcv.height+10)ash[i]=ashSpawn(true);
      g.fillStyle='rgba(40,40,48,'+(p.a*ashA).toFixed(3)+')';
      if(p.flake){ g.save(); g.translate(p.x,p.y); g.rotate(p.rot); g.fillRect(-p.s*1.4,-p.s*.45,p.s*2.8,p.s*.9); g.restore(); }
      else g.fillRect(p.x,p.y,p.s,p.s);
    });
  }

  function toWhite(){
    stopGlitch();
    die=1; sky.st.die=1;
    white.classList.add('on');
    at(3800,()=>{
      /* под белым меняем мир: небо становится белым, звёзды пока не горят */
      ink=true; sky.st.ink=1; sky.st.die=0; sky.st.starA=0; die=0;
      body.classList.add('ink'); ashTarget=1;
      white.classList.add('fast'); white.classList.remove('on');
      at(1400,text1);
    });
  }
  function text1(){
    go('t1');
    typeBox(t1,()=>{
      at(4200,()=>{ t1.classList.add('out');
        at(2400,()=>{ t1.classList.remove('on'); go('void'); at(3200,text2); }); });
    });
  }
  function text2(){
    go('t2');
    typeBox(t2,()=>at(1400,rebirth));
  }
  function rebirth(fast){
    go('stars');
    ignite=GB.now(); igniteDur=fast?2500:9000;
    rampStars(fast?1500:6000);
    musicBack();
    GB.lock=false; ashTarget=0;
    GB.mem.archive=(GB.mem.archive||0)+1; GB.saveMem();
    skip.classList.remove('on');
    at(fast?800:3500,()=>back.classList.add('on'));
  }
  let starRamp=null;
  function rampStars(ms){ starRamp={t0:clock,ms}; }

  /* пропустить: сразу к звёздам на белом */
  if((GB.mem.archive||0)>0) at(2200,()=>{ if(phase!=='stars')skip.classList.add('on'); });
  skip.addEventListener('click',()=>{
    events.length=0; stopGlitch(); musicDie(1);
    ink=true; die=0; sky.st.die=0; sky.st.ink=1; sky.st.starA=0;
    body.classList.add('ink'); white.classList.remove('on'); ashTarget=0;
    typing=null; t1.classList.remove('on'); t2.classList.add('on','tw');
    prog.set(t2,[...t2.children].map(d=>d._chars.length)); renderBox(t2);
    rebirth(true);
  });

  /* тик из кадра неба */
  GB.afterFrame=function(now,fm,guests){
    const dt=Math.min(100,lastNow?now-lastNow:16)*SPEED; lastNow=now;
    clock+=dt; phaseT+=dt;
    for(let k=0;k<events.length;k++){ if(events[k].t<=clock){ const f=events[k].fn; events.splice(k,1); k--; f(); } }
    typeTick(dt);
    if(ink)ashFrame(dt/1000);
    if(phase==='calm'&&phaseT>=calm){
      go('decay'); GB.lock=true; GB.setHover(null);
      sky.st.dur=D/1000; genCracks(); gcv.style.display='block';
      sky.breakConsts(guests);
    }
    if(phase==='decay'){
      const i=Math.min(1,phaseT/D);
      die=i; sky.st.die=Math.max(.0001,i); sky.st.dieT=phaseT/1000;
      glitchFrame(i,dt/1000,guests);
      musicDie(i);
      if(i>=1){ go('dead'); toWhite(); }
    }
    if(starRamp){ const k=Math.min(1,(clock-starRamp.t0)/starRamp.ms); sky.st.starA=k; if(k>=1)starRamp=null; }
  };
}

window.AceonArchive={run};
})();
