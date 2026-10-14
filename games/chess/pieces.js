/* A.C.EON CHESS: набор фигур в SVG.
   Одинаково выглядит в любой ОС, чёткий на любом размере.
   Цвета задаются CSS-переменными в chess.css (--pw-*, --pb-*). */
(function(){
'use strict';

/* общая подставка для всех фигур */
var BASE='<path class="pc-body" d="M22 91h56a3 3 0 0 0 3-3v-3c0-4-3-7-7-7H26c-4 0-7 3-7 7v3a3 3 0 0 0 3 3z"/>';

var SHAPES={
  P:BASE+
    '<path class="pc-body" d="M31 78c2-10 8-18 13-22h12c5 4 11 12 13 22z"/>'+
    '<rect class="pc-body" x="35" y="50" width="30" height="7" rx="3.5"/>'+
    '<circle class="pc-body" cx="50" cy="36" r="13"/>',

  R:BASE+
    '<path class="pc-body" d="M29 78l4-32h34l4 32z"/>'+
    '<path class="pc-body" d="M27 46V19h10v8h7v-8h12v8h7v-8h10v27z"/>'+
    '<path class="pc-line" d="M34 46h32M36 58h28M34.5 70h31"/>',

  N:BASE+
    '<path class="pc-body" d="M33 78c-2-11 3-19 10-25-7 2-13 4-18 0-6-4-5-12 1-17 5-4 9-10 14-16l2-9 6 7c16 3 29 17 28 37-1 10-4 17-4 23z"/>'+
    '<circle class="pc-eye" cx="45" cy="30" r="3"/>'+
    '<path class="pc-line" d="M27 44c2 1 4 1 6 0M58 28c6 8 8 19 6 32"/>',

  B:BASE+
    '<path class="pc-body" d="M32 78c3-9 7-16 11-21h14c4 5 8 12 11 21z"/>'+
    '<rect class="pc-body" x="36" y="50" width="28" height="7" rx="3.5"/>'+
    '<path class="pc-body" d="M50 14c-15 8-19 21-14 36h28c5-15 1-28-14-36z"/>'+
    '<circle class="pc-body" cx="50" cy="10" r="4.5"/>'+
    '<path class="pc-line" d="M57 25L46 38"/>',

  Q:BASE+
    '<path class="pc-body" d="M29 78c4-11 7-21 8-31h26c1 10 4 20 8 31z"/>'+
    '<path class="pc-body" d="M26 47l-5-25 15 14 6-20 8 18 8-18 6 20 15-14-5 25z"/>'+
    '<circle class="pc-body" cx="21" cy="20" r="4"/><circle class="pc-body" cx="42" cy="14" r="4"/>'+
    '<circle class="pc-body" cx="58" cy="14" r="4"/><circle class="pc-body" cx="79" cy="20" r="4"/>'+
    '<path class="pc-line" d="M38 60h24"/>',

  K:BASE+
    '<path class="pc-body" d="M29 78c4-11 7-21 8-31h26c1 10 4 20 8 31z"/>'+
    '<path class="pc-body" d="M27 47c-7-9-3-20 7-21 7 0 12 5 16 11 4-6 9-11 16-11 10 1 14 12 7 21z"/>'+
    '<path class="pc-body" d="M46 6h8v8h7v7h-7v12h-8V21h-7v-7h7z"/>'+
    '<path class="pc-line" d="M38 60h24"/>'
};

/* type: 'P','N','B','R','Q','K'; color: 'w'|'b' */
function svg(type,color){
  return '<svg class="pc pc-'+color+'" viewBox="0 0 100 100" aria-hidden="true">'+SHAPES[type]+'</svg>';
}

window.ChessPieces={svg:svg,types:['K','Q','R','B','N','P']};
})();
