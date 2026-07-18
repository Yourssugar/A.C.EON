// coin-info.js
// Читает coin-info.json и раскладывает цифры по странице.
// Числа правятся в json, этот файл трогать не нужно.

(function () {
    'use strict';

    var REDUCED = window.matchMedia &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function fmt(n) {
        return Number(n).toLocaleString('ru-RU');
    }

    // короткая форма для карточек: 1 млрд, 10 млн, 250 тыс
    function fmtShort(n) {
        n = Number(n);
        if (n >= 1e9) return trim(n / 1e9) + ' млрд';
        if (n >= 1e6) return trim(n / 1e6) + ' млн';
        if (n >= 1e3) return trim(n / 1e3) + ' тыс';
        return fmt(n);
    }
    function trim(x) {
        return (Math.round(x * 10) / 10).toLocaleString('ru-RU');
    }

    // карточка: короткое число крупно, полное мелкой строкой (если отличается)
    function putCard(id, value) {
        var short = fmtShort(value);
        put(id, short);
        var full = document.getElementById('f-' + id.slice(2));
        if (full) full.textContent = (value >= 1000) ? fmt(value) : '';
    }

    function put(id, text) {
        var el = document.getElementById(id);
        if (el) el.textContent = text;
    }

    // разгон числа от нуля до значения за секунду с небольшим
    function countUp(id, target) {
        var el = document.getElementById(id);
        if (!el) return;
        if (REDUCED || target === 0) {
            el.textContent = fmt(target);
            return;
        }
        var start = null;
        var DURATION = 1300;
        function step(ts) {
            if (!start) start = ts;
            var p = Math.min((ts - start) / DURATION, 1);
            var eased = 1 - Math.pow(1 - p, 3);
            el.textContent = fmt(Math.round(target * eased));
            if (p < 1) requestAnimationFrame(step);
        }
        requestAnimationFrame(step);
    }

    function render(info) {
        put('m-ticker', info.ticker);
        put('m-standard', info.standard);
        put('m-network', info.network);

        countUp('v-total', info.total_supply);
        putCard('v-circulating', info.circulating);
        putCard('v-reserved', info.reserved);
        putCard('v-burned', info.burned);
        put('v-nft', fmt(info.nft_minted));

        put('v-listing-note', info.listing_note);
        put('v-nft-note', info.nft_note);
        put('v-burn-min', info.burn_min_percent);
        put('v-burn-max', info.burn_max_percent);
        put('v-remaining', fmt(info.total_supply - info.burned));

        var d = info.distribution;
        put('l-dev', d.developers_percent + '%');
        put('l-exchange', d.exchange_percent + '%');
        put('l-rewards', d.rewards_percent + '%');

        renderTranche(info);

        // полоса распределения выезжает после отрисовки
        setTimeout(function () {
            setPart('bar-dev', d.developers_percent);
            setPart('bar-exchange', d.exchange_percent);
            setPart('bar-rewards', d.rewards_percent);
        }, 100);

        renderContract(info);
    }

    // биржевая доля и первый транш
    function renderTranche(info) {
        var pool = info.total_supply * info.distribution.exchange_percent / 100;
        var pct = info.first_tranche / pool * 100;
        put('v-tranche', fmt(info.first_tranche));
        put('v-pool', fmt(pool));
        put('v-pool-scale', fmt(pool));
        put('v-tranche-pct', trim(pct) + '%');
        put('v-tranche-note', info.tranche_note);
        put('v-activity-note', info.activity_note);
        setTimeout(function () {
            var fill = document.getElementById('tranche-fill');
            // маленький транш всё равно должен быть виден на полосе
            fill.style.width = Math.max(pct, 1.2) + '%';
        }, 100);
    }

    function setPart(id, percent) {
        var el = document.getElementById(id);
        if (!el) return;
        el.style.width = percent + '%';
        el.querySelector('span').textContent = percent + '%';
    }

    function renderContract(info) {
        if (!info.contract) return;
        document.getElementById('contract-empty').hidden = true;
        var row = document.getElementById('contract-row');
        row.hidden = false;
        put('v-contract', info.contract);

        var copyBtn = document.getElementById('btn-copy');
        copyBtn.addEventListener('click', function () {
            if (navigator.clipboard) {
                navigator.clipboard.writeText(info.contract);
                copyBtn.textContent = 'Скопировано';
                setTimeout(function () {
                    copyBtn.textContent = 'Скопировать адрес';
                }, 1500);
            }
        });

        var mmBtn = document.getElementById('btn-metamask');
        if (!window.ethereum) {
            mmBtn.hidden = true;
            return;
        }
        mmBtn.addEventListener('click', function () {
            window.ethereum.request({
                method: 'wallet_watchAsset',
                params: {
                    type: 'ERC20',
                    options: {
                        address: info.contract,
                        symbol: info.ticker,
                        decimals: info.decimals
                    }
                }
            }).catch(function () { /* пользователь закрыл окно, это не ошибка */ });
        });
    }

    fetch('coin-info.json')
        .then(function (r) { return r.json(); })
        .then(render)
        .catch(function () {
            put('v-total', 'нет данных');
            document.querySelector('.supply-note').textContent =
                'Файл coin-info.json не загрузился. Обнови страницу.';
        });
})();
