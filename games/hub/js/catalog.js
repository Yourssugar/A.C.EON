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
  {id:'runner',cat:'arcade',url:'runner/',color:'#ff8a1a',emoji:'\uD83C\uDFC3',stats:function(){
    var d=load('runner'),out=[],b=d.stats&&d.stats.best,old=hi('pf');
    if(b)out.push(['s.distM',Math.floor(b)]);else if(old)out.push(['s.best',old]);
    var stars=0,sv=(d.adv||{}).stars||{};for(var k in sv)stars+=(sv[k]||[]).length;
    if(stars)out.push(['s.stars',stars+' / 45']);
    return out;}},
  {id:'pong',cat:'arcade',url:'pong/',color:'#00e5ff',emoji:'\uD83C\uDFD3',stats:function(){
    var st=load('pong').stats||{},out=[],w=0,p=0;
    for(var k in st)if(k.indexOf('bot-')===0&&st[k]){w+=st[k].won||0;p+=st[k].played||0;}
    if(p)out.push(['s.won',w+' / '+p]);
    var r=max(st,function(s){return s.bestRally;});if(r)out.push(['s.rally',r]);
    return out;}},
  {id:'bubbles',cat:'arcade',url:'bubbles/',color:'#ff5ad8',emoji:'\uD83E\uDEE7',stats:function(){
    var d=load('bubbles'),out=[],b=d.stats&&d.stats.best;
    if(b)out.push(['s.best',b]);
    var stars=0,sv=(d.lv||{}).stars||{};for(var k in sv)stars+=sv[k]|0;
    if(stars)out.push(['s.stars',stars+' / 90']);
    return out;}},
  {id:'simon',cat:'puzzle',url:'simon/',color:'#2ee87a',emoji:'\uD83D\uDD34',stats:function(){
    var st=load('simon').stats||{},out=[],b=Math.max((st.easy||{}).best||0,(st.normal||{}).best||0,(st.hard||{}).best||0,hi('simon'));
    if(b)out.push(['s.best',b]);
    return out;}},
  {id:'checkers',cat:'board',url:'checkers/',color:'#ff5a6a',emoji:'\u26C0',stats:function(){
    var st=load('checkers').stats||{},w=0,p=0;
    for(var k in st)if(st[k]&&!/-duo$/.test(k)){w+=st[k].win||0;p+=st[k].played||0;}
    return p?[['s.won',w+' / '+p]]:[];}},
  {id:'stacker',cat:'arcade',url:'stacker/',color:'#ffb02e',emoji:'\uD83D\uDD36',stats:function(){
    var d=load('stacker'),out=[],b=Math.max((d.stats||{}).best||0,hi('ts'));
    if(b)out.push(['s.best',b]);
    var stars=0,sv=(d.lv||{}).stars||{};for(var k in sv)stars+=sv[k]|0;
    if(stars)out.push(['s.stars',stars+' / 60']);
    return out;}},
  {id:'wordle',cat:'puzzle',url:'wordle/',color:'#1fd47a',emoji:'🔤',stats:function(){
    var d=load('wordle'),st=d.stats||{},w=Math.max(st.wins||0,parseInt(raw('aceon_wl_wins'),10)||0),out=[];
    if(w)out.push(['s.wins',w]);
    var ds=st.daily||{},bs=Math.max((ds.ru||{}).best||0,(ds.en||{}).best||0);if(bs)out.push(['s.streak',bs]);
    return out;}},
  {id:'flood',cat:'puzzle',url:'flood/',color:'#4aa8ff',emoji:'🌊',stats:function(){
    var d=load('flood'),st=d.stats||{},out=[],du=d.duel||{},w=0;
    if(st.solved)out.push(['s.solved',st.solved]);
    ['easy','normal','hard'].forEach(function(k){w+=(du[k]||{}).w||0;});if(w)out.push(['s.won',w]);
    if(!out.length){var b=raw('aceon_hi_flood');if(b)out.push(['s.moves',b]);}
    return out;}},
  {id:'mastermind',cat:'puzzle',url:'mastermind/',color:'#b06cff',emoji:'🎯',stats:function(){
    var d=load('mastermind'),st=d.stats||{},w=Math.max(st.wins||0,parseInt(raw('aceon_mm_wins'),10)||0),out=[],du=d.duel||{},dw=0;
    if(w)out.push(['s.wins',w]);
    ['easy','normal','hard'].forEach(function(k){dw+=(du[k]||{}).w||0;});if(dw)out.push(['s.duel',dw]);
    return out;}},
  {id:'puzzle15',cat:'puzzle',url:'puzzle15/',color:'#7dffb0',emoji:'🧩',stats:function(){
    var d=load('puzzle15'),st=d.stats||{},b4=((st.by||{})[4]||{}).bestMoves||parseInt(raw('aceon_hi_pz4'),10)||0,out=[];
    if(st.solved)out.push(['s.solved',st.solved]);
    if(b4)out.push(['s.moves',b4]);
    return out;}}
];
var CATS=['all','arcade','puzzle','board','cards'];

window.HubCatalog={GAMES:GAMES,CATS:CATS,byId:function(id){for(var i=0;i<GAMES.length;i++)if(GAMES[i].id===id)return GAMES[i];return null;}};
})();
