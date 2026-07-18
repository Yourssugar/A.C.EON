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
        countUp('v-circulating', info.circulating);
        countUp('v-reserved', info.reserved);
        countUp('v-burned', info.burned);
        countUp('v-nft', info.nft_minted);

        put('v-listing-note', info.listing_note);
        put('v-nft-note', info.nft_note);
        put('v-burn-min', info.burn_min_percent);
        put('v-burn-max', info.burn_max_percent);
        put('v-remaining', fmt(info.total_supply - info.burned));

        var d = info.distribution;
        put('l-dev', d.developers_percent + '%');
        put('l-exchange', d.exchange_percent + '%');
        put('l-rewards', d.rewards_percent + '%');

        // полоса распределения выезжает после отрисовки
        setTimeout(function () {
            setPart('bar-dev', d.developers_percent);
            setPart('bar-exchange', d.exchange_percent);
            setPart('bar-rewards', d.rewards_percent);
        }, 100);

        renderContract(info);
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
