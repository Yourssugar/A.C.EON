/* A.C.EON ARCADE: загрузка three.js (WebGL) для 3D-режимов игр.
   Файл библиотеки лежит в games/shared/three/ и качается только когда игрок включает 3D.

   Three3D.supported()          есть ли WebGL и динамический импорт
   Three3D.load(onProgress)     Promise с модулем three.js, onProgress(0..1)
   Three3D.get()                модуль, если уже загружен, иначе null */
(function(){
'use strict';

var BASE=new URL('.',document.currentScript.src);
var THREE=null,loading=null;
var THREE_KB=655;   // размер three.module.min.js для прогресса, если сервер не прислал длину

/* динамический импорт собирается через Function: старые браузеры не знают такой синтаксис,
   и без обёртки не разобрался бы весь файл, а вместе с ним сломалась бы 2D-игра */
var dynImport=null;
try{dynImport=new Function('u','return import(u)');}catch(e){dynImport=null;}

function supported(){
  if(!dynImport||!window.Promise||!window.fetch)return false;
  try{var c=document.createElement('canvas');return !!(window.WebGLRenderingContext&&(c.getContext('webgl2')||c.getContext('webgl')));}
  catch(e){return false;}
}

function load(onProgress){
  if(THREE)return Promise.resolve(THREE);
  if(loading)return loading;
  var url=new URL('three/three.module.min.js',BASE).href+(window.Boot&&Boot.version?'?v='+Boot.version:'');
  function progress(p){if(onProgress)try{onProgress(Math.max(0,Math.min(1,p)));}catch(e){}}
  loading=fetch(url).then(function(res){
    if(!res.ok)throw new Error('HTTP '+res.status);
    var total=parseInt(res.headers.get('content-length'),10);
    if(!total||total<THREE_KB*1024*0.8)total=THREE_KB*1024;   // при gzip длина сжатая, считаем по известному размеру
    if(!res.body||!res.body.getReader)return res.text();
    var reader=res.body.getReader(),got=0,chunks=[];
    function pump(){
      return reader.read().then(function(x){
        if(x.done)return new Blob(chunks).text();
        chunks.push(x.value);got+=x.value.length;progress(got/total);
        return pump();
      });
    }
    return pump();
  }).then(function(src){
    var blob=URL.createObjectURL(new Blob([src],{type:'text/javascript'}));
    return dynImport(blob).then(function(m){URL.revokeObjectURL(blob);return m;});
  }).catch(function(){
    return dynImport(url);      // запасной путь: обычный импорт без прогресса
  }).then(function(m){THREE=m;progress(1);return m;},function(err){loading=null;throw err;});
  return loading;
}

window.Three3D={supported:supported,load:load,get:function(){return THREE;}};
})();
