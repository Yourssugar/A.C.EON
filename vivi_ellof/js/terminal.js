/* Терминал на чёрном экране сразу после ключа: «/V», «/Vi», «/Viv», «/Vivi», точки,
   потом двоичный поток (сообщение в UTF-8 на языке посетителя).
   Всё анимируется только через transform и opacity: браузер рисует это отдельно от основного потока,
   поэтому текст не замирает, пока под ним грузится и компилируется сцена.
   Каждая строка открывается шторкой, которая сдвигается на один символ за шаг (steps).

   Повторный вход (opts.fast): всё печатается вдвое быстрее.

   makeTerminal(lang, opts) -> { el, total (мс до конца печати), hide() } */

const MSG = {
  ru: 'Виви Эллоф.....наблюдатель обнаружен, вход подтверждён......ПОИСК ПОИСК ПОИСК.....',
  en: 'Vivi Ellof.....observer detected, entry confirmed......SEARCH SEARCH SEARCH.....'
};

function toBinary(text) {
  return Array.from(new TextEncoder().encode(text)).map((b) => b.toString(2).padStart(8, '0')).join(' ');
}

export function makeTerminal(lang, opts) {
  const F = opts && opts.fast ? 0.5 : 1;
  const el = document.createElement('div');
  el.style.cssText = 'position:absolute;left:8vw;top:22vh;right:8vw;z-index:4;pointer-events:none;'
    + 'font-family:"JetBrains Mono",Consolas,monospace;color:#cfd7e6;transition:opacity .9s ease;';
  const css = document.createElement('style');
  css.textContent = '@keyframes vvOpen{from{transform:translateX(0)}to{transform:translateX(100%)}}'
    + '@keyframes vvBlink{0%,49%{opacity:1}50%,100%{opacity:0}}'
    + '@keyframes vvIn{from{opacity:0}to{opacity:1}}';
  el.appendChild(css);

  let t = 400 * F;
  function line(text, opts) {
    const o = opts || {};
    const n = Array.from(text).length;
    const d = document.createElement('div');
    d.style.cssText = 'position:relative;overflow:hidden;white-space:pre;width:calc(' + n + 'ch + ' + (n * ((o.ls || 0) + 1)) + 'px);max-width:100%;'
      + 'font-size:' + (o.size || 16) + 'px;line-height:1.55;color:' + (o.color || '#cfd7e6') + ';letter-spacing:' + (o.ls || 0) + 'px;';
    d.textContent = text;
    const cover = document.createElement('div');
    const dur = Math.max(1, n * (o.ms || 90) * F);
    cover.style.cssText = 'position:absolute;inset:0;background:#000;will-change:transform;'
      + 'animation:vvOpen ' + dur + 'ms steps(' + n + ',end) ' + t + 'ms forwards;';
    d.appendChild(cover);
    el.appendChild(d);
    t += dur + (o.gap || 0) * F;
    return d;
  }

  ['/V', '/Vi', '/Viv', '/Vivi'].forEach((s) => line(s, { ms: 80, gap: 170, size: 18, ls: 1 }));
  /* точки чуть позже, красным */
  line('.   .   .', { ms: 110, gap: 300, size: 18, color: '#c23a44' });

  /* двоичный поток: делим на строки по 8 байт, чтобы каждая строка открывалась своей шторкой */
  const bits = toBinary(MSG[lang] || MSG.en).split(' ');
  const per = Math.max(4, Math.min(8, Math.floor((innerWidth * 0.84) / (9 * 7.4))));
  for (let i = 0; i < bits.length; i += per) {
    line(bits.slice(i, i + per).join(' '), { ms: 1.1, size: 12, color: '#6fd3d6', ls: 0.5 });
  }
  /* мигающий курсор в конце */
  const caret = document.createElement('span');
  caret.textContent = '█';
  caret.style.cssText = 'display:inline-block;font-size:12px;color:#6fd3d6;opacity:0;'
    + 'animation:vvIn 1ms ' + t + 'ms forwards, vvBlink .9s steps(1) ' + (t + 1) + 'ms infinite;';
  el.appendChild(caret);

  return {
    el,
    total: t,
    hide() { el.style.opacity = '0'; setTimeout(() => el.remove(), 1200); }
  };
}
