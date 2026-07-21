/* Протокол между браузером и ноутом.

   Ноут живёт за Cloudflare-туннелем, адрес которого меняется при каждом старте.
   Поэтому ноут при запуске пишет текущий адрес в JSON в репозиторий, а браузер
   читает этот JSON и узнаёт, куда стучаться. Формат: { "base": "https://...." }.

   Все функции мягкие: если сервер недоступен (ноут выключен, туннель сменился),
   они возвращают null или отказ, а не ломают страницу. Тогда страница может
   откатиться на локальную демо-последовательность. */

(function(root){
'use strict';

function trim(base){ return String(base).replace(/\/+$/, ''); }

async function discoverEndpoint(configUrl){
  try {
    const res = await fetch(configUrl, { cache: 'no-store' });
    if(!res.ok) return null;
    const j = await res.json();
    return (j && (j.base || j.url)) || null;
  } catch(e){ return null; }
}

async function getTask(base, seqId){
  try {
    const u = trim(base) + '/task' + (seqId ? ('?seq_id=' + encodeURIComponent(seqId)) : '');
    const res = await fetch(u, { cache: 'no-store' });
    if(!res.ok) return null;
    return await res.json();
  } catch(e){ return null; }
}

async function submitFinding(base, finding){
  try {
    const res = await fetch(trim(base) + '/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(finding)
    });
    return await res.json();
  } catch(e){ return { accepted: false, reason: 'сервер недоступен' }; }
}

async function getCount(base){
  try {
    const res = await fetch(trim(base) + '/count', { cache: 'no-store' });
    if(!res.ok) return null;
    return await res.json();
  } catch(e){ return null; }
}

async function submitNearmiss(base, nearmiss){
  try {
    const res = await fetch(trim(base) + '/nearmiss', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(nearmiss)
    });
    return await res.json();
  } catch(e){ return null; }
}

const P = { discoverEndpoint, getTask, submitFinding, submitNearmiss, getCount };
root.LodaProtocol = P;
if(typeof module !== 'undefined' && module.exports) module.exports = P;

})(typeof self !== 'undefined' ? self : (typeof global !== 'undefined' ? global : this));
