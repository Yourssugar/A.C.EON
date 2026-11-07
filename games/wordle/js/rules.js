/* A.C.EON WORDLE: правила. Без DOM, проверяется в node.

   score(guess, answer): по буквам 2 (на месте), 1 (есть в слове, но не тут), 0 (нет).
   Повторы считаются честно: если в слове одна «А», жёлтой станет только одна лишняя «А».
   hardCheck: в сложном режиме открытые подсказки обязаны быть в следующей догадке.
   Слово дня одно на всех: номер дня от 1 января 2026 по местному времени,
   слова идут в перемешанном (но постоянном) порядке. */
(function(){
'use strict';
var EPOCH=Date.UTC(2026,0,1);

function rng(seed){var a=seed|0;return function(){a=(a+0x6D2B79F5)|0;var t=Math.imul(a^(a>>>15),1|a);t=(t+Math.imul(t^(t>>>7),61|t))^t;return ((t^(t>>>14))>>>0)/4294967296;};}
function norm(w){return String(w).toLowerCase().replace(/ё/g,'е');}

function score(guess,ans){
  var n=ans.length,res=[],left={},i,c;
  for(i=0;i<n;i++){res[i]=0;if(guess.charAt(i)===ans.charAt(i))res[i]=2;else{c=ans.charAt(i);left[c]=(left[c]||0)+1;}}
  for(i=0;i<n;i++){if(res[i])continue;c=guess.charAt(i);if(left[c]){res[i]=1;left[c]--;}}
  return res;
}
function solved(res){for(var i=0;i<res.length;i++)if(res[i]!==2)return false;return true;}

/* сложный режим: зелёные на своих местах, жёлтые и зелёные буквы в нужном количестве */
function hardCheck(rows,guess){
  for(var r=0;r<rows.length;r++){
    var g=rows[r].w,s=rows[r].s,need={},i,c;
    for(i=0;i<g.length;i++){
      if(s[i]===2&&guess.charAt(i)!==g.charAt(i))return {type:'pos',i:i,ch:g.charAt(i)};
      if(s[i])need[g.charAt(i)]=(need[g.charAt(i)]||0)+1;
    }
    for(c in need){var have=0;for(i=0;i<guess.length;i++)if(guess.charAt(i)===c)have++;if(have<need[c])return {type:'has',ch:c};}
  }
  return null;
}
/* лучшее известное состояние каждой буквы для клавиатуры */
function keyStates(rows){
  var k={};
  rows.forEach(function(r){for(var i=0;i<r.w.length;i++){var c=r.w.charAt(i),v=r.s[i];k[c]=Math.max(k[c]===undefined?-1:k[c],v);}});
  return k;
}

function dayIndex(d){d=d||new Date();return Math.floor((Date.UTC(d.getFullYear(),d.getMonth(),d.getDate())-EPOCH)/86400000);}
var orderCache={};
function order(list,key){
  if(orderCache[key]&&orderCache[key].length===list.length)return orderCache[key];
  var a=list.slice(),r=rng(20260101+key.length*7919+key.charCodeAt(0));
  for(var i=a.length-1;i>0;i--){var j=Math.floor(r()*(i+1)),t=a[i];a[i]=a[j];a[j]=t;}
  orderCache[key]=a;return a;
}
function daily(list,lang,day){var o=order(list,lang+'5');return o[((day%o.length)+o.length)%o.length];}
function pick(list,avoid){var w;for(var i=0;i<8;i++){w=list[Math.floor(Math.random()*list.length)];if(!avoid||avoid.indexOf(w)<0)break;}return w;}
function tries(len){return len+1;}

/* словарь: строки через пробел превращаются в список и множество */
function dict(raw){
  var out={};
  for(var n in raw){var a=raw[n].a.split(' '),w=raw[n].w.split(' '),set={};
    for(var i=0;i<w.length;i++)set[w[i]]=1;for(i=0;i<a.length;i++)set[a[i]]=1;
    out[n]={ans:a,ok:set};}
  return out;
}

window.WlRules={score:score,solved:solved,hardCheck:hardCheck,keyStates:keyStates,dayIndex:dayIndex,daily:daily,pick:pick,tries:tries,dict:dict,norm:norm};
})();
