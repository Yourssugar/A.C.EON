/* A.C.EON BUBBLES: правила. Без DOM, проверяется в node.

   Поле: шары радиуса R в сетке со сдвигом. Чётный ряд 10 шаров, нечётный 9 со сдвигом на R.
   Чётность ряда не хранится в самих рядах: ряд r нечётный, если (r+p0)%2==1. Когда в классике
   сверху добавляется новый ряд, p0 меняется, и все старые ряды сохраняют свою форму
   (в старой версии из-за этого после 8-го выстрела ряды «ломались» и игра зависала).

   Клетка: null или {c: цвет 0..5 (-1 у камня и бомбы), t: 'n'|'stone'|'bomb', ice: 0|1}.
   Шар в пушке: {c, t: 'n'|'rain'|'bomb'|'bolt'}.

   Классика: каждые MISS промахов (выстрел без лопания) сверху приезжает новый ряд.
   Уровни: каждые press выстрелов потолок опускается на ряд, выстрелов ограниченно.
   Проигрыш: шар опустился до черты (ряд DANGER от верха поля). */
(function(){
'use strict';

var R=20,COLS=10,W=COLS*2*R,RH=R*Math.sqrt(3),DANGER=12;
var SX=W/2,SY=R+DANGER*RH+R*3.4;          /* пушка */
var H=SY+R*2.2;                           /* высота поля */
var SPEED=1100;
var COLORS=6;

function rng(seed){var a=seed|0;var f=function(){a=(a+0x6D2B79F5)|0;var t=Math.imul(a^(a>>>15),1|a);t=(t+Math.imul(t^(t>>>7),61|t))^t;return ((t^(t>>>14))>>>0)/4294967296;};
  f.get=function(){return a;};f.set=function(v){a=v|0;};return f;}

/* ── геометрия ── */
function odd(st,r){return ((r+st.p0)&1)===1;}
function ncols(st,r){return odd(st,r)?COLS-1:COLS;}
function cx(st,r,c){return R+c*2*R+(odd(st,r)?R:0);}
function cy(st,r){return st.top+R+r*RH;}
function cell(st,r,c){var row=st.rows[r];return row?row[c]||null:null;}
function ensure(st,r){while(st.rows.length<=r)st.rows.push(new Array(ncols(st,st.rows.length)).fill(null));}
function neigh(st,r,c){
  var o=odd(st,r),out=[[r,c-1],[r,c+1]];
  var a=o?c:c-1,b=o?c+1:c;
  out.push([r-1,a],[r-1,b],[r+1,a],[r+1,b]);
  return out.filter(function(p){return p[0]>=0&&p[1]>=0&&p[1]<ncols(st,p[0]);});
}
function each(st,fn){for(var r=0;r<st.rows.length;r++)for(var c=0;c<st.rows[r].length;c++)if(st.rows[r][c])fn(st.rows[r][c],r,c);}
function count(st){var n=0;each(st,function(){n++;});return n;}
function colored(st){var n=0;each(st,function(x){if(x.t==='n')n++;});return n;}
function trim(st){while(st.rows.length&&st.rows[st.rows.length-1].every(function(x){return !x;}))st.rows.pop();}
/* нижний занятый ряд, считая от верха поля (с учётом опущенного потолка) */
function depth(st){trim(st);return st.press+st.rows.length;}

/* ── создание ── */
/* layout: массив строк ('.' пусто, r b g y p c цвета, заглавная = во льду, S камень, * бомба, ? случайный цвет) */
var CH='rbgypc';
function create(o){
  var st={mode:o.mode||'classic',seed:o.seed|0,rows:[],p0:0,top:0,press:0,shots:0,misses:0,
    score:0,popped:0,dropped:0,streak:0,bestStreak:0,bigDrop:0,meter:0,colors:o.colors||4,
    shotsMax:o.shots||0,pressEvery:o.press||0,missEvery:o.miss||8,
    cur:null,next:null,over:false,win:false,ev:[],level:o.level==null?-1:o.level};
  var r=rng(st.seed||Math.floor(Math.random()*1e9));st.rs=r.get();
  st.rnd=r;
  if(o.layout){
    o.layout.forEach(function(line,ri){
      ensure(st,ri);
      for(var c=0;c<ncols(st,ri);c++){
        var ch=line.charAt(c)||'.';if(ch==='.'||ch===' ')continue;
        if(ch==='S')st.rows[ri][c]={c:-1,t:'stone',ice:0};
        else if(ch==='*')st.rows[ri][c]={c:-1,t:'bomb',ice:0};
        else if(ch==='?')st.rows[ri][c]={c:Math.floor(r()*st.colors),t:'n',ice:0};
        else{var k=CH.indexOf(ch.toLowerCase());if(k<0)continue;st.rows[ri][c]={c:k,t:'n',ice:ch!==ch.toLowerCase()?1:0};}
      }
    });
  }else{
    for(var ri=0;ri<(o.startRows||6);ri++){ensure(st,ri);for(var c=0;c<ncols(st,ri);c++)st.rows[ri][c]={c:Math.floor(r()*st.colors),t:'n',ice:0};}
  }
  st.cur=nextBall(st);st.next=nextBall(st);
  return st;
}

/* следующий шар: только из цветов, что есть на поле (иначе бывают безнадёжные шары) */
function present(st){var s={};each(st,function(x){if(x.c>=0)s[x.c]=1;});return Object.keys(s).map(Number);}
function nextBall(st){
  var p=present(st);if(!p.length)p=[0];
  return {c:p[Math.floor(st.rnd()*p.length)],t:'n'};
}
function swap(st){if(st.over||!st.next)return false;var a=st.cur;st.cur=st.next;st.next=a;return true;}

/* ── полёт: возвращает путь (точки отскоков) и клетку, куда шар встанет ── */
function trace(st,ang,maxLen){
  var dx=Math.cos(ang),dy=-Math.sin(ang),x=SX,y=SY,pts=[[x,y]],step=R/4,len=0;
  maxLen=maxLen||1e9;
  for(var i=0;i<4000;i++){
    x+=dx*step;y+=dy*step;len+=step;
    if(x<R){x=2*R-x;dx=-dx;pts.push([R,y]);}
    else if(x>W-R){x=2*(W-R)-x;dx=-dx;pts.push([W-R,y]);}
    if(len>=maxLen){pts.push([x,y]);return {pts:pts,cell:null};}
    if(y-R<=st.top){pts.push([x,Math.max(y,st.top+R)]);return {pts:pts,cell:snap(st,x,Math.max(y,st.top+R),null)};}
    var hit=hitBall(st,x,y);
    if(hit){pts.push([x,y]);return {pts:pts,cell:snap(st,x,y,hit)};}
  }
  return {pts:pts,cell:null};
}
/* касание: чуть меньше двух радиусов, чтобы шар проходил в щели, как ожидает глаз */
function hitBall(st,x,y){
  var r0=Math.max(0,Math.floor((y-st.top-R)/RH)-1),best=null,bd=(2*R*0.86)*(2*R*0.86);
  for(var r=r0;r<=r0+2&&r<st.rows.length;r++)for(var c=0;c<st.rows[r].length;c++){
    if(!st.rows[r][c])continue;var ex=x-cx(st,r,c),ey=y-cy(st,r,c),d=ex*ex+ey*ey;
    if(d<bd){bd=d;best=[r,c];}
  }
  return best;
}
/* ближайшая пустая клетка к точке: рядом с шаром, в который попали, или в верхнем ряду */
function snap(st,x,y,hit){
  var cand=[];
  if(hit)cand=neigh(st,hit[0],hit[1]);
  else{for(var c=0;c<COLS;c++)cand.push([0,c]);}
  var r=Math.round((y-st.top-R)/RH);if(r<0)r=0;
  for(var c2=0;c2<COLS;c2++)cand.push([r,c2]);
  var best=null,bd=1e18;
  cand.forEach(function(p){
    if(p[0]<0||p[1]<0||p[1]>=ncols(st,p[0]))return;
    if(cell(st,p[0],p[1]))return;
    /* клетка должна держаться: верхний ряд или есть сосед */
    if(p[0]>0&&!neigh(st,p[0],p[1]).some(function(q){return cell(st,q[0],q[1]);}))return;
    var ex=x-cx(st,p[0],p[1]),ey=y-cy(st,p[0],p[1]),d=ex*ex+ey*ey;
    if(d<bd){bd=d;best=p;}
  });
  return best;
}

/* ── группы ── */
function group(st,r,c,col){
  var seen={},out=[],q=[[r,c]];seen[r+'_'+c]=1;
  while(q.length){var p=q.pop();out.push(p);
    neigh(st,p[0],p[1]).forEach(function(n){var k=n[0]+'_'+n[1],x=cell(st,n[0],n[1]);
      if(!seen[k]&&x&&x.t==='n'&&!x.ice&&x.c===col){seen[k]=1;q.push(n);}});}
  return out;
}
function floating(st){
  var ok={},q=[];
  if(st.rows[0])for(var c=0;c<st.rows[0].length;c++)if(st.rows[0][c]){ok['0_'+c]=1;q.push([0,c]);}
  while(q.length){var p=q.pop();neigh(st,p[0],p[1]).forEach(function(n){var k=n[0]+'_'+n[1];if(!ok[k]&&cell(st,n[0],n[1])){ok[k]=1;q.push(n);}});}
  var out=[];each(st,function(x,r,c){if(!ok[r+'_'+c])out.push([r,c]);});
  return out;
}

/* ── выстрел: шар долетел до клетки ── */
function land(st,p,ball){
  var ev={type:'land',r:p[0],c:p[1],ball:ball,pop:[],drop:[],thaw:[],boom:[],bolt:-1,press:false,row:false,score:0};
  ensure(st,p[0]);
  ev.x=cx(st,p[0],p[1]);ev.y=cy(st,p[0],p[1]);
  var b={c:ball.c,t:'n',ice:0};
  /* радуга: берёт цвет, который даст самую большую группу */
  if(ball.t==='rain'){
    st.rows[p[0]][p[1]]={c:-2,t:'n',ice:0};
    var best=-1,bn=0;
    for(var k=0;k<COLORS;k++){st.rows[p[0]][p[1]].c=k;var n=group(st,p[0],p[1],k).length;if(n>bn){bn=n;best=k;}}
    b.c=best<0?0:best;
  }
  st.rows[p[0]][p[1]]=b;
  var gone={};
  function kill(r,c,list){var k=r+'_'+c;if(gone[k]||!cell(st,r,c))return false;gone[k]=1;list.push([r,c,st.rows[r][c],cx(st,r,c),cy(st,r,c)]);return true;}
  if(ball.t==='bomb'){
    /* бомба: всё в радиусе около двух шаров */
    var x0=cx(st,p[0],p[1]),y0=cy(st,p[0],p[1]);
    each(st,function(x,r,c){var ex=cx(st,r,c)-x0,ey=cy(st,r,c)-y0;if(ex*ex+ey*ey<=(3.7*R)*(3.7*R))kill(r,c,ev.boom);});
  }else if(ball.t==='bolt'){
    /* молния: весь ряд, куда попала */
    ev.bolt=p[0];for(var c=0;c<st.rows[p[0]].length;c++)if(cell(st,p[0],c))kill(p[0],c,ev.boom);
  }else{
    var g=group(st,p[0],p[1],b.c);
    if(g.length>=3)g.forEach(function(q){kill(q[0],q[1],ev.pop);});
  }
  var hitAny=ev.pop.length+ev.boom.length>0;
  if(hitAny){
    /* лёд у лопнувших тает, бомбы в поле рядом взрываются (и цепочкой) */
    var wave=ev.pop.concat(ev.boom).map(function(q){return [q[0],q[1]];});
    while(wave.length){
      var nw=[];
      wave.forEach(function(q){neigh(st,q[0],q[1]).forEach(function(n){
        var x=cell(st,n[0],n[1]);if(!x||gone[n[0]+'_'+n[1]])return;
        if(x.ice){x.ice=0;ev.thaw.push([n[0],n[1],x,cx(st,n[0],n[1]),cy(st,n[0],n[1])]);}
        else if(x.t==='bomb'){kill(n[0],n[1],ev.boom);
          neigh(st,n[0],n[1]).forEach(function(m){if(kill(m[0],m[1],ev.boom))nw.push(m);});nw.push(n);}
      });});
      wave=nw;
    }
    for(var key in gone){var rc=key.split('_');st.rows[+rc[0]][+rc[1]]=null;}
    floating(st).forEach(function(q){ev.drop.push([q[0],q[1],st.rows[q[0]][q[1]],cx(st,q[0],q[1]),cy(st,q[0],q[1])]);st.rows[q[0]][q[1]]=null;});
  }
  trim(st);
  /* очки: лопнувшие по 10, упавшие дороже, серия попаданий подряд множит */
  var np=ev.pop.length+ev.boom.length,nd=ev.drop.length;
  if(np){st.streak++;st.bestStreak=Math.max(st.bestStreak,st.streak);}else st.streak=0;
  var pts=Math.round((np*10+nd*20+nd*nd*2)*(1+0.2*Math.min(st.streak>1?st.streak-1:0,5)));
  ev.score=pts;st.score+=pts;st.popped+=np;st.dropped+=nd;st.bigDrop=Math.max(st.bigDrop,nd);
  /* шкала особого шара: набирается лопнувшими и упавшими */
  st.meter+=np+nd*1.5;
  st.shots++;
  st.misses++;
  ev.ball=ball;
  st.ev.push(ev);
  afterShot(st,np>0);
  return ev;
}
var METER=36;
function rowEvery(st){return Math.max(3,st.missEvery-Math.floor(st.score/4000));}
function afterShot(st,hit){
  /* победа: цветных шаров не осталось (камни и бомбы, если остались, падают сами) */
  if(!colored(st)){
    if(count(st)){var rest=[];each(st,function(x,r,c){rest.push([r,c,x,cx(st,r,c),cy(st,r,c)]);});rest.forEach(function(q){st.rows[q[0]][q[1]]=null;});trim(st);st.ev.push({type:'rest',drop:rest});}
    if(st.mode==='classic'||st.mode==='daily'){
      /* в классике поле очищено: бонус и новые ряды */
      st.score+=1000;st.ev.push({type:'clearBonus',score:1000});
      for(var i=0;i<5;i++)addRow(st,true);
    }else{st.win=true;st.over=true;st.ev.push({type:'win'});return;}
  }
  if(st.mode==='classic'||st.mode==='daily'){
    st.colors=Math.min(COLORS,4+(st.score>=1500?1:0)+(st.score>=4500?1:0));
    /* новый ряд через каждые N выстрелов; промах приближает его на лишний шаг. N уменьшается с очками */
    var every=rowEvery(st);
    if(!hit)st.misses++;
    if(st.misses>=every){st.misses=0;addRow(st);}
  }else if(st.pressEvery&&st.shots%st.pressEvery===0){st.press++;st.top=st.press*RH;st.ev.push({type:'press',n:st.press});}
  /* следующий шар */
  st.cur=st.next;
  if(st.meter>=METER){st.meter-=METER;var sp=['rain','bomb','bolt'][Math.floor(st.rnd()*3)];st.next={c:-1,t:sp};st.ev.push({type:'special',t:sp});}
  else st.next=nextBall(st);
  if(st.cur.t==='n'&&present(st).indexOf(st.cur.c)<0&&colored(st))st.cur=nextBall(st);
  if(st.next.t==='n'&&present(st).indexOf(st.next.c)<0&&colored(st))st.next=nextBall(st);
  if(depth(st)>DANGER){st.over=true;st.ev.push({type:'lose',why:'line'});return;}
  if(st.shotsMax&&st.shots>=st.shotsMax&&colored(st)){st.over=true;st.ev.push({type:'lose',why:'shots'});}
}
function addRow(st,silent){
  st.p0^=1;
  var row=new Array(ncols(st,0)).fill(null);
  for(var c=0;c<row.length;c++)row[c]={c:Math.floor(st.rnd()*st.colors),t:'n',ice:0};
  st.rows.unshift(row);
  if(!silent)st.ev.push({type:'row'});
}

/* ── сохранение: только данные, генератор восстанавливается из числа ── */
function dump(st){st.rs=st.rnd.get();var o={};for(var k in st)if(k!=='rnd'&&k!=='ev')o[k]=st[k];return JSON.parse(JSON.stringify(o));}
function load(o){var st=JSON.parse(JSON.stringify(o));st.rnd=rng(0);st.rnd.set(st.rs);st.ev=[];return st;}

window.BubRules={R:R,COLS:COLS,W:W,H:H,RH:RH,SX:SX,SY:SY,DANGER:DANGER,SPEED:SPEED,COLORS:COLORS,METER:METER,
  rowEvery:rowEvery,rng:rng,create:create,trace:trace,land:land,swap:swap,cx:cx,cy:cy,ncols:ncols,odd:odd,each:each,count:count,colored:colored,depth:depth,
  neigh:neigh,group:group,floating:floating,present:present,dump:dump,load:load};
})();
