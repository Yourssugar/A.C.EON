/* A.C.EON // CIPHER: звук эфира, всё синтезируется в браузере (без файлов).
   Щелчки телетайпа при наборе, треск роторов, шум эфира во время работы станции, два сигнала "канал запечатан",
   передача азбукой Морзе, номерная станция голосом (speechSynthesis).
   Громкость: общая настройка сайта Store('site').sfx (0 = тишина). Звук включается после первого нажатия на странице. */
(function(){
'use strict';
const AC=window.AudioContext||window.webkitAudioContext;
if(!AC){ window.CipherAudio={ok:false,on:()=>false,set(){},type(){},tick(){},staticOn(){},staticOff(){},seal(){},morse(){return null;},voice(){return null;},stopAll(){},hasVoice:false}; return; }
let ctx=null, master=null, noiseBuf=null, bed=null, bedGain=null, last=0, typeT=0;
const site=()=>{ try{ return window.Store?Store.get('site'):JSON.parse(localStorage.getItem('aceon:site')||'{}'); }catch(e){ return {}; } };
function vol(){ const v=site().sfx; return v===undefined||v===null?.8:+v; }
function on(){ return vol()>0; }
function set(onOff){
  if(window.Store){ const s=Store.get('site'); if(onOff)s.sfx=s.sfxPrev||.8; else { if(s.sfx>0)s.sfxPrev=s.sfx; s.sfx=0; } Store.save('site'); }
  else { try{ const s=JSON.parse(localStorage.getItem('aceon:site')||'{}'); if(onOff)s.sfx=s.sfxPrev||.8; else { if(s.sfx>0)s.sfxPrev=s.sfx; s.sfx=0; } localStorage.setItem('aceon:site',JSON.stringify(s)); }catch(e){} }
  if(onOff)init();
  if(master)master.gain.value=vol()*.5;
  if(!onOff)stopAll();
}
function init(){
  if(ctx)return ctx.state==='suspended'?(ctx.resume(),ctx):ctx;
  try{ ctx=new AC(); }catch(e){ return null; }
  master=ctx.createGain(); master.gain.value=vol()*.5; master.connect(ctx.destination);
  noiseBuf=ctx.createBuffer(1,ctx.sampleRate*2,ctx.sampleRate);
  const d=noiseBuf.getChannelData(0); for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;
  return ctx;
}
/* первый жест на странице открывает звук (требование браузеров) */
['pointerdown','keydown'].forEach(t=>addEventListener(t,()=>{ if(on())init(); },{capture:true,passive:true}));
const ready=()=>on()&&ctx&&ctx.state==='running';

function noise(dur,f,q,g,type){
  const s=ctx.createBufferSource(); s.buffer=noiseBuf; s.loop=true; s.playbackRate.value=.8+Math.random()*.4;
  const fl=ctx.createBiquadFilter(); fl.type=type||'bandpass'; fl.frequency.value=f; fl.Q.value=q;
  const gn=ctx.createGain(); const t=ctx.currentTime;
  gn.gain.setValueAtTime(g,t); gn.gain.exponentialRampToValueAtTime(.0001,t+dur);
  s.connect(fl); fl.connect(gn); gn.connect(master); s.start(t,Math.random()*1.5); s.stop(t+dur+.02);
}
function tone(f,t0,dur,g,type){
  const o=ctx.createOscillator(); o.type=type||'sine'; o.frequency.value=f;
  const gn=ctx.createGain(); gn.gain.setValueAtTime(0,t0); gn.gain.linearRampToValueAtTime(g,t0+.006);
  gn.gain.setValueAtTime(g,t0+Math.max(.006,dur-.008)); gn.gain.linearRampToValueAtTime(0,t0+dur);
  o.connect(gn); gn.connect(master); o.start(t0); o.stop(t0+dur+.02); return o;
}
/* щелчок телетайпа (не чаще 22 в секунду) */
function type(){ if(!ready())return; const n=performance.now(); if(n-typeT<45)return; typeT=n; noise(.03,2600+Math.random()*1800,1.2,.22,'bandpass'); }
/* треск ротора: несколько щелчков храповика и глухой удар */
function tick(){
  if(!ready())return; const t=ctx.currentTime;
  for(let i=0;i<4;i++)setTimeout(()=>{ if(ctx)noise(.02,1400+i*300,2,.18,'bandpass'); },i*38);
  tone(85,t,.07,.25,'triangle');
}
/* шум эфира фоном, пока станция работает */
function staticOn(){
  if(!ready()||bed)return;
  bed=ctx.createBufferSource(); bed.buffer=noiseBuf; bed.loop=true;
  const fl=ctx.createBiquadFilter(); fl.type='bandpass'; fl.frequency.value=1700; fl.Q.value=.6;
  bedGain=ctx.createGain(); bedGain.gain.setValueAtTime(0,ctx.currentTime); bedGain.gain.linearRampToValueAtTime(.045,ctx.currentTime+.25);
  /* лёгкое "дыхание" эфира */
  const lfo=ctx.createOscillator(), lg=ctx.createGain(); lfo.frequency.value=.35; lg.gain.value=.015; lfo.connect(lg); lg.connect(bedGain.gain); lfo.start();
  bed.connect(fl); fl.connect(bedGain); bedGain.connect(master); bed.start(); bed._lfo=lfo;
}
function staticOff(){
  if(!bed)return; const b=bed, g=bedGain; bed=null; bedGain=null;
  try{ g.gain.cancelScheduledValues(ctx.currentTime); g.gain.setValueAtTime(g.gain.value,ctx.currentTime); g.gain.linearRampToValueAtTime(0,ctx.currentTime+.35); b.stop(ctx.currentTime+.4); b._lfo.stop(ctx.currentTime+.4); }catch(e){}
}
/* "канал запечатан": два коротких сигнала */
function seal(dec){ if(!ready())return; const t=ctx.currentTime+.02; const a=dec?660:880, b=dec?880:660; tone(a,t,.09,.18); tone(b,t+.13,.12,.18); }

/* ---------- азбука Морзе ---------- */
const MC={A:'.-',B:'-...',C:'-.-.',D:'-..',E:'.',F:'..-.',G:'--.',H:'....',I:'..',J:'.---',K:'-.-',L:'.-..',M:'--',N:'-.',O:'---',P:'.--.',Q:'--.-',R:'.-.',S:'...',T:'-',U:'..-',V:'...-',W:'.--',X:'-..-',Y:'-.--',Z:'--..',
  '0':'-----','1':'.----','2':'..---','3':'...--','4':'....-','5':'.....','6':'-....','7':'--...','8':'---..','9':'----.'};
let morseStop=null;
/* text: буквы и цифры (остальное пропускается), wpm: скорость. Возвращает длительность в мс */
function morse(text,onEnd){
  stopMorse();
  init(); if(!ready()){ if(onEnd)onEnd(); return 0; }
  const unit=1.2/18, f=640;
  let t=ctx.currentTime+.3; const oscs=[];
  staticOn();
  String(text).toUpperCase().split('').forEach(ch=>{
    if(ch===' '){ t+=unit*4; return; }
    const c=MC[ch]; if(!c)return;
    for(const s of c){ const d=s==='.'?unit:unit*3; oscs.push(tone(f,t,d,.16)); t+=d+unit; }
    t+=unit*2;
  });
  const ms=(t-ctx.currentTime)*1000+150;
  const tm=setTimeout(()=>{ morseStop=null; staticOff(); if(onEnd)onEnd(); },ms);
  morseStop=()=>{ clearTimeout(tm); oscs.forEach(o=>{ try{ o.stop(); }catch(e){} }); staticOff(); morseStop=null; if(onEnd)onEnd(); };
  return ms;
}
function stopMorse(){ if(morseStop)morseStop(); }

/* ---------- номерная станция ---------- */
const hasVoice=!!(window.speechSynthesis&&window.SpeechSynthesisUtterance);
let voiceOn=false, voiceEnd=null;
function pickVoice(lang){
  const vs=speechSynthesis.getVoices()||[];
  return vs.find(v=>v.lang&&v.lang.toLowerCase().indexOf(lang)===0&&/male|man|dmitri|pavel|stefan|paul|jorge|diego|cosimo|adam|krzysztof/i.test(v.name))
    ||vs.find(v=>v.lang&&v.lang.toLowerCase().indexOf(lang)===0)||null;
}
/* lines: массив фраз (вступление, группы цифр, конец) */
function voice(lines,lang,onEnd){
  stopVoice();
  if(!hasVoice||!on()){ if(onEnd)onEnd(); return null; }
  init(); voiceOn=true; voiceEnd=onEnd||null;
  /* позывной: три ноты, потом шум эфира под голосом */
  if(ready()){ const t=ctx.currentTime+.05; [523,659,784].forEach((f,i)=>tone(f,t+i*.28,.24,.12,'triangle')); setTimeout(()=>{ if(voiceOn)staticOn(); },900); }
  const vc=pickVoice(lang);
  let i=0;
  const next=()=>{
    if(!voiceOn)return;
    if(i>=lines.length){ stopVoice(); return; }
    const u=new SpeechSynthesisUtterance(lines[i++]); u.lang=vc?vc.lang:lang; if(vc)u.voice=vc;
    u.rate=.78; u.pitch=.55; u.volume=Math.min(1,vol()+.1);
    u.onend=()=>setTimeout(next,i===1?650:420); u.onerror=()=>setTimeout(next,200);
    speechSynthesis.speak(u);
  };
  setTimeout(next,1000);
  return stopVoice;
}
function stopVoice(){
  if(!voiceOn)return; voiceOn=false;
  try{ speechSynthesis.cancel(); }catch(e){}
  staticOff(); const cb=voiceEnd; voiceEnd=null; if(cb)cb();
}
function stopAll(){ stopMorse(); stopVoice(); staticOff(); }
document.addEventListener('visibilitychange',()=>{ if(document.hidden)stopAll(); });

window.CipherAudio={ok:true,on,set,init,type,tick,staticOn,staticOff,seal,morse,stopMorse,voice,stopVoice,stopAll,hasVoice};
})();
