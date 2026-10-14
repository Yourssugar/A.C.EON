/* A.C.EON CHESS: правила игры.
   Чистые функции без DOM. Состояние позиции:
   { board[8][8] ('wK','bP',... или null), turn 'w'|'b',
     castling {wK,wQ,bK,bQ}, ep [r,c]|null, halfmove, fullmove }
   Строка 0 = восьмая горизонталь (сторона чёрных). */
(function(){
'use strict';

var KNIGHT=[[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]];
var KING=[[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]];
var DIAG=[[-1,-1],[-1,1],[1,-1],[1,1]];
var ORTH=[[-1,0],[1,0],[0,-1],[0,1]];
var FILES='abcdefgh';

function inb(r,c){return r>=0&&r<8&&c>=0&&c<8;}
function opp(col){return col==='w'?'b':'w';}
function cloneBoard(b){return b.map(function(row){return row.slice();});}

function startState(){
  return {
    board:[
      ['bR','bN','bB','bQ','bK','bB','bN','bR'],
      ['bP','bP','bP','bP','bP','bP','bP','bP'],
      [null,null,null,null,null,null,null,null],
      [null,null,null,null,null,null,null,null],
      [null,null,null,null,null,null,null,null],
      [null,null,null,null,null,null,null,null],
      ['wP','wP','wP','wP','wP','wP','wP','wP'],
      ['wR','wN','wB','wQ','wK','wB','wN','wR']
    ],
    turn:'w',castling:{wK:true,wQ:true,bK:true,bQ:true},ep:null,halfmove:0,fullmove:1
  };
}

/* бьёт ли сторона `by` поле (r,c) */
function attacked(b,r,c,by){
  var i,d,rr,cc,p;
  var pr=by==='w'?r+1:r-1;   // откуда бьёт пешка
  if(inb(pr,c-1)&&b[pr][c-1]===by+'P')return true;
  if(inb(pr,c+1)&&b[pr][c+1]===by+'P')return true;
  for(i=0;i<8;i++){rr=r+KNIGHT[i][0];cc=c+KNIGHT[i][1];if(inb(rr,cc)&&b[rr][cc]===by+'N')return true;}
  for(i=0;i<8;i++){rr=r+KING[i][0];cc=c+KING[i][1];if(inb(rr,cc)&&b[rr][cc]===by+'K')return true;}
  for(i=0;i<4;i++){
    d=DIAG[i];rr=r+d[0];cc=c+d[1];
    while(inb(rr,cc)){p=b[rr][cc];if(p){if(p===by+'B'||p===by+'Q')return true;break;}rr+=d[0];cc+=d[1];}
    d=ORTH[i];rr=r+d[0];cc=c+d[1];
    while(inb(rr,cc)){p=b[rr][cc];if(p){if(p===by+'R'||p===by+'Q')return true;break;}rr+=d[0];cc+=d[1];}
  }
  return false;
}

function findKing(b,col){
  for(var r=0;r<8;r++)for(var c=0;c<8;c++)if(b[r][c]===col+'K')return [r,c];
  return null;
}
function inCheck(b,col){
  var k=findKing(b,col);
  return !!k&&attacked(b,k[0],k[1],opp(col));
}

/* ходы фигуры без проверки, остаётся ли король под шахом */
function pseudo(st,r,c){
  var b=st.board,p=b[r][c];if(!p)return [];
  var col=p[0],type=p[1],moves=[];
  function add(tr,tc,extra){var m={r:r,c:c,tr:tr,tc:tc};if(extra)for(var k in extra)m[k]=extra[k];moves.push(m);}
  function slide(dirs){
    dirs.forEach(function(d){
      var tr=r+d[0],tc=c+d[1];
      while(inb(tr,tc)){var t=b[tr][tc];if(t&&t[0]===col)break;add(tr,tc);if(t)break;tr+=d[0];tc+=d[1];}
    });
  }
  function jump(list){
    list.forEach(function(d){var tr=r+d[0],tc=c+d[1];if(inb(tr,tc)){var t=b[tr][tc];if(!t||t[0]!==col)add(tr,tc);}});
  }
  if(type==='P'){
    var dir=col==='w'?-1:1,start=col==='w'?6:1;
    if(inb(r+dir,c)&&!b[r+dir][c]){
      add(r+dir,c);
      if(r===start&&!b[r+2*dir][c])add(r+2*dir,c);
    }
    [-1,1].forEach(function(dc){
      var tr=r+dir,tc=c+dc;if(!inb(tr,tc))return;
      var t=b[tr][tc];
      if(t&&t[0]!==col)add(tr,tc);
      else if(st.ep&&st.ep[0]===tr&&st.ep[1]===tc)add(tr,tc,{enPassant:true});
    });
  }else if(type==='N')jump(KNIGHT);
  else if(type==='B')slide(DIAG);
  else if(type==='R')slide(ORTH);
  else if(type==='Q')slide(DIAG.concat(ORTH));
  else if(type==='K'){
    jump(KING);
    var home=col==='w'?7:0;
    if(r===home&&c===4){
      if(st.castling[col+'K']&&b[home][7]===col+'R'&&!b[home][5]&&!b[home][6])add(home,6,{castle:'K'});
      if(st.castling[col+'Q']&&b[home][0]===col+'R'&&!b[home][1]&&!b[home][2]&&!b[home][3])add(home,2,{castle:'Q'});
    }
  }
  return moves;
}

/* только расстановка фигур после хода (для проверок и поиска) */
function applyBoard(b,mv){
  var nb=cloneBoard(b),piece=nb[mv.r][mv.c];
  nb[mv.tr][mv.tc]=piece;nb[mv.r][mv.c]=null;
  if(mv.enPassant)nb[mv.r][mv.tc]=null;
  if(piece[1]==='P'&&(mv.tr===0||mv.tr===7))nb[mv.tr][mv.tc]=piece[0]+(mv.promo||'q').toUpperCase();
  if(mv.castle==='K'){nb[mv.tr][5]=nb[mv.tr][7];nb[mv.tr][7]=null;}
  if(mv.castle==='Q'){nb[mv.tr][3]=nb[mv.tr][0];nb[mv.tr][0]=null;}
  return nb;
}

function legal(st,r,c){
  var b=st.board,p=b[r][c];if(!p)return [];
  var col=p[0],enemy=opp(col);
  return pseudo(st,r,c).filter(function(mv){
    if(mv.castle){
      if(attacked(b,r,c,enemy))return false;                       // нельзя из-под шаха
      if(attacked(b,r,mv.castle==='K'?5:3,enemy))return false;     // нельзя через битое поле
    }
    return !inCheck(applyBoard(b,mv),col);
  });
}

function allLegal(st,col){
  col=col||st.turn;
  var out=[];
  for(var r=0;r<8;r++)for(var c=0;c<8;c++){
    var p=st.board[r][c];
    if(p&&p[0]===col)Array.prototype.push.apply(out,legal(st,r,c));
  }
  return out;
}

/* полный ход: новая позиция с правами рокировки, полем взятия на проходе и счётчиками */
function applyMove(st,mv){
  var b=st.board,piece=b[mv.r][mv.c],col=piece[0];
  var capture=!!b[mv.tr][mv.tc]||!!mv.enPassant;
  var cs={wK:st.castling.wK,wQ:st.castling.wQ,bK:st.castling.bK,bQ:st.castling.bQ};
  if(piece==='wK'){cs.wK=false;cs.wQ=false;}
  if(piece==='bK'){cs.bK=false;cs.bQ=false;}
  [[7,7,'wK'],[7,0,'wQ'],[0,7,'bK'],[0,0,'bQ']].forEach(function(x){
    if((mv.r===x[0]&&mv.c===x[1])||(mv.tr===x[0]&&mv.tc===x[1]))cs[x[2]]=false;
  });
  var ep=null;
  if(piece[1]==='P'&&Math.abs(mv.tr-mv.r)===2)ep=[(mv.r+mv.tr)/2,mv.c];
  return {
    board:applyBoard(b,mv),turn:opp(col),castling:cs,ep:ep,
    halfmove:(piece[1]==='P'||capture)?0:st.halfmove+1,
    fullmove:st.fullmove+(col==='b'?1:0)
  };
}

function isPromotion(st,mv){
  var p=st.board[mv.r][mv.c];
  return !!p&&p[1]==='P'&&(mv.tr===0||mv.tr===7);
}

/* поле взятия на проходе пишется только если взять действительно можно */
function epForKey(st){
  if(!st.ep)return '-';
  var ok=allLegal(st).some(function(m){return m.enPassant;});
  return ok?FILES[st.ep[1]]+(8-st.ep[0]):'-';
}

function toFEN(st){
  var pm={K:'K',Q:'Q',R:'R',B:'B',N:'N',P:'P'},rows=[];
  for(var r=0;r<8;r++){
    var s='',e=0;
    for(var c=0;c<8;c++){
      var p=st.board[r][c];
      if(!p){e++;continue;}
      if(e){s+=e;e=0;}
      s+=p[0]==='w'?pm[p[1]]:pm[p[1]].toLowerCase();
    }
    if(e)s+=e;
    rows.push(s);
  }
  var cs=(st.castling.wK?'K':'')+(st.castling.wQ?'Q':'')+(st.castling.bK?'k':'')+(st.castling.bQ?'q':'');
  var ep=st.ep?FILES[st.ep[1]]+(8-st.ep[0]):'-';
  return rows.join('/')+' '+st.turn+' '+(cs||'-')+' '+ep+' '+st.halfmove+' '+st.fullmove;
}

/* ключ позиции для троекратного повторения */
function positionKey(st){
  var f=toFEN(st).split(' ');
  return f[0]+' '+f[1]+' '+f[2]+' '+epForKey(st);
}

/* недостаточно материала для мата у обеих сторон */
function insufficient(b){
  var minors=[],bishopsSq=[];
  for(var r=0;r<8;r++)for(var c=0;c<8;c++){
    var p=b[r][c];if(!p||p[1]==='K')continue;
    if(p[1]==='P'||p[1]==='R'||p[1]==='Q')return false;
    minors.push(p);
    if(p[1]==='B')bishopsSq.push((r+c)%2);
  }
  if(minors.length<=1)return true;                                     // K-K, K+B-K, K+N-K
  if(minors.length===bishopsSq.length){                                // только слоны
    return bishopsSq.every(function(x){return x===bishopsSq[0];});     // все на полях одного цвета
  }
  return false;
}

function toUCI(mv){
  var s=FILES[mv.c]+(8-mv.r)+FILES[mv.tc]+(8-mv.tr);
  return mv.promo?s+mv.promo:s;
}

/* ход из строки UCI (e2e4, e7e8q), найденный среди легальных */
function fromUCI(st,uci){
  if(!uci||uci.length<4)return null;
  var c=uci.charCodeAt(0)-97,r=8-parseInt(uci[1],10),tc=uci.charCodeAt(2)-97,tr=8-parseInt(uci[3],10);
  if(!inb(r,c)||!inb(tr,tc))return null;
  var p=st.board[r][c];if(!p||p[0]!==st.turn)return null;
  var found=legal(st,r,c).filter(function(m){return m.tr===tr&&m.tc===tc;})[0];
  if(!found)return null;
  var mv={};for(var k in found)mv[k]=found[k];
  if(isPromotion(st,mv))mv.promo=(uci[4]||'q').toLowerCase();
  return mv;
}

/* запись хода в журнале: Ng1-f3, e4xd5, O-O, e8=Q, плюс + или # */
function moveText(before,mv,after){
  var p=before.board[mv.r][mv.c],cap=!!before.board[mv.tr][mv.tc]||!!mv.enPassant,s;
  if(mv.castle==='K')s='O-O';
  else if(mv.castle==='Q')s='O-O-O';
  else{
    s=(p[1]==='P'?'':p[1])+FILES[mv.c]+(8-mv.r)+(cap?'x':'-')+FILES[mv.tc]+(8-mv.tr);
    if(mv.promo)s+='='+mv.promo.toUpperCase();
  }
  if(inCheck(after.board,after.turn))s+=allLegal(after).length?'+':'#';
  return s;
}

/* простая оценка для запасного ИИ (плюс = лучше белым) */
var VALS={P:100,N:320,B:330,R:500,Q:900,K:0};
var PST_P=[[0,0,0,0,0,0,0,0],[50,50,50,50,50,50,50,50],[10,10,20,30,30,20,10,10],[5,5,10,25,25,10,5,5],[0,0,0,20,20,0,0,0],[5,-5,-10,0,0,-10,-5,5],[5,10,10,-20,-20,10,10,5],[0,0,0,0,0,0,0,0]];
function evaluate(b){
  var s=0;
  for(var r=0;r<8;r++)for(var c=0;c<8;c++){
    var p=b[r][c];if(!p)continue;
    var v=VALS[p[1]];
    if(p[1]==='P')v+=p[0]==='w'?PST_P[r][c]:PST_P[7-r][c];
    if(p[1]==='N'||p[1]==='B')v+=(c>=2&&c<=5&&r>=2&&r<=5)?10:0;
    s+=p[0]==='w'?v:-v;
  }
  return s;
}

window.ChessRules={
  startState:startState,attacked:attacked,inCheck:inCheck,findKing:findKing,
  pseudo:pseudo,legal:legal,allLegal:allLegal,applyMove:applyMove,applyBoard:applyBoard,
  isPromotion:isPromotion,toFEN:toFEN,positionKey:positionKey,insufficient:insufficient,
  toUCI:toUCI,fromUCI:fromUCI,moveText:moveText,evaluate:evaluate,opp:opp
};
})();
