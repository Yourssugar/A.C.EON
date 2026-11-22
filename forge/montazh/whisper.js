/* FORGE монтаж: распознавание речи для субтитров (Whisper base), работает в отдельном потоке браузера.
   Звук сюда приходит уже готовым (16 кГц, моно) и никуда не отправляется. Из сети скачивается только модель,
   один раз: сначала ищем файлы на своём сайте (ai/whisper-base/), если их нет, берём с Hugging Face и кладём в кэш браузера.
   Движок ONNX Runtime общий с графической мастерской (../grafika/ai/). */
"use strict";
var ORT_BASE="../grafika/ai/";
importScripts(ORT_BASE+"ort.wasm.min.js");
ort.env.wasm.wasmPaths=new URL(ORT_BASE,self.location.href).href;
ort.env.wasm.numThreads=self.crossOriginIsolated?Math.min(4,navigator.hardwareConcurrency||2):1;

/* base: 77 МБ, быстрее; small: 250 МБ, заметно точнее на русском, но в 3-4 раза медленнее. Файлы small больше 100 МБ, на GitHub Pages их не положить */
var MODELS={ base:{ dir:"whisper-base", heads:8, mb:[23.2,53.7] }, small:{ dir:"whisper-small", heads:12, mb:[92.3,156.8] } }, MODEL="base";
function sources(){ var d=MODELS[MODEL].dir; return ["ai/"+d+"/","https://huggingface.co/Xenova/"+d+"/resolve/main/"]; }
var FILES={ enc:"onnx/encoder_model_quantized.onnx", dec:"onnx/decoder_model_merged_quantized.onnx", vocab:"vocab.json" };
var SR=16000, NFFT=400, HOP=160, NMEL=80, CHUNK=SR*30, FRAMES=3000;
var EOT=50257, SOT=50258, TRANSCRIBE=50359, NOSPEECH=50362, NOTS=50363, TS0=50364, LANG0=50259, LANG1=50357;
var LANGS={ en:50259, ru:50263, de:50261, fr:50265, es:50262, it:50274, pl:50269, uk:50280, be:50330, kk:50316, tr:50268, pt:50267 };
var SUPPRESS=[1,2,7,8,9,10,14,25,26,27,28,29,31,58,59,60,61,62,63,90,91,92,93,359,503,522,542,873,893,902,918,922,931,1350,1853,1982,2460,2627,3246,3253,3268,3536,3846,3961,4183,4667,6585,6647,7273,9061,9383,10428,10929,11938,12033,12331,12562,13793,14157,14635,15265,15618,16553,16604,18362,18956,20075,21675,22520,26130,26161,26435,28279,29464,31650,32302,32470,36865,42863,47425,49870,50254,50258,50358,50359,50360,50361,50362];

var S={ enc:null, dec:null, vocab:null, cancel:false };
function post(o,tr){ self.postMessage(o,tr||[]); }

/* ── загрузка файлов модели с прогрессом и кэшем ── */
function fetchFile(name,onBytes){
  var urls=sources().map(function(b){ return new URL(b+name,self.location.href).href; });
  var cacheP=self.caches?caches.open("forge-whisper").catch(function(){ return null; }):Promise.resolve(null);
  return cacheP.then(function(cache){
    function tryUrl(i){ if(i>=urls.length) return Promise.reject(new Error("model-missing"));
      var u=urls[i];
      return (cache?cache.match(u):Promise.resolve(null)).then(function(hit){ if(hit) return hit.arrayBuffer();
        return fetch(u).then(function(r){ if(!r.ok) throw new Error("http "+r.status);
          var total=+r.headers.get("content-length")||0, rd=r.body&&r.body.getReader?r.body.getReader():null;
          if(!rd) return r.arrayBuffer().then(function(ab){ onBytes(ab.byteLength,ab.byteLength); return ab; });
          var parts=[], got=0;
          function pump(){ return rd.read().then(function(x){ if(x.done) return; parts.push(x.value); got+=x.value.byteLength; onBytes(got,total); return pump(); }); }
          return pump().then(function(){ var ab=new Uint8Array(got), o=0; parts.forEach(function(p){ ab.set(p,o); o+=p.byteLength; }); ab=ab.buffer;
            /* в кэш только скачанное с чужого сайта: со своего сайта браузер и так закэширует */
            if(cache&&i>0) return cache.put(u,new Response(ab.slice(0))).catch(function(){}).then(function(){ return ab; }); return ab; }); })
        .catch(function(){ return tryUrl(i+1); }); }); }
    return tryUrl(0); }); }

