/* =========================================================
   БРЕШЬ // cyber range — engine v2
   Vanilla JS, no deps.
   - Menu (selection)
   - Block engine  (#arena)  : light gameplay, used for vsbot & non-authored scenarios
   - Deep engine   (#game)   : full interactive gameplay, authored for SQL-инъекция
   All "attacks" run against a FAKE in-page simulation. No real exploits.
   ========================================================= */
(() => {
'use strict';
const $ = id => document.getElementById(id);
const el = (t,c,x)=>{const e=document.createElement(t);if(c)e.className=c;if(x!=null)e.textContent=x;return e;};
const rand = a => a[Math.floor(Math.random()*a.length)];
const esc = s => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

/* ---------------------------------------------------------
   FAKE DB for the SQL-инъекция simulation (fabricated data)
   --------------------------------------------------------- */
const SIM_USERS = [
  {id:1, login:'admin',      email:'admin@neobank.io',  role:'admin',   pass:'Admin!2021'},
  {id:2, login:'m.orlov',    email:'m.orlov@neobank.io',role:'user',    pass:'summer2019'},
  {id:3, login:'k.nowak',    email:'k.nowak@neobank.io',role:'user',    pass:'qwerty123'},
  {id:4, login:'svc_backup', email:'ops@neobank.io',    role:'service', pass:'b4ckup_9931'},
];

/* ---------------------------------------------------------
   SCENARIOS (data-driven). `sim` = deep-engine content.
   --------------------------------------------------------- */
const SCENARIOS = [
  {
    id:'sqli', name:'SQL-инъекция', sub:'Ввод пользователя попадает прямо в запрос к базе.',
    icon:'⌘', tags:['база данных','ввод'],
    tables:['users','sessions','products'], target:'users',
    attacks:[
      {id:'probe', name:"Пробный ввод  '", damage:0, recon:true, blockedBy:[], desc:'Кидаем кавычку и смотрим, фильтруется ли ввод.'},
      {id:'bypass', name:"' OR '1'='1", damage:50, target:'users', blockedBy:['validate','param'], desc:'Обход авторизации: условие всегда истинно.'},
      {id:'dump', name:'UNION SELECT (дамп)', damage:55, target:'users', blockedBy:['param'], desc:'Вытаскиваем всю таблицу пользователей.'},
    ],
    defenses:[
      {id:'validate', name:'Валидация ввода', sets:'validate', blocks:['bypass'], desc:'Отсекаем спецсимволы на входе.'},
      {id:'param', name:'Параметризованные запросы', sets:'param', blocks:['bypass','dump'], desc:'Данные и код запроса разделены.'},
    ],
    // ---- deep interactive content ----
    sim:{
      brief:'Форма входа NEO-BANK подставляет твой логин прямо в SQL без обработки. Задача: войти <b>без пароля</b>, обойдя проверку.',
      hint:"' OR '1'='1' --",
      vulnCode:'db.query(\n  "SELECT * FROM users WHERE login=\'" + login + "\' AND pass=\'" + pass + "\'"\n)',
      fixHint:'db.query(\n  "SELECT * FROM users WHERE login=? AND pass=?",\n  [login, pass]\n)',
    },
  },
  {
    id:'brute', name:'Брутфорс пароля', sub:'Систему заваливают попытками входа, пока пароль не подберётся.',
    icon:'⧉', tags:['аутентификация','пароли'], tables:['users','auth_log'], target:'users',
    attacks:[
      {id:'dict', name:'Словарь (rockyou)', damage:55, target:'users', blockedBy:['strongpw','lockout','twofa'], desc:'Гоним список утёкших паролей.'},
      {id:'spray', name:'Перебор вслепую', damage:55, target:'users', blockedBy:['ratelimit','lockout','twofa'], desc:'Тупой перебор без ограничений.'},
    ],
    defenses:[
      {id:'strongpw', name:'Политика паролей', sets:'strongpw', blocks:['dict'], desc:'Длина, регистр, спецсимволы.'},
      {id:'ratelimit', name:'Rate-limit', sets:'ratelimit', blocks:['spray'], desc:'Ограничение попыток в минуту.'},
      {id:'lockout', name:'Блокировка аккаунта', sets:'lockout', blocks:['dict','spray'], desc:'Заморозка после N неудач.'},
      {id:'twofa', name:'2FA', sets:'twofa', blocks:['dict','spray'], desc:'Второй фактор входа.'},
    ],
  },
  {
    id:'plain', name:'Пароли открытым текстом', sub:'В базе пароли лежат как есть — утечка = катастрофа.',
    icon:'⊘', tags:['хранение','пароли'], tables:['users','profiles'], target:'users',
    attacks:[
      {id:'read', name:'Прочитать пароли из дампа', damage:60, target:'users', blockedBy:['hash'], desc:'Читаем пароли строками из дампа.'},
      {id:'rainbow', name:'Радужные таблицы', damage:50, target:'users', blockedBy:['salt','hash'], desc:'Пробиваем хеши без соли.'},
    ],
    defenses:[
      {id:'hash', name:'Хеширование (bcrypt/argon2)', sets:'hash', blocks:['read','rainbow'], desc:'Храним необратимый хеш.'},
      {id:'salt', name:'Соль к хешу', sets:'salt', blocks:['rainbow'], desc:'Уникальная соль на каждого.'},
    ],
  },
  {
    id:'xss', name:'XSS в комментарии', sub:'Чужой скрипт выполняется в браузере другого пользователя.',
    icon:'❰❱', tags:['фронтенд','сессии'], tables:['comments','sessions'], target:'sessions',
    attacks:[
      {id:'inject', name:'<script> в комментарий', damage:50, target:'comments', blockedBy:['escape','sanitize','csp'], desc:'Оставляем комментарий с кодом.'},
      {id:'steal', name:'Угон cookie сессии', damage:55, target:'sessions', blockedBy:['httponly','csp'], desc:'Скрипт крадёт сессию.'},
    ],
    defenses:[
      {id:'escape', name:'Экранирование вывода', sets:'escape', blocks:['inject'], desc:'< > & становятся текстом.'},
      {id:'sanitize', name:'Санитайзер HTML', sets:'sanitize', blocks:['inject'], desc:'Вырезаем опасные теги.'},
      {id:'httponly', name:'HttpOnly-cookie', sets:'httponly', blocks:['steal'], desc:'Cookie недоступна из JS.'},
      {id:'csp', name:'CSP-политика', sets:'csp', blocks:['inject','steal'], desc:'Браузер режет чужие скрипты.'},
    ],
  },
  {
    id:'mitm', name:'Трафик без HTTPS', sub:'Данные летят открытым текстом — их можно перехватить.',
    icon:'⇄', tags:['сеть','шифрование'], tables:['traffic','credentials'], target:'credentials',
    attacks:[
      {id:'sniff', name:'Снифферим трафик', damage:55, target:'traffic', blockedBy:['tls'], desc:'Читаем пакеты в сети.'},
      {id:'mitm', name:'Man-in-the-middle', damage:55, target:'credentials', blockedBy:['tls','hsts'], desc:'Встаём между клиентом и сервером.'},
    ],
    defenses:[
      {id:'tls', name:'TLS / HTTPS', sets:'tls', blocks:['sniff','mitm'], desc:'Шифруем канал.'},
      {id:'hsts', name:'HSTS', sets:'hsts', blocks:['mitm'], desc:'Только HTTPS, без понижения.'},
    ],
  },
  {
    id:'access', name:'Сломанный контроль доступа', sub:'Пользователь дотягивается до чужих данных и админки.',
    icon:'⚿', tags:['права','логика'], tables:['users','admin_panel'], target:'admin_panel',
    attacks:[
      {id:'idor', name:'Подмена ID (IDOR)', damage:50, target:'users', blockedBy:['authz','owner'], desc:'Меняем id в адресе на чужой.'},
      {id:'forced', name:'Прямой заход в /admin', damage:60, target:'admin_panel', blockedBy:['authz'], desc:'Открываем админку напрямую.'},
    ],
    defenses:[
      {id:'authz', name:'Проверка прав', sets:'authz', blocks:['idor','forced'], desc:'Проверяем доступ на каждом запросе.'},
      {id:'owner', name:'Проверка владельца', sets:'owner', blocks:['idor'], desc:'Объект — только владельцу.'},
    ],
  },
];
const SCN_BY_ID = Object.fromEntries(SCENARIOS.map(s=>[s.id,s]));

const MODES=[
  {id:'mission',icon:'◈',name:'Миссии',desc:'Сломай систему, увидь последствия, затем закрой все дыры. Обучение по шагам.'},
  {id:'sandbox',icon:'⬡',name:'Песочница',desc:'Оба экрана активны. Свободно атакуй и защищай, наблюдай состояние.'},
  {id:'vsbot',  icon:'◆',name:'Против бота',desc:'Тебе достаётся случайная сторона, скрипт играет за противника.'},
];
const DIFFS=[
  {id:'novice',  name:'Новичок', hint:'готовые блоки, есть подсказки', botDelay:1500, botSmart:.4},
  {id:'operator',name:'Оператор',hint:'печатаешь сам, чинишь код',    botDelay:900,  botSmart:.75},
  {id:'ghost',   name:'Призрак', hint:'терминал, пишешь код с нуля',   botDelay:450,  botSmart:1},
];

/* =========================================================
   MENU
   ========================================================= */
const sel={mode:null,diff:null,scenario:null};
function buildMenu(){
  const mg=$('mode-grid'); mg.innerHTML='';
  MODES.forEach(m=>{const c=el('button','mode-card');
    c.innerHTML=`<span class="mc-icon">${m.icon}</span><span class="mc-name">${m.name}</span><span class="mc-desc">${m.desc}</span>`;
    c.onclick=()=>{sel.mode=m.id;markSel(mg,c);readout();}; mg.appendChild(c);});
  const dg=$('diff-grid'); dg.innerHTML='';
  DIFFS.forEach(d=>{const p=el('button','diff-pill');
    p.innerHTML=`${d.name}<small>${d.hint}</small>`;
    p.onclick=()=>{sel.diff=d.id;markSel(dg,p);readout();}; dg.appendChild(p);});
  const sg=$('scenario-grid'); sg.innerHTML='';
  SCENARIOS.forEach((s,i)=>{const t=el('button','scn-tile');
    const idx=String(i+1).padStart(2,'0');
    const deep=s.sim?'<span class="scn-tag" style="border-color:var(--attack);color:var(--attack)">полный геймплей</span>':'';
    t.innerHTML=`<span class="scn-idx">${idx} · ${s.icon}</span><span class="scn-name">${s.name}</span>
      <span class="scn-sub">${s.sub}</span><span class="scn-tags">${s.tags.map(x=>`<span class="scn-tag">${x}</span>`).join('')}${deep}</span>`;
    t.onclick=()=>{sel.scenario=s.id;markSel(sg,t);readout();}; sg.appendChild(t);});
}
function markSel(g,n){[...g.children].forEach(c=>c.classList.remove('sel'));n.classList.add('sel');}
function readout(){
  const p=[];
  if(sel.mode)p.push(MODES.find(m=>m.id===sel.mode).name);
  if(sel.diff)p.push(DIFFS.find(d=>d.id===sel.diff).name);
  if(sel.scenario)p.push(SCN_BY_ID[sel.scenario].name);
  $('selection-readout').textContent=p.length?p.join(' · '):'выбери режим, сложность и вектор';
  const bs=$('btn-start'); if(bs) bs.disabled=!(sel.mode&&sel.diff&&sel.scenario);
}
function launch(){
  if(!(sel.mode&&sel.diff&&sel.scenario)){toast('Выбери режим, сложность и вектор.');return;}
  const scn=SCN_BY_ID[sel.scenario];
  if(scn.sim && sel.mode!=='vsbot') startDeep(); else startBlock();
}

/* =========================================================
   SHARED: integrity bar helper, verdict, nav
   ========================================================= */
function setIntegrity(fillId,pctId,integrity){
  const f=$(fillId); f.style.width=integrity+'%'; $(pctId).textContent=integrity+'%';
  if(integrity<=33)f.style.background='linear-gradient(90deg,var(--breach),#ff7a88)';
  else if(integrity<=66)f.style.background='linear-gradient(90deg,var(--attack),var(--attack-hi))';
  else f.style.background='linear-gradient(90deg,var(--secured),#7bffbf)';
}
function show(id){document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));$(id).classList.add('active');window.scrollTo(0,0);}
let _toastT; function toast(m){const t=$('toast');t.textContent=m;t.hidden=false;clearTimeout(_toastT);_toastT=setTimeout(()=>t.hidden=true,2600);}
function verdict(win,msg){
  const v=$('verdict');v.hidden=false;
  const t=$('verdict-title');t.className='verdict-title '+(win?'win':'lose');t.textContent=win?'ПОБЕДА':'ПРОВАЛ';
  $('verdict-body').textContent=msg;
}

