/* FORGE звук: обработка готового трека (мастеринг) и замер громкости.
   Файл грузится дважды: обычным скриптом (window.ZDSP, запасной путь) и как Web Worker, чтобы страница не замирала на длинных треках.
   Всё работает на месте, по массивам отсчётов L и R, без копий: 4 минуты стерео это 84 МБ, лишние копии телефону не по силам.
   Кроме мастеринга здесь чистка шума (denoise) и сведение основной дорожки с подложкой (job).
   Порядок мастеринга: срез низа и тон (эквалайзер) -> ширина стерео -> компрессор -> насыщение -> громкость по LUFS -> лимитер с потолком.
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

/* быстрое преобразование Фурье на месте, таблицы синусов считаются один раз на размер */
var FT={};
function fft(re,im,inv){ var n=re.length, t=FT[n], i, j, k;
  if(!t){ t=FT[n]={ c:new Float64Array(n/2), s:new Float64Array(n/2), r:new Uint32Array(n) }; for(i=0;i<n/2;i++){ t.c[i]=Math.cos(2*PI*i/n); t.s[i]=Math.sin(2*PI*i/n); } var bits=Math.round(Math.log2(n)); for(i=0;i<n;i++){ var x=i, y=0; for(k=0;k<bits;k++){ y=(y<<1)|(x&1); x>>=1; } t.r[i]=y; } }
  for(i=0;i<n;i++){ j=t.r[i]; if(j>i){ var a=re[i]; re[i]=re[j]; re[j]=a; a=im[i]; im[i]=im[j]; im[j]=a; } }
  var sg=inv?1:-1;
  for(var len=2;len<=n;len<<=1){ var h=len>>1, st=n/len; for(i=0;i<n;i+=len){ for(k=0;k<h;k++){ var wr=t.c[k*st], wi=sg*t.s[k*st], p=i+k, q=p+h, xr=re[q]*wr-im[q]*wi, xi=re[q]*wi+im[q]*wr; re[q]=re[p]-xr; im[q]=im[p]-xi; re[p]+=xr; im[p]+=xi; } } }
  if(inv){ var sc=1/n; for(i=0;i<n;i++){ re[i]*=sc; im[i]*=sc; } } }
/* чистка шума. Профиль шума берётся сам: по десятой части самых тихих кадров записи (паузы между фразами).
   Дальше каждый кадр раскладывается по частотам, и там, где звук не выше шума, полоса приглушается.
   Усиление не падает резко от кадра к кадру и сглажено по соседним частотам: иначе остаётся «бульканье».
   k от 0 до 1: сила. Возвращает, на сколько дБ в среднем приглушён шум, или 0, если чистить нечего. */