function load(model){ model=MODELS[model]?model:"base"; if(S.dec&&S.model===model) return Promise.resolve();
  if(S.enc){ try{ S.enc.release(); S.dec.release(); }catch(e){} S.enc=S.dec=null; DEC_IN=null; } MODEL=model; S.model=model;
  var sizes={ enc:MODELS[model].mb[0]*1e6, dec:MODELS[model].mb[1]*1e6, vocab:1.04e6 }, got={ enc:0, dec:0, vocab:0 }, all=sizes.enc+sizes.dec+sizes.vocab;
  function prog(k){ return function(g,t){ if(t) sizes[k]=t; got[k]=g; var a=got.enc+got.dec+got.vocab, b=sizes.enc+sizes.dec+sizes.vocab; post({ type:"progress", stage:"model", k:a/b, mb:[a/1048576,b/1048576] }); }; }
  return Promise.all([fetchFile(FILES.vocab,prog("vocab")),fetchFile(FILES.enc,prog("enc")),fetchFile(FILES.dec,prog("dec"))]).then(function(r){
    var v=JSON.parse(new TextDecoder().decode(r[0])), arr=[]; Object.keys(v).forEach(function(k){ arr[v[k]]=k; }); S.vocab=arr;
    post({ type:"progress", stage:"init", k:1 });
    var o={ executionProviders:["wasm"], graphOptimizationLevel:"all" };
    return ort.InferenceSession.create(r[1],o).then(function(e){ S.enc=e; return ort.InferenceSession.create(r[2],o); }).then(function(d){ S.dec=d; }); }); }

/* ── лог-мел спектрограмма как в Whisper: окно Ханна 400, шаг 160, 80 мел-полос (librosa, slaney).
   БПФ на 400 точек со смешанным основанием (4·4·5·5), иначе 30 с звука считались бы десятки секунд ── */
var MEL=null;
function hz2mel(f){ var fsp=200/3, minHz=1000, minMel=minHz/fsp, ls=Math.log(6.4)/27; return f<minHz?f/fsp:minMel+Math.log(f/minHz)/ls; }
function mel2hz(m){ var fsp=200/3, minHz=1000, minMel=minHz/fsp, ls=Math.log(6.4)/27; return m<minMel?m*fsp:minHz*Math.exp(ls*(m-minMel)); }
function melInit(){ if(MEL) return MEL; var nb=NFFT/2+1, i, j, win=new Float64Array(NFFT); for(i=0;i<NFFT;i++) win[i]=.5-.5*Math.cos(2*Math.PI*i/NFFT);
  var m0=hz2mel(0), m1=hz2mel(SR/2), pts=[]; for(i=0;i<NMEL+2;i++) pts.push(mel2hz(m0+(m1-m0)*i/(NMEL+1)));
  var fb=new Float64Array(NMEL*nb);
  for(i=0;i<NMEL;i++){ var lo=pts[i], ce=pts[i+1], hi=pts[i+2], en=2/(hi-lo); for(j=0;j<nb;j++){ var ff=j*SR/NFFT, l=(ff-lo)/(ce-lo), u=(hi-ff)/(hi-ce); fb[i*nb+j]=Math.max(0,Math.min(l,u))*en; } }
  var tw=new Float64Array(NFFT*2); for(i=0;i<NFFT;i++){ tw[2*i]=Math.cos(-2*Math.PI*i/NFFT); tw[2*i+1]=Math.sin(-2*Math.PI*i/NFFT); }
  MEL={ win:win, fb:fb, tw:tw, nb:nb }; return MEL; }
