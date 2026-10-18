/* A.C.EON ARCADE: звук.
   Музыка: плейлисты, плавная смена, громкость через WebAudio (работает и на iPhone,
   где громкость у <audio> менять нельзя). Эффекты: синтез без файлов.
   Громкость музыки и эффектов хранится в Store('site'): music, sfx (0..1).

   Sound.playlists({menu:[url...], game:[url...]})  плейлисты страницы
   Sound.music('menu')                              включить плейлист (плавно)
   Sound.duck(0.3, 2000)                            приглушить музыку на время
   Sound.sfx('move')                                эффект
   Sound.define('eat', fn(t, tone, noise))          свой эффект игры
   Sound.setVolume('music'|'sfx', 0..1)

   Без своих треков страница играет общий плейлист аркады, и трек продолжается
   с того же места при переходе между страницами (sessionStorage 'aceon_music'). */
(function(){
'use strict';

var BASE=new URL('.',document.currentScript.src);
var ARCADE=[1,2,3,4,5,6,7,8].map(function(n){return new URL('../../audio/track-8-bit-'+n+'.mp3',BASE).href;});

var site=Store.get('site');
var ctx=null,musicGain=null,sfxGain=null,unlocked=false;
var lists={arcade:ARCADE},want=null,cur=null;   // cur: {name,list,idx,deck}
var decks=[];                                     // два <audio> для плавной смены

function ensureCtx(){
  if(ctx)return ctx;
  var AC=window.AudioContext||window.webkitAudioContext;if(!AC)return null;
  ctx=new AC();
  musicGain=ctx.createGain();musicGain.gain.value=site.music;musicGain.connect(ctx.destination);
  sfxGain=ctx.createGain();sfxGain.gain.value=site.sfx;sfxGain.connect(ctx.destination);
  for(var i=0;i<2;i++){
    var el=new window.Audio();el.preload='auto';el.crossOrigin='anonymous';
    var src=ctx.createMediaElementSource(el),g=ctx.createGain();g.gain.value=0;
    src.connect(g);g.connect(musicGain);
    decks.push({el:el,gain:g});
  }
  decks.forEach(function(d){d.el.addEventListener('ended',function(){if(cur&&cur.deck===d)next();});});
  return ctx;
}

/* браузер разрешает звук только после действия пользователя */
function unlock(){
  if(unlocked)return;
  if(!ensureCtx())return;
  unlocked=true;
  if(ctx.state==='suspended')ctx.resume();
  if(want)start(want);
}
['pointerdown','keydown','touchend'].forEach(function(ev){document.addEventListener(ev,unlock,{capture:true});});

function resolve(name){return lists[name]&&lists[name].length?lists[name]:ARCADE;}
function fade(g,to,sec){
  var now=ctx.currentTime;
  g.gain.cancelScheduledValues(now);
  g.gain.setValueAtTime(g.gain.value,now);
  g.gain.linearRampToValueAtTime(to,now+sec);
}
function loadSaved(list){
  if(list!==ARCADE)return {idx:0,t:0};
  try{var s=JSON.parse(sessionStorage.getItem('aceon_music')||'null');if(s)return {idx:s.idx||0,t:s.t||0};}catch(e){}
  return {idx:0,t:0};
}
function playOn(deck,url,t){
  var el=deck.el;
  el.src=url;
  if(t)el.addEventListener('loadedmetadata',function f(){el.removeEventListener('loadedmetadata',f);try{el.currentTime=t;}catch(e){}});
  el.play().catch(function(){});
  fade(deck.gain,1,1.2);
}
function start(name){
  var list=resolve(name);
  if(cur&&cur.list===list){cur.name=name;return;}         // тот же плейлист: не перезапускать
  var old=cur&&cur.deck;
  var deck=decks[old===decks[0]?1:0];
  var pos=loadSaved(list);
  cur={name:name,list:list,idx:pos.idx%list.length,deck:deck};
  if(old){fade(old.gain,0,1.2);setTimeout(function(){if(cur.deck!==old)old.el.pause();},1300);}
  playOn(deck,list[cur.idx],pos.t);
}
function next(){
  if(!cur)return;
  cur.idx=(cur.idx+1)%cur.list.length;
  playOn(cur.deck,cur.list[cur.idx],0);
}

function music(name){want=name;if(unlocked)start(name);}
function playlists(map){for(var k in map)lists[k]=map[k];}
function duck(level,ms){
  if(!ctx||!musicGain)return;
  var now=ctx.currentTime,v=site.music;
  musicGain.gain.cancelScheduledValues(now);
  musicGain.gain.setValueAtTime(musicGain.gain.value,now);
  musicGain.gain.linearRampToValueAtTime(v*level,now+0.25);
  musicGain.gain.linearRampToValueAtTime(v*level,now+ms/1000);
  musicGain.gain.linearRampToValueAtTime(v,now+ms/1000+1);
}
function setVolume(kind,v){
  v=Math.max(0,Math.min(1,v));
  site[kind]=v;Store.save('site');
  var g=kind==='music'?musicGain:sfxGain;
  if(g&&ctx){g.gain.cancelScheduledValues(ctx.currentTime);g.gain.setValueAtTime(v,ctx.currentTime);}
}
function volume(kind){return site[kind];}

window.addEventListener('pagehide',function(){
  if(cur&&cur.list===ARCADE){
    try{sessionStorage.setItem('aceon_music',JSON.stringify({idx:cur.idx,t:cur.deck.el.currentTime||0}));}catch(e){}
  }
});

/* ── эффекты ── */
function tone(t,freq,dur,type,vol,slideTo){
  var o=ctx.createOscillator(),g=ctx.createGain();
  o.type=type;o.frequency.setValueAtTime(freq,t);
  if(slideTo)o.frequency.exponentialRampToValueAtTime(slideTo,t+dur);
  g.gain.setValueAtTime(0.0001,t);g.gain.exponentialRampToValueAtTime(vol,t+0.005);
  g.gain.exponentialRampToValueAtTime(0.0001,t+dur);
  o.connect(g);g.connect(sfxGain);o.start(t);o.stop(t+dur+0.02);
}
function noise(t,dur,vol,freq){
  var len=Math.floor(ctx.sampleRate*dur),buf=ctx.createBuffer(1,len,ctx.sampleRate),d=buf.getChannelData(0);
  for(var i=0;i<len;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/len,3);
  var s=ctx.createBufferSource(),f=ctx.createBiquadFilter(),g=ctx.createGain();
  f.type='bandpass';f.frequency.value=freq||1800;f.Q.value=0.8;g.gain.value=vol;
  s.buffer=buf;s.connect(f);f.connect(g);g.connect(sfxGain);s.start(t);
}
var SFX={
  move:function(t){noise(t,0.05,0.5,2200);tone(t,190,0.07,'sine',0.25,120);},
  capture:function(t){noise(t,0.09,0.7,1200);tone(t,140,0.12,'triangle',0.35,70);},
  check:function(t){tone(t,880,0.09,'square',0.06);tone(t+0.1,1175,0.14,'square',0.06);},
  select:function(t){tone(t,1400,0.03,'sine',0.05);},
  win:function(t){[523,659,784,1047].forEach(function(f,i){tone(t+i*0.11,f,0.18,'square',0.06);});},
  lose:function(t){[392,330,262,196].forEach(function(f,i){tone(t+i*0.14,f,0.22,'triangle',0.12);});},
  draw:function(t){tone(t,440,0.18,'triangle',0.1);tone(t+0.2,440,0.18,'triangle',0.1);}
};
function sfx(name){
  if(!SFX[name]||site.sfx<=0||!unlocked||!ctx)return;
  if(ctx.state==='suspended')ctx.resume();
  try{SFX[name](ctx.currentTime+0.01);}catch(e){}
}

/* свой эффект игры: Sound.define('eat', function(t, tone, noise){ tone(t, 660, 0.08, 'square', 0.06); }) */
function define(name,fn){SFX[name]=function(t){fn(t,tone,noise);};}

window.Sound={music:music,playlists:playlists,duck:duck,sfx:sfx,define:define,setVolume:setVolume,volume:volume};
})();
