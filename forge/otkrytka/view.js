/* FORGE открытка: показ у получателя.
   Один файл без зависимостей: его же редактор вставляет целиком в скачанную открытку (.html),
   поэтому стили, мелодии и синтез звука живут здесь.
   CARDVIEW.mount(корень, данные, настройки) рисует закрытую открытку; нажатие открывает её с анимацией и музыкой. */
(function(){
"use strict";
var CSS=[
".cv{position:relative;overflow:hidden;width:100%;height:100%;font-family:Manrope,system-ui,-apple-system,'Segoe UI',sans-serif;-webkit-tap-highlight-color:transparent;-webkit-user-select:none;user-select:none;cursor:pointer;background:#222 center/cover no-repeat;perspective:1200px;--cw:var(--w)}",
".cv *{box-sizing:border-box}",
".cv svg{stroke:none;width:auto;height:auto}",
".cv-pp svg{display:block;width:100%;height:auto}",
".cv.op{cursor:default}",
".cv-fx{position:absolute;inset:0;pointer-events:none;overflow:hidden;z-index:1}",
".cv-st{position:absolute;inset:0;z-index:2;display:flex;align-items:center;justify-content:center}",
".cv-card{position:relative;width:var(--cw);background:var(--paper);color:var(--ink);border-radius:10px;box-shadow:0 18px 50px -12px rgba(0,0,0,.5);padding:calc(var(--cw)*.085) calc(var(--cw)*.08);display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;overflow:hidden;min-height:calc(var(--cw)*1.12);max-height:calc(var(--sh) - 24px)}",
".cv.op.done .cv-card{overflow:auto;-webkit-user-select:text;user-select:text}",
".cv-card img{display:block;width:100%;max-height:calc(var(--sh)*.34);object-fit:cover;border-radius:6px;margin-bottom:calc(var(--cw)*.055);flex:none}",
".cv-card h2{margin:0;font-family:var(--fh);font-weight:var(--fw);color:var(--acc);font-size:calc(var(--cw)*.105*var(--hs));line-height:1.08;overflow-wrap:anywhere}",
".cv-card p{margin:calc(var(--cw)*.045) 0 0;font-family:var(--fb);font-size:calc(var(--cw)*.056*var(--bs));line-height:1.32;white-space:pre-line;overflow-wrap:anywhere}",
".cv-sig{align-self:flex-end;margin-top:calc(var(--cw)*.055);font-family:var(--fb);font-size:calc(var(--cw)*.06*var(--bs));color:var(--acc);white-space:pre-line}",
".cv-card>*{opacity:0;transform:translateY(10px);transition:opacity .8s,transform .8s}",
".cv.rv .cv-card>*{opacity:1;transform:none}",
".cv.rv .cv-card>:nth-child(2){transition-delay:.3s}.cv.rv .cv-card>:nth-child(3){transition-delay:.6s}.cv.rv .cv-card>:nth-child(4){transition-delay:.9s}",
".cv-hint{position:absolute;left:0;right:0;bottom:8%;text-align:center;z-index:6;color:#fff;text-shadow:0 2px 12px rgba(0,0,0,.55);font-weight:800;font-size:17px;transition:opacity .4s;animation:cvpl 1.8s ease-in-out infinite;pointer-events:none}",
".cv-hint small{display:block;font-weight:600;font-size:13px;opacity:.9;margin-top:3px}",
".cv.op .cv-hint{opacity:0;animation:none}",
"@keyframes cvpl{50%{transform:scale(1.05)}}",
".cv-snd{position:absolute;right:12px;top:12px;z-index:8;width:40px;height:40px;border-radius:50%;border:0;background:rgba(0,0,0,.38);color:#fff;display:none;place-items:center;cursor:pointer;padding:0}",
".cv.op .cv-snd.has{display:grid}",
".cv-snd svg{width:19px;height:19px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}",
".cv-snd .off{display:none}.cv-snd.mute .on{display:none}.cv-snd.mute .off{display:block}",
".cv-ft{position:absolute;left:0;right:0;bottom:12px;text-align:center;z-index:8;opacity:0;transition:opacity .8s 3.5s;pointer-events:none}",
".cv.op .cv-ft{opacity:1;pointer-events:auto}",
".cv-ft a{color:#fff;font-size:12.5px;font-weight:700;background:rgba(0,0,0,.42);padding:7px 14px;border-radius:999px;text-decoration:none}",
/* конверт */
".cv-env{position:relative;width:var(--w);height:var(--eh);--cw:calc(var(--w)*.9)}",
".cv-env .bk,.cv-env .fr,.cv-env .fl{position:absolute;left:0;top:0;width:100%;height:100%;border-radius:8px}",
".cv-env .bk{background:var(--env);filter:brightness(.78)}",
".cv-env .cv-card{position:absolute;left:5%;top:6px;height:calc(var(--eh) - 12px);max-height:none;min-height:0;z-index:1;transition:height 1s cubic-bezier(.3,1.15,.5,1),transform 1s cubic-bezier(.3,1.15,.5,1)}",
".cv-env .fr{z-index:2;background:var(--env);clip-path:polygon(0 0,50% 56%,100% 0,100% 100%,0 100%);box-shadow:0 10px 30px rgba(0,0,0,.3)}",
".cv-env .fl{z-index:3;background:var(--env);filter:brightness(1.12);clip-path:polygon(0 0,100% 0,50% 60%);transform-origin:50% 0;transition:transform .7s ease,z-index 0s .35s}",
".cv-env .sl{position:absolute;left:50%;top:60%;width:15%;aspect-ratio:1;transform:translate(-50%,-50%);border-radius:50%;background:var(--acc);z-index:4;box-shadow:0 2px 8px rgba(0,0,0,.3);display:grid;place-items:center;transition:opacity .3s,transform .3s}",
".cv-env .sl svg{width:50%;height:50%;fill:var(--paper)}",
".cv-env .bk,.cv-env .fr{transition:transform .9s ease-in,opacity .9s}",
".cv.p1 .cv-env .fl{transform:rotateX(180deg);z-index:0}",
".cv.p1 .cv-env .sl{opacity:0;transform:translate(-50%,-50%) scale(1.6)}",
".cv.p2 .cv-env .cv-card{height:var(--ch);transform:translateY(var(--rise))}",
".cv.p3 .cv-env .bk,.cv.p3 .cv-env .fr,.cv.p3 .cv-env .fl{transform:translateY(160%);opacity:0;transition:transform .9s ease-in,opacity .9s}",
".cv.p3 .cv-env .cv-card{transform:translateY(var(--fin));box-shadow:0 24px 60px -14px rgba(0,0,0,.55)}",
/* книжка */
".cv-book{position:relative;width:var(--w);transform:rotate(-2deg) scale(.94);transition:transform 1s ease;transform-style:preserve-3d}",
".cv-book .cv-card{max-height:calc(var(--sh) - 24px)}",
".cv-book .cov{position:absolute;inset:0;z-index:3;border-radius:10px;background:var(--env);transform-origin:0 50%;transition:transform 1.4s cubic-bezier(.5,0,.3,1),opacity .6s 1.1s;display:grid;place-items:center;box-shadow:0 18px 50px -12px rgba(0,0,0,.5),inset 0 0 0 calc(var(--w)*.03) rgba(255,255,255,.12)}",
".cv-book .cov svg{width:28%;fill:var(--paper);opacity:.9}",
".cv.p1 .cv-book{transform:none}",
".cv.p1 .cv-book .cov{transform:rotateY(-165deg);opacity:0}",
/* подарок */
".cv-gift{position:relative;width:var(--w);height:var(--ch)}",
".cv-gift .cv-card{position:absolute;left:0;top:0;transform:translateY(calc(var(--ch)*.22)) scale(.12);opacity:0;z-index:2;transition:transform 1.1s cubic-bezier(.25,1.3,.5,1),opacity .4s}",
".cv-gift .bx,.cv-gift .ld,.cv-gift .bw{position:absolute;left:50%;z-index:3}",
".cv-gift .bx{width:var(--bw);height:calc(var(--bw)*.72);top:calc(50% - var(--bw)*.2);margin-left:calc(var(--bw)*-.5);border-radius:6px;background:linear-gradient(90deg,transparent 43%,var(--acc) 43% 57%,transparent 57%),var(--env);box-shadow:0 14px 34px rgba(0,0,0,.35);transition:transform .9s ease-in,opacity .9s}",
".cv-gift .ld{width:calc(var(--bw)*1.1);height:calc(var(--bw)*.22);top:calc(50% - var(--bw)*.42);margin-left:calc(var(--bw)*-.55);border-radius:6px;background:linear-gradient(90deg,transparent 44%,var(--acc) 44% 56%,transparent 56%),var(--env);filter:brightness(1.12);transition:transform .8s cubic-bezier(.3,.6,.4,1),opacity .8s}",
".cv-gift .bw{width:calc(var(--bw)*.5);height:calc(var(--bw)*.2);top:calc(50% - var(--bw)*.6);margin-left:calc(var(--bw)*-.25);transition:transform .8s cubic-bezier(.3,.6,.4,1),opacity .8s}",
".cv-gift .bw::before,.cv-gift .bw::after{content:'';position:absolute;top:0;width:48%;height:100%;border:calc(var(--bw)*.045) solid var(--acc);border-radius:50% 50% 10% 50%}",
".cv-gift .bw::before{left:0;transform:rotate(-18deg)}.cv-gift .bw::after{right:0;transform:scaleX(-1) rotate(-18deg)}",
".cv.cl .cv-gift .bx{animation:cvsh 2.4s ease-in-out infinite}",
"@keyframes cvsh{0%,80%,100%{transform:none}84%{transform:rotate(-4deg)}88%{transform:rotate(4deg)}92%{transform:rotate(-3deg)}96%{transform:rotate(2deg)}}",
".cv.p1 .cv-gift .ld,.cv.p1 .cv-gift .bw{transform:translate(calc(var(--bw)*.6),calc(var(--sh)*-.6)) rotate(40deg);opacity:0}",
".cv.p2 .cv-gift .cv-card{transform:none;opacity:1}",
".cv.p2 .cv-gift .bx{transform:translateY(calc(var(--sh)*.7));opacity:0}",
/* занавес */
".cv-cur{position:absolute;top:0;bottom:0;width:52%;z-index:4;background:repeating-linear-gradient(90deg,rgba(0,0,0,.28) 0,rgba(255,255,255,.08) 4%,rgba(0,0,0,.28) 8%),var(--env);transition:transform 1.7s cubic-bezier(.6,0,.3,1);box-shadow:0 0 40px rgba(0,0,0,.5)}",
".cv-cur.l{left:0}.cv-cur.r{right:0}",
".cv-pel{position:absolute;left:0;right:0;top:0;height:9%;z-index:4;background:var(--env);filter:brightness(.7);border-bottom:4px solid var(--acc);transition:transform 1.2s .5s ease,opacity 1.2s .5s}",
".cv.p1 .cv-cur.l{transform:translateX(-102%)}.cv.p1 .cv-cur.r{transform:translateX(102%)}",
".cv.p1 .cv-pel{transform:translateY(-100%);opacity:0}",
/* хлопушка */
".cv-pop .cv-card{transform:scale(0) rotate(-12deg);transition:transform .9s cubic-bezier(.2,1.5,.4,1) .15s}",
".cv-pp{position:absolute;left:50%;top:50%;width:calc(var(--w)*.34);transform:translate(-50%,-50%);z-index:3;transition:transform .5s,opacity .5s;animation:cvpp 1.4s ease-in-out infinite}",
"@keyframes cvpp{50%{transform:translate(-50%,-50%) rotate(-8deg) scale(1.06)}}",
".cv.p1 .cv-pp{animation:none;transform:translate(-50%,-50%) scale(2);opacity:0}",
".cv.p1 .cv-pop .cv-card{transform:none}",
".cv-b{position:absolute;left:50%;top:50%;width:9px;height:13px;border-radius:2px;z-index:6;animation:cvbu 1.6s cubic-bezier(.1,.8,.3,1) forwards}",
"@keyframes cvbu{0%{transform:translate(-50%,-50%) scale(.3)}100%{transform:translate(var(--dx),var(--dy)) rotate(var(--r));opacity:0}}",
/* свиток */
".cv-scr{position:relative;width:var(--w)}",
".cv-scr .cv-card{border-radius:2px;clip-path:inset(50% 0 50% 0);transition:clip-path 1.6s cubic-bezier(.5,0,.3,1)}",
".cv-scr .rl{position:absolute;left:-4%;width:108%;height:calc(var(--w)*.06);border-radius:99px;z-index:3;background:linear-gradient(180deg,#7a4a26,#c8915c 40%,#6b3d1d);box-shadow:0 4px 10px rgba(0,0,0,.35);transition:transform 1.6s cubic-bezier(.5,0,.3,1)}",
".cv-scr .rl.t{top:calc(var(--w)*-.03);transform:translateY(calc(var(--ch)/2))}.cv-scr .rl.b{bottom:calc(var(--w)*-.03);transform:translateY(calc(var(--ch)/-2))}",
".cv.p1 .cv-scr .cv-card{clip-path:inset(0 0 0 0)}.cv.p1 .cv-scr .rl{transform:none}",
/* что летает */
".cv-p{position:absolute;top:-40px;animation:cvfa linear infinite}",
"@keyframes cvfa{to{transform:translate(var(--sx),calc(var(--H) + 80px)) rotate(var(--r))}}",
".cv-p.up{top:auto;bottom:-70px;animation-name:cvup}",
"@keyframes cvup{to{transform:translate(var(--sx),calc(var(--H) * -1 - 120px))}}",
".cv-p svg{display:block;width:100%;height:100%}",
".cv-bal{border-radius:50% 50% 48% 48%;position:relative}",
".cv-bal::after{content:'';position:absolute;left:50%;top:100%;width:1px;height:140%;background:rgba(255,255,255,.6)}",
"@media (prefers-reduced-motion:reduce){.cv-p{display:none}.cv *{transition-duration:.01s!important;animation:none!important}}"
].join("\n");

var THEMES={
  light:{ paper:"#fffaf3", ink:"#4b2a2a", acc:"#d2304f", env:"#e9536f" },
  cream:{ paper:"#fbf3e4", ink:"#4a3b2a", acc:"#a8743a", env:"#d9b98c" },
  dark:{ paper:"#16181f", ink:"#ece6da", acc:"#ffcf5c", env:"#2c3140" },
  navy:{ paper:"#12284a", ink:"#e6eefc", acc:"#9cc9ff", env:"#1f467c" },
  mint:{ paper:"#eefaf4", ink:"#1f3d33", acc:"#14876a", env:"#3fbf96" },
  red:{ paper:"#b3203d", ink:"#fff4f0", acc:"#ffd166", env:"#7a1028" },
  kraft:{ paper:"#e4cba0", ink:"#3b2a1a", acc:"#8a3b12", env:"#a87a4c" },
  lilac:{ paper:"#f6f0ff", ink:"#3a2c55", acc:"#7c4dff", env:"#a58bff" }
};
var FONTS={
  fest:{ h:"Lobster,'Brush Script MT',cursive", b:"Caveat,'Segoe Print',cursive", w:400, hs:1, bs:1.25 },
  hand:{ h:"Caveat,'Segoe Print',cursive", b:"Caveat,'Segoe Print',cursive", w:700, hs:1.15, bs:1.25 },
  strict:{ h:"'Playfair Display',Georgia,serif", b:"'Playfair Display',Georgia,serif", w:700, hs:.92, bs:.95 },
  modern:{ h:"Unbounded,Manrope,system-ui,sans-serif", b:"Manrope,system-ui,sans-serif", w:700, hs:.78, bs:.92 }
};
var FONTS_URL="https://fonts.bunny.net/css?family=lobster:400|caveat:600,700|playfair-display:400,700|unbounded:500,700|manrope:400,600,700,800&display=swap";
var HINT={ ru:["Нажмите, чтобы открыть","с музыкой"], en:["Tap to open","with music"], de:["Zum Öffnen tippen","mit Musik"], fr:["Touchez pour ouvrir","avec musique"], es:["Toca para abrir","con música"], it:["Tocca per aprire","con musica"], pl:["Dotknij, aby otworzyć","z muzyką"] };

/* мелодии, свободные от авторских прав: нота:длительность в долях */
var MEL={
  hb:{ bpm:120, n:"G4:.75 G4:.25 A4:1 G4:1 C5:1 B4:2 G4:.75 G4:.25 A4:1 G4:1 D5:1 C5:2 G4:.75 G4:.25 G5:1 E5:1 C5:1 B4:1 A4:2 F5:.75 F5:.25 E5:1 C5:1 D5:1 C5:3" },
  jb:{ bpm:168, n:"E5:1 E5:1 E5:2 E5:1 E5:1 E5:2 E5:1 G5:1 C5:1.5 D5:.5 E5:4 F5:1 F5:1 F5:1.5 F5:.5 F5:1 E5:1 E5:1 E5:.5 E5:.5 E5:1 D5:1 D5:1 E5:1 D5:2 G5:2 E5:1 E5:1 E5:2 E5:1 E5:1 E5:2 E5:1 G5:1 C5:1.5 D5:.5 E5:4 F5:1 F5:1 F5:1.5 F5:.5 F5:1 E5:1 E5:1 E5:.5 E5:.5 G5:1 G5:1 F5:1 D5:1 C5:4" },
  el:{ bpm:126, n:"C4:1 A4:1 A4:1 G4:1 A4:1 F4:1 C4:1 C4:1 C4:1 A4:1 A4:1 A#4:1 G4:1 C5:3 C5:1 D5:1 D5:1 A#4:1 A#4:1 A4:1 G4:1 F4:1 F4:1 A4:1 A4:1 G4:1 A4:1 F4:3" },
  od:{ bpm:116, n:"E4:1 E4:1 F4:1 G4:1 G4:1 F4:1 E4:1 D4:1 C4:1 C4:1 D4:1 E4:1 E4:1.5 D4:.5 D4:2 E4:1 E4:1 F4:1 G4:1 G4:1 F4:1 E4:1 D4:1 C4:1 C4:1 D4:1 E4:1 D4:1.5 C4:.5 C4:2" },
  wm:{ bpm:72, n:"C4:1 F4:.75 F4:.25 F4:2 C4:1 G4:.75 E4:.25 F4:2 C4:1 F4:.75 A#4:.25 A#4:1 A4:.75 G4:.25 F4:1 E4:.75 F4:.25 G4:2" },
  fe:{ bpm:132, n:"E5:.5 D#5:.5 E5:.5 D#5:.5 E5:.5 B4:.5 D5:.5 C5:.5 A4:1.5 C4:.5 E4:.5 A4:.5 B4:1.5 E4:.5 G#4:.5 B4:.5 C5:1.5 E4:.5 E5:.5 D#5:.5 E5:.5 D#5:.5 E5:.5 B4:.5 D5:.5 C5:.5 A4:1.5 C4:.5 E4:.5 A4:.5 B4:1.5 E4:.5 C5:.5 B4:.5 A4:2" },
  br:{ bpm:96, n:"E4:.5 E4:.5 G4:2 E4:.5 E4:.5 G4:2 E4:.5 G4:.5 C5:1 B4:1.5 A4:.5 A4:1 G4:1 D4:.5 E4:.5 F4:1 D4:1 D4:.5 E4:.5 F4:2 D4:.5 F4:.5 B4:.5 A4:.5 G4:1 B4:1 C5:3" }
};
function midiOf(s){ var m=/^([A-G])(#?)(\d)$/.exec(s), b={C:0,D:2,E:4,F:5,G:7,A:9,B:11}[m[1]]; return 12*(+m[3]+1)+b+(m[2]?1:0); }
function hz(m){ return 440*Math.pow(2,(m-69)/12); }
/* один звук мелодии */
function tone(a,out,f,t,d,inst){
  function o(type,fr,peak,dec,end){ var x=a.createOscillator(), g=a.createGain(); x.type=type; x.frequency.value=fr; g.gain.setValueAtTime(.0001,t); g.gain.exponentialRampToValueAtTime(peak,t+.006); g.gain.exponentialRampToValueAtTime(.0001,t+dec); x.connect(g); g.connect(out); x.start(t); x.stop(t+(end||dec)+.05); }
  if(inst==="piano"){ o("triangle",f,.3,Math.max(.5,d*1.4)); o("sine",f*2,.08,.4); o("sine",f*3,.03,.25); }
  else if(inst==="bells"){ o("sine",f,.24,2); o("sine",f*2.76,.07,1.1); o("sine",f*5.4,.03,.5); }
  else if(inst==="chip"){ var x=a.createOscillator(), g=a.createGain(), L=Math.max(.08,d*.9); x.type="square"; x.frequency.value=f; g.gain.setValueAtTime(.07,t); g.gain.setValueAtTime(.07,t+L-.02); g.gain.linearRampToValueAtTime(0,t+L); x.connect(g); g.connect(out); x.start(t); x.stop(t+L+.02); }
  else { o("sine",f*2,.2,1.3); o("sine",f*4,.06,.6); o("triangle",f*6.01,.02,.25); }
}
function Player(mus,src){ var a=null, m=null, tm=0, au=null, on=false, muted=false;
  function pass(at){ var M=MEL[mus.id]||MEL.hb, b=60/M.bpm/(mus.tempo||1), t=at;
    M.n.split(" ").forEach(function(x){ var p=x.split(":"), d=+p[1]*b; tone(a,m,hz(midiOf(p[0])),t,d,mus.inst||"box"); t+=d; });
    if(mus.loop!==false) tm=setTimeout(function(){ if(on) pass(t+b*2); },Math.max(200,(t-a.currentTime-.4)*1000)); }
  return {
    has:!!(mus&&((mus.k==="mel"&&MEL[mus.id])||(mus.k==="audio"&&src))),
    start:function(delay){ if(on||!this.has) return; on=true;
      if(mus.k==="audio"){ au=new Audio(src); au.loop=mus.loop!==false; au.muted=muted; setTimeout(function(){ if(on) au.play().catch(function(){}); },delay*1000); return; }
      try{ a=new (window.AudioContext||window.webkitAudioContext)(); }catch(e){ return; } m=a.createGain(); m.gain.value=muted?0:.9; m.connect(a.destination); pass(a.currentTime+delay+.05); },
    stop:function(){ on=false; clearTimeout(tm); if(au){ au.pause(); au=null; } if(a){ try{ a.close(); }catch(e){} a=null; } },
    mute:function(v){ muted=v; if(au) au.muted=v; if(m) m.gain.value=v?0:.9; }
  }; }

var SH={ heart:'<svg viewBox="0 0 24 24"><path d="M12 21s-7.5-4.6-9.6-9.2C.9 8.4 3 4.5 6.7 4.5c2.2 0 3.6 1.3 5.3 3.3 1.7-2 3.1-3.3 5.3-3.3 3.7 0 5.8 3.9 4.3 7.3C19.5 16.4 12 21 12 21z"/></svg>',
  star:'<svg viewBox="0 0 24 24"><path d="M12 2l2.9 6.6 7.1.6-5.4 4.7 1.6 7L12 17.3 5.8 20.9l1.6-7L2 9.2l7.1-.6z"/></svg>',
  popper:'<svg viewBox="0 0 64 64"><path d="M8 58l12-36 22 22z" style="fill:#ffcf5c"/><path d="M14 40l6-18 6 6zM11 49l3-9 12 12-9 3z" style="fill:#ff5fa2"/><circle cx="44" cy="14" r="3" style="fill:#4fd6c8"/><circle cx="54" cy="26" r="2.5" style="fill:#ff9a4d"/><circle cx="36" cy="8" r="2" style="fill:#7c4dff"/><path d="M40 24c4-6 10-6 14-2M30 18c0-6 4-10 10-10" style="stroke:#fff;stroke-width:2.5;fill:none;stroke-linecap:round"/></svg>',
  seal:'<svg viewBox="0 0 24 24"><path d="M12 21s-7.5-4.6-9.6-9.2C.9 8.4 3 4.5 6.7 4.5c2.2 0 3.6 1.3 5.3 3.3 1.7-2 3.1-3.3 5.3-3.3 3.7 0 5.8 3.9 4.3 7.3C19.5 16.4 12 21 12 21z"/></svg>' };
function esc(s){ return String(s==null?"":s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"); }
function css(){ if(document.getElementById("cv-css")) return; var s=document.createElement("style"); s.id="cv-css"; s.textContent=CSS; document.head.appendChild(s); }
function mount(root,D,opt){ css(); opt=opt||{}; root.innerHTML=""; var th=THEMES[D.theme]||THEMES.light, fo=FONTS[D.font]||FONTS.fest, kind=D.open||"env", L=HINT[D.lang]||HINT.ru;
  var cv=document.createElement("div"); cv.className="cv cl"; root.appendChild(cv);
  cv.style.backgroundImage=D.bgUrl?'url("'+D.bgUrl+'")':""; if(!D.bgUrl) cv.style.background=th.env;
  [["--paper",th.paper],["--ink",th.ink],["--acc",th.acc],["--env",th.env],["--fh",fo.h],["--fb",fo.b],["--fw",fo.w],["--hs",fo.hs],["--bs",fo.bs]].forEach(function(v){ cv.style.setProperty(v[0],v[1]); });
  var card='<div class="cv-card">'+(D.photoUrl?'<img alt="" src="'+esc(D.photoUrl)+'">':'')+(D.h?'<h2>'+esc(D.h)+'</h2>':'')+(D.p?'<p>'+esc(D.p)+'</p>':'')+(D.s?'<div class="cv-sig">'+esc(D.s)+'</div>':'')+'</div>';
  var st='<div class="cv-st">';
  if(kind==="env") st+='<div class="cv-env"><div class="bk"></div>'+card+'<div class="fr"></div><div class="fl"></div><div class="sl">'+SH.seal+'</div></div>';
  else if(kind==="book") st+='<div class="cv-book">'+card+'<div class="cov">'+SH.star+'</div></div>';
  else if(kind==="gift") st+='<div class="cv-gift">'+card+'<div class="bx"></div><div class="ld"></div><div class="bw"></div></div>';
  else if(kind==="pop") st+='<div class="cv-pop">'+card+'</div><div class="cv-pp">'+SH.popper+'</div>';
  else if(kind==="scroll") st+='<div class="cv-scr">'+card+'<div class="rl t"></div><div class="rl b"></div></div>';
  else st+=card;
  st+='</div>';
  cv.innerHTML='<div class="cv-fx"></div>'+st+(kind==="curtain"?'<div class="cv-cur l"></div><div class="cv-cur r"></div><div class="cv-pel"></div>':'')+
    '<div class="cv-hint">'+esc(L[0])+(D.mus&&D.mus.k!=="none"?'<small>'+esc(L[1])+'</small>':'')+'</div>'+
    '<button class="cv-snd" aria-label="sound"><svg class="on" viewBox="0 0 24 24"><path d="M4 9h4l5-4v14l-5-4H4zM16 9a4 4 0 010 6M18.5 6.5a8 8 0 010 11"/></svg><svg class="off" viewBox="0 0 24 24"><path d="M4 9h4l5-4v14l-5-4H4zM17 9l5 6M22 9l-5 6"/></svg></button>'+
    (opt.foot?'<div class="cv-ft"><a href="'+esc(opt.foot.href)+'" target="_blank" rel="noopener">'+esc(opt.foot.text)+'</a></div>':'');
  var pl=Player(D.mus,D.audioUrl), snd=cv.querySelector(".cv-snd"); if(pl.has) snd.classList.add("has");
  snd.onclick=function(e){ e.stopPropagation(); var m=!snd.classList.contains("mute"); snd.classList.toggle("mute",m); pl.mute(m); };
  var timers=[], state="closed";
  function T(fn,ms){ timers.push(setTimeout(fn,ms)); }
  /* размеры: ширина открытки от экрана, высота по содержимому (меряем заранее) */
  function layout(){ var W=cv.clientWidth, H=cv.clientHeight, w=Math.round(Math.min(W*.84,380,H*.66));
    cv.style.setProperty("--w",w+"px"); cv.style.setProperty("--sh",H+"px"); cv.style.setProperty("--H",H+"px"); cv.style.setProperty("--eh",Math.round(w*.64)+"px"); cv.style.setProperty("--bw",Math.round(w*.62)+"px");
    var c=cv.querySelector(".cv-card"), cw=kind==="env"?w*.9:w, cl=c.cloneNode(true); cl.style.cssText="position:absolute;visibility:hidden;left:0;top:0;height:auto;transform:none;width:"+cw+"px;clip-path:none;--cw:"+cw+"px;max-height:"+(H-24)+"px";
    cv.appendChild(cl); var ch=Math.min(H-24,cl.offsetHeight); cl.remove(); cv.style.setProperty("--ch",ch+"px");
    var eh=w*.64; cv.style.setProperty("--rise",(-(ch+6)+eh*.1)+"px"); cv.style.setProperty("--fin",(-(ch/2)+eh/2-6)+"px"); }
  layout();
  function fly(){ var fx=cv.querySelector(".cv-fx"), k=D.fly||"none"; if(k==="none") return; var cols=[th.acc,"#ffd166","#4fd6c8","#ff5fa2","#7c4dff","#ff9a4d"], n=k==="balloons"?12:k==="snow"?46:34, W=cv.clientWidth;
    for(var i=0;i<n;i++){ var e=document.createElement("div"), s, dur, c=cols[i%cols.length]; e.className="cv-p";
      if(k==="confetti"){ s=6+Math.random()*7; e.style.width=s+"px"; e.style.height=s*1.5+"px"; e.style.background=c; e.style.borderRadius="2px"; dur=3.5+Math.random()*3; }
      else if(k==="snow"){ s=3+Math.random()*7; e.style.width=e.style.height=s+"px"; e.style.borderRadius="50%"; e.style.background="#fff"; e.style.opacity=.55+Math.random()*.4; dur=6+Math.random()*6; e.style.filter=s<5?"blur(1px)":""; }
      else if(k==="hearts"||k==="stars"){ s=12+Math.random()*16; e.style.width=e.style.height=s+"px"; e.innerHTML=SH[k==="hearts"?"heart":"star"]; e.firstChild.style.fill=k==="stars"?(i%2?"#ffd166":"#fff"):c; dur=5+Math.random()*5; e.style.opacity=.85; }
      else { s=24+Math.random()*16; e.className="cv-p up"; e.innerHTML='<div class="cv-bal" style="width:'+s+'px;height:'+s*1.22+'px;background:radial-gradient(circle at 32% 28%,rgba(255,255,255,.55),transparent 32%),'+c+'"></div>'; dur=7+Math.random()*6; }
      e.style.left=(Math.random()*100)+"%"; e.style.setProperty("--sx",((Math.random()-.5)*W*.3)+"px"); e.style.setProperty("--r",((Math.random()-.5)*900)+"deg");
      e.style.animationDuration=dur+"s"; e.style.animationDelay=(-Math.random()*dur*(k==="balloons"?.4:1)+(k==="balloons"?1.5:0))+"s"; fx.appendChild(e); } }
  function burst(){ var cols=[th.acc,"#ffd166","#4fd6c8","#ff5fa2","#7c4dff","#ff9a4d"], W=cv.clientWidth;
    for(var i=0;i<70;i++){ var e=document.createElement("i"), a=Math.random()*Math.PI*2, r=W*(.25+Math.random()*.55); e.className="cv-b"; e.style.background=cols[i%6];
      e.style.setProperty("--dx","calc(-50% + "+Math.cos(a)*r+"px)"); e.style.setProperty("--dy","calc(-50% + "+(Math.sin(a)*r-W*.1)+"px)"); e.style.setProperty("--r",(Math.random()*720)+"deg"); cv.appendChild(e); (function(x){ setTimeout(function(){ x.remove(); },1800); })(e); } }
  function open(){ if(state!=="closed") return; state="opening"; layout(); cv.classList.remove("cl"); cv.classList.add("op","p1");
    var rv=1100, mus=.4;
    if(kind==="env"){ T(function(){ cv.classList.add("p2"); },700); T(function(){ cv.classList.add("p3"); },1800); rv=1500; mus=.6; }
    else if(kind==="gift"){ T(function(){ cv.classList.add("p2"); },550); rv=1200; }
    else if(kind==="pop"){ burst(); rv=600; mus=.1; }
    else if(kind==="curtain"){ rv=900; }
    else if(kind==="book"){ rv=900; }
    else if(kind==="scroll"){ rv=900; }
    else rv=200;
    T(function(){ cv.classList.add("rv"); fly(); },rv); T(function(){ cv.classList.add("done"); state="open"; },rv+1800);
    pl.start(mus); if(opt.onopen) opt.onopen(); }
  cv.addEventListener("click",function(){ if(state==="closed") open(); });
  if(opt.opened){ cv.classList.remove("cl"); cv.classList.add("op","p1","p2","p3","rv","done","still"); state="open"; fly(); }
  return { open:open, el:cv, relayout:layout, state:function(){ return state; },
    destroy:function(){ timers.forEach(clearTimeout); pl.stop(); root.innerHTML=""; } };
}
window.CARDVIEW={ mount:mount, THEMES:THEMES, FONTS:FONTS, MEL:MEL, FONTS_URL:FONTS_URL, tone:tone, midiOf:midiOf, hz:hz };
})();
