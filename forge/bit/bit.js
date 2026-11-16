/* FORGE битмейкер.
   Бит = дорожки по 16 или 32 шага. Все звуки синтезируются Web Audio прямо в браузере (без сэмплов),
   плюс свои звуки с микрофона или из файла (хранятся в IndexedDB «forge-bit», samples).
   Игра идёт планировщиком с запасом ~0.12 с вперёд, сохранение файлом собирается тем же кодом в OfflineAudioContext,
   поэтому файл звучит так же, как в редакторе. Луп можно сразу отправить в звуковую мастерскую. */
(function(){
"use strict";
var $=function(s,r){ return (r||document).querySelector(s); };
var $$=function(s,r){ return [].slice.call((r||document).querySelectorAll(s)); };
var wide=matchMedia("(min-width:960px)");
function el(html, fn){ var d=document.createElement("div"); d.innerHTML=html.trim(); var n=d.firstElementChild; if(fn) fn(n); return n; }
function sh(t){ return el('<div class="sh">'+esc(t)+'</div>'); }
function choice(label, opts, cur, fn){ return el('<div class="f">'+(label?'<label>'+esc(label)+'</label>':'')+'<div class="chips">'+opts.map(function(o){ return '<button data-v="'+o[0]+'" class="'+(String(o[0])===String(cur)?"on":"")+'">'+esc(o[1])+'</button>'; }).join("")+'</div></div>',function(n){
  $$("button",n).forEach(function(x){ x.onclick=function(){ $$("button",n).forEach(function(y){ y.classList.toggle("on",y===x); }); fn(x.getAttribute("data-v")); }; }); }); }
function range(label,v,min,max,step,fmt,fn,done){ return el('<div class="f"><div class="lab"><span>'+esc(label)+'</span><output>'+fmt(v)+'</output></div><input type="range" min="'+min+'" max="'+max+'" step="'+step+'" value="'+v+'"></div>',function(n){
  var o=$("output",n), i=$("input",n), first=true; i.oninput=function(){ if(first){ first=false; remember(); } o.textContent=fmt(Number(i.value)); fn(Number(i.value)); }; i.onchange=function(){ first=true; save(); if(done) done(Number(i.value)); }; }); }
function toggle(label,v,fn){ return el('<label class="tg"><span>'+esc(label)+'</span><input type="checkbox"'+(v?" checked":"")+'></label>',function(n){ $("input",n).onchange=function(){ fn(this.checked); }; }); }
var SV={ add:"M12 5v14M5 12h14", mic:"M12 3a3 3 0 00-3 3v5a3 3 0 006 0V6a3 3 0 00-3-3zM5 11a7 7 0 0014 0M12 18v3", file:"M14 3H6v18h12V7zM14 3v4h4",
  l:"M15 5l-7 7 7 7", r:"M9 5l7 7-7 7", x:"M6 6l12 12M18 6L6 18", play:"M8 5l12 7-12 7z", dup:"M8 8h12v12H8zM4 16V4h12", clr:"M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3",
  zv:"M3 12h4M17 12h4M7 8v8M11 5v14M13 7v10M17 9v6", tap:"M12 3v4M5.6 5.6l2.8 2.8M3 12h4M18.4 5.6l-2.8 2.8M21 12h-4M9 21l3-9 3 9" };
function sv(n){ return '<svg viewBox="0 0 24 24"><path d="'+SV[n]+'"/></svg>'; }

/* ═══════════ хранение ═══════════ */
var dbp=null;
function db(){ if(dbp) return dbp; dbp=new Promise(function(res,rej){ try{ var r=indexedDB.open("forge-bit",1);
  r.onupgradeneeded=function(){ r.result.createObjectStore("beats",{keyPath:"id"}); r.result.createObjectStore("samples"); };
  r.onsuccess=function(){ res(r.result); }; r.onerror=function(){ rej(r.error); }; }catch(e){ rej(e); } }).catch(function(){ return null; }); return dbp; }
function tx(store,mode,fn,dbf){ return (dbf||db)().then(function(d){ if(!d) throw new Error("nodb"); return new Promise(function(res,rej){ var t=d.transaction(store,mode), s=t.objectStore(store), out=fn(s);
  t.oncomplete=function(){ res(out&&out.result!==undefined?out.result:undefined); }; t.onerror=function(){ rej(t.error); }; t.onabort=function(){ rej(t.error); }; }); }); }
function bAll(){ return tx("beats","readonly",function(s){ return s.getAll(); }).catch(function(){ return []; }); }
function bGet(id){ return tx("beats","readonly",function(s){ return s.get(id); }).catch(function(){ return null; }); }
function bPut(b){ return tx("beats","readwrite",function(s){ s.put(b); }); }
function bDel(b){ return tx("beats","readwrite",function(s){ s.delete(b.id); }).then(bAll).then(function(all){
  var used={}; all.forEach(function(q){ (q.tr||[]).forEach(function(t){ if(t.aid) used[t.aid]=1; }); });
  return tx("samples","readwrite",function(s){ (b.tr||[]).forEach(function(t){ if(t.aid&&!used[t.aid]) s.delete(t.aid); }); }); }); }
function sPut(aid,blob){ return tx("samples","readwrite",function(s){ s.put(blob,aid); }); }
function sGet(aid){ return tx("samples","readonly",function(s){ return s.get(aid); }); }
function newId(p){ return (p||"b")+Date.now().toString(36)+Math.random().toString(36).slice(2,6); }

/* ═══════════ звуки ═══════════ */
var TYPES={
  kick:{ n:"Бочка", c:"#ff9a4d", v:["808","сухая","8-бит"] },
  snare:{ n:"Малый", c:"#4fd6c8", v:["классика","лоу-фай","8-бит"] },
  clap:{ n:"Хлопок", c:"#ff5fa2", v:["хлопок","щелчок"] },
  hat:{ n:"Хэт", c:"#ffd166", v:["металл","шум"] },
  ohat:{ n:"Открытый хэт", c:"#e9b949", v:["металл","шум"] },
  tom:{ n:"Том", c:"#a78bfa", v:["низкий","средний","высокий"] },
  rim:{ n:"Римшот", c:"#7ee8d1", v:["римшот"] },
  cow:{ n:"Ковбелл", c:"#ffb4a2", v:["ковбелл"] },
  crash:{ n:"Тарелка", c:"#c3d0db", v:["крэш","райд"] },
  shaker:{ n:"Шейкер", c:"#d4b16a", v:["шейкер"] },
  clave:{ n:"Клаве", c:"#90e0ef", v:["клаве","деревяшка"] },
  bass:{ n:"Бас", c:"#5b8cff", m:1, oct:2, v:["808","резиновый","квадрат"] },
  synth:{ n:"Синт", c:"#c77dff", m:1, oct:4, v:["щипок","колокольчик","8-бит","аккорд"] },
  smp:{ n:"Свой звук", c:"#ff6b6b", v:[] }
};
var ADD=["kick","snare","clap","hat","ohat","tom","rim","cow","crash","shaker","clave","bass","synth"];
var KEYS=["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"];
var SCALES={ minor:[0,2,3,5,7,8,10], major:[0,2,4,5,7,9,11], pent:[0,3,5,7,10], blues:[0,3,5,6,7,10] };
var SCN={ minor:"минор", major:"мажор", pent:"пентатоника", blues:"блюз" };
var VEL=[0,.42,.8,1,.72], ROWS=10;
function semi(d){ var s=SCALES[P.sc]||SCALES.minor, n=s.length, o=Math.floor(d/n), r=((d%n)+n)%n; return s[r]+12*o; }
function midi(tr,d){ return 12*((tr.oct==null?4:tr.oct)+1)+P.key+semi(d); }
function hz(m){ return 440*Math.pow(2,(m-69)/12); }
function noteName(tr,d){ var m=midi(tr,d); return KEYS[m%12]+(Math.floor(m/12)-1); }

var AC=null; function ac(){ if(!AC){ AC=new (window.AudioContext||window.webkitAudioContext)(); } if(AC.state==="suspended") AC.resume(); return AC; }
var SR=44100, BUF={};
function loadSmp(aid){ if(BUF[aid]) return Promise.resolve(BUF[aid]); return sGet(aid).then(function(b){ if(!b) throw 0; return b.arrayBuffer(); })
  .then(function(ab){ return new Promise(function(res,rej){ var p=ac().decodeAudioData(ab,res,rej); if(p&&p.then) p.then(res,rej); }); }).then(function(b){ BUF[aid]=b; return b; }); }
function nz(ctx){ if(ctx.__nz) return ctx.__nz; var n=ctx.sampleRate*2, b=ctx.createBuffer(1,n,ctx.sampleRate), a=b.getChannelData(0); for(var i=0;i<n;i++) a[i]=Math.random()*2-1; ctx.__nz=b; return b; }
/* огибающая громкости: быстрый подъём и затухание */
function eg(ctx,out,t,peak,a,d){ var g=ctx.createGain(); g.gain.setValueAtTime(0.0001,t); g.gain.exponentialRampToValueAtTime(Math.max(.0002,peak),t+a); g.gain.exponentialRampToValueAtTime(0.0001,t+a+d); g.connect(out); return g; }
function osc(ctx,type,f,t,end){ var o=ctx.createOscillator(); o.type=type; o.frequency.setValueAtTime(f,t); o.start(t); o.stop(end+.05); return o; }
function noise(ctx,t,end){ var s=ctx.createBufferSource(); s.buffer=nz(ctx); s.loop=true; s.start(t,Math.random()*1.5); s.stop(end+.05); return s; }
function filt(ctx,type,f,q){ var b=ctx.createBiquadFilter(); b.type=type; b.frequency.value=f; if(q!=null) b.Q.value=q; return b; }
function sat(ctx,k){ var w=ctx.createWaveShaper(), c=new Float32Array(512); for(var i=0;i<512;i++){ var x=i/256-1; c[i]=(1+k)*x/(1+k*Math.abs(x)); } w.curve=c; return w; }
function metal(ctx,f,t,end,out){ [2,3,4.16,5.43,6.79,8.21].forEach(function(r){ osc(ctx,"square",f*r,t,end).connect(out); }); }
/* один удар дорожки: ctx (живой или офлайн), out (вход дорожки), время, сила, ступень лада для басов и синтов */
function hit(ctx,out,tr,t,vel,d,sd){
  var p=Math.pow(2,(tr.pit||0)/12), D=tr.dec||1, v=tr.v||0, e, f, g, o, n;
  switch(tr.t){
  case "kick":
    if(v===0){ e=t+.9*D; g=eg(ctx,out,t,vel,.004,.9*D); var s=sat(ctx,1.5); s.connect(g); o=osc(ctx,"sine",150*p,t,e); o.frequency.exponentialRampToValueAtTime(46*p,t+.13); o.connect(s); }
    else if(v===1){ e=t+.32*D; g=eg(ctx,out,t,vel,.002,.3*D); o=osc(ctx,"sine",190*p,t,e); o.frequency.exponentialRampToValueAtTime(55*p,t+.06); o.connect(g);
      n=noise(ctx,t,t+.03); f=filt(ctx,"highpass",2500); n.connect(f); f.connect(eg(ctx,out,t,vel*.35,.001,.012)); }
    else { e=t+.25*D; g=eg(ctx,out,t,vel*.55,.002,.22*D); f=filt(ctx,"lowpass",1300); f.connect(g); o=osc(ctx,"square",125*p,t,e); o.frequency.exponentialRampToValueAtTime(40*p,t+.1); o.connect(f); }
    break;
  case "snare":
    if(v===0){ n=noise(ctx,t,t+.25*D); f=filt(ctx,"bandpass",1900,.8); n.connect(f); f.connect(eg(ctx,out,t,vel*.75,.001,.2*D));
      o=osc(ctx,"triangle",190*p,t,t+.12); o.frequency.exponentialRampToValueAtTime(150*p,t+.1); o.connect(eg(ctx,out,t,vel*.5,.001,.09*D)); }
    else if(v===1){ n=noise(ctx,t,t+.32*D); f=filt(ctx,"lowpass",3400); var h=filt(ctx,"highpass",600); n.connect(f); f.connect(h); h.connect(eg(ctx,out,t,vel*.6,.004,.28*D));
      osc(ctx,"sine",210*p,t,t+.14).connect(eg(ctx,out,t,vel*.45,.002,.12*D)); }
    else { n=noise(ctx,t,t+.15*D); f=filt(ctx,"highpass",1000); n.connect(f); f.connect(eg(ctx,out,t,vel*.5,.001,.12*D));
      o=osc(ctx,"square",230*p,t,t+.08); o.frequency.exponentialRampToValueAtTime(170*p,t+.06); f=filt(ctx,"lowpass",2000); o.connect(f); f.connect(eg(ctx,out,t,vel*.28,.001,.06)); }
    break;
  case "clap":
    if(v===0){ n=noise(ctx,t,t+.3*D); f=filt(ctx,"bandpass",1150*p,1.4); n.connect(f);
      [0,.011,.022].forEach(function(k){ f.connect(eg(ctx,out,t+k,vel*.5,.001,.018)); }); f.connect(eg(ctx,out,t+.03,vel*.42,.001,.18*D)); }
    else { n=noise(ctx,t,t+.1*D); f=filt(ctx,"bandpass",2600*p,2); n.connect(f); f.connect(eg(ctx,out,t,vel*1.3,.001,.06*D)); osc(ctx,"sine",1800*p,t,t+.03).connect(eg(ctx,out,t,vel*.2,.001,.02)); }
    break;
  case "hat": case "ohat":
    var open=tr.t==="ohat", dd=(open?.42:.05)*D, cg=ctx.createGain(); cg.connect(out);
    if(!open&&ctx.__ohc&&ctx.__ohT<t){ var c=ctx.__ohc; c.gain.setValueAtTime(1,t); c.gain.setTargetAtTime(0,t,.012); ctx.__ohc=null; }
    if(open){ ctx.__ohc=cg; ctx.__ohT=t; }
    g=eg(ctx,cg,t,vel*(v===0?.8:.45),.001,dd); var hp=filt(ctx,"highpass",v===0?7000:7600); hp.connect(g);
    if(v===0){ var bp=filt(ctx,"bandpass",10000*p,.6); bp.connect(hp); metal(ctx,40*p,t,t+dd+.02,bp); } else { n=noise(ctx,t,t+dd+.02); n.connect(hp); }
    break;
  case "tom":
    var b=[95,145,210][v]*p; o=osc(ctx,"sine",b*1.5,t,t+.4*D); o.frequency.exponentialRampToValueAtTime(b,t+.08); o.connect(eg(ctx,out,t,vel*.8,.002,.35*D));
    n=noise(ctx,t,t+.02); f=filt(ctx,"bandpass",b*8,1); n.connect(f); f.connect(eg(ctx,out,t,vel*.15,.001,.01));
    break;
  case "rim":
    osc(ctx,"triangle",1700*p,t,t+.05).connect(eg(ctx,out,t,vel*.5,.001,.03*D)); n=noise(ctx,t,t+.03); f=filt(ctx,"bandpass",3500*p,1); n.connect(f); f.connect(eg(ctx,out,t,vel*.4,.001,.02));
    break;
  case "cow":
    g=eg(ctx,out,t,vel*.35,.001,.3*D); f=filt(ctx,"bandpass",800*p,1.2); f.connect(g); osc(ctx,"square",545*p,t,t+.35*D).connect(f); osc(ctx,"square",815*p,t,t+.35*D).connect(f);
    break;
  case "crash":
    if(v===0){ n=noise(ctx,t,t+1.7*D); f=filt(ctx,"highpass",4500*p); n.connect(f); f.connect(eg(ctx,out,t,vel*.32,.002,1.6*D)); g=eg(ctx,out,t,vel*.06,.002,1.2*D); metal(ctx,60*p,t,t+1.3*D,g); }
    else { g=eg(ctx,out,t,vel*.3,.001,.9*D); f=filt(ctx,"bandpass",8000*p,.8); f.connect(g); metal(ctx,52*p,t,t+.95*D,f); n=noise(ctx,t,t+.5*D); var f2=filt(ctx,"bandpass",9000*p,3); n.connect(f2); f2.connect(eg(ctx,out,t,vel*.1,.001,.45*D)); }
    break;
  case "shaker":
    n=noise(ctx,t,t+.1*D); f=filt(ctx,"highpass",6500*p); n.connect(f); f.connect(eg(ctx,out,t,vel*.32,.02,.05*D));
    break;
  case "clave":
    if(v===0) osc(ctx,"sine",2500*p,t,t+.08).connect(eg(ctx,out,t,vel*.55,.001,.06*D)); else osc(ctx,"triangle",900*p,t,t+.1).connect(eg(ctx,out,t,vel*.7,.001,.07*D));
    break;
  case "bass":
    var fq=hz(midi(tr,d))*p;
    if(v===0){ e=t+.75*D; g=eg(ctx,out,t,vel*.85,.004,.7*D); var s2=sat(ctx,2); s2.connect(g); o=osc(ctx,"sine",fq*1.08,t,e); o.frequency.exponentialRampToValueAtTime(fq,t+.05); o.connect(s2); }
    else if(v===1){ e=t+.4*D; g=eg(ctx,out,t,vel*.45,.004,.36*D); f=filt(ctx,"lowpass",1500,6); f.frequency.setValueAtTime(1500,t); f.frequency.exponentialRampToValueAtTime(170,t+.26*D); f.connect(g);
      osc(ctx,"sawtooth",fq,t,e).connect(f); osc(ctx,"sawtooth",fq*1.006,t,e).connect(f); }
    else { e=t+.33*D; g=eg(ctx,out,t,vel*.6,.003,.3*D); f=filt(ctx,"lowpass",900); f.connect(g); osc(ctx,"square",fq,t,e).connect(f); }
    break;
  case "synth":
    var fs=hz(midi(tr,d))*p;
    if(v===0){ e=t+.5*D; g=eg(ctx,out,t,vel*.26,.003,.45*D); f=filt(ctx,"lowpass",3500,2); f.frequency.setValueAtTime(3500,t); f.frequency.exponentialRampToValueAtTime(450,t+.3*D); f.connect(g);
      osc(ctx,"sawtooth",fs,t,e).connect(f); osc(ctx,"sawtooth",fs*1.007,t,e).connect(f); }
    else if(v===1){ e=t+1.25*D; g=eg(ctx,out,t,vel*.4,.002,1.2*D); osc(ctx,"sine",fs,t,e).connect(g); var g2=ctx.createGain(); g2.gain.value=.35; g2.connect(g); osc(ctx,"sine",fs*2.76,t,e).connect(g2); }
    else if(v===2){ osc(ctx,"square",fs,t,t+.2*D).connect(eg(ctx,out,t,vel*.4,.002,.18*D)); }
    else { e=t+.65*D; g=eg(ctx,out,t,vel*.25,.012,.6*D); f=filt(ctx,"lowpass",2200); f.connect(g); [0,2,4].forEach(function(k){ osc(ctx,"sawtooth",hz(midi(tr,d+k))*p,t,e).connect(f); }); }
    break;
  case "smp":
    var bf=BUF[tr.aid]; if(!bf) return; var src=ctx.createBufferSource(); src.buffer=bf; src.playbackRate.value=p;
    var len=bf.duration/p*Math.min(1,D); g=ctx.createGain(); g.gain.setValueAtTime(vel,t); g.gain.setValueAtTime(vel,t+Math.max(.005,len-.012)); g.gain.linearRampToValueAtTime(0,t+len); src.connect(g); g.connect(out); src.start(t); src.stop(t+len+.02);
    break;
  }
}
/* общий выход: дорожки (громкость, панорама) -> общая громкость -> мягкий ограничитель.
   До 0.7 звук идёт как есть, выше плавно прижимается к 1, поэтому громкий бит не хрипит.
   Встроенный DynamicsCompressor не взяли: в Chrome он заметно глушит даже тихий звук. */
var LIM=null;
function limCurve(){ if(LIM) return LIM; LIM=new Float32Array(2049); for(var i=0;i<2049;i++){ var x=(i/1024-1)*2, a=Math.abs(x); LIM[i]=(a<.7?a:.7+.3*Math.tanh((a-.7)/.3))*(x<0?-1:1); } return LIM; }
function buildOut(ctx){ var m=ctx.createGain(), pre=ctx.createGain(), w=ctx.createWaveShaper(); pre.gain.value=.5; w.curve=limCurve(); w.oversample="2x";
  m.connect(pre); pre.connect(w); w.connect(ctx.destination); return { ctx:ctx, m:m, tr:{} }; }
function node(O,tr){ var n=O.tr[tr.id]; if(!n){ var ctx=O.ctx, g=ctx.createGain(), pn=ctx.createStereoPanner?ctx.createStereoPanner():null; if(pn){ g.connect(pn); pn.connect(O.m); } else g.connect(O.m); n=O.tr[tr.id]={g:g,pn:pn}; }
  n.g.gain.value=tr.vol==null?.8:tr.vol; if(n.pn) n.pn.pan.value=tr.pan||0; return n.g; }
function liveParams(){ if(!O||!P) return; O.m.gain.value=P.mv==null?.75:P.mv; P.tr.forEach(function(t){ node(O,t); }); }
function audible(tr){ var solo=P.tr.some(function(t){ return t.solo; }); return !tr.mute&&(!solo||tr.solo); }
function playStep(O,i,t,sd){ P.tr.forEach(function(tr){ if(!audible(tr)) return; var v=tr.st[i]; if(!v) return; var out=node(O,tr), d=tr.nt?tr.nt[i]||0:0;
  if(v===4){ hit(O.ctx,out,tr,t,VEL[4],d,sd); hit(O.ctx,out,tr,t+sd/2,VEL[4]*.85,d,sd); } else hit(O.ctx,out,tr,t,VEL[v],d,sd); }); }

/* ═══════════ бит и шаблоны ═══════════ */
var P=null, O=null;
function stepDur(){ return 60/P.bpm/4; }
function swingT(i){ return i%2?stepDur()*P.sw/200:0; }
function mkTrack(t,v,opts){ var T=TYPES[t], tr={ id:newId("t"), t:t, v:v||0, vol:.8, pan:0, pit:0, dec:1, mute:false, solo:false, st:[] };
  if(T.m){ tr.oct=T.oct; tr.nt=[]; tr.ln=0; } for(var k in (opts||{})) tr[k]=opts[k]; fitLen(tr,P?P.len:16); return tr; }
function fitLen(tr,len){ while(tr.st.length<len) tr.st.push(tr.st.length>=16?tr.st[tr.st.length-16]||0:0); tr.st.length=len;
  if(tr.nt){ while(tr.nt.length<len) tr.nt.push(tr.nt.length>=16?tr.nt[tr.nt.length-16]||0:0); tr.nt.length=len; } }
function newBeat(){ return { v:1, id:newId(), title:TR("Новый бит"), bpm:100, sw:0, len:16, key:9, sc:"minor", mv:.75, tr:[], ex:{n:4,fmt:"wav",seam:true}, updated:Date.now() }; }
var TPL=[
 { id:"hiphop", n:"Хип-хоп", d:"Олдскульный бум-бэп с ленивым свингом", bpm:90, sw:22, key:9, sc:"minor", tr:[["kick",1,"x.....x...x..x.."],["snare",1,"....x.......x..."],["hat",0,"x.o.x.o.x.o.x.ox",{vol:.6}],["bass",1,"0.....0...3..2..",{dec:1.3}]] },
 { id:"trap", n:"Трэп", d:"Длинный бас 808 и дроби на хэтах", bpm:140, sw:0, key:6, sc:"minor", tr:[["kick",0,"x......x..x....."],["clap",0,"........x......."],["hat",0,"x.x.x.xrx.x.x.rr",{vol:.55}],["bass",0,"0......0..3.....",{oct:1,dec:1.6}],["synth",1,"0...2...4...2...",{oct:5,vol:.35}]] },
 { id:"house", n:"Хаус", d:"Ровная бочка на каждую долю, хэт между ними", bpm:124, sw:0, key:9, sc:"minor", tr:[["kick",1,"x...x...x...x..."],["clap",0,"....x.......x..."],["ohat",0,"..x...x...x...x.",{vol:.6}],["shaker",0,"oooooooooooooooo",{vol:.5}],["bass",2,"..0...0...0..30."],["synth",3,"...0.....0......",{vol:.5}]] },
 { id:"techno", n:"Техно", d:"Плотный катящийся бас и римшоты", bpm:130, sw:0, key:2, sc:"minor", tr:[["kick",1,"x...x...x...x..."],["ohat",1,"..x...x...x...x.",{vol:.55}],["rim",0,"...x..x....x..x.",{vol:.6}],["clap",0,"....x.......x...",{vol:.5}],["bass",1,"..00..00..00..03"]] },
 { id:"dnb", n:"Драм-н-бэйс", d:"Быстро: 172 удара в минуту, ломаный ритм", bpm:172, sw:0, key:4, sc:"minor", tr:[["kick",1,"x.........x....."],["snare",0,"....x.......x..."],["hat",0,"x.x.x.x.x.xox.x.",{vol:.55}],["crash",0,"x...............",{vol:.4}],["bass",1,"0.......0...2...",{dec:1.8}]] },
 { id:"lofi", n:"Лоу-фай", d:"Медленно, мягко, с аккордами для учёбы", bpm:80, sw:30, key:5, sc:"major", tr:[["kick",1,"x......x..x....."],["snare",1,"....x.......x..."],["hat",1,"x.xox.x.x.xox.xo",{vol:.45}],["synth",3,"0.......3.......",{dec:1.6,vol:.6}],["synth",1,"4...2...1...0...",{oct:5,vol:.3}]] },
 { id:"reggaeton", n:"Реггетон", d:"Ритм дембоу: бочка и малый вперевалку", bpm:95, sw:0, key:7, sc:"minor", tr:[["kick",0,"x...x...x...x..."],["snare",0,"...x..x....x..x."],["hat",0,"x.x.x.x.x.x.x.x.",{vol:.45}],["bass",0,"0...0...3...3...",{oct:1}]] },
 { id:"disco", n:"Диско", d:"Бас прыгает октавами, хэт шипит на слабых долях", bpm:118, sw:0, key:9, sc:"minor", tr:[["kick",1,"x...x...x...x..."],["clap",0,"....x.......x..."],["ohat",0,"..x...x...x...x.",{vol:.6}],["hat",0,"x...x...x...x...",{vol:.45}],["bass",1,"0.7.0.7.3.3.4.4."]] },
 { id:"rock", n:"Рок", d:"Живой барабанщик: бочка, малый, тарелка", bpm:110, sw:0, key:4, sc:"minor", tr:[["kick",1,"x.......x.x....."],["snare",0,"....x.......x..."],["hat",0,"x.x.x.x.x.x.x.x.",{vol:.55}],["crash",0,"x...............",{vol:.45}],["tom",1,"..............xx",{vol:.7}],["bass",1,"0.0.0.0.0.0.3.3."]] },
 { id:"afro", n:"Афробит", d:"Клаве, шейкер и пружинящий бас", bpm:108, sw:10, key:0, sc:"major", tr:[["kick",1,"x..x..x...x..x.."],["rim",0,"...x..x....x..x.",{vol:.6}],["shaker",0,"xoxxxoxxxoxxxoxx",{vol:.45}],["clave",0,"x..x..x...x.x..."],["bass",0,"0..0..3...4..3.."],["synth",0,"..2...4...2...0.",{vol:.4}]] },
 { id:"chip", n:"8-бит", d:"Звук старой приставки", bpm:150, sw:0, key:0, sc:"major", tr:[["kick",2,"x.......x.x....."],["snare",2,"....x.......x..."],["hat",1,"x.x.x.x.x.x.x.x.",{vol:.45}],["bass",2,"0.0.0.0.3.3.4.4."],["synth",2,"0.2.4.7.4.2.0.2.",{vol:.6}]] }
];
function fromTpl(t){ var keep=P, b=newBeat(); P=b; b.title=TR(t.n); b.bpm=t.bpm; b.sw=t.sw; b.key=t.key; b.sc=t.sc;
  b.tr=t.tr.map(function(x){ var tr=mkTrack(x[0],x[1],x[3]); x[2].split("").forEach(function(ch,i){ if(TYPES[x[0]].m){ if(/\d/.test(ch)){ tr.st[i]=2; tr.nt[i]=+ch; } } else tr.st[i]={".":0,o:1,x:2,X:3,r:4}[ch]||0; }); return tr; });
  P=keep; return b; }
function blank(){ var keep=P, b=newBeat(); P=b; b.tr=[mkTrack("kick",1),mkTrack("snare",0),mkTrack("hat",0,{vol:.6}),mkTrack("bass",1)]; P=keep; return b; }

/* ═══════════ игра ═══════════ */
var PL={ on:false, step:0, next:0, iv:0, q:[] }, nowStep=-1;
function start(){ if(!P) return; var a=ac(); if(!O||O.ctx!==a) O=buildOut(a); liveParams(); PL.on=true; PL.step=0; PL.next=a.currentTime+.08; PL.q=[]; sched(); clearInterval(PL.iv); PL.iv=setInterval(sched,25); playUi(); raf(); }
function stop(){ PL.on=false; clearInterval(PL.iv); PL.q=[]; setNow(-1); playUi(); }
function sched(){ if(!PL.on) return; var a=AC, ahead=document.hidden?1.6:.12;
  while(PL.next<a.currentTime+ahead){ var i=PL.step%P.len; playStep(O,i,PL.next+swingT(i),stepDur()); PL.q.push([i,PL.next+swingT(i)]); PL.next+=stepDur(); PL.step=(i+1)%P.len; } }
function raf(){ if(!PL.on) return; var t=AC.currentTime, cur=-1; while(PL.q.length&&PL.q[0][1]<=t){ cur=PL.q.shift()[0]; } if(cur>=0) setNow(cur); requestAnimationFrame(raf); }
function playUi(){ $("#playBtn").classList.toggle("on",PL.on); }
$("#playBtn").onclick=function(){ if(PL.on) stop(); else start(); };
function preview(tr,i){ var a=ac(); if(!O||O.ctx!==a) O=buildOut(a); liveParams(); if(PL.on) return; hit(a,node(O,tr),tr,a.currentTime+.01,VEL[2],tr.nt?(i==null?tr.ln||0:tr.nt[i]||0):0,stepDur()); }

/* ═══════════ сетка ═══════════ */
var BR=2, page=0, selT=0, CELLS=[];
function visR(){ if(wide.matches||P.len===16) return [0,P.len]; page=Math.min(page,1); return [page*16,page*16+16]; }
function tname(tr){ return tr.nm||TR(TYPES[tr.t].n); }
function vname(tr){ var T=TYPES[tr.t]; return tr.t==="smp"?TR("свой"):(T.v.length>1?TR(T.v[tr.v]):""); }
function grid(){ var g=$("#grid"); g.innerHTML=""; CELLS=[]; nowStep=-1; if(!P) return; var r=visR(), n=r[1]-r[0];
  $("#pages").hidden=wide.matches||P.len===16; $$("#pages button").forEach(function(b){ b.classList.toggle("on",+b.getAttribute("data-p")===page); });
  var h=el('<div class="gr hd"><span class="tn"></span><span class="ms"></span><div class="cs" style="--n:'+n+'"></div></div>'), hc=$(".cs",h);
  for(var i=r[0];i<r[1];i++) hc.appendChild(el('<i class="'+(i%4===0?"b":"")+'">'+(i%4===0?(i/4+1):"")+'</i>'));
  g.appendChild(h);
  P.tr.forEach(function(tr,ti){ var row=el('<div class="gr'+(ti===selT?" sel":"")+(audible(tr)?"":" off")+'" style="--c:'+TYPES[tr.t].c+'"><button class="tn" data-ti="'+ti+'"><b data-nt></b><small data-nt></small></button><span class="ms"><button data-m="'+ti+'" class="'+(tr.mute?"on":"")+'" title="'+esc(TR("Заглушить"))+'">M</button><button data-s="'+ti+'" class="'+(tr.solo?"on":"")+'" title="'+esc(TR("Только эта"))+'">S</button></span><div class="cs" style="--n:'+n+'"></div></div>');
    $("b",row).textContent=tname(tr); $("small",row).textContent=vname(tr); var cs=$(".cs",row);
    for(var i=r[0];i<r[1];i++){ var c=el('<button class="c" data-t="'+ti+'" data-i="'+i+'"></button>'); paintCell(c,tr,i); cs.appendChild(c); (CELLS[i]=CELLS[i]||[]).push(c); }
    g.appendChild(row); });
  if(!P.tr.length) g.appendChild(el('<div class="gempty">'+esc(TR("Дорожек пока нет. Добавьте бочку, малый или свой звук во вкладке «Звуки»."))+'</div>'));
}
function paintCell(c,tr,i){ var v=tr.st[i]||0; c.className="c v"+v+(i%4===0?" b":""); c.innerHTML=v&&tr.nt?'<em>'+esc(noteName(tr,tr.nt[i]||0).replace(/\d+$/,""))+'</em>':""; }
function setNow(i){ if(i===nowStep) return; if(CELLS[nowStep]) CELLS[nowStep].forEach(function(c){ c.classList.remove("now"); }); nowStep=i; if(CELLS[i]) CELLS[i].forEach(function(c){ c.classList.add("now"); }); }
function setCell(ti,i,v){ var tr=P.tr[ti]; tr.st[i]=v; if(v&&tr.nt&&tr.nt[i]==null) tr.nt[i]=tr.ln||0; var c=$('#grid .c[data-t="'+ti+'"][data-i="'+i+'"]'); if(c) paintCell(c,tr,i); }
/* рисование: мышь ставит сразу и красит протяжкой; палец ставит по отпусканию, протяжка вбок красит, вверх-вниз листает */
var pt=null, gridEl=$("#grid");
gridEl.addEventListener("pointerdown",function(e){ var c=e.target.closest(".c"); if(!c||e.button>0) return; var ti=+c.dataset.t, i=+c.dataset.i, tr=P.tr[ti];
  pt={ ti:ti, i:i, v:tr.st[i]===BR?0:BR, x:e.clientX, y:e.clientY, on:false, done:{}, touch:e.pointerType!=="mouse" };
  if(!pt.touch){ e.preventDefault(); begin(); } });
function begin(){ pt.on=true; remember(); pt.done[pt.i]=1; setCell(pt.ti,pt.i,pt.v); if(pt.v) preview(P.tr[pt.ti],pt.i); }
addEventListener("pointermove",function(e){ if(!pt) return;
  if(!pt.on){ var dx=Math.abs(e.clientX-pt.x), dy=Math.abs(e.clientY-pt.y); if(dy>8&&dy>dx){ pt=null; return; } if(dx>6) begin(); else return; }
  var t=document.elementFromPoint(e.clientX,e.clientY), c=t&&t.closest&&t.closest(".c"); if(!c||+c.dataset.t!==pt.ti) return; var i=+c.dataset.i; if(pt.done[i]) return; pt.done[i]=1; setCell(pt.ti,i,pt.v); });
addEventListener("pointerup",function(){ if(!pt) return; if(!pt.on) begin(); pt=null; save(); if(ui.sheet==="insp"||wide.matches) refreshInsp(); });
addEventListener("pointercancel",function(){ if(pt&&pt.on) save(); pt=null; });
gridEl.addEventListener("click",function(e){ var b=e.target.closest(".tn[data-ti],[data-m],[data-s]"); if(!b) return;
  if(b.hasAttribute("data-ti")){ selT=+b.getAttribute("data-ti"); $$("#grid .gr").forEach(function(r,k){ r.classList.toggle("sel",k-1===selT); }); preview(P.tr[selT]); if(wide.matches) refreshInsp(); else { openInsp(); var row=b.closest(".gr"); setTimeout(function(){ row.scrollIntoView({block:"nearest",behavior:"smooth"}); },260); } return; }
  remember(); var m=b.hasAttribute("data-m"), tr=P.tr[+b.getAttribute(m?"data-m":"data-s")]; if(m) tr.mute=!tr.mute; else tr.solo=!tr.solo; grid(); save(); refreshInsp(); });
$("#brush").addEventListener("click",function(e){ var b=e.target.closest("button"); if(!b) return; BR=+b.getAttribute("data-v"); $$("#brush button").forEach(function(x){ x.classList.toggle("on",x===b); }); });
$$("#pages button").forEach(function(b){ b.onclick=function(){ page=+b.getAttribute("data-p"); grid(); refreshInsp(); }; });
function bpmUi(){ $("#bpm").textContent=P?P.bpm:""; }
function bpmBy(d){ remember(); P.bpm=Math.max(50,Math.min(200,P.bpm+d)); bpmUi(); save(); if(ui.tab==="beat") refreshPane(); }
$("#bpmM").onclick=function(){ bpmBy(-1); }; $("#bpmP").onclick=function(){ bpmBy(1); };
var taps=[];
function tap(){ var n=performance.now(); taps=taps.filter(function(t){ return n-t<2500; }); taps.push(n); if(taps.length>=3){ var d=(taps[taps.length-1]-taps[0])/(taps.length-1); remember(); P.bpm=Math.max(50,Math.min(200,Math.round(60000/d))); bpmUi(); save(); refreshPane(); }
  toast(taps.length<3?TR("Стучите дальше в ритм"):TR("Темп: {0}",P.bpm)); }

/* ═══════════ свой звук: микрофон и файл ═══════════ */
function trimNorm(b){ var a=b.getChannelData(0), R=b.numberOfChannels>1?b.getChannelData(1):a, n=a.length, s=0, e=n-1, pk=0;
  while(s<n&&Math.abs(a[s])<.03&&Math.abs(R[s])<.03) s++; while(e>s&&Math.abs(a[e])<.01&&Math.abs(R[e])<.01) e--;
  s=Math.max(0,s-Math.floor(SR*.005)); e=Math.min(n,e+Math.floor(b.sampleRate*.05)); var max=Math.min(e,s+Math.floor(b.sampleRate*10));
  var out=new Float32Array(Math.max(1,max-s)); for(var i=0;i<out.length;i++){ var v=(a[s+i]+R[s+i])/2; out[i]=v; if(Math.abs(v)>pk) pk=Math.abs(v); }
  var k=pk>0?.95/pk:1, fd=Math.min(out.length,Math.floor(b.sampleRate*.01)); for(i=0;i<out.length;i++){ out[i]*=k; if(i>out.length-fd) out[i]*=(out.length-i)/fd; }
  return wav([out],b.sampleRate); }
var reTo=null; /* дорожка, которой меняем звук; иначе свой звук добавляется новой дорожкой */
function addSmp(blob,name){ return blob.arrayBuffer().then(function(ab){ return new Promise(function(res,rej){ var p=ac().decodeAudioData(ab,res,rej); if(p&&p.then) p.then(res,rej); }); })
  .then(function(b){ var w=trimNorm(b), aid=newId("s"); return sPut(aid,w).then(function(){ return loadSmp(aid); }).then(function(){ remember(); var tr;
    if(reTo&&P.tr.indexOf(reTo)>=0){ tr=reTo; tr.aid=aid; tr.nm=name; selT=P.tr.indexOf(tr); } else { tr=mkTrack("smp",0,{aid:aid,nm:name}); P.tr.push(tr); selT=P.tr.length-1; } reTo=null; grid(); save(); refresh(); preview(tr); toast(TR("Добавлено: {0}",name)); }); })
  .catch(function(){ toast(TR("Этот файл браузер прочитать не смог")); }); }
function pickFile(){ var f=$("#fIn"); f.value=""; f.onchange=function(){ var x=f.files[0]; if(x){ if(x.size>40*1024*1024){ toast(TR("Файл слишком большой для звука")); return; } addSmp(x,x.name.replace(/\.[^.]+$/,"").slice(0,24)); } }; f.click(); }
function record(){
  if(!navigator.mediaDevices||!window.MediaRecorder){ toast(TR("Этот браузер не умеет записывать звук")); return; }
  var was=PL.on;
  navigator.mediaDevices.getUserMedia({audio:{echoCancellation:false,noiseSuppression:false,autoGainControl:true}}).then(function(stream){
    var rec=new MediaRecorder(stream), parts=[], t0=Date.now(), a=ac(), an=a.createAnalyser(), sn=a.createMediaStreamSource(stream), data=new Uint8Array(512), raf2=0, cancel=false, auto=0; an.fftSize=1024; sn.connect(an);
    modal('<div class="recbox"><h3><span class="recdot"></span>'+esc(TR("Идёт запись"))+'</h3><div class="rt" id="rT">0.0</div><div class="lv"><i id="rL"></i></div><div class="row"><button class="btn" id="rX">Отмена</button><button class="btn go" id="rS">Готово</button></div><p class="note" style="margin-top:10px">Хлопните, щёлкните, скажите «эй» или ударьте по столу. До 4 секунд, тишину по краям уберу сам.</p></div>');
    (function loop(){ an.getByteTimeDomainData(data); var m=0; for(var i=0;i<data.length;i++){ var v=Math.abs(data[i]-128); if(v>m) m=v; } var rl=$("#rL"); if(rl) rl.style.width=Math.min(100,m/128*140)+"%"; var rt=$("#rT"); if(rt) rt.textContent=((Date.now()-t0)/1000).toFixed(1); raf2=requestAnimationFrame(loop); })();
    rec.ondataavailable=function(e){ if(e.data&&e.data.size) parts.push(e.data); };
    rec.onstop=function(){ clearTimeout(auto); cancelAnimationFrame(raf2); stream.getTracks().forEach(function(t){ t.stop(); }); try{ sn.disconnect(); }catch(e){} closeModal();
      if(cancel||!parts.length){ reTo=null; return; } var n=P.tr.filter(function(t){ return t.t==="smp"; }).length+1; addSmp(new Blob(parts,{type:rec.mimeType||"audio/webm"}),TR("Мой звук {0}",n)); };
    $("#rS").onclick=function(){ if(rec.state!=="inactive") rec.stop(); }; $("#rX").onclick=function(){ cancel=true; if(rec.state!=="inactive") rec.stop(); };
    rec.start(100); auto=setTimeout(function(){ if(rec.state!=="inactive") rec.stop(); },4000);
  }).catch(function(){ toast(TR("Нет доступа к микрофону. Разрешите его в настройках браузера")); });
}

/* ═══════════ сохранение файлом ═══════════ */
function render(n,seam){ var sd=stepDur(), L=P.len*sd, T=L*n, tail=2.5, ctx=new (window.OfflineAudioContext||window.webkitOfflineAudioContext)(2,Math.ceil((T+tail)*SR),SR), O2=buildOut(ctx);
  O2.m.gain.value=P.mv==null?.75:P.mv;
  for(var k=0;k<n;k++) for(var i=0;i<P.len;i++) playStep(O2,i,k*L+i*sd+swingT(i)+.0005,sd);
  return new Promise(function(res,rej){ ctx.oncomplete=function(e){ res(e.renderedBuffer); }; var pr=ctx.startRendering(); if(pr&&pr.then) pr.then(res,rej); }).then(function(b){
    var N=Math.round(T*SR), chs=[0,1].map(function(c){ return b.getChannelData(c); }), out;
    if(seam){ /* хвост звука после конца лупа накладываем на начало: при повторе по кругу шва не слышно */
      out=chs.map(function(a){ var o=new Float32Array(N); o.set(a.subarray(0,N)); for(var i=N;i<a.length;i++) o[(i-N)%N]+=a[i]; return o; }); }
    else { var e=b.length-1; while(e>N&&Math.abs(chs[0][e])<.0005&&Math.abs(chs[1][e])<.0005) e--; out=chs.map(function(a){ return a.slice(0,Math.min(b.length,e+Math.floor(SR*.02))); }); }
    out.forEach(function(o){ for(var i=0;i<o.length;i++){ if(o[i]>1) o[i]=1; else if(o[i]<-1) o[i]=-1; } }); return out; }); }
function wav(chs,sr){ sr=sr||SR; var n=chs[0].length, ch=chs.length, buf=new ArrayBuffer(44+n*ch*2), v=new DataView(buf), p=0;
  function s(t){ for(var i=0;i<t.length;i++) v.setUint8(p++,t.charCodeAt(i)); } function u32(x){ v.setUint32(p,x,true); p+=4; } function u16(x){ v.setUint16(p,x,true); p+=2; }
  s("RIFF"); u32(36+n*ch*2); s("WAVE"); s("fmt "); u32(16); u16(1); u16(ch); u32(sr); u32(sr*ch*2); u16(ch*2); u16(16); s("data"); u32(n*ch*2);
  for(var i=0;i<n;i++) for(var c=0;c<ch;c++){ var x=Math.max(-1,Math.min(1,chs[c][i])); v.setInt16(p,x<0?x*32768:x*32767,true); p+=2; }
  return new Blob([buf],{type:"audio/wav"}); }
var lameP=null; function lame(){ if(lameP) return lameP; lameP=new Promise(function(res,rej){ var s=document.createElement("script"); s.src="../zvuk/lib/lame.min.js"; s.onload=res; s.onerror=function(){ lameP=null; rej(); }; document.head.appendChild(s); }); return lameP; }
function mp3(chs,prog){ return lame().then(function(){ return new Promise(function(res){
  var enc=new lamejs.Mp3Encoder(2,SR,192), n=chs[0].length, I=chs.map(function(c){ var o=new Int16Array(c.length); for(var i=0;i<c.length;i++){ var x=c[i]; o[i]=x<0?x*32768:x*32767; } return o; }), out=[], i=0;
  (function step(){ var end=Math.min(n,i+1152*40); for(;i<end;i+=1152){ var m=enc.encodeBuffer(I[0].subarray(i,Math.min(n,i+1152)),I[1].subarray(i,Math.min(n,i+1152))); if(m.length) out.push(new Uint8Array(m)); }
    prog(i/n); if(i<n) setTimeout(step,0); else { var f=enc.flush(); if(f.length) out.push(new Uint8Array(f)); res(new Blob(out,{type:"audio/mpeg"})); } })(); }); }); }
/* имя файла латиницей: некоторые браузеры не принимают кириллицу в имени скачиваемого файла и называют его «download» */
function latin(s){ var m={а:"a",б:"b",в:"v",г:"g",д:"d",е:"e",ё:"e",ж:"zh",з:"z",и:"i",й:"y",к:"k",л:"l",м:"m",н:"n",о:"o",п:"p",р:"r",с:"s",т:"t",у:"u",ф:"f",х:"h",ц:"ts",ч:"ch",ш:"sh",щ:"sch",ъ:"",ы:"y",ь:"",э:"e",ю:"yu",я:"ya",і:"i",ї:"yi",є:"ye",ł:"l",ß:"ss"};
  return String(s||"").toLowerCase().split("").map(function(c){ return m[c]!=null?m[c]:c; }).join("").normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"").slice(0,40); }
function fname(){ return latin(P.title)||"beat"; }
function dl(blob,name){ var a=document.createElement("a"); a.href=URL.createObjectURL(blob); a.download=name; document.body.appendChild(a); a.click(); setTimeout(function(){ URL.revokeObjectURL(a.href); a.remove(); },3000); }
function kb(b){ return b>1048576?(b/1048576).toFixed(1)+" "+TR("МБ"):Math.round(b/1024)+" "+TR("КБ"); }
function mmss(s){ var m=Math.floor(s/60); return m+":"+String(Math.round(s-m*60)).padStart(2,"0"); }
function exportBox(){
  if(!P.tr.length){ toast(TR("Сначала добавьте дорожку")); return; } stop(); P.ex=P.ex||{n:4,fmt:"wav",seam:true};
  modal('<button class="ib mx" data-close title="'+esc(TR("Закрыть"))+'">'+sv("x")+'</button><h3>Сохранить бит</h3><div id="exO"></div><p class="note" id="exI" style="margin-top:4px"></p><div class="row"><button class="btn" id="exZ">'+sv("zv")+'<span>В звуковую мастерскую</span></button><button class="btn go" id="exD">Скачать</button></div>');
  var box=$("#exO"), upd=function(){ var L=P.len*stepDur()*P.ex.n; $("#exI").textContent=TR("Длина {0}, файл около {1}",mmss(L),kb(P.ex.fmt==="wav"?L*SR*4:L*24000)); };
  box.appendChild(choice(TR("Сколько раз повторить"),[[1,"1"],[2,"2"],[4,"4"],[8,"8"],[16,"16"]],P.ex.n,function(v){ P.ex.n=+v; upd(); save(); }));
  box.appendChild(choice(TR("Формат"),[["wav","WAV"],["mp3","MP3 192"]],P.ex.fmt,function(v){ P.ex.fmt=v; upd(); save(); }));
  box.appendChild(toggle(TR("Бесшовный луп"),P.ex.seam,function(v){ P.ex.seam=v; save(); }));
  box.appendChild(el('<p class="note">'+esc(TR("Бесшовный: хвосты звуков в конце переносятся в начало, и файл можно крутить по кругу без щелчка. Выключите, если нужен конец с затуханием."))+'</p>'));
  upd(); $("#exD").onclick=function(){ doExport(false); }; $("#exZ").onclick=function(){ doExport(true); }; }
function doExport(toZ){
  var ex=P.ex; modal('<h3>'+esc(TR("Собираю звук"))+'</h3><div class="prog"><i id="pg"></i></div><p class="note">'+esc(TR("Пара секунд..."))+'</p>');
  var prog=function(p){ var g=$("#pg"); if(g) g.style.width=Math.round(p*100)+"%"; };
  setTimeout(function(){ render(ex.n,ex.seam).then(function(chs){ prog(.3);
    if(toZ) return sendZvuk(wav(chs),chs[0].length/SR);
    return (ex.fmt==="wav"?Promise.resolve(wav(chs)):mp3(chs,function(p){ prog(.3+p*.7); })).then(function(b){ closeModal(); dl(b,fname()+"-"+P.bpm+"bpm."+(ex.fmt==="wav"?"wav":"mp3")); toast(TR("Файл сохранён: {0}",kb(b.size))); }); })
    .catch(function(){ closeModal(); toast(TR("Не получилось сохранить файл")); }); },60); }
/* отдать луп в звуковую мастерскую: кладём файл и проект прямо в её базу и открываем её */
function sendZvuk(blob,dur){ var zdb=function(){ return new Promise(function(res,rej){ var r=indexedDB.open("forge-zvuk",1);
    r.onupgradeneeded=function(){ r.result.createObjectStore("projects",{keyPath:"id"}); r.result.createObjectStore("blobs"); }; r.onsuccess=function(){ res(r.result); }; r.onerror=function(){ rej(r.error); }; }); };
  var aid="a"+newId(""), id="z"+newId(""), pr={ v:1, id:id, title:P.title||TR("Бит"), clips:[{ id:"c"+newId(""), aid:aid, name:P.title||TR("Бит"), dur:dur, segs:[[0,dur]] }], gain:0, speed:1, fx:"none", mono:false, fadeIn:0, fadeOut:0, scope:"all", sel:null, ring:0, fmt:"mp3192", updated:Date.now() };
  return tx("blobs","readwrite",function(s){ s.put(blob,aid); },zdb).then(function(){ return tx("projects","readwrite",function(s){ s.put(pr); },zdb); })
    .then(function(){ save(); closeModal(); location.href="../zvuk/#"+id; }); }
$("#saveBtn").onclick=exportBox;

/* ссылка: бит целиком в адресе (без своих звуков, их в ссылку не положить) */
function b64(s){ return btoa(unescape(encodeURIComponent(s))).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,""); }
function unb64(s){ s=s.replace(/-/g,"+").replace(/_/g,"/"); while(s.length%4) s+="="; return decodeURIComponent(escape(atob(s))); }
function shareLink(){ var o={ t:P.title, b:P.bpm, w:P.sw, l:P.len, k:P.key, s:P.sc, m:P.mv, r:P.tr.filter(function(t){ return t.t!=="smp"; }).map(function(t){ return [t.t,t.v,t.vol,t.pan,t.pit,t.dec,t.oct==null?null:t.oct,t.st.join(""),t.nt?t.nt.join(""):"",t.mute?1:0]; }) };
  return location.origin+location.pathname+"#s="+b64(JSON.stringify(o)); }
