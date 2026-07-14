/* =========================================================
   БРЕШЬ // CyberEngine v4 — white-hat SQLi simulator
   Terminal-only. Portal → case map → lessons (attack chain
   + hands-on defense). Curator chat with escalating hints.
   Realistic server responses over a fake in-page DB.
   Public: CyberEngine.boot(course)
   ========================================================= */
window.CyberEngine = (function(){
'use strict';
const $=s=>document.querySelector(s);
const el=(t,c,x)=>{const e=document.createElement(t);if(c)e.className=c;if(x!=null)e.textContent=x;return e;};
const esc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
const store={get(k,d){try{const v=localStorage.getItem(k);return v==null?d:JSON.parse(v);}catch(e){return d;}},set(k,v){try{localStorage.setItem(k,JSON.stringify(v));}catch(e){}}};

/* ============ SQL SIMULATION CORE (validated) ============ */
let DB=null,SCHEMA=null,TABLES=null;const BASECOLS=3;
function loadDB(course){DB=course.db;SCHEMA=course.schema||{};TABLES=Object.keys(SCHEMA);}
const stripBlock=s=>s.replace(/\/\*.*?\*\//g,' ');
const cutLine=s=>{const i=s.search(/--\s|#/);return i>=0?s.slice(0,i):s;};
const balanced=s=>((s.match(/'/g)||[]).length%2===0);
function applyFilter(p,f){
  if(!f)return {p,blocked:null};
  if(f.blockUpperOR&&/\bOR\b/.test(p))return {p,blocked:'WAF: обнаружено ключевое слово OR (верхний регистр)'};
  if(f.stripDashDash)p=p.replace(/--\s.*$/,'');
  return {p,blocked:null};
}
function evalAuth(payload,filters){
  const af=applyFilter(payload,filters);if(af.blocked)return {kind:'blocked',msg:af.blocked};payload=af.p;
  let cond=`login='${payload}' AND pass='__x__'`;cond=cutLine(stripBlock(cond));
  if(!balanced(cond))return {kind:'error',msg:"You have an error in your SQL syntax near \"'\""};
  let ev=cond.replace(/login\s*=\s*'([^']*)'/gi,(m,v)=>`LOGIN==${JSON.stringify(v)}`)
    .replace(/pass\s*=\s*'([^']*)'/gi,'false')
    .replace(/'([^']*)'\s*=\s*'([^']*)'/g,(m,a,b)=>a===b?'true':'false')
    .replace(/(\d+)\s*=\s*(\d+)/g,(m,a,b)=>a===b?'true':'false')
    .replace(/'[^']*'/g,'false').replace(/\bAND\b/gi,'&&').replace(/\bOR\b/gi,'||');
  let bad=false;
  const rows=DB.users.filter(u=>{try{return Function('LOGIN','return ('+ev+')')(u.login);}catch(e){bad=true;return false;}});
  if(bad)return {kind:'error',msg:'SQL syntax error'};
  if(rows.length===DB.users.length)return {kind:'bypass-all',rows,note:'условие истинно для всех строк'};
  if(rows.length>0)return {kind:'bypass',rows,note:'вход как '+rows[0].login};
  return {kind:'deny'};
}
function evalSearch(payload,filters){
  const af=applyFilter(payload,filters);if(af.blocked)return {kind:'blocked',msg:af.blocked};payload=af.p;
  let raw=`name LIKE '%${payload}%'`;raw=cutLine(stripBlock(raw));
  const ob=/order\s+by\s+(\d+)/i.exec(raw);
  if(ob){const n=+ob[1];if(!balanced(raw.replace(/order\s+by\s+\d+/i,'')))return sqlErr();
    return n>BASECOLS?{kind:'orderby',n,ok:false,msg:`Unknown column '${n}' in 'order clause'`}:{kind:'orderby',n,ok:true};}
  const um=/union\s+(?:all\s+)?select\s+([\s\S]+)$/i.exec(raw);
  if(um){if(!balanced(raw.slice(0,raw.toLowerCase().indexOf('union'))))return sqlErr();return evalUnion(um[1]);}
  if(!balanced(raw))return sqlErr();
  const term=payload.replace(/%/g,'').toLowerCase();
  const rows=DB.products.filter(p=>!term||p.name.toLowerCase().includes(term)).map(p=>[p.id,p.name,p.price]);
  return {kind:'rows',cols:['id','name','price'],rows,note:rows.length+' результат(ов)'};
}
function sqlErr(){return {kind:'error',msg:"You have an error in your SQL syntax; check the manual near '%''"};}
function evalUnion(sel){
  let from=null,where=null;
  const fm=/\bfrom\s+([a-z_.]+)/i.exec(sel);if(fm)from=fm[1].toLowerCase();
  const wm=/\bwhere\s+table_name\s*=\s*'([^']+)'/i.exec(sel);if(wm)where=wm[1];
  const cols=splitTop(sel.replace(/\bfrom\b[\s\S]*$/i,'').trim());
  if(cols.length!==BASECOLS)return {kind:'error',msg:'The used SELECT statements have a different number of columns'};
  let src=[];
  if(from==='information_schema.tables')src=TABLES.map(t=>({table_name:t}));
  else if(from==='information_schema.columns'){const t=where||'users';src=(SCHEMA[t]||[]).map(c=>({column_name:c,table_name:t}));}
  else if(from&&DB[from])src=DB[from];
  else if(!from)src=[{}];
  else return {kind:'error',msg:`Table '${from}' doesn't exist`};
  const hasGC=cols.some(c=>/group_concat/i.test(c));
  const outRows=hasGC?[cols.map(c=>resolveAgg(c,src))]:src.map(r=>cols.map(c=>resolveCol(c,r)));
  return {kind:'union',cols:cols.map(labelOf),rows:outRows,from,gc:hasGC,leaked:describeLeak(from,where)};
}
function splitTop(s){const o=[];let d=0,c='';for(const ch of s){if(ch==='(')d++;if(ch===')')d--;if(ch===','&&d===0){o.push(c.trim());c='';}else c+=ch;}if(c.trim())o.push(c.trim());return o;}
function resolveCol(x,row){x=x.trim();if(/^null$/i.test(x))return null;const s=/^'([^']*)'$/.exec(x);if(s)return s[1];if(/^\d+$/.test(x))return +x;
  const cc=/^concat\s*\(([\s\S]+)\)$/i.exec(x);if(cc)return splitTop(cc[1]).map(y=>resolveCol(y,row)).join('');
  const k=x.toLowerCase();return row[k]!=null?row[k]:(row[x]!=null?row[x]:null);}
function resolveAgg(x,src){const gc=/group_concat\s*\(\s*([a-z_]+)\s*\)/i.exec(x);if(gc){const c=gc[1].toLowerCase();return src.map(r=>r[c]).join(',');}return resolveCol(x,src[0]||{});}
function labelOf(x){const m=/group_concat\s*\(\s*([a-z_]+)/i.exec(x);if(m)return 'group_concat('+m[1]+')';return /^concat/i.test(x)?'concat':x;}
function describeLeak(from,where){if(from==='information_schema.tables')return 'имена таблиц';if(from==='information_schema.columns')return 'столбцы таблицы '+(where||'users');if(from==='users')return 'данные пользователей';if(from==='admin_tokens')return 'админские токены';if(from==='orders')return 'заказы/карты';return from||'значения';}

/* ============ STATE + BOOT ============ */
let E=null,root=null;
function goHome(){if(window.CYBER_HOME)window.CYBER_HOME();else location.href='../../index.html';}
function boot(course){root=$('#app')||document.body;loadDB(course);
  E={course,done:new Set(store.get('bresh:'+course.id+':done',[])),ci:0,li:0,sess:null};renderMap();}
function saveDone(){store.set('bresh:'+E.course.id+':done',[...E.done]);}
const key=(ci,li)=>ci+':'+li;
const lessonDone=(ci,li)=>E.done.has(key(ci,li));
function caseDone(ci){return E.course.cases[ci].lessons.every((_,li)=>lessonDone(ci,li));}

/* ============ VIEW: CASE MAP ============ */
function renderMap(){
  root.innerHTML='';
  const wrap=el('div','map');
  wrap.innerHTML=`<div class="map-hud"><button class="lk" id="to-portal">‹ портал</button>
    <div class="map-title">${esc(E.course.title)}</div><div class="map-sub">${esc(E.course.blurb||'')}</div></div>`;
  const grid=el('div','case-grid');
  E.course.cases.forEach((cs,ci)=>{
    const total=cs.lessons.length,done=cs.lessons.filter((_,li)=>lessonDone(ci,li)).length;
    const complete=done===total,locked=cs.locked;
    const card=el('button','case-card'+(complete?' complete':'')+(locked?' locked':''));
    card.innerHTML=`<div class="cc-top"><span class="cc-code">${esc(cs.code)}</span>${complete?'<span class="cc-check">✓ ЗАКРЫТО</span>':locked?'<span class="cc-lock">скоро</span>':''}</div>
      <div class="cc-name">${esc(cs.title)}</div><div class="cc-brief">${esc(cs.brief||'')}</div>
      <div class="cc-foot"><div class="cc-bar"><i style="width:${Math.round(done/total*100)}%"></i></div><span>${done}/${total}</span></div>`;
    if(!locked)card.onclick=()=>openCase(ci);
    grid.appendChild(card);
  });
  wrap.appendChild(grid);root.appendChild(wrap);
  $('#to-portal').onclick=goHome;
}

/* ============ LESSON FLOW ============ */
function openCase(ci){E.ci=ci;openLesson(ci,0,true);}
function openLesson(ci,li,withIntro){
  E.ci=ci;E.li=li;E.sess={obOK:new Set(),obErr:new Set(),leaks:new Set(),usedGC:false,last:null,hintIdx:0,solved:lessonDone(ci,li)};
  const cs=E.course.cases[ci],lv=cs.lessons[li];root.innerHTML='';
  const beats=(withIntro&&li===0?(cs.intro||[]):[]).concat(lv.story||[]);
  renderStory(root,beats,()=>{lv.kind==='defense'?defenseView(cs,lv):attackView(cs,lv);});
}
function lessonRail(cs){const rail=el('div','rail');
  cs.lessons.forEach((l,i)=>{const cur=i===E.li,dn=lessonDone(E.ci,i);
    const b=el('button','rail-step'+(cur?' cur':'')+(dn?' done':''));b.innerHTML=`<span class="rs-n">${l.kind==='defense'?'⛨':String(i+1).padStart(2,'0')}</span><span class="rs-t">${esc(l.title)}</span>`;
    b.onclick=()=>openLesson(E.ci,i,false);rail.appendChild(b);});
  return rail;}
function lessonHud(cs,lv){const hud=el('div','les-hud');
  hud.innerHTML=`<button class="lk" id="to-map">‹ дела</button><div class="les-meta"><span class="lm-code">${esc(cs.code)}</span><span class="lm-sep">/</span><span class="lm-title">${esc(lv.title)}</span></div>`;
  return hud;}

/* ---------- ATTACK VIEW ---------- */
function attackView(cs,lv){
  root.innerHTML='';root.appendChild(lessonHud(cs,lv));root.appendChild(lessonRail(cs));
  const grid=el('div','les-grid'),left=el('div','les-left'),right=el('div','les-right');
  const goal=el('div','goal-bar');goal.innerHTML=`<span class="gb-tag">ЦЕЛЬ</span> ${esc(lv.goal)}`;left.appendChild(goal);
  const term=el('div','kterm');
  term.innerHTML=`<div class="kbar"><i></i><i></i><i></i><span>op@${esc(cs.target.host)} : ~</span></div><div class="kout" id="kout"></div>
    <div class="kline"><span class="kp1">┌──(</span><span class="kpu">op</span><span class="kp1">㉿</span><span class="kph">${esc(cs.target.name.toLowerCase())}</span><span class="kp1">)-[</span><span class="kpp">~</span><span class="kp1">]</span></div>
    <div class="kline2"><span class="kp1">└─</span><span class="kpd">$</span>&nbsp;<input class="kin" id="kin" autocomplete="off" spellcheck="false"></div>`;
  left.appendChild(term);
  const tgt=el('div','tgt');
  tgt.innerHTML=`<div class="tgt-head"><span>${esc(cs.target.name)}</span><span class="tgt-badge" id="tgt-badge">${esc(cs.target.endpointLabel||'endpoint')}</span></div>
    <div class="q-label">SQL на сервере</div><pre class="q-code" id="q-code">// жду запроса…</pre>
    <div class="q-label">ответ сервера</div><div class="resp" id="resp"><span class="resp-idle">// готов принять запрос</span></div>
    <div class="dump" id="dump"></div>`;
  right.appendChild(tgt);right.appendChild(curatorPanel(lv));
  grid.append(left,right);root.appendChild(grid);
  $('#to-map').onclick=renderMap;
  const ki=$('#kin');ki.onkeydown=e=>{if(e.key==='Enter'){const v=ki.value;ki.value='';runCmd(v,cs,lv);}};
  setTimeout(()=>ki.focus&&ki.focus(),60);
  kout('sys','[*] сессия открыта · цель '+cs.target.host);
  kout('sys','[*] команды: help · probe · theory · try <payload> · hint · clear');
  if(lv.solved)kout('ok','[✓] урок уже пройден — можно потренироваться или взять следующий');
}
function kout(cls,txt,typed){const o=$('#kout');if(!o)return;const l=el('span','t '+cls);o.appendChild(l);o.scrollTop=o.scrollHeight;
  if(typed)typeInto(l,txt,8,()=>{o.scrollTop=o.scrollHeight;});else l.textContent=txt;}
function runCmd(raw,cs,lv){
  if(!raw||!raw.trim())return;kout('you','└─$ '+raw.trim());
  const m=/^\s*(\S+)\s?([\s\S]*)$/.exec(raw);const cmd=m[1].toLowerCase();const arg=m[2];/* arg сохраняет хвостовой пробел */
  if(cmd==='help')return kout('sys','probe — разведка · theory — теория · try <payload> — отправить · hint — куратор · giveup — сдаться · clear');
  if(cmd==='clear')return void($('#kout').innerHTML='');
  if(cmd==='probe')return kout('info',lv.probe||('точка ввода: '+(lv.endpoint==='auth'?'форма входа, поле login':'поиск, параметр q')+'. ввод уходит в SQL без обработки.'),true);
  if(cmd==='theory')return kout('info',lv.theory||'—',true);
  if(cmd==='hint')return curatorHint(lv);
  if(cmd==='giveup')return curatorGiveup(lv);
  if(cmd==='try'){if(!arg.trim())return kout('warn',"нужен пейлоад, напр.: try ' OR 1=1-- ");return doTry(arg,cs,lv);}
  return kout('warn','неизвестная команда: '+cmd+' (help)');
}
function doTry(payload,cs,lv){
  const r=(lv.endpoint==='auth'?evalAuth(payload,lv.filters):evalSearch(payload,lv.filters));
  showQuery(payload,lv);
  const s=E.sess;
  if(r.kind==='orderby')(r.ok?s.obOK:s.obErr).add(r.n);
  if(r.kind==='union'){if(r.leaked)s.leaks.add(r.leaked);if(r.gc)s.usedGC=true;}
  s.last=r;respond(r);
  let won=false;try{won=lv.win(r,s);}catch(e){}
  if(won)setTimeout(()=>lessonSolved(cs,lv),650);
}
function showQuery(payload,lv){const q=$('#q-code');if(!q)return;
  const inj=/['"]|--|#|union|select|\bor\b/i.test(payload);
  const shown=`<span class="${inj?'q-inj':'q-str'}">${esc(payload)}</span>`;
  if(lv.endpoint==='auth')q.innerHTML=`<span class="q-kw">SELECT</span> * <span class="q-kw">FROM</span> users\n<span class="q-kw">WHERE</span> login='${shown}' <span class="q-kw">AND</span> pass='••••'`;
  else q.innerHTML=`<span class="q-kw">SELECT</span> id, name, price <span class="q-kw">FROM</span> products\n<span class="q-kw">WHERE</span> name <span class="q-kw">LIKE</span> '%${shown}%'`;}
function respond(r){const resp=$('#resp'),dump=$('#dump');dump.innerHTML='';
  const say=(cls,txt)=>{resp.innerHTML='';const l=el('div','resp-line '+cls);resp.appendChild(l);typeInto(l,txt,10);};
  if(r.kind==='blocked')say('bad','403 Forbidden — '+r.msg);
  else if(r.kind==='error')say('bad','500 Internal Server Error\n'+r.msg);
  else if(r.kind==='deny')say('warn','200 OK — неверные учётные данные');
  else if(r.kind==='orderby')r.ok?say('ok','200 OK — сортировка по столбцу '+r.n+' сработала'):say('bad','500 — '+r.msg);
  else if(r.kind==='bypass'||r.kind==='bypass-all'){say('ok','200 OK — 🔓 вход выполнен ('+r.note+')');dumpTable(['id','login','email','role','pass'],r.rows.map(u=>[u.id,u.login,u.email,u.role,u.pass]),'сессия установлена');fx();}
  else if(r.kind==='rows'){say('ok','200 OK — '+r.note);dumpTable(r.cols,r.rows,'результаты поиска');}
  else if(r.kind==='union'){say('ok','200 OK — UNION выполнен');dumpTable(r.cols,r.rows,'ИЗВЛЕЧЕНО: '+r.leaked);fx();}
}
function dumpTable(cols,rows,cap){const dump=$('#dump');if(!dump)return;
  if(!rows||!rows.length){dump.innerHTML='<div class="dcap">0 строк</div>';return;}
  const danger=c=>/pass|token|card/i.test(c);
  dump.innerHTML=`<div class="dcap">${esc(cap||'')}</div><table class="dtab"><thead><tr>${cols.map(c=>`<th>${esc(c)}</th>`).join('')}</tr></thead><tbody>`+
    rows.map(r=>`<tr>${r.map((v,i)=>`<td class="${danger(cols[i])?'pw':''}">${esc(v==null?'NULL':v)}</td>`).join('')}</tr>`).join('')+`</tbody></table>`;}

/* ---------- CURATOR CHAT ---------- */
function curatorPanel(lv){const p=el('div','curator');
  p.innerHTML=`<div class="cur-head"><span class="cur-av">В</span><div><div class="cur-name">Ви · куратор</div><div class="cur-role">на связи</div></div></div><div class="cur-feed" id="cur-feed"></div>
    <div class="cur-actions"><button class="cur-btn" id="cur-hint">спросить подсказку</button><button class="cur-btn ghost" id="cur-give">сдаюсь</button></div>`;
  setTimeout(()=>{$('#cur-hint').onclick=()=>curatorHint(lv);$('#cur-give').onclick=()=>curatorGiveup(lv);
    curSay(lv.curatorIntro||'Я рядом. Начни с `probe` и `theory`. Застрянешь — жми «спросить подсказку», поведу по нарастающей.');},0);
  return p;}
function curSay(txt){const f=$('#cur-feed');if(!f)return;const m=el('div','cur-msg');f.appendChild(m);typeInto(m,txt,12,()=>{f.scrollTop=f.scrollHeight;});f.scrollTop=f.scrollHeight;}
function curYou(txt){const f=$('#cur-feed');if(!f)return;const m=el('div','cur-msg you',txt);f.appendChild(m);f.scrollTop=f.scrollHeight;}
function curatorHint(lv){const s=E.sess,hints=lv.hints||[];
  if(s.hintIdx>=hints.length){curYou('…ещё подсказку?');curSay('Больше намёков не дам — ты почти у цели. Совсем тупик? Команда `giveup` или кнопка «сдаюсь» — покажу решение и разберём.');return;}
  curYou(s.hintIdx===0?'С чего начать?':'Не выходит, дай ещё.');curSay(hints[s.hintIdx++]);}
function curatorGiveup(lv){curYou('Сдаюсь. Покажи решение.');curSay(lv.solution||'—');if(lv.solutionPayload)kout('sys','[куратор] попробуй: try '+lv.solutionPayload);}

/* ---------- DEFENSE VIEW ---------- */
function defenseView(cs,lv){
  root.innerHTML='';root.appendChild(lessonHud(cs,lv));root.appendChild(lessonRail(cs));
  const grid=el('div','les-grid'),left=el('div','les-left'),right=el('div','les-right');
  const goal=el('div','goal-bar');goal.innerHTML=`<span class="gb-tag def">ЗАЩИТА</span> ${esc(lv.goal)}`;left.appendChild(goal);
  const ed=el('div','editor');
  ed.innerHTML=`<div class="ed-label">уязвимый код сервера — перепиши его</div><pre class="ed-vuln">${esc(lv.vulnCode)}</pre>
    <div class="ed-label">твой фикс:</div><textarea class="ed-area" id="ed-area" spellcheck="false"></textarea>
    <div class="ed-fb" id="ed-fb"></div>
    <div class="ed-actions"><button class="run-def" id="run-def">▸ прогнать защиту</button><button class="cur-btn ghost" id="ed-hint">подсказка</button></div>`;
  left.appendChild(ed);
  const bat=el('div','tgt');
  bat.innerHTML=`<div class="tgt-head"><span>БАТАРЕЯ АТАК</span><span class="tgt-badge" id="def-badge">не проверено</span></div>
    <div class="q-label">боевые пейлоады дела прогоняются по твоему коду</div><div class="battery" id="battery"></div>`;
  right.appendChild(bat);right.appendChild(curatorPanel(lv));
  grid.append(left,right);root.appendChild(grid);
  $('#to-map').onclick=renderMap;$('#ed-area').value=lv.starter||'';renderBattery(lv,null);
  $('#run-def').onclick=()=>checkDefense(cs,lv);$('#ed-hint').onclick=()=>curatorHint(lv);
}
function renderBattery(lv,res){const b=$('#battery');if(!b)return;
  b.innerHTML=lv.battery.map((p,i)=>{const st=res?res[i]:'?';const cls=st==='blocked'?'ok':(st==='pass'?'bad':'idle');
    return `<div class="bat ${cls}"><code>${esc(p)}</code><span>${st==='blocked'?'отбито ✓':st==='pass'?'ПРОШЛО ✕':'—'}</span></div>`;}).join('')+
    `<div class="bat-legit">легитимные запросы: ${lv.legit.map(x=>`<code>${esc(x)}</code>`).join(' ')}</div>`;}
function checkDefense(cs,lv){
  const code=$('#ed-area').value,fb=$('#ed-fb');const v=validateFix(code,lv);
  fb.className='ed-fb '+(v.ok?'ok':'err');fb.textContent=v.msg;
  if(!v.ok){renderBattery(lv,null);return;}
  if(v.mode==='guard'){let fn;try{fn=new Function('input',v.body);fn('t');}catch(e){fb.className='ed-fb err';fb.textContent='✕ ошибка в коде: '+e.message;return;}
    const res=lv.battery.map(p=>{try{return fn(p)===false?'blocked':'pass';}catch(e){return 'pass';}});
    const legitOk=lv.legit.every(x=>{try{return fn(x)===true;}catch(e){return false;}});
    renderBattery(lv,res);
    if(res.every(r=>r==='blocked')&&legitOk)defenseWin(cs,lv);
    else if(!res.every(r=>r==='blocked')){fb.className='ed-fb err';fb.textContent='✕ часть атак прошла — ужесточи проверку (см. батарею).';}
    else{fb.className='ed-fb err';fb.textContent='✕ ты блокируешь и легитимные запросы. Так нельзя.';}
  } else {renderBattery(lv,lv.battery.map(()=>'blocked'));defenseWin(cs,lv);}
}
function validateFix(code,lv){const c=code.toLowerCase();
  if(lv.defenseMode==='guard'){if(!/return/.test(c))return {ok:false,msg:'✕ функция должна возвращать true/false.'};return {ok:true,mode:'guard',body:code};}
  if(!/select/.test(c)||!/query\s*\(/.test(c))return {ok:false,msg:'✕ не вижу запроса db.query(...) с SELECT.'};
  if(/["'][^"']*\b(select|from|where|like)\b[^"']*["']\s*\+|\+\s*["'][^"']*\b(select|from|where|like)\b/i.test(code))
    return {ok:false,msg:'✕ SQL всё ещё собирается склейкой строк — ввод попадает в текст запроса. Нужны плейсхолдеры, а не +.'};
  if(!/\?|\$\d|:\w+/.test(code))return {ok:false,msg:'✕ нет плейсхолдера (? или $1). Данные должны идти отдельно от текста запроса.'};
  return {ok:true,mode:'param'};}
function defenseWin(cs,lv){$('#def-badge').textContent='ЗАЩИЩЕНО';$('#def-badge').className='tgt-badge secured';
  const fb=$('#ed-fb');fb.className='ed-fb ok';fb.textContent='✓ все боевые пейлоады отбиты, легитимные запросы работают. Ввод больше не исполняется как код.';
  securedFlash();setTimeout(()=>lessonSolved(cs,lv),900);}

/* ============ PROGRESSION ============ */
function lessonSolved(cs,lv){
  E.done.add(key(E.ci,E.li));saveDone();
  if(lv.kind!=='defense')accessFlash('grant','ACCESS GRANTED');
  const li=E.li,ci=E.ci,last=li===cs.lessons.length-1;
  const card=el('div','outro');const beats=lv.outro||[{text:'Готово.'}];
  card.innerHTML=`<div class="outro-tag ${lv.kind==='defense'?'sec':''}">${last?(caseDone(ci)?'ДЕЛО ЗАКРЫТО':'ДЕЛО ПРОЙДЕНО'):'УРОК ПРОЙДЕН'}</div>`+
    beats.map(b=>`<div class="story-line ${b.who?'npc':'narr'}">${b.who?`<span class="sp-who">${esc(b.who)}</span><span class="sp-text">${esc(b.text)}</span>`:`<span class="sp-narr">${esc(b.text)}</span>`}</div>`).join('');
  const act=el('div','outro-act');
  if(!last){const n=el('button','primary','следующий урок ▸');n.onclick=()=>openLesson(ci,li+1,false);act.appendChild(n);}
  else{const n=el('button','primary','к делам ▸');n.onclick=renderMap;act.appendChild(n);}
  const rp=el('button','lk','пройти заново');rp.onclick=()=>openLesson(ci,li,false);act.appendChild(rp);card.appendChild(act);
  setTimeout(()=>{root.innerHTML='';root.appendChild(card);},lv.kind==='defense'?1500:1200);
}

/* ============ STORY + FX ============ */
function renderStory(stage,beats,onDone){
  if(!beats.length){onDone();return;}
  const box=el('div','story'),feed=el('div','story-feed');box.appendChild(feed);
  const skip=el('button','lk skip','пропустить ▸▸');box.appendChild(skip);stage.appendChild(box);
  let k=0,tm=null,ty=null,fin=false;
  const finish=()=>{skip.remove();const go=el('button','primary','приступить ▸');go.onclick=onDone;box.appendChild(go);};
  function line(b,cb){const l=el('div','story-line '+(b.who?'npc':'narr'));l.innerHTML=b.who?`<span class="sp-who">${esc(b.who)}</span>`:'';const sp=el('span',b.who?'sp-text':'sp-narr');l.appendChild(sp);feed.appendChild(l);
    let i=0;ty=setInterval(()=>{sp.textContent=b.text.slice(0,++i);feed.scrollTop=feed.scrollHeight;if(i>=b.text.length){clearInterval(ty);ty=null;cb();}},14);}
  function next(){if(k<beats.length)line(beats[k++],()=>{tm=setTimeout(next,160);});else{fin=true;finish();}}
  skip.onclick=()=>{if(fin)return;clearInterval(ty);clearTimeout(tm);feed.innerHTML='';beats.forEach(b=>{const l=el('div','story-line '+(b.who?'npc':'narr'));l.innerHTML=b.who?`<span class="sp-who">${esc(b.who)}</span><span class="sp-text">${esc(b.text)}</span>`:`<span class="sp-narr">${esc(b.text)}</span>`;feed.appendChild(l);});fin=true;finish();};
  next();
}
function typeInto(node,text,speed,cb){if(!node)return;node.classList.add('typing');node.textContent='';let i=0;const iv=setInterval(()=>{node.textContent=text.slice(0,++i);if(i>=text.length){clearInterval(iv);node.classList.remove('typing');cb&&cb();}},speed||14);}
function accessFlash(kind,text){const o=el('div','aflash '+kind);const t=el('div','af-t',text);t.setAttribute('data-t',text);o.appendChild(t);document.body.appendChild(o);setTimeout(()=>o.remove(),1100);}
function securedFlash(){accessFlash('secured','SYSTEM SECURED');}
function fx(){const t=$('.tgt');if(t){t.classList.add('glitch');setTimeout(()=>t.classList.remove('glitch'),450);}}

return {boot,_auth:evalAuth,_search:evalSearch,_union:evalUnion};
})();
