/* A.C.EON ARCADE: загрузчик страницы игры.

   Подключение в index.html игры (единственный обычный <script> на странице):
     <script src="../shared/boot.js" data-v="3"></script>
   data-v: версия выкладки. Её дописывает ко всем файлам (?v=3), поэтому после
   выкладки браузер не смешивает новые файлы со старыми из кэша.
   МЕНЯТЬ data-v ПРИ КАЖДОЙ ВЫКЛАДКЕ ИГРЫ (и всех игр, если менялся games/shared).

   Список файлов лежит в той же странице:
     <script type="application/json" id="boot-manifest">{ "files":[...] }</script>
   Файл: {"src":"js/chess.js","kb":22}  kb: примерный вес, по нему считается прогресс.
     css и js подключаются по порядку, остальное (wasm, mp3...) только скачивается
     заранее, чтобы потом взяться из кэша. "nov":true: без ?v= (файл, который
     запрашивает чужой код по своему адресу, например stockfish.wasm).
     "optional":true: если файл не скачался, страница всё равно запускается
     (игра сама решает, что делать без него).

   Обложка: <template id="boot-skin"> в странице игры. Загрузчик кладёт её внутрь
   экрана загрузки и выставляет CSS-переменную --p (0..1) с прогрессом.
   Если всё грузится быстрее 300 мс (кэш), экран загрузки не появляется. */
