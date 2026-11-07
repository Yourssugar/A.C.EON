/* Три профиля графики. Выбор посетителя хранится в общем объекте сайта
   localStorage 'aceon:site' в поле gfx, чтобы другие страницы могли его прочитать. */

export const PROFILES = {
  low: { label: 'низкая', pixelRatio: 1, shadows: false, shadowSize: 512, dust: 0, steam: 6, spine: 64, cover: 256 },
  medium: { label: 'средняя', pixelRatio: 1.5, shadows: true, shadowSize: 1024, dust: 140, steam: 12, spine: 128, cover: 512 },
  high: { label: 'высокая', pixelRatio: 2, shadows: true, shadowSize: 2048, dust: 320, steam: 18, spine: 128, cover: 1024 }
};

export const ORDER = ['low', 'medium', 'high'];

function readSite() {
  try {
    return JSON.parse(localStorage.getItem('aceon:site') || 'null') || {};
  } catch (e) {
    return {};
  }
}

export function savedQuality() {
  const q = readSite().gfx;
  return ORDER.includes(q) ? q : null;
}

export function saveQuality(q) {
  const site = readSite();
  site.gfx = q;
  if (!site.v) site.v = 1;
  try {
    localStorage.setItem('aceon:site', JSON.stringify(site));
  } catch (e) {
    /* приватный режим или нет места: просто не запоминаем */
  }
}

/* Стартовая догадка до замера кадров: слабые и мобильные устройства начинают со средней. */
export function guessQuality() {
  const touch = matchMedia('(pointer: coarse)').matches;
  const cores = navigator.hardwareConcurrency || 4;
  const memory = navigator.deviceMemory || 4;
  if (cores <= 2 || memory <= 2) return 'low';
  if (touch || cores <= 4) return 'medium';
  return 'high';
}