/* рекурсивное БПФ: вход re/im с шагом stride, выход подряд */
function fft(inR,inI,off,stride,n,outR,outI,o,tw,N){ if(n===1){ outR[o]=inR[off]; outI[o]=inI[off]; return; }
  var p=n%4===0?4:n%5===0?5:n%2===0?2:n, m=n/p, q, k, r;
  for(q=0;q<p;q++) fft(inR,inI,off+q*stride,stride*p,m,outR,outI,o+q*m,tw,N);
  var tR=new Float64Array(p), tI=new Float64Array(p), step=N/n;
  for(k=0;k<m;k++){ for(q=0;q<p;q++){ var ti=(q*k*step)%N, wr=tw[2*ti], wi=tw[2*ti+1], xr=outR[o+q*m+k], xi=outI[o+q*m+k]; tR[q]=xr*wr-xi*wi; tI[q]=xr*wi+xi*wr; }
    for(r=0;r<p;r++){ var sr=0, si=0; for(q=0;q<p;q++){ var t2=(q*r*m*step)%N, cr=tw[2*t2], ci=tw[2*t2+1]; sr+=tR[q]*cr-tI[q]*ci; si+=tR[q]*ci+tI[q]*cr; } outR[o+r*m+k]=sr; outI[o+r*m+k]=si; } }
  /* выход перекладываем: блоки по m шли подряд, нужное место r*m+k уже стоит, копия не нужна */ }
function logMel(x){ var C=melInit(), nb=C.nb, win=C.win, fb=C.fb, tw=C.tw, N=NFFT, pad=N/2, n=x.length, X=new Float32Array(n+2*pad), i, j, f;
  for(i=0;i<n;i++) X[i+pad]=x[i];
  for(i=1;i<=pad;i++){ X[pad-i]=x[Math.min(n-1,i)]||0; X[pad+n-1+i]=x[Math.max(0,n-1-i)]||0; }
  var out=new Float32Array(NMEL*FRAMES), fr=new Float64Array(N), zi=new Float64Array(N), oR=new Float64Array(N), oI=new Float64Array(N), pw=new Float64Array(nb), mx=-1e9;
  for(f=0;f<FRAMES;f++){ var o=f*HOP; for(i=0;i<N;i++) fr[i]=X[o+i]*win[i];
    fft(fr,zi,0,1,N,oR,oI,0,tw,N);
    for(j=0;j<nb;j++) pw[j]=oR[j]*oR[j]+oI[j]*oI[j];
    for(i=0;i<NMEL;i++){ var s=0, b2=i*nb; for(j=0;j<nb;j++) s+=fb[b2+j]*pw[j]; var v=Math.log10(Math.max(s,1e-10)); out[i*FRAMES+f]=v; if(v>mx) mx=v; } }
  for(i=0;i<out.length;i++) out[i]=(Math.max(out[i],mx-8)+4)/4;
  return out; }

/* ── декодер ── */
function T(type,data,dims){ return new ort.Tensor(type,data,dims); }
var DEC_IN=null, DEC_OUT=null, NL=6;
function decInfo(){ if(DEC_IN) return; DEC_IN=S.dec.inputNames; DEC_OUT=["logits"]; NL=0;
  DEC_IN.forEach(function(n){ var m=/^past_key_values\.(\d+)\.decoder\.key$/.exec(n); if(m) NL=Math.max(NL,+m[1]+1); });
  for(var l=0;l<NL;l++) ["decoder.key","decoder.value","encoder.key","encoder.value"].forEach(function(k){ DEC_OUT.push("present."+l+"."+k); }); }