function fromLink(s){ var keep=P, o=JSON.parse(unb64(s)), b=newBeat(); P=b; b.title=o.t||b.title; b.bpm=o.b||100; b.sw=o.w||0; b.len=o.l===32?32:16; b.key=o.k||0; b.sc=SCALES[o.s]?o.s:"minor"; b.mv=o.m==null?.75:o.m;
  b.tr=(o.r||[]).filter(function(x){ return TYPES[x[0]]&&x[0]!=="smp"; }).slice(0,24).map(function(x){ var tr=mkTrack(x[0],+x[1]||0,{vol:+x[2],pan:+x[3]||0,pit:+x[4]||0,dec:+x[5]||1,mute:!!x[9]}); if(x[6]!=null&&tr.nt) tr.oct=+x[6];
    tr.st=String(x[7]||"").split("").map(function(c){ return Math.min(4,+c||0); }); if(tr.nt) tr.nt=String(x[8]||"").split("").map(function(c){ return +c||0; }); fitLen(tr,b.len); return tr; });
  P=keep; return b; }

/* ═══════════ отмена и запись в базу ═══════════ */
var U=[], Rd=[];
function snap(){ return JSON.stringify({ title:P.title, bpm:P.bpm, sw:P.sw, len:P.len, key:P.key, sc:P.sc, mv:P.mv, tr:P.tr }); }
function remember(){ if(!P) return; U.push(snap()); if(U.length>100) U.shift(); Rd=[]; undoBtns(); }
function undoBtns(){ $("#undo").disabled=!U.length; $("#redo").disabled=!Rd.length; }
function restoreS(s){ var o=JSON.parse(s); for(var k in o) P[k]=o[k]; $("#title").value=P.title||""; selT=Math.min(selT,P.tr.length-1); if(selT<0) selT=0; undoBtns(); liveParams(); bpmUi(); grid(); save(); refresh(); }
$("#undo").onclick=function(){ if(!U.length) return; Rd.push(snap()); restoreS(U.pop()); };
$("#redo").onclick=function(){ if(!Rd.length) return; U.push(snap()); restoreS(Rd.pop()); };
var saveT=0; function save(){ clearTimeout(saveT); saveT=setTimeout(function(){ if(!P) return; P.updated=Date.now(); bPut(JSON.parse(JSON.stringify(P))).catch(function(){ toast(TR("Не получилось сохранить: память браузера заполнена")); }); },350); }

