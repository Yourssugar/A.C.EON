// coin-storage.js
// Логика хранилища фрагментов: адрес API берётся из coin.json,
// токен сессии живёт в localStorage, все проверки сумм делает сервер.

(function () {
    'use strict';

    var API = '';                 // адрес сервера из coin.json
    var TOKEN = localStorage.getItem('aceon_coin_token') || '';
    var rates = null;             // курс, лимиты, время окна
    var timeDelta = 0;            // поправка часов клиента к часам сервера
    var countdownTimer = null;
    var retryTimer = null;

    // ---------- утилиты ----------

    function $(id) { return document.getElementById(id); }

    function fmt(n) { return Number(n).toLocaleString('ru-RU'); }

    function show(screenId) {
        var screens = ['scr-loading', 'scr-offline', 'scr-auth', 'scr-recovery', 'scr-cabinet'];
        screens.forEach(function (s) { $(s).hidden = (s !== screenId); });
    }

    function setStatus(state, text) {
        var el = $('status');
        el.className = 'status ' + state;
        $('status-text').textContent = text;
    }

    function err(id, message) {
        var el = $(id);
        el.hidden = !message;
        el.textContent = message || '';
    }

    // ---------- связь с сервером ----------

    function loadApiAddress() {
        // засечка времени обходит кэш GitHub Pages
        return fetch('coin.json?t=' + Date.now())
            .then(function (r) { return r.json(); })
            .then(function (data) {
                API = (data.api || '').replace(/\/$/, '');
                if (!API) throw new Error('пустой адрес');
            });
    }

    function api(path, options) {
        options = options || {};
        var headers = { 'Content-Type': 'application/json' };
        if (TOKEN) headers['Authorization'] = 'Bearer ' + TOKEN;
        return fetch(API + path, {
            method: options.method || 'GET',
            headers: headers,
            body: options.body ? JSON.stringify(options.body) : undefined
        }).then(function (r) {
            return r.json().then(function (data) {
                if (r.status === 401 && !options.isAuth) {
                    logout();
                    throw new Error(data.error || 'Сеанс истёк');
                }
                if (!r.ok) throw new Error(data.error || 'Ошибка ' + r.status);
                return data;
            });
        });
    }

    // сетевой сбой: адрес туннеля мог смениться, перечитать coin.json и повторить
    function apiRetry(path, options) {
        return api(path, options).catch(function (e) {
            if (e instanceof TypeError) {
                return loadApiAddress().then(function () {
                    return api(path, options);
                });
            }
            throw e;
        });
    }

    function goOffline() {
        show('scr-offline');
        setStatus('off', 'нет связи');
        var sec = 15;
        $('retry-sec').textContent = sec;
        clearInterval(retryTimer);
        retryTimer = setInterval(function () {
            sec -= 1;
            $('retry-sec').textContent = sec;
            if (sec <= 0) {
                clearInterval(retryTimer);
                boot();
            }
        }, 1000);
    }

    // ---------- запуск ----------

    function boot() {
        show('scr-loading');
        setStatus('', 'соединение');
        loadApiAddress()
            .then(function () { return api('/api/health'); })
            .then(function () {
                setStatus('on', 'в сети');
                return api('/api/rates');
            })
            .then(function (r) {
                applyRates(r);
                if (TOKEN) return enterCabinet();
                show('scr-auth');
            })
            .catch(function (e) {
                if (e && e.message === 'Сеанс истёк') { show('scr-auth'); return; }
                goOffline();
            });
    }

    function applyRates(r) {
        rates = r;
        // разница часов: сервер прислал своё время, дальше считаем от него
        timeDelta = new Date(r.server_time_utc + 'Z') - new Date();
        $('daily-reward').textContent = r.daily_reward;
        $('w-rate').textContent = r.fragments_per_coin;
        $('w-min').textContent = r.min_withdraw;
        $('w-max').textContent = r.max_withdraw;
        $('w-amount').min = r.min_withdraw;
        $('w-amount').max = r.max_withdraw;
        startCountdown();
    }

    function startCountdown() {
        clearInterval(countdownTimer);
        function tick() {
            var target = new Date(rates.next_window_utc + 'Z');
            var now = new Date(Date.now() + timeDelta);
            var left = target - now;
            if (left <= 0) {
                // окно наступило: узнать время следующего
                api('/api/rates').then(applyRates).catch(function () {});
                return;
            }
            var d = Math.floor(left / 86400000);
            var h = Math.floor(left % 86400000 / 3600000);
            var m = Math.floor(left % 3600000 / 60000);
            var s = Math.floor(left % 60000 / 1000);
            function pad(x) { return (x < 10 ? '0' : '') + x; }
            $('w-countdown').textContent =
                (d > 0 ? d + 'д ' : '') + pad(h) + ':' + pad(m) + ':' + pad(s);
        }
        tick();
        countdownTimer = setInterval(tick, 1000);
    }

    // ---------- вход, регистрация, восстановление ----------

    function saveToken(t) {
        TOKEN = t;
        localStorage.setItem('aceon_coin_token', t);
    }

    function logout() {
        if (TOKEN) api('/api/logout', { method: 'POST', isAuth: true }).catch(function () {});
        TOKEN = '';
        localStorage.removeItem('aceon_coin_token');
        show('scr-auth');
    }

    $('tab-login').addEventListener('click', function () { switchTab('login'); });
    $('tab-register').addEventListener('click', function () { switchTab('register'); });

    function switchTab(which) {
        $('tab-login').classList.toggle('active', which === 'login');
        $('tab-register').classList.toggle('active', which === 'register');
        $('form-login').hidden = which !== 'login';
        $('form-register').hidden = which !== 'register';
        $('form-recover').hidden = true;
        err('auth-error', '');
    }

    $('show-recover').addEventListener('click', function () {
        $('form-login').hidden = true;
        $('form-register').hidden = true;
        $('form-recover').hidden = false;
        err('auth-error', '');
    });
    $('hide-recover').addEventListener('click', function () { switchTab('login'); });

    $('form-login').addEventListener('submit', function (e) {
        e.preventDefault();
        err('auth-error', '');
        apiRetry('/api/login', {
            method: 'POST', isAuth: true,
            body: { login: $('login-name').value.trim(), password: $('login-pass').value }
        }).then(function (data) {
            saveToken(data.token);
            enterCabinet();
        }).catch(function (e) { err('auth-error', e.message); });
    });

    $('form-register').addEventListener('submit', function (e) {
        e.preventDefault();
        err('auth-error', '');
        apiRetry('/api/register', {
            method: 'POST', isAuth: true,
            body: {
                login: $('reg-name').value.trim(),
                email: $('reg-email').value.trim(),
                password: $('reg-pass').value
            }
        }).then(function (data) {
            saveToken(data.token);
            $('recovery-code').textContent = data.recovery_code;
            show('scr-recovery');
        }).catch(function (e) { err('auth-error', e.message); });
    });

    $('form-recover').addEventListener('submit', function (e) {
        e.preventDefault();
        err('auth-error', '');
        apiRetry('/api/recover', {
            method: 'POST', isAuth: true,
            body: {
                login: $('rec-name').value.trim(),
                recovery_code: $('rec-code').value.trim(),
                new_password: $('rec-pass').value
            }
        }).then(function (data) {
            $('recovery-code').textContent = data.recovery_code;
            show('scr-recovery');
            // пароль сменён, но токена нет: после сохранения кода попросим войти
            TOKEN = '';
            localStorage.removeItem('aceon_coin_token');
        }).catch(function (e) { err('auth-error', e.message); });
    });

    $('btn-copy-code').addEventListener('click', function () {
        var code = $('recovery-code').textContent;
        if (navigator.clipboard) {
            navigator.clipboard.writeText(code);
            $('btn-copy-code').textContent = 'Скопировано';
            setTimeout(function () {
                $('btn-copy-code').textContent = 'Скопировать';
            }, 1500);
        }
    });

    $('btn-code-saved').addEventListener('click', function () {
        if (TOKEN) enterCabinet();
        else { switchTab('login'); show('scr-auth'); }
    });

    $('btn-logout').addEventListener('click', logout);

    // ---------- кабинет ----------

    function enterCabinet() {
        return apiRetry('/api/me').then(function (me) {
            renderMe(me);
            show('scr-cabinet');
            loadHistory();
        });
    }

    function renderMe(me) {
        $('cab-login').textContent = me.login;
        $('cab-balance').textContent = fmt(me.balance);
        $('cab-streak').textContent = me.streak > 1
            ? 'Серия входов: ' + me.streak
            : '';
        $('btn-daily').hidden = !me.daily_available;
        $('daily-done').hidden = me.daily_available;
        renderWithdrawal(me.withdrawal);
    }

    $('btn-daily').addEventListener('click', function () {
        $('btn-daily').disabled = true;
        apiRetry('/api/claim/daily', { method: 'POST' })
            .then(function (data) {
                $('cab-balance').textContent = fmt(data.balance);
                $('cab-streak').textContent = data.streak > 1
                    ? 'Серия входов: ' + data.streak
                    : '';
                $('btn-daily').hidden = true;
                $('daily-done').hidden = false;
                loadHistory();
            })
            .catch(function (e) {
                $('btn-daily').hidden = true;
                $('daily-done').hidden = false;
                $('daily-done').textContent = e.message;
            })
            .then(function () { $('btn-daily').disabled = false; });
    });

    // ---------- вывод ----------

    function renderWithdrawal(w) {
        $('form-withdraw').hidden = !!w;
        $('withdraw-active').hidden = !w;
        err('w-error', '');
        err('w-ok', '');
        if (w) {
            $('wa-fragments').textContent = fmt(w.fragments);
            $('wa-wallet').textContent = w.wallet;
        }
    }

    $('form-withdraw').addEventListener('submit', function (e) {
        e.preventDefault();
        err('w-error', '');
        var amount = parseInt($('w-amount').value, 10);
        var wallet = $('w-wallet').value.trim();
        var editing = $('form-withdraw').dataset.editing === '1';
        apiRetry('/api/withdraw', {
            method: editing ? 'PATCH' : 'POST',
            body: { fragments: amount, wallet: wallet }
        }).then(function (data) {
            $('form-withdraw').dataset.editing = '';
            $('cab-balance').textContent = fmt(data.balance);
            return apiRetry('/api/me');
        }).then(function (me) {
            renderMe(me);
            err('w-ok', 'Заявка в очереди. Обработка в ближайшее окно синхронизации.');
            loadHistory();
        }).catch(function (e) { err('w-error', e.message); });
    });

    $('btn-w-edit').addEventListener('click', function () {
        // форма открывается с текущими значениями заявки, отправка уйдёт как правка
        $('w-amount').value = $('wa-fragments').textContent.replace(/\D/g, '');
        $('w-wallet').value = $('wa-wallet').textContent;
        $('form-withdraw').dataset.editing = '1';
        $('form-withdraw').hidden = false;
        $('withdraw-active').hidden = true;
        $('w-submit').textContent = 'Сохранить заявку';
    });

    $('btn-w-cancel').addEventListener('click', function () {
        apiRetry('/api/withdraw', { method: 'DELETE' })
            .then(function (data) {
                $('cab-balance').textContent = fmt(data.balance);
                $('form-withdraw').dataset.editing = '';
                $('w-submit').textContent = 'Оставить заявку';
                renderWithdrawal(null);
                err('w-ok', 'Заявка отменена, фрагменты возвращены.');
                loadHistory();
            })
            .catch(function (e) { err('w-error', e.message); });
    });

    // ---------- журнал ----------

    var REASONS = {
        daily: 'ежедневный сбор',
        bonus: 'начисление',
        purchase: 'покупка',
        withdraw_hold: 'заморозка под вывод',
        withdraw_return: 'возврат в хранилище',
        withdraw_done: 'выведено в ACEON'
    };

    function loadHistory() {
        apiRetry('/api/history').then(function (data) {
            var list = $('history-list');
            list.innerHTML = '';
            $('history-empty').hidden = data.history.length > 0;
            data.history.forEach(function (row) {
                var li = document.createElement('li');
                var what = document.createElement('span');
                what.className = 'h-what';
                what.textContent = (REASONS[row.reason] || row.reason) +
                    ' ' + row.created_at.slice(0, 16);
                var amount = document.createElement('span');
                amount.className = 'h-amount ' + (row.amount > 0 ? 'h-plus' : 'h-minus');
                amount.textContent = (row.amount > 0 ? '+' : '') + fmt(row.amount);
                li.appendChild(what);
                li.appendChild(amount);
                list.appendChild(li);
            });
        }).catch(function () {});
    }

    $('btn-retry').addEventListener('click', function () {
        clearInterval(retryTimer);
        boot();
    });

    boot();
})();