function step(ids,hid,past){ decInfo(); var feeds={ input_ids:T("int64",BigInt64Array.from(ids.map(BigInt)),[1,ids.length]), encoder_hidden_states:hid };
  var empty=T("float32",new Float32Array(0),[1,MODELS[MODEL].heads,0,64]);
  /* ключи кросс-внимания считаются один раз на первом шаге, дальше ветка с кэшем отдаёт вместо них пустышки */
  for(var l=0;l<NL;l++) ["decoder.key","decoder.value","encoder.key","encoder.value"].forEach(function(k){ feeds["past_key_values."+l+"."+k]=past?(k.indexOf("encoder")===0?past.enc:past.dec)["present."+l+"."+k]:empty; });
  if(DEC_IN.indexOf("use_cache_branch")>=0) feeds.use_cache_branch=T("bool",new Uint8Array([past?1:0]),[1]);
  return S.dec.run(feeds,DEC_OUT).then(function(r){ var lg=r.logits, V=lg.dims[2], n=lg.dims[1]; return { logits:lg.data.subarray((n-1)*V,n*V), past:{ dec:r, enc:past?past.enc:r } }; }); }
function logSoftmaxMax(a,from,to){ var m=-Infinity, i; for(i=from;i<to;i++) if(a[i]>m) m=a[i]; return m; }
function lse(a,from,to){ var m=logSoftmaxMax(a,from,to), s=0; if(m===-Infinity) return -Infinity; for(var i=from;i<to;i++) s+=Math.exp(a[i]-m); return m+Math.log(s); }
/* правила меток времени из Whisper: метки парами, не назад, первая не позже 1 с; если время вероятнее текста, ставим время */
function pick(lg,toks,maxTs,temp){ var V=lg.length, i, L=new Float32Array(lg);
  SUPPRESS.forEach(function(t){ L[t]=-Infinity; }); L[NOTS]=-Infinity; for(i=LANG0;i<=LANG1;i++) L[i]=-Infinity;
  var n=toks.length, last=n>=1&&toks[n-1]>=TS0, pen=n<2||toks[n-2]>=TS0;
  if(n===0){ L[220]=-Infinity; L[EOT]=-Infinity; }
  if(last){ if(pen) for(i=TS0;i<V;i++) L[i]=-Infinity; else for(i=0;i<EOT;i++) L[i]=-Infinity; }
  var lastTs=-1; for(i=n-1;i>=0;i--) if(toks[i]>=TS0){ lastTs=toks[i]; break; }
  if(lastTs>=0){ var lim=last&&!pen?lastTs:lastTs+1; for(i=TS0;i<lim;i++) L[i]=-Infinity; }
  if(n===0){ for(i=0;i<TS0;i++) L[i]=-Infinity; for(i=TS0+51;i<V;i++) L[i]=-Infinity; }
  if(maxTs) for(i=maxTs+1;i<V;i++) if(i>=TS0) L[i]=-Infinity;
  var all=lse(L,0,V), tsl=lse(L,TS0,V)-all, txm=logSoftmaxMax(L,0,TS0)-all;
  if(tsl>txm) for(i=0;i<TS0;i++) L[i]=-Infinity;
  var best=0, bv=-Infinity; for(i=0;i<V;i++) if(L[i]>bv){ bv=L[i]; best=i; }
  if(temp>0){ var mx=bv, sum=0, r; for(i=0;i<V;i++) if(L[i]>-Infinity) sum+=Math.exp((L[i]-mx)/temp); r=Math.random()*sum;
    for(i=0;i<V;i++) if(L[i]>-Infinity){ r-=Math.exp((L[i]-mx)/temp); if(r<=0){ best=i; break; } } }
  return { tok:best, lp:L[best]-all }; }

var BD=null; function byteDec(){ if(BD) return BD; var bs=[], i; for(i=33;i<=126;i++) bs.push(i); for(i=161;i<=172;i++) bs.push(i); for(i=174;i<=255;i++) bs.push(i);
  var cs=bs.slice(), n=0; for(i=0;i<256;i++) if(bs.indexOf(i)<0){ bs.push(i); cs.push(256+n); n++; } BD={}; for(i=0;i<bs.length;i++) BD[String.fromCharCode(cs[i])]=bs[i]; return BD; }
