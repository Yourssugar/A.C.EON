/* Приёмник на столе: тумблер питания, галетный переключатель на 7 каналов (песня на главу),
   экран-кинескоп с роликом YouTube. Ролик грузится только после включения тумблера. */

import { sfx } from './sfx.js';

const START = -120;
const STEP = 40;

export function createRadio(root, media, { folded = false } = {}) {
  const count = media.length;
  root.innerHTML = `
    <button class="radio-fold" type="button" aria-expanded="${!folded}">Радио</button>
    <div class="radio-body">
      <div class="radio-plate">
        <span class="screw"></span><span class="screw"></span><span class="screw"></span><span class="screw"></span>
        <div class="radio-head"><span>Приёмник архива</span><span class="radio-serial">тип А-19</span></div>
        <div class="crt"><canvas class="crt-noise" width="96" height="60"></canvas><div class="crt-video"></div><div class="crt-text"></div><div class="crt-glass"></div></div>
        <div class="radio-caption"><span class="radio-band"></span><span class="radio-title"></span></div>
        <div class="radio-controls">
          <div class="toggle">
            <span class="toggle-word">вкл</span>
            <button class="toggle-switch" type="button" role="switch" aria-checked="false" aria-label="Питание приёмника"><span class="toggle-nut"></span><span class="toggle-lever"></span></button>
            <span class="toggle-word">выкл</span>
            <span class="neon" aria-hidden="true"></span>
          </div>
          <div class="dial">
            <div class="dial-marks"></div>
            <button class="dial-knob" type="button" aria-label="Канал"><span class="dial-grip"></span><span class="dial-pointer"></span></button>
            <span class="dial-word">канал</span>
          </div>
        </div>
      </div>
    </div>`;

  const $ = (s) => root.querySelector(s);
  const toggle = $('.toggle-switch');
  const knob = $('.dial-knob');
  const marks = $('.dial-marks');
  const video = $('.crt-video');
  const text = $('.crt-text');
  const band = $('.radio-band');
  const title = $('.radio-title');
  const noise = $('.crt-noise');
  const fold = $('.radio-fold');
  const nctx = noise.getContext('2d');

  let power = false;
  let channel = 0;
  let here = 0;
  let noiseTimer = 0;
  let switchTimer = 0;

  for (let i = 0; i < count; i++) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'dial-mark';
    b.style.setProperty('--a', `${START + i * STEP}deg`);
    b.textContent = String(i + 1);
    b.setAttribute('aria-label', `Канал ${i + 1}`);
    b.addEventListener('click', () => select(i));
    marks.appendChild(b);
  }

  root.classList.toggle('folded', folded);
  fold.addEventListener('click', () => {
    const now = !root.classList.contains('folded');
    root.classList.toggle('folded', now);
    fold.setAttribute('aria-expanded', String(!now));
  });

  function label() {
    const m = media[channel];
    band.textContent = `Песнь ${String(channel + 1).padStart(2, '0')}`;
    title.textContent = power ? (m.youtube ? (m.title || 'в эфире') : 'не записана') : 'питание выключено';
    knob.style.setProperty('--a', `${START + channel * STEP}deg`);
    marks.querySelectorAll('.dial-mark').forEach((el, i) => {
      el.classList.toggle('on', i === channel);
      el.classList.toggle('here', i === here);
    });
  }

  function drawNoise() {
    const img = nctx.createImageData(96, 60);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = Math.random() * 180;
      img.data[i] = v * 0.85;
      img.data[i + 1] = v;
      img.data[i + 2] = v * 0.8;
      img.data[i + 3] = 255;
    }
    nctx.putImageData(img, 0, 0);
  }

  function noiseOn(on) {
    clearInterval(noiseTimer);
    noise.style.opacity = on ? '1' : '0';
    if (on) noiseTimer = setInterval(drawNoise, 60);
  }

  function tune() {
    video.innerHTML = '';
    text.textContent = '';
    const m = media[channel];
    if (!power) return;
    if (m.youtube) {
      noiseOn(false);
      const f = document.createElement('iframe');
      f.src = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(m.youtube)}?autoplay=1&rel=0&playsinline=1&modestbranding=1`;
      f.title = m.title || `Песнь ${channel + 1}`;
      f.allow = 'autoplay; encrypted-media; picture-in-picture';
      f.allowFullscreen = true;
      f.loading = 'lazy';
      video.appendChild(f);
    } else {
      noiseOn(true);
      text.innerHTML = `<b>сигнала нет</b><span>песнь ${channel + 1} ещё не записана</span>`;
    }
  }

  // между каналами полсекунды шума, как при настройке
  function retune() {
    clearTimeout(switchTimer);
    video.innerHTML = '';
    text.textContent = '';
    noiseOn(true);
    switchTimer = setTimeout(tune, 420);
  }

  function setPower(on) {
    power = on;
    sfx.toggle();
    toggle.setAttribute('aria-checked', String(on));
    root.dataset.power = on ? 'on' : 'off';
    clearTimeout(switchTimer);
    if (on) {
      root.classList.add('warming');
      noiseOn(true);
      switchTimer = setTimeout(() => {
        root.classList.remove('warming');
        tune();
      }, 700);
    } else {
      video.innerHTML = '';
      text.textContent = '';
      noiseOn(false);
    }
    label();
  }

  function select(i) {
    const next = ((i % count) + count) % count;
    if (next === channel) return;
    channel = next;
    sfx.detent();
    label();
    if (power) retune();
  }

  toggle.addEventListener('click', () => setPower(!power));
  knob.addEventListener('click', () => select(channel + 1));
  knob.addEventListener('wheel', (e) => {
    e.preventDefault();
    select(channel + (e.deltaY > 0 ? 1 : -1));
  }, { passive: false });
  knob.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') { e.preventDefault(); e.stopPropagation(); select(channel + 1); }
    if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') { e.preventDefault(); e.stopPropagation(); select(channel - 1); }
  });

  root.dataset.power = 'off';
  label();

  return {
    /* Глава, которую сейчас читают: возле её цифры загорается точка. Канал сам не переключается,
       чтобы песня не обрывалась на каждой новой главе. */
    setChapter(i) {
      here = i;
      label();
    },
    tuneTo(i) {
      select(i);
    }
  };
}