function denoise(L,R,sr,k){ var N=2048, H=512, nb=N/2+1, n=L.length, F=Math.floor((n-N)/H)+1, i, f, b; if(F<16) return 0;
  var mono=true; for(i=0;i<n;i+=97) if(Math.abs(L[i]-R[i])>1e-5){ mono=false; break; }
  var win=new Float32Array(N); for(i=0;i<N;i++) win[i]=Math.sqrt(.5-.5*Math.cos(2*PI*i/N));
  var en=new Float32Array(F), arr=[]; for(f=0;f<F;f++){ var e=0, o=f*H; for(i=0;i<N;i+=4){ var v=L[o+i]+R[o+i]; e+=v*v; } en[f]=e; if(e>1e-7) arr.push(e); }
  if(arr.length<16) return 0; arr.sort(function(x,y){ return x-y; }); /* тихими считаем кадры не громче чем втрое от уровня самых тихих: если брать только самые тихие, шум окажется недооценён */
  var thr=arr[Math.floor(arr.length*.1)]*3, idx=[]; for(f=0;f<F;f++) if(en[f]>1e-7&&en[f]<=thr) idx.push(f);
  var re=new Float64Array(N), im=new Float64Array(N), re2=new Float64Array(N), im2=new Float64Array(N), noise=new Float64Array(nb), cnt=0, stp=Math.max(1,Math.ceil(idx.length/300));
  for(var q=0;q<idx.length;q+=stp){ o=idx[q]*H; for(i=0;i<N;i++){ re[i]=(L[o+i]+R[o+i])*.5*win[i]; im[i]=0; } fft(re,im); for(b=0;b<nb;b++) noise[b]+=re[b]*re[b]+im[b]*im[b]; cnt++; }
  if(!cnt) return 0; var sm=new Float64Array(nb); for(b=0;b<nb;b++){ var lo=Math.max(0,b-2), hi=Math.min(nb-1,b+2), s2=0; for(i=lo;i<=hi;i++) s2+=noise[i]; sm[b]=s2/(hi-lo+1)/cnt; }
  var al=1.5+3*k, fl=Math.pow(10,-(6+24*k)/20), g=new Float32Array(nb), pg=new Float32Array(nb), pwr=new Float64Array(nb), ps=new Float64Array(nb), oL=new Float64Array(N), oR=new Float64Array(N), red=0, rn=0; for(b=0;b<nb;b++) pg[b]=1;
  for(f=-3;f*H<n;f++){ o=f*H;
    for(i=0;i<N;i++){ var p=o+i, ok=p>=0&&p<n; re[i]=ok?L[p]*win[i]:0; im[i]=0; if(!mono){ re2[i]=ok?R[p]*win[i]:0; im2[i]=0; } }
    fft(re,im); if(!mono) fft(re2,im2);
    for(b=0;b<nb;b++){ var pw=re[b]*re[b]+im[b]*im[b]; if(!mono) pw=(pw+re2[b]*re2[b]+im2[b]*im2[b])*.5; pwr[b]=pw; }
    /* мощность усредняем по соседним частотам и по времени: одиночные всплески шума перестают проскакивать */
    for(b=0;b<nb;b++){ var b0=b>1?b-2:0, b1=b<nb-2?b+2:nb-1, av=0; for(i=b0;i<=b1;i++) av+=pwr[i]; av/=(b1-b0+1); var up=av>ps[b]; ps[b]=up?.3*ps[b]+.7*av:.75*ps[b]+.25*av;
      var gg=1-al*sm[b]/(ps[b]+1e-30); if(gg<fl) gg=fl; var keep=pg[b]*.72; if(gg<keep) gg=keep; pg[b]=gg; }
    for(b=0;b<nb;b++){ var a0=pg[b>0?b-1:b], a2=pg[b<nb-1?b+1:b]; g[b]=(a0+2*pg[b]+a2)*.25; }
    for(b=0;b<nb;b++){ var m=b===0||b===N/2?-1:N-b; re[b]*=g[b]; im[b]*=g[b]; if(m>0){ re[m]*=g[b]; im[m]*=g[b]; } if(!mono){ re2[b]*=g[b]; im2[b]*=g[b]; if(m>0){ re2[m]*=g[b]; im2[m]*=g[b]; } } }
    if(f>=0&&f<F&&en[f]<=thr&&en[f]>1e-7){ var gs=0; for(b=4;b<nb;b+=8) gs+=g[b]; red+=gs/Math.ceil((nb-4)/8); rn++; }
    fft(re,im,true); if(!mono) fft(re2,im2,true);
    for(i=0;i<N;i++){ oL[i]+=re[i]*win[i]; if(!mono) oR[i]+=re2[i]*win[i]; }
    for(i=0;i<H;i++){ p=o+i; if(p>=0&&p<n){ L[p]=oL[i]*.5; R[p]=mono?L[p]:oR[i]*.5; } }
    oL.copyWithin(0,H); oL.fill(0,N-H); if(!mono){ oR.copyWithin(0,H); oR.fill(0,N-H); } }
  return rn?db(red/rn):0; }
