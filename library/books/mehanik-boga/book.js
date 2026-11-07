/* Настройки стола для «Механика бога».
   Текст глав лежит рядом в text.js, здесь оформление и музыка. */

export { CHAPTERS } from './text.js';

export const META = {
  id: 'mehanik-boga',
  title: 'Механик бога',
  form: 'Повесть',
  series: 'Архив машины / протокол 01',
  // кожа обложки и вставки, как на полке
  leather: '#4b1813',
  inlay: '#1d1412',
  // строка над текстом на левых страницах
  runningHead: 'Механик бога'
};

/* Песня на каждую главу: youtube - id ролика, title - подпись на экране радио.
   illustration - картинка на левую страницу перед главой (путь от папки library) или null. */
export const MEDIA = [
  { youtube: '8NCeS6WIjtA', title: 'Der Mechaniker Gottes', illustration: null },
  { youtube: null, title: null, illustration: null },
  { youtube: null, title: null, illustration: null },
  { youtube: null, title: null, illustration: null },
  { youtube: null, title: null, illustration: null },
  { youtube: null, title: null, illustration: null },
  { youtube: null, title: null, illustration: null }
];

/* Что лежит на столе. Имена предметов из js/book/props-*.js */
export const DESK = {
  theme: 'machine',
  props: ['gauge', 'gears', 'wrench', 'cards', 'key', 'tea'],
  // цвет света лампы и общего полумрака
  lamp: '#ffd29a',
  ambient: '#2a1c14'
};
