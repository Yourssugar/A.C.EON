/* FORGE игры по шаблонам: проигрыватель.
   Один файл без зависимостей: им играют в превью редактора, по ссылке и в скачанном .html (туда он вставляется целиком).
   GAMEVIEW.mount(корень, игра, настройки). Виды игры: quiz (викторина), memo (найди пары), quest (история с выбором), puzzle (пазл). */
(function(){
"use strict";
var CSS=[
".gv{position:relative;width:100%;height:100%;overflow:hidden;color:#fff;font-family:Manrope,system-ui,-apple-system,'Segoe UI',sans-serif;background:#222 center/cover no-repeat;-webkit-tap-highlight-color:transparent}",
".gv *{box-sizing:border-box}.gv svg{width:auto;height:auto;stroke:none}",
".gv button{font:inherit;color:inherit;background:none;border:0;cursor:pointer;margin:0}",
".gv::before{content:'';position:absolute;inset:0;background:rgba(0,0,0,var(--dim,0));pointer-events:none}",
".gv-in{position:relative;height:100%;max-width:520px;margin:0 auto;display:flex;flex-direction:column;padding:16px 18px 18px}",
".gv-top{display:flex;align-items:center;justify-content:space-between;gap:10px;font-size:12.5px;font-weight:700;min-height:26px;margin-bottom:8px}",
".gv-top b{font-family:Unbounded,Manrope,sans-serif;font-size:13px;letter-spacing:.02em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}",
".gv-top span{opacity:.85;white-space:nowrap}",
".gv-body{flex:1;min-height:0;display:flex;flex-direction:column}",
".gv-btn{display:inline-flex;align-items:center;justify-content:center;padding:13px 26px;border-radius:999px;background:#fff!important;color:#141414!important;font-weight:800!important;font-size:15px;box-shadow:0 10px 30px -10px rgba(0,0,0,.5)}",
".gv-start,.gv-fin{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;gap:12px;padding:10px}",
".gv-start h1{margin:0;font-family:Unbounded,Manrope,sans-serif;font-size:clamp(22px,7vw,30px);line-height:1.15;overflow-wrap:anywhere}",
".gv-start p,.gv-fin p{margin:0;opacity:.88;font-size:14.5px;line-height:1.5;max-width:34ch;white-space:pre-line}",
".gv-start small,.gv-fin small{opacity:.7;font-size:12.5px}",
".gv-fin .big{font-family:Unbounded,Manrope,sans-serif;font-size:clamp(38px,12vw,54px);line-height:1}",
".gv-kind{font-size:11px;letter-spacing:.14em;text-transform:uppercase;opacity:.7;font-weight:800}",
/* викторина */
".gv-dots{display:flex;gap:4px;margin-bottom:10px}.gv-dots i{flex:1;height:4px;border-radius:2px;background:rgba(255,255,255,.22)}.gv-dots i.d{background:#fff}.gv-dots i.ok{background:#3ddc97}.gv-dots i.no{background:#ff5d73}",
".gv-tm{height:6px;border-radius:3px;background:rgba(255,255,255,.18);overflow:hidden;margin-bottom:14px}.gv-tm i{display:block;height:100%;width:100%;background:#ffd166}",
".gv-img{flex:none;height:min(32%,210px);border-radius:16px;margin-bottom:14px;background:center/cover no-repeat rgba(0,0,0,.2)}",
".gv-q{font-family:Unbounded,Manrope,sans-serif;font-size:clamp(15px,4.6vw,19px);line-height:1.32;margin-bottom:14px;overflow-wrap:anywhere;white-space:pre-line}",
".gv-opts{display:grid;gap:8px;margin-top:auto}",
".gv-opts button{padding:13px 14px;border-radius:14px;background:rgba(255,255,255,.14);text-align:left;font-weight:700;font-size:14.5px;border:2px solid transparent;transition:background .2s;overflow-wrap:anywhere}",
".gv-opts button:hover{background:rgba(255,255,255,.22)}",
".gv-opts button.ok{background:#1fae74;border-color:#3ddc97}.gv-opts button.no{background:#c63950;border-color:#ff5d73}.gv-opts button.pick{border-color:#fff}",
".gv-inp{display:flex;gap:8px;margin-top:auto}.gv-inp input{flex:1;min-width:0;padding:13px 14px;border-radius:14px;border:2px solid rgba(255,255,255,.3);background:rgba(0,0,0,.2);color:#fff;font:inherit;font-size:16px}",
".gv-inp input::placeholder{color:rgba(255,255,255,.6)}",
".gv-say{margin-top:10px;text-align:center;font-weight:700;font-size:14px;min-height:20px}",
/* мемо */
".gv-mst{display:flex;justify-content:space-between;font-size:13px;font-weight:700;margin-bottom:10px;opacity:.92}",
".gv-mst .on{background:#fff;color:#141414;border-radius:999px;padding:1px 9px}",
".gv-grid{display:grid;gap:7px;margin:auto 0;perspective:700px}",
".gv-mc{position:relative;aspect-ratio:3/4;transform-style:preserve-3d;transition:transform .35s;cursor:pointer}",
".gv-mc.up,.gv-mc.done{transform:rotateY(180deg)}",
".gv-mc>div{position:absolute;inset:0;border-radius:10px;backface-visibility:hidden;-webkit-backface-visibility:hidden;display:grid;place-items:center;overflow:hidden}",
".gv-mc .bk{background:rgba(255,255,255,.16);box-shadow:inset 0 0 0 2px rgba(255,255,255,.22)}",
".gv-mc .bk::after{content:'?';font-family:Unbounded,Manrope,sans-serif;font-size:20px;opacity:.6}",
".gv-mc .fr{background:#fff center/cover no-repeat;color:#1d1d1d;transform:rotateY(180deg);font-weight:800;font-size:clamp(10px,3.2vw,14px);text-align:center;padding:4px;overflow-wrap:anywhere;line-height:1.15}",
".gv-mc .fr svg{width:66%;height:66%}",
".gv-mc.done .fr{box-shadow:0 0 0 3px #3ddc97}",
/* квест */
".gv-scn{flex:none;height:min(34%,230px);border-radius:16px;margin-bottom:12px;background:center/cover no-repeat;box-shadow:inset 0 -60px 60px -30px rgba(0,0,0,.45)}",
".gv-inv{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px;min-height:22px}.gv-inv span{font-size:11.5px;font-weight:700;padding:3px 9px;border-radius:999px;background:rgba(255,255,255,.18)}.gv-inv .no{opacity:.6;background:none;padding-left:0}",
".gv-story{font-size:15px;line-height:1.5;margin-bottom:12px;overflow:auto;white-space:pre-line;overflow-wrap:anywhere}.gv-story b{color:#ffd166}",
".gv-ch{display:grid;gap:8px;margin-top:auto}",
".gv-ch button{padding:12px 14px;border-radius:14px;background:rgba(255,255,255,.14);text-align:left;font-weight:700;font-size:14.5px;display:flex;gap:10px;align-items:center;overflow-wrap:anywhere}",
".gv-ch button::before{content:'\\203A';font-size:20px;color:#ffd166;flex:none}",
".gv-ch button.lock{opacity:.5}",
".gv-end{display:inline-block;padding:3px 10px;border-radius:999px;font-size:11.5px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;margin-bottom:8px}",
".gv-end.win{background:#3ddc97;color:#06231f}.gv-end.lose{background:#ff5d73;color:#2a0710}",
/* пазл */
".gv-pz{position:relative;display:grid;gap:2px;margin:auto 0;width:100%;aspect-ratio:1;border-radius:12px;overflow:hidden;background:rgba(0,0,0,.25);transition:gap .4s}",
".gv-pz.win{gap:0}",
".gv-pz div{background-repeat:no-repeat;cursor:pointer;transition:transform .18s,box-shadow .15s}",
".gv-pz div.sel{box-shadow:inset 0 0 0 4px #ffd166;transform:scale(.93)}",
".gv-pz div.empty{background:none!important;cursor:default}",
".gv-hint{width:72px;height:72px;border-radius:10px;background:center/cover;box-shadow:0 0 0 2px rgba(255,255,255,.5);flex:none}",
".gv-tip{text-align:center;font-size:12.5px;opacity:.82;margin-top:10px}",
"@media (prefers-reduced-motion:reduce){.gv *{transition:none!important}}"
].join("\n");

var THEMES={ violet:"linear-gradient(160deg,#3b2a8f,#c2368c)", sea:"linear-gradient(160deg,#0b4f6c,#1fae74)", night:"linear-gradient(160deg,#141820,#2c3140)", sunset:"linear-gradient(160deg,#ff8a3c,#c2368c)", sky:"linear-gradient(160deg,#16324f,#3b82f6)", forest:"linear-gradient(160deg,#10301f,#4c8b3f)" };
var SCN={ fire:"linear-gradient(160deg,#3a1d0e,#c4602b)", gold:"linear-gradient(160deg,#2b1408,#ffcf6e)", night:"linear-gradient(160deg,#10202e,#3b6b8a)", forest:"linear-gradient(160deg,#0f2a17,#5e9c4c)", violet:"linear-gradient(160deg,#1b1033,#a78bfa)", red:"linear-gradient(160deg,#2a0710,#e0435f)" };
/* значки для мемо: простые цветные фигуры */
var IC={ heart:["#ff5f7e",'<path d="M12 21s-7.5-4.6-9.6-9.2C.9 8.4 3 4.5 6.7 4.5c2.2 0 3.6 1.3 5.3 3.3 1.7-2 3.1-3.3 5.3-3.3 3.7 0 5.8 3.9 4.3 7.3C19.5 16.4 12 21 12 21z"/>'],
  star:["#ffc23d",'<path d="M12 2l2.9 6.6 7.1.6-5.4 4.7 1.6 7L12 17.3 5.8 20.9l1.6-7L2 9.2l7.1-.6z"/>'],
  sun:["#ff9a1f",'<circle cx="12" cy="12" r="5"/><path d="M11 1h2v4h-2zM11 19h2v4h-2zM1 11h4v2H1zM19 11h4v2h-4zM4.2 5.6l1.4-1.4 2.8 2.8L7 8.4zM16.9 18.3l1.4-1.4-2.8-2.8-1.4 1.4zM4.2 18.4l2.8-2.8 1.4 1.4-2.8 2.8zM15.6 7l2.8-2.8 1.4 1.4-2.8 2.8z"/>'],
  moon:["#6f7cff",'<path d="M20 15.5A8.5 8.5 0 018.5 4a8.5 8.5 0 1011.5 11.5z"/>'],
  tree:["#2fa65a",'<path d="M12 2l7 10h-4l5 6H4l5-6H5z"/><rect x="10.5" y="18" width="3" height="4" fill="#8a5a2b"/>'],
  fish:["#1fa2d6",'<path d="M2 12c3-5 9-6 13-3l5-4v14l-5-4c-4 3-10 2-13-3z"/><circle cx="7" cy="11" r="1.2" fill="#fff"/>'],
  house:["#e2553f",'<path d="M12 3l10 9h-3v9h-5v-6h-4v6H5v-9H2z"/>'],
  note:["#a35cff",'<path d="M9 3h12v4H13v10a4 4 0 11-4-4z"/>'],
  drop:["#2f8cff",'<path d="M12 2s7 8 7 13a7 7 0 01-14 0c0-5 7-13 7-13z"/>'],
  leaf:["#46b04a",'<path d="M20 4C9 4 4 9 4 16c0 1.5.3 2.8.8 4C8 13 12 10 17 8c-4 3-7 6-9 11 9 0 12-7 12-15z"/>'],
  flower:["#ff6fb5",'<circle cx="12" cy="6" r="4"/><circle cx="18" cy="12" r="4"/><circle cx="12" cy="18" r="4"/><circle cx="6" cy="12" r="4"/><circle cx="12" cy="12" r="3" fill="#ffd23d"/>'],
  bolt:["#ffb020",'<path d="M13 2L4 14h7l-1 8 9-12h-7z"/>'],
  cloud:["#7fb3ff",'<path d="M7 19a5 5 0 01-.6-10A6 6 0 0118 8.5 4.5 4.5 0 0118 19z"/>'],
  apple:["#e23b3b",'<path d="M12 7c-2-2-7-2-8 3s2 11 5 11c1 0 2-.6 3-.6s2 .6 3 .6c3 0 6-6 5-11s-6-5-8-3z"/><path d="M12 7c0-2 1-4 3-5" stroke="#5a3a1a" stroke-width="2" fill="none"/>'],
  key:["#d9a520",'<circle cx="7" cy="12" r="5"/><path d="M11 11h11v3h-2v3h-3v-3h-6z"/><circle cx="7" cy="12" r="2" fill="#fff"/>'],
  gem:["#19c3b1",'<path d="M6 3h12l4 6-10 13L2 9z"/>'] };
function icon(id){ var c=IC[id]; return c?'<svg viewBox="0 0 24 24" style="fill:'+c[0]+'">'+c[1]+'</svg>':''; }

var S={
 ru:{ play:"Играть", again:"Сыграть ещё", restart:"Начать заново", q:"вопрос", pts:"очки", res:"Ваш результат", best:"Лучший результат: {0}", tf:["Правда","Неправда"], inp:"Ваш ответ", ans:"Ответить", right:"Правильно!", wrong:"Ответ: {0}", time:"Время вышло", lose:"Можно лучше. Попробуете ещё?", moves:"ходы", pairs:"пары", sec:"время", p1:"Игрок 1", p2:"Игрок 2", turn:"Ходит {0}", draw:"Ничья!", wins:"Победил {0}!", allp:"Все пары найдены", empty:"сумка пуста", need:"нужно: {0}", got:"Получено: {0}", win:"победа", end:"конец", tipSwap:"нажмите два кусочка, чтобы поменять их местами", tipSlide:"двигайте кусочки на пустое место", tipRot:"нажимайте кусочки, чтобы повернуть", done:"Собрано!", kind:{quiz:"викторина",memo:"найди пары",quest:"квест",puzzle:"пазл"}, made:"Сделать свою игру" },
 en:{ play:"Play", again:"Play again", restart:"Start over", q:"question", pts:"score", res:"Your result", best:"Best result: {0}", tf:["True","False"], inp:"Your answer", ans:"Answer", right:"Correct!", wrong:"Answer: {0}", time:"Time's up", lose:"You can do better. Try again?", moves:"moves", pairs:"pairs", sec:"time", p1:"Player 1", p2:"Player 2", turn:"{0}'s turn", draw:"It's a draw!", wins:"{0} wins!", allp:"All pairs found", empty:"bag is empty", need:"needs: {0}", got:"You got: {0}", win:"win", end:"the end", tipSwap:"tap two pieces to swap them", tipSlide:"slide pieces into the empty spot", tipRot:"tap pieces to rotate them", done:"Solved!", kind:{quiz:"quiz",memo:"find the pairs",quest:"quest",puzzle:"puzzle"}, made:"Make your own game" },
 de:{ play:"Spielen", again:"Nochmal spielen", restart:"Von vorn", q:"Frage", pts:"Punkte", res:"Ihr Ergebnis", best:"Bestes Ergebnis: {0}", tf:["Wahr","Falsch"], inp:"Ihre Antwort", ans:"Antworten", right:"Richtig!", wrong:"Antwort: {0}", time:"Zeit ist um", lose:"Das geht besser. Nochmal?", moves:"Züge", pairs:"Paare", sec:"Zeit", p1:"Spieler 1", p2:"Spieler 2", turn:"{0} ist dran", draw:"Unentschieden!", wins:"{0} gewinnt!", allp:"Alle Paare gefunden", empty:"Tasche ist leer", need:"braucht: {0}", got:"Erhalten: {0}", win:"Sieg", end:"Ende", tipSwap:"zwei Teile antippen, um sie zu tauschen", tipSlide:"Teile auf das freie Feld schieben", tipRot:"Teile antippen, um sie zu drehen", done:"Gelöst!", kind:{quiz:"Quiz",memo:"Paare finden",quest:"Quest",puzzle:"Puzzle"}, made:"Eigenes Spiel machen" },
 fr:{ play:"Jouer", again:"Rejouer", restart:"Recommencer", q:"question", pts:"points", res:"Votre résultat", best:"Meilleur résultat : {0}", tf:["Vrai","Faux"], inp:"Votre réponse", ans:"Répondre", right:"Bonne réponse !", wrong:"Réponse : {0}", time:"Temps écoulé", lose:"Vous pouvez faire mieux. On réessaie ?", moves:"coups", pairs:"paires", sec:"temps", p1:"Joueur 1", p2:"Joueur 2", turn:"Au tour de {0}", draw:"Égalité !", wins:"{0} gagne !", allp:"Toutes les paires trouvées", empty:"sac vide", need:"il faut : {0}", got:"Obtenu : {0}", win:"victoire", end:"fin", tipSwap:"touchez deux pièces pour les échanger", tipSlide:"glissez les pièces vers la case vide", tipRot:"touchez les pièces pour les tourner", done:"Terminé !", kind:{quiz:"quiz",memo:"paires",quest:"quête",puzzle:"puzzle"}, made:"Créer votre jeu" },
 es:{ play:"Jugar", again:"Jugar otra vez", restart:"Empezar de nuevo", q:"pregunta", pts:"puntos", res:"Tu resultado", best:"Mejor resultado: {0}", tf:["Verdad","Mentira"], inp:"Tu respuesta", ans:"Responder", right:"¡Correcto!", wrong:"Respuesta: {0}", time:"Se acabó el tiempo", lose:"Se puede mejorar. ¿Otra vez?", moves:"jugadas", pairs:"parejas", sec:"tiempo", p1:"Jugador 1", p2:"Jugador 2", turn:"Turno de {0}", draw:"¡Empate!", wins:"¡Gana {0}!", allp:"Todas las parejas encontradas", empty:"bolsa vacía", need:"necesita: {0}", got:"Conseguido: {0}", win:"victoria", end:"fin", tipSwap:"toca dos piezas para cambiarlas", tipSlide:"desliza las piezas al hueco", tipRot:"toca las piezas para girarlas", done:"¡Resuelto!", kind:{quiz:"quiz",memo:"parejas",quest:"aventura",puzzle:"puzle"}, made:"Haz tu propio juego" },
 it:{ play:"Gioca", again:"Gioca ancora", restart:"Ricomincia", q:"domanda", pts:"punti", res:"Il tuo risultato", best:"Miglior risultato: {0}", tf:["Vero","Falso"], inp:"La tua risposta", ans:"Rispondi", right:"Giusto!", wrong:"Risposta: {0}", time:"Tempo scaduto", lose:"Puoi fare di meglio. Riprovi?", moves:"mosse", pairs:"coppie", sec:"tempo", p1:"Giocatore 1", p2:"Giocatore 2", turn:"Tocca a {0}", draw:"Pareggio!", wins:"Vince {0}!", allp:"Tutte le coppie trovate", empty:"borsa vuota", need:"serve: {0}", got:"Ottenuto: {0}", win:"vittoria", end:"fine", tipSwap:"tocca due pezzi per scambiarli", tipSlide:"fai scorrere i pezzi nello spazio vuoto", tipRot:"tocca i pezzi per ruotarli", done:"Risolto!", kind:{quiz:"quiz",memo:"trova le coppie",quest:"avventura",puzzle:"puzzle"}, made:"Crea il tuo gioco" },
 pl:{ play:"Graj", again:"Zagraj jeszcze", restart:"Od początku", q:"pytanie", pts:"punkty", res:"Twój wynik", best:"Najlepszy wynik: {0}", tf:["Prawda","Fałsz"], inp:"Twoja odpowiedź", ans:"Odpowiedz", right:"Dobrze!", wrong:"Odpowiedź: {0}", time:"Czas minął", lose:"Może być lepiej. Jeszcze raz?", moves:"ruchy", pairs:"pary", sec:"czas", p1:"Gracz 1", p2:"Gracz 2", turn:"Ruch: {0}", draw:"Remis!", wins:"Wygrywa {0}!", allp:"Wszystkie pary znalezione", empty:"torba pusta", need:"potrzeba: {0}", got:"Masz: {0}", win:"wygrana", end:"koniec", tipSwap:"dotknij dwóch kawałków, aby je zamienić", tipSlide:"przesuwaj kawałki na puste pole", tipRot:"dotykaj kawałków, aby je obrócić", done:"Ułożone!", kind:{quiz:"quiz",memo:"znajdź pary",quest:"przygoda",puzzle:"puzzle"}, made:"Zrób własną grę" } };
function fmt(s){ var a=arguments; return String(s).replace(/\{(\d)\}/g,function(m,i){ return a[+i+1]; }); }
function esc(s){ return String(s==null?"":s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"); }
function shuffle(a){ for(var i=a.length-1;i>0;i--){ var j=Math.floor(Math.random()*(i+1)), t=a[i]; a[i]=a[j]; a[j]=t; } return a; }
function norm(s){ return String(s||"").toLowerCase().replace(/ё/g,"е").replace(/[^\p{L}\p{N}]+/gu," ").trim(); }
function mmss(s){ s=Math.round(s); return Math.floor(s/60)+":"+String(s%60).padStart(2,"0"); }
function css(){ if(document.getElementById("gv-css")) return; var s=document.createElement("style"); s.id="gv-css"; s.textContent=CSS; document.head.appendChild(s); }
/* короткие звуки: синтез, без файлов */
var AC=null;
function snd(kind,on){ if(!on) return; try{ if(!AC) AC=new (window.AudioContext||window.webkitAudioContext)(); if(AC.state==="suspended") AC.resume(); var a=AC, t=a.currentTime+.01;
  var N={ ok:[[660,0],[880,.08]], no:[[260,0],[200,.1]], flip:[[520,0]], win:[[523,0],[659,.12],[784,.24],[1047,.36]], tap:[[700,0]] }[kind]||[];
  N.forEach(function(n){ var o=a.createOscillator(), g=a.createGain(); o.type=kind==="no"?"square":"sine"; o.frequency.value=n[0]; var s=t+n[1], v=kind==="no"?.05:kind==="flip"||kind==="tap"?.07:.16;
    g.gain.setValueAtTime(.0001,s); g.gain.exponentialRampToValueAtTime(v,s+.01); g.gain.exponentialRampToValueAtTime(.0001,s+(kind==="win"?.5:.18)); o.connect(g); g.connect(a.destination); o.start(s); o.stop(s+.6); }); }catch(e){} }
function bestKey(G){ var h=0, s=JSON.stringify([G.kind,G.title,G.quiz&&G.quiz.qs.length,G.memo&&G.memo.items.length,G.puzzle&&G.puzzle.n]); for(var i=0;i<s.length;i++) h=(h*31+s.charCodeAt(i))|0; return "forge-game-best:"+h; }
function getBest(G){ try{ var v=localStorage.getItem(bestKey(G)); return v==null?null:+v; }catch(e){ return null; } }
function setBest(G,v,lowIsBetter){ var b=getBest(G); if(b==null||(lowIsBetter?v<b:v>b)){ try{ localStorage.setItem(bestKey(G),String(v)); }catch(e){} return true; } return false; }

function mount(root,G,opt){ css(); opt=opt||{}; var L=S[G.lang]||S.ru, IMG=G.imgs||{}, timers=[], music=null, alive=true;
  root.innerHTML='<div class="gv"><div class="gv-in"><div class="gv-top"><b></b><span></span></div><div class="gv-body"></div></div></div>';
  var gv=root.firstChild, top=gv.querySelector(".gv-top"), body=gv.querySelector(".gv-body"), sound=G.sound!==false;
  if(G.bgUrl){ gv.style.backgroundImage='url("'+G.bgUrl+'")'; gv.style.setProperty("--dim",".25"); } else gv.style.background=THEMES[G.theme]||THEMES.violet;
  top.querySelector("b").textContent=G.title||"";
  function T(fn,ms){ var id=setTimeout(function(){ if(alive) fn(); },ms); timers.push(id); return id; }
  function clearT(){ timers.forEach(clearTimeout); timers=[]; }
  function stat(t){ top.querySelector("span").textContent=t||""; }
  function img(aid){ return aid&&IMG[aid]?IMG[aid]:""; }
  function startMusic(){ if(G.musicUrl&&!music){ try{ music=new Audio(G.musicUrl); music.loop=true; music.volume=.6; music.play().catch(function(){}); }catch(e){} } }
  function startScreen(){ clearT(); stat(""); var b=getBest(G), k=G.kind;
    body.innerHTML='<div class="gv-start"><div class="gv-kind">'+esc(L.kind[k]||"")+'</div><h1>'+esc(G.title||"")+'</h1>'+(G.intro?'<p>'+esc(G.intro)+'</p>':'')+'<button class="gv-btn">'+esc(L.play)+'</button>'+(b!=null?'<small>'+esc(fmt(L.best,k==="quiz"?b+" / "+(G.quiz.qs.length):k==="memo"&&G.memo.mode==="time"?mmss(b):b+" "+(k==="memo"||k==="puzzle"?L.moves:"")))+'</small>':'')+'</div>';
    body.querySelector(".gv-btn").onclick=function(){ snd("tap",sound); startMusic(); run(); }; }
  function finish(big,text,small,win){ clearT(); snd(win?"win":"flip",sound);
    body.innerHTML='<div class="gv-fin">'+(big!=null?'<div class="big">'+esc(big)+'</div>':'')+'<p>'+esc(text)+'</p>'+(small?'<small>'+esc(small)+'</small>':'')+'<button class="gv-btn">'+esc(L.again)+'</button></div>';
    body.querySelector(".gv-btn").onclick=function(){ snd("tap",sound); run(); }; }
  function run(){ clearT(); ({ quiz:quiz, memo:memo, quest:quest, puzzle:puzzle })[G.kind](); }

  /* ── викторина ── */
  function quiz(jump){ var Q=G.quiz, qs=Q.qs.filter(function(q){ return q&&(q.q||q.img); }), order=qs.map(function(q,i){ return i; }), qi=0, score=0, res=[];
    if(!qs.length){ body.innerHTML='<div class="gv-start"><p>…</p></div>'; return; }
    if(Q.shuffle&&jump==null) shuffle(order); if(jump!=null){ qi=Math.max(0,Math.min(qs.length-1,jump)); }
    function show(){ clearT(); if(qi>=qs.length){ var nb=setBest(G,score,false), pct=score/qs.length;
        finish(score+" / "+qs.length,pct>=.7?(G.win||L.right):L.lose,nb&&score>0?fmt(L.best,score+" / "+qs.length):"",pct>=.7); stat(""); return; }
      var q=qs[order[qi]], type=q.type||"4", opts, ok;
      if(type==="tf"){ opts=L.tf.map(function(t,i){ return [t,i===(q.ok||0)]; }); }
      else if(type==="input"){ opts=null; }
      else { opts=(q.a||[]).map(function(t,i){ return [t,i===(q.ok||0)]; }).filter(function(o){ return String(o[0]).trim(); }); if(Q.shuffle) shuffle(opts); }
      stat((qi+1)+" / "+qs.length+" · "+L.pts+" "+score);
      body.innerHTML='<div class="gv-dots">'+qs.map(function(_,i){ return '<i class="'+(res[i]===1?"ok":res[i]===0?"no":i===qi?"d":"")+'"></i>'; }).join("")+'</div>'+(Q.timer?'<div class="gv-tm"><i></i></div>':'')+
        (img(q.img)?'<div class="gv-img" style="background-image:url(\''+img(q.img)+'\')"></div>':'')+'<div class="gv-q">'+esc(q.q)+'</div>'+
        (opts?'<div class="gv-opts">'+opts.map(function(o,i){ return '<button data-i="'+i+'">'+esc(o[0])+'</button>'; }).join("")+'</div>':'<div class="gv-inp"><input type="text" placeholder="'+esc(L.inp)+'" enterkeyhint="done"><button class="gv-btn">'+esc(L.ans)+'</button></div>')+'<div class="gv-say"></div>';
      var done=false, say=body.querySelector(".gv-say");
      function result(good,pickEl){ if(done) return; done=true; if(good) score++; res[qi]=good?1:0; snd(good?"ok":"no",sound);
        if(opts){ var bs=body.querySelectorAll(".gv-opts button"); if(pickEl) pickEl.classList.add(good?"ok":"no"); if(!good&&Q.show!==false) opts.forEach(function(o,i){ if(o[1]) bs[i].classList.add("ok"); }); }
        else { say.textContent=good?L.right:(Q.show!==false?fmt(L.wrong,(q.a||[""])[0]):""); }
        var tb=body.querySelector(".gv-tm i"); if(tb){ tb.style.transition="none"; tb.style.width=getComputedStyle(tb).width; }
        stat((qi+1)+" / "+qs.length+" · "+L.pts+" "+score); T(function(){ qi++; show(); },opts?1200:1700); }
      if(opts) body.querySelectorAll(".gv-opts button").forEach(function(b){ b.onclick=function(){ result(opts[+b.dataset.i][1],b); }; });
      else { var inp=body.querySelector(".gv-inp input"), go=function(){ if(!inp.value.trim()) return; var v=norm(inp.value); result((q.a||[]).some(function(a){ return a&&norm(a)===v; }),null); inp.disabled=true; };
        body.querySelector(".gv-inp .gv-btn").onclick=go; inp.onkeydown=function(e){ if(e.key==="Enter") go(); }; if(!opt.preview) inp.focus(); }
      if(Q.timer){ var tb=body.querySelector(".gv-tm i"); requestAnimationFrame(function(){ requestAnimationFrame(function(){ tb.style.transition="width "+Q.timer+"s linear"; tb.style.width="0%"; }); });
        T(function(){ if(!done){ say.textContent=L.time; result(false,null); } },Q.timer*1000); } }
    show(); }

  /* ── мемо ── */
  function memo(){ var M=G.memo, items=M.items.filter(function(p){ return p&&(face(p.a)||(M.kind==="pair"&&face(p.b))); }).slice(0,M.size||18), cards=[];
    function face(x){ return x&&(x.img||x.ic||String(x.t||"").trim()); }
    items.forEach(function(p,i){ cards.push([i,p.a]); cards.push([i,M.kind==="pair"?p.b:p.a]); }); shuffle(cards);
    if(!cards.length){ body.innerHTML='<div class="gv-start"><p>…</p></div>'; return; }
    var n=cards.length, cols=n<=12?4:n<=16?4:n<=20?5:6, moves=0, found=0, open=[], two=M.mode==="two", pl=0, sc=[0,0], t0=Date.now();
    function hd(){ if(two) stat(""); else stat(M.mode==="time"?L.sec+" "+mmss((Date.now()-t0)/1000):L.moves+" "+moves); }
    body.innerHTML='<div class="gv-mst">'+(two?'<span class="a">'+esc(L.p1)+': 0</span><span class="b">'+esc(L.p2)+': 0</span>':'<span>'+esc(L.pairs)+': <b class="f">0</b> / '+items.length+'</span><span class="m"></span>')+'</div><div class="gv-grid" style="grid-template-columns:repeat('+cols+',1fr)">'+
      cards.map(function(c,i){ var x=c[1]||{}, u=img(x.img); return '<div class="gv-mc" data-k="'+c[0]+'"><div class="bk"></div><div class="fr"'+(u?' style="background-image:url(\''+u+'\')"':'')+'>'+(u?'':x.ic?icon(x.ic):esc(x.t))+'</div></div>'; }).join("")+'</div>';
    function turnUi(){ if(!two) return; var a=body.querySelector(".gv-mst .a"), b=body.querySelector(".gv-mst .b"); a.textContent=L.p1+": "+sc[0]; b.textContent=L.p2+": "+sc[1]; a.classList.toggle("on",pl===0); b.classList.toggle("on",pl===1); }
    turnUi(); hd(); if(M.mode==="time") timers.push(setInterval(function(){ if(alive) hd(); },500));
    body.querySelectorAll(".gv-mc").forEach(function(m){ m.onclick=function(){ if(open.length>=2||m.classList.contains("up")||m.classList.contains("done")) return; m.classList.add("up"); open.push(m); snd("flip",sound);
      if(open.length<2) return; moves++; hd(); var a=open[0], b=open[1];
      if(a.dataset.k===b.dataset.k){ T(function(){ a.classList.add("done"); b.classList.add("done"); open=[]; found++; sc[pl]++; snd("ok",sound); var f=body.querySelector(".gv-mst .f"); if(f) f.textContent=found; turnUi();
        if(found===items.length) T(function(){ var secs=Math.round((Date.now()-t0)/1000);
          if(two) finish(sc[0]+" : "+sc[1],sc[0]===sc[1]?L.draw:fmt(L.wins,sc[0]>sc[1]?L.p1:L.p2),"",true);
          else if(M.mode==="time"){ var nb=setBest(G,secs,true); finish(mmss(secs),G.win||L.allp,nb?fmt(L.best,mmss(secs)):"",true); }
          else { var nb2=setBest(G,moves,true); finish(moves,G.win||L.allp,L.moves+(nb2?" · "+fmt(L.best,moves):""),true); } },550); },300); }
      else T(function(){ snd("no",sound); a.classList.remove("up"); b.classList.remove("up"); open=[]; if(two){ pl=1-pl; turnUi(); } },850); }; }); }

  /* ── квест ── */
  function quest(jump){ var Qs=G.quest, map={}, inv=[]; (Qs.scenes||[]).forEach(function(s){ map[s.id]=s; });
    var first=(Qs.scenes||[])[0]; if(!first){ body.innerHTML='<div class="gv-start"><p>…</p></div>'; return; }
    function go(id,gotItem){ var s=map[id]||first; stat("");
      var u=img(s.img), bg=u?'url(\''+u+'\')':(SCN[s.bg]||SCN.fire);
      body.innerHTML='<div class="gv-scn" style="background-image:'+bg+'"></div><div class="gv-inv">'+(inv.length?inv.map(function(x){ return '<span>'+esc(x)+'</span>'; }).join(""):'<span class="no">'+esc(L.empty)+'</span>')+'</div>'+
        '<div class="gv-story">'+(s.end?'<span class="gv-end '+(s.end==="lose"?"lose":"win")+'">'+esc(s.end==="lose"?L.end:L.win)+'</span>\n':'')+(s.title?'<b>'+esc(s.title)+'.</b> ':'')+esc(s.text||"")+(gotItem?'\n\n<b>'+esc(fmt(L.got,gotItem))+'</b>':'')+'</div>'+
        '<div class="gv-ch">'+(s.end?'<button data-r="1">'+esc(L.restart)+'</button>':(s.choices||[]).filter(function(c){ return c&&String(c.t||"").trim(); }).map(function(c,i){ var lock=c.need&&inv.indexOf(c.need)<0; return '<button data-i="'+i+'" class="'+(lock?"lock":"")+'">'+esc(c.t)+(lock?' ('+esc(fmt(L.need,c.need))+')':'')+'</button>'; }).join(""))+'</div>';
      if(s.end) snd(s.end==="lose"?"no":"win",sound);
      var chs=(s.choices||[]).filter(function(c){ return c&&String(c.t||"").trim(); });
      body.querySelectorAll(".gv-ch button").forEach(function(b){ b.onclick=function(){ if(b.dataset.r){ snd("tap",sound); inv=[]; go(first.id); return; } var c=chs[+b.dataset.i];
        if(c.need&&inv.indexOf(c.need)<0){ snd("no",sound); return; } snd("tap",sound); var got=""; if(c.give&&inv.indexOf(c.give)<0){ inv.push(c.give); got=c.give; } go(c.to!=null&&map[c.to]?c.to:s.id,got); }; }); }
    go(jump!=null&&map[jump]?jump:first.id); }

  /* ── пазл ── */
  function puzzle(){ var P=G.puzzle, n=Math.max(3,Math.min(6,P.n||3)), u=P.src==="photo"&&img(P.img)?img(P.img):(G.puzzleUrl||G.bgUrl||""), N=n*n, mode=P.mode||"swap", moves=0, sel=-1, ord=[], rot=[];
    var bgImg=u?'url("'+u+'")':THEMES[G.theme]||THEMES.violet;
    if(mode==="slide"){ for(var i=0;i<N;i++) ord.push(i); var e=N-1, last=-1; for(var k=0;k<n*n*30;k++){ var r=Math.floor(e/n), c=e%n, nb=[]; if(r>0) nb.push(e-n); if(r<n-1) nb.push(e+n); if(c>0) nb.push(e-1); if(c<n-1) nb.push(e+1);
        nb=nb.filter(function(x){ return x!==last; }); var m=nb[Math.floor(Math.random()*nb.length)]; ord[e]=ord[m]; ord[m]=N-1; last=e; e=m; } }
    else if(mode==="rotate"){ for(var i2=0;i2<N;i2++){ ord.push(i2); rot.push([0,1,2,3][Math.floor(Math.random()*4)]); } if(rot.every(function(x){ return !x; })) rot[0]=1; }
    else { for(var i3=0;i3<N;i3++) ord.push(i3); do{ shuffle(ord); }while(ord.every(function(v,i){ return v===i; })); }
    function solved(){ return ord.every(function(v,i){ return v===i; })&&rot.every(function(x){ return !x; }); }
    function draw(){ stat(L.moves+" "+moves);
      body.innerHTML=(P.hint?'<div style="display:flex;justify-content:center;margin-bottom:8px"><div class="gv-hint" style="background-image:'+bgImg.replace(/"/g,"'")+'"></div></div>':'')+'<div class="gv-pz" style="grid-template-columns:repeat('+n+',1fr)">'+ord.map(function(v,i){
        if(mode==="slide"&&v===N-1&&!solved()) return '<div class="empty" data-i="'+i+'"></div>';
        var x=n>1?(v%n)/(n-1)*100:0, y=n>1?Math.floor(v/n)/(n-1)*100:0;
        return '<div data-i="'+i+'" class="'+(i===sel?"sel":"")+'" style="background-image:'+bgImg.replace(/"/g,"'")+';background-size:'+n*100+'% '+n*100+'%;background-position:'+x+'% '+y+'%'+(rot[i]?';transform:rotate('+rot[i]*90+'deg)':'')+'"></div>'; }).join("")+'</div><div class="gv-tip">'+esc(mode==="slide"?L.tipSlide:mode==="rotate"?L.tipRot:L.tipSwap)+'</div>';
      body.querySelectorAll(".gv-pz div").forEach(function(d){ d.onclick=function(){ var i=+d.dataset.i;
        if(mode==="rotate"){ rot[i]=(rot[i]+1)%4; moves++; snd("tap",sound); }
        else if(mode==="slide"){ var e2=ord.indexOf(N-1); if(Math.abs(e2-i)===n||(Math.abs(e2-i)===1&&Math.floor(e2/n)===Math.floor(i/n))){ ord[e2]=ord[i]; ord[i]=N-1; moves++; snd("tap",sound); } else return; }
        else { if(sel<0){ sel=i; snd("tap",sound); draw(); return; } if(sel!==i){ var t=ord[sel]; ord[sel]=ord[i]; ord[i]=t; moves++; snd("tap",sound); } sel=-1; }
        if(solved()){ sel=-1; draw(); body.querySelector(".gv-pz").classList.add("win"); body.querySelector(".gv-tip").textContent=L.done; var nb=setBest(G,moves,true);
          T(function(){ finish(moves,G.win||L.done,L.moves+(nb?" · "+fmt(L.best,moves):""),true); },1400); return; }
        draw(); }; }); }
    draw(); }

  if(opt.jump!=null&&(G.kind==="quiz"||G.kind==="quest")){ G.kind==="quiz"?quiz(opt.jump):quest(opt.jump); }
  else if(opt.skipStart) run(); else startScreen();
  if(opt.foot){ var f=document.createElement("a"); f.href=opt.foot.href; f.target="_blank"; f.rel="noopener"; f.textContent=opt.foot.text||L.made; f.style.cssText="position:absolute;left:50%;bottom:6px;transform:translateX(-50%);font-size:11.5px;font-weight:700;color:#fff;opacity:.65;text-decoration:none;white-space:nowrap"; gv.appendChild(f); }
  return { destroy:function(){ alive=false; clearT(); if(music){ music.pause(); music=null; } root.innerHTML=""; }, restart:startScreen }; }
window.GAMEVIEW={ mount:mount, THEMES:THEMES, SCN:SCN, IC:IC, icon:icon };
})();