/* ═══════════ панели ═══════════ */
var pane=$("#pane"), insp=$("#insp"), right=$("#right"), ui={ tab:null, sheet:false };
var TTL={ beat:"Бит", snd:"Звуки", more:"Ещё" };
function tabBox(){ return wide.matches?pane:insp; }
function openTab(t){ if(t==="trk"){ openInsp(); return; }
  ui.tab=t; $$("#tabs button").forEach(function(b){ b.classList.toggle("on",b.getAttribute("data-tab")===t); });
  if(!wide.matches){ ui.sheet="tab"; right.classList.add("open"); right.classList.remove("full","peek"); $("#shTitle").textContent=TR(TTL[t]); }
  refreshPane(); tabBox().scrollTop=0; }
function openInsp(){ if(!wide.matches){ ui.sheet="insp"; right.classList.add("open"); right.classList.remove("full","peek"); $$("#tabs button").forEach(function(b){ b.classList.toggle("on",b.getAttribute("data-tab")==="trk"); }); ui.tab=null; }
  refreshInsp(); insp.scrollTop=0; }
function closeSheet(){ if(wide.matches) return; ui.sheet=false; ui.tab=null; right.classList.remove("open","full","peek"); $$("#tabs button").forEach(function(b){ b.classList.remove("on"); }); }
$("#shClose").onclick=closeSheet;
$$("#tabs button").forEach(function(b){ b.onclick=function(){ var t=b.getAttribute("data-tab"); if(!wide.matches&&((ui.sheet==="tab"&&ui.tab===t)||(t==="trk"&&ui.sheet==="insp"))) closeSheet(); else openTab(t); }; });
(function(){ var h=$(".sh-h"), y0=0, h0=0, on=false;
  h.addEventListener("pointerdown",function(e){ if(wide.matches||e.target.closest("button")) return; on=true; y0=e.clientY; h0=right.getBoundingClientRect().height; right.style.transition="none"; try{ h.setPointerCapture(e.pointerId); }catch(x){} });
  h.addEventListener("pointermove",function(e){ if(on) right.style.height=Math.max(80,h0-(e.clientY-y0))+"px"; });
  h.addEventListener("pointerup",function(e){ if(!on) return; on=false; right.style.transition=""; var nh=h0-(e.clientY-y0), vh=innerHeight; right.style.height=""; right.classList.remove("full","peek");
    if(nh<vh*.2) closeSheet(); else if(nh<vh*.42) right.classList.add("peek"); else if(nh>vh*.65) right.classList.add("full"); });
})();
/* телефон: пока открыта шторка, сетка ужимается над ней */
new MutationObserver(function(){ var e=$("#ed"); e.classList.toggle("so",right.classList.contains("open")&&!right.classList.contains("full")); e.classList.toggle("pk",right.classList.contains("peek")); }).observe(right,{attributes:true,attributeFilter:["class"]});
wide.addEventListener("change",function(){ right.classList.remove("open"); ui.sheet=false; if(wide.matches) openTab(ui.tab||"beat"); grid(); refreshInsp(); });
function refresh(){ refreshPane(); refreshInsp(); }
function refreshPane(){ if(!ui.tab||!P) return; if(!wide.matches&&ui.sheet!=="tab") return; var box=tabBox(), sc=box.scrollTop; box.innerHTML="";
  ({ beat:paneBeat, snd:paneSnd, more:paneMore })[ui.tab](box); box.scrollTop=sc; }