/* =========================================================
   DEEP ENGINE  (#game) — authored for SQL-инъекция
   ========================================================= */
let DG=null;
function startDeep(){
  const scn=SCN_BY_ID[sel.scenario], diff=DIFFS.find(d=>d.id===sel.diff);
  DG={
    scn, diff, mode:sel.mode,
    phase:'attack',            // attack | defend
    flags:{},                  // param / validate
    breached:false, lastPayload:'', over:false,
    sandboxSide:'attack',
    atkTier: diff.id==='novice'?'blocks':(diff.id==='operator'?'form':'term'),
    defTier: diff.id==='novice'?'blocks':'code',
  };
  show('game');
  $('g-title').textContent=scn.name;
  $('g-meta').textContent=`${MODES.find(m=>m.id===sel.mode).name} · ${diff.name}`;
  $('verdict').hidden=true;
  $('sim-login-input').value='';
  clearNode('g-console');
  gConsole('sys','сессия запущена. цель: neobank.io/login');
  initGraphFor(scn);
  setPhase('attack');
}

function setPhase(ph){
  DG.phase=ph;
  const chip=$('g-phase'), brief=$('g-brief'), bench=$('g-bench');
  if(DG.mode==='sandbox'){
    chip.textContent='ПЕСОЧНИЦА'; chip.className='phase-chip';
  } else if(ph==='attack'){
    chip.textContent='ФАЗА: АТАКА'; chip.className='phase-chip';
    brief.className='g-brief';
    brief.innerHTML=`<b>Атака.</b> ${DG.scn.sim.brief}`;
    bench.classList.remove('defend-mode');
  } else {
    chip.textContent='ФАЗА: ЗАЩИТА'; chip.className='phase-chip defend';
    brief.className='g-brief defend';
    brief.innerHTML='<b>Защита.</b> Та же атака сработала. Теперь закрой дыру по-настоящему — и повторный удар уйдёт в пустоту.';
    bench.classList.add('defend-mode');
  }
  if(DG.mode==='sandbox') brief.innerHTML='<b>Песочница.</b> Слева — живая цель. Переключай верстак между атакой и защитой и смотри, как меняется запрос и ответ базы.';
  renderTarget(); renderBench();
}

