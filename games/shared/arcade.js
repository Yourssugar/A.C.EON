/* A.C.EON ARCADE: общий код для отдельных страниц игр.
   Рекорды и счётчик игр лежат в тех же ключах localStorage, что и в старом лаунчере. */
(function(){
'use strict';

var BASE=new URL('.',document.currentScript.src);   // .../games/shared/
var AUDIO=new URL('../../audio/',BASE);              // .../audio/
var TRACKS=[1,2,3,4,5,6,7,8].map(function(n){return new URL('track-8-bit-'+n+'.mp3',AUDIO).href;});

function lsGet(k,d){try{var v=localStorage.getItem(k);return v===null?d:v;}catch(e){return d;}}
function lsSet(k,v){try{localStorage.setItem(k,v);}catch(e){}}
function ssGet(k){try{return JSON.parse(sessionStorage.getItem(k)||'null');}catch(e){return null;}}
function ssSet(k,v){try{sessionStorage.setItem(k,JSON.stringify(v));}catch(e){}}

/* рекорды */
function getHi(id){return parseInt(lsGet('aceon_hi_'+id,'0'),10)||0;}
function setHi(id,sc){if(sc>getHi(id))lsSet('aceon_hi_'+id,sc);return getHi(id);}
function trackPlay(){var n=(parseInt(lsGet('aceon_plays','0'),10)||0)+1;lsSet('aceon_plays',n);return n;}

/* музыка: продолжает трек с того же места при переходе между страницами */
var music={audio:null,idx:0,started:false,off:lsGet('aceon_music_off','0')==='1'};
function musicSave(){
  if(!music.audio)return;
  ssSet('aceon_music',{idx:music.idx,t:music.audio.currentTime||0});
}
function musicPlay(idx,t){
  music.idx=((idx%TRACKS.length)+TRACKS.length)%TRACKS.length;
  music.audio.src=TRACKS[music.idx];
  if(t){music.audio.addEventListener('loadedmetadata',function f(){music.audio.removeEventListener('loadedmetadata',f);try{music.audio.currentTime=t;}catch(e){}});}
  music.audio.play().catch(function(){});
}
function musicStart(){
  if(music.started||music.off)return;
  music.started=true;
  music.audio=new Audio();music.audio.volume=0.35;
  music.audio.addEventListener('ended',function(){musicPlay(music.idx+1,0);});
  var s=ssGet('aceon_music');
  musicPlay(s?s.idx:0,s?s.t:0);
}
function musicToggle(){
  music.off=!music.off;lsSet('aceon_music_off',music.off?'1':'0');
  if(music.off){if(music.audio)music.audio.pause();}
  else if(!music.started)musicStart();
  else music.audio.play().catch(function(){});
  return !music.off;
}
window.addEventListener('pagehide',musicSave);
document.addEventListener('pointerdown',musicStart,{once:true});

/* звуковые эффекты: синтез через WebAudio, без файлов */
var sfxState={ctx:null,off:lsGet('aceon_sfx_off','0')==='1'};
function sfxCtx(){
  if(!sfxState.ctx){var AC=window.AudioContext||window.webkitAudioContext;if(!AC)return null;sfxState.ctx=new AC();}
  if(sfxState.ctx.state==='suspended')sfxState.ctx.resume();
  return sfxState.ctx;
}
function tone(ctx,t,freq,dur,type,vol,slideTo){
  var o=ctx.createOscillator(),g=ctx.createGain();
  o.type=type;o.frequency.setValueAtTime(freq,t);
  if(slideTo)o.frequency.exponentialRampToValueAtTime(slideTo,t+dur);
  g.gain.setValueAtTime(0.0001,t);g.gain.exponentialRampToValueAtTime(vol,t+0.005);
  g.gain.exponentialRampToValueAtTime(0.0001,t+dur);
  o.connect(g);g.connect(ctx.destination);o.start(t);o.stop(t+dur+0.02);
}
function noise(ctx,t,dur,vol,freq){
  var len=Math.floor(ctx.sampleRate*dur),buf=ctx.createBuffer(1,len,ctx.sampleRate),d=buf.getChannelData(0);
  for(var i=0;i<len;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/len,3);
  var s=ctx.createBufferSource(),f=ctx.createBiquadFilter(),g=ctx.createGain();
  f.type='bandpass';f.frequency.value=freq||1800;f.Q.value=0.8;g.gain.value=vol;
  s.buffer=buf;s.connect(f);f.connect(g);g.connect(ctx.destination);s.start(t);
}
var SFX={
  move:function(c,t){noise(c,t,0.05,0.5,2200);tone(c,t,190,0.07,'sine',0.25,120);},
  capture:function(c,t){noise(c,t,0.09,0.7,1200);tone(c,t,140,0.12,'triangle',0.35,70);},
  check:function(c,t){tone(c,t,880,0.09,'square',0.06);tone(c,t+0.1,1175,0.14,'square',0.06);},
  select:function(c,t){tone(c,t,1400,0.03,'sine',0.05);},
  win:function(c,t){[523,659,784,1047].forEach(function(f,i){tone(c,t+i*0.11,f,0.18,'square',0.06);});},
  lose:function(c,t){[392,330,262,196].forEach(function(f,i){tone(c,t+i*0.14,f,0.22,'triangle',0.12);});},
  draw:function(c,t){tone(c,t,440,0.18,'triangle',0.1);tone(c,t+0.2,440,0.18,'triangle',0.1);}
};
function sfx(name){
  if(sfxState.off||!SFX[name])return;
  var c=sfxCtx();if(!c)return;
  try{SFX[name](c,c.currentTime+0.01);}catch(e){}
}
function sfxToggle(){sfxState.off=!sfxState.off;lsSet('aceon_sfx_off',sfxState.off?'1':'0');return !sfxState.off;}

/* заставка перед игрой; клик по ней заодно разрешает звук */
function splash(title,onStart){
  var sp=document.createElement('div');
  sp.id='arc-splash';
  sp.innerHTML='<div class="sp-ac">A.C.EON</div><div class="sp-game"></div><div class="sp-start">'+tr('arc.press')+'</div>';
  sp.querySelector('.sp-game').textContent=title;
  document.body.appendChild(sp);
  function go(){
    document.removeEventListener('keydown',onKey);
    sp.style.opacity='0';
    setTimeout(function(){sp.remove();if(onStart)onStart();},300);
  }
  function onKey(e){if(e.key==='Enter'||e.key===' '){e.preventDefault();go();}}
  sp.addEventListener('click',go,{once:true});
  document.addEventListener('keydown',onKey);
}

/* общие строки панели */
var STR={
  en:{'arc.back':'ARCADE','arc.press':'PRESS START','arc.music':'Music','arc.sfx':'Sound effects','arc.lang':'Language'},
  ru:{'arc.back':'АРКАДА','arc.press':'НАЖМИ СТАРТ','arc.music':'Музыка','arc.sfx':'Звуки','arc.lang':'Язык'},
  de:{'arc.back':'ARCADE','arc.press':'START DRÜCKEN','arc.music':'Musik','arc.sfx':'Soundeffekte','arc.lang':'Sprache'},
  fr:{'arc.back':'ARCADE','arc.press':'APPUIE SUR START','arc.music':'Musique','arc.sfx':'Effets sonores','arc.lang':'Langue'},
  es:{'arc.back':'ARCADE','arc.press':'PULSA START','arc.music':'Música','arc.sfx':'Efectos de sonido','arc.lang':'Idioma'},
  it:{'arc.back':'ARCADE','arc.press':'PREMI START','arc.music':'Musica','arc.sfx':'Effetti sonori','arc.lang':'Lingua'},
  pl:{'arc.back':'ARCADE','arc.press':'NACIŚNIJ START','arc.music':'Muzyka','arc.sfx':'Efekty dźwiękowe','arc.lang':'Język'}
};
if(window.I18n)for(var lc in STR)I18n.add(lc,STR[lc]);
function tr(k){return window.I18n?I18n.t(k):STR.en[k];}

/* выбор языка: кнопка с кодом и выпадающий список */
function langPicker(){
  var wrap=document.createElement('div');wrap.className='arc-lang';
  var btn=document.createElement('button');btn.type='button';btn.className='arc-icon-btn arc-lang-btn';
  btn.dataset.i18nTitle='arc.lang';btn.title=tr('arc.lang');
  var list=document.createElement('div');list.className='arc-lang-list hidden';
  function paint(){
    btn.textContent=I18n.lang.toUpperCase();
    list.innerHTML='';
    I18n.langs.forEach(function(l){
      var o=document.createElement('button');o.type='button';
      o.className='arc-lang-opt'+(l.code===I18n.lang?' sel':'');
      o.innerHTML='<b>'+l.code.toUpperCase()+'</b> '+l.name;
      o.addEventListener('click',function(){list.classList.add('hidden');I18n.set(l.code);});
      list.appendChild(o);
    });
  }
  btn.addEventListener('click',function(e){e.stopPropagation();list.classList.toggle('hidden');});
  document.addEventListener('click',function(e){if(!wrap.contains(e.target))list.classList.add('hidden');});
  I18n.onChange(paint);paint();
  wrap.appendChild(btn);wrap.appendChild(list);
  return wrap;
}

/* верхняя панель: назад, название, язык, звуки, музыка */
function topbar(titleKey){
  var bar=document.createElement('header');
  bar.className='arc-top';
  bar.innerHTML='<a class="arc-back" href="'+new URL('../',BASE).href+'">&#9664; <span data-i18n="arc.back">'+tr('arc.back')+'</span></a>'+
                '<div class="arc-title" data-i18n="'+titleKey+'"></div>'+
                '<span class="arc-slot"></span>'+
                '<button class="arc-icon-btn" type="button" data-i18n-title="arc.sfx" data-k="sfx">FX</button>'+
                '<button class="arc-icon-btn" type="button" data-i18n-title="arc.music" data-k="music">&#9835;</button>';
  if(window.I18n)bar.querySelector('.arc-slot').replaceWith(langPicker());
  else bar.querySelector('.arc-slot').remove();
  var mb=bar.querySelector('[data-k="music"]'),sb=bar.querySelector('[data-k="sfx"]');
  mb.classList.toggle('off',music.off);
  sb.classList.toggle('off',sfxState.off);
  mb.addEventListener('click',function(){mb.classList.toggle('off',!musicToggle());});
  sb.addEventListener('click',function(){sb.classList.toggle('off',!sfxToggle());});
  document.body.insertBefore(bar,document.body.firstChild);
  if(window.I18n)I18n.apply(bar);
  return bar;
}

window.Arcade={getHi:getHi,setHi:setHi,trackPlay:trackPlay,splash:splash,topbar:topbar,sfx:sfx,
  lsGet:lsGet,lsSet:lsSet,music:{toggle:musicToggle,save:musicSave}};
})();
