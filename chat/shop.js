/* A.C.EON · ОФИС ИИ: магазин «Снабжение», декор в офисе и альбом карточек.
   Очки офиса копятся за ЧП (events.js). На них покупается декор: картинки Codex лежат в img/office/decor/
   (родной размер, без увеличения), предмет без картинки в магазине не продаётся.
   У части предметов есть эффект: новые занятия роботов, ЧП становятся легче.
   Всё хранится у посетителя в localStorage вместе с очками (ключ aceon:office). */
(function(){
'use strict';
const E=window.OfficeEvents, K=E&&E.kit; if(!K)return;
const O=K.O, DB=K.DB, tx=K.tx;
DB.shop=DB.shop||{owned:{},vars:{},hidden:{}};
DB.cards=DB.cards||{};
const S=DB.shop;

/* x, y, w, h: место на карте в родных пикселях (как в задании Codex), картинка встаёт по центру низа */
const ITEMS=[
 {id:'aquarium',price:300,files:['aquarium_1','aquarium_2'],x:300,y:92,w:52,h:48,frame:700,glow:.5},
 {id:'coffee_turbo',price:250,files:['coffee_turbo'],x:382,y:156,w:40,h:38},
 {id:'vacuum',price:220,files:['vacuum_dock','vacuum_1','vacuum_2'],x:348,y:300,w:18,h:14},
 {id:'neon',price:150,vars:[['neon_pink'],['neon_cyan']],x:396,y:10,w:104,h:32,glow:.9},
 {id:'poster',price:60,vars:[['poster_1'],['poster_2'],['poster_3'],['poster_4']],x:198,y:10,w:36,h:32},
 {id:'plant',price:80,vars:[['plant_monstera'],['plant_cactus'],['plant_bonsai']],x:2,y:172,w:22,h:52},
 {id:'treadmill',price:200,files:['treadmill_1','treadmill_2'],x:168,y:290,w:44,h:26},
 {id:'cathouse',price:120,files:['cathouse'],x:40,y:288,w:30,h:28},
 {id:'parrot',price:350,files:['parrot_1','parrot_2'],x:615,y:104,w:24,h:34},
 {id:'easel',price:150,files:['easel'],x:340,y:184,w:24,h:36},
 {id:'duck_desk',price:40,files:['duck_desk'],x:70,y:98,w:10,h:10},
 {id:'ac_arctic',price:220,files:['ac_arctic'],x:596,y:296,w:36,h:22},
 {id:'garland',price:100,files:['garland_1','garland_2'],tile:true,y:0,h:8,frame:600,glow:.9},
 {id:'lava',price:70,files:['lava_1','lava_2'],x:420,y:114,w:8,h:16,frame:900,glow:.8}
];
/* картинки Codex ещё не пришли: пока false, декор не грузится и магазин пишет, что ждёт товар */
const DECOR_READY=false, CARDS_READY=false;
const CARDS=['coffee','bug','cat','cap','server','meeting','fw','friday','wifi','printer','light','ducks','anton','kai','node','first','night','shopper','cozy','veteran'];
const RARE={night:1,cozy:1,veteran:1,anton:1,kai:1,node:1};

Object.assign(K.TX,{
 shop_btn:{ru:'СНАБЖЕНИЕ',en:'SUPPLIES',de:'AUSSTATTUNG',fr:'FOURNITURES',es:'SUMINISTROS',it:'FORNITURE',pl:'ZAOPATRZENIE'},
 album_btn:{ru:'АЛЬБОМ',en:'ALBUM',de:'ALBUM',fr:'ALBUM',es:'ÁLBUM',it:'ALBUM',pl:'ALBUM'},
 shop_title:{ru:'СНАБЖЕНИЕ ОФИСА',en:'OFFICE SUPPLIES',de:'BÜROAUSSTATTUNG',fr:'FOURNITURES DU BUREAU',es:'SUMINISTROS DE OFICINA',it:'FORNITURE D\'UFFICIO',pl:'ZAOPATRZENIE BIURA'},
 shop_buy:{ru:'КУПИТЬ',en:'BUY',de:'KAUFEN',fr:'ACHETER',es:'COMPRAR',it:'COMPRA',pl:'KUP'},
 shop_hide:{ru:'УБРАТЬ',en:'REMOVE',de:'WEGRÄUMEN',fr:'RANGER',es:'QUITAR',it:'TOGLI',pl:'SCHOWAJ'},
 shop_show:{ru:'ПОСТАВИТЬ',en:'PLACE',de:'AUFSTELLEN',fr:'INSTALLER',es:'PONER',it:'METTI',pl:'POSTAW'},
 shop_var:{ru:'ДРУГОЙ',en:'NEXT',de:'ANDERE',fr:'AUTRE',es:'OTRO',it:'ALTRO',pl:'INNY'},
 shop_soon:{ru:'скоро в продаже',en:'coming soon',de:'bald erhältlich',fr:'bientôt',es:'pronto',it:'presto',pl:'wkrótce'},
 shop_poor:{ru:'не хватает очков',en:'not enough points',de:'zu wenig Punkte',fr:'pas assez de points',es:'faltan puntos',it:'punti insufficienti',pl:'za mało punktów'},
 shop_none:{ru:'Магазин ждёт товар. Заглядывай позже.',en:'The shop is waiting for stock. Check back later.',de:'Der Laden wartet auf Ware. Schau später vorbei.',fr:'La boutique attend sa marchandise. Reviens plus tard.',es:'La tienda espera mercancía. Vuelve luego.',it:'Il negozio aspetta la merce. Torna più tardi.',pl:'Sklep czeka na towar. Zajrzyj później.'},
 close:{ru:'ЗАКРЫТЬ',en:'CLOSE',de:'SCHLIESSEN',fr:'FERMER',es:'CERRAR',it:'CHIUDI',pl:'ZAMKNIJ'},
 album_title:{ru:'АЛЬБОМ КАРТОЧЕК',en:'CARD ALBUM',de:'KARTENALBUM',fr:'ALBUM DE CARTES',es:'ÁLBUM DE CARTAS',it:'ALBUM DELLE CARTE',pl:'ALBUM KART'},
 album_count:{ru:'Собрано {n} из {m}',en:'Collected {n} of {m}',de:'Gesammelt {n} von {m}',fr:'{n} sur {m}',es:'{n} de {m}',it:'{n} su {m}',pl:'Zebrane {n} z {m}'},
 card_how_ev:{ru:'Победить в ЧП',en:'Win this emergency',de:'Diesen Notfall gewinnen',fr:'Gagner cette urgence',es:'Gana esta emergencia',it:'Vinci questa emergenza',pl:'Wygraj tę awarię'},
 card_rare:{ru:'редкая',en:'rare',de:'selten',fr:'rare',es:'rara',it:'rara',pl:'rzadka'},
 toast_card:{ru:'Новая карточка: {x}',en:'New card: {x}',de:'Neue Karte: {x}',fr:'Nouvelle carte : {x}',es:'Carta nueva: {x}',it:'Nuova carta: {x}',pl:'Nowa karta: {x}'},
 toast_pay:{ru:'Зарплата офиса за день: +{n}',en:'Daily office pay: +{n}',de:'Tageslohn des Büros: +{n}',fr:'Paie du jour : +{n}',es:'Paga diaria de la oficina: +{n}',it:'Paga giornaliera: +{n}',pl:'Dniówka biura: +{n}'},
 toast_buy:{ru:'Куплено: {x}',en:'Bought: {x}',de:'Gekauft: {x}',fr:'Acheté : {x}',es:'Comprado: {x}',it:'Comprato: {x}',pl:'Kupione: {x}'},

 card_first:{ru:'Первый визит',en:'First visit',de:'Erster Besuch',fr:'Première visite',es:'Primera visita',it:'Prima visita',pl:'Pierwsza wizyta'},
 card_night:{ru:'Ночная смена',en:'Night shift',de:'Nachtschicht',fr:'Équipe de nuit',es:'Turno de noche',it:'Turno di notte',pl:'Nocna zmiana'},
 card_shopper:{ru:'Первая покупка',en:'First purchase',de:'Erster Einkauf',fr:'Premier achat',es:'Primera compra',it:'Primo acquisto',pl:'Pierwszy zakup'},
 card_cozy:{ru:'Уютный офис',en:'Cosy office',de:'Gemütliches Büro',fr:'Bureau douillet',es:'Oficina acogedora',it:'Ufficio accogliente',pl:'Przytulne biuro'},
 card_veteran:{ru:'Ветеран ЧП',en:'Emergency veteran',de:'Notfall-Veteran',fr:'Vétéran des urgences',es:'Veterano de emergencias',it:'Veterano delle emergenze',pl:'Weteran awarii'},
 how_first:{ru:'Зайти в офис',en:'Visit the office',de:'Das Büro besuchen',fr:'Visiter le bureau',es:'Visitar la oficina',it:'Visitare l\'ufficio',pl:'Odwiedzić biuro'},
 how_night:{ru:'Зайти в офис ночью',en:'Visit at night',de:'Nachts vorbeischauen',fr:'Venir la nuit',es:'Visitar de noche',it:'Visitare di notte',pl:'Zajrzeć w nocy'},
 how_shopper:{ru:'Купить что-нибудь в снабжении',en:'Buy anything in supplies',de:'Etwas in der Ausstattung kaufen',fr:'Acheter quelque chose',es:'Comprar algo en suministros',it:'Comprare qualcosa',pl:'Kupić coś w zaopatrzeniu'},
 how_cozy:{ru:'Поставить 8 предметов декора',en:'Own 8 decor items',de:'8 Dekostücke besitzen',fr:'Posséder 8 objets déco',es:'Tener 8 objetos de decoración',it:'Avere 8 decorazioni',pl:'Mieć 8 ozdób'},
 how_veteran:{ru:'Пройти 50 ЧП',en:'Play 50 emergencies',de:'50 Notfälle spielen',fr:'Jouer 50 urgences',es:'Jugar 50 emergencias',it:'Giocare 50 emergenze',pl:'Zagrać 50 awarii'},

 it_aquarium:{ru:'Аквариум',en:'Aquarium',de:'Aquarium',fr:'Aquarium',es:'Acuario',it:'Acquario',pl:'Akwarium'},
 ie_aquarium:{ru:'Роботы ходят смотреть на рыб. Ночью светится.',en:'Robots go to watch the fish. Glows at night.',de:'Roboter schauen den Fischen zu. Leuchtet nachts.',fr:'Les robots regardent les poissons. Brille la nuit.',es:'Los robots van a mirar los peces. Brilla de noche.',it:'I robot guardano i pesci. Di notte brilla.',pl:'Roboty oglądają ryby. W nocy świeci.'},
 it_coffee_turbo:{ru:'Турбо-кофемашина',en:'Turbo coffee machine',de:'Turbo-Kaffeemaschine',fr:'Machine à café turbo',es:'Cafetera turbo',it:'Macchina del caffè turbo',pl:'Turbo-ekspres'},
 ie_coffee_turbo:{ru:'Кофейный кризис легче: кофе варится мгновенно, батарейки садятся медленнее.',en:'Coffee crisis gets easier: instant brewing, batteries drain slower.',de:'Kaffeekrise wird leichter: sofort gebrüht, Akkus halten länger.',fr:'Crise du café plus facile : café instantané, batteries plus durables.',es:'La crisis del café es más fácil: café al instante, baterías más duraderas.',it:'Crisi del caffè più facile: caffè istantaneo, batterie più durature.',pl:'Kryzys kawowy łatwiejszy: kawa od razu, baterie wolniej padają.'},
 it_vacuum:{ru:'Робот-пылесос',en:'Robot vacuum',de:'Saugroboter',fr:'Robot aspirateur',es:'Robot aspirador',it:'Robot aspirapolvere',pl:'Robot sprzątający'},
 ie_vacuum:{ru:'Сам ездит по офису. Иногда возвращается на базу.',en:'Drives around the office on its own. Sometimes goes back to its dock.',de:'Fährt allein durchs Büro. Kehrt manchmal zur Station zurück.',fr:'Se promène seul dans le bureau. Rentre parfois à sa base.',es:'Recorre la oficina solo. A veces vuelve a su base.',it:'Gira da solo per l\'ufficio. Ogni tanto torna alla base.',pl:'Jeździ sam po biurze. Czasem wraca do stacji.'},
 it_neon:{ru:'Неоновая вывеска',en:'Neon sign',de:'Neonschild',fr:'Enseigne néon',es:'Letrero de neón',it:'Insegna al neon',pl:'Neon'},
 ie_neon:{ru:'Два цвета на выбор. Ночью горит ярче.',en:'Two colours to choose from. Brighter at night.',de:'Zwei Farben zur Wahl. Nachts heller.',fr:'Deux couleurs au choix. Plus vive la nuit.',es:'Dos colores a elegir. Más brillante de noche.',it:'Due colori a scelta. Di notte più forte.',pl:'Dwa kolory do wyboru. W nocy jaśniej.'},
 it_poster:{ru:'Постер',en:'Poster',de:'Poster',fr:'Affiche',es:'Póster',it:'Poster',pl:'Plakat'},
 ie_poster:{ru:'Четыре картинки на выбор, менять можно бесплатно.',en:'Four pictures to choose from, switching is free.',de:'Vier Motive zur Wahl, Wechseln ist gratis.',fr:'Quatre images au choix, changer est gratuit.',es:'Cuatro imágenes a elegir, cambiar es gratis.',it:'Quattro immagini a scelta, cambiare è gratis.',pl:'Cztery obrazki do wyboru, zmiana za darmo.'},
 it_plant:{ru:'Большое растение',en:'Big plant',de:'Große Pflanze',fr:'Grande plante',es:'Planta grande',it:'Pianta grande',pl:'Duża roślina'},
 ie_plant:{ru:'Монстера, кактус или бонсай.',en:'Monstera, cactus or bonsai.',de:'Monstera, Kaktus oder Bonsai.',fr:'Monstera, cactus ou bonsaï.',es:'Monstera, cactus o bonsái.',it:'Monstera, cactus o bonsai.',pl:'Monstera, kaktus albo bonsai.'},
 it_treadmill:{ru:'Беговая дорожка',en:'Treadmill',de:'Laufband',fr:'Tapis de course',es:'Cinta de correr',it:'Tapis roulant',pl:'Bieżnia'},
 ie_treadmill:{ru:'Роботы бегают в обед. Никуда, но с удовольствием.',en:'Robots jog at lunch. Going nowhere, happily.',de:'Roboter joggen mittags. Nirgendwohin, aber gern.',fr:'Les robots courent à midi. Vers nulle part, avec joie.',es:'Los robots corren al mediodía. A ninguna parte, felices.',it:'I robot corrono a pranzo. Verso il nulla, felici.',pl:'Roboty biegają w przerwie. Donikąd, ale chętnie.'},
 it_cathouse:{ru:'Домик для кота',en:'Cat house',de:'Katzenhaus',fr:'Maison pour chat',es:'Casita para gato',it:'Cuccia per gatto',pl:'Domek dla kota'},
 ie_cathouse:{ru:'Кот спит в домике и реже лезет на клавиатуру Антона.',en:'The cat sleeps in it and climbs on Anton\'s keyboard less.',de:'Die Katze schläft drin und geht seltener auf Antons Tastatur.',fr:'Le chat y dort et monte moins sur le clavier d\'Anton.',es:'El gato duerme ahí y se sube menos al teclado de Antón.',it:'Il gatto ci dorme e sale meno sulla tastiera di Anton.',pl:'Kot śpi w domku i rzadziej wchodzi na klawiaturę Antona.'},
 it_parrot:{ru:'Попугай',en:'Parrot',de:'Papagei',fr:'Perroquet',es:'Loro',it:'Pappagallo',pl:'Papuga'},
 ie_parrot:{ru:'Повторяет за роботами. Особенно за Антоном.',en:'Repeats what the robots say. Especially Anton.',de:'Plappert den Robotern nach. Vor allem Anton.',fr:'Répète ce que disent les robots. Surtout Anton.',es:'Repite lo que dicen los robots. Sobre todo Antón.',it:'Ripete i robot. Soprattutto Anton.',pl:'Powtarza za robotami. Zwłaszcza za Antonem.'},
 it_easel:{ru:'Мольберт Кая',en:'Kai\'s easel',de:'Kais Staffelei',fr:'Chevalet de Kai',es:'Caballete de Kai',it:'Cavalletto di Kai',pl:'Sztaluga Kaia'},
 ie_easel:{ru:'Кай ходит туда рисовать.',en:'Kai goes there to paint.',de:'Kai malt dort.',fr:'Kai y va pour peindre.',es:'Kai va allí a pintar.',it:'Kai ci va a dipingere.',pl:'Kai chodzi tam malować.'},
 it_duck_desk:{ru:'Уточка для отладки',en:'Debug duck',de:'Debug-Ente',fr:'Canard de débogage',es:'Patito de depuración',it:'Paperella di debug',pl:'Kaczka do debugowania'},
 ie_duck_desk:{ru:'Стоит у Антона. В ЧП «Антон и баг» подсказывает, где искать.',en:'Sits on Anton\'s desk. Gives hints in "Anton and the bug".',de:'Steht bei Anton. Gibt Tipps bei "Anton und der Bug".',fr:'Sur le bureau d\'Anton. Donne des indices dans "Anton et le bug".',es:'En la mesa de Antón. Da pistas en "Antón y el bug".',it:'Sulla scrivania di Anton. Dà indizi in "Anton e il bug".',pl:'Stoi u Antona. Podpowiada w "Anton i bug".'},
 it_ac_arctic:{ru:'Кондиционер «Арктика»',en:'Arctic air conditioner',de:'Klimaanlage Arktis',fr:'Climatiseur Arctique',es:'Aire acondicionado Ártico',it:'Condizionatore Artico',pl:'Klimatyzator Arktyka'},
 ie_ac_arctic:{ru:'Серверная греется медленнее. Перегрев сервера легче.',en:'The server room heats up slower. Server overheating gets easier.',de:'Der Serverraum heizt langsamer auf. Überhitzung wird leichter.',fr:'La salle serveurs chauffe moins vite. La surchauffe est plus facile.',es:'La sala de servidores se calienta más despacio.',it:'La sala server si scalda più piano.',pl:'Serwerownia grzeje się wolniej.'},
 it_garland:{ru:'Гирлянда',en:'Fairy lights',de:'Lichterkette',fr:'Guirlande',es:'Guirnalda',it:'Luci',pl:'Girlanda'},
 ie_garland:{ru:'Мигает под потолком. Ночью особенно.',en:'Blinks under the ceiling. Especially at night.',de:'Blinkt unter der Decke. Besonders nachts.',fr:'Clignote au plafond. Surtout la nuit.',es:'Parpadea bajo el techo. Sobre todo de noche.',it:'Lampeggia sotto il soffitto. Soprattutto di notte.',pl:'Mruga pod sufitem. Zwłaszcza w nocy.'},
 it_lava:{ru:'Лавовая лампа',en:'Lava lamp',de:'Lavalampe',fr:'Lampe à lave',es:'Lámpara de lava',it:'Lampada lava',pl:'Lampa lawa'},
 ie_lava:{ru:'Для атмосферы в лаунже.',en:'For the lounge mood.',de:'Für Lounge-Stimmung.',fr:'Pour l\'ambiance du salon.',es:'Para el ambiente del salón.',it:'Per l\'atmosfera del lounge.',pl:'Dla klimatu w strefie relaksu.'},
 'say.parrot.fail':{ru:'Кррр.',en:'Squawk.',de:'Krrr.',fr:'Crrr.',es:'Crrr.',it:'Crrr.',pl:'Krrr.'}
});

/* ---------- картинки ---------- */
const IMG={};
function img(name){
  if(IMG[name])return IMG[name];
  const i=new Image(); i.src='img/office/decor/'+name+'.png?v=1'; IMG[name]=i; return i;
}
function ok(i){ return i&&i.complete&&i.naturalWidth>0; }
function filesOf(it){ return it.vars?it.vars[(S.vars[it.id]||0)%it.vars.length]:it.files; }
function ready(it){ return DECOR_READY&&filesOf(it).every(f=>ok(img(f))); }
if(DECOR_READY)ITEMS.forEach(it=>(it.vars?[].concat(...it.vars):it.files).forEach(img));
function has(id){ return !!S.owned[id]&&!S.hidden[id]; }

/* ---------- эффекты: занятия, кот, пылесос, попугай ---------- */
function applyEffects(){
  if(has('aquarium'))O.addAct({name:'fish',w:1.3,any:true,dur:7000,target:a=>{ const i=Math.random()*3|0; return O.onC('M',312+i*14,152,'up','fish'+i); },arrive:a=>{ a.face='happy'; }});
  else O.removeAct('fish');
  if(has('treadmill'))O.addAct({name:'run',w:.9,dur:9000,target:()=>O.onC('B',190,306,'right','run'),arrive:a=>{ a.inplace=true; a.dir='right'; }});
  else O.removeAct('run');
  if(has('easel'))O.addAct({name:'paint',w:3,any:true,who:a=>a.id==='kai',dur:12000,target:()=>O.onC('M',330,216,'right','paint'),arrive:a=>{ a.typing=true; a.face='happy'; }});
  else O.removeAct('paint');
  if(has('cathouse'))O.addPetSpot('cat',O.onC('B',55,306,'down','house')); else O.removePetSpot('cat','house');
}

const vac={x:357,y:308,path:[],anc:{x:357,y:282,c:'B'},next:0,home:true};
function stepVac(now,dt){
  if(!has('vacuum'))return;
  if(vac.path.length){
    const q=vac.path[0], dx=q.x-vac.x, dy=q.y-vac.y, d=Math.hypot(dx,dy), sp=14*dt;
    if(d<=sp){ vac.x=q.x; vac.y=q.y; vac.path.shift(); } else { vac.x+=dx/d*sp; vac.y+=dy/d*sp; }
    return;
  }
  if(now<vac.next)return;
  vac.next=now+(vac.home?4000:2500)+Math.random()*6000;
  const pts=[];
  if(Math.abs(vac.x-vac.anc.x)>.5||Math.abs(vac.y-vac.anc.y)>.5)pts.push({x:vac.anc.x,y:vac.anc.y});
  let t;
  if(!vac.home&&Math.random()<.3){ t={x:357,y:308,cx:357,cy:282,c:'B'}; vac.home=true; }
  else { t=O.randomSpot('down','vac'); t={x:t.cx,y:t.cy,cx:t.cx,cy:t.cy,c:t.c}; vac.home=false; }
  O.routeCorr(vac.anc,{x:t.cx,y:t.cy,c:t.c}).forEach(q=>pts.push(q));
  pts.push({x:t.x,y:t.y});
  vac.path=pts; vac.anc={x:t.cx,y:t.cy,c:t.c};
}
const parrot={kind:'parrot',id:'parrot',x:627,y:136,h:30,chain:0,bub:null,next:performance.now()+15000};
function stepParrot(now){
  if(!has('parrot')||now<parrot.next)return;
  parrot.next=now+25000+Math.random()*25000;
  const src=Math.random()<.6?O.byId.anton:O.pick(O.agents.filter(a=>!a.extra));
  const L=src&&O.lines(src);
  let s=L&&L.idle&&O.pick(L.idle);
  if(!s)s=tx('say.parrot.fail');
  s=String(s).split('|')[0];
  if(src&&src.id==='node')s=s.toUpperCase();
  O.say(parrot,s+' '+s.split(' ').slice(-1)[0]);
}

/* ---------- рисование ---------- */
let lastT=performance.now();
function frameOf(it,now){ const f=filesOf(it); if(f.length<2||it.id==='vacuum')return f[0]; return f[((now/(it.frame||600))|0)%f.length]; }
function put(ctx,it,name,alpha){
  const i=img(name); if(!ok(i))return;
  if(it.tile){ ctx.globalAlpha=alpha==null?1:alpha; for(let x=0;x<O.W;x+=i.width)ctx.drawImage(i,x,it.y); ctx.globalAlpha=1; return; }
  const x=Math.round(it.x+(it.w-i.width)/2), y=it.y+it.h-i.height;
  ctx.globalAlpha=alpha==null?1:alpha; ctx.drawImage(i,x,y); ctx.globalAlpha=1;
}
O.layer('under',(ctx,now)=>{
  const dt=Math.min(.06,(now-lastT)/1000); lastT=now;
  stepVac(now,dt); stepParrot(now);
  ITEMS.forEach(it=>{
    if(!has(it.id)||!ready(it))return;
    if(it.id==='vacuum'){
      put(ctx,it,'vacuum_dock');
      const v=img(((now/150)|0)%2&&vac.path.length?'vacuum_2':'vacuum_1');
      if(ok(v))ctx.drawImage(v,Math.round(vac.x-v.width/2),Math.round(vac.y-v.height));
      return;
    }
    if(it.id==='parrot'){ put(ctx,it,filesOf(it)[parrot.bub?((now/200|0)%2):0]); return; }
    if(it.id==='treadmill'){ const run=O.agents.some(a=>a.act==='run'&&!a.path.length); put(ctx,it,filesOf(it)[run?((now/120|0)%2):0]); return; }
    put(ctx,it,frameOf(it,now));
  });
});
/* ночью светящиеся вещи рисуются ещё раз поверх затемнения */
O.layer('glow',(ctx,now,k)=>{
  if(k<=0)return;
  ITEMS.forEach(it=>{ if(!it.glow||!has(it.id)||!ready(it))return;
    if(it.id==='neon'&&((now/90|0)%37===0))return;
    put(ctx,it,frameOf(it,now),Math.min(1,it.glow*k)); });
});

/* ---------- карточки ---------- */
const CIMG={};
function cardImg(id){ if(!CIMG[id]){ const i=new Image(); i.src='img/office/cards/card_'+id+'.png?v=1'; CIMG[id]=i; } return CIMG[id]; }
function cardName(id){ return K.TX['card_'+id]?tx('card_'+id):tx(id+'_t'); }
function award(id){
  if(DB.cards[id])return false;
  DB.cards[id]=Date.now(); K.save(); toast(tx('toast_card',{x:cardName(id)})); return true;
}
function check(){
  if(!DB.cards.first)award('first');
  const h=new Date().getHours(); if(h>=22||h<5)award('night');
  if(Object.keys(S.owned).length>=1)award('shopper');
  if(Object.keys(S.owned).length>=8)award('cozy');
  if((DB.plays||0)>=50)award('veteran');
}
/* зарплата раз в день за визит */
function payday(){
  const d=new Date(), day=d.getFullYear()+'-'+(d.getMonth()+1)+'-'+d.getDate();
  if(DB.payDay===day)return;
  const first=!DB.payDay; DB.payDay=day;
  if(!first){ DB.pts+=20; toast(tx('toast_pay',{n:20})); }
  K.save(); K.paintMenu();
}

/* ---------- интерфейс ---------- */
let toastEl=null, toastT=0;
function toast(t){
  if(!toastEl){ toastEl=document.createElement('div'); toastEl.id='of-toast'; document.body.appendChild(toastEl); }
  toastEl.textContent=t; toastEl.classList.add('on'); clearTimeout(toastT); toastT=setTimeout(()=>toastEl.classList.remove('on'),3200);
}
const css=document.createElement('style');
css.textContent=`#of-toast{position:fixed;left:50%;top:58px;transform:translate(-50%,-160%);z-index:60;padding:8px 14px;background:#161a2b;color:#73eff7;border:2px solid #1a1c2c;box-shadow:0 0 0 2px #257179;font-size:13px;letter-spacing:.05em;transition:transform .3s steps(5);pointer-events:none;max-width:90vw;text-align:center}
#of-toast.on{transform:translate(-50%,0)}
.of-btns{display:flex;gap:8px;margin:0 8px 8px}
.of-btns .pbtn{flex:1;justify-content:center;font-size:12px}
#of-win{position:fixed;inset:0;z-index:55;display:none;align-items:center;justify-content:center;padding:14px;background:rgba(8,9,15,.72)}
#of-win.on{display:flex}
#of-box{width:min(720px,100%);max-height:100%;display:flex;flex-direction:column;background:#161a2b;color:#e8edf2;border:2px solid #1a1c2c;box-shadow:inset 2px 2px 0 #21283f,inset -2px -2px 0 #0b0d16,0 0 0 2px #3b5dc9}
#of-box .oh{display:flex;align-items:center;gap:12px;padding:12px 14px;border-bottom:2px solid #0b0d16}
#of-box .oh b{flex:1;font-size:16px;letter-spacing:.08em}
#of-box .oh span{color:#ffcd75;font-size:13px}
#of-box .ob{overflow:auto;padding:12px;display:grid;gap:10px}
#of-box.shop .ob{grid-template-columns:repeat(auto-fill,minmax(200px,1fr))}
#of-box.album .ob{grid-template-columns:repeat(auto-fill,minmax(120px,1fr))}
.of-it{display:flex;flex-direction:column;gap:6px;padding:10px;background:#1d2236;border:2px solid #0b0d16}
.of-it.own{box-shadow:0 0 0 2px #38b764}
.of-it .pv{height:72px;display:flex;align-items:center;justify-content:center;background:#29366f}
.of-it .pv canvas{image-rendering:pixelated}
.of-it .nm{font-size:14px;color:#f4f4f4}
.of-it .ds{font-family:'Rubik',sans-serif;font-size:12px;line-height:1.35;color:#94b0c2;flex:1}
.of-it .ft{display:flex;gap:6px;align-items:center;flex-wrap:wrap}
.of-it .pr{color:#ffcd75;font-size:13px;flex:1}
.of-it .pbtn{font-size:11px;padding:5px 8px}
.of-it .pbtn[disabled]{opacity:.45}
.of-empty{font-family:'Rubik',sans-serif;color:#94b0c2;padding:20px;text-align:center;grid-column:1/-1}
.of-card{display:flex;flex-direction:column;align-items:center;gap:6px;text-align:center}
.of-card canvas{width:100%;max-width:128px;aspect-ratio:64/80;image-rendering:pixelated;border:3px solid #94b0c2;background:#0b0d16}
.of-card.rare canvas{border-color:#ffcd75}
.of-card.lock canvas{border-color:#333c57;opacity:.6}
.of-card .cn{font-size:12px;color:#f4f4f4;line-height:1.25}
.of-card .ch{font-family:'Rubik',sans-serif;font-size:11px;color:#566c86;line-height:1.3}
.of-card .cr{font-size:10px;color:#ffcd75;letter-spacing:.08em}`;
document.head.appendChild(css);

let win=null;
function openWin(kind){
  if(!win){ win=document.createElement('div'); win.id='of-win'; win.innerHTML='<div id="of-box"><div class="oh"><b></b><span></span><button class="pbtn" type="button"></button></div><div class="ob"></div></div>';
    document.body.appendChild(win);
    win.addEventListener('click',e=>{ if(e.target===win)closeWin(); });
    win.querySelector('.oh button').addEventListener('click',closeWin);
    addEventListener('keydown',e=>{ if(e.key==='Escape'&&win.classList.contains('on'))closeWin(); }); }
  win.querySelector('#of-box').className=kind;
  win.querySelector('.oh button').textContent=tx('close');
  win.classList.add('on');
  if(kind==='shop')paintShop(); else paintAlbum();
}
function closeWin(){ if(win)win.classList.remove('on'); }
function el(t,c,x){ const e=document.createElement(t); if(c)e.className=c; if(x!=null)e.textContent=x; return e; }
function preview(it){
  const f=filesOf(it)[it.id==='vacuum'?1:0], i=img(f);
  const c=document.createElement('canvas'); if(!ok(i)){ c.width=1; c.height=1; return c; }
  c.width=i.width; c.height=i.height; c.getContext('2d').drawImage(i,0,0);
  const k=Math.max(1,Math.min(Math.floor(64/i.height),Math.floor(170/i.width)));
  c.style.width=i.width*k+'px'; c.style.height=i.height*k+'px';
  return c;
}
function paintShop(){
  const box=win.querySelector('#of-box');
  box.querySelector('.oh b').textContent=tx('shop_title');
  box.querySelector('.oh span').textContent=tx('points')+': '+DB.pts;
  const ob=box.querySelector('.ob'); ob.innerHTML='';
  const list=ITEMS.filter(ready);
  if(!list.length){ ob.appendChild(el('div','of-empty',tx('shop_none'))); return; }
  list.forEach(it=>{
    const own=!!S.owned[it.id];
    const d=el('div','of-it'+(own?' own':''));
    const pv=el('div','pv'); pv.appendChild(preview(it)); d.appendChild(pv);
    d.appendChild(el('div','nm',tx('it_'+it.id)));
    d.appendChild(el('div','ds',tx('ie_'+it.id)));
    const ft=el('div','ft');
    if(!own){
      ft.appendChild(el('span','pr',it.price+' '));
      const b=el('button','pbtn go',tx('shop_buy')); b.type='button';
      if(DB.pts<it.price){ b.disabled=true; b.title=tx('shop_poor'); }
      b.addEventListener('click',()=>buy(it)); ft.appendChild(b);
    } else {
      ft.appendChild(el('span','pr',''));
      if(it.vars&&!S.hidden[it.id]){ const v=el('button','pbtn',tx('shop_var')); v.type='button'; v.addEventListener('click',()=>{ S.vars[it.id]=((S.vars[it.id]||0)+1)%it.vars.length; K.save(); paintShop(); }); ft.appendChild(v); }
      const h=el('button','pbtn',tx(S.hidden[it.id]?'shop_show':'shop_hide')); h.type='button';
      h.addEventListener('click',()=>{ if(S.hidden[it.id])delete S.hidden[it.id]; else S.hidden[it.id]=1; K.save(); applyEffects(); paintShop(); });
      ft.appendChild(h);
    }
    d.appendChild(ft); ob.appendChild(d);
  });
}
function buy(it){
  if(S.owned[it.id]||DB.pts<it.price)return;
  DB.pts-=it.price; S.owned[it.id]=Date.now(); K.save(); K.paintMenu();
  applyEffects(); check();
  toast(tx('toast_buy',{x:tx('it_'+it.id)}));
  O.track('office.shop.'+it.id);
  paintShop();
}
/* карточка: картинка Codex или заглушка из предметов офиса */
const propSheet=new Image(); propSheet.src='img/office/props.png?v=1';
const CARD_PROP={coffee:0,bug:2,cat:-1,cap:8,server:7,meeting:4,fw:9,friday:-2,wifi:6,printer:4,light:-3,ducks:8,anton:9,kai:-4,node:10,first:-2,night:-3,shopper:11,cozy:-1,veteran:-4};
const CARD_BG={coffee:'#5d275d',bug:'#257179',cat:'#29366f',cap:'#3b5dc9',server:'#b13e53',meeting:'#566c86',fw:'#257179',friday:'#ef7d57',wifi:'#29366f',printer:'#5d275d',light:'#1a1c2c',ducks:'#3b5dc9',anton:'#333c57',kai:'#b13e53',node:'#3b5dc9',first:'#38b764',night:'#1a1c2c',shopper:'#ef7d57',cozy:'#5d275d',veteran:'#ffcd75'};
function drawCard(c,id,open){
  c.width=64; c.height=80; const x=c.getContext('2d'); x.imageSmoothingEnabled=false;
  const im=CARDS_READY&&cardImg(id);
  if(open&&im&&ok(im)){ x.drawImage(im,0,0,64,80); return; }
  x.fillStyle=open?CARD_BG[id]:'#161a2b'; x.fillRect(0,0,64,80);
  if(!open){ x.fillStyle='#333c57'; x.font='bold 28px monospace'; x.textAlign='center'; x.fillText('?',32,50); return; }
  x.fillStyle='rgba(255,255,255,.08)'; for(let i=0;i<80;i+=8)x.fillRect(0,i,64,4);
  const p=CARD_PROP[id];
  if(p>=0&&ok(propSheet))x.drawImage(propSheet,(p%4)*32,(p>>2)*32,32,32,16,24,32,32);
  else { const ag=p===-4?(O.byId.kai||O.agents[0]):p===-3?(O.byId.node||O.agents[0]):O.byId.anton||O.agents[0];
    if(p===-1&&O.imgs.cat)x.drawImage(O.imgs.cat,24,34);
    else x.drawImage(O.sprite(ag.pal,p===-3?'blink':'happy','down',0,false,false,p===-3),24,28); }
}
function paintAlbum(){
  const box=win.querySelector('#of-box');
  box.querySelector('.oh b').textContent=tx('album_title');
  const n=CARDS.filter(id=>DB.cards[id]).length;
  box.querySelector('.oh span').textContent=tx('album_count',{n,m:CARDS.length});
  const ob=box.querySelector('.ob'); ob.innerHTML='';
  CARDS.forEach(id=>{
    const open=!!DB.cards[id];
    const d=el('div','of-card'+(open?'':' lock')+(RARE[id]?' rare':''));
    const c=document.createElement('canvas'); drawCard(c,id,open); d.appendChild(c);
    d.appendChild(el('div','cn',open?cardName(id):'???'));
    if(RARE[id])d.appendChild(el('div','cr',tx('card_rare')));
    if(!open)d.appendChild(el('div','ch',K.TX['how_'+id]?tx('how_'+id):tx('card_how_ev')+': '+tx(id+'_t')));
    ob.appendChild(d);
  });
}
function buildButtons(){
  const dr=document.getElementById('drawer'); if(!dr||document.querySelector('.of-btns'))return;
  const w=el('div','of-btns');
  const b1=el('button','pbtn',tx('shop_btn')); b1.type='button'; b1.addEventListener('click',e=>{ e.stopPropagation(); openWin('shop'); });
  const b2=el('button','pbtn',tx('album_btn')); b2.type='button'; b2.addEventListener('click',e=>{ e.stopPropagation(); openWin('album'); });
  w.appendChild(b1); w.appendChild(b2);
  const tg=document.getElementById('ev-toggle'); if(tg)dr.insertBefore(w,tg); else dr.appendChild(w);
  if(window.I18n&&I18n.onChange)I18n.onChange(()=>{ b1.textContent=tx('shop_btn'); b2.textContent=tx('album_btn'); });
}

buildButtons();
applyEffects();
payday();
setTimeout(check,2500);
window.OfficeShop={has,check,open:openWin,items:ITEMS,award};
})();