/* огибающая: средняя громкость по окнам win отсчётов */
function envelope(L,R,win){ var nb=Math.ceil(L.length/win), e=new Float32Array(nb); for(var b=0;b<nb;b++){ var s=0, a=b*win, z=Math.min(L.length,a+win); for(var i=a;i<z;i+=2) s+=L[i]*L[i]+R[i]*R[i]; e[b]=Math.sqrt(s/Math.max(1,(z-a))); } return e; }
/* приглушение подложки под голосом: где основная дорожка звучит, подложка уходит вниз на depth дБ.
   Начинает уходить за 0.12 с до голоса, держится 0.4 с после, чтобы не дёргалась между словами */
function duckCurve(env,hop,depth){ var n=env.length, pk=0, i; for(i=0;i<n;i++) if(env[i]>pk) pk=env[i]; var thr=Math.max(.0056,pk*.04), on=new Uint8Array(n), hold=Math.round(.4/hop), look=Math.round(.12/hop), last=-1e9;
  for(i=0;i<n;i++){ if(env[i]>thr) last=i; if(i-last<=hold) on[i]=1; } for(i=0;i<n-look;i++) if(on[i+look]) on[i]=1;
  var lowG=Math.pow(10,-depth/20), c=new Float32Array(n), g=1, aD=Math.exp(-hop/.07), aU=Math.exp(-hop/.45); for(i=0;i<n;i++){ var t=on[i]?lowG:1; g=t<g?aD*g+(1-aD)*t:aU*g+(1-aU)*t; c[i]=g; } return c; }
function applyCurve(L,R,c,win){ var n=L.length, last=c.length-1; for(var i=0;i<n;i++){ var x=i/win-.5, b=x<0?0:Math.floor(x), fr=x<0?0:x-b, g=b>=last?c[last]:c[b]+(c[b+1]-c[b])*fr; L[i]*=g; R[i]*=g; } }
/* одна работа целиком: чистка основной дорожки, огибающая, подложка с приглушением, сумма, мастеринг.
   d: { A:[L,R] основная, B:[L,R] или null подложка, nr: сила 0..1 или null, duck: дБ или 0, m: параметры мастеринга или null } */
function job(d){ var A=d.A, B=d.B, sr=d.sr, win=Math.round(sr*.02), out={ id:d.id };
  if(d.nr!=null){ var hp=coef("hp",70,sr,0,.707); biquad(A[0],hp); biquad(A[1],hp); out.nr=denoise(A[0],A[1],sr,d.nr); }
  out.env=envelope(A[0],A[1],win);
  if(B){ if(d.duck) applyCurve(B[0],B[1],duckCurve(out.env,win/sr,d.duck),win); var n=Math.min(A[0].length,B[0].length); for(var i=0;i<n;i++){ A[0][i]+=B[0][i]; A[1][i]+=B[1][i]; } }
  out.L=A[0]; out.R=A[1];
  if(d.m){ out.ML=new Float32Array(A[0]); out.MR=new Float32Array(A[1]); out.st=master(out.ML,out.MR,sr,d.m); } else out.st=master(A[0],A[1],sr,null);
  return out; }

var API={ coef:coef, biquad:biquad, lufs:lufs, peak:peak, db:db, compress:compress, limit:limit, saturate:saturate, width:width, master:master, fft:fft, denoise:denoise, envelope:envelope, duckCurve:duckCurve, applyCurve:applyCurve, job:job };
if(typeof importScripts==="function"){ G.onmessage=function(e){ var o=job(e.data), tr=[o.L.buffer,o.R.buffer,o.env.buffer]; if(o.ML) tr.push(o.ML.buffer,o.MR.buffer); G.postMessage(o,tr); }; }
else G.ZDSP=API;
if(typeof module!=="undefined"&&module.exports) module.exports=API;
})(typeof self!=="undefined"?self:this);
