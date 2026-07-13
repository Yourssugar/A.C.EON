/* =========================================================
   COURSE: SQL-инъекция — два дела, разные механики
   ========================================================= */
const SQLI_COURSE = {
  id:'sqli',
  title:'SQL-инъекция',
  codename:'ДОСЬЕ · SQLI',
  blurb:'Два дела, две цели, три техники. Обход авторизации, извлечение скрытых данных и слепая атака — и защита от всего этого настоящим кодом.',
  targetName:'NEO-BANK', targetHost:'neobank.io/login',
  users:[
    {id:1, login:'admin',      email:'admin@neobank.io',  role:'admin',   pass:'Admin!2021'},
    {id:2, login:'m.orlov',    email:'m.orlov@neobank.io',role:'user',    pass:'summer2019'},
    {id:3, login:'k.nowak',    email:'k.nowak@neobank.io',role:'user',    pass:'qwerty123'},
    {id:4, login:'svc_backup', email:'ops@neobank.io',    role:'service', pass:'b4ckup_9931'},
  ],

  cases:[
    /* ============ ДЕЛО #01 — NEO-BANK ============ */
    {
      code:'ДЕЛО #01', title:'NEO-BANK · обход входа',
      target:{name:'NEO-BANK', host:'neobank.io/login'},
      intro:[
        {who:'V', text:'Ты на связи. Я — Ви, куратор. Заказчик — NEO-BANK, аудит формы входа до релиза.'},
        {who:'V', text:'Всё в песочнице, это их тестовый стенд. Никаких настоящих систем.'},
        {who:'V', text:'Первая цель проста на словах: войти без пароля.'},
      ],
      levels:[
        { id:'l1', title:'Голая форма', type:'bypass', filters:{label:'нет'}, tables:['users','sessions','logs'], target:'users',
          goal:'войти без пароля',
          story:[{who:'V',text:'Защиты нет — их код клеит твой логин прямо в SQL. Сделай условие всегда-истинным.'}],
          guide:'Запрос: <code>login = \'<i>твой ввод</i>\'</code>. Собери ввод, при котором условие ВСЕГДА истинно.',
          steps:[{add:"'",say:"Шаг 1: ' закрывает строку логина."},{add:" OR ",say:"Шаг 2: OR — хватит истинного правого условия."},{add:"'1'='1",say:"Шаг 3: '1'='1 — всегда правда."},{add:" --",say:"Шаг 4: -- отбрасывает проверку пароля. Жми отправить."}],
          hint:"' OR '1'='1' --",
          why:"' OR '1'='1' --\n\n  WHERE login='' OR '1'='1' --' AND pass='...'\n  ''          → пустой логин\n  OR '1'='1'  → всегда истина\n  --          → пароль отброшен\n→ вход без пароля.",
          outro:[{who:'V',text:'Чисто, без пароля. Они побегут патчить — жди второй заход.'}] },

        { id:'l2', title:'Патч №1: режут --', type:'bypass', filters:{stripComments:true,label:'вырезает -- и /* */'}, tables:['users','sessions','logs'], target:'users',
          goal:'войти без пароля, без комментариев',
          story:[{who:'V',text:'Теперь сервер вырезает комментарии --. Старый трюк умрёт — балансируй кавычки сам.'}],
          guide:'Комментарий вырежут. Заверши хвост ещё одним <code>OR \'</code>, чтобы кавычки сошлись.',
          steps:[{add:"' OR '1'='1",say:"Тавтология как обычно…"},{add:" OR '",say:"…но вместо -- добавляем OR ' — остаток «съедается» как строка, кавычки сходятся."}],
          hint:"' OR '1'='1' OR '",
          why:"-- ВЫРЕЗАЕТСЯ, поэтому:\n  ' OR '1'='1' --  →  '' OR '1'='1' '  → лишняя кавычка → SQL error\n\nРЕШЕНИЕ — сбалансировать:\n  ' OR '1'='1' OR '\n  → '' OR '1'='1' OR '' AND pass='...'  → истина, кавычки сходятся.",
          outro:[{who:'V',text:'Красиво — обошёлся без комментария. Чёрные списки дырявые, но они попробуют ещё.'}] },

        { id:'l3', title:'Патч №2: блок OR', type:'bypass', filters:{blockUpperOR:true,label:'блокирует OR'}, tables:['users','sessions','logs'], target:'users',
          goal:'обойти фильтр ключевого слова',
          story:[{who:'V',text:'WAF рубит запрос, увидев OR. Но фильтр наивный — подумай, как он сравнивает.'}],
          guide:'Фильтр ловит <b>OR</b> верхним регистром. SQL к регистру ключевых слов безразличен… попробуй <code>or</code> строчными.',
          steps:[{add:"' or '1'='1",say:"Та же тавтология…"},{add:" or '",say:"…но or строчными. WAF ищет OR, а база понимает одинаково."}],
          hint:"' or '1'='1' or '",
          why:"WAF блокирует только «OR» ВЕРХНИМ регистром.\nSQL: OR = or = oR.\n  ' or '1'='1' or '  → фильтр не сработал → вход.\n\nМОРАЛЬ: фильтр по точному совпадению — не защита.",
          outro:[{who:'V',text:'Три патча — три обхода. Чёрные списки проиграли. Последний заход — ты в синей команде.'}] },

        { id:'l4', title:'Синяя команда', type:'defense', filters:{label:'—'}, tables:['users','sessions','logs'], target:'users',
          goal:'отбить все атаки дела',
          story:[{who:'V',text:'Ты вскрыл их тремя способами. Теперь фикс, который убивает все три разом.'}],
          defenseBrief:'Все прошлые атаки — в «батарее» справа снизу. Твоя защита должна отбить каждую и пускать обычные логины.',
          vulnCode:'db.query(\n  "SELECT * FROM users WHERE login=\'" + login + "\' AND pass=\'" + pass + "\'"\n)',
          attacks:["' OR '1'='1' --","' OR '1'='1' OR '","' or '1'='1' or '","admin'--"],
          legit:["admin","m.orlov","k.nowak"],
          options:[
            {name:'Чёрный список символов',desc:'Резать кавычки и OR из ввода.',correct:false,fail:'Ты сам обошёл такие фильтры регистром и балансом кавычек. Дырявo.'},
            {name:'Параметризованный запрос',desc:'Передавать ввод как ДАННЫЕ, отдельно от текста запроса.',correct:true},
            {name:'Прятать текст ошибок',desc:'Не показывать SQL-ошибку.',correct:false,fail:'Скрыть ошибку ≠ закрыть дыру. Инъекция срабатывает вслепую.'},
          ],
          starter:'db.query(\n  "SELECT * FROM users WHERE login=? AND pass=?",\n  [ /* впиши параметры */ ]\n)',
          fixHint:'db.query(\n  "SELECT * FROM users WHERE login=? AND pass=?",\n  [login, pass]\n)',
          execPrompt:'Напиши тело isSafe(input): true — безопасно, false — инъекция. Движок прогонит по батарее и по логинам admin/m.orlov/k.nowak.',
          execStarter:'  // true = безопасно, false = инъекция\n  return true;\n',
          outro:[{who:'V',text:'Вот теперь чисто. Данные отделены от кода. Дело #01 закрыто — но у меня есть ещё одно.'}] },
      ],
    },

    /* ============ ДЕЛО #02 — ARCHIVE-7 ============ */
    {
      code:'ДЕЛО #02', title:'ARCHIVE-7 · кража данных',
      target:{name:'ARCHIVE-7', host:'archive7.internal/search'},
      intro:[
        {who:'V',text:'Новый контракт. ARCHIVE-7 — внутренний портал документов. Логина ломать не надо: он открыт.'},
        {who:'V',text:'Задача тоньше: вытащить то, что тебе видеть не положено. Здесь ты научишься извлекать данные, а не просто входить.'},
      ],
      levels:[
        /* UNION extraction */
        { id:'u1', title:'UNION: скрытая таблица', type:'union',
          target:{name:'ARCHIVE-7', host:'archive7.internal/search'},
          tables:['articles','authors','admin_tokens'], /* graph */
          goal:'извлечь таблицу admin_tokens через UNION',
          union:{ columns:2, secret:[
            {token:'sess_9f3a2b7c',user:'admin',expires:'2026-08-01'},
            {token:'sess_11d0e4aa',user:'ops',  expires:'2026-07-20'},
          ], dump:{cap:'UNION: извлечено admin_tokens', cols:[{k:'token',l:'token',d:true},{k:'user',l:'user'},{k:'expires',l:'expires'}]} },
          story:[
            {who:'V',text:'Поиск по статьям возвращает две колонки: заголовок и автора. Классика для UNION.'},
            {who:'V',text:'UNION приклеивает твой запрос к их результату. Условие одно: число столбцов должно совпасть — ровно два.'},
          ],
          guide:'Поиск делает: <code>SELECT title, author ...</code> — <b>2 столбца</b>. Приклей свой <code>UNION SELECT</code> тоже с двумя значениями и вытяни <code>admin_tokens</code>.',
          blocks:[
            {t:"'",why:"закрываем строку поиска"},
            {t:" UNION SELECT ",why:"приклеиваем свой запрос к результату"},
            {t:"token",why:"1-й столбец: то, что тянем"},
            {t:", ",why:"разделитель столбцов"},
            {t:"user",why:"2-й столбец — чтобы число совпало (нужно 2)"},
            {t:" FROM admin_tokens",why:"из какой таблицы тянем"},
            {t:" -- ",why:"комментируем хвост запроса"},
          ],
          hint:"' UNION SELECT token, user FROM admin_tokens -- ",
          why:"ПОИСК: SELECT title, author FROM articles WHERE title LIKE '%ВВОД%'\n→ 2 столбца.\n\nUNION требует столько же столбцов:\n  ' UNION SELECT token, user FROM admin_tokens -- \n  1 столбец: token   2 столбец: user   (итого 2 — совпало)\n\nЕсли не угадал число — «разное число столбцов».\nРазведка: ' ORDER BY 3--  скажет, есть ли 3-й столбец.",
          guideType:'Поиск возвращает 2 столбца. Напечатай UNION SELECT с двумя значениями из admin_tokens. Не угадаешь число столбцов — сервер скажет.',
          outro:[{who:'V',text:'Токены у нас. Но админ сменил сессию — токен уже мёртв. Нужен запасной путь: его PIN восстановления. А вот его так просто не покажут…'}] },

        /* Blind boolean */
        { id:'b1', title:'Слепая инъекция', type:'blind',
          target:{name:'ARCHIVE-7', host:'archive7.internal/reset'},
          tables:['users','reset_codes'], target_:'reset_codes',
          goal:'вытащить PIN восстановления admin (4 цифры)',
          blind:{ secret:'4815', charset:'0123456789' },
          story:[
            {who:'V',text:'Форма сброса пароля не показывает данные. Она отвечает только: «запись найдена» или «нет».'},
            {who:'V',text:'Значит, спрашивай по одному символу. Подтвердил цифру — переходи к следующей. Это и есть слепая инъекция.'},
          ],
          guide:'Данных на экране нет — только «да/нет». Проверяй PIN <b>по одной цифре</b>: угадал — фиксируется, идёшь дальше. Ты вычисляешь секрет, не видя его.',
          outro:[{who:'V',text:'4815. Ты вытащил его вслепую, по крупицам «да/нет». Жутко эффективно — и жутко медленно для защиты ловить. Осталось закрыть ARCHIVE-7.'}] },

        /* Defense for case 2 */
        { id:'d2', title:'Синяя команда: ARCHIVE-7', type:'defense',
          target:{name:'ARCHIVE-7', host:'archive7.internal'},
          tables:['articles','authors','admin_tokens'], target:'admin_tokens',
          goal:'закрыть извлечение данных',
          story:[{who:'V',text:'UNION и слепая атака бьют в один корень: ввод в поиске склеивается в запрос. Лечится тем же — параметром.'}],
          defenseBrief:'Батарея справа — реальные пейлоады из этого дела (UNION, слепая, обход). Защита должна отбить все и пускать обычный поиск.',
          vulnCode:'db.query(\n  "SELECT title, author FROM articles WHERE title LIKE \'%" + q + "%\'"\n)',
          attacks:["' UNION SELECT token,user FROM admin_tokens-- ","' OR '1'='1' --","admin'--","' AND SUBSTR(pin,1,1)='4'-- "],
          legit:["новости","отчёт 2026","договор"],
          options:[
            {name:'Экранировать проценты',desc:'Убирать % из ввода поиска.',correct:false,fail:'UNION и кавычки не про проценты. Дыра не в %, а в склейке ввода в запрос.'},
            {name:'Параметризованный запрос',desc:'Ввод поиска — параметр, а не часть SQL.',correct:true},
            {name:'Ограничить длину ввода',desc:'Резать поиск до 10 символов.',correct:false,fail:'Короткий пейлоад тоже ломает: admin\'-- всего 8 символов.'},
          ],
          starter:'db.query(\n  "SELECT title, author FROM articles WHERE title LIKE ?",\n  [ /* впиши параметр */ ]\n)',
          fixHint:'db.query(\n  "SELECT title, author FROM articles WHERE title LIKE ?",\n  ["%" + q + "%"]\n)',
          execPrompt:'Напиши тело isSafe(input): true — безопасный поиск, false — инъекция. Движок прогонит по батарее и по обычным запросам (новости / отчёт 2026 / договор).',
          execStarter:'  // отсеки кавычки, комментарии, UNION\n  return true;\n',
          outro:[{who:'V',text:'ARCHIVE-7 закрыт. Ты прошёл и обход, и извлечение, и слепую атаку — и заделал всё одним правильным приёмом. Досье закрыто. До связи.'}] },
      ],
    },
  ],
};
