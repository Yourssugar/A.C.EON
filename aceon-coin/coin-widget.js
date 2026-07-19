// coin-widget.js
// Плашка фрагментов для любой страницы портала. Подключение одной строкой:
//   <script src="/A.C.EON/aceon-coin/coin-widget.js" defer></script>
// Путь к coin.json и хранилищу вычисляется из адреса этого скрипта,
// поэтому строка одинакова для страниц любой вложенности.

(function () {
    'use strict';

    // адрес папки aceon-coin берётся из src самого скрипта
    var script = document.currentScript;
    if (!script) return;
    var BASE = script.src.replace(/coin-widget\.js.*$/, '');
    var STORAGE_PAGE = BASE + 'coin-storage.html';

    // на самом хранилище виджет не нужен
    if (location.href.indexOf('coin-storage.html') !== -1) return;

    var TOKEN = localStorage.getItem('aceon_coin_token') || '';

    // ---------- стили ----------

    var css = [
        '#aceon-coin-widget {',
        '  position: fixed; right: 14px; bottom: 14px; z-index: 9990;',
        '  display: flex; align-items: center; gap: 8px;',
        '  padding: 8px 14px 8px 10px;',
        '  background: #0d1017; color: #e9edf5;',
        '  border: 1px solid #232b3d;',
        '  clip-path: polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 10px 100%, 0 calc(100% - 10px));',
        '  font: 13px/1.2 "JetBrains Mono", "Courier New", monospace;',
        '  text-decoration: none; cursor: pointer;',
        '  opacity: 0.92; transition: opacity 0.15s;',
        '}',
        '#aceon-coin-widget:hover { opacity: 1; }',
        '#aceon-coin-widget .acw-glyph {',
        '  width: 18px; height: 18px; border-radius: 50%;',
        '  border: 1.5px solid #e8b64c; color: #e8b64c;',
        '  display: flex; align-items: center; justify-content: center;',
        '  font-size: 11px; font-weight: 700; flex-shrink: 0;',
        '}',
        '#aceon-coin-widget .acw-value { color: #e8b64c; font-weight: 700; }',
        '#aceon-coin-widget .acw-label { color: #8a93a6; }',
        '#aceon-coin-widget.acw-off .acw-glyph { border-color: #8a93a6; color: #8a93a6; }',
        '#aceon-coin-widget .acw-dot {',
        '  width: 7px; height: 7px; border-radius: 50%;',
        '  background: #e8b64c; box-shadow: 0 0 6px #e8b64c;',
        '  animation: acw-pulse 1.6s ease-in-out infinite;',
        '}',
        '@keyframes acw-pulse {',
        '  0%, 100% { transform: scale(1); opacity: 1; }',
        '  50% { transform: scale(1.5); opacity: 0.5; }',
        '}',
        '@media (prefers-reduced-motion: reduce) {',
        '  #aceon-coin-widget .acw-dot { animation: none; }',
        '}'
    ].join('\n');

    var styleTag = document.createElement('style');
    styleTag.textContent = css;
    document.head.appendChild(styleTag);

    // ---------- плашка ----------

    var box = document.createElement('a');
    box.id = 'aceon-coin-widget';
    box.href = STORAGE_PAGE;
    box.title = 'Хранилище фрагментов A.C.EON';

    var glyph = document.createElement('span');
    glyph.className = 'acw-glyph';
    glyph.textContent = 'A';

    var text = document.createElement('span');
    text.className = 'acw-label';
    text.textContent = 'хранилище';

    box.appendChild(glyph);
    box.appendChild(text);
    document.body.appendChild(box);

    // ---------- данные ----------

    function setLogged(balance, dailyAvailable) {
        text.className = 'acw-value';
        text.textContent = Number(balance).toLocaleString('ru-RU');
        var old = box.querySelector('.acw-dot');
        if (old) old.remove();
        if (dailyAvailable) {
            var dot = document.createElement('span');
            dot.className = 'acw-dot';
            dot.title = 'Ежедневный фрагмент не собран';
            box.appendChild(dot);
        }
    }

    function setGuest() {
        box.classList.remove('acw-off');
        text.className = 'acw-label';
        text.textContent = 'хранилище';
    }

    function setOffline() {
        box.classList.add('acw-off');
        text.className = 'acw-label';
        text.textContent = 'оффлайн';
    }

    function refresh() {
        fetch(BASE + 'coin.json?t=' + Date.now())
            .then(function (r) { return r.json(); })
            .then(function (data) {
                var api = (data.api || '').replace(/\/$/, '');
                if (!api) throw new Error('нет адреса');
                if (!TOKEN) { setGuest(); return; }
                return fetch(api + '/api/me', {
                    headers: { 'Authorization': 'Bearer ' + TOKEN }
                }).then(function (r) {
                    if (r.status === 401) { setGuest(); return; }
                    if (!r.ok) throw new Error('ошибка ' + r.status);
                    return r.json().then(function (me) {
                        setLogged(me.balance, me.daily_available);
                    });
                });
            })
            .catch(setOffline);
    }

    refresh();

    // возврат на вкладку: баланс мог измениться в другом окне
    document.addEventListener('visibilitychange', function () {
        if (!document.hidden) {
            TOKEN = localStorage.getItem('aceon_coin_token') || '';
            refresh();
        }
    });
})();