function paneBeat(box){
  box.appendChild(sh("Темп и ритм"));
  box.appendChild(range(TR("Темп, ударов в минуту"),P.bpm,50,200,1,String,function(v){ P.bpm=v; bpmUi(); }));
  box.appendChild(el('<button class="btn w">'+sv("tap")+'<span>Отстучать темп</span><small>3-4 нажатия в ритм</small></button>',function(n){ n.onclick=tap; }));
  box.appendChild(range(TR("Свинг"),P.sw,0,60,1,function(v){ return v+"%"; },function(v){ P.sw=v; }));
  box.appendChild(el('<p class="note" style="margin:-4px 0 12px">Свинг чуть задерживает каждый второй шаг: ритм начинает раскачиваться, как в хип-хопе и джазе.</p>'));
  box.appendChild(choice(TR("Длина"),[[16,TR("1 такт, 16 шагов")],[32,TR("2 такта, 32 шага")]],P.len,function(v){ v=+v; if(v===P.len) return; remember(); P.len=v; P.tr.forEach(function(t){ fitLen(t,v); }); page=0; grid(); save(); refreshInsp(); }));
  box.appendChild(sh("Тональность"));
  box.appendChild(el('<div class="f"><label>Основная нота</label><select></select></div>',function(n){ var s=$("select",n); KEYS.forEach(function(k,i){ s.appendChild(el('<option value="'+i+'"'+(i===P.key?" selected":"")+'>'+k+'</option>')); }); s.onchange=function(){ remember(); P.key=+s.value; grid(); save(); refreshInsp(); }; }));
  box.appendChild(choice(TR("Лад"),Object.keys(SCN).map(function(k){ return [k,TR(SCN[k])]; }),P.sc,function(v){ remember(); P.sc=v; grid(); save(); refreshInsp(); }));
  box.appendChild(el('<p class="note" style="margin:-4px 0 12px">Бас и синт играют только ноты выбранного лада, поэтому фальшивую ноту поставить нельзя.</p>'));
  box.appendChild(range(TR("Общая громкость"),Math.round((P.mv==null?.75:P.mv)*100),0,120,1,function(v){ return v+"%"; },function(v){ P.mv=v/100; liveParams(); }));
  box.appendChild(sh("Взять шаблон"));
  var tl=el('<div class="btpl"></div>'); TPL.forEach(function(t){ tl.appendChild(el('<button><canvas></canvas><b>'+esc(TR(t.n))+'</b><small>'+t.bpm+' BPM</small></button>',function(n){
    n.onclick=function(){ ask(TR("Заменить дорожки шаблоном «{0}»? Отменить можно кнопкой назад.",TR(t.n)),TR("Заменить")).then(function(y){ if(!y) return; remember(); var b=fromTpl(t); ["bpm","sw","key","sc","tr","len"].forEach(function(k){ P[k]=b[k]; }); selT=0; page=0; liveParams(); bpmUi(); grid(); save(); refresh(); }); };
    requestAnimationFrame(function(){ thumb($("canvas",n),fromTpl(t)); }); })); }); box.appendChild(tl);
}
function paneSnd(box){
  box.appendChild(sh("Добавить дорожку"));
  var g=el('<div class="badd"></div>'); ADD.forEach(function(k){ var T=TYPES[k]; g.appendChild(el('<button style="--c:'+T.c+'"><i></i><b>'+esc(TR(T.n))+'</b></button>',function(n){ n.onclick=function(){ addTrack(k); }; })); }); box.appendChild(g);
  box.appendChild(sh("Свой звук"));
  box.appendChild(el('<button class="btn w">'+sv("mic")+'<span>Записать с микрофона</span><small>до 4 с</small></button>',function(n){ n.onclick=function(){ reTo=null; record(); }; }));
  box.appendChild(el('<button class="btn w">'+sv("file")+'<span>Звук из файла</span><small>до 10 с</small></button>',function(n){ n.onclick=function(){ reTo=null; pickFile(); }; }));
  box.appendChild(el('<p class="note">Хлопок, голос, удар по кастрюле: любой короткий звук станет новой дорожкой. Тишина по краям обрезается, громкость выравнивается.</p>'));
}
function addTrack(k){ if(P.tr.length>=24){ toast(TR("Больше 24 дорожек нельзя")); return; } remember(); var tr=mkTrack(k,0,k==="hat"||k==="ohat"||k==="shaker"?{vol:.6}:null); P.tr.push(tr); selT=P.tr.length-1; liveParams(); grid(); save(); refresh(); preview(tr); toast(TR("Добавлено: {0}",TR(TYPES[k].n)));
  if(!wide.matches) closeSheet(); var g=$("#grid"); g.scrollTop=g.scrollHeight; }
