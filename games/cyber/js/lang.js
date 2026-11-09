/* A.C.EON BREACH: тексты. Пока русский и английский, остальные языки берут английский.
   Разметка внутри строк (её разбирает prologue.js):
     [a]...[/a] янтарь (прошлое, меч)   [c]...[/c] циан (защита)   [r] затёртая плашка */
(function(){
'use strict';
var L={
"en":{
"cy.title":"BREACH",
"ui.skip":"SKIP",
"ui.hint":"space or click: next",
"ui.start":"START THE FIRST CASE",
"ui.loading":"opening case 1 ...",

"pr.k.init":"bresh // init",
"pr.k.title":"bresh // prologue",
"pr.k.archive":"case 0 // archive",
"pr.k.role":"role // tester",
"pr.k.sword":"rule of the game",
"pr.k.shield":"shield // start",

"pr.boot.1":"A.C.EON SECURITY RANGE",
"pr.boot.2":"case files ..... ok",
"pr.boot.3":"access rights ..... [c]confirmed[/c]",

"pr.title":"BREACH",
"pr.title.sub":"a defense training campaign",
"pr.title.1":"A game about not getting breached.",

"pr.arch.lead":"closed report",
"pr.arch.k1":"target",
"pr.arch.k2":"way in",
"pr.arch.v2":"through a person, not through code",
"pr.arch.k3":"entry point",
"pr.arch.k4":"what helped",
"pr.arch.v4":"one sentence over the phone",
"pr.arch.k5":"damage",
"pr.arch.v5":"full access",
"pr.arch.k6":"could it be stopped",
"pr.arch.v6":"yes, at every step",
"pr.arch.1":"The details are redacted on purpose: how it was done is not what we need.",
"pr.arch.2":"We need [c]why it worked[/c] and how to close it.",

"pr.role.lead":"who you are",
"pr.role.1":"The [c]company invited you[/c] itself. There is a contract and a scope.",
"pr.role.2":"Your job is to find the hole before someone else does.",
"pr.role.3":"At the end you hand in a report: where it is thin and how to fix it.",

"pr.sword.lead":"sword",
"pr.sword.1":"The [a]sword[/a] has already done its part, off screen.",
"pr.sword.2":"You prepared, got to [r], found [r] and wrote everything down.",
"pr.sword.3":"There is no more sword in this game. It showed where the [c]shield[/c] goes.",

"pr.shield.title":"SHIELD",
"pr.shield.sub":"a defense course on closed cases",
"pr.shield.1":"Access on a need-to-know basis. Key cards instead of passwords. Who can reach the hardware.",
"pr.shield.2":"No system is unbreakable. In a good one a breach is [c]costly, noisy and noticed[/c]."
},

"ru":{
"cy.title":"БРЕШЬ",
"ui.skip":"ПРОПУСТИТЬ",
"ui.hint":"пробел или клик: дальше",
"ui.start":"НАЧАТЬ ПЕРВОЕ ДЕЛО",
"ui.loading":"открываю дело 1 ...",

"pr.k.init":"bresh // init",
"pr.k.title":"bresh // пролог",
"pr.k.archive":"дело 0 // архив",
"pr.k.role":"роль // тестер",
"pr.k.sword":"правило игры",
"pr.k.shield":"щит // старт",

"pr.boot.1":"A.C.EON SECURITY RANGE",
"pr.boot.2":"материалы дела ..... ок",
"pr.boot.3":"права доступа ..... [c]подтверждены[/c]",

"pr.title":"БРЕШЬ",
"pr.title.sub":"учебная кампания по защите",
"pr.title.1":"Игра про то, как не дать себя взломать.",

"pr.arch.lead":"закрытый отчёт",
"pr.arch.k1":"объект",
"pr.arch.k2":"как вошли",
"pr.arch.v2":"через человека, не через код",
"pr.arch.k3":"точка входа",
"pr.arch.k4":"что помогло",
"pr.arch.v4":"одна фраза по телефону",
"pr.arch.k5":"ущерб",
"pr.arch.v5":"полный доступ",
"pr.arch.k6":"можно было остановить",
"pr.arch.v6":"да, на каждом шаге",
"pr.arch.1":"Детали затёрты нарочно: как это делали, нам не нужно.",
"pr.arch.2":"Нужно другое: [c]почему это сработало[/c] и как это закрыть.",

"pr.role.lead":"кто ты",
"pr.role.1":"Тебя [c]пригласила сама компания[/c]. Есть договор и рамки.",
"pr.role.2":"Твоя работа: найти дыру раньше чужих.",
"pr.role.3":"В конце ты сдаёшь отчёт: где тонко и как починить.",

"pr.sword.lead":"меч",
"pr.sword.1":"[a]Меч[/a] своё уже сделал, за кадром.",
"pr.sword.2":"Ты подготовился, добрался до [r], нашёл [r] и всё записал.",
"pr.sword.3":"Больше меча в игре не будет. Он показал, куда ставить [c]щит[/c].",

"pr.shield.title":"ЩИТ",
"pr.shield.sub":"курс защиты на закрытых делах",
"pr.shield.1":"Доступ по надобности. Карты вместо паролей. Кто может дотянуться до железа.",
"pr.shield.2":"Неуязвимых систем нет. В хорошей взлом выходит [c]дорогим, шумным и замеченным[/c]."
}
};
for(var k in L)I18n.add(k,L[k]);
})();
