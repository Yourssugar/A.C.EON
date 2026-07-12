/* =========================================================
   БРЕШЬ // cyber range — engine
   Vanilla JS, no deps. Data-driven: every vulnerability is a
   block of data; the engine is generic across all scenarios.
   ========================================================= */
(() => {
'use strict';

/* ---------------------------------------------------------
   1. DATA
   Attack:  {id, name, desc, damage, blockedBy:[flagId], target, recon?}
   Defense: {id, name, desc, sets:flagId, blocks:[attackId]}
   An attack is "blocked" if ANY flag in blockedBy is installed.
   Attacker wins when integrity hits 0 (breach >= 100).
   Defender wins when every damaging attack is blocked.
   --------------------------------------------------------- */
const SCENARIOS = [
  {
    id:'sqli', name:'SQL-инъекция', sub:'Ввод пользователя попадает прямо в запрос к базе.',
    icon:'⌘', tags:['база данных','ввод'],
    tables:['users','sessions','products'], target:'users',
    attacks:[
      {id:'probe', name:"Пробный ввод  '", damage:0, recon:true, blockedBy:[],
        desc:'Кидаем кавычку в форму логина и смотрим на реакцию — фильтруется ли ввод.'},
      {id:'bypass', name:"' OR '1'='1", damage:50, target:'users', blockedBy:['validate','param'],
        desc:'Классический обход авторизации: условие всегда истинно, логин без пароля.'},
      {id:'dump', name:'UNION SELECT (дамп)', damage:55, target:'users', blockedBy:['param'],
        desc:'Приклеиваем свой запрос и вытаскиваем всю таблицу пользователей.'},
    ],
    defenses:[
      {id:'validate', name:'Валидация ввода', sets:'validate', blocks:['bypass'],
        desc:'Отсекаем спецсимволы и проверяем формат данных на входе.'},
      {id:'param', name:'Параметризованные запросы', sets:'param', blocks:['bypass','dump'],
        desc:'Данные и текст запроса разделены — вставить свой код нельзя в принципе.'},
    ],
  },
  {
    id:'brute', name:'Брутфорс пароля', sub:'Систему заваливают попытками входа, пока пароль не подберётся.',
    icon:'⧉', tags:['аутентификация','пароли'],
    tables:['users','auth_log'], target:'users',
    attacks:[
      {id:'dict', name:'Словарь (rockyou)', damage:55, target:'users', blockedBy:['strongpw','lockout','twofa'],
        desc:'Гоним список из миллионов утёкших паролей. Слабый пароль падёт за секунды.'},
      {id:'spray', name:'Перебор вслепую', damage:55, target:'users', blockedBy:['ratelimit','lockout','twofa'],
        desc:'Тупой перебор комбинаций без ограничений на число попыток.'},
    ],
    defenses:[
      {id:'strongpw', name:'Политика паролей', sets:'strongpw', blocks:['dict'],
        desc:'Длина, регистр, спецсимволы — словарь по такому уже не пройдёт.'},
      {id:'ratelimit', name:'Rate-limit', sets:'ratelimit', blocks:['spray'],
        desc:'Ограничиваем число попыток в минуту — перебор становится вечностью.'},
      {id:'lockout', name:'Блокировка аккаунта', sets:'lockout', blocks:['dict','spray'],
        desc:'После N неудач аккаунт замораживается. Останавливает оба вектора.'},
      {id:'twofa', name:'2FA', sets:'twofa', blocks:['dict','spray'],
        desc:'Второй фактор: даже угаданный пароль бесполезен без кода.'},
    ],
  },
  {
    id:'plain', name:'Пароли открытым текстом', sub:'В базе пароли лежат как есть — утечка = катастрофа.',
    icon:'⊘', tags:['хранение','пароли'],
    tables:['users','profiles'], target:'users',
    attacks:[
      {id:'read', name:'Прочитать пароли из дампа', damage:60, target:'users', blockedBy:['hash'],
        desc:'Получили дамп базы — и просто читаем пароли строками. Если они не хешированы.'},
      {id:'rainbow', name:'Радужные таблицы', damage:50, target:'users', blockedBy:['salt','hash'],
        desc:'Даже хеши без соли пробиваются заранее посчитанными таблицами.'},
    ],
    defenses:[
      {id:'hash', name:'Хеширование (bcrypt/argon2)', sets:'hash', blocks:['read','rainbow'],
        desc:'Храним не пароль, а необратимый хеш. Прочитать напрямую уже нельзя.'},
      {id:'salt', name:'Соль к хешу', sets:'salt', blocks:['rainbow'],
        desc:'Уникальная соль на каждого — радужные таблицы становятся бесполезны.'},
    ],
  },
  {
    id:'xss', name:'XSS в комментарии', sub:'Чужой скрипт выполняется в браузере другого пользователя.',
    icon:'❰❱', tags:['фронтенд','сессии'],
    tables:['comments','sessions'], target:'sessions',
    attacks:[
      {id:'inject', name:'<script> в комментарий', damage:50, target:'comments', blockedBy:['escape','sanitize','csp'],
        desc:'Оставляем комментарий с кодом. Если вывод не экранирован — он исполнится у всех.'},
      {id:'steal', name:'Угон cookie сессии', damage:55, target:'sessions', blockedBy:['httponly','csp'],
        desc:'Внедрённый скрипт читает cookie и отправляет сессию нам. Логинимся как жертва.'},
    ],
    defenses:[
      {id:'escape', name:'Экранирование вывода', sets:'escape', blocks:['inject'],
        desc:'Превращаем < > & в безопасные символы — код становится просто текстом.'},
      {id:'sanitize', name:'Санитайзер HTML', sets:'sanitize', blocks:['inject'],
        desc:'Вырезаем опасные теги и атрибуты из пользовательского HTML.'},
      {id:'httponly', name:'HttpOnly-cookie', sets:'httponly', blocks:['steal'],
        desc:'Cookie недоступна из JavaScript — угнать её скриптом уже не выйдет.'},
      {id:'csp', name:'CSP-политика', sets:'csp', blocks:['inject','steal'],
        desc:'Браузер запрещает выполнять чужие скрипты. Ловит оба вектора.'},
    ],
  },
  {
    id:'mitm', name:'Трафик без HTTPS', sub:'Данные летят открытым текстом — их можно перехватить.',
    icon:'⇄', tags:['сеть','шифрование'],
    tables:['traffic','credentials'], target:'credentials',
    attacks:[
      {id:'sniff', name:'Снифферим трафик', damage:55, target:'traffic', blockedBy:['tls'],
        desc:'Сидим в той же сети и читаем пакеты. Логины и пароли — как на ладони.'},
      {id:'mitm', name:'Man-in-the-middle', damage:55, target:'credentials', blockedBy:['tls','hsts'],
        desc:'Встаём между клиентом и сервером, подменяем ответы, крадём данные.'},
    ],
    defenses:[
      {id:'tls', name:'TLS / HTTPS', sets:'tls', blocks:['sniff','mitm'],
        desc:'Шифруем канал. Перехваченный трафик превращается в мусор.'},
      {id:'hsts', name:'HSTS', sets:'hsts', blocks:['mitm'],
        desc:'Браузер обязан ходить только по HTTPS — понижение до HTTP невозможно.'},
    ],
  },
  {
    id:'access', name:'Сломанный контроль доступа', sub:'Пользователь дотягивается до чужих данных и админки.',
    icon:'⚿', tags:['права','логика'],
    tables:['users','admin_panel'], target:'admin_panel',
    attacks:[
      {id:'idor', name:'Подмена ID (IDOR)', damage:50, target:'users', blockedBy:['authz','owner'],
        desc:'Меняем id=123 на id=124 в адресе — и видим чужой профиль. Проверки-то нет.'},
      {id:'forced', name:'Прямой заход в /admin', damage:60, target:'admin_panel', blockedBy:['authz'],
        desc:'Просто открываем админскую ссылку. Раз доступ никто не проверяет — мы внутри.'},
    ],
    defenses:[
      {id:'authz', name:'Проверка прав', sets:'authz', blocks:['idor','forced'],
        desc:'На каждом запросе проверяем: а этому пользователю вообще можно сюда?'},
      {id:'owner', name:'Проверка владельца', sets:'owner', blocks:['idor'],
        desc:'Объект отдаём, только если он принадлежит запросившему.'},
    ],
  },
];
const SCN_BY_ID = Object.fromEntries(SCENARIOS.map(s => [s.id, s]));

const MODES = [
  {id:'mission', icon:'◈', name:'Миссии', desc:'Сломай систему, увидь последствия, затем закрой все дыры. Обучение по шагам.'},
  {id:'sandbox', icon:'⬡', name:'Песочница', desc:'Оба экрана всегда активны. Свободно экспериментируй: атакуй и защищай, наблюдай.'},
  {id:'vsbot',   icon:'◆', name:'Против бота', desc:'Тебе достаётся случайная сторона. Скрипт играет за противника и растёт по сложности.'},
];

const DIFFS = [
  {id:'novice',   name:'Новичок', hint:'бот медленный, есть подсказки', botDelay:1500, botSmart:.4},
  {id:'operator', name:'Оператор', hint:'ровный противник', botDelay:900, botSmart:.75},
  {id:'ghost',    name:'Призрак', hint:'бот быстрый и точный', botDelay:450, botSmart:1},
];

/* ---------------------------------------------------------
   2. STATE
   --------------------------------------------------------- */
const sel = { mode:null, diff:null, scenario:null };
let G = null; // active game state

const $ = id => document.getElementById(id);
const el = (tag, cls, txt) => { const e=document.createElement(tag); if(cls)e.className=cls; if(txt!=null)e.textContent=txt; return e; };

/* ---------------------------------------------------------
   3. MENU
   --------------------------------------------------------- */
function buildMenu(){
  const mg = $('mode-grid'); mg.innerHTML='';
  MODES.forEach(m=>{
    const c = el('button','mode-card');
    c.innerHTML = `<span class="mc-icon">${m.icon}</span><span class="mc-name">${m.name}</span><span class="mc-desc">${m.desc}</span>`;
    c.onclick = ()=>{ sel.mode=m.id; markSel(mg,c); updateReadout(); };
    mg.appendChild(c);
  });

  const dg = $('diff-grid'); dg.innerHTML='';
  DIFFS.forEach(d=>{
    const p = el('button','diff-pill');
    p.innerHTML = `${d.name}<small>${d.hint}</small>`;
    p.onclick = ()=>{ sel.diff=d.id; markSel(dg,p); updateReadout(); };
    dg.appendChild(p);
  });

  const sg = $('scenario-grid'); sg.innerHTML='';
  SCENARIOS.forEach((s,i)=>{
    const t = el('button','scn-tile');
    const idx = String(i+1).padStart(2,'0');
    const tags = s.tags.map(x=>`<span class="scn-tag">${x}</span>`).join('');
    t.innerHTML = `<span class="scn-idx">${idx} · ${s.icon}</span>
      <span class="scn-name">${s.name}</span>
      <span class="scn-sub">${s.sub}</span>
      <span class="scn-tags">${tags}</span>`;
    t.onclick = ()=>{ sel.scenario=s.id; markSel(sg,t); updateReadout(); };
    sg.appendChild(t);
  });
}
function markSel(group, node){ [...group.children].forEach(c=>c.classList.remove('sel')); node.classList.add('sel'); }
function updateReadout(){
  const parts=[];
  if(sel.mode)   parts.push(MODES.find(m=>m.id===sel.mode).name);
  if(sel.diff)   parts.push(DIFFS.find(d=>d.id===sel.diff).name);
  if(sel.scenario) parts.push(SCN_BY_ID[sel.scenario].name);
  $('selection-readout').textContent = parts.length ? parts.join(' · ') : 'выбери режим, сложность и вектор';
  const ready = !!(sel.mode && sel.diff && sel.scenario);
  const bs=$('btn-start'); if(bs) bs.disabled = !ready;
}
function launch(){
  if(sel.mode && sel.diff && sel.scenario) startGame();
  else toast('Выбери режим, сложность и вектор.');
}

/* ---------------------------------------------------------
   4. GAME SETUP
   --------------------------------------------------------- */
function startGame(){
  const scn = SCN_BY_ID[sel.scenario];
  const diff = DIFFS.find(d=>d.id===sel.diff);
  let role = 'both';
  if(sel.mode==='vsbot') role = Math.random()<.5 ? 'attacker' : 'defender';

  G = {
    scn, diff, mode:sel.mode, role,
    flags:{}, attempted:new Set(), installed:new Set(),
    breach:0, phase:(sel.mode==='mission'?'attack':'free'),
    turn: role==='defender' ? 'bot' : 'player',
    over:false, busy:false,
  };

  // ghost difficulty: seed the opposing bot with one advantage
  if(sel.mode==='vsbot' && diff.id==='ghost'){
    if(role==='attacker'){ const d=scn.defenses[0]; G.installed.add(d.id); G.flags[d.sets]=true; }
    else { const a=scn.attacks.find(x=>x.damage>0); land(a,true); }
  }

  show('arena');
  $('meta-scenario').textContent = scn.name;
  $('meta-mode').textContent = MODES.find(m=>m.id===sel.mode).name;
  $('meta-diff').textContent = diff.name;

  const rb = $('role-badge');
  rb.className='role-badge';
  if(sel.mode==='vsbot'){ rb.classList.add(role); rb.textContent = role==='attacker'?'ты: атака':'ты: защита'; }
  else if(sel.mode==='sandbox'){ rb.textContent='режим: обе стороны'; }
  else { rb.textContent='фаза: атака'; }

  renderBlocks(); recompute(); setObjective(); initGraph();
  clearConsole('attack-console'); clearConsole('defense-console');
  logLine('attack-console','sys', `цель: ${scn.name.toLowerCase()}`);
  logLine('defense-console','sys', `таблиц в базе: ${scn.tables.length}`);
  $('verdict').hidden = true;

  if(G.mode==='vsbot' && G.turn==='bot') scheduleBot();
}

/* ---------------------------------------------------------
   5. CORE LOGIC
   --------------------------------------------------------- */
const isBlocked = a => a.blockedBy.some(f => G.flags[f]);
const damaging  = () => G.scn.attacks.filter(a=>a.damage>0);
const fullyHardened = () => damaging().every(isBlocked);

function land(a, silent){ // register an attempted attack
  G.attempted.add(a.id);
}
function recompute(){
  let b=0;
  G.scn.attacks.forEach(a=>{ if(G.attempted.has(a.id) && !isBlocked(a)) b+=a.damage; });
  G.breach = Math.min(100, b);
  const integrity = 100 - G.breach;
  $('integrity-fill').style.width = integrity+'%';
  $('integrity-pct').textContent = integrity+'%';
  const fill=$('integrity-fill');
  if(integrity<=33) fill.style.background='linear-gradient(90deg,var(--breach),#ff7a88)';
  else if(integrity<=66) fill.style.background='linear-gradient(90deg,var(--attack),var(--attack-hi))';
  else fill.style.background='linear-gradient(90deg,var(--secured),#7bffbf)';
}

function renderBlocks(){
  const scn=G.scn;
  const ab=$('attack-blocks'); ab.innerHTML='';
  scn.attacks.forEach(a=>{
    const b=el('button','block');
    b.innerHTML = `<span class="b-name">⚔ ${a.name}</span><span class="b-desc">${a.desc}</span><span class="b-state"></span>`;
    b.onclick=()=>playerAttack(a,b);
    a._node=b; ab.appendChild(b);
    refreshAttackNode(a);
  });
  const db=$('defense-blocks'); db.innerHTML='';
  scn.defenses.forEach(d=>{
    const b=el('button','block');
    b.innerHTML = `<span class="b-name">⛨ ${d.name}</span><span class="b-desc">${d.desc}</span><span class="b-state"></span>`;
    b.onclick=()=>playerDefend(d,b);
    d._node=b; db.appendChild(b);
    refreshDefenseNode(d);
  });
  applyPanelPermissions();
}

function refreshAttackNode(a){
  const b=a._node, st=b.querySelector('.b-state');
  b.classList.remove('done','blocked','hit');
  if(G.attempted.has(a.id)){
    if(isBlocked(a)){ b.classList.add('blocked'); st.textContent='отбито'; }
    else if(a.recon){ b.classList.add('done'); st.textContent='развед.'; }
    else { b.classList.add('hit'); st.textContent='пробито'; }
  } else if(isBlocked(a) && !a.recon){ st.textContent=''; }
  else st.textContent='';
}
function refreshDefenseNode(d){
  const b=d._node, st=b.querySelector('.b-state');
  b.classList.toggle('installed', G.installed.has(d.id));
  st.textContent = G.installed.has(d.id) ? 'вкл' : '';
}

function applyPanelPermissions(){
  const scn=G.scn;
  const attackActive = (G.mode==='sandbox')
    || (G.mode==='mission' && G.phase==='attack')
    || (G.mode==='vsbot' && G.role==='attacker' && G.turn==='player');
  const defendActive = (G.mode==='sandbox')
    || (G.mode==='mission' && G.phase==='defend')
    || (G.mode==='vsbot' && G.role==='defender' && G.turn==='player');

  scn.attacks.forEach(a=>{
    a._node.disabled = G.over || !attackActive || G.attempted.has(a.id);
  });
  scn.defenses.forEach(d=>{
    d._node.disabled = G.over || !defendActive || G.installed.has(d.id);
  });
  $('attack-turn').className='turn-flag'+(attackActive&&!G.over?' active':'');
  $('attack-turn').textContent = attackActive&&!G.over?'твой ход':'';
  $('defense-turn').className='turn-flag'+(defendActive&&!G.over?' active':'');
  $('defense-turn').textContent = defendActive&&!G.over?'твой ход':'';
}

/* ----- player actions ----- */
function playerAttack(a, node){
  if(node.disabled) return;
  fireAttack(a, false);
  if(G.over) return;
  if(G.mode==='vsbot' && G.role==='attacker'){ G.turn='bot'; applyPanelPermissions(); scheduleBot(); }
}
function playerDefend(d, node){
  if(node.disabled) return;
  installDefense(d, false);
  if(G.over) return;
  if(G.mode==='vsbot' && G.role==='defender'){ G.turn='bot'; applyPanelPermissions(); scheduleBot(); }
}

/* ----- resolved effects ----- */
function fireAttack(a, byBot){
  land(a);
  const who = byBot?'bot':'atk';
  if(a.recon){
    logLine('attack-console', who, `${a.name} — зондируем вход…`);
    logLine('defense-console','sys', `аномальный ввод в форме. фильтр: ${G.flags.validate||G.flags.param?'да':'НЕТ'}`);
    graphPing(a.target||G.scn.target);
  } else if(isBlocked(a)){
    logLine('attack-console', who, `${a.name} — запущено.`);
    logLine('defense-console','good', `${a.name}: атака отбита защитой.`);
    graphShield();
  } else {
    logLine('attack-console', byBot?'bot':'bad', `${a.name} — ПРОБИТО. -${a.damage} целостности.`);
    logLine('defense-console','bad', `брешь в таблице ${a.target||G.scn.target}!`);
    graphBreach(a.target||G.scn.target);
    document.body.classList.add('breach-flash');
    setTimeout(()=>document.body.classList.remove('breach-flash'),500);
  }
  recompute(); refreshAttackNode(a); applyPanelPermissions();
  checkEnd();
}
function installDefense(d, byBot){
  G.installed.add(d.id); G.flags[d.sets]=true;
  logLine('defense-console', byBot?'bot':'def', `установлено: ${d.name}.`);
  graphSecure();
  // re-evaluate previously landed attacks
  G.scn.attacks.forEach(a=>{ if(G.attempted.has(a.id)) refreshAttackNode(a); });
  recompute(); refreshDefenseNode(d); applyPanelPermissions();
  checkEnd();
}

/* ---------------------------------------------------------
   6. WIN / LOSE / PHASE
   --------------------------------------------------------- */
function checkEnd(){
  if(G.over) return;
  const breached = G.breach>=100;
  const hardened = fullyHardened();

  if(G.mode==='mission'){
    if(G.phase==='attack' && breached){
      G.phase='defend';
      $('role-badge').textContent='фаза: защита';
      toast('Система пробита. Теперь закрой дыры.');
      logLine('defense-console','sys','── ФАЗА ЗАЩИТЫ ── закрой все векторы.');
      setObjective(); applyPanelPermissions();
      return;
    }
    if(G.phase==='defend' && hardened){
      return end(true, 'Все векторы закрыты. Симулированная повторная атака отбита по всем фронтам.');
    }
    return;
  }

  if(G.mode==='sandbox'){
    if(hardened && G.attempted.size>0) toastOnce('Система полностью укреплена ✓');
    return; // free play, no hard end
  }

  if(G.mode==='vsbot'){
    if(G.role==='attacker'){
      if(breached) return end(true, 'Ты пробил систему раньше, чем бот успел её закрыть.');
      if(hardened) return end(false, 'Бот закрыл все дыры. Больше вскрыть нечего.');
    } else { // defender
      if(hardened) return end(true, 'Ты закрыл все векторы. Атаки бота уходят в пустоту.');
      if(breached) return end(false, 'Бот пробил систему до того, как ты успел прикрыть все дыры.');
    }
  }
}
let _hardenedToasted=false;
function toastOnce(m){ if(!_hardenedToasted){ toast(m); _hardenedToasted=true; } }

function end(win, msg){
  G.over=true; applyPanelPermissions();
  const v=$('verdict'); v.hidden=false;
  const t=$('verdict-title');
  t.className='verdict-title '+(win?'win':'lose');
  t.textContent = win ? 'ПОБЕДА' : 'ПРОВАЛ';
  $('verdict-body').textContent = msg;
}

function setObjective(){
  const o=$('objective'); const scn=G.scn;
  if(G.mode==='mission'){
    o.innerHTML = G.phase==='attack'
      ? `<b>Фаза 1 — атака.</b> Пробей защиту: доведи целостность до <b>0%</b>, комбинируя векторы слева.`
      : `<b>Фаза 2 — защита.</b> Установи блоки справа так, чтобы <b>каждый</b> вектор атаки был перекрыт.`;
  } else if(G.mode==='sandbox'){
    o.innerHTML = `<b>Песочница.</b> Атакуй слева, защищайся справа — смотри, как каждый блок меняет состояние базы. Ошибиться нельзя, это твоя лаборатория.`;
  } else {
    o.innerHTML = G.role==='attacker'
      ? `<b>Ты атакуешь.</b> Пробей систему (целостность → 0%) раньше, чем бот-защитник закроет все дыры.`
      : `<b>Ты защищаешь.</b> Перекрой все векторы раньше, чем бот-атакующий доведёт целостность до 0%.`;
  }
}

/* ---------------------------------------------------------
   7. BOT AI
   --------------------------------------------------------- */
function scheduleBot(){
  if(G.over || G.turn!=='bot') return;
  G.busy=true;
  setTimeout(botMove, G.diff.botDelay);
}
function botMove(){
  if(G.over || G.turn!=='bot') return;
  const smart = Math.random() <= G.diff.botSmart;

  if(G.role==='defender'){ // bot attacks
    const options = G.scn.attacks.filter(a=>!G.attempted.has(a.id) && (!isBlocked(a) || a.recon));
    const live = options.filter(a=>!a.recon);
    let pick;
    if(live.length){
      pick = smart ? live.reduce((m,a)=>a.damage>m.damage?a:m) : rand(live);
    } else if(options.length){ pick = rand(options); }
    else { checkEnd(); return; } // nothing left to try
    fireAttack(pick, true);
  } else { // role attacker → bot defends
    const remaining = G.scn.defenses.filter(d=>!G.installed.has(d.id));
    if(!remaining.length){ checkEnd(); return; }
    let pick;
    if(smart){
      // defense that blocks the most currently-open damaging attacks
      const open = damaging().filter(a=>!isBlocked(a));
      const scored = remaining.map(d=>({d, s:open.filter(a=>d.blocks.includes(a.id)).length}));
      scored.sort((x,y)=>y.s-x.s);
      pick = (scored[0].s>0 ? scored[0].d : rand(remaining));
    } else pick = rand(remaining);
    installDefense(pick, true);
  }

  if(G.over) return;
  G.turn='player'; applyPanelPermissions();
}
const rand = arr => arr[Math.floor(Math.random()*arr.length)];

/* ---------------------------------------------------------
   8. CONSOLE
   --------------------------------------------------------- */
function logLine(consoleId, cls, text){
  const c=$(consoleId);
  const line=el('span','l '+cls, text);
  c.appendChild(line); c.scrollTop=c.scrollHeight;
  while(c.children.length>60) c.removeChild(c.firstChild);
}
function clearConsole(id){ $(id).innerHTML=''; }

/* ---------------------------------------------------------
   9. GRAPH CANVAS (DB node view + particles)
   --------------------------------------------------------- */
let gCtx, gCanvas, gNodes=[], gParticles=[], gRAF=0, gW=0, gH=0, gTime=0;
function initGraph(){
  gCanvas=$('graph-canvas'); gCtx=gCanvas.getContext('2d');
  sizeGraph();
  gNodes = G.scn.tables.map((name,i)=>{
    const n=G.scn.tables.length;
    const ang = (i/n)*Math.PI*2 - Math.PI/2;
    return { name, ang, radius:.34, sensitive:name===G.scn.target, breach:0, secure:0, r:16 };
  });
  gParticles=[];
  if(!gRAF) gRAF=requestAnimationFrame(graphLoop);
}
function sizeGraph(){
  const rect=gCanvas.getBoundingClientRect();
  const dpr=Math.min(window.devicePixelRatio||1, 2);
  gW=rect.width; gH=rect.height;
  gCanvas.width=gW*dpr; gCanvas.height=gH*dpr;
  gCtx.setTransform(dpr,0,0,dpr,0,0);
}
function nodePos(n){
  const cx=gW/2, cy=gH/2, rr=Math.min(gW,gH)*n.radius;
  return { x:cx+Math.cos(n.ang)*rr, y:cy+Math.sin(n.ang)*rr };
}
function graphLoop(){
  gRAF=requestAnimationFrame(graphLoop);
  if($('arena').classList.contains('active')===false) return;
  gTime+=.016;
  gCtx.clearRect(0,0,gW,gH);

  // edges
  gCtx.lineWidth=1;
  for(let i=0;i<gNodes.length;i++)for(let j=i+1;j<gNodes.length;j++){
    const a=nodePos(gNodes[i]), b=nodePos(gNodes[j]);
    gCtx.strokeStyle='rgba(53,224,214,.10)';
    gCtx.beginPath(); gCtx.moveTo(a.x,a.y); gCtx.lineTo(b.x,b.y); gCtx.stroke();
  }
  // nodes
  gNodes.forEach(n=>{
    const p=nodePos(n);
    n.breach*=.94; n.secure*=.95;
    const pulse = n.sensitive ? 1+Math.sin(gTime*2)*.12 : 1;
    const rr=n.r*pulse;
    let col='53,224,214', glow=6;
    if(n.breach>.05){ col='255,59,84'; glow=6+n.breach*22; }
    else if(n.secure>.05){ col='52,227,138'; glow=6+n.secure*18; }
    gCtx.save();
    gCtx.shadowColor=`rgba(${col},.9)`; gCtx.shadowBlur=glow;
    gCtx.fillStyle=`rgba(${col},${n.sensitive?.28:.16})`;
    gCtx.beginPath(); gCtx.arc(p.x,p.y,rr,0,7); gCtx.fill();
    gCtx.shadowBlur=0; gCtx.lineWidth=1.5; gCtx.strokeStyle=`rgba(${col},.85)`; gCtx.stroke();
    gCtx.restore();
    // label
    gCtx.fillStyle='rgba(232,230,220,.65)';
    gCtx.font='10px "JetBrains Mono", monospace'; gCtx.textAlign='center';
    gCtx.fillText(n.name, p.x, p.y+rr+12);
    if(n.sensitive){ gCtx.fillStyle='rgba(255,157,43,.8)'; gCtx.fillText('◆', p.x, p.y+3); }
  });
  // particles
  for(let i=gParticles.length-1;i>=0;i--){
    const pt=gParticles[i];
    pt.x+=pt.vx; pt.y+=pt.vy; pt.life-=.02;
    if(pt.life<=0){ gParticles.splice(i,1); continue; }
    gCtx.globalAlpha=Math.max(0,pt.life);
    gCtx.fillStyle=pt.color;
    gCtx.fillRect(pt.x,pt.y,2.2,2.2);
    gCtx.globalAlpha=1;
  }
}
function findNode(name){ return gNodes.find(n=>n.name===name) || gNodes.find(n=>n.sensitive) || gNodes[0]; }
function graphBreach(table){
  const n=findNode(table); if(!n) return; n.breach=1;
  const p=nodePos(n);
  for(let i=0;i<26 && gParticles.length<160;i++){
    gParticles.push({x:p.x,y:p.y,vx:-2-Math.random()*2.4,vy:(Math.random()-.5)*2,life:1,color:'#FF3B54'});
  }
}
function graphPing(table){ const n=findNode(table); if(n) n.secure=.4; }
function graphShield(){ gNodes.forEach(n=>n.secure=Math.max(n.secure,.7)); }
function graphSecure(){ gNodes.forEach(n=>{ n.secure=1; n.breach*=.3; }); }

/* ---------------------------------------------------------
   10. AMBIENT BACKGROUND (light starfield)
   --------------------------------------------------------- */
function ambient(){
  const c=$('bg-canvas'), x=c.getContext('2d');
  let w,h,stars,mx=0,my=0;
  function size(){ w=c.width=innerWidth; h=c.height=innerHeight;
    stars=Array.from({length:Math.min(90, Math.floor(w*h/16000))},()=>({
      x:Math.random()*w, y:Math.random()*h, z:Math.random()*.8+.2, tw:Math.random()*6 }));
  }
  size(); addEventListener('resize',()=>{ size(); if(gCanvas) sizeGraph(); });
  addEventListener('mousemove',e=>{ mx=(e.clientX/innerWidth-.5); my=(e.clientY/innerHeight-.5); });
  (function loop(t){
    requestAnimationFrame(loop);
    x.clearRect(0,0,w,h);
    stars.forEach(s=>{
      const px=s.x+mx*22*s.z, py=s.y+my*22*s.z;
      const a=.25+Math.abs(Math.sin(t/900+s.tw))*.5*s.z;
      x.fillStyle=`rgba(120,150,170,${a})`;
      x.fillRect(px,py,s.z*1.6,s.z*1.6);
    });
  })(0);
}

/* ---------------------------------------------------------
   11. NAV / UTIL
   --------------------------------------------------------- */
function show(id){
  document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));
  $(id).classList.add('active');
  window.scrollTo(0,0);
}
let _toastT;
function toast(msg){
  const t=$('toast'); t.textContent=msg; t.hidden=false;
  clearTimeout(_toastT); _toastT=setTimeout(()=>t.hidden=true,2600);
}

function wire(){
  $('btn-start').onclick = launch;
  $('btn-back').onclick = ()=>{ _hardenedToasted=false; show('menu'); };
  $('btn-menu').onclick = ()=>{ $('verdict').hidden=true; _hardenedToasted=false; show('menu'); };
  $('btn-retry').onclick = ()=>{ $('verdict').hidden=true; _hardenedToasted=false; startGame(); };
}

/* ---------------------------------------------------------
   INIT
   --------------------------------------------------------- */
buildMenu(); wire(); ambient();

})();
