/* =========================================================
   БРЕШЬ // CyberEngine — shared course runtime
   A data-driven story engine. Each course provides levels;
   the engine renders story beats, the target sim, the
   workbench (blocks / typing / real code editor), tracks
   progression, and either EXECUTES player code or VALIDATES
   it depending on what's feasible.

   Public API:  CyberEngine.boot(course)
   All "attacks" run against a fake in-page model. No real exploits.
   ========================================================= */
window.CyberEngine = (function(){
'use strict';
const $=s=>document.querySelector(s);
const el=(t,c,x)=>{const e=document.createElement(t);if(c)e.className=c;if(x!=null)e.textContent=x;return e;};
const esc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
const SENT='__pw_'+Math.random().toString(36).slice(2)+'__'; // password the attacker cannot know

/* ---- persistence (guarded; works on GitHub Pages / local) ---- */
const store={
  get(k,d){try{const v=localStorage.getItem(k);return v==null?d:JSON.parse(v);}catch(e){return d;}},
  set(k,v){try{localStorage.setItem(k,JSON.stringify(v));}catch(e){}},
};

/* =========================================================
   SQL SIMULATION — genuinely evaluates the WHERE boolean
   ========================================================= */
function applyFilters(input, f){
  f=f||{};
  let work=input, blocked=null;
  if(f.blockUpperOR && /OR/.test(input)) blocked={note:f.orNote||'WAF: обнаружено ключевое слово OR (верхний регистр) — запрос отклонён.'};
  if(!blocked && f.blockQuote && /'/.test(input)) blocked={note:f.quoteNote||'WAF: одинарная кавычка запрещена — запрос отклонён.'};
  if(!blocked && f.stripComments) work=work.replace(/(--|#).*$/,'').replace(/\/\*[\s\S]*?\*\//g,'');
  return {work, blocked};
}
/* evaluate a reconstructed WHERE condition to true/false/error */
function evalCond(cond){
  const ci=cond.search(/--|#/); if(ci>=0) cond=cond.slice(0,ci);           // SQL line comment
  if(((cond.match(/'/g)||[]).length)%2!==0) return 'error';                 // unterminated string
  cond=cond.replace(/login\s*=\s*'([^']*)'/gi,(m,v)=>v==='admin'?'T':'F');  // target row = admin
  cond=cond.replace(/pass\s*=\s*'([^']*)'/gi,'F');                          // attacker can't know pass
  cond=cond.replace(/'([^']*)'\s*=\s*'([^']*)'/g,(m,a,b)=>a===b?'T':'F');   // 'x'='y'
  cond=cond.replace(/(\d+)\s*=\s*(\d+)/g,(m,a,b)=>a===b?'T':'F');           // 1=1
  cond=cond.replace(/'[^']*'/g,'F');                                         // leftover literals → falsey
  cond=cond.replace(/\bAND\b/gi,'&&').replace(/\bOR\b/gi,'||').replace(/\bT\b/g,'true').replace(/\bF\b/g,'false');
  if(!/^[\s()truefals&|!]*$/i.test(cond)) return 'error';
  try{return Function('return ('+(cond.trim()||'false')+')')()?'bypass':'deny';}catch(e){return 'error';}
}
/* run one login attempt against a level; returns {kind, note, rows} */
function simulateSQL(input, level, users){
  const {work,blocked}=applyFilters(input, level.filters);
  if(blocked) return {kind:'blocked', note:blocked.note};
  const cond=`login='${work}' AND pass='${SENT}'`;
  const r=evalCond(cond);
  if(r==='bypass') return {kind:'bypass', rows:users};
  if(r==='error')  return {kind:'error'};
  // exact legit login would need the real password → denied for attacker
  return {kind:'deny'};
}
/* render the live query with highlight */
function renderQuery(input, level){
  const {work,blocked}=applyFilters(input, level.filters);
  if(blocked) return `<span class="q-param">// ${esc(blocked.note)}</span>`;
  const inj=/['"]|--|#|\bor\b/i.test(work);
  const shown=work?`<span class="${inj?'q-inj':'q-str'}">${esc(work)}</span>`:'<span class="q-str"></span>';
  return `<span class="q-kw">SELECT</span> * <span class="q-kw">FROM</span> users\n`+
         `<span class="q-kw">WHERE</span> login = '${shown}' <span class="q-kw">AND</span> pass = '<span class="q-str">••••••</span>'`;
}

/* =========================================================
   ENGINE STATE + BOOT
   ========================================================= */
let E=null, root=null;
function boot(course){
  root=$('#app')||document.body;
  if(!E || E.course!==course) E={course, diff:store.get('bresh:diff:'+course.id,null), done:store.get('bresh:progress:'+course.id,0), levelIndex:0, sub:'story'};
  if(!E.diff){ renderDiffPicker(); return; }
  E.levelIndex=Math.min(E.done, course.levels.length-1);
  renderShell(); openLevel(E.levelIndex);
}

/* ---- difficulty picker ---- */
function renderDiffPicker(){
  root.innerHTML='';
  const wrap=el('div','ce-picker');
  wrap.innerHTML=`<a class="ce-back" href="../../index.html">‹ портал</a>
    <div class="ce-picker-head">
      <div class="ce-codename">${esc(E.course.codename||'')}</div>
      <h1>${esc(E.course.title)}</h1>
      <p>${esc(E.course.blurb||'')}</p>
    </div>`;
  const grid=el('div','ce-diff-grid');
  [['novice','Новичок','Собираешь из блоков. Ведём за руку, объясняем каждый шаг.'],
   ['operator','Оператор','Печатаешь сам в песочнице. Подсказки по запросу.'],
   ['ghost','Призрак','Терминал и реальный код. Пишешь атаку и защиту руками.']].forEach(([id,n,d])=>{
    const c=el('button','ce-diff',null);
    c.innerHTML=`<span class="cd-name">${n}</span><span class="cd-desc">${d}</span>`;
    c.onclick=()=>{E.diff=id;store.set('bresh:diff:'+E.course.id,id);boot(E.course);};
    grid.appendChild(c);
  });
  wrap.appendChild(grid); root.appendChild(wrap);
}

/* ---- main shell (header + level ladder + stage) ---- */
function renderShell(){
  root.innerHTML='';
  const shell=el('div','ce-shell');
  shell.innerHTML=`
    <header class="ce-hud">
      <a class="ce-back" href="../../index.html">‹ портал</a>
      <div class="ce-hud-mid"><span class="ce-course">${esc(E.course.title)}</span>
        <span class="ce-dot">·</span><span class="ce-diff-tag">${diffName()}</span></div>
      <button class="ce-reset" id="ce-reset">сменить сложность</button>
    </header>
    <div class="ce-ladder" id="ce-ladder"></div>
    <div class="ce-stage" id="ce-stage"></div>`;
  root.appendChild(shell);
  $('#ce-reset').onclick=()=>{store.set('bresh:diff:'+E.course.id,null);E.diff=null;boot(E.course);};
  renderLadder();
}
function diffName(){return {novice:'Новичок',operator:'Оператор',ghost:'Призрак'}[E.diff];}
function renderLadder(){
  const l=$('#ce-ladder'); l.innerHTML='';
  E.course.levels.forEach((lv,i)=>{
    const st=i<E.done?'done':(i===E.levelIndex?'cur':(i<=E.done?'open':'lock'));
    const node=el('button','ce-step '+st);
    node.innerHTML=`<span class="cs-num">${String(i+1).padStart(2,'0')}</span><span class="cs-title">${esc(lv.title)}</span>`;
    node.disabled=i>E.done;
    node.onclick=()=>{E.levelIndex=i;openLevel(i);};
    l.appendChild(node);
    if(i<E.course.levels.length-1) l.appendChild(el('span','ce-link'));
  });
}

/* =========================================================
   LEVEL FLOW: story → challenge → outro
   ========================================================= */
function openLevel(i){
  E.levelIndex=i; E.sub='story'; renderLadder();
  const lv=E.course.levels[i];
  const stage=$('#ce-stage'); stage.innerHTML='';
  const intro = i===0 ? (E.course.intro||[]) : [];
  const beats = intro.concat(lv.story||[]);
  renderStory(stage, beats, ()=>startChallenge(lv));
}
function renderStory(stage, beats, onDone){
  const box=el('div','ce-story');
  const feed=el('div','story-feed'); box.appendChild(feed);
  let k=0;
  function next(){
    if(k<beats.length){
      const b=beats[k++];
      const line=el('div','story-line '+(b.who?'npc':'narr'));
      line.innerHTML = b.who? `<span class="sp-who">${esc(b.who)}</span><span class="sp-text">${esc(b.text)}</span>` : `<span class="sp-narr">${esc(b.text)}</span>`;
      feed.appendChild(line); feed.scrollTop=feed.scrollHeight;
      setTimeout(next, 60); // stagger reveal
    } else {
      const go=el('button','ce-primary','приступить ▸'); go.onclick=onDone;
      box.appendChild(go);
    }
  }
  stage.appendChild(box); next();
}

/* ---- the challenge ---- */
function startChallenge(lv){
  E.sub='play';
  const stage=$('#ce-stage'); stage.innerHTML='';
  if(lv.phase==='defense'){ renderDefense(stage,lv); return; }
  renderAttack(stage,lv);
}

function targetPanel(lv){
  const p=el('section','ce-panel ce-target');
  p.innerHTML=`<div class="cp-head"><span class="cp-name">ЦЕЛЬ · ${esc(E.course.targetName||'система')}</span><span class="cp-badge" id="tg-state">онлайн</span></div>
    <div class="sim-win"><div class="sim-chrome"><i></i><i></i><i></i><span>${esc(E.course.targetHost||'target/login')}</span></div>
      <div class="sim-body">
        <div class="sim-f"><label>Логин</label><input id="sim-login" class="sim-in" autocomplete="off" spellcheck="false" placeholder="имя пользователя"></div>
        <div class="sim-f"><label>Пароль</label><input class="sim-in" value="••••••••" disabled></div>
        <button class="sim-go" id="sim-go">Войти →</button>
        <div class="sim-vd" id="sim-vd"></div>
      </div></div>
    <div class="q-view"><div class="q-label">SQL на сервере <span id="q-note">${esc(lv.filters&&lv.filters.label?'фильтр: '+lv.filters.label:'')}</span></div><pre class="q-code" id="q-code"></pre></div>
    <div class="db-out" id="db-out"></div>`;
  return p;
}
function renderAttack(stage, lv){
  const grid=el('div','ce-grid');
  const target=targetPanel(lv);
  const bench=el('section','ce-panel ce-bench');
  bench.innerHTML=`<div class="cp-head"><span class="cp-name">АРСЕНАЛ</span><span class="cp-badge">${diffName()}</span></div><div class="bench-body" id="bench"></div><div class="ce-log" id="ce-log"></div>`;
  grid.append(target,bench); stage.appendChild(grid);
  wireTarget(lv);
  buildAttackBench(lv);
  updateQuery('', lv);
  goal(lv.goal);
  ceLog('sys','цель на связи. '+(lv.filters&&lv.filters.label?'защита цели: '+lv.filters.label:'защита цели: отсутствует'));
}
function goal(text){ /* shown as a chip under head via log */ ceLog('goal','ЗАДАЧА: '+text); }

function wireTarget(lv){
  const inp=$('#sim-login'), go=$('#sim-go');
  inp.disabled = (E.diff==='ghost'); // ghost drives via terminal
  inp.oninput=()=>updateQuery(inp.value,lv);
  inp.onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();submit(inp.value,lv);}};
  go.onclick=()=>submit(inp.value,lv);
}
function updateQuery(input,lv){ $('#q-code').innerHTML=renderQuery(input,lv); }
function submit(input,lv){
  const r=simulateSQL(input,lv,E.course.users);
  const vd=$('#sim-vd');
  if(r.kind==='bypass'){
    vd.className='sim-vd ok'; vd.textContent='⚠ ДОСТУП ПОЛУЧЕН — авторизация обойдена';
    dump(r.rows); $('#tg-state').textContent='ВЗЛОМАНО'; $('#tg-state').className='cp-badge breached';
    ceLog('hit','пейлоад «'+input+'» → пробито.');
    updateQuery(input,lv); levelSolved(lv);
  } else if(r.kind==='blocked'){
    vd.className='sim-vd deny'; vd.textContent='✕ '+r.note;
    dump(null); ceLog('warn',r.note); updateQuery(input,lv);
  } else if(r.kind==='error'){
    vd.className='sim-vd deny'; vd.textContent='SQL error: строка запроса сломана — обхода нет. Проверь кавычки / условие.';
    dump(null); ceLog('sys','ответ 500: SQL syntax error'); updateQuery(input,lv);
  } else {
    vd.className='sim-vd deny'; vd.textContent='доступ запрещён — неверные учётные данные';
    dump(null); updateQuery(input,lv);
  }
}
function dump(rows){
  const box=$('#db-out');
  if(rows===null){box.innerHTML='<div class="db-empty">// база ждёт запроса…</div>';return;}
  if(!rows.length){box.innerHTML='<div class="db-cap sec">0 строк — данные не отданы</div>';return;}
  box.innerHTML=`<div class="db-cap">УТЕЧКА: users (${rows.length})</div><table class="db-tab"><thead><tr><th>id</th><th>login</th><th>email</th><th>role</th><th>password</th></tr></thead><tbody>`+
    rows.map(r=>`<tr><td>${r.id}</td><td>${r.login}</td><td>${r.email}</td><td>${r.role}</td><td class="pw">${r.pass}</td></tr>`).join('')+`</tbody></table>`;
}

/* ---- attack workbench per tier ---- */
function buildAttackBench(lv){
  const b=$('#bench'); b.innerHTML='';
  if(E.diff==='novice') benchBlocks(b,lv);
  else if(E.diff==='operator') benchType(b,lv);
  else benchTerminal(b,lv);
}
function benchBlocks(b,lv){
  const guide=el('div','ce-guide'); guide.innerHTML=lv.guide||'Собери ввод так, чтобы условие стало всегда истинным — и цель пустит без пароля.';
  b.appendChild(guide);
  const tips=lv.blocks|| [
    {t:"admin",why:"обычный логин"},
    {t:"'",why:"кавычка закрывает строку логина — тут начинается инъекция"},
    {t:" OR ",why:"«или»: хватит, чтобы истинным было одно условие"},
    {t:"'1'='1",why:"всегда правда"},
    {t:" --",why:"комментарий: сервер игнорит всё после него, включая пароль"},
  ];
  let cur='';
  const tip=el('div','ce-tip','наведи блок — объясню'); 
  const asm=el('div','ce-asm'); 
  const sync=()=>{asm.textContent=cur;$('#sim-login').value=cur;updateQuery(cur,lv);};
  const pal=el('div','ce-pal');
  tips.forEach(o=>{const t=el('button','ce-tok',o.t);t.title=o.why;t.onmouseenter=()=>tip.textContent='◆ '+o.t.trim()+' — '+o.why;t.onclick=()=>{cur+=o.t;tip.textContent='◆ '+o.t.trim()+' — '+o.why;sync();};pal.appendChild(t);});
  const clr=el('button','ce-tok','⌫');clr.onclick=()=>{cur='';tip.textContent='очищено';sync();};pal.appendChild(clr);
  b.append(pal,tip,asm);
  const act=el('div','ce-actions');
  const run=el('button','ce-run','▸ отправить');run.onclick=()=>submit(cur||$('#sim-login').value,lv);
  act.appendChild(run);
  if(lv.steps){const h=el('button','ce-hint','подсказка по шагам');let s=0;h.onclick=()=>{if(s<lv.steps.length){const st=lv.steps[s++];cur+=st.add;tip.textContent='◆ '+st.say;sync();}else tip.textContent='◆ собрано — жми отправить';};act.appendChild(h);}
  if(lv.why){const w=el('button','ce-hint','разбор');const box=el('pre','ce-why');box.hidden=true;w.onclick=()=>{box.hidden=!box.hidden;box.textContent=lv.why;};act.appendChild(w);b.append(act,box);} else b.appendChild(act);
}
function benchType(b,lv){
  const g=el('div','ce-guide',lv.guideType||'Печатай ввод прямо в форму слева. Запрос собирается вживую — найди то, что ломает условие в твою пользу.');
  b.appendChild(g);
  const act=el('div','ce-actions');
  if(lv.hint){const h=el('button','ce-hint','подсказка');h.onclick=()=>{$('#sim-login').value=lv.hint;updateQuery(lv.hint,lv);toast('Пример подставлен в форму — можно доработать.');};act.appendChild(h);}
  if(lv.why){const w=el('button','ce-hint','разбор');const box=el('pre','ce-why');box.hidden=true;w.onclick=()=>{box.hidden=!box.hidden;box.textContent=lv.why;};act.appendChild(w);b.append(act,box);}else b.appendChild(act);
}
function benchTerminal(b,lv){
  const g=el('div','ce-guide','Терминал. Команды: help · probe · try &lt;пейлоад&gt; · hint');b.appendChild(g);
  const term=el('div','ce-term');const out=el('div','term-out');out.id='term-out';
  const line=el('div','term-line');line.innerHTML='<span class="ps">op@'+esc(E.course.id)+'$</span>';
  const ti=el('input','term-in');ti.id='term-in';ti.autocomplete='off';ti.spellcheck=false;line.appendChild(ti);
  term.append(out,line);b.appendChild(term);
  ti.onkeydown=e=>{if(e.key==='Enter'){termCmd(ti.value.trim(),lv);ti.value='';}};
  termEcho('sys','ready. `help` — список команд.');
  setTimeout(()=>ti.focus&&ti.focus(),40);
}
function termEcho(c,t){const o=$('#term-out');if(!o)return;const l=el('span','t '+c,t);o.appendChild(l);o.scrollTop=o.scrollHeight;}
function termCmd(c,lv){
  if(!c)return;termEcho('you','op$ '+c);
  const [cmd,...r]=c.split(' ');const arg=r.join(' ');
  if(cmd==='help')termEcho('sys','probe — прощупать · try <payload> — послать ввод · hint — пример');
  else if(cmd==='probe')termEcho('sys',(lv.filters&&lv.filters.label?'фильтр цели: '+lv.filters.label:'фильтров нет')+'. кавычка ломает строку → шанс на инъекцию.');
  else if(cmd==='hint')termEcho('sys','пример: try '+(lv.hint||"' OR '1'='1' --"));
  else if(cmd==='try'){$('#sim-login').value=arg;updateQuery(arg,lv);submit(arg,lv);const r=simulateSQL(arg,lv,E.course.users);termEcho(r.kind==='bypass'?'ok':(r.kind==='blocked'?'warn':'sys'),'→ '+({bypass:'доступ получен',blocked:'отбито фильтром',error:'SQL error',deny:'доступ запрещён'}[r.kind]));}
  else termEcho('sys','неизвестно. `help`');
}

/* =========================================================
   DEFENSE LEVEL: mixed — execute real code OR validate
   ========================================================= */
function renderDefense(stage,lv){
  const grid=el('div','ce-grid');
  const info=el('section','ce-panel ce-target');
  info.innerHTML=`<div class="cp-head"><span class="cp-name">ЗАЩИТА · ${esc(E.course.targetName||'система')}</span><span class="cp-badge" id="def-state">уязвима</span></div>
    <div class="ce-guide def">${lv.defenseBrief||'Стоп быть атакующим — теперь ты чинишь. Ниже уязвимый код. Закрой дыру так, чтобы все прежние атаки ушли в пустоту.'}</div>
    <div class="q-label">уязвимый код сервера</div>
    <pre class="code-vuln">${esc(lv.vulnCode||'')}</pre>
    <div class="def-battery" id="def-battery"></div>`;
  const bench=el('section','ce-panel ce-bench defend');
  bench.innerHTML=`<div class="cp-head"><span class="cp-name">ВЕРСТАК ЗАЩИТЫ</span><span class="cp-badge">${diffName()}</span></div><div class="bench-body" id="bench"></div><div class="ce-log" id="ce-log"></div>`;
  grid.append(info,bench);stage.appendChild(grid);
  renderBattery(lv,null);
  if(E.diff==='novice') defenseBlocks(lv);
  else if(E.diff==='operator') defenseFix(lv);
  else defenseCode(lv);
}
function renderBattery(lv,results){
  const b=$('#def-battery');if(!b)return;
  b.innerHTML='<div class="q-label">батарея атак (прогоняется по твоей защите)</div>'+
    lv.attacks.map((a,i)=>{const st=results?results[i]:'?';const cls=st==='blocked'?'ok':(st==='pass'?'bad':'idle');
      return `<div class="bat-row ${cls}"><code>${esc(a)}</code><span>${st==='blocked'?'отбито ✓':st==='pass'?'ПРОШЛО ✕':'—'}</span></div>`;}).join('');
}
function defenseBlocks(lv){
  const b=$('#bench');b.innerHTML='';
  b.appendChild(el('div','ce-guide','Выбери правильный подход к защите. Неверный — объясню, почему не спасает.'));
  lv.options.forEach(o=>{const btn=el('button','def-block');btn.innerHTML=`<span class="db-name">⛨ ${esc(o.name)}</span><span class="db-desc">${esc(o.desc)}</span>`;
    btn.onclick=()=>{ if(o.correct){installWin(lv);} else {ceLog('warn',o.fail||'Это не закрывает дыру.');toast(o.fail||'Не спасает — попробуй другое.');} };
    b.appendChild(btn);});
}
function defenseFix(lv){
  const b=$('#bench');b.innerHTML='';
  b.appendChild(el('div','ce-guide','Перепиши запрос так, чтобы ввод шёл ПАРАМЕТРОМ, а не склеивался в строку. Движок проверит подход.'));
  const ta=el('textarea','code-ed');ta.id='code-ed';ta.spellcheck=false;ta.value=lv.starter||'';
  b.appendChild(ta);
  const fb=el('div','code-fb');fb.id='code-fb';b.appendChild(fb);
  const act=el('div','ce-actions');
  const run=el('button','ce-run def','▸ применить');run.onclick=()=>{const v=validateParam(ta.value);fb.className='code-fb '+(v.ok?'ok':'err');fb.textContent=v.msg;if(v.ok){markBatteryAllBlocked(lv);installWin(lv);}};
  const h=el('button','ce-hint','подсказка');h.onclick=()=>{ta.value=lv.fixHint||'';fb.textContent='';};
  act.append(run,h);b.appendChild(act);
}
function defenseCode(lv){
  const b=$('#bench');b.innerHTML='';
  b.appendChild(el('div','ce-guide',lv.execPrompt||'Напиши функцию isSafe(input): верни true, если ввод безопасен, и false, если это инъекция. Движок РЕАЛЬНО прогонит её по батарее атак и по легитимным логинам.'));
  const sig=el('div','code-sig','function isSafe(input) {');b.appendChild(sig);
  const ta=el('textarea','code-ed');ta.id='code-ed';ta.spellcheck=false;ta.value=lv.execStarter||'  // верни true/false\n  \n';b.appendChild(ta);
  const sig2=el('div','code-sig','}');b.appendChild(sig2);
  const fb=el('div','code-fb');fb.id='code-fb';b.appendChild(fb);
  const act=el('div','ce-actions');
  const run=el('button','ce-run def','▸ выполнить');run.onclick=()=>runUserGuard(lv,ta.value,fb);
  act.appendChild(run);b.appendChild(act);
}
/* actually EXECUTE the player's guard function against the battery + legit logins */
function runUserGuard(lv,body,fb){
  let fn;
  try{ fn=new Function('input', body); fn('test'); }
  catch(e){ fb.className='code-fb err'; fb.textContent='✕ ошибка в коде: '+e.message; return; }
  const results=lv.attacks.map(a=>{let ok=false;try{ok=fn(a)===false;}catch(e){ok=false;}return ok?'blocked':'pass';});
  const legitOk=(lv.legit||['admin','m.orlov']).every(u=>{try{return fn(u)===true;}catch(e){return false;}});
  renderBattery(lv,results);
  const allBlocked=results.every(r=>r==='blocked');
  if(allBlocked && legitOk){ fb.className='code-fb ok'; fb.textContent='✓ все атаки отбиты, легитимные логины проходят. Защита работает — движок исполнил твой код по-настоящему.'; installWin(lv); }
  else if(!allBlocked){ fb.className='code-fb err'; fb.textContent='✕ часть атак прошла (см. батарею справа). Ужесточи проверку.'; ceLog('warn','батарея: часть пейлоадов прошла защиту.'); }
  else { fb.className='code-fb err'; fb.textContent='✕ ты блокируешь и обычные логины тоже (admin/m.orlov). Защита не должна ломать легитимный вход.'; }
}
function markBatteryAllBlocked(lv){ renderBattery(lv, lv.attacks.map(()=>'blocked')); }
function validateParam(code){
  const c=code.toLowerCase();
  if(!/select|query\(/.test(c)) return {ok:false,msg:'✕ не вижу запроса db.query(...) с SELECT.'};
  if(/["']\s*\+\s*(login|pass|input)|(login|pass|input)\s*\+\s*["']/.test(c)) return {ok:false,msg:'✕ ввод всё ещё склеивается через + — это и есть дыра.'};
  if(!/\?|\$\d|:\w+/.test(code)) return {ok:false,msg:'✕ нет плейсхолдера (? или $1). Данные должны идти отдельно от запроса.'};
  return {ok:true,msg:'✓ верно — ввод идёт параметром, инъекция больше не встраивается в код.'};
}
function installWin(lv){ $('#def-state').textContent='ЗАЩИЩЕНО'; $('#def-state').className='cp-badge secured'; ceLog('ok','защита установлена, повторные атаки отбиты.'); levelSolved(lv); }

/* =========================================================
   PROGRESSION
   ========================================================= */
function levelSolved(lv){
  const i=E.levelIndex;
  if(i+1>E.done){E.done=i+1;store.set('bresh:progress:'+E.course.id,E.done);}
  renderLadder();
  const stage=$('#ce-stage');
  const card=el('div','ce-outro');
  const last=i===E.course.levels.length-1;
  const beats=(lv.outro||[{text:'Уровень пройден.'}]);
  card.innerHTML=`<div class="ce-outro-tag">${last?'КУРС ПРОЙДЕН':'УРОВЕНЬ '+String(i+1).padStart(2,'0')+' ПРОЙДЕН'}</div>`+
    beats.map(b=>`<div class="story-line ${b.who?'npc':'narr'}">${b.who?`<span class="sp-who">${esc(b.who)}</span><span class="sp-text">${esc(b.text)}</span>`:`<span class="sp-narr">${esc(b.text)}</span>`}</div>`).join('');
  const act=el('div','ce-actions');
  if(!last){const n=el('button','ce-primary','следующий уровень ▸');n.onclick=()=>openLevel(i+1);act.appendChild(n);}
  else{const n=el('button','ce-primary','вернуться на портал');n.onclick=()=>location.href='../../index.html';act.appendChild(n);}
  const rp=el('button','ce-hint','пройти заново');rp.onclick=()=>openLevel(i);act.appendChild(rp);
  card.appendChild(act);
  setTimeout(()=>{ // let the breach visuals land first
    const stg=$('#ce-stage'); if(stg){stg.innerHTML='';stg.appendChild(card);}
  }, 900);
}

/* ---- small utils ---- */
function ceLog(cls,txt){const c=$('#ce-log');if(!c)return;const l=el('span','l '+cls,txt);c.appendChild(l);c.scrollTop=c.scrollHeight;while(c.children.length>50)c.removeChild(c.firstChild);}
let _tT;function toast(m){let t=$('#ce-toast');if(!t){t=el('div','ce-toast');t.id='ce-toast';document.body.appendChild(t);}t.textContent=m;t.hidden=false;clearTimeout(_tT);_tT=setTimeout(()=>t.hidden=true,2600);}

return { boot, _sim:simulateSQL, _eval:evalCond }; // _sim/_eval exposed for tests
})();
