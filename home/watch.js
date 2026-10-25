/* Главная: что узел «скажет» вернувшемуся. Выбор по памяти Trace (shared/trace.js).
   Правила идут по приоритету, первое подходящее и не показанное недавно побеждает.
   cd: через сколько дней правило можно повторить (0 = один раз навсегда).
   Тексты в home/lang.js под ключами 'w.<id>'. */
(function(){
'use strict';
var DAY=864e5;

/* разделы, которые узел может «подсказать», если человек туда не заходил */
var DOORS=['games/aceonium','games/cyber','Music archive','chat','fragment02','idolls','CIPHER','astro','AI course','forge','Guestbook','games'];
var CODES=['VOID','NULL','SIGNAL','STASIS','PULSE','DARK','440'];

function days(ms){ return Math.floor(ms/DAY); }

var RULES=[
  {id:'forgot', cd:0, when:function(D){ return D.ev.forget>0&&D.sessions>=2&&D.sessions<=4; }},
  {id:'year', cd:0, when:function(D,c){ var d=days(c.now-D.first); return d>=365&&d<380; }},
  {id:'month', cd:0, when:function(D,c){ var d=days(c.now-D.first); return d>=30&&d<40; }},
  {id:'milestone', cd:1, when:function(D){ return [10,25,50,100,200].indexOf(D.sessions)>=0?{n:D.sessions}:false; }},
  {id:'away_long', cd:2, when:function(D){ return D.gap>=14*DAY?{n:days(D.gap)}:false; }},
  {id:'away', cd:2, when:function(D){ return D.gap>=2*DAY; }},
  {id:'night_always', cd:6, when:function(D,c){
    var night=D.hours[0]+D.hours[1]+D.hours[2]+D.hours[3]+D.hours[4];
    return c.hour<5&&night>=3; }},
  {id:'night', cd:3, when:function(D,c){ return c.hour<5; }},
  {id:'today', cd:1, when:function(D){ return D.today>=3?{n:D.today}:false; }},
  {id:'music_love', cd:10, when:function(D){ var s=D.sec['Music archive']; return s&&s.t>=600; }},
  {id:'music_off', cd:10, when:function(D){ return (D.ev['music.off']||0)>=2; }},
  {id:'favorite', cd:5, when:function(D,c){
    var id=c.T.top(['home','A.C.EON_Core','info']);
    return id&&D.sec[id].t>=300?{sec:c.T.name(id)}:false; }},
  {id:'left', cd:3, when:function(D,c){
    var l=D.last; return l&&c.now-l.ts<3*DAY&&c.now-l.ts>2*3600e3?{sec:c.T.name(l.id)}:false; }},
  {id:'once', cd:6, when:function(D,c){
    for(var id in D.sec){
      var s=D.sec[id];
      if(id!=='home'&&s.n===1&&c.now-s.last>7*DAY)return {sec:c.T.name(id)};
    }
    return false; }},
  {id:'door', cd:4, when:function(D,c){
    if(D.sessions<3)return false;
    var free=DOORS.filter(function(id){ return !D.sec[id]; });
    if(!free.length)return false;
    return {sec:c.T.name(free[Math.random()*free.length|0])}; }},
  {id:'codes', cd:7, when:function(D){
    var k=CODES.filter(function(w){ return D.codes[w]; }).length;
    return k>0&&k<CODES.length?{n:k}:false; }},
  {id:'keys', cd:7, when:function(D){
    var f=D.ev['pw.fail']||0;
    return f>=5&&!Object.keys(D.codes).length?{n:f}:false; }},
  {id:'reality', cd:0, when:function(D){ return (D.ev['uni.change']||0)>=3; }},
  {id:'tongue', cd:0, when:function(D){ return (D.ev['lang.change']||0)>=2; }}
];

/* сообщение при загрузке главной: {id, vars} или null */
function pick(T){
  var D=T.data(), now=Date.now();
  var c={T:T,now:now,hour:new Date(now).getHours()};
  for(var i=0;i<RULES.length;i++){
    var r=RULES[i], last=T.seen('w.'+r.id);
    if(last&&(r.cd===0||now-last<r.cd*DAY))continue;
    var v=r.when(D,c);
    if(v)return {id:r.id,vars:v===true?{}:v};
  }
  return null;
}

/* после возврата из раздела: если там провели заметное время */
function afterPortal(T,id,sec){
  if(!id||id==='A.C.EON_Core'||id==='info'||sec<90)return null;
  var key='w.back:'+id, last=T.seen(key);
  if(last&&Date.now()-last<2*DAY)return null;
  var s=T.data().sec[id];
  return {id:s&&s.n>2?'back_again':'back',vars:{sec:T.name(id),min:Math.max(1,Math.round(sec/60))},seenKey:key};
}

/* слова-коды, которые человек ещё не нашёл */
function unknownCodes(T){
  var D=T.data();
  return CODES.filter(function(w){ return !D.codes[w]; });
}

window.HomeWatch={pick:pick,afterPortal:afterPortal,unknownCodes:unknownCodes,CODES:CODES};
})();