function paneMore(box){
  box.appendChild(el('<div class="f"><label>Название</label><input type="text" maxlength="80"></div>',function(n){ var i=$("input",n); i.value=P.title||""; i.oninput=function(){ P.title=i.value; $("#title").value=i.value; save(); }; }));
  box.appendChild(el('<button class="btn w">Ссылка на бит<small>скопировать</small></button>',function(n){ n.onclick=function(){ var u=shareLink(), sm=P.tr.some(function(t){ return t.t==="smp"; });
    modal('<h3>Ссылка на бит</h3><div class="link" data-nt></div>'+(sm?'<p class="note" style="margin-top:8px">'+esc(TR("Свои звуки в ссылку не помещаются, у получателя их дорожек не будет."))+'</p>':'')+'<div class="row"><button class="btn" data-close>Закрыть</button><button class="btn go" id="cpL">Скопировать</button></div>');
    $("#mbox .link").textContent=u; $("#cpL").onclick=function(){ (navigator.clipboard?navigator.clipboard.writeText(u):Promise.reject()).then(function(){ toast(TR("Ссылка скопирована")); closeModal(); },function(){ toast(TR("Выделите ссылку и скопируйте вручную")); }); }; }; }));
  box.appendChild(el('<button class="btn w">Сделать копию</button>',function(n){ n.onclick=function(){ var c=JSON.parse(JSON.stringify(P)); c.id=newId(); c.title=TR("{0} (копия)",P.title||""); c.updated=Date.now(); bPut(c).then(function(){ openB(c); toast(TR("Открыта копия")); }); }; }));
  box.appendChild(el('<button class="btn w del">Удалить бит</button>',function(n){ n.onclick=function(){ ask(TR("Удалить «{0}»? Вернуть не получится.",P.title||""),TR("Удалить")).then(function(y){ if(y){ var b=P; stop(); bDel(b).then(function(){ P=null; showHome(); }); } }); }; }));
  box.appendChild(el('<p class="note" style="margin-top:8px">Бит сохраняется в этом браузере сам. Пробел: играть и стоп. Ctrl+Z: отменить. Мышкой можно рисовать протяжкой по клеткам.</p>'));
}
function trackOps(tr){ var w=el('<div class="row" style="margin-bottom:8px"></div>');
  [["l","Сдвиг влево",function(){ tr.st.push(tr.st.shift()); if(tr.nt) tr.nt.push(tr.nt.shift()); }],["r","Сдвиг вправо",function(){ tr.st.unshift(tr.st.pop()); if(tr.nt) tr.nt.unshift(tr.nt.pop()); }],["clr","Очистить",function(){ tr.st=tr.st.map(function(){ return 0; }); }]].forEach(function(o){
    w.appendChild(el('<button class="btn" title="'+esc(TR(o[1]))+'">'+sv(o[0])+'</button>',function(n){ n.onclick=function(){ remember(); o[2](); grid(); save(); refreshInsp(); }; })); });
  return w; }