function detok(ids){ var bd=byteDec(), bytes=[]; ids.forEach(function(id){ if(id>=EOT) return; var s=S.vocab[id]||""; for(var i=0;i<s.length;i++){ var b=bd[s[i]]; if(b!=null) bytes.push(b); } });
  return new TextDecoder().decode(new Uint8Array(bytes)); }

/* одно окно до 30 с: кодировщик считается один раз, декодер может пройти ещё раз со случайностью, если зациклился */
function encode(pcm){ var x=pcm.length>=CHUNK?pcm:(function(){ var z=new Float32Array(CHUNK); z.set(pcm); return z; })();
  return S.enc.run({ input_features:T("float32",logMel(x),[1,NMEL,FRAMES]) },["last_hidden_state"]).then(function(r){ return r.last_hidden_state; }); }
function detectLang(hid){ return step([SOT],hid,null).then(function(s0){ var lg=s0.logits, b=LANG0, bv=-Infinity; for(var i=LANG0;i<=LANG1;i++) if(lg[i]>bv){ bv=lg[i]; b=i; } return b; }); }
function decodeWin(hid,L0,winSec,temp){
  return step([SOT,L0,TRANSCRIBE],hid,null).then(function(s1){ var all=lse(s1.logits,0,s1.logits.length), nsp=Math.exp(s1.logits[NOSPEECH]-all);
    var toks=[], lps=[], cur=s1, maxTs=TS0+Math.min(1500,Math.round(winSec/.02));
    function loop(){ if(S.cancel) return Promise.reject(new Error("cancel")); var p=pick(cur.logits,toks,maxTs,temp); toks.push(p.tok); lps.push(p.lp);
      if(p.tok===EOT||toks.length>=224) return { toks:toks, lps:lps, nsp:nsp };
      return step([p.tok],hid,cur.past).then(function(s){ cur=s; return loop(); }); }
    return loop(); }); }
/* разбор токенов окна в куски с временем; complete: где кончается последний законченный кусок */
function parse(t,winSec){ if(t[t.length-1]===EOT) t=t.slice(0,-1); var cur=null, lastEnd=-1, out=[], i;
  for(i=0;i<t.length;i++){ var k=t[i];
    if(k>=TS0){ var ts=(k-TS0)*.02; if(cur){ cur.e=Math.min(ts,winSec); if(cur.ids.length) out.push(cur); cur=null; lastEnd=ts; } else cur={ s:ts, ids:[] }; }
    else if(cur) cur.ids.push(k); else cur={ s:lastEnd>=0?lastEnd:0, ids:[k] }; }
  out.forEach(function(sg){ sg.t=detok(sg.ids).trim(); });
  return { segs:out.filter(function(sg){ return sg.t; }), tail:cur&&cur.ids.length?{ s:cur.s, e:winSec, t:detok(cur.ids).trim() }:null, lastEnd:lastEnd, single:t.length>=2&&t[t.length-1]>=TS0&&t[t.length-2]<TS0 }; }
/* признак зацикливания: один и тот же кусок три раза подряд или слишком много токенов на окно */
function looped(r,pr){ if(r.toks.length>=224) return true; var c=1; for(var i=1;i<pr.segs.length;i++){ if(pr.segs[i].t===pr.segs[i-1].t){ if(++c>=3) return true; } else c=1; } return false; }
/* сжимаемость текста, как в Whisper: зацикленный текст жмётся слишком хорошо (больше 2.4 раза) */
function ratio(text){ var b=new TextEncoder().encode(text); if(b.length<40||!self.CompressionStream) return Promise.resolve(1);
  return new Response(new Blob([b]).stream().pipeThrough(new CompressionStream("deflate"))).arrayBuffer().then(function(z){ return b.length/Math.max(1,z.byteLength); }).catch(function(){ return 1; }); }
