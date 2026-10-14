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

/* заставка перед игрой; клик по ней заодно разрешает звук */
function splash(title,onStart){
  var sp=document.createElement('div');
  sp.id='arc-splash';
  sp.innerHTML='<div class="sp-ac">A.C.EON</div><div class="sp-game"></div><div class="sp-start">PRESS START</div>';
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

/* верхняя панель: кнопка назад, название, звук */
function topbar(title){
  var bar=document.createElement('header');
  bar.className='arc-top';
  bar.innerHTML='<a class="arc-back" href="'+new URL('../',BASE).href+'">&#9664; ARCADE</a>'+
                '<div class="arc-title"></div>'+
                '<button class="arc-icon-btn" type="button" title="Music">&#9835;</button>';
  bar.querySelector('.arc-title').textContent=title;
  var mb=bar.querySelector('.arc-icon-btn');
  mb.classList.toggle('off',music.off);
  mb.addEventListener('click',function(){mb.classList.toggle('off',!musicToggle());});
  document.body.insertBefore(bar,document.body.firstChild);
  return bar;
}

window.Arcade={getHi:getHi,setHi:setHi,trackPlay:trackPlay,splash:splash,topbar:topbar,
  lsGet:lsGet,lsSet:lsSet,music:{toggle:musicToggle,save:musicSave}};
})();