function refreshInsp(){
  if(!P) return; if(!wide.matches&&ui.sheet!=="insp") return; var sc0=insp.scrollTop; insp.innerHTML=""; var tr=P.tr[selT];
  $("#shTitle").textContent=tr?tname(tr):TR("Дорожка");
  if(!tr){ insp.appendChild(el('<p class="note">Дорожек пока нет. Добавьте их во вкладке «Звуки» или возьмите шаблон во вкладке «Бит».</p>')); return; }
  var T=TYPES[tr.t];
  insp.appendChild(el('<div class="f"><label>Название дорожки</label><input type="text" maxlength="24"></div>',function(n){ var i=$("input",n); i.value=tname(tr); i.oninput=function(){ tr.nm=i.value; var b=$('#grid .tn[data-ti="'+selT+'"] b'); if(b) b.textContent=tname(tr); $("#shTitle").textContent=tname(tr); save(); }; }));
  if(T.v.length>1) insp.appendChild(choice(TR("Звук"),T.v.map(function(x,i){ return [i,TR(x)]; }),tr.v,function(v){ remember(); tr.v=+v; preview(tr); grid(); save(); if(T.m) refreshInsp(); }));
  if(tr.t==="smp") insp.appendChild(el('<div class="row" style="margin-bottom:12px"><button class="btn" data-a="m">'+sv("mic")+'<span>Записать заново</span></button><button class="btn" data-a="f">'+sv("file")+'<span>Из файла</span></button></div>',function(n){
    $("[data-a=m]",n).onclick=function(){ reTo=tr; record(); }; $("[data-a=f]",n).onclick=function(){ reTo=tr; pickFile(); }; }));
  insp.appendChild(el('<button class="btn w">'+sv("play")+'<span>Послушать</span></button>',function(n){ n.onclick=function(){ preview(tr); }; }));
  if(T.m){ insp.appendChild(sh("Мелодия")); insp.appendChild(choice(TR("Октава"),[[1,"1"],[2,"2"],[3,"3"],[4,"4"],[5,"5"],[6,"6"]],tr.oct,function(v){ remember(); tr.oct=+v; preview(tr); grid(); save(); refreshInsp(); })); insp.appendChild(roll(tr)); }
  insp.appendChild(sh("Звучание"));
  insp.appendChild(range(TR("Громкость"),Math.round(tr.vol*100),0,150,1,function(v){ return v+"%"; },function(v){ tr.vol=v/100; liveParams(); }));
  insp.appendChild(range(TR("Лево и право"),Math.round(tr.pan*100),-100,100,5,function(v){ return v===0?TR("центр"):(v<0?TR("лево {0}",-v):TR("право {0}",v)); },function(v){ tr.pan=v/100; liveParams(); }));
  insp.appendChild(range(TR("Высота звука"),tr.pit,-12,12,1,function(v){ return (v>0?"+":"")+v; },function(v){ tr.pit=v; },function(){ preview(tr); }));
  insp.appendChild(range(TR("Длина звука"),tr.dec,.2,2,.05,function(v){ return "x"+v.toFixed(2); },function(v){ tr.dec=v; },function(){ preview(tr); }));
  insp.appendChild(toggle(TR("Заглушить"),tr.mute,function(v){ remember(); tr.mute=v; grid(); save(); }));
  insp.appendChild(toggle(TR("Только эта дорожка (соло)"),tr.solo,function(v){ remember(); tr.solo=v; grid(); save(); }));
  insp.appendChild(sh("Шаги"));
  insp.appendChild(choice(TR("Заполнить"),[[1,TR("каждый шаг")],[2,TR("через шаг")],[4,TR("на каждую долю")],[8,TR("через долю")]],"",function(v){ remember(); v=+v; tr.st=tr.st.map(function(x,i){ return i%v===0?(x||2):0; }); grid(); save(); refreshInsp(); }));
  insp.appendChild(trackOps(tr));
  insp.appendChild(el('<div class="row"><button class="btn">'+sv("dup")+'<span>Копия дорожки</span></button><button class="btn del">'+sv("x")+'<span>Удалить</span></button></div>',function(n){ var b=$$("button",n);
    b[0].onclick=function(){ if(P.tr.length>=24) return; remember(); var c=JSON.parse(JSON.stringify(tr)); c.id=newId("t"); c.nm=tr.nm?tr.nm+" 2":""; P.tr.splice(selT+1,0,c); selT++; liveParams(); grid(); save(); refreshInsp(); };
    b[1].onclick=function(){ remember(); P.tr.splice(selT,1); selT=Math.max(0,Math.min(selT,P.tr.length-1)); grid(); save(); refreshInsp(); }; }));
  insp.scrollTop=sc0;
}
/* мини-пианоролл: строки = ноты лада, столбцы = шаги */
function roll(tr){ var r=visR(), w=el('<div class="roll" style="--n:'+(r[1]-r[0])+';--c:'+TYPES[tr.t].c+'"></div>');
  for(var d=ROWS-1;d>=0;d--){ var row=el('<div class="rr'+(semi(d)%12===0?" root":"")+'"><span>'+noteName(tr,d)+'</span><div></div></div>'), box=$("div",row);
    for(var i=r[0];i<r[1];i++){ var on=tr.st[i]&&(tr.nt[i]||0)===d; box.appendChild(el('<button class="'+(on?"on":"")+(i%4===0?" b":"")+'" data-d="'+d+'" data-i="'+i+'"></button>')); } w.appendChild(row); }
  w.addEventListener("click",function(e){ var b=e.target.closest("button"); if(!b) return; var d=+b.dataset.d, i=+b.dataset.i; remember();
    if(tr.st[i]&&(tr.nt[i]||0)===d) tr.st[i]=0; else { tr.st[i]=tr.st[i]||2; tr.nt[i]=d; tr.ln=d; preview(tr,i); }
    var ti=P.tr.indexOf(tr), c=$('#grid .c[data-t="'+ti+'"][data-i="'+i+'"]'); if(c) paintCell(c,tr,i);
    $$("button[data-i=\""+i+"\"]",w).forEach(function(x){ x.classList.toggle("on",!!tr.st[i]&&+x.dataset.d===(tr.nt[i]||0)); }); save(); });
  return w; }

