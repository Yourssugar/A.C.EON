/* A.C.EON CHECKERS: правила. Без DOM, проверяется в node.

   Доска 8x8, клетка i = r*8+c, играют тёмные клетки ((r+c)%2==1).
   Фигуры: 1 белая простая, 2 белая дамка, -1 чёрная простая, -2 чёрная дамка. Белые внизу и ходят вверх (к r=0), ходят первыми.

   Правила (st.rules):
   russian   бить обязательно, простые бьют и назад, дамка ходит и бьёт на любое расстояние,
             простая, ставшая дамкой посреди боя, бьёт дальше как дамка. Можно выбрать любую цепочку взятия.
   english   простые ходят и бьют только вперёд, дамка ходит на одну клетку, превращение заканчивает ход.
   giveaway  поддавки: ходы как в русских, побеждает тот, у кого не осталось шашек или ходов.

   Ход: {f: откуда, path: [клетки приземления], caps: [побитые клетки], promo: стала ли дамкой}.
   Ничья: 3 повторения позиции или 30 ходов подряд (60 полуходов) одними дамками без взятий. */
(function(){
'use strict';

var DIRS=[-9,-7,7,9];
function rc(i){return [i>>3,i&7];}
function step(i,d){var r=(i>>3)+(d<0?-1:1),c=(i&7)+(d===-9||d===7?-1:1);if(r<0||r>7||c<0||c>7)return -1;return r*8+c;}

function create(rules){
  var b=new Array(64).fill(0);
  for(var i=0;i<64;i++){var r=i>>3,c=i&7;if((r+c)%2!==1)continue;if(r<3)b[i]=-1;else if(r>4)b[i]=1;}
  return {rules:rules||'russian',b:b,turn:1,quiet:0,hist:[],ply:0,over:false,result:0,why:''};
}
function king(rules){return rules!=='english';}  /* летающая дамка */
function promoRow(side){return side>0?0:7;}

/* ── взятия: поиск в глубину, побитые шашки стоят до конца хода (через них нельзя прыгать второй раз) ── */
function captures(st,side){
  var b=st.b,out=[],fly=king(st.rules),eng=st.rules==='english';
  for(var f=0;f<64;f++){
    var p=b[f];if(!p||(p>0)!==(side>0))continue;
    b[f]=0;
    dfs(f,f,Math.abs(p)===2,[],[],false);
    b[f]=p;
  }
  function enemy(x){return x&&((x>0)!==(side>0));}
  function dfs(f,at,isK,path,caps,promo){
    var found=false,dirs=DIRS;
    if(!isK&&eng)dirs=side>0?[-9,-7]:[7,9];
    for(var k=0;k<dirs.length;k++){
      var d=dirs[k];
      if(isK&&fly){
        /* летающая дамка: до первой шашки, она должна быть чужой и не побитой, за ней свободные клетки */
        var s=step(at,d);while(s>=0&&!b[s])s=step(s,d);
        if(s<0||!enemy(b[s])||caps.indexOf(s)>=0)continue;
        var land=[],l=step(s,d);while(l>=0&&!b[l]){land.push(l);l=step(l,d);}
        if(!land.length)continue;
        /* если с какого-то поля можно бить дальше, вставать нужно на него */
        var cont=land.filter(function(L){return canMore(L,true,caps.concat([s]),d);});
        (cont.length?cont:land).forEach(function(L){found=true;
          var c2=caps.concat([s]),p2=path.concat([L]);
          if(!dfs(f,L,true,p2,c2,promo))out.push({f:f,path:p2,caps:c2,promo:promo});});
      }else{
        var s1=step(at,d);if(s1<0||!enemy(b[s1])||caps.indexOf(s1)>=0)continue;
        var l1=step(s1,d);if(l1<0||b[l1])continue;
        found=true;
        var cc=caps.concat([s1]),pp=path.concat([l1]),pr=!isK&&(l1>>3)===promoRow(side);
        if(pr&&eng){out.push({f:f,path:pp,caps:cc,promo:true});continue;}  /* английские: превращение заканчивает ход */
        if(!dfs(f,l1,isK||pr,pp,cc,promo||pr))out.push({f:f,path:pp,caps:cc,promo:promo||pr});
      }
    }
    return found;
  }
  /* можно ли дамке с поля L бить дальше (не назад по той же линии) */
  function canMore(L,isK,caps,from){
    for(var k=0;k<4;k++){var d=DIRS[k];if(d===-from)continue;
      var s=step(L,d);while(s>=0&&!b[s])s=step(s,d);
      if(s<0||!enemy(b[s])||caps.indexOf(s)>=0)continue;
      var l=step(s,d);if(l>=0&&!b[l])return true;}
    return false;
  }
  return out;
}
function quiet(st,side){
  var b=st.b,out=[],fly=king(st.rules);
  for(var f=0;f<64;f++){
    var p=b[f];if(!p||(p>0)!==(side>0))continue;
    if(Math.abs(p)===2){
      for(var k=0;k<4;k++){var s=step(f,DIRS[k]);while(s>=0&&!b[s]){out.push({f:f,path:[s],caps:[],promo:false});if(!fly)break;s=step(s,DIRS[k]);}}
    }else{
      var dirs=side>0?[-9,-7]:[7,9];
      for(var j=0;j<2;j++){var s2=step(f,dirs[j]);if(s2>=0&&!b[s2])out.push({f:f,path:[s2],caps:[],promo:(s2>>3)===promoRow(side)});}
    }
  }
  return out;
}
function moves(st,side){side=side||st.turn;var c=captures(st,side);return c.length?c:quiet(st,side);}

function key(st){return st.b.join('')+st.turn;}
/* применить ход (без проверки), вернуть то, что нужно для отмены */
function apply(st,m){
  var b=st.b,p=b[m.f],to=m.path[m.path.length-1],wasMan=Math.abs(p)===1;
  var undo={m:m,p:p,cap:m.caps.map(function(c){return b[c];}),quiet:st.quiet,hl:st.hist.length};
  b[m.f]=0;m.caps.forEach(function(c){b[c]=0;});
  b[to]=m.promo?(p>0?2:-2):p;
  st.quiet=(m.caps.length||wasMan)?0:st.quiet+1;
  st.turn=-st.turn;st.ply++;
  st.hist.push(key(st));
  return undo;
}
function unapply(st,u){
  var b=st.b,m=u.m,to=m.path[m.path.length-1];
  b[to]=0;b[m.f]=u.p;m.caps.forEach(function(c,i){b[c]=u.cap[i];});
  st.quiet=u.quiet;st.turn=-st.turn;st.ply--;st.hist.length=u.hl;
}
/* проверка конца: вызывать после хода */
function status(st){
  var ms=moves(st);
  if(!ms.length){
    var loser=st.turn;
    if(st.rules==='giveaway'){st.result=loser;st.why='give';}   /* в поддавках нет ходов: победа */
    else{st.result=-loser;st.why='nomoves';}
    st.over=true;return st;
  }
  var k=st.hist[st.hist.length-1],n=0;for(var i=0;i<st.hist.length;i++)if(st.hist[i]===k)n++;
  if(n>=3){st.over=true;st.result=0;st.why='repeat';return st;}
  if(st.quiet>=60){st.over=true;st.result=0;st.why='quiet';return st;}
  return st;
}
function count(st,side){var n=0;for(var i=0;i<64;i++)if(st.b[i]&&(st.b[i]>0)===(side>0))n++;return n;}

/* запись хода: c3-d4, c3:e5:c7 (белые внизу) */
function sq(i){return 'abcdefgh'.charAt(i&7)+(8-(i>>3));}
function notation(m){return sq(m.f)+(m.caps.length?':':'-')+m.path.map(sq).join(m.caps.length?':':'-');}
function clone(st){return {rules:st.rules,b:st.b.slice(),turn:st.turn,quiet:st.quiet,hist:st.hist.slice(),ply:st.ply,over:st.over,result:st.result,why:st.why};}

window.CkRules={create:create,moves:moves,captures:captures,apply:apply,unapply:unapply,status:status,count:count,notation:notation,sq:sq,clone:clone,step:step,key:key,DIRS:DIRS};
})();
