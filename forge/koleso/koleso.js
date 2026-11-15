/* FORGE колесо и жребий: колесо фортуны, бинго (ведущий и карточки для печати), жеребьёвка (команды, победители, очередь, тайный Санта),
   кубики и монетка. Набор = { kind: wheel / bingo / draw / dice, title, items (строки), set (настройки вида), hist, st (состояние: вышедшие шары, итог) }.
   Хранение: IndexedDB «forge-koleso», хранилище «sets». Ссылка: весь набор в адресе после #s=. Звуки синтезируются Web Audio, файлов нет. */
(function(){
"use strict";
var $=function(s,r){ return (r||document).querySelector(s); };
var $$=function(s,r){ return [].slice.call((r||document).querySelectorAll(s)); };
var wide=matchMedia("(min-width:960px)"), RM=matchMedia("(prefers-reduced-motion: reduce)").matches;
function el(html, fn){ var d=document.createElement("div"); d.innerHTML=html.trim(); var n=d.firstElementChild; if(fn) fn(n); return n; }
function sh(t){ return el('<div class="sh">'+esc(t)+'</div>'); }
function choice(label, opts, cur, fn){ return el('<div class="f">'+(label?'<label>'+esc(label)+'</label>':'')+'<div class="chips">'+opts.map(function(o){ return '<button data-v="'+o[0]+'" class="'+(String(o[0])===String(cur)?"on":"")+'">'+esc(o[1])+'</button>'; }).join("")+'</div></div>',function(n){
  $$("button",n).forEach(function(x){ x.onclick=function(){ $$("button",n).forEach(function(y){ y.classList.toggle("on",y===x); }); fn(x.getAttribute("data-v")); }; }); }); }
function range(label,v,min,max,step,unit,fn){ return el('<div class="f"><div class="lab"><span>'+esc(label)+'</span><output>'+v+unit+'</output></div><input type="range" min="'+min+'" max="'+max+'" step="'+step+'" value="'+v+'"></div>',function(n){
  var o=$("output",n), i=$("input",n); i.oninput=function(){ o.textContent=i.value+unit; fn(Number(i.value)); }; }); }
function toggle(label,v,fn){ return el('<label class="tg"><span>'+esc(label)+'</span><input type="checkbox"'+(v?" checked":"")+'></label>',function(n){ $("input",n).onchange=function(){ fn(this.checked); }; }); }
function rint(n){ return Math.floor(Math.random()*n); }
function shuffle(a){ a=a.slice(); for(var i=a.length-1;i>0;i--){ var j=rint(i+1), t=a[i]; a[i]=a[j]; a[j]=t; } return a; }

/* ─── иконки видов ─── */
var IC={
  wheel:'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 3v18M3 12h18M5.6 5.6l12.8 12.8M18.4 5.6L5.6 18.4"/><circle cx="12" cy="12" r="2"/></svg>',
  bingo:'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4.5"/><path d="M11 10.5l1.2-.8V14"/></svg>',
  draw:'<svg viewBox="0 0 24 24"><circle cx="7" cy="7" r="2.5"/><circle cx="17" cy="7" r="2.5"/><circle cx="7" cy="17" r="2.5"/><circle cx="17" cy="17" r="2.5"/><path d="M12 3v18"/></svg>',
  dice:'<svg viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="4"/><circle cx="9" cy="9" r="1" fill="currentColor"/><circle cx="15" cy="15" r="1" fill="currentColor"/><circle cx="15" cy="9" r="1" fill="currentColor"/><circle cx="9" cy="15" r="1" fill="currentColor"/></svg>'
};
var KINDS={
  wheel:{ name:"Колесо фортуны", desc:"Свой список, крутится с треском и конфетти. Можно убирать выпавшее.", items:true },
  bingo:{ name:"Бинго и лото", desc:"Ведущий тянет шары и читает их вслух. Карточки для игроков печатаются.", items:true },
  draw:{ name:"Жеребьёвка", desc:"Команды, победители, очередь выступлений, тайный Санта.", items:true },
  dice:{ name:"Кубики и монетка", desc:"От одного до шести кубиков, кубики на 4-20 граней, орёл или решка.", items:false }
};
var ORDER=["wheel","bingo","draw","dice"];
var PALS=[["Праздник",["#ff6a3d","#ffc15e","#4fd6c8","#7b5cff","#ff3d7f","#2d7ff9"]],["Неон",["#ff2bd6","#00f0ff","#7c3aed","#22ff88","#ffe14d","#ff7a45"]],
  ["Пастель",["#f9c6c9","#a9d3f0","#c7ecbd","#f8e3a1","#d9c6f5","#ffd6b0"]],["Кузня",["#ff8a3c","#5a1f0a","#ffcf6e","#2b2420","#4fd6c8","#8c4a2b"]],["Море",["#0fb5ae","#123c69","#7ee8d1","#2d7ff9","#e8f4f8","#0b3954"]]];

function defSet(kind){
  if(kind==="wheel") return { pal:0, remove:false, sec:6, confetti:true };
  if(kind==="bingo") return { mode:"75", voice:true, auto:false, every:6 };
  if(kind==="draw") return { mode:"teams", teams:2, pick:1 };
  return { count:2, sides:6, coin:false };
}
function newSet(kind, title, items, set){ var s={ v:1, kind:kind, title:title||TR(KINDS[kind].name), items:items||[], set:Object.assign(defSet(kind),set||{}), hist:[], st:{} }; return s; }
var TPLS=[
  { id:"dishes", kind:"wheel", name:"Кто моет посуду", items:["Мама","Папа","Аня","Миша","Бабушка"] },
  { id:"dinner", kind:"wheel", name:"Что на ужин", items:["Пицца","Суши","Паста","Бургеры","Плов","Салат","Шаурма","Блины"] },
  { id:"truth", kind:"wheel", name:"Правда или действие", items:["Правда","Действие","Правда","Действие","Выбирает сосед","Пропуск хода"], set:{pal:1} },
  { id:"prizes", kind:"wheel", name:"Призы розыгрыша", items:["Скидка 10%","Скидка 20%","Кофе в подарок","Десерт","Попробуй ещё","Главный приз"], set:{remove:true,pal:3} },
  { id:"yesno", kind:"wheel", name:"Да или нет", items:["Да","Нет","Да","Нет","Может быть","Спроси позже"], set:{pal:2} },
  { id:"b75", kind:"bingo", name:"Бинго 1-75", set:{mode:"75"} },
  { id:"b90", kind:"bingo", name:"Лото 1-90", set:{mode:"90"} },
  { id:"bwords", kind:"bingo", name:"Бинго слов: вечеринка", set:{mode:"words"}, items:["Тост","Танец","Селфи","Торт","Свечи","Подарок","Шарики","Песня","Обнимашки","Конфетти","Смех до слёз","Кто-то опоздал","Фото с именинником","Музыка громче","Тайный рецепт","Чокнулись","Пролили сок","Пицца","Сюрприз","Игра","Фокус","Анекдот","Комплимент","Хоровод","Новый друг","Аплодисменты"] },
  { id:"quiz", kind:"draw", name:"Команды на квиз", items:["Аня","Борис","Вика","Глеб","Даша","Егор","Женя","Зоя"], set:{mode:"teams",teams:2} },
  { id:"santa", kind:"draw", name:"Тайный Санта", items:["Аня","Борис","Вика","Глеб","Даша","Егор"], set:{mode:"santa"} },
  { id:"order", kind:"draw", name:"Порядок выступлений", items:["Группа 1","Группа 2","Группа 3","Группа 4","Группа 5"], set:{mode:"order"} },
  { id:"winner", kind:"draw", name:"Победитель конкурса", items:["Участник 1","Участник 2","Участник 3","Участник 4","Участник 5","Участник 6"], set:{mode:"pick",pick:1} },
  { id:"dice2", kind:"dice", name:"Два кубика", set:{count:2,sides:6} },
  { id:"coin", kind:"dice", name:"Орёл или решка", set:{coin:true} }
];
function fromTpl(id){ var t=TPLS.filter(function(x){ return x.id===id; })[0]||TPLS[0]; return newSet(t.kind,TR(t.name),(t.items||[]).map(function(x){ return TR(x); }),t.set); }

/* ═══════════ хранение ═══════════ */
var dbp=null;
function db(){ if(dbp) return dbp; dbp=new Promise(function(res,rej){ try{ var r=indexedDB.open("forge-koleso",1);
  r.onupgradeneeded=function(){ r.result.createObjectStore("sets",{keyPath:"id"}); }; r.onsuccess=function(){ res(r.result); }; r.onerror=function(){ rej(r.error); }; }catch(e){ rej(e); } }).catch(function(){ return null; }); return dbp; }
function dbAll(){ return db().then(function(d){ if(!d) return []; return new Promise(function(res){ var q=d.transaction("sets").objectStore("sets").getAll(); q.onsuccess=function(){ res(q.result||[]); }; q.onerror=function(){ res([]); }; }); }); }
function dbGet(id){ return db().then(function(d){ if(!d) return null; return new Promise(function(res){ var q=d.transaction("sets").objectStore("sets").get(id); q.onsuccess=function(){ res(q.result||null); }; q.onerror=function(){ res(null); }; }); }); }
function dbPut(b){ return db().then(function(d){ if(!d) throw new Error("nodb"); return new Promise(function(res,rej){ var t=d.transaction("sets","readwrite"); t.objectStore("sets").put(b); t.oncomplete=res; t.onerror=function(){ rej(t.error); }; }); }); }
function dbDel(id){ return db().then(function(d){ if(!d) return; return new Promise(function(res){ var t=d.transaction("sets","readwrite"); t.objectStore("sets").delete(id); t.oncomplete=res; t.onerror=res; }); }); }
function newId(){ return "k"+Date.now().toString(36)+Math.random().toString(36).slice(2,6); }
var S=null, ui={ tab:null, sheet:false, busy:false };
var saveT=0; function save(){ clearTimeout(saveT); saveT=setTimeout(function(){ if(!S) return; S.updated=Date.now(); dbPut(JSON.parse(JSON.stringify(S))).catch(function(){ toast(TR("Не получилось сохранить: память браузера заполнена")); }); },350); }
function items(){ return (S.items||[]).map(function(x){ return String(x).trim(); }).filter(Boolean); }
function addHist(t){ S.hist=S.hist||[]; S.hist.unshift(t); if(S.hist.length>30) S.hist.length=30; save(); }

/* ═══════════ звук: короткие синтезированные звуки ═══════════ */
var AC=null, mute=false; try{ mute=localStorage.getItem("forge_koleso_mute")==="1"; }catch(e){}
function ac(){ if(!AC){ try{ AC=new (window.AudioContext||window.webkitAudioContext)(); }catch(e){ return null; } } if(AC.state==="suspended") AC.resume(); return AC; }
function tone(f,dur,type,vol,when){ if(mute) return; var a=ac(); if(!a) return; var t=a.currentTime+(when||0), o=a.createOscillator(), g=a.createGain();
  o.type=type||"sine"; o.frequency.setValueAtTime(f,t); g.gain.setValueAtTime(vol||.2,t); g.gain.exponentialRampToValueAtTime(.0001,t+dur); o.connect(g); g.connect(a.destination); o.start(t); o.stop(t+dur+.02); }
function noise(dur,vol,hp){ if(mute) return; var a=ac(); if(!a) return; var n=Math.round(a.sampleRate*dur), b=a.createBuffer(1,n,a.sampleRate), d=b.getChannelData(0);
  for(var i=0;i<n;i++) d[i]=(Math.random()*2-1)*Math.pow(1-i/n,2); var s=a.createBufferSource(), f=a.createBiquadFilter(), g=a.createGain(); s.buffer=b; f.type="highpass"; f.frequency.value=hp||2000; g.gain.value=vol||.3; s.connect(f); f.connect(g); g.connect(a.destination); s.start(); }
var SND={ tick:function(){ noise(.025,.35,3000); tone(1800,.02,"square",.04); },
  win:function(){ [523,659,784,1047].forEach(function(f,i){ tone(f,.32,"triangle",.18,i*.09); }); tone(1568,.5,"sine",.06,.36); },
  ball:function(){ tone(420,.08,"sine",.2); tone(880,.18,"triangle",.12,.06); },
  rattle:function(){ for(var i=0;i<6;i++) setTimeout(function(){ noise(.04,.25,1200); },i*70); },
  coin:function(){ for(var i=0;i<5;i++) tone(2200+i*120,.06,"triangle",.08,i*.11); },
  shuffle:function(){ for(var i=0;i<8;i++) setTimeout(function(){ noise(.03,.15,2500); },i*60); } };
function muteBtn(){ $("#soundBtn").classList.toggle("mute",mute); }
$("#soundBtn").onclick=function(){ mute=!mute; try{ localStorage.setItem("forge_koleso_mute",mute?"1":"0"); }catch(e){} muteBtn(); if(!mute) SND.ball(); };
/* голос для бинго: системный синтез речи на языке сайта */
var VL={ru:"ru-RU",en:"en-US",de:"de-DE",fr:"fr-FR",es:"es-ES",it:"it-IT",pl:"pl-PL"};
function say(t){ if(mute||!window.speechSynthesis) return; try{ speechSynthesis.cancel(); var u=new SpeechSynthesisUtterance(String(t)); u.lang=VL[window.FLANG]||"ru-RU"; u.rate=.95; speechSynthesis.speak(u); }catch(e){} }

/* ═══════════ конфетти поверх сцены ═══════════ */
var fx=$("#fx"), fg=fx.getContext("2d"), parts=[], fxRaf=0;
function confetti(){ if(RM) return; var r=fx.getBoundingClientRect(), d=Math.min(2,devicePixelRatio||1); fx.width=r.width*d; fx.height=r.height*d; fg.setTransform(d,0,0,d,0,0);
  var cols=["#ff6a3d","#ffc15e","#4fd6c8","#7b5cff","#ff3d7f","#fff"];
  for(var i=0;i<140;i++){ var a=-Math.PI/2+(Math.random()-.5)*1.6, v=380+Math.random()*520; parts.push({ x:r.width/2, y:r.height*.55, vx:Math.cos(a)*v, vy:Math.sin(a)*v, w:6+Math.random()*7, h:4+Math.random()*5, r:Math.random()*6, vr:(Math.random()-.5)*14, c:cols[i%cols.length], life:0 }); }
  if(!fxRaf){ var last=performance.now(); (function step(now){ var dt=Math.min(.04,(now-last)/1000); last=now; fg.clearRect(0,0,r.width,r.height);
    parts.forEach(function(p){ p.life+=dt; p.vy+=900*dt; p.vx*=.99; p.x+=p.vx*dt; p.y+=p.vy*dt; p.r+=p.vr*dt; fg.save(); fg.translate(p.x,p.y); fg.rotate(p.r); fg.fillStyle=p.c; fg.globalAlpha=Math.max(0,1-p.life/2.6); fg.fillRect(-p.w/2,-p.h/2,p.w,p.h); fg.restore(); });
    parts=parts.filter(function(p){ return p.life<2.6&&p.y<r.height+40; }); if(parts.length) fxRaf=requestAnimationFrame(step); else { fxRaf=0; fg.clearRect(0,0,r.width,r.height); } })(last); }
}

/* ═══════════ сцена ═══════════ */
var view=$("#view");
function render(){ if(!S) return; view.innerHTML=""; ({ wheel:viewWheel, bingo:viewBingo, draw:viewDraw, dice:viewDice })[S.kind](); }
function histRow(){ if(!S.hist||!S.hist.length) return; view.appendChild(el('<div class="hist">'+S.hist.slice(0,12).map(function(h){ return '<span data-nt>'+esc(h)+'</span>'; }).join("")+'</div>')); }

/* ── колесо ── */
var W={ rot:0, spin:false, cv:null };
function viewWheel(){
  var it=items(), box=el('<div class="wheelw"><canvas></canvas><div class="res" hidden></div></div>'), cv=$("canvas",box); W.cv=cv;
  view.appendChild(box);
  view.appendChild(el('<div class="krow"><button class="big" id="spin">Крутить</button></div>'));
  if(it.length<2) view.appendChild(el('<p class="kmut">Добавьте в список хотя бы два варианта: вкладка «Список».</p>'));
  histRow();
  sizeWheel(); drawWheel(); $("#spin").disabled=it.length<2;
  $("#spin").onclick=spin; cv.onclick=function(){ if(!W.spin) spin(); };
}
function sizeWheel(){ var cv=W.cv; if(!cv) return; var r=view.getBoundingClientRect(), s=Math.max(200,Math.min(r.width-32,r.height-(S.hist&&S.hist.length?190:140),640)), d=Math.min(2,devicePixelRatio||1);
  cv.style.width=s+"px"; cv.style.height=s+"px"; cv.width=Math.round(s*d); cv.height=Math.round(s*d); }
function lum(h){ var n=parseInt(h.slice(1),16); return ((n>>16)&255)*.299+((n>>8)&255)*.587+(n&255)*.114; }
function drawWheel(){
  var cv=W.cv; if(!cv) return; var g=cv.getContext("2d"), S2=cv.width, R=S2/2-S2*.04, c=S2/2, it=items(), n=Math.max(1,it.length), a=Math.PI*2/n, pal=PALS[S.set.pal||0][1];
  g.clearRect(0,0,S2,S2);
  g.save(); g.translate(c,c);
  g.beginPath(); g.arc(0,0,R+S2*.022,0,Math.PI*2); g.fillStyle="#1b1712"; g.fill();
  for(var i=0;i<n;i++){ var a0=W.rot+i*a, col=it.length?pal[(i+(n%pal.length===1&&i===n-1?1:0))%pal.length]:"#2a3038";
    g.beginPath(); g.moveTo(0,0); g.arc(0,0,R,a0,a0+a); g.closePath(); g.fillStyle=col; g.fill(); g.strokeStyle="rgba(0,0,0,.18)"; g.lineWidth=S2*.003; g.stroke();
    if(!it.length) continue;
    g.save(); g.rotate(a0+a/2); var fs=Math.max(S2*.022,Math.min(S2*.05,a*R*.42)); g.font="800 "+fs+"px Manrope,system-ui,sans-serif"; g.textAlign="right"; g.textBaseline="middle";
    g.fillStyle=lum(col)>150?"#1a1208":"#fff"; var t=it[i], max=R*.74; while(g.measureText(t).width>max&&t.length>1) t=t.slice(0,-2)+"…"; g.fillText(t,R*.9,0); g.restore(); }
  for(var j=0;j<n;j++){ var aa=W.rot+j*a; g.beginPath(); g.arc(Math.cos(aa)*(R+S2*.011),Math.sin(aa)*(R+S2*.011),S2*.007,0,Math.PI*2); g.fillStyle="#ffd58a"; g.fill(); }
  g.beginPath(); g.arc(0,0,S2*.075,0,Math.PI*2); g.fillStyle="#1b1712"; g.fill(); g.beginPath(); g.arc(0,0,S2*.05,0,Math.PI*2);
  var gr=g.createRadialGradient(-S2*.015,-S2*.015,0,0,0,S2*.05); gr.addColorStop(0,"#ffe3a8"); gr.addColorStop(1,"#ff8a3c"); g.fillStyle=gr; g.fill();
  g.restore();
  /* указатель сверху, вздрагивает на каждом делении */
  g.save(); g.translate(c,S2*.035); g.rotate(W.flick||0); g.beginPath(); g.moveTo(-S2*.035,-S2*.02); g.lineTo(S2*.035,-S2*.02); g.lineTo(0,S2*.07); g.closePath();
  g.fillStyle="#fff"; g.shadowColor="rgba(0,0,0,.5)"; g.shadowBlur=S2*.015; g.fill(); g.restore();
}
function under(rot,n){ var a=Math.PI*2/n, x=((-Math.PI/2-rot)%(Math.PI*2)+Math.PI*2)%(Math.PI*2); return Math.floor(x/a); }
function spin(){
  var it=items(); if(W.spin||it.length<2) return; W.spin=true; $("#spin").disabled=true; $(".res",view).hidden=true; ac();
  var n=it.length, a=Math.PI*2/n, k=rint(n), f=.15+Math.random()*.7, target=-Math.PI/2-(k+f)*a;
  var cur=((W.rot%(Math.PI*2))+Math.PI*2)%(Math.PI*2), tgt=((target%(Math.PI*2))+Math.PI*2)%(Math.PI*2);
  var delta=((cur-tgt)%(Math.PI*2)+Math.PI*2)%(Math.PI*2), turns=RM?1:5+rint(3), dist=delta+turns*Math.PI*2, r0=W.rot, dur=(RM?1.2:S.set.sec||6)*1000, t0=performance.now(), last=under(r0,n);
  (function step(now){ var p=Math.min(1,(now-t0)/dur), e=1-Math.pow(1-p,4); W.rot=r0-dist*e;
    var u=under(W.rot,n); if(u!==last){ last=u; SND.tick(); W.flick=.35; } W.flick=(W.flick||0)*.8; drawWheel();
    if(p<1) requestAnimationFrame(step); else { W.spin=false; W.flick=0; drawWheel(); done(it[under(W.rot,n)]); } })(t0);
  function done(win){
    SND.win(); if(S.set.confetti!==false) confetti(); addHist(win);
    var res=$(".res",view); res.hidden=false;
    res.innerHTML='<div><small>Выпало</small><b data-nt>'+esc(win)+'</b><div class="krow"><button class="btn go" data-a="again">Ещё раз</button>'+(S.set.remove?'':'<button class="btn" data-a="rm">Убрать из колеса</button>')+'<button class="btn" data-a="ok">Закрыть</button></div></div>';
    if(S.set.remove){ removeItem(win); }
    $$("[data-a]",res).forEach(function(b){ b.onclick=function(e){ e.stopPropagation(); var x=b.getAttribute("data-a"); res.hidden=true;
      if(x==="rm"){ removeItem(win); render(); refresh(); } else if(x==="again"){ render(); setTimeout(spin,60); } else { render(); } }; });
  }
}
function removeItem(t){ var i=S.items.map(function(x){ return String(x).trim(); }).indexOf(t); if(i>=0){ S.items.splice(i,1); save(); if(ui.tab==="list") refreshPane(); } }

/* ── бинго ── */
var BT=0;
function bingoPool(){ var m=S.set.mode; if(m==="words") return items(); var n=m==="90"?90:75, a=[]; for(var i=1;i<=n;i++) a.push(String(i)); return a; }
function letter(n){ return "BINGO"[Math.min(4,Math.floor((+n-1)/15))]; }
function viewBingo(){
  var st=S.st.called||(S.st.called=[]), m=S.set.mode, pool=bingoPool(), last=st[st.length-1];
  var ball=el('<div class="ball'+(m==="words"?" word":"")+(BT?" roll":"")+'"><i></i>'+(last&&m==="75"?'<small>'+letter(last)+'</small>':'')+'<b data-nt>'+esc(last||"?")+'</b></div>'); BT=0;
  view.appendChild(ball);
  view.appendChild(el('<div class="kmut">'+esc(TR("Вышло {0} из {1}",st.length,pool.length))+'</div>'));
  view.appendChild(el('<div class="krow"><button class="big" id="next">'+esc(TR("Следующий шар"))+'</button><button class="btn" id="auto">'+esc(S.set.auto?TR("Стоп"):TR("Сам каждые {0} с",S.set.every))+'</button><button class="btn" id="reset">Заново</button></div>'));
  var b;
  if(m==="75"){ b=el('<div class="board" style="grid-template-columns:repeat(16,1fr)"></div>');
    for(var r=0;r<5;r++){ b.appendChild(el('<span class="l">'+"BINGO"[r]+'</span>')); for(var c=1;c<=15;c++){ var v=String(r*15+c); b.appendChild(el('<span class="'+(st.indexOf(v)>=0?"on":"")+(v===last?" last":"")+'">'+v+'</span>')); } } }
  else if(m==="90"){ b=el('<div class="board" style="grid-template-columns:repeat(10,1fr)"></div>'); for(var i=1;i<=90;i++){ var v2=String(i); b.appendChild(el('<span class="'+(st.indexOf(v2)>=0?"on":"")+(v2===last?" last":"")+'">'+i+'</span>')); } }
  else { b=el('<div class="board words"></div>'); pool.forEach(function(w){ b.appendChild(el('<span data-nt class="'+(st.indexOf(w)>=0?"on":"")+(w===last?" last":"")+'">'+esc(w)+'</span>')); }); }
  view.appendChild(b);
  if(m==="words"&&pool.length<5) view.appendChild(el('<p class="kmut">Добавьте слова во вкладке «Список», по одному в строке.</p>'));
  $("#next").disabled=st.length>=pool.length; $("#next").onclick=nextBall;
  $("#auto").onclick=function(){ S.set.auto=!S.set.auto; save(); autoRun(); render(); };
  $("#reset").onclick=function(){ ask(TR("Начать игру заново? Вышедшие шары вернутся в барабан."),TR("Заново")).then(function(y){ if(y){ S.st.called=[]; S.set.auto=false; autoRun(); save(); render(); } }); };
}
function nextBall(){ var st=S.st.called||(S.st.called=[]), left=bingoPool().filter(function(x){ return st.indexOf(x)<0; }); if(!left.length){ S.set.auto=false; autoRun(); return; }
  var v=left[rint(left.length)]; st.push(v); save(); BT=1; SND.ball(); if(S.set.voice!==false) say(S.set.mode==="75"?letter(v)+" "+v:v); render();
  if(st.length===bingoPool().length){ S.set.auto=false; autoRun(); } }
var autoT=0; function autoRun(){ clearInterval(autoT); if(S&&S.kind==="bingo"&&S.set.auto&&!$("#ed").hidden) autoT=setInterval(nextBall,(S.set.every||6)*1000); }

/* карточки для печати */
function cards75(n){ var out=[]; for(var k=0;k<n;k++){ var cols=[]; for(var c=0;c<5;c++){ var a=[]; for(var i=1;i<=15;i++) a.push(c*15+i); cols.push(shuffle(a).slice(0,5)); } cols[2][2]=null; out.push(cols); } return out; }
function cardsWords(n){ var w=bingoPool(), out=[]; for(var k=0;k<n;k++){ var s=shuffle(w), cols=[]; for(var c=0;c<5;c++){ var col=[]; for(var r=0;r<5;r++){ col.push(c===2&&r===2?null:(s.pop()||"")); } cols.push(col); } out.push(cols); } return out; }
/* билет лото 3x9: в каждой строке 5 чисел, в столбце числа своего десятка, по возрастанию сверху вниз */
function ticket90(){ for(var tries=0;tries<200;tries++){ var rows=[0,1,2].map(function(){ return shuffle([0,1,2,3,4,5,6,7,8]).slice(0,5); }), cnt=[0,0,0,0,0,0,0,0,0];
    rows.forEach(function(r){ r.forEach(function(c){ cnt[c]++; }); }); if(cnt.some(function(x){ return x===0; })) continue;
    var g=[[],[],[]], ok=true;
    for(var c=0;c<9;c++){ var lo=c===0?1:c*10, hi=c===8?90:c*10+9, nums=[]; for(var v=lo;v<=hi;v++) nums.push(v); var pick=shuffle(nums).slice(0,cnt[c]).sort(function(a,b){ return a-b; }), j=0;
      for(var r=0;r<3;r++) g[r][c]=rows[r].indexOf(c)>=0?pick[j++]:null; }
    if(ok) return g; } return null; }
function printCards(){
  var m=S.set.mode;
  modal('<h3>Карточки для игроков</h3><p class="note">Каждая карточка своя, повторов нет. Откроется окно печати: можно напечатать или сохранить в PDF.</p>'+
    '<div class="f"><label>Сколько карточек</label><input type="number" id="cN" min="1" max="60" value="10"></div><div class="f"><label>Заголовок на карточке</label><input type="text" id="cT" value="'+esc(S.title||"")+'"></div>'+
    (m==="words"&&bingoPool().length<24?'<p class="warn">'+esc(TR("Для карточки 5 x 5 нужно 24 слова, сейчас {0}. Пустые клетки останутся пустыми.",bingoPool().length))+'</p>':'')+
    '<div class="row"><button class="btn" data-close>Отмена</button><button class="btn go" id="cGo">Печать</button></div>');
  $("#cGo").onclick=function(){ var n=Math.max(1,Math.min(60,+$("#cN").value||10)), t=esc($("#cT").value||""), h="";
    if(m==="90"){ for(var k=0;k<n;k++){ var g=ticket90(); h+='<div class="pc lotto">'+(t?'<h4>'+t+'</h4>':'')+'<table>'+g.map(function(r){ return '<tr>'+r.map(function(v){ return '<td>'+(v||"")+'</td>'; }).join("")+'</tr>'; }).join("")+'</table><small>№ '+(k+1)+'</small></div>'; } }
    else { var cs=m==="words"?cardsWords(n):cards75(n);
      cs.forEach(function(cols,k){ h+='<div class="pc">'+(t?'<h4>'+t+'</h4>':'')+'<table>'+(m==="75"?'<tr>'+"BINGO".split("").map(function(L){ return '<th>'+L+'</th>'; }).join("")+'</tr>':'');
        for(var r=0;r<5;r++){ h+='<tr>'; for(var c=0;c<5;c++){ var v=cols[c][r]; h+=v===null?'<td class="free">'+esc(TR("свободно"))+'</td>':'<td'+(m==="words"?' class="w"':'')+'>'+esc(v)+'</td>'; } h+='</tr>'; }
        h+='</table><small>№ '+(k+1)+'</small></div>'; }); }
    $("#printArea").innerHTML=h; closeModal(); setTimeout(function(){ window.print(); },60); };
}

/* ── жеребьёвка ── */
var DR={ anim:false };
function viewDraw(){
  var it=items(), m=S.set.mode, r=S.st.res;
  var chips=el('<div class="chips2">'+it.map(function(x){ return '<span data-nt>'+esc(x)+'</span>'; }).join("")+'</div>');
  var label={ teams:TR("Разделить на команды"), pick:TR("Выбрать победителя"), order:TR("Перемешать очередь"), santa:TR("Раздать пары") }[m];
  if(!r||r.mode!==m||DR.anim){ view.appendChild(chips); }
  view.appendChild(el('<div class="krow"><button class="big" id="go">'+esc(label)+'</button></div>'));
  if(it.length<2) view.appendChild(el('<p class="kmut">Добавьте имена во вкладке «Список», по одному в строке.</p>'));
  $("#go").disabled=it.length<2||(m==="santa"&&it.length<3); $("#go").onclick=function(){ runDraw(chips); };
  if(r&&r.mode===m&&!DR.anim) showDraw(r);
}
function runDraw(chips){
  var it=items(); if(it.length<2) return; DR.anim=true; S.st.res=null; render(); chips=$(".chips2",view); SND.shuffle(); $("#go").disabled=true;
  var sp=$$("span",chips), t0=performance.now(), dur=RM?200:1300, lastI=-1;
  (function step(now){ var p=(now-t0)/dur; if(p<1){ var i=rint(sp.length); if(sp[lastI]) sp[lastI].classList.remove("hot"); if(sp[i]) sp[i].classList.add("hot"); lastI=i; setTimeout(function(){ requestAnimationFrame(step); },60+p*90); return; }
    DR.anim=false; finish(); })(t0);
  function finish(){
    var m=S.set.mode, sh2=shuffle(it), res={ mode:m };
    if(m==="teams"){ var n=Math.max(2,Math.min(it.length,S.set.teams||2)), g=[]; for(var i=0;i<n;i++) g.push([]); sh2.forEach(function(x,j){ g[j%n].push(x); }); res.groups=g; }
    else if(m==="pick"){ res.list=sh2.slice(0,Math.max(1,Math.min(it.length,S.set.pick||1))); addHist(res.list.join(", ")); }
    else if(m==="order"){ res.list=sh2; }
    else { /* тайный Санта: алгоритм Саттоло даёт один большой круг, никто не дарит сам себе */
      var a=it.slice(); for(var k=a.length-1;k>0;k--){ var j2=rint(k), tt=a[k]; a[k]=a[j2]; a[j2]=tt; }
      res.pairs=it.map(function(x,i3){ return [x,a[i3]]; }); res.seen=[]; }
    S.st.res=res; save(); SND.win(); if(m!=="santa") confetti(); render(); }
}
function showDraw(r){
  var box;
  if(r.mode==="teams"){ box=el('<div class="teams"></div>'); r.groups.forEach(function(g,i){ box.appendChild(el('<div class="team" style="animation-delay:'+(i*.08)+'s"><b>'+esc(TR("Команда {0}",i+1))+'</b><ol>'+g.map(function(x){ return '<li data-nt>'+esc(x)+'</li>'; }).join("")+'</ol></div>')); }); }
  else if(r.mode==="pick"){ box=el('<div class="teams"><div class="team" style="text-align:center"><b>'+esc(r.list.length>1?TR("Победители"):TR("Победитель"))+'</b><div data-nt style="font-family:Unbounded,var(--ui);font-size:clamp(22px,4vw,34px);line-height:1.3">'+r.list.map(esc).join("<br>")+'</div></div></div>'); }
  else if(r.mode==="order"){ box=el('<div class="teams"><div class="team"><b>'+esc(TR("Очередь"))+'</b><ol>'+r.list.map(function(x){ return '<li data-nt>'+esc(x)+'</li>'; }).join("")+'</ol></div></div>'); }
  else { box=el('<div style="display:flex;flex-direction:column;align-items:center;gap:10px;width:100%"><p class="kmut">Передавайте телефон по кругу: каждый нажимает на своё имя и видит, кому дарит подарок. Остальные не подглядывают.</p><div class="santa"></div></div>');
    r.pairs.forEach(function(p){ var b=el('<button data-nt class="'+(r.seen.indexOf(p[0])>=0?"done":"")+'">'+esc(p[0])+'</button>'); b.onclick=function(){ santaShow(p); }; $(".santa",box).appendChild(b); }); }
  view.appendChild(box);
  if(r.mode!=="santa") view.appendChild(el('<div class="krow"><button class="btn" id="copyRes">Скопировать итог</button></div>',function(n){ $("button",n).onclick=function(){ copyText(resText(r)).then(function(){ toast(TR("Скопировано")); }); }; }));
}
function resText(r){ if(r.mode==="teams") return r.groups.map(function(g,i){ return TR("Команда {0}",i+1)+": "+g.join(", "); }).join("\n"); if(r.mode==="pick") return r.list.join(", "); return r.list.map(function(x,i){ return (i+1)+". "+x; }).join("\n"); }
function santaShow(p){
  modal('<h3 data-nt>'+esc(p[0])+'</h3><p class="note">Нажмите, когда рядом никого нет.</p><div class="row"><button class="btn go" id="sOpen">Показать, кому я дарю</button></div><div id="sRes" hidden style="text-align:center;margin:16px 0"><small class="note">Вы дарите подарок:</small><div data-nt style="font-family:Unbounded,var(--ui);font-size:28px;margin-top:6px">'+esc(p[1])+'</div></div><div class="row"><button class="btn" id="sHide">Скрыть и передать дальше</button></div>');
  $("#sOpen").onclick=function(){ $("#sRes").hidden=false; $("#sOpen").parentNode.hidden=true; SND.ball(); var r=S.st.res; if(r.seen.indexOf(p[0])<0){ r.seen.push(p[0]); save(); } };
  $("#sHide").onclick=function(){ closeModal(); render(); };
}

/* ── кубики и монетка ── */
var DICE={ vals:null, rolling:false };
var PIPS={1:[4],2:[0,8],3:[0,4,8],4:[0,2,6,8],5:[0,2,4,6,8],6:[0,2,3,5,6,8]};
function dieHtml(v,sides,shake){ if(sides===6) return '<div class="die'+(shake?" shake":"")+'">'+[0,1,2,3,4,5,6,7,8].map(function(i){ return '<i class="'+(PIPS[v].indexOf(i)>=0?"v":"")+'"></i>'; }).join("")+'</div>';
  return '<div class="die num'+(shake?" shake":"")+'">'+v+'</div>'; }
function viewDice(){
  var s=S.set;
  if(s.coin){ var c=el('<div class="coin" id="coin"><div>'+esc(TR("Орёл"))+'</div><div>'+esc(TR("Решка"))+'</div></div>'); c.style.transform="rotateY("+(DICE.coinRot||0)+"deg)"; view.appendChild(c);
    view.appendChild(el('<div class="krow"><button class="big" id="roll">Подбросить</button></div>'));
    $("#roll").onclick=flip; histRow(); return; }
  var vals=DICE.vals||[]; while(vals.length<s.count) vals.push(1+rint(s.sides)); vals.length=s.count; DICE.vals=vals;
  view.appendChild(el('<div class="dice" id="dice">'+vals.map(function(v){ return dieHtml(v,s.sides,false); }).join("")+'</div>'));
  if(s.count>1) view.appendChild(el('<div class="total" id="tot">'+esc(TR("Сумма: {0}",vals.reduce(function(a,b){ return a+b; },0)))+'</div>'));
  view.appendChild(el('<div class="krow"><button class="big" id="roll">Бросить</button></div>'));
  $("#roll").onclick=roll; histRow();
}
function roll(){ if(DICE.rolling) return; DICE.rolling=true; SND.rattle(); var s=S.set, t0=performance.now(), dur=RM?100:900;
  (function step(now){ var fin=now-t0>=dur, v=[]; for(var i=0;i<s.count;i++) v.push(1+rint(s.sides));
    $("#dice").innerHTML=v.map(function(x){ return dieHtml(x,s.sides,!fin); }).join("");
    if(!fin){ setTimeout(function(){ requestAnimationFrame(step); },70); return; }
    DICE.rolling=false; DICE.vals=v; var sum=v.reduce(function(a,b){ return a+b; },0); if($("#tot")) $("#tot").textContent=TR("Сумма: {0}",sum);
    tone(660,.12,"triangle",.15); addHist(v.join(" + ")+(v.length>1?" = "+sum:"")); render(); })(t0); }
function flip(){ if(DICE.rolling) return; DICE.rolling=true; SND.coin(); var heads=Math.random()<.5, base=(DICE.coinRot||0), extra=1440+(heads?0:180), r=base-base%360+extra+(base%360?360:0);
  DICE.coinRot=r; $("#coin").style.transform="rotateY("+r+"deg)";
  setTimeout(function(){ DICE.rolling=false; var t=heads?TR("Орёл"):TR("Решка"); tone(880,.2,"triangle",.15); addHist(t); render(); },RM?100:1650); }

/* ═══════════ панели ═══════════ */
var pane=$("#pane"), insp=$("#insp"), right=$("#right");
var TT={ list:"Список", tpl:"Шаблоны", set:"Настройки", more:"Ещё" };
function tabBox(){ return wide.matches?pane:insp; }
function openTab(t){ if(t==="set"){ openInsp(); return; }
  ui.tab=t; $$("#tabs button").forEach(function(b){ b.classList.toggle("on",b.getAttribute("data-tab")===t); });
  if(!wide.matches){ ui.sheet="tab"; right.classList.add("open"); right.classList.remove("full","peek"); $("#shTitle").textContent=TR(TT[t]); }
  refreshPane(); tabBox().scrollTop=0; }
function openInsp(){ if(!wide.matches){ ui.sheet="insp"; right.classList.add("open"); right.classList.remove("full","peek"); $$("#tabs button").forEach(function(b){ b.classList.toggle("on",b.getAttribute("data-tab")==="set"); }); ui.tab=null; $("#shTitle").textContent=TR("Настройки"); }
  refreshInsp(); insp.scrollTop=0; }
function closeSheet(){ if(wide.matches) return; ui.sheet=false; ui.tab=null; right.classList.remove("open","full","peek"); $$("#tabs button").forEach(function(b){ b.classList.remove("on"); }); render(); }
$("#shClose").onclick=closeSheet;
$$("#tabs button").forEach(function(b){ b.onclick=function(){ var t=b.getAttribute("data-tab"); if(!wide.matches&&((ui.sheet==="tab"&&ui.tab===t)||(t==="set"&&ui.sheet==="insp"))) closeSheet(); else openTab(t); }; });
(function(){ var h=$(".sh-h"), y0=0, h0=0, on=false;
  h.addEventListener("pointerdown",function(e){ if(wide.matches||e.target.closest("button")) return; on=true; y0=e.clientY; h0=right.getBoundingClientRect().height; right.style.transition="none"; try{ h.setPointerCapture(e.pointerId); }catch(x){} });
  h.addEventListener("pointermove",function(e){ if(on) right.style.height=Math.max(80,h0-(e.clientY-y0))+"px"; });
  h.addEventListener("pointerup",function(e){ if(!on) return; on=false; right.style.transition=""; var nh=h0-(e.clientY-y0), vh=innerHeight; right.style.height=""; right.classList.remove("full","peek");
    if(nh<vh*.2) closeSheet(); else if(nh<vh*.42) right.classList.add("peek"); else if(nh>vh*.65) right.classList.add("full"); });
})();
wide.addEventListener("change",function(){ right.classList.remove("open"); ui.sheet=false; if(wide.matches) openTab(ui.tab&&ui.tab!=="set"?ui.tab:"list"); refreshInsp(); render(); });
function refresh(){ refreshPane(); refreshInsp(); }
function refreshPane(){ if(!ui.tab) return; if(!wide.matches&&ui.sheet!=="tab") return; var box=tabBox(), sc=box.scrollTop; box.innerHTML="";
  ({ list:paneList, tpl:paneTpl, more:paneMore })[ui.tab](box); box.scrollTop=sc; }

function paneList(box){
  if(!KINDS[S.kind].items||(S.kind==="bingo"&&S.set.mode!=="words")){
    box.appendChild(sh("Список"));
    box.appendChild(el('<p class="note">'+(S.kind==="bingo"?esc(TR("Числа берутся сами. Свой список слов: режим «Слова» в настройках.")):esc(TR("Здесь списка нет, всё настраивается в «Настройках».")))+'</p>'));
    return; }
  var lab={ wheel:TR("Варианты на колесе"), bingo:TR("Слова для бинго"), draw:TR("Имена участников") }[S.kind];
  box.appendChild(el('<div class="sh"><span>'+esc(lab)+'</span><span id="cnt"></span></div>'));
  var ta=el('<textarea class="ta" data-nt spellcheck="false" placeholder="'+esc(TR("По одному в строке"))+'"></textarea>'); ta.value=(S.items||[]).join("\n"); box.appendChild(ta);
  function cnt(){ $("#cnt",box).textContent=items().length; } cnt();
  var tT; ta.oninput=function(){ S.items=ta.value.split("\n"); cnt(); save(); clearTimeout(tT); tT=setTimeout(function(){ if(S.kind!=="draw"||!DR.anim){ if(S.kind==="draw") S.st.res=null; render(); } },250); };
  box.appendChild(el('<div class="row" style="margin-top:8px"><button class="btn" data-a="mix">Перемешать</button><button class="btn" data-a="clr">Очистить</button></div>',function(n){
    $("[data-a=mix]",n).onclick=function(){ S.items=shuffle(items()); ta.value=S.items.join("\n"); save(); render(); };
    $("[data-a=clr]",n).onclick=function(){ ask(TR("Очистить список?"),TR("Очистить")).then(function(y){ if(y){ S.items=[]; ta.value=""; cnt(); save(); render(); } }); }; }));
  box.appendChild(el('<p class="note" style="margin-top:10px">Каждая строка: отдельный вариант. Пустые строки не считаются.</p>'));
}
function paneTpl(box){
  box.appendChild(sh("Шаблоны"));
  var g=el('<div class="ktpls" style="grid-template-columns:1fr"></div>');
  TPLS.forEach(function(t){ var n=el('<button class="kt">'+IC[t.kind]+'<span><b>'+esc(t.name)+'</b><small>'+esc(KINDS[t.kind].name)+'</small></span></button>');
    n.onclick=function(){ var s=fromTpl(t.id); s.id=S.id; s.updated=S.updated; S=s; $("#title").value=S.title; DICE.vals=null; render(); refresh(); save(); toast(TR("Шаблон открыт")); }; g.appendChild(n); });
  box.appendChild(g);
}
function paneMore(box){
  box.appendChild(el('<div class="f"><label>Название</label><input type="text" maxlength="80"></div>',function(n){ var i=$("input",n); i.value=S.title||""; i.oninput=function(){ S.title=i.value; $("#title").value=i.value; save(); }; }));
  box.appendChild(sh("Показ"));
  box.appendChild(el('<button class="btn w">На весь экран<small>для праздника</small></button>',function(n){ n.onclick=showMode; }));
  box.appendChild(el('<button class="btn w">Поделиться ссылкой</button>',function(n){ n.onclick=linkDlg; }));
  if(S.kind==="bingo") box.appendChild(el('<button class="btn w">Карточки для печати<small>PDF</small></button>',function(n){ n.onclick=printCards; }));
  if(S.hist&&S.hist.length) box.appendChild(el('<button class="btn w">Очистить историю</button>',function(n){ n.onclick=function(){ S.hist=[]; save(); render(); refreshPane(); }; }));
  box.appendChild(sh("Набор"));
  box.appendChild(el('<button class="btn w">Сделать копию</button>',function(n){ n.onclick=function(){ var c=JSON.parse(JSON.stringify(S)); c.id=newId(); c.title=TR("{0} (копия)",S.title||""); c.updated=Date.now(); dbPut(c).then(function(){ openSet(c); toast(TR("Открыта копия")); }); }; }));
  box.appendChild(el('<button class="btn w del">Удалить набор</button>',function(n){ n.onclick=function(){ ask(TR("Удалить набор «{0}»? Вернуть его не получится.",S.title||""),TR("Удалить")).then(function(y){ if(y) dbDel(S.id).then(function(){ S=null; showHome(); }); }); }; }));
}
function refreshInsp(){
  if(!S) return; if(!wide.matches&&ui.sheet!=="insp") return; var sc=insp.scrollTop; insp.innerHTML=""; var s=S.set;
  if(wide.matches) $("#shTitle").textContent=TR(KINDS[S.kind].name);
  if(S.kind==="wheel"){
    insp.appendChild(sh("Цвета"));
    insp.appendChild(el('<div class="f pals2">'+PALS.map(function(p,i){ return '<button data-i="'+i+'" class="kpal'+(i===(s.pal||0)?" on":"")+'"><i>'+p[1].map(function(c){ return '<u style="background:'+c+'"></u>'; }).join("")+'</i>'+esc(p[0])+'</button>'; }).join("")+'</div>',function(n){
      $$("button",n).forEach(function(b){ b.onclick=function(){ s.pal=+b.getAttribute("data-i"); save(); drawWheel(); refreshInsp(); }; }); }));
    insp.appendChild(sh("Вращение"));
    insp.appendChild(range(TR("Сколько секунд крутится"),s.sec||6,2,12,1,"",function(v){ s.sec=v; save(); }));
    insp.appendChild(toggle(TR("Убирать выпавшее из колеса"),!!s.remove,function(v){ s.remove=v; save(); }));
    insp.appendChild(toggle(TR("Конфетти"),s.confetti!==false,function(v){ s.confetti=v; save(); }));
    insp.appendChild(el('<p class="note">Каждый вариант выпадает с одинаковым шансом, где бы ни остановилось колесо. Шанс считается до начала вращения.</p>'));
  }else if(S.kind==="bingo"){
    insp.appendChild(choice(TR("Что в барабане"),[["75",TR("бинго 1-75")],["90",TR("лото 1-90")],["words",TR("слова")]],s.mode,function(v){ if(v===s.mode) return; s.mode=v; S.st.called=[]; save(); render(); refresh(); }));
    insp.appendChild(toggle(TR("Читать вслух"),s.voice!==false,function(v){ s.voice=v; save(); }));
    insp.appendChild(range(TR("Автоматически: шар каждые, секунд"),s.every||6,3,20,1,"",function(v){ s.every=v; save(); autoRun(); }));
    insp.appendChild(el('<button class="btn w" style="margin-top:8px">Карточки для печати<small>PDF</small></button>',function(n){ n.onclick=printCards; }));
    insp.appendChild(el('<p class="note">Голос берётся из системы, на разных телефонах звучит по-разному. Без интернета тоже работает.</p>'));
  }else if(S.kind==="draw"){
    insp.appendChild(choice(TR("Что делаем"),[["teams",TR("команды")],["pick",TR("победители")],["order",TR("очередь")],["santa",TR("тайный Санта")]],s.mode,function(v){ s.mode=v; S.st.res=null; save(); render(); refreshInsp(); }));
    if(s.mode==="teams") insp.appendChild(range(TR("Сколько команд"),s.teams||2,2,12,1,"",function(v){ s.teams=v; S.st.res=null; save(); render(); }));
    if(s.mode==="pick") insp.appendChild(range(TR("Сколько победителей"),s.pick||1,1,20,1,"",function(v){ s.pick=v; S.st.res=null; save(); render(); }));
    if(s.mode==="santa") insp.appendChild(el('<p class="note">Каждый дарит подарок одному человеку и получает от другого. Никто не вытянет сам себя. Нужно хотя бы три участника.</p>'));
  }else{
    insp.appendChild(toggle(TR("Монетка вместо кубиков"),!!s.coin,function(v){ s.coin=v; DICE.vals=null; save(); render(); refreshInsp(); }));
    if(!s.coin){ insp.appendChild(range(TR("Сколько кубиков"),s.count||2,1,6,1,"",function(v){ s.count=v; DICE.vals=null; save(); render(); }));
      insp.appendChild(choice(TR("Граней у кубика"),[[4,"4"],[6,"6"],[8,"8"],[10,"10"],[12,"12"],[20,"20"]],s.sides,function(v){ s.sides=+v; DICE.vals=null; save(); render(); })); }
  }
  insp.scrollTop=sc;
}

/* ═══════════ показ, ссылка, окна ═══════════ */
function showMode(){ document.body.classList.add("show"); var e=document.documentElement; if(e.requestFullscreen) e.requestFullscreen().catch(function(){}); setTimeout(render,120); }
function exitShow(){ document.body.classList.remove("show"); if(document.fullscreenElement&&document.exitFullscreen) document.exitFullscreen().catch(function(){}); setTimeout(render,120); }
$("#fullBtn").onclick=showMode; $("#fullClose").onclick=exitShow;
document.addEventListener("fullscreenchange",function(){ if(!document.fullscreenElement&&document.body.classList.contains("show")){ document.body.classList.remove("show"); setTimeout(render,120); } });
function b64e(s){ return btoa(unescape(encodeURIComponent(s))).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,""); }
function b64d(s){ s=s.replace(/-/g,"+").replace(/_/g,"/"); while(s.length%4) s+="="; return decodeURIComponent(escape(atob(s))); }
function linkDlg(){
  var url=location.origin+location.pathname+"#s="+b64e(JSON.stringify({ k:S.kind, t:S.title, i:items(), s:S.set }));
  modal('<h3>Ссылка на набор</h3><p class="note">Список и настройки лежат в самой ссылке, на сервер ничего не уходит. Тайные пары Санты в ссылку не попадают.</p><div class="link" data-nt>'+esc(url)+'</div>'+
    '<div class="row"><button class="btn" data-close>Закрыть</button>'+(navigator.share?'<button class="btn" id="lnS">Поделиться</button>':'')+'<button class="btn go" id="lnC">Скопировать</button></div>');
  $("#lnC").onclick=function(){ copyText(url).then(function(){ toast(TR("Ссылка скопирована")); }); };
  if($("#lnS")) $("#lnS").onclick=function(){ navigator.share({title:S.title,url:url}).catch(function(){}); };
}
$("#shareBtn").onclick=linkDlg;
function copyText(t){ if(navigator.clipboard) return navigator.clipboard.writeText(t).catch(fb); return Promise.resolve(fb());
  function fb(){ var x=document.createElement("textarea"); x.value=t; document.body.appendChild(x); x.select(); try{ document.execCommand("copy"); }catch(e){} x.remove(); } }
function modal(h){ $("#mbox").innerHTML=h; $("#modal").classList.add("on"); }
function closeModal(){ $("#modal").classList.remove("on"); }
$("#modal").addEventListener("click",function(e){ if(e.target.id==="modal"||e.target.hasAttribute("data-close")) closeModal(); });
function ask(text,ok){ return new Promise(function(res){ modal('<h3>'+esc(text)+'</h3><div class="row"><button class="btn" data-n>Отмена</button><button class="btn go" data-y>'+esc(ok)+'</button></div>');
  $("#mbox [data-n]").onclick=function(){ closeModal(); res(false); }; $("#mbox [data-y]").onclick=function(){ closeModal(); res(true); }; }); }
var tT2=0; function toast(t){ var e=$("#toast"); e.textContent=t; e.classList.add("on"); clearTimeout(tT2); tT2=setTimeout(function(){ e.classList.remove("on"); },2600); }
addEventListener("keydown",function(e){
  if($("#ed").hidden) return; if($("#modal").classList.contains("on")){ if(e.key==="Escape") closeModal(); return; }
  if(e.key==="Escape"&&document.body.classList.contains("show")){ exitShow(); return; }
  if(/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) return;
  if(e.key===" "||e.key==="Enter"){ var b=$("#spin")||$("#next")||$("#go")||$("#roll"); if(b&&!b.disabled){ e.preventDefault(); b.click(); } }
});
$("#title").addEventListener("input",function(){ S.title=this.value; save(); });
addEventListener("resize",function(){ if(S&&S.kind==="wheel"&&!$("#ed").hidden){ sizeWheel(); drawWheel(); } });

/* ═══════════ мои наборы ═══════════ */
function showHome(){
  clearInterval(autoT); exitShow();
  $("#ed").hidden=true; $("#home").hidden=false; document.title=TR("FORGE · колесо и жребий");
  try{ history.replaceState(null,"",location.pathname); }catch(e){}
  dbAll().then(function(list){ list.sort(function(a,b){ return (b.updated||0)-(a.updated||0); });
    var my=$("#mySets"); my.innerHTML="";
    if(!list.length) my.appendChild(el('<p class="note">Здесь появятся ваши наборы. Начните с вида или шаблона ниже.</p>'));
    list.forEach(function(s){ var d=new Date(s.updated||Date.now()), when=d.toLocaleDateString(window.FLANG||"ru",{day:"numeric",month:"short"});
      var n=el('<div class="kset"><button class="th">'+(IC[s.kind]||"")+'</button><b data-nt>'+esc(s.title||"")+'</b><small>'+when+', '+esc(TR(KINDS[s.kind].name).toLowerCase())+'</small><div class="acts"><button data-a="copy">копия</button><button data-a="del">удалить</button></div></div>');
      $(".th svg",n)&&($(".th svg",n).style.cssText="width:40px;height:40px;color:var(--run)");
      $(".th",n).onclick=function(){ openSet(s); };
      $$(".acts button",n).forEach(function(x){ x.onclick=function(){ if(x.getAttribute("data-a")==="copy"){ var c=JSON.parse(JSON.stringify(s)); c.id=newId(); c.title=TR("{0} (копия)",s.title||""); c.updated=Date.now(); dbPut(c).then(showHome); }
        else ask(TR("Удалить набор «{0}»?",s.title||""),TR("Удалить")).then(function(y){ if(y) dbDel(s.id).then(showHome); }); }; });
      my.appendChild(n); }); });
  var kh=$("#kindsHome"); kh.innerHTML="";
  ORDER.forEach(function(k){ var n=el('<button class="kk">'+IC[k]+'<b>'+esc(KINDS[k].name)+'</b><small>'+esc(KINDS[k].desc)+'</small></button>'); $("svg",n).style.cssText="width:30px;height:30px;color:var(--run)";
    n.onclick=function(){ var t=TPLS.filter(function(x){ return x.kind===k; })[0]; create(fromTpl(t.id)); }; kh.appendChild(n); });
  var th=$("#tplHome"); th.innerHTML="";
  TPLS.forEach(function(t){ var n=el('<button class="kt">'+IC[t.kind]+'<span><b>'+esc(t.name)+'</b><small>'+esc(KINDS[t.kind].name)+'</small></span></button>'); $("svg",n).style.cssText="width:26px;height:26px;color:var(--run);flex:none"; n.onclick=function(){ create(fromTpl(t.id)); }; th.appendChild(n); });
}
function create(s){ s.id=newId(); s.updated=Date.now(); dbPut(s).then(function(){ openSet(s); }).catch(function(){ openSet(s); }); }
function openSet(s){
  S=s; S.st=S.st||{}; S.set=Object.assign(defSet(S.kind),S.set||{}); S.set.auto=false; DICE.vals=null; DR.anim=false; W.rot=0;
  $("#home").hidden=true; $("#ed").hidden=false; document.title="FORGE · "+(S.title||""); $("#title").value=S.title||""; muteBtn();
  try{ history.replaceState(null,"",location.pathname+"#"+S.id); }catch(e){}
  if(wide.matches){ openTab("list"); refreshInsp(); } else closeSheet();
  requestAnimationFrame(render);
}
$("#toHome").onclick=function(){ save(); setTimeout(showHome,380); };

function boot(){ var h=location.hash.slice(1);
  if(/^s=/.test(h)){ try{ var o=JSON.parse(b64d(h.slice(2))); if(!KINDS[o.k]) throw 0; create(newSet(o.k,o.t,o.i||[],o.s)); setTimeout(function(){ toast(TR("Это ваша копия набора")); },400); }catch(e){ showHome(); toast(TR("Ссылка повреждена")); } return; }
  if(/^tpl=/.test(h)){ var tid=decodeURIComponent(h.slice(4)); if(TPLS.some(function(t){ return t.id===tid; })){ create(fromTpl(tid)); return; } }
  if(h) dbGet(h).then(function(s){ if(s) openSet(s); else showHome(); }); else showHome(); }
boot();
/* ссылка или шаблон, открытые на уже загруженной странице */
addEventListener("hashchange",function(){ if(/^#(s|tpl)=/.test(location.hash)) boot(); });
})();