/* ═══════════ окна, клавиши ═══════════ */
function modal(h){ $("#mbox").innerHTML=h; $("#modal").classList.add("on"); }
function closeModal(){ $("#modal").classList.remove("on"); }
$("#modal").addEventListener("click",function(e){ if(e.target.closest("[data-close]")||e.target===e.currentTarget) closeModal(); });
function ask(text,ok){ return new Promise(function(res){ modal('<h3>'+esc(text)+'</h3><div class="row"><button class="btn" data-n>Отмена</button><button class="btn go" data-y>'+esc(ok)+'</button></div>');
  $("#mbox [data-n]").onclick=function(){ closeModal(); res(false); }; $("#mbox [data-y]").onclick=function(){ closeModal(); res(true); }; }); }
var tT=0; function toast(t){ var e=$("#toast"); e.textContent=t; e.classList.add("on"); clearTimeout(tT); tT=setTimeout(function(){ e.classList.remove("on"); },2600); }
addEventListener("keydown",function(e){
  if($("#ed").hidden||$("#modal").classList.contains("on")) return;
  if(/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) return;
  var k=e.key.toLowerCase();
  if((e.ctrlKey||e.metaKey)&&k==="z"){ e.preventDefault(); $(e.shiftKey?"#redo":"#undo").click(); return; }
  if((e.ctrlKey||e.metaKey)&&k==="y"){ e.preventDefault(); $("#redo").click(); return; }
  if(k===" "){ e.preventDefault(); $("#playBtn").click(); }
});
$("#title").addEventListener("input",function(){ if(P){ P.title=this.value; save(); } });

