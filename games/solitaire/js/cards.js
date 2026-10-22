/* A.C.EON SOLITAIRE: рисунок карт (SVG). Свои масти и раскладка значков, без картинок и шрифтов-эмодзи,
   поэтому карты одинаково выглядят на любом устройстве и в любом браузере.

   Cards.defs()          вставить символы мастей в страницу (один раз)
   Cards.face(card)      SVG лица карты
   Cards.back(theme)     рубашка: 'aceon' | 'red' | 'blue'
   Cards.suit(s, cls)    маленький значок масти для интерфейса */
(function(){
'use strict';

var NS='http://www.w3.org/2000/svg';
var RANK=['','A','2','3','4','5','6','7','8','9','10','J','Q','K'];
var RED='#c8102e',BLACK='#16181d';

/* масти в квадрате 100x100 */
var SUIT_PATH=[
  /* пики */ 'M50 4C60 22 96 38 96 62C96 77 85 86 72 86C63 86 56 81 53 74C54 84 58 91 66 96H34C42 91 46 84 47 74C44 81 37 86 28 86C15 86 4 77 4 62C4 38 40 22 50 4Z',
  /* червы */ 'M50 92C24 70 4 54 4 32C4 16 16 5 30 5C39 5 46 10 50 18C54 10 61 5 70 5C84 5 96 16 96 32C96 54 76 70 50 92Z',
  /* бубны */ 'M50 3L90 50L50 97L10 50Z',
  /* трефы */ 'M50 6A20 20 0 0 1 68 36A20 20 0 1 1 58 72C59 82 62 90 68 96H32C38 90 41 82 42 72A20 20 0 1 1 32 36A20 20 0 0 1 50 6Z'
];

function defs(){
  if(document.getElementById('sol-defs'))return;
  var s='<svg id="sol-defs" width="0" height="0" style="position:absolute" aria-hidden="true"><defs>';
  SUIT_PATH.forEach(function(d,i){s+='<symbol id="su'+i+'" viewBox="0 0 100 100"><path d="'+d+'"/></symbol>';});
  /* корона для картинок: у короля выше и с крестом, у дамы ниже, у валета перо */
  s+='<symbol id="crK" viewBox="0 0 100 60"><path d="M8 56L4 18L28 36L50 6L72 36L96 18L92 56Z"/><rect x="46" y="0" width="8" height="14"/><rect x="42" y="4" width="16" height="5"/></symbol>';
  s+='<symbol id="crQ" viewBox="0 0 100 60"><path d="M10 56L6 26L30 40L50 18L70 40L94 26L90 56Z"/><circle cx="6" cy="22" r="6"/><circle cx="50" cy="13" r="7"/><circle cx="94" cy="22" r="6"/></symbol>';
  s+='<symbol id="crJ" viewBox="0 0 100 60"><path d="M20 56C20 30 40 10 70 4C60 20 58 34 62 56Z"/><path d="M70 4C80 14 86 30 84 56H66C64 36 66 20 70 4Z" opacity=".55"/></symbol>';
  s+='</defs></svg>';
  var d=document.createElement('div');d.innerHTML=s;
  document.body.insertBefore(d.firstChild,document.body.firstChild);
}

function use(s,x,y,w,flip,col){
  var tr=flip?' transform="rotate(180 '+(x+w/2)+' '+(y+w/2)+')"':'';
  return '<use href="#su'+s+'" xlink:href="#su'+s+'" x="'+x+'" y="'+y+'" width="'+w+'" height="'+w+'" fill="'+col+'"'+tr+'/>';
}

/* расстановка значков на числовых картах: [x, y, перевёрнут] в процентах поля 100x140 */
var PIPS={
  2:[[50,24,0],[50,116,1]],
  3:[[50,24,0],[50,70,0],[50,116,1]],
  4:[[30,24,0],[70,24,0],[30,116,1],[70,116,1]],
  5:[[30,24,0],[70,24,0],[50,70,0],[30,116,1],[70,116,1]],
  6:[[30,24,0],[70,24,0],[30,70,0],[70,70,0],[30,116,1],[70,116,1]],
  7:[[30,24,0],[70,24,0],[50,47,0],[30,70,0],[70,70,0],[30,116,1],[70,116,1]],
  8:[[30,24,0],[70,24,0],[50,47,0],[30,70,0],[70,70,0],[50,93,1],[30,116,1],[70,116,1]],
  9:[[30,24,0],[70,24,0],[30,54,0],[70,54,0],[50,70,0],[30,86,1],[70,86,1],[30,116,1],[70,116,1]],
  10:[[30,24,0],[70,24,0],[50,39,0],[30,54,0],[70,54,0],[30,86,1],[70,86,1],[50,101,1],[30,116,1],[70,116,1]]
};

function face(c){
  var col=(c.s===1||c.s===2)?RED:BLACK,rk=RANK[c.r],h='';
  h+='<svg class="cf" viewBox="0 0 100 140" preserveAspectRatio="none" xmlns="'+NS+'">';
  /* уголки: значение и масть, нижний перевёрнут */
  var fs=rk==='10'?21:24;
  h+='<g fill="'+col+'" font-family="Georgia,\'Times New Roman\',serif" font-weight="bold" text-anchor="middle">';
  h+='<text x="13" y="24" font-size="'+fs+'"'+(rk==='10'?' letter-spacing="-2"':'')+'>'+rk+'</text>';
  h+='<text x="13" y="24" font-size="'+fs+'" transform="rotate(180 50 70)"'+(rk==='10'?' letter-spacing="-2"':'')+'>'+rk+'</text>';
  h+='</g>';
  h+=use(c.s,5,28,16,false,col);
  h+=use(c.s,79,96,16,true,col);
  if(c.r===1){
    h+=use(c.s,26,46,48,false,col);                        // туз: одна большая масть
  }else if(c.r<=10){
    PIPS[c.r].forEach(function(p){h+=use(c.s,p[0]-11,p[1]-11,22,!!p[2],col);});
  }else{
    /* картинка: рамка, корона, буква, масть */
    var tint=col===RED?'#fbe3e2':'#e4e8f0';
    h+='<rect x="22" y="22" width="56" height="96" rx="5" fill="'+tint+'" stroke="'+col+'" stroke-width="2"/>';
    h+='<rect x="26" y="26" width="48" height="88" rx="3" fill="none" stroke="'+col+'" stroke-width=".8" opacity=".6"/>';
    var cr={11:'crJ',12:'crQ',13:'crK'}[c.r];
    h+='<use href="#'+cr+'" xlink:href="#'+cr+'" x="32" y="34" width="36" height="22" fill="#d4a017" stroke="'+col+'" stroke-width="2"/>';
    h+='<text x="50" y="92" font-size="36" font-family="Georgia,\'Times New Roman\',serif" font-weight="bold" text-anchor="middle" fill="'+col+'">'+rk+'</text>';
    h+=use(c.s,42,96,16,false,col);
  }
  h+='</svg>';
  return h;
}

function back(theme){return '<div class="cb cb-'+(theme||'aceon')+'"><span>A.C.EON</span></div>';}
function suit(s,cls){
  var col=(s===1||s===2)?RED:BLACK;
  return '<svg class="'+(cls||'su')+'" viewBox="0 0 100 100"><use href="#su'+s+'" xlink:href="#su'+s+'" fill="'+col+'"/></svg>';
}

window.Cards={defs:defs,face:face,back:back,suit:suit,RANK:RANK};
})();