(function(){
'use strict';

var me=document.currentScript;
var V=me.dataset.v||'0';
var SHARED=new URL('.',me.src);
var PAGE=new URL('.',location.href);

function url(src,nov){var u=new URL(src,PAGE);if(!nov)u.searchParams.set('v',V);return u.href;}

/* тексты экрана загрузки: i18n ещё не загружен, поэтому свои */
var TXT={
  en:['LOADING','LOAD ERROR','RETRY'],ru:['ЗАГРУЗКА','ОШИБКА ЗАГРУЗКИ','ПОВТОРИТЬ'],
  de:['LADEN','LADEFEHLER','NOCHMAL'],fr:['CHARGEMENT','ERREUR','RÉESSAYER'],
  es:['CARGANDO','ERROR DE CARGA','REINTENTAR'],it:['CARICAMENTO','ERRORE','RIPROVA'],
  pl:['ŁADOWANIE','BŁĄD ŁADOWANIA','PONÓW']
};
function lang(){
  try{var s=JSON.parse(localStorage.getItem('aceon:site')||'null');if(s&&TXT[s.lang])return s.lang;}catch(e){}
  try{var o=localStorage.getItem('aceon_lang');if(TXT[o])return o;}catch(e){}
  var n=(navigator.language||'en').slice(0,2).toLowerCase();
  return TXT[n]?n:'en';
}
var T=TXT[lang()];

/* стиль экрана загрузки и шрифт: до загрузки остальных стилей */
var FONT=['latin','latin-ext','cyrillic','cyrillic-ext'].map(function(s,i){
  var R=['U+0000-00FF,U+0131,U+0152-0153,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD',
         'U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF',
         'U+0301,U+0400-045F,U+0490-0491,U+04B0-04B1,U+2116',
         'U+0460-052F,U+1C80-1C8A,U+20B4,U+2DE0-2DFF,U+A640-A69F,U+FE2E-FE2F'][i];
  return "@font-face{font-family:'Press Start 2P';font-display:swap;src:url("+new URL('fonts/ps2p-'+s+'.woff2',SHARED).href+") format('woff2');unicode-range:"+R+";}";
}).join('');
var css=FONT+
  'html,body{background:#050510;margin:0;}html:not(.booted) body>*:not(#boot){visibility:hidden;}'+
  '#boot{position:fixed;inset:0;z-index:99999;background:#050510;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:26px;'+
  'font-family:"Press Start 2P",monospace;color:#00e5ff;opacity:0;visibility:hidden;transition:opacity .35s,visibility .35s;--p:0;}'+
  '#boot.show{opacity:1;visibility:visible;}#boot.done{opacity:0;visibility:hidden;}'+
  '#boot::after{content:"";position:absolute;inset:0;pointer-events:none;background:repeating-linear-gradient(0deg,transparent 0 2px,rgba(0,0,0,.18) 2px 4px);}'+
  '.boot-bar{width:min(320px,70vw);height:12px;border:1px solid #003355;padding:2px;box-sizing:border-box;}'+
  '.boot-fill{height:100%;width:calc(var(--p)*100%);background:repeating-linear-gradient(90deg,#00e5ff 0 6px,#007799 6px 8px);box-shadow:0 0 10px rgba(0,229,255,.6);transition:width .2s;}'+
  '.boot-txt{font-size:9px;letter-spacing:3px;color:#5f8fa6;display:flex;gap:16px;}'+
  '.boot-txt b{color:#00e5ff;font-weight:normal;min-width:4ch;text-align:right;}'+
  '.boot-err{display:none;flex-direction:column;align-items:center;gap:16px;font-size:9px;letter-spacing:2px;color:#ff3344;}'+
  '#boot.err .boot-err{display:flex;}#boot.err .boot-bar,#boot.err .boot-txt{display:none;}'+
  '.boot-err button{font:inherit;font-size:8px;padding:10px 16px;background:#001020;color:#80f0ff;border:1px solid #00e5ff;cursor:pointer;}';
var st=document.createElement('style');st.textContent=css;document.head.appendChild(st);

/* экран загрузки */
var box=document.createElement('div');box.id='boot';
var skin=document.getElementById('boot-skin');
if(skin)box.appendChild(skin.content.cloneNode(true));
box.insertAdjacentHTML('beforeend',
  '<div class="boot-bar"><div class="boot-fill"></div></div>'+
  '<div class="boot-txt"><span>'+T[0]+'</span><b>0%</b></div>'+
  '<div class="boot-err"><span>'+T[1]+'</span><button type="button">'+T[2]+'</button></div>');
box.querySelector('.boot-err button').addEventListener('click',function(){location.reload();});
function mount(){document.body.appendChild(box);}
if(document.body)mount();else document.addEventListener('DOMContentLoaded',mount);
var showTimer=setTimeout(function(){box.classList.add('show');},300);

var pct=box.querySelector('.boot-txt b');
function progress(p){p=Math.max(0,Math.min(1,p));box.style.setProperty('--p',p.toFixed(3));pct.textContent=Math.round(p*100)+'%';}

/* скачать файл, считая полученные байты */
function fetchTracked(f,onBytes){
  return fetch(f.href).then(function(res){
    if(!res.ok)throw new Error(res.status+' '+f.src);
    if(!res.body||!res.body.getReader)return res.arrayBuffer().then(function(b){onBytes(b.byteLength);});
    var reader=res.body.getReader();
    function pump(){return reader.read().then(function(r){if(r.done)return;onBytes(r.value.byteLength);return pump();});}
    return pump();
  });
}
function addCss(href){
  return new Promise(function(ok,bad){
    var l=document.createElement('link');l.rel='stylesheet';l.href=href;
    l.onload=ok;l.onerror=function(){bad(new Error('css '+href));};
    document.head.appendChild(l);
  });
}
function addJs(href){
  return new Promise(function(ok,bad){
    var s=document.createElement('script');s.src=href;s.async=false;
    s.onload=ok;s.onerror=function(){bad(new Error('js '+href));};
    document.body.appendChild(s);
  });
}

var manifest;
try{manifest=JSON.parse(document.getElementById('boot-manifest').textContent);}
catch(e){manifest={files:[]};}
var files=(manifest.files||[]).map(function(f){
  return {src:f.src,href:url(f.src,f.nov),kb:f.kb||10,got:0,optional:!!f.optional,kind:/\.css$/.test(f.src)?'css':/\.js$/.test(f.src)&&!f.prefetch?'js':'data'};
});
var total=files.reduce(function(s,f){return s+f.kb*1024;},0)*1.05;   // 5% на шрифты и запуск

var readyResolve;
var ready=new Promise(function(r){readyResolve=r;});

function fail(err){
  clearTimeout(showTimer);
  console.error('[boot]',err);
  box.classList.add('show','err');
}

function run(){
  /* 1. скачать всё параллельно, с прогрессом */
  var dl=files.map(function(f){
    return fetchTracked(f,function(n){
      f.got=Math.min(f.got+n,f.kb*1024);
      progress(files.reduce(function(s,x){return s+x.got;},0)/total);
    }).then(function(){f.got=f.kb*1024;},function(err){
      if(!f.optional)throw err;
      console.warn('[boot] optional file failed',f.src);f.got=f.kb*1024;
    });
  });
  Promise.all(dl).then(function(){
    /* 2. подключить стили, потом скрипты по порядку (из кэша) */
    return Promise.all(files.filter(function(f){return f.kind==='css';}).map(function(f){return addCss(f.href);}));
  }).then(function(){
    return files.filter(function(f){return f.kind==='js';}).reduce(function(p,f){return p.then(function(){return addJs(f.href);});},Promise.resolve());
  }).then(function(){
    /* 3. дождаться шрифта, чтобы текст не прыгал */
    var sample=document.body.innerText.slice(0,200)||'A';
    return Promise.race([document.fonts.load('10px "Press Start 2P"',sample),new Promise(function(r){setTimeout(r,1500);})]);
  }).then(function(){
    progress(1);
    clearTimeout(showTimer);
    box.classList.add('done');
    setTimeout(function(){box.remove();},400);
    document.documentElement.classList.add('booted');
    readyResolve();
    document.dispatchEvent(new CustomEvent('aceon:ready'));
  }).catch(fail);
}

window.Boot={version:V,url:url,ready:ready};
if(document.body)run();else document.addEventListener('DOMContentLoaded',run);
})();