/* ═══════════ мои биты ═══════════ */
function thumb(cv,b){ var w=cv.clientWidth, h=cv.clientHeight, d=Math.min(2,devicePixelRatio||1); if(!w||!h) return; cv.width=w*d; cv.height=h*d; var g=cv.getContext("2d"); g.scale(d,d);
  var n=Math.max(1,b.tr.length), len=b.len||16, cw=w/len, rh=Math.min(10,h/n);
  b.tr.forEach(function(tr,ti){ for(var i=0;i<len;i++){ var v=tr.st[i]||0; g.globalAlpha=v?(v===1?.45:1):.08; g.fillStyle=v?TYPES[tr.t].c:"#fff"; g.fillRect(i*cw+1,(h-n*rh)/2+ti*rh+1,cw-2,rh-2); } }); g.globalAlpha=1; }
function showHome(){
  stop(); $("#ed").hidden=true; $("#home").hidden=false; document.title=TR("FORGE · битмейкер");
  try{ history.replaceState(null,"",location.pathname); }catch(e){}
  bAll().then(function(list){ list.sort(function(a,b){ return (b.updated||0)-(a.updated||0); }); var my=$("#myB"); my.innerHTML="";
    if(!list.length) my.appendChild(el('<p class="note">Здесь появятся ваши биты.</p>'));
    list.forEach(function(b){ var d=new Date(b.updated||Date.now()), when=d.toLocaleDateString(window.FLANG||"ru",{day:"numeric",month:"short"});
      var n=el('<div class="bc"><button class="th"><canvas></canvas></button><b data-nt></b><small>'+when+", "+b.bpm+' BPM</small><div class="acts"><button data-a="copy">копия</button><button data-a="del">удалить</button></div></div>');
      $("b",n).textContent=b.title||""; $(".th",n).onclick=function(){ openB(b); };
      $$(".acts button",n).forEach(function(x){ x.onclick=function(){ if(x.getAttribute("data-a")==="copy"){ var c=JSON.parse(JSON.stringify(b)); c.id=newId(); c.title=TR("{0} (копия)",b.title||""); c.updated=Date.now(); bPut(c).then(showHome); }
        else ask(TR("Удалить «{0}»? Вернуть не получится.",b.title||""),TR("Удалить")).then(function(y){ if(y) bDel(b).then(showHome); }); }; });
      my.appendChild(n); requestAnimationFrame(function(){ thumb($("canvas",n),b); }); }); });
  var tl=$("#tplB"); tl.innerHTML="";
  tl.appendChild(el('<button class="bt new"><div class="cv">'+sv("add")+'</div><b>'+esc(TR("Пустой бит"))+'</b><small>'+esc(TR("Бочка, малый, хэт и бас без нот: расставьте сами"))+'</small></button>',function(n){ n.onclick=function(){ create(blank()); }; }));
  TPL.forEach(function(t){ tl.appendChild(el('<button class="bt"><div class="cv"><canvas></canvas></div><b>'+esc(TR(t.n))+'<em>'+t.bpm+' BPM</em></b><small>'+esc(TR(t.d))+'</small></button>',function(n){ n.onclick=function(){ create(fromTpl(t)); }; requestAnimationFrame(function(){ thumb($("canvas",n),fromTpl(t)); }); })); });
}
function create(b){ return bPut(b).catch(function(){}).then(function(){ openB(b); }); }
function openB(b){
  stop(); P=b; P.tr=P.tr||[]; P.ex=P.ex||{n:4,fmt:"wav",seam:true}; P.tr.forEach(function(t){ fitLen(t,P.len); }); U=[]; Rd=[]; undoBtns(); selT=0; page=0; O=null;
  $("#home").hidden=true; $("#ed").hidden=false; document.title="FORGE · "+(P.title||""); $("#title").value=P.title||""; bpmUi();
  try{ history.replaceState(null,"",location.pathname+"#"+P.id); }catch(e){}
  P.tr.forEach(function(t){ if(t.aid) loadSmp(t.aid).catch(function(){ toast(TR("Свой звук «{0}» не найден в этом браузере",tname(t))); }); });
  grid(); if(wide.matches){ openTab("beat"); refreshInsp(); } else closeSheet();
}
$("#toHome").onclick=function(){ save(); stop(); setTimeout(showHome,400); };
(function boot(){ var h=location.hash.slice(1);
  if(/^tpl=/.test(h)){ var t=TPL.filter(function(x){ return x.id===h.slice(4); })[0]; if(t){ create(fromTpl(t)); return; } }
  if(/^s=/.test(h)){ try{ var b=fromLink(h.slice(2)); create(b); toast(TR("Это ваша копия бита")); return; }catch(e){ toast(TR("Ссылка повреждена")); } }
  if(h&&!/=/.test(h)) bGet(h).then(function(b){ if(b) openB(b); else showHome(); }); else showHome(); })();
})();
