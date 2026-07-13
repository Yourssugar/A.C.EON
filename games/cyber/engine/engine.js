/* =========================================================
   БРЕШЬ // CyberEngine — shared course runtime (v3)
   Adds: multi-case courses, level types (bypass / union /
   blind / defense), canvas DB-graph + particles, typewriter
   story, breach glitch. Data-driven; fake sim, no real exploits.
   Public API: CyberEngine.boot(course)
   ========================================================= */
window.CyberEngine = (function(){
'use strict';
const $=s=>document.querySelector(s);
const el=(t,c,x)=>{const e=document.createElement(t);if(c)e.className=c;if(x!=null)e.textContent=x;return e;};
const esc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
const SENT='__pw_'+Math.random().toString(36).slice(2)+'__';
const store={get(k,d){try{const v=localStorage.getItem(k);return v==null?d:JSON.parse(v);}catch(e){return d;}},set(k,v){try{localStorage.setItem(k,JSON.stringify(v));}catch(e){}}};

/* =========================================================
   SQL SIMULATION CORES
   ========================================================= */
function applyFilters(input,f){f=f||{};let work=input,blocked=null;
  if(f.blockUpperOR&&/OR/.test(input))blocked={note:f.orNote||'WAF: ключевое слово OR (верхний регистр) — запрос отклонён.'};
  if(!blocked&&f.blockQuote&&/'/.test(input))blocked={note:f.quoteNote||'WAF: одинарная кавычка запрещена.'};
  if(!blocked&&f.stripComments)work=work.replace(/(--|#).*$/,'').replace(/\/\*[\s\S]*?\*\//g,'');
  return {work,blocked};}
function evalCond(cond){
  const ci=cond.search(/--|#/);if(ci>=0)cond=cond.slice(0,ci);
  if(((cond.match(/'/g)||[]).length)%2!==0)return 'error';
  cond=cond.replace(/login\s*=\s*'([^']*)'/gi,(m,v)=>v==='admin'?'T':'F');
  cond=cond.replace(/pass\s*=\s*'([^']*)'/gi,'F');
  cond=cond.replace(/'([^']*)'\s*=\s*'([^']*)'/g,(m,a,b)=>a===b?'T':'F');
  cond=cond.replace(/(\d+)\s*=\s*(\d+)/g,(m,a,b)=>a===b?'T':'F');
  cond=cond.replace(/'[^']*'/g,'F');
  cond=cond.replace(/\bAND\b/gi,'&&').replace(/\bOR\b/gi,'||').replace(/\bT\b/g,'true').replace(/\bF\b/g,'false');
  if(!/^[\s()truefals&|!]*$/i.test(cond))return 'error';
  try{return Function('return ('+(cond.trim()||'false')+')')()?'bypass':'deny';}catch(e){return 'error';}}
function simulateSQL(input,level,users){
  const {work,blocked}=applyFilters(input,level.filters);
  if(blocked)return {kind:'blocked',note:blocked.note};
  const r=evalCond(`login='${work}' AND pass='${SENT}'`);
  if(r==='bypass')return {kind:'bypass',rows:users};
  if(r==='error')return {kind:'error'};
  return {kind:'deny'};}

/* UNION-based extraction: match column count, pull the secret table */
function simulateUnion(input,level){
  const cols=level.union.columns;
  const ob=/order\s+by\s+(\d+)/i.exec(input);
  if(ob){const n=+ob[1];return {kind:'order',ok:n<=cols,n,cols};}
  const um=/union\s+select\s+([\s\S]+?)(?:--|#|$)/i.exec(input);
  if(!um){ // must break out of the string first
    if(/'/.test(input)) return {kind:'error',note:'кавычка есть, но UNION SELECT не найден.'};
    return {kind:'deny'};
  }
  // count selected expressions (top-level commas)
  const picked=um[1].split(',').length;
  if(picked!==cols)return {kind:'error',note:`UNION: выбрано ${picked} столбца, а в запросе ${cols}. Число столбцов должно совпасть.`};
  return {kind:'extract',rows:level.union.secret};}

/* blind boolean oracle: does the injected condition hold for the hidden secret? */
function blindProbe(pos,ch,secret){return (secret[pos-1]||'').toLowerCase()===String(ch).toLowerCase();}
function blindParse(cond){ // supports SUBSTR(x,POS,1)='C'
  const m=/subs(?:tr|tring)\s*\(\s*\w+\s*,\s*(\d+)\s*,\s*1\s*\)\s*=\s*'?([\w])'?/i.exec(cond);
  return m?{pos:+m[1],ch:m[2]}:null;}

function renderQuery(input,lv){
  if(lv.type==='union'){
    const inj=/union|--|#|'/i.test(input);
    const shown=input?`<span class="${inj?'q-inj':'q-str'}">${esc(input)}</span>`:'<span class="q-str"></span>';
    return `<span class="q-kw">SELECT</span> title, author <span class="q-kw">FROM</span> articles\n<span class="q-kw">WHERE</span> title <span class="q-kw">LIKE</span> '%${shown}%'`;
  }
  if(lv.type==='blind'){
    return `<span class="q-kw">SELECT</span> * <span class="q-kw">FROM</span> users\n<span class="q-kw">WHERE</span> login='admin' <span class="q-kw">AND</span> <span class="q-inj">&lt;твоё условие&gt;</span>\n<span class="q-param">-- ответ: «найдено» / «не найдено»</span>`;
  }
  const {work,blocked}=applyFilters(input,lv.filters);
  if(blocked)return `<span class="q-param">// ${esc(blocked.note)}</span>`;
  const inj=/['"]|--|#|\bor\b/i.test(work);
  const shown=work?`<span class="${inj?'q-inj':'q-str'}">${esc(work)}</span>`:'<span class="q-str"></span>';
  return `<span class="q-kw">SELECT</span> * <span class="q-kw">FROM</span> users\n<span class="q-kw">WHERE</span> login = '${shown}' <span class="q-kw">AND</span> pass = '<span class="q-str">••••••</span>'`;}

/* =========================================================
   STATE + BOOT (multi-case flatten)
   ========================================================= */
let E=null,root=null;
function flatten(course){
  const cases = course.cases || [{code:course.codename,title:course.title,intro:course.intro,target:{name:course.targetName,host:course.targetHost},levels:course.levels}];
  const levels=[]; 
  cases.forEach((cs,ci)=>cs.levels.forEach((lv,li)=>{
    levels.push(Object.assign({},lv,{_case:ci,_first:li===0,_target:cs.target||{name:course.targetName,host:course.targetHost},_intro:cs.intro||[],_code:cs.code,_ctitle:cs.title}));
  }));
  return {cases,levels};}
function boot(course){
  root=$('#app')||document.body;
  if(!E||E.course!==course){const f=flatten(course);E={course,cases:f.cases,levels:f.levels,diff:store.get('bresh:diff:'+course.id,null),done:store.get('bresh:progress:'+course.id,0),levelIndex:0};}
  if(!E.diff){renderDiffPicker();return;}
  E.levelIndex=Math.min(E.done,E.levels.length-1);
  renderShell();openLevel(E.levelIndex);}

function renderDiffPicker(){
  stopGraph();root.innerHTML='';
  const wrap=el('div','ce-picker');
  wrap.innerHTML=`<a class="ce-back" href="../../index.html">‹ портал</a>
    <div class="ce-picker-head"><div class="ce-codename">${esc(E.course.codename||'')}</div><h1>${esc(E.course.title)}</h1><p>${esc(E.course.blurb||'')}</p></div>`;
  const grid=el('div','ce-diff-grid');
  [['novice','Новичок','Собираешь из блоков. Ведём за руку, объясняем каждый шаг.'],
   ['operator','Оператор','Печатаешь сам. Подсказки по запросу.'],
   ['ghost','Призрак','Терминал и реальный код. Пишешь атаку и защиту руками.']].forEach(([id,n,d])=>{
    const c=el('button','ce-diff');c.innerHTML=`<span class="cd-name">${n}</span><span class="cd-desc">${d}</span>`;
    c.onclick=()=>{E.diff=id;store.set('bresh:diff:'+E.course.id,id);boot(E.course);};grid.appendChild(c);});
  wrap.appendChild(grid);root.appendChild(wrap);}

function renderShell(){
  stopGraph();root.innerHTML='';
  const shell=el('div','ce-shell');
  shell.innerHTML=`<header class="ce-hud"><a class="ce-back" href="../../index.html">‹ портал</a>
    <div class="ce-hud-mid"><span class="ce-course">${esc(E.course.title)}</span><span class="ce-dot">·</span><span class="ce-diff-tag">${diffName()}</span></div>
    <button class="ce-reset" id="ce-reset">сменить сложность</button></header>
    <div class="ce-ladder" id="ce-ladder"></div><div class="ce-stage" id="ce-stage"></div>`;
  root.appendChild(shell);
  $('#ce-reset').onclick=()=>{store.set('bresh:diff:'+E.course.id,null);E.diff=null;boot(E.course);};
  renderLadder();}
function diffName(){return {novice:'Новичок',operator:'Оператор',ghost:'Призрак'}[E.diff];}
function renderLadder(){
  const l=$('#ce-ladder');l.innerHTML='';let lastCase=-1;
  E.levels.forEach((lv,i)=>{
    if(lv._case!==lastCase){lastCase=lv._case;const div=el('div','ce-case-div');div.innerHTML=`<span class="ccd-code">${esc(lv._code||'')}</span><span class="ccd-title">${esc(lv._ctitle||'')}</span>`;l.appendChild(div);}
    const st=i<E.done?'done':(i===E.levelIndex?'cur':'lock');
    const node=el('button','ce-step '+st);
    node.innerHTML=`<span class="cs-num">${String(i+1).padStart(2,'0')}</span><span class="cs-title">${esc(lv.title)}</span>`;
    node.disabled=i>E.done;node.onclick=()=>{E.levelIndex=i;openLevel(i);};l.appendChild(node);});}

/* =========================================================
   LEVEL FLOW
   ========================================================= */
function openLevel(i){
  stopGraph();E.levelIndex=i;renderLadder();
  const lv=E.levels[i];const stage=$('#ce-stage');stage.innerHTML='';
  const beats=(lv._first?(lv._intro||[]):[]).concat(lv.story||[]);
  renderStory(stage,beats,()=>startChallenge(lv));}

/* typewriter story */
function renderStory(stage,beats,onDone){
  const box=el('div','ce-story');const feed=el('div','story-feed');box.appendChild(feed);
  const skip=el('button','ce-skip','пропустить ▸▸');box.appendChild(skip);
  stage.appendChild(box);
  let k=0,timer=null,typing=null,doneAll=false;
  function finishBtn(){skip.remove();const go=el('button','ce-primary','приступить ▸');go.onclick=onDone;box.appendChild(go);}
  function typeLine(b,cb){
    const line=el('div','story-line '+(b.who?'npc':'narr'));
    const who=b.who?`<span class="sp-who">${esc(b.who)}</span>`:'';
    const span=el('span',b.who?'sp-text':'sp-narr');
    line.innerHTML=who;line.appendChild(span);feed.appendChild(line);feed.scrollTop=feed.scrollHeight;
    const txt=b.text;let c=0;
    typing=setInterval(()=>{span.textContent=txt.slice(0,++c);feed.scrollTop=feed.scrollHeight;if(c>=txt.length){clearInterval(typing);typing=null;cb();}},16);
  }
  function next(){if(k<beats.length){typeLine(beats[k++],()=>{timer=setTimeout(next,180);});}else{doneAll=true;finishBtn();}}
  skip.onclick=()=>{ if(doneAll)return; clearInterval(typing);clearTimeout(timer);feed.innerHTML='';
    beats.forEach(b=>{const line=el('div','story-line '+(b.who?'npc':'narr'));line.innerHTML=b.who?`<span class="sp-who">${esc(b.who)}</span><span class="sp-text">${esc(b.text)}</span>`:`<span class="sp-narr">${esc(b.text)}</span>`;feed.appendChild(line);});
    doneAll=true;finishBtn();};
  next();}

function startChallenge(lv){
  const stage=$('#ce-stage');stage.innerHTML='';
  if(lv.type==='defense'){renderDefense(stage,lv);return;}
  if(lv.type==='blind'){renderBlind(stage,lv);return;}
  renderAttack(stage,lv); // bypass + union share the attack frame
}

/* =========================================================
   TARGET PANEL + CANVAS GRAPH
   ========================================================= */
function targetPanel(lv,titleOverride){
  const p=el('section','ce-panel ce-target');p.id='ce-target';
  const tname=(lv._target&&lv._target.name)||'система', thost=(lv._target&&lv._target.host)||'target';
  p.innerHTML=`<div class="cp-head"><span class="cp-name">ЦЕЛЬ · ${esc(tname)}</span><span class="cp-badge" id="tg-state">онлайн</span></div>
    <canvas class="tg-graph" id="tg-graph"></canvas>
    <div class="sim-win"><div class="sim-chrome"><i></i><i></i><i></i><span>${esc(thost)}</span></div>
      <div class="sim-body" id="sim-body">${titleOverride||simLoginHTML(lv)}</div></div>
    <div class="q-view"><div class="q-label">SQL на сервере <span id="q-note">${esc(lv.filters&&lv.filters.label&&lv.filters.label!=='—'?'фильтр: '+lv.filters.label:'')}</span></div><pre class="q-code" id="q-code"></pre></div>
    <div class="db-out" id="db-out"></div>`;
  return p;}
function simLoginHTML(lv){
  if(lv.type==='union')return `<div class="sim-f"><label>Поиск по статьям</label><input id="sim-login" class="sim-in" autocomplete="off" spellcheck="false" placeholder="запрос"></div><button class="sim-go" id="sim-go">Искать →</button><div class="sim-vd" id="sim-vd"></div>`;
  return `<div class="sim-f"><label>Логин</label><input id="sim-login" class="sim-in" autocomplete="off" spellcheck="false" placeholder="имя пользователя"></div>
    <div class="sim-f"><label>Пароль</label><input class="sim-in" value="••••••••" disabled></div>
    <button class="sim-go" id="sim-go">Войти →</button><div class="sim-vd" id="sim-vd"></div>`;}

/* ---- attack (bypass + union) ---- */
function renderAttack(stage,lv){
  const grid=el('div','ce-grid');
  const target=targetPanel(lv);
  const bench=el('section','ce-panel ce-bench');
  bench.innerHTML=`<div class="cp-head"><span class="cp-name">АРСЕНАЛ</span><span class="cp-badge">${diffName()}</span></div><div class="bench-body" id="bench"></div><div class="ce-log" id="ce-log"></div>`;
  grid.append(target,bench);stage.appendChild(grid);
  initGraph(lv);
  wireTarget(lv);buildAttackBench(lv);updateQuery('',lv);
  ceLog('goal','ЗАДАЧА: '+lv.goal);
  ceLog('sys','цель на связи. '+(lv.filters&&lv.filters.label&&lv.filters.label!=='—'?'защита цели: '+lv.filters.label:'защита цели: базовая'));}
function wireTarget(lv){
  const inp=$('#sim-login'),go=$('#sim-go');if(!inp)return;
  inp.disabled=(E.diff==='ghost');
  inp.oninput=()=>updateQuery(inp.value,lv);
  inp.onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();submit(inp.value,lv);}};
  go.onclick=()=>submit(inp.value,lv);}
function updateQuery(v,lv){const q=$('#q-code');if(q)q.innerHTML=renderQuery(v,lv);}

function submit(input,lv){
  if(lv.type==='union')return submitUnion(input,lv);
  const r=simulateSQL(input,lv,E.course.users);
  if(r.kind==='bypass'){serverSay('ok','⚠ ДОСТУП ПОЛУЧЕН — авторизация обойдена');dump(r.rows);breachFX();ceLog('hit','пейлоад «'+input+'» → пробито.');updateQuery(input,lv);solve(lv);}
  else if(r.kind==='blocked'){serverSay('deny','✕ '+r.note);dump(null);ceLog('warn',r.note);updateQuery(input,lv);}
  else if(r.kind==='error'){serverSay('deny','SQL error: строка сломана — обхода нет. Проверь кавычки / условие.');dump(null);ceLog('sys','ответ 500: SQL syntax error');updateQuery(input,lv);}
  else{serverSay('deny','доступ запрещён — неверные учётные данные');dump(null);updateQuery(input,lv);}}
function submitUnion(input,lv){
  const r=simulateUnion(input,lv);
  if(r.kind==='extract'){serverSay('ok','⚠ ДАННЫЕ ИЗВЛЕЧЕНЫ — UNION вернул скрытую таблицу');dump(r.rows,lv.union.dump);breachFX();ceLog('hit','UNION сработал → извлечено '+r.rows.length+' строк.');updateQuery(input,lv);solve(lv);}
  else if(r.kind==='order'){serverSay('deny',r.ok?`ORDER BY ${r.n}: ок — столбец ${r.n} существует`:`ORDER BY ${r.n}: ошибка — столбца ${r.n} нет (столбцов меньше)`);dump(null);ceLog('sys','разведка столбцов: '+(r.ok?'есть':'нет')+' #'+r.n);updateQuery(input,lv);}
  else if(r.kind==='error'){serverSay('deny','✕ '+(r.note||'ошибка запроса'));dump(null);ceLog('warn',r.note||'ошибка');updateQuery(input,lv);}
  else{serverSay('deny','ничего не найдено');dump(null);updateQuery(input,lv);}}

function dump(rows,opts){
  const box=$('#db-out');if(!box)return;opts=opts||{};
  const cols=opts.cols||[{k:'id',l:'id'},{k:'login',l:'login'},{k:'email',l:'email'},{k:'role',l:'role'},{k:'pass',l:'password',d:true}];
  if(rows===null){box.innerHTML='<div class="db-empty">// база ждёт запроса…</div>';return;}
  if(!rows.length){box.innerHTML='<div class="db-cap sec">0 строк — данные не отданы</div>';return;}
  const cap=opts.cap||('УТЕЧКА: users ('+rows.length+')');
  box.innerHTML=`<div class="db-cap">${esc(cap)}</div><table class="db-tab"><thead><tr>${cols.map(c=>`<th>${esc(c.l)}</th>`).join('')}</tr></thead><tbody>`+
    rows.map(r=>`<tr>${cols.map(c=>`<td class="${c.d?'pw':''}">${esc(r[c.k]!=null?r[c.k]:'')}</td>`).join('')}</tr>`).join('')+`</tbody></table>`;}

/* ---- attack benches (blocks / type / terminal) ---- */
function buildAttackBench(lv){const b=$('#bench');b.innerHTML='';if(E.diff==='novice')benchBlocks(b,lv);else if(E.diff==='operator')benchType(b,lv);else benchTerminal(b,lv);}
function benchBlocks(b,lv){
  b.appendChild(guideEl(lv.guide||'Собери ввод так, чтобы получить нужный результат.'));
  const tips=lv.blocks||[{t:"admin",why:"обычный логин"},{t:"'",why:"кавычка закрывает строку"},{t:" OR ",why:"«или»"},{t:"'1'='1",why:"всегда правда"},{t:" --",why:"комментарий"}];
  let cur='';const tip=el('div','ce-tip','наведи блок — объясню');const asm=el('div','ce-asm');
  const sync=()=>{asm.textContent=cur;const i=$('#sim-login');if(i)i.value=cur;updateQuery(cur,lv);};
  const pal=el('div','ce-pal');
  tips.forEach(o=>{const t=el('button','ce-tok',o.t);t.title=o.why;t.onmouseenter=()=>tip.textContent='◆ '+o.t.trim()+' — '+o.why;t.onclick=()=>{cur+=o.t;tip.textContent='◆ '+o.t.trim()+' — '+o.why;sync();};pal.appendChild(t);});
  const clr=el('button','ce-tok','⌫');clr.onclick=()=>{cur='';tip.textContent='очищено';sync();};pal.appendChild(clr);
  b.append(pal,tip,asm);
  const act=el('div','ce-actions');const run=el('button','ce-run',lv.type==='union'?'▸ искать':'▸ отправить');run.onclick=()=>submit(cur||($('#sim-login')||{}).value||'',lv);act.appendChild(run);
  if(lv.steps){let s=0;const h=el('button','ce-hint','подсказка по шагам');h.onclick=()=>{if(s<lv.steps.length){const st=lv.steps[s++];cur+=st.add;tip.textContent='◆ '+st.say;sync();}else tip.textContent='◆ собрано — жми кнопку';};act.appendChild(h);}
  if(lv.why){const w=el('button','ce-hint','разбор');const box=el('pre','ce-why');box.hidden=true;w.onclick=()=>{box.hidden=!box.hidden;box.textContent=lv.why;};act.appendChild(w);b.append(act,box);}else b.appendChild(act);}
function benchType(b,lv){
  b.appendChild(guideEl(lv.guideType||lv.guide||'Печатай ввод в форму слева. Запрос собирается вживую.'));
  const act=el('div','ce-actions');
  if(lv.hint){const h=el('button','ce-hint','подсказка');h.onclick=()=>{const i=$('#sim-login');if(i){i.value=lv.hint;updateQuery(lv.hint,lv);}toast('Пример подставлен — можно доработать.');};act.appendChild(h);}
  if(lv.why){const w=el('button','ce-hint','разбор');const box=el('pre','ce-why');box.hidden=true;w.onclick=()=>{box.hidden=!box.hidden;box.textContent=lv.why;};act.appendChild(w);b.append(act,box);}else b.appendChild(act);}
function benchTerminal(b,lv){
  b.appendChild(guideEl('Терминал доступа. Команды: <code>help</code> · <code>probe</code> · <code>try &lt;пейлоад&gt;</code> · <code>hint</code>'));
  const host=(lv._target&&lv._target.host)||E.course.id;
  makeTerminal(b,host,[{c:'sys',t:'[*] session initialised'},{c:'info',t:'[+] target acquired: '+host},{c:'sys',t:'type `help` for commands'}],cmd=>termCmd(cmd,lv));}
function termEcho(c,t){const o=$('#term-out');if(!o)return;const l=el('span','t '+c,t);o.appendChild(l);o.scrollTop=o.scrollHeight;}
function termCmd(c,lv){if(!c)return;termEcho('you','└─$ '+c);const [cmd,...r]=c.split(' ');const arg=r.join(' ');
  if(cmd==='help')termType('sys','probe — прощупать цель · try <payload> — послать ввод · hint — пример пейлоада');
  else if(cmd==='probe')termType('info',(lv.filters&&lv.filters.label&&lv.filters.label!=='—'?'[!] WAF активен: '+lv.filters.label:'[+] фильтров не обнаружено')+' — кавычка ломает строку → шанс на инъекцию');
  else if(cmd==='hint')termType('sys','пример: try '+(lv.hint||"' OR '1'='1' --"));
  else if(cmd==='try'){const i=$('#sim-login');if(i)i.value=arg;updateQuery(arg,lv);const r=(lv.type==='union'?simulateUnion(arg,lv):simulateSQL(arg,lv,E.course.users));submit(arg,lv);termType(r.kind==='bypass'||r.kind==='extract'?'ok':(r.kind==='blocked'||r.kind==='error'?'warn':'sys'),'→ '+({bypass:'ACCESS GRANTED',extract:'DATA EXTRACTED',blocked:'blocked by WAF',error:'SQL syntax error',order:'column recon',deny:'access denied'}[r.kind]||'')); }
  else termType('warn','command not found: '+cmd);}
function guideEl(html){const g=el('div','ce-guide');g.innerHTML=html;return g;}

/* =========================================================
   BLIND boolean level (char-by-char oracle)
   ========================================================= */
function renderBlind(stage,lv){
  const grid=el('div','ce-grid');
  const target=targetPanel(lv,'<div class="blind-orb" id="blind-orb">оракул готов</div>');
  const bench=el('section','ce-panel ce-bench');
  bench.innerHTML=`<div class="cp-head"><span class="cp-name">СЛЕПОЙ ИЗВЛЕКАТЕЛЬ</span><span class="cp-badge">${diffName()}</span></div><div class="bench-body" id="bench"></div><div class="ce-log" id="ce-log"></div>`;
  grid.append(target,bench);stage.appendChild(grid);
  initGraph(lv);updateQuery('',lv);
  ceLog('goal','ЗАДАЧА: '+lv.goal);
  ceLog('sys','данные не выводятся. только «найдено / не найдено». тяни секрет по символу.');
  const secret=lv.blind.secret;const found=Array(secret.length).fill(null);
  const slots=el('div','blind-slots');
  const drawSlots=()=>{slots.innerHTML='';found.forEach((c,i)=>{const s=el('div','blind-slot'+(c?' got':''));s.textContent=c?c:'·';slots.appendChild(s);});};
  const b=$('#bench');b.appendChild(guideEl(lv.guide||'Секрет спрятан. Проверяй по одному символу: сервер отвечает только «да/нет».'));
  b.append(slots);drawSlots();
  const nextPos=()=>found.indexOf(null)+1; // 1-based
  function tryChar(ch){
    const pos=nextPos();if(pos===0)return;
    const ok=blindProbe(pos,ch,secret);
    const orb=$('#blind-orb');
    updateQuery(`SUBSTR(pin,${pos},1)='${ch}'`,lv);
    if(ok){found[pos-1]=ch;drawSlots();orb.textContent='НАЙДЕНО ✓';orb.className='blind-orb ok';ceLog('hit',`позиция ${pos}: «${ch}» — найдено.`);graphBreach();
      if(found.indexOf(null)===-1){ceLog('ok','секрет извлечён целиком: '+found.join(''));setTimeout(()=>{breachFX();solve(lv);},320);}}
    else{orb.textContent='не найдено';orb.className='blind-orb no';}
  }
  if(E.diff==='ghost'){
    b.appendChild(guideEl('Пиши условие вида <code>SUBSTR(pin,1,1)=\'4\'</code> — оракул ответит TRUE/FALSE.'));
    const host=(lv._target&&lv._target.host)||'archive7';
    makeTerminal(b,host,[{c:'sys',t:'[*] blind oracle online'},{c:'sys',t:"example: SUBSTR(pin,1,1)='4'"}],val=>{
      termEcho('you','└─$ '+val);const p=blindParse(val);
      if(!p){termType('warn','parse error — формат SUBSTR(pin,ПОЗ,1)=\'X\'');return;}
      const ok=blindProbe(p.pos,p.ch,secret);updateQuery(val,lv);
      termType(ok?'ok':'sys','→ '+(ok?'TRUE  (найдено)':'FALSE (не найдено)'));
      if(ok){found[p.pos-1]=p.ch;drawSlots();graphBreach();if(found.indexOf(null)===-1){ceLog('ok','секрет извлечён: '+found.join(''));setTimeout(()=>{breachFX();solve(lv);},300);}}
    });
  } else {
    const pad=el('div','blind-pad');
    (lv.blind.charset||'0123456789').split('').forEach(ch=>{const k=el('button','blind-key',ch);k.onclick=()=>tryChar(ch);pad.appendChild(k);});
    b.appendChild(pad);
    if(E.diff==='novice'){const g2=el('div','ce-tip');g2.innerHTML='Жми символы для текущей позиции. Верный — фиксируется, курсор идёт дальше. Это и есть «слепая» атака: ты не видишь данные, а вычисляешь их по ответам.';b.appendChild(g2);}
  }
}

/* =========================================================
   DEFENSE (execute or validate)
   ========================================================= */
function renderDefense(stage,lv){
  const grid=el('div','ce-grid');
  const info=el('section','ce-panel ce-target');info.id='ce-target';
  info.innerHTML=`<div class="cp-head"><span class="cp-name">ЗАЩИТА · ${esc((lv._target&&lv._target.name)||'система')}</span><span class="cp-badge" id="def-state">уязвима</span></div>
    <canvas class="tg-graph" id="tg-graph"></canvas>
    <div class="ce-guide def">${lv.defenseBrief||'Теперь ты чинишь. Ниже уязвимый код — закрой дыру так, чтобы все прежние атаки ушли в пустоту.'}</div>
    <div class="q-label">уязвимый код сервера</div><pre class="code-vuln">${esc(lv.vulnCode||'')}</pre>
    <div class="def-battery" id="def-battery"></div>`;
  const bench=el('section','ce-panel ce-bench defend');
  bench.innerHTML=`<div class="cp-head"><span class="cp-name">ВЕРСТАК ЗАЩИТЫ</span><span class="cp-badge">${diffName()}</span></div><div class="bench-body" id="bench"></div><div class="ce-log" id="ce-log"></div>`;
  grid.append(info,bench);stage.appendChild(grid);
  initGraph(lv);renderBattery(lv,null);
  if(E.diff==='novice')defenseBlocks(lv);else if(E.diff==='operator')defenseFix(lv);else defenseCode(lv);}
function renderBattery(lv,res){const b=$('#def-battery');if(!b)return;
  b.innerHTML='<div class="q-label">батарея атак (прогоняется по твоей защите)</div>'+lv.attacks.map((a,i)=>{const st=res?res[i]:'?';const cls=st==='blocked'?'ok':(st==='pass'?'bad':'idle');return `<div class="bat-row ${cls}"><code>${esc(a)}</code><span>${st==='blocked'?'отбито ✓':st==='pass'?'ПРОШЛО ✕':'—'}</span></div>`;}).join('');}
function defenseBlocks(lv){const b=$('#bench');b.innerHTML='';b.appendChild(guideEl('Выбери правильный подход. Неверный — объясню, почему не спасает.'));
  lv.options.forEach(o=>{const btn=el('button','def-block');btn.innerHTML=`<span class="db-name">⛨ ${esc(o.name)}</span><span class="db-desc">${esc(o.desc)}</span>`;btn.onclick=()=>{if(o.correct){markBattery(lv);winDefense(lv);}else{ceLog('warn',o.fail||'не спасает');toast(o.fail||'Не спасает.');}};b.appendChild(btn);});}
function defenseFix(lv){const b=$('#bench');b.innerHTML='';b.appendChild(guideEl('Перепиши запрос так, чтобы ввод шёл ПАРАМЕТРОМ, а не склеивался в строку.'));
  const ta=el('textarea','code-ed');ta.id='code-ed';ta.value=lv.starter||'';b.appendChild(ta);const fb=el('div','code-fb');fb.id='code-fb';b.appendChild(fb);
  const act=el('div','ce-actions');const run=el('button','ce-run def','▸ применить');run.onclick=()=>{const v=validateParam(ta.value);fb.className='code-fb '+(v.ok?'ok':'err');fb.textContent=v.msg;if(v.ok){markBattery(lv);winDefense(lv);}};
  const h=el('button','ce-hint','подсказка');h.onclick=()=>{ta.value=lv.fixHint||'';fb.textContent='';};act.append(run,h);b.appendChild(act);}
function defenseCode(lv){const b=$('#bench');b.innerHTML='';b.appendChild(guideEl(lv.execPrompt||'Напиши тело isSafe(input): true — безопасно, false — инъекция. Движок реально прогонит её по батарее.'));
  b.appendChild(el('div','code-sig','function isSafe(input) {'));const ta=el('textarea','code-ed');ta.id='code-ed';ta.value=lv.execStarter||'  return true;\n';b.appendChild(ta);b.appendChild(el('div','code-sig','}'));
  const fb=el('div','code-fb');fb.id='code-fb';b.appendChild(fb);const act=el('div','ce-actions');const run=el('button','ce-run def','▸ выполнить');run.onclick=()=>runGuard(lv,ta.value,fb);act.appendChild(run);b.appendChild(act);}
function runGuard(lv,body,fb){let fn;try{fn=new Function('input',body);fn('t');}catch(e){fb.className='code-fb err';fb.textContent='✕ ошибка в коде: '+e.message;return;}
  const res=lv.attacks.map(a=>{let ok=false;try{ok=fn(a)===false;}catch(e){}return ok?'blocked':'pass';});
  const legitOk=(lv.legit||['admin']).every(u=>{try{return fn(u)===true;}catch(e){return false;}});
  renderBattery(lv,res);const all=res.every(r=>r==='blocked');
  if(all&&legitOk){fb.className='code-fb ok';fb.textContent='✓ все атаки отбиты, легитимные логины проходят — движок исполнил твой код по-настоящему.';winDefense(lv);}
  else if(!all){fb.className='code-fb err';fb.textContent='✕ часть атак прошла (см. батарею). Ужесточи проверку.';ceLog('warn','батарея: часть пейлоадов прошла.');}
  else{fb.className='code-fb err';fb.textContent='✕ ты блокируешь и обычные логины. Защита не должна ломать легитимный вход.';}}
function markBattery(lv){renderBattery(lv,lv.attacks.map(()=>'blocked'));}
function validateParam(code){const c=code.toLowerCase();
  if(!/select|query\(/.test(c))return {ok:false,msg:'✕ не вижу запроса db.query(...) с SELECT.'};
  if(/["']\s*\+\s*(login|pass|input)|(login|pass|input)\s*\+\s*["']/.test(c))return {ok:false,msg:'✕ ввод всё ещё склеивается через + — это дыра.'};
  if(!/\?|\$\d|:\w+/.test(code))return {ok:false,msg:'✕ нет плейсхолдера (? или $1).'};
  return {ok:true,msg:'✓ верно — ввод идёт параметром, инъекция не встраивается в код.'};}
function winDefense(lv){const s=$('#def-state');if(s){s.textContent='ЗАЩИЩЕНО';s.className='cp-badge secured';}graphSecure();securedFlash();animateCodePatch(lv.fixHint);ceLog('ok','защита установлена, атаки отбиты.');solve(lv,1800);}

/* =========================================================
   PROGRESSION
   ========================================================= */
function solve(lv,delay){
  const i=E.levelIndex;if(i+1>E.done){E.done=i+1;store.set('bresh:progress:'+E.course.id,E.done);}renderLadder();
  const last=i===E.levels.length-1;const beats=lv.outro||[{text:'Уровень пройден.'}];
  const card=el('div','ce-outro');
  card.innerHTML=`<div class="ce-outro-tag">${last?'КУРС ПРОЙДЕН':'УРОВЕНЬ '+String(i+1).padStart(2,'0')+' ПРОЙДЕН'}</div>`+
    beats.map(b=>`<div class="story-line ${b.who?'npc':'narr'}">${b.who?`<span class="sp-who">${esc(b.who)}</span><span class="sp-text">${esc(b.text)}</span>`:`<span class="sp-narr">${esc(b.text)}</span>`}</div>`).join('');
  const act=el('div','ce-actions');
  if(!last){const n=el('button','ce-primary','следующий уровень ▸');n.onclick=()=>openLevel(i+1);act.appendChild(n);}
  else{const n=el('button','ce-primary','вернуться на портал');n.onclick=()=>location.href='../../index.html';act.appendChild(n);}
  const rp=el('button','ce-hint','пройти заново');rp.onclick=()=>openLevel(i);act.appendChild(rp);card.appendChild(act);
  setTimeout(()=>{stopGraph();const stg=$('#ce-stage');if(stg){stg.innerHTML='';stg.appendChild(card);}},delay!=null?delay:1300);}

/* =========================================================
   CANVAS GRAPH + PARTICLES + GLITCH
   ========================================================= */
let gC,gX,gN=[],gP=[],gRAF=0,gW=0,gH=0,gT=0;
function initGraph(lv){
  gC=$('#tg-graph');if(!gC)return;gX=gC.getContext('2d');
  const tables=(lv.tables)||(lv.type==='union'?['articles','authors','admin_tokens']:['users','sessions','logs']);
  const target=lv.target|| (lv.type==='union'?'admin_tokens':'users');
  sizeGraph();
  gN=tables.map((name,i)=>{const n=tables.length,ang=(i/n)*Math.PI*2-Math.PI/2;return{name,ang,sensitive:name===target,breach:0,secure:0,r:14};});
  gP=[];if(!gRAF)gRAF=window.requestAnimationFrame(gLoop);}
function sizeGraph(){if(!gC)return;const rect=gC.getBoundingClientRect();const dpr=Math.min(window.devicePixelRatio||1,2);gW=rect.width||600;gH=rect.height||120;gC.width=gW*dpr;gC.height=gH*dpr;gX.setTransform(dpr,0,0,dpr,0,0);}
function gPos(n){const cx=gW/2,cy=gH/2,rr=Math.min(gW,gH)*0.36;return{x:cx+Math.cos(n.ang)*rr,y:cy+Math.sin(n.ang)*rr};}
function gLoop(){gRAF=window.requestAnimationFrame(gLoop);if(!gC||!document.body.contains(gC)){stopGraph();return;}gT+=.016;gX.clearRect(0,0,gW,gH);
  gX.lineWidth=1;for(let i=0;i<gN.length;i++)for(let j=i+1;j<gN.length;j++){const a=gPos(gN[i]),b=gPos(gN[j]);gX.strokeStyle='rgba(53,224,214,.10)';gX.beginPath();gX.moveTo(a.x,a.y);gX.lineTo(b.x,b.y);gX.stroke();}
  gN.forEach(n=>{const p=gPos(n);n.breach*=.94;n.secure*=.95;const pulse=n.sensitive?1+Math.sin(gT*2)*.14:1;const rr=n.r*pulse;let col='53,224,214',glow=6;if(n.breach>.05){col='255,59,84';glow=6+n.breach*22;}else if(n.secure>.05){col='52,227,138';glow=6+n.secure*18;}
    gX.save();gX.shadowColor=`rgba(${col},.9)`;gX.shadowBlur=glow;gX.fillStyle=`rgba(${col},${n.sensitive?.28:.15})`;gX.beginPath();gX.arc(p.x,p.y,rr,0,7);gX.fill();gX.shadowBlur=0;gX.lineWidth=1.4;gX.strokeStyle=`rgba(${col},.85)`;gX.stroke();gX.restore();
    gX.fillStyle='rgba(232,230,220,.6)';gX.font='9px "JetBrains Mono",monospace';gX.textAlign='center';gX.fillText(n.name,p.x,p.y+rr+11);if(n.sensitive){gX.fillStyle='rgba(255,157,43,.85)';gX.fillText('◆',p.x,p.y+3);}});
  for(let i=gP.length-1;i>=0;i--){const q=gP[i];q.x+=q.vx;q.y+=q.vy;q.life-=.02;if(q.life<=0){gP.splice(i,1);continue;}gX.globalAlpha=Math.max(0,q.life);gX.fillStyle=q.c;gX.fillRect(q.x,q.y,2.2,2.2);gX.globalAlpha=1;}}
function stopGraph(){if(gRAF){window.cancelAnimationFrame(gRAF);gRAF=0;}gN=[];gP=[];}
function graphBreach(){const n=gN.find(x=>x.sensitive)||gN[0];if(!n)return;n.breach=1;const p=gPos(n);for(let i=0;i<28&&gP.length<170;i++)gP.push({x:p.x,y:p.y,vx:-2-Math.random()*2.4,vy:(Math.random()-.5)*2.2,life:1,c:'#FF3B54'});}
function graphSecure(){gN.forEach(n=>{n.secure=1;n.breach*=.3;});}
function breachFX(){graphBreach();hexBurst();accessFlash('grant','ACCESS GRANTED');const s=$('#tg-state');if(s){s.textContent='ВЗЛОМАНО';s.className='cp-badge breached';}const t=$('#ce-target');if(t){t.classList.add('glitch');setTimeout(()=>t.classList.remove('glitch'),460);}}

/* ---- FX helpers ---- */
function typeInto(node,text,speed,cb){if(!node)return;node.classList.add('typing');node.textContent='';let i=0;const iv=setInterval(()=>{node.textContent=text.slice(0,++i);if(i>=text.length){clearInterval(iv);node.classList.remove('typing');cb&&cb();}},speed||16);return iv;}
function serverSay(cls,msg){const vd=$('#sim-vd');if(!vd)return;vd.className='sim-vd '+cls;typeInto(vd,msg,12);}
function accessFlash(kind,text){const o=el('div','access-flash '+kind);const t=el('div','af-text',text);t.setAttribute('data-t',text);o.appendChild(t);document.body.appendChild(o);setTimeout(()=>o.remove(),1100);}
function securedFlash(){accessFlash('secured','SYSTEM SECURED');}
function hexBurst(){const t=$('#ce-target');if(!t)return;const layer=el('div','hexrain');t.appendChild(layer);const W=t.clientWidth||600;for(let i=0;i<26;i++){const s=el('span','hx',(Math.random()<.5?'0':'1'));s.style.left=(Math.random()*W)+'px';const dur=(.5+Math.random()*.7);s.style.animationDuration=dur+'s';s.style.animationDelay=(Math.random()*.4)+'s';s.style.opacity=(.4+Math.random()*.6);layer.appendChild(s);}setTimeout(()=>layer.remove(),1500);}
function animateCodePatch(fixedText){const v=$('.code-vuln');if(!v||!fixedText)return;v.classList.add('patching');setTimeout(()=>{v.classList.remove('patching');v.classList.add('patched');typeInto(v,fixedText,10,()=>{const s=el('div','patch-stamp','✓ PATCHED');if(v.parentNode)v.parentNode.insertBefore(s,v.nextSibling);});},520);}
function termType(cls,txt,cb){const o=$('#term-out');if(!o){cb&&cb();return;}const l=el('span','t '+cls);o.appendChild(l);o.scrollTop=o.scrollHeight;typeInto(l,txt,9,()=>{o.scrollTop=o.scrollHeight;cb&&cb();});}
function makeTerminal(parent,host,banner,onEnter){
  const term=el('div','kterm');
  const bar=el('div','kterm-bar');bar.innerHTML='<i></i><i></i><i></i><span>op@'+esc(host)+': ~</span>';
  const out=el('div','term-out');out.id='term-out';
  const l1=el('div','kterm-line');l1.innerHTML='<span class="kp-1">┌──(</span><span class="kp-u">op</span><span class="kp-1">㉿</span><span class="kp-h">'+esc(host)+'</span><span class="kp-1">)-[</span><span class="kp-p">~</span><span class="kp-1">]</span>';
  const l2=el('div','kterm-line2');l2.innerHTML='<span class="kp-1">└─</span><span class="kp-d">$</span>&nbsp;';
  const ti=el('input','term-in');ti.id='term-in';ti.autocomplete='off';ti.spellcheck=false;l2.appendChild(ti);
  term.append(bar,out,l1,l2);parent.appendChild(term);
  (banner||[]).forEach((b,i)=>setTimeout(()=>termType(b.c||'sys',b.t),120+i*220));
  ti.onkeydown=e=>{if(e.key==='Enter'){onEnter(ti.value.trim());ti.value='';}};
  setTimeout(()=>ti.focus&&ti.focus(),60);
  return ti;}

/* ---- utils ---- */
function ceLog(cls,txt){const c=$('#ce-log');if(!c)return;const l=el('span','l '+cls,txt);c.appendChild(l);c.scrollTop=c.scrollHeight;while(c.children.length>50)c.removeChild(c.firstChild);}
let _tT;function toast(m){let t=$('#ce-toast');if(!t){t=el('div','ce-toast');t.id='ce-toast';document.body.appendChild(t);}t.textContent=m;t.hidden=false;clearTimeout(_tT);_tT=setTimeout(()=>t.hidden=true,2600);}
window.addEventListener('resize',()=>{if(gC)sizeGraph();});

return {boot,_sim:simulateSQL,_eval:evalCond,_union:simulateUnion,_blind:blindProbe,_bparse:blindParse};
})();
