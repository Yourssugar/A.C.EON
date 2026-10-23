/* A.C.EON: память сайта о посетителе.
   Всё хранится только в этом браузере (localStorage 'aceon:trace'), на сервер ничего не уходит.
   Подключение на любой странице: <script src="<путь до корня>/shared/trace.js"></script>
   Страница записывается сама. Если страница открыта в портале главной (iframe), учёт ведёт главная.

   Trace.data()            объект памяти (живой, после правок вызвать Trace.save())
   Trace.session           {fresh, n, gap}: новая ли сессия на этой загрузке, номер, пауза в мс
   Trace.visit(id,url)     записать заход в раздел (обычно не нужно, страница пишется сама)
   Trace.time(id,sec)      добавить время в разделе
   Trace.event(name,n)     счётчик события: 'music.off', 'pw.fail', 'uni.change'...
   Trace.code(word)        открыто слово-код
   Trace.seen(id) / Trace.mark(id)   когда показывали сообщение с этим id
   Trace.top() / Trace.lastPlace()   любимый раздел по времени / последний раздел кроме главной
   Trace.idFromUrl(u), Trace.name(id), Trace.url(id), Trace.forget()

   Сессия: перерыв больше 30 минут начинает новую. */
(function(){
'use strict';
if(window.Trace)return;

var KEY='aceon:trace', GAP=30*60*1000;
var script=document.currentScript;
var rootURL=new URL('../',script&&script.src?script.src:location.href);
var rootPath=decodeURIComponent(rootURL.pathname);

/* имена разделов для сообщений: самый длинный подходящий префикс пути */
var NAMES=[
  ['games/aceonium','ACEONIUM'],['games/cyber','БРЕШЬ'],['games/chess','CHESS'],['games/snake','SNAKE'],
  ['games/solitaire','SOLITAIRE'],['games/battleship','BATTLESHIP'],['games','ARCADE'],
  ['Music archive','MUSIC ARCHIVE'],['A.C.EON_Core','CORE'],['info','INFO'],['chat','NODE AI'],
  ['fragment02','LIGURIA'],['idolls','IDOLLS'],['CIPHER','CIPHER'],['astro','A.S.T.R.O'],
  ['layer_00','AI COURSE'],['forge','FORGE'],['Guestbook','GUESTBOOK'],['aceon-coin','A.C.EON COIN'],
  ['LODA','LODA/OEIS'],['home','A.C.EON']
];
function name(id){
  if(!id)return '';
  for(var i=0;i<NAMES.length;i++){
    var p=NAMES[i][0];
    if(id===p||id.indexOf(p+'/')===0)return NAMES[i][1];
  }
  return id.split('/')[0].toUpperCase();
}
function idFromUrl(u){
  var url; try{ url=new URL(u,location.href); }catch(e){ return null; }
  if(url.origin!==location.origin)return null;
  var p=decodeURIComponent(url.pathname);
  if(p.indexOf(rootPath)!==0)return null;
  var rel=p.slice(rootPath.length).replace(/index\.html?$/i,'').replace(/\/+$/,'');
  return rel||'home';
}
function url(id){
  if(!id||id==='home')return rootURL.href;
  return rootURL.href+id.split('/').map(encodeURIComponent).join('/')+(/\.[a-z0-9]+$/i.test(id)?'':'/');
}

function blank(){
  return {v:1,first:0,sessions:0,sessStart:0,lastSeen:0,gap:0,dayN:0,day:'',today:0,
    hours:[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    sec:{},last:null,ev:{},codes:{},seen:{}};
}
var D;
function load(){
  try{ D=JSON.parse(localStorage.getItem(KEY)||'null'); }catch(e){ D=null; }
  if(!D||D.v!==1)D=blank();
  var b=blank();
  for(var k in b)if(D[k]===undefined)D[k]=b[k];
}
function save(){ try{ localStorage.setItem(KEY,JSON.stringify(D)); }catch(e){} }
load();

function dayStr(t){ var d=new Date(t); return d.getFullYear()+'-'+(d.getMonth()+1)+'-'+d.getDate(); }

var session={fresh:false,n:0,gap:0};
function touch(now){
  if(!D.first)D.first=now;
  if(!D.sessions||!D.lastSeen||now-D.lastSeen>GAP){
    D.gap=D.lastSeen?now-D.lastSeen:0;
    D.sessions++; D.sessStart=now;
    D.hours[new Date(now).getHours()]++;
    var ds=dayStr(now);
    if(ds!==D.day){ D.day=ds; D.dayN++; D.today=0; }
    D.today++;
    session.fresh=true;
  }
  session.n=D.sessions; session.gap=D.gap;
  D.lastSeen=now;
}

var lastVisit={id:'',t:0};
function visit(id,u){
  var now=Date.now();
  load();
  touch(now);
  if(id&&!(id===lastVisit.id&&now-lastVisit.t<5000)){
    var s=D.sec[id]||(D.sec[id]={n:0,t:0,first:now,last:0});
    s.n++; s.last=now;
    if(id!=='home'&&id!=='A.C.EON_Core'&&id!=='info')D.last={id:id,url:u||url(id),ts:now};
    lastVisit={id:id,t:now};
  }
  save();
}
function time(id,sec){
  if(!id||!(sec>0))return;
  load();
  var s=D.sec[id]||(D.sec[id]={n:0,t:0,first:Date.now(),last:Date.now()});
  s.t=Math.round((s.t+sec)*10)/10;
  D.lastSeen=Date.now();
  save();
}
function event(n,k){ load(); D.ev[n]=(D.ev[n]||0)+(k||1); save(); }
function code(w){ load(); D.codes[w]=(D.codes[w]||0)+1; save(); }
function seen(id){ return D.seen[id]||0; }
function mark(id){ load(); D.seen[id]=Date.now(); save(); }
function top(exclude){
  var best=null,bt=0;
  for(var id in D.sec){
    if(exclude&&exclude.indexOf(id)>=0)continue;
    if(D.sec[id].t>bt){ bt=D.sec[id].t; best=id; }
  }
  return best;
}
function lastPlace(){ return D.last; }
function forget(){ D=blank(); save(); lastVisit={id:'',t:0}; }

/* учёт текущей страницы, если она не внутри портала главной */
var inPortal=false;
try{ inPortal=window.top!==window&&!!window.top.ACEON; }catch(e){}
var selfId=idFromUrl(location.href);
if(!inPortal&&selfId){
  visit(selfId,location.href);
  var shown=Date.now(), acc=0;
  var flush=function(){
    if(document.visibilityState==='visible'){ acc+=(Date.now()-shown)/1000; shown=Date.now(); }
    if(acc>=1){ time(selfId,acc); acc=0; }
  };
  document.addEventListener('visibilitychange',function(){
    if(document.visibilityState==='hidden')flush();
    else{ shown=Date.now(); touch(Date.now()); save(); }
  });
  window.addEventListener('pagehide',flush);
  setInterval(flush,30000);
}

window.Trace={
  data:function(){ return D; }, save:save, session:session, root:rootURL.href,
  visit:visit, time:time, event:event, code:code, seen:seen, mark:mark,
  top:top, lastPlace:lastPlace, forget:forget,
  idFromUrl:idFromUrl, name:name, url:url
};
})();
