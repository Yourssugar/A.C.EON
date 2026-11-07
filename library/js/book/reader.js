/* Режим чтения текстом: та же глава обычной HTML-страницей. Для телефона, для тех, кому
   мелко на 3D-развороте, и запасной вариант, если WebGL не запустился. */

export function createReader(root, chapters, { onClose } = {}) {
  root.innerHTML = `
    <div class="reader-bar">
      <nav class="reader-chapters" aria-label="Главы"></nav>
      <button class="chip reader-close" type="button">Закрыть</button>
    </div>
    <article class="reader-page" tabindex="-1"></article>`;
  const nav = root.querySelector('.reader-chapters');
  const page = root.querySelector('.reader-page');
  const close = root.querySelector('.reader-close');
  let current = 0;

  chapters.forEach((ch, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = ch.roman;
    b.title = ch.title;
    b.addEventListener('click', () => show(i));
    nav.appendChild(b);
  });

  function show(i) {
    current = i;
    const ch = chapters[i];
    page.innerHTML = '';
    const kicker = document.createElement('p');
    kicker.className = 'reader-kicker';
    kicker.textContent = `Глава ${ch.roman}`;
    const h = document.createElement('h2');
    h.textContent = ch.title;
    page.append(kicker, h);
    for (const p of ch.paragraphs) {
      const el = document.createElement('p');
      el.textContent = p.text;
      if (p.style !== 'body') el.className = p.style;
      page.appendChild(el);
    }
    if (i < chapters.length - 1) {
      const next = document.createElement('button');
      next.type = 'button';
      next.className = 'btn reader-next';
      next.textContent = `Глава ${chapters[i + 1].roman}. ${chapters[i + 1].title}`;
      next.addEventListener('click', () => show(i + 1));
      page.appendChild(next);
    }
    nav.querySelectorAll('button').forEach((b, k) => b.classList.toggle('on', k === i));
    root.scrollTop = 0;
    page.scrollTop = 0;
  }

  close.addEventListener('click', () => hide());

  function hide() {
    root.classList.remove('open');
    root.setAttribute('aria-hidden', 'true');
    onClose && onClose(current);
  }

  return {
    open(i) {
      show(i);
      root.classList.add('open');
      root.setAttribute('aria-hidden', 'false');
      page.focus({ preventScroll: true });
    },
    close: hide,
    get isOpen() { return root.classList.contains('open'); }
  };
}