function avgLp(r){ var a=0; r.lps.forEach(function(v){ a+=v; }); return a/Math.max(1,r.lps.length); }

function onset(w){ var F=320, nF=Math.floor(w.length/F), r=new Float32Array(nF), mx=0, i, j;
  for(i=0;i<nF;i++){ var e=0; for(j=i*F;j<(i+1)*F;j++) e+=w[j]*w[j]; r[i]=Math.sqrt(e/F); if(r[i]>mx) mx=r[i]; }
  var thr=Math.max(.006,mx*.06); for(i=0;i<nF;i++) if(r[i]>thr&&(r[i+1]||0)>thr) return i*F; return w.length; }
function run(pcm,lang){ S.cancel=false; var segs=[], seek=0, n=pcm.length, langId=lang&&lang!=="auto"?LANGS[lang]||null:null;
  function next(){ if(S.cancel) return Promise.reject(new Error("cancel")); if(seek>=n-SR*.3) return Promise.resolve();
    var w=pcm.subarray(seek,Math.min(n,seek+CHUNK)), winSec=w.length/SR, rms=0; for(var i=0;i<w.length;i+=4) rms+=w[i]*w[i]; rms=Math.sqrt(rms/Math.max(1,w.length/4));
    post({ type:"progress", stage:"asr", k:seek/n, at:seek/SR, all:n/SR });
    if(rms<.002){ seek+=w.length; return next(); }
    /* окно начинаем с начала речи: модель ставит первую метку не позже 1 с, и тишина в начале сдвинула бы все времена */
    var on=onset(w); if(on>SR*.5){ seek+=on-Math.round(SR*.2); return next(); }
    return encode(w).then(function(hid){ return (langId?Promise.resolve(langId):detectLang(hid)).then(function(L0){ langId=L0;
      var temps=[0,.4,.8], best=null;
      function attempt(k){ return decodeWin(hid,L0,winSec,temps[k]).then(function(r){ var pr=parse(r.toks.slice(),winSec);
        return ratio(pr.segs.map(function(x){ return x.t; }).join(" ")+(pr.tail?" "+pr.tail.t:"")).then(function(cr){ var bad=looped(r,pr)||cr>2.4, sc=avgLp(r)-(bad?5:0);
          if(!best||sc>best.sc) best={ r:r, pr:pr, sc:sc, bad:bad };
          if((bad||avgLp(r)<-1.2)&&k<temps.length-1) return attempt(k+1); return best; }); }); }
      return attempt(0); }); }).then(function(b){ var off=seek/SR, r=b.r, pr=b.pr;
      if(r.nsp>.6&&avgLp(r)<-1){ seek+=w.length; return next(); }
      var take=pr.segs.slice(), full=w.length>=CHUNK;
      /* неоконченный хвост в полном окне не берём: следующее окно начнётся с конца последнего законченного куска */
      if(pr.tail&&(!full||pr.lastEnd<=0)) take.push(pr.tail);
      if(b.bad){ var seen={}; take=take.filter(function(sg){ if(seen[sg.t]) return false; seen[sg.t]=1; return true; }); }
      take.forEach(function(sg){ segs.push({ s:off+sg.s, e:off+Math.min(sg.e,winSec), t:sg.t }); });
      if(!full||pr.single||pr.lastEnd<=0||!pr.tail&&pr.lastEnd>=winSec-1) seek+=w.length;
      else seek+=Math.max(SR,Math.round(pr.lastEnd*SR));
      post({ type:"segments", segs:segs.slice() });
      return next(); }); }
  return next().then(function(){ return segs; }); }

self.onmessage=function(e){ var m=e.data;
  if(m.type==="cancel"){ S.cancel=true; return; }
  if(m.type==="run"){ S.cancel=false;
    load(m.model).then(function(){ return run(m.pcm,m.lang); }).then(function(segs){ post({ type:"done", segs:segs }); })
      .catch(function(err){ post({ type:"error", msg:String(err&&err.message||err) }); }); } };
