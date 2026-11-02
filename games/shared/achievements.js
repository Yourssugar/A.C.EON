/* A.C.EON ARCADE: достижения и карточки коллекции.

   Работает сам по себе (без store.js и i18n.js), поэтому его подключают и новые игры, и classic/.
   Условия читают сохранения игр из localStorage (aceon:<игра> и старые ключи aceon_hi_*),
   так что карточки выдаются и за то, что было сыграно до появления достижений.

   Achieve.check(game)   проверить условия игры и общие; новые карточки всплывают уведомлением
   Achieve.later(game)   то же, но не чаще раза в 0.6 с (вызывается из Store.save)
   Achieve.played(game)  отметить игру и день (вызывается из Arcade.trackPlay); game по умолчанию из адреса
   Achieve.album()       отметить, что альбом открыт (карточка meta_10)
   Achieve.list()        все достижения [{id,game,r}]; Achieve.got(id) время получения или 0
   Achieve.name(id) / Achieve.rarity(r) / Achieve.points() / Achieve.art(path)

   Хранится в localStorage 'aceon:achieve': {v, got:{id:время}, played:{игра:1}, days:{ГГГГММДД:1}, night, album}.
   Картинки карточек: games/art/cards/<id>.webp, рамки: art/frames/<редкость>.webp. */
