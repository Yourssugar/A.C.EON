/* A.C.EON TIC TAC TOE: правила и боты.

   Поле: 9 клеток, индекс r*3+c. Знаки 'X' и 'O'.
   Классика: обычные правила, полное поле без линии = ничья.
   Исчезающие: у каждого не больше 3 знаков. Когда ставишь четвёртый, самый старый исчезает
   (на его место в этот же ход ставить нельзя). Ничья только по лимиту ходов.

   TTT.create(mode, first)       first: 'X' или 'O' ходит первым
   TTT.moves(st)                 клетки, куда можно сходить
   TTT.play(st, i)               ход, возвращает {gone, win:[a,b,c]|null, draw}
   TTT.fading(st)                клетка, которая исчезнет следующим ходом текущего игрока (или -1)
   TTT.bot(st, level)            ход бота: 'easy' | 'normal' | 'hard' */
(function(){
'use strict';

var LINES=[[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
var LIMIT=60;   /* исчезающие: столько ходов без победы = ничья */

function create(mode,first){
  return {mode:mode,b:['','','','','','','','',''],hist:{X:[],O:[]},turn:first||'X',n:0,over:false,win:null,winner:'',draw:false};
}
function clone(st){return JSON.parse(JSON.stringify(st));}
function other(p){return p==='X'?'O':'X';}
function fading(st){
  if(st.mode!=='vanish')return -1;
  var h=st.hist[st.turn];
  return h.length>=3?h[0]:-1;
}
function moves(st){
  if(st.over)return [];
  var f=fading(st),out=[];
  for(var i=0;i<9;i++)if(!st.b[i]&&i!==f)out.push(i);
  return out;
}
function lineOf(b,p){
  for(var k=0;k<8;k++){var l=LINES[k];if(b[l[0]]===p&&b[l[1]]===p&&b[l[2]]===p)return l;}
  return null;
}
function play(st,i){
  var p=st.turn,gone=-1;
  if(st.over||st.b[i]||i===fading(st))return null;
  if(st.mode==='vanish'&&st.hist[p].length>=3){gone=st.hist[p].shift();st.b[gone]='';}
  st.b[i]=p;st.hist[p].push(i);st.n++;
  var w=lineOf(st.b,p);
  if(w){st.over=true;st.win=w;st.winner=p;}
  else if(st.mode==='classic'&&st.n>=9){st.over=true;st.draw=true;}
  else if(st.mode==='vanish'&&st.n>=LIMIT){st.over=true;st.draw=true;}
  else st.turn=other(p);
  return {gone:gone,win:w,draw:st.draw};
}

/* ── вспомогательное для ботов ── */
function rand(a){return a[Math.floor(Math.random()*a.length)];}
/* ход, который сразу выигрывает для игрока p (если бы сейчас ходил он) */
function winningMove(st,p){
  var s=clone(st);s.turn=p;s.over=false;
  var list=moves(s);
  for(var k=0;k<list.length;k++){var t=clone(s);play(t,list[k]);if(t.winner===p)return list[k];}
  return -1;
}

/* ── классика: полный перебор (минимакс), быстрее выигрывает, дольше проигрывает ── */
function mmClassic(b,p,me,depth){
  var w=lineOf(b,other(p));
  if(w)return other(p)===me?10-depth:depth-10;
  var empty=0;for(var i=0;i<9;i++)if(!b[i])empty++;
  if(!empty)return 0;
  var best=p===me?-99:99;
  for(i=0;i<9;i++){
    if(b[i])continue;
    b[i]=p;var v=mmClassic(b,other(p),me,depth+1);b[i]='';
    if(p===me?v>best:v<best)best=v;
  }
  return best;
}
function bestClassic(st){
  var b=st.b.slice(),me=st.turn,best=-99,list=[];
  if(st.n===0)return rand([0,2,4,6,8]);   /* первый ход: угол или центр, все равно ничья */
  for(var i=0;i<9;i++){
    if(b[i])continue;
    b[i]=me;var v=mmClassic(b,other(me),me,1);b[i]='';
    if(v>best){best=v;list=[i];}else if(v===best)list.push(i);
  }
  return rand(list);
}

/* ── исчезающие: игра решена заранее (все позиции, их около 60 тысяч) ──
   Позиция: знаки ходящего (от старого к новому) и знаки соперника. Код списка: цифры (клетка+1).
   val[k]: 1 ходящий выигрывает, -1 проигрывает, 0 ничья (бесконечная игра); dist[k]: через сколько ходов. */
var VAL=null,DIST=null;
function enc(list){var c=0;for(var i=0;i<list.length;i++)c=c*10+list[i]+1;return c;}
function key(me,op){return enc(me)*1000+enc(op);}
/* ходы и следующие позиции (с точки зрения соперника); win: этот ход сразу выигрывает */
function succ(me,op){
  var occ={},out=[],i;
  for(i=0;i<me.length;i++)occ[me[i]]=1;
  for(i=0;i<op.length;i++)occ[op[i]]=1;
  var fade=me.length>=3?me[0]:-1;
  for(var c=0;c<9;c++){
    if(occ[c])continue;
    var nm=(fade>=0?me.slice(1):me.slice());nm.push(c);
    var win=false;
    if(nm.length===3){
      for(var k=0;k<8;k++){var l=LINES[k];if(nm.indexOf(l[0])>=0&&nm.indexOf(l[1])>=0&&nm.indexOf(l[2])>=0){win=true;break;}}
    }
    out.push({c:c,win:win,me:op,op:nm});
  }
  return out;
}
function solve(){
  if(VAL)return;
  VAL=new Int8Array(1000000);DIST=new Int16Array(1000000);
  /* все позиции, достижимые из пустой */
  var seen=new Uint8Array(1000000),list=[],q=[[[],[]]];
  seen[0]=1;
  while(q.length){
    var s=q.pop();list.push(s);
    var nx=succ(s[0],s[1]);
    for(var i=0;i<nx.length;i++){
      if(nx[i].win)continue;
      var k=key(nx[i].me,nx[i].op);
      if(!seen[k]){seen[k]=1;q.push([nx[i].me,nx[i].op]);}
    }
  }
  /* для каждой позиции: ключи следующих позиций подряд в одном массиве */
  var N=list.length,keys=new Int32Array(N),start=new Int32Array(N+1),kids=[],win=new Uint8Array(N);
  for(var j=0;j<N;j++){
    var sj=list[j],nn=succ(sj[0],sj[1]);
    keys[j]=key(sj[0],sj[1]);start[j]=kids.length;
    for(var m=0;m<nn.length;m++){if(nn[m].win)win[j]=1;else kids.push(key(nn[m].me,nn[m].op));}
  }
  start[N]=kids.length;kids=new Int32Array(kids);
  for(j=0;j<N;j++)if(win[j]){VAL[keys[j]]=1;DIST[keys[j]]=1;}
  /* выигрыш, если есть ход в проигрышную для соперника; проигрыш, если все ходы ведут в выигрышные для него */
  var changed=true;
  while(changed){
    changed=false;
    for(j=0;j<N;j++){
      var k0=keys[j];if(VAL[k0])continue;
      var allWin=start[j+1]>start[j],bestW=9999,worstL=0;
      for(m=start[j];m<start[j+1];m++){
        var ck=kids[m],v=VAL[ck];
        if(v===-1){if(DIST[ck]+1<bestW)bestW=DIST[ck]+1;}
        if(v!==1)allWin=false;else if(DIST[ck]+1>worstL)worstL=DIST[ck]+1;
      }
      if(bestW<9999){VAL[k0]=1;DIST[k0]=bestW;changed=true;}
      else if(allWin){VAL[k0]=-1;DIST[k0]=worstL;changed=true;}
    }
  }
}
function bestVanish(st){
  solve();
  var me=st.hist[st.turn],op=st.hist[other(st.turn)];
  var nx=succ(me,op),best=null,list=[];
  nx.forEach(function(n){
    var sc;
    if(n.win)sc=1000;
    else{var k=key(n.me,n.op),v=VAL[k],d=DIST[k];sc=v===-1?500-d:v===1?-500+d:0;}
    if(best===null||sc>best){best=sc;list=[n.c];}else if(sc===best)list.push(n.c);
  });
  return rand(list);
}

/* ── боты ──
   лёгкий: иногда видит свою победу, в остальном случайно;
   средний: всегда добивает, почти всегда закрывает угрозу, вилок не видит;
   сильный: играет без ошибок. */
function bot(st,level){
  var list=moves(st);if(!list.length)return -1;
  var me=st.turn,op=other(me);
  if(level==='hard')return st.mode==='classic'?bestClassic(st):bestVanish(st);
  var w=winningMove(st,me);
  if(level==='easy'){
    if(w>=0&&Math.random()<0.6)return w;
    return rand(list);
  }
  if(w>=0)return w;
  /* угроза соперника: где он выиграет следующим ходом (с учётом того, что у нас исчезнет) */
  var block=threat(st,me,op,list);
  if(block>=0&&Math.random()<0.9)return block;
  if(list.indexOf(4)>=0&&Math.random()<0.6)return 4;
  /* не подставляться: ход, после которого соперник сразу не выигрывает */
  var safe=list.filter(function(c){var t=clone(st);play(t,c);return t.over||winningMove(t,op)<0;});
  return rand(safe.length?safe:list);
}
function threat(st,me,op,list){
  for(var k=0;k<list.length;k++){
    var t=clone(st);play(t,list[k]);
    if(t.over)continue;
    if(winningMove(t,op)<0){
      /* этот ход закрывает угрозу, если без него угроза была */
      var s=clone(st);s.turn=op;
      if(winningMove(s,op)===list[k])return list[k];
    }
  }
  return -1;
}

window.TTT={LINES:LINES,LIMIT:LIMIT,create:create,clone:clone,moves:moves,play:play,fading:fading,bot:bot,other:other,solve:solve,
  _val:function(){solve();return {VAL:VAL,DIST:DIST,key:key};}};
})();
