/* A.C.EON ARCADE: хранилище настроек и сохранений.
   Каждый раздел лежит в localStorage одним JSON-объектом под ключом 'aceon:<раздел>'
   и несёт номер версии схемы (v). При изменении схемы раздел поднимает версию
   и описывает migrate(), старые данные переносятся, а не теряются.

   Store.define('chess', {version:1, defaults:{...}, legacy:fn, migrate:fn})
   Store.get('chess')   объект раздела (всегда есть, с дефолтами)
   Store.save('chess')  записать после изменений

   Раздел 'site' (общие настройки сайта) описан здесь же. */
(function(){
'use strict';

var PREFIX='aceon:';
var defs={},cache={};

function readRaw(k){try{var s=localStorage.getItem(k);return s===null?null:s;}catch(e){return null;}}
function readJSON(k){var s=readRaw(k);if(s===null)return null;try{return JSON.parse(s);}catch(e){return null;}}
function writeJSON(k,v){try{localStorage.setItem(k,JSON.stringify(v));}catch(e){}}
function clone(o){return JSON.parse(JSON.stringify(o));}

/* недостающие поля берутся из дефолтов (на один уровень вглубь) */
function fill(obj,def){
  for(var k in def){
    if(obj[k]===undefined)obj[k]=clone(def[k]);
    else if(def[k]&&typeof def[k]==='object'&&!Array.isArray(def[k])&&obj[k]&&typeof obj[k]==='object'){
      for(var j in def[k])if(obj[k][j]===undefined)obj[k][j]=clone(def[k][j]);
    }
  }
  return obj;
}

function define(ns,d){defs[ns]=d;delete cache[ns];}

function get(ns){
  if(cache[ns])return cache[ns];
  var d=defs[ns];if(!d)throw new Error('Store: unknown section '+ns);
  var data=readJSON(PREFIX+ns);
  if(!data&&d.legacy){                       // первый запуск после обновления: забрать старые ключи
    try{data=d.legacy(readRaw,readJSON);}catch(e){data=null;}
  }
  if(!data)data={};
  if(data.v&&data.v<d.version&&d.migrate){
    try{data=d.migrate(data,data.v)||data;}catch(e){}
  }
  data=fill(data,d.defaults);
  data.v=d.version;
  cache[ns]=data;
  writeJSON(PREFIX+ns,data);
  return data;
}
function save(ns){if(cache[ns])writeJSON(PREFIX+ns,cache[ns]);}

/* общие настройки сайта */
define('site',{
  version:1,
  defaults:{lang:null,music:0.6,sfx:0.8},
  legacy:function(raw){
    var o={};
    var l=raw('aceon_lang');if(l)o.lang=l;
    if(raw('aceon_music_off')==='1')o.music=0;
    if(raw('aceon_sfx_off')==='1')o.sfx=0;
    return o;
  }
});

window.Store={define:define,get:get,save:save};
})();
