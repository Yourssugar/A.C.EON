/* A.C.EON ARCADE: языки интерфейса.
   I18n.add(lang, {key: 'text'}) добавляет словарь, I18n.t(key, {var}) возвращает строку,
   элементы с data-i18n="key" обновляются сами при смене языка.
   Выбор хранится в localStorage 'aceon_lang' и общий для всего сайта. */
(function(){
'use strict';

var LANGS=[
  {code:'en',name:'English'},
  {code:'ru',name:'Русский'},
  {code:'de',name:'Deutsch'},
  {code:'fr',name:'Français'},
  {code:'es',name:'Español'},
  {code:'it',name:'Italiano'},
  {code:'pl',name:'Polski'}
];
var dict={},lang='en',listeners=[];

function known(code){return LANGS.some(function(l){return l.code===code;});}
function detect(){
  var saved=null;try{saved=localStorage.getItem('aceon_lang');}catch(e){}
  if(saved&&known(saved))return saved;
  var nav=(navigator.languages||[navigator.language||'en']);
  for(var i=0;i<nav.length;i++){var c=String(nav[i]).slice(0,2).toLowerCase();if(known(c))return c;}
  return 'en';
}

function add(code,table){
  dict[code]=dict[code]||{};
  for(var k in table)dict[code][k]=table[k];
}
/* строка (или массив для случайных фраз); {name} подставляется из vars */
function t(key,vars){
  var v=(dict[lang]&&dict[lang][key]!==undefined)?dict[lang][key]:(dict.en&&dict.en[key]!==undefined?dict.en[key]:key);
  if(typeof v==='string'&&vars)v=v.replace(/\{(\w+)\}/g,function(m,n){return vars[n]!==undefined?vars[n]:m;});
  return v;
}
function pick(key){var v=t(key);return Array.isArray(v)?v[Math.random()*v.length|0]:v;}

function apply(root){
  (root||document).querySelectorAll('[data-i18n]').forEach(function(el){el.textContent=t(el.dataset.i18n);});
  (root||document).querySelectorAll('[data-i18n-title]').forEach(function(el){el.title=t(el.dataset.i18nTitle);});
}
function set(code){
  if(!known(code))return;
  lang=code;
  try{localStorage.setItem('aceon_lang',code);}catch(e){}
  document.documentElement.lang=code;
  apply();
  listeners.forEach(function(fn){try{fn(code);}catch(e){}});
}
function onChange(fn){listeners.push(fn);}

lang=detect();
document.documentElement.lang=lang;

window.I18n={langs:LANGS,add:add,t:t,pick:pick,apply:apply,set:set,onChange:onChange,
  get lang(){return lang;}};
})();