(function(){
'use strict';

var BASE=new URL('.',document.currentScript.src);      // .../games/shared/
var ART=new URL('../art/',BASE).href;
var KEY='aceon:achieve';
var GAMES=['chess','solitaire','minesweeper','tetris','breakout','snake','2048','tictactoe','battleship',
  'pong','runner','stacker','bubbles','checkers','simon','wordle','flood','mastermind','puzzle15'];
var POINTS={common:10,rare:25,epic:50,legendary:100};

/* ── данные игр ── */
var cache={};
function D(ns){
  if(cache[ns])return cache[ns];
  var v=null;try{v=JSON.parse(localStorage.getItem('aceon:'+ns)||'null');}catch(e){}
  return (cache[ns]=v||{});
}
function H(k){try{return parseInt(localStorage.getItem(k),10)||0;}catch(e){return 0;}}
function sum(o){var n=0;for(var k in o||{})n+=+o[k]||0;return n;}
function sumk(o,f){var n=0;for(var k in o||{})if(o[k])n+=+o[k][f]||0;return n;}
function maxk(o,f){var n=0;for(var k in o||{})if(o[k])n=Math.max(n,+o[k][f]||0);return n;}
function maxv(o){var n=0;for(var k in o||{})n=Math.max(n,+o[k]||0);return n;}
function anyk(o,fn){for(var k in o||{})if(o[k]&&fn(o[k],k))return true;return false;}

/* ── состояние ── */
var S=null;
function load(){
  if(S)return S;
  try{S=JSON.parse(localStorage.getItem(KEY)||'null');}catch(e){S=null;}
  if(!S||typeof S!=='object')S={};
  S.v=1;S.got=S.got||{};S.played=S.played||{};S.days=S.days||{};S.night=S.night||0;S.album=S.album||0;
  return S;
}
function save(){try{localStorage.setItem(KEY,JSON.stringify(S));}catch(e){}}
function countGot(){var n=0;for(var k in S.got)n++;return n;}

/* ── список: id карточки = имя картинки; игра = часть до _ ── */
var LIST=[
  {id:"chess_1",r:"common",t:function(){return sum(D('chess').wins)>=1;}},
  {id:"chess_2",r:"rare",t:function(){return (D('chess').wins||{}).aceon_professional>=1;}},
  {id:"chess_3",r:"legendary",t:function(){return ((D('chess').wins||{}).aceon_expert||0)+((D('chess').wins||{}).aceon_grandmaster||0)>=1;}},
  {id:"solitaire_1",r:"common",t:function(){return sumk(D('solitaire').stats,'won')>=1;}},
  {id:"solitaire_2",r:"rare",t:function(){return sumk(D('solitaire').stats,'won')>=10;}},
  {id:"solitaire_3",r:"epic",t:function(){return ((D('solitaire').stats||{})['spider-4']||{}).won>=1;}},
  {id:"minesweeper_1",r:"common",t:function(){return sumk(D('minesweeper').stats,'won')>=1;}},
  {id:"minesweeper_2",r:"rare",t:function(){return anyk(D('minesweeper').stats,function(s,k){return /-exp$/.test(k)&&s.won>=1;});}},
  {id:"minesweeper_3",r:"epic",t:function(){return anyk(D('minesweeper').stats,function(s,k){return /-exp$/.test(k)&&s.best>0&&s.best<=180000;});}},
  {id:"2048_1",r:"common",t:function(){return maxk(D('2048').stats,'tile')>=512;}},
  {id:"2048_2",r:"rare",t:function(){return anyk(D('2048').stats,function(s,k){return /-4$/.test(k)&&s.tile>=2048;});}},
  {id:"2048_3",r:"legendary",t:function(){return maxk(D('2048').stats,'tile')>=4096;}},
  {id:"tetris_1",r:"common",t:function(){return sumk(D('tetris').stats,'lines')>=10;}},
  {id:"tetris_2",r:"rare",t:function(){return sumk(D('tetris').stats,'tetrises')>=10;}},
  {id:"tetris_3",r:"epic",t:function(){return (((D('tetris').stats||{})['duel-hard'])||{}).best>=1;}},
  {id:"breakout_1",r:"common",t:function(){return ((D('breakout').progress||{}).stars||[])[0]>=1;}},
  {id:"breakout_2",r:"rare",t:function(){return ((D('breakout').progress||{}).stars||[])[19]>=1;}},
  {id:"breakout_3",r:"epic",t:function(){return ((D('breakout').progress||{}).stars||[])[29]>=1;}},
  {id:"snake_1",r:"common",t:function(){return maxv(D('snake').best)>=10||!!(((D('snake').levels||{}).best||{})[1]!=null);}},
  {id:"snake_2",r:"rare",t:function(){return maxv(D('snake').best)>=40;}},
  {id:"snake_3",r:"epic",t:function(){return Object.keys(((D('snake').levels||{}).best)||{}).length>=10;}},
  {id:"tictactoe_1",r:"common",t:function(){return anyk(D('tictactoe').stats,function(s,k){return !/-duo$/.test(k)&&s.win>=1;});}},
  {id:"tictactoe_2",r:"rare",t:function(){return anyk(D('tictactoe').stats,function(s,k){return /-normal$/.test(k)&&s.best>=5;});}},
  {id:"tictactoe_3",r:"legendary",t:function(){return (((D('tictactoe').stats||{})['vanish-hard'])||{}).win>=1;}},
  {id:"battleship_1",r:"common",t:function(){return anyk(D('battleship').stats,function(s,k){return k!=='duel'&&s.won>=1;});}},
  {id:"battleship_2",r:"rare",t:function(){return anyk(D('battleship').stats,function(s,k){return /-hard-/.test(k)&&s.won>=1;});}},
  {id:"battleship_3",r:"epic",t:function(){return anyk(D('battleship').stats,function(s,k){return k!=='duel'&&s.won>=1&&s.bestAcc>=60;});}},
  {id:"pong_1",r:"common",t:function(){return !!S.played.pong||H('aceon_cl_play_pong')>=1;}},
  {id:"pong_2",r:"rare",t:function(){return anyk(D('pong').stats,function(s,k){return /^bot-/.test(k)&&s.won>=1;})||H('aceon_cl_pong')>=1;}},
  {id:"pong_3",r:"epic",t:function(){return anyk(D('pong').stats,function(s,k){return (k==='bot-hard'||k==='bot-master')&&s.won>=1;})||H('aceon_cl_pong_hard')>=1;}},
  {id:"runner_1",r:"common",t:function(){return (D('runner').stats||{}).best>=200||Object.keys((D('runner').adv||{}).best||{}).length>=1||H('aceon_hi_pf')>=50;}},
  {id:"runner_2",r:"rare",t:function(){return (D('runner').stats||{}).best>=1000||H('aceon_hi_pf')>=300;}},
  {id:"runner_3",r:"epic",t:function(){return Object.keys((D('runner').adv||{}).best||{}).length>=15||(D('runner').stats||{}).best>=3000||H('aceon_hi_pf')>=1000;}},
  {id:"stacker_1",r:"common",t:function(){return H('aceon_hi_ts')>=5;}},
  {id:"stacker_2",r:"rare",t:function(){return H('aceon_hi_ts')>=15;}},
  {id:"stacker_3",r:"epic",t:function(){return H('aceon_hi_ts')>=30;}},
  {id:"bubbles_1",r:"common",t:function(){return (D('bubbles').stats||{}).best>=1000||Object.keys((D('bubbles').lv||{}).best||{}).length>=1;}},
  {id:"bubbles_2",r:"rare",t:function(){return (D('bubbles').stats||{}).best>=5000||Object.keys((D('bubbles').lv||{}).best||{}).length>=10;}},
  {id:"bubbles_3",r:"epic",t:function(){return (D('bubbles').stats||{}).best>=15000||Object.keys((D('bubbles').lv||{}).best||{}).length>=30;}},
  {id:"checkers_1",r:"common",t:function(){return H('aceon_cl_play_checkers')>=1;}},
  {id:"checkers_2",r:"rare",t:function(){return H('aceon_cl_checkers')>=1;}},
  {id:"checkers_3",r:"epic",t:function(){return H('aceon_cl_checkers')>=5;}},
  {id:"simon_1",r:"common",t:function(){return H('aceon_hi_simon')>=5||Math.max(((D('simon').stats||{}).easy||{}).best||0,((D('simon').stats||{}).normal||{}).best||0,((D('simon').stats||{}).hard||{}).best||0)>=5;}},
  {id:"simon_2",r:"rare",t:function(){return H('aceon_hi_simon')>=10||Math.max(((D('simon').stats||{}).easy||{}).best||0,((D('simon').stats||{}).normal||{}).best||0,((D('simon').stats||{}).hard||{}).best||0)>=10;}},
  {id:"simon_3",r:"epic",t:function(){return H('aceon_hi_simon')>=20||Math.max(((D('simon').stats||{}).easy||{}).best||0,((D('simon').stats||{}).normal||{}).best||0,((D('simon').stats||{}).hard||{}).best||0)>=20;}},
  {id:"wordle_1",r:"common",t:function(){return H('aceon_wl_wins')>=1;}},
  {id:"wordle_2",r:"rare",t:function(){return H('aceon_wl_wins')>=10;}},
  {id:"wordle_3",r:"epic",t:function(){return H('aceon_wl_wins')>=30;}},
  {id:"flood_1",r:"common",t:function(){return H('aceon_hi_flood')>=1;}},
  {id:"flood_2",r:"rare",t:function(){return H('aceon_cl_flood_med')>=1;}},
  {id:"flood_3",r:"epic",t:function(){return H('aceon_cl_flood_hard')>=1;}},
  {id:"mastermind_1",r:"common",t:function(){return H('aceon_mm_wins')>=1;}},
  {id:"mastermind_2",r:"rare",t:function(){return H('aceon_mm_wins')>=5;}},
  {id:"mastermind_3",r:"epic",t:function(){return H('aceon_mm_wins')>=20;}},
  {id:"puzzle15_1",r:"common",t:function(){return H('aceon_hi_pz3')>=1||H('aceon_hi_pz4')>=1;}},
  {id:"puzzle15_2",r:"rare",t:function(){return H('aceon_hi_pz4')>=1;}},
  {id:"puzzle15_3",r:"epic",t:function(){return H('aceon_hi_pz4')>=1&&H('aceon_hi_pz4')<=150;}},
  {id:"meta_1",r:"common",t:function(){return Object.keys(S.played).length>=1;}},
  {id:"meta_2",r:"rare",t:function(){return Object.keys(S.played).length>=5;}},
  {id:"meta_3",r:"epic",t:function(){return Object.keys(S.played).length>=GAMES.length;}},
  {id:"meta_4",r:"rare",t:function(){return Object.keys(S.days).length>=7;}},
  {id:"meta_5",r:"epic",t:function(){return Object.keys(S.days).length>=30;}},
  {id:"meta_6",r:"epic",t:function(){return countGot()>=20;}},
  {id:"meta_7",r:"rare",t:function(){return countGot()>=Math.ceil((LIST.length-1)/2);}},
  {id:"meta_8",r:"legendary",t:function(){return countGot()>=LIST.length-1;}},
  {id:"meta_9",r:"rare",t:function(){return S.night>=1;}},
  {id:"meta_10",r:"common",t:function(){return S.album>=1;}}
];
LIST.forEach(function(a){a.game=a.id.slice(0,a.id.lastIndexOf('_'));});

/* ── тексты ── */
var NAMES={"en": {"chess_1": "First Checkmate", "chess_2": "Knight's Leap", "chess_3": "Queen of the Board", "solitaire_1": "First Ace", "solitaire_2": "Full House", "solitaire_3": "Card Waterfall", "minesweeper_1": "Flag Planted", "minesweeper_2": "Clean Field", "minesweeper_3": "Sapper Bot", "2048_1": "First Merge", "2048_2": "Tile Tower", "2048_3": "Golden Tile", "tetris_1": "Line Burner", "tetris_2": "Four at Once", "tetris_3": "Endless Well", "breakout_1": "First Brick", "breakout_2": "Ricochet", "breakout_3": "Boss Breaker", "snake_1": "First Apple", "snake_2": "Long Tail", "snake_3": "Dragon Snake", "tictactoe_1": "First Cross", "tictactoe_2": "Three in a Row", "tictactoe_3": "Handshake", "battleship_1": "First Hit", "battleship_2": "Fleet on Radar", "battleship_3": "Flagship", "pong_1": "First Serve", "pong_2": "Speed Ball", "pong_3": "Paddle Knights", "runner_1": "First Jump", "runner_2": "City Run", "runner_3": "Over the Roofs", "stacker_1": "First Slab", "stacker_2": "To the Clouds", "stacker_3": "Moon Tower", "bubbles_1": "First Pop", "bubbles_2": "Chain Reaction", "bubbles_3": "Bubble Fireworks", "checkers_1": "On the Edge", "checkers_2": "Triple Jump", "checkers_3": "Crown of Kings", "simon_1": "First Light", "simon_2": "Long Melody", "simon_3": "Choir of Lights", "wordle_1": "Green Tile", "wordle_2": "Green Row", "wordle_3": "Book of Words", "flood_1": "First Drop", "flood_2": "Half the World", "flood_3": "Rainbow World", "mastermind_1": "First Colour", "mastermind_2": "Combination Lock", "mastermind_3": "Open Vault", "puzzle15_1": "First Slide", "puzzle15_2": "Assembled Frame", "puzzle15_3": "Constellation", "meta_1": "Insert Coin", "meta_2": "Cartridge Stack", "meta_3": "Full Shelf", "meta_4": "Alarm Clock", "meta_5": "Burning Calendar", "meta_6": "Trophy", "meta_7": "Half an Album", "meta_8": "Complete Album", "meta_9": "Night Owl", "meta_10": "Hello from A.C.EON"}, "ru": {"chess_1": "Первый мат", "chess_2": "Прыжок коня", "chess_3": "Королева доски", "solitaire_1": "Первый туз", "solitaire_2": "Полный дом", "solitaire_3": "Карточный водопад", "minesweeper_1": "Флаг поставлен", "minesweeper_2": "Чистое поле", "minesweeper_3": "Робот-сапёр", "2048_1": "Первое слияние", "2048_2": "Башня плиток", "2048_3": "Золотая плитка", "tetris_1": "Сжигатель линий", "tetris_2": "Четыре сразу", "tetris_3": "Бесконечный стакан", "breakout_1": "Первый кирпич", "breakout_2": "Рикошет", "breakout_3": "Гроза боссов", "snake_1": "Первое яблоко", "snake_2": "Длинный хвост", "snake_3": "Змей-дракон", "tictactoe_1": "Первый крестик", "tictactoe_2": "Три в ряд", "tictactoe_3": "Рукопожатие", "battleship_1": "Первое попадание", "battleship_2": "Флот на радаре", "battleship_3": "Флагман", "pong_1": "Первая подача", "pong_2": "Скоростной мяч", "pong_3": "Рыцари ракеток", "runner_1": "Первый прыжок", "runner_2": "Забег по городу", "runner_3": "Над крышами", "stacker_1": "Первая плита", "stacker_2": "До облаков", "stacker_3": "Башня до луны", "bubbles_1": "Первый хлопок", "bubbles_2": "Цепная реакция", "bubbles_3": "Салют из пузырей", "checkers_1": "На краю доски", "checkers_2": "Тройной прыжок", "checkers_3": "Корона из дамок", "simon_1": "Первый огонь", "simon_2": "Длинная мелодия", "simon_3": "Хор огней", "wordle_1": "Зелёная плитка", "wordle_2": "Зелёный ряд", "wordle_3": "Книга слов", "flood_1": "Первая капля", "flood_2": "Полмира", "flood_3": "Радужный мир", "mastermind_1": "Первый цвет", "mastermind_2": "Кодовый замок", "mastermind_3": "Открытый сейф", "puzzle15_1": "Первый сдвиг", "puzzle15_2": "Собранная рамка", "puzzle15_3": "Созвездие", "meta_1": "Монета в автомат", "meta_2": "Стопка картриджей", "meta_3": "Полная полка", "meta_4": "Будильник", "meta_5": "Горящий календарь", "meta_6": "Кубок", "meta_7": "Полальбома", "meta_8": "Полный альбом", "meta_9": "Ночная сова", "meta_10": "Привет от A.C.EON"}, "de": {"chess_1": "Erstes Matt", "chess_2": "Rösselsprung", "chess_3": "Königin des Bretts", "solitaire_1": "Erstes Ass", "solitaire_2": "Volles Haus", "solitaire_3": "Kartenwasserfall", "minesweeper_1": "Fahne gehisst", "minesweeper_2": "Sauberes Feld", "minesweeper_3": "Räumroboter", "2048_1": "Erste Fusion", "2048_2": "Plättchenturm", "2048_3": "Goldenes Plättchen", "tetris_1": "Linienbrenner", "tetris_2": "Vier auf einmal", "tetris_3": "Endloser Schacht", "breakout_1": "Erster Stein", "breakout_2": "Querschläger", "breakout_3": "Bossbrecher", "snake_1": "Erster Apfel", "snake_2": "Langer Schwanz", "snake_3": "Drachenschlange", "tictactoe_1": "Erstes Kreuz", "tictactoe_2": "Drei in einer Reihe", "tictactoe_3": "Handschlag", "battleship_1": "Erster Treffer", "battleship_2": "Flotte im Radar", "battleship_3": "Flaggschiff", "pong_1": "Erster Aufschlag", "pong_2": "Turboball", "pong_3": "Schlägerritter", "runner_1": "Erster Sprung", "runner_2": "Stadtlauf", "runner_3": "Über den Dächern", "stacker_1": "Erste Platte", "stacker_2": "Bis zu den Wolken", "stacker_3": "Mondturm", "bubbles_1": "Erster Plopp", "bubbles_2": "Kettenreaktion", "bubbles_3": "Blasenfeuerwerk", "checkers_1": "Am Rand", "checkers_2": "Dreifachsprung", "checkers_3": "Krone der Damen", "simon_1": "Erstes Licht", "simon_2": "Lange Melodie", "simon_3": "Lichterchor", "wordle_1": "Grünes Feld", "wordle_2": "Grüne Reihe", "wordle_3": "Buch der Wörter", "flood_1": "Erster Tropfen", "flood_2": "Halbe Welt", "flood_3": "Regenbogenwelt", "mastermind_1": "Erste Farbe", "mastermind_2": "Zahlenschloss", "mastermind_3": "Offener Tresor", "puzzle15_1": "Erster Schub", "puzzle15_2": "Volle Rahmen", "puzzle15_3": "Sternbild", "meta_1": "Münze einwerfen", "meta_2": "Modulstapel", "meta_3": "Volles Regal", "meta_4": "Wecker", "meta_5": "Brennender Kalender", "meta_6": "Pokal", "meta_7": "Halbes Album", "meta_8": "Volles Album", "meta_9": "Nachteule", "meta_10": "Hallo von A.C.EON"}, "fr": {"chess_1": "Premier mat", "chess_2": "Saut du cavalier", "chess_3": "Reine de l'échiquier", "solitaire_1": "Premier as", "solitaire_2": "Main pleine", "solitaire_3": "Cascade de cartes", "minesweeper_1": "Drapeau planté", "minesweeper_2": "Champ dégagé", "minesweeper_3": "Robot démineur", "2048_1": "Première fusion", "2048_2": "Tour de tuiles", "2048_3": "Tuile d'or", "tetris_1": "Brûleur de lignes", "tetris_2": "Quatre d'un coup", "tetris_3": "Puits sans fond", "breakout_1": "Première brique", "breakout_2": "Ricochet", "breakout_3": "Briseur de boss", "snake_1": "Première pomme", "snake_2": "Longue queue", "snake_3": "Serpent dragon", "tictactoe_1": "Première croix", "tictactoe_2": "Trois alignés", "tictactoe_3": "Poignée de main", "battleship_1": "Premier tir au but", "battleship_2": "Flotte au radar", "battleship_3": "Vaisseau amiral", "pong_1": "Premier service", "pong_2": "Balle rapide", "pong_3": "Chevaliers raquettes", "runner_1": "Premier saut", "runner_2": "Course en ville", "runner_3": "Sur les toits", "stacker_1": "Première dalle", "stacker_2": "Jusqu'aux nuages", "stacker_3": "Tour lunaire", "bubbles_1": "Premier pop", "bubbles_2": "Réaction en chaîne", "bubbles_3": "Feu d'artifice de bulles", "checkers_1": "Au bord", "checkers_2": "Triple saut", "checkers_3": "Couronne des dames", "simon_1": "Première lumière", "simon_2": "Longue mélodie", "simon_3": "Chœur de lumières", "wordle_1": "Case verte", "wordle_2": "Ligne verte", "wordle_3": "Livre des mots", "flood_1": "Première goutte", "flood_2": "La moitié du monde", "flood_3": "Monde arc-en-ciel", "mastermind_1": "Première couleur", "mastermind_2": "Cadenas à code", "mastermind_3": "Coffre ouvert", "puzzle15_1": "Premier glissement", "puzzle15_2": "Cadre complet", "puzzle15_3": "Constellation", "meta_1": "Insérer une pièce", "meta_2": "Pile de cartouches", "meta_3": "Étagère pleine", "meta_4": "Réveil", "meta_5": "Calendrier en feu", "meta_6": "Trophée", "meta_7": "Demi-album", "meta_8": "Album complet", "meta_9": "Oiseau de nuit", "meta_10": "Bonjour d'A.C.EON"}, "es": {"chess_1": "Primer jaque mate", "chess_2": "Salto del caballo", "chess_3": "Reina del tablero", "solitaire_1": "Primer as", "solitaire_2": "Casa llena", "solitaire_3": "Cascada de cartas", "minesweeper_1": "Bandera puesta", "minesweeper_2": "Campo limpio", "minesweeper_3": "Robot artificiero", "2048_1": "Primera fusión", "2048_2": "Torre de fichas", "2048_3": "Ficha dorada", "tetris_1": "Quemador de líneas", "tetris_2": "Cuatro a la vez", "tetris_3": "Pozo sin fondo", "breakout_1": "Primer ladrillo", "breakout_2": "Rebote", "breakout_3": "Rompejefes", "snake_1": "Primera manzana", "snake_2": "Cola larga", "snake_3": "Serpiente dragón", "tictactoe_1": "Primera cruz", "tictactoe_2": "Tres en línea", "tictactoe_3": "Apretón de manos", "battleship_1": "Primer impacto", "battleship_2": "Flota en el radar", "battleship_3": "Buque insignia", "pong_1": "Primer saque", "pong_2": "Pelota veloz", "pong_3": "Caballeros de la pala", "runner_1": "Primer salto", "runner_2": "Carrera urbana", "runner_3": "Sobre los tejados", "stacker_1": "Primera losa", "stacker_2": "Hasta las nubes", "stacker_3": "Torre lunar", "bubbles_1": "Primer estallido", "bubbles_2": "Reacción en cadena", "bubbles_3": "Fuegos de burbujas", "checkers_1": "Al borde", "checkers_2": "Triple salto", "checkers_3": "Corona de damas", "simon_1": "Primera luz", "simon_2": "Melodía larga", "simon_3": "Coro de luces", "wordle_1": "Casilla verde", "wordle_2": "Fila verde", "wordle_3": "Libro de palabras", "flood_1": "Primera gota", "flood_2": "Medio mundo", "flood_3": "Mundo arcoíris", "mastermind_1": "Primer color", "mastermind_2": "Candado de combinación", "mastermind_3": "Caja fuerte abierta", "puzzle15_1": "Primer deslizamiento", "puzzle15_2": "Marco completo", "puzzle15_3": "Constelación", "meta_1": "Inserta moneda", "meta_2": "Pila de cartuchos", "meta_3": "Estantería llena", "meta_4": "Despertador", "meta_5": "Calendario ardiente", "meta_6": "Trofeo", "meta_7": "Medio álbum", "meta_8": "Álbum completo", "meta_9": "Ave nocturna", "meta_10": "Hola desde A.C.EON"}, "it": {"chess_1": "Primo scacco matto", "chess_2": "Salto del cavallo", "chess_3": "Regina della scacchiera", "solitaire_1": "Primo asso", "solitaire_2": "Mano piena", "solitaire_3": "Cascata di carte", "minesweeper_1": "Bandiera piantata", "minesweeper_2": "Campo pulito", "minesweeper_3": "Robot artificiere", "2048_1": "Prima fusione", "2048_2": "Torre di tessere", "2048_3": "Tessera d'oro", "tetris_1": "Brucia-linee", "tetris_2": "Quattro in un colpo", "tetris_3": "Pozzo infinito", "breakout_1": "Primo mattone", "breakout_2": "Rimbalzo", "breakout_3": "Spaccaboss", "snake_1": "Prima mela", "snake_2": "Coda lunga", "snake_3": "Serpente drago", "tictactoe_1": "Prima croce", "tictactoe_2": "Tre in fila", "tictactoe_3": "Stretta di mano", "battleship_1": "Primo colpo", "battleship_2": "Flotta sul radar", "battleship_3": "Nave ammiraglia", "pong_1": "Prima battuta", "pong_2": "Palla veloce", "pong_3": "Cavalieri della racchetta", "runner_1": "Primo salto", "runner_2": "Corsa in città", "runner_3": "Sopra i tetti", "stacker_1": "Prima lastra", "stacker_2": "Fino alle nuvole", "stacker_3": "Torre lunare", "bubbles_1": "Primo scoppio", "bubbles_2": "Reazione a catena", "bubbles_3": "Fuochi di bolle", "checkers_1": "Sul bordo", "checkers_2": "Triplo salto", "checkers_3": "Corona di dame", "simon_1": "Prima luce", "simon_2": "Melodia lunga", "simon_3": "Coro di luci", "wordle_1": "Casella verde", "wordle_2": "Fila verde", "wordle_3": "Libro delle parole", "flood_1": "Prima goccia", "flood_2": "Mezzo mondo", "flood_3": "Mondo arcobaleno", "mastermind_1": "Primo colore", "mastermind_2": "Lucchetto a combinazione", "mastermind_3": "Cassaforte aperta", "puzzle15_1": "Primo scorrimento", "puzzle15_2": "Cornice completa", "puzzle15_3": "Costellazione", "meta_1": "Inserisci gettone", "meta_2": "Pila di cartucce", "meta_3": "Scaffale pieno", "meta_4": "Sveglia", "meta_5": "Calendario in fiamme", "meta_6": "Trofeo", "meta_7": "Mezzo album", "meta_8": "Album completo", "meta_9": "Gufo notturno", "meta_10": "Ciao da A.C.EON"}, "pl": {"chess_1": "Pierwszy mat", "chess_2": "Skok skoczka", "chess_3": "Królowa szachownicy", "solitaire_1": "Pierwszy as", "solitaire_2": "Pełny dom", "solitaire_3": "Wodospad kart", "minesweeper_1": "Flaga wbita", "minesweeper_2": "Czyste pole", "minesweeper_3": "Robot saper", "2048_1": "Pierwsze połączenie", "2048_2": "Wieża kafelków", "2048_3": "Złoty kafelek", "tetris_1": "Palacz linii", "tetris_2": "Cztery naraz", "tetris_3": "Studnia bez dna", "breakout_1": "Pierwsza cegła", "breakout_2": "Rykoszet", "breakout_3": "Pogromca bossów", "snake_1": "Pierwsze jabłko", "snake_2": "Długi ogon", "snake_3": "Wąż smok", "tictactoe_1": "Pierwszy krzyżyk", "tictactoe_2": "Trzy w rzędzie", "tictactoe_3": "Uścisk dłoni", "battleship_1": "Pierwsze trafienie", "battleship_2": "Flota na radarze", "battleship_3": "Okręt flagowy", "pong_1": "Pierwszy serw", "pong_2": "Szybka piłka", "pong_3": "Rycerze paletek", "runner_1": "Pierwszy skok", "runner_2": "Bieg przez miasto", "runner_3": "Nad dachami", "stacker_1": "Pierwsza płyta", "stacker_2": "Do chmur", "stacker_3": "Wieża do księżyca", "bubbles_1": "Pierwsze pyknięcie", "bubbles_2": "Reakcja łańcuchowa", "bubbles_3": "Fajerwerki z bąbelków", "checkers_1": "Na krawędzi", "checkers_2": "Potrójny skok", "checkers_3": "Korona damek", "simon_1": "Pierwsze światło", "simon_2": "Długa melodia", "simon_3": "Chór świateł", "wordle_1": "Zielony kafelek", "wordle_2": "Zielony rząd", "wordle_3": "Księga słów", "flood_1": "Pierwsza kropla", "flood_2": "Pół świata", "flood_3": "Tęczowy świat", "mastermind_1": "Pierwszy kolor", "mastermind_2": "Zamek szyfrowy", "mastermind_3": "Otwarty sejf", "puzzle15_1": "Pierwsze przesunięcie", "puzzle15_2": "Złożona ramka", "puzzle15_3": "Gwiazdozbiór", "meta_1": "Wrzuć monetę", "meta_2": "Stos kartridży", "meta_3": "Pełna półka", "meta_4": "Budzik", "meta_5": "Płonący kalendarz", "meta_6": "Puchar", "meta_7": "Pół albumu", "meta_8": "Pełny album", "meta_9": "Nocna sowa", "meta_10": "Cześć od A.C.EON"}};
var UI={"en": {"new": "NEW CARD", "common": "COMMON", "rare": "RARE", "epic": "EPIC", "legendary": "LEGENDARY", "more": "+{n} more"}, "ru": {"new": "НОВАЯ КАРТОЧКА", "common": "ОБЫЧНАЯ", "rare": "РЕДКАЯ", "epic": "ЭПИЧЕСКАЯ", "legendary": "ЛЕГЕНДАРНАЯ", "more": "и ещё {n}"}, "de": {"new": "NEUE KARTE", "common": "GEWÖHNLICH", "rare": "SELTEN", "epic": "EPISCH", "legendary": "LEGENDÄR", "more": "+{n} weitere"}, "fr": {"new": "NOUVELLE CARTE", "common": "COMMUNE", "rare": "RARE", "epic": "ÉPIQUE", "legendary": "LÉGENDAIRE", "more": "+{n} autres"}, "es": {"new": "CARTA NUEVA", "common": "COMÚN", "rare": "RARA", "epic": "ÉPICA", "legendary": "LEGENDARIA", "more": "+{n} más"}, "it": {"new": "NUOVA CARTA", "common": "COMUNE", "rare": "RARA", "epic": "EPICA", "legendary": "LEGGENDARIA", "more": "+{n} altre"}, "pl": {"new": "NOWA KARTA", "common": "ZWYKŁA", "rare": "RZADKA", "epic": "EPICKA", "legendary": "LEGENDARNA", "more": "+{n} więcej"}};
function lang(){
  var l=null;
  try{var s=JSON.parse(localStorage.getItem('aceon:site')||'null');if(s&&s.lang)l=s.lang;}catch(e){}
  if(!l){var n=(navigator.language||'en').slice(0,2).toLowerCase();l=n;}
  return NAMES[l]?l:'en';
}
function name(id){var l=lang();return (NAMES[l]&&NAMES[l][id])||NAMES.en[id]||id;}
function ui(k,v){var l=lang(),s=(UI[l]&&UI[l][k])||UI.en[k];if(v)s=s.replace(/\{(\w+)\}/g,function(m,n){return v[n]!=null?v[n]:m;});return s;}

/* ── проверка ── */
function check(game,quiet){
  load();cache={};
  var fresh=[];
  /* общие условия зависят от числа карточек, поэтому проходим, пока что-то добавляется */
  for(var pass=0;pass<3;pass++){
    var added=false;
    LIST.forEach(function(a){
      if(S.got[a.id])return;
      if(game&&a.game!==game&&a.game!=='meta')return;
      var ok=false;try{ok=!!a.t();}catch(e){ok=false;}
      if(ok){S.got[a.id]=Date.now();fresh.push(a);added=true;}
    });
    if(!added)break;
  }
  if(fresh.length){save();if(!quiet)toast(fresh);}
  return fresh;
}
var laterT={};
function later(game){clearTimeout(laterT[game]);laterT[game]=setTimeout(function(){check(game);},600);}
function gameFromPath(){
  var p=location.pathname.split('/').filter(Boolean),i=p.lastIndexOf('games');
  var g=i>=0?p[i+1]:p[p.length-1];
  return GAMES.indexOf(g)>=0?g:null;
}
function today(){var d=new Date();return d.getFullYear()*10000+(d.getMonth()+1)*100+d.getDate();}
function played(game){
  load();
  game=game||gameFromPath();
  if(game)S.played[game]=1;
  S.days[today()]=1;
  if(new Date().getHours()<5)S.night=1;
  save();
  check(game);
}

/* ── уведомление: карточка выезжает сверху ── */
var CSS='.ach-box{position:fixed;left:50%;top:12px;z-index:100000;display:flex;flex-direction:column;gap:8px;transform:translateX(-50%);pointer-events:none;width:min(360px,calc(100% - 20px));}'+
'.ach-t{display:flex;align-items:center;gap:12px;padding:10px 14px 10px 10px;background:rgba(4,4,18,.94);border:1px solid #003355;border-left:4px solid var(--rc);'+
'box-shadow:0 8px 30px rgba(0,0,0,.6),0 0 22px var(--rg);font-family:"Press Start 2P",monospace;pointer-events:auto;cursor:pointer;animation:achIn .5s cubic-bezier(.2,1.4,.4,1) both;}'+
'.ach-t.out{animation:achOut .4s ease-in forwards;}'+
'.ach-c{position:relative;flex-shrink:0;width:52px;height:73px;}'+
'.ach-c img{position:absolute;left:0;top:0;width:100%;height:100%;}'+
'.ach-c img.a{left:8.3%;top:8.4%;width:83.4%;height:59.6%;object-fit:cover;}'+
'.ach-x{display:flex;flex-direction:column;gap:7px;min-width:0;}'+
'.ach-k{font-size:7px;letter-spacing:1px;color:var(--rc);}'+
'.ach-n{font-size:10px;line-height:1.5;color:#fff;}'+
'.ach-r{font-size:6px;letter-spacing:1px;color:#8fb6c9;}'+
'@keyframes achIn{from{opacity:0;transform:translateY(-30px) scale(.9);}to{opacity:1;transform:none;}}'+
'@keyframes achOut{to{opacity:0;transform:translateY(-20px);}}';
var RC={common:['#8fdcff','rgba(0,229,255,.25)'],rare:['#4aa8ff','rgba(74,168,255,.35)'],epic:['#ff5ad8','rgba(255,90,216,.4)'],legendary:['#ffd23a','rgba(255,210,58,.5)']};
var box=null;
function toast(list){
  if(!document.body)return;
  if(!box){
    var st=document.createElement('style');st.textContent=CSS;document.head.appendChild(st);
    box=document.createElement('div');box.className='ach-box';document.body.appendChild(box);
  }
  /* сначала самые редкие */
  var W={legendary:4,epic:3,rare:2,common:1};
  list=list.slice().sort(function(x,y){return W[y.r]-W[x.r];});
  var show=list.slice(0,3);
  show.forEach(function(a,i){
    setTimeout(function(){
      var el=document.createElement('div'),c=RC[a.r]||RC.common;
      el.className='ach-t';el.style.setProperty('--rc',c[0]);el.style.setProperty('--rg',c[1]);
      el.innerHTML='<div class="ach-c"><img class="a" alt="" src="'+ART+'cards/'+a.id+'.webp"><img alt="" src="'+ART+'frames/'+a.r+'.webp"></div>'+
        '<div class="ach-x"><span class="ach-k">'+ui('new')+'</span><span class="ach-n"></span><span class="ach-r">'+ui(a.r)+' +'+POINTS[a.r]+
        (i===show.length-1&&list.length>3?' / '+ui('more',{n:list.length-3}):'')+'</span></div>';
      el.querySelector('.ach-n').textContent=name(a.id);
      el.addEventListener('click',function(){location.href=new URL('../#album',BASE).href;});
      box.appendChild(el);
      try{if(window.Sound&&Sound.sfx)Sound.sfx('win');}catch(e){}
      setTimeout(function(){el.classList.add('out');setTimeout(function(){if(el.parentNode)el.parentNode.removeChild(el);},420);},4200);
    },i*700);
  });
}

window.Achieve={
  check:check,later:later,played:played,
  album:function(){load();if(!S.album){S.album=1;save();}return check(null);},
  list:function(){return LIST;},
  got:function(id){load();return S.got[id]||0;},
  state:function(){return load();},
  name:name,ui:ui,lang:lang,
  rarity:function(r){return ui(r);},
  points:function(){load();var n=0;LIST.forEach(function(a){if(S.got[a.id])n+=POINTS[a.r];});return n;},
  maxPoints:function(){var n=0;LIST.forEach(function(a){n+=POINTS[a.r];});return n;},
  POINTS:POINTS,GAMES:GAMES,
  art:function(p){return ART+p;}
};
})();