/* ----- LEFT: target system ----- */
function renderTarget(){
  wireSimForm();
  updateQuery($('sim-login-input').value||'');
  renderDump(null);
  $('g-target-state').textContent = DG.breached?'ВЗЛОМАНО':'онлайн';
  $('g-target-state').className='g-badge'+(DG.breached?' breached':(DG.flags.param?' secured':''));
  $('sim-verdict').textContent=''; $('sim-verdict').className='sim-verdict';
}
let _simWired=false;
function wireSimForm(){
  const inp=$('sim-login-input'), btn=$('sim-submit');
  inp.oninput=()=>updateQuery(inp.value);
  inp.onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();submitLogin(inp.value);}};
  btn.onclick=()=>submitLogin(inp.value);
  // in defend phase the form still works so you can re-test; in blocks/term attack tiers the user drives it differently
  inp.disabled = (DG.phase==='attack' && DG.atkTier==='term');
}

function activeFlags(){
  // in sandbox, defenses apply only when installed; in mission attack phase there are none yet
  return DG.flags;
}
function updateQuery(input){
  const f=activeFlags();
  const q=$('query-code'), note=$('query-note');
  if(f.param){
    note.textContent='параметризован';
    q.innerHTML=`<span class="kw">SELECT</span> * <span class="kw">FROM</span> users\n`+
      `<span class="kw">WHERE</span> login = <span class="param">?</span> <span class="kw">AND</span> pass = <span class="param">?</span>\n`+
      `<span class="param">-- параметры:</span> ['${esc(input)}', '••••••']`;
  } else if(f.validate && /['"\;]|--/.test(input)){
    note.textContent='ввод отклонён валидацией';
    q.innerHTML=`<span class="param">// ввод не прошёл валидацию, запрос не выполнен</span>`;
  } else {
    note.textContent='';
    const inj=/['"]|--|\bor\b/i.test(input);
    const shown = input ? `<span class="${inj?'inj':'str'}">${esc(input)}</span>` : '<span class="str"></span>';
    q.innerHTML=`<span class="kw">SELECT</span> * <span class="kw">FROM</span> users\n`+
      `<span class="kw">WHERE</span> login = '${shown}' <span class="kw">AND</span> pass = '<span class="str">••••••</span>'`;
  }
}

/* core: evaluate an injection attempt against the FAKE db */
function evalSQLi(input){
  const f=activeFlags();
  if(f.validate && /['"\;]|--/.test(input)) return {kind:'denied',reason:'validate'};
  if(f.param)                                return {kind:'denied',reason:'param',input};
  const s=input.trim();
  if(!s.includes("'")){
    return {kind:'deny'};                     // plain literal, no pass → no access
  }
  // tautology bypass  ' OR '1'='1  /  ' OR 1=1
  const taut=/'\s*or\s*'?([\w]+)'?\s*=\s*'?([\w]+)'?/i.exec(s);
  if(taut && taut[1].toLowerCase()===taut[2].toLowerCase()) return {kind:'dump',rows:SIM_USERS};
  // comment bypass   admin' --
  const cmt=/^\s*([\w.\-]+)'\s*(--|#)/.exec(s);
  if(cmt){const u=SIM_USERS.find(r=>r.login===cmt[1]); if(u) return {kind:'login',rows:[u]};}
  // broke the string but no valid bypass → sql error
  return {kind:'error'};
}

function submitLogin(input){
  if(DG.over && DG.mode!=='sandbox') return;
  const r=evalSQLi(input);
  const sv=$('sim-verdict');
  if(r.kind==='dump'||r.kind==='login'){
    DG.breached=true; DG.lastPayload=input;
    sv.className='sim-verdict ok';
    sv.textContent = r.kind==='dump' ? '⚠ ДОСТУП ПОЛУЧЕН — авторизация обойдена, база выгружена' : `⚠ ВХОД КАК ${r.rows[0].login.toUpperCase()} — без пароля`;
    renderDump(r.rows);
    $('g-target-state').textContent='ВЗЛОМАНО'; $('g-target-state').className='g-badge breached';
    graphBreach('users'); flashBreach();
    gConsole('hit',`пейлоад «${input}» → пробито (${r.rows.length} строк).`);
    updateQuery(input);
    setIntegrity('g-integrity','g-integrity-pct',0);
    onBreachAchieved();
  } else if(r.kind==='denied'){
    sv.className='sim-verdict deny';
    sv.textContent = r.reason==='param' ? '✓ доступ запрещён — ввод ушёл как параметр, не как код'
                    : '✓ доступ запрещён — ввод отклонён валидацией';
    renderDump([]);
    $('g-target-state').textContent='ЗАЩИЩЕНО'; $('g-target-state').className='g-badge secured';
    graphSecure(); updateQuery(input);
    gConsole('ok',`пейлоад «${input}» → отбито (${r.reason}).`);
    setIntegrity('g-integrity','g-integrity-pct',100);
    onDefenseHeld();
  } else if(r.kind==='error'){
    sv.className='sim-verdict deny'; sv.textContent='SQL error — строка сломана, но обхода нет. пробуй условие-тавтологию.';
    renderDump(null); gConsole('sys','ответ: 500 SQL syntax error');
  } else {
    sv.className='sim-verdict deny'; sv.textContent='доступ запрещён — неверные учётные данные';
    renderDump(null);
  }
}

function renderDump(rows){
  const box=$('db-result');
  if(rows===null){ box.innerHTML='<div class="db-empty">// база ждёт запроса…</div>'; return; }
  if(rows.length===0){ box.innerHTML='<div class="db-caption secured">0 строк — данные не отданы</div>'; return; }
  const head=`<div class="db-caption">УТЕЧКА: таблица users (${rows.length})</div>`;
  const rowsHtml=rows.map(r=>`<tr><td>${r.id}</td><td>${r.login}</td><td>${r.email}</td><td>${r.role}</td><td class="pw">${r.pass}</td></tr>`).join('');
  box.innerHTML=head+`<table class="db-table"><thead><tr><th>id</th><th>login</th><th>email</th><th>role</th><th>password</th></tr></thead><tbody>${rowsHtml}</tbody></table>`;
}

/* ----- RIGHT: workbench ----- */
function renderBench(){
  const body=$('bench-body'), title=$('bench-title'), tier=$('bench-tier');
  body.innerHTML='';
  // sandbox toggle
  if(DG.mode==='sandbox'){
    const tg=el('div','mode-toggle');
    const a=el('button',DG.sandboxSide==='attack'?'on':'','АТАКА');
    const d=el('button',DG.sandboxSide==='defense'?'on def':'','ЗАЩИТА');
    a.onclick=()=>{DG.sandboxSide='attack';renderBench();};
    d.onclick=()=>{DG.sandboxSide='defense';renderBench();};
    tg.append(a,d); body.appendChild(tg);
  }
  const side = DG.mode==='sandbox' ? DG.sandboxSide : (DG.phase==='attack'?'attack':'defense');
  if(side==='attack'){ title.textContent='АРСЕНАЛ'; tier.textContent=DG.atkTier==='blocks'?'блоки':(DG.atkTier==='form'?'ввод':'терминал'); benchAttack(body); }
  else { title.textContent='ВЕРСТАК ЗАЩИТЫ'; tier.textContent=DG.defTier==='blocks'?'блоки':'код'; benchDefense(body); }
}

function benchAttack(body){
  if(DG.atkTier==='blocks'){
    body.appendChild(labeled('Собери ввод для поля «Логин»'));
    const asm=el('div','assembled'); asm.id='asm';
    const pal=el('div','palette');
    const seed = ["admin","'"," OR ","'1'='1"," --","1","="];
    let cur='';
    seed.forEach(tk=>{const b=el('button','tok',tk);b.onclick=()=>{cur+=tk;asm.textContent=cur;$('sim-login-input').value=cur;updateQuery(cur);};pal.appendChild(b);});
    const clr=el('button','tok','⌫ очистить'); clr.onclick=()=>{cur='';asm.textContent='';$('sim-login-input').value='';updateQuery('');};
    pal.appendChild(clr);
    body.append(pal,asm);
    const act=el('div','bench-actions');
    const run=el('button','btn-run','▸ отправить'); run.onclick=()=>submitLogin(cur||$('sim-login-input').value);
    const hint=el('button','btn-hint','подсказка'); hint.onclick=()=>{cur=DG.scn.sim.hint;asm.textContent=cur;$('sim-login-input').value=cur;updateQuery(cur);toast('Готовый пейлоад собран — жми отправить.');};
    act.append(run,hint); body.appendChild(act);
  } else if(DG.atkTier==='form'){
    body.appendChild(labeled('Печатай прямо в форму слева. Запрос собирается вживую — найди ввод, ломающий условие.'));
    const act=el('div','bench-actions');
    const hint=el('button','btn-hint','подсказка'); hint.onclick=()=>{const p=DG.scn.sim.hint;$('sim-login-input').value=p;updateQuery(p);toast('Подставил классический пейлоад в форму.');};
    act.appendChild(hint); body.appendChild(act);
  } else { // terminal
    body.appendChild(labeled('Терминал. Команды: help · probe · try <пейлоад> · hint'));
    const term=el('div','terminal');
    const out=el('div','term-out'); out.id='term-out';
    const line=el('div','term-line');
    line.innerHTML='<span class="ps">atk@neobank$</span>';
    const ti=el('input','term-input'); ti.id='term-input'; ti.autocomplete='off'; ti.spellcheck=false;
    line.appendChild(ti); term.append(out,line); body.appendChild(term);
    ti.onkeydown=e=>{if(e.key==='Enter'){termCmd(ti.value.trim());ti.value='';}};
    termEcho('sys','terminal ready. type `help`.');
    setTimeout(()=>ti.focus(),50);
  }
}
function termEcho(cls,txt){const o=$('term-out');if(!o)return;const l=el('span','t '+cls,txt);o.appendChild(l);o.scrollTop=o.scrollHeight;}
function termCmd(c){
  if(!c)return; termEcho('you','atk@neobank$ '+c);
  const [cmd,...rest]=c.split(' '); const arg=rest.join(' ');
  if(cmd==='help') termEcho('sys','probe — прощупать форму · try <payload> — послать ввод · hint — пример');
  else if(cmd==='probe') termEcho('sys','форма отражает ввод в SQL без фильтрации. кавычка ломает строку → шанс на инъекцию.');
  else if(cmd==='hint') termEcho('sys','пример: try '+DG.scn.sim.hint);
  else if(cmd==='try'){ $('sim-login-input').value=arg; updateQuery(arg); submitLogin(arg);
    const r=evalSQLi(arg);
    if(r.kind==='dump'||r.kind==='login') termEcho('hit','→ доступ получен.');
    else if(r.kind==='denied') termEcho('ok','→ отбито защитой.');
    else if(r.kind==='error') termEcho('sys','→ SQL error, обхода нет.');
    else termEcho('sys','→ доступ запрещён.'); }
  else termEcho('sys','неизвестная команда. `help`');
}

function benchDefense(body){
  if(DG.defTier==='blocks'){
    body.appendChild(labeled('Установи защиту, затем повтори атаку слева.'));
    DG.scn.defenses.forEach(d=>{
      const b=el('button','dblock'+(DG.flags[d.sets]?' on':''));
      b.innerHTML=`<span class="db-name">⛨ ${d.name}</span><span class="db-desc">${d.desc}</span>`;
      b.disabled=!!DG.flags[d.sets];
      b.onclick=()=>{installDefense(d.sets);renderBench();retestLast();};
      body.appendChild(b);
    });
  } else {
    body.appendChild(labeled('Уязвимый код сервера. Перепиши его так, чтобы ввод шёл ПАРАМЕТРОМ, а не склеивался в строку.'));
    const vuln=el('pre','code-vuln',DG.scn.sim.vulnCode); body.appendChild(vuln);
    const ta=el('textarea','code-editor'); ta.id='fix-code'; ta.spellcheck=false;
    ta.value = DG.defTier==='code' && DG.diff.id==='operator'
      ? 'db.query(\n  "SELECT * FROM users WHERE login=? AND pass=?",\n  [ /* впиши сюда */ ]\n)'
      : '';
    ta.placeholder = DG.diff.id==='ghost' ? '// напиши безопасный запрос с нуля' : '';
    body.appendChild(ta);
    const fb=el('div','code-feedback'); fb.id='fix-fb'; body.appendChild(fb);
    const act=el('div','bench-actions');
    const run=el('button','btn-run def','▸ применить фикс'); run.onclick=()=>checkFix(ta.value);
    const hint=el('button','btn-hint','подсказка'); hint.onclick=()=>{ta.value=DG.scn.sim.fixHint;fb.textContent='';};
    act.append(run,hint); body.appendChild(act);
  }
}
function labeled(t){return el('div','bench-section-label',t);}

function checkFix(code){
  const fb=$('fix-fb'); const c=code.toLowerCase();
  const hasPlaceholder=/\?|\$\d|:\w+/.test(code);
  const hasParamsArray=/\[[^\]]*login[^\]]*\]|\[[^\]]*\bpass\b[^\]]*\]|\[\s*login/.test(c) || /,\s*\[/.test(code);
  const concatenates=/["']\s*\+\s*login|login\s*\+\s*["']|["']\s*\+\s*pass|pass\s*\+\s*["']/.test(c);
  const looksQuery=/select|query\(/.test(c);
  if(!looksQuery){fb.className='code-feedback err';fb.textContent='✗ не вижу запроса. Нужен db.query(...) с SELECT.';return;}
  if(concatenates){fb.className='code-feedback err';fb.textContent='✗ ввод всё ещё склеивается в строку через +. Именно это и есть дыра.';return;}
  if(!hasPlaceholder){fb.className='code-feedback err';fb.textContent='✗ нет плейсхолдера (? или $1). Данные должны идти отдельно от текста запроса.';return;}
  if(DG.diff.id==='ghost' && !hasParamsArray){fb.className='code-feedback err';fb.textContent='✗ плейсхолдер есть, но где массив параметров [login, pass]?';return;}
  fb.className='code-feedback ok'; fb.textContent='✓ верно — данные передаются параметром, инъекция больше не встраивается в код.';
  installDefense('param'); retestLast();
}

function installDefense(flag){
  DG.flags[flag]=true;
  gConsole('def','защита установлена: '+(flag==='param'?'параметризованные запросы':flag==='validate'?'валидация ввода':flag));
  graphSecure();
}
function retestLast(){
  const p=DG.lastPayload||DG.scn.sim.hint;
  $('sim-login-input').value=p; updateQuery(p);
  // simulate the same attack again
  const r=evalSQLi(p);
  const sv=$('sim-verdict');
  if(r.kind==='denied'){
    sv.className='sim-verdict deny';
    sv.textContent = r.reason==='param' ? '✓ повторная атака отбита — ввод ушёл параметром' : '✓ повторная атака отбита валидацией';
    renderDump([]); DG.breached=false;
    $('g-target-state').textContent='ЗАЩИЩЕНО'; $('g-target-state').className='g-badge secured';
    setIntegrity('g-integrity','g-integrity-pct',100);
    gConsole('ok','повторный удар «'+p+'» → в пустоту.');
    onDefenseHeld();
  } else {
    gConsole('sys','дыра ещё открыта — попробуй другую защиту.');
  }
}

/* win/phase transitions */
function onBreachAchieved(){
  if(DG.over) return;
  if(DG.mode==='mission' && DG.phase==='attack'){
    toast('Система пробита. Переходим к защите.');
    gConsole('sys','── ФАЗА ЗАЩИТЫ ──');
    setTimeout(()=>setPhase('defend'),700);
  }
  // sandbox: no forced transition
}
function onDefenseHeld(){
  if(DG.over) return;
  if(DG.mode==='mission' && DG.phase==='defend'){
    DG.over=true;
    verdict(true,'Ты не просто закрыл дыру блоком — ты понял, ПОЧЕМУ она была: ввод склеивался в код. Параметризованный запрос разделяет данные и команду, и инъекция превращается в безобидную строку.');
  }
}

/* =========================================================
   BLOCK ENGINE  (#arena) — for vsbot & non-authored scenarios
   ========================================================= */
let G=null;
function startBlock(){
  const scn=SCN_BY_ID[sel.scenario], diff=DIFFS.find(d=>d.id===sel.diff);
  let role='both'; if(sel.mode==='vsbot') role=Math.random()<.5?'attacker':'defender';
  G={scn,diff,mode:sel.mode,role,flags:{},attempted:new Set(),installed:new Set(),breach:0,
     phase:(sel.mode==='mission'?'attack':'free'),turn:role==='defender'?'bot':'player',over:false};
  if(sel.mode==='vsbot'&&diff.id==='ghost'){
    if(role==='attacker'){const d=scn.defenses[0];G.installed.add(d.id);G.flags[d.sets]=true;}
    else{const a=scn.attacks.find(x=>x.damage>0);G.attempted.add(a.id);}
  }
  show('arena');
  $('meta-scenario').textContent=scn.name;
  $('meta-mode').textContent=MODES.find(m=>m.id===sel.mode).name;
  $('meta-diff').textContent=diff.name;
  const rb=$('role-badge'); rb.className='role-badge';
  if(sel.mode==='vsbot'){rb.classList.add(role);rb.textContent=role==='attacker'?'ты: атака':'ты: защита';}
  else if(sel.mode==='sandbox')rb.textContent='режим: обе стороны';
  else rb.textContent='фаза: атака';
  renderBlocks(); recompute(); setObjective(); initGraphFor(scn);
  clearNode('attack-console'); clearNode('defense-console');
  bLog('attack-console','sys',`цель: ${scn.name.toLowerCase()}`);
  bLog('defense-console','sys',`таблиц в базе: ${scn.tables.length}`);
  $('verdict').hidden=true; _hardenedToasted=false;
  if(G.mode==='vsbot'&&G.turn==='bot')scheduleBot();
}
const isBlocked=a=>a.blockedBy.some(f=>G.flags[f]);
const damaging=()=>G.scn.attacks.filter(a=>a.damage>0);
const fullyHardened=()=>damaging().every(isBlocked);
function recompute(){let b=0;G.scn.attacks.forEach(a=>{if(G.attempted.has(a.id)&&!isBlocked(a))b+=a.damage;});G.breach=Math.min(100,b);setIntegrity('integrity-fill','integrity-pct',100-G.breach);}
function renderBlocks(){
  const ab=$('attack-blocks');ab.innerHTML='';
  G.scn.attacks.forEach(a=>{const b=el('button','block');
    b.innerHTML=`<span class="b-name">⚔ ${a.name}</span><span class="b-desc">${a.desc}</span><span class="b-state"></span>`;
    b.onclick=()=>playerAttack(a,b);a._node=b;ab.appendChild(b);refreshA(a);});
  const db=$('defense-blocks');db.innerHTML='';
  G.scn.defenses.forEach(d=>{const b=el('button','block');
    b.innerHTML=`<span class="b-name">⛨ ${d.name}</span><span class="b-desc">${d.desc}</span><span class="b-state"></span>`;
    b.onclick=()=>playerDefend(d,b);d._node=b;db.appendChild(b);refreshD(d);});
  perms();
}
function refreshA(a){const b=a._node,st=b.querySelector('.b-state');b.classList.remove('done','blocked','hit');
  if(G.attempted.has(a.id)){if(isBlocked(a)){b.classList.add('blocked');st.textContent='отбито';}
    else if(a.recon){b.classList.add('done');st.textContent='развед.';}else{b.classList.add('hit');st.textContent='пробито';}}else st.textContent='';}
function refreshD(d){const b=d._node,st=b.querySelector('.b-state');b.classList.toggle('installed',G.installed.has(d.id));st.textContent=G.installed.has(d.id)?'вкл':'';}
function perms(){
  const aOn=(G.mode==='sandbox')||(G.mode==='mission'&&G.phase==='attack')||(G.mode==='vsbot'&&G.role==='attacker'&&G.turn==='player');
  const dOn=(G.mode==='sandbox')||(G.mode==='mission'&&G.phase==='defend')||(G.mode==='vsbot'&&G.role==='defender'&&G.turn==='player');
  G.scn.attacks.forEach(a=>a._node.disabled=G.over||!aOn||G.attempted.has(a.id));
  G.scn.defenses.forEach(d=>d._node.disabled=G.over||!dOn||G.installed.has(d.id));
  $('attack-turn').className='turn-flag'+(aOn&&!G.over?' active':'');$('attack-turn').textContent=aOn&&!G.over?'твой ход':'';
  $('defense-turn').className='turn-flag'+(dOn&&!G.over?' active':'');$('defense-turn').textContent=dOn&&!G.over?'твой ход':'';
}
function playerAttack(a){if(a._node.disabled)return;fireA(a,false);if(G.over)return;if(G.mode==='vsbot'&&G.role==='attacker'){G.turn='bot';perms();scheduleBot();}}
function playerDefend(d){if(d._node.disabled)return;instD(d,false);if(G.over)return;if(G.mode==='vsbot'&&G.role==='defender'){G.turn='bot';perms();scheduleBot();}}
function fireA(a,byBot){
  G.attempted.add(a.id);const who=byBot?'bot':'atk';
  if(a.recon){bLog('attack-console',who,`${a.name} — зондируем…`);graphPing(a.target||G.scn.target);}
  else if(isBlocked(a)){bLog('attack-console',who,`${a.name} — запущено.`);bLog('defense-console','good',`${a.name}: отбито.`);graphShield();}
  else{bLog('attack-console',byBot?'bot':'bad',`${a.name} — ПРОБИТО. -${a.damage}.`);bLog('defense-console','bad',`брешь в ${a.target||G.scn.target}!`);graphBreach(a.target||G.scn.target);flashBreach();}
  recompute();refreshA(a);perms();checkEndB();
}
function instD(d,byBot){G.installed.add(d.id);G.flags[d.sets]=true;bLog('defense-console',byBot?'bot':'def',`установлено: ${d.name}.`);graphSecure();G.scn.attacks.forEach(a=>{if(G.attempted.has(a.id))refreshA(a);});recompute();refreshD(d);perms();checkEndB();}
let _hardenedToasted=false;
function checkEndB(){
  if(G.over)return;const br=G.breach>=100,hd=fullyHardened();
  if(G.mode==='mission'){
    if(G.phase==='attack'&&br){G.phase='defend';$('role-badge').textContent='фаза: защита';toast('Система пробита. Закрой дыры.');bLog('defense-console','sys','── ФАЗА ЗАЩИТЫ ──');setObjective();perms();return;}
    if(G.phase==='defend'&&hd)return endB(true,'Все векторы закрыты. Повторная атака отбита по всем фронтам.');return;
  }
  if(G.mode==='sandbox'){if(hd&&G.attempted.size>0&&!_hardenedToasted){toast('Система полностью укреплена ✓');_hardenedToasted=true;}return;}
  if(G.mode==='vsbot'){
    if(G.role==='attacker'){if(br)return endB(true,'Ты пробил систему раньше, чем бот её закрыл.');if(hd)return endB(false,'Бот закрыл все дыры. Вскрывать нечего.');}
    else{if(hd)return endB(true,'Ты закрыл все векторы. Атаки бота уходят в пустоту.');if(br)return endB(false,'Бот пробил систему до того, как ты прикрыл дыры.');}
  }
}
function endB(win,msg){G.over=true;perms();verdict(win,msg);}
function setObjective(){
  const o=$('objective');
  if(G.mode==='mission')o.innerHTML=G.phase==='attack'?'<b>Фаза 1 — атака.</b> Доведи целостность до <b>0%</b>, комбинируя векторы слева.':'<b>Фаза 2 — защита.</b> Перекрой <b>каждый</b> вектор атаки блоками справа.';
  else if(G.mode==='sandbox')o.innerHTML='<b>Песочница.</b> Атакуй слева, защищайся справа — смотри, как блоки меняют состояние базы.';
  else o.innerHTML=G.role==='attacker'?'<b>Ты атакуешь.</b> Пробей систему раньше, чем бот-защитник закроет дыры.':'<b>Ты защищаешь.</b> Перекрой векторы раньше, чем бот доведёт целостность до 0%.';
}
function scheduleBot(){if(G.over||G.turn!=='bot')return;setTimeout(botMove,G.diff.botDelay);}
function botMove(){
  if(G.over||G.turn!=='bot')return;const smart=Math.random()<=G.diff.botSmart;
  if(G.role==='defender'){
    const opts=G.scn.attacks.filter(a=>!G.attempted.has(a.id)&&(!isBlocked(a)||a.recon));
    const live=opts.filter(a=>!a.recon);let pick;
    if(live.length)pick=smart?live.reduce((m,a)=>a.damage>m.damage?a:m):rand(live);
    else if(opts.length)pick=rand(opts);else{checkEndB();return;}
    fireA(pick,true);
  }else{
    const rem=G.scn.defenses.filter(d=>!G.installed.has(d.id));if(!rem.length){checkEndB();return;}let pick;
    if(smart){const open=damaging().filter(a=>!isBlocked(a));const sc=rem.map(d=>({d,s:open.filter(a=>d.blocks.includes(a.id)).length}));sc.sort((x,y)=>y.s-x.s);pick=sc[0].s>0?sc[0].d:rand(rem);}else pick=rand(rem);
    instD(pick,true);
  }
  if(G.over)return;G.turn='player';perms();
}
function bLog(id,cls,txt){const c=$(id);const l=el('span','l '+cls,txt);c.appendChild(l);c.scrollTop=c.scrollHeight;while(c.children.length>60)c.removeChild(c.firstChild);}

/* =========================================================
   SHARED graphics: DB node graph + particles (canvas)
   ========================================================= */
let gCtx,gCanvas,gNodes=[],gParticles=[],gRAF=0,gW=0,gH=0,gTime=0,gTarget='users';
function initGraphFor(scn){
  gCanvas=$('graph-canvas'); if(!gCanvas){return;} gCtx=gCanvas.getContext('2d'); gTarget=scn.target;
  sizeGraph();
  gNodes=scn.tables.map((name,i)=>{const n=scn.tables.length;const ang=(i/n)*Math.PI*2-Math.PI/2;return{name,ang,radius:.34,sensitive:name===scn.target,breach:0,secure:0,r:16};});
  gParticles=[]; if(!gRAF)gRAF=requestAnimationFrame(graphLoop);
}
function sizeGraph(){if(!gCanvas)return;const rect=gCanvas.getBoundingClientRect();const dpr=Math.min(window.devicePixelRatio||1,2);gW=rect.width;gH=rect.height;gCanvas.width=gW*dpr;gCanvas.height=gH*dpr;gCtx.setTransform(dpr,0,0,dpr,0,0);}
function nodePos(n){const cx=gW/2,cy=gH/2,rr=Math.min(gW,gH)*n.radius;return{x:cx+Math.cos(n.ang)*rr,y:cy+Math.sin(n.ang)*rr};}
function graphLoop(){
  gRAF=requestAnimationFrame(graphLoop);
  if(!gCanvas || !$('arena').classList.contains('active'))return; // graph lives on arena
  gTime+=.016;gCtx.clearRect(0,0,gW,gH);gCtx.lineWidth=1;
  for(let i=0;i<gNodes.length;i++)for(let j=i+1;j<gNodes.length;j++){const a=nodePos(gNodes[i]),b=nodePos(gNodes[j]);gCtx.strokeStyle='rgba(53,224,214,.10)';gCtx.beginPath();gCtx.moveTo(a.x,a.y);gCtx.lineTo(b.x,b.y);gCtx.stroke();}
  gNodes.forEach(n=>{const p=nodePos(n);n.breach*=.94;n.secure*=.95;const pulse=n.sensitive?1+Math.sin(gTime*2)*.12:1;const rr=n.r*pulse;let col='53,224,214',glow=6;if(n.breach>.05){col='255,59,84';glow=6+n.breach*22;}else if(n.secure>.05){col='52,227,138';glow=6+n.secure*18;}
    gCtx.save();gCtx.shadowColor=`rgba(${col},.9)`;gCtx.shadowBlur=glow;gCtx.fillStyle=`rgba(${col},${n.sensitive?.28:.16})`;gCtx.beginPath();gCtx.arc(p.x,p.y,rr,0,7);gCtx.fill();gCtx.shadowBlur=0;gCtx.lineWidth=1.5;gCtx.strokeStyle=`rgba(${col},.85)`;gCtx.stroke();gCtx.restore();
    gCtx.fillStyle='rgba(232,230,220,.65)';gCtx.font='10px "JetBrains Mono",monospace';gCtx.textAlign='center';gCtx.fillText(n.name,p.x,p.y+rr+12);if(n.sensitive){gCtx.fillStyle='rgba(255,157,43,.8)';gCtx.fillText('◆',p.x,p.y+3);}});
  for(let i=gParticles.length-1;i>=0;i--){const pt=gParticles[i];pt.x+=pt.vx;pt.y+=pt.vy;pt.life-=.02;if(pt.life<=0){gParticles.splice(i,1);continue;}gCtx.globalAlpha=Math.max(0,pt.life);gCtx.fillStyle=pt.color;gCtx.fillRect(pt.x,pt.y,2.2,2.2);gCtx.globalAlpha=1;}
}
function findNode(name){return gNodes.find(n=>n.name===name)||gNodes.find(n=>n.sensitive)||gNodes[0];}
function graphBreach(t){const n=findNode(t);if(!n)return;n.breach=1;const p=nodePos(n);for(let i=0;i<26&&gParticles.length<160;i++)gParticles.push({x:p.x,y:p.y,vx:-2-Math.random()*2.4,vy:(Math.random()-.5)*2,life:1,color:'#FF3B54'});}
function graphPing(t){const n=findNode(t);if(n)n.secure=.4;}
function graphShield(){gNodes.forEach(n=>n.secure=Math.max(n.secure,.7));}
function graphSecure(){gNodes.forEach(n=>{n.secure=1;n.breach*=.3;});}

/* misc shared */
function gConsole(cls,txt){const c=$('g-console');if(!c)return;const l=el('span','l '+cls,txt);c.appendChild(l);c.scrollTop=c.scrollHeight;while(c.children.length>60)c.removeChild(c.firstChild);}
function clearNode(id){const n=$(id);if(n)n.innerHTML='';}
function flashBreach(){document.body.classList.add('breach-flash');setTimeout(()=>document.body.classList.remove('breach-flash'),500);}

/* =========================================================
   AMBIENT starfield
   ========================================================= */
function ambient(){
  const c=$('bg-canvas'),x=c.getContext('2d');let w,h,stars,mx=0,my=0;
  function size(){w=c.width=innerWidth;h=c.height=innerHeight;stars=Array.from({length:Math.min(90,Math.floor(w*h/16000))},()=>({x:Math.random()*w,y:Math.random()*h,z:Math.random()*.8+.2,tw:Math.random()*6}));}
  size();addEventListener('resize',()=>{size();sizeGraph();});
  addEventListener('mousemove',e=>{mx=(e.clientX/innerWidth-.5);my=(e.clientY/innerHeight-.5);});
  (function loop(t){requestAnimationFrame(loop);x.clearRect(0,0,w,h);stars.forEach(s=>{const px=s.x+mx*22*s.z,py=s.y+my*22*s.z;const a=.25+Math.abs(Math.sin(t/900+s.tw))*.5*s.z;x.fillStyle=`rgba(120,150,170,${a})`;x.fillRect(px,py,s.z*1.6,s.z*1.6);});})(0);
}

/* =========================================================
   WIRING / INIT
   ========================================================= */
function toMenu(){$('verdict').hidden=true;_hardenedToasted=false;show('menu');}
function retry(){$('verdict').hidden=true;const scn=SCN_BY_ID[sel.scenario];if(scn.sim&&sel.mode!=='vsbot')startDeep();else startBlock();}
function wire(){
  $('btn-start').onclick=launch;
  $('btn-back').onclick=toMenu;
  $('g-back').onclick=toMenu;
  $('btn-menu').onclick=toMenu;
  $('btn-retry').onclick=retry;
}
buildMenu();wire();ambient();

})();
