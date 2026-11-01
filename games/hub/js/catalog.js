/* A.C.EON ARCADE: список игр для новой страницы.

   id        имя файлов картинок (art/covers/<id>.webp, art/heroes/<id>.webp) и ключ текстов (g.<id>, gd.<id>)
   url       куда вести по «Играть»; ещё не переделанные игры живут в classic/ и открываются по #id
   cat       arcade | puzzle | board | cards
   color     цвет игры: подсветка фона и карточки
   emoji     значок для заглушки, пока нет картинок
   stats()   короткие строки для панели: [[ключ подписи, значение], ...] из сохранений игры */
(function(){
'use strict';

function load(ns){try{return JSON.parse(localStorage.getItem('aceon:'+ns)||'null')||{};}catch(e){return {};}}
function hi(id){try{return parseInt(localStorage.getItem('aceon_hi_'+id),10)||0;}catch(e){return 0;}}
function raw(k){try{return parseInt(localStorage.getItem(k),10)||0;}catch(e){return 0;}}
function sum(obj,f){var n=0;for(var k in obj)if(obj[k])n+=f(obj[k],k)||0;return n;}
function max(obj,f){var n=0;for(var k in obj)if(obj[k])n=Math.max(n,f(obj[k],k)||0);return n;}
function fmtTime(ms){var s=Math.round(ms/1000),m=Math.floor(s/60);s%=60;return m+':'+(s<10?'0':'')+s;}
/* стандартный набор: сыграно и выиграно по всем режимам */
function wonPlayed(ns){
  var d=load(ns),st=d.stats||{};
  var p=sum(st,function(s){return s.played;}),w=sum(st,function(s){return s.won||s.win;});
  return p?[['s.won',w+' / '+p]]:[];
}

var GAMES=[
  {id:'chess',cat:'board',url:'chess/',color:'#ffd23a',emoji:'♛',stats:function(){
    var d=load('chess'),out=[],w=sum(d.wins||{},function(v){return v;});
    if(d.rating&&d.rating.adaptive)out.push(['s.rating',Math.round(d.rating.adaptive)]);
    if(w)out.push(['s.wins',w]);
    return out;}},
  {id:'solitaire',cat:'cards',url:'solitaire/',color:'#2ee87a',emoji:'♠',stats:function(){return wonPlayed('solitaire');}},
  {id:'minesweeper',cat:'puzzle',url:'minesweeper/',color:'#ff5a6a',emoji:'💣',stats:function(){
    var st=load('minesweeper').stats||{},out=wonPlayed('minesweeper');
    var b=st['classic-beg']&&st['classic-beg'].best;if(b)out.push(['s.bestBeg',fmtTime(b)]);
    return out;}},
  {id:'tetris',cat:'arcade',url:'tetris/',color:'#8c6cff',emoji:'🧱',stats:function(){
    var st=load('tetris').stats||{},out=[];
    var b=st.marathon&&st.marathon.best;if(b)out.push(['s.best',b]);
    var l=sum(st,function(s){return s.lines;});if(l)out.push(['s.lines',l]);
    return out;}},
  {id:'breakout',cat:'arcade',url:'breakout/',color:'#00e5ff',emoji:'🧱',stats:function(){
    var d=load('breakout'),out=[],stars=sum((d.progress||{}).stars||[],function(v){return v;});
    if(stars)out.push(['s.stars',stars+' / 90']);
    var b=max(d.stats||{},function(s,k){return k.indexOf('endless')===0?s.best:0;});if(b)out.push(['s.best',b]);
    return out;}},
  {id:'snake',cat:'arcade',url:'snake/',color:'#2ee87a',emoji:'🐍',stats:function(){
    var d=load('snake'),out=[],b=max(d.best||{},function(v){return v;});
    if(b)out.push(['s.best',b]);
    var lv=d.levels&&d.levels.best?Object.keys(d.levels.best).length:0;if(lv)out.push(['s.levels',lv]);
    return out;}},
  {id:'2048',cat:'puzzle',url:'2048/',color:'#ffb02e',emoji:'🔢',stats:function(){
    var st=load('2048').stats||{},out=[];
    var b=max(st,function(s){return s.best;}),t=max(st,function(s){return s.tile;});
    if(b)out.push(['s.best',b]);if(t)out.push(['s.tile',t]);
    return out;}},
  {id:'tictactoe',cat:'board',url:'tictactoe/',color:'#ff2d78',emoji:'❌',stats:function(){
    var st=load('tictactoe').stats||{},p=sum(st,function(s){return s.played;});
    return p?[['s.won',sum(st,function(s){return s.win;})+' / '+p]]:[];}},
  {id:'battleship',cat:'board',url:'battleship/',color:'#4aa8ff',emoji:'🚢',stats:function(){return wonPlayed('battleship');}},
  /* ещё не переделанные: страница classic/ */
  {id:'pong',cat:'arcade',url:'classic/#pong',color:'#00e5ff',emoji:'🏓',classic:true,stats:function(){return [];}},
  {id:'runner',cat:'arcade',url:'classic/#pf',color:'#ff8a1a',emoji:'🏃',classic:true,stats:function(){var h=hi('pf');return h?[['s.best',h]]:[];}},
  {id:'stacker',cat:'arcade',url:'classic/#ts',color:'#ffb02e',emoji:'🔶',classic:true,stats:function(){var h=hi('ts');return h?[['s.best',h]]:[];}},
  {id:'bubbles',cat:'arcade',url:'classic/#bubbles',color:'#ff5ad8',emoji:'🫧',classic:true,stats:function(){var h=hi('bubble');return h?[['s.best',h]]:[];}},
  {id:'checkers',cat:'board',url:'classic/#checkers',color:'#ff5a6a',emoji:'⛀',classic:true,stats:function(){return [];}},
  {id:'simon',cat:'puzzle',url:'classic/#simon',color:'#2ee87a',emoji:'🔴',classic:true,stats:function(){var h=hi('simon');return h?[['s.best',h]]:[];}},
  {id:'wordle',cat:'puzzle',url:'classic/#wordle',color:'#ffd23a',emoji:'🔤',classic:true,stats:function(){var w=raw('aceon_wl_wins');return w?[['s.wins',w]]:[];}},
  {id:'flood',cat:'puzzle',url:'classic/#flood',color:'#4aa8ff',emoji:'🌊',classic:true,stats:function(){var b=raw('aceon_hi_flood');return b?[['s.moves',b]]:[];}},
  {id:'mastermind',cat:'puzzle',url:'classic/#mind',color:'#b06cff',emoji:'🎯',classic:true,stats:function(){var w=raw('aceon_mm_wins');return w?[['s.wins',w]]:[];}},
  {id:'puzzle15',cat:'puzzle',url:'classic/#puzzle',color:'#7dffb0',emoji:'🧩',classic:true,stats:function(){var b=raw('aceon_hi_pz4');return b?[['s.moves',b]]:[];}}
];
var CATS=['all','arcade','puzzle','board','cards'];

window.HubCatalog={GAMES:GAMES,CATS:CATS,byId:function(id){for(var i=0;i<GAMES.length;i++)if(GAMES[i].id===id)return GAMES[i];return null;}};
})();
