/* FORGE звук: обработка готового трека (мастеринг) и замер громкости.
   Файл грузится дважды: обычным скриптом (window.ZDSP, запасной путь) и как Web Worker, чтобы страница не замирала на длинных треках.
   Всё работает на месте, по массивам отсчётов L и R, без копий: 4 минуты стерео это 84 МБ, лишние копии телефону не по силам.
   Порядок: срез низа и тон (эквалайзер) -> ширина стерео -> компрессор -> насыщение -> громкость по LUFS -> лимитер с потолком.
   Перед компрессором трек приводится к -18 LUFS, поэтому пресет ведёт себя одинаково на тихой и на громкой записи. */
(function(G){
"use strict";
var PI=Math.PI;
/* фильтры по формулам RBJ Audio EQ Cookbook; t: hp, lp, ls (полка низа), hs (полка верха), pk (колокол) */
function coef(t,f,sr,g,q){ var A=Math.pow(10,(g||0)/40), w=2*PI*Math.min(f,sr*.45)/sr, c=Math.cos(w), s=Math.sin(w), al=s/(2*(q||.707)), b0,b1,b2,a0,a1,a2, k;
  if(t==="hp"){ b0=(1+c)/2; b1=-(1+c); b2=(1+c)/2; a0=1+al; a1=-2*c; a2=1-al; }
  else if(t==="lp"){ b0=(1-c)/2; b1=1-c; b2=(1-c)/2; a0=1+al; a1=-2*c; a2=1-al; }
  else if(t==="pk"){ b0=1+al*A; b1=-2*c; b2=1-al*A; a0=1+al/A; a1=-2*c; a2=1-al/A; }
  else if(t==="ls"){ k=2*Math.sqrt(A)*al; b0=A*((A+1)-(A-1)*c+k); b1=2*A*((A-1)-(A+1)*c); b2=A*((A+1)-(A-1)*c-k); a0=(A+1)+(A-1)*c+k; a1=-2*((A-1)+(A+1)*c); a2=(A+1)+(A-1)*c-k; }
  else { k=2*Math.sqrt(A)*al; b0=A*((A+1)+(A-1)*c+k); b1=-2*A*((A-1)+(A+1)*c); b2=A*((A+1)+(A-1)*c-k); a0=(A+1)-(A-1)*c+k; a1=2*((A-1)-(A+1)*c); a2=(A+1)-(A-1)*c-k; }
  return [b0/a0,b1/a0,b2/a0,a1/a0,a2/a0]; }
function biquad(x,k){ var b0=k[0],b1=k[1],b2=k[2],a1=k[3],a2=k[4], z1=0, z2=0, n=x.length; for(var i=0;i<n;i++){ var v=x[i], y=b0*v+z1; z1=b1*v-a1*y+z2; z2=b2*v-a2*y; x[i]=y; } }
function gain(x,g){ if(g===1) return; for(var i=0,n=x.length;i<n;i++) x[i]*=g; }
function peak(L,R){ var m=0; for(var i=0,n=L.length;i<n;i++){ var a=L[i]<0?-L[i]:L[i]; if(a>m) m=a; a=R[i]<0?-R[i]:R[i]; if(a>m) m=a; } return m; }
function db(x){ return x>0?20*Math.log10(x):-99; }

/* громкость на слух по ITU-R BS.1770: взвешивание K, блоки по 0.4 с через 0.1 с, два порога (-70 и -10 от среднего) */
function kcoef(sr){ var f0=1681.974450955533, Gd=3.999843853973347, Q=.7071752369554196, K=Math.tan(PI*f0/sr), Vh=Math.pow(10,Gd/20), Vb=Math.pow(Vh,.4996667741545416), a0=1+K/Q+K*K;
  var s1=[(Vh+Vb*K/Q+K*K)/a0, 2*(K*K-Vh)/a0, (Vh-Vb*K/Q+K*K)/a0, 2*(K*K-1)/a0, (1-K/Q+K*K)/a0];
  f0=38.13547087602444; Q=.5003270373238773; K=Math.tan(PI*f0/sr); a0=1+K/Q+K*K;
  return [s1,[1,-2,1,2*(K*K-1)/a0,(1-K/Q+K*K)/a0]]; }
function lufs(L,R,sr){ var k=kcoef(sr), hop=Math.round(sr*.1), nb=Math.floor(L.length/hop), e=new Float64Array(Math.max(1,nb));
  [L,R].forEach(function(x){ var a=k[0], b=k[1], z1=0, z2=0, y1=0, y2=0, acc=0, bi=0, c=0;
    for(var i=0,n=nb*hop;i<n;i++){ var v=x[i], y=a[0]*v+z1; z1=a[1]*v-a[3]*y+z2; z2=a[2]*v-a[4]*y; var w=b[0]*y+y1; y1=b[1]*y-b[3]*w+y2; y2=b[2]*y-b[4]*w; acc+=w*w; if(++c===hop){ e[bi++]+=acc; acc=0; c=0; } } });
  var bl=[], i; for(i=0;i+4<=nb;i++) bl.push((e[i]+e[i+1]+e[i+2]+e[i+3])/(hop*4));
  if(!bl.length){ var s=0; for(i=0;i<nb;i++) s+=e[i]; if(!nb||s<=0) return -99; bl.push(s/(hop*nb)); }
  function mean(th){ var s=0, c=0; for(var j=0;j<bl.length;j++) if(bl[j]>th){ s+=bl[j]; c++; } return c?s/c:0; }
  var m1=mean(Math.pow(10,(-70+.691)/10)); if(m1<=0) return -99; var m2=mean(m1*.1); return m2>0?-.691+10*Math.log10(m2):-99; }

/* компрессор: уровень по большему из каналов, мягкое колено 6 дБ, атака и спад в децибелах */
function compress(L,R,sr,thr,ratio,att,rel){ if(ratio<=1.01) return 0; var aA=Math.exp(-1/(sr*att)), aR=Math.exp(-1/(sr*rel)), env=0, kn=6, sl=1-1/ratio, worst=0, LOG=20/Math.LN10;
  for(var i=0,n=L.length;i<n;i++){ var l=L[i], r=R[i], a=l<0?-l:l, b=r<0?-r:r, x=LOG*Math.log((a>b?a:b)+1e-9), o=x-thr, gr=0;
    if(o>kn/2) gr=-o*sl; else if(o>-kn/2){ var q=o+kn/2; gr=-sl*q*q/(2*kn); }
    env=gr<env?aA*env+(1-aA)*gr:aR*env+(1-aR)*gr; if(env<worst) worst=env; var g=Math.exp(env/LOG); L[i]=l*g; R[i]=r*g; }
  return worst; }
/* насыщение: мягкое ограничение tanh, подмешанное к чистому звуку */
function saturate(L,R,s){ if(s<=0) return; var d=1.6, nk=1/Math.tanh(d), dry=1-s; [L,R].forEach(function(x){ for(var i=0,n=x.length;i<n;i++) x[i]=dry*x[i]+s*Math.tanh(x[i]*d)*nk; }); }
function width(L,R,w){ if(Math.abs(w-1)<.01) return; for(var i=0,n=L.length;i<n;i++){ var m=(L[i]+R[i])/2, s=(L[i]-R[i])/2*w; L[i]=m+s; R[i]=m-s; } }
/* лимитер с заглядыванием вперёд на 5 мс: выше потолка звук не уйдёт, щелчков нет.
   Нужное ослабление: скользящий минимум по окну, плавный спад, затем усреднение по тому же окну (оно и даёт плавную атаку). */
function limit(L,R,sr,ceil){ var n=L.length, W=Math.max(8,Math.round(sr*.005)), rel=Math.exp(-1/(sr*.12)), dq=new Int32Array(W+2), gq=new Float32Array(W+2), h=0, t=0, cnt=0;
  var ring=new Float32Array(W), rs=0, ri=0, env=1, dl=new Float32Array(W), dr=new Float32Array(W), di=0, maxGr=1, i; for(i=0;i<W;i++){ ring[i]=1; } rs=W;
  for(i=0;i<n+W;i++){ var l=i<n?L[i]:0, r=i<n?R[i]:0, a=l<0?-l:l, b=r<0?-r:r, m=a>b?a:b, g=m>ceil?ceil/m:1;
    while(cnt&&gq[(t+W+1)%(W+2)]>=g){ t=(t+W+1)%(W+2); cnt--; } gq[t]=g; dq[t]=i; t=(t+1)%(W+2); cnt++;
    if(dq[h]<i-W){ h=(h+1)%(W+2); cnt--; }
    var mn=gq[h]; env=mn<env?mn:1-(1-env)*rel; if(env>mn) env=mn;
    rs+=env-ring[ri]; ring[ri]=env; ri=(ri+1)%W; var gs=rs/W; if(gs<maxGr) maxGr=gs;
    var ol=dl[di], or=dr[di]; dl[di]=l; dr[di]=r; di=(di+1)%W;
    if(i>=W){ L[i-W]=ol*gs; R[i-W]=or*gs; } }
  return maxGr; }

/* мастеринг целиком. m: { hp, eq:[[тип,частота,дБ,q]...], comp:[порог,степень,атака,спад], width, sat, target, ceil, amt } */
function master(L,R,sr,m){ var st={ inL:lufs(L,R,sr), inPk:db(peak(L,R)) }; if(!m||st.inL<-70){ st.outL=st.inL; st.outPk=st.inPk; return st; }
  var k=m.amt==null?1:m.amt, ceil=Math.pow(10,(m.ceil==null?-1:m.ceil)/20);
  if(m.hp){ var hp=coef("hp",m.hp,sr,0,.707); biquad(L,hp); biquad(R,hp); }
  (m.eq||[]).forEach(function(b){ if(!b[2]) return; var c=coef(b[0],b[1],sr,b[2]*k,b[3]||.8); biquad(L,c); biquad(R,c); });
  width(L,R,1+((m.width||1)-1)*k);
  var l0=lufs(L,R,sr), g0=Math.pow(10,(-18-l0)/20); gain(L,g0); gain(R,g0);
  if(m.comp) st.gr=compress(L,R,sr,m.comp[0],1+(m.comp[1]-1)*k,m.comp[2],m.comp[3]);
  saturate(L,R,(m.sat||0)*Math.min(1.5,k));
  /* громкость: подняли до цели, срезали пики лимитером, домерили и поправили ещё до двух раз */
  var tg=m.target==null?-14:m.target, l1=lufs(L,R,sr), g1=Math.pow(10,(tg-l1)/20); gain(L,g1); gain(R,g1); st.lim=limit(L,R,sr,ceil);
  for(var pass=0;pass<3;pass++){ var now=lufs(L,R,sr), d=tg-now; if(d<.25||d>6) break; var g2=Math.pow(10,(d+.15)/20); gain(L,g2); gain(R,g2); st.lim=Math.min(st.lim,limit(L,R,sr,ceil)); }
  st.outL=lufs(L,R,sr); st.outPk=db(peak(L,R)); st.lim=db(st.lim); return st; }

var API={ coef:coef, biquad:biquad, lufs:lufs, peak:peak, db:db, compress:compress, limit:limit, saturate:saturate, width:width, master:master };
if(typeof importScripts==="function"){ G.onmessage=function(e){ var d=e.data, st=master(d.L,d.R,d.sr,d.m); G.postMessage({ id:d.id, L:d.L, R:d.R, st:st },[d.L.buffer,d.R.buffer]); }; }
else G.ZDSP=API;
if(typeof module!=="undefined"&&module.exports) module.exports=API;
})(typeof self!=="undefined"?self:this);
