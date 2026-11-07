/* Где посетитель остановился в каждой книге. Только этот браузер, localStorage 'aceon:library'. */

const KEY = 'aceon:library';

function read() {
  try {
    return JSON.parse(localStorage.getItem(KEY) || 'null') || { books: {} };
  } catch (e) {
    return { books: {} };
  }
}

export function savedSpread(id) {
  const b = read().books[id];
  return b && Number.isInteger(b.spread) ? b.spread : 0;
}

export function saveSpread(id, spread) {
  const data = read();
  data.books[id] = { spread, at: Date.now() };
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch (e) {
    /* приватный режим: место не запоминаем */
  }
}
